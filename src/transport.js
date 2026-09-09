import { tunnelBytes, joinTunnelBytes, decodeEarlyData, parseTunnelHeader, encodeSocksDestination } from './protocol.js';

const transportDefaults = Object.freeze({
  maxQueuedBytes: 256 * 1024,
  maxReplayBytes: 256 * 1024,
  connectTimeout: 5000,
  firstByteTimeout: 1200,
  dnsTimeout: 5000,
  writeTimeout: 10000,
  clientHandshakeTimeout: 5000,
  downloadTimeout: 5000
});

function ignoreTunnelFailure(operation) {
  try { Promise.resolve(operation()).catch(() => {}); } catch {}
}

function tunnelDeadline(operation, milliseconds, signal, label) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      callback(value);
    };
    const abort = () => finish(reject, new Error('Tunnel closed'));
    const timer = setTimeout(() => finish(reject, new Error(label + ' timed out')), milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    Promise.resolve(operation).then(value => finish(resolve, value), error => finish(reject, error));
  });
}

class TunnelReader {
  constructor(reader) { this.reader = reader; this.buffer = new Uint8Array(0); }
  async fill(length) {
    while (this.buffer.length < length) {
      const { value, done } = await this.reader.read();
      if (done) throw new Error('Unexpected upstream EOF');
      this.buffer = joinTunnelBytes(this.buffer, tunnelBytes(value));
    }
  }
  async exact(length) {
    await this.fill(length);
    const bytes = this.buffer.subarray(0, length);
    this.buffer = this.buffer.subarray(length);
    return bytes;
  }
  async httpHeader() {
    let scan = 0;
    for (;;) {
      for (; scan + 3 < this.buffer.length; scan++) {
        if (this.buffer[scan] === 13 && this.buffer[scan + 1] === 10 && this.buffer[scan + 2] === 13 && this.buffer[scan + 3] === 10) {
          if (scan + 4 > 8192) throw new Error('Proxy response header too large');
          return this.exact(scan + 4);
        }
      }
      if (this.buffer.length >= 8192) throw new Error('Proxy response header too large');
      await this.fill(this.buffer.length + 1);
    }
  }
  async read() {
    if (this.buffer.length) {
      const value = this.buffer;
      this.buffer = new Uint8Array(0);
      return { value, done: false };
    }
    return this.reader.read();
  }
}

async function negotiateTunnelProxy(connection, proxy, destination) {
  const encoder = new TextEncoder();
  const { writer, input } = connection;
  if (proxy.kind === 'pt' || proxy.kind === 'pts') {
    const host = destination.hostname.includes(':') ? '[' + destination.hostname.replace(/^\[|\]$/g, '') + ']' : destination.hostname;
    if (/[\s\x00-\x1f\x7f]/.test(host)) throw new Error('Invalid CONNECT hostname');
    const authority = host + ':' + destination.port;
    let header = 'CONNECT ' + authority + ' HTTP/1.1\r\nHost: ' + authority + '\r\nProxy-Connection: Keep-Alive\r\n';
    if (proxy.username) {
      const bytes = encoder.encode(proxy.username + ':' + (proxy.password || ''));
      header += 'Proxy-Authorization: Basic ' + btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')) + '\r\n';
    }
    await writer.write(encoder.encode(header + '\r\n'));
    const response = new TextDecoder().decode(await input.httpHeader());
    if (!/^HTTP\/1\.[01] 2\d\d(?: |\r)/.test(response)) throw new Error('CONNECT proxy rejected connection');
    return;
  }
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

export function tunnelRoutes(destination, options) {
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

// One session owns the socket lifecycle, upload queue and all retry decisions.
export class TunnelSession {
  constructor(webSocket, options) {
    this.ws = webSocket;
    this.options = { ...transportDefaults, ...options };
    this.abortController = new AbortController();
    this.connections = new Set();
    this.pending = [];
    this.pendingBytes = 0;
    this.headerBytes = new Uint8Array(0);
    this.dnsBytes = new Uint8Array(0);
    this.replay = [];
    this.replayBytes = 0;
    this.replayAllowed = true;
    this.receivedResponse = false;
    this.closed = false;
    this.waiters = new Set();
    this.done = new Promise(resolve => { this.resolveDone = resolve; });
    this.handshakeTimer = setTimeout(() => this.close(1008, 'Client handshake timed out'), this.options.clientHandshakeTimeout);
    webSocket.addEventListener('message', event => this.receive(event.data));
    webSocket.addEventListener('close', () => this.close());
    webSocket.addEventListener('error', () => this.close(1011, 'Client transport failed'));
    try { if (options.earlyData) this.receive(decodeEarlyData(options.earlyData)); } catch { this.close(1008, 'Invalid early data'); }
  }

  wake() { for (const resolve of this.waiters) resolve(); this.waiters.clear(); }
  wait() { return new Promise(resolve => this.waiters.add(resolve)); }

  receive(value) {
    if (this.closed) return;
    try {
      let data = tunnelBytes(value);
      if (!data.length) return;
      if (this.pendingBytes + this.headerBytes.length + data.length > this.options.maxQueuedBytes) throw new Error('Upload queue exceeded');
      if (!this.header) {
        this.headerBytes = joinTunnelBytes(this.headerBytes, data);
        this.header = parseTunnelHeader(this.headerBytes, this.options.token);
        if (!this.header) {
          if (this.headerBytes.length > 1024) throw new Error('Client header too large');
          return;
        }
        clearTimeout(this.handshakeTimer);
        data = this.headerBytes.subarray(this.header.offset);
        this.headerBytes = new Uint8Array(0);
        this.responseHeader = this.header.responseHeader;
        // Validate before any TCP connection, including DNS, can be attempted.
        tunnelRoutes(this.header, this.options);
        this.enqueue(data);
        this.task = (this.header.udp ? this.runDNS() : this.runTCP()).catch(() => this.close(1011, 'Upstream transport failed'));
      } else {
        this.enqueue(data);
      }
    } catch {
      this.close(1008, 'Invalid request or upload limit exceeded');
    }
  }

  enqueue(data) {
    this.pendingBytes += data.length;
    if (this.header.udp) {
      this.dnsBytes = joinTunnelBytes(this.dnsBytes, data);
      while (this.dnsBytes.length >= 2) {
        const size = (this.dnsBytes[0] << 8) | this.dnsBytes[1];
        if (!size) throw new Error('Empty DNS packet');
        if (this.dnsBytes.length < size + 2) break;
        this.pending.push(this.dnsBytes.slice(0, size + 2));
        this.dnsBytes = this.dnsBytes.subarray(size + 2);
      }
    } else if (data.length) {
      this.pending.push(data);
    }
    this.wake();
  }

  async open(route) {
    if (this.closed) throw new Error('Tunnel closed');
    const target = route.proxy ? { hostname: route.proxy.hostname, port: route.proxy.socksPort } : route.destination;
    const socket = this.options.connect({ hostname: target.hostname, port: target.port }, route.proxy?.kind === 'pts' ? { secureTransport: 'on', allowHalfOpen: false } : undefined);
    const connection = { socket, disposed: false, reader: null, writer: null };
    this.connections.add(connection);
    if (socket.closed) Promise.resolve(socket.closed).catch(() => {});
    try {
      await tunnelDeadline((async () => {
        if (socket.opened) await socket.opened;
        if (connection.disposed || this.closed) throw new Error('Tunnel closed');
        connection.writer = socket.writable.getWriter();
        connection.reader = socket.readable.getReader();
        connection.input = new TunnelReader(connection.reader);
        if (route.proxy) await negotiateTunnelProxy(connection, route.proxy, route.destination);
      })(), this.options.connectTimeout, this.abortController.signal, 'Connect/handshake');
      return connection;
    } catch (error) {
      this.dispose(connection);
      throw error;
    }
  }

  dispose(connection) {
    if (!connection || connection.disposed) return;
    connection.disposed = true;
    this.connections.delete(connection);
    ignoreTunnelFailure(() => connection.socket.close());
    if (connection.reader) {
      const reader = connection.reader;
      ignoreTunnelFailure(async () => { try { await reader.cancel(); } finally { reader.releaseLock(); } });
    }
    if (connection.writer) {
      const writer = connection.writer;
      ignoreTunnelFailure(async () => { try { await writer.abort(); } finally { writer.releaseLock(); } });
    }
  }

  close(code = 1000, reason = 'Tunnel closed') {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.handshakeTimer);
    this.abortController.abort();
    this.wake();
    for (const connection of this.connections) this.dispose(connection);
    this.pending = [];
    this.replay = [];
    this.headerBytes = new Uint8Array(0);
    this.dnsBytes = new Uint8Array(0);
    if (this.ws.readyState === 1 || this.ws.readyState === 2) ignoreTunnelFailure(() => this.ws.close(code, reason));
    this.resolveDone();
  }

  async send(data) {
    const start = Date.now();
    while (this.ws.bufferedAmount > 512 * 1024) {
      if (this.closed || this.ws.readyState !== 1) throw new Error('Client closed');
      if (Date.now() - start >= this.options.downloadTimeout) throw new Error('Client too slow');
      await tunnelDeadline(new Promise(resolve => setTimeout(resolve, 10)), 1000, this.abortController.signal, 'Client backpressure');
    }
    if (this.closed || this.ws.readyState !== 1) throw new Error('Client closed');
    if (this.responseHeader) {
      data = joinTunnelBytes(this.responseHeader, data);
      this.responseHeader = null;
    }
    this.ws.send(data);
  }

  remember(data) {
    if (this.receivedResponse || !this.replayAllowed) return;
    if (this.replayBytes + data.length > this.options.maxReplayBytes) {
      // Never retry with a truncated transcript. Continue this connection only.
      this.replayAllowed = false;
      this.replay = [];
      this.replayBytes = 0;
      return;
    }
    this.replay.push(data);
    this.replayBytes += data.length;
  }

  async upload(connection, attempt, replay) {
    const write = bytes => tunnelDeadline(connection.writer.write(bytes), this.options.writeTimeout, attempt.abort.signal, 'Upstream write');
    for (const data of replay) {
      if (attempt.finished || this.closed) return;
      await write(data);
    }
    while (!attempt.finished && !this.closed) {
      if (!this.pending.length) { await this.wait(); continue; }
      const data = this.pending.shift();
      this.remember(data);
      try { await write(data); } finally { this.pendingBytes -= data.length; }
    }
  }

  async download(connection, attempt) {
    while (!attempt.finished && !this.closed) {
      const { value, done } = await connection.input.read();
      if (attempt.finished || this.closed) return;
      if (done) return;
      const data = tunnelBytes(value);
      if (!data.length) continue;
      this.receivedResponse = true;
      this.replay = [];
      this.replayBytes = 0;
      clearTimeout(attempt.timer);
      await this.send(data);
    }
  }

  async runTCP() {
    const routes = tunnelRoutes(this.header, this.options);
    for (const route of routes) {
      if (this.closed) return;
      let connection;
      let attempt;
      let upload;
      let download;
      try {
        connection = await this.open(route);
        attempt = { finished: false, abort: new AbortController(), timer: null };
        const replay = this.replay.slice();
        const timeout = new Promise((_, reject) => {
          attempt.timer = setTimeout(() => reject(new Error('First byte timed out')), this.options.firstByteTimeout);
        });
        upload = this.upload(connection, attempt, replay);
        download = this.download(connection, attempt);
        await Promise.race([download, upload.then(() => new Promise(() => {})), timeout]);
      } catch {
        // This is the only place that decides whether to retry or close.
      } finally {
        if (attempt) {
          attempt.finished = true;
          attempt.abort.abort();
          clearTimeout(attempt.timer);
        }
        this.wake();
        this.dispose(connection);
        // The previous writer must stop before a new attempt touches the queue.
        if (upload) await upload.catch(() => {});
        if (download) download.catch(() => {});
      }
      if (this.closed) return;
      if (this.receivedResponse || !this.replayAllowed) break;
    }
    this.close(this.receivedResponse ? 1000 : 1011, this.receivedResponse ? 'Upstream closed' : 'No working upstream');
  }

  async exchangeDNS(packet) {
    const destination = { hostname: this.options.dnsHost || '8.8.4.4', port: 53 };
    for (const route of tunnelRoutes(destination, this.options)) {
      let connection;
      try {
        connection = await this.open(route);
        const response = await tunnelDeadline((async () => {
          await connection.writer.write(packet);
          const prefix = await connection.input.exact(2);
          const length = (prefix[0] << 8) | prefix[1];
          if (!length) throw new Error('Empty DNS response');
          return joinTunnelBytes(prefix, await connection.input.exact(length));
        })(), this.options.dnsTimeout, this.abortController.signal, 'DNS response');
        await this.send(response);
        return;
      } catch {
        if (this.closed) return;
      } finally {
        this.dispose(connection);
      }
    }
    throw new Error('DNS upstream failed');
  }

  async runDNS() {
    while (!this.closed) {
      if (!this.pending.length) { await this.wait(); continue; }
      const packet = this.pending.shift();
      try { await this.exchangeDNS(packet); } finally { this.pendingBytes -= packet.length; }
    }
  }
}
