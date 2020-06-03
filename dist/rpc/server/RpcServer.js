"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structures_1 = require("../../clients/Api/structures");
const constants_1 = require("../../constants");
const services_1 = require("../services");
const grpc = require('@grpc/grpc-js');
class RpcServer extends grpc.Server {
    constructor(options = {}) {
        super();
        const { host, port, channel, emitter, apiClient, identifyLock, } = options;
        this.host = host !== null && host !== void 0 ? host : '127.0.0.1';
        this.port = port !== null && port !== void 0 ? port : '50051';
        this.channel = channel !== null && channel !== void 0 ? channel : grpc.ServerCredentials.createInsecure();
        this.emitter = emitter;
        this.apiClient = apiClient;
        this.identifyLock = identifyLock;
        this.rateLimitCache = new structures_1.RateLimitCache(false);
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
                const message = `Rpc server running at http://${this.host}:${this.port}`;
                this.emit('DEBUG', {
                    source: constants_1.LOG_SOURCES.RPC,
                    level: constants_1.LOG_LEVELS.INFO,
                    message,
                });
            }
        };
        return [`${this.host}:${this.port}`, this.channel, callback];
    }
    addRequestService(token, apiOptions = {}) {
        services_1.addRequestService(this, token, apiOptions);
    }
    addLockService() {
        services_1.addIdentifyLockService(this);
    }
    addRateLimitService() {
        services_1.addRateLimitService(this);
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
