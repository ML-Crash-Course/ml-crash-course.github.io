(function () {
  'use strict';

  var C = M4.colors;

  function injectStyle() {
    if (document.getElementById('tok-style')) return;
    var s = document.createElement('style');
    s.id = 'tok-style';
    s.textContent = [
      '.tok-rows{display:flex;flex-direction:column;gap:16px;margin:10px auto;max-width:640px}',
      '.tok-row{display:grid;grid-template-columns:110px 1fr 70px;align-items:center;gap:12px}',
      '.tok-row .lab{font-size:16px;color:' + C.muted + ';text-align:right}',
      '.tok-row .num{font-size:17px;font-variant-numeric:tabular-nums;color:' + C.ink + '}',
      '.tok-chips{display:flex;flex-wrap:wrap;gap:4px}',
      '.tok-chip{display:inline-block;padding:3px 7px;border-radius:5px;font-size:17px;font-family:ui-monospace,Menlo,monospace;background:#eaf0f8;border:1px solid #c9d6e8;color:' + C.ink + ';white-space:pre}',
      '.tok-chip.alt{background:#f6ead9;border-color:#e6cfae}',
      '.tok-chip.new{animation:tokpop .35s ease}',
      '@keyframes tokpop{0%{transform:scale(1.25)}100%{transform:scale(1)}}',
      '.tok-words{display:flex;flex-direction:column;gap:8px;margin:8px auto;max-width:300px}',
      '.tok-word{display:grid;grid-template-columns:1fr 54px;align-items:center;gap:10px}',
      '.tok-word .cnt{font-size:16px;color:' + C.muted + ';font-variant-numeric:tabular-nums}',
      '.tok-pairs{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:14px auto 6px;max-width:600px}',
      '.tok-pair{font-family:ui-monospace,Menlo,monospace;font-size:16px;padding:6px 10px;border-radius:7px;border:1px solid ' + C.line + ';background:' + C.card + ';cursor:pointer;color:' + C.ink + '}',
      '.tok-pair:hover{border-color:' + C.blue + '}',
      '.tok-pair .c{color:' + C.muted + ';margin-left:8px;padding-left:8px;border-left:1px solid ' + C.line + ';font-family:inherit}',
      '.tok-pair.bad{border-color:' + C.red + ';color:' + C.red + '}',
      '.tok-cap{text-align:center;font-size:15px;color:' + C.muted + ';margin-top:12px}',
      '.tok-merges{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:6px auto;max-width:600px;min-height:30px}',
      '.tok-in{display:flex;justify-content:center;margin:10px 0}',
      '.tok-in input{font-size:20px;padding:8px 12px;border:1px solid ' + C.line + ';border-radius:8px;width:260px;text-align:center;font-family:inherit;background:' + C.card + ';color:' + C.ink + '}',
      '.tok-out{display:flex;justify-content:center;flex-wrap:wrap;gap:4px;min-height:36px;margin:8px 0}',
      '@media (max-width:560px){.tok-row{grid-template-columns:1fr;gap:4px}.tok-row .lab{text-align:left}}'
    ].join('');
    document.head.appendChild(s);
  }
  injectStyle();

  function chips(parent, toks, alt, fresh) {
    parent.innerHTML = '';
    toks.forEach(function (t, i) {
      M4.el('span', { class: 'tok-chip' + (alt && i % 2 ? ' alt' : '') + (fresh && fresh(t) ? ' new' : ''), text: t }, parent);
    });
  }

  /* ---------- three ways to split a sentence ---------- */
  function splitDemo(el) {
    var rows = [
      ['characters', 'the unbelievable tokenizer'.split('')],
      ['subwords', ['the', ' un', 'believ', 'able', ' token', 'izer']],
      ['words', ['the', ' unbelievable', ' tokenizer']]
    ];
    var box = M4.el('div', { class: 'tok-rows' }, el);
    rows.forEach(function (r) {
      var row = M4.el('div', { class: 'tok-row' }, box);
      M4.el('div', { class: 'lab', text: r[0] }, row);
      chips(M4.el('div', { class: 'tok-chips' }, row), r[1].map(function (t) { return t.replace(/ /g, '\u2423'); }), true);
      M4.el('div', { class: 'num', text: r[1].length + ' tokens' }, row);
    });
  }

  /* ---------- byte pair encoding by hand ---------- */
  var CORPUS = [['low', 5], ['lower', 2], ['newest', 6], ['widest', 3]];

  function countPairs(words) {
    var cnt = {}, order = [];
    words.forEach(function (w) {
      for (var i = 0; i < w.s.length - 1; i++) {
        var k = w.s[i] + ' ' + w.s[i + 1];
        if (!(k in cnt)) { cnt[k] = 0; order.push(k); }
        cnt[k] += w.n;
      }
    });
    return { cnt: cnt, order: order };
  }
  function mergeWord(s, a, b) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      if (i < s.length - 1 && s[i] === a && s[i + 1] === b) { out.push(a + b); i++; }
      else out.push(s[i]);
    }
    return out;
  }

  function bpeDemo(el, ctx) {
    var GOAL = 4;
    var words, merges;
    var list = M4.el('div', { class: 'tok-words' }, el);
    M4.el('div', { class: 'tok-cap', text: 'Adjacent pairs and how often they occur. Click the most frequent one.' }, el);
    var pairs = M4.el('div', { class: 'tok-pairs' }, el);
    M4.el('div', { class: 'tok-cap', text: 'Merges learned so far' }, el);
    var mlist = M4.el('div', { class: 'tok-merges' }, el);
    var out = M4.el('div', { class: 'm4-readout' }, el);
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, el);
    M4.button(row, 'Start over', function () { reset(); });

    function reset() {
      words = CORPUS.map(function (c) { return { s: c[0].split(''), n: c[1] }; });
      merges = [];
      draw(null);
    }
    function total() { return words.reduce(function (a, w) { return a + w.s.length * w.n; }, 0); }
    function draw(fresh) {
      list.innerHTML = '';
      words.forEach(function (w) {
        var r = M4.el('div', { class: 'tok-word' }, list);
        chips(M4.el('div', { class: 'tok-chips' }, r), w.s, false, function (t) { return t === fresh; });
        M4.el('div', { class: 'cnt', text: '× ' + w.n }, r);
      });
      var pc = countPairs(words);
      var mx = Math.max.apply(null, pc.order.map(function (k) { return pc.cnt[k]; }));
      pairs.innerHTML = '';
      pc.order.forEach(function (k) {
        var b = M4.el('button', { type: 'button', class: 'tok-pair' }, pairs);
        b.innerHTML = k.replace(' ', ' + ') + '<span class="c">' + pc.cnt[k] + '</span>';
        b.addEventListener('click', function () {
          if (merges.length >= GOAL) return;
          if (pc.cnt[k] < mx) {
            b.classList.add('bad');
            ctx.wrong('This pair occurs ' + pc.cnt[k] + ' times. Another pair occurs ' + mx + ' times.');
            return;
          }
          var ab = k.split(' ');
          words.forEach(function (w) { w.s = mergeWord(w.s, ab[0], ab[1]); });
          merges.push(ab[0] + ab[1]);
          draw(ab[0] + ab[1]);
          if (merges.length >= GOAL) ctx.solved('Four merges turned frequent pieces such as <b>est</b> and <b>low</b> into single tokens. Real tokenizers repeat this tens of thousands of times.');
        });
      });
      mlist.innerHTML = '';
      if (merges.length) chips(mlist, merges.map(function (m, i) { return (i + 1) + '. ' + m; }), false, function (t) { return fresh && t.slice(t.indexOf(' ') + 1) === fresh; });
      else M4.el('span', { class: 'tok-cap', style: 'margin:0', text: 'none yet' }, mlist);
      out.innerHTML = '<span>merges <b>' + merges.length + ' of ' + GOAL + '</b></span><span>tokens in the corpus <b>' + total() + '</b></span>';
    }
    reset();
  }

  /* ---------- applying learned merges to new words ---------- */
  var LEARNED = [['e', 's'], ['es', 't'], ['l', 'o'], ['lo', 'w'], ['n', 'e'], ['ne', 'w'], ['new', 'est'], ['e', 'r'], ['low', 'er']];

  function tokenize(word) {
    var s = word.split('');
    LEARNED.forEach(function (m) { s = mergeWord(s, m[0], m[1]); });
    return s;
  }

  function applyDemo(el, ctx) {
    M4.el('div', { class: 'tok-cap', text: 'Merges, applied in this order' }, el);
    chips(M4.el('div', { class: 'tok-merges' }, el), LEARNED.map(function (m, i) { return (i + 1) + '. ' + m[0] + ' + ' + m[1]; }));
    var wrap = M4.el('div', { class: 'tok-in' }, el);
    var input = M4.el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', value: 'lowest' }, wrap);
    var outEl = M4.el('div', { class: 'tok-out' }, el);
    var info = M4.el('div', { class: 'm4-readout' }, el);
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, el);
    var tried = {};
    ['lowest', 'newer', 'slower', 'wider'].forEach(function (w) {
      M4.button(row, w, function () { input.value = w; draw(); });
    });
    function draw() {
      var w = input.value.toLowerCase().replace(/[^a-z]/g, '');
      if (!w) { outEl.innerHTML = ''; info.innerHTML = '<span>type a word</span>'; return; }
      var t = tokenize(w);
      chips(outEl, t, true);
      info.innerHTML = '<span>characters <b>' + w.length + '</b></span><span>tokens <b>' + t.length + '</b></span>';
      tried[w] = 1;
      if (Object.keys(tried).length >= 3) ctx.solved('Words the tokenizer never saw still get tokens. The merges reuse pieces such as <b>low</b>, <b>er</b> and <b>est</b>, and anything else falls back to single letters.');
    }
    input.addEventListener('input', draw);
    draw();
  }

  M4.lesson({
    id: 'tok-s1',
    module: 'language',
    title: 'Tokens',
    summary: 'How text becomes a sequence of numbers, and how byte pair encoding learns its pieces.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<ul><li>Compare subword tokens with characters and whole words.</li>' +
          '<li>Run byte pair encoding by hand on a small corpus.</li>' +
          '<li>Tokenize new words with learned merges and relate vocabulary size to sequence length.</li></ul>'
      },
      {
        kind: 'text',
        title: 'Three ways to split text',
        html: '<p>A neural network reads numbers, so text first becomes a list of <b>tokens</b>, each with an id in a fixed vocabulary. The same sentence can be split in very different ways. The symbol \u2423 marks a space.</p>',
        mount: function (el) { splitDemo(el); }
      },
      {
        kind: 'exercise',
        title: 'The trouble with whole words',
        html: '<p>A model has one token per English word in its training data. What happens when it meets the word <i>unfriendliest</i> for the first time?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['It has no token for it and must map it to a single "unknown" token.', 'It splits the word into its letters.', 'It picks the closest word in the vocabulary.'],
            correct: 0,
            onCorrect: function () { ctx.solved('A word vocabulary is closed. Every new word, name or typo becomes the same unknown token, and its meaning is lost. Characters avoid this but make sequences several times longer.'); },
            onWrong: function () { ctx.wrong('A pure word vocabulary has no smaller pieces to fall back on.'); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Byte pair encoding',
        html: '<p>Byte pair encoding starts from single letters and repeatedly merges the most frequent adjacent pair into a new token. Each word below appears several times in a corpus. Perform four merges.</p>',
        hint: 'Each pair count adds up the counts of all words that contain the pair.',
        mount: function (el, ctx) { bpeDemo(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'Counting a pair',
        html: '<p>The corpus contains <i>low</i> 5 times, <i>lower</i> 2 times, <i>newest</i> 6 times and <i>widest</i> 3 times, all split into letters. How often does the pair <b>w + e</b> occur?</p>',
        mount: function (el, ctx) {
          M4.numberInput(el, {
            answer: 8, tolerance: 0.01,
            onCorrect: function () { ctx.solved('It occurs in <i>lower</i> (2 times) and <i>newest</i> (6 times). <i>widest</i> has w + i, and <i>low</i> ends after the w.'); },
            onWrong: function () { ctx.wrong('Look for a w directly followed by an e, and add the counts of those words.'); }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Tokenizing new words',
        html: '<p>A trained tokenizer stores its merges in order. To split a new word, it starts from letters and applies every merge in that order. Try at least three words.</p>',
        mount: function (el, ctx) { applyDemo(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'Practice: apply the merges',
        html: '<p>With the nine merges from the previous step, how many tokens does the word <i>widest</i> become?</p>',
        mount: function (el, ctx) {
          M4.numberInput(el, {
            answer: 4, tolerance: 0.01,
            onCorrect: function () { ctx.solved('w, i, d and est. No merge combines w, i or d, while e + s and es + t build <b>est</b>.'); },
            onWrong: function () { ctx.wrong('Start from w i d e s t and go through the merges in order. Which ones apply?'); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'The size of the vocabulary',
        html: '<p>A model has a vocabulary of 50,000 tokens and an embedding dimension of 768. How many million numbers are in its embedding table?</p>',
        mount: function (el, ctx) {
          M4.numberInput(el, {
            answer: 38.4, tolerance: 0.05, label: 'million',
            onCorrect: function () { ctx.solved('\\(50{,}000 \\times 768 = 38.4\\) million. A larger vocabulary gives shorter sequences but a bigger embedding table and a bigger softmax at the output.'); },
            onWrong: function () { ctx.wrong('The table has one row of length 768 for every token.'); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>Subword tokens sit between characters and words. They keep sequences short and still cover every possible word.</li>' +
          '<li>Byte pair encoding learns its vocabulary by repeatedly merging the most frequent adjacent pair.</li>' +
          '<li>The vocabulary size trades sequence length against the size of the embedding table and the output softmax.</li></ul>'
      }
    ]
  });
})();
