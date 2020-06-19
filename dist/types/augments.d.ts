import { GuildMembersChunkEventFields, RawGuild, RawGuildMember, RawMessage, RawPresence, RawUser, RawVoiceState } from '.';
export interface AugmentedRawGuildMember extends RawGuildMember {
    user: RawUser;
}
export interface AugmentedRawVoiceState extends RawVoiceState {
    member: AugmentedRawGuildMember;
}
export interface AugmentedRawGuild extends RawGuild {
    voice_states?: AugmentedRawVoiceState[];
    presences?: RawPresence[];
    members?: AugmentedRawGuildMember[];
}
export interface AugmentedGuildMembersChunkEventFields extends GuildMembersChunkEventFields {
    members: AugmentedRawGuildMember[];
}
export interface AugmentedRawMessage extends RawMessage {
    member: AugmentedRawGuildMember;
}
