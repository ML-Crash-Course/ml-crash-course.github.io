(function () {
  'use strict';

  var C = M4.colors;

  /* ---------- shared numerics (also used by gen-s2) ---------- */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function truef(x) { return Math.sin(2.5 * x) + 0.3 * x; }
  function legendre(x, d) {
    var P = [1, x];
    for (var k = 1; k < d; k++) P.push(((2 * k + 1) * x * P[k] - k * P[k - 1]) / (k + 1));
    return P.slice(0, d + 1);
  }
  function solve(A, b) {
    var n = b.length, i, j, k;
    A = A.map(function (r) { return r.slice(); }); b = b.slice();
    for (i = 0; i < n; i++) {
      var p = i;
      for (j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
      var t = A[i]; A[i] = A[p]; A[p] = t; t = b[i]; b[i] = b[p]; b[p] = t;
      for (j = i + 1; j < n; j++) {
        var f = A[j][i] / A[i][i];
        for (k = i; k < n; k++) A[j][k] -= f * A[i][k];
        b[j] -= f * b[i];
      }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) { var s = b[i]; for (k = i + 1; k < n; k++) s -= A[i][k] * x[k]; x[i] = s / A[i][i]; }
    return x;
  }
  /* least squares in the Legendre basis, with optional ridge penalty lam * sum w_k^2 (per data point) */
  function fit(X, Y, d, lam) {
    var m = d + 1, A = [], b = [], i, j;
    for (i = 0; i < m; i++) { A.push(new Array(m).fill(0)); b.push(0); }
    X.forEach(function (x, t) {
      var p = legendre(x, d);
      for (i = 0; i < m; i++) { b[i] += p[i] * Y[t]; for (j = 0; j < m; j++) A[i][j] += p[i] * p[j]; }
    });
    for (i = 0; i < m; i++) A[i][i] += (lam || 0) * X.length + 1e-10;
    return solve(A, b);
  }
  function pred(w, x) { var p = legendre(x, w.length - 1), s = 0; for (var i = 0; i < w.length; i++) s += p[i] * w[i]; return s; }
  function mse(w, X, Y) { var s = 0; for (var i = 0; i < X.length; i++) { var e = pred(w, X[i]) - Y[i]; s += e * e; } return s / X.length; }
  function gridData(seed, n, sig) {
    var r = rng(seed), X = [], Y = [];
    for (var i = 0; i < n; i++) { var x = -1 + 2 * (i + 0.5) / n + (r() - 0.5) * 1.6 / n; X.push(x); Y.push(truef(x) + sig * gauss(r)); }
    return [X, Y];
  }
  function uniData(seed, n, sig) {
    var r = rng(seed), X = [], Y = [];
    for (var i = 0; i < n; i++) { var x = -1 + 2 * r(); X.push(x); Y.push(truef(x) + sig * gauss(r)); }
    return [X, Y];
  }
  var TRAIN = gridData(16, 12, 0.25), VAL = uniData(4242, 100, 0.25), POOL = uniData(21, 120, 0.25);
  M4.genData = { rng: rng, gauss: gauss, truef: truef, legendre: legendre, solve: solve, fit: fit, pred: pred, mse: mse, gridData: gridData, uniData: uniData, TRAIN: TRAIN, VAL: VAL };

  function f(v, d) { return M4.fmt(v, d == null ? 3 : d); }
  function errStr(v) { return v > 99 ? M4.fmt(v, 0) : v >= 10 ? M4.fmt(v, 1) : M4.fmt(v, 3); }
  function chip(parent, label, color) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    var l = M4.el('span', { text: label + ' ' }, r);
    l.style.fontWeight = '700';
    if (color) l.style.color = color;
    var v = M4.el('span', { text: '' }, r);
    return function (t) { v.textContent = t; };
  }
  function row(el) { return M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el); }
  function ctl(el) { return M4.el('div', { style: 'max-width:420px;margin:8px auto 0' }, el); }

  function dataPlane(parent, o) {
    o = o || {};
    var P = M4.plane(parent, { xmin: -1.1, xmax: 1.1, ymin: -2, ymax: 2, width: o.width || 420, height: o.height || 340, labels: false });
    P.fn(truef, { stroke: C.muted, width: 2, dash: '6 6', layer: 'bg' });
    return P;
  }
  function dots(P, D, color, r, hollow) {
    for (var i = 0; i < D[0].length; i++) {
      var pt = P.point(D[0][i], D[1][i], { color: color, r: r || 5 });
      if (hollow && pt.el) { pt.el.setAttribute('fill', C.card); pt.el.setAttribute('stroke', color); pt.el.setAttribute('stroke-width', 2); }
    }
  }
  function clampFn(w) { return function (x) { return pred(w, x); }; }

  /* error curves on a log scale */
  var LOGMIN = -3, LOGMAX = 2;
  function lg(v) { return Math.max(LOGMIN, Math.min(LOGMAX, Math.log10(Math.max(v, 1e-9)))); }
  function errPlane(parent, xmax, xlabel, ticks, tickFmt) {
    var span = xmax + 0.6;
    var P = M4.plane(parent, { xmin: -0.34 * span, xmax: xmax + 0.6, ymin: LOGMIN - 1.05, ymax: LOGMAX + 0.35, width: 380, height: 340, grid: false, axes: false, labels: false });
    [-3, -2, -1, 0, 1, 2].forEach(function (k) {
      P.line(-0.2, k, xmax + 0.3, k, { stroke: C.line, width: 1, layer: 'bg' });
      P.text(-0.04 * span, k - 0.12, ['0.001', '0.01', '0.1', '1', '10', '100'][k + 3], { size: 19, fill: C.muted, anchor: 'end' });
    });
    (ticks || []).forEach(function (t) { P.text(t, LOGMIN - 0.42, tickFmt ? tickFmt(t) : String(t), { size: 19, fill: C.muted }); });
    P.text(xmax / 2, LOGMIN - 0.92, xlabel, { size: 20, fill: C.muted });
    return P;
  }

  M4.genData.ui = { chip: chip, row: row, ctl: ctl, dataPlane: dataPlane, dots: dots, errPlane: errPlane, lg: lg, errStr: errStr, LOGMIN: LOGMIN, LOGMAX: LOGMAX };

  /* ---------- degree scene ---------- */
  var DEG_ERR = [];
  for (var d0 = 0; d0 <= 11; d0++) { var w0 = fit(TRAIN[0], TRAIN[1], d0); DEG_ERR.push([mse(w0, TRAIN[0], TRAIN[1]), mse(w0, VAL[0], VAL[1])]); }

  function degreeScene(el, o) {
    o = o || {};
    var two = M4.el('div', { class: 'm4-two' }, el);
    var left = M4.el('div', null, two), right = M4.el('div', null, two);
    var P = dataPlane(left);
    if (o.showVal !== false) dots(P, VAL, C.orange, 3, false);
    var curve = P.fn(function () { return NaN; }, { stroke: C.purple, width: 3.5, samples: 300 });
    dots(P, TRAIN, C.blue, 6);
    M4.el('div', { class: 'm4-cap', html: '<span style="color:' + C.blue + '">training points</span>, <span style="color:' + C.orange + '">validation points</span>, dashed true curve' }, left);
    var E = errPlane(right, 11, 'polynomial degree', [0, 3, 6, 9]);
    E.path(DEG_ERR.map(function (e, k) { return [k, lg(e[0])]; }), { stroke: C.blue, width: 2.5 });
    var valPath = E.path([], { stroke: C.orange, width: 2.5 });
    DEG_ERR.forEach(function (e, k) { E.point(k, lg(e[0]), { color: C.blue, r: 3.5 }); });
    var valDots = DEG_ERR.map(function (e, k) { var p = E.point(k, lg(e[1]), { color: C.orange, r: 3.5 }); p.el.style.opacity = 0; return p; });
    var mark = E.line(0, LOGMIN, 0, LOGMAX, { stroke: C.purple, width: 2, dash: '5 5' });
    M4.el('div', { class: 'm4-cap', html: 'mean squared error, <span style="color:' + C.blue + '">training</span> and <span style="color:' + C.orange + '">validation</span>' }, right);
    var r1 = row(el);
    var cT = chip(r1, 'training error', C.blue), cV = chip(r1, 'validation error', C.orange);
    var seen = {};
    var deg = o.degree == null ? 1 : o.degree;
    function paint() {
      var w = fit(TRAIN[0], TRAIN[1], deg);
      curve.set(clampFn(w));
      seen[deg] = true;
      valDots.forEach(function (p, k) { p.el.style.opacity = seen[k] ? 1 : 0; });
      var pts = []; for (var k = 0; k <= 11; k++) if (seen[k]) pts.push([k, lg(DEG_ERR[k][1])]);
      valPath.set(pts.length > 1 ? pts : []);
      mark.set(deg, LOGMIN, deg, LOGMAX);
      cT(errStr(DEG_ERR[deg][0])); cV(errStr(DEG_ERR[deg][1]));
      if (o.onChange) o.onChange(deg);
    }
    M4.slider(ctl(el), { min: 0, max: 11, step: 1, value: deg, label: 'degree of the polynomial', onInput: function (v) { deg = v; paint(); } });
    paint();
  }
  var BEST = 0;
  DEG_ERR.forEach(function (e, k) { if (e[1] < DEG_ERR[BEST][1]) BEST = k; });

  /* ---------- more data ---------- */
  function dataScene(el) {
    var P = dataPlane(el, { width: 520, height: 360 });
    dots(P, VAL, C.orange, 3);
    var curve = P.fn(function () { return NaN; }, { stroke: C.purple, width: 3.5, samples: 300 });
    var g = M4.svg('g', {}, P.g);
    var r1 = row(el);
    var cT = chip(r1, 'training error', C.blue), cV = chip(r1, 'validation error', C.orange);
    var n = 12;
    function paint() {
      var X = POOL[0].slice(0, n), Y = POOL[1].slice(0, n), w = fit(X, Y, 9);
      curve.set(clampFn(w));
      while (g.firstChild) g.removeChild(g.firstChild);
      for (var i = 0; i < n; i++) M4.svg('circle', { cx: P.x(X[i]), cy: P.y(Y[i]), r: 5, fill: C.blue }, g);
      cT(errStr(mse(w, X, Y))); cV(errStr(mse(w, VAL[0], VAL[1])));
    }
    M4.slider(ctl(el), { min: 12, max: 120, step: 1, value: n, label: 'number of training points \\(n\\)', onInput: function (v) { n = v; paint(); } });
    paint();
  }

  /* ---------- bias and variance ---------- */
  var BV_SETS = [];
  for (var k0 = 0; k0 < 20; k0++) BV_SETS.push(gridData(500 + k0, 12, 0.25));
  function bvScene(el) {
    var P = dataPlane(el, { width: 520, height: 360 });
    var thin = [];
    for (var k = 0; k < 20; k++) thin.push(P.fn(function () { return NaN; }, { stroke: C.purple, width: 1.3, samples: 160 }));
    thin.forEach(function (c) { if (c.el) c.el.style.opacity = 0.35; });
    var mean = P.fn(function () { return NaN; }, { stroke: C.ink, width: 3.5, samples: 200 });
    M4.el('div', { class: 'm4-cap', html: '20 fits on 20 fresh training sets, their <b>average</b> in black, the true curve dashed' }, el);
    var r1 = row(el);
    var cB = chip(r1, 'bias²', C.ink), cVar = chip(r1, 'variance', C.purple);
    var deg = 1;
    function paint() {
      var W = BV_SETS.map(function (D) { return fit(D[0], D[1], deg); });
      W.forEach(function (w, k) { thin[k].set(clampFn(w)); });
      mean.set(function (x) { var s = 0; W.forEach(function (w) { s += pred(w, x); }); return s / W.length; });
      var b = 0, v = 0, N = 41;
      for (var i = 0; i < N; i++) {
        var x = -0.9 + 1.8 * i / (N - 1), ps = W.map(function (w) { return pred(w, x); });
        var m = ps.reduce(function (a, c) { return a + c; }, 0) / ps.length;
        b += Math.pow(m - truef(x), 2);
        v += ps.reduce(function (a, c) { return a + (c - m) * (c - m); }, 0) / ps.length;
      }
      cB(f(b / N)); cVar(f(v / N));
    }
    M4.slider(ctl(el), { min: 0, max: 9, step: 1, value: deg, label: 'degree of the polynomial', onInput: function (v) { deg = v; paint(); } });
    paint();
  }

  /* ---------- diagnosis practice ---------- */
  var OPTS = [
    'Underfitting. Use a more flexible model or train longer.',
    'Overfitting. Get more data, regularize or use a simpler model.',
    'Both errors are close to the noise level. The model is fine.'
  ];
  function gen() {
    var k = M4.rand(0, 2), tr, va, fl = M4.pick([0.05, 0.1, 0.2]);
    if (k === 0) { tr = fl * M4.pick([6, 8, 10]); va = tr * M4.pick([1.05, 1.1, 1.15]); }
    else if (k === 1) { tr = fl * M4.pick([0.1, 0.2, 0.4]); va = fl * M4.pick([5, 8, 12]); }
    else { tr = fl * M4.pick([0.9, 0.95]); va = fl * M4.pick([1.05, 1.1, 1.2]); }
    var model = M4.pick(['A regression model', 'A small network', 'A polynomial fit', 'A random forest']);
    return {
      q: model + ' reaches a training error of \\(' + tr.toFixed(3) + '\\) and a validation error of \\(' + va.toFixed(3) + '\\). Repeating a measurement of the target gives an error of about \\(' + fl.toFixed(2) + '\\), which no model can beat. What is the diagnosis?',
      options: OPTS, answer: k,
      explain: ['Training error is far above the noise level, so the model cannot even fit the data it sees.',
        'Training error is below the noise level and validation error is far above it. The model has memorized noise.',
        'Both errors sit near the noise level and close to each other.'][k]
    };
  }

  M4.lesson({
    id: 'gen-s1',
    module: 'generalisation',
    title: 'Overfitting and validation',
    summary: 'Why a model that fits its training data perfectly can still predict badly, and how a held out set detects it.',
    minutes: 17,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>A model is trained on one set of examples and used on new ones. Low training error is not the goal. The goal is low error on data the model has never seen. After this lesson you can</p>' +
          '<ul><li>recognize underfitting and overfitting in a plot of training and validation error,</li>' +
          '<li>explain why more data tames a flexible model,</li>' +
          '<li>describe the bias and variance of a learning method, and use a validation set to choose a model.</li></ul>'
      },
      {
        kind: 'text',
        title: 'Twelve noisy points',
        html: '<p>Twelve points are drawn from a smooth curve \\(f\\), and each one carries noise of standard deviation \\(\\sigma = 0.25\\):</p>' +
          '\\[ y_i = f(x_i) + \\varepsilon_i, \\qquad \\varepsilon_i \\sim \\mathcal N(0, \\sigma^2). \\]' +
          '<p>We fit a polynomial of degree \\(d\\) by least squares. Degree \\(d\\) has \\(d + 1\\) coefficients, so the degree controls how flexible the model is. To judge a fit we also keep 100 <b>validation points</b> from the same curve that are never used for fitting.</p>'
      },
      {
        kind: 'explore',
        title: 'Choosing a degree',
        html: '<p>Move the degree from 0 to 11. The right plot records the training error for every degree and the validation error for every degree you visit, on a logarithmic scale.</p>',
        mount: function (el) { degreeScene(el); }
      },
      {
        kind: 'text',
        title: 'Two ways to fail',
        html: '<p>At degree 0 or 1 the model is too rigid to follow the curve. Training and validation error are both high. This is <b>underfitting</b>.</p>' +
          '<p>At degree 11 the polynomial has 12 coefficients for 12 points, so it passes through every point and the training error is zero. Between the points it swings wildly, and the validation error explodes. This is <b>overfitting</b>. The model has learned the noise \\(\\varepsilon_i\\) of these particular points, which says nothing about new points.</p>' +
          '<p>Training error only falls as the model grows. Validation error falls, reaches a minimum and rises again. The model to keep is the one at the bottom of that valley.</p>'
      },
      {
        kind: 'exercise',
        title: 'The best degree',
        html: '<p>Find the degree with the lowest validation error, then keep it.</p>',
        hint: 'Visit every degree once, then read the orange curve on the right.',
        mount: function (el, ctx) {
          var done = false, cur = 0;
          degreeScene(el, { degree: 0, onChange: function (d) { cur = d; } });
          var r = row(el);
          M4.button(r, 'Keep this degree', function () {
            if (done) return;
            if (cur === BEST) {
              done = true;
              ctx.solved('Degree ' + BEST + ' has validation error ' + errStr(DEG_ERR[BEST][1]) + '. A cubic already captures the shape of the curve, and every further coefficient mostly fits noise.');
            } else if (DEG_ERR[cur][0] < DEG_ERR[BEST][0]) {
              ctx.wrong('Degree ' + cur + ' fits the training points better, but its validation error ' + errStr(DEG_ERR[cur][1]) + ' is higher. Judge by the orange curve.');
            } else {
              ctx.wrong('Degree ' + cur + ' is too rigid. Its validation error is ' + errStr(DEG_ERR[cur][1]) + '. Try a more flexible model.');
            }
          }, { primary: true });
        }
      },
      {
        kind: 'explore',
        title: 'More data',
        html: '<p>The degree is fixed at 9, which badly overfits 12 points. Add training points and follow the validation error.</p>',
        mount: function (el) { dataScene(el); }
      },
      {
        kind: 'text',
        title: 'Flexibility is relative',
        html: '<p>A degree 9 polynomial has 10 coefficients. With 12 points the data barely pins them down, and the noise decides the rest. With 120 points the noise of individual points averages out and the same model fits the curve well.</p>' +
          '<p>Whether a model overfits depends on its flexibility <i>compared to the amount of data</i>. This is why large neural networks need very large datasets.</p>'
      },
      {
        kind: 'explore',
        title: 'Bias and variance',
        html: '<p>Imagine collecting the training set again and again. Each new set of 12 points gives a different fit. The average of the fits shows what the method gets right on average, and the spread shows how much it depends on the particular sample.</p>',
        mount: function (el) { bvScene(el); }
      },
      {
        kind: 'text',
        title: 'The decomposition',
        html: '<p>For squared error the expected error at a point \\(x\\), averaged over training sets \\(D\\) and fresh noise, splits into three parts:</p>' +
          '\\[ \\mathbb E\\big[(y - \\hat f_D(x))^2\\big] = \\underbrace{\\big(\\bar f(x) - f(x)\\big)^2}_{\\text{bias}^2} + \\underbrace{\\mathbb E\\big[(\\hat f_D(x) - \\bar f(x))^2\\big]}_{\\text{variance}} + \\underbrace{\\sigma^2}_{\\text{noise}}, \\]' +
          '<p>where \\(\\bar f(x) = \\mathbb E_D[\\hat f_D(x)]\\) is the average fit. A rigid model has high bias and low variance. A flexible model has low bias and high variance. The noise term stays whatever the model.</p>' +
          '<p>In the explorer the bias drops sharply from degree 2 to 3 and stays near zero, while the variance keeps growing with the degree.</p>'
      },
      {
        kind: 'exercise',
        title: 'Reading the errors',
        html: '<p>Diagnose each model from its errors.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: gen }); }
      },
      {
        kind: 'text',
        title: 'Training, validation and test',
        html: '<p>Choosing the degree with the validation set is itself a kind of fitting. If we try a hundred models and keep the best on validation, its validation error is optimistic, because some of its luck is noise in the validation set.</p>' +
          '<p>Practice therefore uses three sets. The <b>training set</b> fits the parameters. The <b>validation set</b> chooses the degree, the learning rate and every other setting. The <b>test set</b> is touched once, at the very end, to report the error on new data.</p>' +
          '<p>When data is scarce, <b>\\(k\\)-fold cross validation</b> splits the data into \\(k\\) parts, trains \\(k\\) times with a different part held out, and averages the \\(k\\) validation errors.</p>'
      },
      {
        kind: 'exercise',
        title: 'Using the test set',
        html: '<p>A team tunes 40 settings of a model and keeps the one with the best <b>test</b> error, which is 4.1%. Which statement is right?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: [
              'The error on new data is probably above 4.1%, since the test set was used to choose',
              'The error on new data is probably 4.1%, since the test set was never trained on',
              'The error on new data is probably below 4.1%, since the best setting was kept',
              'Nothing can be said about new data'
            ],
            correct: 0,
            onCorrect: function () { ctx.solved('Picking the best of 40 on the test set turns it into a validation set. A fresh test set is needed for an honest number.'); },
            onWrong: function () { ctx.wrong(); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>Training error falls as a model grows. Validation error falls, then rises once the model starts to fit noise.</li>' +
          '<li>Expected error splits into bias², variance and noise. More data lowers the variance, so the right flexibility depends on the amount of data.</li>' +
          '<li>The validation set chooses the model. The test set is used once at the end, otherwise its error is optimistic.</li></ul>'
      }
    ]
  });
})();
