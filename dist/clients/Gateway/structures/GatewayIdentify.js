"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class GatewayIdentify {
    shard;
    token;
    #properties;
    #compress;
    #largeThreshold;
    #presence;
    #guildSubscriptions;
    #intents;
    constructor(token, identity) {
        this.#properties = {
            $os: process.platform,
            $browser: 'Paracord',
            $device: 'Paracord',
        };
        this.#presence = {
            status: 'online',
            afk: false,
            activities: [],
            since: null,
        };
        this.#compress = identity.compress;
        this.#largeThreshold = identity.largeThreshold;
        this.#presence = identity.presence;
        this.#intents = identity.intents;
        this.#guildSubscriptions = identity.guildSubscriptions;
        if (identity.shard !== undefined) {
            const [shard, shardCount] = identity.shard;
            this.shard = [Number(shard), Number(shardCount)];
        }
        this.token = token;
    }
    get compress() {
        return this.#compress;
    }
    toJSON() {
        const data = {
            token: this.token,
            properties: this.#properties,
        };
        if (this.#compress !== undefined)
            data.compress = this.#compress;
        if (this.#guildSubscriptions !== undefined)
            data.guild_subscription = this.#guildSubscriptions;
        if (this.#intents !== undefined)
            data.intents = this.#intents;
        if (this.#largeThreshold !== undefined)
            data.large_threshold = this.#largeThreshold;
        if (this.#presence !== undefined)
            data.presence = this.#presence;
        if (this.shard !== undefined)
            data.shard = this.shard;
        return data;
    }
}
exports.default = GatewayIdentify;
