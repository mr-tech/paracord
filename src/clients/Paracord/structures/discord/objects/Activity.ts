import {
  ActivityEmoji, ActivityParty, ActivitySecret, AugmentedActivityAssets, Activity as RawActivity, ActivityTimestamp as RawActivityTimestamp, Snowflake,
} from '../../../../../types';
import { FilterOptions } from '../../../types';

export default class Activity {
  #filteredProps: FilterOptions['props']['activity'] | undefined;

  /** the activity's name */
  public name: string | undefined;

  /** activity type */
  public type: number | undefined;

  /** stream url, is validated when type is 1 */
  public url: string | null | undefined;

  /** unix timestamp of when the activity was added to the user's session */
  public createdAt: number | undefined;

  /** unix timestamps for start and/or end of the game */
  public timestamps: RawActivityTimestamp | undefined;

  /** application id for the game */
  public applicationId: Snowflake | undefined;

  /** what the player is currently doing */
  public details: string | null | undefined;

  /** the user's current party status */
  public state: string | null | undefined;

  /** the emoji used for a custom status */
  public emoji: ActivityEmoji | null | undefined;

  /** information for the current party of the player */
  public party: ActivityParty | undefined;

  /** images for the presence and their hover texts */
  public assets: AugmentedActivityAssets | undefined;

  /** secrets for Rich Presence joining and spectating */
  public secrets: ActivitySecret | undefined;

  /** whether or not the activity is an instanced game session */
  public instance: boolean | undefined;

  /** activity flags `OR`d together, describes what the payload includes */
  public flags: number | undefined;

  public constructor(filteredProps: FilterOptions['props']['activity'] | undefined, activity: RawActivity) {
    this.#filteredProps = filteredProps;

    this.initialize(activity);
  }

  public update(arg: RawActivity): this {
    if (
      (this.#filteredProps === undefined || 'type' in this)
    ) this.type = arg.type;
    if (
      arg.url !== undefined
      && (this.#filteredProps === undefined || 'url' in this)
      && this.url !== arg.url
    ) this.url = arg.url;
    if (
      arg.timestamps !== undefined
      && (this.#filteredProps === undefined || 'timestamps' in this)
    ) this.timestamps = arg.timestamps;
    if (
      arg.details !== undefined
      && (this.#filteredProps === undefined || 'details' in this)
      && this.details !== arg.details
    ) this.details = arg.details;
    if (
      arg.state !== undefined
      && (this.#filteredProps === undefined || 'state' in this)
      && this.state !== arg.state
    ) this.state = arg.state;
    if (
      arg.emoji !== undefined
      && (this.#filteredProps === undefined || 'emoji' in this)
    ) this.emoji = arg.emoji;
    if (
      arg.party !== undefined
      && (this.#filteredProps === undefined || 'party' in this)
    ) this.party = arg.party;
    if (
      arg.assets !== undefined
      && (this.#filteredProps === undefined || 'assets' in this)
    ) this.assets = arg.assets;
    if (
      arg.secrets !== undefined
      && (this.#filteredProps === undefined || 'secrets' in this)
    ) this.secrets = arg.secrets;
    if (
      arg.instance !== undefined
      && (this.#filteredProps === undefined || 'instance' in this)
    ) this.instance = arg.instance;
    if (
      arg.flags !== undefined
      && (this.#filteredProps === undefined || 'flags' in this)
    ) this.flags = arg.flags;

    return this;
  }

  private initialize(activity: RawActivity): this {
    this.initializeProperties();

    if (this.#filteredProps === undefined || 'name' in this) this.name = activity.name;
    if (this.#filteredProps === undefined || 'createdAt' in this) this.createdAt = activity.created_at;
    if (
      activity.application_id !== undefined
      && (this.#filteredProps === undefined || 'applicationId' in this)
    ) this.applicationId = activity.application_id;

    return this.update(activity);
  }

  private initializeProperties(): void {
    if (this.#filteredProps !== undefined) {
      this.#filteredProps.forEach((prop) => {
        (<Record<string, unknown>> this)[prop] = undefined;
      });
    }
  }
}
