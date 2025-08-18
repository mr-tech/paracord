import { GatewayIdentifyProperties, GatewayPresenceUpdateData, PresenceUpdateStatus } from 'discord-api-types/v10';

import type { IdentityOptions } from '../types';

/** A container of information for identifying with the gateway. https://discord.com/developers/docs/topics/gateway#identify-identify-structure */
export default class GatewayIdentify {
  /** whether this connection supports compression of packets */
  public compress: boolean | undefined; // false

  /** used for Guild Sharding */
  readonly shard?: [number, number]; // (shardId, numShards);

  /** authentication token */
  readonly token: string;

  /** information about the client and how it's connecting */
  #properties: GatewayIdentifyProperties;

  /** value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
  #largeThreshold: number | undefined; // 50

  /** presence structure for initial presence information */
  #presence: GatewayPresenceUpdateData | undefined;

  /** enables dispatching of guild subscription events (presence and typing events) */
  #guildSubscriptions: boolean | undefined; // true

  /** the Gateway Intents you wish to receive */
  #intents: number | undefined;

  /**
   * Creates a new Identity object for use with the gateway.
   * @param identity Properties to add to this identity.
   */
  public constructor(token: string, identity: Partial<IdentityOptions>) {
    this.#properties = {
      os: process.platform,
      browser: 'Paracord',
      device: 'Paracord',
    };

    this.#presence = {
      status: PresenceUpdateStatus.Online,
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

  updatePresence(presence: GatewayPresenceUpdateData) {
    this.#presence = presence;
  }

  public toJSON(): Partial<GatewayIdentify> {
    const data: {
        token: string
        properties: GatewayIdentifyProperties,
        compress?: boolean,
        guild_subscription?: boolean,
        intents?: number,
        large_threshold?: number,
        presence?: GatewayPresenceUpdateData,
        shard?: [number, number]
      } = {
        token: this.token,
        properties: this.#properties,
      };

    if (this.compress !== undefined) data.compress = this.compress;
    if (this.#guildSubscriptions !== undefined) data.guild_subscription = this.#guildSubscriptions;
    if (this.#intents !== undefined) data.intents = this.#intents;
    if (this.#largeThreshold !== undefined) data.large_threshold = this.#largeThreshold;
    if (this.#presence !== undefined) data.presence = this.#presence;
    if (this.shard !== undefined) data.shard = this.shard;

    return data;
  }
}
