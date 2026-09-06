import type LoopbackApiOrigin from './loopbackApiOrigin';
import type Api from '../../src/clients/Api/Api';
import type { ApiOptions } from '../../src/clients/Api/types';

/**
 * Per-party attribution at the origin for the D-49 resend gate (AC-7.6), shared by
 * `tests/api/rpcProxyResendGate.test.ts` and `tests/timing/rpcProxyResendGate-withhold.test.ts`.
 *
 * The proxy's own `Api` is tagged with a distinguishing request header
 * (`Api.createWrappedRequestMethod` spreads `requestOptions.headers` into every outgoing
 * request), so the origin's `receivedHeaders` attribute each receipt to proxy or client
 * directly — never by subtraction, which gives a false positive under a non-2xx origin
 * or a waited-out 429. `clientReceipts` is the exact complement of `proxyReceipts` over
 * the same array, so their sum always equals the receipt count; a cell that needs to
 * check the labelling itself reads receipt order, not these counts.
 */
export const PARTY_HEADER = 'x-wp7-party';
export const PROXY_OPTIONS: ApiOptions = { requestOptions: { headers: { [PARTY_HEADER]: 'proxy' } } };

export function proxyReceipts(origin: LoopbackApiOrigin): number {
  return origin.receivedHeaders.filter((h) => h[PARTY_HEADER] === 'proxy').length;
}

export function clientReceipts(origin: LoopbackApiOrigin): number {
  return origin.receivedHeaders.filter((h) => h[PARTY_HEADER] !== 'proxy').length;
}

export async function requestOutcome(
  api: Api,
  method: string,
): Promise<{ resolved: boolean; status?: number; code?: unknown }> {
  return api.request(method as never, '/channels/1/messages', { data: { content: 'hi' } }).then(
    (res) => ({ resolved: true, status: res.status }),
    (err: { code?: unknown }) => ({ resolved: false, code: err.code }),
  );
}
