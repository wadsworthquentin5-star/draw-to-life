import { recognize } from './ai.mjs';

const encoder = new TextEncoder();
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function sign(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function validToken(token, secret) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[1])) return false;
  const expiry = Number(parts[0]);
  if (expiry <= Date.now() || expiry > Date.now() + 25 * 60 * 60 * 1000) return false;
  const expected = await sign(secret, parts[0]);
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ parts[1].charCodeAt(i);
  return mismatch === 0;
}

async function readJson(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    throw Object.assign(new Error('JSON required.'), { status: 415 });
  }
  if (Number(request.headers.get('Content-Length')) > 3200000) {
    throw Object.assign(new Error('Drawing too large.'), { status: 413 });
  }
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(new Error('Request body required.'), { status: 400 });
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 3200000) {
      await reader.cancel();
      throw Object.assign(new Error('Drawing too large.'), { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch {
    throw Object.assign(new Error('Invalid JSON.'), { status: 400 });
  }
}

                                                                                         
export function createWorker(assets, { recognizeImpl = recognize } = {}) {
                                                                           
  let requests = 0;
  let active = 0;
  let unlockAttempts = 0;
  let unlockWindow = Date.now();
  return {
    async fetch(request, env = {}) {
      const url = new URL(request.url);
      const secret = env.CONTROL_PIN || '';
                                                                             
      const aiEnabled = Boolean(env.GEMINI_API_KEY) && secret.length >= 16;
      const limit = Number(env.MAX_AI_REQUESTS || 200);
      try {
        if (request.method === 'GET' && url.pathname === '/api/config') {
          return json({
            aiEnabled, pinRequired: aiEnabled, token: null,
            requestsLeft: Math.max(0, limit - requests), hosted: true,
          });
        }
        if ((request.method === 'GET' || request.method === 'HEAD') && Object.hasOwn(assets, url.pathname)) {
          const asset = assets[url.pathname];
          return new Response(request.method === 'HEAD' ? null : asset.body, {
            headers: { ...securityHeaders, 'Content-Type': asset.type },
          });
        }
        if (request.method !== 'POST' || !['/api/unlock', '/api/recognize', '/api/transcribe'].includes(url.pathname)) {
          return json({ error: 'Not found' }, 404);
        }
        if (request.headers.get('Origin') !== url.origin) {
          return json({ error: 'Open this action from the app’s own page.' }, 403);
        }
        if (!aiEnabled) {
          return json({ error: 'Handwriting recognition is not connected. The demo, typed labels, and equation checking are available.' }, 503);
        }
        const data = await readJson(request);
        if (url.pathname === '/api/unlock') {
          if (Date.now() - unlockWindow >= 60000) { unlockWindow = Date.now(); unlockAttempts = 0; }
          if (++unlockAttempts > 10) return json({ error: 'Too many access-code attempts. Wait a minute and try again.' }, 429);
          if (data.pin !== secret) return json({ error: 'That access code does not match.' }, 401);
          const expiry = String(Date.now() + 24 * 60 * 60 * 1000);
          return json({ token: `${expiry}.${await sign(secret, expiry)}` });
        }
        if (!(await validToken(request.headers.get('X-Session-Token'), secret))) {
          return json({ error: 'Unlock handwriting with the private access code.' }, 401);
        }
        if (!Number.isInteger(limit) || limit < 1 || requests >= limit) {
          return json({ error: 'The recognition request limit has been reached. Typed entry still works.' }, 429);
        }
        if (active >= 2) return json({ error: 'Recognition is busy. Try again after the current request finishes.' }, 429);
        active++;
        requests++;
        try {
          const result = await recognizeImpl({
            image: data.image,
            kind: url.pathname === '/api/transcribe' ? 'step' : 'scene',
            key: env.GEMINI_API_KEY,
            model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
          });
          return json(result);
        } finally { active--; }
      } catch (error) {
        return json({ error: error.name === 'TimeoutError' ? 'Recognition timed out. Try again or use typed entry.' : error.message }, error.status || 502);
      }
    },
  };
}
