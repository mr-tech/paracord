"use strict";
/* eslint-disable no-console, import/no-duplicates */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = __importDefault(require("../Api"));
let pm2 = null;
// eslint-disable-next-line import/no-unresolved
Promise.resolve().then(() => __importStar(require('pm2'))).then((_pm2) => {
    pm2 = _pm2;
}).catch(() => { });
function validateShard(shard, shardCount) {
    if (shard > shardCount - 1) {
        throw Error(`shard id ${shard} exceeds max shard id of ${shardCount - 1}`);
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
    /** Number of shards to be launched. */
    #launchCount;
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
        if (!pm2)
            throw Error("Cannot find module 'pm2'");
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
                validateShard(s, shardCount);
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
                        this.launchShard(s, shardCount, pm2Options);
                    });
                }
                else {
                    this.#launchCount = 1;
                    this.launchShard(shardIds, shardCount, pm2Options);
                }
            });
        }
        catch (err) {
            console.error(err);
        }
    }
    /** Fills missing shard information. */
    async getShardInfo() {
        console.log('Retrieving shard information from API.');
        const shardCount = await this.getRecommendedShards();
        console.log(`Using Discord recommended shard count: ${shardCount} shard${shardCount > 0 ? 's' : ''}`);
        const shardIds = [];
        for (let i = 0; i < shardCount; ++i) {
            shardIds.push(i);
        }
        return { shardCount, shardIds };
    }
    async launchShard(shardIds, shardCount, pm2Options) {
        if (!pm2)
            throw Error("Cannot find module 'pm2'");
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
        pm2.start(pm2Config, this.detach);
    }
    /** Gets the recommended shard count from Discord. */
    async getRecommendedShards() {
        if (this.#token === undefined)
            throw Error('token required when shardChunks and shardCount are not provided');
        const api = new Api_1.default(this.#token);
        const { status, statusText, data } = await api.request('get', 'gateway/bot');
        if (status === 200) {
            return data.shards;
        }
        throw Error(`Failed to get shard information from API. Status ${status}. Status text: ${statusText}. Discord code: ${data.code}. Discord message: ${data.message}.`);
    }
    /** Disconnects from pm2 when all chunks have been launched. */
    detach = async (err) => {
        if (!pm2)
            throw Error("Cannot find module 'pm2'");
        if (this.#launchCount && --this.#launchCount === 0) {
            console.log('All shards launched. Disconnecting from pm2.');
            pm2.disconnect();
        }
        if (err)
            throw err;
    };
}
exports.default = ShardLauncher;
