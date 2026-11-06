/*
 * Dangerous Dave host.
 *
 * The C game owns all game state and draws into a 320x200 RGBA framebuffer in
 * WASM memory.  This file only:
 *   - provides the six WASI shim functions the libc needs
 *   - forwards keyboard and touch input as SDL scancodes
 *   - runs the original 14 ms game tick and paints the framebuffer
 *   - remembers progress/settings and adds ergonomic touch controls
 */

const WASM_URL = new URL("dave.wasm", import.meta.url);
const STEP_MS = 14;
const SCREEN_W = 320;
const SCREEN_H = 200;
const TUNE_COUNT = 13;
const SAMPLE_RATE = 44100;
const MAX_LEVEL = 9;

const PROGRESS_KEY = "arcade.dave.progress.v1";
const SETTINGS_KEY = "arcade.settings.v1";

const canvas = document.getElementById("screen");
const statusEl = document.getElementById("status");
const titleOverlay = document.getElementById("title-overlay");
const pauseOverlay = document.getElementById("pause-overlay");
const toastEl = document.getElementById("toast");
const progressLine = document.getElementById("progress-line");
const hudLevel = document.getElementById("hud-level");
const hudScore = document.getElementById("hud-score");
const hudLives = document.getElementById("hud-lives");
const hudBest = document.getElementById("hud-best");
const titleHeading = document.getElementById("title-heading");
const titleKicker = document.getElementById("title-kicker");
const titleCopy = document.getElementById("title-copy");
const continueButton = document.getElementById("continue-button");
const newGameButton = document.getElementById("new-game-button");
const startButton = document.getElementById("start-button");
const dpad = document.getElementById("dpad");
const dpadKnob = document.getElementById("dpad-knob");
const resetButton = document.getElementById("reset-button");

const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const image = ctx.createImageData(SCREEN_W, SCREEN_H);
const dst32 = new Uint32Array(image.data.buffer);

let memory = null;
let api = null;
let accumulator = 0;
let lastTime = 0;
let running = false;
let paused = false;
let lastPhase = -1;
let booted = false;

/* --------------------------------------------------------------- settings */

const DEFAULT_SETTINGS = {
  sound: true,
  haptics: true,
};

let settings = loadSettings();
const hapticsSupported =
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
const fullscreenSupported = Boolean(
  document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen
);

function loadSettings() {
  const merged = { ...DEFAULT_SETTINGS };
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (stored && typeof stored === "object") {
      if (typeof stored.sound === "boolean") merged.sound = stored.sound;
      if (typeof stored.haptics === "boolean") merged.haptics = stored.haptics;
    }
  } catch (_) {
    /* storage can be unavailable in private modes */
  }
  return merged;
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (_) {
    /* ignore quota/private-mode failures */
  }
}

/* --------------------------------------------------------------- progress */

function clampLevel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.min(MAX_LEVEL, Math.trunc(number)));
}

function loadProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    if (stored && typeof stored === "object") {
      return {
        highestLevel: clampLevel(stored.highestLevel),
        bestScore: Math.max(0, Number(stored.bestScore) | 0),
        updated: Math.max(0, Number(stored.updated) || 0),
      };
    }
  } catch (_) {
    /* ignore corrupt or unavailable storage */
  }
  return { highestLevel: 1, bestScore: 0, updated: 0 };
}

let progress = loadProgress();
const session = {
  active: false,
  level: 0,
  lives: 4,
  score: 0,
};

function persistProgress(force = false) {
  const beforeLevel = progress.highestLevel;
  const beforeScore = progress.bestScore;

  if (session.level > progress.highestLevel) {
    progress.highestLevel = clampLevel(session.level);
  }
  if (session.score > progress.bestScore) {
    progress.bestScore = session.score;
  }

  const changed =
    force ||
    progress.highestLevel !== beforeLevel ||
    progress.bestScore !== beforeScore;
  if (!changed) return;

  progress.updated = Date.now();
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (_) {
    /* ignore quota/private-mode failures */
  }
  updateProgressUI();
}

function updateProgressUI() {
  if (progressLine) {
    progressLine.textContent =
      progress.highestLevel > 1
        ? `Saved run: level ${progress.highestLevel}${
            progress.bestScore ? ` · best score ${progress.bestScore}` : ""
          }`
        : "No saved run yet · progress saves automatically";
  }
  if (hudBest) hudBest.textContent = String(progress.highestLevel);
  if (titleHeading) {
    titleHeading.textContent =
      progress.highestLevel > 1
        ? `Continue at level ${progress.highestLevel}?`
        : "Ready to play?";
  }
  if (titleKicker) {
    titleKicker.textContent =
      progress.highestLevel > 1 ? "Saved run" : "Fresh start";
  }
  if (titleCopy) {
    titleCopy.textContent =
      progress.highestLevel > 1
        ? "Your furthest level is stored in this browser. Continue where you left off, or start over from level 1."
        : "Reach level 9 to finish the original run. Progress saves automatically at every new level.";
  }
  if (continueButton) {
    continueButton.textContent =
      progress.highestLevel > 1
        ? `Continue level ${progress.highestLevel}`
        : "Start level 1";
  }
  if (newGameButton) {
    newGameButton.classList.toggle("hidden", progress.highestLevel <= 1);
  }
}

function updateHud() {
  if (!hudLevel) return;
  const shownLevel = session.level > 0 ? session.level : progress.highestLevel;
  hudLevel.textContent = String(shownLevel);
  hudScore.textContent = String(Math.max(0, session.score));
  hudLives.textContent = session.active ? String(Math.max(0, session.lives)) : "—";
  hudBest.textContent = String(progress.highestLevel);
}

function syncSessionFromGame() {
  if (!api || api.dave_phase() !== 1) return;
  const level = api.dave_level();
  if (level <= 0) return;

  const previousLevel = session.level;
  session.active = true;
  session.level = level;
  session.lives = api.dave_lives();
  session.score = api.dave_score();

  if (level > previousLevel && previousLevel > 0) {
    if (level > progress.highestLevel) {
      progress.highestLevel = clampLevel(level);
      persistProgress();
      haptic([14, 30, 16]);
      toast(`Level ${level} reached · saved`);
    }
  }

  updateHud();
}

/* ---------------------------------------------------------------- haptics */

let lastHapticAt = 0;

function haptic(pattern) {
  if (!settings.haptics || !hapticsSupported) return;
  const now = performance.now();
  if (typeof pattern === "number") {
    if (now - lastHapticAt < 26) return;
    lastHapticAt = now;
  }
  try {
    navigator.vibrate(pattern);
  } catch (_) {
    /* some browsers expose vibrate but reject calls */
  }
}

/* ----------------------------------------------------------------- audio */

let audioCtx = null;
let audioGain = null;
let audioTracks = [];
let audioSource = null;
let lastAudioGeneration = -1;

function collectTunes() {
  audioTracks = [];
  for (let i = 0; i < TUNE_COUNT; i++) {
    audioTracks.push({
      ptr: api.dave_tune_data(i),
      size: api.dave_tune_size(i),
      buffer: null,
    });
  }
  decodeTuneBuffers();
}

/* Create the WebAudio graph and decode the PC-speaker PCM exactly once.
 * Browsers only allow this after a user gesture, so it is called from the
 * first keyboard or pointer event. */
function decodeTuneBuffers() {
  if (!audioCtx) return;
  for (const track of audioTracks) {
    if (track.buffer || !track.ptr || !track.size) continue;
    const samples = track.size >> 1;
    const buffer = audioCtx.createBuffer(1, samples, SAMPLE_RATE);
    const mono = buffer.getChannelData(0);
    const pcm = new Int16Array(memory.buffer, track.ptr, samples);
    for (let i = 0; i < samples; i++) {
      mono[i] = pcm[i] / 32768;
    }
    track.buffer = buffer;
  }
}

function unlockAudio() {
  if (!api) return;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      audioCtx = new AudioContextClass();
    } catch (error) {
      console.warn("WebAudio unavailable:", error);
      return;
    }
    audioGain = audioCtx.createGain();
    audioGain.gain.value = settings.sound ? 0.8 : 0;
    audioGain.connect(audioCtx.destination);
  }

  decodeTuneBuffers();

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

function stopAudioSource() {
  if (!audioSource) return;
  const source = audioSource;
  audioSource = null;
  try {
    source.stop();
  } catch (_) {
    /* already stopped */
  }
}

/* The C game bumps a generation counter every time it plays, resumes or
 * stops a tune, so the host just follows that. */
function syncAudio() {
  if (!api) return;
  const generation = api.dave_audio_generation();
  if (generation === lastAudioGeneration) return;
  lastAudioGeneration = generation;

  stopAudioSource();

  if (!settings.sound || !audioCtx || api.dave_audio_paused()) return;

  const track = audioTracks[api.dave_audio_tune()];
  if (!track || !track.buffer) return;

  const source = audioCtx.createBufferSource();
  source.buffer = track.buffer;
  source.connect(audioGain);
  source.onended = () => {
    if (audioSource === source) audioSource = null;
  };
  source.start();
  audioSource = source;
}

/* ------------------------------------------------------------- ui  helpers */

function showStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
  statusEl.classList.remove("hidden");
}

function hideStatus() {
  statusEl.classList.add("hidden");
}

let toastTimer = null;

function toast(text, duration = 1500) {
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.classList.remove("hidden");
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.add("hidden");
    toastTimer = null;
  }, duration);
}

function applySettings() {
  if (audioGain) {
    audioGain.gain.value = settings.sound ? 0.8 : 0;
  }
  for (const button of document.querySelectorAll("[data-setting]")) {
    const key = button.dataset.setting;
    const on = Boolean(settings[key]);
    button.setAttribute("aria-pressed", String(on));
    const label = button.querySelector("b");
    if (label) label.textContent = on ? "on" : "off";
    if (key === "haptics" && !hapticsSupported) {
      button.title = "Haptics need a phone or a browser that supports vibration";
    }
  }
  for (const button of document.querySelectorAll("[data-fullscreen]")) {
    button.hidden = !fullscreenSupported;
  }
}

function toggleSetting(key) {
  if (!(key in settings)) return;
  settings[key] = !settings[key];
  saveSettings();
  applySettings();

  if (key === "sound") {
    if (settings.sound) {
      unlockAudio();
      lastAudioGeneration = -1;
      syncAudio();
    } else {
      stopAudioSource();
    }
  }

  if (key === "haptics" && settings.haptics) {
    haptic(14);
  }
  toast(`${key} ${settings[key] ? "on" : "off"}`);
}

function updateStartButton() {
  if (!startButton) return;
  let label = "START";
  let mode = "start";
  if (paused) {
    label = "RESUME";
    mode = "resume";
  } else if (api && api.dave_phase() === 1) {
    label = "PAUSE";
    mode = "pause";
  }
  startButton.textContent = label;
  startButton.dataset.mode = mode;
  startButton.setAttribute(
    "aria-label",
    mode === "pause" ? "Pause game" : mode === "resume" ? "Resume game" : "Start game"
  );
}

function showTitleOverlay() {
  if (!api || paused || api.dave_phase() !== 0) return;
  updateProgressUI();
  titleOverlay.classList.remove("hidden");
}

function hideTitleOverlay() {
  titleOverlay.classList.add("hidden");
}

/* ----------------------------------------------------------------- state */

function hideOverlays() {
  titleOverlay.classList.add("hidden");
  pauseOverlay.classList.add("hidden");
}

function startGame(level) {
  if (!api) return;
  const target = clampLevel(level);

  unlockAudio();
  hideOverlays();
  releaseAllSources();
  stopAudioSource();

  paused = false;
  api.dave_start_level(target);

  session.active = true;
  session.level = target;
  session.lives = 4;
  session.score = 0;

  lastPhase = 1;
  lastTime = performance.now();
  accumulator = 0;
  lastAudioGeneration = -1;
  updateHud();
  updateStartButton();
  haptic(10);
}

function restartLevel() {
  if (!api) return;
  const level = session.level > 0 ? session.level : progress.highestLevel;
  startGame(level);
  toast(`Level ${level} restarted`);
}

function goToTitle() {
  if (!api) return;
  releaseAllSources();
  stopAudioSource();
  api.dave_show_intro();

  paused = false;
  pauseOverlay.classList.add("hidden");
  session.active = false;
  session.level = 0;
  session.lives = 0;

  lastPhase = 0;
  lastTime = performance.now();
  accumulator = 0;
  updateHud();
  updateStartButton();
  showTitleOverlay();
}

function setPaused(value) {
  if (!api) return;
  if (value && api.dave_phase() !== 1) {
    return;
  }

  paused = Boolean(value);
  if (paused) {
    releaseAllSources();
    stopAudioSource();
    persistProgress();
    pauseOverlay.classList.remove("hidden");
    titleOverlay.classList.add("hidden");
  } else {
    pauseOverlay.classList.add("hidden");
    lastTime = performance.now();
    accumulator = 0;
    lastAudioGeneration = -1;
    if (api.dave_phase() === 0) showTitleOverlay();
  }
  updateStartButton();
}

function handlePauseKey() {
  if (!api) return;
  if (paused) {
    setPaused(false);
  } else if (api.dave_phase() === 1) {
    setPaused(true);
  } else if (titleOverlay.classList.contains("hidden")) {
    showTitleOverlay();
  } else {
    hideTitleOverlay();
  }
}

/* ---------------------------------------------------------------- input */

const KEYMAP = {
  ArrowLeft: [80],
  ArrowRight: [79],
  ArrowUp: [82],
  ArrowDown: [81],
  KeyA: [80],
  KeyD: [79],
  KeyW: [82],
  KeyS: [81],
  Space: [44, 82],
  Enter: [40],
  NumpadEnter: [40],
  ControlLeft: [224],
  ControlRight: [224],
  AltLeft: [226],
  AltRight: [226],
  KeyZ: [224],
  KeyX: [82],
  KeyJ: [224],
  KeyK: [226],
  KeyY: [28],
  KeyN: [17],
  BracketLeft: [47],
  BracketRight: [48],
};

const ACTION_SCANS = {
  jump: [82],
  fire: [224],
  jet: [226],
};

/* A scan is held while at least one source (keyboard key, pad direction or
 * touch button) still wants it.  Source counting keeps overlapping bindings
 * from releasing each other. */
const scanSources = new Map();
const activeScans = new Set();
const pendingReleases = new Set();
const heldCodes = new Set();

function pressScan(scan, source) {
  if (!api) return false;
  let sources = scanSources.get(scan);
  if (!sources) {
    sources = new Set();
    scanSources.set(scan, sources);
  }
  if (sources.has(source)) return false;

  const wasHeld = sources.size > 0;
  sources.add(source);
  if (!wasHeld) {
    pendingReleases.delete(scan);
    activeScans.add(scan);
    api.dave_key(scan, 1);
  }
  return !wasHeld;
}

function releaseScan(scan, source) {
  const sources = scanSources.get(scan);
  if (!sources || !sources.delete(source)) return false;
  if (sources.size === 0) {
    scanSources.delete(scan);
    pendingReleases.add(scan);
  }
  return true;
}

/* A tap can begin and end between two 14 ms game ticks, and title/gameplay
 * code reads the live key state.  Keep releases queued until at least one
 * frame has seen the key held, then let go. */
function flushPendingReleases() {
  if (!api || pendingReleases.size === 0) return;
  for (const scan of pendingReleases) {
    api.dave_key(scan, 0);
    activeScans.delete(scan);
  }
  pendingReleases.clear();
}

function releaseAllSources() {
  if (api) api.dave_flush_keys();
  scanSources.clear();
  activeScans.clear();
  pendingReleases.clear();

  dpadDirections.clear();
  dpadPointer = null;
  dpad.classList.remove("is-active", "dir-up", "dir-right", "dir-down", "dir-left");
  dpadKnob.style.setProperty("--kx", "0px");
  dpadKnob.style.setProperty("--ky", "0px");

  for (const state of holdStates.values()) {
    state.pointers.clear();
    state.button.classList.remove("held");
  }
}

function pressCode(code) {
  const scans = KEYMAP[code];
  if (!scans || heldCodes.has(code)) return false;
  heldCodes.add(code);
  for (const scan of scans) pressScan(scan, `key:${code}`);
  return true;
}

function releaseCode(code) {
  const scans = KEYMAP[code];
  if (!scans || !heldCodes.has(code)) return false;
  heldCodes.delete(code);
  for (const scan of scans) releaseScan(scan, `key:${code}`);
  return true;
}

/* ------------------------------------------------------------- d-pad */

const DPAD_SCANS = {
  up: 82,
  right: 79,
  down: 81,
  left: 80,
};
const dpadDirections = new Set();
let dpadPointer = null;

function setDpadDirections(next) {
  const before = [...dpadDirections].sort().join(",");
  for (const direction of [...dpadDirections]) {
    if (!next.has(direction)) {
      dpadDirections.delete(direction);
      releaseScan(DPAD_SCANS[direction], "dpad");
    }
  }
  for (const direction of next) {
    if (!dpadDirections.has(direction)) {
      dpadDirections.add(direction);
      pressScan(DPAD_SCANS[direction], "dpad");
    }
  }

  for (const direction of ["up", "right", "down", "left"]) {
    dpad.classList.toggle(`dir-${direction}`, next.has(direction));
  }
  dpad.classList.toggle("is-active", next.size > 0);

  const after = [...next].sort().join(",");
  if (after && after !== before) haptic(4);
}

function updateDpad(event) {
  const rect = dpad.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radius = Math.min(rect.width, rect.height) / 2;

  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const distance = Math.hypot(dx, dy);

  const travel = radius * 0.34;
  let knobX = dx;
  let knobY = dy;
  if (distance > travel) {
    knobX = (dx / distance) * travel;
    knobY = (dy / distance) * travel;
  }
  dpadKnob.style.setProperty("--kx", `${knobX.toFixed(1)}px`);
  dpadKnob.style.setProperty("--ky", `${knobY.toFixed(1)}px`);

  const next = new Set();
  if (distance >= radius * 0.2) {
    const nx = dx / distance;
    const ny = dy / distance;
    const threshold = 0.38; // 8-way sectors: both axes fire near a diagonal
    if (nx > threshold) next.add("right");
    if (nx < -threshold) next.add("left");
    if (ny > threshold) next.add("down");
    if (ny < -threshold) next.add("up");
  }
  setDpadDirections(next);
}

function endDpad(event) {
  if (event && dpadPointer !== null && event.pointerId !== dpadPointer) return;
  dpadPointer = null;
  setDpadDirections(new Set());
  dpadKnob.style.setProperty("--kx", "0px");
  dpadKnob.style.setProperty("--ky", "0px");
}

dpad.addEventListener("pointerdown", (event) => {
  if (paused || !api) return;
  if (dpadPointer !== null) return;
  event.preventDefault();
  unlockAudio();
  dpadPointer = event.pointerId;
  try {
    dpad.setPointerCapture(event.pointerId);
  } catch (_) {
    /* pointer capture is a nicety, not a requirement */
  }
  haptic(6);
  updateDpad(event);
});

dpad.addEventListener("pointermove", (event) => {
  if (event.pointerId !== dpadPointer) return;
  event.preventDefault();
  updateDpad(event);
});

dpad.addEventListener("pointerup", endDpad);
dpad.addEventListener("pointercancel", endDpad);
dpad.addEventListener("lostpointercapture", endDpad);
dpad.addEventListener("contextmenu", (event) => event.preventDefault());

/* --------------------------------------------------------- action buttons */

const holdStates = new Map();

for (const button of document.querySelectorAll("[data-action]")) {
  const action = button.dataset.action;
  const scans = ACTION_SCANS[action];
  if (!scans) continue;

  const state = {
    button,
    action,
    scans,
    pointers: new Set(),
  };
  holdStates.set(button, state);

  const down = (event) => {
    if (paused || !api) return;
    event.preventDefault();
    unlockAudio();
    if (state.pointers.has(event.pointerId)) return;
    state.pointers.add(event.pointerId);
    try {
      button.setPointerCapture(event.pointerId);
    } catch (_) {
      /* ignore */
    }
    button.classList.add("held");
    for (const scan of scans) {
      pressScan(scan, `btn:${action}:${event.pointerId}`);
    }
    haptic(action === "jump" ? 12 : 7);
  };

  const up = (event) => {
    const pointerId = event ? event.pointerId : null;
    if (pointerId !== null && !state.pointers.has(pointerId)) return;
    event?.preventDefault();

    const ids = pointerId === null ? [...state.pointers] : [pointerId];
    for (const id of ids) {
      state.pointers.delete(id);
      for (const scan of scans) {
        releaseScan(scan, `btn:${action}:${id}`);
      }
    }
    if (state.pointers.size === 0) {
      button.classList.remove("held");
    }
  };

  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
  button.addEventListener("lostpointercapture", up);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}

startButton.addEventListener("click", () => {
  unlockAudio();
  if (paused) {
    setPaused(false);
    return;
  }
  if (!api) return;
  if (api.dave_phase() === 1) {
    setPaused(true);
    return;
  }
  startGame(progress.highestLevel);
});

/* ------------------------------------------------------------- keyboard */

window.addEventListener("keydown", (event) => {
  unlockAudio();

  if (event.code === "Escape") {
    event.preventDefault();
    if (!event.repeat) handlePauseKey();
    return;
  }

  if (event.code === "KeyF" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (!fullscreenSupported) return;
    event.preventDefault();
    if (!event.repeat) toggleFullscreen();
    return;
  }

  if (
    (event.code === "Enter" || event.code === "NumpadEnter" || event.code === "Space") &&
    !event.repeat &&
    (paused || (api && api.dave_phase() === 0))
  ) {
    event.preventDefault();
    if (paused) setPaused(false);
    else startGame(progress.highestLevel);
    return;
  }

  if (!KEYMAP[event.code]) return;
  event.preventDefault();
  if (!event.repeat) pressCode(event.code);
});

window.addEventListener("keyup", (event) => {
  if (!KEYMAP[event.code]) return;
  event.preventDefault();
  releaseCode(event.code);
});

window.addEventListener("blur", () => {
  releaseAllSources();
  stopAudioSource();
  if (api) lastAudioGeneration = api.dave_audio_generation();
});

/* ------------------------------------------------------------- ui wiring */

for (const button of document.querySelectorAll("[data-setting]")) {
  button.addEventListener("click", () => toggleSetting(button.dataset.setting));
}

for (const button of document.querySelectorAll("[data-fullscreen]")) {
  button.addEventListener("click", toggleFullscreen);
}

document.getElementById("resume-button").addEventListener("click", () => setPaused(false));
document.getElementById("restart-button").addEventListener("click", restartLevel);
document.getElementById("title-button").addEventListener("click", goToTitle);
continueButton.addEventListener("click", () => startGame(progress.highestLevel));
newGameButton.addEventListener("click", () => startGame(1));

resetButton.addEventListener("click", () => {
  if (resetButton.dataset.confirm !== "1") {
    resetButton.dataset.confirm = "1";
    resetButton.textContent = "Tap again to erase saved progress";
    setTimeout(() => {
      resetButton.dataset.confirm = "0";
      resetButton.textContent = "Reset saved progress";
    }, 3200);
    return;
  }
  resetButton.dataset.confirm = "0";
  resetButton.textContent = "Reset saved progress";
  progress = { highestLevel: 1, bestScore: 0, updated: 0 };
  session.score = 0;
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch (_) {
    /* ignore */
  }
  updateProgressUI();
  goToTitle();
  toast("Saved progress erased");
});

/* ------------------------------------------------------------ fullscreen */

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

async function toggleFullscreen() {
  if (!fullscreenSupported) return;
  try {
    if (!fullscreenElement()) {
      const request =
        document.documentElement.requestFullscreen ||
        document.documentElement.webkitRequestFullscreen;
      await request.call(document.documentElement);
      try {
        await screen.orientation?.lock?.("landscape");
      } catch (_) {
        /* orientation lock is optional */
      }
      setTimeout(() => {
        if (window.innerHeight > window.innerWidth) {
          toast("Rotate your phone for a bigger view", 2600);
        }
      }, 450);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      await exit.call(document);
    }
  } catch (error) {
    toast("Fullscreen unavailable");
  }
  haptic(8);
}

function syncFullscreenClass() {
  document.body.classList.toggle("is-fullscreen", Boolean(fullscreenElement()));
}
document.addEventListener("fullscreenchange", syncFullscreenClass);
document.addEventListener("webkitfullscreenchange", syncFullscreenClass);

/* --------------------------------------------------------------- game loop */

function getView() {
  return new DataView(memory.buffer);
}

function makeWasiImports() {
  const decoder = new TextDecoder();

  return {
    wasi_snapshot_preview1: {
      fd_write(fd, iovs, iovsLen, nwritten) {
        const dv = getView();
        let written = 0;
        let text = "";
        for (let i = 0; i < iovsLen; i++) {
          const ptr = dv.getUint32(iovs + i * 8, true);
          const len = dv.getUint32(iovs + i * 8 + 4, true);
          if (len) {
            text += decoder.decode(new Uint8Array(memory.buffer, ptr, len));
          }
          written += len;
        }
        if (nwritten) {
          dv.setUint32(nwritten, written, true);
        }
        if (text) {
          if (fd === 2) console.warn(text.trimEnd());
          else console.log(text.trimEnd());
        }
        return 0;
      },

      fd_close() {
        return 0;
      },

      fd_fdstat_get(fd, buf) {
        const dv = getView();
        for (let i = 0; i < 24; i++) {
          dv.setUint8(buf + i, 0);
        }
        dv.setUint8(buf, 2); // character device
        return 0;
      },

      fd_seek(fd, offsetLo, offsetHi, whence, newOffsetPtr) {
        if (newOffsetPtr) {
          getView().setBigUint64(newOffsetPtr, 0n, true);
        }
        return 0;
      },

      proc_exit(code) {
        throw new Error(`WASM exited with code ${code}`);
      },

      random_get(buf, len) {
        const u8 = new Uint8Array(memory.buffer, buf, len);
        if (globalThis.crypto && crypto.getRandomValues) {
          crypto.getRandomValues(u8);
        } else {
          for (let i = 0; i < len; i++) {
            u8[i] = (Math.random() * 256) | 0;
          }
        }
        return 0;
      },
    },
  };
}

async function boot() {
  try {
    const response = await fetch(WASM_URL);
    if (!response.ok) {
      throw new Error(`could not load ${WASM_URL.pathname}: HTTP ${response.status}`);
    }
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, makeWasiImports());
    api = instance.exports;
    memory = api.memory;

    if (typeof api.__wasm_call_ctors === "function") {
      api.__wasm_call_ctors();
    }
    api.dave_init(1);
    collectTunes();

    hideStatus();
    paint();
    running = true;
    booted = true;
    lastTime = performance.now();
    lastPhase = api.dave_phase();

    updateProgressUI();
    updateHud();
    updateStartButton();
    showTitleOverlay();
    requestAnimationFrame(tick);
  } catch (error) {
    console.error(error);
    showStatus(`Could not start: ${error.message}`, true);
  }
}

function paint() {
  const ptr = api.dave_screen();
  const src = new Uint32Array(memory.buffer, ptr, SCREEN_W * SCREEN_H);

  // Source words are RGBA8888, stored in memory as A,B,G,R.  Canvas ImageData
  // wants R,G,B,A, so byte-swap each word and force it opaque (the original
  // SDL blit ignored the alpha channel when copying to the window).
  for (let i = 0; i < src.length; i++) {
    const p = src[i];
    dst32[i] =
      (((p & 0x000000ff) << 24) |
        ((p & 0x0000ff00) << 8) |
        ((p & 0x00ff0000) >>> 8) |
        ((p & 0xff000000) >>> 24)) |
      0xff000000;
  }
  ctx.putImageData(image, 0, 0);
}

function checkPhase() {
  const phase = api.dave_phase();
  if (phase === lastPhase) return;
  lastPhase = phase;
  updateStartButton();

  if (phase === 1) {
    hideTitleOverlay();
  } else if (phase === 0) {
    if (session.active) {
      session.active = false;
      session.lives = 0;
      persistProgress();
      updateHud();
      haptic([20, 45, 20, 45, 30]);
      toast("Run over · progress saved", 1800);
    }
    showTitleOverlay();
  }
}

function tick(now) {
  if (!running) {
    return;
  }
  requestAnimationFrame(tick);

  if (document.hidden) {
    lastTime = now;
    accumulator = 0;
    return;
  }

  if (paused) {
    lastTime = now;
    accumulator = 0;
    return;
  }

  let delta = now - lastTime;
  lastTime = now;
  if (delta > 120) {
    delta = 120;
  }
  accumulator += delta;

  let steps = 0;
  while (accumulator >= STEP_MS && steps < 6) {
    api.dave_set_ticks(now >>> 0);
    api.dave_frame();
    accumulator -= STEP_MS;
    steps++;
  }

  if (steps > 0) {
    flushPendingReleases();
    paint();
    syncAudio();
    syncSessionFromGame();
    checkPhase();
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    releaseAllSources();
    stopAudioSource();
    persistProgress(true);
    if (api && api.dave_phase() === 1 && !paused) {
      setPaused(true);
    }
  } else {
    lastTime = performance.now();
    accumulator = 0;
    lastAudioGeneration = -1;
    if (api && api.dave_phase() === 0) showTitleOverlay();
  }
});

window.addEventListener("pagehide", () => {
  persistProgress(true);
});

window.addEventListener("beforeunload", () => {
  persistProgress(true);
});

/* Small read-only hook for automated browser tests. */
window.__dave = {
  phase: () => (api ? api.dave_phase() : -1),
  generation: () => (api ? api.dave_audio_generation() : -1),
  tune: () => (api ? api.dave_audio_tune() : -1),
  paused: () => (api ? api.dave_audio_paused() : -1),
  gamePaused: () => paused,
  level: () => (api ? api.dave_level() : 0),
  lives: () => (api ? api.dave_lives() : 0),
  score: () => (api ? api.dave_score() : 0),
  settings: () => ({ ...settings }),
  progress: () => ({ ...progress }),
  dpad: () => [...dpadDirections],
  held: () => [...activeScans],
  start: (level) => startGame(level ?? progress.highestLevel),
  pause: () => setPaused(true),
  resume: () => setPaused(false),
  title: () => goToTitle(),
  restart: () => restartLevel(),
  press: (scan, ms = 40) => {
    pressScan(scan, "test");
    setTimeout(() => releaseScan(scan, "test"), ms);
  },
  audio: () => ({
    state: audioCtx ? audioCtx.state : "none",
    tracks: audioTracks.filter((track) => track.buffer).length,
    source: audioSource ? "playing" : "stopped",
  }),
};

applySettings();
updateProgressUI();
updateHud();
updateStartButton();
boot();
