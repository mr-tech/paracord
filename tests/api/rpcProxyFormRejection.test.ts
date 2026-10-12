import { describe, it, expect } from 'vitest';
import FormData from 'form-data';
import { status as grpcStatus } from '@grpc/grpc-js';

import LoopbackApiOrigin, { createApiAgainstOrigin } from '../harness/loopbackApiOrigin';
import LoopbackRpcServer from '../harness/loopbackRpcServer';

import type { Method } from 'axios';
import type Api from '../../src/clients/Api/Api';
import type { RequestOptions } from '../../src/clients/Api/types';

const OK_RESPONSE = { status: 200, body: { ok: true } };
const METHODS: Method[] = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE', 'POST', 'PATCH'];
const ABSENCE_SETTLE_MS = 150;

type RpcState = 'connected' | 'latched-connecting';
type FormSource = 'createForm' | 'data';

function buildForm(): FormData {
  const form = new FormData();
  form.append('file', Buffer.from('hello'), { filename: 'hello.txt' });
  return form;
}

function formOptions(source: FormSource): RequestOptions {
  if (source === 'createForm') {
    return { createForm: () => { const data = buildForm(); return { data, headers: data.getHeaders() }; } };
  }
  const data = buildForm();
  return { data, headers: data.getHeaders() };
}

interface Rig {
  origin: LoopbackApiOrigin;
  rpc: LoopbackRpcServer;
  api: Api;
  stop: () => Promise<void>;
}

async function rig(state: RpcState, allowFallback: boolean): Promise<Rig> {
  const origin = await LoopbackApiOrigin.start();
  origin.setDefaultResponse(OK_RESPONSE);
  const rpc = await LoopbackRpcServer.startRequestService('test-token', origin);
  if (state === 'latched-connecting') rpc.injectFault('hello', { code: grpcStatus.UNAVAILABLE });
  const api = await createApiAgainstOrigin(origin);
  await api.addRequestService({ host: '127.0.0.1', port: rpc.port, allowFallback });
  return {
    origin,
    rpc,
    api,
    stop: async () => {
      api.end();
      await origin.close();
      rpc.forceClose();
    },
  };
}

function settle(ms = ABSENCE_SETTLE_MS): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

async function rejection(api: Api, method: Method, options: RequestOptions): Promise<Error | undefined> {
  try {
    await api.request(method, '/channels/123/messages', options);
    return undefined;
  } catch (err) {
    return err as Error;
  }
}

describe('AC-4.4 — the request counter reads what it should before any M4 criterion relies on it', () => {
  it('reads 1 after one proxied JSON request (a member)', async () => {
    const { api, rpc, stop } = await rig('connected', false);
    const res = await api.request('POST', '/channels/123/messages', { data: { content: 'hi' } });
    const calls = rpc.requestCalls;
    await stop();

    expect(res.status).toBe(200);
    expect(calls).toBe(1);
  });

  it('reads 0 after one local: true request (a non-member)', async () => {
    const {
      api, rpc, origin, stop,
    } = await rig('connected', false);
    const res = await api.request('POST', '/channels/123/messages', { data: { content: 'hi' }, local: true });
    await settle();
    const calls = rpc.requestCalls;
    const receipts = origin.requestReceipts.length;
    await stop();

    expect(res.status).toBe(200);
    expect(calls).toBe(0);
    expect(receipts).toBe(1);
  });
});

describe('AC-4.1 — a form upload on the RPC proxy path fails at once and nothing is sent', () => {
  const STATES: RpcState[] = ['connected', 'latched-connecting'];
  const SOURCES: FormSource[] = ['createForm', 'data'];

  describe.each(STATES)('rpc state: %s', (state) => {
    describe.each([true, false])('allowFallback: %s', (allowFallback) => {
      describe.each(SOURCES)('form reached by: %s', (source) => {
        it.each(METHODS)('%s rejects stating the proxy cannot carry forms and naming local: true; no rpc request, no origin receipt', async (method) => {
          const {
            api, rpc, origin, stop,
          } = await rig(state, allowFallback);
          const err = await rejection(api, method, formOptions(source));
          await settle();
          const rpcCalls = rpc.requestCalls;
          const receipts = origin.requestReceipts.length;
          await stop();

          expect(err).toBeInstanceOf(Error);
          expect(err?.message).toMatch(/form upload/i);
          expect(err?.message).toContain('local: true');
          expect(rpcCalls).toBe(0);
          expect(receipts).toBe(0);
        });
      });
    });
  });
});

describe('AC-4.2 — requests the gate must not touch', () => {
  it('a createForm product whose data is not a FormData still proxies, and createForm runs once', async () => {
    const {
      api, rpc, origin, stop,
    } = await rig('connected', false);
    let formCalls = 0;
    const res = await api.request('POST', '/channels/123/messages', {
      createForm: () => { formCalls += 1; return { data: { content: 'plain' }, headers: { 'x-form': 'yes' } }; },
    });
    const rpcCalls = rpc.requestCalls;
    const receipts = origin.requestReceipts.length;
    await stop();

    expect(res.status).toBe(200);
    expect(formCalls).toBe(1);
    expect(rpcCalls).toBe(1);
    expect(receipts).toBe(1);
  });

  it('a latched client with fallback that sends a non-form createForm product locally calls createForm once', async () => {
    const {
      api, rpc, origin, stop,
    } = await rig('latched-connecting', true);
    let formCalls = 0;
    const res = await api.request('POST', '/channels/123/messages', {
      createForm: () => { formCalls += 1; return { data: { content: 'plain' } }; },
    });
    const rpcCalls = rpc.requestCalls;
    const receipts = origin.requestReceipts.length;
    await stop();

    expect(res.status).toBe(200);
    expect(formCalls).toBe(1);
    expect(rpcCalls).toBe(0);
    expect(receipts).toBe(1);
  });

  it.each(['createForm', 'data'] as FormSource[])('the same FormData request with local: true (%s) is sent locally as a multipart body', async (source) => {
    const {
      api, rpc, origin, stop,
    } = await rig('connected', false);
    const res = await api.request('POST', '/channels/123/messages', { ...formOptions(source), local: true });
    const rpcCalls = rpc.requestCalls;
    const [receipt] = origin.requestReceipts;
    const contentType = origin.receivedHeaders[0]?.['content-type'];
    await stop();

    expect(res.status).toBe(200);
    expect(rpcCalls).toBe(0);
    expect(origin.requestReceipts).toHaveLength(1);
    expect(receipt?.bodyReceived).toBe(true);
    expect(String(contentType)).toMatch(/^multipart\/form-data; boundary=/);
  });

  it.each(['createForm', 'data'] as FormSource[])('the same FormData request on a client with no request service (%s) is sent locally as a multipart body', async (source) => {
    const origin = await LoopbackApiOrigin.start();
    origin.setDefaultResponse(OK_RESPONSE);
    const api = await createApiAgainstOrigin(origin);
    const res = await api.request('POST', '/channels/123/messages', formOptions(source));
    const [receipt] = origin.requestReceipts;
    const contentType = origin.receivedHeaders[0]?.['content-type'];
    api.end();
    await origin.close();

    expect(res.status).toBe(200);
    expect(receipt?.bodyReceived).toBe(true);
    expect(String(contentType)).toMatch(/^multipart\/form-data; boundary=/);
  });
});
