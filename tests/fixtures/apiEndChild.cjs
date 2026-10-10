'use strict';

const path = require('path');

const dist = path.resolve(__dirname, '..', '..', 'dist');
const [kind, state, port, originUrl] = process.argv.slice(2);

require(path.join(dist, 'constants')).DISCORD_API_URL = `${originUrl}/api`;
const { default: Api } = require(path.join(dist, 'clients', 'Api', 'Api'));

function send(event, extra) {
  if (process.send) process.send({ event, ...extra });
}

process.on('unhandledRejection', (reason) => send('fault', { kind: 'unhandledRejection', detail: String(reason && reason.message) }));
process.on('uncaughtException', (err) => send('fault', { kind: 'uncaughtException', detail: String(err && err.message) }));

const api = new Api('test-token');
const addService = (options) => (kind === 'request' ? api.addRequestService(options) : api.addRateLimitService(options));
const serviceOptions = { host: '127.0.0.1', port: Number(port), allowFallback: true };

(async () => {
  if (state === 'hello-in-flight') {
    addService(serviceOptions).catch(() => {});
  } else if (state !== 'none') {
    await addService(serviceOptions);
  }
  send('ready');
})();

process.on('message', (message) => {
  if (message === 'trigger') {
    api.request('GET', '/channels/1/messages').catch(() => {});
  } else if (message === 'end') {
    api.end();
    process.send({ event: 'ended' }, () => process.disconnect());
  }
});
