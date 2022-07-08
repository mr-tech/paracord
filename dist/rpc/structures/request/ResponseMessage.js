"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** A class for the ResponseMessage protobuf */
class ResponseMessage {
    /** The HTTP status code of the response. */
    status;
    /** Status message returned by the server. (e.g. "OK" with a 200 status) */
    statusText;
    /** Data response from Discord not having yet been parsed into json. */
    data;
    /**
     * Validate incoming message and translate it into common state.
     * @param message Message received by client.
     */
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
    /**
     * Validates that the message being received is valid.
     * @param message Message being sent to client.
     */
    static validateIncoming(message) {
        if (message.status_code === undefined) {
            throw Error("received invalid message. missing property 'status_code'");
        }
    }
    /**
     * Creates a new ResponseMessage send from server to client.
     * @param status The HTTP status code of the response.
     * @param statusText Status message returned by the server. (e.g. "OK" with a 200 status)
     * @param data Data response from Discord not having yet been parsed into json.
     */
    constructor(status, statusText, data) {
        this.status = status;
        this.statusText = statusText;
        this.data = data;
    }
    /** The properties of this message formatted for sending over rpc. */
    get proto() {
        return {
            status_code: this.status,
            status_text: this.statusText,
            data: this.data,
        };
    }
}
exports.default = ResponseMessage;
