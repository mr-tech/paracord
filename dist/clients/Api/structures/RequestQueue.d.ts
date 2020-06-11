/// <reference types="node" />
import { ApiRequest } from '.';
import Api from '../Api';
export default class RequestQueue {
    #private;
    constructor(apiClient: Api);
    private get length();
    startQueue(interval: number): NodeJS.Timer;
    push(...items: ApiRequest[]): void;
    private spliceMany;
    private process;
    private processIteration;
    private sendRequest;
}
