"use strict";
/* eslint-disable prefer-destructuring */

const { RequestMessage, ResponseMessage } = require("../../structures");
const { loadProtoDefinition, constructorDefaults } = require("../common");

const definition = loadProtoDefinition("request");

/** Definition for the request service. */
module.exports = class RequestService extends definition.RequestService {
  /**
   * Creates a request service.
   *
   * @param {ServiceOptions} options
   */
  constructor(options) {
    const defaultArgs = constructorDefaults(options || {});
    super(...defaultArgs);
    /** @type {string} host:port the service is pointed at. */
    this.target = defaultArgs[0];
  }

  /** Sends to the server the information to make a request to Discord. returning a promise with the response.
   *
   * @param {string} method HTTP method of the request.
   * @param {string} url Discord endpoint url. (e.g. channels/123)
   * @param {RequestOptions} options Optional parameters for this request.
   * @returns {Promise<ApiResponse>}
   */
  request({ method, url, ...options }) {
    const message = new RequestMessage(method, url, options).proto;

    return new Promise((resolve, reject) => {
      super.request(message, (err, res) => {
        if (err === null) {
          resolve(ResponseMessage.fromProto(res));
        } else {
          reject(err);
        }
      });
    });
  }
};
