'use strict';

/*
 * Isolates the crash `Websocket.destroy()` causes on a socket still CONNECTING:
 * null the four `on*` handlers, `removeAllListeners()`, then `terminate()`.
 * Mirrors src/clients/Gateway/structures/Websocket.ts#destroy() exactly, using the raw
 * `ws` package directly rather than the library, per the analysis's `a1-terminate.js`
 * (agent-output/analysis/001-audit-live-findings-analysis.md, Appendix A).
 *
 * Usage: node handshakeDestroy.cjs <as-library|guarded>
 *   as-library - no error listener before terminate() (the library's own sequence)
 *   guarded    - one error listener attached before terminate() (the WP-1 fix's shape)
 */
const net = require('net');
const WebSocket = require('ws');

const variant = process.argv[2] || 'as-library';

const srv = net.createServer(() => { /* accept TCP, never answer the handshake */ });
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
