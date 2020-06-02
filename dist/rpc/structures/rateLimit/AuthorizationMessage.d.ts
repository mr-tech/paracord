import { AuthorizationProto } from '../../types';
export default class AuthorizationMessage {
    resetAfter: number;
    global: boolean;
    static fromProto(message: AuthorizationProto): AuthorizationMessage;
    private static validateOutgoing;
    private static validateIncoming;
    constructor(resetAfter: number, global: boolean);
    get proto(): AuthorizationProto;
}
