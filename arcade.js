/* Arcade — landing page behaviour
   Plain ES2017, no dependencies. Everything degrades gracefully:
   with JS off the cabinets and dialogs are still usable. */

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ------------------------------------------------------------ clock */

  const clockEls = [$('#clock'), $('#tele-clock'), $('#footer-clock')].filter(Boolean);

  function two(n) { return String(n).padStart(2, '0'); }

  function tickClock() {
    const now = new Date();
    const hms = `${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`;
    for (const el of clockEls) {
      el.textContent = el.id === 'footer-clock' ? `LOCAL / ${hms}` : hms;
    }
  }

  tickClock();
  setInterval(tickClock, 1000);

  /* ------------------------------------------------------------ cabinet counts */

  const grid = $('#cabinet-grid');
  const cards = grid ? $$('.cabinet', grid) : [];
  const cardByGame = new Map(cards.map((card) => [card.dataset.game, card]));
  const dividers = grid ? $$('.vault-divider[data-show-for]', grid) : [];
  const total = cards.length;
  const byKind = (kind) => kind === 'all' ? total : cards.filter((c) => c.dataset.kind === kind).length;

  const countEl = $('#cabinet-count');
  if (countEl) countEl.textContent = `${total} ${total === 1 ? 'entry' : 'entries'}`;

  const teleCount = $('#tele-cabinets');
  if (teleCount) teleCount.textContent = String(total);

  for (const el of $$('[data-count-for]')) {
    el.textContent = String(byKind(el.dataset.countFor));
  }

  /* ------------------------------------------------------------ save state */

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; }
  }

  function readNumber(key) {
    try {
      const n = Number(localStorage.getItem(key) || 0);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (_) { return 0; }
  }

  const daveProgress = readJSON('arcade.dave.progress.v1');
  const daveLevel = Number(daveProgress && daveProgress.highestLevel) || 0;
  const daveBest = Number(daveProgress && daveProgress.bestScore) || 0;
  const best2048 = readNumber('rea2048:best');

  const daveEl = $('#dave-progress');
  if (daveEl) {
    if (daveLevel > 1) {
      daveEl.textContent = `Best level ${daveLevel}`;
      daveEl.classList.add('has-progress');
    } else {
      daveEl.textContent = 'New run';
    }
  }

  const game2048El = document.getElementById('2048-progress');
  if (game2048El) {
    if (best2048 > 0) {
      game2048El.textContent = `Best ${best2048.toLocaleString()}`;
      game2048El.classList.add('has-progress');
    } else {
      game2048El.textContent = 'New board';
    }
  }

  const teleSave = $('#tele-save');
  if (teleSave) {
    const bits = [];
    if (daveLevel > 1) bits.push(`dave lv${daveLevel}`);
    if (best2048 > 0) bits.push(`2048 ${best2048}`);
    teleSave.textContent = bits.length ? bits.join(' · ') : 'empty';
  }

  /* ------------------------------------------------------------ selector */

  const filterButtons = $$('.selector-btn');
  const statusEl = $('#selector-status');
  const emptyEl = $('#selector-empty');
  const selectorTitle = $('.selector-title');
  const titleList = $('#title-list');
  const listCountEl = $('#list-count');
  const listSearch = $('#list-search');
  const listSearchClear = $('#list-search-clear');
  const viewButtons = $$('.view-btn');
  const listView = $('#list-view');
  const titleRows = [];
  const titleRowsByGame = new Map();
  const viewKey = 'arcade.library.view.v1';
  let activeKind = 'all';
  let searchQuery = '';
  let viewMode = 'list';
  const featured = {
    art: $('#featured-art'),
    index: $('#featured-index'),
    platform: $('#featured-platform'),
    kind: $('#featured-kind'),
    title: $('#featured-title'),
    description: $('#featured-description'),
    launch: $('#featured-launch'),
    launchLabel: $('#featured-launch-label'),
    prompt: $('.library-prompt'),
    selectPrompt: $('.featured-prompt'),
  };
  const coverflowCanvas = $('#coverflow-canvas');
  const coverflowIndex = $('#coverflow-index');
  const coverflowLive = $('#coverflow-live');
  let coverflowRenderer = null;
  function renderCoverflow() {
    if (coverflowRenderer && viewMode === 'coverflow') coverflowRenderer.render();
  }
  const libraryStateKey = 'arcade.library.state.v1';
  let selectedCard = null;
  let restoringLibrary = false;
  const KINDS = new Set(['all', 'wasm', 'dos', 'gba', 'data', 'external', 'flash']);

  function readLibraryState() {
    try {
      const state = JSON.parse(sessionStorage.getItem(libraryStateKey) || 'null');
      return state && typeof state === 'object' ? state : null;
    } catch (error) {
      console.warn('Unable to restore library state:', error);
      return null;
    }
  }

  function saveLibraryState() {
    if (!selectedCard || !grid) return;
    try {
      sessionStorage.setItem(libraryStateKey, JSON.stringify({
        game: selectedCard.dataset.game,
        filter: filterButtons.find((button) => button.classList.contains('is-active'))?.dataset.filter || 'all',
        railLeft: grid.scrollLeft,
        listTop: titleList ? titleList.scrollTop : 0,
        pageTop: window.scrollY,
      }));
    } catch (error) {
      console.warn('Unable to save library state:', error);
    }
  }

  function readViewMode() {
    try {
      return localStorage.getItem(viewKey) === 'coverflow' ? 'coverflow' : 'list';
    } catch (_) {
      return 'list';
    }
  }

  function saveViewMode(mode) {
    try { localStorage.setItem(viewKey, mode); } catch (_) { /* ignore */ }
  }

  function titleForCard(card) {
    const title = $('.body h2', card);
    return title ? title.textContent.replace(/\s+/g, ' ').trim() : (card.dataset.game || 'Game');
  }

  function cardMatchesSearch(card) {
    if (!searchQuery) return true;
    const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return true;
    const haystack = [
      titleForCard(card),
      card.dataset.game || '',
      card.dataset.kind || '',
      $('.art-tag', card)?.textContent || '',
      $('.chip', card)?.textContent || '',
      $('.body p', card)?.textContent || '',
    ].join(' ').toLowerCase();
    return terms.every((term) => haystack.includes(term));
  }

  function isVisibleCard(card, kind = activeKind) {
    return (kind === 'all' || card.dataset.kind === kind) && cardMatchesSearch(card);
  }

  function buildTitleList() {
    if (!titleList) return;
    const fragment = document.createDocumentFragment();

    cards.forEach((card, index) => {
      const cabinetLink = $('.cabinet-link', card);
      const isLink = cabinetLink && cabinetLink.tagName === 'A';
      const row = document.createElement('a');
      row.className = 'library-row';
      row.href = isLink ? cabinetLink.href : '#';
      if (isLink && cabinetLink.target) {
        row.target = cabinetLink.target;
        row.rel = cabinetLink.rel;
      }
      if (!isLink) row.dataset.reference = 'true';
      row.dataset.game = card.dataset.game || String(index + 1);
      row.dataset.kind = card.dataset.kind || '';
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      row.tabIndex = -1;
      if (card.dataset.kind === 'flash' || card.dataset.kind === 'gba') row.dataset.new = 'true';

      const number = document.createElement('span');
      number.className = 'library-row-index';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = $('.art-index', card)?.textContent.trim()
        || String(index + 1).padStart(2, '0');

      const art = document.createElement('span');
      art.className = 'library-row-art';
      const source = $('.art img', card);
      if (source) {
        const thumb = document.createElement('img');
        thumb.src = source.currentSrc || source.src;
        thumb.alt = '';
        thumb.loading = 'lazy';
        thumb.decoding = 'async';
        art.append(thumb);
      }

      const copy = document.createElement('span');
      copy.className = 'library-row-copy';
      const title = document.createElement('span');
      title.className = 'library-row-title';
      title.textContent = titleForCard(card);
      const meta = document.createElement('span');
      meta.className = 'library-row-meta';
      meta.textContent = $('.art-tag', card)?.textContent.replace(/\s+/g, ' ').trim() || '';
      copy.append(title, meta);

      const chip = document.createElement('span');
      chip.className = 'library-row-chip';
      chip.dataset.kind = card.dataset.kind || '';
      chip.textContent = $('.chip', card)?.textContent.replace(/\s+/g, ' ').trim()
        || (card.dataset.kind || '').toUpperCase();

      const go = document.createElement('span');
      go.className = 'library-row-go';
      go.setAttribute('aria-hidden', 'true');
      go.textContent = '▶';

      row.append(number, art, copy, chip, go);
      titleRows.push(row);
      titleRowsByGame.set(row.dataset.game, row);

      row.addEventListener('focus', () => selectCard(card));
      row.addEventListener('click', (event) => {
        selectCard(card);
        if (!isLink) event.preventDefault();
      });
      if (finePointer) {
        row.addEventListener('mouseenter', () => {
          if (viewMode === 'list') selectCard(card);
        });
      }

      fragment.append(row);
    });

    titleList.append(fragment);
  }

  function syncTitleList(card) {
    const game = card ? card.dataset.game : null;
    for (const row of titleRows) {
      const active = row.dataset.game === game;
      row.classList.toggle('is-selected', active);
      row.setAttribute('aria-selected', String(active));
      row.tabIndex = active ? 0 : -1;
    }
    if (card && viewMode === 'list' && !restoringLibrary) {
      const row = titleRowsByGame.get(game);
      if (row) row.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  function ensureCoverflow() {
    if (coverflowRenderer || !coverflowCanvas) return coverflowRenderer;
    coverflowRenderer = createCoverflowRenderer(coverflowCanvas);
    if (!coverflowRenderer) coverflowCanvas.hidden = true;
    return coverflowRenderer;
  }

  function setViewMode(mode, options = {}) {
    viewMode = mode === 'coverflow' ? 'coverflow' : 'list';
    document.body.classList.toggle('view-list', viewMode === 'list');
    document.body.classList.toggle('view-coverflow', viewMode === 'coverflow');

    for (const button of viewButtons) {
      const active = button.dataset.view === viewMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }

    if (viewMode === 'coverflow') {
      const renderer = ensureCoverflow();
      if (renderer) {
        document.body.classList.add('has-coverflow');
        coverflowCanvas.removeAttribute('aria-hidden');
        renderer.render();
      } else {
        document.body.classList.remove('has-coverflow');
        if (statusEl && !options.quiet) {
          statusEl.textContent = '3D coverflow is unavailable in this browser — showing the game shelf.';
        }
      }
    } else {
      document.body.classList.remove('has-coverflow');
    }

    saveViewMode(viewMode);
    if (selectedCard) syncTitleList(selectedCard);

    if (options.focus) {
      if (viewMode === 'coverflow') {
        coverflowCanvas?.focus({ preventScroll: true });
      } else {
        titleRowsByGame.get(selectedCard?.dataset.game)?.focus({ preventScroll: true });
      }
    }
  }

  function selectCard(card) {
    if (!card || card.classList.contains('is-filtered-out')) return;
    selectedCard = card;
    for (const item of cards) {
      const active = item === card;
      item.classList.toggle('is-selected', active);
      const link = $('.cabinet-link', item);
      if (link) {
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    }

    const image = $('.art img', card);
    const title = $('.body h2', card);
    const platform = $('.art-tag', card);
    const kind = $('.chip', card);
    const description = $('.body p', card);
    const cabinetLink = $('.cabinet-link', card);
    const link = cabinetLink && cabinetLink.tagName === 'A' ? cabinetLink : null;
    const index = $('.art-index', card);
    const external = card.dataset.kind === 'external' || (link && link.target === '_blank');
    if (featured.launch) featured.launch.hidden = !link;
    if (featured.selectPrompt) featured.selectPrompt.hidden = !link;

    if (featured.art && image) {
      featured.art.src = image.currentSrc || image.src;
      featured.art.alt = '';
    }
    if (featured.index && index) featured.index.textContent = index.textContent.trim();
    if (featured.platform && platform) featured.platform.textContent = platform.textContent.trim();
    if (featured.kind && kind) featured.kind.textContent = kind.textContent.trim();
    if (featured.title && title) featured.title.textContent = title.textContent.trim();
    if (featured.description && description) featured.description.textContent = description.textContent.trim();
    const isFlashVault = card.dataset.game === 'flash-player';
    if (featured.launch && link) {
      featured.launch.href = link.href;
      if (link.target) {
        featured.launch.target = link.target;
        featured.launch.rel = link.rel;
      } else {
        featured.launch.removeAttribute('target');
        featured.launch.removeAttribute('rel');
      }
      const action = external || isFlashVault ? 'Open' : 'Play';
      const titleText = title ? title.textContent.trim() : 'selected game';
      featured.launch.setAttribute('aria-label', isFlashVault ? titleText : `${action} ${titleText}`);
    }
    if (featured.launchLabel) {
      featured.launchLabel.textContent = external
        ? 'Reference only'
        : (isFlashVault
          ? 'Open Flash vault'
          : (card.dataset.kind === 'flash' ? 'Play Flash game' : 'Launch game'));
    }
    if (featured.prompt) featured.prompt.textContent = String(cards.indexOf(card) + 1).padStart(2, '0');
    syncTitleList(card);
    renderCoverflow();
    if (!restoringLibrary) saveLibraryState();
  }

  const restoredState = readLibraryState();
  if (restoredState && KINDS.has(restoredState.filter)) restoringLibrary = true;

  function applyFilter(kind) {
    if (!KINDS.has(kind)) kind = 'all';
    activeKind = kind;
    let visible = 0;

    for (const card of cards) {
      const show = isVisibleCard(card, kind);
      card.classList.toggle('is-filtered-out', !show);
      if (show) visible++;
      if (!show) card.style.removeProperty('--rx'), card.style.removeProperty('--ry');
    }

    for (const row of titleRows) {
      const card = cardByGame.get(row.dataset.game);
      const show = card ? isVisibleCard(card, kind) : false;
      row.classList.toggle('is-filtered-out', !show);
    }

    for (const divider of dividers) {
      const scopes = divider.dataset.showFor.split(/\s+/).filter(Boolean);
      divider.hidden = !scopes.includes(kind);
    }

    for (const btn of filterButtons) {
      const active = btn.dataset.filter === kind;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
    }

    const labels = {
      all: 'All games',
      flash: 'Flash games',
      wasm: 'WASM games',
      dos: 'DOS games',
      gba: 'Game Boy Advance',
      data: 'Your data',
      external: 'Reference entries',
    };
    if (selectorTitle) selectorTitle.textContent = labels[kind] || 'All games';
    const listLabel = $('.title-list-label');
    if (listLabel) listLabel.textContent = kind === 'all' ? 'ALL TITLES' : `${kind.toUpperCase()} TITLES`;
    if (listCountEl) listCountEl.textContent = `${visible} TITLE${visible === 1 ? '' : 'S'}`;

    if (statusEl) {
      const suffix = searchQuery ? ` · “${searchQuery}”` : '';
      statusEl.textContent = `Showing ${visible} of ${total} library entr${total === 1 ? 'y' : 'ies'}${kind === 'all' ? '' : ` · ${kind}`}${suffix}`;
    }
    if (emptyEl) emptyEl.hidden = visible !== 0;

    if (grid) {
      const restoredRailLeft = restoringLibrary && Number.isFinite(restoredState && restoredState.railLeft)
        ? restoredState.railLeft
        : 0;
      grid.scrollTo({
        left: restoredRailLeft,
        behavior: reduced || restoringLibrary ? 'auto' : 'smooth',
      });
    }
    if (titleList && restoringLibrary && Number.isFinite(restoredState && restoredState.listTop)) {
      titleList.scrollTop = restoredState.listTop;
    }

    if (selectedCard && selectedCard.classList.contains('is-filtered-out')) {
      const firstVisible = cards.find((card) => !card.classList.contains('is-filtered-out'));
      if (firstVisible) selectCard(firstVisible);
    }
    renderCoverflow();
  }

  filterButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));

    btn.addEventListener('keydown', (e) => {
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % filterButtons.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + filterButtons.length) % filterButtons.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = filterButtons.length - 1;
      if (next < 0) return;
      e.preventDefault();
      filterButtons[next].focus();
      filterButtons[next].click();
    });
  });

  buildTitleList();
  applyFilter(restoredState && KINDS.has(restoredState.filter) ? restoredState.filter : 'all');

  const restoredCard = restoredState && cards.find((card) => card.dataset.game === restoredState.game);
  const initialCard = restoredCard && !restoredCard.classList.contains('is-filtered-out')
    ? restoredCard
    : cards.find((card) => !card.classList.contains('is-filtered-out'));
  if (initialCard) selectCard(initialCard);
  setViewMode(readViewMode(), { quiet: true });
  restoringLibrary = false;

  if (restoredState) {
    const restorePosition = () => {
      if (grid) {
        if (Number.isFinite(restoredState.railLeft)) grid.scrollLeft = restoredState.railLeft;
      }
      if (titleList && Number.isFinite(restoredState.listTop)) titleList.scrollTop = restoredState.listTop;
      if (Number.isFinite(restoredState.pageTop)) window.scrollTo(0, restoredState.pageTop);
    };
    requestAnimationFrame(() => requestAnimationFrame(restorePosition));
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) window.setTimeout(restorePosition, 60);
    });
  }

  function createCoverflowRenderer(canvas) {
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    if (!gl) return null;

    const vertexSource = `
      attribute vec2 aPosition;
      attribute vec2 aUv;
      uniform float uOffset;
      uniform float uHalfWidth;
      uniform float uHalfHeight;
      uniform float uScale;
      uniform float uAngle;
      uniform float uDepth;
      varying vec2 vUv;
      void main() {
        vec2 point = aPosition * vec2(uHalfWidth, uHalfHeight) * uScale;
        float c = cos(uAngle);
        float s = sin(uAngle);
        float rotatedX = point.x * c;
        float z = -point.x * s + uDepth;
        float perspective = 1.0 / (1.0 - z * 0.12);
        gl_Position = vec4((rotatedX + uOffset) * perspective, point.y * perspective, 0.0, 1.0);
        vUv = aUv;
      }
    `;
    const fragmentSource = `
      precision mediump float;
      uniform sampler2D uTexture;
      uniform float uFocus;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec4 cover = texture2D(uTexture, vUv);
        float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        float frame = 1.0 - smoothstep(0.0, 0.009, edge);
        float sweepX = fract(uTime * 0.13) * 1.6 - 0.3;
        float sweep = exp(-pow((vUv.x - sweepX) * 17.0, 2.0)) * uFocus * 0.22;
        float scan = 0.985 + 0.015 * sin(vUv.y * 620.0);
        float shade = mix(0.74, 1.0, uFocus);
        vec3 rim = mix(vec3(0.32, 0.45, 0.63), vec3(0.58, 0.82, 1.0), uFocus);
        vec3 color = cover.rgb * shade * scan + sweep;
        color = mix(color, rim, frame * 0.88);
        gl_FragColor = vec4(color, cover.a);
      }
    `;

    function compileShader(type, source) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Unable to allocate coverflow shader.');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) || 'Unknown shader error';
        gl.deleteShader(shader);
        throw new Error(`Unable to compile coverflow shader: ${message}`);
      }
      return shader;
    }

    let program;
    try {
      program = gl.createProgram();
      if (!program) throw new Error('Unable to allocate coverflow program.');
      gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Unable to link coverflow renderer: ${gl.getProgramInfoLog(program) || 'Unknown program error'}`);
      }
    } catch (error) {
      console.error('Unable to initialize the WebGL game shelf:', error);
      return null;
    }

    const locations = {
      position: gl.getAttribLocation(program, 'aPosition'),
      uv: gl.getAttribLocation(program, 'aUv'),
      offset: gl.getUniformLocation(program, 'uOffset'),
      halfWidth: gl.getUniformLocation(program, 'uHalfWidth'),
      halfHeight: gl.getUniformLocation(program, 'uHalfHeight'),
      scale: gl.getUniformLocation(program, 'uScale'),
      angle: gl.getUniformLocation(program, 'uAngle'),
      depth: gl.getUniformLocation(program, 'uDepth'),
      texture: gl.getUniformLocation(program, 'uTexture'),
      focus: gl.getUniformLocation(program, 'uFocus'),
      time: gl.getUniformLocation(program, 'uTime'),
    };
    const geometry = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -0.5, -0.5, 0, 0,  0.5, -0.5, 1, 0,  -0.5, 0.5, 0, 1,
      -0.5, 0.5, 0, 1,  0.5, -0.5, 1, 0,  0.5, 0.5, 1, 1,
    ]), gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1i(locations.texture, 0);

    const textures = new Map();
    function ensureTexture(card) {
      if (textures.has(card)) return textures.get(card);
      const imageElement = $('.art img', card);
      if (!imageElement) return null;
      const texture = gl.createTexture();
      if (!texture) return null;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([12, 21, 38, 255]));
      textures.set(card, texture);

      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        if (textures.get(card) !== texture) return;
        const raster = document.createElement('canvas');
        raster.width = image.naturalWidth;
        raster.height = image.naturalHeight;
        const context = raster.getContext('2d');
        if (!context) {
          console.error(`Unable to rasterize cover art for ${card.dataset.game}.`);
          return;
        }
        context.drawImage(image, 0, 0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, raster);
        if (motionReduced && !document.hidden) render();
      };
      image.onerror = () => console.warn(`Unable to load cover art for ${card.dataset.game}.`);
      image.src = imageElement.currentSrc || imageElement.src;
      return texture;
    }

    let width = 0;
    let height = 0;
    let frame = 0;
    let disposed = false;
    let lastPositionLabel = '';
    let lastLiveLabel = '';
    const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visibleCards = () => cards.filter((card) => !card.classList.contains('is-filtered-out'));
    const currentPosition = () => Math.max(0, visibleCards().indexOf(selectedCard));

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.7);
      const nextWidth = Math.max(1, Math.round(rect.width * dpr));
      const nextHeight = Math.max(1, Math.round(rect.height * dpr));
      if (width === nextWidth && height === nextHeight) return;
      width = nextWidth;
      height = nextHeight;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }

    function drawCard(card, relativeIndex, halfWidth, halfHeight, time) {
      const texture = ensureTexture(card);
      if (!texture) return;
      const distance = Math.abs(relativeIndex);
      const scale = distance === 0 ? 1 : Math.max(0.68, 0.9 - distance * 0.065);
      const offset = relativeIndex * halfWidth * 0.92;
      const angle = relativeIndex === 0 ? 0 : Math.sign(relativeIndex) * -0.34;
      const depth = -distance * 0.13;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1f(locations.offset, offset);
      gl.uniform1f(locations.halfWidth, halfWidth);
      gl.uniform1f(locations.halfHeight, halfHeight);
      gl.uniform1f(locations.scale, scale);
      gl.uniform1f(locations.angle, angle);
      gl.uniform1f(locations.depth, depth);
      gl.uniform1f(locations.focus, distance === 0 ? 1 : 0);
      gl.uniform1f(locations.time, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function render(time = 0) {
      if (disposed) return;
      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry);
      gl.enableVertexAttribArray(locations.position);
      gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(locations.uv);
      gl.vertexAttribPointer(locations.uv, 2, gl.FLOAT, false, 16, 8);

      const available = visibleCards();
      if (!available.length) return;
      const selectedIndex = Math.min(available.length - 1, currentPosition());
      const halfHeight = 1.12;
      const halfWidth = halfHeight * 1.58 * height / width;
      const nearby = new Set(available.slice(
        Math.max(0, selectedIndex - 3),
        Math.min(available.length, selectedIndex + 4),
      ));
      for (const [card, texture] of textures) {
        if (!nearby.has(card)) {
          gl.deleteTexture(texture);
          textures.delete(card);
        }
      }
      for (let distance = 3; distance >= 1; distance--) {
        const leftIndex = selectedIndex - distance;
        const rightIndex = selectedIndex + distance;
        if (leftIndex >= 0) drawCard(available[leftIndex], -distance, halfWidth, halfHeight, time / 1000);
        if (rightIndex < available.length) drawCard(available[rightIndex], distance, halfWidth, halfHeight, time / 1000);
      }
      drawCard(available[selectedIndex], 0, halfWidth, halfHeight, time / 1000);

      const positionLabel = `${String(selectedIndex + 1).padStart(2, '0')} / ${String(available.length).padStart(2, '0')}`;
      if (coverflowIndex && positionLabel !== lastPositionLabel) {
        coverflowIndex.innerHTML = `${positionLabel.slice(0, 2)} <b>/</b> ${positionLabel.slice(-2)}`;
        lastPositionLabel = positionLabel;
      }
      if (coverflowLive && selectedCard) {
        const title = $('.body h2', selectedCard);
        const liveLabel = `${title ? title.textContent.trim() : 'Game'}, ${selectedIndex + 1} of ${available.length}`;
        if (liveLabel !== lastLiveLabel) {
          coverflowLive.textContent = liveLabel;
          lastLiveLabel = liveLabel;
        }
      }
      if (!motionReduced && !document.hidden) frame = requestAnimationFrame(render);
    }

    function selectRelative(amount) {
      const available = visibleCards();
      if (!available.length) return;
      const nextIndex = (currentPosition() + amount + available.length) % available.length;
      selectCard(available[nextIndex]);
    }

    let pointerStart = null;
    canvas.addEventListener('pointerdown', (event) => {
      pointerStart = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || pointerStart) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const halfWidth = 1.12 * 1.58 * height / width;
      const position = x / (halfWidth * 0.92);
      const relativeIndex = Math.round(position);
      if (Math.abs(position - relativeIndex) > 0.48) return;
      const available = visibleCards();
      const target = available[currentPosition() + relativeIndex];
      if (target) selectCard(target);
    });
    canvas.addEventListener('pointerup', (event) => {
      if (!pointerStart) return;
      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      const rect = canvas.getBoundingClientRect();
      const available = visibleCards();
      if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY)) {
        const halfWidth = 1.12 * 1.58 * height / width;
        const pixelsPerCard = Math.max(70, halfWidth * 0.92 * rect.width / 2);
        const steps = Math.max(1, Math.round(Math.abs(deltaX) / pixelsPerCard));
        selectRelative(deltaX < 0 ? steps : -steps);
      } else {
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const halfWidth = 1.12 * 1.58 * height / width;
        const cardOffset = Math.round(x / (halfWidth * 0.92));
        const target = Math.max(0, Math.min(available.length - 1, currentPosition() + cardOffset));
        if (available[target]) selectCard(available[target]);
      }
      pointerStart = null;
    });
    canvas.addEventListener('pointercancel', () => { pointerStart = null; });
    canvas.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        selectRelative(event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const available = visibleCards();
        if (available.length) selectCard(available[event.key === 'Home' ? 0 : available.length - 1]);
      } else if (event.key === 'Enter' && featured.launch) {
        event.preventDefault();
        featured.launch.click();
      }
    });

    const onVisibilityChange = () => {
      if (document.hidden && frame) cancelAnimationFrame(frame), frame = 0;
      else if (!document.hidden && !motionReduced && !frame) frame = requestAnimationFrame(render);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const resizeObserver = new ResizeObserver(() => render());
    resizeObserver.observe(canvas);
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      document.body.classList.remove('has-coverflow');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.hidden = true;
      console.error('The WebGL coverflow context was lost; showing the standard game shelf.');
    });

    canvas.removeAttribute('aria-hidden');
    render();
    return {
      render: () => {
        if (motionReduced) render();
      },
      dispose: () => {
        disposed = true;
        if (frame) cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        document.removeEventListener('visibilitychange', onVisibilityChange);
      },
    };
  }

  for (const button of viewButtons) {
    button.addEventListener('click', () => {
      if (button.dataset.view === viewMode) return;
      setViewMode(button.dataset.view, { focus: true });
      if (statusEl && viewMode === 'coverflow' && coverflowRenderer) {
        statusEl.textContent = `Showing ${cards.filter((card) => !card.classList.contains('is-filtered-out')).length} of ${total} library entries · coverflow`;
      }
    });
  }

  if (featured.launch) {
    featured.launch.addEventListener('click', saveLibraryState);
  }

  /* ------------------------------------------------------------ library navigation */

  const libraryPrev = $('#library-prev');
  const libraryNext = $('#library-next');

  function scrollLibrary(direction) {
    if (!grid) return;
    if (coverflowRenderer) {
      const visibleCards = cards.filter((card) => !card.classList.contains('is-filtered-out'));
      if (!visibleCards.length) return;
      const currentIndex = Math.max(0, visibleCards.indexOf(selectedCard));
      const nextIndex = (currentIndex + direction + visibleCards.length) % visibleCards.length;
      selectCard(visibleCards[nextIndex]);
      coverflowCanvas.focus();
      return;
    }
    const firstCard = cards.find((card) => !card.classList.contains('is-filtered-out'));
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 320;
    grid.scrollBy({
      left: direction * (cardWidth + 18) * 2,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }

  if (libraryPrev) libraryPrev.addEventListener('click', () => scrollLibrary(-1));
  if (libraryNext) libraryNext.addEventListener('click', () => scrollLibrary(1));

  if (grid) {
    let scrollTimer = 0;
    grid.addEventListener('scroll', () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        if (restoringLibrary) return;
        const visibleCards = cards.filter((card) => !card.classList.contains('is-filtered-out'));
        const center = grid.getBoundingClientRect().left + grid.clientWidth / 2;
        let closest = null;
        let closestDistance = Infinity;
        for (const card of visibleCards) {
          const rect = card.getBoundingClientRect();
          const distance = Math.abs(rect.left + rect.width / 2 - center);
          if (distance < closestDistance) {
            closest = card;
            closestDistance = distance;
          }
        }
        if (closest) selectCard(closest);
      }, 90);
    }, { passive: true });
  }

  for (const card of cards) {
    const link = $('.cabinet-link', card);
    if (!link) continue;

    link.addEventListener('focus', () => selectCard(card));
    link.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') selectCard(card);
    });
    link.addEventListener('click', () => {
      selectCard(card);
      saveLibraryState();
    });

    link.addEventListener('focus', () => {
      card.scrollIntoView({
        block: 'nearest',
        inline: 'center',
        behavior: reduced ? 'auto' : 'smooth',
      });
    });

    link.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const visibleCards = cards.filter((item) => !item.classList.contains('is-filtered-out'));
      const index = visibleCards.indexOf(card);
      const next = visibleCards[index + (e.key === 'ArrowRight' ? 1 : -1)];
      if (!next) return;
      const nextLink = $('.cabinet-link', next);
      if (!nextLink) return;
      e.preventDefault();
      nextLink.focus();
    });
  }

  /* ------------------------------------------------------------ list navigation */

  function visibleTitleRows() {
    return titleRows.filter((row) => !row.classList.contains('is-filtered-out'));
  }

  function selectedTitleRow() {
    const rows = visibleTitleRows();
    return rows.find((row) => row.classList.contains('is-selected')) || rows[0] || null;
  }

  function focusTitleRow(row) {
    if (!row) return;
    const card = cardByGame.get(row.dataset.game);
    if (card) selectCard(card);
    row.focus({ preventScroll: true });
    row.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }

  function moveTitleSelection(delta) {
    const rows = visibleTitleRows();
    if (!rows.length) return;
    const current = selectedTitleRow();
    const currentIndex = current ? rows.indexOf(current) : -1;
    const nextIndex = Math.max(0, Math.min(rows.length - 1, currentIndex + delta));
    focusTitleRow(rows[nextIndex]);
  }

  if (titleList) {
    titleList.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const rows = visibleTitleRows();
      if (!rows.length) return;

      switch (event.key) {
        case 'ArrowDown': event.preventDefault(); moveTitleSelection(1); return;
        case 'ArrowUp': event.preventDefault(); moveTitleSelection(-1); return;
        case 'PageDown': event.preventDefault(); moveTitleSelection(8); return;
        case 'PageUp': event.preventDefault(); moveTitleSelection(-8); return;
        case 'Home': event.preventDefault(); focusTitleRow(rows[0]); return;
        case 'End': event.preventDefault(); focusTitleRow(rows[rows.length - 1]); return;
        case 'Enter':
          if (event.target === titleList) {
            const row = selectedTitleRow();
            if (row) {
              event.preventDefault();
              row.click();
            }
          }
          return;
        default: break;
      }

      if (event.key.length === 1 && /\S/.test(event.key)) {
        const letter = event.key.toLowerCase();
        const current = selectedTitleRow();
        const start = current ? rows.indexOf(current) + 1 : 0;
        const ordered = rows.slice(start).concat(rows.slice(0, start));
        const match = ordered.find((row) => $('.library-row-title', row)?.textContent.trim().toLowerCase().startsWith(letter));
        if (match) {
          event.preventDefault();
          focusTitleRow(match);
        }
      }
    });
  }

  function setSearch(value) {
    searchQuery = value.trim();
    if (listSearchClear) listSearchClear.hidden = !searchQuery;
    if (listSearch && listSearch.value !== value) listSearch.value = value;
    applyFilter(activeKind);
  }

  if (listSearch) {
    listSearch.addEventListener('input', () => setSearch(listSearch.value));
    listSearch.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSearch('');
        listSearch.blur();
        titleList?.focus();
      } else if (event.key === 'Enter') {
        const target = selectedCard && !selectedCard.classList.contains('is-filtered-out')
          ? selectedCard
          : cards.find((card) => !card.classList.contains('is-filtered-out'));
        const link = target ? $('.cabinet-link', target) : null;
        if (link) {
          event.preventDefault();
          link.click();
        }
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        titleList?.focus();
      }
    });
  }

  if (listSearchClear) {
    listSearchClear.addEventListener('click', () => {
      setSearch('');
      listSearch?.focus();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== '/' || viewMode !== 'list' || !listSearch) return;
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    listSearch.focus();
    listSearch.select();
  });

  /* ------------------------------------------------------------ generated audio */

  const soundButton = $('#sound-toggle');
  const soundLabel = $('#sound-label');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;
  let masterGain = null;
  let reverb = null;
  let reverbGain = null;
  let noiseBuffer = null;
  let soundEnabled = false;
  let musicTimer = 0;
  let musicStep = 0;
  let musicBar = 0;
  let nextMusicTime = 0;

  function setSoundButton(enabled, label) {
    if (!soundButton) return;
    soundButton.setAttribute('aria-pressed', String(enabled));
    soundButton.setAttribute('aria-label', label);
    if (soundLabel) soundLabel.textContent = enabled ? 'Sound on' : 'Sound off';
  }

  function prepareAudio() {
    if (!AudioContextClass) {
      setSoundButton(false, 'Audio unavailable');
      if (soundButton) soundButton.disabled = true;
      return false;
    }
    if (audioContext) return true;

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(audioContext.destination);

    reverb = audioContext.createConvolver();
    reverbGain = audioContext.createGain();
    const impulseLength = Math.floor(audioContext.sampleRate * 2.8);
    const impulse = audioContext.createBuffer(2, impulseLength, audioContext.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const samples = impulse.getChannelData(channel);
      for (let i = 0; i < samples.length; i++) {
        const tail = Math.pow(1 - i / samples.length, 2.8);
        samples[i] = (Math.random() * 2 - 1) * tail;
      }
    }
    reverb.buffer = impulse;
    reverbGain.gain.value = 0.2;
    masterGain.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(audioContext.destination);

    noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;
    return true;
  }

  function playTone(frequency, duration, volume) {
    if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + duration);
    envelope.gain.setValueAtTime(volume, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function playNoise(time, duration, cutoff, volume) {
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const envelope = audioContext.createGain();
    source.buffer = noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = cutoff;
    envelope.gain.setValueAtTime(volume, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(masterGain);
    source.start(time);
    source.stop(time + duration);
  }

  function scheduleChord(notes, time) {
    const barDuration = (60 / 172) * 4;
    const releaseTime = time + barDuration + 0.85;

    for (let index = 0; index < notes.length; index++) {
      const frequency = 440 * Math.pow(2, (notes[index] - 69) / 12);
      const filter = audioContext.createBiquadFilter();
      const envelope = audioContext.createGain();
      const pan = audioContext.createStereoPanner();
      const triangle = audioContext.createOscillator();
      const shimmer = audioContext.createOscillator();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(760, time);
      filter.frequency.linearRampToValueAtTime(1450, time + barDuration);
      envelope.gain.setValueAtTime(0.001, time);
      envelope.gain.linearRampToValueAtTime(0.034, time + 0.55);
      envelope.gain.setValueAtTime(0.034, time + barDuration * 0.68);
      envelope.gain.setTargetAtTime(0.001, releaseTime, 0.38);
      pan.pan.value = (index / Math.max(1, notes.length - 1) - 0.5) * 0.6;

      triangle.type = 'triangle';
      triangle.frequency.value = frequency;
      shimmer.type = 'sine';
      shimmer.frequency.value = frequency * 2;
      shimmer.detune.value = index % 2 ? -4 : 4;
      triangle.connect(filter);
      shimmer.connect(filter);
      filter.connect(envelope);
      envelope.connect(pan);
      pan.connect(masterGain);

      triangle.start(time);
      shimmer.start(time);
      triangle.stop(releaseTime + 1.6);
      shimmer.stop(releaseTime + 1.6);
    }
  }

  function scheduleMusicStep(step, time) {
    if (step === 0) {
      const progression = [
        [50, 53, 57, 60, 64],
        [46, 50, 53, 57, 60],
        [41, 45, 48, 52, 55],
        [48, 52, 55, 59, 62],
      ];
      scheduleChord(progression[musicBar % progression.length], time);
      musicBar++;
    }

    if (step === 0 || step === 7 || step === 10) {
      const kick = audioContext.createOscillator();
      const envelope = audioContext.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(125, time);
      kick.frequency.exponentialRampToValueAtTime(42, time + 0.12);
      envelope.gain.setValueAtTime(0.22, time);
      envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      kick.connect(envelope);
      envelope.connect(masterGain);
      kick.start(time);
      kick.stop(time + 0.17);
    }
    if (step === 4 || step === 12) playNoise(time, 0.13, 1100, 0.12);
    if (step % 2 === 0 || step === 11 || step === 15) playNoise(time, 0.035, 7600, 0.045);

    const bassNotes = [55, 0, 0, 82, 0, 73, 0, 55, 49, 0, 65, 0, 55, 0, 73, 0];
    const note = bassNotes[step];
    if (note) {
      const bass = audioContext.createOscillator();
      const filter = audioContext.createBiquadFilter();
      const envelope = audioContext.createGain();
      bass.type = 'triangle';
      bass.frequency.setValueAtTime(note, time);
      filter.type = 'lowpass';
      filter.frequency.value = 540;
      envelope.gain.setValueAtTime(0.075, time);
      envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      bass.connect(filter);
      filter.connect(envelope);
      envelope.connect(masterGain);
      bass.start(time);
      bass.stop(time + 0.13);
    }
  }

  function startMusic() {
    window.clearInterval(musicTimer);
    musicStep = 0;
    musicBar = 0;
    nextMusicTime = audioContext.currentTime + 0.04;
    const stepDuration = 60 / 172 / 4;
    musicTimer = window.setInterval(() => {
      while (nextMusicTime < audioContext.currentTime + 0.12) {
        scheduleMusicStep(musicStep, nextMusicTime);
        musicStep = (musicStep + 1) % 16;
        nextMusicTime += stepDuration;
      }
    }, 25);
  }

  function pauseAudio() {
    window.clearInterval(musicTimer);
    musicTimer = 0;
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.suspend().catch((error) => console.warn('Unable to suspend audio:', error));
    }
  }

  function resumeAudio() {
    if (!soundEnabled || document.hidden || !audioContext) return;
    audioContext.resume().then(() => {
      if (!soundEnabled || document.hidden) return;
      masterGain.gain.setTargetAtTime(0.55, audioContext.currentTime, 0.08);
      startMusic();
    }).catch((error) => console.error('Unable to resume arcade audio:', error));
  }

  if (soundButton) {
    soundButton.addEventListener('click', () => {
      if (soundEnabled) {
        soundEnabled = false;
        pauseAudio();
        setSoundButton(false, 'Enable music and interface sounds');
        return;
      }

      try {
        if (!prepareAudio()) return;
      } catch (error) {
        console.error('Unable to prepare arcade audio:', error);
        setSoundButton(false, 'Audio could not start');
        return;
      }

      audioContext.resume().then(() => {
        soundEnabled = true;
        masterGain.gain.setTargetAtTime(0.55, audioContext.currentTime, 0.08);
        startMusic();
        setSoundButton(true, 'Turn music and interface sounds off');
        playTone(920, 0.09, 0.04);
      }).catch((error) => {
        console.error('Unable to start arcade audio:', error);
        setSoundButton(false, 'Audio could not start');
      });
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseAudio();
    else resumeAudio();
  });

  window.addEventListener('pagehide', pauseAudio);
  window.addEventListener('pageshow', resumeAudio);

  document.addEventListener('pointerover', (e) => {
    if (!(e.target instanceof Element)) return;
    const control = e.target.closest('a, button');
    const previous = e.relatedTarget instanceof Element ? e.relatedTarget.closest('a, button') : null;
    if (control && control !== previous) playTone(720, 0.045, 0.018);
  });

  document.addEventListener('focusin', (e) => {
    if (e.target instanceof Element && e.target.matches('a, button')) playTone(820, 0.055, 0.025);
  });

  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('a, button')) playTone(520, 0.075, 0.03);
  });

  /* ------------------------------------------------------------ dialogs */

  for (const trigger of $$('[data-open]')) {
    trigger.addEventListener('click', () => {
      const dialog = document.getElementById(trigger.dataset.open);
      if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
      else if (dialog) dialog.setAttribute('open', '');
    });
  }

  for (const dialog of $$('dialog.sheet')) {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  }

  /* ------------------------------------------------------------ telemetry log */

  const logEl = $('#tele-log');
  const messages = [
    '> library entries: ' + total,
    '> local wasm: dave, 2048, quake',
    '> dosbox layer: keen4, duke2, custom',
    '> local saves: synced',
    '> awaiting player input',
  ];
  let logIndex = 0;

  function pushLog() {
    if (!logEl) return;
    const line = logEl.querySelector('p:last-child');
    if (line) {
      const cursor = line.querySelector('.cursor');
      if (cursor) cursor.remove();
    }
    const p = document.createElement('p');
    p.textContent = messages[logIndex % messages.length];
    logEl.appendChild(p);
    logIndex++;
    while (logEl.children.length > 4) logEl.removeChild(logEl.firstChild);

    // Put the blinking cursor on the freshest line only.
    const fresh = logEl.lastElementChild;
    if (fresh) {
      const c = document.createElement('span');
      c.className = 'cursor';
      c.textContent = '_';
      fresh.appendChild(c);
    }
  }

  if (logEl && !reduced) {
    // Seed the cursor on the existing final line.
    const last = logEl.lastElementChild;
    if (last && !last.querySelector('.cursor')) {
      const c = document.createElement('span');
      c.className = 'cursor';
      c.textContent = '_';
      last.appendChild(c);
    }
    setInterval(pushLog, 3200);
  }

  /* ------------------------------------------------------------ card tilt + glow */

  const canTilt = finePointer && !reduced;

  if (canTilt) {
    for (const card of cards) {
      let frame = 0;
      let mx = 0;
      let my = 0;

      const paint = () => {
        frame = 0;
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = (mx - rect.left) / rect.width;
        const py = (my - rect.top) / rect.height;
        const clamp = (v) => Math.max(0, Math.min(1, v));
        card.style.setProperty('--mx', `${clamp(px) * 100}%`);
        card.style.setProperty('--my', `${clamp(py) * 100}%`);
        card.style.setProperty('--ry', `${(px - 0.5) * 7}deg`);
        card.style.setProperty('--rx', `${(0.5 - py) * 7}deg`);
      };

      card.addEventListener('pointermove', (e) => {
        mx = e.clientX;
        my = e.clientY;
        if (!frame) frame = requestAnimationFrame(paint);
      });

      const reset = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '50%');
      };

      card.addEventListener('pointerleave', reset);
      card.addEventListener('blur', reset, true);
    }
  }

  /* ------------------------------------------------------------ reticle */

  const reticle = $('#reticle');

  if (reticle && finePointer && !reduced) {
    document.body.classList.add('has-reticle');
    let rx = window.innerWidth / 2;
    let ry = window.innerHeight / 2;
    let tx = rx;
    let ty = ry;
    let raf = 0;
    let visible = false;

    const loop = () => {
      rx += (tx - rx) * 0.22;
      ry += (ty - ry) * 0.22;
      reticle.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        rx = tx;
        ry = ty;
        reticle.classList.add('is-visible');
      }
      const hot = e.target instanceof Element
        ? e.target.closest('a, button, .cabinet, .selector-btn, input, textarea, select')
        : null;
      reticle.classList.toggle('is-hot', Boolean(hot));
      wake();
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
      visible = false;
      reticle.classList.remove('is-visible', 'is-hot');
    });

    window.addEventListener('blur', () => {
      visible = false;
      reticle.classList.remove('is-visible', 'is-hot');
    });
  }

  /* ------------------------------------------------------------ warp field */

  const canvas = $('#field');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

  if (canvas && ctx) {
    const PALETTE = [
      [150, 225, 255],
      [124, 247, 196],
      [155, 140, 255],
      [255, 177, 59],
      [235, 245, 255],
    ];
    let W = 0;
    let H = 0;
    let dpr = 1;
    let stars = [];
    let raf = 0;
    let last = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    function makeStar(initial) {
      const color = PALETTE[(Math.random() * PALETTE.length) | 0];
      return {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: initial ? Math.random() * 0.95 + 0.05 : 1,
        speed: 0.035 + Math.random() * 0.16,
        color,
        bright: 0.35 + Math.random() * 0.65,
      };
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const wanted = W < 640 ? 78 : W < 1100 ? 118 : 156;
      if (stars.length > wanted) stars.length = wanted;
      while (stars.length < wanted) stars.push(makeStar(true));

      if (reduced) drawStatic();
    }

    function project(s) {
      const f = Math.min(W, H) * 0.92;
      const depth = Math.max(s.z, 0.045);
      const scale = f / depth;
      return {
        x: W / 2 + pointer.x + s.x * scale,
        y: H / 2 + pointer.y + s.y * scale,
        a: Math.min(1, (1 - s.z) * 1.5) * s.bright,
        w: Math.max(0.35, (1 - s.z) * 2.2),
      };
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        const p = project(s);
        const [r, g, b] = s.color;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.15 + p.a * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.w * 0.8), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function frame(now) {
      raf = 0;
      if (!visible) return;
      const dt = Math.min(48, now - (last || now)) / 1000;
      last = now;

      pointer.x += (pointer.tx - pointer.x) * 0.035;
      pointer.y += (pointer.ty - pointer.y) * 0.035;

      ctx.clearRect(0, 0, W, H);

      for (const s of stars) {
        const prevZ = s.z;
        s.z -= s.speed * dt * 2.2;

        if (s.z <= 0.045) {
          s.z = 1;
          s.x = Math.random() * 2 - 1;
          s.y = Math.random() * 2 - 1;
          s.speed = 0.035 + Math.random() * 0.16;
          s.bright = 0.35 + Math.random() * 0.65;
          continue;
        }

        const p = project(s);
        const q = project({ ...s, z: Math.min(1, prevZ) });
        const [r, g, b] = s.color;

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.08 + p.a * 0.55})`;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (reduced) {
        drawStatic();
        return;
      }
      if (!raf) raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    window.addEventListener('resize', resize, { passive: true });

    if (finePointer) {
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        pointer.tx = (e.clientX / window.innerWidth - 0.5) * 34;
        pointer.ty = (e.clientY / window.innerHeight - 0.5) * 22;
      }, { passive: true });
    }

    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden;
      if (visible) {
        last = 0;
        start();
      } else {
        stop();
      }
    });

    resize();
    start();
  }
})();
