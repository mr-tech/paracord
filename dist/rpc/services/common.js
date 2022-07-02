"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeOptionsWithDefaults = exports.loadProtoDefinition = exports.loadProto = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
function loadProto(proto) {
    const protoPath = __filename.replace('services/common.js', `protobufs/${proto}.proto`);
    return protoLoader.loadSync(protoPath, { keepCase: true });
}
exports.loadProto = loadProto;
function loadProtoDefinition(proto) {
    return grpc.loadPackageDefinition(loadProto(proto));
}
exports.loadProtoDefinition = loadProtoDefinition;
function mergeOptionsWithDefaults(options) {
    const host = options.host ?? '127.0.0.1';
    const port = options.port ?? '50051';
    const channel = options.channel ?? grpc.ChannelCredentials.createInsecure();
    const allowFallback = options.allowFallback ?? false;
    return {
        host, port, channel, allowFallback,
    };
}
exports.mergeOptionsWithDefaults = mergeOptionsWithDefaults;
