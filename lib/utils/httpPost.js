/**
 * @function httpPost
 * Perform an HTTP POST operation.
 * @param {string} url - The endpoint URL
 * @param {any} data - The request body data
 * @param {object} options - Additional axios config options
 * @returns {Promise} Axios response promise
 */
const axios = require("axios");

const transport = axios.create({ withCredentials: true });

module.exports = function (url, data, options = {}) {
   const config = { ...options, url, method: "post", data };

   return transport(config);
};
