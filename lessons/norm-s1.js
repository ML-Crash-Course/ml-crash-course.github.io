/* Standardizing features: shift to mean 0, squeeze to standard deviation 1, and what it does to gradient descent. */
(function () {
  'use strict';
  var M4 = window.M4;
  if (!M4 || !M4.lesson) return;
  var C = M4.colors || {};
  function mix(p) {
    var idx = p.options.map(function (_, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    p.answer = idx.indexOf(p.answer); p.options = idx.map(function (i) { return p.options[i]; }); return p;
  }
  var COL = {
    ink: C.ink || '#1d1d1f', muted: C.muted || '#6b6f76', purple: C.purple || '#7a5cff', blue: C.blue || '#2f6bff',
    green: C.green || '#16b56b', orange: C.orange || '#ff8a1f', red: C.red || '#f0473e'
  };

  function readout(parent, items) {
    var row = M4.el('div', { class: 'm4-readout' }, parent), vals = {};
    items.forEach(function (it) {
      var sp = M4.el('span', null, row);
      var l = M4.el('span', { html: '\\(' + it[1] + '\\) = ' }, sp); M4.typeset(l);
      vals[it[0]] = M4.el('b', { text: '0' }, sp);
    });
    return function (k, v) { vals[k].textContent = typeof v === 'string' ? v : M4.fmt(v, 2); };
  }
  function stats(xs) {
    var n = xs.length, m = 0, v = 0, i;
    for (i = 0; i < n; i++) m += xs[i] / n;
    for (i = 0; i < n; i++) v += (xs[i] - m) * (xs[i] - m) / n;
    return { m: m, s: Math.sqrt(v) };
  }
  function animate(from, to, ms, step, done) {
    var t0 = null;
    function f(ts) {
      if (t0 === null) t0 = ts;
      var u = Math.min(1, (ts - t0) / ms), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      step(from + (to - from) * e);
      if (u < 1) requestAnimationFrame(f); else if (done) done();
    }
    requestAnimationFrame(f);
  }

  /* ---------- 1D: subtract c, divide by d ---------- */
  function shiftSqueeze(el, ctx, o) {
    var xs = o.data, st = stats(xs), c = 0, d = 1;
    var p = M4.plane(el, { xmin: -5.5, xmax: 13.5, ymin: -1.4, ymax: 2.4, width: 660, height: 250, grid: false, labels: false });
    for (var t = -4; t <= 12; t += 2) p.text(t, -0.75, String(t), { size: 14, fill: COL.muted, weight: 400 });
    p.path([[-1, -0.35], [1, -0.35], [1, 1.9], [-1, 1.9]], { fill: COL.green, fillOpacity: 0.09, closed: true, layer: 'bg' });
    p.text(0, 2.15, 'target: mean 0, spread 1', { size: 13, fill: COL.green, weight: 500 });
    var band = p.path([], { fill: COL.orange, fillOpacity: 0.16, closed: true, layer: 'bg' });
    var meanLine = p.path([], { stroke: COL.purple, width: 3 });
    var ghosts = xs.map(function (x) { return p.point(x, 1.25, { r: 6, color: '#c9ccd3' }); });
    var dots = xs.map(function () { return p.point(0, 0.35, { r: 8, color: COL.blue }); });
    p.text(-4.9, 1.25, 'raw', { size: 13, fill: COL.muted, anchor: 'start', weight: 500 });
    p.text(-4.9, 0.35, 'new', { size: 13, fill: COL.blue, anchor: 'start', weight: 500 });
    var formula = M4.el('p', { class: 'm4-cap', style: 'font-size:19px;color:inherit' }, el);
    var set = readout(el, [['m', '\\text{mean of new}'], ['s', '\\text{std of new}']]);
    var row = M4.el('div', { class: 'm4-row' }, el);
    var sc = M4.slider(row, { label: 'subtract \\(c\\)', min: 0, max: 10, step: 0.05, value: 0, onInput: function (v) { c = v; upd(); } });
    var sd = M4.slider(row, { label: 'divide by \\(d\\)', min: 0.5, max: 4, step: 0.01, value: 1, onInput: function (v) { d = v; upd(); } });
    var done = false;
    function upd() {
      var ys = xs.map(function (x) { return (x - c) / d; }), s2 = stats(ys);
      ys.forEach(function (y, k) { dots[k].set(y, 0.35); });
      band.set([[s2.m - s2.s, -0.3], [s2.m + s2.s, -0.3], [s2.m + s2.s, 0.95], [s2.m - s2.s, 0.95]]);
      meanLine.set([[s2.m, -0.3], [s2.m, 0.95]]);
      formula.innerHTML = '\\(x_{\\text{new}} = (x - ' + M4.fmt(c, 2) + ')\\,/\\,' + M4.fmt(d, 2) + '\\)';
      M4.typeset(formula);
      set('m', s2.m); set('s', s2.s);
      if (o.goal && !done && Math.abs(s2.m) < 0.05 && Math.abs(s2.s - 1) < 0.03) {
        done = true;
        ctx.note('You used \\(c = ' + M4.fmt(c, 2) + '\\) and \\(d = ' + M4.fmt(d, 2) + '\\). The data had \\(\\bar x = ' + M4.fmt(st.m, 2) + '\\) and \\(s = ' + M4.fmt(st.s, 2) + '\\): standardizing means \\(c = \\bar x\\) and \\(d = s\\).');
        ctx.solved();
      }
    }
    if (o.buttons) {
      var br = M4.el('div', { class: 'm4-row' }, el);
      M4.button(br, 'Subtract the mean', function () { animate(c, st.m, 700, function (v) { c = v; sc.set(v); upd(); }); });
      M4.button(br, 'Divide by the std', function () { animate(d, st.s, 700, function (v) { d = v; sd.set(v); upd(); }); });
      M4.button(br, 'Reset', function () { c = 0; d = 1; sc.set(0); sd.set(1); upd(); }, { ghost: true });
    }
    upd();
  }

  /* ---------- 2D: two features on very different scales ---------- */
  function cloud(el) {
    var pts = [[3.2, 0.95], [4.1, 1.05], [5.0, 0.9], [5.6, 1.1], [6.3, 1.0], [7.0, 1.2], [7.4, 0.85], [8.2, 1.15], [9.0, 1.05], [9.8, 1.25], [4.6, 0.8], [6.8, 0.95]];
    var s1 = stats(pts.map(function (q) { return q[0]; })), s2 = stats(pts.map(function (q) { return q[1]; }));
    var a = 0, b = 0;
    var p = M4.plane(el, { xmin: -4, xmax: 11, ymin: -4, ymax: 4, width: 600, height: 330 });
    var circ = [], k;
    for (k = 0; k <= 60; k++) circ.push([Math.cos(k / 60 * 2 * Math.PI), Math.sin(k / 60 * 2 * Math.PI)]);
    p.path(circ, { stroke: COL.green, width: 2, dash: true, layer: 'bg' });
    var dots = pts.map(function () { return p.point(0, 0, { r: 6, color: COL.blue }); });
    var cen = p.point(0, 0, { r: 7, color: COL.purple });
    var set = readout(el, [['a', 's_1'], ['b', 's_2']]);
    var row = M4.el('div', { class: 'm4-row' }, el);
    M4.slider(row, { label: 'center', min: 0, max: 1, step: 0.01, value: 0, onInput: function (v) { a = v; upd(); } });
    M4.slider(row, { label: 'rescale', min: 0, max: 1, step: 0.01, value: 0, onInput: function (v) { b = v; upd(); } });
    function upd() {
      var d1 = 1 + b * (s1.s - 1), d2 = 1 + b * (s2.s - 1), ys = [];
      pts.forEach(function (q, i) {
        var y = [(q[0] - a * s1.m) / d1, (q[1] - a * s2.m) / d2];
        ys.push(y); dots[i].set(y[0], y[1]);
      });
      var t1 = stats(ys.map(function (q) { return q[0]; })), t2 = stats(ys.map(function (q) { return q[1]; }));
      cen.set(t1.m, t2.m);
      set('a', t1.s); set('b', t2.s);
    }
    upd();
    M4.typeset(M4.el('p', { class: 'm4-cap', html: 'Purple: the mean of the cloud. Dashed green: the unit circle.' }, el));
  }

  /* ---------- gradient descent on L(w) = (w - w*)^T S (w - w*) ---------- */
  function eig2(S) {
    var a = S[0][0], b = S[0][1], d = S[1][1], tr = a + d, det = a * d - b * b;
    var disc = Math.sqrt(Math.max(0, tr * tr / 4 - det)), l1 = tr / 2 + disc, l2 = tr / 2 - disc;
    var v1 = Math.abs(b) > 1e-12 ? [l1 - d, b] : (a >= d ? [1, 0] : [0, 1]);
    var n = Math.hypot(v1[0], v1[1]); v1 = [v1[0] / n, v1[1] / n];
    return { l1: l1, l2: l2, v1: v1, v2: [-v1[1], v1[0]] };
  }
  function gdPlane(el, ctx, o) {
    var RHO = 0.4, WS = [1, 1], W0 = [-2.6, -2.2], N = 25;
    var sig = o.sigma0, eta = o.eta0;
    var p = M4.plane(el, { xmin: -3.5, xmax: 3.5, ymin: -3.5, ymax: 3.5, width: 420, height: 420 });
    var LEVELS = [0.05, 0.2, 0.6, 1.5, 3.5, 8, 16, 32, 64, 128];
    var rings = LEVELS.map(function () { return p.path([], { stroke: '#cdd6e6', width: 1.6, closed: true, layer: 'bg' }); });
    p.point(WS[0], WS[1], { r: 6, color: COL.green });
    var path = p.path([], { stroke: COL.orange, width: 2.5 });
    var marks = [];
    for (var i = 0; i <= N; i++) marks.push(p.point(0, 0, { r: i === 0 ? 6 : 3.5, color: i === 0 ? COL.ink : COL.orange }));
    var set = readout(el, [['k', '\\kappa'], ['e', '\\eta_{\\max}'], ['L', 'L \\text{ after ' + N + ' steps}']]);
    var row = M4.el('div', { class: 'm4-row' }, el), sS = null, done = false;
    if (o.sigmaSlider) sS = M4.slider(row, { label: 'scale of feature 1, \\(s_1\\)', min: 0.25, max: 4, step: 0.05, value: sig, onInput: function (v) { sig = v; upd(); } });
    var sE = M4.slider(row, { label: 'learning rate \\(\\eta\\)', min: 0.005, max: 0.5, step: 0.005, value: eta, onInput: function (v) { eta = v; upd(); } });
    if (o.button) {
      var br = M4.el('div', { class: 'm4-row' }, el), btn;
      btn = M4.button(br, 'Standardize feature 1', function () {
        if (sig === 1) { sig = o.sigma0; btn.textContent = 'Standardize feature 1'; if (sS) sS.set(sig); upd(); return; }
        animate(sig, 1, 800, function (v) { sig = v; if (sS) sS.set(v); upd(); }, function () { sig = 1; btn.textContent = 'Undo standardization'; upd(); });
      });
    }
    function upd() {
      var S = [[sig * sig, RHO * sig], [RHO * sig, 1]], E = eig2(S);
      LEVELS.forEach(function (c, j) {
        var pts = [];
        for (var k = 0; k <= 72; k++) {
          var t = k / 72 * 2 * Math.PI, u = Math.sqrt(c / E.l1) * Math.cos(t), v = Math.sqrt(c / E.l2) * Math.sin(t);
          pts.push([WS[0] + u * E.v1[0] + v * E.v2[0], WS[1] + u * E.v1[1] + v * E.v2[1]]);
        }
        rings[j].set(pts);
      });
      var w = W0.slice(), trail = [w.slice()], blown = false;
      for (var s = 1; s <= N; s++) {
        var r = [w[0] - WS[0], w[1] - WS[1]];
        w = [w[0] - eta * 2 * (S[0][0] * r[0] + S[0][1] * r[1]), w[1] - eta * 2 * (S[1][0] * r[0] + S[1][1] * r[1])];
        if (Math.abs(w[0]) > 50 || Math.abs(w[1]) > 50) blown = true;
        trail.push([Math.max(-60, Math.min(60, w[0])), Math.max(-60, Math.min(60, w[1]))]);
      }
      path.set(trail);
      marks.forEach(function (m, k) { m.set(trail[k][0], trail[k][1]); });
      var rr = [w[0] - WS[0], w[1] - WS[1]];
      var L = rr[0] * (S[0][0] * rr[0] + S[0][1] * rr[1]) + rr[1] * (S[1][0] * rr[0] + S[1][1] * rr[1]);
      set('k', E.l1 / E.l2); set('e', 1 / E.l1);
      set('L', blown || !isFinite(L) ? 'diverged' : L < 0.0005 ? '< 0.001' : M4.fmt(L, 3));
      if (o.goal && !done && !blown && L < 0.001) {
        done = true;
        ctx.note('With \\(s_1 = ' + M4.fmt(sig, 2) + '\\) and \\(\\eta = ' + M4.fmt(eta, 3) + '\\) the loss drops below 0.001. After standardizing, the curvatures are close to each other, so one learning rate suits every direction.');
        ctx.solved();
      }
    }
    upd();
  }

  /* ---------- practice ---------- */
  function gen() {
    var kind = M4.pick(['z', 'x', 'shift', 'kappa', 'test']);
    if (kind === 'z') {
      var mu = M4.rand(2, 20) * 5, s = M4.pick([2, 4, 5, 8, 10]), x = mu + M4.rand(-6, 6) * s / 2;
      return { q: 'A feature has training mean \\(' + mu + '\\) and standard deviation \\(' + s + '\\). Standardize the value \\(x = ' + x + '\\).', answer: (x - mu) / s, explain: '\\(z = (' + x + ' - ' + mu + ')/' + s + ' = ' + M4.fmt((x - mu) / s, 2) + '\\).' };
    }
    if (kind === 'x') {
      var mu2 = M4.rand(1, 12) * 10, s2 = M4.pick([2, 5, 10, 20]), z = M4.rand(-6, 6) / 2;
      return { q: 'A feature has mean \\(' + mu2 + '\\) and standard deviation \\(' + s2 + '\\). Which raw value has standardized value \\(z = ' + z + '\\)?', answer: mu2 + z * s2, explain: 'Undo the two steps: \\(x = \\bar x + z\\,s = ' + mu2 + ' + ' + z + '\\cdot' + s2 + ' = ' + (mu2 + z * s2) + '\\).' };
    }
    if (kind === 'shift') {
      var m = M4.rand(2, 12), sd = M4.rand(2, 8), c = M4.rand(0, 10), d = M4.pick([2, 4, 5]), askMean = Math.random() < 0.5;
      return {
        q: 'Data have mean \\(' + m + '\\) and standard deviation \\(' + sd + '\\). Every value is replaced by \\((x - ' + c + ')/' + d + '\\). What is the new ' + (askMean ? 'mean' : 'standard deviation') + '?',
        answer: askMean ? (m - c) / d : sd / d,
        explain: askMean ? 'The mean follows the same map: \\((' + m + ' - ' + c + ')/' + d + '\\).' : 'Shifting leaves the spread unchanged and dividing by \\(' + d + '\\) divides it by \\(' + d + '\\).'
      };
    }
    if (kind === 'kappa') {
      var a = M4.pick([1, 2, 3, 4, 5, 10]), b = M4.pick([1, 2]);
      if (a === b) a = b * 3;
      return { q: 'A linear model is fit by least squares on two uncorrelated, centered features with standard deviations \\(' + a + '\\) and \\(' + b + '\\). The Hessian of the loss is proportional to \\(\\mathrm{diag}(s_1^2, s_2^2)\\). What is its condition number \\(\\kappa\\)?', answer: Math.pow(Math.max(a, b) / Math.min(a, b), 2), explain: '\\(\\kappa = (' + Math.max(a, b) + '/' + Math.min(a, b) + ')^2\\). After standardizing both features it is 1.' };
    }
    return mix({
      q: 'A model was trained on standardized features. Which mean and standard deviation should be used to standardize a new test example?',
      options: ['Those of the training set', 'Those of the test set', 'Those of the single test example'], answer: 0,
      explain: 'The model learned weights for features standardized with the training statistics, so every later input must go through the same map. A single example has standard deviation 0.'
    });
  }

  M4.lesson({
    id: 'norm-s1',
    module: 'norm',
    title: 'Standardizing features',
    summary: 'Standardizing the inputs means subtracting the mean and dividing by the standard deviation. It turns a narrow valley in the loss into a round bowl that is easier to descend.',
    minutes: 15,
    steps: [
      {
        kind: 'text',
        title: 'Features on different scales',
        html: '<p>A house can be described by its floor area in square metres, typically between 40 and 200, and by its number of bathrooms, typically 1 to 3. Both are useful, but they live on scales that differ by a factor of about 50. This lesson shows why that hurts gradient descent and how a two step map fixes it.</p>' +
          '<p>The map uses the sample mean \\(\\bar x\\) and the sample standard deviation \\(s\\) of a feature, introduced in <a href="#/l/probability-s2">Expectation and variance</a>: \\[z = \\frac{x - \\bar x}{s}.\\] It is called <b>standardization</b>. The new values \\(z\\) have mean 0 and standard deviation 1.</p>'
      },
      {
        kind: 'explore',
        title: 'Shift, then squeeze',
        html: '<p>The grey dots are eight raw values. The blue dots show \\((x - c)/d\\). Subtracting \\(c\\) slides the whole cloud without changing its spread. Dividing by \\(d\\) squeezes it towards 0, or stretches it when \\(d &lt; 1\\). The purple line marks the mean of the blue dots and the orange band spans one standard deviation on each side. Use the sliders, or the buttons that set \\(c = \\bar x\\) and \\(d = s\\).</p>',
        mount: function (el, ctx) { shiftSqueeze(el, ctx, { data: [3, 5, 6, 7, 8, 9, 10, 12], buttons: true }); }
      },
      {
        kind: 'exercise',
        title: 'Standardize the data yourself',
        html: '<p>A new set of values. Move the two sliders until the blue dots have mean 0 and standard deviation 1. The numbers under the plot show both. Think first: which slider changes the standard deviation, and which one changes only the mean?</p>',
        hint: 'Set \\(d\\) first so that the spread is 1, because \\(c\\) does not change the spread. Then move \\(c\\) until the mean is 0. The mean of the new data is \\((\\bar x - c)/d\\), so it is 0 exactly when \\(c = \\bar x\\).',
        mount: function (el, ctx) { shiftSqueeze(el, ctx, { data: [1, 2, 4, 4.5, 6, 7.5, 9, 10], goal: true }); }
      },
      {
        kind: 'explore',
        title: 'Two features at once',
        html: '<p>Each feature is standardized with its own mean and standard deviation. Here feature 1 spreads over several units and feature 2 barely moves, so the raw cloud is a thin horizontal stripe far from the origin. Slide <i>center</i> to subtract both means and <i>rescale</i> to divide by both standard deviations. At the end the cloud sits at the origin and has spread 1 along both axes.</p>',
        mount: function (el) { cloud(el); }
      },
      {
        kind: 'text',
        title: 'Why the loss cares',
        html: '<p>For a linear model with squared error on centered features, the loss is a quadratic bowl in the weights, \\[L(\\mathbf w) = (\\mathbf w - \\mathbf w^*)^\\top \\Sigma\\, (\\mathbf w - \\mathbf w^*),\\] where \\(\\Sigma\\) is the covariance matrix of the features. Its diagonal holds \\(s_1^2\\) and \\(s_2^2\\). A feature with a large spread makes the bowl steep along its weight, and a feature with a small spread makes it flat. The ratio of the largest to the smallest curvature is the condition number \\(\\kappa\\) from <a href="#/l/l3-s2">Learning rate and noisy gradients</a>.</p>' +
          '<p>The Hessian is \\(2\\Sigma\\), and gradient descent is stable only for \\(\\eta &lt; 2/\\lambda_{\\max}(2\\Sigma) = 1/\\lambda_{\\max}(\\Sigma)\\). The steep direction caps the learning rate, and with that small learning rate the flat direction takes many steps. Standardizing sets every \\(s_j\\) to 1. If the features are also uncorrelated, \\(\\Sigma = I\\) and the bowl is perfectly round.</p>'
      },
      {
        kind: 'explore',
        title: 'From ravine to bowl',
        html: '<p>The grey ellipses are contour lines of the loss in the plane of the two weights, and the green dot is the minimum. Gradient descent starts at the black dot and takes 25 steps. Feature 1 starts with standard deviation 4, and the two features have correlation 0.4. Try learning rates near \\(\\eta_{\\max}\\) and watch the path zigzag across the ravine. Then press the button and run the same experiment on the standardized feature.</p>',
        mount: function (el, ctx) { gdPlane(el, ctx, { sigma0: 4, eta0: 0.025, sigmaSlider: true, button: true }); }
      },
      {
        kind: 'exercise',
        title: 'Reach the minimum',
        html: '<p>Bring the loss below 0.001 within 25 steps. You control the learning rate and may standardize feature 1.</p>',
        hint: 'With \\(s_1 = 4\\) the largest stable learning rate is about 0.06 and the flat direction then needs hundreds of steps. Standardize first, then try \\(\\eta\\) around 0.4.',
        mount: function (el, ctx) { gdPlane(el, ctx, { sigma0: 4, eta0: 0.02, sigmaSlider: false, button: true, goal: true }); }
      },
      {
        kind: 'exercise',
        title: 'Standardization practice',
        html: '<p>Standardized values, their inverse, shifted statistics and condition numbers. Get five right.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 5, gen: gen }); }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>Standardizing maps each feature to \\(z = (x - \\bar x)/s\\). Subtracting \\(\\bar x\\) moves the data to mean 0, and dividing by \\(s\\) squeezes or stretches it to standard deviation 1.</li>' +
          '<li>For least squares the curvature along each weight is the variance of its feature. Features on different scales give a ravine with a large condition number, and gradient descent crawls along it.</li>' +
          '<li>After standardizing, one learning rate suits every direction. The statistics are computed on the training set and reused for every later input.</li>' +
          '<li>Neural networks apply the same idea inside the network, to the activations of hidden layers. That is the topic of <a href="#/l/norm-s2">Normalization layers</a>.</li>' +
          '</ul>'
      }
    ]
  });
})();
