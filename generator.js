/* ============================================================
   kitty-fication — photo editor engine
   ============================================================ */
'use strict';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const dropzone      = $('#dropzone');
const fileInput     = $('#fileInput');
const editor        = $('#editor');
const canvas        = $('#editCanvas');
const ctx           = canvas.getContext('2d');
const editLabel     = $('#editLabel');
const intensity     = $('#intensity');
const intensityOut  = $('#intensityOut');
const downloadBtn   = $('#downloadBtn');
const shareTikTokBtn= $('#shareTikTokBtn');
const resetBtn      = $('#resetBtn');
const modeToggle    = $('#modeToggle');
const toastEl       = $('#toast');
const clockEl       = $('#clock');

/* ============================================================
   state
   ============================================================ */
const state = {
  image: null,          // HTMLImageElement
  filter: 'bow',        // bow | ears | whiskers | full
  intensity: 1,         // 0..1
  mode: 'kitty',        // kitty | marceline
};

/* ============================================================
   palette (mirror of main site)
   ============================================================ */
function getPalette() {
  return state.mode === 'marceline' ? {
    bg:      '#0a0409',
    outline: '#f5e6f0',
    bow:     '#b84dff',
    bowDark: '#7a2bb8',
    nose:    '#ff3d8b',
    eye:     '#f5e6f0',
    cheek:   '#ff3d8b',
    shine:   '#ffffff',
  } : {
    bg:      '#fdf6f9',
    outline: '#1a0f14',
    bow:     '#ff3d8b',
    bowDark: '#c2185b',
    nose:    '#ffb300',
    eye:     '#1a0f14',
    cheek:   '#ff8fb3',
    shine:   '#ffffff',
  };
}

/* ============================================================
   upload handling
   ============================================================ */
function openFilePicker() { fileInput.click(); }

dropzone.addEventListener('click', openFilePicker);
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker(); }
});

['dragenter', 'dragover'].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('is-drag');
  })
);
['dragleave', 'drop'].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-drag');
  })
);
dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('that is not an image — try again');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showToast('too chunky — max 8mb');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      dropzone.hidden = true;
      editor.hidden = false;
      render();
      editLabel.textContent = '// live preview';
      showToast('loaded — now pick a filter');
    };
    img.onerror = () => showToast('could not read that image');
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

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
   draw photo cover-fit
   ============================================================ */
function drawPhoto() {
  if (!state.image) return;
  const w = canvas._w;
  const h = canvas._h;
  const iw = state.image.width;
  const ih = state.image.height;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  ctx.drawImage(state.image, dx, dy, dw, dh);
}

/* ============================================================
   overlay drawing — same coordinate system as home
   ============================================================ */
const REF = 600;
const CX  = REF / 2;
const CY  = REF / 2;

function withScale(fn) {
  const s = Math.min(canvas._w, canvas._h) / REF;
  ctx.save();
  ctx.translate((canvas._w - REF * s) / 2, (canvas._h - REF * s) / 2);
  ctx.scale(s, s);
  fn();
  ctx.restore();
}

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

/* ---- overlay pieces ---- */
function drawBow(p, k) {
  const cx = CX - 150;
  const cy = CY - 150;
  const a = 1 * k;

  ctx.globalAlpha = a;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.32);
  ellipse(-30, 0, 44, 32);
  paint(p.bow, p.outline, 5);
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.32);
  ellipse(30, 0, 44, 32);
  paint(p.bow, p.outline, 5);
  ctx.restore();

  ellipse(cx, cy, 15, 15);
  paint(p.bowDark, p.outline, 5);

  ctx.globalAlpha = 1;
}

function drawEars(p, k) {
  ctx.globalAlpha = k;

  // left
  ctx.beginPath();
  ctx.moveTo(CX - 200, CY - 120);
  ctx.quadraticCurveTo(CX - 130, CY - 220, CX - 40, CY - 160);
  ctx.closePath();
  paint('#ffffff', p.outline, 5);

  // right
  ctx.beginPath();
  ctx.moveTo(CX + 200, CY - 120);
  ctx.quadraticCurveTo(CX + 130, CY - 220, CX + 40, CY - 160);
  ctx.closePath();
  paint('#ffffff', p.outline, 5);

  ctx.globalAlpha = 1;
}

function drawWhiskers(p, k) {
  ctx.globalAlpha = k;
  ctx.strokeStyle = p.outline;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  const len = 60;
  const rows = [-12, 0, 12];
  rows.forEach((dy) => {
    // left
    ctx.beginPath();
    ctx.moveTo(CX - 95, CY + 55 + dy);
    ctx.lineTo(CX - 95 - len, CY + 55 + dy - dy * 0.4);
    ctx.stroke();
    // right
    ctx.beginPath();
    ctx.moveTo(CX + 95, CY + 55 + dy);
    ctx.lineTo(CX + 95 + len, CY + 55 + dy - dy * 0.4);
    ctx.stroke();
  });

  // nose
  ellipse(CX, CY + 55, 12, 8);
  paint(p.nose, null, 0);

  ctx.globalAlpha = 1;
}

function drawFullKitty(p, k) {
  drawEars(p, k);
  drawBow(p, k);
  drawWhiskers(p, k);
}

/* ============================================================
   render pipeline
   ============================================================ */
function render() {
  if (!state.image) return;

  fitCanvas();

  const p = getPalette();

  // bg
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, canvas._w, canvas._h);

  // photo
  drawPhoto();

  // overlay
  withScale(() => {
    const k = state.intensity;
    switch (state.filter) {
      case 'bow':      drawBow(p, k); break;
      case 'ears':     drawEars(p, k); break;
      case 'whiskers': drawWhiskers(p, k); break;
      case 'full':     drawFullKitty(p, k); break;
    }
  });
}

/* ============================================================
   filter chips
   ============================================================ */
$$('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    $$('.chip').forEach((c) => {
      c.classList.remove('is-active');
      c.setAttribute('aria-checked', 'false');
    });
    chip.classList.add('is-active');
    chip.setAttribute('aria-checked', 'true');
    state.filter = chip.dataset.filter;
    render();
  });
});

/* ============================================================
   intensity slider
   ============================================================ */
intensity.addEventListener('input', () => {
  const v = Number(intensity.value);
  intensityOut.textContent = `${v}%`;
  state.intensity = v / 100;
  render();
});

/* ============================================================
   mode toggle (must match home behavior)
   ============================================================ */
modeToggle.addEventListener('click', () => {
  state.mode = state.mode === 'marceline' ? 'kitty' : 'marceline';
  const goingDark = state.mode === 'marceline';
  document.body.dataset.mode = state.mode;
  modeToggle.setAttribute('aria-pressed', String(goingDark));
  modeToggle.textContent = goingDark ? 'KITTY MODE' : 'MARCELINE MODE';
  if (state.image) render();
  showToast(goingDark ? 'marceline era activated' : 'back to sanrio core');
});

/* ============================================================
   download
   ============================================================ */
downloadBtn.addEventListener('click', () => {
  if (!state.image) return;
  render(); // ensure freshest frame
  try {
    canvas.toBlob((blob) => {
      if (!blob) { showToast('export failed'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kitty-fied-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('saved — now post it');
    }, 'image/png');
  } catch {
    showToast('export blocked by browser');
  }
});

/* ============================================================
   post to tiktok
   ============================================================ */
shareTikTokBtn.addEventListener('click', async () => {
  if (!state.image) return;

  // 1) copy caption to clipboard
  const caption = "kitty-fied. lowkey obsessed. no cap. #MarcelineLovesKitty #SanrioCore #KittyFication";
  try {
    if (navigator.clipboard) await navigator.clipboard.writeText(caption);
  } catch { /* ignore */ }

  // 2) try native share with the rendered image
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `kitty-fied-${Date.now()}.png`, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'kitty-fied',
          text: caption,
        });
        showToast('shared — go viral');
        return;
      } catch { /* user cancelled or unsupported */ }
    }

    // fallback: download + open tiktok
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast('image saved — opening tiktok');
    setTimeout(() => {
      window.open('https://www.tiktok.com/upload?lang=en', '_blank', 'noopener');
    }, 600);
  }, 'image/png');
});

/* ============================================================
   reset
   ============================================================ */
resetBtn.addEventListener('click', () => {
  state.image = null;
  state.filter = 'bow';
  state.intensity = 1;

  fileInput.value = '';
  intensity.value = 100;
  intensityOut.textContent = '100%';

  $$('.chip').forEach((c) => {
    const active = c.dataset.filter === 'bow';
    c.classList.toggle('is-active', active);
    c.setAttribute('aria-checked', String(active));
  });

  editor.hidden = true;
  dropzone.hidden = false;
  showToast('reset — start over');
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
   resize
   ============================================================ */
window.addEventListener('resize', () => {
  if (state.image) render();
});

/* ============================================================
   boot
   ============================================================ */
fitCanvas();
