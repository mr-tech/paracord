import { User, Snowflake, Role } from '.';

export type Emoji = {
  /** emoji id */
  id: Snowflake | null;
  /** emoji name */
  name: string | null;
  /** roles this emoji is whitelisted to */
  roles?: Role[];
  /** user that created this emoji */
  user?: User;
  /** whether this emoji must be wrapped in colons */
  requireColons?: boolean;
  /** whether this emoji is managed */
  managed?: boolean;
  /** whether this emoji is animated */
  animated?: boolean;
  /** whether this emoji can be used, may be false due to loss of Server Boosts */
  available?: boolean;
};
