import {
  Overwrite, RawChannel, RawEmoji, RawGuildMember, RawRole, RawUser,
} from '.';
import Guild from '../clients/Paracord/structures/Guild';
import { RawPresence } from './gateway';
import { RawVoiceState } from './voice';

export type Snowflake = string;

export type ISO8601timestamp = string;

export type User = RawUser & {
  createdOn: () => number;
  tag: string;
  presence: RawPresence | undefined;
}
export type UnavailableGuild = {
  id: Snowflake;
  unavailable: true;
};
export type GuildChannel = RawChannel & {
  guildId: Snowflake;
  permissionOverwrites: Overwrite[];
};
export type GuildRole = RawRole & {
  guildId: Snowflake;
};
export type GuildEmoji = RawEmoji & {
  // roles: RoleMap;
};
export type GuildMember = RawGuildMember & {
  user: User;
  // roles: RoleMap;
};
export type GuildVoiceState = RawVoiceState & {
  // member: GuildMember;
};
// export type Presence = RawPresence & {
//   user: User;
//   roles: undefined;
// };

export type UserMap = Map<Snowflake, User>;
export type GuildMap = Map<Snowflake, Guild>;
export type RoleMap = Map<Snowflake, GuildRole>;
export type EmojiMap = Map<Snowflake, GuildEmoji>;
export type VoiceStateMap = Map<Snowflake, Partial<GuildVoiceState>>;
export type PresenceMap = Map<Snowflake, RawPresence>;
export type GuildChannelMap = Map<Snowflake, GuildChannel>;
export type GuildMemberMap = Map<Snowflake, GuildMember>;

export type EventFunctions = Record<string, EventFunction>;
export type EventFunction = (...any: unknown[]) => unknown;
