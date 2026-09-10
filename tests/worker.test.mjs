import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { TOKEN, packet, MockWebSocket, mockSocket, until, tick } from './helpers.mjs';

const bundle = readFileSync(new URL('../_worker.js', import.meta.url), 'utf8');
function runtime(options = {}) {
  const pairs = [];
  const sockets = [];
  const context = vm.createContext({
    TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView,
    URL, URLSearchParams, Request, Headers, ReadableStream, WritableStream,
    AbortController, atob, btoa, setTimeout, clearTimeout, queueMicrotask,
    console: { log() {}, error() {} },
    fetch: async () => { throw new Error('Unexpected external network request in regression test'); },
    Response: class extends Response {
      constructor(body, init) {
        if (init?.status === 101) return { status: 101, webSocket: init.webSocket };
        super(body, init);
      }
    },
    WebSocketPair: class {
      constructor() { this[0] = new MockWebSocket(); this[1] = new MockWebSocket(); pairs.push(this); }
    },
    连接(target) { const socket = mockSocket(); sockets.push({ target, socket }); return socket; },
    ...options
  });
  vm.runInContext(bundle.replace(/^import .* from 'cloudflare:sockets';\n/m, '').replace('export default {', 'globalThis.worker = {'), context);
  return { context, worker: context.worker, pairs, sockets };
}
const env = { u: TOKEN, epd: 'no', epi: 'no', egi: 'no', ena: 'yes' };
const request = path => new Request('https://review.invalid' + path);

test('missing UUID environment variable fails closed', async () => {
  const { worker, pairs, sockets } = runtime();
  const response = await worker.fetch(request('/'), {});
  assert.equal(response.status, 503);
  assert.equal(await response.text(), 'Missing or invalid U environment variable');
  assert.equal(pairs.length, 0);
  assert.equal(sockets.length, 0);
});

test('generated Pages worker serves homepage and exact UUID routes', async () => {
  const { worker } = runtime();
  assert.equal((await worker.fetch(request('/'), env)).status, 200);
  const page = await worker.fetch(request('/' + TOKEN), env);
  assert.match(page.headers.get('Content-Type'), /text\/html/);
  const sub = await worker.fetch(request('/' + TOKEN + '/sub?target=clash'), env);
  assert.equal(sub.status, 200);
  assert.match(sub.headers.get('Content-Type'), /yaml/);
  for (const path of ['/' + TOKEN + '/extra', '/prefix/' + TOKEN, '/' + TOKEN + '-suffix/sub']) assert.equal((await worker.fetch(request(path), env)).status, 404);
});

test('management page loads the form without rendering a raw configuration summary', async () => {
  const { worker } = runtime();
  const kv = { get: async () => null, put: async () => {} };
  const page = await worker.fetch(request('/' + TOKEN), { ...env, C: kv });
  const html = await page.text();
  assert.doesNotMatch(html, /id=["']currentConfig["']/);
  assert.doesNotMatch(html, /当前配置:\\n/);
  assert.doesNotMatch(html, /当前路径:/);
  assert.doesNotMatch(html, /访问地址:/);
  assert.match(html, /id="safeConfigSummary"/);
  assert.match(html, /id="safeConfigSummaryContent"/);
  assert.match(html, /应用配置到界面\(配置\)/);
});

test('multi-segment custom path and KV path override work', async () => {
  const { worker } = runtime();
  const kv = { get: async key => key === 'c' ? JSON.stringify({ d: 'new/path' }) : 'v1' };
  const configured = { ...env, d: 'old/path', C: kv };
  assert.equal((await worker.fetch(request('/new/path'), configured)).status, 200);
  assert.equal((await worker.fetch(request('/new/path/sub'), configured)).status, 200);
  assert.equal((await worker.fetch(request('/old/path'), configured)).status, 404);
  assert.equal((await worker.fetch(request('/' + TOKEN + '/sub'), configured)).status, 404);
  const plain = runtime();
  assert.equal((await plain.worker.fetch(request('/foo/bar/'), { ...env, d: 'foo/bar' })).status, 200);
});

test('trailing and repeated slashes do not break the KV configuration endpoint', async () => {
  const { worker } = runtime();
  const kv = { get: async () => null, put: async () => {} };
  const configured = { ...env, C: kv };
  const page = await worker.fetch(request('/' + TOKEN + '/'), configured);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes('function 获取配置接口网址()'));
  assert.ok(!html.includes("window.location.pathname + '/api/config'"));
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  assert.ok(scripts.length > 0);
  for (const script of scripts) assert.doesNotThrow(() => new Function(script));
  for (const path of [
    '/' + TOKEN + '/api/config',
    '/' + TOKEN + '//api/config',
    '//' + TOKEN + '///api/config/'
  ]) {
    const response = await worker.fetch(request(path), configured);
    assert.equal(response.status, 200, path);
    assert.equal((await response.json()).kvEnabled, true);
  }
});

test('KV write failure returns failure and does not mutate saved memory config', async () => {
  const { worker, context } = runtime();
  const kv = { get: async key => key === 'c' ? JSON.stringify({ wk: 'JP' }) : 'v1', put: async () => { throw new Error('simulated quota error'); } };
  const response = await worker.fetch(new Request('https://review.invalid/' + TOKEN + '/api/config', { method: 'POST', body: JSON.stringify({ wk: 'SG' }) }), { ...env, C: kv });
  assert.equal(response.status, 500);
  assert.equal((await response.json()).success, false);
  assert.equal(vm.runInContext('键值配置.wk', context), 'JP');
});

test('KV successful save preserves c schema and returns actual saved config', async () => {
  const { worker } = runtime();
  const storage = new Map();
  const kv = { get: async key => storage.get(key) || null, put: async (key, value) => storage.set(key, value) };
  const response = await worker.fetch(new Request('https://review.invalid/' + TOKEN + '/api/config', { method: 'POST', body: JSON.stringify({ wk: 'SG' }) }), { ...env, C: kv });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).config.wk, 'SG');
  assert.equal(JSON.parse(storage.get('c')).wk, 'SG');
  assert.ok(storage.get('c_ver'));
});

test('ECH resolver environment aliases reach generated subscription', async () => {
  const { worker } = runtime();
  const response = await worker.fetch(request('/' + TOKEN + '/sub'), { ...env, ech: 'yes', CUSTOM_DNS: 'https://dns.example/query', CUSTOM_ECH_DOMAIN: 'ech.example' });
  const links = atob(await response.text());
  const node = new URL(links.split('\n')[0]);
  assert.equal(node.searchParams.get('ech'), 'ech.example+https://dns.example/query');
});

test('custom domain port survives subscription conversion', async () => {
  const { worker } = runtime();
  const response = await worker.fetch(request('/' + TOKEN + '/sub'), { ...env, ena: 'no', epd: 'yes', yx: 'node.example:8443', dkby: 'yes' });
  const links = atob(await response.text());
  assert.match(links, /@node\.example:8443\?/);
  assert.doesNotMatch(links, /@node\.example:443\?/);
});

test('empty custom address config clears prior isolate list', async () => {
  const { worker, context } = runtime();
  await worker.fetch(request('/'), { ...env, yx: '192.0.2.1' });
  await worker.fetch(request('/'), env);
  assert.equal(vm.runInContext('自定义优选地址列表.length', context), 0);
});

test('upgrade uses new session with captured per-connection UUID and cleanup', async () => {
  const { worker, pairs, sockets } = runtime();
  const response = await worker.fetch(new Request('https://review.invalid/', { headers: { Upgrade: 'WebSocket' } }), env);
  assert.equal(response.status, 101);
  await worker.fetch(request('/'), { ...env, u: '22222222-2222-4222-8222-222222222222' });
  const socket = pairs[0][1];
  socket.message(packet([1]));
  await until(() => sockets[0]?.socket.writes.length);
  assert.equal(socket.readyState, 1);
  socket.peerClose(); await tick();
  assert.ok(sockets[0].socket.closeCalls);
});

test('strict proxy mode rejects invalid configuration before WebSocket upgrade', async () => {
  const { worker, sockets, pairs } = runtime();
  const response = await worker.fetch(new Request('https://review.invalid/', { headers: { Upgrade: 'websocket' } }), { ...env, qj: 'only', s: 'invalid' });
  assert.equal(response.status, 503);
  assert.equal(sockets.length, 0);
  assert.equal(pairs.length, 0);
});
