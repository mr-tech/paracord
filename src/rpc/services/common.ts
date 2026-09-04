import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

import type { IServerOptions } from '../../@types';

/**
 * Load in a protobuf from a file.
 *
 * Resolves by directory, not by filename surgery: `protobufs/` is always the sibling of
 * this module's own directory (`services/`), under both `dist/rpc/services/common.js`
 * (the build copies `src/rpc/protobufs` to `dist/rpc/protobufs` alongside it) and
 * `src/rpc/services/common.ts` (vitest runs the source directly). A filename-based
 * rewrite of the compiled name is a no-op against the `.ts` filename vitest presents,
 * which hands protobufjs the module's own source file instead of a `.proto`.
 * @param proto Name of the proto file.
 */
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
