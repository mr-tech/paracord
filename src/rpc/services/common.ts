import grpc, { GrpcObject } from '@grpc/grpc-js';
import protoLoader, { PackageDefinition } from '@grpc/proto-loader';

import type { IServerOptions } from '../../@types';

/**
 * Load in a protobuf from a file.
 * @param proto Name of the proto file.
 */
export function loadProto<T extends PackageDefinition>(proto: string): T {
  const protoPath = __filename.replace(
    'services/common.js',
    `protobufs/${proto}.proto`,
  );

  return protoLoader.loadSync(protoPath, { keepCase: true }) as T;
}

/**
 * Create the proto definition from a loaded into protobuf.
 * @param proto Name of the proto file.
 */
export function loadProtoDefinition(proto: string): GrpcObject {
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
