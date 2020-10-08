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
  permissions: string | undefined;

  /** whether this role is managed by an integration */
  managed: boolean | undefined;

  /** whether this role is mentionable */
  mentionable: boolean | undefined;

  #filteredProps: FilteredProps<Role, RawRole> | undefined;

  public constructor(filteredProps: FilteredProps<Role, RawRole> | undefined, role: RawRole) {
    super(filteredProps, role.id);
    this.#filteredProps = filteredProps;
    this.update(role);
  }

  public update(arg: RawRole): this {
    if (
      arg.name !== undefined
        && (!this.#filteredProps || 'name' in this)
        && arg.name !== this.name) this.name = arg.name;
    if (
      arg.color !== undefined
        && (!this.#filteredProps || 'color' in this)
        && arg.color !== this.color) this.color = arg.color;
    if (
      arg.hoist !== undefined
        && (!this.#filteredProps || 'hoist' in this)
        && arg.hoist !== this.hoist) this.hoist = arg.hoist;
    if (
      arg.position !== undefined
        && (!this.#filteredProps || 'position' in this)
        && arg.position !== this.position) this.position = arg.position;
    if (
      arg.permissions !== undefined
        && (!this.#filteredProps || 'permissions' in this)
        && arg.permissions !== this.permissions) this.permissions = arg.permissions;
    if (
      arg.managed !== undefined
        && (!this.#filteredProps || 'managed' in this)
        && arg.managed !== this.managed) this.managed = arg.managed;
    if (
      arg.mentionable !== undefined
        && (!this.#filteredProps || 'mentionable' in this)
        && arg.mentionable !== this.mentionable) this.mentionable = arg.mentionable;
    return this;
  }
}
