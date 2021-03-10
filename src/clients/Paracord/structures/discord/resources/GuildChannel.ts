import { ISO8601timestamp, RawChannel, Snowflake } from '../../../../../types';
import { timestampFromSnowflake } from '../../../../../utils';
import { FilterOptions } from '../../../types';
import Overwrite from '../objects/Overwrite';
import Guild from './Guild';

export default class GuildChannel {
  #filteredProps: FilterOptions['props']['guildChannel'] | undefined;

  /** the user's id */
  #id: Snowflake; // identify

  #guild: Guild;

  /** the type of channel */
  public type: number | undefined;

  // /** the id of the guild */
  // public guildId: Snowflake | undefined;

  /** sorting position of the channel */
  public position: number | undefined;

  /** explicit permission overwrites for members and roles */
  public permissionOverwrites: Overwrite[] | undefined;

  /** the name of the channel (2-100 characters) */
  public name: string | undefined;

  /** the channel topic (0-1024 characters) */
  public topic: string | null | undefined;

  /** whether the channel is nsfw */
  public nsfw: boolean | undefined;

  /** the id of the last message sent in this channel (may not point to an existing or valid message) */
  public lastMessageId: Snowflake | null | undefined;

  /** the bitrate (in bits) of the voice channel */
  public bitrate: number | undefined;

  /** the user limit of the voice channel */
  public userLimit: number | undefined;

  /** amount of seconds a user has to wait before sending another message (0-21600) | undefined;  bots, as well as users with the permission `manage_messages` or `manage_channel`, are unaffected */
  public rateLimitPerUser: number | undefined;

  /** id of the parent category for a channel (each parent category can contain up to 50 channels) */
  public parentId: Snowflake | null | undefined;

  /** when the last pinned message was pinned. This may be `null` in events such as `GUILD_CREATE` when a message is not pinned. */
  public lastPinTimestamp: ISO8601timestamp | null | undefined;

  public constructor(filteredProps: FilterOptions['props'] | undefined, channel: RawChannel, guild: Guild) {
    this.#filteredProps = filteredProps?.guildChannel;
    this.#id = channel.id;
    this.#guild = guild;

    this.initialize(channel);
  }

  /** The epoch timestamp of when this guild was created extract from its Id. */
  public get createdOn(): number {
    return timestampFromSnowflake(this.#id);
  }

  public get id(): Snowflake {
    return this.#id;
  }

  public get guild(): Guild {
    return this.#guild;
  }

  public update(arg: RawChannel): this {
    if (
      arg.type !== undefined
      && (!this.#filteredProps || 'type' in this)
    ) this.type = arg.type;
    if (
      arg.position !== undefined
      && (!this.#filteredProps || 'position' in this)
    ) this.position = arg.position;
    if (
      arg.permission_overwrites !== undefined
      && (!this.#filteredProps || 'permissionOverwrites' in this)
    ) this.permissionOverwrites = arg.permission_overwrites.map((o) => new Overwrite(o));
    if (
      arg.name !== undefined
      && (!this.#filteredProps || 'name' in this)
      && arg.name !== this.name
    ) this.name = arg.name;
    if (
      arg.topic !== undefined
      && (!this.#filteredProps || 'topic' in this)
      && arg.topic !== this.topic
    ) this.topic = arg.topic;
    if (
      arg.nsfw !== undefined
      && (!this.#filteredProps || 'nsfw' in this)
    ) this.nsfw = arg.nsfw;
    if (
      arg.last_message_id !== undefined
      && (!this.#filteredProps || 'lastMessageId' in this)
      && arg.last_message_id !== this.lastMessageId
    ) this.lastMessageId = arg.last_message_id;
    if (
      arg.bitrate !== undefined
      && (!this.#filteredProps || 'bitrate' in this)
    ) this.bitrate = arg.bitrate;
    if (
      arg.user_limit !== undefined
      && (!this.#filteredProps || 'userLimit' in this)
    ) this.userLimit = arg.user_limit;
    if (
      arg.rate_limit_per_user !== undefined
      && (!this.#filteredProps || 'rateLimitPerUser' in this)
    ) this.rateLimitPerUser = arg.rate_limit_per_user;
    if (
      arg.parent_id !== undefined
      && (!this.#filteredProps || 'parentId' in this)
      && arg.parent_id !== this.parentId
    ) this.parentId = arg.parent_id;
    if (
      arg.last_pin_timestamp !== undefined
      && (!this.#filteredProps || 'lastPinTimestamp' in this)
      && arg.last_pin_timestamp !== this.lastPinTimestamp
    ) this.lastPinTimestamp = arg.last_pin_timestamp;

    return this;
  }

  private initialize(channel: RawChannel): this {
    this.initializeProperties();

    return this.update(channel);
  }

  private initializeProperties(): void {
    if (this.#filteredProps !== undefined) {
      this.#filteredProps.forEach((prop) => {
        (<Record<string, unknown>> this)[prop] = undefined;
      });
    }
  }

  public dereference(): void {
    this.#filteredProps = undefined;
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    this.#guild = undefined;
  }
}
