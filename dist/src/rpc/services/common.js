"use strict";
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
exports.loadProto = function (proto) {
    const protopath = __filename.replace('services/common.js', `protobufs/${proto}.proto`);
    return protoLoader.loadSync(protopath, {
        keepCase: true,
    });
};
exports.loadProtoDefinition = function (proto) {
    return grpc.loadPackageDefinition(exports.loadProto(proto));
};
exports.constructorDefaults = function (options) {
    const host = options.host || '127.0.0.1';
    const port = options.port || '50051';
    const channel = options.channel || grpc.ChannelCredentials.createInsecure();
    return [`${host}:${port}`, channel, { keepCase: true }];
};
