(function () {
  'use strict';

  var C = M4.colors;
  var P = 'optimisation-s3-';

  function injectCss() {
    if (document.getElementById(P + 'style')) return;
    var s = document.createElement('style');
    s.id = P + 'style';
    s.textContent =
      '.' + P + 'bar{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;margin:14px 0}' +
      '.' + P + 'wrap{display:flex;flex-direction:column;align-items:stretch;gap:6px}' +
      '.' + P + 'rows{display:flex;flex-direction:column;gap:12px;margin:16px 0}' +
      '.' + P + 'rowitem{display:flex;align-items:center;gap:16px;background:#fff;border:2px solid #e6e4dd;border-radius:16px;padding:12px 16px}' +
      '.' + P + 'rowitem .m4-slot{min-width:120px;min-height:52px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}' +
      '.' + P + 'rowlabel{font-size:17px;line-height:1.35;flex:1}' +
      '.' + P + 'tray{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;min-height:56px;margin:10px 0}' +
      '.' + P + 'tok{font-size:18px;font-weight:700;padding:10px 16px;font-variant-numeric:tabular-nums}' +
      '.' + P + 'done{border-color:#16b56b !important;background:#eafaf2 !important}' +
      '.' + P + 'stage{font-weight:700}' +
      '.' + P + 'stage.on{background:#f0473e;color:#fff;border-color:#f0473e}';
    document.head.appendChild(s);
  }

  function fmt(v, d) {
    if (!isFinite(v)) return '∞';
    var s = v.toFixed(d === undefined ? 2 : d);
    if (parseFloat(s) === 0) s = (0).toFixed(d === undefined ? 2 : d);
    return s.replace('-', '−');
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function readout(parent, text) {
    return M4.el('span', { class: 'm4-readout', text: text || '' }, parent);
  }
  function bar(parent) { return M4.el('div', { class: P + 'bar' }, parent); }

  /* ---------- shared 1-D descent widget on L(w) = w^2 ---------- */
  function descent(el, ctx, opt) {
    injectCss();
    var W0 = 4, eta = opt.eta0, ws = [W0], busy = false, raf = 0, dead = false;
    var wrap = M4.el('div', { class: P + 'wrap' }, el);
    var p = M4.plane(wrap, { xmin: -5, xmax: 5, ymin: -2, ymax: 18, width: 640, height: 420 });
    p.fn(function (x) { return x * x; }, { stroke: C.ink, width: 3 });
    p.text(4.6, 0.9, 'w', { fill: C.muted, size: 17, weight: 700 });
    p.text(0.9, 17, 'L(w)', { fill: C.muted, size: 17, weight: 700 });
    var ring = p.point(0, 0, { r: 13, fill: C.green });
    ring.el.setAttribute('fill-opacity', '0.18');
    ring.el.setAttribute('stroke', C.green);
    ring.el.setAttribute('stroke-width', '2');
    var start = p.point(W0, W0 * W0, { r: 6, fill: C.muted });
    var traj = p.path([[W0, W0 * W0]], { stroke: C.red, width: 3 });
    var ball = p.point(W0, W0 * W0, { r: 10, fill: C.red });
    void start;

    function pt(w) { return [clamp(w, -5.2, 5.2), clamp(w * w, -2, 18.6)]; }

    var rb = bar(wrap);
    var rT = readout(rb), rW = readout(rb), rL = readout(rb), rM = opt.exercise ? null : readout(rb);
    function show() {
      var w = ws[ws.length - 1];
      rT.textContent = 'step t = ' + (ws.length - 1);
      rW.textContent = 'w = ' + fmt(w, 3);
      rL.textContent = 'L = ' + fmt(w * w, 3);
      if (rM) rM.textContent = 'multiplier 1 − 2η = ' + fmt(1 - 2 * eta, 2);
    }
    function reset() {
      cancelAnimationFrame(raf); busy = false;
      ws = [W0];
      traj.set([pt(W0)]); ball.set(W0, W0 * W0);
      ring.el.setAttribute('fill-opacity', '0.18');
      show();
    }
    function stepOnce(done) {
      var a = ws[ws.length - 1], b = a * (1 - 2 * eta), t0 = null;
      if (Math.abs(b) < 1e-9) b = 0;
      var base = ws.map(pt);
      busy = true;
      function frame(ts) {
        if (dead) return;
        if (t0 === null) t0 = ts;
        var u = clamp((ts - t0) / 380, 0, 1);
        var e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
        var x = a + (b - a) * e, y = a * a + (b * b - a * a) * e;
        var q = [clamp(x, -5.2, 5.2), clamp(y, -2, 18.6)];
        ball.set(q[0], q[1]);
        traj.set(base.concat([q]));
        if (u < 1) { raf = requestAnimationFrame(frame); return; }
        ws.push(b); busy = false; show();
        if (Math.abs(b) < 0.02) ring.el.setAttribute('fill-opacity', '0.8');
        done(b);
      }
      raf = requestAnimationFrame(frame);
    }

    M4.slider(wrap, {
      min: opt.min, max: opt.max, step: opt.step, value: eta, label: 'learning rate η',
      format: function (v) { return Number(v).toFixed(2); },
      onInput: function (v) { eta = Math.round(Number(v) * 1000) / 1000; reset(); if (opt.onEta) opt.onEta(eta); }
    });
    var bb = bar(wrap);
    if (opt.exercise) {
      M4.button(bb, 'Take one step', function () {
        if (busy) return;
        reset();
        stepOnce(function (b) { opt.onOneStep(eta, b); });
      }, { primary: true });
    } else {
      M4.button(bb, 'Step', function () {
        if (busy) return;
        stepOnce(function (b) { describe(b); });
      }, { primary: true });
      M4.button(bb, 'Run 12 steps', function () {
        if (busy) return;
        reset();
        var n = 0;
        (function go() {
          stepOnce(function (b) {
            n += 1;
            if (n < 12 && Math.abs(b) < 40 && Math.abs(b) > 1e-4) go(); else describe(b);
          });
        })();
      });
      M4.button(bb, 'Reset', function () { reset(); ctx.note(''); });
    }
    function describe(b) {
      var m = 1 - 2 * eta, n = ws.length - 1, msg;
      if (Math.abs(m) < 1e-9) msg = 'The multiplier is 0: a single step lands on the minimum.';
      else if (m > 0) msg = 'Each step keeps the sign of \\(w\\) and multiplies it by ' + fmt(m, 2) + '. After ' + n + ' steps \\(w = ' + b.toFixed(3) + '\\).';
      else if (m > -1 + 1e-9) msg = 'Each step jumps across the minimum (multiplier ' + fmt(m, 2) + '), but the jumps shrink. After ' + n + ' steps \\(w = ' + b.toFixed(3) + '\\).';
      else if (Math.abs(m + 1) < 1e-9) msg = 'The multiplier is −1: the point jumps between \\(w = 4\\) and \\(w = -4\\) and the loss never changes.';
      else msg = 'The multiplier ' + fmt(m, 2) + ' has magnitude above 1: every step lands farther from the minimum than the last.';
      ctx.note(msg);
    }
    ctx.onCleanup(function () { dead = true; cancelAnimationFrame(raf); });
    reset();
  }

  /* ---------- steps ---------- */
  var steps = [];

  steps.push({
    kind: 'text',
    title: 'Learning rate and stability',
    html:
      '<p>Gradient descent updates a parameter \\(w\\) by the rule \\(w \\leftarrow w - \\eta\\, L\'(w)\\), where \\(L\\) is the loss, \\(L\'(w)\\) is its slope at \\(w\\), and \\(\\eta\\) (eta) is a positive number called the <b>learning rate</b>.</p>' +
      '<p>The aim is to predict, for a quadratic loss, whether a given learning rate makes descent crawl, converge quickly, oscillate, or diverge, and compute the exact range of learning rates that is stable.</p>'
  });

  steps.push({
    kind: 'explore',
    title: 'Three kinds of behaviour',
    html:
      '<p>The loss here is \\(L(w) = w^2\\), with its minimum at \\(w = 0\\) and slope \\(L\'(w) = 2w\\). Descent starts at \\(w = 4\\). Set the learning rate \\(\\eta\\), then step or run.</p>' +
      '<p>Compare \\(\\eta = 0.04\\), \\(\\eta = 0.40\\), \\(\\eta = 0.90\\) and \\(\\eta = 1.06\\).</p>',
    mount: function (el, ctx) {
      descent(el, ctx, { eta0: 0.04, min: 0.02, max: 1.1, step: 0.02 });
    }
  });

  steps.push({
    kind: 'text',
    title: 'The multiplier',
    html:
      '<p>For \\(L(w) = w^2\\) the update can be simplified. Writing \\(w_t\\) for the parameter after \\(t\\) steps,</p>' +
      '\\[ w_{t+1} = w_t - \\eta \\cdot 2 w_t = (1 - 2\\eta)\\, w_t . \\]' +
      '<p>Every step multiplies \\(w\\) by the same number \\(m = 1 - 2\\eta\\), so \\(w_t = m^t\\, w_0\\). The whole behaviour of descent on this loss is contained in \\(m\\): its sign decides whether the iterates cross the minimum, and its magnitude \\(|m|\\) decides whether they shrink or grow.</p>'
  });

  steps.push({
    kind: 'exercise',
    title: 'The one step learning rate',
    html:
      '<p>Descent on \\(L(w) = w^2\\) starts at \\(w_0 = 4\\). Choose the learning rate \\(\\eta\\) for which a single step lands on the minimum \\(w = 0\\), then take the step.</p>',
    hint: 'One step gives \\(w_1 = (1 - 2\\eta)\\, w_0\\). This is zero when the multiplier \\(1 - 2\\eta\\) is zero.',
    mount: function (el, ctx) {
      descent(el, ctx, {
        eta0: 0.15, min: 0.05, max: 1, step: 0.05, exercise: true,
        onEta: function () { ctx.note(''); },
        onOneStep: function (eta, b) {
          if (Math.abs(b) < 1e-6) {
            ctx.note('With \\(\\eta = 0.5\\) the multiplier is \\(1 - 2 \\cdot 0.5 = 0\\), so \\(w_1 = 0\\).');
            ctx.solved();
          } else {
            var m = 1 - 2 * eta;
            ctx.wrong('With η = ' + eta.toFixed(2) + ' the multiplier is ' + fmt(m, 2) + ', so the step lands at w = ' + fmt(b, 2) +
              (b > 0 ? ', short of the minimum.' : ', beyond the minimum.'));
          }
        }
      });
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'The next iterate',
    html:
      '<p>The grey point marks \\(w_0 = 4\\) on \\(L(w) = w^2\\), where the slope is \\(L\'(4) = 8\\). Drag the red point along the curve to the position \\(w_1 = w_0 - \\eta\\, L\'(w_0)\\) reached after one step, then check. There are two rounds with different learning rates.</p>',
    hint: 'The step subtracts \\(\\eta \\cdot 8\\) from 4. For \\(\\eta = 0.25\\) that is 2. For \\(\\eta = 0.75\\) it is 6, which carries the point past the minimum.',
    mount: function (el, ctx) {
      injectCss();
      var rounds = [{ eta: 0.25, target: 2 }, { eta: 0.75, target: -2 }];
      var stage = 0, timer = 0, finished = false;
      var wrap = M4.el('div', { class: P + 'wrap' }, el);
      var top = bar(wrap);
      var chips = rounds.map(function (r, i) {
        return M4.el('span', { class: 'm4-chip ' + P + 'stage', text: 'Round ' + (i + 1) + ': η = ' + r.eta.toFixed(2) }, top);
      });
      var p = M4.plane(wrap, { xmin: -5, xmax: 5, ymin: -2, ymax: 18, width: 640, height: 420 });
      p.fn(function (x) { return x * x; }, { stroke: C.ink, width: 3 });
      p.text(4.6, 0.9, 'w', { fill: C.muted, size: 17, weight: 700 });
      p.text(0.9, 17, 'L(w)', { fill: C.muted, size: 17, weight: 700 });
      p.point(4, 16, { r: 8, fill: C.muted });
      p.text(4.05, 17.1, 'w₀', { fill: C.muted, size: 17, weight: 700 });
      var arrow = p.arrow(4, 16, 4, 16, { stroke: C.green, width: 4 });
      arrow.el.style.display = 'none';
      var rb = bar(wrap);
      var rW = readout(rb), rD = readout(rb);
      var h = p.handle(0, 0, {
        color: C.red, r: 13, snap: 0,
        onDrag: function (x) { place(x); },
        onEnd: function (x) { place(x); }
      });
      var cur = 0;
      function place(x) {
        cur = clamp(Math.round(x * 2) / 2, -4, 4);
        h.set(cur, cur * cur);
        rW.textContent = 'w₁ = ' + fmt(cur, 1);
        rD.textContent = 'w₀ − w₁ = ' + fmt(4 - cur, 1);
      }
      function paint() {
        chips.forEach(function (c, i) {
          c.classList.toggle('on', i === stage && !finished);
          c.classList.toggle(P + 'done', i < stage || finished);
        });
      }
      var bb = bar(wrap);
      M4.button(bb, 'Check', function () {
        if (finished) return;
        var r = rounds[stage], stepLen = r.eta * 8;
        if (Math.abs(cur - r.target) < 1e-9) {
          clearTimeout(timer);
          arrow.el.style.display = '';
          arrow.set(4, 16, r.target, r.target * r.target);
          if (stage === 0) {
            ctx.note('Correct: \\(4 - 0.25 \\cdot 8 = 2\\). Next round: \\(\\eta = 0.75\\).');
            stage = 1; paint();
            timer = setTimeout(function () { arrow.el.style.display = 'none'; }, 1400);
          } else {
            finished = true; paint();
            ctx.note('Correct: \\(4 - 0.75 \\cdot 8 = -2\\). The step overshoots the minimum and lands on the other side, closer than before.');
            ctx.solved();
          }
        } else {
          ctx.wrong('The step length is η · L′(4) = ' + r.eta.toFixed(2) + ' · 8 = ' + fmt(stepLen, 0) +
            ', but the point is placed ' + fmt(Math.abs(4 - cur), 1) + ' away from w₀' + (cur > 4 - 1e-9 ? '.' : (4 - cur < stepLen ? ', which is too short.' : ', which is too far.')));
        }
      }, { primary: true });
      ctx.onCleanup(function () { clearTimeout(timer); });
      place(0); paint();
    }
  });

  steps.push({
    kind: 'explore',
    title: 'The iterates over time',
    html:
      '<p>The plot shows \\(w_t = (1 - 2\\eta)^t \\cdot 4\\) against the step number \\(t\\) for the loss \\(L(w) = w^2\\). Move the learning rate slowly from left to right. The sequence changes character at \\(\\eta = 0.5\\) and at \\(\\eta = 1\\).</p>',
    mount: function (el, ctx) {
      injectCss();
      var N = 20, eta = 0.05;
      var wrap = M4.el('div', { class: P + 'wrap' }, el);
      var p = M4.plane(wrap, { xmin: -1, xmax: 21, ymin: -5, ymax: 5, width: 640, height: 400 });
      p.text(20.2, 0.6, 't', { fill: C.muted, size: 17, weight: 700 });
      p.text(0.9, 4.5, 'wₜ', { fill: C.muted, size: 17, weight: 700 });
      var line = p.path([[0, 4]], { stroke: C.red, width: 3 });
      var dots = [];
      for (var i = 0; i <= N; i++) dots.push(p.point(i, 4, { r: 6, fill: C.red }));
      var rb = bar(wrap);
      var rM = readout(rb), rR = readout(rb), rN = readout(rb);
      function update() {
        var m = 1 - 2 * eta, pts = [], w = 4, col;
        if (Math.abs(m) < 1e-9) m = 0;
        var regime;
        if (m > 1e-9) { regime = m > 0.8 ? 'monotone, slow' : 'monotone'; col = m > 0.8 ? C.orange : C.green; }
        else if (m === 0) { regime = 'one step'; col = C.green; }
        else if (m > -1 + 1e-9) { regime = 'oscillating, converging'; col = C.purple; }
        else if (Math.abs(m + 1) < 1e-9) { regime = 'oscillating forever'; col = C.red; }
        else { regime = 'diverging'; col = C.red; }
        for (var t = 0; t <= N; t++) {
          var inside = Math.abs(w) <= 5;
          pts.push([t, clamp(w, -5.1, 5.1)]);
          dots[t].set(t, inside ? w : 0);
          dots[t].el.style.display = inside ? '' : 'none';
          dots[t].el.setAttribute('fill', col);
          w *= m;
        }
        line.set(pts);
        line.el.setAttribute('stroke', col);
        var n = 0, v = 4;
        if (Math.abs(m) >= 1 - 1e-9) n = -1;
        else { while (Math.abs(v) >= 0.01 && n < 100000) { v *= m; n++; } }
        rM.textContent = 'multiplier m = ' + fmt(m, 2);
        rR.textContent = regime;
        rN.textContent = n < 0 ? '|w| < 0.01: never' : '|w| < 0.01 after ' + n + ' steps';
      }
      M4.slider(wrap, {
        min: 0.01, max: 1.1, step: 0.01, value: eta, label: 'learning rate η',
        format: function (v) { return Number(v).toFixed(2); },
        onInput: function (v) { eta = Math.round(Number(v) * 100) / 100; update(); }
      });
      void ctx;
      update();
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'Learning rates and behaviours',
    html:
      '<p>Descent on \\(L(w) = w^2\\) starts at \\(w_0 = 4\\), so that \\(w_t = (1 - 2\\eta)^t \\cdot 4\\). Drag each learning rate onto the description of the sequence it produces.</p>',
    hint: 'Compute the multiplier \\(m = 1 - 2\\eta\\) for each tile: 0.98, 0.4, −0.6 and −1.4. A negative \\(m\\) alternates the sign. \\(|m| > 1\\) grows.',
    mount: function (el, ctx) {
      injectCss();
      var items = [
        { k: 'a', eta: '0.01', m: '0.98', label: 'Stays positive and is still above 3 after 10 steps' },
        { k: 'b', eta: '0.3', m: '0.4', label: 'Stays positive and is below 0.01 after 10 steps' },
        { k: 'c', eta: '0.8', m: '−0.6', label: 'Alternates in sign while shrinking towards 0' },
        { k: 'd', eta: '1.2', m: '−1.4', label: 'Alternates in sign while growing without bound' }
      ];
      var order = [2, 0, 3, 1], placed = 0;
      var tray = M4.el('div', { class: P + 'tray' }, el);
      var tokens = order.map(function (i) {
        var t = M4.el('div', { class: 'm4-token ' + P + 'tok', text: 'η = ' + items[i].eta }, tray);
        t.setAttribute('data-k', items[i].k);
        return t;
      });
      var rows = M4.el('div', { class: P + 'rows' }, el);
      var slots = items.map(function (it) {
        var row = M4.el('div', { class: P + 'rowitem' }, rows);
        var s = M4.el('div', { class: 'm4-slot' }, row);
        s.setAttribute('data-k', it.k);
        M4.el('div', { class: P + 'rowlabel', text: it.label }, row);
        return s;
      });
      function find(k) { for (var i = 0; i < items.length; i++) if (items[i].k === k) return items[i]; return null; }
      M4.dragDrop({
        tokens: tokens, slots: slots,
        onDrop: function (tok, slot) {
          var k = tok.getAttribute('data-k'), it = find(k);
          if (slot.getAttribute('data-done')) return;
          if (k === slot.getAttribute('data-k')) {
            slot.appendChild(tok);
            slot.setAttribute('data-done', '1');
            slot.classList.add('filled');
            slot.parentNode.classList.add(P + 'done');
            tok.style.pointerEvents = 'none';
            tok.classList.add('m4-pop');
            placed += 1;
            ctx.note('\\(\\eta = ' + it.eta + '\\) gives \\(m = ' + it.m.replace('−', '-') + '\\).');
            if (placed === items.length) ctx.solved();
          } else {
            ctx.wrong('η = ' + it.eta + ' gives the multiplier 1 − 2η = ' + it.m + '. ' +
              (it.m.charAt(0) === '−' ? 'A negative multiplier flips the sign at every step' : 'A positive multiplier keeps the sign') +
              ', and its magnitude is ' + (parseFloat(it.m.replace('−', '')) > 1 ? 'above' : 'below') + ' 1.');
          }
        },
        onMiss: function () {}
      });
    }
  });

  steps.push({
    kind: 'text',
    title: 'Stability and curvature',
    html:
      '<p>Consider the general quadratic \\(L(w) = \\tfrac{a}{2} w^2\\) with \\(a > 0\\). The number \\(a\\) is the <b>curvature</b>: the larger it is, the narrower the bowl. The slope is \\(L\'(w) = a w\\), so one step gives \\(w_{t+1} = (1 - \\eta a)\\, w_t\\).</p>' +
      '<p>The iterates shrink exactly when \\(|1 - \\eta a| < 1\\), which is the condition</p>' +
      '\\[ 0 < \\eta < \\frac{2}{a}. \\]' +
      '<p>The fastest choice is \\(\\eta = 1/a\\), and a steeper bowl tolerates only a smaller learning rate. For \\(L(w) = w^2\\) the curvature is \\(a = 2\\), which gives the range \\(0 < \\eta < 1\\) seen so far.</p>'
  });

  steps.push({
    kind: 'exercise',
    title: 'A stability limit',
    html:
      '<p>Let \\(L(w) = 4w^2\\), so that \\(L\'(w) = 8w\\). Gradient descent converges for every learning rate \\(\\eta\\) between 0 and a certain limit, and fails to converge at or above it. Enter that limit.</p>',
    hint: 'Here \\(4w^2 = \\tfrac{a}{2} w^2\\) with \\(a = 8\\). The stable range is \\(0 < \\eta < 2/a\\).',
    mount: function (el, ctx) {
      injectCss();
      var b = bar(el);
      M4.numberInput(b, {
        answer: 0.25, tolerance: 0.001, placeholder: 'e.g. 0.6', label: 'limit for η',
        onCorrect: function () {
          ctx.note('The multiplier is \\(1 - 8\\eta\\). It stays above \\(-1\\) exactly when \\(\\eta < 2/8 = 0.25\\).');
          ctx.solved();
        },
        onWrong: function (v) {
          var x = Number(v), msg;
          if (!isFinite(x)) msg = 'Enter a decimal number.';
          else if (Math.abs(x - 0.125) < 0.001) msg = 'η = 0.125 is the fastest learning rate (multiplier 0), not the largest stable one.';
          else if (x > 0.25) msg = 'At η = ' + x + ' the multiplier 1 − 8η = ' + fmt(1 - 8 * x, 2) + ' has magnitude above 1, so descent already diverges.';
          else msg = 'At η = ' + x + ' the multiplier 1 − 8η = ' + fmt(1 - 8 * x, 2) + ' still has magnitude below 1, so larger learning rates remain stable.';
          ctx.wrong(msg);
        }
      });
    }
  });

  steps.push({
    kind: 'text',
    title: 'The learning rate in machine learning',
    html:
      '<p>A neural network has millions of parameters, and its loss curves much more sharply in some directions than in others. A single learning rate is applied to all of them, so the sharpest direction sets the stability limit while the flattest directions make progress slowly.</p>' +
      '<p>This is why the learning rate is usually the first hyperparameter to be tuned. A training loss that falls very slowly suggests a learning rate that is too small. A loss that jumps up and down, or grows until it becomes <code>NaN</code>, suggests one that is too large. Schedules that start small (warm-up) and decrease later (decay) are common responses to the same trade-off.</p>'
  });

  steps.push({
    kind: 'exercise',
    title: 'One learning rate for two directions',
    html:
      '<p>The loss \\(L(w_1, w_2) = \\tfrac12 (w_1^2 + 4 w_2^2)\\) has curvature 1 along \\(w_1\\) and curvature 4 along \\(w_2\\). One step multiplies \\(w_1\\) by \\(1 - \\eta\\) and \\(w_2\\) by \\(1 - 4\\eta\\). Convergence is only as fast as the slower direction, the one whose multiplier has the larger magnitude.</p>' +
      '<p>Set \\(\\eta\\) so that this larger magnitude is as small as possible, then check.</p>',
    hint: 'Raising \\(\\eta\\) shrinks \\(|1 - \\eta|\\) but, beyond \\(\\eta = 0.25\\), enlarges \\(|1 - 4\\eta|\\). The best value is where the two are equal: \\(1 - \\eta = 4\\eta - 1\\).',
    mount: function (el, ctx) {
      injectCss();
      var N = 12, eta = 0.1, done = false;
      var wrap = M4.el('div', { class: P + 'wrap' }, el);
      var p = M4.plane(wrap, { xmin: -5, xmax: 5, ymin: -3, ymax: 3, width: 640, height: 384 });
      var ox = p.x(0), oy = p.y(0);
      [1, 4, 9, 16, 25].forEach(function (c) {
        var r = Math.sqrt(c);
        M4.svg('ellipse', {
          cx: ox, cy: oy, rx: Math.abs(p.x(r) - ox), ry: Math.abs(oy - p.y(r / 2)),
          fill: 'none', stroke: C.blue, 'stroke-width': 2, 'stroke-opacity': 0.35
        }, p.g);
      });
      p.text(4.6, 0.35, 'w₁', { fill: C.muted, size: 17, weight: 700 });
      p.text(0.45, 2.65, 'w₂', { fill: C.muted, size: 17, weight: 700 });
      var ring = p.point(0, 0, { r: 13, fill: C.green });
      ring.el.setAttribute('fill-opacity', '0.18');
      ring.el.setAttribute('stroke', C.green);
      ring.el.setAttribute('stroke-width', '2');
      var line = p.path([[4, 2]], { stroke: C.red, width: 3 });
      var dots = [];
      for (var i = 0; i <= N; i++) dots.push(p.point(4, 2, { r: i === 0 ? 8 : 5, fill: i === 0 ? C.ink : C.red }));
      var rb = bar(wrap);
      var r1 = readout(rb), r2 = readout(rb), r3 = readout(rb);
      var rb2 = bar(wrap);
      var r4 = readout(rb2);
      function update() {
        var m1 = 1 - eta, m2 = 1 - 4 * eta, a = 4, b = 2, pts = [];
        for (var t = 0; t <= N; t++) {
          var inside = Math.abs(a) <= 5 && Math.abs(b) <= 3;
          pts.push([clamp(a, -5.1, 5.1), clamp(b, -3.1, 3.1)]);
          dots[t].set(inside ? a : 0, inside ? b : 0);
          dots[t].el.style.display = inside ? '' : 'none';
          a *= m1; b *= m2;
        }
        line.set(pts);
        var e1 = 4 * Math.pow(m1, N), e2 = 2 * Math.pow(m2, N);
        r1.textContent = '|1 − η| = ' + fmt(Math.abs(m1), 2);
        r2.textContent = '|1 − 4η| = ' + fmt(Math.abs(m2), 2);
        r3.textContent = 'larger = ' + fmt(Math.max(Math.abs(m1), Math.abs(m2)), 2);
        var loss = 0.5 * (e1 * e1 + 4 * e2 * e2);
        r4.textContent = 'loss after ' + N + ' steps = ' + (loss > 9999 ? loss.toExponential(1).replace('+', '') : fmt(loss, 4));
      }
      M4.slider(wrap, {
        min: 0.02, max: 0.6, step: 0.02, value: eta, label: 'learning rate η',
        format: function (v) { return Number(v).toFixed(2); },
        onInput: function (v) {
          eta = Math.round(Number(v) * 100) / 100; update();
          if (!done) { ctx.note(''); ring.el.setAttribute('fill-opacity', '0.18'); }
        }
      });
      var bb = bar(wrap);
      M4.button(bb, 'Check', function () {
        var a1 = Math.abs(1 - eta), a2 = Math.abs(1 - 4 * eta);
        if (Math.abs(eta - 0.4) < 0.005) {
          done = true;
          ring.el.setAttribute('fill-opacity', '0.8');
          ctx.note('At \\(\\eta = 0.4 = \\tfrac{2}{1 + 4}\\) both multipliers have magnitude 0.6. Any other learning rate makes one of the two directions slower.');
          ctx.solved();
        } else if (eta >= 0.5 - 1e-9) {
          ctx.wrong('At η = ' + eta.toFixed(2) + ' the steep direction w₂ has |1 − 4η| = ' + fmt(a2, 2) + ', which is not below 1: it lies outside the stable range η < 2/4.');
        } else if (a1 > a2) {
          ctx.wrong('At η = ' + eta.toFixed(2) + ' the flat direction w₁ is the slower one (' + fmt(a1, 2) + ' against ' + fmt(a2, 2) + '). A larger learning rate still reduces the larger magnitude.');
        } else {
          ctx.wrong('At η = ' + eta.toFixed(2) + ' the steep direction w₂ is the slower one (' + fmt(a2, 2) + ' against ' + fmt(a1, 2) + '). A smaller learning rate reduces the larger magnitude.');
        }
      }, { primary: true });
      update();
    }
  });

  steps.push({
    kind: 'text',
    title: 'Recap',
    html:
      '<ul>' +
      '<li>On the quadratic \\(L(w) = \\tfrac{a}{2} w^2\\), each gradient step multiplies \\(w\\) by \\(m = 1 - \\eta a\\). The learning rate \\(\\eta\\) controls descent entirely through this multiplier.</li>' +
      '<li>A small \\(\\eta\\) gives \\(m\\) close to 1 and slow progress. \\(\\eta = 1/a\\) reaches the minimum in one step. For \\(1/a < \\eta < 2/a\\) the iterates oscillate while converging. For \\(\\eta \\ge 2/a\\) they do not converge, and for \\(\\eta > 2/a\\) they diverge.</li>' +
      '<li>With several directions of different curvature, the sharpest one sets the stability limit and the flattest one sets the speed, which is why the learning rate must be tuned in machine learning.</li>' +
      '</ul>'
  });

  M4.lesson({
    id: 'optimisation-s3',
    module: 'optimisation',
    title: 'The learning rate',
    summary: 'A small learning rate makes slow progress, while a large one causes oscillation or divergence. For a quadratic loss the range of stable learning rates can be computed.',
    minutes: 10,
    steps: steps
  });
})();
