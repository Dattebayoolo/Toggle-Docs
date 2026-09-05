$ErrorActionPreference = 'Stop'
$enc = New-Object System.Text.UTF8Encoding($false)

# --- public API map: file -> exported names (functions only) ---
$exports = @{
  'state.js'        = @()
  'documents.js'    = @('createDocObject','openDocument','updateStarButtonVisual','scheduleAutoSave','saveCurrentDoc','setSaveStatus','updateDocInLocalList','createDocumentFromTemplate','exportDocument','backupAllDocuments','handleFileImport','duplicateCurrentDoc','trashCurrentDoc','openContextMenu','setupModals','openRenameModal','confirmAction','openVersionHistory','openShortcutsModal')
  'dashboard.js'    = @('showDashboard','showEditor','renderDashboardDocs','renderDocList','highlightActiveDocInList','updateDocCounts','formatTimestamp','toggleStarDoc','setupDashboardEvents','toggleDashboardDrawer')
  'editor-events.js'= @('setupEditorEvents','toggleSidebar','setupDropdowns','closeAllDropdowns','handleMenuAction','setupShortcuts','toggleFullscreen')
  'settings.js'     = @('toggleTheme','applyTheme','toggleLanguage','applyLanguage','loadSettings','saveSettings','applyResolvedAutoTheme')
  'app.js'          = @('initApp','createInitialWelcomeDoc','loadDocuments')
}
$allNames = @()
foreach ($k in $exports.Keys) { $allNames += $exports[$k] }
$allNames += 'downloadFile'

# external imports: name -> module
$externals = @{
  'DB' = './db.js'; 'I18N' = './urdu.js'; 'Editor' = './editor.js'
}

# shared state object fields
$stateFields = @('currentDoc','allDocs','currentFilter','searchQuery','currentLang','currentTheme','autoSaveTimeout','isListView')

$modules = @('documents.js','dashboard.js','editor-events.js','settings.js')

foreach ($f in $modules) {
  $c = [IO.File]::ReadAllText("js/$f")
  # rename state identifiers to state.xxx (word boundaries, not already prefixed)
  foreach ($s in $stateFields) {
    $c = [regex]::Replace($c, "(?<![\w.'])\b$s\b", "state.$s")
  }
  [IO.File]::WriteAllText("js/$f", $c, $enc)
}
# --- rewrite state.js as the shared state module ---
$stateSrc = @'
/* ==========================================================================
   Toggle Docs - Shared State, Constants & UI Helpers (ES module)
   Single source of truth: app-wide state lives in `state` so every module
   mutates the same object (ES module exports of primitives are read-only).
   ========================================================================== */

import DB from './db.js';
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
'@
[IO.File]::WriteAllText('js/state.js', $stateSrc, $enc)
Write-Host 'state.js rewritten'
# --- add exports to function declarations, then compute imports per module ---
foreach ($f in $modules) {
  $c = [IO.File]::ReadAllText("js/$f")
  foreach ($name in $exports[$f]) {
    $c = [regex]::Replace($c, "(?m)^(async function $name\b|function $name\b)", 'export $1')
  }
  if ($f -eq 'documents.js') {
    $c = [regex]::Replace($c, '(?m)^function downloadFile\b', 'export function downloadFile')
  }

  # figure out which foreign names this module references
  $needed = @()
  if ($c -match "(?<![\w.'])\bstate\.") { $needed += 'state' }
  foreach ($name in $allNames) {
    if ($exports[$f] -contains $name) { continue }
    if ($c -match "(?<![\w.'])\b$name\b") { $needed += $name }
  }
  foreach ($ext in $externals.Keys) {
    if ($c -match "(?<![\w.'])\b$ext\b") { $needed += "$ext as $($ext)" }
  }

  $importLines = @()
  $byModule = @{}
  foreach ($n in $needed) {
    if ($n -match '^(.+) as (.+)$') {
      $src = $externals[$Matches[1]]; $local = $Matches[2]
    } else {
      $local = $n
      if ($exports['documents.js'] -contains $n -or $n -eq 'downloadFile') { $src = './documents.js' }
      elseif ($exports['dashboard.js'] -contains $n) { $src = './dashboard.js' }
      elseif ($exports['editor-events.js'] -contains $n) { $src = './editor-events.js' }
      elseif ($exports['settings.js'] -contains $n) { $src = './settings.js' }
      elseif ($exports['app.js'] -contains $n) { $src = './app.js' }
      else { $src = './state.js' }
    }
    if ($src -eq "./$f") { continue }  # skip self-imports
    if (-not $byModule.ContainsKey($src)) { $byModule[$src] = @() }
    $byModule[$src] += $local
  }
  foreach ($src in $byModule.Keys) {
    $importLines += "import { $(($byModule[$src] | Sort-Object -Unique) -join ', ') } from '$src';"
  }

  if ($importLines.Count -gt 0) {
    $c = ($importLines -join "`n") + "`n`n" + $c
  }
  [IO.File]::WriteAllText("js/$f", $c, $enc)
  Write-Host "$f -> $($importLines.Count) import lines"
}

# --- rewrite app.js bootstrap ---
$appSrc = @'
/* ==========================================================================
   Toggle Docs - Application Bootstrap (ES module)
   ========================================================================== */

import { state } from './state.js';
import { DB } from './db.js';
import { showDashboard, updateDocCounts } from './dashboard.js';
import { setupEditorEvents, setupDropdowns, setupShortcuts } from './editor-events.js';
import { setupModals, createDocObject } from './documents.js';
import { loadSettings } from './settings.js';

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
  setupShortcuts();

  await loadDocuments();

  // Default View: Google Docs Dashboard (Home page)
  showDashboard();

  // Register service worker if supported
  if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
}

async function createInitialWelcomeDoc() {
  const welcomeTitle = state.currentLang === 'ur' ? 'ٹاگل ڈاکس میں خوش آمدید' : 'Welcome to Toggle Docs';
  const welcomeContent = state.currentLang === 'ur'
    ? '<h1>ٹاگل ڈاکس میں خوش آمدید</h1><p>یہ پاکستان کا اپنا مقامی ورڈ پروسیسر ہے۔ آپ کا ڈیٹا مکمل طور پر آپ کے اپنے کمپیوٹر یا موبائل پر محفوظ رہتا ہے۔</p><blockquote>کوئی اکاؤنٹ یا انٹرنیٹ درکار نہیں!</blockquote><p>اردو میں لکھنے کے لیے اوپر دیے گئے اردو کی بورڈ بٹن پر کلک کریں یا Alt+U دبائیں۔</p>'
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
'@
[IO.File]::WriteAllText('js/app.js', $appSrc, $enc)
Write-Host 'app.js rewritten'


