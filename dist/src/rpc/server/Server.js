"use strict";
const grpc = require('@grpc/grpc-js');
const { identifyLockCallbacks, requestCallbacks, rateLimitCallbacks, } = require('../services');
const { loadProto } = require('../services/common');
const { Lock } = require('../structures');
const Api = require('../../clients/Api/Api');
const { RateLimitCache } = require('../../clients/Api/structures');
const { LOG_SOURCES, LOG_LEVELS } = require('../../constants');
const requestProto = loadProto('request');
const lockProto = loadProto('identify_lock');
const rateLimitProto = loadProto('rate_limit');
module.exports = class Server extends grpc.Server {
    constructor(options = {}) {
        super();
        this.emitter;
        this.bindArgs;
        this.apiClient;
        this.identifyLock;
        this.constructorDefaults(options);
    }
    constructorDefaults(options) {
        const defaults = Object.assign({ host: '127.0.0.1', port: '50051', channel: grpc.ServerCredentials.createInsecure() }, options);
        Object.assign(this, defaults);
        this.bindArgs = this.bindArgs || this.createDefaultBindArgs();
    }
    createDefaultBindArgs() {
        const callback = () => {
            try {
                this.start();
            }
            catch (err) {
                if (err.message === 'server must be bound in order to start') {
                    console.error('server must be bound in order to start. maybe this host:port is already bound?');
                }
            }
            const message = `Rpc server running at http://${this.host}:${this.port}`;
            this.emit('DEBUG', {
                source: LOG_SOURCES.RPC,
                level: LOG_LEVELS.INFO,
                message,
            });
        };
        return [`${this.host}:${this.port}`, this.channel, callback];
    }
    emit(...args) {
        if (this.emitter !== undefined) {
            this.emitter.emit(...args);
        }
    }
    addRequestService(token, apiOptions = {}) {
        apiOptions.requestOptions = apiOptions.requestOptions || {};
        apiOptions.requestOptions.transformResponse = (data) => data;
        this.apiClient = new Api(token, apiOptions);
        this.apiClient.startQueue();
        this.addService(requestProto.RequestService, requestCallbacks(this));
        this.emit('DEBUG', {
            source: LOG_SOURCES.RPC,
            level: LOG_LEVELS.INFO,
            message: 'The request service has been added to the server.',
        });
    }
    addLockService() {
        this.identifyLock = new Lock(this.emitter);
        this.addService(lockProto.LockService, identifyLockCallbacks(this, this.identifyLock));
        this.emit('DEBUG', {
            source: LOG_SOURCES.RPC,
            level: LOG_LEVELS.INFO,
            message: 'The identify lock service has been to the server.',
        });
    }
    addRateLimitService() {
        this.rateLimitCache = new RateLimitCache();
        this.addService(rateLimitProto.RateLimitService, rateLimitCallbacks(this, this.rateLimitCache));
        this.emit('DEBUG', {
            source: LOG_SOURCES.RPC,
            level: LOG_LEVELS.INFO,
            message: 'The rate limit service has been to the server.',
        });
    }
    serve() {
        this.bindAsync(...this.bindArgs);
    }
    log(level, message) {
        this.emit('DEBUG', {
            source: LOG_SOURCES.RPC,
            level: LOG_LEVELS[level],
            message,
        });
    }
};
