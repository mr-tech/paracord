import Websocket from 'ws';

const client = new Websocket('wss://gateway.discord.gg');
client.close(1000);
