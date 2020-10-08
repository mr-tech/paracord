import {
  ClientStatus, RawPresence, Snowflake, RawActivity,
} from '../../../../../types';
import { FilteredProps } from '../../../types';
import Resource from '../../Resource';
// import Activity from '../objects/Activity';
import User from './User';

const STATUS_DND_STRING = 'dnd';
const STATUS_IDLE_STRING = 'idle';
const STATUS_ONLINE_STRING = 'online';
const STATUS_OFFLINE_STRING = 'offline';

export default class Presence extends Resource<Presence, RawPresence> {
  /** the user presence is being updated for */
  user: User | { id: Snowflake };

  /** either "idle", "dnd", "online", or "offline" */
  status: string | undefined;

  /** user's current activities */
  activities: RawActivity[] | undefined;
  // activities: Activity[] | undefined;

  /** user's platform-dependent status */
  clientStatus: ClientStatus | undefined;

  private static internStatusString(p: RawPresence): 'dnd' | 'idle' | 'online' | 'offline' {
    switch (p.status) {
      case 'dnd':
        return STATUS_DND_STRING;
      case 'idle':
        return STATUS_IDLE_STRING;
      case 'online':
        return STATUS_ONLINE_STRING;
      case 'offline':
        return STATUS_OFFLINE_STRING;
      default:
        return p.status;
    }
  }

  public constructor(filteredProps: FilteredProps<Presence, RawPresence> | undefined, presence: RawPresence) {
    super(filteredProps, presence.user.id);
    this.user = presence.user;
    super.update(presence);
  }

  public update(arg: RawPresence): this {
    if (arg.user !== undefined && 'user' in this) this.user = arg.user;
    if (arg.status !== undefined && 'status' in this) this.status = Presence.internStatusString(arg);
    if (arg.activities !== undefined && 'activities' in this) this.activities = arg.activities;
    if (arg.client_status !== undefined && 'clientStatus' in this) this.clientStatus = arg.client_status;

    return this;
    // return super.update(arg);
  }
}
