import { PDFDocument, StandardFonts, rgb, type PDFPage } from 'pdf-lib';

/** An original lecture, including deliberate duplicates and unsafe-to-collapse edits. */
export async function createDemoPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('How to learn with less noise - SlidePrune demo');
  doc.setAuthor('SlidePrune');
  doc.setSubject('Original synthetic slides for testing; no third-party course material.');
  // Fixed synthetic dates keep the same demo byte-identical for saved review projects.
  doc.setCreationDate(new Date('2026-01-01T00:00:00Z'));
  doc.setModificationDate(new Date('2026-01-01T00:00:00Z'));
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const cream = rgb(0.98, 0.97, 0.93);
  const green = rgb(0.12, 0.28, 0.22);
  const muted = rgb(0.38, 0.45, 0.4);
  const lime = rgb(0.81, 0.89, 0.49);
  const orange = rgb(0.85, 0.39, 0.22);
  const line = rgb(0.8, 0.82, 0.74);

  function base(section: string, title: string, subtitle: string, dark = false) {
    const page = doc.addPage([960, 540]);
    page.drawRectangle({ x: 0, y: 0, width: 960, height: 540, color: dark ? green : cream });
    page.drawText(`FIELD NOTES   /   ${section}`, {
      x: 56,
      y: 491,
      size: 11,
      font: mono,
      color: dark ? lime : muted,
    });
    page.drawText(title, { x: 56, y: 424, size: 36, font: bold, color: dark ? cream : green });
    page.drawText(subtitle, { x: 58, y: 390, size: 15, font: regular, color: dark ? lime : muted });
    page.drawLine({
      start: { x: 56, y: 63 },
      end: { x: 904, y: 63 },
      thickness: 0.8,
      color: dark ? muted : line,
    });
    page.drawText('SLIDEPRUNE  /  ORIGINAL DEMO', {
      x: 56,
      y: 36,
      size: 9,
      font: mono,
      color: dark ? lime : muted,
    });
    return page;
  }

  function node(page: PDFPage, x: number, label: string, filled: boolean) {
    page.drawCircle({
      x,
      y: 231,
      size: 34,
      color: filled ? lime : cream,
      borderColor: green,
      borderWidth: 2,
    });
    page.drawText(label, {
      x: x - bold.widthOfTextAtSize(label, 17) / 2,
      y: 224,
      size: 17,
      font: bold,
      color: green,
    });
  }

  const cover = base(
    '01 / START',
    'Less repetition. More understanding.',
    'A tiny lecture about making room to think.',
  );
  cover.drawText('12', { x: 59, y: 205, size: 132, font: bold, color: green });
  cover.drawText('pages to explore', { x: 65, y: 171, size: 19, font: regular, color: muted });
  cover.drawRectangle({ x: 424, y: 143, width: 475, height: 176, color: lime });
  cover.drawText('Some pages repeat.', { x: 454, y: 270, size: 25, font: bold, color: green });
  cover.drawText('Some add an idea.', { x: 454, y: 226, size: 25, font: bold, color: green });
  cover.drawText('Some changes must stay.', { x: 454, y: 182, size: 25, font: bold, color: green });
  doc.addPage((await doc.copyPages(doc, [0]))[0]);

  // Three additive stages: earlier marks and words remain at identical positions.
  const ideas = [
    ['NOTICE', 'Make the main idea visible.'],
    ['CONNECT', 'Connect it to something you know.'],
    ['RECALL', 'Try explaining it without looking.'],
  ];
  for (let stage = 1; stage <= 3; stage++) {
    const page = base('02 / BUILD', 'A useful learning loop', 'An idea grows one step at a time.');
    for (let i = 0; i < stage; i++) {
      const x = 174 + i * 302;
      if (i)
        page.drawLine({
          start: { x: x - 264, y: 249 },
          end: { x: x - 49, y: 249 },
          thickness: 2,
          color: line,
        });
      page.drawCircle({ x, y: 249, size: 34, color: lime });
      page.drawText(`${i + 1}`, { x: x - 8, y: 237, size: 30, font: bold, color: green });
      page.drawText(ideas[i][0], { x: x - 63, y: 175, size: 18, font: bold, color: green });
      page.drawText(ideas[i][1], { x: x - 110, y: 137, size: 12, font: regular, color: muted });
    }
  }

  // Same text, but a meaningful vector warning disappears on the second page.
  for (const showWarning of [true, false]) {
    const page = base(
      '03 / LOOK CLOSELY',
      'A disappearing mark matters',
      'Same words. Different visual information. Keep both states.',
    );
    page.drawLine({
      start: { x: 238, y: 231 },
      end: { x: 722, y: 231 },
      thickness: 3,
      color: line,
    });
    node(page, 210, 'A', true);
    node(page, 480, 'B', true);
    node(page, 750, 'C', false);
    if (showWarning) {
      page.drawCircle({ x: 480, y: 231, size: 49, borderColor: orange, borderWidth: 5 });
      page.drawLine({
        start: { x: 449, y: 197 },
        end: { x: 512, y: 265 },
        thickness: 5,
        color: orange,
      });
    }
    page.drawText('A visual change can carry the whole lesson.', {
      x: 239,
      y: 118,
      size: 19,
      font: regular,
      color: green,
    });
  }

  // A numeric replacement is not an additive reveal.
  for (const minutes of [12, 18]) {
    const page = base(
      '04 / COMPARE',
      'One number can change the plan',
      'Similar layout does not mean identical content.',
    );
    page.drawText(`${minutes}`, { x: 78, y: 174, size: 140, font: bold, color: green });
    page.drawText('minutes of focused review', {
      x: 86,
      y: 135,
      size: 19,
      font: regular,
      color: muted,
    });
    for (let i = 0; i < 3; i++) {
      page.drawRectangle({
        x: 518 + i * 102,
        y: 135,
        width: 58,
        height: 70 + i * 40,
        color: i === 2 ? green : lime,
      });
    }
    page.drawText('CHECK WHAT CHANGED', { x: 511, y: 318, size: 13, font: mono, color: muted });
  }

  const dark = base(
    '05 / KEEP THE SIGNAL',
    'Your attention is a limited resource.',
    'Use fewer pages when the ideas are truly the same.',
    true,
  );
  dark.drawText('Review the differences.', { x: 59, y: 252, size: 34, font: bold, color: cream });
  dark.drawText('Keep what carries meaning.', { x: 59, y: 199, size: 34, font: bold, color: lime });
  dark.drawText('Let the repetition go.', { x: 59, y: 146, size: 34, font: bold, color: cream });
  doc.addPage((await doc.copyPages(doc, [9]))[0]);

  const end = base(
    '06 / TAKEAWAY',
    'Make a handout you can think on.',
    'A clean page is only useful when the important details survive.',
  );
  ['Review each suggestion', 'Restore anything you need', 'Leave room for your own notes'].forEach(
    (text, i) => {
      end.drawCircle({ x: 82, y: 295 - i * 67, size: 12, color: lime });
      end.drawText(text, { x: 116, y: 285 - i * 67, size: 25, font: bold, color: green });
    },
  );
  return doc.save();
}
