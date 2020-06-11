import { GatewayStatusUpdate, IdentifyConnectionProperties } from '../../../types';

/** A container of information for identifying with the gateway. https://discordapp.com/developers/docs/topics/gateway#identify-identify-structure */
export default class Identify {
    /** used for Guild Sharding */
    readonly shard?: [number, number]; // (shardId, numShards);

    /** authentication token */
    readonly token: string;

    /** information about the client and how it's connecting */
    #properties?: IdentifyConnectionProperties;

    /** whether this connection supports compression of packets */
    #compress?: boolean; // false

    /** value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
    #largeThreshold?: number; // 50

    /** presence structure for initial presence information */
    #presence?: GatewayStatusUpdate;

    /** enables dispatching of guild subscription events (presence and typing events) */
    #guildSubscriptions?: boolean; // true

    /** the Gateway Intents you wish to receive */
    #intents?: number;

    /**
   * Creates a new Identity object for use with the gateway.
   * @param identity Properties to add to this identity.
   */
    public constructor(token: string, identity: Partial<Identify>) {
      this.#properties = {
        $os: process.platform,
        $browser: 'Paracord',
        $device: 'Paracord',
      };

      this.#presence = {
        status: 'online',
        afk: false,
        game: null,
        since: null,
      };

      Object.assign(this, identity);

      if (identity.shard !== undefined) {
        const [shard, shardCount] = identity.shard;
        this.shard = [Number(shard), Number(shardCount)];
      }

      this.token = token;
    }
}
