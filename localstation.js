/* global Module */
/* Magic Mirror
 * Module: localstation
 *
 * By Christopher Fenner https://github.com/CFenner
 * MIT Licensed.
 */

Module.register('localstation', {

  defaults: {
    animationSpeed: 1,
    updateInterval: 5,
    typeMap: {
        'BUS': 'fa fa-bus',
        'STR': 'fa  fa-train',
        'UUU': 'fa  fa-train',
        's': 'fa fa-subway',
    },
    /*
    mode: 'transit',
    traffic_model: 'best_guess',

    language: 'de',
    units: 'metric',
    */
    maxShow: 10,
    departureTime: 5,
    alternatives: true,
    maxAlternatives: 3,

    stop: 'Leipzig, Marschnerstr.',
    //stop: 'Leipzig, Goerdelerring',
    //stop: 'Leipzig, Wilhelm-Leuschner-Platz',
    //stop: 'Leipzig, Dreiecksplatz',
    apiBase: 'https://www.l.de/verkehrsbetriebe/fahrplan',
    apiEndpoint: '?ws_info_stop',
    doMerge : true,
    filter: {
        'STR 1': {
            //blacklist: ['Lausen', 'Leipzig, Lausen'],

            merge: {
              'Lausen': ['Lausen', 'Leipzig, Lausen'],
              'Hauptbahnhof': ['Schönefeld', "Grünau-Süd", 'Mockau', "Leipzig, Mockau, Post"],
            }
        },
        'STR 14': {
            blacklist: ['S-Bf. Plagwitz'],
            whitelist: ['Hauptbahnhof'],
        },
    },
  },

  start: function () {
    Log.info('Starting module: ' + this.name);
    this.loaded = false;
    this.url = this.config.apiBase + this.config.apiEndpoint;
    this.update();

    // refresh every x minutes
    Log.log('Create new calendar fetcher for url: ' + this.config.apiBase + this.config.apiEndpoint + 'Interval: ' + this.config.updateInterval * 60 * 1000);
    setInterval(
        this.update.bind(this),
        //this.config.updateInterval * 60 * 1000);
        20 * 1000);
  },

  update: function () {
    var timeDiff = this.config.updateInterval + 1;
    if (this.updateData) {
      timeDiff = moment().diff(this.updateData, 'minutes');
    }
    Log.info('update module: ' + this.name + ' data from ' + this.updateData + ' (' + timeDiff + ')');
    if (this.update &&  timeDiff > this.config.updateInterval) {
      this.sendSocketNotification(
        'LOCAL_STATION_REQUEST', {
          id: this.identifier,
          request: {
              method: 'POST',
              gzip: true,
              url: this.config.apiBase + this.config.apiEndpoint,
              body: this.getParams(),
              headers: {
                'Origin': 'https://www.l.de',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.8,de;q=0.6',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Referer': 'https://www.l.de/verkehrsbetriebe/fahrplan',
                'X-Requested-With': 'XMLHttpRequest',
                'Connection': 'keep-alive',
              }
          }

        }
      );
    } else {
      Log.info('only update local data ');
      this.updateDom(this.config.animationSpeed * 1000);
    }
  },

  getParams: function () {
    //'results[5][2][function]=ws_info_stop&results[5][2][data]=[{"name":"results[5][2][stop]","value":"Leipzig,+Marschnerstr."},{"name":"results[5][2][date]","value":"15.08.2016"},{"name":"results[5][2][time]","value":""},{"name":"results[5][2][mode]","value":"stop"}]'
    var date = moment().add(this.config.departureTime, 'minutes');
    var params = '';
    params += 'results[5][2][function]=ws_info_stop&results[5][2][data]=[';
    params += '{"name":"results[5][2][stop]","value":"' + this.config.stop.replace(/\s/g, '+') + '"},';
    params += '{"name":"results[5][2][date]","value":"' + date.format('DD.MM.YYYY') + '"},';
    params += '{"name":"results[5][2][time]","value":"' + date.format('HH:mm') + '"},';
    //params += '{"name":"results[5][2][time]","value":""},';
    params += '{"name":"results[5][2][mode]","value":"stop"}]';
    Log.info('params: ' + params);
    return params;
    //return params;
  },

  //
  // renderLeg: function (wrapper, leg) {
  //   var depature = leg.departure_time.value * 1000;
  //   var arrival = leg.arrival_time.value * 1000;
  //   var span = document.createElement('div');
  //   span.innerHTML = moment(depature).fromNow();
  //   // + this.translate('TRAVEL_TIME') + ": "
  //   // + moment.duration(moment(arrival).diff(depature, 'minutes'), 'minutes').humanize()
  //
  //   wrapper.appendChild(span);
  // },

  connectionTime: function (aConn) {
    var today = moment().format('YYYY-MM-DD') + ' ';
    return moment(today + aConn.time).add(aConn.time_prognosis, 'minutes');
  },

  connectionSort: function (connA, connB) {
    var today = moment().format('YYYY-MM-DD') + ' ';
    var ma =  moment(today + connA.time).add(connA.time_prognosis, 'minutes');
    var mb =  moment(today + connB.time).add(connB.time_prognosis, 'minutes');
    return ma - mb
    // return this.connectionTime(connA) - this.connectionTime(connB);
  },

  mergeConnections: function (connections) {
    if (!this.config.doMerge) {
      return connections;
    }

    // var today = moment().format('YYYY-MM-DD') + ' '
    // var firstOne = moment(today + conn.time).add(conn.time_prognosis, 'minutes');
    var res = [];
    var merge = {};
    for (var conid in connections) {
      var conn = connections[conid];
      var conid = conn.type + ' ' + conn.number;
      var condir = conn.direction;
      var isMerge = false;

      if (this.config.filter[conid] && this.config.filter[conid].merge) {
        var mergeData = this.config.filter[conid].merge;

        for (var mergid in mergeData) {
          if (mergeData[mergid].indexOf(condir) > -1) {
            isMerge = true;
            var mergeKey = conid + ':' + mergid;
            if (merge[mergeKey]) {
              // here really need to merge
              var conMerge = merge[mergeKey];
              // var conMergeTime = moment(today + conMerge.time).add(conMerge.time_prognosis, 'minutes');
              // var connTime = moment(today + conn.time).add(conn.time_prognosis, 'minutes');

              if (this.connectionSort(conn, conMerge) < 0) {
                  // replace current items with more recent ones
                  conMerge.later_departures.push({
                      'time_prognosis': conMerge.time_prognosis,
                      'time': conMerge.time,
                  })
                  conMerge.time_prognosis = conn.time_prognosis;
                  conMerge.time = conn.time;
              } else {
                  conMerge.later_departures.push({
                      'time_prognosis': conn.time_prognosis,
                      'time': conn.time,
                  })
              }
              // no append all of new later departures
              for (var laterdep in conn.later_departures) {
                  conMerge.later_departures.push(conn.later_departures[laterdep]);
              }
            } else {
              merge[mergeKey] = conn;
              merge[mergeKey].direction = mergid;
            }
          }
        }
      }
      if (!isMerge) {
          res.push(conn);
      }
    }
    Log.info('res before merge: ' + JSON.stringify(res, null, 4));
    if (merge) {
        Log.info('merged: ' + JSON.stringify(merge, null, 4));
        // wie did some merge .. need to sort later_departurs
        for (var amerge in merge) {
            // add to res
            merge[amerge].later_departures.sort(this.connectionSort);
            res.push(merge[amerge]);
        }

        // sort res
        res.sort(this.connectionSort);
    }
    Log.info('res: ' + JSON.stringify(res, null, 4));
    return res
  },


  filterConnection: function(conn) {
    var conid = conn.type + ' ' + conn.number;
    var condir = conn.direction;
    var condesc = conid + ' with "' + condir + '": '

    if (this.config.filter[conid]) {
      var confilter = this.config.filter[conid];

      if (!confilter.blacklist && !confilter.whitelist && !confilter.merge) {
        Log.info(condesc + 'filter - no blacklist and no whitelist');
        return true;
      }

      if (confilter.whitelist && confilter.whitelist.indexOf(condir) > -1) {
        Log.info(condesc + 'not filter - whitelist match "' + condir + '"');
        return false;
      }

      if (!confilter.blacklist && !confilter.merge) {
        Log.info(condesc + 'filter - no blacklist exists and no whitelist match');
        return true;
      }

      if (confilter.blacklist && confilter.blacklist.indexOf(condir) > -1) {
        Log.info(condesc + 'filter - blacklist match "' + condir + '"');
        return true;
      }

      if (!confilter.whitelist && !confilter.merge ) {
        Log.info(condesc + 'not filter - no whitelist exists and no blacklist match');
        return false;
      }
    }

    Log.info(condesc + 'no filter entry');
    return false;
  },

  renderConnection: function (wrapper, conn) {
    var span = document.createElement('span');
    // Log.info('connection: ' + JSON.stringify(conn, null, 4))
    // var today = moment().format('YYYY-MM-DD') + ' '
    var firstOne = this.connectionTime(conn);
    var alternatives = firstOne.format('HH:mm');
    if (conn.time_prognosis) {
        alternatives += "*"
    }

    if (this.config.alternatives) {
        for (var laterdep in conn.later_departures) {
            if (laterdep < this.config.maxAlternatives) {
                alternatives += ', ';
                var ldata = conn.later_departures[laterdep]
                if (ldata.time_prognosis) {
                    //alternatives += ldata.time + '+' + ldata.time_prognosis;
                    alternatives += this.connectionTime(ldata).format('HH:mm') + '*'
                } else {
                    alternatives += ldata.time;
                }
            }
        }
    }
    var leaves = firstOne.fromNow();

    //<i class="fa fa-camera-retro"></i>
    var contype = document.createElement("span");
    // var ctypeMap = {'BUS': 'fa fa-bus', 'STR': 'fa  fa-train', 's': 'fa fa-subway'}
    contype.className = this.config.typeMap[conn.type];
    //contype.innerHTML = conn.type;
    contype.innerHTML = ' ';
    wrapper.appendChild(contype);

    // var contype = document.createElement("span");
    // contype.className = "localstationinvert";
    // //contype.innerHTML = conn.type;
    // contype.innerHTML = conn.type;
    // wrapper.appendChild(contype);

    var connbr = document.createElement("span")
    connbr.className = "localstationinvert localstation-" + conn.type;
    connbr.innerHTML = conn.number ;
    wrapper.appendChild(connbr);

    var conselect = document.createElement("span")
    // contype.className = "localstationinvert";
    //contype.innerHTML = conn.type;
    conselect.innerHTML = ' ' + conn.direction + ' ';
    wrapper.appendChild(conselect);

    var conmain = document.createElement("span")
    conmain.className = "bright";
    //conmain.innerHTML = ' ' + conn.number + ' ' + conn.direction + ' ' +  leaves + ' ';
    conmain.innerHTML = leaves + ' ';
    wrapper.appendChild(conmain) ;

    var contimes = document.createElement("span");
    contimes.className = "time light";
    contimes.innerHTML = '(' + alternatives + ')';
    wrapper.appendChild(contimes);

    wrapper.appendChild(span);
    /*
    var td = document.createElement('td');
    td.appendChild(span);
    wrapper.appendChild(td);
    */
  },

  renderStep: function (wrapper, step) {
    if (step.travel_mode === "WALKING") {
      return; // skip walking
    }
    var details = step.transit_details;
    if (details) {
      var img = document.createElement("img");
      img.src = details.line.vehicle.local_icon || ("http:" + details.line.vehicle.icon);
      wrapper.appendChild(img);
      var span = document.createElement("span");
      span.innerHTML = details.line.short_name || details.line.name;
      span.className = "bright";
      wrapper.appendChild(span);
    }
  },

  socketNotificationReceived: function (notification, payload) {
    Log.info('received' + notification);
    Log.info(payload.id + ' == ' + this.identifier)
    if (notification === 'LOCAL_STATION_RESPONSE' && payload.id === this.identifier) {
      Log.info('received');
      if (payload.data) {
        if (payload.error) {
          this.error = payload.error
          //this.updateData = moment()
        } else {

          this.updateData = moment()
          this.error = null

          Log.info('start update' + notification);
          this.data = this.mergeConnections(payload.data.connections);
          this.loaded = true;
          this.updateDom(this.config.animationSpeed * 1000);
          Log.info('after update' + notification);
        }
      }
    }
  },

  getStyles: function () {
    return ['localstation.css'];
  },

  getScripts: function () {
    return ['moment.js'];
  },

  getTranslations: function () {
    return {
      de: 'i18n/de.json',
    };
  },

  getDom: function () {
    var opLevel = ['0.88', '0.66', '0.44', '0.22']
    var wrapper = document.createElement('div');
    if (!this.loaded) {
      wrapper.innerHTML = this.translate('LOADING_CONNECTIONS');
    } else if (this.error) {
         wrapper.innerHTML = this.translate(this.error);
    } else {
      var header = document.createElement('header')
      header.innerHTML = this.config.stop
      wrapper.appendChild(header)

      var ul = document.createElement('ul');
      ul.className = 'small'
      var cntShow = 0;
      for (var connection in this.data) {
        var condata =  this.data[connection]
        if (!this.filterConnection(condata) && cntShow < this.config.maxShow) {
            var li = document.createElement("li");
            li.className = "normal";
            li.style = 'opacity: ' + opLevel[cntShow - (this.config.maxShow - 4)];
            this.renderConnection(li,condata);
            ul.appendChild(li);
            cntShow += 1
        }

      }
      wrapper.appendChild(ul);
    }

    return wrapper;
  },
});
