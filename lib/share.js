// Share targets. Instagram and WhatsApp take the image via the native share sheet;
// X and LinkedIn only accept a link, so we save the image first and open the composer.
import { renderAll, blobsToFiles, canShareFiles, download } from './export.js';
import { canMakeVideo, renderVideo } from './video.js';

const SITE = location.origin + location.pathname.replace(/index\.html$/, '');
const TEXT = 'I turned my 2026 travel photos into a front page. Make yours:';

let cache = null;
let renderPromise = null;
let video = null;
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
  cache = renderPromise = video = preparePromise = null;
}

export function prepareFullStory(state, onProgress) {
  if (preparePromise) return preparePromise;
  const current = version;
  preparePromise = (async () => {
    const printed = await pages(state, (done, total) => onProgress?.('pages', done, total));
    if (!canMakeVideo()) return false;
    try {
      const movie = await renderVideo(printed, (done, total) => onProgress?.('video', done, total));
      if (current === version) video = movie;
      return !!movie;
    } catch (error) {
      console.warn('Full-story video unavailable:', error);
      return false;
    }
  })();
  return preparePromise;
}

// A browser can hand one complete video to the phone's share sheet. The user
// still chooses Instagram Stories or WhatsApp Status and confirms the post.
export async function shareFullStory(state, onProgress) {
  if (video) {
    const file = new File([video], 'times-of-travel-full-story.mp4', { type: 'video/mp4' });
    if (canShareFiles([file])) {
      try {
        await navigator.share({ files: [file], title: 'The Times of Travel' });
        return 'shared';
      } catch (error) {
        if (error?.name === 'AbortError') return 'cancelled';
      }
    }
    download(video, file.name);
    return 'downloaded-video';
  }
  saveAll(cache || await pages(state, onProgress));
  return 'downloaded-pages';
}

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
