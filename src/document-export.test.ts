import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { exportDocx, exportMarkdown, exportMarkdownBundle } from './document-export';
import type { DocumentOptions, DocumentPage } from './document-types';

const options: DocumentOptions = { title: '课程 & <notes>', language: 'zh', includeImages: false };
const png = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFMsAAAAASUVORK5CYII=',
  ),
  (character) => character.charCodeAt(0),
);
const pages: DocumentPage[] = [
  { pageNumber: 7, textLines: ['第二页 公式 x < 3 & y > 1', 'Emoji 🧪'] },
  { pageNumber: 2, textLines: ['中文文字 English <script>alert("x")</script>'] },
];

describe('editable Word document export', () => {
  it('writes real A4 OOXML with editable escaped Unicode and original source order', async () => {
    const before = structuredClone(pages);
    const files = unzipSync(await exportDocx(pages, options));
    const xml = strFromU8(files['word/document.xml']);
    expect(files['[Content_Types].xml']).toBeDefined();
    expect(xml).toContain('w:w="11906" w:h="16838"');
    expect(xml).toContain('w:pStyle w:val="Title"');
    expect(xml.indexOf('原始页 2')).toBeLessThan(xml.indexOf('原始页 7'));
    expect(xml).toContain('中文文字 English &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(xml).toContain('第二页 公式 x &lt; 3 &amp; y &gt; 1');
    expect(xml).toContain('Emoji 🧪');
    expect(xml).toContain('<w:pageBreakBefore/>');
    expect(Object.keys(files).filter((name) => name.startsWith('word/media/'))).toHaveLength(0);
    expect(pages).toEqual(before);
  });

  it('embeds optional PNGs with relationships, bounded proportions and a no-text message', async () => {
    const files = unzipSync(
      await exportDocx(
        [{ pageNumber: 9, textLines: [], image: { bytes: png, width: 1200, height: 2400 } }],
        { ...options, includeImages: true },
      ),
    );
    const xml = strFromU8(files['word/document.xml']);
    const media = Object.keys(files).filter(
      (name) => name.startsWith('word/media/') && !name.endsWith('/'),
    );
    expect(media).toHaveLength(1);
    expect(files[media[0]]).toEqual(png);
    expect(strFromU8(files['word/_rels/document.xml.rels'])).toContain('relationships/image');
    expect(xml).toContain('cx="2000250" cy="4000500"');
    expect(xml).toContain('此页没有可提取文字');
    expect(xml).toContain('未进行 OCR');
  });

  it('keeps text editable across paragraph breaks and replaces illegal XML characters visibly', async () => {
    const files = unzipSync(
      await exportDocx(
        [{ pageNumber: 3, textLines: ['First\nSecond', 'Bad\u0001character \ud800'] }],
        { ...options, language: 'en' },
      ),
    );
    const xml = strFromU8(files['word/document.xml']);
    expect(xml).toContain('First</w:t>');
    expect(xml).toContain('Second</w:t>');
    expect(xml).toContain('Bad�character �');
    expect(xml).not.toContain('\u0001');
    expect(xml).not.toContain('w:keepLines');
  });
});

describe('literal Markdown and portable image bundle', () => {
  it('escapes source HTML and Markdown syntax instead of activating it', () => {
    const markdown = exportMarkdown(
      [
        {
          pageNumber: 4,
          textLines: [
            '# Heading <script>alert("x")</script> & entity',
            '[click](https://example.com) *bold* $x$ `code`',
            '1. item',
            '    indented',
          ],
        },
      ],
      { ...options, language: 'en' },
    );
    expect(markdown).toContain('## Original page 4');
    expect(markdown).toContain('\\# Heading &lt;script&gt;');
    expect(markdown).toContain('&amp; entity');
    expect(markdown).toContain('\\[click\\]\\(https\\:\\/\\/example\\.com\\)');
    expect(markdown).toContain('\\*bold\\* \\$x\\$ \\`code\\`');
    expect(markdown).toContain('1\\. item');
    expect(markdown).toContain('&#32;&#32;&#32;&#32;indented');
    expect(markdown).not.toContain('<script>');
  });

  it('uses fixed archive paths, keeps original page order, and preserves PNG bytes', async () => {
    const illustrated = pages.map((page) => ({
      ...page,
      image: { bytes: png, width: 1, height: 1 },
    }));
    const files = unzipSync(
      await exportMarkdownBundle(illustrated, {
        ...options,
        title: '../../outside<script>',
        includeImages: true,
      }),
    );
    expect(Object.keys(files).sort()).toEqual([
      'images/page-0002.png',
      'images/page-0007.png',
      'index.md',
    ]);
    expect(files['images/page-0002.png']).toEqual(png);
    expect(files['images/page-0007.png']).toEqual(png);
    const markdown = strFromU8(files['index.md']);
    expect(markdown).toContain('![原始页 2](images/page-0002.png)');
    expect(markdown.indexOf('## 原始页 2')).toBeLessThan(markdown.indexOf('## 原始页 7'));
    expect(markdown).toContain('中文文字');
  });

  it('makes an image-free export without requiring or writing image bytes', async () => {
    const invalidImage = { bytes: new Uint8Array([1]), width: 0, height: 0 };
    const input = [{ pageNumber: 8, textLines: [], image: invalidImage }];
    const files = unzipSync(await exportMarkdownBundle(input, { ...options, language: 'en' }));
    expect(Object.keys(files)).toEqual(['index.md']);
    expect(strFromU8(files['index.md'])).toContain('No extractable text was found');
    expect(strFromU8(files['index.md'])).not.toContain('![');
    const docx = unzipSync(await exportDocx(input, { ...options, language: 'en' }));
    expect(strFromU8(docx['word/document.xml'])).toContain('No OCR was performed.');
  });

  it.each([[], [0], [-1], [1.5], [1, 1]].map((numbers) => ({ numbers })))(
    'rejects invalid source pages $numbers',
    async ({ numbers }) => {
      const input = numbers.map((pageNumber) => ({ pageNumber, textLines: [] }));
      expect(() => exportMarkdown(input, options)).toThrow();
      await expect(exportDocx(input, options)).rejects.toThrow();
    },
  );

  it('rejects an image request when the page lacks a valid PNG', async () => {
    expect(() => exportMarkdown(pages, { ...options, includeImages: true })).toThrow('PNG');
    await expect(exportDocx(pages, { ...options, includeImages: true })).rejects.toThrow('PNG');
  });
});
