/*
 * GrainTCP transport integration for CFnew.
 * Derived from ToiCF/GrainTCP and adapted for dynamic UUID and outbound routes.
 * SPDX-License-Identifier: GPL-3.0-only
 */

export const GRAIN_DEFAULTS = Object.freeze({
  chunk: 64 * 1024,
  downlinkPack: 32 * 1024,
  downlinkTail: 512,
  downlinkRounds: 4,
  uploadPack: 20 * 1024,
  maxEarlyData: 8 * 1024,
  concurrentDials: 4
});

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const uuidCache = new Map();

export function toGrainBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new Error('Binary WebSocket messages required');
}

function joinBytes(first, second) {
  if (!first.length) return second.slice();
  if (!second.length) return first.slice();
  const result = new Uint8Array(first.length + second.length);
  result.set(first);
  result.set(second, first.length);
  return result;
}

function uuidBytes(token) {
  const normalized = String(token || '').trim().toLowerCase();
  if (!UUID_PATTERN.test(normalized)) throw new Error('Invalid configured UUID');
  let bytes = uuidCache.get(normalized);
  if (bytes) return bytes;
  const hex = normalized.replaceAll('-', '');
  bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index++) bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  uuidCache.set(normalized, bytes);
  return bytes;
}

function matchesUUID(packet, expected) {
  return packet[1] === expected[0] && packet[2] === expected[1] &&
    packet[3] === expected[2] && packet[4] === expected[3] &&
    packet[5] === expected[4] && packet[6] === expected[5] &&
    packet[7] === expected[6] && packet[8] === expected[7] &&
    packet[9] === expected[8] && packet[10] === expected[9] &&
    packet[11] === expected[10] && packet[12] === expected[11] &&
    packet[13] === expected[12] && packet[14] === expected[13] &&
    packet[15] === expected[14] && packet[16] === expected[15];
}

export function parseGrainHeader(packet, token) {
  if (packet.length < 18) return null;
  if (packet[0] !== 0 || !matchesUUID(packet, uuidBytes(token))) throw new Error('Invalid VLESS client');
  const commandOffset = 18 + packet[17];
  if (packet.length < commandOffset + 4) return null;
  if (packet[commandOffset] !== 1) throw new Error('GrainTCP supports TCP only');
  const port = (packet[commandOffset + 1] << 8) | packet[commandOffset + 2];
  if (!port) throw new Error('Invalid destination port');
  const type = packet[commandOffset + 3];
  let offset = commandOffset + 4;
  let hostname;
  if (type === 1) {
    if (packet.length < offset + 4) return null;
    hostname = `${packet[offset]}.${packet[offset + 1]}.${packet[offset + 2]}.${packet[offset + 3]}`;
    offset += 4;
  } else if (type === 2) {
    if (packet.length < offset + 1) return null;
    const length = packet[offset++];
    if (!length) throw new Error('Empty destination hostname');
    if (packet.length < offset + length) return null;
    hostname = decoder.decode(packet.subarray(offset, offset + length));
    if (/[/@?#\s\x00-\x1f\x7f]/.test(hostname)) throw new Error('Invalid destination hostname');
    offset += length;
  } else if (type === 3) {
    if (packet.length < offset + 16) return null;
    const groups = [];
    for (let index = 0; index < 16; index += 2) groups.push(((packet[offset + index] << 8) | packet[offset + index + 1]).toString(16));
    hostname = groups.join(':');
    offset += 16;
  } else {
    throw new Error('Unsupported destination address type');
  }
  return { hostname, port, offset, responseHeader: new Uint8Array([packet[0], 0]) };
}

export function decodeGrainEarlyData(value, maximum = GRAIN_DEFAULTS.maxEarlyData) {
  if (!value) return null;
  if (value.length > maximum * 4 / 3 + 4) throw new Error('Early data too large');
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(normalized), character => character.charCodeAt(0));
}

export function parseProxyAddress(value) {
  let text = String(value || '').trim();
  if (!text) throw new Error('Empty proxy address');
  if (!/^[a-z0-9]+:\/\//i.test(text)) text = 'socks5://' + text;
  const url = new URL(text);
  const kinds = { 'socks:': 'p5', 'socks5:': 'p5', 'http:': 'pt', 'https:': 'pts' };
  const kind = kinds[url.protocol];
  if (!kind) throw new Error('Unsupported proxy protocol');
  const port = Number(url.port || (kind === 'pt' ? 80 : kind === 'pts' ? 443 : 0));
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !url.hostname) throw new Error('Invalid proxy address');
  return {
    kind,
    hostname: url.hostname.replace(/^\[|\]$/g, ''),
    socksPort: port,
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password)
  };
}

export function encodeSocksDestination(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    const parts = host.split('.').map(Number);
    if (parts.some(part => part > 255)) throw new Error('Invalid IPv4 address');
    return new Uint8Array([1, ...parts]);
  }
  if (host.includes(':')) {
    const canonical = new URL('http://[' + host + ']/').hostname.slice(1, -1);
    const halves = canonical.split('::');
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const groups = halves.length === 1 ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
    if (groups.length !== 8) throw new Error('Invalid IPv6 address');
    return new Uint8Array([4, ...groups.flatMap(group => { const number = parseInt(group, 16); return [number >> 8, number & 255]; })]);
  }
  const bytes = encoder.encode(host);
  if (!bytes.length || bytes.length > 255 || /[/@?#\s\x00-\x1f\x7f]/.test(host)) throw new Error('Invalid hostname');
  return new Uint8Array([3, bytes.length, ...bytes]);
}

export function createGrainKernel(capacity, copyPacked = false) {
  let queue = [];
  let head = 0;
  let queuedBytes = 0;
  let buffer = null;
  const empty = () => head >= queue.length;
  const trim = () => {
    if (head > 32 && head * 2 >= queue.length) {
      queue = queue.slice(head);
      head = 0;
    }
  };
  const clear = () => { queue = []; head = 0; queuedBytes = 0; buffer = null; };
  const take = () => {
    if (empty()) return null;
    const data = queue[head];
    queue[head++] = undefined;
    queuedBytes -= data.byteLength;
    trim();
    return data;
  };
  const sow = data => {
    if (!data?.byteLength) return true;
    queue.push(data);
    queuedBytes += data.byteLength;
    return true;
  };
  const pack = seed => {
    const first = seed || take();
    if (!first || empty()) return [first, false];
    let size = first.byteLength;
    let end = head;
    while (end < queue.length && size + queue[end].byteLength <= capacity) size += queue[end++].byteLength;
    if (end === head) return [first, false];
    const output = buffer ||= new Uint8Array(capacity);
    output.set(first);
    let offset = first.byteLength;
    while (head < end) {
      const data = queue[head];
      queue[head++] = undefined;
      queuedBytes -= data.byteLength;
      output.set(data, offset);
      offset += data.byteLength;
    }
    trim();
    const packed = output.subarray(0, size);
    return [copyPacked ? packed.slice() : packed, true];
  };
  return { empty, clear, take, sow, pack, get queuedBytes() { return queuedBytes; } };
}

export function createDownlinkGrain(webSocket, settings = {}) {
  const config = { ...GRAIN_DEFAULTS, ...settings };
  const capacity = config.downlinkPack;
  const lowWater = Math.max(4096, config.downlinkTail * 12);
  const kernel = createGrainKernel(capacity, true);
  let timer = 0;
  let generation = 0;
  let observedGeneration = 0;
  let rounds = 0;
  const reap = () => {
    if (timer) clearTimeout(timer);
    timer = 0;
    rounds = 0;
    for (;;) {
      const [data] = kernel.pack();
      if (!data) break;
      webSocket.send(data);
    }
  };
  const ripen = () => {
    if (kernel.empty() || timer) return;
    if (kernel.queuedBytes >= capacity || capacity - kernel.queuedBytes < config.downlinkTail) return reap();
    timer = setTimeout(() => {
      timer = 0;
      if (kernel.empty()) return;
      if (kernel.queuedBytes >= capacity || capacity - kernel.queuedBytes < config.downlinkTail) return reap();
      if (rounds < config.downlinkRounds && (generation !== observedGeneration || kernel.queuedBytes < lowWater)) {
        rounds++;
        observedGeneration = generation;
        return ripen();
      }
      reap();
    }, 1);
  };
  const send = value => {
    let offset = 0;
    const size = value?.byteLength || 0;
    while (offset < size) {
      const length = Math.min(capacity - kernel.queuedBytes, size - offset);
      if (!length) { reap(); continue; }
      kernel.sow(offset || length !== size ? value.subarray(offset, offset + length) : value);
      generation++;
      offset += length;
      if (kernel.queuedBytes >= capacity || capacity - kernel.queuedBytes < config.downlinkTail) reap();
      else ripen();
    }
  };
  return { send, reap, clear() { if (timer) clearTimeout(timer); timer = 0; kernel.clear(); } };
}

class StreamCursor {
  constructor(reader) { this.reader = reader; this.buffer = new Uint8Array(0); }
  async fill(length) {
    while (this.buffer.length < length) {
      const { value, done } = await this.reader.read();
      if (done) throw new Error('Unexpected proxy EOF');
      this.buffer = joinBytes(this.buffer, toGrainBytes(value));
    }
  }
  async exact(length) {
    await this.fill(length);
    const result = this.buffer.slice(0, length);
    this.buffer = this.buffer.slice(length);
    return result;
  }
  async httpHeader() {
    for (;;) {
      for (let index = 0; index + 3 < this.buffer.length; index++) {
        if (this.buffer[index] === 13 && this.buffer[index + 1] === 10 && this.buffer[index + 2] === 13 && this.buffer[index + 3] === 10) {
          if (index + 4 > 8192) throw new Error('Proxy response header too large');
          return this.exact(index + 4);
        }
      }
      if (this.buffer.length >= 8192) throw new Error('Proxy response header too large');
      await this.fill(this.buffer.length + 1);
    }
  }
}

async function negotiateProxy(socket, proxy, destination) {
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const input = new StreamCursor(reader);
  let ready = false;
  try {
    if (proxy.kind === 'pt' || proxy.kind === 'pts') {
      const host = destination.hostname.includes(':') ? '[' + destination.hostname.replace(/^\[|\]$/g, '') + ']' : destination.hostname;
      if (/[\s\x00-\x1f\x7f]/.test(host)) throw new Error('Invalid CONNECT hostname');
      const authority = host + ':' + destination.port;
      let header = 'CONNECT ' + authority + ' HTTP/1.1\r\nHost: ' + authority + '\r\nProxy-Connection: Keep-Alive\r\n';
      if (proxy.username) {
        const credentials = encoder.encode(proxy.username + ':' + (proxy.password || ''));
        header += 'Proxy-Authorization: Basic ' + btoa(Array.from(credentials, byte => String.fromCharCode(byte)).join('')) + '\r\n';
      }
      await writer.write(encoder.encode(header + '\r\n'));
      const response = new TextDecoder().decode(await input.httpHeader());
      if (!/^HTTP\/1\.[01] 2\d\d(?: |\r)/.test(response)) throw new Error('CONNECT proxy rejected connection');
    } else {
      const user = encoder.encode(proxy.username || '');
      const password = encoder.encode(proxy.password || '');
      if (user.length > 255 || password.length > 255) throw new Error('SOCKS credentials too long');
      await writer.write(new Uint8Array(user.length ? [5, 2, 0, 2] : [5, 1, 0]));
      const greeting = await input.exact(2);
      if (greeting[0] !== 5 || ![0, 2].includes(greeting[1])) throw new Error('SOCKS authentication method rejected');
      if (greeting[1] === 2) {
        if (!user.length) throw new Error('SOCKS credentials required');
        await writer.write(new Uint8Array([1, user.length, ...user, password.length, ...password]));
        const auth = await input.exact(2);
        if (auth[0] !== 1 || auth[1] !== 0) throw new Error('SOCKS authentication failed');
      }
      await writer.write(new Uint8Array([5, 1, 0, ...encodeSocksDestination(destination.hostname), destination.port >> 8, destination.port & 255]));
      const reply = await input.exact(4);
      if (reply[0] !== 5 || reply[1] !== 0 || reply[2] !== 0) throw new Error('SOCKS connection rejected');
      if (reply[3] === 1) await input.exact(6);
      else if (reply[3] === 4) await input.exact(18);
      else if (reply[3] === 3) await input.exact((await input.exact(1))[0] + 2);
      else throw new Error('Invalid SOCKS response address');
    }
    ready = true;
    return { writer, residual: input.buffer };
  } finally {
    reader.releaseLock();
    if (!ready) {
      try { writer.releaseLock(); } catch {}
    }
  }
}

export function grainRoutes(destination, options) {
  const direct = { destination, proxy: null };
  const proxy = options.proxy ? { destination, proxy: options.proxy } : null;
  if (options.proxyOnly) {
    if (!proxy) throw new Error('Proxy-only mode requires a valid proxy');
    return [proxy];
  }
  const routes = options.directFirst ? [direct, ...(proxy ? [proxy] : [])] : [proxy || direct];
  if (options.fallback) routes.push({ destination: { hostname: options.fallback.hostname, port: options.fallback.port || destination.port }, proxy: null });
  return routes;
}

async function raceSockets(connect, target, settings, count, openingSockets) {
  const openOne = async () => {
    const socket = connect(target, settings);
    if (socket.closed) Promise.resolve(socket.closed).catch(() => {});
    openingSockets.add(socket);
    try {
      if (socket.opened) await socket.opened;
      return socket;
    } catch (error) {
      openingSockets.delete(socket);
      try { socket.close(); } catch {}
      throw error;
    }
  };
  if (count <= 1) return openOne();
  const attempts = Array.from({ length: count }, openOne);
  const winner = await Promise.any(attempts);
  for (const attempt of attempts) attempt.then(socket => {
    if (socket !== winner) {
      openingSockets.delete(socket);
      try { socket.close(); } catch {}
    }
  }, () => {});
  return winner;
}

async function openRoute(route, options, openingSockets) {
  const target = route.proxy ? { hostname: route.proxy.hostname, port: route.proxy.socksPort } : route.destination;
  const settings = route.proxy?.kind === 'pts' ? { secureTransport: 'on', allowHalfOpen: false } : undefined;
  const socket = await raceSockets(options.connect, target, settings, options.concurrentDials, openingSockets);
  openingSockets.delete(socket);
  if (!route.proxy) return { socket, writer: socket.writable.getWriter(), residual: null };
  try {
    const negotiated = await negotiateProxy(socket, route.proxy, route.destination);
    return { socket, ...negotiated };
  } catch (error) {
    try { socket.close(); } catch {}
    throw error;
  }
}

async function millDownlink(readable, webSocket, settings, initialData) {
  const grain = createDownlinkGrain(webSocket, settings);
  if (initialData?.byteLength) grain.send(initialData);
  let reader;
  let byob = true;
  try {
    try { reader = readable.getReader({ mode: 'byob' }); }
    catch { byob = false; reader = readable.getReader(); }
    if (!byob) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const bytes = toGrainBytes(value);
        if (bytes.byteLength >= (settings.chunk >> 1)) { grain.reap(); webSocket.send(bytes); }
        else grain.send(bytes.slice());
      }
      grain.reap();
      return;
    }
    let buffer = new ArrayBuffer(settings.chunk);
    for (;;) {
      const { done, value } = await reader.read(new Uint8Array(buffer, 0, settings.chunk));
      if (done) break;
      if (!value?.byteLength) continue;
      if (value.byteLength >= (settings.chunk >> 1)) {
        grain.reap();
        webSocket.send(value);
        buffer = new ArrayBuffer(settings.chunk);
      } else {
        grain.send(value.slice());
        buffer = value.buffer;
      }
    }
    grain.reap();
  } finally {
    try { grain.reap(); } catch {}
    try { reader?.releaseLock(); } catch {}
  }
}

export class GrainSession {
  constructor(webSocket, options) {
    this.webSocket = webSocket;
    this.options = { ...GRAIN_DEFAULTS, ...options };
    this.queue = createGrainKernel(this.options.uploadPack);
    this.headerBuffer = new Uint8Array(0);
    this.openingSockets = new Set();
    this.socket = null;
    this.writer = null;
    this.busy = false;
    this.closed = false;
    this.done = new Promise(resolve => { this.resolveDone = resolve; });
    webSocket.addEventListener('message', event => this.receive(event.data));
    webSocket.addEventListener('close', () => this.close());
    webSocket.addEventListener('error', () => this.close());
    try {
      const earlyData = decodeGrainEarlyData(this.options.earlyData, this.options.maxEarlyData);
      if (earlyData) this.receive(earlyData);
    } catch { this.close(); }
  }

  receive(value) {
    if (this.closed) return;
    try {
      this.queue.sow(toGrainBytes(value));
      this.drain();
    } catch { this.close(); }
  }

  async connect(destination) {
    let lastError;
    for (const route of grainRoutes(destination, this.options)) {
      if (this.closed) throw new Error('Tunnel closed');
      try { return await openRoute(route, this.options, this.openingSockets); }
      catch (error) { lastError = error; }
    }
    throw lastError || new Error('No working outbound route');
  }

  async drain() {
    if (this.busy || this.closed) return;
    this.busy = true;
    try {
      for (;;) {
        if (this.closed) break;
        if (!this.socket) {
          const [chunk] = this.queue.pack();
          if (!chunk) break;
          this.headerBuffer = joinBytes(this.headerBuffer, chunk);
          const header = parseGrainHeader(this.headerBuffer, this.options.token);
          if (!header) {
            if (this.headerBuffer.length > 1024) throw new Error('VLESS header too large');
            continue;
          }
          this.webSocket.send(header.responseHeader);
          const payload = this.headerBuffer.subarray(header.offset);
          this.headerBuffer = new Uint8Array(0);
          const connection = await this.connect(header);
          if (this.closed) { try { connection.socket.close(); } catch {} break; }
          this.socket = connection.socket;
          this.writer = connection.writer;
          const [first] = this.queue.pack(payload);
          if (first?.byteLength) await this.writer.write(first);
          millDownlink(this.socket.readable, this.webSocket, this.options, connection.residual)
            .catch(() => {})
            .finally(() => this.close());
          continue;
        }
        const [chunk] = this.queue.pack();
        if (!chunk) break;
        await this.writer.write(chunk);
      }
    } catch { this.close(); }
    finally {
      this.busy = false;
      if (!this.queue.empty() && !this.closed) queueMicrotask(() => this.drain());
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.queue.clear();
    for (const socket of this.openingSockets) { try { socket.close(); } catch {} }
    this.openingSockets.clear();
    try { this.writer?.releaseLock(); } catch {}
    try { this.socket?.close(); } catch {}
    try {
      if (this.webSocket.readyState === 0 || this.webSocket.readyState === 1 || this.webSocket.readyState === 2) this.webSocket.close();
    } catch {}
    this.resolveDone();
  }
}

export function createGrainWebSocketResponse(request, options) {
  const [client, server] = Object.values(new WebSocketPair());
  server.binaryType = 'arraybuffer';
  try { server.accept({ allowHalfOpen: true }); } catch { server.accept(); }
  const session = new GrainSession(server, options);
  const response = new Response(null, {
    status: 101,
    webSocket: client,
    headers: { 'Sec-WebSocket-Extensions': '' }
  });
  return { response, session };
}
