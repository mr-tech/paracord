/* eslint-disable callback-return */
import { LOG_LEVELS, LOG_SOURCES } from '../../../constants';
import RpcServer from '../../server/RpcServer';
import { LockRequestMessage, TokenMessage } from '../../structures';
import Lock from '../../structures/identityLock/Lock';
import { LockRequestProto, StatusProto, TServiceCallbackError } from '../../types';
import { loadProto } from '../common';

const lockProto = loadProto('identify_lock');

/**
 * Create callback functions for the identify lock service.
 * @param server
 */
export default (server: RpcServer): void => {
  /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
  // @ts-ignore: interface can in fact be extended
  server.addService(lockProto.LockService, {
    acquire: acquire.bind(server),
    release: release.bind(server),
  });

  server.emit('DEBUG', {
    source: LOG_SOURCES.RPC,
    level: LOG_LEVELS.INFO,
    message: 'The identify lock service has been to the server.',
  });
};

function acquire(
  this: RpcServer,
  call: { request: LockRequestProto },
  callback: (a: TServiceCallbackError, b?: StatusProto) => void,
) {
  this.identifyLock = new Lock(this.emitter);

  try {
    const { timeOut, token } = LockRequestMessage.fromProto(call.request);

    const message = this.identifyLock.acquire(timeOut, token);

    callback(null, message.proto);
  } catch (err) {
    this.emit('DEBUG', {
      source: LOG_SOURCES.RPC,
      level: LOG_LEVELS.ERROR,
      message: err.message,
    });
    callback(err);
  }
}

function release(
  this: RpcServer,
  call: { request: TokenMessage },
  callback: (a: TServiceCallbackError, b?: StatusProto) => void,
) {
  if (this.identifyLock === undefined) {
    callback("lock doesn't exist");
    return;
  }

  try {
    const { value: token } = TokenMessage.fromProto(call.request);

    const message = this.identifyLock.release(token);

    if (message.success !== undefined) {
      this.emit('DEBUG', {
        source: LOG_SOURCES.RPC,
        level: LOG_LEVELS.DEBUG,
        message: `Lock released by client. Token: ${token}`,
      });
    }

    callback(null, message.proto);
  } catch (err) {
    this.emit('DEBUG', {
      source: LOG_SOURCES.RPC,
      level: LOG_LEVELS.ERROR,
      message: err.message,
    });
    callback(err);
  }
}
