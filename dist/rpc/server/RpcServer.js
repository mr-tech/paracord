"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grpc_js_1 = __importDefault(require("@grpc/grpc-js"));
const clients_1 = require("../../clients");
const constants_1 = require("../../constants");
const services_1 = require("../services");
class RpcServer extends grpc_js_1.default.Server {
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
        this.#channel = channel ?? grpc_js_1.default.ServerCredentials.createInsecure();
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
