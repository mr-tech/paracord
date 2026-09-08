"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.takePendingCloseIntent = exports.setPendingCloseIntent = exports.takePendingOrigin = exports.setPendingOrigin = void 0;
const pendingOrigin = new WeakMap();
function setPendingOrigin(key, origin) {
    pendingOrigin.set(key, origin);
}
exports.setPendingOrigin = setPendingOrigin;
function takePendingOrigin(key) {
    const origin = pendingOrigin.get(key);
    pendingOrigin.delete(key);
    return origin;
}
exports.takePendingOrigin = takePendingOrigin;
const pendingCloseIntent = new WeakMap();
function setPendingCloseIntent(key, origin) {
    pendingCloseIntent.set(key, origin);
}
exports.setPendingCloseIntent = setPendingCloseIntent;
function takePendingCloseIntent(key) {
    const origin = pendingCloseIntent.get(key);
    pendingCloseIntent.delete(key);
    return origin;
}
exports.takePendingCloseIntent = takePendingCloseIntent;
