import { UserEvents } from '../../common';
import { Identify } from '../../types';
import { IApiOptions } from '../Api/types';
import Gateway from '../Gateway/Gateway';
import { GatewayOptions } from '../Gateway/types';
export declare type GatewayMap = Map<number, Gateway>;
export declare type ParacordOptions = {
    events?: UserEvents;
    apiOptions?: Partial<IApiOptions>;
    gatewayOptions?: Partial<GatewayOptions>;
    autoInit?: boolean;
};
export interface ParacordLoginOptions {
    identity?: Identify;
    shards?: number[];
    shardCount?: number;
    unavailableGuildTolerance?: number;
    unavailableGuildWait?: number;
    allowEventsDuringStartup?: false;
}
export declare type InternalShardIds = number[];
export interface ShardLauncherOptions {
    token?: string;
    shardIds?: InternalShardIds;
    shardChunks?: InternalShardIds[];
    shardCount?: number;
    appName?: string;
    env?: Record<string, unknown>;
}
