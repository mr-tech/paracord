import { RawRole, Snowflake, RawUser } from '.';

export type RawEmoji = {
  /** emoji id */
  id: Snowflake | null;
  /** emoji name */
  name: string | null;
  /** roles this emoji is whitelisted to */
  roles?: RawRole[];
  /** user that created this emoji */
  user?: RawUser;
  /** whether this emoji must be wrapped in colons */
  require_colons?: boolean;
  /** whether this emoji is managed */
  managed?: boolean;
  /** whether this emoji is animated */
  animated?: boolean;
  /** whether this emoji can be used, may be false due to loss of Server Boosts */
  available?: boolean;
};
