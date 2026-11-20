(function () {
  'use strict';
  var M4 = window.M4;
  if (!M4 || !M4.lesson) { return; }
  var C = M4.colors || {};
  var COL = {
    cat: C.purple || '#7a5cff',
    dog: C.orange || '#ff8a1f',
    bird: C.blue || '#2f6bff',
    green: C.green || '#16b56b',
    ink: C.ink || '#1d1d1f',
    muted: C.muted || '#6b6f76',
    line: C.line || '#e6e4dd'
  };
  var CLASSES = ['cat', 'dog', 'bird'];
  var Z0 = [2.3, 0.6, -1.0];           // lecture scores: e^z sums to 12.16, probabilities 0.82 / 0.15 / 0.03

  function injectStyle() {
    if (document.getElementById('l2-s3-style')) { return; }
    var st = document.createElement('style');
    st.id = 'l2-s3-style';
    st.textContent = [
      '.l2-s3-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;margin-top:8px}',
      '.l2-s3-tray{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;min-height:56px}',
      '.l2-s3-pair{display:flex;align-items:center;justify-content:center;gap:14px;margin:8px 0;flex-wrap:wrap}',
      '.l2-s3-pair .l2-s3-lab{min-width:210px;text-align:right;font-weight:600}',
      '.l2-s3-slotbox{min-width:170px;min-height:56px;display:flex;align-items:center;justify-content:center}',
      '.l2-s3-tok{font-size:18px;padding:10px 16px;touch-action:none}',
      '.l2-s3-table{display:grid;grid-template-columns:70px 1fr 78px 78px;gap:10px 12px;align-items:center;width:100%;max-width:620px}',
      '.l2-s3-table .l2-s3-h{font-size:14px;color:#6b6f76;font-weight:600;text-align:right}',
      '.l2-s3-table .l2-s3-h.l2-s3-left{text-align:left}',
      '.l2-s3-name{font-weight:700}',
      '.l2-s3-track{height:28px;background:#f1efe8;border-radius:10px;overflow:hidden}',
      '.l2-s3-bar{height:100%;border-radius:10px;width:0}',
      '.l2-s3-num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}',
      '.l2-s3-sliders{width:100%;max-width:620px;display:flex;flex-direction:column;gap:6px}',
      '.l2-s3-svg{width:100%;max-width:560px;height:auto;display:block;touch-action:none;user-select:none;-webkit-user-select:none}',
      '.l2-s3-ok{background:#e7f8ef !important;border-color:#16b56b !important}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function fx(v, d) { return v.toFixed(d === undefined ? 2 : d); }
  function softmax(z) {
    var m = Math.max.apply(null, z), e = z.map(function (v) { return Math.exp(v - m); });
    var s = e[0] + e[1] + e[2];
    return e.map(function (v) { return v / s; });
  }
  function readout(parent, label) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    r.textContent = label;
    return { el: r, set: function (t) { r.textContent = t; } };
  }
  function S(tag, attrs, parent, text) {
    var n = M4.svg(tag, attrs || {}, parent);
    if (text !== undefined) { n.textContent = text; }
    return n;
  }

  /* ---------- step 3: Bernoulli if-statement (drag tokens) ---------- */
  function mountIfStatement(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: 'l2-s3-wrap' }, el);
    var rows = M4.el('div', {}, wrap);
    var defs = [
      { lab: 'Dog photo, \\(y = 1\\): loss', want: 'a' },
      { lab: 'Cat photo, \\(y = 0\\): loss', want: 'b' }
    ];
    var slots = defs.map(function (d) {
      var row = M4.el('div', { class: 'l2-s3-pair' }, rows);
      M4.el('div', { class: 'l2-s3-lab', html: d.lab }, row);
      var s = M4.el('div', { class: 'm4-slot l2-s3-slotbox' }, row);
      s.setAttribute('data-want', d.want);
      return s;
    });
    var tray = M4.el('div', { class: 'l2-s3-tray' }, wrap);
    var toks = [
      { k: 'c', t: '-\\log(1+p)' },
      { k: 'b', t: '-\\log(1-p)' },
      { k: 'd', t: '-\\log(p\\,(1-p))' },
      { k: 'a', t: '-\\log p' }
    ].map(function (d) {
      var t = M4.el('div', { class: 'm4-token l2-s3-tok', html: M4.tex(d.t) }, tray);
      t.setAttribute('data-k', d.k);
      return t;
    });
    M4.typeset(wrap);
    var done = 0;
    M4.dragDrop({
      tokens: toks, slots: slots,
      onDrop: function (tok, slot) {
        if (slot.getAttribute('data-done')) { return; }
        var k = tok.getAttribute('data-k'), want = slot.getAttribute('data-want');
        if (k === want) {
          slot.appendChild(tok);
          slot.classList.add('filled'); slot.classList.add('l2-s3-ok');
          slot.setAttribute('data-done', '1');
          tok.style.pointerEvents = 'none';
          done += 1;
          if (done === 2) {
            ctx.note('Both branches are placed. Together they form \\(-\\big[y\\log p + (1-y)\\log(1-p)\\big]\\), the binary cross-entropy.');
            ctx.solved();
          } else {
            ctx.note('Correct. One branch remains.');
          }
        } else if (k === 'a' || k === 'b') {
          ctx.wrong(want === 'a'
            ? 'For \\(y = 1\\) the exponent of \\((1-p)\\) is \\(0\\), so only \\(p\\) survives.'
            : 'For \\(y = 0\\) the exponent of \\(p\\) is \\(0\\), so only \\((1-p)\\) survives.');
        } else {
          ctx.wrong('Substitute the value of \\(y\\) into \\(p^{y}(1-p)^{1-y}\\) first. One factor becomes \\(1\\).');
        }
      },
      onMiss: function () {}
    });
  }

  /* ---------- curve widgets on a plane ---------- */
  function curvePts(f, a, b, n) {
    var pts = [], i, x;
    for (i = 0; i <= n; i++) { x = a + (b - a) * i / n; pts.push([x, f(x)]); }
    return pts;
  }

  /* step 4: binary cross-entropy, drag the prediction */
  function mountBCE(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: 'l2-s3-wrap' }, el);
    var p = M4.plane(wrap, { xmin: -0.12, xmax: 1.12, ymin: -0.45, ymax: 3.45, width: 560, height: 420, grid: true, axes: true, labels: true });
    var TARGET = 0.15, YMAX = 3.3;
    var fDog = function (x) { return -Math.log(x); }, fCat = function (x) { return -Math.log(1 - x); };
    var lo = Math.exp(-YMAX), hi = 1 - Math.exp(-YMAX);
    p.line(0, TARGET, 1, TARGET, { stroke: COL.green, width: 2, dash: '6 6' });
    p.text(0.5, TARGET + 0.16, 'target: loss 0.15', { fill: COL.green, size: 15, weight: 600 });
    p.path(curvePts(fDog, lo, 1, 160), { stroke: COL.dog, width: 3 });
    p.path(curvePts(fCat, 0, hi, 160), { stroke: COL.cat, width: 4 });
    p.text(0.2, 2.75, 'dog: −log p', { fill: COL.dog, size: 16, weight: 600, anchor: 'start' });
    p.text(0.8, 2.75, 'cat: −log(1 − p)', { fill: COL.cat, size: 16, weight: 600, anchor: 'end' });
    p.text(0.5, -0.33, 'predicted probability of dog, p', { fill: COL.muted, size: 15 });
    var drop = p.line(0.88, 0, 0.88, fCat(0.88), { stroke: COL.cat, width: 2, dash: '4 5' });
    var dogDot = p.point(0.88, fDog(0.88), { r: 6, fill: COL.dog });
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rP = readout(row, ''), rD = readout(row, ''), rC = readout(row, '');
    var busy = false, solved = false, h;
    function show(x) {
      drop.set(x, 0, x, fCat(x));
      dogDot.set(x, fDog(x));
      rP.set('p = ' + fx(x));
      rD.set('loss if dog = ' + fx(fDog(x)));
      rC.set('loss if cat = ' + fx(fCat(x)));
      if (!solved) {
        if (fCat(x) < TARGET) {
          solved = true;
          rC.el.classList.add('l2-s3-ok');
          ctx.note('With \\(p = ' + fx(x) + '\\) the model is confident and right: the loss is \\(' + fx(fCat(x)) + '\\). A dog photo would now cost \\(' + fx(fDog(x)) + '\\).');
          ctx.solved();
        } else if (x > 0.5) {
          ctx.note('The model still favours dog. For a cat photo the loss is \\(-\\log(1-p) = ' + fx(fCat(x)) + '\\).');
        } else {
          ctx.note('The loss is \\(' + fx(fCat(x)) + '\\), still above \\(0.15\\). Lower \\(p\\) further.');
        }
      }
    }
    h = p.handle(0.88, fCat(0.88), {
      color: COL.cat, r: 13, snap: 0,
      onDrag: function (x) {
        if (busy) { return; }
        busy = true;
        var cx = Math.min(0.96, Math.max(0.02, x));
        cx = Math.round(cx * 100) / 100;
        h.set(cx, fCat(cx));
        show(cx);
        busy = false;
      }
    });
    show(0.88);
  }

  /* ---------- softmax table ---------- */
  function softmaxTable(parent) {
    var t = M4.el('div', { class: 'l2-s3-table' }, parent);
    M4.el('div', { class: 'l2-s3-h l2-s3-left', text: 'class' }, t);
    M4.el('div', { class: 'l2-s3-h l2-s3-left', text: 'probability' }, t);
    M4.el('div', { class: 'l2-s3-h', html: M4.tex('e^{z_k}') }, t);
    M4.el('div', { class: 'l2-s3-h', html: M4.tex('p_k') }, t);
    var rows = CLASSES.map(function (c) {
      var n = M4.el('div', { class: 'l2-s3-name', text: c }, t);
      n.style.color = COL[c];
      var tr = M4.el('div', { class: 'l2-s3-track' }, t);
      var b = M4.el('div', { class: 'l2-s3-bar' }, tr);
      b.style.background = COL[c];
      var e = M4.el('div', { class: 'l2-s3-num', text: '' }, t);
      var pr = M4.el('div', { class: 'l2-s3-num', text: '' }, t);
      return { bar: b, e: e, p: pr };
    });
    return {
      set: function (z) {
        var q = softmax(z), i;
        for (i = 0; i < 3; i++) {
          rows[i].bar.style.width = (q[i] * 100).toFixed(1) + '%';
          rows[i].e.textContent = fx(Math.exp(z[i]));
          rows[i].p.textContent = fx(q[i]);
        }
        return q;
      }
    };
  }

  /* step 5: softmax explore */
  function mountSoftmax(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: 'l2-s3-wrap' }, el);
    var z = Z0.slice();
    var table = softmaxTable(wrap);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rSum = readout(row, ''), rTot = readout(row, '');
    var box = M4.el('div', { class: 'l2-s3-sliders' }, wrap);
    function refresh() {
      var q = table.set(z);
      rSum.set('sum of e^z = ' + fx(Math.exp(z[0]) + Math.exp(z[1]) + Math.exp(z[2])));
      rTot.set('sum of p = ' + fx(q[0] + q[1] + q[2]));
    }
    var sl = CLASSES.map(function (c, i) {
      return M4.slider(box, {
        min: -4, max: 6, step: 0.1, value: z[i], label: 'score z, ' + c,
        format: function (v) { return fx(+v, 1); },
        onInput: function (v) { z[i] = +v; refresh(); }
      });
    });
    function shift(d) {
      var i;
      for (i = 0; i < 3; i++) { if (z[i] + d > 6 || z[i] + d < -4) { ctx.note('A score would leave the slider range. Shift in the other direction.'); return; } }
      for (i = 0; i < 3; i++) { z[i] = Math.round((z[i] + d) * 10) / 10; sl[i].set(z[i]); }
      refresh();
      ctx.note('All scores shifted by \\(' + (d > 0 ? '+' : '') + d + '\\). Every \\(e^{z_k}\\) is multiplied by the same factor, so the probabilities are unchanged.');
    }
    var btns = M4.el('div', { class: 'm4-row' }, wrap);
    M4.button(btns, 'All scores − 1', function () { shift(-1); });
    M4.button(btns, 'All scores + 1', function () { shift(1); });
    M4.button(btns, 'Reset', function () {
      z = Z0.slice(); sl.forEach(function (s, i) { s.set(z[i]); }); refresh(); ctx.note('');
    });
    M4.typeset(wrap);
    refresh();
  }

  /* step 6: softmax exercise, tie cat and dog */
  function mountSoftmaxTie(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: 'l2-s3-wrap' }, el);
    var z = Z0.slice();
    var table = softmaxTable(wrap);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rGap = readout(row, '');
    var box = M4.el('div', { class: 'l2-s3-sliders' }, wrap);
    var solved = false;
    function refresh(user) {
      var q = table.set(z), gap = q[0] - q[1];
      rGap.set('p(cat) − p(dog) = ' + fx(gap));
      if (solved || !user) { return; }
      if (Math.abs(gap) < 0.02) {
        solved = true;
        rGap.el.classList.add('l2-s3-ok');
        ctx.note('Equal scores give equal probabilities: \\(z_{\\text{dog}} = z_{\\text{cat}} = 2.3\\) and both classes receive \\(' + fx(q[0]) + '\\). Bird fell from \\(0.03\\) to \\(' + fx(q[2]) + '\\) although its score never changed.');
        ctx.solved();
      } else if (gap > 0) {
        ctx.note('Cat is still ahead by \\(' + fx(gap) + '\\). Raise the dog score.');
      } else {
        ctx.note('Dog is now ahead by \\(' + fx(-gap) + '\\). Lower the dog score.');
      }
    }
    M4.slider(box, {
      min: 0, max: 4, step: 0.1, value: z[1], label: 'score z, dog',
      format: function (v) { return fx(+v, 1); },
      onInput: function (v) { z[1] = Math.round(+v * 10) / 10; refresh(true); }
    });
    M4.el('div', { class: 'm4-note', text: 'Fixed scores: cat 2.3, bird −1.0.' }, wrap);
    M4.typeset(wrap);
    refresh(false);
  }

  /* ---------- simplex ---------- */
  function simplex(parent, opts) {
    var W = 560, H = 470;
    var A = [60, 420], B = [500, 420], T = [280, 39];   // cat, dog, bird
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'l2-s3-svg' }, parent);
    function toXY(q) { return [q[0] * A[0] + q[1] * B[0] + q[2] * T[0], q[0] * A[1] + q[1] * B[1] + q[2] * T[1]]; }
    function toQ(x, y) {
      var c = (A[1] - y) / (A[1] - T[1]);
      var b = (x - A[0] - c * (T[0] - A[0])) / (B[0] - A[0]);
      var q = [1 - b - c, b, c], i, s = 0;
      for (i = 0; i < 3; i++) { if (q[i] < 0.012) { q[i] = 0; } s += q[i]; }
      if (s <= 0) { return [1 / 3, 1 / 3, 1 / 3]; }
      for (i = 0; i < 3; i++) { q[i] = q[i] / s; }
      return q;
    }
    function poly(pts) { return pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
    S('polygon', { points: poly([A, B, T]), fill: '#ffffff', stroke: COL.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
    var k, g;
    for (k = 1; k < 4; k++) {           // faint grid at 0.25 steps
      g = k / 4;
      [[[g, 1 - g, 0], [g, 0, 1 - g]], [[1 - g, g, 0], [0, g, 1 - g]], [[1 - g, 0, g], [0, 1 - g, g]]].forEach(function (seg) {
        var a = toXY(seg[0]), b = toXY(seg[1]);
        S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: COL.line, 'stroke-width': 1.5 }, svg);
      });
    }
    var zone = null;
    if (opts.dogTarget) {
      var d = opts.dogTarget;
      zone = S('polygon', { points: poly([B, toXY([1 - d, d, 0]), toXY([0, d, 1 - d])]), fill: COL.green, 'fill-opacity': 0.16, stroke: COL.green, 'stroke-width': 2, 'stroke-dasharray': '6 6' }, svg);
    }
    S('text', { x: A[0], y: A[1] + 34, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 700, fill: COL.cat }, svg, 'cat');
    S('text', { x: B[0], y: B[1] + 34, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 700, fill: COL.dog }, svg, 'dog');
    S('text', { x: T[0], y: T[1] - 14, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 700, fill: COL.bird }, svg, 'bird');
    [[A, COL.cat], [B, COL.dog], [T, COL.bird]].forEach(function (c) {
      S('circle', { cx: c[0][0], cy: c[0][1], r: 7, fill: c[1] }, svg);
    });
    if (opts.ghost) {
      var gp = toXY(opts.ghost);
      S('circle', { cx: gp[0], cy: gp[1], r: 12, fill: 'none', stroke: COL.muted, 'stroke-width': 2, 'stroke-dasharray': '4 4' }, svg);
    }
    var q = opts.start.slice(), p0 = toXY(q);
    var halo = S('circle', { cx: p0[0], cy: p0[1], r: 26, fill: COL.cat, 'fill-opacity': 0.14 }, svg);
    var dot = S('circle', { cx: p0[0], cy: p0[1], r: 14, fill: COL.cat, stroke: '#ffffff', 'stroke-width': 3, style: 'cursor:grab' }, svg);
    var hit = S('circle', { cx: p0[0], cy: p0[1], r: 30, fill: 'transparent', style: 'cursor:grab;touch-action:none' }, svg);
    function place() {
      var xy = toXY(q);
      [halo, dot, hit].forEach(function (n) { n.setAttribute('cx', xy[0]); n.setAttribute('cy', xy[1]); });
    }
    var sx = 0, sy = 0;
    M4.drag(hit, {
      onStart: function () { var xy = toXY(q); sx = xy[0]; sy = xy[1]; },
      onMove: function (dx, dy) {
        var r = svg.getBoundingClientRect(), sc = r.width > 0 ? W / r.width : 1;
        q = toQ(sx + dx * sc, sy + dy * sc);
        place();
        if (opts.onChange) { opts.onChange(q, true); }
      },
      onEnd: function () { if (opts.onEnd) { opts.onEnd(q); } }
    });
    return {
      get: function () { return q; },
      set: function (nq) { q = nq.slice(); place(); if (opts.onChange) { opts.onChange(q, false); } },
      done: function () { dot.setAttribute('fill', COL.green); halo.setAttribute('fill', COL.green); if (zone) { zone.setAttribute('fill-opacity', 0.4); } }
    };
  }
  function lossText(v) { return v > 0 ? fx(-Math.log(v)) : '∞'; }

  /* step 7: simplex explore */
  function mountSimplex(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: 'l2-s3-wrap' }, el);
    var holder = M4.el('div', { style: 'width:100%;display:flex;justify-content:center' }, wrap);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var r = CLASSES.map(function (c) { var o = readout(row, ''); o.el.style.color = COL[c]; return o; });
    var rSum = readout(row, '');
    function upd(q) {
      var i;
      for (i = 0; i < 3; i++) { r[i].set(CLASSES[i] + ' ' + fx(q[i])); }
      rSum.set('sum = ' + fx(q[0] + q[1] + q[2]));
    }
    var sp = simplex(holder, { start: [1 / 3, 1 / 3, 1 / 3], onChange: upd });
    var btns = M4.el('div', { class: 'm4-row' }, wrap);
    M4.button(btns, 'Middle', function () { sp.set([1 / 3, 1 / 3, 1 / 3]); ctx.note('Middle of the triangle: all three classes receive \\(\\tfrac13\\). The model has no preference.'); });
    M4.button(btns, 'Cat corner', function () { sp.set([1, 0, 0]); ctx.note('A corner: the model is certain. Cat has probability \\(1\\), the others \\(0\\).'); });
    M4.button(btns, 'Cat-dog edge', function () { sp.set([0.5, 0.5, 0]); ctx.note('Midpoint of the bottom edge: cat and dog each have \\(0.5\\), and bird has probability \\(0\\).'); });
    M4.button(btns, 'Lecture example', function () { sp.set([0.82, 0.15, 0.03]); ctx.note('The prediction \\((0.82,\\ 0.15,\\ 0.03)\\) from the softmax step lies close to the cat corner.'); });
    upd(sp.get());
  }

  /* step 8: simplex exercise, train on a dog photo */
  function mountSimplexTrain(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: 'l2-s3-wrap' }, el);
    var holder = M4.el('div', { style: 'width:100%;display:flex;justify-content:center' }, wrap);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var r = CLASSES.map(function (c) { var o = readout(row, ''); o.el.style.color = COL[c]; return o; });
    var rL = readout(row, '');
    var solved = false, sp;
    var START = [0.82, 0.15, 0.03];
    function upd(q, user) {
      var i;
      for (i = 0; i < 3; i++) { r[i].set(CLASSES[i] + ' ' + fx(q[i])); }
      rL.set('loss −log q(dog) = ' + lossText(q[1]));
      if (solved || !user) { return; }
      if (q[1] > 0 && -Math.log(q[1]) < 0.2) {
        solved = true;
        rL.el.classList.add('l2-s3-ok');
        if (sp) { sp.done(); }
        ctx.note('The prediction now gives dog \\(' + fx(q[1]) + '\\), and the loss fell from \\(1.90\\) to \\(' + fx(-Math.log(q[1])) + '\\).');
        ctx.solved();
      } else if (q[1] <= 0) {
        ctx.note('On the cat-bird edge dog has probability \\(0\\), so the loss is infinite.');
      } else if (q[1] < 0.15) {
        ctx.note('The point moved away from the dog corner. The loss rose to \\(' + fx(-Math.log(q[1])) + '\\).');
      } else {
        ctx.note('Loss \\(' + fx(-Math.log(q[1])) + '\\). The target region requires \\(q_{\\text{dog}} > 0.82\\).');
      }
    }
    sp = simplex(holder, { start: START, ghost: START, dogTarget: 0.82, onChange: upd });
    M4.el('div', { class: 'm4-note', text: 'Dashed ring: the starting prediction. Green region: loss below 0.20.' }, wrap);
    upd(START, false);
  }

  /* step 9: categorical loss numeric */
  function mountCategorical(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: 'l2-s3-wrap' }, el);
    var table = softmaxTable(wrap);
    table.set(Z0);
    M4.typeset(wrap);
    M4.numberInput(wrap, {
      answer: 1.897, tolerance: 0.02, placeholder: 'e.g. 0.20', label: 'loss when the true label is dog',
      onCorrect: function () {
        ctx.note('\\(-\\log 0.15 \\approx 1.90\\). The same prediction costs \\(-\\log 0.82 \\approx 0.20\\) when the true label is cat.');
        ctx.solved();
      },
      onWrong: function (v) {
        var x = +v;
        if (Math.abs(x - 0.198) < 0.02) { ctx.wrong('That is \\(-\\log 0.82\\), the loss when the true label is cat. The true label here is dog.'); }
        else if (Math.abs(x - 0.15) < 0.006) { ctx.wrong('\\(0.15\\) is the likelihood \\(q_y\\). The loss is its negative logarithm.'); }
        else if (Math.abs(x - 0.824) < 0.02) { ctx.wrong('Use the natural logarithm, not the base-10 logarithm.'); }
        else if (x < 0) { ctx.wrong('The loss is the negative logarithm, so it is positive.'); }
        else { ctx.wrong('Compute \\(-\\ln q_{\\text{dog}}\\) with \\(q_{\\text{dog}} = 0.15\\).'); }
      }
    });
  }

  /* step 10: surprise curve explore */
  function mountSurprise(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: 'l2-s3-wrap' }, el);
    var YMAX = 5.3;
    var p = M4.plane(wrap, { xmin: -0.12, xmax: 1.12, ymin: -0.7, ymax: 5.7, width: 560, height: 440, grid: true, axes: true, labels: true });
    var f = function (x) { return -Math.log(x); };
    var lo = Math.exp(-YMAX);
    p.path(curvePts(f, lo, 1, 240), { stroke: COL.cat, width: 4 });
    p.text(0.5, -0.52, 'probability p', { fill: COL.muted, size: 15 });
    p.text(0.3, 4.6, 'surprise −log p', { fill: COL.cat, size: 16, weight: 600, anchor: 'start' });
    var marks = [
      { x: 1, name: 'sun rises: 0', col: COL.green, dx: -0.03, dy: 0.42, anchor: 'end' },
      { x: 0.5, name: 'coin, heads: 0.69', col: COL.dog, dx: 0.04, dy: 0.3, anchor: 'start' },
      { x: 1 / 6, name: 'die, six: 1.79', col: COL.bird, dx: 0.04, dy: 0.3, anchor: 'start' }
    ];
    marks.forEach(function (m) {
      p.point(m.x, f(m.x), { r: 7, fill: m.col });
      p.text(m.x + m.dx, f(m.x) + m.dy, m.name, { fill: m.col, size: 15, weight: 600, anchor: m.anchor });
    });
    var vl = p.line(0.75, 0, 0.75, f(0.75), { stroke: COL.cat, width: 2, dash: '4 5' });
    var hl = p.line(0, f(0.75), 0.75, f(0.75), { stroke: COL.cat, width: 2, dash: '4 5' });
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rP = readout(row, ''), rS = readout(row, ''), rO = readout(row, '');
    var busy = false, h;
    function show(x) {
      var s = f(x);
      vl.set(x, 0, x, s); hl.set(0, s, x, s);
      rP.set('p = ' + fx(x, 3));
      rS.set('surprise = ' + fx(s));
      rO.set('about 1 in ' + (1 / x < 10 ? fx(1 / x, 1) : Math.round(1 / x)));
    }
    h = p.handle(0.75, f(0.75), {
      color: COL.cat, r: 13, snap: 0,
      onDrag: function (x) {
        if (busy) { return; }
        busy = true;
        var cx = Math.min(1, Math.max(lo, x));
        h.set(cx, f(cx));
        show(cx);
        busy = false;
      }
    });
    show(0.75);
    M4.el('div', { class: 'm4-note', text: 'The lottery win (p = 1 in 10 million, surprise 16.1) lies far above the top of this plot.' }, wrap);
  }

  /* step 11: surprises add */
  function mountAdd(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: 'l2-s3-wrap' }, el);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var a = M4.el('span', { class: 'm4-chip', text: 'coin, heads: p = 1/2, surprise 0.69' }, row);
    var b = M4.el('span', { class: 'm4-chip', text: 'die, six: p = 1/6, surprise 1.79' }, row);
    a.style.fontSize = '16px'; b.style.fontSize = '16px';
    M4.numberInput(wrap, {
      answer: 2.485, tolerance: 0.016, placeholder: 'surprise', label: 'surprise of heads and a six together',
      onCorrect: function () {
        ctx.note('\\(-\\log\\!\\big(\\tfrac12\\cdot\\tfrac16\\big) = -\\log\\tfrac12 - \\log\\tfrac16 = 0.69 + 1.79 = 2.48\\). The probabilities multiply to \\(\\tfrac1{12}\\). The surprises add.');
        ctx.solved();
      },
      onWrong: function (v) {
        var x = +v;
        if (Math.abs(x - 1.242) < 0.03) { ctx.wrong('That is the product \\(0.69 \\times 1.79\\). Probabilities multiply. Surprises do not.'); }
        else if (Math.abs(x - 0.0833) < 0.004) { ctx.wrong('\\(\\tfrac1{12}\\) is the joint probability. The surprise is its negative logarithm.'); }
        else if (Math.abs(x - 1.079) < 0.02) { ctx.wrong('Use the natural logarithm: \\(-\\ln\\tfrac1{12}\\).'); }
        else if (x < 1.79) { ctx.wrong('The joint event is rarer than either single event, so its surprise exceeds \\(1.79\\).'); }
        else { ctx.wrong('The joint probability is \\(\\tfrac12\\cdot\\tfrac16 = \\tfrac1{12}\\). Take \\(-\\ln\\) of it, or add the two surprises.'); }
      }
    });
  }

  M4.lesson({
    id: 'l2-s3',
    module: 'l2',
    title: 'Classification losses',
    summary: 'Derive binary cross-entropy and the categorical loss from likelihood, locate softmax outputs on the simplex, and read the loss as surprise.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'From regression to classification',
        html: '<p>A Gaussian assumption about the data turned the negative log-likelihood into the mean squared error. The same recipe applies to classification, where the output is a class instead of a number.</p>' +
          '<p>In this lesson you will derive the binary cross-entropy from the Bernoulli distribution, convert scores into probabilities with the softmax, place a three-class prediction on the simplex, compute the categorical loss \\(-\\log q_y\\), and interpret that loss as surprise.</p>'
      },
      {
        kind: 'text',
        title: 'The Bernoulli distribution',
        html: '<p>Consider the question whether a photo shows a dog. The label is \\(y = 1\\) for dog and \\(y = 0\\) for cat, and the model outputs \\(p = \\sigma(z)\\), its probability that the photo shows a dog. With only two outcomes the data are Bernoulli distributed:</p>' +
          '\\[ p(y) = p^{\\,y}\\,(1-p)^{\\,1-y}. \\]' +
          '<p>The exponents act as an if-statement. A factor raised to the power \\(0\\) equals \\(1\\) and disappears, so each value of \\(y\\) selects exactly one of the two factors.</p>'
      },
      {
        kind: 'exercise',
        title: 'The Bernoulli formula',
        html: '<p>The loss is the negative logarithm of the likelihood, \\(-\\log p(y)\\) with \\(p(y) = p^{\\,y}(1-p)^{\\,1-y}\\). Drag the expression that remains for each label into its slot.</p>',
        hint: 'Substitute y = 1, then y = 0, into the formula. Anything raised to the power 0 equals 1.',
        mount: mountIfStatement
      },
      {
        kind: 'exercise',
        title: 'Binary cross-entropy',
        html: '<p>Both branches combine into the binary cross-entropy \\(-\\big[y\\log p + (1-y)\\log(1-p)\\big]\\). The model starts at \\(p = 0.88\\): if the photo is a dog the loss is \\(0.13\\), but if it is a cat the loss is \\(2.12\\).</p>' +
          '<p>The photo shows a cat. Drag the point along the purple curve until the loss is below \\(0.15\\).</p>',
        hint: 'For a cat photo the loss is −log(1 − p). It is small when p, the probability of dog, is close to 0. Solve 1 − p > e^(−0.15) ≈ 0.86.',
        mount: mountBCE
      },
      {
        kind: 'explore',
        title: 'The softmax',
        html: '<p>For three classes the model outputs one score \\(z_k\\) per class, called a logit, which may be any real number. The softmax exponentiates each score, which makes it positive, and divides by the sum, which makes the results add up to \\(1\\):</p>' +
          '\\[ p_k = \\frac{e^{z_k}}{\\sum_j e^{z_j}}. \\]' +
          '<p>The scores \\(2.3,\\ 0.6,\\ -1.0\\) give exponentials that sum to \\(12.16\\) and probabilities \\(0.82,\\ 0.15,\\ 0.03\\). Raise a single score and observe all three probabilities, then shift all scores by the same amount.</p>',
        mount: mountSoftmax
      },
      {
        kind: 'exercise',
        title: 'Competition between scores',
        html: '<p>Only the differences between scores matter, and a class gains probability at the expense of the others. Change the dog score until cat and dog receive the same probability.</p>',
        hint: 'Two classes have equal probability exactly when their scores are equal. The cat score is 2.3.',
        mount: mountSoftmaxTie
      },
      {
        kind: 'explore',
        title: 'The probability simplex',
        html: '<p>Three probabilities that sum to \\(1\\) fill a triangle, the simplex. Each corner stands for one class at probability \\(1\\). The closer the point is to a corner, the larger the probability of that class. On an edge the class of the opposite corner has probability \\(0\\).</p>' +
          '<p>Drag the point and read the distribution, or jump to the marked positions.</p>',
        mount: mountSimplex
      },
      {
        kind: 'exercise',
        title: 'Training on the simplex',
        html: '<p>Let \\(q\\) denote the predicted distribution. The model outputs \\(q = (0.82,\\ 0.15,\\ 0.03)\\) for a photo that shows a dog, so it would wrongly answer cat. Training changes the prediction so that \\(-\\log q_{\\text{dog}}\\) shrinks.</p>' +
          '<p>Drag the prediction until the loss for the true class dog is below \\(0.20\\).</p>',
        hint: 'A loss below 0.20 requires q_dog above e^(−0.20) ≈ 0.82. Move the point into the shaded region at the dog corner.',
        mount: mountSimplexTrain
      },
      {
        kind: 'exercise',
        title: 'The categorical loss',
        html: '<p>For a categorical distribution the likelihood of a data point is the predicted probability of its true class \\(y\\), written \\(q_y\\). The loss is again the negative logarithm, \\(-\\log q_y\\), with the natural logarithm. This is the cross-entropy loss.</p>' +
          '<p>For the prediction below, a true label cat gives \\(-\\log 0.82 \\approx 0.20\\). Compute the loss when the true label is dog.</p>',
        hint: 'Only the probability of the true class enters: −ln(0.15).',
        mount: mountCategorical
      },
      {
        kind: 'explore',
        title: 'Surprise',
        html: '<p>Information theory gives the same quantity a second reading. The surprise of an event with probability \\(p\\) is \\(-\\log p\\): a certain event has surprise \\(0\\), and the surprise grows without bound as \\(p\\) approaches \\(0\\).</p>' +
          '<p>Drag the point along the curve. The sun rising has surprise close to \\(0\\), a coin showing heads \\(0.69\\), a die showing a six \\(1.79\\), and a lottery win about \\(16.1\\). The loss \\(-\\log q_y\\) is the surprise of the model at the true label.</p>',
        mount: mountSurprise
      },
      {
        kind: 'exercise',
        title: 'Surprise of independent events',
        html: '<p>The logarithm is used because it turns products into sums. A fair coin and a fair die are thrown together, and the two results are independent.</p>' +
          '<p>Compute the surprise of observing heads and a six at the same time, to two decimal places.</p>',
        hint: 'The joint probability is 1/2 · 1/6 = 1/12. Either take −ln(1/12), or add the two surprises 0.69 and 1.79.',
        mount: mountAdd
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li><strong>Two outcomes.</strong> The Bernoulli likelihood \\(p^{\\,y}(1-p)^{\\,1-y}\\) selects \\(p\\) or \\(1-p\\). Its negative logarithm is the binary cross-entropy, which is \\(0.13\\) or \\(2.12\\) for \\(p = 0.88\\).</li>' +
          '<li><strong>Several classes.</strong> The softmax \\(p_k = e^{z_k} / \\sum_j e^{z_j}\\) maps scores to a point on the simplex. Only score differences matter, and the loss is \\(-\\log q_y\\), the cross-entropy loss.</li>' +
          '<li><strong>Surprise.</strong> \\(-\\log p\\) is \\(0\\) for certain events, large for rare ones, and additive for independent events. The loss is the surprise of the model at the true label.</li>' +
          '</ul>'
      }
    ]
  });
})();
