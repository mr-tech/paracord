"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isValidWireCloseCode(code) {
    return (code >= 1000 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006)
        || (code >= 3000 && code <= 4999);
}
exports.default = isValidWireCloseCode;
