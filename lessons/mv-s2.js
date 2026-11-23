/* Gradients and Hessians, session 2: directional derivatives and the multivariable chain rule. */
(function () {
  'use strict';
  var C = M4.colors;

  function f(x, y) { return x * x / 2 + y * y; }
  function gradf(x, y) { return [x, 2 * y]; }

  function ellipse(c) {
    var a = Math.sqrt(2 * c), b = Math.sqrt(c), pts = [];
    for (var i = 0; i <= 96; i++) { var t = 2 * Math.PI * i / 96; pts.push([a * Math.cos(t), b * Math.sin(t)]); }
    return pts;
  }

  function readout(parent, items) {
    var row = M4.el('div', { class: 'm4-readout' }, parent), vals = {};
    items.forEach(function (it) {
      var s = M4.el('span', null, row);
      var l = M4.el('span', { html: '\\(' + it[1] + '\\) = ' }, s); M4.typeset(l);
      vals[it[0]] = M4.el('b', { text: '0' }, s);
    });
    return function (k, v) {
      if (Array.isArray(v)) vals[k].innerHTML = M4.tex(M4.col(v.map(function (a) { return typeof a === 'number' ? M4.fmt(a, 2) : a; })));
      else vals[k].textContent = typeof v === 'number' ? M4.fmt(v, 2) : v;
    };
  }

  // Contour map with a point P (draggable) and a unit direction u (drag its tip).
  function directionScene(el, onChange) {
    var p = M4.plane(el, { xmin: -3, xmax: 3, ymin: -2.25, ymax: 2.25, width: 560, height: 420 });
    [0.25, 1, 2.25, 4].forEach(function (c) { p.path(ellipse(c), { stroke: C.line, width: 1.5, layer: 'bg' }); });
    var gArrow = p.arrow(0, 0, 0, 0, { stroke: C.ink, width: 3 });
    var uArrow = p.arrow(0, 0, 0, 0, { stroke: C.blue, width: 4 });
    var circle = p.path([], { stroke: C.blue, width: 1, dash: '3 5' });
    var ang = 0.6, P, tip;
    var set = readout(el, [['g', '\\nabla f'], ['u', '\\mathbf u'], ['d', '\\nabla f \\cdot \\mathbf u']]);
    function upd() {
      var x = P.x, y = P.y, g = gradf(x, y), ux = Math.cos(ang), uy = Math.sin(ang);
      var L = Math.hypot(g[0], g[1]), k = L > 1.6 ? 1.6 / L : 1;
      gArrow.set(x, y, x + k * g[0], y + k * g[1]);
      uArrow.set(x, y, x + ux, y + uy);
      tip.set(x + ux, y + uy);
      var ring = []; for (var i = 0; i <= 60; i++) { var t = 2 * Math.PI * i / 60; ring.push([x + Math.cos(t), y + Math.sin(t)]); }
      circle.set(ring);
      var d = g[0] * ux + g[1] * uy;
      set('g', [g[0], g[1]]);
      set('u', [ux, uy]);
      set('d', d);
      if (onChange) onChange(x, y, ux, uy, g, d);
    }
    P = p.handle(-1.2, 0.8, { color: C.ink, onDrag: function () { upd(); } });
    tip = p.handle(0, 0, {
      color: C.blue, r: 9,
      onDrag: function (a, b) { ang = Math.atan2(b - P.y, a - P.x); upd(); }
    });
    upd();
    return { p: p };
  }

  // A point moving along x(t) = (2.2 cos t, 0.4 + 1.2 sin t) on the contour map of f.
  function pathPos(t) { return [2.2 * Math.cos(t), 0.4 + 1.2 * Math.sin(t)]; }
  function pathVel(t) { return [-2.2 * Math.sin(t), 1.2 * Math.cos(t)]; }
  function pathG(t) { var q = pathPos(t); return f(q[0], q[1]); }
  function pathDG(t) { var q = pathPos(t), v = pathVel(t), g = gradf(q[0], q[1]); return g[0] * v[0] + g[1] * v[1]; }

  function pathScene(el, ctx, quiz) {
    var p = M4.plane(el, { xmin: -3, xmax: 3, ymin: -2.25, ymax: 2.25, width: 560, height: 420 });
    [0.25, 1, 2.25, 4].forEach(function (c) { p.path(ellipse(c), { stroke: C.line, width: 1.5, layer: 'bg' }); });
    var track = []; for (var i = 0; i <= 120; i++) track.push(pathPos(2 * Math.PI * i / 120));
    p.path(track, { stroke: C.orange, width: 2, dash: '4 6', opacity: 0.6, layer: 'bg' });
    var gArrow = p.arrow(0, 0, 0, 0, { stroke: C.ink, width: 3 });
    var vArrow = p.arrow(0, 0, 0, 0, { stroke: C.orange, width: 4 });
    var dot = p.point(0, 0, { color: C.orange, r: 8, stroke: '#fff', width: 3 });
    var set = null, gp = null, tan = null, mark = null;
    if (!quiz) {
      set = readout(el, [['a', '\\tfrac{\\partial f}{\\partial x}\\tfrac{dx}{dt}'], ['b', '\\tfrac{\\partial f}{\\partial y}\\tfrac{dy}{dt}'], ['s', '\\tfrac{dg}{dt}']]);
      gp = M4.plane(el, { xmin: 0, xmax: 2 * Math.PI, ymin: 0, ymax: 3.2, width: 560, height: 190 });
      gp.fn(pathG, { stroke: C.orange, width: 3 });
      gp.text(5.9, 2.95, 'g(t)', { fill: C.orange, size: 15 });
      tan = gp.line(0, 0, 0, 0, { stroke: C.ink, width: 2 });
      mark = gp.point(0, 0, { color: C.orange, r: 6 });
    }
    var t = 4;
    function upd() {
      var q = pathPos(t), v = pathVel(t), g = gradf(q[0], q[1]);
      var L = Math.hypot(g[0], g[1]), k = L > 1 ? 1 / L : 1;
      gArrow.set(q[0], q[1], q[0] + k * g[0], q[1] + k * g[1]);
      vArrow.set(q[0], q[1], q[0] + 0.55 * v[0], q[1] + 0.55 * v[1]);
      dot.set(q[0], q[1]);
      if (!quiz) {
        var a = g[0] * v[0], b = g[1] * v[1], s = a + b, h = pathG(t);
        set('a', a); set('b', b); set('s', s);
        tan.set(t - 0.7, h - 0.7 * s, t + 0.7, h + 0.7 * s);
        mark.set(t, h);
      }
    }
    M4.slider(el, { min: 0, max: 6.28, step: 0.01, value: t, label: 't', format: function (v) { return M4.fmt(v, 2); }, onInput: function (v) { t = v; upd(); } });
    if (quiz) {
      var row = M4.el('div', { class: 'm4-row' }, el);
      M4.button(row, 'Check', function () {
        var d = pathDG(t);
        if (Math.abs(d) < 0.12) ctx.solved('Right. Here \\(dg/dt = ' + M4.fmt(d, 2) + '\\). The path touches a contour, so the velocity is perpendicular to the gradient.');
        else ctx.wrong('Not yet. Here \\(dg/dt = ' + M4.fmt(d, 2) + '\\), so the height is still ' + (d > 0 ? 'rising' : 'falling') + '. Look for the spot where the orange arrow runs along a contour.');
      }, { primary: true });
    }
    upd();
  }

  M4.lesson({
    id: 'mv-s2',
    module: 'multivariable',
    title: 'Directional derivatives and the chain rule',
    summary: 'The slope of a surface in any direction is the dot product of that direction with the gradient. The same idea gives the chain rule for several variables.',
    minutes: 14,
    steps: [
      {
        kind: 'text',
        title: 'Slopes in every direction',
        html: '<p>The partial derivatives give the slope along the two coordinate axes. Walking in any other direction gives another slope. Let \\(\\mathbf u\\) be a <b>unit vector</b>, a vector of length 1, that points the way we walk. The <b>directional derivative</b> of \\(f\\) in direction \\(\\mathbf u\\) is</p>' +
          '\\[ D_{\\mathbf u} f(\\mathbf x) = \\lim_{t \\to 0} \\frac{f(\\mathbf x + t\\mathbf u) - f(\\mathbf x)}{t} = \\nabla f(\\mathbf x) \\cdot \\mathbf u. \\]' +
          '<p>The second equality is the linear approximation \\(f(\\mathbf x + \\mathbf h) \\approx f(\\mathbf x) + \\nabla f \\cdot \\mathbf h\\), applied to the step \\(t\\mathbf u\\). One gradient is enough to compute the slope in every direction. For \\(\\mathbf u = \\begin{pmatrix}1\\\\0\\end{pmatrix}\\) the formula returns \\(\\partial f/\\partial x\\), and for \\(\\mathbf u = \\begin{pmatrix}0\\\\1\\end{pmatrix}\\) it returns \\(\\partial f/\\partial y\\).</p>' +
          '<p>Since \\(\\nabla f \\cdot \\mathbf u = \\lVert \\nabla f \\rVert \\cos\\theta\\) for a unit vector, every directional derivative lies between \\(-\\lVert \\nabla f \\rVert\\) and \\(\\lVert \\nabla f \\rVert\\).</p>'
      },
      {
        kind: 'explore',
        title: 'A rotating direction',
        html: '<p>The ellipses are contour lines of \\(f(x, y) = \\tfrac12 x^2 + y^2\\). Drag the black point to move, and drag the blue handle around the dashed circle to choose the direction \\(\\mathbf u\\). The black arrow is the gradient. Check the sign of \\(\\nabla f \\cdot \\mathbf u\\) as \\(\\mathbf u\\) crosses the contour line.</p>',
        mount: function (el) {
          directionScene(el);
          M4.el('p', { class: 'm4-cap', text: 'The slope is zero when the blue arrow runs along the contour, positive when it points outward and negative when it points inward.' }, el);
        }
      },
      {
        kind: 'exercise',
        title: 'The steepest way down',
        html: '<p>Turn \\(\\mathbf u\\) so that the directional derivative is as negative as possible, the direction gradient descent would take. You have found it when \\(\\nabla f \\cdot \\mathbf u\\) is within 2% of \\(-\\lVert \\nabla f \\rVert\\).</p>',
        hint: 'The most negative slope is \\(-\\lVert \\nabla f \\rVert\\), reached when \\(\\mathbf u\\) points opposite to the black arrow.',
        mount: function (el, ctx) {
          var done = false;
          directionScene(el, function (x, y, ux, uy, g, d) {
            var L = Math.hypot(g[0], g[1]);
            if (!done && L > 0.3 && d < -0.98 * L) { done = true; ctx.solved('\\(\\mathbf u = -\\nabla f / \\lVert \\nabla f \\rVert\\), the unit vector of steepest descent.'); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Directional derivatives',
        html: '<p>Compute \\(\\nabla f\\) at the point first, then take the dot product with the unit vector.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 3,
            gen: function () {
              var a = M4.randNZ(-3, 3), b = M4.randNZ(-3, 3), c = M4.randNZ(-2, 2), p = M4.randNZ(-2, 2), q = M4.randNZ(-2, 2);
              var tri = M4.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 6, 10], [1, 0, 1], [0, 1, 1]]);
              var ux = tri[0] * M4.pick([1, -1]), uy = tri[1] * M4.pick([1, -1]), un = tri[2];
              var gx = 2 * a * p + c * q, gy = c * p + 2 * b * q;
              var ustr = un === 1 ? '(' + ux + ', ' + uy + ')' : '\\left(\\tfrac{' + ux + '}{' + un + '}, \\tfrac{' + uy + '}{' + un + '}\\right)';
              return {
                q: '<p>Let \\(f(x, y) = ' + M4.poly([[a, 'x^2'], [c, 'xy'], [b, 'y^2']]) + '\\). Compute the directional derivative at \\((' + p + ', ' + q + ')\\) in the direction \\(\\mathbf u = ' + ustr + '\\).</p>',
                answer: (gx * ux + gy * uy) / un,
                explain: '\\(\\nabla f = \\begin{pmatrix}' + gx + '\\\\' + gy + '\\end{pmatrix}\\), so \\(D_{\\mathbf u} f = ' + (un === 1 ? M4.sn(gx) + '\\cdot ' + M4.sn(ux) + ' + ' + M4.sn(gy) + '\\cdot ' + M4.sn(uy) : '(' + M4.sn(gx) + '\\cdot ' + M4.sn(ux) + ' + ' + M4.sn(gy) + '\\cdot ' + M4.sn(uy) + ')/' + un) + '\\).'
              };
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'The chain rule for several inputs',
        html: '<p>Suppose \\(x\\) and \\(y\\) are themselves functions of a single variable \\(t\\), so that the point \\((x(t), y(t))\\) traces a path through the floor. The height along the path, \\(g(t) = f(x(t), y(t))\\), changes at the rate</p>' +
          '\\[ \\frac{dg}{dt} = \\frac{\\partial f}{\\partial x}\\frac{dx}{dt} + \\frac{\\partial f}{\\partial y}\\frac{dy}{dt} = \\nabla f \\cdot \\mathbf x\'(t). \\]' +
          '<p>This is the directional derivative again, with the velocity \\(\\mathbf x\'(t)\\) in place of the unit vector. Each input contributes one product: how much \\(f\\) responds to that input, times how fast that input moves. The contributions add.</p>' +
          '<p>Backpropagation applies this rule over and over. A loss depends on many intermediate values, each intermediate value depends on the parameters, and the derivative of the loss with respect to a parameter is a sum over all paths through which the parameter influences the loss.</p>'
      },
      {
        kind: 'exercise',
        title: 'Chain rule practice',
        html: '<p>Add one product per input variable.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 3,
            gen: function () {
              var t0 = M4.randNZ(-2, 2), a = M4.randNZ(-3, 3), b = M4.randNZ(-3, 3), k = M4.randNZ(-3, 3), m = M4.rand(1, 3);
              if (Math.random() < 0.5) {
                // f = a x^2 + b y, x = k t, y = t^2
                var x = k * t0, dxdt = k, dydt = 2 * t0, ans = 2 * a * x * dxdt + b * dydt;
                return {
                  q: '<p>Let \\(f(x, y) = ' + M4.poly([[a, 'x^2'], [b, 'y']]) + '\\) with \\(x(t) = ' + M4.poly([[k, 't']]) + '\\) and \\(y(t) = t^2\\). Compute \\(\\dfrac{d}{dt} f(x(t), y(t))\\) at \\(t = ' + t0 + '\\).</p>',
                  answer: ans,
                  explain: '\\(\\partial f/\\partial x = ' + 2 * a + 'x = ' + 2 * a * x + '\\), \\(dx/dt = ' + dxdt + '\\), \\(\\partial f/\\partial y = ' + b + '\\), \\(dy/dt = 2t = ' + dydt + '\\). Sum: \\(' + M4.sn(2 * a * x) + '\\cdot ' + M4.sn(dxdt) + ' + ' + M4.sn(b) + '\\cdot ' + M4.sn(dydt) + ' = ' + ans + '\\).'
                };
              }
              // f = x y, x = t + m, y = k t
              var X = t0 + m, Y = k * t0, ans2 = Y * 1 + X * k;
              return {
                q: '<p>Let \\(f(x, y) = xy\\) with \\(x(t) = t + ' + m + '\\) and \\(y(t) = ' + M4.poly([[k, 't']]) + '\\). Compute \\(\\dfrac{d}{dt} f(x(t), y(t))\\) at \\(t = ' + t0 + '\\).</p>',
                answer: ans2,
                explain: 'At \\(t = ' + t0 + '\\): \\(x = ' + X + '\\), \\(y = ' + Y + '\\). \\(\\partial f/\\partial x = y\\), \\(\\partial f/\\partial y = x\\), so \\(dg/dt = y\\cdot 1 + x\\cdot ' + M4.sn(k) + ' = ' + ans2 + '\\).'
              };
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'A path across the map',
        html: '<p>The orange point travels along the path \\(\\mathbf x(t) = (2.2\\cos t,\\ 0.4 + 1.2\\sin t)\\). Move \\(t\\) and compare the two arrows: orange is the velocity \\(\\mathbf x\'(t)\\), black is the gradient. The lower plot shows the height \\(g(t)\\) felt by the traveller, with its tangent line.</p>' +
          '<p>The slope of that tangent is the sum of the two products in the panel. When the velocity points along a contour, the arrows are perpendicular and the height stops changing for a moment.</p>',
        mount: function (el, ctx) { pathScene(el, ctx, false); }
      },
      {
        kind: 'exercise',
        title: 'Touching a contour',
        html: '<p>This time the numbers and the height plot are hidden. Using only the arrows, move \\(t\\) to a moment where the height along the path is momentarily not changing, then press Check.</p>',
        hint: 'Look for a moment where the orange velocity arrow runs along a contour line, at a right angle to the black gradient.',
        mount: function (el, ctx) { pathScene(el, ctx, true); }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>The slope of \\(f\\) in the direction of a unit vector \\(\\mathbf u\\) is \\(\\nabla f \\cdot \\mathbf u\\). It is largest along the gradient and zero along a contour.</li>' +
          '<li>Along a path \\(\\mathbf x(t)\\), the height changes at the rate \\(\\nabla f \\cdot \\mathbf x\'(t)\\), one product per input variable, added up.</li>' +
          '<li>The height along a path stands still exactly where the path runs along a contour. Backpropagation is this same sum of products, repeated through many layers.</li>' +
          '</ul>'
      }
    ]
  });
})();
