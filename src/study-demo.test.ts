/// <reference types="node" />
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { strFromU8, unzipSync } from 'fflate';

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
      pdfjs.getDocument({ ...(options as object), BinaryDataFactory: LocalTestAssets }),
  };
});

import { loadPdf, prepareDocumentPages } from './pdf';
import { analyzePages } from './analyze';
import { createStudyDemoPdf } from './study-demo';
import { exportPdf } from './export';
import { exportDocx, exportMarkdownBundle } from './document-export';

beforeEach(() => {
  vi.stubGlobal('document', { createElement: () => createCanvas(1, 1) });
});
afterAll(() => vi.unstubAllGlobals());

describe('original study demos', () => {
  it('preserves the twelve-page reveal lesson', async () => {
    const document = await PDFDocument.load(await createStudyDemoPdf('reveal'));
    expect(document.getPageCount()).toBe(12);
  });

  it('provides five derivation stages and one exact final copy at lecture size', async () => {
    const document = await PDFDocument.load(await createStudyDemoPdf('derivation'));
    expect(document.getPageCount()).toBe(6);
    expect(
      document.getPages().every((page) => page.getWidth() === 960 && page.getHeight() === 540),
    ).toBe(true);
    expect(document.getAuthor()).toBe('SlidePrune');
  });

  it('renders progressively added equations without corrupting their extracted notation', async () => {
    const snapshots = await loadPdf(await createStudyDemoPdf('derivation'));
    expect(
      snapshots.map((page) => page.textLines!.filter((line) => line.includes(' = ')).length),
    ).toEqual([2, 3, 4, 5, 6, 6]);
    expect(snapshots[4].textLines!.join('\n')).toContain("f'(x) = lim[h -> 0] q(h) = 2x");
    expect(snapshots.slice(1, 5).map((page) => page.verifiedPreviousRelation?.kind)).toEqual([
      'changed',
      'changed',
      'changed',
      'changed',
    ]);
    expect(snapshots[5].verifiedPreviousRelation?.kind).toBe('duplicate');
    const result = analyzePages(snapshots);
    expect(result.suggestedKeep).toEqual([1, 2, 3, 4, 6]);
    expect(result.groups.map((group) => group.studyKind)).toEqual(['derivation']);
  });

  it('keeps all five graph states while removing only the exact final copy', async () => {
    const snapshots = await loadPdf(await createStudyDemoPdf('diagram'));
    expect(snapshots).toHaveLength(6);
    expect(new Set(snapshots.map((page) => page.text)).size).toBe(1);
    expect(
      snapshots.slice(1, 5).every((page) => page.verifiedPreviousRelation?.kind === 'changed'),
    ).toBe(true);
    expect(snapshots[5].verifiedPreviousRelation?.kind).toBe('duplicate');
    const result = analyzePages(snapshots);
    expect(result.suggestedKeep).toEqual([1, 2, 3, 4, 6]);
    expect(result.groups.map((group) => group.studyKind)).toEqual(['diagram']);
  });
});

describe('study sequence exports preserve the learning process', () => {
  it.each(['derivation', 'diagram'] as const)(
    'carries all five distinct %s stages into printable PDF, editable Word and illustrated Markdown',
    async (kind) => {
      const source = await createStudyDemoPdf(kind);
      const snapshots = await loadPdf(source);
      const { suggestedKeep } = analyzePages(snapshots);
      expect(suggestedKeep).toEqual([1, 2, 3, 4, 6]);

      const notes = await exportPdf(source, suggestedKeep, { layout: 'notes' });
      const notesDocument = await PDFDocument.load(notes);
      expect(notesDocument.getPageCount()).toBe(3);
      expect(
        notesDocument.getPages().map((page) => {
          expect(page.getWidth()).toBeCloseTo(595.28);
          expect(page.getHeight()).toBeCloseTo(841.89);
          return page.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict).keys().length;
        }),
      ).toEqual([2, 2, 1]);
      const renderedNotes = await loadPdf(notes);
      expect(
        renderedNotes.flatMap((page) =>
          page.textLines!.filter((line) => /^Original p\. /u.test(line)),
        ),
      ).toEqual([
        'Original p. 1',
        'Original p. 2',
        'Original p. 3',
        'Original p. 4',
        'Original p. 6',
      ]);

      const prepared = await prepareDocumentPages(source, snapshots, suggestedKeep, true);
      expect(prepared.map((page) => page.pageNumber)).toEqual([1, 2, 3, 4, 6]);
      const originalImages = prepared.map((page) =>
        Buffer.from(page.image!.bytes).toString('base64'),
      );
      expect(new Set(originalImages).size).toBe(5);
      if (kind === 'derivation') {
        expect(
          prepared.map((page) => page.textLines.filter((line) => line.includes(' = ')).length),
        ).toEqual([2, 3, 4, 5, 6]);
      } else {
        // Labels alone cannot distinguish these states. Read node fills from the
        // actual source-page PNGs so five copies of one picture cannot pass.
        const nodeCenters = [
          [129, 233],
          [346, 309],
          [346, 149],
          [584, 309],
          [584, 149],
          [817, 233],
        ];
        const activeNodes: number[][] = [];
        for (const page of prepared) {
          const image = await loadImage(Buffer.from(page.image!.bytes));
          const canvas = createCanvas(image.width, image.height);
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0);
          activeNodes.push(
            nodeCenters.flatMap(([x, y], index) => {
              const pixel = context.getImageData(
                Math.round((x * image.width) / 960),
                Math.round(((540 - y - 20) * image.height) / 540),
                1,
                1,
              ).data;
              return pixel[0] < 230 && pixel[1] > 210 && pixel[2] < 150 ? [index] : [];
            }),
          );
        }
        expect(activeNodes).toEqual([[0], [0, 1], [0, 1, 3], [0, 1, 3, 5], [0, 2, 4, 5]]);
      }

      const options = { title: `Study ${kind}`, language: 'en' as const, includeImages: true };
      const wordFiles = unzipSync(await exportDocx(prepared, options));
      const wordXml = strFromU8(wordFiles['word/document.xml']);
      const sections = [...wordXml.matchAll(/<w:p>[\s\S]*?<\/w:p>/gu)]
        .map(([paragraph]) => paragraph)
        .filter((paragraph) => paragraph.includes('w:val="Heading1"'));
      expect(sections.map((section) => /<w:t[^>]*>([^<]+)<\/w:t>/u.exec(section)![1])).toEqual([
        'Original page 1',
        'Original page 2',
        'Original page 3',
        'Original page 4',
        'Original page 6',
      ]);
      expect(wordXml.match(/<w:drawing>/gu)).toHaveLength(5);
      const wordImages = Object.entries(wordFiles)
        .filter(([name]) => /^word\/media\/.*\.png$/u.test(name))
        .map(([, bytes]) => Buffer.from(bytes).toString('base64'));
      expect(wordImages.sort()).toEqual([...originalImages].sort());
      expect(wordXml).not.toContain('Original page 5');
      // Plain Word text runs remain editable alongside the reference pictures.
      const editableLines = [...wordXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/gu)].map(
        (match) => match[1],
      );
      expect(editableLines).toContain(
        kind === 'derivation'
          ? '4 q(h) = 2x + h'
          : 'Colour marks the active route. The labels stay the same as the signal moves.',
      );
      if (kind === 'derivation') {
        const formulaCounts = wordXml
          .split(/(?=<w:p><w:pPr><w:pStyle w:val="Heading1"\/>)/u)
          .slice(1)
          .map((section) => [...section.matchAll(/<w:t[^>]*>[^<]* = [^<]*<\/w:t>/gu)].length);
        expect(formulaCounts).toEqual([2, 3, 4, 5, 6]);
      }

      const markdownFiles = unzipSync(await exportMarkdownBundle(prepared, options));
      const markdown = strFromU8(markdownFiles['index.md']);
      expect(
        [...markdown.matchAll(/^## Original page (\d+)$/gmu)].map((match) => Number(match[1])),
      ).toEqual([1, 2, 3, 4, 6]);
      expect(Object.keys(markdownFiles).sort()).toEqual([
        'images/page-0001.png',
        'images/page-0002.png',
        'images/page-0003.png',
        'images/page-0004.png',
        'images/page-0006.png',
        'index.md',
      ]);
      for (const page of prepared) {
        const path = `images/page-${String(page.pageNumber).padStart(4, '0')}.png`;
        expect(markdown).toContain(`![Original page ${page.pageNumber}](${path})`);
        expect(markdownFiles[path]).toEqual(page.image!.bytes);
      }
      expect(markdown).not.toContain('Original page 5');
      if (kind === 'derivation') {
        const formulaCounts = markdown
          .split(/^## Original page \d+$/mu)
          .slice(1)
          .map((section) => section.split('\n').filter((line) => line.includes(' \\= ')).length);
        expect(formulaCounts).toEqual([2, 3, 4, 5, 6]);
      }
      expect(markdown).toContain(
        kind === 'derivation'
          ? 'q\\(h\\) \\= 2x \\+ h'
          : 'Colour marks the active route\\. The labels stay the same as the signal moves\\.',
      );
    },
    20000,
  );
});
