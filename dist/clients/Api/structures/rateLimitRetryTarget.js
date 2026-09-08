"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const backoffSchedule_1 = __importDefault(require("../../Gateway/structures/backoffSchedule"));
function computeRateLimitRetryTarget(now, resetTimestamp, waitUntil, informationFreeRetryCount) {
    const directed = Math.max(Number.isFinite(resetTimestamp) ? resetTimestamp : 0, waitUntil ?? 0);
    if (directed > now) {
        return { target: directed, nextInformationFreeRetryCount: 0 };
    }
    const nextInformationFreeRetryCount = informationFreeRetryCount + 1;
    return {
        target: now + (0, backoffSchedule_1.default)(nextInformationFreeRetryCount),
        nextInformationFreeRetryCount,
    };
}
exports.default = computeRateLimitRetryTarget;
