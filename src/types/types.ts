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
  tag: () => string;
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
  guildId: Guild['id'];
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

export type UserMap = Map<User['id'], User>;
export type GuildMap = Map<Guild['id'], Guild>;
export type RoleMap = Map<GuildRole['id'], GuildRole>;
export type EmojiMap = Map<GuildEmoji['id'], GuildEmoji>;
export type VoiceStateMap = Map<GuildVoiceState['member']['user']['id'], Partial<GuildVoiceState>>;
export type PresenceMap = Map<RawPresence['user']['id'], RawPresence>;
export type GuildChannelMap = Map<GuildChannel['id'], GuildChannel>;
export type GuildMemberMap = Map<GuildMember['user']['id'], GuildMember>;

export type EventFunctions = Record<string, EventFunction>;
export type EventFunction = (...any: unknown[]) => unknown;
