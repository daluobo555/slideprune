import type { Language } from './i18n';
import type { SlideGroup } from './types';

const en = {
  title: 'Three kinds of slides. Room for every idea.',
  subtitle: 'Try an original example. Choose what to condense and what to study step by step.',
  reveal: 'Progressive reveals',
  derivation: 'Formula steps',
  diagram: 'Changing diagrams',
  general: 'Review sequence',
  revealDescription: 'Compare accumulated content, then keep a complete version.',
  derivationDescription: 'Keep distinct derivation steps, including cumulative equations.',
  diagramDescription: 'Follow changing paths, colours and states frame by frame.',
  tryExample: 'Explore example',
  suggested: 'Suggested study view',
  revealHint: 'Earlier content appears to remain. Review the sequence before removing its steps.',
  derivationHint:
    'Mathematical notation was found. Distinct steps are kept, even when content accumulates.',
  diagramHint:
    'Visual states change while text stays similar. Inspect the process before excluding a frame.',
  generalHint: 'Review every source step. You can preserve this whole group at any time.',
  limitation:
    'These are comparison cues, not an understanding of the lesson. Keep any uncertain step.',
  keepGroup: 'Keep every step',
  resetGroup: 'Restore group suggestions',
  play: 'Play steps',
  pause: 'Pause',
  step: 'Step',
  playbackHint: 'Review includes excluded pages. Playback never changes your selection.',
  retained: 'kept',
  excluded: 'excluded',
  firstFrame: 'Starting frame',
  imageAdvice:
    'This selection contains formula or diagram cues. Without page images, extracted text may omit essential visual details.',
};
const zh: typeof en = {
  title: '三种课件，都有适合的整理方式。',
  subtitle: '用原创示例看看：哪些可以精简，哪些需要留住过程。',
  reveal: '逐条展开',
  derivation: '公式推导',
  diagram: '图形演变',
  general: '逐步复核',
  revealDescription: '检查累积内容，复核后留下完整的一页。',
  derivationDescription: '保留不同推导步骤，逐行累积的公式也能回看。',
  diagramDescription: '沿着路径、颜色和状态变化，逐帧检查过程。',
  tryExample: '看看这个示例',
  suggested: '建议的复习方式',
  revealHint: '前面的内容看起来仍在。先检查整个展开过程，再决定精简哪些页。',
  derivationHint: '检测到数学符号线索。即使内容逐行增加，也保留不同的推导步骤。',
  diagramHint: '文字相近，画面状态发生变化。先逐帧检查过程，再决定是否排除。',
  generalHint: '按原始顺序检查每一步。需要保留过程时，可以保留本组全部页面。',
  limitation: '分类来自文字与图像比较，不代表理解课程含义；拿不准的步骤请保留。',
  keepGroup: '保留本组全部步骤',
  resetGroup: '恢复本组建议',
  play: '自动回看',
  pause: '暂停回看',
  step: '步骤',
  playbackHint: '回看包含已排除页，不会改变保留选择。',
  retained: '已保留',
  excluded: '已排除',
  firstFrame: '起始参考页',
  imageAdvice: '所选内容包含公式或图形线索。未附原页图片时，提取文字可能缺少重要的公式和图形细节。',
};
export const studyMessages = (lang: Language) => (lang === 'zh' ? zh : en);

export function scenarioCards(lang: Language) {
  const t = studyMessages(lang);
  const pictures = {
    reveal: '<div class="reveal-sketch"><i></i><i></i><i></i><span>01 → 02 → 03</span></div>',
    derivation:
      '<div class="formula-sketch"><span>f(x) = x²</span><i>↓</i><strong>f′(x) = 2x</strong></div>',
    diagram:
      '<svg class="graph-sketch" viewBox="0 0 230 76" aria-hidden="true"><path d="M28 38 110 16 200 38M28 38 110 62 200 38"/><path class="active-route" d="M28 38 110 16 200 38"/><circle cx="28" cy="38" r="10"/><circle cx="110" cy="16" r="10"/><circle class="inactive" cx="110" cy="62" r="10"/><circle cx="200" cy="38" r="10"/></svg>',
  };
  return `<section class="study-scenarios"><div class="scenario-heading"><h2>${t.title}</h2><p>${t.subtitle}</p></div><div class="scenario-grid">${(['reveal', 'derivation', 'diagram'] as const).map((kind, index) => `<button class="scenario-card study-${kind}" data-action="study-demo" data-demo="${kind}" data-focus="demo-${kind}"><div class="scenario-art" aria-hidden="true">${pictures[kind]}</div><span class="scenario-number">0${index + 1}</span><h3>${t[kind]}</h3><p>${t[`${kind}Description`]}</p><span class="scenario-cta">${t.tryExample}<b aria-hidden="true">↗</b></span></button>`).join('')}</div></section>`;
}

export function studyGuidance(group: SlideGroup, lang: Language, locked: boolean) {
  const t = studyMessages(lang);
  const kind = group.studyKind ?? 'general';
  return `<div class="study-guidance study-${kind}"><div><span>${t.suggested}</span><strong>${t[kind]}</strong></div><p>${t[`${kind}Hint`]}</p><div class="group-actions"><button class="btn subtle" data-action="keep-group" data-focus="keep-group" ${locked ? 'disabled' : ''}>${t.keepGroup}</button><button class="text-btn" data-action="reset-group" data-focus="reset-group" ${locked ? 'disabled' : ''}>${t.resetGroup}</button></div></div>`;
}

export function sequenceControls(
  group: SlideGroup,
  current: number,
  kept: Set<number>,
  lang: Language,
  playing: boolean,
  locked: boolean,
) {
  if (group.pages.length < 2) return '';
  const t = studyMessages(lang);
  return `<div class="sequence-review"><div class="sequence-toolbar"><span>${t.step} <strong>${group.pages.indexOf(current) + 1}</strong> / ${group.pages.length}</span><button class="btn sequence-play" data-action="sequence-play" data-focus="sequence-play" aria-pressed="${playing}" ${locked ? 'disabled' : ''}><span aria-hidden="true">${playing ? 'Ⅱ' : '▷'}</span>${playing ? t.pause : t.play}</button></div><div class="sequence-track" role="group" aria-label="${t.general}">${group.pages.map((page, index) => `<button data-action="sequence-page" data-page="${page}" data-focus="sequence-${page}" aria-current="${page === current ? 'step' : 'false'}" aria-label="${t.step} ${index + 1}, ${lang === 'zh' ? '原页' : 'source page'} ${page}, ${kept.has(page) ? t.retained : t.excluded}" class="${kept.has(page) ? '' : 'excluded'}"><b>${index + 1}</b><span>${page}</span></button>`).join('')}</div><p>${t.playbackHint}</p></div>`;
}
