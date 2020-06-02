import { RateLimitStateProto } from '../../types';
import RequestMetaMessage from './RequestMetaMessage';
export default class RateLimitStateMessage {
    requestMeta: RequestMetaMessage;
    global: boolean;
    bucket: string | undefined;
    limit: number;
    remaining: number;
    resetAfter: number;
    static fromProto(message: RateLimitStateProto): RateLimitStateMessage;
    private static validateOutgoing;
    private static validateIncoming;
    constructor(requestMeta: RequestMetaMessage, global: boolean, bucket: string | undefined, limit: number, remaining: number, resetAfter: number);
    get proto(): RateLimitStateProto;
}
