import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { createDemoPdf } from './demo';

export type StudyDemoKind = 'reveal' | 'derivation' | 'diagram';

const cream = rgb(0.98, 0.97, 0.93);
const green = rgb(0.12, 0.28, 0.22);
const muted = rgb(0.38, 0.45, 0.4);
const lime = rgb(0.81, 0.89, 0.49);
const line = rgb(0.8, 0.82, 0.74);

interface DemoFonts {
  regular: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
}

function base(
  doc: PDFDocument,
  fonts: DemoFonts,
  section: string,
  title: string,
  subtitle: string,
) {
  const page = doc.addPage([960, 540]);
  page.drawRectangle({ x: 0, y: 0, width: 960, height: 540, color: cream });
  page.drawText(`FIELD NOTES   /   ${section}`, {
    x: 56,
    y: 491,
    size: 11,
    font: fonts.mono,
    color: muted,
  });
  page.drawText(title, { x: 56, y: 424, size: 36, font: fonts.bold, color: green });
  page.drawText(subtitle, { x: 58, y: 390, size: 15, font: fonts.regular, color: muted });
  page.drawLine({ start: { x: 56, y: 63 }, end: { x: 904, y: 63 }, thickness: 0.8, color: line });
  page.drawText('SLIDEPRUNE  /  ORIGINAL SYNTHETIC LESSON', {
    x: 56,
    y: 36,
    size: 9,
    font: fonts.mono,
    color: muted,
  });
  return page;
}

function drawDerivation(doc: PDFDocument, fonts: DemoFonts) {
  const equations = [
    'f(x) = x^2',
    'q(h) = ((x + h)^2 - x^2) / h',
    'q(h) = (2xh + h^2) / h',
    'q(h) = 2x + h',
    "f'(x) = lim[h -> 0] q(h) = 2x",
  ];
  for (let count = 1; count <= equations.length; count++) {
    const page = base(
      doc,
      fonts,
      'MATH / DERIVATION',
      'A derivative, one step at a time',
      'Difference quotient for f(x) = x^2. Use h != 0 before taking the limit.',
    );
    equations.slice(0, count).forEach((equation, index) => {
      const y = 326 - index * 50;
      page.drawCircle({ x: 77, y: y + 9, size: 18, color: lime });
      page.drawText(String(index + 1), {
        x: 72,
        y: y + 3,
        size: 16,
        font: fonts.bold,
        color: green,
      });
      page.drawText(equation, { x: 121, y, size: 27, font: fonts.mono, color: green });
    });
  }
}

function drawDiagram(doc: PDFDocument, fonts: DemoFonts) {
  const nodes = [
    { x: 129, y: 233, name: 'A', label: 'INPUT' },
    { x: 346, y: 309, name: 'B', label: 'ROUTE 1' },
    { x: 346, y: 149, name: 'C', label: 'ROUTE 2' },
    { x: 584, y: 309, name: 'D', label: 'PROCESS 1' },
    { x: 584, y: 149, name: 'E', label: 'PROCESS 2' },
    { x: 817, y: 233, name: 'F', label: 'OUTPUT' },
  ];
  const edges = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 5],
    [4, 5],
  ];
  const stages = [
    { nodes: [0], edges: [] },
    { nodes: [0, 1], edges: [0] },
    { nodes: [0, 1, 3], edges: [0, 2] },
    { nodes: [0, 1, 3, 5], edges: [0, 2, 4] },
    { nodes: [0, 2, 4, 5], edges: [1, 3, 5] },
  ];
  function drawNode(page: PDFPage, index: number, active: boolean) {
    const node = nodes[index];
    page.drawCircle({
      x: node.x,
      y: node.y,
      size: 35,
      color: active ? lime : cream,
      borderColor: green,
      borderWidth: 2,
    });
    page.drawText(node.name, {
      x: node.x - fonts.bold.widthOfTextAtSize(node.name, 25) / 2,
      y: node.y - 9,
      size: 25,
      font: fonts.bold,
      color: green,
    });
    page.drawText(node.label, {
      x: node.x - fonts.mono.widthOfTextAtSize(node.label, 11) / 2,
      y: node.y - 56,
      size: 11,
      font: fonts.mono,
      color: muted,
    });
  }
  for (const stage of stages) {
    const page = base(
      doc,
      fonts,
      'DIAGRAM / CHANGING STATE',
      'Follow the signal through a graph',
      'Colour marks the active route. The labels stay the same as the signal moves.',
    );
    edges.forEach(([from, to], index) => {
      const active = stage.edges.includes(index);
      const source = nodes[from];
      const target = nodes[to];
      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      const end = { x: target.x - 42 * Math.cos(angle), y: target.y - 42 * Math.sin(angle) };
      page.drawLine({
        start: { x: source.x + 41 * Math.cos(angle), y: source.y + 41 * Math.sin(angle) },
        end,
        thickness: active ? 5 : 2,
        color: active ? green : line,
      });
      for (const offset of [-0.5, 0.5]) {
        page.drawLine({
          start: end,
          end: {
            x: end.x - 12 * Math.cos(angle + offset),
            y: end.y - 12 * Math.sin(angle + offset),
          },
          thickness: active ? 4 : 2,
          color: active ? green : line,
        });
      }
    });
    nodes.forEach((_, index) => drawNode(page, index, stage.nodes.includes(index)));
  }
}

/** Original lessons with stable headers: changing state, not page numbers, drives comparison. */
export async function createStudyDemoPdf(kind: StudyDemoKind): Promise<Uint8Array> {
  if (kind === 'reveal') return createDemoPdf();
  const doc = await PDFDocument.create();
  doc.setTitle(`SlidePrune original ${kind} lesson`);
  doc.setAuthor('SlidePrune');
  doc.setSubject('Original synthetic lesson for review; no third-party course material.');
  const fonts: DemoFonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
  };
  if (kind === 'derivation') drawDerivation(doc, fonts);
  else drawDiagram(doc, fonts);
  // One deliberately exact copy demonstrates that distinct steps and duplication differ.
  doc.addPage((await doc.copyPages(doc, [doc.getPageCount() - 1]))[0]);
  return doc.save();
}
