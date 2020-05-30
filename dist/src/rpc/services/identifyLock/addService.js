"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const structures_1 = require("../../structures");
const constants_1 = require("../../../constants");
const Lock_1 = __importDefault(require("../../structures/identityLock/Lock"));
const common_1 = require("../common");
const lockProto = common_1.loadProto('identify_lock');
exports.default = (server) => {
    server.addService(lockProto.LockService, {
        acquire: acquire.bind(server),
        release: release.bind(server),
    });
    server.emit('DEBUG', {
        source: constants_1.LOG_SOURCES.RPC,
        level: constants_1.LOG_LEVELS.INFO,
        message: 'The identify lock service has been to the server.',
    });
};
function acquire(call, callback) {
    this.identifyLock = new Lock_1.default(this.emitter);
    try {
        const { timeOut, token } = structures_1.LockRequestMessage.fromProto(call.request);
        const message = this.identifyLock.acquire(timeOut, token);
        callback(null, message.proto);
    }
    catch (err) {
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.RPC,
            level: constants_1.LOG_LEVELS.ERROR,
            message: err.message,
        });
        callback(err);
    }
}
function release(call, callback) {
    if (this.identifyLock === undefined) {
        callback("lock doesn't exist");
        return;
    }
    try {
        const { value: token } = structures_1.TokenMessage.fromProto(call.request);
        const message = this.identifyLock.release(token);
        if (message.success !== undefined) {
            this.emit('DEBUG', {
                source: constants_1.LOG_SOURCES.RPC,
                level: constants_1.LOG_LEVELS.DEBUG,
                message: `Lock released by client. Token: ${token}`,
            });
        }
        callback(null, message.proto);
    }
    catch (err) {
        this.emit('DEBUG', {
            source: constants_1.LOG_SOURCES.RPC,
            level: constants_1.LOG_LEVELS.ERROR,
            message: err.message,
        });
        callback(err);
    }
}
