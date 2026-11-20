(function () {
  'use strict';

  var C = M4.colors, L = M4.lang;

  if (!document.getElementById('tf-style')) {
    var st = document.createElement('style');
    st.id = 'tf-style';
    st.textContent = [
      '.tf-cols{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:8px 0}',
      '.tf-col{background:#fff;border:1px solid ' + C.line + ';border-radius:10px;padding:10px 12px}',
      '.tf-col h4{margin:0 0 8px;text-align:center;font-weight:500;color:' + C.muted + ';font-size:15px}',
      '.tf-out{display:grid;grid-template-columns:auto auto;justify-content:center;gap:6px 14px;font-size:17px;align-items:center}',
      '.tf-out .w{font-family:ui-monospace,Menlo,monospace;text-align:right}',
      '.tf-out .v{font-variant-numeric:tabular-nums;color:' + C.muted + '}',
      '.tf-out .hi{color:' + C.orange + ';font-weight:700}',
      '.tf-grid{display:grid;gap:3px;justify-content:center;margin:10px auto;font-variant-numeric:tabular-nums}',
      '.tf-grid .lab{font-family:ui-monospace,Menlo,monospace;font-size:14px;display:flex;align-items:center;justify-content:center;color:' + C.ink + '}',
      '.tf-grid .rl{justify-content:flex-end;padding-right:6px;cursor:pointer;border-radius:5px}',
      '.tf-grid .rl:hover{background:' + C.paper + '}',
      '.tf-grid .rl.on{font-weight:700;color:' + C.orange + '}',
      '.tf-grid .cell{width:50px;height:34px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;border:1px solid transparent;transition:background .25s}',
      '.tf-grid .cell.off{background:repeating-linear-gradient(45deg,' + C.paper + ',' + C.paper + ' 4px,#e9e4d8 4px,#e9e4d8 8px);color:' + C.muted + '}',
      '.tf-grid .cell.row{border-color:' + C.orange + '}',
      '.tf-axis{text-align:center;color:' + C.muted + ';font-size:14px}',
      '.tf-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0}',
      '.tf-chip{font-family:ui-monospace,Menlo,monospace;font-size:17px;padding:6px 11px;border-radius:7px;border:1.5px solid ' + C.line + ';background:#fff;transition:background .25s}',
      'button.tf-chip{cursor:pointer}',
      '.tf-chip.q{border-color:' + C.ink + ';border-width:2.5px}',
      '.tf-head{margin:10px 0 2px;text-align:center;color:' + C.muted + ';font-size:15px}',
      '.tf-flow{display:flex;flex-direction:column;align-items:center;gap:0;max-width:520px;margin:8px auto}',
      '.tf-stage{display:none;width:100%;box-sizing:border-box;background:#fff;border:1px solid ' + C.line + ';border-radius:10px;padding:10px 14px;text-align:center}',
      '.tf-stage.show{display:block;animation:tfIn .45s ease-out}',
      '@keyframes tfIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
      '.tf-stage h4{margin:0 0 6px;font-size:16px;font-weight:600}',
      '.tf-stage .sub{color:' + C.muted + ';font-size:15px}',
      '.tf-arrow{display:none;height:22px;width:2px;background:' + C.line + ';position:relative}',
      '.tf-arrow.show{display:block;animation:tfIn .45s ease-out}',
      '.tf-arrow:after{content:"";position:absolute;left:-5px;bottom:-2px;border:6px solid transparent;border-top-color:' + C.line + '}',
      '.tf-vec{display:inline-flex;gap:4px;margin:0 6px;vertical-align:middle}',
      '.tf-vec i{display:inline-block;width:12px;height:26px;border-radius:3px}',
      '@media (max-width:560px){.tf-cols{grid-template-columns:1fr}.tf-grid .cell{width:38px;height:34px;font-size:11px}.tf-grid .lab{font-size:12px}}'
    ].join('');
    document.head.appendChild(st);
  }

  function attend(X, scale, mask) {
    return X.map(function (xi, i) {
      var idx = [], s = [];
      X.forEach(function (xj, j) { if (!mask || j <= i) { idx.push(j); s.push(scale * (xi[0] * xj[0] + xi[1] * xj[1])); } });
      var a = L.softmax(s), o = [0, 0];
      idx.forEach(function (j, k) { o[0] += a[k] * X[j][0]; o[1] += a[k] * X[j][1]; });
      return o;
    });
  }
  function vec(v) { return '(' + L.f2(v[0]) + ', ' + L.f2(v[1]) + ')'; }

  /* ---------- word order ---------- */
  var WV = { dog: [1, 0.2], bites: [0.1, 1], man: [0.9, -0.3] };
  var POS = [[0, 0.8], [0.7, -0.4], [-0.7, -0.4]];
  var SENT = [['dog', 'bites', 'man'], ['man', 'bites', 'dog']];

  function orderDemo(el, ctx) {
    var cols = M4.el('div', { class: 'tf-cols' }, el);
    var boxes = SENT.map(function (s) {
      var c = M4.el('div', { class: 'tf-col' }, cols);
      M4.el('h4', { text: '"' + s.join(' ') + '"' }, c);
      return M4.el('div', { class: 'tf-out' }, c);
    });
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin:14px 0' }, el);
    var on = false, seenSame = false;
    var btn = M4.button(row, 'Add position vectors', function () { on = !on; draw(); }, { primary: true });
    var out = M4.el('div', { class: 'm4-readout' }, el);
    function draw() {
      btn.textContent = on ? 'Remove position vectors' : 'Add position vectors';
      var dogs = [];
      SENT.forEach(function (s, k) {
        var X = s.map(function (w, i) { var v = WV[w]; return on ? [v[0] + POS[i][0], v[1] + POS[i][1]] : v.slice(); });
        var O = attend(X, 2, false);
        var h = '';
        s.forEach(function (w, i) {
          var c = w === 'dog' ? ' hi' : '';
          h += '<span class="w' + c + '">' + w + '</span><span class="v' + c + '">' + vec(O[i]) + '</span>';
          if (w === 'dog') dogs.push(O[i]);
        });
        boxes[k].innerHTML = h;
      });
      var same = Math.abs(dogs[0][0] - dogs[1][0]) + Math.abs(dogs[0][1] - dogs[1][1]) < 1e-9;
      out.innerHTML = '<span>output of <b>dog</b> in the two sentences</span><span><b>' + (same ? 'identical' : 'different') + '</b></span>';
      if (same) seenSame = true;
      if (seenSame && !same) ctx.solved('Without positions, attention sees a bag of words, and the dog that bites gets the same vector as the dog that is bitten. Adding a position vector to each embedding makes the outputs depend on order.');
    }
    draw();
  }

  /* ---------- the causal mask ---------- */
  var MT = ['the', 'cat', 'sat', 'on', 'the', 'mat'];
  function maskScores() {
    var n = MT.length, S = [];
    for (var i = 0; i < n; i++) {
      S.push([]);
      for (var j = 0; j < n; j++) S[i].push((j === i + 1 ? 2.2 : 0) + (j === i - 1 ? 1.2 : 0) + (j === i ? 0.6 : 0));
    }
    S[2][1] += 0.6; S[3][2] += 0.6; S[5][2] += 0.8; S[5][3] += 0.4;
    return S;
  }

  function heat(w) {
    var a = Math.max(0, Math.min(1, w));
    return 'rgba(224,122,47,' + (0.08 + 0.85 * a).toFixed(3) + ')';
  }

  function maskDemo(el, ctx) {
    var S = maskScores(), n = MT.length, mask = false, sel = 2, seen = {};
    M4.el('div', { class: 'tf-axis', text: 'keys, the words being looked at' }, el);
    var g = M4.el('div', { class: 'tf-grid' }, el);
    g.style.gridTemplateColumns = 'auto repeat(' + n + ', auto)';
    M4.el('div', null, g);
    MT.forEach(function (w) { M4.el('div', { class: 'lab', text: w }, g); });
    var rls = [], cells = [];
    MT.forEach(function (w, i) {
      var rl = M4.el('div', { class: 'lab rl', text: w }, g);
      rl.addEventListener('click', function () { sel = i; draw(); });
      rls.push(rl);
      cells.push(MT.map(function (_, j) {
        var c = M4.el('div', { class: 'cell' }, g);
        c.addEventListener('click', function () { sel = i; draw(); });
        return c;
      }));
    });
    M4.el('div', { class: 'tf-axis', text: 'rows are queries. Click a row.' }, el);
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin:14px 0' }, el);
    var btn = M4.button(row, 'Turn on the causal mask', function () { mask = !mask; seen = {}; draw(); }, { primary: true });
    var out = M4.el('div', { class: 'm4-readout' }, el);
    function draw() {
      btn.textContent = mask ? 'Turn off the causal mask' : 'Turn on the causal mask';
      var allowed = mask ? n * (n + 1) / 2 : n * n;
      for (var i = 0; i < n; i++) {
        var idx = [], s = [];
        for (var j = 0; j < n; j++) if (!mask || j <= i) { idx.push(j); s.push(S[i][j]); }
        var a = L.softmax(s), W = MT.map(function () { return null; });
        idx.forEach(function (j, k) { W[j] = a[k]; });
        rls[i].classList.toggle('on', i === sel);
        for (var j2 = 0; j2 < n; j2++) {
          var c = cells[i][j2];
          c.classList.toggle('row', i === sel);
          if (W[j2] == null) { c.className = 'cell off' + (i === sel ? ' row' : ''); c.style.background = ''; c.textContent = '0'; }
          else { c.className = 'cell' + (i === sel ? ' row' : ''); c.style.background = heat(W[j2]); c.textContent = W[j2].toFixed(2); }
        }
        if (i === sel) {
          var best = idx[a.indexOf(Math.max.apply(null, a))];
          var nextNote = (!mask && best === i + 1) ? ', which is the word it has to predict' : '';
          out.innerHTML = '<span><b>' + MT[i] + '</b> looks most at <b>' + MT[best] + '</b>' + nextNote + '</span><span>scores used ' + allowed + ' of ' + n * n + '</span>';
        }
      }
      if (mask) {
        seen[sel] = true;
        if (Object.keys(seen).length >= 3) ctx.solved('With the mask, row \\(i\\) only keeps the keys \\(j \\le i\\). Six words leave \\(1 + 2 + \\dots + 6 = 21\\) of the 36 scores. Without the mask, each word looks mostly at the next word, the one it should predict.');
      }
    }
    draw();
  }

  /* ---------- two heads ---------- */
  var HT = ['the', 'cat', 'sat', 'because', 'it', 'was', 'tired'];
  function headWeights(h, i) {
    var s = [];
    for (var j = 0; j <= i; j++) {
      var v = 0;
      if (h === 0) v = (j === i - 1 ? 4 : 0) + (i === 0 && j === 0 ? 4 : 0);
      else v = ((i === 2 || i >= 4) && j === 1 ? 4 : 0) + (j === i ? 1.5 : 0);
      s.push(v);
    }
    return L.softmax(s);
  }

  function headsDemo(el, ctx) {
    M4.el('div', { class: 'tf-head', text: 'Click a word to make it the query' }, el);
    var pickRow = M4.el('div', { class: 'tf-chips' }, el);
    var sel = 4, seen = {};
    var pick = HT.map(function (w, i) {
      var b = M4.el('button', { class: 'tf-chip', type: 'button', text: w }, pickRow);
      b.addEventListener('click', function () { sel = i; draw(); });
      return b;
    });
    var rows = ['head 1', 'head 2'].map(function (name) {
      M4.el('div', { class: 'tf-head', text: name }, el);
      var r = M4.el('div', { class: 'tf-chips' }, el);
      return HT.map(function (w) { return M4.el('span', { class: 'tf-chip', text: w }, r); });
    });
    var out = M4.el('div', { class: 'm4-readout' }, el);
    function draw() {
      pick.forEach(function (b, i) { b.classList.toggle('q', i === sel); });
      var best = [];
      rows.forEach(function (chips, h) {
        var a = headWeights(h, sel);
        chips.forEach(function (c, j) {
          c.classList.toggle('q', j === sel);
          c.style.background = j <= sel ? heat(a[j]) : '#fff';
          c.style.opacity = j <= sel ? 1 : 0.35;
        });
        best.push(HT[a.indexOf(Math.max.apply(null, a))]);
      });
      out.innerHTML = '<span>head 1 looks at <b>' + best[0] + '</b></span><span>head 2 looks at <b>' + best[1] + '</b></span>';
      seen[sel] = true;
      if (seen[4] && Object.keys(seen).length >= 3) ctx.solved('Head 1 always looks at the previous word, which helps with local phrases. Head 2 links the verbs and the pronoun back to cat. A single softmax could not do both at once.');
    }
    draw();
  }

  /* ---------- the whole model ---------- */
  function flowDemo(el, ctx) {
    var f = M4.el('div', { class: 'tf-flow' }, el);
    function bar(vals, color) {
      return '<span class="tf-vec">' + vals.map(function (v) { return '<i style="background:' + color + ';opacity:' + (0.25 + 0.75 * v) + '"></i>'; }).join('') + '</span>';
    }
    var stages = [
      ['Tokens', '<div class="tf-chips"><span class="tf-chip">the</span><span class="tf-chip">cat</span><span class="tf-chip">sat</span><span class="tf-chip">on</span><span class="tf-chip">the</span></div><div class="sub">token ids from the tokenizer</div>'],
      ['Embedding plus position', bar([0.9, 0.2, 0.6, 0.4], C.blue) + '\\(+\\)' + bar([0.3, 0.7, 0.1, 0.5], C.purple) + '<div class="sub">one vector of size \\(d\\) for every token</div>'],
      ['Transformer blocks, repeated \\(N\\) times', '<div>\\(x \\leftarrow x + \\operatorname{Attention}(x)\\)</div><div>\\(x \\leftarrow x + \\operatorname{MLP}(x)\\)</div><div class="sub">attention mixes information between words, the MLP processes each word on its own</div>'],
      ['Scores for every word in the vocabulary', bar([0.95, 0.3, 0.6, 0.15], C.orange) + '<div class="sub">the last vector times the embedding table, one score per vocabulary word</div>'],
      ['Softmax', '<div class="sub">probabilities for the next word</div>']
    ];
    var shown = 0, els = [];
    stages.forEach(function (s, i) {
      if (i) els.push(M4.el('div', { class: 'tf-arrow' }, f));
      var d = M4.el('div', { class: 'tf-stage' }, f);
      M4.el('h4', { html: s[0] }, d);
      M4.el('div', { html: s[1] }, d);
      els.push(d);
    });
    var probs = L.bars(els[els.length - 1], ['mat', 'floor', 'sofa', 'moon'], { color: C.orange });
    probs.set([0.46, 0.27, 0.22, 0.05], 0);
    M4.typeset(f);
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin:14px 0' }, el);
    var btn = M4.button(row, 'Next step', step, { primary: true });
    function step() {
      if (shown >= stages.length) return;
      var k = shown * 2;
      if (k > 0) els[k - 1].classList.add('show');
      els[k].classList.add('show');
      shown++;
      if (shown === stages.length) {
        btn.disabled = true;
        ctx.solved('That is the whole model. Training adjusts the embeddings and the weights of every block so that the probability of the true next word goes up.');
      }
    }
    step();
  }

  M4.lesson({
    id: 'emb-s4',
    module: 'language',
    title: 'Inside a transformer',
    summary: 'Positions, the causal mask, several heads and the residual stream turn attention into a language model.',
    minutes: 20,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>Attention lets each word gather information from other words. A transformer adds a few more ingredients around it. After this lesson you can</p>' +
          '<ul><li>explain why a transformer needs position vectors and a causal mask,</li>' +
          '<li>describe what several attention heads add over one,</li>' +
          '<li>trace a sentence through the blocks of a transformer and count its parameters.</li></ul>'
      },
      {
        kind: 'exercise',
        title: 'Word order',
        html: '<p>Each column runs one attention layer over a sentence and lists the output vector of every word. Both sentences contain the same three words in a different order. Compare the output of <b>dog</b>, then add a position vector to each embedding.</p>',
        mount: function (el, ctx) { orderDemo(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'The causal mask',
        html: '<p>A language model is trained to predict each next word. The grid shows the attention weights of every word, one row per query. Click a few rows, then turn on the causal mask and click at least three rows.</p>',
        hint: 'With the mask, a row can only use the words at or before its own position.',
        mount: function (el, ctx) { maskDemo(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'Why the mask',
        html: '<p>During training, the model predicts the next word at every position of a sentence in one pass. What would go wrong without the mask?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['Each word could read the word it is supposed to predict.', 'The softmax would no longer sum to one.', 'The model would need more parameters.', 'Long sentences would no longer fit into memory.'],
            correct: 0,
            onCorrect: function () { ctx.solved('The model would learn to copy the next word, which is useless when it generates text and the next word does not exist yet.'); },
            onWrong: function () { ctx.wrong('Think about which words a row can see without the mask.'); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Practice: counting scores',
        html: '<p>With the causal mask, how many of the attention scores of a sequence are kept?</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 3,
            gen: function () {
              var n = M4.pick([4, 5, 7, 8, 10, 12]);
              return {
                q: 'A sequence has \\(' + n + '\\) tokens. How many scores survive the mask?',
                answer: n * (n + 1) / 2, tol: 0.01,
                hint: 'Row \\(i\\) keeps \\(i\\) scores. Add up \\(1 + 2 + \\dots + n\\).',
                explain: '\\(1 + 2 + \\dots + ' + n + ' = ' + n + ' \\cdot ' + (n + 1) + ' / 2 = ' + n * (n + 1) / 2 + '\\), a bit more than half of the \\(' + n * n + '\\) scores.'
              };
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Several heads',
        html: '<p>One softmax tends to concentrate on one place. A word often needs several kinds of information at once, such as the word right before it and the noun a pronoun refers to.</p>' +
          '<p>A transformer runs \\(h\\) attention <b>heads</b> side by side. Each head has its own \\(W_Q\\), \\(W_K\\) and \\(W_V\\) and works in a smaller dimension \\(d / h\\). The outputs of the heads are concatenated and multiplied by one more matrix \\(W_O\\), so the result has size \\(d\\) again.</p>'
      },
      {
        kind: 'explore',
        title: 'Two heads, two jobs',
        html: '<p>Two heads of a small trained model read the same sentence. The shading shows the attention weights of the query word, and words after the query are hidden by the mask. Start with <b>it</b>, then try two more words.</p>',
        mount: function (el, ctx) { headsDemo(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'The size of a head',
        html: '<p>A model has \\(d = 768\\) and 12 heads. What is the dimension of the queries and keys of one head?</p>',
        mount: function (el, ctx) {
          M4.numberInput(el, {
            answer: 64, tolerance: 0.01,
            onCorrect: function () { ctx.solved('\\(768 / 12 = 64\\). Twelve heads of size 64 cost about as much as one head of size 768.'); },
            onWrong: function () { ctx.wrong('The heads split the dimension \\(d\\) between them.'); }
          });
        }
      },
      {
        kind: 'text',
        title: 'A transformer block',
        html: '<p>A block applies attention and then a small MLP to every word, and each of them <i>adds</i> its output to the vector it received,</p>' +
          '\\[ x \\leftarrow x + \\operatorname{Attention}(\\operatorname{LN}(x)), \\qquad x \\leftarrow x + \\operatorname{MLP}(\\operatorname{LN}(x)). \\]' +
          '<p>The vector \\(x\\) that flows through all the blocks is called the <b>residual stream</b>. Each block reads from it and writes a correction into it. LN is layer normalization, which rescales each vector to mean 0 and variance 1 before it enters attention or the MLP.</p>'
      },
      {
        kind: 'exercise',
        title: 'An empty block',
        html: '<p>At the start of training, the attention and the MLP of a block return outputs close to zero. What does the block compute?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['About the identity, it passes \\(x\\) through unchanged.', 'About the zero vector.', 'A random vector.', 'The softmax of \\(x\\).'],
            correct: 0,
            onCorrect: function () { ctx.solved('\\(x + 0 = x\\). Because of the additions, the gradient also has a direct path from the loss back to the first layer, which is why models with a hundred blocks still train.'); },
            onWrong: function () { ctx.wrong('Look at the plus sign in \\(x + \\operatorname{Attention}(x)\\).'); }
          });
        }
      },
      {
        kind: 'explore',
        title: 'The whole model',
        html: '<p>Follow a sentence through a language model. Press <b>Next step</b> to add one stage at a time.</p>',
        mount: function (el, ctx) { flowDemo(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'Counting parameters',
        html: '<p>In one block, attention has four \\(d \\times d\\) matrices \\(W_Q, W_K, W_V, W_O\\). The MLP maps \\(d\\) to \\(4d\\) and back, which is \\(8d^2\\) weights. Ignoring biases, one block has \\(12 d^2\\) parameters. How many million parameters do 12 blocks with \\(d = 768\\) have?</p>',
        hint: 'Compute \\(12 \\cdot 12 \\cdot 768^2\\) and divide by one million.',
        mount: function (el, ctx) {
          M4.numberInput(el, {
            answer: 84.93, tolerance: 0.5, label: 'million',
            onCorrect: function () { ctx.solved('\\(144 \\cdot 589{,}824 \\approx 84.9\\) million. Add the 38.4 million of the embedding table from the tokens lesson and you get roughly the 124 million parameters of GPT-2 small.'); },
            onWrong: function () { ctx.wrong('\\(768^2 = 589{,}824\\). Multiply by 12 for one block and by 12 again for the blocks.'); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>Attention alone ignores word order, so position vectors are added to the embeddings, and a causal mask stops each word from seeing the words after it.</li>' +
          '<li>Several heads attend to different words for different purposes, and their outputs are concatenated.</li>' +
          '<li>Each block adds the outputs of attention and an MLP to the residual stream, and about \\(12 d^2\\) parameters per block make up most of the model.</li></ul>'
      }
    ]
  });
})();
