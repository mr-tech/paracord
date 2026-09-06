/* eslint-disable @typescript-eslint/no-explicit-any */
import * as grpc from '@grpc/grpc-js';
import { EventEmitter } from 'events';
import RpcServer from '../../src/rpc/server/RpcServer';
import { createApiAgainstOrigin } from './loopbackApiOrigin';

import type { UntypedServiceImplementation } from '@grpc/grpc-js';
import type { ServiceDefinition } from '@grpc/proto-loader';
import type RateLimitCache from '../../src/clients/Api/structures/RateLimitCache';
import type BaseRequest from '../../src/clients/Api/structures/BaseRequest';
import type { ApiOptions, RateLimitState } from '../../src/clients/Api/types';
import type LoopbackApiOrigin from './loopbackApiOrigin';

export type RpcMethodName = 'hello' | 'authorize' | 'update' | 'request';

/** A gRPC status code (and optional message) to hand back instead of running the real handler. */
export interface RpcFault {
  code: number;
  message?: string;
}

interface HarnessState {
  faults: Partial<Record<RpcMethodName, RpcFault>>;
  /** WP-6 step 3: per method, standing until cleared. A withheld handler never calls back. */
  withholds: Partial<Record<RpcMethodName, true>>;
  /**
   * WP-7 step 6: per method, standing until cleared. The real handler runs to
   * completion — a genuine forward reaches whatever `apiClient` is wired to — and its
   * result is discarded; the client is answered with `fault.code` instead. Distinct from
   * `faults`, which never runs the real handler at all.
   */
  forwardThenFail: Partial<Record<RpcMethodName, RpcFault>>;
  /**
   * WP-7 step 6: per method, standing until cleared. The real handler runs to
   * completion (a genuine forward), and its result is discarded — the client is never
   * answered, exactly like `withholds`, but only once the real handler has settled.
   */
  forwardThenWithhold: Partial<Record<RpcMethodName, true>>;
  updateCount: number;
  helloCount: number;
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
 *
 * WP-6 step 3 adds a per-method withhold mode (`withhold`/`release`): a withheld call
 * reaches the handler, is counted, and then never calls back — the stream stays open
 * until the client's own deadline fires or the server is force-shut-down. It takes
 * precedence over an injected fault (both are checked in the same wrapper, withhold
 * first) and is installed on `RpcServer#addService` before registration, exactly like
 * fault injection, so a withhold persists across the client's own recreate — the server
 * side never changes. **A withheld stream does not resolve `close()`** (`tryShutdown`
 * waits for it to drain); tear one down with `forceClose()`. `helloCalls`/`waitForHello`
 * mirror `updateCalls`/`waitForUpdate` and are counted at the same wrapper layer — before
 * the withhold or fault check, so a withheld or faulted `hello` still counts as "reached
 * the server". `authorizeCalls` is a different layer (wraps the real rate-limit-cache
 * call, so it only increments once the real handler runs) and reads 0 under a withhold or
 * fault on `authorize` even though the call did reach the server — the two counters feed
 * on different events and neither reading is wrong for what it feeds on.
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
          if (name === 'hello') {
            state.helloCount += 1;
            getInstance()?.emit('hello');
          }
          // Withhold takes precedence over fault; the counters above have already run,
          // so a withheld call still reads as "reached the server".
          if (state.withholds[name]) return;
          const fault = state.faults[name];
          if (fault) {
            callback(Object.assign(new Error(fault.message ?? `injected ${name} fault`), {
              code: fault.code,
              details: fault.message ?? `injected ${name} fault`,
            }));
            return;
          }

          // WP-7 step 6: unlike `withholds`/`faults` above, the real handler runs to
          // completion — a genuine forward — and only its outcome is intercepted, at the
          // callback the real handler would have used to answer the client.
          const forwardThenFailFault = state.forwardThenFail[name];
          const shouldForwardThenWithhold = state.forwardThenWithhold[name];
          if (forwardThenFailFault !== undefined || shouldForwardThenWithhold) {
            original(call, (..._realArgs: any[]) => {
              if (shouldForwardThenWithhold) return; // the forward completed; the client is never answered.
              callback(Object.assign(new Error(forwardThenFailFault!.message ?? `forward-then-fail ${name}`), {
                code: forwardThenFailFault!.code,
                details: forwardThenFailFault!.message ?? `forward-then-fail ${name}`,
              }));
            });
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
      const state: HarnessState = {
        faults: {}, withholds: {}, forwardThenFail: {}, forwardThenWithhold: {}, updateCount: 0, helloCount: 0,
      };
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

  /**
   * The request-service twin of `start()` — stands up `addRequestService` instead.
   *
   * WP-7 step 6 (a), qa WP7-F4 (`491c1b9`, arm M2 — the only viable mechanism measured;
   * N1, the pattern every current `startRequestService` consumer used before this,
   * reaches `https://discord.com` live, and `requestOptions.baseURL` (E1) is not a
   * route at all): when `origin` is given, the proxy's own `apiClient` — set by
   * `addRequestService` to an `Api` pointed at Discord's real REST base — is
   * **overwritten**, after registration, with one built the same way
   * `createApiAgainstOrigin` builds any other test-only `Api`, pointed at `origin`
   * instead. This is the *only* place a proxied forward is made loopback-safe; a test
   * that wants a real forward to reach a controllable origin must pass `origin` here
   * rather than reaching into `server.apiClient` itself, so the unsafe N1 pattern has
   * nowhere to be written by accident.
   */
  static startRequestService(token = 'test-token', origin?: LoopbackApiOrigin, apiOptions: ApiOptions = {}): Promise<LoopbackRpcServer> {
    return new Promise((resolve, reject) => {
      const server = new RpcServer({ host: '127.0.0.1', port: 0 });
      const state: HarnessState = {
        faults: {}, withholds: {}, forwardThenFail: {}, forwardThenWithhold: {}, updateCount: 0, helloCount: 0,
      };
      let instance: LoopbackRpcServer | undefined;

      LoopbackRpcServer.withFaultInjection(server, state, () => instance, () => server.addRequestService(token, apiOptions));

      server.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
          reject(err);
          return;
        }
        (async () => {
          if (origin !== undefined) {
            server.apiClient = await createApiAgainstOrigin(origin, token, apiOptions);
          }
          instance = new LoopbackRpcServer(server, port, state);
          resolve(instance);
        })().catch(reject);
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

  /** Number of times the `hello` handler has been invoked, withheld or faulted or not. */
  get helloCalls(): number {
    return this.state.helloCount;
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

  /** Clears a fault previously set by `injectFault`; the real handler runs again. */
  clearFault(method: RpcMethodName): void {
    delete this.state.faults[method];
  }

  /**
   * Every subsequent call to `method` reaches the handler, is counted, and then never
   * calls back — the stream stays open until the client's own deadline fires or the
   * server is force-shut-down (`forceClose()`; `close()` does not resolve while a call is
   * held). Per method, standing until `release`d.
   */
  withhold(method: RpcMethodName): void {
    this.state.withholds[method] = true;
  }

  /** Clears a withhold. A call already held is not released — only `forceClose()` ends it. */
  release(method: RpcMethodName): void {
    delete this.state.withholds[method];
  }

  /**
   * WP-7 step 6, AC-7.6's trigger class (14, 1, 13): every subsequent call to `method`
   * reaches the real handler and completes a genuine forward — the origin sees it,
   * counted like any other request — and the client is then answered with `fault.code`
   * instead of the real result. Requires `origin` to have been passed to
   * `startRequestService`, or the "forward" reaches Discord's real API (WP7-F4).
   */
  forwardThenFail(method: RpcMethodName, fault: RpcFault): void {
    this.state.forwardThenFail[method] = fault;
  }

  /** Clears a `forwardThenFail`; the real handler answers normally again. */
  clearForwardThenFail(method: RpcMethodName): void {
    delete this.state.forwardThenFail[method];
  }

  /**
   * WP-7 step 6, AC-7.6's trigger class (4, the client's own deadline): every subsequent
   * call to `method` reaches the real handler and completes a genuine forward, and the
   * client is then never answered — the same shape as `withhold`, but only once the real
   * forward has settled. Tear down with `forceClose()`, never `close()` (WP6-F4's
   * precedent: `close()` waits for the held stream to drain).
   */
  forwardThenWithhold(method: RpcMethodName): void {
    this.state.forwardThenWithhold[method] = true;
  }

  /** Clears a `forwardThenWithhold`. A call already held is not released. */
  clearForwardThenWithhold(method: RpcMethodName): void {
    delete this.state.forwardThenWithhold[method];
  }

  /** Resolves once the server has recorded at least `n` `hello` calls (withheld, faulted or not). */
  waitForHello(n: number, timeoutMs = 5000): Promise<void> {
    if (this.state.helloCount >= n) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('hello', check);
        reject(new Error(`waitForHello timed out after ${timeoutMs}ms waiting for call ${n} (have ${this.state.helloCount})`));
      }, timeoutMs);
      const check = () => {
        if (this.state.helloCount >= n) {
          clearTimeout(timer);
          this.off('hello', check);
          resolve();
        }
      };
      this.on('hello', check);
    });
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
