import { AugmentedEmoji, Snowflake } from '../../../../../types';
import { FilteredProps } from '../../../types';
import Resource from '../../Resource';
import Role from './Role';

export default class Emoji extends Resource<Emoji, AugmentedEmoji> {
  /** emoji name */
  name: string | null | undefined;

  /** roles this emoji is whitelisted to */
  roles: Map<Snowflake, Role> | Snowflake[] | undefined;

  /** user that created this emoji */
  user: Snowflake | undefined; // TODO originally object, figure out how to not

  /** whether this emoji must be wrapped in colons */
  requireColons: boolean | undefined;

  /** whether this emoji is managed */
  managed: boolean | undefined;

  /** whether this emoji is animated */
  animated: boolean | undefined;

  /** whether this emoji can be used, may be false due to loss of Server Boosts */
  available: boolean | undefined;

  public constructor(filteredProps: FilteredProps<Emoji, AugmentedEmoji> | undefined, emoji: AugmentedEmoji) {
    super(filteredProps, emoji.id);
    this.update(emoji);
  }

  public update(arg: AugmentedEmoji): this {
    return super.update(arg);
  }
}
