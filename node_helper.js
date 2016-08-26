/* global Module */
/* Magic Mirror
 * Module: localstation
 *
 * By Sven Richter https://github.com/native2k
 * MIT Licensed.
 */
var NodeHelper = require('node_helper');
var request = require('request');
var qs = require('querystring');

module.exports = NodeHelper.create({
  start: function () {
    console.log(this.name + ' helper started ...');
  },

  socketNotificationReceived: function (notification, payload) {
    console.log('nodehlep' + notification);
    if (notification === 'LOCAL_STATION_REQUEST') {
      var _this = this;
      console.log('send to ' + payload.request.url);
      console.log('header to ' + payload.request.headers);

      payload.request.body = qs.escape(payload.request.body).replace(/\%26/g, '&').replace(/\%2B/g, '+').replace(/\%3D/g, '=');
      console.log('body: ' + payload.request.body);

      request(payload.request, function (error, response, body) {
        console.log(this.name + ' receeived ...' + response.statusCode + error);
        console.log(this.name + ' response : ' + body);
        if (!error && response.statusCode == 200) {
          _this.sendSocketNotification('LOCAL_STATION_RESPONSE', {
            id: payload.id,
            data: JSON.parse(body),
          });
        }
      });
    }
  },

});
