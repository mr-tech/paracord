'use strict';

/*
    All Discord events can be found in the docs. They will be in all caps and spaces will be replaced with underlines.
    https://discord.com/developers/docs/topics/gateway#commands-and-events-gateway-events
*/

/* Gateway requires an emitter and identity in options. */
{
  const { EventEmitter } = require('events');
  const { Gateway } = require('paracord');

  const token = 'myBotToken'; // https://discord.com/developers/applications/

  const emitter = new EventEmitter();
  emitter.handleEvent = (type, data, gateway) => {
    emitter.emit(type, data, gateway);
  };

  emitter.on('READY', (data) => {
    console.log('Ready packet received.');
    console.log(data);
  });
  emitter.on('GUILD_CREATE', (data) => {
    console.log('Guild create packet received.');
    console.log(data);
  });

  const gateway = new Gateway(token, {
    identity: { intents: 32767 },
    emitter,
    wsUrl: 'wss://gateway.discord.gg',
    wsParams: { v: '10', encoding: 'json' },
  });

  gateway.login();
}
