import { GrpcObject } from '@grpc/grpc-js';
import { PackageDefinition } from '@grpc/proto-loader';
import { IServerOptions } from '../../common';
export declare function loadProto(proto: string): PackageDefinition;
export declare function loadProtoDefinition(proto: string): GrpcObject;
export declare function mergeOptionsWithDefaults(options: Partial<IServerOptions>): IServerOptions;
