import { BaseRequest } from '.';
import { IRequestOptions, IApiResponse } from '../types';
export default class Request extends BaseRequest {
    data: Record<string, unknown> | undefined;
    headers: Record<string, unknown> | undefined;
    response: Promise<IApiResponse> | undefined;
    waitUntil: number | undefined;
    constructor(method: string, url: string, options?: Partial<IRequestOptions>);
    get sendData(): Record<string, unknown>;
    assignIfStricterWait(waitUntil: number): void;
}
