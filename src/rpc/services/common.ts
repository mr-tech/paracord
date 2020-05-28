/* eslint-disable no-sync */
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

/**
 * Load in a protobuf from a file.
 *
 * @param proto Name of the proto file.
 */
export function loadProto(proto: string) {
  const protoPath = __filename.replace(
    'services/common.js',
    `protobufs/${proto}.proto`,
  );

  return protoLoader.loadSync(protoPath, {
    keepCase: true,
  });
}

/**
 * Create the proto definition from a loaded into protobuf.
 *
 * @param {string} proto Name of the proto file.
 */
export function loadProtoDefinition(proto: string) {
  return grpc.loadPackageDefinition(exports.loadProto(proto));
}

/**
 * Create the parameters passed to a service definition constructor.
 *
 * @param {ServiceOptions} options
 */
export function constructorDefaults(options: ServiceOptions) {
  const host = options.host || '127.0.0.1';
  const port = options.port || '50051';
  const channel = options.channel || grpc.ChannelCredentials.createInsecure();

  return { dest: `${host}:${port}`, channel, protoOptions: { keepCase: true } };
}
