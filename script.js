/* ============================================================
   kitty.exe — pixel engine v4.0
   pixel-art kitty + tiktok glitch trends
   ============================================================ */
'use strict';

const $ = (sel) => document.querySelector(sel);

const canvas       = $('#kitty');
const ctx          = canvas.getContext('2d', { alpha: false });
const drawBtn      = $('#drawBtn');
const shareBtn     = $('#shareBtn');
const modeToggle   = $('#modeToggle');
const canvasLabel  = $('#canvasLabel');
const canvasWrap   = document.querySelector('.canvas-wrap');
const toastEl      = $('#toast');
const heartCount   = $('#heartCount');
const batCount     = $('#batCount');
const clockEl      = $('#clock');

/* ============================================================
   PIXEL GRID CONFIG
   ============================================================ */
const PIXEL_SIZE = 8;        // حجم البكسل (أكبر = pixel art أوضح)
const GRID_W = 75;           // 600 / 8
const GRID_H = 75;

/* ============================================================
   canvas sizing (DPR-aware, integer pixels only)
   ============================================================ */
function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width  = Math.round(rect.width  * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas._w = rect.width;
  canvas._h = rect.height;
  ctx.imageSmoothingEnabled = false;
}

/* ============================================================
   palette (same tokens as CSS)
   ============================================================ */
function getPalette() {
  const marceline = document.body.dataset.mode === 'marceline';
  return marceline ? {
    bg:      '#0a0409',
    bg2:     '#140912',
    outline: '#f5e6f0',
    body:    '#ffffff',
    bow:     '#b84dff',
    bowDark: '#7a2bb8',
    nose:    '#ff3d8b',
    eye:     '#f5e6f0',
    cheek:   '#ff3d8b',
    shine:   '#ffffff',
    glitch1: '#00fff0',   // cyan
    glitch2: '#ff0055',   // magenta
  } : {
    bg:      '#fdf6f9',
    bg2:     '#fff0f6',
    outline: '#1a0f14',
    body:    '#ffffff',
    bow:     '#ff3d8b',
    bowDark: '#c2185b',
    nose:    '#ffb300',
    eye:     '#1a0f14',
    cheek:   '#ff8fb3',
    shine:   '#ffffff',
    glitch1: '#00fff0',
    glitch2: '#ff0055',
  };
}

/* ============================================================
   PIXEL BUFFER — scene stored as color grid
   ============================================================ */
function createGrid() {
  return new Array(GRID_W * GRID_H).fill(null);
}

function setPx(grid, x, y, color) {
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return;
  grid[y * GRID_W + x] = color;
}

function fillEllipse(grid, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(grid, x, y, color);
    }
  }
}

function strokeEllipse(grid, cx, cy, rx, ry, color, thickness = 1) {
  const steps = Math.max(rx, ry) * 8;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * rx);
    const y = Math.round(cy + Math.sin(a) * ry);
    for (let t = 0; t < thickness; t++) {
      setPx(grid, x + t, y, color);
      setPx(grid, x, y + t, color);
    }
  }
}

function fillRect(grid, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++)
      setPx(grid, xx, yy, color);
}

/* ============================================================
   PIXEL KITTY — built on a 75×75 grid
   cx=37, cy=40
   ============================================================ */
const CX = 37;
const CY = 40;

function buildKitty(t, p) {
  const g = createGrid();
  const k = Math.min(1, Math.max(0, t));

  /* --- 1. head (rounded pixel ellipse) --- */
  const headRx = 22 * k;
  const headRy = 18 * k;
  fillEllipse(g, CX, CY, headRx, headRy, p.body);
  strokeEllipse(g, CX, CY, headRx, headRy, p.outline, 1);

  /* --- 2. ears --- */
  if (k > 0.15) {
    const ek = (k - 0.15) / 0.85;
    const earH = Math.round(9 * ek);
    // left ear — triangle of pixels
    for (let i = 0; i < earH; i++) {
      const rowW = Math.round(1 + i * 0.8);
      for (let w = 0; w < rowW; w++) {
        setPx(g, CX - 18 + w, CY - 18 - i, p.body);
        setPx(g, CX - 18 + w, CY - 18 - i + 1, p.outline);
      }
    }
    // right ear
    for (let i = 0; i < earH; i++) {
      const rowW = Math.round(1 + i * 0.8);
      for (let w = 0; w < rowW; w++) {
        setPx(g, CX + 18 - w, CY - 18 - i, p.body);
        setPx(g, CX + 18 - w, CY - 18 - i + 1, p.outline);
      }
    }
  }

  /* --- 3. eyes (chunky pixels) --- */
  if (k > 0.3) {
    const ek = (k - 0.3) / 0.7;
    const eyeH = Math.round(3 * ek);
    fillRect(g, CX - 8, CY - 1, 2, eyeH, p.eye);
    fillRect(g, CX + 6, CY - 1, 2, eyeH, p.eye);
    // shine
    if (ek > 0.6) {
      setPx(g, CX - 8, CY - 1, p.shine);
      setPx(g, CX + 6, CY - 1, p.shine);
    }
  }

  /* --- 4. nose (yellow oval 2×1) --- */
  if (k > 0.45) {
    setPx(g, CX - 1, CY + 4, p.nose);
    setPx(g, CX,     CY + 4, p.nose);
    setPx(g, CX + 1, CY + 4, p.nose);
  }

  /* --- 5. whiskers --- */
  if (k > 0.55) {
    const wk = (k - 0.55) / 0.45;
    const len = Math.round(8 * wk);
    // left (3 rows)
    for (let row = 0; row < 3; row++) {
      const y = CY + 2 + row * 2;
      for (let i = 0; i < len; i++) {
        setPx(g, CX - 12 - i, y - Math.floor(row * 0.5), p.outline);
      }
    }
    // right
    for (let row = 0; row < 3; row++) {
      const y = CY + 2 + row * 2;
      for (let i = 0; i < len; i++) {
        setPx(g, CX + 12 + i, y - Math.floor(row * 0.5), p.outline);
      }
    }
  }

  /* --- 6. bow (pixel style) --- */
  if (k > 0.65) {
    const bk = (k - 0.65) / 0.35;
    const bx = CX - 13;
    const by = CY - 14;
    const bw = Math.round(5 * bk);
    const bh = Math.round(4 * bk);
    // left loop
    fillRect(g, bx - bw, by - bh + 1, bw, bh, p.bow);
    fillRect(g, bx - bw - 1, by - bh + 1, 1, bh, p.outline);
    // right loop
    fillRect(g, bx + bw, by - bh + 1, bw, bh, p.bow);
    fillRect(g, bx + bw + bw, by - bh + 1, 1, bh, p.outline);
    // center knot
    fillRect(g, bx - 1, by - bh + 1, 2, bh, p.bowDark);
  }

  /* --- 7. cheeks --- */
  if (k > 0.75) {
    const ck = (k - 0.75) / 0.25;
    const alpha = Math.round(255 * ck);
    const c = hexWithAlpha(p.cheek, alpha);
    fillRect(g, CX - 16, CY + 4, 3, 2, c);
    fillRect(g, CX + 13, CY + 4, 3, 2, c);
  }

  return g;
}

/* ============================================================
   helpers
   ============================================================ */
function hexWithAlpha(hex, alpha) {
  // simple: return hex, we just won't render truly transparent px
  return hex;
}

/* ============================================================
   render — paints the grid onto canvas
   ============================================================ */
function paintGrid(grid, p, glitchAmount = 0) {
  const w = canvas._w;
  const h = canvas._h;
  const px = Math.max(1, Math.floor(w / GRID_W));
  const offX = Math.floor((w - px * GRID_W) / 2);
  const offY = Math.floor((h - px * GRID_H) / 2);

  // bg
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);

  // subtle grid bg
  ctx.fillStyle = p.bg2;
  for (let y = 0; y < GRID_H; y += 4) {
    for (let x = 0; x < GRID_W; x += 4) {
      ctx.fillRect(offX + x * px, offY + y * px, px, px);
    }
  }

  // glitch offset
  const gx = glitchAmount ? Math.round((Math.random() - 0.5) * glitchAmount) : 0;

  // pixels
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const color = grid[y * GRID_W + x];
      if (!color) continue;

      const dx = offX + (x + gx) * px;
      const dy = offY + y * px;

      // chromatic aberration on random rows
      if (glitchAmount > 0 && Math.random() < 0.03) {
        ctx.fillStyle = p.glitch1;
        ctx.fillRect(dx - 2, dy, px, px);
        ctx.fillStyle = p.glitch2;
        ctx.fillRect(dx + 2, dy, px, px);
      }

      ctx.fillStyle = color;
      ctx.fillRect(dx, dy, px, px);
    }
  }
}

/* ============================================================
   render wrapper
   ============================================================ */
function render(t, glitch = 0) {
  const p = getPalette();
  const grid = buildKitty(t, p);
  paintGrid(grid, p, glitch);
}

/* ============================================================
   state machine
   ============================================================ */
const state = {
  phase: 'idle',       // idle | drawing | done | glitching
  startTime: 0,
  duration: 2200,
  glitchUntil: 0,
};

function setPhase(phase, label) {
  state.phase = phase;
  canvasLabel.textContent = label;
}

function tick(now) {
  if (state.phase !== 'drawing') return;

  const elapsed = now - state.startTime;
  const t = Math.min(1, elapsed / state.duration);

  // glitch intensity decays over time
  const glitch = t < 1 ? Math.round(4 * (1 - t)) : 0;

  render(t, glitch);

  if (t < 1) {
    requestAnimationFrame(tick);
  } else {
    finishDraw();
  }
}

function finishDraw() {
  setPhase('done', '// pixel_kitty.render() — done');
  drawBtn.disabled = false;
  drawBtn.innerHTML =
    '<svg class="btn-icon" width="16" height="16" aria-hidden="true"><use href="#i-redraw"/></svg><span>DRAW AGAIN</span>';
  canvasWrap.classList.add('shake');
  setTimeout(() => canvasWrap.classList.remove('shake'), 400);
  bumpStats();

  // final glitch burst
  glitchBurst(600);
}

function startDraw() {
  if (state.phase === 'drawing') return;
  drawBtn.disabled = true;
  drawBtn.innerHTML =
    '<svg class="btn-icon" width="16" height="16" aria-hidden="true"><use href="#i-play"/></svg><span>RENDERING…</span>';
  setPhase('drawing', '// pixel_kitty.render()...');
  state.startTime = performance.now();
  requestAnimationFrame(tick);
}

/* ============================================================
   glitch burst
   ============================================================ */
function glitchBurst(duration = 500) {
  const start = performance.now();
  const p = getPalette();
  const grid = buildKitty(1, p);

  function frame(now) {
    const elapsed = now - start;
    if (elapsed > duration) {
      render(1, 0);
      return;
    }
    const amt = Math.round(8 * (1 - elapsed / duration));
    paintGrid(grid, p, amt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ============================================================
   stats
   ============================================================ */
function bumpStats() {
  const h = parseFloat(heartCount.textContent.replace('k', '')) || 0;
  heartCount.textContent = (h + 0.1).toFixed(1) + 'k';
  const b = parseInt(batCount.textContent, 10) || 0;
  batCount.textContent = String(b + 7);
}

/* ============================================================
   mode toggle
   ============================================================ */
modeToggle.addEventListener('click', () => {
  const goingDark = document.body.dataset.mode !== 'marceline';
  document.body.dataset.mode = goingDark ? 'marceline' : 'kitty';
  modeToggle.setAttribute('aria-pressed', String(goingDark));
  modeToggle.textContent = goingDark ? 'KITTY MODE' : 'MARCELINE MODE';

  if (state.phase === 'done') {
    render(1, 0);
    glitchBurst(400);
  } else if (state.phase === 'idle') {
    render(0, 0);
  }
  showToast(goingDark ? 'marceline era activated' : 'back to sanrio core');
});

/* ============================================================
   share
   ============================================================ */
shareBtn.addEventListener('click', async () => {
  const payload = {
    title: 'kitty.exe — marceline is down bad for kitty',
    text: "lowkey obsessed. no cap. it's giving delulu vampire princess × sanrio core.",
    url: location.href,
  };
  try {
    if (navigator.share) {
      await navigator.share(payload);
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
      showToast('copied — now go viral');
    } else {
      showToast('sharing unavailable');
    }
  } catch { /* user cancelled */ }
});

/* ============================================================
   toast
   ============================================================ */
let toastTimer;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

/* ============================================================
   clock
   ============================================================ */
function tickClock() {
  const d = new Date();
  clockEl.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}
tickClock();
setInterval(tickClock, 1000);

/* ============================================================
   boot
   ============================================================ */
function boot() {
  fitCanvas();
  render(0, 0);
  setPhase('idle', '// idle — press draw');
  drawBtn.addEventListener('click', startDraw);

  // periodic idle glitch
  setInterval(() => {
    if (state.phase === 'done') {
      glitchBurst(200);
    }
  }, 8000);
}

window.addEventListener('resize', () => {
  fitCanvas();
  if (state.phase === 'done') render(1, 0);
  else if (state.phase === 'idle') render(0, 0);
});

boot();
