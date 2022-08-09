import { shortMethod, stripLeadingSlash } from '../../../utils';

import type { Method } from 'axios';

/** Basic information in a request to Discord. */
export default class BaseRequest {
  /** HTTP method of the request. */
  public method: Method;

  /** Discord REST endpoint target of the request. (e.g. channels/123) */
  public url: string;

  /** Key generated from the method and minor parameters of a request used internally to get shared buckets. */
  public bucketHashKey: string;

  /** "Major Parameter" used to differentiate rate limit states. */
  public topLevelResource: string;

  /** "Major Parameter" ID used to differentiate rate limit states. */
  private topLevelID: string;

  /** Key for this specific requests rate limit state in the rate limit cache. (TLR + TLR ID + Bucket Hash) */
  public rateLimitKey: undefined | string;

  public static formatRateLimitKey(tlr: string, tlrID: string, bucketHash: string) {
    return `${tlr}-${tlrID}-${bucketHash}`;
  }

  /**
   * Creates a new base request object with its associated rate limit identifiers.
   *
   * @param method HTTP method of the request.
   * @param url Discord REST endpoint target of the request. (e.g. channels/123)
   */
  public constructor(method: Method, url: string, topLevelResource: string, topLevelID: string, bucketHash: undefined | string, bucketHashKey: string) {
    this.method = method;
    this.url = stripLeadingSlash(url);

    this.topLevelResource = topLevelResource;
    this.topLevelID = topLevelID;
    this.bucketHashKey = bucketHashKey;
    this.rateLimitKey = bucketHash && BaseRequest.formatRateLimitKey(this.topLevelResource, this.topLevelID, bucketHash);
  }

  public get logKey(): string {
    return `${shortMethod(this.method)}-${this.topLevelResource}-${this.bucketHashKey}`;
  }

  getRateLimitKey(bucketHash?: undefined): undefined | string;

  getRateLimitKey(bucketHash: string): string;

  getRateLimitKey(bucketHash?: undefined | string): undefined | string {
    if (this.rateLimitKey) return this.rateLimitKey;

    if (bucketHash) {
      this.rateLimitKey = BaseRequest.formatRateLimitKey(this.topLevelResource, this.topLevelID, bucketHash);
      return this.rateLimitKey;
    }

    return undefined;
  }
}
