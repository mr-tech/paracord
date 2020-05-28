"use strict";
module.exports = class RateLimitTemplate {
    constructor({ limit, resetAfter }) {
        this.limit = limit;
        this.resetAfter = resetAfter;
    }
    update({ limit, resetAfter }) {
        if (limit < this.limit) {
            this.limit = limit;
        }
        if (resetAfter > this.resetAfter) {
            this.resetAfter = resetAfter;
        }
    }
};
