"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _filteredProps;
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
class Base {
    constructor(filteredProps) {
        _filteredProps.set(this, void 0);
        __classPrivateFieldSet(this, _filteredProps, filteredProps);
    }
    update(newObj) {
        var _a, _b, _c, _d, _e;
        let i = 0;
        for (const [key, newValue] of Object.entries(newObj)) {
            if ((_c = (_b = (_a = __classPrivateFieldGet(this, _filteredProps)) === null || _a === void 0 ? void 0 : _a.props) === null || _b === void 0 ? void 0 : _b.includes(key)) !== null && _c !== void 0 ? _c : true) {
                const camelKey = utils_1.snakeToCamel(key);
                const curValue = this[camelKey];
                if (curValue instanceof Base) {
                    if (typeof newValue === 'object' && (newValue === null || newValue === void 0 ? void 0 : newValue.constructor.name) === 'Object') {
                        curValue.update(newValue);
                    }
                }
                else if (curValue !== newValue) {
                    this[camelKey] = newValue;
                }
                if (++i === ((_e = (_d = __classPrivateFieldGet(this, _filteredProps)) === null || _d === void 0 ? void 0 : _d.props) === null || _e === void 0 ? void 0 : _e.length)) {
                    break;
                }
            }
        }
    }
    isCached(prop) {
        var _a, _b, _c;
        return (_c = (_b = (_a = __classPrivateFieldGet(this, _filteredProps)) === null || _a === void 0 ? void 0 : _a.caches) === null || _b === void 0 ? void 0 : _b.includes(prop)) !== null && _c !== void 0 ? _c : true;
    }
    isInProps(prop) {
        var _a, _b, _c;
        return (_c = (_b = (_a = __classPrivateFieldGet(this, _filteredProps)) === null || _a === void 0 ? void 0 : _a.props) === null || _b === void 0 ? void 0 : _b.includes(prop)) !== null && _c !== void 0 ? _c : true;
    }
}
exports.default = Base;
_filteredProps = new WeakMap();
