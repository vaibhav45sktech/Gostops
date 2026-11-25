// Turns the printed pages into one portrait MP4 for Stories and Status.
// Recording stays on the user's device; no full-size photos are uploaded.

const WIDTH = 720;
const HEIGHT = 1280;
const PAGE_MS = 2200;
const FINAL_MS = 3000;
const MP4_TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4'];

export function canMakeVideo() {
  return typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    MP4_TYPES.some(type => MediaRecorder.isTypeSupported(type));
}

export async function renderVideo(pages, onProgress) {
  if (!canMakeVideo()) return null;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  const stream = canvas.captureStream(12);
  const type = MP4_TYPES.find(value => MediaRecorder.isTypeSupported(value));
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 3500000 });
  const finished = new Promise((resolve, reject) => {
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = event => reject(event.error || new Error('Video recording failed'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/mp4' }));
  });

  try {
    for (let i = 0; i < pages.length; i++) {
      const image = await createImageBitmap(pages[i]);
      ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
      image.close?.();
      if (i === 0) recorder.start();
      await new Promise(resolve => setTimeout(resolve, i === pages.length - 1 ? FINAL_MS : PAGE_MS));
      onProgress?.(i + 1, pages.length);
    }
    recorder.stop();
    const video = await finished;
    if (!video.size) throw new Error('Empty video');
    return video;
  } finally {
    if (recorder.state !== 'inactive') recorder.stop();
    stream.getTracks().forEach(track => track.stop());
  }
}
