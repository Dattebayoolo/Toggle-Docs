import { showToast } from './state.js';
import { toggleLanguage, toggleTheme } from './settings.js';
import { backupAllDocuments, createDocumentFromTemplate, duplicateCurrentDoc, exportDocument, handleFileImport, openRenameModal, openShortcutsModal, openVersionHistory, saveCurrentDoc, scheduleAutoSave, trashCurrentDoc } from './documents.js';
import { renderDocList, showDashboard, toggleStarDoc } from './dashboard.js';
import { Editor } from './editor.js';
import { state } from './state.js';

/* ==========================================================================
   Toggle Docs - Editor Page Event Wiring Module
   Editor header/sidebar events, menubar & dropdown actions, sidebar toggle
   and global keyboard shortcuts.
   ========================================================================== */
'use strict';

export function setupEditorEvents() {
  // Back to Dashboard buttons
  const backBtn = document.getElementById('btn-back-to-dash');
  const brandHome = document.getElementById('brand-home');
  if (backBtn) backBtn.addEventListener('click', () => showDashboard());
  if (brandHome) brandHome.addEventListener('click', e => { e.preventDefault(); showDashboard(); });

  // New Document button in editor drawer
  const btnNew = document.getElementById('btn-new');
  if (btnNew) {
    btnNew.addEventListener('click', () => createDocumentFromTemplate('blank'));
  }

  // Star button in editor header
  const btnStar = document.getElementById('btn-star');
  if (btnStar) {
    btnStar.addEventListener('click', () => {
      if (state.currentDoc) toggleStarDoc(state.currentDoc.id);
    });
  }

  // Title input auto-save
  const titleInput = document.getElementById('doc-title');
  if (titleInput) {
    titleInput.addEventListener('input', scheduleAutoSave);
  }

  // Editor content auto-save
  const editor = document.getElementById('editor');
  if (editor) {
    editor.addEventListener('input', scheduleAutoSave);
  }

  // Drawer Search input
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.searchQuery = searchInput.value.trim();
      renderDocList();
    });
  }

  // Drawer Navigation filter tabs
  document.querySelectorAll('.gdocs-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gdocs-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.getAttribute('data-filter') || 'docs';
      renderDocList();
    });
  });

  // Drawer Sidebar toggle
  const btnSidebar = document.getElementById('btn-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (btnSidebar) btnSidebar.addEventListener('click', () => toggleSidebar());
  if (overlay) overlay.addEventListener('click', () => toggleSidebar(false));

  // Theme toggle in editor
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) btnTheme.addEventListener('click', toggleTheme);

  // Language toggle in editor
  const btnLang = document.getElementById('btn-lang');
  if (btnLang) btnLang.addEventListener('click', toggleLanguage);

  // Version history button
  const btnHistory = document.getElementById('btn-history');
  if (btnHistory) btnHistory.addEventListener('click', openVersionHistory);

  // File import hidden input
  const fileInput = document.getElementById('file-import-input');
  if (fileInput) fileInput.addEventListener('change', handleFileImport);
}

export function toggleSidebar(forceState) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;

  const isCollapsed = sidebar.classList.contains('collapsed');
  const willCollapse = forceState !== undefined ? !forceState : !isCollapsed;

  sidebar.classList.toggle('collapsed', willCollapse);
  if (overlay) {
    overlay.classList.toggle('hidden', willCollapse || window.innerWidth > 900);
  }
}

/* ------------------------------------------------------------------------
   Google Docs Menubar & Dropdowns
   ------------------------------------------------------------------------ */
export function setupDropdowns() {
  document.addEventListener('click', e => {
    const menuBtn = e.target.closest('.gdocs-menu-btn, #btn-file');
    if (menuBtn) {
      const dd = menuBtn.closest('.dropdown');
      if (dd) {
        const wasOpen = dd.classList.contains('open');
        closeAllDropdowns();
        if (!wasOpen) dd.classList.add('open');
        return;
      }
    }

    const actionBtn = e.target.closest('.dropdown-menu button');
    if (actionBtn) {
      const action = actionBtn.getAttribute('data-action');
      if (action) handleMenuAction(action);
      closeAllDropdowns();
      return;
    }

    if (!e.target.closest('.dropdown')) {
      closeAllDropdowns();
    }

    const ctxMenu = document.getElementById('context-menu');
    if (ctxMenu && !e.target.closest('#context-menu') && !e.target.closest('.doc-item-more') && !e.target.closest('.dash-card-more')) {
      ctxMenu.classList.add('hidden');
    }
  });
}

export function closeAllDropdowns() {
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
}

export function handleMenuAction(action) {
  if (!action) return;

  switch (action) {
    case 'home':
      showDashboard();
      break;
    case 'new':
      createDocumentFromTemplate('blank');
      break;
    case 'open':
      document.getElementById('file-import-input').click();
      break;
    case 'duplicate':
      duplicateCurrentDoc();
      break;
    case 'export-html':
      exportDocument('html');
      break;
    case 'export-txt':
      exportDocument('txt');
      break;
    case 'backup':
      backupAllDocuments();
      break;
    case 'restore-backup':
      document.getElementById('file-import-input').click();
      break;
    case 'print':
      window.print();
      break;
    case 'rename':
      openRenameModal();
      break;
    case 'trash':
      trashCurrentDoc();
      break;
    case 'undo':
      Editor.executeCommand('undo');
      break;
    case 'redo':
      Editor.executeCommand('redo');
      break;
    case 'select-all':
      Editor.executeCommand('selectAll');
      break;
    case 'remove-format':
      Editor.executeCommand('removeFormat');
      break;
    case 'toggle-sidebar':
      toggleSidebar();
      break;
    case 'fullscreen':
      toggleFullscreen();
      break;
    case 'insert-link':
      document.getElementById('btn-link').click();
      break;
    case 'insert-hr':
      Editor.executeCommand('insertHorizontalRule');
      break;
    case 'dir-ltr':
      Editor.setParagraphDirection('ltr');
      break;
    case 'dir-rtl':
      Editor.setParagraphDirection('rtl');
      break;
    case 'word-count':
      Editor.updateStats();
      showToast(
        (document.getElementById('stat-words').textContent || '0') + ' words, ' +
        (document.getElementById('stat-chars').textContent || '0') + ' characters'
      );
      break;
    case 'open-urdu-kb':
      document.getElementById('btn-toggle-kb').click();
      break;
    case 'version-history':
      openVersionHistory();
      break;
    case 'shortcuts':
      openShortcutsModal();
      break;
    case 'about':
      showToast('Toggle Docs — Pakistan\'s Own Docs');
      break;
  }
}

/* ------------------------------------------------------------------------
   Keyboard Shortcuts
   ------------------------------------------------------------------------ */
export function setupShortcuts() {
  window.addEventListener('keydown', e => {
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveCurrentDoc(true);
    } else if (isCtrl && e.altKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      createDocumentFromTemplate('blank');
    } else if (e.altKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      showDashboard();
    } else if (isCtrl && e.key === '\\') {
      e.preventDefault();
      toggleSidebar();
    } else if (e.altKey && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      document.getElementById('btn-toggle-kb').click();
    } else if (isCtrl && e.shiftKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      Editor.setParagraphDirection('rtl');
    } else if (isCtrl && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      window.print();
    } else if (e.key === 'F2') {
      e.preventDefault();
      openRenameModal();
    }
  });
}

export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}
