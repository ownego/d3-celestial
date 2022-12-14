/* global Celestial, poles */
let halfπ = Math.PI / 2,
  deg2rad = Math.PI / 180;

function getAngles(coords) {
  if (coords === null || coords.length <= 0) return [0, 0, 0];
  if (!coords[2]) coords[2] = 0;
  return [-coords[0], -coords[1], coords[2]];
}
