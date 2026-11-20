(function () {
  'use strict';

  var C = M4.colors;
  var AMBER = '#e0a100'; // darker shade of the module yellow, used for strokes on white
  var SQ2PI = Math.sqrt(2 * Math.PI);

  function pdf(x, mu, s) {
    var z = (x - mu) / s;
    return Math.exp(-0.5 * z * z) / (s * SQ2PI);
  }
  // Abramowitz-Stegun 7.1.26, absolute error below 1.5e-7
  function erf(x) {
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return sign * y;
  }
  function within(k) { return erf(k / Math.SQRT2); } // P(|x - mu| <= k sigma)
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function snapTo(v, s) { return Math.round(v / s) * s; }

  function injectCss() {
    if (document.getElementById('probability-s4-style')) return;
    var st = document.createElement('style');
    st.id = 'probability-s4-style';
    st.textContent =
      '.probability-s4-eq{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-size:22px;margin:18px 0 26px}' +
      '.probability-s4-frac{display:flex;flex-direction:column;align-items:center;gap:6px}' +
      '.probability-s4-bar{height:3px;width:100%;background:#1d1d1f;border-radius:2px}' +
      '.probability-s4-slot{min-width:128px;min-height:56px;display:flex;align-items:center;justify-content:center;padding:4px 10px}' +
      '.probability-s4-ok{border-color:#16b56b !important;border-style:solid !important;background:rgba(22,181,107,.10) !important}' +
      '.probability-s4-tokens{justify-content:center;margin-top:6px}' +
      '.probability-s4-token{font-size:19px;padding:10px 16px;touch-action:none}' +
      '.probability-s4-readouts{justify-content:center;margin:10px 0}' +
      '.probability-s4-cap{text-align:center;font-weight:600;margin-bottom:4px}';
    document.head.appendChild(st);
  }

  function readoutRow(el) {
    return M4.el('div', { class: 'm4-row probability-s4-readouts' }, el);
  }
  function readout(row) {
    return M4.el('span', { class: 'm4-readout', text: '' }, row);
  }
  function shadePoints(f, a, b) {
    var pts = [[a, 0]], n = 80, i, x;
    for (i = 0; i <= n; i++) { x = a + (b - a) * i / n; pts.push([x, f(x)]); }
    pts.push([b, 0]);
    return pts;
  }
  function sigmaTicks(p, y) {
    var names = ['\u03bc\u22123\u03c3', '\u03bc\u22122\u03c3', '\u03bc\u2212\u03c3', '\u03bc', '\u03bc+\u03c3', '\u03bc+2\u03c3', '\u03bc+3\u03c3'];
    for (var i = -3; i <= 3; i++) {
      p.line(i, -0.008, i, 0.008, { stroke: C.muted, width: 2 });
      p.text(i, y, names[i + 3], { fill: C.muted, size: 15 });
    }
  }

  /* ---------- step 3: explore mean and standard deviation ---------- */
  function mountParams(el, ctx) {
    injectCss();
    var mu = 0, s = 1;
    var p = M4.plane(el, { xmin: -6, xmax: 6, ymin: -0.1, ymax: 0.9, width: 640, height: 380 });
    var shade = p.path(shadePoints(function (x) { return pdf(x, mu, s); }, -6, 6), { stroke: 'none', fill: C.yellow, closed: true });
    shade.el.setAttribute('fill-opacity', '0.28');
    var curve = p.fn(function (x) { return pdf(x, mu, s); }, { stroke: AMBER, width: 4 });
    var centre = p.line(0, 0, 0, 0.4, { stroke: C.blue, width: 2, dash: '6 6' });
    var wline = p.arrow(0, 0.24, 1, 0.24, { stroke: C.purple, width: 3 });
    var muLab = p.text(0, 0.45, '\u03bc', { fill: C.blue, size: 20, weight: 700 });
    var sLab = p.text(0.5, 0.2, '\u03c3', { fill: C.purple, size: 20, weight: 700 });
    var row = readoutRow(el);
    var r1 = readout(row), r2 = readout(row), r3 = readout(row);

    function update() {
      var f = function (x) { return pdf(x, mu, s); };
      var peak = f(mu), infl = f(mu + s);
      curve.set(f);
      shade.set(shadePoints(f, -6, 6));
      centre.set(mu, 0, mu, peak);
      wline.set(mu, infl, mu + s, infl);
      muLab.set(mu, peak + 0.045, '\u03bc');
      sLab.set(mu + s + 0.35, infl + 0.02, '\u03c3');
      r1.textContent = '\u03bc = ' + mu.toFixed(1);
      r2.textContent = '\u03c3 = ' + s.toFixed(2);
      r3.textContent = 'peak height = ' + peak.toFixed(3);
    }
    M4.slider(el, { min: -3, max: 3, step: 0.1, value: mu, label: 'mean \u03bc', format: function (v) { return (+v).toFixed(1); }, onInput: function (v) { mu = +v; update(); } });
    M4.slider(el, { min: 0.5, max: 2.5, step: 0.05, value: s, label: 'standard deviation \u03c3', format: function (v) { return (+v).toFixed(2); }, onInput: function (v) { s = +v; update(); } });
    M4.el('div', { class: 'm4-note', text: 'The shaded area equals 1 for every setting: a narrower curve must be taller.' }, el);
    update();
  }

  /* ---------- step 4: exercise, match the ghost curve ---------- */
  function mountMatch(el, ctx) {
    injectCss();
    var TM = 1, TS = 1.5;
    var mu = -2, s = 0.75, done = false;
    var p = M4.plane(el, { xmin: -6, xmax: 6, ymin: -0.1, ymax: 0.9, width: 640, height: 380 });
    var ghost = p.fn(function (x) { return pdf(x, TM, TS); }, { stroke: C.purple, width: 4 });
    ghost.el.setAttribute('stroke-dasharray', '9 8');
    ghost.el.setAttribute('opacity', '0.55');
    var shade = p.path([[0, 0]], { stroke: 'none', fill: C.yellow, closed: true });
    shade.el.setAttribute('fill-opacity', '0.25');
    var curve = p.fn(function (x) { return pdf(x, mu, s); }, { stroke: AMBER, width: 4 });
    var row = readoutRow(el);
    var r1 = readout(row), r2 = readout(row);
    var hMu, hS;

    function draw() {
      var f = function (x) { return pdf(x, mu, s); };
      curve.set(f);
      shade.set(shadePoints(f, -6, 6));
      if (hMu) hMu.set(mu, f(mu));
      if (hS) hS.set(mu + s, f(mu + s));
      r1.textContent = '\u03bc = ' + mu.toFixed(2);
      r2.textContent = '\u03c3 = ' + s.toFixed(2);
    }
    function check() {
      if (done) return;
      var okM = Math.abs(mu - TM) < 0.01, okS = Math.abs(s - TS) < 0.01;
      if (okM && okS) {
        done = true;
        ghost.el.setAttribute('stroke', C.green);
        ghost.el.setAttribute('opacity', '1');
        shade.el.setAttribute('fill', C.green);
        ctx.note('The curves coincide: \\(\\mu = 1\\) and \\(\\sigma = 1.5\\).');
        ctx.solved();
        return;
      }
      var msg = [];
      if (!okM) msg.push('the centre is too far ' + (mu < TM ? 'left' : 'right'));
      if (!okS) msg.push('the curve is too ' + (s < TS ? 'narrow' : 'wide'));
      ctx.note('Not yet: ' + msg.join(' and ') + '.');
    }
    hS = p.handle(mu + s, pdf(mu + s, mu, s), {
      color: C.blue, r: 13,
      onDrag: function (x) { if (done) { draw(); return; } s = clamp(snapTo(x - mu, 0.25), 0.5, 2.5); draw(); },
      onEnd: function () { draw(); check(); }
    });
    hMu = p.handle(mu, pdf(mu, mu, s), {
      color: AMBER, r: 13,
      onDrag: function (x) { if (done) { draw(); return; } mu = clamp(snapTo(x, 0.25), -3.5, 3.5); draw(); },
      onEnd: function () { draw(); check(); }
    });
    M4.el('div', { class: 'm4-note', text: 'Yellow handle: moves the mean. Blue handle: sits one standard deviation to the right of the mean and sets the width.' }, el);
    draw();
  }

  /* ---------- step 5: explore the 68-95-99.7 rule ---------- */
  function mountRule(el, ctx) {
    injectCss();
    var k = 1, raf = 0;
    var f = function (x) { return pdf(x, 0, 1); };
    var p = M4.plane(el, { xmin: -4, xmax: 4, ymin: -0.1, ymax: 0.5, width: 640, height: 360, grid: false, labels: false });
    var shade = p.path(shadePoints(f, -1, 1), { stroke: 'none', fill: C.yellow, closed: true });
    shade.el.setAttribute('fill-opacity', '0.55');
    p.fn(f, { stroke: AMBER, width: 4 });
    var l1 = p.line(-1, 0, -1, f(1), { stroke: C.blue, width: 3 });
    var l2 = p.line(1, 0, 1, f(1), { stroke: C.blue, width: 3 });
    var big = p.text(0, 0.45, '', { fill: C.ink, size: 26, weight: 700 });
    sigmaTicks(p, -0.055);
    var row = readoutRow(el);
    var r1 = readout(row), r2 = readout(row);
    var slider;

    function update() {
      shade.set(shadePoints(f, -k, k));
      l1.set(-k, 0, -k, f(k));
      l2.set(k, 0, k, f(k));
      var a = within(k) * 100;
      big.set(0, 0.45, a.toFixed(1) + ' %');
      r1.textContent = 'k = ' + k.toFixed(2);
      r2.textContent = 'outside the interval: ' + (100 - a).toFixed(1) + ' %';
    }
    function tween(target) {
      cancelAnimationFrame(raf);
      var from = k, t0 = null;
      function frame(t) {
        if (t0 === null) t0 = t;
        var u = clamp((t - t0) / 450, 0, 1);
        var e = u * u * (3 - 2 * u);
        k = from + (target - from) * e;
        update();
        if (u < 1) raf = requestAnimationFrame(frame);
        else { k = target; slider.set(k); update(); }
      }
      raf = requestAnimationFrame(frame);
    }
    slider = M4.slider(el, { min: 0, max: 4, step: 0.05, value: k, label: 'half-width k (in units of \u03c3)', format: function (v) { return (+v).toFixed(2); }, onInput: function (v) { cancelAnimationFrame(raf); k = +v; update(); } });
    var btns = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:10px' }, el);
    [1, 2, 3].forEach(function (n) {
      M4.button(btns, '\u00b1' + n + '\u03c3', function () { tween(n); });
    });
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
    update();
  }

  /* ---------- step 6: exercise, drag the boundary to 95 % ---------- */
  function mountNinetyFive(el, ctx) {
    injectCss();
    var k = 0.6, done = false;
    var f = function (x) { return pdf(x, 0, 1); };
    var p = M4.plane(el, { xmin: -4, xmax: 4, ymin: -0.1, ymax: 0.5, width: 640, height: 360, grid: false, labels: false });
    var shade = p.path(shadePoints(f, -k, k), { stroke: 'none', fill: C.yellow, closed: true });
    shade.el.setAttribute('fill-opacity', '0.55');
    p.fn(f, { stroke: AMBER, width: 4 });
    var l1 = p.line(-k, 0, -k, f(k), { stroke: C.blue, width: 3, dash: '6 5' });
    var l2 = p.line(k, 0, k, f(k), { stroke: C.blue, width: 3 });
    var big = p.text(0, 0.45, '', { fill: C.ink, size: 26, weight: 700 });
    p.text(-3.2, -0.055, '\u03bc\u22123.2\u03c3', { fill: C.muted, size: 15 });
    p.text(0, -0.055, '\u03bc', { fill: C.muted, size: 15 });
    p.text(3.2, -0.055, '\u03bc+3.2\u03c3', { fill: C.muted, size: 15 });
    var row = readoutRow(el);
    var r1 = readout(row), r2 = readout(row);
    var h;

    function draw() {
      shade.set(shadePoints(f, -k, k));
      l1.set(-k, 0, -k, f(k));
      l2.set(k, 0, k, f(k));
      if (h) h.set(k, 0);
      var a = within(k) * 100;
      big.set(0, 0.45, a.toFixed(1) + ' %');
      r1.textContent = 'boundary at \u03bc \u00b1 ' + k.toFixed(2) + ' \u03c3';
      r2.textContent = 'target: 95.0 %';
    }
    h = p.handle(k, 0, {
      color: C.blue, r: 14,
      onDrag: function (x) { if (!done) k = clamp(snapTo(x, 0.05), 0.2, 3.8); draw(); },
      onEnd: function () {
        draw();
        if (done) return;
        var a = within(k) * 100;
        if (a >= 94.5 && a <= 95.5) {
          done = true;
          shade.el.setAttribute('fill', C.green);
          ctx.note('The interval \\(\\mu \\pm ' + k.toFixed(2) + '\\,\\sigma\\) holds ' + a.toFixed(1) + ' % of the probability. The exact value for 95 % is \\(1.96\\,\\sigma\\), usually rounded to \\(2\\sigma\\).');
          ctx.solved();
        } else {
          ctx.note('This interval holds ' + a.toFixed(1) + ' %, which is too ' + (a < 95 ? 'little: move the boundary outwards.' : 'much: move the boundary inwards.'));
        }
      }
    });
    M4.el('div', { class: 'm4-note', text: 'Drag the blue handle along the axis. The left boundary mirrors it.' }, el);
    draw();
  }

  /* ---------- step 7: exercise, number input ---------- */
  function mountScores(el, ctx) {
    injectCss();
    var p = M4.plane(el, { xmin: 40, xmax: 160, ymin: -0.006, ymax: 0.032, width: 640, height: 300, grid: false, labels: false });
    var f = function (x) { return pdf(x, 100, 15); };
    var shade = p.path(shadePoints(f, 70, 130), { stroke: 'none', fill: C.yellow, closed: true });
    shade.el.setAttribute('fill-opacity', '0.5');
    p.fn(f, { stroke: AMBER, width: 4 });
    [55, 70, 85, 100, 115].forEach(function (v) {
      p.line(v, -0.0006, v, 0.0006, { stroke: C.muted, width: 2 });
      p.text(v, -0.0036, String(v), { fill: C.muted, size: 16 });
    });
    p.line(130, -0.0006, 130, 0.0006, { stroke: C.blue, width: 2 });
    var q = p.text(130, -0.0036, '?', { fill: C.blue, size: 20, weight: 700 });
    p.text(100, 0.0095, '95 %', { fill: C.ink, size: 22, weight: 700 });
    M4.numberInput(el, {
      answer: 130, tolerance: 0.5, placeholder: 'upper end', label: 'Upper end of the 95 % interval',
      onCorrect: function () {
        q.set(130, -0.0036, '130');
        shade.el.setAttribute('fill', C.green);
        ctx.note('\\(\\mu + 2\\sigma = 100 + 2 \\cdot 15 = 130\\).');
        ctx.solved();
      },
      onWrong: function (v) {
        if (Math.abs(v - 115) < 0.5) ctx.wrong('115 is one standard deviation above the mean. That interval holds only about 68 %.');
        else if (Math.abs(v - 145) < 0.5) ctx.wrong('145 is three standard deviations above the mean. That interval holds about 99.7 %.');
        else ctx.wrong('The interval is symmetric about 100, and 70 lies two standard deviations below the mean.');
      }
    });
  }

  /* ---------- step 8: explore, log-density is a parabola ---------- */
  function mountLog(el, ctx) {
    injectCss();
    var mu = 0, s = 1;
    var grid = M4.el('div', { class: 'm4-grid2' }, el);
    var a = M4.el('div', {}, grid), b = M4.el('div', {}, grid);
    M4.el('div', { class: 'probability-s4-cap', html: 'density ' + M4.tex('p(x)') }, a);
    M4.el('div', { class: 'probability-s4-cap', html: 'log-density ' + M4.tex('\\log p(x)') }, b);
    var p1 = M4.plane(a, { xmin: -5, xmax: 5, ymin: -0.1, ymax: 0.9, width: 360, height: 340 });
    var p2 = M4.plane(b, { xmin: -5, xmax: 5, ymin: -9, ymax: 1, width: 360, height: 340 });
    var c1 = p1.fn(function (x) { return pdf(x, mu, s); }, { stroke: AMBER, width: 4 });
    var lf = function (x) { return Math.max(-11, -0.5 * (x - mu) * (x - mu) / (s * s) - Math.log(s * SQ2PI)); };
    var c2 = p2.fn(lf, { stroke: C.purple, width: 4 });
    var d1 = p1.point(0, 0.4, { r: 7, fill: C.blue });
    var d2 = p2.point(0, -0.9, { r: 7, fill: C.blue });
    var row = readoutRow(el);
    var r1 = readout(row), r2 = readout(row);
    function update() {
      c1.set(function (x) { return pdf(x, mu, s); });
      c2.set(lf);
      d1.set(mu, pdf(mu, mu, s));
      d2.set(mu, -Math.log(s * SQ2PI));
      r1.textContent = 'curvature \u22121/\u03c3\u00b2 = ' + (-1 / (s * s)).toFixed(2);
      r2.textContent = 'peak of log p = ' + (-Math.log(s * SQ2PI)).toFixed(2);
    }
    M4.slider(el, { min: -3, max: 3, step: 0.1, value: mu, label: 'mean \u03bc', format: function (v) { return (+v).toFixed(1); }, onInput: function (v) { mu = +v; update(); } });
    M4.slider(el, { min: 0.5, max: 2.5, step: 0.05, value: s, label: 'standard deviation \u03c3', format: function (v) { return (+v).toFixed(2); }, onInput: function (v) { s = +v; update(); } });
    update();
  }

  /* ---------- step 9: exercise, build the negative log-likelihood ---------- */
  function mountNll(el, ctx) {
    injectCss();
    var defs = [
      { key: 'sq', tex: '(y-\\hat y)^2' },
      { key: 'abs', tex: '|y-\\hat y|' },
      { key: 'two', tex: '2\\sigma^2' },
      { key: 'sig', tex: '\\sigma' },
      { key: 'const', tex: '\\log\\!\\big(\\sigma\\sqrt{2\\pi}\\big)' },
      { key: 'exp', tex: 'e^{-y}' }
    ];
    var order = [3, 0, 5, 2, 1, 4];
    var eq = M4.el('div', { class: 'probability-s4-eq' }, el);
    M4.el('span', { html: M4.tex('-\\log p(y) \\;=') }, eq);
    var frac = M4.el('div', { class: 'probability-s4-frac' }, eq);
    var sNum = M4.el('div', { class: 'm4-slot probability-s4-slot' }, frac);
    M4.el('div', { class: 'probability-s4-bar' }, frac);
    var sDen = M4.el('div', { class: 'm4-slot probability-s4-slot' }, frac);
    M4.el('span', { html: M4.tex('+') }, eq);
    var sConst = M4.el('div', { class: 'm4-slot probability-s4-slot' }, eq);
    sNum.setAttribute('data-accept', 'sq');
    sDen.setAttribute('data-accept', 'two');
    sConst.setAttribute('data-accept', 'const');
    var names = { sq: 'numerator', two: 'denominator', const: 'additive term' };

    var tray = M4.el('div', { class: 'm4-row probability-s4-tokens' }, el);
    var tokens = order.map(function (i) {
      var t = M4.el('div', { class: 'm4-token probability-s4-token', html: M4.tex(defs[i].tex) }, tray);
      t.setAttribute('data-key', defs[i].key);
      t.setAttribute('data-i', String(i));
      return t;
    });
    var filled = 0;
    M4.dragDrop({
      tokens: tokens, slots: [sNum, sDen, sConst],
      onDrop: function (tok, slot) {
        var key = tok.getAttribute('data-key'), want = slot.getAttribute('data-accept');
        if (slot.getAttribute('data-done')) { ctx.note('That slot is already filled correctly.'); return; }
        if (key === want) {
          slot.innerHTML = M4.tex(defs[+tok.getAttribute('data-i')].tex);
          slot.classList.add('filled');
          slot.classList.add('probability-s4-ok');
          slot.classList.add('m4-pop');
          slot.setAttribute('data-done', '1');
          tok.style.visibility = 'hidden';
          tok.style.pointerEvents = 'none';
          filled++;
          if (filled === 3) {
            ctx.note('With \\(\\sigma\\) fixed, the only part that depends on the prediction is the squared error \\((y-\\hat y)^2\\).');
            ctx.solved();
          } else {
            ctx.note('Correct for the ' + names[want] + '.');
          }
          return;
        }
        var msg;
        if (key === 'abs') msg = 'The exponent of the Gaussian contains a squared distance, not an absolute distance.';
        else if (key === 'exp') msg = 'Taking the logarithm removes the exponential. No exponential remains.';
        else if (key === 'sig' && want === 'two') msg = 'The squared distance is divided by twice the variance, not by the standard deviation.';
        else if (key === 'sig') msg = 'A bare \\(\\sigma\\) does not occur in this position.';
        else if (key === 'sq') msg = 'The squared distance is the numerator of the fraction.';
        else if (key === 'two') msg = 'Twice the variance is the denominator of the fraction.';
        else msg = 'The logarithm of the normalising factor is the term added to the fraction.';
        if (tok.parentNode !== tray) tray.appendChild(tok);
        ctx.wrong(msg);
      },
      onMiss: function () { ctx.note('Drop each tile onto one of the three dashed slots.'); }
    });
  }

  /* ---------- step 10: explore, sums of many small effects ---------- */
  function mountSums(el, ctx) {
    injectCss();
    var n = 1, NB = 40, W = 0.2, MAXN = 20000;
    var counts, total, raf = 0;
    var p = M4.plane(el, { xmin: -4, xmax: 4, ymin: -0.08, ymax: 0.6, width: 640, height: 360, grid: false, labels: false });
    var bars = [];
    for (var i = 0; i < NB; i++) {
      bars.push(M4.svg('rect', { x: p.x(-4 + i * W) + 1, y: p.y(0), width: Math.max(1, p.x(W) - p.x(0) - 2), height: 0, fill: C.yellow, rx: 2 }, p.g));
    }
    var bell = p.fn(function (x) { return pdf(x, 0, 1); }, { stroke: C.purple, width: 3 });
    bell.el.setAttribute('stroke-dasharray', '8 6');
    [-3, -2, -1, 0, 1, 2, 3].forEach(function (v) {
      p.line(v, -0.008, v, 0.008, { stroke: C.muted, width: 2 });
      p.text(v, -0.055, (v < 0 ? '\u2212' : '') + Math.abs(v), { fill: C.muted, size: 15 });
    });
    p.text(3.9, 0.53, 'dashed: standard Gaussian', { fill: C.purple, size: 15, anchor: 'end' });
    var row = readoutRow(el);
    var r1 = readout(row), r2 = readout(row);

    function reset() {
      counts = []; total = 0;
      for (var j = 0; j < NB; j++) counts.push(0);
    }
    function draw() {
      var y0 = p.y(0);
      for (var j = 0; j < NB; j++) {
        var d = total ? counts[j] / (total * W) : 0;
        var yy = p.y(Math.min(d, 0.6));
        bars[j].setAttribute('y', yy);
        bars[j].setAttribute('height', Math.max(0, y0 - yy));
      }
      r1.textContent = 'effects per sum: n = ' + n;
      r2.textContent = 'sums drawn: ' + total;
    }
    function frame() {
      if (total < MAXN) {
        var sd = Math.sqrt(n / 3);
        for (var k = 0; k < 150; k++) {
          var sum = 0;
          for (var j = 0; j < n; j++) sum += 2 * Math.random() - 1;
          var z = sum / sd;
          var b = Math.floor((z + 4) / W);
          if (b >= 0 && b < NB) counts[b]++;
          total++;
        }
        draw();
      }
      raf = requestAnimationFrame(frame);
    }
    M4.slider(el, { min: 1, max: 30, step: 1, value: n, label: 'number of effects n', format: function (v) { return String(Math.round(v)); }, onInput: function (v) { var nv = Math.round(+v); if (nv !== n) { n = nv; reset(); draw(); } } });
    var btns = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:10px' }, el);
    M4.button(btns, 'Draw again', function () { reset(); draw(); });
    M4.el('div', { class: 'm4-note', text: 'Each effect is uniform on [\u22121, 1]. The horizontal axis shows the sum divided by its standard deviation.' }, el);
    reset(); draw();
    raf = requestAnimationFrame(frame);
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
  }

  /* ---------- step 11: exercise, choose n so that the 95 % band is +-20 ---------- */
  function mountBand(el, ctx) {
    injectCss();
    var n = 25, done = false;
    var p = M4.plane(el, { xmin: -40, xmax: 40, ymin: -0.022, ymax: 0.11, width: 640, height: 360, grid: false, labels: false });
    function f(x) { return pdf(x, 0, Math.sqrt(n)); }
    var shade = p.path(shadePoints(f, -10, 10), { stroke: 'none', fill: C.yellow, closed: true });
    shade.el.setAttribute('fill-opacity', '0.55');
    var curve = p.fn(f, { stroke: AMBER, width: 4 });
    var t1 = p.line(-20, 0, -20, 0.095, { stroke: C.purple, width: 3, dash: '7 6' });
    var t2 = p.line(20, 0, 20, 0.095, { stroke: C.purple, width: 3, dash: '7 6' });
    p.text(-20, 0.1, 'target \u221220', { fill: C.purple, size: 16, weight: 700 });
    p.text(20, 0.1, 'target +20', { fill: C.purple, size: 16, weight: 700 });
    [-40, -30, -20, -10, 0, 10, 20, 30, 40].forEach(function (v) {
      p.line(v, -0.0015, v, 0.0015, { stroke: C.muted, width: 2 });
      if (Math.abs(v) < 40) p.text(v, -0.012, (v < 0 ? '\u2212' : '') + Math.abs(v), { fill: C.muted, size: 15 });
    });
    var row = readoutRow(el);
    var r1 = readout(row), r2 = readout(row), r3 = readout(row);
    function update() {
      var sd = Math.sqrt(n);
      curve.set(f);
      shade.set(shadePoints(f, -2 * sd, 2 * sd));
      r1.textContent = 'n = ' + n;
      r2.textContent = '\u03c3 = \u221an = ' + sd.toFixed(2);
      r3.textContent = '2\u03c3 band = \u00b1' + (2 * sd).toFixed(1);
    }
    M4.slider(el, { min: 20, max: 200, step: 5, value: n, label: 'number of effects n', format: function (v) { return String(Math.round(v)); }, onInput: function (v) { if (done) return; n = Math.round(+v); update(); } });
    var btns = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:12px' }, el);
    M4.button(btns, 'Check', function () {
      if (done) return;
      var band = 2 * Math.sqrt(n);
      if (n === 100) {
        done = true;
        shade.el.setAttribute('fill', C.green);
        t1.el.setAttribute('stroke', C.green);
        t2.el.setAttribute('stroke', C.green);
        ctx.note('\\(2\\sqrt{100} = 20\\). Doubling the width of the band required four times as many effects as \\(n = 25\\).');
        ctx.solved();
      } else if (n < 100) {
        ctx.wrong('The band is \u00b1' + band.toFixed(1) + ', narrower than \u00b120. More effects are needed.');
      } else {
        ctx.wrong('The band is \u00b1' + band.toFixed(1) + ', wider than \u00b120. Fewer effects are needed.');
      }
    }, { primary: true });
    update();
  }

  M4.lesson({
    id: 'probability-s4',
    module: 'probability',
    title: 'The Gaussian',
    summary: 'The bell curve: its two parameters, the 68-95-99.7 rule, its parabolic log-density, and why sums of small effects produce it.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>The Gaussian, or normal distribution, is the most widely used continuous distribution in statistics and machine learning.</p><p>In this lesson you will read its two parameters off a plot, state how much probability lies within one, two and three standard deviations of the mean, explain why its logarithm is a parabola, and say why sums of many small independent effects are approximately Gaussian.</p>'
      },
      {
        kind: 'text',
        title: 'The density',
        html: '<p>A Gaussian random variable \\(x\\) with mean \\(\\mu\\) and standard deviation \\(\\sigma > 0\\) has the density</p>' +
          '\\[ p(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} \\exp\\!\\left( -\\frac{(x-\\mu)^2}{2\\sigma^2} \\right). \\]' +
          '<p>The exponent is minus one half of the squared distance from the mean, with the distance measured in units of \\(\\sigma\\). The factor in front does not depend on \\(x\\). It makes the total area under the curve equal to 1. The notation is \\(x \\sim \\mathcal{N}(\\mu, \\sigma^2)\\), where \\(\\sigma^2\\) is the variance.</p>'
      },
      {
        kind: 'explore',
        title: 'Mean and standard deviation',
        html: '<p>The mean \\(\\mu\\) slides the curve along the axis without changing its shape. The standard deviation \\(\\sigma\\) stretches it horizontally. The peak height \\(1/(\\sigma\\sqrt{2\\pi})\\) falls in proportion so that the area stays 1. The purple arrow runs from the mean to the point where the curve changes from bending downwards to bending upwards, which lies exactly \\(\\sigma\\) away.</p>',
        mount: mountParams
      },
      {
        kind: 'exercise',
        title: 'Matching a curve',
        html: '<p>The dashed purple curve is a Gaussian with unknown parameters. Drag the two handles until the solid curve lies exactly on top of it.</p>',
        hint: 'First place the yellow handle under the peak of the dashed curve, at \\(x = 1\\). Then widen the curve with the blue handle until the peaks have the same height. The blue handle then sits at \\(x = \\mu + \\sigma = 2.5\\).',
        mount: mountMatch
      },
      {
        kind: 'explore',
        title: 'The 68-95-99.7 rule',
        html: '<p>The probability that \\(x\\) falls within \\(k\\) standard deviations of the mean, \\(P(|x-\\mu| \\le k\\sigma)\\), is the shaded area. It depends only on \\(k\\), not on \\(\\mu\\) or \\(\\sigma\\). For \\(k = 1, 2, 3\\) it is approximately 68 %, 95 % and 99.7 %.</p>',
        mount: mountRule
      },
      {
        kind: 'exercise',
        title: 'A 95 % interval',
        html: '<p>Drag the boundary until the symmetric interval around the mean holds 95 % of the probability, to within half a percentage point.</p>',
        hint: 'One standard deviation gives about 68 %, three give about 99.7 %. The required boundary is close to two standard deviations.',
        mount: mountNinetyFive
      },
      {
        kind: 'exercise',
        title: 'The rule in practice',
        html: '<p>Test scores are modelled as Gaussian with mean \\(\\mu = 100\\) and standard deviation \\(\\sigma = 15\\). About 95 % of scores lie between 70 and which value?</p>',
        hint: 'The 95 % interval is \\(\\mu \\pm 2\\sigma\\). The lower end is \\(100 - 2 \\cdot 15 = 70\\).',
        mount: mountScores
      },
      {
        kind: 'explore',
        title: 'The log-density',
        html: '<p>Taking the natural logarithm of the density removes the exponential:</p>' +
          '\\[ \\log p(x) = -\\frac{(x-\\mu)^2}{2\\sigma^2} - \\log\\!\\big(\\sigma\\sqrt{2\\pi}\\big). \\]' +
          '<p>This is a downward parabola in \\(x\\) with its vertex at \\(\\mu\\) and second derivative \\(-1/\\sigma^2\\). A small \\(\\sigma\\) gives a sharply curved parabola, a large \\(\\sigma\\) a flat one.</p>',
        mount: mountLog
      },
      {
        kind: 'exercise',
        title: 'Squared error',
        html: '<p>A model predicts a number \\(\\hat y\\), and the observed value \\(y\\) is treated as Gaussian with mean \\(\\hat y\\) and fixed standard deviation \\(\\sigma\\). Training makes the density \\(p(y)\\) of the observed value large, which is the same as making \\(-\\log p(y)\\) small (the maximum likelihood module explains why). Drag three tiles into the slots to assemble it.</p>',
        hint: 'Start from \\(\\log p(x)\\) in the previous step, replace \\(x\\) by \\(y\\) and \\(\\mu\\) by \\(\\hat y\\), and change every sign.',
        mount: mountNll
      },
      {
        kind: 'explore',
        title: 'Sums of many small effects',
        html: '<p>Let \\(S\\) be the sum of \\(n\\) independent small effects, each drawn uniformly from \\([-1, 1]\\). The histogram shows many such sums, each divided by the standard deviation of \\(S\\), which is \\(\\sqrt{n/3}\\). For \\(n = 1\\) the histogram is flat, for \\(n = 2\\) a triangle, and from about \\(n = 5\\) onwards it is close to the Gaussian. This is the central limit theorem, and it explains why measurement noise is so often modelled as Gaussian.</p>',
        mount: mountSums
      },
      {
        kind: 'exercise',
        title: 'Number of effects',
        html: '<p>Each of \\(n\\) independent effects is \\(+1\\) or \\(-1\\) with probability \\(\\tfrac12\\), so each has mean 0 and variance 1. Variances of independent variables add, so the sum \\(S\\) has variance \\(n\\) and standard deviation \\(\\sqrt{n}\\), and it is approximately Gaussian. Set \\(n\\) so that the band \\(\\pm 2\\sigma\\), which holds about 95 % of the sums, is exactly \\(\\pm 20\\), then press Check.</p>',
        hint: 'The condition is \\(2\\sqrt{n} = 20\\), so \\(\\sqrt{n} = 10\\).',
        mount: mountBand
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>A Gaussian \\(\\mathcal{N}(\\mu, \\sigma^2)\\) is fixed by its mean \\(\\mu\\), which sets the position, and its standard deviation \\(\\sigma\\), which sets the width. About 68 %, 95 % and 99.7 % of the probability lie within \\(1\\sigma\\), \\(2\\sigma\\) and \\(3\\sigma\\) of the mean.</li>' +
          '<li>The log-density is a parabola with curvature \\(-1/\\sigma^2\\), so making the Gaussian density of the data large, with \\(\\sigma\\) fixed, is the same as making the squared error small.</li>' +
          '<li>A sum of \\(n\\) independent small effects is approximately Gaussian, and its standard deviation grows like \\(\\sqrt{n}\\), not like \\(n\\).</li>' +
          '</ul>'
      }
    ]
  });
})();
