// Copyright 2015-2020 Olaf Frohn https://github.com/ofrohn, see LICENSE
(!function () {
    function createCelestialFromConfig(cfg) {
      function createCelestial() {
    

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
    projectionSetting = {
      scale: 360,
      clip: true,
    };

  let scale = projectionSetting.scale * width / 1024,
    starbase = cfg.stars.size,
    starexp = cfg.stars.exponent,
    rotation = getAngles(cfg.center),
    path = cfg.datapath;

  parent.style.height = px(width);

  mapProjection = Celestial.projection().rotate(rotation).translate([width / 2, width / 2]).scale(scale).clipAngle(90);

  let canvas = d3.select(parentElement).selectAll("canvas"),
    culture = (cfg.culture !== "" && cfg.culture !== "iau") ? cfg.culture : "";

  if (canvas[0].length === 0) canvas = d3.select(parentElement).append("canvas");
  //canvas.attr("width", width).attr("height", height);
  canvas.style("width", px(width)).style("height", px(width)).attr("width", width).attr("height", width);
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
        setStyleA(data.properties.rank, cfg.constellations.lineStyle);
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
        context.fillStyle = cfg.stars.style.fill;
        if (clip(d.geometry.coordinates) && d.properties.mag <= cfg.stars.limit) {
          let pt = mapProjection(d.geometry.coordinates), r = starSize(d);
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

  function constName(d) {
    return d.properties[cfg.constellations.namesType];
  }

  function clear() {
    context.clearRect(0, 0, width + margin[0], width + margin[1]);
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
    return { "width": width, "margin": margin, "scale": mapProjection.scale() };
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

//Flipped projection generated on the fly
Celestial.projection = function () {
  const raw = d3.geo.airy.raw(Math.PI / 2);

  const forward = function (λ, φ) {
    let coords = raw(-λ, φ);
    return coords;
  };

  forward.invert = function (x, y) {
    try {
      let coords = raw.invert(x, y);
      coords[0] = coords && -coords[0];
      return coords;
    } catch (e) {
      console.log(e);
    }
  };

  return d3.geo.projection(forward);
};

let halfπ = Math.PI / 2,
  deg2rad = Math.PI / 180;

function getAngles(coords) {
  if (coords === null || coords.length <= 0) return [0, 0, 0];
  if (!coords[2]) coords[2] = 0;
  return [-coords[0], -coords[1], coords[2]];
}

let horizontal = function(dt, pos, loc) {
  //dt: datetime, pos: celestial coordinates [lat,lng], loc: location [lat,lng]  
  let ha = getMST(dt, loc[1]) - pos[0];
  if (ha < 0) ha = ha + 360;
  
  ha  = ha * deg2rad;
  let dec = pos[1] * deg2rad;
  let lat = loc[0] * deg2rad;

  let alt = Math.asin(Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha));
  let az = Math.acos((Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat)));

  if (Math.sin(ha) > 0) az = Math.PI * 2 - az;
  
  return [alt / deg2rad, az / deg2rad, 0];
};

horizontal.inverse = function(dt, hor, loc) {
  
  let alt = hor[0] * deg2rad;
  let az = hor[1] * deg2rad;
  let lat = loc[0] * deg2rad;
   
  let dec = Math.asin((Math.sin(alt) * Math.sin(lat)) + (Math.cos(alt) * Math.cos(lat) * Math.cos(az)));
  let ha = ((Math.sin(alt) - (Math.sin(dec) * Math.sin(lat))) / (Math.cos(dec) * Math.cos(lat))).toFixed(6);
  
  ha = Math.acos(ha);
  ha  = ha / deg2rad;
  
  let ra = getMST(dt, loc[1]) - ha;
  //if (ra < 0) ra = ra + 360;
    
  return [ra, dec / deg2rad, 0];
};

function getMST(dt, lng)
{
    let yr = dt.getUTCFullYear();
    let mo = dt.getUTCMonth() + 1;
    let dy = dt.getUTCDate();
    let h = dt.getUTCHours();
    let m = dt.getUTCMinutes();
    let s = dt.getUTCSeconds();

    if ((mo == 1)||(mo == 2)) {
        yr  = yr - 1;
        mo = mo + 12;
    }

    let a = Math.floor(yr / 100);
    let b = 2 - a + Math.floor(a / 4);
    let c = Math.floor(365.25 * yr);
    let d = Math.floor(30.6001 * (mo + 1));

    // days since J2000.0
    let jd = b + c + d - 730550.5 + dy + (h + m/60.0 + s/3600.0)/24.0;
    
    // julian centuries since J2000.0
    let jt = jd/36525.0;

    // the mean sidereal time in degrees
    let mst = 280.46061837 + 360.98564736629*jd + 0.000387933*jt*jt - jt*jt*jt/38710000 + lng;

    // in degrees modulo 360.0
    if (mst > 0.0) 
        while (mst > 360.0) mst = mst - 360.0;
    else
        while (mst < 0.0)   mst = mst + 360.0;
        
    return mst;
}

Celestial.horizontal = horizontal;
Celestial.ha = function(dt, lng, ra) {
  let ha = getMST(dt, lng) - ra;
  if (ha < 180) ha = ha + 360;
  return ha;
};

let hasCallback = false;

Celestial.addCallback = function(dat) {
  Celestial.callback = dat;
  hasCallback = (dat !== null);
};

Celestial.runCallback = function(dat) {
  hasCallback = false; // avoid recursion
  Celestial.callback();
  hasCallback = true;
};


// Central configuration object
let globalConfig = {};

//Defaults
let settings = { 
  width: 0,     // Default width; height is determined by projection
  projection: "airy",  // Map projection used: airy, aitoff, armadillo, august, azimuthalEqualArea, azimuthalEquidistant, baker, berghaus, boggs, bonne, bromley, collignon, craig, craster, cylindricalEqualArea, cylindricalStereographic, eckert1, eckert2, eckert3, eckert4, eckert5, eckert6, eisenlohr, equirectangular, fahey, foucaut, ginzburg4, ginzburg5, ginzburg6, ginzburg8, ginzburg9, gringorten, hammer, hatano, healpix, hill, homolosine, kavrayskiy7, lagrange, larrivee, laskowski, loximuthal, mercator, miller, mollweide, mtFlatPolarParabolic, mtFlatPolarQuartic, mtFlatPolarSinusoidal, naturalEarth, nellHammer, orthographic, patterson, polyconic, rectangularPolyconic, robinson, sinusoidal, stereographic, times, twoPointEquidistant, vanDerGrinten, vanDerGrinten2, vanDerGrinten3, vanDerGrinten4, wagner4, wagner6, wagner7, wiechel, winkel3
  projectionRatio: null, // Optional override for default projection ratio
  transform: "equatorial", // Coordinate transformation: equatorial (default), ecliptic, galactic, supergalactic
  center: null,       // Initial center coordinates in equatorial transformation [hours, degrees, degrees], 
                      // otherwise [degrees, degrees, degrees], 3rd parameter is orientation, null = default center
  geopos: null,       // optional initial geographic position [lat,lon] in degrees, overrides center
  follow: "zenith",   // on which coordinates to center the map, default: zenith, if location enabled, otherwise center
  orientationfixed: true,  // Keep orientation angle the same as center[2]
  zoomlevel: null,    // initial zoom level 0...zoomextend; 0|null = default, 1 = 100%, 0 < x <= zoomextend
  zoomextend: 10,     // maximum zoom level
  adaptable: true,    // Sizes are increased with higher zoom-levels
  interactive: true,  // Enable zooming and rotation with mousewheel and dragging
  disableAnimations: false, // Disable all animations
  form: false,        // Display settings form
  location: false,    // Display location settings, deprecated, use formFields
  // Set visiblity for each group of fields of the form
  formFields: {"location": true, "general": true, "stars": true, "constellations": true, "lines": true, "other": true, download: false},
  advanced: true,     // Display fewer form fields if false
  daterange: [],      // Calender date range; null: displaydate-+10; [n<100]: displaydate-+n; [yr]: yr-+10; 
                      // [yr, n<100]: [yr-n, yr+n]; [yr0, yr1]
  settimezone: true,  // Automatcally set time zone when geolocation changes
  timezoneid: "AEFXZPQ3FDPF", // Account ID for TimeZoneDB service, please get your own
  controls: true,     // Display zoom controls
  lang: "",           // Global language override for names, any name setting that has the chosen language available
                      // Default: desig or empty string for designations, other languages as used anywhere else
  culture: "",        // Constellation lines, default "iau"
  container: "celestial-map",   // ID of parent element, e.g. div
  datapath: "data/",  // Path/URL to data files, empty = subfolder 'data'
  stars: {
    show: true,    // Show stars
    limit: 6,      // Show only stars brighter than limit magnitude
    colors: true,  // Show stars in spectral colors, if not use fill-style
    style: { fill: "#ffffff", opacity: 1 }, // Default style for stars
    designation: true, // Show star names (Bayer, Flamsteed, Variable star, Gliese or designation, 
                       // i.e. whichever of the previous applies first); may vary with culture setting
    designationType: "desig",  // Which kind of name is displayed as designation (fieldname in starnames.json)
    designationStyle: { fill: "#ddddbb", font: "11px 'Palatino Linotype', Georgia, Times, 'Times Roman', serif", align: "left", baseline: "top" },
    designationLimit: 2.5,  // Show only names for stars brighter than nameLimit
    propername: false,   // Show proper name (if present)
    propernameType: "name", // Field in starnames.json that contains proper name; may vary with culture setting
    propernameStyle: { fill: "#ddddbb", font: "13px 'Palatino Linotype', Georgia, Times, 'Times Roman', serif", align: "right", baseline: "bottom" },
    propernameLimit: 1.5,  // Show proper names for stars brighter than propernameLimit
    size: 7,       // Scale size (radius) of star circle in pixels
    exponent: -0.28, // Scale exponent for star size, larger = more linear
    data: "stars.6.json" // Data source for stellar data
  },
  constellations: {
    show: true,    // Show constellations 
    names: true,   // Show constellation names 
    namesType: "desig",   // What kind of name to show (default 3 letter designations) all options: name, desig, 
                         // lat, en, ar, cn, cz, ee, fi, fr, de, gr, il, it, jp, kr, in, ir, ru, es, tr 
    nameStyle: { fill:"#cccc99", align: "center", baseline: "middle", opacity:0.8, 
                 font: ["14px 'Lucida Sans Unicode', 'DejaVu Sans', Helvetica, Arial, sans-serif",  // Different fonts for brighter &
                        "12px 'Lucida Sans Unicode', 'DejaVu Sans', Helvetica, Arial, sans-serif",  // darker constellations
                        "11px 'Lucida Sans Unicode', 'DejaVu Sans', Helvetica, Arial, sans-serif"]},
    lines: true,   // Show constellation lines 
    lineStyle: { stroke: "#cccccc", width: 1.5, opacity: 0.6 },
    bounds: false,  // Show constellation boundaries 
    boundStyle: { stroke: "#ccff00", width: 1.0, opacity: 0.8, dash: [4,4] }
  },
  mw: {
    show: true,    // Show Milky Way as filled polygons 
    style: { fill: "#ffffff", opacity: "0.15" } // style for each MW-layer (5 on top of each other)
  },
  lines: {
    graticule: { show: true, stroke: "#cccccc", width: 0.6, opacity: 0.8,      // Show graticule lines 
			// grid values: "outline", "center", or [lat,...] specific position
      lon: {pos: [], fill: "#eee", font: "10px 'Lucida Sans Unicode', Helvetica, Arial, sans-serif"}, 
			// grid values: "outline", "center", or [lon,...] specific position
		  lat: {pos: [], fill: "#eee", font: "10px 'Lucida Sans Unicode', Helvetica, Arial, sans-serif"}},
    equatorial: { show: true, stroke: "#aaaaaa", width: 1.3, opacity: 0.7 },    // Show equatorial plane 
   //mars: { show: false, stroke:"#cc0000", width:1.3, opacity:.7 }
  }, // Background style
  background: { 
    fill: "#000000", 
    opacity: 1, 
    stroke: "#000000", // Outline
    width: 1.5 
  }, 
  horizon: {  //Show horizon marker, if geo-position and date-time is set
    show: false, 
    stroke: "#cccccc", // Line
    width: 1.0, 
    fill: "#000000", // Area below horizon
    opacity: 0.4
  },  
  daylight: {  //Show approximate state of sky at selected time
    show: false
  },
  set: function(cfg) {  // Override defaults with values of cfg
    let prop, key, config = {}, res = {};
    if (Object.entries(globalConfig).length === 0) Object.assign(config, this);
    else Object.assign(config, globalConfig);
    if (!cfg) return config; 
    for (prop in config) {
      if (!has(config, prop)) continue; 
      //if (typeof(config[prop]) === 'function'); 
      if (!has(cfg, prop) || cfg[prop] === null) { 
        res[prop] = config[prop]; 
      } else if (config[prop] === null || config[prop].constructor != Object ) {
        res[prop] = cfg[prop];
      } else {
        res[prop] = {};
        for (key in config[prop]) {
          if (has(cfg[prop], key)) {
            res[prop][key] = cfg[prop][key];
          } else {
            res[prop][key] = config[prop][key];
          }            
        }
      }
    }
    res.constellations.nameStyle.font = arrayfy(res.constellations.nameStyle.font);
    res.constellations.nameStyle.opacity = arrayfy(res.constellations.nameStyle.opacity);
    res.constellations.nameStyle.fill = arrayfy(res.constellations.nameStyle.fill);
    res.constellations.lineStyle.width = arrayfy(res.constellations.lineStyle.width);
    res.constellations.lineStyle.opacity = arrayfy(res.constellations.lineStyle.opacity);
    res.constellations.lineStyle.stroke = arrayfy(res.constellations.lineStyle.stroke);
    
    Object.assign(globalConfig, res);
    return res;
  },
  applyDefaults: function(cfg) {
    let res = {};
    Object.assign(res, globalConfig);
    // Nothing works without these
    res.stars.size = res.stars.size || 7;  
    res.stars.exponent = res.stars.exponent || -0.28;
    if (!res.center || res.center.length <= 0) res.center = [0,0,0];
    res.datapath = res.datapath || "";
    res.datapath = res.datapath.replace(/([^\/]$)/, "$1\/");
    if (!res.transform || res.transform === "") res.transform = "equatorial";
    // If no recognized language/culture settings, assume defaults
    //if (!res.lang || res.lang.search(/^de|es$/) === -1) res.lang = "name";
    //Set all poss. names to cfg.lang if not english
    if (!res.culture || res.culture.search(/^cn$/) === -1) res.culture = "iau";

    if (cfg) {
      if (has(cfg, "constellations")) {
        // names, desig -> namesType
        if (has(cfg.constellations, "show") && cfg.constellations.show === true) res.constellations.names = true;
        //if (has(cfg.constellations, "names") && cfg.constellations.names === true) res.constellations.namesType = "name";
        if (has(cfg.constellations, "desig") && cfg.constellations.desig === true) res.constellations.namesType = "desig";
        if (res.constellations.namesType === "latin") res.constellations.namesType = "la";
        if (res.constellations.namesType === "iau") res.constellations.namesType = "name";
        if (has(cfg.constellations, "namestyle")) Object.assign(res.constellations.nameStyle, cfg.constellations.namestyle);
        if (has(cfg.constellations, "linestyle")) Object.assign(res.constellations.lineStyle, cfg.constellations.linestyle);
      }
    }
    //Assign default name types if none given
    if (!res.constellations.namesType || res.constellations.namesType === "") res.constellations.namesType = "desig";
    if (!has(formats.constellations[res.culture].names, res.constellations.namesType)) res.constellations.namesType = "name";
    //Expand all parameters that can be arrays into arrays, no need to test it later
    res.constellations.nameStyle.font = arrayfy(res.constellations.nameStyle.font);
    res.constellations.nameStyle.opacity = arrayfy(res.constellations.nameStyle.opacity);
    res.constellations.nameStyle.fill = arrayfy(res.constellations.nameStyle.fill);
    res.constellations.lineStyle.width = arrayfy(res.constellations.lineStyle.width);
    res.constellations.lineStyle.opacity = arrayfy(res.constellations.lineStyle.opacity);
    res.constellations.lineStyle.stroke = arrayfy(res.constellations.lineStyle.stroke);

    Object.assign(globalConfig, res);
    return res; 
  }
};

function arrayfy(o) {
  if (!isArray(o)) return [o, o, o];  //It saves some work later, OK?
  if (o.length >= 3) return o;
  if (o.length === 1) return [o[0], o[0], o[0]];
  if (o.length === 2) return [o[0], o[1], o[1]];
}

Celestial.settings = function () { return settings; };

let formats = {
  "constellations": {
    "iau": {
      "names": {
        "desig": "Designation",
        "name": "IAU Name",
        "ar": "Arabic", 
        "zh": "Chinese",
        "cz": "Czech", 
        "en": "English",
        "ee": "Estonian", 
        "fi": "Finnish", 
        "fr": "French", 
        "de": "German",
        "el": "Greek", 
        "he": "Hebrew",
        "hi": "Hindi", 
        "it": "Italian", 
        "ja": "Japanese", 
        "sw": "Kiswahili",
        "ko": "Korean", 
        "la": "Latin",
        "fa": "Persian", 
        "ru": "Russian", 
        "es": "Spanish",
        "tr": "Turkish",
      }
    },
    "cn": {
      "names": {
        "name": "Proper name",
        "en": "English",
        "pinyin": "Pinyin",
      }
    }             
  },
};

const px = (n) => `${n}px`;
const Round = (x, dg) => Math.round(Math.pow(10, dg) * x) / Math.pow(10, dg);

function has(o, key) { return o !== null && hasOwnProperty.call(o, key); }
function isNumber(n) { return n !== null && !isNaN(parseFloat(n)) && isFinite(n); }
function isArray(o) { return o !== null && Object.prototype.toString.call(o) === "[object Array]"; }


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

  Celestial.skyview = (loc, newDate, tz) => {
    if (isValidLocation(loc) && isValidTimezone(tz)) {
      geopos = loc.slice();
      timeZone = tz;
      date.setTime(newDate.valueOf());
      go();
    }
  }

  Celestial.zenith = () => zenith;

  Object.defineProperty(Celestial, 'tz', {
    get: function () {
      return timeZone;
    }
  });
}
// Copyright 2014, Jason Davies, http://www.jasondavies.com
// See LICENSE.txt for details.
(function() {

var radians = Math.PI / 180,
    degrees = 180 / Math.PI;

// TODO make incremental rotate optional

d3.geo.zoom = function() {
  var projection,
      duration;

  var zoomPoint,
      zooming = 0,
      event = d3_eventDispatch(zoom, "zoomstart", "zoom", "zoomend"),
      zoom = d3.behavior.zoom()
        .on("zoomstart", function() {
          var mouse0 = d3.mouse(this),
              rotate = quaternionFromEuler(projection.rotate()),
              point = position(projection, mouse0);
          if (point) zoomPoint = point;

          zoomOn.call(zoom, "zoom", function() {
                projection.scale(view.k = d3.event.scale);
                var mouse1 = d3.mouse(this),
                    between = rotateBetween(zoomPoint, position(projection, mouse1));
                projection.rotate(view.r = eulerFromQuaternion(rotate = between
                    ? multiply(rotate, between)
                    : multiply(bank(projection, mouse0, mouse1), rotate)));
                mouse0 = mouse1;
                zoomed(event.of(this, arguments));
              });
          zoomstarted(event.of(this, arguments));
        })
        .on("zoomend", function() {
          zoomOn.call(zoom, "zoom", null);
          zoomended(event.of(this, arguments));
        }),
      zoomOn = zoom.on,
      view = {r: [0, 0, 0], k: 1};

  zoom.rotateTo = function(location) {
    var between = rotateBetween(cartesian(location), cartesian([-view.r[0], -view.r[1]]));
    return eulerFromQuaternion(multiply(quaternionFromEuler(view.r), between));
  };

  zoom.projection = function(_) {
    if (!arguments.length) return projection;
    projection = _;
    view = {r: projection.rotate(), k: projection.scale()};
    return zoom.scale(view.k);
  };

  zoom.duration = function(_) {
    return arguments.length ? (duration = _, zoom) : duration;
  };

  zoom.event = function(g) {
    g.each(function() {
      var g = d3.select(this),
          dispatch = event.of(this, arguments),
          view1 = view,
          transition = d3.transition(g);
     
      if (transition !== g) {
        transition
            .each("start.zoom", function() {
              if (this.__chart__) { // pre-transition state
                view = this.__chart__;
                if (!view.hasOwnProperty("r")) view.r = projection.rotate();
              } 
              projection.rotate(view.r).scale(view.k);
              zoomstarted(dispatch);
            })
            .tween("zoom:zoom", function() {
              var width = zoom.size()[0],
                  i = interpolateBetween(quaternionFromEuler(view.r), quaternionFromEuler(view1.r)),
                  d = d3.geo.distance(view.r, view1.r),
                  smooth = d3.interpolateZoom([0, 0, width / view.k], [d, 0, width / view1.k]);
              if (duration) transition.duration(duration(smooth.duration * .001)); // see https://github.com/mbostock/d3/pull/2045
              return function(t) {
                var uw = smooth(t);
                this.__chart__ = view = {r: eulerFromQuaternion(i(uw[0] / d)), k: width / uw[2]};
                projection.rotate(view.r).scale(view.k);
                zoom.scale(view.k);
                zoomed(dispatch);
              };
            })
            .each("end.zoom", function() {
              zoomended(dispatch);
            });
        try { // see https://github.com/mbostock/d3/pull/1983
          transition
              .each("interrupt.zoom", function() {
                zoomended(dispatch);
              });
        } catch (e) { console.log(e); }
      } else {
        this.__chart__ = view;
        zoomstarted(dispatch);
        zoomed(dispatch);
        zoomended(dispatch);
      }
    });
  };

  function zoomstarted(dispatch) {
    if (!zooming++) dispatch({type: "zoomstart"});
  }

  function zoomed(dispatch) {
    dispatch({type: "zoom"});
  }

  function zoomended(dispatch) {
    if (!--zooming) dispatch({type: "zoomend"});
  }

  return d3.rebind(zoom, event, "on");
};

function bank(projection, p0, p1) {
  var t = projection.translate(),
      angle = Math.atan2(p0[1] - t[1], p0[0] - t[0]) - Math.atan2(p1[1] - t[1], p1[0] - t[0]);
  return [Math.cos(angle / 2), 0, 0, Math.sin(angle / 2)];
}

function position(projection, point) {
  var spherical = projection.invert(point);
  return spherical && isFinite(spherical[0]) && isFinite(spherical[1]) && cartesian(spherical);
}

function quaternionFromEuler(euler) {
  var λ = .5 * euler[0] * radians,
      φ = .5 * euler[1] * radians,
      γ = .5 * euler[2] * radians,
      sinλ = Math.sin(λ), cosλ = Math.cos(λ),
      sinφ = Math.sin(φ), cosφ = Math.cos(φ),
      sinγ = Math.sin(γ), cosγ = Math.cos(γ);
  return [
    cosλ * cosφ * cosγ + sinλ * sinφ * sinγ,
    sinλ * cosφ * cosγ - cosλ * sinφ * sinγ,
    cosλ * sinφ * cosγ + sinλ * cosφ * sinγ,
    cosλ * cosφ * sinγ - sinλ * sinφ * cosγ
  ];
}

function multiply(a, b) {
  var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
      b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  return [
    a0 * b0 - a1 * b1 - a2 * b2 - a3 * b3,
    a0 * b1 + a1 * b0 + a2 * b3 - a3 * b2,
    a0 * b2 - a1 * b3 + a2 * b0 + a3 * b1,
    a0 * b3 + a1 * b2 - a2 * b1 + a3 * b0
  ];
}

function rotateBetween(a, b) {
  if (!a || !b) return;
  var axis = cross(a, b),
      norm = Math.sqrt(dot(axis, axis)),
      halfγ = .5 * Math.acos(Math.max(-1, Math.min(1, dot(a, b)))),
      k = Math.sin(halfγ) / norm;
  return norm && [Math.cos(halfγ), axis[2] * k, -axis[1] * k, axis[0] * k];
}

// Interpolate between two quaternions (slerp).
function interpolateBetween(a, b) {
  var d = Math.max(-1, Math.min(1, dot(a, b))),
      s = d < 0 ? -1 : 1,
      θ = Math.acos(s * d),
      sinθ = Math.sin(θ);
  return sinθ ? function(t) {
    var A = s * Math.sin((1 - t) * θ) / sinθ,
        B = Math.sin(t * θ) / sinθ;
    return [
      a[0] * A + b[0] * B,
      a[1] * A + b[1] * B,
      a[2] * A + b[2] * B,
      a[3] * A + b[3] * B
    ];
  } : function() { return a; };
}

function eulerFromQuaternion(q) {
  return [
    Math.atan2(2 * (q[0] * q[1] + q[2] * q[3]), 1 - 2 * (q[1] * q[1] + q[2] * q[2])) * degrees,
    Math.asin(Math.max(-1, Math.min(1, 2 * (q[0] * q[2] - q[3] * q[1])))) * degrees,
    Math.atan2(2 * (q[0] * q[3] + q[1] * q[2]), 1 - 2 * (q[2] * q[2] + q[3] * q[3])) * degrees
  ];
}

function cartesian(spherical) {
  var λ = spherical[0] * radians,
      φ = spherical[1] * radians,
      cosφ = Math.cos(φ);
  return [
    cosφ * Math.cos(λ),
    cosφ * Math.sin(λ),
    Math.sin(φ)
  ];
}

function dot(a, b) {
  for (var i = 0, n = a.length, s = 0; i < n; ++i) s += a[i] * b[i];
  return s;
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

// Like d3.dispatch, but for custom events abstracting native UI events. These
// events have a target component (such as a brush), a target element (such as
// the svg:g element containing the brush) and the standard arguments `d` (the
// target element's data) and `i` (the selection index of the target element).
function d3_eventDispatch(target) {
  var i = 0,
      n = arguments.length,
      argumentz = [];

  while (++i < n) argumentz.push(arguments[i]);

  var dispatch = d3.dispatch.apply(null, argumentz);

  // Creates a dispatch context for the specified `thiz` (typically, the target
  // DOM element that received the source event) and `argumentz` (typically, the
  // data `d` and index `i` of the target element). The returned function can be
  // used to dispatch an event to any registered listeners; the function takes a
  // single argument as input, being the event to dispatch. The event must have
  // a "type" attribute which corresponds to a type registered in the
  // constructor. This context will automatically populate the "sourceEvent" and
  // "target" attributes of the event, as well as setting the `d3.event` global
  // for the duration of the notification.
  dispatch.of = function(thiz, argumentz) {
    return function(e1) {
      try {
        var e0 =
        e1.sourceEvent = d3.event;
        e1.target = target;
        d3.event = e1;
        dispatch[e1.type].apply(thiz, argumentz);
      } finally {
        d3.event = e0;
      }
    };
  };

  return dispatch;
}

})();
// https://d3js.org/d3-queue/ Version 3.0.7. Copyright 2017 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

var slice = [].slice;

var noabort = {};

function Queue(size) {
  this._size = size;
  this._call =
  this._error = null;
  this._tasks = [];
  this._data = [];
  this._waiting =
  this._active =
  this._ended =
  this._start = 0; // inside a synchronous task callback?
}

Queue.prototype = queue.prototype = {
  constructor: Queue,
  defer: function(callback) {
    if (typeof callback !== "function") throw new Error("invalid callback");
    if (this._call) throw new Error("defer after await");
    if (this._error != null) return this;
    var t = slice.call(arguments, 1);
    t.push(callback);
    ++this._waiting, this._tasks.push(t);
    poke(this);
    return this;
  },
  abort: function() {
    if (this._error == null) abort(this, new Error("abort"));
    return this;
  },
  await: function(callback) {
    if (typeof callback !== "function") throw new Error("invalid callback");
    if (this._call) throw new Error("multiple await");
    this._call = function(error, results) { callback.apply(null, [error].concat(results)); };
    maybeNotify(this);
    return this;
  },
  awaitAll: function(callback) {
    if (typeof callback !== "function") throw new Error("invalid callback");
    if (this._call) throw new Error("multiple await");
    this._call = callback;
    maybeNotify(this);
    return this;
  }
};

function poke(q) {
  if (!q._start) {
    try { start(q); } // let the current task complete
    catch (e) {
      if (q._tasks[q._ended + q._active - 1]) abort(q, e); // task errored synchronously
      else if (!q._data) throw e; // await callback errored synchronously
    }
  }
}

function start(q) {
  while (q._start = q._waiting && q._active < q._size) {
    var i = q._ended + q._active,
        t = q._tasks[i],
        j = t.length - 1,
        c = t[j];
    t[j] = end(q, i);
    --q._waiting, ++q._active;
    t = c.apply(null, t);
    if (!q._tasks[i]) continue; // task finished synchronously
    q._tasks[i] = t || noabort;
  }
}

function end(q, i) {
  return function(e, r) {
    if (!q._tasks[i]) return; // ignore multiple callbacks
    --q._active, ++q._ended;
    q._tasks[i] = null;
    if (q._error != null) return; // ignore secondary errors
    if (e != null) {
      abort(q, e);
    } else {
      q._data[i] = r;
      if (q._waiting) poke(q);
      else maybeNotify(q);
    }
  };
}

function abort(q, e) {
  var i = q._tasks.length, t;
  q._error = e; // ignore active callbacks
  q._data = undefined; // allow gc
  q._waiting = NaN; // prevent starting

  while (--i >= 0) {
    if (t = q._tasks[i]) {
      q._tasks[i] = null;
      if (t.abort) {
        try { t.abort(); }
        catch (e) { /* ignore */ }
      }
    }
  }

  q._active = NaN; // allow notification
  maybeNotify(q);
}

function maybeNotify(q) {
  if (!q._active && q._call) {
    var d = q._data;
    q._data = undefined; // allow gc
    q._call(q._error, d);
  }
}

function queue(concurrency) {
  if (concurrency == null) concurrency = Infinity;
  else if (!((concurrency = +concurrency) >= 1)) throw new Error("invalid concurrency");
  return new Queue(concurrency);
}

exports.queue = queue;
d3.queue = queue;

Object.defineProperty(exports, '__esModule', { value: true });

})));
   return Celestial;
  };
  let Celestial = createCelestial();
  Celestial.display(cfg);
  return Celestial;
}
this.createCelestialFromConfig = createCelestialFromConfig;
}());