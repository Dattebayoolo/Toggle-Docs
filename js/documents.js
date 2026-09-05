import { showToast, escapeHtml, ICONS } from './state.js';
import { state } from './state.js';
import { highlightActiveDocInList, renderDashboardDocs, renderDocList, showDashboard, showEditor, toggleStarDoc, updateDocCounts } from './dashboard.js';
import { DB } from './db.js';
import { I18N } from './urdu.js';
import { loadDocuments } from './app.js';
import { Editor } from './editor.js';

/* ==========================================================================
   Toggle Docs - Document Operations Module
   CRUD, save/auto-save, templates, import/export/backup, context menu and
   modals (rename / confirm / version history).
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------------
   Document Operations
   ------------------------------------------------------------------------ */
export function createDocObject(title, content) {
  const now = Date.now();
  return {
    id: 'doc_' + now + '_' + Math.random().toString(36).substr(2, 6),
    title: title || (I18N ? I18N.t('untitled', state.currentLang) : 'Untitled document'),
    content: content || '<p><br></p>',
    starred: false,
    trashed: false,
    createdAt: now,
    updatedAt: now
  };
}


export function openDocument(id) {
  const doc = state.allDocs.find(d => d.id === id);
  if (!doc) return;

  state.currentDoc = doc;

  const titleInput = document.getElementById('doc-title');
  const editor = document.getElementById('editor');
  const starBtn = document.getElementById('btn-star');

  if (titleInput) titleInput.value = doc.title;
  if (editor) {
    editor.innerHTML = doc.content || '<p><br></p>';
    Editor.updateStats();
  }

  if (starBtn) {
    updateStarButtonVisual(starBtn, !!doc.starred);
  }

  setSaveStatus('saved');
  highlightActiveDocInList(doc.id);
  document.dispatchEvent(new CustomEvent('td:doc-opened'));
}

export function updateStarButtonVisual(btn, isStarred) {
  btn.classList.toggle('starred', isStarred);
  const outline = btn.querySelector('.star-outline');
  const filled = btn.querySelector('.star-filled');
  if (outline && filled) {
    outline.classList.toggle('hidden', isStarred);
    filled.classList.toggle('hidden', !isStarred);
  }
}

export function scheduleAutoSave() {
  setSaveStatus('dirty');
  clearTimeout(state.autoSaveTimeout);
  state.autoSaveTimeout = setTimeout(saveCurrentDoc, 600);
}

export async function saveCurrentDoc(isSnapshot = false) {
  if (!state.currentDoc) return;

  const titleInput = document.getElementById('doc-title');
  const editor = document.getElementById('editor');

  const newTitle = (titleInput && titleInput.value.trim()) || I18N.t('untitled', state.currentLang);
  const newContent = editor ? editor.innerHTML : '';

  state.currentDoc.title = newTitle;
  state.currentDoc.content = newContent;
  state.currentDoc.updatedAt = Date.now();

  setSaveStatus('saving');

  try {
    await DB.putDocument(state.currentDoc);

    if (isSnapshot) {
      await DB.putVersion({
        id: 'ver_' + Date.now(),
        docId: state.currentDoc.id,
        title: state.currentDoc.title,
        content: state.currentDoc.content,
        timestamp: Date.now()
      });
      showToast(I18N.t('saveNowToast', state.currentLang));
    }

    setSaveStatus('saved');
    updateDocInLocalList(state.currentDoc);
  } catch (e) {
    console.error('Save failed:', e);
    setSaveStatus('dirty');
  }
}

export function setSaveStatus(state) {
  const statusEl = document.getElementById('save-status');
  const labelEl = document.getElementById('save-status-text');
  if (!statusEl) return;

  statusEl.classList.remove('saved', 'dirty', 'saving');
  statusEl.classList.add(state);

  if (labelEl) {
    if (state === 'saved') {
      labelEl.textContent = state.currentLang === 'ur' ? 'محفوظ ہے' : 'Saved to device';
    } else if (state === 'saving') {
      labelEl.textContent = state.currentLang === 'ur' ? 'محفوظ ہو رہا ہے…' : 'Saving…';
    } else {
      labelEl.textContent = state.currentLang === 'ur' ? 'تبدیلیاں باقی ہیں' : 'Saving…';
    }
  }
}

export function updateDocInLocalList(doc) {
  const idx = state.allDocs.findIndex(d => d.id === doc.id);
  if (idx >= 0) {
    state.allDocs[idx] = { ...doc };
  } else {
    state.allDocs.unshift({ ...doc });
  }
  updateDocCounts();
}

/* ------------------------------------------------------------------------
   Template Creation Handlers
   ------------------------------------------------------------------------ */
export async function createDocumentFromTemplate(type) {
  let title = 'Untitled document';
  let content = '<p><br></p>';

  if (type === 'blank') {
    title = I18N.t('untitled', state.currentLang);
    content = '<p><br></p>';
  } else if (type === 'urdu-letter') {
    title = 'رسمی خط (Urdu Letter)';
    content = `<div dir="rtl" style="font-family: 'Noto Nastaliq Urdu', serif; text-align: right;">
<h2>بخدمت جناب مینیجنگ ڈائریکٹر صاحب</h2>
<p>اسلام آباد، پاکستان</p>
<p><b>عنوان: درخواست برائے معلومات</b></p>
<p>جناب عالی،</p>
<p>مودبانہ گزارش ہے کہ میں آپ کی توجہ مندرجہ بالا عنوان کی طرف مبذول کرانا چاہتا ہوں۔ ادارہ ہذا میں خدمات کی فراہمی ہمارے لیے انتہائی قابل قدر ہے۔</p>
<p>امید ہے کہ آپ میری اس درخواست پر ہمدردانہ غور فرماتے ہوئے مطلوبہ تفصیلات سے آگاہ فرمائیں گے۔</p>
<br>
<p>العارض،<br><b>محمد علی</b><br>تاریخ: ۵ ستمبر ۲۰۲۶ء</p>
</div>`;
  } else if (type === 'resume') {
    title = 'Professional Resume';
    content = `<h1>KAZAM MAHMOOD</h1>
<p>Islamabad, Pakistan • email@example.com • +92 300 1234567</p>
<hr>
<h3>Professional Summary</h3>
<p>Dedicated software engineer and product designer with extensive experience building modern web architectures and local-first applications.</p>
<h3>Experience</h3>
<p><b>Senior Software Engineer</b> — Tech Solutions (2023 – Present)</p>
<ul>
<li>Architected high-performance web applications and responsive client suites.</li>
<li>Implemented end-to-end data layers utilizing IndexedDB and offline service workers.</li>
</ul>
<h3>Education</h3>
<p><b>Bachelor of Science in Computer Science</b> — National University (2019 – 2023)</p>`;
  } else if (type === 'proposal') {
    title = 'Project Proposal';
    content = `<h1>Project Proposal: Toggle Docs Initiative</h1>
<p><i>Prepared by: Engineering Team • Date: September 2026</i></p>
<hr>
<h3>1. Executive Summary</h3>
<p>Toggle Docs is Pakistan's premier local-first document suite, engineered to provide complete data sovereignty, zero cloud reliance, and native bilingual English/Urdu support.</p>
<h3>2. Key Deliverables</h3>
<ul>
<li>Google Docs-standard visual interface and editing tools.</li>
<li>Built-in Urdu virtual keyboard with full Nastaliq typography support.</li>
<li>PWA capabilities enabling seamless offline work.</li>
</ul>`;
  } else if (type === 'notes') {
    title = 'Meeting Notes';
    content = `<h1>Weekly Team Sync — Notes</h1>
<p><b>Date:</b> September 5, 2026 • <b>Attendees:</b> Product &amp; Engineering Leads</p>
<hr>
<h3>Agenda</h3>
<ol>
<li>Dashboard UX and template gallery rollout</li>
<li>Vector SVG iconography verification</li>
<li>Offline database synchronization</li>
</ol>
<h3>Decisions</h3>
<p>Adopted Google Docs-inspired home screen with template selection and recent documents feed.</p>
<h3>Action Items</h3>
<ul>
<li>[x] Replace all generic emojis with vector SVG icons</li>
<li>[ ] Prepare version 1.0 offline release</li>
</ul>`;
  }

  const doc = createDocObject(title, content);
  await DB.putDocument(doc);
  state.allDocs.unshift(doc);
  updateDocCounts();
  showEditor(doc.id);
}

/* ------------------------------------------------------------------------
   File Export & Backup Operations
   ------------------------------------------------------------------------ */
export function exportDocument(format) {
  if (!state.currentDoc) return;
  const title = state.currentDoc.title || 'document';

  if (format === 'html') {
    const fullHtml = `<!DOCTYPE html>
<html lang="${state.currentLang}" dir="${state.currentLang === 'ur' ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
[dir="rtl"] { font-family: 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif; text-align: right; }
</style>
</head>
<body>
${state.currentDoc.content || ''}
</body>
</html>`;
    downloadFile(fullHtml, title + '.html', 'text/html');
    showToast(I18N.t('exportedHtml', state.currentLang));
  } else if (format === 'txt') {
    const editor = document.getElementById('editor');
    const plainText = editor ? editor.innerText : '';
    downloadFile(plainText, title + '.txt', 'text/plain');
    showToast(I18N.t('exportedTxt', state.currentLang));
  }
}

export function backupAllDocuments() {
  const backupData = {
    app: 'Toggle Docs',
    version: 1,
    timestamp: Date.now(),
    documents: state.allDocs
  };
  downloadFile(JSON.stringify(backupData, null, 2), 'toggle-docs-backup.json', 'application/json');
  showToast(I18N.t('exportedJson', state.currentLang));
}

export function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type: type + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function handleFileImport(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (evt) {
    const text = evt.target.result;
    if (file.name.endsWith('.json')) {
      try {
        const data = JSON.parse(text);
        if (data.documents && Array.isArray(data.documents)) {
          for (const doc of data.documents) {
            await DB.putDocument(doc);
          }
          await loadDocuments();
          renderDashboardDocs();
          showToast(I18N.fmt(I18N.t('backupRestored', state.currentLang), { n: data.documents.length }));
          return;
        }
      } catch (err) {}
    }

    const importedTitle = file.name.replace(/\.[^/.]+$/, '');
    const importedContent = file.name.endsWith('.txt') ? '<p>' + escapeHtml(text).replace(/\n/g, '<br>') + '</p>' : text;
    const newDoc = createDocObject(importedTitle, importedContent);
    await DB.putDocument(newDoc);
    state.allDocs.unshift(newDoc);
    updateDocCounts();
    showEditor(newDoc.id);
    showToast(I18N.fmt(I18N.t('imported', state.currentLang), { title: importedTitle }));
  };

  reader.readAsText(file);
  e.target.value = '';
}

export async function duplicateCurrentDoc() {
  if (!state.currentDoc) return;
  const copyTitle = state.currentDoc.title + ' (Copy)';
  const copyDoc = createDocObject(copyTitle, state.currentDoc.content);
  await DB.putDocument(copyDoc);
  state.allDocs.unshift(copyDoc);
  updateDocCounts();
  openDocument(copyDoc.id);
  showToast(I18N.t('copiedDoc', state.currentLang));
}

export async function trashCurrentDoc() {
  if (!state.currentDoc) return;
  state.currentDoc.trashed = true;
  state.currentDoc.updatedAt = Date.now();
  await DB.putDocument(state.currentDoc);
  updateDocCounts();
  showToast(I18N.t('trashed', state.currentLang));
  showDashboard();
}

/* ------------------------------------------------------------------------
   Context Menu for Document Items
   ------------------------------------------------------------------------ */
export function openContextMenu(e, docId) {
  const menu = document.getElementById('context-menu');
  const doc = state.allDocs.find(d => d.id === docId);
  if (!menu || !doc) return;

  menu.classList.remove('hidden');

  const x = Math.min(e.clientX, window.innerWidth - 200);
  const y = Math.min(e.clientY, window.innerHeight - 200);
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const starBtn = document.getElementById('ctx-star');
  const trashBtn = document.getElementById('ctx-trash');
  const restoreBtn = document.getElementById('ctx-restore');
  const delForeverBtn = document.getElementById('ctx-delete-forever');

  if (starBtn) {
    starBtn.classList.toggle('hidden', !!doc.trashed);
    starBtn.textContent = doc.starred ? I18N.t('unstar', state.currentLang) : I18N.t('star', state.currentLang);
  }
  if (trashBtn) trashBtn.classList.toggle('hidden', !!doc.trashed);
  if (restoreBtn) restoreBtn.classList.toggle('hidden', !doc.trashed);
  if (delForeverBtn) delForeverBtn.classList.toggle('hidden', !doc.trashed);

  menu.querySelectorAll('button[data-ctx]').forEach(btn => {
    btn.onclick = async () => {
      const action = btn.getAttribute('data-ctx');
      menu.classList.add('hidden');
      if (action === 'open') {
        showEditor(doc.id);
      } else if (action === 'duplicate') {
        const copyDoc = createDocObject(doc.title + ' (Copy)', doc.content);
        await DB.putDocument(copyDoc);
        state.allDocs.unshift(copyDoc);
        updateDocCounts();
        renderDashboardDocs();
        showToast(I18N.t('copiedDoc', state.currentLang));
      } else if (action === 'rename') {
        openRenameModal(doc.id);
      } else if (action === 'star') {
        toggleStarDoc(doc.id);
      } else if (action === 'trash') {
        doc.trashed = true;
        doc.updatedAt = Date.now();
        await DB.putDocument(doc);
        updateDocCounts();
        renderDashboardDocs();
        renderDocList();
        showToast(I18N.t('trashed', state.currentLang));
      } else if (action === 'restore') {
        doc.trashed = false;
        doc.updatedAt = Date.now();
        await DB.putDocument(doc);
        updateDocCounts();
        renderDashboardDocs();
        renderDocList();
        showToast(I18N.t('restored', state.currentLang));
      } else if (action === 'delete-forever') {
        confirmAction(
          I18N.t('confirmDeleteForeverTitle', state.currentLang),
          I18N.fmt(I18N.t('confirmDeleteForeverMsg', state.currentLang), { title: doc.title }),
          async () => {
            await DB.deleteDocument(doc.id);
            state.allDocs = state.allDocs.filter(d => d.id !== doc.id);
            updateDocCounts();
            renderDashboardDocs();
            renderDocList();
            showToast(I18N.t('deletedForever', state.currentLang));
          }
        );
      }
    };
  });
}

/* ------------------------------------------------------------------------
   Modals Management
   ------------------------------------------------------------------------ */
export function setupModals() {
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      if (modal) modal.classList.add('hidden');
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) {
        backdrop.classList.add('hidden');
      }
    });
  });
}

export function openRenameModal(docId) {
  const modal = document.getElementById('modal-rename');
  const input = document.getElementById('rename-input');
  const saveBtn = document.getElementById('btn-rename-save');
  const targetDoc = docId ? state.allDocs.find(d => d.id === docId) : state.currentDoc;
  if (!modal || !targetDoc) return;

  input.value = targetDoc.title || '';
  modal.classList.remove('hidden');
  input.focus();
  input.select();

  saveBtn.onclick = async () => {
    const newTitle = input.value.trim() || I18N.t('untitled', state.currentLang);
    targetDoc.title = newTitle;
    targetDoc.updatedAt = Date.now();
    await DB.putDocument(targetDoc);
    if (state.currentDoc && state.currentDoc.id === targetDoc.id) {
      document.getElementById('doc-title').value = newTitle;
    }
    renderDashboardDocs();
    renderDocList();
    modal.classList.add('hidden');
  };
}

export function confirmAction(title, msg, onConfirm) {
  const modal = document.getElementById('modal-confirm');
  const titleEl = document.getElementById('modal-confirm-title');
  const msgEl = document.getElementById('modal-confirm-msg');
  const okBtn = document.getElementById('btn-confirm-ok');
  if (!modal) return;

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = msg;

  modal.classList.remove('hidden');

  okBtn.onclick = () => {
    modal.classList.add('hidden');
    if (onConfirm) onConfirm();
  };
}

export async function openVersionHistory() {
  if (!state.currentDoc) return;
  const modal = document.getElementById('modal-history');
  const listEl = document.getElementById('history-list');
  const emptyEl = document.getElementById('history-empty');
  if (!modal || !listEl) return;

  listEl.innerHTML = '';
  const versions = (await DB.getVersions(state.currentDoc.id)) || [];
  versions.sort((a, b) => b.timestamp - a.timestamp);

  if (versions.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
  } else {
    if (emptyEl) emptyEl.classList.add('hidden');
    versions.forEach(ver => {
      const item = document.createElement('li');
      item.className = 'history-item';

      const meta = document.createElement('div');
      meta.className = 'history-meta';

      const time = document.createElement('div');
      time.className = 'history-time';
      time.textContent = new Date(ver.timestamp).toLocaleString();

      const info = document.createElement('div');
      info.className = 'history-info';
      const kbSize = (ver.content ? (ver.content.length / 1024).toFixed(1) : '0.1');
      info.textContent = I18N.fmt(I18N.t('historySize', state.currentLang), { kb: kbSize });

      meta.appendChild(time);
      meta.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'history-actions';

      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'btn ghost';
      restoreBtn.textContent = I18N.t('historyRestore', state.currentLang);
      restoreBtn.addEventListener('click', async () => {
        confirmAction(
          I18N.t('historyTitle', state.currentLang),
          I18N.t('restoreVersionMsg', state.currentLang),
          async () => {
            state.currentDoc.content = ver.content;
            state.currentDoc.updatedAt = Date.now();
            await DB.putDocument(state.currentDoc);
            const editor = document.getElementById('editor');
            if (editor) editor.innerHTML = ver.content;
            Editor.updateStats();
            modal.classList.add('hidden');
            showToast(I18N.t('restored', state.currentLang));
          }
        );
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn danger-ghost';
      delBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      delBtn.title = I18N.t('historyRemove', state.currentLang);
      delBtn.addEventListener('click', async () => {
        await DB.deleteVersion(ver.id);
        openVersionHistory();
      });

      actions.appendChild(restoreBtn);
      actions.appendChild(delBtn);

      item.appendChild(meta);
      item.appendChild(actions);
      listEl.appendChild(item);
    });
  }

  modal.classList.remove('hidden');
}

export function openShortcutsModal() {
  const modal = document.getElementById('modal-shortcuts');
  if (modal) modal.classList.remove('hidden');
}
