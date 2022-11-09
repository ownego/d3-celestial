let config = {
    disableAnimations: true,
    width: 1000,
    projection: "airy",    // The one and the only
    projectionRatio: null,   // Optional override for default projection ratio
    transform: "equatorial", // Coordinate transformation: equatorial (default),
    // ecliptic, galactic, supergalactic
    center: null,       // Initial center coordinates in set transform
    // center: this.starMapsCenter,       // Initial center coordinates in set transform
    // [longitude, latitude, orientation] all in degrees
    // null = default center [0,0,0]
    orientationfixed: true,  // Keep orientation angle the same as center[2]
    geopos: [21, 105],       // optional initial geographic position [lat,lon] in degrees,
    // overrides center
    follow: "zenith",   // on which coordinates to center the map, default: zenith, if location enabled,
    // otherwise center
    zoomlevel: null,    // initial zoom level 0...zoomextend; 0|null = default, 1 = 100%, 0 < x <= zoomextend
    zoomextend: 10,     // maximum zoom level
    adaptable: false,    // Sizes are increased with higher zoom-levels
    interactive: false,  // Enable zooming and rotation with mousewheel and dragging, NO
    form: true,         // Display form for interactive settings. Needs a div with
    // id="celestial-form", created automatically if not present
    // This could be done without form, like, listen to change of config object, then extractSVG everytime it changes?
    location: false,    // Display location settings. Deprecated, use formFields below
    formFields: {
        location: true,
        general: true,
        stars: true,
        dsos: true,
        constellations: true,
        lines: true,
        other: true,
        download: true
    },
    advanced: true,     // Display fewer form fields if false
    daterange: [],      // Calender date range; null: displaydate-+10; [n<100]: displaydate-+n; [yr]: yr-+10;
    // [yr, n<100]: [yr-n, yr+n]; [yr0, yr1]
    controls: false,     // Display zoom controls
    lang: "",           // Global language override for names, any name setting that has the chosen language available
    // Default: desig or empty string for designations, other languages as used anywhere else
    culture: "",        // Source of constellations and star names, default "iau", other: "cn" Traditional Chinese
    container: "celestial-map",   // ID of parent element, e.g. div, null = html-body
    formcontainer: "celestial-form",
    datepickcontainer: "celestial-date",
    datapath: "data/",
    stars: {
        show: true,    // Show stars
        limit: 6,      // Show only stars brighter than limit magnitude
        colors: false,  // Show stars in spectral colors, if not use default color, this should be decided by merchant
        style: { fill: "#ffffff", opacity: 1 }, // Default style for stars
        designation: false, // Show star names (Bayer, Flamsteed, Variable star, Gliese or designation,
        // i.e. whichever of the previous applies first); may vary with culture setting
        designationType: "desig",  // Which kind of name is displayed as designation (fieldname in starnames.json)
        designationStyle: { fill: "#ddddbb", font: "11px 'Palatino Linotype', Georgia, Times, 'Times Roman', serif", align: "left", baseline: "top" },
        designationLimit: 2.5,  // Show only names for stars brighter than nameLimit
        propername: false,   // Show proper name (if present)
        propernameType: "name", // Languge for proper name, default IAU name; may vary with culture setting
        // (see list below of languages codes available for stars)
        propernameStyle: { fill: "#ddddbb", font: "13px 'Palatino Linotype', Georgia, Times, 'Times Roman', serif", align: "right", baseline: "bottom" },
        propernameLimit: 1.5,  // Show proper names for stars brighter than propernameLimit
        size: 5,       // Maximum size (radius) of star circle in pixels, this should base on width
        exponent: -0.28, // Scale exponent for star size, larger = more linear
        data: 'stars.6.json' // Data source for stellar data,
        // number indicates limit magnitude
    },
    dsos: {
        show: false,    // Deep sky objects is ugly, hide them
    },
    planets: {  //Show planet locations, if date-time is set, nope, hide all sun, moon and planets, planets are those in solar system
        show: false,
        // List of all objects to show
        which: ["sol", "mer", "ven", "ter", "lun", "mar", "jup", "sat", "ura", "nep"],
        // Font styles for planetary symbols
        symbols: {  // Character and color for each symbol in 'which' above (simple circle: \u25cf), optional size override for Sun & Moon
            "sol": { symbol: "\u2609", letter: "Su", fill: "#ffff00", size: "" },
            "mer": { symbol: "\u263f", letter: "Me", fill: "#cccccc" },
            "ven": { symbol: "\u2640", letter: "V", fill: "#eeeecc" },
            "ter": { symbol: "\u2295", letter: "T", fill: "#00ccff" },
            "lun": { symbol: "\u25cf", letter: "L", fill: "#ffffff", size: "" }, // overridden by generated crecent, except letter & size
            "mar": { symbol: "\u2642", letter: "Ma", fill: "#ff6600" },
            "cer": { symbol: "\u26b3", letter: "C", fill: "#cccccc" },
            "ves": { symbol: "\u26b6", letter: "Ma", fill: "#cccccc" },
            "jup": { symbol: "\u2643", letter: "J", fill: "#ffaa33" },
            "sat": { symbol: "\u2644", letter: "Sa", fill: "#ffdd66" },
            "ura": { symbol: "\u2645", letter: "U", fill: "#66ccff" },
            "nep": { symbol: "\u2646", letter: "N", fill: "#6666ff" },
            "plu": { symbol: "\u2647", letter: "P", fill: "#aaaaaa" },
            "eri": { symbol: "\u26aa", letter: "E", fill: "#eeeeee" }
        },
        symbolStyle: {
            fill: "#00ccff", font: "bold 17px 'Lucida Sans Unicode', Consolas, sans-serif",
            align: "center", baseline: "middle"
        },
        symbolType: "disk",  // Type of planet symbol: 'symbol' graphic planet sign, 'disk' filled circle scaled by magnitude
        // 'letter': 1 or 2 letters S Me V L Ma J S U N     
        names: true,          // Show name in nameType language next to symbol
        nameStyle: { fill: "#00ccff", font: "14px 'Lucida Sans Unicode', Consolas, sans-serif", align: "right", baseline: "top" },
        namesType: "en"     // Language of planet name (see list below of language codes available for planets), 
        // or desig = 3-letter designation
    },
    constellations: {
        names: false,      // Show constellation names, can be toggle
        namesType: "iau", // Type of name Latin (iau, default), 3 letter designation (desig) or other language (see list below)
        nameStyle: {
            fill: "#cccc99", align: "center", baseline: "middle",
            font: ["12px Helvetica, Arial, sans-serif",  // Style for constellations
                "10px Helvetica, Arial, sans-serif",  // Different fonts for diff.
                "8px Helvetica, Arial, sans-serif"]
        },// ranked constellations
        lines: true,   // Show constellation lines, style below
        lineStyle: { stroke: "#cccccc", width: .7, opacity: 0.6 },
        bounds: false, // Show constellation boundaries, style below
        boundStyle: { stroke: "#cccc00", width: 0.5, opacity: 0.8, dash: [2, 4] }
    },
    mw: {
        show: false,     // Show Milky Way as filled multi-polygon outlines, changable
        style: { fill: "#ffffff", opacity: 0.15 }  // Style for MW layers
    },
    lines: {  // Display & styles for graticule & some planes
        graticule: {
            show: true, stroke: "#cccccc", width: 0.1, opacity: 0.8, // Changable
            // grid values: "outline", "center", or [lat,...] specific position
            lon: { pos: [""], fill: "#eee", font: "10px Helvetica, Arial, sans-serif" },
            // grid values: "outline", "center", or [lon,...] specific position
            lat: { pos: [""], fill: "#eee", font: "10px Helvetica, Arial, sans-serif" }
        },
        equatorial: { show: false, stroke: "#aaaaaa", width: 1.3, opacity: 0.7 },
        ecliptic: { show: false, stroke: "#66cc66", width: 1.3, opacity: 0.7 },
        galactic: { show: false, stroke: "#cc6666", width: 1.3, opacity: 0.7 },
        supergalactic: { show: false, stroke: "#cc66cc", width: 1.3, opacity: 0.7 }
    },
    background: {        // Background style, changable
        fill: "#222222",   // Area fill
        opacity: 1,
        stroke: "#222222", // Outline
        width: 0.5
    },
    horizon: {  //Show horizon marker, if location is set and map projection is all-sky, hidden
        show: false
    },
    daylight: {  //Show day sky as a gradient, if location is set and map projection is hemispheric, hidden
        show: false
    }
};

firstCelestial = createCelestialFromConfig(config);
firstCelestial.addCallback(function () {
    console.log("This is callback");
});

let newConfig = {
    disableAnimations: true,
    width: 1000,
    projection: "airy",    // The one and the only
    projectionRatio: null,   // Optional override for default projection ratio
    transform: "equatorial", // Coordinate transformation: equatorial (default),
    // ecliptic, galactic, supergalactic
    center: null,       // Initial center coordinates in set transform
    // center: this.starMapsCenter,       // Initial center coordinates in set transform
    // [longitude, latitude, orientation] all in degrees
    // null = default center [0,0,0]
    orientationfixed: true,  // Keep orientation angle the same as center[2]
    geopos: null,       // optional initial geographic position [lat,lon] in degrees,
    // overrides center
    follow: "zenith",   // on which coordinates to center the map, default: zenith, if location enabled,
    // otherwise center
    zoomlevel: null,    // initial zoom level 0...zoomextend; 0|null = default, 1 = 100%, 0 < x <= zoomextend
    zoomextend: 10,     // maximum zoom level
    adaptable: false,    // Sizes are increased with higher zoom-levels
    interactive: false,  // Enable zooming and rotation with mousewheel and dragging, NO
    form: true,         // Display form for interactive settings. Needs a div with
    // id="celestial-form", created automatically if not present
    // This could be done without form, like, listen to change of config object, then extractSVG everytime it changes?
    location: false,    // Display location settings. Deprecated, use formFields below
    formFields: {
        location: true,
        general: true,
        stars: true,
        dsos: true,
        constellations: true,
        lines: true,
        other: true,
        download: true
    },
    advanced: true,     // Display fewer form fields if false
    daterange: [],      // Calender date range; null: displaydate-+10; [n<100]: displaydate-+n; [yr]: yr-+10;
    // [yr, n<100]: [yr-n, yr+n]; [yr0, yr1]
    controls: false,     // Display zoom controls
    lang: "",           // Global language override for names, any name setting that has the chosen language available
    // Default: desig or empty string for designations, other languages as used anywhere else
    culture: "",        // Source of constellations and star names, default "iau", other: "cn" Traditional Chinese
    container: "celestial-map",   // ID of parent element, e.g. div, null = html-body
    formcontainer: "celestial-form",
    datepickcontainer: "celestial-date",
    datapath: "data/",
    stars: {
        show: true,    // Show stars
        limit: 6,      // Show only stars brighter than limit magnitude
        colors: false,  // Show stars in spectral colors, if not use default color, this should be decided by merchant
        style: { fill: "#ffffff", opacity: 1 }, // Default style for stars
        designation: false, // Show star names (Bayer, Flamsteed, Variable star, Gliese or designation,
        // i.e. whichever of the previous applies first); may vary with culture setting
        designationType: "desig",  // Which kind of name is displayed as designation (fieldname in starnames.json)
        designationStyle: { fill: "#ddddbb", font: "11px 'Palatino Linotype', Georgia, Times, 'Times Roman', serif", align: "left", baseline: "top" },
        designationLimit: 2.5,  // Show only names for stars brighter than nameLimit
        propername: false,   // Show proper name (if present)
        propernameType: "name", // Languge for proper name, default IAU name; may vary with culture setting
        // (see list below of languages codes available for stars)
        propernameStyle: { fill: "#ddddbb", font: "13px 'Palatino Linotype', Georgia, Times, 'Times Roman', serif", align: "right", baseline: "bottom" },
        propernameLimit: 1.5,  // Show proper names for stars brighter than propernameLimit
        size: 5,       // Maximum size (radius) of star circle in pixels, this should base on width
        exponent: -0.28, // Scale exponent for star size, larger = more linear
        data: 'stars.6.json' // Data source for stellar data,
        // number indicates limit magnitude
    },
    dsos: {
        show: false,    // Deep sky objects is ugly, hide them
    },
    planets: {  //Show planet locations, if date-time is set, nope, hide all sun, moon and planets, planets are those in solar system
        show: false,
        // List of all objects to show
        which: ["sol", "mer", "ven", "ter", "lun", "mar", "jup", "sat", "ura", "nep"],
        // Font styles for planetary symbols
        symbols: {  // Character and color for each symbol in 'which' above (simple circle: \u25cf), optional size override for Sun & Moon
            "sol": { symbol: "\u2609", letter: "Su", fill: "#ffff00", size: "" },
            "mer": { symbol: "\u263f", letter: "Me", fill: "#cccccc" },
            "ven": { symbol: "\u2640", letter: "V", fill: "#eeeecc" },
            "ter": { symbol: "\u2295", letter: "T", fill: "#00ccff" },
            "lun": { symbol: "\u25cf", letter: "L", fill: "#ffffff", size: "" }, // overridden by generated crecent, except letter & size
            "mar": { symbol: "\u2642", letter: "Ma", fill: "#ff6600" },
            "cer": { symbol: "\u26b3", letter: "C", fill: "#cccccc" },
            "ves": { symbol: "\u26b6", letter: "Ma", fill: "#cccccc" },
            "jup": { symbol: "\u2643", letter: "J", fill: "#ffaa33" },
            "sat": { symbol: "\u2644", letter: "Sa", fill: "#ffdd66" },
            "ura": { symbol: "\u2645", letter: "U", fill: "#66ccff" },
            "nep": { symbol: "\u2646", letter: "N", fill: "#6666ff" },
            "plu": { symbol: "\u2647", letter: "P", fill: "#aaaaaa" },
            "eri": { symbol: "\u26aa", letter: "E", fill: "#eeeeee" }
        },
        symbolStyle: {
            fill: "#00ccff", font: "bold 17px 'Lucida Sans Unicode', Consolas, sans-serif",
            align: "center", baseline: "middle"
        },
        symbolType: "disk",  // Type of planet symbol: 'symbol' graphic planet sign, 'disk' filled circle scaled by magnitude
        // 'letter': 1 or 2 letters S Me V L Ma J S U N     
        names: true,          // Show name in nameType language next to symbol
        nameStyle: { fill: "#00ccff", font: "14px 'Lucida Sans Unicode', Consolas, sans-serif", align: "right", baseline: "top" },
        namesType: "en"     // Language of planet name (see list below of language codes available for planets), 
        // or desig = 3-letter designation
    },
    constellations: {
        names: false,      // Show constellation names, can be toggle
        namesType: "iau", // Type of name Latin (iau, default), 3 letter designation (desig) or other language (see list below)
        nameStyle: {
            fill: "#cccc99", align: "center", baseline: "middle",
            font: ["12px Helvetica, Arial, sans-serif",  // Style for constellations
                "10px Helvetica, Arial, sans-serif",  // Different fonts for diff.
                "8px Helvetica, Arial, sans-serif"]
        },// ranked constellations
        lines: true,   // Show constellation lines, style below
        lineStyle: { stroke: "#cccccc", width: .7, opacity: 0.6 },
        bounds: false, // Show constellation boundaries, style below
        boundStyle: { stroke: "#cccc00", width: 0.5, opacity: 0.8, dash: [2, 4] }
    },
    mw: {
        show: false,     // Show Milky Way as filled multi-polygon outlines, changable
        style: { fill: "#ffffff", opacity: 0.15 }  // Style for MW layers
    },
    lines: {  // Display & styles for graticule & some planes
        graticule: {
            show: true, stroke: "#cccccc", width: 0.1, opacity: 0.8, // Changable
            // grid values: "outline", "center", or [lat,...] specific position
            lon: { pos: [""], fill: "#eee", font: "10px Helvetica, Arial, sans-serif" },
            // grid values: "outline", "center", or [lon,...] specific position
            lat: { pos: [""], fill: "#eee", font: "10px Helvetica, Arial, sans-serif" }
        },
        equatorial: { show: false, stroke: "#aaaaaa", width: 1.3, opacity: 0.7 },
        ecliptic: { show: false, stroke: "#66cc66", width: 1.3, opacity: 0.7 },
        galactic: { show: false, stroke: "#cc6666", width: 1.3, opacity: 0.7 },
        supergalactic: { show: false, stroke: "#cc66cc", width: 1.3, opacity: 0.7 }
    },
    background: {        // Background style, changable
        fill: "#222222",   // Area fill
        opacity: 1,
        stroke: "#222222", // Outline
        width: 0.5
    },
    horizon: {  //Show horizon marker, if location is set and map projection is all-sky, hidden
        show: false
    },
    daylight: {  //Show day sky as a gradient, if location is set and map projection is hemispheric, hidden
        show: false
    }
};

// Create entirely new config, because config passing into createCelestialFromConfig store as reference.
// This effect at least has affect exportSVG for now
newConfig.container = 'another-celestial-map';
newConfig.formcontainer = 'another-celestial-form';
newConfig.datepickcontainer = 'another-celestial-date';

secondCelestial = createCelestialFromConfig(newConfig);

let anotherConfig = {
    disableAnimations: true,
    width: 1000,
    projection: "airy",    // The one and the only
    projectionRatio: null,   // Optional override for default projection ratio
    transform: "equatorial", // Coordinate transformation: equatorial (default),
    // ecliptic, galactic, supergalactic
    center: null,       // Initial center coordinates in set transform
    // center: this.starMapsCenter,       // Initial center coordinates in set transform
    // [longitude, latitude, orientation] all in degrees
    // null = default center [0,0,0]
    orientationfixed: true,  // Keep orientation angle the same as center[2]
    geopos: null,       // optional initial geographic position [lat,lon] in degrees,
    // overrides center
    follow: "zenith",   // on which coordinates to center the map, default: zenith, if location enabled,
    // otherwise center
    zoomlevel: null,    // initial zoom level 0...zoomextend; 0|null = default, 1 = 100%, 0 < x <= zoomextend
    zoomextend: 10,     // maximum zoom level
    adaptable: false,    // Sizes are increased with higher zoom-levels
    interactive: false,  // Enable zooming and rotation with mousewheel and dragging, NO
    form: true,         // Display form for interactive settings. Needs a div with
    // id="celestial-form", created automatically if not present
    // This could be done without form, like, listen to change of config object, then extractSVG everytime it changes?
    location: false,    // Display location settings. Deprecated, use formFields below
    formFields: {
        location: true,
        general: true,
        stars: true,
        dsos: true,
        constellations: true,
        lines: true,
        other: true,
        download: true
    },
    advanced: true,     // Display fewer form fields if false
    daterange: [],      // Calender date range; null: displaydate-+10; [n<100]: displaydate-+n; [yr]: yr-+10;
    // [yr, n<100]: [yr-n, yr+n]; [yr0, yr1]
    controls: false,     // Display zoom controls
    lang: "",           // Global language override for names, any name setting that has the chosen language available
    // Default: desig or empty string for designations, other languages as used anywhere else
    culture: "",        // Source of constellations and star names, default "iau", other: "cn" Traditional Chinese
    container: "celestial-map",   // ID of parent element, e.g. div, null = html-body
    formcontainer: "celestial-form",
    datepickcontainer: "celestial-date",
    datapath: "data/",
    stars: {
        show: true,    // Show stars
        limit: 6,      // Show only stars brighter than limit magnitude
        colors: false,  // Show stars in spectral colors, if not use default color, this should be decided by merchant
        style: { fill: "#ffffff", opacity: 1 }, // Default style for stars
        designation: false, // Show star names (Bayer, Flamsteed, Variable star, Gliese or designation,
        // i.e. whichever of the previous applies first); may vary with culture setting
        designationType: "desig",  // Which kind of name is displayed as designation (fieldname in starnames.json)
        designationStyle: { fill: "#ddddbb", font: "11px 'Palatino Linotype', Georgia, Times, 'Times Roman', serif", align: "left", baseline: "top" },
        designationLimit: 2.5,  // Show only names for stars brighter than nameLimit
        propername: false,   // Show proper name (if present)
        propernameType: "name", // Languge for proper name, default IAU name; may vary with culture setting
        // (see list below of languages codes available for stars)
        propernameStyle: { fill: "#ddddbb", font: "13px 'Palatino Linotype', Georgia, Times, 'Times Roman', serif", align: "right", baseline: "bottom" },
        propernameLimit: 1.5,  // Show proper names for stars brighter than propernameLimit
        size: 5,       // Maximum size (radius) of star circle in pixels, this should base on width
        exponent: -0.28, // Scale exponent for star size, larger = more linear
        data: 'stars.6.json' // Data source for stellar data,
        // number indicates limit magnitude
    },
    dsos: {
        show: false,    // Deep sky objects is ugly, hide them
    },
    planets: {  //Show planet locations, if date-time is set, nope, hide all sun, moon and planets, planets are those in solar system
        show: false,
        // List of all objects to show
        which: ["sol", "mer", "ven", "ter", "lun", "mar", "jup", "sat", "ura", "nep"],
        // Font styles for planetary symbols
        symbols: {  // Character and color for each symbol in 'which' above (simple circle: \u25cf), optional size override for Sun & Moon
            "sol": { symbol: "\u2609", letter: "Su", fill: "#ffff00", size: "" },
            "mer": { symbol: "\u263f", letter: "Me", fill: "#cccccc" },
            "ven": { symbol: "\u2640", letter: "V", fill: "#eeeecc" },
            "ter": { symbol: "\u2295", letter: "T", fill: "#00ccff" },
            "lun": { symbol: "\u25cf", letter: "L", fill: "#ffffff", size: "" }, // overridden by generated crecent, except letter & size
            "mar": { symbol: "\u2642", letter: "Ma", fill: "#ff6600" },
            "cer": { symbol: "\u26b3", letter: "C", fill: "#cccccc" },
            "ves": { symbol: "\u26b6", letter: "Ma", fill: "#cccccc" },
            "jup": { symbol: "\u2643", letter: "J", fill: "#ffaa33" },
            "sat": { symbol: "\u2644", letter: "Sa", fill: "#ffdd66" },
            "ura": { symbol: "\u2645", letter: "U", fill: "#66ccff" },
            "nep": { symbol: "\u2646", letter: "N", fill: "#6666ff" },
            "plu": { symbol: "\u2647", letter: "P", fill: "#aaaaaa" },
            "eri": { symbol: "\u26aa", letter: "E", fill: "#eeeeee" }
        },
        symbolStyle: {
            fill: "#00ccff", font: "bold 17px 'Lucida Sans Unicode', Consolas, sans-serif",
            align: "center", baseline: "middle"
        },
        symbolType: "disk",  // Type of planet symbol: 'symbol' graphic planet sign, 'disk' filled circle scaled by magnitude
        // 'letter': 1 or 2 letters S Me V L Ma J S U N     
        names: true,          // Show name in nameType language next to symbol
        nameStyle: { fill: "#00ccff", font: "14px 'Lucida Sans Unicode', Consolas, sans-serif", align: "right", baseline: "top" },
        namesType: "en"     // Language of planet name (see list below of language codes available for planets), 
        // or desig = 3-letter designation
    },
    constellations: {
        names: false,      // Show constellation names, can be toggle
        namesType: "iau", // Type of name Latin (iau, default), 3 letter designation (desig) or other language (see list below)
        nameStyle: {
            fill: "#cccc99", align: "center", baseline: "middle",
            font: ["12px Helvetica, Arial, sans-serif",  // Style for constellations
                "10px Helvetica, Arial, sans-serif",  // Different fonts for diff.
                "8px Helvetica, Arial, sans-serif"]
        },// ranked constellations
        lines: true,   // Show constellation lines, style below
        lineStyle: { stroke: "#cccccc", width: .7, opacity: 0.6 },
        bounds: false, // Show constellation boundaries, style below
        boundStyle: { stroke: "#cccc00", width: 0.5, opacity: 0.8, dash: [2, 4] }
    },
    mw: {
        show: false,     // Show Milky Way as filled multi-polygon outlines, changable
        style: { fill: "#ffffff", opacity: 0.15 }  // Style for MW layers
    },
    lines: {  // Display & styles for graticule & some planes
        graticule: {
            show: true, stroke: "#cccccc", width: 0.1, opacity: 0.8, // Changable
            // grid values: "outline", "center", or [lat,...] specific position
            lon: { pos: [""], fill: "#eee", font: "10px Helvetica, Arial, sans-serif" },
            // grid values: "outline", "center", or [lon,...] specific position
            lat: { pos: [""], fill: "#eee", font: "10px Helvetica, Arial, sans-serif" }
        },
        equatorial: { show: false, stroke: "#aaaaaa", width: 1.3, opacity: 0.7 },
        ecliptic: { show: false, stroke: "#66cc66", width: 1.3, opacity: 0.7 },
        galactic: { show: false, stroke: "#cc6666", width: 1.3, opacity: 0.7 },
        supergalactic: { show: false, stroke: "#cc66cc", width: 1.3, opacity: 0.7 }
    },
    background: {        // Background style, changable
        fill: "#222222",   // Area fill
        opacity: 1,
        stroke: "#222222", // Outline
        width: 0.5
    },
    horizon: {  //Show horizon marker, if location is set and map projection is all-sky, hidden
        show: false
    },
    daylight: {  //Show day sky as a gradient, if location is set and map projection is hemispheric, hidden
        show: false
    }
};

anotherConfig.container = 'celestial-map-2';
anotherConfig.formcontainer = 'celestial-form-2';
anotherConfig.datepickcontainer = 'celestial-date-2';

thirdCelestial = createCelestialFromConfig(anotherConfig);

function updateTime(event) {
    console.log(event.target.valueAsDate);
    firstCelestial.date(event.target.valueAsDate);
}
