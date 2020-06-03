import { IApiResponse, IRequestOptions } from '../types';
import BaseRequest from './BaseRequest';
export default class Request extends BaseRequest {
    data: Record<string, unknown> | undefined;
    headers: Record<string, unknown> | undefined;
    response: Promise<IApiResponse> | IApiResponse | undefined;
    waitUntil: number | undefined;
    returnOnRateLimit: boolean;
    returnOnGlobalRateLimit: boolean;
    retriesLeft?: number;
    running: boolean;
    constructor(method: string, url: string, options?: Partial<IRequestOptions>);
    get sendData(): Record<string, unknown>;
    assignIfStricterWait(waitUntil: number): void;
}
