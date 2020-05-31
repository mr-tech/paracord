import { ILockServiceOptions } from '../../../common';
import { StatusMessage } from '../../structures';
declare const definition: import("@grpc/grpc-js").GrpcObject;
export default class IdentifyLockService extends definition.LockService {
    readonly target: string;
    readonly allowFallback: boolean;
    readonly duration: number;
    private _token?;
    constructor(options: Partial<ILockServiceOptions>);
    get token(): string | undefined;
    clearToken(): void;
    acquire(): Promise<StatusMessage>;
    release(): StatusMessage | Promise<StatusMessage>;
}
export {};
