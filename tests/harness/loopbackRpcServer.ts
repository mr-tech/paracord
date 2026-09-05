/* eslint-disable @typescript-eslint/no-explicit-any */
import * as grpc from '@grpc/grpc-js';
import { EventEmitter } from 'events';
import RpcServer from '../../src/rpc/server/RpcServer';

import type { UntypedServiceImplementation } from '@grpc/grpc-js';
import type { ServiceDefinition } from '@grpc/proto-loader';
import type RateLimitCache from '../../src/clients/Api/structures/RateLimitCache';
import type BaseRequest from '../../src/clients/Api/structures/BaseRequest';
import type { RateLimitState } from '../../src/clients/Api/types';

export type RpcMethodName = 'hello' | 'authorize' | 'update' | 'request';

/** A gRPC status code (and optional message) to hand back instead of running the real handler. */
export interface RpcFault {
  code: number;
  message?: string;
}

interface HarnessState {
  faults: Partial<Record<RpcMethodName, RpcFault>>;
  updateCount: number;
}

/**
 * A loopback `RpcServer` on `127.0.0.1:0`, running the real production service handlers
 * (`src/rpc/services/rateLimit/addService.ts` via `start()`, or
 * `src/rpc/services/request/addService.ts` via `startRequestService()` — D-20) — with an
 * `authorize` count exposed as data rather than parsed from its DEBUG log line (qa-P001
 * WP-9b Phase 1, "Telemetry Validation"). The count is taken by wrapping
 * `rateLimitCache.authorizeRequestFromClient` at the harness layer, the exact call
 * `addService.ts#authorize` makes once per RPC `authorize` — never by matching log text,
 * which the same Phase 1 pass calls out as brittle.
 *
 * WP-2 (qa-P001-2 Phase 1, "TESTING INFRASTRUCTURE NEEDED") adds per-method fault
 * injection: `injectFault` swaps the real `hello`/`authorize`/`update`/`request` handler
 * for an immediate `callback(Object.assign(new Error(...), { code }))` — the exact shape
 * qa's probe P-1 used — by wrapping `RpcServer#addService` before the real service is
 * registered, so an unfaulted call still runs the genuine production handler untouched.
 * `update` gets its own count and named wait (`updateCalls`/`waitForUpdate`), counted at
 * the same wrapper layer so a faulted call still counts as "reached the server" — the
 * positive-completion check qa's Phase 1 register (E-1..E-4) says every cell needs
 * before it reads its rejection count, so a cell that never ran isn't mistaken for one
 * that ran and found nothing wrong. `startRequestService()` (qa Phase 2, QA-2) stands up
 * the request service instead of the rate-limit one, for cells that must reach
 * `Api#handleRequestRemote` rather than `authorizeRequestWithServer` — the two guarded
 * request-path sites read the same predicate but are two different server registrations.
 *
 * On `loopbackGatewayServer.ts`'s contract: `port`, `url` (n/a for grpc, omitted),
 * `close()`, and a named wait (`waitForAuthorize`) in place of a fixed sleep (WP-1 step
 * 0, `tests/README.md`). `forceClose()` is step 3's second shutdown shape — `tryShutdown`
 * and `forceShutdown` carry different gRPC codes to an in-flight client (qa probe P-2).
 */
export default class LoopbackRpcServer extends EventEmitter {
  readonly server: RpcServer;

  private authorizeCount = 0;

  private readonly state: HarnessState;

  private constructor(server: RpcServer, private readonly boundPort: number, state: HarnessState) {
    super();
    this.server = server;
    this.state = state;

    const originalAuthorize = server.rateLimitCache.authorizeRequestFromClient.bind(server.rateLimitCache);
    server.rateLimitCache.authorizeRequestFromClient = (request: BaseRequest): RateLimitState => {
      const result = originalAuthorize(request);
      this.authorizeCount += 1;
      this.emit('authorize');
      return result;
    };
  }

  /**
   * Wraps `server.addService` so any subsequently-registered method can be faulted via
   * `state.faults`, before `register` calls the real `add*Service` (which is what
   * actually invokes `addService`). Shared by `start()` and `startRequestService()` so
   * the two service registrations fault-inject identically.
   */
  private static withFaultInjection(server: RpcServer, state: HarnessState, getInstance: () => LoopbackRpcServer | undefined, register: () => void): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalAddService = server.addService.bind(server) as (service: any, implementation: UntypedServiceImplementation) => void;
    server.addService = ((service: ServiceDefinition, implementation: UntypedServiceImplementation) => {
      const wrapped: UntypedServiceImplementation = {};
      (Object.keys(implementation) as RpcMethodName[]).forEach((name) => {
        const original = implementation[name];
        wrapped[name] = (call: any, callback: any) => {
          if (name === 'update') {
            state.updateCount += 1;
            getInstance()?.emit('update');
          }
          const fault = state.faults[name];
          if (fault) {
            callback(Object.assign(new Error(fault.message ?? `injected ${name} fault`), {
              code: fault.code,
              details: fault.message ?? `injected ${name} fault`,
            }));
            return;
          }
          original(call, callback);
        };
      });
      originalAddService(service, wrapped);
    }) as typeof server.addService;

    register();
  }

  static start(): Promise<LoopbackRpcServer> {
    return new Promise((resolve, reject) => {
      const server = new RpcServer({ host: '127.0.0.1', port: 0 });
      const state: HarnessState = { faults: {}, updateCount: 0 };
      let instance: LoopbackRpcServer | undefined;

      LoopbackRpcServer.withFaultInjection(server, state, () => instance, () => server.addRateLimitService());

      server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
          reject(err);
          return;
        }
        instance = new LoopbackRpcServer(server, port, state);
        resolve(instance);
      });
    });
  }

  /** The request-service twin of `start()` — stands up `addRequestService` instead. */
  static startRequestService(token = 'test-token'): Promise<LoopbackRpcServer> {
    return new Promise((resolve, reject) => {
      const server = new RpcServer({ host: '127.0.0.1', port: 0 });
      const state: HarnessState = { faults: {}, updateCount: 0 };
      let instance: LoopbackRpcServer | undefined;

      LoopbackRpcServer.withFaultInjection(server, state, () => instance, () => server.addRequestService(token));

      server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
          reject(err);
          return;
        }
        instance = new LoopbackRpcServer(server, port, state);
        resolve(instance);
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

  /** Number of times the `update` handler has been invoked, faulted or not. */
  get updateCalls(): number {
    return this.state.updateCount;
  }

  /** The server's own rate limit cache — public on `RpcServer`, read directly by AC-9.4. */
  get rateLimitCache(): RateLimitCache {
    return this.server.rateLimitCache;
  }

  /**
   * Makes every subsequent call to `method` reject immediately with `fault.code`
   * instead of running the real handler — the two-line shape qa's probe P-1 used
   * (`callback(Object.assign(new Error(msg), { code, details }))`).
   */
  injectFault(method: RpcMethodName, fault: RpcFault): void {
    this.state.faults[method] = fault;
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

  /** Resolves once the server has recorded at least `n` `update` calls (faulted or not). */
  waitForUpdate(n: number, timeoutMs = 5000): Promise<void> {
    if (this.state.updateCount >= n) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('update', check);
        reject(new Error(`waitForUpdate timed out after ${timeoutMs}ms waiting for call ${n} (have ${this.state.updateCount})`));
      }, timeoutMs);
      const check = () => {
        if (this.state.updateCount >= n) {
          clearTimeout(timer);
          this.off('update', check);
          resolve();
        }
      };
      this.on('update', check);
    });
  }

  /** Graceful shutdown: lets in-flight calls finish. A call issued after this rejects UNAVAILABLE (14). */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.tryShutdown((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /** Abrupt shutdown: destroys connections immediately. An in-flight call rejects CANCELLED (1) (qa probe P-2). */
  forceClose(): void {
    this.server.forceShutdown();
  }
}
