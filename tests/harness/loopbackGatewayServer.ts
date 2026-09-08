import http from 'http';
import net from 'net';
import type { Duplex } from 'stream';
import { EventEmitter } from 'events';
import { WebSocket, WebSocketServer } from 'ws';

export type LoopbackMode = 'accept' | 'reject503' | 'hang';

export interface LoopbackGatewayServerOptions {
  mode?: LoopbackMode;
  acceptDelayMs?: number;
  resumeGatewayUrl?: string;
  resumeResponse?: 'resumed' | 'invalidSession';
  heartbeatIntervalMs?: number;
  readyGuilds?: number;
}

export class LoopbackGatewayServer extends EventEmitter {
  readonly attempts: number[] = [];

  private mode: LoopbackMode;

  private readonly acceptDelayMs: number;

  private readonly server: http.Server;

  private readonly wss: WebSocketServer;

  private readonly heldSockets: Duplex[] = [];

  private liveSocket: WebSocket | null = null;

  private readonly explicitResumeGatewayUrl: string | undefined;

  private readonly resumeResponse: 'resumed' | 'invalidSession';

  private readonly heartbeatIntervalMs: number;

  private readonly readyGuilds: number;

  readonly receivedOps: number[] = [];

  private nextDispatchSeq = 1;

  private constructor(server: http.Server, wss: WebSocketServer, opts: LoopbackGatewayServerOptions) {
    super();
    this.server = server;
    this.wss = wss;
    this.mode = opts.mode ?? 'accept';
    this.acceptDelayMs = opts.acceptDelayMs ?? 0;
    this.explicitResumeGatewayUrl = opts.resumeGatewayUrl;
    this.resumeResponse = opts.resumeResponse ?? 'resumed';
    this.heartbeatIntervalMs = opts.heartbeatIntervalMs ?? 45000;
    this.readyGuilds = opts.readyGuilds ?? 0;
  }

  static start(opts: LoopbackGatewayServerOptions = {}): Promise<LoopbackGatewayServer> {
    return new Promise((resolve) => {
      const wss = new WebSocketServer({ noServer: true });
      const server = http.createServer((_req, res) => {
        res.writeHead(503, { Connection: 'close' });
        res.end();
      });
      const instance = new LoopbackGatewayServer(server, wss, opts);
      server.on('upgrade', (req, socket, head) => instance.handleUpgrade(req, socket, head));
      server.listen(0, '127.0.0.1', () => resolve(instance));
    });
  }

  get port(): number {
    return (this.server.address() as net.AddressInfo).port;
  }

  get url(): string {
    return `ws://127.0.0.1:${this.port}`;
  }

  setMode(mode: LoopbackMode): void {
    this.mode = mode;
  }

  attemptsSince(t: number): number {
    return this.attempts.filter((a) => a >= t).length;
  }

  waitForAttempt(n: number, timeoutMs = 5000): Promise<void> {
    if (this.attempts.length >= n) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('upgrade', check);
        reject(new Error(`waitForAttempt timed out after ${timeoutMs}ms waiting for attempt ${n} (have ${this.attempts.length})`));
      }, timeoutMs);
      const check = () => {
        if (this.attempts.length >= n) {
          clearTimeout(timer);
          this.off('upgrade', check);
          resolve();
        }
      };
      this.on('upgrade', check);
    });
  }

  dropLiveSocket(): void {
    // eslint-disable-next-line no-underscore-dangle
    (this.liveSocket as unknown as { _socket: Duplex } | null)?._socket?.destroy();
  }

  closeLiveSocket(code: number, reason = ''): void {
    this.liveSocket?.close(code, reason);
  }

  get heartbeatsReceived(): number {
    return this.receivedOps.filter((op) => op === 1).length;
  }

  sendDispatch(type: string, data: unknown, seq?: number): void {
    this.liveSocket?.send(JSON.stringify({
      op: 0, t: type, d: data, s: seq ?? this.nextDispatchSeq++,
    }));
  }

  sendRawBinary(bytes: Buffer): void {
    this.liveSocket?.send(bytes);
  }

  async close(): Promise<void> {
    this.heldSockets.forEach((s) => s.destroy());
    this.liveSocket?.terminate();
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  private handleUpgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer): void {
    this.attempts.push(Date.now());
    this.emit('upgrade');

    if (this.mode === 'reject503') {
      socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
      socket.destroy();
      return;
    }

    if (this.mode === 'hang') {
      this.heldSockets.push(socket);
      return;
    }

    const complete = () => {
      this.wss.handleUpgrade(req, socket, head, (client) => this.onClientOpen(client));
    };
    if (this.acceptDelayMs > 0) {
      setTimeout(complete, this.acceptDelayMs);
    } else {
      complete();
    }
  }

  private onClientOpen(client: WebSocket): void {
    this.liveSocket = client;
    client.send(JSON.stringify({ op: 10, d: { heartbeat_interval: this.heartbeatIntervalMs }, s: null, t: null }));

    client.on('message', (buf: Buffer) => {
      const payload = JSON.parse(buf.toString());
      this.receivedOps.push(payload.op);
      if (payload.op === 2) {
        client.send(JSON.stringify({
          op: 0,
          s: this.nextDispatchSeq++,
          t: 'READY',
          d: {
            v: 10,
            user: { id: '1', username: 'harness', discriminator: '0001' },
            guilds: Array.from({ length: this.readyGuilds }, (_, i) => ({ id: String(i + 1), unavailable: true })),
            session_id: 'HARNESS_SESSION',
            resume_gateway_url: this.explicitResumeGatewayUrl ?? `ws://127.0.0.1:${this.port}`,
            application: { id: '1', flags: 0 },
          },
        }));
        this.emit('ready');
      } else if (payload.op === 6) {
        this.emit('resume', payload.d);
        if (this.resumeResponse === 'resumed') {
          client.send(JSON.stringify({ op: 0, s: this.nextDispatchSeq++, t: 'RESUMED', d: {} }));
        } else {
          client.send(JSON.stringify({ op: 9, d: false }));
        }
      }
    });
  }
}
