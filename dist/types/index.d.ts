export * from './augments';
export * from './channel';
export * from './emoji';
export * from './gateway';
export * from './guild';
export * from './permissions';
export * from './user';
export * from './voice';
export declare type Snowflake = string;
export declare type ISO8601timestamp = string;
export declare type UnavailableGuild = {
    id: Snowflake;
    unavailable: true;
};
