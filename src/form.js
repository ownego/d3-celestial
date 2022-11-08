/* global Celestial, settings, globalConfig, formats, formats_all, $, px, has, isNumber, isObject, isArray, findPos, transformDeg, euler, exportSVG, parentElement, cfg, config */
function setCenter(ctr) {
  if (ctr === null || ctr.length < 1) ctr = [0, 0, 0];
  if (ctr.length <= 2 || ctr[2] === undefined) ctr[2] = 0;
  settings.set({ center: ctr });
}
