/* Runtime smoke test: boot the ES-module graph in Node with a minimal DOM shim
   and report any errors thrown during module evaluation / initApp wiring. */
const listeners = new Map();

function makeEl(id) {
  const el = {
    id,
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); }, remove(c) { this._set.delete(c); },
      toggle(c, force) { const has = this._set.has(c); const want = force === undefined ? !has : force; if (want) this._set.add(c); else this._set.delete(c); return want; },
      contains(c) { return this._set.has(c); }
    },
    _listeners: {},
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    removeEventListener(){},
    click() { (this._listeners.click || []).forEach(fn => fn({ key: null })); },
    fireKey(key) { (global._docKeyHandlers || []).forEach(fn => fn({ key })); },
    setAttribute(k, v) { this._attrs = this._attrs || {}; this._attrs[k] = v; },
    getAttribute(k) { return (this._attrs || {})[k] !== undefined ? this._attrs[k] : null; },
    removeAttribute(k) { if (this._attrs) delete this._attrs[k]; },
    hasAttribute(k) { return !!(this._attrs && this._attrs[k] !== undefined); },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    appendChild(){}, removeChild(){}, focus(){},
    textContent: '', innerHTML: '', innerText: '', value: '', style: {}, title: ''
  };
  return el;
}

const elementCache = new Map();
const docKeyHandlers = [];
global._docKeyHandlers = docKeyHandlers;
global.document = {
  documentElement: makeEl('html'),
  getElementById(id) {
    if (!elementCache.has(id)) elementCache.set(id, makeEl(id));
    return elementCache.get(id);
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return makeEl('new'); },
  addEventListener(type, fn) { if (type === 'keydown') docKeyHandlers.push(fn); }
};
global.window = global;
global.addEventListener = function(){};
global.removeEventListener = function(){};
global.addEventListener = function(){};
global.removeEventListener = function(){};
Object.defineProperty(global, 'navigator', { value: { serviceWorker: undefined }, configurable: true });
global.matchMedia = () => ({ matches: false, addEventListener(){}, addListener(){} });
global.indexedDB = {
  open() {
    const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: null };
    setTimeout(() => {
      req.result = {
        objectStoreNames: { contains: () => true },
        transaction(storeName) {
          const tx = { onerror: null, onabort: null, oncomplete: null, error: null };
          const fire = () => setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
          tx.objectStore = () => ({
            getAll: () => { const r = { result: [], onsuccess: null }; setTimeout(() => { if (r.onsuccess) r.onsuccess(); fire(); }, 0); return r; },
            get: () => { const r = { result: undefined, onsuccess: null }; setTimeout(() => { if (r.onsuccess) r.onsuccess(); fire(); }, 0); return r; },
            put: () => { const r = { result: null, onsuccess: null }; setTimeout(() => { if (r.onsuccess) r.onsuccess(); fire(); }, 0); return r; },
            delete: () => { const r = { result: null, onsuccess: null }; setTimeout(() => { if (r.onsuccess) r.onsuccess(); fire(); }, 0); return r; },
            index: () => ({ getAll: () => { const r = { result: [], onsuccess: null }; setTimeout(() => { if (r.onsuccess) r.onsuccess(); fire(); }, 0); return r; } })
          });
          return tx;
        }
      };
      if (req.onsuccess) req.onsuccess();
    }, 0);
    return req;
  }
};

global.location = { protocol: 'file:' };
process.on('unhandledRejection', e => { console.error('UNHANDLED REJECTION:', e && e.message, '\n', e && e.stack); process.exit(1); });
process.on('uncaughtException', e => { console.error('UNCAUGHT:', e && e.message, '\n', e && e.stack); process.exit(1); });

import('../js/app.js')
  .then(() => {
    setTimeout(() => {
      const html = document.documentElement;
      const themeBtn = document.getElementById('dash-btn-theme');
      const menuBtn = document.getElementById('dash-btn-menu');
      const drawer = document.getElementById('dash-drawer');
      const overlay = document.getElementById('dash-drawer-overlay');
      let fail = false;

      const themeBefore = html.getAttribute('data-theme');
      themeBtn.click();
      const themeAfter = html.getAttribute('data-theme');
      if (themeBefore === themeAfter) { console.error('FAIL: theme did not change on click'); fail = true; }
      else console.log('PASS: theme toggled', themeBefore, '->', themeAfter);

      menuBtn.click();
      if (!drawer.classList.contains('open')) { console.error('FAIL: drawer did not open'); fail = true; }
      else console.log('PASS: drawer opened via hamburger');
      if (overlay.classList.contains('hidden')) { console.error('FAIL: overlay still hidden'); fail = true; }
      else console.log('PASS: overlay shown');

      docKeyHandlers.forEach(fn => fn({ key: 'Escape' }));
      if (drawer.classList.contains('open')) { console.error('FAIL: Escape did not close drawer'); fail = true; }
      else console.log('PASS: Escape closed drawer');

      console.log(fail ? 'SMOKE TEST FAILED' : 'SMOKE TEST PASSED');
      process.exit(fail ? 1 : 0);
    }, 500);
  })
  .catch(e => { console.error('MODULE LOAD FAILED:', e && e.message, '\n', e && e.stack); process.exit(1); });
