(function () {
  'use strict';

  var C = M4.colors;
  var COLS = [C.blue, C.orange, C.green, C.purple];
  var NAMES = ['A', 'B', 'C', 'D'];
  var TARGETS = [[0.5, 0.25, 0.15, 0.1], [0.1, 0.4, 0.4, 0.1], [0.25, 0.25, 0.25, 0.25], [0.05, 0.15, 0.3, 0.5], [0.6, 0.05, 0.3, 0.05]];

  function lg(p) { return Math.log(p) / Math.LN2; }
  function H(p) { var h = 0; p.forEach(function (v) { if (v > 0) h -= v * lg(v); }); return h; }
  function CE(p, q) { var h = 0; for (var i = 0; i < p.length; i++) if (p[i] > 0) h -= p[i] * (q[i] > 0 ? lg(q[i]) : -Infinity); return h; }
  function KL(p, q) { return CE(p, q) - H(p); }
  function f3(v) { return isFinite(v) ? v.toFixed(3) : '∞'; }

  function valueBox(parent, label, color) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    var l = M4.el('span', { text: label + ' ' }, r);
    l.style.fontWeight = '700';
    if (color) l.style.color = color;
    var v = M4.el('span', { text: '' }, r);
    return function (t) { v.textContent = t; };
  }

  /* p as grey outlined bars, q as coloured draggable bars, plus a stacked bar H(p) + KL = H(p, q) */
  function klScene(el, o) {
    o = o || {};
    var p = (o.p || TARGETS[0]).slice(), q = (o.q || [0.25, 0.25, 0.25, 0.25]).slice();
    var P = M4.plane(el, { xmin: -0.95, xmax: 3.6, ymin: -0.2, ymax: 1.05, width: 560, height: 300, axes: false, grid: false });
    P.line(-0.5, 0, 3.5, 0, { stroke: C.muted, width: 1.5, layer: 'bg' });
    [0.25, 0.5, 0.75, 1].forEach(function (t) {
      P.line(-0.5, t, 3.5, t, { stroke: C.line, width: 1, layer: 'bg' });
      P.text(-0.55, t, String(t), { size: 13, fill: C.muted, anchor: 'end' });
    });
    var W = 0.17;
    var pb = [], qb = [], hs = [];
    for (var i = 0; i < 4; i++) {
      pb.push(P.path([], { fill: '#d9d4c7', fillOpacity: 0.55, stroke: C.muted, width: 1.5, closed: true }));
      qb.push(P.path([], { fill: COLS[i], fillOpacity: 0.3, stroke: COLS[i], width: 2, closed: true }));
      P.text(i, -0.1, NAMES[i], { size: 17, fill: C.ink });
    }
    var leg = M4.el('p', { class: 'm4-cap' }, el);
    leg.innerHTML = 'Grey bars: the true distribution \\(p\\). Coloured bars: the model \\(q\\), drag their tops.';
    M4.typeset(leg);

    // stacked bar
    var SB = M4.plane(el, { xmin: -0.3, xmax: 4.3, ymin: -0.9, ymax: 1, width: 560, height: 92, axes: false, grid: false });
    var segH = SB.path([], { fill: C.blue, fillOpacity: 0.3, stroke: C.blue, width: 2, closed: true });
    var segK = SB.path([], { fill: C.red, fillOpacity: 0.3, stroke: C.red, width: 2, closed: true });
    var tH = SB.text(0, -0.55, '', { size: 14, fill: C.blue });
    var tK = SB.text(0, -0.55, '', { size: 14, fill: C.red });
    SB.line(0, -0.35, 0, 0.75, { stroke: C.muted, width: 1.5, layer: 'bg' });
    [1, 2, 3, 4].forEach(function (b) {
      SB.line(b, 0.62, b, 0.72, { stroke: C.muted, width: 1, layer: 'bg' });
      SB.text(b, 0.86, b + (b === 1 ? ' bit' : ' bits'), { size: 12, fill: C.muted });
    });

    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:6px' }, el);
    var vH = valueBox(row, 'H(p)', C.blue);
    var vK = valueBox(row, 'KL(p‖q)', C.red);
    var vC = o.reverse ? function () {} : valueBox(row, 'H(p, q)', C.ink);
    var vR = o.reverse ? valueBox(row, 'KL(q‖p)', C.purple) : null;

    function paint() {
      for (var i = 0; i < 4; i++) {
        pb[i].set([[i - 2 * W - 0.02, 0], [i - 0.02, 0], [i - 0.02, p[i]], [i - 2 * W - 0.02, p[i]]]);
        qb[i].set([[i + 0.02, 0], [i + 2 * W + 0.02, 0], [i + 2 * W + 0.02, q[i]], [i + 0.02, q[i]]]);
      }
      var h = H(p), k = KL(p, q), c = h + k, kc = Math.min(k, 4 - h);
      segH.set([[0, 0], [h, 0], [h, 0.6], [0, 0.6]]);
      segK.set(kc > 0.002 ? [[h, 0], [h + kc, 0], [h + kc, 0.6], [h, 0.6]] : []);
      tH.set(h / 2, -0.45, 'H(p)');
      tK.set(h + kc / 2, -0.45, kc > 0.25 ? 'KL' : '');
      vH(f3(h)); vK(f3(k)); vC(f3(c));
      if (vR) vR(f3(KL(q, p)));
      if (o.onChange) o.onChange(k);
    }
    q.forEach(function (v, i) {
      hs.push(P.handle(i + W + 0.02, v, {
        color: COLS[i],
        bounds: { xmin: i + W + 0.02, xmax: i + W + 0.02, ymin: 0.01, ymax: 0.97 },
        snap: 0.005,
        onDrag: function (x, y) {
          var rest = 1 - q[i], k;
          q[i] = y;
          for (k = 0; k < 4; k++) if (k !== i) q[k] = rest > 1e-9 ? q[k] * (1 - y) / rest : (1 - y) / 3;
          for (k = 0; k < 4; k++) if (k !== i) hs[k].set(k + W + 0.02, q[k]);
          paint();
        }
      }));
    });
    paint();
    return {
      target: function (np) { p = np.slice(); paint(); },
      model: function (nq) { q = nq.slice(); q.forEach(function (v, k) { hs[k].set(k + W + 0.02, v); }); paint(); }
    };
  }

  /* ---------- practice ---------- */
  var DY = [[[1, 2], [1, 4], [1, 4]], [[1, 2], [1, 4], [1, 8], [1, 8]], [[1, 4], [1, 4], [1, 4], [1, 4]], [[1, 2], [1, 2]]];
  function frac(f) { return '\\tfrac{' + f[0] + '}{' + f[1] + '}'; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = M4.rand(0, i); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function val(d) { return d.map(function (f) { return f[0] / f[1]; }); }
  function gen() {
    var t = M4.rand(0, 2);
    if (t === 0) {
      var k = M4.rand(1, 5), den = Math.pow(2, k);
      return {
        q: 'The correct class is \\(y\\), and the model assigns it probability \\(q_y = \\tfrac{1}{' + den + '}\\). What is the cross-entropy loss in bits?',
        answer: k,
        explain: 'For a one-hot target the loss is \\(-\\log_2 q_y = ' + k + '\\).'
      };
    }
    var base = M4.pick(DY.slice(0, 2));
    var pd = shuffle(base), qd;
    do { qd = shuffle(base); } while (qd.every(function (f, i) { return f[1] === pd[i][1]; }));
    var p = val(pd), q = val(qd), h = H(p), c = CE(p, q), kl = c - h;
    var dist = '\\(p = (' + pd.map(frac).join(', ') + ')\\) and \\(q = (' + qd.map(frac).join(', ') + ')\\)';
    var terms = pd.map(function (f, i) { return frac(f) + '\\cdot' + Math.round(-lg(q[i])); }).join(' + ');
    if (t === 1) return {
      q: 'For ' + dist + ', what is the cross-entropy \\(H(p, q)\\) in bits?',
      answer: c,
      hint: 'Weight the surprise \\(-\\log_2 q_k\\) of the model by the true probability \\(p_k\\).',
      explain: '\\(H(p, q) = ' + terms + ' = ' + M4.fmt(c, 3) + '\\).'
    };
    return {
      q: 'For ' + dist + ', what is \\(\\mathrm{KL}(p \\,\\|\\, q)\\) in bits?',
      answer: kl,
      hint: 'Compute \\(H(p, q)\\) and \\(H(p)\\), then subtract.',
      explain: '\\(H(p, q) = ' + M4.fmt(c, 3) + '\\) and \\(H(p) = ' + M4.fmt(h, 3) + '\\), so the divergence is \\(' + M4.fmt(kl, 3) + '\\).'
    };
  }

  M4.lesson({
    id: 'info-s2',
    module: 'info',
    title: 'KL divergence',
    summary: 'Cross-entropy is the sum of the entropy of the data and the KL divergence between two distributions. Minimizing the classification loss therefore drives this divergence towards zero.',
    minutes: 19,
    steps: [
      {
        kind: 'text',
        title: 'The cost of a mismatched model',
        html: '<p>Data comes from a distribution \\(p\\), and a model predicts a distribution \\(q\\) over the same outcomes. The <b>cross-entropy</b> is the average surprise the model experiences on real data:</p>' +
          '\\[ H(p, q) = \\sum_k p_k \\log_2 \\frac{1}{q_k}. \\]' +
          '<p>In terms of codes, it is the average length when outcomes drawn from \\(p\\) are encoded with a code built for \\(q\\). A code built for \\(p\\) itself achieves \\(H(p)\\). The extra bits are the <b>Kullback-Leibler divergence</b>:</p>' +
          '\\[ \\mathrm{KL}(p \\,\\|\\, q) = H(p, q) - H(p) = \\sum_k p_k \\log_2 \\frac{p_k}{q_k}. \\]'
      },
      {
        kind: 'explore',
        title: 'The gap between two distributions',
        html: '<p>Drag the coloured bars of the model \\(q\\). The strip under the plot shows the cross-entropy as two pieces: the entropy \\(H(p)\\) in blue, which does not depend on the model, and the divergence in red.</p>',
        mount: function (el) {
          var sc = klScene(el);
          var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el);
          var t = 0;
          M4.button(row, 'New target', function () { t = (t + 1) % TARGETS.length; sc.target(TARGETS[t]); });
          M4.button(row, 'Uniform model', function () { sc.model([0.25, 0.25, 0.25, 0.25]); });
        }
      },
      {
        kind: 'exercise',
        title: 'Matching two distributions',
        html: '<p>Make the divergence smaller than \\(0.01\\) bits.</p>',
        hint: 'The divergence is zero exactly when every coloured bar has the height of the grey bar next to it.',
        mount: function (el, ctx) {
          var done = false;
          klScene(el, {
            p: [0.1, 0.4, 0.4, 0.1], q: [0.55, 0.15, 0.15, 0.15],
            onChange: function (k) { if (!done && k < 0.01) { done = true; ctx.solved('\\(\\mathrm{KL} = ' + k.toFixed(4) + '\\) bits. The model now matches the data.'); } }
          });
        }
      },
      {
        kind: 'text',
        title: 'Properties of the divergence',
        html: '<ul><li><b>Never negative.</b> \\(\\mathrm{KL}(p \\,\\|\\, q) \\ge 0\\) for all \\(p\\) and \\(q\\) (Gibbs\' inequality), so no code beats the one built for the true distribution.</li>' +
          '<li><b>Zero only for a perfect match.</b> The divergence is \\(0\\) exactly when \\(q = p\\).</li>' +
          '<li><b>Not symmetric.</b> In general \\(\\mathrm{KL}(p \\,\\|\\, q) \\ne \\mathrm{KL}(q \\,\\|\\, p)\\), so it is not a distance in the geometric sense.</li></ul>' +
          '<p>Training a classifier minimizes the cross-entropy over the model. Since \\(H(p)\\) does not depend on the model, this is the same as minimizing \\(\\mathrm{KL}(p \\,\\|\\, q)\\). When the target is a single label \\(y\\), the distribution \\(p\\) is one-hot, \\(H(p) = 0\\), and all three quantities reduce to</p>' +
          '\\[ H(p, q) = \\mathrm{KL}(p \\,\\|\\, q) = -\\log q_y. \\]'
      },
      {
        kind: 'explore',
        title: 'Forward and reverse',
        html: '<p>The extra value on the right is the divergence with the arguments swapped. Make one bar of \\(q\\) very small where \\(p\\) is large, then make a bar of \\(q\\) large where \\(p\\) is small, and compare how the two numbers react.</p>',
        mount: function (el) {
          klScene(el, { p: [0.45, 0.45, 0.05, 0.05], q: [0.25, 0.25, 0.25, 0.25], reverse: true });
          var cap = M4.el('p', { class: 'm4-cap' }, el);
          cap.innerHTML = '\\(\\mathrm{KL}(p \\,\\|\\, q)\\) weights by \\(p\\). It explodes when \\(q_k \\to 0\\) on an outcome that occurs, so it forces \\(q\\) to cover all of \\(p\\). \\(\\mathrm{KL}(q \\,\\|\\, p)\\) weights by \\(q\\). It punishes mass placed where \\(p\\) is small and tolerates ignoring part of \\(p\\).';
          M4.typeset(cap);
        }
      },
      {
        kind: 'exercise',
        title: 'Choosing a direction',
        html: '<p>A model \\(q\\) assigns probability \\(0.001\\) to an outcome that has probability \\(0.3\\) under the data. Which divergence becomes large?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['\\(\\mathrm{KL}(p \\,\\|\\, q)\\)', '\\(\\mathrm{KL}(q \\,\\|\\, p)\\)', 'Both equally'],
            correct: 0,
            onWrong: function () { ctx.wrong(); },
            onCorrect: function () { ctx.solved('The term \\(0.3 \\log_2(0.3 / 0.001) \\approx 2.5\\) bits enters \\(\\mathrm{KL}(p \\,\\|\\, q)\\). In the reverse direction the same outcome contributes only \\(0.001 \\log_2(0.001 / 0.3)\\), about \\(-0.008\\).'); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Cross-entropy and divergence',
        html: '<p>All probabilities are powers of \\(\\tfrac12\\), so the logarithms are whole numbers.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: gen }); }
      },
      {
        kind: 'explore',
        title: 'Learning from samples',
        html: '<p>A model that knows nothing about \\(p\\) can count. Draw samples from the grey distribution and let the model \\(q\\) be the observed frequencies. This is the maximum likelihood estimate, and the lower plot tracks its divergence from the truth.</p>' +
          '<p>As long as one outcome has never been seen, its frequency is \\(0\\) and \\(\\mathrm{KL}(p \\,\\|\\, q)\\) is infinite. After that, more data keeps shrinking the gap.</p>',
        mount: function (el) {
          var p = [0.5, 0.25, 0.15, 0.1], counts, n, hist;
          var P = M4.plane(el, { xmin: -0.95, xmax: 3.6, ymin: -0.16, ymax: 0.78, width: 560, height: 260, axes: false, grid: false });
          P.line(-0.5, 0, 3.5, 0, { stroke: C.muted, width: 1.5, layer: 'bg' });
          [0.25, 0.5, 0.75].forEach(function (t) {
            P.line(-0.5, t, 3.5, t, { stroke: C.line, width: 1, layer: 'bg' });
            P.text(-0.55, t, String(t), { size: 13, fill: C.muted, anchor: 'end' });
          });
          var qb = [], cl = [];
          p.forEach(function (v, i) {
            P.path([[i - 0.36, 0], [i, 0], [i, v], [i - 0.36, v]], { fill: '#d9d4c7', fillOpacity: 0.55, stroke: C.muted, width: 1.5, closed: true });
            qb.push(P.path([], { fill: COLS[i], fillOpacity: 0.3, stroke: COLS[i], width: 2, closed: true }));
            cl.push(P.text(i + 0.18, 0, '', { size: 13, fill: COLS[i] }));
            P.text(i, -0.08, NAMES[i], { size: 17, fill: C.ink });
          });
          var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el);
          var vn = valueBox(row, 'samples', C.ink), vk = valueBox(row, 'KL(p || q)', C.red);
          var G = M4.plane(el, { xmin: -0.4, xmax: 4.3, ymin: -0.08, ymax: 0.6, width: 560, height: 190, axes: false, grid: false });
          G.line(0, 0, 4, 0, { stroke: C.muted, width: 1.5, layer: 'bg' });
          G.line(0, 0, 0, 0.58, { stroke: C.muted, width: 1.5, layer: 'bg' });
          [1, 10, 100, 1000, 10000].forEach(function (t, k) { G.text(k, -0.05, String(t), { size: 13, fill: C.muted }); });
          [0.2, 0.4].forEach(function (t) { G.line(0, t, 4, t, { stroke: C.line, width: 1, layer: 'bg' }); G.text(-0.04, t, String(t), { size: 13, fill: C.muted, anchor: 'end' }); });
          G.text(3.7, 0.52, 'bits vs samples', { size: 14, fill: C.muted });
          var curve = G.path([], { stroke: C.red, width: 3 });
          var dot = G.point(0, 0, { color: C.red, r: 5 });
          function kl() {
            var s = 0;
            for (var i = 0; i < 4; i++) { if (!counts[i]) return Infinity; s += p[i] * lg(p[i] / (counts[i] / n)); }
            return s;
          }
          function paint() {
            for (var i = 0; i < 4; i++) {
              var q = n ? counts[i] / n : 0;
              qb[i].set([[i, 0], [i + 0.36, 0], [i + 0.36, q], [i, q]]);
              cl[i].set(i + 0.18, q + 0.04, n ? String(counts[i]) : '');
            }
            var k = n ? kl() : Infinity;
            vn(String(n)); vk(isFinite(k) ? k.toFixed(4) + ' bits' : '∞');
            if (n && isFinite(k)) hist.push([Math.log10(n), Math.min(k, 0.58)]);
            curve.set(hist);
            if (hist.length) { var h = hist[hist.length - 1]; dot.set(h[0], h[1]); }
            dot.el.style.opacity = hist.length ? 1 : 0;
          }
          function draw(m) {
            for (var j = 0; j < m && n < 10000; j++) {
              var u = Math.random(), acc = 0, i = 0;
              for (; i < 3; i++) { acc += p[i]; if (u < acc) break; }
              counts[i]++; n++;
              if (n < 60 || j === m - 1 || j % 20 === 0) paint();
            }
          }
          function reset() { counts = [0, 0, 0, 0]; n = 0; hist = []; paint(); }
          var row2 = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, el);
          M4.button(row2, 'Draw 1', function () { draw(1); });
          M4.button(row2, 'Draw 10', function () { draw(10); });
          M4.button(row2, 'Draw 1000', function () { draw(1000); }, { primary: true });
          M4.button(row2, 'Reset', reset, { ghost: true });
          reset();
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>Cross-entropy \\(H(p, q)\\) is the average surprise of a model \\(q\\) on data from \\(p\\). It splits into \\(H(p)\\) plus \\(\\mathrm{KL}(p \\,\\|\\, q)\\).</li>' +
          '<li>The divergence is never negative, is zero only when \\(q = p\\), and is not symmetric.</li>' +
          '<li>Minimizing the cross-entropy loss over a model is the same as minimizing the divergence from the data, and with one-hot labels the loss is \\(-\\log q_y\\).</li>' +
          '</ul>'
      }
    ]
  });
})();
