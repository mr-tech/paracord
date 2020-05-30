"use strict";
function upsertCommon(obj, newProps) {
    if (obj.filtering) {
        assignFilteredProperties(obj, newProps);
    }
    else {
        Object.assign(obj, Array.from(Object.entries(newProps)).map(([key, value]) => ({ [snakeToCamel(key)]: value })));
    }
}
function assignFilteredProperties(obj, filter, newProps) {
    const { filterWhitelist, filterProps } = filter;
    if (filterWhitelist) {
        assignWhitelistedProperties(obj, newProps, filterProps);
    }
    else {
        assignNonBlacklistedProperties(obj, newProps, filterProps);
    }
}
function assignWhitelistedProperties(obj, newProps, filterProps) {
    for (const [key, value] of Object.entries(newProps)) {
        if (value !== undefined && filterProps.includes(key)) {
            obj[snakeToCamel(key)] = value;
        }
    }
}
function assignNonBlacklistedProperties(obj, newProps, filterProps) {
    for (const [key, value] of Object.entries(newProps)) {
        if (value !== undefined && !filterProps.includes(key)) {
            obj[snakeToCamel(key)] = value;
        }
    }
}
module.exports = {
    assignWhitelistedProperties,
    assignNonBlacklistedProperties,
    assignFilteredProperties,
    upsertCommon,
};
