import {
  GatewayDispatchEvents, GatewayGuildMembersChunkDispatchData, GatewayHelloData,
  GatewayReadyDispatchData, GatewayReceivePayload, GatewayRequestGuildMembersData, GatewayResumeData, GatewayURLQuery,
} from 'discord-api-types/v10';
import ws from 'ws';

import { GATEWAY_CLOSE_CODES, GATEWAY_OP_CODES, GatewayCloseCode } from '../../../constants';
import { isApiError } from '../../../utils';
import Gateway from '../Gateway';

import GatewayIdentify from './GatewayIdentify';
import Websocket from './Websocket';

import type { GatewayEvent, GatewayOptions, ParacordGatewayEvent } from '../types';

interface GuildChunkState {
  receivedIndexes: number[];
}

interface SessionParams extends Pick<GatewayOptions, 'wsUrl' | 'wsParams'> {
  gateway: Gateway;
  identity: GatewayIdentify;
  log: Gateway['log'];
  handleEvent: Gateway['handleEvent'];
  emit: Gateway['emit'];
  onClose: Gateway['handleClose'];
}

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

  /** Whether or not the client has the conditions necessary to attempt to resume a gateway connection. */
  public get resumable(): boolean {
    return this.#sessionId !== undefined && this.#resumeUrl !== undefined;
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

  public get isFetchingMembers(): boolean {
    return this.#requestingMembersStateMap.size > 0;
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

    this.#requestingMembersStateMap.set(options.nonce, { receivedIndexes: [] });

    void this.#gatewayHandleEvent('REQUEST_GUILD_MEMBERS', { gateway: this, options });

    return this.#websocket.send(GATEWAY_OP_CODES.REQUEST_GUILD_MEMBERS, options);
  }

  /**
   * Connects to Discord's event gateway.
   * @param _websocket Ignore. For unittest dependency injection only.
   */
  public login = async (): Promise<void> => {
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
      this.#log('WARNING', 'Failed to close websocket. Session websocket is undefined.');
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

    void this.handleEvent('READY', data);
  }

  /** Handles "Resumed" packet from Discord. https://discord.com/developers/docs/topics/gateway#resumed */
  private handleResumed(): void {
    this.#log('INFO', `Replay finished after ${this.#eventsDuringResume} events. Resuming events.`);
    this.#resuming = false;

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

  private handleClose(code: GatewayCloseCode): void {
    this.websocket?.destroy();
    this.#websocket = undefined;

    this.#onClose(code);
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
      const { receivedIndexes } = guildChunkState;
      receivedIndexes.push(chunkIndex);
      if (receivedIndexes.length === chunkCount) {
        this.#requestingMembersStateMap.delete(nonce);
      }
    }
  }
}
