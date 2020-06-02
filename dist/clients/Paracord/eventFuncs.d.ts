import { GuildChannel, GuildMember, GuildMemberAddExtraFields, GuildMemberRemoveEventFields, GuildMembersChunkEventFields, GuildMemberUpdateEventFields, GuildRole, GuildRoleCreateEventFields, GuildRoleDeleteEventFields, GuildRoleUpdateEventFields, GuildVoiceState, Message, RawChannel, RawGuild, RawGuildMember, RawPresence, RawRole, RawUser, RawVoiceState, ReadyEventFields, UnavailableGuild, User } from '../../types';
import Gateway from '../Gateway/Gateway';
import Paracord from './Paracord';
import Guild from './structures/Guild';
export declare function READY(this: Paracord, data: ReadyEventFields, shard: number): ReadyEventFields;
export declare function PRESENCE_UPDATE(this: Paracord, data: RawPresence): RawPresence | RawPresence;
export declare function USER_UPDATE(this: Paracord, data: RawUser): User;
export declare function MESSAGE_CREATE(this: Paracord, data: Message): Message;
export declare function VOICE_STATE_UPDATE(this: Paracord, data: RawVoiceState): GuildVoiceState | RawVoiceState;
export declare function GUILD_MEMBER_ADD(this: Paracord, data: RawGuildMember & GuildMemberAddExtraFields): (RawGuildMember & GuildMemberAddExtraFields) | GuildMember;
export declare function GUILD_MEMBER_UPDATE(this: Paracord, data: GuildMemberUpdateEventFields): GuildMember | GuildMemberUpdateEventFields;
export declare function GUILD_MEMBER_REMOVE(this: Paracord, { guildId, user }: GuildMemberRemoveEventFields): GuildMember | {
    user: RawUser;
};
export declare function GUILD_MEMBERS_CHUNK(this: Paracord, data: GuildMembersChunkEventFields): GuildMembersChunkEventFields;
export declare function CHANNEL_CREATE(this: Paracord, data: RawChannel): GuildChannel | RawChannel;
export declare function CHANNEL_UPDATE(this: Paracord, data: RawChannel): GuildChannel | RawChannel;
export declare function CHANNEL_DELETE(this: Paracord, data: RawChannel): GuildChannel | RawChannel;
export declare function GUILD_ROLE_CREATE(this: Paracord, { guildId, role: data }: GuildRoleCreateEventFields): GuildRole | RawRole;
export declare function GUILD_ROLE_UPDATE(this: Paracord, { guildId, role: data }: GuildRoleUpdateEventFields): GuildRole | RawRole;
export declare function GUILD_ROLE_DELETE(this: Paracord, { guildId, roleId }: GuildRoleDeleteEventFields): GuildRole | undefined;
export declare function GUILD_CREATE(this: Paracord, data: RawGuild, shard: number): Guild | undefined;
export declare function GUILD_UPDATE(this: Paracord, data: RawGuild): Guild | undefined;
export declare function GUILD_DELETE(this: Paracord, data: UnavailableGuild): Guild | UnavailableGuild | undefined;
export declare function GATEWAY_IDENTIFY(this: Paracord, gateway: Gateway): void;
export declare function GATEWAY_CLOSE(this: Paracord, { gateway, shouldReconnect }: {
    gateway: Gateway;
    shouldReconnect: boolean;
}): void;
