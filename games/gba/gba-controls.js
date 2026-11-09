/* Game Boy Advance touch pad. Loaded only after the ROM starts on a touch device. */
(() => {
  'use strict';

  const root = document.getElementById('dos');
  const frame = root && root.closest('.frame');
  const hasTouch = window.matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints || 0) > 0;

  if (!root || !frame || !hasTouch || frame.querySelector('.touch-controls')) return;

  document.body.classList.add('has-touch-controls');

  const controls = document.createElement('div');
  controls.className = 'touch-controls';
  controls.dataset.layout = 'gba';
  controls.innerHTML = `
    <section class="touch-side touch-move" aria-label="D-pad">
      <span class="touch-label">D-PAD</span>
      <div class="touch-dpad">
        <button class="touch-key key-up" type="button" data-gba="up" aria-label="Up">▲</button>
        <button class="touch-key key-left" type="button" data-gba="left" aria-label="Left">◀</button>
        <span class="gba-dpad-hub" aria-hidden="true"></span>
        <button class="touch-key key-right" type="button" data-gba="right" aria-label="Right">▶</button>
        <button class="touch-key key-down" type="button" data-gba="down" aria-label="Down">▼</button>
      </div>
    </section>
    <section class="touch-side touch-actions" aria-label="Game Boy buttons">
      <span class="touch-label">BUTTONS</span>
      <div class="touch-action-grid gba-grid">
        <button class="touch-key touch-action-key gba-l" type="button" data-gba="l" aria-label="L shoulder">
          <span class="touch-action-name">L</span><span class="touch-key-hint">Q</span>
        </button>
        <button class="touch-key touch-action-key gba-r" type="button" data-gba="r" aria-label="R shoulder">
          <span class="touch-action-name">R</span><span class="touch-key-hint">E</span>
        </button>
        <button class="touch-key touch-action-key gba-b" type="button" data-gba="b" aria-label="B button">
          <span class="touch-action-name">B</span><span class="touch-key-hint">X</span>
        </button>
        <button class="touch-key touch-action-key gba-a" type="button" data-gba="a" aria-label="A button">
          <span class="touch-action-name">A</span><span class="touch-key-hint">Z</span>
        </button>
        <button class="touch-key touch-action-key gba-select" type="button" data-gba="select" aria-label="Select button">
          <span class="touch-action-name">Select</span><span class="touch-key-hint">V</span>
        </button>
        <button class="touch-key touch-action-key gba-start" type="button" data-gba="start" aria-label="Start button">
          <span class="touch-action-name">Start</span><span class="touch-key-hint">Enter</span>
        </button>
        <span class="gba-action-hub" aria-hidden="true"></span>
      </div>
    </section>`;
  frame.append(controls);

  /* Haptics live in the header, next to Fullscreen. */
  const header = document.querySelector('.bar');
  let hapticsEnabled = false;
  try {
    hapticsEnabled = localStorage.getItem('arcade.gba.haptics.v1') === '1';
  } catch (_) { /* ignore */ }

  if (header && typeof navigator.vibrate === 'function') {
    const toolbar = document.createElement('details');
    toolbar.className = 'touch-toolbar';
    toolbar.innerHTML = `
      <summary aria-label="Touch controller settings" title="Touch controller settings">
        <span aria-hidden="true">⚙</span>
      </summary>
      <div class="touch-settings">
        <button class="touch-haptics" type="button" aria-pressed="false">Haptics off</button>
        <span class="touch-keyboard-hint">Game Boy buttons are on screen; a physical keyboard also works.</span>
      </div>`;
    header.append(toolbar);

    const hapticsButton = toolbar.querySelector('.touch-haptics');
    hapticsButton.setAttribute('aria-pressed', String(hapticsEnabled));
    hapticsButton.textContent = hapticsEnabled ? 'Haptics on' : 'Haptics off';
    hapticsButton.addEventListener('click', () => {
      hapticsEnabled = !hapticsEnabled;
      hapticsButton.setAttribute('aria-pressed', String(hapticsEnabled));
      hapticsButton.textContent = hapticsEnabled ? 'Haptics on' : 'Haptics off';
      try {
        localStorage.setItem('arcade.gba.haptics.v1', hapticsEnabled ? '1' : '0');
      } catch (error) {
        console.warn('Unable to save GBA haptics preference:', error);
      }
      if (hapticsEnabled) navigator.vibrate(12);
      toolbar.open = false;
    });
  }

  /* EmulatorJS button indices: B=0, SELECT=2, START=3, UP=4, DOWN=5,
     LEFT=6, RIGHT=7, A=8, L=10, R=11. */
  const BUTTONS = {
    b: 0, select: 2, start: 3,
    up: 4, down: 5, left: 6, right: 7,
    a: 8, l: 10, r: 11,
  };

  let lastVibration = 0;
  function vibrate() {
    if (!hapticsEnabled || typeof navigator.vibrate !== 'function') return;
    const now = performance.now();
    if (now - lastVibration < 50) return;
    lastVibration = now;
    navigator.vibrate(12);
  }

  function simulate(name, value) {
    const button = BUTTONS[name];
    if (typeof button !== 'number') return;
    try {
      window.EJS_emulator?.gameManager?.simulateInput?.(0, button, value);
    } catch (error) {
      console.warn('GBA input failed:', error);
    }
  }

  const pressed = new Set();

  function press(name) {
    if (pressed.has(name)) return;
    pressed.add(name);
    simulate(name, 1);
    vibrate();
  }

  function release(name) {
    if (!pressed.delete(name)) return;
    simulate(name, 0);
  }

  function releaseAll() {
    for (const name of [...pressed]) release(name);
    for (const button of controls.querySelectorAll('.is-down')) {
      button.classList.remove('is-down');
    }
  }

  for (const button of controls.querySelectorAll('[data-gba]')) {
    const name = button.dataset.gba;
    let pointerId = null;

    button.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      if (pointerId !== null) return;
      pointerId = event.pointerId;
      try { button.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
      button.classList.add('is-down');
      press(name);
    });

    const endPointer = (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      button.classList.remove('is-down');
      release(name);
    };

    button.addEventListener('pointerup', endPointer);
    button.addEventListener('pointercancel', endPointer);
    button.addEventListener('lostpointercapture', endPointer);

    // Keyboard / assistive activation sends a short tap.
    button.addEventListener('click', (event) => {
      if (event.detail !== 0) return;
      press(name);
      setTimeout(() => release(name), 100);
    });
  }

  controls.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAll();
  });
  window.addEventListener('pagehide', releaseAll, { once: true });
})();
