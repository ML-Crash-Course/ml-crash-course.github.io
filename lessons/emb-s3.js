(function () {
  'use strict';

  var C = M4.colors, L = M4.lang;

  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* ---------- a query among keys ---------- */
  var KEYS = [
    { w: 'river', v: [1.0, 0.35] },
    { w: 'water', v: [0.75, 0.95] },
    { w: 'money', v: [-0.95, 0.45] },
    { w: 'loan', v: [-0.55, 1.0] },
    { w: 'the', v: [0.15, -0.35] }
  ];

  function attentionDemo(el, ctx) {
    var P = M4.plane(M4.el('div', { class: 'emb-plane' }, el), { xmin: -1.6, xmax: 1.6, ymin: -1.1, ymax: 1.6, width: 480, height: 405, labels: false });
    var spokes = KEYS.map(function () { return P.line(0, 0, 0, 0, { stroke: C.orange, width: 2 }); });
    KEYS.forEach(function (k) {
      P.point(k.v[0], k.v[1], { r: 6, color: C.ink });
      P.text(k.v[0] + (k.v[0] >= 0 ? 0.08 : -0.08), k.v[1] + 0.1, k.w, { size: 15, anchor: k.v[0] >= 0 ? 'start' : 'end', weight: 500 });
    });
    var qa = P.arrow(0, 0, 1, 1, { stroke: C.blue, width: 3 });
    var qlab = P.text(0, 0, 'query', { size: 15, fill: C.blue, weight: 600 });
    var outp = P.point(0, 0, { r: 9, fill: 'none', stroke: C.orange, width: 3 });
    var b = L.bars(el, KEYS.map(function (k) { return k.w; }));
    var out = M4.el('div', { class: 'm4-readout' }, el);
    var sharp = false, flat = false;
    var h = P.handle(0.4, 0.6, { color: C.blue, r: 9, bounds: { xmin: -1.5, xmax: 1.5, ymin: -1, ymax: 1.5 }, onDrag: update });
    function update() {
      var q = [h.x, h.y];
      var s = KEYS.map(function (k) { return q[0] * k.v[0] + q[1] * k.v[1]; });
      var a = L.softmax(s.map(function (v) { return v * 4; }));
      var o = [0, 0];
      KEYS.forEach(function (k, i) { o[0] += a[i] * k.v[0]; o[1] += a[i] * k.v[1]; });
      qa.set(0, 0, q[0], q[1]);
      var ql = Math.hypot(q[0], q[1]) || 1; qlab.set(q[0] * 0.5 + 0.2 * q[1] / ql, q[1] * 0.5 - 0.2 * q[0] / ql - 0.05);
      outp.set(o[0], o[1]);
      KEYS.forEach(function (k, i) { spokes[i].set(o[0], o[1], k.v[0], k.v[1]); spokes[i].el.setAttribute('stroke-opacity', Math.min(1, a[i] * 1.6)); spokes[i].el.setAttribute('stroke-width', 1 + 5 * a[i]); });
      var mx = Math.max.apply(null, a);
      b.set(a, a.indexOf(mx), KEYS.map(function () { return C.orange; }));
      out.innerHTML = '<span>largest weight ' + mx.toFixed(2) + ' on <b>' + KEYS[a.indexOf(mx)].w + '</b></span>';
      if (mx > 0.85) sharp = true;
      if (mx < 0.35) flat = true;
      if (sharp && flat) ctx.solved('A long query pointing at one key concentrates the attention. A short query spreads it over all words.');
    }
    update();
  }

  /* ---------- scaling by the square root of d ---------- */
  function scaleDemo(el, ctx) {
    var n = 6, dims = [2, 4, 8, 16, 32, 64, 128, 256, 512], d = 4, q, K;
    var labels = []; for (var i = 0; i < n; i++) labels.push('key ' + (i + 1));
    var two = M4.el('div', { class: 'm4-two' }, el);
    var l = M4.el('div', null, two), r = M4.el('div', null, two);
    M4.el('div', { class: 'm4-cap', html: 'softmax of \\(q \\cdot k\\)' }, l);
    M4.el('div', { class: 'm4-cap', html: 'softmax of \\(q \\cdot k / \\sqrt{d}\\)' }, r);
    M4.typeset(two);
    var b1 = L.bars(l, labels), b2 = L.bars(r, labels);
    M4.slider(el, { min: 0, max: dims.length - 1, step: 1, value: 1, label: 'dimension \\(d\\)', format: function (v) { return String(dims[v]); }, onInput: function (v) { d = dims[v]; sample(); } });
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, el);
    M4.button(row, 'New random vectors', sample);
    var out = M4.el('div', { class: 'm4-readout' }, el);
    function sample() {
      q = []; K = [];
      for (var j = 0; j < d; j++) q.push(gauss());
      for (var i = 0; i < n; i++) { var k = []; for (var j2 = 0; j2 < d; j2++) k.push(gauss()); K.push(k); }
      var sc = K.map(function (k) { var t = 0; for (var j = 0; j < d; j++) t += q[j] * k[j]; return t; });
      var a1 = L.softmax(sc), a2 = L.softmax(sc.map(function (v) { return v / Math.sqrt(d); }));
      b1.set(a1, a1.indexOf(Math.max.apply(null, a1)));
      b2.set(a2, a2.indexOf(Math.max.apply(null, a2)));
      var lo = Math.min.apply(null, sc), hi = Math.max.apply(null, sc);
      out.innerHTML = '<span>scores from ' + L.f2(lo) + ' to ' + L.f2(hi) + '</span>';
      if (d >= 256) { ctx.solved('Without scaling, the scores spread over a range that grows like \\(\\sqrt{d}\\), and softmax puts almost all weight on one key. Dividing by \\(\\sqrt{d}\\) keeps the scores in a useful range.'); }
    }
    sample();
  }

  M4.lesson({
    id: 'emb-s3',
    module: 'language',
    title: 'Attention',
    summary: 'Each word builds its new vector as a weighted average of the other words, with weights from dot products.',
    minutes: 15,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>An embedding gives the word <i>bank</i> the same vector in "the bank of the river" and in "a loan from the bank". Attention lets every word update its vector using the words around it. After this lesson you can</p>' +
          '<ul><li>compute attention weights from queries and keys with a dot product and a softmax,</li>' +
          '<li>describe the output of attention as a weighted average of value vectors,</li>' +
          '<li>explain why the scores are divided by \\(\\sqrt{d}\\).</li></ul>'
      },
      {
        kind: 'text',
        title: 'Looking at the context',
        html: '<p>To decide which meaning of <i>bank</i> is meant, the model should look at the other words in the sentence. Some of them matter a lot, such as <i>river</i> or <i>loan</i>, and some barely matter, such as <i>the</i>.</p>' +
          '<p>Attention does this in three steps. The current word sends out a <b>query</b> vector \\(q\\). Every word in the context offers a <b>key</b> vector \\(k_i\\). The score of word \\(i\\) is the dot product \\(q \\cdot k_i\\), and a softmax over the scores gives the attention weights \\(a_i\\).</p>'
      },
      {
        kind: 'exercise',
        title: 'A query among keys',
        html: '<p>The blue arrow is the query of <i>bank</i>. The black points are the keys of five context words. The bars show the attention weights, and the orange ring is the weighted average of the keys.</p><p>Drag the query until one word gets a weight above 0.85. Then find a query that gives no word more than 0.35.</p>',
        mount: function (el, ctx) { attentionDemo(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'Practice: attention weights',
        html: '<p>A query is compared with two keys. Compute the attention weight of the first key. Round to two decimals.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 3,
            gen: function () {
              var q = [M4.pick([1, 2]), M4.pick([0, 1])];
              var k1 = [M4.pick([1, 0]), M4.pick([1, 0, -1])], k2 = [M4.pick([0, -1]), M4.pick([1, 0])];
              var s1 = q[0] * k1[0] + q[1] * k1[1], s2 = q[0] * k2[0] + q[1] * k2[1];
              var a = Math.exp(s1) / (Math.exp(s1) + Math.exp(s2));
              return {
                q: '\\(q = (' + q.join(', ') + ')\\), \\(k_1 = (' + k1.join(', ') + ')\\), \\(k_2 = (' + k2.join(', ') + ')\\). What is \\(a_1\\)?',
                answer: a, tol: 0.011,
                hint: 'With two scores, \\(a_1 = e^{s_1} / (e^{s_1} + e^{s_2})\\).',
                explain: 'The scores are \\(s_1 = ' + s1 + '\\) and \\(s_2 = ' + s2 + '\\), so \\(a_1 = 1 / (1 + e^{' + (s2 - s1) + '}) \\approx ' + a.toFixed(2) + '\\).'
              };
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Queries, keys and values',
        html: '<p>Each word vector \\(x_i\\) produces three vectors with three learned matrices,</p>' +
          '\\[ q_i = W_Q x_i, \\qquad k_i = W_K x_i, \\qquad v_i = W_V x_i. \\]' +
          '<p>The keys decide <i>where</i> a word looks, and the <b>values</b> decide <i>what</i> it takes from there. The new vector of word \\(i\\) is \\(\\sum_j a_{ij} v_j\\). For all words at once, with the queries, keys and values as rows of matrices \\(Q\\), \\(K\\) and \\(V\\),</p>' +
          '\\[ \\operatorname{Attention}(Q, K, V) = \\operatorname{softmax}\\!\\left( \\frac{Q K^\\top}{\\sqrt{d}} \\right) V. \\]' +
          '<p>In a language model that predicts the next word, word \\(i\\) may only attend to words \\(j \\le i\\). The scores of later words are set to \\(-\\infty\\) before the softmax, so their weights become 0. This is called a causal mask.</p>'
      },
      {
        kind: 'exercise',
        title: 'Why divide by the square root of d',
        html: '<p>The entries of \\(q\\) and \\(k\\) are random numbers with mean 0 and variance 1. Increase the dimension \\(d\\) to 256 or more and compare the two sets of weights.</p>',
        mount: function (el, ctx) { scaleDemo(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'The variance of a dot product',
        html: '<p>With independent entries of mean 0 and variance 1, each product \\(q_j k_j\\) has variance 1. What is the standard deviation of \\(q \\cdot k\\) when \\(d = 64\\)?</p>',
        mount: function (el, ctx) {
          M4.numberInput(el, {
            answer: 8, tolerance: 0.01,
            onCorrect: function () { ctx.solved('The variance of a sum of 64 independent terms is 64, so the standard deviation is 8. Dividing by \\(\\sqrt{64} = 8\\) brings it back to 1.'); },
            onWrong: function () { ctx.wrong('Variances of independent terms add up. Take the square root at the end.'); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Who is it',
        html: '<p>In the sentence "The animal did not cross the street because <i>it</i> was too tired", which word should the query of <i>it</i> give the largest weight?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['animal', 'street', 'cross', 'tired'],
            correct: 0,
            onCorrect: function () { ctx.solved('Only an animal can be tired. If the sentence ended with "too wide", the right word would be street. Trained attention heads learn such links from data.'); },
            onWrong: function () { ctx.wrong('Which of these can be tired?'); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'The cost of attention',
        html: '<p>Every word computes a score with every word of the sequence. How many million scores does one attention layer compute for a sequence of 2,000 words?</p>',
        mount: function (el, ctx) {
          M4.numberInput(el, {
            answer: 4, tolerance: 0.01, label: 'million',
            onCorrect: function () { ctx.solved('\\(2{,}000^2 = 4\\) million. The cost grows with the square of the length, which is why long contexts are expensive.'); },
            onWrong: function () { ctx.wrong('The scores form an \\(n \\times n\\) matrix.'); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>Attention scores every context word by the dot product of a query and a key, and softmax turns the scores into weights.</li>' +
          '<li>The output for each word is the weighted average of the value vectors, so its new vector depends on its context.</li>' +
          '<li>Dividing the scores by \\(\\sqrt{d}\\) keeps their spread near 1, so the softmax does not collapse onto a single word.</li></ul>'
      }
    ]
  });
})();
