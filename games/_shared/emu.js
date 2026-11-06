/* Shared js-dos cabinet shell. Expects:
   <div id="dos" data-bundle="game.jsdos"></div> */
(() => {
  'use strict';

  const el = document.getElementById('dos');
  const err = document.getElementById('boot-error');
  const fsBtn = document.getElementById('fs');
  const preset = el && el.dataset.bundle;
  const params = new URLSearchParams(location.search);
  const queryUrl = params.get('url');

  function fail(message) {
    if (!err) return;
    if (message) {
      const line = err.querySelector('div');
      if (line) line.insertAdjacentHTML('afterbegin', `<b>${message}</b>`);
    }
    err.hidden = false;
  }

  if (!el) return;

  if (typeof window.Dos !== 'function') {
    fail('js-dos failed to load.');
    return;
  }

  try {
    const url = queryUrl || (preset ? new URL(preset, location.href).href : undefined);
    window.dos = window.Dos(el, {
      pathPrefix: '../../vendor/js-dos/emulators/',
      theme: 'dark',
      renderBackend: 'canvas',
      workerThread: true,
      autoSave: true,
      autoStart: true,
      kiosk: true,
      ...(url ? { url } : {}),
      onEvent: (name, data) => {
        if (name === 'ws-err' || name === 'emu-error') {
          console.error('js-dos', name, data);
        }
      },
    });
  } catch (e) {
    console.error(e);
    fail(String(e && e.message ? e.message : e));
  }

  /* ---------------------------------------------------------- fullscreen */
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
    const on = Boolean(fsElement());
    document.body.classList.toggle('is-fullscreen', on);
    if (fsBtn) {
      fsBtn.setAttribute('aria-pressed', String(on));
      const label = fsBtn.querySelector('span:last-child');
      if (label) label.textContent = on ? 'Exit' : 'Fullscreen';
    }
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
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
      } catch (e) {
        console.warn('Fullscreen unavailable:', e);
      }
    });

    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !requestFs) {
        document.body.classList.remove('is-fullscreen');
        syncFs();
      }
    });
  }

  setTimeout(() => {
    if (!el.firstElementChild) fail('The DOS window never appeared.');
  }, 7000);
})();
