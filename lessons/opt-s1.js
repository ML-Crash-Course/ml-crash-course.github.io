(function () {
  'use strict';

  var C = M4.colors;
  var BS = [1, 2, 4, 8, 16, 32, 64, 200];

  /* seeded random numbers so that a run is reproducible for fixed settings */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* data set: y = 2x + 1 + noise, n = 200 */
  var N = 200, X = [], Y = [];
  (function () {
    var r = rng(7);
    for (var i = 0; i < N; i++) { var x = -1 + 4 * r(); X.push(x); Y.push(2 * x + 1 + 0.8 * gauss(r)); }
  })();
  var Sx = 0, Sxx = 0, Sy = 0, Sxy = 0, Syy = 0;
  for (var i0 = 0; i0 < N; i0++) { Sx += X[i0]; Sxx += X[i0] * X[i0]; Sy += Y[i0]; Sxy += X[i0] * Y[i0]; Syy += Y[i0] * Y[i0]; }
  Sx /= N; Sxx /= N; Sy /= N; Sxy /= N; Syy /= N;
  var det = Sxx - Sx * Sx;
  var WS = (Sxy - Sx * Sy) / det, BSTAR = Sy - WS * Sx;
  function loss(w, b) { return w * w * Sxx + 2 * w * b * Sx + b * b - 2 * w * Sxy - 2 * b * Sy + Syy; }
  var LMIN = loss(WS, BSTAR);
  function grad(w, b, idx) {
    var gw = 0, gb = 0, n = idx ? idx.length : N;
    for (var k = 0; k < n; k++) { var i = idx ? idx[k] : k, e = w * X[i] + b - Y[i]; gw += e * X[i]; gb += e; }
    return [2 * gw / n, 2 * gb / n];
  }
  function batch(r, B) {
    if (B >= N) return null;
    var idx = [];
    for (var k = 0; k < B; k++) idx.push(Math.floor(r() * N));
    return idx;
  }

  /* level sets of the quadratic loss are ellipses around the minimum */
  var ev = (function () {
    var a = Sxx, b = Sx, d = 1, tr = a + d, dt = a * d - b * b, s = Math.sqrt(tr * tr / 4 - dt);
    var l1 = tr / 2 + s, l2 = tr / 2 - s, v1 = [b, l1 - a], n1 = Math.hypot(v1[0], v1[1]);
    v1 = [v1[0] / n1, v1[1] / n1];
    return { l1: l1, l2: l2, v1: v1, v2: [-v1[1], v1[0]] };
  })();
  function ellipse(c) {
    var pts = [], r1 = Math.sqrt(c / ev.l1), r2 = Math.sqrt(c / ev.l2);
    for (var t = 0; t <= 64; t++) {
      var a = 2 * Math.PI * t / 64, u = r1 * Math.cos(a), v = r2 * Math.sin(a);
      pts.push([WS + u * ev.v1[0] + v * ev.v2[0], BSTAR + u * ev.v1[1] + v * ev.v2[1]]);
    }
    return pts;
  }

  function lossPlane(el, height) {
    var P = M4.plane(el, { xmin: -1, xmax: 4.2, ymin: -1.6, ymax: 4.2, width: 520, height: height || 470, axes: true, grid: true });
    [0.05, 0.3, 1, 2.2, 4, 7, 11].forEach(function (c) { P.path(ellipse(c), { stroke: C.muted, width: 1.2, closed: true, layer: 'bg' }); });
    P.point(WS, BSTAR, { color: C.ink, r: 4 });
    P.text(4.05, -1.35, 'w', { size: 16, fill: C.muted, anchor: 'end' });
    P.text(-0.85, 4.0, 'b', { size: 16, fill: C.muted, anchor: 'start' });
    return P;
  }

  function chip(parent, label, color) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    var l = M4.el('span', { text: label + ' ' }, r);
    l.style.fontWeight = '700';
    if (color) l.style.color = color;
    var v = M4.el('span', { text: '' }, r);
    return function (t) { v.textContent = t; };
  }
  function f(v, d) { return M4.fmt(v, d == null ? 3 : d); }

  function bsSlider(parent, start, onInput) {
    return M4.slider(parent, {
      min: 0, max: BS.length - 1, step: 1, value: BS.indexOf(start), label: 'batch size B',
      format: function (v) { return String(BS[Math.round(v)]); }, onInput: onInput
    });
  }

  /* ---------- explore 1: the gradient of one mini-batch ---------- */
  function noiseScene(el) {
    var P = lossPlane(el, 430);
    var ETA = 0.25, K = 24, arrows = [], seed = 1;
    for (var k = 0; k < K; k++) arrows.push(P.line(0, 0, 0, 0, { stroke: C.orange, width: 1.6, opacity: 0.55 }));
    var full = P.arrow(0, 0, 0, 0, { stroke: C.ink, width: 3 });
    var B = 4, cur = [0.2, 2.6];
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el);
    var cS = chip(row, 'spread', C.orange), cF = chip(row, 'full step', C.ink);
    var ctl = M4.el('div', { style: 'max-width:420px;margin:8px auto 0' }, el);
    var sl = bsSlider(ctl, B, function (v) { B = BS[Math.round(v)]; paint(); });
    function paint() {
      var r = rng(seed), g = grad(cur[0], cur[1]), s2 = 0;
      full.set(cur[0], cur[1], cur[0] - ETA * g[0], cur[1] - ETA * g[1]);
      for (var k = 0; k < K; k++) {
        var gb = grad(cur[0], cur[1], batch(r, B)), dx = -ETA * gb[0], dy = -ETA * gb[1];
        arrows[k].set(cur[0], cur[1], cur[0] + dx, cur[1] + dy);
        s2 += Math.pow(dx + ETA * g[0], 2) + Math.pow(dy + ETA * g[1], 2);
      }
      cS(f(Math.sqrt(s2 / K), 2));
      cF(f(ETA * Math.hypot(g[0], g[1]), 2));
    }
    P.handle(cur[0], cur[1], { color: C.blue, onDrag: function (x, y) { cur = [x, y]; paint(); } });
    paint();
    var r2 = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el);
    M4.button(r2, 'Draw new batches', function () { seed++; paint(); });
    return sl;
  }

  /* ---------- explore 2 and exercise: running SGD ---------- */
  function sgdScene(el, o) {
    o = o || {};
    var P = lossPlane(el, o.height || 430);
    var path = P.path([], { stroke: C.blue, width: 2 });
    var dot = P.point(-0.6, 3.6, { color: C.blue, r: 5 });
    var START = [-0.6, 3.6], STEPS = o.steps || 150;
    var B = o.B || 8, eta = o.eta || 0.1, decay = false, timer = null;

    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el);
    var cT = chip(row, 'step', C.ink), cE = chip(row, 'epochs', C.ink), cG = chip(row, 'L - L*', C.blue);
    var ctl = M4.el('div', { style: 'max-width:420px;margin:8px auto 0' }, el);
    bsSlider(ctl, B, function (v) { B = BS[Math.round(v)]; if (o.maxB && B > o.maxB) B = o.maxB; run(); });
    M4.slider(ctl, { min: 0.01, max: 0.3, step: 0.01, value: eta, label: 'learning rate η', format: function (v) { return v.toFixed(2); }, onInput: function (v) { eta = v; run(); } });
    var r2 = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el);
    var dBtn = M4.button(r2, 'Decay: off', function () { decay = !decay; dBtn.textContent = 'Decay: ' + (decay ? 'on' : 'off'); run(); });
    M4.button(r2, 'Run again', function () { run(true); });
    var runs = 0;

    function run(fresh) {
      if (fresh) runs++;
      if (timer) clearInterval(timer);
      var r = rng(11 + runs), th = START.slice(), pts = [th.slice()], t = 0;
      function step() {
        var lr = decay ? eta / (1 + t / 20) : eta;
        var g = grad(th[0], th[1], batch(r, B));
        th = [th[0] - lr * g[0], th[1] - lr * g[1]];
        if (!isFinite(th[0]) || Math.abs(th[0]) > 50 || Math.abs(th[1]) > 50) th = [Math.max(-50, Math.min(50, th[0] || 0)), Math.max(-50, Math.min(50, th[1] || 0))];
        pts.push(th.slice());
        t++;
      }
      function show() {
        path.set(pts.map(function (p) { return [Math.max(-3, Math.min(6, p[0])), Math.max(-3, Math.min(6, p[1]))]; }));
        var last = pts[pts.length - 1];
        dot.set(Math.max(-3, Math.min(6, last[0])), Math.max(-3, Math.min(6, last[1])));
        var gap = loss(last[0], last[1]) - LMIN;
        cT(String(t)); cE(f(t * Math.min(B, N) / N, 2)); cG(gap > 99 ? 'diverged' : f(gap, 3));
        return gap;
      }
      timer = setInterval(function () {
        for (var k = 0; k < 4 && t < STEPS; k++) step();
        var gap = show();
        if (t >= STEPS) { clearInterval(timer); timer = null; if (o.onDone) o.onDone(gap, B, decay); }
      }, 30);
    }
    run();
  }

  /* ---------- practice ---------- */
  function gen() {
    var t = M4.rand(0, 2);
    if (t === 0) {
      var n = M4.pick([10000, 12000, 50000, 60000]), B = M4.pick([32, 50, 100, 125, 200, 250, 500]);
      while (n % B) B = M4.pick([50, 100, 125, 200, 250]);
      var e = M4.rand(2, 5);
      return {
        q: 'A data set has \\(' + n + '\\) examples. How many parameter updates does mini-batch SGD with batch size \\(' + B + '\\) perform in \\(' + e + '\\) epochs?',
        answer: e * n / B,
        explain: 'One epoch takes \\(' + n + ' / ' + B + ' = ' + (n / B) + '\\) steps, so \\(' + e + '\\) epochs take \\(' + (e * n / B) + '\\).'
      };
    }
    if (t === 1) {
      var s = M4.pick([0.4, 0.6, 0.8, 1.2, 2]), k = M4.pick([4, 16, 64, 100]), b0 = M4.pick([2, 4, 8]);
      return {
        q: 'With batch size \\(' + b0 + '\\), the gradient estimate has standard deviation \\(' + s + '\\) in each coordinate. What is the standard deviation with batch size \\(' + (b0 * k) + '\\)?',
        answer: s / Math.sqrt(k),
        hint: 'The variance of an average of \\(B\\) independent samples is \\(\\sigma^2 / B\\).',
        explain: 'The batch is \\(' + k + '\\) times larger, so the standard deviation shrinks by \\(\\sqrt{' + k + '} = ' + Math.sqrt(k) + '\\), giving \\(' + M4.fmt(s / Math.sqrt(k), 3) + '\\).'
      };
    }
    var lr = M4.pick([0.05, 0.1, 0.2, 0.4]), b1 = M4.pick([32, 64, 128]), m = M4.pick([2, 4, 8]);
    return {
      q: 'A model trains well with batch size \\(' + b1 + '\\) and learning rate \\(' + lr + '\\). Following the linear scaling rule, which learning rate goes with batch size \\(' + (b1 * m) + '\\)?',
      answer: lr * m,
      explain: 'The batch grows by a factor \\(' + m + '\\), so the learning rate does too: \\(' + M4.fmt(lr * m, 3) + '\\).'
    };
  }

  M4.lesson({
    id: 'opt-s1',
    module: 'optimizers',
    title: 'Stochastic gradients',
    summary: 'Gradients computed on mini-batches are cheap and noisy. Batch size and learning rate together decide how much of that noise reaches the parameters.',
    minutes: 16,
    steps: [
      {
        kind: 'text',
        title: 'Sampled gradients',
        html: '<p>The training loss is an average over all \\(n\\) examples, \\(L(\\theta) = \\frac1n \\sum_{i=1}^n \\ell_i(\\theta)\\), and so is its gradient. For a data set with millions of examples, one exact gradient costs a full pass over the data.</p>' +
          '<p><b>Mini-batch stochastic gradient descent</b> (SGD) draws a random batch \\(\\mathcal B\\) of \\(B\\) examples and steps along</p>' +
          '\\[ g = \\frac1B \\sum_{i \\in \\mathcal B} \\nabla \\ell_i(\\theta), \\qquad \\theta \\leftarrow \\theta - \\eta\\, g. \\]' +
          '<p>Each batch is a random sample, so \\(g\\) is a random vector. Its expectation is the full gradient \\(\\nabla L(\\theta)\\), which makes it an <b>unbiased estimate</b>. The individual estimates scatter around that mean.</p>' +
          '<p>The plots here use a linear regression \\(\\hat y = wx + b\\) with \\(n = 200\\) examples and squared error. The contour lines show the full loss over the two parameters \\(w\\) and \\(b\\), and the black dot marks its minimum.</p>'
      },
      {
        kind: 'explore',
        title: 'Gradient noise',
        html: '<p>The black arrow is one step with learning rate \\(\\eta = 0.25\\) along the full gradient from the blue point. Each orange line is the same step computed on a different random batch. Change the batch size, move the point, and compare the spread of the orange steps around the black one.</p>',
        mount: function (el) { noiseScene(el); }
      },
      {
        kind: 'text',
        title: 'Noise and batch size',
        html: '<p>Suppose the per-example gradients \\(\\nabla \\ell_i\\) have variance \\(\\sigma^2\\) around their mean. An average of \\(B\\) independent draws has variance \\(\\sigma^2 / B\\), so its standard deviation is</p>' +
          '\\[ \\operatorname{std}(g) = \\frac{\\sigma}{\\sqrt{B}}. \\]' +
          '<p>Halving the noise needs four times the batch, and four times the computation per step. Small batches give many cheap and noisy steps per pass over the data. Large batches give few accurate and expensive ones. One pass over all \\(n\\) examples is an <b>epoch</b>, and it consists of \\(n / B\\) steps.</p>'
      },
      {
        kind: 'explore',
        title: 'Running SGD',
        html: '<p>Each run performs 150 steps from the same start. Try batch size 1 with a large learning rate, then the full batch of 200. The value \\(L - L^*\\) is the distance of the final loss from the minimum.</p>',
        mount: function (el) { sgdScene(el, { B: 4, eta: 0.15 }); }
      },
      {
        kind: 'text',
        title: 'The noise floor',
        html: '<p>Near the minimum the full gradient becomes small, but the batch gradients do not. With a constant learning rate the iterates keep bouncing in a region around the minimum whose size grows with \\(\\eta\\) and shrinks with \\(B\\). This region is the <b>noise floor</b> of SGD.</p>' +
          '<p>Two remedies follow from the formula \\(\\eta \\cdot \\sigma / \\sqrt B\\) for the size of a noisy step:</p>' +
          '<ul><li><b>Decay the learning rate.</b> Large steps early cover distance quickly, small steps late let the iterates settle. The button "Decay" uses \\(\\eta_t = \\eta / (1 + t/20)\\).</li>' +
          '<li><b>Grow the batch.</b> This also lowers the noise, at a higher cost per step.</li></ul>' +
          '<p>The noise is not only a nuisance. In large models it helps the iterates leave narrow regions of the loss surface, and small batches often generalize better than very large ones, meaning the trained model does better on new data it never saw during training.</p>'
      },
      {
        kind: 'exercise',
        title: 'Loss near the noise floor',
        html: '<p>With a batch size of at most \\(4\\), finish the 150 steps with \\(L - L^* < 0.02\\). Each click on Run again draws new batches.</p>',
        hint: 'A smaller constant rate lowers the noise floor but moves slowly. A decaying rate does both: fast early, quiet late. Try the decay with a rate around 0.15.',
        mount: function (el, ctx) {
          var done = false;
          sgdScene(el, {
            B: 4, eta: 0.05, maxB: 4,
            onDone: function (gap, B) { if (!done && B <= 4 && gap < 0.02) { done = true; ctx.solved('\\(L - L^* = ' + gap.toFixed(4) + '\\) with batch size \\(' + B + '\\).'); } }
          });
        }
      },
      {
        kind: 'text',
        title: 'Batch size and learning rate',
        html: '<p>Doubling the batch halves the variance of each step and halves the number of steps per epoch. A common heuristic, the <b>linear scaling rule</b>, multiplies the learning rate by the same factor as the batch size, so that one epoch moves the parameters by a similar amount. It works well up to a problem-dependent batch size, beyond which larger batches stop reducing the number of epochs needed.</p>'
      },
      {
        kind: 'exercise',
        title: 'Steps, epochs and noise',
        html: '<p>Round to three decimals where needed.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: gen }); }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>A mini-batch gradient is a random but unbiased estimate of the full gradient. Its noise has standard deviation \\(\\sigma / \\sqrt B\\), so four times the batch halves the noise.</li>' +
          '<li>With a constant learning rate, SGD does not settle at the minimum but keeps moving in a region whose size grows with \\(\\eta\\) and shrinks with \\(B\\).</li>' +
          '<li>A smaller learning rate late in training or a larger batch both lower this noise floor. When the batch grows, the learning rate is often scaled up by the same factor.</li></ul>'
      }
    ]
  });
})();
