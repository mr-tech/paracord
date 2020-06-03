import { IRequestMessage, RequestProto } from '../../types';
export default class RequestMessage {
    method: string;
    url: string;
    data?: Record<string, unknown>;
    headers?: Record<string, unknown>;
    static fromProto(message: RequestProto): RequestMessage;
    private static validateOutgoing;
    private static validateIncoming;
    constructor(apiRequest: IRequestMessage);
    get proto(): RequestProto;
}
