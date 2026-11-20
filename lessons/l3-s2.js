(function () {
  'use strict';

  var C = M4.colors;
  var GREEN = C.green, ORANGE = C.orange, BLUE = C.blue, RED = C.red, INK = C.ink, MUTED = C.muted, LINE = C.line;

  /* ---------- local helpers ---------- */

  function injectStyle() {
    if (document.getElementById('l3-s2-style')) return;
    var s = document.createElement('style');
    s.id = 'l3-s2-style';
    s.textContent =
      '.l3-s2-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%}' +
      '.l3-s2-wrap svg{max-width:100%;height:auto;touch-action:none}' +
      '.l3-s2-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px;width:100%}' +
      '.l3-s2-seq{font-variant-numeric:tabular-nums;font-size:16px;color:' + MUTED + ';text-align:center;min-height:24px}' +
      '.l3-s2-eq{display:flex;align-items:center;justify-content:center;gap:16px;font-size:26px;font-weight:600}' +
      '.l3-s2-frac{display:flex;flex-direction:column;align-items:center;gap:8px}' +
      '.l3-s2-bar{width:120px;height:3px;border-radius:2px;background:' + INK + '}' +
      '.l3-s2-slot{min-width:92px;min-height:58px;display:flex;align-items:center;justify-content:center;box-sizing:border-box}' +
      '.l3-s2-slotcap{font-size:15px;color:' + MUTED + ';font-weight:500}' +
      '.l3-s2-tray{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;min-height:62px;padding:10px;width:100%;box-sizing:border-box}' +
      '.l3-s2-tok{min-width:64px;text-align:center;font-size:22px;font-weight:700;padding:10px 14px;font-variant-numeric:tabular-nums;touch-action:none;user-select:none;-webkit-user-select:none}' +
      '.l3-s2-panel{display:flex;flex-direction:column;align-items:center;gap:6px}' +
      '.l3-s2-cap{font-size:15px;color:' + MUTED + ';font-weight:600;text-align:center}';
    document.head.appendChild(s);
  }

  function fmt(v, d) {
    if (!isFinite(v)) return '∞';
    var s = v.toFixed(d === undefined ? 2 : d);
    if (parseFloat(s) === 0) s = (0).toFixed(d === undefined ? 2 : d);
    return s.replace('-', '−');
  }

  function wrap(el) {
    injectStyle();
    el.innerHTML = '';
    return M4.el('div', { class: 'l3-s2-wrap' }, el);
  }

  function readout(parent, color) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    if (color) r.style.color = color;
    return r;
  }

  // run fn(elapsedMs) every frame until cleanup; returns {stop, restart}
  function loop(ctx, fn) {
    var id = 0, t0 = null, dead = false;
    function frame(t) {
      if (dead) return;
      if (t0 === null) t0 = t;
      fn(t - t0);
      id = requestAnimationFrame(frame);
    }
    id = requestAnimationFrame(frame);
    ctx.onCleanup(function () { dead = true; cancelAnimationFrame(id); });
    return {
      restart: function () { t0 = null; },
      stop: function () { dead = true; cancelAnimationFrame(id); }
    };
  }

  // hand-drawn axes for planes whose ranges are not integer grids
  function drawAxes(p, o) {
    var px = Math.abs(p.ux(1) - p.ux(0));   // maths units per pixel (x)
    var py = Math.abs(p.uy(1) - p.uy(0));   // maths units per pixel (y)
    p.line(o.x0, 0, o.x1, 0, { stroke: INK, width: 2 });
    p.line(0, o.y0, 0, o.y1, { stroke: INK, width: 2 });
    (o.xticks || []).forEach(function (t) {
      p.line(t, -5 * py, t, 5 * py, { stroke: INK, width: 2 });
      p.text(t, -24 * py, String(t), { fill: MUTED, size: 15 });
    });
    (o.yticks || []).forEach(function (t) {
      p.line(-5 * px, t, 5 * px, t, { stroke: INK, width: 2 });
      p.text(-12 * px, t - 5 * py, String(t), { fill: MUTED, size: 15, anchor: 'end' });
    });
    if (o.xlabel) p.text(o.x1, -46 * py, o.xlabel, { fill: INK, size: 16, anchor: 'end', weight: 600 });
    if (o.ylabel) p.text(8 * px, o.y1 + 10 * py, o.ylabel, { fill: INK, size: 16, anchor: 'start', weight: 600 });
  }

  function show(obj, on) { obj.el.style.display = on ? '' : 'none'; }

  /* ---------- step 3: one-dimensional parabola ---------- */

  function mountParabola(el, ctx) {
    var w = wrap(el);
    var p = M4.plane(w, { xmin: -4.5, xmax: 4.5, ymin: -1.5, ymax: 9.5, width: 600, height: 440 });
    p.fn(function (x) { return 0.5 * x * x; }, { stroke: INK, width: 3 });
    p.text(3.2, 8.6, 'f(x) = ½x²', { fill: INK, size: 17, weight: 600 });
    var N = 12;
    var path = p.path([[2, 2]], { stroke: GREEN, width: 3 });
    var pts = [];
    for (var i = 0; i <= N; i++) pts.push(p.point(2, 2, { r: i === 0 ? 8 : 6, fill: i === 0 ? ORANGE : GREEN }));
    p.text(2.75, 1.6, 'start', { fill: ORANGE, size: 15, weight: 600 });

    var row = M4.el('div', { class: 'l3-s2-row' }, w);
    var rFac = readout(row), rVer = readout(row);
    var seq = M4.el('div', { class: 'l3-s2-seq' }, w);

    var eta = 0.2, xs = [], anim;
    function compute() {
      xs = [2];
      for (var k = 0; k < N; k++) {
        var nx = (1 - eta) * xs[k];
        if (Math.abs(nx) > 4.35) break;
        xs.push(nx);
      }
      var f = 1 - eta;
      rFac.textContent = 'factor 1 − ηa = ' + fmt(f, 2);
      var verdict, col;
      if (Math.abs(f) < 1e-9) { verdict = 'lands in one step'; col = GREEN; }
      else if (Math.abs(f) >= 1 - 1e-9) { verdict = Math.abs(f) > 1 + 1e-9 ? 'diverges' : 'no progress'; col = RED; }
      else if (f < 0) { verdict = 'bounces, converges'; col = ORANGE; }
      else { verdict = f > 0.7 ? 'creeps, converges' : 'converges'; col = GREEN; }
      rVer.textContent = verdict; rVer.style.color = col;
      seq.textContent = 'x: ' + xs.slice(0, 6).map(function (v) { return fmt(v, 2); }).join(' → ') + ' → …';
      if (anim) anim.restart();
    }
    function draw(n) {
      var poly = [];
      for (var i = 0; i <= N; i++) {
        var on = i < xs.length && i <= n;
        show(pts[i], on);
        if (on) { pts[i].set(xs[i], 0.5 * xs[i] * xs[i]); poly.push([xs[i], 0.5 * xs[i] * xs[i]]); }
      }
      if (poly.length < 2) poly.push(poly[0]);
      path.set(poly);
    }
    var sl = M4.slider(w, {
      min: 0.05, max: 2.4, step: 0.05, value: eta, label: 'learning rate η',
      format: function (v) { return fmt(+v, 2); },
      onInput: function (v) { eta = +v; compute(); }
    });
    var presets = M4.el('div', { class: 'l3-s2-row' }, w);
    [0.2, 1, 1.6, 2.2].forEach(function (v) {
      M4.button(presets, 'η = ' + v, function () { eta = v; sl.set(v); compute(); });
    });
    compute();
    anim = loop(ctx, function (ms) { draw(Math.floor(ms / 380) % (N + 6)); });
  }

  /* ---------- step 4: drag to a bouncing-but-converging learning rate ---------- */

  function mountFactorPlot(el, ctx) {
    var w = wrap(el);
    var p = M4.plane(w, { xmin: -0.3, xmax: 2.8, ymin: -0.35, ymax: 1.9, width: 640, height: 420, grid: false, axes: false, labels: false });
    drawAxes(p, { x0: 0, x1: 2.7, y0: 0, y1: 1.75, xticks: [0.5, 1, 1.5, 2, 2.5], yticks: [0.5, 1, 1.5], xlabel: 'learning rate η', ylabel: '|1 − ηa|' });
    p.line(0, 1, 2.7, 1, { stroke: RED, width: 2, dash: '7 6' });
    p.text(0.42, 1.08, 'above 1: diverges', { fill: RED, size: 15, weight: 600, anchor: 'start' });
    p.path([[0, 1], [1, 0], [2.7, 1.7]], { stroke: GREEN, width: 4 });
    var guide = p.line(0.3, 0, 0.3, 1.75, { stroke: ORANGE, width: 2, dash: '5 5' });
    var marker = p.point(0.3, 0.7, { r: 8, fill: GREEN });
    var row = M4.el('div', { class: 'l3-s2-row' }, w);
    var rEta = readout(row, ORANGE), rFac = readout(row), rBeh = readout(row);
    var seq = M4.el('div', { class: 'l3-s2-seq' }, w);
    var eta = 0.3, done = false;

    function update(x) {
      eta = Math.max(0, Math.min(2.7, Math.round(x * 20) / 20));
      var f = 1 - eta;
      guide.set(eta, 0, eta, 1.75);
      marker.set(eta, Math.abs(f));
      rEta.textContent = 'η = ' + fmt(eta, 2);
      rFac.textContent = 'factor = ' + fmt(f, 2);
      rBeh.textContent = Math.abs(f) >= 1 ? (Math.abs(f) > 1 ? 'diverges' : 'no progress') : (f < 0 ? 'changes side, shrinks' : (f === 0 ? 'one step' : 'same side, shrinks'));
      var xs = [2];
      for (var k = 0; k < 4; k++) xs.push(xs[k] * f);
      seq.textContent = 'x: ' + xs.map(function (v) { return fmt(v, 2); }).join(' → ') + ' → …';
    }
    function check() {
      if (done) return;
      var f = 1 - eta;
      if (f < 0 && f > -1) {
        done = true;
        marker.el.setAttribute('r', 13);
        ctx.note('With \\(\\eta = ' + eta.toFixed(2) + '\\) the factor is \\(' + f.toFixed(2) + '\\): negative, so the iterate changes side, and smaller than 1 in absolute value, so the distance shrinks.');
        ctx.solved();
      } else if (f >= 0) {
        ctx.note('The factor \\(1-\\eta a = ' + f.toFixed(2) + '\\) is not negative, so the iterate stays on the same side of the minimum. A larger learning rate is needed.');
      } else {
        ctx.wrong('The factor is ' + fmt(f, 2) + ', so its absolute value is not below 1: the distance to the minimum does not shrink.');
      }
    }
    var lbl = p.text(0.3, 1.62, 'drag', { fill: ORANGE, size: 15, weight: 600 });
    var h = p.handle(0.3, 1.45, {
      color: ORANGE, r: 14,
      onDrag: function (x) { update(x); },
      onEnd: function () {
        // return the handle to its rail above the chosen learning rate
        if (h && h.set) h.set(eta, 1.45);
        lbl.set(eta, 1.62, 'drag');
        check();
      }
    });
    update(0.3);
  }

  /* ---------- step 6: zigzag in the narrow valley ---------- */

  var A_STEEP = 10, A_FLAT = 0.2;

  function mountValley(el, ctx) {
    var w = wrap(el);
    var p = M4.plane(w, { xmin: -11, xmax: 11, ymin: -2.4, ymax: 2.4, width: 680, height: 380, grid: false, axes: false, labels: false });
    [10, 5, 2, 0.5].forEach(function (c, i) {
      var pts = [], rx = Math.sqrt(2 * c / A_FLAT), ry = Math.sqrt(2 * c / A_STEEP);
      for (var k = 0; k < 90; k++) { var a = 2 * Math.PI * k / 90; pts.push([rx * Math.cos(a), ry * Math.sin(a)]); }
      p.path(pts, { stroke: LINE, width: 2, fill: i === 0 ? C.card : 'none', closed: true });
    });
    p.arrow(-10.6, -2.1, -6.6, -2.1, { stroke: BLUE, width: 3 });
    p.text(-3.6, -2.17, 'flat direction', { fill: BLUE, size: 15, weight: 600 });
    p.arrow(10.3, -2.1, 10.3, -0.9, { stroke: ORANGE, width: 3 });
    p.text(7.6, -2.17, 'steep direction', { fill: ORANGE, size: 15, weight: 600 });
    p.point(0, 0, { r: 7, fill: INK });
    p.text(0, -0.42, 'minimum', { fill: INK, size: 15, weight: 600 });
    var path = p.path([[-9, 1.2], [-9, 1.2]], { stroke: GREEN, width: 3 });
    var dots = [];
    for (var i = 0; i < 50; i++) dots.push(p.point(0, 0, { r: 4, fill: GREEN }));

    var row = M4.el('div', { class: 'l3-s2-row' }, w);
    var rS = readout(row, ORANGE), rF = readout(row, BLUE), rN = readout(row);
    var eta = 0.18, sx = -9, sy = 1.2;

    function redraw() {
      var fs = 1 - eta * A_STEEP, ff = 1 - eta * A_FLAT;
      var x = sx, y = sy, pts = [[x, y]];
      for (var k = 0; k < 400; k++) {
        x *= ff; y *= fs;
        if (Math.abs(y) > 2.35) { pts.push([x, y > 0 ? 2.35 : -2.35]); break; }
        pts.push([x, y]);
      }
      path.set(pts);
      for (var i = 0; i < dots.length; i++) {
        var on = i + 1 < pts.length;
        show(dots[i], on);
        if (on) dots[i].set(pts[i + 1][0], pts[i + 1][1]);
      }
      rS.textContent = 'steep factor ' + fmt(fs, 2);
      rF.textContent = 'flat factor ' + fmt(ff, 3);
      var L0 = 0.5 * (A_FLAT * sx * sx + A_STEEP * sy * sy), n = 0, cx = sx, cy = sy, L = L0;
      if (Math.abs(fs) >= 1) { rN.textContent = 'diverges'; rN.style.color = RED; return; }
      while (L > 0.01 * L0 && n < 20000 && L0 > 0) { cx *= ff; cy *= fs; L = 0.5 * (A_FLAT * cx * cx + A_STEEP * cy * cy); n++; }
      rN.textContent = n + ' steps to 1 % of the loss'; rN.style.color = '';
    }
    p.handle(sx, sy, {
      color: GREEN, r: 13,
      onDrag: function (x, y) {
        sx = Math.max(-10.5, Math.min(10.5, x)); sy = Math.max(-2.1, Math.min(2.1, y)); redraw();
      }
    });
    M4.slider(w, {
      min: 0.02, max: 0.21, step: 0.005, value: eta, label: 'learning rate η',
      format: function (v) { return fmt(+v, 3); },
      onInput: function (v) { eta = +v; redraw(); }
    });
    M4.el('div', { class: 'm4-note', text: 'Drag the green start point. The two axes are drawn at different scales so that the valley fits on the screen.' }, w);
    redraw();
  }

  /* ---------- step 7: find the best learning rate ---------- */

  function mountBestEta(el, ctx) {
    var w = wrap(el);
    var p = M4.plane(w, { xmin: -0.028, xmax: 0.26, ymin: -0.28, ymax: 1.5, width: 660, height: 400, grid: false, axes: false, labels: false });
    drawAxes(p, { x0: 0, x1: 0.25, y0: 0, y1: 1.4, xticks: [0.05, 0.1, 0.15, 0.2, 0.25], yticks: [0.5, 1], xlabel: 'learning rate η', ylabel: '|factor|' });
    p.line(0, 1, 0.25, 1, { stroke: RED, width: 2, dash: '7 6' });
    p.path([[0, 1], [0.1, 0], [0.24, 1.4]], { stroke: ORANGE, width: 4 });
    p.path([[0, 1], [0.25, 0.95]], { stroke: BLUE, width: 4 });
    p.text(0.052, 0.3, 'steep  |1 − 10η|', { fill: ORANGE, size: 16, weight: 600 });
    p.text(0.075, 1.1, 'flat  |1 − 0.2η|', { fill: BLUE, size: 16, weight: 600 });
    var guide = p.line(0.12, 0, 0.12, 1.4, { stroke: GREEN, width: 3 });
    var mS = p.point(0.12, 0.2, { r: 8, fill: ORANGE }), mF = p.point(0.12, 0.976, { r: 8, fill: BLUE });

    var row = M4.el('div', { class: 'l3-s2-row' }, w);
    var rS = readout(row, ORANGE), rF = readout(row, BLUE), rW = readout(row);
    var eta = 0.12, done = false;
    function update() {
      var fs = Math.abs(1 - A_STEEP * eta), ff = Math.abs(1 - A_FLAT * eta), worst = Math.max(fs, ff);
      guide.set(eta, 0, eta, 1.4); mS.set(eta, Math.min(fs, 1.4)); mF.set(eta, ff);
      rS.textContent = 'steep ' + fmt(fs, 3);
      rF.textContent = 'flat ' + fmt(ff, 3);
      rW.textContent = worst >= 1 ? 'slower factor ≥ 1: no convergence' : 'slower factor ' + fmt(worst, 3) + ' · about ' + Math.ceil(Math.log(0.01) / (2 * Math.log(worst))) + ' steps';
      rW.style.color = worst >= 1 ? RED : '';
    }
    M4.slider(w, {
      min: 0.1, max: 0.21, step: 0.001, value: eta, label: 'learning rate η',
      format: function (v) { return fmt(+v, 3); },
      onInput: function (v) { eta = +v; update(); }
    });
    M4.button(w, 'Check', function () {
      if (done) return;
      var fs = Math.abs(1 - A_STEEP * eta), ff = Math.abs(1 - A_FLAT * eta);
      if (eta > 0.1895 && eta < 0.1965) {
        done = true;
        guide.el.setAttribute('stroke-width', 6);
        ctx.note('At \\(\\eta = ' + eta.toFixed(3) + '\\) the two curves are within a hair of crossing. The exact crossing is \\(\\eta = 2/(10 + 0.2) \\approx 0.196\\), where both factors equal \\(49/51 \\approx 0.96\\).');
        ctx.solved();
      } else if (eta <= 0.1895) {
        ctx.wrong('The flat direction is the slower one here (factor ' + fmt(ff, 3) + '). A larger learning rate lowers it.');
      } else if (fs >= 1) {
        ctx.wrong('The steep factor is ' + fmt(fs, 3) + ' in absolute value, so the steep direction no longer converges.');
      } else {
        ctx.wrong('The steep direction is now the slower one (factor ' + fmt(fs, 3) + '). A slightly smaller learning rate lowers it.');
      }
    }, { primary: true });
    update();
  }

  /* ---------- step 8: build the condition number ---------- */

  function mountKappa(el, ctx) {
    var w = wrap(el);
    var eq = M4.el('div', { class: 'l3-s2-eq' }, w);
    M4.el('span', { html: M4.tex('\\kappa \\;=') }, eq);
    var frac = M4.el('div', { class: 'l3-s2-frac' }, eq);
    var sNum = M4.el('div', { class: 'm4-slot l3-s2-slot' }, frac);
    M4.el('div', { class: 'l3-s2-bar' }, frac);
    var sDen = M4.el('div', { class: 'm4-slot l3-s2-slot' }, frac);
    M4.el('span', { text: '=' }, eq);
    var sRes = M4.el('div', { class: 'm4-slot l3-s2-slot' }, eq);
    M4.el('div', { class: 'l3-s2-slotcap', text: 'numerator and denominator: curvatures · right-hand slot: value of κ' }, w);
    var tray = M4.el('div', { class: 'l3-s2-tray' }, w);
    var tokens = ['0.2', '50', '10', '2', '9.8'].map(function (v) {
      var t = M4.el('div', { class: 'm4-token l3-s2-tok', text: v }, tray);
      t.setAttribute('data-v', v);
      return t;
    });
    var slots = [sNum, sDen, sRes], done = false;
    function val(slot) { var t = slot.querySelector('.m4-token'); return t ? t.getAttribute('data-v') : null; }
    function sync() { slots.forEach(function (s) { s.classList.toggle('filled', !!val(s)); }); }
    function back(slot) { var t = slot.querySelector('.m4-token'); if (t) tray.appendChild(t); }
    function evaluate() {
      if (done) return;
      var n = val(sNum), d = val(sDen), r = val(sRes);
      if (!n || !d || !r) { ctx.note(''); return; }
      if (n === '10' && d === '0.2' && r === '50') {
        done = true;
        slots.forEach(function (s) { s.style.borderColor = GREEN; s.classList.add('m4-pop'); });
        ctx.note('\\(\\kappa = 10 / 0.2 = 50\\): the steep direction is fifty times more curved than the flat one.');
        ctx.solved();
        return;
      }
      var msg;
      if (n === '0.2' && d === '10') msg = 'The fraction is inverted: the largest curvature belongs in the numerator.';
      else if (n !== '10' || d !== '0.2') msg = 'The fraction must contain the two curvatures of the valley, 10 and 0.2.';
      else msg = 'The fraction is correct, but 10 divided by 0.2 is not ' + r + '.';
      ctx.wrong(msg);
      setTimeout(function () {
        if (done) return;
        if (n !== '10') back(sNum);
        if (d !== '0.2') back(sDen);
        if (!(n === '10' && d === '0.2' && r === '50')) back(sRes);
        sync();
      }, 650);
    }
    M4.dragDrop({
      tokens: tokens, slots: slots,
      onDrop: function (tok, slot) {
        if (done) return;
        var old = slot.querySelector('.m4-token');
        if (old && old !== tok) tray.appendChild(old);
        slot.appendChild(tok);
        sync(); evaluate();
      },
      onMiss: function (tok) { if (done) return; tray.appendChild(tok); sync(); }
    });
  }

  /* ---------- step 9: input normalisation ---------- */

  var SIZE = [50, 60, 70, 75, 85, 90, 100, 110];
  var ROOMS = [2, 3, 2, 3, 2, 3, 2, 3];
  var MU_S = 80, SD_S = Math.sqrt(2850 / 8), MU_R = 2.5, SD_R = 0.5;

  function mountNormalize(el, ctx) {
    var w = wrap(el);
    var grid = M4.el('div', { class: 'm4-grid2' }, w);
    grid.style.width = '100%';
    var S = 320;
    function panel(caption) {
      var d = M4.el('div', { class: 'l3-s2-panel' }, grid);
      M4.el('div', { class: 'l3-s2-cap', text: caption }, d);
      var svg = M4.svg('svg', { viewBox: '0 0 ' + S + ' ' + S, width: S, height: S }, d);
      M4.svg('rect', { x: 1, y: 1, width: S - 2, height: S - 2, rx: 16, fill: C.card, stroke: LINE, 'stroke-width': 2 }, svg);
      return svg;
    }
    var left = panel('data: size (horizontal) and rooms (vertical)');
    var right = panel('loss contours over the two weights');

    var axX = M4.svg('line', { stroke: MUTED, 'stroke-width': 2 }, left);
    var axY = M4.svg('line', { stroke: MUTED, 'stroke-width': 2 }, left);
    var lblHi = M4.svg('text', { x: S - 12, y: 0, 'font-size': 15, fill: MUTED, 'text-anchor': 'end' }, left);
    var lblLo = M4.svg('text', { x: 12, y: 0, 'font-size': 15, fill: MUTED, 'text-anchor': 'start' }, left);
    var dots = SIZE.map(function () { return M4.svg('circle', { r: 8, fill: GREEN, stroke: '#fff', 'stroke-width': 2 }, left); });

    var ell = [1, 0.68, 0.36].map(function (s) {
      return { s: s, el: M4.svg('ellipse', { cx: S / 2, cy: S / 2, fill: 'none', stroke: GREEN, 'stroke-width': 3, opacity: 0.35 + 0.65 * (1 - s) }, right) };
    });
    M4.svg('circle', { cx: S / 2, cy: S / 2, r: 6, fill: INK }, right);
    var wl = M4.svg('text', { x: S - 12, y: S - 14, 'font-size': 15, fill: MUTED, 'text-anchor': 'end' }, right); wl.textContent = 'weight of size →';
    var wl2 = M4.svg('text', { x: 12, y: 24, 'font-size': 15, fill: MUTED, 'text-anchor': 'start' }, right); wl2.textContent = '↑ weight of rooms';

    var row = M4.el('div', { class: 'l3-s2-row' }, w);
    var rK = readout(row, GREEN), rN = readout(row);
    var t = 0;

    function draw() {
      var half = Math.pow(70, 1 - t) * Math.pow(3, t), cen = 60 * (1 - t);
      var lo = cen - half, hi = cen + half;
      function X(v) { return 20 + (v - lo) / (hi - lo) * (S - 40); }
      function Y(v) { return S - 20 - (v - lo) / (hi - lo) * (S - 40); }
      var hss = 0, hsr = 0, hrr = 0;
      for (var i = 0; i < SIZE.length; i++) {
        var a = (SIZE[i] - t * MU_S) / Math.pow(SD_S, t), b = (ROOMS[i] - t * MU_R) / Math.pow(SD_R, t);
        dots[i].setAttribute('cx', X(a)); dots[i].setAttribute('cy', Y(b));
        hss += a * a / 8; hsr += a * b / 8; hrr += b * b / 8;
      }
      axX.setAttribute('x1', 10); axX.setAttribute('x2', S - 10); axX.setAttribute('y1', Y(0)); axX.setAttribute('y2', Y(0));
      axY.setAttribute('y1', 10); axY.setAttribute('y2', S - 10); axY.setAttribute('x1', X(0)); axY.setAttribute('x2', X(0));
      var ly = Math.min(Y(0) + 22, S - 12);
      lblHi.setAttribute('y', ly); lblLo.setAttribute('y', ly);
      lblHi.textContent = fmt(hi, hi > 20 ? 0 : 1); lblLo.textContent = fmt(lo, hi > 20 ? 0 : 1);
      // eigen-decomposition of the 2x2 Hessian [[hss,hsr],[hsr,hrr]]
      var tr = hss + hrr, det = hss * hrr - hsr * hsr;
      var disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      var l1 = tr / 2 + disc, l2 = Math.max(det / l1, 1e-12);
      var kappa = l1 / l2;
      // eigenvector of the small eigenvalue = long axis of the contour
      var ang = Math.atan2(l2 - hss, hsr || 1e-12) * 180 / Math.PI;
      ell.forEach(function (e) {
        var L = 140 * e.s;
        e.el.setAttribute('rx', L);
        e.el.setAttribute('ry', Math.max(L / Math.sqrt(kappa), 1.5));
        e.el.setAttribute('transform', 'rotate(' + (-ang) + ' ' + S / 2 + ' ' + S / 2 + ')');
      });
      var rho = (kappa - 1) / (kappa + 1);
      var n = rho < 1e-9 ? 1 : Math.ceil(Math.log(0.01) / (2 * Math.log(rho)) - 1e-9);
      rK.textContent = 'condition number κ ≈ ' + (kappa >= 100 ? Math.round(kappa).toLocaleString('en-US') : fmt(kappa, 2));
      rN.textContent = 'about ' + n.toLocaleString('en-US') + ' steps to 1 % of the loss';
    }
    var sl = M4.slider(w, {
      min: 0, max: 1, step: 0.01, value: 0, label: 'standardization',
      format: function (v) { return Math.round(+v * 100) + ' %'; },
      onInput: function (v) { t = +v; playing = false; draw(); }
    });
    var playing = false, from = 0, to = 1;
    var anim = loop(ctx, function (ms) {
      if (!playing) return;
      var u = Math.min(1, ms / 1800), e = u * u * (3 - 2 * u);
      t = from + (to - from) * e; sl.set(Math.round(t * 100) / 100); draw();
      if (u >= 1) playing = false;
    });
    var bro = M4.el('div', { class: 'l3-s2-row' }, w);
    M4.button(bro, 'Standardize', function () { from = t; to = 1; playing = true; anim.restart(); }, { primary: true });
    M4.button(bro, 'Raw data', function () { from = t; to = 0; playing = true; anim.restart(); });
    draw();
  }

  /* ---------- steps 10 and 11: minibatch gradients ---------- */

  var G_TRUE = [1.6, 1.2], G_SIGMA = 2;

  function makeDataset() {
    // deterministic per-example gradients with exact mean G_TRUE and exact per-component standard deviation G_SIGMA
    var seed = 12345;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    function gauss() { return Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd()); }
    var n = 64, d = [], i, c;
    for (i = 0; i < n; i++) d.push([gauss(), gauss()]);
    for (c = 0; c < 2; c++) {
      var m = 0, v = 0;
      for (i = 0; i < n; i++) m += d[i][c] / n;
      for (i = 0; i < n; i++) v += (d[i][c] - m) * (d[i][c] - m) / n;
      for (i = 0; i < n; i++) d[i][c] = G_TRUE[c] + (d[i][c] - m) / Math.sqrt(v) * G_SIGMA;
    }
    return d;
  }
  var DATA = makeDataset();

  function sgdWidget(w, ctx, o) {
    var p = M4.plane(w, { xmin: -4, xmax: 6, ymin: -4, ymax: 6, width: 520, height: 520, labels: false });
    var ring = p.path([[0, 0], [0, 0]], { stroke: GREEN, width: 2, closed: true });
    ring.el.setAttribute('stroke-dasharray', '6 6');
    var target = null;
    if (o.target) {
      var tp = [];
      for (var k = 0; k < 72; k++) tp.push([G_TRUE[0] + o.target * Math.cos(k * Math.PI / 36), G_TRUE[1] + o.target * Math.sin(k * Math.PI / 36)]);
      target = p.path(tp, { stroke: ORANGE, width: 3, closed: true, fill: 'none' });
      p.text(G_TRUE[0], G_TRUE[1] - o.target - 0.5, 'target', { fill: ORANGE, size: 15, weight: 600 });
    }
    var K = 28, old = [];
    for (var i = 0; i < K; i++) {
      old.push({ ln: p.line(0, 0, 0, 0, { stroke: GREEN, width: 1.5 }), pt: p.point(0, 0, { r: 4, fill: GREEN }) });
      old[i].ln.el.style.opacity = 0.25; old[i].pt.el.style.opacity = 0.45;
    }
    var cur = p.arrow(0, 0, G_TRUE[0], G_TRUE[1], { stroke: GREEN, width: 4 });
    var full = p.arrow(0, 0, G_TRUE[0], G_TRUE[1], { stroke: INK, width: 5 });
    p.text(-2.2, 5.3, 'full gradient', { fill: INK, size: 16, weight: 600 });
    p.text(3.4, 5.3, 'minibatch estimates', { fill: GREEN, size: 16, weight: 600 });

    var row = M4.el('div', { class: 'l3-s2-row' }, w);
    var rB = readout(row), rP = readout(row, GREEN), rM = readout(row);
    var B = o.B, hist = [], sumSq = 0, count = 0, last = -1;

    function setB(b) {
      B = b; hist = []; sumSq = 0; count = 0;
      var r = G_SIGMA * Math.sqrt(2 / B), rp = [];
      for (var k = 0; k < 72; k++) rp.push([G_TRUE[0] + r * Math.cos(k * Math.PI / 36), G_TRUE[1] + r * Math.sin(k * Math.PI / 36)]);
      ring.set(rp);
      rB.textContent = 'B = ' + B;
      rP.textContent = 'predicted noise ' + fmt(r, 2);
      rM.textContent = 'measured noise …';
    }
    function sample() {
      var gx = 0, gy = 0;
      for (var j = 0; j < B; j++) { var e = DATA[Math.floor(Math.random() * DATA.length)]; gx += e[0] / B; gy += e[1] / B; }
      hist.unshift([gx, gy]); if (hist.length > K + 1) hist.pop();
      sumSq += (gx - G_TRUE[0]) * (gx - G_TRUE[0]) + (gy - G_TRUE[1]) * (gy - G_TRUE[1]); count++;
      cur.set(0, 0, gx, gy);
      for (var i = 0; i < K; i++) {
        var h = hist[i + 1];
        show(old[i].ln, !!h); show(old[i].pt, !!h);
        if (h) { old[i].ln.set(0, 0, h[0], h[1]); old[i].pt.set(h[0], h[1]); }
      }
      if (count >= 8) rM.textContent = 'measured noise ' + fmt(Math.sqrt(sumSq / count), 2);
    }
    setB(B);
    loop(ctx, function (ms) {
      var tick = Math.floor(ms / 140);
      if (tick !== last) { last = tick; sample(); }
    });
    return { setB: setB, getB: function () { return B; }, target: target, full: full };
  }

  function mountSgdExplore(el, ctx) {
    var w = wrap(el);
    var g = sgdWidget(w, ctx, { B: 2 });
    M4.slider(w, {
      min: 1, max: 32, step: 1, value: 2, label: 'batch size B',
      format: function (v) { return String(Math.round(+v)); },
      onInput: function (v) { g.setB(Math.round(+v)); }
    });
    var row = M4.el('div', { class: 'l3-s2-row' }, w);
    M4.el('span', { class: 'm4-note', text: 'Noise is the root-mean-square distance between the tip of an estimate and the tip of the full gradient. The dashed circle has the predicted radius.' }, row);
  }

  function mountSgdExercise(el, ctx) {
    var w = wrap(el);
    var g = sgdWidget(w, ctx, { B: 2, target: 0.5 });
    var done = false;
    M4.slider(w, {
      min: 1, max: 7, step: 1, value: 1, label: 'batch size B',
      format: function (v) { return String(Math.pow(2, Math.round(+v))); },
      onInput: function (v) { if (!done) g.setB(Math.pow(2, Math.round(+v))); }
    });
    M4.button(w, 'Check', function () {
      if (done) return;
      var B = g.getB(), noise = G_SIGMA * Math.sqrt(2 / B);
      if (B === 32) {
        done = true;
        g.target.el.setAttribute('fill', ORANGE);
        g.target.el.setAttribute('fill-opacity', 0.25);
        ctx.note('\\(B = 32\\) is \\(16\\) times the original batch, and \\(1/\\sqrt{16} = 1/4\\): the noise falls from \\(2.00\\) to \\(0.50\\) while each step costs \\(16\\) times as many gradient evaluations.');
        ctx.solved();
      } else if (B < 32) {
        ctx.wrong('With B = ' + B + ' the predicted noise is ' + fmt(noise, 2) + ', still above the target 0.50.');
      } else {
        ctx.wrong('With B = ' + B + ' the noise is ' + fmt(noise, 2) + ', below the target, but a smaller batch already reaches 0.50.');
      }
    }, { primary: true });
  }

  /* ---------- lesson ---------- */

  M4.lesson({
    id: 'l3-s2',
    module: 'l3',
    title: 'Learning rate and noisy gradients',
    summary: 'How the learning rate and the curvature of the loss decide whether gradient descent creeps, bounces or diverges, why narrow valleys are slow, and how normalization and minibatches help.',
    minutes: 14,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html:
          '<p>Gradient descent updates the parameters by \\(\\theta \\leftarrow \\theta - \\eta\\,\\nabla L(\\theta)\\), where \\(L\\) is the loss and \\(\\eta\\) is the learning rate. The choice of \\(\\eta\\) decides whether descent converges.</p>' +
          '<p>In this lesson you will predict from the curvature whether a given learning rate converges, explain the zigzag of gradient descent in a narrow valley, compute a condition number, state why inputs are standardized, and describe how the noise of a minibatch gradient depends on the batch size.</p>'
      },
      {
        kind: 'text',
        title: 'The factor per step',
        html:
          '<p>Consider the parabola \\(f(x) = \\tfrac12 a x^2\\) with curvature \\(a > 0\\) and minimum at \\(x = 0\\). Its slope is \\(f\'(x) = a x\\), so one gradient descent step is</p>' +
          '\\[ x \\leftarrow x - \\eta\\, a x = (1 - \\eta a)\\,x . \\]' +
          '<p>Every step multiplies the distance to the minimum by the same factor \\(1 - \\eta a\\). The distance shrinks exactly when \\(|1 - \\eta a| < 1\\). A negative factor means that the iterate jumps to the other side of the minimum.</p>'
      },
      {
        kind: 'explore',
        title: 'Four regimes of the learning rate',
        html:
          '<p>The plot shows gradient descent on \\(f(x) = \\tfrac12 x^2\\), so \\(a = 1\\), starting at \\(x = 2\\). With \\(\\eta = 0.2\\) the iterate creeps, with \\(\\eta = 1\\) it lands in the minimum in a single step, with \\(\\eta = 1.6\\) it bounces from side to side but converges, and with \\(\\eta = 2.2\\) it diverges.</p>',
        mount: mountParabola
      },
      {
        kind: 'exercise',
        title: 'Oscillating convergence',
        html:
          '<p>The green curve is \\(|1 - \\eta a|\\) for \\(a = 1\\) as a function of the learning rate \\(\\eta\\). Drag the orange handle to a learning rate for which the iterate changes side at every step and nevertheless converges to the minimum.</p>',
        hint: 'Changing side requires a negative factor, \\(1 - \\eta < 0\\). Convergence requires \\(|1 - \\eta| < 1\\). Both hold between \\(\\eta = 1\\) and \\(\\eta = 2\\).',
        mount: mountFactorPlot
      },
      {
        kind: 'exercise',
        title: 'A more curved parabola',
        html:
          '<p>The more curved the loss, the lower the learning rate has to be: convergence requires \\(\\eta < 2/a\\), and the single-step learning rate is \\(\\eta = 1/a\\). Take a parabola with curvature \\(a = 10\\) and the learning rate \\(\\eta = 0.18\\). Compute the factor \\(1 - \\eta a\\) by which each step multiplies \\(x\\).</p>',
        hint: 'First compute the product \\(\\eta a = 0.18 \\cdot 10\\), then subtract it from 1. The result is negative.',
        mount: function (el, ctx) {
          var w = wrap(el);
          M4.numberInput(w, {
            answer: -0.8, tolerance: 0.011, placeholder: 'factor', label: '1 − ηa =',
            onCorrect: function () {
              ctx.note('\\(1 - 0.18 \\cdot 10 = -0.8\\): the iterate changes side at every step and its distance to the minimum shrinks by 20 % per step.');
              ctx.solved();
            },
            onWrong: function (v) {
              var x = parseFloat(v);
              if (Math.abs(x - 0.8) < 0.011) ctx.wrong('The magnitude is right, but the sign is missing: 1 − 1.8 is negative.');
              else if (Math.abs(x - 1.8) < 0.011) ctx.wrong('1.8 is the product ηa. The factor is 1 minus this product.');
              else ctx.wrong('Compute 0.18 · 10 first, then subtract the result from 1.');
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Narrow valleys',
        html:
          '<p>The loss \\(L(x, y) = \\tfrac12\\,(0.2\\,x^2 + 10\\,y^2)\\) is an elongated bowl: curvature \\(0.2\\) along the flat direction \\(x\\) and curvature \\(10\\) along the steep direction \\(y\\). Gradient descent treats the two directions independently, each with its own factor \\(1 - \\eta \\cdot \\text{curvature}\\).</p>' +
          '<p>With \\(\\eta = 0.18\\) the steep factor is \\(-0.8\\), which produces the bouncing across the valley, and the flat factor is \\(0.964\\), which produces a crawl of about 4 % per step along it. A smaller \\(\\eta\\) removes the bouncing but slows the flat direction further.</p>',
        mount: mountValley
      },
      {
        kind: 'exercise',
        title: 'The best single learning rate',
        html:
          '<p>There is one learning rate for both directions. The plot shows the absolute value of the steep factor \\(|1 - 10\\eta|\\) and of the flat factor \\(|1 - 0.2\\eta|\\). The larger of the two limits the speed of convergence. Set \\(\\eta\\) so that this slower factor is as small as possible, then press Check.</p>',
        hint: 'Left of the crossing the flat factor is the larger one and falls with \\(\\eta\\). Right of it the steep factor is the larger one and rises. The optimum is where \\(10\\eta - 1 = 1 - 0.2\\eta\\).',
        mount: mountBestEta
      },
      {
        kind: 'exercise',
        title: 'The condition number',
        html:
          '<p>Even at the best learning rate both factors are about \\(0.96\\), so the error shrinks by only 4 % per step. How elongated a valley is, is measured by the condition number \\(\\kappa\\): the largest curvature divided by the smallest curvature. A round bowl has \\(\\kappa = 1\\), and the number of steps that gradient descent needs grows in proportion to \\(\\kappa\\).</p>' +
          '<p>Drag tiles into the three slots to build \\(\\kappa\\) for the valley with curvatures \\(10\\) and \\(0.2\\).</p>',
        hint: 'The steep direction has the largest curvature, 10, and the flat direction the smallest, 0.2. Dividing by 0.2 is the same as multiplying by 5.',
        mount: mountKappa
      },
      {
        kind: 'explore',
        title: 'Input normalization',
        html:
          '<p>A model predicts rent from the size of a flat (about 80 m²) and its number of rooms (2 to 3). Because the two features live on very different scales, the loss over the two weights is a long ravine with a very large condition number.</p>' +
          '<p>Standardizing replaces each feature \\(x\\) by \\((x - \\mu)/\\sigma\\), where \\(\\mu\\) is the mean and \\(\\sigma\\) the standard deviation of that feature over the dataset. Both features then have mean 0 and standard deviation 1, and the bowl becomes nearly round.</p>',
        mount: mountNormalize
      },
      {
        kind: 'explore',
        title: 'Stochastic gradient descent',
        html:
          '<p>The full gradient is an average over every datapoint, which is expensive for large datasets. Stochastic gradient descent (SGD) instead averages the gradient over a small random minibatch of \\(B\\) datapoints. Each estimate is a noisy version of the same arrow, and the noise is proportional to \\(1/\\sqrt{B}\\).</p>' +
          '<p>Compare \\(B = 2\\) with \\(B = 6\\): with two datapoints some estimates point almost opposite to the full gradient. An SGD step is much cheaper, so although its path zigzags, it reaches the minimum with far less computation.</p>',
        mount: mountSgdExplore
      },
      {
        kind: 'exercise',
        title: 'Batch size and noise',
        html:
          '<p>With \\(B = 2\\) the noise of the minibatch gradient in this example is \\(2.00\\). Choose the smallest batch size whose predicted noise is at most a quarter of that, \\(0.50\\), so that the dashed circle fits inside the orange target ring. Then press Check.</p>',
        hint: 'The noise is proportional to \\(1/\\sqrt{B}\\). Reducing it by a factor of 4 requires multiplying the batch size by \\(4^2 = 16\\).',
        mount: mountSgdExercise
      },
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>On a parabola with curvature \\(a\\), a gradient descent step multiplies the distance to the minimum by \\(1 - \\eta a\\). It converges for \\(\\eta < 2/a\\) and lands in one step for \\(\\eta = 1/a\\), so a more curved loss requires a lower learning rate.</li>' +
          '<li>In a narrow valley the steepest direction limits \\(\\eta\\) while the flattest direction determines the speed. The number of steps grows with the condition number \\(\\kappa\\), the ratio of largest to smallest curvature. Standardizing the inputs brings \\(\\kappa\\) close to 1.</li>' +
          '<li>SGD estimates the gradient on a minibatch of \\(B\\) datapoints. The estimate has noise proportional to \\(1/\\sqrt{B}\\), and the cheaper steps reach the minimum with much less computation.</li>' +
          '</ul>'
      }
    ]
  });
})();
