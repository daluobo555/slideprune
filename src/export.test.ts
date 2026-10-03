import { describe, expect, it } from 'vitest';
import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFRawStream,
  PDFArray,
  PDFNumber,
  degrees,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
  drawObject,
} from 'pdf-lib';
import { assertExportablePdf, exportPdf } from './export';
import { createDemoPdf } from './demo';

async function fixture() {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 5; i++) {
    const page = doc.addPage([600 + i * 10, 340]);
    page.drawText(`Source page ${i + 1}`, { x: 40, y: 260, size: 22 });
  }
  doc.getPage(2).setRotation(degrees(90));
  doc.getPage(3).setCropBox(20, 30, 500, 280);
  return doc.save();
}

async function sharedImageFixture() {
  const document = await PDFDocument.create();
  // An incompressible image shared by 40 pages is still only about 1 MiB at source.
  const pixels = new Uint8Array(600 * 600 * 3);
  let seed = 1;
  for (let i = 0; i < pixels.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    pixels[i] = seed >>> 24;
  }
  const image = document.context.register(
    document.context.flateStream(pixels, {
      Type: 'XObject',
      Subtype: 'Image',
      Width: 600,
      Height: 600,
      ColorSpace: 'DeviceRGB',
      BitsPerComponent: 8,
    }),
  );
  for (let n = 1; n <= 40; n++) {
    const page = document.addPage([800, 600]);
    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(580, 0, 0, 580, 10, 10),
      drawObject(page.node.newXObject('SharedImage', image)),
      popGraphicsState(),
    );
    page.drawText(`Lecture ${n}`, { x: 620, y: 500, size: 16 });
  }
  return document.save();
}

describe('PDF export', () => {
  it('provides the same input validation to the other document formats', async () => {
    expect(await assertExportablePdf(await fixture())).toBeInstanceOf(PDFDocument);
    await expect(assertExportablePdf(new Uint8Array())).rejects.toThrow('40 MiB');
    await expect(assertExportablePdf(new Uint8Array([1, 2, 3]))).rejects.toThrow('damaged');
    const tooMany = await PDFDocument.create();
    for (let i = 0; i < 251; i++) tooMany.addPage([10, 10]);
    await expect(assertExportablePdf(await tooMany.save())).rejects.toThrow('250 pages');
    const layered = await PDFDocument.create();
    layered.addPage();
    layered.catalog.set(PDFName.of('OCProperties'), layered.context.obj({}));
    await expect(assertExportablePdf(await layered.save())).rejects.toThrow('optional content');
  });

  it.each(['notes', 'grid'] as const)(
    'reuses shared image resources in %s instead of multiplying the output size',
    async (layout) => {
      const input = await sharedImageFixture();
      const bytes = await exportPdf(
        input,
        Array.from({ length: 40 }, (_, index) => index + 1),
        {
          layout,
        },
      );
      const result = await PDFDocument.load(bytes);
      const images = result.context
        .enumerateIndirectObjects()
        .filter(
          ([, object]) =>
            object instanceof PDFRawStream &&
            object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'),
        );
      expect.soft(images).toHaveLength(1);
      expect(bytes.length).toBeLessThan(input.length * 1.2);
      expect(result.getPageCount()).toBe(layout === 'notes' ? 20 : 10);
    },
  );

  it.each(['slides', 'notes', 'grid'] as const)(
    'rejects optional content layers for %s exports',
    async (layout) => {
      const source = await PDFDocument.create();
      source.addPage([200, 100]).drawText('Visible content');
      const hiddenGroup = source.context.register(
        source.context.obj({ Type: 'OCG', Name: 'Hidden layer' }),
      );
      source.catalog.set(
        PDFName.of('OCProperties'),
        source.context.obj({
          OCGs: [hiddenGroup],
          D: { BaseState: 'ON', OFF: [hiddenGroup] },
        }),
      );
      await expect(exportPdf(await source.save(), [1], { layout })).rejects.toThrow(
        /optional content layers/i,
      );
    },
  );

  it.each([
    { name: 'oversized crop', crop: [0, 0, 400, 100], expected: [0, 0, 200, 100] },
    { name: 'partially overlapping crop', crop: [50, -20, 400, 80], expected: [50, 0, 200, 60] },
    { name: 'disjoint crop', crop: [300, 0, 100, 100], expected: [0, 0, 200, 100] },
    { name: 'empty crop', crop: [0, 0, 0, 100], expected: [0, 0, 200, 100] },
  ])('matches the PDF viewer clipping range for $name', async ({ crop, expected }) => {
    const source = await PDFDocument.create();
    const page = source.addPage([200, 100]);
    page.drawText('Visible', { x: 10, y: 50, size: 12 });
    page.drawText('Must stay outside the visible page', { x: 250, y: 50, size: 12 });
    page.setCropBox(crop[0], crop[1], crop[2], crop[3]);
    for (const layout of ['notes', 'grid'] as const) {
      const output = await PDFDocument.load(await exportPdf(await source.save(), [1], { layout }));
      const xObjects = output.getPage(0).node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
      const form = xObjects.lookup(xObjects.keys()[0]) as PDFRawStream;
      expect(form).toBeInstanceOf(PDFRawStream);
      const bounds = form.dict
        .lookup(PDFName.of('BBox'), PDFArray)
        .asArray()
        .map((n) => (n as PDFNumber).asNumber());
      expect(bounds).toEqual(expected);
      expect(bounds[2]).toBeLessThan(250);
    }
  });

  it('provides a 12-page original demo that can be exported in every layout', async () => {
    const data = await createDemoPdf();
    expect((await PDFDocument.load(data)).getPageCount()).toBe(12);
    for (const layout of ['slides', 'notes', 'grid'] as const) {
      const output = await exportPdf(data, [2, 5, 6, 7, 8, 9, 11, 12], { layout });
      expect((await PDFDocument.load(output)).getPageCount()).toBe(
        layout === 'slides' ? 8 : layout === 'notes' ? 4 : 2,
      );
    }
  });

  it('deduplicates selections and copies pages in source order with rotation intact', async () => {
    const data = await fixture();
    const original = data.slice();
    const result = await PDFDocument.load(await exportPdf(data, [3, 1, 3], { layout: 'slides' }));
    expect(result.getPageCount()).toBe(2);
    expect(result.getPage(0).getWidth()).toBe(600);
    expect(result.getPage(1).getWidth()).toBe(620);
    expect(result.getPage(1).getRotation().angle).toBe(90);
    expect(data).toEqual(original);
  });

  it('preserves the source crop box', async () => {
    const result = await PDFDocument.load(
      await exportPdf(await fixture(), [4], { layout: 'slides' }),
    );
    expect(result.getPage(0).getCropBox()).toEqual({ x: 20, y: 30, width: 500, height: 280 });
  });

  it.each([[], [0], [-1], [6], [1.5], [NaN]].map((selected) => ({ selected })))(
    'rejects invalid selections $selected',
    async ({ selected }) => {
      await expect(exportPdf(await fixture(), selected, { layout: 'slides' })).rejects.toThrow(
        /Select|selected/,
      );
    },
  );

  it('rejects malformed input and unsupported layouts', async () => {
    await expect(exportPdf(new Uint8Array([1, 2, 3]), [1], { layout: 'slides' })).rejects.toThrow(
      'damaged',
    );
    await expect(
      exportPdf(await fixture(), [1], { layout: 'invalid' as 'slides' }),
    ).rejects.toThrow('layout');
  });

  it.each([
    { layout: 'notes' as const, count: 3 },
    { layout: 'grid' as const, count: 2 },
  ])(
    'exports $layout as A4 vector forms, including rotated and cropped sources',
    async ({ layout, count }) => {
      const result = await PDFDocument.load(
        await exportPdf(await fixture(), [5, 4, 3, 2, 1], {
          layout,
          title: '研究课件',
        }),
      );
      expect(result.getPageCount()).toBe(count);
      expect(result.getTitle()).toBe('研究课件');
      for (const page of result.getPages()) {
        expect(page.getWidth()).toBeCloseTo(595.28);
        expect(page.getHeight()).toBeCloseTo(841.89);
        expect(page.node.Resources()?.has(PDFName.of('XObject'))).toBe(true);
      }
      const bounds = result.getPages().flatMap((page) => {
        const forms = page.node.Resources()!.lookup(PDFName.of('XObject'), PDFDict);
        return forms.keys().map((key) =>
          (forms.lookup(key) as PDFRawStream).dict
            .lookup(PDFName.of('BBox'), PDFArray)
            .asArray()
            .map((number) => (number as PDFNumber).asNumber()),
        );
      });
      expect(bounds).toEqual([
        [0, 0, 600, 340],
        [0, 0, 610, 340],
        [0, 0, 620, 340],
        [20, 30, 520, 310],
        [0, 0, 640, 340],
      ]);
    },
  );

  it('exports blank source pages without an embedding error', async () => {
    const blank = await PDFDocument.create();
    blank.addPage();
    const output = await exportPdf(await blank.save(), [1], { layout: 'notes' });
    expect((await PDFDocument.load(output)).getPageCount()).toBe(1);
  });
});
