import { ISO8601timestamp, Snowflake, User, EmojiMap, VoiceRegion, RawRole, RawEmoji, RawChannel, RawPresence, RawVoiceState } from '.';
export declare type RawGuild = {
    id: Snowflake;
    name: string;
    icon: string | null;
    splash: string | null;
    discoverySplash: string | null;
    owner?: boolean;
    ownerId: Snowflake;
    permissions?: number;
    region: VoiceRegion;
    afkChannelId: Snowflake | null;
    afkTimeout: number;
    embedEnabled?: boolean;
    embedChannelId?: Snowflake | null;
    verificationLevel: VerificationLevel;
    defaultMessageNotifications: DefaultMessageNotificationLevel;
    explicitContentFilter: ExplicitContentFilterLevel;
    roles: RawRole[];
    emojis: RawEmoji[];
    features: GuildFeature[];
    mfaLevel: MFALevel;
    applicationId: Snowflake | null;
    widgetEnabled?: boolean;
    widgetChannelId?: Snowflake | null;
    systemChannelId: Snowflake | null;
    systemChannelFlags: SystemChannelFlags;
    rulesChannelId: Snowflake | null;
    joinedAt?: ISO8601timestamp;
    large?: boolean;
    unavailable?: boolean;
    memberCount?: number;
    voiceStates?: RawVoiceState[];
    members?: RawGuildMember[];
    channels?: RawChannel[];
    presences?: RawPresence[];
    maxPresences?: number | null;
    maxMembers?: number;
    vanityUrlCode: string | null;
    description: string | null;
    banner: string | null;
    premiumTier: PremiumTier;
    premiumSubscriptionCount?: number;
    preferredLocale: string;
    publicUpdatesChannelId: Snowflake | null;
    maxVideoChannelUsers?: number;
    approximateMemberCount?: number;
    approximatePresenceCount?: number;
};
export declare type DefaultMessageNotificationLevel = [0 | 1];
export declare type ExplicitContentFilterLevel = [0 | 1 | 2];
export declare type MFALevel = [0 | 1];
export declare type VerificationLevel = [0 | 1 | 2 | 3 | 4];
export declare type PremiumTier = [0 | 1 | 2 | 3];
export declare enum SystemChannelFlags {
    SUPPRESS_JOIN_NOTIFICATIONS = 1,
    SUPPRESS_PREMIUM_SUBSCRIPTIONS = 2
}
export declare type GuildFeature = ['INVITE_SPLASH' | 'VIP_REGIONS' | 'VANITY_URL' | 'VERIFIED' | 'PARTNERED' | 'PUBLIC' | 'COMMERCE' | 'NEWS' | 'DISCOVERABLE' | 'FEATURABLE' | 'ANIMATED_ICON' | 'BANNER' | 'PUBLIC_DISABLED' | 'WELCOME_SCREEN_ENABLED'];
export declare type GuildPreview = {
    id: Snowflake;
    name: string;
    icon: string | null;
    splash: string | null;
    discoverySplash: string | null;
    emojis: EmojiMap;
    features: GuildFeature[];
    approximateMemberCount: number;
    approximatePresenceCount: number;
    description: string | null;
};
export declare type GuildWidget = {
    enabled: boolean;
    channelId: Snowflake | null;
};
export declare type RawGuildMember = {
    user: User;
    nick: string | null;
    roles: Snowflake[];
    joinedAt: ISO8601timestamp;
    premiumSince?: ISO8601timestamp | null;
    deaf: boolean;
    mute: boolean;
};
export declare type Integration = {
    id: Snowflake;
    name: string;
    type: string;
    enabled: boolean;
    syncing: boolean;
    roleId: Snowflake;
    enableEmoticons?: boolean;
    expireBehavior: IntegrationExpireBehavior;
    expireGracePeriod: number;
    user: User;
    account: Account;
    syncedAt: ISO8601timestamp;
};
export declare type IntegrationExpireBehavior = [0 | 1];
export declare type IntegrationAccount = {
    id: string;
    name: string;
};
export declare type Ban = {
    reason: string | null;
    user: User;
};
