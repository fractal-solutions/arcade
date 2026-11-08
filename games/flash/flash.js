(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const LAST_KEY = 'arcade.flash.last.v1';
  const KEYS_KEY = 'arcade.flash.keys.v1';
  const PAD_KEY = 'arcade.flash.pad.v1';

  const KEY_DEFS = {
    ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
    ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
    ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
    ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
    Space: { key: ' ', code: 'Space', keyCode: 32 },
    Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
    Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
    ShiftLeft: { key: 'Shift', code: 'ShiftLeft', keyCode: 16 },
    ControlLeft: { key: 'Control', code: 'ControlLeft', keyCode: 17 },
    AltLeft: { key: 'Alt', code: 'AltLeft', keyCode: 18 },
    KeyQ: { key: 'q', code: 'KeyQ', keyCode: 81 },
    KeyW: { key: 'w', code: 'KeyW', keyCode: 87 },
    KeyO: { key: 'o', code: 'KeyO', keyCode: 79 },
    KeyP: { key: 'p', code: 'KeyP', keyCode: 80 },
  };

  const grid = $('#game-grid');
  const emptyResults = $('#empty-results');
  const searchInput = $('#game-search');
  const genreFilter = $('#genre-filter');
  const playerContainer = $('#player-container');
  const emptyState = $('#empty-state');
  const playerTitle = $('#player-title');
  const playerMeta = $('#player-meta');
  const playerStatus = $('#player-status');
  const captionKicker = $('#caption-kicker');
  const captionTitle = $('#caption-title');
  const captionDescription = $('#caption-description');
  const captionControls = $('#caption-controls');
  const randomButton = $('#random-button');
  const keysButton = $('#keys-button');
  const touchKeys = $('#touch-keys');
  const fullscreenButton = $('#fullscreen-button');
  const closeButton = $('#close-button');
  const playerFrame = $('.player-frame');
  const form = $('#swf-form');
  const fileInput = $('#swf-file');
  const fileName = $('#file-name');
  const loadButton = $('#load-button');
  const clearFileButton = $('#clear-file-button');
  const toolbarReveal = $('#toolbar-reveal');
  const playerToolbar = $('#player-toolbar');
  const shelfRandom = $('#shelf-random');
  const padModeButton = $('#pad-mode-button');
  const touchStick = $('#touch-stick');
  const stickNub = touchStick ? $('.touch-stick-nub', touchStick) : null;

  const state = {
    games: [],
    bySlug: new Map(),
    selected: null,
    current: null,
    player: null,
    genre: 'all',
    query: '',
    lastPlayed: readLast(),
    keys: readKeys(),
    pad: readPad(),
    immersive: false,
  };

  let shelfScrollY = 0;
  let toolbarTimer = 0;

  /* ------------------------------------------------------------- views */

  function enterPlayerView() {
    if (document.body.classList.contains('is-playing')) return;
    shelfScrollY = window.scrollY;
    document.body.classList.add('is-playing');
    window.scrollTo(0, 0);
  }

  function exitPlayerView() {
    if (!document.body.classList.contains('is-playing')) return;
    document.body.classList.remove('is-playing');
    hideToolbar();
    requestAnimationFrame(() => window.scrollTo(0, shelfScrollY));
  }

  function readLast() {
    try {
      return localStorage.getItem(LAST_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function writeLast(slug) {
    state.lastPlayed = slug;
    try { localStorage.setItem(LAST_KEY, slug); } catch (_) { /* storage may be disabled */ }
  }

  function readKeys() {
    try {
      const stored = localStorage.getItem(KEYS_KEY);
      if (stored === '1') return true;
      if (stored === '0') return false;
    } catch (_) { /* storage may be disabled */ }
    return window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
  }

  function writeKeys(on) {
    state.keys = on;
    try { localStorage.setItem(KEYS_KEY, on ? '1' : '0'); } catch (_) { /* storage may be disabled */ }
  }

  function readPad() {
    try {
      const stored = localStorage.getItem(PAD_KEY);
      if (stored === 'dpad' || stored === 'analog') return stored;
    } catch (_) { /* storage may be disabled */ }
    return 'dpad';
  }

  function writePad(mode) {
    state.pad = mode;
    try { localStorage.setItem(PAD_KEY, mode); } catch (_) { /* storage may be disabled */ }
  }

  function report(message, tone = '') {
    playerStatus.textContent = message;
    playerStatus.classList.toggle('is-error', tone === 'error');
    playerStatus.classList.toggle('is-ok', tone === 'ok');
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function posterUrl(game) {
    return `../../${game.poster}`;
  }

  function gameLabel(game) {
    return `${game.title} · ${game.genre} · ${game.year}`;
  }

  /* ------------------------------------------------------------- catalog */

  async function loadCatalog() {
    const response = await fetch('catalog.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load the Flash catalog (HTTP ${response.status}).`);
    const games = await response.json();
    if (!Array.isArray(games) || !games.length) throw new Error('The Flash catalog is empty.');
    state.games = games;
    state.bySlug = new Map(games.map((game) => [game.slug, game]));
    renderGenres();
    renderGrid();
    applyFilters();
    selectInitialGame();
    loadFromQuery();
  }

  function renderGenres() {
    const genres = [...new Set(state.games.map((game) => game.genre))].sort((a, b) => a.localeCompare(b));
    for (const genre of genres) {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      genreFilter.appendChild(option);
    }
  }

  function renderGrid() {
    const fragment = document.createDocumentFragment();
    for (const game of state.games) {
      const card = make('button', 'game-card');
      card.type = 'button';
      card.dataset.slug = game.slug;
      card.style.setProperty('--accent', game.accent);
      card.setAttribute('aria-label', `Play ${game.title}`);

      const art = make('span', 'game-art');
      const image = make('img');
      image.src = posterUrl(game);
      image.alt = '';
      image.width = 800;
      image.height = 500;
      image.loading = 'lazy';
      image.decoding = 'async';
      art.appendChild(image);

      const play = make('span', 'game-play', '▶');
      play.setAttribute('aria-hidden', 'true');
      art.appendChild(play);

      const body = make('span', 'game-body');
      body.appendChild(make('span', 'game-title', game.title));
      body.appendChild(make('span', 'game-meta', `${game.genre} · ${game.year}`));

      card.appendChild(art);
      card.appendChild(body);
      card.addEventListener('click', () => playGame(game));
      fragment.appendChild(card);
    }
    grid.replaceChildren(fragment);
    markLastPlayed();
  }

  function markLastPlayed() {
    for (const card of $$('.game-card', grid)) {
      const isLast = card.dataset.slug === state.lastPlayed;
      const oldBadge = $('.last-badge', card);
      if (isLast && !oldBadge) {
        const badge = make('span', 'last-badge', 'LAST');
        $('.game-art', card).appendChild(badge);
      } else if (!isLast && oldBadge) {
        oldBadge.remove();
      }
    }
  }

  function visibleCards() {
    return $$('.game-card', grid).filter((card) => !card.hidden);
  }

  function matches(game) {
    if (state.genre !== 'all' && game.genre !== state.genre) return false;
    if (!state.query) return true;
    const haystack = `${game.title} ${game.genre} ${game.year} ${game.description}`.toLowerCase();
    return haystack.includes(state.query);
  }

  function applyFilters() {
    let shown = 0;
    for (const card of $$('.game-card', grid)) {
      const game = state.bySlug.get(card.dataset.slug);
      const show = Boolean(game && matches(game));
      card.hidden = !show;
      if (show) shown++;
    }
    emptyResults.hidden = shown !== 0;
    if (state.selected && !matches(state.selected)) {
      const first = visibleCards()[0];
      if (first) selectGame(state.bySlug.get(first.dataset.slug), { scroll: false });
    }
  }

  function selectInitialGame() {
    const preferred = state.lastPlayed && state.bySlug.get(state.lastPlayed);
    const game = preferred || state.games[0];
    if (game) selectGame(game, { scroll: false, quiet: true });
  }

  function setTouchProfile(game) {
    const needsQwop = Boolean(game && /Q\/W|O\/P/i.test(game.controls || ''));
    touchKeys.classList.toggle('has-qwop', needsQwop);
  }

  function selectGame(game, options = {}) {
    if (!game) return;
    state.selected = game;
    setTouchProfile(game);
    for (const card of $$('.game-card', grid)) {
      card.classList.toggle('is-selected', card.dataset.slug === game.slug);
      card.setAttribute('aria-pressed', String(card.dataset.slug === game.slug));
    }
    captionKicker.textContent = 'NOW SELECTED';
    captionTitle.textContent = game.title;
    captionDescription.textContent = game.description;
    captionControls.textContent = game.controls;
    if (!state.current) {
      playerTitle.textContent = game.title.toUpperCase();
      playerMeta.textContent = `${game.genre.toUpperCase()} · ${game.year}`;
    }
    if (options.scroll !== false) {
      const card = $(`.game-card[data-slug="${game.slug}"]`, grid);
      if (card && !card.hidden) card.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
    if (!options.quiet) report(`${game.title} selected. Press Enter or click the card to load it.`);
  }

  /* -------------------------------------------------------------- player */

  function canUseRuffle() {
    return Boolean(window.RufflePlayer && typeof window.RufflePlayer.newest === 'function');
  }

  function destroyPlayer() {
    if (state.player) {
      state.player.remove();
      state.player = null;
    }
    playerContainer.classList.remove('is-loading');
    updateTouchKeys();
  }

  function showEmptyState() {
    playerContainer.replaceChildren(emptyState);
    emptyState.hidden = false;
  }

  function newPlayer() {
    if (!canUseRuffle()) {
      throw new Error('Ruffle could not start. Make sure the local runtime in vendor/ruffle/ is being served.');
    }
    destroyPlayer();
    const player = window.RufflePlayer.newest().createPlayer();
    player.classList.add('ruffle-player');
    player.setAttribute('allowfullscreen', '');
    playerContainer.replaceChildren(player);
    state.player = player;
    updateTouchKeys();
    return player;
  }

  async function playGame(game) {
    if (!game) return;
    enterPlayerView();
    selectGame(game, { scroll: false, quiet: true });
    state.current = game;
    emptyState.hidden = true;
    playerContainer.classList.add('is-loading');
    playerTitle.textContent = game.title.toUpperCase();
    playerMeta.textContent = `${game.genre.toUpperCase()} · ${game.year}`;
    captionKicker.textContent = 'NOW PLAYING';
    closeButton.disabled = false;
    fullscreenButton.disabled = false;
    report(`Loading ${game.title}…`);

    try {
      const player = newPlayer();
      const url = new URL(game.file, window.location.href).href;
      await player.ruffle().load({ url });
      writeLast(game.slug);
      markLastPlayed();
      playerContainer.classList.remove('is-loading');
      report(`${game.title} is running locally. Use the Keys pad on touch screens, or your keyboard.`, 'ok');
      focusPlayer();
    } catch (error) {
      console.error(`Unable to load ${game.title}:`, error);
      playerContainer.classList.remove('is-loading');
      destroyPlayer();
      showEmptyState();
      playerTitle.textContent = 'LOAD FAILED';
      playerMeta.textContent = 'RUFFLE';
      report(error instanceof Error ? error.message : 'This SWF could not be loaded.', 'error');
    }
  }

  function closePlayer() {
    destroyPlayer();
    state.current = null;
    showEmptyState();
    playerTitle.textContent = state.selected ? state.selected.title.toUpperCase() : 'SELECT A GAME';
    playerMeta.textContent = state.selected ? `${state.selected.genre.toUpperCase()} · ${state.selected.year}` : 'LOCAL · RUFFLE';
    captionKicker.textContent = 'NOW SELECTED';
    closeButton.disabled = true;
    fullscreenButton.disabled = true;
    if (document.body.classList.contains('is-fullscreen') || document.fullscreenElement) {
      exitFullscreen();
    }
    exitPlayerView();
    report('Player closed. Pick another game when you are ready.');
  }

  function playRandom() {
    const pool = visibleCards().length ? visibleCards() : $$('.game-card', grid);
    if (!pool.length) return;
    const currentSlug = state.current && state.current.slug;
    const choices = pool.filter((card) => card.dataset.slug !== currentSlug);
    const card = (choices.length ? choices : pool)[Math.floor(Math.random() * (choices.length || pool.length))];
    const game = state.bySlug.get(card.dataset.slug);
    if (game) playGame(game);
  }

  /* ----------------------------------------------------------- touch keys */

  function focusPlayer() {
    if (!state.player) return;
    try {
      state.player.focus({ preventScroll: true });
    } catch (_) {
      try { state.player.focus(); } catch (_) { /* focus may be unavailable */ }
    }
  }

  function keyDefFor(button) {
    return button ? KEY_DEFS[button.dataset.key] || null : null;
  }

  function sendKey(type, def) {
    const event = new KeyboardEvent(type, {
      key: def.key,
      code: def.code,
      keyCode: def.keyCode,
      which: def.keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    try {
      if (!event.keyCode) Object.defineProperty(event, 'keyCode', { get: () => def.keyCode });
      if (!event.which) Object.defineProperty(event, 'which', { get: () => def.keyCode });
    } catch (_) { /* legacy fields are best-effort */ }
    window.dispatchEvent(event);
  }

  /* Analog option: drag the stick to press one or two arrow keys, with the
     same dead zone and nub travel as the DOS cabinets. */
  const stickState = { pointerId: null, keys: [] };

  function stickDirections(event) {
    if (!touchStick) return [];
    const rect = touchStick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const travel = radius * 0.34;
    const scale = distance > travel ? travel / distance : 1;
    if (stickNub) {
      stickNub.style.transform = `translate(calc(-50% + ${dx * scale}px), calc(-50% + ${dy * scale}px))`;
    }
    const nx = dx / radius;
    const ny = dy / radius;
    const keys = [];
    if (distance / radius >= 0.2) {
      if (nx > 0.38) keys.push('ArrowRight');
      if (nx < -0.38) keys.push('ArrowLeft');
      if (ny > 0.38) keys.push('ArrowDown');
      if (ny < -0.38) keys.push('ArrowUp');
    }
    return keys;
  }

  function updateStickKeys(nextKeys) {
    for (const key of stickState.keys) {
      if (!nextKeys.includes(key)) sendKey('keyup', KEY_DEFS[key]);
    }
    for (const key of nextKeys) {
      if (!stickState.keys.includes(key)) sendKey('keydown', KEY_DEFS[key]);
    }
    stickState.keys = nextKeys;
  }

  function resetStick() {
    updateStickKeys([]);
    if (touchStick) touchStick.classList.remove('is-active');
    if (stickNub) stickNub.style.transform = 'translate(-50%, -50%)';
    stickState.pointerId = null;
  }

  function releaseHeldKeys(dispatch) {
    for (const button of heldPointers.values()) {
      button.classList.remove('is-down');
      if (dispatch) {
        const def = keyDefFor(button);
        if (def) sendKey('keyup', def);
      }
    }
    heldPointers.clear();
    resetStick();
    if (!dispatch) {
      for (const button of $$('.key', touchKeys)) button.classList.remove('is-down');
    }
  }

  function updateTouchKeys() {
    const running = Boolean(state.player);
    const active = running && state.keys;
    keysButton.disabled = !running;
    keysButton.setAttribute('aria-pressed', String(active));
    keysButton.setAttribute('aria-label', active ? 'Hide touch keys' : 'Show touch keys');
    keysButton.title = active ? 'Hide touch keys' : 'Show touch keys';
    touchKeys.hidden = !active;
    if (padModeButton) {
      padModeButton.hidden = !active;
      padModeButton.disabled = !running;
    }
    applyPadMode();
    if (!active) releaseHeldKeys(running);
  }

  function applyPadMode() {
    if (touchKeys) touchKeys.dataset.pad = state.pad;
    if (padModeButton) {
      const analog = state.pad === 'analog';
      padModeButton.textContent = analog ? 'Analog' : 'D-Pad';
      padModeButton.setAttribute('aria-pressed', String(analog));
      padModeButton.setAttribute(
        'aria-label',
        analog ? 'Switch movement control to D-pad' : 'Switch movement control to analog stick',
      );
    }
  }

  function togglePadMode() {
    if (!state.player) return;
    writePad(state.pad === 'analog' ? 'dpad' : 'analog');
    applyPadMode();
    resetStick();
    focusPlayer();
  }

  function toggleKeys() {
    if (!state.player) return;
    writeKeys(!state.keys);
    updateTouchKeys();
    if (state.keys) focusPlayer();
  }

  const heldPointers = new Map();

  function releasePointer(event) {
    const button = heldPointers.get(event.pointerId);
    if (!button) return;
    heldPointers.delete(event.pointerId);
    button.classList.remove('is-down');
    const def = keyDefFor(button);
    if (def) sendKey('keyup', def);
  }

  touchKeys.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('.key');
    if (!button || !touchKeys.contains(button)) return;
    const def = keyDefFor(button);
    if (!def) return;
    event.preventDefault();
    focusPlayer();
    button.classList.add('is-down');
    try { button.setPointerCapture(event.pointerId); } catch (_) { /* optional */ }
    heldPointers.set(event.pointerId, button);
    sendKey('keydown', def);
  });

  touchKeys.addEventListener('pointerup', releasePointer);
  touchKeys.addEventListener('pointercancel', releasePointer);
  touchKeys.addEventListener('contextmenu', (event) => event.preventDefault());

  if (touchStick) {
    touchStick.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      focusPlayer();
      stickState.pointerId = event.pointerId;
      try { touchStick.setPointerCapture(event.pointerId); } catch (_) { /* optional */ }
      touchStick.classList.add('is-active');
      updateStickKeys(stickDirections(event));
    });

    touchStick.addEventListener('pointermove', (event) => {
      if (event.pointerId !== stickState.pointerId) return;
      event.preventDefault();
      updateStickKeys(stickDirections(event));
    });

    const endStick = (event) => {
      if (event.pointerId !== stickState.pointerId) return;
      resetStick();
    };
    touchStick.addEventListener('pointerup', endStick);
    touchStick.addEventListener('pointercancel', endStick);
    touchStick.addEventListener('lostpointercapture', endStick);
  }

  keysButton.addEventListener('click', toggleKeys);
  if (padModeButton) padModeButton.addEventListener('click', togglePadMode);
  playerContainer.addEventListener('click', focusPlayer);

  /* ----------------------------------------------------------- fullscreen */

  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;

  function isFullscreenActive() {
    return state.immersive || Boolean(fsElement());
  }

  function isToolbarOpen() {
    return document.body.classList.contains('is-toolbar-open');
  }

  function hideToolbar() {
    window.clearTimeout(toolbarTimer);
    document.body.classList.remove('is-toolbar-open');
    if (toolbarReveal) {
      toolbarReveal.setAttribute('aria-expanded', 'false');
      toolbarReveal.setAttribute('aria-label', 'Show player controls');
      toolbarReveal.classList.remove('is-open');
    }
  }

  function showToolbar(delay = 4200) {
    if (!isFullscreenActive()) return;
    document.body.classList.add('is-toolbar-open');
    if (toolbarReveal) {
      toolbarReveal.setAttribute('aria-expanded', 'true');
      toolbarReveal.setAttribute('aria-label', 'Hide player controls');
      toolbarReveal.classList.add('is-open');
    }
    window.clearTimeout(toolbarTimer);
    if (delay > 0) toolbarTimer = window.setTimeout(hideToolbar, delay);
  }

  function toggleToolbar() {
    if (isToolbarOpen()) hideToolbar();
    else showToolbar();
  }

  if (toolbarReveal) {
    toolbarReveal.addEventListener('click', (event) => {
      event.preventDefault();
      toggleToolbar();
    });
  }

  if (playerToolbar) {
    playerToolbar.addEventListener('pointerdown', () => {
      if (isFullscreenActive() && isToolbarOpen()) showToolbar(5000);
    });
  }

  /* Pull down from the very top edge to reveal the hidden fullscreen bar.
     Swipe up on the bar itself to put it away again. */
  let edgeSwipe = null;
  let toolbarSwipe = null;

  document.addEventListener('pointerdown', (event) => {
    if (!isFullscreenActive() || !playerFrame) return;
    if (playerToolbar && playerToolbar.contains(event.target)) {
      toolbarSwipe = { id: event.pointerId, y: event.clientY };
      return;
    }
    if (!playerFrame.contains(event.target)) return;
    if (event.clientY <= 34) {
      edgeSwipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  }, true);

  document.addEventListener('pointermove', (event) => {
    if (edgeSwipe && event.pointerId === edgeSwipe.id) {
      const dy = event.clientY - edgeSwipe.y;
      const dx = Math.abs(event.clientX - edgeSwipe.x);
      if (dy > 26 && dx < 100) {
        edgeSwipe = null;
        showToolbar();
      }
    }
    if (toolbarSwipe && event.pointerId === toolbarSwipe.id) {
      if (event.clientY - toolbarSwipe.y < -26) {
        toolbarSwipe = null;
        hideToolbar();
      }
    }
  }, true);

  document.addEventListener('pointerup', () => { edgeSwipe = null; toolbarSwipe = null; }, true);
  document.addEventListener('pointercancel', () => { edgeSwipe = null; toolbarSwipe = null; }, true);

  function showRotateHint() {
    if ($('.rotate-hint')) return;
    const hint = make('div', 'rotate-hint', '↻ Rotate your phone for the big screen');
    document.body.appendChild(hint);
    window.setTimeout(() => hint.remove(), 2800);
  }

  function setImmersive(on) {
    const was = state.immersive;
    state.immersive = on;
    document.body.classList.toggle('is-fullscreen', on);
    fullscreenButton.setAttribute('aria-pressed', String(on));
    fullscreenButton.textContent = on ? 'Exit' : 'Fullscreen';
    if (!on) hideToolbar();
    else if (!was) showToolbar(2800);
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  async function enterFullscreen() {
    if (!playerFrame) return;
    const request = playerFrame.requestFullscreen || playerFrame.webkitRequestFullscreen;
    if (!request) {
      setImmersive(true);
      if (window.innerHeight > window.innerWidth) showRotateHint();
      return;
    }
    try {
      await request.call(playerFrame, { navigationUI: 'hide' });
    } catch (_) {
      try {
        await request.call(playerFrame);
      } catch (_) {
        /* Fullscreen can be blocked (permissions, embedded frames). Fall back
           to the immersive layout so the player still takes the viewport. */
        setImmersive(true);
        if (window.innerHeight > window.innerWidth) showRotateHint();
        return;
      }
    }
    try { await screen.orientation?.lock?.('landscape'); } catch (_) { /* optional */ }
    setImmersive(true);
    if (window.innerHeight > window.innerWidth) showRotateHint();
  }

  async function exitFullscreen() {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (fsElement() && exit) {
      try { await exit.call(document); } catch (error) { console.warn('Unable to exit fullscreen:', error); }
    }
    setImmersive(false);
  }

  fullscreenButton.addEventListener('click', () => {
    if (state.immersive || fsElement()) exitFullscreen();
    else enterFullscreen();
  });

  document.addEventListener('fullscreenchange', () => setImmersive(Boolean(fsElement())));
  document.addEventListener('webkitfullscreenchange', () => setImmersive(Boolean(fsElement())));

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (isToolbarOpen()) {
      hideToolbar();
      return;
    }
    if (state.immersive && !fsElement()) setImmersive(false);
  });

  /* ------------------------------------------------------------ keyboard */

  grid.addEventListener('keydown', (event) => {
    const cards = visibleCards();
    if (!cards.length) return;
    const current = document.activeElement;
    const index = cards.indexOf(current);
    let next = -1;
    const columns = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
    if (event.key === 'ArrowLeft') next = index < 0 ? 0 : (index - 1 + cards.length) % cards.length;
    else if (event.key === 'ArrowRight') next = index < 0 ? 0 : (index + 1) % cards.length;
    else if (event.key === 'ArrowUp') next = index < 0 ? 0 : Math.max(0, index - columns);
    else if (event.key === 'ArrowDown') next = index < 0 ? 0 : Math.min(cards.length - 1, index + columns);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = cards.length - 1;
    if (next < 0) return;
    event.preventDefault();
    cards[next].focus();
    const game = state.bySlug.get(cards[next].dataset.slug);
    if (game) selectGame(game, { scroll: false, quiet: true });
  });

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value.trim().toLowerCase();
    applyFilters();
  });

  genreFilter.addEventListener('change', () => {
    state.genre = genreFilter.value;
    applyFilters();
  });

  randomButton.addEventListener('click', playRandom);
  if (shelfRandom) shelfRandom.addEventListener('click', playRandom);
  closeButton.addEventListener('click', closePlayer);

  /* -------------------------------------------------------- bring your own */

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileName.textContent = file ? file.name : 'Nothing selected';
    loadButton.disabled = !file;
    clearFileButton.disabled = !file;
    if (file) report('Ready to load. Your SWF stays on this device.');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      report('Choose an SWF file first.', 'error');
      return;
    }
    if (!/\.swf$/i.test(file.name)) {
      report('That file does not have a .swf extension.', 'error');
      return;
    }

    enterPlayerView();
    touchKeys.classList.add('has-qwop');
    loadButton.disabled = true;
    playerContainer.classList.add('is-loading');
    playerTitle.textContent = file.name.toUpperCase();
    playerMeta.textContent = 'LOCAL FILE';
    closeButton.disabled = false;
    fullscreenButton.disabled = false;
    report(`Loading ${file.name}…`);

    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const signature = String.fromCharCode(...data.subarray(0, 3));
      if (data.length < 8 || !['FWS', 'CWS', 'ZWS'].includes(signature)) {
        throw new Error('This file does not have a valid SWF header.');
      }

      state.current = null;
      emptyState.hidden = true;
      const player = newPlayer();
      await player.ruffle().load({ data });
      playerContainer.classList.remove('is-loading');
      captionKicker.textContent = 'YOUR FILE';
      captionTitle.textContent = file.name;
      captionDescription.textContent = 'Loaded from your device. The file stays in this tab and is never uploaded or saved.';
      captionControls.textContent = 'Use the game’s own mouse and keyboard controls, plus the Keys pad on touch screens.';
      report(`Loaded ${file.name}. Use the Keys pad on touch screens, or your keyboard. If the screen stays blank, this game may need unsupported features or extra files.`, 'ok');
      focusPlayer();
    } catch (error) {
      console.error('Unable to load the selected SWF:', error);
      playerContainer.classList.remove('is-loading');
      destroyPlayer();
      showEmptyState();
      playerTitle.textContent = 'LOAD FAILED';
      playerMeta.textContent = 'RUFFLE';
      report(error instanceof Error ? error.message : 'The SWF could not be loaded.', 'error');
    } finally {
      loadButton.disabled = !(fileInput.files && fileInput.files[0]);
    }
  });

  clearFileButton.addEventListener('click', () => {
    fileInput.value = '';
    fileName.textContent = 'Nothing selected';
    loadButton.disabled = true;
    clearFileButton.disabled = true;
    report('File cleared. Choose another SWF when you are ready.');
  });

  /* ---------------------------------------------------------------- boot */

  function loadFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('game');
    if (!slug) return;
    const game = state.bySlug.get(slug);
    if (!game) {
      report(`Unknown game "${slug}". Pick one from the vault below.`, 'error');
      return;
    }
    const card = $(`.game-card[data-slug="${slug}"]`, grid);
    if (card) card.classList.add('is-selected');
    playGame(game);
  }

  updateTouchKeys();

  loadCatalog().catch((error) => {
    console.error('Unable to initialize the Flash Vault:', error);
    report(error instanceof Error ? error.message : 'The Flash Vault could not start.', 'error');
    emptyResults.hidden = false;
    emptyResults.textContent = 'The Flash catalog could not be loaded. Serve this folder over HTTP (not file://) and reload.';
    randomButton.disabled = true;
  });
})();
