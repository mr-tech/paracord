import {
  GatewayDispatchEvents, GatewayGuildMembersChunkDispatchData, GatewayHelloData,
  GatewayReadyDispatchData, GatewayReceivePayload, GatewayRequestGuildMembersData, GatewayResumeData, GatewayURLQuery,
} from 'discord-api-types/v10';
import ws from 'ws';

import {
  GATEWAY_CLOSE_CODES, GATEWAY_OP_CODES, GatewayCloseCode, SECOND_IN_MILLISECONDS,
} from '../../../constants';
import { isApiError } from '../../../utils';
import Gateway from '../Gateway';

import { setPendingOrigin, takePendingOrigin } from './closeOrigin';
import GatewayIdentify from './GatewayIdentify';
import Websocket from './Websocket';

import type { CloseOrigin } from './closeOrigin';
import type { GatewayEvent, GatewayOptions, ParacordGatewayEvent } from '../types';

interface GuildChunkState {
  receivedIndexes: Set<number>;
  lastChunkAt: number;
}

/** Idle time since a nonce's last chunk before its entry is dropped. */
const CHUNK_STATE_TTL_MILLISECONDS = 60 * SECOND_IN_MILLISECONDS;

interface SessionParams extends Pick<GatewayOptions, 'wsUrl' | 'wsParams'> {
  gateway: Gateway;
  identity: GatewayIdentify;
  log: Gateway['log'];
  handleEvent: Gateway['handleEvent'];
  emit: Gateway['emit'];
  onClose: Gateway['handleClose'];
}

/** @internal */
export default class Session {
  #gateway: Gateway;

  #identity: GatewayIdentify;

  /** The amount of events received during a resume. */
  #eventsDuringResume = 0;

  /** Websocket used to connect to gateway. */
  #websocket?: undefined | Websocket;

  /** Websocket URL instructed to connect to. Also used to indicate it the client has an open websocket. */
  #wsUrl: string;

  /** From Discord - Url to reconnect to. */
  #resumeUrl?: undefined | string;

  /** Consecutive ABNORMAL (1006) closes against `#resumeUrl`; abandons the host at 3. */
  #consecutiveAbnormalOnResumeHost = 0;

  /** Whether the connection attempt that just closed was made against `#resumeUrl` — set at login, read at close, since `#resumeUrl` itself may already reflect a later READY by the time a close is handled. */
  #lastAttemptTargetedResumeHost = false;

  /** Whether or not the client is currently resuming a session. */
  #resuming = false;

  #wsParams: GatewayURLQuery;

  /** From Discord - Most recent event sequence id received. https://discord.com/developers/docs/topics/gateway#payloads */
  #sequence: null | number = null;

  /** From Discord - Id of this gateway connection. https://discord.com/developers/docs/topics/gateway#ready-ready-event-fields */
  #sessionId?: undefined | string;

  #membersRequestNonceCounter = 0;

  #requestingMembersStateMap: Map<string, GuildChunkState> = new Map();

  #gatewayHandleEvent: Gateway['handleEvent'];

  #log: Gateway['log'];

  #emit: Gateway['emit'];

  #onClose: Gateway['handleClose'];

  constructor(params: SessionParams) {
    const {
      gateway, identity, wsUrl, wsParams, emit, log, handleEvent, onClose,
    } = params;

    this.#gateway = gateway;
    this.#identity = identity;
    this.#log = log;
    this.#gatewayHandleEvent = handleEvent;
    this.#emit = emit;
    this.#wsUrl = wsUrl;
    this.#wsParams = wsParams;
    this.#onClose = onClose;

    this.#log('DEBUG', `Session object created with url: ${wsUrl}.`);
  }

  public get connection(): undefined | ws {
    return this.#websocket?.connection;
  }

  /** Whether or not the websocket is open. */
  public get connected(): boolean {
    return this.connection?.readyState === ws.OPEN;
  }

  /**
   * Whether or not the client has the conditions necessary to attempt to resume a
   * gateway connection — session identity alone (a held `session_id` and a sequence
   * seen), decoupled from `#resumeUrl`: after the resume host is abandoned, the session
   * survives and resumes against the base URL.
   */
  public get resumable(): boolean {
    return this.#sessionId !== undefined && this.#sequence !== null;
  }

  /** Whether or not the client is currently resuming a session. */
  public get resuming(): boolean {
    return this.#resuming;
  }

  public get sequence(): null | number {
    return this.#sequence;
  }

  public get websocket(): undefined | Websocket {
    return this.#websocket;
  }

  public get gateway(): Gateway {
    return this.#gateway;
  }

  public get identity(): GatewayIdentify {
    return this.#identity;
  }

  /** Reading this also sweeps stale chunk-request state — see {@link sweepStaleChunkState}. */
  public get isFetchingMembers(): boolean {
    this.sweepStaleChunkState();
    return this.#requestingMembersStateMap.size > 0;
  }

  /**
   * Drops any nonce whose last chunk is older than the TTL — a pure predicate over
   * elapsed time (time-seam rule), evaluated here (read) and by the heartbeat's inline
   * check (`Gateway.isFetchingMembers` on every dispatch), never a timer per entry.
   */
  private sweepStaleChunkState(): void {
    const now = new Date().getTime();
    for (const [nonce, state] of this.#requestingMembersStateMap) {
      if (now - state.lastChunkAt >= CHUNK_STATE_TTL_MILLISECONDS) {
        this.#requestingMembersStateMap.delete(nonce);
      }
    }
  }

  public log: Gateway['log'] = (...args: Parameters<Gateway['log']>) => this.#log(...args);

  public emit: Gateway['emit'] = (...args: Parameters<Gateway['emit']>) => this.#emit(...args);

  /**
   * Sends a `Request Guild Members` websocket message.
   * @param guildId Id of the guild to request members from.
   * @param options Additional options to send with the request. Mirrors the remaining fields in the docs: https://discord.com/developers/docs/topics/gateway#request-guild-members
   */
  public requestGuildMembers(options: GatewayRequestGuildMembersData): boolean {
    if (this.#websocket === undefined) {
      this.#log('WARNING', 'Failed to request guild members. Session websocket is undefined.');
      return false;
    }

    if (options.nonce === undefined) {
      options.nonce = `${options.guild_id}-${++this.#membersRequestNonceCounter}`;
    }

    this.#requestingMembersStateMap.set(options.nonce, { receivedIndexes: new Set(), lastChunkAt: new Date().getTime() });

    void this.#gatewayHandleEvent('REQUEST_GUILD_MEMBERS', { gateway: this.#gateway, options });

    const sent = this.#websocket.send(GATEWAY_OP_CODES.REQUEST_GUILD_MEMBERS, options);

    // The payload never left the process, so no chunks will arrive to clear this nonce. Leaving it
    // would pin `isFetchingMembers` true, which indefinitely vetoes the missed-heartbeat close.
    if (!sent) this.#requestingMembersStateMap.delete(options.nonce);

    return sent;
  }

  /**
   * Connects to Discord's event gateway.
   * @param _websocket Ignore. For unittest dependency injection only.
   */
  public login = (): void => {
    if (this.#websocket !== undefined) {
      throw Error('Client is already initialized.');
    }

    try {
      const wsUrl = this.constructWsUrl();
      this.#log('INFO', `${this.#resumeUrl ? 'Resuming on' : 'Connecting to'} url: ${wsUrl}`);

      this.#websocket = new Websocket({
        ws,
        session: this,
        url: wsUrl,
        onClose: this.handleClose.bind(this),
      });
    } catch (err) {
      if (isApiError(err)) {
        /* eslint-disable-next-line no-console */
        console.error(err.response?.data?.message); // TODO: emit
      } else {
        /* eslint-disable-next-line no-console */
        console.error(err); // TODO: emit
      }

      this.#websocket?.destroy();
      this.#websocket = undefined;
    }
  };

  public close(code: GatewayCloseCode, flushWaitTime = 0) {
    if (this.#websocket === undefined) {
      // No socket, but the gateway is still tracked — a session that survived a prior
      // close stays queued rather than connected. Runs the close path directly — the
      // arm for `code`, one `GATEWAY_CLOSE` — without a socket to touch.
      const origin = takePendingOrigin(this.#gateway) ?? 'consumer';
      this.handleClose(code, origin);
      return;
    }

    this.#websocket.close(code, flushWaitTime);
  }

  public send: Websocket['send'] = (op, data) => {
    if (!this.#websocket) {
      this.#log('WARNING', 'Failed to send payload. Session websocket is undefined.');
      return false;
    }

    return this.#websocket.send(op as Parameters<Websocket['send']>[0], data as Parameters<Websocket['send']>[1]);
  };

  public destroy() {
    this.#websocket?.destroy();
    this.#websocket = undefined;

    this.#log('INFO', `Session ${this.#sessionId} destroyed.`);

    this.#eventsDuringResume = 0;
    this.#membersRequestNonceCounter = 0;
    this.#requestingMembersStateMap = new Map();

    this.#sessionId = undefined;
    this.#resumeUrl = undefined;
  }

  private constructWsUrl() {
    if (!this.resumable) this.#resumeUrl = undefined;
    const endpoint = this.#resumeUrl ?? this.#wsUrl;
    this.#lastAttemptTargetedResumeHost = this.#resumeUrl !== undefined;

    const params = { ...this.#wsParams };
    if (this.#identity.compress) {
      this.#log('DEBUG', 'Compressing websocket connection.');
      params.compress = 'zlib-stream';
    }

    return `${endpoint}?${Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')}`;
  }

  /** Processes incoming messages from Discord's gateway.
   * @param p Packet from Discord. https://discord.com/developers/docs/topics/gateway#payloads-gateway-payload-structure
   */
  public handleMessage(p: GatewayReceivePayload): void {
    const {
      t: type, s: sequence, op: opCode, d: data,
    } = p;
    this.updateSequence(sequence);

    if (this.#resuming && (opCode !== GATEWAY_OP_CODES.DISPATCH || (type !== 'RESUMED' && type !== 'READY'))) {
      ++this.#eventsDuringResume;
    }

    switch (opCode) {
      case GATEWAY_OP_CODES.DISPATCH:
        if (type === 'READY') {
          this.handleReady(<GatewayReadyDispatchData><unknown>data);
        } else if (type === 'RESUMED') {
          this.handleResumed();
        } else if (type !== null) {
          // back pressure may cause the interval to occur too late, hence this check
          void this.handleEvent(type as GatewayDispatchEvents, data);
        } else {
          this.#log('WARNING', `Unhandled packet. op: ${opCode} | data: ${data}`);
        }
        break;

      case GATEWAY_OP_CODES.HELLO:
        this.handleHello(<GatewayHelloData><unknown>data);
        break;

      case GATEWAY_OP_CODES.HEARTBEAT:
        if (!this.#resuming) this.send(GATEWAY_OP_CODES.HEARTBEAT, <number> this.#sequence);
        break;

      case GATEWAY_OP_CODES.INVALID_SESSION:
        this.handleInvalidSession(<boolean>data);
        break;

      case GATEWAY_OP_CODES.RECONNECT:
        setPendingOrigin(this.#gateway, 'discord');
        this.close(GATEWAY_CLOSE_CODES.RECONNECT);
        break;

      default:
    }
  }

  /**
   * Handles "Ready" packet from Discord. https://discord.com/developers/docs/topics/gateway#ready
   * @param data From Discord.
   */
  private handleReady(data: GatewayReadyDispatchData): void {
    this.#log('DEBUG', `Received Ready. Session ID: ${data.session_id}.`);

    this.#resumeUrl = data.resume_gateway_url;
    this.#sessionId = data.session_id;
    this.#consecutiveAbnormalOnResumeHost = 0;

    void this.handleEvent('READY', data);
  }

  /** Handles "Resumed" packet from Discord. https://discord.com/developers/docs/topics/gateway#resumed */
  private handleResumed(): void {
    this.#log('INFO', `Replay finished after ${this.#eventsDuringResume} events. Resuming events.`);
    this.#resuming = false;
    this.#consecutiveAbnormalOnResumeHost = 0;

    void this.handleEvent('RESUMED', null);
  }

  /**
   * Handles "Invalid Session" packet from Discord. Will attempt to resume a connection if Discord allows it and there is already a sessionId and sequence.
   * Otherwise, will send a new identify payload. https://discord.com/developers/docs/topics/gateway#invalid-session
   * @param resumable Whether or not Discord has said that the connection as able to be resumed.
   */
  private handleInvalidSession(resumable: boolean): void {
    this.#log(
      'WARNING',
      `Received Invalid Session packet. Resumable: ${resumable}`,
    );

    setPendingOrigin(this.#gateway, 'discord');
    if (!resumable) {
      this.close(GATEWAY_CLOSE_CODES.SESSION_INVALIDATED);
    } else {
      this.close(GATEWAY_CLOSE_CODES.SESSION_INVALIDATED_RESUMABLE);
    }

    void this.handleEvent('INVALID_SESSION', { gateway: this, resumable });
  }

  /**
   * Handles "Hello" packet from Discord. Start heartbeats and identifies with gateway. https://discord.com/developers/docs/topics/gateway#connecting-to-the-gateway
   * @param data From Discord.
   */
  private handleHello(data: GatewayHelloData): void {
    this.#log('DEBUG', `Received Hello. ${JSON.stringify(data)}.`);
    this.connect(this.resumable);

    void this.handleEvent('HELLO', data);
  }

  /** Connects to gateway. */
  private connect(resume: boolean): void {
    if (resume) {
      this.resume();
    } else {
      this.identify();
    }
  }

  /** Sends a "Resume" payload to Discord's gateway. */
  private resume(): void {
    this.#log('DEBUG', `Attempting to resume connection. Session Id: ${this.#sessionId}. Sequence: ${this.#sequence}`);

    const { token } = this.#identity;
    const sequence = this.#sequence;
    const sessionId = this.#sessionId;

    if (sessionId !== undefined && sequence !== null) {
      this.#resuming = true;
      this.#eventsDuringResume = 0;
      const payload: GatewayResumeData = {
        token,
        session_id: sessionId,
        seq: sequence,
      };

      void this.handleEvent('GATEWAY_RESUME', payload);

      this.send(GATEWAY_OP_CODES.RESUME, payload);
    } else {
      this.#log('ERROR', `Attempted to resume with undefined sessionId or sequence. Values - SessionId: ${sessionId}, sequence: ${sequence}`);
      setPendingOrigin(this.#gateway, 'transport');
      this.close(GATEWAY_CLOSE_CODES.UNKNOWN);
    }
  }

  /** Sends an "Identify" payload. */
  private identify(): void {
    if (this.#sequence !== null) {
      this.#log('WARNING', `Unexpected sequence ${this.#sequence} when identifying.`);
      this.#sequence = null;
    }

    const [shardId, shardCount] = this.#identity.shard ?? [0, 1];
    this.#log('INFO', `Identifying as shard: ${shardId}/${shardCount - 1} (0-indexed)`);
    this.#emit('GATEWAY_IDENTIFY', this);
    this.send(GATEWAY_OP_CODES.IDENTIFY, <GatewayIdentify> this.#identity.toJSON());
  }

  public handleEvent(type: GatewayEvent | ParacordGatewayEvent, data: unknown): void {
    if (type === 'GUILD_MEMBERS_CHUNK') this.handleGuildMemberChunk(data as GatewayGuildMembersChunkDispatchData);
    void this.#gatewayHandleEvent(type, data);
  }

  /**
   * Updates the sequence value of Discord's gateway if it's larger than the current.
   * @param s Sequence value from Discord.
   */
  private updateSequence(s: number | null): void {
    if (this.#sequence === null) {
      this.#sequence = s;
    } else if (s !== null) {
      if (s !== this.#sequence + 1) {
        this.#log(
          'WARNING',
          `Non-consecutive sequence (${this.#sequence} -> ${s})`,
        );
      }

      if (s > this.#sequence) {
        this.#sequence = s;
      }
    }
  }

  private handleClose(code: GatewayCloseCode, origin: CloseOrigin): void {
    const isResumeHostAbnormalFailure = code === GATEWAY_CLOSE_CODES.ABNORMAL && this.#lastAttemptTargetedResumeHost;
    // Describes only the attempt that is still current — cleared the moment it is
    // read, so a close reached with no connection attempt in flight (the queued,
    // no-socket route below) never inherits an earlier attempt's target.
    this.#lastAttemptTargetedResumeHost = false;
    if (isResumeHostAbnormalFailure) {
      this.#consecutiveAbnormalOnResumeHost += 1;
      if (this.#consecutiveAbnormalOnResumeHost >= 3) {
        this.#log('WARNING', `Resume host failed ${this.#consecutiveAbnormalOnResumeHost} consecutive times. Abandoning it — the session continues on the base host.`);
        this.#resumeUrl = undefined;
        this.#consecutiveAbnormalOnResumeHost = 0;
      }
    } else {
      this.#consecutiveAbnormalOnResumeHost = 0;
    }

    this.websocket?.destroy();
    this.#websocket = undefined;

    // A cut member-chunk stream cannot outlive the close it was cut by, on any close
    // code — including one that leaves the session resumable, so a reconnect starts
    // with no stale nonce pinning `isFetchingMembers` true and vetoing the next
    // heartbeat's missed-ack close.
    this.#requestingMembersStateMap = new Map();

    this.#onClose(code, origin);
  }

  private handleGuildMemberChunk(data: GatewayGuildMembersChunkDispatchData): void {
    const {
      nonce, not_found, chunk_count, chunk_index,
    } = data;
    if (nonce) {
      if (not_found) {
        this.#requestingMembersStateMap.delete(nonce);
      } else {
        this.updateRequestMembersState(nonce, chunk_count, chunk_index);
      }
    }
  }

  private updateRequestMembersState(nonce: string, chunkCount: number, chunkIndex: number) {
    const guildChunkState = this.#requestingMembersStateMap.get(nonce);
    if (guildChunkState) {
      // Set semantics: a duplicate index is already received, not a new slot —
      // completion is every index in 0..chunkCount-1 having been seen, not a count of
      // deliveries, which a duplicate or an out-of-order replay would otherwise skew.
      guildChunkState.receivedIndexes.add(chunkIndex);
      guildChunkState.lastChunkAt = new Date().getTime();
      if (guildChunkState.receivedIndexes.size === chunkCount) {
        this.#requestingMembersStateMap.delete(nonce);
      }
    }
  }
}
