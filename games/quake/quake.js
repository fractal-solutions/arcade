/* Quake cabinet — Qwasm engine, bundled LibreQuake data, PSP-style touch controls.
   The engine is loaded as a classic script so it can publish Module/FS globals. */

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const stage = $('#stage');
  const canvas = $('#canvas');
  const output = $('#output');
  const boot = $('#boot');
  const bootStatus = $('#boot-status');
  const bootProgress = $('#boot-progress');
  const bootProgressBar = bootProgress ? bootProgress.querySelector('span') : null;
  const bootError = $('#boot-error');
  const pakInput = $('#pak-input');
  const pakMeta = $('#pak-meta');
  const launchLq = $('#launch-lq');
  const launchPak = $('#launch-pak');
  const padToggle = $('#pad-toggle');
  const fsBtn = $('#fs');
  const stick = $('#stick');
  const nub = $('#nub');
  const look = $('#look');
  const hint = $('#hint');

  const coarse = window.matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints || 0) > 0;

  const PAK_NAMES = ['pak0.pak', 'pak1.pak', 'pak2.pak', 'pak3.pak', 'pak4.pak', 'pak5.pak'];
  const KEY_NAME = {
    KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
    ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
    Space: ' ', ControlLeft: 'Control', Tab: 'Tab', Escape: 'Escape', Enter: 'Enter',
  };

  let mode = null;            // 'lq' | 'pak'
  let started = false;
  let playing = false;
  let engineName = 'qwasm-sw';
  let pakData = {};
  const userPaks = {};

  /* ------------------------------------------------------------- boot UI */

  function setStatus(text, fraction) {
    if (!bootStatus) return;
    bootStatus.textContent = text || '';
    if (typeof fraction === 'number' && bootProgress && bootProgressBar) {
      bootProgress.hidden = false;
      bootProgressBar.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
    }
  }

  function fail(message) {
    if (!bootError) return;
    bootError.hidden = false;
    bootError.textContent = message;
  }

  function updatePakMeta() {
    const names = Object.keys(userPaks).sort();
    if (!names.length) {
      pakMeta.innerHTML = '<b>Bundled:</b> LibreQuake (free data) · <b>Optional:</b> your own PAK0/PAK1';
      launchPak.disabled = true;
      return;
    }
    const hasPak0 = Boolean(userPaks['pak0.pak']);
    pakMeta.innerHTML = `<b>Loaded:</b> ${names.join(', ')}${hasPak0 ? '' : ' · PAK0.PAK is required'}`;
    launchPak.disabled = !hasPak0;
  }

  pakInput.addEventListener('change', async () => {
    const files = Array.from(pakInput.files || []);
    if (!files.length) return;
    setStatus('Reading PAK files…', 0);
    for (const file of files) {
      const name = file.name.toLowerCase();
      if (!/^pak[0-9]+\.pak$/.test(name)) continue;
      try {
        userPaks[name] = new Uint8Array(await file.arrayBuffer());
      } catch (err) {
        fail(`Could not read ${file.name}: ${err && err.message ? err.message : err}`);
      }
    }
    pakInput.value = '';
    updatePakMeta();
    setStatus('');
    if (bootProgress) bootProgress.hidden = true;
  });

  /* --------------------------------------------------------- PAK fetching */

  async function fetchPak(url, onProgress) {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
    const total = Number(response.headers.get('content-length')) || 0;
    if (!response.body || !total) {
      return new Uint8Array(await response.arrayBuffer());
    }
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (onProgress) onProgress(received / total);
    }
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes;
  }

  async function loadLibreQuake() {
    const data = {};
    for (let i = 0; i < PAK_NAMES.length; i++) {
      const name = PAK_NAMES[i];
      const label = `Fetching ${name} · ${i + 1}/${PAK_NAMES.length}`;
      setStatus(label, i / PAK_NAMES.length);
      data[name] = await fetchPak(`data/${name}`, (frac) => {
        setStatus(label, (i + frac) / PAK_NAMES.length);
      });
    }
    return data;
  }

  /* ------------------------------------------------------------- engine */

  function hasWebGL() {
    try {
      const probe = document.createElement('canvas');
      return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
    } catch (_) {
      return false;
    }
  }

  function buildArgs() {
    const small = coarse || window.innerWidth < 900;
    const width = small ? 800 : 1280;
    const height = small ? 450 : 720;
    const args = [];
    if (mode === 'lq') args.push('-game', 'lq1', '-listen', '8');
    args.push('-winsize', String(width), String(height), '+fov', '106.26', '+scr_conspeed', String(height));
    if (engineName === 'qwasm-gl') args.push('+gl_texturemode', 'GL_LINEAR_MIPMAP_LINEAR');
    return args;
  }

  function fitCanvas() {
    // Qwasm sizes the canvas against the viewport. The stage is smaller than
    // the viewport when the header is visible, so scale to the stage instead.
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    const cw = canvas.width;
    const ch = canvas.height;
    if (!rect.width || !rect.height || !cw || !ch) return;
    const scale = Math.min(rect.width / cw, rect.height / ch);
    const width = Math.max(1, Math.floor(cw * scale));
    const height = Math.max(1, Math.floor(ch * scale));
    canvas.style.setProperty('width', `${width}px`, 'important');
    canvas.style.setProperty('height', `${height}px`, 'important');
  }

  function bootEngine() {
    engineName = hasWebGL() ? 'qwasm-gl' : 'qwasm-sw';
    setStatus(`Initialising ${engineName === 'qwasm-gl' ? 'WebGL' : 'software'} engine…`, 0.72);

    const Module = {
      _canLockPointer: true,
      _depsLastLeft: 0,
      _depsDone: 0,
      _depsTotal: 0,
      canvas,
      arguments: buildArgs(),

      print(text) {
        output.value += `${text}\n`;
        if (output.value.length > 1048576) output.value = output.value.slice(-524288);
        output.scrollTop = output.scrollHeight;
      },

      printErr(text) {
        console.error(text);
        output.value += `(!) ${text}\n`;
        if (output.value.length > 1048576) output.value = output.value.slice(-524288);
        if (/couldn.t load|gamedir|pak0|no such file/i.test(String(text))) {
          fail(`Engine: ${text}`);
        }
        if (/must have the registered version/i.test(String(text))) {
          fail('These PAKs belong to a modified game (for example LibreQuake) but the set is incomplete. Add the matching PAK1.PAK, or use the bundled LibreQuake launch instead.');
        }
      },

      setStatus(text) {
        if (!text) return;
        const match = String(text).match(/\((\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?|\?)\)/);
        if (match) {
          const from = Number(match[1]);
          const total = match[2] === '?' ? 0 : Number(match[2]);
          const frac = total ? 0.72 + (from / total) * 0.26 : 0.8;
          setStatus(String(text).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''), frac);
        } else {
          setStatus(String(text).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''), 0.7);
        }
      },

      monitorRunDependencies(left) {
        const diff = Module._depsLastLeft - left;
        if (!diff) return;
        if (diff > 0) Module._depsDone += diff;
        else Module._depsTotal -= diff;
        Module._depsLastLeft = left;
        setStatus(`Preparing engine · ${Module._depsDone} done, ${Module._depsTotal} found`, 0.7);
      },

      onRuntimeInitialized() {
        try {
          for (const dir of ['/id1', '/lq1']) {
            try { FS.mkdir(dir); } catch (_) { /* already exists */ }
          }
          for (const [name, bytes] of Object.entries(pakData)) {
            const folders = mode === 'lq' ? ['/lq1'] : ['/id1'];
            for (const folder of folders) {
              const file = FS.open(`${folder}/${name}`, 'w');
              FS.write(file, bytes, 0, bytes.length, 0);
              FS.close(file);
            }
          }
        } catch (err) {
          fail(`Could not mount game data: ${err && err.message ? err.message : err}`);
          return;
        }
        Module.showConsole();
        setStatus('Starting Quake…', 0.99);
      },

      showConsole() {
        output.style.display = 'block';
        canvas.style.display = 'none';
        output.scrollTop = output.scrollHeight;
      },

      hideConsole() {
        output.style.display = 'none';
        canvas.style.display = 'block';
        canvas.focus();
        boot.hidden = true;
        playing = true;
        document.body.classList.add('is-playing');
        fitCanvas();
      },

      exportFile() { /* not needed inside the arcade */ },

      setGamma(vidGamma) {
        const value = Number(Number(vidGamma).toFixed(2));
        canvas.style.filter = `brightness(${(1.35 - value) * 2})`;
      },

      captureMouse() {
        if (coarse) return;
        if (!Module._canLockPointer || !Module._attemptPointerLock()) {
          Module._canLockPointer = false;
          document.addEventListener('keydown', Module._lockPointerOnKey);
        }
      },

      _attemptPointerLock() {
        if (document.pointerLockElement === null) {
          try { canvas.requestPointerLock(); } catch (_) { /* unavailable */ }
        }
        return document.pointerLockElement !== null;
      },

      _lockPointerOnKey(event) {
        if (event.key === 'Escape' || Module._attemptPointerLock()) {
          document.removeEventListener('keydown', Module._lockPointerOnKey);
          Module._canLockPointer = true;
        }
      },
    };

    window.Module = Module;

    // Touch input is handled by the PSP overlay. Pointer lock would swallow it.
    if (coarse) canvas.requestPointerLock = () => {};

    const script = document.createElement('script');
    script.src = `${engineName}.js`;
    script.async = true;
    script.onerror = () => fail('The Quake engine failed to load. Check that the files in games/quake/ are being served.');
    document.body.appendChild(script);
  }

  /* ------------------------------------------------------------- start */

  async function start(kind) {
    if (started) return;
    started = true;
    mode = kind;
    launchLq.disabled = true;
    launchPak.disabled = true;
    pakInput.disabled = true;
    if (bootError) bootError.hidden = true;

    try {
      if (kind === 'lq') {
        pakData = await loadLibreQuake();
      } else {
        pakData = { ...userPaks };
        if (!pakData['pak0.pak']) throw new Error('Choose a PAK0.PAK from your own copy of Quake first.');
      }
      setStatus('Booting engine…', 0.7);
      bootEngine();
    } catch (err) {
      started = false;
      mode = null;
      launchLq.disabled = false;
      launchPak.disabled = !userPaks['pak0.pak'];
      pakInput.disabled = false;
      if (bootProgress) bootProgress.hidden = true;
      setStatus('Startup failed.');
      fail(err && err.message ? err.message : String(err));
      return;
    }

    // If the engine never reports that the game is up, say so rather than
    // leaving a spinner on screen forever.
    window.setTimeout(() => {
      if (!playing && !bootError.hidden) return;
      if (!playing) fail('The engine did not start. Try the software renderer or reload the page.');
    }, 30000);
  }

  launchLq.addEventListener('click', () => start('lq'));
  launchPak.addEventListener('click', () => start('pak'));

  /* ------------------------------------------------------ touch controls */

  let menuMode = false;
  const moveHeld = new Set();
  let stickPointer = null;
  let lookPointer = null;
  let lookLastX = 0;
  let lookLastY = 0;
  let lookAccX = 0;
  let lookAccY = 0;

  function key(type, code) {
    window.dispatchEvent(new KeyboardEvent(type, {
      code,
      key: KEY_NAME[code] || '',
      bubbles: true,
      cancelable: true,
    }));
  }

  function setMove(next) {
    for (const held of Array.from(moveHeld)) {
      if (!next.has(held)) {
        key('keyup', held);
        moveHeld.delete(held);
      }
    }
    for (const code of next) {
      if (!moveHeld.has(code)) {
        key('keydown', code);
        moveHeld.add(code);
      }
    }
  }

  function clearMove() {
    setMove(new Set());
  }

  function updateStick(event) {
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const max = rect.width * 0.36;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const length = Math.hypot(dx, dy);
    const clamped = Math.min(length, max);
    const angleX = length ? dx / length : 0;
    const angleY = length ? dy / length : 0;
    nub.style.transform = `translate(-50%, -50%) translate(${angleX * clamped}px, ${angleY * clamped}px)`;
    const nx = clamped < max * 0.22 ? 0 : angleX;
    const ny = clamped < max * 0.22 ? 0 : angleY;
    const next = new Set();
    const up = menuMode ? 'ArrowUp' : 'KeyW';
    const down = menuMode ? 'ArrowDown' : 'KeyS';
    const left = menuMode ? 'ArrowLeft' : 'KeyA';
    const right = menuMode ? 'ArrowRight' : 'KeyD';
    if (ny < -0.38) next.add(up);
    if (ny > 0.38) next.add(down);
    if (nx < -0.38) next.add(left);
    if (nx > 0.38) next.add(right);
    setMove(next);
  }

  function resetStick() {
    stickPointer = null;
    stick.classList.remove('is-active');
    nub.style.transform = 'translate(-50%, -50%)';
    clearMove();
  }

  stick.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    stickPointer = event.pointerId;
    stick.classList.add('is-active');
    try { stick.setPointerCapture(event.pointerId); } catch (_) { /* optional */ }
    updateStick(event);
  });
  stick.addEventListener('pointermove', (event) => {
    if (stickPointer !== event.pointerId) return;
    event.preventDefault();
    updateStick(event);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stick.addEventListener(type, (event) => {
      if (stickPointer !== null && event.pointerId !== stickPointer) return;
      resetStick();
    });
  }

  function flushLook() {
    const dx = Math.trunc(lookAccX);
    const dy = Math.trunc(lookAccY);
    if (!dx && !dy) return;
    lookAccX -= dx;
    lookAccY -= dy;
    const rect = canvas.getBoundingClientRect();
    // Qwasm/Emscripten derive mouse deltas from mouseenter -> mouseleave
    // coordinates when pointer lock is unavailable, which is exactly what a
    // touch look pad needs.
    canvas.dispatchEvent(new MouseEvent('mouseenter', {
      clientX: rect.left, clientY: rect.top, bubbles: false,
    }));
    canvas.dispatchEvent(new MouseEvent('mouseleave', {
      clientX: rect.left + dx, clientY: rect.top + dy, bubbles: false,
    }));
  }

  look.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    lookPointer = event.pointerId;
    lookLastX = event.clientX;
    lookLastY = event.clientY;
    lookAccX = 0;
    lookAccY = 0;
    look.classList.add('is-active');
    try { look.setPointerCapture(event.pointerId); } catch (_) { /* optional */ }
  });
  look.addEventListener('pointermove', (event) => {
    if (lookPointer !== event.pointerId) return;
    event.preventDefault();
    const sensitivity = 1.8;
    lookAccX += (event.clientX - lookLastX) * sensitivity;
    lookAccY += (event.clientY - lookLastY) * sensitivity;
    lookLastX = event.clientX;
    lookLastY = event.clientY;
    flushLook();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    look.addEventListener(type, (event) => {
      if (lookPointer !== null && event.pointerId !== lookPointer) return;
      lookPointer = null;
      look.classList.remove('is-active');
      flushLook();
    });
  }

  function wheel(deltaY) {
    canvas.dispatchEvent(new WheelEvent('wheel', {
      deltaY, bubbles: true, cancelable: true,
    }));
  }

  $('#wpn-prev').addEventListener('pointerdown', (event) => {
    event.preventDefault();
    wheel(-100);
  });
  $('#wpn-next').addEventListener('pointerdown', (event) => {
    event.preventDefault();
    wheel(100);
  });

  function setMenuMode(next) {
    menuMode = next;
    clearMove();
    if (hint) {
      hint.textContent = menuMode
        ? 'Menu: stick = arrows · fire = select · menu = close'
        : 'L stick move · R pad look · fire / jump';
    }
  }

  for (const button of document.querySelectorAll('.face-btn')) {
    const action = button.dataset.action;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.classList.add('is-down');
      if (action === 'fire') {
        key('keydown', menuMode ? 'Enter' : 'ControlLeft');
      } else if (action === 'jump') {
        key('keydown', 'Space');
      } else if (action === 'status') {
        key('keydown', 'Tab');
        key('keyup', 'Tab');
      } else if (action === 'menu') {
        key('keydown', 'Escape');
        key('keyup', 'Escape');
        setMenuMode(!menuMode);
      }
    });
    const release = (event) => {
      if (event) event.preventDefault();
      button.classList.remove('is-down');
      if (action === 'fire') key('keyup', menuMode ? 'Enter' : 'ControlLeft');
      else if (action === 'jump') key('keyup', 'Space');
    };
    for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) {
      button.addEventListener(type, release);
    }
  }

  function setPad(on) {
    document.body.classList.toggle('pad-on', on);
    if (padToggle) padToggle.setAttribute('aria-pressed', String(on));
    if (!on) {
      clearMove();
      resetStick();
      setMenuMode(false);
    }
  }

  if (padToggle) {
    padToggle.addEventListener('click', () => {
      setPad(!document.body.classList.contains('pad-on'));
    });
  }

  // Show the pad by default on touch devices, and remember the choice.
  let savedPad = null;
  try { savedPad = localStorage.getItem('arcade.quake.pad'); } catch (_) { /* private mode */ }
  setPad(savedPad === null ? coarse : savedPad === '1');
  if (padToggle) {
    padToggle.addEventListener('click', () => {
      try { localStorage.setItem('arcade.quake.pad', document.body.classList.contains('pad-on') ? '1' : '0'); } catch (_) { /* ignore */ }
    });
  }

  stage.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('gesturestart', (event) => event.preventDefault());

  /* ------------------------------------------------------------ fullscreen */

  const requestFs = document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen;
  const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;

  function showRotateHint() {
    if (document.querySelector('.rotate-hint')) return;
    const note = document.createElement('div');
    note.className = 'rotate-hint';
    note.textContent = '↻ Rotate your phone for the big screen';
    document.body.appendChild(note);
    window.setTimeout(() => note.remove(), 2800);
  }

  function syncFs() {
    const on = Boolean(fsElement());
    document.body.classList.toggle('is-fullscreen', on);
    if (fsBtn) {
      fsBtn.setAttribute('aria-pressed', String(on));
      const label = fsBtn.querySelector('span:last-child');
      if (label) label.textContent = on ? 'Exit' : 'Fullscreen';
    }
    fitCanvas();
    window.dispatchEvent(new Event('resize'));
  }

  if (fsBtn) {
    fsBtn.addEventListener('click', async () => {
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
      } catch (err) {
        console.warn('Fullscreen unavailable:', err);
      }
    });
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
  }

  window.addEventListener('resize', fitCanvas, { passive: true });
  window.addEventListener('orientationchange', () => {
    window.setTimeout(fitCanvas, 120);
  });
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(fitCanvas).observe(stage);
  }
  setInterval(fitCanvas, 2000);

  updatePakMeta();
})();
