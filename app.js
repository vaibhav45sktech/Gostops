// Travel Type — flow orchestration.
import { processFiles } from './lib/photos.js';
import { CITIES } from './lib/cities.js';
import { placeholderStory } from './lib/lines.js';
import { initStory } from './lib/story.js';
import { makeThumbs, fetchStory } from './lib/ai.js';

const state = { photos: [], nameIndex: 0, story: null };
const $ = s => document.querySelector(s);
const screens = [...document.querySelectorAll('.screen')];

function show(name) {
  screens.forEach(s => s.classList.toggle('is-active', s.dataset.screen === name));
  window.scrollTo(0, 0);
}

/* ---------- landing ---------- */
$('#btnStart').onclick = () => show('upload');

/* ---------- upload ---------- */
const fileInput = $('#fileInput');
$('#btnPick').onclick = () => fileInput.click();
$('#btnAddMore').onclick = () => fileInput.click();
$('#btnUploadBack').onclick = () => show('landing');

fileInput.onchange = async () => {
  if (!fileInput.files.length) return;
  const slots = 8 - state.photos.length;
  const tooMany = fileInput.files.length > slots;
  $('#uploadBusy').hidden = false;
  const got = await processFiles(fileInput.files, slots);
  fileInput.value = '';
  state.photos.push(...got);
  $('#uploadBusy').hidden = true;
  renderThumbs(tooMany);
};

function renderThumbs(tooMany) {
  const grid = $('#thumbGrid');
  grid.innerHTML = '';
  state.photos.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'thumb';
    d.innerHTML = '<img src="' + p.url + '" alt="photo ' + (i + 1) + '">' +
      '<button class="thumb-x" aria-label="Remove photo ' + (i + 1) + '">×</button>' +
      '<span class="thumb-n">' + (i + 1) + '</span>';
    d.querySelector('.thumb-x').onclick = () => {
      URL.revokeObjectURL(p.url);
      state.photos.splice(i, 1);
      renderThumbs(false);
    };
    grid.appendChild(d);
  });
  $('#uploadEmpty').hidden = state.photos.length > 0;
  $('#thumbWrap').hidden = state.photos.length === 0;
  $('#btnToName').disabled = state.photos.length === 0;
  $('#photoCount').textContent = state.photos.length
    ? state.photos.length + ' of 8' + (tooMany ? ' · kept the first 8' : '')
    : '';
}

$('#btnToName').onclick = () => { state.nameIndex = 0; renderName(); show('name'); };

/* ---------- name the places ---------- */
const nameInput = $('#placeInput');
const sugList = $('#sugList');

function renderName() {
  const i = state.nameIndex, p = state.photos[i];
  $('#nameImg').src = p.url;
  $('#nameStep').textContent = (i + 1) + ' / ' + state.photos.length;
  nameInput.value = p.place || '';
  suggest('');
  $('#btnNameNext').textContent = i === state.photos.length - 1 ? 'Make my story' : 'Next';
  updateNext();
  nameInput.focus();
}

function suggest(q) {
  q = q.trim().toLowerCase();
  const hits = q ? CITIES.filter(c => c.toLowerCase().includes(q)).slice(0, 5) : [];
  sugList.innerHTML = '';
  hits.forEach(c => {
    const [city, st] = c.split(', ');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sug';
    b.innerHTML = city + ' <span>· ' + (st || '') + '</span>';
    b.onclick = () => { nameInput.value = city; updateNext(); next(); };
    sugList.appendChild(b);
  });
}

nameInput.addEventListener('input', () => { suggest(nameInput.value); updateNext(); });
nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && nameInput.value.trim()) next();
});
function updateNext() { $('#btnNameNext').disabled = !nameInput.value.trim(); }

function tidy(s) { s = s.trim(); return s.charAt(0).toUpperCase() + s.slice(1); }

function next() {
  state.photos[state.nameIndex].place = tidy(nameInput.value);
  if (state.nameIndex < state.photos.length - 1) { state.nameIndex++; renderName(); }
  else makeStory();
}
$('#btnNameNext').onclick = next;
$('#btnNameBack').onclick = () => {
  if (state.nameIndex > 0) {
    state.photos[state.nameIndex].place = nameInput.value.trim();
    state.nameIndex--;
    renderName();
  } else show('upload');
};

/* ---------- story ---------- */
const LOAD_MSGS = ['developing your photos\u2026', 'talking to the editor\u2026', 'setting the headlines\u2026', 'inking the front page\u2026'];
let loadTimer = null;
function startTicker() {
  let i = 0;
  const elS = $('#loadStatus');
  elS.textContent = LOAD_MSGS[0];
  loadTimer = setInterval(() => { i = (i + 1) % LOAD_MSGS.length; elS.textContent = LOAD_MSGS[i]; }, 1600);
}
function stopTicker() { clearInterval(loadTimer); loadTimer = null; }

async function makeStory() {
  show('loading');
  startTicker();
  const places = state.photos.map(p => p.place);
  let story = null;
  try {
    const thumbs = await makeThumbs(state.photos);
    story = await fetchStory(places, thumbs);
  } catch (e) {
    console.warn('AI copy unavailable, using fallback lines:', e);
  }
  stopTicker();
  state.story = story || placeholderStory(places);
  initStory(state, { onRestart });
  show('story');
}

function onRestart() {
  state.photos.forEach(p => URL.revokeObjectURL(p.url));
  state.photos = [];
  state.story = null;
  renderThumbs(false);
  show('landing');
}

window.__tt = { state, show };
