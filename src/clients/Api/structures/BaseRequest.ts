/** Basic information in a request to Discord. */
export default class BaseRequest {
  /** HTTP method of the request. */
  public method: string

  /** Discord REST endpoint target of the request. (e.g. channels/123) */
  public url: string;

  /** Key generated from the method and minor parameters of a request used internally to get shared buckets. */
  public requestRouteMeta: string;

  /** Key for this specific requests rate limit state in the rate limit cache. */
  public rateLimitKey: string;

  public rateLimitMajorType: string;

  /**
   * Standardizes url by stripping the leading `/` if it exists.
   *
   * @param url Discord endpoint the request will be sent to.
   * @returns A url stripped of leading `/`.
   */
  private static stripUrlLeadingSlash(url: string): string {
    return url.startsWith('/') ? url.replace('/', '') : url;
  }

  /**
   * Extracts the rate limit information needed to navigate rate limits.
   *
   * @param method HTTP method of the request.
   * @param url Discord endpoint the request will be sent to.
   * @returns An object containing the `requestRouteMeta` and `rateLimitKey`.
   */
  private static assignRateLimitMeta(method: string, url: string) {
    const [
      rateLimitMajorType,
      rateLimitMajorID,
      ...rateLimitMinorParameters
    ] = url.split('/');

    const requestRouteMeta = BaseRequest.extractRouteMeta(
      method,
      rateLimitMinorParameters,
    );

    const rateLimitKey = `${rateLimitMajorType}-${rateLimitMajorID}-${requestRouteMeta}`;

    return { rateLimitMajorType, requestRouteMeta, rateLimitKey };
  }

  /**
   * Takes the method and url "minor parameters" to create a key used in navigating rate limits.
   * @param method HTTP method of the request.
   * @param rateLimitMinorParameters Request method and parameters in the url following the major parameter.
   * @returns A key used internally to find related buckets.
   */
  private static extractRouteMeta(method: string, rateLimitMinorParameters: string[]): string {
    const key = [];

    if (method === 'GET') key.push('ge');
    else if (method === 'PUT') key.push('pu');
    else if (method === 'POST') key.push('p');
    else if (method === 'PATCH') key.push('u');
    else if (method === 'DELETE') key.push('d');

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

  /**
   * Creates a new base request object with its associated rate limit identifiers.
   *
   * @param method HTTP method of the request.
   * @param url Discord REST endpoint target of the request. (e.g. channels/123)
   */
  public constructor(method: string, url: string) {
    this.method = method;
    this.url = BaseRequest.stripUrlLeadingSlash(url);

    const { rateLimitMajorType, requestRouteMeta, rateLimitKey } = BaseRequest.assignRateLimitMeta(method, url);

    this.rateLimitMajorType = rateLimitMajorType;
    this.requestRouteMeta = requestRouteMeta;
    this.rateLimitKey = rateLimitKey;
  }
}
