import {
  ActivityEmoji, ActivityParty, ActivitySecrets, AugmentedActivityAssets, RawActivity, ActivityTimestamps, Snowflake,
} from '../../../../../types';
import { FilteredProps } from '../../../types';
import Base from '../../Base';

export default class Activity extends Base<Activity, RawActivity> {
  /** the activity's name */
  name: string | undefined;

  /** activity type */
  type: number | undefined;

  /** stream url, is validated when type is 1 */
  url?: string | null | undefined;

  /** unix timestamp of when the activity was added to the user's session */
  createdAt: number | undefined;

  /** unix timestamps for start and/or end of the game */
  timestamps?: ActivityTimestamps | undefined;

  /** application id for the game */
  applicationId?: Snowflake | undefined;

  /** what the player is currently doing */
  details?: string | null | undefined;

  /** the user's current party status */
  state?: string | null | undefined;

  /** the emoji used for a custom status */
  emoji?: ActivityEmoji | null | undefined;

  /** information for the current party of the player */
  party?: ActivityParty | undefined;

  /** images for the presence and their hover texts */
  assets?: AugmentedActivityAssets | undefined;

  /** secrets for Rich Presence joining and spectating */
  secrets?: ActivitySecrets | undefined;

  /** whether or not the activity is an instanced game session */
  instance?: boolean | undefined;

  /** activity flags `OR`d together, describes what the payload includes */
  flags?: number | undefined;

  public constructor(filteredProps: FilteredProps<Activity, RawActivity> | undefined, activity: RawActivity) {
    super(filteredProps);
    this.update(activity);
  }

  public update(arg: RawActivity): this {
    return super.update(arg);
  }
}
