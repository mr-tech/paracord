import {
  ClientStatus, RawPresence, Snowflake, RawActivity,
} from '../../../../../types';
import { FilterOptions } from '../../../types';
import Activity from '../objects/Activity';
import User from './User';

const STATUS_DND_STRING = 'dnd';
const STATUS_IDLE_STRING = 'idle';
const STATUS_ONLINE_STRING = 'online';
const STATUS_OFFLINE_STRING = 'offline';

export default class Presence {
  #filteredProps: FilterOptions['props']['presence'] | undefined;

  #filteredActivityProps: FilterOptions['props']['activity'] | undefined;

  /** the user presence is being updated for */
  user: User | { id: Snowflake };

  /** either "idle", "dnd", "online", or "offline" */
  status: string | undefined;

  /** user's current activities */
  activities: Activity[] | undefined;

  /** user's platform-dependent status */
  clientStatus: ClientStatus | undefined;

  /** how many guilds in this client that this presence belongs to */
  #guildCount: number;

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

  public constructor(filteredProps: FilterOptions['props'] | undefined, presence: RawPresence) {
    this.#filteredProps = filteredProps?.presence;
    this.#filteredActivityProps = filteredProps?.activity;
    this.user = presence.user;
    this.#guildCount = 0;

    this.initialize(presence);
  }

  public update(arg: RawPresence): this {
    if ((!this.#filteredProps || 'status' in this)
        && arg.status !== this.status
    ) this.status = Presence.internStatusString(arg);
    if (arg.activities !== undefined
        && (!this.#filteredProps || 'activities' in this)
    ) {
      this.updateActivities(arg.activities);
    }
    if ((!this.#filteredProps || 'clientStatus' in this)
    ) this.clientStatus = arg.client_status;

    return this;
  }


  public get guildCount(): number {
    return this.#guildCount;
  }


  private updateActivities(rawActivities: RawActivity[]) {
    const existingActivities = this.activities ?? [];
    const newActivities = [];

    for (const rawActivity of rawActivities) {
      const existingActivity = existingActivities.find(Presence.activityIsSame.bind(null, rawActivity));

      let activity: Activity;
      if (existingActivity === undefined) {
        activity = new Activity(this.#filteredActivityProps, rawActivity);
      } else {
        activity = existingActivity.update(rawActivity);
      }
      newActivities.push(activity);
    }

    this.activities = newActivities;
  }

  private initialize(presence: RawPresence): this {
    this.initializeProperties();

    if (!this.#filteredProps || 'user' in this) this.user = presence.user;

    return this.update(presence);
  }

  private initializeProperties(): void {
    if (this.#filteredProps !== undefined) {
      this.#filteredProps.forEach((prop) => {
        (<Record<string, unknown>> this)[prop] = undefined;
      });
    }
  }

  private static activityIsSame(a: RawActivity, b: Activity): boolean {
    if (a.application_id !== undefined && b.applicationId === undefined) return false;
    if (a.application_id === undefined && b.applicationId !== undefined) return false;
    if (a.application_id === undefined && b.applicationId === undefined) {
      return a.created_at === b.createdAt && a.name === b.name;
    }
    return a.application_id === b.applicationId;
  }

  public incrementGuildCount(): void {
    this.#guildCount++;
  }

  public decrementGuildCount(): void {
    this.#guildCount--;
  }
}
