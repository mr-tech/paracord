import { DefaultMessageNotificationLevel, EmojiMap, ExplicitContentFilterLevel, GuildChannel, GuildChannelMap, GuildFeature, GuildMember, GuildMemberMap, GuildMemberUpdateEventFields, GuildRole, GuildVoiceState, ISO8601timestamp, MFALevel, PremiumTier, PresenceMap, RawChannel, RawGuild, RawGuildMember, RawPresence, RawRole, RawVoiceState, RoleMap, Snowflake, SystemChannelFlags, VerificationLevel, VoiceRegion, VoiceStateMap } from '../../../types';
import Paracord from '../Paracord';
export default class Guild {
    readonly id: Snowflake;
    readonly name: string;
    readonly icon: string | null;
    readonly splash: string | null;
    readonly discoverySplash: string | null;
    readonly ownerId: Snowflake;
    readonly region: VoiceRegion;
    readonly afkChannelId: Snowflake | null;
    readonly afkTimeout: number;
    readonly embedEnabled?: boolean;
    readonly embedChannelId?: Snowflake | null;
    readonly verificationLevel: VerificationLevel;
    readonly defaultMessageNotifications: DefaultMessageNotificationLevel;
    readonly explicitContentFilter: ExplicitContentFilterLevel;
    readonly roles: RoleMap;
    readonly emojis: EmojiMap;
    readonly features: GuildFeature[];
    readonly mfaLevel: MFALevel;
    readonly applicationId: Snowflake | null;
    readonly widgetEnabled?: boolean;
    readonly widgetChannelId?: Snowflake | null;
    readonly systemChannelId: Snowflake | null;
    readonly systemChannelFlags: SystemChannelFlags;
    readonly rulesChannelId: Snowflake | null;
    readonly joinedAt: ISO8601timestamp;
    readonly large?: boolean;
    unavailable: boolean;
    memberCount?: number;
    readonly voiceStates: VoiceStateMap;
    readonly members: GuildMemberMap;
    readonly channels: GuildChannelMap;
    readonly presences: PresenceMap;
    readonly maxPresences?: number | null;
    readonly maxMembers?: number;
    readonly vanityUrlCode: string | null;
    readonly description: string | null;
    readonly banner: string | null;
    readonly premiumTier: PremiumTier;
    readonly premiumSubscriptionCount?: number;
    readonly preferredLocale: string;
    readonly publicUpdatesChannelId: Snowflake | null;
    readonly maxVideoChannelUsers?: number;
    owner?: GuildMember;
    me: GuildMember;
    readonly shard: number;
    constructor(guildCreate: Partial<RawGuild>, client: Paracord, shard: number);
    get createdOn(): number;
    mergeGuildData(guildData: Partial<RawGuild>, client: Paracord): Guild;
    hasPermission(permission: number, member: GuildMember, adminOverride?: boolean): boolean;
    hasChannelPermission(permission: number, member: GuildMember, channel: GuildChannel | Snowflake, stopOnOwnerAdmin?: boolean): boolean;
    upsertChannel(channel: RawChannel): GuildChannel;
    upsertRole(role: RawRole): GuildRole;
    private upsertEmoji;
    upsertMember(member: RawGuildMember | GuildMemberUpdateEventFields, client: Paracord): GuildMember;
    upsertVoiceState(voiceState: RawVoiceState, client: Paracord): GuildVoiceState;
    private upsertPresence;
    setPresence(presence: RawPresence): void;
    deletePresence(userId: Snowflake): void;
}
