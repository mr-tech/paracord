import { snakeToCamel } from '../../../Utils';

export function upsertCommon(obj: Record<string, unknown>, newProps: Record<string, unknown>): void {
  if (obj.filtering) {
    assignFilteredProperties(obj, newProps);
  } else {
    Object.assign(obj, Array.from(Object.entries(newProps)).map(([key, value]) => ({ [snakeToCamel(key)]: value })));
  }
}

export function assignFilteredProperties(obj: Record<string, unknown>, filter: Record<string, unknown>, newProps: Record<string, unknown>): void {
  const { filterWhitelist, filterProps } = filter;
  if (filterWhitelist) {
    assignWhitelistedProperties(obj, newProps, filterProps);
  } else {
    assignNonBlacklistedProperties(obj, newProps, filterProps);
  }
}

export function assignWhitelistedProperties(obj: Record<string, unknown>, newProps: Record<string, unknown>, filterProps: string[]): void {
  for (const [key, value] of Object.entries(newProps)) {
    if (value !== undefined && filterProps.includes(key)) {
      obj[snakeToCamel(key)] = value;
    }
  }
}

export function assignNonBlacklistedProperties(obj: Record<string, unknown>, newProps: Record<string, unknown>, filterProps: string[]): void {
  for (const [key, value] of Object.entries(newProps)) {
    if (value !== undefined && !filterProps.includes(key)) {
      obj[snakeToCamel(key)] = value;
    }
  }
}
