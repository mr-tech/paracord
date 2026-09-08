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

export interface RpcFault {
  code: number;
  message?: string;
}

interface HarnessState {
  faults: Partial<Record<RpcMethodName, RpcFault>>;
  withholds: Partial<Record<RpcMethodName, true>>;
  forwardThenFail: Partial<Record<RpcMethodName, RpcFault>>;
  forwardThenWithhold: Partial<Record<RpcMethodName, true>>;
  updateCount: number;
  helloCount: number;
}

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
          if (state.withholds[name]) return;
          const fault = state.faults[name];
          if (fault) {
            callback(Object.assign(new Error(fault.message ?? `injected ${name} fault`), {
              code: fault.code,
              details: fault.message ?? `injected ${name} fault`,
            }));
            return;
          }

          const forwardThenFailFault = state.forwardThenFail[name];
          const shouldForwardThenWithhold = state.forwardThenWithhold[name];
          if (forwardThenFailFault !== undefined || shouldForwardThenWithhold) {
            original(call, (..._realArgs: any[]) => {
              if (shouldForwardThenWithhold) return;
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

  get authorizeCalls(): number {
    return this.authorizeCount;
  }

  get updateCalls(): number {
    return this.state.updateCount;
  }

  get helloCalls(): number {
    return this.state.helloCount;
  }

  get rateLimitCache(): RateLimitCache {
    return this.server.rateLimitCache;
  }

  injectFault(method: RpcMethodName, fault: RpcFault): void {
    this.state.faults[method] = fault;
  }

  clearFault(method: RpcMethodName): void {
    delete this.state.faults[method];
  }

  withhold(method: RpcMethodName): void {
    this.state.withholds[method] = true;
  }

  release(method: RpcMethodName): void {
    delete this.state.withholds[method];
  }

  forwardThenFail(method: RpcMethodName, fault: RpcFault): void {
    this.state.forwardThenFail[method] = fault;
  }

  clearForwardThenFail(method: RpcMethodName): void {
    delete this.state.forwardThenFail[method];
  }

  forwardThenWithhold(method: RpcMethodName): void {
    this.state.forwardThenWithhold[method] = true;
  }

  clearForwardThenWithhold(method: RpcMethodName): void {
    delete this.state.forwardThenWithhold[method];
  }

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

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.tryShutdown((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  forceClose(): void {
    this.server.forceShutdown();
  }
}
