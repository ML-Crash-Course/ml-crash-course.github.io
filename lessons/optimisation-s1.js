(function () {
  'use strict';

  var C = M4.colors;
  var RED = C.red, BLUE = C.blue, GREEN = C.green, ORANGE = C.orange;

  /* ---------- one-time CSS ---------- */
  function injectStyle() {
    if (document.getElementById('optimisation-s1-style')) return;
    var s = document.createElement('style');
    s.id = 'optimisation-s1-style';
    s.textContent =
      '.optimisation-s1-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:8px}' +
      '.optimisation-s1-wrap svg{max-width:100%;height:auto;touch-action:none}' +
      '.optimisation-s1-panel{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%}' +
      '.optimisation-s1-cap{font-size:15px;font-weight:600;color:' + C.muted + ';text-align:center}' +
      '.optimisation-s1-meter{width:100%;max-width:460px;height:18px;border-radius:9px;background:' + C.line + ';overflow:hidden}' +
      '.optimisation-s1-meter>div{height:100%;border-radius:9px;background:' + RED + ';transition:width .12s linear,background .2s}' +
      '.optimisation-s1-tray{min-height:60px;justify-content:center}' +
      '.optimisation-s1-slotbox{display:flex;flex-direction:column;align-items:center;gap:6px}' +
      '.optimisation-s1-slotbox .m4-slot{min-width:170px;min-height:54px;display:flex;align-items:center;justify-content:center}' +
      '.optimisation-s1-letter{font-weight:800;font-size:18px;color:' + RED + '}' +
      '.optimisation-s1-val{font-variant-numeric:tabular-nums;font-weight:700}';
    document.head.appendChild(s);
  }

  /* ---------- local helpers ---------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(v, d) { return (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d); }
  function df(f, x) { return (f(x + 1e-4) - f(x - 1e-4)) / 2e-4; }

  function wrap(el) {
    injectStyle();
    el.innerHTML = '';
    return M4.el('div', { class: 'optimisation-s1-wrap' }, el);
  }

  // readout pill: "<tex label> = <value>"
  function readout(parent, label) {
    var pill = M4.el('span', { class: 'm4-readout' }, parent);
    M4.el('span', { html: M4.tex(label) + '&nbsp;=&nbsp;' }, pill);
    var v = M4.el('span', { class: 'optimisation-s1-val', text: '' }, pill);
    return { el: pill, set: function (t) { v.textContent = t; } };
  }
  function statusPill(parent, text) {
    var pill = M4.el('span', { class: 'm4-readout', text: text }, parent);
    return {
      el: pill,
      set: function (t, color) { pill.textContent = t; pill.style.color = color || ''; }
    };
  }

  // Draggable dot in maths coordinates with an arbitrary constraint map.
  function dragDot(p, o) {
    var g = M4.svg('g', { style: 'cursor:grab;touch-action:none' }, p.g);
    M4.svg('circle', { r: 24, fill: o.color, 'fill-opacity': 0.16 }, g);
    var c = M4.svg('circle', { r: o.r || 12, fill: o.color, stroke: '#ffffff', 'stroke-width': 3 }, g);
    var st = { x: o.x, y: o.y };
    var sx = 0, sy = 0, scale = 1;
    function place() { g.setAttribute('transform', 'translate(' + p.x(st.x) + ',' + p.y(st.y) + ')'); }
    function set(x, y) { st.x = x; st.y = y; place(); }
    place();
    M4.drag(g, {
      onStart: function () {
        var r = p.svg.getBoundingClientRect();
        var vb = p.svg.viewBox && p.svg.viewBox.baseVal;
        scale = (r.width > 0 && vb && vb.width > 0) ? vb.width / r.width : 1;
        sx = p.x(st.x); sy = p.y(st.y);
        g.style.cursor = 'grabbing';
        if (o.onStart) o.onStart();
      },
      onMove: function (dx, dy) {
        var x = p.ux(sx + dx * scale), y = p.uy(sy + dy * scale);
        var m = o.map ? o.map(x, y) : [x, y];
        set(m[0], m[1]);
        if (o.onChange) o.onChange(st.x, st.y);
      },
      onEnd: function () {
        g.style.cursor = 'grab';
        if (o.onEnd) o.onEnd(st.x, st.y);
      }
    });
    return {
      el: g,
      get x() { return st.x; },
      get y() { return st.y; },
      set: set,
      color: function (col) { c.setAttribute('fill', col); g.firstChild.setAttribute('fill', col); }
    };
  }

  function onCurve(f, lo, hi) {
    return function (x) { var cx = clamp(x, lo, hi); return [cx, f(cx)]; };
  }

  /* ---------- data and functions (all values checked numerically) ---------- */
  // One-parameter fit y = w x. Sum x^2 = 30, sum xy = 45, sum y^2 = 69.
  // L(w) = (69 - 90 w + 30 w^2)/4 = 7.5 (w - 1.5)^2 + 0.375.
  var D1 = [[1, 2], [2, 2], [3, 5], [4, 6]];
  function loss1(w) {
    var s = 0;
    for (var i = 0; i < D1.length; i++) { var r = D1[i][1] - w * D1[i][0]; s += r * r; }
    return s / D1.length;
  }

  // Quartic landscape: L'(t) = 0.2 t (t + 2)(t - 3); minima at -2 (2.933) and 3 (0.85), maximum at 0 (4).
  function quartic(t) { return 0.2 * (Math.pow(t, 4) / 4 - Math.pow(t, 3) / 3 - 3 * t * t) + 4; }

  // Wavy landscape for the "find the global minimum" exercise.
  function wavy(t) { return 0.12 * (t - 1.5) * (t - 1.5) + 1.5 * Math.sin(2 * t) + 3; }
  function localMinima(f, lo, hi) {
    var out = [], h = 0.001;
    for (var x = lo + h; x < hi - h; x += h) {
      if (f(x) < f(x - h) && f(x) <= f(x + h)) out.push(x);
    }
    return out;
  }

  // Funnel: one minimum at 0 but not convex.
  function funnel(t) { return 4 * (1 - Math.exp(-t * t / 2)) + 0.05 * t * t; }

  // Two-parameter fit y = a x + b. Least squares: a = 0.85, b = 0.9, minimum MSE = 0.095.
  var D2 = [[0, 1], [1, 1.5], [2, 3], [3, 3], [4, 4.5]];
  function loss2(a, b) {
    var s = 0;
    for (var i = 0; i < D2.length; i++) { var r = D2[i][1] - a * D2[i][0] - b; s += r * r; }
    return s / D2.length;
  }

  function landscapePlane(parent, f, opts) {
    opts = opts || {};
    var p = M4.plane(parent, {
      xmin: opts.xmin, xmax: opts.xmax, ymin: opts.ymin, ymax: opts.ymax,
      width: 640, height: 400, grid: true, axes: true, labels: false
    });
    p.text(opts.xmax - 0.35, -0.6, 'θ', { fill: C.muted, size: 18, weight: 700 });
    p.text(0.25, opts.ymax - 0.55, 'L(θ)', { fill: C.muted, size: 16, anchor: 'start', weight: 700 });
    return p;
  }

  /* =====================================================================
     Step mounts
     ===================================================================== */

  // Explore: one-parameter fit, data view and loss view side by side.
  function mountFitExplore(el, ctx) {
    var root = wrap(el);
    var grid = M4.el('div', { class: 'm4-grid2', style: 'width:100%' }, root);
    var left = M4.el('div', { class: 'optimisation-s1-panel' }, grid);
    var right = M4.el('div', { class: 'optimisation-s1-panel' }, grid);
    M4.el('div', { class: 'optimisation-s1-cap', text: 'Data and the line y = w x' }, left);
    M4.el('div', { class: 'optimisation-s1-cap', text: 'Loss as a function of w (drag the dot)' }, right);

    var pd = M4.plane(left, { xmin: -0.5, xmax: 5, ymin: -0.5, ymax: 8, width: 360, height: 360 });
    var res = [], i;
    for (i = 0; i < D1.length; i++) res.push(pd.line(D1[i][0], D1[i][1], D1[i][0], D1[i][1], { stroke: ORANGE, width: 4 }));
    var line = pd.line(0, 0, 5, 5, { stroke: RED, width: 4 });
    for (i = 0; i < D1.length; i++) pd.point(D1[i][0], D1[i][1], { r: 7, fill: BLUE });

    var pl = M4.plane(right, { xmin: -0.45, xmax: 3.4, ymin: -2.4, ymax: 20, width: 360, height: 360, grid: false, labels: false });
    for (i = 0; i <= 3; i++) pl.text(i, -1.6, String(i), { fill: C.muted, size: 15 });
    [5, 10, 15].forEach(function (v) {
      pl.line(-0.05, v, 3.4, v, { stroke: C.line, width: 1 });
      pl.text(-0.1, v - 0.4, String(v), { fill: C.muted, size: 15, anchor: 'end' });
    });
    pl.text(3.25, 1.0, 'w', { fill: C.muted, size: 17, weight: 700 });
    pl.text(0.12, 18.8, 'L(w)', { fill: C.muted, size: 16, anchor: 'start', weight: 700 });
    pl.path((function () { var a = []; for (var k = 0; k <= 120; k++) { var w = 3 * k / 120; a.push([w, loss1(w)]); } return a; })(), { stroke: RED, width: 4 });
    var drop = pl.line(1, 0, 1, 1, { stroke: RED, width: 2, dash: '5 5' });

    var row = M4.el('div', { class: 'm4-row' }, root);
    var rw = readout(row, 'w'), rl = readout(row, 'L(w)');
    var slider;

    function update(w, fromSlider) {
      var xe = w * 5 > 8 ? 8 / w : 5;
      line.set(0, 0, xe, w * xe);
      for (var k = 0; k < D1.length; k++) res[k].set(D1[k][0], D1[k][1], D1[k][0], w * D1[k][0]);
      drop.set(w, 0, w, loss1(w));
      rw.set(fmt(w, 2)); rl.set(fmt(loss1(w), 2));
      if (!fromSlider && slider) slider.set(w);
      if (fromSlider) dot.set(w, loss1(w));
    }
    var dot = dragDot(pl, {
      x: 0.5, y: loss1(0.5), color: RED,
      map: onCurve(loss1, 0, 3),
      onChange: function (x) { update(x, false); }
    });
    slider = M4.slider(root, {
      min: 0, max: 3, step: 0.01, value: 0.5, label: 'slope w',
      format: function (v) { return fmt(+v, 2); },
      onInput: function (v) { update(+v, true); }
    });
    update(0.5, true);
    M4.el('div', { class: 'm4-note', text: 'Orange segments are the errors between each data point and the line.' }, root);
  }

  // Exercise: minimise by hand with only the loss value as a guide.
  function mountMinimiseByHand(el, ctx) {
    var root = wrap(el);
    var pd = M4.plane(root, { xmin: -0.5, xmax: 5, ymin: -0.5, ymax: 8, width: 460, height: 400 });
    var res = [], i;
    for (i = 0; i < D1.length; i++) res.push(pd.line(D1[i][0], D1[i][1], D1[i][0], D1[i][1], { stroke: ORANGE, width: 4 }));
    var line = pd.line(0, 0, 5, 5, { stroke: RED, width: 4 });
    for (i = 0; i < D1.length; i++) pd.point(D1[i][0], D1[i][1], { r: 7, fill: BLUE });

    var row = M4.el('div', { class: 'm4-row' }, root);
    var rw = readout(row, 'w'), rl = readout(row, 'L(w)'), rb = readout(row, '\\text{lowest so far}');
    var meter = M4.el('div', { class: 'optimisation-s1-meter' }, root);
    var bar = M4.el('div', {}, meter);

    var w = 0.4, best = Infinity, prev = null, done = false;
    function update(v) {
      w = v;
      var L = loss1(w), xe = w * 5 > 8 ? 8 / w : 5;
      line.set(0, 0, xe, w * xe);
      for (var k = 0; k < D1.length; k++) res[k].set(D1[k][0], D1[k][1], D1[k][0], w * D1[k][0]);
      best = Math.min(best, L);
      rw.set(fmt(w, 2)); rl.set(fmt(L, 3)); rb.set(fmt(best, 3));
      bar.style.width = clamp(100 * L / 17.25, 2, 100) + '%';
      bar.style.background = L <= 0.4 ? GREEN : RED;
      if (!done && prev !== null && Math.abs(L - prev) > 1e-9) {
        ctx.note(L < prev ? 'The loss decreased relative to the previous position.' : 'The loss increased relative to the previous position.');
      }
      prev = L;
    }
    M4.slider(root, {
      min: 0, max: 3, step: 0.05, value: 0.4, label: 'slope w',
      format: function (v) { return fmt(+v, 2); },
      onInput: function (v) { update(+v); }
    });
    update(0.4);
    M4.button(root, 'Check minimum', function () {
      var L = loss1(w);
      if (L <= 0.4 + 1e-9) {
        done = true;
        line.el.setAttribute('stroke', GREEN);
        ctx.note('The loss is \\(' + fmt(L, 3) + '\\), within \\(0.025\\) of the smallest possible value \\(0.375\\), attained at \\(w = 1.5\\).');
        ctx.solved();
      } else {
        ctx.wrong('The loss is ' + fmt(L, 3) + ', which is above 0.40. ' +
          (w < 1.5 ? 'The line is too shallow for the data.' : 'The line is too steep for the data.'));
      }
    }, { primary: true });
  }

  // Explore: ball rolling into the nearest minimum.
  function mountRollExplore(el, ctx) {
    var root = wrap(el);
    var f = quartic, lo = -3.6, hi = 4.6;
    var p = landscapePlane(root, f, { xmin: -4, xmax: 5, ymin: -1, ymax: 8 });
    var top = p.y(8), hgt = p.y(-1) - p.y(8);
    var rects = [
      M4.svg('rect', { x: p.x(-4), y: top, width: p.x(0) - p.x(-4), height: hgt, fill: ORANGE, 'fill-opacity': 0.07 }),
      M4.svg('rect', { x: p.x(0), y: top, width: p.x(5) - p.x(0), height: hgt, fill: BLUE, 'fill-opacity': 0.07 })
    ];
    rects.forEach(function (r) { p.g.insertBefore(r, p.g.firstChild); });
    p.text(-2, 7.3, 'start here → rest at θ = −2', { fill: ORANGE, size: 15, weight: 700 });
    p.text(2.6, 7.3, 'start here → rest at θ = 3', { fill: BLUE, size: 15, weight: 700 });
    p.path((function () { var a = []; for (var k = 0; k <= 200; k++) { var x = lo + (hi - lo) * k / 200; a.push([x, f(x)]); } return a; })(), { stroke: RED, width: 4 });
    p.point(-2, f(-2), { r: 5, fill: ORANGE });
    p.point(3, f(3), { r: 5, fill: BLUE });

    var row = M4.el('div', { class: 'm4-row' }, root);
    var rt = readout(row, '\\theta'), rl = readout(row, 'L(\\theta)');
    var status = statusPill(row, 'drag the ball, then release');
    var raf = 0, last = 0;

    function show(x) { rt.set(fmt(x, 2)); rl.set(fmt(f(x), 2)); }
    function settle(x) {
      raf = 0;
      if (Math.abs(x + 2) < 0.02) status.set('at rest: local minimum', ORANGE);
      else if (Math.abs(x - 3) < 0.02) status.set('at rest: global minimum', BLUE);
      else status.set('at rest: flat point (a maximum)', C.muted);
    }
    function tick(t) {
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      var x = dot.x, d = df(f, x);
      if (Math.abs(d) < 1e-3) { settle(x); return; }
      var v = -(d > 0 ? 1 : -1) * clamp(Math.abs(d) * 1.2, 0.5, 4);
      var nx = clamp(x + v * dt, lo, hi);
      if (df(f, nx) * d < 0) {
        var a = x, b = nx;
        for (var k = 0; k < 40; k++) { var m = (a + b) / 2; if (df(f, m) * d > 0) a = m; else b = m; }
        nx = (a + b) / 2;
        dot.set(nx, f(nx)); show(nx); settle(nx); return;
      }
      dot.set(nx, f(nx)); show(nx);
      raf = requestAnimationFrame(tick);
    }
    var dot = dragDot(p, {
      x: -3.3, y: f(-3.3), color: RED, r: 13,
      map: onCurve(f, lo, hi),
      onStart: function () { if (raf) cancelAnimationFrame(raf); raf = 0; status.set('holding', C.muted); },
      onChange: function (x) { show(x); },
      onEnd: function () { last = 0; status.set('rolling downhill', RED); raf = requestAnimationFrame(tick); }
    });
    show(dot.x);
    last = 0; raf = requestAnimationFrame(tick);
    ctx.onCleanup(function () { if (raf) cancelAnimationFrame(raf); raf = 0; });
  }

  // Exercise: place the ball at the global minimum of a wavy landscape.
  function mountFindGlobal(el, ctx) {
    var root = wrap(el);
    var f = wavy, lo = -4.8, hi = 4.8;
    var mins = localMinima(f, lo, hi);
    var gmin = mins[0];
    mins.forEach(function (m) { if (f(m) < f(gmin)) gmin = m; });
    var p = landscapePlane(root, f, { xmin: -5, xmax: 5, ymin: -1, ymax: 10 });
    p.path((function () { var a = []; for (var k = 0; k <= 240; k++) { var x = lo + (hi - lo) * k / 240; a.push([x, f(x)]); } return a; })(), { stroke: RED, width: 4 });
    var ring = M4.svg('circle', { cx: p.x(gmin), cy: p.y(f(gmin)), r: 26, fill: GREEN, 'fill-opacity': 0, stroke: 'none' }, p.g);

    var row = M4.el('div', { class: 'm4-row' }, root);
    var rt = readout(row, '\\theta'), rl = readout(row, 'L(\\theta)');
    function show(x) { rt.set(fmt(x, 2)); rl.set(fmt(f(x), 2)); }
    var done = false;
    var dot = dragDot(p, {
      x: -4.4, y: f(-4.4), color: RED, r: 13,
      map: onCurve(f, lo, hi),
      onChange: function (x) { show(x); }
    });
    show(dot.x);
    M4.button(root, 'Check', function () {
      if (done) return;
      var x = dot.x, i, nearLocal = false;
      if (Math.abs(x - gmin) <= 0.3) {
        done = true;
        dot.set(gmin, f(gmin)); dot.color(GREEN); show(gmin);
        ring.setAttribute('fill-opacity', 0.25);
        ctx.note('Global minimum at \\(\\theta \\approx ' + fmt(gmin, 2) + '\\) with \\(L \\approx ' + fmt(f(gmin), 2) + '\\). The other valleys are local minima.');
        ctx.solved();
        return;
      }
      for (i = 0; i < mins.length; i++) if (Math.abs(x - mins[i]) <= 0.25) nearLocal = true;
      if (nearLocal) {
        ctx.wrong('This is a local minimum: nearby points are higher, but another valley reaches a lower loss (here L = ' + fmt(f(x), 2) + ').');
      } else {
        ctx.wrong('This point is not a minimum: the loss still decreases to the ' + (df(f, x) > 0 ? 'left' : 'right') + '.');
      }
    }, { primary: true });
  }

  // Exercise: label critical points with drag-and-drop tokens.
  function mountLabelTokens(el, ctx) {
    var root = wrap(el);
    var f = quartic, lo = -3.6, hi = 4.6;
    var p = landscapePlane(root, f, { xmin: -4, xmax: 5, ymin: -1, ymax: 8 });
    p.path((function () { var a = []; for (var k = 0; k <= 200; k++) { var x = lo + (hi - lo) * k / 200; a.push([x, f(x)]); } return a; })(), { stroke: RED, width: 4 });
    var pts = [['A', -2, 'localmin'], ['B', 0, 'localmax'], ['C', 3, 'globalmin']];
    pts.forEach(function (q) {
      p.point(q[1], f(q[1]), { r: 8, fill: C.ink });
      p.text(q[1], f(q[1]) + (q[2] === 'localmax' ? 0.6 : -1.0), q[0], { fill: C.ink, size: 20, weight: 800 });
    });

    var slotRow = M4.el('div', { class: 'm4-row' }, root);
    var slots = pts.map(function (q) {
      var box = M4.el('div', { class: 'optimisation-s1-slotbox' }, slotRow);
      M4.el('div', { class: 'optimisation-s1-letter', text: 'Point ' + q[0] }, box);
      var s = M4.el('div', { class: 'm4-slot' }, box);
      s.setAttribute('data-want', q[2]);
      return s;
    });
    var tray = M4.el('div', { class: 'm4-row optimisation-s1-tray' }, root);
    var defs = [['localmax', 'local maximum'], ['globalmin', 'global minimum'], ['localmin', 'local minimum']];
    var tokens = defs.map(function (d) {
      var t = M4.el('div', { class: 'm4-token', text: d[1] }, tray);
      t.setAttribute('data-key', d[0]);
      return t;
    });
    var done = false;
    function tokenIn(s) { return s.querySelector('.m4-token'); }
    function refresh() {
      slots.forEach(function (s) { s.classList.toggle('filled', !!tokenIn(s)); });
    }
    function check() {
      var filled = slots.every(function (s) { return !!tokenIn(s); });
      if (!filled || done) return;
      var wrong = slots.filter(function (s) { return tokenIn(s).getAttribute('data-key') !== s.getAttribute('data-want'); });
      if (wrong.length === 0) {
        done = true;
        slots.forEach(function (s) { s.style.borderColor = GREEN; tokenIn(s).style.borderColor = GREEN; });
        ctx.note('A is a local minimum with \\(L \\approx 2.93\\), B a local maximum with \\(L = 4\\), and C the global minimum with \\(L = 0.85\\).');
        ctx.solved();
        return;
      }
      var keys = wrong.map(function (s) { return tokenIn(s).getAttribute('data-key'); });
      var msg = (keys.indexOf('localmax') < 0)
        ? 'Both valleys are minima. The global minimum is the one with the lower loss.'
        : 'A maximum is a point that is higher than all nearby points, not lower.';
      wrong.forEach(function (s) { tray.appendChild(tokenIn(s)); });
      refresh();
      ctx.wrong(msg);
    }
    M4.dragDrop({
      tokens: tokens, slots: slots,
      onDrop: function (tok, slot) {
        if (done) return;
        var old = tokenIn(slot);
        if (old && old !== tok) tray.appendChild(old);
        slot.appendChild(tok);
        refresh();
        check();
      },
      onMiss: function (tok) {
        if (done) return;
        tray.appendChild(tok);
        refresh();
      }
    });
  }

  // Shared chord widget: two dots on a curve, chord coloured by whether it lies above the graph.
  function chordWidget(root, f, range, o) {
    var p = landscapePlane(root, f, range);
    var lo = range.xmin + 0.3, hi = range.xmax - 0.3;
    var curve = p.path([[0, 0], [1, 1]], { stroke: RED, width: 4 });
    function drawCurve() {
      var a = [];
      for (var k = 0; k <= 200; k++) { var x = lo + (hi - lo) * k / 200; a.push([x, f(x)]); }
      curve.set(a);
    }
    var N = 40, segs = [];
    for (var i = 0; i < N; i++) segs.push(p.line(0, 0, 0, 0, { stroke: GREEN, width: 5 }));
    var gapMax = 0;
    function update() {
      var x1 = A.x, x2 = B.x, y1 = f(x1), y2 = f(x2);
      gapMax = 0;
      for (var k = 0; k < N; k++) {
        var ta = k / N, tb = (k + 1) / N, tm = (ta + tb) / 2;
        var xa = x1 + (x2 - x1) * ta, xb = x1 + (x2 - x1) * tb, xm = x1 + (x2 - x1) * tm;
        var ya = y1 + (y2 - y1) * ta, yb = y1 + (y2 - y1) * tb, ym = y1 + (y2 - y1) * tm;
        var gap = f(xm) - ym;
        if (gap > gapMax) gapMax = gap;
        segs[k].set(xa, ya, xb, yb);
        segs[k].el.setAttribute('stroke', gap > 0.02 ? ORANGE : GREEN);
      }
      if (o.onUpdate) o.onUpdate(gapMax);
    }
    var A = dragDot(p, { x: o.x1, y: f(o.x1), color: BLUE, map: function (x) { var c = clamp(x, lo, hi); return [c, f(c)]; }, onChange: function () { update(); }, onEnd: function () { if (o.onEnd) o.onEnd(gapMax); } });
    var B = dragDot(p, { x: o.x2, y: f(o.x2), color: BLUE, map: function (x) { var c = clamp(x, lo, hi); return [c, f(c)]; }, onChange: function () { update(); }, onEnd: function () { if (o.onEnd) o.onEnd(gapMax); } });
    drawCurve(); update();
    return {
      setF: function (g) { f = g; drawCurve(); A.set(A.x, f(A.x)); B.set(B.x, f(B.x)); update(); },
      gap: function () { return gapMax; }
    };
  }

  // Explore: the chord test for convexity.
  function mountChordExplore(el, ctx) {
    var root = wrap(el);
    var bowl = function (t) { return 0.5 * t * t; };
    var valleys = function (t) { return 0.08 * Math.pow(t, 4) - 0.9 * t * t + 3.5; };
    var btns = M4.el('div', { class: 'm4-row' }, root);
    var holder = M4.el('div', { style: 'width:100%;display:flex;justify-content:center' }, root);
    var row = M4.el('div', { class: 'm4-row' }, root);
    var rg = readout(row, '\\text{largest gap, graph above chord}');
    var status = statusPill(row, '');
    var w = chordWidget(holder, bowl, { xmin: -4, xmax: 4, ymin: -1, ymax: 9 }, {
      x1: -2.5, x2: 3,
      onUpdate: function (gap) {
        rg.set(fmt(Math.max(0, gap), 2));
        if (gap > 0.02) status.set('chord dips below the graph', ORANGE);
        else status.set('chord on or above the graph', GREEN);
      }
    });
    var b1, b2;
    function pick(which) {
      w.setF(which === 0 ? bowl : valleys);
      b1.classList.toggle('primary', which === 0);
      b2.classList.toggle('primary', which === 1);
    }
    b1 = M4.button(btns, 'Convex bowl', function () { pick(0); }, { primary: true });
    b2 = M4.button(btns, 'Two valleys', function () { pick(1); });
    M4.el('div', { class: 'm4-note', text: 'Green: chord on or above the graph. Orange: chord below the graph.' }, root);
  }

  // Exercise: exhibit a chord below the graph of a single-minimum function.
  function mountChordExercise(el, ctx) {
    var root = wrap(el);
    var holder = M4.el('div', { style: 'width:100%;display:flex;justify-content:center' }, root);
    var row = M4.el('div', { class: 'm4-row' }, root);
    var rg = readout(row, '\\text{largest gap, graph above chord}');
    var done = false;
    chordWidget(holder, funnel, { xmin: -4.5, xmax: 4.5, ymin: -1, ymax: 6 }, {
      x1: -1, x2: 1,
      onUpdate: function (gap) { rg.set(fmt(Math.max(0, gap), 2)); },
      onEnd: function (gap) {
        if (done) return;
        if (gap >= 0.3) {
          done = true;
          ctx.note('The graph rises \\(' + fmt(gap, 2) + '\\) above this chord, so the function is not convex, although it has a single minimum.');
          ctx.solved();
        } else if (gap > 0.02) {
          ctx.note('The chord is only \\(' + fmt(gap, 2) + '\\) below the graph. Move the points further apart until the gap is at least \\(0.3\\).');
        } else {
          ctx.note('This chord lies on or above the graph. Try a chord that does not span the minimum.');
        }
      }
    });
  }

  // Exercise: multiple choice tied to ML training.
  function mountTrainingChoice(el, ctx) {
    var root = wrap(el);
    var msgs = {
      0: 'Lower points may exist far away. A statement about small changes is only local.',
      2: 'At a maximum, small changes decrease the loss.',
      3: 'A minimum can have a positive loss, as in the line fit, where the minimum was 0.375.'
    };
    M4.choices(root, {
      options: [
        '\\(\\hat\\theta\\) is certainly the global minimum of the loss.',
        '\\(\\hat\\theta\\) is a local minimum. It is also the global minimum if the loss is convex.',
        '\\(\\hat\\theta\\) is a local maximum of the loss.',
        'The loss at \\(\\hat\\theta\\) is equal to zero.'
      ],
      correct: 1,
      onCorrect: function () {
        ctx.note('For linear regression with squared error the loss is convex, so this point is the best fit. For neural networks it is only known to be a local minimum.');
        ctx.solved();
      },
      onWrong: function (i) { ctx.wrong(msgs[i] || 'Reconsider what small changes can reveal.'); }
    });
  }

  // Harder exercise: two parameters, two handles.
  function mountTwoParams(el, ctx) {
    var root = wrap(el);
    var grid = M4.el('div', { class: 'm4-grid2', style: 'width:100%' }, root);
    var left = M4.el('div', { class: 'optimisation-s1-panel' }, grid);
    var right = M4.el('div', { class: 'optimisation-s1-panel' }, grid);
    M4.el('div', { class: 'optimisation-s1-cap', text: 'Data and the line y = a x + b' }, left);
    M4.el('div', { class: 'optimisation-s1-cap', text: 'Visited parameters (b across, a up), green = low loss' }, right);

    var pd = M4.plane(left, { xmin: -0.6, xmax: 4.6, ymin: -0.6, ymax: 6, width: 360, height: 400 });
    var res = [], i;
    for (i = 0; i < D2.length; i++) res.push(pd.line(D2[i][0], D2[i][1], D2[i][0], D2[i][1], { stroke: ORANGE, width: 4 }));
    var line = pd.line(0, 3, 4, 1.5, { stroke: RED, width: 4 });
    for (i = 0; i < D2.length; i++) pd.point(D2[i][0], D2[i][1], { r: 7, fill: BLUE });

    var pp = M4.plane(right, { xmin: -1, xmax: 4, ymin: -1, ymax: 2.5, width: 360, height: 400 });
    pp.text(3.75, 0.18, 'b', { fill: C.muted, size: 17, weight: 700 });
    pp.text(0.15, 2.3, 'a', { fill: C.muted, size: 17, anchor: 'start', weight: 700 });
    var trail = M4.svg('g', {}, pp.g);
    var cur = M4.svg('circle', { r: 9, fill: 'none', stroke: C.ink, 'stroke-width': 3 }, pp.g);
    var nTrail = 0;

    var row = M4.el('div', { class: 'm4-row' }, root);
    var ra = readout(row, 'a'), rb = readout(row, 'b'), rl = readout(row, 'L(a,b)');
    M4.el('div', { class: 'm4-note', text: 'Drag the two red handles vertically. Target: L at most 0.13.' }, root);

    var done = false;
    function mix(t) { // 0 = green, 0.5 = yellow, 1 = red
      function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
      var a = t < 0.5 ? hex(GREEN) : hex(C.yellow), b = t < 0.5 ? hex(C.yellow) : hex(RED), u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * u) + ',' + Math.round(a[1] + (b[1] - a[1]) * u) + ',' + Math.round(a[2] + (b[2] - a[2]) * u) + ')';
    }
    function params() { var b = H0.y, a = (H4.y - H0.y) / 4; return [a, b]; }
    function update(addDot) {
      var ab = params(), a = ab[0], b = ab[1], L = loss2(a, b);
      line.set(0, b, 4, 4 * a + b);
      for (var k = 0; k < D2.length; k++) res[k].set(D2[k][0], D2[k][1], D2[k][0], a * D2[k][0] + b);
      ra.set(fmt(a, 2)); rb.set(fmt(b, 2)); rl.set(fmt(L, 3));
      var cx = pp.x(clamp(b, -1, 4)), cy = pp.y(clamp(a, -1, 2.5));
      cur.setAttribute('cx', cx); cur.setAttribute('cy', cy);
      if (addDot) {
        if (nTrail >= 400 && trail.firstChild) trail.removeChild(trail.firstChild); else nTrail++;
        M4.svg('circle', { cx: cx, cy: cy, r: 6, fill: mix(clamp(Math.sqrt(Math.max(0, L - 0.095) / 3), 0, 1)), 'fill-opacity': 0.85 }, trail);
      }
      line.el.setAttribute('stroke', L <= 0.13 ? GREEN : RED);
      return L;
    }
    function vmap(xfix) {
      return function (x, y) { return [xfix, Math.round(clamp(y, -0.4, 5.8) * 10) / 10]; };
    }
    function end() {
      if (done) return;
      var ab = params(), L = loss2(ab[0], ab[1]);
      if (L <= 0.13 + 1e-9) {
        done = true;
        H0.color(GREEN); H4.color(GREEN);
        ctx.note('Loss \\(' + fmt(L, 3) + '\\). The exact minimum is \\(L = 0.095\\) at \\(a = 0.85\\), \\(b = 0.9\\). This loss is a convex bowl over the \\((b, a)\\) plane.');
        ctx.solved();
      } else {
        var above = 0;
        for (var k = 0; k < D2.length; k++) if (D2[k][1] > ab[0] * D2[k][0] + ab[1]) above++;
        ctx.note('Loss \\(' + fmt(L, 3) + '\\), still above \\(0.13\\). ' + above + ' of 5 points lie above the line. Adjust one handle at a time and keep changes that lower the loss.');
      }
    }
    var H0 = dragDot(pd, { x: 0, y: 3, color: RED, r: 13, map: vmap(0), onChange: function () { update(true); }, onEnd: end });
    var H4 = dragDot(pd, { x: 4, y: 1.5, color: RED, r: 13, map: vmap(4), onChange: function () { update(true); }, onEnd: end });
    update(true);
  }

  /* =====================================================================
     Lesson
     ===================================================================== */
  M4.lesson({
    id: 'optimisation-s1',
    module: 'optimisation',
    title: 'Loss landscapes and minima',
    summary: 'A loss is a function of the parameters. Training means finding parameters where it is small.',
    minutes: 10,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html:
          '<p>A model has adjustable numbers called <b>parameters</b>, and a <b>loss</b> is a single number that measures how badly the model fits the data for a given choice of parameters. ' +
          'In this lesson you will read a loss as a function of its parameters, distinguish local from global minima, recognise a convex loss, and minimise a simple loss manually.</p>' +
          '<p>Throughout, \\(\\theta\\) denotes a parameter and \\(L(\\theta)\\) the loss at that parameter value.</p>'
      },
      {
        kind: 'explore',
        title: 'A loss is a function of a parameter',
        html:
          '<p>Consider the model \\(y = w\\,x\\) with a single parameter, the slope \\(w\\). For data points \\((x_i, y_i)\\), \\(i = 1, \\dots, n\\), the <b>mean squared error</b> is ' +
          '\\[ L(w) = \\frac{1}{n} \\sum_{i=1}^{n} (y_i - w\\,x_i)^2 . \\]' +
          'Each value of \\(w\\) gives one line on the left and one point on the loss curve on the right. For the four data points shown, \\(L(w) = 7.5\\,(w - 1.5)^2 + 0.375\\).</p>',
        mount: mountFitExplore
      },
      {
        kind: 'exercise',
        title: 'Manual minimisation',
        html:
          '<p>The loss curve is now hidden. Only the value \\(L(w)\\) is displayed. Adjust the slope \\(w\\) until the loss is at most \\(0.40\\), then check. ' +
          'The only available information is whether a change made the loss larger or smaller.</p>',
        hint: 'Move the slider in one direction while the loss decreases. When the loss begins to increase, step back. The smallest value lies between 1 and 2.',
        mount: mountMinimiseByHand
      },
      {
        kind: 'text',
        title: 'Local and global minima',
        html:
          '<p>A parameter value \\(\\theta^*\\) is a <b>global minimum</b> of \\(L\\) if \\(L(\\theta^*) \\le L(\\theta)\\) for every \\(\\theta\\). ' +
          'It is a <b>local minimum</b> if \\(L(\\theta^*) \\le L(\\theta)\\) holds only for all \\(\\theta\\) sufficiently close to \\(\\theta^*\\).</p>' +
          '<p>Every global minimum is also a local minimum, but a loss can have local minima that are not global. The graph of \\(L\\) over all parameter values is called the <b>loss landscape</b>: minima are the bottoms of its valleys.</p>'
      },
      {
        kind: 'explore',
        title: 'Resting points',
        html:
          '<p>The landscape below has two valleys, at \\(\\theta = -2\\) with \\(L \\approx 2.93\\) and at \\(\\theta = 3\\) with \\(L = 0.85\\). Drag the ball to any starting point and release it. It moves downhill until the slope vanishes. ' +
          'The valley it reaches depends only on the side of the hill at \\(\\theta = 0\\) on which it starts.</p>',
        mount: mountRollExplore
      },
      {
        kind: 'exercise',
        title: 'The global minimum',
        html:
          '<p>This landscape has several valleys of different depths. Drag the ball along the curve to the global minimum, the parameter value with the smallest loss anywhere on the curve, and check.</p>',
        hint: 'Visit the bottom of each valley and compare the displayed value of L. The global minimum is the valley with the smallest value.',
        mount: mountFindGlobal
      },
      {
        kind: 'exercise',
        title: 'Special points of a curve',
        html:
          '<p>Three points A, B and C are marked where the slope of the landscape is zero. A <b>local maximum</b> is a point that is at least as high as all nearby points. Drag each label onto the point it describes.</p>',
        hint: 'B lies on top of the hill. Of the two valleys, the one with the lower loss is the global minimum.',
        mount: mountLabelTokens
      },
      {
        kind: 'explore',
        title: 'Convex bowls',
        html:
          '<p>A function is <b>convex</b> if the straight segment (chord) between any two points of its graph never lies below the graph. A convex function is shaped like a bowl, and every local minimum of a convex function is a global minimum. ' +
          'Drag the two blue points and compare the bowl with the two-valley landscape: one chord that dips below the graph is enough to show that a function is not convex.</p>',
        mount: mountChordExplore
      },
      {
        kind: 'exercise',
        title: 'Single minima and convexity',
        html:
          '<p>This loss has a single minimum at \\(\\theta = 0\\), yet it is not convex. Demonstrate this by dragging the two blue points so that the graph rises at least \\(0.3\\) above the chord somewhere between them.</p>',
        hint: 'Place both points on the same side of the minimum, one on the steep part near 1 and one far out on the flat part near 4.',
        mount: mountChordExercise
      },
      {
        kind: 'exercise',
        title: 'Minima in machine learning',
        html:
          '<p>In machine learning, \\(\\theta\\) collects all weights of a model, often millions of numbers, and <b>training</b> means searching for parameters with a small loss on the training data. ' +
          'For linear regression with squared error the loss is convex. For neural networks it generally is not.</p>' +
          '<p>A training run stops at parameters \\(\\hat\\theta\\) at which every sufficiently small change of the parameters increases the loss. Which conclusion is justified?</p>',
        hint: 'Small changes only probe the neighbourhood of the point. Recall which property makes every local minimum a global one.',
        mount: mountTrainingChoice
      },
      {
        kind: 'exercise',
        title: 'Two parameters',
        html:
          '<p>The model \\(y = a\\,x + b\\) has two parameters, the slope \\(a\\) and the intercept \\(b\\), so the loss \\(L(a, b) = \\frac{1}{n}\\sum_{i=1}^{n} (y_i - a\\,x_i - b)^2\\) is a landscape over a plane. ' +
          'Drag the two handles of the line until \\(L(a, b) \\le 0.13\\). The right panel records every parameter pair visited, coloured by its loss.</p>',
        hint: 'Change one handle at a time and keep only moves that lower the loss. The best line passes close to (0, 0.9) and (4, 4.3).',
        mount: mountTwoParams
      },
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>A loss \\(L(\\theta)\\) assigns one number to each choice of parameters. Its graph is the loss landscape, and fitting a model means finding parameters where \\(L\\) is small.</li>' +
          '<li>A local minimum is lowest among nearby points, a global minimum is lowest everywhere. Moving downhill from a starting point reaches the minimum of the valley that contains it.</li>' +
          '<li>A convex loss lies on or below all of its chords, and each of its local minima is global. Linear regression with squared error is convex, whereas neural network losses generally are not.</li>' +
          '</ul>' +
          '<p>The next session replaces manual adjustment with a rule that uses the slope of the loss: gradient descent.</p>'
      }
    ]
  });
})();
