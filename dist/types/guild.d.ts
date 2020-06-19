import { ISO8601timestamp, Snowflake, VoiceRegion, RawRole, RawEmoji, RawChannel, RawPresence, RawVoiceState, RawUser } from '.';
import { GuildEmoji } from '../clients/Paracord/types';
export declare type RawGuild = {
    [index: string]: unknown;
    id: Snowflake;
    name: string;
    icon: string | null;
    splash: string | null;
    discovery_splash: string | null;
    owner?: boolean;
    owner_id: Snowflake;
    permissions?: number;
    region: VoiceRegion;
    afk_channel_id: Snowflake | null;
    afk_timeout: number;
    embed_enabled?: boolean;
    embed_channel_id?: Snowflake | null;
    verification_level: VerificationLevel;
    default_message_notifications: DefaultMessageNotificationLevel;
    explicit_content_filter: ExplicitContentFilterLevel;
    roles: RawRole[];
    emojis: GuildEmoji[];
    features: GuildFeature[];
    mfa_level: MFALevel;
    application_id: Snowflake | null;
    widget_enabled?: boolean;
    widget_channel_id?: Snowflake | null;
    system_channel_id: Snowflake | null;
    system_channel_flags: SystemChannelFlags;
    rules_channel_id: Snowflake | null;
    joined_at?: ISO8601timestamp;
    large?: boolean;
    unavailable?: boolean;
    member_count?: number;
    voice_states?: Partial<RawVoiceState>[];
    members?: RawGuildMember[];
    channels?: RawChannel[];
    presences?: Partial<RawPresence>[];
    max_presences?: number | null;
    max_members?: number;
    vanity_url_code: string | null;
    description: string | null;
    banner: string | null;
    premium_tier: PremiumTier;
    premium_subscription_count?: number;
    preferred_locale: string;
    public_updates_channel_id: Snowflake | null;
    max_video_channel_users?: number;
    approximate_member_count?: number;
    approximate_presence_count?: number;
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
    discovery_splash: string | null;
    emojis: RawEmoji[];
    features: GuildFeature[];
    approximate_member_count: number;
    approximate_presence_count: number;
    description: string | null;
};
export declare type GuildWidget = {
    enabled: boolean;
    channel_id: Snowflake | null;
};
export declare type RawGuildMember = {
    user?: RawUser;
    nick: string | null;
    roles: Snowflake[];
    joined_at: ISO8601timestamp;
    premium_since?: ISO8601timestamp | null;
    deaf: boolean;
    mute: boolean;
};
export declare type Integration = {
    id: Snowflake;
    name: string;
    type: string;
    enabled: boolean;
    syncing: boolean;
    role_id: Snowflake;
    enable_emoticons?: boolean;
    expire_behavior: IntegrationExpireBehavior;
    expire_grace_period: number;
    user: RawUser;
    account: Account;
    synced_at: ISO8601timestamp;
};
export declare type IntegrationExpireBehavior = [0 | 1];
export declare type IntegrationAccount = {
    id: string;
    name: string;
};
export declare type Ban = {
    reason: string | null;
    user: RawUser;
};
