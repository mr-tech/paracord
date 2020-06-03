"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pm2_1 = __importDefault(require("pm2"));
const Api_1 = __importDefault(require("../Api/Api"));
function validateShard(shard, shardCount) {
    if (shard > shardCount - 1) {
        throw Error(`shard id ${shard} exceeds max shard id of ${shardCount - 1}`);
    }
}
class ShardLauncher {
    constructor(main, options) {
        ShardLauncher.validateParams(main, options);
        this.main = main;
        this.appName = options.appName !== undefined ? options.appName : 'Discord Bot';
        Object.assign(this, options);
        this.bindCallbackFunctions();
    }
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
    bindCallbackFunctions() {
        this.detach = this.detach.bind(this);
    }
    launch(pm2Options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const { shardChunks } = this;
            let { shardCount, shardIds } = this;
            if (shardChunks === undefined && shardCount === undefined) {
                ({ shardCount, shardIds } = yield this.getShardInfo());
            }
            if (shardIds && shardCount) {
                shardIds.forEach((s) => {
                    validateShard(s, shardCount);
                });
            }
            try {
                pm2_1.default.connect((err) => {
                    if (err) {
                        console.error(err);
                        process.exit(2);
                    }
                    if (shardChunks !== undefined) {
                        this.launchCount = shardChunks.length;
                        shardChunks.forEach((s) => {
                            this.launchShard(s, shardCount, pm2Options);
                        });
                    }
                    else {
                        this.launchCount = 1;
                        this.launchShard(shardIds, shardCount, pm2Options);
                    }
                });
            }
            catch (err) {
                console.error(err);
            }
        });
    }
    getShardInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Retrieving shard information from API.');
            const shardCount = yield this.getRecommendedShards();
            console.log(`Using Discord recommended shard count: ${shardCount} shard${shardCount > 0 ? 's' : ''}`);
            const shardIds = [];
            for (let i = 0; i < shardCount; ++i) {
                shardIds.push(i);
            }
            return { shardCount, shardIds };
        });
    }
    launchShard(shardIds, shardCount, pm2Options) {
        var _a;
        const shardIdsCsv = shardIds.join(',');
        const paracordEnv = {
            PARACORD_TOKEN: this.token,
            PARACORD_SHARD_COUNT: shardCount,
            PARACORD_SHARD_IDS: shardIdsCsv,
        };
        const pm2Config = Object.assign({ name: `${this.appName} - Shards ${shardIdsCsv}`, script: this.main, env: Object.assign(Object.assign({}, ((_a = this.env) !== null && _a !== void 0 ? _a : {})), paracordEnv) }, pm2Options);
        pm2_1.default.start(pm2Config, this.detach);
    }
    getRecommendedShards() {
        return __awaiter(this, void 0, void 0, function* () {
            const api = new Api_1.default(this.token);
            const { status, statusText, data } = yield api.request('get', 'gateway/bot');
            if (status === 200) {
                return data.shards;
            }
            throw Error(`Failed to get shard information from API. Status ${status}. Status text: ${statusText}. Discord code: ${data.code}. Discord message: ${data.message}.`);
        });
    }
    detach(err) {
        if (--this.launchCount === 0) {
            console.log('All shards launched. Disconnecting from pm2.');
            pm2_1.default.disconnect();
        }
        if (err)
            throw err;
    }
}
exports.default = ShardLauncher;
