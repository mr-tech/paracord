export * from './_augments';
export * from './_gateway-events';
export * from './application';
export * from './application-commands';
export * from './audit-logs';
export * from './auto-moderation';
export * from './channel';
export * from './emoji';
export * from './gateway';
export * from './gateway-events';
export * from './guild';
export * from './guild-scheduled-event';
export * from './invite';
export * from './message-components';
export * from './permissions';
export * from './receiving-and-responding';
export * from './stage-instance';
export * from './sticker';
export * from './teams';
export * from './user';
export * from './voice';
export * from './webhook';

export type Snowflake = string;
export type ISO8601timestamp = string;

// https://discord.com/developers/docs/resources/guild#unavailable-guild-object
export type UnavailableGuild = {
  id: Snowflake;
  unavailable: true;
};
