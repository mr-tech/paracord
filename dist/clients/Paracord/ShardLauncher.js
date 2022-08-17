"use strict";
/* eslint-disable no-console, import/no-duplicates */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pm2_1 = __importDefault(require("pm2"));
function validateShard(shardId, shardCount) {
    if (shardId > shardCount - 1) {
        throw Error(`shard id ${shardId} exceeds max shard id of ${shardCount - 1}`);
    }
}
/** A script that spawns shards into pm2, injecting shard information into the Paracord client. */
class ShardLauncher {
    /** Relative location of the app's entry point. */
    #main;
    /** Ids of the shards to start internally. Ignored if `shardChunks` is defined. */
    #shardIds;
    /** Arrays of shard Ids to launch. Each item will spawn a pm2 process with the designated shards internally. */
    #shardChunks;
    /** Total number of shards this app will be running across all instances. */
    #shardCount;
    /** Additional environment variables to load into the app. */
    #env;
    /** Name that will appear beside the shard number in pm2. */
    #appName;
    /** Discord token. Used to find recommended shard count. Will be coerced into a bot token. */
    #token;
    /** Throws errors and warns if the parameters passed to the constructor aren't sufficient. */
    static validateParams(main, options) {
        const { token, shardIds, shardCount, shardChunks, } = options;
        if (main === undefined) {
            throw Error("main must be defined. please provide the path to your app's entry file.");
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
        }
        else if (shardIds && shardCount) {
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
    constructor(main, options) {
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
    async launch(pm2Options = {}) {
        const shardChunks = this.#shardChunks;
        const shardCount = this.#shardCount;
        const shardIds = this.#shardIds;
        // const { #shardChunks: shardChunks } = this;
        // let { #shardCount: shardCount, #shardIds: shardIds } = this;
        if (shardIds && shardCount) {
            shardIds.forEach((s) => {
                validateShard(s, shardCount);
            });
        }
        return new Promise((resolve, reject) => {
            try {
                pm2_1.default.connect((err) => {
                    if (err)
                        reject(err);
                    const promises = [];
                    if (shardChunks !== undefined) {
                        shardChunks.forEach((s) => {
                            promises.push(this.launchShard(s, shardCount, pm2Options));
                        });
                    }
                    else {
                        promises.push(this.launchShard(shardIds, shardCount, pm2Options));
                    }
                    Promise.allSettled(promises).finally(() => {
                        console.log('All shards launched. Disconnecting from pm2.');
                        pm2_1.default.disconnect();
                        resolve();
                    });
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }
    async launchShard(shardIds, shardCount, pm2Options) {
        const shardIdsCsv = shardIds.join(',');
        const paracordEnv = {
            PARACORD_TOKEN: this.#token,
            PARACORD_SHARD_COUNT: shardCount,
            PARACORD_SHARD_IDS: shardIdsCsv,
        };
        const pm2Config = {
            name: `${this.#appName} - Shards ${shardIdsCsv}`,
            script: this.#main,
            env: {
                ...(this.#env ?? {}),
                ...paracordEnv,
            },
            ...pm2Options,
        };
        return new Promise((resolve, reject) => {
            pm2_1.default.start(pm2Config, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
}
exports.default = ShardLauncher;
