(function () {
  'use strict';

  var C = M4.colors;

  /* ---------- helpers ---------- */
  function cos(a, b) {
    var d = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return d / Math.sqrt(na * nb || 1);
  }
  function f2(v) { return (v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(2); }

  function injectStyle() {
    if (document.getElementById('emb-style')) return;
    var s = document.createElement('style');
    s.id = 'emb-style';
    s.textContent = [
      '.emb-look{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;margin:14px 0 6px}',
      '.emb-col{display:flex;flex-direction:column;align-items:center;gap:6px}',
      '.emb-cap{font-size:15px;color:' + C.muted + '}',
      '.emb-op{font-size:24px;color:' + C.muted + '}',
      '.emb-tab{border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:17px}',
      '.emb-tab td,.emb-tab th{padding:4px 9px;text-align:right;border-bottom:1px solid ' + C.line + '}',
      '.emb-tab th{text-align:left;font-weight:500;color:' + C.muted + '}',
      '.emb-tab tr.on td,.emb-tab tr.on th{background:#f6ead9;color:' + C.ink + ';font-weight:700}',
      '.emb-plane{display:flex;justify-content:center}',
      '.emb-plane svg{width:100%;height:auto;touch-action:none}',
      '.emb-bars{display:flex;flex-direction:column;gap:7px;max-width:520px;margin:12px auto}',
      '.emb-bar{display:grid;grid-template-columns:96px 1fr 58px;align-items:center;gap:10px;font-size:17px}',
      '.emb-bar .lab{text-align:right;color:' + C.ink + '}',
      '.emb-bar .trk{height:22px;background:' + C.paper + ';border:1px solid ' + C.line + ';border-radius:5px;overflow:hidden}',
      '.emb-bar .fil{height:100%;width:0;background:' + C.blue + ';transition:width .25s}',
      '.emb-bar .val{font-variant-numeric:tabular-nums;color:' + C.muted + '}',
      '.emb-bar.hi .lab{font-weight:700}',
      '.emb-text{font-size:21px;line-height:1.7;text-align:center;margin:10px auto;max-width:560px;min-height:40px}',
      '.emb-text b{color:' + C.orange + '}'
    ].join('');
    document.head.appendChild(s);
  }
  injectStyle();

  function softmax(z, T) {
    T = T || 1;
    var m = Math.max.apply(null, z), e = z.map(function (v) { return Math.exp((v - m) / T); });
    var s = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (v) { return v / s; });
  }
  function bars(parent, labels, opts) {
    opts = opts || {};
    var wrap = M4.el('div', { class: 'emb-bars' }, parent);
    var rows = labels.map(function (l) {
      var r = M4.el('div', { class: 'emb-bar' }, wrap);
      var lab = M4.el('span', { class: 'lab', html: l }, r);
      var f = M4.el('div', { class: 'fil' }, M4.el('div', { class: 'trk' }, r));
      var v = M4.el('span', { class: 'val' }, r);
      return { r: r, lab: lab, f: f, v: v };
    });
    function set(vals, hi, color) {
      var mx = opts.max || 1;
      rows.forEach(function (q, i) {
        q.f.style.width = Math.max(0, Math.min(1, vals[i] / mx)) * 100 + '%';
        q.f.style.background = (color && color[i]) || opts.color || C.blue;
        q.v.textContent = opts.fmt ? opts.fmt(vals[i]) : vals[i].toFixed(2);
        q.r.classList.toggle('hi', i === hi);
      });
    }
    return { el: wrap, rows: rows, set: set, labels: function (ls) { ls.forEach(function (l, i) { rows[i].lab.innerHTML = l; }); } };
  }
  M4.lang = { cos: cos, f2: f2, softmax: softmax, bars: bars };

  /* ---------- a small embedding table ---------- */
  var TABLE = {
    words: ['cat', 'dog', 'apple', 'bread', 'Paris', 'Rome'],
    E: [[0.9, 0.8, 0.1], [0.8, 0.9, 0.2], [0.1, 0.2, 0.9], [0.2, 0.1, 0.8], [-0.7, 0.3, 0.1], [-0.8, 0.2, 0.2]]
  };

  function lookupDemo(el) {
    var W = TABLE.words, E = TABLE.E, pick = 0;
    var top = M4.el('div', { class: 'm4-row' }, el);
    var btns = W.map(function (w, i) { return M4.button(top, w, function () { pick = i; draw(); }); });
    var stage = M4.el('div', { class: 'emb-look' }, el);
    var note = M4.el('div', { class: 'm4-noteline' }, el);
    function draw() {
      btns.forEach(function (b, i) { b.classList.toggle('primary', i === pick); });
      var h = '<div class="emb-col"><div class="emb-cap">one-hot \\(e_{' + W[pick] + '}\\)</div><table class="emb-tab">';
      W.forEach(function (w, i) { h += '<tr' + (i === pick ? ' class="on"' : '') + '><td>' + (i === pick ? 1 : 0) + '</td></tr>'; });
      h += '</table></div><div class="emb-op">\\(\\times\\)</div><div class="emb-col"><div class="emb-cap">embedding table \\(E\\)</div><table class="emb-tab">';
      W.forEach(function (w, i) {
        h += '<tr' + (i === pick ? ' class="on"' : '') + '><th>' + w + '</th>' + E[i].map(function (v) { return '<td>' + f2(v) + '</td>'; }).join('') + '</tr>';
      });
      h += '</table></div><div class="emb-op">\\(=\\)</div><div class="emb-col"><div class="emb-cap">vector of ' + W[pick] + '</div><table class="emb-tab"><tr class="on">' +
        E[pick].map(function (v) { return '<td>' + f2(v) + '</td>'; }).join('') + '</tr></table></div>';
      stage.innerHTML = h; M4.typeset(stage);
      var best = -2, bj = 0;
      W.forEach(function (w, j) { if (j !== pick) { var c = cos(E[pick], E[j]); if (c > best) { best = c; bj = j; } } });
      note.innerHTML = 'The one-hot vector selects one row of \\(E\\). The closest other word by cosine similarity is <b>' + W[bj] + '</b> (' + f2(best) + ').';
      M4.typeset(note);
    }
    draw();
  }

  /* ---------- the word map ---------- */
  var GROUPS = [
    { name: 'animals', color: C.orange, ang: 40, words: ['cat', 'dog', 'horse', 'mouse'] },
    { name: 'food', color: C.green, ang: 130, words: ['apple', 'bread', 'cheese', 'banana'] },
    { name: 'cities', color: C.purple, ang: 220, words: ['Paris', 'Rome', 'Berlin', 'Madrid'] },
    { name: 'verbs', color: C.blue, ang: 310, words: ['run', 'walk', 'swim', 'jump'] }
  ];
  var JIT = [[-9, 0.95], [8, 0.7], [-3, 0.5], [12, 1.05]];
  var MAP = [];
  GROUPS.forEach(function (g, gi) {
    g.words.forEach(function (w, k) {
      var a = (g.ang + JIT[k][0] + gi * 2) * Math.PI / 180, r = JIT[(k + gi) % 4][1];
      MAP.push({ w: w, v: [r * Math.cos(a), r * Math.sin(a)], color: g.color });
    });
  });

  function wordMap(el, ctx) {
    var P = M4.plane(M4.el('div', { class: 'emb-plane' }, el), { xmin: -1.3, xmax: 1.3, ymin: -1.3, ymax: 1.3, width: 460, height: 460, labels: false });
    var links = [0, 1, 2].map(function () { return P.line(0, 0, 0, 0, { stroke: C.ink, width: 2, dash: '5 5' }); });
    var ray = P.line(0, 0, 0, 0, { stroke: C.muted, width: 1.5 });
    var dots = MAP.map(function (m) {
      P.point(m.v[0], m.v[1], { r: 6, color: m.color });
      var lx = m.v[0] + (m.v[0] >= 0 ? 0.05 : -0.05);
      return P.text(lx, m.v[1] + 0.08, m.w, { size: 15, anchor: m.v[0] >= 0 ? 'start' : 'end', fill: C.ink, weight: 500 });
    });
    var out = M4.el('div', { class: 'm4-readout' }, el);
    var visited = {};
    var h = P.handle(0.6, 0.9, { color: C.muted, r: 9, onDrag: update });
    function update() {
      var q = [h.x, h.y], n = Math.hypot(q[0], q[1]) || 1;
      ray.set(0, 0, q[0] / n * 1.25, q[1] / n * 1.25);
      var ranked = MAP.map(function (m, i) { return { i: i, c: cos(q, m.v) }; }).sort(function (a, b) { return b.c - a.c; });
      ranked.slice(0, 3).forEach(function (r, k) { var m = MAP[r.i]; links[k].set(q[0], q[1], m.v[0], m.v[1]); });
      dots.forEach(function (d, i) { d.el.setAttribute('font-weight', ranked.slice(0, 3).some(function (r) { return r.i === i; }) ? 700 : 400); });
      out.innerHTML = ranked.slice(0, 3).map(function (r) { return '<span><b>' + MAP[r.i].w + '</b> ' + f2(r.c) + '</span>'; }).join('');
      var g = GROUPS.filter(function (gg) { return gg.color === MAP[ranked[0].i].color; })[0];
      visited[g.name] = 1;
      if (Object.keys(visited).length === 4 && ctx) ctx.solved('You visited all four groups. Each group occupies one direction from the origin.');
    }
    update();
  }

  /* ---------- analogies ---------- */
  var ANA = {
    man: [-0.9, -0.55], woman: [0.55, -0.6], king: [-0.85, 0.75], queen: [0.6, 0.7],
    boy: [-1.05, -1.25], girl: [0.4, -1.2], prince: [-1.1, 0.05], princess: [0.35, 0.05]
  };
  var PRESETS = [['man', 'king', 'woman'], ['woman', 'girl', 'man'], ['king', 'prince', 'queen'], ['man', 'woman', 'boy']];

  function analogyDemo(el) {
    var P = M4.plane(M4.el('div', { class: 'emb-plane' }, el), { xmin: -1.6, xmax: 1.4, ymin: -1.6, ymax: 1.2, width: 480, height: 448, labels: false });
    var keys = Object.keys(ANA);
    var ab = P.arrow(0, 0, 1, 1, { stroke: C.orange, width: 3 });
    var cd = P.arrow(0, 0, 1, 1, { stroke: C.orange, width: 3, dash: '6 5' });
    keys.forEach(function (k) {
      var v = ANA[k];
      P.point(v[0], v[1], { r: 6, color: C.ink });
      P.text(v[0] + 0.07, v[1] + 0.1, k, { size: 15, anchor: 'start', weight: 500 });
    });
    var res = P.point(0, 0, { r: 9, fill: 'none', stroke: C.orange, width: 3 });
    var row = M4.el('div', { class: 'm4-row' }, el);
    var out = M4.el('div', { class: 'm4-noteline' }, el);
    var btns = PRESETS.map(function (p, i) { return M4.button(row, p[1] + ' \u2212 ' + p[0] + ' + ' + p[2], function () { show(i); }); });
    function show(i) {
      var p = PRESETS[i], a = ANA[p[0]], b = ANA[p[1]], c = ANA[p[2]];
      var r = [b[0] - a[0] + c[0], b[1] - a[1] + c[1]];
      btns.forEach(function (bb, j) { bb.classList.toggle('primary', j === i); });
      ab.set(a[0], a[1], b[0], b[1]);
      cd.set(c[0], c[1], r[0], r[1]);
      res.set(r[0], r[1]);
      var best = null, bc = -2;
      keys.forEach(function (k) { if (p.indexOf(k) < 0) { var d = Math.hypot(r[0] - ANA[k][0], r[1] - ANA[k][1]); if (-d > bc) { bc = -d; best = k; } } });
      out.innerHTML = 'The solid arrow goes from <b>' + p[0] + '</b> to <b>' + p[1] + '</b>. The same arrow, started at <b>' + p[2] + '</b>, ends near <b>' + best + '</b>.';
    }
    show(0);
  }

  /* ---------- the lesson ---------- */
  M4.lesson({
    id: 'emb-s1',
    module: 'language',
    title: 'Words as vectors',
    summary: 'A neural network needs numbers. Embeddings give every word a vector, and similar words get similar vectors.',
    minutes: 15,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>A neural network computes with vectors, but text is made of words. This lesson shows how every word becomes a vector and what the geometry of these vectors means. After this lesson you can</p>' +
          '<ul><li>explain one-hot vectors and why they carry no notion of similarity,</li>' +
          '<li>look up a word in an embedding table and compare two words with cosine similarity,</li>' +
          '<li>read an analogy such as \\(\\text{king} - \\text{man} + \\text{woman}\\) as vector arithmetic.</li></ul>'
      },
      {
        kind: 'text',
        title: 'One-hot vectors',
        html: '<p>Fix a vocabulary of \\(V\\) words and number them from 1 to \\(V\\). The simplest vector for word number \\(i\\) is the <b>one-hot vector</b> \\(e_i\\), with a 1 in position \\(i\\) and 0 everywhere else.</p>' +
          '\\[ e_{\\text{cat}} = (1, 0, 0, \\dots, 0), \\qquad e_{\\text{dog}} = (0, 1, 0, \\dots, 0). \\]' +
          '<p>Two different one-hot vectors always have dot product 0. To a model that sees only one-hot vectors, cat is as different from dog as it is from bread. A real vocabulary has \\(V \\approx 50{,}000\\) words, so these vectors are also very long.</p>'
      },
      {
        kind: 'explore',
        title: 'The embedding table',
        html: '<p>An <b>embedding table</b> \\(E\\) has one row per word and \\(d\\) columns, with \\(d\\) much smaller than \\(V\\). Multiplying a one-hot vector by \\(E\\) picks out one row. In code this is a lookup, not a multiplication.</p><p>Click the words. Which pairs have similar rows?</p>',
        mount: function (el) { lookupDemo(el); }
      },
      {
        kind: 'text',
        title: 'Cosine similarity',
        html: '<p>To compare two word vectors \\(a\\) and \\(b\\), we use the cosine of the angle between them,</p>' +
          '\\[ \\cos(a, b) = \\frac{a \\cdot b}{\\lVert a \\rVert \\, \\lVert b \\rVert}. \\]' +
          '<p>It is 1 when the vectors point the same way, 0 when they are perpendicular and \\(-1\\) when they point in opposite directions. The length of a word vector often grows with how frequent the word is, so the angle is a better measure of meaning than the distance.</p>'
      },
      {
        kind: 'exercise',
        title: 'Practice: cosine similarity',
        html: '<p>Compute the cosine similarity of the two vectors. Round to two decimals.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 3,
            gen: function () {
              var pool = [-3, -2, -1, 1, 2, 3];
              var a = [M4.pick(pool), M4.pick(pool)], b = [M4.pick(pool), M4.pick(pool)];
              var dot = a[0] * b[0] + a[1] * b[1], na = Math.hypot(a[0], a[1]), nb = Math.hypot(b[0], b[1]);
              var c = dot / (na * nb);
              return {
                q: '\\(a = (' + a.join(', ') + ')\\) and \\(b = (' + b.join(', ') + ')\\). What is \\(\\cos(a, b)\\)?',
                answer: c, tol: 0.011,
                hint: 'Divide the dot product by the product of the two lengths.',
                explain: '\\(a \\cdot b = ' + dot + '\\), \\(\\lVert a \\rVert \\lVert b \\rVert = \\sqrt{' + (a[0] * a[0] + a[1] * a[1]) + '}\\sqrt{' + (b[0] * b[0] + b[1] * b[1]) + '} \\approx ' + (na * nb).toFixed(2) + '\\), so the cosine is about \\(' + c.toFixed(2) + '\\).'
              };
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'A map of words',
        html: '<p>These are 16 words placed in two dimensions. Real embeddings have hundreds of dimensions, but the idea is the same. Drag the gray point. The dashed lines connect it to the three words with the largest cosine similarity.</p><p>Visit all four groups of words.</p>',
        mount: function (el, ctx) { wordMap(el, ctx); }
      },
      {
        kind: 'text',
        title: 'Where the vectors come from',
        html: '<p>Nobody places the words by hand. The rows of \\(E\\) are parameters, trained with gradient descent like any other weights. One classic method, word2vec, trains them to predict the words that appear near a given word.</p>' +
          '<p>Words that appear in similar contexts receive similar gradient updates and end up close together. Cat and dog both appear after "feed the" and before "barked" or "purred", so their vectors become similar. This is the <b>distributional hypothesis</b>: a word is characterized by the company it keeps.</p>'
      },
      {
        kind: 'explore',
        title: 'Analogies',
        html: '<p>Differences between word vectors can carry meaning too. In trained embeddings the arrow from <i>man</i> to <i>king</i> is close to the arrow from <i>woman</i> to <i>queen</i>. Pick an analogy and compare the two arrows.</p>',
        mount: function (el) { analogyDemo(el); }
      },
      {
        kind: 'exercise',
        title: 'An analogy',
        html: '<p>In a trained embedding, which word is closest to \\(\\text{Paris} - \\text{France} + \\text{Japan}\\)?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['Tokyo', 'France', 'Kyoto', 'Paris'],
            correct: 0,
            onCorrect: function () { ctx.solved('The arrow from France to Paris points from a country to its capital. Added to Japan it lands near Tokyo.'); },
            onWrong: function () { ctx.wrong('The difference Paris minus France is the step from a country to its capital.'); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'How many parameters?',
        html: '<p>A model has a vocabulary of \\(V = 50{,}000\\) words and embeddings of dimension \\(d = 300\\). How many million numbers are in its embedding table?</p>',
        mount: function (el, ctx) {
          M4.numberInput(el, {
            answer: 15, tolerance: 0.01, label: 'million',
            onCorrect: function () { ctx.solved('\\(50{,}000 \\times 300 = 15\\) million. In many language models the embedding table is one of the largest single matrices.'); },
            onWrong: function () { ctx.wrong('The table has one row of length \\(d\\) for every word.'); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>A one-hot vector names a word but says nothing about meaning, since all pairs of one-hot vectors are perpendicular.</li>' +
          '<li>An embedding table stores one trained vector per word, and cosine similarity measures how close two words are.</li>' +
          '<li>Words in similar contexts get similar vectors, and differences between vectors can encode relations such as country and capital.</li></ul>'
      }
    ]
  });
})();
