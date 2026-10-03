import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from 'docx';
import { strToU8, zipSync, type Zippable } from 'fflate';
import type { DocumentOptions, DocumentPage } from './document-types';

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

function checkedPages(pages: DocumentPage[], options: DocumentOptions): DocumentPage[] {
  if (!pages.length) throw new Error('Select at least one page to export.');
  if (
    !['en', 'zh'].includes(options.language) ||
    typeof options.title !== 'string' ||
    typeof options.includeImages !== 'boolean'
  )
    throw new Error('Choose valid document options.');
  const numbers = new Set<number>();
  for (const page of pages) {
    if (
      !Number.isSafeInteger(page.pageNumber) ||
      page.pageNumber < 1 ||
      numbers.has(page.pageNumber)
    )
      throw new Error('Original page numbers must be positive and unique.');
    numbers.add(page.pageNumber);
    if (!Array.isArray(page.textLines) || page.textLines.some((line) => typeof line !== 'string'))
      throw new Error('Page text must contain text lines.');
    if (options.includeImages) {
      const image = page.image;
      if (
        !image ||
        !Number.isFinite(image.width) ||
        !Number.isFinite(image.height) ||
        image.width <= 0 ||
        image.height <= 0 ||
        !(image.bytes instanceof Uint8Array) ||
        !pngSignature.every((byte, index) => image.bytes[index] === byte)
      )
        throw new Error(`A valid PNG image is required for original page ${page.pageNumber}.`);
    }
  }
  return [...pages].sort((left, right) => left.pageNumber - right.pageNumber);
}

function labels(options: DocumentOptions) {
  return options.language === 'zh'
    ? {
        title: '学习资料',
        page: '原始页',
        empty: '此页没有可提取文字，未进行 OCR 识别。',
        note: '正文为 PDF 提取文字，阅读顺序和公式可能需要校对；原页图片仅作参考。',
      }
    : {
        title: 'Study document',
        page: 'Original page',
        empty: 'No extractable text was found on this page. No OCR was performed.',
        note: 'Text was extracted from the PDF; reading order and formulas may need correction. Page images are references.',
      };
}

/** XML 1.0 cannot contain these code points; show a replacement rather than corrupting the file. */
function xmlText(text: string): string {
  return text.replace(/[\p{Cs}\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/gu, '\ufffd');
}

function lines(page: DocumentPage): string[] {
  return page.textLines.flatMap((line) => line.split(/\r\n|\r|\n/u));
}

/** Editable extracted text plus optional raster references, never an OCR or formula conversion. */
export async function exportDocx(
  pages: DocumentPage[],
  options: DocumentOptions,
): Promise<Uint8Array> {
  const ordered = checkedPages(pages, options);
  const text = labels(options);
  const title = xmlText(options.title.trim() || text.title);
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: text.note, spacing: { after: 240 } }),
  ];
  for (const [index, page] of ordered.entries()) {
    children.push(
      new Paragraph({
        text: `${text.page} ${page.pageNumber}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: index > 0,
        keepNext: true,
      }),
    );
    if (options.includeImages && page.image) {
      const { bytes, width, height } = page.image;
      const scale = Math.min(1, 640 / width, 420 / height);
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new ImageRun({
              type: 'png',
              data: bytes,
              transformation: { width: width * scale, height: height * scale },
              altText: {
                title: `${text.page} ${page.pageNumber}`,
                description: `${text.page} ${page.pageNumber}`,
                name: `page-${page.pageNumber}`,
              },
            }),
          ],
        }),
      );
    }
    const extracted = lines(page);
    for (const line of extracted.some((line) => line.trim()) ? extracted : [text.empty])
      children.push(new Paragraph({ children: [new TextRun(xmlText(line))] }));
  }
  const document = new Document({
    title,
    creator: 'SlidePrune',
    styles: {
      default: {
        document: {
          run: {
            font: { ascii: 'Calibri', hAnsi: 'Calibri', eastAsia: 'Microsoft YaHei' },
            size: 22,
            color: '000000',
          },
          paragraph: { spacing: { after: 100, line: 276 } },
        },
        title: {
          run: { color: '000000', size: 36, bold: true },
          paragraph: { spacing: { after: 160 } },
        },
        heading1: {
          run: { color: '000000', size: 28, bold: true },
          paragraph: { spacing: { before: 120, after: 160 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children,
      },
    ],
  });
  return new Uint8Array(await Packer.toArrayBuffer(document));
}

function markdownText(text: string): string {
  return (
    text
      .replace(/[!"#$%'()*+,\-./:;=?@[\\\]^_`{|}~]/gu, '\\$&')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Keep leading whitespace literal without turning a line into a code block.
      .replace(/^[ \t]+/u, (spaces) => spaces.replace(/ /g, '&#32;').replace(/\t/g, '&#9;'))
  );
}

function imagePath(pageNumber: number): string {
  return `images/page-${String(pageNumber).padStart(4, '0')}.png`;
}

/** Source text is literal content, never executable HTML or Markdown instructions. */
export function exportMarkdown(pages: DocumentPage[], options: DocumentOptions): string {
  const ordered = checkedPages(pages, options);
  const text = labels(options);
  const title = (options.title.trim() || text.title).replace(/[\r\n]+/g, ' ');
  const blocks = [`# ${markdownText(title)}`, markdownText(text.note)];
  for (const page of ordered) {
    blocks.push(`## ${text.page} ${page.pageNumber}`);
    if (options.includeImages)
      blocks.push(`![${text.page} ${page.pageNumber}](${imagePath(page.pageNumber)})`);
    const extracted = lines(page);
    blocks.push(
      extracted.some((line) => line.trim())
        ? extracted.map(markdownText).join('  \n')
        : markdownText(text.empty),
    );
  }
  return blocks.join('\n\n') + '\n';
}

/** Archive paths are fixed application names, never derived from the source title. */
export async function exportMarkdownBundle(
  pages: DocumentPage[],
  options: DocumentOptions,
): Promise<Uint8Array> {
  const ordered = checkedPages(pages, options);
  const files: Zippable = { 'index.md': [strToU8(exportMarkdown(ordered, options)), { level: 6 }] };
  if (options.includeImages)
    for (const page of ordered)
      files[imagePath(page.pageNumber)] = [page.image!.bytes, { level: 0 }];
  return zipSync(files);
}
