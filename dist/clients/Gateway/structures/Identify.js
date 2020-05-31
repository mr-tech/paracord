"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Identify {
    constructor(token, identity = {}) {
        this.properties = {
            $os: process.platform,
            $browser: 'Paracord',
            $device: 'Paracord',
        };
        this.presence = {
            status: 'online',
            afk: false,
            game: null,
            since: null,
        };
        Object.assign(this, identity);
        this.token = token;
    }
}
exports.default = Identify;
