/* eslint-disable spaced-comment */
/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./@types/pm2.d.ts" />

import Paracord from './clients/Paracord';

export default Paracord;

export { default as Gateway } from './clients/Gateway/Gateway';
export { default as Api } from './clients/Api/Api';
export { default as ShardLauncher } from './clients/Paracord/ShardLauncher';
export { default as Server } from './rpc/server/RpcServer';
export { default as Base } from './clients/Paracord/Base';
export * from './utils';
export * from './constants';
export * from './clients/Gateway/types';
export * from './clients/Api/types';

// export * from './clients/Paracord/structures';
export {
  ParacordBaseOptions, ParacordOptions, FilterOptions, ParacordLoginBaseOptions, ParacordLoginOptions,
  ShardLauncherOptions,
} from './clients/Paracord/types';
export * from './types';
