import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTunnelHeader, parseProxyAddress, encodeSocksDestination, decodeEarlyData, tunnelBytes } from '../src/protocol.js';
import { TOKEN, packet } from './helpers.mjs';

test('header can be split at every byte boundary', () => {
  const input = packet([7, 8], { type: 2, host: 'example.test' });
  const expected = parseTunnelHeader(input, TOKEN);
  for (let i = 0; i < expected.offset; i++) assert.equal(parseTunnelHeader(input.subarray(0, i), TOKEN), null);
  assert.equal(expected.hostname, 'example.test');
  assert.deepEqual([...input.subarray(expected.offset)], [7, 8]);
});
test('rejects wrong UUID, unknown command, invalid port and non-DNS UDP', () => {
  assert.throws(() => parseTunnelHeader(packet(), '22222222-2222-4222-8222-222222222222'));
  const invalid = packet(); invalid[18] = 3;
  assert.throws(() => parseTunnelHeader(invalid, TOKEN));
  assert.throws(() => parseTunnelHeader(packet([], { port: 0 }), TOKEN));
  assert.throws(() => parseTunnelHeader(packet([], { udp: true, port: 443 }), TOKEN));
});
test('parses IPv6 header and minimal one-character domain', () => {
  const result = parseTunnelHeader(packet([], { host: [...Array(15).fill(0), 1], type: 3 }), TOKEN);
  assert.equal(result.hostname, '0:0:0:0:0:0:0:1');
  assert.equal(parseTunnelHeader(packet([], { type: 2, host: 'a' }), TOKEN).hostname, 'a');
});
test('proxy URL preserves encoded credentials and normalizes IPv6', () => {
  const proxy = parseProxyAddress('socks5://user:p%40ss%3Aword@[2001:db8::1]:1080');
  assert.equal(proxy.hostname, '2001:db8::1');
  assert.equal(proxy.password, 'p@ss:word');
  assert.equal(proxy.socksPort, 1080);
  assert.equal(parseProxyAddress('https://proxy.example').socksPort, 443);
  assert.equal(parseProxyAddress('user:pass@proxy.example:1080').kind, 'p5');
});
test('rejects missing SOCKS port, unsupported scheme and out-of-range port', () => {
  for (const value of ['proxy.example', 'socks5://proxy.example:0', 'http://proxy.example:99999', 'ftp://proxy.example']) assert.throws(() => parseProxyAddress(value));
});
test('SOCKS destination types use binary IPv4/IPv6 and byte-counted domains', () => {
  assert.deepEqual([...encodeSocksDestination('192.0.2.1')], [1, 192, 0, 2, 1]);
  const v6 = encodeSocksDestination('2001:db8::1');
  assert.equal(v6.length, 17); assert.equal(v6[0], 4); assert.equal(v6[16], 1);
  assert.equal(encodeSocksDestination('::ffff:192.0.2.1').length, 17);
  assert.deepEqual([...encodeSocksDestination('a')], [3, 1, 97]);
});
test('early data round trips base64url and rejects non-binary messages', () => {
  const value = packet([1, 2, 3]);
  assert.deepEqual(decodeEarlyData(Buffer.from(value).toString('base64url')), value);
  assert.throws(() => tunnelBytes('text frame'));
});
