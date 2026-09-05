import { describe, it, expect } from 'vitest';
import { status as grpcStatus } from '@grpc/grpc-js';
import isRpcTransportFailure from '../../src/clients/Api/structures/isRpcTransportFailure';

/**
 * Plan 001 WP-2 step 2: one predicate replaces four literal
 * `err.code === RPC_CLOSE_CODES.LOST_CONNECTION` comparisons. The transport set is
 * exhaustive over the 16 non-OK canonical gRPC status codes: {UNAVAILABLE 14,
 * DEADLINE_EXCEEDED 4, CANCELLED 1, INTERNAL 13} are in; the other 12, including
 * UNKNOWN 2 (a server handler threw — the server is reachable and serving), are out.
 */
describe('isRpcTransportFailure (WP-2 step 2)', () => {
  const TRANSPORT_SET = new Set([
    grpcStatus.UNAVAILABLE, grpcStatus.DEADLINE_EXCEEDED, grpcStatus.CANCELLED, grpcStatus.INTERNAL,
  ]);

  it('is exhaustive over every non-OK canonical gRPC status code', () => {
    const nonOk = Object.entries(grpcStatus).filter(([k, v]) => typeof v === 'number' && k !== 'OK');
    expect(nonOk).toHaveLength(16);
    nonOk.forEach(([, code]) => {
      expect(isRpcTransportFailure(code as number)).toBe(TRANSPORT_SET.has(code as number));
    });
  });

  it('excludes UNKNOWN specifically — the server is reachable and its own handler threw', () => {
    expect(isRpcTransportFailure(grpcStatus.UNKNOWN)).toBe(false);
  });

  it('returns false for undefined (an error carrying no gRPC code at all)', () => {
    expect(isRpcTransportFailure(undefined)).toBe(false);
  });
});
