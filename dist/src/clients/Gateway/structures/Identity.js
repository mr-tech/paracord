"use strict";
module.exports = class Identity {
    constructor(token, identity = {}) {
        this.properties = {
            os: process.platform,
            browser: 'Paracord',
            device: 'Paracord',
        };
        this.presence = {
            status: 'online',
            afk: false,
        };
        Object.assign(this, identity);
        this.shard = [Number(this.shard[0]), Number(this.shard[1])];
        this.token = token;
    }
};
