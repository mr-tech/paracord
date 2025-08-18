"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const v10_1 = require("discord-api-types/v10");
/** A container of information for identifying with the gateway. https://discord.com/developers/docs/topics/gateway#identify-identify-structure */
class GatewayIdentify {
    /** whether this connection supports compression of packets */
    compress; // false
    /** used for Guild Sharding */
    shard; // (shardId, numShards);
    /** authentication token */
    token;
    /** information about the client and how it's connecting */
    #properties;
    /** value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
    #largeThreshold; // 50
    /** presence structure for initial presence information */
    #presence;
    /** enables dispatching of guild subscription events (presence and typing events) */
    #guildSubscriptions; // true
    /** the Gateway Intents you wish to receive */
    #intents;
    /**
     * Creates a new Identity object for use with the gateway.
     * @param identity Properties to add to this identity.
     */
    constructor(token, identity) {
        this.#properties = {
            os: process.platform,
            browser: 'Paracord',
            device: 'Paracord',
        };
        this.#presence = {
            status: v10_1.PresenceUpdateStatus.Online,
            afk: false,
            activities: [],
            since: null,
        };
        this.compress = identity.compress;
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
    updatePresence(presence) {
        this.#presence = presence;
    }
    toJSON() {
        const data = {
            token: this.token,
            properties: this.#properties,
        };
        if (this.compress !== undefined)
            data.compress = this.compress;
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
