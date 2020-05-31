import { ApiRequest } from '../../../clients/Api/structures';
import { IServerOptions } from '../../../common';
import { RemoteApiResponse } from '../../types';
declare const definition: import("@grpc/grpc-js").GrpcObject;
export default class RequestService extends definition.RequestService {
    target: string;
    allowFallback: boolean;
    constructor(options: Partial<IServerOptions>);
    request(apiRequest: ApiRequest): Promise<RemoteApiResponse>;
}
export {};
