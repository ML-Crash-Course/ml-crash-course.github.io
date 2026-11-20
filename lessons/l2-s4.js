(function () {
  'use strict';

  var C = M4.colors;
  var LN2 = Math.log(2);
  var LN3 = Math.log(3);

  /* ---------- one-time CSS ---------- */
  function css() {
    if (document.getElementById('l2-s4-style')) return;
    var s = document.createElement('style');
    s.id = 'l2-s4-style';
    s.textContent = [
      '.l2-s4-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%}',
      '.l2-s4-svg{width:100%;max-width:640px;height:auto;display:block;background:#fff;border:1px solid #e6e4dd;border-radius:18px;user-select:none;-webkit-user-select:none}',
      '.l2-s4-grab{cursor:grab;touch-action:none}',
      '.l2-s4-grab:active{cursor:grabbing}',
      '.l2-s4-bar{width:100%;max-width:640px;height:30px;border-radius:15px;background:#f0eee7;position:relative;overflow:hidden;display:flex}',
      '.l2-s4-seg{height:100%;transition:width .08s linear}',
      '.l2-s4-mark{position:absolute;top:0;bottom:0;width:0;border-left:3px dashed #1d1d1f;opacity:.55}',
      '.l2-s4-cap{font-size:15px;color:#6b6f76;text-align:center}',
      '.l2-s4-eq{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:10px 14px;font-size:20px}',
      '.l2-s4-term{display:flex;flex-direction:column;align-items:center;gap:8px;background:#fff;border:1px solid #e6e4dd;border-radius:16px;padding:12px 14px}',
      '.l2-s4-termrow{display:flex;align-items:center;gap:8px}',
      '.l2-s4-slot{min-width:78px;min-height:56px;display:flex;align-items:center;justify-content:center;box-sizing:border-box}',
      '.l2-s4-slot.l2-s4-wide{min-width:210px}',
      '.l2-s4-slot.l2-s4-ok{border-color:#16b56b;border-style:solid;background:#e9f9f1}',
      '.l2-s4-tray{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;min-height:60px;padding:12px;border-radius:16px;background:#f3f1ea;width:100%;max-width:640px;box-sizing:border-box}',
      '.l2-s4-tok{font-size:19px;font-weight:700;padding:10px 18px;touch-action:none;user-select:none;-webkit-user-select:none}',
      '.l2-s4-plus{font-size:26px;font-weight:700;color:#6b6f76;align-self:center}',
      '.l2-s4-table{display:grid;grid-template-columns:1fr 1fr auto;gap:10px 14px;align-items:center;width:100%;max-width:640px}',
      '.l2-s4-th{font-size:15px;font-weight:700;color:#6b6f76;}',
      '.l2-s4-td{font-size:19px;font-weight:600;background:#fff;border:1px solid #e6e4dd;border-radius:14px;padding:14px 16px}',
      '.l2-s4-tag{font-weight:700;font-size:15px}',
      '@media (max-width:560px){.l2-s4-table{grid-template-columns:1fr 1fr}.l2-s4-table .l2-s4-slot{grid-column:1 / span 2}.l2-s4-th.l2-s4-h3{display:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- small local helpers ---------- */
  function S(tag, attrs, parent, text) {
    var e = M4.svg(tag, attrs, parent);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function f2(v) { return isFinite(v) ? v.toFixed(2) : '∞'; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function surprise(p) { return p <= 0 ? Infinity : -Math.log(p); }
  function term(w, q) { return w <= 0 ? 0 : w * surprise(q); }          // convention 0 * log 0 = 0
  function coinH(p) { return term(p, p) + term(1 - p, 1 - p); }
  function coinCE(p, q) { return term(p, q) + term(1 - p, 1 - q); }
  function entropy(ps) { var h = 0; for (var i = 0; i < ps.length; i++) h += term(ps[i], ps[i]); return h; }

  function readout(parent, label, color) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    var l = M4.el('span', { text: label + ' ' }, r);
    if (color) l.style.color = color;
    l.style.fontWeight = '700';
    var v = M4.el('span', { text: '' }, r);
    return function (t) { v.textContent = t; };
  }

  function vbScale(svg, vbW) {
    var r = svg.getBoundingClientRect();
    return r.width > 0 ? vbW / r.width : 1;
  }

  // Axes for a function plot. Returns { svg, g, X, Y }.
  function plot(parent, o) {
    var W = 640, H = 380, L = 70, R = 24, T = 24, B = 60;
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'l2-s4-svg' }, parent);
    function X(v) { return L + (v - o.xmin) / (o.xmax - o.xmin) * (W - L - R); }
    function Y(v) { return H - B - (v - o.ymin) / (o.ymax - o.ymin) * (H - T - B); }
    o.xticks.forEach(function (t) {
      S('line', { x1: X(t), y1: Y(o.ymin), x2: X(t), y2: Y(o.ymax), stroke: C.line, 'stroke-width': 1 }, svg);
      S('text', { x: X(t), y: Y(o.ymin) + 22, 'text-anchor': 'middle', 'font-size': 15, fill: C.muted }, svg, String(t));
    });
    o.yticks.forEach(function (t) {
      S('line', { x1: X(o.xmin), y1: Y(t), x2: X(o.xmax), y2: Y(t), stroke: C.line, 'stroke-width': 1 }, svg);
      S('text', { x: X(o.xmin) - 10, y: Y(t) + 5, 'text-anchor': 'end', 'font-size': 15, fill: C.muted }, svg, String(t));
    });
    S('line', { x1: X(o.xmin), y1: Y(o.ymin), x2: X(o.xmax), y2: Y(o.ymin), stroke: C.ink, 'stroke-width': 2 }, svg);
    S('line', { x1: X(o.xmin), y1: Y(o.ymin), x2: X(o.xmin), y2: Y(o.ymax), stroke: C.ink, 'stroke-width': 2 }, svg);
    S('text', { x: (X(o.xmin) + X(o.xmax)) / 2, y: H - 12, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: C.ink }, svg, o.xlabel);
    S('text', { x: 20, y: (Y(o.ymin) + Y(o.ymax)) / 2, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: C.ink, transform: 'rotate(-90 20 ' + (Y(o.ymin) + Y(o.ymax)) / 2 + ')' }, svg, o.ylabel);
    var g = S('g', {}, svg);
    return { svg: svg, g: g, X: X, Y: Y, xmin: o.xmin, xmax: o.xmax, ymin: o.ymin, ymax: o.ymax };
  }
  function curveD(P, f, a, b, n) {
    var d = '', pen = false;
    for (var i = 0; i <= n; i++) {
      var x = a + (b - a) * i / n, y = f(x);
      if (!isFinite(y) || y > P.ymax) { pen = false; continue; }
      d += (pen ? 'L' : 'M') + P.X(x).toFixed(1) + ' ' + P.Y(y).toFixed(1) + ' ';
      pen = true;
    }
    return d;
  }

  // Token / slot plumbing shared by the two drag-and-drop exercises.
  function makeDD(tray, tokens, slots, onChange) {
    function refresh() {
      slots.forEach(function (s) { s.classList.toggle('filled', !!s.querySelector('.m4-token')); });
    }
    function home(t) { t.style.transform = ''; tray.appendChild(t); }
    M4.dragDrop({
      tokens: tokens,
      slots: slots,
      onDrop: function (t, s) {
        var old = s.querySelector('.m4-token');
        if (old && old !== t) home(old);
        s.appendChild(t);
        refresh();
        if (onChange) onChange();
      },
      onMiss: function (t) { home(t); refresh(); if (onChange) onChange(); }
    });
    return {
      refresh: refresh,
      home: function (t) { home(t); refresh(); },
      reset: function () { tokens.forEach(home); refresh(); },
      value: function (s) { var t = s.querySelector('.m4-token'); return t ? t.getAttribute('data-v') : null; }
    };
  }

  /* ================= STEP 3: explore, entropy of a coin ================= */
  function mountCoinEntropy(el, ctx) {
    css();
    var wrap = M4.el('div', { class: 'l2-s4-wrap' }, el);
    var P = plot(wrap, { xmin: 0, xmax: 1, ymin: 0, ymax: 0.8, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.2, 0.4, 0.6, 0.8], xlabel: 'p = probability of heads', ylabel: 'entropy H' });
    S('path', { d: curveD(P, coinH, 0, 1, 200), fill: 'none', stroke: C.purple, 'stroke-width': 4, 'stroke-linecap': 'round' }, P.g);
    var drop = S('line', { stroke: C.orange, 'stroke-width': 2, 'stroke-dasharray': '5 5' }, P.g);
    var dot = S('circle', { r: 10, fill: C.orange, stroke: '#fff', 'stroke-width': 3 }, P.g);

    var bar = M4.el('div', { class: 'l2-s4-bar' }, wrap);
    var segH = M4.el('div', { class: 'l2-s4-seg', style: 'background:' + C.purple }, bar);
    var segT = M4.el('div', { class: 'l2-s4-seg', style: 'background:' + C.orange }, bar);
    var cap = M4.el('div', { class: 'l2-s4-cap' }, wrap);

    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rH = readout(row, 'surprise heads', C.purple);
    var rT = readout(row, 'surprise tails', C.orange);
    var rE = readout(row, 'entropy H');

    var p = 0.5, raf = 0, sl;
    function update(v) {
      p = clamp(v, 0, 1);
      var h = coinH(p), a = term(p, p), b = term(1 - p, 1 - p);
      dot.setAttribute('cx', P.X(p)); dot.setAttribute('cy', P.Y(h));
      drop.setAttribute('x1', P.X(p)); drop.setAttribute('x2', P.X(p));
      drop.setAttribute('y1', P.Y(0)); drop.setAttribute('y2', P.Y(h));
      segH.style.width = (a / LN2 * 100) + '%';
      segT.style.width = (b / LN2 * 100) + '%';
      cap.textContent = 'H = ' + f2(p) + ' × ' + f2(surprise(p)) + '  +  ' + f2(1 - p) + ' × ' + f2(surprise(1 - p)) + '  =  ' + f2(a) + ' + ' + f2(b) + '  =  ' + f2(h) + '   (full bar = log 2 ≈ 0.69)';
      rH(f2(surprise(p))); rT(f2(surprise(1 - p))); rE(f2(h));
    }
    sl = M4.slider(wrap, { min: 0, max: 1, step: 0.01, value: 0.5, label: 'p (heads)', format: function (v) { return Number(v).toFixed(2); }, onInput: function (v) { cancelAnimationFrame(raf); update(Number(v)); } });

    function animateTo(target) {
      cancelAnimationFrame(raf);
      var from = p, t0 = null;
      function tick(ts) {
        if (t0 === null) t0 = ts;
        var u = clamp((ts - t0) / 600, 0, 1), e = u * u * (3 - 2 * u);
        var v = Math.round((from + (target - from) * e) * 1000) / 1000;
        if (u >= 1) v = target;
        sl.set(v); update(v);
        if (u < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }
    var btns = M4.el('div', { class: 'm4-row' }, wrap);
    M4.button(btns, 'Fair coin  p = 0.5', function () { animateTo(0.5); });
    M4.button(btns, 'Biased coin  p = 0.9', function () { animateTo(0.9); });
    M4.button(btns, 'Always heads  p = 1', function () { animateTo(1); });
    update(0.5);
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
  }

  /* ================= STEP 4: exercise, slide to entropy 0.33 ================= */
  function mountEntropyTarget(el, ctx) {
    css();
    var TARGET = 0.33, TOL = 0.03;
    var wrap = M4.el('div', { class: 'l2-s4-wrap' }, el);
    var bar = M4.el('div', { class: 'l2-s4-bar' }, wrap);
    var seg = M4.el('div', { class: 'l2-s4-seg', style: 'background:' + C.purple }, bar);
    M4.el('div', { class: 'l2-s4-mark', style: 'left:' + (TARGET / LN2 * 100) + '%' }, bar);
    M4.el('div', { class: 'l2-s4-cap', text: 'Entropy meter from 0 to log 2 ≈ 0.69. The dashed line marks the target 0.33.' }, wrap);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rA = readout(row, 'surprise heads', C.purple);
    var rB = readout(row, 'surprise tails', C.orange);
    var rE = readout(row, 'entropy H');
    var p = 0.5, done = false;
    function update(v) {
      p = clamp(Number(v), 0, 1);
      var h = coinH(p);
      seg.style.width = (h / LN2 * 100) + '%';
      seg.style.background = Math.abs(h - TARGET) <= TOL ? C.green : C.purple;
      rA(f2(surprise(p))); rB(f2(surprise(1 - p))); rE(f2(h));
    }
    M4.slider(wrap, { min: 0, max: 1, step: 0.01, value: 0.5, label: 'p (heads)', format: function (v) { return Number(v).toFixed(2); }, onInput: update });
    var row2 = M4.el('div', { class: 'm4-row' }, wrap);
    M4.button(row2, 'Check', function () {
      if (done) return;
      var h = coinH(p);
      if (Math.abs(h - TARGET) <= TOL) {
        done = true;
        bar.classList.add('m4-pop');
        ctx.note('With \\(p = ' + p.toFixed(2) + '\\) the entropy is \\(' + h.toFixed(2) + '\\). The lecture\'s biased coin has \\(p = 0.9\\): \\(0.9 \\cdot 0.105 + 0.1 \\cdot 2.303 \\approx 0.33\\).');
        ctx.solved();
      } else if (h > TARGET) {
        ctx.wrong('The entropy is ' + h.toFixed(2) + ', above 0.33. The coin is still too unpredictable. Move p further away from 0.5.');
      } else {
        ctx.wrong('The entropy is ' + h.toFixed(2) + ', below 0.33. The coin is now too predictable. Move p back towards 0.5.');
      }
    }, { primary: true });
    update(0.5);
  }

  /* ================= STEP 5: exercise, simplex, maximise entropy ================= */
  function mountSimplex(el, ctx) {
    css();
    var W = 600, H = 500;
    var A = { x: 100, y: 420 }, B = { x: 500, y: 420 }, Cc = { x: 300, y: 420 - 400 * Math.sqrt(3) / 2 };
    var wrap = M4.el('div', { class: 'l2-s4-wrap' }, el);
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'l2-s4-svg' }, wrap);
    S('polygon', { points: A.x + ',' + A.y + ' ' + B.x + ',' + B.y + ' ' + Cc.x + ',' + Cc.y, fill: '#f4f1ff', stroke: C.purple, 'stroke-width': 4, 'stroke-linejoin': 'round' }, svg);
    S('text', { x: A.x - 6, y: A.y + 36, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: C.blue }, svg, 'cat 100%');
    S('text', { x: B.x + 6, y: B.y + 36, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: C.pink }, svg, 'dog 100%');
    S('text', { x: Cc.x, y: Cc.y - 18, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: C.orange }, svg, 'bird 100%');
    var cen = { x: (A.x + B.x + Cc.x) / 3, y: (A.y + B.y + Cc.y) / 3 };
    var ring = S('circle', { cx: cen.x, cy: cen.y, r: 24, fill: C.green, 'fill-opacity': 0, stroke: C.green, 'stroke-width': 3, 'stroke-opacity': 0 }, svg);
    var la = S('line', { stroke: C.blue, 'stroke-width': 3, 'stroke-dasharray': '4 6' }, svg);
    var lb = S('line', { stroke: C.pink, 'stroke-width': 3, 'stroke-dasharray': '4 6' }, svg);
    var lc = S('line', { stroke: C.orange, 'stroke-width': 3, 'stroke-dasharray': '4 6' }, svg);
    var hg = S('g', { class: 'l2-s4-grab' }, svg);
    S('circle', { r: 30, fill: 'transparent' }, hg);
    var knob = S('circle', { r: 15, fill: C.purple, stroke: '#fff', 'stroke-width': 4 }, hg);

    var bar = M4.el('div', { class: 'l2-s4-bar' }, wrap);
    var seg = M4.el('div', { class: 'l2-s4-seg', style: 'background:' + C.purple }, bar);
    M4.el('div', { class: 'l2-s4-cap', text: 'Entropy meter from 0 to log 3 ≈ 1.10.' }, wrap);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rc = readout(row, 'cat', C.blue), rd = readout(row, 'dog', C.pink), rb = readout(row, 'bird', C.orange), rh = readout(row, 'entropy H');

    var q = [0.82, 0.15, 0.03], done = false, pos = { x: 0, y: 0 }, start = null, sc = 1;
    var names = ['cat', 'dog', 'bird'];
    function toXY(w) { return { x: w[0] * A.x + w[1] * B.x + w[2] * Cc.x, y: w[0] * A.y + w[1] * B.y + w[2] * Cc.y }; }
    function toBary(x, y) {
      var c = (A.y - y) / (A.y - Cc.y);
      var b = ((x - A.x) - c * (Cc.x - A.x)) / (B.x - A.x);
      var w = [1 - b - c, b, c], k, s;
      for (k = 0; k < 2; k++) {
        w = w.map(function (v) { return Math.max(0, v); });
        s = w[0] + w[1] + w[2];
        w = w.map(function (v) { return v / s; });
      }
      return w;
    }
    function draw() {
      pos = toXY(q);
      hg.setAttribute('transform', 'translate(' + pos.x + ',' + pos.y + ')');
      [[la, A], [lb, B], [lc, Cc]].forEach(function (pr) {
        pr[0].setAttribute('x1', pos.x); pr[0].setAttribute('y1', pos.y);
        pr[0].setAttribute('x2', pr[1].x); pr[0].setAttribute('y2', pr[1].y);
      });
      var h = entropy(q);
      seg.style.width = (h / LN3 * 100) + '%';
      rc(f2(q[0])); rd(f2(q[1])); rb(f2(q[2])); rh(f2(h));
      return h;
    }
    function check(h) {
      if (done) return;
      if (h >= 1.085) {
        done = true;
        seg.style.background = C.green;
        knob.setAttribute('fill', C.green);
        ring.setAttribute('fill-opacity', 0.25); ring.setAttribute('stroke-opacity', 1);
        ctx.note('At the centre every class has probability \\(\\tfrac13\\) and \\(H = \\log 3 \\approx 1.10\\), the largest value three outcomes allow.');
        ctx.solved();
      } else {
        var i = q.indexOf(Math.max(q[0], q[1], q[2]));
        ctx.note('Entropy ' + h.toFixed(2) + '. The class ' + names[i] + ' still holds ' + q[i].toFixed(2) + ' of the probability. Move away from the ' + names[i] + ' corner.');
      }
    }
    M4.drag(hg, {
      onStart: function () { start = { x: pos.x, y: pos.y }; sc = vbScale(svg, W); },
      onMove: function (dx, dy) {
        if (!start) return;
        q = toBary(start.x + dx * sc, start.y + dy * sc);
        check(draw());
      },
      onEnd: function () { start = null; }
    });
    draw();
    ctx.note('The point starts at the lecture\'s prediction: cat 0.82, dog 0.15, bird 0.03.');
  }

  /* ================= STEP 6: explore, cross-entropy of a coin ================= */
  function mountCrossEntropy(el, ctx) {
    css();
    var wrap = M4.el('div', { class: 'l2-s4-wrap' }, el);
    var P = plot(wrap, { xmin: 0, xmax: 1, ymin: 0, ymax: 3, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 1, 2, 3], xlabel: 'q = model probability of heads', ylabel: 'average surprise' });
    var hline = S('line', { stroke: C.green, 'stroke-width': 3, 'stroke-dasharray': '8 6' }, P.g);
    var hlab = S('text', { 'font-size': 15, 'font-weight': 700, fill: C.green, 'text-anchor': 'middle' }, P.g, 'entropy H(p)');
    var curve = S('path', { fill: 'none', stroke: C.purple, 'stroke-width': 4, 'stroke-linecap': 'round' }, P.g);
    var gap = S('line', { stroke: C.pink, 'stroke-width': 5, 'stroke-linecap': 'round' }, P.g);
    var dot = S('circle', { r: 10, fill: C.orange, stroke: '#fff', 'stroke-width': 3 }, P.g);
    var cap = M4.el('div', { class: 'l2-s4-cap' }, wrap);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var r1 = readout(row, 'entropy H(p)', C.green);
    var r2 = readout(row, 'cross-entropy H(p, q)', C.purple);
    var r3 = readout(row, 'extra surprise', C.pink);
    var p = 0.9, q = 0.5, sp, sq;
    function update() {
      var h = coinH(p), ce = coinCE(p, q);
      curve.setAttribute('d', curveD(P, function (x) { return coinCE(p, x); }, 0.005, 0.995, 240));
      hline.setAttribute('x1', P.X(0)); hline.setAttribute('x2', P.X(1));
      hline.setAttribute('y1', P.Y(h)); hline.setAttribute('y2', P.Y(h));
      // label sits inside the widest free band: below the line when the line is high, otherwise above the curve's valley is avoided by placing it at the opposite side of p
      hlab.setAttribute('x', P.X(p < 0.5 ? 0.78 : 0.22));
      hlab.setAttribute('y', P.Y(h) + (h > 0.25 ? 20 : -10));
      var cy = Math.min(ce, 3);
      dot.setAttribute('cx', P.X(q)); dot.setAttribute('cy', P.Y(cy));
      gap.setAttribute('x1', P.X(q)); gap.setAttribute('x2', P.X(q));
      gap.setAttribute('y1', P.Y(cy)); gap.setAttribute('y2', P.Y(h));
      cap.textContent = 'H(p, q) = ' + f2(p) + ' × ' + f2(surprise(q)) + '  +  ' + f2(1 - p) + ' × ' + f2(surprise(1 - q)) + '  =  ' + f2(ce);
      r1(f2(h)); r2(f2(ce)); r3(f2(Math.max(0, ce - h)));
    }
    sp = M4.slider(wrap, { min: 0, max: 1, step: 0.01, value: 0.9, label: 'truth p (heads)', format: function (v) { return Number(v).toFixed(2); }, onInput: function (v) { p = Number(v); update(); } });
    sq = M4.slider(wrap, { min: 0.01, max: 0.99, step: 0.01, value: 0.5, label: 'model q (heads)', format: function (v) { return Number(v).toFixed(2); }, onInput: function (v) { q = Number(v); update(); } });
    var btns = M4.el('div', { class: 'm4-row' }, wrap);
    M4.button(btns, 'Biased coin  p = 0.9', function () { p = 0.9; sp.set(0.9); update(); });
    M4.button(btns, 'One-hot truth  p = 1', function () { p = 1; sp.set(1); update(); });
    M4.button(btns, 'Set q = p', function () { q = clamp(p, 0.01, 0.99); sq.set(q); update(); });
    update();
  }

  /* ================= STEP 7: exercise, one-hot weights (tokens) ================= */
  function mountOneHot(el, ctx) {
    css();
    var wrap = M4.el('div', { class: 'l2-s4-wrap' }, el);
    M4.el('div', { class: 'l2-s4-cap', html: 'Photo of a <b>dog</b>. Model prediction: cat 0.82, dog 0.15, bird 0.03. Fill in the truth weights \\(p_i\\).' }, wrap);
    var eq = M4.el('div', { class: 'l2-s4-eq' }, wrap);
    var data = [['cat', 0.82, C.blue], ['dog', 0.15, C.pink], ['bird', 0.03, C.orange]];
    var slots = [];
    data.forEach(function (d, i) {
      if (i > 0) M4.el('div', { class: 'l2-s4-plus', text: '+' }, eq);
      var t = M4.el('div', { class: 'l2-s4-term' }, eq);
      M4.el('div', { class: 'l2-s4-tag', text: d[0], style: 'color:' + d[2] }, t);
      var r = M4.el('div', { class: 'l2-s4-termrow' }, t);
      slots.push(M4.el('div', { class: 'm4-slot l2-s4-slot' }, r));
      M4.el('span', { html: M4.tex('\\cdot\\,(-\\log ' + d[1] + ')') }, r);
      M4.el('div', { class: 'l2-s4-cap', text: 'surprise ' + f2(surprise(d[1])) }, t);
    });
    var tray = M4.el('div', { class: 'l2-s4-tray' }, wrap);
    var tokens = ['0', '0.82', '1', '0.15', '0'].map(function (v) {
      var t = M4.el('div', { class: 'm4-token l2-s4-tok', text: v }, tray);
      t.setAttribute('data-v', v);
      return t;
    });
    var result = M4.el('div', { class: 'm4-row' }, wrap);
    var rr = readout(result, 'H(p, q) =', C.purple);
    rr('?');
    var done = false;
    var dd = makeDD(tray, tokens, slots, function () {
      if (done) return;
      var vals = slots.map(dd.value), sum = 0, full = true;
      vals.forEach(function (v, i) { if (v === null) full = false; else sum += Number(v) * surprise(data[i][1]); });
      rr(full ? f2(sum) : '?');
    });
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    M4.button(row, 'Reset', function () { if (!done) { dd.reset(); rr('?'); } });
    M4.button(row, 'Check', function () {
      if (done) return;
      var v = slots.map(dd.value);
      if (v.indexOf(null) >= 0) { ctx.wrong('Each of the three slots needs a weight.'); return; }
      if (v[0] === '0' && v[1] === '1' && v[2] === '0') {
        done = true;
        slots.forEach(function (s) { s.classList.add('l2-s4-ok'); });
        eq.classList.add('m4-pop');
        ctx.note('Only the dog term survives: \\(H(p,q) = -\\log 0.15 \\approx 1.90\\), the negative log-likelihood of the true class.');
        ctx.solved();
        return;
      }
      if (v.indexOf('0.82') >= 0 || v.indexOf('0.15') >= 0) {
        ctx.wrong('0.82 and 0.15 are model probabilities q. The weights come from the truth p, which knows only that the photo shows a dog.');
      } else if (v[1] !== '1') {
        ctx.wrong('The true class is dog, so the full weight 1 belongs to the dog term.');
      } else {
        ctx.wrong('The weights of a distribution sum to 1. With weight 1 on dog, the other classes receive 0.');
      }
    }, { primary: true });
  }

  /* ================= STEP 8: exercise, drag bars until loss <= 0.20 ================= */
  function mountBars(el, ctx) {
    css();
    var W = 640, H = 420, BASE = 350, TOP = 60, BH = BASE - TOP, BW = 100;
    var wrap = M4.el('div', { class: 'l2-s4-wrap' }, el);
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'l2-s4-svg' }, wrap);
    var cols = [{ n: 'cat', x: 120, c: C.blue }, { n: 'dog (true class)', x: 320, c: C.purple }, { n: 'bird', x: 520, c: C.orange }];
    var q = [0.82, 0.15, 0.03], done = false, TQ = 0.82;
    S('line', { x1: 40, y1: BASE, x2: W - 40, y2: BASE, stroke: C.ink, 'stroke-width': 2 }, svg);
    S('line', { x1: 40, y1: TOP, x2: W - 40, y2: TOP, stroke: C.line, 'stroke-width': 1, 'stroke-dasharray': '4 4' }, svg);
    S('text', { x: 44, y: TOP - 8, 'font-size': 15, fill: C.muted }, svg, 'probability 1');
    // ghost target on the dog bar
    var gy = BASE - TQ * BH;
    var ghost = S('rect', { x: cols[1].x - BW / 2, y: gy, width: BW, height: TQ * BH, rx: 10, fill: C.green, 'fill-opacity': 0.1, stroke: C.green, 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg);
    S('text', { x: cols[1].x + BW / 2 + 10, y: gy + 5, 'font-size': 15, 'font-weight': 700, fill: C.green }, svg, 'loss 0.20');
    var parts = cols.map(function (c, i) {
      var rect = S('rect', { x: c.x - BW / 2, width: BW, rx: 10, fill: c.c }, svg);
      S('text', { x: c.x, y: BASE + 30, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: c.c }, svg, c.n);
      var val = S('text', { x: c.x, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: C.ink }, svg, '');
      var g = S('g', { class: 'l2-s4-grab' }, svg);
      S('rect', { x: -BW / 2, y: -30, width: BW, height: 60, fill: 'transparent' }, g);
      S('circle', { r: 13, fill: '#fff', stroke: c.c, 'stroke-width': 5 }, g);
      var q0 = 0, sc = 1;
      M4.drag(g, {
        onStart: function () { q0 = q[i]; sc = vbScale(svg, W); },
        onMove: function (dx, dy) { setQ(i, q0 - dy * sc / BH); }
      });
      return { rect: rect, val: val, g: g };
    });
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rq = readout(row, 'q dog', C.purple);
    var rl = readout(row, 'loss  −log q dog');
    function setQ(i, v) {
      v = clamp(v, 0.01, 0.98);
      var rest = 0, k;
      for (k = 0; k < 3; k++) if (k !== i) rest += q[k];
      for (k = 0; k < 3; k++) if (k !== i) q[k] = rest > 1e-9 ? q[k] / rest * (1 - v) : (1 - v) / 2;
      q[i] = v;
      draw(true);
    }
    function draw(live) {
      parts.forEach(function (p, i) {
        var h = Math.max(q[i] * BH, 2), y = BASE - h;
        p.rect.setAttribute('y', y); p.rect.setAttribute('height', h);
        p.g.setAttribute('transform', 'translate(' + cols[i].x + ',' + y + ')');
        p.val.setAttribute('y', y - 24); p.val.textContent = f2(q[i]);
      });
      var loss = surprise(q[1]);
      rq(f2(q[1])); rl(f2(loss));
      if (!live || done) return;
      if (loss < 0.205) {
        done = true;
        ghost.setAttribute('fill-opacity', 0.3);
        parts[1].rect.setAttribute('fill', C.green);
        ctx.note('With \\(q_{\\text{dog}} = ' + q[1].toFixed(2) + '\\) the loss is \\(' + loss.toFixed(2) + '\\). Raising the probability of the true class necessarily lowered the others, since the three sum to 1.');
        ctx.solved();
      } else {
        ctx.note('Loss ' + loss.toFixed(2) + ': the model assigns the true class dog a probability of ' + q[1].toFixed(2) + (q[1] < 0.5 ? ' and is still surprised by the label.' : '; the target loss 0.20 needs more.'));
      }
    }
    draw(false);
    ctx.note('Starting loss: \\(-\\log 0.15 \\approx 1.90\\). Drag the top of a bar.');
  }

  /* ================= STEP 9: exercise, summary table matching ================= */
  function mountTable(el, ctx) {
    css();
    var wrap = M4.el('div', { class: 'l2-s4-wrap' }, el);
    var table = M4.el('div', { class: 'l2-s4-table' }, wrap);
    M4.el('div', { class: 'l2-s4-th', text: 'Output' }, table);
    M4.el('div', { class: 'l2-s4-th', text: 'Assumed distribution' }, table);
    M4.el('div', { class: 'l2-s4-th l2-s4-h3', text: 'Negative log-likelihood' }, table);
    var rows = [['A number', 'Gaussian', 'mse'], ['Yes / no', 'Bernoulli', 'bce'], ['One of K', 'Categorical', 'ce']];
    var slots = rows.map(function (r) {
      M4.el('div', { class: 'l2-s4-td', text: r[0] }, table);
      M4.el('div', { class: 'l2-s4-td', text: r[1] }, table);
      var s = M4.el('div', { class: 'm4-slot l2-s4-slot l2-s4-wide' }, table);
      s.setAttribute('data-want', r[2]);
      return s;
    });
    var tray = M4.el('div', { class: 'l2-s4-tray' }, wrap);
    var labels = { ce: 'cross-entropy', mse: 'MSE', bce: 'binary cross-entropy' };
    var tokens = ['ce', 'mse', 'bce'].map(function (k) {
      var t = M4.el('div', { class: 'm4-token l2-s4-tok', text: labels[k] }, tray);
      t.setAttribute('data-v', k);
      return t;
    });
    var done = false, timers = [];
    var dd = makeDD(tray, tokens, slots, function () {
      if (done) return;
      var vals = slots.map(dd.value);
      if (vals.indexOf(null) >= 0) { ctx.note('Placed ' + vals.filter(function (v) { return v !== null; }).length + ' of 3.'); return; }
      var bad = [];
      slots.forEach(function (s, i) { if (vals[i] !== s.getAttribute('data-want')) bad.push(i); });
      if (!bad.length) {
        done = true;
        slots.forEach(function (s) { s.classList.add('l2-s4-ok'); });
        table.classList.add('m4-pop');
        ctx.note('One recipe in all three rows: choose a distribution for the output and take \\(-\\log\\) of its likelihood.');
        ctx.solved();
        return;
      }
      var first = bad[0];
      ctx.wrong(labels[vals[first]] + ' is not the negative log-likelihood of the ' + rows[first][1] + ' distribution. The misplaced tiles have been returned.');
      bad.forEach(function (i) {
        var s = slots[i], t = s.querySelector('.m4-token');
        s.classList.add('m4-shake');
        timers.push(setTimeout(function () { s.classList.remove('m4-shake'); if (t && t.parentNode === s) dd.home(t); }, 450));
      });
    });
    ctx.onCleanup(function () { timers.forEach(clearTimeout); });
  }

  /* ================= STEP 10: exercise, choices ================= */
  function mountClosedForm(el, ctx) {
    var msgs = [
      '',
      'The sigmoid places the weights inside a nonlinear function, so the equation gradient = 0 cannot be solved for w.',
      'The softmax makes the gradient nonlinear in the weights. Setting it to zero gives no formula for w.',
      'Only one of the three has a closed-form solution. The other two contain a squashing function.'
    ];
    M4.choices(el, {
      options: [
        'Linear regression with MSE',
        'Logistic regression with binary cross-entropy',
        'A softmax classifier with cross-entropy',
        'All three'
      ],
      correct: 0,
      onCorrect: function () {
        ctx.note('For linear regression the gradient is linear in \\(w\\), so gradient \\(= 0\\) can be solved, as in Homework 1. The other models need an iterative method.');
        ctx.solved();
      },
      onWrong: function (i) { ctx.wrong(msgs[i] || 'Not this one.'); }
    });
  }

  /* ================= STEP 11: harder exercise, walk downhill ================= */
  function mountDownhill(el, ctx) {
    css();
    var p = 0.9, q = 0.3, done = false, seen = {};
    var wrap = M4.el('div', { class: 'l2-s4-wrap' }, el);
    var P = plot(wrap, { xmin: 0, xmax: 1, ymin: 0, ymax: 2.4, xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.6, 1.2, 1.8, 2.4], xlabel: 'q = model probability of heads', ylabel: 'loss H(p, q)' });
    var trail = S('g', {}, P.g);
    var hline = S('line', { x1: P.X(0), x2: P.X(1), y1: P.Y(coinH(p)), y2: P.Y(coinH(p)), stroke: C.green, 'stroke-width': 3, 'stroke-dasharray': '8 6', opacity: 0 }, P.g);
    var hlab = S('text', { x: P.X(0.3), y: P.Y(coinH(p)) - 10, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: C.green, opacity: 0 }, P.g, 'entropy H(p) = 0.33');
    var dot = S('circle', { r: 11, fill: C.orange, stroke: '#fff', 'stroke-width': 3 }, P.g);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rq = readout(row, 'q', C.orange);
    var rl = readout(row, 'loss H(p, q)', C.purple);
    var rn = readout(row, 'points tried');
    var count = 0, sl;
    function update(v) {
      q = clamp(Math.round(Number(v) * 100) / 100, 0.1, 0.99);
      var ce = coinCE(p, q), key = q.toFixed(2);
      if (!seen[key]) {
        seen[key] = true; count++;
        S('circle', { cx: P.X(q), cy: P.Y(ce), r: 5, fill: C.purple, 'fill-opacity': 0.55 }, trail);
      }
      dot.setAttribute('cx', P.X(q)); dot.setAttribute('cy', P.Y(ce));
      rq(q.toFixed(2)); rl(ce.toFixed(3)); rn(String(count));
    }
    sl = M4.slider(wrap, { min: 0.1, max: 0.99, step: 0.01, value: 0.3, label: 'model q (heads)', format: function (v) { return Number(v).toFixed(2); }, onInput: function (v) { if (!done) update(v); } });
    var btns = M4.el('div', { class: 'm4-row' }, wrap);
    function stepBy(d) { if (done) return; var v = clamp(Math.round((q + d) * 100) / 100, 0.1, 0.99); sl.set(v); update(v); }
    M4.button(btns, '← step 0.05', function () { stepBy(-0.05); });
    M4.button(btns, 'step 0.05 →', function () { stepBy(0.05); });
    M4.button(btns, 'This is the minimum', function () {
      if (done) return;
      var ce = coinCE(p, q);
      if (Math.abs(q - p) <= 0.0151) {
        done = true;
        dot.setAttribute('fill', C.green);
        hline.setAttribute('opacity', 1); hlab.setAttribute('opacity', 1);
        ctx.note('The loss is smallest at \\(q = p = 0.9\\), where the cross-entropy equals the entropy \\(H(p) \\approx 0.33\\). Minimizing cross-entropy pulls the model distribution onto the true one.');
        ctx.solved();
      } else if (q < p) {
        ctx.wrong('At q = ' + q.toFixed(2) + ' the loss is ' + ce.toFixed(3) + ', but a slightly larger q gives a lower value. Keep walking to the right.');
      } else {
        ctx.wrong('At q = ' + q.toFixed(2) + ' the loss is ' + ce.toFixed(3) + ', but a slightly smaller q gives a lower value. The minimum has been passed.');
      }
    }, { primary: true });
    update(0.3);
  }

  /* ================= lesson ================= */
  M4.lesson({
    id: 'l2-s4',
    module: 'l2',
    title: 'Entropy and cross-entropy',
    summary: 'Entropy as average surprise, cross-entropy as the classification loss, the table linking distributions to losses, and why minimizing needs gradient descent.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'From surprise to entropy',
        html: '<p>The surprise of an outcome with probability \\(p\\) is \\(-\\log p\\), where \\(\\log\\) denotes the natural logarithm: certain outcomes have surprise \\(0\\), rare outcomes have large surprise. Surprise can be averaged in two ways, which gives entropy and cross-entropy. The first average is the <b>entropy</b> of a distribution. The second is the <b>cross-entropy</b> between a true distribution and a model.</p>' +
          '<p>In this lesson you will compute both quantities, explain why the classification loss \\(-\\log q_y\\) is called cross-entropy, match each output type to its distribution and loss, and state why most losses cannot be minimized by a formula.</p>'
      },
      {
        kind: 'text',
        title: 'Entropy',
        html: '<p>Let a distribution assign probability \\(p_i\\) to outcome \\(i\\). Its entropy is the expected surprise, each surprise weighted by how often its outcome happens:</p>' +
          '\\[ H(p) = -\\sum_i p_i \\log p_i . \\]' +
          '<p>For a fair coin both outcomes have surprise \\(-\\log 0.5 \\approx 0.69\\), so \\(H = 0.5 \\cdot 0.69 + 0.5 \\cdot 0.69 \\approx 0.69\\). An outcome with \\(p_i = 0\\) never occurs and contributes \\(0\\) to the sum.</p>'
      },
      {
        kind: 'explore',
        title: 'Entropy of a coin',
        html: '<p>The slider sets the probability \\(p\\) of heads. The bar splits the entropy into the contribution of heads, \\(p \\cdot (-\\log p)\\), and of tails, \\((1-p) \\cdot (-\\log(1-p))\\). The three buttons reproduce the lecture\'s examples: fair coin \\(0.69\\), biased coin \\(0.33\\), always heads \\(0\\). Entropy is largest when both outcomes are equally likely and falls to zero as the coin becomes certain.</p>',
        mount: mountCoinEntropy
      },
      {
        kind: 'exercise',
        title: 'A coin with entropy 0.33',
        html: '<p>Set the probability \\(p\\) of heads so that the entropy of the coin is \\(0.33\\) (within \\(0.03\\)), then press Check. A rare outcome has a large surprise but a small weight.</p>',
        hint: 'The coin must be strongly biased. Try values of p near 0.9, or by symmetry near 0.1.',
        mount: mountEntropyTarget
      },
      {
        kind: 'exercise',
        title: 'Maximal entropy over three classes',
        html: '<p>Every point of the triangle is one probability distribution over the classes cat, dog and bird. A corner puts 100% on one class. Drag the point to the distribution with the largest possible entropy.</p>',
        hint: 'Entropy is largest when all outcomes are equally likely, which is the point equally far from all three corners.',
        mount: mountSimplex
      },
      {
        kind: 'explore',
        title: 'Cross-entropy',
        html: '<p>Cross-entropy uses two distributions: the truth \\(p\\) decides how often each outcome happens, and the model \\(q\\) decides how surprising it finds that outcome:</p>' +
          '\\[ H(p, q) = -\\sum_i p_i \\log q_i . \\]' +
          '<p>The purple curve shows \\(H(p,q)\\) for a coin as the model probability \\(q\\) varies. The dashed line is the entropy \\(H(p)\\). The curve touches the line only at \\(q = p\\): a model that disagrees with the truth is, on average, more surprised than necessary.</p>',
        mount: mountCrossEntropy
      },
      {
        kind: 'exercise',
        title: 'A single true label',
        html: '<p>In classification each training example has one true label, so the true distribution \\(p\\) is one-hot: probability \\(1\\) on the true class and \\(0\\) elsewhere. Drag the correct weights \\(p_i\\) into the cross-entropy sum for a photo of a dog, then press Check.</p>',
        hint: 'The weights describe the truth, not the model. The photo certainly shows a dog, so dog receives weight 1.',
        mount: mountOneHot
      },
      {
        kind: 'exercise',
        title: 'Lowering the loss',
        html: '<p>With a one-hot truth only one term remains: \\(H(p,q) = -\\log q_y\\), where \\(q_y\\) is the model probability of the true class \\(y\\). This is the negative log-likelihood of the categorical distribution. The bars show the model\'s prediction for a dog photo. Change the prediction until the loss is at most \\(0.20\\).</p>',
        hint: 'The loss depends only on the dog bar. Since −log 0.82 ≈ 0.20, the dog probability must reach about 0.82.',
        mount: mountBars
      },
      {
        kind: 'exercise',
        title: 'The summary table',
        html: '<p>Every loss of this lecture follows one recipe: choose a distribution for the output, then take \\(-\\log\\) of its likelihood. Drag each loss to the row whose distribution produces it.</p>',
        hint: 'Gaussian noise on a number leads to squared errors. Two outcomes give the binary form. K outcomes give the general form.',
        mount: mountTable
      },
      {
        kind: 'exercise',
        title: 'Closed-form minima',
        html: '<p>A loss is minimized where its gradient with respect to the weights \\(w\\) is zero. For which model can the equation "gradient \\(= 0\\)" be solved for \\(w\\) in closed form?</p>',
        hint: 'A closed form requires the gradient to be linear in w. A sigmoid or a softmax between the weights and the loss destroys that linearity.',
        mount: mountClosedForm
      },
      {
        kind: 'exercise',
        title: 'Descent without a formula',
        html: '<p>The true coin is the biased coin with \\(p = 0.9\\). Here the loss curve is hidden: only the loss \\(H(p,q)\\) at the current model probability \\(q\\) is shown, and each tried value leaves a dot. Find the value of \\(q\\) with the smallest loss by moving step by step in the direction in which the loss falls, then confirm it.</p>',
        hint: 'Take large steps while the loss falls, then use the slider for steps of 0.01. Stop where both neighbouring values give a higher loss.',
        mount: mountDownhill
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li><b>Entropy</b> \\(H(p) = -\\sum_i p_i \\log p_i\\) is the average surprise of a distribution: \\(0.69\\) for a fair coin, \\(0.33\\) for the biased coin, \\(0\\) for a certain outcome, and largest when all outcomes are equally likely.</li>' +
          '<li><b>Cross-entropy</b> \\(H(p,q) = -\\sum_i p_i \\log q_i\\) weights the model\'s surprise by the truth. For a one-hot label it reduces to \\(-\\log q_y\\), the negative log-likelihood, for example \\(-\\log 0.15 \\approx 1.90\\).</li>' +
          '<li><b>One recipe</b>: Gaussian gives MSE, Bernoulli gives binary cross-entropy, categorical gives cross-entropy. Only linear regression with MSE can be solved by setting the gradient to zero. The other losses are minimized step by step with gradient descent, the topic of Lecture 3.</li>' +
          '</ul>'
      }
    ]
  });
})();
