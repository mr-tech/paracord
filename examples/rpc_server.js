'use strict';

const { EventEmitter } = require('events');
const { Server } = require('paracord');

const logEmitter = new EventEmitter();
logEmitter.on('DEBUG', (event) => console.log(event));

const serverOptions = { emitter: logEmitter };
/*
    const serverOptions = {
        emitter: logEmitter,
        host: "127.0.0.1",
        port: "50051"
    };
*/

const token = 'myBotToken';

const server = new Server(serverOptions);

/* Add whichever services this server should handle. */
server.addRequestService(token); // Sends requests on behalf of the client.
server.addRateLimitService(); // Caches rate limits and authorizes requests.

/* Begin serving the request. */
server.serve();
