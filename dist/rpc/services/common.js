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
    var _a, _b, _c, _d;
    const host = (_a = options.host) !== null && _a !== void 0 ? _a : '127.0.0.1';
    const port = (_b = options.port) !== null && _b !== void 0 ? _b : '50051';
    const channel = (_c = options.channel) !== null && _c !== void 0 ? _c : grpc.ChannelCredentials.createInsecure();
    const allowFallback = (_d = options.allowFallback) !== null && _d !== void 0 ? _d : false;
    return {
        host, port, channel, allowFallback,
    };
}
exports.mergeOptionsWithDefaults = mergeOptionsWithDefaults;
