'use strict';

const net = require('net');
const WebSocket = require('ws');

const variant = process.argv[2] || 'as-library';

const srv = net.createServer(() => {});
srv.listen(0, '127.0.0.1', () => {
  const sock = new WebSocket(`ws://127.0.0.1:${srv.address().port}`);
  sock.onopen = () => {};
  sock.onclose = () => {};
  sock.onerror = () => {};
  sock.onmessage = () => {};

  setTimeout(() => {
    sock.onclose = null;
    sock.onerror = null;
    sock.onmessage = null;
    sock.onopen = null;
    sock.removeAllListeners();
    if (variant !== 'as-library') {
      sock.on('error', (e) => { console.log('SURVIVED: error swallowed ->', e.message); });
    }
    sock.terminate();
    setTimeout(() => {
      console.log('SURVIVED: process still alive');
      process.exit(0);
    }, 300);
  }, 300);
});
