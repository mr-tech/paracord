import {
  AugmentedRawVoiceState, Snowflake,
} from '../../../../../types';
import { FilteredProps } from '../../../types';
import Resource from '../../Resource';
import GuildMember from './GuildMember';
import User from './User';

export default class GuildVoiceState extends Resource<GuildVoiceState, AugmentedRawVoiceState> {
  /** the user presence is being updated for */
  #user: User | undefined;

  /** the channel id this user is connected to */
  channelId: Snowflake | null | undefined;

  /** the user id this voice state is for */
  userId: Snowflake | undefined;

  /** the guild member this voice state is for */
  member: GuildMember | undefined;

  /** the session id for this voice state */
  sessionId: string | undefined;

  /** whether this user is deafened by the server */
  deaf: boolean | undefined;

  /** whether this user is muted by the server */
  mute: boolean | undefined;

  /** whether this user is locally deafened */
  selfDeaf: boolean | undefined;

  /** whether this user is locally muted */
  selfMute: boolean | undefined;

  /** whether this user is streaming using "Go Live" */
  selfStream: boolean | undefined;

  /** whether this user is muted by the current user */
  suppress: boolean | undefined;

  public constructor(
    filteredProps: FilteredProps<GuildVoiceState, AugmentedRawVoiceState> | undefined,
    voiceState: AugmentedRawVoiceState, user: User | undefined, member: GuildMember | undefined,
  ) {
    super(filteredProps, voiceState.user_id);
    this.#user = user;
    this.member = member;
    this.update(voiceState);
  }

  public get user(): User | undefined {
    return this.#user;
  }

  public update(arg: AugmentedRawVoiceState): this {
    return super.update(arg);
  }
}
