(function () {
  'use strict';

  var C = M4.colors;
  var STYLE_ID = 'vectors-s4-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '.vectors-s4-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;}' +
      '.vectors-s4-plane{width:100%;max-width:560px;margin:0 auto;}' +
      '.vectors-s4-plane.wide{max-width:680px;}' +
      '.vectors-s4-controls{width:100%;max-width:520px;display:flex;flex-direction:column;gap:8px;}' +
      '.vectors-s4-bins{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%;}' +
      '.vectors-s4-bin{min-height:170px;display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px 10px;border-radius:18px;}' +
      '.vectors-s4-bin-title{font-weight:700;font-size:17px;color:' + C.ink + ';pointer-events:none;}' +
      '.vectors-s4-tray{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;min-height:60px;width:100%;}' +
      '.vectors-s4-token{padding:10px 14px;font-size:17px;touch-action:none;}' +
      '.vectors-s4-token.placed{border-color:' + C.green + ';background:#eefaf3;cursor:default;pointer-events:none;}' +
      '.vectors-s4-ring{transition:fill-opacity .35s, r .35s;}' +
      '@media(max-width:520px){.vectors-s4-bins{grid-template-columns:1fr;}}';
    document.head.appendChild(s);
  }

  function fmt(n) {
    var r = Math.round(n * 100) / 100;
    if (Object.is(r, -0)) r = 0;
    return String(r);
  }
  function vecTex(x, y) {
    return '\\begin{pmatrix}' + fmt(x) + '\\\\' + fmt(y) + '\\end{pmatrix}';
  }
  function pairTex(x, y) {
    return '(' + fmt(x) + ',\\,' + fmt(y) + ')';
  }
  function setArrow(a, x1, y1, x2, y2) {
    var d = Math.hypot(x2 - x1, y2 - y1);
    if (d < 1e-6) { a.el.style.display = 'none'; return; }
    a.el.style.display = '';
    a.set(x1, y1, x2, y2);
  }
  function labelPos(x, y, off) {
    var d = Math.hypot(x, y);
    if (d < 1e-6) return [0.5, 0.5];
    return [x + (x / d) * off, y + (y / d) * off];
  }
  function wrap(el) {
    injectStyle();
    el.innerHTML = '';
    return M4.el('div', { class: 'vectors-s4-wrap' }, el);
  }
  function planeBox(parent, wide) {
    return M4.el('div', { class: 'vectors-s4-plane' + (wide ? ' wide' : '') }, parent);
  }
  function readout(parent) {
    return M4.el('div', { class: 'm4-readout' }, parent);
  }

  /* ---------- step 3: explore a v + b w ---------- */
  function mountCombine(el, ctx) {
    var root = wrap(el);
    var v = [2, 1], w = [-1, 2];
    var a = 1, b = 1;
    var p = M4.plane(planeBox(root), { xmin: -7, xmax: 7, ymin: -7, ymax: 7, width: 560, height: 560 });

    p.arrow(0, 0, v[0], v[1], { stroke: '#b9ccff', width: 3 });
    p.arrow(0, 0, w[0], w[1], { stroke: '#ffd3a8', width: 3 });
    var side1 = p.line(0, 0, 1, 1, { stroke: C.muted, width: 2, dash: '5 5' });
    var side2 = p.line(0, 0, 1, 1, { stroke: C.muted, width: 2, dash: '5 5' });
    var trace = p.path([[0, 0], [0, 0]], { stroke: C.green, width: 2 });
    trace.el.style.opacity = '0.35';
    var av = p.arrow(0, 0, 1, 1, { stroke: C.blue, width: 5 });
    var bw = p.arrow(0, 0, 1, 1, { stroke: C.orange, width: 5 });
    var sum = p.arrow(0, 0, 1, 1, { stroke: C.green, width: 5 });
    var lav = p.text(0, 0, 'a·v', { fill: C.blue, size: 17, weight: 700 });
    var lbw = p.text(0, 0, 'b·w', { fill: C.orange, size: 17, weight: 700 });
    var tip = p.point(0, 0, { r: 7, fill: C.green });

    var row = M4.el('div', { class: 'm4-row' }, root);
    var r1 = readout(row), r2 = readout(row), r3 = readout(row);
    var controls = M4.el('div', { class: 'vectors-s4-controls' }, root);
    var tracePts = [];

    function update() {
      var ax = a * v[0], ay = a * v[1], bx = b * w[0], by = b * w[1];
      var sx = ax + bx, sy = ay + by;
      setArrow(av, 0, 0, ax, ay);
      setArrow(bw, ax, ay, sx, sy);
      setArrow(sum, 0, 0, sx, sy);
      side1.set(0, 0, bx, by);
      side2.set(bx, by, sx, sy);
      tip.set(sx, sy);
      lav.set(ax / 2 + 0.45 * (v[1] / Math.hypot(v[0], v[1])), ay / 2 - 0.45 * (v[0] / Math.hypot(v[0], v[1])) - 0.15, 'a·v');
      lbw.set(ax + bx / 2 + 0.6, ay + by / 2 + 0.25, 'b·w');
      r1.innerHTML = M4.tex('a\\mathbf{v}=' + pairTex(ax, ay));
      r2.innerHTML = M4.tex('b\\mathbf{w}=' + pairTex(bx, by));
      r3.innerHTML = M4.tex('a\\mathbf{v}+b\\mathbf{w}=' + pairTex(sx, sy));
    }

    var sa = M4.slider(controls, { min: -2, max: 2, step: 0.25, value: a, label: 'a', format: fmt, onInput: function (x) { a = +x; update(); } });
    var sb = M4.slider(controls, { min: -2, max: 2, step: 0.25, value: b, label: 'b', format: fmt, onInput: function (x) { b = +x; update(); } });

    var raf = 0, playing = false, t0 = 0;
    function stop() {
      var was = playing;
      playing = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      btn.textContent = 'Play a sweep';
      if (was) {
        var ea = Math.round(a * 4) / 4, eb = Math.round(b * 4) / 4;
        sa.set(ea); sb.set(eb);
        a = ea; b = eb;
        update();
      }
    }
    function frame(ts) {
      if (!playing) return;
      if (!t0) t0 = ts;
      var t = (ts - t0) / 1000;
      var ang = t * 1.1;
      var fa = 1.6 * Math.cos(ang);
      var fb = 1.6 * Math.sin(2 * ang) * 0.9;
      sa.set(Math.round(fa * 4) / 4);
      sb.set(Math.round(fb * 4) / 4);
      a = fa; b = fb;
      update();
      tracePts.push([a * v[0] + b * w[0], a * v[1] + b * w[1]]);
      if (tracePts.length > 400) tracePts.shift();
      if (tracePts.length > 1) trace.set(tracePts);
      if (t > 2 * Math.PI / 1.1 + 0.05) { stop(); return; }
      raf = requestAnimationFrame(frame);
    }
    var btnRow = M4.el('div', { class: 'm4-row' }, root);
    var btn = M4.button(btnRow, 'Play a sweep', function () {
      if (playing) { stop(); return; }
      playing = true; t0 = 0; tracePts = [];
      btn.textContent = 'Stop';
      raf = requestAnimationFrame(frame);
    });
    M4.el('div', { class: 'm4-note', text: 'Blue: a·v from the origin. Orange: b·w attached to its tip. Green: the sum.' }, root);
    ctx.onCleanup(stop);
    update();
  }

  /* ---------- step 4: compute a combination ---------- */
  function mountCompute(el, ctx) {
    var root = wrap(el);
    M4.choices(root, {
      options: [
        '\\( (4,\\,1) \\)',
        '\\( (11,\\,1) \\)',
        '\\( (8,\\,3) \\)',
        '\\( (11,\\,7) \\)'
      ],
      correct: 1,
      onCorrect: function () {
        ctx.note('\\( 2(1,2)+3(3,-1)=(2,4)+(9,-3)=(11,1) \\).');
        ctx.solved();
      },
      onWrong: function (i) {
        var msg = [
          'That is \\( \\mathbf{v}+\\mathbf{w} \\). The scalars 2 and 3 have not been applied.',
          '',
          'Scale first: \\( 2\\mathbf{v}=(2,4) \\) and \\( 3\\mathbf{w}=(9,-3) \\), then add component by component.',
          'The second component of \\( 3\\mathbf{w} \\) is \\( -3 \\), not \\( +3 \\).'
        ][i];
        ctx.wrong(msg);
      }
    });
  }

  /* ---------- step 5: reach the target with sliders ---------- */
  function mountReach(el, ctx) {
    var root = wrap(el);
    var v = [2, 1], w = [-1, 1], T = [1, 5];
    var a = 1, b = 1, done = false;
    var p = M4.plane(planeBox(root, true), { xmin: -9, xmax: 9, ymin: -7, ymax: 7, width: 648, height: 504 });

    var ring = M4.svg('circle', {
      class: 'vectors-s4-ring', cx: p.x(T[0]), cy: p.y(T[1]), r: 15, fill: C.green, 'fill-opacity': 0.08,
      stroke: C.green, 'stroke-width': 3, 'stroke-dasharray': '6 4'
    }, p.g);
    p.text(T[0] + 1.9, T[1] + 0.55, 'target (1, 5)', { fill: C.green, size: 16, weight: 700 });
    var av = p.arrow(0, 0, 1, 1, { stroke: C.blue, width: 5 });
    var bw = p.arrow(0, 0, 1, 1, { stroke: C.orange, width: 5 });
    var tip = p.point(0, 0, { r: 8, fill: C.ink });

    var row = M4.el('div', { class: 'm4-row' }, root);
    var r1 = readout(row), r2 = readout(row);
    var controls = M4.el('div', { class: 'vectors-s4-controls' }, root);

    function update() {
      var ax = a * v[0], ay = a * v[1];
      var sx = ax + b * w[0], sy = ay + b * w[1];
      setArrow(av, 0, 0, ax, ay);
      setArrow(bw, ax, ay, sx, sy);
      tip.set(sx, sy);
      var d = Math.hypot(sx - T[0], sy - T[1]);
      r1.innerHTML = M4.tex('a\\mathbf{v}+b\\mathbf{w}=' + pairTex(sx, sy));
      r2.innerHTML = M4.tex('\\text{distance to target}=' + d.toFixed(2));
      if (d < 1e-6) {
        if (!done) {
          done = true;
          ring.setAttribute('fill-opacity', 0.45);
          ring.setAttribute('stroke-dasharray', 'none');
          ring.setAttribute('r', 20);
          ctx.note('\\( 2\\mathbf{v}+3\\mathbf{w}=(4,2)+(-3,3)=(1,5) \\).');
          ctx.solved();
        }
      } else if (!done) {
        if (Math.abs(sx - T[0]) < 1e-6) ctx.note('The first component \\( 2a-b \\) is correct. Raising \\(a\\) by \\(0.5\\) and \\(b\\) by \\(1\\) keeps it fixed and changes the second.');
        else if (Math.abs(sy - T[1]) < 1e-6) ctx.note('The second component is correct. The first is off by \\(' + fmt(T[0] - sx) + '\\).');
        else ctx.note('Still off by \\(' + pairTex(T[0] - sx, T[1] - sy) + '\\).');
      }
    }
    M4.slider(controls, { min: -3, max: 3, step: 0.5, value: a, label: 'a', format: fmt, onInput: function (x) { a = +x; update(); } });
    M4.slider(controls, { min: -3, max: 3, step: 0.5, value: b, label: 'b', format: fmt, onInput: function (x) { b = +x; update(); } });
    update();
  }

  /* ---------- steps 7 and 8: span cloud ---------- */
  function buildSpan(root, opts) {
    var v = opts.v.slice(), w = opts.w.slice();
    var p = M4.plane(planeBox(root), { xmin: -6, xmax: 6, ymin: -6, ymax: 6, width: 560, height: 560 });
    var dots = [];
    var i, j;
    for (i = -3; i <= 3; i += 0.5) {
      for (j = -3; j <= 3; j += 0.5) {
        var whole = (i === Math.round(i) && j === Math.round(j));
        dots.push({ a: i, b: j, el: M4.svg('circle', { r: whole ? 4.5 : 3, fill: C.blue, 'fill-opacity': whole ? 0.55 : 0.28 }, p.g) });
      }
    }
    var spanLine = p.line(0, 0, 1, 1, { stroke: C.pink, width: 5 });
    spanLine.el.style.opacity = '0.55';
    var av = p.arrow(0, 0, 1, 1, { stroke: C.blue, width: 5 });
    var aw = p.arrow(0, 0, 1, 1, { stroke: C.orange, width: 5 });
    var lv = p.text(0, 0, 'v', { fill: C.blue, size: 19, weight: 700 });
    var lw = p.text(0, 0, 'w', { fill: C.orange, size: 19, weight: 700 });

    var row = M4.el('div', { class: 'm4-row' }, root);
    var rv = readout(row), rw = readout(row), rd = readout(row), rs = readout(row);

    function det() { return v[0] * w[1] - v[1] * w[0]; }
    function update() {
      for (var k = 0; k < dots.length; k++) {
        var d = dots[k];
        d.el.setAttribute('cx', p.x(d.a * v[0] + d.b * w[0]));
        d.el.setAttribute('cy', p.y(d.a * v[1] + d.b * w[1]));
      }
      setArrow(av, 0, 0, v[0], v[1]);
      setArrow(aw, 0, 0, w[0], w[1]);
      var pv = labelPos(v[0], v[1], 0.75), pw = labelPos(w[0], w[1], 0.75);
      lv.set(pv[0], pv[1] - 0.15, 'v');
      lw.set(pw[0], pw[1] - 0.15, 'w');
      var D = det();
      var flat = Math.abs(D) < 1e-9;
      var dir = (Math.hypot(v[0], v[1]) > 1e-9) ? v : w;
      var len = Math.hypot(dir[0], dir[1]);
      if (flat && len > 1e-9) {
        spanLine.el.style.display = '';
        var m = 6 / Math.max(Math.abs(dir[0]), Math.abs(dir[1]));
        spanLine.set(-dir[0] * m, -dir[1] * m, dir[0] * m, dir[1] * m);
      } else {
        spanLine.el.style.display = 'none';
      }
      rv.innerHTML = M4.tex('\\mathbf{v}=' + pairTex(v[0], v[1]));
      rw.innerHTML = M4.tex('\\mathbf{w}=' + pairTex(w[0], w[1]));
      rd.innerHTML = M4.tex('v_1w_2-v_2w_1=' + fmt(D));
      rs.textContent = !flat ? 'span: the whole plane' : (len > 1e-9 ? 'span: a line' : 'span: the origin only');
      rs.style.color = flat ? C.pink : C.green;
      rs.style.fontWeight = '700';
    }
    var api = { p: p, v: v, w: w, det: det, update: update };
    if (opts.dragV) {
      p.handle(v[0], v[1], { color: C.blue, snap: opts.snap, onDrag: function (x, y) { v[0] = x; v[1] = y; update(); }, onEnd: function (x, y) { v[0] = x; v[1] = y; update(); } });
    }
    p.handle(w[0], w[1], {
      color: C.orange, snap: opts.snap,
      onDrag: function (x, y) { w[0] = x; w[1] = y; update(); if (opts.onDrag) opts.onDrag(api); },
      onEnd: function (x, y) { w[0] = x; w[1] = y; update(); if (opts.onEnd) opts.onEnd(api); }
    });
    update();
    return api;
  }

  function mountSpanExplore(el) {
    var root = wrap(el);
    buildSpan(root, { v: [2, 1], w: [-1, 2], snap: 0.5, dragV: true });
    M4.el('div', { class: 'm4-note', text: 'Each dot is a·v + b·w for a and b between −3 and 3 in steps of one half. Drag either arrow tip.' }, root);
  }

  function mountCollapse(el, ctx) {
    var root = wrap(el);
    var done = false;
    buildSpan(root, {
      v: [2, 1], w: [-1, 3], snap: 1, dragV: false,
      onDrag: function () { if (!done) ctx.note(''); },
      onEnd: function (s) {
        if (done) return;
        var D = s.det();
        if (Math.abs(s.w[0]) < 1e-9 && Math.abs(s.w[1]) < 1e-9) {
          ctx.wrong('The zero vector does collapse the span, but the task asks for a non-zero \\( \\mathbf{w} \\).');
        } else if (Math.abs(D) < 1e-9) {
          done = true;
          var k = s.w[0] / s.v[0];
          ctx.note('\\( \\mathbf{w}=' + fmt(k) + '\\,\\mathbf{v} \\), so every combination lies on the line through \\( \\mathbf{v} \\).');
          ctx.solved();
        } else {
          ctx.wrong('Here \\( v_1w_2-v_2w_1=' + fmt(D) + '\\neq 0 \\), so \\( \\mathbf{w} \\) is not a multiple of \\( \\mathbf{v}=(2,1) \\).');
        }
      }
    });
    M4.el('div', { class: 'm4-note', text: 'v is fixed. Drag the orange tip of w. It snaps to whole numbers.' }, root);
  }

  /* ---------- step 9: sort pairs into bins ---------- */
  function mountSort(el, ctx) {
    var root = wrap(el);
    var items = [
      { v: [1, 0], w: [0, 1], bin: 'plane', why: '' },
      { v: [1, 2], w: [2, 4], bin: 'line', why: '' },
      { v: [1, 1], w: [1, -1], bin: 'plane', why: '' },
      { v: [3, -1], w: [-6, 2], bin: 'line', why: '' }
    ];
    var tray = M4.el('div', { class: 'vectors-s4-tray' }, root);
    var bins = M4.el('div', { class: 'vectors-s4-bins' }, root);
    var slotPlane = M4.el('div', { class: 'm4-slot vectors-s4-bin' }, bins);
    M4.el('div', { class: 'vectors-s4-bin-title', text: 'Spans the plane' }, slotPlane);
    var slotLine = M4.el('div', { class: 'm4-slot vectors-s4-bin' }, bins);
    M4.el('div', { class: 'vectors-s4-bin-title', text: 'Spans only a line' }, slotLine);
    slotPlane.dataset.bin = 'plane';
    slotLine.dataset.bin = 'line';

    var placed = 0;
    var tokens = items.map(function (it, idx) {
      var t = M4.el('div', {
        class: 'm4-token vectors-s4-token',
        html: M4.tex(vecTex(it.v[0], it.v[1]) + ',\\;' + vecTex(it.w[0], it.w[1]))
      }, tray);
      t.dataset.idx = String(idx);
      return t;
    });

    M4.dragDrop({
      tokens: tokens,
      slots: [slotPlane, slotLine],
      onDrop: function (tok, slot) {
        if (tok.classList.contains('placed')) return;
        var it = items[+tok.dataset.idx];
        var D = it.v[0] * it.w[1] - it.v[1] * it.w[0];
        if (slot.dataset.bin === it.bin) {
          tok.classList.add('placed');
          tok.style.transform = '';
          tok.style.left = '';
          tok.style.top = '';
          tok.style.position = '';
          slot.appendChild(tok);
          slot.classList.add('filled');
          placed++;
          if (it.bin === 'line') {
            ctx.note('Correct: \\(' + pairTex(it.w[0], it.w[1]) + '=' + fmt(it.w[0] / it.v[0]) + '\\cdot' + pairTex(it.v[0], it.v[1]) + '\\).');
          } else {
            ctx.note('Correct: \\( v_1w_2-v_2w_1=' + fmt(D) + '\\neq 0 \\).');
          }
          if (placed === items.length) ctx.solved();
        } else if (it.bin === 'line') {
          ctx.wrong('\\(' + pairTex(it.w[0], it.w[1]) + '\\) equals \\(' + fmt(it.w[0] / it.v[0]) + '\\) times \\(' + pairTex(it.v[0], it.v[1]) + '\\), so the two vectors lie on one line.');
        } else {
          ctx.wrong('For this pair \\( v_1w_2-v_2w_1=' + fmt(D) + '\\), which is not zero, so neither vector is a multiple of the other.');
        }
      },
      onMiss: function () {}
    });
  }

  /* ---------- step 10: ML question ---------- */
  function mountLayer(el, ctx) {
    var root = wrap(el);
    M4.choices(root, {
      options: [
        '\\( (3,\\,6) \\)',
        '\\( (0,\\,0) \\)',
        '\\( (2,\\,1) \\)',
        '\\( (-1,\\,-2) \\)'
      ],
      correct: 2,
      onCorrect: function () {
        ctx.note('Both columns lie on the line \\( y=2x \\), so every output does too. \\( (2,1) \\) is not on that line.');
        ctx.solved();
      },
      onWrong: function (i) {
        var msg = [
          'Reachable: \\( x_1=1,\\ x_2=1 \\) gives \\( (1,2)+(2,4)=(3,6) \\).',
          'Reachable: \\( x_1=x_2=0 \\) gives the zero vector.',
          '',
          'Reachable: \\( x_1=-1,\\ x_2=0 \\) gives \\( (-1,-2) \\).'
        ][i];
        ctx.wrong(msg);
      }
    });
  }

  /* ---------- step 11: walk to the target ---------- */
  function mountWalk(el, ctx) {
    var root = wrap(el);
    var v = [1, 2], w = [3, 1], T = [-5, 0], LIM = 7;
    var moves = [], arrows = [], done = false;
    var p = M4.plane(planeBox(root), { xmin: -7, xmax: 7, ymin: -7, ymax: 7, width: 560, height: 560 });
    var ring = M4.svg('circle', {
      class: 'vectors-s4-ring', cx: p.x(T[0]), cy: p.y(T[1]), r: 15, fill: C.green, 'fill-opacity': 0.08,
      stroke: C.green, 'stroke-width': 3, 'stroke-dasharray': '6 4'
    }, p.g);
    p.text(T[0], T[1] - 1.05, 'target (−5, 0)', { fill: C.green, size: 16, weight: 700 });
    p.arrow(0, 0, v[0], v[1], { stroke: '#b9ccff', width: 3 });
    p.arrow(0, 0, w[0], w[1], { stroke: '#ffd3a8', width: 3 });
    p.text(v[0] - 0.45, v[1] + 0.35, 'v', { fill: C.blue, size: 18, weight: 700 });
    p.text(w[0] + 0.45, w[1] + 0.2, 'w', { fill: C.orange, size: 18, weight: 700 });
    var pathLayer = M4.svg('g', {}, p.g);
    var tip = p.point(0, 0, { r: 8, fill: C.ink });

    var row = M4.el('div', { class: 'm4-row' }, root);
    var ra = readout(row), rb = readout(row), rp = readout(row);

    function state() {
      var a = 0, b = 0;
      moves.forEach(function (m) { if (m[0] === 'v') a += m[1]; else b += m[1]; });
      return { a: a, b: b, x: a * v[0] + b * w[0], y: a * v[1] + b * w[1] };
    }
    function redraw() {
      arrows.forEach(function (ar) { if (ar.el && ar.el.parentNode) ar.el.parentNode.removeChild(ar.el); });
      arrows = [];
      var x = 0, y = 0;
      moves.forEach(function (m) {
        var d = m[0] === 'v' ? v : w;
        var nx = x + m[1] * d[0], ny = y + m[1] * d[1];
        var ar = p.arrow(x, y, nx, ny, { stroke: m[0] === 'v' ? C.blue : C.orange, width: 5 });
        if (ar.el) pathLayer.appendChild(ar.el);
        arrows.push(ar);
        x = nx; y = ny;
      });
      var s = state();
      tip.set(s.x, s.y);
      if (tip.el && tip.el.parentNode) tip.el.parentNode.appendChild(tip.el);
      ra.innerHTML = M4.tex('a=' + s.a);
      rb.innerHTML = M4.tex('b=' + s.b);
      rp.innerHTML = M4.tex('a\\mathbf{v}+b\\mathbf{w}=' + pairTex(s.x, s.y));
      if (s.x === T[0] && s.y === T[1]) {
        if (!done) {
          done = true;
          ring.setAttribute('fill-opacity', 0.45);
          ring.setAttribute('stroke-dasharray', 'none');
          ring.setAttribute('r', 20);
          ctx.note('\\( 1\\cdot(1,2)+(-2)\\cdot(3,1)=(1,2)+(-6,-2)=(-5,0) \\), so \\( a=1 \\) and \\( b=-2 \\).');
          ctx.solved();
        }
      } else if (!done && moves.length) {
        ctx.note('Remaining displacement to the target: \\(' + pairTex(T[0] - s.x, T[1] - s.y) + '\\).');
      } else if (!done) {
        ctx.note('');
      }
    }
    function step(which, sign) {
      if (done) return;
      var s = state(), d = which === 'v' ? v : w;
      var nx = s.x + sign * d[0], ny = s.y + sign * d[1];
      if (Math.abs(nx) > LIM || Math.abs(ny) > LIM) {
        ctx.wrong('That step would leave the visible part of the plane.');
        return;
      }
      var last = moves[moves.length - 1];
      if (last && last[0] === which && last[1] === -sign) moves.pop();
      else moves.push([which, sign]);
      redraw();
    }
    var btns = M4.el('div', { class: 'm4-row' }, root);
    M4.button(btns, '+ v', function () { step('v', 1); }, { primary: true });
    M4.button(btns, '− v', function () { step('v', -1); });
    M4.button(btns, '+ w', function () { step('w', 1); }, { primary: true });
    M4.button(btns, '− w', function () { step('w', -1); });
    M4.button(btns, 'Reset', function () { if (done) return; moves = []; redraw(); });
    redraw();
  }

  M4.lesson({
    id: 'vectors-s4',
    module: 'vectors',
    title: 'Linear combinations and span',
    summary: 'Scaling and adding two vectors, reaching target points, and deciding whether two vectors span the plane or only a line.',
    minutes: 10,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>Two operations on vectors were introduced earlier: multiplying a vector by a number and adding two vectors. Combining them gives a linear combination.</p><p>In this lesson you will compute a linear combination \\( a\\mathbf{v}+b\\mathbf{w} \\), find the numbers \\(a\\) and \\(b\\) that reach a given target point, and decide whether two vectors can reach every point of the plane or only the points of a single line.</p>'
      },
      {
        kind: 'text',
        title: 'Linear combinations',
        html: '<p>Let \\( \\mathbf{v}=(v_1,v_2) \\) and \\( \\mathbf{w}=(w_1,w_2) \\) be two vectors in the plane and let \\(a\\) and \\(b\\) be real numbers, called <em>coefficients</em> or <em>scalars</em>. The vector</p>\\[ a\\mathbf{v}+b\\mathbf{w}=(a v_1+b w_1,\\; a v_2+b w_2) \\]<p>is called a <em>linear combination</em> of \\( \\mathbf{v} \\) and \\( \\mathbf{w} \\). Geometrically, \\( \\mathbf{v} \\) is stretched by the factor \\(a\\), \\( \\mathbf{w} \\) is stretched by the factor \\(b\\), and the two results are placed tip to tail. A negative coefficient reverses the direction of the arrow.</p>'
      },
      {
        kind: 'explore',
        title: 'Scaling and adding',
        html: '<p>Here \\( \\mathbf{v}=(2,1) \\) and \\( \\mathbf{w}=(-1,2) \\). The sliders set the coefficients \\(a\\) and \\(b\\). The blue arrow is \\( a\\mathbf{v} \\), the orange arrow is \\( b\\mathbf{w} \\) attached to its tip, and the green arrow is the linear combination \\( a\\mathbf{v}+b\\mathbf{w} \\). The dashed lines complete the parallelogram, which shows that the order of the two steps does not matter.</p>',
        mount: mountCombine
      },
      {
        kind: 'exercise',
        title: 'Computing a combination',
        html: '<p>Let \\( \\mathbf{v}=(1,2) \\) and \\( \\mathbf{w}=(3,-1) \\). Which vector equals \\( 2\\mathbf{v}+3\\mathbf{w} \\)?</p>',
        hint: 'Compute \\( 2\\mathbf{v} \\) and \\( 3\\mathbf{w} \\) separately, then add the first components and the second components.',
        mount: mountCompute
      },
      {
        kind: 'exercise',
        title: 'Reaching a target',
        html: '<p>Let \\( \\mathbf{v}=(2,1) \\) and \\( \\mathbf{w}=(-1,1) \\). Set the coefficients \\(a\\) and \\(b\\) so that the black point \\( a\\mathbf{v}+b\\mathbf{w} \\) lands on the target \\( (1,5) \\). The value below shows the remaining distance.</p>',
        hint: 'The components give two equations: \\( 2a-b=1 \\) and \\( a+b=5 \\). Adding them eliminates \\(b\\).',
        mount: mountReach
      },
      {
        kind: 'text',
        title: 'Span',
        html: '<p>The <em>span</em> of \\( \\mathbf{v} \\) and \\( \\mathbf{w} \\) is the set of all their linear combinations, \\( \\{a\\mathbf{v}+b\\mathbf{w} : a,b\\in\\mathbb{R}\\} \\). It is the set of points that can be reached using these two vectors. If neither vector is a multiple of the other, the span is the whole plane. If one is a multiple of the other, both point along the same line through the origin and no combination can leave that line.</p><p>A numerical test: \\( \\mathbf{v} \\) and \\( \\mathbf{w} \\) lie on one line exactly when \\( v_1w_2-v_2w_1=0 \\).</p>'
      },
      {
        kind: 'explore',
        title: 'The span in a picture',
        html: '<p>Each dot is one linear combination \\( a\\mathbf{v}+b\\mathbf{w} \\) on a regular grid of coefficients. Drag the tips of \\( \\mathbf{v} \\) and \\( \\mathbf{w} \\). While the arrows point in different directions the dots form a grid that would cover the plane if it were extended. When the arrows become parallel the grid collapses onto a single line, and the quantity \\( v_1w_2-v_2w_1 \\) becomes zero.</p>',
        mount: mountSpanExplore
      },
      {
        kind: 'exercise',
        title: 'A collapsed span',
        html: '<p>The vector \\( \\mathbf{v}=(2,1) \\) is fixed. Drag \\( \\mathbf{w} \\) to a non-zero position for which the span of \\( \\mathbf{v} \\) and \\( \\mathbf{w} \\) is only a line, then release.</p>',
        hint: 'Choose \\( \\mathbf{w} \\) as a multiple of \\( \\mathbf{v} \\), for example \\( 2\\mathbf{v}=(4,2) \\) or \\( -\\mathbf{v}=(-2,-1) \\).',
        mount: mountCollapse
      },
      {
        kind: 'exercise',
        title: 'Plane or line',
        html: '<p>Each tile shows a pair of vectors \\( \\mathbf{v},\\mathbf{w} \\). Drag every tile into the box that describes the span of its pair.</p>',
        hint: 'For each pair, check whether the second vector is a multiple of the first, or compute \\( v_1w_2-v_2w_1 \\) and see whether it is zero.',
        mount: mountSort
      },
      {
        kind: 'exercise',
        title: 'Span in machine learning',
        html: '<p>A linear layer of a neural network multiplies an input \\( \\mathbf{x}=(x_1,x_2) \\) by a weight matrix \\(W\\). The result is a linear combination of the columns of \\(W\\), with the inputs as coefficients: \\( W\\mathbf{x}=x_1\\mathbf{w}_1+x_2\\mathbf{w}_2 \\). The set of outputs the layer can produce is therefore the span of its columns.</p><p>Suppose the columns are \\( \\mathbf{w}_1=(1,2) \\) and \\( \\mathbf{w}_2=(2,4) \\). Which output can this layer <em>not</em> produce, whatever the input?</p>',
        hint: 'Since \\( \\mathbf{w}_2=2\\mathbf{w}_1 \\), every output is a multiple of \\( (1,2) \\). Look for the option that is not.',
        mount: mountLayer
      },
      {
        kind: 'exercise',
        title: 'Finding the coefficients',
        html: '<p>Let \\( \\mathbf{v}=(1,2) \\) and \\( \\mathbf{w}=(3,1) \\). Starting at the origin, each button adds or subtracts one copy of a vector. Reach the target \\( (-5,0) \\). The counters show the resulting integer coefficients \\(a\\) and \\(b\\).</p>',
        hint: 'Solve \\( a+3b=-5 \\) and \\( 2a+b=0 \\). The second equation gives \\( b=-2a \\). Substitute it into the first.',
        mount: mountWalk
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>A linear combination \\( a\\mathbf{v}+b\\mathbf{w} \\) scales each vector by its coefficient and adds the results component by component.</li><li>Reaching a target point means solving two equations, one per component, for the two coefficients \\(a\\) and \\(b\\).</li><li>The span is the set of all linear combinations: the whole plane when \\( v_1w_2-v_2w_1\\neq 0 \\), and only a line through the origin when two non-zero vectors are multiples of each other. A linear layer can only produce outputs in the span of its weight columns.</li></ul>'
      }
    ]
  });
})();
