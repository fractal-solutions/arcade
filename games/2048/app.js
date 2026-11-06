/* 2048 — view layer for the reconstructed wasm engine. */
(() => {
  'use strict';

  const WASM_URL = 'game.wasm';
  const BEST_KEY = 'rea2048:best';
  const SLIDE_MS = 118;
  const LOCK_MS = 155;

  const $ = (sel) => document.querySelector(sel);

  const boardEl = $('#board');
  const gridBg = $('#grid-bg');
  const tilesEl = $('#tiles');
  const scoreEl = $('#score');
  const bestEl = $('#best');
  const deltaEl = $('#score-delta');
  const overlay = $('#overlay');
  const overlayKicker = $('#overlay-kicker');
  const overlayTitle = $('#overlay-title');
  const overlayText = $('#overlay-text');
  const keepGoingBtn = $('#keepgoing');
  const againBtn = $('#again');

  let wasm = null;
  let grid = new Array(16).fill(0);
  let tiles = [];
  let nextTileId = 1;
  let score = 0;
  let best = 0;
  let state = 0;
  let busy = false;
  let cellPx = 100;
  let gapPx = 10;

  /* ------------------------------------------------------------ helpers */
  const label = (v) => (v ? String(2 ** v) : '');
  const clampExp = (v) => Math.min(v, 16);
  const rowOf = (i) => Math.floor(i / 4);
  const colOf = (i) => i % 4;

  function lineIndex(dir, line, k) {
    switch (dir) {
      case 0: return k * 4 + line;             // up
      case 1: return line * 4 + (3 - k);       // right
      case 2: return (3 - k) * 4 + line;       // down
      default: return line * 4 + k;            // left
    }
  }

  function setTileClass(el, value) {
    for (let i = 0; i <= 16; i++) el.classList.remove('e' + i);
    el.classList.add('e' + clampExp(value));
  }

  function positionTile(t) {
    const x = colOf(t.index) * (cellPx + gapPx);
    const y = rowOf(t.index) * (cellPx + gapPx);
    t.el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function readBoard() {
    for (let i = 0; i < 16; i++) grid[i] = wasm.game_cell(i) >>> 0;
  }

  function persistBest() {
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (_) { /* ignore */ }
  }

  function loadBest() {
    try {
      const n = Number(localStorage.getItem(BEST_KEY) || 0);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (_) {
      return 0;
    }
  }

  /* ------------------------------------------------------------ geometry */
  function layout() {
    const cs = getComputedStyle(boardEl);
    gapPx = parseFloat(cs.getPropertyValue('--gap')) || 10;
    const inner = boardEl.clientWidth - gapPx * 2;
    cellPx = Math.max(8, (inner - gapPx * 3) / 4);
    tilesEl.style.setProperty('--cell', cellPx + 'px');

    // reposition without animating on resize
    for (const t of tiles) t.el.style.transition = 'none';
    for (const t of tiles) positionTile(t);
    requestAnimationFrame(() => {
      for (const t of tiles) t.el.style.transition = '';
    });
  }

  /* ------------------------------------------------------------ tiles */
  function createTile(index, value, pop) {
    const el = document.createElement('div');
    el.className = 'tile';
    setTileClass(el, value);
    el.textContent = label(value);

    const t = { id: nextTileId++, index, value, el };
    tilesEl.appendChild(el);
    tiles.push(t);
    positionTile(t);

    if (pop) {
      el.classList.add('tile-new');
      setTimeout(() => el.classList.remove('tile-new'), 190);
    }
    return t;
  }

  function removeTile(t) {
    t.el.remove();
    tiles = tiles.filter((x) => x !== t);
  }

  function clearTiles() {
    for (const t of tiles) t.el.remove();
    tiles = [];
  }

  /* Plan the visual slide from the pre-move grid. Mirrors game.c exactly. */
  function planSlide(prev, dir) {
    const out = [];
    for (let line = 0; line < 4; line++) {
      const items = [];
      for (let k = 0; k < 4; k++) {
        const idx = lineIndex(dir, line, k);
        if (prev[idx]) items.push({ from: idx, value: prev[idx] });
      }

      const groups = [];
      for (const it of items) {
        const last = groups[groups.length - 1];
        if (last && last.value === it.value && !last.merged) {
          last.value += 1;
          last.merged = true;
          last.absorb = it.from;
        } else {
          groups.push({ from: it.from, value: it.value, merged: false, absorb: -1 });
        }
      }

      groups.forEach((g, k) => {
        out.push({
          from: g.from,
          to: lineIndex(dir, line, k),
          value: g.value,
          merged: g.merged,
          absorb: g.absorb,
        });
      });
    }
    return out;
  }

  function animateSlide(prev, dir) {
    const byIndex = new Map();
    for (const t of tiles) byIndex.set(t.index, t);

    for (const m of planSlide(prev, dir)) {
      const t = byIndex.get(m.from);
      if (!t) continue;
      byIndex.delete(m.from);

      t.index = m.to;
      t.value = m.value;
      t.el.textContent = label(m.value);
      setTileClass(t.el, m.value);
      positionTile(t);

      if (m.absorb >= 0) {
        const absorbed = byIndex.get(m.absorb);
        if (absorbed) {
          byIndex.delete(m.absorb);
          absorbed.index = m.to;
          positionTile(absorbed);
          absorbed.el.classList.add('tile-merge-away');
          setTimeout(() => removeTile(absorbed), SLIDE_MS);
        }
      }

      if (m.merged) {
        t.el.classList.remove('tile-merged');
        // force the animation to restart if two merges land quickly
        void t.el.offsetWidth;
        t.el.classList.add('tile-merged');
        setTimeout(() => t.el.classList.remove('tile-merged'), 240);
      }
    }

    // spawn happens after the slide in the engine; add it now with a pop
    const spawn = wasm.game_last_spawn_pos() >>> 0;
    if (spawn > 0) {
      const value = wasm.game_last_spawn_val() >>> 0;
      createTile(spawn - 1, value, true);
    }
  }

  /* ------------------------------------------------------------ hud */
  function showDelta(n) {
    if (!n) return;
    deltaEl.textContent = '+' + n;
    deltaEl.classList.remove('show');
    void deltaEl.offsetWidth;
    deltaEl.classList.add('show');
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
  }

  /* ------------------------------------------------------------ overlay */
  function hideOverlay() {
    overlay.hidden = true;
  }

  function handleState() {
    if (state === 1) {
      overlayKicker.textContent = '2048 reached';
      overlayTitle.textContent = 'You win';
      overlayText.textContent = 'The original core stops here. Keep going is a small addition from the port.';
      keepGoingBtn.hidden = false;
      againBtn.textContent = 'New game';
      overlay.hidden = false;
    } else if (state === 2) {
      overlayKicker.textContent = 'no moves left';
      overlayTitle.textContent = 'Game over';
      overlayText.textContent = `You scored ${score.toLocaleString()}.`;
      keepGoingBtn.hidden = true;
      againBtn.textContent = 'Try again';
      overlay.hidden = false;
    } else {
      hideOverlay();
    }
  }

  /* ------------------------------------------------------------ game */
  function freshSeed() {
    try {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return (a[0] ^ (Date.now() >>> 0)) >>> 0;
    } catch (_) {
      return ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    }
  }

  function newGame() {
    wasm.game_new(freshSeed());
    wasm.game_set_best(best);

    clearTiles();
    readBoard();
    score = wasm.game_score() >>> 0;
    state = wasm.game_state() >>> 0;
    busy = false;

    for (let i = 0; i < 16; i++) {
      if (grid[i]) createTile(i, grid[i], true);
    }

    updateHud();
    hideOverlay();
    requestAnimationFrame(layout);
  }

  function applyMove(dir) {
    if (busy || !wasm || state !== 0) return;

    const prev = grid.slice();
    const prevScore = score;
    const moved = wasm.game_move(dir) >>> 0;
    if (!moved) return;

    busy = true;
    animateSlide(prev, dir);
    readBoard();
    score = wasm.game_score() >>> 0;
    state = wasm.game_state() >>> 0;

    const engineBest = wasm.game_best() >>> 0;
    if (engineBest > best) best = engineBest;
    updateHud();
    showDelta(score - prevScore);
    persistBest();

    setTimeout(() => {
      busy = false;
      handleState();
    }, LOCK_MS);
  }

  /* ------------------------------------------------------------ input */
  const KEYMAP = {
    ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3,
    w: 0, d: 1, s: 2, a: 3,
    W: 0, D: 1, S: 2, A: 3,
    k: 0, l: 1, j: 2, h: 3,
  };

  function bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dir = KEYMAP[e.key];
      if (dir === undefined) return;
      e.preventDefault();
      applyMove(dir);
    }, { passive: false });

    for (const btn of document.querySelectorAll('[data-dir]')) {
      btn.addEventListener('click', () => applyMove(Number(btn.dataset.dir)));
    }

    $('#newgame').addEventListener('click', newGame);
    againBtn.addEventListener('click', newGame);
    keepGoingBtn.addEventListener('click', () => {
      wasm.game_continue();
      state = wasm.game_state() >>> 0;
      hideOverlay();
    });

    // swipe
    let sx = 0, sy = 0, tracking = false;
    boardEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      tracking = true;
      sx = e.clientX;
      sy = e.clientY;
      boardEl.setPointerCapture?.(e.pointerId);
    });
    boardEl.addEventListener('pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) applyMove(dx > 0 ? 1 : 3);
      else applyMove(dy > 0 ? 2 : 0);
    });
    boardEl.addEventListener('pointercancel', () => { tracking = false; });
  }

  /* ------------------------------------------------------------ boot */
  function buildGrid() {
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      gridBg.appendChild(s);
    }
  }

  async function boot() {
    buildGrid();
    best = loadBest();
    bindInput();

    try {
      const res = await fetch(WASM_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${WASM_URL}`);
      const bytes = await res.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      wasm = instance.exports;

      wasm.game_set_best(best);
      newGame();
      layout();

      if ('ResizeObserver' in window) new ResizeObserver(layout).observe(boardEl);
      else window.addEventListener('resize', layout);

    } catch (err) {
      console.error(err);
      overlayKicker.textContent = 'wasm error';
      overlayTitle.textContent = 'Could not start';
      overlayText.textContent = String(err.message || err);
      keepGoingBtn.hidden = true;
      againBtn.textContent = 'Reload';
      againBtn.onclick = () => location.reload();
      overlay.hidden = false;
    }
  }

  boot();
})();
