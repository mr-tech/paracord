import { StatusProto } from '../../types';
export default class StatusMessage {
    success: boolean;
    message: string | undefined;
    token: string | undefined;
    static fromProto(message: StatusProto): StatusMessage;
    private static validateOutgoing;
    private static validateIncoming;
    constructor(didSucceed: boolean, message: string | undefined, token?: string);
    get proto(): StatusProto;
}
