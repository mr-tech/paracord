'use strict';

const { Paracord } = require('paracord');

/* Simple bot and log in. */
{
  const token = 'myBotToken'; // https://discord.com/developers/applications/
  const bot = new Paracord(token, {
    gatewayOptions: {
      wsUrl: 'wss://gateway.discord.gg',
      wsParams: { v: '10', encoding: 'json' },
    },
  });

  bot.on('PARACORD_STARTUP_COMPLETE', () => {
    console.log('Hello world!');
  });

  bot.login({
    identity: { intents: 32767 },
    shards: [0],
    shardCount: 1,
  });
}

/* For internal sharding, provide the shards and shard count as parameters to login().
   The PARACORD_STARTUP_COMPLETE event will be emitted when all shards have logged in for the first time. */
{
  const token = 'myBotToken'; // https://discord.com/developers/applications/
  const bot = new Paracord(token, {
    gatewayOptions: {
      wsUrl: 'wss://gateway.discord.gg',
      wsParams: { v: '10', encoding: 'json' },
    },
  });

  bot.on('PARACORD_STARTUP_COMPLETE', () => {
    console.log('All internal shards have successfully logged in!');
  });

  bot.login({
    identity: { intents: 32767 },
    shards: [0, 1, 2],
    shardCount: 3,
  });
}

/* Provide an identity object that will be cloned to each internal shard.
  (`properties` details will be overwritten.) */
{
  const token = 'myBotToken'; // https://discord.com/developers/applications/
  const bot = new Paracord(token, {
    gatewayOptions: {
      wsUrl: 'wss://gateway.discord.gg',
      wsParams: { v: '10', encoding: 'json' },
    },
  });

  const identity = {
    presence: {
      activities: [{
        name: 'a game.',
        type: 0,
      }],
      status: 'dnd',
      afk: false,
    },
    intents: 32767,
  };

  bot.login({ identity, shards: [0], shardCount: 1 });
}

/* Making a request with the Paracord client uses the same pattern as the Api client. */
{
  const { Api } = require('paracord');
  const token = 'myBotToken'; // https://discord.com/developers/applications/
  const api = new Api(token);

  const method = 'GET';
  const endpoint = '/channels/123456789'; // https://discord.com/developers/docs/resources/channel

  api.request(method, endpoint).then((res) => {
    if (res.status === 200) {
      console.log(res.data);
    } else {
      throw Error('Bad response.');
    }
  });
}
