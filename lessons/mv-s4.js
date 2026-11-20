/* Gradients and Hessians, session 4: gradients of loss functions. */
(function () {
  'use strict';
  var C = M4.colors;

  // a small fixed data set scattered around y = 0.8 x + 0.3
  var XS = [-1.8, -1.1, -0.4, 0.3, 1.0, 1.7];
  var YS = [-1.25, -0.35, 0.25, 0.35, 1.3, 1.55];
  var N = XS.length;

  function loss(w, b) {
    var s = 0;
    for (var i = 0; i < N; i++) { var e = w * XS[i] + b - YS[i]; s += e * e; }
    return s / N;
  }
  function grad(w, b) {
    var gw = 0, gb = 0;
    for (var i = 0; i < N; i++) { var e = w * XS[i] + b - YS[i]; gw += 2 * e * XS[i] / N; gb += 2 * e / N; }
    return [gw, gb];
  }

  function readout(parent, items) {
    var row = M4.el('div', { class: 'm4-readout' }, parent), vals = {};
    items.forEach(function (it) {
      var s = M4.el('span', null, row);
      var l = M4.el('span', { html: '\\(' + it[1] + '\\) = ' }, s); M4.typeset(l);
      vals[it[0]] = M4.el('b', { text: '0' }, s);
    });
    return function (k, v) { vals[k].textContent = M4.fmt(v, 2); };
  }

  // Left: the loss surface over (w, b) with a ball. Right: the data and the line the ball stands for.
  function fitScene(el, onMove) {
    var two = M4.el('div', { class: 'm4-two' }, el);
    var left = M4.el('div', { style: 'display:flex;justify-content:center' }, two);
    var right = M4.el('div', { style: 'display:flex;justify-content:center' }, two);
    var s = M4.surface3d(left, { f: loss, r: 2, n: 24, width: 420, height: 360, color: C.blue, contours: [0.1, 0.4, 1, 2, 3.5] });
    var down = s.arrow(C.ink, 3);
    var labW = M4.svg('text', { 'font-size': 17, 'font-style': 'italic', fill: C.muted, 'text-anchor': 'middle', text: 'w' }, s.top);
    var labB = M4.svg('text', { 'font-size': 17, 'font-style': 'italic', fill: C.muted, 'text-anchor': 'middle', text: 'b' }, s.top);
    var p = M4.plane(right, { xmin: -2.5, xmax: 2.5, ymin: -2.5, ymax: 2.5, width: 360, height: 360, labels: false });
    var res = XS.map(function () { return p.path([], { stroke: C.red, width: 2, dash: '4 4' }); });
    var line = p.path([], { stroke: C.blue, width: 4 });
    XS.forEach(function (x, i) { p.point(x, YS[i], { r: 6, color: C.ink, layer: 'top' }); });
    var set = readout(el, [['w', 'w'], ['b', 'b'], ['L', 'L'], ['gw', '\\partial L/\\partial w'], ['gb', '\\partial L/\\partial b']]);
    var ball;
    function update() {
      var w = ball.x, b = ball.y, g = grad(w, b), L = Math.hypot(g[0], g[1]);
      line.set([[-2.5, b - 2.5 * w], [2.5, b + 2.5 * w]]);
      XS.forEach(function (x, i) { res[i].set([[x, YS[i]], [x, w * x + b]]); });
      var k = L > 1e-3 ? Math.min(0.6, 0.6 * L) / L : 0;
      down.set(s.floor(w, b), s.floor(w - k * g[0], b - k * g[1]));
      var pw = s.floor(2.35, 0), pb = s.floor(0, 2.35);
      labW.setAttribute('x', pw[0]); labW.setAttribute('y', pw[1] + 5);
      labB.setAttribute('x', pb[0]); labB.setAttribute('y', pb[1] + 5);
      set('w', w); set('b', b); set('L', loss(w, b)); set('gw', g[0]); set('gb', g[1]);
      if (onMove) onMove(w, b, g);
    }
    ball = s.ball(-1.2, -1.4, { onMove: update });
    s.onRedraw(function () { if (ball) update(); });
    update();
    return { s: s, ball: ball };
  }

  M4.lesson({
    id: 'mv-s4',
    module: 'multivariable',
    title: 'Gradients of loss functions',
    summary: 'The loss of a model is a surface over its parameters. Its gradient tells every parameter which way to move, and it has the same shape for every model: error times input.',
    minutes: 20,
    steps: [
      {
        kind: 'text',
        title: 'A loss is a function of the parameters',
        html: '<p>Fit a line \\(\\hat y = wx + b\\) to data points \\((x_1, y_1), \\dots, (x_n, y_n)\\) with the <b>mean squared error</b></p>' +
          '\\[ L(w, b) = \\frac1n \\sum_{i=1}^n (wx_i + b - y_i)^2. \\]' +
          '<p>The data are fixed. The variables are the parameters \\(w\\) and \\(b\\), so \\(L\\) is a surface over the \\((w, b)\\) floor, and every point of that floor is one candidate line. Training means walking on this surface towards its lowest point.</p>' +
          '<p>Write \\(e_i = wx_i + b - y_i\\) for the <b>residual</b> of point \\(i\\), the signed vertical distance from the line to the point. The chain rule gives</p>' +
          '\\[ \\frac{\\partial L}{\\partial w} = \\frac2n \\sum_{i=1}^n e_i\\, x_i, \\qquad \\frac{\\partial L}{\\partial b} = \\frac2n \\sum_{i=1}^n e_i. \\]' +
          '<p>Each data point pushes on the parameters in proportion to its residual. Points the line already fits contribute nothing. The derivative for \\(w\\) also scales each push by \\(x_i\\), since a change in slope moves the line most far away from \\(x = 0\\).</p>'
      },
      {
        kind: 'explore',
        title: 'Lines and the loss surface',
        html: '<p>Drag the ball over the loss surface on the left. Its position is a pair \\((w, b)\\), and the right panel draws the corresponding line with its residuals in red. The black arrow on the floor is the negative gradient \\(-\\nabla L\\), the direction gradient descent would step. Press the button to take one step with learning rate \\(\\eta = 0.3\\).</p>',
        mount: function (el) {
          var sc = fitScene(el);
          var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:12px' }, el);
          M4.button(row, 'Gradient step', function () {
            var g = grad(sc.ball.x, sc.ball.y);
            sc.ball.set(Math.max(-2, Math.min(2, sc.ball.x - 0.3 * g[0])), Math.max(-2, Math.min(2, sc.ball.y - 0.3 * g[1])));
          }, { primary: true });
          M4.button(row, 'Reset', function () { sc.ball.set(-1.2, -1.4); });
          M4.el('p', { class: 'm4-cap', text: 'Large residuals give a steep surface and long steps. Near the minimum the residuals balance out and the steps shrink.' }, el);
        }
      },
      {
        kind: 'exercise',
        title: 'The best line',
        html: '<p>Drag the ball to the bottom of the loss surface. Use the line on the right as a guide: the minimum is reached when both partial derivatives are close to zero, \\(\\lVert \\nabla L \\rVert < 0.15\\).</p>',
        hint: 'When the line runs too low on the right and too high on the left, increase \\(w\\). When all residuals point the same way, shift \\(b\\).',
        mount: function (el, ctx) {
          var done = false;
          fitScene(el, function (w, b, g) {
            if (!done && Math.hypot(g[0], g[1]) < 0.15) {
              done = true;
              ctx.solved('\\(w \\approx ' + M4.fmt(w, 2) + '\\), \\(b \\approx ' + M4.fmt(b, 2) + '\\). At the minimum the residuals sum to zero, and so do the residuals weighted by \\(x_i\\).');
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'The same pattern for classification',
        html: '<p>Some models answer a yes or no question. Each example has a label \\(y = 1\\) for yes or \\(y = 0\\) for no, and the model, called <b>logistic regression</b>, outputs its chance \\(\\hat p\\) of yes. It squeezes \\(z = wx + b\\) into the range from 0 to 1 with the <b>sigmoid</b> \\(\\sigma(z) = 1/(1 + e^{-z})\\), so \\(\\hat p = \\sigma(z)\\). The loss of one example is</p>' +
          '\\[ \\ell = -\\big[y \\log \\hat p + (1 - y) \\log(1 - \\hat p)\\big]. \\]' +
          '<p>For \\(y = 1\\) this is \\(-\\log \\hat p\\), for \\(y = 0\\) it is \\(-\\log(1 - \\hat p)\\): minus the log of the chance given to the right answer, small when that chance is close to 1. It is called the <b>cross-entropy</b> loss, and later modules derive it from probability. Using \\(\\sigma\'(z) = \\sigma(z)(1 - \\sigma(z))\\), the chain rule collapses to a short result:</p>' +
          '\\[ \\frac{\\partial \\ell}{\\partial z} = \\hat p - y, \\qquad \\frac{\\partial \\ell}{\\partial w} = (\\hat p - y)\\,x, \\qquad \\frac{\\partial \\ell}{\\partial b} = \\hat p - y. \\]' +
          '<p>The error \\(\\hat p - y\\) plays the role of the residual. Squared error with a line and cross-entropy with a sigmoid lead to gradients of the same form: prediction minus target, times the input.</p>' +
          '<p>Adding a penalty \\(\\lambda \\lVert \\mathbf w \\rVert^2\\) to the loss, called <b>L2 regularization</b> or weight decay, adds \\(2\\lambda \\mathbf w\\) to the gradient and pulls every weight towards zero.</p>'
      },
      {
        kind: 'exercise',
        title: 'Loss gradients',
        html: '<p>Each problem is one application of the chain rule. Find the error first, then multiply by the input.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 4,
            gen: function () {
              var t = M4.rand(0, 3);
              if (t === 0) {
                var w = M4.randNZ(-2, 2), b = M4.rand(-2, 2), x = M4.randNZ(-3, 3), y = M4.rand(-4, 4), e = w * x + b - y;
                return {
                  q: '<p>One example \\((x, y) = (' + x + ', ' + y + ')\\) and the loss \\(\\ell = (wx + b - y)^2\\). Compute \\(\\partial \\ell/\\partial w\\) at \\(w = ' + w + '\\), \\(b = ' + b + '\\).</p>',
                  answer: 2 * e * x,
                  explain: 'The residual is \\(e = ' + M4.sn(w) + '\\cdot ' + M4.sn(x) + ' + ' + M4.sn(b) + ' - ' + M4.sn(y) + ' = ' + e + '\\), so \\(\\partial \\ell/\\partial w = 2ex = ' + 2 * e * x + '\\).'
                };
              }
              if (t === 1) {
                var w2 = M4.randNZ(-2, 2), b2 = M4.rand(-1, 1), x1 = M4.randNZ(-2, 2), x2 = M4.randNZ(-2, 2), y1 = M4.rand(-3, 3), y2 = M4.rand(-3, 3);
                var e1 = w2 * x1 + b2 - y1, e2 = w2 * x2 + b2 - y2;
                return {
                  q: '<p>Two data points \\((' + x1 + ', ' + y1 + ')\\) and \\((' + x2 + ', ' + y2 + ')\\), the line \\(\\hat y = ' + M4.poly([[w2, 'x'], [b2, '']]) + '\\) and the mean squared error \\(L = \\tfrac12 (e_1^2 + e_2^2)\\) with residuals \\(e_i = \\hat y_i - y_i\\). Compute \\(\\partial L/\\partial b\\).</p>',
                  answer: e1 + e2,
                  explain: 'Residuals \\(e_1 = ' + e1 + '\\), \\(e_2 = ' + e2 + '\\). \\(\\partial L/\\partial b = \\tfrac12 (2e_1 + 2e_2) = e_1 + e_2 = ' + (e1 + e2) + '\\).'
                };
              }
              if (t === 2) {
                var p = M4.pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]), yy = M4.pick([0, 1]), xx = M4.randNZ(-3, 3);
                return {
                  q: '<p>A logistic regression model outputs \\(\\hat p = ' + p + '\\) for an example with input \\(x = ' + xx + '\\) and label \\(y = ' + yy + '\\). Compute \\(\\partial \\ell/\\partial w\\) for the cross-entropy loss.</p>',
                  answer: (p - yy) * xx,
                  explain: '\\(\\partial \\ell/\\partial w = (\\hat p - y)x = (' + p + ' - ' + yy + ')\\cdot ' + M4.sn(xx) + ' = ' + M4.fmt((p - yy) * xx, 2).replace('−', '-') + '\\).'
                };
              }
              var lam = M4.pick([0.01, 0.05, 0.1, 0.5]), wv = M4.randNZ(-4, 4), gd = M4.randNZ(-3, 3);
              return {
                q: '<p>The data loss has \\(\\partial L/\\partial w = ' + gd + '\\) at \\(w = ' + wv + '\\). The training objective adds an L2 penalty \\(\\lambda w^2\\) with \\(\\lambda = ' + lam + '\\). Compute the derivative of the full objective with respect to \\(w\\).</p>',
                answer: gd + 2 * lam * wv,
                explain: '\\(' + gd + ' + 2\\cdot ' + lam + '\\cdot ' + M4.sn(wv) + ' = ' + M4.fmt(gd + 2 * lam * wv, 2).replace('−', '-') + '\\).'
              };
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Many parameters',
        html: '<p>Stack the inputs as the rows of a matrix \\(X \\in \\mathbb R^{n \\times d}\\) and the targets into a vector \\(\\mathbf y\\). A linear model predicts \\(X\\mathbf w\\), and the mean squared error and its gradient become</p>' +
          '\\[ L(\\mathbf w) = \\frac1n \\lVert X\\mathbf w - \\mathbf y \\rVert^2, \\qquad \\nabla L(\\mathbf w) = \\frac2n X^\\top (X\\mathbf w - \\mathbf y). \\]' +
          '<p>The vector \\(X\\mathbf w - \\mathbf y\\) holds the residuals, and multiplying by \\(X^\\top\\) weights each residual by its input, the matrix version of \\(\\sum_i e_i x_i\\). The Hessian is \\(\\tfrac2n X^\\top X\\), constant in \\(\\mathbf w\\): the loss surface of linear regression is an exact quadratic bowl, and its shape is set by the data alone.</p>' +
          '<p>For a neural network the loss surface is no longer a bowl, and writing the gradient as a formula becomes impractical. Backpropagation computes it automatically by applying the chain rule layer by layer, which is the subject of the backpropagation module.</p>'
      },
      {
        kind: 'explore',
        title: 'Squares and outliers',
        html: '<p>The word squared in mean squared error is literal. Each red square has the residual as its side, and the loss is the average of their areas. The blue line is always the line with the smallest total area.</p>' +
          '<p>Drag the points. Pull one point far away from the others and see how its square grows with the square of the distance, so a single outlier can drag the whole line towards it.</p>',
        mount: function (el) {
          var pts = XS.map(function (x, i) { return [x, YS[i]]; });
          var p = M4.plane(el, { xmin: -2.5, xmax: 2.5, ymin: -2.5, ymax: 2.5, width: 440, height: 440 });
          var sq = pts.map(function () { return p.path([], { stroke: C.red, width: 1.5, fill: C.red, fillOpacity: 0.14, closed: true, layer: 'bg' }); });
          var line = p.path([], { stroke: C.blue, width: 4 });
          var set = readout(el, [['w', 'w'], ['b', 'b'], ['L', 'L']]);
          function fit() {
            var mx = 0, my = 0, sxy = 0, sxx = 0, n = pts.length;
            pts.forEach(function (q) { mx += q[0] / n; my += q[1] / n; });
            pts.forEach(function (q) { sxy += (q[0] - mx) * (q[1] - my); sxx += (q[0] - mx) * (q[0] - mx); });
            var w = sxx > 1e-6 ? sxy / sxx : 0;
            return [w, my - w * mx];
          }
          function upd() {
            var wb = fit(), w = wb[0], b = wb[1], L = 0;
            line.set([[-2.5, b - 2.5 * w], [2.5, b + 2.5 * w]]);
            pts.forEach(function (q, i) {
              var yh = w * q[0] + b, e = q[1] - yh, s = Math.abs(e) * (q[0] < 0 ? 1 : -1);
              sq[i].set([[q[0], q[1]], [q[0], yh], [q[0] + s, yh], [q[0] + s, q[1]]]);
              L += e * e / pts.length;
            });
            set('w', w); set('b', b); set('L', L);
          }
          var hs = pts.map(function (q) {
            return p.handle(q[0], q[1], { color: C.ink, r: 8, onDrag: function (a, c) { q[0] = a; q[1] = c; upd(); } });
          });
          var row = M4.el('div', { class: 'm4-row' }, el);
          M4.button(row, 'Reset the points', function () {
            pts.forEach(function (q, i) { q[0] = XS[i]; q[1] = YS[i]; hs[i].set(q[0], q[1]); });
            upd();
          }, { ghost: true });
          upd();
        }
      },
      {
        kind: 'exercise',
        title: 'Who pulls hardest',
        html: '<p>The derivative \\(\\partial L/\\partial w = \\frac2n \\sum_i e_i x_i\\) is a sum of one push per data point. Find the point with the largest push \\(|e_i x_i|\\).</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 3,
            gen: function () {
              var w = M4.pick([0.5, 1, 2]), b = M4.pick([0, 1, -1]), xs = [], used = {};
              while (xs.length < 4) { var x = M4.randNZ(-4, 4); if (!used[x]) { used[x] = 1; xs.push(x); } }
              var rows = xs.map(function (x) { var e = M4.randNZ(-3, 3); return { x: x, y: w * x + b - e, e: e, push: Math.abs(e * x) }; });
              var best = 0; rows.forEach(function (r, i) { if (r.push > rows[best].push) best = i; });
              if (rows.some(function (r, i) { return i !== best && r.push === rows[best].push; })) rows[best].e += rows[best].e > 0 ? 1 : -1, rows[best].y = w * rows[best].x + b - rows[best].e, rows[best].push = Math.abs(rows[best].e * rows[best].x);
              return {
                q: '<p>The current line is \\(\\hat y = ' + M4.poly([[w, 'x'], [b, '']]) + '\\). Which data point contributes most to \\(\\partial L/\\partial w\\)?</p>',
                options: rows.map(function (r) { return '\\((' + r.x + ', ' + r.y + ')\\)'; }),
                answer: best,
                explain: 'Residuals \\(e_i = \\hat y_i - y_i\\) are ' + rows.map(function (r) { return '\\(' + r.e + '\\)'; }).join(', ') + ', so the pushes \\(|e_i x_i|\\) are ' + rows.map(function (r) { return '\\(' + r.push + '\\)'; }).join(', ') + '. A point far from \\(x = 0\\) has more say over the slope.'
              };
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>A loss is a function of the parameters, with the data held fixed. Every point of the parameter floor is one model.</li>' +
          '<li>For squared error each data point pushes on the parameters with its residual, and on the slope with residual times input.</li>' +
          '<li>Squaring makes large residuals dominate, which is why one outlier can move the whole fit.</li>' +
          '</ul>' +
          '<p class="m4-note">The next session, <a href="#/l/mv-s5">Vector and matrix derivatives</a>, gives the rules that compute these gradients for whole vectors and matrices at once.</p>'
      }
    ]
  });
})();
