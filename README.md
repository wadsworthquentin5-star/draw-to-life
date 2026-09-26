# Draw to Life — scripted hackathon demo

[Open the live app on your iPad](https://wadsworthquentin5-star.github.io/draw-to-life/)

The current GitHub Pages app starts with a blank whiteboard. No problem image is preloaded. No AI key, recognition server, terminal, or laptop connection is needed.

## Present the demo

1. Open the live link in Safari. Tap **Add image** and choose the motorcycle problem screenshot from your device. Move or resize it, select its rim, then tap the black **Check** bubble.
2. Read the fixed overview and choose **Visualize this**. A simulated preparation sequence plays a preset animation of a separately drawn motorcycle and rider with rotating wheels. Your uploaded picture stays a reference on the whiteboard; it is not the moving object.
3. Choose **Yes, guide me**. Keep **Pen** selected while writing all strokes of `v = v₀ + at`. When finished, choose **Box step**, enclose the whole line, and tap **Check**. The first scripted response says correct. Tap **Pen** whenever you want to continue writing.
4. Write `v = 15 + 3 × 2`, box it, and check. The second response explains that acceleration must be **4 m/s², not 3 m/s²**.
5. Write `v = 15 + 4 × 2 = 23 m/s east`, box it, and check. The final response confirms the answer. Optional final position: **43 m east of the sign**; displacement: **38 m**.

**This is a simulated demo, not handwriting recognition.** Responses follow the three-stage script regardless of the selected ink. Inserted images stay in the browser. Restart and refresh clear the image and handwriting. Leave Pencil only off when using a finger.

## Current published files

The current app source is `docs/index.html`, `docs/demo.css`, `docs/demo.js`, `docs/demo-model.js`, `docs/demo-simulation.js`, and `docs/favicon.svg`, with `docs/.nojekyll`. GitHub Pages publishes **main → /docs**. The September 26, 2026 update adds the independent motorcycle animation, persistent Pen mode, pointer-interruption recovery, and native-selection prevention. The complete local development package passes 58 automated tests; repeated writing and explicit boxing were browser-tested locally. Physical iPad/Pencil testing is still needed.

Older files under `public/`, `scripts/`, `tests/`, the nested `draw-to-life/` folder, and the backend belong to earlier prototypes. They were retained, not synchronized by this Pages-only deployment. Do not rebuild the current site from those older scripts: they can restore the old interface. Edit the current `docs` files directly, or first synchronize the complete latest development package. Old unreferenced assets in `docs/` are not loaded by the new entry point.
