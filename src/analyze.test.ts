import { describe, expect, it } from 'vitest';
import { analyzePages, compareAdjacentPages } from './analyze';
import type { PageRelation, PageSnapshot } from './types';

type Color = [number, number, number, number];
const WHITE: Color = [255, 255, 255, 255];
const INK: Color = [20, 30, 40, 255];

function page(
  pageNumber: number,
  text = 'A stable title',
  background: Color = WHITE,
): PageSnapshot {
  const pixelWidth = 40;
  const pixelHeight = 30;
  const pixels = new Uint8ClampedArray(pixelWidth * pixelHeight * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) pixels.set(background, offset);
  return {
    pageNumber,
    width: 800,
    height: 600,
    thumbnail: '',
    text,
    pixels,
    pixelWidth,
    pixelHeight,
  };
}

function paint(
  snapshot: PageSnapshot,
  x: number,
  y: number,
  width = 4,
  height = 2,
  color = INK,
): PageSnapshot {
  for (let row = y; row < y + height; row++) {
    for (let column = x; column < x + width; column++)
      snapshot.pixels.set(color, (row * snapshot.pixelWidth + column) * 4);
  }
  return snapshot;
}

function copy(snapshot: PageSnapshot, pageNumber: number, text = snapshot.text): PageSnapshot {
  return { ...snapshot, pageNumber, text, pixels: snapshot.pixels.slice() };
}

describe('analyzePages: exact evidence', () => {
  it('handles empty input and preserves the source page number of a single page', () => {
    expect(analyzePages([])).toEqual({ groups: [], relations: [], suggestedKeep: [] });
    expect(analyzePages([page(7)]).suggestedKeep).toEqual([7]);
  });

  it('keeps the final copy only when all RGBA pixels and normalized text agree', () => {
    const first = paint(page(1, 'Title\n  Text'), 4, 4);
    const result = analyzePages([first, copy(first, 2, 'Title Text'), copy(first, 3)]);
    expect(result.suggestedKeep).toEqual([3]);
    expect(result.groups[0].kind).toBe('duplicate');
    expect(result.relations.map((relation) => relation.changedRatio)).toEqual([0, 0]);
  });

  it('does not collapse visually identical pages with different extracted numeric text', () => {
    const first = paint(page(1, 'Result 100'), 4, 4);
    expect(analyzePages([first, copy(first, 2, 'Result 101')]).suggestedKeep).toEqual([1, 2]);
  });

  it('does not compare different page sizes even when their render arrays match', () => {
    const first = page(1);
    const second = { ...copy(first, 2), width: 400 };
    expect(analyzePages([first, second]).relations[0].kind).toBe('different');
    expect(analyzePages([first, second]).suggestedKeep).toEqual([1, 2]);
  });

  it('preserves incomplete pixel evidence and does not mutate input arrays', () => {
    const first = page(1);
    const before = first.pixels.slice();
    const second = { ...copy(first, 2), pixels: new Uint8ClampedArray() };
    expect(analyzePages([first, second]).suggestedKeep).toEqual([1, 2]);
    expect(first.pixels).toEqual(before);
  });
});

describe('analyzePages: conservative progressive builds', () => {
  it('keeps the final page of an additive sequence with unchanged earlier foreground', () => {
    const first = paint(page(1, 'Title First point'), 4, 4);
    const second = paint(copy(first, 2, 'Title First point Second point'), 4, 10);
    const third = paint(copy(second, 3, 'Title First point Second point Last point'), 4, 16);
    const result = analyzePages([first, second, third]);
    expect(result.suggestedKeep).toEqual([3]);
    expect(result.groups[0].kind).toBe('build');
    expect(
      result.relations.every(
        (relation) => relation.kind === 'build' && relation.removedRatio === 0,
      ),
    ).toBe(true);
    expect(result.relations[0].changedRatio).toBeCloseTo(8 / 1200);
  });

  it('handles additions before a retained footer instead of requiring a text prefix', () => {
    const first = paint(page(1, 'Title First point Course name'), 4, 4);
    const second = paint(copy(first, 2, 'Title First point Second point Course name'), 4, 10);
    expect(analyzePages([first, second]).suggestedKeep).toEqual([2]);
  });

  it('recognizes an unchanged dark background and light foreground', () => {
    const first = paint(page(1, 'Title First', [10, 10, 40, 255]), 4, 4, 4, 2, WHITE);
    const second = paint(copy(first, 2, 'Title First Second'), 4, 10, 4, 2, WHITE);
    expect(analyzePages([first, second]).relations[0].kind).toBe('build');
  });

  it('retains a changed number even if changed render pixels are below a coarse visual threshold', () => {
    const first = paint(page(1, 'Title Revenue 100'), 4, 4);
    const second = paint(copy(first, 2, 'Title Revenue 1000 Extra information'), 4, 10);
    const result = analyzePages([first, second]);
    expect(result.suggestedKeep).toEqual([1, 2]);
  });

  it('does not discard a changing footer or slide number', () => {
    const first = paint(paint(page(1, 'Title First 1'), 4, 4), 20, 28, 1, 1);
    const second = paint(copy(first, 2, 'Title First Second 2'), 4, 10);
    paint(second, 20, 28, 1, 1, [30, 40, 50, 255]);
    expect(analyzePages([first, second]).suggestedKeep).toEqual([1, 2]);
  });

  it('retains a page when even one old foreground pixel disappears', () => {
    const first = paint(page(1, 'Title First'), 4, 4);
    const second = paint(copy(first, 2, 'Title First Second'), 4, 10);
    paint(second, 5, 4, 1, 1, WHITE);
    const result = analyzePages([first, second]);
    expect(result.suggestedKeep).toEqual([1, 2]);
    expect(result.relations[0].removedRatio).toBe(1 / 8);
  });

  it('retains graph recolouring and replacement despite unchanged text', () => {
    const first = paint(page(1, 'Title The same graph'), 4, 4, 8, 5);
    const recoloured = paint(copy(first, 2), 4, 4, 8, 5, [200, 30, 30, 255]);
    const replacement = paint(paint(copy(first, 3), 4, 4, 8, 5, WHITE), 16, 12, 8, 5);
    expect(analyzePages([first, recoloured, replacement]).suggestedKeep).toEqual([1, 2, 3]);
  });

  it('keeps graphical additions with unchanged text and scanned reveals for review', () => {
    const first = paint(page(1), 4, 4);
    const second = paint(copy(first, 2), 4, 10);
    expect(analyzePages([first, second]).suggestedKeep).toEqual([1, 2]);
    first.text = '';
    second.text = '';
    expect(analyzePages([first, second]).groups[0].kind).toBe('review');
  });
});

describe('analyzePages: background uncertainty and grouping safety', () => {
  it('keeps distinct earlier states after a removal but collapses its exact later copy', () => {
    const first = paint(page(1, 'Title First'), 4, 4);
    const second = paint(copy(first, 2, 'Title First Second'), 4, 10);
    const third = paint(copy(second, 3, 'Title First Second Last'), 4, 16);
    paint(third, 4, 4, 4, 2, WHITE);
    const fourth = copy(third, 4);
    const result = analyzePages([first, second, third, fourth]);
    expect(result.relations.map((relation) => relation.kind)).toEqual([
      'build',
      'changed',
      'duplicate',
    ]);
    expect(result.groups[0].kind).toBe('review');
    expect(result.suggestedKeep).toEqual([1, 2, 4]);
  });

  it('keeps the last exact copy on both sides of a numerical change', () => {
    const first = paint(page(1, 'Title Revenue 100'), 4, 4);
    const changed = copy(first, 3, 'Title Revenue 101');
    const result = analyzePages([first, copy(first, 2), changed, copy(changed, 4)]);
    expect(result.relations.map((relation) => relation.kind)).toEqual([
      'duplicate',
      'changed',
      'duplicate',
    ]);
    expect(result.groups[0].kind).toBe('review');
    expect(result.suggestedKeep).toEqual([2, 4]);
  });

  it('keeps one representative of each state across longer exact duplicate subchains', () => {
    const first = paint(page(1, 'Title Result 100'), 4, 4);
    const second = paint(copy(first, 4, 'Title Result 101'), 4, 4, 4, 2, [200, 30, 30, 255]);
    const third = copy(first, 6);
    const pages = [
      first,
      copy(first, 2),
      copy(first, 3),
      second,
      copy(second, 5),
      third,
      copy(third, 7),
    ];
    const original = structuredClone(pages);
    const result = analyzePages(pages);
    expect(result.groups[0].kind).toBe('review');
    expect(result.suggestedKeep).toEqual([3, 5, 7]);
    expect(pages).toEqual(original);
  });

  it('does not collapse additive steps after a changed state in a review group', () => {
    const first = paint(page(1, 'Title Result 100'), 4, 4);
    const changed = copy(first, 3, 'Title Result 101');
    const last = paint(copy(changed, 4, 'Title Result 101 More information'), 4, 10);
    const result = analyzePages([first, copy(first, 2), changed, last]);
    expect(result.relations.map((relation) => relation.kind)).toEqual([
      'duplicate',
      'changed',
      'build',
    ]);
    expect(result.suggestedKeep).toEqual([2, 3, 4]);
  });

  it('retains the last safe reveal when a later unrelated page starts a new group', () => {
    const first = paint(page(1, 'Title First'), 4, 4);
    const second = paint(copy(first, 2, 'Title First Second'), 4, 10);
    const third = paint(page(3, 'Completely unrelated subject'), 18, 12);
    expect(analyzePages([first, second, third]).suggestedKeep).toEqual([2, 3]);
  });

  it('does not assume a gradient or textured background is expendable content', () => {
    const first = paint(page(1, 'Title First'), 4, 4);
    for (let x = 0; x < first.pixelWidth; x++) paint(first, x, 0, 1, 1, [x, 30, 40, 255]);
    const second = paint(copy(first, 2, 'Title First Second'), 4, 10);
    expect(analyzePages([first, second]).suggestedKeep).toEqual([1, 2]);
  });

  it('does not treat a large interior photo as a simple slide background', () => {
    const first = paint(page(1, 'Title First'), 1, 1, 38, 28);
    const second = paint(copy(first, 2, 'Title First Second'), 4, 10, 1, 1, WHITE);
    expect(analyzePages([first, second]).suggestedKeep).toEqual([1, 2]);
  });

  it('keeps partially transparent backgrounds and changed alpha pixels', () => {
    const first = paint(page(1, 'Title First', [255, 255, 255, 128]), 4, 4);
    const second = paint(copy(first, 2, 'Title First Second'), 4, 10);
    expect(analyzePages([first, second]).suggestedKeep).toEqual([1, 2]);
    const opaque = paint(page(3, 'Title First'), 4, 4);
    const alphaChanged = copy(opaque, 4);
    alphaChanged.pixels[(4 * opaque.pixelWidth + 4) * 4 + 3] = 254;
    expect(analyzePages([opaque, alphaChanged]).suggestedKeep).toEqual([3, 4]);
  });

  it('starts new groups for aspect-ratio or raster-size changes', () => {
    const first = paint(page(1, 'Title First'), 4, 4);
    const portrait = { ...copy(first, 2), width: 600, height: 800 };
    const halfSize = {
      ...copy(first, 3),
      pixelWidth: 20,
      pixelHeight: 15,
      pixels: first.pixels.slice(0, 1200),
    };
    const result = analyzePages([first, portrait, halfSize]);
    expect(result.suggestedKeep).toEqual([1, 2, 3]);
    expect(result.groups.every((group) => group.kind === 'single')).toBe(true);
  });

  it('is deterministic without mutating source text, metadata or pixel buffers', () => {
    const first = paint(page(1, 'Title First'), 4, 4);
    const second = paint(copy(first, 2, 'Title First Second'), 4, 10);
    const snapshots = [first, second];
    const original = structuredClone(snapshots);
    expect(analyzePages(snapshots)).toEqual(analyzePages(snapshots));
    expect(snapshots).toEqual(original);
  });
});

describe('analyzePages: full-render evidence', () => {
  const changed: PageRelation = {
    from: 1,
    to: 2,
    kind: 'changed',
    reason: 'Earlier foreground differs in the full render.',
    changedRatio: 0.001,
    removedRatio: 0.1,
  };

  it('does not turn verified fine-detail changes into duplicates when samples match', () => {
    const first = paint(page(1, ''), 4, 4);
    const second = { ...copy(first, 2), verifiedPreviousRelation: changed };
    const result = analyzePages([first, second]);
    expect(result.suggestedKeep).toEqual([1, 2]);
    expect(result.relations).toEqual([changed]);
  });

  it('does not turn verified foreground loss into an additive build', () => {
    const first = paint(page(1, 'Title First'), 4, 4);
    const second = {
      ...paint(copy(first, 2, 'Title First Second'), 4, 10),
      verifiedPreviousRelation: changed,
    };
    expect(analyzePages([first, second]).suggestedKeep).toEqual([1, 2]);
  });

  it('collapses only the verified exact subchain when all stored samples look identical', () => {
    const first = paint(page(1), 4, 4);
    const second = { ...copy(first, 2), verifiedPreviousRelation: changed };
    const third = {
      ...copy(second, 3),
      verifiedPreviousRelation: {
        from: 2,
        to: 3,
        kind: 'duplicate' as const,
        reason: 'The full renders match exactly.',
        changedRatio: 0,
        removedRatio: 0,
      },
    };
    expect(analyzePages([first, second, third]).suggestedKeep).toEqual([1, 3]);
  });

  it('only consumes evidence bound to the actual adjacent source page numbers', () => {
    const first = paint(page(7, 'Result 10'), 4, 4);
    const second = {
      ...copy(first, 8, 'Result 11'),
      verifiedPreviousRelation: { ...changed, from: 1, to: 2, kind: 'duplicate' as const },
    };
    const result = analyzePages([first, second]);
    expect(result.suggestedKeep).toEqual([7, 8]);
    expect(result.relations[0]).toMatchObject({ from: 7, to: 8 });
    expect(result.relations[0].kind).not.toBe('duplicate');
  });
});

describe('analyzePages: study sequences', () => {
  it('preserves every cumulative equation step and collapses only its exact duplicate copies', () => {
    const first = paint(page(1, 'Derivative f(x) = x^2'), 4, 4);
    const second = paint(copy(first, 3, 'Derivative f(x) = x^2 f(x+h) = (x+h)^2'), 4, 10);
    const third = paint(
      copy(second, 5, 'Derivative f(x) = x^2 f(x+h) = (x+h)^2 f\u2032(x) = 2x'),
      4,
      16,
    );
    const result = analyzePages([
      first,
      copy(first, 2),
      second,
      copy(second, 4),
      third,
      copy(third, 6),
    ]);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({ kind: 'review', studyKind: 'derivation' });
    expect(result.suggestedKeep).toEqual([2, 4, 6]);
    expect(result.relations.map((relation) => relation.kind)).toEqual([
      'duplicate',
      'changed',
      'duplicate',
      'changed',
      'duplicate',
    ]);
  });

  it('keeps the additive preparation before the first equation and steps after substitution', () => {
    const first = paint(page(1, 'Derivation Given assumptions'), 4, 4);
    const second = paint(copy(first, 2, 'Derivation Given assumptions Additional premise'), 4, 10);
    const third = paint(
      copy(second, 3, 'Derivation Given assumptions Additional premise x = 12'),
      4,
      16,
    );
    const fourth = copy(third, 4, 'Derivation Given assumptions Additional premise x = 18');
    const fifth = paint(copy(fourth, 5, `${fourth.text} Final explanation`), 12, 16);
    const result = analyzePages([first, second, third, fourth, fifth]);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].studyKind).toBe('derivation');
    expect(result.suggestedKeep).toEqual([1, 2, 3, 4, 5]);
    expect(result.relations.every((relation) => relation.kind === 'changed')).toBe(true);
  });

  it.each(['a ≤ b', 'x ≈ 3', 'α ∈ A', '∫ f(x) dx', '√x', 'x − y', 'x * y', 'x / y', 'x² + y²'])(
    'uses extracted mathematical notation as a conservative cue: %s',
    (notation) => {
      const first = paint(page(1, `Derivation ${notation}`), 4, 4);
      const second = paint(copy(first, 2, `${first.text} Explanation`), 4, 10);
      const result = analyzePages([first, second]);
      expect(result.suggestedKeep).toEqual([1, 2]);
      expect(result.groups[0].studyKind).toBe('derivation');
      expect(compareAdjacentPages(first, second).kind).toBe('changed');
    },
  );

  it.each(['Course 2026 Chapter 3', 'A well-being study', 'Introduction First point'])(
    'keeps ordinary additive prose eligible for reveal suggestions: %s',
    (text) => {
      const first = paint(page(1, text), 4, 4);
      const second = paint(copy(first, 2, `${text} Another point`), 4, 10);
      const result = analyzePages([first, second]);
      expect(result.suggestedKeep).toEqual([2]);
      expect(result.groups[0]).toMatchObject({ kind: 'build', studyKind: 'reveal' });
    },
  );

  it('does not label a generic changing number as a mathematical derivation', () => {
    const first = paint(page(1, 'Title Revenue 100'), 4, 4);
    const second = copy(first, 2, 'Title Revenue 101');
    const third = paint(copy(second, 3, `${second.text} Additional context`), 4, 10);
    const result = analyzePages([first, second, third]);
    expect(result.suggestedKeep).toEqual([1, 2, 3]);
    expect(result.groups[0].studyKind).toBe('general');
  });

  it.each(['Graph Nodes and edges', ''])(
    'labels visually changing equal-text states conservatively and preserves their last copies: %s',
    (text) => {
      const first = paint(page(1, text), 4, 4, 8, 5);
      const second = paint(copy(first, 3), 4, 4, 8, 5, [200, 30, 30, 255]);
      const third = paint(paint(copy(second, 5), 4, 4, 8, 5, WHITE), 16, 12, 8, 5);
      const result = analyzePages([
        first,
        copy(first, 2),
        second,
        copy(second, 4),
        third,
        copy(third, 6),
      ]);
      expect(result.groups[0]).toMatchObject({ kind: 'review', studyKind: 'diagram' });
      expect(result.suggestedKeep).toEqual([2, 4, 6]);
    },
  );

  it('keeps unrelated and duplicate-only prose groups general', () => {
    const first = paint(page(1, 'Introduction'), 4, 4);
    const third = paint(page(3, 'Unrelated matter'), 18, 12);
    expect(
      analyzePages([first, copy(first, 2), third]).groups.map((group) => group.studyKind),
    ).toEqual(['general', 'general']);
  });

  it('does not let a cached build or duplicate discard current mathematical steps', () => {
    const first = paint(page(1, 'Derivation x = 2'), 4, 4);
    const before = structuredClone(first);
    for (const kind of ['build', 'duplicate'] as const) {
      const second = paint(copy(first, 2, 'Derivation x = 2 y = 3'), 4, 10);
      second.verifiedPreviousRelation = {
        from: 1,
        to: 2,
        kind,
        reason: 'Previously cached comparison.',
        changedRatio: kind === 'duplicate' ? 0 : 0.001,
        removedRatio: 0,
      };
      const original = structuredClone(second);
      const result = analyzePages([first, second]);
      expect(result.suggestedKeep).toEqual([1, 2]);
      expect(result.groups[0]).toMatchObject({ kind: 'review', studyKind: 'derivation' });
      expect(second).toEqual(original);
      expect(analyzePages([first, second])).toEqual(result);
    }
    expect(first).toEqual(before);
  });

  it('rejects deletion advice from cached comparisons contradicted by current pixels', () => {
    const first = paint(page(1, 'A stable diagram'), 4, 4);
    const second = paint(copy(first, 2), 4, 4, 4, 2, [220, 20, 20, 255]);
    second.verifiedPreviousRelation = {
      from: 1,
      to: 2,
      kind: 'duplicate',
      reason: 'Previously cached comparison.',
      changedRatio: 0,
      removedRatio: 0,
    };
    const result = analyzePages([first, second]);
    expect(result.suggestedKeep).toEqual([1, 2]);
    expect(result.groups[0].studyKind).toBe('diagram');
  });
});

describe('analyzePages: reference links are not mathematical notation', () => {
  it.each([
    'Read <https://course.example.edu/guide> for details',
    'Read (<https://course.example.edu/guide>)',
    'Read <http://course.example.edu/>.',
    'Download <ftp://files.example.edu/lesson>',
    'Read <www.course.example.edu/guide>',
    'Contact <teacher@example.edu> for help',
    'Contact <mailto:teacher+course@example.edu>',
    'Open https://course.example.edu/search?topic=slides&lang=en',
    'Contact teacher+course@example.edu for help',
  ])('preserves safe bullet-reveal suggestions when a reference appears: %s', (reference) => {
    const first = paint(page(1, 'Course resources First point'), 4, 4);
    const second = paint(copy(first, 2, `${first.text} ${reference}`), 4, 10);
    const third = paint(copy(second, 3, `${second.text} Last point`), 4, 16);
    const result = analyzePages([first, second, third]);
    expect(result.suggestedKeep).toEqual([3]);
    expect(result.groups[0]).toMatchObject({ kind: 'build', studyKind: 'reveal' });
    expect(result.relations.map((relation) => relation.kind)).toEqual(['build', 'build']);
  });

  it.each([
    'Read <https://course.example.edu/guide> x = 2',
    'x < y Reference <https://course.example.edu/guide>',
    '<x = 2> Reference <https://course.example.edu/guide>',
    'Contact <teacher@example.edu> Integral ∫ f(x) dx',
    'Read <https://course.example.edu/search?topic=slides> x² + y²',
    'Read <https://course.example.edu/guide>x=2',
  ])('still protects actual mathematical steps beside references: %s', (text) => {
    const first = paint(page(1, text), 4, 4);
    const second = paint(copy(first, 2, `${text} Next step`), 4, 10);
    const result = analyzePages([first, second]);
    expect(result.suggestedKeep).toEqual([1, 2]);
    expect(result.groups[0]).toMatchObject({ kind: 'review', studyKind: 'derivation' });
  });

  it('continues to preserve changed link text even when the page pixels match', () => {
    const first = paint(page(1, 'Read <https://course.example.edu/first>'), 4, 4);
    const second = copy(first, 2, 'Read <https://course.example.edu/second>');
    const result = analyzePages([first, second]);
    expect(result.suggestedKeep).toEqual([1, 2]);
    expect(result.relations[0].kind).not.toBe('duplicate');
    expect(result.groups[0].studyKind).toBe('general');
  });

  it('continues to preserve foreground loss beside otherwise additive reference text', () => {
    const first = paint(page(1, 'Read <https://course.example.edu/guide>'), 4, 4);
    const second = paint(copy(first, 2, `${first.text} Additional resource`), 4, 10);
    paint(second, 4, 4, 1, 1, WHITE);
    expect(analyzePages([first, second]).suggestedKeep).toEqual([1, 2]);
  });
});
