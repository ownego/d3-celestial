/* global module, require, topojson, settings, bvcolor, projections, projectionTween, poles, eulerAngles, euler, getAngles, listConstellations, getMwbackground, getGridValues, Canvas, halfπ, $, px, has, hasCallback, isArray, isNumber, arrayfy, form, geo, fldEnable, setCenter, interpolateAngle, formats */
let scopedContainer = null;

let Celestial = {
  version: '0.7.35',
  data: [],
  get container() {
    return scopedContainer;
  }
};

let ANIMDISTANCE = 0.035,  // Rotation animation threshold, ~2deg in radians
  ANIMSCALE = 1.4,       // Zoom animation threshold, scale factor
  ANIMINTERVAL_R = 1000; // Rotation duration scale in ms

let cfg, mapProjection, parentElement, map;

// Show it all, with the given config, otherwise with default settings
Celestial.display = function (config) {
  let container = scopedContainer;

  //Mash config with default settings, todo: if globalConfig exists, make another one
  cfg = settings.set(config).applyDefaults(config);

  let parent = document.getElementById(cfg.container);
  if (parent) {
    parentElement = "#" + cfg.container;
    let st = window.getComputedStyle(parent, null);
    if (!parseInt(st.width) && !cfg.width) parent.style.width = px(parent.parentNode.clientWidth);
  } else {
    parentElement = "body";
    parent = null;
  }

  let margin = [0, 0],
    width = getWidth(),
    canvaswidth = width,
    projectionSetting = getProjection(cfg.projection, cfg.projectionRatio);

  if (!projectionSetting) return;

  let ratio = projectionSetting.ratio,
    height = Math.round(width / ratio),
    canvasheight = Math.round(canvaswidth / ratio),
    scale = projectionSetting.scale * width / 1024,
    starbase = cfg.stars.size,
    starexp = cfg.stars.exponent,
    adapt = 1,
    rotation = getAngles(cfg.center),
    path = cfg.datapath;

  if (parentElement !== "body") parent.style.height = px(canvasheight);

  mapProjection = Celestial.projection(cfg.projection).rotate(rotation).translate([canvaswidth / 2, canvasheight / 2]).scale(scale);

  let canvas = d3.select(parentElement).selectAll("canvas"),
    culture = (cfg.culture !== "" && cfg.culture !== "iau") ? cfg.culture : "";

  if (canvas[0].length === 0) canvas = d3.select(parentElement).append("canvas");
  //canvas.attr("width", width).attr("height", height);
  canvas.style("width", px(canvaswidth)).style("height", px(canvasheight)).attr("width", canvaswidth).attr("height", canvasheight);
  let context = canvas.node().getContext("2d");

  let graticule = d3.geo.graticule().minorStep([15, 10]);

  map = d3.geo.path().projection(mapProjection).context(context);

  //parent div with id #celestial-map or body
  if (container) container.selectAll(parentElement + " *").remove();
  else container = d3.select(parentElement).append("container");
  canvas.attr("style", "cursor: default!important");
  setClip(projectionSetting.clip);

  geo(cfg);

  async function load() {
    //Background
    setClip(projectionSetting.clip);
    container.append("path").datum(graticule.outline).attr("class", "outline");
    //Celestial planes
    graticule.minorStep([15, 10]);
    for (let key in cfg.lines) {
      switch (key) {
        case "graticule":
          container.append("path").datum(graticule).attr("class", "graticule");
          break;
        case "equatorial":
          container.append("path")
            .datum(d3.geo.circle().angle([90]).origin(poles["equatorial"]))
            .attr("class", key);
          break;
        default:
          break;
      }
    }

    // Load data
    let [milkyWayData, constellationsData, constellationsLinesData, starsData]
      = await Promise.allSettled([
        loadJson(path + "mw.json"),
        loadJson(path + filename("constellations")),
        loadJson(path + filename("constellations", "lines")),
        loadJson(path + cfg.stars.data),
      ]);

    afterLoadJsonFromAllSettled(milkyWayData, (milkyWayData) => {
      let mw_back = getMwbackground(milkyWayData);
      container.selectAll(parentElement + " .mway")
        .data(milkyWayData.features)
        .enter().append("path")
        .attr("class", "mw");
      container.selectAll(parentElement + " .mwaybg")
        .data(mw_back.features)
        .enter().append("path")
        .attr("class", "mwbg");
    });

    afterLoadJsonFromAllSettled(constellationsData, (constellationsData) => {
      container.selectAll(parentElement + " .constnames")
        .data(constellationsData.features)
        .enter().append("text")
        .attr("class", "constname");
    });

    afterLoadJsonFromAllSettled(constellationsLinesData, (constellationsLinesData) => {
      container.selectAll(parentElement + " .lines")
        .data(constellationsLinesData.features)
        .enter().append("path")
        .attr("class", "constline");
    });

    afterLoadJsonFromAllSettled(starsData, (starsData) => {
      container.selectAll(parentElement + " .stars")
        .data(starsData.features)
        .enter().append("path")
        .attr("class", "star");
    });

    if (cfg.lang && cfg.lang != "") apply(Celestial.setLanguage(cfg.lang));
    redraw();
  }

  function apply(config) {
    cfg = settings.set(config);
    redraw();
  }

  function rotate(config) {
    let cFrom = cfg.center,
      rot = mapProjection.rotate(),
      sc = mapProjection.scale(),
      interval = ANIMINTERVAL_R,
      keep = false,
      cTween, zTween, oTween,
      oof = cfg.orientationfixed;

    if (Round(rot[1], 1) === -Round(config.center[1], 1)) keep = true; //keep lat fixed if equal
    cfg = cfg.set(config);
    let d = Round(d3.geo.distance(cFrom, cfg.center), 2);
    let o = d3.geo.distance([cFrom[2], 0], [cfg.center[2], 0]);
    if ((d < ANIMDISTANCE && o < ANIMDISTANCE) || cfg.disableAnimations === true) {
      rotation = getAngles(cfg.center);
      mapProjection.rotate(rotation);
      redraw();
      return 0;
    }
    // Zoom interpolator
    if (sc > scale * ANIMSCALE) zTween = d3.interpolateNumber(sc, scale);
    else zTween = function () { return sc; };
    // Orientation interpolator
    if (o === 0) oTween = function () { return rot[2]; };
    else oTween = interpolateAngle(cFrom[2], cfg.center[2]);
    if (d > 3.14) cfg.center[0] -= 0.01; //180deg turn doesn't work well
    cfg.orientationfixed = false;
    // Rotation interpolator
    if (d === 0) cTween = function () { return cfg.center; };
    else cTween = d3.geo.interpolate(cFrom, cfg.center);
    interval = (d !== 0) ? interval * d : interval * o; // duration scaled by ang. distance
    let step = 1 / getMaxFPS();
    let currentTLimit = step;
    let epsilon = 1e-6;
    d3.select({}).transition().duration(interval).tween("center", function () {
      return function (t) {
        if (t <= currentTLimit || t >= 1 - epsilon) return;
        let c = getAngles(cTween(t));
        c[2] = oTween(t);
        let z = t < 0.5 ? zTween(t) : zTween(1 - t);
        if (keep) c[1] = rot[1];
        mapProjection.scale(z);
        mapProjection.rotate(c);
        currentTLimit = Math.ceil(t / step) * step;
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

    if (cfg.adaptable) adapt = Math.sqrt(mapProjection.scale() / scale);
    if (!adapt) adapt = 1;
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
      container.selectAll(parentElement + " .mw").each(function (d) { setStyle(cfg.mw.style); map(d); context.fill(); });
      // paint mw-outside in background color
      if (cfg.transform !== "supergalactic" && cfg.background.opacity > 0.95)
        container.selectAll(parentElement + " .mwbg").each(function (d) { setStyle(cfg.background); map(d); context.fill(); });
    }

    for (let key in cfg.lines) {
      if (cfg.lines[key].show !== true) continue;
      setStyle(cfg.lines[key]);
      container.selectAll(parentElement + " ." + key).attr("d", map);
      context.stroke();
    }

    if (cfg.constellations.lines) {
      container.selectAll(parentElement + " .constline").each(function (d) {
        setStyleA(d.properties.rank, cfg.constellations.lineStyle);
        map(d);
        context.stroke();
      });
    }

    drawOutline(true);

    if (cfg.constellations.names) {
      container.selectAll(parentElement + " .constname").each(function (d) {
        if (clip(d.geometry.coordinates)) {
          setStyleA(d.properties.rank, cfg.constellations.nameStyle);
          let pt = mapProjection(d.geometry.coordinates);
          context.fillText(constName(d), pt[0], pt[1]);
        }
      });
    }


    if (cfg.stars.show) {
      setStyle(cfg.stars.style);
      container.selectAll(parentElement + " .star").each(function (d) {
        if (clip(d.geometry.coordinates) && d.properties.mag <= cfg.stars.limit) {
          let pt = mapProjection(d.geometry.coordinates),
            r = starSize(d);
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
    container.selectAll(parentElement + " .outline").attr("d", map);
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

  function setClip(setit) {
    if (setit) { mapProjection.clipAngle(90); }
    else { mapProjection.clipAngle(null); }
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
    let r = starbase * adapt * Math.exp(starexp * (mag + 2));
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

  function getProjection(p, ratioOverride) {
    if (!has(projections, p)) return;
    let res = projections[p];
    if (!has(res, "ratio")) res.ratio = 2;  // Default w/h ratio 2:1    
    res.ratio = ratioOverride ? ratioOverride : res.ratio;
    return res;
  }

  // Exported objects and functions for adding data
  scopedContainer = container;
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
    container.selectAll(parentElement + " *").remove();
    load();
  };
  this.apply = function (config) { apply(config); };
  this.rotate = function (config) { if (!config) return cfg.center; return rotate(config); };
  this.color = function (type) {
    if (!type) return "#000";
    return "#000";
  };
  this.starColor = starColor;

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

function afterLoadJsonFromAllSettled(data, callback) {
  return data.status === "rejected" ? console.log(data.error) : callback(data.value);
}

function getMaxFPS() {
  return cfg.fps ? cfg.fps : 40;
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
