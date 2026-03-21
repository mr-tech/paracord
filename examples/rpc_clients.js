'use strict';

/*
 ************************
 **********API***********
 ************************
 */
{
  const { Api } = require('paracord');

  const token = 'myBotToken'; // https://discord.com/developers/applications/
  const api = new Api(token);

  /*  `allowFallback` defaults to `true`. */
  api.addRateLimitService({ allowFallback: true }); // Only one of these services may be added to a client.
  // api.addRequestService();

  api.request('GET', '/channels/123456789').then((res) => {
    if (res.status === 200) {
      console.log(res.data);
    } else {
      throw Error('Bad response.');
    }
  });
}

/*
 ************************
 ********PARACORD********
 ************************
 */
{
  const { Paracord } = require('paracord');

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
