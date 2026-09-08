import { describe, it, expect } from 'vitest';
import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

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
