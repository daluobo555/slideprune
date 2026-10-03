import { afterEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createStudyDemoPdf } from './study-demo';
import { fingerprintPdf } from './review-project';

describe('stable built-in demo identity', () => {
  afterEach(() => vi.useRealTimers());

  it.each(['reveal', 'derivation', 'diagram'] as const)(
    'reopens %s with identical source bytes and SHA-256 on different days',
    async (kind) => {
      // Fake Date only: pdf-lib uses real scheduling while embedding and saving pages.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2030-03-14T06:00:00Z'));
      const first = await createStudyDemoPdf(kind);
      vi.setSystemTime(new Date('2035-11-20T19:45:00Z'));
      expect(new Date().getUTCFullYear()).toBe(2035);
      const reopened = await createStudyDemoPdf(kind);
      expect(await fingerprintPdf(reopened)).toBe(await fingerprintPdf(first));
      expect(reopened).toEqual(first);
      const pdf = await PDFDocument.load(reopened, { updateMetadata: false });
      expect(pdf.getCreationDate()?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(pdf.getModificationDate()?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(pdf.getPageCount()).toBe(kind === 'reveal' ? 12 : 6);
    },
  );
});
