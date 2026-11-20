(function () {
  'use strict';

  var M4 = window.M4;
  var C = (M4 && M4.colors) || {};
  var PURPLE = C.purple || '#7a5cff';
  var ORANGE = C.orange || '#ff8a1f';
  var GREEN = C.green || '#16b56b';
  var BLUE = C.blue || '#2f6bff';
  var PINK = C.pink || '#ef4b8b';
  var INK = C.ink || '#1d1d1f';
  var MUTED = C.muted || '#6b6f76';
  var LINE = C.line || '#e6e4dd';

  // ---------- local helpers ----------

  function injectStyle() {
    if (document.getElementById('l2-s1-style')) return;
    var s = document.createElement('style');
    s.id = 'l2-s1-style';
    s.textContent = [
      '.l2-s1-svg{display:block;width:100%;height:auto;background:#fff;border:2px solid ' + LINE + ';border-radius:18px;touch-action:pan-y;user-select:none;-webkit-user-select:none}',
      '.l2-s1-svg text{font-family:Inter,system-ui,sans-serif}',
      '.l2-s1-knob{cursor:grab;touch-action:none}',
      '.l2-s1-knob:active{cursor:grabbing}',
      '.l2-s1-bar{margin:14px 0 6px}',
      '.l2-s1-table{border-collapse:collapse;margin:6px auto 18px;font-size:18px;font-variant-numeric:tabular-nums}',
      '.l2-s1-table th,.l2-s1-table td{padding:9px 18px;text-align:right;border-bottom:2px solid ' + LINE + '}',
      '.l2-s1-table th{color:' + MUTED + ';font-weight:600;font-size:15px}',
      '.l2-s1-table td:first-child,.l2-s1-table th:first-child{text-align:left}',
      '.l2-s1-pool{min-height:64px;margin:6px 0 16px;justify-content:center}',
      '.m4-slot.l2-s1-bin{width:auto;height:auto;min-height:230px;display:flex;flex-direction:column;align-items:stretch;gap:10px;padding:14px;box-sizing:border-box}',
      '.l2-s1-binhead{font-weight:700;font-size:18px;text-align:center;pointer-events:none}',
      '.l2-s1-binsub{font-size:15px;color:' + MUTED + ';text-align:center;pointer-events:none;margin-top:-6px}',
      '.l2-s1-tok{font-size:16px;line-height:1.35;padding:10px 14px;max-width:300px;text-align:center}',
      '.l2-s1-tok.l2-s1-locked{pointer-events:none;cursor:default;border-color:' + GREEN + ';background:#effaf4;max-width:none}',
      '.l2-s1-meter{height:16px;border-radius:999px;background:' + LINE + ';overflow:hidden;margin:12px 0 4px}',
      '.l2-s1-meter>div{height:100%;width:0;border-radius:999px;background:' + PURPLE + ';transition:width .08s linear,background .2s}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function S(tag, attrs, parent, text) {
    var n = M4.svg(tag, attrs || {}, parent);
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function gauss(y, mu, s) {
    var z = (y - mu) / s;
    return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI));
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function snap(v, step) { return Math.round(v / step) * step; }

  var SUP = { '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079', '-': '\u207b' };
  function sci(v) {
    if (!(v > 0)) return '0';
    var e = Math.floor(Math.log(v) / Math.LN10);
    var m = v / Math.pow(10, e);
    if (m >= 9.995) { m = 1; e += 1; }
    return m.toFixed(2) + ' \u00d7 10' + String(e).split('').map(function (c) { return SUP[c] || c; }).join('');
  }
  function milli(d) { return (d * 1000).toFixed(2) + ' \u00d7 10\u207b\u00b3'; }

  function pill(parent) {
    return M4.el('span', { class: 'm4-readout' }, parent);
  }

  // A chart with a horizontal euro axis from xmin to xmax and a vertical scale 0..ymax.
  function chart(parent, o) {
    var W = 680, H = o.height || 340;
    var ml = 28, mr = 28, mt = o.top || 44, mb = 42;
    var xmin = o.xmin === undefined ? 800 : o.xmin;
    var xmax = o.xmax === undefined ? 1800 : o.xmax;
    var ymax = o.ymax;
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'l2-s1-svg' }, parent);
    var base = H - mb;
    function X(v) { return ml + (v - xmin) / (xmax - xmin) * (W - ml - mr); }
    function Y(d) { return Math.max(6, base - (d / ymax) * (base - mt)); }
    var t;
    for (t = xmin; t <= xmax + 1e-9; t += 100) {
      S('line', { x1: X(t), y1: mt - 10, x2: X(t), y2: base, stroke: LINE, 'stroke-width': 1 }, svg);
    }
    S('line', { x1: ml - 8, y1: base, x2: W - mr + 8, y2: base, stroke: INK, 'stroke-width': 2 }, svg);
    for (t = xmin; t <= xmax + 1e-9; t += 200) {
      S('line', { x1: X(t), y1: base, x2: X(t), y2: base + 6, stroke: INK, 'stroke-width': 2 }, svg);
      S('text', { x: X(t), y: base + 28, 'text-anchor': 'middle', 'font-size': 15, fill: MUTED }, svg, t + ' \u20ac');
    }
    if (o.title) {
      S('text', { x: ml, y: 22, 'font-size': 15, 'font-weight': 600, fill: MUTED }, svg, o.title);
    }
    var layer = S('g', {}, svg);
    function curveD(f, closed) {
      var n = 170, d = '', i, x;
      for (i = 0; i <= n; i++) {
        x = xmin + (xmax - xmin) * i / n;
        d += (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(f(x)).toFixed(1);
      }
      if (closed) d += 'L' + X(xmax).toFixed(1) + ' ' + base + 'L' + X(xmin).toFixed(1) + ' ' + base + 'Z';
      return d;
    }
    return { svg: svg, g: layer, W: W, H: H, X: X, Y: Y, base: base, top: mt, xmin: xmin, xmax: xmax, perPx: (xmax - xmin) / (W - ml - mr), curveD: curveD };
  }

  function knob(parent, color) {
    var g = S('g', { class: 'l2-s1-knob' }, parent);
    S('circle', { r: 26, fill: 'transparent' }, g);
    S('circle', { r: 12, fill: color, stroke: '#fff', 'stroke-width': 3 }, g);
    return g;
  }
  function place(node, x, y) { node.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'); }

  // Horizontal drag in chart units.
  function hdrag(node, ch, get, set, end) {
    var start = 0;
    M4.drag(node, {
      onStart: function () { start = get(); },
      onMove: function (dx) {
        var r = ch.svg.getBoundingClientRect();
        var k = r.width ? ch.W / r.width : 1;
        set(start + dx * k * ch.perPx);
      },
      onEnd: function () { if (end) end(); }
    });
  }

  // ---------- step mounts ----------

  // Step 3: mean squared error of three predictions.
  function mountMSE(el, ctx) {
    injectStyle();
    var rows = [['A', 1000, 800], ['B', 900, 1000], ['C', 1200, 1300]];
    var table = M4.el('table', { class: 'l2-s1-table' }, el);
    var head = M4.el('tr', {}, table);
    ['Flat', 'Prediction', 'Measured rent', 'Error'].forEach(function (h) { M4.el('th', { text: h }, head); });
    rows.forEach(function (r) {
      var tr = M4.el('tr', {}, table);
      var e = r[1] - r[2];
      M4.el('td', { text: r[0] }, tr);
      M4.el('td', { text: r[1] + ' \u20ac' }, tr);
      M4.el('td', { text: r[2] + ' \u20ac' }, tr);
      M4.el('td', { text: (e > 0 ? '+' : '\u2212') + Math.abs(e) + ' \u20ac', style: 'font-weight:700;color:' + (e > 0 ? PURPLE : ORANGE) }, tr);
    });
    var row = M4.el('div', { class: 'm4-row' }, el);
    M4.numberInput(row, {
      answer: 20000, tolerance: 1, placeholder: 'e.g. 12345', label: 'Mean squared error',
      onCorrect: function () {
        ctx.note('\\( \\tfrac{1}{3}\\,(200^2 + 100^2 + 100^2) = \\tfrac{60000}{3} = 20000 \\). The signed errors sum to zero, yet the squared errors do not.');
        ctx.solved();
      },
      onWrong: function (v) {
        var x = Number(v);
        if (Math.abs(x) < 1e-9) ctx.wrong('The signed errors sum to zero, but each error has to be squared before averaging.');
        else if (Math.abs(x - 60000) < 1) ctx.wrong('60000 is the sum of the squared errors. The mean divides it by the number of flats.');
        else if (Math.abs(x - 400 / 3) < 0.7) ctx.wrong('That is the mean absolute error. Square each error first.');
        else if (Math.abs(x - 400) < 1) ctx.wrong('That is the sum of the absolute errors. Square each error, then average.');
        else ctx.wrong('Square each of the three errors, add the squares, and divide by 3.');
      }
    });
  }

  // Step 4: complete a categorical distribution by dragging the third bar.
  function mountBars(el, ctx) {
    injectStyle();
    var W = 680, H = 400, base = 330, top = 50, full = base - top;
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'l2-s1-svg' }, el);
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      var y = base - v * full;
      S('line', { x1: 70, y1: y, x2: W - 40, y2: y, stroke: v === 0 ? INK : LINE, 'stroke-width': v === 0 ? 2 : 1 }, svg);
      S('text', { x: 60, y: y + 5, 'text-anchor': 'end', 'font-size': 15, fill: MUTED }, svg, v.toFixed(2));
    });
    var cx = [200, 370, 540], bw = 104;
    var names = ['cat', 'dog', 'bird'], vals = [0.82, 0.15, 0.30], cols = [PURPLE, BLUE, ORANGE];
    var rects = [], labels = [];
    names.forEach(function (n, i) {
      rects.push(S('rect', { x: cx[i] - bw / 2, width: bw, rx: 10, fill: cols[i], opacity: i < 2 ? 0.8 : 1 }, svg));
      labels.push(S('text', { x: cx[i], 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 700, fill: cols[i] }, svg));
      S('text', { x: cx[i], y: base + 30, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 600, fill: INK }, svg, n);
      if (i < 2) S('text', { x: cx[i], y: base + 52, 'text-anchor': 'middle', 'font-size': 15, fill: MUTED }, svg, 'fixed');
    });
    S('text', { x: cx[2], y: base + 52, 'text-anchor': 'middle', 'font-size': 15, fill: MUTED }, svg, 'drag the top');
    var k = knob(svg, ORANGE);

    var row = M4.el('div', { class: 'm4-row', style: 'margin-top:14px' }, el);
    var done = false;
    M4.button(row, '\u2212 0.01', function () { setBird(vals[2] - 0.01); check(); });
    var sumPill = pill(row);
    M4.button(row, '+ 0.01', function () { setBird(vals[2] + 0.01); check(); });

    function draw() {
      vals.forEach(function (v, i) {
        var h = Math.max(2, v * full);
        rects[i].setAttribute('y', base - h);
        rects[i].setAttribute('height', h);
        labels[i].setAttribute('y', base - h - (i === 2 ? 24 : 12));
        labels[i].textContent = v.toFixed(2);
      });
      place(k, cx[2], base - vals[2] * full);
      var sum = vals[0] + vals[1] + vals[2];
      sumPill.textContent = 'sum = ' + sum.toFixed(2);
      sumPill.style.color = Math.abs(sum - 1) < 0.005 ? GREEN : '';
    }
    function setBird(v) {
      vals[2] = clamp(snap(v, 0.01), 0, 0.6);
      draw();
    }
    function check() {
      var sum = vals[0] + vals[1] + vals[2];
      if (Math.abs(sum - 1) < 0.005) {
        if (!done) {
          done = true;
          rects[2].setAttribute('fill', GREEN);
          labels[2].setAttribute('fill', GREEN);
          k.lastChild.setAttribute('fill', GREEN);
          rects[2].classList.add('m4-pop');
          ctx.note('\\( 0.82 + 0.15 + 0.03 = 1 \\). The three probabilities now form a distribution over the classes.');
          ctx.solved();
        }
      } else if (!done) {
        ctx.note('The probabilities sum to ' + sum.toFixed(2) + ', which is ' + (sum > 1 ? 'more' : 'less') + ' than 1 by ' + Math.abs(sum - 1).toFixed(2) + '.');
      }
    }
    var start = 0;
    M4.drag(k, {
      onStart: function () { start = vals[2]; },
      onMove: function (dx, dy) {
        var r = svg.getBoundingClientRect();
        var s = r.width ? W / r.width : 1;
        setBird(start - dy * s / full);
      },
      onEnd: function () { check(); }
    });
    draw();
  }

  // Step 5: explore the Gaussian density.
  function mountGaussExplore(el) {
    injectStyle();
    var ch = chart(el, { height: 360, ymax: 0.0106, title: 'density N(y | \u03bc, \u03c3\u00b2) over the rent y' });
    var st = { mu: 1300, s: 100, y: 1350 };
    var band = S('rect', { fill: PURPLE, opacity: 0.1 }, ch.g);
    var area = S('path', { fill: PURPLE, opacity: 0.14 }, ch.g);
    var curve = S('path', { fill: 'none', stroke: PURPLE, 'stroke-width': 4, 'stroke-linejoin': 'round' }, ch.g);
    var muLine = S('line', { stroke: PURPLE, 'stroke-width': 2, 'stroke-dasharray': '6 6' }, ch.g);
    var muLab = S('text', { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: PURPLE }, ch.g, '\u03bc');
    var sigLine = S('line', { stroke: PURPLE, 'stroke-width': 3 }, ch.g);
    var sigLab = S('text', { 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: PURPLE }, ch.g, '\u03c3');
    var stem = S('line', { stroke: ORANGE, 'stroke-width': 3 }, ch.g);
    var dot = S('circle', { r: 7, fill: ORANGE, stroke: '#fff', 'stroke-width': 2 }, ch.g);
    var yLab = S('text', { 'font-size': 18, 'font-weight': 700, fill: ORANGE }, ch.g, 'y');
    var k = knob(ch.g, ORANGE);

    var box = M4.el('div', { style: 'margin-top:14px' }, el);
    var row = M4.el('div', { class: 'm4-row', style: 'margin-top:10px' }, el);
    var p1 = pill(row), p2 = pill(row), p3 = pill(row);

    function draw() {
      var f = function (x) { return gauss(x, st.mu, st.s); };
      curve.setAttribute('d', ch.curveD(f, false));
      area.setAttribute('d', ch.curveD(f, true));
      var peak = f(st.mu), infl = f(st.mu + st.s), d = f(st.y);
      var xa = ch.X(clamp(st.mu - st.s, ch.xmin, ch.xmax)), xb = ch.X(clamp(st.mu + st.s, ch.xmin, ch.xmax));
      band.setAttribute('x', xa); band.setAttribute('width', Math.max(0, xb - xa));
      band.setAttribute('y', ch.top - 10); band.setAttribute('height', ch.base - ch.top + 10);
      muLine.setAttribute('x1', ch.X(st.mu)); muLine.setAttribute('x2', ch.X(st.mu));
      muLine.setAttribute('y1', ch.base); muLine.setAttribute('y2', ch.Y(peak));
      muLab.setAttribute('x', ch.X(st.mu)); muLab.setAttribute('y', ch.Y(peak) - 10);
      sigLine.setAttribute('x1', ch.X(st.mu)); sigLine.setAttribute('x2', ch.X(st.mu + st.s));
      sigLine.setAttribute('y1', ch.Y(infl)); sigLine.setAttribute('y2', ch.Y(infl));
      sigLab.setAttribute('x', ch.X(st.mu + st.s / 2)); sigLab.setAttribute('y', ch.Y(infl) + 22);
      stem.setAttribute('x1', ch.X(st.y)); stem.setAttribute('x2', ch.X(st.y));
      stem.setAttribute('y1', ch.base); stem.setAttribute('y2', ch.Y(d));
      dot.setAttribute('cx', ch.X(st.y)); dot.setAttribute('cy', ch.Y(d));
      yLab.setAttribute('x', ch.X(st.y) + 18); yLab.setAttribute('y', ch.base - 10);
      place(k, ch.X(st.y), ch.base);
      var diff = st.y - st.mu;
      p1.textContent = 'y \u2212 \u03bc = ' + (diff < 0 ? '\u2212' : '') + Math.abs(diff) + ' \u20ac';
      p2.textContent = '(y \u2212 \u03bc)\u00b2 = ' + (diff * diff);
      p3.textContent = 'density = ' + milli(d);
    }
    M4.slider(box, { min: 900, max: 1700, step: 10, value: st.mu, label: 'mean \u03bc', format: function (v) { return v + ' \u20ac'; }, onInput: function (v) { st.mu = Number(v); draw(); } });
    M4.slider(box, { min: 40, max: 250, step: 5, value: st.s, label: 'standard deviation \u03c3', format: function (v) { return v + ' \u20ac'; }, onInput: function (v) { st.s = Number(v); draw(); } });
    hdrag(k, ch, function () { return st.y; }, function (v) { st.y = clamp(snap(v, 10), ch.xmin, ch.xmax); draw(); });
    draw();
  }

  // Step 6: match a ghost Gaussian with two handles.
  function mountMatch(el, ctx) {
    injectStyle();
    var T = { mu: 1450, s: 60 };
    var st = { mu: 1100, s: 160 };
    var done = false;
    var ch = chart(el, { height: 380, ymax: 0.0106 });
    var ghostF = function (x) { return gauss(x, T.mu, T.s); };
    var ghostArea = S('path', { d: ch.curveD(ghostF, true), fill: MUTED, opacity: 0.08 }, ch.g);
    var ghost = S('path', { d: ch.curveD(ghostF, false), fill: 'none', stroke: MUTED, 'stroke-width': 3, 'stroke-dasharray': '8 7', opacity: 0.75 }, ch.g);
    S('text', { x: ch.X(T.mu) + 62, y: ch.Y(ghostF(T.mu)) + 14, 'font-size': 15, fill: MUTED }, ch.g, 'target');
    var area = S('path', { fill: PURPLE, opacity: 0.14 }, ch.g);
    var curve = S('path', { fill: 'none', stroke: PURPLE, 'stroke-width': 4, 'stroke-linejoin': 'round' }, ch.g);
    var sigLine = S('line', { stroke: ORANGE, 'stroke-width': 3 }, ch.g);
    var kMu = knob(ch.g, PURPLE);
    var kS = knob(ch.g, ORANGE);
    var row = M4.el('div', { class: 'm4-row', style: 'margin-top:14px' }, el);
    var p1 = pill(row), p2 = pill(row);

    function draw() {
      var f = function (x) { return gauss(x, st.mu, st.s); };
      curve.setAttribute('d', ch.curveD(f, false));
      area.setAttribute('d', ch.curveD(f, true));
      var yi = ch.Y(f(st.mu + st.s));
      sigLine.setAttribute('x1', ch.X(st.mu)); sigLine.setAttribute('x2', ch.X(st.mu + st.s));
      sigLine.setAttribute('y1', yi); sigLine.setAttribute('y2', yi);
      place(kMu, ch.X(st.mu), ch.Y(f(st.mu)));
      place(kS, ch.X(st.mu + st.s), yi);
      p1.textContent = '\u03bc = ' + st.mu + ' \u20ac';
      p2.textContent = '\u03c3 = ' + st.s + ' \u20ac';
    }
    function check() {
      if (done) return;
      if (st.mu === T.mu && st.s === T.s) {
        done = true;
        curve.setAttribute('stroke', GREEN);
        area.setAttribute('fill', GREEN);
        area.setAttribute('opacity', 0.22);
        ghost.setAttribute('opacity', 0);
        ghostArea.setAttribute('opacity', 0);
        ctx.note('The curves coincide: \\( \\mu = 1450 \\) and \\( \\sigma = 60 \\). The narrow bell is tall because the total area stays equal to 1.');
        ctx.solved();
        return;
      }
      var parts = [];
      if (st.mu !== T.mu) parts.push('the centre lies ' + Math.abs(st.mu - T.mu) + ' \u20ac too far ' + (st.mu < T.mu ? 'left' : 'right'));
      if (st.s !== T.s) parts.push('the bell is too ' + (st.s > T.s ? 'wide' : 'narrow') + ' by ' + Math.abs(st.s - T.s) + ' \u20ac in \\( \\sigma \\)');
      var msg = parts.join(' and ');
      ctx.note(msg.charAt(0).toUpperCase() + msg.slice(1) + '.');
    }
    hdrag(kMu, ch, function () { return st.mu; }, function (v) { if (done) return; st.mu = clamp(snap(v, 10), 900, 1700); draw(); }, check);
    hdrag(kS, ch, function () { return st.s; }, function (v) { if (done) return; st.s = clamp(snap(v, 10), 40, 250); draw(); }, check);
    draw();
  }

  // Step 7: symmetry of the squared distance.
  function mountSymmetry(el, ctx) {
    M4.choices(el, {
      options: [
        'The model with \\( \\mu = 1250 \\)',
        'The model with \\( \\mu = 1450 \\)',
        'Both assign the same density',
        'It depends on the sign of \\( y - \\mu \\)'
      ],
      correct: 2,
      onCorrect: function () {
        ctx.note('\\( (1350 - 1250)^2 = (1350 - 1450)^2 = 10000 \\), so both densities equal \\( \\tfrac{1}{100\\sqrt{2\\pi}}\\, e^{-1/2} \\approx 2.42 \\times 10^{-3} \\).');
        ctx.solved();
      },
      onWrong: function (i) {
        ctx.wrong(i === 3
          ? 'The difference \\( y - \\mu \\) enters the formula only through its square, so its sign has no effect.'
          : 'Compute \\( (y - \\mu)^2 \\) for both models before comparing.');
      }
    });
  }

  // Step 8: probability reading and likelihood reading of the same formula.
  function mountTwoReadings(el, ctx) {
    injectStyle();
    var SIG = 150;
    var st = { mu: 1150, y: 1350 };
    var top = chart(el, { height: 300, ymax: 0.0031, title: 'Model fixed: density over y' });
    M4.el('div', { style: 'height:12px' }, el);
    var bot = chart(el, { height: 230, ymax: 0.0031, title: 'Observation fixed: likelihood over \u03bc' });

    var area = S('path', { fill: PURPLE, opacity: 0.14 }, top.g);
    var curve = S('path', { fill: 'none', stroke: PURPLE, 'stroke-width': 4 }, top.g);
    var stem = S('line', { stroke: ORANGE, 'stroke-width': 3 }, top.g);
    var dot = S('circle', { r: 8, fill: PINK, stroke: '#fff', 'stroke-width': 2 }, top.g);
    var muLab = S('text', { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: PURPLE }, top.g, '\u03bc');
    var yLab = S('text', { 'font-size': 18, 'font-weight': 700, fill: ORANGE }, top.g, 'y');
    var kY = knob(top.g, ORANGE);
    var kMu = knob(top.g, PURPLE);

    var lcurve = S('path', { fill: 'none', stroke: PINK, 'stroke-width': 4 }, bot.g);
    var lstem = S('line', { stroke: PURPLE, 'stroke-width': 3, 'stroke-dasharray': '6 6' }, bot.g);
    var ldot = S('circle', { r: 8, fill: PINK, stroke: '#fff', 'stroke-width': 2 }, bot.g);
    var lLab = S('text', { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: PURPLE }, bot.g, '\u03bc');

    var row = M4.el('div', { class: 'm4-row', style: 'margin-top:14px' }, el);
    var p1 = pill(row), p2 = pill(row), p3 = pill(row);
    var raf = 0;

    function draw() {
      var f = function (x) { return gauss(x, st.mu, SIG); };
      var d = f(st.y), peak = f(st.mu);
      curve.setAttribute('d', top.curveD(f, false));
      area.setAttribute('d', top.curveD(f, true));
      stem.setAttribute('x1', top.X(st.y)); stem.setAttribute('x2', top.X(st.y));
      stem.setAttribute('y1', top.base); stem.setAttribute('y2', top.Y(d));
      dot.setAttribute('cx', top.X(st.y)); dot.setAttribute('cy', top.Y(d));
      muLab.setAttribute('x', top.X(st.mu)); muLab.setAttribute('y', top.Y(peak) - 20);
      yLab.setAttribute('x', top.X(st.y) + 18); yLab.setAttribute('y', top.base - 10);
      place(kY, top.X(st.y), top.base);
      place(kMu, top.X(st.mu), top.Y(peak));
      lcurve.setAttribute('d', bot.curveD(function (m) { return gauss(st.y, m, SIG); }, false));
      lstem.setAttribute('x1', bot.X(st.mu)); lstem.setAttribute('x2', bot.X(st.mu));
      lstem.setAttribute('y1', bot.base); lstem.setAttribute('y2', bot.Y(d));
      ldot.setAttribute('cx', bot.X(st.mu)); ldot.setAttribute('cy', bot.Y(d));
      lLab.setAttribute('x', bot.X(st.mu)); lLab.setAttribute('y', bot.Y(d) - 16);
      p1.textContent = 'y = ' + Math.round(st.y) + ' \u20ac';
      p2.textContent = '\u03bc = ' + Math.round(st.mu) + ' \u20ac';
      p3.textContent = 'N(y | \u03bc, \u03c3\u00b2) = ' + milli(d);
    }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    hdrag(kY, top, function () { return st.y; }, function (v) { stop(); st.y = clamp(snap(v, 10), 850, 1750); draw(); });
    hdrag(kMu, top, function () { return st.mu; }, function (v) { stop(); st.mu = clamp(snap(v, 10), 850, 1750); draw(); });

    var row2 = M4.el('div', { class: 'm4-row', style: 'margin-top:10px' }, el);
    M4.button(row2, 'Sweep \u03bc with y fixed', function () {
      stop();
      var t0 = 0, dur = 3200;
      function frame(t) {
        if (!t0) t0 = t;
        var u = Math.min(1, (t - t0) / dur);
        var e = 0.5 - 0.5 * Math.cos(Math.PI * u);
        st.mu = 850 + 900 * e;
        draw();
        if (u < 1) raf = requestAnimationFrame(frame);
        else { raf = 0; st.mu = 1750; draw(); }
      }
      raf = requestAnimationFrame(frame);
    }, { primary: true });
    M4.button(row2, 'Set \u03bc = y', function () { stop(); st.mu = st.y; draw(); });
    ctx.onCleanup(stop);
    draw();
  }

  // Step 9: sort statements into probability and likelihood.
  function mountSort(el, ctx) {
    injectStyle();
    var items = [
      { html: '\\( \\mu \\) is held fixed and \\( y \\) varies', bin: 0 },
      { html: '\\( y \\) is held fixed and \\( \\mu \\) varies', bin: 1 },
      { html: 'How plausible is a rent of 1350 € under this model?', bin: 0 },
      { html: 'Which model makes the observed rents most probable?', bin: 1 }
    ];
    var order = [1, 2, 3, 0];
    var pool = M4.el('div', { class: 'm4-row l2-s1-pool' }, el);
    var grid = M4.el('div', { class: 'm4-grid2' }, el);
    var bins = [
      { head: 'Probability', sub: 'a function of the outcome' },
      { head: 'Likelihood', sub: 'a function of the parameter' }
    ].map(function (b, i) {
      var s = M4.el('div', { class: 'm4-slot l2-s1-bin' }, grid);
      s.setAttribute('data-bin', String(i));
      M4.el('div', { class: 'l2-s1-binhead', text: b.head, style: 'color:' + (i === 0 ? ORANGE : PURPLE) }, s);
      M4.el('div', { class: 'l2-s1-binsub', text: b.sub }, s);
      return s;
    });
    var tokens = order.map(function (idx) {
      var t = M4.el('div', { class: 'm4-token l2-s1-tok', html: items[idx].html }, pool);
      t.setAttribute('data-bin', String(items[idx].bin));
      return t;
    });
    M4.typeset(pool);
    var placed = 0;
    M4.dragDrop({
      tokens: tokens,
      slots: bins,
      onDrop: function (tok, slot) {
        if (tok.classList.contains('l2-s1-locked')) return;
        if (tok.getAttribute('data-bin') === slot.getAttribute('data-bin')) {
          tok.classList.add('l2-s1-locked');
          tok.style.transform = '';
          tok.style.position = '';
          tok.style.left = '';
          tok.style.top = '';
          slot.appendChild(tok);
          slot.classList.add('m4-slot', 'filled');
          placed += 1;
          if (placed === items.length) {
            ctx.note('Both columns evaluate the same expression \\( \\mathcal{N}(y \\mid \\mu, \\sigma^2) \\). They differ only in which argument is free.');
            ctx.solved();
          } else {
            ctx.note(placed + ' of ' + items.length + ' statements placed.');
          }
        } else {
          ctx.wrong(slot.getAttribute('data-bin') === '0'
            ? 'In the probability reading the model is fixed and the outcome varies. This statement keeps the data fixed.'
            : 'In the likelihood reading the data are fixed and the parameter varies. This statement keeps the model fixed.');
        }
      },
      onMiss: function () {}
    });
  }

  // Step 10: maximise the joint likelihood of four observations.
  function mountJoint(el, ctx) {
    injectStyle();
    var SIG = 150, DATA = [1100, 1250, 1350, 1500], BEST = 1300;
    var st = { mu: 1000 };
    var done = false;
    function joint(mu) { return DATA.reduce(function (a, y) { return a * gauss(y, mu, SIG); }, 1); }
    var LMAX = joint(BEST);
    var ch = chart(el, { height: 340, ymax: 0.0031 });
    var area = S('path', { fill: PURPLE, opacity: 0.14 }, ch.g);
    var curve = S('path', { fill: 'none', stroke: PURPLE, 'stroke-width': 4 }, ch.g);
    var stems = DATA.map(function (y) {
      S('circle', { cx: ch.X(y), cy: ch.base, r: 8, fill: ORANGE, stroke: '#fff', 'stroke-width': 2 }, ch.g);
      return {
        line: S('line', { x1: ch.X(y), x2: ch.X(y), y1: ch.base - 8, stroke: ORANGE, 'stroke-width': 3 }, ch.g),
        dot: S('circle', { cx: ch.X(y), r: 6, fill: PINK, stroke: '#fff', 'stroke-width': 2 }, ch.g)
      };
    });
    var muLab = S('text', { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: PURPLE }, ch.g, '\u03bc');
    var k = knob(ch.g, PURPLE);
    var meter = M4.el('div', { class: 'l2-s1-meter' }, el);
    var fill = M4.el('div', {}, meter);
    var row = M4.el('div', { class: 'm4-row', style: 'margin-top:10px' }, el);
    var p1 = pill(row), p2 = pill(row), p3 = pill(row);

    function draw() {
      var f = function (x) { return gauss(x, st.mu, SIG); };
      curve.setAttribute('d', ch.curveD(f, false));
      area.setAttribute('d', ch.curveD(f, true));
      DATA.forEach(function (y, i) {
        stems[i].line.setAttribute('y2', ch.Y(f(y)));
        stems[i].dot.setAttribute('cy', ch.Y(f(y)));
      });
      var peakY = ch.Y(f(st.mu));
      muLab.setAttribute('x', ch.X(st.mu)); muLab.setAttribute('y', peakY - 20);
      place(k, ch.X(st.mu), peakY);
      var L = joint(st.mu), rel = L / LMAX;
      p1.textContent = '\u03bc = ' + st.mu + ' \u20ac';
      p2.textContent = 'L(\u03bc) = ' + sci(L);
      p3.textContent = (rel * 100).toFixed(1) + ' % of maximum';
      fill.style.width = (rel * 100).toFixed(1) + '%';
    }
    function check() {
      if (done) return;
      if (st.mu === BEST) {
        done = true;
        fill.style.background = GREEN;
        curve.setAttribute('stroke', GREEN);
        area.setAttribute('fill', GREEN);
        ctx.note('The product is largest at \\( \\mu = 1300 \\), which is the arithmetic mean \\( \\tfrac{1}{4}(1100 + 1250 + 1350 + 1500) \\) of the observations. No single observation sits at the peak. The bell is a compromise between all four.');
        ctx.solved();
      } else {
        var rel = joint(st.mu) / LMAX;
        var lo = DATA.filter(function (y) { return y < st.mu; }).length;
        var hi = DATA.filter(function (y) { return y > st.mu; }).length;
        ctx.note('At \\( \\mu = ' + st.mu + ' \\) the joint likelihood is ' + (rel * 100).toFixed(1) + ' % of the largest attainable value. ' + lo + ' observation' + (lo === 1 ? ' lies' : 's lie') + ' to the left of \\( \\mu \\) and ' + hi + ' to the right.');
      }
    }
    hdrag(k, ch, function () { return st.mu; }, function (v) { if (done) return; st.mu = clamp(snap(v, 10), 900, 1700); draw(); }, check);
    draw();
  }

  // Step 11: move one observation so that the likelihood peaks at a target.
  function mountInverse(el, ctx) {
    injectStyle();
    var SIG = 150, FIXED = [1100, 1250, 1500], TARGET = 1350;
    var st = { y: 1000 };
    var done = false;
    var ch = chart(el, { height: 360, ymax: 1.22, title: 'joint likelihood L(\u03bc), scaled to its maximum' });
    var tx = ch.X(TARGET);
    S('line', { x1: tx, x2: tx, y1: ch.top + 4, y2: ch.base, stroke: GREEN, 'stroke-width': 3, 'stroke-dasharray': '8 7', opacity: 0.8 }, ch.g);
    S('text', { x: tx + 10, y: ch.top + 2, 'font-size': 15, 'font-weight': 600, fill: GREEN }, ch.g, 'target peak 1350 \u20ac');
    var area = S('path', { fill: PINK, opacity: 0.12 }, ch.g);
    var curve = S('path', { fill: 'none', stroke: PINK, 'stroke-width': 4 }, ch.g);
    var peakLine = S('line', { stroke: PURPLE, 'stroke-width': 3 }, ch.g);
    var peakDot = S('circle', { r: 8, fill: PURPLE, stroke: '#fff', 'stroke-width': 2 }, ch.g);
    FIXED.forEach(function (y) {
      S('circle', { cx: ch.X(y), cy: ch.base, r: 9, fill: INK, stroke: '#fff', 'stroke-width': 2 }, ch.g);
    });
    var k = knob(ch.g, ORANGE);
    var row = M4.el('div', { class: 'm4-row', style: 'margin-top:14px' }, el);
    var p1 = pill(row), p2 = pill(row);

    function mean() { return (FIXED[0] + FIXED[1] + FIXED[2] + st.y) / 4; }
    function draw() {
      var all = FIXED.concat([st.y]);
      function ll(mu) { return all.reduce(function (a, y) { return a - (y - mu) * (y - mu) / (2 * SIG * SIG); }, 0); }
      var m = mean(), lmax = ll(m);
      var f = function (mu) { return Math.exp(ll(mu) - lmax); };
      curve.setAttribute('d', ch.curveD(f, false));
      area.setAttribute('d', ch.curveD(f, true));
      peakLine.setAttribute('x1', ch.X(m)); peakLine.setAttribute('x2', ch.X(m));
      peakLine.setAttribute('y1', ch.base); peakLine.setAttribute('y2', ch.Y(1));
      peakDot.setAttribute('cx', ch.X(m)); peakDot.setAttribute('cy', ch.Y(1));
      place(k, ch.X(st.y), ch.base);
      p1.textContent = 'fourth observation = ' + st.y + ' \u20ac';
      p2.textContent = 'peak at \u03bc = ' + (m % 1 === 0 ? m : m.toFixed(1)) + ' \u20ac';
    }
    function check() {
      if (done) return;
      var m = mean();
      if (Math.abs(m - TARGET) < 1e-9) {
        done = true;
        curve.setAttribute('stroke', GREEN);
        area.setAttribute('fill', GREEN);
        peakLine.setAttribute('stroke', GREEN);
        peakDot.setAttribute('fill', GREEN);
        ctx.note('With the fourth observation at 1550 € the mean is \\( \\tfrac{1}{4}(1100 + 1250 + 1500 + 1550) = 1350 \\), and the joint likelihood peaks there.');
        ctx.solved();
      } else {
        var d = Math.abs(m - TARGET);
        ctx.note('The peak is at ' + (m % 1 === 0 ? m : m.toFixed(1)) + ' €, which is ' + (d % 1 === 0 ? d : d.toFixed(1)) + ' € ' + (m < TARGET ? 'below' : 'above') + ' the target. Moving one of four observations by 40 € moves the peak by 10 €.');
      }
    }
    hdrag(k, ch, function () { return st.y; }, function (v) { if (done) return; st.y = clamp(snap(v, 10), 850, 1750); draw(); }, check);
    draw();
  }

  // ---------- lesson ----------

  M4.lesson({
    id: 'l2-s1',
    module: 'l2',
    title: 'Distributions and likelihood',
    summary: 'A model predicts a distribution, the data are one outcome of it, and the likelihood measures how well a choice of parameters explains the observed data.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Origin of loss functions',
        html: '<p>A linear model fitted to rents can be judged by the mean squared error. Probability explains why that loss contains a square.</p>' +
          '<p>In this lesson you will distinguish a predicted distribution from an observed outcome, read the two parameters \\( \\mu \\) and \\( \\sigma \\) of a Gaussian density, and explain the difference between probability and likelihood for one and for several data points.</p>'
      },
      {
        kind: 'text',
        title: 'The mean squared error',
        html: '<p>A regression loss measures the distance between a prediction and the measured value. If a model predicts a rent of 1000 € and the measured rent is 800 €, the error is 200 €.</p>' +
          '<p>For \\( n \\) data points with measured values \\( y_i \\) and predictions \\( \\hat{y}_i \\), the mean squared error is \\[ \\mathrm{MSE} = \\frac{1}{n} \\sum_{i=1}^{n} (\\hat{y}_i - y_i)^2 . \\] Squaring prevents positive and negative errors from cancelling, but so would the absolute value or the fourth power. The choice of the square needs a better justification.</p>'
      },
      {
        kind: 'exercise',
        title: 'Cancelling errors',
        html: '<p>The table lists three flats with the prediction \\( \\hat{y}_i \\), the measured rent \\( y_i \\) and the signed error \\( \\hat{y}_i - y_i \\). The signed errors sum to zero although no prediction is correct. Compute the mean squared error (in €²).</p>',
        hint: 'The squares are 200² = 40000, 100² = 10000 and 100² = 10000. Add them and divide by 3.',
        mount: mountMSE
      },
      {
        kind: 'exercise',
        title: 'A model outputs a distribution',
        html: '<p>A model does not output a single answer but a distribution over possible answers. A classifier assigns a probability to every class, and these probabilities sum to 1. The observed label, for example <em>cat</em>, is one outcome of that distribution.</p>' +
          '<p>The classifier below assigns 0.82 to cat and 0.15 to dog. Drag the top of the third bar until the three values form a valid distribution.</p>',
        hint: 'The three probabilities must sum to 1, so the missing value is 1 − 0.82 − 0.15.',
        mount: mountBars
      },
      {
        kind: 'explore',
        title: 'The Gaussian density',
        html: '<p>In regression the distribution is a density over all real numbers. The Gaussian (normal) density has two parameters, the mean \\( \\mu \\), which is its centre and highest point, and the standard deviation \\( \\sigma \\), which is its spread: \\[ \\mathcal{N}(y \\mid \\mu, \\sigma^2) = \\frac{1}{\\sigma\\sqrt{2\\pi}} \\exp\\!\\left( -\\frac{(y-\\mu)^2}{2\\sigma^2} \\right). \\]</p>' +
          '<p>Change \\( \\mu \\) and \\( \\sigma \\) with the sliders and drag the orange point \\( y \\) along the axis. The shaded band marks \\( \\mu \\pm \\sigma \\). The density at \\( y \\) depends on \\( y \\) only through the squared distance \\( (y-\\mu)^2 \\). The factor in front keeps the total area equal to 1.</p>',
        mount: mountGaussExplore
      },
      {
        kind: 'exercise',
        title: 'Fitting a bell curve',
        html: '<p>The dashed curve is a Gaussian density with unknown parameters. Drag the purple handle at the peak to set \\( \\mu \\) and the orange handle, which sits one standard deviation to the right of the centre, to set \\( \\sigma \\), until the solid curve covers the dashed one.</p>',
        hint: 'First move the peak under the dashed peak at 1450 €. Then shorten the orange segment: a smaller σ makes the bell narrower and taller. The target has σ = 60 €.',
        mount: mountMatch
      },
      {
        kind: 'exercise',
        title: 'The squared distance',
        html: '<p>A rent of \\( y = 1350 \\) € is observed. Two Gaussian models share the standard deviation \\( \\sigma = 100 \\) € but have different means, \\( \\mu = 1250 \\) € and \\( \\mu = 1450 \\) €. Which model assigns the higher density to the observation?</p>',
        hint: 'With σ equal, the density is determined by (y − μ)². Compare 100² with (−100)².',
        mount: mountSymmetry
      },
      {
        kind: 'explore',
        title: 'Density and likelihood',
        html: '<p>The expression \\( \\mathcal{N}(y \\mid \\mu, \\sigma^2) \\) can be read in two ways. With the parameter \\( \\mu \\) fixed it is a function of \\( y \\) and describes how probable each outcome is: this is the <em>probability</em> reading. With the observation \\( y \\) fixed it is a function of \\( \\mu \\) and describes how well each model explains that observation: this is the <em>likelihood</em>.</p>' +
          '<p>Drag the orange point to change \\( y \\) and the purple handle to change \\( \\mu \\) (here \\( \\sigma = 150 \\) €). The pink dot has the same height in both panels. In machine learning the data cannot be changed, only the model, so the lower panel is the relevant one.</p>',
        mount: mountTwoReadings
      },
      {
        kind: 'exercise',
        title: 'Probability or likelihood',
        html: '<p>Drag each statement into the reading it describes. Both readings use the same formula. They differ in which quantity is held fixed.</p>',
        hint: 'Probability: the model is given and outcomes are compared. Likelihood: the data are given and models are compared.',
        mount: mountSort
      },
      {
        kind: 'exercise',
        title: 'Several data points',
        html: '<p>For several independent observations \\( y_1, \\dots, y_n \\) the joint likelihood is the product of the individual densities, \\[ L(\\mu) = \\prod_{i=1}^{n} \\mathcal{N}(y_i \\mid \\mu, \\sigma^2). \\] The four orange points are observed rents and \\( \\sigma = 150 \\) € is fixed. Each pink dot is one factor of the product.</p>' +
          '<p>Drag the bell until the joint likelihood \\( L(\\mu) \\) reaches its maximum.</p>',
        hint: 'A bell centred on one observation gives the others small factors. The product is largest at the mean of the four rents: (1100 + 1250 + 1350 + 1500) / 4.',
        mount: mountJoint
      },
      {
        kind: 'exercise',
        title: 'Moving the maximum',
        html: '<p>Three rents are fixed at 1100 €, 1250 € and 1500 € (black). The fourth observation (orange) can be moved. The pink curve is the joint likelihood \\( L(\\mu) \\) of all four observations with \\( \\sigma = 150 \\) €, scaled so that its maximum has height 1.</p>' +
          '<p>Place the fourth observation so that the likelihood peaks at the dashed target \\( \\mu = 1350 \\) €.</p>',
        hint: 'The likelihood peaks at the mean of the four observations. A mean of 1350 requires a sum of 4 · 1350 = 5400, and the three fixed rents sum to 3850.',
        mount: mountInverse
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>A model predicts a distribution: a probability per class in classification, a density over all values in regression. The data are single outcomes of that distribution.</li>' +
          '<li>The Gaussian density \\( \\mathcal{N}(y \\mid \\mu, \\sigma^2) \\) is centred at \\( \\mu \\), has spread \\( \\sigma \\), and depends on \\( y \\) only through the squared distance \\( (y-\\mu)^2 \\).</li>' +
          '<li>Probability fixes the model and varies the outcome. Likelihood fixes the data and varies the parameter. For several observations the likelihoods multiply, and the best \\( \\mu \\) is a compromise between all of them.</li>' +
          '</ul>' +
          '<p>The next session turns the product of likelihoods into a sum by taking the logarithm, which leads from the likelihood to a loss function.</p>'
      }
    ]
  });
})();
