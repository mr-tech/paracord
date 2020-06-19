import { ISO8601timestamp, RawEmoji, RawGuildMember, RawRole, Snowflake, RawUser } from '.';
export declare type RawChannel = {
    id: Snowflake;
    type: number;
    guild_id?: Snowflake;
    position?: number;
    permission_overwrites?: Overwrite[];
    name?: string;
    topic?: string | null;
    nsfw?: boolean;
    last_message_id?: Snowflake | null;
    bitrate?: number;
    user_limit?: number;
    rate_limit_per_user?: number;
    recipients?: RawUser[];
    icon?: string | null;
    owner_id?: Snowflake;
    application_id?: Snowflake;
    parent_id?: Snowflake | null;
    last_pin_timestamp?: ISO8601timestamp;
};
export declare type RawMessage = {
    id: Snowflake;
    channel_id: Snowflake;
    guild_id?: Snowflake;
    author: RawUser;
    member?: Partial<RawGuildMember>;
    content: string;
    timestamp: ISO8601timestamp;
    edited_timestamp: ISO8601timestamp | null;
    tts: boolean;
    mention_everyone: boolean;
    mentions: RawUser & Partial<RawGuildMember>;
    mention_roles: RawRole[];
    mention_channels?: ChannelMention[];
    attachments: Attachment[];
    embeds: Embed[];
    reactions?: Reaction[];
    nonce?: number | string;
    pinned: boolean;
    webhook_id?: Snowflake;
    type: number;
    activity?: MessageActivity;
    application?: MessageApplication;
    message_reference?: MessageReference;
    flags?: number;
};
export declare type MessageTypes = [0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 14 | 15];
export declare type MessageActivity = {
    type: number;
    party_id?: string;
};
export declare type MessageApplication = {
    id: Snowflake;
    cover_image?: string;
    description: string;
    icon: string | null;
    name: string;
};
export declare type MessageReference = {
    message_id?: Snowflake;
    channel_id: Snowflake;
    guild_id?: Snowflake;
};
export declare type MessageActivityTypes = [1 | 2 | 3 | 5];
export declare enum MessageFlags {
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
    proxy_url?: string;
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
    proxy_url?: string;
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
    icon_url?: string;
    proxy_icon_url?: string;
};
export declare type EmbedFooter = {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
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
    proxy_url: string;
    height: number | null;
    width: number | null;
};
export declare type ChannelMention = {
    id: Snowflake;
    guild_id: Snowflake;
    type: number;
    name: string;
};
export declare type AllowedMentionTypes = ['roles' | 'users' | 'everyone'];
export declare type AllowedMentions = {
    parse: AllowedMentionTypes[];
    roles: Snowflake[];
    users: Snowflake[];
};
