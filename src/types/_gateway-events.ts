import {
  Guild, ReadyEventField, Hello, ChannelPinsUpdateEventField, ThreadListSyncEventField,
  ThreadMemberUpdateEventExtraField, ThreadMembersUpdateEventField, GuildBanAddEventField,
  GuildBanRemoveEventField, GuildEmojisUpdateEventField, GuildStickersUpdateEventField,
  GuildIntegrationsUpdateEventField, GuildMemberAddExtraField, GuildMemberRemoveEventField, GuildMemberUpdateEventField,
  GuildMembersChunkEventField, GuildRoleCreateEventField, GuildRoleUpdateEventField, GuildRoleDeleteEventField,
  GuildScheduledEventUserAddEventField, GuildScheduledEventUserRemoveEventField, IntegrationCreateEventAdditionalField,
  IntegrationUpdateEventAdditionalField, IntegrationDeleteEventField, InviteCreateEventField, InviteDeleteEventField,
  MessageDeleteEventField, MessageDeleteBulkEventField, MessageReactionAddEventField, MessageReactionRemoveEventField,
  MessageReactionRemoveAllEventField, MessageReactionRemoveEmojiEventField, Channel, ThreadMember, Message,
  GuildMember, Integration, GuildScheduledEvent, Interaction, TypingStartEventField, VoiceServerUpdateEventField,
  WebhooksUpdateEventField, StageInstance, User, VoiceState, GuildThread, GuildChannel, AugmentedGuildMember, GatewayPresence,
} from '.';

export type GATEWAY_OPEN_EVENT = null;
export type GATEWAY_IDENTIFY_EVENT = null;
export type HELLO_EVENT = Hello;
export type READY_EVENT = ReadyEventField;

export type UNAVAILABLE_GUILD = {
  id: string;
  unavailable: true;
}

export type CHANNEL_CREATE_EVENT = GuildChannel;
export type CHANNEL_UPDATE_EVENT = GuildChannel;
export type CHANNEL_DELETE_EVENT = GuildChannel;
export type CHANNEL_PINS_UPDATE_EVENT = ChannelPinsUpdateEventField;

export type THREAD_CREATE_EVENT = GuildThread & {
  newly_created: true;
};
export type THREAD_DELETE_EVENT = Pick<Required<Channel>, 'id' | 'guild_id' | 'parent_id' | 'type'>;
export type THREAD_LIST_SYNC_EVENT = ThreadListSyncEventField;
export type THREAD_MEMBER_UPDATE_EVENT = ThreadMember & ThreadMemberUpdateEventExtraField;
export type THREAD_MEMBERS_UPDATE_EVENT = ThreadMembersUpdateEventField;

export type GUILD_CREATE_EVENT = Pick<Required<Guild>,
'afk_channel_id' |
'afk_timeout' |
'application_id' |
'banner' |
'default_message_notifications' |
'description' |
'discovery_splash' |
'emojis' |
'guild_scheduled_events' |
'features' |
'icon' |
'id' |
'joined_at' |
'large' |
'max_members' |
'max_video_channel_users' |
'member_count' |
'mfa_level' |
'name' |
'nsfw_level' |
'owner_id' |
'preferred_locale' |
'premium_subscription_count' |
'premium_progress_bar_enabled' |
'premium_tier' |
'public_updates_channel_id' |
'region' |
'roles' |
'rules_channel_id' |
'splash' |
'stage_instances' |
'stickers' |
'system_channel_id' |
'vanity_url_code' |
'verification_level' |
'voice_states'> & {
  members: AugmentedGuildMember[];
  channels: GuildChannel[];
  threads: GuildThread[];
  presences: GatewayPresence[];
}
export type STARTUP_GUILD_EVENT = GUILD_CREATE_EVENT | UNAVAILABLE_GUILD;
export type GUILD_UPDATE_EVENT = Pick<Required<Guild>,
  'afk_channel_id' |
  'afk_timeout' |
  'application_id' |
  'banner' |
  'default_message_notifications' |
  'description' |
  'discovery_splash' |
  'emojis' |
  'features' |
  'icon' |
  'id' |
  'max_members' |
  'max_video_channel_users' |
  'mfa_level' |
  'name' |
  'nsfw_level' |
  'owner_id' |
  'preferred_locale' |
  'premium_subscription_count' |
  'premium_progress_bar_enabled' |
  'premium_tier' |
  'public_updates_channel_id' |
  'region' |
  'roles' |
  'rules_channel_id' |
  'splash' |
  'stickers' |
  'system_channel_id' |
  'vanity_url_code' |
  'verification_level'
> & {
  guild_id: string;
}
export type GUILD_DELETE_EVENT = {
  id: string;
  unavailable?: true;
}

export type GUILD_BAN_ADD_EVENT = GuildBanAddEventField;

export type GUILD_BAN_REMOVE_EVENT = GuildBanRemoveEventField;

export type GUILD_EMOJIS_UPDATE_EVENT = GuildEmojisUpdateEventField;

export type GUILD_STICKERS_UPDATE_EVENT = GuildStickersUpdateEventField;

export type GUILD_INTEGRATIONS_UPDATE_EVENT = GuildIntegrationsUpdateEventField;

export type GUILD_MEMBER_ADD_EVENT = GuildMember & GuildMemberAddExtraField;

export type GUILD_MEMBER_REMOVE_EVENT = GuildMemberRemoveEventField;

export type GUILD_MEMBER_UPDATE_EVENT = GuildMemberUpdateEventField;

export type GUILD_MEMBERS_CHUNK_EVENT = GuildMembersChunkEventField;

export type GUILD_ROLE_CREATE_EVENT = GuildRoleCreateEventField;

export type GUILD_ROLE_UPDATE_EVENT = GuildRoleUpdateEventField;

export type GUILD_ROLE_DELETE_EVENT = GuildRoleDeleteEventField;

export type GUILD_SCHEDULED_EVENT_CREATE_EVENT = GuildScheduledEvent;

export type GUILD_SCHEDULED_EVENT_UPDATE_EVENT = GuildScheduledEvent;

export type GUILD_SCHEDULED_EVENT_DELETE_EVENT = GuildScheduledEvent;

export type GUILD_SCHEDULED_EVENT_USER_ADD_EVENT = GuildScheduledEventUserAddEventField

export type GUILD_SCHEDULED_EVENT_USER_REMOVE_EVENT = GuildScheduledEventUserRemoveEventField

export type INTEGRATION_CREATE_EVENT = Integration & IntegrationCreateEventAdditionalField;

export type INTEGRATION_UPDATE_EVENT = Integration & IntegrationUpdateEventAdditionalField;

export type INTEGRATION_DELETE_EVENT = IntegrationDeleteEventField;

export type INTERACTION_CREATE_EVENT = Interaction;

export type INVITE_CREATE_EVENT = InviteCreateEventField;

export type INVITE_DELETE_EVENT = InviteDeleteEventField;

export type MESSAGE_CREATE_EVENT = Message;

export type MESSAGE_UPDATE_EVENT = Partial<Message> & Pick<Message, 'id' | 'channel_id'>;

export type MESSAGE_DELETE_EVENT = MessageDeleteEventField;

export type MESSAGE_DELETE_BULK_EVENT = MessageDeleteBulkEventField;

export type MESSAGE_REACTION_ADD_EVENT = MessageReactionAddEventField;

export type MESSAGE_REACTION_REMOVE_EVENT = MessageReactionRemoveEventField;

export type MESSAGE_REACTION_REMOVE_ALL_EVENT = MessageReactionRemoveAllEventField;

export type MESSAGE_REACTION_REMOVE_EMOJI_EVENT = MessageReactionRemoveEmojiEventField;

export type PRESENCE_UPDATE_EVENT = GatewayPresence;

export type STAGE_INSTANCE_CREATE_EVENT = StageInstance;

export type STAGE_INSTANCE_DELETE_EVENT = StageInstance;

export type STAGE_INSTANCE_UPDATE_EVENT = StageInstance;

export type TYPING_START_EVENT = TypingStartEventField;

export type USER_UPDATE_EVENT = User;

export type VOICE_STATE_UPDATE_EVENT = VoiceState;

export type VOICE_SERVER_UPDATE_EVENT = VoiceServerUpdateEventField;

export type WEBHOOKS_UPDATE_EVENT = WebhooksUpdateEventField;
