(function () {
  'use strict';

  var C = M4.colors;
  var RED = C.red, BLUE = C.blue, GREEN = C.green, ORANGE = C.orange;
  var CONTOUR = '#d6d2c6';

  // ---------- one-time CSS ----------
  function css() {
    if (document.getElementById('optimisation-s4-style')) return;
    var s = document.createElement('style');
    s.id = 'optimisation-s4-style';
    s.textContent =
      '.optimisation-s4-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%}' +
      '.optimisation-s4-wrap svg{max-width:100%;height:auto;touch-action:none}' +
      '.optimisation-s4-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}' +
      '.optimisation-s4-dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:7px;vertical-align:-1px}' +
      '.optimisation-s4-rule{display:flex;flex-direction:column;align-items:center;gap:14px;font-size:22px;padding:18px 12px;background:#fff;border:2px solid ' + C.line + ';border-radius:18px;width:100%;box-sizing:border-box}' +
      '.optimisation-s4-line{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}' +
      '.optimisation-s4-slot{min-width:74px;min-height:54px;display:inline-flex;align-items:center;justify-content:center}' +
      '.optimisation-s4-tray{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;min-height:60px}' +
      '.optimisation-s4-tok{min-width:60px;min-height:46px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;padding:4px 12px;touch-action:none}' +
      '.optimisation-s4-ok{border-color:' + GREEN + ' !important;background:#eafaf2 !important}' +
      '.optimisation-s4-sliders{width:100%;display:flex;flex-direction:column;gap:8px}';
    document.head.appendChild(s);
  }

  // ---------- small local helpers ----------
  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmt(v, d) { return (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d); }
  function wrap(el) { css(); return M4.el('div', { class: 'optimisation-s4-wrap' }, el); }
  function readout(parent, text) { return M4.el('div', { class: 'm4-readout', text: text || '' }, parent); }
  function legend(parent, items) {
    var row = M4.el('div', { class: 'optimisation-s4-legend' }, parent);
    items.forEach(function (it) {
      var chip = M4.el('span', { class: 'm4-chip' }, row);
      M4.el('span', { class: 'optimisation-s4-dot', style: 'background:' + it[0] }, chip);
      chip.appendChild(document.createTextNode(it[1]));
    });
    return row;
  }
  function loss(a, b, x, y) { return 0.5 * (a * x * x + b * y * y); }
  function fmtLoss(L) {
    if (!isFinite(L) || L > 1e6) return 'diverged';
    if (L < 0.001) return L.toExponential(1);
    return L.toFixed(3);
  }
  function contours(p, a, b, levels) {
    levels.forEach(function (c) {
      var pts = [];
      for (var k = 0; k < 96; k++) {
        var t = 2 * Math.PI * k / 96;
        pts.push([Math.sqrt(2 * c / a) * Math.cos(t), Math.sqrt(2 * c / b) * Math.sin(t)]);
      }
      p.path(pts, { stroke: CONTOUR, width: 1.5, closed: true });
    });
    p.point(0, 0, { r: 6, fill: GREEN });
  }
  // heavy-ball / (stochastic) gradient descent on L = (a x^2 + b y^2)/2
  // v <- beta v - eta (grad + noise),  w <- w + v
  function simulate(a, b, x0, y0, eta, beta, n, noiseSd) {
    var x = x0, y = y0, vx = 0, vy = 0, pts = [[x, y]];
    for (var i = 0; i < n; i++) {
      var gx = a * x, gy = b * y;
      if (noiseSd) { gx += noiseSd * gauss(); gy += noiseSd * gauss(); }
      vx = beta * vx - eta * gx;
      vy = beta * vy - eta * gy;
      x += vx; y += vy;
      if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) { x = clamp(x || 0, -1e6, 1e6); y = clamp(y || 0, -1e6, 1e6); pts.push([x, y]); break; }
      pts.push([x, y]);
    }
    return pts;
  }
  function clip(pts, X, Y) {
    return pts.map(function (q) { return [clamp(q[0], -X, X), clamp(q[1], -Y, Y)]; });
  }
  function two(pts) { return pts.length > 1 ? pts : [pts[0], pts[0]]; }

  // Animates a ball along several paths simultaneously. tracks = [{pts, path, ball}]
  function makePlayer(ctx) {
    var raf = 0;
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    ctx.onCleanup(stop);
    return {
      stop: stop,
      play: function (tracks, msPerStep, onStep, onDone) {
        stop();
        var n = 0;
        tracks.forEach(function (t) { n = Math.max(n, t.pts.length - 1); });
        var t0 = performance.now(), last = -1;
        function frame(now) {
          var s = Math.min(n, (now - t0) / msPerStep);
          var k = Math.floor(s), f = s - k;
          tracks.forEach(function (t) {
            var m = t.pts.length - 1;
            var kk = Math.min(k, m), ff = k >= m ? 0 : f;
            var A = t.pts[kk], B = t.pts[Math.min(kk + 1, m)];
            var bx = A[0] + (B[0] - A[0]) * ff, by = A[1] + (B[1] - A[1]) * ff;
            var shown = t.pts.slice(0, kk + 1);
            shown.push([bx, by]);
            t.path.set(two(shown));
            t.ball.set(bx, by);
          });
          if (k !== last) { last = k; if (onStep) onStep(k); }
          if (s < n) raf = requestAnimationFrame(frame);
          else { raf = 0; if (onDone) onDone(); }
        }
        raf = requestAnimationFrame(frame);
      }
    };
  }

  // ---------- gradient cloud widget (steps 3 and 4) ----------
  function gradCloud(root, sigma, B0, opts) {
    var g = [3, 2];
    var p = M4.plane(root, { xmin: -2, xmax: 8, ymin: -3, ymax: 7, width: 520, height: 520 });
    var N = 70, dots = [], z = [];
    var i;
    for (i = 0; i < N; i++) z.push([gauss(), gauss()]);
    var ghost = null;
    if (opts && opts.target) {
      ghost = p.path(circle(opts.target), { stroke: GREEN, width: 3, fill: 'rgba(22,181,107,0.10)', closed: true });
    }
    var ring = p.path(circle(1), { stroke: ORANGE, width: 2.5, closed: true });
    for (i = 0; i < N; i++) {
      var d = p.point(g[0], g[1], { r: 4.5, fill: RED });
      d.el.setAttribute('opacity', '0.5');
      dots.push(d);
    }
    var est = p.arrow(0, 0, g[0], g[1], { stroke: RED, width: 4 });
    var tru = p.arrow(0, 0, g[0], g[1], { stroke: C.ink, width: 4 });
    function circle(r) {
      var pts = [];
      for (var k = 0; k < 72; k++) { var t = 2 * Math.PI * k / 72; pts.push([g[0] + r * Math.cos(t), g[1] + r * Math.sin(t)]); }
      return pts;
    }
    var B = B0;
    function draw() {
      var sd = sigma / Math.sqrt(B);
      ring.set(circle(sd));
      for (var k = 0; k < N; k++) dots[k].set(g[0] + sd * z[k][0], g[1] + sd * z[k][1]);
      est.set(0, 0, g[0] + sd * z[0][0], g[1] + sd * z[0][1]);
    }
    draw();
    return {
      p: p, ghost: ghost,
      setB: function (b) { B = b; draw(); },
      resample: function () { for (var k = 0; k < N; k++) z[k] = [gauss(), gauss()]; draw(); },
      sd: function () { return sigma / Math.sqrt(B); }
    };
  }

  M4.lesson({
    id: 'optimisation-s4',
    module: 'optimisation',
    title: 'Stochastic gradients and momentum',
    summary: 'Why minibatch gradients are noisy, what that noise does to the descent path, and how momentum smooths and accelerates it.',
    minutes: 10,
    steps: [
      // 1
      {
        kind: 'text',
        title: 'Minibatches',
        html:
          '<p>Gradient descent, as described so far, uses the exact gradient of the loss at every step. For large data sets the exact gradient is too expensive, so practical training uses an estimate computed from a small random sample of the data.</p>' +
          '<p>In this lesson you will explain where the noise in such an estimate comes from, predict how it depends on the sample size, read a noisy descent path on a contour map, and state and apply the momentum update, which behaves like a heavy ball rolling on the loss surface.</p>'
      },
      // 2
      {
        kind: 'text',
        title: 'The minibatch gradient',
        html:
          '<p>Let the training set contain \\(N\\) examples, and let \\(\\ell_i(w)\\) be the loss of example \\(i\\) at parameters \\(w\\). The full loss is the average \\(L(w)=\\frac{1}{N}\\sum_{i=1}^{N}\\ell_i(w)\\), so its gradient is the average of the \\(N\\) per-example gradients.</p>' +
          '<p>A <em>minibatch</em> is a random subset of \\(B\\) examples. The minibatch gradient \\(\\hat g\\) is the average of only those \\(B\\) per-example gradients:</p>' +
          '\\[\\hat g=\\frac{1}{B}\\sum_{i\\in\\text{batch}}\\nabla \\ell_i(w).\\]' +
          '<p>On average \\(\\hat g\\) equals the true gradient \\(\\nabla L(w)\\), but any single minibatch deviates from it. Gradient descent with \\(\\hat g\\) in place of \\(\\nabla L\\) is called <em>stochastic gradient descent</em> (SGD). It is the standard way to train neural networks, typically with \\(B\\) between 16 and a few thousand while \\(N\\) is in the millions.</p>'
      },
      // 3
      {
        kind: 'explore',
        title: 'Spread of gradient estimates',
        html:
          '<p>The dark arrow is the true gradient at one fixed point \\(w\\). Each red dot is the tip of the gradient estimated from one random minibatch of size \\(B\\). The red arrow shows one of them. If single-example gradients scatter around the true gradient with standard deviation \\(\\sigma\\) in each coordinate, an average of \\(B\\) of them scatters with standard deviation \\(\\sigma/\\sqrt{B}\\), drawn as the orange circle.</p>',
        mount: function (el, ctx) {
          var root = wrap(el);
          var sigma = 2;
          var w = gradCloud(root, sigma, 4);
          legend(root, [[C.ink, 'true gradient'], [RED, 'minibatch estimates'], [ORANGE, 'radius σ/√B']]);
          var row = M4.el('div', { class: 'm4-row' }, root);
          var r1 = readout(row), r2 = readout(row);
          function upd(B) {
            r1.textContent = 'B = ' + B;
            r2.textContent = 'σ/√B = ' + fmt(sigma / Math.sqrt(B), 2);
          }
          var box = M4.el('div', { class: 'optimisation-s4-sliders' }, root);
          M4.slider(box, {
            min: 1, max: 64, step: 1, value: 4, label: 'Batch size B',
            format: function (v) { return String(Math.round(v)); },
            onInput: function (v) { v = Math.round(v); w.setB(v); upd(v); }
          });
          M4.button(M4.el('div', { class: 'm4-row' }, root), 'Draw new minibatches', function () { w.resample(); });
          upd(4);
          ctx.note('Increasing \\(B\\) from 1 to 4 halves the spread. A further halving requires \\(B=16\\).');
        }
      },
      // 4
      {
        kind: 'exercise',
        title: 'Batch size and accuracy',
        html:
          '<p>Here single-example gradients have standard deviation \\(\\sigma=2\\) per coordinate, and the batch size starts at \\(B=4\\). The green disc has radius \\(0.5\\). Set the slider to the <em>smallest</em> batch size for which the spread \\(\\sigma/\\sqrt{B}\\) is at most \\(0.5\\), then check.</p>',
        hint: 'Solve \\(2/\\sqrt{B}=0.5\\): this gives \\(\\sqrt{B}=4\\).',
        mount: function (el, ctx) {
          var root = wrap(el);
          var sigma = 2, B = 4, done = false;
          var w = gradCloud(root, sigma, B, { target: 0.5 });
          legend(root, [[GREEN, 'target spread 0.5'], [ORANGE, 'current spread σ/√B'], [RED, 'minibatch estimates']]);
          var row = M4.el('div', { class: 'm4-row' }, root);
          var r1 = readout(row), r2 = readout(row);
          function upd() {
            r1.textContent = 'B = ' + B;
            r2.textContent = 'spread = ' + fmt(sigma / Math.sqrt(B), 3);
          }
          var box = M4.el('div', { class: 'optimisation-s4-sliders' }, root);
          M4.slider(box, {
            min: 1, max: 64, step: 1, value: B, label: 'Batch size B',
            format: function (v) { return String(Math.round(v)); },
            onInput: function (v) { B = Math.round(v); w.setB(B); upd(); }
          });
          M4.button(M4.el('div', { class: 'm4-row' }, root), 'Check', function () {
            if (done) return;
            var sd = sigma / Math.sqrt(B);
            if (B === 16) {
              done = true;
              if (w.ghost) { w.ghost.el.setAttribute('fill', 'rgba(22,181,107,0.30)'); }
              ctx.note('Correct: \\(2/\\sqrt{16}=0.5\\). Halving the noise from \\(B=4\\) cost four times as many examples per step.');
              ctx.solved();
            } else if (B < 16) {
              ctx.wrong('With B = ' + B + ' the spread is ' + fmt(sd, 3) + ', still larger than 0.5.');
            } else {
              ctx.wrong('With B = ' + B + ' the spread is ' + fmt(sd, 3) + ', which is below 0.5, but a smaller batch already suffices.');
            }
          }, { primary: true });
          upd();
        }
      },
      // 5
      {
        kind: 'explore',
        title: 'Noisy paths on a contour map',
        html:
          '<p>The map shows contour lines of the loss \\(L(x,y)=\\tfrac12(x^2+4y^2)\\) with its minimum at the green dot. The dashed dark path is gradient descent with the exact gradient. The red path is SGD, in which every step adds random noise of standard deviation \\(4/\\sqrt{B}\\) to each gradient coordinate. Both use learning rate \\(\\eta=0.15\\). Drag the starting point, choose \\(B\\), and run the descent several times.</p>',
        mount: function (el, ctx) {
          var root = wrap(el);
          var a = 1, b = 4, eta = 0.15, n = 60, B = 4, sx = -4, sy = 2.5;
          var p = M4.plane(root, { xmin: -5, xmax: 5, ymin: -3.5, ymax: 3.5, width: 600, height: 420, grid: false, labels: false });
          contours(p, a, b, [0.25, 1, 2.5, 5, 8.5, 13, 18.5]);
          var gdPath = p.path([[sx, sy], [sx, sy]], { stroke: C.ink, width: 2.5 });
          gdPath.el.setAttribute('stroke-dasharray', '7 6');
          var sgdPath = p.path([[sx, sy], [sx, sy]], { stroke: RED, width: 3 });
          sgdPath.el.setAttribute('stroke-linejoin', 'round');
          var ball = p.point(sx, sy, { r: 8, fill: RED });
          var player = makePlayer(ctx);
          legend(root, [[C.ink, 'exact gradient descent'], [RED, 'SGD'], [GREEN, 'minimum']]);
          var row = M4.el('div', { class: 'm4-row' }, root);
          var rS = readout(row), rL = readout(row), rD = readout(row);
          function reset() {
            player.stop();
            var gd = simulate(a, b, sx, sy, eta, 0, n, 0);
            gdPath.set(gd);
            sgdPath.set([[sx, sy], [sx, sy]]);
            ball.set(sx, sy);
            rS.textContent = 'step 0';
            rL.textContent = 'SGD loss = ' + fmtLoss(loss(a, b, sx, sy));
            rD.textContent = 'noise sd = ' + fmt(4 / Math.sqrt(B), 2);
          }
          function run() {
            var pts = simulate(a, b, sx, sy, eta, 0, n, 4 / Math.sqrt(B));
            var shown = clip(pts, 5, 3.5);
            player.play([{ pts: shown, path: sgdPath, ball: ball }], 55, function (k) {
              var q = pts[Math.min(k, pts.length - 1)];
              rS.textContent = 'step ' + k;
              rL.textContent = 'SGD loss = ' + fmtLoss(loss(a, b, q[0], q[1]));
            });
          }
          var h = p.handle(sx, sy, {
            color: BLUE, r: 12,
            onDrag: function (x, y) {
              sx = clamp(x, -4.7, 4.7); sy = clamp(y, -3.2, 3.2);
              if (h && (sx !== x || sy !== y)) h.set(sx, sy);
              reset();
            },
            onEnd: function () { h.set(sx, sy); run(); }
          });
          var box = M4.el('div', { class: 'optimisation-s4-sliders' }, root);
          M4.slider(box, {
            min: 1, max: 64, step: 1, value: B, label: 'Batch size B',
            format: function (v) { return String(Math.round(v)); },
            onInput: function (v) { B = Math.round(v); reset(); }
          });
          M4.button(M4.el('div', { class: 'm4-row' }, root), 'Run SGD', run, { primary: true });
          reset();
          ctx.note('With a small batch the path wanders and never settles exactly at the minimum. With a large batch it follows the exact path closely.');
        }
      },
      // 6
      {
        kind: 'exercise',
        title: 'Behaviour near the minimum',
        html:
          '<p>At the minimum the true gradient is zero, but a minibatch gradient is generally not zero, because the individual examples still disagree. Consider SGD run for a long time with a fixed learning rate \\(\\eta\\) and a fixed batch size \\(B\\). Which description of its long-run behaviour is correct?</p>',
        hint: 'Each step is \\(-\\eta\\hat g\\). At the minimum, \\(\\hat g\\) is pure noise with spread \\(\\sigma/\\sqrt{B}\\).',
        mount: function (el, ctx) {
          var root = wrap(el);
          var msgs = [
            'The noise does not vanish at the minimum, so the iterates cannot come to rest there.',
            '',
            'The noise has mean zero, so it does not push the iterates away systematically. The true gradient keeps pulling them back.',
            'Noise changes the path, but the average step still points downhill, so the loss does decrease at first.'
          ];
          M4.choices(root, {
            options: [
              'It converges exactly to the minimum and then stops moving.',
              'It keeps jittering in a region around the minimum. The region shrinks if \\(\\eta\\) is reduced or \\(B\\) is increased.',
              'It drifts steadily away from the minimum, because the noise accumulates.',
              'It behaves like a random walk and the loss never decreases.'
            ],
            correct: 1,
            onCorrect: function () {
              ctx.note('Correct. The random part of each step has size about \\(\\eta\\,\\sigma/\\sqrt{B}\\), which is why learning rates are usually decreased during training.');
              ctx.solved();
            },
            onWrong: function (i) { ctx.wrong(msgs[i]); }
          });
        }
      },
      // 7
      {
        kind: 'text',
        title: 'Momentum',
        html:
          '<p>Plain gradient descent has no memory: each step depends only on the current gradient. <em>Momentum</em> adds a velocity \\(v\\) that accumulates past gradients. With learning rate \\(\\eta\\), momentum coefficient \\(\\beta\\) between 0 and 1, and gradient \\(g_t\\) at step \\(t\\), the update is</p>' +
          '\\[v_{t+1}=\\beta\\,v_t-\\eta\\,g_t,\\qquad w_{t+1}=w_t+v_{t+1}.\\]' +
          '<p>The parameters move like a heavy ball: the gradient acts as a force that changes the velocity, and \\(\\beta\\) plays the role of friction, with \\(\\beta=0\\) recovering plain gradient descent. Gradient components that keep the same sign add up, while components that flip sign from step to step, including zero-mean noise, largely cancel. Most deep-learning optimisers, such as SGD with momentum and Adam, use this idea with \\(\\beta\\approx0.9\\).</p>'
      },
      // 8
      {
        kind: 'explore',
        title: 'Momentum in a narrow valley',
        html:
          '<p>The loss \\(L(x,y)=\\tfrac12(x^2+25y^2)\\) is a narrow valley: steep in \\(y\\), nearly flat in \\(x\\). The blue path is plain gradient descent and the red path is momentum, both with the same learning rate \\(\\eta\\) and 40 steps from the same start. Vary \\(\\eta\\) and \\(\\beta\\) and compare how far each method travels along the valley floor.</p>',
        mount: function (el, ctx) {
          var root = wrap(el);
          var a = 1, b = 25, x0 = -4, y0 = 1, n = 40, eta = 0.03, beta = 0.7;
          var p = M4.plane(root, { xmin: -5, xmax: 5, ymin: -2, ymax: 2, width: 640, height: 300, grid: false, labels: false });
          contours(p, a, b, [0.5, 2, 4.5, 8, 12.5, 20.5]);
          var gdPath = p.path([[x0, y0], [x0, y0]], { stroke: BLUE, width: 3 });
          var moPath = p.path([[x0, y0], [x0, y0]], { stroke: RED, width: 3 });
          gdPath.el.setAttribute('stroke-linejoin', 'round');
          moPath.el.setAttribute('stroke-linejoin', 'round');
          p.point(x0, y0, { r: 6, fill: C.ink });
          var gdBall = p.point(x0, y0, { r: 8, fill: BLUE });
          var moBall = p.point(x0, y0, { r: 8, fill: RED });
          var player = makePlayer(ctx);
          legend(root, [[BLUE, 'gradient descent (β = 0)'], [RED, 'momentum'], [GREEN, 'minimum']]);
          var row = M4.el('div', { class: 'm4-row' }, root);
          var rG = readout(row), rM = readout(row);
          var gd, mo;
          function compute() {
            gd = simulate(a, b, x0, y0, eta, 0, n, 0);
            mo = simulate(a, b, x0, y0, eta, beta, n, 0);
            var g = gd[gd.length - 1], m = mo[mo.length - 1];
            rG.textContent = 'GD loss after 40 steps = ' + (gd.length <= n ? 'diverged' : fmtLoss(loss(a, b, g[0], g[1])));
            rM.textContent = 'momentum loss = ' + (mo.length <= n ? 'diverged' : fmtLoss(loss(a, b, m[0], m[1])));
          }
          function still() {
            player.stop(); compute();
            var G = clip(gd, 5, 2), M = clip(mo, 5, 2);
            gdPath.set(G); moPath.set(M);
            gdBall.set(G[G.length - 1][0], G[G.length - 1][1]);
            moBall.set(M[M.length - 1][0], M[M.length - 1][1]);
          }
          function play() {
            compute();
            player.play([
              { pts: clip(gd, 5, 2), path: gdPath, ball: gdBall },
              { pts: clip(mo, 5, 2), path: moPath, ball: moBall }
            ], 90);
          }
          var box = M4.el('div', { class: 'optimisation-s4-sliders' }, root);
          M4.slider(box, {
            min: 0.01, max: 0.08, step: 0.005, value: eta, label: 'Learning rate η',
            format: function (v) { return Number(v).toFixed(3); },
            onInput: function (v) { eta = Number(v); still(); }
          });
          M4.slider(box, {
            min: 0, max: 0.9, step: 0.05, value: beta, label: 'Momentum β',
            format: function (v) { return Number(v).toFixed(2); },
            onInput: function (v) { beta = Number(v); still(); }
          });
          M4.button(M4.el('div', { class: 'm4-row' }, root), 'Play', play, { primary: true });
          still();
          ctx.note('Along \\(x\\) the gradient always has the same sign, so the velocity builds up. Across the valley the gradient alternates in sign, so momentum damps the zigzag.');
        }
      },
      // 9
      {
        kind: 'exercise',
        title: 'Momentum update practice',
        html:
          '<p>Complete the two lines of the momentum update by dragging tiles into the three empty slots. Here \\(v\\) is the velocity, \\(g\\) the current (minibatch) gradient, \\(\\eta\\) the learning rate and \\(\\beta\\) the momentum coefficient. Two tiles are not needed.</p>',
        hint: 'The old velocity is scaled by the friction-like coefficient, the gradient by the learning rate, and the parameters move by the new velocity.',
        mount: function (el, ctx) {
          var root = wrap(el);
          var rule = M4.el('div', { class: 'optimisation-s4-rule' }, root);
          function span(parent, tex) { return M4.el('span', { html: M4.tex(tex) }, parent); }
          function slot(parent, key) {
            var s = M4.el('span', { class: 'm4-slot optimisation-s4-slot' }, parent);
            s.setAttribute('data-k', key);
            return s;
          }
          var l1 = M4.el('div', { class: 'optimisation-s4-line' }, rule);
          span(l1, 'v \\leftarrow');
          var s1 = slot(l1, 'beta');
          span(l1, '\\cdot\\, v \\;-');
          var s2 = slot(l1, 'eta');
          span(l1, '\\cdot\\, g');
          var l2 = M4.el('div', { class: 'optimisation-s4-line' }, rule);
          span(l2, 'w \\leftarrow w \\;+');
          var s3 = slot(l2, 'v');
          var tray = M4.el('div', { class: 'optimisation-s4-tray' }, root);
          var defs = [['g', 'g'], ['beta', '\\beta'], ['one', '1'], ['v', 'v'], ['eta', '\\eta']];
          var tokens = defs.map(function (d) {
            var t = M4.el('div', { class: 'm4-token optimisation-s4-tok', html: M4.tex(d[1]) }, tray);
            t.setAttribute('data-k', d[0]);
            return t;
          });
          var filled = 0;
          var why = {
            beta: {
              eta: 'The learning rate scales the gradient, not the old velocity.',
              one: 'A coefficient of 1 would mean no friction at all: the velocity would never decay.',
              g: 'This slot is a number that scales the old velocity.',
              v: 'This slot is a number that scales the old velocity.'
            },
            eta: {
              beta: 'The momentum coefficient scales the old velocity. The gradient is scaled by something else.',
              one: 'The gradient must be scaled by the step-size parameter.',
              g: 'The gradient is already written after this slot. A scalar coefficient is needed.',
              v: 'A scalar coefficient is needed in front of the gradient.'
            },
            v: {
              g: 'Adding the gradient would move uphill. The parameters move by the velocity.',
              beta: 'The parameters move by a vector, not by a coefficient.',
              eta: 'The parameters move by a vector, not by a coefficient.',
              one: 'The parameters move by the newly computed velocity.'
            }
          };
          M4.dragDrop({
            tokens: tokens,
            slots: [s1, s2, s3],
            onDrop: function (tok, sl) {
              var tk = tok.getAttribute('data-k'), sk = sl.getAttribute('data-k');
              if (sl.getAttribute('data-done')) return;
              if (tk === sk) {
                sl.appendChild(tok);
                sl.setAttribute('data-done', '1');
                sl.classList.add('filled');
                sl.classList.add('optimisation-s4-ok');
                tok.style.pointerEvents = 'none';
                tok.style.border = 'none';
                tok.style.background = 'transparent';
                tok.style.boxShadow = 'none';
                filled += 1;
                if (filled === 3) {
                  rule.classList.add('m4-pop');
                  ctx.note('Complete: \\(v \\leftarrow \\beta v - \\eta g\\), then \\(w \\leftarrow w + v\\).');
                  ctx.solved();
                } else {
                  ctx.note(filled + ' of 3 slots filled.');
                }
              } else {
                ctx.wrong((why[sk] && why[sk][tk]) || 'That tile does not belong in this slot.');
              }
            },
            onMiss: function () {}
          });
        }
      },
      // 10
      {
        kind: 'exercise',
        title: 'Two steps on paper',
        html:
          '<p>A parameter \\(w\\) moves on a line where the gradient is constant, \\(g=-2\\). Use \\(\\eta=0.5\\), \\(\\beta=0.5\\), start \\(w_0=0\\) and velocity \\(v_0=0\\). The first step gives \\(v_1=0.5\\cdot0-0.5\\cdot(-2)=1\\) and \\(w_1=1\\). Drag the red point to the position \\(w_2\\) after the second step, then check.</p>',
        hint: 'First compute \\(v_2=\\beta v_1-\\eta g=0.5\\cdot1+1\\), then \\(w_2=w_1+v_2\\).',
        mount: function (el, ctx) {
          var root = wrap(el);
          var done = false, pos = 1;
          var p = M4.plane(root, { xmin: -0.6, xmax: 4.6, ymin: -1, ymax: 1, width: 640, height: 220, grid: false, axes: false, labels: false });
          p.line(-0.3, 0, 4.3, 0, { stroke: C.ink, width: 3 });
          for (var k = 0; k <= 8; k++) {
            var x = k / 2, major = k % 2 === 0;
            p.line(x, major ? -0.14 : -0.08, x, major ? 0.14 : 0.08, { stroke: C.ink, width: 2 });
            if (major) p.text(x, -0.5, String(x), { fill: C.muted, size: 17 });
          }
          p.point(0, 0, { r: 7, fill: C.ink });
          p.text(0, 0.38, 'w₀', { fill: C.ink, size: 18, weight: 700 });
          p.point(1, 0, { r: 7, fill: C.ink });
          p.text(1, 0.38, 'w₁', { fill: C.ink, size: 18, weight: 700 });
          var v1 = p.arrow(0, 0.75, 1, 0.75, { stroke: BLUE, width: 4 });
          void v1;
          p.text(0.5, 0.86, 'v₁ = 1', { fill: BLUE, size: 16, weight: 700 });
          var ring = p.point(2.5, 0, { r: 17, fill: 'none' });
          ring.el.setAttribute('stroke', GREEN);
          ring.el.setAttribute('stroke-width', '4');
          ring.el.setAttribute('opacity', '0');
          var row = M4.el('div', { class: 'm4-row' }, root);
          var r = readout(row, 'w₂ = 1.0');
          var h = p.handle(1, 0, {
            color: RED, r: 13, snap: 0.5,
            onDrag: function (x) {
              if (done) { h.set(2.5, 0); return; }
              pos = clamp(Math.round(x * 2) / 2, 0, 4);
              h.set(pos, 0);
              r.textContent = 'w₂ = ' + pos.toFixed(1);
            },
            onEnd: function () { h.set(done ? 2.5 : pos, 0); }
          });
          M4.button(row, 'Check', function () {
            if (done) return;
            if (Math.abs(pos - 2.5) < 1e-9) {
              done = true;
              ring.el.setAttribute('opacity', '1');
              ctx.note('Correct: \\(v_2=0.5\\cdot1+1=1.5\\) and \\(w_2=1+1.5=2.5\\). The second step is longer than the first because the velocity carried over.');
              ctx.solved();
            } else if (Math.abs(pos - 2) < 1e-9) {
              ctx.wrong('That is where plain gradient descent would be: two steps of length 1. Momentum keeps half of the previous velocity.');
            } else if (Math.abs(pos - 1.5) < 1e-9) {
              ctx.wrong('1.5 is the velocity v₂, not the position. Add it to w₁.');
            } else if (pos < 2.5) {
              ctx.wrong('Too short. The new velocity is the decayed old velocity plus the new gradient step.');
            } else {
              ctx.wrong('Too far. Only half of the old velocity (β = 0.5) is carried over.');
            }
          }, { primary: true });
        }
      },
      // 11
      {
        kind: 'exercise',
        title: 'Momentum tuning',
        html:
          '<p>The loss is again the narrow valley \\(L(x,y)=\\tfrac12(x^2+25y^2)\\), starting at \\((-4,1)\\) where \\(L=20.5\\). Choose \\(\\eta\\) and \\(\\beta\\) so that 30 steps of the momentum update end with a loss below \\(0.01\\). Plain gradient descent cannot achieve this: it is unstable in \\(y\\) once \\(\\eta\\ge 2/25=0.08\\), and below that it is too slow in \\(x\\).</p>',
        hint: 'Momentum also widens the stable range of learning rates to \\(\\eta<2(1+\\beta)/25\\). Try a learning rate near 0.10 together with a moderate \\(\\beta\\) between 0.4 and 0.6.',
        mount: function (el, ctx) {
          var root = wrap(el);
          var a = 1, b = 25, x0 = -4, y0 = 1, n = 30, eta = 0.04, beta = 0, done = false;
          var p = M4.plane(root, { xmin: -5, xmax: 5, ymin: -2, ymax: 2, width: 640, height: 300, grid: false, labels: false });
          contours(p, a, b, [0.5, 2, 4.5, 8, 12.5, 20.5]);
          var target = p.point(0, 0, { r: 16, fill: 'rgba(22,181,107,0.15)' });
          target.el.setAttribute('stroke', GREEN);
          target.el.setAttribute('stroke-width', '3');
          var path = p.path([[x0, y0], [x0, y0]], { stroke: RED, width: 3 });
          path.el.setAttribute('stroke-linejoin', 'round');
          p.point(x0, y0, { r: 6, fill: C.ink });
          var ball = p.point(x0, y0, { r: 9, fill: RED });
          var player = makePlayer(ctx);
          var row = M4.el('div', { class: 'm4-row' }, root);
          var rS = readout(row, 'step 0'), rL = readout(row, 'loss = 20.500');
          function reset() {
            if (done) return;
            player.stop();
            path.set([[x0, y0], [x0, y0]]);
            ball.set(x0, y0);
            rS.textContent = 'step 0';
            rL.textContent = 'loss = 20.500';
          }
          var box = M4.el('div', { class: 'optimisation-s4-sliders' }, root);
          M4.slider(box, {
            min: 0.01, max: 0.12, step: 0.01, value: eta, label: 'Learning rate η',
            format: function (v) { return Number(v).toFixed(2); },
            onInput: function (v) { eta = Math.round(Number(v) * 100) / 100; reset(); }
          });
          M4.slider(box, {
            min: 0, max: 0.9, step: 0.05, value: beta, label: 'Momentum β',
            format: function (v) { return Number(v).toFixed(2); },
            onInput: function (v) { beta = Math.round(Number(v) * 100) / 100; reset(); }
          });
          M4.button(M4.el('div', { class: 'm4-row' }, root), 'Run 30 steps', function () {
            if (done) return;
            var pts = simulate(a, b, x0, y0, eta, beta, n, 0);
            var diverged = pts.length <= n;
            var last = pts[pts.length - 1];
            var L = loss(a, b, last[0], last[1]);
            var e = eta, be = beta;
            player.play([{ pts: clip(pts, 5, 2), path: path, ball: ball }], 70, function (k) {
              var q = pts[Math.min(k, pts.length - 1)];
              rS.textContent = 'step ' + k;
              rL.textContent = 'loss = ' + fmtLoss(loss(a, b, q[0], q[1]));
            }, function () {
              if (!diverged && L < 0.01) {
                done = true;
                target.el.setAttribute('fill', GREEN);
                target.el.setAttribute('opacity', '0.55');
                ctx.note('Final loss ' + fmtLoss(L) + ' after 30 steps with \\(\\eta=' + e.toFixed(2) + '\\), \\(\\beta=' + be.toFixed(2) + '\\). ' + (e >= 0.08 ? 'Momentum made a learning rate usable that plain gradient descent could not tolerate, and added speed along the valley floor.' : 'The accumulated velocity added the speed along the valley floor that plain gradient descent lacks at this learning rate.'));
                ctx.solved();
              } else if (diverged || L > 20.5) {
                ctx.wrong('The run is unstable: the loss grew to ' + fmtLoss(L) + '. The condition η < 2(1+β)/25 is violated or nearly so. Reduce η or raise β slightly.');
              } else if (be === 0) {
                ctx.wrong('Final loss ' + fmtLoss(L) + '. Without momentum (β = 0) no stable learning rate is fast enough along x in 30 steps.');
              } else if (be >= 0.75) {
                ctx.wrong('Final loss ' + fmtLoss(L) + '. With so little friction the ball overshoots and is still oscillating around the minimum after 30 steps. Lower β.');
              } else {
                ctx.wrong('Final loss ' + fmtLoss(L) + ', not yet below 0.01. Progress along the flat x direction is still too slow. A larger η is stable once β is moderate.');
              }
            });
          }, { primary: true });
        }
      },
      // 12
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>A minibatch gradient is the average of \\(B\\) per-example gradients. It equals the true gradient on average, and its random deviation shrinks like \\(\\sigma/\\sqrt{B}\\), so halving the noise costs four times the batch size.</li>' +
          '<li>SGD follows a noisy path that descends on average and, with a fixed learning rate, ends up jittering around the minimum in a region whose size grows with \\(\\eta\\) and shrinks with \\(B\\).</li>' +
          '<li>Momentum, \\(v\\leftarrow\\beta v-\\eta g\\) and \\(w\\leftarrow w+v\\), behaves like a heavy ball: consistent gradient directions accumulate, alternating ones cancel, which speeds up travel along narrow valleys and smooths minibatch noise.</li>' +
          '</ul>'
      }
    ]
  });
})();
