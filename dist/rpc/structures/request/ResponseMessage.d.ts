import { RemoteApiResponse, ResponseProto } from '../../types';
export default class ResponseMessage {
    status: number;
    statusText: string;
    data?: string;
    static fromProto(message: ResponseProto): RemoteApiResponse;
    private static validateIncoming;
    constructor(status: number, statusText: string, data?: string);
    get proto(): ResponseProto;
}
