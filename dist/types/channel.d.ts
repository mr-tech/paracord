import { GuildMember, ISO8601timestamp, RawEmoji, RawGuildMember, RawRole, Snowflake, User } from '.';
export declare type RawChannel = {
    id: Snowflake;
    type: number;
    guildId?: Snowflake;
    position?: number;
    permissionOverwrites?: Overwrite[];
    name?: string;
    topic?: string | null;
    nsfw?: boolean;
    lastMessageId?: Snowflake | null;
    bitrate?: number;
    userLimit?: number;
    rateLimitPerUser?: number;
    recipients?: User[];
    icon?: string | null;
    ownerId?: Snowflake;
    applicationId?: Snowflake;
    parentId?: Snowflake | null;
    lastPinTimestamp?: ISO8601timestamp;
};
export declare type Message = {
    id: Snowflake;
    channelId: Snowflake;
    guildId?: Snowflake;
    author: User;
    member?: RawGuildMember;
    content: string;
    timestamp: ISO8601timestamp;
    editedTimestamp: ISO8601timestamp | null;
    tts: boolean;
    mentionEveryone: boolean;
    mentions: User & Partial<GuildMember>;
    mentionRoles: RawRole[];
    mentionChannels?: ChannelMention[];
    attachments: Attachment[];
    embeds: Embed[];
    reactions?: Reaction[];
    nonce?: number | string;
    pinned: boolean;
    webhookId?: Snowflake;
    type: number;
    activity?: MessageActivity;
    application?: MessageApplication;
    messageReference?: MessageReference;
    flags?: number;
};
export declare type MessageTypes = [0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 14 | 15];
export declare type MessageActivity = {
    type: number;
    partyId?: string;
};
export declare type MessageApplication = {
    id: Snowflake;
    coverImage?: string;
    description: string;
    icon: string | null;
    name: string;
};
export declare type MessageReference = {
    messageId?: Snowflake;
    channelId: Snowflake;
    guildId?: Snowflake;
};
export declare type MessageActivityTypes = [1 | 2 | 3 | 5];
export declare const enum MessageFlags {
    CROSSPOSTED = 1,
    IS_CROSSPOST = 2,
    SUPPRESS_EMBEDS = 4,
    SOURCE_MESSAGE_DELETED = 8,
    URGENT = 16
}
export declare type Reaction = {
    count: number;
    me: boolean;
    emoji: Partial<RawEmoji>;
};
export declare type Overwrite = {
    id: Snowflake;
    type: string;
    allow: number;
    deny: number;
};
export declare type Embed = {
    title?: string;
    type?: string;
    description?: string;
    url?: string;
    timestamp?: ISO8601timestamp;
    color?: number;
    footer?: EmbedFooter;
    image?: EmbedImage;
    thumbnail?: EmbedThumbnail;
    video?: EmbedVideo;
    provider?: EmbedProvider;
    author?: EmbedAuthor;
    fields?: EmbedField[];
};
export declare type EmbedThumbnail = {
    url?: string;
    proxyUrl?: string;
    height?: number;
    width?: number;
};
export declare type EmbedVideo = {
    url?: string;
    height?: number;
    width?: number;
};
export declare type EmbedImage = {
    url?: string;
    proxyUrl?: string;
    height?: number;
    width?: number;
};
export declare type EmbedProvider = {
    name?: string;
    url?: string;
};
export declare type EmbedAuthor = {
    name?: string;
    url?: string;
    iconUrl?: string;
    proxyIconUrl?: string;
};
export declare type EmbedFooter = {
    text: string;
    iconUrl?: string;
    proxyIconUrl?: string;
};
export declare type EmbedField = {
    name: string;
    value: string;
    inline?: boolean;
};
export declare type Attachment = {
    id: Snowflake;
    filename: string;
    size: number;
    url: string;
    proxyUrl: string;
    height: number | null;
    width: number | null;
};
export declare type ChannelMention = {
    id: Snowflake;
    guildId: Snowflake;
    type: number;
    name: string;
};
export declare type AllowedMentionTypes = ['roles' | 'users' | 'everyone'];
export declare type AllowedMentions = {
    parse: AllowedMentionTypes[];
    roles: Snowflake[];
    users: Snowflake[];
};
