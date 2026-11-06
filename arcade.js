/* WASM Arcade — landing page behaviour
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
  const total = cards.length;
  const byKind = (kind) => kind === 'all' ? total : cards.filter((c) => c.dataset.kind === kind).length;

  const countEl = $('#cabinet-count');
  if (countEl) countEl.textContent = `${total} cabinet${total === 1 ? '' : 's'}`;

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
  const KINDS = new Set(['all', 'wasm', 'emu', 'data']);

  function applyFilter(kind) {
    if (!KINDS.has(kind)) kind = 'all';
    let visible = 0;

    for (const card of cards) {
      const show = kind === 'all' || card.dataset.kind === kind;
      card.classList.toggle('is-filtered-out', !show);
      if (show) visible++;
      if (!show) card.style.removeProperty('--rx'), card.style.removeProperty('--ry');
    }

    for (const btn of filterButtons) {
      const active = btn.dataset.filter === kind;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
    }

    if (statusEl) {
      statusEl.textContent = `Showing ${visible} of ${total} cabinet${total === 1 ? '' : 's'}${kind === 'all' ? '' : ` · ${kind}`}`;
    }
    if (emptyEl) emptyEl.hidden = visible !== 0;
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

  applyFilter('all');

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
    '> cabinets online: ' + total,
    '> wasm engines: dave, 2048, quake',
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
