(function () {
  'use strict';
  var C = M4.colors;
  var TRAIN = '#d9a400';

  function injectStyle() {
    if (document.getElementById('l1-s4-style')) return;
    var s = document.createElement('style');
    s.id = 'l1-s4-style';
    s.textContent = [
      '.l1-s4-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;}',
      '.l1-s4-ok{background:#e4f8ee !important;border-color:' + C.green + ' !important;color:#0b7a46 !important;}',
      '.l1-s4-bad{background:#fdeceb !important;border-color:' + C.red + ' !important;color:#b3261e !important;}',
      '.l1-s4-cols{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;}',
      '.l1-s4-colcell{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:84px;padding:10px 8px;border-radius:14px;background:#fff;border:2px solid ' + C.line + ';}',
      '.l1-s4-colcell.l1-s4-tap{cursor:pointer;}',
      '.l1-s4-w{font-weight:700;font-size:22px;color:' + C.blue + ';font-variant-numeric:tabular-nums;}',
      '.l1-s4-f{font-weight:700;font-size:22px;color:' + C.orange + ';font-variant-numeric:tabular-nums;}',
      '.l1-s4-lab{font-size:15px;color:' + C.muted + ';}',
      '.l1-s4-times{font-size:18px;color:' + C.muted + ';line-height:1;}',
      '.l1-s4-prod{font-weight:700;font-size:20px;min-height:28px;color:' + C.ink + ';font-variant-numeric:tabular-nums;}',
      '.l1-s4-slot{width:64px;height:56px;display:flex;align-items:center;justify-content:center;}',
      '.l1-s4-tok{min-width:56px;height:50px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;padding:0 10px;touch-action:none;user-select:none;}',
      '.l1-s4-tray{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;min-height:60px;padding:10px;border-radius:14px;background:' + C.bg + ';border:2px solid ' + C.line + ';width:100%;box-sizing:border-box;}',
      '.l1-s4-sum{font-size:20px;min-height:34px;text-align:center;}',
      '.l1-s4-mat{display:grid;grid-template-columns:auto repeat(3,64px);gap:8px 10px;align-items:center;justify-content:center;}',
      '.l1-s4-mcell{height:52px;display:flex;align-items:center;justify-content:center;border-radius:12px;font-weight:700;font-size:21px;border:2px solid ' + C.line + ';background:#fff;font-variant-numeric:tabular-nums;}',
      '.l1-s4-mhead{font-size:15px;color:' + C.muted + ';text-align:center;}',
      '.l1-s4-rowlab{font-size:16px;font-weight:600;text-align:right;padding-right:6px;}',
      '.l1-s4-bars{width:100%;max-width:560px;display:flex;flex-direction:column;gap:12px;}',
      '.l1-s4-bar{display:grid;grid-template-columns:64px 1fr 64px;gap:12px;align-items:center;font-size:17px;font-weight:600;}',
      '.l1-s4-track{position:relative;height:30px;border-radius:15px;background:#efede6;overflow:hidden;}',
      '.l1-s4-fill{position:absolute;left:0;top:0;bottom:0;border-radius:15px;transition:width .12s linear;}',
      '.l1-s4-mark{position:absolute;top:0;bottom:0;width:3px;background:' + C.ink + ';opacity:.55;}',
      '.l1-s4-val{font-variant-numeric:tabular-nums;text-align:right;}',
      '.l1-s4-sliders{width:100%;max-width:560px;display:flex;flex-direction:column;gap:6px;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function fmt(v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
  function readout(parent, text) { return M4.el('span', { class: 'm4-readout', text: text || '' }, parent); }

  /* ---------- line fitting data (x: price yesterday, y: price today) ---------- */
  var FX = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var FN = [0.4, -0.5, 0.3, -0.2, 0.6, -0.4, 0.1, -0.3, 0.2];
  var FY = FX.map(function (x, i) { return 1 + 0.8 * x + FN[i]; });
  function fitMse(w1, w2) {
    var s = 0;
    for (var i = 0; i < FX.length; i++) { var r = FY[i] - (w1 + w2 * FX[i]); s += r * r; }
    return s / FX.length;
  }
  var FIT_TARGET = 0.25;

  function buildFit(el, ctx, exercise) {
    injectStyle();
    var wrap = M4.el('div', { class: 'l1-s4-wrap' }, el);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rW1 = readout(row), rW2 = readout(row), rErr = readout(row);
    var p = M4.plane(wrap, { xmin: -1, xmax: 11, ymin: -1, ymax: 11, width: 520, height: 520 });
    var yA = 8, yB = 4, done = false;
    var res = FX.map(function (x, i) { return p.line(x, FY[i], x, FY[i], { stroke: C.pink, width: 3 }); });
    var line = p.line(-1, 0, 11, 0, { stroke: C.blue, width: 4 });
    FX.forEach(function (x, i) {
      var pt = p.point(x, FY[i], { r: 7, fill: C.yellow });
      pt.el.setAttribute('stroke', TRAIN); pt.el.setAttribute('stroke-width', '2');
    });
    p.text(9.2, -0.75, 'price yesterday', { fill: C.muted, size: 15 });
    p.text(0.25, 10.5, 'price today', { fill: C.muted, size: 15, anchor: 'start' });
    var hA, hB;
    function update() {
      var w2 = (yB - yA) / 8, w1 = yA - w2;
      line.set(-1, w1 - w2, 11, w1 + 11 * w2);
      for (var i = 0; i < FX.length; i++) res[i].set(FX[i], FY[i], FX[i], w1 + w2 * FX[i]);
      var e = fitMse(w1, w2);
      rW1.textContent = 'offset w₁ = ' + fmt(w1, 2);
      rW2.textContent = 'slope w₂ = ' + fmt(w2, 2);
      rErr.textContent = 'train error = ' + fmt(e, 2);
      if (exercise) rErr.classList.toggle('l1-s4-ok', e <= FIT_TARGET);
      return e;
    }
    function check() {
      if (!exercise || done) return;
      var e = update();
      if (e <= FIT_TARGET) {
        done = true;
        res.forEach(function (r) { r.el.setAttribute('stroke', C.green); });
        ctx.note('Train error ' + fmt(e, 2) + ' is below ' + FIT_TARGET + '. The line passes close to every data point.');
        ctx.solved();
      } else {
        var w2 = (yB - yA) / 8;
        ctx.note('Train error ' + fmt(e, 2) + ' is still above ' + FIT_TARGET + '. ' +
          (w2 < 0.6 ? 'The slope is too small: raise the right handle or lower the left one.' :
            w2 > 1.0 ? 'The slope is too large: lower the right handle or raise the left one.' :
              'The slope is close. Shift both handles together until the pink residuals are short on both sides of the line.'));
      }
    }
    hA = p.handle(1, yA, { color: C.blue, r: 13, onDrag: function (x, y) { yA = clamp(y, -0.5, 10.5); hA.set(1, yA); update(); }, onEnd: function () { hA.set(1, yA); check(); } });
    hB = p.handle(9, yB, { color: C.blue, r: 13, onDrag: function (x, y) { yB = clamp(y, -0.5, 10.5); hB.set(9, yB); update(); }, onEnd: function () { hB.set(9, yB); check(); } });
    update();
    M4.el('div', { class: 'm4-note', text: exercise ? 'Drag the two blue handles up and down. Goal: train error at most ' + FIT_TARGET + '.' : 'Drag the two blue handles up and down. Each pink segment is one residual.' }, wrap);
  }

  /* ---------- polynomial capacity ---------- */
  function trueG(x) { return 0.2 + 1.2 * x - 0.6 * x * x * x; }
  var TRX = [], TRY = [];
  var TRN = [0.15, -0.2, 0.1, 0.22, -0.18, 0.05, -0.12, 0.2, -0.15, 0.1];
  for (var i0 = 0; i0 < 10; i0++) { TRX.push(-1 + 2 * i0 / 9); TRY.push(trueG(TRX[i0]) + TRN[i0]); }
  var TEX = [-0.9, -0.65, -0.4, -0.15, 0.1, 0.35, 0.6, 0.9];
  var TEN = [-0.1, 0.12, -0.05, 0.08, -0.14, 0.1, 0.06, -0.08];
  var TEY = TEX.map(function (x, i) { return trueG(x) + TEN[i]; });

  function fitPoly(xs, ys, m) { // m parameters, degree m-1, least squares
    var A = [], i, j, k;
    for (i = 0; i < m; i++) {
      A.push([]);
      for (j = 0; j <= m; j++) A[i].push(0);
    }
    for (k = 0; k < xs.length; k++) {
      var pw = [1];
      for (i = 1; i < m; i++) pw.push(pw[i - 1] * xs[k]);
      for (i = 0; i < m; i++) {
        for (j = 0; j < m; j++) A[i][j] += pw[i] * pw[j];
        A[i][m] += pw[i] * ys[k];
      }
    }
    for (i = 0; i < m; i++) {
      var piv = i;
      for (k = i + 1; k < m; k++) if (Math.abs(A[k][i]) > Math.abs(A[piv][i])) piv = k;
      var t = A[i]; A[i] = A[piv]; A[piv] = t;
      for (k = i + 1; k < m; k++) {
        var f = A[k][i] / A[i][i];
        for (j = i; j <= m; j++) A[k][j] -= f * A[i][j];
      }
    }
    var w = new Array(m);
    for (i = m - 1; i >= 0; i--) {
      var s = A[i][m];
      for (j = i + 1; j < m; j++) s -= A[i][j] * w[j];
      w[i] = s / A[i][i];
    }
    return w;
  }
  function evalPoly(w, x) { var s = 0; for (var i = w.length - 1; i >= 0; i--) s = s * x + w[i]; return s; }
  function mse(w, xs, ys) { var s = 0; for (var i = 0; i < xs.length; i++) { var r = ys[i] - evalPoly(w, xs[i]); s += r * r; } return s / xs.length; }
  var FITS = [null], ETR = [null], ETE = [null], BEST = 1;
  for (var m0 = 1; m0 <= 10; m0++) {
    FITS.push(fitPoly(TRX, TRY, m0));
    ETR.push(mse(FITS[m0], TRX, TRY));
    ETE.push(mse(FITS[m0], TEX, TEY));
    if (ETE[m0] < ETE[BEST]) BEST = m0;
  }

  function buildCapacity(el, ctx, exercise) {
    injectStyle();
    var wrap = M4.el('div', { class: 'l1-s4-wrap' }, el);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rDeg = readout(row), rTr = readout(row), rTe = readout(row);
    var p = M4.plane(wrap, { xmin: -1.3, xmax: 1.3, ymin: -2, ymax: 2, width: 520, height: 400 });
    var m = exercise ? 1 : 2;
    var curve = p.fn(function () { return 0; }, { stroke: C.blue, width: 4, samples: 300 });
    TRX.forEach(function (x, i) { var pt = p.point(x, TRY[i], { r: 7, fill: C.yellow }); pt.el.setAttribute('stroke', TRAIN); pt.el.setAttribute('stroke-width', '2'); });
    TEX.forEach(function (x, i) { var pt = p.point(x, TEY[i], { r: 7, fill: C.green }); pt.el.setAttribute('stroke', '#0b7a46'); pt.el.setAttribute('stroke-width', '2'); });
    p.text(-1.22, 1.75, 'yellow: train', { fill: TRAIN, size: 16, anchor: 'start', weight: 700 });
    p.text(-1.22, 1.45, 'green: test', { fill: C.green, size: 16, anchor: 'start', weight: 700 });

    // error chart, log scale
    var W = 520, H = 190, L = 56, R = 16, T = 16, B = 40;
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, style: 'width:100%;max-width:' + W + 'px;height:auto;display:block;background:#fff;border-radius:14px;border:2px solid ' + C.line }, wrap);
    var lo = -3, hi = 2;
    function cx(k) { return L + (k - 1) * (W - L - R) / 9; }
    function cy(e) { var l = clamp(Math.log(Math.max(e, 1e-12)) / Math.LN10, lo, hi); return T + (hi - l) * (H - T - B) / (hi - lo); }
    [-2, 0, 2].forEach(function (l) {
      M4.svg('line', { x1: L, x2: W - R, y1: cy(Math.pow(10, l)), y2: cy(Math.pow(10, l)), stroke: C.line, 'stroke-width': 1 }, svg);
      var t = M4.svg('text', { x: L - 8, y: cy(Math.pow(10, l)) + 5, 'text-anchor': 'end', 'font-size': 15, fill: C.muted }, svg);
      t.textContent = l === 0 ? '1' : (l < 0 ? '0.01' : '100');
    });
    var marker = M4.svg('line', { y1: T, y2: H - B, stroke: C.blue, 'stroke-width': 3, 'stroke-dasharray': '5 5' }, svg);
    function poly(arr, col) {
      var d = '';
      for (var k = 1; k <= 10; k++) d += (k === 1 ? 'M' : 'L') + cx(k).toFixed(1) + ' ' + cy(arr[k]).toFixed(1);
      M4.svg('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, svg);
      for (k = 1; k <= 10; k++) M4.svg('circle', { cx: cx(k), cy: cy(arr[k]), r: 4.5, fill: col }, svg);
    }
    poly(ETR, TRAIN); poly(ETE, C.green);
    for (var k = 1; k <= 10; k++) {
      var t = M4.svg('text', { x: cx(k), y: H - B + 20, 'text-anchor': 'middle', 'font-size': 15, fill: C.muted }, svg);
      t.textContent = String(k);
    }
    var xl = M4.svg('text', { x: (L + W - R) / 2, y: H - 4, 'text-anchor': 'middle', 'font-size': 15, fill: C.muted }, svg);
    xl.textContent = 'number of parameters (error on a logarithmic scale)';

    function errStr(e) { return e < 0.0005 ? '0.000' : e >= 100 ? fmt(e, 0) : fmt(e, 3); }
    function update() {
      var w = FITS[m];
      curve.set(function (x) { return clamp(evalPoly(w, x), -4, 4); });
      marker.setAttribute('x1', cx(m)); marker.setAttribute('x2', cx(m));
      rDeg.textContent = m + (m === 1 ? ' parameter' : ' parameters') + ', order ' + (m - 1);
      rTr.textContent = 'train error = ' + errStr(ETR[m]);
      rTe.textContent = 'test error = ' + errStr(ETE[m]);
    }
    var sl = M4.el('div', { class: 'l1-s4-sliders' }, wrap);
    M4.slider(sl, { min: 1, max: 10, step: 1, value: m, label: 'parameters', format: function (v) { return String(Math.round(v)); }, onInput: function (v) { m = clamp(Math.round(+v), 1, 10); update(); } });
    update();
    if (exercise) {
      var br = M4.el('div', { class: 'm4-row' }, wrap);
      M4.button(br, 'Check', function () {
        if (ETE[m] <= ETE[BEST] * 1.02) {
          rTe.classList.add('l1-s4-ok');
          ctx.note('With ' + m + ' parameters the test error is ' + errStr(ETE[m]) + ', the lowest value on the green curve.');
          ctx.solved();
        } else if (m < BEST) {
          ctx.wrong('With ' + m + (m === 1 ? ' parameter' : ' parameters') + ' the test error is ' + errStr(ETE[m]) + '. Train and test error are both still falling when parameters are added: the model underfits.');
        } else {
          ctx.wrong('With ' + m + ' parameters the test error is ' + errStr(ETE[m]) + '. The train error is lower here, but the test error has already risen again: the model overfits.');
        }
      }, { primary: true });
    }
  }

  /* ---------- sigmoid plane shared ---------- */
  function sigPlane(wrap) {
    var p = M4.plane(wrap, { xmin: -6, xmax: 6, ymin: -2, ymax: 3, width: 560, height: 380 });
    p.line(-6, 0.5, 6, 0.5, { stroke: C.muted, width: 2, dash: '6 6' });
    p.line(-6, 1, 6, 1, { stroke: C.line, width: 2 });
    p.text(-5.8, 0.65, 'threshold 0.5', { fill: C.muted, size: 15, anchor: 'start' });
    return p;
  }

  M4.lesson({
    id: 'l1-s4',
    module: 'l1',
    title: 'Fitting, capacity and classification',
    summary: 'Fitting a line to data and measuring its error with residuals leads to the ideas of overfitting and underfitting. Vector notation handles many inputs and outputs, and the sigmoid and softmax functions turn regression into classification.',
    minutes: 14,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>A regression model \\(f_w(x)\\) maps an input \\(x\\) to a number, and its parameters \\(w\\) (the weights) determine which function it is.</p><p>By the end you can measure how wrong a fitted line is, recognise underfitting and overfitting from train and test error, write a model with several inputs and outputs as \\(f(x) = W\\,\\phi(x)\\), and turn a regression function into a classifier with a squashing function.</p>'
      },
      {
        kind: 'explore',
        title: 'Residuals and the train error',
        html: '<p>The yellow dots are measurements of a stock: the horizontal axis is the price yesterday, \\(x\\), and the vertical axis is the price today, \\(y\\). The model is a line \\(f_w(x) = w_1 + w_2 x\\), where \\(w_1\\) is the offset on the \\(y\\) axis and \\(w_2\\) is the slope. For a data point \\((x_i, y_i)\\) the <em>residual</em> is \\(y_i - f_w(x_i)\\), the vertical gap between data and model. The train error shown here is the mean of the squared residuals over all \\(N\\) points, \\(\\frac{1}{N}\\sum_i (y_i - f_w(x_i))^2\\).</p>',
        mount: function (el, ctx) { buildFit(el, ctx, false); }
      },
      {
        kind: 'exercise',
        title: 'Line fitting',
        html: '<p>The line starts in an arbitrary position that does not fit the data, and the train error is correspondingly high. Move the line until the train error is at most \\(0.25\\). Both parameters \\(w_1\\) and \\(w_2\\) change as the handles move.</p>',
        hint: 'The data rise by about 0.8 per unit of x and start near 1. Put the left handle (at x = 1) near y = 1.8 and the right handle (at x = 9) near y = 8.2.',
        mount: function (el, ctx) { buildFit(el, ctx, true); }
      },
      {
        kind: 'explore',
        title: 'Capacity',
        html: '<p>The data are now split: the yellow points are train data used for fitting, and the green points are test data that the model never sees during fitting. A polynomial of order \\(M\\), \\(f_w(x) = w_0 + w_1 x + \\dots + w_M x^M\\), has \\(M+1\\) parameters. Change the number of parameters and compare the two errors: the train error only ever decreases, while the test error decreases at first and then rises again. A fit with low train error and high test error is called <em>overfitting</em>. A fit where both errors are high is called <em>underfitting</em>.</p>',
        mount: function (el, ctx) { buildCapacity(el, ctx, false); }
      },
      {
        kind: 'exercise',
        title: 'Capacity and generalisation',
        html: '<p>The purpose of the test data is to measure how well a model generalises to unseen data. Set the number of parameters to the value with the lowest test error, then press Check.</p>',
        hint: 'Ignore the yellow train curve, which keeps falling. Follow the green curve in the lower chart to its lowest point.',
        mount: function (el, ctx) { buildCapacity(el, ctx, true); }
      },
      {
        kind: 'exercise',
        title: 'The feature vector',
        html: '<p>A polynomial can be written as a product of two vectors. The parameter vector \\(w = \\begin{pmatrix}w_0\\\\w_1\\\\w_2\\\\w_3\\end{pmatrix}\\) holds one weight per power, and the feature vector \\(\\phi(x) = \\begin{pmatrix}1\\\\x\\\\x^2\\\\x^3\\end{pmatrix}\\) holds the powers of the input, so that \\(f_w(x) = w^\\top \\phi(x)\\): each weight is multiplied by its own feature and the products are summed. For the input \\(x = 2\\), drag the correct numbers into the four entries of \\(\\phi(2)\\).</p>',
        hint: 'The entries are the powers of 2 in order: 2 to the power 0, 1, 2 and 3.',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: 'l1-s4-wrap' }, el);
          var w = [3, 1, -2, 1], want = [1, 2, 4, 8], labs = ['1', 'x', 'x^2', 'x^3'];
          var cols = M4.el('div', { class: 'l1-s4-cols' }, wrap);
          var slots = [], filled = [false, false, false, false];
          w.forEach(function (wk, k) {
            var c = M4.el('div', { class: 'l1-s4-colcell' }, cols);
            M4.el('div', { class: 'l1-s4-lab', html: M4.tex('w_' + k) }, c);
            M4.el('div', { class: 'l1-s4-w', text: (wk < 0 ? '−' : '') + Math.abs(wk) }, c);
            M4.el('div', { class: 'l1-s4-times', text: '×' }, c);
            var s = M4.el('div', { class: 'm4-slot l1-s4-slot' }, c);
            s.setAttribute('data-k', String(k));
            slots.push(s);
            M4.el('div', { class: 'l1-s4-lab', html: M4.tex(labs[k]) }, c);
          });
          var tray = M4.el('div', { class: 'l1-s4-tray' }, wrap);
          var tokens = [4, 6, 1, 16, 8, 2, 3].map(function (v) {
            var t = M4.el('div', { class: 'm4-token l1-s4-tok', text: String(v) }, tray);
            t.setAttribute('data-v', String(v));
            return t;
          });
          var sum = M4.el('div', { class: 'l1-s4-sum' }, wrap);
          M4.dragDrop({
            tokens: tokens, slots: slots,
            onDrop: function (tok, slot) {
              var k = +slot.getAttribute('data-k'), v = +tok.getAttribute('data-v');
              if (filled[k]) { tray.appendChild(tok); return; }
              if (v !== want[k]) {
                tray.appendChild(tok);
                ctx.wrong('This entry is ' + (k === 0 ? 'the constant 1, which multiplies the offset' : '2 to the power ' + k) + ', which is not ' + v + '.');
                return;
              }
              filled[k] = true;
              slot.appendChild(tok);
              slot.classList.add('filled');
              tok.classList.add('l1-s4-ok');
              tok.style.pointerEvents = 'none';
              if (filled.every(Boolean)) {
                sum.innerHTML = M4.tex('w^\\top\\phi(2) = 3\\cdot 1 + 1\\cdot 2 + (-2)\\cdot 4 + 1\\cdot 8 = 5');
                sum.classList.add('m4-pop');
                ctx.note('The product \\(w^\\top\\phi(2)\\) equals the polynomial \\(3 + x - 2x^2 + x^3\\) evaluated at \\(x = 2\\).');
                ctx.solved();
              } else {
                ctx.note('Correct. ' + filled.filter(Boolean).length + ' of 4 entries placed.');
              }
            },
            onMiss: function (tok) { if (tok.parentNode !== tray && tok.style.pointerEvents !== 'none') tray.appendChild(tok); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'More inputs',
        html: '<p>Instead of more powers of one variable, a model can take several variables: yesterday’s stock price \\(x_1\\), the oil price \\(x_2\\), and a news indicator \\(x_3\\). In the simplest case there is one weight per variable plus an offset \\(w_0\\), so \\(\\phi(x) = \\begin{pmatrix}1\\\\x_1\\\\x_2\\\\x_3\\end{pmatrix}\\) and \\(f_w(x) = w^\\top\\phi(x)\\) describes a plane instead of a line. For the inputs \\(x = \\begin{pmatrix}2\\\\3\\\\4\\end{pmatrix}\\) and the weights shown, compute the prediction. Tapping a column reveals its product.</p>',
        hint: 'Multiply each weight by the feature below it, then add the four products. The offset is multiplied by 1.',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: 'l1-s4-wrap' }, el);
          var w = [1, 0.5, 2, -1], f = [1, 2, 3, 4], labs = ['1', 'x_1', 'x_2', 'x_3'];
          var cols = M4.el('div', { class: 'l1-s4-cols' }, wrap);
          w.forEach(function (wk, k) {
            var c = M4.el('div', { class: 'l1-s4-colcell l1-s4-tap' }, cols);
            M4.el('div', { class: 'l1-s4-lab', html: M4.tex('w_' + k) }, c);
            M4.el('div', { class: 'l1-s4-w', text: (wk < 0 ? '−' : '') + Math.abs(wk) }, c);
            M4.el('div', { class: 'l1-s4-times', text: '×' }, c);
            M4.el('div', { class: 'l1-s4-f', text: String(f[k]) }, c);
            M4.el('div', { class: 'l1-s4-lab', html: M4.tex(labs[k]) }, c);
            var pr = M4.el('div', { class: 'l1-s4-prod', text: '?' }, c);
            c.addEventListener('click', function () {
              var v = wk * f[k];
              pr.textContent = '= ' + (v < 0 ? '−' : '') + Math.abs(v);
              c.style.borderColor = C.blue;
            });
          });
          M4.numberInput(wrap, {
            answer: 4, tolerance: 0.01, placeholder: 'prediction', label: 'wᵀφ(x) =',
            onCorrect: function () {
              ctx.note('\\(1\\cdot 1 + 0.5\\cdot 2 + 2\\cdot 3 + (-1)\\cdot 4 = 1 + 1 + 6 - 4 = 4\\).');
              ctx.solved();
            },
            onWrong: function (v) {
              v = +v;
              if (Math.abs(v - 3) < 0.01) ctx.wrong('The offset is missing: the first feature is the constant 1, so the first product is 1.');
              else if (Math.abs(v - 12) < 0.01) ctx.wrong('The last weight is negative, so its product is subtracted.');
              else ctx.wrong('Not yet. Tap each column to reveal its product, then add the four products.');
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'More outputs',
        html: '<p>A model can also produce several outputs, and the only thing that changes is the shape of the weights. The weight matrix \\(W\\) has one row per output and one column per feature, and \\(f(x) = W\\,\\phi(x)\\) multiplies each row with the same feature vector independently. Here \\(\\phi(x) = \\begin{pmatrix}1\\\\x\\\\x^2\\end{pmatrix}\\). The first row of \\(W\\) predicts the monthly rent and the second row predicts the heating cost. Compute both outputs for \\(x = 2\\).</p>',
        hint: 'For x = 2 the feature vector is (1, 2, 4). Treat each row of W as its own weight vector and compute its product with (1, 2, 4).',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: 'l1-s4-wrap' }, el);
          var Wm = [[2, 1, 0.5], [1, 0.5, 0]], phi = [1, 2, 4], cols = [C.blue, C.purple], names = ['rent', 'heating'];
          var g = M4.el('div', { class: 'l1-s4-mat' }, wrap);
          M4.el('div', {}, g);
          ['1', 'x', 'x^2'].forEach(function (l) { M4.el('div', { class: 'l1-s4-mhead', html: M4.tex(l) }, g); });
          var cells = [];
          Wm.forEach(function (r, i) {
            M4.el('div', { class: 'l1-s4-rowlab', style: 'color:' + cols[i], text: 'row ' + (i + 1) + ' (' + names[i] + ')' }, g);
            cells.push(r.map(function (v) { return M4.el('div', { class: 'l1-s4-mcell', style: 'color:' + cols[i], text: String(v) }, g); }));
          });
          M4.el('div', { class: 'l1-s4-rowlab', style: 'color:' + C.orange, html: M4.tex('\\phi(2)') }, g);
          phi.forEach(function (v) { M4.el('div', { class: 'l1-s4-mcell', style: 'color:' + C.orange + ';border-style:dashed', text: String(v) }, g); });
          var ok = [false, false];
          var expl = ['\\(2\\cdot 1 + 1\\cdot 2 + 0.5\\cdot 4 = 6\\)', '\\(1\\cdot 1 + 0.5\\cdot 2 + 0\\cdot 4 = 2\\)'];
          var inputs = M4.el('div', { class: 'm4-grid2', style: 'width:100%' }, wrap);
          [6, 2].forEach(function (ans, i) {
            var box = M4.el('div', { class: 'm4-col' }, inputs);
            M4.numberInput(box, {
              answer: ans, tolerance: 0.01, placeholder: names[i], label: names[i] + ' =',
              onCorrect: function () {
                ok[i] = true;
                cells[i].forEach(function (c) { c.style.borderColor = C.green; c.style.background = '#e4f8ee'; });
                if (ok[0] && ok[1]) {
                  ctx.note('Row 1: ' + expl[0] + '. Row 2: ' + expl[1] + '. The output is the vector \\(\\begin{pmatrix}6\\\\2\\end{pmatrix}\\).');
                  ctx.solved();
                } else {
                  ctx.note('Row ' + (i + 1) + ': ' + expl[i] + '. Now compute the other output.');
                }
              },
              onWrong: function () {
                ctx.wrong('For the ' + names[i] + ', use only row ' + (i + 1) + ' of W: multiply its three entries by 1, 2 and 4 and add the products.');
              }
            });
          });
        }
      },
      {
        kind: 'explore',
        title: 'The sigmoid squashing function',
        html: '<p>A line \\(z = w_1 + w_2 x\\) outputs arbitrary numbers such as \\(-5\\) or \\(23\\), but a classifier should output a probability between 0 and 1. No new parameters are needed: the line is wrapped in a squashing function, the <em>sigmoid</em> \\(\\sigma(z) = \\dfrac{1}{1 + e^{-z}}\\). The blue line is \\(z\\) and the orange curve is \\(\\sigma(z)\\). With a threshold of \\(0.5\\), inputs with \\(\\sigma(z) > 0.5\\) are classified as dog and the others as cat. This model is called logistic regression. Drag the point along the axis and change the weights.</p>',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: 'l1-s4-wrap' }, el);
          var row = M4.el('div', { class: 'm4-row' }, wrap);
          var rZ = readout(row), rS = readout(row), rC = readout(row);
          var p = sigPlane(wrap);
          var w1 = 0, w2 = 1, x0 = 1.5;
          var line = p.line(-6, 0, 6, 0, { stroke: C.blue, width: 3 });
          var curve = p.fn(function (x) { return sigmoid(x); }, { stroke: C.orange, width: 5 });
          var vert = p.line(x0, 0, x0, 1, { stroke: C.ink, width: 2, dash: '4 5' });
          var dot = p.point(x0, 0.5, { r: 8, fill: C.orange });
          var zdot = p.point(x0, 0, { r: 6, fill: C.blue });
          var h;
          function update() {
            var z = w1 + w2 * x0, s = sigmoid(z);
            var ya = w1 - 6 * w2, yb = w1 + 6 * w2;
            line.set(-6, ya, 6, yb);
            curve.set(function (x) { return sigmoid(w1 + w2 * x); });
            vert.set(x0, 0, x0, s);
            dot.set(x0, s);
            zdot.set(x0, clamp(z, -2.4, 3.4));
            rZ.textContent = 'z = ' + fmt(z, 2);
            rS.textContent = 'σ(z) = ' + fmt(s, 3);
            rC.textContent = s > 0.5 ? 'class: dog' : 'class: cat';
            rC.classList.toggle('l1-s4-ok', s > 0.5);
          }
          h = p.handle(x0, 0, { color: C.ink, r: 12, onDrag: function (x) { x0 = clamp(x, -5.8, 5.8); h.set(x0, 0); update(); }, onEnd: function () { h.set(x0, 0); } });
          var sl = M4.el('div', { class: 'l1-s4-sliders' }, wrap);
          M4.slider(sl, { min: -4, max: 4, step: 0.25, value: w1, label: 'offset w₁', format: function (v) { return fmt(+v, 2); }, onInput: function (v) { w1 = +v; update(); } });
          M4.slider(sl, { min: -3, max: 3, step: 0.25, value: w2, label: 'slope w₂', format: function (v) { return fmt(+v, 2); }, onInput: function (v) { w2 = +v; update(); } });
          update();
        }
      },
      {
        kind: 'exercise',
        title: 'Manual classifier training',
        html: '<p>Each animal has one feature \\(x\\). Cats are drawn at height 0 and dogs at height 1, the probability the model should assign to the class dog. Adjust \\(w_1\\) and \\(w_2\\) so that \\(\\sigma(w_1 + w_2 x)\\) is above \\(0.5\\) for every dog and below \\(0.5\\) for every cat. The dashed vertical line marks the input where the output crosses \\(0.5\\), which is where \\(w_1 + w_2 x = 0\\).</p>',
        hint: 'The dogs lie to the right, so the slope must be positive. The crossing sits at x = −w₁ / w₂ and has to fall between 1.5 and 2.5. For example w₂ = 1 and w₁ = −2.',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: 'l1-s4-wrap' }, el);
          var row = M4.el('div', { class: 'm4-row' }, wrap);
          var rB = readout(row), rN = readout(row);
          var p = sigPlane(wrap);
          var cats = [-4, -2.5, -1, 0.5, 1.5], dogs = [2.5, 3.5, 4.5, 5.5];
          var w1 = 0, w2 = -1, done = false;
          var line = p.line(-6, 0, 6, 0, { stroke: C.blue, width: 3 });
          var bnd = p.line(0, -2, 0, 3, { stroke: C.ink, width: 2, dash: '6 6' });
          var curve = p.fn(function (x) { return sigmoid(-x); }, { stroke: C.orange, width: 5 });
          var pts = [];
          cats.forEach(function (x) { pts.push({ x: x, dog: false, pt: p.point(x, 0, { r: 9, fill: C.pink }) }); });
          dogs.forEach(function (x) { pts.push({ x: x, dog: true, pt: p.point(x, 1, { r: 9, fill: C.green }) }); });
          p.text(-4, -0.45, 'cats', { fill: C.pink, size: 17, weight: 700 });
          p.text(4, 1.4, 'dogs', { fill: C.green, size: 17, weight: 700 });
          function update() {
            line.set(-6, w1 - 6 * w2, 6, w1 + 6 * w2);
            curve.set(function (x) { return sigmoid(w1 + w2 * x); });
            var good = 0;
            pts.forEach(function (q) {
              var s = sigmoid(w1 + w2 * q.x);
              var ok = q.dog ? s > 0.5 : s < 0.5;
              if (ok) good++;
              q.pt.el.setAttribute('stroke', ok ? C.ink : C.red);
              q.pt.el.setAttribute('stroke-width', ok ? '2' : '5');
              q.pt.el.setAttribute('stroke-dasharray', ok ? '' : '3 3');
            });
            if (Math.abs(w2) > 1e-9 && Math.abs(-w1 / w2) <= 6) {
              var b = -w1 / w2;
              bnd.el.style.display = '';
              bnd.set(b, -2, b, 3);
              rB.textContent = 'crossing at x = ' + fmt(b, 2);
            } else {
              bnd.el.style.display = 'none';
              rB.textContent = 'no crossing in view';
            }
            rN.textContent = good + ' of ' + pts.length + ' correct';
            rN.classList.toggle('l1-s4-ok', good === pts.length);
            if (done) return;
            if (good === pts.length) {
              done = true;
              ctx.note('All nine animals are classified correctly: the crossing lies between the last cat at \\(x = 1.5\\) and the first dog at \\(x = 2.5\\), and the slope is positive.');
              ctx.solved();
            } else if (w2 <= 0) {
              ctx.note('With a slope \\(w_2 \\le 0\\) the output does not increase with \\(x\\), so the dogs on the right cannot receive the higher probability. Points with a red dashed outline are misclassified.');
            } else {
              ctx.note('The slope has the right sign. Move the crossing between \\(x = 1.5\\) and \\(x = 2.5\\) by changing \\(w_1\\). Points with a red dashed outline are misclassified.');
            }
          }
          var sl = M4.el('div', { class: 'l1-s4-sliders' }, wrap);
          M4.slider(sl, { min: -6, max: 6, step: 0.25, value: w1, label: 'offset w₁', format: function (v) { return fmt(+v, 2); }, onInput: function (v) { w1 = +v; update(); } });
          M4.slider(sl, { min: -3, max: 3, step: 0.25, value: w2, label: 'slope w₂', format: function (v) { return fmt(+v, 2); }, onInput: function (v) { w2 = +v; update(); } });
          update();
        }
      },
      {
        kind: 'exercise',
        title: 'Softmax and the final decision',
        html: '<p>With the three classes cat, dog and bird the model has one output per class, \\(z = \\begin{pmatrix}z_1\\\\z_2\\\\z_3\\end{pmatrix}\\). The <em>softmax</em> turns these numbers into probabilities \\(p_k = \\dfrac{e^{z_k}}{e^{z_1} + e^{z_2} + e^{z_3}}\\), each between 0 and 1 and all summing to 1. The classification is the class with the highest probability. Change the outputs so that the model classifies the image as a bird with probability at least \\(0.7\\), marked on the bird bar, then press Check.</p>',
        hint: 'Only differences between the outputs matter. Raise the bird output until it exceeds both other outputs by about 2, or lower the other two.',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: 'l1-s4-wrap' }, el);
          var names = ['cat', 'dog', 'bird'], cols = [C.pink, C.green, C.blue], z = [2, 1, 0];
          var row = M4.el('div', { class: 'm4-row' }, wrap);
          var rSum = readout(row), rArg = readout(row);
          var bars = M4.el('div', { class: 'l1-s4-bars' }, wrap);
          var fills = [], vals = [];
          names.forEach(function (n, k) {
            var b = M4.el('div', { class: 'l1-s4-bar' }, bars);
            M4.el('div', { style: 'color:' + cols[k], text: n }, b);
            var tr = M4.el('div', { class: 'l1-s4-track' }, b);
            fills.push(M4.el('div', { class: 'l1-s4-fill', style: 'background:' + cols[k] }, tr));
            if (k === 2) M4.el('div', { class: 'l1-s4-mark', style: 'left:70%' }, tr);
            vals.push(M4.el('div', { class: 'l1-s4-val' }, b));
          });
          function probs() {
            var mx = Math.max(z[0], z[1], z[2]);
            var e = z.map(function (v) { return Math.exp(v - mx); });
            var s = e[0] + e[1] + e[2];
            return e.map(function (v) { return v / s; });
          }
          function update() {
            var p = probs(), arg = 0;
            p.forEach(function (v, k) {
              fills[k].style.width = (v * 100).toFixed(1) + '%';
              vals[k].textContent = fmt(v, 3);
              if (v > p[arg]) arg = k;
            });
            rSum.textContent = 'sum = ' + fmt(p[0] + p[1] + p[2], 3);
            rArg.textContent = 'classified as: ' + names[arg];
            return { p: p, arg: arg };
          }
          var sl = M4.el('div', { class: 'l1-s4-sliders' }, wrap);
          names.forEach(function (n, k) {
            M4.slider(sl, { min: -3, max: 3, step: 0.1, value: z[k], label: 'output for ' + n, format: function (v) { return fmt(+v, 1); }, onInput: function (v) { z[k] = +v; update(); } });
          });
          update();
          var br = M4.el('div', { class: 'm4-row' }, wrap);
          M4.button(br, 'Check', function () {
            var r = update();
            if (r.arg === 2 && r.p[2] >= 0.7) {
              rArg.classList.add('l1-s4-ok');
              fills[2].classList.add('m4-pop');
              ctx.note('The bird probability is ' + fmt(r.p[2], 3) + ' and the three probabilities still sum to 1. Taking the largest probability turns the continuous outputs into one of a finite set of answers.');
              ctx.solved();
            } else if (r.arg !== 2) {
              ctx.wrong('The largest probability belongs to ' + names[r.arg] + ' (' + fmt(r.p[r.arg], 3) + '), so the image is classified as ' + names[r.arg] + '. The bird output must be the largest of the three.');
            } else {
              ctx.wrong('The image is classified as a bird, but with probability ' + fmt(r.p[2], 3) + ', below 0.7. Increase the gap between the bird output and the other two.');
            }
          }, { primary: true });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>A regression model is fitted by adjusting its parameters until the residuals \\(y_i - f_w(x_i)\\), and with them the train error, are small. Too few parameters give underfitting (train and test error both high). Too many give overfitting (train error low, test error high), which only held-out test data reveals.</li>' +
          '<li>Every model here has the form \\(f(x) = W\\,\\phi(x)\\): the feature vector \\(\\phi(x)\\) has one entry per input or feature, and the weight matrix \\(W\\) has one row per output. With a single output it reduces to \\(w^\\top\\phi(x)\\).</li>' +
          '<li>Classification reuses the same function wrapped in a squashing function: the sigmoid \\(\\sigma(z) = 1/(1+e^{-z})\\) for two classes with a threshold of \\(0.5\\), and the softmax for several classes, followed by choosing the class with the highest probability.</li>' +
          '</ul><p>How the parameters are found automatically requires a loss function, which is the subject of the next lecture.</p>'
      }
    ]
  });
})();
