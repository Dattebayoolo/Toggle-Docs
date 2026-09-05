import { state } from './state.js';
import { renderDashboardDocs, renderDocList } from './dashboard.js';
import { DB } from './db.js';
import { Editor } from './editor.js';
import { I18N } from './urdu.js';

/* ==========================================================================
   Toggle Docs - Theme & Language Settings Module
   Dark/light theme, English/Urdu language switching and persistence.
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------------
   Theme & Language Switching
   ------------------------------------------------------------------------ */
export function toggleTheme() {
  // In auto mode, flip from the currently *resolved* visual theme.
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
}

export function toggleLanguage() {
  state.currentLang = state.currentLang === 'ur' ? 'en' : 'ur';
  applyLanguage(state.currentLang);
  saveSettings();
}

export function applyLanguage(lang) {
  // NOTE: We intentionally do NOT set dir="rtl" on <html>. Flipping the
  // root direction mirrors the whole app shell (toolbar, header, sidebar,
  // paper layout) which the stylesheet does not support. The chrome stays
  // LTR; only the document content and translated text runs become RTL.
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
      // No explicit user preference yet — follow the OS dark/light setting
      // and keep following it live until the user picks a theme manually.
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
          mq.addListener(sync); // older Safari/Edge
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

/* Resolves the visual theme for auto mode without overwriting the stored
   preference: the DOM gets data-theme, state.currentTheme stays 'auto'. */
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
