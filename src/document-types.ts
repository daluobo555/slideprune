export type OutputFormat = 'pdf' | 'docx' | 'markdown';

export interface DocumentPage {
  /** One-based physical page in the source PDF. */
  pageNumber: number;
  textLines: string[];
  /** Authored plain-text notes for this source page. */
  note?: string;
  /** PNG rendered from the visible source page, never a difference overlay. */
  image?: { bytes: Uint8Array; width: number; height: number };
}

export interface DocumentOptions {
  title: string;
  language: 'en' | 'zh';
  includeImages: boolean;
}
