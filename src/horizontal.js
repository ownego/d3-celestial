/* global Celestial, deg2rad */
let horizontal = function(dt, pos, loc) {
  //dt: datetime, pos: celestial coordinates [lat,lng], loc: location [lat,lng]  
  let ha = getMST(dt, loc[1]) - pos[0];
  if (ha < 0) ha = ha + 360;
  
  ha  = ha * deg2rad;
  let dec = pos[1] * deg2rad;
  let lat = loc[0] * deg2rad;

  let alt = Math.asin(Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha));
  let az = Math.acos((Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat)));

  if (Math.sin(ha) > 0) az = Math.PI * 2 - az;
  
  return [alt / deg2rad, az / deg2rad, 0];
};

horizontal.inverse = function(dt, hor, loc) {
  
  let alt = hor[0] * deg2rad;
  let az = hor[1] * deg2rad;
  let lat = loc[0] * deg2rad;
   
  let dec = Math.asin((Math.sin(alt) * Math.sin(lat)) + (Math.cos(alt) * Math.cos(lat) * Math.cos(az)));
  let ha = ((Math.sin(alt) - (Math.sin(dec) * Math.sin(lat))) / (Math.cos(dec) * Math.cos(lat))).toFixed(6);
  
  ha = Math.acos(ha);
  ha  = ha / deg2rad;
  
  let ra = getMST(dt, loc[1]) - ha;
  //if (ra < 0) ra = ra + 360;
    
  return [ra, dec / deg2rad, 0];
};

function getMST(dt, lng)
{
    let yr = dt.getUTCFullYear();
    let mo = dt.getUTCMonth() + 1;
    let dy = dt.getUTCDate();
    let h = dt.getUTCHours();
    let m = dt.getUTCMinutes();
    let s = dt.getUTCSeconds();

    if ((mo == 1)||(mo == 2)) {
        yr  = yr - 1;
        mo = mo + 12;
    }

    let a = Math.floor(yr / 100);
    let b = 2 - a + Math.floor(a / 4);
    let c = Math.floor(365.25 * yr);
    let d = Math.floor(30.6001 * (mo + 1));

    // days since J2000.0
    let jd = b + c + d - 730550.5 + dy + (h + m/60.0 + s/3600.0)/24.0;
    
    // julian centuries since J2000.0
    let jt = jd/36525.0;

    // the mean sidereal time in degrees
    let mst = 280.46061837 + 360.98564736629*jd + 0.000387933*jt*jt - jt*jt*jt/38710000 + lng;

    // in degrees modulo 360.0
    if (mst > 0.0) 
        while (mst > 360.0) mst = mst - 360.0;
    else
        while (mst < 0.0)   mst = mst + 360.0;
        
    return mst;
}

Celestial.horizontal = horizontal;
Celestial.ha = function(dt, lng, ra) {
  let ha = getMST(dt, lng) - ra;
  if (ha < 180) ha = ha + 360;
  return ha;
};
