// Copyright 2015-2020 Olaf Frohn https://github.com/ofrohn, see LICENSE
(!function () {
    function createCelestialFromConfig(cfg) {
      function createCelestial() {
    
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
  ANIMINTERVAL_R = 2000, // Rotation duration scale in ms
  ANIMINTERVAL_P = 2500, // Projection duration in ms
  ANIMINTERVAL_Z = 1500, // Zoom duration scale in ms
  zoomextent = 10,       // Default maximum extent of zoom (max/min)
  zoomlevel = 1;         // Default zoom level, 1 = 100%

let cfg, mapProjection, parentElement, zoom, map, circle, daylight, starnames = {}, dsonames = {};

// Show it all, with the given config, otherwise with default settings
Celestial.display = function (config) {
  let animationID,
    container = scopedContainer,
    animations = [],
    current = 0,
    repeat = false;

  //Mash config with default settings, todo: if globalConfig exists, make another one
  cfg = settings.set(config).applyDefaults(config);
  if (isNumber(cfg.zoomextend)) zoomextent = cfg.zoomextend;
  if (isNumber(cfg.zoomlevel)) zoomlevel = cfg.zoomlevel;
  //if (cfg.disableAnimations) ANIMDISTANCE = Infinity;

  let parent = document.getElementById(cfg.container);
  if (parent) {
    parentElement = "#" + cfg.container;
    let st = window.getComputedStyle(parent, null);
    if (!parseInt(st.width) && !cfg.width) parent.style.width = px(parent.parentNode.clientWidth);
  } else {
    parentElement = "body";
    parent = null;
  }

  let margin = [16, 16],
    width = getWidth(),
    canvaswidth = isNumber(cfg.background.width) ? width + cfg.background.width : width,
    pixelRatio = window.devicePixelRatio || 1,
    projectionSetting = getProjection(cfg.projection, cfg.projectionRatio);

  if (!projectionSetting) return;

  if (cfg.lines.graticule.lat && cfg.lines.graticule.lat.pos[0] === "outline") projectionSetting.scale -= 2;

  let ratio = projectionSetting.ratio,
    height = Math.round(width / ratio),
    canvasheight = Math.round(canvaswidth / ratio),
    scale = projectionSetting.scale * width / 1024,
    starbase = cfg.stars.size,
    dsobase = cfg.dsos.size || starbase,
    starexp = cfg.stars.exponent,
    dsoexp = cfg.dsos.exponent || starexp, //Object size base & exponent
    adapt = 1,
    rotation = getAngles(cfg.center),
    path = cfg.datapath;

  if (parentElement !== "body") parent.style.height = px(canvasheight);

  mapProjection = Celestial.projection(cfg.projection).rotate(rotation).translate([canvaswidth / 2, canvasheight / 2]).scale(scale * zoomlevel);

  zoom = d3.geo.zoom().projection(mapProjection).center([canvaswidth / 2, canvasheight / 2]).scaleExtent([scale, scale * zoomextent]).on("zoom.redraw", redraw);
  // Set initial zoom level
  scale *= zoomlevel;

  let canvas = d3.select(parentElement).selectAll("canvas"),
    culture = (cfg.culture !== "" && cfg.culture !== "iau") ? cfg.culture : "";

  if (canvas[0].length === 0) canvas = d3.select(parentElement).append("canvas");
  //canvas.attr("width", width).attr("height", height);
  canvas.style("width", px(canvaswidth)).style("height", px(canvasheight)).attr("width", canvaswidth * pixelRatio).attr("height", canvasheight * pixelRatio);
  let context = canvas.node().getContext("2d");
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  let graticule = d3.geo.graticule().minorStep([15, 10]);

  map = d3.geo.path().projection(mapProjection).context(context);

  //parent div with id #celestial-map or body
  if (container) container.selectAll(parentElement + " *").remove();
  else container = d3.select(parentElement).append("container");

  if (cfg.interactive) {
    canvas.call(zoom);
    d3.select(parentElement).on('dblclick', function () { zoomBy(1.5625); return false; });
  } else {
    canvas.attr("style", "cursor: default!important");
  }

  setClip(projectionSetting.clip);

  d3.select(window).on('resize', resize);

  if (cfg.interactive === true && cfg.controls === true && $("celestial-zoomin") === null) {
    d3.select(parentElement).append("input").attr("type", "button").attr("id", "celestial-zoomin").attr("value", "\u002b").on("click", function () { zoomBy(1.25); return false; });
    d3.select(parentElement).append("input").attr("type", "button").attr("id", "celestial-zoomout").attr("value", "\u2212").on("click", function () { zoomBy(0.8); return false; });
  }

  circle = d3.geo.circle().angle([90]);
  daylight = d3.geo.circle().angle([179.9]);

  // form(cfg);

  if ($("error") === null) d3.select("body").append("div").attr("id", "error");

  if ($("loc") === null) geo(cfg);
  else if (cfg.location === true && cfg.follow === "zenith") rotate({ center: Celestial.zenith() });

  if (cfg.location === true || cfg.formFields.location === true) {
    d3.select(parentElement + " #location").style("display", "inline-block");
  }

  async function load() {
    //Background
    setClip(projectionSetting.clip);
    container.append("path").datum(graticule.outline).attr("class", "outline");
    container.append("path").datum(circle).attr("class", "horizon");
    container.append("path").datum(daylight).attr("class", "daylight");
    //Celestial planes
    if (cfg.transform === "equatorial") graticule.minorStep([15, 10]);
    else graticule.minorStep([10, 10]);
    for (let key in cfg.lines) {
      if (!has(cfg.lines, key)) continue;
      if (key === "graticule") {
        container.append("path").datum(graticule).attr("class", "graticule");
        if (has(cfg.lines.graticule, "lon") && cfg.lines.graticule.lon.pos.length > 0)
          container.selectAll(parentElement + " .gridvalues_lon")
            .data(getGridValues("lon", cfg.lines.graticule.lon.pos))
            .enter().append("path")
            .attr("class", "graticule_lon");
        if (has(cfg.lines.graticule, "lat") && cfg.lines.graticule.lat.pos.length > 0)
          container.selectAll(parentElement + " .gridvalues_lat")
            .data(getGridValues("lat", cfg.lines.graticule.lat.pos))
            .enter().append("path")
            .attr("class", "graticule_lat");
      } else {
        container.append("path")
          .datum(d3.geo.circle().angle([90]).origin(transformDeg(poles[key], euler[cfg.transform])))
          .attr("class", key);
      }
    }

    // Load data
    let [milkyWayData, constellationsData, constellationsLinesData, starsData, starnamesData, planetsData]
      = await Promise.allSettled([
        loadJson(path + "mw.json"),
        loadJson(path + filename("constellations")),
        loadJson(path + filename("constellations", "lines")),
        loadJson(path + cfg.stars.data),
        loadJson(path + filename("starnames")),
        loadJson(path + filename("planets"))
      ]);

    afterLoadJsonFromAllSettled(milkyWayData, (milkyWayData) => {
      let mw = getData(milkyWayData, cfg.transform);
      let mw_back = getMwbackground(mw);
      container.selectAll(parentElement + " .mway")
        .data(mw.features)
        .enter().append("path")
        .attr("class", "mw");
      container.selectAll(parentElement + " .mwaybg")
        .data(mw_back.features)
        .enter().append("path")
        .attr("class", "mwbg");
    });

    afterLoadJsonFromAllSettled(constellationsData, (constellationsData) => {
      let con = getData(constellationsData, cfg.transform);
      container.selectAll(parentElement + " .constnames")
        .data(con.features)
        .enter().append("text")
        .attr("class", "constname");

      Celestial.constellations = getConstellationList(con);
    });

    afterLoadJsonFromAllSettled(constellationsLinesData, (constellationsLinesData) => {
      let conl = getData(constellationsLinesData, cfg.transform);
      container.selectAll(parentElement + " .lines")
        .data(conl.features)
        .enter().append("path")
        .attr("class", "constline");

    });

    afterLoadJsonFromAllSettled(starsData, (starsData) => {
      let st = getData(starsData, cfg.transform);

      container.selectAll(parentElement + " .stars")
        .data(st.features)
        .enter().append("path")
        .attr("class", "star");
    });

    afterLoadJsonFromAllSettled(starnamesData, (starnamesData) => {
      Object.assign(starnames, starnamesData);
    });

    afterLoadJsonFromAllSettled(planetsData, (planetsData) => {
      let pl = getPlanets(planetsData, cfg.transform);

      container.selectAll(parentElement + " .planets")
        .data(pl)
        .enter().append("path")
        .attr("class", "planet");
    });

    if (Celestial.data.length > 0) {
      Celestial.data.forEach(function (d) {
        if (has(d, "file")) d3.json(d.file, d.callback);
        else setTimeout(d.callback, 0);
      }, this);
    }

    if (cfg.lang && cfg.lang != "") apply(Celestial.setLanguage(cfg.lang));
    redraw();
  }

  // Zoom by factor; >1 larger <1 smaller 
  function zoomBy(factor) {
    if (!factor || factor === 1) return;
    let sc0 = mapProjection.scale(),
      sc1 = sc0 * factor,
      ext = zoom.scaleExtent(),
      interval = ANIMINTERVAL_Z * Math.sqrt(Math.abs(1 - factor));

    if (sc1 < ext[0]) sc1 = ext[0];
    if (sc1 > ext[1]) sc1 = ext[1];
    if (cfg.disableAnimations === true) {
      mapProjection.scale(sc1);
      zoom.scale(sc1);
      redraw();
      return 0;
    }
    let zTween = d3.interpolateNumber(sc0, sc1);
    d3.select({}).transition().duration(interval).tween("scale", function () {
      return function (t) {
        let z = zTween(t);
        mapProjection.scale(z);
        redraw();
      };
    }).transition().duration(0).tween("scale", function () {
      zoom.scale(sc1);
      redraw();
    });
    return interval;
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
    d3.select({}).transition().duration(interval).tween("center", function () {
      return function (t) {
        let c = getAngles(cTween(t));
        c[2] = oTween(t);
        let z = t < 0.5 ? zTween(t) : zTween(1 - t);
        if (keep) c[1] = rot[1];
        mapProjection.scale(z);
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

  function resize(set) {
    width = getWidth();
    if (cfg.width === width && !set) return;
    height = width / ratio;
    canvaswidth = isNumber(cfg.background.width) ? width + cfg.background.width : width;
    canvasheight = Math.round(canvaswidth / ratio);

    scale = projectionSetting.scale * width / 1024;
    //canvas.attr("width", width).attr("height", height);
    canvas.style("width", px(canvaswidth)).style("height", px(canvasheight)).attr("width", canvaswidth * pixelRatio).attr("height", canvasheight * pixelRatio);
    zoom.scaleExtent([scale, scale * zoomextent]).scale(scale * zoomlevel);
    mapProjection.translate([canvaswidth / 2, canvasheight / 2]).scale(scale * zoomlevel);
    if (parent) parent.style.height = px(height);
    scale *= zoomlevel;
    redraw();
  }

  function reproject(config) {
    let prj = getProjection(config.projection, config.projectionRatio);
    if (!prj) return;

    let rot = mapProjection.rotate(), ctr = mapProjection.center(), sc = mapProjection.scale(), ext = zoom.scaleExtent(), clip = [],
      prjFrom = Celestial.projection(cfg.projection).center(ctr).translate([canvaswidth / 2, canvasheight / 2]).scale([ext[0]]),
      interval = ANIMINTERVAL_P,
      delay = 0, clipTween = null,
      rTween = d3.interpolateNumber(ratio, prj.ratio);

    if (projectionSetting.clip != prj.clip || cfg.disableAnimations === true) {
      interval = 0; // Different clip = no transition
    }
    /*if (projectionSetting.clip !== prj.clip) {
      clipTween = d3.interpolateNumber(projectionSetting.clip ? 90 : 180, prj.clip ? 90 : 180); // Clipangle from - to
    } else*/ setClip(prj.clip);

    let prjTo = Celestial.projection(config.projection).center(ctr).translate([canvaswidth / 2, canvaswidth / prj.ratio / 2]).scale([prj.scale * width / 1024]);
    let bAdapt = cfg.adaptable;

    if (sc > ext[0]) {
      delay = zoomBy(0.1);
      setTimeout(reproject, delay, config);
      return delay + interval;
    }

    if (cfg.location || cfg.formFields.location) {
      fldEnable("horizon-show", prj.clip);
      fldEnable("daylight-show", !prj.clip);
    }

    mapProjection = projectionTween(prjFrom, prjTo);
    cfg.adaptable = false;

    d3.select({}).transition().duration(interval).tween("projection", function () {
      return function (_) {
        mapProjection.alpha(_).rotate(rot);
        map.projection(mapProjection);
        /*if (clipTween) mapProjection.clipAngle(clipTween(_));
        else*/setClip(prj.clip);
        ratio = rTween(_);
        height = width / ratio;
        //canvas.attr("width", width).attr("height", height);
        canvas.style("width", px(canvaswidth)).style("height", px(canvasheight)).attr("width", canvaswidth * pixelRatio).attr("height", canvasheight * pixelRatio);
        if (parent) parent.style.height = px(canvasheight);
        redraw();
      };
    }).transition().duration(0).tween("projection", function () {
      projectionSetting = prj;
      ratio = projectionSetting.ratio;
      height = width / projectionSetting.ratio;
      canvasheight = isNumber(cfg.background.width) ? height + cfg.background.width : height;
      scale = projectionSetting.scale * width / 1024;
      //canvas.attr("width", width).attr("height", height);
      canvas.style("width", px(canvaswidth)).style("height", px(canvasheight)).attr("width", canvaswidth * pixelRatio).attr("height", canvasheight * pixelRatio);
      if (parent) parent.style.height = px(canvasheight);
      cfg.projection = config.projection;
      mapProjection = Celestial.projection(config.projection).rotate(rot).translate([canvaswidth / 2, canvasheight / 2]).scale(scale * zoomlevel);
      map.projection(mapProjection);
      setClip(projectionSetting.clip);
      zoom.projection(mapProjection).scaleExtent([scale, scale * zoomextent]).scale(scale * zoomlevel);
      cfg.adaptable = bAdapt;
      scale *= zoomlevel;
      redraw();
    });
    return interval;
  }


  function redraw() {
    let rot = mapProjection.rotate();

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (cfg.adaptable) adapt = Math.sqrt(mapProjection.scale() / scale);
    if (!adapt) adapt = 1;
    starbase = cfg.stars.size;
    starexp = cfg.stars.exponent;
    dsobase = cfg.dsos.size || starbase;
    dsoexp = cfg.dsos.exponent;

    if (cfg.orientationfixed && cfg.center.length > 2) {
      rot[2] = cfg.center[2];
      mapProjection.rotate(rot);
    }
    cfg.center = [-rot[0], -rot[1], rot[2]];

    setCenter(cfg.center, cfg.transform);
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
      if (!has(cfg.lines, key)) continue;
      if (cfg.lines[key].show !== true) continue;
      setStyle(cfg.lines[key]);
      container.selectAll(parentElement + " ." + key).attr("d", map);
      context.stroke();
    }

    if (has(cfg.lines.graticule, "lon")) {
      setTextStyle(cfg.lines.graticule.lon);
      container.selectAll(parentElement + " .graticule_lon").each(function (d, i) {
        if (clip(d.geometry.coordinates)) {
          let pt = mapProjection(d.geometry.coordinates);
          gridOrientation(pt, d.properties.orientation);
          context.fillText(d.properties.value, pt[0], pt[1]);
        }
      });
    }

    if (has(cfg.lines.graticule, "lat")) {
      setTextStyle(cfg.lines.graticule.lat);
      container.selectAll(parentElement + " .graticule_lat").each(function (d, i) {
        if (clip(d.geometry.coordinates)) {
          let pt = mapProjection(d.geometry.coordinates);
          gridOrientation(pt, d.properties.orientation);
          context.fillText(d.properties.value, pt[0], pt[1]);
        }
      });
    }

    if (cfg.constellations.bounds) {
      container.selectAll(parentElement + " .boundaryline").each(function (d) {
        setStyle(cfg.constellations.boundStyle);
        if (Celestial.constellation) {
          let re = new RegExp("\\b" + Celestial.constellation + "\\b");
          if (d.ids.search(re) !== -1) {
            context.lineWidth *= 1.5;
            context.globalAlpha = 1;
            context.setLineDash([]);
          }
        }
        map(d);
        context.stroke();
      });
      context.setLineDash([]);
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
      //setTextStyle(cfg.constellations.nameStyle);
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
          if (cfg.stars.designation && d.properties.mag <= cfg.stars.designationLimit * adapt) {
            setTextStyle(cfg.stars.designationStyle);
            context.fillText(starDesignation(d.id), pt[0] + r, pt[1]);
          }
          if (cfg.stars.propername && d.properties.mag <= cfg.stars.propernameLimit * adapt) {
            setTextStyle(cfg.stars.propernameStyle);
            context.fillText(starPropername(d.id), pt[0] - r, pt[1]);
          }
        }
      });
    }

    if (cfg.dsos.show) {
      container.selectAll(parentElement + " .dso").each(function (d) {
        if (clip(d.geometry.coordinates) && dsoDisplay(d.properties, cfg.dsos.limit)) {
          let pt = mapProjection(d.geometry.coordinates),
            type = d.properties.type;
          if (cfg.dsos.colors === true) setStyle(cfg.dsos.symbols[type]);
          else setStyle(cfg.dsos.style);
          let r = dsoSymbol(d, pt);
          if (has(cfg.dsos.symbols[type], "stroke")) context.stroke();
          else context.fill();

          if (cfg.dsos.names && dsoDisplay(d.properties, cfg.dsos.nameLimit * adapt)) {
            setTextStyle(cfg.dsos.nameStyle);
            if (cfg.dsos.colors === true) context.fillStyle = cfg.dsos.symbols[type].fill;
            context.fillText(dsoName(d), pt[0] + r, pt[1] - r);
          }
        }
      });
    }

    if ((cfg.location || cfg.formFields.location) && cfg.planets.show && Celestial.origin) {
      let dt = Celestial.date(),
        o = Celestial.origin(dt).spherical();
      container.selectAll(parentElement + " .planet").each(function (d) {
        let id = d.id(), r = 12 * adapt,
          p = d(dt).equatorial(o),
          pos = transformDeg(p.ephemeris.pos, euler[cfg.transform]);  //transform; 
        if (clip(pos)) {
          let pt = mapProjection(pos),
            sym = cfg.planets.symbols[id];
          if (cfg.planets.symbolType === "letter") {
            setTextStyle(cfg.planets.symbolStyle);
            context.fillStyle = sym.fill;
            context.fillText(sym.letter, pt[0], pt[1]);
          } else if (id === "lun") {
            if (has(sym, "size") && isNumber(sym.size)) r = sym.size * adapt;
            context.fillStyle = sym.fill;
            Canvas.symbol().type("crescent").size(r * r).age(p.ephemeris.age).position(pt)(context);
          } else if (cfg.planets.symbolType === "disk") {
            r = has(sym, "size") && isNumber(sym.size) ? sym.size * adapt : planetSize(p.ephemeris);
            context.fillStyle = sym.fill;
            Canvas.symbol().type("circle").size(r * r).position(pt)(context);
            context.fill();
          } else if (cfg.planets.symbolType === "symbol") {
            setTextStyle(cfg.planets.symbolStyle);
            context.font = planetSymbol(cfg.planets.symbolStyle.font);
            context.fillStyle = sym.fill;
            context.fillText(sym[cfg.planets.symbolType], pt[0], pt[1]);
          }
          //name
          if (cfg.planets.names) {
            let name = p[cfg.planets.namesType];
            setTextStyle(cfg.planets.nameStyle);
            //context.direction = "ltr" || "rtl" ar il ir
            context.fillStyle = sym.fill;
            context.fillText(name, pt[0] - r / 2, pt[1] + r / 2);
          }
        }
      });
    }

    if (Celestial.data.length > 0) {
      Celestial.data.forEach(function (d) {
        d.redraw();
      });
    }

    if ((cfg.location || cfg.formFields.location) && cfg.daylight.show && projectionSetting.clip) {
      let sol = getPlanet("sol");
      if (sol) {
        let up = Celestial.zenith(),
          solpos = sol.ephemeris.pos,
          dist = d3.geo.distance(up, solpos),
          pt = mapProjection(solpos);

        daylight.origin(solpos);
        setSkyStyle(dist, pt);
        container.selectAll(parentElement + " .daylight").datum(daylight).attr("d", map);
        context.fill();
        context.fillStyle = "#fff";
        if (clip(solpos)) {
          context.beginPath();
          context.arc(pt[0], pt[1], 6, 0, 2 * Math.PI);
          context.closePath();
          context.fill();
        }
      }
    }

    if ((cfg.location || cfg.formFields.location) && cfg.horizon.show && !projectionSetting.clip) {
      circle.origin(Celestial.nadir());
      setStyle(cfg.horizon);
      container.selectAll(parentElement + " .horizon").datum(circle).attr("d", map);
      context.fill();
      if (cfg.horizon.stroke) context.stroke();
    }

    if (cfg.controls) {
      zoomState(mapProjection.scale());
    }

    if (hasCallback) {
      Celestial.runCallback();
    }

    //Celestial.updateForm();

  }


  function drawOutline(stroke) {
    let rot = mapProjection.rotate(),
      prj = getProjection(cfg.projection, config.projectionRatio);

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
    return projectionSetting.clip && d3.geo.distance(cfg.center, coords) > halfπ ? 0 : 1;
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

  function setSkyStyle(dist, pt) {
    let factor, color1, color2, color3,
      upper = 1.36,
      lower = 1.885;

    if (dist > lower) {
      context.fillStyle = "transparent";
      context.globalAlpha = 0;
      return;
    }

    if (dist <= upper) {
      color1 = "#daf1fa";
      color2 = "#93d7f0";
      color3 = "#57c0e8";
      factor = -(upper - dist) / 10;
    } else {
      factor = (dist - upper) / (lower - upper);
      color1 = d3.interpolateLab("#daf1fa", "#e8c866")(factor);
      color2 = d3.interpolateLab("#93c7d0", "#ff854a")(factor);
      color3 = d3.interpolateLab("#57b0c8", "#6caae2")(factor);
    }
    let grad = context.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], 300);
    grad.addColorStop(0, color1);
    grad.addColorStop(0.2 + 0.4 * factor, color2);
    grad.addColorStop(1, color3);
    context.fillStyle = grad;
    context.globalAlpha = 0.9 * (1 - skyTransparency(factor, 1.4));
  }

  function skyTransparency(t, a) {
    return (Math.pow(Math.E, t * a) - 1) / (Math.pow(Math.E, a) - 1);
  }

  function zoomState(sc) {
    let czi = $("celestial-zoomin"),
      czo = $("celestial-zoomout"),
      defscale = projectionSetting.scale * width / 1024;
    if (!czi || !czo) return;
    czi.disabled = sc >= defscale * zoomextent * 0.99;
    czo.disabled = sc <= defscale;
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

  function dsoDisplay(prop, limit) {
    return prop.mag === 999 && Math.sqrt(parseInt(prop.dim)) > limit ||
      prop.mag !== 999 && prop.mag <= limit;
  }

  function dsoSymbol(d, pt) {
    let prop = d.properties;
    let size = dsoSize(prop) || 9,
      type = dsoShape(prop.type);
    Canvas.symbol().type(type).size(size).position(pt)(context);
    return Math.sqrt(size) / 2;
  }

  function dsoShape(type) {
    if (!type || !has(cfg.dsos.symbols, type)) return "circle";
    else return cfg.dsos.symbols[type].shape;
  }

  function dsoSize(prop) {
    if (!prop.mag || prop.mag === 999) return Math.pow(parseInt(prop.dim) * dsobase * adapt / 7, 0.5);
    return Math.pow(2 * dsobase * adapt - prop.mag, dsoexp);
  }


  function dsoName(d) {
    //return d.properties[cfg.dsos.namesType]; 
    let lang = cfg.dsos.namesType, id = d.id;
    if (lang === "desig" || !has(dsonames, id)) return d.properties.desig;
    return has(dsonames[id], lang) ? dsonames[id][lang] : d.properties.desig;
  }

  /* Star designation  */
  function starDesignation(id) {
    if (!has(starnames, id)) return "";
    return starnames[id][cfg.stars.designationType];
  }

  function starPropername(id) {
    let lang = cfg.stars.propernameType;
    if (!has(starnames, id)) return "";
    return has(starnames[id], lang) ? starnames[id][lang] : starnames[id].name;
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

  function planetSize(d) {
    let mag = d.mag;
    if (mag === null) return 2;
    let r = 4 * adapt * Math.exp(-0.05 * (mag + 2));
    return Math.max(r, 2);
  }

  function planetSymbol(s) {
    let size = s.replace(/(^\D*)(\d+)(\D.+$)/i, '$2');
    size = Math.round(adapt * size);
    return s.replace(/(^\D*)(\d+)(\D.+$)/i, '$1' + size + '$3');
  }

  function gridOrientation(pos, orient) {
    let o = orient.split(""), h = "center", v = "middle";
    for (let i = o.length - 1; i >= 0; i--) {
      switch (o[i]) {
        case "N": v = "bottom"; break;
        case "S": v = "top"; break;
        case "E": h = "left"; pos[0] += 2; break;
        case "W": h = "right"; pos[0] -= 2; break;
      }
    }
    context.textAlign = h;
    context.textBaseline = v;
    return pos;
  }

  function clear() {
    context.clearRect(0, 0, canvaswidth + margin[0], canvasheight + margin[1]);
  }

  function getWidth() {
    let w = 0;
    if (isNumber(cfg.width) && cfg.width > 0) w = cfg.width;
    else if (parent) w = parent.getBoundingClientRect().width - margin[0] * 2;
    else w = window.getBoundingClientRect().width - margin[0] * 2;
    //if (isNumber(cfg.background.width)) w -= cfg.background.width;
    return w;
  }

  function getProjection(p, ratioOverride) {
    if (!has(projections, p)) return;
    let res = projections[p];
    if (!has(res, "ratio")) res.ratio = 2;  // Default w/h ratio 2:1    
    res.ratio = ratioOverride ? ratioOverride : res.ratio;
    return res;
  }


  function animate() {
    if (!animations || animations.length < 1) return;

    let d, a = animations[current];

    switch (a.param) {
      case "projection": d = reproject({ projection: a.value }); break;
      case "center": d = rotate({ center: a.value }); break;
      case "zoom": d = zoomBy(a.value);
    }
    if (a.callback) setTimeout(a.callback, d);
    current++;
    if (repeat === true && current === animations.length) current = 0;
    d = a.duration === 0 || a.duration < d ? d : a.duration;
    if (current < animations.length) animationID = setTimeout(animate, d);
  }

  function stop() {
    clearTimeout(animationID);
    //current = 0;
    //repeat = false;
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
  this.symbol = Canvas.symbol;
  this.dsoSymbol = dsoSymbol;
  this.redraw = redraw;
  this.resize = function (config) {
    if (config !== undefined) {
      if (has(config, "width")) cfg.width = config.width;
      else if (isNumber(config)) cfg.width = config;
    }
    resize(true);
    return cfg.width;
  };
  this.reload = function (config) {
    let ctr;
    //if (!config || !has(config, "transform")) return;
    //cfg.transform = config.transform; 
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
  this.reproject = function (config) { return reproject(config); };
  this.rotate = function (config) { if (!config) return cfg.center; return rotate(config); };
  this.zoomBy = function (factor) { if (!factor) return mapProjection.scale() / scale; return zoomBy(factor); };
  this.color = function (type) {
    if (!type) return "#000";
    if (has(cfg.dsos.symbols, type)) return cfg.dsos.symbols[type].fill;
    return "#000";
  };
  this.starColor = starColor;
  this.animate = function (anims, dorepeat) {
    if (!anims) return;
    animations = anims;
    current = 0;
    repeat = dorepeat ? true : false;
    animate();
  };
  this.stop = function (wipe) {
    stop();
    if (wipe === true) animations = [];
  };
  this.go = function (index) {
    if (animations.length < 1) return;
    if (index && index < animations.length) current = index;
    animate();
  };

  /* obsolete
  if (!has(this, "date"))
    this.date = function() { console.log("Celestial.date() needs config.location = true to work." ); };
  */
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
Celestial.projection = function(projection) {
  let p, raw, forward;
  
  if (!has(projections, projection)) { throw new Error("Projection not supported: " + projection); }
  p = projections[projection];    

  if (p.arg !== null) {
    raw = d3.geo[projection].raw(p.arg);
  } else {
    raw = d3.geo[projection].raw;  
  }
  
  forward = function(λ, φ) {
    let coords = raw(-λ, φ);
    return coords;
  };

  forward.invert = function(x, y) {
    try {
      let coords = raw.invert(x, y);
      coords[0] = coords && -coords[0];
      return coords;
    } catch(e) { console.log(e); }
  };

  return d3.geo.projection(forward);
};


function projectionTween(a, b) {
  let prj = d3.geo.projection(raw).scale(1),
      center = prj.center,
      translate = prj.translate,
      α;

  function raw(λ, φ) {
    let pa = a([λ *= 180 / Math.PI, φ *= 180 / Math.PI]), pb = b([λ, φ]);
    return [(1 - α) * pa[0] + α * pb[0], (α - 1) * pa[1] - α * pb[1]];
  }

  prj.alpha = function(_) {
    if (!arguments.length) return α;
    α = +_;
    let ca = a.center(), cb = b.center(),
        ta = a.translate(), tb = b.translate();
    
    center([(1 - α) * ca[0] + α * cb[0], (1 - α) * ca[1] + α * cb[1]]);
    translate([(1 - α) * ta[0] + α * tb[0], (1 - α) * ta[1] + α * tb[1]]);
    return prj;
  };

  delete prj.translate;
  delete prj.center;
  return prj.alpha(0);
}

let eulerAngles = {
  "equatorial": [0.0, 0.0, 0.0],
  "ecliptic": [0.0, 0.0, 23.4393],
  "galactic": [93.5949, 28.9362, -58.5988],
  "supergalactic": [137.3100, 59.5283, 57.7303]
//  "mars": [97.5,23.5,29]
};

let poles = {
  "equatorial": [0.0, 90.0],
  "ecliptic": [-90.0, 66.5607],
  "galactic": [-167.1405, 27.1283],
  "supergalactic": [-76.2458, 15.7089]
//  "mars": [-42.3186, 52.8865]
};

Celestial.eulerAngles = function () { return eulerAngles; };
Celestial.poles = function () { return poles; };

let τ = Math.PI*2,
    halfπ = Math.PI/2,
    deg2rad = Math.PI/180;


//Transform equatorial into any coordinates, degrees
function transformDeg(c, euler) {
  let res = transform( c.map( function(d) { return d * deg2rad; } ), euler);
  return res.map( function(d) { return d / deg2rad; } );
}

//Transform equatorial into any coordinates, radians
function transform(c, euler) {
  let x, y, z, β, γ, λ, φ, dψ, ψ, θ,
      ε = 1.0e-5;

  if (!euler) return c; 

  λ = c[0];  // celestial longitude 0..2pi
  if (λ < 0) λ += τ; 
  φ = c[1];  // celestial latitude  -pi/2..pi/2
  
  λ -= euler[0];  // celestial longitude - celestial coordinates of the native pole
  β = euler[1];  // inclination between the poles (colatitude)
  γ = euler[2];  // native coordinates of the celestial pole
  
  x = Math.sin(φ) * Math.sin(β) - Math.cos(φ) * Math.cos(β) * Math.cos(λ);
  if (Math.abs(x) < ε) {
    x = -Math.cos(φ + β) + Math.cos(φ) * Math.cos(β) * (1 - Math.cos(λ));
  }
  y = -Math.cos(φ) * Math.sin(λ);
  
  if (x !== 0 || y !== 0) {
    dψ = Math.atan2(y, x);
  } else {
    dψ = λ - Math.PI;
  }
  ψ = (γ + dψ); 
  if (ψ > Math.PI) ψ -= τ; 
  
  if (λ % Math.PI === 0) {
    θ = φ + Math.cos(λ) * β;
    if (θ > halfπ) θ = Math.PI - θ; 
    if (θ < -halfπ) θ = -Math.PI - θ; 
  } else {
    z = Math.sin(φ) * Math.cos(β) + Math.cos(φ) * Math.sin(β) * Math.cos(λ);
    if (Math.abs(z) > 0.99) {
      θ = Math.abs(Math.acos(Math.sqrt(x*x+y*y)));
      if (z < 0) θ *= -1; 
    } else {
      θ = Math.asin(z);
    }
  }
  
  return [ψ, θ];
}

  
function getAngles(coords) {
  if (coords === null || coords.length <= 0) return [0,0,0];
  let rot = eulerAngles.equatorial; 
  if (!coords[2]) coords[2] = 0;
  return [rot[0] - coords[0], rot[1] - coords[1], rot[2] + coords[2]];
}


let euler = {
  "ecliptic": [-90.0, 23.4393, 90.0],
  "inverse ecliptic": [90.0, 23.4393, -90.0],
  "galactic": [-167.1405, 62.8717, 122.9319], 
  "inverse galactic": [122.9319, 62.8717, -167.1405],
  "supergalactic": [283.7542, 74.2911, 26.4504],
  "inverse supergalactic": [26.4504, 74.2911, 283.7542],
  "init": function () {
    for (let key in this) {
      if (this[key].constructor == Array) { 
        this[key] = this[key].map( function(val) { return val * deg2rad; } );
      }
    }
  },
  "add": function(name, ang) {
    if (!ang || !name || ang.length !== 3 || this.hasOwnProperty(name)) return; 
    this[name] = ang.map( function(val) { return val * deg2rad; } );
    return this[name];
  }
};

euler.init();
Celestial.euler = function () { return euler; };

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
//Add more JSON data to the map
let hasCallback = false;

// Celestial.add = function(dat) {
//   let res = {};
//   //dat: {file: path, type:'json|raw', callback: func(), redraw: func()} 
//   //or {file:file, size:null, shape:null, color:null}  TBI
//   //  with size,shape,color: "prop=val:result;.." || function(prop) { .. return res; } 
//   if (!has(dat, "type")) return console.log("Missing type");
  
//   if ((dat.type === "dso" || dat.type === "json") && (!has(dat, "file") || !has(dat, "callback"))) return console.log("Can't add data file");
//   if ((dat.type === "line" || dat.type === "raw") && !has(dat, "callback")) return console.log("Can't add data");
  
//   if (has(dat, "file")) res.file = dat.file;
//   res.type = dat.type;
//   if (has(dat, "callback")) res.callback = dat.callback;
//   if (has(dat, "redraw")) res.redraw = dat.redraw;
//   if (has(dat, "save")) res.save = dat.save;
//   Celestial.data.push(res);
// };

// Celestial.remove = function(i) {
//   if (i !== null && i < Celestial.data.length) {
//     return Celestial.data.splice(i,1);
//   }
// };

// Celestial.clear = function() {
//   Celestial.data = [];
// };

Celestial.addCallback = function(dat) {
  Celestial.callback = dat;
  hasCallback = (dat !== null);
};

Celestial.runCallback = function(dat) {
  hasCallback = false; // avoid recursion
  Celestial.callback();
  hasCallback = true;
};
//load data and transform coordinates


function getPoint(coords, trans) {
  return transformDeg(coords, euler[trans]);
}
 
function getData(d, trans) {
  if (trans === "equatorial") return d;

  let leo = euler[trans],
      f = d.features;

  for (let i=0; i<f.length; i++)
    f[i].geometry.coordinates = translate(f[i], leo);
  
  return d;
}

function getPlanets(d) {
  let res = [];
  
  for (let key in d) {
    if (!has(d, key)) continue;
    if (cfg.planets.which.indexOf(key) === -1) continue;
    let dat = Kepler().id(key);
    if (has(d[key], "parent")) dat.parentBody(d[key].parent);
    dat.elements(d[key].elements[0]).params(d[key]);
    if (key === "ter") 
      Celestial.origin = dat;
    else res.push(dat);
  }
  //res.push(Kepler().id("sol"));
  //res.push(Kepler().id("lun"));
  return res;
}


function getPlanet(id, dt) {
  dt = dt || Celestial.date();
  if (!Celestial.origin) return;

  let o = Celestial.origin(dt).spherical(), res;
     
  Celestial.container.selectAll(".planet").each(function(d) {
    if (id === d.id()) {
      res = d(dt).equatorial(o);
    }
  });
  return res;
}

function getConstellationList(d) {
  let res = {},
      f = d.features;
      
  for (let i=0; i<f.length; i++) {
    res[f[i].id] = {
      center: f[i].properties.display.slice(0,2),
      scale: f[i].properties.display[2]
    };
  }
  return res;
}

function getMwbackground(d) {
  // geoJson object to darken the mw-outside, prevent greying of whole map in some orientations 
  let res = {'type': 'FeatureCollection', 'features': [ {'type': 'Feature', 
              'geometry': { 'type': 'MultiPolygon', 'coordinates' : [] }
            }]};

  // reverse the polygons, inside -> outside
  let l1 = d.features[0].geometry.coordinates[0];
  res.features[0].geometry.coordinates[0] = [];
  for (let i=0; i<l1.length; i++) {
    res.features[0].geometry.coordinates[0][i] = l1[i].slice().reverse();
  }

  return res;
}

function getTimezones() {
  
}

function translate(d, leo) {
  let res = [];
  switch (d.geometry.type) {
    case "Point": res = transformDeg(d.geometry.coordinates, leo); break;
    case "LineString": res.push(transLine(d.geometry.coordinates, leo)); break;
    case "MultiLineString": res = transMultiLine(d.geometry.coordinates, leo); break;
    case "Polygon": res.push(transLine(d.geometry.coordinates[0], leo)); break;
    case "MultiPolygon": res.push(transMultiLine(d.geometry.coordinates[0], leo)); break;
  }
  
  return res;
}

function getGridValues(type, loc) {
  let lines = [];
  if (!loc) return [];
  if (!isArray(loc)) loc = [loc];
  //center, outline, values
  for (let i=0; i < loc.length; i++) {
    switch (loc[i]) {
      case "center": 
        if (type === "lat")
          lines = lines.concat(getLine(type, cfg.center[0], "N"));
        else
          lines = lines.concat(getLine(type, cfg.center[1], "S")); 
        break;
      case "outline": 
        if (type === "lon") { 
          lines = lines.concat(getLine(type, cfg.center[1]-89.99, "S"));
          lines = lines.concat(getLine(type, cfg.center[1]+89.99, "N"));
        } else {
					// TODO: hemi
          lines = lines.concat(getLine(type, cfg.center[0]-179.99, "E"));
          lines = lines.concat(getLine(type, cfg.center[0]+179.99, "W"));
        }
        break;
      default: if (isNumber(loc[i])) {
        if (type === "lat")
          lines = lines.concat(getLine(type, loc[i], "N"));
        else
          lines = lines.concat(getLine(type, loc[i], "S")); 
        break;        
      }
    }
  }
  //return [{coordinates, value, orientation}, ...]
  return jsonGridValues(lines);
}

function jsonGridValues(lines) {
  let res = [];
  for (let i=0; i < lines.length; i++) {
    let f = {type: "Feature", "id":i, properties: {}, geometry:{type:"Point"}};
    f.properties.value = lines[i].value;
    f.properties.orientation = lines[i].orientation;
    f.geometry.coordinates = lines[i].coordinates;
    res.push(f);
  }
  return res;
}

function getLine(type, loc, orient) {
  let min, max, step, val, coord,
      tp = type,
      res = [],
      lr = loc;
  if (cfg.transform === "equatorial" && tp === "lon") tp = "ra";
  
  if (tp === "ra") {
    min = 0; max = 23; step = 1;
  } else if (tp === "lon") {
    min = 0; max = 350; step = 10;    
  } else {
    min = -80; max = 80; step = 10;    
  }
  for (let i=min; i<=max; i+=step) {
    let o = orient;
    if (tp === "lat") {
      coord = [lr, i];
      val = i.toString() + "\u00b0";
      if (i < 0) o += "S"; else o += "N";
    } else if (tp === "ra") {
      coord = [i * 15, lr];
      val = i.toString() + "\u02b0";
    } else {
      coord = [i, lr];
      val = i.toString() + "\u00b0";
    }
  
    res.push({coordinates: coord, value: val, orientation: o});
  }
  return res;
}

function transLine(c, leo) {
  let line = [];
  
  for (let i=0; i<c.length; i++)
    line.push(transformDeg(c[i], leo));
  
  return line;
}

function transMultiLine(c, leo) {
  let lines = [];
  
  for (let i=0; i<c.length; i++)
    lines.push(transLine(c[i], leo));
  
  return lines;
}

Celestial.getData = getData;
Celestial.getPoint = getPoint;
Celestial.getPlanet = getPlanet;

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
  formFields: {"location": true, "general": true, "stars": true, "dsos": true, "constellations": true, "lines": true, "other": true, download: false},
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
  formcontainer: "celestial-form",
  datepickcontainer: "celestial-date",
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
  dsos: {
    show: true,    // Show Deep Space Objects 
    limit: 6,      // Show only DSOs brighter than limit magnitude
    colors: true,  // Show DSOs in symbol colors if true, use style setting below if false
    style: { fill: "#cccccc", stroke: "#cccccc", width: 2, opacity: 1 }, // Default style for dsos
    names: true,   // Show DSO names
    namesType: "desig",  // Type of displayed name: desig, name, or 15 different language codes from dsonames.json
    nameStyle: { fill: "#cccccc", font: "11px 'Lucida Sans Unicode', 'DejaVu Sans', Helvetica, Arial, serif", align: "left", baseline: "bottom" },
    nameLimit: 4,  // Show only names for DSOs brighter than nameLimit
    size: null,    // Optional seperate scale size for DSOs, null = stars.size
    exponent: 1.4, // Scale exponent for DSO size, larger = more non-linear
    data: "dsos.bright.json",  // Data source for DSOs
    symbols: {  // DSO symbol styles
      gg: {shape: "circle", fill: "#ff0000"},                                 // Galaxy cluster
      g:  {shape: "ellipse", fill: "#ff0000"},                                // Generic galaxy
      s:  {shape: "ellipse", fill: "#ff0000"},                                // Spiral galaxy
      s0: {shape: "ellipse", fill: "#ff0000"},                                // Lenticular galaxy
      sd: {shape: "ellipse", fill: "#ff0000"},                                // Dwarf galaxy
      e:  {shape: "ellipse", fill: "#ff0000"},                                // Elliptical galaxy
      i:  {shape: "ellipse", fill: "#ff0000"},                                // Irregular galaxy
      oc: {shape: "circle", fill: "#ff9900", stroke: "#ff9900", width: 2},    // Open cluster
      gc: {shape: "circle", fill: "#ff9900"},                                 // Globular cluster
      en: {shape: "square", fill: "#ff00cc"},                                 // Emission nebula
      bn: {shape: "square", fill: "#ff00cc"},                                 // Generic bright nebula
      sfr:{shape: "square", fill: "#cc00ff"},                                 // Star forming region
      rn: {shape: "square", fill: "#0000ff"},                                 // Reflection nebula
      pn: {shape: "diamond", fill: "#00cccc"},                                // Planetary nebula 
      snr:{shape: "diamond", fill: "#ff00cc"},                                // Supernova remnant
      dn: {shape: "square", fill: "#999999", stroke: "#999999", width: 2},    // Dark nebula 
      pos:{shape: "marker", fill: "#cccccc", stroke: "#cccccc", width: 1.5}   // Generic marker
    }
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
    ecliptic: { show: true, stroke: "#66cc66", width: 1.3, opacity: 0.7 },      // Show ecliptic plane 
    galactic: { show: false, stroke: "#cc6666", width: 1.3, opacity: 0.7 },     // Show galactic plane 
    supergalactic: { show: false, stroke: "#cc66cc", width: 1.3, opacity: 0.7 } // Show supergalactic plane 
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
  planets: {  //Show planet locations, if date-time is set
    show: false, 
    // 3-letter designations of all solar system objects that should be displayed
    which: ["sol", "mer", "ven", "ter", "lun", "mar", "jup", "sat", "ura", "nep", "cer", "plu"],
    // Symbols as unicode codepoints, letter abbreviations and colors to be displayed
    symbols: {
      "sol": {symbol: "\u2609", letter:"Su", fill: "#ffff00", size: 12},
      "mer": {symbol: "\u263f", letter:"Me", fill: "#cccccc"},
      "ven": {symbol: "\u2640", letter:"V", fill: "#eeeecc"},
      "ter": {symbol: "\u2295", letter:"T", fill: "#00ccff"},
      "lun": {symbol: "\u25cf", letter:"L", fill: "#ffffff", size: 12},
      "mar": {symbol: "\u2642", letter:"Ma", fill: "#ff6600"},
      "cer": {symbol: "\u26b3", letter:"C", fill: "#cccccc"},
      "ves": {symbol: "\u26b6", letter:"Ma", fill: "#cccccc"},
      "jup": {symbol: "\u2643", letter:"J", fill: "#ffaa33"},
      "sat": {symbol: "\u2644", letter:"Sa", fill: "#ffdd66"},
      "ura": {symbol: "\u2645", letter:"U", fill: "#66ccff"},
      "nep": {symbol: "\u2646", letter:"N", fill: "#6666ff"},
      "plu": {symbol: "\u2647", letter:"P", fill: "#aaaaaa"},
      "eri": {symbol: "\u26aa", letter:"E", fill: "#eeeeee"}
    },
    // Style options for planetary symbols
    symbolStyle: { fill: "#cccccc", opacity:1, font: "bold 20px 'DejaVu Sans Mono', 'Arial Unicode MS', sans-serif", align: "center", baseline: "middle" },
    symbolType: "symbol",  // Type of planetary symbol to be displayed: 'symbol', 'letter' or 'disk'
    names: false,  // Show name next to symbol
    // Style options for planetary names
    nameStyle: { fill: "#cccccc", font: "14px 'Lucida Sans Unicode', 'DejaVu Sans', sans-serif", align: "right", baseline: "top" },
    namesType: "en"  // Language in which the name is displayed, options desig, ar, cn, en, fr, de, gr, il, in, it, jp, lat, ru, es
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
      // Adapt legacy name parameters
      if (has(cfg, "stars")) {
        // names -> designation
        if (has(cfg.stars, "names")) res.stars.designation = cfg.stars.names;
        if (has(cfg.stars, "namelimit")) res.stars.designationLimit = cfg.stars.namelimit;
        if (has(cfg.stars, "namestyle")) Object.assign(res.stars.designationStyle, cfg.stars.namestyle);    
        // proper -> propername
        if (has(cfg.stars, "proper")) res.stars.propername = cfg.stars.proper;
        if (has(cfg.stars, "propernamelimit")) res.stars.propernameLimit = cfg.stars.propernamelimit;
        if (has(cfg.stars, "propernamestyle")) Object.assign(res.stars.propernameStyle, cfg.stars.propernamestyle);
      }

      if (has(cfg, "dsos")) {
        // names, desig -> namesType
        //if (has(cfg.dsos, "names") && cfg.dsos.names === true) res.dsos.namesType = "name";
        if (has(cfg.dsos, "desig") && cfg.dsos.desig === true) res.dsos.namesType = "desig";
        if (has(cfg.dsos, "namelimit")) res.dsos.nameLimit = cfg.dsos.namelimit;
        if (has(cfg.dsos, "namestyle")) Object.assign(res.dsos.nameStyle, cfg.dsos.namestyle);    
      }
      
      if (has(cfg, "constellations")) {
        // names, desig -> namesType
        if (has(cfg.constellations, "show") && cfg.constellations.show === true) res.constellations.names = true;
        //if (has(cfg.constellations, "names") && cfg.constellations.names === true) res.constellations.namesType = "name";
        if (has(cfg.constellations, "desig") && cfg.constellations.desig === true) res.constellations.namesType = "desig";
        if (res.constellations.namesType === "latin") res.constellations.namesType = "la";
        if (res.constellations.namesType === "iau") res.constellations.namesType = "name";
        if (has(cfg.constellations, "namestyle")) Object.assign(res.constellations.nameStyle, cfg.constellations.namestyle);
        if (has(cfg.constellations, "linestyle")) Object.assign(res.constellations.lineStyle, cfg.constellations.linestyle);
        if (has(cfg.constellations, "boundstyle")) Object.assign(res.constellations.boundStyle, cfg.constellations.boundstyle);
      }

      if (has(cfg, "planets")) {
        if (has(cfg.planets, "style")) Object.assign(res.planets.style, cfg.planets.symbolStyle);      
      }
    }
    //Assign default name types if none given
    if (!res.stars.designationType || res.stars.designationType === "") res.stars.designationType = "desig";
    if (!has(formats.starnames[res.culture].designation, res.stars.designationType)) res.designationType = "desig";
    if (!res.stars.propernameType || res.stars.propernameType === "") res.stars.propernameType = "name";
    if (!has(formats.starnames[res.culture].propername, res.stars.propernameType)) res.propernameType = "name";
    if (!res.dsos.namesType || res.dsos.namesType === "") res.dsos.namesType = "desig";
    if (!res.constellations.namesType || res.constellations.namesType === "") res.constellations.namesType = "desig";
    if (!has(formats.constellations[res.culture].names, res.constellations.namesType)) res.constellations.namesType = "name";
    if (!res.planets.symbolType || res.planets.symbolType === "") res.planets.symbolType = "symbol";
    if (!res.planets.namesType || res.planets.namesType === "") res.planets.namesType = "desig";
    if (!has(formats.planets[res.culture].names, res.planets.namesType)) res.planets.namesType = "desig";
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
  let res;
  if (!isArray(o)) return [o, o, o];  //It saves some work later, OK?
  if (o.length >= 3) return o;
  if (o.length === 1) return [o[0], o[0], o[0]];
  if (o.length === 2) return [o[0], o[1], o[1]];
}

Celestial.settings = function () { return settings; };

//b-v color index to rgb color value scale
let bvcolor = 
  d3.scale.quantize().domain([3.347, -0.335]) //main sequence <= 1.7
    .range([ '#ff4700', '#ff4b00', '#ff4f00', '#ff5300', '#ff5600', '#ff5900', '#ff5b00', '#ff5d00', '#ff6000', '#ff6300', '#ff6500', '#ff6700', '#ff6900', '#ff6b00', '#ff6d00', '#ff7000', '#ff7300', '#ff7500', '#ff7800', '#ff7a00', '#ff7c00', '#ff7e00', '#ff8100', '#ff8300', '#ff8506', '#ff870a', '#ff8912', '#ff8b1a', '#ff8e21', '#ff9127', '#ff932c', '#ff9631', '#ff9836', '#ff9a3c', '#ff9d3f', '#ffa148', '#ffa34b', '#ffa54f', '#ffa753', '#ffa957', '#ffab5a', '#ffad5e', '#ffb165', '#ffb269', '#ffb46b', '#ffb872', '#ffb975', '#ffbb78', '#ffbe7e', '#ffc184', '#ffc489', '#ffc78f', '#ffc892', '#ffc994', '#ffcc99', '#ffce9f', '#ffd1a3', '#ffd3a8', '#ffd5ad', '#ffd7b1', '#ffd9b6', '#ffdbba', '#ffddbe', '#ffdfc2', '#ffe1c6', '#ffe3ca', '#ffe4ce', '#ffe8d5', '#ffe9d9', '#ffebdc', '#ffece0', '#ffefe6', '#fff0e9', '#fff2ec', '#fff4f2', '#fff5f5', '#fff6f8', '#fff9fd', '#fef9ff', '#f9f6ff', '#f6f4ff', '#f3f2ff', '#eff0ff', '#ebeeff', '#e9edff', '#e6ebff', '#e3e9ff', '#e0e7ff', '#dee6ff', '#dce5ff', '#d9e3ff', '#d7e2ff', '#d3e0ff', '#c9d9ff', '#bfd3ff', '#b7ceff', '#afc9ff', '#a9c5ff', '#a4c2ff', '#9fbfff', '#9bbcff']);
 
/* Default parameters for each supported projection
     arg: constructor argument, if any 
     scale: scale parameter so that they all have ~equal width, normalized to 1024 pixels
     ratio: width/height ratio, 2.0 if none
     clip: projection clipped to 90 degrees from center, otherwise to antimeridian
*/
let projections = {
  "airy": {n:"Airy’s Minimum Error", arg:Math.PI/2, scale:360, ratio:1.0, clip:true},
};

Celestial.projections = function () { return projections; };

let formats = {
  "starnames": {
    // "name":"","bayer":"","flam":"","var":"","gl":"","hd":"","c":"","desig":""
    "iau": {
      "designation": {
        "desig": "Designation",     
        "bayer": "Bayer",
        "flam": "Flamsteed",
        "var": "Variable",
        "gl": "Gliese",
        "hd": "Draper",
        "hip": "Hipparcos"},
      "propername": {
        "name": "IAU Name",
        "ar": "Arabic", 
        "zh": "Chinese",
        "en": "English",
        "fi": "Finnish", 
        "fr": "French", 
        "de": "German",
        "el": "Greek", 
        "he": "Hebrew", 
        "hi": "Hindi", 
        "it": "Italian", 
        "ja": "Japanese", 
        "ko": "Korean", 
        "la": "Latin",
        "fa": "Persian", 
        "ru": "Russian", 
        "es": "Spanish",
        "tr": "Turkish"}
    },
    "cn": {
      "propername": {
        "name": "Proper name",
        "en": "English",
        "pinyin": "Pinyin"},
      "designation": { 
        "desig": "IAU Designation"}
    }
  },
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
        "tr": "Turkish"}
    },
    "cn": {
      "names": {
        "name": "Proper name",
        "en": "English",
        "pinyin": "Pinyin"}
    }             
  },
  "planets": {
    "iau": {
      "symbol": {
        "symbol": "\u263e Symbol",
        "letter": "\u216c Letter",
        "disk": "\u25cf Disk"},
      "names": {
        "desig": "Designation",
        "ar": "Arabic",
        "zh": "Chinese",
        "en": "English",
        "fr": "French",
        "de": "German",
        "el": "Greek",
        "he": "Hebrew",
        "hi": "Hindi",
        "it": "Italian",
        "ja": "Japanese",
        "ko": "Korean", 
        "la": "Latin",
        "fa": "Persian", 
        "ru": "Russian",
        "es": "Spanish"}
    },
    "cn": {
      "symbol": {
        "symbol": "\u263e Symbol",
        "letter": "\u216c Letter",
        "disk": "\u25cf Disk"},
      "names": {
        "desig": "Designation",
        "name": "Chinese",
        "pinyin": "Pinyin",
        "en": "English"}
    }
  },
  "dsonames": {
    "iau": {
      "names": {
        "desig": "Designation",
        "name": "English",
        "ar": "Arabic", 
        "zh": "Chinese",
        "fi": "Finnish", 
        "fr": "French", 
        "de": "German",
        "el": "Greek", 
        //"he": "Hebrew",
        "hi": "Hindi", 
        "it": "Italian", 
        "ja": "Japanese", 
        "ko": "Korean", 
        "la": "Latin",
        "fa": "Persian", 
        "ru": "Russian", 
        "es": "Spanish",
        "tr": "Turkish"}
    },
    "cn": {
      "names": {
        "desig": "Designation",
        "name": "Chinese",
        "pinyin": "Pinyin",
        "en": "English"}
    }
  }
};

let formats_all = {
  "iau": Object.keys(formats.constellations.iau.names).concat(Object.keys(formats.planets.iau.names)).filter( function(value, index, self) { return self.indexOf(value) === index; } ),
  "cn":  Object.keys(formats.constellations.cn.names).concat(Object.keys(formats.starnames.cn.propername)).filter( function(value, index, self) { return self.indexOf(value) === index; } )
};

let Canvas = {}; 

Canvas.symbol = function () {
  // parameters and default values
  let type = d3.functor("circle"), 
      size = d3.functor(64), 
      age = d3.functor(Math.PI), //crescent shape 0..2Pi
      color = d3.functor("#fff"),  
      text = d3.functor(""),  
      padding = d3.functor([2,2]),  
      pos;
  
  function canvas_symbol(context) {
    draw_symbol[type()](context);
  }
  
  let draw_symbol = {
    "circle": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2;
      ctx.arc(pos[0], pos[1], r, 0, 2 * Math.PI);
      ctx.closePath();
      return r;
    },
    "square": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/1.7;
      ctx.moveTo(pos[0]-r, pos[1]-r);
      ctx.lineTo(pos[0]+r, pos[1]-r);
      ctx.lineTo(pos[0]+r, pos[1]+r);
      ctx.lineTo(pos[0]-r, pos[1]+r);
      ctx.closePath();
      return r;
    },
    "diamond": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/1.5;
      ctx.moveTo(pos[0], pos[1]-r);
      ctx.lineTo(pos[0]+r, pos[1]);
      ctx.lineTo(pos[0], pos[1]+r);
      ctx.lineTo(pos[0]-r, pos[1]);
      ctx.closePath();
      return r;
    },
    "triangle": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/Math.sqrt(3);
      ctx.moveTo(pos[0], pos[1]-r);
      ctx.lineTo(pos[0]+r, pos[1]+r);
      ctx.lineTo(pos[0]-r, pos[1]+r);
      ctx.closePath();
      return r;
    },
    "ellipse": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2;
      ctx.save();
      ctx.translate(pos[0], pos[1]);
      ctx.scale(1.6, 0.8); 
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 2 * Math.PI); 
      ctx.closePath();
      ctx.restore();      
      return r;
    },
    "marker": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2;
      ctx.moveTo(pos[0], pos[1]-r);
      ctx.lineTo(pos[0], pos[1]+r);
      ctx.moveTo(pos[0]-r, pos[1]);
      ctx.lineTo(pos[0]+r, pos[1]);
      ctx.closePath();
      return r;
    },
    "cross-circle": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2;
      ctx.moveTo(pos[0], pos[1]-s);
      ctx.lineTo(pos[0], pos[1]+s);
      ctx.moveTo(pos[0]-s, pos[1]);
      ctx.lineTo(pos[0]+s, pos[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos[0], pos[1]);
      ctx.arc(pos[0], pos[1], r, 0, 2 * Math.PI);    
      ctx.closePath();
      return r;
    },
    "stroke-circle": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2;
      ctx.moveTo(pos[0], pos[1]-s);
      ctx.lineTo(pos[0], pos[1]+s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos[0], pos[1]);
      ctx.arc(pos[0], pos[1], r, 0, 2 * Math.PI);    
      ctx.closePath();
      return r;
    }, 
    "crescent": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2,
          ag = age(),
          ph = 0.5 * (1 - Math.cos(ag)),
          e = 1.6 * Math.abs(ph - 0.5) + 0.01,
          dir = ag > Math.PI,
          termdir = Math.abs(ph) > 0.5 ? dir : !dir,
          moonFill = ctx.fillStyle,
          darkFill = ph < 0.157 ? "#669" : "#557";
      ctx.save();
      ctx.fillStyle = darkFill;
      ctx.beginPath();
      ctx.moveTo(pos[0], pos[1]);
      ctx.arc(pos[0], pos[1], r, 0, 2 * Math.PI);    
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = moonFill;
      ctx.beginPath();
      ctx.moveTo(pos[0], pos[1]);
      ctx.arc(pos[0], pos[1], r, -Math.PI/2, Math.PI/2, dir); 
      ctx.scale(e, 1);
      ctx.arc(pos[0]/e, pos[1], r, Math.PI/2, -Math.PI/2, termdir); 
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      
      return r;
    } 
  };

  
  canvas_symbol.type = function(_) {
    if (!arguments.length) return type; 
    type = d3.functor(_);
    return canvas_symbol;
  };
  canvas_symbol.size = function(_) {
    if (!arguments.length) return size; 
    size = d3.functor(_);
    return canvas_symbol;
  };
  canvas_symbol.age = function(_) {
    if (!arguments.length) return age; 
    age = d3.functor(_);
    return canvas_symbol;
  };
  canvas_symbol.text = function(_) {
    if (!arguments.length) return text; 
    text = d3.functor(_);
    return canvas_symbol;
  };
  canvas_symbol.position = function(_) {
    if (!arguments.length) return; 
    pos = _;
    return canvas_symbol;
  };

  return canvas_symbol;
};

Celestial.Canvas = Canvas;

function $(id) { return document.querySelector(parentElement + " #" + id); }
function px(n) { return n + "px"; }
function Round(x, dg) { return (Math.round(Math.pow(10, dg) * x) / Math.pow(10, dg)); }
function sign(x) { return x ? x < 0 ? -1 : 1 : 0; }
function pad(n) { return n < 10 ? '0' + n : n; }


function has(o, key) { return o !== null && hasOwnProperty.call(o, key); }
function when(o, key, val) { return o !== null && hasOwnProperty.call(o, key) ? o[key] : val; }
function isNumber(n) { return n !== null && !isNaN(parseFloat(n)) && isFinite(n); }
function isArray(o) { return o !== null && Object.prototype.toString.call(o) === "[object Array]"; }
function isObject(o) { let type = typeof o; return type === 'function' || type === 'object' && !!o; }
function isFunction(o) { return typeof o == 'function' || false; }
function isValidDate(d) { return d && d instanceof Date && !isNaN(d); }
function fileExists(url) {
  let http = new XMLHttpRequest();
  http.open('HEAD', url, false);
  http.send();
  return http.status != 404;
}

function findPos(o) {
  let l = 0, t = 0;
  if (o.offsetParent) {
    do {
      l += o.offsetLeft;
      t += o.offsetTop;
    } while ((o = o.offsetParent) !== null);
  }
  return [l, t];
}

function hasParent(t, id) {
  while (t.parentNode) {
    if (t.id === id) return true;
    t = t.parentNode;
  }
  return false;
}

function attach(node, event, func) {
  if (node.addEventListener) node.addEventListener(event, func, false);
  else node.attachEvent("on" + event, func);
}

function stopPropagation(e) {
  if (typeof e.stopPropagation != "undefined") e.stopPropagation();
  else e.cancelBubble = true;
}

function dateDiff(dt1, dt2, type) {
  let diff = dt2.valueOf() - dt1.valueOf(),
    tp = type || "d";
  switch (tp) {
    case 'y': case 'yr': diff /= 31556926080; break;
    case 'm': case 'mo': diff /= 2629800000; break;
    case 'd': case 'dy': diff /= 86400000; break;
    case 'h': case 'hr': diff /= 3600000; break;
    case 'n': case 'mn': diff /= 60000; break;
    case 's': case 'sec': diff /= 1000; break;
    case 'ms': break;
  }
  return Math.floor(diff);
}

function dateParse(s) {
  if (!s) return;
  let t = s.split(".");
  if (t.length < 1) return;
  t = t[0].split("-");
  t[0] = t[0].replace(/\D/g, "");
  if (!t[0]) return;
  t[1] = t[1] ? t[1].replace(/\D/g, "") : "1";
  t[2] = t[2] ? t[2].replace(/\D/g, "") : "1";
  //Fraction -> h:m:s
  return new Date(Date.UTC(t[0], t[1] - 1, t[2]));
}


function interpolateAngle(a1, a2, t) {
  a1 = (a1 * deg2rad + τ) % τ;
  a2 = (a2 * deg2rad + τ) % τ;
  if (Math.abs(a1 - a2) > Math.PI) {
    if (a1 > a2) a1 = a1 - τ;
    else if (a2 > a1) a2 = a2 - τ;
  }
  return d3.interpolateNumber(a1 / deg2rad, a2 / deg2rad);
}

let Trig = {
  sinh: function (val) { return (Math.pow(Math.E, val) - Math.pow(Math.E, -val)) / 2; },
  cosh: function (val) { return (Math.pow(Math.E, val) + Math.pow(Math.E, -val)) / 2; },
  tanh: function (val) { return 2.0 / (1.0 + Math.exp(-2.0 * val)) - 1.0; },
  asinh: function (val) { return Math.log(val + Math.sqrt(val * val + 1)); },
  acosh: function (val) { return Math.log(val + Math.sqrt(val * val - 1)); },
  normalize0: function (val) { return ((val + Math.PI * 3) % (Math.PI * 2)) - Math.PI; },
  normalize: function (val) { return ((val + Math.PI * 2) % (Math.PI * 2)); },
  cartesian: function (p) {
    let ϕ = p[0], θ = halfπ - p[1], r = p[2];
    return { "x": r * Math.sin(θ) * Math.cos(ϕ), "y": r * Math.sin(θ) * Math.sin(ϕ), "z": r * Math.cos(θ) };
  },
  spherical: function (p) {
    let r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z),
      θ = Math.atan(p.y / p.x),
      ϕ = Math.acos(p.z / r);
    return [θ / deg2rad, ϕ / deg2rad, r];
  },
  distance: function (p1, p2) {
    return Math.acos(Math.sin(p1[1]) * Math.sin(p2[1]) + Math.cos(p1[1]) * Math.cos(p2[1]) * Math.cos(p1[0] - p2[0]));
  }
};

let epsilon = 1e-6,
  halfPi = Math.PI / 2,
  quarterPi = Math.PI / 4,
  tau = Math.PI * 2;

function cartesian(spherical) {
  let lambda = spherical[0], phi = spherical[1], cosPhi = Math.cos(phi);
  return [cosPhi * Math.cos(lambda), cosPhi * Math.sin(lambda), Math.sin(phi)];
}

function cartesianCross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function cartesianNormalizeInPlace(d) {
  let l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
  d[0] /= l; d[1] /= l; d[2] /= l;
}

function longitude(point) {
  if (Math.abs(point[0]) <= Math.PI)
    return point[0];
  else
    return sign(point[0]) * ((Math.abs(point[0]) + Math.PI) % tau - Math.PI);
}

function poligonContains(polygon, point) {
  let lambda = longitude(point),
    phi = point[1],
    sinPhi = Math.sin(phi),
    normal = [Math.sin(lambda), -Math.cos(lambda), 0],
    angle = 0,
    winding = 0,
    sum = 0;

  if (sinPhi === 1) phi = halfPi + epsilon;
  else if (sinPhi === -1) phi = -halfPi - epsilon;

  for (let i = 0, n = polygon.length; i < n; ++i) {
    let ring = null, m = null;
    if (!(m = (ring = polygon[i]).length)) continue;
    let point0 = ring[m - 1],
      lambda0 = longitude(point0),
      phi0 = point0[1] / 2 + quarterPi,
      sinPhi0 = Math.sin(phi0),
      cosPhi0 = Math.cos(phi0),
      point1, cosPhi1, sinPhi1, lambda1;

    for (let j = 0; j < m; ++j, lambda0 = lambda1, sinPhi0 = sinPhi1, cosPhi0 = cosPhi1, point0 = point1) {
      point1 = ring[j];
      lambda1 = longitude(point1);
      let phi1 = point1[1] / 2 + quarterPi;
      sinPhi1 = Math.sin(phi1);
      cosPhi1 = Math.cos(phi1);
      let delta = lambda1 - lambda0,
        sign = delta >= 0 ? 1 : -1,
        absDelta = sign * delta,
        antimeridian = absDelta > Math.PI,
        k = sinPhi0 * sinPhi1;

      sum += Math.atan2(k * sign * Math.sin(absDelta), cosPhi0 * cosPhi1 + k * Math.cos(absDelta));
      angle += antimeridian ? delta + sign * tau : delta;

      if ((antimeridian ^ lambda0) >= (lambda ^ lambda1) >= lambda) {
        let arc = cartesianCross(cartesian(point0), cartesian(point1));
        cartesianNormalizeInPlace(arc);
        let intersection = cartesianCross(normal, arc);
        cartesianNormalizeInPlace(intersection);
        let phiArc = (antimeridian ^ delta >= 0 ? -1 : 1) * Math.asin(intersection[2]);
        if (phi > phiArc || phi === phiArc && (arc[0] || arc[1])) {
          winding += antimeridian ^ delta >= 0 ? 1 : -1;
        }
      }
    }
  }

  return (angle < -epsilon || angle < epsilon && sum < -epsilon) ^ (winding & 1);
}
function setCenter(ctr) {
  if (ctr === null || ctr.length < 1) ctr = [0, 0, 0];
  if (ctr.length <= 2 || ctr[2] === undefined) ctr[2] = 0;
  settings.set({ center: ctr });
}


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
    zenith = Celestial.getPoint(horizontal.inverse(dtc, [90, 0], geopos), config.transform);
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
    if (!newDate) return date;
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
  if (isValidLocation(geopos) && (config.location === true || config.formFields.location === true) && config.follow === "zenith")
    setTimeout(() => {
      console.log(geopos);
      setPosition(geopos);
    }, 1000);
}
﻿
let gmdat = {
  "sol": 0.0002959122082855911025,  // AU^3/d^2
  "mer": 164468599544771, //km^3/d^2
  "ven": 2425056445892137,
  "ter": 2975536307796296,
  "lun": 36599199229256,
  "mar": 319711652803400,
  "cer": 467549107200,
  "ves": 129071530155,
  "jup": 945905718740635000,
  "sat": 283224952705891000,
  "ura": 43256077238632300,
  "nep": 51034401552155700,
  "plu": 7327611364884,
  "eri": 8271175680000
},


symbols = {
  "sol":"\u2609", "mer":"\u263f", "ven":"\u2640", "ter":"\u2295", "lun":"\u25cf", "mar":"\u2642", "cer":"\u26b3", 
  "ves":"\u26b6", "jup":"\u2643", "sat":"\u2644", "ura":"\u2645", "nep":"\u2646", "plu":"\u2647", "eri":"\u26aa"
}, 

ε = 23.43928 * deg2rad,
sinε = Math.sin(ε),
cosε = Math.cos(ε),
kelements = ["a","e","i","w","M","L","W","N","n","ep","ref","lecl","becl","Tilt"];
/*
    ep = epoch (iso-date)
    N = longitude of the ascending node (deg) Ω
    i = inclination to the refrence plane, default:ecliptic (deg) 
    w = argument of periapsis (deg)  ω
    a = semi-major axis, or mean distance from parent body (AU,km)
    e = eccentricity (0=circle, 0-1=ellipse, 1=parabola, >1=hyperbola ) (-)
    M = mean anomaly (0 at periapsis; increases uniformly with time) (deg)
    n = mean daily motion = 360/P (deg/day)
    
    W = N + w  = longitude of periapsis ϖ
    L = M + W  = mean longitude
    q = a*(1-e) = periapsis distance
    Q = a*(1+e) = apoapsis distance
    P = 2π * sqrt(a^3/GM) = orbital period (years)
    T = Epoch_of_M - (M(deg)/360_deg) / P  = time of periapsis
    v = true anomaly (angle between position and periapsis) ν
    E = eccentric anomaly
    
    Mandatory: a, e, i, N, w|W, M|L, dM|n
    
*/

let Kepler = function () {
  let gm = gmdat.sol, 
      parentBody = "sol", 
      elem = {}, dat = {},
      id, name, symbol;


  function kepler(date) {
    dates(date);
    if (id === "sol") {
      dat.ephemeris.x = 0;
      dat.ephemeris.y = 0;
      dat.ephemeris.z = 0;
      dat.ephemeris.mag = -6;
      return kepler;
    }
    coordinates();
    return kepler;
  }

  let dates = function(date) {
    let dt, de = dat.ephemeris = {};
    if (date) {
      if (date instanceof Date) { dt = new Date(date.valueOf()); }
      else { dt = dateParse(date); }
    }
    if (!dt) { dt = new Date(); }
    de.jd = JD(dt);
      
    dt = dateParse(elem.ep);
    if (!dt) dt = dateParse("2000-01-01");
    de.jd0 = JD(dt);
    de.d = de.jd - de.jd0;
    de.cy = de.d / 36525;
  };

  let coordinates = function() {
    let key, de = dat.ephemeris;
    if (id === "lun") {
      de = moon_elements(de);
      if (!de) return;
    } else {
      for (let i=0; i<kelements.length; i++) {
        key = kelements[i];
        if (!has(elem, key)) continue; 
        if (has(elem, "d"+key)) {
          de[key] = elem[key] + elem["d"+key] * de.cy;
        } else if (has(elem, key)) {
          de[key] = elem[key];
        }
      }
      if (has(de, "M") && !has(de, "dM") && has(de, "n")) {
        de.M += (de.n * de.d);
      }
    }
    derive();
    trueAnomaly();
    cartesian();    
  };

  kepler.cartesian = function() {
    return dat;    
  };

  kepler.spherical = function() {
    spherical();
    return dat;    
  };

  kepler.equatorial = function(pos) {
    equatorial(pos);
    return dat;    
  };

  kepler.transpose = function() {
    transpose(dat);
    return dat;    
  };
  
  kepler.elements = function(_) {
    let key;
    
    if (!arguments.length || arguments[0] === undefined) return kepler;
    
    for (let i=0; i<kelements.length; i++) {
      key = kelements[i];
      if (!has(_, key)) continue; 
      elem[key] = _[key];
      
      if (key === "a" || key === "e") elem[key] *= 1.0; 
      else if (key !== "ref" && key !== "ep") elem[key] *= deg2rad;

      if (has(_, "d" + key)) {
        key = "d" + key;
        elem[key] = _[key];
        if (key === "da" || key === "de") elem[key] *= 1.0; 
        else elem[key] *= deg2rad;
      } 
    }
    return kepler;
  };

  kepler.params = function(_) {
    if (!arguments.length) return kepler; 
    for (let par in _) {
      if (!has(_, par)) continue;
      if (_[par] === "elements") continue;
      dat[par] = _[par];
    }
    return kepler;
  };
  

  kepler.parentBody = function(_) {
    if (!arguments.length) return parentBody; 
    parentBody = _;
    gm = gmdat[parentBody];
    return kepler;
  };

  kepler.id = function(_) {
    if (!arguments.length) return id; 
    id = _;
    symbol = symbols[_];
    return kepler;
  };

  kepler.Name = function(_) {
    if (!arguments.length) return name; 
    name = _;
    return kepler;
  };

  kepler.symbol = function(_) {
    if (!arguments.length) return symbol; 
    symbol = symbols[_];
    return kepler;
  };

  
  function near_parabolic(E, e) {
    let anom2 = e > 1.0 ? E*E : -E*E,
        term = e * anom2 * E / 6.0,
        rval = (1.0 - e) * E - term,
        n = 4;

    while(Math.abs(term) > 1e-15) {
      term *= anom2 / (n * (n + 1));
      rval -= term;
      n += 2;
    }
    return(rval);
  }

  function anomaly() {
    let de = dat.ephemeris,
        curr, err, trial, tmod,
        e = de.e, M = de.M,
        thresh = 1e-8,
        offset = 0.0, 
        delta_curr = 1.9, 
        is_negative = false, 
        n_iter = 0;

    if (!M) return(0.0); 

    if (e < 1.0) {
      if (M < -Math.PI || M > Math.PI) {
        tmod = Trig.normalize0(M);
        offset = M - tmod;
        M = tmod;
      }

      if (e < 0.9) {   
        curr = Math.atan2(Math.sin(M), Math.cos(M) - e);
        do {
          err = (curr - e * Math.sin(curr) - M) / (1.0 - e * Math.cos(curr));
          curr -= err;
        } while (Math.abs(err) > thresh);
        return curr; // + offset;
      }
    }

    if ( M < 0.0) {
      M = -M;
      is_negative = true;
    }

    curr = M;
    thresh = thresh * Math.abs(1.0 - e);
               /* Due to roundoff error,  there's no way we can hope to */
               /* get below a certain minimum threshhold anyway:        */
    if ( thresh < 1e-15) { thresh = 1e-15; }
    if ( (e > 0.8 && M < Math.PI / 3.0) || e > 1.0) {   /* up to 60 degrees */
      trial = M / Math.abs( 1.0 - e);

      if (trial * trial > 6.0 * Math.abs(1.0 - e)) {  /* cubic term is dominant */
        if (M < Math.PI) {
          trial = Math.pow(6.0 * M, 1/3);
        } else {       /* hyperbolic w/ 5th & higher-order terms predominant */
          trial = Trig.asinh( M / e);
        }
      }
      curr = trial;
    }
    if (e > 1.0 && M > 4.0) {   /* hyperbolic, large-mean-anomaly case */
      curr = Math.log(M);
    }
    if (e < 1.0) {
      while(Math.abs(delta_curr) > thresh) {
        if ( n_iter++ > 8) {
          err = near_parabolic(curr, e) - M;
        } else {
          err = curr - e * Math.sin(curr) - M;
        }
        delta_curr = -err / (1.0 - e * Math.cos(curr));
        curr += delta_curr;
      }
    } else {
      while (Math.abs(delta_curr) > thresh) {
        if (n_iter++ > 7) {
          err = -near_parabolic(curr, e) - M;
        } else {
          err = e * Trig.sinh(curr) - curr - M;
        }
        delta_curr = -err / (e * Trig.cosh(curr) - 1.0);
        curr += delta_curr;
      }
    }
    return( is_negative ? offset - curr : offset + curr);
  }

  function trueAnomaly() {
    let x, y, r0, g, t, de = dat.ephemeris;

    if (de.e === 1.0) {   /* parabolic */
      t = de.jd0 - de.T;
      g = de.w0 * t * 0.5;

      y = Math.pow(g + Math.sqrt(g * g + 1.0), 1/3);
      de.v = 2.0 * Math.atan(y - 1.0 / y);
    } else {          /* got the mean anomaly;  compute eccentric,  then true */
      de.E = anomaly();
      if (de.e > 1.0) {    /* hyperbolic case */
        x = (de.e - Trig.cosh(de.E));
        y = Trig.sinh(de.E);
      } else {          /* elliptical case */
        x = (Math.cos(de.E) - de.e);
        y =  Math.sin(de.E);
      }
      y *= Math.sqrt(Math.abs(1.0 - de.e * de.e));
      de.v = Math.atan2(y, x);
    }

    r0 = de.q * (1.0 + de.e);
    de.r = r0 / (1.0 + de.e * Math.cos(de.v));
  }

  function derive() {
    let de = dat.ephemeris;
    if (!de.hasOwnProperty("w")) {
      de.w = de.W - de.N;
    }
    if (!de.hasOwnProperty("M")) {
      de.M = de.L - de.W;
    }
    if (de.e < 1.0) { de.M = Trig.normalize0(de.M); }
    //de.P = Math.pow(Math.abs(de.a), 1.5);
    de.P = τ * Math.sqrt(Math.pow(de.a, 3) / gm) / 365.25;
    de.T = de.jd0 - (de.M / halfπ) / de.P;

    if (de.e !== 1.0) {   /* for non-parabolic orbits: */
     de.q = de.a * (1.0 - de.e);
     de.t0 = de.a * Math.sqrt(Math.abs(de.a) / gm);
    } else {
     de.w0 = (3.0 / Math.sqrt(2)) / (de.q * Math.sqrt(de.q / gm));
     de.a = 0.0;
     de.t0 = 0.0;
    }
    de.am = Math.sqrt(gm * de.q * (1.0 + de.e));
  }

  function transpose() {
    let de = dat.ephemeris;
    if (!de.ref || de.ref === "ecl") {
      de.tx = de.x;
      de.ty = de.y;
      de.tz = de.z;
      return;
    }
    let a0 = de.lecl,// - Math.PI/2,
        a1 = Math.PI/2 - de.becl,
        angles = [0, a1, -a0];
    transform(de, angles);
    let tp =  Trig.cartesian([de.tl, de.tb, de.r]);
    de.tx = tp.x;
    de.ty = tp.y;
    de.tz = tp.z;
  }

  function equatorial(pos) {
    let de = dat.ephemeris, pe = pos.ephemeris;
    ε = (23.439292 - 0.0130042 * de.cy - 1.667e-7 * de.cy * de.cy + 5.028e-7 * de.cy * de.cy * de.cy) * deg2rad;
    sinε = Math.sin(ε);
    cosε = Math.cos(ε);
    let o = (id === "lun") ? {x:0, y:0, z:0} : {x:pe.x, y:pe.y, z:pe.z};
    de.xeq = de.x - o.x;
    de.yeq = (de.y - o.y) * cosε - (de.z - o.z) * sinε;
    de.zeq = (de.y - o.y) * sinε + (de.z - o.z) * cosε;

    de.ra = Trig.normalize(Math.atan2(de.yeq, de.xeq));
    de.dec = Math.atan2(de.zeq, Math.sqrt(de.xeq*de.xeq + de.yeq*de.yeq));
    if (id === "lun") de = moon_corr(de, pe);
    de.pos = [de.ra / deg2rad, de.dec / deg2rad];
    de.rt = Math.sqrt(de.xeq*de.xeq + de.yeq*de.yeq + de.zeq*de.zeq);
    if (id !== "sol") de.mag = magnitude();
  }

  function magnitude() {
    let de = dat.ephemeris,
        rs = de.r, rt = de.rt,
        a = Math.acos((rs*rs + rt*rt - 1) / (2 * rs * rt)),
        q = 0.666 *((1-a/Math.PI) * Math.cos(a) + 1 / Math.PI * Math.sin(a)),
        m = dat.H * 1 + 5 * Math.log(rs*rt) * Math.LOG10E - 2.5 * Math.log(q) * Math.LOG10E;
        
    return m;
  }

  function cartesian() {
    let de = dat.ephemeris,
        u = de.v + de.w;
    de.x = de.r * (Math.cos(de.N) * Math.cos(u) - Math.sin(de.N) * Math.sin(u) * Math.cos(de.i));
    de.y = de.r * (Math.sin(de.N) * Math.cos(u) + Math.cos(de.N) * Math.sin(u) * Math.cos(de.i));
    de.z = de.r * (Math.sin(u) * Math.sin(de.i));
    return dat;
  }

  function spherical() {
    let de = dat.ephemeris,
        lon = Math.atan2(de.y, de.x),
        lat = Math.atan2(de.z, Math.sqrt(de.x*de.x + de.y*de.y));
    de.l = Trig.normalize(lon);
    de.b = lat;
    return dat; 
  }

  function transform(angles) {
    
  }

  function polar2cart(pos) {
    let rclat = Math.cos(pos.lat) * pos.r;
    pos.x = rclat * Math.cos(pos.lon);
    pos.y = rclat * Math.sin(pos.lon);
    pos.z = pos.r * Math.sin(pos.lat);
    return pos;
  }

  
  function JD(dt) {  
    let yr = dt.getUTCFullYear(),
        mo = dt.getUTCMonth() + 1,
        dy = dt.getUTCDate(),
        frac = (dt.getUTCHours() - 12 + dt.getUTCMinutes()/60.0 + dt.getUTCSeconds()/3600.0) / 24, 
        IYMIN = -4799;        /* Earliest year allowed (4800BC) */

    if (yr < IYMIN) return -1; 
    let a = Math.floor((14 - mo) / 12),
        y = yr + 4800 - a,
        m = mo + (12 * a) - 3;
    let jdn = dy + Math.floor((153 * m + 2)/5) + (365 * y) + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    return jdn + frac;   
  }

  function mst(lon) {
    let l = lon || 0;  // lon=0 -> gmst
    return (18.697374558 + 24.06570982441908 * dat.ephemeris.d) * 15 + l;
  }
  
    
  function observer(pos) {
    let flat = 298.257223563,    // WGS84 flattening of earth
        re = 6378.137,           // GRS80/WGS84 semi major axis of earth ellipsoid
        h = pos.h || 0,
        cart = {},
        gmst = mst();
    
    let cosl = Math.cos(pos.lat),
        sinl = Math.sin(pos.lat),
        fl = 1.0 - 1.0 / flat;
    let fl2 = fl * fl;
    
    let u = 1.0 / Math.sqrt (cosl * cosl + fl2 * sinl * sinl),
        a = re * u + h,
        b = re * fl2 * u + h,
        r = Math.sqrt (a * a * cosl * cosl + b * b * sinl * sinl); // geocentric distance from earth center

    cart.lat = Math.acos (a * cosl / r); 
    cart.lon = pos.lon; 
    cart.r = h;
    
    if (pos.lat < 0.0) cart.lat *= -1; 

    polar2cart(cart); 

    // rotate around earth's polar axis to align coordinate system from Greenwich to vernal equinox
    let angle = gmst * deg2rad; // sideral time gmst given in hours. Convert to radians

    cart.x = cart.x * Math.cos(angle) - cart.y * Math.sin(angle);
    cart.y = cart.x * Math.sin(angle) + cart.y * Math.cos(angle);
    return(cart);
  }

  function moon_elements(dat) {
    if ((typeof Moon !== "undefined")) return Moon.elements(dat);
  }
  
  function moon_corr(dat, pos) {
    spherical();
    if ((typeof Moon !== "undefined")) return Moon.corr(dat, pos);
  }

  return kepler;  
};﻿
let Moon = {
  elements: function(dat) {
    let t = (dat.jd - 2451545) / 36525,
        t2 = t * t,
        t3 = t * t2,
        t4 = t * t3,
        t5 = t * t4,
        t2e4 = t2 * 1e-4,
        t3e6 = t3 * 1e-6,
        t4e8 = t4 * 1e-8;

    // semimajor axis
    let sa = 3400.4 * Math.cos(deg2rad * (235.7004 + 890534.2230 * t - 32.601 * t2e4 
        + 3.664 * t3e6 - 1.769 * t4e8)) 
        - 635.6 * Math.cos(deg2rad * (100.7370 + 413335.3554 * t - 122.571 * t2e4 
        - 10.684 * t3e6 + 5.028 * t4e8)) 
        - 235.6 * Math.cos(deg2rad * (134.9634 + 477198.8676 * t + 89.970 * t2e4 
        + 14.348 * t3e6 - 6.797 * t4e8)) 
        + 218.1 * Math.cos(deg2rad * (238.1713 +  854535.1727 * t - 31.065 * t2e4 
        + 3.623 * t3e6  - 1.769 * t4e8)) 
        + 181.0 * Math.cos(deg2rad * (10.6638 + 1367733.0907 * t + 57.370 * t2e4 
        + 18.011 * t3e6 - 8.566 * t4e8)) 
        - 39.9 * Math.cos(deg2rad * (103.2079 + 377336.3051 * t - 121.035 * t2e4 
        - 10.724 * t3e6 + 5.028 * t4e8)) 
        - 38.4 * Math.cos(deg2rad * (233.2295 + 926533.2733 * t - 34.136 * t2e4 
        + 3.705 * t3e6 - 1.769 * t4e8)) 
        + 33.8 * Math.cos(deg2rad * (336.4374 + 1303869.5784 * t - 155.171 * t2e4 
        - 7.020 * t3e6 + 3.259 * t4e8)) 
        + 28.8 * Math.cos(deg2rad * (111.4008 + 1781068.4461 * t - 65.201 * t2e4 
        + 7.328 * t3e6 - 3.538 * t4e8)) 
        + 12.6 * Math.cos(deg2rad * (13.1347 + 1331734.0404 * t + 58.906 * t2e4 
        + 17.971 * t3e6 - 8.566 * t4e8)) 
        + 11.4 * Math.cos(deg2rad * (186.5442 + 966404.0351 * t - 68.058 * t2e4 
        - 0.567 * t3e6 + 0.232 * t4e8)) 
        - 11.1 * Math.cos(deg2rad * (222.5657 - 441199.8173 * t - 91.506 * t2e4 
        - 14.307 * t3e6 + 6.797 * t4e8)) 
        - 10.2 * Math.cos(deg2rad * (269.9268 + 954397.7353 * t + 179.941 * t2e4 
        + 28.695 * t3e6 - 13.594 * t4e8)) 
        + 9.7 * Math.cos(deg2rad * (145.6272 + 1844931.9583 * t + 147.340 * t2e4 
        + 32.359 * t3e6 - 15.363 * t4e8)) 
        + 9.6 * Math.cos(deg2rad * (240.6422 + 818536.1225 * t - 29.529 * t2e4 
        + 3.582 * t3e6 - 1.769 * t4e8)) 
        + 8.0 * Math.cos(deg2rad * (297.8502 + 445267.1115 * t - 16.300 * t2e4 
        + 1.832 * t3e6 - 0.884 * t4e8)) 
        - 6.2 * Math.cos(deg2rad * (132.4925 + 513197.9179 * t + 88.434 * t2e4 
        + 14.388 * t3e6 - 6.797 * t4e8)) 
        + 6.0 * Math.cos(deg2rad * (173.5506 + 1335801.3346 * t - 48.901 * t2e4 
        + 5.496 * t3e6 - 2.653 * t4e8)) 
        + 3.7 * Math.cos(deg2rad * (113.8717 + 1745069.3958 * t - 63.665 * t2e4 
        + 7.287 * t3e6 - 3.538 * t4e8)) 
        + 3.6 * Math.cos(deg2rad * (338.9083 + 1267870.5281 * t - 153.636 * t2e4 
        - 7.061 * t3e6 + 3.259 * t4e8)) 
        + 3.2 * Math.cos(deg2rad * (246.3642 + 2258267.3137 * t + 24.769 * t2e4 
        + 21.675 * t3e6 - 10.335 * t4e8)) 
        - 3.0 * Math.cos(deg2rad * (8.1929 + 1403732.1410 * t + 55.834 * t2e4 
        + 18.052 * t3e6 - 8.566 * t4e8)) 
        + 2.3 * Math.cos(deg2rad * (98.2661 + 449334.4057 * t - 124.107 * t2e4 
        - 10.643 * t3e6 + 5.028 * t4e8)) 
        - 2.2 * Math.cos(deg2rad * (357.5291 + 35999.0503 * t - 1.536 * t2e4 
        + 0.041 * t3e6 + 0.000 * t4e8)) 
        - 2.0 * Math.cos(deg2rad * (38.5872 + 858602.4669 * t - 138.871 * t2e4 
        - 8.852 * t3e6 + 4.144 * t4e8)) 
        - 1.8 * Math.cos(deg2rad * (105.6788 + 341337.2548 * t - 119.499 * t2e4 
        - 10.765 * t3e6 + 5.028 * t4e8)) 
        - 1.7 * Math.cos(deg2rad * (201.4740 + 826670.7108 * t - 245.142 * t2e4 
        - 21.367 * t3e6 + 10.057 * t4e8)) 
        + 1.6 * Math.cos(deg2rad * (184.1196 + 401329.0556 * t + 125.428 * t2e4 
        + 18.579 * t3e6 - 8.798 * t4e8)) 
        - 1.4 * Math.cos(deg2rad * (308.4192 - 489205.1674 * t + 158.029 * t2e4 
        + 14.915 * t3e6 - 7.029 * t4e8)) 
        + 1.3 * Math.cos(deg2rad * (325.7736 - 63863.5122 * t - 212.541 * t2e4 
        - 25.031 * t3e6 + 11.826 * t4e8));

    let sapp = - 0.55 * Math.cos(deg2rad * (238.2 + 854535.2 * t)) 
        + 0.10 * Math.cos(deg2rad * (103.2 + 377336.3 * t)) 
        + 0.10 * Math.cos(deg2rad * (233.2 + 926533.3 * t));

    let sma = 383397.6 + sa + sapp * t;

    // orbital eccentricity

    let se = 0.014217 * Math.cos(deg2rad * (100.7370 + 413335.3554 * t - 122.571 * t2e4 
        - 10.684 * t3e6 + 5.028 * t4e8)) 
        + 0.008551 * Math.cos(deg2rad * (325.7736 - 63863.5122 * t - 212.541 * t2e4 
        - 25.031 * t3e6 + 11.826 * t4e8)) 
        - 0.001383 * Math.cos(deg2rad * (134.9634 + 477198.8676 * t + 89.970 * t2e4 
        + 14.348 * t3e6 - 6.797 * t4e8)) 
        + 0.001353 * Math.cos(deg2rad * (10.6638 + 1367733.0907 * t + 57.370 * t2e4 
        + 18.011 * t3e6 - 8.566 * t4e8)) 
        - 0.001146 * Math.cos(deg2rad * (66.5106 + 349471.8432 * t - 335.112 * t2e4 
        - 35.715 * t3e6 + 16.854 * t4e8)) 
        - 0.000915 * Math.cos(deg2rad * (201.4740 + 826670.7108 * t - 245.142 * t2e4 
        - 21.367 * t3e6 + 10.057 * t4e8)) 
        + 0.000869 * Math.cos(deg2rad * (103.2079 + 377336.3051 * t - 121.035 * t2e4 
        - 10.724 * t3e6 + 5.028 * t4e8)) 
        - 0.000628 * Math.cos(deg2rad * (235.7004 + 890534.2230 * t - 32.601 * t2e4 
        + 3.664 * t3e6  - 1.769 * t4e8)) 
        - 0.000393 * Math.cos(deg2rad * (291.5472 - 127727.0245 * t - 425.082 * t2e4 
        - 50.062 * t3e6 + 23.651 * t4e8)) 
        + 0.000284 * Math.cos(deg2rad * (328.2445 - 99862.5625 * t - 211.005 * t2e4 
        - 25.072 * t3e6 + 11.826 * t4e8)) 
        - 0.000278 * Math.cos(deg2rad * (162.8868 - 31931.7561 * t - 106.271 * t2e4 
        - 12.516 * t3e6 + 5.913 * t4e8)) 
        - 0.000240 * Math.cos(deg2rad * (269.9268 + 954397.7353 * t + 179.941 * t2e4 
        + 28.695 * t3e6 - 13.594 * t4e8)) 
        + 0.000230 * Math.cos(deg2rad * (111.4008 + 1781068.4461 * t - 65.201 * t2e4 
        + 7.328 * t3e6  - 3.538 * t4e8)) 
        + 0.000229 * Math.cos(deg2rad * (167.2476 + 762807.1986 * t - 457.683 * t2e4 
        - 46.398 * t3e6 + 21.882 * t4e8)) 
        - 0.000202 * Math.cos(deg2rad * ( 83.3826 - 12006.2998 * t + 247.999 * t2e4 
        + 29.262 * t3e6 - 13.826 * t4e8)) 
        + 0.000190 * Math.cos(deg2rad * (190.8102 - 541062.3799 * t - 302.511 * t2e4 
        - 39.379 * t3e6 + 18.623 * t4e8)) 
        + 0.000177 * Math.cos(deg2rad * (357.5291 + 35999.0503 * t - 1.536 * t2e4 
        + 0.041 * t3e6 + 0.000 * t4e8)) 
        + 0.000153 * Math.cos(deg2rad * (32.2842 + 285608.3309 * t - 547.653 * t2e4 
        - 60.746 * t3e6 + 28.679 * t4e8)) 
        - 0.000137 * Math.cos(deg2rad * (44.8902 + 1431596.6029 * t + 269.911 * t2e4 
        + 43.043 * t3e6 - 20.392 * t4e8)) 
        + 0.000122 * Math.cos(deg2rad * (145.6272 + 1844931.9583 * t + 147.340 * t2e4 
        + 32.359 * t3e6 - 15.363 * t4e8)) 
        + 0.000116 * Math.cos(deg2rad * (302.2110 + 1240006.0662 * t - 367.713 * t2e4 
        - 32.051 * t3e6 + 15.085 * t4e8)) 
        - 0.000111 * Math.cos(deg2rad * (203.9449 + 790671.6605 * t - 243.606 * t2e4 
        - 21.408 * t3e6 + 10.057 * t4e8)) 
        - 0.000108 * Math.cos(deg2rad * (68.9815 + 313472.7929 * t - 333.576 * t2e4 
        - 35.756 * t3e6 + 16.854 * t4e8)) 
        + 0.000096 * Math.cos(deg2rad * (336.4374 + 1303869.5784 * t - 155.171 * t2e4 
        - 7.020 * t3e6 + 3.259 * t4e8)) 
        - 0.000090 * Math.cos(deg2rad * (98.2661 + 449334.4057 * t - 124.107 * t2e4 
        - 10.643 * t3e6 + 5.028 * t4e8)) 
        + 0.000090 * Math.cos(deg2rad * (13.1347 + 1331734.0404 * t + 58.906 * t2e4 
        + 17.971 * t3e6 - 8.566 * t4e8)) 
        + 0.000056 * Math.cos(deg2rad * (55.8468 - 1018261.2475 * t - 392.482 * t2e4 
        - 53.726 * t3e6 + 25.420 * t4e8)) 
        - 0.000056 * Math.cos(deg2rad * (238.1713 + 854535.1727 * t - 31.065 * t2e4 
        + 3.623 * t3e6 - 1.769 * t4e8)) 
        + 0.000052 * Math.cos(deg2rad * (308.4192 - 489205.1674 * t + 158.029 * t2e4 
        + 14.915 * t3e6 - 7.029 * t4e8)) 
        - 0.000050 * Math.cos(deg2rad * (133.0212 + 698943.6863 * t - 670.224 * t2e4 
        - 71.429 * t3e6 + 33.708 * t4e8)) 
        - 0.000049 * Math.cos(deg2rad * (267.9846 + 1176142.5540 * t - 580.254 * t2e4 
        - 57.082 * t3e6 + 26.911 * t4e8)) 
        - 0.000049 * Math.cos(deg2rad * (184.1196 + 401329.0556 * t + 125.428 * t2e4 
        + 18.579 * t3e6 - 8.798 * t4e8)) 
        - 0.000045 * Math.cos(deg2rad * (49.1562 - 75869.8120 * t + 35.458 * t2e4 
        + 4.231 * t3e6 - 2.001 * t4e8)) 
        + 0.000044 * Math.cos(deg2rad * (257.3208 - 191590.5367 * t - 637.623 * t2e4 
        - 75.093 * t3e6 + 35.477 * t4e8)) 
        + 0.000042 * Math.cos(deg2rad * (105.6788 + 341337.2548 * t - 119.499 * t2e4 
        - 10.765 * t3e6 + 5.028 * t4e8)) 
        + 0.000042 * Math.cos(deg2rad * (160.4159 + 4067.2942 * t - 107.806 * t2e4 
        - 12.475 * t3e6 + 5.913 * t4e8)) 
        + 0.000040 * Math.cos(deg2rad * (246.3642 + 2258267.3137 * t + 24.769 * t2e4 
        + 21.675 * t3e6 - 10.335 * t4e8)) 
        - 0.000040 * Math.cos(deg2rad * (156.5838 - 604925.8921 * t - 515.053 * t2e4 
        - 64.410 * t3e6 + 30.448 * t4e8)) 
        + 0.000036 * Math.cos(deg2rad * (169.7185 + 726808.1483 * t - 456.147 * t2e4 
        - 46.439 * t3e6 + 21.882 * t4e8)) 
        + 0.000029 * Math.cos(deg2rad * (113.8717 + 1745069.3958 * t - 63.665 * t2e4 
        + 7.287 * t3e6 - 3.538 * t4e8)) 
        - 0.000029 * Math.cos(deg2rad * (297.8502 + 445267.1115 * t - 16.300 * t2e4 
        + 1.832 * t3e6 - 0.884 * t4e8)) 
        - 0.000028 * Math.cos(deg2rad * (294.0181 - 163726.0747 * t - 423.546 * t2e4 
        - 50.103 * t3e6 + 23.651 * t4e8)) 
        + 0.000027 * Math.cos(deg2rad * (263.6238 + 381403.5993 * t - 228.841 * t2e4 
        - 23.199 * t3e6 + 10.941 * t4e8)) 
        - 0.000026 * Math.cos(deg2rad * (358.0578 + 221744.8187 * t - 760.194 * t2e4 
        - 85.777 * t3e6 + 40.505 * t4e8)) 
        - 0.000026 * Math.cos(deg2rad * (8.1929 + 1403732.1410 * t + 55.834 * t2e4 
        + 18.052 * t3e6 - 8.566 * t4e8));

    let sedp = -0.0022 * Math.cos(deg2rad * (103.2 + 377336.3 * t));

    let ecc = 0.055544 + se + 1e-3 * t * sedp;

    // sine of half the inclination

    let sg = 0.0011776 * Math.cos(deg2rad * (49.1562 - 75869.8120 * t + 35.458 * t2e4 
        + 4.231 * t3e6 - 2.001 * t4e8)) 
        - 0.0000971 * Math.cos(deg2rad * (235.7004 + 890534.2230 * t - 32.601 * t2e4 
        + 3.664 * t3e6 - 1.769 * t4e8)) 
        + 0.0000908 * Math.cos(deg2rad * (186.5442 + 966404.0351 * t - 68.058 * t2e4 
        - 0.567 * t3e6 + 0.232 * t4e8)) 
        + 0.0000623 * Math.cos(deg2rad * (83.3826 - 12006.2998 * t + 247.999 * t2e4 
        + 29.262 * t3e6 - 13.826 * t4e8)) 
        + 0.0000483 * Math.cos(deg2rad * (51.6271 - 111868.8623 * t + 36.994 * t2e4 
        + 4.190 * t3e6 - 2.001 * t4e8)) 
        + 0.0000348 * Math.cos(deg2rad * (100.7370 + 413335.3554 * t - 122.571 * t2e4 
        - 10.684 * t3e6 + 5.028 * t4e8)) 
        - 0.0000316 * Math.cos(deg2rad * (308.4192 - 489205.1674 * t + 158.029 * t2e4 
        + 14.915 * t3e6 - 7.029 * t4e8)) 
        - 0.0000253 * Math.cos(deg2rad * (46.6853 - 39870.7617 * t + 33.922 * t2e4 
        + 4.272 * t3e6 - 2.001 * t4e8)) 
        - 0.0000141 * Math.cos(deg2rad * (274.1928 - 553068.6797 * t - 54.513 * t2e4 
        - 10.116 * t3e6 + 4.797 * t4e8)) 
        + 0.0000127 * Math.cos(deg2rad * (325.7736 - 63863.5122 * t - 212.541 * t2e4 
        - 25.031 * t3e6 + 11.826 * t4e8)) 
        + 0.0000117 * Math.cos(deg2rad * (184.1196 + 401329.0556 * t + 125.428 * t2e4 
        + 18.579 * t3e6 - 8.798 * t4e8)) 
        - 0.0000078 * Math.cos(deg2rad * (98.3124 - 151739.6240 * t + 70.916 * t2e4 
        + 8.462 * t3e6 - 4.001 * t4e8)) 
        - 0.0000063 * Math.cos(deg2rad * (238.1713 + 854535.1727 * t - 31.065 * t2e4 
        + 3.623 * t3e6 - 1.769 * t4e8)) 
        + 0.0000063 * Math.cos(deg2rad * (134.9634 + 477198.8676 * t + 89.970 * t2e4 
        + 14.348 * t3e6 - 6.797 * t4e8)) 
        + 0.0000036 * Math.cos(deg2rad * (321.5076 + 1443602.9027 * t + 21.912 * t2e4 
        + 13.780 * t3e6 - 6.566 * t4e8)) 
        - 0.0000035 * Math.cos(deg2rad * (10.6638 + 1367733.0907 * t + 57.370 * t2e4 
        + 18.011 * t3e6 - 8.566 * t4e8)) 
        + 0.0000024 * Math.cos(deg2rad * (149.8932 + 337465.5434 * t - 87.113 * t2e4 
        - 6.453 * t3e6 + 3.028 * t4e8)) 
        + 0.0000024 * Math.cos(deg2rad * (170.9849 - 930404.9848 * t + 66.523 * t2e4 
        + 0.608 * t3e6 - 0.232 * t4e8));

    let sgp = - 0.0203 * Math.cos(deg2rad * (125.0 - 1934.1 * t)) 
        + 0.0034 * Math.cos(deg2rad * (220.2 - 1935.5 * t));

    let gamma = 0.0449858 + sg + 1e-3 * sgp;

    // longitude of perigee

    let sp = - 15.448 * Math.sin(deg2rad * (100.7370 + 413335.3554 * t - 122.571 * t2e4 
        - 10.684 * t3e6 + 5.028 * t4e8))
        - 9.642 * Math.sin(deg2rad * (325.7736 - 63863.5122 * t - 212.541 * t2e4 
        - 25.031 * t3e6 + 11.826 * t4e8)) 
        - 2.721 * Math.sin(deg2rad * (134.9634 + 477198.8676 * t + 89.970 * t2e4 
        + 14.348 * t3e6 - 6.797 * t4e8)) 
        + 2.607 * Math.sin(deg2rad * (66.5106 + 349471.8432 * t - 335.112 * t2e4 
        - 35.715 * t3e6 + 16.854 * t4e8)) 
        + 2.085 * Math.sin(deg2rad * (201.4740 + 826670.7108 * t - 245.142 * t2e4 
        - 21.367 * t3e6 + 10.057 * t4e8)) 
        + 1.477 * Math.sin(deg2rad * (10.6638 + 1367733.0907 * t + 57.370 * t2e4 
        + 18.011 * t3e6 - 8.566 * t4e8)) 
        + 0.968 * Math.sin(deg2rad * (291.5472 - 127727.0245 * t - 425.082 * t2e4 
        - 50.062 * t3e6 + 23.651 * t4e8)) 
        - 0.949 * Math.sin(deg2rad * (103.2079 + 377336.3051 * t - 121.035 * t2e4 
        - 10.724 * t3e6 + 5.028 * t4e8)) 
        - 0.703 * Math.sin(deg2rad * (167.2476 + 762807.1986 * t - 457.683 * t2e4 
        - 46.398 * t3e6 + 21.882 * t4e8)) 
        - 0.660 * Math.sin(deg2rad * (235.7004 + 890534.2230 * t - 32.601 * t2e4 
        + 3.664 * t3e6 - 1.769 * t4e8)) 
        - 0.577 * Math.sin(deg2rad * (190.8102 - 541062.3799 * t - 302.511 * t2e4 
        - 39.379 * t3e6 + 18.623 * t4e8)) 
        - 0.524 * Math.sin(deg2rad * (269.9268 + 954397.7353 * t + 179.941 * t2e4 
        + 28.695 * t3e6 - 13.594 * t4e8)) 
        - 0.482 * Math.sin(deg2rad * (32.2842 + 285608.3309 * t - 547.653 * t2e4 
        - 60.746 * t3e6 + 28.679 * t4e8)) 
        + 0.452 * Math.sin(deg2rad * (357.5291 + 35999.0503 * t - 1.536 * t2e4 
        + 0.041 * t3e6 + 0.000 * t4e8)) 
        - 0.381 * Math.sin(deg2rad * (302.2110 + 1240006.0662 * t - 367.713 * t2e4 
        - 32.051 * t3e6 + 15.085 * t4e8)) 
        - 0.342 * Math.sin(deg2rad * (328.2445 - 99862.5625 * t - 211.005 * t2e4 
        - 25.072 * t3e6 + 11.826 * t4e8)) 
        - 0.312 * Math.sin(deg2rad * (44.8902 + 1431596.6029 * t + 269.911 * t2e4 
        + 43.043 * t3e6 - 20.392 * t4e8)) 
        + 0.282 * Math.sin(deg2rad * (162.8868 - 31931.7561 * t - 106.271 * t2e4 
        - 12.516 * t3e6 + 5.913 * t4e8)) 
        + 0.255 * Math.sin(deg2rad * (203.9449 + 790671.6605 * t - 243.606 * t2e4 
        - 21.408 * t3e6 + 10.057 * t4e8)) 
        + 0.252 * Math.sin(deg2rad * (68.9815 + 313472.7929 * t - 333.576 * t2e4 
        - 35.756 * t3e6 + 16.854 * t4e8)) 
        - 0.211 * Math.sin(deg2rad * (83.3826 - 12006.2998 * t + 247.999 * t2e4 
        + 29.262 * t3e6 - 13.826 * t4e8)) 
        + 0.193 * Math.sin(deg2rad * (267.9846 + 1176142.5540 * t - 580.254 * t2e4 
        - 57.082 * t3e6 + 26.911 * t4e8)) 
        + 0.191 * Math.sin(deg2rad * (133.0212 + 698943.6863 * t - 670.224 * t2e4 
        - 71.429 * t3e6 + 33.708 * t4e8)) 
        - 0.184 * Math.sin(deg2rad * (55.8468 - 1018261.2475 * t - 392.482 * t2e4 
        - 53.726 * t3e6 + 25.420 * t4e8)) 
        + 0.182 * Math.sin(deg2rad * (145.6272 + 1844931.9583 * t + 147.340 * t2e4 
        + 32.359 * t3e6 - 15.363 * t4e8)) 
        - 0.158 * Math.sin(deg2rad * (257.3208 - 191590.5367 * t - 637.623 * t2e4 
        - 75.093 * t3e6 + 35.477 * t4e8)) 
        + 0.148 * Math.sin(deg2rad * (156.5838 - 604925.8921 * t - 515.053 * t2e4 
        - 64.410 * t3e6 + 30.448 * t4e8)) 
        - 0.111 * Math.sin(deg2rad * (169.7185 + 726808.1483 * t - 456.147 * t2e4 
        - 46.439 * t3e6 + 21.882 * t4e8)) 
        + 0.101 * Math.sin(deg2rad * (13.1347 + 1331734.0404 * t + 58.906 * t2e4 
        + 17.971 * t3e6 - 8.566 * t4e8)) 
        + 0.100 * Math.sin(deg2rad * (358.0578 + 221744.8187 * t - 760.194 * t2e4 
        - 85.777 * t3e6 + 40.505 * t4e8)) 
        + 0.087 * Math.sin(deg2rad * (98.2661 + 449334.4057 * t - 124.107 * t2e4 
        - 10.643 * t3e6 + 5.028 * t4e8)) 
        + 0.080 * Math.sin(deg2rad * (42.9480 + 1653341.4216 * t - 490.283 * t2e4 
        - 42.734 * t3e6 + 20.113 * t4e8)) 
        + 0.080 * Math.sin(deg2rad * (222.5657 - 441199.8173 * t - 91.506 * t2e4 
        - 14.307 * t3e6 + 6.797 * t4e8)) 
        + 0.077 * Math.sin(deg2rad * (294.0181 - 163726.0747 * t - 423.546 * t2e4 
        - 50.103 * t3e6 + 23.651 * t4e8)) 
        - 0.073 * Math.sin(deg2rad * (280.8834 - 1495460.1151 * t - 482.452 * t2e4 
        - 68.074 * t3e6 + 32.217 * t4e8)) 
        - 0.071 * Math.sin(deg2rad * (304.6819 + 1204007.0159 * t - 366.177 * t2e4 
        - 32.092 * t3e6 + 15.085 * t4e8)) 
        - 0.069 * Math.sin(deg2rad * (233.7582 + 1112279.0417 * t - 792.795 * t2e4 
        - 82.113 * t3e6 + 38.736 * t4e8)) 
        - 0.067 * Math.sin(deg2rad * (34.7551 + 249609.2807 * t - 546.117 * t2e4 
        - 60.787 * t3e6 + 28.679 * t4e8)) 
        - 0.067 * Math.sin(deg2rad * (263.6238 + 381403.5993 * t - 228.841 * t2e4 
        - 23.199 * t3e6 + 10.941 * t4e8)) 
        + 0.055 * Math.sin(deg2rad * (21.6203 - 1082124.7597 * t - 605.023 * t2e4 
        - 78.757 * t3e6 + 37.246 * t4e8)) 
        + 0.055 * Math.sin(deg2rad * (308.4192 - 489205.1674 * t + 158.029 * t2e4 
        + 14.915 * t3e6 -7.029 * t4e8)) 
        - 0.054 * Math.sin(deg2rad * (8.7216 + 1589477.9094 * t - 702.824 * t2e4 
        - 67.766 * t3e6 + 31.939 * t4e8)) 
        - 0.052 * Math.sin(deg2rad * (179.8536 + 1908795.4705 * t + 359.881 * t2e4 
        + 57.390 * t3e6 - 27.189 * t4e8)) 
        - 0.050 * Math.sin(deg2rad * (98.7948 + 635080.1741 * t - 882.765 * t2e4 
        - 96.461 * t3e6 + 45.533 * t4e8)) 
        - 0.049 * Math.sin(deg2rad * (128.6604 - 95795.2683 * t - 318.812 * t2e4 
        - 37.547 * t3e6 + 17.738 * t4e8)) 
        - 0.047 * Math.sin(deg2rad * (17.3544 + 425341.6552 * t - 370.570 * t2e4 
        - 39.946 * t3e6 + 18.854 * t4e8)) 
        - 0.044 * Math.sin(deg2rad * (160.4159 + 4067.2942 * t - 107.806 * t2e4 
        - 12.475 * t3e6 + 5.913 * t4e8)) 
        - 0.043 * Math.sin(deg2rad * (238.1713 + 854535.1727 * t - 31.065 * t2e4 
        + 3.623 * t3e6 - 1.769 * t4e8)) 
        + 0.042 * Math.sin(deg2rad * (270.4555 + 1140143.5037 * t - 578.718 * t2e4 
        - 57.123 * t3e6 + 26.911 * t4e8)) 
        - 0.042 * Math.sin(deg2rad * (132.4925 + 513197.9179 * t + 88.434 * t2e4 
        + 14.388 * t3e6 - 6.797 * t4e8)) 
        - 0.041 * Math.sin(deg2rad * (122.3573 - 668789.4043 * t - 727.594 * t2e4 
        - 89.441 * t3e6 + 42.274 * t4e8)) 
        - 0.040 * Math.sin(deg2rad * (105.6788 + 341337.2548 * t - 119.499 * t2e4 
        - 10.765 * t3e6 + 5.028 * t4e8)) 
        + 0.038 * Math.sin(deg2rad * (135.4921 + 662944.6361 * t - 668.688 * t2e4 
        - 71.470 * t3e6 + 33.708 * t4e8)) 
        - 0.037 * Math.sin(deg2rad * (242.3910 - 51857.2124 * t - 460.540 * t2e4 
        - 54.293 * t3e6 + 25.652 * t4e8)) 
        + 0.036 * Math.sin(deg2rad * (336.4374 +  1303869.5784 * t - 155.171 * t2e4 
        - 7.020 * t3e6 + 3.259 * t4e8)) 
        + 0.035 * Math.sin(deg2rad * (223.0943 - 255454.0489 * t - 850.164 * t2e4 
        - 100.124 * t3e6 + 47.302 * t4e8)) 
        - 0.034 * Math.sin(deg2rad * (193.2811 - 577061.4302 * t - 300.976 * t2e4 
        - 39.419 * t3e6 + 18.623 * t4e8)) 
        + 0.031 * Math.sin(deg2rad * (87.6023 - 918398.6850 * t - 181.476 * t2e4 
        - 28.654 * t3e6 + 13.594 * t4e8));

    let spp = 2.4 * Math.sin(deg2rad * (103.2 + 377336.3 * t));

    let lp = 83.353 + 4069.0137 * t - 103.238 * t2e4 
        - 12.492 * t3e6 + 5.263 * t4e8 + sp + 1e-3 * t * spp;

    // longitude of the ascending node

    let sr = - 1.4979 * Math.sin(deg2rad * (49.1562 - 75869.8120 * t + 35.458 * t2e4 
        + 4.231 * t3e6 - 2.001 * t4e8)) 
        - 0.1500 * Math.sin(deg2rad * (357.5291 + 35999.0503 * t - 1.536 * t2e4 
        + 0.041 * t3e6 + 0.000 * t4e8)) 
        - 0.1226 * Math.sin(deg2rad * (235.7004 + 890534.2230 * t - 32.601 * t2e4 
        + 3.664 * t3e6 - 1.769 * t4e8)) 
        + 0.1176 * Math.sin(deg2rad * (186.5442 + 966404.0351 * t - 68.058 * t2e4 
        - 0.567 * t3e6 + 0.232 * t4e8)) 
        - 0.0801 * Math.sin(deg2rad * (83.3826 - 12006.2998 * t + 247.999 * t2e4 
        + 29.262 * t3e6 - 13.826 * t4e8)) 
        - 0.0616 * Math.sin(deg2rad * (51.6271 - 111868.8623 * t + 36.994 * t2e4 
        + 4.190 * t3e6 - 2.001 * t4e8)) 
        + 0.0490 * Math.sin(deg2rad * (100.7370 + 413335.3554 * t - 122.571 * t2e4 
        - 10.684 * t3e6 + 5.028 * t4e8)) 
        + 0.0409 * Math.sin(deg2rad * (308.4192 - 489205.1674 * t + 158.029 * t2e4 
        + 14.915 * t3e6 - 7.029 * t4e8)) 
        + 0.0327 * Math.sin(deg2rad * (134.9634 + 477198.8676 * t + 89.970 * t2e4 
        + 14.348 * t3e6 - 6.797 * t4e8)) 
        + 0.0324 * Math.sin(deg2rad * (46.6853 - 39870.7617 * t + 33.922 * t2e4 
        + 4.272 * t3e6 - 2.001 * t4e8)) 
        + 0.0196 * Math.sin(deg2rad * (98.3124 - 151739.6240 * t + 70.916 * t2e4 
        + 8.462 * t3e6 - 4.001 * t4e8)) 
        + 0.0180 * Math.sin(deg2rad * (274.1928 - 553068.6797 * t - 54.513 * t2e4 
        - 10.116 * t3e6 + 4.797 * t4e8)) 
        + 0.0150 * Math.sin(deg2rad * (325.7736 - 63863.5122 * t - 212.541 * t2e4 
        - 25.031 * t3e6 + 11.826 * t4e8)) 
        - 0.0150 * Math.sin(deg2rad * (184.1196 + 401329.0556 * t + 125.428 * t2e4 
        + 18.579 * t3e6 - 8.798 * t4e8)) 
        - 0.0078 * Math.sin(deg2rad * (238.1713 + 854535.1727 * t - 31.065 * t2e4 
        + 3.623 * t3e6 - 1.769 * t4e8)) 
        - 0.0045 * Math.sin(deg2rad * (10.6638 + 1367733.0907 * t + 57.370 * t2e4 
        + 18.011 * t3e6 - 8.566 * t4e8)) 
        + 0.0044 * Math.sin(deg2rad * (321.5076 + 1443602.9027 * t + 21.912 * t2e4 
        + 13.780 * t3e6 - 6.566 * t4e8)) 
        - 0.0042 * Math.sin(deg2rad * (162.8868 - 31931.7561 * t - 106.271 * t2e4 
        - 12.516 * t3e6 + 5.913 * t4e8)) 
        - 0.0031 * Math.sin(deg2rad * (170.9849 - 930404.9848 * t + 66.523 * t2e4 
        + 0.608 * t3e6 - 0.232 * t4e8)) 
        + 0.0031 * Math.sin(deg2rad * (103.2079 + 377336.3051 * t - 121.035 * t2e4 
        - 10.724 * t3e6 + 5.028 * t4e8)) 
        + 0.0029 * Math.sin(deg2rad * (222.6120 - 1042273.8471 * t + 103.516 * t2e4 
        + 4.798 * t3e6 - 2.232 * t4e8)) 
        + 0.0028 * Math.sin(deg2rad * (184.0733 + 1002403.0853 * t - 69.594 * t2e4 
        - 0.526 * t3e6 + 0.232 * t4e8));

    let srp = 25.9 * Math.sin(deg2rad * (125.0 - 1934.1 * t)) 
        - 4.3 * Math.sin(deg2rad * (220.2 - 1935.5 * t));

    let srpp = 0.38 * Math.sin(deg2rad * (357.5 + 35999.1 * t));

    let raan = 125.0446 - 1934.13618 * t + 20.762 * t2e4 
        + 2.139 * t3e6 - 1.650 * t4e8 + sr 
        + 1e-3 * (srp + srpp * t);

    // mean longitude

    let sl = - 0.92581 * Math.sin(deg2rad * (235.7004 + 890534.2230 * t - 32.601 * t2e4 
        + 3.664 * t3e6 - 1.769 * t4e8)) 
        + 0.33262 * Math.sin(deg2rad * (100.7370 + 413335.3554 * t - 122.571 * t2e4 
        - 10.684 * t3e6 + 5.028 * t4e8)) 
        - 0.18402 * Math.sin(deg2rad * (357.5291 + 35999.0503 * t - 1.536 * t2e4 
        + 0.041 * t3e6 + 0.000 * t4e8)) 
        + 0.11007 * Math.sin(deg2rad * (134.9634 + 477198.8676 * t + 89.970 * t2e4 
        + 14.348 * t3e6 - 6.797 * t4e8)) 
        - 0.06055 * Math.sin(deg2rad * (238.1713 + 854535.1727 * t - 31.065 * t2e4 
        + 3.623 * t3e6 - 1.769 * t4e8)) 
        + 0.04741 * Math.sin(deg2rad * (325.7736 - 63863.5122 * t - 212.541 * t2e4 
        - 25.031 * t3e6 + 11.826 * t4e8)) 
        - 0.03086 * Math.sin(deg2rad * (10.6638 + 1367733.0907 * t + 57.370 * t2e4 
        + 18.011 * t3e6 - 8.566 * t4e8)) 
        + 0.02184 * Math.sin(deg2rad * (103.2079 + 377336.3051 * t - 121.035 * t2e4 
        - 10.724 * t3e6 + 5.028 * t4e8)) 
        + 0.01645 * Math.sin(deg2rad * (49.1562 - 75869.8120 * t + 35.458 * t2e4 
        + 4.231 * t3e6 - 2.001 * t4e8)) 
        + 0.01022 * Math.sin(deg2rad * (233.2295 + 926533.2733 * t - 34.136 * t2e4 
        + 3.705 * t3e6 - 1.769 * t4e8)) 
        - 0.00756 * Math.sin(deg2rad * (336.4374 + 1303869.5784 * t - 155.171 * t2e4 
        - 7.020 * t3e6 + 3.259 * t4e8)) 
        - 0.00530 * Math.sin(deg2rad * (222.5657 - 441199.8173 * t - 91.506 * t2e4 
        - 14.307 * t3e6 + 6.797 * t4e8)) 
        - 0.00496 * Math.sin(deg2rad * (162.8868 - 31931.7561 * t - 106.271 * t2e4 
        - 12.516 * t3e6 + 5.913 * t4e8)) 
        - 0.00472 * Math.sin(deg2rad * (297.8502 + 445267.1115 * t - 16.300 * t2e4 
        + 1.832 * t3e6 - 0.884 * t4e8)) 
        - 0.00271 * Math.sin(deg2rad * (240.6422 + 818536.1225 * t - 29.529 * t2e4 
        + 3.582 * t3e6 - 1.769 * t4e8)) 
        + 0.00264 * Math.sin(deg2rad * (132.4925 + 513197.9179 * t + 88.434 * t2e4 
        + 14.388 * t3e6 - 6.797 * t4e8)) 
        - 0.00254 * Math.sin(deg2rad * (186.5442 + 966404.0351 * t - 68.058 * t2e4 
        - 0.567 * t3e6 + 0.232 * t4e8)) 
        + 0.00234 * Math.sin(deg2rad * (269.9268 + 954397.7353 * t + 179.941 * t2e4 
        + 28.695 * t3e6 - 13.594 * t4e8)) 
        - 0.00220 * Math.sin(deg2rad * (13.1347 + 1331734.0404 * t + 58.906 * t2e4 
        + 17.971 * t3e6 - 8.566 * t4e8)) 
        - 0.00202 * Math.sin(deg2rad * (355.0582 + 71998.1006 * t - 3.072 * t2e4 
        + 0.082 * t3e6 + 0.000 * t4e8)) 
        + 0.00167 * Math.sin(deg2rad * (328.2445 - 99862.5625 * t - 211.005 * t2e4 
        - 25.072 * t3e6 + 11.826 * t4e8)) 
        - 0.00143 * Math.sin(deg2rad * (173.5506 + 1335801.3346 * t - 48.901 * t2e4 
        + 5.496 * t3e6 - 2.653 * t4e8)) 
        - 0.00121 * Math.sin(deg2rad * (98.2661 + 449334.4057 * t - 124.107 * t2e4 
        - 10.643 * t3e6 + 5.028 * t4e8)) 
        - 0.00116 * Math.sin(deg2rad * (145.6272 + 1844931.9583 * t + 147.340 * t2e4 
        + 32.359 * t3e6 - 15.363 * t4e8)) 
        + 0.00102 * Math.sin(deg2rad * (105.6788 + 341337.2548 * t - 119.499 * t2e4 
        - 10.765 * t3e6 + 5.028 * t4e8)) 
        - 0.00090 * Math.sin(deg2rad * (184.1196 + 401329.0556 * t + 125.428 * t2e4 
        + 18.579 * t3e6 - 8.798 * t4e8)) 
        - 0.00086 * Math.sin(deg2rad * (338.9083 + 1267870.5281 * t - 153.636 * t2e4 
        - 7.061 * t3e6 + 3.259 * t4e8)) 
        - 0.00078 * Math.sin(deg2rad * (111.4008 + 1781068.4461 * t - 65.201 * t2e4 
        + 7.328 * t3e6 - 3.538 * t4e8)) 
        + 0.00069 * Math.sin(deg2rad * (323.3027 - 27864.4619 * t - 214.077 * t2e4 
        - 24.990 * t3e6 + 11.826 * t4e8)) 
        + 0.00066 * Math.sin(deg2rad * (51.6271 - 111868.8623 * t + 36.994 * t2e4 
        + 4.190 * t3e6 - 2.001 * t4e8)) 
        + 0.00065 * Math.sin(deg2rad * (38.5872 + 858602.4669 * t - 138.871 * t2e4 
        - 8.852 * t3e6 + 4.144 * t4e8)) 
        - 0.00060 * Math.sin(deg2rad * (83.3826 - 12006.2998 * t + 247.999 * t2e4 
        + 29.262 * t3e6 - 13.826 * t4e8)) 
        + 0.00054 * Math.sin(deg2rad * (201.4740 + 826670.7108 * t - 245.142 * t2e4 
        - 21.367 * t3e6 + 10.057 * t4e8)) 
        - 0.00052 * Math.sin(deg2rad * (308.4192 - 489205.1674 * t + 158.029 * t2e4 
        + 14.915 * t3e6 - 7.029 * t4e8)) 
        + 0.00048 * Math.sin(deg2rad * (8.1929 + 1403732.1410 * t + 55.834 * t2e4 
        + 18.052 * t3e6 - 8.566 * t4e8)) 
        - 0.00041 * Math.sin(deg2rad * (46.6853 - 39870.7617 * t + 33.922 * t2e4 
        + 4.272 * t3e6 - 2.001 * t4e8)) 
        - 0.00033 * Math.sin(deg2rad * (274.1928 - 553068.6797 * t - 54.513 * t2e4 
        - 10.116 * t3e6 + 4.797 * t4e8)) 
        + 0.00030 * Math.sin(deg2rad * (160.4159 + 4067.2942 * t - 107.806 * t2e4 
        - 12.475 * t3e6 + 5.913 * t4e8));

    let slp = 3.96 * Math.sin(deg2rad * (119.7 + 131.8 * t)) 
        + 1.96 * Math.sin(deg2rad * (125.0 - 1934.1 * t));

    let slpp = 0.463 * Math.sin(deg2rad * (357.5 + 35999.1 * t)) 
        + 0.152 * Math.sin(deg2rad * (238.2 + 854535.2 * t)) 
        - 0.071 * Math.sin(deg2rad * (27.8 + 131.8 * t)) 
        - 0.055 * Math.sin(deg2rad * (103.2 + 377336.3 * t)) 
        - 0.026 * Math.sin(deg2rad * (233.2 + 926533.3 * t));

    let slppp = 14 * Math.sin(deg2rad * (357.5 + 35999.1 * t)) 
        + 5 * Math.sin(deg2rad * (238.2 + 854535.2 * t));

    let lambda = 218.31665 + 481267.88134 * t - 13.268 * t2e4 
        + 1.856 * t3e6 - 1.534 * t4e8 + sl 
        + 1e-3 * (slp + slpp * t + slppp * t2e4);

     dat.a = sma;
     dat.e = ecc;
     dat.i = 2.0 * Math.asin(gamma);
     dat.w = Trig.normalize(deg2rad * (lp - raan));
     dat.N = Trig.normalize(deg2rad * raan);
     dat.M = Trig.normalize(deg2rad * (lambda - lp));
     return dat;
  },
  corr: function(dat, sol) {
    let M = Trig.normalize(sol.M + Math.PI),
        w = Trig.normalize(sol.w + Math.PI),
        L = dat.M + dat.w,     // Argument of latitude 
        E = L + dat.N - M - w; // Mean elongation
    
    let lon = 
      -0.022234 * Math.sin(dat.M - 2*E) +  // Evection
       0.011494 * Math.sin(2*E) +          // Variation
      -0.003246 * Math.sin(M) +        // Yearly Equation
      -0.001029 * Math.sin(2*dat.M - 2*E) +
      -9.94838e-4 * Math.sin(dat.M - 2*E + M) +
       9.25025e-4 * Math.sin(dat.M + 2*E) +
       8.02851e-4 * Math.sin(2*E - M) +
       7.15585e-4 * Math.sin(dat.M - M) +
      -6.10865e-4 * Math.sin(E) + 
      -5.41052e-4 * Math.sin(dat.M + M) +
      -2.61799e-4 * Math.sin(2*L - 2*E) +
       1.91986e-4 * Math.sin(dat.M - 4*E);
    dat.ra += lon;
    let lat =
      -0.003019 * Math.sin(L - 2*E) +
      -9.59931e-4 * Math.sin(dat.M - L - 2*E) +
      -8.02851e-4 * Math.sin(dat.M + L - 2*E) +
       5.75958e-4 * Math.sin(L + 2*E) +
       2.96706e-4 * Math.sin(2*dat.M + L);  
    dat.dec += lat;
  
    dat.age = Trig.normalize(dat.l - sol.l + Math.PI);   
    dat.phase = 0.5 * (1 - Math.cos(dat.age));

    return dat;
  }

};// Copyright 2014, Jason Davies, http://www.jasondavies.com
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