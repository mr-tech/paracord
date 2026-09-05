import { RPC_CLOSE_CODES } from '../../../constants';

/**
 * gRPC status codes that represent a transport failure — the RPC server or the
 * connection to it is unreachable — rather than the server rejecting the request's own
 * content. UNAVAILABLE (14, `RPC_CLOSE_CODES.LOST_CONNECTION`) and DEADLINE_EXCEEDED (4)
 * are transport by definition; CANCELLED (1) is what a mid-call server kill carries;
 * INTERNAL (13) is included because grpc-js reports HTTP/2 stream and protocol failures
 * (RST_STREAM, frame errors) under it. UNKNOWN (2) is deliberately excluded: it means a
 * server handler threw, so the server is reachable and serving. Exhaustive over the 16
 * non-OK canonical codes — nothing outside these four counts as a transport failure.
 *
 * Not exported through `structures/index.ts` or the package entry, so a new member here
 * does not move `api-report/paracord.api.md` — the same shape as `extractRetryAfter.ts`
 * and `rateLimitRetryTarget.ts`.
 */
const RPC_TRANSPORT_FAILURE_CODES: readonly number[] = [
  RPC_CLOSE_CODES.LOST_CONNECTION, 4, 1, 13,
];

/**
 * Whether an RPC client error's `code` is a transport failure — the RPC server or the
 * connection to it is unreachable — rather than the server rejecting the request's own
 * content.
 */
export default function isRpcTransportFailure(code: number | undefined): boolean {
  return code !== undefined && RPC_TRANSPORT_FAILURE_CODES.includes(code);
}
