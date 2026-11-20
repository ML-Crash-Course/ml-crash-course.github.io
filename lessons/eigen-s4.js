(function () {
  'use strict';

  var C = M4.colors || { blue: '#2f6bff', green: '#16b56b', orange: '#ff8a1f', purple: '#7a5cff', pink: '#ef4b8b', yellow: '#ffc533', red: '#f0473e', ink: '#1d1d1f', muted: '#6b6f76', line: '#e6e4dd', bg: '#faf9f5', card: '#ffffff' };
  var PINK = C.pink, PURPLE = C.purple, ORANGE = C.orange, GREEN = C.green, INK = C.ink, MUTED = C.muted;

  // ---------- local helpers ----------
  function injectStyle() {
    if (document.getElementById('eigen-s4-style')) return;
    var s = document.createElement('style');
    s.id = 'eigen-s4-style';
    s.textContent =
      '.eigen-s4-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;margin-top:8px}' +
      '.eigen-s4-eq{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-size:22px;font-weight:600}' +
      '.eigen-s4-mat{display:flex;align-items:center;gap:8px;padding:10px 12px;border-left:3px solid ' + INK + ';border-right:3px solid ' + INK + ';border-radius:10px}' +
      '.eigen-s4-dgrid{display:grid;grid-template-columns:auto auto;gap:8px;align-items:center;justify-items:center}' +
      '.eigen-s4-zero{font-size:22px;color:' + MUTED + ';width:64px;text-align:center}' +
      '.eigen-s4-vslot{min-width:64px;min-height:84px;display:flex;align-items:center;justify-content:center}' +
      '.eigen-s4-nslot{min-width:64px;min-height:56px;display:flex;align-items:center;justify-content:center}' +
      '.eigen-s4-tok{min-width:60px;min-height:56px;display:flex;align-items:center;justify-content:center;padding:6px 12px;font-size:20px;touch-action:none;user-select:none}' +
      '.eigen-s4-ok{border-color:' + GREEN + ' !important;background:rgba(22,181,107,.10) !important}' +
      '.eigen-s4-label{font-size:15px;color:' + MUTED + ';text-align:center}' +
      '.eigen-s4-plane{width:100%;max-width:520px;margin:0 auto}';
    document.head.appendChild(s);
  }

  function fmt(v, d) {
    var s = (Math.abs(v) < 0.5 * Math.pow(10, -(d == null ? 2 : d)) ? 0 : v).toFixed(d == null ? 2 : d);
    return s.replace('-', '−');
  }
  // 'a v₁ + b v₂' with a proper sign for the second term (avoids '+ −0.50')
  function lin(a, b, d) {
    var neg = b < -0.5 * Math.pow(10, -(d == null ? 2 : d));
    return fmt(a, d) + ' v₁ ' + (neg ? '− ' : '+ ') + fmt(Math.abs(b), d) + ' v₂';
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function setArrow(a, x1, y1, x2, y2) {
    var len = Math.hypot(x2 - x1, y2 - y1);
    if (a.el && a.el.style) a.el.style.display = len < 0.06 ? 'none' : '';
    if (len >= 0.06) a.set(x1, y1, x2, y2);
  }
  function attr(o, k, v) { if (o && o.el && o.el.setAttribute) o.el.setAttribute(k, v); }
  function readout(parent, text) {
    return M4.el('span', { class: 'm4-readout', text: text || '' }, parent);
  }
  function wrap(el) {
    injectStyle();
    el.textContent = '';
    return M4.el('div', { class: 'eigen-s4-wrap' }, el);
  }
  function planeBox(parent, opts) {
    var box = M4.el('div', { class: 'eigen-s4-plane' }, parent);
    return M4.plane(box, opts);
  }
  // eigen-coordinates with respect to v1 = (1,1), v2 = (1,-1)
  function c1of(x, y) { return (x + y) / 2; }
  function c2of(x, y) { return (x - y) / 2; }
  // angle in degrees between (x,y) and the line spanned by (1,1)
  function angleToV1(x, y) {
    var a = Math.abs(c1of(x, y)), b = Math.abs(c2of(x, y));
    if (a < 1e-12 && b < 1e-12) return 0;
    return Math.atan2(b, a) * 180 / Math.PI;
  }
  function eigenLines(p, R) {
    var l1 = p.line(-R, -R, R, R, { stroke: PINK, width: 2, dash: '6 6' });
    var l2 = p.line(-R, R, R, -R, { stroke: PURPLE, width: 2, dash: '6 6' });
    attr(l1, 'opacity', '0.55'); attr(l2, 'opacity', '0.55');
  }

  // matrix used for single applications: A = [[2,1],[1,2]], eigenvalues 3 (v1) and 1 (v2)
  // matrix used for repeated maps: B = [[0.8,0.3],[0.3,0.8]], eigenvalues 1.1 (v1) and 0.5 (v2)
  function applyB(v) { return [0.8 * v[0] + 0.3 * v[1], 0.3 * v[0] + 0.8 * v[1]]; }

  // ---------- step 3: explore, decomposition ----------
  function mountDecompose(el, ctx) {
    var w = wrap(el);
    var p = planeBox(w, { xmin: -6, xmax: 6, ymin: -6, ymax: 6 });
    eigenLines(p, 6);
    p.text(5.1, 5.6, 'v₁', { fill: PINK, size: 17, weight: 700 });
    p.text(5.6, -5.0, 'v₂', { fill: PURPLE, size: 17, weight: 700 });
    var a1 = p.arrow(0, 0, 1, 1, { stroke: PINK, width: 3 });
    var a2 = p.arrow(0, 0, 1, 1, { stroke: PURPLE, width: 3 });
    var b1 = p.arrow(0, 0, 1, 1, { stroke: PINK, width: 3 });
    var b2 = p.arrow(0, 0, 1, 1, { stroke: PURPLE, width: 3 });
    attr(b1, 'opacity', '0.45'); attr(b2, 'opacity', '0.45');
    var ax = p.arrow(0, 0, 1, 1, { stroke: ORANGE, width: 5 });
    var xx = p.arrow(0, 0, 1, 1, { stroke: INK, width: 5 });
    var lx = p.text(0, 0, 'x', { fill: INK, size: 17, weight: 700 });
    var lax = p.text(0, 0, 'Ax', { fill: ORANGE, size: 17, weight: 700 });
    var row = M4.el('div', { class: 'm4-row' }, w);
    var r1 = readout(row), r2 = readout(row), r3 = readout(row);
    M4.el('div', { class: 'm4-note', text: 'Drag the dark point. Pink and purple arrows are the components of x along the two eigenvectors. The faint ones are the components of Ax.' }, w);
    function draw(x, y) {
      var c1 = c1of(x, y), c2 = c2of(x, y);
      setArrow(a1, 0, 0, c1, c1);
      setArrow(a2, c1, c1, c1 + c2, c1 - c2);
      setArrow(b1, 0, 0, 3 * c1, 3 * c1);
      setArrow(b2, 3 * c1, 3 * c1, 3 * c1 + c2, 3 * c1 - c2);
      var Ax = 2 * x + y, Ay = x + 2 * y;
      setArrow(xx, 0, 0, x, y);
      setArrow(ax, 0, 0, Ax, Ay);
      lx.set(x + 0.45, y - 0.55, 'x');
      lax.set(clamp(Ax, -5.3, 5.3) - 0.6, clamp(Ay, -5.4, 5.4) + 0.5, 'Ax');
      r1.textContent = 'x = ' + lin(c1, c2);
      r2.textContent = 'Ax = ' + lin(3 * c1, c2);
      r3.textContent = 'Ax = (' + fmt(Ax, 1) + ', ' + fmt(Ay, 1) + ')';
    }
    var h = p.handle(1.5, 0.5, {
      color: INK, snap: 0,
      onDrag: function (x, y) {
        var cx = clamp(x, -2, 2), cy = clamp(y, -2, 2);
        if (cx !== x || cy !== y) h.set(cx, cy);
        draw(cx, cy);
      }
    });
    draw(1.5, 0.5);
  }

  // ---------- step 4: exercise, tokens into P and D ----------
  function mountBuild(el, ctx) {
    var w = wrap(el);
    var done = false;
    var eq = M4.el('div', { class: 'eigen-s4-eq' }, w);
    M4.el('span', { html: M4.tex('A=\\begin{pmatrix}2&1\\\\1&2\\end{pmatrix}=') }, eq);
    var colP = M4.el('div', { class: 'm4-col', style: 'align-items:center;gap:6px' }, eq);
    var matP = M4.el('div', { class: 'eigen-s4-mat' }, colP);
    var sP1 = M4.el('div', { class: 'm4-slot eigen-s4-vslot' }, matP);
    var sP2 = M4.el('div', { class: 'm4-slot eigen-s4-vslot' }, matP);
    M4.el('div', { class: 'eigen-s4-label', text: 'P (columns)' }, colP);
    var colD = M4.el('div', { class: 'm4-col', style: 'align-items:center;gap:6px' }, eq);
    var matD = M4.el('div', { class: 'eigen-s4-mat' }, colD);
    var dg = M4.el('div', { class: 'eigen-s4-dgrid' }, matD);
    var sD1 = M4.el('div', { class: 'm4-slot eigen-s4-nslot' }, dg);
    M4.el('div', { class: 'eigen-s4-zero', text: '0' }, dg);
    M4.el('div', { class: 'eigen-s4-zero', text: '0' }, dg);
    var sD2 = M4.el('div', { class: 'm4-slot eigen-s4-nslot' }, dg);
    M4.el('div', { class: 'eigen-s4-label', text: 'D (diagonal)' }, colD);
    M4.el('span', { html: M4.tex('P^{-1}') }, eq);

    var defs = [
      { type: 'v', key: 'a', tex: '\\begin{pmatrix}1\\\\1\\end{pmatrix}' },
      { type: 'n', key: '2', tex: '2' },
      { type: 'v', key: 'e', tex: '\\begin{pmatrix}1\\\\0\\end{pmatrix}' },
      { type: 'n', key: '1', tex: '1' },
      { type: 'v', key: 'b', tex: '\\begin{pmatrix}1\\\\-1\\end{pmatrix}' },
      { type: 'n', key: '3', tex: '3' }
    ];
    var tray = M4.el('div', { class: 'm4-row' }, w);
    var tokens = [], tokDef = new Map();
    defs.forEach(function (d) {
      var t = M4.el('div', { class: 'm4-token eigen-s4-tok', html: M4.tex(d.tex) }, tray);
      tokens.push(t); tokDef.set(t, d);
    });
    var slots = [sP1, sP2, sD1, sD2];
    var slotType = new Map([[sP1, 'v'], [sP2, 'v'], [sD1, 'n'], [sD2, 'n']]);
    var val = new Map();
    M4.el('div', { class: 'm4-note', text: 'Drag tiles into the four dashed slots. A tile can be used again or replaced.' }, w);

    function check() {
      if (slots.some(function (s) { return !val.has(s); })) return;
      var p1 = val.get(sP1), p2 = val.get(sP2), d1 = val.get(sD1), d2 = val.get(sD2);
      if (p1 === 'e' || p2 === 'e') { ctx.wrong('\\(A\\begin{pmatrix}1\\\\0\\end{pmatrix}=\\begin{pmatrix}2\\\\1\\end{pmatrix}\\) is not a multiple of \\(\\begin{pmatrix}1\\\\0\\end{pmatrix}\\), so this vector is not an eigenvector.'); return; }
      if (p1 === p2) { ctx.wrong('The two columns of \\(P\\) must be independent. With a repeated column \\(P\\) has no inverse.'); return; }
      if (d1 === '2' || d2 === '2') { ctx.wrong('\\(\\det(A-2I)=-1\\neq 0\\), so 2 is not an eigenvalue of \\(A\\).'); return; }
      var want = { a: '3', b: '1' };
      if (d1 !== want[p1] || d2 !== want[p2]) { ctx.wrong('The \\(k\\)-th diagonal entry of \\(D\\) must be the eigenvalue belonging to the \\(k\\)-th column of \\(P\\).'); return; }
      done = true;
      slots.forEach(function (s) { s.classList.add('eigen-s4-ok', 'm4-pop'); });
      ctx.note('Correct: each column of \\(P\\) is an eigenvector and \\(D\\) lists the matching eigenvalues in the same order.');
      ctx.solved();
    }
    M4.dragDrop({
      tokens: tokens, slots: slots,
      onDrop: function (tok, slot) {
        if (done) return;
        var d = tokDef.get(tok);
        if (!d || !slotType.has(slot)) return;
        if (d.type !== slotType.get(slot)) {
          ctx.wrong(slotType.get(slot) === 'v' ? 'A column of \\(P\\) is a vector, not a number.' : 'A diagonal entry of \\(D\\) is a number, not a vector.');
          return;
        }
        slot.innerHTML = M4.tex(d.tex);
        slot.classList.add('filled');
        val.set(slot, d.key);
        ctx.note('');
        check();
      },
      onMiss: function () {}
    });
  }

  // ---------- step 5: exercise, drag handle to Ax ----------
  function mountPlaceAx(el, ctx) {
    var w = wrap(el);
    var done = false;
    var p = planeBox(w, { xmin: -6, xmax: 6, ymin: -6, ymax: 6 });
    eigenLines(p, 6);
    p.text(5.1, 5.6, 'v₁', { fill: PINK, size: 17, weight: 700 });
    p.text(5.6, -5.0, 'v₂', { fill: PURPLE, size: 17, weight: 700 });
    // x = 1*v1 + 2*v2 = (3,-1)
    p.arrow(0, 0, 1, 1, { stroke: PINK, width: 3 });
    p.arrow(1, 1, 3, -1, { stroke: PURPLE, width: 3 });
    p.arrow(0, 0, 3, -1, { stroke: INK, width: 5 });
    p.text(3.2, -1.6, 'x', { fill: INK, size: 17, weight: 700 });
    var g1 = p.arrow(0, 0, 3, 3, { stroke: PINK, width: 3 });
    var g2 = p.arrow(3, 3, 5, 1, { stroke: PURPLE, width: 3 });
    g1.el.style.display = 'none'; g2.el.style.display = 'none';
    var arr = p.arrow(0, 0, -2, 3, { stroke: ORANGE, width: 5 });
    var row = M4.el('div', { class: 'm4-row' }, w);
    var r1 = readout(row), r2 = readout(row);
    function show(x, y) {
      setArrow(arr, 0, 0, x, y);
      r1.textContent = 'handle = (' + fmt(x, 0) + ', ' + fmt(y, 0) + ')';
      r2.textContent = 'handle = ' + lin(c1of(x, y), c2of(x, y), 1);
    }
    var h = p.handle(-2, 3, {
      color: ORANGE, snap: 1,
      onDrag: function (x, y) { if (!done) show(Math.round(x), Math.round(y)); },
      onEnd: function (x, y) {
        if (done) return;
        x = Math.round(x); y = Math.round(y);
        show(x, y);
        if (x === 5 && y === 1) {
          done = true;
          g1.el.style.display = ''; g2.el.style.display = '';
          if (h.el && h.el.classList) h.el.classList.add('m4-pop');
          ctx.note('\\(Ax = 3\\cdot 1\\,v_1 + 1\\cdot 2\\,v_2 = (5,1)\\).');
          ctx.solved();
        } else if (x === 3 && y === -1) {
          ctx.wrong('This is \\(x\\) itself. The component along \\(v_1\\) must be multiplied by 3.');
        } else {
          ctx.wrong('The handle has eigen-coordinates \\((' + c1of(x, y).toFixed(1) + ',\\ ' + c2of(x, y).toFixed(1) + ')\\). The target has \\((3\\cdot 1,\\ 1\\cdot 2)\\).');
        }
      }
    });
    show(-2, 3);
  }

  // ---------- step 7: exercise, number ----------
  function mountPower(el, ctx) {
    var w = wrap(el);
    M4.el('div', { class: 'eigen-s4-eq', html: M4.tex('A^3x = 3^3\\,v_1 + 1^3\\,v_2,\\qquad v_1=\\begin{pmatrix}1\\\\1\\end{pmatrix},\\ v_2=\\begin{pmatrix}1\\\\-1\\end{pmatrix}') }, w);
    M4.numberInput(w, {
      answer: 28, tolerance: 0.01, placeholder: 'first component', label: 'First component of A³x',
      onCorrect: function () {
        ctx.note('\\(A^3x = 27\\,(1,1) + (1,-1) = (28,\\,26)\\).');
        ctx.solved();
      },
      onWrong: function (v) {
        if (Math.abs(v - 26) < 0.01) ctx.wrong('26 is the second component. The first component is \\(27\\cdot 1 + 1\\cdot 1\\).');
        else if (Math.abs(v - 10) < 0.01) ctx.wrong('The eigenvalue is raised to the third power, \\(3^3 = 27\\), not multiplied by 3.');
        else if (Math.abs(v - 27) < 0.01) ctx.wrong('The component along \\(v_2\\) is still present, since \\(1^3 = 1\\).');
        else ctx.wrong('Compute \\(27\\,v_1 + v_2\\) and read off its first component.');
      }
    });
  }

  // ---------- step 8: explore, repeated application ----------
  function mountIterate(el, ctx) {
    var w = wrap(el);
    var p = planeBox(w, { xmin: -5, xmax: 5, ymin: -5, ymax: 5 });
    eigenLines(p, 5);
    p.text(4.1, 4.6, 'λ = 1.1', { fill: PINK, size: 16, weight: 700 });
    p.text(3.9, -4.6, 'λ = 0.5', { fill: PURPLE, size: 16, weight: 700 });
    var trail = p.path([[0, 0]], { stroke: ORANGE, width: 2 });
    attr(trail, 'opacity', '0.6');
    var dots = [];
    var cur = p.arrow(0, 0, 1, 1, { stroke: ORANGE, width: 5 });
    var x0 = [2, -2.5], pts, k, raf = 0, animating = false;
    var row = M4.el('div', { class: 'm4-row' }, w);
    var rk = readout(row), ra = readout(row), rl = readout(row);
    var brow = M4.el('div', { class: 'm4-row' }, w);
    function info(v) {
      rk.textContent = 'k = ' + k;
      ra.textContent = 'angle to v₁ line = ' + fmt(angleToV1(v[0], v[1]), 1) + '°';
      rl.textContent = 'length = ' + fmt(Math.hypot(v[0], v[1]));
    }
    function reset() {
      cancelAnimationFrame(raf); animating = false;
      dots.forEach(function (d) { if (d.el && d.el.remove) d.el.remove(); });
      dots = []; pts = [x0.slice()]; k = 0;
      trail.set(pts.length > 1 ? pts : [x0, x0]);
      setArrow(cur, 0, 0, x0[0], x0[1]);
      info(x0);
    }
    function step() {
      if (animating) return;
      if (k >= 12) { ctx.note('Twelve applications are shown. Reset or move the start vector to try another case.'); return; }
      var a = pts[pts.length - 1], b = applyB(a), t0 = null;
      animating = true;
      function frame(ts) {
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / 380), e = t * t * (3 - 2 * t);
        var v = [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e];
        setArrow(cur, 0, 0, v[0], v[1]);
        trail.set(pts.concat([v]));
        if (t < 1) { raf = requestAnimationFrame(frame); return; }
        animating = false;
        dots.push(p.point(a[0], a[1], { r: 5, fill: ORANGE }));
        pts.push(b); k += 1; info(b);
      }
      raf = requestAnimationFrame(frame);
    }
    M4.button(brow, 'Apply A once', step, { primary: true });
    M4.button(brow, 'Reset', function () { ctx.note(''); reset(); });
    M4.el('div', { class: 'm4-note', text: 'Drag the dark point to choose the start vector, then apply A repeatedly.' }, w);
    var h = p.handle(x0[0], x0[1], {
      color: INK, snap: 0,
      onDrag: function (x, y) {
        var cx = clamp(x, -3, 3), cy = clamp(y, -3, 3);
        if (cx !== x || cy !== y) h.set(cx, cy);
        x0 = [cx, cy]; reset();
      }
    });
    reset();
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
  }

  // ---------- step 9: exercise, slider for k ----------
  function mountSmallestK(el, ctx) {
    var w = wrap(el);
    var done = false;
    var p = planeBox(w, { xmin: -5, xmax: 5, ymin: -5, ymax: 5 });
    var R = 6.9, d2r = Math.PI / 180;
    var wedge = p.path([[0, 0], [R * Math.cos(40 * d2r), R * Math.sin(40 * d2r)], [R * Math.cos(50 * d2r), R * Math.sin(50 * d2r)]],
      { stroke: GREEN, width: 1, fill: GREEN, closed: true });
    attr(wedge, 'fill-opacity', '0.18'); attr(wedge, 'stroke-opacity', '0.5');
    eigenLines(p, 5);
    p.text(2.2, 4.5, 'within 5°', { fill: GREEN, size: 16, weight: 700 });
    var arr = p.arrow(0, 0, 1, 1, { stroke: ORANGE, width: 5 });
    var row = M4.el('div', { class: 'm4-row' }, w);
    var rv = readout(row), ra = readout(row);
    function vecAt(k) { var v = [3, -1]; for (var i = 0; i < k; i++) v = applyB(v); return v; }
    function show(k) {
      var v = vecAt(k), n = Math.hypot(v[0], v[1]);
      setArrow(arr, 0, 0, 4 * v[0] / n, 4 * v[1] / n);
      rv.textContent = 'A^' + k + ' x = (' + fmt(v[0]) + ', ' + fmt(v[1]) + ')';
      ra.textContent = 'angle to v₁ line = ' + fmt(angleToV1(v[0], v[1]), 2) + '°';
    }
    var sl = M4.slider(w, {
      min: 0, max: 10, step: 1, value: 0, label: 'k',
      format: function (v) { return String(Math.round(v)); },
      onInput: function (v) { if (!done) ctx.note(''); show(Math.round(v)); }
    });
    var brow = M4.el('div', { class: 'm4-row' }, w);
    M4.button(brow, 'Check', function () {
      if (done) return;
      var k = Math.round(sl.get()), ang = angleToV1.apply(null, vecAt(k));
      if (k === 4) {
        done = true;
        attr(wedge, 'fill-opacity', '0.4');
        ctx.note('At \\(k=4\\) the angle is about \\(4.88^\\circ\\). At \\(k=3\\) it is still about \\(10.64^\\circ\\).');
        ctx.solved();
      } else if (k < 4) {
        ctx.wrong('At \\(k=' + k + '\\) the angle is still \\(' + ang.toFixed(2) + '^\\circ\\), above \\(5^\\circ\\).');
      } else {
        ctx.wrong('The angle is below \\(5^\\circ\\) at \\(k=' + k + '\\), but a smaller \\(k\\) already achieves this.');
      }
    }, { primary: true });
    M4.el('div', { class: 'm4-note', text: 'The orange arrow shows the direction of A^k x, redrawn at a fixed length.' }, w);
    show(0);
  }

  // ---------- step 10: exercise, choice (ML) ----------
  function mountRnn(el, ctx) {
    var w = wrap(el);
    var msgs = {
      0: 'Growth requires an eigenvalue of absolute value above 1. Here both are below 1.',
      2: 'A nonzero limit requires an eigenvalue equal to 1. Here \\(0.9^k \\to 0\\).',
      3: 'The 0.5 component vanishes faster, so the remaining vector lies along the 0.9 direction.'
    };
    M4.choices(w, {
      options: [
        'Its length grows without bound.',
        'It shrinks towards zero, pointing ever more closely along the eigenvector with eigenvalue \\(0.9\\).',
        'It converges to a fixed nonzero vector.',
        'It shrinks towards zero, pointing ever more closely along the eigenvector with eigenvalue \\(0.5\\).'
      ],
      correct: 1,
      onCorrect: function () {
        ctx.note('\\(W^k h = c_1\\,0.9^k v_1 + c_2\\,0.5^k v_2\\): both terms vanish, the second one faster. This is the vanishing-signal problem of plain recurrent networks.');
        ctx.solved();
      },
      onWrong: function (i) { ctx.wrong(msgs[i] || 'Consider \\(0.9^k\\) and \\(0.5^k\\) for large \\(k\\).'); }
    });
  }

  // ---------- step 11: exercise, find the exceptional start vector ----------
  function mountException(el, ctx) {
    var w = wrap(el);
    var done = false, N = 10;
    var p = planeBox(w, { xmin: -5, xmax: 5, ymin: -5, ymax: 5 });
    eigenLines(p, 5);
    p.text(4.1, 4.6, 'λ = 1.1', { fill: PINK, size: 16, weight: 700 });
    p.text(3.9, -4.6, 'λ = 0.5', { fill: PURPLE, size: 16, weight: 700 });
    var trail = p.path([[0, 0], [0, 0]], { stroke: ORANGE, width: 2 });
    var dots = [];
    for (var i = 0; i < N; i++) dots.push(p.point(0, 0, { r: 5, fill: ORANGE }));
    var ring = p.point(0, 0, { r: 16, fill: 'none' });
    attr(ring, 'stroke', GREEN); attr(ring, 'stroke-width', '3'); attr(ring, 'stroke-dasharray', '5 5');
    var row = M4.el('div', { class: 'm4-row' }, w);
    var r1 = readout(row), r2 = readout(row);
    function show(x, y) {
      var v = [x, y], pts = [v];
      for (var j = 0; j < N; j++) { v = applyB(v); pts.push(v); dots[j].set(v[0], v[1]); }
      trail.set(pts);
      r1.textContent = 'x₀ = ' + lin(c1of(x, y), c2of(x, y), 1);
      r2.textContent = 'length after 10 steps = ' + fmt(Math.hypot(v[0], v[1]));
    }
    var h = p.handle(2, 1, {
      color: INK, snap: 1,
      onDrag: function (x, y) {
        if (done) return;
        var cx = clamp(Math.round(x), -3, 3), cy = clamp(Math.round(y), -3, 3);
        if (cx !== x || cy !== y) h.set(cx, cy);
        show(cx, cy);
      },
      onEnd: function (x, y) {
        if (done) return;
        x = clamp(Math.round(x), -3, 3); y = clamp(Math.round(y), -3, 3);
        h.set(x, y); show(x, y);
        if (x === 0 && y === 0) { ctx.wrong('The zero vector is excluded. Choose a nonzero start vector.'); return; }
        if (x + y === 0) {
          done = true;
          attr(ring, 'fill', GREEN); attr(ring, 'fill-opacity', '0.35'); attr(ring, 'stroke-dasharray', 'none');
          ctx.note('Here \\(c_1 = 0\\), so \\(A^k x_0 = 0.5^k\\,c_2 v_2 \\to 0\\). The dominant eigenvector never appears.');
          ctx.solved();
        } else {
          ctx.wrong('This start vector has \\(c_1 = ' + c1of(x, y).toFixed(1) + ' \\neq 0\\). That component is multiplied by 1.1 at every step, so the iterates do not shrink to zero.');
        }
      }
    });
    M4.el('div', { class: 'm4-note', text: 'Orange dots are the first ten iterates A x₀, A² x₀, … The dashed ring marks the origin.' }, w);
    show(2, 1);
  }

  // ---------- lesson ----------
  M4.lesson({
    id: 'eigen-s4',
    module: 'eigen',
    title: 'Diagonalisation and repeated maps',
    summary: 'Write a matrix as P D P⁻¹, see that it only stretches in its eigenbasis, and predict what repeated application does.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>A matrix with enough eigenvectors can be described completely by them. Such a matrix \\(A\\) can be written as a product \\(A = PDP^{-1}\\). In the basis of its eigenvectors \\(A\\) acts as a pure stretch, which makes the result of applying \\(A\\) many times easy to predict.</p>' +
          '<p>In this lesson you will assemble \\(P\\) and \\(D\\) from eigenvectors and eigenvalues, compute \\(A^k x\\) without multiplying matrices, and identify the dominant eigenvector that repeated application converges to.</p>'
      },
      {
        kind: 'text',
        title: 'The factorisation A = P D P⁻¹',
        html: '<p>Let \\(A\\) be a \\(2\\times 2\\) matrix with two independent eigenvectors \\(v_1, v_2\\) and eigenvalues \\(\\lambda_1, \\lambda_2\\), so that \\(Av_k = \\lambda_k v_k\\). Let \\(P\\) be the matrix whose columns are \\(v_1\\) and \\(v_2\\), and let \\(D\\) be the diagonal matrix with \\(\\lambda_1\\) and \\(\\lambda_2\\) on its diagonal.</p>' +
          '\\[ AP = PD \\quad\\Longrightarrow\\quad A = PDP^{-1} \\]' +
          '<p>The first equation holds because column \\(k\\) of \\(AP\\) is \\(Av_k\\) and column \\(k\\) of \\(PD\\) is \\(\\lambda_k v_k\\). Read from right to left, \\(P^{-1}\\) converts a vector to coordinates in the eigenbasis, \\(D\\) stretches each coordinate by its eigenvalue, and \\(P\\) converts back.</p>'
      },
      {
        kind: 'explore',
        title: 'Stretching in the eigenbasis',
        html: '<p>The matrix \\(A=\\begin{pmatrix}2&1\\\\1&2\\end{pmatrix}\\) has eigenvectors \\(v_1=(1,1)\\) with \\(\\lambda_1=3\\) and \\(v_2=(1,-1)\\) with \\(\\lambda_2=1\\). Any vector can be written as \\(x = c_1v_1 + c_2v_2\\). The numbers \\(c_1, c_2\\) are its coordinates in the eigenbasis. Applying \\(A\\) gives \\(Ax = 3c_1v_1 + 1c_2v_2\\): the first coordinate is tripled and the second is unchanged.</p>',
        mount: mountDecompose
      },
      {
        kind: 'exercise',
        title: 'P and D for a given matrix',
        html: '<p>Build a valid factorisation of \\(A=\\begin{pmatrix}2&1\\\\1&2\\end{pmatrix}\\). Place an eigenvector in each column of \\(P\\) and the matching eigenvalue in the corresponding diagonal entry of \\(D\\).</p>',
        hint: 'Check each candidate vector by multiplying it by A. A(1,1) = (3,3) and A(1,−1) = (1,−1). The first diagonal entry of D belongs to the first column of P.',
        mount: mountBuild
      },
      {
        kind: 'exercise',
        title: 'Applying A in the eigenbasis',
        html: '<p>The vector \\(x = 1\\,v_1 + 2\\,v_2 = (3,-1)\\) is shown with its two components along the eigenvectors. For the same matrix \\(A\\) with \\(\\lambda_1 = 3\\) and \\(\\lambda_2 = 1\\), drag the orange handle to \\(Ax\\).</p>',
        hint: 'Multiply the coordinate along v₁ by 3 and leave the coordinate along v₂ as it is: Ax = 3·v₁ + 2·v₂. Add the two vectors.',
        mount: mountPlaceAx
      },
      {
        kind: 'text',
        title: 'Powers of a matrix',
        html: '<p>Applying \\(A\\) twice gives \\(A^2 = PDP^{-1}PDP^{-1} = PD^2P^{-1}\\), because \\(P^{-1}P\\) is the identity. Repeating the argument for \\(k\\) applications gives</p>' +
          '\\[ A^k = PD^kP^{-1}, \\qquad D^k = \\begin{pmatrix}\\lambda_1^k & 0\\\\ 0 & \\lambda_2^k\\end{pmatrix}. \\]' +
          '<p>In terms of a single vector \\(x = c_1v_1 + c_2v_2\\), this reads \\(A^kx = c_1\\lambda_1^k v_1 + c_2\\lambda_2^k v_2\\). Each eigen-coordinate is multiplied by the \\(k\\)-th power of its own eigenvalue, and the two coordinates never mix.</p>'
      },
      {
        kind: 'exercise',
        title: 'Powers through eigenvalues',
        html: '<p>Let \\(A=\\begin{pmatrix}2&1\\\\1&2\\end{pmatrix}\\) as before and \\(x = v_1 + v_2 = (2,0)\\), so \\(c_1 = c_2 = 1\\). Compute the first component of \\(A^3x\\).</p>',
        hint: 'A³x = 3³·v₁ + 1³·v₂ = 27·(1,1) + (1,−1).',
        mount: mountPower
      },
      {
        kind: 'explore',
        title: 'Repeated application',
        html: '<p>The matrix \\(A=\\begin{pmatrix}0.8&0.3\\\\0.3&0.8\\end{pmatrix}\\) has the same eigenvectors \\(v_1=(1,1)\\) and \\(v_2=(1,-1)\\), now with eigenvalues \\(1.1\\) and \\(0.5\\). Each application multiplies the \\(v_2\\) coordinate by \\(0.5\\) and the \\(v_1\\) coordinate by \\(1.1\\), so the vector turns towards the line through \\(v_1\\). The eigenvector whose eigenvalue has the largest absolute value is called the dominant eigenvector.</p>',
        mount: mountIterate
      },
      {
        kind: 'exercise',
        title: 'Rate of convergence',
        html: '<p>For the same matrix with eigenvalues \\(1.1\\) and \\(0.5\\), start from \\(x = (3,-1) = 1\\,v_1 + 2\\,v_2\\). Find the smallest number of applications \\(k\\) for which the angle between \\(A^kx\\) and the line through the dominant eigenvector \\(v_1\\) is below \\(5^\\circ\\). Set \\(k\\) with the slider and press Check.</p>',
        hint: 'The ratio of the two eigen-coordinates is 2·(0.5/1.1)^k, and this ratio is the tangent of the angle. It must fall below tan 5° ≈ 0.087.',
        mount: mountSmallestK
      },
      {
        kind: 'exercise',
        title: 'Repeated maps in machine learning',
        html: '<p>Repeated multiplication by one matrix occurs throughout machine learning. Power iteration finds the first principal component of a data set by applying the covariance matrix repeatedly, and a simple recurrent network multiplies its hidden state by the same weight matrix \\(W\\) at every time step. Suppose \\(W\\) has eigenvalues \\(0.9\\) and \\(0.5\\) with independent eigenvectors, and no other operation is applied. What happens to a typical hidden state vector after many steps?</p>',
        hint: 'Write the state as c₁v₁ + c₂v₂. After k steps the coordinates are c₁·0.9^k and c₂·0.5^k. Compare how quickly each one decays.',
        mount: mountRnn
      },
      {
        kind: 'exercise',
        title: 'Exceptional start vectors',
        html: '<p>For \\(A=\\begin{pmatrix}0.8&0.3\\\\0.3&0.8\\end{pmatrix}\\) with eigenvalues \\(1.1\\) on \\(v_1=(1,1)\\) and \\(0.5\\) on \\(v_2=(1,-1)\\), almost every start vector is pulled towards the dominant direction and grows. Drag the dark handle to a nonzero start vector \\(x_0\\) whose iterates \\(A^kx_0\\) shrink to zero instead.</p>',
        hint: 'The growth comes entirely from the coordinate c₁ along v₁. Choose a start vector with c₁ = 0, that is, a point on the purple dashed line.',
        mount: mountException
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>If \\(A\\) has independent eigenvectors as the columns of \\(P\\) and the matching eigenvalues on the diagonal of \\(D\\), then \\(A = PDP^{-1}\\). In eigenbasis coordinates \\(A\\) only stretches each coordinate by its eigenvalue.</li>' +
          '<li>Powers are obtained from powers of the eigenvalues: \\(A^k = PD^kP^{-1}\\), so \\(A^kx = c_1\\lambda_1^kv_1 + c_2\\lambda_2^kv_2\\).</li>' +
          '<li>Under repeated application the direction of \\(A^kx\\) approaches the dominant eigenvector unless the start vector has no component along it. The size of the largest eigenvalue decides whether the vector grows or vanishes, which is the mechanism behind power iteration and behind exploding and vanishing signals in recurrent networks.</li>' +
          '</ul>'
      }
    ]
  });
})();
