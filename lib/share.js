// Share targets. Instagram and WhatsApp take the image via the native share sheet;
// X and LinkedIn only accept a link, so we save the image first and open the composer.
import { renderAll, blobsToFiles, canShareFiles, download } from './export.js';

const SITE = location.origin + location.pathname.replace(/index\.html$/, '');
const TEXT = 'I turned my 2026 travel photos into a front page. Make yours:';

let cache = null;

export async function pages(state, onProgress) {
  if (!cache) cache = await renderAll(state, onProgress);
  return cache;
}
export function clearCache() { cache = null; }

export async function shareStory(state, onProgress) {
  const blobs = await pages(state, onProgress);
  const files = blobsToFiles(blobs);
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, title: 'The Times of Travel', text: TEXT });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  saveAll(blobs);
  return 'downloaded';
}

export async function shareFront(state, onProgress) {
  const blobs = await pages(state, onProgress);
  const files = blobsToFiles([blobs[0]]);
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, title: 'The Times of Travel', text: TEXT });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  download(blobs[0], 'times-of-travel-front-page.png');
  return 'downloaded';
}

export async function sharePersona(state, onProgress) {
  const blobs = await pages(state, onProgress);
  const card = blobs[blobs.length - 1];
  const files = blobsToFiles([card]);
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, title: state.persona.title, text: 'My travel type: ' + state.persona.title });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  download(card, 'times-of-travel-my-cat-type.png');
  return 'downloaded';
}

export function saveAll(blobs) {
  blobs.forEach((b, i) => setTimeout(
    () => download(b, 'times-of-travel-' + String(i + 1).padStart(2, '0') + '.png'),
    i * 350));
}

export async function shareToX(state, onProgress) {
  const blobs = await pages(state, onProgress);
  download(blobs[blobs.length - 1], 'times-of-travel-my-cat-type.png');
  window.open('https://twitter.com/intent/tweet?text=' +
    encodeURIComponent('My travel type: ' + state.persona.title + '. ' + TEXT) + '&url=' + encodeURIComponent(SITE), '_blank', 'noopener');
  return 'downloaded';
}

export async function shareToLinkedIn(state, onProgress) {
  const blobs = await pages(state, onProgress);
  download(blobs[blobs.length - 1], 'times-of-travel-my-cat-type.png');
  window.open('https://www.linkedin.com/sharing/share-offsite/?url=' +
    encodeURIComponent(SITE), '_blank', 'noopener');
  return 'downloaded';
}

export async function shareToWhatsApp(state, onProgress) {
  const blobs = await pages(state, onProgress);
  const card = blobs[blobs.length - 1];
  const files = blobsToFiles([card]);
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, text: TEXT + ' ' + SITE });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  download(card, 'times-of-travel-my-cat-type.png');
  window.open('https://wa.me/?text=' + encodeURIComponent(TEXT + ' ' + SITE), '_blank', 'noopener');
  return 'downloaded';
}
