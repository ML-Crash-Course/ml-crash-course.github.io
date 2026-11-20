(function () {
  'use strict';

  var C = M4.colors;
  var PRE = 'calculus-s3-';

  /* ---------- shared local helpers ---------- */

  function injectStyle() {
    if (document.getElementById(PRE + 'style')) return;
    var st = document.createElement('style');
    st.id = PRE + 'style';
    st.textContent =
      '.' + PRE + 'svg{display:block;width:100%;height:auto;max-width:720px;margin:0 auto;touch-action:manipulation}' +
      '.' + PRE + 'wrap{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%}' +
      '.' + PRE + 'slotrow{display:flex;justify-content:center;align-items:flex-end;gap:18px;flex-wrap:wrap;width:100%}' +
      '.' + PRE + 'slotcol{display:flex;flex-direction:column;align-items:center;gap:8px}' +
      '.' + PRE + 'slotlabel{font-size:16px;color:' + C.muted + ';font-weight:600}' +
      '.' + PRE + 'slot{min-width:120px;min-height:58px;display:flex;align-items:center;justify-content:center;font-size:20px;padding:4px 12px;box-sizing:border-box;cursor:pointer}' +
      '.' + PRE + 'slot.' + PRE + 'ok{border-color:' + C.green + ';background:rgba(22,181,107,0.12)}' +
      '.' + PRE + 'slot.' + PRE + 'bad{border-color:' + C.red + ';background:rgba(240,71,62,0.10)}' +
      '.' + PRE + 'fixed{min-width:120px;min-height:58px;display:flex;align-items:center;justify-content:center;font-size:20px;border:2px solid ' + C.line + ';border-radius:14px;background:' + C.bg + ';box-sizing:border-box}' +
      '.' + PRE + 'tray{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;min-height:60px;width:100%}' +
      '.' + PRE + 'tok{font-size:20px;padding:10px 18px;min-width:56px;text-align:center;touch-action:none;user-select:none}' +
      '.' + PRE + 'op{font-size:26px;font-weight:700;color:' + C.muted + ';padding-bottom:12px}' +
      '.' + PRE + 'legend{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}';
    document.head.appendChild(st);
  }

  function fmt(v, d) {
    if (d === undefined) d = 2;
    if (Math.abs(v) < 0.5 * Math.pow(10, -d)) v = 0;
    return v.toFixed(d).replace('-', '\u2212');
  }

  function svgText(parent, x, y, str, opts) {
    opts = opts || {};
    var t = M4.svg('text', {
      x: x, y: y,
      'text-anchor': opts.anchor || 'middle',
      'font-size': opts.size || 16,
      'font-weight': opts.weight || 600,
      fill: opts.fill || C.ink,
      'font-family': 'Inter, system-ui, sans-serif'
    }, parent);
    t.textContent = str;
    return t;
  }

  function readout(parent, label) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    return {
      el: r,
      set: function (value) { r.textContent = label + ' = ' + value; }
    };
  }

  function arrowLine(parent, x1, y1, x2, y2, color) {
    M4.svg('line', { x1: x1, y1: y1, x2: x2 - 9, y2: y2, stroke: color, 'stroke-width': 4, 'stroke-linecap': 'round' }, parent);
    M4.svg('path', { d: 'M' + x2 + ' ' + y2 + ' l-12 -7 l0 14 z', fill: color }, parent);
  }

  /* ---------- token / slot exercise builder ---------- */

  function buildSlots(el, ctx, cfg) {
    injectStyle();
    var wrap = M4.el('div', { class: PRE + 'wrap' }, el);
    var row = M4.el('div', { class: PRE + 'slotrow' }, wrap);
    var slotEls = [];
    var placed = [];
    var done = false;
    var timer = null;

    if (cfg.prefix) M4.el('div', { class: PRE + 'op', html: M4.tex(cfg.prefix) }, row);
    cfg.slots.forEach(function (s, i) {
      if (i > 0 && cfg.joiner) M4.el('div', { class: PRE + 'op', html: M4.tex(cfg.joiner) }, row);
      var col = M4.el('div', { class: PRE + 'slotcol' }, row);
      M4.el('div', { class: PRE + 'slotlabel', html: s.labelHtml }, col);
      var slot = M4.el('div', { class: 'm4-slot ' + PRE + 'slot' }, col);
      slot.addEventListener('click', function () { if (!done) clearSlot(i); });
      slotEls.push(slot);
      placed.push(null);
    });
    if (cfg.suffix) {
      var fc = M4.el('div', { class: PRE + 'slotcol' }, row);
      M4.el('div', { class: PRE + 'slotlabel', html: cfg.suffix.labelHtml }, fc);
      M4.el('div', { class: PRE + 'fixed', html: M4.tex(cfg.suffix.tex) }, fc);
    }

    var tray = M4.el('div', { class: PRE + 'tray' }, wrap);
    var tokenEls = cfg.tokens.map(function (t) {
      var tok = M4.el('div', { class: 'm4-token ' + PRE + 'tok', html: M4.tex(t.tex) }, tray);
      tok.setAttribute('data-value', t.value);
      tok.setAttribute('data-tex', t.tex);
      return tok;
    });
    M4.el('div', { class: 'm4-note', text: 'Drag a tile into each slot. Tap a filled slot to empty it.' }, wrap);

    function clearSlot(i) {
      var tok = placed[i];
      if (!tok) return;
      placed[i] = null;
      slotEls[i].innerHTML = '';
      slotEls[i].classList.remove('filled', PRE + 'ok', PRE + 'bad');
      tray.appendChild(tok);
      tok.style.display = '';
    }

    function check() {
      var firstWrong = -1;
      var allRight = true;
      cfg.slots.forEach(function (s, i) {
        var v = placed[i].getAttribute('data-value');
        var ok = v === s.answer;
        slotEls[i].classList.add(ok ? PRE + 'ok' : PRE + 'bad');
        if (!ok) { allRight = false; if (firstWrong < 0) firstWrong = i; }
      });
      if (allRight) {
        done = true;
        slotEls.forEach(function (s) { s.classList.add('m4-pop'); });
        ctx.note(cfg.successHtml);
        ctx.solved();
        return;
      }
      ctx.wrong(cfg.feedback(firstWrong, placed[firstWrong].getAttribute('data-value')));
      timer = setTimeout(function () {
        cfg.slots.forEach(function (s, i) {
          if (placed[i] && placed[i].getAttribute('data-value') !== s.answer) clearSlot(i);
        });
      }, 900);
    }

    M4.dragDrop({
      tokens: tokenEls,
      slots: slotEls,
      onDrop: function (tok, slot) {
        if (done) return;
        var i = slotEls.indexOf(slot);
        if (i < 0) return;
        if (timer) { clearTimeout(timer); timer = null; }
        slotEls.forEach(function (s, k) {
          if (placed[k] && s.classList.contains(PRE + 'bad')) clearSlot(k);
        });
        var from = placed.indexOf(tok);
        if (from >= 0) { placed[from] = null; slotEls[from].innerHTML = ''; slotEls[from].classList.remove('filled', PRE + 'ok', PRE + 'bad'); }
        if (placed[i]) clearSlot(i);
        tray.appendChild(tok);
        tok.style.display = 'none';
        placed[i] = tok;
        slot.innerHTML = M4.tex(tok.getAttribute('data-tex'));
        slot.classList.remove(PRE + 'ok', PRE + 'bad');
        slot.classList.add('filled');
        if (placed.every(function (p) { return !!p; })) check();
      },
      onMiss: function () {}
    });

    ctx.onCleanup(function () { if (timer) clearTimeout(timer); });
  }

  /* ---------- explore 1: nudge travelling through two machines ---------- */

  function mountNudge(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: PRE + 'wrap' }, el);
    var svg = M4.svg('svg', { viewBox: '0 0 720 250', class: PRE + 'svg' }, wrap);
    var cy = 105;
    var vx = [70, 360, 650];
    var mx = [215, 505];
    var names = ['x', 'u', 'y'];
    var valT = [], dT = [];

    arrowLine(svg, 110, cy, 143, cy, C.muted);
    arrowLine(svg, 287, cy, 318, cy, C.muted);
    arrowLine(svg, 402, cy, 433, cy, C.muted);
    arrowLine(svg, 577, cy, 608, cy, C.muted);

    vx.forEach(function (x, i) {
      M4.svg('circle', { cx: x, cy: cy, r: 40, fill: C.card, stroke: i === 2 ? C.orange : C.green, 'stroke-width': 4 }, svg);
      svgText(svg, x, 44, names[i], { size: 20, weight: 700, fill: C.muted });
      valT.push(svgText(svg, x, cy + 7, '', { size: 20, weight: 700 }));
      dT.push(svgText(svg, x, 190, '', { size: 16, fill: i === 2 ? C.orange : C.green }));
    });
    var mTitle = ['g: double', 'f: square'];
    var mRule = ['u = 2x', 'y = u\u00B2'];
    var slopeT = [];
    mx.forEach(function (x, i) {
      M4.svg('rect', { x: x - 70, y: cy - 44, width: 140, height: 88, rx: 18, fill: C.purple }, svg);
      M4.svg('rect', { x: x - 70, y: cy - 44, width: 140, height: 82, rx: 18, fill: '#8f76ff' }, svg);
      svgText(svg, x, cy - 8, mTitle[i], { size: 18, weight: 700, fill: '#ffffff' });
      svgText(svg, x, cy + 18, mRule[i], { size: 17, fill: '#ffffff' });
      slopeT.push(svgText(svg, x, 190, '', { size: 16, fill: C.purple, weight: 700 }));
    });
    svgText(svg, 360, 232, 'changes (green, orange) and the local slope of each machine (purple)', { size: 15, fill: C.muted, weight: 500 });
    var pulse = M4.svg('circle', { cx: 70, cy: cy, r: 9, fill: C.pink, opacity: 0 }, svg);

    var x0 = 1, dx = 0.2, reveal = 3, raf = 0;

    var rrow = M4.el('div', { class: 'm4-row' }, wrap);
    var rProd = readout(rrow, 'product of local slopes');
    var rMeas = readout(rrow, 'measured \u0394y / \u0394x');

    function render() {
      var u = 2 * x0, y = u * u;
      var du = 2 * dx, dy = (u + du) * (u + du) - y;
      valT[0].textContent = fmt(x0, 1);
      valT[1].textContent = fmt(u, 1);
      valT[2].textContent = fmt(y, 2);
      dT[0].textContent = reveal >= 1 ? '\u0394x = ' + fmt(dx, 2) : '';
      dT[1].textContent = reveal >= 2 ? '\u0394u = ' + fmt(du, 2) : '';
      dT[2].textContent = reveal >= 3 ? '\u0394y = ' + fmt(dy, 3) : '';
      slopeT[0].textContent = 'slope 2';
      slopeT[1].textContent = 'slope 2u = ' + fmt(2 * u, 1);
      rProd.set('2 \u00D7 ' + fmt(2 * u, 1) + ' = ' + fmt(4 * u, 2));
      rMeas.set(reveal >= 3 ? fmt(dy / dx, 2) : '\u2026');
    }

    M4.slider(wrap, { min: -2, max: 2, step: 0.1, value: x0, label: 'input x', format: function (v) { return fmt(+v, 1); },
      onInput: function (v) { x0 = +v; reveal = 3; render(); } });
    M4.slider(wrap, { min: 0.01, max: 0.5, step: 0.01, value: dx, label: 'nudge \u0394x', format: function (v) { return fmt(+v, 2); },
      onInput: function (v) { dx = +v; reveal = 3; render(); } });
    wrap.appendChild(rrow);
    var brow = M4.el('div', { class: 'm4-row' }, wrap);
    M4.button(brow, 'Send the nudge through', function () {
      cancelAnimationFrame(raf);
      var t0 = null;
      reveal = 1; render();
      pulse.setAttribute('opacity', 1);
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / 1800);
        var px = 70 + 580 * k;
        pulse.setAttribute('cx', px);
        pulse.setAttribute('r', 9 + 5 * Math.sin(k * Math.PI));
        var r = px >= 648 ? 3 : (px >= 360 ? 2 : 1);
        if (r !== reveal) { reveal = r; render(); }
        if (k < 1) raf = requestAnimationFrame(frame);
        else pulse.setAttribute('opacity', 0);
      }
      raf = requestAnimationFrame(frame);
    }, { primary: true });

    render();
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
  }

  /* ---------- explore 2 / exercise: tangent of a composite ---------- */

  function gIn(x) { return 0.5 * x * x - 1; }
  function hComp(x) { var u = gIn(x); return u * u; }
  function hSlope(x) { return 2 * gIn(x) * x; }

  function mountTangent(el, ctx, exercise) {
    injectStyle();
    var wrap = M4.el('div', { class: PRE + 'wrap' }, el);
    var holder = M4.el('div', { style: 'width:100%;max-width:520px' }, wrap);
    var p = M4.plane(holder, { xmin: -3, xmax: 3, ymin: -1, ymax: 5, width: 520, height: 520 });
    p.fn(hComp, { stroke: C.green, width: 4 });
    p.text(0, 4.55, 'y = (x\u00B2/2 \u2212 1)\u00B2', { fill: C.green, size: 17, weight: 700 });
    var tan = p.line(0, 0, 1, 1, { stroke: C.orange, width: 4 });
    var ring = p.point(0, 0, { r: 20, fill: C.green });
    ring.el.setAttribute('opacity', 0);

    var r1 = M4.el('div', { class: 'm4-row' }, wrap);
    var rx = readout(r1, 'x');
    var ru = readout(r1, 'u');
    var r2 = M4.el('div', { class: 'm4-row' }, wrap);
    var rin = readout(r2, 'inner slope x');
    var rout = readout(r2, 'outer slope 2u');
    var rpr = readout(r2, 'product');
    rin.el.style.borderColor = C.purple;
    rout.el.style.borderColor = C.purple;
    rpr.el.style.borderColor = C.orange;

    var done = false;
    var cur = exercise ? 2.2 : 2;

    function show(x) {
      cur = x;
      var y = hComp(x), m = hSlope(x);
      var n = 1.2 / Math.sqrt(1 + m * m);
      tan.set(x - n, y - n * m, x + n, y + n * m);
      rx.set(fmt(x, 2));
      ru.set(fmt(gIn(x), 2));
      rin.set(fmt(x, 2));
      rout.set(fmt(2 * gIn(x), 2));
      rpr.set(fmt(m, 2));
    }

    var h = p.handle(cur, hComp(cur), {
      color: C.green, r: 13,
      onDrag: function (x) {
        if (done) { h.set(cur, hComp(cur)); return; }
        x = Math.max(-2.4, Math.min(2.4, x));
        h.set(x, hComp(x));
        show(x);
      },
      onEnd: function () {
        if (!exercise || done) return;
        var x = cur, outer = 2 * gIn(x);
        if (Math.abs(outer) < 0.45 && Math.abs(x) > 0.5) {
          done = true;
          var xs = (x > 0 ? 1 : -1) * Math.SQRT2;
          h.set(xs, 0);
          show(xs);
          ring.set(xs, 0);
          ring.el.setAttribute('opacity', 0.25);
          ctx.note('At \\(x=' + (xs > 0 ? '' : '-') + '\\sqrt{2}\\) the inner output is \\(u=0\\), so the outer slope \\(2u\\) is zero and the product is zero, although the inner slope is not.');
          ctx.solved();
        } else if (Math.abs(x) < 0.2) {
          ctx.wrong('The tangent is flat here, but because the inner slope \\(x\\) is zero. The outer slope is ' + fmt(outer, 2) + '.');
        } else {
          ctx.note('The outer slope is ' + fmt(outer, 2) + '. It vanishes where \\(u = \\tfrac{1}{2}x^2 - 1\\) equals zero.');
        }
      }
    });
    show(cur);
  }

  /* ---------- computation graph ---------- */

  var GX = [80, 267, 453, 640];
  var GNAMES = ['w', 'p', 'e', 'L'];

  function graphValues(w) {
    var pv = 2 * w, e = pv - 3, L = e * e;
    return {
      val: [w, pv, e, L],
      grad: [4 * e, 2 * e, 2 * e, 1],      // dL/dw, dL/dp, dL/de, dL/dL
      local: [2, 1, 2 * e]                 // dp/dw, de/dp, dL/de
    };
  }

  // fwd: number of node values visible (0..4, left to right)
  // bwd: number of gradients visible (0..4, right to left)
  function drawGraph(parent, opts) {
    opts = opts || {};
    var svg = M4.svg('svg', { viewBox: '0 0 720 ' + (opts.short ? 190 : 290), class: PRE + 'svg' }, parent);
    var cy = 100;
    var ops = ['\u00D7 2', '\u2212 3', 'square'];
    var valT = [], gradL = [], gradT = [], locT = [], circ = [];
    for (var i = 0; i < 3; i++) {
      arrowLine(svg, GX[i] + 42, cy, GX[i + 1] - 44, cy, C.muted);
      var mxp = (GX[i] + GX[i + 1]) / 2;
      svgText(svg, mxp, cy - 16, ops[i], { size: 17, weight: 700, fill: C.ink });
      locT.push(svgText(svg, mxp, 262, '', { size: 16, weight: 700, fill: C.purple }));
    }
    GX.forEach(function (x, k) {
      circ.push(M4.svg('circle', { cx: x, cy: cy, r: 40, fill: C.card, stroke: C.green, 'stroke-width': 4 }, svg));
      svgText(svg, x, 40, GNAMES[k], { size: 20, weight: 700, fill: C.muted });
      valT.push(svgText(svg, x, cy + 7, '', { size: 20, weight: 700 }));
      gradL.push(svgText(svg, x, 178, '', { size: 15, fill: C.orange, weight: 600 }));
      gradT.push(svgText(svg, x, 204, '', { size: 20, fill: C.orange, weight: 700 }));
    });
    return {
      svg: svg,
      update: function (w, fwd, bwd) {
        var g = graphValues(w);
        for (var k = 0; k < 4; k++) {
          valT[k].textContent = k < fwd ? fmt(g.val[k], k === 3 ? 2 : 1) : '?';
          valT[k].setAttribute('fill', k < fwd ? C.ink : C.line);
          circ[k].setAttribute('stroke', k < fwd ? C.green : C.line);
          var vis = (3 - k) < bwd;
          gradL[k].textContent = vis ? 'dL/d' + GNAMES[k] : '';
          gradT[k].textContent = vis ? fmt(g.grad[k], 1) : '';
        }
        for (var j = 0; j < 3; j++) {
          var lv = (3 - j) < bwd;
          locT[j].textContent = lv ? 'local slope ' + fmt(g.local[j], 1) : '';
        }
      }
    };
  }

  function mountGraphExplore(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: PRE + 'wrap' }, el);
    var G = drawGraph(wrap);
    var w = 1, fwd = 0, bwd = 0, timers = [];
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function render() { G.update(w, fwd, bwd); }

    M4.slider(wrap, { min: -1, max: 4, step: 0.1, value: w, label: 'weight w', format: function (v) { return fmt(+v, 1); },
      onInput: function (v) { w = +v; render(); } });
    var brow = M4.el('div', { class: 'm4-row' }, wrap);
    M4.button(brow, 'Forward pass', function () {
      clearTimers(); fwd = 0; bwd = 0; render();
      ctx.note('Forward: each value is computed from the one on its left.');
      for (var k = 1; k <= 4; k++) {
        (function (k) { timers.push(setTimeout(function () { fwd = k; render(); }, 450 * k)); })(k);
      }
    }, { primary: true });
    M4.button(brow, 'Backward pass', function () {
      if (fwd < 4) { ctx.note('Run the forward pass first: the local slope \\(2e\\) needs the value of \\(e\\).'); return; }
      clearTimers(); bwd = 0; render();
      ctx.note('Backward: each slope is the slope on its right multiplied by the local slope of the edge between them.');
      for (var k = 1; k <= 4; k++) {
        (function (k) { timers.push(setTimeout(function () { bwd = k; render(); }, 600 * k)); })(k);
      }
    });
    var leg = M4.el('div', { class: PRE + 'legend' }, wrap);
    M4.el('span', { class: 'm4-chip', text: 'black: values', style: 'color:' + C.ink }, leg);
    M4.el('span', { class: 'm4-chip', text: 'purple: local slopes', style: 'color:' + C.purple }, leg);
    M4.el('span', { class: 'm4-chip', text: 'orange: slopes of L', style: 'color:' + C.orange }, leg);
    render();
    ctx.onCleanup(clearTimers);
  }

  function mountGraphSlide(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: PRE + 'wrap' }, el);
    var G = drawGraph(wrap);
    var w = 3, done = false, timer = null;
    var rrow = M4.el('div', { class: 'm4-row' }, wrap);
    var rL = readout(rrow, 'loss L');
    var rG = readout(rrow, 'dL/dw');
    rG.el.style.borderColor = C.orange;

    function render() {
      G.update(w, 4, 4);
      var g = graphValues(w);
      rL.set(fmt(g.val[3], 2));
      rG.set(fmt(g.grad[0], 1));
    }
    function evaluate() {
      if (done) return;
      var gr = graphValues(w).grad[0];
      if (Math.abs(w - 1.5) < 0.03) {
        done = true;
        rG.el.classList.add('m4-pop');
        rG.el.style.background = 'rgba(22,181,107,0.15)';
        rG.el.style.borderColor = C.green;
        ctx.note('At \\(w = 1.5\\) the prediction \\(p = 3\\) equals the target, the error is \\(0\\), and every slope in the backward pass is \\(0\\).');
        ctx.solved();
      } else if (gr > 0) {
        ctx.note('The slope \\(\\mathrm{d}L/\\mathrm{d}w\\) is positive (' + fmt(gr, 1) + '): increasing \\(w\\) raises the loss, so move \\(w\\) down.');
      } else {
        ctx.note('The slope \\(\\mathrm{d}L/\\mathrm{d}w\\) is negative (' + fmt(gr, 1) + '): increasing \\(w\\) lowers the loss, so move \\(w\\) up.');
      }
    }
    M4.slider(wrap, { min: -1, max: 4, step: 0.1, value: w, label: 'weight w', format: function (v) { return fmt(+v, 1); },
      onInput: function (v) {
        if (done) return;
        w = +v; render();
        if (timer) clearTimeout(timer);
        timer = setTimeout(evaluate, 450);
      } });
    wrap.appendChild(rrow);
    render();
    ctx.onCleanup(function () { if (timer) clearTimeout(timer); });
  }

  /* ---------- lesson ---------- */

  M4.lesson({
    id: 'calculus-s3',
    module: 'calculus',
    title: 'The chain rule',
    summary: 'When functions are composed, their local slopes multiply. A computation graph applies this fact one edge at a time.',
    minutes: 10,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html:
          '<p>Many functions are built by feeding the output of one function into another. The derivative of such a composition follows from the derivatives of its parts.</p>' +
          '<p>In this lesson you will state the chain rule, apply it to a composite function, and carry out a forward pass and a backward pass on a small computation graph.</p>'
      },
      {
        kind: 'text',
        title: 'Composition of functions',
        html:
          '<p>Think of a function as a machine that turns an input into an output. Let \\(g\\) be a machine that takes \\(x\\) and produces \\(u = g(x)\\), and let \\(f\\) be a machine that takes \\(u\\) and produces \\(y = f(u)\\).</p>' +
          '<p>Connecting them gives the <em>composition</em> \\(h(x) = f(g(x))\\): \\(g\\) is the inner function, \\(f\\) is the outer function, and \\(u\\) is the intermediate value passed between them. For example, \\(g(x) = 2x\\) and \\(f(u) = u^2\\) give \\(h(x) = (2x)^2\\).</p>'
      },
      {
        kind: 'explore',
        title: 'A small change through a composition',
        html:
          '<p>Change the input by a small amount \\(\\Delta x\\). The first machine turns it into a change \\(\\Delta u\\), scaled by its local slope \\(2\\). The second turns \\(\\Delta u\\) into \\(\\Delta y\\), scaled by its local slope \\(2u\\).</p>' +
          '<p>Compare the measured ratio \\(\\Delta y / \\Delta x\\) with the product of the two local slopes, and observe what happens as the nudge is made smaller.</p>',
        mount: mountNudge
      },
      {
        kind: 'text',
        title: 'The chain rule',
        html:
          '<p>In the limit of an infinitely small nudge the two numbers agree exactly. For \\(y = f(u)\\) with \\(u = g(x)\\), the <em>chain rule</em> states</p>' +
          '\\[ \\frac{\\mathrm{d}y}{\\mathrm{d}x} = \\frac{\\mathrm{d}y}{\\mathrm{d}u} \\cdot \\frac{\\mathrm{d}u}{\\mathrm{d}x}, \\qquad\\text{equivalently}\\qquad h\'(x) = f\'(g(x))\\, g\'(x). \\]' +
          '<p>The outer slope \\(f\'\\) is evaluated at the intermediate value \\(u = g(x)\\), not at \\(x\\). In the example above, \\(h\'(x) = 2u \\cdot 2 = 8x\\).</p>'
      },
      {
        kind: 'exercise',
        title: 'Chain rule practice',
        html:
          '<p>Let \\(h(x) = (3x+1)^2\\), composed of the inner function \\(u = g(x) = 3x + 1\\) and the outer function \\(f(u) = u^2\\). Build \\(h\'(x)\\) by placing the outer slope, written in terms of \\(x\\), and the inner slope into the two slots.</p>',
        hint: 'The outer slope is \\(f\'(u) = 2u\\) with \\(u\\) replaced by \\(3x+1\\). The inner slope is the derivative of \\(3x+1\\).',
        mount: function (el, ctx) {
          buildSlots(el, ctx, {
            prefix: "h'(x) =",
            joiner: '\\cdot',
            slots: [
              { labelHtml: 'outer slope \\(f\'(g(x))\\)', answer: 'outer' },
              { labelHtml: 'inner slope \\(g\'(x)\\)', answer: 'three' }
            ],
            tokens: [
              { tex: '2x', value: 'twox' },
              { tex: '3', value: 'three' },
              { tex: '3x+1', value: 'inner' },
              { tex: '2(3x+1)', value: 'outer' },
              { tex: '6x', value: 'sixx' }
            ],
            successHtml: 'Correct: \\(h\'(x) = 2(3x+1)\\cdot 3 = 18x + 6\\).',
            feedback: function (i, v) {
              if (i === 0) {
                if (v === 'twox') return 'The outer slope \\(2u\\) must be evaluated at \\(u = 3x+1\\), not at \\(x\\).';
                if (v === 'inner') return '\\(3x+1\\) is the intermediate value \\(u\\) itself. The outer slope is \\(2u\\).';
                if (v === 'three') return 'The first slot holds the outer slope. The derivative of \\(u^2\\) is \\(2u\\).';
                return 'The outer slope is the derivative of \\(u^2\\), evaluated at \\(u = 3x+1\\).';
              }
              if (v === 'inner') return 'The second slot holds the slope of the inner function, not the inner function itself.';
              return 'The inner slope is the derivative of \\(3x+1\\) with respect to \\(x\\), which is a constant.';
            }
          });
          M4.typeset(el);
        }
      },
      {
        kind: 'explore',
        title: 'Chain rule and tangent slope',
        html:
          '<p>The green curve is \\(h(x) = \\left(\\tfrac{1}{2}x^2 - 1\\right)^2\\), with inner function \\(u = \\tfrac{1}{2}x^2 - 1\\) (slope \\(x\\)) and outer function \\(u^2\\) (slope \\(2u\\)).</p>' +
          '<p>Drag the point along the curve. The orange tangent line is drawn with slope equal to the product of the two local slopes, and it touches the curve everywhere.</p>',
        mount: function (el, ctx) { mountTangent(el, ctx, false); }
      },
      {
        kind: 'exercise',
        title: 'Zero factors',
        html:
          '<p>A product is zero when either factor is zero. On the same curve, drag the point to a position where the <em>outer</em> slope \\(2u\\) is zero while the inner slope \\(x\\) is not, then release it.</p>',
        hint: 'The outer slope is zero where \\(u = \\tfrac{1}{2}x^2 - 1 = 0\\), that is at \\(x = \\pm\\sqrt{2} \\approx \\pm 1.41\\), where the curve touches the horizontal axis.',
        mount: function (el, ctx) { mountTangent(el, ctx, true); }
      },
      {
        kind: 'explore',
        title: 'A computation graph',
        html:
          '<p>In machine learning, a model with a weight \\(w\\) makes a prediction \\(p = 2w\\) for an input equal to \\(2\\), the error is \\(e = p - 3\\) for a target of \\(3\\), and the loss is \\(L = e^2\\). Written as a chain of nodes this is a <em>computation graph</em>.</p>' +
          '<p>The forward pass computes the values from left to right. The backward pass starts from \\(\\mathrm{d}L/\\mathrm{d}L = 1\\) and moves right to left, multiplying by one local slope per edge. This procedure is called <em>backpropagation</em> and is how neural networks obtain the slopes used for training.</p>',
        mount: mountGraphExplore
      },
      {
        kind: 'exercise',
        title: 'A backward pass by hand',
        html:
          '<p>The forward pass for \\(w = 1\\) has been done: \\(p = 2\\), \\(e = -1\\), \\(L = 1\\). The local slopes of the three edges are \\(\\mathrm{d}p/\\mathrm{d}w = 2\\), \\(\\mathrm{d}e/\\mathrm{d}p = 1\\) and \\(\\mathrm{d}L/\\mathrm{d}e = 2e\\).</p>' +
          '<p>Working from right to left, place the slope of \\(L\\) with respect to each node.</p>',
        hint: 'Start at the right: \\(\\mathrm{d}L/\\mathrm{d}e = 2e = -2\\). Each step to the left multiplies by the local slope of the edge crossed: first by \\(1\\), then by \\(2\\).',
        mount: function (el, ctx) {
          injectStyle();
          var G = drawGraph(el, { short: true });
          G.update(1, 4, 0);
          G.svg.style.marginBottom = '12px';
          buildSlots(el, ctx, {
            slots: [
              { labelHtml: '\\(\\mathrm{d}L/\\mathrm{d}w\\)', answer: '-4' },
              { labelHtml: '\\(\\mathrm{d}L/\\mathrm{d}p\\)', answer: '-2' },
              { labelHtml: '\\(\\mathrm{d}L/\\mathrm{d}e\\)', answer: '-2' }
            ],
            suffix: { labelHtml: '\\(\\mathrm{d}L/\\mathrm{d}L\\)', tex: '1' },
            tokens: [
              { tex: '2', value: '2' },
              { tex: '-2', value: '-2' },
              { tex: '-1', value: '-1' },
              { tex: '-4', value: '-4' },
              { tex: '4', value: '4' },
              { tex: '-2', value: '-2' },
              { tex: '1', value: '1' }
            ],
            successHtml: 'Correct: \\(\\mathrm{d}L/\\mathrm{d}w = 1 \\cdot (-2) \\cdot 1 \\cdot 2 = -4\\).',
            feedback: function (i, v) {
              if (i === 2) {
                if (v === '-1') return '\\(-1\\) is the value of \\(e\\). The slope of \\(L = e^2\\) with respect to \\(e\\) is \\(2e\\).';
                if (v === '2') return 'Check the sign: \\(2e\\) with \\(e = -1\\).';
                return '\\(\\mathrm{d}L/\\mathrm{d}e\\) is the local slope \\(2e\\) evaluated at \\(e = -1\\).';
              }
              if (i === 1) return '\\(\\mathrm{d}L/\\mathrm{d}p\\) equals \\(\\mathrm{d}L/\\mathrm{d}e\\) multiplied by the local slope \\(\\mathrm{d}e/\\mathrm{d}p = 1\\).';
              if (v === '4') return 'Check the sign: \\(\\mathrm{d}L/\\mathrm{d}p\\) is negative and the local slope \\(2\\) is positive.';
              return '\\(\\mathrm{d}L/\\mathrm{d}w\\) equals \\(\\mathrm{d}L/\\mathrm{d}p\\) multiplied by the local slope \\(\\mathrm{d}p/\\mathrm{d}w = 2\\).';
            }
          });
          M4.typeset(el);
        }
      },
      {
        kind: 'exercise',
        title: 'Descent on a composite function',
        html:
          '<p>The graph now shows both passes for the current weight. The sign of \\(\\mathrm{d}L/\\mathrm{d}w\\) indicates in which direction \\(w\\) should move to reduce the loss.</p>' +
          '<p>Slide \\(w\\) until the backward pass returns \\(\\mathrm{d}L/\\mathrm{d}w = 0\\), and hold it there.</p>',
        hint: 'By the chain rule \\(\\mathrm{d}L/\\mathrm{d}w = 2e \\cdot 1 \\cdot 2 = 4(2w - 3)\\), which is zero when \\(2w = 3\\).',
        mount: mountGraphSlide
      },
      {
        kind: 'exercise',
        title: 'A composite with a cube',
        html:
          '<p>Let \\(h(x) = (x^2 + 1)^3\\), with inner function \\(u = x^2 + 1\\) and outer function \\(u^3\\). Compute \\(h\'(1)\\): run the forward pass to find \\(u\\) at \\(x = 1\\), then multiply the outer slope at that \\(u\\) by the inner slope at \\(x = 1\\).</p>',
        hint: 'At \\(x = 1\\) the intermediate value is \\(u = 2\\). The outer slope is \\(3u^2\\) and the inner slope is \\(2x\\).',
        mount: function (el, ctx) {
          var wrap = M4.el('div', { class: 'm4-col', style: 'align-items:center' }, el);
          M4.numberInput(wrap, {
            answer: 24,
            tolerance: 0.01,
            placeholder: 'value',
            label: "h'(1) =",
            onCorrect: function () {
              ctx.note('Correct: \\(u = 2\\), outer slope \\(3u^2 = 12\\), inner slope \\(2x = 2\\), product \\(24\\).');
              ctx.solved();
            },
            onWrong: function (v) {
              v = +v;
              if (Math.abs(v - 12) < 0.01) ctx.wrong('\\(12\\) is the outer slope \\(3u^2\\) alone. Multiply it by the inner slope \\(2x\\).');
              else if (Math.abs(v - 6) < 0.01) ctx.wrong('The outer slope \\(3u^2\\) must be evaluated at \\(u = 2\\), not at \\(x = 1\\).');
              else if (Math.abs(v - 3) < 0.01) ctx.wrong('The outer slope \\(3u^2\\) is evaluated at \\(u = x^2 + 1 = 2\\), and is then multiplied by the inner slope.');
              else if (Math.abs(v - 8) < 0.01) ctx.wrong('\\(8\\) is the value \\(h(1)\\). The question asks for the slope \\(h\'(1)\\).');
              else if (Math.abs(v - 2) < 0.01) ctx.wrong('\\(2\\) is the inner slope alone. Multiply it by the outer slope \\(3u^2\\) at \\(u = 2\\).');
              else ctx.wrong('Compute \\(u\\) at \\(x = 1\\) first, then the two local slopes, then their product.');
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>A composition \\(h(x) = f(g(x))\\) is a chain of machines: the inner function produces an intermediate value \\(u\\), which the outer function consumes.</li>' +
          '<li>The chain rule states that local slopes multiply: \\(h\'(x) = f\'(g(x))\\,g\'(x)\\), with the outer slope evaluated at \\(u = g(x)\\).</li>' +
          '<li>On a computation graph, the forward pass computes values from input to output and the backward pass multiplies local slopes from output to input. This is backpropagation.</li>' +
          '</ul>'
      }
    ]
  });
})();
