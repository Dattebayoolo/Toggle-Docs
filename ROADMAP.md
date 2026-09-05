# Toggle Docs — Project Status & Roadmap

> Pakistan's own local-first document suite (PWA) — Google Docs-inspired UI,
> English/اردو bilingual, 100% offline, IndexedDB storage, no server.

---

## ✅ What We Have Done (v1.x — current state)

### Architecture

| Layer | Files | Status |
|---|---|---|
| Storage | `js/db.js` — IndexedDB (documents, versions, settings stores) | ✅ Stable |
| i18n | `js/urdu.js` — EN/اردو string packs + Urdu keyboard data | ✅ Stable |
| Editor engine | `js/editor.js` — contenteditable engine, toolbar commands, Urdu keyboard, link dialog, word stats | ✅ Stable |
| App modules | `state.js`, `documents.js`, `dashboard.js`, `editor-events.js`, `settings.js`, `app.js` (bootstrap) | ✅ Modularized |
| UI | `index.html` (dashboard + editor views), `styles.css` (~2700 lines) | ✅ Stable |
| Offline | `sw.js` service worker (cache v2, precaches all JS modules) | ✅ Updated |

### Bugs fixed in this cycle

1. **Editor page runtime errors** (`js/editor.js`):
   - Link dialog no longer crashes when modal/inputs are missing (null guards before first use).
   - `restoreSelection()` discards stale/detached ranges after `openDocument()` replaces `innerHTML` (was throwing on toolbar clicks).
   - `updateToolbarActiveStates()` no longer throws `node.getAttribute is not a function`.
   - `insertTextAtCaret()` re-anchors the caret into the editor when the selection was outside it (fixed Urdu keyboard typing into `<body>`).

2. **Language switch derailing the layout**:
   - Root cause: `applyLanguage()` set `dir="rtl"` on `<html>`, mirroring the whole app shell.
   - Fix: chrome stays LTR permanently; `<html data-lang="ur">` + `dir="rtl"` only on editor content; `html[data-lang="ur"]` rules right-align translated text runs/toasts/menus. Removed invalid `[dir="rtl"] @keyframes` rule.

3. **Document paper not centered**:
   - `.gdocs-main` had no CSS rule and shrink-wrapped to the paper width inside the flex row.
   - Fix: `.gdocs-main { flex: 1 1 auto; display: flex; flex-direction: column; min-width: 0; }` — paper + ruler now center like Google Docs in both languages.


### Current feature set

- Dashboard (grid/list, search, filters: All/Starred/Trash, nav drawer, FAB)
- Editor: formatting toolbar, fonts, zoom, paragraph styles, LTR/RTL paragraph direction, colors, links, lists, horizontal rule
- Urdu virtual keyboard (Nastaliq font, phrases, specials RLM/ZWNJ) — Alt+U
- Templates: blank, Urdu letter, resume, proposal, meeting notes
- Auto-save (600ms debounce), Ctrl+S version snapshots, version history modal
- Export HTML/TXT, JSON backup/restore, print/PDF, duplicate, rename (F2), trash + restore + delete forever
- Dark/light theme, EN/اردو UI language — persisted in IndexedDB
- Keyboard shortcuts (Ctrl+S, Ctrl+Alt+N, Alt+H, Ctrl+\, Alt+U, Ctrl+Shift+R, Ctrl+P, F2)
- PWA installable, offline via service worker
- Google-style **account dropdown** under the header avatar (both dashboard & editor views) with Manage account / Add account / Sign out actions — local-first toasts
- **Collaborative workspace** (`js/collab.js`): Google Docs-style Share modal (invite people with Viewer/Commenter/Editor roles, general access, copy workspace link `#doc=<id>`), share state persisted per document in IndexedDB, and live multi-window sync via `BroadcastChannel` (edits, title & share changes propagate between open windows) plus **live presence avatar stack** in the editor header (colored initials chips for everyone currently viewing the document, heartbeat-based with auto-prune)

---

## 🔜 v2.0 — Planned Work

### 1. CSS theming architecture (high priority) — ✅ DONE (wave 1)
- `styles.css` split into `css/tokens.css` (light+dark variables), `css/base.css` (reset, responsive, print), `css/dashboard.css`, `css/editor.css`, `css/overlays.css`; `index.html` + `sw.js` (cache v3) updated.
- Auto theme shipped: with no saved preference the app follows OS `prefers-color-scheme` ("auto" mode) and re-syncs live; an explicit toggle stores light/dark.
- Still open: convert remaining physical `left/right` properties to logical ones for full RTL chrome mirroring.

### 2. Editor engine upgrade (high priority) — 🟡 partially done (wave 1)
- ✅ Paste sanitization: allowlist-based sanitizer (tags + attributes), strips scripts/styles/iframes/event handlers/`javascript:` URLs, plain-text paste keeps line breaks.
- Still open: replace deprecated `document.execCommand`; Markdown shortcuts; tables; per-paragraph direction persistence.

### 3. Documents & storage — open
- Folders / labels (new IndexedDB index) for organization.
- Smarter search (title match ranked above content) + replace-in-document.
- Version history: cap versions per doc, diff view between versions.
- Export Markdown + DOCX; PDF export without the print dialog.
- Multi-tab safety (storage events / Web Locks).

### 4. UX polish — open
- State-aware undo/redo buttons; command palette (Ctrl+K) reusing `handleMenuAction`.
- Mobile toolbar touch-target audit (650px breakpoint only partially handled).
- Drag-and-drop import; paste images into documents (Blobs in IndexedDB).
- First-run onboarding tour.

### 5. Urdu experience — open
- Phonetic transliteration (type "salam" → سلام) alongside the on-screen keyboard.
- Offline Urdu spell-check hints; more bilingual templates (applications, invoices).

### 6. Engineering hygiene — ✅ mostly done (wave 2)
- ✅ `tests/smoke.ps1`: headless-Chrome smoke test (asserts zero console errors + dashboard render). Run: `powershell -NoProfile -ExecutionPolicy Bypass -File tests/smoke.ps1`.
- ✅ `README.md`: fully modernized (wave 2) — SVG badge hero, feature breakdown, tech-stack badges, annotated project tree, dev/test docs, roadmap links. MIT `LICENSE` added.
- ✅ **ES-module migration complete** (wave 2): all 9 modules are real ES modules with explicit imports/exports; `index.html` loads only `<script type="module" src="js/app.js">`; the global-scope contract is gone. Requires serving over HTTP (enforced in docs; `file://` is blocked by browsers for module scripts).
- ✅ `tests/boot-check.mjs` (wave 2): zero-dependency Node harness with a DOM/IndexedDB shim that boots the entire module graph and **simulates real clicks** (theme toggle, drawer, Escape key). Run: `node tests/boot-check.mjs`.
- Still open: JSDoc headers; "new version available" SW toast; CSS logical-property cleanup.

### Suggested 2.0 milestone order
1. CSS split + theming cleanup (prerequisite for everything visual)
2. Editor command layer (execCommand replacement) + paste sanitization
3. Folders + improved search
4. Markdown/DOCX export
5. Transliteration typing + command palette
6. Smoke-test harness + README/dev-server docs


---

# 🚀 Version 3.0 — Master Plan

**Theme: "From a document editor to a document suite."**
v2.0 hardens the editor; v3.0 grows Toggle Docs into a full local-first
productivity platform — still 100% offline-first, Pakistan-made, no accounts.

---

## Pillar A — Sync & Multi-Device (flagship feature)

| Item | Details | Priority |
|---|---|---|
| End-to-end encrypted sync | User provides their own storage (WebDAV, Google Drive, Dropbox, or a self-hosted `toggle-sync` Node relay). CRDT/merge via `Yjs`; keys never leave the device. | P0 |
| Sync engine module | New `js/sync/` — transport adapters, conflict resolution (last-writer-wins per paragraph via Yjs docs), background queue with retry, sync-status UI in the header. | P0 |
| Device management | Pair devices with a QR code / passphrase; revoke devices; per-device last-synced view. | P1 |
| Selective sync | Per-folder sync opt-in/out; metered-connection awareness. | P2 |

**Milestone exit criteria:** two devices edit the same doc offline, then merge
without data loss after reconnecting.

## Pillar B — Editor maturity

| Item | Details | Priority |
|---|---|---|
| Command-based editor core | Finish replacing `execCommand` with a custom model (or embed TipTap). Content model enables everything below. | P0 |
| Tables | Insert/resize/rename tables, header rows, cell merge — full editing UX. | P0 |
| Comments & suggestions | Margin comments with threads, resolve/reply; "suggesting" mode like Google Docs. Comments stored per-doc in IndexedDB and syncable. | P1 |
| Images & drawings | Inline images (resize, caption), simple drawing canvas (SVG-based) for sketches/signatures. | P1 |
| Find & replace | Full regex-capable find/replace bar inside documents. | P1 |
| Math | KaTeX-based equation insertion. | P2 |
| Page features | True pagination view, headers/footers, page numbers, page break control. | P2 |

## Pillar C — Suite expansion (new apps sharing the shell)

| App | Scope |
|---|---|
| Sheets | Spreadsheet view with formulas (HyperFormula core), shared file manager. |
| Slides | Simple deck editor reusing the canvas/paper system. |
| Forms | Urdu-friendly form builder; responses stored locally, exportable CSV. |
| Keep-style notes | Quick notes surface on the dashboard sidebar. |

Each new app plugs into the existing dashboard file manager (new MIME/kind
field in the documents store; schema migration v2).

## Pillar D — Urdu & accessibility

- **Full RTL chrome mirroring** (finish logical-property CSS conversion) so Urdu users get a mirrored app, not mirrored content only.
- Urdu transliteration + voice input (Web Speech API with ur-PK where available).
- Offline Urdu spell-check + autocorrect dictionary.
- Screen-reader pass: ARIA roles/labels audit, focus management for modals/keyboard, reduced-motion support.
- Font-size & high-contrast accessibility settings.

## Pillar E — Platform & delivery

| Item | Details | Priority |
|---|---|---|
| Build system | Vite build: bundling, minification, hashing, source maps; single `dist/` output replaces raw script tags. | P0 |
| ES modules migration | ✅ **DONE (wave 2)** — app is fully ES modules; dropped the global-scope contract and legacy `file://` loading. | ~~P0~~ ✅ |
| TypeScript | Incremental: JSDoc types first, then `.ts` per module. | P1 |
| Test suite | Playwright e2e (replace smoke.ps1): boot, editor ops, save/versioning, sync merge tests; GitHub Actions CI. | P0 |
| Packaging | Desktop shells: Tauri (small) for Windows/Linux/macOS; Capacitor for Android with share-intent "open in Toggle Docs". | P1 |
| Store publishing | Microsoft Store (Tauri), Play Store listing with Urdu store page. | P2 |

## Pillar F — Security & privacy hardening

- CSP headers/meta + strict sanitizer tests (fuzz the paste sanitizer).
- Encrypted-document option at rest (WebCrypto AES-GCM with device key / passphrase).
- Privacy audit doc: "nothing leaves the device unless you enable sync" made verifiable.

## Pillar G — Performance & quality of life

- Virtualized dashboard list (10k+ docs), IndexedDB cursor pagination.
- Command palette (Ctrl+K) — deferred from 2.0, lands here.
- Doc templates marketplace (community templates, importable JSON).
- Print/PDF engine upgrade: direct PDF generation (skip print dialog), custom page sizes (A4/Letter/Legal/Foolscap).
- Settings page (replaces scattered toggles): theme, language, sync, storage usage meter, export-all wizard.

---

## 3.0 Milestone Roadmap (suggested order)

| Milestone | Contents | Rough size |
|---|---|---|
| M1 — Foundations | Vite + ES modules + TypeScript JSDoc + Playwright CI | Medium |
| M2 — Editor core swap | Command-based model, tables, find & replace | Large |
| M3 — Sync | Yjs sync engine, WebDAV/Drive adapters, device pairing | Large |
| M4 — Suite apps | Sheets MVP, notes surface, documents store migration | Large |
| M5 — Collaboration UX | Comments, suggesting mode, images/drawings | Medium |
| M6 — Urdu & a11y | RTL chrome, transliteration, screen-reader audit | Medium |
| M7 — Packaging & stores | Tauri + Capacitor, store listings | Medium |

**Sequencing rule:** M1 before everything (tests + bundling make the rest
safe). M2 and M3 can proceed in parallel. M4 depends on the documents-store
migration introduced in M2. M5–M7 fill in after the big three.

## Risks & mitigations

- **Editor core swap is the riskiest item** — mitigate with a dual-run period: new model behind a flag, old execCommand path kept until feature parity is proven by e2e tests.
- **Sync conflicts** — rely on Yjs rather than custom merging; never auto-delete data on conflict.
- **Scope creep across 4 apps** — Sheets/Slides/Forms are MVPs with hard caps; ship notes first (smallest).
- **File:// legacy users** — after ES-module migration, keep a frozen 2.x "legacy" build downloadable.

*Status: v3.0 planned September 2026 — not started. v2.0 wave 2 shipped.*

---

## 🛠️ Wave 2 — ES modules, hardening & UX (current cycle)

### Bugs fixed

1. **Boot crash that killed ALL event wiring (missing import)**:
   - `app.js` called `setupDashboardEvents()` without importing it → `ReferenceError` in `initApp()` → no listeners ever attached (dark-mode toggle, hamburger drawer, everything dead at runtime).
   - Fix: added the missing import from `dashboard.js`. Found via a new Node boot harness (not visible to `node --check`), verified by click-simulation smoke test.

2. **Corrupted CSS header comments in every stylesheet**:
   - All 5 files in `css/` had lost the `/*` opener on their header comments (plus dangling unclosed `/*` at EOF), so the CSS parser swallowed following rules as one invalid rule — breaking base styles and layout.
   - Fix: rebuilt headers, removed EOF danglers, verified open/close balance across all files.

3. **Stale service-worker cache masking fixes**:
   - The cache-first SW kept serving broken assets after code changes.
   - Fix: cache version bumped `v3 → v5`; hard-refresh guidance documented.

### Shipped

- **Full ES-module migration** (see Engineering hygiene above) — `file://` no longer works; HTTP serving required (`node tests/server.js`).
- **Google-style account dropdown** on both views (HTML + `overlays.css` + 3 new `handleMenuAction` cases).
- **`tests/boot-check.mjs`** — DOM/IndexedDB-shim boot & interaction smoke test.
- **Modern README** with SVG badges + MIT `LICENSE`.

---

**Also in wave 1:**

4. **Logo wordmark typography**:
   - `.dash-logo-text` upgraded to the already-loaded **Outfit** face (500/700), tighter tracking, gradient-filled "Docs" via `background-clip: text`.

5. **Modularization**:
   - Monolithic `app.js` (~1470 lines) split into 5 focused modules + slim bootstrap (plain classic scripts, shared global lexical scope — no bundler).
   - Load order: `db → urdu → editor → state → documents → dashboard → editor-events → settings → app`.
   - Service worker cache bumped to `toggle-docs-v2` with all new files precached.

6. **Boot crash that killed dark mode** (introduced by the split, then fixed):
   - `showToast`/`escapeHtml` were dropped from `state.js` during extraction → `window.TDApp` export threw at load → `initApp()` never ran → all event wiring dead.
   - Restored helpers; removed duplicate `createInitialWelcomeDoc`/`loadDocuments` from `documents.js`.
   - Verified with headless Chrome: zero console errors, dashboard renders, theme buttons wired.

*Last updated: September 2026 — v2.0 wave 2 (ES modules, hardening, account dropdown) complete.*

