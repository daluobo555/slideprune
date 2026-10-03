export interface PageSnapshot {
  /** Original PDF page number, one-based. */
  pageNumber: number;
  width: number;
  height: number;
  thumbnail: string;
  /** Extracted PDF text items, with whitespace normalized for comparison. */
  text: string;
  /** PDF-provided line boundaries for editable exports; not semantic layout recovery. */
  textLines?: string[];
  /** Low-resolution full-page RGBA samples for the difference display. */
  pixels: Uint8ClampedArray;
  pixelWidth: number;
  pixelHeight: number;
  /**
   * Comparison of this page and its predecessor using the complete render,
   * before downsampling. Valid only for the recorded original from/to pages.
   */
  verifiedPreviousRelation?: PageRelation;
}

export type RelationKind = 'duplicate' | 'build' | 'changed' | 'different';
export interface PageRelation {
  from: number;
  to: number;
  kind: RelationKind;
  /** English human-readable reason, no user content rendered as HTML. */
  reason: string;
  changedRatio: number;
  removedRatio: number;
}
export interface SlideGroup {
  id: number;
  pages: number[];
  kind: 'single' | 'duplicate' | 'build' | 'review';
  /** Heuristic study cue, not semantic recognition; unknown content remains general. */
  studyKind?: 'reveal' | 'derivation' | 'diagram' | 'general';
  /** Conservative suggestions only; user can override every page. */
  suggestedKeep: number[];
  relations: PageRelation[];
}
export interface Analysis {
  groups: SlideGroup[];
  suggestedKeep: number[];
  relations: PageRelation[];
}
export type ExportLayout = 'slides' | 'notes' | 'grid';
export interface ExportOptions {
  layout: ExportLayout;
  title?: string;
}
