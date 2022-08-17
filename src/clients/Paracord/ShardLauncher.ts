/* eslint-disable no-console, import/no-duplicates */

import pm2 from 'pm2';

import type { StartOptions } from 'pm2';
import type { InternalShardIds, ShardLauncherOptions } from './types';

function validateShard(shardId: number, shardCount: number): void {
  if (shardId > shardCount - 1) {
    throw Error(`shard id ${shardId} exceeds max shard id of ${shardCount - 1}`);
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
  }

  /**
   * Launches shards.
   * pm2Options
   */
  public async launch(pm2Options: StartOptions = {}): Promise<void> {
    const shardChunks = this.#shardChunks;
    const shardCount = this.#shardCount;
    const shardIds = this.#shardIds;

    // const { #shardChunks: shardChunks } = this;
    // let { #shardCount: shardCount, #shardIds: shardIds } = this;

    if (shardIds && shardCount) {
      shardIds.forEach((s) => {
        validateShard(s, <number>shardCount);
      });
    }

    return new Promise<void>((resolve, reject) => {
      try {
        pm2.connect((err: null | Error) => {
          if (err) reject(err);

          const promises = [];
          if (shardChunks !== undefined) {
            shardChunks.forEach((s) => {
              promises.push(this.launchShard(s, <number>shardCount, pm2Options));
            });
          } else {
            promises.push(this.launchShard(<number[]>shardIds, <number>shardCount, pm2Options));
          }

          Promise.allSettled<void>(promises).finally(() => {
            console.log('All shards launched. Disconnecting from pm2.');
            pm2.disconnect();
            resolve();
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public async launchShard(shardIds: InternalShardIds, shardCount: number, pm2Options: StartOptions): Promise<void> {
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

    return new Promise((resolve, reject) => {
      pm2.start(pm2Config, (err: null | Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
