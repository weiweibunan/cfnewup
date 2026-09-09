import test from 'node:test';
import assert from 'node:assert/strict';
import { TunnelSession, tunnelRoutes } from '../src/transport.js';
import { TOKEN, tick, until, deferred, packet, MockWebSocket, mockSocket } from './helpers.mjs';

function setup(t, factory, options = {}) {
  const ws = new MockWebSocket();
  const calls = [];
  const session = new TunnelSession(ws, {
    token: TOKEN, directFirst: true, firstByteTimeout: 1000,
    connect(target, settings) { const socket = factory(target, calls.length); calls.push({ target, settings, socket }); return socket; },
    ...options
  });
  t.after(async () => { session.close(); await session.task; await tick(); });
  return { ws, session, calls };
}

test('read failure retries before closing WebSocket and forwards fallback response', async t => {
  const { ws, calls } = setup(t, () => mockSocket(), { fallback: { hostname: 'backup.test' } });
  ws.message(packet([1, 2]));
  await until(() => calls[0]?.socket.writes.length === 1);
  calls[0].socket.fail();
  await until(() => calls[1]?.socket.writes.length === 1);
  assert.equal(ws.readyState, 1);
  calls[1].socket.data([9]);
  await until(() => ws.sent.length === 1);
  assert.deepEqual(ws.sent, [[0, 0, 9]]);
});

test('EOF before any response retries, EOF after response never replays', async t => {
  const { ws, calls, session } = setup(t, () => mockSocket(), { fallback: { hostname: 'backup.test' } });
  ws.message(packet([1]));
  await until(() => calls[0]?.socket.writes.length);
  calls[0].socket.eof();
  await until(() => calls[1]?.socket.writes.length);
  calls[1].socket.data([2]);
  await until(() => ws.sent.length);
  calls[1].socket.eof();
  await session.done;
  assert.equal(calls.length, 2);
  assert.equal(ws.closeCalls[0].code, 1000);
});

test('timeout retries the complete pre-response upload transcript in order', async t => {
  const { ws, calls } = setup(t, () => mockSocket(), { firstByteTimeout: 80, fallback: { hostname: 'backup.test' } });
  ws.message(packet([1, 2]));
  await until(() => calls[0]?.socket.writes.length === 1);
  ws.message(new Uint8Array([3, 4]));
  await until(() => calls[0].socket.writes.length === 2);
  await until(() => calls[1]?.socket.writes.length === 2);
  assert.deepEqual(calls[1].socket.writes, [[1, 2], [3, 4]]);
  calls[1].socket.data([7]);
  await until(() => ws.sent.length);
  assert.equal(ws.readyState, 1);
});

test('write failure includes the failed chunk when replaying on fallback', async t => {
  const { ws, calls } = setup(t, (_, index) => mockSocket(index === 0 ? { onWrite() { throw new Error('write failed'); } } : {}), { fallback: { hostname: 'backup.test' } });
  ws.message(packet([4, 5]));
  await until(() => calls[1]?.socket.writes.length);
  assert.deepEqual(calls[1].socket.writes, [[4, 5]]);
});

test('replay limit disables fallback instead of replaying a truncated request', async t => {
  const { ws, calls, session } = setup(t, () => mockSocket(), { maxReplayBytes: 3, firstByteTimeout: 35, fallback: { hostname: 'backup.test' } });
  ws.message(packet([1, 2, 3, 4]));
  await session.done;
  assert.equal(calls.length, 1);
  assert.equal(session.replayAllowed, false);
});

test('normal client close shuts down remote and releases both stream locks', async t => {
  const { ws, calls, session } = setup(t, () => mockSocket());
  ws.message(packet([1]));
  await until(() => calls[0]?.socket.writes.length);
  calls[0].socket.data([2]);
  await until(() => ws.sent.length);
  ws.peerClose();
  await session.task; await tick();
  assert.ok(calls[0].socket.closeCalls > 0);
  assert.equal(calls[0].socket.readable.locked, false);
  assert.equal(calls[0].socket.writable.locked, false);
});

test('queue byte limit applies while connection opening is stalled', async t => {
  const opened = deferred();
  const { ws, calls, session } = setup(t, () => mockSocket({ opened: opened.promise }), { maxQueuedBytes: 64 });
  ws.message(packet([1]));
  ws.message(new Uint8Array(40));
  ws.message(new Uint8Array(40));
  await session.done;
  assert.equal(calls.length, 1);
  assert.ok(calls[0].socket.closeCalls);
  assert.equal(ws.closeCalls[0].code, 1008);
  opened.resolve();
});

test('connect deadline disposes a stalled socket before attempting fallback', async t => {
  const opened = deferred();
  const { ws, calls } = setup(t, (_, index) => mockSocket(index === 0 ? { opened: opened.promise } : {}), { connectTimeout: 20, fallback: { hostname: 'backup.test' } });
  ws.message(packet([1]));
  await until(() => calls[1]?.socket.writes.length);
  assert.ok(calls[0].socket.closeCalls);
  opened.resolve(); await tick();
  assert.equal(calls[0].socket.writes.length, 0);
});

test('proxy-only with no proxy opens no direct socket, including DNS', async t => {
  const { ws, calls, session } = setup(t, () => { throw new Error('must not connect'); }, { proxyOnly: true });
  ws.message(packet([0, 1, 7], { udp: true }));
  await session.done;
  assert.equal(calls.length, 0);
  assert.throws(() => tunnelRoutes({ hostname: 'x', port: 443 }, { proxyOnly: true }));
});

test('fragmented header and early data authenticate once and preserve payload order', async t => {
  const input = packet([1, 2]);
  const { ws, calls } = setup(t, () => mockSocket(), { earlyData: Buffer.from(input.subarray(0, 10)).toString('base64url') });
  ws.message(input.subarray(10));
  ws.message(new Uint8Array([3]));
  await until(() => calls[0]?.socket.writes.length === 2);
  assert.deepEqual(calls[0].socket.writes, [[1, 2], [3]]);
});

test('SOCKS failure closes socket and releases locks', async t => {
  const { ws, calls, session } = setup(t, () => mockSocket({ onWrite(_, socket) { socket.data([5, 255]); } }), { proxyOnly: true, proxy: { kind: 'p5', hostname: 'proxy.test', socksPort: 1080 } });
  ws.message(packet([1]));
  await session.done; await tick();
  assert.equal(calls.length, 1);
  assert.ok(calls[0].socket.closeCalls);
  assert.equal(calls[0].socket.readable.locked, false);
  assert.equal(calls[0].socket.writable.locked, false);
});

test('SOCKS handshake timeout is bounded even before first-byte timer starts', async t => {
  const { ws, calls, session } = setup(t, () => mockSocket(), { connectTimeout: 20, proxyOnly: true, proxy: { kind: 'p5', hostname: 'proxy.test', socksPort: 1080 } });
  ws.message(packet([1]));
  await session.done;
  assert.ok(calls[0].socket.closeCalls);
});

test('SOCKS split replies, UTF-8 auth lengths and coalesced target bytes survive handshake', async t => {
  const { ws, calls } = setup(t, () => mockSocket({ onWrite(_, socket) {
    if (socket.writes.length === 1) { socket.data([5]); socket.data([2]); }
    if (socket.writes.length === 2) socket.data([1, 0]);
    if (socket.writes.length === 3) { socket.data([5, 0, 0, 1, 0]); socket.data([0, 0, 0, 0, 0, 99]); }
  } }), { proxyOnly: true, proxy: { kind: 'p5', hostname: 'proxy.test', socksPort: 1080, username: '用户', password: '密码' } });
  ws.message(packet([7]));
  await until(() => ws.sent.length);
  assert.equal(calls[0].socket.writes[1][1], 6);
  assert.equal(calls[0].socket.writes[1][8], 6);
  assert.deepEqual(ws.sent, [[0, 0, 99]]);
  await until(() => calls[0].socket.writes.length === 4);
  assert.deepEqual(calls[0].socket.writes[3], [7]);
});

test('HTTPS CONNECT keeps TLS option, fragmented headers and residual data', async t => {
  const { ws, calls } = setup(t, () => mockSocket({ onWrite(_, socket) {
    if (socket.writes.length === 1) {
      socket.data(new TextEncoder().encode('HTTP/1.1 200 Connection established\r\n'));
      socket.data(new Uint8Array([13, 10, 55]));
    }
  } }), { proxyOnly: true, proxy: { kind: 'pts', hostname: 'proxy.test', socksPort: 443 } });
  ws.message(packet([1]));
  await until(() => ws.sent.length);
  assert.equal(calls[0].settings.secureTransport, 'on');
  assert.match(new TextDecoder().decode(new Uint8Array(calls[0].socket.writes[0])), /^CONNECT 192\.0\.2\.1:443 HTTP\/1\.1/);
  assert.deepEqual(ws.sent, [[0, 0, 55]]);
});

test('DNS handles split/coalesced queries without waiting for server TCP EOF', async t => {
  const { ws, calls } = setup(t, () => mockSocket({ onWrite(bytes, socket) { socket.data([0]); socket.data([2, bytes[2], bytes[3]]); } }));
  ws.message(packet([0], { udp: true }));
  ws.message(new Uint8Array([2, 10, 11, 0, 2, 20, 21]));
  await until(() => ws.sent.length === 2);
  assert.deepEqual(ws.sent, [[0, 0, 0, 2, 10, 11], [0, 2, 20, 21]]);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.socket.closeCalls > 0));
  assert.equal(ws.readyState, 1);
});

test('proxy-only DNS uses SOCKS TCP DNS, never direct resolver connection', async t => {
  const { ws, calls } = setup(t, () => mockSocket({ onWrite(bytes, socket) {
    if (socket.writes.length === 1) socket.data([5, 0]);
    else if (socket.writes.length === 2) socket.data([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
    else socket.data([0, 2, bytes[2], bytes[3]]);
  } }), { proxyOnly: true, proxy: { kind: 'p5', hostname: 'proxy.test', socksPort: 1080 } });
  ws.message(packet([0, 2, 10, 11], { udp: true }));
  await until(() => ws.sent.length);
  assert.equal(calls[0].target.hostname, 'proxy.test');
  assert.deepEqual(calls[0].socket.writes[1], [5, 1, 0, 1, 8, 8, 4, 4, 0, 53]);
});

test('slow downstream closes after bounded backpressure wait', async t => {
  const { ws, calls, session } = setup(t, () => mockSocket(), { downloadTimeout: 20 });
  ws.message(packet([1]));
  await until(() => calls[0]?.socket.writes.length);
  ws.bufferedAmount = 1024 * 1024;
  calls[0].socket.data([2]);
  await session.done;
  assert.equal(ws.sent.length, 0);
  assert.ok(calls[0].socket.closeCalls);
});

test('post-response upstream failure never replays application data', async t => {
  const { ws, calls, session } = setup(t, () => mockSocket(), { fallback: { hostname: 'backup.test' } });
  ws.message(packet([1]));
  await until(() => calls[0]?.socket.writes.length);
  calls[0].socket.data([2]);
  await until(() => ws.sent.length);
  calls[0].socket.fail();
  await session.done;
  assert.equal(calls.length, 1);
});
