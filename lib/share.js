// Share targets. Instagram and WhatsApp take ordered PNG pages via the share sheet;
// X and LinkedIn only accept a link, so we save the image first and open the composer.
import { renderAll, blobsToFiles, canShareFiles, download } from './export.js';

const SITE = location.origin + location.pathname.replace(/index\.html$/, '');
const TEXT = 'I turned my 2026 travel photos into a front page. Make yours:';

let cache = null;
let renderPromise = null;
let preparePromise = null;
let version = 0;

export async function pages(state, onProgress) {
  if (cache) return cache;
  if (!renderPromise) {
    const current = version;
    renderPromise = renderAll(state, onProgress).then(blobs => {
      if (current === version) cache = blobs;
      return blobs;
    }).finally(() => { if (current === version) renderPromise = null; });
  }
  return renderPromise;
}
export function clearCache() {
  version++;
  cache = renderPromise = preparePromise = null;
}

export function prepareFullStory(state, onProgress) {
  if (preparePromise) return preparePromise;
  preparePromise = pages(state, onProgress);
  return preparePromise;
}

// Each PNG becomes a separate Story or Status frame when the target accepts
// multiple images. The user still chooses the destination and confirms it.
export async function shareFullStory(state, onProgress) {
  const printed = cache || await pages(state, onProgress);
  const files = blobsToFiles(printed);
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, title: 'The Times of Travel' });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }
  saveAll(printed);
  return 'downloaded-pages';
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
