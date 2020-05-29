
import type { EventEmitter } from 'events';
import StatusMessage from './StatusMessage';
import { createUnsafeUuid } from '../../../utils/Utils';
import { LOG_SOURCES, LOG_LEVELS } from '../../../constants';

/**
 * A mutex primarily used by gateway clients to coordinate identifies.
 * Grants a token to clients that acquire the lock that will allow that
 * client to perform further operations on it (e,g. release the lock or
 * refresh the timeout).
 */
export default class Lock {
  /**
   * A unique id given to the client who currently has the lock. `undefined` indicates that the lock is available.
   */
  private token?: string | undefined;

  /** The timeout that will unlock the lock after a time specified by the client. */
  private lockTimeout?: NodeJS.Timeout;

  /** Emitter for logging. */
  private emitter?: EventEmitter;

  /**
   * Creates a new lock.
   * @param  emitter Emitter for log events.
   */
  public constructor(emitter?: EventEmitter) {
    this.token;
    this.lockTimeout;
    this.emitter = emitter;
  }

  /**
   * Attempts to acquire the lock.
   * @param timeOut How long in ms to wait before expiring the lock.
   * @param token Unique id given to the last client to acquire the lock.
   */
  public acquire(timeOut: number, token?: string): StatusMessage {
    let success = false;
    let message;

    if (this.token === undefined) {
      token = createUnsafeUuid();
      this.lock(timeOut, token);
      success = true;
    } else if (this.token === token) {
      this.lock(timeOut, token);
      success = true;
    } else {
      message = 'Already locked by a different client.';
      token = undefined;
    }

    return new StatusMessage(success, message, token);
  }

  /**
   * Attempts to release the lock.
   * @param token Unique id given to the last client to acquire the lock.
   */
  public release(token: string): StatusMessage {
    let success = false;
    let message;

    if (this.token === undefined) {
      success = true;
    } else if (token === undefined) {
      message = 'No token provided.';
    } else if (this.token === token) {
      this.unlock();
      success = true;
    } else {
      message = 'Locked by a different client.';
    }

    return new StatusMessage(success, message);
  }

  /**
   * Sets lock and sets an expire timer.
   *
   * @param timeOut How long in ms to wait before expiring the lock.
   * @param token The token to set the lock under.
   */
  private lock(timeOut: number, token: string): void {
    let message;
    if (this.lockTimeout === undefined) {
      message = `Lock acquired. Timeout: ${timeOut}ms. Token: ${token}`;
    } else {
      message = `Lock refreshed. Token: ${token}`;
    }

    this.emitter && this.emitter.emit('DEBUG', {
      source: LOG_SOURCES.RPC,
      level: LOG_LEVELS.DEBUG,
      message,
    });

    this.lockTimeout && clearTimeout(this.lockTimeout);

    this.token = token;
    this.lockTimeout = setTimeout(() => {
      this.release(token);

      this.emitter && this.emitter.emit('DEBUG', {
        source: LOG_SOURCES.RPC,
        level: LOG_LEVELS.DEBUG,
        message: `Lock expired after ${timeOut}ms. Token: ${token}`,
      });
    }, timeOut);
  }

  /** Makes the lock available and clears the expire timer. */
  private unlock(): void {
    this.lockTimeout && clearTimeout(this.lockTimeout);
    this.lockTimeout = undefined;
    this.token = undefined;
  }
}
