/* Gradients and Hessians, session 1: partial derivatives and the gradient on a surface. */
(function () {
  'use strict';
  var C = M4.colors;

  function grad(f, x, y) { var e = 1e-4; return [(f(x + e, y) - f(x - e, y)) / (2 * e), (f(x, y + e) - f(x, y - e)) / (2 * e)]; }
  function bump(x, y, cx, cy, s) { return Math.exp(-((x - cx) * (x - cx) + (y - cy) * (y - cy)) / s); }

  var SURF = {
    bowl: { label: 'Bowl', f: function (x, y) { return 0.35 * x * x + 0.6 * y * y; }, levels: [0.25, 0.75, 1.5, 2.5] },
    hills: { label: 'Two hills', f: function (x, y) { return 1.6 * bump(x, y, 0.7, 0.5, 0.6) + 1.1 * bump(x, y, -0.8, -0.7, 0.5); }, levels: [0.2, 0.5, 0.9, 1.3] },
    saddle: { label: 'Saddle', f: function (x, y) { return 0.4 * (x * x - y * y); }, levels: [-1.2, -0.6, -0.2, 0.2, 0.6, 1.2] },
    pits: { label: 'Two valleys', f: function (x, y) { return 1.8 - 1.6 * bump(x, y, 0.8, 0.6, 0.6) - 1.0 * bump(x, y, -0.8, -0.7, 0.5) + 0.08 * (x * x + y * y); }, levels: [0.5, 0.9, 1.3, 1.7] }
  };

  // an orange polyline that follows the surface through the visited points
  function trail(s, col) {
    var path = M4.svg('path', { fill: 'none', stroke: col, 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.9 }, s.top);
    var t = { pts: [] };
    function draw() {
      path.setAttribute('d', t.pts.map(function (p, i) { var q = s.at(p[0], p[1]); return (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(''));
      s.top.insertBefore(path, s.top.firstChild);
    }
    s.onRedraw(draw);
    t.add = function (x, y) { t.pts.push([x, y]); draw(); };
    t.clear = function () { t.pts = []; draw(); };
    return t;
  }

  // label + live value pairs under a widget
  function readout(parent, items) {
    var row = M4.el('div', { class: 'm4-readout' }, parent), vals = {};
    items.forEach(function (it) {
      var s = M4.el('span', null, row);
      var l = M4.el('span', { html: '\\(' + it[1] + '\\) = ' }, s); M4.typeset(l);
      vals[it[0]] = M4.el('b', { text: '0' }, s);
    });
    return function (k, v) { vals[k].textContent = M4.fmt(v, 2); };
  }

  // A surface with a draggable ball, its gradient on the floor and the uphill direction on the surface.
  function gradientScene(el, key, color, onMove) {
    var cur = SURF[key];
    var s = M4.surface3d(el, { f: cur.f, r: 2, color: color, contours: cur.levels });
    var floorArrow = s.arrow(C.ink, 3), upArrow = s.arrow(C.blue, 4);
    var set = readout(el, [['x', 'x'], ['y', 'y'], ['f', 'f(x,y)'], ['fx', '\\partial f/\\partial x'], ['fy', '\\partial f/\\partial y']]);
    var ball;
    function update() {
      var x = ball.x, y = ball.y, g = grad(cur.f, x, y), L = Math.hypot(g[0], g[1]);
      var k = Math.min(0.55, 1.4 / Math.max(L, 1e-9));
      floorArrow.set(s.floor(x, y), s.floor(x + k * g[0], y + k * g[1]));
      if (L > 1e-3) { var d = 0.55 / L; upArrow.set(s.at(x, y), s.proj(x + d * g[0], y + d * g[1], cur.f(x, y) + 0.55 * L)); }
      else upArrow.set([0, 0], [0, 0]);
      set('x', x); set('y', y); set('f', cur.f(x, y)); set('fx', g[0]); set('fy', g[1]);
      if (onMove) onMove(x, y, g, cur);
    }
    ball = s.ball(-1.2, 1.0, { onMove: update });
    s.onRedraw(function () { if (ball) update(); });
    update();
    var api = { s: s, ball: ball, key: key, use: function (k2) { cur = SURF[k2]; api.key = k2; s.setF(cur.f); update(); } };
    return api;
  }

  M4.lesson({
    id: 'mv-s1',
    module: 'multivariable',
    title: 'The gradient on a surface',
    summary: 'Partial derivatives are slopes along the coordinate axes. Collected into a vector they form the gradient, which points in the direction of steepest ascent.',
    minutes: 20,
    steps: [
      {
        kind: 'text',
        title: 'Slopes in two directions',
        html: '<p>A function of two inputs, \\(f(x, y)\\), describes a surface: above every point \\((x, y)\\) of the floor sits a height \\(f(x, y)\\). A loss function of a model with two parameters is such a surface, and a model with a million parameters has a loss surface in a million dimensions. The geometry of two inputs carries over unchanged.</p>' +
          '<p>Standing on the surface, we can ask how steep it is. The answer depends on the direction we walk. Walking parallel to the \\(x\\)-axis while holding \\(y\\) fixed gives one slope, the <b>partial derivative</b> with respect to \\(x\\):</p>' +
          '\\[ \\frac{\\partial f}{\\partial x}(x, y) = \\lim_{h \\to 0} \\frac{f(x + h, y) - f(x, y)}{h}. \\]' +
          '<p>The partial derivative with respect to \\(y\\) is defined the same way with \\(x\\) held fixed. To compute either one, treat every other variable as a constant and differentiate as usual. For \\(f(x, y) = x^2 y + 3y\\) this gives \\(\\partial f/\\partial x = 2xy\\) and \\(\\partial f/\\partial y = x^2 + 3\\).</p>' +
          '<p>The <b>gradient</b> stacks all partial derivatives into one vector:</p>' +
          '\\[ \\nabla f(x, y) = \\begin{pmatrix} \\partial f/\\partial x \\\\ \\partial f/\\partial y \\end{pmatrix}. \\]' +
          '<p>The gradient lives on the floor, in the same space as the inputs, and it is different at every point.</p>'
      },
      {
        kind: 'explore',
        title: 'A ball on a surface',
        html: '<p>Drag the black ball over the surface. The black arrow on the floor is the gradient \\(\\nabla f\\) at the ball. The blue arrow on the surface shows the direction in which the surface rises most steeply. Drag the empty background to turn the view. The faint lines on the floor are contour lines, sets of points with equal height.</p>',
        mount: function (el, ctx) {
          var sc = gradientScene(el, 'bowl', ctx.color);
          var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:12px' }, el), btns = {};
          Object.keys(SURF).forEach(function (k) {
            btns[k] = M4.button(row, SURF[k].label, function () {
              Object.keys(btns).forEach(function (q) { btns[q].classList.toggle('primary', q === k); });
              sc.use(k);
            });
          });
          btns.bowl.classList.add('primary');
          M4.el('p', { class: 'm4-cap', text: 'Compare the floor arrow with the contour lines: it always crosses them at a right angle.' }, el);
        }
      },
      {
        kind: 'text',
        title: 'The gradient and the uphill direction',
        html: '<p>Move a small distance \\(\\mathbf h = \\begin{pmatrix}h_1\\\\h_2\\end{pmatrix}\\) away from a point. To first order the height changes by</p>' +
          '\\[ f(x + h_1, y + h_2) - f(x, y) \\approx \\frac{\\partial f}{\\partial x} h_1 + \\frac{\\partial f}{\\partial y} h_2 = \\nabla f \\cdot \\mathbf h. \\]' +
          '<p>For steps of a fixed length, the dot product \\(\\nabla f \\cdot \\mathbf h = \\lVert \\nabla f \\rVert \\, \\lVert \\mathbf h \\rVert \\cos\\theta\\) is largest when \\(\\mathbf h\\) points along \\(\\nabla f\\) (\\(\\theta = 0\\)), most negative when it points the opposite way, and zero when \\(\\mathbf h\\) is perpendicular to \\(\\nabla f\\). Three facts follow:</p>' +
          '<ol><li>\\(\\nabla f\\) points in the direction of steepest ascent.</li><li>\\(-\\nabla f\\) points in the direction of steepest descent. Gradient descent steps this way.</li><li>Along a contour line the height does not change, so the gradient is perpendicular to the contour lines.</li></ol>' +
          '<p>The length \\(\\lVert \\nabla f \\rVert\\) is the slope in that steepest direction. Where the surface is flat, at the top of a hill, the bottom of a bowl or the centre of a saddle, the gradient is the zero vector. Such points are called <b>critical points</b>.</p>'
      },
      {
        kind: 'exercise',
        title: 'The highest point',
        html: '<p>This surface has two hills. Drag the ball to the top of the <b>higher</b> hill. The gradient arrows shrink to nothing at a summit.</p>',
        hint: 'Follow the blue arrow uphill. The higher summit is near \\((0.7, 0.5)\\).',
        mount: function (el, ctx) {
          var done = false;
          var sc = gradientScene(el, 'hills', ctx.color, function (x, y, g, cur) {
            if (done) return;
            if (Math.hypot(g[0], g[1]) < 0.15 && cur.f(x, y) > 1.4) { done = true; ctx.solved('The gradient is zero at the summit, and every direction leads down.'); }
            else if (Math.hypot(g[0], g[1]) < 0.15 && cur.f(x, y) > 0.9 && !sc.warned) { sc.warned = true; ctx.note('This is a summit, the lower one. The gradient is zero here too. Look for the higher hill.'); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Partial derivatives',
        html: '<p>Treat the other variable as a constant. Fractions such as <code>3/4</code> are accepted.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 4,
            gen: function () {
              var t = M4.rand(0, 4), p = M4.randNZ(-3, 3), q = M4.randNZ(-3, 3), a = M4.randNZ(-4, 4), b = M4.randNZ(-4, 4), c = M4.randNZ(-3, 3);
              var wrt = M4.pick(['x', 'y']), f, dx, dy, ex;
              if (t === 0) { f = M4.poly([[a, 'x^2'], [b, 'xy'], [c, 'y^2']]); dx = 2 * a * p + b * q; dy = b * p + 2 * c * q; ex = wrt === 'x' ? '\\(\\partial f/\\partial x = ' + M4.poly([[2 * a, 'x'], [b, 'y']]) + '\\).' : '\\(\\partial f/\\partial y = ' + M4.poly([[b, 'x'], [2 * c, 'y']]) + '\\).'; }
              else if (t === 1) { f = M4.poly([[a, 'x^2 y'], [b, 'y^2']]); dx = 2 * a * p * q; dy = a * p * p + 2 * b * q; ex = wrt === 'x' ? '\\(\\partial f/\\partial x = ' + M4.poly([[2 * a, 'xy']]) + '\\).' : '\\(\\partial f/\\partial y = ' + M4.poly([[a, 'x^2'], [2 * b, 'y']]) + '\\).'; }
              else if (t === 2) { f = M4.poly([[a, 'x y^3'], [c, 'x']]); dx = a * q * q * q + c; dy = 3 * a * p * q * q; ex = wrt === 'x' ? '\\(\\partial f/\\partial x = ' + M4.poly([[a, 'y^3'], [c, '']]) + '\\).' : '\\(\\partial f/\\partial y = ' + M4.poly([[3 * a, 'x y^2']]) + '\\).'; }
              else if (t === 3) { a = M4.randNZ(-2, 2); b = M4.randNZ(-2, 2); p = b; q = -a; f = 'e^{' + M4.poly([[a, 'x'], [b, 'y']]) + '}'; dx = a; dy = b; ex = 'At this point the exponent is \\(0\\), so \\(f = 1\\) and each partial derivative equals its coefficient.'; }
              else { f = '(' + M4.poly([[a, 'x'], [b, 'y']]) + ')^2'; dx = 2 * a * (a * p + b * q); dy = 2 * b * (a * p + b * q); ex = 'Chain rule: \\(\\partial f/\\partial ' + wrt + ' = 2(' + M4.poly([[a, 'x'], [b, 'y']]) + ')\\cdot ' + M4.sn(wrt === 'x' ? a : b) + '\\).'; }
              return {
                q: '<p>Let \\(f(x, y) = ' + f + '\\). Compute \\(\\dfrac{\\partial f}{\\partial ' + wrt + '}\\) at \\((x, y) = (' + p + ', ' + q + ')\\).</p>',
                answer: wrt === 'x' ? dx : dy, explain: ex
              };
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Gradient from a contour plot',
        html: '<p>Each problem gives a function and a point. Answer with a number or pick the direction.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 3,
            gen: function () {
              var a = M4.rand(1, 3), b = M4.rand(1, 3), p = M4.randNZ(-2, 2), q = M4.randNZ(-2, 2);
              var gx = 2 * a * p, gy = 2 * b * q, f = M4.poly([[a, 'x^2'], [b, 'y^2']]);
              if (Math.random() < 0.5) {
                var tri = M4.pick([[3, 4], [6, 8], [5, 12], [8, 6], [4, 3]]);
                gx = tri[0] * M4.pick([1, -1]); gy = tri[1] * M4.pick([1, -1]);
                return {
                  q: '<p>At some point the gradient is \\(\\nabla f = \\begin{pmatrix}' + gx + '\\\\' + gy + '\\end{pmatrix}\\). What is the slope of the surface in the steepest uphill direction, \\(\\lVert \\nabla f \\rVert\\)?</p>',
                  answer: Math.hypot(gx, gy), explain: '\\(\\sqrt{' + M4.sn(gx) + '^2 + ' + M4.sn(gy) + '^2} = ' + Math.hypot(gx, gy) + '\\).'
                };
              }
              var opts = ['\\((' + (-gx) + ', ' + (-gy) + ')\\)', '\\((' + gx + ', ' + gy + ')\\)', '\\((' + (-gy) + ', ' + gx + ')\\)', '\\((' + gy + ', ' + (-gx) + ')\\)'];
              var order = [0, 1, 2, 3].sort(function () { return Math.random() - 0.5; });
              return {
                q: '<p>Let \\(f(x, y) = ' + f + '\\). Which vector points in the direction of steepest <b>descent</b> at \\((' + p + ', ' + q + ')\\)?</p>',
                options: order.map(function (i) { return opts[i]; }), answer: order.indexOf(0),
                explain: '\\(\\nabla f = \\begin{pmatrix}' + 2 * a + 'x\\\\' + 2 * b + 'y\\end{pmatrix} = \\begin{pmatrix}' + gx + '\\\\' + gy + '\\end{pmatrix}\\), and steepest descent is \\(-\\nabla f\\). The other two candidates run along the contour line.'
              };
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Rolling downhill',
        html: '<p>Gradient descent repeats one move: from the current point \\((x, y)\\), step to \\((x, y) - \\eta \\nabla f(x, y)\\). Drag the ball to a starting point, choose a step size \\(\\eta\\) and press <b>One step</b> or <b>Run</b>. The orange trail records the path.</p>',
        mount: function (el, ctx) {
          var sc = gradientScene(el, 'bowl', ctx.color, function () { });
          var tr = trail(sc.s, C.orange), timer = null;
          var ctl = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:10px' }, el);
          var lr = M4.slider(ctl, { min: 0.05, max: 1.9, step: 0.05, value: 0.3, label: '\\(\\eta\\)', format: function (v) { return M4.fmt(v, 2); } });
          var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el), btns = {};
          function stop() { if (timer) { clearInterval(timer); timer = null; } }
          function step() {
            var b = sc.ball, f = SURF[sc.key].f, g = grad(f, b.x, b.y), e = lr.get();
            if (!tr.pts.length) tr.add(b.x, b.y);
            var nx = Math.max(-2, Math.min(2, b.x - e * g[0])), ny = Math.max(-2, Math.min(2, b.y - e * g[1]));
            b.set(nx, ny); tr.add(nx, ny);
            return Math.hypot(g[0], g[1]);
          }
          M4.button(row, 'One step', function () { stop(); step(); }, { primary: true });
          M4.button(row, 'Run', function () { stop(); var k = 0; timer = setInterval(function () { if (step() < 1e-3 || ++k > 60) stop(); }, 70); });
          M4.button(row, 'Clear trail', function () { stop(); tr.clear(); }, { ghost: true });
          var row2 = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el);
          ['bowl', 'pits'].forEach(function (k) {
            btns[k] = M4.button(row2, SURF[k].label, function () {
              stop(); tr.clear();
              Object.keys(btns).forEach(function (q) { btns[q].classList.toggle('primary', q === k); });
              sc.use(k);
            });
          });
          btns.bowl.classList.add('primary');
          ctx.onCleanup(stop);
          M4.el('p', { class: 'm4-cap', text: 'On the bowl, try a step size near 1.7. The steps overshoot the bottom and bounce from wall to wall. Above about 1.67 they never settle.' }, el);
        }
      },
      {
        kind: 'exercise',
        title: 'Two valleys',
        html: '<p>This surface has a shallow valley and a deeper one. Drag the ball to a starting point and press <b>Run</b>. Descent uses a fixed step size of \\(0.25\\). Find a start from which the ball ends in the <b>deeper</b> valley, at about \\((0.8, 0.6)\\).</p>',
        hint: 'Gradient descent only sees the local slope. Start on the slope that drains into the deeper valley.',
        mount: function (el, ctx) {
          var sc = gradientScene(el, 'pits', ctx.color, function () { });
          sc.ball.set(-1.6, -1.2);
          var tr = trail(sc.s, C.orange), timer = null, done = false;
          var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:10px' }, el);
          function stop() { if (timer) { clearInterval(timer); timer = null; } }
          M4.button(row, 'Run', function () {
            stop(); tr.clear(); var b = sc.ball, f = SURF.pits.f, k = 0; tr.add(b.x, b.y);
            timer = setInterval(function () {
              var g = grad(f, b.x, b.y), nx = Math.max(-2, Math.min(2, b.x - 0.25 * g[0])), ny = Math.max(-2, Math.min(2, b.y - 0.25 * g[1]));
              b.set(nx, ny); tr.add(nx, ny);
              if (Math.hypot(g[0], g[1]) < 2e-3 || ++k > 160) {
                stop(); if (done) return;
                if (Math.hypot(b.x - 0.8, b.y - 0.6) < 0.45) { done = true; ctx.solved('The ball settled in the deeper valley, the global minimum of this surface.'); }
                else if (Math.hypot(b.x + 0.8, b.y + 0.7) < 0.45) ctx.wrong('The ball stopped in the shallow valley. The gradient is zero there, so descent cannot leave this local minimum.');
                else ctx.wrong('The ball has not settled in a valley yet. Try a start closer to one.');
              }
            }, 30);
          }, { primary: true });
          ctx.onCleanup(stop);
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>A partial derivative is the slope along one axis with every other input held fixed.</li>' +
          '<li>The gradient \\(\\nabla f\\) collects the partial derivatives. It points in the direction of steepest ascent, its length is the steepest slope, and it is perpendicular to the contour lines.</li>' +
          '<li>Gradient descent steps along \\(-\\eta \\nabla f\\). A step size that is too large makes the steps overshoot, and descent stops at whichever minimum drains the starting point, which need not be the lowest one.</li>' +
          '</ul>'
      }
    ]
  });
})();
