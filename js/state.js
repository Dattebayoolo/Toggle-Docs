/* ==========================================================================
   Toggle Docs - Shared State, Constants & UI Helpers (ES module)
   Single source of truth: app-wide state lives in `state` so every module
   mutates the same object (ES module exports of primitives are read-only).
   ========================================================================== */

import { DB } from './db.js';
import { I18N } from './urdu.js';
import { TDEditor as Editor } from './editor.js';

export { DB, I18N, Editor };

export const state = {
  currentDoc: null,
  allDocs: [],
  currentFilter: 'docs',
  searchQuery: '',
  currentLang: 'en',
  currentTheme: 'light',
  autoSaveTimeout: null,
  isListView: false
};

// SVG Icon Templates (Vector, Crisp, Scalable)
export const ICONS = {
  doc: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="3" y="2" width="18" height="20" rx="2" fill="#0e7a3d"/><path d="M15 2l6 6h-4a2 2 0 0 1-2-2V2z" fill="#1db954"/><line x1="7" y1="10" x2="13" y2="10" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="14" x2="17" y2="14" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="18" x2="14" y2="18" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/></svg>',
  starOutline: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  starFilled: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#f5b301" stroke="#f5b301" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  more: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#34d375" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
};

/* Toast Snackbar Notification */
export function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';

  const checkIcon = document.createElement('span');
  checkIcon.innerHTML = ICONS.check;

  const textSpan = document.createElement('span');
  textSpan.textContent = msg;

  toast.appendChild(checkIcon);
  toast.appendChild(textSpan);
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode === container) {
      container.removeChild(toast);
    }
  }, 3000);
}

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

