import type Gateway from '../Gateway';
import type {
  GatewayEvent,
  GatewayOptions, IdentityOptions, ParacordEvent, ParacordGatewayEvent,
} from '../Gateway';

export type GatewayMap = Map<number, Gateway>;

export type ParacordGatewayOptions = Omit<GatewayOptions, 'emitter' | 'identity'>
/** Configuration options for the Paracord multi-shard orchestrator. */
export interface ParacordOptions {
  /** Gateway configuration applied to all shards (emitter and identity are set internally). */
  gatewayOptions: ParacordGatewayOptions;
  /** During startup, the maximum number of unavailable guilds allowed before forcing the shard as ready. */
  unavailableGuildTolerance?: number;
  /** During startup, time in seconds to wait since the last GUILD_CREATE before forcing the shard as ready. Used together with `unavailableGuildTolerance`. */
  unavailableGuildWait?: number;
  /** Time in seconds before a shard's startup is considered timed out and the shard is reconnected. */
  shardStartupTimeout?: number;
  /** Shard IDs on which to enable gateway payload compression. */
  compressShards?: number[];
}

/** Options passed to `Paracord.login()` to start gateway connections. */
export interface ParacordLoginOptions {
  /** Identify payload structure shared across all shards. The `shard` property is set internally per shard. */
  identity: IdentityOptions;
  /** Array of shard IDs to spawn. Each ID must be less than `shardCount`. */
  shards?: number[];
  /** Total number of shards the bot is running across all processes. */
  shardCount?: number;

  /** Function that determines if the gateway is allowed to connect. */
  allowConnection?: undefined | ((gw: Gateway) => boolean | Promise<boolean>);
}

export type InternalShardIds = number[]
export interface ShardLauncherOptions{
  /* Discord token. Used to find recommended shard count when no `shardIds` provided. Will be coerced into a bot token. */
  token?: string;
  /* Ids of the shards to start internally. Ignored if `shardChunks` is defined. */
  shardIds?: InternalShardIds;
  /* Arrays of shard Ids to launch. Each item will spawn a pm2 process with the designated shards internally. */
  shardChunks?: InternalShardIds[];
  /* Total number of shards this app will be running across all instances. */
  shardCount?: number;
  /* Name that will appear beside the shard number in pm2. */
  appName?: string;
  /* Additional environment variables to load into the app. */
  env?: Record<string, unknown>;
}

export type HandleEventCallback = (
  eventType: ParacordGatewayEvent | GatewayEvent | ParacordEvent,
  data: unknown,
  shard: Gateway
) => void;

/** Emitted per shard when it completes its startup sequence. */
export interface ParacordStartupEvent {
  /** The gateway that completed startup. */
  shard: Gateway;
  /** `true` if startup was forced due to unavailable guild tolerance being reached. */
  forced?: boolean;
  /** `true` if the shard resumed an existing session rather than fresh-identifying. */
  resumed?: boolean;
}
