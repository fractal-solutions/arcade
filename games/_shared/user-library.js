/* Shared "Your data" library.
   Stores files the player picks from their own disk so they survive reloads
   and can be relaunched from the main arcade list.

   Design:
   - IndexedDB keeps the actual bytes (and, when the browser supports it, a
     File System Access handle that points at the original file).
   - localStorage keeps a small, synchronous index so the home page can inject
     entries before its list is built.
   - Nothing is uploaded; everything stays in this browser. */
(() => {
  'use strict';

  const DB_NAME = 'arcade-user-data';
  const DB_VERSION = 1;
  const STORE = 'files';
  const INDEX_KEY = 'arcade.user.index.v1';
  const MAX_RECORDS = 100;

  const KINDS = new Set(['gba', 'flash', 'dos']);

  function readIndex() {
    try {
      const value = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
      return Array.isArray(value) ? value.filter((item) => item && item.id) : [];
    } catch (_) {
      return [];
    }
  }

  function writeIndex(list) {
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify(list.slice(0, MAX_RECORDS)));
    } catch (error) {
      console.warn('Unable to save the user library index:', error);
    }
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('This browser cannot store files locally.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local storage.'));
    });
  }

  async function putRecord(record) {
    const db = await openDb();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Local storage write aborted.'));
      });
    } finally {
      db.close();
    }
  }

  async function getRecord(id) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const request = tx.objectStore(STORE).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async function deleteRecord(id) {
    const db = await openDb();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  function makeId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (_) { /* fall through */ }
    return `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  function extOf(name) {
    const match = /\.([a-z0-9]+)$/i.exec(name || '');
    return match ? match[1].toLowerCase() : '';
  }

  function metaOf(record) {
    const { blob, handle, ...meta } = record;
    return meta;
  }

  function emit() {
    try {
      window.dispatchEvent(new CustomEvent('arcade:user-library'));
    } catch (_) { /* ignore */ }
  }

  function listSync() {
    return readIndex().slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }

  function normalizeKind(kind, ext) {
    if (KINDS.has(kind)) return kind;
    if (ext === 'gba' || ext === 'gb' || ext === 'gbc') return 'gba';
    if (ext === 'swf') return 'flash';
    if (ext === 'jsdos' || ext === 'zip') return 'dos';
    return 'data';
  }

  /* Save a File (or Blob) and return its metadata. Re-picking the same file
     updates the existing entry instead of creating duplicates. */
  async function remember(file, options = {}) {
    if (!file || !file.name) throw new Error('Choose a file first.');
    const ext = options.ext || extOf(file.name);
    const kind = normalizeKind(options.kind, ext);
    const index = readIndex();
    const existing = index.find((item) =>
      item.name === file.name && item.kind === kind && item.size === file.size);

    const record = {
      id: existing ? existing.id : makeId(),
      name: file.name,
      kind,
      ext,
      size: file.size,
      type: file.type || '',
      addedAt: Date.now(),
      origin: options.handle ? 'handle' : 'cache',
      blob: file,
    };
    if (options.handle) record.handle = options.handle;

    await putRecord(record);

    const next = index.filter((item) => item.id !== record.id);
    next.unshift(metaOf(record));
    writeIndex(next);
    emit();
    return metaOf(record);
  }

  async function getFile(id) {
    const record = await getRecord(id);
    if (!record) throw new Error('That file is no longer saved in this browser. Pick it again.');

    if (record.handle) {
      try {
        const permission = typeof record.handle.queryPermission === 'function'
          ? await record.handle.queryPermission({ mode: 'read' })
          : 'granted';
        if (permission === 'granted') {
          const fresh = await record.handle.getFile();
          if (fresh) return fresh;
        }
      } catch (error) {
        console.warn('Saved file handle is unavailable; using the cached copy.', error);
      }
    }

    if (record.blob) {
      return new File([record.blob], record.name, {
        type: record.blob.type || 'application/octet-stream',
      });
    }
    throw new Error('That file is no longer available. Pick it again.');
  }

  async function remove(id) {
    await deleteRecord(id);
    writeIndex(readIndex().filter((item) => item.id !== id));
    emit();
  }

  /* Chromium-only: true on-disk file handle. Returns null when unavailable
     or when the player cancels the dialog. */
  async function pick(options = {}) {
    if (typeof window.showOpenFilePicker !== 'function') return null;
    try {
      const handles = await window.showOpenFilePicker({
        multiple: false,
        excludeAcceptAllOption: false,
        types: options.types || [],
      });
      const handle = handles && handles[0];
      if (!handle) return null;
      const file = await handle.getFile();
      return { file, handle };
    } catch (error) {
      if (error && error.name === 'AbortError') return null;
      throw error;
    }
  }

  function canPick() {
    return typeof window.showOpenFilePicker === 'function';
  }

  window.ArcadeUserLibrary = {
    listSync,
    remember,
    getFile,
    remove,
    pick,
    canPick,
    extOf,
    KINDS,
  };
})();
