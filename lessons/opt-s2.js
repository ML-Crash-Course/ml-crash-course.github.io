(function () {
  'use strict';

  var C = M4.colors;

  function chip(parent, label, color) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    var l = M4.el('span', { text: label + ' ' }, r);
    l.style.fontWeight = '700';
    if (color) l.style.color = color;
    var v = M4.el('span', { text: '' }, r);
    return function (t) { v.textContent = t; };
  }
  function f(v, d) { return M4.fmt(v, d == null ? 2 : d); }
  function row(el) { return M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el); }
  function ctl(el) { return M4.el('div', { style: 'max-width:420px;margin:8px auto 0' }, el); }

  /* ---------- weight decay on a quadratic loss ---------- */
  var A = [3, 0.5], WSTAR = [2.5, 2.5];
  function wl(lam) { return [A[0] * WSTAR[0] / (A[0] + lam), A[1] * WSTAR[1] / (A[1] + lam)]; }
  function ellipse(c) {
    var pts = [], r1 = Math.sqrt(2 * c / A[0]), r2 = Math.sqrt(2 * c / A[1]);
    for (var t = 0; t <= 72; t++) { var a = 2 * Math.PI * t / 72; pts.push([WSTAR[0] + r1 * Math.cos(a), WSTAR[1] + r2 * Math.sin(a)]); }
    return pts;
  }
  function circle(r) {
    var pts = [];
    for (var t = 0; t <= 72; t++) { var a = 2 * Math.PI * t / 72; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    return pts;
  }

  function decayScene(el, o) {
    o = o || {};
    var P = M4.plane(el, { xmin: -0.6, xmax: 3.6, ymin: -0.6, ymax: 3.6, width: 440, height: 440 });
    [0.15, 0.6, 1.4].forEach(function (c) { P.path(ellipse(c), { stroke: C.muted, width: 1, closed: true, opacity: 0.6, layer: 'bg' }); });
    var ring = P.path([], { stroke: C.green, width: 1.6, dash: '5 5', closed: true });
    var lev = P.path([], { stroke: C.ink, width: 1.8, closed: true });
    var trail = [];
    for (var k = 0; k <= 80; k++) trail.push(wl(Math.pow(k / 80, 2) * 40));
    P.path(trail, { stroke: C.green, width: 1.5, opacity: 0.45 });
    P.point(WSTAR[0], WSTAR[1], { color: C.ink, r: 5 });
    P.text(WSTAR[0] + 0.12, WSTAR[1] + 0.2, 'w*', { size: 15, anchor: 'start' });
    var dot = P.point(0, 0, { color: C.green, r: 7 });
    P.text(3.5, -0.38, 'w₁', { size: 15, fill: C.muted, anchor: 'end' });
    P.text(-0.45, 3.45, 'w₂', { size: 15, fill: C.muted, anchor: 'start' });
    var r1 = row(el);
    var c1 = chip(r1, 'w₁ / w₁*', C.green), c2 = chip(r1, 'w₂ / w₂*', C.green);
    var lam = o.lam == null ? 0.8 : o.lam;
    function paint() {
      var w = wl(lam);
      dot.set(w[0], w[1]);
      ring.set(lam > 0 ? circle(Math.hypot(w[0], w[1])) : []);
      var lc = 0.5 * (A[0] * Math.pow(w[0] - WSTAR[0], 2) + A[1] * Math.pow(w[1] - WSTAR[1], 2));
      lev.set(lc > 1e-6 ? ellipse(lc) : []);
      c1(f(w[0] / WSTAR[0])); c2(f(w[1] / WSTAR[1]));
      if (o.onChange) o.onChange(lam, w);
    }
    M4.slider(ctl(el), { min: 0, max: 4, step: 0.01, value: lam, label: 'weight decay λ', onInput: function (v) { lam = v; paint(); } });
    paint();
  }

  /* ---------- gradient clipping ---------- */
  function clipScene(el) {
    var P = M4.plane(el, { xmin: -3.3, xmax: 3.3, ymin: -3.3, ymax: 3.3, width: 420, height: 420 });
    var ring = P.path([], { stroke: C.orange, width: 1.6, dash: '6 5', closed: true, layer: 'bg' });
    var raw = P.arrow(0, 0, 0, 0, { stroke: C.muted, width: 3, dash: '7 6' });
    var cl = P.arrow(0, 0, 0, 0, { stroke: C.blue, width: 4 });
    var g = [2.4, 1.6], c = 1.5;
    var r1 = row(el);
    var cN = chip(r1, '‖g‖', C.ink), cS = chip(r1, 'scale', C.orange), cC = chip(r1, '‖clipped g‖', C.blue);
    function paint() {
      var n = Math.hypot(g[0], g[1]), s = Math.min(1, c / Math.max(n, 1e-9));
      ring.set(circle(c));
      raw.set(0, 0, g[0], g[1]);
      raw.el.style.opacity = s < 1 ? 1 : 0;
      cl.set(0, 0, s * g[0], s * g[1]);
      cN(f(n)); cS(f(s)); cC(f(s * n));
    }
    P.handle(g[0], g[1], { color: C.ink, onDrag: function (x, y) { g = [x, y]; paint(); } });
    M4.slider(ctl(el), { min: 0.3, max: 3, step: 0.1, value: c, label: 'threshold c', onInput: function (v) { c = v; paint(); } });
    paint();
  }

  /* ---------- warmup and cosine decay ---------- */
  var T = 1000;
  function sched(t, W, fl) {
    if (W > 0 && t < W) return t / W;
    var u = W >= T ? 1 : (t - W) / (T - W);
    return fl + 0.5 * (1 - fl) * (1 + Math.cos(Math.PI * u));
  }
  function schedScene(el) {
    var P = M4.plane(el, { xmin: -70, xmax: 1060, ymin: -0.12, ymax: 1.12, width: 560, height: 300 });
    var W = 100, fl = 0.1, t = 500;
    var curve = P.fn(function () { return 0; }, { stroke: C.blue, width: 3, xmin: 0, xmax: T, samples: 300 });
    var vline = P.line(0, 0, 0, 0, { stroke: C.orange, width: 1.5, dash: '5 5' });
    var dot = P.point(0, 0, { color: C.orange, r: 6 });
    P.text(1050, 0.06, 'step t', { size: 14, fill: C.muted, anchor: 'end' });
    P.text(20, 1.07, 'η / ηₘₐₓ', { size: 14, fill: C.muted, anchor: 'start' });
    var r1 = row(el);
    var cT = chip(r1, 't', C.orange), cE = chip(r1, 'η / ηₘₐₓ', C.orange);
    function paint() {
      curve.set(function (x) { return sched(x, W, fl); });
      var v = sched(t, W, fl);
      vline.set(t, 0, t, v); dot.set(t, v);
      cT(String(t)); cE(f(v, 3));
    }
    var c = ctl(el);
    M4.slider(c, { min: 0, max: 400, step: 10, value: W, label: 'warmup steps', onInput: function (v) { W = v; paint(); } });
    M4.slider(c, { min: 0, max: 0.5, step: 0.05, value: fl, label: 'final fraction', onInput: function (v) { fl = v; paint(); } });
    M4.slider(c, { min: 0, max: T, step: 10, value: t, label: 'step t', onInput: function (v) { t = v; paint(); } });
    paint();
  }

  /* ---------- practice ---------- */
  function gen() {
    var k = M4.rand(0, 3);
    if (k === 0) {
      var eta = M4.pick([0.1, 0.01]), lam = M4.pick([0.1, 0.5, 1]), s = eta === 0.1 ? M4.pick([5, 10, 20]) : M4.pick([50, 100]);
      var fac = Math.pow(1 - eta * lam, s);
      return {
        q: 'Plain gradient descent with learning rate \\(\\eta = ' + eta + '\\) and weight decay \\(\\lambda = ' + lam + '\\) runs on a weight whose loss gradient is zero. By which factor does the weight shrink in \\(' + s + '\\) steps?',
        answer: fac, tol: 0.002,
        hint: 'Each step multiplies the weight by \\(1 - \\eta\\lambda\\).',
        explain: '\\((1 - ' + eta + ' \\cdot ' + lam + ')^{' + s + '} = ' + M4.fmt(1 - eta * lam, 3) + '^{' + s + '} \\approx ' + M4.fmt(fac, 3) + '\\).'
      };
    }
    if (k === 1) {
      var tr = M4.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10]]), c = M4.pick([1, 2, 5]);
      while (c >= tr[2]) c = 1;
      var comp = M4.rand(0, 1), val = tr[comp] * c / tr[2];
      return {
        q: 'The gradient is \\(\\mathbf g = (' + tr[0] + ', ' + tr[1] + ')\\). After clipping its norm to \\(c = ' + c + '\\), what is the ' + (comp ? 'second' : 'first') + ' component?',
        answer: val,
        hint: 'Compute \\(\\|\\mathbf g\\|\\) first, then scale the whole vector by \\(c / \\|\\mathbf g\\|\\).',
        explain: '\\(\\|\\mathbf g\\| = ' + tr[2] + '\\), so every component is multiplied by \\(' + c + '/' + tr[2] + '\\): \\(' + tr[comp] + ' \\cdot ' + c + '/' + tr[2] + ' = ' + M4.fmt(val, 3) + '\\).'
      };
    }
    if (k === 2) {
      var a = M4.pick([1, 2, 3, 4]), ws = M4.pick([1, 2, 3]), l = M4.pick([1, 2, 4]);
      var w = a * ws / (a + l);
      return {
        q: 'Along one eigenvector the loss has curvature \\(a = ' + a + '\\) and its minimum at \\(w^* = ' + ws + '\\). Adding \\(\\tfrac{\\lambda}{2} w^2\\) with \\(\\lambda = ' + l + '\\), where is the new minimum?',
        answer: w,
        hint: 'Set the derivative \\(a (w - w^*) + \\lambda w\\) to zero.',
        explain: '\\(w = \\dfrac{a\\, w^*}{a + \\lambda} = \\dfrac{' + a + ' \\cdot ' + ws + '}{' + (a + l) + '} = ' + M4.fmt(w, 3) + '\\).'
      };
    }
    var Wm = M4.pick([100, 200]), Tt = 1000, flo = 0, tt, kind = M4.rand(0, 1), ans;
    if (kind === 0) {
      tt = M4.pick([25, 50, 75]) * Wm / 100;
      ans = tt / Wm;
      return {
        q: 'Linear warmup over the first \\(' + Wm + '\\) steps leads to a peak rate \\(\\eta_{\\max}\\). What is \\(\\eta_t / \\eta_{\\max}\\) at step \\(t = ' + tt + '\\)?',
        answer: ans,
        explain: 'During warmup \\(\\eta_t = \\eta_{\\max} \\cdot t / ' + Wm + '\\), so the ratio is \\(' + tt + '/' + Wm + ' = ' + M4.fmt(ans, 3) + '\\).'
      };
    }
    var frac = M4.pick([0.25, 0.5, 0.75]);
    tt = Wm + frac * (Tt - Wm);
    ans = 0.5 * (1 + Math.cos(Math.PI * frac));
    return {
      q: 'After \\(' + Wm + '\\) warmup steps, the rate follows a cosine from \\(\\eta_{\\max}\\) down to \\(0\\) at step \\(' + Tt + '\\). What is \\(\\eta_t / \\eta_{\\max}\\) at step \\(t = ' + tt + '\\)?',
      answer: ans, tol: 0.002,
      hint: 'The cosine phase is \\(u = (t - ' + Wm + ') / (' + Tt + ' - ' + Wm + ')\\), and the ratio is \\(\\tfrac12 (1 + \\cos \\pi u)\\).',
      explain: '\\(u = ' + frac + '\\), so the ratio is \\(\\tfrac12 (1 + \\cos(' + frac + '\\pi)) = ' + M4.fmt(ans, 3) + '\\).'
    };
  }

  M4.lesson({
    id: 'opt-s2',
    module: 'optimizers',
    title: 'Weight decay, clipping and schedules',
    summary: 'Three additions that almost every training run uses: shrinking the weights, bounding the size of a step, and changing the learning rate over time.',
    minutes: 16,
    steps: [
      {
        kind: 'text',
        title: 'Weight decay',
        html: '<p>Weight decay adds a penalty on the size of the weights to the loss:</p>' +
          '\\[ \\tilde L(\\mathbf w) = L(\\mathbf w) + \\frac{\\lambda}{2} \\|\\mathbf w\\|^2, \\qquad \\nabla \\tilde L = \\nabla L + \\lambda \\mathbf w. \\]' +
          '<p>A gradient descent step then becomes</p>' +
          '\\[ \\mathbf w \\leftarrow (1 - \\eta\\lambda)\\, \\mathbf w - \\eta \\nabla L(\\mathbf w). \\]' +
          '<p>Before following the loss gradient, every weight is multiplied by a factor slightly below one. Weights that the loss does not need drift towards zero, which limits how far the model can bend itself to fit noise in the training data.</p>'
      },
      {
        kind: 'explore',
        title: 'The shifted minimum',
        html: '<p>The ellipses are level sets of a loss with minimum \\(\\mathbf w^*\\), steep along \\(w_1\\) (curvature \\(3\\)) and flat along \\(w_2\\) (curvature \\(0.5\\)). The green point is the minimum of the penalized loss \\(\\tilde L\\), and the faint green curve is its path as \\(\\lambda\\) grows. Increase \\(\\lambda\\) and compare how much of each coordinate survives.</p>',
        mount: function (el) {
          decayScene(el);
          M4.el('p', { class: 'm4-cap', html: 'The dark ellipse is the level set of \\(L\\) through the green point, the dashed circle the level set of \\(\\|\\mathbf w\\|\\). At the penalized minimum the two touch.' }, el);
          M4.typeset(el);
        }
      },
      {
        kind: 'text',
        title: 'Shrinking along flat directions',
        html: '<p>Along an eigenvector of the Hessian with curvature \\(a\\), the loss near its minimum is \\(\\tfrac{a}{2}(w - w^*)^2\\). Adding the penalty and setting the derivative to zero gives</p>' +
          '\\[ w = \\frac{a}{a + \\lambda}\\, w^*. \\]' +
          '<p>Where the loss is steep (\\(a \\gg \\lambda\\)) the weight barely moves. Where the loss is flat (\\(a \\ll \\lambda\\)) the weight is pulled almost to zero. Weight decay therefore removes the directions that the data constrains least.</p>'
      },
      {
        kind: 'exercise',
        title: 'Halving a coordinate',
        html: '<p>Choose \\(\\lambda\\) so that \\(w_2\\) keeps half of its unpenalized value \\(w_2^*\\).</p>',
        hint: 'Solve \\(\\frac{a}{a + \\lambda} = \\frac12\\) with \\(a = 0.5\\).',
        mount: function (el, ctx) {
          var done = false;
          decayScene(el, {
            lam: 0, onChange: function (lam, w) {
              if (done || Math.abs(w[1] / WSTAR[1] - 0.5) > 0.006) return;
              done = true;
              ctx.solved('\\(\\lambda = ' + lam.toFixed(2) + '\\) equals the curvature \\(0.5\\). At the same \\(\\lambda\\), \\(w_1\\) keeps \\(3/3.5 \\approx 86\\%\\) of its value.');
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Weight decay in Adam',
        html: '<p>With plain gradient descent, the penalty term \\(\\lambda \\mathbf w\\) and the factor \\(1 - \\eta\\lambda\\) are the same thing. With Adam they differ. If \\(\\lambda \\mathbf w\\) is added to the gradient, it passes through the division by \\(\\sqrt{\\hat v} + \\epsilon\\) like every other part of the gradient. Weights with a large gradient history then receive a small decay, and weights with small gradients a large one.</p>' +
          '<p><b>AdamW</b> applies the decay outside the adaptive step:</p>' +
          '\\[ \\mathbf w \\leftarrow \\mathbf w - \\eta \\left( \\frac{\\hat{\\mathbf m}}{\\sqrt{\\hat{\\mathbf v}} + \\epsilon} + \\lambda \\mathbf w \\right). \\]' +
          '<p>Every weight now shrinks by the same factor \\(1 - \\eta\\lambda\\) per step. AdamW is the standard optimizer for large language models, which close the course, with \\(\\lambda\\) typically between \\(0.01\\) and \\(0.1\\).</p>'
      },
      {
        kind: 'exercise',
        title: 'Adam with an L2 penalty',
        html: '<p>A weight decay term \\(\\lambda \\mathbf w\\) is added to the gradient before the Adam update, without the AdamW correction. Which weights are regularized least?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: [
              'Weights whose gradients have been large, since their \\(\\sqrt{\\hat v}\\) is large',
              'Weights whose gradients have been small, since their \\(\\sqrt{\\hat v}\\) is small',
              'All weights are regularized equally',
              'Weights close to zero'
            ],
            correct: 0,
            onCorrect: function () { ctx.solved('The decay term is divided by the same \\(\\sqrt{\\hat v}\\) as the gradient, so a large gradient history weakens it.'); },
            onWrong: function () { ctx.wrong(); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Gradient clipping',
        html: '<p>A single unusual batch can produce a gradient many times larger than usual, for example in a recurrent network or early in the training of a transformer. One such step can undo hours of progress. <b>Clipping by norm</b> bounds the length of the gradient by a threshold \\(c\\):</p>' +
          '\\[ \\mathbf g \\leftarrow \\mathbf g \\cdot \\min\\!\\left(1, \\frac{c}{\\|\\mathbf g\\|}\\right). \\]' +
          '<p>Short gradients pass unchanged. Long gradients keep their direction and are scaled down to length \\(c\\). The norm is usually taken over all parameters of the model together, and \\(c = 1\\) is a common choice.</p>'
      },
      {
        kind: 'explore',
        title: 'Clipping practice',
        html: '<p>Drag the tip of the gradient \\(\\mathbf g\\) and change the threshold \\(c\\). The blue arrow is the clipped gradient, and the dashed circle has radius \\(c\\).</p>',
        mount: function (el) { clipScene(el); }
      },
      {
        kind: 'text',
        title: 'Warmup and cosine decay',
        html: '<p>Most large models train with a schedule in two phases. During <b>warmup</b> the learning rate rises linearly from zero to its peak \\(\\eta_{\\max}\\) over the first \\(W\\) steps. At the start the weights are random, the gradients are large and Adam\'s estimate \\(\\hat v\\) rests on very few batches, so full-size steps are unreliable.</p>' +
          '<p>Afterwards a <b>cosine decay</b> lowers the rate to a final value \\(\\eta_{\\min}\\) at step \\(T\\):</p>' +
          '\\[ \\eta_t = \\eta_{\\min} + \\tfrac12 (\\eta_{\\max} - \\eta_{\\min}) \\left(1 + \\cos \\frac{\\pi (t - W)}{T - W}\\right). \\]' +
          '<p>The rate stays near its peak for a long time, then falls quickly, then flattens out near \\(\\eta_{\\min}\\). The late, small steps bring the iterates below the noise floor of SGD.</p>'
      },
      {
        kind: 'explore',
        title: 'Schedule design',
        html: '<p>The curve shows \\(\\eta_t / \\eta_{\\max}\\) over \\(T = 1000\\) steps. Change the length of the warmup and the final fraction \\(\\eta_{\\min}/\\eta_{\\max}\\), and move the marker along the steps.</p>',
        mount: function (el) { schedScene(el); }
      },
      {
        kind: 'exercise',
        title: 'Decay, clipping and schedules',
        html: '<p>Round to three decimals where needed.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: gen }); }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>Weight decay multiplies every weight by \\(1 - \\eta\\lambda\\) per step. It shrinks the directions that the loss barely constrains and leaves the steep ones almost untouched.</li>' +
          '<li>In Adam, an L2 penalty added to the gradient gets divided by the adaptive scale. AdamW applies the decay separately, so every weight shrinks at the same rate.</li>' +
          '<li>Clipping by norm caps the length of a gradient and keeps its direction. Warmup protects the first steps, and cosine decay ends training with small steps below the noise floor.</li></ul>'
      }
    ]
  });
})();
