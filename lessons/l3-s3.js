(function () {
  'use strict';
  var R = String.raw;
  var C = M4.colors;

  /* ---------- shared local helpers ---------- */
  function injectStyle() {
    if (document.getElementById('l3-s3-style')) return;
    var s = document.createElement('style');
    s.id = 'l3-s3-style';
    s.textContent = [
      '.l3-s3-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%}',
      '.l3-s3-chart{width:100%;height:auto;display:block;max-width:680px;margin:0 auto;background:#fff;border:2px solid var(--m4-line,#e6e4dd);border-radius:16px}',
      '.l3-s3-eq{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;font-size:22px;line-height:1.2}',
      '.l3-s3-slotbox{display:flex;flex-direction:column;align-items:center;gap:6px}',
      '.l3-s3-slot{min-width:84px;min-height:54px;display:flex;align-items:center;justify-content:center}',
      '.l3-s3-tok{min-width:72px;text-align:center;font-size:20px;font-weight:700;padding:10px 14px;touch-action:none}',
      '.l3-s3-tok.l3-s3-placed{border-color:var(--m4-green,#16b56b);color:var(--m4-green,#16b56b);pointer-events:none;cursor:default}',
      '.l3-s3-coins{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;min-height:92px;max-width:560px}',
      '.l3-s3-coin{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;color:#fff}',
      '.l3-s3-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:18px;font-size:16px;color:var(--m4-muted,#6b6f76)}',
      '.l3-s3-sw{display:inline-block;width:22px;height:5px;border-radius:3px;margin-right:6px;vertical-align:middle}',
      '.l3-s3-card{background:#fff;border:2px solid var(--m4-line,#e6e4dd);border-radius:16px;padding:16px 18px;width:100%;max-width:560px;box-sizing:border-box}',
      '.l3-s3-card h4{margin:0 0 8px 0;font-size:18px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function wrap(el) {
    injectStyle();
    el.textContent = '';
    return M4.el('div', { class: 'l3-s3-wrap' }, el);
  }

  function readout(parent, color) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    if (color) r.style.color = color;
    return r;
  }

  function legend(parent, items) {
    var l = M4.el('div', { class: 'l3-s3-legend' }, parent);
    items.forEach(function (it) {
      var s = M4.el('span', {}, l);
      var sw = M4.el('span', { class: 'l3-s3-sw' }, s);
      sw.style.background = it[0];
      s.appendChild(document.createTextNode(it[1]));
    });
    return l;
  }

  function svgText(parent, x, y, str, attrs) {
    var a = { x: x, y: y, 'font-size': 15, fill: C.muted, 'text-anchor': 'middle', 'font-family': 'Inter, system-ui, sans-serif' };
    for (var k in (attrs || {})) a[k] = attrs[k];
    var t = M4.svg('text', a, parent);
    t.textContent = str;
    return t;
  }

  // Small line chart with its own axes (used where ranges are not geometric).
  function chart(parent, o) {
    var W = o.w || 660, H = o.h || 320, ml = 70, mr = 20, mt = 18, mb = 52;
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'l3-s3-chart' }, parent);
    function X(v) { return ml + (v - o.xmin) / (o.xmax - o.xmin) * (W - ml - mr); }
    function Y(v) { return H - mb - (v - o.ymin) / (o.ymax - o.ymin) * (H - mt - mb); }
    (o.yticks || []).forEach(function (t) {
      M4.svg('line', { x1: ml, x2: W - mr, y1: Y(t[0]), y2: Y(t[0]), stroke: C.line, 'stroke-width': 1.5 }, svg);
      svgText(svg, ml - 10, Y(t[0]) + 5, t[1], { 'text-anchor': 'end' });
    });
    (o.xticks || []).forEach(function (t) {
      M4.svg('line', { x1: X(t), x2: X(t), y1: H - mb, y2: H - mb + 6, stroke: C.muted, 'stroke-width': 1.5 }, svg);
      svgText(svg, X(t), H - mb + 22, String(t));
    });
    M4.svg('line', { x1: ml, x2: W - mr, y1: H - mb, y2: H - mb, stroke: C.muted, 'stroke-width': 2 }, svg);
    M4.svg('line', { x1: ml, x2: ml, y1: mt, y2: H - mb, stroke: C.muted, 'stroke-width': 2 }, svg);
    if (o.xlabel) svgText(svg, (ml + W - mr) / 2, H - 8, o.xlabel);
    if (o.ylabel) {
      var yl = svgText(svg, 0, 0, o.ylabel);
      yl.setAttribute('transform', 'translate(18,' + ((mt + H - mb) / 2) + ') rotate(-90)');
    }
    return {
      svg: svg, X: X, Y: Y,
      line: function (color, width, dash) {
        var a = { fill: 'none', stroke: color, 'stroke-width': width || 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', d: '' };
        if (dash) a['stroke-dasharray'] = dash;
        var p = M4.svg('path', a, svg);
        return {
          el: p,
          set: function (pts) {
            var d = '';
            for (var i = 0; i < pts.length; i++) {
              var yy = Math.max(o.ymin, Math.min(o.ymax, pts[i][1]));
              d += (i ? 'L' : 'M') + X(pts[i][0]).toFixed(1) + ' ' + Y(yy).toFixed(1);
            }
            p.setAttribute('d', d);
          }
        };
      },
      vline: function (x, color) {
        return M4.svg('line', { x1: X(x), x2: X(x), y1: mt, y2: H - mb, stroke: color, 'stroke-width': 2, 'stroke-dasharray': '5 5' }, svg);
      }
    };
  }

  // Heat map of f on an M4.plane; low values blue, high values orange.
  function heat(p, o) {
    var g = M4.svg('g', {}, p.g);
    var cells = [];
    var c = o.cell;
    for (var x = o.xmin; x < o.xmax - 1e-9; x += c) {
      for (var y = o.ymin; y < o.ymax - 1e-9; y += c) {
        var r = M4.svg('rect', {
          x: p.x(x), y: p.y(y + c), width: Math.abs(p.x(x + c) - p.x(x)) + 0.6, height: Math.abs(p.y(y) - p.y(y + c)) + 0.6,
          fill: C.orange, 'fill-opacity': 0, 'pointer-events': 'none'
        }, g);
        cells.push([x + c / 2, y + c / 2, r]);
      }
    }
    return {
      set: function (f, vmax) {
        for (var i = 0; i < cells.length; i++) {
          var v = f(cells[i][0], cells[i][1]) / vmax;
          v = Math.max(-1, Math.min(1, v));
          cells[i][2].setAttribute('fill', v >= 0 ? C.orange : C.blue);
          cells[i][2].setAttribute('fill-opacity', (Math.pow(Math.abs(v), 0.7) * 0.7).toFixed(3));
        }
      }
    };
  }

  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function fmt(v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }

  /* ---------- two-minimum loss used in steps 6 and 7 ---------- */
  function twoMin(t) { return Math.min(8 * (t + 2) * (t + 2), 0.5 * (t - 2) * (t - 2)); }
  function twoMinGrad(t) { return (8 * (t + 2) * (t + 2) < 0.5 * (t - 2) * (t - 2)) ? 16 * (t + 2) : (t - 2); }
  function twoMinPlot(t) { return Math.min(twoMin(t), 6); }

  /* ---------- ravine used in step 8 ---------- */
  var RAV = { a: 0.2, b: 10, eta: 0.18, x0: -4.5, y0: 1.5 };
  function ravLoss(x, y) { return 0.5 * (RAV.a * x * x + RAV.b * y * y); }
  function ravRun(beta, n) {
    var x = RAV.x0, y = RAV.y0, vx = 0, vy = 0, pts = [[x, y]], L0 = ravLoss(x, y), first = -1;
    for (var k = 1; k <= n; k++) {
      vx = beta * vx + RAV.a * x; vy = beta * vy + RAV.b * y;
      x -= RAV.eta * vx; y -= RAV.eta * vy;
      pts.push([x, y]);
      if (first < 0 && ravLoss(x, y) < 0.01 * L0) first = k;
    }
    return { pts: pts, first: first };
  }

  /* =================================================================== */
  M4.lesson({
    id: 'l3-s3',
    module: 'l3',
    title: 'Saddles, momentum and adaptive steps',
    summary: 'Why gradient descent stalls at saddle points, why flat minima are preferred, and how momentum, AdaGrad and RMSProp change the update rule.',
    minutes: 14,
    steps: [
      /* 1 */
      {
        kind: 'text',
        title: 'Learning goals',
        html:
          R`<p>Plain gradient descent updates the parameters \( \theta \) by \( \theta \leftarrow \theta - \eta \nabla L(\theta) \), where \( L \) is the loss and \( \eta \) is the learning rate. Real loss landscapes contain saddle points and minima of different sharpness, and three modifications of the update rule cope with them.</p>` +
          R`<p>In this lesson you will classify a point with zero gradient from the signs of the Hessian eigenvalues, explain why a large learning rate favours flat minima, and compute the updates of momentum, AdaGrad and RMSProp on paper.</p>`
      },

      /* 2 */
      {
        kind: 'explore',
        title: 'Critical points that are not minima',
        html:
          R`<p>A point where \( \nabla L = 0 \) is called a critical point. Near such a point the loss behaves like \( L(\theta_1, \theta_2) = \tfrac12\left(\lambda_1 \theta_1^2 + \lambda_2 \theta_2^2\right) \), where \( \lambda_1 \) and \( \lambda_2 \) are the eigenvalues of the Hessian, that is, the curvatures along the horizontal and vertical direction. A positive eigenvalue means the loss curves up in that direction, a negative one means it curves down.</p>` +
          R`<p>Set the two eigenvalues and observe the surface from above. Orange marks loss above the value at the centre, blue marks loss below it.</p>`,
        mount: function (el, ctx) {
          var w = wrap(el);
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rType = readout(row, C.green), r1 = readout(row), r2 = readout(row);
          var p = M4.plane(w, { xmin: -3, xmax: 3, ymin: -3, ymax: 3, width: 480, height: 480, grid: false, axes: true, labels: false });
          var hm = heat(p, { xmin: -3, xmax: 3, ymin: -3, ymax: 3, cell: 0.25 });
          p.point(0, 0, { r: 8, fill: C.ink });
          p.text(2.45, -0.35, 'θ₁', { fill: C.ink, size: 18, weight: 700 });
          p.text(0.35, 2.6, 'θ₂', { fill: C.ink, size: 18, weight: 700 });
          var l1 = 1, l2 = 1;
          function word(l) { return l > 0 ? 'curves up' : (l < 0 ? 'curves down' : 'flat'); }
          function upd() {
            hm.set(function (x, y) { return 0.5 * (l1 * x * x + l2 * y * y); }, 9);
            var t = (l1 > 0 && l2 > 0) ? 'minimum' : (l1 < 0 && l2 < 0) ? 'maximum' : (l1 * l2 < 0) ? 'saddle point' : 'degenerate (a zero eigenvalue)';
            rType.textContent = t;
            r1.textContent = 'θ₁ direction: ' + word(l1);
            r2.textContent = 'θ₂ direction: ' + word(l2);
          }
          var f1 = function (v) { return (v > 0 ? '+' : '') + fmt(v, 1); };
          M4.slider(w, { min: -2, max: 2, step: 0.5, value: 1, label: 'λ₁', format: f1, onInput: function (v) { l1 = +v; upd(); } });
          M4.slider(w, { min: -2, max: 2, step: 0.5, value: 1, label: 'λ₂', format: f1, onInput: function (v) { l2 = +v; upd(); } });
          upd();
        }
      },

      /* 3 */
      {
        kind: 'exercise',
        title: 'Minima in high dimensions',
        html:
          R`<p>With \( n \) parameters the Hessian has \( n \) eigenvalues, and a critical point is a minimum only if all \( n \) are positive. Suppose each sign were decided by a fair coin. The probability that all are positive is then \( P = (1/2)^n \).</p>` +
          R`<p>Set \( n \) to the smallest number of parameters for which \( P \) falls below \( 1/1000 \), then press Check.</p>`,
        hint: R`Powers of two: \( 2^9 = 512 \) and \( 2^{10} = 1024 \). The probability is below \( 1/1000 \) once \( 2^n > 1000 \).`,
        mount: function (el, ctx) {
          var w = wrap(el);
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rP = readout(row, C.green), rK = readout(row);
          var coins = M4.el('div', { class: 'l3-s3-coins' }, w);
          var n = 3;
          function flip() {
            coins.textContent = '';
            var pos = 0;
            for (var i = 0; i < n; i++) {
              var up = Math.random() < 0.5;
              if (up) pos++;
              var c = M4.el('div', { class: 'l3-s3-coin', text: up ? '+' : '−' }, coins);
              c.style.background = up ? C.green : C.pink;
            }
            rP.textContent = 'P(all +) = 1/' + Math.pow(2, n) + ' ≈ ' + (1 / Math.pow(2, n)).toPrecision(2);
            rK.textContent = 'this draw: ' + pos + ' of ' + n + ' positive, ' + (pos === n ? 'a minimum' : pos === 0 ? 'a maximum' : 'a saddle');
          }
          M4.slider(w, { min: 1, max: 20, step: 1, value: 3, label: 'parameters n', format: function (v) { return String(Math.round(v)); }, onInput: function (v) { n = Math.round(+v); flip(); } });
          var b = M4.el('div', { class: 'm4-row' }, w);
          M4.button(b, 'Flip the signs again', flip);
          M4.button(b, 'Check', function () {
            if (n === 10) {
              ctx.note(R`Correct: \( (1/2)^{10} = 1/1024 \approx 1/1000 \). With millions of parameters a random critical point is practically never a minimum. Almost all of them are saddle points.`);
              ctx.solved();
            } else if (n < 10) {
              ctx.wrong('With n = ' + n + ' the probability is 1/' + Math.pow(2, n) + ', which is still above 1/1000.');
            } else {
              ctx.wrong('1/' + Math.pow(2, n) + ' is below 1/1000, but a smaller n already achieves that.');
            }
          }, { primary: true });
          flip();
        }
      },

      /* 4 */
      {
        kind: 'explore',
        title: 'The plateau at a saddle',
        html:
          R`<p>The loss shown here has a saddle point at the origin and two minima at \( (0, \pm 1) \). Gradient descent starts on the left, almost exactly on the ridge that leads into the saddle. Near the saddle the gradient is close to zero, so the loss curve stays flat for many steps and training looks converged although it is not.</p>` +
          R`<p>Stochastic gradient descent uses a noisy estimate of the gradient. Run both variants and compare the length of the plateau.</p>`,
        mount: function (el, ctx) {
          var w = wrap(el);
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rS = readout(row), rL = readout(row, C.green), rG = readout(row);
          var p = M4.plane(w, { xmin: -3, xmax: 3, ymin: -2, ymax: 2, width: 660, height: 440, grid: false, axes: false, labels: false });
          function L(x, y) { return 0.5 * x * x + 0.25 * y * y * y * y - 0.5 * y * y; }
          var hm = heat(p, { xmin: -3, xmax: 3, ymin: -2, ymax: 2, cell: 0.2 });
          hm.set(function (x, y) { return L(x, y) > 0 ? L(x, y) / 4.5 : L(x, y) / 0.25; }, 1);
          p.point(0, 1, { r: 7, fill: C.blue }); p.point(0, -1, { r: 7, fill: C.blue });
          p.text(0.75, 1, 'minimum', { fill: C.ink, size: 16, anchor: 'start' });
          p.text(0.75, -1, 'minimum', { fill: C.ink, size: 16, anchor: 'start' });
          p.point(0, 0, { r: 7, fill: C.ink });
          p.text(0.3, 0.22, 'saddle', { fill: C.ink, size: 16, anchor: 'start' });
          var gdPath = p.path([[-2.6, 0]], { stroke: C.muted, width: 4 });
          var sgPath = p.path([[-2.6, 0]], { stroke: C.green, width: 4 });
          var dot = p.point(-2.6, 0.0001, { r: 9, fill: C.green });
          var N = 170;
          var ch = chart(w, { w: 660, h: 260, xmin: 0, xmax: N, ymin: -0.4, ymax: 3.6, xticks: [0, 40, 80, 120, 160], yticks: [[0, '0'], [1, '1'], [2, '2'], [3, '3']], xlabel: 'step', ylabel: 'loss L' });
          var gdLoss = ch.line(C.muted, 3), sgLoss = ch.line(C.green, 3);
          legend(w, [[C.muted, 'gradient descent'], [C.green, 'SGD (noisy gradients)']]);
          var raf = 0;
          function run(noisy) {
            cancelAnimationFrame(raf);
            var x = -2.6, y = 0.0001, k = 0, pts = [[x, y]], ls = [[0, L(x, y)]];
            var path = noisy ? sgPath : gdPath, lossLine = noisy ? sgLoss : gdLoss;
            dot.el.setAttribute('fill', noisy ? C.green : C.muted);
            function frame() {
              for (var i = 0; i < 1 && k < N; i++) {
                var gx = x, gy = y * y * y - y;
                var ux = gx, uy = gy;
                if (noisy) { ux += 0.5 * gauss(); uy += 0.5 * gauss(); }
                x -= 0.1 * ux; y -= 0.1 * uy; k++;
                pts.push([x, y]); ls.push([k, L(x, y)]);
              }
              path.set(pts); lossLine.set(ls); dot.set(x, y);
              rS.textContent = 'step ' + k;
              rL.textContent = 'L = ' + fmt(L(x, y), 3);
              rG.textContent = '‖∇L‖ = ' + fmt(Math.sqrt(x * x + (y * y * y - y) * (y * y * y - y)), 4);
              if (k < N) raf = requestAnimationFrame(frame);
            }
            raf = requestAnimationFrame(frame);
          }
          var b = M4.el('div', { class: 'm4-row' }, w);
          M4.button(b, 'Run gradient descent', function () { run(false); }, { primary: true });
          M4.button(b, 'Run SGD', function () { run(true); });
          rS.textContent = 'step 0'; rL.textContent = 'L = ' + fmt(L(-2.6, 0), 3); rG.textContent = '‖∇L‖ = 2.6000';
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
        }
      },

      /* 5 */
      {
        kind: 'exercise',
        title: 'Flat loss curves',
        html:
          R`<p>During training the loss has not changed for many steps and the gradient norm \( \lVert \nabla L \rVert \) is close to zero. Which conclusion is justified by this observation alone?</p>`,
        hint: R`In the previous step the gradient norm was almost zero on the plateau, yet the loss later dropped further.`,
        mount: function (el, ctx) {
          var w = wrap(el);
          M4.choices(w, {
            options: [
              R`The parameters are at a minimum, because the gradient vanishes only at minima.`,
              R`The parameters are near a critical point. It may be a saddle, and in high dimensions it most likely is.`,
              R`The learning rate \( \eta \) is too large and the iteration is diverging.`,
              R`The parameters are at a maximum of the loss.`
            ],
            correct: 1,
            onCorrect: function () {
              ctx.note(R`A vanishing gradient identifies a critical point only. The signs of the Hessian eigenvalues decide its type, and the noise of SGD usually moves the parameters off a saddle quickly.`);
              ctx.solved();
            },
            onWrong: function (i) {
              ctx.wrong(i === 0 ? 'The gradient also vanishes at saddle points and maxima.' : i === 2 ? 'A diverging iteration shows a growing loss, not a constant one.' : 'Gradient descent moves away from maxima. A maximum is not where it stalls.');
            }
          });
        }
      },

      /* 6 */
      {
        kind: 'exercise',
        title: 'Leaving a sharp minimum',
        html:
          R`<p>This loss over a single parameter \( \theta \) has a sharp minimum at \( \theta = -2 \) with curvature \( 16 \) and a flat minimum at \( \theta = 2 \) with curvature \( 1 \). Inside a minimum with curvature \( \lambda \), each gradient step multiplies the distance to the minimum by \( 1 - \eta\lambda \). The distance shrinks only if \( |1 - \eta\lambda| < 1 \).</p>` +
          R`<p>Gradient descent starts inside the sharp minimum. Choose a learning rate \( \eta \) for which it leaves the sharp minimum and settles in the flat one, then press Run.</p>`,
        hint: R`The sharp minimum is unstable when \( |1 - 16\eta| > 1 \), that is, when \( \eta > 2/16 = 0.125 \). The flat minimum stays stable for any \( \eta < 2 \).`,
        mount: function (el, ctx) {
          var w = wrap(el);
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rA = readout(row, C.pink), rB = readout(row, C.blue), rT = readout(row);
          var p = M4.plane(w, { xmin: -5, xmax: 5, ymin: -1.4, ymax: 6, width: 660, height: 488, grid: true, axes: true, labels: true });
          p.fn(twoMinPlot, { stroke: C.ink, width: 4, samples: 400 });
          p.text(-2, -0.85, 'sharp minimum', { fill: C.pink, size: 16, weight: 700 });
          p.text(2, -0.85, 'flat minimum', { fill: C.blue, size: 16, weight: 700 });
          var ring = p.point(2, 0, { r: 15, fill: C.blue });
          ring.el.setAttribute('fill-opacity', 0.18);
          var trail = p.path([[-2.3, twoMin(-2.3)]], { stroke: C.green, width: 2 });
          trail.el.setAttribute('stroke-opacity', 0.55);
          var ball = p.point(-2.3, twoMin(-2.3), { r: 11, fill: C.green });
          var eta = 0.05, raf = 0;
          function info() {
            rA.textContent = 'sharp: |1 − 16η| = ' + fmt(Math.abs(1 - 16 * eta), 2);
            rB.textContent = 'flat: |1 − η| = ' + fmt(Math.abs(1 - eta), 2);
          }
          function sim() {
            var t = -2.3, a = [t];
            for (var k = 0; k < 400; k++) { t -= eta * twoMinGrad(t); a.push(t); }
            return a;
          }
          function reset() {
            cancelAnimationFrame(raf);
            ball.set(-2.3, twoMin(-2.3)); trail.set([[-2.3, twoMin(-2.3)]]);
            ring.el.setAttribute('fill-opacity', 0.18);
            rT.textContent = 'θ = −2.30';
          }
          function clampX(t) { return Math.max(-5, Math.min(5, t)); }
          function run() {
            reset();
            var a = sim(), last = a[a.length - 1];
            var out = Math.abs(last - 2) < 0.02 ? 'flat' : (Math.abs(last + 2) < 0.02 ? 'sharp' : 'none');
            var K = 70;
            for (var k = 0; k < 70; k++) { if (Math.abs(a[k] - last) < 0.01 && Math.abs(a[k + 1] - last) < 0.01) { K = k; break; } }
            K = Math.max(K, 6);
            var f = 0, per = 6, pts = [[-2.3, twoMin(-2.3)]];
            function frame() {
              f++;
              var k = Math.floor(f / per), u = (f % per) / per;
              if (k >= K) {
                ball.set(clampX(a[K]), twoMinPlot(a[K]));
                rT.textContent = 'θ = ' + fmt(a[K], 2).replace('-', '−');
                finish(out);
                return;
              }
              u = u * u * (3 - 2 * u);
              var t = a[k] + (a[k + 1] - a[k]) * u;
              ball.set(clampX(t), twoMinPlot(t));
              if (f % per === 0) { pts.push([clampX(a[k]), twoMinPlot(a[k])]); trail.set(pts); }
              rT.textContent = 'step ' + k + ', θ = ' + fmt(t, 2).replace('-', '−');
              raf = requestAnimationFrame(frame);
            }
            raf = requestAnimationFrame(frame);
          }
          function finish(out) {
            if (out === 'flat') {
              ring.el.setAttribute('fill-opacity', 0.55);
              ctx.note(R`With \( \eta = ` + fmt(eta, 2) + R` \) the factor in the sharp minimum is \( 1 - 16\eta = ` + fmt(1 - 16 * eta, 2) + R` \), of magnitude above 1, so every step increases the distance until the iterate is thrown out. In the flat minimum the factor is \( ` + fmt(1 - eta, 2) + R` \) and the iteration converges.`);
              ctx.solved();
            } else if (out === 'sharp') {
              ctx.wrong('With η = ' + fmt(eta, 2) + ' the factor in the sharp minimum is ' + fmt(1 - 16 * eta, 2).replace('-', '−') + ', of magnitude below 1. The iterate stays in the sharp minimum.');
            } else {
              ctx.wrong('The iterate has not settled in the flat minimum. Try a different learning rate.');
            }
          }
          M4.slider(w, { min: 0.02, max: 0.3, step: 0.01, value: 0.05, label: 'learning rate η', format: function (v) { return fmt(+v, 2); }, onInput: function (v) { eta = Math.round(+v * 100) / 100; info(); reset(); } });
          var b = M4.el('div', { class: 'm4-row' }, w);
          M4.button(b, 'Run', run, { primary: true });
          info(); reset();
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
        }
      },

      /* 7 */
      {
        kind: 'exercise',
        title: 'Flat minima and generalization',
        html:
          R`<p>Test data are never identical to training data, so the test loss resembles the training loss shifted sideways by a small amount \( s \). The grey curve is the training loss from the previous step and the green curve is the test loss. The two dots show the test loss at the two parameter values that minimize the training loss.</p>` +
          R`<p>Drag the orange handle to shift the test loss until the test loss at the sharp minimum is at least \( 2 \) while the test loss at the flat minimum is still at most \( 0.25 \).</p>`,
        hint: R`At the sharp minimum the test loss is \( 8s^2 \), at the flat minimum it is \( 0.5\,s^2 \). A shift of \( |s| = 0.5 \) already gives \( 2 \) and \( 0.125 \).`,
        mount: function (el, ctx) {
          var w = wrap(el);
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rS = readout(row, C.orange), rA = readout(row, C.pink), rB = readout(row, C.blue);
          var p = M4.plane(w, { xmin: -5, xmax: 5, ymin: -1.4, ymax: 6, width: 660, height: 488, grid: true, axes: true, labels: true });
          p.fn(twoMinPlot, { stroke: C.muted, width: 3, samples: 400 });
          var s = 0, done = false;
          var test = p.fn(twoMinPlot, { stroke: C.green, width: 4, samples: 400 });
          var la = p.line(-2, 0, -2, 0, { stroke: C.pink, width: 3, dash: '5 5' });
          var lb = p.line(2, 0, 2, 0, { stroke: C.blue, width: 3, dash: '5 5' });
          var pa = p.point(-2, 0, { r: 9, fill: C.pink });
          var pb = p.point(2, 0, { r: 9, fill: C.blue });
          p.text(-2, -0.85, 'sharp minimum', { fill: C.pink, size: 16, weight: 700 });
          p.text(2, -0.85, 'flat minimum', { fill: C.blue, size: 16, weight: 700 });
          legend(w, [[C.muted, 'training loss'], [C.green, 'test loss (shifted by s)']]);
          function upd() {
            test.set(function (t) { return twoMinPlot(t - s); });
            var a = twoMin(-2 - s), b = twoMin(2 - s);
            pa.set(-2, a); pb.set(2, b); la.set(-2, 0, -2, a); lb.set(2, 0, 2, b);
            rS.textContent = 's = ' + fmt(s, 2).replace('-', '−');
            rA.textContent = 'test loss at sharp minimum = ' + fmt(a, 2);
            rB.textContent = 'test loss at flat minimum = ' + fmt(b, 3);
            if (!done && a >= 2 - 1e-9 && b <= 0.25 + 1e-9) {
              done = true;
              pa.el.setAttribute('r', 13);
              ctx.note(R`The same shift \( s = ` + fmt(s, 2) + R` \) raises the loss to \( ` + fmt(a, 2) + R` \) at the sharp minimum and only to \( ` + fmt(b, 3) + R` \) at the flat one, a ratio of 16, the ratio of the curvatures. A flat minimum is therefore much less sensitive to the difference between training and test data.`);
              ctx.solved();
            } else if (!done) {
              ctx.note(a < 2 ? R`The test loss at the sharp minimum is still below \( 2 \). Shift further.` : R`The shift is now so large that the flat minimum also exceeds \( 0.25 \). Shift back a little.`);
            }
          }
          var h = p.handle(2, 0, {
            color: C.orange, r: 13, snap: 0.05,
            onDrag: function (x) {
              var ns = Math.round((x - 2) / 0.05) * 0.05;
              ns = Math.max(-0.75, Math.min(0.75, ns));
              s = ns;
              h.set(2 + s, 0);
              upd();
            },
            onEnd: function () { h.set(2 + s, 0); }
          });
          upd();
        }
      },

      /* 8 */
      {
        kind: 'explore',
        title: 'Momentum in a ravine',
        html:
          R`<p>In the ravine \( L = \tfrac12(0.2\,\theta_1^2 + 10\,\theta_2^2) \) the condition number is \( \kappa = 10/0.2 = 50 \). With \( \eta = 0.18 \), plain gradient descent flips sign across the ravine at every step and moves in a consistent direction along it. Averaging successive steps cancels the alternating part and keeps the consistent part.</p>` +
          R`<p>Momentum does this with a velocity \( v \): \[ v \leftarrow \beta v + \nabla L(\theta), \qquad \theta \leftarrow \theta - \eta v, \] where \( \beta \in [0, 1) \) controls how slowly old gradients fade. Vary \( \beta \) and compare the number of steps needed to bring the loss below 1% of its initial value. In general plain gradient descent needs a number of steps proportional to \( \kappa \), momentum a number proportional to \( \sqrt{\kappa} \).</p>`,
        mount: function (el, ctx) {
          var w = wrap(el);
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rG = readout(row, C.muted), rM = readout(row, C.green);
          var p = M4.plane(w, { xmin: -5, xmax: 5, ymin: -2, ymax: 2, width: 680, height: 272, grid: false, axes: false, labels: false });
          var ux = Math.abs(p.x(1) - p.x(0)), uy = Math.abs(p.y(1) - p.y(0));
          [0.4, 1.5, 3.5, 6.5, 10.5, 15.5].forEach(function (c) {
            M4.svg('ellipse', { cx: p.x(0), cy: p.y(0), rx: Math.sqrt(2 * c / RAV.a) * ux, ry: Math.sqrt(2 * c / RAV.b) * uy, fill: 'none', stroke: C.line, 'stroke-width': 2 }, p.g);
          });
          p.point(0, 0, { r: 7, fill: C.ink });
          var N = 90;
          var gd = ravRun(0, N);
          var gdP = p.path(gd.pts, { stroke: C.muted, width: 3 });
          var moP = p.path([[RAV.x0, RAV.y0]], { stroke: C.green, width: 4 });
          var dot = p.point(RAV.x0, RAV.y0, { r: 8, fill: C.green });
          p.point(RAV.x0, RAV.y0, { r: 6, fill: C.ink });
          legend(w, [[C.muted, 'gradient descent (β = 0)'], [C.green, 'momentum']]);
          var beta = 0.8, raf = 0, cur = null;
          rG.textContent = 'gradient descent: ' + gd.first + ' steps';
          function show(k) {
            moP.set(cur.pts.slice(0, k + 1));
            dot.set(cur.pts[k][0], cur.pts[k][1]);
          }
          function upd(animate) {
            cancelAnimationFrame(raf);
            cur = ravRun(beta, N);
            rM.textContent = 'momentum, β = ' + fmt(beta, 2) + ': ' + (cur.first < 0 ? 'more than ' + N : cur.first) + ' steps';
            if (!animate) { show(N); return; }
            var f = 0;
            (function frame() {
              var k = Math.min(N, Math.floor(f / 3));
              show(k); f++;
              if (k < N) raf = requestAnimationFrame(frame);
            })();
          }
          M4.slider(w, { min: 0, max: 0.95, step: 0.05, value: 0.8, label: 'momentum β', format: function (v) { return fmt(+v, 2); }, onInput: function (v) { beta = Math.round(+v * 100) / 100; upd(false); } });
          var b = M4.el('div', { class: 'm4-row' }, w);
          M4.button(b, 'Replay', function () { upd(true); }, { primary: true });
          upd(true);
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
        }
      },

      /* 9 */
      {
        kind: 'exercise',
        title: 'Decay of old gradients',
        html:
          R`<p>Write \( g_t \) for the gradient at step \( t \). Starting from \( v = 0 \) and applying \( v \leftarrow \beta v + g \) repeatedly, the velocity is a weighted sum of all past gradients. Each application multiplies everything already stored in \( v \) by \( \beta \).</p>` +
          R`<p>For \( \beta = 0.8 \), drag the correct weight into each slot of the expansion of \( v_t \).</p>`,
        hint: R`Unrolling twice gives \( v_t = g_t + \beta\, g_{t-1} + \beta^2 g_{t-2} + \dots \), and \( 0.8^2 = 0.64 \).`,
        mount: function (el, ctx) {
          var w = wrap(el);
          var eq = M4.el('div', { class: 'l3-s3-eq' }, w);
          M4.el('span', { html: M4.tex('v_t =') }, eq);
          var want = ['1', '0.8', '0.64'], gs = ['g_t', 'g_{t-1}', 'g_{t-2}'], slots = [];
          want.forEach(function (v, i) {
            var s = M4.el('div', { class: 'm4-slot l3-s3-slot' }, eq);
            s.setAttribute('data-v', v);
            slots.push(s);
            M4.el('span', { html: M4.tex('\\cdot\\, ' + gs[i] + (i < 2 ? ' \;+' : ' \;+ \\dots')) }, eq);
          });
          var tray = M4.el('div', { class: 'm4-row' }, w);
          var toks = ['0.64', '1.6', '1', '0.2', '0.8'].map(function (v) {
            var t = M4.el('div', { class: 'm4-token l3-s3-tok', text: v }, tray);
            t.setAttribute('data-v', v);
            return t;
          });
          M4.el('div', { class: 'm4-note', text: 'Two of the five tiles are not used.' }, w);
          var placed = 0;
          M4.dragDrop({
            tokens: toks, slots: slots,
            onDrop: function (tok, slot) {
              if (slot.getAttribute('data-done')) return;
              var tv = tok.getAttribute('data-v'), sv = slot.getAttribute('data-v');
              if (tv === sv) {
                slot.textContent = '';
                slot.appendChild(tok);
                slot.classList.add('filled');
                slot.setAttribute('data-done', '1');
                tok.classList.add('l3-s3-placed');
                placed++;
                if (placed === 3) {
                  ctx.note(R`\( v_t = g_t + 0.8\, g_{t-1} + 0.64\, g_{t-2} + \dots \) For a constant gradient \( g \) the sum approaches \( g/(1-\beta) = 5g \). For a gradient that alternates between \( +g \) and \( -g \) it stays near \( g/(1+\beta) \approx 0.56\,g \).`);
                  ctx.solved();
                } else {
                  ctx.note('Correct. ' + (3 - placed) + ' slot' + (placed === 2 ? '' : 's') + ' left.');
                }
              } else {
                var age = want.indexOf(sv);
                ctx.wrong('This gradient is ' + age + ' step' + (age === 1 ? '' : 's') + ' old, so it has been multiplied by β = 0.8 exactly ' + age + ' time' + (age === 1 ? '' : 's') + '. ' + tv + ' is not that weight.');
              }
            },
            onMiss: function () {}
          });
        }
      },

      /* 10 */
      {
        kind: 'explore',
        title: 'One learning rate per parameter',
        html:
          R`<p>Momentum still uses one learning rate for all directions. AdaGrad keeps, for every parameter separately, the sum \( G \) of its squared gradients \( g \): \[ G \leftarrow G + g^2, \qquad \theta \leftarrow \theta - \frac{\eta}{\sqrt{G}}\, g . \] Parameters with large gradients get a small effective learning rate \( \eta/\sqrt{G} \) and parameters with small gradients a large one. Since \( G \) can only grow, the effective learning rate only shrinks and learning eventually stops.</p>` +
          R`<p>RMSProp replaces the sum by a running average, \( G \leftarrow \rho\, G + (1-\rho)\, g^2 \) with for example \( \rho = 0.9 \), so that \( \sqrt{G} \) is approximately the root mean square of recent gradients. The plot follows one parameter whose gradient has size \( 4 \) for 30 steps and is smaller afterwards, with \( \eta = 0.1 \).</p>`,
        mount: function (el, ctx) {
          var w = wrap(el);
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rA = readout(row, C.orange), rR = readout(row, C.green);
          var N = 90;
          var ch = chart(w, { w: 660, h: 340, xmin: 0, xmax: N, ymin: -3, ymax: 0.4, xticks: [0, 30, 60, 90], yticks: [[-3, '0.001'], [-2, '0.01'], [-1, '0.1'], [0, '1']], xlabel: 'step', ylabel: 'effective learning rate η/√G' });
          ch.vline(30, C.line);
          svgText(ch.svg, ch.X(30) + 8, 34, 'gradients shrink here', { 'text-anchor': 'start' });
          var aL = ch.line(C.orange, 4), rL = ch.line(C.green, 4);
          legend(w, [[C.orange, 'AdaGrad (sum)'], [C.green, 'RMSProp (running average)']]);
          var rho = 0.9, gAfter = 0.5;
          function upd() {
            var Ga = 0, Gr = 0, a = [], r = [], ea = 0, er = 0;
            for (var t = 1; t <= N; t++) {
              var g = t <= 30 ? 4 : gAfter;
              Ga += g * g; Gr = rho * Gr + (1 - rho) * g * g;
              ea = 0.1 / Math.sqrt(Ga); er = 0.1 / Math.sqrt(Gr);
              a.push([t, Math.log(ea) / Math.LN10]); r.push([t, Math.log(er) / Math.LN10]);
            }
            aL.set(a); rL.set(r);
            rA.textContent = 'AdaGrad at step 90: η/√G = ' + fmt(ea, 4);
            rR.textContent = 'RMSProp at step 90: η/√G = ' + fmt(er, 4);
          }
          M4.slider(w, { min: 0.5, max: 0.99, step: 0.01, value: 0.9, label: 'RMSProp ρ', format: function (v) { return fmt(+v, 2); }, onInput: function (v) { rho = +v; upd(); } });
          M4.slider(w, { min: 0.1, max: 4, step: 0.1, value: 0.5, label: 'gradient size after step 30', format: function (v) { return fmt(+v, 1); }, onInput: function (v) { gAfter = +v; upd(); } });
          upd();
        }
      },

      /* 11 */
      {
        kind: 'exercise',
        title: 'Two updates by hand',
        html:
          R`<p>The size of an update is \( \dfrac{\eta}{\sqrt{G}}\,|g| \), where \( G \) already includes the current gradient \( g \). Use \( \eta = 0.5 \) in both parts and solve both to continue.</p>` +
          R`<p><b>AdaGrad.</b> \( G \) starts at \( 0 \) and the first two gradients are \( 3 \) and \( 4 \). Compute the size of the second update.</p>` +
          R`<p><b>RMSProp.</b> With \( \rho = 0.5 \), the stored value is \( G = 14 \) and the new gradient is \( g = 6 \). Compute the size of this update.</p>`,
        hint: R`AdaGrad: \( G = 3^2 + 4^2 = 25 \), so \( \sqrt{G} = 5 \). RMSProp: \( G = 0.5 \cdot 14 + 0.5 \cdot 6^2 = 25 \). Then multiply \( \eta/\sqrt{G} = 0.1 \) by the current gradient.`,
        mount: function (el, ctx) {
          var w = wrap(el);
          var okA = false, okB = false;
          function check() {
            if (okA && okB) {
              ctx.note(R`AdaGrad: \( \tfrac{0.5}{\sqrt{25}} \cdot 4 = 0.4 \). RMSProp: \( G = 7 + 18 = 25 \), so the update is \( \tfrac{0.5}{\sqrt{25}} \cdot 6 = 0.6 \).`);
              ctx.solved();
            } else {
              ctx.note('Correct. One part left.');
            }
          }
          var cA = M4.el('div', { class: 'l3-s3-card' }, w);
          M4.el('h4', { text: 'AdaGrad: gradients 3 then 4, η = 0.5' }, cA);
          M4.numberInput(cA, {
            answer: 0.4, tolerance: 0.005, placeholder: 'size of second update', label: 'update size',
            onCorrect: function () { okA = true; cA.style.borderColor = C.green; check(); },
            onWrong: function (v) {
              var x = +v;
              ctx.wrong(Math.abs(x - 0.1) < 0.005 ? 'That is the effective learning rate η/√G. Multiply it by the current gradient, 4.' :
                Math.abs(x - 0.5) < 0.005 ? 'G is the sum of both squared gradients, 9 + 16, not only the latest one.' :
                'First compute G = 3² + 4², then η/√G, then multiply by the current gradient.');
            }
          });
          var cB = M4.el('div', { class: 'l3-s3-card' }, w);
          M4.el('h4', { text: 'RMSProp: ρ = 0.5, G = 14, g = 6, η = 0.5' }, cB);
          M4.numberInput(cB, {
            answer: 0.6, tolerance: 0.005, placeholder: 'size of this update', label: 'update size',
            onCorrect: function () { okB = true; cB.style.borderColor = C.green; check(); },
            onWrong: function (v) {
              var x = +v;
              ctx.wrong(Math.abs(x - 0.1) < 0.005 ? 'That is the effective learning rate η/√G. Multiply it by the current gradient, 6.' :
                Math.abs(x - 3 / Math.sqrt(50)) < 0.01 ? 'RMSProp averages: G = ρ·14 + (1 − ρ)·36, it does not add 14 + 36.' :
                'First update G = 0.5·14 + 0.5·6², then compute η/√G, then multiply by g = 6.');
            }
          });
        }
      },

      /* 12 */
      {
        kind: 'text',
        title: 'Recap',
        html:
          R`<ul>` +
          R`<li>A point with \( \nabla L = 0 \) is a minimum only if all Hessian eigenvalues are positive. With random signs this has probability \( (1/2)^n \), so in high dimensions almost every critical point is a saddle. Gradient descent stalls on a plateau there, and the noise of SGD shortens the plateau.</li>` +
          R`<li>A minimum with curvature \( \lambda \) is stable only if \( |1 - \eta\lambda| < 1 \), so a large learning rate ejects the iterate from sharp minima and lets it settle in flat ones. Flat minima generalize better because a small shift between training and test loss changes the loss very little.</li>` +
          R`<li>Momentum, \( v \leftarrow \beta v + \nabla L,\ \theta \leftarrow \theta - \eta v \), averages out the zigzag and reduces the step count from order \( \kappa \) to order \( \sqrt{\kappa} \). AdaGrad divides the learning rate of each parameter by \( \sqrt{G} \) with \( G \leftarrow G + g^2 \), which eventually stops learning. RMSProp uses \( G \leftarrow \rho G + (1-\rho) g^2 \), so the step size recovers when the gradients shrink.</li>` +
          R`</ul>`
      }
    ]
  });
})();
