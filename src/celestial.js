/* global module, require, topojson, settings, bvcolor, projections, projectionTween, poles, eulerAngles, euler, getAngles, transformDeg, getData, getPlanets, getPlanet, listConstellations, getConstellationList, getMwbackground, getGridValues, Canvas, halfπ, $, px, Round, has, hasCallback, isArray, isNumber, arrayfy, form, geo, fldEnable, setCenter, interpolateAngle, formats */
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

  form(cfg);

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
