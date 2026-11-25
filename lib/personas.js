// The travel desk makes a playful, deliberately varied call from the places
// the visitor supplied. A match gets better odds; no photo content is guessed.
const CAT = 'assets/cats/';

const PERSONAS = [
  { id: 'repeat', title: 'The Repeat Offender', line: 'new destination? you already have a usual.', tint: 'pink', images: ['doorway-traveler.png', 'trip-and-home.png'] },
  { id: 'altitude', title: 'The Altitude Attitude', line: 'sea level called. you let it ring.', tint: 'teal', images: ['mountain-duo.png', 'traveler-suitcase.png'] },
  { id: 'beach', title: 'The Beach Department', line: 'your out-of-office has an out-of-office.', tint: 'orange', images: ['office-and-travel.png', 'trip-and-home.png'] },
  { id: 'snack', title: 'The Snack Route Inspector', line: 'your itinerary was mostly edible.', tint: 'yellow', images: ['trip-and-home.png', 'tiny-suitcase.png'] },
  { id: 'monument', title: 'The Monument Paparazzi', line: 'the monument survived. your camera roll did not.', tint: 'purple', images: ['monument-selfie.png', 'traveler-suitcase.png'] },
  { id: 'window', title: 'The Window Seat Oracle', line: 'you booked a seat. the view booked your attention.', tint: 'teal', images: ['traveler-suitcase.png', 'tiny-suitcase.png'] },
  { id: 'group', title: 'The Group Chat Sherpa', line: 'got everyone there. deserves a passport stamp.', tint: 'orange', images: ['mountain-duo.png', 'trip-and-home.png'] },
  { id: 'solo', title: 'The Solo Plot Twist', line: 'one ticket. main character energy.', tint: 'pink', images: ['tiny-suitcase.png', 'monument-selfie.png'] },
  { id: 'sunset', title: 'The Sunset Union Rep', line: 'you would like a word with golden hour.', tint: 'yellow', images: ['office-and-travel.png', 'monument-selfie.png'] },
  { id: 'map', title: 'The Map Tab Menace', line: 'one more stop. then you are done. probably.', tint: 'purple', images: ['traveler-suitcase.png', 'doorway-traveler.png'] },
];

const HILLS = /manali|kasol|leh|ladakh|spiti|shimla|dharamshala|darjeeling|munnar|coorg|wayanad|shillong|mussoorie|nainital|srinagar|gulmarg|ooty|kodaikanal|gangtok|tawang|rishikesh/;
const COAST = /goa|gokarna|pondicherry|puducherry|varkala|kovalam|alleppey|kochi|andaman|puri|digha|mumbai|mangalore|visakhapatnam/;
const HERITAGE = /agra|jaipur|udaipur|jodhpur|jaisalmer|hampi|varanasi|pushkar|khajuraho|aurangabad|delhi|mysore|madurai/;

export function choosePersona(photos, previousId = '', previousImage = '') {
  const places = photos.map(p => String(p.place || '').trim()).filter(Boolean);
  const unique = [...new Set(places.map(p => p.toLowerCase()))];
  const joined = places.join(' ').toLowerCase();
  const scores = Object.fromEntries(PERSONAS.map(p => [p.id, 1]));
  const repeated = unique.length < places.length;
  const hills = HILLS.test(joined);
  const coast = COAST.test(joined);
  const heritage = HERITAGE.test(joined);
  const manyStops = unique.length >= 3;
  if (repeated) scores.repeat += 6;
  if (hills) scores.altitude += 5;
  if (coast) scores.beach += 5;
  if (heritage) scores.monument += 4;
  if (manyStops) scores.map += 2 + unique.length;
  if (photos.length >= 4) scores.group += 1;
  if (photos.length === 1) scores.solo += 2;

  const eligible = { repeat: repeated, altitude: hills, beach: coast, monument: heritage, map: manyStops };
  const pool = PERSONAS.filter(p => p.id !== previousId && (eligible[p.id] ?? true));
  const total = pool.reduce((sum, p) => sum + scores[p.id], 0);
  let roll = Math.random() * total;
  const picked = pool.find(p => (roll -= scores[p.id]) < 0) || pool[pool.length - 1];
  const images = picked.images.filter(name => CAT + name !== previousImage);
  const image = images[Math.floor(Math.random() * images.length)];
  const receipt = unique.length === 1
    ? 'the travel desk spotted ' + places.length + (places.length === 1 ? ' dispatch' : ' dispatches') + ' from ' + places[0]
    : places.length + ' dispatches · ' + unique.length + ' different stops';
  return { ...picked, image: CAT + image, receipt };
}
