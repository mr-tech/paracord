import { describe, it, expect } from 'vitest';

import { LoopbackGatewayServer } from '../harness/loopbackGatewayServer';
import { createDirectGateway } from '../harness/directGateway';
import { GATEWAY_CLOSE_CODES } from '../../src/constants';

import type { SessionHandoffState } from '../../src/clients/Gateway/types';

const EXPECTED_SEARCH = '?v=10&encoding=json';

describe('AC-2.1: for every accepted resumeUrl, the URL the connection is made with agrees with the one validation parsed', () => {
  async function connectedUrl(buildUrl: (port: number) => string): Promise<{ accepted: boolean; url?: URL | undefined; input: string }> {
    const server = await LoopbackGatewayServer.start();
    const { gateway } = createDirectGateway(server.url, { shard: undefined });
    const input = buildUrl(server.port);
    try {
      const state: SessionHandoffState = {
        sessionId: 'AGREEMENT_SESSION', sequence: 3, shard: undefined, resumeUrl: input,
      };
      try {
        gateway.importSession(state);
      } catch {
        return { accepted: false, input };
      }
      gateway.login();
      return { accepted: true, url: gateway.ws ? new URL(gateway.ws.url) : undefined, input };
    } finally {
      gateway.close(GATEWAY_CLOSE_CODES.USER_TERMINATE);
      await server.close();
    }
  }

  const ACCEPTED: Array<[string, (port: number) => string]> = [
    ['an origin', (p) => `ws://127.0.0.1:${p}`],
    ['an origin with a root path', (p) => `ws://127.0.0.1:${p}/`],
    ['an origin with a path', (p) => `ws://127.0.0.1:${p}/a/b`],
    ['an upper-case scheme', (p) => `WS://127.0.0.1:${p}/x`],
    ['dot segments', (p) => `ws://127.0.0.1:${p}/a/../b`],
    ['credentials', (p) => `ws://user:pass@127.0.0.1:${p}/x`],
  ];

  it.each(ACCEPTED)('%s: same scheme, host and path as the input parsed to, and exactly the connection parameters as the query', async (_label, build) => {
    const result = await connectedUrl(build);
    expect(result.accepted).toBe(true);
    expect(result.url).toBeDefined();
    const parsedInput = new URL(result.input);
    expect(result.url!.protocol).toBe(parsedInput.protocol);
    expect(result.url!.host).toBe(parsedInput.host);
    expect(result.url!.pathname).toBe(parsedInput.pathname);
    expect(result.url!.search).toBe(EXPECTED_SEARCH);
  });

  const REFUSED: Array<[string, (port: number) => string]> = [
    ['a trailing space', (p) => `ws://127.0.0.1:${p} `],
    ['a query', (p) => `ws://127.0.0.1:${p}?x=1`],
    ['a query naming a connection parameter', (p) => `ws://127.0.0.1:${p}/?v=9`],
    ['a fragment', (p) => `ws://127.0.0.1:${p}#frag`],
    ['an empty fragment', (p) => `ws://127.0.0.1:${p}/#`],
  ];

  it.each(REFUSED)('%s is refused by the import, the control for the accepted members above', async (_label, build) => {
    const result = await connectedUrl(build);
    expect(result.accepted).toBe(false);
  });
});
