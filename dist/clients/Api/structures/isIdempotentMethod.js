"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);
function isIdempotentMethod(method) {
    return IDEMPOTENT_METHODS.has(method.toUpperCase());
}
exports.default = isIdempotentMethod;
