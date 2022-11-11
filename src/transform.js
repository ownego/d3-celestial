/* global Celestial, poles, eulerAngles */
let τ = Math.PI * 2,
  halfπ = Math.PI / 2,
  deg2rad = Math.PI / 180;

function getAngles(coords) {
  if (coords === null || coords.length <= 0) return [0, 0, 0];
  let rot = eulerAngles.equatorial;
  if (!coords[2]) coords[2] = 0;
  return [rot[0] - coords[0], rot[1] - coords[1], rot[2] + coords[2]];
}


let euler = {
  "init": function () {
    for (let key in this) {
      if (this[key].constructor == Array) {
        this[key] = this[key].map(function (val) { return val * deg2rad; });
      }
    }
  },
};

euler.init();
Celestial.euler = function () { return euler; };
