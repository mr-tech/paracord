import { RawRole } from '../../../../../types';
import { FilteredProps } from '../../../types';
import Resource from '../../Resource';

export default class Role extends Resource<Role, RawRole> {
  /** role name */
  name: string | undefined;

  /** integer representation of hexadecimal color code */
  color: number | undefined;

  /** if this role is pinned in the user listing */
  hoist: boolean | undefined;

  /** position of this role */
  position: number | undefined;

  /** permission bit set */
  permissions: number | undefined;

  /** whether this role is managed by an integration */
  managed: boolean | undefined;

  /** whether this role is mentionable */
  mentionable: boolean | undefined;

  public constructor(filteredProps: FilteredProps<Role, RawRole> | undefined, role: RawRole) {
    super(filteredProps, role.id);
  }

  public update(arg: RawRole): this {
    return super.update(arg);
  }
}
