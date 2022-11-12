/* global Celestial, loadJson, settings, horizontal, datetimepicker, config, formats, $, $form, pad, testNumber, isArray, isNumber, showAdvanced, enable, has, parentElement */

function geo(cfg) {
  let zenith = [0, 0],
    date = new Date(),
    localZone = -date.getTimezoneOffset(),
    timeZone = localZone,
    config = settings.set(cfg),
    geopos = config.geopos ? config.geopos : [0, 0];

  function isValidLocation(loc) {
    //[lat, lon] expected
    if (!loc || !isArray(loc) || loc.length < 2) return false;
    if (!isNumber(loc[0]) || loc[0] < -90 || loc[0] > 90) return false;
    if (!isNumber(loc[1]) || loc[1] < -180 || loc[1] > 180) return false;
    return true;
  }

  function isValidTimezone(tz) {
    if (tz === undefined || tz === null) return false;
    if (!isNumber(tz) && Math.abs(tz) > 840) return false;
    return true;
  }

  function go() {
    let dtc = new Date(date.valueOf() - (timeZone - localZone) * 60000);
    
    Object.assign(config, settings.set());
    zenith = horizontal.inverse(dtc, [90, 0], geopos);
    zenith[2] = 0;
    if (config.follow === "zenith") {
      Celestial.rotate({ center: zenith });
    } else {
      Celestial.redraw();
    }
  }

  function setPosition(position) {
    let timestamp = Math.floor(date.getTime() / 1000),
      protocol = window && window.location.protocol === "https:" ? "https" : "http",
      url = `${protocol}://api.timezonedb.com/v2.1/get-time-zone?key=${config.timezoneid}&format=json&by=position&lat=${position[0]}&lng=${position[1]}&time=${timestamp}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        timeZone = data.status === "FAILED" ? Math.round(position[1] / 15) * 60 : data.gmtOffset / 60;
      }).catch(() => {
        timeZone = Math.round(position[1] / 15) * 60;
      }).finally(() => {
        go();
      });
  }

  Celestial.date = (newDate, tz) => {
    if (isValidTimezone(tz)) timeZone = tz;
    date.setTime(newDate.valueOf());
    go();
  };

  Celestial.timezone = (tz) => {
    if (!tz) return timeZone;
    if (isValidTimezone(tz)) timeZone = tz;
    go();
  };

  Celestial.position = () => geopos;

  Celestial.location = (loc, tz) => {
    if (!loc || loc.length < 2) return geopos;
    if (isValidLocation(loc)) {
      geopos = loc.slice();
      if (isValidTimezone(tz)) {
        timeZone = tz;
        go();
      }
      else setPosition(geopos);
    }
  };

  Celestial.zenith = () => zenith;
  Celestial.nadir = () => {
    let b = -zenith[1],
      l = zenith[0] + 180;
    if (l > 180) l -= 360;
    return [l, b - 0.001];
  };

  Object.defineProperty(Celestial, 'tz', {
    get: function () {
      return timeZone;
    }
  });

  //only if appropriate
  // if (isValidLocation(geopos) && (config.location === true || config.formFields.location === true) && config.follow === "zenith")
  //   setTimeout(() => {
  //     setPosition(geopos);
  //   }, 1000);
}
