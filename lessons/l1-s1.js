(function () {
  'use strict';
  var M4 = window.M4;
  var C = M4.colors;

  // ---------- local helpers ----------
  function injectStyle() {
    if (document.getElementById('l1-s1-style')) return;
    var s = document.createElement('style');
    s.id = 'l1-s1-style';
    s.textContent = [
      '.l1-s1-wrap{display:flex;flex-direction:column;align-items:center;gap:18px;width:100%}',
      '.l1-s1-sentence{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:22px;font-weight:600;min-height:56px;line-height:1.4}',
      '.l1-s1-word{padding:4px 2px}',
      '.l1-s1-new{background:#e8efff;border-radius:8px;padding:4px 8px;color:#2f6bff}',
      '.l1-s1-bars{width:100%;max-width:520px;display:flex;flex-direction:column;gap:10px}',
      '.l1-s1-bar{display:grid;grid-template-columns:110px 1fr 56px;align-items:center;gap:12px;cursor:pointer;padding:6px 10px;border-radius:12px;border:2px solid transparent;background:#fff;font-size:18px}',
      '.l1-s1-bar:hover{border-color:#e6e4dd}',
      '.l1-s1-bar b{text-align:right;font-weight:700}',
      '.l1-s1-track{height:22px;background:#f0eee7;border-radius:11px;overflow:hidden}',
      '.l1-s1-fill{height:100%;border-radius:11px;background:#2f6bff;transition:width .35s ease}',
      '.l1-s1-pct{font-variant-numeric:tabular-nums;color:#6b6f76;font-size:16px}',
      '.l1-s1-opts{display:flex;flex-wrap:wrap;justify-content:center;gap:22px}',
      '.l1-s1-opt{display:flex;flex-direction:column;align-items:center;gap:8px;width:96px}',
      '.l1-s1-opt .m4-token{font-size:20px;font-weight:700;padding:10px 16px;min-width:64px;text-align:center}',
      '.l1-s1-vbar{width:44px;height:110px;background:#f0eee7;border-radius:10px;display:flex;align-items:flex-end;overflow:hidden}',
      '.l1-s1-vfill{width:100%;background:#2f6bff;border-radius:10px 10px 0 0}',
      '.l1-s1-slotw{min-width:92px;min-height:48px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;padding:4px 12px}',
      '.l1-s1-match{display:grid;grid-template-columns:1fr 1.3fr;gap:12px 16px;width:100%;max-width:680px;align-items:center}',
      '.l1-s1-mlabel{font-weight:700;font-size:18px;text-align:right}',
      '.l1-s1-mslot{min-height:56px;display:flex;align-items:center;justify-content:center;font-size:16px;padding:6px 12px;text-align:center}',
      '.l1-s1-mtokens{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:680px}',
      '.l1-s1-mtokens .m4-token{font-size:16px;padding:10px 14px;max-width:310px;text-align:center}',
      '.l1-s1-svg{width:100%;height:auto;display:block;touch-action:none;user-select:none;-webkit-user-select:none}',
      '.l1-s1-img{width:100%;max-width:360px;height:auto;display:block;border-radius:16px;border:2px solid #e6e4dd;background:#fff}',
      '@media (max-width:560px){.l1-s1-match{grid-template-columns:1fr}.l1-s1-mlabel{text-align:center}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('-', '−'); }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function readout(parent, label) {
    var r = M4.el('div', { class: 'm4-readout' }, parent);
    var l = M4.el('span', { text: label + ' ' }, r);
    l.style.color = C.muted;
    var v = M4.el('b', { text: '' }, r);
    return { el: r, set: function (t) { v.textContent = t; } };
  }

  // ---------- step 2: toy next-token generator ----------
  var TABLE = {
    'The': [['model', 0.55], ['machine', 0.30], ['data', 0.15]],
    'model': [['learns', 0.50], ['generates', 0.35], ['.', 0.15]],
    'machine': [['learns', 0.60], ['generates', 0.30], ['.', 0.10]],
    'data': [['.', 0.70], ['and', 0.30]],
    'learns': [['from', 0.65], ['text', 0.20], ['.', 0.15]],
    'generates': [['text', 0.60], ['images', 0.30], ['.', 0.10]],
    'from': [['data', 0.70], ['text', 0.20], ['images', 0.10]],
    'text': [['.', 0.60], ['and', 0.40]],
    'images': [['.', 0.65], ['and', 0.35]],
    'and': [['images', 0.40], ['text', 0.35], ['data', 0.25]]
  };
  var MAXTOK = 14;

  function mountGenerator(el, ctx) {
    injectStyle();
    el.textContent = '';
    var wrap = M4.el('div', { class: 'l1-s1-wrap' }, el);
    var sent = M4.el('div', { class: 'l1-s1-sentence' }, wrap);
    var bars = M4.el('div', { class: 'l1-s1-bars' }, wrap);
    var info = M4.el('div', { class: 'm4-row' }, wrap);
    var rCount = readout(info, 'tokens generated');
    var rProb = readout(info, 'probability of last choice');
    var btns = M4.el('div', { class: 'm4-row' }, wrap);
    var tokens, lastP;

    function dist() {
      if (tokens.length >= MAXTOK) return null;
      return TABLE[tokens[tokens.length - 1]] || null;
    }
    function render() {
      sent.textContent = '';
      tokens.forEach(function (t, i) {
        M4.el('span', { class: 'l1-s1-word' + (i > 0 ? ' l1-s1-new' : ''), text: t }, sent);
      });
      bars.textContent = '';
      var d = dist();
      if (!d) {
        M4.el('div', { class: 'm4-note', text: 'The sequence has ended. Reset to generate another one.' }, bars).style.textAlign = 'center';
      } else {
        d.forEach(function (pair) {
          var row = M4.el('div', { class: 'l1-s1-bar' }, bars);
          M4.el('b', { text: pair[0] }, row);
          var tr = M4.el('div', { class: 'l1-s1-track' }, row);
          var f = M4.el('div', { class: 'l1-s1-fill' }, tr);
          f.style.width = '0%';
          M4.el('span', { class: 'l1-s1-pct', text: fmt(pair[1], 2) }, row);
          row.addEventListener('click', function () { add(pair); });
          setTimeout(function () { f.style.width = (pair[1] * 100) + '%'; }, 20);
        });
      }
      rCount.set(String(tokens.length - 1));
      rProb.set(lastP == null ? '–' : fmt(lastP, 2));
    }
    function add(pair) { tokens.push(pair[0]); lastP = pair[1]; render(); }
    function reset() { tokens = ['The']; lastP = null; render(); }

    M4.button(btns, 'Most probable token', function () {
      var d = dist(); if (!d) return;
      var best = d[0];
      d.forEach(function (p) { if (p[1] > best[1]) best = p; });
      add(best);
    }, { primary: true });
    M4.button(btns, 'Sample a token', function () {
      var d = dist(); if (!d) return;
      var u = Math.random(), acc = 0, pick = d[d.length - 1];
      for (var i = 0; i < d.length; i++) { acc += d[i][1]; if (u < acc) { pick = d[i]; break; } }
      add(pick);
    });
    M4.button(btns, 'Reset', reset);
    reset();
  }

  // ---------- step 3: drag the most probable token, twice ----------
  var STAGES = [
    { opts: [['Lyon', 0.06], ['Paris', 0.82], ['a', 0.08], ['the', 0.04]], best: 'Paris' },
    { opts: [[',', 0.21], ['and', 0.10], ['.', 0.64], ['Paris', 0.05]], best: '.' }
  ];

  function mountGreedy(el, ctx) {
    injectStyle();
    var timer = null;
    ctx.onCleanup(function () { if (timer) clearTimeout(timer); });
    var chosen = [];

    function render(stage) {
      el.textContent = '';
      var wrap = M4.el('div', { class: 'l1-s1-wrap' }, el);
      var sent = M4.el('div', { class: 'l1-s1-sentence' }, wrap);
      'The capital of France is'.split(' ').forEach(function (w) {
        M4.el('span', { class: 'l1-s1-word', text: w }, sent);
      });
      chosen.forEach(function (w) { M4.el('span', { class: 'l1-s1-word l1-s1-new', text: w }, sent); });
      if (stage >= STAGES.length) {
        M4.el('div', { class: 'm4-note', text: 'Both tokens were chosen by taking the largest probability at each position.' }, wrap);
        return;
      }
      var slot = M4.el('span', { class: 'm4-slot l1-s1-slotw', text: '?' }, sent);
      M4.el('div', { class: 'm4-note', text: 'Token ' + (stage + 1) + ' of 2. Probabilities of the candidate next tokens:' }, wrap);
      var opts = M4.el('div', { class: 'l1-s1-opts' }, wrap);
      var toks = [], locked = false;
      STAGES[stage].opts.forEach(function (pair) {
        var col = M4.el('div', { class: 'l1-s1-opt' }, opts);
        var vb = M4.el('div', { class: 'l1-s1-vbar' }, col);
        var vf = M4.el('div', { class: 'l1-s1-vfill' }, vb);
        vf.style.height = Math.max(3, pair[1] * 100) + '%';
        M4.el('div', { class: 'm4-chip', text: fmt(pair[1], 2) }, col);
        var tok = M4.el('div', { class: 'm4-token', text: pair[0] }, col);
        tok.setAttribute('data-w', pair[0]);
        tok.setAttribute('data-p', String(pair[1]));
        toks.push(tok);
      });
      M4.dragDrop({
        tokens: toks, slots: [slot],
        onDrop: function (tokEl) {
          if (locked) return;
          var w = tokEl.getAttribute('data-w');
          if (w === STAGES[stage].best) {
            locked = true;
            chosen.push(w);
            slot.textContent = w;
            slot.classList.add('filled');
            slot.classList.add('m4-pop');
            if (tokEl.parentNode && tokEl.parentNode !== slot) tokEl.style.visibility = 'hidden';
            if (stage + 1 >= STAGES.length) {
              ctx.note('The greedy continuation is “Paris .” with probabilities 0.82 and 0.64.');
              ctx.solved();
            } else {
              ctx.note('Correct. The distribution for the following position depends on the text so far and is now different.');
              timer = setTimeout(function () { render(stage + 1); }, 900);
            }
          } else {
            ctx.wrong('“' + w + '” has probability ' + fmt(parseFloat(tokEl.getAttribute('data-p')), 2) + ', which is not the largest of the four values.');
          }
        },
        onMiss: function () { ctx.note('Drop the token on the dashed slot at the end of the sentence.'); }
      });
    }
    render(0);
  }

  // ---------- step 5: denoising explorer ----------
  var N = 16;
  function cleanImage() {
    var a = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var dx = c + 0.5 - 8, dy = r + 0.5 - 6.5;
      var v = 0.12;
      if (r >= 12) v = 0.55;
      if (dx * dx + dy * dy <= 16.5 && r < 12) v = 1.0;
      a.push(v);
    }
    return a;
  }
  function shade(v) {
    v = clamp(v, 0, 1);
    var r = Math.round(250 + (47 - 250) * v), g = Math.round(249 + (107 - 249) * v), b = Math.round(245 + (255 - 245) * v);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function mountDenoise(el, ctx) {
    injectStyle();
    el.textContent = '';
    var wrap = M4.el('div', { class: 'l1-s1-wrap' }, el);
    var x0 = cleanImage();
    var seed = 7, eps = [];
    function newNoise() { var R = rng(seed++); eps = x0.map(function () { return R(); }); }
    newNoise();
    var S = 20;
    var svg = M4.svg('svg', { viewBox: '0 0 ' + (N * S) + ' ' + (N * S), class: 'l1-s1-img' }, wrap);
    var cells = [];
    for (var i = 0; i < N * N; i++) {
      cells.push(M4.svg('rect', { x: (i % N) * S, y: Math.floor(i / N) * S, width: S + 0.5, height: S + 0.5, fill: '#fff' }, svg));
    }
    var info = M4.el('div', { class: 'm4-row' }, wrap);
    var rT = readout(info, 'noise level t');
    var rE = readout(info, 'mean |xₜ − x₀|');
    var t = 1, raf = null;
    function draw() {
      var err = 0;
      for (var i = 0; i < x0.length; i++) {
        var v = (1 - t) * x0[i] + t * eps[i];
        err += Math.abs(v - x0[i]);
        cells[i].setAttribute('fill', shade(v));
      }
      rT.set(fmt(t, 2));
      rE.set(fmt(err / x0.length, 3));
    }
    var sl = M4.slider(wrap, {
      min: 0, max: 1, step: 0.01, value: 1, label: 'noise level t',
      format: function (v) { return fmt(+v, 2); },
      onInput: function (v) { stop(); t = +v; draw(); }
    });
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    var btns = M4.el('div', { class: 'm4-row' }, wrap);
    M4.button(btns, 'Denoise in 20 steps', function () {
      stop();
      var start = null, steps = 20, per = 180;
      function frame(ts) {
        if (start === null) start = ts;
        var k = Math.min(steps, Math.floor((ts - start) / per));
        t = 1 - k / steps;
        if (sl && sl.set) sl.set(t);
        draw();
        raf = k < steps ? requestAnimationFrame(frame) : null;
      }
      raf = requestAnimationFrame(frame);
    }, { primary: true });
    M4.button(btns, 'New noise', function () { stop(); newNoise(); draw(); });
    ctx.onCleanup(stop);
    draw();
  }

  // ---------- steps 7 and 8: grouping without labels ----------
  var PTS = [
    [2, 2], [2.8, 2.6], [1.6, 3.1], [3, 1.6], [2.4, 3.4],
    [7.5, 2.5], [8.2, 3.2], [7, 3.4], [8.4, 2], [7.8, 1.5],
    [5, 7.5], [5.8, 8.2], [4.3, 8.1], [5.2, 6.7], [4.6, 7]
  ];
  function dist2(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
  function components(pts, d) {
    var par = pts.map(function (_, i) { return i; });
    function find(i) { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; }
    var edges = [];
    for (var i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) {
      if (dist2(pts[i], pts[j]) <= d + 1e-9) { edges.push([i, j]); par[find(i)] = find(j); }
    }
    var ids = {}, n = 0, lab = [];
    for (var k = 0; k < pts.length; k++) { var r = find(k); if (!(r in ids)) ids[r] = n++; lab.push(ids[r]); }
    return { labels: lab, count: n, edges: edges };
  }

  function mountGroups(el, ctx) {
    injectStyle();
    el.textContent = '';
    var wrap = M4.el('div', { class: 'l1-s1-wrap' }, el);
    var p = M4.plane(wrap, { xmin: 0, xmax: 10, ymin: 0, ymax: 10, width: 520, height: 520 });
    var gE = M4.svg('g', {}, p.g), gP = M4.svg('g', {}, p.g);
    var pal = [C.blue, C.orange, C.green, C.purple, C.pink, C.yellow, C.red];
    var circles = PTS.map(function (q) {
      return M4.svg('circle', { cx: p.x(q[0]), cy: p.y(q[1]), r: 10, fill: C.muted, stroke: '#fff', 'stroke-width': 2 }, gP);
    });
    var info = M4.el('div', { class: 'm4-row' }, wrap);
    var rD = readout(info, 'threshold d');
    var rG = readout(info, 'groups found');
    function draw(d) {
      var cc = components(PTS, d);
      while (gE.firstChild) gE.removeChild(gE.firstChild);
      cc.edges.forEach(function (e) {
        M4.svg('line', {
          x1: p.x(PTS[e[0]][0]), y1: p.y(PTS[e[0]][1]), x2: p.x(PTS[e[1]][0]), y2: p.y(PTS[e[1]][1]),
          stroke: pal[cc.labels[e[0]] % pal.length], 'stroke-width': 2.5, 'stroke-opacity': 0.35
        }, gE);
      });
      circles.forEach(function (c, i) { c.setAttribute('fill', pal[cc.labels[i] % pal.length]); });
      rD.set(fmt(d, 1));
      rG.set(String(cc.count));
    }
    M4.slider(wrap, {
      min: 0.4, max: 5, step: 0.1, value: 0.4, label: 'threshold d',
      format: function (v) { return fmt(+v, 1); },
      onInput: function (v) { draw(+v); }
    });
    draw(0.4);
  }

  function mountJoin(el, ctx) {
    injectStyle();
    el.textContent = '';
    var D = 1.5;
    var wrap = M4.el('div', { class: 'l1-s1-wrap' }, el);
    var p = M4.plane(wrap, { xmin: 0, xmax: 10, ymin: 0, ymax: 10, width: 520, height: 520 });
    var cols = [C.blue, C.orange, C.green], names = ['blue', 'orange', 'green'];
    var cc = components(PTS, D);
    var gE = M4.svg('g', {}, p.g);
    cc.edges.forEach(function (e) {
      M4.svg('line', {
        x1: p.x(PTS[e[0]][0]), y1: p.y(PTS[e[0]][1]), x2: p.x(PTS[e[1]][0]), y2: p.y(PTS[e[1]][1]),
        stroke: cols[cc.labels[e[0]] % cols.length], 'stroke-width': 2.5, 'stroke-opacity': 0.3
      }, gE);
    });
    PTS.forEach(function (q, i) {
      M4.svg('circle', { cx: p.x(q[0]), cy: p.y(q[1]), r: 10, fill: cols[cc.labels[i] % cols.length], stroke: '#fff', 'stroke-width': 2 }, p.g);
    });
    var rpx = Math.abs(p.x(D) - p.x(0));
    var ring = M4.svg('circle', { r: rpx, fill: C.muted, 'fill-opacity': 0.06, stroke: C.muted, 'stroke-width': 2.5, 'stroke-dasharray': '7 6' }, p.g);
    ring.style.pointerEvents = 'none';
    var link = M4.svg('line', { stroke: C.muted, 'stroke-width': 2.5, 'stroke-dasharray': '4 5' }, p.g);
    link.style.pointerEvents = 'none';
    var info = M4.el('div', { class: 'm4-row' }, wrap);
    var rN = readout(info, 'distance to nearest point');
    var rG = readout(info, 'group of new point');
    var cur = [5, 4], done = false;

    function state(x, y) {
      var best = 0, bd = Infinity;
      PTS.forEach(function (q, i) { var d = dist2(q, [x, y]); if (d < bd) { bd = d; best = i; } });
      return { i: best, d: bd, g: bd <= D ? cc.labels[best] : -1 };
    }
    function update(x, y) {
      x = clamp(x, 0, 10); y = clamp(y, 0, 10);
      cur = [x, y];
      var s = state(x, y);
      var col = s.g < 0 ? C.muted : cols[s.g];
      ring.setAttribute('cx', p.x(x)); ring.setAttribute('cy', p.y(y));
      ring.setAttribute('stroke', col); ring.setAttribute('fill', col);
      ring.setAttribute('fill-opacity', done ? 0.3 : (s.g < 0 ? 0.06 : 0.15));
      link.setAttribute('x1', p.x(x)); link.setAttribute('y1', p.y(y));
      link.setAttribute('x2', p.x(PTS[s.i][0])); link.setAttribute('y2', p.y(PTS[s.i][1]));
      link.setAttribute('stroke', col);
      rN.set(fmt(s.d, 2));
      rG.set(s.g < 0 ? 'none' : names[s.g]);
      return s;
    }
    function check() {
      if (done) return;
      var s = state(cur[0], cur[1]);
      if (s.g === 2) {
        done = true; update(cur[0], cur[1]);
        ring.removeAttribute('stroke-dasharray');
        ctx.note('The nearest point is at distance ' + fmt(s.d, 2) + ' ≤ 1.5 and belongs to the green group, so the new point joins it.');
        ctx.solved();
      } else if (s.g < 0) {
        ctx.note('The nearest point is at distance ' + fmt(s.d, 2) + ', which exceeds \\(d = 1.5\\). The new point forms a group of its own.');
      } else {
        ctx.note('The new point is within \\(d = 1.5\\) of the ' + names[s.g] + ' group, not the green one.');
      }
    }
    p.handle(5, 4, {
      color: C.ink, r: 12,
      onDrag: function (x, y) { update(x, y); },
      onEnd: function (x, y) { if (typeof x === 'number' && typeof y === 'number') update(x, y); check(); }
    });
    update(5, 4);
  }

  // ---------- step 9: match method to description ----------
  var PAIRS = [
    { k: 'chat', label: 'Chat text generation', text: 'starts from a prompt and appends one token at a time' },
    { k: 'img', label: 'Image generation', text: 'starts from noise and ends with a picture' },
    { k: 'tdiff', label: 'Text diffusion', text: 'starts from random numbers and ends with a sentence' },
    { k: 'self', label: 'Learning without labels', text: 'outlines objects although no outlines were provided' }
  ];

  function mountMatch(el, ctx) {
    injectStyle();
    el.textContent = '';
    var wrap = M4.el('div', { class: 'l1-s1-wrap' }, el);
    var grid = M4.el('div', { class: 'l1-s1-match' }, wrap);
    var slots = [], toks = [], placed = 0;
    PAIRS.forEach(function (pr) {
      M4.el('div', { class: 'l1-s1-mlabel', text: pr.label }, grid);
      var s = M4.el('div', { class: 'm4-slot l1-s1-mslot', text: 'drop here' }, grid);
      s.setAttribute('data-k', pr.k);
      slots.push(s);
    });
    var tray = M4.el('div', { class: 'l1-s1-mtokens' }, wrap);
    [2, 0, 3, 1].forEach(function (i) {
      var t = M4.el('div', { class: 'm4-token', text: PAIRS[i].text }, tray);
      t.setAttribute('data-k', PAIRS[i].k);
      toks.push(t);
    });
    var labelOf = {};
    PAIRS.forEach(function (pr) { labelOf[pr.k] = pr.label; });
    M4.dragDrop({
      tokens: toks, slots: slots,
      onDrop: function (tokEl, slotEl) {
        if (slotEl.classList.contains('filled')) { ctx.note('That slot is already filled.'); return; }
        var tk = tokEl.getAttribute('data-k'), sk = slotEl.getAttribute('data-k');
        if (tk === sk) {
          var txt = tokEl.textContent;
          slotEl.textContent = txt;
          slotEl.classList.add('filled');
          slotEl.classList.add('m4-pop');
          slotEl.style.borderColor = C.green;
          if (tokEl.parentNode) tokEl.parentNode.removeChild(tokEl);
          placed++;
          ctx.note(placed + ' of 4 matched.');
          if (placed === PAIRS.length) ctx.solved();
        } else {
          var msg;
          if ((tk === 'img' && sk === 'tdiff') || (tk === 'tdiff' && sk === 'img')) msg = 'Both methods remove noise, but they differ in what the result is: a picture or a sentence.';
          else if (tk === 'chat') msg = 'Appending one token at a time after a prompt describes chat text generation.';
          else if (tk === 'self') msg = 'Producing outlines that were never provided describes learning without labels.';
          else msg = 'This description starts from noise, which does not fit “' + labelOf[sk] + '”.';
          ctx.wrong(msg);
        }
      },
      onMiss: function () { ctx.note('Drop each description on one of the dashed slots.'); }
    });
  }

  // ---------- step 11: recover the clean pixels ----------
  function mountRecover(el, ctx) {
    injectStyle();
    el.textContent = '';
    var XT = [0.3, 0.5, 0.1], EPS = [-0.2, 0.6, 0.2], ANS = [0.8, 0.4, 0.0];
    var W = 640, H = 470, Y0 = 350, UNIT = 260;
    function Y(v) { return Y0 - v * UNIT; }
    var wrap = M4.el('div', { class: 'l1-s1-wrap' }, el);
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'l1-s1-svg' }, wrap);
    [0, 0.5, 1].forEach(function (v) {
      M4.svg('line', { x1: 70, x2: W - 20, y1: Y(v), y2: Y(v), stroke: v === 0 ? C.ink : C.line, 'stroke-width': v === 0 ? 2 : 1.5 }, svg);
      var t = M4.svg('text', { x: 58, y: Y(v) + 5, 'text-anchor': 'end', 'font-size': 16, fill: C.muted }, svg);
      t.textContent = v === 0 ? '0' : String(v);
    });
    function label(x, y, str, fill, weight) {
      var t = M4.svg('text', { x: x, y: y, 'text-anchor': 'middle', 'font-size': 16, fill: fill || C.ink, 'font-weight': weight || 600 }, svg);
      t.textContent = str;
      return t;
    }
    var guess = [0.5, 0.5, 0.5], done = false, parts = [];
    var info = M4.el('div', { class: 'm4-row' }, wrap);
    var outs = [0, 1, 2].map(function (i) { return readout(info, 'pixel ' + (i + 1) + ': x₀ ='); });
    var legend = M4.el('div', { class: 'm4-note' }, wrap);
    legend.textContent = 'Orange dot: observed noisy value. Purple dot: noise value. Ring: mixture computed from the blue bar. The ring must land on the orange dot.';
    legend.style.textAlign = 'center';

    function redraw(i) {
      var pt = parts[i], g = guess[i], mix = 0.5 * g + 0.5 * EPS[i];
      var top = Y(g);
      pt.bar.setAttribute('y', Math.min(top, Y0));
      pt.bar.setAttribute('height', Math.max(2, Math.abs(Y0 - top)));
      pt.knob.setAttribute('cy', top);
      pt.ring.setAttribute('cy', Y(mix));
      var ok = Math.abs(g - ANS[i]) < 0.01;
      pt.ring.setAttribute('stroke', ok ? C.green : C.ink);
      pt.ring.setAttribute('stroke-width', ok ? 5 : 3);
      outs[i].set(fmt(g, 1));
    }
    function check() {
      if (done) return;
      var n = 0;
      for (var i = 0; i < 3; i++) if (Math.abs(guess[i] - ANS[i]) < 0.01) n++;
      if (n === 3) {
        done = true;
        parts.forEach(function (pt) { pt.bar.setAttribute('fill', C.green); pt.knob.setAttribute('fill', C.green); });
        ctx.note('All three pixels recovered: \\(x_0 = 2x_t - \\varepsilon\\) gives \\(0.8,\\ 0.4,\\ 0.0\\).');
        ctx.solved();
      } else {
        ctx.note(n + ' of 3 pixels satisfy \\(0.5\\,x_0 + 0.5\\,\\varepsilon = x_t\\). A ring above its orange dot means the blue bar is too high.');
      }
    }

    [0, 1, 2].forEach(function (i) {
      var cx = 170 + i * 190;
      label(cx, 28, 'pixel ' + (i + 1), C.ink, 700);
      label(cx - 62, 56, 'xₜ', C.orange, 700);
      label(cx, 56, 'x₀', C.blue, 700);
      label(cx + 62, 56, 'ε', C.purple, 700);
      M4.svg('line', { x1: cx - 62, x2: cx - 62, y1: Y(1), y2: Y(-0.25), stroke: C.line, 'stroke-width': 2, 'stroke-dasharray': '3 5' }, svg);
      M4.svg('line', { x1: cx + 62, x2: cx + 62, y1: Y(1), y2: Y(-0.25), stroke: C.line, 'stroke-width': 2, 'stroke-dasharray': '3 5' }, svg);
      var bar = M4.svg('rect', { x: cx - 24, width: 48, rx: 8, fill: C.blue, 'fill-opacity': 0.85 }, svg);
      M4.svg('circle', { cx: cx + 62, cy: Y(EPS[i]), r: 10, fill: C.purple }, svg);
      M4.svg('circle', { cx: cx - 62, cy: Y(XT[i]), r: 10, fill: C.orange }, svg);
      var ring = M4.svg('circle', { cx: cx - 62, r: 16, fill: 'none', stroke: C.ink, 'stroke-width': 3 }, svg);
      label(cx - 62, 440, 'xₜ = ' + fmt(XT[i], 1), C.orange, 600);
      label(cx + 62, 440, 'ε = ' + fmt(EPS[i], 1), C.purple, 600);
      var knob = M4.svg('circle', { cx: cx, r: 16, fill: C.blue, stroke: '#fff', 'stroke-width': 3 }, svg);
      knob.style.cursor = 'grab';
      knob.style.touchAction = 'none';
      parts.push({ bar: bar, ring: ring, knob: knob });
      var v0 = 0.5;
      M4.drag(knob, {
        onStart: function () { v0 = guess[i]; },
        onMove: function (dx, dy) {
          if (done) return;
          var rect = svg.getBoundingClientRect();
          var scale = rect.height > 0 ? H / rect.height : 1;
          var v = v0 - dy * scale / UNIT;
          guess[i] = clamp(Math.round(v * 10) / 10, 0, 1);
          redraw(i);
        },
        onEnd: function () { check(); }
      });
      redraw(i);
    });
  }

  // ---------- lesson ----------
  M4.lesson({
    id: 'l1-s1',
    module: 'l1',
    title: 'What deep learning produces',
    summary: 'An overview of current deep learning systems. Language models generate text one token at a time, image models generate pictures by removing noise, and other methods find structure in unlabelled data.',
    minutes: 10,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>Computer programs can now answer almost any question put to them, write most of a program, and produce images and video. The field that enabled this is called <b>deep learning</b>.</p>' +
          '<p>Such systems do three things, each shown here with a small numerical model. They generate text one token at a time, generate an image by removing noise step by step, and group data without being told what the groups are.</p>'
      },
      {
        kind: 'explore',
        title: 'Generating text',
        html: '<p>A text generator extends a piece of text by one unit at a time. Such a unit is called a <b>token</b> and is here a word or a punctuation mark. For the text so far, the model assigns each candidate next token a probability, a number between \\(0\\) and \\(1\\), and the probabilities of all candidates sum to \\(1\\).</p>' +
          '<p>The toy model below has ten words and looks only at the last token. Real systems use the whole text and tens of thousands of tokens. Select a bar, take the most probable token, or sample a token at random according to the probabilities.</p>',
        mount: mountGenerator
      },
      {
        kind: 'exercise',
        title: 'Choosing the next token',
        html: '<p>One simple rule for generation is to append the token with the largest probability at every position. Apply this rule twice: drag the most probable token into the slot, then repeat for the new distribution.</p>',
        hint: 'Compare the four numbers under the bars. In the first distribution the largest is 0.82.',
        mount: mountGreedy
      },
      {
        kind: 'text',
        title: 'Image generation',
        html: '<p>Image and video generators work differently: they start from random numbers and remove the randomness step by step. Let \\(x_0\\) be the brightness of one pixel of a clean image, \\(\\varepsilon\\) a random number called <b>noise</b>, and \\(t\\) a noise level between \\(0\\) and \\(1\\). A simple model of the partly noisy pixel is</p>' +
          '\\[ x_t = (1 - t)\\,x_0 + t\\,\\varepsilon . \\]' +
          '<p>At \\(t = 1\\) the pixel is pure noise, \\(x_1 = \\varepsilon\\). At \\(t = 0\\) it is the clean value \\(x_0\\). Generation runs from \\(t = 1\\) down to \\(t = 0\\).</p>'
      },
      {
        kind: 'explore',
        title: 'Removing noise step by step',
        html: '<p>The picture has \\(16 \\times 16\\) pixels, each mixed with its own noise value by \\(x_t = (1 - t)\\,x_0 + t\\,\\varepsilon\\). Move the noise level \\(t\\), or run the reduction from \\(t = 1\\) to \\(t = 0\\) in 20 equal steps.</p>' +
          '<p>The displayed value is the mean absolute difference between the noisy and the clean picture, which is proportional to \\(t\\). In this demonstration the clean picture is stored. A trained generator has to estimate it from the noisy one.</p>',
        mount: mountDenoise
      },
      {
        kind: 'exercise',
        title: 'One noisy pixel',
        html: '<p>A pixel has the clean value \\(x_0 = 0.8\\) and the noise value \\(\\varepsilon = -0.4\\). Compute the noisy value \\(x_t = (1 - t)\\,x_0 + t\\,\\varepsilon\\) at noise level \\(t = 0.25\\).</p>',
        hint: 'The weights are \\(1 - t = 0.75\\) and \\(t = 0.25\\). Compute \\(0.75 \\cdot 0.8\\) and \\(0.25 \\cdot (-0.4)\\), then add.',
        mount: function (el, ctx) {
          el.textContent = '';
          var wrap = M4.el('div', { class: 'm4-col' }, el);
          M4.numberInput(wrap, {
            answer: 0.5, tolerance: 0.005, placeholder: 'e.g. 0.3', label: 'xₜ =',
            onCorrect: function () {
              ctx.note('\\(0.75 \\cdot 0.8 + 0.25 \\cdot (-0.4) = 0.6 - 0.1 = 0.5\\).');
              ctx.solved();
            },
            onWrong: function (v) {
              var msg = 'Not yet. Weight \\(x_0\\) by \\(1 - t\\) and \\(\\varepsilon\\) by \\(t\\).';
              if (Math.abs(v - 0.7) < 0.005) msg = 'The noise is negative: \\(0.25 \\cdot (-0.4) = -0.1\\) is subtracted, not added.';
              else if (Math.abs(v + 0.1) < 0.005) msg = 'The weights are swapped: \\(x_0\\) is multiplied by \\(1 - t = 0.75\\), and \\(\\varepsilon\\) by \\(t = 0.25\\).';
              ctx.wrong(msg);
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Learning without labels',
        html: '<p>Some models learn from data without ever being told what the data shows. For example, they outline the objects in a video although nobody drew any outlines. A minimal version of this idea: given only points, connect every two points whose distance is at most a threshold \\(d\\), and call each connected set a <b>group</b>.</p>' +
          '<p>Move the threshold \\(d\\). The colours are computed from the positions alone. No point carries a label.</p>',
        mount: mountGroups
      },
      {
        kind: 'exercise',
        title: 'Assigning a new point',
        html: '<p>The threshold is fixed at \\(d = 1.5\\), which yields three groups. The dark point is new, and the dashed circle around it has radius \\(d\\). Drag the new point to a position where it becomes part of the <b>green</b> group.</p>',
        hint: 'The new point joins a group when one of that group’s points lies inside the dashed circle. The green group is the upper one.',
        mount: mountJoin
      },
      {
        kind: 'exercise',
        title: 'Four kinds of systems',
        html: '<p>A method under current development, <b>text diffusion</b>, generates text the way image generators produce pictures: it starts from random numbers and removes the noise until a sentence remains. Drag each description to the system it describes.</p>',
        hint: 'Two descriptions start from noise. They differ in the result: a picture for image generation, a sentence for text diffusion.',
        mount: mountMatch
      },
      {
        kind: 'exercise',
        title: 'What the course covers',
        html: '<p>The course is built in three parts: the machine learning basics that everything else builds on, how deep learning works and how to build it, and the methods of natural language processing (NLP) used in deep learning. The first four lectures are given by Filipe, the later ones by Prof. Alan Akbik. Tutorials and labs are given by Filipe and David Schulte.</p>' +
          '<p>Regression, classification, losses and optimisation belong to which part?</p>',
        hint: 'These four topics do not depend on neural networks or on text. The other two parts build on them.',
        mount: function (el, ctx) {
          el.textContent = '';
          M4.choices(el, {
            options: ['Machine learning basics', 'Deep learning', 'NLP methods: sequence models, transformers, language models'],
            correct: 0,
            onCorrect: function () {
              ctx.note('These topics form the machine learning basics, the foundation for the other two parts.');
              ctx.solved();
            },
            onWrong: function (i) {
              ctx.wrong(i === 1 ? 'Deep learning uses losses and optimisation but builds on them. They are introduced earlier.' :
                'Sequence models, transformers and language models are the NLP part. The four topics named come before them.');
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Recovering the clean pixels',
        html: '<p>Three pixels were mixed with noise at level \\(t = 0.5\\), so \\(x_t = 0.5\\,x_0 + 0.5\\,\\varepsilon\\). The noisy values \\(x_t\\) and the noise values \\(\\varepsilon\\) are known. The clean values \\(x_0\\) are not.</p>' +
          '<p>Drag the top of each blue bar to the clean value \\(x_0\\) of that pixel. The bars move in steps of \\(0.1\\).</p>',
        hint: 'Solve \\(x_t = 0.5\\,x_0 + 0.5\\,\\varepsilon\\) for \\(x_0\\): \\(x_0 = 2x_t - \\varepsilon\\). For pixel 1 this is \\(2 \\cdot 0.3 - (-0.2) = 0.8\\).',
        mount: mountRecover
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li><b>Text generation:</b> the model assigns a probability to every candidate next token, one token is chosen and appended, and the process repeats with the longer text.</li>' +
          '<li><b>Image and video generation:</b> the model starts from random numbers and removes noise step by step. In the simple model \\(x_t = (1 - t)\\,x_0 + t\\,\\varepsilon\\) this corresponds to moving \\(t\\) from \\(1\\) to \\(0\\). Text diffusion applies the same idea to sentences.</li>' +
          '<li><b>Learning without labels:</b> structure such as groups or object outlines can be computed from the data alone. The course treats these systems in three parts: machine learning basics, deep learning, and NLP methods.</li>' +
          '</ul>'
      }
    ]
  });
})();
