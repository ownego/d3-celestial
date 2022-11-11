/* global Celestial, has */
let hasCallback = false;

Celestial.addCallback = function(dat) {
  Celestial.callback = dat;
  hasCallback = (dat !== null);
};

Celestial.runCallback = function(dat) {
  hasCallback = false; // avoid recursion
  Celestial.callback();
  hasCallback = true;
};