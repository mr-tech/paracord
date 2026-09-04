import * as grpc from '@grpc/grpc-js';
import { EventEmitter } from 'events';
import RpcServer from '../../src/rpc/server/RpcServer';

import type RateLimitCache from '../../src/clients/Api/structures/RateLimitCache';
import type BaseRequest from '../../src/clients/Api/structures/BaseRequest';
import type { RateLimitState } from '../../src/clients/Api/types';

/**
 * A loopback rate-limit `RpcServer` on `127.0.0.1:0`, running the real
 * `addRateLimitService` (`src/rpc/services/rateLimit/addService.ts`) — the production
 * path (D-20) — with an `authorize` count exposed as data rather than parsed from its
 * DEBUG log line (qa-P001 WP-9b Phase 1, "Telemetry Validation"). The count is taken by
 * wrapping `rateLimitCache.authorizeRequestFromClient` at the harness layer, the exact
 * call `addService.ts#authorize` makes once per RPC `authorize` — never by matching log
 * text, which the same Phase 1 pass calls out as brittle.
 *
 * On `loopbackGatewayServer.ts`'s contract: `port`, `url` (n/a for grpc, omitted),
 * `close()`, and a named wait (`waitForAuthorize`) in place of a fixed sleep (WP-1 step
 * 0, `tests/README.md`).
 */
export default class LoopbackRpcServer extends EventEmitter {
  readonly server: RpcServer;

  private authorizeCount = 0;

  private constructor(server: RpcServer, private readonly boundPort: number) {
    super();
    this.server = server;

    const originalAuthorize = server.rateLimitCache.authorizeRequestFromClient.bind(server.rateLimitCache);
    server.rateLimitCache.authorizeRequestFromClient = (request: BaseRequest): RateLimitState => {
      const result = originalAuthorize(request);
      this.authorizeCount += 1;
      this.emit('authorize');
      return result;
    };
  }

  static start(): Promise<LoopbackRpcServer> {
    return new Promise((resolve, reject) => {
      const server = new RpcServer({ host: '127.0.0.1', port: 0 });
      server.addRateLimitService();
      server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(new LoopbackRpcServer(server, port));
      });
    });
  }

  get port(): number {
    return this.boundPort;
  }

  /** Number of times the server has authorized (or denied) a request so far. */
  get authorizeCalls(): number {
    return this.authorizeCount;
  }

  /** The server's own rate limit cache — public on `RpcServer`, read directly by AC-9.4. */
  get rateLimitCache(): RateLimitCache {
    return this.server.rateLimitCache;
  }

  /** Resolves once the server has recorded at least `n` `authorize` calls. */
  waitForAuthorize(n: number, timeoutMs = 5000): Promise<void> {
    if (this.authorizeCount >= n) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('authorize', check);
        reject(new Error(`waitForAuthorize timed out after ${timeoutMs}ms waiting for call ${n} (have ${this.authorizeCount})`));
      }, timeoutMs);
      const check = () => {
        if (this.authorizeCount >= n) {
          clearTimeout(timer);
          this.off('authorize', check);
          resolve();
        }
      };
      this.on('authorize', check);
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.tryShutdown((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
