import { getDocument, GlobalWorkerOptions, type PDFPageProxy, type RenderTask } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { compareAdjacentPages } from './analyze';
import type { PageSnapshot } from './types';
import type { DocumentPage } from './document-types';

GlobalWorkerOptions.workerSrc = workerUrl;

// Vite emits these as local hashed assets. No CDN or user-document URL is used.
const binaryAssets = import.meta.glob<string>(
  '/node_modules/pdfjs-dist/{cmaps,standard_fonts,wasm}/*',
  { eager: true, query: '?url', import: 'default' },
);
const assetFolders: Record<string, string> = {
  cMapUrl: 'cmaps',
  standardFontDataUrl: 'standard_fonts',
  wasmUrl: 'wasm',
};
const MAX_BYTES = 40 * 1024 * 1024;
const MAX_PAGES = 250;
const PIXEL_BUDGET = 64 * 1024 * 1024;

interface TextFragment {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
  dir?: string;
}

/** Preserve PDF fragments and clear baseline breaks; this is not paragraph/column recovery. */
export function extractTextLines(items: Array<TextFragment | { type: string }>): string[] {
  const lines: string[] = [];
  let line: string[] = [];
  let previous: TextFragment | undefined;
  const flush = () => {
    // PDF.js emits actual/inferred spacing; font changes alone are not word boundaries.
    const value = line.join('').replace(/\s+/g, ' ').trim();
    if (value) lines.push(value);
    line = [];
    previous = undefined;
  };
  for (const item of items) {
    if ('str' in item) {
      const before = previous?.transform;
      const next = item.transform;
      if (before && next && previous?.dir === 'ltr' && item.dir === 'ltr') {
        const size = Math.hypot(before[0], before[1]);
        const nextSize = Math.hypot(next[0], next[1]);
        const unit = Math.min(size, nextSize);
        const dx = next[4] - before[4],
          dy = next[5] - before[5];
        // Compare in the previous baseline's axes so rotated text also works.
        const offset = Math.abs((-before[1] * dx + before[0] * dy) / size);
        const advance = (before[0] * dx + before[1] * dy) / size;
        const parallel =
          Math.abs(before[0] * next[1] - before[1] * next[0]) / (size * nextSize) < 0.01;
        if (unit > 0 && parallel && offset > unit * 0.5) flush();
        else if (unit > 0 && parallel && advance - (previous.width ?? advance) > unit * 0.25)
          line.push(' ');
      }
      if (item.str) line.push(item.str);
      if (item.str) previous = item;
      if (item.hasEOL) flush();
    }
  }
  flush();
  return lines;
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('PDF loading cancelled.', 'AbortError');
}

/** One local-only configuration for analysis and previews; never transfer caller bytes. */
function createDocumentTask(data: Uint8Array, signal?: AbortSignal) {
  checkAbort(signal);
  if (!data.byteLength) throw new Error('This file is empty. Choose a PDF document.');
  if (data.byteLength > MAX_BYTES) throw new Error('Choose a PDF no larger than 40 MiB.');
  if (!new TextDecoder('ascii').decode(data.subarray(0, 1024)).includes('%PDF-')) {
    throw new Error('This file does not look like a PDF. Choose a valid PDF document.');
  }

  // PDF.js 6 uses one factory for CMaps, standard fonts and image-decoding WASM.
  class LocalBinaryDataFactory {
    async fetch({ kind, filename }: { kind: string; filename: string }) {
      checkAbort(signal);
      const folder = assetFolders[kind];
      const url = binaryAssets[`/node_modules/pdfjs-dist/${folder}/${filename}`];
      if (!url) throw new Error(`A local PDF rendering asset is unavailable: ${filename}`);
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`Could not load a local PDF rendering asset: ${filename}`);
      return new Uint8Array(await response.arrayBuffer());
    }
  }

  return getDocument({
    data: data.slice(),
    BinaryDataFactory: LocalBinaryDataFactory,
    useWorkerFetch: false,
    cMapPacked: true,
    stopAtErrors: true,
    canvasMaxAreaInBytes: 32 * 1024 * 1024,
  });
}

function rethrowPdfError(error: unknown, signal?: AbortSignal, passwordProtected = false): never {
  if (signal?.aborted) throw new DOMException('PDF loading cancelled.', 'AbortError');
  if (passwordProtected || (error instanceof Error && error.name === 'PasswordException')) {
    throw new Error(
      'Password-protected PDFs are not supported. Use an unencrypted copy you are allowed to edit.',
    );
  }
  if (error instanceof Error && /InvalidPDFException|UnknownErrorException/.test(error.name)) {
    throw new Error('This PDF could not be read. It may be damaged or use an unsupported format.');
  }
  throw error;
}

/** Render only in memory; copy bytes before PDF.js transfers ownership to its worker. */
export async function loadPdf(
  data: Uint8Array,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<PageSnapshot[]> {
  const task = createDocumentTask(data, signal);
  let renderTask: RenderTask | undefined;
  let passwordProtected = false;
  let destruction: Promise<void> | undefined;
  const destroy = () => (destruction ??= task.destroy());
  const abort = () => {
    renderTask?.cancel();
    void destroy().catch(() => undefined);
  };
  task.onPassword = () => {
    passwordProtected = true;
    abort();
  };
  signal?.addEventListener('abort', abort, { once: true });
  const canvas = document.createElement('canvas');
  const sampleCanvas = document.createElement('canvas');
  try {
    checkAbort(signal);
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PAGES) throw new Error('Choose a PDF with at most 250 pages.');
    if ((await pdf.getPermissions()) !== null) {
      throw new Error(
        'Password-protected PDFs are not supported. Use an unencrypted copy you are allowed to edit.',
      );
    }
    const snapshots: PageSnapshot[] = [];
    // Keep only the predecessor's full render; stored snapshots remain small.
    let previousFullRender: PageSnapshot | undefined;
    // Fixed per-document budget: equal page dimensions always get equal sample dimensions.
    const maxPagePixels = PIXEL_BUDGET / pdf.numPages;
    onProgress?.(0, pdf.numPages);
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      checkAbort(signal);
      const page = await pdf.getPage(pageNumber);
      try {
        const natural = page.getViewport({ scale: 1 });
        if (!(
          natural.width > 0 &&
          natural.height > 0 &&
          Number.isFinite(natural.width + natural.height)
        )) {
          throw new Error(`Page ${pageNumber} has invalid dimensions.`);
        }
        const previewScale = Math.min(800 / natural.width, 1600 / natural.height);
        const preview = page.getViewport({ scale: previewScale });
        canvas.width = Math.ceil(preview.width);
        canvas.height = Math.ceil(preview.height);
        const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
        if (!context)
          throw new Error('This browser cannot render PDF pages. Try a current desktop browser.');
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport: preview,
          background: '#ffffff',
        });
        await renderTask.promise;
        renderTask = undefined;
        checkAbort(signal);

        const scale = Math.min(
          480 / natural.width,
          960 / natural.height,
          Math.sqrt(maxPagePixels / (natural.width * natural.height)),
        );
        sampleCanvas.width = Math.max(1, Math.ceil(natural.width * scale));
        sampleCanvas.height = Math.max(1, Math.ceil(natural.height * scale));
        const sample = sampleCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
        if (!sample) throw new Error('This browser cannot compare PDF pages.');
        sample.drawImage(canvas, 0, 0, sampleCanvas.width, sampleCanvas.height);
        const textContent = await page.getTextContent();
        checkAbort(signal);
        const snapshot: PageSnapshot = {
          pageNumber,
          width: natural.width,
          height: natural.height,
          thumbnail: canvas.toDataURL('image/webp', 0.86),
          text: textContent.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim(),
          textLines: extractTextLines(textContent.items),
          pixels: sample.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data,
          pixelWidth: sampleCanvas.width,
          pixelHeight: sampleCanvas.height,
        };
        const fullRender: PageSnapshot = {
          ...snapshot,
          pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
          pixelWidth: canvas.width,
          pixelHeight: canvas.height,
        };
        if (previousFullRender) {
          snapshot.verifiedPreviousRelation = compareAdjacentPages(previousFullRender, fullRender);
        }
        previousFullRender = fullRender;
        snapshots.push(snapshot);
        onProgress?.(pageNumber, pdf.numPages);
      } finally {
        renderTask = undefined;
        page.cleanup();
        canvas.width = canvas.height = sampleCanvas.width = sampleCanvas.height = 0;
      }
    }
    return snapshots;
  } catch (error) {
    return rethrowPdfError(error, signal, passwordProtected);
  } finally {
    signal?.removeEventListener('abort', abort);
    canvas.width = canvas.height = sampleCanvas.width = sampleCanvas.height = 0;
    await destroy().catch(() => undefined);
  }
}

/** Preview a real PDF output page without loading snapshots or analyzing the document. */
export async function renderPdfPreview(
  data: Uint8Array,
  pageNumber = 1,
  signal?: AbortSignal,
  options: { detail?: 'standard' | 'high' } = {},
): Promise<string> {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error('Choose a valid page number to preview.');
  }
  const task = createDocumentTask(data, signal);
  let page: PDFPageProxy | undefined;
  let renderTask: RenderTask | undefined;
  let canvas: HTMLCanvasElement | undefined;
  let passwordProtected = false;
  let destruction: Promise<void> | undefined;
  const destroy = () => (destruction ??= task.destroy());
  const abort = () => {
    renderTask?.cancel();
    void destroy().catch(() => undefined);
  };
  task.onPassword = () => {
    passwordProtected = true;
    abort();
  };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    checkAbort(signal);
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PAGES) throw new Error('Choose a PDF with at most 250 pages.');
    if (pageNumber > pdf.numPages) throw new Error('The requested preview page does not exist.');
    if ((await pdf.getPermissions()) !== null) {
      throw new Error(
        'Password-protected PDFs are not supported. Use an unencrypted copy you are allowed to edit.',
      );
    }
    checkAbort(signal);
    page = await pdf.getPage(pageNumber);
    const natural = page.getViewport({ scale: 1 });
    if (!(
      natural.width > 0 &&
      natural.height > 0 &&
      Number.isFinite(natural.width + natural.height)
    )) {
      throw new Error(`Page ${pageNumber} has invalid dimensions.`);
    }
    const maxWidth = options.detail === 'high' ? 2200 : 1100;
    const maxHeight = options.detail === 'high' ? 3200 : 1600;
    const viewport = page.getViewport({
      scale: Math.min(maxWidth / natural.width, maxHeight / natural.height),
    });
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.min(maxWidth, Math.ceil(viewport.width)));
    canvas.height = Math.max(1, Math.min(maxHeight, Math.ceil(viewport.height)));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context)
      throw new Error('This browser cannot render PDF pages. Try a current desktop browser.');
    renderTask = page.render({ canvas, canvasContext: context, viewport, background: '#ffffff' });
    await renderTask.promise;
    checkAbort(signal);
    return canvas.toDataURL('image/webp', 0.92);
  } catch (error) {
    return rethrowPdfError(error, signal, passwordProtected);
  } finally {
    signal?.removeEventListener('abort', abort);
    page?.cleanup();
    if (canvas) canvas.width = canvas.height = 0;
    await destroy().catch(() => undefined);
  }
}

/** Prepare only retained pages, rendering fresh, unmarked PNGs in one PDF worker. */
export async function prepareDocumentPages(
  data: Uint8Array,
  snapshots: PageSnapshot[],
  selected: number[],
  includeImages: boolean,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<DocumentPage[]> {
  checkAbort(signal);
  if (
    !selected.length ||
    new Set(selected).size !== selected.length ||
    selected.some((number) => !Number.isInteger(number) || number < 1)
  ) {
    throw new Error('Choose valid, unique pages to export.');
  }
  const byNumber = new Map(snapshots.map((page) => [page.pageNumber, page]));
  const pages: DocumentPage[] = [...selected]
    .sort((a, b) => a - b)
    .map((pageNumber) => {
      const snapshot = byNumber.get(pageNumber);
      if (!snapshot) throw new Error('A selected source page is unavailable.');
      return {
        pageNumber,
        textLines: [...(snapshot.textLines ?? (snapshot.text ? [snapshot.text] : []))],
      };
    });
  onProgress?.(0, pages.length);
  checkAbort(signal);
  if (!includeImages) {
    onProgress?.(pages.length, pages.length);
    checkAbort(signal);
    return pages;
  }
  const task = createDocumentTask(data, signal);
  let renderTask: RenderTask | undefined;
  let passwordProtected = false;
  let destruction: Promise<void> | undefined;
  const destroy = () => (destruction ??= task.destroy());
  const abort = () => {
    renderTask?.cancel();
    void destroy().catch(() => undefined);
  };
  task.onPassword = () => {
    passwordProtected = true;
    abort();
  };
  signal?.addEventListener('abort', abort, { once: true });
  const canvas = document.createElement('canvas');
  try {
    checkAbort(signal);
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PAGES) throw new Error('Choose a PDF with at most 250 pages.');
    if ((await pdf.getPermissions()) !== null) {
      throw new Error(
        'Password-protected PDFs are not supported. Use an unencrypted copy you are allowed to edit.',
      );
    }
    if (pages.some((page) => page.pageNumber > pdf.numPages))
      throw new Error('A selected source page is unavailable.');
    let imageBytes = 0;
    for (const [index, output] of pages.entries()) {
      checkAbort(signal);
      const page = await pdf.getPage(output.pageNumber);
      try {
        const natural = page.getViewport({ scale: 1 });
        if (!(
          natural.width > 0 &&
          natural.height > 0 &&
          Number.isFinite(natural.width + natural.height)
        )) {
          throw new Error(`Page ${output.pageNumber} has invalid dimensions.`);
        }
        const viewport = page.getViewport({
          scale: Math.min(1280 / natural.width, 1800 / natural.height),
        });
        canvas.width = Math.max(1, Math.min(1280, Math.ceil(viewport.width)));
        canvas.height = Math.max(1, Math.min(1800, Math.ceil(viewport.height)));
        const context = canvas.getContext('2d', { alpha: false });
        if (!context)
          throw new Error('This browser cannot render PDF pages. Try a current desktop browser.');
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          background: '#ffffff',
        });
        await renderTask.promise;
        renderTask = undefined;
        checkAbort(signal);
        const encoded = canvas.toDataURL('image/png').split(',')[1];
        if (!encoded) throw new Error('Could not create a page image.');
        // Check the encoded length before allocating another decoded image buffer.
        const byteLength =
          Math.floor((encoded.length * 3) / 4) -
          (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
        if (imageBytes + byteLength > 80 * 1024 * 1024) {
          throw new Error(
            'Page images are too large for one document. Export fewer pages or turn off page images.',
          );
        }
        const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
        output.image = { bytes, width: canvas.width, height: canvas.height };
        imageBytes += bytes.byteLength;
        onProgress?.(index + 1, pages.length);
      } finally {
        renderTask = undefined;
        page.cleanup();
        canvas.width = canvas.height = 0;
      }
    }
    checkAbort(signal);
    return pages;
  } catch (error) {
    return rethrowPdfError(error, signal, passwordProtected);
  } finally {
    signal?.removeEventListener('abort', abort);
    canvas.width = canvas.height = 0;
    await destroy().catch(() => undefined);
  }
}
