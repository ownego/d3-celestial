/* global τ, halfπ, deg2rad, parentElement */
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