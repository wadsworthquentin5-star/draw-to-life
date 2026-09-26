# Draw to Life

A hackathon prototype for drawing a physics problem, animating the actual sketch, and checking the student's work one equation at a time.

The app opens on a white drawing surface. Its black **Check** prompt has the rounded rectangle and upward pointer from the supplied reference. It appears one second after the student stops writing on the work page.

## Run it on your iPad with GitHub Pages

The ready-built `docs/` folder runs entirely in Safari: drawing, typed labels/manual values, animation, video preview (when supported), and typed equation checking. **No laptop server, terminal, API key, or campus Wi-Fi setup is needed.** Handwriting recognition is not available in this version; the Check bubble asks you to type your handwritten step.

1. Unzip the download and open the `draw-to-life` folder.
2. Upload its contents to your GitHub repository and commit. The repository's top level must contain `docs/index.html` — do not upload the ZIP or nest everything inside another `draw-to-life` folder. If updating an older upload, replace its matching files.
3. Open repository **Settings → Pages**. Choose **Deploy from a branch**, select **main**, select **/docs**, then **Save**. If your uploaded files are on a differently named default branch, select that branch.
4. Wait for the Pages deployment to finish. The same Pages settings screen provides your published **Visit site** link. Open that link in Safari on the iPad, then tap **Try the demo → Bring to life → Animate my drawing**.

Use a public repository for free GitHub Pages, or a plan that supports Pages for private repositories. The published site is public; do not put private settings or API keys in the upload. GitHub's [publishing-source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) explains these settings.

If you see the repository file list, that is the code page, not the app: use **Visit site** under Pages. If you see a 404, check that deployment has finished and `docs/index.html` exists on the selected branch. Never open the ZIP or an `index.html` file directly on the iPad.

The initial page needs Internet access to load. Sketches are kept in memory; refreshing clears them. Leave **Pencil only** off to draw with your finger.

For developers: edit `public/`, run `node scripts/build-pages.mjs`, and commit the updated `docs/` too. Tests reject stale generated files. All asset paths are relative, so project URLs and custom domains work. Only the explicit browser asset allowlist is copied; the Node backend and private settings are not published. The existing GitHub Actions test workflow is separate from the built-in Pages deployment.

## Run locally (optional, for server-based handwriting recognition)

Install **Node.js 24 or newer**. Open a terminal inside this folder and run:

```sh
node --env-file-if-exists=.env server.mjs
```

Open **http://localhost:3000**. Keep the terminal running. No `npm install`, build step, framework, database, or paid hosting is required. `npm start` also works when npm is installed.

To run the checks:

```sh
node --test
```

## The demonstration

1. Choose **Try the demo**. This loads a clearly labeled example of a rider east of a city-limit sign. You can also draw your own scene with the pen, line, arrow, and circle tools.
2. Label the knowns: `x0 = 5 m`, `v0 = 15 m/s`, `a = 4 m/s^2`, and `t = 2 s`. Add `v = ?` and `x = ?`. The label tool accepts Unicode subscripts and superscripts too. Put each assignment in a separate label. An initial `t = 0 s` label is allowed.
3. Use **Select moving object** (the dotted-box icon) to enclose the whole rider, excluding the road, arrow annotations, and labels. The supplied example is already selected. Live recognition can suggest an object box.
4. Choose **Bring to life**, review the numbers and requested unknowns, and press **Animate my drawing**.
5. Watch, pause, replay, or scrub the short animation. The original moving strokes translate according to the constant-acceleration equations; the rest of the sketch stays fixed. Equal-time dots help explain acceleration. This is a deterministic animation, not a generated cinematic video.
6. Choose **Work it out**. Write one complete equation, pause for the **Check** bubble, and press it. Review the handwriting transcription before checking. Each equation gets specific feedback. Write a corrected step on a new line if a prior step was wrong.
7. You can type steps in the lower-left box at any time. Typed step checking works without AI.
8. **Save video** records one full animation. When it finishes, preview the clip and select **Download video**. Output is WebM or MP4 according to the browser's available encoder. Keep the page in the foreground while recording. Some embedded browsers do not support downloading; open the app in Chrome or Edge if needed.

The four equation cards are:

```text
v = v0 + a*t
x = x0 + v0*t + (1/2)*a*t^2
v^2 = v0^2 + 2*a*(x - x0)
x - x0 = (v0 + v)*t/2
```

For the supplied problem, at 2 s:

```text
v = 15 + 4*2 = 23 m/s east
x = 5 + 15*2 + 0.5*4*2^2 = 43 m east of the sign
dx = x - x0 = 38 m
```

The checker accepts equations, substitutions, arithmetic, rearrangements, and final answers with units. It catches `x = 38 m` as a displacement-versus-position mistake. A number without its final unit gets “Almost there,” not a completed-answer confirmation. All links in an equality chain are checked. Use `*`, `/`, `^2`, and parentheses for unambiguous typed math; implicit multiplication such as `2a` and `2(3+4)` is supported.

## Enable handwriting recognition

The offline example and typed labels are **not handwriting recognition**. To read fresh freehand labels and steps, configure the optional Gemini integration, following the provider choice in your build guide.

1. Create an API key in [Google AI Studio](https://aistudio.google.com/).
2. Copy `.env.example` to `.env`. Keep `.env` private; it is ignored by Git.
3. Set these values in `.env`:

```dotenv
GEMINI_API_KEY=your_private_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

4. Restart the Node server. The app will show **Handwriting ready**. Confirm the selected model is available to your account. API access and billing are separate from consumer chat subscriptions.

The browser sends an image only after an explicit recognition action. The server sends that PNG to Gemini and receives structured JSON. It never evaluates AI-generated code. A sketch reading becomes an editable form; a work reading becomes an editable transcription. Missing or ambiguous quantities stay unresolved. The AI does **not** determine correctness: the app's physics and arithmetic code does.

There is a 25-second provider timeout, no automatic retry, at most two concurrent requests, and a default limit of 200 AI requests per server process. Restarting resets that count; it is not a dollar spending limit. Configure billing limits in your provider account.

Provider references: [image input](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding), [structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

## iPad or Raspberry Pi

Run this same Node project on a laptop or Pi. For a tablet on your **private local network**, configure:

```dotenv
HOST=0.0.0.0
CONTROL_PIN=choose-a-private-pin
PORT=3000
```

The server prints possible LAN addresses. Open the host's address, such as `http://192.168.1.42:3000`, in iPad Safari. `localhost` on the iPad points to the iPad, not the server. Unlock paid recognition using the server PIN by tapping the status pill. Use **Pencil only** to ignore finger events while drawing with Pencil. Mouse and finger drawing work with that option off.

This version gives each browser its own in-memory sketch. It does not yet synchronize a separate HDMI viewer or multiple people's edits. You can mirror the tablet or demonstrate on one display. Physical iPad/Pencil and Raspberry Pi behavior still needs testing on your equipment.

## Put it on GitHub

This directory is the repository root. It includes `.gitignore`, `.env.example`, source, tests, and a GitHub Actions workflow that runs `node --test` on pushes and pull requests.

Create an empty GitHub repository, then run from this directory (replace the URL with your repository):

```sh
git init -b main
git add .
git commit -m "Build Draw to Life motion lab"
git remote add origin https://github.com/YOUR-ACCOUNT/draw-to-life.git
git push -u origin main
```

If Git is already initialized, skip `git init`. If a remote already exists, use its actual URL. No repository has been published by this build. Do not commit `.env` or API keys. The included key file is a blank example only.

**GitHub Pages runs the included `docs/` browser version, not the Node backend.** Follow the iPad instructions above to publish it. The optional Node server is intended for localhost or a trusted private LAN; it is only needed for server-based recognition.

## Code map

| File | Purpose |
| --- | --- |
| `public/index.html` | White canvas, dialogs, toolbars, feedback, and video controls |
| `public/style.css` | Layout, responsive sizes, and the Check-bubble appearance |
| `public/ink.js` | Pointer drawing, shapes, labels, object selection, undo/redo, PNG capture |
| `public/app.js` | Draw → review → animate → check flow |
| `public/simulation.js` | Original-stroke animation, timeline, and video recording |
| `public/physics.js` | SI-unit kinematics, model validation, typed-label parsing |
| `public/checker.js` | Safe expression parser, dimensional checks, step feedback |
| `server.mjs` | Explicit file routes, API token/PIN checks, size/request limits |
| `ai.mjs` | Image-to-model and image-to-text recognition via Gemini |
| `docs/` | Ready-to-upload GitHub Pages version; publish this folder |
| `scripts/build-pages.mjs` | Generates safe static browser assets from `public/` |
| `public/runtime.js` | Selects static mode without contacting a backend |
| `tests/` | Known-answer physics, checking, provider mocks, and HTTP tests |

## Boundaries

- The supported lesson is **one object moving horizontally with constant acceleration**. Known inputs are `x0`, `v0`, `a`, and elapsed `t`; requested outputs are `v`, `x`, and/or `dx`. Negative velocity and acceleration are supported. Projectile motion, forces, collisions, and solving for unknown time/acceleration are not implemented.
- Selecting the moving object is a box selection of whole strokes. Keep the object disconnected from the road. Box selection remains the correction path when AI object detection is inaccurate.
- The checker validates supported arithmetic and equation consistency for the confirmed model. It is not a general proof checker or a grader of prose explanations. Unsupported notation gets a review prompt instead of a guessed grade. Write either consistent units on every substituted term or purely numerical arithmetic followed by a final unit.
- Pages and feedback are held in browser memory. Refreshing clears them. Confirming a new model clears the work page. Video output is a browser download, not server storage.
- Live Gemini, real Pencil/palm rejection, Pi hardware, and classroom outcomes were not validated here. See `VERIFICATION.md` for the precise tested scope.

The attached lever guide informed the lightweight server and review-first architecture. The user-requested motorcycle lesson and blank drawing interface determine this implementation's scope.
