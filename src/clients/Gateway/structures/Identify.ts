import { IdentifyConnectionProperties, GatewayStatusUpdate } from '../../../types';

/** A container of information for identifying with the gateway. https://discordapp.com/developers/docs/topics/gateway#identify-identify-structure */
export default class Identify {
    /** used for Guild Sharding */
    readonly shard?: [number, number]; // (shardId, numShards);

    /** authentication token */
    readonly token: string;

    /** information about the client and how it's connecting */
    private properties: IdentifyConnectionProperties;

    /** whether this connection supports compression of packets */
    private compress?: boolean; // false

    /** value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
    private largeThreshold?: number; // 50

    /** presence structure for initial presence information */
    private presence?: GatewayStatusUpdate;

    /** enables dispatching of guild subscription events (presence and typing events) */
    private guildSubscriptions?: boolean; // true

    /** the Gateway Intents you wish to receive */
    private intents?: number;

    /**
   * Creates a new Identity object for use with the gateway.
   * @param identity Properties to add to this identity.
   */
    constructor(token: string, identity: Partial<Identify> = {}) {
      this.properties = {
        $os: process.platform,
        $browser: 'Paracord',
        $device: 'Paracord',
      };

      this.presence = {
        status: 'online',
        afk: false,
        game: null,
        since: null,
      };

      Object.assign(this, identity);

      this.token = token;
    }
}
