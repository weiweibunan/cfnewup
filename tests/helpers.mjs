import assert from 'node:assert/strict';
export const TOKEN = '11111111-1111-4111-8111-111111111111';
export const tick = () => new Promise(setImmediate);
export async function until(predicate, message = 'condition', timeout = 1500) {
  const deadline = Date.now() + timeout;
  while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 2));
  assert.ok(predicate(), 'Timed out waiting for ' + message);
}
export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export function packet(payload = [], { udp = false, host = [192, 0, 2, 1], type = 1, port = udp ? 53 : 443, token = TOKEN } = {}) {
  const address = type === 2 ? [host.length, ...new TextEncoder().encode(host)] : host;
  return new Uint8Array([0, ...Buffer.from(token.replaceAll('-', ''), 'hex'), 0, udp ? 2 : 1, port >> 8, port & 255, type, ...address, ...payload]);
}
export class MockWebSocket {
  readyState = 1;
  bufferedAmount = 0;
  events = {};
  sent = [];
  closeCalls = [];
  addEventListener(name, callback) { this.events[name] = callback; }
  accept() {}
  send(bytes) { assert.equal(this.readyState, 1); this.sent.push([...bytes]); }
  close(code, reason) { this.closeCalls.push({ code, reason }); this.readyState = 3; }
  message(bytes) { this.events.message({ data: bytes }); }
  peerClose() { this.readyState = 3; this.events.close({}); }
}
export function mockSocket({ onWrite, opened } = {}) {
  const completion = deferred();
  let controller;
  let ended = false;
  const socket = {
    writes: [], closeCalls: 0,
    opened: opened || Promise.resolve({}),
    closed: completion.promise,
    readable: new ReadableStream({ start(value) { controller = value; } }),
    writable: new WritableStream({ write(bytes) { socket.writes.push([...bytes]); return onWrite?.(bytes, socket); } }),
    data(bytes) { controller.enqueue(new Uint8Array(bytes)); },
    eof() { if (!ended) { ended = true; controller.close(); completion.resolve(); } },
    fail() { if (!ended) { ended = true; controller.error(new Error('simulated upstream failure')); completion.reject(new Error('simulated socket failure')); } },
    close() { socket.closeCalls++; if (!ended) { ended = true; try { controller.close(); } catch {} completion.resolve(); } return Promise.resolve(); }
  };
  return socket;
}
