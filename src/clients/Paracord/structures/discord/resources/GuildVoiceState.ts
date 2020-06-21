import {
  AugmentedRawVoiceState, ClientStatus, ISO8601timestamp, Snowflake,
} from '../../../../../types';
import { FilteredProps } from '../../../types';
import Resource from '../../Resource';
import Activity from '../objects/Activity';
import GuildMember from './GuildMember';
import User from './User';

export default class GuildVoiceState extends Resource<GuildVoiceState, AugmentedRawVoiceState> {
  /** the user presence is being updated for */
  user: User | undefined;

  member: GuildMember | undefined;

  /** roles this user is in */
  roles: Snowflake[] | undefined;

  /** null, or the user's current activity */
  game: Activity | null | undefined;

  /** id of the guild */
  guildId: Snowflake | undefined;

  /** either "idle", "dnd", "online", or "offline" */
  status: string | undefined;

  /** user's current activities */
  activities: Activity[] | undefined;

  /** user's platform-dependent status */
  clientStatus: ClientStatus | undefined;

  /** when the user started boosting the guild */
  premiumSince: ISO8601timestamp | null | undefined;

  /** this users guild nickname (if one is set) */
  nick: string | null | undefined;

  public constructor(
    filteredProps: FilteredProps<GuildVoiceState, AugmentedRawVoiceState> | undefined,
    voiceState: AugmentedRawVoiceState, user: User | undefined, member: GuildMember | undefined,
  ) {
    super(filteredProps, voiceState.user_id);
    this.user = user;
    this.member = member;
  }

  public update(arg: AugmentedRawVoiceState): this {
    return super.update(arg);
  }
}
