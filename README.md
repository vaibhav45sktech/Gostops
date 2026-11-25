# The Times of Travel

Upload a few travel photos, get a newspaper-style story to post.
Built for the goSTOPS Build Sprint.

## Run locally

From this project folder:

    python dev-server.py

Then open <http://localhost:8000/>. The script serves the site *and* runs `/api/story`
locally, so the AI copy works without deploying. It reads `LLM_API_KEY` from `.env`.

## Deploy to Vercel

1. Create an empty GitHub repo, then:

       git remote add origin https://github.com/<you>/<repo>.git
       git branch -M main
       git push -u origin main

2. In Vercel: **Add New → Project → import that repo**.
   Framework preset: **Other**. No build command. Output directory: leave blank.
3. **Settings → Environment Variables** → add `LLM_API_KEY` (your Anthropic or OpenAI key).
   Optionally `LLM_MODEL` to override the default.
4. Deploy. Any later `git push` redeploys automatically.

## How it works

- `index.html` / `styles.css` / `app.js` — the four screens and the flow
- `lib/photos.js` — reads photos, downscales to 1600px on the device
- `lib/cities.js` — India-first autocomplete list
- `lib/lines.js` — the hardcoded line library (hook + payoff pairs)
- `lib/ai.js` — sends 512px thumbnails to `/api/story`, validates the reply
- `lib/mosaic.js` — the front-page photo mosaic
- `lib/story.js` — the full-screen story viewer and share controls
- `lib/personas.js` — ten playful travel types, weighted by places and varied on each reveal
- `assets/cats/` — the seven cat memes used on the final card
- `lib/export.js` — redraws every page onto a 1080x1920 canvas
- `lib/share.js` — Instagram / WhatsApp / X / LinkedIn targets
- `api/story.js` — the serverless function (auto-detects Anthropic vs OpenAI key)
- `dev-server.py` — local stand-in for that function, stdlib only

Full-size photos never leave the device. Only 512px thumbnails are sent to the
model, and nothing is stored anywhere.

## Phases

- [x] 0 Scaffold
- [x] 1 Core journey
- [x] 2 AI copy, with the line library as fallback
- [x] 3 Canvas export + share
- [x] 4 Deploy config
- [ ] 5 Distribution + submission
