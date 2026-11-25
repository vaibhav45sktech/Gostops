// POST /api/story — writes the newspaper copy from places (+ optional photo thumbs).
// Auto-detects provider from the key: sk-ant-* = Anthropic, otherwise OpenAI.
// Env: LLM_API_KEY (required), LLM_MODEL (optional override).

const FALLBACK_LINE = 'this one spoke for itself.';

function buildPrompts(places, hasPhotos) {
  const n = places.length;
  const sys =
    'You write copy for The Times of Travel: a person\'s real travel year as a playful newspaper-style story. ' +
    'You get an ordered list of places they visited in 2026 (first = earliest), usually with a photo for each in the same order.\\n' +
    'VOICE — write like the Indian app notifications people screenshot and send to friends. That means:\\n' +
    '- two beats with a turn: a setup that sounds like it is going one way, then a swerve. often an ellipsis in the middle, or a question you answer yourself.\\n' +
    '- talk TO them. second person, always. like a friend who was on the trip and noticed everything.\\n' +
    '- warm and cheeky, never clever-for-its-own-sake. wordplay and puns are welcome.\\n' +
    '- occasional hinglish sentence shapes are great (haan chalte hai, pakka, scene hi alag tha) but keep most lines English.\\n' +
    '- tease the behaviour, never the person. nothing about money, body, drinking, drugs or safety.\\n' +
    'Examples of the register (do not reuse): "you said one photo. we have seen the camera roll." / ' +
    '"booked at 11pm. regretted at 5am. worth it by 7." / "nobody asked for a reel. you made three."\\n' +
    'Write:\\n' +
    '- headline: max 7 words, lowercase. the front-page banner for their whole year.\\n' +
    '- subhead: max 10 words, lowercase.\\n' +
    '- for each place in order, TWO parts: a hook (2-6 words, the bold opener that sets something up) and a line (6-16 words, the payoff that swerves). lowercase, no emoji, no quotation marks. ' +
    'when a photo is given, hang the joke on something actually visible in it. ' +
    'treat the sequence as one arc so later lines can call back to earlier ones.\\n' +
    '- closing: max 8 words, lowercase, forward-looking and warm.\\n' +
    'Return ONLY strict JSON: {"headline":"...","subhead":"...","pages":[{"hook":"...","line":"..."}],"closing":"..."} ' +
    'with exactly ' + n + ' page objects in input order.';
  const user = 'N = ' + n + '. places in order: ' +
    places.map((p, i) => (i + 1) + '. ' + p).join('  ') +
    (hasPhotos ? '  photos attached in the same order.' : '  no photos attached.');
  return { sys, user };
}

async function callAnthropic(key, sys, user, thumbs) {
  const model = process.env.LLM_MODEL || 'claude-haiku-5-5';
  const content = [{ type: 'text', text: user }];
  for (const t of thumbs) {
    const m = t.match(/^data:(image\/[a-z]+);base64,(.+)$/s);
    if (m) content.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } });
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(22000),
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      ...(model === 'claude-haiku-5-5' ? { thinking: { type: 'disabled' } } : {}),
      system: sys,
      messages: [{ role: 'user', content }],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || ('anthropic ' + r.status));
  return (d.content || []).map(c => c.text || '').join('');
}

async function callOpenAI(key, sys, user, thumbs) {
  const content = [{ type: 'text', text: user }];
  for (const t of thumbs) content.push({ type: 'image_url', image_url: { url: t, detail: 'low' } });
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(22000),
    headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: sys }, { role: 'user', content }],
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || ('openai ' + r.status));
  return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
}

function extractStory(raw, n) {
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no json in reply');
  const s = JSON.parse(raw.slice(a, b + 1));
  const clean = t => String(t == null ? '' : t).trim().slice(0, 140);
  const pages = (Array.isArray(s.pages) ? s.pages : []).slice(0, n)
    .map(p => ({ hook: clean(p && p.hook), line: clean(p && p.line) || FALLBACK_LINE }));
  while (pages.length < n) pages.push({ hook: '', line: FALLBACK_LINE });
  return {
    headline: clean(s.headline) || 'the year you kept leaving.',
    subhead: clean(s.subhead),
    pages,
    closing: clean(s.closing) || 'that was your 2026.',
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.LLM_API_KEY;
  if (!key) { res.status(500).json({ error: 'LLM_API_KEY not configured' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};

  const places = Array.isArray(body.places)
    ? body.places.slice(0, 8).map(p => String(p).replace(/[\r\n]/g, ' ').slice(0, 40)).filter(Boolean)
    : [];
  if (!places.length) { res.status(400).json({ error: 'places required' }); return; }

  let thumbs = Array.isArray(body.thumbs) ? body.thumbs.slice(0, places.length) : [];
  thumbs = thumbs.filter(t => typeof t === 'string' && t.startsWith('data:image/') && t.length < 400000);

  const { sys, user } = buildPrompts(places, thumbs.length > 0);
  try {
    const raw = key.startsWith('sk-ant-')
      ? await callAnthropic(key, sys, user, thumbs)
      : await callOpenAI(key, sys, user, thumbs);
    res.status(200).json({ story: extractStory(raw, places.length) });
  } catch (e) {
    res.status(502).json({ error: 'generation failed', detail: String(e && e.message || e).slice(0, 200) });
  }
};
