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

  const ALLOWED = /\.(gba|gb|gbc)$/i;
  const MAX_BYTES = 64 * 1024 * 1024;
  const BOOT_TIMEOUT = 30000;

  let started = false;
  let bootTimer = 0;
  let currentUrl = '';

  if (!root) return;

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
    script.src = 'gba-controls.js?v=20261109b';
    script.dataset.gbaControls = '';
    script.onerror = () => console.warn('GBA touch controls failed to load.');
    document.body.appendChild(script);
  }

  function validate(file) {
    if (!file) return 'Choose a ROM file first.';
    if (!ALLOWED.test(file.name)) return 'That is not a .gba, .gb or .gbc file.';
    if (!file.size) return 'That file is empty.';
    if (file.size > MAX_BYTES) return 'That ROM is larger than 64 MB. Choose a smaller file.';
    return '';
  }

  function bootRom(file) {
    const problem = validate(file);
    if (problem) {
      showPickerError(problem);
      if (picker) picker.hidden = false;
      return;
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
    window.EJS_defaultOptions = { 'virtual-gamepad': 'disabled' };
    window.EJS_Buttons = { fullscreen: false };

    window.EJS_ready = () => {
      if (!started) setBootStatus(`Starting ${file.name}…`);
    };

    window.EJS_onGameStart = () => {
      started = true;
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
      bootRom(new File([blob], name, { type: 'application/octet-stream' }));
    } catch (error) {
      console.warn('GBA ROM fetch failed:', error);
      if (boot) boot.hidden = true;
      if (picker) picker.hidden = false;
      showPickerError(`Could not fetch that ROM (${error.message}). Check the path and reload.`);
    }
  }

  /* ------------------------------------------------------------ file picker */

  for (const button of document.querySelectorAll('[data-rom]')) {
    button.addEventListener('click', () => {
      const path = button.dataset.rom;
      if (!path) return;
      try {
        history.replaceState(null, '', `?rom=${encodeURIComponent(path)}`);
      } catch (_) { /* ignore */ }
      bootFromQuery(path);
    });
  }

  for (const button of document.querySelectorAll('[data-choose-rom]')) {
    button.addEventListener('click', () => fileInput?.click());
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

  const preset = params.get('rom');
  if (preset) {
    bootFromQuery(preset);
  } else {
    requestAnimationFrame(() => {
      document.querySelector('[data-choose-rom]')?.focus({ preventScroll: true });
    });
  }
})();
