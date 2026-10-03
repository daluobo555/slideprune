import type { Language } from './i18n';

const en = {
  notesTitle: 'My notes',
  sourcePage: 'Source page',
  notesPlaceholder: 'Capture the idea, a question, or the step you want to revisit…',
  notesHelp:
    'Notes on kept pages are included in Word and Markdown. PDF exports keep the original slides and any selected handwriting space.',
  excludedNoteHelp:
    'This page is excluded. Its note stays in your progress file, but is not included in study-note exports.',
  characters: 'characters',
  projectTitle: 'Your study progress',
  projectDescription:
    'Save a local JSON file with your selection, notes and settings. The PDF is not included; open the same PDF before restoring.',
  saveProject: 'Save progress',
  restoreProject: 'Restore progress',
  dirty: 'Changes not exported',
  inTab: 'Progress is in this tab',
  noteCount: 'pages with notes',
  savePending: 'Preparing your progress file…',
  saveSuccess: 'Download requested. Check that the progress file was saved.',
  saveError: 'The progress file could not be prepared. Your current progress is still here.',
  restorePending: 'Checking the progress file…',
  restoreSuccess: 'Selection, notes and settings restored.',
  restoreError: 'The progress file could not be restored. Your current progress is unchanged.',
  filePickLabel: 'Choose a SlidePrune progress file',
  restoreConfirmTitle: 'Restore this progress?',
  restoreConfirmMessage:
    'Restoring replaces your current selection, notes and export settings. Save your current progress first if you want to keep it.',
  restoreConfirmAction: 'Replace and restore',
  cancel: 'Cancel',
  unsavedReplaceTitle: 'Open another PDF?',
  unsavedReplaceMessage:
    'This tab has changes that have not been exported to a progress file. Opening another PDF replaces them. Save your progress first if you want to keep it.',
  unsavedReplaceAction: 'Open another PDF',
  unsavedClearTitle: 'Close this PDF?',
  unsavedClearMessage:
    'This tab has changes that have not been exported to a progress file. Closing this PDF clears them. Save your progress first if you want to keep it.',
  unsavedClearAction: 'Close and clear progress',
  noteCharLimit: 'Each page can contain up to 4,000 characters of notes.',
  noteTotalLimit: 'The total note limit has been reached. Shorten another note before adding more.',
};

const zh: typeof en = {
  notesTitle: '我的笔记',
  sourcePage: '原始页',
  notesPlaceholder: '写下这一页的要点、疑问，或想再推一遍的步骤…',
  notesHelp: '保留页的笔记会写入 Word 和 Markdown。PDF 仍导出原始课件，以及你选择的手写留白。',
  excludedNoteHelp: '此页已排除。笔记仍会留在进度文件中，但不会写入导出的复习笔记。',
  characters: '字符',
  projectTitle: '我的复习进度',
  projectDescription:
    '导出本地 JSON 文件，保存页面选择、笔记和设置，不含 PDF。恢复时请先打开同一份 PDF。',
  saveProject: '导出进度',
  restoreProject: '恢复进度',
  dirty: '有尚未导出的修改',
  inTab: '进度保存在当前标签页',
  noteCount: '页有笔记',
  savePending: '正在准备进度文件…',
  saveSuccess: '已发起下载，请确认进度文件已保存。',
  saveError: '暂时无法生成进度文件，当前进度仍在。',
  restorePending: '正在检查进度文件…',
  restoreSuccess: '已恢复页面选择、笔记和设置。',
  restoreError: '无法恢复此进度文件，当前进度未改变。',
  filePickLabel: '选择 SlidePrune 进度文件',
  restoreConfirmTitle: '恢复这份进度？',
  restoreConfirmMessage:
    '恢复会替换当前的页面选择、笔记和导出设置。如果需要保留当前进度，请先导出进度文件。',
  restoreConfirmAction: '替换并恢复',
  cancel: '取消',
  unsavedReplaceTitle: '打开另一份 PDF？',
  unsavedReplaceMessage:
    '当前标签页有尚未导出到进度文件的修改。打开另一份 PDF 会替换这些内容。如果需要保留，请先导出进度。',
  unsavedReplaceAction: '打开另一份 PDF',
  unsavedClearTitle: '关闭这份 PDF？',
  unsavedClearMessage:
    '当前标签页有尚未导出到进度文件的修改。关闭这份 PDF 会清空这些内容。如果需要保留，请先导出进度。',
  unsavedClearAction: '关闭并清空进度',
  noteCharLimit: '每页笔记最多可写 4,000 个字符。',
  noteTotalLimit: '笔记总字数已达上限，请先缩短其他笔记再继续添加。',
};

export const reviewMessages = (lang: Language) => (lang === 'zh' ? zh : en);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

const noteIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>';
const saveIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5"/></svg>';
const restoreIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M5 15v5h14v-5"/></svg>';

export function noteEditor({
  pageNumber,
  note,
  kept,
  lang,
  disabled,
}: {
  pageNumber: number;
  note: string;
  kept: boolean;
  lang: Language;
  disabled: boolean;
}): string {
  const t = reviewMessages(lang);
  const page = escapeHtml(String(pageNumber));
  return `<section class="page-notes" aria-labelledby="note-heading">
    <div class="note-heading"><h3 id="note-heading">${noteIcon}<label for="page-note">${t.notesTitle}</label></h3><span class="note-page">${t.sourcePage} <b>${page}</b></span></div>
    <textarea id="page-note" data-focus="page-note" data-note-page="${page}" maxlength="4000" rows="5" placeholder="${t.notesPlaceholder}" aria-describedby="note-help note-counter note-feedback${kept ? '' : ' note-excluded-help'}" ${disabled ? 'disabled' : ''}>${escapeHtml(note)}</textarea>
    <div class="note-meta"><span class="note-export-formats" aria-hidden="true">Word · Markdown</span><span id="note-counter">${note.length.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')} / 4,000 ${t.characters}</span></div>
    <p id="note-feedback" role="status" aria-live="polite"></p>
    <p id="note-help">${t.notesHelp}</p>
    ${kept ? '' : `<p id="note-excluded-help" class="note-excluded-help">${t.excludedNoteHelp}</p>`}
  </section>`;
}

export function projectToolbar({
  lang,
  disabled,
  dirty,
  noteCount,
}: {
  lang: Language;
  disabled: boolean;
  dirty: boolean;
  noteCount: number;
}): string {
  const t = reviewMessages(lang);
  return `<section class="project-toolbar" aria-labelledby="project-heading">
    <div class="project-intro"><span class="project-icon">${noteIcon}</span><div><div class="project-title-row"><h2 id="project-heading">${t.projectTitle}</h2><span id="project-note-count">${noteCount} ${t.noteCount}</span></div><p>${t.projectDescription}</p></div></div>
    <div class="project-controls"><div class="project-buttons"><button class="btn project-save" data-action="save-project" data-focus="save-project" ${disabled ? 'disabled' : ''}>${saveIcon}${t.saveProject}</button><button class="btn project-restore" data-action="restore-project" data-focus="restore-project" ${disabled ? 'disabled' : ''}>${restoreIcon}${t.restoreProject}</button></div><p id="project-status" role="status" aria-live="polite" data-dirty="${dirty}">${dirty ? t.dirty : t.inTab}</p></div>
  </section>`;
}
