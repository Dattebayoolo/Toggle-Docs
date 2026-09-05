import { state, showToast } from './state.js';
import { renderDashboardDocs, renderDocList } from './dashboard.js';
import { DB } from './db.js';
import { Editor } from './editor.js';
import { I18N } from './urdu.js';
import { backupAllDocuments } from './documents.js';

/* ==========================================================================
   Toggle Docs - Theme, Language & Sovereign Settings Module (v3.0)
   Includes tabbed preferences, storage diagnostics, and trash purge.
   ========================================================================== */
'use strict';

let settingsModalEl = null;

/* ------------------------------------------------------------------------
   Theme & Language Switching
   ------------------------------------------------------------------------ */
export function toggleTheme() {
  const visuallyDark = document.documentElement.hasAttribute('data-theme');
  state.currentTheme = visuallyDark ? 'light' : 'dark';
  applyTheme(state.currentTheme);
  saveSettings();
}

export function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.querySelectorAll('.theme-icon-dark').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.theme-icon-light').forEach(el => el.classList.remove('hidden'));
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.querySelectorAll('.theme-icon-dark').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.theme-icon-light').forEach(el => el.classList.add('hidden'));
  }

  // Update settings radios if modal is present
  const radio = document.querySelector(`input[name="settings-theme"][value="${theme}"]`);
  if (radio) radio.checked = true;
}

export function toggleLanguage() {
  state.currentLang = state.currentLang === 'ur' ? 'en' : 'ur';
  applyLanguage(state.currentLang);
  saveSettings();
}

export function applyLanguage(lang) {
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('data-lang', lang);

  const editor = document.getElementById('editor');
  if (editor) {
    if (lang === 'ur') {
      editor.setAttribute('data-font', 'nastaliq');
      editor.setAttribute('dir', 'rtl');
    } else {
      editor.removeAttribute('data-font');
      editor.setAttribute('dir', 'ltr');
    }
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && I18N) el.textContent = I18N.t(key, lang);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && I18N) el.setAttribute('placeholder', I18N.t(key, lang));
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key && I18N) el.setAttribute('title', I18N.t(key, lang));
  });

  document.querySelectorAll('.lang-text').forEach(el => {
    el.textContent = lang === 'ur' ? 'English' : 'اردو';
  });

  renderDashboardDocs();
  renderDocList();

  const radio = document.querySelector(`input[name="settings-lang"][value="${lang}"]`);
  if (radio) radio.checked = true;
}

/* ------------------------------------------------------------------------
   Unified Settings Modal (v3.0)
   ------------------------------------------------------------------------ */
export function initSettingsModal() {
  settingsModalEl = document.getElementById('modal-settings');
  if (!settingsModalEl) return;

  // Tab switching
  const tabs = settingsModalEl.querySelectorAll('.settings-tab-btn');
  const panels = settingsModalEl.querySelectorAll('.settings-tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.add('hidden'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-panel');
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.remove('hidden');

      if (targetId === 'settings-panel-storage') {
        updateStorageDiagnostics();
      }
    });
  });

  // Radio triggers
  settingsModalEl.querySelectorAll('input[name="settings-theme"]').forEach(r => {
    r.addEventListener('change', () => {
      state.currentTheme = r.value;
      if (r.value === 'auto') {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyResolvedAutoTheme(isDark);
      } else {
        applyTheme(r.value);
      }
      saveSettings();
    });
  });

  settingsModalEl.querySelectorAll('input[name="settings-lang"]').forEach(r => {
    r.addEventListener('change', () => {
      state.currentLang = r.value;
      applyLanguage(r.value);
      saveSettings();
    });
  });

  // Storage action buttons
  const btnPurgeTrash = document.getElementById('btn-settings-purge-trash');
  if (btnPurgeTrash) {
    btnPurgeTrash.addEventListener('click', async () => {
      const trashed = state.allDocs.filter(d => d.trashed);
      for (const d of trashed) {
        await DB.deleteDocument(d.id);
      }
      state.allDocs = state.allDocs.filter(d => !d.trashed);
      renderDashboardDocs();
      renderDocList();
      updateStorageDiagnostics();
      showToast(`Purged ${trashed.length} document${trashed.length === 1 ? '' : 's'} from trash`);
    });
  }

  const btnBackupAll = document.getElementById('btn-settings-backup');
  if (btnBackupAll) {
    btnBackupAll.addEventListener('click', () => {
      backupAllDocuments();
    });
  }
}

export async function openSettingsModal() {
  if (!settingsModalEl) initSettingsModal();
  if (!settingsModalEl) return;

  settingsModalEl.classList.remove('hidden');
  updateStorageDiagnostics();
}

export function closeSettingsModal() {
  if (settingsModalEl) settingsModalEl.classList.add('hidden');
}

export async function updateStorageDiagnostics() {
  const docCountEl = document.getElementById('settings-stat-docs');
  const sizeEl = document.getElementById('settings-stat-size');
  const trashCountEl = document.getElementById('settings-stat-trash');

  const docs = state.allDocs || [];
  const trashed = docs.filter(d => d.trashed);

  if (docCountEl) docCountEl.textContent = docs.length;
  if (trashCountEl) trashCountEl.textContent = trashed.length;

  try {
    let totalBytes = 0;
    docs.forEach(d => {
      totalBytes += (d.title ? d.title.length : 0) * 2;
      totalBytes += (d.content ? d.content.length : 0) * 2;
    });

    const kb = (totalBytes / 1024).toFixed(1);
    if (sizeEl) sizeEl.textContent = kb > 1024 ? (kb / 1024).toFixed(2) + ' MB' : kb + ' KB';
  } catch (e) {
    if (sizeEl) sizeEl.textContent = '< 1 MB';
  }
}

/* ------------------------------------------------------------------------
   Settings Storage
   ------------------------------------------------------------------------ */
export async function loadSettings() {
  try {
    const settings = (await DB.getSettings()) || {};
    if (settings.theme) {
      state.currentTheme = settings.theme;
      applyTheme(state.currentTheme);
    } else {
      state.currentTheme = 'auto';
      if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const sync = function (mqEvent) {
          if (state.currentTheme === 'auto') {
            applyResolvedAutoTheme(mqEvent.matches);
          }
        };
        if (mq.addEventListener) {
          mq.addEventListener('change', sync);
        } else if (mq.addListener) {
          mq.addListener(sync);
        }
        applyResolvedAutoTheme(mq.matches);
      } else {
        applyTheme('light');
      }
    }
    if (settings.lang) {
      state.currentLang = settings.lang;
      applyLanguage(state.currentLang);
    }
  } catch (e) {}
}

export function applyResolvedAutoTheme(prefersDark) {
  const resolved = prefersDark ? 'dark' : 'light';
  if (resolved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  document.querySelectorAll('.theme-icon-dark').forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll('.theme-icon-light').forEach(el => el.classList.add('hidden'));
}

export async function saveSettings() {
  try {
    await DB.putSettings({
      theme: state.currentTheme,
      lang: state.currentLang
    });
  } catch (e) {}
}
