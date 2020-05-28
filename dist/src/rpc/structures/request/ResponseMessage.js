"use strict";
module.exports = class ResponseMessage {
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
    static validateIncoming(response) {
        if (response.status_code === undefined) {
            throw Error("received invalid message. missing property 'status_code'");
        }
    }
    static fromProto(message) {
        ResponseMessage.validateIncoming(message);
        const { status_code: status, status_text: statusText, data } = message;
        return {
            status,
            statusText,
            data: data.startsWith('{') ? JSON.parse(data) : data,
        };
    }
};
