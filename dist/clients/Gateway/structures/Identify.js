"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var _properties, _compress, _largeThreshold, _presence, _guildSubscriptions, _intents;
Object.defineProperty(exports, "__esModule", { value: true });
class Identify {
    constructor(token, identity) {
        _properties.set(this, void 0);
        _compress.set(this, void 0);
        _largeThreshold.set(this, void 0);
        _presence.set(this, void 0);
        _guildSubscriptions.set(this, void 0);
        _intents.set(this, void 0);
        __classPrivateFieldSet(this, _properties, {
            $os: process.platform,
            $browser: 'Paracord',
            $device: 'Paracord',
        });
        __classPrivateFieldSet(this, _presence, {
            status: 'online',
            afk: false,
            game: null,
            since: null,
        });
        Object.assign(this, identity);
        if (identity.shard !== undefined) {
            const [shard, shardCount] = identity.shard;
            this.shard = [Number(shard), Number(shardCount)];
        }
        this.token = token;
    }
}
exports.default = Identify;
_properties = new WeakMap(), _compress = new WeakMap(), _largeThreshold = new WeakMap(), _presence = new WeakMap(), _guildSubscriptions = new WeakMap(), _intents = new WeakMap();
