import test from 'node:test';
import assert from 'node:assert/strict';
import { GrainSession, createDownlinkGrain, createGrainKernel, grainRoutes } from '../src/graintcp.js';
import { TOKEN, tick, until, deferred, packet, MockWebSocket, mockSocket } from './helpers.mjs';

function setup(t, factory, options = {}) {
  const ws = new MockWebSocket();
  const calls = [];
  const session = new GrainSession(ws, {
    token: TOKEN,
    directFirst: true,
    concurrentDials: 4,
    connect(target, settings) {
      const socket = factory(target, calls.length);
      calls.push({ target, settings, socket });
      return socket;
    },
    ...options
  });
  t.after(async () => { session.close(); await session.done; await tick(); });
  return { ws, session, calls };
}

test('grain kernel combines queued upload chunks up to its cap', () => {
  const kernel = createGrainKernel(4);
  kernel.sow(new Uint8Array([1, 2]));
  kernel.sow(new Uint8Array([3]));
  kernel.sow(new Uint8Array([4, 5]));
  assert.deepEqual([...kernel.pack()[0]], [1, 2, 3]);
  assert.deepEqual([...kernel.pack()[0]], [4, 5]);
  assert.equal(kernel.empty(), true);
});

test('download grain combines small chunks before WebSocket send', async () => {
  const ws = new MockWebSocket();
  const grain = createDownlinkGrain(ws, { downlinkPack: 8, downlinkTail: 1, downlinkRounds: 0 });
  grain.send(new Uint8Array([1, 2, 3]));
  grain.send(new Uint8Array([4, 5, 6]));
  await until(() => ws.sent.length === 1);
  assert.deepEqual(ws.sent[0], [1, 2, 3, 4, 5, 6]);
});

test('four concurrent dials keep the first winner and close the losers', async t => {
  const { ws, calls } = setup(t, () => mockSocket());
  ws.message(packet([1, 2]));
  await until(() => calls.length === 4);
  await until(() => calls.some(call => call.socket.writes.length));
  assert.equal(calls.filter(call => call.socket.writes.length).length, 1);
  assert.equal(calls.filter(call => call.socket.closeCalls).length, 3);
});

test('messages arriving during dial are opportunistically bundled with first payload', async t => {
  const opened = deferred();
  const { ws, calls } = setup(t, () => mockSocket({ opened: opened.promise }));
  ws.message(packet([1]));
  ws.message(new Uint8Array([2]));
  ws.message(new Uint8Array([3]));
  await until(() => calls.length === 4);
  opened.resolve();
  await until(() => calls.some(call => call.socket.writes.length));
  const winner = calls.find(call => call.socket.writes.length);
  assert.deepEqual(winner.socket.writes[0], [1, 2, 3]);
});

test('fragmented VLESS header is accumulated before GrainTCP dial', async t => {
  const input = packet([7, 8], { type: 2, host: 'example.test' });
  const { ws, calls } = setup(t, () => mockSocket(), { concurrentDials: 1 });
  for (let index = 0; index < input.length; index++) ws.message(input.subarray(index, index + 1));
  await until(() => calls[0]?.socket.writes.length);
  assert.equal(calls[0].target.hostname, 'example.test');
  assert.deepEqual(calls[0].socket.writes[0], [7, 8]);
});

test('large downstream BYOB chunk is sent directly after response header', async t => {
  const { ws, calls } = setup(t, () => mockSocket(), { concurrentDials: 1 });
  ws.message(packet([1]));
  await until(() => calls[0]?.socket.writes.length);
  const large = new Uint8Array(40 * 1024).fill(7);
  calls[0].socket.data(large);
  await until(() => ws.sent.length === 2);
  assert.deepEqual(ws.sent[0], [0, 0]);
  assert.equal(ws.sent[1].length, large.length);
});

test('small downstream chunks are aggregated and flushed on EOF', async t => {
  const { ws, calls, session } = setup(t, () => mockSocket(), { concurrentDials: 1 });
  ws.message(packet([1]));
  await until(() => calls[0]?.socket.writes.length);
  calls[0].socket.data([2, 3]);
  calls[0].socket.data([4, 5]);
  calls[0].socket.eof();
  await session.done;
  assert.deepEqual(ws.sent, [[0, 0], [2, 3, 4, 5]]);
});

test('proxy-only route never creates a direct fallback', () => {
  const destination = { hostname: 'target.test', port: 443 };
  assert.throws(() => grainRoutes(destination, { proxyOnly: true }), /valid proxy/);
  const proxy = { kind: 'p5', hostname: 'proxy.test', socksPort: 1080 };
  assert.deepEqual(grainRoutes(destination, { proxyOnly: true, proxy }), [{ destination, proxy }]);
});

test('SOCKS negotiation runs after winning the connection race', async t => {
  const { ws, calls } = setup(t, () => mockSocket({ onWrite(_, socket) {
    if (socket.writes.length === 1) socket.data([5, 0]);
    if (socket.writes.length === 2) socket.data([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
  } }), {
    concurrentDials: 1,
    proxyOnly: true,
    proxy: { kind: 'p5', hostname: 'proxy.test', socksPort: 1080 }
  });
  ws.message(packet([9]));
  await until(() => calls[0]?.socket.writes.length === 3);
  assert.equal(calls[0].target.hostname, 'proxy.test');
  assert.deepEqual(calls[0].socket.writes[2], [9]);
});

test('HTTPS CONNECT preserves secure transport and residual response bytes', async t => {
  const { ws, calls } = setup(t, () => mockSocket({ onWrite(_, socket) {
    if (socket.writes.length === 1) socket.data(new Uint8Array([
      ...new TextEncoder().encode('HTTP/1.1 200 Connection established\r\n\r\n'), 55
    ]));
  } }), {
    concurrentDials: 1,
    proxyOnly: true,
    proxy: { kind: 'pts', hostname: 'proxy.test', socksPort: 443 }
  });
  ws.message(packet([1]));
  await until(() => ws.sent.length === 2);
  assert.equal(calls[0].settings.secureTransport, 'on');
  assert.deepEqual(ws.sent[1], [55]);
});

test('client close terminates the winner and all pending dials', async t => {
  const opened = deferred();
  const { ws, calls, session } = setup(t, () => mockSocket({ opened: opened.promise }));
  ws.message(packet([1]));
  await until(() => calls.length === 4);
  ws.peerClose();
  await session.done;
  assert.ok(calls.every(call => call.socket.closeCalls));
  opened.resolve();
});
