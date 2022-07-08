"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** A frozen instance of a rate limit that is used as a reference for requests with the same bucket but without an existing cached state. */
class RateLimitTemplate {
    /** From Discord - Rate limit request cap. */
    limit;
    /** From Discord - Highest value seen from Discord for rate limit reset wait in ms. */
    resetAfter;
    /** Creates a new rate limit state. */
    constructor({ limit, resetAfter }) {
        this.limit = limit;
        this.resetAfter = resetAfter;
    }
    /** Updates state properties. */
    update({ limit, resetAfter }) {
        if (limit < this.limit) {
            this.limit = limit;
        }
        if (resetAfter > this.resetAfter) {
            this.resetAfter = resetAfter;
        }
    }
}
exports.default = RateLimitTemplate;
