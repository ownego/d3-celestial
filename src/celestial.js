/* global module, require, topojson, settings, bvcolor, projections, poles, eulerAngles, euler, getAngles, listConstellations, getMwbackground, getGridValues, Canvas, halfπ, $, px, has, hasCallback, isArray, isNumber, arrayfy, form, geo, fldEnable, setCenter, interpolateAngle, formats */

let Celestial = {
  version: '0.7.35',
  data: [],
};

let ANIMDISTANCE = 0.035,  // Rotation animation threshold, ~2deg in radians
  ANIMINTERVAL_R = 1000; // Rotation duration scale in ms

let cfg, mapProjection, parentElement, map;

let starMapData = {};

// Show it all, with the given config, otherwise with default settings
Celestial.display = function (config) {
  if (window.starMapData) {
    starMapData = window.starMapData;
  } else {
    window.starMapData = starMapData;
  }
  //Mash config with default settings, todo: if globalConfig exists, make another one
  cfg = settings.set(config).applyDefaults(config);

  let parent = document.getElementById(cfg.container);
  parentElement = `#${cfg.container}`;
  let st = window.getComputedStyle(parent, null);
  if (!parseInt(st.width) && !cfg.width) parent.style.width = px(parent.parentNode.clientWidth);

  let margin = [0, 0],
    width = getWidth(),
    canvaswidth = width,
    projectionSetting = {
      n: "Airy’s Minimum Error",
      arg: Math.PI / 2,
      scale: 360,
      ratio: 1.0,
      clip: true,
    };

  if (!projectionSetting) return;

  let ratio = projectionSetting.ratio,
    height = Math.round(width / ratio),
    canvasheight = Math.round(canvaswidth / ratio),
    scale = projectionSetting.scale * width / 1024,
    starbase = cfg.stars.size,
    starexp = cfg.stars.exponent,
    rotation = getAngles(cfg.center),
    path = cfg.datapath;

  parent.style.height = px(canvasheight);

  mapProjection = Celestial.projection(cfg.projection).rotate(rotation).translate([canvaswidth / 2, canvasheight / 2]).scale(scale).clipAngle(90);

  let canvas = d3.select(parentElement).selectAll("canvas"),
    culture = (cfg.culture !== "" && cfg.culture !== "iau") ? cfg.culture : "";

  if (canvas[0].length === 0) canvas = d3.select(parentElement).append("canvas");
  //canvas.attr("width", width).attr("height", height);
  canvas.style("width", px(canvaswidth)).style("height", px(canvasheight)).attr("width", canvaswidth).attr("height", canvasheight);
  let context = canvas.node().getContext("2d");

  let graticule = d3.geo.graticule().minorStep([15, 10]);

  map = d3.geo.path().projection(mapProjection).context(context);

  canvas.attr("style", "cursor: default!important");

  geo(cfg);

  async function load() {
    //Background
    starMapData.outline = graticule.outline;
    //Celestial planes
    graticule.minorStep([15, 10]);
    starMapData.graticule = graticule;

    if (
      !starMapData.milkyWayData ||
      !starMapData.constellationsData ||
      !starMapData.constellationsLinesData ||
      !starMapData.starsData
    ) {
      // Load data
      let [milkyWayData, constellationsData, constellationsLinesData, starsData]
        = await Promise.allSettled([
          loadJson(path + "mw.json"),
          loadJson(path + filename("constellations")),
          loadJson(path + filename("constellations", "lines")),
          loadJson(path + cfg.stars.data),
        ]);

      extractData(milkyWayData, (milkyWayData) => {
        starMapData.milkyWayData = milkyWayData;
      });

      extractData(constellationsData, (constellationsData) => {
        starMapData.constellationsData = constellationsData;
      });

      extractData(constellationsLinesData, (constellationsLinesData) => {
        starMapData.constellationsLinesData = constellationsLinesData;
      });

      extractData(starsData, (starsData) => {
        starMapData.starsData = starsData;
      });
    }

    if (cfg.lang && cfg.lang != "") apply(Celestial.setLanguage(cfg.lang));
    redraw();
  }

  function apply(config) {
    cfg = settings.set(config);
    redraw();
  }

  function applyWithoutRedraw(config) {
    cfg = settings.set(config);
  }

  function rotate(config) {
    let cFrom = cfg.center,
      rot = mapProjection.rotate(),
      keep = false,
      oof = cfg.orientationfixed;

    if (Round(rot[1], 1) === -Round(config.center[1], 1)) keep = true; //keep lat fixed if equal
    cfg = cfg.set(config);
    let d = Round(d3.geo.distance(cFrom, cfg.center), 2);
    if (d < ANIMDISTANCE || cfg.disableAnimations === true) {
      rotation = getAngles(cfg.center);
      mapProjection.rotate(rotation);
      redraw();
      return 0;
    }
    if (d > 3.14) cfg.center[0] -= 0.01; //180deg turn doesn't work well
    cfg.orientationfixed = false;
    // Rotation interpolator
    const cTween = d === 0 ? () => cfg.center : d3.geo.interpolate(cFrom, cfg.center);
    const interval = ANIMINTERVAL_R * d; // duration scaled by ang. distance
    d3.select({}).transition().duration(interval).tween("center", function () {
      return function (t) {
        let c = getAngles(cTween(t));
        if (keep) c[1] = rot[1];
        mapProjection.rotate(c);
        redraw();
      };
    }).transition().duration(0).tween("center", function () {
      cfg.orientationfixed = oof;
      rotation = getAngles(cfg.center);
      mapProjection.rotate(rotation);
      redraw();
    });
    return interval;
  }

  function redraw() {
    let rot = mapProjection.rotate();

    starbase = cfg.stars.size;
    starexp = cfg.stars.exponent;

    if (cfg.orientationfixed && cfg.center.length > 2) {
      rot[2] = cfg.center[2];
      mapProjection.rotate(rot);
    }
    cfg.center = [-rot[0], -rot[1], rot[2]];

    clear();

    drawOutline();

    //Draw all types of objects on the canvas
    if (cfg.mw.show) {
      starMapData.milkyWayData.features.forEach((data) => {
        setStyle(cfg.mw.style);
        map(data);
        context.fill();
      });
    }

    for (let key in cfg.lines) {
      if (cfg.lines[key].show !== true) continue;
      setStyle(cfg.lines[key]);
      map(starMapData[key]());
      context.stroke();
    }

    if (cfg.constellations.lines) {
      starMapData.constellationsLinesData.features.forEach((data) => {
        setStyle(data.properties.rank, cfg.constellations.lineStyle);
        map(data);
        context.stroke();
      });
    }

    drawOutline(true);

    if (cfg.constellations.names) {
      starMapData.constellationsData.features.forEach(function (d) {
        if (clip(d.geometry.coordinates)) {
          setStyleA(d.properties.rank, cfg.constellations.nameStyle);
          let pt = mapProjection(d.geometry.coordinates);
          context.fillText(constName(d), pt[0], pt[1]);
        }
      });
    }

    if (cfg.stars.show) {
      setStyle(cfg.stars.style);
      starMapData.starsData.features.forEach(function (d) {
        if (clip(d.geometry.coordinates) && d.properties.mag <= cfg.stars.limit) {
          let pt = mapProjection(d.geometry.coordinates), r = starSize(d);
          context.fillStyle = starColor(d);
          context.beginPath();
          context.arc(pt[0], pt[1], r, 0, 2 * Math.PI);
          context.closePath();
          context.fill();
        }
      });
    }

    if (hasCallback) {
      Celestial.runCallback();
    }
  }


  function drawOutline(stroke) {
    let rot = mapProjection.rotate();

    mapProjection.rotate([0, 0]);
    setStyle(cfg.background);
    map(starMapData.outline())
    if (stroke === true) {
      context.globalAlpha = 1;
      context.stroke();
    } else {
      context.fill();
    }
    mapProjection.rotate(rot);
  }

  // Helper functions -------------------------------------------------

  function clip(coords) {
    return !(projectionSetting.clip && d3.geo.distance(cfg.center, coords) > halfπ);
  }

  function setStyle(s) {
    context.fillStyle = s.fill || null;
    context.strokeStyle = s.stroke || null;
    context.lineWidth = s.width || null;
    context.globalAlpha = s.opacity !== null ? s.opacity : 1;
    context.font = s.font || null;
    if (has(s, "dash")) context.setLineDash(s.dash); else context.setLineDash([]);
    context.beginPath();
  }

  function setTextStyle(s) {
    context.fillStyle = s.fill;
    context.textAlign = s.align || "left";
    context.textBaseline = s.baseline || "bottom";
    context.globalAlpha = s.opacity !== null ? s.opacity : 1;
    context.font = s.font;
  }

  function setStyleA(rank, s) {
    rank = rank || 1;
    context.fillStyle = isArray(s.fill) ? s.fill[rank - 1] : null;
    context.strokeStyle = isArray(s.stroke) ? s.stroke[rank - 1] : null;
    context.lineWidth = isArray(s.width) ? s.width[rank - 1] : null;
    context.globalAlpha = isArray(s.opacity) ? s.opacity[rank - 1] : 1;
    context.font = isArray(s.font) ? s.font[rank - 1] : null;
    if (has(s, "dash")) context.setLineDash(s.dash); else context.setLineDash([]);
    context.textAlign = s.align || "left";
    context.textBaseline = s.baseline || "bottom";
    context.beginPath();
  }

  function filename(what, sub, ext) {
    let cult = (has(formats[what], culture)) ? "." + culture : "";
    ext = ext ? "." + ext : ".json";
    sub = sub ? "." + sub : "";
    return what + sub + cult + ext;
  }

  function starSize(d) {
    let mag = d.properties.mag;
    if (mag === null) return 0.1;
    let r = starbase * Math.exp(starexp * (mag + 2));
    return Math.max(r, 0.1);
  }


  function starColor(d) {
    let bv = d.properties.bv;
    if (!cfg.stars.colors || isNaN(bv)) { return cfg.stars.style.fill; }
    return bvcolor(bv);
  }

  function constName(d) {
    return d.properties[cfg.constellations.namesType];
  }

  function clear() {
    context.clearRect(0, 0, canvaswidth + margin[0], canvasheight + margin[1]);
  }

  function getWidth() {
    let w = 0;
    if (isNumber(cfg.width) && cfg.width > 0) w = cfg.width;
    else if (parent) w = parent.getBoundingClientRect().width - margin[0] * 2;
    else w = window.getBoundingClientRect().width - margin[0] * 2;
    return w;
  }

  // Exported objects and functions for adding data
  this.clip = clip;
  this.map = map;
  this.mapProjection = mapProjection;
  this.context = context;
  this.metrics = function () {
    return { "width": width, "height": height, "margin": margin, "scale": mapProjection.scale() };
  };
  this.setStyle = setStyle;
  this.setTextStyle = setTextStyle;
  this.setStyleA = setStyleA;
  this.setConstStyle = function (rank, font) {
    let f = arrayfy(font);
    context.font = f[rank];
  };
  this.redraw = redraw;
  this.reload = function (config) {
    let ctr;
    if (config) Object.assign(cfg, settings.set(config));
    if (cfg.follow === "center" && has(cfg, "center")) {
      ctr = getAngles(cfg.center);
    } else if (cfg.follow === "zenith") {
      ctr = getAngles(Celestial.zenith());
    }
    if (ctr) mapProjection.rotate(ctr);
    load();
  };

  this.apply = function (config) {
    apply(config);
  };

  this.applyWithoutRedraw = function (config) {
    applyWithoutRedraw(config);
  }

  this.rotate = function (config) {
    if (!config) return cfg.center;
    return rotate(config);
  };

  load();
};

async function loadJson(url) {
  return new Promise((resolve, reject) => {
    d3.json(url, (error, json) => {
      if (error) reject(error);
      else resolve(json);
    });
  });
}

function extractData(data, callback) {
  return data.status === "rejected" ? console.log(data.error) : callback(data.value);
}

//Export entire object if invoked by require
if (typeof module === "object" && module.exports) {
  let d3js = require('./lib/d3.js'),
    d3_geo_projection = require('./lib/d3.geo.projection.js');
  module.exports = {
    Celestial: function () { return Celestial; },
    d3: function () { return d3js; },
    "d3.geo.projection": function () { return d3_geo_projection; }
  };
}
