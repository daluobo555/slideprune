import {
  PDFDocument,
  PDFName,
  StandardFonts,
  degrees,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  type PDFPage,
  type PDFEmbeddedPage,
} from 'pdf-lib';
import type { ExportOptions } from './types';

const MAX_BYTES = 40 * 1024 * 1024;
const A4: [number, number] = [595.28, 841.89];
const ink = rgb(0.13, 0.23, 0.19);
const rule = rgb(0.79, 0.82, 0.79);

/** Match PDF.js' visible page: normalized CropBox intersected with MediaBox. */
function visiblePageBox(page: PDFPage, pageNumber: number) {
  const normalize = ({
    x,
    y,
    width,
    height,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => ({
    left: Math.min(x, x + width),
    bottom: Math.min(y, y + height),
    right: Math.max(x, x + width),
    top: Math.max(y, y + height),
  });
  const media = normalize(page.getMediaBox());
  if (
    !Object.values(media).every(Number.isFinite) ||
    media.right <= media.left ||
    media.top <= media.bottom
  ) {
    throw new Error(`Page ${pageNumber} has an invalid MediaBox.`);
  }
  const crop = normalize(page.getCropBox());
  if (!Object.values(crop).every(Number.isFinite)) return media;
  const intersection = {
    left: Math.max(media.left, crop.left),
    bottom: Math.max(media.bottom, crop.bottom),
    right: Math.min(media.right, crop.right),
    top: Math.min(media.top, crop.top),
  };
  // PDF.js also falls back to MediaBox for an empty/invalid CropBox or intersection.
  return intersection.right > intersection.left && intersection.top > intersection.bottom
    ? intersection
    : media;
}

/** /Rotate is clockwise; PDF drawing rotations are counterclockwise. */
function placePage(
  target: PDFPage,
  embedded: PDFEmbeddedPage,
  rotation: number,
  box: { x: number; y: number; width: number; height: number },
) {
  const quarterTurn = rotation === 90 || rotation === 270;
  const w = quarterTurn ? embedded.height : embedded.width;
  const h = quarterTurn ? embedded.width : embedded.height;
  const scale = Math.min(box.width / w, box.height / h);
  const left = box.x + (box.width - w * scale) / 2;
  const bottom = box.y + (box.height - h * scale) / 2;
  const x =
    left +
    (rotation === 180 ? embedded.width * scale : rotation === 270 ? embedded.height * scale : 0);
  const y =
    bottom +
    (rotation === 90 ? embedded.width * scale : rotation === 180 ? embedded.height * scale : 0);
  target.drawPage(embedded, { x, y, xScale: scale, yScale: scale, rotate: degrees(-rotation) });
  target.drawRectangle({
    x: left,
    y: bottom,
    width: w * scale,
    height: h * scale,
    borderColor: rule,
    borderWidth: 0.6,
  });
}

async function addHandout(
  output: PDFDocument,
  source: PDFDocument,
  numbers: number[],
  options: ExportOptions,
) {
  const font = await output.embedFont(StandardFonts.Helvetica);
  const bold = await output.embedFont(StandardFonts.HelveticaBold);
  // Source names remain Unicode in metadata; built-in PDF fonts only support Latin text.
  let heading =
    (options.title || 'Study handout').replace(/[^\x20-\x7e]/g, '').trim() || 'Study handout';
  while (bold.widthOfTextAtSize(heading, 15) > 450) heading = heading.slice(0, -1);
  const sourcePages = numbers.map((number) => source.getPage(number - 1));
  const visibleBoxes = sourcePages.map((page, index) => {
    const box = visiblePageBox(page, numbers[index]);
    if (!page.node.Contents()) page.pushOperators(pushGraphicsState(), popGraphicsState());
    return box;
  });
  // One batch shares pdf-lib's object copier, so common images and fonts are
  // embedded once instead of being copied again for every source page.
  const embeddedPages = await output.embedPages(sourcePages, visibleBoxes);
  const perSheet = options.layout === 'notes' ? 2 : 4;
  for (let offset = 0; offset < numbers.length; offset += perSheet) {
    const sheet = output.addPage(A4);
    sheet.drawText(heading, { x: 34, y: 798, size: 15, font: bold, color: ink });
    sheet.drawText(
      options.layout === 'notes' ? 'SLIDEPRUNE  /  NOTES' : 'SLIDEPRUNE  /  REVIEW GRID',
      {
        x: 34,
        y: 778,
        size: 8,
        font,
        color: ink,
      },
    );
    sheet.drawLine({
      start: { x: 34, y: 765 },
      end: { x: 561, y: 765 },
      thickness: 0.8,
      color: rule,
    });
    for (let slot = 0; slot < perSheet && offset + slot < numbers.length; slot++) {
      const original = numbers[offset + slot];
      const sourcePage = sourcePages[offset + slot];
      const embedded = embeddedPages[offset + slot];
      const rotation = ((sourcePage.getRotation().angle % 360) + 360) % 360;
      const row = options.layout === 'notes' ? slot : Math.floor(slot / 2);
      const x = options.layout === 'notes' ? 34 : 34 + (slot % 2) * 273.5;
      const y = 404 - row * 354;
      const width = options.layout === 'notes' ? 306 : 253.5;
      placePage(sheet, embedded, rotation, { x, y: y + 24, width, height: 302 });
      sheet.drawText(`Original p. ${original}`, { x, y: y + 5, size: 9, font, color: ink });
      if (options.layout === 'notes') {
        sheet.drawText('NOTES', { x: 362, y: y + 317, size: 8, font: bold, color: ink });
        for (let line = 0; line < 14; line++) {
          const lineY = y + 295 - line * 21;
          sheet.drawLine({
            start: { x: 362, y: lineY },
            end: { x: 561, y: lineY },
            thickness: 0.4,
            color: rule,
          });
        }
      }
    }
    sheet.drawText(
      `${Math.floor(offset / perSheet) + 1} / ${Math.ceil(numbers.length / perSheet)}`,
      {
        x: 527,
        y: 25,
        size: 8,
        font,
        color: ink,
      },
    );
  }
}

/** Shared export restrictions; return the parsed document so PDF export can reuse it. */
export async function assertExportablePdf(data: Uint8Array): Promise<PDFDocument> {
  if (!data.byteLength || data.byteLength > MAX_BYTES) {
    throw new Error('Choose a PDF no larger than 40 MiB.');
  }
  let source: PDFDocument;
  try {
    source = await PDFDocument.load(data, { updateMetadata: false });
  } catch {
    throw new Error('This PDF cannot be exported. It may be damaged or password-protected.');
  }
  if (source.getPageCount() > 250) throw new Error('Choose a PDF with at most 250 pages.');
  if (source.catalog.has(PDFName.of('OCProperties'))) {
    throw new Error(
      'PDFs with optional content layers are not supported in this version. Export a flattened PDF from the source application before using SlidePrune.',
    );
  }
  return source;
}

/** Return a new PDF; input pages and input bytes are never mutated. */
export async function exportPdf(
  data: Uint8Array,
  selected: number[],
  options: ExportOptions,
): Promise<Uint8Array> {
  if (!selected.length) throw new Error('Select at least one page to export.');
  if (!['slides', 'notes', 'grid'].includes(options.layout)) {
    throw new Error('Choose a supported export layout.');
  }
  const source = await assertExportablePdf(data);
  if (selected.some((n) => !Number.isInteger(n) || n < 1 || n > source.getPageCount())) {
    throw new Error('A selected page does not exist in this PDF.');
  }
  const numbers = [...new Set(selected)].sort((a, b) => a - b);
  const output = await PDFDocument.create();
  output.setTitle(options.title || 'SlidePrune study slides');
  output.setCreator('SlidePrune - local PDF handouts');
  if (options.layout === 'slides') {
    const pages = await output.copyPages(
      source,
      numbers.map((n) => n - 1),
    );
    pages.forEach((page) => output.addPage(page));
  } else {
    await addHandout(output, source, numbers, options);
  }
  return output.save();
}
