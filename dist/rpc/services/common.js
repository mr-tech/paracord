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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeOptionsWithDefaults = exports.withCallDeadline = exports.RPC_CALL_DEADLINE_MS = exports.loadProtoDefinition = exports.loadProto = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
function loadProto(proto) {
    const protoPath = path_1.default.join(__dirname, '..', 'protobufs', `${proto}.proto`);
    return protoLoader.loadSync(protoPath, { keepCase: true });
}
exports.loadProto = loadProto;
/**
 * Create the proto definition from a loaded into protobuf.
 * @param proto Name of the proto file.
 */
function loadProtoDefinition(proto) {
    return grpc.loadPackageDefinition(loadProto(proto));
}
exports.loadProtoDefinition = loadProtoDefinition;
exports.RPC_CALL_DEADLINE_MS = 10000;
function withCallDeadline() {
    return { deadline: new Date(Date.now() + exports.RPC_CALL_DEADLINE_MS) };
}
exports.withCallDeadline = withCallDeadline;
/**
 * Create the parameters passed to a service definition constructor.
 * @param options
 */
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
