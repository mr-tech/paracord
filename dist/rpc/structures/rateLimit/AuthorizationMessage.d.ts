import { AuthorizationProto } from '../../types';
export default class AuthorizationMessage {
    resetAfter: number;
    static fromProto(message: AuthorizationProto): AuthorizationMessage;
    private static validateOutgoing;
    private static validateIncoming;
    constructor(resetAfter: number);
    get proto(): AuthorizationProto;
}
