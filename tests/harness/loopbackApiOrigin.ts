import http from 'http';
import { EventEmitter } from 'events';
import { vi } from 'vitest';

import type net from 'net';
import type Api from '../../src/clients/Api/Api';
import type { ApiOptions } from '../../src/clients/Api/types';

export interface ScriptedResponse {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
  raw?: boolean;
}

export interface RequestReceipt {
  method: string;
  path: string;
  bodyReceived: boolean;
  body: string;
}

export default class LoopbackApiOrigin extends EventEmitter {
  private readonly server: http.Server;

  private script: ScriptedResponse[] = [];

  private defaultResponse: ScriptedResponse = { status: 200, body: {} };

  private destroyOnAccept = false;

  readonly requestCount: number[] = [];

  readonly receivedHeaders: http.IncomingHttpHeaders[] = [];

  readonly connectionEvents: number[] = [];

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

  setScript(responses: ScriptedResponse[]): void {
    this.script = [...responses];
  }

  setDefaultResponse(response: ScriptedResponse): void {
    this.defaultResponse = response;
  }

  setDestroyOnAccept(enabled: boolean): void {
    this.destroyOnAccept = enabled;
  }

  get acceptCount(): number {
    return this.requestCount.length;
  }

  get connectionCount(): number {
    return this.connectionEvents.length;
  }

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
