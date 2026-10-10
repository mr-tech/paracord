"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createClientEndedError() {
    return Error('The Api client has ended. No further requests will be sent.');
}
exports.default = createClientEndedError;
