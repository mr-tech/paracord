'use strict';

/* Spawn shards internally in separate "chunks", each chunk receiving its own pm2 process. */
{
  const { ShardLauncher } = require('paracord');

  const main = './path/to/bot/entry/file';

  const shardsToSpawn = [[0, 1], [2, 3], [4, 5]];
  const totalShards = 6;

  const launcher = new ShardLauncher(main, {
    shardChunks: shardsToSpawn,
    shardCount: totalShards,
  });

  launcher.launch();
}

/* Spawn all specified shards in a single pm2 process. */
{
  const { ShardLauncher } = require('paracord');

  const main = './path/to/bot/entry/file';

  const launcher = new ShardLauncher(main, {
    token: 'myBotToken',
    shardIds: [0, 1],
    shardCount: 2,
  });

  launcher.launch();
}

/*
    From here, pm2 will spawn each shard chunk into its own process.
    You can view a list of these by running `pm2 l` on the cli.
*/
