import {
  AugmentedRawVoiceState, Snowflake,
} from '../../../../../types';
import { FilterOptions } from '../../../types';
import Guild from './Guild';
import GuildChannel from './GuildChannel';
import GuildMember from './GuildMember';
import User from './User';

export default class GuildVoiceState {
  #filteredProps: FilterOptions['props']['guildVoiceState'] | undefined;

  /** the user presence is being updated for */
  #user: User | undefined;

  /** the guild member this voice state is for */
  #member: GuildMember | undefined;

  #guild: Guild;

  #channel: GuildChannel;

  /** the user id this voice state is for */
  #userId: Snowflake;

  /** the channel id this user is connected to */
  public channelId: Snowflake | null | undefined;

  /** the session id for this voice state */
  public sessionId: string | undefined;

  /** whether this user is deafened by the server */
  public deaf: boolean | undefined;

  /** whether this user is muted by the server */
  public mute: boolean | undefined;

  /** whether this user is locally deafened */
  public selfDeaf: boolean | undefined;

  /** whether this user is locally muted */
  public selfMute: boolean | undefined;

  /** whether this user is streaming using "Go Live" */
  public selfStream: boolean | undefined;

  /** whether this user's camera is enabled */
  public selfVideo: boolean | undefined;

  /** whether this user is muted by the current user */
  public suppress: boolean | undefined;

  public constructor(
    filteredProps: FilterOptions['props'] | undefined,
    voiceState: AugmentedRawVoiceState,
    user: User | undefined,
    member: GuildMember | undefined,
    guild: Guild,
    channel: GuildChannel,
  ) {
    this.#filteredProps = filteredProps?.guildVoiceState;
    this.#member = member;
    if (!this.#user && user) {
      this.#user = user;
      user.incrementActiveReferenceCount();
    }
    this.#guild = guild;
    this.#channel = channel;
    this.#userId = voiceState.user_id;


    this.initialize(voiceState);
  }

  public get guild(): Guild {
    return this.#guild;
  }

  public get channel(): GuildChannel {
    return this.#channel;
  }

  public get member(): GuildMember | undefined {
    return this.#member;
  }

  public get user(): User | undefined {
    return this.#user;
  }

  public getUserId(): string {
    return this.#userId;
  }

  public update(voiceState: AugmentedRawVoiceState, channel?: GuildChannel): this {
    if (channel !== undefined) this.#channel = channel;

    if ((this.#filteredProps === undefined || 'deaf' in this)
    ) this.deaf = voiceState.deaf;
    if ((this.#filteredProps === undefined || 'mute' in this)
    ) this.mute = voiceState.mute;
    if ((this.#filteredProps === undefined || 'selfDeaf' in this)
    ) this.selfDeaf = voiceState.self_deaf;
    if ((this.#filteredProps === undefined || 'selfMute' in this)
    ) this.selfMute = voiceState.self_mute;
    if (
      voiceState.self_stream !== undefined
      && (this.#filteredProps === undefined || 'selfStream' in this)
    ) this.selfStream = voiceState.self_stream;
    if ((this.#filteredProps === undefined || 'selfVideo' in this)
    ) this.selfVideo = voiceState.self_video;
    if ((this.#filteredProps === undefined || 'suppress' in this)
    ) this.suppress = voiceState.suppress;

    return this;
  }

  private initialize(voiceState: AugmentedRawVoiceState): this {
    this.initializeProperties();

    if (
      voiceState.session_id !== undefined
      && (this.#filteredProps === undefined || 'sessionId' in this)
    ) this.sessionId = voiceState.session_id;

    return this.update(voiceState);
  }

  private initializeProperties(): void {
    if (this.#filteredProps !== undefined) {
      this.#filteredProps.forEach((prop) => {
        (<Record<string, unknown>> this)[prop] = undefined;
      });
    }
  }

  public setMember(member: GuildMember): void {
    if (this.#member) return;

    this.#member = member;
    if (!this.user) {
      this.#user = member.user;
      member.user.incrementActiveReferenceCount();
    }
  }

  public dereference(): void {
    this.#user = undefined;
    this.#member = undefined;
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    this.#filteredProp = undefined;
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    this.#guild = undefined;
    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    this.#channel = undefined;
  }
}
