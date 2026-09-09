// Protocol helpers are independent of the Workers runtime and testable in Node.
const tunnelEncoder = new TextEncoder();
const tunnelDecoder = new TextDecoder('utf-8', { fatal: true });

export function tunnelBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new Error('Binary WebSocket messages required');
}

export function joinTunnelBytes(first, second) {
  const result = new Uint8Array(first.length + second.length);
  result.set(first);
  result.set(second, first.length);
  return result;
}

export function decodeEarlyData(value) {
  if (!value) return new Uint8Array(0);
  if (value.length > 350000) throw new Error('Early data too large');
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
}

// null means an incomplete header; invalid authentication/protocol throws.
export function parseTunnelHeader(bytes, token) {
  if (bytes.length < 18) return null;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token)) throw new Error('Invalid configured UUID');
  if (bytes[0] !== 0) throw new Error('Unsupported protocol version');
  const hex = token.replace(/-/g, '');
  let mismatch = 0;
  for (let i = 0; i < 16; i++) mismatch |= bytes[i + 1] ^ parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  if (mismatch) throw new Error('Invalid user');
  const commandOffset = 18 + bytes[17];
  if (bytes.length < commandOffset + 4) return null;
  const command = bytes[commandOffset];
  if (command !== 1 && command !== 2) throw new Error('Unsupported command');
  const port = (bytes[commandOffset + 1] << 8) | bytes[commandOffset + 2];
  if (!port) throw new Error('Invalid destination port');
  const addressType = bytes[commandOffset + 3];
  let offset = commandOffset + 4;
  let hostname;
  if (addressType === 1) {
    if (bytes.length < offset + 4) return null;
    hostname = Array.from(bytes.subarray(offset, offset + 4)).join('.');
    offset += 4;
  } else if (addressType === 2) {
    if (bytes.length < offset + 1) return null;
    const length = bytes[offset++];
    if (!length) throw new Error('Empty hostname');
    if (bytes.length < offset + length) return null;
    hostname = tunnelDecoder.decode(bytes.subarray(offset, offset + length));
    if (/[\s\x00-\x1f\x7f/@?#]/.test(hostname)) throw new Error('Invalid hostname');
    offset += length;
  } else if (addressType === 3) {
    if (bytes.length < offset + 16) return null;
    const groups = [];
    for (let i = 0; i < 16; i += 2) groups.push(((bytes[offset + i] << 8) | bytes[offset + i + 1]).toString(16));
    hostname = groups.join(':');
    offset += 16;
  } else {
    throw new Error('Unsupported address type');
  }
  if (command === 2 && port !== 53) throw new Error('Only UDP DNS is supported');
  return { hostname, port, udp: command === 2, offset, responseHeader: new Uint8Array([bytes[0], 0]) };
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
    // URL canonicalizes compressed IPv6 and embedded IPv4 tails.
    const canonical = new URL('http://[' + host + ']/').hostname.slice(1, -1);
    const halves = canonical.split('::');
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const groups = halves.length === 1 ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
    if (groups.length !== 8) throw new Error('Invalid IPv6 address');
    return new Uint8Array([4, ...groups.flatMap(group => { const n = parseInt(group, 16); return [n >> 8, n & 255]; })]);
  }
  const bytes = tunnelEncoder.encode(host);
  if (!bytes.length || bytes.length > 255 || /[\s\x00-\x1f\x7f/@?#]/.test(host)) throw new Error('Invalid hostname');
  return new Uint8Array([3, bytes.length, ...bytes]);
}
