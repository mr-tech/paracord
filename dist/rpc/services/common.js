"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeOptionsWithDefaults = exports.loadProtoDefinition = exports.loadProto = void 0;
const protoLoader = require('@grpc/proto-loader');
const grpc = require('@grpc/grpc-js');
function loadProto(proto) {
    const protoPath = __filename.replace('services/common.js', `protobufs/${proto}.proto`);
    return protoLoader.loadSync(protoPath, {
        keepCase: true,
    });
}
exports.loadProto = loadProto;
function loadProtoDefinition(proto) {
    return grpc.loadPackageDefinition(exports.loadProto(proto));
}
exports.loadProtoDefinition = loadProtoDefinition;
function mergeOptionsWithDefaults(options) {
    const host = options.host || '127.0.0.1';
    const port = options.port || '50051';
    const channel = options.channel || grpc.ChannelCredentials.createInsecure();
    const allowFallback = options.allowFallback || false;
    return {
        host, port, channel, allowFallback, protoOptions: { keepCase: true },
    };
}
exports.mergeOptionsWithDefaults = mergeOptionsWithDefaults;
