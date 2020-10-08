import { ISO8601timestamp, RawChannel, Snowflake } from '../../../../../types';
import { FilteredProps } from '../../../types';
import Resource from '../../Resource';
import Overwrite from '../objects/Overwrite';

export default class GuildChannel extends Resource<GuildChannel, RawChannel> {
  /** the type of channel */
  type: number | undefined;

  /** the id of the guild */
  guildId: Snowflake | undefined;

  /** sorting position of the channel */
  position: number | undefined;

  /** explicit permission overwrites for members and roles */
  permissionOverwrites: Overwrite[] | undefined;

  /** the name of the channel (2-100 characters) */
  name: string | undefined;

  /** the channel topic (0-1024 characters) */
  topic: string | null | undefined;

  /** whether the channel is nsfw */
  nsfw: boolean | undefined;

  /** the id of the last message sent in this channel (may not point to an existing or valid message) */
  lastMessageId: Snowflake | null | undefined;

  /** the bitrate (in bits) of the voice channel */
  bitrate: number | undefined;

  /** the user limit of the voice channel */
  userLimit: number | undefined;

  /** amount of seconds a user has to wait before sending another message (0-21600); bots, as well as users with the permission `manage_messages` or `manage_channel`, are unaffected */
  rateLimitPerUser: number | undefined;

  /** id of the parent category for a channel (each parent category can contain up to 50 channels) */
  parentId: Snowflake | null | undefined;

  /** when the last pinned message was pinned */
  lastPinTimestamp: ISO8601timestamp | undefined;

  #filteredProps: FilteredProps<GuildChannel, RawChannel> | undefined;

  public constructor(filteredProps: FilteredProps<GuildChannel, RawChannel> | undefined, channel: RawChannel) {
    super(filteredProps, channel.id);
    this.#filteredProps = filteredProps;
    this.update(channel);
  }

  public update(arg: RawChannel): this {
    if (
      arg.type !== undefined
        && (!this.#filteredProps || 'type' in this)
        && arg.type !== this.type) this.type = arg.type;
    if (
      arg.position !== undefined
        && (!this.#filteredProps || 'position' in this)
        && arg.position !== this.position) this.position = arg.position;
    if (
      arg.permission_overwrites !== undefined
        && (!this.#filteredProps || 'permissionOverwrites' in this)
        // && arg.permission_overwrites !== this.permissionOverwrites
    ) this.permissionOverwrites = arg.permission_overwrites.map((o) => new Overwrite(o));
    if (
      arg.name !== undefined
        && (!this.#filteredProps || 'name' in this)
        && arg.name !== this.name) this.name = arg.name;
    if (
      arg.topic !== undefined
        && (!this.#filteredProps || 'topic' in this)
        && arg.topic !== this.topic) this.topic = arg.topic;
    if (
      arg.nsfw !== undefined
        && (!this.#filteredProps || 'nsfw' in this)
        && arg.nsfw !== this.nsfw) this.nsfw = arg.nsfw;
    if (
      arg.last_message_id !== undefined
        && (!this.#filteredProps || 'lastMessageId' in this)
        && arg.last_message_id !== this.lastMessageId) this.lastMessageId = arg.last_message_id;
    if (
      arg.bitrate !== undefined
        && (!this.#filteredProps || 'bitrate' in this)
        && arg.bitrate !== this.bitrate) this.bitrate = arg.bitrate;
    if (
      arg.user_limit !== undefined
        && (!this.#filteredProps || 'userLimit' in this)
        && arg.user_limit !== this.userLimit) this.userLimit = arg.user_limit;
    if (
      arg.rate_limit_per_user !== undefined
        && (!this.#filteredProps || 'rateLimitPerUser' in this)
        && arg.rate_limit_per_user !== this.rateLimitPerUser) this.rateLimitPerUser = arg.rate_limit_per_user;
    if (
      arg.parent_id !== undefined
        && (!this.#filteredProps || 'parentId' in this)
        && arg.parent_id !== this.parentId) this.parentId = arg.parent_id;
    if (
      arg.last_pin_timestamp !== undefined
        && (!this.#filteredProps || 'lastPinTimestamp' in this)
        && arg.last_pin_timestamp !== this.lastPinTimestamp) this.lastPinTimestamp = arg.last_pin_timestamp;
    return this;
  }
}
