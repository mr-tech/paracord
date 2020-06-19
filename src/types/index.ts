export * from './augments';
export * from './channel';
export * from './emoji';
export * from './gateway';
export * from './guild';
export * from './permissions';
export * from './user';
export * from './voice';

export type Snowflake = string;
export type ISO8601timestamp = string;

// https://discord.com/developers/docs/resources/guild#unavailable-guild-object
export type UnavailableGuild = {
  id: Snowflake;
  unavailable: true;
};
