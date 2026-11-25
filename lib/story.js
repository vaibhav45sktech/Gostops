// Full-screen story viewer: front page, one page per photo, closing spread.
// Tap the right half to advance, or the left half to go back. Arrow keys work too.
import { renderFrontPage } from './mosaic.js';
import { choosePersona } from './personas.js';
import * as Share from './share.js';

const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const el = (tag, cls) => { const d = document.createElement(tag); d.className = cls; return d; };

export function initStory(state, { onRestart }) {
  const root = document.getElementById('storyRoot');
  root.innerHTML = '';
  const pages = [];
  state.persona = choosePersona(state.photos);

  // Page 0: front page
  const front = el('div', 'spage');
  const fcard = el('div', 'card');
  renderFrontPage(fcard, state.photos, state.story);
  front.appendChild(fcard);
  pages.push(front);

  // One page per photo — photobooth print on a colour ground
  const TINTS = ['teal', 'purple', 'pink', 'orange', 'yellow'];
  const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const stamp = MON[new Date().getMonth()] + ' 2026';
  state.photos.forEach((p, i) => {
    const pg = el('div', 'spage');
    const c = el('div', 'card print-card tint-' + TINTS[i % TINTS.length]);
    const tilt = (i % 2 === 0 ? -1.4 : 1.3);
    c.innerHTML =
      '<div class="prc-head"><span>THE TIMES OF TRAVEL</span><span>' + String(i + 1).padStart(2, '0') +
        ' / ' + String(state.photos.length).padStart(2, '0') + '</span></div>' +
      '<div class="prc-stage">' +
        '<div class="print" style="transform: rotate(' + tilt + 'deg)">' +
          '<div class="print-frame">' +
            '<div class="print-img" style="background-image:url(\'' + p.url + '\')"></div>' +
            '<span class="pf-tl">THE TIMES OF TRAVEL</span>' +
            '<span class="pf-tr">' + stamp + '</span>' +
          '</div>' +
          '<div class="print-cap">' +
            '<div class="print-place">' + esc(p.place) + '</div>' +
            '<div class="print-no">NO. ' + String(i + 1).padStart(2, '0') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="prc-copy">' +
        '<div class="prc-hook">' + esc(state.story.pages[i].hook || '') + '</div>' +
        '<div class="prc-line">' + esc(state.story.pages[i].line) + '</div>' +
      '</div>';
    pg.appendChild(c);
    pages.push(pg);
  });

  // One cat, one travel type, followed by a real goSTOPS destination.
  const cl = el('div', 'spage');
  const cc = el('div', 'card persona-card');
  const persona = state.persona;
  cc.innerHTML =
    '<div class="persona-mast">THE TIMES OF TRAVEL · 2026</div>' +
    '<div class="persona-panel persona-' + persona.tint + '">' +
      '<div class="persona-kicker">THE TRAVEL DESK HAS DECIDED</div>' +
      '<div class="persona-title">' + esc(persona.title) + '</div>' +
      '<div class="persona-photo"><img src="' + esc(persona.image) + '" alt="Travel cat meme"></div>' +
      '<div class="persona-copy">' +
        '<div class="persona-line">' + esc(persona.line) + '</div>' +
        '<div class="persona-receipt">' + esc(persona.receipt) + '</div>' +
        '<div class="persona-next"><span>YOUR NEXT CHAPTER: ' + esc(persona.chapter.city.toUpperCase()) + '</span>' +
          '<a href="' + esc(persona.chapter.url) + '" target="_blank" rel="noopener noreferrer">Explore this stay ↗</a></div>' +
      '</div>' +
    '</div>' +
    '<div class="cl-actions">' +
      '<button class="btn btn-primary" id="btnShare">Share my cat type</button>' +
      '<div class="share-row">' +
        '<button class="sbtn s-ig" id="btnIG">IG Story</button>' +
        '<button class="sbtn s-wa" id="btnWA">WA Status</button>' +
        '<button class="sbtn s-x"  id="btnX">X</button>' +
        '<button class="sbtn s-li" id="btnLI">LinkedIn</button>' +
      '</div>' +
      '<button class="btn btn-ghost" id="btnSaveAll">Save all PNG pages</button>' +
      '<p class="share-note" id="shareNote">&nbsp;</p>' +
      '<button class="btn btn-ghost btn-sm" id="btnRestart">Start over</button>' +
    '</div>';
  cl.appendChild(cc);
  pages.push(cl);

  pages.forEach(p => root.appendChild(p));

  // Progress bars
  const prog = el('div', 'progress');
  pages.forEach(() => prog.appendChild(document.createElement('i')));
  root.appendChild(prog);

  let cur = 0;
  function go(n2) {
    cur = Math.max(0, Math.min(pages.length - 1, n2));
    pages.forEach((p, i) => p.classList.toggle('is-current', i === cur));
    [...prog.children].forEach((b, i) => b.classList.toggle('on', i <= cur));
  }

  root.onclick = (e) => {
    if (e.target.closest('button, a, input')) return;
    const { left, width } = root.getBoundingClientRect();
    go(e.clientX < left + width / 2 ? cur - 1 : cur + 1);
  };
  document.addEventListener('keydown', (e) => {
    const active = document.querySelector('[data-screen="story"].is-active');
    if (!active) return;
    if (e.key === 'ArrowRight') go(cur + 1);
    if (e.key === 'ArrowLeft') go(cur - 1);
  });

  // ---- share wiring ----
  const note = cc.querySelector('#shareNote');
  const allBtns = [...cc.querySelectorAll('button')];
  const igBtn = cc.querySelector('#btnIG');
  const waBtn = cc.querySelector('#btnWA');
  let isBusy = false;
  let fullReady = false;
  function updateButtons() {
    allBtns.forEach(b => { b.disabled = isBusy; });
    igBtn.disabled = waBtn.disabled = isBusy || !fullReady;
  }
  function busy(on, msg) {
    isBusy = on;
    updateButtons();
    note.innerHTML = msg || '&nbsp;';
  }
  function progress(done, total) { note.textContent = 'printing page ' + done + ' of ' + total + '...'; }
  function run(fn, label) {
    return async () => {
      busy(true, 'getting your pages ready...');
      try {
        const r = await fn(state, progress);
        busy(false, r === 'shared' ? 'Sent to your share sheet. Finish posting there.' : r === 'cancelled' ? '' : (label || 'saved to your downloads.'));
      } catch (e) {
        console.error(e);
        busy(false, 'could not make the images - try again.');
      }
    };
  }
  function fullShare(destination) {
    return async () => {
      busy(true, 'opening your full edition...');
      try {
        const result = await Share.shareFullStory(state, progress);
        const message = result === 'shared'
          ? 'Check every frame in ' + destination + '. If only one appears, use Save all PNG pages.'
          : result === 'downloaded-pages'
            ? 'All pages saved as PNGs. Select them in ' + destination + ' from your gallery.'
            : '';
        busy(false, message);
      } catch (error) {
        console.error(error);
        busy(false, 'Could not prepare the full edition. Try Save all PNG pages.');
      }
    };
  }
  cc.querySelector('#btnShare').onclick = run(Share.sharePersona, 'cat card saved to your downloads.');
  igBtn.onclick = fullShare('Instagram Stories');
  waBtn.onclick = fullShare('WhatsApp Status');
  cc.querySelector('#btnX').onclick     = run(Share.shareToX, 'cat card saved - attach it to the post.');
  cc.querySelector('#btnLI').onclick    = run(Share.shareToLinkedIn, 'cat card saved - attach it to the post.');
  cc.querySelector('#btnSaveAll').onclick = run(async (st, op) => {
    Share.saveAll(await Share.pages(st, op)); return 'downloaded';
  }, 'all pages saved to your downloads.');

  cc.querySelector('#btnRestart').onclick = () => { Share.clearCache(); onRestart(); };
  go(0);
  updateButtons();
  note.textContent = 'Printing your full edition as separate pages...';
  Share.prepareFullStory(state, (done, total) => {
    if (!isBusy && root.contains(cc)) {
      note.textContent = 'Printing pages ' + done + ' of ' + total + '...';
    }
  }).then(() => {
    if (!root.contains(cc)) return;
    fullReady = true;
    updateButtons();
    if (!isBusy) note.textContent = 'Full edition ready as separate PNGs. Choose IG Story or WA Status.';
  }).catch(error => {
    console.error(error);
    if (root.contains(cc)) note.textContent = 'Could not prepare the full edition. Try Save all PNG pages.';
  });
}
