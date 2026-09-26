import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const mime = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', svg: 'image/svg+xml' };
const names = ['index.html', 'style.css', 'app.js', 'ink.js', 'simulation.js', 'physics.js', 'checker.js', 'runtime.js', 'favicon.svg'];
const assets = {};
for (const name of names) {
  assets[`/${name}`] = { body: await readFile(new URL(`public/${name}`, root), 'utf8'), type: mime[name.split('.').at(-1)] };
}
assets['/'] = assets['/index.html'];
await mkdir(new URL('dist/server/', root), { recursive: true });
const worker = await readFile(new URL('cloud-worker.mjs', root), 'utf8');
await writeFile(new URL('dist/server/index.js', root), `${worker}\nexport default createWorker(${JSON.stringify(assets)});\n`);
await writeFile(new URL('dist/server/ai.mjs', root), await readFile(new URL('ai.mjs', root)));
console.log(`Built hosted app with ${names.length} explicit public assets.`);
