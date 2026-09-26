# Verification

## Automated

`node --test` passes 21 tests on Node 24.19.0.

Covered:

- The supplied problem: x(0)=5 m, x(1)=22 m, x(2)=43 m, v(2)=23 m/s, dx=38 m.
- Edited inputs, zero acceleration, negative direction, and turnaround bounds.
- Missing/non-finite quantities and invalid time or unknown selections.
- Typed labels, Unicode symbols, initial-time versus elapsed-time labels, unit conversion, and conflicts.
- Symbolic equations, rearrangements, substitutions, chained equality, correct and incorrect units, missing final units, and displacement-versus-position feedback.
- Rejection of executable text, undefined arithmetic, and unsupported notation without `eval`.
- Explicit HTTP file routes, absence of `.env`/server source exposure, JSON handling, PIN/token checks, and cross-origin rejection.
- Mocked image recognition requests, response schemas, invalid output, missing keys, provider errors, uncertain transcription, and the process request limit.
- Optional cloud adapter: fail-closed recognition configuration, signed-session validation, and same-origin checks.
- GitHub Pages mode never requests a backend; local Node mode still loads its configuration.
- Generated `docs/` matches the source and contains only browser assets; imports and links resolve under a repository subpath.

## Browser checks performed

- GitHub Pages build served locally with no API routes at `/draw-to-life/`: displayed Browser mode, loaded the demo, animated to 43 m and 23 m/s, and gave correct/incorrect typed-step feedback. Browser console reported no warnings or errors.
- At a 1024 × 768 viewport the static build's document width was 1024; drawing, input, and feedback bounds stayed within the viewport. This checks responsive layout, not physical iPad Safari behavior.
- Opened the real Node server in the Codex in-app browser.
- Loaded the motorcycle drawing, reviewed all four recognized typed values, and confirmed the model.
- Ran the animation and moved the timeline to its end: the page showed 2.00 s, 43 m, 23 m/s, and 4 m/s².
- Entered `v = 23 m/s`: received correct feedback.
- Entered `x = 38 m`: received guidance to include initial position.
- Drew two freehand strokes and observed the black, upward-pointing Check bubble appear after the writing pause.
- Opened the handwritten-step dialog in offline mode, verified it requested transcription rather than pretending to recognize ink, and checked a typed position calculation from that dialog.
- Exercised an iPad-sized 1024 × 768 layout; the document width matched the viewport without horizontal overflow. A smaller browser panel also exposed all primary tools through the toolbar.

- Recorded the drawing animation into a browser video. The video element reported 900 × 420 dimensions, a duration of 7.972 seconds, readyState 4, and no media error. A preview and explicit Download video link appeared.
- The in-app browser's automated download capture timed out, so transfer of the video to disk remains unverified. The playable preview is verified; use the explicit link in a regular browser to save a file.

## Not verified

- A live Gemini request: no API key was provided. The provider adapter was exercised with mocks, not paid calls.
- Physical Apple Pencil pressure/palm behavior, iPad Safari, the Pi, venue Wi-Fi, or display mirroring.
- Arbitrary handwriting accuracy, arbitrary physics, prose reasoning, or improved learning outcomes.
- A live GitHub Pages deployment: no repository URL or authenticated deployment access was supplied. The static build is ready; GitHub Pages must be enabled on the uploaded repository.
- Multi-user sessions and synchronized displays are outside this version's scope.
