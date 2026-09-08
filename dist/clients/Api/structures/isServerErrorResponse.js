"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isServerErrorResponse(status) {
    return status >= 500 && status <= 599;
}
exports.default = isServerErrorResponse;
