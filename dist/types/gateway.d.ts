import { Snowflake, RawUser, ISO8601timestamp, RawRole, RawGuildMember, RawEmoji, UnavailableGuild } from '.';
export declare type GatewayPayload = {
    op: number;
    d: string | number | boolean | null;
    s: number | null;
    t: string | null;
};
export declare type GatewayURLParams = {
    v: number;
    encoding: string;
    compress?: string;
};
export declare type Identify = {
    token: string;
    properties: IdentifyConnectionProperties;
    compress?: boolean;
    large_threshold?: number;
    shard?: [number, number];
    presence?: GatewayStatusUpdate;
    guild_subscriptions?: boolean;
    intents?: number;
};
export declare type IdentifyConnectionProperties = {
    $os: string;
    $browser: string;
    $device: string;
};
export declare type Resume = {
    token: string;
    session_id: string;
    seq: number;
};
export declare type GuildRequestMembers = {
    guild_id: Snowflake | Snowflake[];
    query?: string;
    limit: number;
    presences?: boolean;
    user_ids?: Snowflake | Snowflake[];
    nonce?: string;
};
export declare type GatewayVoiceStateUpdate = {
    guild_id: Snowflake;
    channel_id: Snowflake | null;
    self_mute: boolean;
    self_deaf: boolean;
};
export declare type GatewayStatusUpdate = {
    since: number | null;
    game: RawActivity | null;
    status: string;
    afk: boolean;
};
export declare type StatusTypes = ['online' | 'dnd' | 'idle' | 'invisible' | 'offline'];
export declare type Hello = {
    heartbeat_interval: number;
};
export declare type ReadyEventFields = {
    v: number;
    user: RawUser;
    private_channels: [];
    guilds: UnavailableGuild[];
    session_id: string;
    shard?: [number, number];
};
export declare type ChannelPinsUpdateEventFields = {
    guild_id?: Snowflake;
    channel_id: Snowflake;
    last_pin_timestamp?: ISO8601timestamp;
};
export declare type GuildBanAddEventFields = {
    guild_id: Snowflake;
    user: RawUser;
};
export declare type GuildBanRemoveEventFields = {
    guild_id: Snowflake;
    user: RawUser;
};
export declare type GuildEmojisUpdateEventFields = {
    guild_id: Snowflake;
    emojis: [];
};
export declare type GuildIntegrationsUpdateEventFields = {
    guild_id: Snowflake;
};
export declare type GuildMemberAddExtraFields = {
    guild_id: Snowflake;
};
export declare type GuildMemberRemoveEventFields = {
    guild_id: Snowflake;
    user: RawUser;
};
export declare type GuildMemberUpdateEventFields = {
    guild_id: Snowflake;
    roles: Snowflake[];
    user: RawUser;
    nick?: string | null;
    premium_since?: ISO8601timestamp | null;
};
export declare type GuildMembersChunkEventFields = {
    guild_id: Snowflake;
    members: RawGuildMember[];
    chunk_index: number;
    chunk_count: number;
    not_found?: [];
    presences?: RawPresence[];
    nonce?: string;
};
export declare type GuildRoleCreateEventFields = {
    guild_id: Snowflake;
    role: RawRole;
};
export declare type GuildRoleUpdateEventFields = {
    guild_id: Snowflake;
    role: RawRole;
};
export declare type GuildRoleDeleteEventFields = {
    guild_id: Snowflake;
    role_id: Snowflake;
};
export declare type InviteCreateEventFields = {
    channel_id: Snowflake;
    code: string;
    created_at: number;
    guild_id?: Snowflake;
    inviter?: RawUser;
    max_age: number;
    max_uses: number;
    target_user?: Partial<RawUser>;
    target_user_type?: number;
    temporary: boolean;
    uses: number;
};
export declare type InviteDeleteEventFields = {
    channel_id: Snowflake;
    guild_id?: Snowflake;
    code: string;
};
export declare type MessageDeleteEventFields = {
    id: Snowflake;
    channel_id: Snowflake;
    guild_id?: Snowflake;
};
export declare type MessageDeleteBulkEventFields = {
    ids: Snowflake[];
    channel_id: Snowflake;
    guild_id?: Snowflake;
};
export declare type MessageReactionAddEventFields = {
    user_id: Snowflake;
    channel_id: Snowflake;
    message_id: Snowflake;
    guild_id?: Snowflake;
    member?: RawGuildMember;
    emoji: Partial<RawEmoji>;
};
export declare type MessageReactionRemoveEventFields = {
    user_id: Snowflake;
    channel_id: Snowflake;
    message_id: Snowflake;
    guild_id?: Snowflake;
    emoji: Partial<RawEmoji>;
};
export declare type MessageReactionRemoveAllEventFields = {
    channel_id: Snowflake;
    message_id: Snowflake;
    guild_id?: Snowflake;
};
export declare type MessageReactionRemoveEmoji = {
    channel_id: Snowflake;
    guild_id?: Snowflake;
    message_id: Snowflake;
    emoji: Partial<RawEmoji>;
};
export declare type RawPresence = {
    user: RawUser;
    roles: Snowflake[];
    game: RawActivity | null;
    guild_id: Snowflake;
    status: string;
    activities: RawActivity[];
    client_status: ClientStatus;
    premium_since?: ISO8601timestamp | null;
    nick?: string | null;
};
export declare type ClientStatus = {
    desktop?: string;
    mobile?: string;
    web?: string;
};
export declare type RawActivity = {
    name: string;
    type: number;
    url?: string | null;
    created_at: number;
    timestamps?: ActivityTimestamps;
    application_id?: Snowflake;
    details?: string | null;
    state?: string | null;
    emoji?: ActivityEmoji | null;
    party?: ActivityParty;
    assets?: ActivityAssets;
    secrets?: ActivitySecrets;
    instance?: boolean;
    flags?: number;
};
export declare type ActivityTypes = [0 | 1 | 2 | 4];
export declare type ActivityTimestamps = {
    start?: number;
    end?: number;
};
export declare type ActivityEmoji = {
    name: string;
    id?: Snowflake;
    animated?: boolean;
};
export declare type ActivityParty = {
    id?: string;
    size?: [number, number];
};
export declare type ActivityAssets = {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
};
export declare type ActivitySecrets = {
    join?: string;
    spectate?: string;
    match?: string;
};
export declare enum ActivityFlags {
    INSTANCE = 1,
    JOIN = 2,
    SPECTATE = 4,
    JOIN_REQUEST = 8,
    SYNC = 16,
    PLAY = 32
}
export declare type TypingStartEventFields = {
    channel_id: Snowflake;
    guild_id?: Snowflake;
    user_id: Snowflake;
    timestamp: number;
    member?: RawGuildMember;
};
export declare type VoiceServerUpdateEventFields = {
    token: string;
    guild_id: Snowflake;
    endpoint: string;
};
export declare type WebhookUpdateEventFields = {
    guild_id: Snowflake;
    channel_id: Snowflake;
};
