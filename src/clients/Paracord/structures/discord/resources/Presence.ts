import {
  ClientStatus, ISO8601timestamp, RawPresence, Snowflake,
} from '../../../../../types';
import { FilteredProps } from '../../../types';
import Resource from '../../Resource';
import Activity from '../objects/Activity';
import User from './User';

export default class Presence extends Resource<Presence, RawPresence> {
  /** the user presence is being updated for */
  user: User | { id: Snowflake };

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

  public constructor(filteredProps: FilteredProps<Presence, RawPresence> | undefined, presence: RawPresence) {
    super(filteredProps, presence.user.id);
    this.user = presence.user;
  }

  public update(arg: RawPresence): this {
    return super.update(arg);
  }
}
