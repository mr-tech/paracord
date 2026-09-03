import http from 'http';
import net from 'net';
import type { Duplex } from 'stream';
import { EventEmitter } from 'events';
import { WebSocket, WebSocketServer } from 'ws';

/**
 * The three upgrade behaviours the harness can answer with. Together with `acceptDelayMs`
 * these cover the audit's four named socket shapes (D-12): `reject503` is "never-opened
 * sockets" (i), `hang` is "stuck-CONNECTING" (i), `accept` with `acceptDelayMs` set is
 * "late-handshake" (i), and `closeLiveSocket`/`dropLiveSocket` below produce the
 * "session-preserving close" shape (i).
 */
export type LoopbackMode = 'accept' | 'reject503' | 'hang';

export interface LoopbackGatewayServerOptions {
  /** Behaviour applied to each incoming upgrade until `setMode` changes it. Default 'accept'. */
  mode?: LoopbackMode;
  /** Delay, in ms, before an 'accept' mode upgrade completes the handshake ("late-handshake"). */
  acceptDelayMs?: number;
}

/**
 * A loopback Discord-gateway stand-in: an HTTP server that upgrades to a real `ws`
 * connection, sends HELLO, and answers IDENTIFY with READY — or refuses/withholds the
 * upgrade per `mode`. Real sockets, not a fake `ws`, so the library's own `ws` usage runs
 * unmodified (plan Design section: "real loopback sockets replace the audit's proposed
 * fake-`ws`").
 */
export class LoopbackGatewayServer extends EventEmitter {
  readonly attempts: number[] = [];

  private mode: LoopbackMode;

  private readonly acceptDelayMs: number;

  private readonly server: http.Server;

  private readonly wss: WebSocketServer;

  private readonly heldSockets: Duplex[] = [];

  private liveSocket: WebSocket | null = null;

  private constructor(server: http.Server, wss: WebSocketServer, opts: LoopbackGatewayServerOptions) {
    super();
    this.server = server;
    this.wss = wss;
    this.mode = opts.mode ?? 'accept';
    this.acceptDelayMs = opts.acceptDelayMs ?? 0;
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

  /** Abnormally drops the currently open session's socket (mirrors the analysis harness's mid-session failure). */
  dropLiveSocket(): void {
    // eslint-disable-next-line no-underscore-dangle
    (this.liveSocket as unknown as { _socket: Duplex } | null)?._socket?.destroy();
  }

  /** A clean, server-initiated close of the live session with the given close code. */
  closeLiveSocket(code: number, reason = ''): void {
    this.liveSocket?.close(code, reason);
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
    client.send(JSON.stringify({ op: 10, d: { heartbeat_interval: 45000 }, s: null, t: null }));

    client.on('message', (buf: Buffer) => {
      const payload = JSON.parse(buf.toString());
      if (payload.op === 2) {
        client.send(JSON.stringify({
          op: 0,
          s: 1,
          t: 'READY',
          d: {
            v: 10,
            user: { id: '1', username: 'harness', discriminator: '0001' },
            guilds: [],
            session_id: 'HARNESS_SESSION',
            resume_gateway_url: `ws://127.0.0.1:${this.port}`,
            application: { id: '1', flags: 0 },
          },
        }));
        this.emit('ready');
      } else if (payload.op === 6) {
        this.emit('resume');
      }
    });
  }
}
