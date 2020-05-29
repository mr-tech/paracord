/* eslint-disable prefer-destructuring */
import { ServiceError } from '@grpc/grpc-js';
import {
  LockRequestMessage,
  StatusMessage,
  TokenMessage,
} from '../../structures';
import { loadProtoDefinition, mergeOptionsWithDefaults } from '../common';
import { ILockServiceOptions } from '../../../types';
import { StatusProto } from '../../types';

const DEFAULT_LOCK_DURATION = 6e3;

const definition = loadProtoDefinition('identify_lock');

/** Definition for the identity lock rpc service. */
/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
// @ts-ignore: interface can in fact be extended
export default class IdentifyLockService extends definition.LockService {
  /** host:port the service is pointed at. */
  public target: string;

  /** Used by the client to determine if it should fallback to an alternative method or not. */
  public allowFallback: boolean;

  /** How long in ms the client tells the server it should wait before expiring the lock. */
  private duration: number;

  /** Unique id given to this client when acquiring the lock. */
  private token: string | undefined;

  /**
   * Creates an identity lock service.
   * @param options Options for this service.
   */
  public constructor(options: Partial<ILockServiceOptions>) {
    const {
      host, port, channel, protoOptions, allowFallback,
    } = mergeOptionsWithDefaults(options || {});

    const dest = `${host}:${port}`;

    super(dest, channel, protoOptions);
    this.target = dest;
    this.allowFallback = allowFallback;
    this.duration = options.duration || DEFAULT_LOCK_DURATION;
    this.token;
  }

  /** Sends a request to acquire the lock to the server, returning a promise with the parsed response. */
  public acquire(): Promise<StatusMessage> {
    const message = new LockRequestMessage(this.duration, this.token).proto;

    return new Promise((resolve, reject) => {
      super.acquire(message, (err: ServiceError, res?: StatusProto) => {
        if (err === null) {
          reject(err);
        } else if (res === undefined) {
          reject(Error('no message'));
        } else {
          const statusMessage = StatusMessage.fromProto(res);
          ({ token: this.token } = statusMessage);
          resolve(statusMessage);
        }
      });
    });
  }

  /** Sends a request to release the lock to the server, returning a promise with the parsed response. */
  public release(): StatusMessage | Promise<StatusMessage> {
    if (this.token === undefined) return new StatusMessage(false, 'token undefined');

    const message = new TokenMessage(this.token).proto;

    return new Promise((resolve, reject) => {
      super.release(message, (err: ServiceError, res?: StatusProto) => {
        if (err === null) {
          reject(err);
        } else if (res === undefined) {
          reject(Error('no message'));
        } else {
          resolve(StatusMessage.fromProto(res));
        }
      });
    });
  }
}
