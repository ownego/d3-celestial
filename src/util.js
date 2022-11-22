/* global τ, halfπ, deg2rad, parentElement */
const px = (n) => `${n}px`;
const Round = (x, dg) => Math.round(Math.pow(10, dg) * x) / Math.pow(10, dg);
const sign = (x) => x ? (x < 0 ? -1 : 1) : 0;

function has(o, key) { return o !== null && hasOwnProperty.call(o, key); }
function isNumber(n) { return n !== null && !isNaN(parseFloat(n)) && isFinite(n); }
function isArray(o) { return o !== null && Object.prototype.toString.call(o) === "[object Array]"; }

function interpolateAngle(a1, a2, t) {
  a1 = (a1 * deg2rad + τ) % τ;
  a2 = (a2 * deg2rad + τ) % τ;
  if (Math.abs(a1 - a2) > Math.PI) {
    if (a1 > a2) a1 = a1 - τ;
    else if (a2 > a1) a2 = a2 - τ;
  }
  return d3.interpolateNumber(a1 / deg2rad, a2 / deg2rad);
}

let epsilon = 1e-6,
  halfPi = Math.PI / 2,
  quarterPi = Math.PI / 4,
  tau = Math.PI * 2;