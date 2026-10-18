/* ============================================================
   kitty.exe — canvas engine + state machine
   ============================================================ */
'use strict';

const $ = (sel) => document.querySelector(sel);

const canvas       = $('#kitty');
const ctx          = canvas.getContext('2d');
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
   canvas sizing (DPR-aware)
   ============================================================ */
function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width  = Math.round(rect.width  * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas._w = rect.width;
  canvas._h = rect.height;
}

/* ============================================================
   palette — switches with body[data-mode]
   ============================================================ */
function getPalette() {
  const marceline = document.body.dataset.mode === 'marceline';
  return marceline ? {
    bg:      '#0a0409',
    outline: '#f5e6f0',
    body:    '#ffffff',
    bow:     '#b84dff',
    bowDark: '#7a2bb8',
    nose:    '#ff3d8b',
    eye:     '#f5e6f0',
    cheek:   '#ff3d8b',
    shine:   '#ffffff',
  } : {
    bg:      '#fdf6f9',
    outline: '#1a0f14',
    body:    '#ffffff',
    bow:     '#ff3d8b',
    bowDark: '#c2185b',
    nose:    '#ffb300',
    eye:     '#1a0f14',
    cheek:   '#ff8fb3',
    shine:   '#ffffff',
  };
}

/* ============================================================
   draw helpers
   ============================================================ */
function ellipse(x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function paint(fill, stroke, lw) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

/* ============================================================
   layers — each layer draws at local progress t ∈ [0,1]
   coordinates relative to a 600x600 reference box
   ============================================================ */
const REF = 600;
const CX  = REF / 2;
const CY  = REF / 2;

function scaleCtx() {
  const s = Math.min(canvas._w, canvas._h) / REF;
  ctx.save();
  ctx.translate((canvas._w - REF * s) / 2, (canvas._h - REF * s) / 2);
  ctx.scale(s, s);
  return () => ctx.restore();
}

const LAYERS = [
  /* 1 — head silhouette */
  (t, p) => {
    const g = easeOutCubic(t);
    ellipse(CX, CY + 20, 220 * g, 190 * g);
    paint(p.body, p.outline, 6);
  },

  /* 2 — left ear */
  (t, p) => {
    const k = easeOutCubic(t);
    ctx.beginPath();
    ctx.moveTo(CX - 200 * k, CY - 120 * k);
    ctx.quadraticCurveTo(CX - 130 * k, CY - 220 * k, CX - 40 * k, CY - 160 * k);
    ctx.closePath();
    paint(p.body, p.outline, 6);
  },

  /* 3 — right ear */
  (t, p) => {
    const k = easeOutCubic(t);
    ctx.beginPath();
    ctx.moveTo(CX + 200 * k, CY - 120 * k);
    ctx.quadraticCurveTo(CX + 130 * k, CY - 220 * k, CX + 40 * k, CY - 160 * k);
    ctx.closePath();
    paint(p.body, p.outline, 6);
  },

  /* 4 — eyes */
  (t, p) => {
    const r = 13 * easeOutCubic(t);
    ellipse(CX - 65, CY + 15, r, r * 1.15);
    paint(p.eye, null, 0);
    ellipse(CX + 65, CY + 15, r, r * 1.15);
    paint(p.eye, null, 0);

    if (t > 0.55) {
      const s = (t - 0.55) / 0.45;
      ellipse(CX - 61, CY + 10, 3.5 * s, 3.5 * s);
      paint(p.shine, null, 0);
      ellipse(CX + 69, CY + 10, 3.5 * s, 3.5 * s);
      paint(p.shine, null, 0);
    }
  },

  /* 5 — nose */
  (t, p) => {
    const k = easeOutCubic(t);
    ellipse(CX, CY + 60, 15 * k, 10 * k);
    paint(p.nose, null, 0);
  },

  /* 6 — whiskers */
  (t, p) => {
    const len = 60 * easeOutCubic(t);
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    const whisker = (x0, y0, x1, y1) => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    };

    const rows = [-12, 0, 12];
    rows.forEach((dy) => {
      whisker(CX - 95, CY + 55 + dy, CX - 95 - len, CY + 55 + dy - dy * 0.4);
      whisker(CX + 95, CY + 55 + dy, CX + 95 + len, CY + 55 + dy - dy * 0.4);
    });
  },

  /* 7 — bow */
  (t, p) => {
    const k = easeOutCubic(t);
    const cx = CX - 150;
    const cy = CY - 150;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.32);
    ellipse(-30 * k, 0, 44 * k, 32 * k);
    paint(p.bow, p.outline, 5);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0.32);
    ellipse(30 * k, 0, 44 * k, 32 * k);
    paint(p.bow, p.outline, 5);
    ctx.restore();

    ellipse(cx, cy, 15 * k, 15 * k);
    paint(p.bowDark, p.outline, 5);
  },

  /* 8 — cheeks */
  (t, p) => {
    const a = 0.55 * easeOutCubic(t);
    ctx.globalAlpha = a;
    ellipse(CX - 135, CY + 65, 24, 14);
    paint(p.cheek, null, 0);
    ellipse(CX + 135, CY + 65, 24, 14);
    paint(p.cheek, null, 0);
    ctx.globalAlpha = 1;
  },
];

/* ============================================================
   easing
   ============================================================ */
function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

/* ============================================================
   render
   ============================================================ */
function render(t) {
  const p = getPalette();

  // clear in real pixel space
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const restore = scaleCtx();

  const n = LAYERS.length;
  LAYERS.forEach((layer, i) => {
    const start = i / n;
    const end   = (i + 1) / n;
    const raw   = (t - start) / (end - start);
    const local = Math.min(1, Math.max(0, raw));
    if (local <= 0) return;

    ctx.save();
    layer(local, p);
    ctx.restore();
  });

  restore();
}

/* ============================================================
   state machine
   ============================================================ */
const state = {
  phase: 'idle',     // idle | drawing | done
  startTime: 0,
  duration: 2400,
};

function setPhase(phase, label) {
  state.phase = phase;
  canvasLabel.textContent = label;
}

function tick(now) {
  if (state.phase !== 'drawing') return;
  const elapsed = now - state.startTime;
  const t = Math.min(1, elapsed / state.duration);
  render(t);

  if (t < 1) {
    requestAnimationFrame(tick);
  } else {
    setPhase('done', '// hello_kitty.render() — done');
    drawBtn.disabled = false;
    drawBtn.innerHTML =
      '<svg class="btn-icon" width="16" height="16" aria-hidden="true"><use href="#i-redraw"/></svg><span>DRAW AGAIN</span>';
    canvasWrap.classList.add('shake');
    setTimeout(() => canvasWrap.classList.remove('shake'), 400);
    bumpStats();
  }
}

function startDraw() {
  if (state.phase === 'drawing') return;
  drawBtn.disabled = true;
  drawBtn.innerHTML =
    '<svg class="btn-icon" width="16" height="16" aria-hidden="true"><use href="#i-play"/></svg><span>DRAWING…</span>';
  setPhase('drawing', '// rendering...');
  state.startTime = performance.now();
  requestAnimationFrame(tick);
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

  if (state.phase === 'done') render(1);
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
  render(0);
  setPhase('idle', '// idle — press draw');
  drawBtn.addEventListener('click', startDraw);
}

window.addEventListener('resize', () => {
  fitCanvas();
  if (state.phase === 'done') render(1);
  else if (state.phase === 'idle') render(0);
});

boot();
