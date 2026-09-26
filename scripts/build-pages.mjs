import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Explicit allowlist: never copy .env, server code, or hosting configuration.
export const pagesFiles = ['index.html', 'style.css', 'app.js', 'ink.js', 'simulation.js', 'physics.js', 'checker.js', 'runtime.js', 'favicon.svg'];
export async function pagesAssets() {
  const assets = {};
  for (const name of pagesFiles) assets[name] = await readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');
  assets['index.html'] = assets['index.html']
    .replace('<head>', '<head><meta name="draw-to-life-mode" content="static">')
    .replace('Connecting…', 'Browser mode')
    .replace('Did I read that right?', 'Type the step you wrote.')
    .replace('Recognition can suggest this box too.', 'Keep the road and labels outside the box.')
    .replace('Handwriting recognition needs a Gemini API key on the server. The demo, typed labels, manual values, and equation checking work offline.', 'GitHub Pages version: draw freely, then use typed labels or enter values. Handwriting recognition is unavailable. Tap Check and type your handwritten equation to check its math. No server or API key is needed.')
    .replace('Only the sketch or the new handwritten step is sent for recognition when you request it. Nothing is sent while you draw.', 'Your sketch and equations stay in this browser. This version does not send drawings to an AI service.');
  assets['.nojekyll'] = '';
  return assets;
}
export async function buildPages() {
  const destination = new URL('../docs/', import.meta.url);
  await mkdir(destination, { recursive: true });
  for (const [name, body] of Object.entries(await pagesAssets())) await writeFile(new URL(name, destination), body);
  console.log('Built docs/ for GitHub Pages. Publish main → /docs. No server or secrets required.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPages();
