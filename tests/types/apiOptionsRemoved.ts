import type { ApiOptions } from '../../src/clients/Api/types';

export const accepted: ApiOptions = { maxConcurrency: 5, requestOptions: { timeout: 1000 } };

// @ts-expect-error queueLoopInterval is no longer an ApiOptions member
export const removed: ApiOptions = { queueLoopInterval: 1000 };
