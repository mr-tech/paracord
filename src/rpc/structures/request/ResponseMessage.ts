import type { RemoteApiResponse, ResponseProto } from '../../types';

/** A class for the ResponseMessage protobuf */
export default class ResponseMessage {
  /** The HTTP status code of the response. */
  public status: number;

  /** Status message returned by the server. (e.g. "OK" with a 200 status) */
  public statusText: string;

  /** Data response from Discord not having yet been parsed into json. */
  public data?: undefined | string;

  /**
   * Validate incoming message and translate it into common state.
   * @param message Message received by client.
   */
  public static fromProto<T>(message: ResponseProto): RemoteApiResponse<T> {
    ResponseMessage.validateIncoming(message);

    const { status_code: status, status_text: statusText, data } = message;

    let res;
    try {
      res = data !== undefined ? JSON.parse(data) : undefined;
    } catch (err) {
      res = data;
    }

    // Tolerates an old (pre-WP-7) server's double JSON encoding (plan 001 WP-7 step 2,
    // AC-7.2): where the once-decoded value is itself a string that is further valid
    // JSON of a *non-string* type (object, array, null, number, boolean), the second
    // decoding is the one the local path would have yielded, and is used instead. A
    // genuine string whose text is such JSON (a plain string, or one like `"42"`) is
    // indistinguishable from this on every pairing and is not recovered — a permanent,
    // named residue (AC-7.1's "Tolerance residue"; AC-7.2 attributes recovery under this
    // rule to number and boolean only, not to string).
    if (typeof res === 'string') {
      try {
        const doubleDecoded = JSON.parse(res);
        if (typeof doubleDecoded !== 'string') {
          res = doubleDecoded;
        }
      } catch (err) {
        // Not further JSON — `res` is already the decoded value.
      }
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
  private static validateIncoming(message: ResponseProto): void {
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
  public constructor(status: number, statusText: string, data?: undefined | string) {
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }

  /** The properties of this message formatted for sending over rpc. */
  public get proto(): ResponseProto {
    return {
      status_code: this.status,
      status_text: this.statusText,
      data: this.data,
    };
  }
}
