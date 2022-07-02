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
const grpc = __importStar(require("@grpc/grpc-js"));
const clients_1 = require("../../clients");
const constants_1 = require("../../constants");
const services_1 = require("../services");
class RpcServer extends grpc.Server {
    emitter;
    apiClient;
    rateLimitCache;
    #host;
    #port;
    #channel;
    constructor(options = {}) {
        super();
        const { host, port, channel, emitter, globalRateLimitMax, globalRateLimitResetPadding, apiClient, } = options;
        this.#host = host ?? '127.0.0.1';
        this.#port = port ?? '50051';
        this.#channel = channel ?? grpc.ServerCredentials.createInsecure();
        this.emitter = emitter;
        this.apiClient = apiClient;
        this.rateLimitCache = new clients_1.RateLimitCache(false, globalRateLimitMax ?? constants_1.API_GLOBAL_RATE_LIMIT, globalRateLimitResetPadding ?? constants_1.API_GLOBAL_RATE_LIMIT_RESET_PADDING_MILLISECONDS, apiClient);
    }
    get bindArgs() {
        const callback = (e) => {
            if (e !== null) {
                this.emit('DEBUG', {
                    source: constants_1.LOG_SOURCES.RPC,
                    level: constants_1.LOG_LEVELS.FATAL,
                    message: e.message,
                });
            }
            else {
                try {
                    this.start();
                }
                catch (err) {
                    if (err.message === 'server must be bound in order to start') {
                        console.error('server must be bound in order to start. maybe this host:port is already in use?');
                    }
                }
                const message = `Rpc server running at http://${this.#host}:${this.#port}`;
                this.emit('DEBUG', {
                    source: constants_1.LOG_SOURCES.RPC,
                    level: constants_1.LOG_LEVELS.INFO,
                    message,
                });
            }
        };
        return [`${this.#host}:${this.#port}`, this.#channel, callback];
    }
    addRequestService(token, apiOptions = {}) {
        (0, services_1.addRequestService)(this, token, apiOptions);
    }
    addRateLimitService() {
        (0, services_1.addRateLimitService)(this);
    }
    serve() {
        const [dest, channel, callback] = this.bindArgs;
        this.bindAsync(dest, channel, callback);
    }
    log(level, message) {
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.RPC,
            level: constants_1.LOG_LEVELS[level],
            message,
        });
    }
    emit(type, event) {
        this.emitter && this.emitter.emit(type, event);
    }
}
exports.default = RpcServer;
