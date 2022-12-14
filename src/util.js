/* global τ, halfπ, deg2rad, parentElement */
const px = (n) => `${n}px`;
const Round = (x, dg) => Math.round(Math.pow(10, dg) * x) / Math.pow(10, dg);

function has(o, key) { return o !== null && hasOwnProperty.call(o, key); }
function isNumber(n) { return n !== null && !isNaN(parseFloat(n)) && isFinite(n); }
function isArray(o) { return o !== null && Object.prototype.toString.call(o) === "[object Array]"; }
