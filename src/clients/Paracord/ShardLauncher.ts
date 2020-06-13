/* eslint-disable no-console */

import pm2, { StartOptions } from 'pm2';
import Api from '../Api/Api';
import { GatewayBotResponse } from '../Gateway/types';
import { InternalShardIds, ShardLauncherOptions } from './types';

function validateShard(shard: number, shardCount: number): void {
  if (shard > shardCount - 1) {
    throw Error(`shard id ${shard} exceeds max shard id of ${shardCount - 1}`);
  }
}

/** A script that spawns shards into pm2, injecting shard information into the Paracord client. */
export default class ShardLauncher {
  /** Relative location of the app's entry point. */
  #main: string;

  /** Ids of the shards to start internally. Ignored if `shardChunks` is defined. */
  #shardIds: InternalShardIds | undefined;

  /** Arrays of shard Ids to launch. Each item will spawn a pm2 process with the designated shards internally. */
  #shardChunks: InternalShardIds[] | undefined;

  /** Total number of shards this app will be running across all instances. */
  #shardCount: number | undefined;

  /** Additional environment variables to load into the app. */
  #env: Record<string, unknown> | undefined;

  /** Name that will appear beside the shard number in pm2. */
  #appName: string;

  /** Discord token. Used to find recommended shard count. Will be coerced into a bot token. */
  #token: string | undefined;

  /** Number of shards to be launched. */
  #launchCount: number | undefined;

  /** Throws errors and warns if the parameters passed to the constructor aren't sufficient. */
  private static validateParams(main: string, options: ShardLauncherOptions): void {
    const {
      token, shardIds, shardCount, shardChunks,
    } = options;

    if (main === undefined) {
      throw Error(
        "main must be defined. please provide the path to your app's entry file.",
      );
    }
    if (token === undefined && shardCount === undefined) {
      throw Error('must provide either a token or shardCount in the options.');
    }
    if (shardCount && shardCount <= 0) {
      throw Error('shardCount must be greater than 0.');
    }

    if (shardCount && shardIds === undefined && shardChunks === undefined) {
      console.warn(`received shardCount without shardIds or shardChunks. spawning ${shardCount} shards.`);
    }
    if (shardIds !== undefined && shardCount === undefined) {
      console.warn('received shardIds without shardCount. shardCount will be assumed from Discord and may change in the future. it is recommended that shardCount be defined to avoid unexpected changes.');
    }
    if (shardIds && shardChunks) {
      console.warn('shardChunks defined. ignoring shardIds.');
    }

    if (shardChunks && shardCount) {
      shardChunks.forEach((c) => {
        c.forEach((s) => {
          validateShard(s, shardCount);
        });
      });
    } else if (shardIds && shardCount) {
      shardIds.forEach((s) => {
        validateShard(s, shardCount);
      });
    }
  }

  /**
   * Creates a new shard launcher.
   * @param main Relative location of the app's entry file.
   * @param options Optional parameters for this handler.
   */
  public constructor(main: string, options: ShardLauncherOptions) {
    ShardLauncher.validateParams(main, options);
    this.#main = main;
    this.#appName = options.appName !== undefined ? options.appName : 'Discord Bot';

    this.#shardIds = options.shardIds;
    this.#shardChunks = options.shardChunks;
    this.#shardCount = options.shardCount;
    this.#env = options.env;
    this.#token = options.token;

    this.bindCallbackFunctions();
  }

  /** Binds `this` to functions used in callbacks. */
  private bindCallbackFunctions(): void {
    this.detach = this.detach.bind(this);
  }

  /**
   * Launches shards.
   * pm2Options
   */
  public async launch(pm2Options: StartOptions = {}): Promise<void> {
    const shardChunks = this.#shardChunks;
    let shardCount = this.#shardCount;
    let shardIds = this.#shardIds;

    // const { #shardChunks: shardChunks } = this;
    // let { #shardCount: shardCount, #shardIds: shardIds } = this;

    if (shardChunks === undefined && shardCount === undefined) {
      ({ shardCount, shardIds } = await this.getShardInfo());
    }

    if (shardIds && shardCount) {
      shardIds.forEach((s) => {
        validateShard(s, <number>shardCount);
      });
    }

    try {
      pm2.connect((err) => {
        if (err) {
          console.error(err);
          process.exit(2);
        }

        if (shardChunks !== undefined) {
          this.#launchCount = shardChunks.length;
          shardChunks.forEach((s) => {
            this.launchShard(s, <number>shardCount, pm2Options);
          });
        } else {
          this.#launchCount = 1;
          this.launchShard(<number[]>shardIds, <number>shardCount, pm2Options);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  /** Fills missing shard information. */
  private async getShardInfo(): Promise<{ shardCount: number, shardIds: number[]}> {
    console.log('Retrieving shard information from API.');
    const shardCount = await this.getRecommendedShards();

    console.log(
      `Using Discord recommended shard count: ${shardCount} shard${
        shardCount > 0 ? 's' : ''
      }`,
    );

    const shardIds = [];
    for (let i = 0; i < shardCount; ++i) {
      shardIds.push(i);
    }

    return { shardCount, shardIds };
  }

  public launchShard(shardIds: InternalShardIds, shardCount: number, pm2Options: StartOptions): void {
    const shardIdsCsv = shardIds.join(',');
    const paracordEnv = {
      PARACORD_TOKEN: this.#token,
      PARACORD_SHARD_COUNT: shardCount,
      PARACORD_SHARD_IDS: shardIdsCsv,
    };

    const pm2Config = <StartOptions>{
      name: `${this.#appName} - Shards ${shardIdsCsv}`,
      script: this.#main,
      env: {
        ...(this.#env ?? {}),
        ...paracordEnv,
      },
      ...pm2Options,
    };

    pm2.start(pm2Config, this.detach);
  }

  /** Gets the recommended shard count from Discord. */
  private async getRecommendedShards(): Promise<number> {
    if (this.#token === undefined) throw Error('token required when shardChunks and shardCount are not provided');

    const api = new Api(this.#token);
    const { status, statusText, data } = <GatewayBotResponse> await api.request(
      'get',
      'gateway/bot',
    );

    if (status === 200) {
      return data.shards;
    }
    throw Error(
      `Failed to get shard information from API. Status ${status}. Status text: ${statusText}. Discord code: ${data.code}. Discord message: ${data.message}.`,
    );
  }

  /** Disconnects from pm2 when all chunks have been launched. */
  private detach(err: Error) {
    if (this.#launchCount && --this.#launchCount === 0) {
      console.log('All shards launched. Disconnecting from pm2.');
      pm2.disconnect();
    }

    if (err) throw err;
  }
}
