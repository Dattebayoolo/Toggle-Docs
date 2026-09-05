/* Toggle Docs — IndexedDB storage layer (local-first, no server). ES module. */

const DB_NAME = 'toggle-docs';
const DB_VERSION = 2;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(function (resolve, reject) {
    if (!global.indexedDB) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const req = global.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function () {
      const db = req.result;
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('versions')) {
        const store = db.createObjectStore('versions', { keyPath: 'id' });
        store.createIndex('docId', 'docId', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
  return dbPromise;
}

/* Runs fn(store) inside a transaction; resolves with the request's result. */
function run(storeName, mode, fn) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;
      tx.oncomplete = function () { resolve(result); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error('Transaction aborted')); };
      let req;
      try { req = fn(store); } catch (e) { reject(e); return; }
      if (req) {
        req.onsuccess = function () { result = req.result; };
      }
    });
  });
}

const DB = {    ready: openDB,
  /* documents */
  getAllDocuments: function () {
    return run('documents', 'readonly', function (s) { return s.getAll(); });
  },
  getDocument: function (id) {
    return run('documents', 'readonly', function (s) { return s.get(id); });
  },
  putDocument: function (doc) {
    return run('documents', 'readwrite', function (s) { return s.put(doc); });
  },
  deleteDocument: function (id) {
    return run('documents', 'readwrite', function (s) { return s.delete(id); });
  },
  /* settings (single record, key = 'app') */
  getSettings: function () {
    return run('settings', 'readonly', function (s) { return s.get('app'); });
  },
  putSettings: function (settings) {
    settings.key = 'app';
    return run('settings', 'readwrite', function (s) { return s.put(settings); });
  },
  /* version history */
  getVersions: function (docId) {
    return run('versions', 'readonly', function (s) { return s.index('docId').getAll(docId); });
  },
  putVersion: function (version) {
    return run('versions', 'readwrite', function (s) { return s.put(version); });
  },
  deleteVersion: function (id) {
    return run('versions', 'readwrite', function (s) { return s.delete(id); });
  }
};

export default DB;
