import { describe, it, expect } from 'vitest';
import { loadProto } from '../../src/rpc/services/common';
import RpcServer from '../../src/rpc/server/RpcServer';

import type { PackageDefinition, ServiceDefinition } from '@grpc/proto-loader';

interface RateLimitPackage extends PackageDefinition {
  RateLimitService: ServiceDefinition;
}

interface RequestPackage extends PackageDefinition {
  RequestService: ServiceDefinition;
}

describe('loadProto resolves by directory (AC-9.11)', () => {
  it('loads rate_limit.proto under the vitest module loader (src/, .ts)', () => {
    const def = loadProto<RateLimitPackage>('rate_limit');
    expect(Object.keys(def)).toContain('RateLimitService');
    expect(Object.keys(def.RateLimitService)).toEqual(
      expect.arrayContaining(['hello', 'authorize', 'update']),
    );
  });

  it('loads request.proto under the vitest module loader (src/, .ts)', () => {
    const def = loadProto<RequestPackage>('request');
    expect(Object.keys(def)).toContain('RequestService');
    expect(Object.keys(def.RequestService)).toEqual(
      expect.arrayContaining(['hello', 'request']),
    );
  });

  it('negative control (AC-9.11): RpcServer#addRateLimitService no longer throws under vitest', () => {
    const server = new RpcServer({ port: 0 });
    expect(() => server.addRateLimitService()).not.toThrow();
  });
});
