/* global d3, Celestial, has, isArray */

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
