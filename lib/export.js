// Renders each story page to a 1080x1920 canvas and hands back PNG blobs.
// Drawn directly rather than screenshotting the DOM: fonts and layout stay exact.

const W = 1080, H = 1920;
const INK = '#1E1A17', PAPER = '#FFFDF7', MUTED = '#6F6A5F';
const TINTS = ['#2FA9AD', '#6C4CA0', '#E82A66', '#F7941D', '#FFC20E'];
const YELLOW = '#FFC20E';
const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DISCLAIMER = 'Built by [YOUR NAME] for the goSTOPS Build Sprint. Not an official goSTOPS product.';

// Normalised front-page layouts, mirroring the CSS grid templates.
const FRONT = {
  1: { h:[0,.55,1,.45], p:[[0,0,1,.55]] },
  2: { h:[0,.55,.6,.45], p:[[0,0,1,.55],[.6,.55,.4,.45]] },
  3: { h:[0,0,.5,.36], p:[[.5,0,.5,.64],[0,.36,.5,.64],[.5,.64,.5,.36]] },
  4: { h:[0,0,.5,.30], p:[[.5,0,.5,.52],[0,.30,.5,.44],[.5,.52,.5,.48],[0,.74,.5,.26]] },
  5: { h:[0,0,1,.26], p:[[0,.26,.6,.46],[.6,.26,.4,.22],[.6,.48,.4,.24],[0,.72,.6,.28],[.6,.72,.4,.28]] },
  6: { h:[0,0,.5,.26], p:[[.5,0,.5,.44],[0,.26,.5,.18],[0,.44,.5,.28],[.5,.44,.5,.28],[0,.72,.5,.28],[.5,.72,.5,.28]] },
};

const mono    = (s, w) => (w || 400) + ' ' + s + 'px "Space Mono", monospace';
const display = (s, w) => (w || 700) + ' ' + s + 'px "Space Grotesk", sans-serif';
const serif   = (s) => '900 ' + s + 'px "Playfair Display", Georgia, serif';

function ctx2d() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.textBaseline = 'alphabetic';
  return { c, x };
}

function wrap(x, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawLines(x, lines, left, top, lh) {
  lines.forEach((l, i) => x.fillText(l, left, top + i * lh));
  return top + lines.length * lh;
}

// Draw an image cropped to fill a rect (object-fit: cover).
function cover(x, img, dx, dy, dw, dh) {
  const ir = img.width / img.height, rr = dw / dh;
  let sw, sh, sx, sy;
  if (ir > rr) { sh = img.height; sw = sh * rr; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / rr; sx = 0; sy = (img.height - sh) / 2; }
  x.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function contain(x, img, dx, dy, dw, dh) {
  const scale = Math.min(dw / img.width, dh / img.height);
  const w = img.width * scale, h = img.height * scale;
  x.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
}

function chip(x, label, cx, cy, bg, fg, size) {
  x.font = mono(size || 20, 700);
  const padX = size ? size * 0.6 : 13;
  const w = x.measureText(label).width + padX * 2;
  const h = (size || 20) * 1.9;
  x.fillStyle = bg;
  if (x.roundRect) { x.beginPath(); x.roundRect(cx, cy, w, h, 5); x.fill(); }
  else x.fillRect(cx, cy, w, h);
  x.fillStyle = fg;
  x.fillText(label, cx + padX, cy + h * 0.68);
  return w;
}

function letterspace(x, text, left, top, px) {
  let cx = left;
  for (const ch of text) { x.fillText(ch, cx, top); cx += x.measureText(ch).width + px; }
  return cx;
}

/* ---------------- front page ---------------- */
async function drawFront(x, photos, story, bitmaps) {
  x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
  const M = 44;
  const d = new Date();
  const dateStr = d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();

  let y = 150;
  x.fillStyle = INK; x.fillRect(M, y, W - M * 2, 6); y += 48;

  x.font = serif(78); x.textAlign = 'center';
  x.fillText('The Times of Travel', W / 2, y + 56); y += 84;

  x.font = mono(18, 400); x.fillStyle = MUTED;
  const sub = 'VOL. 2026 · ' + photos.length + (photos.length === 1 ? ' DISPATCH' : ' DISPATCHES') + ' · ' + dateStr;
  x.fillText(sub, W / 2, y + 16); y += 40;
  x.textAlign = 'left';
  x.fillStyle = INK; x.fillRect(M, y, W - M * 2, 2); y += 24;

  // grid
  const n = Math.min(photos.length, 6);
  const L = FRONT[n];
  const gx = M, gy = y, gw = W - M * 2, gh = H - y - 150;
  const gap = 10;
  const rect = r => [gx + r[0] * gw + gap / 2, gy + r[1] * gh + gap / 2,
                     r[2] * gw - gap, r[3] * gh - gap];

  // headline block
  const [hx, hy, hw, hh] = rect(L.h);
  x.fillStyle = YELLOW; x.fillRect(hx, hy, hw, hh);
  const pad = hw * 0.08;
  x.fillStyle = 'rgba(30,26,23,0.65)'; x.font = mono(15, 400);
  letterspace(x, 'THE YEAR IN HEADLINES', hx + pad, hy + pad + 14, 1.6);
  x.fillStyle = INK;
  let hs = Math.min(58, Math.max(26, hw / 9));
  x.font = display(hs);
  let hl = wrap(x, story.headline, hw - pad * 2);
  while (hl.length * hs * 1.02 > hh - pad * 2 - 40 && hs > 20) {
    hs -= 2; x.font = display(hs); hl = wrap(x, story.headline, hw - pad * 2);
  }
  drawLines(x, hl, hx + pad, hy + hh - pad - (hl.length - 1) * hs * 1.02, hs * 1.02);

  // photo blocks
  const TAGC = ['#2FA9AD', '#6C4CA0', '#E82A66', '#F7941D', '#6C4CA0', '#2FA9AD'];
  for (let i = 0; i < n; i++) {
    const [px, py, pw, ph] = rect(L.p[i]);
    x.save(); x.beginPath(); x.rect(px, py, pw, ph); x.clip();
    cover(x, bitmaps[i], px, py, pw, ph);
    x.restore();
    const label = String(photos[i].place || '').toUpperCase();
    if (label) chip(x, label, px + 14, py + ph - 48, TAGC[i % TAGC.length], '#fff', 17);
  }

  // footer
  x.fillStyle = '#9A937F'; x.font = mono(15, 400);
  x.fillText(DISCLAIMER, M, H - 70);
}

/* ---------------- photo page ---------------- */
function drawPhoto(x, photo, page, i, total, bmp) {
  const tint = TINTS[i % TINTS.length];
  const light = tint === YELLOW;
  x.fillStyle = tint; x.fillRect(0, 0, W, H);

  const M = 52;
  const fg = light ? INK : '#fff';
  x.fillStyle = light ? 'rgba(30,26,23,0.8)' : 'rgba(255,255,255,0.95)';
  x.font = mono(19, 700);
  letterspace(x, 'THE TIMES OF TRAVEL', M, 160, 2.2);
  const idx = String(i + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
  x.textAlign = 'right'; letterspaceRight(x, idx, W - M, 160, 2.2); x.textAlign = 'left';

  // the print, tilted
  const tilt = (i % 2 === 0 ? -1.4 : 1.3) * Math.PI / 180;
  const cardW = W - M * 2 - 40;
  const padIn = 26;
  const imgW = cardW - padIn * 2;
  const capH = 96;
  const cardH = padIn + imgW + capH;
  const cx = (W - cardW) / 2, cy = 280;

  x.save();
  x.translate(cx + cardW / 2, cy + cardH / 2);
  x.rotate(tilt);
  x.translate(-cardW / 2, -cardH / 2);

  x.save();
  x.shadowColor = 'rgba(0,0,0,0.3)'; x.shadowBlur = 42; x.shadowOffsetY = 18;
  x.fillStyle = '#fff'; x.fillRect(0, 0, cardW, cardH);
  x.restore();

  x.save(); x.beginPath(); x.rect(padIn, padIn, imgW, imgW); x.clip();
  cover(x, bmp, padIn, padIn, imgW, imgW);
  x.restore();

  chip(x, 'THE TIMES OF TRAVEL', padIn + 16, padIn + 16, 'rgba(20,18,16,0.72)', '#fff', 15);
  const stampTxt = MON[new Date().getMonth()] + ' 2026';
  x.font = mono(15, 700);
  const sw = x.measureText(stampTxt).width + 18;
  chip(x, stampTxt, padIn + imgW - 16 - sw, padIn + 16, 'rgba(20,18,16,0.72)', '#fff', 15);

  x.fillStyle = INK; x.font = serif(58);
  x.fillText(String(photo.place || ''), padIn + 4, padIn + imgW + 64);
  x.fillStyle = MUTED; x.font = mono(17, 400);
  x.textAlign = 'right';
  x.fillText('NO. ' + String(i + 1).padStart(2, '0'), cardW - padIn - 4, padIn + imgW + 60);
  x.textAlign = 'left';
  x.restore();

  // copy
  const copyTop = cy + cardH + 110;
  x.fillStyle = fg;
  x.font = display(54);
  const hookLines = wrap(x, page.hook || '', W - M * 2);
  let yy = drawLines(x, hookLines, M, copyTop, 60);
  x.font = display(36, 400);
  x.globalAlpha = light ? 0.85 : 0.92;
  drawLines(x, wrap(x, page.line || '', W - M * 2), M, yy + 22, 46);
  x.globalAlpha = 1;

  x.fillStyle = light ? 'rgba(30,26,23,0.5)' : 'rgba(255,255,255,0.6)';
  x.font = mono(14, 400);
  x.fillText(DISCLAIMER, M, H - 64);
}

function letterspaceRight(x, text, right, top, px) {
  let total = 0;
  for (const ch of text) total += x.measureText(ch).width + px;
  let cx = right - total;
  const old = x.textAlign; x.textAlign = 'left';
  for (const ch of text) { x.fillText(ch, cx, top); cx += x.measureText(ch).width + px; }
  x.textAlign = old;
}

/* ---------------- travel type reveal ---------------- */
function drawClosing(x, persona, catImage) {
  x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
  x.fillStyle = INK; x.font = mono(19, 700); x.textAlign = 'center';
  letterspaceCenter(x, 'THE TIMES OF TRAVEL · 2026', W / 2, 150, 2.2);
  x.textAlign = 'left';
  const palette = { pink: '#E82A66', teal: '#2FA9AD', purple: '#6C4CA0', orange: '#F7941D', yellow: YELLOW };
  const light = persona.tint === 'orange' || persona.tint === 'yellow';
  const fg = light ? INK : '#fff';
  x.fillStyle = palette[persona.tint] || YELLOW;
  x.fillRect(44, 200, W - 88, 1570);
  x.fillStyle = fg;
  x.font = mono(22, 700);
  letterspace(x, 'THE TRAVEL DESK HAS DECIDED', 86, 270, 1.4);
  x.font = display(76);
  const titleLines = wrap(x, persona.title, W - 172);
  drawLines(x, titleLines, 86, 365, 76);

  x.fillStyle = '#fff';
  x.fillRect(66, 500, W - 132, 910);
  contain(x, catImage, 66, 500, W - 132, 910);

  x.fillStyle = fg; x.font = display(49);
  drawLines(x, wrap(x, persona.line, W - 172), 86, 1500, 56);
  x.globalAlpha = .82; x.font = mono(20, 400);
  drawLines(x, wrap(x, persona.receipt, W - 172), 86, 1680, 29);
  x.globalAlpha = 1;
  x.fillStyle = '#9A937F'; x.font = mono(15, 400);
  x.fillText(DISCLAIMER, 44, H - 85);
}

function letterspaceCenter(x, text, mid, top, px) {
  let total = 0;
  for (const ch of text) total += x.measureText(ch).width + px;
  let cx = mid - total / 2;
  const old = x.textAlign; x.textAlign = 'left';
  for (const ch of text) { x.fillText(ch, cx, top); cx += x.measureText(ch).width + px; }
  x.textAlign = old;
}

/* ---------------- public API ---------------- */
export async function renderAll(state, onProgress) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  const bitmaps = [];
  for (const p of state.photos) bitmaps.push(await createImageBitmap(p.blob));

  const out = [];
  const total = state.photos.length + 2;
  const push = async (c) => {
    out.push(await new Promise(r => c.toBlob(r, 'image/png')));
    if (onProgress) onProgress(out.length, total);
  };

  let { c, x } = ctx2d();
  await drawFront(x, state.photos, state.story, bitmaps);
  await push(c);

  for (let i = 0; i < state.photos.length; i++) {
    ({ c, x } = ctx2d());
    drawPhoto(x, state.photos[i], state.story.pages[i], i, state.photos.length, bitmaps[i]);
    await push(c);
  }

  ({ c, x } = ctx2d());
  const catImage = new Image();
  catImage.src = state.persona.image;
  await catImage.decode();
  drawClosing(x, state.persona, catImage);
  await push(c);

  bitmaps.forEach(b => b.close && b.close());
  return out;
}

export function blobsToFiles(blobs) {
  return blobs.map((b, i) => new File([b], 'times-of-travel-' + String(i + 1).padStart(2, '0') + '.png', { type: 'image/png' }));
}

export function canShareFiles(files) {
  return !!(navigator.canShare && navigator.share && navigator.canShare({ files }));
}

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 20000);
}
