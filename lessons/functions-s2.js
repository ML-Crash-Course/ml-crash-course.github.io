(function () {
  'use strict';
  var M4 = window.M4;
  if (!M4 || typeof M4.lesson !== 'function') { return; }
  var C = M4.colors || {};
  var ORANGE = C.orange || '#ff8a1f', BLUE = C.blue || '#2f6bff', GREEN = C.green || '#16b56b',
    PURPLE = C.purple || '#7a5cff', INK = C.ink || '#1d1d1f', MUTED = C.muted || '#6b6f76',
    LINE = C.line || '#e6e4dd';
  var E = Math.E;

  function injectStyle() {
    if (document.getElementById('functions-s2-style')) { return; }
    var s = document.createElement('style');
    s.id = 'functions-s2-style';
    s.textContent =
      '.functions-s2-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%}' +
      '.functions-s2-svg{width:100%;height:auto;display:block;touch-action:pan-y}' +
      '.functions-s2-rows{display:flex;flex-direction:column;gap:12px;align-items:stretch;width:100%;max-width:440px}' +
      '.functions-s2-eqrow{display:grid;grid-template-columns:1fr 32px 1fr;align-items:center;gap:8px;font-size:20px}' +
      '.functions-s2-eqrow .functions-s2-lhs{text-align:right}' +
      '.functions-s2-eqrow .functions-s2-eq{text-align:center;color:' + MUTED + '}' +
      '.functions-s2-slot{min-width:130px;min-height:58px;display:flex;align-items:center;justify-content:center}' +
      '.functions-s2-slot.functions-s2-ok{border-color:' + GREEN + ';border-style:solid;background:rgba(22,181,107,0.08)}' +
      '.functions-s2-tray{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;min-height:62px;width:100%}' +
      '.functions-s2-token{min-width:96px;min-height:46px;padding:6px 14px;display:flex;align-items:center;justify-content:center;font-size:20px;touch-action:none}' +
      '.functions-s2-handle{cursor:grab;touch-action:none}';
    document.head.appendChild(s);
  }

  function S(tag, attrs, parent, text) {
    var n = M4.svg(tag, attrs || {}, parent);
    if (text !== undefined) { n.textContent = text; }
    return n;
  }
  function wrap(el) {
    injectStyle();
    el.innerHTML = '';
    return M4.el('div', { class: 'functions-s2-wrap' }, el);
  }
  // A readout pill "label = value" with a KaTeX label and a live value.
  function readout(parent, labelTex) {
    var pill = M4.el('span', { class: 'm4-readout' }, parent);
    var lab = M4.el('span', {}, pill);
    lab.innerHTML = M4.tex(labelTex) + '&nbsp;=&nbsp;';
    var val = M4.el('span', { text: '' }, pill);
    return { el: pill, set: function (t) { val.textContent = t; } };
  }
  function fmt(v) {
    if (v >= 100) { return String(Math.round(v)); }
    if (v >= 10) { return v.toFixed(1); }
    if (v >= 0.1) { return v.toFixed(2); }
    return v.toFixed(3);
  }
  function clampFn(f, top) {
    return function (x) { var y = f(x); return y > top ? top : y; };
  }

  /* ---------- step 2: repeated multiplication (bars) ---------- */
  function mountBars(el, ctx) {
    var root = wrap(el);
    var W = 640, H = 340, base = 290, maxH = 240, K = 8;
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'functions-s2-svg' }, root);
    S('line', { x1: 24, y1: base, x2: W - 24, y2: base, stroke: LINE, 'stroke-width': 2 }, svg);
    var bars = [], vals = [], i;
    for (i = 0; i <= K; i++) {
      var cx = 64 + i * 64;
      bars.push(S('rect', { x: cx - 22, y: base, width: 44, height: 0, rx: 6, fill: ORANGE }, svg));
      vals.push(S('text', { x: cx, y: base - 8, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: INK }, svg, ''));
      S('text', { x: cx, y: base + 26, 'text-anchor': 'middle', 'font-size': 16, fill: MUTED }, svg, String(i));
    }
    S('text', { x: W / 2, y: H - 2, 'text-anchor': 'middle', 'font-size': 15, fill: MUTED }, svg, 'number of multiplications n');
    var row = M4.el('div', { class: 'm4-row' }, root);
    var rB = readout(row, 'b'), rN = readout(row, 'n'), rV = readout(row, 'b^n');
    var b = 2, n = 3, timer = null;
    function draw() {
      var top = Math.max(1, Math.pow(b, K));
      for (var k = 0; k <= K; k++) {
        var v = Math.pow(b, k), h = Math.max(3, maxH * v / top), on = k <= n;
        bars[k].setAttribute('y', base - h);
        bars[k].setAttribute('height', h);
        bars[k].setAttribute('fill', on ? (k === n ? ORANGE : '#ffc48a') : LINE);
        vals[k].setAttribute('y', base - h - 8);
        vals[k].textContent = on ? fmt(v) : '';
      }
      rB.set(b.toFixed(1)); rN.set(String(n)); rV.set(fmt(Math.pow(b, n)));
    }
    var controls = M4.el('div', { class: 'm4-col', style: 'width:100%;max-width:520px' }, root);
    M4.slider(controls, {
      min: 0.5, max: 2, step: 0.1, value: b, label: 'base b',
      format: function (v) { return Number(v).toFixed(1); },
      onInput: function (v) { b = Math.round(Number(v) * 10) / 10; draw(); }
    });
    var sn = M4.slider(controls, {
      min: 0, max: K, step: 1, value: n, label: 'exponent n',
      format: function (v) { return String(Math.round(Number(v))); },
      onInput: function (v) { n = Math.round(Number(v)); draw(); }
    });
    function stop() { if (timer !== null) { clearInterval(timer); timer = null; } }
    M4.button(root, 'Multiply step by step', function () {
      stop();
      n = 0; sn.set(0); draw();
      timer = setInterval(function () {
        if (n >= K) { stop(); return; }
        n += 1; sn.set(n); draw();
      }, 450);
    }, { primary: true });
    ctx.onCleanup(stop);
    draw();
  }

  /* ---------- step 5: slide the base until the curve passes through (-2, 4) ---------- */
  function mountBase(el, ctx) {
    var root = wrap(el);
    var p = M4.plane(root, { xmin: -3, xmax: 3, ymin: -1, ymax: 8, width: 560, height: 480 });
    var b = 2, done = false;
    var ring = S('circle', {
      cx: p.x(-2), cy: p.y(4), r: 14, fill: GREEN, 'fill-opacity': 0.12,
      stroke: GREEN, 'stroke-width': 3, 'stroke-dasharray': '5 4'
    }, p.g);
    p.text(-2, 4.75, 'target (−2, 4)', { fill: GREEN, size: 16, weight: 700 });
    var curve = p.fn(clampFn(function (x) { return Math.pow(b, x); }, 8.6), { stroke: ORANGE, width: 4 });
    p.point(0, 1, { r: 6, fill: INK });
    var row = M4.el('div', { class: 'm4-row' }, root);
    var rB = readout(row, 'b'), rV = readout(row, 'b^{-2}');
    function update() {
      curve.set(clampFn(function (x) { return Math.pow(b, x); }, 8.6));
      var v = Math.pow(b, -2);
      rB.set(b.toFixed(2)); rV.set(fmt(v));
      if (Math.abs(b - 0.5) < 0.026) {
        ring.setAttribute('fill-opacity', 0.9);
        ring.removeAttribute('stroke-dasharray');
        ctx.note('With \\(b = 0.5\\): \\(0.5^{-2} = 1 / 0.5^{2} = 1 / 0.25 = 4\\). A base below 1 gives decay, so the curve is high on the left.');
        if (!done) { done = true; ctx.solved(); }
      } else {
        ring.setAttribute('fill-opacity', 0.12);
        ring.setAttribute('stroke-dasharray', '5 4');
        if (b > 1) {
          ctx.note('For \\(b > 1\\) the curve rises to the right, so at \\(x = -2\\) it lies below 1. The target needs a decaying curve.');
        } else if (b === 1) {
          ctx.note('For \\(b = 1\\) the function is constant: \\(1^x = 1\\).');
        } else if (v < 4) {
          ctx.note('At \\(x = -2\\) the curve is at ' + fmt(v) + ', below the target. A smaller base decays faster.');
        } else {
          ctx.note('At \\(x = -2\\) the curve is at ' + fmt(v) + ', above the target. A base closer to 1 decays more slowly.');
        }
      }
    }
    var box = M4.el('div', { class: 'm4-col', style: 'width:100%;max-width:520px' }, root);
    M4.slider(box, {
      min: 0.25, max: 3, step: 0.05, value: b, label: 'base b',
      format: function (v) { return Number(v).toFixed(2); },
      onInput: function (v) { b = Math.round(Number(v) * 100) / 100; update(); }
    });
    update();
  }

  /* ---------- step 6: compounding and the number e ---------- */
  function mountE(el) {
    var root = wrap(el);
    var NS = [1, 2, 3, 4, 6, 12, 52, 365, 1000];
    var p = M4.plane(root, { xmin: -0.2, xmax: 1.2, ymin: -0.4, ymax: 3.4, width: 560, height: 460 });
    p.line(-0.2, E, 1.2, E, { stroke: PURPLE, width: 2, dash: '6 5' });
    p.text(0.3, E + 0.2, 'e ≈ 2.718', { fill: PURPLE, size: 17, weight: 700 });
    p.path((function () {
      var a = [], i;
      for (i = 0; i <= 60; i++) { a.push([i / 60, Math.exp(i / 60)]); }
      return a;
    })(), { stroke: PURPLE, width: 2 }).el.setAttribute('stroke-opacity', '0.35');
    var stair = p.path([[0, 1], [1, 1]], { stroke: ORANGE, width: 4 });
    p.point(0, 1, { r: 5, fill: INK });
    var end = p.point(1, 2, { r: 8, fill: ORANGE });
    p.text(0.5, -0.28, 'time t (one unit)', { fill: MUTED, size: 15 });
    var row = M4.el('div', { class: 'm4-row' }, root);
    var rN = readout(row, 'n'), rV = readout(row, '\\left(1+\\tfrac{1}{n}\\right)^{n}'), rG = readout(row, 'e - \\text{value}');
    function draw(idx) {
      var n = NS[idx], pts = [[0, 1]], v = 1, i;
      for (i = 0; i < n; i++) {
        pts.push([(i + 1) / n, v]);
        v *= 1 + 1 / n;
        pts.push([(i + 1) / n, v]);
      }
      stair.set(pts);
      end.set(1, v);
      rN.set(String(n)); rV.set(v.toFixed(4)); rG.set((E - v).toFixed(4));
    }
    var box = M4.el('div', { class: 'm4-col', style: 'width:100%;max-width:520px' }, root);
    M4.slider(box, {
      min: 0, max: NS.length - 1, step: 1, value: 0, label: 'growth steps n',
      format: function (v) { return String(NS[Math.round(Number(v))]); },
      onInput: function (v) { draw(Math.round(Number(v))); }
    });
    draw(0);
  }

  /* ---------- step 7: drag along e^x until the slope is 2 ---------- */
  function mountTangent(el, ctx) {
    var root = wrap(el);
    var Wd = 520;
    var p = M4.plane(root, { xmin: -4, xmax: 4, ymin: -1, ymax: 7, width: Wd, height: 520 });
    var stem = p.line(0, 0, 0, 1, { stroke: MUTED, width: 2, dash: '5 5' });
    var run = p.line(0, 1, 1, 1, { stroke: BLUE, width: 3 });
    var rise = p.line(1, 1, 1, 2, { stroke: BLUE, width: 3 });
    p.fn(clampFn(Math.exp, 7.6), { stroke: ORANGE, width: 4 });
    var tan = p.line(-1.5, -0.5, 1.5, 2.5, { stroke: INK, width: 3 });
    var runT = p.text(0.5, 0.7, '1', { fill: BLUE, size: 16, weight: 700 });
    var riseT = p.text(1.3, 1.5, 'rise', { fill: BLUE, size: 16, weight: 700, anchor: 'start' });
    var halo = S('circle', { r: 20, fill: ORANGE, 'fill-opacity': 0.18 }, p.g);
    var dot = S('circle', { r: 12, fill: ORANGE, stroke: '#fff', 'stroke-width': 3, class: 'functions-s2-handle' }, p.g);
    halo.setAttribute('class', 'functions-s2-handle');
    var row = M4.el('div', { class: 'm4-row' }, root);
    var rX = readout(row, 'x'), rH = readout(row, '\\text{height } e^{x}'), rS = readout(row, '\\text{slope}');
    var x0 = 0, sx = 0, done = false;
    function setX(x) {
      x0 = Math.max(-3.5, Math.min(1.9, x));
      var y = Math.exp(x0);
      [halo, dot].forEach(function (c) { c.setAttribute('cx', p.x(x0)); c.setAttribute('cy', p.y(y)); });
      stem.set(x0, 0, x0, y);
      run.set(x0, y, x0 + 1, y);
      rise.set(x0 + 1, y, x0 + 1, 2 * y);
      tan.set(x0 - 1.5, y - 1.5 * y, x0 + 1.5, y + 1.5 * y);
      runT.set(x0 + 0.5, y - 0.4, '1');
      riseT.set(x0 + 1.15, Math.min(1.5 * y, 6.5), 'rise ' + y.toFixed(2));
      rX.set(x0.toFixed(2)); rH.set(y.toFixed(2)); rS.set(y.toFixed(2));
    }
    function check() {
      if (done) { return; }
      var s = Math.exp(x0);
      if (Math.abs(s - 2) <= 0.25) {
        done = true;
        setX(Math.LN2);
        dot.setAttribute('fill', GREEN); halo.setAttribute('fill', GREEN);
        ctx.note('At \\(x \\approx 0.69\\) the height is \\(e^{x} = 2\\) and the tangent slope is also 2. For \\(e^x\\), slope and height agree at every point.');
        ctx.solved();
      } else if (s < 2) {
        ctx.note('The slope here is ' + s.toFixed(2) + ', which is less than 2. The curve is steeper further to the right.');
      } else {
        ctx.note('The slope here is ' + s.toFixed(2) + ', which is more than 2. The curve is flatter further to the left.');
      }
    }
    var opts = {
      onStart: function () { sx = p.x(x0); },
      onMove: function (dx) {
        if (done) { return; }
        var r = p.svg.getBoundingClientRect();
        var k = r.width > 0 ? Wd / r.width : 1;
        setX(p.ux(sx + dx * k));
      },
      onEnd: check
    };
    M4.drag(dot, opts);
    M4.drag(halo, opts);
    setX(0);
    M4.el('div', { class: 'm4-note', text: 'Drag the orange point along the curve. The blue triangle shows the rise of the tangent over a run of 1.' }, root);
  }

  /* ---------- step 8: addition in the exponent is multiplication of values ---------- */
  function mountAdd(el) {
    var root = wrap(el);
    var p = M4.plane(root, { xmin: -3, xmax: 3, ymin: -1, ymax: 8, width: 560, height: 480 });
    p.fn(clampFn(Math.exp, 8.6), { stroke: MUTED, width: 3 });
    var a = 0.7, b = 0.4;
    var sa = p.line(0, 0, 0, 1, { stroke: BLUE, width: 5 });
    var sb = p.line(0, 0, 0, 1, { stroke: PURPLE, width: 5 });
    var sc = p.line(0, 0, 0, 1, { stroke: ORANGE, width: 5 });
    var pa = p.point(0, 1, { r: 7, fill: BLUE }), pb = p.point(0, 1, { r: 7, fill: PURPLE }), pc = p.point(0, 1, { r: 8, fill: ORANGE });
    var ta = p.text(0, -0.4, 'a', { fill: BLUE, size: 17, weight: 700 });
    var tb = p.text(0, -0.8, 'b', { fill: PURPLE, size: 17, weight: 700 });
    var tc = p.text(0, 1.5, 'a + b', { fill: ORANGE, size: 17, weight: 700 });
    var row = M4.el('div', { class: 'm4-row' }, root);
    var rA = readout(row, 'e^{a}'), rB = readout(row, 'e^{b}');
    var row2 = M4.el('div', { class: 'm4-row' }, root);
    var rP = readout(row2, 'e^{a} \\cdot e^{b}'), rC = readout(row2, 'e^{a+b}');
    rA.el.style.borderColor = BLUE; rB.el.style.borderColor = PURPLE;
    rP.el.style.borderColor = ORANGE; rC.el.style.borderColor = ORANGE;
    function draw() {
      var ea = Math.exp(a), eb = Math.exp(b), c = a + b, ec = Math.exp(c);
      sa.set(a, 0, a, ea); sb.set(b, 0, b, eb); sc.set(c, 0, c, ec);
      pa.set(a, ea); pb.set(b, eb); pc.set(c, ec);
      ta.set(a, -0.4, 'a'); tb.set(b, -0.8, 'b'); tc.set(c, ec + 0.45, 'a + b');
      rA.set(ea.toFixed(3)); rB.set(eb.toFixed(3));
      rP.set((ea * eb).toFixed(3)); rC.set(ec.toFixed(3));
    }
    var box = M4.el('div', { class: 'm4-col', style: 'width:100%;max-width:520px' }, root);
    M4.slider(box, {
      min: -1, max: 1, step: 0.1, value: a, label: 'a',
      format: function (v) { return Number(v).toFixed(1); },
      onInput: function (v) { a = Math.round(Number(v) * 10) / 10; draw(); }
    });
    M4.slider(box, {
      min: -1, max: 1, step: 0.1, value: b, label: 'b',
      format: function (v) { return Number(v).toFixed(1); },
      onInput: function (v) { b = Math.round(Number(v) * 10) / 10; draw(); }
    });
    draw();
  }

  /* ---------- step 9: match the exponent rules (tokens into slots) ---------- */
  function mountRules(el, ctx) {
    var root = wrap(el);
    var rows = [
      { key: 'sum', lhs: 'e^{a} \\cdot e^{b}', why: 'Multiplying two powers of the same base adds the exponents.' },
      { key: 'diff', lhs: '\\dfrac{e^{a}}{e^{b}}', why: 'Dividing two powers of the same base subtracts the exponents.' },
      { key: 'prod', lhs: '\\left(e^{a}\\right)^{b}', why: 'Raising a power to a power multiplies the exponents.' },
      { key: 'neg', lhs: '\\dfrac{1}{e^{a}}', why: 'A reciprocal corresponds to a negative exponent.' }
    ];
    var toks = [
      { key: 'prod', tex: 'e^{ab}' }, { key: 'neg', tex: 'e^{-a}' }, { key: 'none', tex: 'e^{a/b}' },
      { key: 'sum', tex: 'e^{a+b}' }, { key: 'diff', tex: 'e^{a-b}' }
    ];
    var list = M4.el('div', { class: 'functions-s2-rows' }, root);
    var slots = [], placed = 0, done = false;
    rows.forEach(function (r) {
      var row = M4.el('div', { class: 'functions-s2-eqrow' }, list);
      M4.el('div', { class: 'functions-s2-lhs', html: M4.tex(r.lhs) }, row);
      M4.el('div', { class: 'functions-s2-eq', text: '=' }, row);
      var slot = M4.el('div', { class: 'm4-slot functions-s2-slot' }, row);
      slot.setAttribute('data-key', r.key);
      slot.setAttribute('data-why', r.why);
      slots.push(slot);
    });
    var tray = M4.el('div', { class: 'functions-s2-tray' }, root);
    var tokens = toks.map(function (t) {
      var tok = M4.el('div', { class: 'm4-token functions-s2-token', html: M4.tex(t.tex) }, tray);
      tok.setAttribute('data-key', t.key);
      return tok;
    });
    function home(tok) {
      tok.style.transform = ''; tok.style.left = ''; tok.style.top = ''; tok.style.position = '';
      tray.appendChild(tok);
    }
    M4.dragDrop({
      tokens: tokens,
      slots: slots,
      onDrop: function (tok, slot) {
        if (done || tok.getAttribute('data-locked') === '1') { return; }
        if (slot.getAttribute('data-full') === '1') { home(tok); return; }
        if (tok.getAttribute('data-key') === slot.getAttribute('data-key')) {
          tok.style.transform = ''; tok.style.left = ''; tok.style.top = ''; tok.style.position = '';
          slot.appendChild(tok);
          slot.setAttribute('data-full', '1');
          tok.setAttribute('data-locked', '1');
          tok.style.cursor = 'default';
          tok.style.pointerEvents = 'none';
          slot.classList.add('filled', 'functions-s2-ok', 'm4-pop');
          placed += 1;
          ctx.note(slot.getAttribute('data-why'));
          if (placed === rows.length) {
            done = true;
            ctx.note('All four rules are matched. The remaining tile \\(e^{a/b}\\) equals none of the left-hand sides.');
            ctx.solved();
          }
        } else {
          home(tok);
          ctx.wrong('That tile does not equal this expression. ' + slot.getAttribute('data-why'));
        }
      },
      onMiss: function (tok) { if (tok.getAttribute('data-locked') !== '1') { home(tok); } }
    });
    M4.el('div', { class: 'm4-note', text: 'Drag each tile onto the expression it equals. One tile is left over.' }, root);
  }

  /* ---------- step 10: softmax, slide the score until p = 0.75 ---------- */
  function mountSoftmax(el, ctx) {
    var root = wrap(el);
    var W = 640, H = 250, x0 = 150, bw = 400;
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'functions-s2-svg' }, root);
    var names = ['answer A', 'answer B', 'answer C'], cols = [ORANGE, BLUE, PURPLE];
    var bars = [], vals = [], i;
    for (i = 0; i < 3; i++) {
      var y = 40 + i * 66;
      S('text', { x: x0 - 16, y: y + 28, 'text-anchor': 'end', 'font-size': 17, 'font-weight': 700, fill: INK }, svg, names[i]);
      S('rect', { x: x0, y: y, width: bw, height: 42, rx: 10, fill: LINE, 'fill-opacity': 0.6 }, svg);
      bars.push(S('rect', { x: x0, y: y, width: 0, height: 42, rx: 10, fill: cols[i] }, svg));
      vals.push(S('text', { x: x0 + bw + 14, y: y + 28, 'font-size': 17, 'font-weight': 700, fill: INK }, svg, ''));
    }
    var tx = x0 + 0.75 * bw;
    var tline = S('line', { x1: tx, y1: 28, x2: tx, y2: 94, stroke: GREEN, 'stroke-width': 3, 'stroke-dasharray': '5 4' }, svg);
    S('text', { x: tx, y: 20, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: GREEN }, svg, 'target 0.75');
    var row = M4.el('div', { class: 'm4-row' }, root);
    var rZ = readout(row, 'z_A'), rW = readout(row, 'e^{z_A}'), rP = readout(row, 'p_A');
    var z = 0, done = false;
    function draw() {
      var w = [Math.exp(z), 1, 1], s = w[0] + 2, k;
      for (k = 0; k < 3; k++) {
        bars[k].setAttribute('width', Math.max(0, bw * w[k] / s));
        vals[k].textContent = (w[k] / s).toFixed(3);
      }
      var pA = w[0] / s;
      rZ.set(z.toFixed(2)); rW.set(w[0].toFixed(2)); rP.set(pA.toFixed(3));
      if (Math.abs(pA - 0.75) <= 0.01) {
        tline.removeAttribute('stroke-dasharray');
        ctx.note('The weight \\(e^{z_A} \\approx 6\\) is six times each of the other two weights, so \\(p_A \\approx 6 / (6 + 1 + 1) = 0.75\\).');
        if (!done) { done = true; ctx.solved(); }
      } else {
        tline.setAttribute('stroke-dasharray', '5 4');
        if (pA < 0.75) {
          ctx.note('\\(p_A = ' + pA.toFixed(3) + '\\) is below 0.75. The weight \\(e^{z_A}\\) must reach about 6, since \\(6/(6+1+1) = 0.75\\).');
        } else {
          ctx.note('\\(p_A = ' + pA.toFixed(3) + '\\) is above 0.75. The weight \\(e^{z_A}\\) must come down to about 6.');
        }
      }
    }
    var box = M4.el('div', { class: 'm4-col', style: 'width:100%;max-width:520px' }, root);
    M4.slider(box, {
      min: 0, max: 4, step: 0.1, value: 0, label: 'score of answer A',
      format: function (v) { return Number(v).toFixed(1); },
      onInput: function (v) { z = Math.round(Number(v) * 10) / 10; draw(); }
    });
    draw();
  }

  M4.lesson({
    id: 'functions-s2',
    module: 'functions',
    title: 'Exponentials',
    summary: 'Repeated multiplication, growth and decay, the number e, and the rule that turns sums in the exponent into products.',
    minutes: 10,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>An exponential function describes a quantity that is multiplied by the same factor in every step.</p><p>In this lesson you will read \\(b^x\\) as repeated multiplication, distinguish growth from decay, explain where the number \\(e \\approx 2.718\\) comes from, and use the rule \\(e^{a+b} = e^{a} e^{b}\\).</p><p>In machine learning they turn raw scores into chances that add up to 1, for example in the softmax function at the end of this lesson.</p>'
      },
      {
        kind: 'explore',
        title: 'Repeated multiplication',
        html: '<p>For a positive number \\(b\\), called the <em>base</em>, and a whole number \\(n\\), called the <em>exponent</em>, the power \\(b^n\\) is the result of starting at 1 and multiplying by \\(b\\) exactly \\(n\\) times. In particular \\(b^0 = 1\\) and \\(b^1 = b\\).</p><p>Each bar below is \\(b\\) times as tall as the bar to its left. Compare a base above 1 with a base below 1.</p>',
        mount: mountBars
      },
      {
        kind: 'exercise',
        title: 'Ten doublings',
        html: '<p>A quantity starts at 1 and doubles ten times in a row. What is its final value, \\(2^{10}\\)?</p>',
        hint: 'Doubling repeatedly gives 2, 4, 8, 16, 32, 64, 128, 256, 512, and then one more doubling.',
        mount: function (el, ctx) {
          var root = wrap(el);
          var msgs = [
            '\\(20 = 2 \\cdot 10\\) is repeated addition of 2. The exponent counts multiplications.',
            '\\(100 = 10^{2}\\) swaps base and exponent. Here the base is 2 and the exponent is 10.',
            '',
            '\\(2048 = 2^{11}\\) is one doubling too many.'
          ];
          M4.choices(root, {
            options: ['\\(20\\)', '\\(100\\)', '\\(1024\\)', '\\(2048\\)'],
            correct: 2,
            onCorrect: function () {
              ctx.note('\\(2^{10} = 1024\\). Ten doublings multiply the starting value by roughly one thousand.');
              ctx.solved();
            },
            onWrong: function (i) { ctx.wrong(); ctx.note(msgs[i] || 'Count the doublings one at a time.'); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Growth, decay and real exponents',
        html: '<p>The exponential function with base \\(b > 0\\) is \\(f(x) = b^x\\), where the exponent \\(x\\) may be any real number. Negative exponents are defined by \\(b^{-x} = 1 / b^{x}\\), so moving one unit to the left divides the value by \\(b\\).</p><p>If \\(b > 1\\) the function grows as \\(x\\) increases. If \\(0 < b < 1\\) it decays towards 0. In both cases the value is always positive and the graph passes through \\((0, 1)\\), because \\(b^0 = 1\\).</p>'
      },
      {
        kind: 'exercise',
        title: 'Base of an exponential',
        html: '<p>The orange curve is \\(y = b^x\\). Adjust the base \\(b\\) until the curve passes through the target point \\((-2,\\, 4)\\).</p>',
        hint: 'The condition is \\(b^{-2} = 1/b^{2} = 4\\), so \\(b^{2} = 1/4\\).',
        mount: mountBase
      },
      {
        kind: 'explore',
        title: 'The number e',
        html: '<p>Suppose a quantity starts at 1 and grows by 100% over one unit of time, but the growth is added in \\(n\\) equal steps of \\(1/n\\) each. Every step multiplies the value by \\(1 + \\tfrac{1}{n}\\), so the final value is \\(\\left(1 + \\tfrac{1}{n}\\right)^{n}\\).</p><p>As \\(n\\) increases, the staircase approaches a smooth curve and the final value approaches a fixed number, \\(e \\approx 2.71828\\). The smooth limit curve is \\(y = e^{t}\\).</p>',
        mount: mountE
      },
      {
        kind: 'exercise',
        title: 'Slope of the exponential',
        html: '<p>The base \\(e\\) is singled out by one property: at every point of the curve \\(y = e^{x}\\), the slope of the tangent line equals the height of the curve. Move the point along the curve until the tangent has slope 2.</p>',
        hint: 'The slope equals the height \\(e^{x}\\). Look for the place where the curve is at height 2, slightly to the right of \\(x = 0.5\\).',
        mount: mountTangent
      },
      {
        kind: 'explore',
        title: 'Sums of exponents',
        html: '<p>Multiplying \\(a\\) factors of a base by \\(b\\) further factors gives \\(a + b\\) factors in total. The same rule holds for all real exponents: \\[ e^{a+b} = e^{a} \\cdot e^{b}. \\]</p><p>Set \\(a\\) and \\(b\\) below. The orange stem at \\(a + b\\) always has the height obtained by multiplying the blue and purple heights.</p>',
        mount: mountAdd
      },
      {
        kind: 'exercise',
        title: 'Rules for exponents',
        html: '<p>Three further rules follow from \\(e^{a+b} = e^{a} e^{b}\\): division subtracts exponents, a reciprocal negates the exponent, and a power of a power multiplies exponents. Match each expression on the left with an equal expression.</p>',
        hint: 'Test with small whole numbers and base 2 in place of \\(e\\): for \\(a = 3,\\ b = 2\\), \\(2^3 \\cdot 2^2 = 32 = 2^5\\) and \\((2^3)^2 = 64 = 2^6\\).',
        mount: mountRules
      },
      {
        kind: 'exercise',
        title: 'Softmax',
        html: '<p>Suppose a program has to choose one of three answers A, B and C, and gives each answer a score, where a larger score means more confidence. The softmax function turns the scores \\(z_A, z_B, z_C\\) into three chances that are positive and add up to 1. It exponentiates every score and divides by the total: \\[ p_A = \\frac{e^{z_A}}{e^{z_A} + e^{z_B} + e^{z_C}}. \\] Exponentials are used because they are always positive and because adding a constant to a score multiplies its weight by a fixed factor.</p><p>Here \\(z_B = z_C = 0\\). Raise the score \\(z_A\\) until answer A gets the chance \\(0.75\\) (within 0.01).</p>',
        hint: 'With \\(e^{z_B} = e^{z_C} = 1\\), the condition is \\(e^{z_A} / (e^{z_A} + 2) = 0.75\\), which holds when \\(e^{z_A} = 6\\). The displayed value of \\(e^{z_A}\\) helps.',
        mount: mountSoftmax
      },
      {
        kind: 'exercise',
        title: 'Exponent rules practice',
        html: '<p>Two numbers \\(a\\) and \\(b\\) are not known, but it is known that \\(e^{a} = 3\\) and \\(e^{b} = 5\\). Compute \\(e^{2a - b}\\) as a decimal number.</p>',
        hint: 'Split the exponent: \\(e^{2a-b} = \\left(e^{a}\\right)^{2} / e^{b}\\).',
        mount: function (el, ctx) {
          var root = wrap(el);
          M4.numberInput(root, {
            answer: 1.8, tolerance: 0.01, placeholder: 'value', label: 'e^(2a − b) =',
            onCorrect: function () {
              ctx.note('\\(e^{2a-b} = \\dfrac{(e^{a})^{2}}{e^{b}} = \\dfrac{3^{2}}{5} = \\dfrac{9}{5} = 1.8\\).');
              ctx.solved();
            },
            onWrong: function (v) {
              var x = Number(v), m;
              if (Math.abs(x - 1) < 0.011) {
                m = '\\(2 \\cdot 3 - 5 = 1\\) applies the operations of the exponent to the values. Sums in the exponent become products of values, and differences become quotients.';
              } else if (Math.abs(x - 1.2) < 0.011) {
                m = 'The factor 2 in the exponent is a power: \\(e^{2a} = (e^{a})^{2} = 9\\), not \\(2 \\cdot 3\\).';
              } else if (Math.abs(x - 45) < 0.011) {
                m = 'The term \\(-b\\) in the exponent means division by \\(e^{b}\\), not multiplication.';
              } else {
                m = 'Write \\(e^{2a-b}\\) as \\((e^{a})^{2}\\) divided by \\(e^{b}\\), then insert 3 and 5.';
              }
              ctx.wrong(); ctx.note(m);
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>\\(b^x\\) describes repeated multiplication by the base \\(b\\): it grows for \\(b > 1\\), decays for \\(0 < b < 1\\), is always positive and equals 1 at \\(x = 0\\).</li><li>The number \\(e \\approx 2.718\\) is the limit of \\(\\left(1 + \\tfrac{1}{n}\\right)^{n}\\) as \\(n\\) grows, and \\(e^{x}\\) is the exponential whose slope equals its height.</li><li>Sums in the exponent become products of values, \\(e^{a+b} = e^{a} e^{b}\\), with \\(e^{a-b} = e^{a}/e^{b}\\) and \\((e^{a})^{b} = e^{ab}\\). Softmax relies on this to turn scores into chances.</li></ul><p>The next session introduces the logarithm, the function that undoes the exponential.</p>'
      }
    ]
  });
})();
