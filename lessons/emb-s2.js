(function () {
  'use strict';

  var C = M4.colors, L = M4.lang;

  /* ---------- logits and softmax ---------- */
  function logitDemo(el) {
    var words = ['mat', 'rug', 'sofa', 'moon', 'ran'];
    var z = [3, 2, 1.5, -1, -2];
    M4.el('div', { class: 'emb-text', html: 'the cat sat on the <b>?</b>' }, el);
    var two = M4.el('div', { class: 'm4-two' }, el);
    var left = M4.el('div', null, two), right = M4.el('div', null, two);
    M4.el('div', { class: 'm4-cap', html: 'logits' }, left);
    words.forEach(function (w, i) {
      M4.slider(left, { min: -4, max: 6, step: 0.1, value: z[i], label: w, format: function (v) { return L.f2(v); }, onInput: function (v) { z[i] = v; draw(); } });
    });
    M4.el('div', { class: 'm4-cap', html: 'probabilities after softmax' }, right);
    var b = L.bars(right, words);
    var out = M4.el('div', { class: 'm4-readout' }, el);
    function draw() {
      var p = L.softmax(z), hi = p.indexOf(Math.max.apply(null, p));
      b.set(p, hi);
      out.innerHTML = '<span>sum of probabilities 1.00</span><span>largest <b>' + words[hi] + '</b> ' + p[hi].toFixed(2) + '</span>';
    }
    draw();
  }

  /* ---------- temperature ---------- */
  function tempDemo(el, ctx) {
    var words = ['mat', 'rug', 'sofa', 'moon', 'ran'], z = [3, 2, 1.5, -1, -2], T = 1, seen = {};
    var b = L.bars(el, words);
    var s = M4.slider(el, { min: 0.1, max: 3, step: 0.05, value: 1, label: 'temperature \\(T\\)', format: function (v) { return v.toFixed(2); }, onInput: function (v) { T = v; draw(); } });
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, el);
    var txt = M4.el('div', { class: 'emb-text' }, el);
    M4.button(row, 'Sample 12 words', function () {
      var p = L.softmax(z, T), outw = [];
      for (var k = 0; k < 12; k++) {
        var u = Math.random(), i = 0;
        while (i < p.length - 1 && u > p[i]) { u -= p[i]; i++; }
        outw.push(words[i]);
      }
      txt.innerHTML = outw.join(' ');
      if (T < 0.4) seen.low = 1;
      if (T > 2) seen.high = 1;
      if (seen.low && seen.high) ctx.solved('At a low temperature almost every sample is mat. At a high temperature even moon and ran show up.');
    }, { primary: true });
    function draw() { var p = L.softmax(z, T); b.set(p, p.indexOf(Math.max.apply(null, p))); }
    draw();
    void s;
  }

  /* ---------- a bigram model ---------- */
  var CORPUS = [
    'the cat sat on the mat .',
    'the dog sat on the rug .',
    'the cat saw the dog .',
    'the dog chased the cat .',
    'a bird sat on the dog .',
    'the cat ate the fish .',
    'a dog ate a bone .'
  ];
  var BI = {};
  CORPUS.forEach(function (s) {
    var t = s.split(' ');
    for (var i = 0; i + 1 < t.length; i++) {
      BI[t[i]] = BI[t[i]] || {};
      BI[t[i]][t[i + 1]] = (BI[t[i]][t[i + 1]] || 0) + 1;
    }
  });
  function nextDist(w) {
    var c = BI[w] || {}, ks = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
    var n = ks.reduce(function (a, k) { return a + c[k]; }, 0);
    return { words: ks, counts: ks.map(function (k) { return c[k]; }), p: ks.map(function (k) { return c[k] / n; }), n: n };
  }

  function bigramDemo(el, ctx) {
    var corp = M4.el('div', { class: 'm4-note', html: CORPUS.join('<br>') }, el);
    corp.style.textAlign = 'center';
    var txt = M4.el('div', { class: 'emb-text' }, el);
    var cap = M4.el('div', { class: 'm4-cap' }, el);
    var holder = M4.el('div', null, el);
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, el);
    var sent = [], done = 0;
    var nextBtn = M4.button(row, 'Next word', step, { primary: true });
    M4.button(row, 'Start over', reset);
    function show() {
      var cur = sent[sent.length - 1];
      txt.innerHTML = sent.slice(0, -1).join(' ') + ' <b>' + cur + '</b>';
      holder.innerHTML = '';
      if (cur === '.') { cap.innerHTML = 'The sentence is complete.'; nextBtn.disabled = true; return; }
      var d = nextDist(cur);
      cap.innerHTML = 'Counts of the words that follow <b>' + cur + '</b> in the corpus, divided by ' + d.n;
      L.bars(holder, d.words, { fmt: function (v) { return v.toFixed(2); } }).set(d.p, -1);
      nextBtn.disabled = false;
    }
    function step() {
      var d = nextDist(sent[sent.length - 1]);
      var u = Math.random(), i = 0;
      while (i < d.p.length - 1 && u > d.p[i]) { u -= d.p[i]; i++; }
      sent.push(d.words[i]);
      show();
      if (d.words[i] === '.') {
        done++;
        var line = sent.join(' ');
        var novel = CORPUS.indexOf(line) < 0;
        if (novel || done >= 3) ctx.solved(novel ? 'This sentence is not in the corpus. The model combined pieces of different sentences.' : 'Every sentence is built from word pairs that occur in the corpus.');
      }
    }
    function reset() { sent = [Math.random() < 0.75 ? 'the' : 'a']; show(); }
    reset();
  }

  M4.lesson({
    id: 'emb-s2',
    module: 'language',
    title: 'Predicting the next word',
    summary: 'A language model takes a context of words and assigns a probability to every possible next word.',
    minutes: 15,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>Every large language model is trained on one task, predicting the next word. This lesson builds that prediction from scores, probabilities and counts. After this lesson you can</p>' +
          '<ul><li>turn a vector of scores into probabilities with softmax and adjust them with a temperature,</li>' +
          '<li>estimate next word probabilities by counting word pairs in a text,</li>' +
          '<li>compute the cross-entropy loss and the perplexity of a prediction.</li></ul>'
      },
      {
        kind: 'text',
        title: 'One word at a time',
        html: '<p>A <b>language model</b> assigns a probability to a sequence of words \\(w_1, w_2, \\dots, w_n\\). The chain rule of probability splits it into one prediction per position,</p>' +
          '\\[ p(w_1, \\dots, w_n) = p(w_1) \\, p(w_2 \\mid w_1) \\, p(w_3 \\mid w_1, w_2) \\cdots p(w_n \\mid w_1, \\dots, w_{n-1}). \\]' +
          '<p>So the model only needs one skill: given the words so far, give a probability to every word in the vocabulary. To write text, it samples a word, appends it and repeats.</p>'
      },
      {
        kind: 'explore',
        title: 'Scores to probabilities',
        html: '<p>The network outputs one score per word, called a <b>logit</b> \\(z_i\\). Softmax turns the scores into probabilities,</p>' +
          '\\[ p_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}. \\]' +
          '<p>Move the sliders. What happens when you add the same amount to every logit? What happens when one logit is much larger than the others?</p>',
        mount: function (el) { logitDemo(el); }
      },
      {
        kind: 'exercise',
        title: 'Practice: softmax',
        html: '<p>Compute the probability of the first word. Round to two decimals.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 3,
            gen: function () {
              var z = [M4.pick([0, 1, 2]), M4.pick([0, 1]), M4.pick([-1, 0])];
              var e = z.map(Math.exp), s = e[0] + e[1] + e[2], p = e[0] / s;
              return {
                q: 'The logits are \\(z = ' + M4.col(z) + '\\). What is \\(p_1\\)?',
                answer: p, tol: 0.011,
                hint: 'Use \\(e \\approx 2.718\\), \\(e^2 \\approx 7.39\\) and \\(e^{-1} \\approx 0.37\\).',
                explain: '\\(p_1 = ' + e[0].toFixed(2) + ' / (' + e.map(function (v) { return v.toFixed(2); }).join(' + ') + ') \\approx ' + p.toFixed(2) + '\\).'
              };
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Temperature',
        html: '<p>Before the softmax, a model can divide every logit by a <b>temperature</b> \\(T\\). Sample a few words at a temperature below 0.4 and a few above 2.</p>',
        mount: function (el, ctx) { tempDemo(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'A very cold model',
        html: '<p>What does sampling do as the temperature approaches 0?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['It always picks the word with the largest logit.', 'It picks every word with equal probability.', 'It picks the word with the smallest logit.', 'It stops producing words.'],
            correct: 0,
            onCorrect: function () { ctx.solved('Dividing by a small \\(T\\) stretches the gaps between logits, so the largest logit takes almost all the probability. This is called greedy decoding.'); },
            onWrong: function () { ctx.wrong('Try a temperature of 0.1 on the previous step and look at the bars.'); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Counting word pairs',
        html: '<p>The simplest language model looks only at the previous word. It estimates \\(p(\\text{next} \\mid \\text{previous})\\) by counting word pairs in a text. This is a <b>bigram model</b>. Press the button to write sentences with it.</p>',
        mount: function (el, ctx) { bigramDemo(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'A probability from counts',
        html: '<p>In the corpus of the previous step, the word <i>the</i> appears 11 times before another word, and 4 of these times the next word is <i>cat</i>. What is \\(p(\\text{cat} \\mid \\text{the})\\) under the bigram model?</p>',
        mount: function (el, ctx) {
          var d = nextDist('the'), i = d.words.indexOf('cat');
          M4.numberInput(el, {
            answer: d.counts[i] / d.n, tolerance: 0.006,
            onCorrect: function () { ctx.solved('\\(4 / 11 \\approx 0.36\\). A bigram model is nothing more than a table of such fractions.'); },
            onWrong: function () { ctx.wrong('Divide the number of times <i>the cat</i> occurs by the number of times <i>the</i> is followed by any word.'); }
          });
        }
      },
      {
        kind: 'text',
        title: 'The training loss',
        html: '<p>A bigram model forgets everything except the last word. A neural language model reads the whole context, but it is trained with the same idea. For each position in the training text, the loss is the surprise of the true next word,</p>' +
          '\\[ \\ell = -\\ln p(w_{\\text{true}} \\mid \\text{context}). \\]' +
          '<p>This is the cross-entropy loss. Averaged over a text and exponentiated, it gives the <b>perplexity</b>, \\(e^{\\bar{\\ell}}\\). A perplexity of 20 means the model is as uncertain as if it chose among 20 equally likely words at every position.</p>'
      },
      {
        kind: 'exercise',
        title: 'Practice: cross-entropy',
        html: '<p>The model gives probability \\(p\\) to the true next word. Compute the loss \\(-\\ln p\\). Round to two decimals.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 3,
            gen: function () {
              var p = M4.pick([0.5, 0.25, 0.1, 0.8, 0.05, 0.2, 0.9, 0.01]);
              var l = -Math.log(p);
              return {
                q: '\\(p = ' + p + '\\). What is the loss?',
                answer: l, tol: 0.011,
                hint: '\\(\\ln 2 \\approx 0.69\\) and \\(\\ln 10 \\approx 2.30\\).',
                explain: '\\(-\\ln ' + p + ' \\approx ' + l.toFixed(2) + '\\).' + (p >= 0.8 ? ' A confident correct prediction costs little.' : p <= 0.05 ? ' A confident wrong prediction is expensive.' : '')
              };
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Perplexity',
        html: '<p>On a test text, a model gives probability \\(\\tfrac{1}{8}\\) to every true next word. What is its perplexity?</p>',
        mount: function (el, ctx) {
          M4.numberInput(el, {
            answer: 8, tolerance: 0.01,
            onCorrect: function () { ctx.solved('The average loss is \\(\\ln 8\\), and \\(e^{\\ln 8} = 8\\). The model is as uncertain as a fair choice among 8 words.'); },
            onWrong: function () { ctx.wrong('Every loss equals \\(-\\ln \\tfrac{1}{8} = \\ln 8\\). Exponentiate the average.'); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>A language model predicts a probability for every possible next word, and the chain rule turns these predictions into the probability of a whole text.</li>' +
          '<li>Softmax turns logits into probabilities, and the temperature controls how much sampling prefers the most likely word.</li>' +
          '<li>Training minimizes the cross-entropy of the true next word, and perplexity reports the same loss as an effective number of choices.</li></ul>'
      }
    ]
  });
})();
