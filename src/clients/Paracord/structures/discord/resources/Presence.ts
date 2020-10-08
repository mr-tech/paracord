import { performance } from 'perf_hooks';
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

  #filteredProps: FilteredProps<Presence, RawPresence> | undefined;

  private static internStatusString(p: RawPresence): 'dnd' | 'idle' | 'online' | 'offline' {
    switch (p.status) {
      case STATUS_DND_STRING:
        return STATUS_DND_STRING;
      case STATUS_IDLE_STRING:
        return STATUS_IDLE_STRING;
      case STATUS_ONLINE_STRING:
        return STATUS_ONLINE_STRING;
      case STATUS_OFFLINE_STRING:
        return STATUS_OFFLINE_STRING;
      default:
        return p.status;
    }
  }

  public constructor(filteredProps: FilteredProps<Presence, RawPresence> | undefined, presence: RawPresence) {
    super(filteredProps, presence.user.id);
    this.#filteredProps = filteredProps;
    this.user = presence.user;
    this.update(presence);
  }

  public update(arg: RawPresence): this {
    if (
      arg.status !== undefined
        && (!this.#filteredProps || 'status' in this)
        && arg.status !== this.status
    ) this.status = Presence.internStatusString(arg);
    if (
      arg.activities !== undefined
        && (!this.#filteredProps || 'activities' in this)
        // && arg.activities !== this.activities
    ) this.activities = arg.activities;
    if (
      arg.client_status !== undefined
        && (!this.#filteredProps || 'clientStatus' in this)
        // && arg.client_status !== this.clientStatus
    ) this.clientStatus = arg.client_status;

    return this;
  }
}
