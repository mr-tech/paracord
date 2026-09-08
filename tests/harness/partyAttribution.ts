import type LoopbackApiOrigin from './loopbackApiOrigin';
import type Api from '../../src/clients/Api/Api';
import type { ApiOptions } from '../../src/clients/Api/types';

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
