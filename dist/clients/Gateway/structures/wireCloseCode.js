"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Whether `code` is legal on an actual WebSocket close frame. Matches the WebSocket
 * client library's own validator: 1000-1014 excluding 1004, 1005 and 1006 (reserved —
 * 1006 in particular is never sent on the wire, only synthesised locally for an
 * abnormal closure), or the private-use range 3000-4999. Every other integer,
 * including ones outside a typed caller's enum, is rejected the same way.
 * @internal
 */
function isValidWireCloseCode(code) {
    return (code >= 1000 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006)
        || (code >= 3000 && code <= 4999);
}
exports.default = isValidWireCloseCode;
