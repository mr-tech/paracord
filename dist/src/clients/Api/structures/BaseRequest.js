"use strict";
module.exports = class BaseRequest {
    constructor(method, url) {
        this.method = method;
        this.url = BaseRequest.stripUrlLeadingSlash(url);
        const { requestRouteMeta, rateLimitKey } = BaseRequest.assignRateLimitMeta(method, url);
        this.requestRouteMeta = requestRouteMeta;
        this.rateLimitKey = rateLimitKey;
    }
    static stripUrlLeadingSlash(url) {
        return url.startsWith('/') ? url.replace('/', '') : url;
    }
    static assignRateLimitMeta(method, url) {
        const [rateLimitMajorType, rateLimitMajorID, ...rateLimitMinorParameters] = url.split('/');
        const requestRouteMeta = BaseRequest.extractRouteMeta(method, rateLimitMinorParameters);
        const rateLimitKey = `${rateLimitMajorType}-${rateLimitMajorID}-${requestRouteMeta}`;
        return { requestRouteMeta, rateLimitKey };
    }
    static extractRouteMeta(method, rateLimitMinorParameters) {
        const key = [];
        if (method === 'GET')
            key.push('ge');
        else if (method === 'POST')
            key.push('p');
        else if (method === 'PATCH')
            key.push('u');
        else if (method === 'DELETE')
            key.push('d');
        rateLimitMinorParameters.forEach((param) => {
            switch (param) {
                case 'channels':
                    key.push('c');
                    break;
                case 'members':
                    key.push('m');
                    break;
                case 'guilds':
                    key.push('g');
                    break;
                case 'messages':
                    key.push('msg');
                    break;
                case 'roles':
                    key.push('r');
                    break;
                case 'webhooks':
                    key.push('w');
                    break;
                case 'reactions':
                    key.push('re');
                    break;
                case 'permissions':
                    key.push('p');
                    break;
                case 'invites':
                    key.push('i');
                    break;
                case 'users':
                    key.push('u');
                    break;
                case 'emojis':
                    key.push('e');
                    break;
                case 'embed':
                    key.push('em');
                    break;
                case 'bans':
                    key.push('b');
                    break;
                case 'prune':
                    key.push('pru');
                    break;
                case 'bulk-delete':
                    key.push('bd');
                    break;
                case 'typing':
                    key.push('t');
                    break;
                case 'pins':
                    key.push('pins');
                    break;
                case 'recipients':
                    key.push('re');
                    break;
                case 'preview':
                    key.push('pre');
                    break;
                case 'integrations':
                    key.push('int');
                    break;
                case 'regions':
                    key.push('reg');
                    break;
                case 'slack':
                    key.push('slack');
                    break;
                case 'github':
                    key.push('github');
                    break;
                case 'widget.png':
                    key.push('wid');
                    break;
                case 'vanity-url':
                    key.push('vu');
                    break;
                case 'sync':
                    key.push('s');
                    break;
                case 'connections':
                    key.push('con');
                    break;
                default:
            }
        });
        return key.join('-');
    }
};
