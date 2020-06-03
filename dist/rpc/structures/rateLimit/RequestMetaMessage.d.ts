import { RequestMetaProto } from '../../types';
export default class RequestMetaMessage {
    method: string;
    url: string;
    static fromProto(message: RequestMetaProto): RequestMetaMessage;
    private static validateOutgoing;
    private static validateIncoming;
    constructor(method: string, url: string);
    get proto(): RequestMetaProto;
}
