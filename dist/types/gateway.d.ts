import { GuildMember, ISO8601timestamp, RawEmoji, RawRole, RawUser, Snowflake, UnavailableGuild, User } from '.';
export declare type GatewayPayload = {
    op: number;
    d: unknown;
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
    largeThreshold?: number;
    shard?: [number, number];
    presence?: GatewayStatusUpdate;
    guildSubscriptions?: boolean;
    intents?: number;
};
export declare type IdentifyConnectionProperties = {
    $os: string;
    $browser: string;
    $device: string;
};
export declare type Resume = {
    token: string;
    sessionId: string;
    seq: number;
};
export declare type GuildRequestMembers = {
    guildId: Snowflake | Snowflake[];
    query?: string;
    limit: number;
    presences?: boolean;
    userIds?: Snowflake | Snowflake[];
    nonce?: string;
};
export declare type GatewayVoiceStateUpdate = {
    guildId: Snowflake;
    channelId: Snowflake | null;
    selfMute: boolean;
    selfDeaf: boolean;
};
export declare type GatewayStatusUpdate = {
    since: number | null;
    game: Activity | null;
    status: string;
    afk: boolean;
};
export declare type StatusTypes = ['online' | 'dnd' | 'idle' | 'invisible' | 'offline'];
export declare type Hello = {
    heartbeatInterval: number;
};
export declare type ReadyEventFields = {
    v: number;
    user: User;
    privateChannels: [];
    guilds: UnavailableGuild[];
    sessionId: string;
    shard?: [number, number];
};
export declare type ChannelPinsUpdateEventFields = {
    guildId?: Snowflake;
    channelId: Snowflake;
    lastPinTimestamp?: ISO8601timestamp;
};
export declare type GuildBanAddEventFields = {
    guildId: Snowflake;
    user: User;
};
export declare type GuildBanRemoveEventFields = {
    guildId: Snowflake;
    user: User;
};
export declare type GuildEmojisUpdateEventFields = {
    guildId: Snowflake;
    emojis: [];
};
export declare type GuildIntegrationsUpdateEventFields = {
    guildId: Snowflake;
};
export declare type GuildMemberAddExtraFields = {
    guildId: Snowflake;
};
export declare type GuildMemberRemoveEventFields = {
    guildId: Snowflake;
    user: User;
};
export declare type GuildMemberUpdateEventFields = {
    guildId: Snowflake;
    roles: Snowflake[];
    user: User;
    nick?: string | null;
    premiumSince?: ISO8601timestamp | null;
};
export declare type GuildMembersChunkEventFields = {
    guildId: Snowflake;
    members: GuildMember[];
    chunkIndex: number;
    chunkCount: number;
    notFound?: [];
    presences?: RawPresence[];
    nonce?: string;
};
export declare type GuildRoleCreateEventFields = {
    guildId: Snowflake;
    role: RawRole;
};
export declare type GuildRoleUpdateEventFields = {
    guildId: Snowflake;
    role: RawRole;
};
export declare type GuildRoleDeleteEventFields = {
    guildId: Snowflake;
    roleId: Snowflake;
};
export declare type InviteCreateEventFields = {
    channelId: Snowflake;
    code: string;
    createdAt: number;
    guildId?: Snowflake;
    inviter?: User;
    maxAge: number;
    maxUses: number;
    targetUser?: Partial<User>;
    targetUserType?: number;
    temporary: boolean;
    uses: number;
};
export declare type InviteDeleteEventFields = {
    channelId: Snowflake;
    guildId?: Snowflake;
    code: string;
};
export declare type MessageDeleteEventFields = {
    id: Snowflake;
    channelId: Snowflake;
    guildId?: Snowflake;
};
export declare type MessageDeleteBulkEventFields = {
    ids: Snowflake[];
    channelId: Snowflake;
    guildId?: Snowflake;
};
export declare type MessageReactionAddEventFields = {
    userId: Snowflake;
    channelId: Snowflake;
    messageId: Snowflake;
    guildId?: Snowflake;
    member?: GuildMember;
    emoji: Partial<RawEmoji>;
};
export declare type MessageReactionRemoveEventFields = {
    userId: Snowflake;
    channelId: Snowflake;
    messageId: Snowflake;
    guildId?: Snowflake;
    emoji: Partial<RawEmoji>;
};
export declare type MessageReactionRemoveAllEventFields = {
    channelId: Snowflake;
    messageId: Snowflake;
    guildId?: Snowflake;
};
export declare type MessageReactionRemoveEmoji = {
    channelId: Snowflake;
    guildId?: Snowflake;
    messageId: Snowflake;
    emoji: Partial<RawEmoji>;
};
export declare type RawPresence = {
    user: RawUser;
    roles?: Snowflake[];
    game?: Activity | null;
    guildId?: Snowflake;
    status?: string;
    activities?: Activity[];
    clientStatus?: ClientStatus;
    premiumSince?: ISO8601timestamp | null;
    nick?: string | null;
};
export declare type ClientStatus = {
    desktop?: string;
    mobile?: string;
    web?: string;
};
export declare type Activity = {
    name: string;
    type: number;
    url?: string | null;
    createdAt: number;
    timestamps?: ActivityTimestamps;
    applicationId?: Snowflake;
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
    largeImage?: string;
    largeText?: string;
    smallImage?: string;
    smallText?: string;
};
export declare type ActivitySecrets = {
    join?: string;
    spectate?: string;
    match?: string;
};
export declare const enum ActivityFlags {
    INSTANCE = 1,
    JOIN = 2,
    SPECTATE = 4,
    JOIN_REQUEST = 8,
    SYNC = 16,
    PLAY = 32
}
export declare type TypingStartEventFields = {
    channelId: Snowflake;
    guildId?: Snowflake;
    userId: Snowflake;
    timestamp: number;
    member?: GuildMember;
};
export declare type VoiceServerUpdateEventFields = {
    token: string;
    guildId: Snowflake;
    endpoint: string;
};
export declare type WebhookUpdateEventFields = {
    guildId: Snowflake;
    channelId: Snowflake;
};
