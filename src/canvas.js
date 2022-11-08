/* global Celestial */
let Canvas = {}; 

Canvas.symbol = function () {
  // parameters and default values
  let type = d3.functor("circle"), 
      size = d3.functor(64), 
      age = d3.functor(Math.PI), //crescent shape 0..2Pi
      color = d3.functor("#fff"),  
      text = d3.functor(""),  
      padding = d3.functor([2,2]),  
      pos;
  
  function canvas_symbol(context) {
    draw_symbol[type()](context);
  }
  
  let draw_symbol = {
    "circle": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2;
      ctx.arc(pos[0], pos[1], r, 0, 2 * Math.PI);
      ctx.closePath();
      return r;
    },
    "square": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/1.7;
      ctx.moveTo(pos[0]-r, pos[1]-r);
      ctx.lineTo(pos[0]+r, pos[1]-r);
      ctx.lineTo(pos[0]+r, pos[1]+r);
      ctx.lineTo(pos[0]-r, pos[1]+r);
      ctx.closePath();
      return r;
    },
    "diamond": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/1.5;
      ctx.moveTo(pos[0], pos[1]-r);
      ctx.lineTo(pos[0]+r, pos[1]);
      ctx.lineTo(pos[0], pos[1]+r);
      ctx.lineTo(pos[0]-r, pos[1]);
      ctx.closePath();
      return r;
    },
    "triangle": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/Math.sqrt(3);
      ctx.moveTo(pos[0], pos[1]-r);
      ctx.lineTo(pos[0]+r, pos[1]+r);
      ctx.lineTo(pos[0]-r, pos[1]+r);
      ctx.closePath();
      return r;
    },
    "ellipse": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2;
      ctx.save();
      ctx.translate(pos[0], pos[1]);
      ctx.scale(1.6, 0.8); 
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 2 * Math.PI); 
      ctx.closePath();
      ctx.restore();      
      return r;
    },
    "marker": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2;
      ctx.moveTo(pos[0], pos[1]-r);
      ctx.lineTo(pos[0], pos[1]+r);
      ctx.moveTo(pos[0]-r, pos[1]);
      ctx.lineTo(pos[0]+r, pos[1]);
      ctx.closePath();
      return r;
    },
    "cross-circle": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2;
      ctx.moveTo(pos[0], pos[1]-s);
      ctx.lineTo(pos[0], pos[1]+s);
      ctx.moveTo(pos[0]-s, pos[1]);
      ctx.lineTo(pos[0]+s, pos[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos[0], pos[1]);
      ctx.arc(pos[0], pos[1], r, 0, 2 * Math.PI);    
      ctx.closePath();
      return r;
    },
    "stroke-circle": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2;
      ctx.moveTo(pos[0], pos[1]-s);
      ctx.lineTo(pos[0], pos[1]+s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos[0], pos[1]);
      ctx.arc(pos[0], pos[1], r, 0, 2 * Math.PI);    
      ctx.closePath();
      return r;
    }, 
    "crescent": function(ctx) {
      let s = Math.sqrt(size()), 
          r = s/2,
          ag = age(),
          ph = 0.5 * (1 - Math.cos(ag)),
          e = 1.6 * Math.abs(ph - 0.5) + 0.01,
          dir = ag > Math.PI,
          termdir = Math.abs(ph) > 0.5 ? dir : !dir,
          moonFill = ctx.fillStyle,
          darkFill = ph < 0.157 ? "#669" : "#557";
      ctx.save();
      ctx.fillStyle = darkFill;
      ctx.beginPath();
      ctx.moveTo(pos[0], pos[1]);
      ctx.arc(pos[0], pos[1], r, 0, 2 * Math.PI);    
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = moonFill;
      ctx.beginPath();
      ctx.moveTo(pos[0], pos[1]);
      ctx.arc(pos[0], pos[1], r, -Math.PI/2, Math.PI/2, dir); 
      ctx.scale(e, 1);
      ctx.arc(pos[0]/e, pos[1], r, Math.PI/2, -Math.PI/2, termdir); 
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      
      return r;
    } 
  };

  
  canvas_symbol.type = function(_) {
    if (!arguments.length) return type; 
    type = d3.functor(_);
    return canvas_symbol;
  };
  canvas_symbol.size = function(_) {
    if (!arguments.length) return size; 
    size = d3.functor(_);
    return canvas_symbol;
  };
  canvas_symbol.age = function(_) {
    if (!arguments.length) return age; 
    age = d3.functor(_);
    return canvas_symbol;
  };
  canvas_symbol.text = function(_) {
    if (!arguments.length) return text; 
    text = d3.functor(_);
    return canvas_symbol;
  };
  canvas_symbol.position = function(_) {
    if (!arguments.length) return; 
    pos = _;
    return canvas_symbol;
  };

  return canvas_symbol;
};

Celestial.Canvas = Canvas;
