/* Maximum likelihood, session 4: maximum likelihood estimators for common distributions. */
(function () {
  'use strict';
  var C = M4.colors;

  function readout(parent, items) {
    var row = M4.el('div', { class: 'm4-readout' }, parent), vals = {};
    items.forEach(function (it) {
      var s = M4.el('span', null, row);
      var l = M4.el('span', { html: '\\(' + it[1] + '\\) = ' }, s); M4.typeset(l);
      vals[it[0]] = M4.el('b', { text: '0' }, s);
    });
    return function (k, v) { vals[k].textContent = M4.fmt(v, 2); };
  }

  function logFact(k) { var s = 0; for (var i = 2; i <= k; i++) s += Math.log(i); return s; }
  function poissonSample(lam) {
    var L = Math.exp(-lam), k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }

  /* ---------------------------------------------------------------- Poisson scene
     Left: data frequencies (grey) against model probabilities (blue).
     Right: average log-likelihood over lambda with a point on the curve and its tangent. */
  function poissonScene(el, onChange) {
    var k;
    var data = [2, 4, 3, 1, 5, 3, 2, 4, 6, 2];
    var two = M4.el('div', { class: 'm4-two' }, el);
    var left = M4.el('div', { style: 'display:flex;justify-content:center' }, two);
    var right = M4.el('div', { style: 'display:flex;justify-content:center' }, two);
    var pl = M4.plane(left, { xmin: -0.8, xmax: 9.8, ymin: -0.07, ymax: 0.5, width: 380, height: 320, axes: false });
    var pr = M4.plane(right, { xmin: -0.3, xmax: 8, ymin: -6.6, ymax: -0.6, width: 380, height: 320, axes: false });
    pl.line(-0.8, 0, 9.8, 0, { stroke: C.muted, width: 1.5, layer: 'bg' });
    pr.line(-0.3, -6.1, 8, -6.1, { stroke: C.muted, width: 1.5, layer: 'bg' });
    for (k = 0; k <= 9; k++) pl.text(k, -0.045, String(k), { size: 13, fill: C.muted });
    for (k = 1; k <= 7; k++) { pr.line(k, -6.1, k, -6.0, { stroke: C.muted, width: 1.5, layer: 'bg' }); pr.text(k, -6.42, String(k), { size: 13, fill: C.muted }); }
    pl.text(9.6, -0.045, 'k', { size: 14, fill: C.muted, anchor: 'start' });
    pr.text(7.8, -6.42, '\u03bb', { size: 15, fill: C.muted });
    var bars = [], stems = [], dots = [];
    for (k = 0; k <= 9; k++) {
      bars.push(pl.path([], { fill: C.line, fillOpacity: 0.9, layer: 'bg', closed: true }));
      stems.push(pl.path([], { stroke: C.blue, width: 3 }));
      dots.push(pl.point(k, 0, { r: 5, color: C.blue, layer: 'top' }));
    }
    pl.text(9.6, 0.46, 'P(k)', { anchor: 'end', size: 14, fill: C.muted });
    var curve = pr.fn(function () { return NaN; }, { stroke: C.purple, width: 3 });
    var tangent = pr.path([], { stroke: C.ink, width: 2, dash: '6 5' });
    pr.text(7.8, -0.85, '\u2113(\u03bb) / n', { anchor: 'end', size: 14, fill: C.muted });
    var mean, lf;
    function ell(lam) { return mean * Math.log(lam) - lam - lf; }
    function stats() {
      mean = data.reduce(function (a, b) { return a + b; }, 0) / data.length;
      lf = data.reduce(function (a, b) { return a + logFact(b); }, 0) / data.length;
      for (k = 0; k <= 9; k++) {
        var fr = data.filter(function (v) { return v === k; }).length / data.length;
        bars[k].set([[k - 0.36, 0], [k + 0.36, 0], [k + 0.36, fr], [k - 0.36, fr]]);
      }
      curve.set(ell);
    }
    var set = readout(el, [['l', '\\lambda'], ['ll', '\\tfrac1n \\ell(\\lambda)'], ['d', '\\tfrac1n \\ell\'(\\lambda)']]);
    var dataRow = M4.el('p', { class: 'm4-cap', style: 'margin-top:8px' }, el);
    var h;
    function upd() {
      var lam = h.x, sl = mean / lam - 1;
      for (k = 0; k <= 9; k++) {
        var pk = Math.exp(k * Math.log(lam) - lam - logFact(k));
        stems[k].set([[k, 0], [k, pk]]); dots[k].set(k, pk);
      }
      tangent.set([[lam - 1.4, ell(lam) - 1.4 * sl], [lam + 1.4, ell(lam) + 1.4 * sl]]);
      set('l', lam); set('ll', ell(lam)); set('d', sl);
      if (onChange) onChange(lam, mean);
    }
    h = pr.handle(1.5, 0, {
      color: C.purple,
      bounds: { xmin: 0.3, xmax: 7.8 },
      constrain: function (nx) { while (ell(nx) < -5.9 && nx < mean) nx += 0.02; while (ell(nx) < -5.9 && nx > mean) nx -= 0.02; return [nx, ell(nx)]; },
      onDrag: upd
    });
    function load(d) {
      data = d; stats();
      dataRow.textContent = 'Data: ' + data.join(', ') + '.';
      h.set(h.x, ell(h.x)); upd();
    }
    load(data);
    return {
      fresh: function () {
        var lam = M4.pick([1.5, 2, 2.5, 3.5, 4, 4.5]), d = [];
        for (var i = 0; i < 10; i++) d.push(Math.min(9, poissonSample(lam)));
        load(d);
      }
    };
  }

  /* ---------------------------------------------------------------- Gaussian scene
     Left: average negative log-likelihood over (mu, sigma). Right: data and the fitted density. */
  var GX = [-0.9, -0.3, 0.1, 0.4, 0.6, 0.9, 1.0, 1.4];
  var GN = GX.length;
  var GMEAN = GX.reduce(function (a, b) { return a + b; }, 0) / GN;
  var GVAR = GX.reduce(function (a, b) { return a + (b - GMEAN) * (b - GMEAN); }, 0) / GN;
  function sig(y) { return 1.25 + 0.5 * y; }
  function nll(mu, s) { return Math.log(s) + (GVAR + (GMEAN - mu) * (GMEAN - mu)) / (2 * s * s) + 0.5 * Math.log(2 * Math.PI); }

  function gaussScene(el, onMove) {
    var top = M4.el('div', { style: 'display:flex;justify-content:center' }, el);
    var bottom = M4.el('div', { style: 'display:flex;justify-content:center;margin-top:6px' }, el);
    var zlo = nll(GMEAN, Math.sqrt(GVAR));
    function soft(z) { return zlo + 3 * Math.tanh((z - zlo) / 3); }
    var s = M4.surface3d(top, {
      f: function (x, y) { return soft(nll(x, sig(y))); }, r: 2, n: 26, width: 560, height: 340, scale: 0.4, color: C.purple,
      zmin: zlo, zmax: zlo + 3, contours: [zlo + 0.1, zlo + 0.4, zlo + 1, zlo + 1.8]
    });
    var labM = M4.svg('text', { 'font-size': 17, 'font-style': 'italic', fill: C.muted, 'text-anchor': 'middle', text: '\u03bc' }, s.top);
    var labS = M4.svg('text', { 'font-size': 17, 'font-style': 'italic', fill: C.muted, 'text-anchor': 'middle', text: '\u03c3' }, s.top);
    var p = M4.plane(bottom, { xmin: -3, xmax: 3, ymin: -0.22, ymax: 0.95, width: 560, height: 210, axes: false });
    p.line(-3, 0, 3, 0, { stroke: C.muted, width: 1.5, layer: 'bg' });
    [-2, -1, 0, 1, 2].forEach(function (t) {
      p.line(t, 0, t, -0.03, { stroke: C.muted, width: 1.5, layer: 'bg' });
      p.text(t, -0.13, String(t).replace('-', '−'), { size: 14, fill: C.muted, anchor: 'middle' });
    });
    p.text(2.85, -0.13, 'x', { size: 15, fill: C.muted, anchor: 'middle' });
    var bell = p.fn(function () { return NaN; }, { stroke: C.purple, width: 3 });
    var muLine = p.path([], { stroke: C.purple, width: 1.5, dash: '4 4' });
    GX.forEach(function (x) { p.point(x, 0, { r: 6, color: C.ink, layer: 'top' }); });
    var set = readout(el, [['m', '\\mu'], ['s', '\\sigma'], ['L', '\\tfrac1n\\,\\mathrm{NLL}'], ['gm', '\\partial/\\partial\\mu'], ['gs', '\\partial/\\partial\\sigma']]);
    var ball;
    function update() {
      var mu = ball.x, sg = sig(ball.y), q = GVAR + (GMEAN - mu) * (GMEAN - mu);
      bell.set(function (x) { return Math.exp(-(x - mu) * (x - mu) / (2 * sg * sg)) / (sg * Math.sqrt(2 * Math.PI)); });
      muLine.set([[mu, 0], [mu, 1 / (sg * Math.sqrt(2 * Math.PI))]]);
      var pm = s.floor(2.35, 0), ps = s.floor(0, 2.35);
      labM.setAttribute('x', pm[0]); labM.setAttribute('y', pm[1] + 5);
      labS.setAttribute('x', ps[0]); labS.setAttribute('y', ps[1] + 5);
      set('m', mu); set('s', sg); set('L', nll(mu, sg));
      set('gm', -(GMEAN - mu) / (sg * sg)); set('gs', 1 / sg - q / (sg * sg * sg));
      if (onMove) onMove(mu, sg);
    }
    ball = s.ball(-1.3, 1.2, { onMove: update });
    s.onRedraw(function () { if (ball) update(); });
    update();
    return { s: s, ball: ball };
  }

  /* ---------------------------------------------------------------- exercises */
  function listSum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function gen() {
    var t = M4.rand(0, 4), i, xs, m, n, k;
    if (t === 0) {
      n = M4.pick([10, 20, 25, 40, 50]); k = M4.rand(1, n - 1);
      var what = M4.pick([['a coin is tossed', 'heads'], ['a patient receives a treatment', 'recoveries'], ['an email filter is tested', 'correctly flagged emails']]);
      return {
        q: '<p>In \\(' + n + '\\) independent trials ' + what[0] + ' and \\(' + k + '\\) trials end in ' + what[1] + '. Under a Bernoulli model, compute the maximum likelihood estimate of the success probability \\(p\\).</p>',
        answer: k / n, tol: 0.005,
        explain: '\\(\\hat p = k/n = ' + k + '/' + n + ' = ' + M4.fmt(k / n, 3).replace('−', '-') + '\\).'
      };
    }
    if (t === 1) {
      n = 5; xs = []; for (i = 0; i < n; i++) xs.push(M4.rand(0, 7));
      return {
        q: '<p>A help desk records the number of calls in five separate hours: \\(' + xs.join(', ') + '\\). Under a Poisson model, compute the maximum likelihood estimate of the rate \\(\\lambda\\).</p>',
        answer: listSum(xs) / n,
        explain: '\\(\\hat\\lambda = \\bar x = ' + listSum(xs) + '/' + n + ' = ' + M4.fmt(listSum(xs) / n, 2).replace('−', '-') + '\\).'
      };
    }
    if (t === 2) {
      m = M4.pick([2, 4, 5, 8, 10]); n = 4; xs = [];
      var rest = n * m;
      for (i = 0; i < n - 1; i++) { var v = M4.rand(1, Math.max(1, Math.min(2 * m, rest - (n - 1 - i)))); xs.push(v); rest -= v; }
      if (rest < 1) return gen();
      xs.push(rest);
      return {
        q: '<p>The waiting times in minutes between four consecutive buses are \\(' + xs.join(', ') + '\\). Under an exponential model \\(p(x \\mid \\lambda) = \\lambda e^{-\\lambda x}\\), compute the maximum likelihood estimate of \\(\\lambda\\). A fraction such as 1/4 is accepted.</p>',
        answer: 1 / m, tol: 0.002,
        explain: 'The mean waiting time is \\(' + n * m + '/' + n + ' = ' + m + '\\), so \\(\\hat\\lambda = 1/\\bar x = 1/' + m + '\\).'
      };
    }
    if (t === 3) {
      m = M4.rand(-3, 3);
      var devs = M4.pick([[-2, -1, 1, 2], [-3, 0, 1, 2], [-2, 0, 0, 2], [-1, -1, 1, 1], [-3, -1, 1, 3], [-4, 1, 1, 2]]);
      xs = devs.map(function (d) { return d + m; });
      var vv = listSum(devs.map(function (d) { return d * d; })) / 4;
      return {
        q: '<p>Four measurements are \\(' + xs.join(', ') + '\\). Under a Gaussian model, compute the maximum likelihood estimate of the variance \\(\\sigma^2\\).</p>',
        answer: vv,
        explain: 'The mean is \\(' + m + '\\), the squared deviations are \\(' + devs.map(function (d) { return d * d; }).join(', ') + '\\), and their average is \\(' + M4.fmt(vv, 2).replace('−', '-') + '\\). Maximum likelihood divides by \\(n = 4\\).'
      };
    }
    var pair = M4.pick([[4, 2], [9, 3], [0.25, 0.5], [2.25, 1.5], [16, 4], [6.25, 2.5]]);
    return {
      q: '<p>A Gaussian fitted by maximum likelihood has \\(\\hat\\sigma^2 = ' + pair[0] + '\\). Compute the maximum likelihood estimate of the standard deviation \\(\\sigma\\).</p>',
      answer: pair[1],
      explain: 'Maximum likelihood estimates carry over through functions of the parameter: \\(\\hat\\sigma = \\sqrt{\\hat\\sigma^2} = ' + pair[1] + '\\).'
    };
  }

  M4.lesson({
    id: 'mle-s1',
    module: 'mle',
    title: 'Maximum likelihood estimators',
    summary: 'One recipe gives the estimator for every common distribution: write the log-likelihood, differentiate, and solve for the point where the slope is zero.',
    minutes: 22,
    steps: [
      {
        kind: 'text',
        title: 'A recipe for estimators',
        html: '<p>A <b>statistical model</b> is a family of distributions \\(p(x \\mid \\theta)\\) indexed by a parameter \\(\\theta\\). For independent observations \\(x_1, \\dots, x_n\\), the <b>likelihood</b> is the probability of the whole data set, read as a function of the parameter:</p>' +
          '\\[ \\mathcal L(\\theta) = \\prod_{i=1}^n p(x_i \\mid \\theta). \\]' +
          '<p>The <b>maximum likelihood estimate</b> \\(\\hat\\theta\\) is the parameter value with the largest likelihood. For the common distributions it follows from four steps.</p>' +
          '<ol><li>Write the <b>log-likelihood</b> \\(\\ell(\\theta) = \\sum_i \\log p(x_i \\mid \\theta)\\).</li>' +
          '<li>Differentiate with respect to \\(\\theta\\).</li>' +
          '<li>Set the derivative to zero and solve for \\(\\theta\\).</li>' +
          '<li>Check that the second derivative is negative, so the point is a maximum.</li></ol>' +
          '<p>The logarithm is increasing, so it keeps the location of the maximum, and it turns the product into a sum that can be differentiated term by term.</p>'
      },
      {
        kind: 'explore',
        title: 'Counts and the Poisson model',
        html: '<p>The <b>Poisson distribution</b> models how many independent events occur in a fixed interval, for example emails per hour:</p>' +
          '\\[ P(k \\mid \\lambda) = \\frac{\\lambda^k e^{-\\lambda}}{k!}, \\qquad k = 0, 1, 2, \\dots \\]' +
          '<p>The <b>rate</b> \\(\\lambda > 0\\) is the expected count. On the left, grey bars show how often each count occurs in the data and blue stems show the probabilities the model assigns. On the right is the average log-likelihood. Drag the purple point along the curve and follow the dashed tangent.</p>',
        mount: function (el) {
          var sc = poissonScene(el);
          var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el);
          M4.button(row, 'New data', function () { sc.fresh(); });
          M4.el('p', { class: 'm4-cap', text: 'A small rate puts too much probability on small counts, a large rate on large counts. The likelihood peaks where the blue stems match the grey bars best.' }, el);
        }
      },
      {
        kind: 'exercise',
        title: 'The best rate',
        html: '<p>Move the point to the top of the curve, where the tangent is flat. Compare the value of \\(\\lambda\\) you find with the data listed below the panels.</p>',
        hint: 'The slope of the average log-likelihood is \\(\\bar x / \\lambda - 1\\). It is zero at one value of \\(\\lambda\\).',
        mount: function (el, ctx) {
          var done = false;
          poissonScene(el, function (lam, mean) {
            if (!done && Math.abs(lam - mean) < 0.12) {
              done = true;
              ctx.solved('\\(\\hat\\lambda = ' + M4.fmt(mean, 2).replace('−', '-') + '\\), the average of the counts.');
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Two rate estimates',
        html: '<p><b>Poisson.</b> Taking logs of the probabilities and summing over the data gives</p>' +
          '\\[ \\ell(\\lambda) = \\sum_{i=1}^n \\big( k_i \\log\\lambda - \\lambda - \\log k_i! \\big), \\qquad \\ell\'(\\lambda) = \\frac{1}{\\lambda}\\sum_{i=1}^n k_i - n. \\]' +
          '<p>Setting \\(\\ell\'(\\lambda) = 0\\) gives \\(\\hat\\lambda = \\tfrac1n \\sum_i k_i = \\bar k\\), the sample mean. The second derivative \\(-\\sum_i k_i / \\lambda^2\\) is negative, so this is a maximum.</p>' +
          '<p><b>Exponential.</b> Waiting times between independent events follow the density \\(p(x \\mid \\lambda) = \\lambda e^{-\\lambda x}\\) for \\(x \\ge 0\\). Here</p>' +
          '\\[ \\ell(\\lambda) = n \\log\\lambda - \\lambda \\sum_{i=1}^n x_i, \\qquad \\ell\'(\\lambda) = \\frac{n}{\\lambda} - \\sum_{i=1}^n x_i, \\]' +
          '<p>so \\(\\hat\\lambda = 1/\\bar x\\). Events that arrive at rate \\(\\lambda\\) are on average \\(1/\\lambda\\) apart, and the estimate inverts the average gap.</p>' +
          '<p><b>Bernoulli.</b> The coin from the session on likelihood losses follows the same steps and gives \\(\\hat p = k/n\\), the fraction of successes.</p>'
      },
      {
        kind: 'exercise',
        title: 'Fitting a Gaussian',
        html: '<p>A Gaussian has two parameters, the mean \\(\\mu\\) and the standard deviation \\(\\sigma\\). The surface is the average negative log-likelihood over the \\((\\mu, \\sigma)\\) floor, so the best fit sits at the bottom. The plot below it draws the density for the position of the ball together with the eight data points. Drag the ball to the minimum.</p>',
        hint: 'First slide along \\(\\mu\\) until \\(\\partial/\\partial\\mu\\) is zero, then along \\(\\sigma\\) until \\(\\partial/\\partial\\sigma\\) is zero.',
        mount: function (el, ctx) {
          var done = false, sd = Math.sqrt(GVAR);
          gaussScene(el, function (mu, s) {
            if (!done && Math.abs(mu - GMEAN) < 0.07 && Math.abs(s - sd) < 0.06) {
              done = true;
              ctx.solved('\\(\\hat\\mu = ' + M4.fmt(GMEAN, 2) + '\\) is the sample mean and \\(\\hat\\sigma = ' + M4.fmt(sd, 2) + '\\) is the root of the average squared deviation.');
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'The Gaussian estimates',
        html: '<p>For the Gaussian the log-likelihood is</p>' +
          '\\[ \\ell(\\mu, \\sigma) = -n \\log\\sigma - \\frac{1}{2\\sigma^2} \\sum_{i=1}^n (x_i - \\mu)^2 + \\text{const}. \\]' +
          '<p>Both partial derivatives must vanish. The one for \\(\\mu\\) gives \\(\\sum_i (x_i - \\mu) = 0\\), so \\(\\hat\\mu = \\bar x\\). The one for \\(\\sigma\\) then gives</p>' +
          '\\[ \\hat\\sigma^2 = \\frac1n \\sum_{i=1}^n (x_i - \\bar x)^2. \\]' +
          '<p>This variance estimate divides by \\(n\\). Over many repeated data sets its average is \\(\\tfrac{n-1}{n}\\sigma^2\\), slightly too small, because \\(\\bar x\\) is fitted to the same data and sits closer to the points than the true mean does. Dividing by \\(n - 1\\) instead removes this <b>bias</b>, a systematic error of the estimate. For the data sizes of machine learning the difference is negligible.</p>' +
          '<p>Maximum likelihood estimates also pass through functions of the parameter: the estimate of \\(\\sigma\\) is \\(\\sqrt{\\hat\\sigma^2}\\), and the estimate of \\(1/\\lambda\\) is \\(1/\\hat\\lambda\\).</p>'
      },
      {
        kind: 'exercise',
        title: 'Estimator practice',
        html: '<p>Each problem uses one of the estimators above: \\(k/n\\), the sample mean, the reciprocal of the mean, or the average squared deviation.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: gen }); }
      },
      {
        kind: 'explore',
        title: 'More data, a sharper peak',
        html: '<p>The counts below come from a Poisson source whose true rate is \\(\\lambda = 3.5\\), marked by the dashed line. The purple curve is the likelihood of all counts so far, divided by its largest value so that the peak always has height one:</p>' +
          '\\[ \\frac{\\mathcal L(\\lambda)}{\\mathcal L(\\hat\\lambda)} = \\exp\\Big( n \\big( \\bar k \\log\\tfrac{\\lambda}{\\bar k} - \\lambda + \\bar k \\big) \\Big). \\]' +
          '<p>Add counts and follow both the position of the peak and its width.</p>',
        mount: function (el) {
          var TRUE = 3.5, data = [];
          var p = M4.plane(el, { xmin: -0.3, xmax: 8.3, ymin: -0.16, ymax: 1.18, width: 640, height: 300, axes: false });
          p.line(-0.3, 0, 8.3, 0, { stroke: C.muted, width: 1.5, layer: 'bg' });
          for (var t = 1; t <= 8; t++) { p.line(t, 0, t, 0.03, { stroke: C.muted, width: 1.5, layer: 'bg' }); p.text(t, -0.08, String(t), { size: 13, fill: C.muted }); }
          p.text(8.2, -0.08, 'λ', { size: 15, fill: C.muted, anchor: 'end' });
          p.line(TRUE, 0, TRUE, 1.1, { stroke: C.green, width: 2, dash: '6 5', layer: 'bg' });
          p.text(TRUE, 1.14, 'true rate', { size: 13, fill: C.green });
          var curve = p.fn(function () { return NaN; }, { stroke: C.purple, width: 3 });
          var peak = p.point(0, 0, { r: 6, color: C.purple, layer: 'top' });
          var info = M4.el('p', { style: 'text-align:center;margin:6px 0' }, el);
          var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, el);
          function add(m) { for (var i = 0; i < m; i++) data.push(poissonSample(TRUE)); draw(); }
          function draw() {
            var n = data.length;
            if (!n) {
              curve.set(function () { return NaN; }); peak.el.style.opacity = 0;
              info.textContent = 'No counts yet. Every rate is equally plausible.';
              return;
            }
            var kb = data.reduce(function (a, b) { return a + b; }, 0) / n;
            curve.set(function (lam) {
              if (lam <= 0) return NaN;
              if (kb === 0) return Math.exp(-n * lam);
              return Math.exp(n * (kb * Math.log(lam / kb) - lam + kb));
            });
            peak.set(kb, 1); peak.el.style.opacity = 1;
            var w = 2 * Math.sqrt(2 * Math.log(2) * Math.max(kb, 0.05) / n);
            info.innerHTML = '';
            var s = M4.el('span', { html: '\\(n = ' + n + '\\), &nbsp; \\(\\hat\\lambda = \\bar k = ' + M4.fmt(kb, 2) + '\\), &nbsp; width at half height about \\(' + M4.fmt(w, 2) + '\\)' }, info);
            M4.typeset(s);
          }
          M4.button(row, 'Add 1 count', function () { add(1); });
          M4.button(row, 'Add 10', function () { add(10); });
          M4.button(row, 'Add 100', function () { add(100); }, { primary: true });
          M4.button(row, 'Start over', function () { data = []; draw(); }, { ghost: true });
          draw();
          M4.el('p', { class: 'm4-cap', text: 'With a handful of counts the curve is wide and its peak can sit far from 3.5. Each time the number of counts grows by a factor of four, the width roughly halves.' }, el);
        }
      },
      {
        kind: 'exercise',
        title: 'How fast the peak narrows',
        html: '<p>Near its peak, the log-likelihood of the Poisson model is close to a downward parabola with curvature \\(\\ell\'\'(\\hat\\lambda) = -n / \\hat\\lambda\\). A parabola with curvature \\(-c\\) gives a bell whose width is proportional to \\(1/\\sqrt c\\).</p>' +
          '<p>A data set of 100 counts gives a likelihood peak of width 0.6. About how wide is the peak for 900 counts from the same source?</p>',
        hint: 'The curvature grows in proportion to \\(n\\), and the width shrinks with the square root of the curvature.',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['0.6, the width does not depend on \\(n\\)', '0.2', '0.067', '0.0067'],
            correct: 1,
            onWrong: function (i) {
              if (i === 0) ctx.wrong('More data makes the curvature \\(n/\\hat\\lambda\\) larger, so the peak does narrow.');
              else if (i === 2) ctx.wrong('That divides by 9, the growth of \\(n\\). The width shrinks with the square root of \\(n\\).');
              else ctx.wrong('That shrinks the width far too much. Compare how much \\(n\\) grows with how much \\(\\sqrt n\\) grows.');
            },
            onCorrect: function () { ctx.solved('Nine times the data makes the curvature nine times larger and the width \\(\\sqrt 9 = 3\\) times smaller, so \\(0.6 / 3 = 0.2\\). To halve the uncertainty you need four times the data.'); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>Maximum likelihood follows one recipe: sum the log probabilities, differentiate, set the derivative to zero, and check the sign of the second derivative.</li>' +
          '<li>The recipe gives familiar answers. The Poisson rate is the mean count, the Bernoulli probability is the fraction of successes, and the Gaussian parameters are the sample mean and the root of the average squared deviation.</li>' +
          '<li>With more data the likelihood peak moves toward the true parameter and narrows. Its width shrinks like \\(1/\\sqrt n\\), so four times the data halves the uncertainty.</li></ul>'
      }
    ]
  });
})();
