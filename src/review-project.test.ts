import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decodeReviewProject,
  encodeReviewProject,
  fingerprintPdf,
  MAX_NOTE_LENGTH,
  MAX_PROJECT_BYTES,
  MAX_TOTAL_NOTE_LENGTH,
  validateReviewProject,
  type ReviewProject,
} from './review-project';

function project(): ReviewProject {
  return {
    schema: 'slideprune.review',
    version: 1,
    document: { sha256: 'a'.repeat(64), byteLength: 128, pageCount: 3, name: '课程.pdf' },
    review: {
      keptPages: [3, 1],
      currentPage: 2,
      notes: [{ pageNumber: 2, text: '  保留空白\n\n x < 3 & y > 1  ' }],
    },
    settings: { layout: 'notes', format: 'docx', wordImages: true, markdownImages: false },
  };
}

function expected() {
  const { sha256, byteLength, pageCount } = project().document;
  return { sha256, byteLength, pageCount };
}

function changed(path: string, value: unknown): unknown {
  const input = project() as unknown as Record<string, unknown>;
  const keys = path.split('.');
  let target = input;
  for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[keys.at(-1)!] = value;
  return input;
}

describe('review project validation', () => {
  it('clones and orders decisions without changing authored note whitespace', () => {
    const input = project();
    const before = structuredClone(input);
    const result = validateReviewProject(input);
    expect(result.review.keptPages).toEqual([1, 3]);
    expect(result.review.notes[0].text).toBe(input.review.notes[0].text);
    expect(input).toEqual(before);
    result.review.notes[0].text = 'changed';
    result.review.keptPages.push(2);
    expect(input).toEqual(before);
  });

  it('allows an empty selection and drops only truly empty notes', () => {
    const input = project();
    input.review.keptPages = [];
    input.review.notes = [
      { pageNumber: 3, text: '\n ' },
      { pageNumber: 1, text: '' },
      { pageNumber: 2, text: 'note' },
    ];
    expect(validateReviewProject(input).review).toEqual({
      keptPages: [],
      currentPage: 2,
      notes: [
        { pageNumber: 2, text: 'note' },
        { pageNumber: 3, text: '\n ' },
      ],
    });
  });

  it.each([
    ['schema', 'other.review'],
    ['version', 2],
    ['version', '1'],
    ['document', null],
    ['document.sha256', 'a'.repeat(63)],
    ['document.sha256', 'g'.repeat(64)],
    ['document.byteLength', 0],
    ['document.byteLength', 40 * 1024 * 1024 + 1],
    ['document.pageCount', 251],
    ['document.pageCount', 1.5],
    ['document.name', ''],
    ['document.name', 'x'.repeat(1025)],
    ['review.keptPages', [1, 1]],
    ['review.keptPages', [0]],
    ['review.keptPages', [4]],
    ['review.keptPages', ['1']],
    ['review.keptPages', [1.5]],
    ['review.keptPages', Array(1)],
    ['review.currentPage', 0],
    ['review.currentPage', 4],
    ['review.notes', {}],
    ['review.notes', [{ pageNumber: 0, text: '' }]],
    ['review.notes', [{ pageNumber: 4, text: '' }]],
    [
      'review.notes',
      [
        { pageNumber: 1, text: '' },
        { pageNumber: 1, text: 'duplicate' },
      ],
    ],
    ['review.notes', [{ pageNumber: 1, text: null }]],
    ['review.notes', [{ pageNumber: 1, text: 'x'.repeat(MAX_NOTE_LENGTH + 1) }]],
    ['settings.layout', 'book'],
    ['settings.format', 'html'],
    ['settings.wordImages', 1],
    ['settings.markdownImages', 'false'],
  ])('rejects invalid %s without partial state', (path, value) => {
    expect(() => validateReviewProject(changed(path as string, value))).toThrow();
  });

  it('enforces the total note limit while accepting its exact boundary', () => {
    const input = project();
    input.document.pageCount = 60;
    input.review.notes = Array.from(
      { length: MAX_TOTAL_NOTE_LENGTH / MAX_NOTE_LENGTH },
      (_, i) => ({
        pageNumber: i + 1,
        text: '中'.repeat(MAX_NOTE_LENGTH),
      }),
    );
    expect(validateReviewProject(input).review.notes).toHaveLength(50);
    input.review.notes.push({ pageNumber: 51, text: 'x' });
    expect(() => validateReviewProject(input)).toThrow('200000 characters');
  });

  it.each(['sourceBytes', 'document.sourceBytes', 'review.sourceBytes', 'settings.sourceBytes'])(
    'rejects extra field %s rather than serializing hidden document data',
    (path) => {
      const input = changed(path, [37, 80, 68, 70]);
      expect(() => validateReviewProject(input)).toThrow('fields are missing or unsupported');
      expect(() => encodeReviewProject(input as ReviewProject)).toThrow();
    },
  );

  it('rejects missing keys, inherited properties, extra note fields and prototype keys', () => {
    const missing = project() as unknown as Record<string, unknown>;
    delete missing.settings;
    expect(() => validateReviewProject(missing)).toThrow();
    expect(() => validateReviewProject(Object.create(project()))).toThrow();
    expect(() =>
      validateReviewProject(changed('review.notes', [{ pageNumber: 1, text: '', image: 'data:' }])),
    ).toThrow();
    const json = JSON.stringify(project()).replace('{', '{"__proto__":{"polluted":true},');
    expect(() => decodeReviewProject(json, expected())).toThrow(
      'fields are missing or unsupported',
    );
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });
});

describe('portable review project files', () => {
  it('roundtrips all review settings and literal potentially active note content', () => {
    const input = project();
    input.review.notes[0].text =
      '<script>alert("x")</script>\n[link](javascript:alert(1))\n</textarea>🧪';
    const encoded = encodeReviewProject(input);
    expect(decodeReviewProject(encoded, expected())).toEqual(validateReviewProject(input));
    const parsed = JSON.parse(encoded);
    expect(Object.keys(parsed.document).sort()).toEqual([
      'byteLength',
      'name',
      'pageCount',
      'sha256',
    ]);
    expect(parsed.review.notes[0].text).toBe(input.review.notes[0].text);
  });

  it.each([{ sha256: 'b'.repeat(64) }, { byteLength: 129 }, { pageCount: 4 }])(
    'refuses a different PDF identity: %o',
    (change) => {
      const encoded = encodeReviewProject(project());
      expect(() => decodeReviewProject(encoded, { ...expected(), ...change })).toThrow(
        'different PDF',
      );
    },
  );

  it('matches content identity independently of a renamed source file', () => {
    const input = project();
    input.document.name = 'renamed.pdf';
    expect(decodeReviewProject(encodeReviewProject(input), expected()).document.name).toBe(
      'renamed.pdf',
    );
  });

  it.each(['', '{', 'null', '[]', '"text"'])(
    'rejects malformed or non-project JSON %j',
    (input) => {
      expect(() => decodeReviewProject(input, expected())).toThrow();
    },
  );

  it('checks encoded UTF-8 size before parsing, including multi-byte content and trailing spaces', () => {
    const encoded = encodeReviewProject(project());
    expect(() => decodeReviewProject(encoded + ' '.repeat(MAX_PROJECT_BYTES), expected())).toThrow(
      '2 MiB',
    );
    expect(() =>
      decodeReviewProject('中'.repeat(Math.floor(MAX_PROJECT_BYTES / 3) + 1), expected()),
    ).toThrow('2 MiB');
  });

  it('does not modify the expected identity or input project during a rejected restore', () => {
    const input = project();
    const identity = Object.freeze({ ...expected(), sha256: 'b'.repeat(64) });
    const before = structuredClone(input);
    expect(() => decodeReviewProject(encodeReviewProject(input), identity)).toThrow(
      'different PDF',
    );
    expect(input).toEqual(before);
    expect(identity.sha256).toBe('b'.repeat(64));
  });
});

describe('exact source PDF fingerprints', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the SHA-256 known vector and hashes only the given view without detaching source bytes', async () => {
    const source = new TextEncoder().encode('xabcx');
    const view = source.subarray(1, 4);
    expect(await fingerprintPdf(view)).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(new TextDecoder().decode(source)).toBe('xabcx');
    expect(await fingerprintPdf(new TextEncoder().encode('abd'))).not.toBe(
      await fingerprintPdf(view),
    );
  });

  it('copies before asynchronous hashing so later edits cannot change the pending fingerprint', async () => {
    const bytes = new TextEncoder().encode('abc');
    const pending = fingerprintPdf(bytes);
    bytes[0] = 122;
    expect(await pending).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('gives a recoverable message when secure-context hashing is unavailable', async () => {
    vi.stubGlobal('crypto', undefined);
    await expect(fingerprintPdf(new Uint8Array([1]))).rejects.toThrow('HTTPS or localhost');
  });

  it('rejects empty or oversized source data before hashing', async () => {
    await expect(fingerprintPdf(new Uint8Array())).rejects.toThrow('40 MiB');
    await expect(fingerprintPdf(new Uint8Array(40 * 1024 * 1024 + 1))).rejects.toThrow('40 MiB');
  });
});
