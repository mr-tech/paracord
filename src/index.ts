/**
 * Paracord — A TypeScript/Node.js toolkit for building scalable Discord bots.
 *
 * Provides REST (`Api`), Gateway (`Gateway`), multi-shard orchestration (`Paracord`),
 * pm2-based shard launching (`ShardLauncher`), and optional gRPC services (`Server`)
 * for centralized rate limits and remote REST requests.
 *
 * All Discord payload types come from `discord-api-types/v10`.
 *
 * @packageDocumentation
 */
import { Paracord } from './clients';

export default Paracord;

export { default as Server } from './rpc/server/RpcServer';
export * from './clients';
export * from './utils';
export * from './constants';
