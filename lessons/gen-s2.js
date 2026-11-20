(function () {
  'use strict';

  var C = M4.colors;
  var G = M4.genData, U = G.ui;
  var TRAIN = G.TRAIN, VAL = G.VAL, fit = G.fit, pred = G.pred, mse = G.mse, legendre = G.legendre;
  var D = 11;

  /* ---------- helpers ---------- */
  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function sup(s) { return String(s).split('').map(function (c) { return SUP[c] || c; }).join(''); }
  function sci(x) {
    if (x >= 0.01) return x >= 1 ? x.toPrecision(2) : x.toPrecision(2).replace(/0+$/, '');
    var e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    if (m > 9.95) { m = 1; e++; }
    return m.toFixed(1) + ' × 10' + sup(e);
  }
  function tex(e) {
    var x = Math.pow(10, e);
    if (x >= 0.01) return String(+x.toPrecision(2));
    var k = Math.floor(e + 1e-9), m = Math.pow(10, e - k);
    return m.toFixed(1) + ' \\cdot 10^{' + k + '}';
  }
  function steps(v) { return Math.round(Math.pow(10, v)).toLocaleString('en-US'); }

  function barPlane(parent, n, ymin, ymax, h, lim) {
    lim = lim || Math.min(-ymin, ymax);
    var P = M4.plane(parent, { xmin: -0.8, xmax: n - 0.2, ymin: ymin, ymax: ymax, width: 520, height: h || 150, grid: false, axes: false, labels: false });
    P.line(-0.6, 0, n - 0.4, 0, { stroke: C.muted, width: 1.5, layer: 'bg' });
    var bars = [];
    for (var k = 0; k < n; k++) bars.push(M4.svg('rect', { fill: C.blue, rx: 2 }, P.g));
    P.setBars = function (vals, colorFn) {
      vals.forEach(function (v, k) {
        var c = Math.max(-lim, Math.min(lim, v));
        var y0 = P.y(0), y1 = P.y(c), x0 = P.x(k - 0.3), x1 = P.x(k + 0.3);
        bars[k].setAttribute('x', x0); bars[k].setAttribute('width', x1 - x0);
        bars[k].setAttribute('y', Math.min(y0, y1)); bars[k].setAttribute('height', Math.max(1, Math.abs(y1 - y0)));
        bars[k].setAttribute('fill', colorFn ? colorFn(v, k) : C.blue);
      });
    };
    return P;
  }

  /* ---------- ridge ---------- */
  var LAM_MIN = -8, LAM_MAX = 1;
  var RIDGE = [];
  for (var e0 = LAM_MIN; e0 <= LAM_MAX + 1e-9; e0 += 0.1) {
    var wr = fit(TRAIN[0], TRAIN[1], D, Math.pow(10, e0));
    RIDGE.push({ e: Math.round(e0 * 10) / 10, w: wr, tr: mse(wr, TRAIN[0], TRAIN[1]), va: mse(wr, VAL[0], VAL[1]) });
  }
  function ridgeAt(e) { return RIDGE[Math.round((e - LAM_MIN) * 10)]; }
  var RBEST = RIDGE.reduce(function (a, r) { return r.va < a.va ? r : a; }, RIDGE[0]);

  function ridgeScene(el, o) {
    o = o || {};
    var two = M4.el('div', { class: 'm4-two' }, el);
    var left = M4.el('div', null, two), right = M4.el('div', null, two);
    var P = U.dataPlane(left);
    U.dots(P, VAL, C.orange, 3);
    var curve = P.fn(function () { return NaN; }, { stroke: C.purple, width: 3.5, samples: 300 });
    U.dots(P, TRAIN, C.blue, 6);
    M4.el('div', { class: 'm4-cap', html: 'degree 11 fit, <span style="color:' + C.blue + '">training</span> and <span style="color:' + C.orange + '">validation</span> points' }, left);
    var E = U.errPlane(right, LAM_MAX - LAM_MIN, 'penalty strength λ', [0, 3, 6, 9], function (u) { return '10' + sup(u + LAM_MIN); });
    E.path(RIDGE.map(function (r) { return [r.e - LAM_MIN, U.lg(r.tr)]; }), { stroke: C.blue, width: 2.5 });
    E.path(RIDGE.map(function (r) { return [r.e - LAM_MIN, U.lg(r.va)]; }), { stroke: C.orange, width: 2.5 });
    var mark = E.line(0, U.LOGMIN, 0, U.LOGMAX, { stroke: C.purple, width: 2, dash: '5 5' });
    var mT = E.point(0, 0, { color: C.blue, r: 5 }), mV = E.point(0, 0, { color: C.orange, r: 5 });
    M4.el('div', { class: 'm4-cap', html: 'mean squared error, <span style="color:' + C.blue + '">training</span> and <span style="color:' + C.orange + '">validation</span>' }, right);

    var bw = M4.el('div', { style: 'max-width:520px;margin:14px auto 0' }, el);
    var B = barPlane(bw, D + 1, -5, 4.4, 170, 4.2);
    for (var k = 0; k <= D; k++) B.text(k, -4.75, 'w' + String.fromCharCode(8320 + (k % 10)).replace(/^/, k >= 10 ? '₁' : ''), { size: 15, fill: C.muted });
    B.line(-0.6, 4, D + 0.4, 4, { stroke: C.line, width: 1, dash: '3 4', layer: 'bg' });
    B.line(-0.6, -4, D + 0.4, -4, { stroke: C.line, width: 1, dash: '3 4', layer: 'bg' });
    M4.el('div', { class: 'm4-cap', html: 'the twelve coefficients, bars past ±4 are cut off and drawn in red' }, bw);

    var r1 = U.row(el);
    var cT = U.chip(r1, 'training error', C.blue), cV = U.chip(r1, 'validation error', C.orange);
    var cur = o.e == null ? LAM_MIN : o.e;
    function paint() {
      var r = ridgeAt(cur);
      curve.set(function (x) { return pred(r.w, x); });
      var u = r.e - LAM_MIN;
      mark.set(u, U.LOGMIN, u, U.LOGMAX);
      mT.set(u, U.lg(r.tr)); mV.set(u, U.lg(r.va));
      B.setBars(r.w, function (v) { return Math.abs(v) > 4 ? C.red : C.blue; });
      cT(U.errStr(r.tr)); cV(U.errStr(r.va));
      if (o.onChange) o.onChange(r);
    }
    M4.slider(U.ctl(el), { min: LAM_MIN, max: LAM_MAX, step: 0.1, value: cur, label: '\\(\\lambda\\)', format: function (v) { return sci(Math.pow(10, v)); }, onInput: function (v) { cur = v; paint(); } });
    paint();
  }

  /* ---------- early stopping: exact gradient descent through the eigenvectors of H ---------- */
  function jacobi(A) {
    var n = A.length, i, j, k;
    A = A.map(function (r) { return r.slice(); });
    var V = A.map(function (r, a) { return r.map(function (_, b) { return a === b ? 1 : 0; }); });
    for (var sw = 0; sw < 100; sw++) {
      var off = 0;
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
      if (off < 1e-24) break;
      for (var p = 0; p < n; p++) for (var q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-300) continue;
        var th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        var t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        var c = 1 / Math.sqrt(t * t + 1), s = t * c, x, y;
        for (k = 0; k < n; k++) { x = A[k][p]; y = A[k][q]; A[k][p] = c * x - s * y; A[k][q] = s * x + c * y; }
        for (k = 0; k < n; k++) { x = A[p][k]; y = A[q][k]; A[p][k] = c * x - s * y; A[q][k] = s * x + c * y; }
        for (k = 0; k < n; k++) { x = V[k][p]; y = V[k][q]; V[k][p] = c * x - s * y; V[k][q] = s * x + c * y; }
      }
    }
    return { vals: A.map(function (r, a) { return r[a]; }), V: V };
  }
  var ES = (function () {
    var X = TRAIN[0], Y = TRAIN[1], n = X.length, m = D + 1, i, j;
    var Phi = X.map(function (x) { return legendre(x, D); });
    var H = [], g = [];
    for (i = 0; i < m; i++) {
      H.push([]); g.push(0);
      for (j = 0; j < m; j++) { var s = 0; Phi.forEach(function (p) { s += p[i] * p[j]; }); H[i].push(s / n); }
      Phi.forEach(function (p, t) { g[i] += p[i] * Y[t] / n; });
    }
    var J = jacobi(H);
    var order = J.vals.map(function (_, k) { return k; }).sort(function (a, b) { return J.vals[b] - J.vals[a]; });
    var mu = order.map(function (k) { return J.vals[k]; });
    var vecs = order.map(function (k) { return J.V.map(function (r) { return r[k]; }); });
    var cs = vecs.map(function (v, k) { var s = 0; v.forEach(function (a, b) { s += a * g[b]; }); return s / mu[k]; });
    var eta = 1 / mu[0];
    function frac(t) { return mu.map(function (u) { return 1 - Math.pow(1 - eta * u, t); }); }
    function w(t) {
      var f = frac(t), out = new Array(m).fill(0);
      vecs.forEach(function (v, k) { for (var b = 0; b < m; b++) out[b] += f[k] * cs[k] * v[b]; });
      return out;
    }
    return { mu: mu, eta: eta, frac: frac, w: w };
  })();
  var T_MAX = 7;
  var ESC = [];
  for (var v0 = 0; v0 <= T_MAX + 1e-9; v0 += 0.05) {
    var we = ES.w(Math.round(Math.pow(10, v0)));
    ESC.push({ v: Math.round(v0 * 100) / 100, w: we, tr: mse(we, TRAIN[0], TRAIN[1]), va: mse(we, VAL[0], VAL[1]) });
  }
  function esAt(v) { return ESC[Math.round(v / 0.05)]; }
  var EBEST = ESC.reduce(function (a, r) { return r.va < a.va ? r : a; }, ESC[0]);

  function esScene(el, o, ctx) {
    o = o || {};
    var two = M4.el('div', { class: 'm4-two' }, el);
    var left = M4.el('div', null, two), right = M4.el('div', null, two);
    var P = U.dataPlane(left);
    U.dots(P, VAL, C.orange, 3);
    var curve = P.fn(function () { return NaN; }, { stroke: C.purple, width: 3.5, samples: 300 });
    U.dots(P, TRAIN, C.blue, 6);
    M4.el('div', { class: 'm4-cap', html: 'degree 11 fit after some steps of gradient descent' }, left);
    var E = U.errPlane(right, T_MAX, 'gradient descent steps', [0, 2, 4, 6], function (u) { return u === 0 ? '1' : u === 2 ? '100' : '10' + sup(u); });
    var pT = E.path([], { stroke: C.blue, width: 2.5 }), pV = E.path([], { stroke: C.orange, width: 2.5 });
    var mark = E.line(0, U.LOGMIN, 0, U.LOGMAX, { stroke: C.purple, width: 2, dash: '5 5' });
    M4.el('div', { class: 'm4-cap', html: 'mean squared error, <span style="color:' + C.blue + '">training</span> and <span style="color:' + C.orange + '">validation</span>' }, right);

    var bw = M4.el('div', { style: 'max-width:520px;margin:14px auto 0' }, el);
    var B = barPlane(bw, D + 1, -0.12, 1.08, 130, 1.05);
    B.line(-0.6, 1, D + 0.4, 1, { stroke: C.line, width: 1, dash: '3 4', layer: 'bg' });
    B.text(-0.05, -0.11, 'steep', { size: 15, fill: C.muted, anchor: 'start' });
    B.text(D + 0.05, -0.11, 'flat', { size: 15, fill: C.muted, anchor: 'end' });
    M4.el('div', { class: 'm4-cap', html: 'how much of each eigenvector direction has been fitted, from the steepest to the flattest' }, bw);

    var r1 = U.row(el);
    var cT = U.chip(r1, 'training error', C.blue), cV = U.chip(r1, 'validation error', C.orange);
    var cur = 0, far = 0;
    function paint() {
      var r = esAt(cur);
      far = Math.max(far, cur);
      curve.set(function (x) { return pred(r.w, x); });
      var seen = ESC.filter(function (q) { return q.v <= far + 1e-9; });
      pT.set(seen.map(function (q) { return [q.v, U.lg(q.tr)]; }));
      pV.set(seen.map(function (q) { return [q.v, U.lg(q.va)]; }));
      mark.set(r.v, U.LOGMIN, r.v, U.LOGMAX);
      B.setBars(ES.frac(Math.round(Math.pow(10, r.v))), function (f) { return f > 0.95 ? C.green : C.blue; });
      cT(U.errStr(r.tr)); cV(U.errStr(r.va));
      if (o.onChange) o.onChange(r);
    }
    var ctl = U.ctl(el);
    var sl = M4.slider(ctl, { min: 0, max: T_MAX, step: 0.05, value: 0, label: 'steps', format: steps, onInput: function (v) { stop(); cur = v; paint(); } });
    var raf = null;
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; play.textContent = 'Train'; }
    var r2 = U.row(el);
    var play = M4.button(r2, 'Train', function () {
      if (raf) { stop(); return; }
      if (cur >= T_MAX - 1e-9) { cur = 0; }
      play.textContent = 'Pause';
      var last = null;
      function tick(ts) {
        if (last == null) last = ts;
        cur = Math.min(T_MAX, cur + (ts - last) / 1000 * 1.0);
        last = ts;
        var q = Math.round(cur / 0.05) * 0.05;
        sl.set(q); var keep = cur; cur = q; paint(); cur = keep;
        if (keep >= T_MAX) { cur = T_MAX; stop(); return; }
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    });
    if (ctx && ctx.onCleanup) ctx.onCleanup(stop);
    paint();
    return { get: function () { return esAt(Math.round(cur / 0.05) * 0.05); } };
  }

  /* ---------- weight decay practice ---------- */
  function num(x) { return M4.fmt(x, 2).replace(/\.?0+$/, '') || '0'; }
  function gen() {
    var w = M4.pick([2, -1.5, 3, 1.2, -2.5, 0.8]);
    var eta = M4.pick([0.1, 0.05, 0.2]);
    var lam = M4.pick([0.05, 0.1, 0.25, 0.5]);
    if (M4.rand(0, 2) > 0) {
      var g = M4.pick([0.4, -0.6, 1.5, -1, 0.2]);
      var ans = w - eta * (g + 2 * lam * w);
      return {
        q: 'A weight is \\(w = ' + num(w) + '\\). Its data gradient is \\(\\partial L_{\\text{data}}/\\partial w = ' + num(g) + '\\), the learning rate is \\(\\eta = ' + num(eta) + '\\) and the weight decay is \\(\\lambda = ' + num(lam) + '\\). What is \\(w\\) after one step?',
        answer: ans, tol: 0.006,
        hint: 'Compute \\(w - \\eta\\,(g + 2\\lambda w)\\).',
        explain: '\\(' + num(w) + ' - ' + num(eta) + '\\,(' + num(g) + ' + 2 \\cdot ' + num(lam) + ' \\cdot ' + num(w) + ') = ' + M4.fmt(ans, 3) + '\\)'
      };
    }
    var N = M4.pick([10, 20, 50]);
    var f = 1 - 2 * eta * lam, ans2 = w * Math.pow(f, N);
    return {
      q: 'A weight \\(w = ' + num(w) + '\\) gets no gradient from the data at all. With learning rate \\(\\eta = ' + num(eta) + '\\) and weight decay \\(\\lambda = ' + num(lam) + '\\), what is it after ' + N + ' steps?',
      answer: ans2, tol: 0.006,
      hint: 'Each step multiplies the weight by \\(1 - 2\\eta\\lambda\\).',
      explain: 'Each step multiplies by \\(1 - 2 \\cdot ' + num(eta) + ' \\cdot ' + num(lam) + ' = ' + M4.fmt(f, 3) + '\\), so \\(w = ' + num(w) + ' \\cdot ' + M4.fmt(f, 3) + '^{' + N + '} = ' + M4.fmt(ans2, 3) + '\\).'
    };
  }

  M4.lesson({
    id: 'gen-s2',
    module: 'generalisation',
    title: 'Regularization and early stopping',
    summary: 'Keeping a flexible model and stopping it from fitting noise, with a weight penalty or by ending training early.',
    minutes: 16,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>The last lesson cured overfitting with a smaller model. Deep learning goes the other way. It keeps very large models and holds them back by other means. After this lesson you can</p>' +
          '<ul><li>add a weight penalty to a loss and explain what its strength \\(\\lambda\\) does,</li>' +
          '<li>compute a gradient step with weight decay,</li>' +
          '<li>explain why stopping gradient descent early works like a penalty.</li></ul>'
      },
      {
        kind: 'text',
        title: 'Large coefficients',
        html: '<p>Take the degree 11 polynomial through the twelve points from the last lesson. We write it in the Legendre polynomials \\(P_0, \\dots, P_{11}\\), a standard set of polynomials on \\([-1, 1]\\) that behaves better numerically than the powers \\(x^k\\):</p>' +
          '\\[ \\hat f(x) = \\sum_{k=0}^{11} w_k\\, P_k(x). \\]' +
          '<p>Its coefficients reach 17, while the curve it should describe stays between \\(-2\\) and \\(2\\). Large terms of opposite sign nearly cancel at the training points and swing apart between them. A smooth curve gets by with small coefficients, so we charge a price for large ones:</p>' +
          '\\[ L(w) = \\frac1n \\sum_{i=1}^{n} \\big(\\hat f(x_i) - y_i\\big)^2 \\; + \\; \\lambda \\sum_{k} w_k^2. \\]' +
          '<p>This is <b>ridge regression</b>, also called \\(L_2\\) regularization. The strength \\(\\lambda \\ge 0\\) is a setting we choose, like the degree before.</p>'
      },
      {
        kind: 'explore',
        title: 'Turning up the penalty',
        html: '<p>Move \\(\\lambda\\) from \\(10^{-8}\\) to \\(10\\). The bars below the plots show the twelve coefficients of the fit.</p>',
        mount: function (el) { ridgeScene(el); }
      },
      {
        kind: 'exercise',
        title: 'The best penalty',
        html: '<p>Find the \\(\\lambda\\) with the lowest validation error, then keep it.</p>',
        hint: 'The validation curve on the right has one valley. Put the purple line at its bottom.',
        mount: function (el, ctx) {
          var cur = ridgeAt(LAM_MIN), done = false;
          ridgeScene(el, { onChange: function (r) { cur = r; } });
          M4.button(U.row(el), 'Keep this λ', function () {
            if (done) return;
            if (cur.va < RBEST.va + 0.004) {
              done = true;
              ctx.solved('At \\(\\lambda = ' + tex(cur.e) + '\\) the validation error is ' + U.errStr(cur.va) + ', and all twelve coefficients are small.');
            } else if (cur.e < RBEST.e) {
              ctx.wrong('The validation error is ' + U.errStr(cur.va) + '. The penalty is too weak and the fit still follows the noise.');
            } else {
              ctx.wrong('The validation error is ' + U.errStr(cur.va) + '. The penalty is so strong that the fit can no longer follow the curve.');
            }
          }, { primary: true });
        }
      },
      {
        kind: 'text',
        title: 'What the penalty does',
        html: '<p>For \\(\\lambda\\) near zero the penalty has no effect and the fit overfits. For large \\(\\lambda\\) every coefficient is pushed to zero and the fit flattens out, which underfits. In between, the penalty removes the coefficients that only served the noise and keeps the few that describe the curve.</p>' +
          '<p>The best penalty reaches a validation error of ' + U.errStr(RBEST.va) + ' with all twelve coefficients, not far from the 0.046 of the cubic from the last lesson. We no longer pick which terms to keep. The data decides, and we tune one number.</p>'
      },
      {
        kind: 'text',
        title: 'Weight decay',
        html: '<p>The same penalty is also called <b>weight decay</b>. The gradient of \\(\\lambda \\sum_k w_k^2\\) with respect to \\(w_k\\) is \\(2\\lambda w_k\\), so a gradient step becomes</p>' +
          '\\[ w \\leftarrow w - \\eta\\big(\\nabla L_{\\text{data}}(w) + 2\\lambda w\\big) = (1 - 2\\eta\\lambda)\\, w \\; - \\; \\eta\\, \\nabla L_{\\text{data}}(w). \\]' +
          '<p>Every step first shrinks each weight by the factor \\(1 - 2\\eta\\lambda\\), slightly below 1, and then takes the ordinary step. A weight that the data does not pull on decays toward zero. Only weights that keep earning their size survive.</p>'
      },
      {
        kind: 'exercise',
        title: 'Steps with weight decay',
        html: '<p>Compute the weight after the update. Answers to three decimals are accepted.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 3, gen: gen }); }
      },
      {
        kind: 'explore',
        title: 'Training for longer',
        html: '<p>Now there is no penalty. We train the degree 11 polynomial by gradient descent on the training error, starting from all coefficients zero. Press Train, or move the number of steps yourself. The step axis is logarithmic.</p>',
        mount: function (el, ctx) { esScene(el, {}, ctx); }
      },
      {
        kind: 'exercise',
        title: 'When to stop',
        html: '<p>Stop training where the validation error is lowest.</p>',
        hint: 'Train until the orange curve turns upward, then move the steps back to its lowest point.',
        mount: function (el, ctx) {
          var done = false;
          var s = esScene(el, {}, ctx);
          M4.button(U.row(el), 'Stop here', function () {
            if (done) return;
            var r = s.get();
            if (r.va < EBEST.va + 0.004) {
              done = true;
              ctx.solved('After ' + steps(r.v) + ' steps the validation error is ' + U.errStr(r.va) + ', better than the ' + U.errStr(ESC[ESC.length - 1].va) + ' you get by training to the end.');
            } else if (r.v < EBEST.v) {
              ctx.wrong('After ' + steps(r.v) + ' steps the fit has not yet found the shape of the curve. Validation error ' + U.errStr(r.va) + '.');
            } else {
              ctx.wrong('After ' + steps(r.v) + ' steps the fit has started on the noise. Validation error ' + U.errStr(r.va) + '.');
            }
          }, { primary: true });
        }
      },
      {
        kind: 'text',
        title: 'Why stopping early works',
        html: '<p>The training error is a quadratic bowl in \\(w\\), with curvature matrix \\(H\\). Its eigenvalues \\(\\mu\\) run from about \\(1\\) down to \\(2 \\cdot 10^{-6}\\). Along an eigenvector with eigenvalue \\(\\mu\\), each step of gradient descent shrinks the distance to the minimum by the factor \\(1 - \\eta\\mu\\). After \\(t\\) steps the fraction</p>' +
          '\\[ 1 - (1 - \\eta\\mu)^t \\]' +
          '<p>of that direction is fitted. These are the bars in the last two plots. Steep directions with large \\(\\mu\\) are broad shapes on which all twelve points agree, and they are fitted within a few steps. Flat directions with tiny \\(\\mu\\) are wiggles that only a few points care about, mostly noise, and they need around \\(1/(\\eta\\mu)\\) steps, here several hundred thousand. Stopping after about ten steps keeps the first kind and skips the second.</p>' +
          '<p>The ridge penalty acts in a similar way. It scales the fitted part of each direction by \\(\\mu/(\\mu + \\lambda)\\), which also hits the flat directions hardest.</p>'
      },
      {
        kind: 'text',
        title: 'Other regularizers',
        html: '<p>Anything that keeps a model from fitting the noise counts as regularization. These appear in almost every deep learning project:</p>' +
          '<ul><li><b>More data</b>, the most reliable cure. <b>Data augmentation</b> creates extra examples by changes that keep the label, such as flipping or cropping an image.</li>' +
          '<li><b>Dropout</b> sets a random fraction of the hidden units to zero in every training step, so no unit can rely on one particular partner.</li>' +
          '<li><b>Weight decay</b> and <b>early stopping</b>, as in this lesson.</li></ul>' +
          '<p>For each of them the strength is a setting, chosen on the validation set.</p>'
      },
      {
        kind: 'exercise',
        title: 'A diagnosis',
        html: '<p>A model reaches a training error of 0.2% and a validation error of 9%. The best possible error on this task is about 1%. Which change is most likely to help?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: [
              'Increase the weight decay',
              'Train for more steps',
              'Add more hidden units',
              'Turn off the weight decay'
            ],
            correct: 0,
            onCorrect: function () { ctx.solved('Training error is far below the best possible error and validation error is far above it. The model overfits, so it needs more regularization, not more capacity or more training.'); },
            onWrong: function () { ctx.wrong('Compare both errors with the best possible 1%. Is the model too weak or too free?'); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>A weight penalty \\(\\lambda \\sum_k w_k^2\\) keeps a flexible model smooth. Small \\(\\lambda\\) overfits, large \\(\\lambda\\) underfits, and the validation set picks the value in between.</li>' +
          '<li>In gradient descent the penalty becomes weight decay, which multiplies every weight by \\(1 - 2\\eta\\lambda\\) in each step.</li>' +
          '<li>Gradient descent fits steep directions first and flat, noisy directions last, so stopping at the minimum of the validation error regularizes for free.</li></ul>'
      }
    ]
  });
})();
