import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { loadRuntime } from '../public/runtime.js';
import { pagesAssets, pagesFiles } from '../scripts/build-pages.mjs';

test('Pages startup never calls a backend, even when hosted on a custom domain', async () => {
  const config = await loadRuntime('static', () => { throw new Error('Unexpected network request'); });
  assert.deepEqual(config, { staticMode: true, aiEnabled: false, pinRequired: false, token: null });
});

test('Node mode still loads server configuration and handles failures honestly', async () => {
  const config = await loadRuntime(undefined, async path => {
    assert.equal(path, './api/config');
    return new Response(JSON.stringify({ aiEnabled: true, pinRequired: true, token: null }));
  });
  assert.equal(config.aiEnabled, true);
  assert.equal(config.staticMode, false);
  await assert.rejects(loadRuntime(undefined, async () => new Response('', { status: 500 })), /Server unavailable/);
});

test('committed Pages files are current and contain only allowlisted browser assets', async () => {
  const expected = await pagesAssets();
  assert.deepEqual((await readdir(new URL('../docs/', import.meta.url))).sort(), Object.keys(expected).sort());
  for (const [name, body] of Object.entries(expected)) {
    assert.equal(await readFile(new URL(`../docs/${name}`, import.meta.url), 'utf8'), body, `${name} is stale: run node scripts/build-pages.mjs`);
  }
  assert.match(expected['index.html'], /name="draw-to-life-mode" content="static"/);
  assert.match(expected['index.html'], /Handwriting recognition is unavailable/);
  assert.doesNotMatch(expected['index.html'], /Connecting…|API key on the server|Did I read that right/);
});

test('Pages assets and module imports resolve under a GitHub repository subpath', async () => {
  const assets = await pagesAssets();
  const base = new URL('https://example.github.io/draw-to-life/');
  const refs = [...assets['index.html'].matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]);
  for (const [name, body] of Object.entries(assets)) {
    if (name.endsWith('.js')) for (const m of body.matchAll(/from\s+['"]([^'"]+)['"]/g)) refs.push(m[1]);
  }
  for (const ref of refs) {
    const url = new URL(ref, base);
    assert.ok(url.href.startsWith(base.href), `Escapes repository path: ${ref}`);
    const filename = url.pathname.slice(base.pathname.length) || 'index.html';
    assert.ok(pagesFiles.includes(filename), `Missing asset: ${filename}`);
  }
});
