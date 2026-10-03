import './styles.css';
import './study.css';
import { messages, errorMessage, type Language } from './i18n';
import { analyzePages } from './analyze';
import { ExportCache } from './export-cache';
import type { Analysis, ExportLayout, PageSnapshot, SlideGroup } from './types';
import type { OutputFormat } from './document-types';
import { scenarioCards, studyGuidance, sequenceControls, studyMessages } from './study-ui';
import { SequencePlayer } from './sequence-player';

const root = document.querySelector<HTMLDivElement>('#app')!;
let lang: Language = navigator.language.startsWith('zh') ? 'zh' : 'en';
let pages: PageSnapshot[] = [];
let analysis: Analysis | null = null;
let source: Uint8Array | null = null;
let filename = '';
let kept = new Set<number>();
let groupIndex = 0;
let pageNumber = 1;
let layout: ExportLayout = 'notes';
let outputFormat: OutputFormat = 'pdf';
let wordImages = true;
let markdownImages = false;
let documentController: AbortController | null = null;
let documentRequest = 0;
let documentProgress = { done: 0, total: 0, phase: 'checking' as 'checking' | 'pages' | 'writing' };
let busy: 'load' | 'export' | 'preview' | null = null;
let progress = { done: 0, total: 0 };
let error = '';
let notice = '';
let expanded = false;
let sourcePreview = '';
let previewLoading = false;
let previewError = '';
let previewZoom = false;
let previewController: AbortController | null = null;
let previewRequest = 0;
let diff = false;
let comparing = false;
let history: number[][] = [];
let outputPreview = '';
let outputPage = 1;
let previewPageDraft = '1';
const exportCache = new ExportCache();
let previewOpen = false;
let downloadLink: { url: string; name: string } | null = null;
let controller: AbortController | null = null;
let loadId = 0;
const sequencePlayer = new SequencePlayer();
const escape = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const icons: Record<string, string> = {
  leaf: '<path d="M18 3C8 3 3 7 4 14s12 8 15 0c1-4 0-8-1-11Z"/><path d="m5 20 10-11"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8m-8 4h6"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
};
const icon = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.file}</svg>`;
const action = (id: string, text: string, cls = 'btn subtle', attrs = '') =>
  `<button class="${cls}" data-action="${id}" data-focus="${id}" ${attrs}>${text}</button>`;
function kindName(g: SlideGroup) {
  const t = messages(lang);
  return g.kind === 'review' ? t.reviewKind : t[g.kind];
}
function groupHelp(g: SlideGroup) {
  const t = messages(lang);
  return g.kind === 'review' ? t.reviewHelp : t[`${g.kind}Help`];
}
function selectedPages() {
  return pages.filter((p) => kept.has(p.pageNumber)).map((p) => p.pageNumber);
}
function setSelection(next: number[]) {
  const previous = selectedPages();
  if (previous.join(',') === next.join(',')) return;
  history.push(previous);
  if (history.length > 40) history.shift();
  kept = new Set(next);
}
function undoSelection() {
  sequencePlayer.stop();
  const previous = history.pop();
  if (!previous || busy) return;
  kept = new Set(previous);
  notice = '';
  render();
}
function pageRange(nums: number[]) {
  return nums.length === 1 ? `${nums[0]}` : `${nums[0]}–${nums.at(-1)}`;
}

function activateGroup(index: number) {
  groupIndex = index;
  const group = analysis!.groups[index];
  const process = group.studyKind === 'derivation' || group.studyKind === 'diagram';
  pageNumber = process ? group.pages[0] : group.pages.at(-1)!;
  comparing = process;
  diff = false;
}

function render() {
  const focusKey = (document.activeElement as HTMLElement | null)?.dataset.focus;
  const t = messages(lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  root.innerHTML = `<header class="topbar"><a class="brand" href="#" data-action="home" aria-label="SlidePrune">${icon('leaf')}<span>SlidePrune<span class="brand-dot">.</span></span></a><span class="tagline">${t.tagline}</span><div class="top-actions"><span class="local-badge"><i></i>${t.local}</span>${action('language', t.language, 'language', busy ? 'disabled' : '')}</div></header>
    <main>${error ? `<div class="message error" role="alert"><div><strong>${t.errorTitle}</strong><p>${escape(errorMessage(error, lang))}</p></div>${action('dismiss', icon('close'), 'icon-btn', `aria-label="${t.dismiss}"`)}</div>` : ''}
    ${notice ? `<div class="message success" role="status">${icon('check')} ${escape(notice)}${downloadLink ? `<a class="download-link" href="${downloadLink.url}" download="${escape(downloadLink.name)}">${t.saveAgain}</a>` : ''}</div>` : ''}
    ${busy === 'load' ? loadingView() : pages.length && analysis ? workspaceView() : landingView()}</main>
    <footer><span>${icon('leaf')}${t.footer}</span><span>${t.footerNote}</span></footer>
    <input id="pdf-input" class="sr-only" type="file" accept="application/pdf,.pdf" aria-label="${t.choose}" />
    ${expanded && pages.length ? modalView() : ''}
    ${previewOpen ? outputModalView() : ''}`;
  if (focusKey)
    root
      .querySelector<HTMLElement>(`[data-focus="${CSS.escape(focusKey)}"]`)
      ?.focus({ preventScroll: true });
  const modal = root.querySelector<HTMLElement>('.preview-modal');
  for (const element of root.querySelectorAll<HTMLElement>('header, main, footer, #pdf-input'))
    element.inert = !!modal;
  document.body.style.overflow = modal ? 'hidden' : '';
  if (modal && !modal.contains(document.activeElement))
    modal.querySelector<HTMLButtonElement>('button')?.focus();
  if (documentController) updateDocumentProgress();
}

function landingView() {
  const t = messages(lang);
  return `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="short-line"></span>${t.eyebrow}</p><h1>${t.hero1}<br><em>${t.hero2}</em></h1><p class="intro">${t.intro}</p><div class="hero-features">${[t.feature1, t.feature2, t.feature3].map((x) => `<span>${icon('check')}${x}</span>`).join('')}</div></div>
    <div class="hero-art" aria-hidden="true"><div class="paper back-paper"></div><div class="paper middle-paper"></div><div class="paper front-paper"><div class="paper-top"><span>FIELD NOTES / 01</span><span>SLIDEPRUNE</span></div><div class="paper-title">The art of<br>paying attention.</div><div class="paper-line"></div><div class="diagram"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><span class="orbit orbit-three"></span><i>focus</i></div><div class="paper-bottom"><span>Ideas worth keeping.</span><span>01 / 04</span></div></div><div class="art-note">less scrolling,<br><span>more understanding.</span><svg width="90" height="50" viewBox="0 0 90 50"><path d="M85 5Q20 5 12 40m-4-14 4 14 14-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></div></div></section>
    ${scenarioCards(lang)}
    <section class="start-section"><div class="dropzone" id="dropzone"><div class="upload-icon">${icon('upload')}</div><h2>${t.choose}</h2><p>${t.drop}</p>${action('choose', `${t.choose}${icon('arrow')}`, 'btn primary large')}<span class="file-limits">${t.limits}</span><div class="demo-row"><span>${t.demoDetail}</span>${action('demo', `${t.demo}${icon('arrow')}`, 'text-btn')}</div></div>
    <aside class="start-aside"><div class="howto">${[1, 2, 3].map((n) => `<div class="step"><span>0${n}</span><div><h3>${t[`step${n}` as keyof typeof t]}</h3><p>${t[`step${n}body` as keyof typeof t]}</p></div></div>`).join('')}</div><div class="privacy">${icon('shield')}<div><strong>${t.privacyTitle}</strong><p>${t.privacy}</p></div></div></aside></section>
    <details class="method"><summary>${t.method}</summary><p>${t.methodBody}</p></details>`;
}

function loadingView() {
  const t = messages(lang);
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return `<section class="loading"><div class="spinner"></div><p class="eyebrow">${t.local}</p><h1>${t.loading}</h1><p>${t.loadingBody}</p><div class="progress" role="progressbar" aria-label="${t.loading}" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${percent}%"></span></div><p class="progress-label" aria-live="polite">${progress.total ? `${progress.done} / ${progress.total}` : '…'}</p>${action('cancel', t.cancel)}</section>`;
}

function workspaceView() {
  const t = messages(lang);
  const a = analysis!;
  const g = a.groups[groupIndex];
  const active = pages.find((p) => p.pageNumber === pageNumber)!;
  const locked = busy ? 'disabled' : '';
  return `<section class="workspace-heading"><div><p class="eyebrow"><span class="status-dot"></span>${t.done}</p><h1>${t.review}</h1><p>${t.reviewSub}</p></div><div class="file-chip">${icon('file')}<span title="${escape(filename)}">${escape(filename)}</span>${action('choose', t.newFile, 'text-btn', locked)}</div></section>
    <div class="stats-row"><div class="stats"><span><b>${pages.length}</b>${t.original}</span><span class="stats-arrow">→</span><span class="positive"><b>${kept.size}</b>${t.kept}</span><span><b>${pages.length - kept.size}</b>${t.excluded}</span></div><div class="toolbar">${action('undo', t.undo, 'btn subtle', `${locked} ${history.length ? '' : 'disabled'}`)}${action('keep-all', t.all, 'btn subtle', locked)}${action('reset', t.reset, 'btn subtle', locked)}</div></div>
    <div class="workspace"><aside class="group-sidebar"><div class="sidebar-title">${t.groups}<span>${a.groups.length}</span></div><nav aria-label="${t.groups}">${a.groups.map((item, i) => `<button class="group-item ${i === groupIndex ? 'active' : ''}" data-action="group" data-index="${i}" data-focus="group-${i}" aria-current="${i === groupIndex ? 'true' : 'false'}"><span class="group-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${t.pages} ${pageRange(item.pages)}</strong><small>${kindName(item)}</small></span><span class="group-count">${item.pages.filter((p) => kept.has(p)).length}/${item.pages.length}</span></button>`).join('')}</nav><button class="clear-file text-btn" data-action="clear" ${locked}>${icon('close')}${t.clear}</button></aside>
    <section class="review-panel"><div class="group-heading"><div><p class="eyebrow">${t.group} ${String(groupIndex + 1).padStart(2, '0')}</p><h2>${kindName(g)}</h2></div><span class="kind-badge ${g.kind}">${t.pages} ${pageRange(g.pages)}</span></div><p class="group-explanation">${groupHelp(g)}</p>
    ${studyGuidance(g, lang, !!busy)}
    <div class="thumb-grid ${g.studyKind === 'derivation' || g.studyKind === 'diagram' ? 'sequence-thumbs' : ''}">${g.pages
      .map((n) => {
        const p = pages.find((p) => p.pageNumber === n)!;
        return `<article class="page-card ${kept.has(n) ? '' : 'excluded'} ${n === pageNumber ? 'current' : ''}"><button class="thumb" data-action="page" data-page="${n}" data-focus="page-${n}" aria-label="${t.originalPage} ${n}"><img src="${p.thumbnail}" alt="${t.originalPage} ${n}" loading="lazy"><span class="page-number">${n}</span></button><button class="keep-control" data-action="toggle" data-page="${n}" data-focus="toggle-${n}" aria-pressed="${kept.has(n)}" aria-label="${kept.has(n) ? t.skip : t.keep} ${n}" ${locked}><span class="checkbox">${kept.has(n) ? icon('check') : ''}</span><span>${kept.has(n) ? t.selected : t.skipped}</span></button></article>`;
      })
      .join('')}</div>
    <div class="preview-title"><span>${t.inspect} <b>${pageNumber}</b></span><div>${g.pages.length > 1 ? action('compare', t.compare, `text-btn ${comparing ? 'on' : ''}`, `aria-pressed="${comparing}"`) : ''}${g.pages.length > 1 ? action('diff', t.visualDiff, `text-btn ${diff ? 'on' : ''}`, `aria-pressed="${diff}" ${g.pages.indexOf(pageNumber) === 0 ? 'disabled' : ''}`) : ''}${action('expand', icon('expand'), 'icon-btn', `aria-label="${t.expand}"`)}</div></div>
    ${sequenceControls(g, pageNumber, kept, lang, sequencePlayer.playing, !!busy)}
    ${pagePreview(active, g)}${diff && g.pages.indexOf(pageNumber) > 0 ? `<p class="diff-hint">${t.diffHint}</p>` : ''}
    <p class="study-limit">${studyMessages(lang).limitation}</p>
    <div class="page-navigation">${action('previous', icon('chevron'), 'icon-btn previous', `aria-label="${t.previous}" ${pageNumber === 1 ? 'disabled' : ''}`)}<span>${t.originalPage} ${pageNumber} ${t.of} ${pages.length}</span>${action('next', icon('chevron'), 'icon-btn', `aria-label="${t.next}" ${pageNumber === pages.length ? 'disabled' : ''}`)}</div></section>
    ${exportSidebarView()}</div>
    <details class="method"><summary>${t.method}</summary><p>${t.methodBody}</p></details>`;
}

function includeDocumentImages() {
  return outputFormat === 'docx' ? wordImages : markdownImages;
}

function documentProgressLabel() {
  const t = messages(lang);
  if (documentProgress.phase === 'checking') return t.checkingDocument;
  if (documentProgress.phase === 'pages')
    return includeDocumentImages() ? t.preparingImages : t.preparingText;
  return outputFormat === 'docx'
    ? t.writingWord
    : markdownImages
      ? t.writingMarkdownZip
      : t.writingMarkdown;
}

function exportSidebarView() {
  const t = messages(lang);
  const locked = busy ? 'disabled' : '';
  const isPdf = outputFormat === 'pdf';
  const includeImages = includeDocumentImages();
  const selected = pages.filter((page) => kept.has(page.pageNumber));
  const emptyText = selected.filter(
    (page) => !(page.textLines ?? [page.text]).some((line) => line.trim()),
  ).length;
  const label = isPdf
    ? t.export
    : outputFormat === 'docx'
      ? t.downloadWord
      : includeImages
        ? t.downloadMarkdownZip
        : t.downloadMarkdown;
  const formatNames: Record<OutputFormat, string> = {
    pdf: 'PDF',
    docx: 'Word',
    markdown: 'Markdown',
  };
  const formatOptions = `<div class="format-selector" role="group" aria-label="${t.formatLabel}">${(['pdf', 'docx', 'markdown'] as const).map((format) => `<button data-action="format" data-format="${format}" data-focus="format-${format}" aria-pressed="${outputFormat === format}" ${locked}>${formatNames[format]}</button>`).join('')}</div>`;
  let options = isPdf
    ? `<div class="layout-options" role="group" aria-label="${t.output}">${(['slides', 'notes', 'grid'] as const).map((mode) => `<button class="layout-option ${layout === mode ? 'active' : ''}" data-action="layout" data-layout="${mode}" data-focus="layout-${mode}" aria-pressed="${layout === mode}" ${locked}><span class="layout-icon ${mode}"><i></i>${mode !== 'slides' ? '<i></i>' : ''}${mode === 'grid' ? '<i></i><i></i>' : ''}</span><span><strong>${t[mode]}</strong><small>${t[`${mode}Help`]}</small></span><span class="radio"></span></button>`).join('')}</div>`
    : `<div class="document-options"><p class="format-description">${outputFormat === 'docx' ? t.wordDescription : t.markdownDescription}</p><button class="image-choice" data-action="document-images" data-focus="document-images" aria-pressed="${includeImages}" ${locked}><span class="checkbox">${includeImages ? icon('check') : ''}</span><span><strong>${t.includeImages}</strong><small>${outputFormat === 'docx' ? t.wordImagesHelp : t.markdownImagesHelp}</small></span></button><div class="document-fidelity"><strong>${t.documentFidelity}</strong><p>${t.documentLimits}</p></div>${emptyText ? `<p class="no-text-warning">${t.noTextPages.replace('{count}', String(emptyText))} ${includeImages ? t.noTextWithImages : t.noTextWithoutImages}</p>` : ''}</div>`;
  if (
    !isPdf &&
    !includeImages &&
    analysis?.groups.some(
      (group) =>
        (group.studyKind === 'derivation' || group.studyKind === 'diagram') &&
        group.pages.some((n) => kept.has(n)),
    )
  ) {
    options += `<p class="no-text-warning">${studyMessages(lang).imageAdvice}</p>`;
  }
  const count = isPdf
    ? `${Math.ceil(kept.size / (layout === 'notes' ? 2 : layout === 'grid' ? 4 : 1))} ${t.sheets}`
    : `${kept.size} ${t.documentSections}`;
  return `<aside class="export-sidebar" data-output-format="${outputFormat}"><p class="eyebrow">${t.output}</p><h2>${t.exportHeading}</h2>${formatOptions}${options}<div class="export-summary"><span>${t.countLabel}</span><strong>${kept.size} / ${pages.length}<span>→ ${count}</span></strong></div>${action('export', `${icon('download')}${busy === 'export' ? (isPdf ? t.exporting : t.preparingDocument) : label}`, 'btn primary export-btn', `${locked} ${kept.size === 0 ? 'disabled' : ''}`)}${kept.size === 0 ? `<p class="selection-warning" role="status">${t.emptySelection}</p>` : ''}${isPdf ? action('preview-output', busy === 'preview' ? t.previewing : t.outputPreview, 'btn preview-output-btn', `${locked} ${kept.size === 0 ? 'disabled' : ''}`) : ''}${documentController ? `<div id="document-progress" class="document-export-progress"><p class="document-progress-label" aria-live="polite">${documentProgressLabel()}</p><div class="progress" role="progressbar" aria-label="${t.preparingDocument}" aria-valuemin="0" aria-valuemax="100"><span></span></div><div class="document-progress-actions"><span class="document-progress-count"></span>${action('cancel-export', t.cancel, 'text-btn')}</div></div>` : ''}${action('report', t.report, 'text-btn report-btn', locked)}<div class="review-note">${icon('shield')}<p>${t.reviewNote}</p></div><span class="preserved">${icon('check')}${t.preserved}</span></aside>`;
}

/** Progress updates preserve the Cancel button under the user's pointer. */
function updateDocumentProgress() {
  const region = root.querySelector<HTMLElement>('#document-progress');
  if (!region) return;
  const hasCount = documentProgress.phase === 'pages' && documentProgress.total > 0;
  const percent = hasCount ? Math.round((documentProgress.done / documentProgress.total) * 100) : 0;
  region.querySelector<HTMLElement>('.document-progress-label')!.textContent =
    documentProgressLabel();
  region.querySelector<HTMLElement>('.document-progress-count')!.textContent = hasCount
    ? `${documentProgress.done} / ${documentProgress.total}`
    : '';
  const bar = region.querySelector<HTMLElement>('[role="progressbar"]')!;
  bar.classList.toggle('indeterminate', !hasCount);
  if (hasCount) bar.setAttribute('aria-valuenow', String(percent));
  else bar.removeAttribute('aria-valuenow');
  bar.querySelector<HTMLElement>('span')!.style.width = hasCount ? `${percent}%` : '35%';
}

function diffImage(page: PageSnapshot, group: SlideGroup) {
  const index = group.pages.indexOf(page.pageNumber);
  const previous = pages.find((p) => p.pageNumber === group.pages[index - 1]);
  if (
    !previous ||
    previous.pixelWidth !== page.pixelWidth ||
    previous.pixelHeight !== page.pixelHeight
  )
    return page.thumbnail;
  const canvas = document.createElement('canvas');
  canvas.width = page.pixelWidth;
  canvas.height = page.pixelHeight;
  const ctx = canvas.getContext('2d')!;
  const pixels = new Uint8ClampedArray(page.pixels);
  for (let i = 0; i < pixels.length; i += 4) {
    if (
      Math.max(...[0, 1, 2].map((c) => Math.abs(page.pixels[i + c] - previous.pixels[i + c]))) > 12
    ) {
      pixels[i] = 209;
      pixels[i + 1] = 44;
      pixels[i + 2] = 126;
      pixels[i + 3] = 255;
    }
  }
  ctx.putImageData(new ImageData(pixels, canvas.width, canvas.height), 0, 0);
  return canvas.toDataURL('image/png');
}

function pagePreview(active: PageSnapshot, group: SlideGroup) {
  const t = messages(lang);
  const previous = pages.find(
    (p) => p.pageNumber === group.pages[group.pages.indexOf(active.pageNumber) - 1],
  );
  const currentImage = diff ? diffImage(active, group) : active.thumbnail;
  if (!comparing)
    return `<button class="large-preview" data-action="expand" aria-label="${t.expand}"><img src="${currentImage}" alt="${t.originalPage} ${active.pageNumber}"></button>`;
  const reference = previous ?? active;
  return `<div class="compare-pair"><figure><figcaption>${previous ? t.originalPage : studyMessages(lang).firstFrame} ${reference.pageNumber}</figcaption><img src="${reference.thumbnail}" alt="${t.originalPage} ${reference.pageNumber}" width="${reference.width}" height="${reference.height}"></figure><figure><figcaption>${t.originalPage} ${active.pageNumber}</figcaption><img src="${currentImage}" alt="${t.originalPage} ${active.pageNumber}" width="${active.width}" height="${active.height}"></figure></div>`;
}

function modalView() {
  const t = messages(lang);
  return `<div class="modal-backdrop" data-action="close-backdrop"><section class="preview-modal source-modal" role="dialog" aria-modal="true" aria-label="${t.originalPage} ${pageNumber}"><div><span>${t.highDetail}</span>${action('close-preview', icon('close'), 'icon-btn', `aria-label="${t.close}"`)}</div>${previewStage(sourcePreview, `${t.originalPage} ${pageNumber}`)}${previewNavigation(pageNumber, pages.length, t.originalPage)}<div class="preview-controls"><button class="btn ${kept.has(pageNumber) ? 'primary' : 'subtle'}" data-action="preview-toggle" data-focus="preview-toggle" aria-pressed="${kept.has(pageNumber)}" ${previewLoading || !sourcePreview ? 'disabled' : ''}>${kept.has(pageNumber) ? icon('check') : ''}${kept.has(pageNumber) ? t.selected : t.skipped}</button>${action('preview-zoom', previewZoom ? t.fitPage : t.zoomDetail, 'btn subtle', sourcePreview ? '' : 'disabled')}</div></section></div>`;
}

function previewNavigation(number: number, total: number, label: string) {
  const t = messages(lang);
  return `<div class="preview-navigation">${action('preview-previous', icon('chevron'), 'icon-btn previous', `aria-label="${t.previous}" ${number === 1 ? 'disabled' : ''}`)}<label class="preview-page-field">${label}<input id="preview-page" data-focus="preview-page" type="number" min="1" max="${total}" value="${escape(previewPageDraft)}" aria-label="${t.goToPage}"><span>/ ${total}</span></label>${action('preview-go', t.go, 'text-btn')}${action('preview-next', icon('chevron'), 'icon-btn', `aria-label="${t.next}" ${number === total ? 'disabled' : ''}`)}</div>`;
}

function previewStage(image: string, label: string) {
  const t = messages(lang);
  return `<div class="preview-stage ${previewZoom ? 'zoomed' : ''}" aria-busy="${previewLoading}">${previewLoading ? `<p class="preview-status" role="status">${t.renderingPage}</p>` : previewError ? `<p class="preview-status error" role="alert">${escape(errorMessage(previewError, lang))}</p>` : `<img src="${image}" alt="${label}">`}</div>`;
}

/** Async completion must not replace controls underneath a pointer or typed page number. */
function updatePreviewContent() {
  const stage = root.querySelector<HTMLElement>('.preview-stage');
  if (!stage || (!expanded && !previewOpen)) return;
  const t = messages(lang);
  const image = expanded ? sourcePreview : outputPreview;
  const label = expanded ? `${t.originalPage} ${pageNumber}` : `${t.outputPreview} ${outputPage}`;
  stage.outerHTML = previewStage(image, label);
  for (const command of ['preview-zoom', 'preview-toggle', 'export']) {
    const button = root.querySelector<HTMLButtonElement>(
      `.preview-modal [data-action="${command}"]`,
    );
    if (button) button.disabled = previewLoading || !!busy || !image;
  }
}

function cancelPreviewRender() {
  previewController?.abort();
  previewController = null;
  ++previewRequest;
  previewLoading = false;
}

function closePreview() {
  const returnAction = expanded ? 'expand' : 'preview-output';
  cancelPreviewRender();
  if (busy === 'preview') busy = null;
  expanded = previewOpen = false;
  sourcePreview = outputPreview = '';
  render();
  root
    .querySelector<HTMLElement>(`[data-action="${returnAction}"]`)
    ?.focus({ preventScroll: true });
}

async function openSourcePreview() {
  if (!source || busy) return;
  cancelPreviewRender();
  const request = previewRequest;
  previewController = new AbortController();
  const signal = previewController.signal;
  expanded = true;
  previewPageDraft = String(pageNumber);
  previewOpen = false;
  sourcePreview = previewError = '';
  previewLoading = true;
  render();
  try {
    const { renderPdfPreview } = await import('./pdf');
    const image = await renderPdfPreview(source, pageNumber, signal, { detail: 'high' });
    if (request === previewRequest && !signal.aborted) sourcePreview = image;
  } catch (err) {
    if (request === previewRequest && !signal.aborted)
      previewError = err instanceof Error ? err.message : String(err);
  } finally {
    if (request === previewRequest) {
      previewLoading = false;
      updatePreviewContent();
    }
  }
}

function outputModalView() {
  const t = messages(lang);
  const perSheet = layout === 'notes' ? 2 : layout === 'grid' ? 4 : 1;
  const sheets = Math.ceil(kept.size / perSheet);
  const originals = selectedPages().slice((outputPage - 1) * perSheet, outputPage * perSheet);
  return `<div class="modal-backdrop" data-action="close-output-backdrop"><section class="preview-modal output-modal" role="dialog" aria-modal="true" aria-label="${t.outputPreview}"><div><span>${t.outputPreview} · ${t[layout]}</span>${action('close-output', icon('close'), 'icon-btn', `aria-label="${t.close}"`)}</div>${previewStage(outputPreview, `${t.outputPreview} ${outputPage}`)}${previewNavigation(outputPage, sheets, t.sheet)}<p class="preview-originals">${t.originalPage}: ${originals.join(', ')}</p>${notice && downloadLink ? `<p class="preview-save-notice" role="status">${escape(notice)} <a href="${downloadLink.url}" download="${escape(downloadLink.name)}">${t.saveAgain}</a></p>` : ''}<div class="preview-controls">${action('preview-zoom', previewZoom ? t.fitPage : t.zoomDetail, 'btn subtle', outputPreview ? '' : 'disabled')}${action('export', `${icon('download')}${t.export}`, 'btn primary', busy || !outputPreview ? 'disabled' : '')}</div></section></div>`;
}

function exportKey() {
  return `${loadId}|${layout}|${selectedPages().join(',')}`;
}
async function preparedExport() {
  const key = exportKey();
  const bytes = source!;
  const selection = selectedPages();
  const options = {
    layout,
    title: filename.replace(/\.pdf$/i, ''),
  };
  return exportCache.get(key, async () => {
    const { exportPdf } = await import('./export');
    return exportPdf(bytes, selection, options);
  });
}
async function previewOutput(number = 1) {
  if (!source || outputFormat !== 'pdf' || (busy && busy !== 'preview') || kept.size === 0) return;
  cancelPreviewRender();
  const request = previewRequest;
  previewController = new AbortController();
  const signal = previewController.signal;
  previewLoading = true;
  previewError = outputPreview = '';
  if (!previewOpen) previewZoom = false;
  outputPage = number;
  previewPageDraft = String(number);
  expanded = false;
  previewOpen = true;
  busy = 'preview';
  error = '';
  notice = '';
  render();
  try {
    const bytes = await preparedExport();
    if (request !== previewRequest || signal.aborted) return;
    const { renderPdfPreview } = await import('./pdf');
    const image = await renderPdfPreview(bytes, number, signal, { detail: 'high' });
    if (request === previewRequest && !signal.aborted) outputPreview = image;
  } catch (err) {
    if (request === previewRequest && !signal.aborted)
      previewError = err instanceof Error ? err.message : String(err);
  } finally {
    if (request === previewRequest) {
      busy = null;
      previewLoading = false;
      updatePreviewContent();
    }
  }
}

function navigatePreview(number: number) {
  const total = expanded
    ? pages.length
    : Math.ceil(kept.size / (layout === 'notes' ? 2 : layout === 'grid' ? 4 : 1));
  if (!Number.isInteger(number) || number < 1 || number > total) {
    previewPageDraft = String(expanded ? pageNumber : outputPage);
    render();
    return;
  }
  if (expanded && analysis) {
    pageNumber = number;
    groupIndex = analysis.groups.findIndex((g) => g.pages.includes(number));
    diff = false;
    void openSourcePreview();
  } else if (previewOpen) void previewOutput(number);
}

async function beginLoad(producer: () => Promise<Uint8Array>, name: string) {
  sequencePlayer.stop();
  cancelDocumentExport();
  cancelPreviewRender();
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  const id = ++loadId;
  busy = 'load';
  error = '';
  notice = '';
  expanded = false;
  previewOpen = false;
  exportCache.clear();
  outputPreview = '';
  if (downloadLink) URL.revokeObjectURL(downloadLink.url);
  downloadLink = null;
  progress = { done: 0, total: 0 };
  render();
  try {
    const bytes = await producer();
    if (signal.aborted) return;
    const { loadPdf } = await import('./pdf');
    const snapshots = await loadPdf(
      bytes,
      (done, total) => {
        if (id !== loadId) return;
        progress = { done, total };
        render();
      },
      signal,
    );
    if (id !== loadId || signal.aborted) return;
    const result = analyzePages(snapshots);
    pages = snapshots;
    analysis = result;
    source = bytes;
    filename = name;
    kept = new Set(result.suggestedKeep);
    markdownImages = result.groups.some(
      (group) => group.studyKind === 'derivation' || group.studyKind === 'diagram',
    );
    history = [];
    activateGroup(0);
  } catch (err) {
    if (id === loadId && !signal.aborted) error = err instanceof Error ? err.message : String(err);
  } finally {
    if (id === loadId) {
      busy = null;
      controller = null;
      render();
    }
  }
}

function acceptFile(file?: File) {
  if (!file || busy === 'export' || busy === 'preview') return;
  const t = messages(lang);
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
    error = t.noFile;
    render();
    return;
  }
  if (file.size > 40 * 1024 * 1024) {
    error = t.tooLarge;
    render();
    return;
  }
  void beginLoad(async () => new Uint8Array(await file.arrayBuffer()), file.name);
}

function download(bytes: Uint8Array | string, name: string, type: string) {
  const blob = new Blob([typeof bytes === 'string' ? bytes : new Uint8Array(bytes).buffer], {
    type,
  });
  const url = URL.createObjectURL(blob);
  if (downloadLink) URL.revokeObjectURL(downloadLink.url);
  downloadLink = { url, name };
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}

async function savePdf() {
  if (!source || busy || kept.size === 0 || outputFormat !== 'pdf') return;
  const sourceId = loadId;
  const originalSource = source;
  const outputName = `${filename.replace(/\.pdf$/i, '')}-${layout}.pdf`;
  const outputLanguage = lang;
  busy = 'export';
  error = '';
  notice = '';
  render();
  try {
    const bytes = await preparedExport();
    if (sourceId !== loadId || source !== originalSource) return;
    download(bytes, outputName, 'application/pdf');
    notice = messages(outputLanguage).success;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  } finally {
    busy = null;
    render();
  }
}

function cancelDocumentExport(showNotice = false) {
  const active = !!documentController;
  documentController?.abort();
  documentController = null;
  ++documentRequest;
  if (active && busy === 'export') busy = null;
  if (active && showNotice) notice = messages(lang).exportCancelled;
}

async function saveDocument() {
  if (!source || busy || !kept.size || outputFormat === 'pdf') return;
  const format = outputFormat;
  const bytes = source;
  const sourceId = loadId;
  const snapshots = pages;
  const selection = selectedPages();
  const options = {
    title: filename.replace(/\.pdf$/i, ''),
    language: lang,
    includeImages: includeDocumentImages(),
  };
  const request = ++documentRequest;
  documentController = new AbortController();
  const signal = documentController.signal;
  const current = () =>
    request === documentRequest && sourceId === loadId && source === bytes && !signal.aborted;
  busy = 'export';
  error = notice = '';
  if (downloadLink) URL.revokeObjectURL(downloadLink.url);
  downloadLink = null;
  documentProgress = { done: 0, total: selection.length, phase: 'checking' };
  render();
  try {
    const { assertExportablePdf } = await import('./export');
    if (!current()) return;
    await assertExportablePdf(bytes);
    if (!current()) return;
    const { prepareDocumentPages } = await import('./pdf');
    if (!current()) return;
    documentProgress.phase = 'pages';
    updateDocumentProgress();
    const prepared = await prepareDocumentPages(
      bytes,
      snapshots,
      selection,
      options.includeImages,
      (done, total) => {
        if (!current()) return;
        documentProgress = { done, total, phase: 'pages' };
        updateDocumentProgress();
      },
      signal,
    );
    if (!current()) return;
    documentProgress.phase = 'writing';
    updateDocumentProgress();
    const exporter = await import('./document-export');
    if (!current()) return;
    const result =
      format === 'docx'
        ? await exporter.exportDocx(prepared, options)
        : options.includeImages
          ? await exporter.exportMarkdownBundle(prepared, options)
          : exporter.exportMarkdown(prepared, options);
    // Let a queued Cancel action run before triggering a browser download.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (!current()) return;
    const extension = format === 'docx' ? 'docx' : options.includeImages ? 'zip' : 'md';
    const mime =
      format === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : options.includeImages
          ? 'application/zip'
          : 'text/markdown;charset=utf-8';
    download(result, `${options.title}.${extension}`, mime);
    notice = messages(options.language).documentReady;
  } catch (err) {
    if (current()) error = err instanceof Error ? err.message : String(err);
  } finally {
    if (request === documentRequest) {
      documentController = null;
      busy = null;
      render();
    }
  }
}

function setPage(n: number, playback = false) {
  if (!analysis || n < 1 || n > pages.length) return;
  if (!playback) sequencePlayer.stop();
  const nextGroup = analysis.groups.findIndex((g) => g.pages.includes(n));
  if (nextGroup !== groupIndex) diff = false;
  pageNumber = n;
  groupIndex = nextGroup;
  render();
}

root.addEventListener('click', (event) => {
  const target = (event.target as Element).closest<HTMLElement>('[data-action]');
  if (!target || target.hasAttribute('disabled')) return;
  const command = target.dataset.action;
  if (command !== 'sequence-play') sequencePlayer.stop();
  if (command === 'home') {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (command === 'choose') {
    root.querySelector<HTMLInputElement>('#pdf-input')!.click();
    return;
  }
  if (command === 'language') {
    if (busy) return;
    lang = lang === 'en' ? 'zh' : 'en';
    notice = '';
    if (downloadLink) URL.revokeObjectURL(downloadLink.url);
    downloadLink = null;
    render();
    return;
  }
  if (command === 'dismiss') {
    error = '';
    render();
    return;
  }
  if (command === 'cancel') {
    controller?.abort();
    ++loadId;
    busy = null;
    render();
    return;
  }
  if (command === 'demo') {
    void beginLoad(
      async () => (await import('./demo')).createDemoPdf(),
      'the-science-of-focus.pdf',
    );
    return;
  }
  if (command === 'study-demo') {
    const kind = target.dataset.demo;
    if (kind !== 'reveal' && kind !== 'derivation' && kind !== 'diagram') return;
    void beginLoad(
      async () => (await import('./study-demo')).createStudyDemoPdf(kind),
      `slideprune-${kind}.pdf`,
    );
    return;
  }
  if (command === 'sequence-play' && analysis && !busy) {
    if (sequencePlayer.playing) sequencePlayer.stop();
    else
      sequencePlayer.start(
        analysis.groups[groupIndex].pages,
        pageNumber,
        (n) => setPage(n, true),
        () => render(),
      );
    render();
    return;
  }
  if (command === 'export') {
    if (outputFormat === 'pdf') void savePdf();
    else void saveDocument();
    return;
  }
  if (command === 'cancel-export') {
    cancelDocumentExport(true);
    render();
    return;
  }
  if (command === 'preview-output') {
    void previewOutput();
    return;
  }
  if (command === 'expand') {
    previewZoom = false;
    void openSourcePreview();
    return;
  }
  if (command === 'close-preview' || (command === 'close-backdrop' && event.target === target)) {
    closePreview();
    return;
  }
  if (
    command === 'close-output' ||
    (command === 'close-output-backdrop' && event.target === target)
  ) {
    closePreview();
    return;
  }
  if (command === 'preview-zoom') {
    previewZoom = !previewZoom;
    render();
    return;
  }
  if (command === 'preview-next' || command === 'preview-previous') {
    navigatePreview((expanded ? pageNumber : outputPage) + (command === 'preview-next' ? 1 : -1));
    return;
  }
  if (command === 'preview-go') {
    navigatePreview(Number(root.querySelector<HTMLInputElement>('#preview-page')?.value));
    return;
  }
  if (command === 'preview-toggle' && expanded && !busy) {
    const next = new Set(kept);
    next.has(pageNumber) ? next.delete(pageNumber) : next.add(pageNumber);
    setSelection(pages.filter((p) => next.has(p.pageNumber)).map((p) => p.pageNumber));
    notice = '';
    render();
    return;
  }
  if (command === 'diff') {
    diff = !diff;
    render();
    return;
  }
  if (command === 'compare') {
    comparing = !comparing;
    render();
    return;
  }
  if (command === 'page' || command === 'sequence-page') {
    setPage(Number(target.dataset.page));
    return;
  }
  if (command === 'previous' || command === 'next') {
    setPage(pageNumber + (command === 'next' ? 1 : -1));
    return;
  }
  if (command === 'group' && analysis) {
    activateGroup(Number(target.dataset.index));
    render();
    return;
  }
  if (busy) return;
  if (command === 'undo') {
    undoSelection();
    return;
  }
  notice = '';
  if ((command === 'keep-group' || command === 'reset-group') && analysis) {
    const group = analysis.groups[groupIndex];
    const replace = new Set(command === 'keep-group' ? group.pages : group.suggestedKeep);
    const inGroup = new Set(group.pages);
    setSelection(
      pages
        .filter((p) =>
          inGroup.has(p.pageNumber) ? replace.has(p.pageNumber) : kept.has(p.pageNumber),
        )
        .map((p) => p.pageNumber),
    );
  }
  if (command === 'toggle') {
    const n = Number(target.dataset.page);
    const next = new Set(kept);
    next.has(n) ? next.delete(n) : next.add(n);
    setSelection(pages.filter((p) => next.has(p.pageNumber)).map((p) => p.pageNumber));
  }
  if (command === 'keep-all') setSelection(pages.map((p) => p.pageNumber));
  if (command === 'reset' && analysis) setSelection(analysis.suggestedKeep);
  if (command === 'layout') layout = target.dataset.layout as ExportLayout;
  if (command === 'format') outputFormat = target.dataset.format as OutputFormat;
  if (command === 'document-images') {
    if (outputFormat === 'docx') wordImages = !wordImages;
    else if (outputFormat === 'markdown') markdownImages = !markdownImages;
  }
  if (command === 'clear') {
    cancelDocumentExport();
    cancelPreviewRender();
    ++loadId;
    if (downloadLink) URL.revokeObjectURL(downloadLink.url);
    downloadLink = null;
    pages = [];
    analysis = null;
    source = null;
    filename = '';
    kept.clear();
    history = [];
    error = '';
    exportCache.clear();
    outputPreview = '';
    previewOpen = false;
  }
  if (command === 'report' && analysis) {
    const selection = selectedPages();
    const report = {
      application: 'SlidePrune',
      version: '0.3.1',
      sourceFile: filename,
      originalPages: pages.length,
      format: outputFormat,
      ...(outputFormat === 'pdf'
        ? {
            layout,
            outputPages: selection.map((n, i) => ({
              originalPage: n,
              selectedOrder: i + 1,
              sheet: layout === 'slides' ? i + 1 : Math.floor(i / (layout === 'notes' ? 2 : 4)) + 1,
            })),
          }
        : {
            includeImages: includeDocumentImages(),
            outputSections: selection.map((n, i) => ({ originalPage: n, section: i + 1 })),
          }),
      excludedPages: pages.filter((p) => !kept.has(p.pageNumber)).map((p) => p.pageNumber),
      groups: analysis.groups,
      note: 'Current page selection, which may include suggestions not yet reviewed by the user. This report does not contain PDF page content.',
    };
    download(
      JSON.stringify(report, null, 2),
      `${filename.replace(/\.pdf$/i, '')}-page-map.json`,
      'application/json',
    );
    notice = messages(lang).reportSuccess;
  }
  render();
});

root.addEventListener('change', (event) => {
  if ((event.target as HTMLElement).id === 'pdf-input')
    acceptFile((event.target as HTMLInputElement).files?.[0]);
});
root.addEventListener('input', (event) => {
  if ((event.target as HTMLElement).id === 'preview-page')
    previewPageDraft = (event.target as HTMLInputElement).value;
});
root.addEventListener('dragover', (event) => {
  event.preventDefault();
  root.querySelector('#dropzone')?.classList.add('dragover');
});
root.addEventListener('dragleave', (event) => {
  if (!root.contains(event.relatedTarget as Node))
    root.querySelector('#dropzone')?.classList.remove('dragover');
});
root.addEventListener('drop', (event) => {
  event.preventDefault();
  acceptFile(event.dataTransfer?.files[0]);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && sequencePlayer.playing) sequencePlayer.stop();
  if ((event.target as HTMLElement).id === 'preview-page' && event.key === 'Enter') {
    event.preventDefault();
    navigatePreview(Number((event.target as HTMLInputElement).value));
    return;
  }
  if ((expanded || previewOpen) && event.key === 'Escape') {
    closePreview();
    event.preventDefault();
    return;
  }
  if ((expanded || previewOpen) && event.key === 'Tab') {
    const buttons = Array.from(
      root.querySelectorAll<HTMLElement>(
        '.preview-modal button:not(:disabled), .preview-modal input, .preview-modal a[href]',
      ),
    );
    const current = buttons.indexOf(document.activeElement as HTMLElement);
    buttons[(current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    event.preventDefault();
    return;
  }
  if (
    (expanded || previewOpen) &&
    (event.key === 'ArrowRight' || event.key === 'ArrowLeft') &&
    !(event.target as Element).matches('input')
  ) {
    event.preventDefault();
    navigatePreview((expanded ? pageNumber : outputPage) + (event.key === 'ArrowRight' ? 1 : -1));
    return;
  }
  if (
    expanded &&
    !busy &&
    !(event.target as Element).matches('input,textarea,select') &&
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 'z'
  ) {
    event.preventDefault();
    undoSelection();
    return;
  }
  if (
    busy ||
    !pages.length ||
    expanded ||
    previewOpen ||
    (event.target as Element).matches('input,textarea,select')
  )
    return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    undoSelection();
    return;
  }
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    setPage(pageNumber + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) sequencePlayer.stop();
});
render();
