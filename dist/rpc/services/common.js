"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeOptionsWithDefaults = exports.loadProtoDefinition = exports.loadProto = void 0;
const grpc_js_1 = __importDefault(require("@grpc/grpc-js"));
const proto_loader_1 = __importDefault(require("@grpc/proto-loader"));
function loadProto(proto) {
    const protoPath = __filename.replace('services/common.js', `protobufs/${proto}.proto`);
    return proto_loader_1.default.loadSync(protoPath, { keepCase: true });
}
exports.loadProto = loadProto;
function loadProtoDefinition(proto) {
    return grpc_js_1.default.loadPackageDefinition(loadProto(proto));
}
exports.loadProtoDefinition = loadProtoDefinition;
function mergeOptionsWithDefaults(options) {
    const host = options.host ?? '127.0.0.1';
    const port = options.port ?? '50051';
    const channel = options.channel ?? grpc_js_1.default.ChannelCredentials.createInsecure();
    const allowFallback = options.allowFallback ?? false;
    return {
        host, port, channel, allowFallback,
    };
}
exports.mergeOptionsWithDefaults = mergeOptionsWithDefaults;
