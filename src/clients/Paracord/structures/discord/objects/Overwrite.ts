
import { RawOverwrite, Snowflake } from '../../../../../types';

export default class Overwrite {
  /** role or user id */
  public id: Snowflake;

  /** either "role" or "member" */
  public type: 0 | 1;

  /** permission bit set */
  public allow: number;

  /** permission bit set */
  public deny: number;

  public constructor(overwrite: RawOverwrite) {
    const {
      id, type, allow, deny,
    } = overwrite;

    this.id = id;
    this.type = type;
    this.allow = allow;
    this.deny = deny;
  }

  public update(overwrite: RawOverwrite): this {
    const { allow, deny } = overwrite;

    if (this.allow !== allow) this.allow = allow;
    if (this.deny !== deny) this.allow = deny;

    return this;
  }
}
