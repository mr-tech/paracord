import { TokenProto } from '../../types';
export default class TokenMessage {
    value: string;
    static fromProto(message: TokenProto): TokenMessage;
    private static validateOutgoing;
    private static validateIncoming;
    constructor(value: string);
    get proto(): TokenProto;
}
