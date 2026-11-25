// Client side of the AI call: tiny thumbnails in, validated story out.
// Any failure here is caught by the caller, which falls back to canned copy.

export async function makeThumbs(photos) {
  return Promise.all(photos.map(p => thumb(p.blob)));
}

async function thumb(blob) {
  const bmp = await createImageBitmap(blob);
  const s = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * s));
  c.height = Math.max(1, Math.round(bmp.height * s));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  if (bmp.close) bmp.close();
  return c.toDataURL('image/jpeg', 0.6);
}

export async function fetchStory(places, thumbs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch('api/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ places, thumbs }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error('api ' + r.status);
    const d = await r.json();
    return validate(d.story, places.length);
  } finally {
    clearTimeout(t);
  }
}

const FALLBACK_LINE = 'this one spoke for itself.';

function validate(s, n) {
  if (!s || typeof s.headline !== 'string' || !Array.isArray(s.pages)) throw new Error('bad story shape');
  const clean = t => String(t == null ? '' : t).trim().slice(0, 140);
  const pages = s.pages.slice(0, n).map(p => ({ hook: clean(p && p.hook), line: clean(p && p.line) || FALLBACK_LINE }));
  while (pages.length < n) pages.push({ hook: '', line: FALLBACK_LINE });
  return {
    headline: clean(s.headline) || 'the year you kept leaving.',
    subhead: clean(s.subhead),
    pages,
    closing: clean(s.closing) || 'that was your 2026.',
  };
}
