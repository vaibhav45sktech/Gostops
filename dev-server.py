#!/usr/bin/env python3
"""Local dev server for The Times of Travel.

Serves the static site AND /api/story, mirroring the Vercel function,
so the AI flow can be tested on localhost without any install.

  python dev-server.py          (run from inside the traveltype folder)
  open http://localhost:8000/

Reads LLM_API_KEY (and optional LLM_MODEL) from .env in this folder.
"""
import json, os, re, ssl, sys, urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

def load_env():
    env = {}
    try:
        with open('.env', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return env

os.chdir(os.path.dirname(os.path.abspath(__file__)))

ENV = load_env()
KEY = ENV.get('LLM_API_KEY') or os.environ.get('LLM_API_KEY', '')
MODEL = ENV.get('LLM_MODEL') or os.environ.get('LLM_MODEL', '')
FALLBACK_LINE = 'this one spoke for itself.'

def build_prompts(places, has_photos):
    n = len(places)
    sys_p = (
        "You write copy for The Times of Travel: a person's real travel year as a playful "
        "newspaper-style story. You get an ordered list of places they visited in 2026 "
        "(first = earliest), usually with a photo for each in the same order.\n"
        "VOICE - write like the Indian app notifications people screenshot and send to friends. That means:\n"
        "- two beats with a turn: a setup that sounds like it is going one way, then a swerve. "
        "often an ellipsis in the middle, or a question you answer yourself.\n"
        "- talk TO them. second person, always. like a friend who was on the trip and noticed everything.\n"
        "- warm and cheeky, never clever-for-its-own-sake. wordplay and puns are welcome.\n"
        "- occasional hinglish sentence shapes are great (haan chalte hai, pakka, scene hi alag tha) "
        "but keep most lines English.\n"
        "- tease the behaviour, never the person. nothing about money, body, drinking, drugs or safety.\n"
        'Examples of the register (do not reuse): "you said one photo. we have seen the camera roll." / '
        '"booked at 11pm. regretted at 5am. worth it by 7." / "nobody asked for a reel. you made three."\n'
        "Write:\n"
        "- headline: max 7 words, lowercase. the front-page banner for their whole year.\n"
        "- subhead: max 10 words, lowercase.\n"
        "- for each place in order, TWO parts: a hook (2-6 words, the bold opener that sets something up) "
        "and a line (6-16 words, the payoff that swerves). lowercase, no emoji, no quotation marks. "
        "when a photo is given, hang the joke on something actually visible in it. "
        "treat the sequence as one arc so later lines can call back to earlier ones.\n"
        "- closing: max 8 words, lowercase, forward-looking and warm.\n"
        'Return ONLY strict JSON: {"headline":"...","subhead":"...","pages":[{"hook":"...","line":"..."}],"closing":"..."} '
        f"with exactly {n} page objects in input order."
    )
    user = f"N = {n}. places in order: " + "  ".join(f"{i+1}. {p}" for i, p in enumerate(places))
    user += "  photos attached in the same order." if has_photos else "  no photos attached."
    return sys_p, user

def post_json(url, headers, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={**headers, 'content-type': 'application/json'}, method='POST')
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
        return json.loads(r.read().decode())

def call_llm(places, thumbs):
    sys_p, user = build_prompts(places, bool(thumbs))
    if KEY.startswith('sk-ant-'):
        model = MODEL or 'claude-haiku-5-5'
        content = [{'type': 'text', 'text': user}]
        for t in thumbs:
            m = re.match(r'^data:(image/[a-z]+);base64,(.+)$', t, re.S)
            if m:
                content.append({'type': 'image', 'source': {'type': 'base64', 'media_type': m.group(1), 'data': m.group(2)}})
        d = post_json('https://api.anthropic.com/v1/messages',
                      {'x-api-key': KEY, 'anthropic-version': '2023-06-01'},
                      {'model': model, 'max_tokens': 800,
                       **({'thinking': {'type': 'disabled'}} if model == 'claude-haiku-5-5' else {}),
                       'system': sys_p, 'messages': [{'role': 'user', 'content': content}]})
        return ''.join(c.get('text', '') for c in d.get('content', []))
    else:
        content = [{'type': 'text', 'text': user}]
        for t in thumbs:
            content.append({'type': 'image_url', 'image_url': {'url': t, 'detail': 'low'}})
        d = post_json('https://api.openai.com/v1/chat/completions',
                      {'authorization': 'Bearer ' + KEY},
                      {'model': MODEL or 'gpt-4o-mini', 'max_tokens': 800,
                       'response_format': {'type': 'json_object'},
                       'messages': [{'role': 'system', 'content': sys_p}, {'role': 'user', 'content': content}]})
        return d['choices'][0]['message']['content']

def extract_story(raw, n):
    a, b = raw.find('{'), raw.rfind('}')
    if a < 0 or b <= a:
        raise ValueError('no json in reply')
    s = json.loads(raw[a:b + 1])
    clean = lambda t: str(t or '').strip()[:140]
    pages = [{'hook': clean(p.get('hook')), 'line': clean(p.get('line')) or FALLBACK_LINE}
             for p in (s.get('pages') or [])[:n]]
    while len(pages) < n:
        pages.append({'hook': '', 'line': FALLBACK_LINE})
    return {'headline': clean(s.get('headline')) or 'the year you kept leaving.',
            'subhead': clean(s.get('subhead')),
            'pages': pages,
            'closing': clean(s.get('closing')) or 'that was your 2026.'}

class Handler(SimpleHTTPRequestHandler):
    def _private_path(self):
        path = unquote(urlsplit(self.path).path).replace('\\', '/')
        return any(part.startswith('.') for part in path.split('/') if part)

    def do_GET(self):
        if self._private_path():
            self.send_error(404); return
        super().do_GET()

    def do_HEAD(self):
        if self._private_path():
            self.send_error(404); return
        super().do_HEAD()

    def do_POST(self):
        if not self.path.rstrip('/').endswith('/api/story') and self.path != '/api/story':
            self.send_error(404); return
        try:
            length = min(int(self.headers.get('Content-Length', 0)), 6_000_000)
            body = json.loads(self.rfile.read(length) or b'{}')
            places = [str(p).replace('\n', ' ')[:40] for p in (body.get('places') or [])[:8] if str(p).strip()]
            if not places:
                self.reply(400, {'error': 'places required'}); return
            if not KEY:
                self.reply(500, {'error': 'LLM_API_KEY not set in .env'}); return
            thumbs = [t for t in (body.get('thumbs') or [])[:len(places)]
                      if isinstance(t, str) and t.startswith('data:image/') and len(t) < 400000]
            raw = call_llm(places, thumbs)
            self.reply(200, {'story': extract_story(raw, len(places))})
        except urllib.error.HTTPError as e:
            try:
                detail = e.read().decode()[:600]
            except Exception:
                detail = ''
            print('\n  !! API ERROR ' + str(e.code) + ': ' + detail + '\n', file=sys.stderr)
            self.reply(502, {'error': 'generation failed', 'detail': detail[:300]})
        except Exception as e:
            import traceback
            print('\n  !! FAILED: ' + repr(e), file=sys.stderr)
            traceback.print_exc()
            print('', file=sys.stderr)
            self.reply(502, {'error': 'generation failed', 'detail': str(e)[:300]})

    def reply(self, code, obj):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        sys.stderr.write("  " + (fmt % args) + "\n")

if __name__ == '__main__':
    print('')
    print('  THE TIMES OF TRAVEL  ---  dev server')
    print('  ' + '-' * 44)
    print('  serving   : ' + os.getcwd())
    if KEY:
        print('  api key   : found (' + ('Anthropic' if KEY.startswith('sk-ant-') else 'OpenAI-style') + ')')
        print('  model     : ' + (MODEL or ('claude-haiku-5-5' if KEY.startswith('sk-ant-') else 'gpt-4o-mini')))
    else:
        print('  api key   : NOT FOUND -- add LLM_API_KEY to .env, stories will use fallback lines')
    print('')
    print('  >>  open  http://localhost:8000/')
    print('')
    print('  (ctrl+c to stop)')
    print('')
    try:
        ThreadingHTTPServer(('127.0.0.1', 8000), Handler).serve_forever()
    except KeyboardInterrupt:
        print('\n  stopped.')
