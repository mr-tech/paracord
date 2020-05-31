import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { IServerOptions } from '../../common';
export declare function loadProto(proto: string): protoLoader.PackageDefinition;
export declare function loadProtoDefinition(proto: string): grpc.GrpcObject;
export declare function mergeOptionsWithDefaults(options: Partial<IServerOptions>): IServerOptions;
