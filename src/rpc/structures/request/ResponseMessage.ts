import { ResponseData } from '../../../clients/Api/types';
import { RemoteApiResponse, ResponseProto } from '../../types';

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
  public static fromProto<T extends ResponseData>(message: ResponseProto): RemoteApiResponse<T> {
    ResponseMessage.validateIncoming(message);

    const { status_code: status, status_text: statusText, data } = message;

    let res;
    try {
      res = data !== undefined ? JSON.parse(data) : undefined;
    } catch (err) {
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
