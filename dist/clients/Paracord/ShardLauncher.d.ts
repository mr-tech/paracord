import { StartOptions } from 'pm2';
import { InternalShardIds, ShardLauncherOptions } from './types';
export default class ShardLauncher {
    #private;
    private static validateParams;
    constructor(main: string, options: ShardLauncherOptions);
    private bindCallbackFunctions;
    launch(pm2Options?: StartOptions): Promise<void>;
    private getShardInfo;
    launchShard(shardIds: InternalShardIds, shardCount: number, pm2Options: StartOptions): void;
    private getRecommendedShards;
    private detach;
}
