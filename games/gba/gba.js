/* Game Boy Advance cabinet: BYO ROM, EmulatorJS + mGBA.
   The ROM is turned into a Blob URL and kept in this tab; nothing is uploaded. */
(() => {
  'use strict';

  const root = document.getElementById('dos');
  const picker = document.getElementById('picker');
  const fileInput = document.getElementById('rom-file');
  const dropzone = document.getElementById('dropzone');
  const pickerError = document.getElementById('picker-error');
  const boot = document.getElementById('boot');
  const bootStatus = document.getElementById('boot-status');
  const bootError = document.getElementById('boot-error');
  const bootErrorMessage = document.getElementById('boot-error-message');
  const bootReload = document.getElementById('boot-reload');
  const changeRom = document.getElementById('change-rom');
  const fsBtn = document.getElementById('fs');
  const bar = document.querySelector('.bar');
  const toolbarReveal = document.getElementById('toolbar-reveal');
  const params = new URLSearchParams(location.search);

  const romList = document.getElementById('rom-list');
  const romSearch = document.getElementById('rom-search');
  const romSearchClear = document.getElementById('rom-search-clear');
  const romCount = document.getElementById('rom-count');
  const romEmpty = document.getElementById('rom-empty');
  const userLib = window.ArcadeUserLibrary || null;

  const ALLOWED = /\.(gba|gb|gbc)$/i;
  const MAX_BYTES = 64 * 1024 * 1024;
  const BOOT_TIMEOUT = 30000;

  let started = false;
  let bootTimer = 0;
  let guardTimer = 0;
  let currentUrl = '';
  let romQuery = '';
  let selectedRom = null;

  if (!root) return;

  /* EmulatorJS unmounts /data/saves while it tears the core down, then runs a
     final IDBFS persist. That persist sees an empty local tree, and IDBFS's
     reconcile deletes every remote entry that is missing locally - so every
     save disappears from IndexedDB on reload. Refuse an empty-local -> remote
     sync so stored saves survive shutdown. */
  function guardSaveStorage() {
    const fs = window.EJS_emulator?.gameManager?.FS;
    const idbfs = fs?.filesystems?.IDBFS;
    if (!idbfs || idbfs.__arcadeGuarded) return Boolean(idbfs);
    idbfs.__arcadeGuarded = true;

    const reconcile = idbfs.reconcile;
    idbfs.reconcile = function (src, dst, callback) {
      if (src?.type === 'local' && dst?.type === 'remote') {
        const localCount = Object.keys(src.entries || {}).length;
        const remoteCount = Object.keys(dst.entries || {}).length;
        if (!localCount && remoteCount) {
          console.warn('Skipped an empty GBA save sync so stored saves are kept.');
          callback(null);
          return;
        }
      }
      return reconcile.call(this, src, dst, callback);
    };
    return true;
  }

  function watchSaveStorage() {
    if (guardTimer || guardSaveStorage()) return;
    guardTimer = setInterval(() => {
      if (guardSaveStorage()) {
        clearInterval(guardTimer);
        guardTimer = 0;
      }
    }, 100);
  }

  /* Flush the battery save when the tab is hidden or closed. EmulatorJS also
     writes on its own interval, but this catches the common "switch tabs and
     come back later" case. */
  function flushSaveFiles() {
    if (!started) return;
    try {
      window.EJS_emulator?.gameManager?.saveSaveFiles?.();
    } catch (error) {
      console.warn('Unable to flush the GBA save file:', error);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSaveFiles();
  });
  window.addEventListener('pagehide', flushSaveFiles);

  function setBootStatus(text) {
    if (bootStatus) bootStatus.textContent = text;
  }

  function clearPickerError() {
    if (!pickerError) return;
    pickerError.textContent = '';
    pickerError.hidden = true;
  }

  function showPickerError(message) {
    if (!pickerError) return;
    pickerError.textContent = message;
    pickerError.hidden = false;
  }

  function showBootError(message) {
    clearTimeout(bootTimer);
    if (boot) boot.hidden = true;
    if (bootErrorMessage) bootErrorMessage.textContent = message;
    if (bootError) bootError.hidden = false;
  }

  function hideBootError() {
    if (bootError) bootError.hidden = true;
  }

  function focusGame() {
    try {
      root.focus({ preventScroll: true });
    } catch (_) {
      try { root.focus(); } catch (__) { /* ignore */ }
    }
  }

  function resizeGame() {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      try {
        window.EJS_emulator?.handleResize?.();
      } catch (_) { /* ignore */ }
    });
  }

  function loadTouchControls() {
    if (document.querySelector('script[data-gba-controls]')) return;
    const script = document.createElement('script');
    script.src = 'gba-controls.js?v=20261109d';
    script.dataset.gbaControls = '';
    script.onerror = () => console.warn('GBA touch controls failed to load.');
    document.body.appendChild(script);
  }

  /* ------------------------------------------------------------ ROM library */

  function romRows() {
    return romList ? Array.from(romList.querySelectorAll('.rom-item')) : [];
  }

  function visibleRomRows() {
    return romRows().filter((row) => !row.classList.contains('is-filtered-out'));
  }

  function selectRom(row, options = {}) {
    if (!row) return;
    selectedRom = row;
    for (const item of romRows()) {
      const active = item === row;
      item.classList.toggle('is-selected', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    }
    if (options.scroll) {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function formatSize(bytes) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function updateRomCount() {
    if (!romCount) return;
    const all = romRows();
    const visible = visibleRomRows().length;
    const saved = all.filter((row) => row.dataset.user).length;
    romCount.textContent = romQuery
      ? `${visible} of ${all.length}`
      : `${all.length} ROM${all.length === 1 ? '' : 'S'}${saved ? ` · ${saved} saved` : ''}`;
  }

  function applyRomFilter() {
    if (!romList) return;
    const terms = romQuery.toLowerCase().split(/\s+/).filter(Boolean);
    for (const row of romRows()) {
      const haystack = (row.dataset.search || row.textContent || '').toLowerCase();
      const show = !terms.length || terms.every((term) => haystack.includes(term));
      row.classList.toggle('is-filtered-out', !show);
    }
    if (romEmpty) romEmpty.hidden = visibleRomRows().length !== 0;
    if (selectedRom && selectedRom.classList.contains('is-filtered-out')) {
      const first = visibleRomRows()[0];
      if (first) selectRom(first, { scroll: false });
    }
    updateRomCount();
  }

  function makeUserRomRow(record) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'rom-item';
    row.dataset.user = record.id;
    row.dataset.search = `${record.name} ${record.ext} saved your data`.toLowerCase();
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', 'false');

    const index = document.createElement('span');
    index.className = 'rom-item-index';
    index.setAttribute('aria-hidden', 'true');
    index.textContent = '＋';

    const art = document.createElement('span');
    art.className = 'rom-item-art';
    art.setAttribute('aria-hidden', 'true');
    art.textContent = (record.ext || 'rom').toUpperCase();

    const copy = document.createElement('span');
    copy.className = 'rom-item-copy';
    const title = document.createElement('span');
    title.className = 'rom-item-title';
    title.textContent = String(record.name || 'Saved ROM').replace(/\.[^.]+$/, '');
    const meta = document.createElement('span');
    meta.className = 'rom-item-meta';
    meta.textContent = `${(record.ext || 'rom').toUpperCase()} · Saved · ${formatSize(record.size)}`;
    copy.append(title, meta);

    const chip = document.createElement('span');
    chip.className = 'rom-item-chip';
    chip.dataset.kind = 'data';
    chip.textContent = 'Yours';

    const go = document.createElement('span');
    go.className = 'rom-item-go';
    go.setAttribute('aria-hidden', 'true');
    go.textContent = '▶';

    row.append(index, art, copy, chip, go);
    row.addEventListener('focus', () => selectRom(row));
    row.addEventListener('mouseenter', () => selectRom(row));
    row.addEventListener('click', () => activateRomItem(row));
    return row;
  }

  function renderUserRoms() {
    if (!romList) return;
    for (const row of romList.querySelectorAll('[data-user]')) row.remove();
    if (userLib) {
      const records = userLib.listSync().filter((record) => record.kind === 'gba');
      const fragment = document.createDocumentFragment();
      for (const record of records) fragment.append(makeUserRomRow(record));
      romList.prepend(fragment);
    }
    applyRomFilter();
  }

  function activateRomItem(row) {
    if (!row) return;
    selectRom(row);
    if (row.dataset.user) {
      bootFromUser(row.dataset.user);
      return;
    }
    const path = row.dataset.rom;
    if (!path) return;
    try {
      history.replaceState(null, '', `?rom=${encodeURIComponent(path)}`);
    } catch (_) { /* ignore */ }
    bootFromQuery(path);
  }

  function showToast(message) {
    let toast = document.querySelector('.gba-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'gba-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function validate(file) {
    if (!file) return 'Choose a ROM file first.';
    if (!ALLOWED.test(file.name)) return 'That is not a .gba, .gb or .gbc file.';
    if (!file.size) return 'That file is empty.';
    if (file.size > MAX_BYTES) return 'That ROM is larger than 64 MB. Choose a smaller file.';
    return '';
  }

  function bootRom(file, options = {}) {
    const problem = validate(file);
    if (problem) {
      showPickerError(problem);
      if (picker) picker.hidden = false;
      return;
    }

    if (options.persist !== false && userLib) {
      userLib.remember(file, { kind: 'gba', handle: options.handle })
        .then((record) => {
          try {
            history.replaceState(null, '', `?user=${encodeURIComponent(record.id)}`);
          } catch (_) { /* ignore */ }
          showToast('Saved to Your data');
          renderUserRoms();
        })
        .catch((error) => {
          console.warn('Unable to save the ROM to Your data:', error);
          showToast('Could not save this ROM to Your data');
        });
    }

    clearPickerError();
    hideBootError();
    if (picker) picker.hidden = true;
    if (boot) boot.hidden = false;
    setBootStatus(`Preparing ${file.name}…`);

    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      currentUrl = '';
    }
    currentUrl = URL.createObjectURL(file);

    window.EJS_player = '#dos';
    window.EJS_core = 'gba';
    window.EJS_gameUrl = currentUrl;
    window.EJS_gameName = file.name.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_') || 'game';
    window.EJS_pathtodata = '../../vendor/emulatorjs/data/';
    window.EJS_startOnLoaded = true;
    window.EJS_language = 'en-US';
    window.EJS_disableAutoLang = true;
    window.EJS_defaultOptions = {
      'virtual-gamepad': 'disabled',
      // Keep save states in IndexedDB instead of downloading them, and flush
      // battery saves to storage every 30 seconds so a closed tab loses less.
      'save-state-location': 'browser',
      'save-save-interval': '30',
    };
    window.EJS_Buttons = { fullscreen: false };

    window.EJS_ready = () => {
      if (!started) setBootStatus(`Starting ${file.name}…`);
      watchSaveStorage();
    };

    window.EJS_onGameStart = () => {
      started = true;
      watchSaveStorage();
      clearTimeout(bootTimer);
      if (boot) boot.hidden = true;
      hideBootError();
      if (changeRom) changeRom.hidden = false;
      document.body.classList.add('is-gba-ready');
      focusGame();
      loadTouchControls();
      resizeGame();
      setTimeout(resizeGame, 240);
    };

    bootTimer = setTimeout(() => {
      if (started) return;
      showBootError('The ROM did not start. Reload the cabinet and try another .gba, .gb or .gbc file.');
    }, BOOT_TIMEOUT);

    const loader = document.createElement('script');
    loader.src = '../../vendor/emulatorjs/data/loader.js';
    loader.onerror = () => showBootError(
      'The emulator could not be loaded. Check that vendor/emulatorjs/ is served next to the arcade.',
    );
    document.body.appendChild(loader);
  }

  async function bootFromQuery(raw) {
    let url;
    try {
      url = new URL(raw, location.href);
    } catch (_) {
      showPickerError('The ?rom= link is not a valid URL.');
      return;
    }
    if (url.origin !== location.origin) {
      showPickerError('For safety, ?rom= must point at a ROM hosted on this site.');
      return;
    }

    if (picker) picker.hidden = true;
    if (boot) boot.hidden = false;
    setBootStatus('Fetching ROM…');
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const name = decodeURIComponent(url.pathname.split('/').pop() || 'game.gba');
      bootRom(new File([blob], name, { type: 'application/octet-stream' }), { persist: false });
    } catch (error) {
      console.warn('GBA ROM fetch failed:', error);
      if (boot) boot.hidden = true;
      if (picker) picker.hidden = false;
      showPickerError(`Could not fetch that ROM (${error.message}). Check the path and reload.`);
    }
  }

  async function bootFromUser(id) {
    if (!userLib) {
      showPickerError('Saved files are not available in this browser.');
      return;
    }
    if (picker) picker.hidden = true;
    if (boot) boot.hidden = false;
    setBootStatus('Loading saved ROM…');
    try {
      const file = await userLib.getFile(id);
      bootRom(file, { persist: false });
    } catch (error) {
      console.warn('Unable to load the saved ROM:', error);
      if (boot) boot.hidden = true;
      if (picker) picker.hidden = false;
      showPickerError(error instanceof Error ? error.message : 'That saved ROM could not be loaded.');
    }
  }

  /* -------------------------------------------------------- ROM list wiring */

  for (const row of romRows()) {
    row.addEventListener('click', () => activateRomItem(row));
    row.addEventListener('focus', () => selectRom(row));
    row.addEventListener('mouseenter', () => selectRom(row));
  }

  function focusRom(offset) {
    const visible = visibleRomRows();
    if (!visible.length) return;
    const current = selectedRom && visible.includes(selectedRom)
      ? visible.indexOf(selectedRom)
      : 0;
    const next = Math.min(visible.length - 1, Math.max(0, current + offset));
    selectRom(visible[next], { scroll: true });
    visible[next].focus({ preventScroll: true });
  }

  romList?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusRom(1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      focusRom(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      const first = visibleRomRows()[0];
      if (first) {
        selectRom(first, { scroll: true });
        first.focus({ preventScroll: true });
      }
    } else if (event.key === 'End') {
      event.preventDefault();
      const visible = visibleRomRows();
      const last = visible[visible.length - 1];
      if (last) {
        selectRom(last, { scroll: true });
        last.focus({ preventScroll: true });
      }
    }
  });

  function syncRomSearch() {
    if (!romSearchClear) return;
    romSearchClear.hidden = !romQuery;
  }

  romSearch?.addEventListener('input', () => {
    romQuery = romSearch.value.trim();
    syncRomSearch();
    applyRomFilter();
  });

  romSearch?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      romSearch.value = '';
      romQuery = '';
      syncRomSearch();
      applyRomFilter();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const first = visibleRomRows()[0];
      if (first) {
        selectRom(first, { scroll: true });
        first.focus({ preventScroll: true });
      }
    }
  });

  romSearchClear?.addEventListener('click', () => {
    if (romSearch) romSearch.value = '';
    romQuery = '';
    syncRomSearch();
    applyRomFilter();
    romSearch?.focus();
  });

  renderUserRoms();
  const initial = visibleRomRows()[0];
  if (initial) selectRom(initial);

  /* ------------------------------------------------------------ file picker */

  async function chooseRom() {
    if (userLib && userLib.canPick()) {
      try {
        const picked = await userLib.pick({
          types: [{
            description: 'Game Boy ROM',
            accept: { 'application/octet-stream': ['.gba', '.gb', '.gbc'] },
          }],
        });
        if (picked && picked.file) {
          bootRom(picked.file, { handle: picked.handle });
          return;
        }
        if (picked === null) return; // dialog dismissed or unsupported
      } catch (error) {
        console.warn('File picker unavailable; falling back to the input.', error);
      }
    }
    fileInput?.click();
  }

  for (const button of document.querySelectorAll('[data-choose-rom]')) {
    button.addEventListener('click', chooseRom);
  }

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (file) bootRom(file);
  });

  if (dropzone) {
    const stop = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    for (const type of ['dragenter', 'dragover']) {
      dropzone.addEventListener(type, (event) => {
        stop(event);
        dropzone.classList.add('is-dragover');
      });
    }
    for (const type of ['dragleave', 'dragend', 'drop']) {
      dropzone.addEventListener(type, (event) => {
        stop(event);
        dropzone.classList.remove('is-dragover');
      });
    }
    dropzone.addEventListener('drop', (event) => {
      const file = event.dataTransfer?.files?.[0];
      if (file) bootRom(file);
    });
  }

  // Dropping a ROM outside the zone should not navigate away from the cabinet.
  for (const type of ['dragover', 'drop']) {
    window.addEventListener(type, (event) => event.preventDefault());
  }

  changeRom?.addEventListener('click', () => {
    // Reloading is the cleanest way to dispose the running core and its Blob URL.
    location.href = location.pathname;
  });

  bootReload?.addEventListener('click', () => {
    location.href = location.pathname;
  });

  /* ------------------------------------------------------------- fullscreen */

  const requestFs = document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen;
  const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;

  function showRotateHint() {
    if (document.querySelector('.rotate-hint')) return;
    const hint = document.createElement('div');
    hint.className = 'rotate-hint';
    hint.textContent = '↻ Rotate your phone for the big screen';
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 2800);
  }

  function syncFs() {
    const on = Boolean(fsElement()) || document.body.classList.contains('is-fullscreen');
    document.body.classList.toggle('is-fullscreen', on);
    if (fsBtn) {
      fsBtn.setAttribute('aria-pressed', String(on));
      const label = fsBtn.querySelector('span:last-child');
      if (label) label.textContent = on ? 'Exit' : 'Fullscreen';
    }
    setToolbar(false);
    resizeGame();
  }

  /* The fullscreen toolbar is hidden by default. A top-left tab or a swipe from
     the top edge reveals it; it auto-hides when idle, and a swipe up dismisses it. */
  let toolbarTimer = 0;
  let barStartY = null;

  function setToolbar(open) {
    document.body.classList.toggle('is-toolbar-open', open);
    if (toolbarReveal) toolbarReveal.setAttribute('aria-expanded', String(open));
    clearTimeout(toolbarTimer);
    if (open) toolbarTimer = setTimeout(() => setToolbar(false), 4200);
  }

  function resetToolbarTimer() {
    if (!document.body.classList.contains('is-toolbar-open')) return;
    clearTimeout(toolbarTimer);
    toolbarTimer = setTimeout(() => setToolbar(false), 4200);
  }

  toolbarReveal?.addEventListener('click', () => setToolbar(true));

  document.addEventListener('pointerdown', (event) => {
    if (!document.body.classList.contains('is-fullscreen')) return;
    if (document.body.classList.contains('is-toolbar-open')) {
      if (!bar?.contains(event.target) && event.target !== toolbarReveal) setToolbar(false);
      return;
    }
    if (event.clientY <= 28) setToolbar(true);
  });

  bar?.addEventListener('pointerdown', (event) => {
    barStartY = event.clientY;
    resetToolbarTimer();
  });

  bar?.addEventListener('pointerup', (event) => {
    if (barStartY !== null && event.clientY - barStartY < -28) setToolbar(false);
    barStartY = null;
    resetToolbarTimer();
  });

  fsBtn?.addEventListener('click', async () => {
    try {
      if (!requestFs) {
        document.body.classList.toggle('is-fullscreen');
        syncFs();
        return;
      }
      if (!fsElement()) {
        try {
          await requestFs.call(document.documentElement, { navigationUI: 'hide' });
        } catch (_) {
          await requestFs.call(document.documentElement);
        }
        try { await screen.orientation?.lock?.('landscape'); } catch (_) { /* optional */ }
        if (window.innerHeight > window.innerWidth) showRotateHint();
      } else {
        await exitFs.call(document);
      }
    } catch (error) {
      console.warn('Fullscreen unavailable:', error);
    }
  });

  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (document.body.classList.contains('is-toolbar-open')) {
        setToolbar(false);
        return;
      }
      if (!requestFs) {
        document.body.classList.remove('is-fullscreen');
        syncFs();
      }
    }
  });

  /* ---------------------------------------------------------------- start up */

  const savedId = params.get('user');
  const preset = params.get('rom');
  if (savedId) {
    bootFromUser(savedId);
  } else if (preset) {
    bootFromQuery(preset);
  } else {
    requestAnimationFrame(() => {
      document.querySelector('[data-choose-rom]')?.focus({ preventScroll: true });
    });
  }
})();
