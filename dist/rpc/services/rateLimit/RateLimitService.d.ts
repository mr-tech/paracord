import { ApiRequest } from '../../../clients/Api/structures';
import { IServerOptions } from '../../../common';
import { AuthorizationMessage } from '../../structures';
declare const definition: import("@grpc/grpc-js").GrpcObject;
export default class RateLimitService extends definition.RateLimitService {
    target: string;
    allowFallback: boolean;
    constructor(options: Partial<IServerOptions>);
    authorize(request: ApiRequest): Promise<AuthorizationMessage>;
    update(request: ApiRequest, global: boolean, bucket: string | undefined, limit: number, remaining: number, resetAfter: number): Promise<void>;
}
export {};
