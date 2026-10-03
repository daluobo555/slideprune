/// <reference types="node" />
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createCanvas, loadImage } from '@napi-rs/canvas';

// Exercise real PDF.js parsing and rasterization. Only browser asset loading is
// replaced with local filesystem reads; the production load/compare path runs.
vi.mock('pdfjs-dist', async () => {
  const canvas = await import('@napi-rs/canvas');
  const { readFile } = await import('node:fs/promises');
  vi.stubGlobal('DOMMatrix', canvas.DOMMatrix);
  vi.stubGlobal('Path2D', canvas.Path2D);
  vi.stubGlobal('ImageData', canvas.ImageData);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // @ts-expect-error PDF.js does not publish declarations for its worker entry.
  vi.stubGlobal('pdfjsWorker', await import('pdfjs-dist/legacy/build/pdf.worker.mjs'));
  class LocalTestAssets {
    async fetch({ kind, filename }: { kind: string; filename: string }) {
      const folders: Record<string, string> = {
        cMapUrl: 'cmaps',
        standardFontDataUrl: 'standard_fonts',
        wasmUrl: 'wasm',
      };
      return new Uint8Array(
        await readFile(
          new URL(`../node_modules/pdfjs-dist/${folders[kind]}/${filename}`, import.meta.url),
        ),
      );
    }
  }
  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: (options: Parameters<typeof pdfjs.getDocument>[0]) =>
      pdfjs.getDocument({
        ...(options as object),
        BinaryDataFactory: LocalTestAssets,
      }),
  };
});

import { loadPdf, prepareDocumentPages } from './pdf';
import { analyzePages, compareAdjacentPages } from './analyze';
import { createDemoPdf } from './demo';

beforeEach(() => {
  vi.stubGlobal('document', { createElement: () => createCanvas(1, 1) });
});
afterAll(() => vi.unstubAllGlobals());

async function fineLinePdf(addText = false) {
  const document = await PDFDocument.create();
  for (const x of [101, 101.05]) {
    const page = document.addPage([800, 600]);
    page.drawRectangle({ x: 30, y: 550, width: 60, height: 12, color: rgb(0, 0, 0) });
    page.drawRectangle({ x, y: 300, width: 0.2, height: 12, color: rgb(0, 0, 0) });
    if (addText) {
      page.drawText('Title first', { x: 30, y: 500, size: 20 });
      if (x > 101) page.drawText('Second', { x: 30, y: 450, size: 20 });
    }
  }
  return document.save();
}

async function mixedFontPdf() {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  document.addPage([600, 400]).drawText('Excluded page 1', {
    x: 40,
    y: 300,
    size: 20,
    font: regular,
  });
  const page = document.addPage([600, 300]);
  page.drawText('Selected page 2', { x: 40, y: 240, size: 20, font: regular });
  page.drawText('micro', { x: 40, y: 100, size: 20, font: regular });
  // A font change creates separate PDF.js text items without a visual word gap.
  page.drawText('scope', {
    x: 40 + regular.widthOfTextAtSize('micro', 20),
    y: 100,
    size: 20,
    font: bold,
  });
  page.drawRectangle({ x: 500, y: 200, width: 50, height: 50, color: rgb(1, 0, 0) });
  return document.save();
}

describe('real PDF document export preparation', () => {
  it('preserves a word split across regular and bold font runs', async () => {
    const snapshots = await loadPdf(await mixedFontPdf());
    expect(snapshots[1].textLines).toEqual(['Selected page 2', 'microscope']);
    expect(snapshots[1].textLines!.join('\n')).not.toContain('micro scope');
  });

  it('prepares only the selected original page with its text and a correctly sized PNG', async () => {
    const data = await mixedFontPdf();
    const snapshots = await loadPdf(data);
    const progress: number[] = [];
    const prepared = await prepareDocumentPages(data, snapshots, [2], true, (done, total) => {
      expect(total).toBe(1);
      progress.push(done);
    });
    expect(prepared).toHaveLength(1);
    expect(prepared[0].pageNumber).toBe(2);
    expect(prepared[0].textLines).toEqual(['Selected page 2', 'microscope']);
    expect(prepared[0].textLines.join('\n')).not.toContain('Excluded page 1');
    expect(prepared[0].textLines).not.toBe(snapshots[1].textLines);
    expect(progress).toEqual([0, 1]);
    const image = prepared[0].image!;
    expect({ width: image.width, height: image.height }).toEqual({ width: 1280, height: 640 });
    expect([...image.bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const decoded = await loadImage(Buffer.from(image.bytes));
    expect({ width: decoded.width, height: decoded.height }).toEqual({ width: 1280, height: 640 });
    const canvas = createCanvas(decoded.width, decoded.height);
    const context = canvas.getContext('2d');
    context.drawImage(decoded, 0, 0);
    // The red marker exists only on source page 2, so a wrong-page PNG cannot pass.
    expect([...context.getImageData(1120, 160, 1, 1).data]).toEqual([255, 0, 0, 255]);
  });
});

describe('full-render PDF analysis regression', () => {
  it('keeps both numerical states while removing their consecutive exact copies', async () => {
    const document = await PDFDocument.create();
    for (const value of [100, 100, 101, 101]) {
      const page = document.addPage([800, 600]);
      page.drawText(`Experiment result: ${value}`, { x: 60, y: 450, size: 30 });
    }
    const snapshots = await loadPdf(await document.save());
    const result = analyzePages(snapshots);
    expect(result.relations.map((relation) => relation.kind)).toEqual([
      'duplicate',
      'changed',
      'duplicate',
    ]);
    expect(result.groups[0].kind).toBe('review');
    expect(result.suggestedKeep).toEqual([2, 4]);
    expect(snapshots[1].text).toContain('100');
    expect(snapshots[3].text).toContain('101');
  });

  it('retains fine-line changes that disappear in the 480px samples', async () => {
    const snapshots = await loadPdf(await fineLinePdf());
    expect(Buffer.from(snapshots[0].pixels).equals(Buffer.from(snapshots[1].pixels))).toBe(true);
    expect(compareAdjacentPages(snapshots[0], snapshots[1]).kind).toBe('duplicate');
    expect(snapshots[1].verifiedPreviousRelation).toMatchObject({
      from: 1,
      to: 2,
      kind: 'changed',
    });
    expect(snapshots[1].verifiedPreviousRelation!.changedRatio).toBeGreaterThan(0);
    expect(analyzePages(snapshots).suggestedKeep).toEqual([1, 2]);
    expect(snapshots[0].pixels.length).toBe(480 * 360 * 4);
    expect(snapshots[0].verifiedPreviousRelation).toBeUndefined();
  });

  it('retains fine foreground changes even when new text makes samples look additive', async () => {
    const snapshots = await loadPdf(await fineLinePdf(true));
    expect(compareAdjacentPages(snapshots[0], snapshots[1]).kind).toBe('build');
    expect(snapshots[1].verifiedPreviousRelation!.removedRatio).toBeGreaterThan(0);
    expect(analyzePages(snapshots).suggestedKeep).toEqual([1, 2]);
  });

  it('still reduces the original demo from 12 pages to its expected 8 pages', async () => {
    const snapshots = await loadPdf(await createDemoPdf());
    expect(snapshots).toHaveLength(12);
    expect(snapshots[1].textLines).toContain('12');
    expect(snapshots[1].textLines).toContain('pages to explore');
    expect(snapshots[1].textLines!.join('\n')).not.toContain('12pages to explore');
    expect(analyzePages(snapshots).suggestedKeep).toEqual([2, 5, 6, 7, 8, 9, 11, 12]);
    expect(
      snapshots.slice(1).every((page) => page.verifiedPreviousRelation?.to === page.pageNumber),
    ).toBe(true);
  });
});
