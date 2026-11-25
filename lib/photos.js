// Photo intake: validate, downscale on-device, hand back object URLs.
// Downscaling to 1600px keeps memory sane and makes the later canvas export fast.
const MAX_EDGE = 1600;

export async function processFiles(fileList, slots = 8) {
  const files = [...fileList].filter(f => f.type.startsWith('image/')).slice(0, Math.max(0, slots));
  const out = [];
  for (const f of files) {
    try { out.push(await processOne(f)); }
    catch (e) { console.warn('Skipped a photo that could not be read:', f.name, e); }
  }
  return out;
}

async function processOne(file) {
  const src = await loadBitmap(file);
  const W = src.width || src.naturalWidth;
  const H = src.height || src.naturalHeight;
  const scale = Math.min(1, MAX_EDGE / Math.max(W, H));
  const w = Math.max(1, Math.round(W * scale));
  const h = Math.max(1, Math.round(H * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(src, 0, 0, w, h);
  if (src.close) src.close();
  const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
  if (!blob) throw new Error('could not encode');
  return { url: URL.createObjectURL(blob), blob, w, h, place: '' };
}

async function loadBitmap(file) {
  // Modern path: respects EXIF orientation.
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) { /* fall through */ }
  // Fallback path for formats createImageBitmap rejects.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
