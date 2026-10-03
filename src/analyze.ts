import type { Analysis, PageRelation, PageSnapshot, SlideGroup } from './types';

function normalizedText(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

/** Extracted mathematical notation is a reason to keep steps, never proof of meaning. */
function hasMathematicalText(text: string): boolean {
  // Link wrappers and URL query parameters are reference syntax, not equations.
  // Mask only recognizable references, so nearby formula text and <x = 2> remain.
  // This affects the study cue only; pixel and retained-text comparisons use the source.
  const referenceFree = text
    .replace(/(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>()\[\]{}]+/giu, ' ')
    .replace(/(?:mailto:)?[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu, ' ');
  const normalized = referenceFree.normalize('NFKC');
  return (
    /[\p{L}\p{N})\]][⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/u.test(referenceFree) ||
    /[\p{L}\p{N})\]]\s*[=≠≈≡<>≤≥∝]\s*[\p{L}\p{N}([+\-−]/u.test(normalized) ||
    /[∑∏∫√±∂∇∞∈∉⊂⊆∪∩]/u.test(normalized) ||
    /(?:^|[\s(=])(?:\p{N}+(?:\.\p{N}+)?|[\p{L}])\s*[+\-−*×/÷^]\s*(?:\p{N}+|[\p{L}])(?:$|[\s)=+\-−*×/÷^])/u.test(
      normalized,
    )
  );
}

function validPixels(page: PageSnapshot): boolean {
  return (
    Number.isFinite(page.width) &&
    page.width > 0 &&
    Number.isFinite(page.height) &&
    page.height > 0 &&
    Number.isSafeInteger(page.pixelWidth) &&
    page.pixelWidth > 0 &&
    Number.isSafeInteger(page.pixelHeight) &&
    page.pixelHeight > 0 &&
    page.pixels.length === page.pixelWidth * page.pixelHeight * 4
  );
}

function samePixel(
  left: Uint8ClampedArray,
  leftOffset: number,
  right: Uint8ClampedArray,
  rightOffset: number,
): boolean {
  return (
    left[leftOffset] === right[rightOffset] &&
    left[leftOffset + 1] === right[rightOffset + 1] &&
    left[leftOffset + 2] === right[rightOffset + 2] &&
    left[leftOffset + 3] === right[rightOffset + 3]
  );
}

/** A uniform opaque perimeter is evidence of a background, never a white-page assumption. */
function hasUniformBorder(page: PageSnapshot): boolean {
  if (page.pixelWidth < 3 || page.pixelHeight < 3 || page.pixels[3] !== 255) return false;
  const { pixels, pixelWidth: width, pixelHeight: height } = page;
  for (let x = 0; x < width; x++) {
    if (
      !samePixel(pixels, 0, pixels, x * 4) ||
      !samePixel(pixels, 0, pixels, ((height - 1) * width + x) * 4)
    )
      return false;
  }
  for (let y = 1; y < height - 1; y++) {
    if (
      !samePixel(pixels, 0, pixels, y * width * 4) ||
      !samePixel(pixels, 0, pixels, (y * width + width - 1) * 4)
    )
      return false;
  }
  return true;
}

function tokens(text: string): string[] {
  // Whole number tokens prevent 100 -> 1000 from looking like retained text.
  return text.match(/[\p{L}\p{M}]+|\p{N}+(?:[.,]\p{N}+)*|[^\s]/gu) ?? [];
}

function retainsTokens(before: string[], after: string[]): boolean {
  let index = 0;
  for (const token of after) {
    if (index < before.length && before[index] === token) index++;
  }
  return before.length > 0 && index === before.length;
}

function textSimilarity(before: string[], after: string[]): number {
  if (!before.length || !after.length) return before.length === after.length ? 1 : 0;
  const counts = new Map<string, number>();
  for (const token of before) counts.set(token, (counts.get(token) ?? 0) + 1);
  let common = 0;
  for (const token of after) {
    const remaining = counts.get(token) ?? 0;
    if (remaining > 0) {
      common++;
      counts.set(token, remaining - 1);
    }
  }
  return (2 * common) / (before.length + after.length);
}

/** Compare the supplied full-page pixels without consulting cached relations. */
export function compareAdjacentPages(before: PageSnapshot, after: PageSnapshot): PageRelation {
  const relation: PageRelation = {
    from: before.pageNumber,
    to: after.pageNumber,
    kind: 'different',
    reason: 'Pages do not have enough matching evidence to combine.',
    changedRatio: 1,
    removedRatio: 0,
  };
  if (!validPixels(before) || !validPixels(after)) {
    relation.reason = 'Pixel evidence is incomplete; keep both pages.';
    return relation;
  }
  if (
    before.width !== after.width ||
    before.height !== after.height ||
    before.pixelWidth !== after.pixelWidth ||
    before.pixelHeight !== after.pixelHeight
  ) {
    relation.reason = 'Page dimensions differ; keep both pages.';
    return relation;
  }
  const totalPixels = before.pixelWidth * before.pixelHeight;
  let changed = 0;
  let foreground = 0;
  let changedForeground = 0;
  const knownBackground =
    hasUniformBorder(before) &&
    hasUniformBorder(after) &&
    samePixel(before.pixels, 0, after.pixels, 0);
  for (let offset = 0; offset < before.pixels.length; offset += 4) {
    const differs = !samePixel(before.pixels, offset, after.pixels, offset);
    if (differs) changed++;
    if (knownBackground && !samePixel(before.pixels, offset, before.pixels, 0)) {
      foreground++;
      if (differs) changedForeground++;
    }
  }
  relation.changedRatio = changed / totalPixels;
  relation.removedRatio = foreground > 0 ? changedForeground / foreground : 0;
  const beforeText = normalizedText(before.text);
  const afterText = normalizedText(after.text);
  if (changed === 0 && beforeText === afterText) {
    relation.kind = 'duplicate';
    relation.reason =
      'Full-page pixels and extracted text match exactly; suggest keeping the last copy.';
    return relation;
  }
  const beforeTokens = tokens(beforeText);
  const afterTokens = tokens(afterText);
  const retainedText = retainsTokens(beforeTokens, afterTokens);
  // Only a demonstrable text reveal can be auto-suggested. Pure raster additions,
  // unknown/photographic backgrounds and recoloured foreground require review.
  if (
    knownBackground &&
    foreground > 0 &&
    foreground / totalPixels <= 0.35 &&
    changed > 0 &&
    changed / totalPixels <= 0.2 &&
    changedForeground === 0 &&
    retainedText &&
    afterTokens.length > beforeTokens.length
  ) {
    const mathematical = hasMathematicalText(beforeText) || hasMathematicalText(afterText);
    relation.kind = mathematical ? 'changed' : 'build';
    relation.reason = mathematical
      ? 'Extracted mathematical notation may describe a derivation; preserve each distinct step even when earlier content remains.'
      : 'Earlier text and every foreground pixel remain unchanged; new content appears only on the uniform background. Review before excluding earlier steps.';
    return relation;
  }
  if (
    changed / totalPixels <= 0.2 &&
    (retainedText || textSimilarity(beforeTokens, afterTokens) >= 0.65)
  ) {
    relation.kind = 'changed';
    relation.reason =
      changedForeground > 0
        ? 'Earlier visual content disappeared, moved or changed colour; preserve each distinct state for review.'
        : !retainedText && beforeText !== afterText
          ? 'Extracted text changed or disappeared; preserve each distinct state for review.'
          : 'Pages look related, but an additive reveal is not proven; preserve each distinct state for review.';
  }
  return relation;
}

/** Suggestions are reversible: uncertain changes always preserve their pages. */
export function analyzePages(pages: PageSnapshot[]): Analysis {
  const groups: SlideGroup[] = [];
  const relations: PageRelation[] = [];
  const pagesByNumber = new Map(pages.map((page) => [page.pageNumber, page]));
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    const previous = pages[index - 1];
    const verified = page.verifiedPreviousRelation;
    const sampledRelation = previous ? compareAdjacentPages(previous, page) : undefined;
    let relation = previous
      ? verified?.from === previous.pageNumber && verified.to === page.pageNumber
        ? { ...verified }
        : sampledRelation
      : undefined;
    // A cached full-render comparison can detect details absent from thumbnails.
    // But it cannot justify deletion when current pixels or text contradict it.
    if (
      relation &&
      sampledRelation &&
      ((relation.kind === 'duplicate' && sampledRelation.kind !== 'duplicate') ||
        (relation.kind === 'build' &&
          (sampledRelation.kind === 'changed' || sampledRelation.kind === 'different')))
    ) {
      relation = sampledRelation;
    }
    if (relation) relations.push(relation);
    const current = groups[groups.length - 1];
    if (!relation || relation.kind === 'different') {
      groups.push({
        id: groups.length + 1,
        pages: [page.pageNumber],
        kind: 'single',
        suggestedKeep: [page.pageNumber],
        relations: [],
      });
    } else {
      current.pages.push(page.pageNumber);
      current.relations.push(relation);
      current.kind =
        relation.kind === 'changed' || current.kind === 'review'
          ? 'review'
          : relation.kind === 'build' || current.kind === 'build'
            ? 'build'
            : 'duplicate';
    }
  }
  for (const group of groups) {
    const mathematical = group.pages.some((number) =>
      hasMathematicalText(pagesByNumber.get(number)!.text),
    );
    const visualChanges = group.relations.some((relation) => {
      const before = pagesByNumber.get(relation.from)!;
      const after = pagesByNumber.get(relation.to)!;
      return (
        relation.kind === 'changed' &&
        relation.changedRatio > 0 &&
        normalizedText(before.text) === normalizedText(after.text)
      );
    });
    group.studyKind = mathematical
      ? 'derivation'
      : visualChanges
        ? 'diagram'
        : group.kind === 'build'
          ? 'reveal'
          : 'general';
    if (mathematical && group.relations.some((relation) => relation.kind !== 'duplicate')) {
      group.kind = 'review';
      // Apply the policy to the entire connected sequence, including steps that
      // precede the first extracted equation and any stale cached build advice.
      for (const relation of group.relations) {
        if (relation.kind === 'build') {
          relation.kind = 'changed';
          relation.reason =
            'This sequence contains extracted mathematical notation; preserve every distinct step for review.';
        }
      }
    }
    // In review groups an excluded page must reach a later kept copy using only
    // exact duplicate edges. Never collapse additive steps across uncertainty.
    group.suggestedKeep =
      group.kind === 'review'
        ? group.pages.filter((page, index) => {
            const relation = group.relations[index];
            return !(
              relation?.kind === 'duplicate' &&
              relation.from === page &&
              relation.to === group.pages[index + 1]
            );
          })
        : [group.pages[group.pages.length - 1]];
  }
  return { groups, relations, suggestedKeep: groups.flatMap((group) => group.suggestedKeep) };
}
