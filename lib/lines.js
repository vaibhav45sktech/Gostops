// ─────────────────────────────────────────────────────────────────────────────
//  THE LINE LIBRARY
//  Used when the AI is unavailable, and as the house voice the AI imitates.
//
//  FORMAT: every entry is a PAIR — [hook, line]
//    hook = the bold opener. 2-6 words. sets something up.
//    line = the payoff underneath. 6-16 words. swerves.
//
//  Voice rules:
//    · talk TO them ("you"), like a friend who was on the trip
//    · tease the behaviour, never the person. nothing about money, body,
//      drinking or safety
//    · light Hinglish welcome (pakka, scene hi alag tha, haan chalte hai)
//    · no emoji, no quote marks
// ─────────────────────────────────────────────────────────────────────────────

// Lines for a specific place. Key = lowercase city name.
export const BY_PLACE = {
  gokarna:     [['two nights, apparently', 'you told everyone it was a week. we have the dates.']],
  manali:      [['a private moment', 'you and four hundred other people, all having it at once.']],
  rishikesh:   [['you came back changed', 'vegetarian, spiritual, calm. it lasted nine days.']],
  goa:         [['not a goa trip', 'is what you called the goa trip. every single day.']],
  hampi:       [['one night only', 'still made a reel. still posted it twice. respect.']],
  varanasi:    [['you found yourself', 'and lost one slipper. honestly, a fair trade.']],
  udaipur:     [['venice of india', 'you said it out loud. unironically. twice.']],
  jaipur:      [['three forts in a day', 'two photos taken. one very committed nap.']],
  pushkar:     [['the pants', 'you bought them here. you have never worn them since.']],
  munnar:      [['tea estate, fog, silence', 'and the exact same seventeen photos as everyone else.']],
  agra:        [['four hours of travel', 'for one monument. and you would do it again.']],
  jaisalmer:   [['slept under the stars', 'complained about the sand until roughly march.']],
  kasol:       [['the group chat', 'has still not fully recovered from this one.']],
  coorg:       [['booked at 11pm', 'bus at 6am. worth every single yawn.']],
  pondicherry: [['three nights', 'and one entirely new personality. welcome back.']],
  wayanad:     [['the last green thing', 'before the year went grey on you.']],
  shillong:    [['the playlist', 'from this trip is somehow still in rotation.']],
  delhi:       [['just passing through', 'is what you said. five days later, you left.']],
  mumbai:      [['the plan was one evening', 'the city had completely different ideas.']],
  bengaluru:   [['two hours in traffic', 'and you still called this a trip. fair.']],
  dharamshala: [['twelve kilometres uphill', 'to sit completely still. makes sense, actually.']],
  leh:         [['the altitude humbled you', 'the view apologised on its behalf.']],
  spiti:       [['no network for three days', 'and somehow the best three days.']],
  darjeeling:  [['awake at four', 'for a sunrise. you told everyone you would do it again.']],
};

export const FIRST = [
  ['and so it began', 'one photo in and the year already had plans.'],
  ['page one', 'you had absolutely no idea what was coming.'],
  ['it started here', 'everything after this is entirely your own fault.'],
];

export const MIDDLE = [
  ['you said one photo', 'we have seen the camera roll. all of it.'],
  ['admit it', 'this is the one that became your wallpaper.'],
  ['the group chat voted no', 'you went anyway. correct decision.'],
  ['nobody asked for a reel', 'you made three. two had transitions.'],
  ['you were not going to post this', 'and yet here we are.'],
  ['booked on a whim', 'talked about it for the next four months.'],
  ['two days here', 'undid four straight weeks of everything else.'],
];

export const LAST = [
  ['last stop', 'the year went very quiet after this one.'],
  ['december called', 'you were already packed. obviously.'],
  ['and that was that', 'not a bad year for someone with attendance.'],
];

export const HEADLINES = [
  'the year you kept leaving.',
  'haan chalte hai: a 2026 story.',
  'you were barely home. good.',
  'the year your bag stayed packed.',
];

export const CLOSINGS = [
  '2027 is already asking where next.',
  'same time next year? pakka.',
  'your bag is still by the door.',
];

// Deterministic-but-varied selection: hash the seed, shuffle a copy of the pool,
// then hand out entries without repeating within one story.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffled(arr, seed) {
  const a = arr.slice();
  let h = hash(seed) || 1;
  for (let i = a.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function placeholderStory(places) {
  const n = places.length;
  const seed = places.join('|') + '#' + n;
  const queues = {
    FIRST: shuffled(FIRST, seed + 'f'),
    MIDDLE: shuffled(MIDDLE, seed + 'm'),
    LAST: shuffled(LAST, seed + 'l'),
  };
  const usedHooks = new Set();

  function takeFrom(name) {
    const q = queues[name];
    for (let k = 0; k < q.length; k++) {
      if (!usedHooks.has(q[k][0])) { usedHooks.add(q[k][0]); return q[k]; }
    }
    return q[0];
  }

  const pages = places.map((place, i) => {
    const key = String(place).toLowerCase().trim().split(',')[0].trim();
    const own = BY_PLACE[key];
    let pair = null;
    if (own && own.length) {
      const opts = shuffled(own, seed + key + i);
      pair = opts.find(p => !usedHooks.has(p[0])) || null;
      if (pair) usedHooks.add(pair[0]);
    }
    if (!pair) pair = takeFrom(i === 0 ? 'FIRST' : (i === n - 1 && n > 1 ? 'LAST' : 'MIDDLE'));
    return { place, hook: pair[0], line: pair[1] };
  });

  return {
    headline: shuffled(HEADLINES, seed + 'h')[0],
    subhead: n + (n === 1 ? ' dispatch' : ' dispatches') + ', filed from the road',
    pages,
    closing: shuffled(CLOSINGS, seed + 'c')[0],
  };
}
