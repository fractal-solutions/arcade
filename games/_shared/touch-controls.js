const dosRoot = document.getElementById('dos');
const frame = dosRoot && dosRoot.closest('.frame');
const hasTouch = window.matchMedia('(pointer: coarse)').matches ||
  (navigator.maxTouchPoints || 0) > 0;
const profiles = {
  doom: [
    { label: 'Fire', key: 'Control' }, { label: 'Use', key: 'Space' },
    { label: 'Run', key: 'Shift' }, { label: 'Strafe', key: 'Alt' },
    { label: 'Map', key: 'Tab' }, { label: 'Menu', key: 'Escape' },
  ],
  heretic: [
    { label: 'Fire', key: 'Control' }, { label: 'Use', key: 'Space' },
    { label: 'Run', key: 'Shift' }, { label: 'Strafe', key: 'Alt' },
    { label: 'Inventory', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  wolf3d: [
    { label: 'Fire', key: 'Control' }, { label: 'Open door', key: 'Space' },
    { label: 'Run', key: 'Shift' }, { label: 'Strafe', key: 'Alt' },
    { label: 'Map', key: 'Tab' }, { label: 'Menu', key: 'Escape' },
  ],
  blakestone: [
    { label: 'Fire', key: 'Control' }, { label: 'Use', key: 'Space' },
    { label: 'Run', key: 'Shift' }, { label: 'Strafe', key: 'Alt' },
    { label: 'Inventory', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  kenslabyrinth: [
    { label: 'Fire', key: 'Control' }, { label: 'Jump', key: 'Space' },
    { label: 'Run', key: 'Shift' }, { label: 'Action', key: 'Alt' },
    { label: 'Status', key: 'Tab' }, { label: 'Menu', key: 'Escape' },
  ],
  keen4: [
    { label: 'Jump', key: 'Control' }, { label: 'Pogo', key: 'Alt' },
    { label: 'Fire', key: 'Space' }, { label: 'Run', key: 'Shift' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  duke2: [
    { label: 'Jump', key: 'Control' }, { label: 'Fire', key: 'Alt' },
    { label: 'Action', key: 'Space' }, { label: 'Run', key: 'Shift' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  biomenace: [
    { label: 'Fire', key: 'Control' }, { label: 'Jump', key: 'Alt' },
    { label: 'Action', key: 'Space' }, { label: 'Run', key: 'Shift' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  cosmo: [
    { label: 'Jump', key: 'Control' }, { label: 'Action', key: 'Space' },
    { label: 'Special', key: 'Alt' }, { label: 'Run', key: 'Shift' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  crystal: [
    { label: 'Jump', key: 'Control' }, { label: 'Fire', key: 'Alt' },
    { label: 'Action', key: 'Space' }, { label: 'Run', key: 'Shift' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  harry: [
    { label: 'Fire', key: 'Control' }, { label: 'Jump', key: 'Alt' },
    { label: 'Special', key: 'Space' }, { label: 'Run', key: 'Shift' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  hocus: [
    { label: 'Cast', key: 'Control' }, { label: 'Jump', key: 'Alt' },
    { label: 'Action', key: 'Space' }, { label: 'Run', key: 'Shift' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  jill: [
    { label: 'Jump', key: 'Space' }, { label: 'Action', key: 'Control' },
    { label: 'Special', key: 'Alt' }, { label: 'Run', key: 'Shift' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  jazz: [
    { label: 'Jump', key: 'Space' }, { label: 'Fire', key: 'Control' },
    { label: 'Special', key: 'Alt' }, { label: 'Run', key: 'Shift' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  xargon: [
    { label: 'Jump', key: 'Control' }, { label: 'Fire', key: 'Space' },
    { label: 'Special', key: 'Alt' }, { label: 'Run', key: 'Shift' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  pop2demo: [
    { label: 'Jump / action', key: 'Space' }, { label: 'Strike', key: 'Shift' },
    { label: 'Confirm', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  raptor: [
    { label: 'Fire', key: 'Space' }, { label: 'Bomb', key: 'Alt' },
    { label: 'Special', key: 'Control' }, { label: 'Start', key: 'Enter' },
    { label: 'Status', key: 'Tab' }, { label: 'Menu', key: 'Escape' },
  ],
  tyrian: [
    { label: 'Fire', key: 'Space' }, { label: 'Super bomb', key: 'Alt' },
    { label: 'Special', key: 'Control' }, { label: 'Start', key: 'Enter' },
    { label: 'Status', key: 'Tab' }, { label: 'Menu', key: 'Escape' },
  ],
  majorstryker: [
    { label: 'Fire', key: 'Space' }, { label: 'Bomb', key: 'Alt' },
    { label: 'Special', key: 'Control' }, { label: 'Start', key: 'Enter' },
    { label: 'Status', key: 'Tab' }, { label: 'Menu', key: 'Escape' },
  ],
  sopwith: [
    { label: 'Fire', key: 'Space' }, { label: 'Bomb', key: 'Control' },
    { label: 'Action', key: 'Alt' }, { label: 'Start / confirm', key: 'Enter' },
    { label: 'Menu', key: 'Escape' },
  ],
  solarwinds: [
    { label: 'Fire', key: 'Control' }, { label: 'Thrust', key: 'Space' },
    { label: 'Special', key: 'Alt' }, { label: 'Map', key: 'Tab' },
    { label: 'Select', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  supaplex: [
    { label: 'Wait / action', key: 'Space' }, { label: 'Restart / confirm', key: 'Enter' },
    { label: 'Menu / back', key: 'Escape' },
  ],
  zzt: [
    { label: 'Shoot', key: 'Space' }, { label: 'Use / confirm', key: 'Enter' },
    { label: 'Menu', key: 'Escape' }, { label: 'Wait', key: 'Shift' },
  ],
  scorched: [
    { label: 'Fire', key: 'Space' }, { label: 'Confirm', key: 'Enter' },
    { label: 'Next option', key: 'Tab' }, { label: 'Menu', key: 'Escape' },
  ],
  epicpinball: [
    { label: 'Launch', key: 'Space' }, { label: 'Nudge', key: 'Control' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
  capitalism: [
    { label: 'Select', key: 'Enter' }, { label: 'Back', key: 'Escape' },
    { label: 'Next item', key: 'Tab' }, { label: 'Pause', key: 'Space' },
  ],
  omf: [
    { label: 'Punch', key: 'Control' }, { label: 'Kick', key: 'Alt' },
    { label: 'Jump', key: 'Space' }, { label: 'Block', key: 'Shift' },
    { label: 'Start', key: 'Enter' }, { label: 'Menu', key: 'Escape' },
  ],
};

const keyLabels = {
  Space: 'Space', Control: 'Ctrl', Alt: 'Alt', Enter: 'Enter',
  Escape: 'Esc', Tab: 'Tab', Shift: 'Shift',
};
const defaultActions = [
  { label: 'Action', key: 'Space' }, { label: 'Fire', key: 'Control' },
  { label: 'Special', key: 'Alt' }, { label: 'Start', key: 'Enter' },
  { label: 'Menu', key: 'Escape' }, { label: 'Status', key: 'Tab' },
  { label: 'Modifier', key: 'Shift' },
];

if (dosRoot && frame && hasTouch && !frame.querySelector('.touch-controls')) {
  document.body.classList.add('has-touch-controls');

  const queryBundle = new URLSearchParams(location.search).get('url');
  const queryBundleName = queryBundle
    ? new URL(queryBundle, location.href).pathname.split('/').pop()
    : '';
  const bundle = dosRoot.dataset.bundle || queryBundleName || '';
  const gameSlug = bundle.replace(/\.jsdos$/i, '').toLowerCase() ||
    location.pathname.split('/').filter(Boolean).pop();
  const actions = profiles[gameSlug] || defaultActions;

  const controls = document.createElement('div');
  controls.className = 'touch-controls';
  controls.innerHTML = `
    <details class="touch-toolbar">
      <summary aria-label="Touch controller settings" title="Touch controller settings">
        <span aria-hidden="true">⚙</span>
      </summary>
      <div class="touch-settings">
        <label class="touch-layout-label">PAD
          <select class="touch-layout" aria-label="Touch controller layout">
            <option value="dpad">D-Pad</option>
            <option value="analog">Analog</option>
            <option value="combo">PSP Combo</option>
            ${['doom', 'heretic', 'wolf3d', 'blakestone', 'kenslabyrinth'].includes(gameSlug)
    ? '<option value="dual">Dual Analog</option>' : ''}
          </select>
        </label>
        <button class="touch-haptics" type="button" aria-pressed="false">Haptics off</button>
      </div>
    </details>
    <section class="touch-side touch-move" aria-label="Movement controls">
      <span class="touch-label">MOVE</span>
      <div class="touch-dpad">
        <button class="touch-key key-up" type="button" data-key="ArrowUp" aria-label="Move up">▲</button>
        <button class="touch-key key-left" type="button" data-key="ArrowLeft" aria-label="Move left">◀</button>
        <button class="touch-key key-right" type="button" data-key="ArrowRight" aria-label="Move right">▶</button>
        <button class="touch-key key-down" type="button" data-key="ArrowDown" aria-label="Move down">▼</button>
        <button class="touch-key key-center" type="button" data-key="Enter" aria-label="Enter or confirm">OK</button>
      </div>
      <div class="touch-stick move-stick" role="application" aria-label="Analog movement stick">
        <span class="touch-stick-ring" aria-hidden="true"></span>
        <span class="touch-stick-nub" aria-hidden="true"></span>
      </div>
    </section>
    <section class="touch-side touch-actions" aria-label="Keyboard controls">
      <span class="touch-label">ACTIONS</span>
      <div class="touch-stick look-stick" role="application" aria-label="Analog look stick">
        <span class="touch-stick-ring" aria-hidden="true"></span>
        <span class="touch-stick-nub" aria-hidden="true"></span>
      </div>
      <div class="touch-action-grid"></div>
    </section>`;
  const actionGrid = controls.querySelector('.touch-action-grid');
  actions.forEach(({ label, key }) => {
    const button = document.createElement('button');
    const index = actionGrid.children.length;
    const utilityClass = key === 'Enter'
      ? ' touch-utility-key touch-confirm-key'
      : key === 'Escape'
        ? ' touch-utility-key touch-menu-key'
        : index >= 4 ? ' touch-utility-key touch-secondary-key' : '';
    button.className = `touch-key touch-action-key${utilityClass}`;
    button.type = 'button';
    button.dataset.key = key;
    button.setAttribute('aria-label', `${label} (${keyLabels[key]})`);

    const actionName = document.createElement('span');
    actionName.className = 'touch-action-name';
    actionName.textContent = label;
    const keyHint = document.createElement('span');
    keyHint.className = 'touch-key-hint';
    keyHint.textContent = keyLabels[key];
    button.append(actionName, keyHint);
    actionGrid.append(button);
  });
  frame.append(controls);
  const header = document.querySelector('.bar');
  const toolbar = controls.querySelector('.touch-toolbar');
  if (header && toolbar) header.append(toolbar);
  const layoutSelect = toolbar.querySelector('.touch-layout');
  const hapticsButton = toolbar.querySelector('.touch-haptics');
  let savedLayout = null;
  let hapticsEnabled = false;
  try {
    savedLayout = localStorage.getItem(`arcade.touch.layout.${gameSlug}`);
    hapticsEnabled = localStorage.getItem('arcade.touch.haptics') === '1';
  } catch (_) {
    savedLayout = null;
  }
  const defaultLayout = ['doom', 'heretic', 'wolf3d', 'blakestone', 'kenslabyrinth'].includes(gameSlug)
    ? 'dual'
    : 'combo';
  const availableLayouts = Array.from(layoutSelect.options).map((option) => option.value);
  const initialLayout = savedLayout && availableLayouts.includes(savedLayout)
    ? savedLayout
    : defaultLayout;
  layoutSelect.value = initialLayout;
  controls.dataset.layout = initialLayout;
  hapticsButton.setAttribute('aria-pressed', String(hapticsEnabled));
  hapticsButton.textContent = typeof navigator.vibrate === 'function'
    ? (hapticsEnabled ? 'Haptics on' : 'Haptics off')
    : 'Haptics n/a';
  hapticsButton.disabled = typeof navigator.vibrate !== 'function';

  layoutSelect.addEventListener('change', () => {
    const nextLayout = availableLayouts.includes(layoutSelect.value) ? layoutSelect.value : defaultLayout;
    controls.dataset.layout = nextLayout;
    try {
      localStorage.setItem(`arcade.touch.layout.${gameSlug}`, nextLayout);
    } catch (error) {
      console.warn('Unable to save touch layout:', error);
    }
    releaseAll();
    toolbar.open = false;
  });

  let lastVibration = 0;
  function vibrate() {
    if (!hapticsEnabled || typeof navigator.vibrate !== 'function') return;
    const now = performance.now();
    if (now - lastVibration < 50) return;
    lastVibration = now;
    navigator.vibrate(12);
  }

  hapticsButton.addEventListener('click', () => {
    hapticsEnabled = !hapticsEnabled;
    hapticsButton.setAttribute('aria-pressed', String(hapticsEnabled));
    hapticsButton.textContent = hapticsEnabled ? 'Haptics on' : 'Haptics off';
    try {
      localStorage.setItem('arcade.touch.haptics', hapticsEnabled ? '1' : '0');
    } catch (error) {
      console.warn('Unable to save haptics preference:', error);
    }
    if (hapticsEnabled) vibrate();
    toolbar.open = false;
  });

  const keys = {
    ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
    ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
    ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
    ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
    Space: { key: ' ', code: 'Space', keyCode: 32 },
    Control: { key: 'Control', code: 'ControlLeft', keyCode: 17 },
    Alt: { key: 'Alt', code: 'AltLeft', keyCode: 18 },
    Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
    Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
    Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
    Shift: { key: 'Shift', code: 'ShiftLeft', keyCode: 16 },
  };
  const activePointers = new Map();
  const pressedCounts = new Map();

  function dispatchKey(type, name) {
    const key = keys[name];
    if (!key) return;
    window.dispatchEvent(new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      key: key.key,
      code: key.code,
      keyCode: key.keyCode,
      which: key.keyCode,
    }));
  }

  function press(name) {
    const count = pressedCounts.get(name) || 0;
    pressedCounts.set(name, count + 1);
    if (count === 0) dispatchKey('keydown', name);
  }

  function release(name) {
    const count = pressedCounts.get(name) || 0;
    if (count <= 1) {
      pressedCounts.delete(name);
      if (count) dispatchKey('keyup', name);
    } else {
      pressedCounts.set(name, count - 1);
    }
  }

  function releaseAll() {
    for (const pointerId of activePointers.keys()) releasePointer(pointerId);
    for (const stick of controls.querySelectorAll('.touch-stick')) {
      stick.classList.remove('is-active');
      stick.querySelector('.touch-stick-nub').style.transform = 'translate(-50%, -50%)';
    }
  }

  function updatePointerKeys(pointerId, nextKeys) {
    const state = activePointers.get(pointerId);
    if (!state) return;
    const previousKeys = state.keys || [];
    for (const key of previousKeys) if (!nextKeys.includes(key)) release(key);
    for (const key of nextKeys) if (!previousKeys.includes(key)) {
      press(key);
      vibrate();
    }
    state.keys = nextKeys;
  }

  function releasePointer(pointerId) {
    const state = activePointers.get(pointerId);
    if (!state) return;
    for (const key of state.keys || []) release(key);
    if (state.button) state.button.classList.remove('is-down');
    if (state.stick) {
      state.stick.classList.remove('is-active');
      state.stick.querySelector('.touch-stick-nub').style.transform = 'translate(-50%, -50%)';
    }
    activePointers.delete(pointerId);
  }

  function moveStickNub(stick, event) {
    const rect = stick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const travel = radius * 0.34;
    const scale = distance > travel ? travel / distance : 1;
    stick.querySelector('.touch-stick-nub').style.transform =
      `translate(calc(-50% + ${dx * scale}px), calc(-50% + ${dy * scale}px))`;
    return { dx: dx / radius, dy: dy / radius, distance: distance / radius };
  }

  const activeStickDirections = (stick, event) => {
    const { dx, dy, distance } = moveStickNub(stick, event);
    const keysDown = [];
    if (distance >= 0.2) {
      if (dx > 0.38) keysDown.push('ArrowRight');
      if (dx < -0.38) keysDown.push('ArrowLeft');
      if (dy > 0.38) keysDown.push('ArrowDown');
      if (dy < -0.38) keysDown.push('ArrowUp');
    }
    return keysDown;
  };

  function installAnalogStick(stick, { look = false } = {}) {
    let activePointer = null;
    let lookLastX = 0;
    let lookLastY = 0;
    stick.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      activePointer = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      stick.classList.add('is-active');
      activePointers.set(event.pointerId, { stick, keys: [], look });
      if (look) {
        lookLastX = event.clientX;
        lookLastY = event.clientY;
      } else {
        updatePointerKeys(event.pointerId, activeStickDirections(stick, event));
      }
    });

    stick.addEventListener('pointermove', (event) => {
      if (event.pointerId !== activePointer) return;
      event.preventDefault();
      if (look) {
        moveStickNub(stick, event);
        const overlay = dosRoot.querySelector('.emulator-mouse-overlay');
        const movementX = event.clientX - lookLastX;
        const movementY = event.clientY - lookLastY;
        lookLastX = event.clientX;
        lookLastY = event.clientY;
        if (overlay && (movementX || movementY)) {
          const overlayRect = overlay.getBoundingClientRect();
          overlay.dispatchEvent(new PointerEvent('pointermove', {
            pointerId: event.pointerId,
            pointerType: 'touch',
            clientX: overlayRect.left + overlayRect.width / 2,
            clientY: overlayRect.top + overlayRect.height / 2,
            movementX: movementX * 0.9,
            movementY: movementY * 0.9,
          }));
        }
      } else {
        updatePointerKeys(event.pointerId, activeStickDirections(stick, event));
      }
    });

    const endPointer = (event) => {
      if (event.pointerId !== activePointer) return;
      releasePointer(event.pointerId);
      activePointer = null;
    };
    stick.addEventListener('pointerup', endPointer);
    stick.addEventListener('pointercancel', endPointer);
    stick.addEventListener('lostpointercapture', endPointer);
  }

  controls.querySelectorAll('.touch-key').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      if (activePointers.has(event.pointerId)) return;
      activePointers.set(event.pointerId, { button, keys: [button.dataset.key] });
      button.setPointerCapture(event.pointerId);
      button.classList.add('is-down');
      press(button.dataset.key);
      vibrate();
    });

    const endPointer = (event) => {
      releasePointer(event.pointerId);
    };

    button.addEventListener('pointerup', endPointer);
    button.addEventListener('pointercancel', endPointer);
    button.addEventListener('lostpointercapture', endPointer);
    button.addEventListener('click', (event) => {
      if (event.detail !== 0) return;
      const name = button.dataset.key;
      press(name);
      vibrate();
      setTimeout(() => release(name), 100);
    });
  });

  installAnalogStick(controls.querySelector('.move-stick'));
  installAnalogStick(controls.querySelector('.look-stick'), { look: true });

  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAll();
  });
  window.addEventListener('pagehide', releaseAll, { once: true });
}
