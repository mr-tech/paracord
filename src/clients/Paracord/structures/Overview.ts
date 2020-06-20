
import { RawOverwrite, Snowflake } from '../../../types';

const ROLE_STRING = 'role'; // for interning
const MEMBER_STRING = 'member'; // for interning

export default class Overwrite {
  /** role or user id */
  public id: Snowflake;

  /** either "role" or "member" */
  public type: 'role' | 'member';

  /** permission bit set */
  public allow: number;

  /** permission bit set */
  public deny: number;

  public constructor(overwrite: RawOverwrite) {
    const {
      id, type, allow, deny,
    } = overwrite;

    this.id = id;
    this.type = type === ROLE_STRING ? ROLE_STRING : MEMBER_STRING;
    this.allow = allow;
    this.deny = deny;
  }

  public update(overwrite: RawOverwrite): void {
    const { allow, deny } = overwrite;

    if (this.allow !== allow) this.allow = allow;
    if (this.deny !== deny) this.allow = deny;
  }
}
