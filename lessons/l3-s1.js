(function () {
  'use strict';

  var C = M4.colors;
  var GREEN = C.green, ORANGE = C.orange, BLUE = C.blue, PURPLE = C.purple, INK = C.ink, MUTED = C.muted;

  /* ------------------------------------------------------------------ */
  /* styles (injected once)                                              */
  /* ------------------------------------------------------------------ */
  function ensureStyle() {
    if (document.getElementById('l3-s1-style')) return;
    var st = document.createElement('style');
    st.id = 'l3-s1-style';
    st.textContent = [
      '.l3-s1-cap{text-align:center;font-size:15px;font-weight:600;color:#6b6f76;margin:0 0 6px}',
      '.l3-s1-panel{display:flex;flex-direction:column;align-items:center;min-width:0}',
      '.l3-s1-panel svg{width:100%;height:auto;max-width:440px;touch-action:none}',
      '.l3-s1-center{display:flex;justify-content:center}',
      '.l3-s1-center svg{width:100%;height:auto;max-width:520px;touch-action:none}',
      '.l3-s1-bar{justify-content:center;margin:12px 0}',
      '.l3-s1-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0}',
      '@media (max-width:640px){.l3-s1-cards{grid-template-columns:repeat(2,1fr)}}',
      '.l3-s1-card{background:#fff;border:2px solid #e6e4dd;border-radius:16px;padding:10px 8px 12px;display:flex;flex-direction:column;align-items:center;gap:6px}',
      '.l3-s1-card svg{width:100%;height:auto;max-width:150px}',
      '.l3-s1-card b{font-size:15px;text-align:center;line-height:1.25;min-height:38px;display:flex;align-items:center}',
      '.l3-s1-card .m4-slot{width:100%;min-height:54px;box-sizing:border-box;display:flex;align-items:center;justify-content:center}',
      '.l3-s1-done{border-color:#16b56b;background:#effaf4}',
      '.l3-s1-tray{justify-content:center;min-height:60px;margin-top:6px}',
      '.l3-s1-matrix{font-size:20px;text-align:center;min-height:74px;display:flex;align-items:center;justify-content:center}',
      '.l3-s1-legend{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;font-size:15px;color:#6b6f76;margin-top:6px}',
      '.l3-s1-legend i{display:inline-block;width:22px;height:5px;border-radius:3px;vertical-align:middle;margin-right:6px}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ */
  /* small local helpers                                                 */
  /* ------------------------------------------------------------------ */
  function fmt(v, d) {
    var s = (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d);
    return s.replace('-', '\u2212');
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function hex(c) {
    c = c.replace('#', '');
    return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)];
  }
  function mix(a, b, t) {
    var A = hex(a), B = hex(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function readout(parent, label) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    return { el: r, set: function (v) { r.textContent = label + ' ' + v; } };
  }
  function bar(parent) { return M4.el('div', { class: 'm4-row l3-s1-bar' }, parent); }
  function panel(parent, caption) {
    var d = M4.el('div', { class: 'l3-s1-panel' }, parent);
    if (caption) M4.el('div', { class: 'l3-s1-cap', text: caption }, d);
    return d;
  }
  function ring(p, x, y, color) {
    return M4.svg('circle', { cx: p.x(x), cy: p.y(y), r: 17, fill: color, 'fill-opacity': 0.25, stroke: color, 'stroke-width': 3 }, p.g);
  }

  /* ------------------------------------------------------------------ */
  /* running example: will a student pass the exam?                      */
  /* x = hours studied relative to the class average, y = 1 for a pass   */
  /* ------------------------------------------------------------------ */
  var X = [-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5];
  var Y = [0, 0, 0, 1, 0, 1, 1, 1];
  var INIT = [-0.75, 1.6];           // binary cross entropy 1.85
  var WMIN = -3, WMAX = 4, BMIN = -3.5, BMAX = 3.5;

  function sig(z) { return 1 / (1 + Math.exp(-z)); }
  function softplus(z) { return z > 30 ? z : Math.log(1 + Math.exp(z)); }
  function bce(w, b) {
    var s = 0;
    for (var i = 0; i < X.length; i++) { var z = w * X[i] + b; s += softplus(z) - Y[i] * z; }
    return s / X.length;
  }
  function bceGrad(w, b) {
    var gw = 0, gb = 0;
    for (var i = 0; i < X.length; i++) { var d = sig(w * X[i] + b) - Y[i]; gw += d * X[i]; gb += d; }
    return [gw / X.length, gb / X.length];
  }

  function heat(p, xmin, xmax, ymin, ymax, n, colorAt) {
    var g = M4.svg('g', { 'pointer-events': 'none' }, p.g);
    var cells = [];
    var dx = (xmax - xmin) / n, dy = (ymax - ymin) / n;
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        var x0 = xmin + i * dx, y1 = ymin + (j + 1) * dy;
        var r = M4.svg('rect', {
          x: p.x(x0) - 0.3, y: p.y(y1) - 0.3,
          width: Math.abs(p.x(x0 + dx) - p.x(x0)) + 0.6, height: Math.abs(p.y(y1 - dy) - p.y(y1)) + 0.6,
          'fill-opacity': 0.82
        }, g);
        cells.push({ r: r, cx: x0 + dx / 2, cy: y1 - dy / 2 });
      }
    }
    function paint() {
      for (var k = 0; k < cells.length; k++) cells[k].r.setAttribute('fill', colorAt(cells[k].cx, cells[k].cy));
    }
    paint();
    return { paint: paint };
  }

  function lossColor(w, b) {
    var l = bce(w, b);
    var level = Math.min(9, Math.floor(Math.sqrt(Math.max(0, l - 0.3)) / 0.16));
    return mix(GREEN, '#f6f4ec', level / 9);
  }

  // Two linked panels: the data with the sigmoid, and the (w, b) plane with the loss.
  function landscape(el, opts) {
    ensureStyle();
    var grid = M4.el('div', { class: 'm4-grid2' }, el);
    var left = panel(grid, 'Model: pass probability over x');
    var right = panel(grid, 'Loss landscape over (w, b)');

    var pd = M4.plane(left, { xmin: -4.5, xmax: 4.5, ymin: -0.5, ymax: 1.5, width: 400, height: 400, grid: true, axes: true, labels: true });
    for (var i = 0; i < X.length; i++) pd.point(X[i], Y[i], { r: 8, fill: BLUE });
    var curve = pd.fn(function () { return 0.5; }, { stroke: GREEN, width: 5 });
    pd.text(2.6, -0.33, 'x (hours)', { fill: MUTED, size: 15 });
    pd.text(-3.3, 1.3, 'pass = 1', { fill: MUTED, size: 15 });

    var pl = M4.plane(right, { xmin: WMIN, xmax: WMAX, ymin: BMIN, ymax: BMAX, width: 400, height: 400, grid: false, axes: true, labels: true });
    heat(pl, WMIN, WMAX, BMIN, BMAX, 35, lossColor);
    pl.text(3.6, -0.45, 'w', { fill: INK, size: 17, weight: 700 });
    pl.text(0.35, 3.1, 'b', { fill: INK, size: 17, weight: 700 });
    var trail = pl.path([[INIT[0], INIT[1]], [INIT[0], INIT[1]]], { stroke: INK, width: 3 });

    var row = bar(el);
    var rW = readout(row, 'w ='), rB = readout(row, 'b ='), rL = readout(row, 'loss =');

    var state = { w: INIT[0], b: INIT[1] };
    function show() {
      var w = state.w, b = state.b;
      curve.set(function (x) { return sig(w * x + b); });
      rW.set(fmt(w, 2)); rB.set(fmt(b, 2)); rL.set(fmt(bce(w, b), 2));
      if (opts.onChange) opts.onChange(w, b);
    }
    var handle = pl.handle(INIT[0], INIT[1], {
      color: ORANGE, r: 13,
      onDrag: function (x, y) {
        state.w = clamp(x, WMIN, WMAX); state.b = clamp(y, BMIN, BMAX);
        if (opts.onUserDrag) opts.onUserDrag();
        show();
      },
      onEnd: function () { if (opts.onEnd) opts.onEnd(state.w, state.b); }
    });
    show();
    return {
      state: state, plane: pl, row: row, trail: trail,
      setPoint: function (w, b) { state.w = w; state.b = b; handle.set(clamp(w, WMIN, WMAX), clamp(b, BMIN, BMAX)); show(); }
    };
  }

  /* ------------------------------------------------------------------ */
  /* quadratic bowls used in the gradient steps                          */
  /* ------------------------------------------------------------------ */
  function ellipse(p, a, b, opts) {
    var pts = [];
    for (var k = 0; k < 72; k++) { var t = k / 72 * 2 * Math.PI; pts.push([a * Math.cos(t), b * Math.sin(t)]); }
    return p.path(pts, { stroke: opts.stroke, width: opts.width || 2, closed: true });
  }
  // contours of f = (A x1^2 + B x2^2) / 2
  function bowlContours(p, A, B, levels) {
    for (var i = 0; i < levels.length; i++) {
      var c = levels[i];
      ellipse(p, Math.sqrt(2 * c / A), Math.sqrt(2 * c / B), { stroke: mix(GREEN, '#ffffff', 0.15 + 0.6 * i / levels.length), width: 2.5 });
    }
    p.point(0, 0, { r: 5, fill: GREEN });
  }

  // profile of two slices z = lambda t^2 / 2 sharing a vertex; c1, c2 in [-1, 1]
  function sliceProfile(parent, w, h) {
    var svg = M4.svg('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img' }, parent);
    M4.svg('line', { x1: 8, y1: h / 2, x2: w - 8, y2: h / 2, stroke: C.line, 'stroke-width': 2 }, svg);
    var p1 = M4.svg('path', { fill: 'none', stroke: ORANGE, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    var p2 = M4.svg('path', { fill: 'none', stroke: BLUE, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    M4.svg('circle', { cx: w / 2, cy: h / 2, r: 5, fill: INK }, svg);
    function d(c) {
      var s = '';
      for (var k = 0; k <= 40; k++) {
        var t = -1 + k / 20;
        var y = clamp(h / 2 - (h / 2 - 8) * c * t * t, 4, h - 4);
        s += (k ? 'L' : 'M') + (w / 2 + (w / 2 - 12) * t).toFixed(1) + ' ' + y.toFixed(1);
      }
      return s;
    }
    function set(c1, c2) { p1.setAttribute('d', d(c1)); p2.setAttribute('d', d(c2)); }
    return { svg: svg, set: set };
  }

  /* ================================================================== */
  /* steps                                                               */
  /* ================================================================== */
  var steps = [];

  /* 1 ---------------------------------------------------------------- */
  steps.push({
    kind: 'text',
    title: 'Iterative optimization',
    html:
      '<p>For some models an exact equation gives the best weights directly from the training data. Logistic regression and neural networks have no such equation, so their weights are found by <b>iterative optimization</b>: the optimum is approached in many small steps.</p>' +
      '<p>In this lesson you will read a loss landscape, interpret the gradient \\(\\nabla f\\) as the direction of steepest ascent, describe curvature through the second derivative and the eigenvalues of the Hessian \\(H\\), and carry out a gradient descent step \\(\\theta \\leftarrow \\theta - \\eta\\,\\nabla L(\\theta)\\) on paper.</p>'
  });

  /* 2 ---------------------------------------------------------------- */
  steps.push({
    kind: 'explore',
    title: 'The loss landscape',
    html:
      '<p>The running example predicts whether a student passes an exam. The input \\(x\\) is the number of hours studied, measured relative to the class average, and each blue dot is one student with label \\(0\\) (fail) or \\(1\\) (pass). The model is \\(\\sigma(w\\,x + b)\\), where \\(\\sigma(z) = 1/(1+e^{-z})\\) is the sigmoid, \\(w\\) is the weight and \\(b\\) is the bias.</p>' +
      '<p>Each pair \\((w, b)\\) is one model, and it has one value of the binary cross entropy loss. Plotting the loss over all pairs gives the <b>loss landscape</b>. Darker green means lower loss. The randomly initialized model starts with a loss of \\(1.85\\). Drag the orange point and observe the green curve.</p>',
    mount: function (el, ctx) {
      landscape(el, {});
      M4.el('div', { class: 'm4-note', style: 'text-align:center', text: 'Every position of the orange point is one model. The green curve on the left is that model.' }, el);
    }
  });

  /* 3 ---------------------------------------------------------------- */
  steps.push({
    kind: 'exercise',
    title: 'The bottom of a bowl',
    html:
      '<p>Lower on the loss surface means lower loss, and lower loss means a model that fits the observations better. Move the parameters \\((w, b)\\) until the binary cross entropy is below \\(0.35\\).</p>',
    hint: 'The curve must rise from left to right, so \\(w\\) has to be positive. The darkest region lies near \\(w \\approx 1.3\\), \\(b \\approx 0\\).',
    mount: function (el, ctx) {
      var done = false;
      var L = landscape(el, {
        onChange: function (w, b) {
          if (!done && bce(w, b) < 0.35) {
            done = true;
            ring(L.plane, w, b, GREEN);
            ctx.note('Loss ' + fmt(bce(w, b), 2) + ': the curve now passes between the failing and the passing students.');
            ctx.solved();
          }
        },
        onEnd: function (w, b) {
          if (done) return;
          var l = bce(w, b);
          if (w <= 0) ctx.note('Loss ' + fmt(l, 2) + '. With \\(w \\le 0\\) the curve does not rise with the hours studied. Move the point to the right.');
          else if (Math.abs(b) > 1) ctx.note('Loss ' + fmt(l, 2) + '. The curve is shifted sideways. Bring \\(b\\) closer to \\(0\\).');
          else if (w < 0.74) ctx.note('Loss ' + fmt(l, 2) + '. The curve is still too flat. Increase \\(w\\).');
          else ctx.note('Loss ' + fmt(l, 2) + '. The curve is steeper than the overlapping observations support. Reduce \\(w\\) a little.');
        }
      });
      var target = M4.el('span', { class: 'm4-chip', text: 'target: loss < 0.35' }, L.row);
      target.style.fontWeight = '600';
    }
  });

  /* 4 ---------------------------------------------------------------- */
  steps.push({
    kind: 'explore',
    title: 'The derivative and the sign of −f′',
    html:
      '<p>For a function \\(f(x)\\) of one variable, the derivative \\(f\'(x)\\) is the slope of the tangent at \\(x\\). It is positive where the function rises and negative where it falls.</p>' +
      '<p>The sign of \\(-f\'(x)\\) therefore points towards the minimum: to the right of the minimum it is negative (move left), to the left of it it is positive (move right). Drag the point along \\(f(x) = \\tfrac14 (x-1)^2 + 1\\) and compare the tangent with the black arrow \\(-f\'(x)\\).</p>',
    mount: function (el, ctx) {
      ensureStyle();
      var wrap = M4.el('div', { class: 'l3-s1-center' }, el);
      var p = M4.plane(wrap, { xmin: -5, xmax: 7, ymin: -2, ymax: 8, width: 600, height: 500 });
      function f(x) { return 0.25 * (x - 1) * (x - 1) + 1; }
      function df(x) { return 0.5 * (x - 1); }
      p.fn(f, { stroke: GREEN, width: 5 });
      p.point(1, 1, { r: 5, fill: GREEN });
      var drop = p.line(4, 0, 4, f(4), { stroke: MUTED, width: 2, dash: '5 5' });
      var tan = p.line(0, 0, 1, 1, { stroke: ORANGE, width: 4 });
      var arr = p.arrow(4, -1, 3, -1, { stroke: INK, width: 5 });
      var lab = p.text(4, -1.6, '', { fill: INK, size: 16, weight: 700 });
      var row = bar(el);
      var rX = readout(row, 'x ='), rD = readout(row, "f\u2032(x) ="), rN = readout(row, "\u2212f\u2032(x) =");
      var rDir = M4.el('span', { class: 'm4-chip' }, row);
      function show(x) {
        var s = df(x), y = f(x);
        var hw = 1.6 / Math.sqrt(1 + s * s);
        tan.set(x - hw, y - s * hw, x + hw, y + s * hw);
        drop.set(x, 0, x, y);
        if (Math.abs(s) < 0.05) { arr.el.style.display = 'none'; }
        else { arr.el.style.display = ''; arr.set(x, -1, x - s, -1); }
        lab.set(x - s / 2, -1.65, Math.abs(s) < 0.05 ? '' : '\u2212f\u2032');
        rX.set(fmt(x, 2)); rD.set(fmt(s, 2)); rN.set(fmt(-s, 2));
        rDir.textContent = Math.abs(s) < 0.05 ? 'at the minimum' : (s > 0 ? 'minimum is to the left' : 'minimum is to the right');
      }
      var h = p.handle(4, f(4), {
        color: ORANGE, r: 13,
        onDrag: function (x) { x = clamp(x, -3.8, 5.8); h.set(x, f(x)); show(x); }
      });
      show(4);
    }
  });

  /* 5 ---------------------------------------------------------------- */
  steps.push({
    kind: 'explore',
    title: 'The gradient for two inputs',
    html:
      '<p>A function \\(f(x_1, x_2)\\) of two variables has one partial derivative per coordinate: the slope along \\(x_1\\) and the slope along \\(x_2\\). The <b>gradient</b> collects them in a vector, \\[\\nabla f = \\begin{bmatrix} \\partial f / \\partial x_1 \\\\ \\partial f / \\partial x_2 \\end{bmatrix}.\\]</p>' +
      '<p>The gradient points in the direction of steepest ascent, and \\(-\\nabla f\\) points in the direction of steepest descent. The plot shows the bowl \\(f = \\tfrac14 x_1^2 + \\tfrac12 x_2^2\\) from above as contour lines, with \\(\\nabla f\\) in orange and \\(-\\nabla f\\) in black.</p>',
    mount: function (el, ctx) {
      ensureStyle();
      var wrap = M4.el('div', { class: 'l3-s1-center' }, el);
      var p = M4.plane(wrap, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 520, height: 520 });
      bowlContours(p, 0.5, 1, [0.5, 1.5, 3, 5, 7.5]);
      var c1 = p.line(0, 0, 0, 0, { stroke: BLUE, width: 3, dash: '6 5' });
      var c2 = p.line(0, 0, 0, 0, { stroke: PURPLE, width: 3, dash: '6 5' });
      var up = p.arrow(0, 0, 1, 1, { stroke: ORANGE, width: 5 });
      var down = p.arrow(0, 0, -1, -1, { stroke: INK, width: 5 });
      var row = bar(el);
      var rP = readout(row, '(x\u2081, x\u2082) =');
      var r1 = readout(row, '\u2202f/\u2202x\u2081 ='); r1.el.style.color = BLUE;
      var r2 = readout(row, '\u2202f/\u2202x\u2082 ='); r2.el.style.color = PURPLE;
      var rf = readout(row, 'f =');
      var leg = M4.el('div', { class: 'l3-s1-legend' }, el);
      M4.el('span', { html: '<i style="background:' + ORANGE + '"></i>gradient, steepest ascent' }, leg);
      M4.el('span', { html: '<i style="background:' + INK + '"></i>negative gradient, steepest descent' }, leg);
      function show(x, y) {
        var gx = 0.5 * x, gy = y;
        up.set(x, y, x + gx, y + gy);
        down.set(x, y, x - gx, y - gy);
        c1.set(x, y, x + gx, y);
        c2.set(x + gx, y, x + gx, y + gy);
        var tiny = Math.sqrt(gx * gx + gy * gy) < 0.12;
        up.el.style.display = down.el.style.display = tiny ? 'none' : '';
        rP.set('(' + fmt(x, 1) + ', ' + fmt(y, 1) + ')');
        r1.set(fmt(gx, 2)); r2.set(fmt(gy, 2)); rf.set(fmt(0.25 * x * x + 0.5 * y * y, 2));
      }
      p.handle(3, 1.5, {
        color: GREEN, r: 13,
        onDrag: function (x, y) { show(clamp(x, -4.5, 4.5), clamp(y, -3, 3)); }
      });
      show(3, 1.5);
    }
  });

  /* 6 ---------------------------------------------------------------- */
  steps.push({
    kind: 'exercise',
    title: 'Direction of steepest descent',
    html:
      '<p>For the same bowl, \\(f(x_1, x_2) = \\tfrac14 x_1^2 + \\tfrac12 x_2^2\\), consider the point \\((2, -2)\\). Drag the tip of the black arrow so that the arrow, starting at this point, equals \\(-\\nabla f(2, -2)\\). The tip snaps to steps of \\(0.5\\).</p>',
    hint: 'The partial derivatives are \\(\\partial f/\\partial x_1 = \\tfrac12 x_1\\) and \\(\\partial f/\\partial x_2 = x_2\\). Evaluate both at \\((2,-2)\\), flip both signs, and add the result to the point.',
    mount: function (el, ctx) {
      ensureStyle();
      var wrap = M4.el('div', { class: 'l3-s1-center' }, el);
      var p = M4.plane(wrap, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 520, height: 520 });
      bowlContours(p, 0.5, 1, [0.5, 1.5, 3, 5, 7.5]);
      var P = [2, -2];
      var arr = p.arrow(P[0], P[1], 3.5, -1, { stroke: INK, width: 5 });
      p.point(P[0], P[1], { r: 8, fill: GREEN });
      p.text(P[0] + 0.25, P[1] - 0.65, '(2, \u22122)', { fill: INK, size: 16, weight: 700, anchor: 'start' });
      var row = bar(el);
      var rV = readout(row, 'arrow =');
      var done = false;
      function vec(x, y) { return [x - P[0], y - P[1]]; }
      function show(x, y) { arr.set(P[0], P[1], x, y); var v = vec(x, y); rV.set('(' + fmt(v[0], 1) + ', ' + fmt(v[1], 1) + ')'); }
      var h = p.handle(3.5, -1, {
        color: INK, r: 13, snap: 0.5,
        onDrag: function (x, y) { if (!done) show(x, y); },
        onEnd: function (x, y) {
          if (done) return;
          var v = vec(x, y);
          if (Math.abs(v[0] + 1) < 0.01 && Math.abs(v[1] - 2) < 0.01) {
            done = true;
            ring(p, x, y, GREEN);
            ctx.note('\\(\\nabla f(2,-2) = (1, -2)\\), so \\(-\\nabla f = (-1, 2)\\). The arrow crosses the contour lines towards lower values.');
            ctx.solved();
          } else if (Math.abs(v[0] - 1) < 0.01 && Math.abs(v[1] + 2) < 0.01) {
            ctx.wrong('This arrow is the gradient \\((1, -2)\\) itself, the direction of steepest ascent. Flip both signs.');
          } else if (Math.abs(v[0] + 2) < 0.01 && Math.abs(v[1] - 2) < 0.01) {
            ctx.wrong('This arrow points straight at the minimum, but the slope along \\(x_1\\) is \\(\\tfrac12 x_1 = 1\\), not \\(2\\).');
          } else {
            ctx.wrong('The arrow is \\((' + fmt(v[0], 1) + ', ' + fmt(v[1], 1) + ')\\). Compute both partial derivatives at \\((2,-2)\\) and negate them.');
          }
        }
      });
      show(h.x !== undefined ? h.x : 3.5, h.y !== undefined ? h.y : -1);
    }
  });

  /* 7 ---------------------------------------------------------------- */
  steps.push({
    kind: 'exercise',
    title: 'Curvature',
    html:
      '<p>For the parabola \\(f(x) = \\tfrac12 a x^2\\) the first derivative is \\(f\'(x) = a x\\) and the second derivative is \\(f\'\'(x) = a\\). The second derivative states how fast the slope itself changes and is called the <b>curvature</b>. A large \\(a\\) gives a narrow, steep bowl, a small \\(a\\) a wide, flat bowl, and \\(a &lt; 0\\) turns the minimum into a maximum.</p>' +
      '<p>The dashed curve is a parabola of this form whose slope at \\(x = 1\\) is \\(4\\). Set \\(a\\) so that the green parabola coincides with it, then press Check.</p>',
    hint: 'The slope at \\(x = 1\\) is \\(f\'(1) = a \\cdot 1\\). Read the displayed slope while moving the slider.',
    mount: function (el, ctx) {
      ensureStyle();
      var wrap = M4.el('div', { class: 'l3-s1-center' }, el);
      var p = M4.plane(wrap, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 520, height: 520 });
      var TARGET = 4;
      p.fn(function (x) { return 0.5 * TARGET * x * x; }, { stroke: MUTED, width: 3 }).el.setAttribute('stroke-dasharray', '7 7');
      var a = 1;
      var curve = p.fn(function (x) { return 0.5 * a * x * x; }, { stroke: GREEN, width: 5 });
      var tan = p.line(0, 0, 1, 1, { stroke: ORANGE, width: 4 });
      var pt = p.point(1, 0.5, { r: 7, fill: ORANGE });
      var row = bar(el);
      var rA = readout(row, 'f\u2033 = a ='), rS = readout(row, 'slope at x = 1:');
      var rShape = M4.el('span', { class: 'm4-chip' }, row);
      function show() {
        curve.set(function (x) { return 0.5 * a * x * x; });
        var y = 0.5 * a, hw = 1.1 / Math.sqrt(1 + a * a);
        tan.set(1 - hw, y - a * hw, 1 + hw, y + a * hw);
        pt.set(1, y);
        rA.set(fmt(a, 1)); rS.set(fmt(a, 1));
        rShape.textContent = a < -0.05 ? 'opens downwards: a maximum' : (a < 0.05 ? 'flat line: no curvature' : (a < 1.5 ? 'wide, flat bowl' : 'narrow, steep bowl'));
      }
      var ctl = M4.el('div', {}, el);
      M4.slider(ctl, {
        min: -2, max: 5, step: 0.1, value: 1, label: 'a', format: function (v) { return fmt(+v, 1); },
        onInput: function (v) { a = Math.round(+v * 10) / 10; show(); }
      });
      var brow = bar(el);
      M4.button(brow, 'Check', function () {
        if (Math.abs(a - TARGET) < 0.05) {
          curve.el.setAttribute('stroke-width', 7);
          ctx.note('With \\(a = 4\\) the slope is \\(4x\\): one unit to the right it is already \\(4\\), two units to the right it is \\(8\\).');
          ctx.solved();
        } else if (a < 0) {
          ctx.wrong('A negative \\(a\\) opens the parabola downwards. The dashed curve opens upwards.');
        } else if (a < TARGET) {
          ctx.wrong('The slope at \\(x = 1\\) is \\(' + fmt(a, 1) + '\\). The green bowl is too wide. Increase the curvature.');
        } else {
          ctx.wrong('The slope at \\(x = 1\\) is \\(' + fmt(a, 1) + '\\). The green bowl is too narrow. Reduce the curvature.');
        }
      }, { primary: true });
      show();
    }
  });

  /* 8 ---------------------------------------------------------------- */
  steps.push({
    kind: 'explore',
    title: 'The Hessian and its eigenvalues',
    html:
      '<p>In two dimensions the <b>Hessian</b> \\(H\\) collects all second derivatives in a table: entry \\(H_{ij}\\) states how much the slope along \\(x_i\\) changes when moving along \\(x_j\\). For the bowl \\(f(\\mathbf{x}) = \\tfrac12\\,\\mathbf{x}^\\top H\\,\\mathbf{x}\\), cutting along its two main directions gives two one-dimensional parabolas, shown in orange and blue.</p>' +
      '<p>The curvatures of these two slices are the eigenvalues \\(\\lambda_1, \\lambda_2\\) of \\(H\\). The lecture example uses \\(3\\) and \\(0.8\\). Rotating the bowl changes the entries of \\(H\\) but not the eigenvalues. A small eigenvalue gives a long, flat valley, and a negative eigenvalue gives a saddle point.</p>',
    mount: function (el, ctx) {
      ensureStyle();
      var grid = M4.el('div', { class: 'm4-grid2' }, el);
      var left = panel(grid, 'f seen from above');
      var right = panel(grid, 'The two main slices');
      var p = M4.plane(left, { xmin: -3, xmax: 3, ymin: -3, ymax: 3, width: 400, height: 400, grid: false, axes: true, labels: true });
      var s = { l1: 3, l2: 0.8, th: 0 };
      function H() {
        var c = Math.cos(s.th), n = Math.sin(s.th);
        return [s.l1 * c * c + s.l2 * n * n, (s.l1 - s.l2) * c * n, s.l1 * n * n + s.l2 * c * c];
      }
      var h = H();
      var hm = heat(p, -3, 3, -3, 3, 33, function (x, y) {
        var v = 0.5 * (h[0] * x * x + 2 * h[1] * x * y + h[2] * y * y);
        var t = Math.min(7, Math.floor(Math.sqrt(Math.abs(v)) / 0.52)) / 7;
        return mix('#f6f4ec', v >= 0 ? GREEN : PINK(), t);
      });
      var a1 = p.line(-2.6, 0, 2.6, 0, { stroke: ORANGE, width: 5 });
      var a2 = p.line(0, -2.6, 0, 2.6, { stroke: BLUE, width: 5 });
      p.point(0, 0, { r: 6, fill: INK });
      var prof = sliceProfile(right, 400, 210);
      var mat = M4.el('div', { class: 'l3-s1-matrix' }, right);
      var rrow = M4.el('div', { class: 'm4-row l3-s1-bar' }, right);
      var rE = readout(rrow, 'eigenvalues');
      var rShape = M4.el('span', { class: 'm4-chip' }, rrow);
      var leg = M4.el('div', { class: 'l3-s1-legend' }, el);
      M4.el('span', { html: '<i style="background:' + GREEN + '"></i>above the centre' }, leg);
      M4.el('span', { html: '<i style="background:' + PINK() + '"></i>below the centre' }, leg);
      function shape() {
        var lo = Math.min(s.l1, s.l2), hi = Math.max(s.l1, s.l2);
        if (Math.abs(lo) < 0.05 || Math.abs(hi) < 0.05) return (hi > 0.05) ? 'flat valley floor' : (lo < -0.05 ? 'flat ridge' : 'flat plane');
        if (lo < 0 && hi > 0) return 'saddle point';
        if (hi < 0) return 'maximum';
        return lo / hi < 0.2 ? 'long, flat valley' : 'bowl with a minimum';
      }
      var raf = 0;
      function draw() {
        raf = 0;
        h = H();
        hm.paint();
        var c = Math.cos(s.th), n = Math.sin(s.th), R = 2.7;
        a1.set(-R * c, -R * n, R * c, R * n);
        a2.set(R * n, -R * c, -R * n, R * c);
        prof.set(s.l1 / 4, s.l2 / 4);
        mat.innerHTML = M4.tex('H = \\begin{bmatrix} ' + h[0].toFixed(2) + ' & ' + h[1].toFixed(2) + ' \\\\ ' + h[1].toFixed(2) + ' & ' + h[2].toFixed(2) + ' \\end{bmatrix}', true);
        rE.set(fmt(s.l1, 1) + ' and ' + fmt(s.l2, 1));
        rShape.textContent = shape();
      }
      function schedule() { if (!raf) raf = requestAnimationFrame(draw); }
      ctx.onCleanup(function () { if (raf) cancelAnimationFrame(raf); });
      var ctl = M4.el('div', {}, el);
      M4.slider(ctl, { min: -2, max: 4, step: 0.1, value: 3, label: '\u03bb\u2081 (orange slice)', format: function (v) { return fmt(+v, 1); }, onInput: function (v) { s.l1 = +v; schedule(); } });
      M4.slider(ctl, { min: -2, max: 4, step: 0.1, value: 0.8, label: '\u03bb\u2082 (blue slice)', format: function (v) { return fmt(+v, 1); }, onInput: function (v) { s.l2 = +v; schedule(); } });
      M4.slider(ctl, { min: 0, max: 90, step: 1, value: 0, label: 'rotation', format: function (v) { return Math.round(+v) + '\u00b0'; }, onInput: function (v) { s.th = +v * Math.PI / 180; schedule(); } });
      draw();
    }
  });
  function PINK() { return C.pink; }

  /* 9 ---------------------------------------------------------------- */
  steps.push({
    kind: 'exercise',
    title: 'Shape from eigenvalues',
    html:
      '<p>Each card shows the two main slices through a surface at a point where the slope is zero. Each tile lists the two eigenvalues \\(\\lambda_1, \\lambda_2\\) of a Hessian. Drag every tile onto the surface it describes.</p>',
    hint: 'The sign of an eigenvalue states whether its slice curves upwards or downwards. Its size states how strongly. A value close to zero is an almost flat slice.',
    mount: function (el, ctx) {
      ensureStyle();
      var items = [
        { key: 'bowl', name: 'Bowl with a minimum', c: [1, 0.27], tex: '\\lambda = 3,\\ 0.8' },
        { key: 'valley', name: 'Long, flat valley', c: [1, 0.02], tex: '\\lambda = 3,\\ 0.05' },
        { key: 'saddle', name: 'Saddle point', c: [1, -0.33], tex: '\\lambda = 3,\\ -1' },
        { key: 'max', name: 'Maximum', c: [-1, -0.27], tex: '\\lambda = -3,\\ -0.8' }
      ];
      var why = {
        bowl: 'Both slices curve upwards with comparable strength.',
        valley: 'One slice is steep, the other almost flat.',
        saddle: 'One slice curves upwards and the other downwards.',
        max: 'Both slices curve downwards.'
      };
      var cards = M4.el('div', { class: 'l3-s1-cards' }, el);
      var slots = [], slotKey = new Map(), tokenKey = new Map(), cardOf = new Map();
      items.forEach(function (it) {
        var card = M4.el('div', { class: 'l3-s1-card' }, cards);
        sliceProfile(card, 150, 96).set(it.c[0], it.c[1]);
        M4.el('b', { text: it.name }, card);
        var slot = M4.el('div', { class: 'm4-slot' }, card);
        slots.push(slot); slotKey.set(slot, it.key); cardOf.set(slot, card);
      });
      var tray = M4.el('div', { class: 'm4-row l3-s1-tray' }, el);
      var order = [2, 0, 3, 1], tokens = [];
      order.forEach(function (i) {
        var t = M4.el('div', { class: 'm4-token', html: M4.tex(items[i].tex) }, tray);
        tokens.push(t); tokenKey.set(t, items[i].key);
      });
      var placed = 0;
      M4.dragDrop({
        tokens: tokens, slots: slots,
        onDrop: function (tok, slot) {
          var k = tokenKey.get(tok);
          if (slot.classList.contains('filled')) { tray.appendChild(tok); return; }
          if (slotKey.get(slot) === k) {
            slot.appendChild(tok);
            slot.classList.add('filled');
            cardOf.get(slot).classList.add('l3-s1-done');
            tok.classList.add('m4-pop');
            tok.style.pointerEvents = 'none';
            tok.style.cursor = 'default';
            placed++;
            ctx.note(why[k]);
            if (placed === items.length) {
              ctx.note('All four match. The eigenvalues of \\(H\\) describe the shape of the surface around the point.');
              ctx.solved();
            }
          } else {
            tray.appendChild(tok);
            var target = slotKey.get(slot);
            ctx.wrong('Not this surface. ' + why[target] + ' Compare that with the signs and sizes on the tile.');
          }
        },
        onMiss: function (tok) { if (tok.parentNode !== tray && !tok.parentNode.classList.contains('filled')) tray.appendChild(tok); }
      });
    }
  });

  /* 10 --------------------------------------------------------------- */
  steps.push({
    kind: 'explore',
    title: 'Gradient descent',
    html:
      '<p>Since \\(-\\nabla L\\) points downhill, the parameters \\(\\theta = (w, b)\\) can be improved by repeating one update: \\[\\theta \\leftarrow \\theta - \\eta\\,\\nabla L(\\theta).\\] Here \\(L\\) is the loss and \\(\\eta\\) is the <b>learning rate</b>, which scales the size of each step.</p>' +
      '<p>Run the algorithm on the exam classifier. The steps are large where the surface is steep and shrink near the minimum, because the gradient itself shrinks there. The orange point can be dragged to choose another starting position.</p>',
    mount: function (el, ctx) {
      var pts, k, timer = 0, running = false;
      var L = landscape(el, { onUserDrag: function () { stop(); reset(false); } });
      var rK = readout(L.row, 'step'), rS = readout(L.row, 'step length =');
      var eta = 0.5;
      var ctl = M4.el('div', {}, el);
      M4.slider(ctl, { min: 0.1, max: 2, step: 0.1, value: 0.5, label: 'learning rate \u03b7', format: function (v) { return fmt(+v, 1); }, onInput: function (v) { eta = +v; } });
      var brow = bar(el);
      var bStep = M4.button(brow, 'One step', function () { stop(); stepOnce(); });
      var bRun = M4.button(brow, 'Run', function () { if (running) stop(); else run(); }, { primary: true });
      M4.button(brow, 'Reset', function () { stop(); L.setPoint(INIT[0], INIT[1]); reset(true); });
      function reset() {
        pts = [[L.state.w, L.state.b]]; k = 0;
        L.trail.set([pts[0], pts[0]]);
        rK.set('0'); rS.set('\u2013');
      }
      function stepOnce() {
        var g = bceGrad(L.state.w, L.state.b);
        var dw = -eta * g[0], db = -eta * g[1];
        var len = Math.sqrt(dw * dw + db * db);
        var w = clamp(L.state.w + dw, WMIN, WMAX), b = clamp(L.state.b + db, BMIN, BMAX);
        var keep = pts, kk = k + 1;
        L.setPoint(w, b);
        pts = keep; k = kk;
        pts.push([w, b]);
        L.trail.set(pts);
        rK.set(String(k)); rS.set(fmt(len, 3));
        return len;
      }
      function run() {
        running = true; bRun.textContent = 'Pause';
        var last = 0;
        function frame(t) {
          if (!running) return;
          if (t - last > 110) {
            last = t;
            var len = stepOnce();
            if (len < 0.002 || k >= 300) { stop(); return; }
          }
          timer = requestAnimationFrame(frame);
        }
        timer = requestAnimationFrame(frame);
      }
      function stop() {
        running = false; bRun.textContent = 'Run';
        if (timer) cancelAnimationFrame(timer);
        timer = 0;
      }
      ctx.onCleanup(stop);
      reset();
    }
  });

  /* 11 --------------------------------------------------------------- */
  steps.push({
    kind: 'exercise',
    title: 'One step by hand',
    html:
      '<p>Consider the loss \\(L(\\theta) = \\tfrac12\\left(3\\,\\theta_1^2 + 0.8\\,\\theta_2^2\\right)\\), whose Hessian has the eigenvalues \\(3\\) and \\(0.8\\). The current parameters are \\(\\theta = (1,\\ 2.5)\\) and the learning rate is \\(\\eta = 0.5\\).</p>' +
      '<p>Drag the orange point from \\(\\theta\\) to the position after one gradient descent step, \\(\\theta - \\eta\\,\\nabla L(\\theta)\\). The point snaps to steps of \\(0.5\\).</p>',
    hint: 'The gradient is \\(\\nabla L(\\theta) = (3\\,\\theta_1,\\ 0.8\\,\\theta_2)\\). Evaluate it at \\((1, 2.5)\\), multiply by \\(0.5\\), and subtract the result from \\(\\theta\\).',
    mount: function (el, ctx) {
      ensureStyle();
      var wrap = M4.el('div', { class: 'l3-s1-center' }, el);
      var p = M4.plane(wrap, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 520, height: 520 });
      bowlContours(p, 3, 0.8, [0.4, 1.2, 2.5, 4.3, 6.5]);
      var T = [1, 2.5], ANS = [-0.5, 1.5];
      var arr = p.arrow(T[0], T[1], T[0], T[1], { stroke: INK, width: 5 });
      arr.el.style.display = 'none';
      p.point(T[0], T[1], { r: 8, fill: GREEN });
      p.text(T[0] + 0.3, T[1] + 0.3, '\u03b8 = (1, 2.5)', { fill: INK, size: 16, weight: 700, anchor: 'start' });
      var row = bar(el);
      var rT = readout(row, 'new \u03b8 ='), rD = readout(row, 'step ='), rL = readout(row, 'L =');
      var done = false;
      function Lf(x, y) { return 0.5 * (3 * x * x + 0.8 * y * y); }
      function show(x, y) {
        var moved = Math.abs(x - T[0]) + Math.abs(y - T[1]) > 0.01;
        arr.el.style.display = moved ? '' : 'none';
        if (moved) arr.set(T[0], T[1], x, y);
        rT.set('(' + fmt(x, 1) + ', ' + fmt(y, 1) + ')');
        rD.set('(' + fmt(x - T[0], 1) + ', ' + fmt(y - T[1], 1) + ')');
        rL.set(fmt(Lf(x, y), 2));
      }
      function near(x, y, a, b) { return Math.abs(x - a) < 0.01 && Math.abs(y - b) < 0.01; }
      p.handle(T[0], T[1], {
        color: ORANGE, r: 13, snap: 0.5,
        onDrag: function (x, y) { if (!done) show(x, y); },
        onEnd: function (x, y) {
          if (done) return;
          if (near(x, y, ANS[0], ANS[1])) {
            done = true;
            ring(p, x, y, GREEN);
            ctx.note('\\(\\nabla L = (3, 2)\\), so \\(\\theta \\leftarrow (1, 2.5) - 0.5\\,(3, 2) = (-0.5,\\ 1.5)\\). The loss falls from \\(4\\) to \\(1.275\\).');
            ctx.solved();
          } else if (near(x, y, T[0], T[1])) {
            ctx.note('The point is still at the starting position \\(\\theta\\).');
          } else if (near(x, y, 2.5, 3.5)) {
            ctx.wrong('This adds \\(\\eta\\,\\nabla L\\). Gradient descent subtracts it, because the gradient points uphill.');
          } else if (near(x, y, -2, 0.5)) {
            ctx.wrong('This is \\(\\theta - \\nabla L\\), a step with \\(\\eta = 1\\). Multiply the gradient by \\(\\eta = 0.5\\) first.');
          } else if (near(x, y, 0.5, 2) || near(x, y, 0.5, 1.5) || near(x, y, 0, 1.5)) {
            ctx.wrong('The two components of the gradient differ: \\(3\\,\\theta_1 = 3\\) and \\(0.8\\,\\theta_2 = 2\\). Scale each by \\(\\eta\\) separately.');
          } else {
            ctx.wrong('The step drawn is \\((' + fmt(x - T[0], 1) + ', ' + fmt(y - T[1], 1) + ')\\). It should equal \\(-\\eta\\,\\nabla L(\\theta)\\) with \\(\\nabla L = (3\\,\\theta_1,\\ 0.8\\,\\theta_2)\\).');
          }
        }
      });
      show(T[0], T[1]);
    }
  });

  /* 12 --------------------------------------------------------------- */
  steps.push({
    kind: 'exercise',
    title: 'Shrinking steps',
    html:
      '<p>Gradient descent runs on \\(f(x) = \\tfrac12 a x^2\\) with curvature \\(a = 1\\) and learning rate \\(\\eta = 0.2\\), starting at \\(x = 2\\). The update is \\(x \\leftarrow x - \\eta\\,f\'(x)\\) with \\(f\'(x) = a x\\).</p>' +
      '<p>Enter the value of \\(x\\) after two steps.</p>',
    hint: 'One step gives \\(x - 0.2 \\cdot x = 0.8\\,x\\). Apply this twice, starting from \\(2\\).',
    mount: function (el, ctx) {
      ensureStyle();
      var wrap = M4.el('div', { class: 'l3-s1-center' }, el);
      var p = M4.plane(wrap, { xmin: -3, xmax: 3, ymin: -1, ymax: 3, width: 540, height: 360 });
      p.fn(function (x) { return 0.5 * x * x; }, { stroke: GREEN, width: 5 });
      p.point(2, 2, { r: 9, fill: ORANGE });
      p.text(2.15, 2.25, 'start', { fill: INK, size: 16, weight: 700, anchor: 'start' });
      var timers = [];
      ctx.onCleanup(function () { timers.forEach(clearTimeout); });
      var row = bar(el);
      M4.numberInput(row, {
        answer: 1.28, tolerance: 0.011, placeholder: 'x after 2 steps', label: 'x =',
        onCorrect: function () {
          var xs = [2, 1.6, 1.28];
          [1, 2].forEach(function (i) {
            timers.push(setTimeout(function () {
              p.arrow(xs[i - 1], 0.5 * xs[i - 1] * xs[i - 1], xs[i], 0.5 * xs[i] * xs[i], { stroke: INK, width: 4 });
              p.point(xs[i], 0.5 * xs[i] * xs[i], { r: 8, fill: i === 2 ? GREEN : ORANGE });
            }, 350 * i));
          });
          ctx.note('\\(2 \\to 1.6 \\to 1.28\\): each step multiplies \\(x\\) by \\(0.8\\). The first step has length \\(0.4\\), the second \\(0.32\\), because the slope \\(f\'(x) = x\\) shrinks towards the minimum.');
          ctx.solved();
        },
        onWrong: function (v) {
          v = +v;
          if (Math.abs(v - 1.6) < 0.011) ctx.wrong('\\(1.6\\) is the value after one step. Apply the update once more.');
          else if (Math.abs(v - 1.2) < 0.011) ctx.wrong('The second step is shorter than the first: the slope at \\(x = 1.6\\) is \\(1.6\\), not \\(2\\).');
          else if (v > 2) ctx.wrong('The value increased. The update subtracts \\(\\eta\\,f\'(x)\\), and \\(f\'(x)\\) is positive to the right of the minimum.');
          else ctx.wrong('One step is \\(x \\leftarrow x - 0.2\\,x\\). Start at \\(2\\) and apply it twice.');
        }
      });
    }
  });

  /* 13 is not used: recap is the final step -------------------------- */
  steps.push({
    kind: 'text',
    title: 'Recap',
    html:
      '<ul>' +
      '<li>Every parameter setting \\((w, b)\\) is one model with one loss value. The loss over all settings forms the loss landscape, and lower on the surface means a better model.</li>' +
      '<li>The gradient \\(\\nabla f\\) collects the partial derivatives and points to steepest ascent, so \\(-\\nabla f\\) points downhill. The Hessian \\(H\\) collects the second derivatives. Its eigenvalues are the curvatures of the main slices and distinguish bowls, flat valleys and saddle points.</li>' +
      '<li>Gradient descent repeats \\(\\theta \\leftarrow \\theta - \\eta\\,\\nabla L(\\theta)\\) with learning rate \\(\\eta\\). The steps are large where the surface is steep and shrink near the minimum, where the gradient vanishes.</li>' +
      '</ul>'
  });

  M4.lesson({
    id: 'l3-s1',
    module: 'l3',
    title: 'Loss landscapes and the descent step',
    summary: 'Read a loss landscape, interpret gradient and curvature, and take gradient descent steps on a small classifier.',
    minutes: 14,
    steps: steps
  });
})();
