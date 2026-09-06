import { describe, it, expect } from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

/**
 * Plan 001 WP-7 steps 1-2, AC-7.1 (qa WP7-F1, WP7-F7): a request proxied over RPC
 * returns the same value the local path would for the same server response, for every
 * JSON body shape — object, array, string, number, boolean, null and the falsy/empty
 * members the server-side presence check keys on (`""`, `0`, `false`, `null`, and a
 * response with no body at all). Before this package, the identity `transformResponse` +
 * second `JSON.stringify` pair double-encodes every truthy body into a string, and the
 * truthy guard drops every falsy body to `undefined`.
 *
 * Uses `LoopbackRpcServer#startRequestService`'s `origin` parameter (step 6 (a), qa
 * WP7-F4's arm M2) so the proxy's own `Api` reaches this test's controllable origin —
 * never Discord's real API.
 */

const BODIES: Array<[string, unknown]> = [
  ['object', { id: '123', nested: { a: 1 } }],
  ['array', [1, 2, 3]],
  ['string', 'plain'],
  ['number', 42],
  ['boolean', true],
  ['null', null],
  ['empty string', ''],
  ['zero', 0],
  ['false', false],
];

describe('AC-7.1 — proxied response shape matches the local path, per body shape', () => {
  it.each(BODIES)('%s', async (_label, body) => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([
      { status: 200, body, headers: { 'content-type': 'application/json' } },
      { status: 200, body, headers: { 'content-type': 'application/json' } },
    ]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin);

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });

    const local = await api.request('GET', '/channels/1', { local: true });
    const proxied = await api.request('GET', '/channels/1');

    expect(proxied.data).toEqual(local.data);

    api.end();
    await origin.close();
    rpc.forceClose();
  }, 10000);

  it('a response with no body at all', async () => {
    const origin = await LoopbackApiOrigin.start();
    origin.setScript([
      { status: 204, body: undefined },
      { status: 204, body: undefined },
    ]);
    const rpc = await LoopbackRpcServer.startRequestService('test-token', origin);

    const api = await createApiAgainstOrigin(origin);
    await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback: false });

    const local = await api.request('GET', '/channels/1', { local: true });
    const proxied = await api.request('GET', '/channels/1');

    expect(proxied.data).toEqual(local.data);

    api.end();
    await origin.close();
    rpc.forceClose();
  }, 10000);
});
