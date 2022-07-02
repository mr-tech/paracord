"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ResponseMessage {
    status;
    statusText;
    data;
    static fromProto(message) {
        ResponseMessage.validateIncoming(message);
        const { status_code: status, status_text: statusText, data } = message;
        let res;
        try {
            res = data !== undefined ? JSON.parse(data) : undefined;
        }
        catch (err) {
            res = data;
        }
        return {
            status,
            statusText,
            data: res,
        };
    }
    static validateIncoming(message) {
        if (message.status_code === undefined) {
            throw Error("received invalid message. missing property 'status_code'");
        }
    }
    constructor(status, statusText, data) {
        this.status = status;
        this.statusText = statusText;
        this.data = data;
    }
    get proto() {
        return {
            status_code: this.status,
            status_text: this.statusText,
            data: this.data,
        };
    }
}
exports.default = ResponseMessage;
