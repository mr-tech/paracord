import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

import type { IServerOptions } from '../../@types';

export function loadProto<T extends protoLoader.PackageDefinition>(proto: string): T {
  const protoPath = path.join(__dirname, '..', 'protobufs', `${proto}.proto`);

  return protoLoader.loadSync(protoPath, { keepCase: true }) as T;
}

/**
 * Create the proto definition from a loaded into protobuf.
 * @param proto Name of the proto file.
 */
export function loadProtoDefinition(proto: string): grpc.GrpcObject {
  return grpc.loadPackageDefinition(loadProto(proto));
}

const openCalls = new WeakMap<object, Set<grpc.ClientUnaryCall>>();

export function trackCall<T extends grpc.ClientUnaryCall>(client: object, call: T): T {
  let calls = openCalls.get(client);
  if (calls === undefined) {
    calls = new Set();
    openCalls.set(client, calls);
  }
  const tracked = calls;
  tracked.add(call);
  call.once('status', () => { tracked.delete(call); });
  return call;
}

export function cancelOpenCalls(client: object): void {
  openCalls.get(client)?.forEach((call) => call.cancel());
}

export const RPC_CALL_DEADLINE_MS = 10_000;

export function withCallDeadline(): grpc.CallOptions {
  return { deadline: new Date(Date.now() + RPC_CALL_DEADLINE_MS) };
}

/**
 * Create the parameters passed to a service definition constructor.
 * @param options
 */
export function mergeOptionsWithDefaults(options: Partial<IServerOptions>): IServerOptions {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? '50051';
  const channel = options.channel ?? grpc.ChannelCredentials.createInsecure();
  const allowFallback = options.allowFallback ?? false;

  return {
    host, port, channel, allowFallback,
  };
}
