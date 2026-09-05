/* ==========================================================================
   Toggle Docs - Application Bootstrap (ES module)
   ========================================================================== */

import { state } from './state.js';
import { DB } from './db.js';
import { showDashboard, setupDashboardEvents, updateDocCounts } from './dashboard.js';
import { setupEditorEvents, setupDropdowns, setupShortcuts } from './editor-events.js';
import { setupModals, createDocObject } from './documents.js';
import { loadSettings } from './settings.js';
import { initCollab, setupShareEvents } from './collab.js';

async function initApp() {
  try {
    await DB.ready();
  } catch (e) {
    console.warn('IndexedDB initialization failed:', e);
  }

  await loadSettings();
  setupDashboardEvents();
  setupEditorEvents();
  setupDropdowns();
  setupModals();
  setupShareEvents();
  setupShortcuts();
  initCollab();

  await loadDocuments();

  // Default View: Google Docs Dashboard (Home page)
  showDashboard();

  // Register service worker if supported
  if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
}

async function createInitialWelcomeDoc() {
  const welcomeTitle = state.currentLang === 'ur' ? 'Ù¹Ø§Ú¯Ù„ ÚˆØ§Ú©Ø³ Ù…ÛŒÚº Ø®ÙˆØ´ Ø¢Ù…Ø¯ÛŒØ¯' : 'Welcome to Toggle Docs';
  const welcomeContent = state.currentLang === 'ur'
    ? '<h1>Ù¹Ø§Ú¯Ù„ ÚˆØ§Ú©Ø³ Ù…ÛŒÚº Ø®ÙˆØ´ Ø¢Ù…Ø¯ÛŒØ¯</h1><p>ÛŒÛ Ù¾Ø§Ú©Ø³ØªØ§Ù† Ú©Ø§ Ø§Ù¾Ù†Ø§ Ù…Ù‚Ø§Ù…ÛŒ ÙˆØ±Úˆ Ù¾Ø±ÙˆØ³ÛŒØ³Ø± ÛÛ’Û” Ø¢Ù¾ Ú©Ø§ ÚˆÛŒÙ¹Ø§ Ù…Ú©Ù…Ù„ Ø·ÙˆØ± Ù¾Ø± Ø¢Ù¾ Ú©Û’ Ø§Ù¾Ù†Û’ Ú©Ù…Ù¾ÛŒÙˆÙ¹Ø± ÛŒØ§ Ù…ÙˆØ¨Ø§Ø¦Ù„ Ù¾Ø± Ù…Ø­ÙÙˆØ¸ Ø±ÛØªØ§ ÛÛ’Û”</p><blockquote>Ú©ÙˆØ¦ÛŒ Ø§Ú©Ø§Ø¤Ù†Ù¹ ÛŒØ§ Ø§Ù†Ù¹Ø±Ù†ÛŒÙ¹ Ø¯Ø±Ú©Ø§Ø± Ù†ÛÛŒÚº!</blockquote><p>Ø§Ø±Ø¯Ùˆ Ù…ÛŒÚº Ù„Ú©Ú¾Ù†Û’ Ú©Û’ Ù„ÛŒÛ’ Ø§ÙˆÙ¾Ø± Ø¯ÛŒÛ’ Ú¯Ø¦Û’ Ø§Ø±Ø¯Ùˆ Ú©ÛŒ Ø¨ÙˆØ±Úˆ Ø¨Ù¹Ù† Ù¾Ø± Ú©Ù„Ú© Ú©Ø±ÛŒÚº ÛŒØ§ Alt+U Ø¯Ø¨Ø§Ø¦ÛŒÚºÛ”</p>'
    : '<h1>Welcome to Toggle Docs</h1><p>Toggle Docs is Pakistan\'s own local-first document suite with an authentic Google Docs experience. Your documents never leave your device.</p><blockquote>100% Private, Local-First &amp; Free. No cloud logins required.</blockquote><h3>Key Features:</h3><ul><li>Full Google Docs-inspired formatting toolbar, menubar &amp; paper view</li><li>Built-in Urdu virtual keyboard &amp; Nastaliq calligraphy support</li><li>Offline IndexedDB storage &amp; version history snapshotting</li><li>Export to HTML, Plain Text, or Print to PDF</li></ul><p>Start editing or select a template from the home dashboard to begin.</p>';

  const doc = await createDocObject(welcomeTitle, welcomeContent);
  await DB.putDocument(doc);
  state.allDocs.push(doc);
}

async function loadDocuments() {
  try {
    state.allDocs = (await DB.getAllDocuments()) || [];
  } catch (e) {
    state.allDocs = [];
  }

  if (state.allDocs.length === 0) {
    await createInitialWelcomeDoc();
  }

  updateDocCounts();
}

export { initApp, createInitialWelcomeDoc, loadDocuments };

initApp();