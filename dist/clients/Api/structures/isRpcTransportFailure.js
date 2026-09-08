"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../../constants");
const RPC_TRANSPORT_FAILURE_CODES = [
    constants_1.RPC_CLOSE_CODES.LOST_CONNECTION, 4, 1, 13,
];
function isRpcTransportFailure(code) {
    return code !== undefined && RPC_TRANSPORT_FAILURE_CODES.includes(code);
}
exports.default = isRpcTransportFailure;
