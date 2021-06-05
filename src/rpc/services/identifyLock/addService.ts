/* eslint-disable callback-return */
import { LOG_LEVELS, LOG_SOURCES } from '../../../constants';
import RpcServer from '../../server/RpcServer';
import { LockRequestMessage, TokenMessage } from '../../structures';
import { LockRequestProto, StatusProto, TServiceCallbackError } from '../../types';
import { loadProto } from '../common';

const lockProto = loadProto('identify_lock');

/**
 * Create callback functions for the identify lock service.
 * @param server
 */
export default (server: RpcServer): void => {
  server.addService(lockProto.LockService, {
    // hello: hello.bind(server),
    acquire: acquire.bind(server),
    release: release.bind(server),
  });

  server.emit('DEBUG', {
    source: LOG_SOURCES.RPC,
    level: LOG_LEVELS.INFO,
    message: 'The identify lock service has been added to the server.',
  });
};

// function hello(
//   this: RpcServer,
// _: void,
//   callback: (a: TServiceCallbackError) => void,
// ) {
//   callback(null);
// }

function acquire(
  this: RpcServer,
  call: { request: LockRequestProto },
  callback: (a: TServiceCallbackError, b?: StatusProto) => void,
) {
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
