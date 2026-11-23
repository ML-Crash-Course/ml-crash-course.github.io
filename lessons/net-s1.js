(function () {
  'use strict';

  var C = M4.colors;
  var R = 1.1;                                  // the data plane shows [-R, R]^2

  /* ---------- a tiny seeded random number generator ---------- */
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

  /* ---------- datasets, 200 points each, label 1 = orange ---------- */
  function makeData(kind, seed) {
    var r = rng(seed), X = [], Y = [];
    for (var i = 0; i < 200; i++) {
      var c = i % 2, x, y;
      if (kind === 'blobs') {
        x = (c ? 0.4 : -0.4) + 0.22 * gauss(r); y = (c ? 0.3 : -0.3) + 0.22 * gauss(r);
      } else if (kind === 'circles') {
        var rad = c ? 0.42 * Math.sqrt(r()) : 0.62 + 0.3 * r(), a = 2 * Math.PI * r();
        x = rad * Math.cos(a) + 0.03 * gauss(r); y = rad * Math.sin(a) + 0.03 * gauss(r);
      } else if (kind === 'xor') {
        do { x = 2 * r() - 1; y = 2 * r() - 1; } while (Math.abs(x) < 0.08 || Math.abs(y) < 0.08);
        x *= 0.95; y *= 0.95; c = x * y > 0 ? 1 : 0;
      } else {
        var t = 0.12 + 0.88 * r(), ang = 3.2 * Math.PI * t + (c ? Math.PI : 0);
        x = 0.95 * t * Math.cos(ang) + 0.035 * gauss(r); y = 0.95 * t * Math.sin(ang) + 0.035 * gauss(r);
      }
      X.push([x, y]); Y.push(c);
    }
    return { X: X, Y: Y };
  }
  var DATA = {};
  ['blobs', 'circles', 'xor', 'spiral'].forEach(function (k) { DATA[k] = makeData(k, 7); });

  /* ---------- a small fully connected network ---------- */
  function Net(width, layers, act, seed) {
    var r = rng(seed), sizes = [2], l;
    for (l = 0; l < layers; l++) sizes.push(width);
    sizes.push(1);
    var W = [], B = [];
    for (l = 0; l + 1 < sizes.length; l++) {
      var nin = sizes[l], nout = sizes[l + 1], hidden = l + 2 < sizes.length;
      var sd = act === 'relu' && hidden ? Math.sqrt(2 / nin) : Math.sqrt(1 / nin);
      if (l === 0) sd *= 1.6;
      var w = [];
      for (var o = 0; o < nout; o++) { var row = []; for (var k = 0; k < nin; k++) row.push(sd * gauss(r)); w.push(row); }
      W.push(w);
      B.push(new Array(nout).fill(act === 'relu' && hidden ? 0.1 : 0));
    }
    return { W: W, B: B, act: act, t: 0, m: null, v: null };
  }
  function forward(net, x) {
    var acts = [x], zs = [], L = net.W.length, relu = net.act === 'relu';
    for (var l = 0; l < L; l++) {
      var a = acts[l], w = net.W[l], b = net.B[l], z = [], y = [];
      for (var o = 0; o < w.length; o++) {
        var s = b[o], row = w[o];
        for (var k = 0; k < a.length; k++) s += row[k] * a[k];
        z.push(s);
        y.push(l === L - 1 ? s : relu ? (s > 0 ? s : 0) : Math.tanh(s));
      }
      zs.push(z); acts.push(y);
    }
    return { acts: acts, zs: zs, logit: acts[L][0] };
  }
  function prob(net, x) { return 1 / (1 + Math.exp(-forward(net, x).logit)); }
  function evaluate(net, D) {
    var L = 0, A = 0, n = D.X.length;
    for (var i = 0; i < n; i++) {
      var z = forward(net, D.X[i]).logit, y = D.Y[i];
      L += Math.max(z, 0) - z * y + Math.log(1 + Math.exp(-Math.abs(z)));
      if ((z > 0 ? 1 : 0) === y) A++;
    }
    return { loss: L / n, acc: A / n };
  }
  function zeros(net) {
    return {
      W: net.W.map(function (w) { return w.map(function (r) { return r.map(function () { return 0; }); }); }),
      B: net.B.map(function (b) { return b.map(function () { return 0; }); })
    };
  }
  // one full batch step of gradient descent or Adam on the binary cross entropy
  function trainStep(net, D, lr, opt) {
    var L = net.W.length, g = zeros(net), n = D.X.length, relu = net.act === 'relu', l, o, k;
    for (var i = 0; i < n; i++) {
      var F = forward(net, D.X[i]), p = 1 / (1 + Math.exp(-F.logit));
      var delta = [(p - D.Y[i]) / n];
      for (l = L - 1; l >= 0; l--) {
        var a = F.acts[l], w = net.W[l], nd = l > 0 ? new Array(a.length).fill(0) : null;
        for (o = 0; o < w.length; o++) {
          var d = delta[o];
          if (d === 0) continue;
          g.B[l][o] += d;
          var row = w[o], grow = g.W[l][o];
          for (k = 0; k < a.length; k++) { grow[k] += d * a[k]; if (nd) nd[k] += d * row[k]; }
        }
        if (nd) {
          for (k = 0; k < nd.length; k++) nd[k] *= relu ? (F.zs[l - 1][k] > 0 ? 1 : 0) : 1 - a[k] * a[k];
          delta = nd;
        }
      }
    }
    net.t++;
    if (opt === 'gd') {
      for (l = 0; l < L; l++) for (o = 0; o < net.W[l].length; o++) {
        for (k = 0; k < net.W[l][o].length; k++) net.W[l][o][k] -= lr * g.W[l][o][k];
        net.B[l][o] -= lr * g.B[l][o];
      }
      return;
    }
    if (!net.m) { net.m = zeros(net); net.v = zeros(net); }
    var b1 = 0.9, b2 = 0.999, c1 = 1 - Math.pow(b1, net.t), c2 = 1 - Math.pow(b2, net.t);
    function upd(P, G, M, V, idx) {
      var m = M[idx] = b1 * M[idx] + (1 - b1) * G[idx];
      var v = V[idx] = b2 * V[idx] + (1 - b2) * G[idx] * G[idx];
      P[idx] -= lr * (m / c1) / (Math.sqrt(v / c2) + 1e-8);
    }
    for (l = 0; l < L; l++) for (o = 0; o < net.W[l].length; o++) {
      for (k = 0; k < net.W[l][o].length; k++) upd(net.W[l][o], g.W[l][o], net.m.W[l][o], net.v.W[l][o], k);
      upd(net.B[l], g.B[l], net.m.B[l], net.v.B[l], o);
    }
  }
  M4.mlp = { rng: rng, makeData: makeData, Net: Net, forward: forward, prob: prob, evaluate: evaluate, trainStep: trainStep };

  /* ---------- drawing helpers ---------- */
  var BLUE_T = [192, 210, 235], MID = [251, 249, 243], ORANGE_T = [242, 210, 180];
  function tint(p) {
    var a = p < 0.5 ? BLUE_T : ORANGE_T, t = Math.min(1, Math.abs(p - 0.5) * 2.2);
    t = Math.pow(t, 0.8);
    return [MID[0] + (a[0] - MID[0]) * t, MID[1] + (a[1] - MID[1]) * t, MID[2] + (a[2] - MID[2]) * t];
  }
  function paintField(cv, net) {
    var w = cv.width, h = cv.height, c2 = cv.getContext('2d'), img = c2.createImageData(w, h);
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var x = -R + 2 * R * (i + 0.5) / w, y = R - 2 * R * (j + 0.5) / h;
      var col = tint(prob(net, [x, y])), q = (j * w + i) * 4;
      img.data[q] = col[0]; img.data[q + 1] = col[1]; img.data[q + 2] = col[2]; img.data[q + 3] = 255;
    }
    c2.putImageData(img, 0, 0);
  }
  function clipLine(a, b, c) {
    var pts = [], e = 1e-9;
    if (Math.abs(b) > e) [-R, R].forEach(function (x) { var y = -(a * x + c) / b; if (Math.abs(y) <= R + e) pts.push([x, y]); });
    if (Math.abs(a) > e) [-R, R].forEach(function (y) { var x = -(b * y + c) / a; if (Math.abs(x) <= R + e) pts.push([x, y]); });
    if (pts.length < 2) return null;
    var best = null, bd = -1;
    for (var i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) {
      var d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (d > bd) { bd = d; best = [pts[i], pts[j]]; }
    }
    return bd > 0.02 ? best : null;
  }
  function chip(parent, label, color) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    var l = M4.el('span', { text: label + ' ' }, r);
    l.style.fontWeight = '700';
    if (color) l.style.color = color;
    var v = M4.el('span', { text: '' }, r);
    return function (t) { v.textContent = t; };
  }
  function row(el) { return M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px;gap:10px;flex-wrap:wrap' }, el); }
  function seg(parent, label, opts, value, onPick) {
    var wrap = M4.el('div', { class: 'm4-segctl' }, parent), btns = {};
    M4.el('span', { text: label }, wrap);
    opts.forEach(function (o) {
      btns[o[0]] = M4.button(wrap, o[1], function () { set(o[0]); onPick(o[0]); });
    });
    function set(v) { Object.keys(btns).forEach(function (k) { btns[k].classList.toggle('primary', String(k) === String(v)); }); }
    set(value);
    return { set: set };
  }
  function lrText(e) { var v = Math.pow(10, e); return String(+v.toPrecision(v < 0.01 ? 1 : 2)); }
  function pct(a) { return Math.round(a * 100) + '%'; }

  /* ---------- the playground ---------- */
  var LOGMIN = -3.3, LOGMAX = 2;
  function playground(el, ctx, o) {
    var st = {
      data: o.data || 'circles', act: o.act || 'tanh', layers: o.layers || 1, width: o.width || 4,
      lr: o.lr == null ? -1.5 : o.lr, opt: o.opt || 'adam', hidden: !!o.hidden, seed: o.seed || 1
    };
    var show = o.controls || ['data', 'act', 'opt', 'layers', 'width', 'lr', 'hidden'];
    var net, hist, running = false, raf = 0, maxSteps = o.maxSteps || 4000;

    var two = M4.el('div', { class: 'm4-two' }, el);
    var left = M4.el('div', {}, two), right = M4.el('div', {}, two);

    // data plane with the probability field behind the points
    var P = M4.plane(left, { xmin: -R, xmax: R, ymin: -R, ymax: R, width: 360, height: 360, grid: false, axes: false, labels: false });
    var field = M4.svg('image', { x: 0, y: 0, width: 360, height: 360, preserveAspectRatio: 'none' }, P.bg);
    M4.svg('rect', { x: 0.5, y: 0.5, width: 359, height: 359, fill: 'none', stroke: C.line }, P.bg);
    var cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
    var hidG = M4.svg('g', {}, P.g), ptG = M4.svg('g', {}, P.g);
    M4.el('div', { class: 'm4-cap', html: 'background: predicted probability of <span style="color:' + C.orange + '">orange</span>' }, left);

    // loss curve on a log axis
    var LP = M4.plane(right, { xmin: -0.2, xmax: 1.04, ymin: LOGMIN - 0.45, ymax: LOGMAX + 0.55, width: 380, height: 330, grid: false, axes: false, labels: false });
    [-3, -2, -1, 0, 1, 2].forEach(function (k) {
      LP.line(-0.02, k, 1.02, k, { stroke: C.line, width: 1, layer: 'bg' });
      LP.text(-0.04, k, ['0.001', '0.01', '0.1', '1', '10', '100'][k + 3], { size: 16, fill: C.muted, anchor: 'end', weight: 400 });
    });
    LP.line(0, LOGMIN, 0, LOGMAX + 0.1, { stroke: C.muted, width: 1.5, layer: 'bg' });
    LP.line(0, LOGMIN, 1.02, LOGMIN, { stroke: C.muted, width: 1.5, layer: 'bg' });
    LP.text(0, LOGMIN - 0.25, '0', { size: 16, fill: C.muted, weight: 400 });
    LP.text(0.5, LOGMIN - 0.25, 'steps', { size: 16, fill: C.muted, weight: 400 });
    var maxLab = LP.text(1.02, LOGMIN - 0.25, '', { size: 16, fill: C.muted, anchor: 'end', weight: 400 });
    LP.text(0.01, LOGMAX + 0.32, 'loss', { size: 16, fill: C.muted, anchor: 'start', weight: 400 });
    var curve = M4.svg('path', { fill: 'none', stroke: C.purple, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, LP.g);
    var r1 = row(el);
    var cS = chip(r1, 'steps'), cL = chip(r1, 'loss', C.purple), cA = chip(r1, 'accuracy', C.green);

    // controls
    var bRow = row(el);
    var bTrain = M4.button(bRow, 'Train', function () { running ? pause() : play(); }, { primary: true });
    M4.button(bRow, 'One step', function () { pause(); stepN(1); draw(); });
    M4.button(bRow, 'New start', function () { st.seed++; reset(); });
    var box = M4.el('div', { style: 'max-width:640px;margin:10px auto 0' }, el);
    var segs = {};
    if (show.indexOf('data') >= 0) segs.data = seg(box, 'data', [['blobs', 'blobs'], ['circles', 'circles'], ['xor', 'xor'], ['spiral', 'spiral']], st.data, function (v) { st.data = v; reset(); });
    if (show.indexOf('act') >= 0) segs.act = seg(box, 'activation', [['tanh', 'tanh'], ['relu', 'ReLU']], st.act, function (v) { st.act = v; reset(); });
    if (show.indexOf('opt') >= 0) segs.opt = seg(box, 'optimizer', [['gd', 'gradient descent'], ['adam', 'Adam']], st.opt, function (v) { st.opt = v; reset(); });
    if (show.indexOf('layers') >= 0) segs.layers = seg(box, 'hidden layers', [[1, '1'], [2, '2']], st.layers, function (v) { st.layers = +v; reset(); });
    if (show.indexOf('hidden') >= 0) segs.hidden = seg(box, 'first layer lines', [['off', 'hide'], ['on', 'show']], st.hidden ? 'on' : 'off', function (v) { st.hidden = v === 'on'; draw(); });
    var sl = M4.el('div', { style: 'max-width:440px;margin:4px auto 0' }, el);
    if (show.indexOf('width') >= 0) M4.slider(sl, { min: 1, max: 16, step: 1, value: st.width, label: 'units per layer', format: function (v) { return String(v); }, onInput: function (v) { st.width = v; reset(); } });
    if (show.indexOf('lr') >= 0) M4.slider(sl, { min: -3, max: 1.5, step: 0.05, value: st.lr, label: 'learning rate', format: lrText, onInput: function (v) { st.lr = v; } });

    function drawPoints() {
      ptG.innerHTML = '';
      var D = DATA[st.data];
      for (var i = 0; i < D.X.length; i++) {
        M4.svg('circle', { cx: P.x(D.X[i][0]), cy: P.y(D.X[i][1]), r: 4.5, fill: D.Y[i] ? C.orange : C.blue, stroke: '#fff', 'stroke-width': 1.2 }, ptG);
      }
    }
    function draw() {
      paintField(cv, net);
      var url = cv.toDataURL('image/png');
      field.setAttribute('href', url);
      field.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
      hidG.innerHTML = '';
      if (st.hidden) {
        var w = net.W[0], b = net.B[0];
        for (var u = 0; u < w.length; u++) {
          var s = clipLine(w[u][0], w[u][1], b[u]);
          if (s) M4.svg('line', { x1: P.x(s[0][0]), y1: P.y(s[0][1]), x2: P.x(s[1][0]), y2: P.y(s[1][1]), stroke: C.ink, 'stroke-width': 1.6, 'stroke-dasharray': '6 5', opacity: 0.75 }, hidG);
        }
      }
      // loss curve
      var n = hist.length, span = 250;
      while (span < n) span *= 2;
      maxLab.el.textContent = String(span);
      var d = '', stride = Math.max(1, Math.floor(n / 300));
      for (var i = 0; i < n; i += stride) {
        var y = Math.max(LOGMIN, Math.min(LOGMAX, Math.log10(Math.max(hist[i], 1e-9))));
        d += (d ? 'L' : 'M') + LP.x(i / span).toFixed(1) + ',' + LP.y(y).toFixed(1);
      }
      curve.setAttribute('d', d);
      var ev = evaluate(net, DATA[st.data]);
      cS(String(net.t)); cL(ev.loss < 0.001 ? '< 0.001' : ev.loss >= 10 ? ev.loss.toFixed(0) : ev.loss.toFixed(3)); cA(pct(ev.acc));
      if (o.onUpdate) o.onUpdate({ acc: ev.acc, loss: ev.loss, steps: net.t, st: st, running: running });
    }
    function stepN(k) {
      var D = DATA[st.data], lr = Math.pow(10, st.lr);
      for (var i = 0; i < k; i++) {
        if (hist.length === 0) hist.push(evaluate(net, D).loss);
        trainStep(net, D, lr, st.opt);
        hist.push(evaluate(net, D).loss);
      }
    }
    function frame() {
      if (!running) return;
      var t0 = performance.now(), k = 0;
      while (k < 4 || (performance.now() - t0 < 8 && k < 20)) { stepN(1); k++; }
      draw();
      if (net.t >= maxSteps) { pause(); return; }
      raf = requestAnimationFrame(frame);
    }
    function play() { if (running) return; running = true; bTrain.textContent = 'Pause'; raf = requestAnimationFrame(frame); }
    function pause() { running = false; cancelAnimationFrame(raf); bTrain.textContent = 'Train'; }
    function reset() {
      net = Net(st.width, st.layers, st.act, st.seed);
      hist = [];
      drawPoints(); draw();
    }
    ctx.onCleanup(pause);
    reset();
    return { state: st, play: play, pause: pause, reset: reset };
  }

  /* ---------- eight random starts ---------- */
  function seedGrid(el, ctx) {
    var width = 3, job = 0;
    var grid = M4.el('div', { class: 'm4-thumbs' }, el), cells = [];
    for (var i = 0; i < 8; i++) {
      var f = M4.el('figure', {}, grid), c = M4.el('canvas', {}, f);
      c.width = 120; c.height = 120;
      cells.push({ cv: c, cap: M4.el('figcaption', { text: ' ' }, f) });
    }
    var out = M4.el('div', { class: 'm4-cap', style: 'margin-top:8px;font-size:16px', text: '' }, el);
    var r = row(el);
    var sg = seg(r, 'hidden units', [[3, '3'], [8, '8']], width, function (v) { width = +v; clear(); });
    var bRun = M4.button(r, 'Train eight networks', run, { primary: true });
    function clear() {
      job++;
      cells.forEach(function (c) { var g = c.cv.getContext('2d'); g.fillStyle = '#fbf9f3'; g.fillRect(0, 0, 120, 120); c.cap.textContent = ' '; });
      out.textContent = '';
    }
    function paint(c, net) {
      paintField(c.cv, net);
      var g = c.cv.getContext('2d'), D = DATA.xor;
      for (var i = 0; i < D.X.length; i++) {
        g.beginPath();
        g.arc((D.X[i][0] + R) / (2 * R) * 120, (R - D.X[i][1]) / (2 * R) * 120, 2.2, 0, 2 * Math.PI);
        g.fillStyle = D.Y[i] ? C.orange : C.blue; g.fill();
      }
    }
    function run() {
      clear();
      var my = job, k = 0, accs = [], base = 1 + Math.floor(Math.random() * 1000);
      bRun.disabled = true;
      function next() {
        if (my !== job) { bRun.disabled = false; return; }
        if (k >= 8) {
          bRun.disabled = false;
          var good = accs.filter(function (a) { return a >= 0.97; }).length;
          out.textContent = good + ' of 8 networks with ' + width + ' hidden units reached at least 97%.';
          if (o.onDone) o.onDone(width, good);
          return;
        }
        var net = Net(width, 1, 'tanh', base + k);
        for (var s = 0; s < 800; s++) trainStep(net, DATA.xor, 0.03, 'adam');
        var ev = evaluate(net, DATA.xor);
        accs.push(ev.acc);
        paint(cells[k], net);
        cells[k].cap.textContent = pct(ev.acc);
        k++;
        setTimeout(next, 30);
      }
      setTimeout(next, 30);
    }
    var o = {};
    clear();
    ctx.onCleanup(function () { job++; });
    return o;
  }

  /* ---------- cross entropy practice ---------- */
  function gen() {
    var p = M4.pick([0.6, 0.7, 0.8, 0.9, 0.95, 0.99, 0.3, 0.2, 0.1, 0.05]);
    var y = M4.pick([0, 1]);
    var q = y ? p : 1 - p, ans = -Math.log(q);
    return {
      q: 'The network predicts \\(p = ' + p + '\\) for the orange class. The true label is \\(y = ' + y + '\\)' + (y ? ' (orange)' : ' (blue)') + '. What is the loss of this example?',
      answer: ans, tol: 0.01,
      hint: 'For \\(y = 1\\) the loss is \\(-\\ln p\\). For \\(y = 0\\) it is \\(-\\ln(1 - p)\\).',
      explain: 'The probability given to the true class is ' + (y ? '\\(p = ' + p + '\\)' : '\\(1 - p = ' + M4.fmt(1 - p, 2) + '\\)') + ', so the loss is \\(-\\ln ' + M4.fmt(q, 2) + ' = ' + M4.fmt(ans, 3) + '\\).'
    };
  }

  M4.lesson({
    id: 'net-s1',
    module: 'training',
    title: 'Training a network',
    summary: 'A small neural network learns to separate two classes of points in the plane. The width, depth, learning rate and other settings can be changed while it trains.',
    minutes: 20,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>The earlier modules built every piece of a neural network: layers, activations, a loss, gradients from backpropagation and an optimizer. This lesson puts them together and trains networks in your browser. After this lesson you can</p>' +
          '<ul><li>describe the four parts of one training step,</li>' +
          '<li>pick a width and depth that are large enough for a dataset,</li>' +
          '<li>read a loss curve and explain why two runs can end differently.</li></ul>'
      },
      {
        kind: 'text',
        title: 'The training loop',
        html: '<p>Every point \\(x_i\\) in the plane has a label \\(y_i\\), 1 for orange and 0 for blue. The network maps \\(x_i\\) to a number \\(z_i\\), and the sigmoid turns it into a probability \\(p_i = \\sigma(z_i)\\) for orange. The loss is the <b>binary cross entropy</b></p>' +
          '\\[ L = -\\frac1n \\sum_{i=1}^{n} \\Big( y_i \\ln p_i + (1 - y_i) \\ln (1 - p_i) \\Big). \\]' +
          '<p>Training repeats four steps:</p>' +
          '<ol><li><b>Forward pass.</b> Compute \\(p_i\\) for every point.</li>' +
          '<li><b>Loss.</b> Average the cross entropy.</li>' +
          '<li><b>Backward pass.</b> Backpropagation gives the gradient of \\(L\\) with respect to every weight.</li>' +
          '<li><b>Update.</b> The optimizer moves every weight a little against its gradient.</li></ol>' +
          '<p>Here every step uses all 200 points. With large datasets one uses a small random batch instead.</p>'
      },
      {
        kind: 'exercise',
        title: 'Practice: The loss of one point',
        html: '<p>For one point the loss is minus the log of the probability that the network gives to the true class.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 3, gen: gen }); }
      },
      {
        kind: 'explore',
        title: 'A network in the browser',
        html: '<p>Press <b>Train</b>. The background color shows what the network predicts at every location, orange where it says orange and blue where it says blue. The second plot shows the loss after every step.</p>' +
          '<p>Try all four datasets. Change the number of units or layers, or switch to ReLU. Every change starts a fresh network.</p>',
        mount: function (el, ctx) { playground(el, ctx, { data: 'xor', width: 4, controls: ['data', 'act', 'layers', 'width', 'lr'] }); }
      },
      {
        kind: 'exercise',
        title: 'Separating the circles',
        html: '<p>The network starts with a single hidden unit. Give it more units until it reaches at least 95% accuracy on the circles. How few are enough?</p>',
        hint: 'One unit can only split the plane along a single line. How many lines do you need to fence in the orange disk?',
        mount: function (el, ctx) {
          var done = false;
          playground(el, ctx, {
            data: 'circles', width: 1, controls: ['width'],
            onUpdate: function (s) {
              if (done || s.acc < 0.95) return;
              done = true;
              ctx.solved(s.st.width <= 3
                ? 'With ' + s.st.width + ' hidden units the network reaches ' + pct(s.acc) + '. Three lines are enough to fence in the orange disk with a triangle.'
                : 'Accuracy ' + pct(s.acc) + ' with ' + s.st.width + ' units. Try fewer as well. Three units already get there.');
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Looking inside',
        html: '<p>A hidden unit computes \\(\\tanh(w_1 x_1 + w_2 x_2 + b)\\). This is constant along every line \\(w_1 x_1 + w_2 x_2 + b = c\\) and changes fastest across the line \\(w_1 x_1 + w_2 x_2 + b = 0\\). The dashed lines show these lines, one per hidden unit.</p>' +
          '<p>Train with 2 units and then with 3. Two lines can cut out a strip or a wedge, but never a closed region. Three lines can form a triangle around the orange disk, and the output adds the three units to fill it in.</p>',
        mount: function (el, ctx) { playground(el, ctx, { data: 'circles', width: 3, hidden: true, controls: ['width', 'hidden'] }); }
      },
      {
        kind: 'explore',
        title: 'A learning rate that is too large',
        html: '<p>This network uses plain gradient descent with a learning rate of about 30. Press <b>Train</b> and look at the loss curve. Then lower the learning rate to about 3 and press <b>New start</b>. Try about 0.1 as well.</p>',
        mount: function (el, ctx) { playground(el, ctx, { data: 'circles', width: 8, opt: 'gd', lr: Math.log10(30), controls: ['lr'], maxSteps: 2000 }); }
      },
      {
        kind: 'text',
        title: 'Reading a loss curve',
        html: '<ul><li><b>Too large.</b> The steps jump over the valley. The loss jumps up and down by large amounts or grows, and the background flips between colors.</li>' +
          '<li><b>Too small.</b> The loss falls smoothly but so slowly that training never gets far.</li>' +
          '<li><b>About right.</b> The loss falls fast at first and then keeps falling more slowly.</li></ul>' +
          '<p>The axis of the loss is logarithmic, so equal heights mean equal factors. A curve that keeps falling in a straight line is still improving by the same factor every few steps.</p>'
      },
      {
        kind: 'exercise',
        title: 'The spiral',
        html: '<p>Two arms of a spiral wind around each other. Reach at least 90% accuracy. You may change everything below.</p>',
        hint: 'A single layer needs many units for this shape. A second layer can combine the regions of the first.',
        mount: function (el, ctx) {
          var done = false;
          playground(el, ctx, {
            data: 'spiral', width: 2, controls: ['act', 'layers', 'width', 'lr'],
            onUpdate: function (s) {
              if (done || s.acc < 0.9) return;
              done = true;
              ctx.solved('Accuracy ' + pct(s.acc) + ' with ' + s.st.layers + (s.st.layers === 1 ? ' hidden layer' : ' hidden layers') + ' of ' + s.st.width + ' units after ' + s.steps + ' steps.');
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Eight random starts',
        html: '<p>Training starts from random weights, and gradient descent only goes downhill from there. Different starts can end in different places. The button trains eight networks on the xor data that differ only in their starting weights.</p>' +
          '<p>Compare 3 hidden units with 8.</p>',
        mount: function (el, ctx) { seedGrid(el, ctx); }
      },
      {
        kind: 'text',
        title: 'Why wider networks train more reliably',
        html: '<p>With 3 hidden units the network has few lines to spare, and they all have to end up in useful places. Some starts get stuck with a line in a useless position, a <b>local minimum</b> of the loss. With 8 units there are many ways to solve the task, so almost every start finds one.</p>' +
          '<p>This is one reason why large networks are used even when a smaller one could in principle fit the data. The extra width makes the optimization easier. Overfitting is then controlled by the methods of the generalization module.</p>'
      },
      {
        kind: 'text',
        title: 'When training fails',
        html: '<ol><li><b>Fit a few examples first.</b> A network that cannot reach zero loss on ten examples has a bug.</li>' +
          '<li><b>Look at the loss curve.</b> Jumps mean a learning rate that is too large. A flat curve from the start can mean one that is too small.</li>' +
          '<li><b>Make the network larger.</b> If training accuracy stays low, the model may be too small.</li>' +
          '<li><b>Try several starts.</b> A single unlucky start says little.</li></ol>' +
          '<p>Adam with a learning rate around \\(10^{-3}\\) is a common first choice for large networks.</p>'
      },
      {
        kind: 'exercise',
        title: 'A loss curve',
        html: '<p>During training the loss jumps between 0.3 and 40 and never settles. Which change helps most?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['Lower the learning rate', 'Add more hidden units', 'Train for more steps', 'Start from new random weights'],
            correct: 0,
            onCorrect: function () { ctx.solved('Large jumps of the loss mean that each step overshoots the valley. A smaller learning rate takes smaller steps.'); },
            onWrong: function () { ctx.wrong('Think about what makes a step land on the far side of the valley.'); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>One training step is a forward pass, the cross entropy loss, a backward pass and an update of every weight.</li>' +
          '<li>Each hidden unit of the first layer splits the plane along a line. Width and depth decide which regions the network can form.</li>' +
          '<li>A loss that jumps calls for a smaller learning rate, and wider networks reach good solutions from more random starts.</li></ul>'
      }
    ]
  });
})();
