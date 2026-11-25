# The Times of Travel

**Your year went places. Now it gets a front page.**

Every trip ends the same way: a camera roll full of proof, a group chat asking for photos, and a promise to make a post later. Later rarely arrives. The mountains, the wrong turns, the perfect snack, and the friend who took 46 versions of one picture disappear into a folder called *Recent*.

The goSTOPS Build Sprint asked a good question: **what would make someone want to share their travel story?**

Spotify Wrapped showed how an ordinary record of a year can become something personal enough to post. Zomato and Blinkit wandered into the brainstorming room as two side characters with their cheeky lines and bold, screenshot-worthy cards. We took that energy to the one archive almost everyone already has: their travel photos.

That is how **The Times of Travel** began. It gives your year on the road its own tiny newspaper edition, written for an audience of one and made to travel further.

## How your edition gets printed

You pick up to eight travel photos and name the places. The order of the photos becomes the order of your story. Then the travel desk gets to work:

1. **The front page** turns your photos into a colorful newspaper mosaic with a headline for the whole year.
2. **The inside pages** give each stop a photo print and a short, cheeky one-liner. AI writes the copy when available; a hand-written line library is ready when it is not.
3. **The last page** reveals your travel type as a cat meme card. You might be *The Altitude Attitude*, *The Repeat Offender*, or *The Map Tab Menace*. Places give relevant types better odds, and a little randomness keeps the reveal fun. Your next chapter then suggests a matching goSTOPS destination to explore.

There are ten travel types and seven cat images. Each final card shows **one** cat image, one title, and one line made for sharing.

## Made to leave the app

Every page is exported as a separate 1080 × 1920 PNG. The IG Story and WA Status buttons hand the **entire edition**, in page order, to the phone's native share sheet when it accepts multiple images. If a browser or destination app does not accept all the images, Save all PNG pages downloads them for selection from the gallery. Each published page becomes its own tap-through Story or Status frame. The final cat card also has its own share button. The user chooses the destination and confirms the post; a browser cannot do that on their behalf.

No account is required. Full-size photos stay on your device. Only small, 512 px thumbnails are sent to the AI provider for story copy; the app does not store your photos or edition.

## Run your own press

This is a small static site with vanilla JavaScript and CSS, a Vercel story endpoint, and a Python development server. There is no build step or package install.

From the project folder:

```bash
python dev-server.py
```

Open [http://localhost:8000/](http://localhost:8000/). For AI copy, copy `.env.example` to `.env` and set `LLM_API_KEY` to an Anthropic or OpenAI key. You can set `LLM_MODEL` to override the default. Without a key, the local app still works using its line library.

## Put it on the newsstand

Import this repository into Vercel with the **Other** framework preset. Leave the build command and output directory blank. Add `LLM_API_KEY` under **Settings → Environment Variables**, and optionally `LLM_MODEL`, then deploy.

Built for the **goSTOPS Build Sprint**. Zomato, Blinkit, and Spotify Wrapped are creative references, not collaborators or sponsors. This is not an official goSTOPS product.
