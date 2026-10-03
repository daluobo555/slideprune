import type { ExportLayout } from './types';
import type { OutputFormat } from './document-types';

export const MAX_NOTE_LENGTH = 4000;
export const MAX_TOTAL_NOTE_LENGTH = 200000;
export const MAX_PROJECT_BYTES = 2 * 1024 * 1024;
const MAX_PDF_BYTES = 40 * 1024 * 1024;
const MAX_PAGES = 250;

export interface ReviewProject {
  schema: 'slideprune.review';
  version: 1;
  document: { sha256: string; byteLength: number; pageCount: number; name: string };
  review: {
    keptPages: number[];
    currentPage: number;
    notes: { pageNumber: number; text: string }[];
  };
  settings: {
    layout: ExportLayout;
    format: OutputFormat;
    wordImages: boolean;
    markdownImages: boolean;
  };
}

export type ReviewDocumentIdentity = Pick<
  ReviewProject['document'],
  'sha256' | 'byteLength' | 'pageCount'
>;

function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
    Reflect.ownKeys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error('Review project fields are missing or unsupported.');
  return value as Record<string, unknown>;
}

function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

function identity(value: Record<string, unknown>): ReviewDocumentIdentity {
  if (
    typeof value.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.sha256) ||
    !integer(value.byteLength, 1, MAX_PDF_BYTES) ||
    !integer(value.pageCount, 1, MAX_PAGES)
  )
    throw new Error('Review project PDF identity is invalid.');
  return { sha256: value.sha256, byteLength: value.byteLength, pageCount: value.pageCount };
}

function pageList(value: unknown, pageCount: number): number[] {
  if (
    !Array.isArray(value) ||
    value.length > pageCount ||
    [...value].some((page) => !integer(page, 1, pageCount)) ||
    new Set(value).size !== value.length
  )
    throw new Error('Review project page numbers must be valid and unique.');
  return [...value].sort((a, b) => a - b) as number[];
}

function notesList(value: unknown, pageCount: number): ReviewProject['review']['notes'] {
  if (!Array.isArray(value) || value.length > pageCount)
    throw new Error('Review project notes are invalid.');
  const seen = new Set<number>();
  const result: ReviewProject['review']['notes'] = [];
  let total = 0;
  for (const entry of value) {
    const note = record(entry, ['pageNumber', 'text']);
    if (!integer(note.pageNumber, 1, pageCount) || seen.has(note.pageNumber))
      throw new Error('Review project note pages must be valid and unique.');
    seen.add(note.pageNumber);
    if (typeof note.text !== 'string' || note.text.length > MAX_NOTE_LENGTH)
      throw new Error('Each page note must contain at most 4000 characters.');
    total += note.text.length;
    if (total > MAX_TOTAL_NOTE_LENGTH)
      throw new Error('Review project notes exceed 200000 characters in total.');
    if (note.text !== '') result.push({ pageNumber: note.pageNumber, text: note.text });
  }
  return result.sort((a, b) => a.pageNumber - b.pageNumber);
}

/** Validate unknown data without mutating it or retaining references to imported objects. */
export function validateReviewProject(value: unknown): ReviewProject {
  const project = record(value, ['schema', 'version', 'document', 'review', 'settings']);
  if (project.schema !== 'slideprune.review')
    throw new Error('This file is not a SlidePrune review project.');
  if (project.version !== 1) throw new Error('This review project version is not supported.');
  const document = record(project.document, ['sha256', 'byteLength', 'pageCount', 'name']);
  const source = identity(document);
  if (typeof document.name !== 'string' || !document.name.length || document.name.length > 1024)
    throw new Error('Review project PDF name is invalid.');
  const review = record(project.review, ['keptPages', 'currentPage', 'notes']);
  if (!integer(review.currentPage, 1, source.pageCount))
    throw new Error('Review project current page is invalid.');
  const settings = record(project.settings, ['layout', 'format', 'wordImages', 'markdownImages']);
  if (
    !['slides', 'notes', 'grid'].includes(settings.layout as string) ||
    !['pdf', 'docx', 'markdown'].includes(settings.format as string) ||
    typeof settings.wordImages !== 'boolean' ||
    typeof settings.markdownImages !== 'boolean'
  )
    throw new Error('Review project export settings are invalid.');
  return {
    schema: 'slideprune.review',
    version: 1,
    document: { ...source, name: document.name },
    review: {
      keptPages: pageList(review.keptPages, source.pageCount),
      currentPage: review.currentPage,
      notes: notesList(review.notes, source.pageCount),
    },
    settings: {
      layout: settings.layout as ExportLayout,
      format: settings.format as OutputFormat,
      wordImages: settings.wordImages,
      markdownImages: settings.markdownImages,
    },
  };
}

function checkSize(json: string): void {
  if (
    json.length > MAX_PROJECT_BYTES ||
    new TextEncoder().encode(json).byteLength > MAX_PROJECT_BYTES
  )
    throw new Error('Review project file exceeds 2 MiB.');
}

/** Only explicitly validated review fields are written; source PDF bytes are never included. */
export function encodeReviewProject(project: ReviewProject): string {
  const json = JSON.stringify(validateReviewProject(project), null, 2) + '\n';
  checkSize(json);
  return json;
}

/** The caller must load its own PDF first. A rejected project never changes application state. */
export function decodeReviewProject(json: string, expected: ReviewDocumentIdentity): ReviewProject {
  if (typeof json !== 'string') throw new Error('Review project file must contain valid JSON.');
  checkSize(json);
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('Review project file must contain valid JSON.');
  }
  const project = validateReviewProject(value);
  const source = identity(record(expected, ['sha256', 'byteLength', 'pageCount']));
  if (
    project.document.sha256 !== source.sha256 ||
    project.document.byteLength !== source.byteLength ||
    project.document.pageCount !== source.pageCount
  )
    throw new Error('This review project belongs to a different PDF. Load the exact original PDF.');
  return project;
}

/** Hash an independent copy of the exact source bytes; never transfer or change the caller's data. */
export async function fingerprintPdf(bytes: Uint8Array): Promise<string> {
  if (!(bytes instanceof Uint8Array) || !integer(bytes.byteLength, 1, MAX_PDF_BYTES))
    throw new Error('Choose a PDF between 1 byte and 40 MiB to save review progress.');
  if (!globalThis.crypto?.subtle)
    throw new Error('This browser cannot verify PDF fingerprints. Use HTTPS or localhost.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
