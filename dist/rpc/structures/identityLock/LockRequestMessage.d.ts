import { LockRequestProto } from '../../types';
export default class LockRequestMessage {
    timeOut: number;
    token: string | undefined;
    static fromProto(message: LockRequestProto): LockRequestMessage;
    private static validateOutgoing;
    private static validateIncoming;
    constructor(timeOut: number, token?: string);
    get proto(): LockRequestProto;
}
