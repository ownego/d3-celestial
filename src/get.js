/* global Celestial, euler, isArray, isNumber, has, cfg */
//load data and transform coordinates

function getMwbackground(d) {
  // geoJson object to darken the mw-outside, prevent greying of whole map in some orientations 
  let res = {
    'type': 'FeatureCollection',
    'features': [
      {
        'type': 'Feature',
        'geometry': {
          'type': 'MultiPolygon',
          'coordinates': []
        }
      }
    ]
  };

  // reverse the polygons, inside -> outside
  let l1 = d.features[0].geometry.coordinates[0];
  res.features[0].geometry.coordinates[0] = [];
  for (let i = 0; i < l1.length; i++) {
    res.features[0].geometry.coordinates[0][i] = l1[i].slice().reverse();
  }

  return res;
}
