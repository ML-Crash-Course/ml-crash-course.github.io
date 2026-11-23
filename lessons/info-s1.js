(function () {
  'use strict';

  var C = M4.colors;
  var COLS = [C.blue, C.orange, C.green, C.purple];
  var NAMES = ['A', 'B', 'C', 'D'];

  function lg(p) { return Math.log(p) / Math.LN2; }
  function bits(p) { return p <= 0 ? Infinity : -lg(p); }
  function H(ps) { var h = 0; ps.forEach(function (p) { if (p > 0) h -= p * lg(p); }); return h; }
  function f2(v) { return isFinite(v) ? v.toFixed(2) : '∞'; }

  function valueBox(parent, label, color) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    var l = M4.el('span', { text: label + ' ' }, r);
    l.style.fontWeight = '700';
    if (color) l.style.color = color;
    var v = M4.el('span', { text: '' }, r);
    return function (t) { v.textContent = t; };
  }

  /* ---------- surprise curve ---------- */
  function surpriseScene(el) {
    var p = M4.plane(el, { xmin: -0.08, xmax: 1.08, ymin: -0.7, ymax: 6, width: 560, height: 320, axes: false });
    p.line(0, 0, 1.05, 0, { stroke: C.muted, width: 1.5, layer: 'bg' });
    p.line(0, 0, 0, 5.8, { stroke: C.muted, width: 1.5, layer: 'bg' });
    [0.25, 0.5, 0.75, 1].forEach(function (t) {
      p.line(t, 0, t, -0.12, { stroke: C.muted, width: 1.5, layer: 'bg' });
      p.text(t, -0.4, String(t), { size: 14, fill: C.muted });
    });
    [1, 2, 3, 4, 5].forEach(function (t) {
      p.line(0, t, -0.015, t, { stroke: C.muted, width: 1.5, layer: 'bg' });
      p.text(-0.045, t, String(t), { size: 14, fill: C.muted });
    });
    p.text(1.03, 0.35, 'p', { size: 16, fill: C.muted });
    p.fn(function (x) { return x > 0 ? -lg(x) : NaN; }, { stroke: C.blue, xmin: 0.017, xmax: 1 });
    var guideV = p.line(0.25, 0, 0.25, 2, { stroke: C.purple, width: 1.5, dash: true });
    var guideH = p.line(0, 2, 0.25, 2, { stroke: C.purple, width: 1.5, dash: true });
    var lab = p.text(0.3, 2.4, '', { size: 17, fill: C.purple, anchor: 'start' });
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:10px' }, el);
    var vp = valueBox(row, 'probability', C.ink);
    var vs = valueBox(row, 'surprise', C.purple);
    function show(x) {
      var y = bits(x);
      redraw(x, y);
      vp(x.toFixed(3));
      vs(f2(y) + ' bits');
    }
    function redraw(x, y) {
      guideV.set(x, 0, x, y);
      guideH.set(0, y, x, y);
      lab.set(x + 0.03, Math.min(y, 5.4) + 0.35, f2(y) + ' bits');
    }
    var h = p.handle(0.25, 2, {
      color: C.purple,
      bounds: { xmin: 1 / 32, xmax: 1, ymin: -1, ymax: 10 },
      constrain: function (x) { return [x, bits(x)]; },
      onDrag: function (x) { show(x); }
    });
    show(0.25);
    return { handle: h };
  }

  /* ---------- four draggable bars ---------- */
  function barsScene(el, onChange, start) {
    var ps = (start || [0.4, 0.3, 0.2, 0.1]).slice();
    var p = M4.plane(el, { xmin: -0.95, xmax: 3.6, ymin: -0.2, ymax: 1.18, width: 560, height: 330, axes: false });
    p.line(-0.5, 0, 3.5, 0, { stroke: C.muted, width: 1.5, layer: 'bg' });
    [0.25, 0.5, 0.75, 1].forEach(function (t) {
      p.line(-0.5, t, 3.5, t, { stroke: C.line, width: 1, layer: 'bg' });
      p.text(-0.55, t, String(t), { size: 13, fill: C.muted, anchor: 'end' });
    });
    var W = 0.32;
    var bars = [], labs = [], hs = [];
    ps.forEach(function (v, i) {
      bars.push(p.path([], { fill: COLS[i], fillOpacity: 0.28, stroke: COLS[i], width: 2, closed: true }));
      labs.push(p.text(i, 0, '', { size: 14, fill: COLS[i] }));
      p.text(i, -0.1, NAMES[i], { size: 17, fill: C.ink });
    });
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:10px' }, el);
    var vh = valueBox(row, 'entropy H', C.ink);
    function paint() {
      ps.forEach(function (v, i) {
        bars[i].set([[i - W, 0], [i + W, 0], [i + W, v], [i - W, v]]);
        labs[i].set(i, Math.min(v, 1) + 0.09, v > 0.004 ? f2(bits(v)) + ' bits' : '');
      });
      vh(H(ps).toFixed(3) + ' bits');
      if (onChange) onChange(ps.slice(), H(ps));
    }
    ps.forEach(function (v, i) {
      hs.push(p.handle(i, v, {
        color: COLS[i],
        bounds: { xmin: i, xmax: i, ymin: 0, ymax: 1 },
        snap: 0.005,
        onDrag: function (x, y) {
          var old = ps[i], rest = 1 - old, k;
          ps[i] = y;
          for (k = 0; k < ps.length; k++) if (k !== i) {
            ps[k] = rest > 1e-9 ? ps[k] * (1 - y) / rest : (1 - y) / (ps.length - 1);
          }
          for (k = 0; k < ps.length; k++) if (k !== i) hs[k].set(k, ps[k]);
          paint();
        }
      }));
    });
    paint();
    return {
      set: function (arr) { ps = arr.slice(); ps.forEach(function (v, k) { hs[k].set(k, v); }); paint(); }
    };
  }

  /* ---------- practice ---------- */
  var DISTS = [
    [[1, 2], [1, 2]],
    [[1, 2], [1, 4], [1, 4]],
    [[1, 2], [1, 4], [1, 8], [1, 8]],
    [[1, 4], [1, 4], [1, 4], [1, 4]],
    [[1, 4], [1, 4], [1, 2]],
    [[1, 8], [1, 8], [1, 8], [1, 8], [1, 2]],
    [[1, 2], [1, 8], [1, 8], [1, 8], [1, 8]]
  ];
  function frac(f) { return f[0] === f[1] ? '1' : '\\tfrac{' + f[0] + '}{' + f[1] + '}'; }
  function gen() {
    var t = M4.rand(0, 2);
    if (t === 0) {
      var k = M4.rand(1, 6), den = Math.pow(2, k);
      return {
        q: 'An outcome has probability \\(p = \\tfrac{1}{' + den + '}\\). What is its surprise \\(-\\log_2 p\\) in bits?',
        answer: k,
        explain: '\\(\\tfrac{1}{' + den + '} = 2^{-' + k + '}\\), so the surprise is \\(' + k + '\\) bits.'
      };
    }
    if (t === 1) {
      var m = M4.rand(1, 6), N = Math.pow(2, m);
      return {
        q: 'A fair die has \\(' + N + '\\) equally likely faces. What is the entropy of one roll in bits?',
        answer: m,
        explain: 'Each face has surprise \\(\\log_2 ' + N + ' = ' + m + '\\), and the average of equal numbers is that number.'
      };
    }
    var d = M4.pick(DISTS);
    var h = 0, terms = [];
    d.forEach(function (f) { var p = f[0] / f[1]; h -= p * lg(p); terms.push(frac(f) + '\\cdot' + Math.round(-lg(p))); });
    return {
      q: 'A distribution has the probabilities \\(' + d.map(frac).join(',\\ ') + '\\). What is its entropy in bits?',
      answer: h,
      hint: 'Each probability is a power of \\(\\tfrac12\\), so every surprise is a whole number.',
      explain: '\\(H = ' + terms.join(' + ') + ' = ' + M4.fmt(h, 3) + '\\) bits.'
    };
  }

  M4.lesson({
    id: 'info-s1',
    module: 'info',
    title: 'Surprise and bits',
    summary: 'The information carried by a single outcome is measured in bits. Its average over a distribution is the entropy.',
    minutes: 18,
    steps: [
      {
        kind: 'text',
        title: 'Information as surprise',
        html: '<p>An event that was certain tells us nothing when it happens. An event we considered unlikely tells us a lot. Information theory turns this into a number. The <b>surprise</b> (or self-information) of an outcome with probability \\(p\\) is</p>' +
          '\\[ I(p) = -\\log_2 p = \\log_2 \\frac1p. \\]' +
          '<p>Three properties fix this choice. A certain outcome (\\(p = 1\\)) has surprise \\(0\\). Rarer outcomes have larger surprise. For two independent events the probabilities multiply, \\(p = p_1 p_2\\), and the logarithm turns the product into a sum: the surprise of both is the surprise of the first plus the surprise of the second.</p>' +
          '<p>With base 2 the unit is the <b>bit</b>. A fair coin flip has surprise \\(-\\log_2 \\tfrac12 = 1\\) bit. With the natural logarithm the unit is the <b>nat</b>, and \\(1\\) nat is about \\(1.44\\) bits.</p>'
      },
      {
        kind: 'explore',
        title: 'The surprise curve',
        html: '<p>Drag the point along the curve \\(-\\log_2 p\\). Each halving of the probability adds one bit. As \\(p\\) approaches \\(0\\), the surprise grows without bound.</p>',
        mount: function (el) { surpriseScene(el); }
      },
      {
        kind: 'text',
        title: 'Entropy as average surprise',
        html: '<p>A random variable \\(X\\) with outcomes \\(x_1, \\dots, x_K\\) and probabilities \\(p_1, \\dots, p_K\\) produces a different surprise on each draw. Its <b>entropy</b> is the expected surprise:</p>' +
          '\\[ H(X) = \\sum_{k=1}^K p_k \\log_2 \\frac{1}{p_k}. \\]' +
          '<p>Outcomes with \\(p_k = 0\\) never occur and contribute nothing, by the convention \\(0 \\cdot \\log 0 = 0\\). Entropy measures how unpredictable \\(X\\) is. It is \\(0\\) when one outcome is certain, and it is largest when all \\(K\\) outcomes are equally likely, where it equals \\(\\log_2 K\\).</p>'
      },
      {
        kind: 'explore',
        title: 'Entropy of a custom distribution',
        html: '<p>Four outcomes A to D. Drag the top of any bar. The other bars rescale so the probabilities still sum to \\(1\\). Above each bar is the surprise of that outcome, and below the plot is the entropy, the average of these surprises weighted by the bar heights.</p>',
        mount: function (el) {
          var sc = barsScene(el);
          var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:6px' }, el);
          M4.button(row, 'Uniform', function () { sc.set([0.25, 0.25, 0.25, 0.25]); });
          M4.button(row, 'Certain', function () { sc.set([1, 0, 0, 0]); });
          M4.button(row, 'Skewed', function () { sc.set([0.7, 0.15, 0.1, 0.05]); });
          M4.el('p', { class: 'm4-cap', text: 'A rare outcome has a large surprise, but it also gets a small weight. Entropy balances the two.' }, el);
        }
      },
      {
        kind: 'exercise',
        title: 'Entropy of 1.5 bits',
        html: '<p>Shape the distribution so that its entropy is \\(1.5\\) bits, with a tolerance of \\(0.02\\).</p>',
        hint: 'Try one outcome with probability \\(\\tfrac12\\) and two with \\(\\tfrac14\\). Their surprises are \\(1, 2, 2\\) bits.',
        mount: function (el, ctx) {
          var done = false;
          barsScene(el, function (ps, h) {
            if (!done && Math.abs(h - 1.5) < 0.02) {
              done = true;
              ctx.solved('\\(H = ' + h.toFixed(3) + '\\) bits.');
            }
          }, [0.85, 0.05, 0.05, 0.05]);
        }
      },
      {
        kind: 'text',
        title: 'Bits and yes or no questions',
        html: '<p>Entropy has a concrete meaning: it is the average number of yes or no questions needed to identify an outcome, when the questions are chosen well. Take four outcomes with probabilities \\(\\tfrac12, \\tfrac14, \\tfrac18, \\tfrac18\\).</p>' +
          '<ol><li>Ask "Is it A?" Half the time the answer is yes and one question was enough.</li>' +
          '<li>Otherwise ask "Is it B?" This settles B after two questions.</li>' +
          '<li>Otherwise ask "Is it C?" This settles both C and D after three questions.</li></ol>' +
          '<p>The average number of questions is \\(\\tfrac12 \\cdot 1 + \\tfrac14 \\cdot 2 + \\tfrac18 \\cdot 3 + \\tfrac18 \\cdot 3 = 1.75\\), which equals the entropy. Each outcome needs as many questions as its surprise.</p>' +
          '<p>Writing the answers as 0 and 1 gives a binary code: A = 0, B = 10, C = 110, D = 111. Shannon\'s source coding theorem states that no code can use fewer bits per outcome on average than the entropy. Compression algorithms approach this limit by giving frequent symbols short codes.</p>'
      },
      {
        kind: 'exercise',
        title: 'Counting bits',
        html: '<p>Use \\(-\\log_2 p\\) for a single outcome and the weighted average for the entropy.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: gen }); }
      },
      {
        kind: 'exercise',
        title: 'The guessing game',
        html: '<p>Tomorrow\'s weather is drawn from the distribution below and kept secret. Find it by asking yes or no questions of the form "is it rain?". Play eight rounds and try to keep your average number of questions as low as possible. The best possible average equals the entropy, \\(1.75\\) bits.</p>',
        hint: 'Ask about the likeliest remaining outcome first. When only one outcome is left, you know the answer without asking.',
        mount: function (el, ctx) {
          var W = [{ n: 'rain', p: 1 / 8, c: C.blue }, { n: 'sun', p: 1 / 2, c: C.orange }, { n: 'snow', p: 1 / 8, c: C.purple }, { n: 'cloud', p: 1 / 4, c: C.green }];
          var ROUNDS = 8;
          var P = M4.plane(el, { xmin: -0.7, xmax: 3.7, ymin: -0.14, ymax: 0.62, width: 520, height: 240, axes: false, grid: false });
          P.line(-0.5, 0, 3.5, 0, { stroke: C.muted, width: 1.5, layer: 'bg' });
          W.forEach(function (w, i) {
            P.text(i, -0.07, w.n, { size: 17, fill: C.ink });
            P.text(i, w.p + 0.05, ' ' + (w.p === 0.5 ? '1/2' : w.p === 0.25 ? '1/4' : '1/8'), { size: 15, fill: w.c });
            P.path([[i - 0.3, 0], [i + 0.3, 0], [i + 0.3, w.p], [i - 0.3, w.p]], { fill: w.c, fillOpacity: 0.3, stroke: w.c, width: 2, closed: true });
          });
          var btnRow = M4.el('div', { class: 'm4-row' }, el);
          var status = M4.el('p', { style: 'text-align:center;min-height:1.6em;margin:10px 0 4px' }, el);
          var score = M4.el('div', { class: 'm4-readout' }, el);
          var secret, asked, left, round = 0, total = 0, optimal = true, done = false;
          var btns = W.map(function (w, i) {
            var b = M4.button(btnRow, 'Is it ' + w.n + '?', function () { ask(i); });
            return b;
          });
          function draw() {
            var u = Math.random(), acc = 0;
            for (var i = 0; i < W.length; i++) { acc += W[i].p; if (u < acc) return i; }
            return W.length - 1;
          }
          function newRound() {
            secret = draw(); asked = 0; left = [0, 1, 2, 3];
            btns.forEach(function (b) { b.disabled = false; });
            status.textContent = 'Round ' + (round + 1) + ' of ' + ROUNDS + '. Ask your first question.';
          }
          function paintScore() {
            score.innerHTML = '<span>Questions so far <b>' + total + '</b> in <b>' + round + '</b> rounds, average <b>' + (round ? (total / round).toFixed(2) : '0') + '</b></span>';
          }
          function finish(msg) {
            round++; total += asked; paintScore();
            btns.forEach(function (b) { b.disabled = true; });
            if (round >= ROUNDS) {
              if (optimal) { done = true; ctx.solved('Every question went to the likeliest remaining outcome. On average this strategy needs \\(\\tfrac12 \\cdot 1 + \\tfrac14 \\cdot 2 + \\tfrac18 \\cdot 3 + \\tfrac18 \\cdot 3 = 1.75\\) questions, the entropy.'); }
              else ctx.wrong('In some rounds you asked about a rarer outcome while a likelier one was still open. That costs questions on average. Press the button below to play again.');
              status.textContent = msg + ' Game over.';
              return;
            }
            status.textContent = msg + ' Starting the next round.';
            setTimeout(newRound, 1100);
          }
          function ask(i) {
            if (done || left.indexOf(i) < 0) return;
            var maxP = Math.max.apply(null, left.map(function (k) { return W[k].p; }));
            if (W[i].p < maxP) optimal = false;
            asked++;
            if (i === secret) { finish('Yes, it is ' + W[i].n + '. That took ' + asked + (asked === 1 ? ' question.' : ' questions.')); return; }
            left.splice(left.indexOf(i), 1);
            btns[i].disabled = true;
            if (left.length === 1) { finish('No. Only ' + W[left[0]].n + ' is left, so it took ' + asked + ' questions.'); return; }
            status.textContent = 'No, it is not ' + W[i].n + '. Ask again.';
          }
          var again = M4.el('div', { class: 'm4-row' }, el);
          M4.button(again, 'Start over', function () { if (done) return; round = 0; total = 0; optimal = true; paintScore(); newRound(); }, { ghost: true });
          paintScore(); newRound();
          ctx.onCleanup && ctx.onCleanup(function () { done = true; });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>The surprise of an outcome is \\(-\\log_2 p\\) bits. Halving the probability adds one bit.</li>' +
          '<li>Entropy is the average surprise. It is \\(0\\) for a certain outcome and \\(\\log_2 K\\) for \\(K\\) equally likely outcomes.</li>' +
          '<li>Entropy is the smallest possible average number of yes or no questions, and the smallest average code length.</li>' +
          '</ul>'
      }
    ]
  });
})();
