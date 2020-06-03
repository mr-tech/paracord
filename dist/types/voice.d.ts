import { RawGuildMember, Snowflake } from '.';
export declare type RawVoiceState = {
    guildId?: Snowflake;
    channelId: Snowflake | null;
    userId: Snowflake;
    member?: RawGuildMember;
    sessionId: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfStream?: boolean;
    suppress: boolean;
};
export declare type VoiceRegion = {
    id: string;
    name: string;
    vip: boolean;
    optimal: boolean;
    deprecated: boolean;
    custom: boolean;
};
