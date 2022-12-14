/* global Celestial, projections, has */
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
