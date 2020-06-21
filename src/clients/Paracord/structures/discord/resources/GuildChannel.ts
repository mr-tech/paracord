import { ISO8601timestamp, RawChannel, Snowflake } from '../../../../../types';
import { FilteredProps } from '../../../types';
import Guild from './Guild';
import Overwrite from '../objects/Overview';
import Resource from '../../Resource';
import User from './User';

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

  /** the recipients of the DM */
  recipients: User[] | undefined;

  /** icon hash */
  icon: string | null | undefined;

  /** id of the DM creator */
  ownerId: Snowflake | undefined;

  /** application id of the group DM creator if it is bot-created */
  applicationId: Snowflake | undefined;

  /** id of the parent category for a channel (each parent category can contain up to 50 channels) */
  parentId: Snowflake | null | undefined;

  /** when the last pinned message was pinned */
  lastPinTimestamp: ISO8601timestamp | undefined;

  public constructor(filteredProps: FilteredProps<GuildChannel, RawChannel> | undefined, channel: RawChannel) {
    super(filteredProps, channel.id);
    this.update(channel);
  }

  public update(arg: RawChannel): this {
    return super.update(arg);
  }
}
