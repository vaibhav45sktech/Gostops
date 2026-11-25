// Front page: newspaper masthead + billboard mosaic of the user's photos.
const T = {
  1: { cols: '1fr',      rows: '55fr 45fr',           areas: ['p1', 'h'] },
  2: { cols: '3fr 2fr',  rows: '55fr 45fr',           areas: ['p1 p1', 'h p2'] },
  3: { cols: '1fr 1fr',  rows: '36fr 28fr 36fr',      areas: ['h p1', 'p2 p1', 'p2 p3'] },
  4: { cols: '1fr 1fr',  rows: '30fr 22fr 22fr 26fr', areas: ['h p1', 'p2 p1', 'p2 p3', 'p4 p3'] },
  5: { cols: '3fr 2fr',  rows: '26fr 22fr 24fr 28fr', areas: ['h h', 'p1 p2', 'p1 p3', 'p4 p5'] },
  6: { cols: '1fr 1fr',  rows: '26fr 18fr 28fr 28fr', areas: ['h p1', 'p2 p1', 'p3 p4', 'p5 p6'] },
};
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

export function renderFrontPage(card, photos, story) {
  card.classList.add('front-card');
  const n = Math.min(photos.length, 6);
  const t = T[n];
  const d = new Date();
  const dateStr = d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();

  card.innerHTML =
    '<div class="front-mast">' +
      '<div class="fm-rule"></div>' +
      '<div class="fm-title">The Times of Travel</div>' +
      '<div class="fm-date">VOL. 2026 · ' + photos.length + (photos.length === 1 ? ' DISPATCH' : ' DISPATCHES') + ' · ' + dateStr + '</div>' +
      '<div class="fm-rule fm-thin"></div>' +
    '</div>';

  const grid = document.createElement('div');
  grid.className = 'front-grid';
  grid.style.gridTemplateColumns = t.cols;
  grid.style.gridTemplateRows = t.rows;
  grid.style.gridTemplateAreas = t.areas.map(r => '"' + r + '"').join(' ');

  const h = document.createElement('div');
  h.className = 'fb fb-h';
  h.style.gridArea = 'h';
  const extra = photos.length > 6 ? '<div class="fh-extra">+' + (photos.length - 6) + ' more inside</div>' : '';
  h.innerHTML = '<div class="fh-label">THE YEAR IN HEADLINES</div><div class="fh-title">' + esc(story.headline) + '</div>' + extra;
  grid.appendChild(h);

  photos.slice(0, 6).forEach((p, i) => {
    const b = document.createElement('div');
    b.className = 'fb fb-p';
    b.style.gridArea = 'p' + (i + 1);
    b.style.backgroundImage = "url('" + p.url + "')";
    b.innerHTML = '<span class="fp-tag">' + esc((p.place || '').toUpperCase()) + '</span>';
    grid.appendChild(b);
  });

  card.appendChild(grid);
}
