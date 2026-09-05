/* ==========================================================================
   Toggle Docs — Command Palette Module (ES module)
   Universal Spotlight / Raycast style quick launcher for all actions.
   Accessible via Ctrl+K / Cmd+K from any view (Dashboard or Editor).
   ========================================================================== */
'use strict';

import { state, showToast } from './state.js';
import { handleMenuAction, toggleSidebar } from './editor-events.js';
import { showDashboard, showEditor } from './dashboard.js';
import { createDocumentFromTemplate, saveCurrentDoc } from './documents.js';
import { toggleTheme, toggleLanguage, openSettingsModal } from './settings.js';
import { openFindReplace } from './find-replace.js';
import { openTableModal } from './tables.js';

let paletteEl = null;
let inputEl = null;
let listEl = null;
let selectedIndex = 0;
let filteredActions = [];

const PALETTE_ACTIONS = [
  {
    id: 'new-doc',
    title: 'New document',
    category: 'Document',
    shortcut: 'Ctrl+Alt+N',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    run: () => createDocumentFromTemplate('blank')
  },
  {
    id: 'find-replace',
    title: 'Find and replace',
    category: 'Edit',
    shortcut: 'Ctrl+H',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    run: () => openFindReplace()
  },
  {
    id: 'insert-table',
    title: 'Insert table',
    category: 'Insert',
    shortcut: 'Alt+T',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    run: () => openTableModal()
  },
  {
    id: 'insert-image',
    title: 'Insert image',
    category: 'Insert',
    shortcut: '',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    run: () => {
      const modal = document.getElementById('modal-image');
      if (modal) modal.classList.remove('hidden');
    }
  },
  {
    id: 'toggle-urdu-kb',
    title: 'Toggle Urdu keyboard',
    category: 'Urdu',
    shortcut: 'Alt+U',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="16"/><line x1="10" y1="8" x2="10" y2="16"/><line x1="14" y1="8" x2="14" y2="16"/><line x1="18" y1="8" x2="18" y2="16"/></svg>',
    run: () => {
      const btn = document.getElementById('btn-toggle-kb');
      if (btn) btn.click();
    }
  },
  {
    id: 'dir-rtl',
    title: 'Set paragraph direction: RTL (Urdu)',
    category: 'Format',
    shortcut: 'Ctrl+Shift+R',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',
    run: () => handleMenuAction('dir-rtl')
  },
  {
    id: 'dir-ltr',
    title: 'Set paragraph direction: LTR (English)',
    category: 'Format',
    shortcut: '',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>',
    run: () => handleMenuAction('dir-ltr')
  },
  {
    id: 'save-doc',
    title: 'Save snapshot to version history',
    category: 'Document',
    shortcut: 'Ctrl+S',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
    run: () => saveCurrentDoc(true)
  },
  {
    id: 'export-pdf',
    title: 'Print / Export as PDF',
    category: 'Export',
    shortcut: 'Ctrl+P',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    run: () => window.print()
  },
  {
    id: 'export-html',
    title: 'Download as HTML document',
    category: 'Export',
    shortcut: '',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    run: () => handleMenuAction('export-html')
  },
  {
    id: 'export-txt',
    title: 'Download as Plain Text (.txt)',
    category: 'Export',
    shortcut: '',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    run: () => handleMenuAction('export-txt')
  },
  {
    id: 'backup-json',
    title: 'Backup all documents (JSON)',
    category: 'Data',
    shortcut: '',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    run: () => handleMenuAction('backup')
  },
  {
    id: 'restore-json',
    title: 'Restore backup from JSON file',
    category: 'Data',
    shortcut: '',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    run: () => handleMenuAction('restore-backup')
  },
  {
    id: 'word-count',
    title: 'Word count & document stats',
    category: 'Tools',
    shortcut: 'Ctrl+Shift+C',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    run: () => handleMenuAction('word-count')
  },
  {
    id: 'settings-modal',
    title: 'Settings & storage manager',
    category: 'Preferences',
    shortcut: 'Alt+S',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    run: () => openSettingsModal()
  },
  {
    id: 'toggle-theme',
    title: 'Toggle dark / light theme',
    category: 'Appearance',
    shortcut: '',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    run: () => toggleTheme()
  },
  {
    id: 'toggle-lang',
    title: 'Toggle UI language (English / اردو)',
    category: 'Appearance',
    shortcut: '',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    run: () => toggleLanguage()
  },
  {
    id: 'goto-dashboard',
    title: 'Go to Docs home dashboard',
    category: 'Navigation',
    shortcut: 'Alt+H',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    run: () => showDashboard()
  },
  {
    id: 'clear-formatting',
    title: 'Clear formatting',
    category: 'Format',
    shortcut: 'Ctrl+\\',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    run: () => handleMenuAction('remove-format')
  },
  {
    id: 'shortcuts-modal',
    title: 'View all keyboard shortcuts',
    category: 'Help',
    shortcut: 'Ctrl+/',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="10.01" y2="8"/><line x1="14" y1="8" x2="14.01" y2="8"/><line x1="18" y1="8" x2="18.01" y2="8"/></svg>',
    run: () => handleMenuAction('shortcuts')
  }
];

export function initCommandPalette() {
  paletteEl = document.getElementById('modal-command-palette');
  inputEl = document.getElementById('palette-input');
  listEl = document.getElementById('palette-list');

  if (!paletteEl || !inputEl || !listEl) return;

  inputEl.addEventListener('input', () => {
    filterActions(inputEl.value.trim());
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredActions.length > 0) {
        selectedIndex = (selectedIndex + 1) % filteredActions.length;
        renderList();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredActions.length > 0) {
        selectedIndex = (selectedIndex - 1 + filteredActions.length) % filteredActions.length;
        renderList();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeSelected();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandPalette();
    }
  });

  paletteEl.addEventListener('click', (e) => {
    if (e.target === paletteEl || e.target.classList.contains('palette-backdrop')) {
      closeCommandPalette();
    }
  });
}

export function openCommandPalette() {
  if (!paletteEl) initCommandPalette();
  if (!paletteEl) return;

  paletteEl.classList.remove('hidden');
  inputEl.value = '';
  filterActions('');
  setTimeout(() => inputEl.focus(), 30);
}

export function closeCommandPalette() {
  if (paletteEl) paletteEl.classList.add('hidden');
}

function filterActions(query) {
  selectedIndex = 0;
  if (!query) {
    filteredActions = [...PALETTE_ACTIONS];
  } else {
    const q = query.toLowerCase();
    filteredActions = PALETTE_ACTIONS.filter(act => 
      act.title.toLowerCase().includes(q) || 
      act.category.toLowerCase().includes(q) ||
      (act.shortcut && act.shortcut.toLowerCase().includes(q))
    );
  }
  renderList();
}

function renderList() {
  if (!listEl) return;
  listEl.innerHTML = '';

  if (filteredActions.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'palette-empty';
    empty.textContent = 'No matching commands found.';
    listEl.appendChild(empty);
    return;
  }

  filteredActions.forEach((act, idx) => {
    const item = document.createElement('button');
    item.className = 'palette-item' + (idx === selectedIndex ? ' active' : '');
    item.setAttribute('type', 'button');
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', idx === selectedIndex ? 'true' : 'false');

    item.innerHTML = `
      <span class="palette-icon">${act.icon}</span>
      <span class="palette-title">${act.title}</span>
      <span class="palette-category">${act.category}</span>
      ${act.shortcut ? `<span class="palette-shortcut">${act.shortcut}</span>` : ''}
    `;

    item.addEventListener('click', () => {
      selectedIndex = idx;
      executeSelected();
    });

    item.addEventListener('mouseenter', () => {
      selectedIndex = idx;
      updateActiveVisual();
    });

    listEl.appendChild(item);
  });

  scrollSelectedIntoView();
}

function updateActiveVisual() {
  const items = listEl.querySelectorAll('.palette-item');
  items.forEach((item, idx) => {
    item.classList.toggle('active', idx === selectedIndex);
    item.setAttribute('aria-selected', idx === selectedIndex ? 'true' : 'false');
  });
}

function scrollSelectedIntoView() {
  const active = listEl.querySelector('.palette-item.active');
  if (active) {
    active.scrollIntoView({ block: 'nearest' });
  }
}

function executeSelected() {
  if (filteredActions.length > 0 && filteredActions[selectedIndex]) {
    const action = filteredActions[selectedIndex];
    closeCommandPalette();
    try {
      action.run();
    } catch (err) {
      console.error('Command Palette action failed:', err);
    }
  }
}
