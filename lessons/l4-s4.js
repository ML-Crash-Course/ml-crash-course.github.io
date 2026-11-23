(function () {
  'use strict';
  var M4 = window.M4;
  var C = M4.colors;
  var R = String.raw;

  function injectStyle() {
    if (document.getElementById('l4-s4-style')) return;
    var st = document.createElement('style');
    st.id = 'l4-s4-style';
    st.textContent = [
      '.l4-s4-svg{width:100%;height:auto;display:block;background:#fff;border:2px solid ' + C.line + ';border-radius:18px;touch-action:none}',
      '.l4-s4-wrap{display:flex;flex-direction:column;gap:14px;align-items:stretch}',
      '.l4-s4-center{justify-content:center}',
      '.l4-s4-match{display:grid;grid-template-columns:minmax(170px,220px) 1fr;gap:12px 16px;align-items:center}',
      '.l4-s4-match .m4-slot{min-height:56px;display:flex;align-items:center;justify-content:center}',
      '.l4-s4-desc{font-size:16px;line-height:1.4;color:' + C.ink + '}',
      '.l4-s4-tok{font-weight:700;padding:10px 16px;font-size:16px}',
      '.l4-s4-done{border-color:' + C.green + ' !important;color:' + C.green + ';cursor:default}',
      '.l4-s4-dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:8px;vertical-align:middle}',
      '@media (max-width:560px){.l4-s4-match{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function sup(n) {
    return String(n).split('').map(function (ch) { return SUP[ch] || ch; }).join('');
  }
  function fmtSci(v) {
    if (!isFinite(v)) return '∞';
    if (v === 0) return '0';
    var e = Math.floor(Math.log10(v));
    if (e >= -2 && e <= 3) return String(Number(v.toPrecision(3)));
    var m = v / Math.pow(10, e);
    if (m.toFixed(1) === '10.0') { m = 1; e += 1; }
    return m.toFixed(1) + ' × 10' + sup(e);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Log-scale chart: x = layer index, y = log10 of a magnitude.
  function logChart(parent, o) {
    var W = 640, H = o.H || 340, L = 70, Rr = 28, T = 22, B = 44;
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'l4-s4-svg' }, parent);
    function X(v) { return L + (v - o.x0) / (o.x1 - o.x0) * (W - L - Rr); }
    function Y(v) { return T + (o.yhi - v) / (o.yhi - o.ylo) * (H - T - B); }
    (o.ticks || []).forEach(function (t) {
      M4.svg('line', { x1: X(o.x0), x2: X(o.x1), y1: Y(t), y2: Y(t), stroke: t === 0 ? C.muted : C.line, 'stroke-width': t === 0 ? 2 : 1 }, svg);
      var tx = M4.svg('text', { x: L - 10, y: Y(t) + 5, 'text-anchor': 'end', 'font-size': 15, fill: C.muted }, svg);
      tx.textContent = t === 0 ? '1' : '10' + sup(t);
    });
    var lx = M4.svg('text', { x: X(o.x0), y: H - 14, 'text-anchor': 'start', 'font-size': 15, fill: C.muted }, svg);
    lx.textContent = o.left || '';
    var rx = M4.svg('text', { x: X(o.x1), y: H - 14, 'text-anchor': 'end', 'font-size': 15, fill: C.muted }, svg);
    rx.textContent = o.right || '';
    return { svg: svg, X: X, Y: Y, W: W, H: H };
  }

  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ---------------------------------------------------------------- step 2
  function mountChain(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { 'class': 'l4-s4-wrap' }, el);
    var ch = logChart(wrap, { x0: 0.5, x1: 50.5, ylo: -8, yhi: 8, ticks: [-6, -3, 0, 3, 6], left: 'layer 1', right: 'layer 50 (next to the loss)' });
    var bars = [];
    var bw = (ch.X(2) - ch.X(1));
    for (var l = 1; l <= 50; l++) {
      bars.push(M4.svg('rect', { x: ch.X(l) - bw * 0.36, width: bw * 0.72, y: ch.Y(0), height: 1, rx: 2, fill: C.pink }, ch.svg));
    }
    var row = M4.el('div', { 'class': 'm4-row l4-s4-center' }, wrap);
    var ro = M4.el('span', { 'class': 'm4-readout' }, row);
    var verdict = M4.el('span', { 'class': 'm4-chip' }, row);
    var f = 0.8, raf = 0;
    function draw() {
      var lg = Math.log10(f);
      for (var l = 1; l <= 50; l++) {
        var v = clamp((50 - l + 1) * lg, -8, 8);
        var y0 = ch.Y(0), y1 = ch.Y(v);
        bars[l - 1].setAttribute('y', Math.min(y0, y1));
        bars[l - 1].setAttribute('height', Math.max(1.5, Math.abs(y1 - y0)));
        bars[l - 1].setAttribute('fill', f > 1.0001 ? C.orange : (f < 0.9999 ? C.pink : C.green));
      }
      ro.textContent = 'gradient at layer 1 = ' + f.toFixed(2) + sup(50) + ' ≈ ' + fmtSci(Math.pow(f, 50));
      verdict.textContent = Math.abs(f - 1) < 0.005 ? 'stays stable' : (f < 1 ? 'vanishes' : 'explodes');
    }
    var sl = M4.slider(wrap, {
      min: 0.7, max: 1.3, step: 0.01, value: f, label: 'factor per layer',
      format: function (v) { return Number(v).toFixed(2); },
      onInput: function (v) { cancelAnimationFrame(raf); f = Number(v); draw(); }
    });
    function tweenTo(target) {
      cancelAnimationFrame(raf);
      var from = f, t0 = null;
      function tick(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / 600), e = t * t * (3 - 2 * t);
        f = from + (target - from) * e;
        if (t >= 1) f = target;
        sl.set(Math.round(f * 100) / 100);
        draw();
        if (t < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }
    var brow = M4.el('div', { 'class': 'm4-row l4-s4-center' }, wrap);
    [0.8, 1.0, 1.2].forEach(function (v) {
      M4.button(brow, 'factor ' + v.toFixed(1), function () { tweenTo(v); });
    });
    draw();
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
  }

  // ---------------------------------------------------------------- step 3
  function mountFactorHandle(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { 'class': 'l4-s4-wrap' }, el);
    var p = M4.plane(wrap, { xmin: -9, xmax: 56, ymin: -7.6, ymax: 7, width: 640, height: 420, grid: false, axes: false, labels: false });
    [-6, -3, 0, 3, 6].forEach(function (t) {
      p.line(0, t, 50, t, { stroke: t === 0 ? C.muted : C.line, width: t === 0 ? 2 : 1 });
      p.text(-1.5, t - 0.2, t === 0 ? '1' : '10' + sup(t), { fill: C.muted, size: 15, anchor: 'end' });
    });
    p.text(0, -7.2, 'layer 1', { fill: C.muted, size: 15, anchor: 'middle' });
    p.text(50, -7.2, 'layer 50', { fill: C.muted, size: 15, anchor: 'middle' });
    var y = 2, done = false;
    var line = p.line(0, y, 50, 0, { stroke: C.pink, width: 4 });
    p.point(50, 0, { r: 7, fill: C.ink });
    p.text(50, 0.6, 'gradient 1', { fill: C.ink, size: 15, anchor: 'middle' });
    var row = M4.el('div', { 'class': 'm4-row l4-s4-center' }, wrap);
    var r1 = M4.el('span', { 'class': 'm4-readout' }, row);
    var r2 = M4.el('span', { 'class': 'm4-readout' }, row);
    function factor() { return Math.pow(10, y / 50); }
    function draw() {
      line.set(0, y, 50, 0);
      r1.textContent = 'factor per layer = ' + factor().toFixed(3);
      r2.textContent = 'gradient at layer 1 ≈ ' + fmtSci(Math.pow(10, y));
    }
    var h = p.handle(0, y, {
      color: C.pink, r: 13, snap: 0,
      onDrag: function (hx, hy) {
        y = clamp(Math.round(hy * 4) / 4, -6.5, 6.5);
        h.set(0, y);
        draw();
      },
      onEnd: function () {
        h.set(0, y);
        if (done) return;
        var f = factor();
        if (f >= 0.79 && f <= 0.81) {
          done = true;
          line.el.setAttribute('stroke', C.green);
          ctx.note(R`A factor of about \(0.8\) per layer leaves roughly \(0.8^{50}\approx 10^{-5}\) of the gradient at layer 1.`);
          ctx.solved();
        } else if (f > 1) {
          ctx.note(R`The factor is above \(1\), so the gradient grows towards layer 1. A factor of \(0.80\) shrinks it.`);
        } else if (f > 0.81) {
          ctx.note(R`The factor is ` + f.toFixed(3) + R`, still larger than \(0.80\). Lower the endpoint.`);
        } else {
          ctx.note(R`The factor is ` + f.toFixed(3) + R`, smaller than \(0.80\). Raise the endpoint.`);
        }
      }
    });
    draw();
  }

  // ---------------------------------------------------------------- step 7
  function mountSim(el, ctx) {
    injectStyle();
    var N = 128, LAYERS = 20;
    var wrap = M4.el('div', { 'class': 'l4-s4-wrap' }, el);
    var ch = logChart(wrap, { x0: 0, x1: 20, ylo: -8, yhi: 8, ticks: [-6, -3, 0, 3, 6], left: 'input', right: 'after layer 20' });
    var inits = [
      { name: 'Var(w) = 1', v: 1, color: C.orange },
      { name: 'Var(w) = 1/n', v: 1 / N, color: C.blue },
      { name: 'Var(w) = 2/n', v: 2 / N, color: C.pink }
    ];
    var row = M4.el('div', { 'class': 'm4-row l4-s4-center' }, wrap);
    inits.forEach(function (it) {
      it.poly = M4.svg('polyline', { fill: 'none', stroke: it.color, 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', points: '' }, ch.svg);
      it.dot = M4.svg('circle', { r: 7, fill: it.color, cx: ch.X(0), cy: ch.Y(0) }, ch.svg);
      it.ro = M4.el('span', { 'class': 'm4-readout' }, row);
      it.ro.style.borderColor = it.color;
    });
    var offLabel = M4.svg('text', { x: ch.X(5.2), y: ch.Y(8) + 18, 'font-size': 15, fill: C.orange, 'text-anchor': 'start' }, ch.svg);
    var timer = 0, alive = true;
    function meanSq(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * a[i]; return s / a.length; }
    function show(it) {
      var pts = [], last = null;
      for (var l = 0; l < it.q.length; l++) {
        var lg = Math.log10(Math.max(it.q[l], 1e-300));
        if (lg > 8) {
          // clip the segment at the top edge of the chart
          var prev = Math.log10(it.q[l - 1]);
          var t = (8 - prev) / (lg - prev);
          last = [ch.X(l - 1 + t), ch.Y(8)];
          pts.push(last);
          break;
        }
        last = [ch.X(l), ch.Y(Math.max(lg, -8))];
        pts.push(last);
      }
      it.poly.setAttribute('points', pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '));
      it.dot.setAttribute('cx', last[0]); it.dot.setAttribute('cy', last[1]);
      it.ro.textContent = it.name + ':  ' + fmtSci(it.q[it.q.length - 1]);
    }
    function run() {
      clearTimeout(timer);
      offLabel.textContent = '';
      var x = new Float64Array(N);
      for (var i = 0; i < N; i++) x[i] = gauss();
      inits.forEach(function (it) { it.h = Float64Array.from(x); it.q = [meanSq(x)]; show(it); });
      var layer = 0;
      function stepLayer() {
        if (!alive) return;
        layer++;
        inits.forEach(function (it) {
          var sd = Math.sqrt(it.v), out = new Float64Array(N);
          for (var i = 0; i < N; i++) {
            var z = 0;
            for (var j = 0; j < N; j++) z += sd * gauss() * it.h[j];
            out[i] = z > 0 ? z : 0;
          }
          it.h = out; it.q.push(meanSq(out)); show(it);
        });
        if (layer === 5) offLabel.textContent = 'leaves the chart';
        if (layer < LAYERS) timer = setTimeout(stepLayer, 140);
      }
      timer = setTimeout(stepLayer, 300);
    }
    var brow = M4.el('div', { 'class': 'm4-row l4-s4-center' }, wrap);
    M4.button(brow, 'Draw new weights and run', run, { primary: true });
    M4.el('div', { 'class': 'm4-note', text: 'Vertical axis: mean squared activation of a layer with n = 128 ReLU units, logarithmic scale. The numbers show the value after the last computed layer.' }, wrap);
    run();
    ctx.onCleanup(function () { alive = false; clearTimeout(timer); });
  }

  // ---------------------------------------------------------------- step 8
  function mountInitSlider(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { 'class': 'l4-s4-wrap' }, el);
    var ch = logChart(wrap, { x0: 0, x1: 20, ylo: -8, yhi: 8, ticks: [-6, -3, 0, 3, 6], left: 'input', right: 'after layer 20' });
    M4.svg('rect', { x: ch.X(0), y: ch.Y(0.35), width: ch.X(20) - ch.X(0), height: ch.Y(-0.35) - ch.Y(0.35), fill: C.green, opacity: 0.14 }, ch.svg);
    var line = M4.svg('line', { x1: ch.X(0), y1: ch.Y(0), stroke: C.pink, 'stroke-width': 5, 'stroke-linecap': 'round' }, ch.svg);
    var dot = M4.svg('circle', { r: 8, fill: C.pink }, ch.svg);
    var row = M4.el('div', { 'class': 'm4-row l4-s4-center' }, wrap);
    var r1 = M4.el('span', { 'class': 'm4-readout' }, row);
    var r2 = M4.el('span', { 'class': 'm4-readout' }, row);
    var c = 1, done = false;
    function draw() {
      var yend = 20 * Math.log10(c / 2), t = Math.abs(yend) > 8 ? 8 / Math.abs(yend) : 1;
      var ex = ch.X(20 * t), ey = ch.Y(yend * t);
      line.setAttribute('x2', ex); line.setAttribute('y2', ey);
      dot.setAttribute('cx', ex); dot.setAttribute('cy', ey);
      r1.textContent = 'factor per layer = c/2 = ' + (c / 2).toFixed(2);
      r2.textContent = 'after 20 layers ≈ ' + fmtSci(Math.pow(c / 2, 20));
    }
    M4.slider(wrap, {
      min: 0.5, max: 4, step: 0.1, value: c, label: 'c in Var(w) = c/n',
      format: function (v) { return Number(v).toFixed(1); },
      onInput: function (v) { if (done) return; c = Number(v); draw(); }
    });
    var brow = M4.el('div', { 'class': 'm4-row l4-s4-center' }, wrap);
    M4.button(brow, 'Check', function () {
      if (done) return;
      if (Math.abs(c - 2) < 0.05) {
        done = true;
        line.setAttribute('stroke', C.green); dot.setAttribute('fill', C.green);
        ctx.note(R`With \(\mathrm{Var}(w)=2/n\) the factor per layer is \(n\cdot\tfrac{2}{n}\cdot\tfrac12=1\). This is Kaiming (He) initialization.`);
        ctx.solved();
      } else if (c < 2) {
        ctx.wrong('The signal is multiplied by ' + (c / 2).toFixed(2) + ' in every layer and shrinks to about ' + fmtSci(Math.pow(c / 2, 20)) + ' after 20 layers.');
      } else {
        ctx.wrong('The signal is multiplied by ' + (c / 2).toFixed(2) + ' in every layer and grows to about ' + fmtSci(Math.pow(c / 2, 20)) + ' after 20 layers.');
      }
    }, { primary: true });
    draw();
  }

  // ---------------------------------------------------------------- step 9
  function mountResidual(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { 'class': 'l4-s4-wrap' }, el);
    var p = M4.plane(wrap, { xmin: -3.3, xmax: 3.3, ymin: -3.3, ymax: 3.3, width: 520, height: 520, grid: false, axes: false, labels: false });
    var ks = [], k;
    for (k = -2; k <= 2.001; k += 0.5) ks.push(k);
    ks.forEach(function (v) {
      p.line(-2, v, 2, v, { stroke: C.line, width: 1.5 });
      p.line(v, -2, v, 2, { stroke: C.line, width: 1.5 });
    });
    var a = 0, s = 0.6, raf = 0;
    function f(x, y) {
      return [s * Math.tanh(0.9 * x - 0.8 * y), s * Math.tanh(0.7 * x + 0.6 * y)];
    }
    function T(x, y) { var o = f(x, y); return [a * x + o[0], a * y + o[1]]; }
    function sample(fixed, horizontal) {
      var pts = [];
      for (var i = 0; i <= 24; i++) {
        var t = -2 + 4 * i / 24;
        pts.push(horizontal ? T(t, fixed) : T(fixed, t));
      }
      return pts;
    }
    var hs = ks.map(function (v) { return p.path(sample(v, true), { stroke: C.pink, width: 2.5 }); });
    var vs = ks.map(function (v) { return p.path(sample(v, false), { stroke: C.purple, width: 2.5 }); });
    var H0 = [1.5, 1];
    p.point(H0[0], H0[1], { r: 7, fill: C.muted });
    var link = p.line(H0[0], H0[1], H0[0], H0[1], { stroke: C.ink, width: 2, dash: '5 5' });
    var img = p.point(H0[0], H0[1], { r: 8, fill: C.ink });
    var row = M4.el('div', { 'class': 'm4-row l4-s4-center' }, wrap);
    var r1 = M4.el('span', { 'class': 'm4-readout' }, row);
    var r2 = M4.el('span', { 'class': 'm4-readout' }, row);
    function draw() {
      ks.forEach(function (v, i) { hs[i].set(sample(v, true)); vs[i].set(sample(v, false)); });
      var o = T(H0[0], H0[1]);
      img.set(o[0], o[1]); link.set(H0[0], H0[1], o[0], o[1]);
      r1.innerHTML = M4.tex(M4.col(['1.50', '1.00']) + ' \\;\\mapsto\\; ' + M4.col([o[0].toFixed(2), o[1].toFixed(2)]));
      r2.textContent = 'distance moved = ' + Math.hypot(o[0] - H0[0], o[1] - H0[1]).toFixed(2);
    }
    function tweenTo(target) {
      cancelAnimationFrame(raf);
      var from = a, t0 = null;
      function tick(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / 700), e = t * t * (3 - 2 * t);
        a = from + (target - from) * e;
        draw();
        if (t < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }
    var brow = M4.el('div', { 'class': 'm4-row l4-s4-center' }, wrap);
    M4.button(brow, 'Plain layer: f(h)', function () { tweenTo(0); });
    M4.button(brow, 'Residual layer: h + f(h)', function () { tweenTo(1); }, { primary: true });
    M4.slider(wrap, {
      min: 0.1, max: 1, step: 0.05, value: s, label: 'size of f',
      format: function (v) { return Number(v).toFixed(2); },
      onInput: function (v) { s = Number(v); draw(); }
    });
    M4.el('div', { 'class': 'm4-note', text: 'Grey: the grid before the layer. Coloured: the grid after the layer. The grey point h is carried to the black point.' }, wrap);
    draw();
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
  }

  // ---------------------------------------------------------------- step 10
  function mountNormalize(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { 'class': 'l4-s4-wrap' }, el);
    var p = M4.plane(wrap, { xmin: -5, xmax: 5, ymin: -0.2, ymax: 1.2, width: 640, height: 380, grid: false, axes: false, labels: false });
    p.line(-5, 0, 5, 0, { stroke: C.muted, width: 2 });
    for (var t = -4; t <= 4; t++) {
      p.line(t, 0, t, -0.02, { stroke: C.muted, width: 2 });
      p.text(t, -0.11, String(t), { fill: C.muted, size: 15, anchor: 'middle' });
    }
    function dens(m, s) {
      return function (x) { return Math.exp(-0.5 * (x - m) * (x - m) / (s * s)) / (s * Math.sqrt(2 * Math.PI)); };
    }
    p.fn(dens(0, 1), { stroke: C.green, width: 3 }).el.setAttribute('stroke-dasharray', '7 7');
    p.text(-2.2, 0.3, 'target: mean 0, std 1', { fill: C.green, size: 15, anchor: 'end' });
    var m = 2.6, s = 0.4, done = false;
    var curve = p.fn(dens(m, s), { stroke: C.pink, width: 4, samples: 300 });
    var row = M4.el('div', { 'class': 'm4-row l4-s4-center' }, wrap);
    var r1 = M4.el('span', { 'class': 'm4-readout' }, row);
    var r2 = M4.el('span', { 'class': 'm4-readout' }, row);
    var hm, hw;
    function peak() { return 1 / (s * Math.sqrt(2 * Math.PI)); }
    function draw() {
      curve.set(dens(m, s));
      hm.set(m, peak());
      hw.set(m + s, peak() * Math.exp(-0.5));
      r1.textContent = 'mean = ' + m.toFixed(2);
      r2.textContent = 'standard deviation = ' + s.toFixed(2);
    }
    function check() {
      if (done) return;
      var okM = Math.abs(m) <= 0.15, okS = Math.abs(s - 1) <= 0.12;
      if (okM && okS) {
        done = true;
        curve.el.setAttribute('stroke', C.green);
        ctx.note(R`The activations are re-centred to mean \(0\) and rescaled to standard deviation \(1\): \(\hat a=(a-\mu)/\sigma\) with \(\mu=2.6\), \(\sigma=0.4\).`);
        ctx.solved();
      } else if (!okM && !okS) {
        ctx.note('Both the mean (' + m.toFixed(2) + ') and the standard deviation (' + s.toFixed(2) + ') are still off target.');
      } else if (!okM) {
        ctx.note('The width matches. The mean is ' + m.toFixed(2) + '; move the top handle to 0.');
      } else {
        ctx.note('The centre matches. The standard deviation is ' + s.toFixed(2) + '; drag the side handle until it is 1.');
      }
    }
    hm = p.handle(m, peak(), {
      color: C.pink, r: 13,
      onDrag: function (x) { if (done) { draw(); return; } m = clamp(Math.round(x * 10) / 10, -4, Math.min(4, 4.8 - s)); draw(); },
      onEnd: function () { draw(); check(); }
    });
    hw = p.handle(m + s, peak() * Math.exp(-0.5), {
      color: C.purple, r: 12,
      onDrag: function (x) { if (done) { draw(); return; } s = clamp(Math.round((x - m) * 20) / 20, 0.35, Math.max(0.35, Math.min(2.5, 4.8 - m))); draw(); },
      onEnd: function () { draw(); check(); }
    });
    M4.el('div', { 'class': 'm4-note', text: 'Pink handle: moves the centre. Purple handle: sets the width (it sits one standard deviation to the right of the centre).' }, wrap);
    draw();
  }

  // ---------------------------------------------------------------- step 11
  function mountMatch(el, ctx) {
    injectStyle();
    var items = [
      { name: 'Convolution', desc: 'A small window slides along the sequence and applies the same weights at every position.' },
      { name: 'Recurrent network', desc: 'A hidden state is passed from token to token, one at a time. Gradients flow back through all of these steps.' },
      { name: 'Linear attention', desc: 'Every token writes into one fixed-size memory, and later tokens read from it.' },
      { name: 'Softmax attention', desc: 'Every token looks at all earlier tokens and decides how much to take from each of them.' }
    ];
    var wrap = M4.el('div', { 'class': 'l4-s4-wrap' }, el);
    var tray = M4.el('div', { 'class': 'm4-row l4-s4-center' }, wrap);
    var grid = M4.el('div', { 'class': 'l4-s4-match' }, wrap);
    var order = [2, 0, 3, 1];
    var tokens = order.map(function (i) {
      var tk = M4.el('div', { 'class': 'm4-token l4-s4-tok', text: items[i].name }, tray);
      tk.setAttribute('data-k', String(i));
      return tk;
    });
    var slots = items.map(function (it, i) {
      var sl = M4.el('div', { 'class': 'm4-slot' }, grid);
      sl.setAttribute('data-k', String(i));
      M4.el('div', { 'class': 'l4-s4-desc', text: it.desc }, grid);
      return sl;
    });
    var placed = 0;
    M4.dragDrop({
      tokens: tokens, slots: slots,
      onDrop: function (tk, sl) {
        if (tk.classList.contains('l4-s4-done') || sl.classList.contains('filled')) return;
        var a = Number(tk.getAttribute('data-k')), b = Number(sl.getAttribute('data-k'));
        if (a === b) {
          sl.appendChild(tk);
          sl.classList.add('filled');
          tk.classList.add('l4-s4-done'); tk.classList.add('m4-pop');
          tk.style.pointerEvents = 'none';
          placed++;
          ctx.note(placed + ' of 4 placed.');
          if (placed === 4) {
            ctx.note('All four mechanisms answer the same question: how do tokens exchange information?');
            ctx.solved();
          }
        } else {
          var msg = {
            0: 'A convolution is local: one small window with shared weights, moved along the sequence.',
            1: 'A recurrent network processes tokens one at a time and carries a hidden state forward.',
            2: 'Linear attention uses one shared memory of fixed size that tokens write to and read from.',
            3: 'Softmax attention compares a token with every earlier token and weights each of them.'
          }[a];
          ctx.wrong(msg);
        }
      },
      onMiss: function () {}
    });
  }

  // ================================================================ lesson
  M4.lesson({
    id: 'l4-s4',
    module: 'l4',
    title: 'Gradient flow in deep networks',
    summary: 'Gradients can vanish or explode in deep networks. Kaiming initialization, residual connections and normalization prevent this, and the session ends with a first look at models for sequences.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: R`<p>Backpropagation multiplies one factor per layer on the way from the loss back to the first weights. In a deep network this product decides whether training works at all.</p>
<p>The goals are to predict whether a gradient vanishes or explodes from its per-layer factor, derive the weight variance \(2/n\) of Kaiming initialization, and explain what residual connections and normalization layers do to the signal. The session closes with a preview of four ways to let the tokens of a sequence exchange information.</p>`
      },
      {
        kind: 'explore',
        title: 'Products of fifty factors',
        html: R`<p>Consider a chain of \(50\) layers in which the backward pass multiplies the gradient by the same factor \(f\) at every layer. The gradient that reaches layer \(1\) is \(f^{50}\) times the gradient at the loss.</p>
<p>The bars show the size of the gradient at each layer on a logarithmic scale. A factor of \(0.8\) gives \(0.8^{50}\approx 10^{-5}\) (the gradient vanishes), a factor of \(1.2\) gives \(1.2^{50}\approx 9000\) (it explodes), and only a factor of \(1\) keeps the gradient at its size.</p>`,
        mount: mountChain
      },
      {
        kind: 'exercise',
        title: 'Factors from slopes',
        html: R`<p>On a logarithmic axis the gradient along the chain is a straight line: every layer adds \(\log_{10} f\). The black point is the gradient \(1\) at layer \(50\). The pink handle is the gradient that arrives at layer \(1\).</p>
<p>Drag the handle so that the factor per layer is \(0.80\) (between \(0.79\) and \(0.81\)).</p>`,
        hint: R`Fifty factors of \(0.8\) give \(0.8^{50}\approx 1.4\times 10^{-5}\), so the handle belongs slightly above \(10^{-5}\), a little below the midpoint between the lines \(10^{-6}\) and \(10^{-3}\).`,
        mount: mountFactorHandle
      },
      {
        kind: 'exercise',
        title: 'Sigmoid layers',
        html: R`<p>The local derivative of the sigmoid \(\sigma(z)=1/(1+e^{-z})\) is \(\sigma'(z)=\sigma(z)\,(1-\sigma(z))\), which is at most \(0.25\). For ReLU the local derivative is \(1\) for every active unit, which is one reason ReLU replaced the sigmoid.</p>
<p>A gradient passes backwards through ten sigmoid layers. Which value is the best estimate of the largest factor it can keep from the sigmoid derivatives alone?</p>`,
        hint: R`Each layer contributes at most \(0.25\), so ten layers contribute at most \(0.25^{10}=1/4^{10}=1/1048576\).`,
        mount: function (el, ctx) {
          M4.choices(el, {
            options: [R`\(10^{-2}\)`, R`\(10^{-6}\)`, R`\(10^{-10}\)`, R`\(2.5\)`],
            correct: 1,
            onCorrect: function () {
              ctx.note(R`\(0.25^{10}\approx 9.5\times 10^{-7}\approx 10^{-6}\).`);
              ctx.solved();
            },
            onWrong: function (i) {
              ctx.wrong(i === 3 ? 'The factors are multiplied, not added: ten factors of at most 0.25.' : 'Compute 0.25 to the power 10, which equals 1 divided by 4 to the power 10.');
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Initial weight scale',
        html: R`<p>The forward pass has the same problem: activations can die out or blow up from layer to layer. If all weights start at zero, all hidden units compute the same value, receive the same gradient and stay identical, so the weights must be random.</p>
<p>Take one unit with \(n\) inputs \(x_i\) and weights \(w_i\), with pre-activation \(z=\sum_{i=1}^{n} w_i x_i\). If weights and inputs are independent with mean \(0\), then</p>
\[\mathrm{Var}(z)=n\cdot\mathrm{Var}(w)\cdot\mathrm{Var}(x).\]
<p>The scale of the signal is therefore multiplied by \(n\cdot\mathrm{Var}(w)\) in every layer.</p>`
      },
      {
        kind: 'exercise',
        title: 'One layer with unit-variance weights',
        html: R`<p>A unit has \(n=512\) inputs, each with \(\mathrm{Var}(x)=1\). The weights are drawn with \(\mathrm{Var}(w)=1\).</p>
<p>Compute \(\mathrm{Var}(z)\) for \(z=\sum_{i=1}^{n} w_i x_i\).</p>`,
        hint: R`Insert the three numbers into \(\mathrm{Var}(z)=n\cdot\mathrm{Var}(w)\cdot\mathrm{Var}(x)\).`,
        mount: function (el, ctx) {
          M4.numberInput(el, {
            answer: 512, tolerance: 0.5, placeholder: 'Var(z)', label: 'Var(z) =',
            onCorrect: function () {
              ctx.note(R`\(512\cdot 1\cdot 1=512\): the variance grows by a factor of \(512\) per layer. Choosing \(\mathrm{Var}(w)=1/n\) instead gives \(\mathrm{Var}(z)=1\) (Xavier / Glorot initialization).`);
              ctx.solved();
            },
            onWrong: function (v) {
              ctx.wrong(Number(v) === 1 ? 'That would be the result for Var(w) = 1/n. Here Var(w) = 1.' : 'Multiply n, Var(w) and Var(x).');
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Twenty ReLU layers, three initializations',
        html: R`<p>\(\mathrm{Var}(w)=1/n\) preserves the scale of \(z\), but ReLU then sets about half of the units to \(0\), so the signal halves in every layer. Doubling the variance to \(\mathrm{Var}(w)=2/n\) compensates for this. It is called Kaiming (He) initialization.</p>
<p>The simulation sends one random input through \(20\) ReLU layers with freshly drawn weights. With \(\mathrm{Var}(w)=1\) the activations explode, with \(1/n\) they shrink towards \(2^{-20}\approx 10^{-6}\), and with \(2/n\) they stay near \(1\).</p>`,
        mount: mountSim
      },
      {
        kind: 'exercise',
        title: 'Variance preserving initialization',
        html: R`<p>Write the weight variance as \(\mathrm{Var}(w)=c/n\). One ReLU layer multiplies the mean squared activation by \(n\cdot\frac{c}{n}\cdot\frac12=\frac{c}{2}\), where the factor \(\frac12\) comes from the half of the units that ReLU sets to \(0\).</p>
<p>Set \(c\) so that the signal stays inside the green band through all \(20\) layers, then check.</p>`,
        hint: R`The signal is preserved when the factor per layer equals \(1\), that is \(c/2=1\).`,
        mount: mountInitSlider
      },
      {
        kind: 'explore',
        title: 'Residual connections',
        html: R`<p>Initialization gives a sane start, but during training the weights move away from it. A residual connection changes the layer itself: instead of \(h\mapsto f(h)\) it computes \(h\mapsto h+f(h)\), where \(h\) is the vector of activations entering the layer.</p>
<p>A plain layer replaces the space by its image under \(f\). A residual layer only nudges it. In the backward pass the identity path carries the gradient with factor \(1\), independent of \(f\).</p>`,
        mount: mountResidual
      },
      {
        kind: 'exercise',
        title: 'Normalization',
        html: R`<p>A normalization layer re-centres and rescales the activations after a layer, so their distribution cannot drift off or collapse. It is the idea of input normalization, now applied inside the network: \(\hat a=(a-\mu)/\sigma\), where \(\mu\) is the mean and \(\sigma\) the standard deviation of the activations \(a\).</p>
<p>The pink curve is the distribution of the activations of one layer. It has drifted and narrowed. Drag the two handles until it matches the dashed target with mean \(0\) and standard deviation \(1\).</p>`,
        hint: R`First move the pink handle at the peak to \(0\). Then drag the purple handle to \(x=1\): it sits one standard deviation to the right of the centre.`,
        mount: mountNormalize
      },
      {
        kind: 'exercise',
        title: 'Mixing across a sequence',
        html: R`<p>The networks so far process each input on its own, but text is a sequence of tokens, each represented by a vector. Four mechanisms let the tokens exchange information. They are the subject of the rest of the course.</p>
<p>Drag each mechanism to its description.</p>`,
        hint: 'Two of the mechanisms are forms of attention: one uses a single shared memory, the other compares each token with all earlier ones. Of the remaining two, the convolution is the local one.',
        mount: mountMatch
      },
      {
        kind: 'text',
        title: 'Recap',
        html: R`<ul>
<li>The backward pass multiplies one factor per layer: \(0.8^{50}\approx 10^{-5}\) vanishes, \(1.2^{50}\approx 9000\) explodes, and sigmoid layers contribute at most \(0.25\) each, whereas an active ReLU unit contributes \(1\).</li>
<li>From \(\mathrm{Var}(z)=n\cdot\mathrm{Var}(w)\cdot\mathrm{Var}(x)\): \(\mathrm{Var}(w)=1/n\) preserves the scale of a linear layer (Xavier / Glorot), and \(\mathrm{Var}(w)=2/n\) preserves it through ReLU layers (Kaiming / He).</li>
<li>Residual connections \(h+f(h)\) carry the gradient back with factor \(1\), and normalization layers re-centre and rescale the activations after every layer. Together with ReLU and Kaiming initialization they let deep networks train.</li>
</ul>
<p class="m4-note">To make shapes, parameter counts and forward passes automatic, work through <a href="#/l/nn-drill">Neural network practice</a>.</p>`
      }
    ]
  });
})();
