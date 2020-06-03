export default class BaseRequest {
    method: string;
    url: string;
    requestRouteMeta: string;
    rateLimitKey: string;
    private static stripUrlLeadingSlash;
    private static assignRateLimitMeta;
    private static extractRouteMeta;
    constructor(method: string, url: string);
}
