import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from '../cloud-worker.mjs';

const origin = 'https://demo.example';
const post = (path, data, token) => new Request(origin + path, {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Session-Token': token || '' },
  body: JSON.stringify(data),
});

test('hosted demo works without a key and never exposes source or settings', async () => {
  const worker = createWorker({ '/': { type: 'text/html', body: '<h1>Draw</h1>' } });
  assert.equal(await (await worker.fetch(new Request(origin))).text(), '<h1>Draw</h1>');
  const config = await (await worker.fetch(new Request(origin + '/api/config'))).json();
  assert.equal(config.hosted, true);
  assert.equal(config.aiEnabled, false);
  for (const path of ['/.env', '/server.mjs', '/cloud-worker.mjs']) assert.equal((await worker.fetch(new Request(origin + path))).status, 404);
  assert.equal((await worker.fetch(post('/api/recognize', {}))).status, 503);
});

test('a cloud API key without a strong access code does not enable paid endpoints', async () => {
  const worker = createWorker({});
  for (const pin of ['', '123456']) {
    const config = await (await worker.fetch(new Request(origin + '/api/config'), { GEMINI_API_KEY: 'test', CONTROL_PIN: pin })).json();
    assert.equal(config.aiEnabled, false);
  }
});

test('hosted session works across isolates and rejects invalid tokens and cross-origin calls', async () => {
  const env = { GEMINI_API_KEY: 'test-key', CONTROL_PIN: 'test-access-code-at-least-16' };
  const worker = createWorker({});
  const bad = await worker.fetch(post('/api/unlock', { pin: 'wrong' }), env);
  assert.equal(bad.status, 401);
  const { token } = await (await worker.fetch(post('/api/unlock', { pin: env.CONTROL_PIN }), env)).json();
  const otherWorker = createWorker({}, { recognizeImpl: async () => ({ text: 'v = 23 m/s', uncertain: false }) });
  const response = await otherWorker.fetch(post('/api/transcribe', { image: 'test' }, token), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).text, 'v = 23 m/s');
  assert.equal((await otherWorker.fetch(post('/api/transcribe', {}, token + 'x'), env)).status, 401);
  const foreign = new Request(origin + '/api/unlock', { method: 'POST', headers: { Origin: 'https://other.example' } });
  assert.equal((await worker.fetch(foreign, env)).status, 403);
});
