import http from 'http';
import { EventEmitter } from 'events';
import { vi } from 'vitest';

import type net from 'net';
import type Api from '../../src/clients/Api/Api';
import type { ApiOptions } from '../../src/clients/Api/types';

/** One scripted answer to the next request the origin receives. */
export interface ScriptedResponse {
  status: number;
  /** Response headers, lower-cased keys as Discord/axios present them. */
  headers?: Record<string, string>;
  /** JSON-serialised unless `raw` is set. */
  body?: unknown;
  /** Send `body` as-is (a string) with `Content-Type` from `headers`, never JSON-encoded — the Cloudflare-ban shape (HTML, no `x-ratelimit-*`). */
  raw?: boolean;
}

/**
 * One HTTP request the origin finished receiving, in arrival order — plan 001 WP-5 step 3.
 * Fed once the request body ends; the existing `acceptCount` is already this count
 * (`requestCount.length`), so this adds the record, not a new count.
 */
export interface RequestReceipt {
  method: string;
  path: string;
  /** Whether any request body bytes were received (DELETE's is always stripped client-side). */
  bodyReceived: boolean;
  body: string;
}

/**
 * A loopback Discord-REST-API stand-in: a real `http` origin answering a **scripted
 * sequence** of status/headers/body, driven through `Api` — never by constructing
 * `RateLimitHeaders` by hand, which cannot see `Api#updateRateLimitCache` (WP-9b step 0,
 * plan; architect F-1). Real sockets, matching `loopbackGatewayServer.ts`'s convention
 * (no fake `axios`/`http`).
 *
 * `Api.ts` hardcodes its REST base URL to `https://discord.com/api/v<version>`
 * (`DISCORD_API_URL`, `src/constants.ts`) with no consumer-facing override — adding one
 * would be new public API surface and move `api-report/paracord.api.md` (AC-9.6). So
 * `createApiAgainstOrigin` below redirects it the same way any test-only constant
 * substitution does: `vi.doMock` the constants module to this origin's own
 * `http://127.0.0.1:<port>/api`, then a **dynamic** `import()` of `Api` so the mock is in
 * effect before the module graph loads — `vi.mock` (hoisted, static) cannot be
 * parameterised by a port only known after this origin has started. Production source is
 * untouched; only the test's own module registry is redirected, and the exchange over the
 * wire is a real HTTP request/response, not a stub.
 *
 * **Destroy-on-accept mode** (plan 001 WP-5 step 3, `setDestroyOnAccept`): the TCP
 * connection is destroyed the instant it is accepted, before any byte is written —
 * ECONNRESET / `socket hang up` at the client. `requestCount`/`acceptCount` and
 * `requestReceipts` are fed once a request's body has fully arrived (the HTTP `request`
 * event only starts the handler that waits for it) — one per request; under keep-alive
 * several retried sends can share one TCP connection. A send whose body is truncated
 * mid-transfer is accepted at the TCP level but never reaches this feed, so it is
 * recorded by neither `acceptCount` nor `requestReceipts`; the destroy mode goes further
 * still, never reaching even the `request` event, so it can only be measured by
 * `connectionCount` — fed on the TCP-level `connection` event, one per accepted socket —
 * which is why AC-5.1's instrument is the connection count and AC-5.2's is the
 * request-receipt count. The origin consumes every request body (needed for
 * `requestReceipts`' body-agreement field); doing so is measured safe — the receipt
 * count, connection count and client-visible status are identical whether the body is
 * read or not.
 */
export default class LoopbackApiOrigin extends EventEmitter {
  private readonly server: http.Server;

  private script: ScriptedResponse[] = [];

  private defaultResponse: ScriptedResponse = { status: 200, body: {} };

  private destroyOnAccept = false;

  readonly requestCount: number[] = [];

  readonly receivedHeaders: http.IncomingHttpHeaders[] = [];

  /** One entry per TCP `connection` event accepted, timestamped — AC-5.1's instrument. */
  readonly connectionEvents: number[] = [];

  /** One entry per request body fully received, in arrival order — AC-5.2's instrument. */
  readonly requestReceipts: RequestReceipt[] = [];

  private constructor(server: http.Server) {
    super();
    this.server = server;
  }

  static start(): Promise<LoopbackApiOrigin> {
    return new Promise((resolve) => {
      const server = http.createServer();
      const instance = new LoopbackApiOrigin(server);
      server.on('connection', (socket) => instance.handleConnection(socket));
      server.on('request', (req, res) => instance.handleRequest(req, res));
      server.listen(0, '127.0.0.1', () => resolve(instance));
    });
  }

  get port(): number {
    return (this.server.address() as net.AddressInfo).port;
  }

  get url(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  /** Queues responses, one per request, in order. The last one repeats once exhausted. */
  setScript(responses: ScriptedResponse[]): void {
    this.script = [...responses];
  }

  setDefaultResponse(response: ScriptedResponse): void {
    this.defaultResponse = response;
  }

  /**
   * Enables/disables destroy-on-accept mode: every subsequent TCP connection is
   * destroyed the instant it is accepted, before any byte is written — ECONNRESET /
   * `socket hang up` at the client, and the request never reaches `handleRequest`.
   */
  setDestroyOnAccept(enabled: boolean): void {
    this.destroyOnAccept = enabled;
  }

  get acceptCount(): number {
    return this.requestCount.length;
  }

  /** Number of TCP connections accepted so far — the destroy mode's only feed. */
  get connectionCount(): number {
    return this.connectionEvents.length;
  }

  /** Resolves once the origin has answered at least `n` requests. */
  waitForAccept(n: number, timeoutMs = 5000): Promise<void> {
    if (this.requestCount.length >= n) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('accept', check);
        reject(new Error(`waitForAccept timed out after ${timeoutMs}ms waiting for request ${n} (have ${this.requestCount.length})`));
      }, timeoutMs);
      const check = () => {
        if (this.requestCount.length >= n) {
          clearTimeout(timer);
          this.off('accept', check);
          resolve();
        }
      };
      this.on('accept', check);
    });
  }

  /** Resolves once the origin has accepted at least `n` TCP connections. */
  waitForConnection(n: number, timeoutMs = 5000): Promise<void> {
    if (this.connectionEvents.length >= n) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('connection', check);
        reject(new Error(`waitForConnection timed out after ${timeoutMs}ms waiting for connection ${n} (have ${this.connectionEvents.length})`));
      }, timeoutMs);
      const check = () => {
        if (this.connectionEvents.length >= n) {
          clearTimeout(timer);
          this.off('connection', check);
          resolve();
        }
      };
      this.on('connection', check);
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }

  private handleConnection(socket: net.Socket): void {
    this.connectionEvents.push(Date.now());
    this.emit('connection');
    if (this.destroyOnAccept) {
      socket.destroy();
    }
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');

      this.requestCount.push(Date.now());
      this.receivedHeaders.push(req.headers);
      this.requestReceipts.push({
        method: req.method ?? '',
        path: req.url ?? '',
        bodyReceived: body.length > 0,
        body,
      });
      this.emit('accept');

      const scripted = this.script.length > 1 ? this.script.shift() : this.script[0];
      const answer = scripted ?? this.defaultResponse;

      res.writeHead(answer.status, answer.headers ?? {});
      if (answer.raw) {
        res.end(String(answer.body ?? ''));
      } else {
        res.end(answer.body === undefined ? '' : JSON.stringify(answer.body));
      }
    });
  }
}

/**
 * Builds an `Api` client pointed at `origin` — see the class doc comment for why this
 * redirection is necessary and what it does and does not touch.
 */
export async function createApiAgainstOrigin(
  origin: LoopbackApiOrigin,
  token = 'test-token',
  options: ApiOptions = {},
): Promise<Api> {
  vi.resetModules();
  vi.doMock('../../src/constants', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/constants')>();
    return { ...actual, DISCORD_API_URL: `${origin.url}/api` };
  });

  const { default: ApiCtor } = await import('../../src/clients/Api/Api');
  return new ApiCtor(token, options);
}
