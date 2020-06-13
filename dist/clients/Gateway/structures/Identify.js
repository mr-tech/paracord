"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
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
        __classPrivateFieldSet(this, _compress, identity.compress);
        __classPrivateFieldSet(this, _largeThreshold, identity.largeThreshold);
        __classPrivateFieldSet(this, _presence, identity.presence);
        __classPrivateFieldSet(this, _intents, identity.intents);
        __classPrivateFieldSet(this, _guildSubscriptions, identity.guildSubscriptions);
        if (identity.shard !== undefined) {
            const [shard, shardCount] = identity.shard;
            this.shard = [Number(shard), Number(shardCount)];
        }
        this.token = token;
    }
    toJSON() {
        const data = {
            token: this.token,
            properties: __classPrivateFieldGet(this, _properties),
        };
        if (__classPrivateFieldGet(this, _compress) !== undefined)
            data.compress = __classPrivateFieldGet(this, _compress);
        if (__classPrivateFieldGet(this, _guildSubscriptions) !== undefined)
            data.guild_subscription = __classPrivateFieldGet(this, _guildSubscriptions);
        if (__classPrivateFieldGet(this, _intents) !== undefined)
            data.intents = __classPrivateFieldGet(this, _intents);
        if (__classPrivateFieldGet(this, _largeThreshold) !== undefined)
            data.large_threshold = __classPrivateFieldGet(this, _largeThreshold);
        if (__classPrivateFieldGet(this, _presence) !== undefined)
            data.presence = __classPrivateFieldGet(this, _presence);
        if (this.shard !== undefined)
            data.shard = this.shard;
        return data;
    }
}
exports.default = Identify;
_properties = new WeakMap(), _compress = new WeakMap(), _largeThreshold = new WeakMap(), _presence = new WeakMap(), _guildSubscriptions = new WeakMap(), _intents = new WeakMap();
