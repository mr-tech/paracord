
import { RawOverwrite, Snowflake } from '../../../../../types';
import Base from '../../Base';
import { FilteredProps } from '../../../types';

const ROLE_STRING = 'role'; // for interning
const MEMBER_STRING = 'member'; // for interning

export default class Overwrite extends Base<Overwrite, RawOverwrite> {
  /** role or user id */
  public id: Snowflake;

  /** either "role" or "member" */
  public type: 'role' | 'member';

  /** permission bit set */
  public allow: number;

  /** permission bit set */
  public deny: number;

  public constructor(filteredProps: FilteredProps<Overwrite, RawOverwrite>, overwrite: RawOverwrite) {
    super(filteredProps);
    const {
      id, type, allow, deny,
    } = overwrite;

    this.id = id;
    this.type = type === ROLE_STRING ? ROLE_STRING : MEMBER_STRING;
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
