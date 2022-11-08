/* global Celestial, settings, globalConfig, formats, formats_all, $, px, has, isNumber, isObject, isArray, findPos, transformDeg, euler, exportSVG, parentElement, cfg, config */

//display settings form in div with id "celestial-form"
function form(cfg) {
  let config = settings.set(cfg);
  let formContainer = `${parentElement} ~ #${config.formcontainer}`;
  let div = d3.select(formContainer);
  //if div doesn't exist, create it
  if (div.size() < 1) {
    //let container = (config.container || "celestial-map");
    div = d3.select(parentElement).select(function () { return this.parentNode; }).append("div").attr("id", config.formcontainer).attr("class", "celestial-form");
  }
}


// Dependend fields relations
let depends = {
  "stars-show": ["stars-limit", "stars-colors", "stars-style-fill", "stars-designation", "stars-propername", "stars-size", "stars-exponent"],
  "stars-designation": ["stars-designationType", "stars-designationLimit"],
  "stars-propername": ["stars-propernameLimit", "stars-propernameType"],
  "dsos-show": ["dsos-limit", "dsos-colors", "dsos-style-fill", "dsos-names", "dsos-size", "dsos-exponent"],
  "dsos-names": ["dsos-namesType", "dsos-nameLimit"],
  "mw-show": ["mw-style-opacity", "mw-style-fill"],
  "constellations-names": ["constellations-namesType"],
  "planets-show": ["planets-symbolType", "planets-names"],
  "planets-names": ["planets-namesType"]
};

function setCenter(ctr) {
  if (ctr === null || ctr.length < 1) ctr = [0, 0, 0];
  if (ctr.length <= 2 || ctr[2] === undefined) ctr[2] = 0;
  settings.set({ center: ctr });
}

function $form(id) { return document.querySelector(`${parentElement} ~ #${cfg.formcontainer}` + " #" + id); }
