export type GatewayURLQueryStringParam = {
  /** API Version to use */
  v: number; // [API version](#DOCS_REFERENCE/api-versioning-api-versions)
  /** The encoding of received gateway packets */
  encoding: string; // `json` or `etf`
  /** The optional transport compression of gateway packets */
  compress?: string; // `zlib-stream`
};
