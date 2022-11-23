/* global Celestial, projections, has */
//Flipped projection generated on the fly
Celestial.projection = function (projection) {
  let p, raw, forward;

  p = {
    n: "Airy’s Minimum Error",
    arg: Math.PI / 2,
    scale: 360,
    ratio: 1.0,
    clip: true,
  };

  raw = d3.geo.airy.raw(p.arg);

  forward = function (λ, φ) {
    let coords = raw(-λ, φ);
    return coords;
  };

  forward.invert = function (x, y) {
    try {
      let coords = raw.invert(x, y);
      coords[0] = coords && -coords[0];
      return coords;
    } catch (e) { console.log(e); }
  };

  return d3.geo.projection(forward);
};

let eulerAngles = {
  "equatorial": [0.0, 0.0, 0.0]
};

let poles = {
  "equatorial": [0.0, 90.0]
};

Celestial.eulerAngles = function () { return eulerAngles; };
Celestial.poles = function () { return poles; };
