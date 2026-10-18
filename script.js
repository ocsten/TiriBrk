'use strict';

const $ = (sel) => document.querySelector(sel);

const canvas = $('#kitty');
const ctx = canvas.getContext('2d', { alpha: false });
const drawBtn = $('#drawBtn');
const downloadBtn = $('#downloadBtn');
const shareBtn = $('#shareBtn');
const modeToggle = $('#modeToggle');
const canvasLabel = $('#canvasLabel');
const canvasWrap = document.querySelector('.canvas-wrap');
const toastEl = $('#toast');
const heartCount = $('#heartCount');
const batCount = $('#batCount');
const clockEl = $('#clock');

const GRID_W = 75;
const GRID_H = 75;
const CX = 37;
const CY = 40;

const AudioEngine = {
  ctx: null,
  enabled: true,
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { this.enabled = false; }
  },
  tone({ freq = 440, dur = 0.08, type = 'square', vol = 0.08 } = {}) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  },
  pixel() { this.tone({ freq: 880 + Math.random() * 400, dur: 0.03, type: 'square', vol: 0.04 }); },
  glitch() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.tone({ freq: 100 + Math.random() * 200, dur: 0.05, type: 'sawtooth', vol: 0.06 }), i * 40);
    }
  },
  fanfare() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => this.tone({ freq: f, dur: 0.12, type: 'square', vol: 0.07 }), i * 90));
  },
};

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas._w = rect.width;
  canvas._h = rect.height;
  ctx.imageSmoothingEnabled = false;
}

function getPalette() {
  const marceline = document.body.dataset.mode === 'marceline';
  return marceline ? {
    bg: '#0a0409', bg2: '#140912', outline: '#f5e6f0', body: '#ffffff',
    bow: '#b84dff', bowDark: '#7a2bb8', nose: '#ff3d8b', eye: '#f5e6f0',
    cheek: '#ff3d8b', shine: '#ffffff', glitch1: '#00fff0', glitch2: '#ff0055',
  } : {
    bg: '#fdf6f9', bg2: '#fff0f6', outline: '#1a0f14', body: '#ffffff',
    bow: '#ff3d8b', bowDark: '#c2185b', nose: '#ffb300', eye: '#1a0f14',
    cheek: '#ff8fb3', shine: '#ffffff', glitch1: '#00fff0', glitch2: '#ff0055',
  };
}

function createGrid() { return new Array(GRID_W * GRID_H).fill(null); }

function setPx(g, x, y, c) {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return;
  g[y * GRID_W + x] = c;
}

function fillEllipse(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(g, x, y, c);
    }
}

function strokeEllipse(g, cx, cy, rx, ry, c, th = 1) {
  const steps = Math.max(rx, ry) * 8;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * rx);
    const y = Math.round(cy + Math.sin(a) * ry);
    for (let t = 0; t < th; t++) { setPx(g, x + t, y, c); setPx(g, x, y + t, c); }
  }
}

function fillRect(g, x, y, w, h, c) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++)
      setPx(g, xx, yy, c);
}

function buildKitty(t, p) {
  const g = createGrid();
  const k = Math.min(1, Math.max(0, t));
  const headRx = 22 * k, headRy = 18 * k;
  fillEllipse(g, CX, CY, headRx, headRy, p.body);
  strokeEllipse(g, CX, CY, headRx, headRy, p.outline, 1);

  if (k > 0.15) {
    const ek = (k - 0.15) / 0.85;
    const earH = Math.round(9 * ek);
    for (let i = 0; i < earH; i++) {
      const rowW = Math.round(1 + i * 0.8);
      for (let w = 0; w < rowW; w++) {
        setPx(g, CX - 18 + w, CY - 18 - i, p.body);
        setPx(g, CX - 18 + w, CY - 18 - i + 1, p.outline);
        setPx(g, CX + 18 - w, CY - 18 - i, p.body);
        setPx(g, CX + 18 - w, CY - 18 - i + 1, p.outline);
      }
    }
  }

  if (k > 0.3) {
    const ek = (k - 0.3) / 0.7;
    const eyeH = Math.round(3 * ek);
    fillRect(g, CX - 8, CY - 1, 2, eyeH, p.eye);
    fillRect(g, CX + 6, CY - 1, 2, eyeH, p.eye);
    if (ek > 0.6) {
      setPx(g, CX - 8, CY - 1, p.shine);
      setPx(g, CX + 6, CY - 1, p.shine);
    }
  }

  if (k > 0.45) {
    setPx(g, CX - 1, CY + 4, p.nose);
    setPx(g, CX, CY + 4, p.nose);
    setPx(g, CX + 1, CY + 4, p.nose);
  }

  if (k > 0.55) {
    const wk = (k - 0.55) / 0.45;
    const len = Math.round(8 * wk);
    for (let row = 0; row < 3; row++) {
      const y = CY + 2 + row * 2;
      for (let i = 0; i < len; i++) {
        setPx(g, CX - 12 - i, y - Math.floor(row * 0.5), p.outline);
        setPx(g, CX + 12 + i, y - Math.floor(row * 0.5), p.outline);
      }
    }
  }

  if (k > 0.65) {
    const bk = (k - 0.65) / 0.35;
    const bx = CX - 13, by = CY - 14;
    const bw = Math.round(5 * bk), bh = Math.round(4 * bk);
    fillRect(g, bx - bw, by - bh + 1, bw, bh, p.bow);
    fillRect(g, bx - bw - 1, by - bh + 1, 1, bh, p.outline);
    fillRect(g, bx + bw, by - bh + 1, bw, bh, p.bow);
    fillRect(g, bx + bw + bw, by - bh + 1, 1, bh, p.outline);
    fillRect(g, bx - 1, by - bh + 1, 2, bh, p.bowDark);
  }

  if (k > 0.75) {
    fillRect(g, CX - 16, CY + 4, 3, 2, p.cheek);
    fillRect(g, CX + 13, CY + 4, 3, 2, p.cheek);
  }

  return g;
}

function paintGrid(grid, p, glitch = 0) {
  const w = canvas._w, h = canvas._h;
  const px = Math.max(1, Math.floor(w / GRID_W));
  const offX = Math.floor((w - px * GRID_W) / 2);
  const offY = Math.floor((h - px * GRID_H) / 2);

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = p.bg2;
  for (let y = 0; y < GRID_H; y += 4)
    for (let x = 0; x < GRID_W; x += 4)
      ctx.fillRect(offX + x * px, offY + y * px, px, px);

  const gx = glitch ? Math.round((Math.random() - 0.5) * glitch) : 0;

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const color = grid[y * GRID_W + x];
      if (!color) continue;
      const dx = offX + (x + gx) * px;
      const dy = offY + y * px;
      if (glitch > 0 && Math.random() < 0.03) {
        ctx.fillStyle = p.glitch1; ctx.fillRect(dx - 2, dy, px, px);
        ctx.fillStyle = p.glitch2; ctx.fillRect(dx + 2, dy, px, px);
      }
      ctx.fillStyle = color;
      ctx.fillRect(dx, dy, px, px);
    }
  }
}

function render(t, glitch = 0) {
  const p = getPalette();
  paintGrid(buildKitty(t, p), p, glitch);
}

const state = {
  phase: 'idle',
  startTime: 0,
  duration: 2200,
  lastPixelSound: 0,
};

function setPhase(phase, label) {
  state.phase = phase;
  canvasLabel.textContent = label;
}

function tick(now) {
  if (state.phase !== 'drawing') return;
  const elapsed = now - state.startTime;
  const t = Math.min(1, elapsed / state.duration);
  const glitch = t < 1 ? Math.round(4 * (1 - t)) : 0;
  if (now - state.lastPixelSound > 120 && t < 0.95) {
    AudioEngine.pixel();
    state.lastPixelSound = now;
  }
  render(t, glitch);
  if (t < 1) requestAnimationFrame(tick);
  else finishDraw();
}

function finishDraw() {
  setPhase('done', '// pixel_kitty.render() — done');
  drawBtn.disabled = false;
  drawBtn.innerHTML = '<svg class="btn-icon" width="16" height="16" aria-hidden="true"><use href="#i-redraw"/></svg><span>DRAW AGAIN</span>';
  canvasWrap.classList.add('shake');
  setTimeout(() => canvasWrap.classList.remove('shake'), 400);
  bumpStats();
  AudioEngine.fanfare();
  glitchBurst(600);
}

function startDraw() {
  if (state.phase === 'drawing') return;
  AudioEngine.init();
  drawBtn.disabled = true;
  drawBtn.innerHTML = '<svg class="btn-icon" width="16" height="16" aria-hidden="true"><use href="#i-play"/></svg><span>RENDERING…</span>';
  setPhase('drawing', '// pixel_kitty.render()...');
  state.startTime = performance.now();
  requestAnimationFrame(tick);
}

function glitchBurst(duration = 500) {
  const start = performance.now();
  const p = getPalette();
  const grid = buildKitty(1, p);
  AudioEngine.glitch();
  function frame(now) {
    const e = now - start;
    if (e > duration) { render(1, 0); return; }
    const amt = Math.round(8 * (1 - e / duration));
    paintGrid(grid, p, amt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function bumpStats() {
  const h = parseFloat(heartCount.textContent.replace('k', '')) || 0;
  heartCount.textContent = (h + 0.1).toFixed(1) + 'k';
  const b = parseInt(batCount.textContent, 10) || 0;
  batCount.textContent = String(b + 7);
}

modeToggle.addEventListener('click', () => {
  const goingDark = document.body.dataset.mode !== 'marceline';
  document.body.dataset.mode = goingDark ? 'marceline' : 'kitty';
  modeToggle.setAttribute('aria-pressed', String(goingDark));
  modeToggle.textContent = goingDark ? 'KITTY MODE' : 'MARCELINE MODE';
  if (state.phase === 'done') { render(1, 0); glitchBurst(400); }
  else if (state.phase === 'idle') render(0, 0);
  showToast(goingDark ? 'marceline era activated' : 'back to sanrio core');
});

downloadBtn.addEventListener('click', () => {
  const p = getPalette();
  const grid = buildKitty(1, p);
  const EXPORT_SIZE = 1200;
  const out = document.createElement('canvas');
  out.width = EXPORT_SIZE;
  out.height = EXPORT_SIZE;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  const px = Math.floor(EXPORT_SIZE / GRID_W);
  const offX = Math.floor((EXPORT_SIZE - px * GRID_W) / 2);
  const offY = Math.floor((EXPORT_SIZE - px * GRID_H) / 2);
  octx.fillStyle = p.bg;
  octx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
  octx.fillStyle = p.bg2;
  for (let y = 0; y < GRID_H; y += 4)
    for (let x = 0; x < GRID_W; x += 4)
      octx.fillRect(offX + x * px, offY + y * px, px, px);
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      const c = grid[y * GRID_W + x];
      if (!c) continue;
      octx.fillStyle = c;
      octx.fillRect(offX + x * px, offY + y * px, px, px);
    }
  out.toBlob((blob) => {
    if (!blob) { showToast('export failed'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel-kitty-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('saved — go post it');
    AudioEngine.fanfare();
  }, 'image/png');
});

shareBtn.addEventListener('click', async () => {
  const payload = {
    title: 'kitty.exe — marceline is down bad for kitty',
    text: "lowkey obsessed. no cap. it's giving delulu vampire princess × sanrio core.",
    url: location.href,
  };
  try {
    if (navigator.share) await navigator.share(payload);
    else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
      showToast('copied — now go viral');
    } else showToast('sharing unavailable');
  } catch { }
});

let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function tickClock() {
  const d = new Date();
  clockEl.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
}
tickClock();
setInterval(tickClock, 1000);

function boot() {
  fitCanvas();
  render(0, 0);
  setPhase('idle', '// idle — press draw');
  drawBtn.addEventListener('click', startDraw);
  setInterval(() => {
    if (state.phase === 'done') glitchBurst(200);
  }, 8000);
  document.addEventListener('click', () => AudioEngine.init(), { once: true });
}

window.addEventListener('resize', () => {
  fitCanvas();
  if (state.phase === 'done') render(1, 0);
  else if (state.phase === 'idle') render(0, 0);
});

boot();
