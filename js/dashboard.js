import { showToast, escapeHtml, ICONS } from './state.js';
import { toggleSidebar } from './editor-events.js';
import { toggleLanguage, toggleTheme, openSettingsModal } from './settings.js';
import { DB } from './db.js';
import { backupAllDocuments, createDocumentFromTemplate, createDocObject, openContextMenu, openDocument, saveCurrentDoc, updateStarButtonVisual } from './documents.js';
import { I18N } from './urdu.js';
import { state } from './state.js';
import { Editor } from './editor.js';
import { openCommandPalette } from './command-palette.js';

/* ==========================================================================
   Toggle Docs - Dashboard & View Switching Module
   Dashboard <-> Editor view switching, dashboard grid/list rendering, doc
   counts, starring, dashboard event wiring and navigation drawer.
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------------
   View Switching (Dashboard <--> Editor)
   ------------------------------------------------------------------------ */
export function showDashboard() {
  const viewDash = document.getElementById('view-dashboard');
  const viewEdit = document.getElementById('view-editor');
  if (!viewDash || !viewEdit) return;

  // Save current document if editing
  if (state.currentDoc) {
    saveCurrentDoc();
  }

  viewDash.classList.remove('hidden');
  viewEdit.classList.add('hidden');

  renderDashboardDocs();
  renderDocList();
  updateDocCounts();
}

export function showEditor(docId) {
  const viewDash = document.getElementById('view-dashboard');
  const viewEdit = document.getElementById('view-editor');
  if (!viewDash || !viewEdit) return;

  viewDash.classList.add('hidden');
  viewEdit.classList.remove('hidden');

  if (docId) {
    openDocument(docId);
  }

  const editor = document.getElementById('editor');
  if (editor) {
    editor.focus();
  }
}

/* ------------------------------------------------------------------------
   Google Docs Dashboard Rendering (Recent Documents Grid & List)
   ------------------------------------------------------------------------ */
export function renderDashboardDocs() {
  const grid = document.getElementById('dash-docs-grid');
  const emptyState = document.getElementById('dash-empty-state');
  if (!grid) return;

  grid.innerHTML = '';

  let filtered = state.allDocs.filter(d => {
    if (state.currentFilter === 'trash') return d.trashed;
    if (d.trashed) return false;
    if (state.currentFilter === 'starred') return d.starred;
    return true;
  });

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(d =>
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.content && d.content.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (filtered.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  filtered.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'dash-doc-card';
    card.setAttribute('data-id', doc.id);

    // Thumbnail Area
    const thumb = document.createElement('div');
    thumb.className = 'dash-card-thumb';
    const miniPaper = document.createElement('div');
    miniPaper.className = 'mini-paper-sheet';

    // Parse plain text snippet for preview
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = doc.content || '';
    const textPreview = tempDiv.innerText.slice(0, 120);

    const snippet = document.createElement('p');
    snippet.style.fontSize = '9px';
    snippet.style.lineHeight = '1.4';
    snippet.style.color = 'var(--outline)';
    snippet.style.overflow = 'hidden';
    snippet.textContent = textPreview || 'Empty document';
    miniPaper.appendChild(snippet);
    thumb.appendChild(miniPaper);

    // Info Bar
    const info = document.createElement('div');
    info.className = 'dash-card-info';

    const left = document.createElement('div');
    left.className = 'dash-card-left';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'dash-doc-icon-svg';
    iconWrap.innerHTML = ICONS.doc;

    const textWrap = document.createElement('div');
    textWrap.className = 'dash-card-text';

    const title = document.createElement('span');
    title.className = 'dash-card-title';
    title.textContent = doc.title || I18N.t('untitled', state.currentLang);

    const meta = document.createElement('span');
    meta.className = 'dash-card-meta';
    meta.textContent = formatTimestamp(doc.updatedAt || doc.createdAt);

    textWrap.appendChild(title);
    textWrap.appendChild(meta);
    left.appendChild(iconWrap);
    left.appendChild(textWrap);

    const moreBtn = document.createElement('button');
    moreBtn.className = 'dash-card-more';
    moreBtn.innerHTML = ICONS.more;
    moreBtn.title = 'More options';
    moreBtn.addEventListener('click', e => {
      e.stopPropagation();
      openContextMenu(e, doc.id);
    });

    info.appendChild(left);
    info.appendChild(moreBtn);

    card.appendChild(thumb);
    card.appendChild(info);

    card.addEventListener('click', () => {
      showEditor(doc.id);
    });

    grid.appendChild(card);
  });
}

/* ------------------------------------------------------------------------
   Sidebar Document List Rendering (In-Editor Drawer)
   ------------------------------------------------------------------------ */
export function renderDocList() {
  const listEl = document.getElementById('doc-list');
  const emptyState = document.getElementById('sidebar-empty-state');
  const emptyTrashBtn = document.getElementById('btn-empty-trash');
  if (!listEl) return;

  listEl.innerHTML = '';

  let filtered = state.allDocs.filter(d => {
    if (state.currentFilter === 'trash') return d.trashed;
    if (d.trashed) return false;
    if (state.currentFilter === 'starred') return d.starred;
    return true;
  });

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(d =>
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.content && d.content.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (emptyTrashBtn) {
    emptyTrashBtn.classList.toggle('hidden', state.currentFilter !== 'trash' || filtered.length === 0);
  }

  if (filtered.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  filtered.forEach(doc => {
    const li = document.createElement('li');
    li.className = 'doc-item' + (state.currentDoc && state.currentDoc.id === doc.id ? ' active' : '');
    li.setAttribute('data-id', doc.id);

    const main = document.createElement('div');
    main.className = 'doc-item-main';

    const title = document.createElement('div');
    title.className = 'doc-item-title';
    title.textContent = doc.title || I18N.t('untitled', state.currentLang);

    const meta = document.createElement('div');
    meta.className = 'doc-item-meta';
    meta.textContent = formatTimestamp(doc.updatedAt || doc.createdAt);

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'doc-item-actions';

    if (!doc.trashed) {
      const star = document.createElement('button');
      star.className = 'doc-item-star' + (doc.starred ? ' starred' : '');
      star.innerHTML = doc.starred ? ICONS.starFilled : ICONS.starOutline;
      star.title = doc.starred ? 'Unstar' : 'Star';
      star.addEventListener('click', e => {
        e.stopPropagation();
        toggleStarDoc(doc.id);
      });
      actions.appendChild(star);
    }

    const more = document.createElement('button');
    more.className = 'doc-item-more';
    more.innerHTML = ICONS.more;
    more.title = 'More options';
    more.addEventListener('click', e => {
      e.stopPropagation();
      openContextMenu(e, doc.id);
    });
    actions.appendChild(more);

    li.appendChild(main);
    li.appendChild(actions);

    li.addEventListener('click', () => {
      openDocument(doc.id);
      if (window.innerWidth <= 900) {
        toggleSidebar(false);
      }
    });

    listEl.appendChild(li);
  });
}

export function highlightActiveDocInList(id) {
  document.querySelectorAll('.doc-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-id') === id);
  });
}

export function updateDocCounts() {
  const docsCount = state.allDocs.filter(d => !d.trashed).length;
  const starredCount = state.allDocs.filter(d => !d.trashed && d.starred).length;
  const trashCount = state.allDocs.filter(d => d.trashed).length;

  const elDocs = document.getElementById('count-docs');
  const elStarred = document.getElementById('count-starred');
  const elTrash = document.getElementById('count-trash');

  if (elDocs) elDocs.textContent = docsCount;
  if (elStarred) elStarred.textContent = starredCount;
  if (elTrash) elTrash.textContent = trashCount;

  const drawerDocs = document.getElementById('drawer-count-docs');
  const drawerStarred = document.getElementById('drawer-count-starred');
  const drawerTrash = document.getElementById('drawer-count-trash');

  if (drawerDocs) drawerDocs.textContent = docsCount;
  if (drawerStarred) drawerStarred.textContent = starredCount;
  if (drawerTrash) drawerTrash.textContent = trashCount;
}

export function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return (state.currentLang === 'ur' ? 'کھولا گیا ' : 'Opened ') + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return (state.currentLang === 'ur' ? 'کھولا گیا ' : 'Opened ') + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export async function toggleStarDoc(id) {
  const doc = state.allDocs.find(d => d.id === id);
  if (!doc) return;
  doc.starred = !doc.starred;
  doc.updatedAt = Date.now();
  await DB.putDocument(doc);
  if (state.currentDoc && state.currentDoc.id === doc.id) {
    const starBtn = document.getElementById('btn-star');
    if (starBtn) updateStarButtonVisual(starBtn, doc.starred);
  }
  renderDashboardDocs();
  renderDocList();
  updateDocCounts();
  showToast(doc.starred ? I18N.t('starredToast', state.currentLang) : I18N.t('unstarredToast', state.currentLang));
}

/* ------------------------------------------------------------------------
   Event Listeners Setup
   ------------------------------------------------------------------------ */
export function setupDashboardEvents() {
  // Dashboard Template Cards
  const tplBlank = document.getElementById('tpl-blank');
  const tplUrdu = document.getElementById('tpl-urdu-letter');
  const tplResume = document.getElementById('tpl-resume');
  const tplProposal = document.getElementById('tpl-proposal');
  const tplNotes = document.getElementById('tpl-notes');

  if (tplBlank) tplBlank.addEventListener('click', () => createDocumentFromTemplate('blank'));
  if (tplUrdu) tplUrdu.addEventListener('click', () => createDocumentFromTemplate('urdu-letter'));
  if (tplResume) tplResume.addEventListener('click', () => createDocumentFromTemplate('resume'));
  if (tplProposal) tplProposal.addEventListener('click', () => createDocumentFromTemplate('proposal'));
  if (tplNotes) tplNotes.addEventListener('click', () => createDocumentFromTemplate('notes'));

  // Dashboard FAB (+)
  const fabNew = document.getElementById('dash-fab-new');
  if (fabNew) fabNew.addEventListener('click', () => createDocumentFromTemplate('blank'));

  // Dashboard Search Box
  const dashSearch = document.getElementById('dash-search-input');
  const dashClear = document.getElementById('dash-search-clear');
  if (dashSearch) {
    dashSearch.addEventListener('input', () => {
      state.searchQuery = dashSearch.value.trim();
      if (dashClear) dashClear.classList.toggle('hidden', !state.searchQuery);
      renderDashboardDocs();
    });
  }
  if (dashClear) {
    dashClear.addEventListener('click', () => {
      if (dashSearch) dashSearch.value = '';
      state.searchQuery = '';
      dashClear.classList.add('hidden');
      renderDashboardDocs();
    });
  }

  // Dashboard Filter Tabs (All, Starred, Trash)
  document.querySelectorAll('.dash-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentFilter = tab.getAttribute('data-filter') || 'docs';
      renderDashboardDocs();
    });
  });

  // Dashboard View Mode Toggle (Grid vs List)
  const viewModeBtn = document.getElementById('dash-btn-viewmode');
  if (viewModeBtn) {
    viewModeBtn.addEventListener('click', () => {
      state.isListView = !state.isListView;
      const grid = document.getElementById('dash-docs-grid');
      if (grid) grid.classList.toggle('list-view', state.isListView);
      if (state.isListView) {
        viewModeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
        viewModeBtn.title = 'Grid view';
        viewModeBtn.setAttribute('aria-label', 'Grid view');
      } else {
        viewModeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';
        viewModeBtn.title = 'List view';
        viewModeBtn.setAttribute('aria-label', 'List view');
      }
    });
  }

  // Language Toggle on Dashboard
  const dashLangBtn = document.getElementById('dash-btn-lang');
  if (dashLangBtn) dashLangBtn.addEventListener('click', toggleLanguage);

  // Theme Toggle on Dashboard
  const dashThemeBtn = document.getElementById('dash-btn-theme');
  if (dashThemeBtn) dashThemeBtn.addEventListener('click', toggleTheme);

  // Dashboard Hamburger Menu Button & Navigation Drawer
  const dashBtnMenu = document.getElementById('dash-btn-menu');
  const dashDrawerClose = document.getElementById('dash-drawer-close');
  const dashDrawerOverlay = document.getElementById('dash-drawer-overlay');

  if (dashBtnMenu) dashBtnMenu.addEventListener('click', () => toggleDashboardDrawer(true));
  if (dashDrawerClose) dashDrawerClose.addEventListener('click', () => toggleDashboardDrawer(false));
  if (dashDrawerOverlay) dashDrawerOverlay.addEventListener('click', () => toggleDashboardDrawer(false));

  // Dashboard Drawer Filter Items (All, Starred, Trash)
  document.querySelectorAll('.dash-drawer-item[data-filter]').forEach(item => {
    item.addEventListener('click', () => {
      const filter = item.getAttribute('data-filter') || 'docs';
      state.currentFilter = filter;
      document.querySelectorAll('.dash-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-filter') === filter);
      });
      document.querySelectorAll('.dash-drawer-item[data-filter]').forEach(i => {
        i.classList.toggle('active', i.getAttribute('data-filter') === filter);
      });
      renderDashboardDocs();
      toggleDashboardDrawer(false);
    });
  });

  // Drawer Keyboard Shortcuts Action
  const drawerShortcuts = document.getElementById('dash-drawer-shortcuts');
  if (drawerShortcuts) {
    drawerShortcuts.addEventListener('click', () => {
      toggleDashboardDrawer(false);
      const modal = document.getElementById('modal-shortcuts');
      if (modal) modal.classList.remove('hidden');
    });
  }

  // Drawer Backup Action
  const drawerBackup = document.getElementById('dash-drawer-backup');
  if (drawerBackup) {
    drawerBackup.addEventListener('click', () => {
      toggleDashboardDrawer(false);
      backupAllDocuments();
    });
  }

  // Drawer Restore Action
  const drawerRestore = document.getElementById('dash-drawer-restore');
  if (drawerRestore) {
    drawerRestore.addEventListener('click', () => {
      toggleDashboardDrawer(false);
      const fileInput = document.getElementById('file-import-input');
      if (fileInput) fileInput.click();
    });
  }

  // Drawer Settings Action
  const drawerSettings = document.getElementById('dash-drawer-settings');
  if (drawerSettings) {
    drawerSettings.addEventListener('click', () => {
      toggleDashboardDrawer(false);
      openSettingsModal();
    });
  }

  // Dashboard Command Palette Trigger (Search Pill)
  const dashPaletteTrigger = document.getElementById('dash-search-shortcut-pill');
  if (dashPaletteTrigger) {
    dashPaletteTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openCommandPalette();
    });
  }

  // Setup Quick Notes Scratchpad
  setupScratchpad();

  // Escape key closes drawer
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      toggleDashboardDrawer(false);
    }
  });
}

export function setupScratchpad() {
  const pad = document.getElementById('dash-scratchpad-input');
  const btnSaveAsDoc = document.getElementById('btn-scratchpad-save-doc');
  const btnClear = document.getElementById('btn-scratchpad-clear');
  const btnCopy = document.getElementById('btn-scratchpad-copy');
  const scratchpadStorage = getScratchpadStorage();

  if (pad) {
    pad.value = scratchpadStorage ? (scratchpadStorage.getItem('toggle-docs-scratchpad') || '') : '';
    pad.addEventListener('input', () => {
      if (scratchpadStorage) {
        scratchpadStorage.setItem('toggle-docs-scratchpad', pad.value);
      }
    });
  }

  if (btnSaveAsDoc && pad) {
    btnSaveAsDoc.addEventListener('click', async () => {
      const text = pad.value.trim();
      if (!text) {
        showToast('Scratchpad is empty');
        return;
      }
      const lines = text.split('\n');
      const title = lines[0].substring(0, 40) || 'Quick Note';
      const content = `<p>${lines.map(l => escapeHtml(l)).join('</p><p>')}</p>`;
      const doc = createDocObject(title, content);
      await DB.putDocument(doc);
      state.allDocs.unshift(doc);
      showToast('Saved as document!');
      showEditor(doc.id);
    });
  }

  if (btnClear && pad) {
    btnClear.addEventListener('click', () => {
      pad.value = '';
      if (scratchpadStorage) {
        scratchpadStorage.removeItem('toggle-docs-scratchpad');
      }
      showToast('Scratchpad cleared');
    });
  }

  if (btnCopy && pad) {
    btnCopy.addEventListener('click', () => {
      if (!pad.value) return;
      navigator.clipboard.writeText(pad.value).then(() => {
        showToast('Copied to clipboard');
      });
    });
  }
}

function getScratchpadStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch (e) {
    return null;
  }
}

export function toggleDashboardDrawer(forceOpen) {
  const drawer = document.getElementById('dash-drawer');
  const overlay = document.getElementById('dash-drawer-overlay');
  if (!drawer) return;

  const isOpen = drawer.classList.contains('open');
  const willOpen = forceOpen !== undefined ? forceOpen : !isOpen;

  drawer.classList.toggle('open', willOpen);
  if (overlay) {
    overlay.classList.toggle('hidden', !willOpen);
  }
}
