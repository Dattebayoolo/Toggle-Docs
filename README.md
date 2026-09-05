# Toggle Docs

Pakistan's own **local-first document suite** — a Google Docs-inspired PWA.
100% offline: documents are stored in IndexedDB and never leave your device.
Bilingual UI (English / اردو) with a built-in Urdu virtual keyboard and
Nastaliq support.

## Running

The app is static — any web server works. A server (not `file://`) is required
for the PWA service worker and manifest:

```
npx serve .
# or: python -m http.server 8080
```

Then open `http://localhost:3000` (or the port your server prints).

## Project structure

```
index.html            Single-page app: dashboard + editor views
css/tokens.css        Design tokens — Material 3 variables, light + dark themes
css/base.css          Reset, base styles, responsive breakpoints, print sheet
css/dashboard.css     View 1: dashboard, template gallery, recent docs feed
css/editor.css        View 2: editor chrome, toolbar, workspace, ruler, Urdu UI mode
css/overlays.css      Urdu keyboard, modals, context menu, toasts
js/db.js              IndexedDB layer (documents / versions / settings)
js/urdu.js            EN-اردو translations + Urdu keyboard data (TDI18N)
js/editor.js          Rich-text engine, toolbar commands, paste sanitizer (TDEditor)
js/state.js           Shared app state, SVG icons, toast & escape helpers
js/documents.js       Document CRUD, save/versioning, import/export/backup, modals
js/dashboard.js       View switching, dashboard rendering, starring, drawer
js/editor-events.js   Editor header/menubar events, dropdowns, shortcuts
js/settings.js        Theme (auto/light/dark) & language (en/ur), persistence
js/app.js             Bootstrap: init, load settings/documents, TDApp export
sw.js                 Service worker (offline precache, bump CACHE on deploys)
tests/smoke.ps1       Headless-Chrome smoke test (zero console errors + renders)
ROADMAP.md            v1.x changelog + v2.0 plan
```

## Module notes (v2.0)

- JS modules are plain classic scripts sharing the global lexical scope —
  `state.js` declares the app-wide state (`currentDoc`, `allDocs`, `currentLang`,
  `currentTheme`, …) that every other module reads and mutates. Load order in
  `index.html` matters: `db → urdu → editor → state → documents → dashboard →
  editor-events → settings → app`.
- Theme logic: a saved preference (`light`/`dark`) wins; otherwise the app
  follows the OS `prefers-color-scheme` ("auto") until the user toggles.
- Pasted HTML is sanitized with an allowlist (tags + attributes) — scripts,
  event handlers and remote media are stripped.

## Testing

```
powershell -NoProfile -ExecutionPolicy Bypass -File tests/smoke.ps1
```

Requires Chrome or Edge. Asserts the app boots with zero console errors and
the dashboard renders.
