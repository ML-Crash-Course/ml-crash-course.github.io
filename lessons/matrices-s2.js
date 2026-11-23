(function () {
  'use strict';

  var M4 = window.M4;
  var C = M4.colors;
  var P = 'matrices-s2-';

  function injectStyle() {
    if (document.getElementById(P + 'style')) return;
    var s = document.createElement('style');
    s.id = P + 'style';
    s.textContent = [
      '.' + P + 'wrap{display:flex;flex-direction:column;align-items:center;gap:18px;margin-top:8px}',
      '.' + P + 'given{font-size:22px;text-align:center}',
      '.' + P + 'line{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;font-size:24px;font-weight:600}',
      '.' + P + 'slot{display:inline-flex;align-items:center;justify-content:center;min-width:56px;height:56px;padding:0 6px;font-size:24px;font-weight:700;border-radius:14px;box-sizing:border-box;font-variant-numeric:tabular-nums}',
      '.' + P + 'slot-m{border-color:' + C.purple + ';background:rgba(122,92,255,0.07)}',
      '.' + P + 'slot-v{border-color:' + C.orange + ';background:rgba(255,138,31,0.08)}',
      '.' + P + 'slot-r{border-color:' + C.green + ';background:rgba(22,181,107,0.07)}',
      '.' + P + 'slot.filled,.' + P + 'slot.m4-filled,.' + P + 'slot.' + P + 'done{border-style:solid;background:#fff}',
      '.' + P + 'tok{display:inline-flex;align-items:center;justify-content:center;min-width:56px;height:56px;padding:0 6px;font-size:24px;font-weight:700;box-sizing:border-box;touch-action:none;user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums}',
      '.' + P + 'tok-m{border-color:' + C.purple + ';color:' + C.purple + '}',
      '.' + P + 'tok-v{border-color:' + C.orange + ';color:#c9640a}',
      '.' + P + 'tok-r{border-color:' + C.ink + '}',
      '.' + P + 'tray{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;padding:14px 16px;border-radius:18px;background:#f3f1ea;min-height:56px}',
      '.' + P + 'res{min-width:70px;text-align:left;color:' + C.green + ';opacity:0;transition:opacity .3s}',
      '.' + P + 'res.' + P + 'on{opacity:1}',
      '.' + P + 'vec{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-left:3px solid ' + C.ink + ';border-right:3px solid ' + C.ink + ';border-radius:14px}',
      '.' + P + 'legend{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}',
      '.' + P + 'plane{width:100%;max-width:540px;margin:0 auto}',
      '.' + P + 'inputs{display:flex;flex-direction:column;gap:14px;align-items:center}',
      '@media(max-width:520px){.' + P + 'line{gap:4px;font-size:18px}body .' + P + 'slot{min-width:38px;height:38px;min-height:38px;font-size:18px;padding:0 3px}.' + P + 'line .m4-chip{font-size:12px;padding:4px 7px}.' + P + 'res{min-width:0}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function fmt(v) {
    var r = Math.round(v * 100) / 100;
    if (r === 0) r = 0;
    return (r < 0 ? '−' : '') + Math.abs(r);
  }
  function par(v) { return v < 0 ? '(' + fmt(v) + ')' : fmt(v); }
  function pm(rows) {
    return '\\begin{pmatrix}' + rows.map(function (r) { return r.join(' & '); }).join(' \\\\ ') + '\\end{pmatrix}';
  }
  function tipLabel(x, y, d) {
    var n = Math.sqrt(x * x + y * y) || 1;
    return [x + (x / n) * d, y + (y / n) * d];
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // Token handling that does not depend on whether M4.dragDrop moves the token node itself.
  function sendHome(tok, tray) {
    if (tok.parentNode !== tray) tray.appendChild(tok);
    tok.style.transform = ''; tok.style.left = ''; tok.style.top = ''; tok.style.position = '';
  }
  function consume(tok, tray) {
    sendHome(tok, tray);
    tok.style.visibility = 'hidden';
    tok.style.pointerEvents = 'none';
  }

  // ---------- Step 3: drag entries into the row computation ----------
  function mountEntries(el, ctx) {
    injectStyle();
    var A = [[2, 1], [3, 4]], x = [5, 6];
    var wrap = M4.el('div', { class: P + 'wrap' }, el);
    M4.el('div', { class: P + 'given', html: M4.tex('A = ' + pm(A) + ', \\qquad \\mathbf{x} = ' + pm([[x[0]], [x[1]]]), true) }, wrap);
    var legend = M4.el('div', { class: P + 'legend' }, wrap);
    M4.el('span', { class: 'm4-chip', style: 'border:2px dashed ' + C.purple + ';color:' + C.purple, text: 'entry of a row of A' }, legend);
    M4.el('span', { class: 'm4-chip', style: 'border:2px dashed ' + C.orange + ';color:#c9640a', text: 'entry of x' }, legend);

    var slots = [], results = [], filled = 0, done = false;
    function mk(parent, kind, value, row, pos) {
      var s = M4.el('span', { class: 'm4-slot ' + P + 'slot ' + P + 'slot-' + kind }, parent);
      s.dataset.kind = kind; s.dataset.value = String(value); s.dataset.row = String(row); s.dataset.pos = String(pos);
      slots.push(s);
      return s;
    }
    for (var i = 0; i < 2; i++) {
      var line = M4.el('div', { class: P + 'line' }, wrap);
      M4.el('span', { class: 'm4-chip', text: 'row ' + (i + 1) }, line);
      mk(line, 'm', A[i][0], i, 0);
      M4.el('span', { text: '·' }, line);
      mk(line, 'v', x[0], i, 0);
      M4.el('span', { text: '+' }, line);
      mk(line, 'm', A[i][1], i, 1);
      M4.el('span', { text: '·' }, line);
      mk(line, 'v', x[1], i, 1);
      results.push(M4.el('span', { class: P + 'res', text: '= ' + (A[i][0] * x[0] + A[i][1] * x[1]) }, line));
    }
    var tray = M4.el('div', { class: P + 'tray' }, wrap);
    var defs = [[4, 'm'], [5, 'v'], [2, 'm'], [6, 'v'], [1, 'm'], [5, 'v'], [3, 'm'], [6, 'v']];
    var tokens = defs.map(function (d) {
      var t = M4.el('div', { class: 'm4-token ' + P + 'tok ' + P + 'tok-' + d[1], text: String(d[0]) }, tray);
      t.dataset.value = String(d[0]); t.dataset.kind = d[1];
      return t;
    });
    var ord = ['first', 'second'];
    M4.dragDrop({
      tokens: tokens,
      slots: slots,
      onDrop: function (tok, slot) {
        if (done || slot.dataset.done) { sendHome(tok, tray); return; }
        var row = +slot.dataset.row, pos = +slot.dataset.pos;
        if (tok.dataset.kind !== slot.dataset.kind) {
          sendHome(tok, tray);
          ctx.wrong(slot.dataset.kind === 'm'
            ? 'A purple slot takes an entry of row ' + (row + 1) + ' of A, not an entry of x.'
            : 'An orange slot takes an entry of x, not an entry of A.');
          return;
        }
        if (tok.dataset.value !== slot.dataset.value) {
          sendHome(tok, tray);
          ctx.wrong(slot.dataset.kind === 'm'
            ? 'Row ' + (row + 1) + ' of A is (' + A[row][0] + ', ' + A[row][1] + '). This slot takes its ' + ord[pos] + ' entry.'
            : 'The ' + ord[pos] + ' entry of the row multiplies the ' + ord[pos] + ' entry of x.');
          return;
        }
        consume(tok, tray);
        slot.textContent = tok.dataset.value;
        slot.dataset.done = '1';
        slot.classList.add('filled', 'm4-filled', P + 'done');
        slot.style.color = slot.dataset.kind === 'm' ? C.purple : '#c9640a';
        filled++;
        var rowDone = slots.filter(function (s) { return +s.dataset.row === row && s.dataset.done; }).length === 4;
        if (rowDone) {
          results[row].classList.add(P + 'on', 'm4-pop');
        }
        if (filled === 8) {
          done = true;
          ctx.note('Both dot products are complete: \\(A\\mathbf{x} = ' + pm([[16], [39]]) + '\\).');
          ctx.solved();
        } else {
          ctx.note(rowDone ? 'Row ' + (row + 1) + ' is complete.' : '');
        }
      },
      onMiss: function (tok) { if (tok) sendHome(tok, tray); }
    });
  }

  // ---------- Step 4: row picture explore ----------
  function mountRowExplore(el, ctx) {
    injectStyle();
    var A = [[2, 1], [-1, 1]];
    var wrap = M4.el('div', { class: P + 'wrap' }, el);
    M4.el('div', { class: P + 'given', html: M4.tex('A = ' + pm(A)) }, wrap);
    var holder = M4.el('div', { class: P + 'plane' }, wrap);
    var p = M4.plane(holder, { xmin: -7, xmax: 7, ymin: -7, ymax: 7, width: 520, height: 520 });
    var out = p.arrow(0, 0, 1, 1, { stroke: C.purple, width: 5 });
    var inp = p.arrow(0, 0, 1, 1, { stroke: C.orange, width: 4 });
    var outL = p.text(0, 0, 'Ax', { fill: C.purple, size: 18, weight: 700 });
    var inL = p.text(0, 0, 'x', { fill: '#c9640a', size: 18, weight: 700 });
    var r1 = M4.el('div', { class: 'm4-readout' }, wrap);
    var r2 = M4.el('div', { class: 'm4-readout' }, wrap);
    var h;
    function update(x, y) {
      x = clamp(x, -2, 2); y = clamp(y, -2, 2);
      var o1 = A[0][0] * x + A[0][1] * y, o2 = A[1][0] * x + A[1][1] * y;
      inp.set(0, 0, x, y); out.set(0, 0, o1, o2);
      var a = tipLabel(x, y, 0.75), b = tipLabel(o1, o2, 0.7);
      inL.set(a[0], a[1], 'x'); outL.set(b[0], b[1], 'Ax');
      r1.textContent = 'row 1 · x = 2·' + par(x) + ' + 1·' + par(y) + ' = ' + fmt(o1);
      r2.textContent = 'row 2 · x = (−1)·' + par(x) + ' + 1·' + par(y) + ' = ' + fmt(o2);
    }
    h = p.handle(1.5, 1, {
      color: C.orange, snap: 0.5, bounds: { xmin: -2, xmax: 2, ymin: -2, ymax: 2 },
      onDrag: function (x, y) {
        var cx = clamp(x, -2, 2), cy = clamp(y, -2, 2);
        if ((cx !== x || cy !== y) && h) h.set(cx, cy);
        update(cx, cy);
      }
    });
    update(1.5, 1);
    M4.el('div', { class: 'm4-note', text: 'Drag the orange point. The input is limited to the square from −2 to 2.' }, wrap);
  }

  // ---------- Step 5: numeric entries ----------
  function mountNumbers(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: P + 'wrap' }, el);
    M4.el('div', { class: P + 'given', html: M4.tex(pm([[1, -2], [3, 2]]) + pm([[4], [1]]) + ' = ' + pm([['y_1'], ['y_2']]), true) }, wrap);
    var box = M4.el('div', { class: P + 'inputs' }, wrap);
    var ok = [false, false];
    function check() {
      if (ok[0] && ok[1]) { ctx.note('\\(A\\mathbf{x} = ' + pm([[2], [14]]) + '\\).'); ctx.solved(); }
    }
    M4.numberInput(box, {
      answer: 2, tolerance: 0.01, label: 'y₁ =', placeholder: 'row 1 · x',
      onCorrect: function () { ok[0] = true; ctx.note('\\(y_1 = 1\\cdot 4 + (-2)\\cdot 1 = 2\\).'); check(); },
      onWrong: function (v) {
        ctx.wrong(Number(v) === 6 ? 'The second entry of row 1 is −2, so its product with 1 is subtracted.' : 'Use row 1, which is (1, −2): compute 1·4 + (−2)·1.');
      }
    });
    M4.numberInput(box, {
      answer: 14, tolerance: 0.01, label: 'y₂ =', placeholder: 'row 2 · x',
      onCorrect: function () { ok[1] = true; ctx.note('\\(y_2 = 3\\cdot 4 + 2\\cdot 1 = 14\\).'); check(); },
      onWrong: function () { ctx.wrong('Use row 2, which is (3, 2): compute 3·4 + 2·1.'); }
    });
  }

  // ---------- shared column-picture drawing ----------
  function columnScene(parent, opts) {
    var a1 = opts.a1, a2 = opts.a2;
    var holder = M4.el('div', { class: P + 'plane', style: 'max-width:' + (opts.width || 520) + 'px' }, parent);
    var p = M4.plane(holder, { xmin: opts.xmin, xmax: opts.xmax, ymin: opts.ymin, ymax: opts.ymax, width: opts.width || 520, height: opts.height || 520 });
    var sc = {};
    sc.p = p;
    if (opts.target) {
      sc.ring = M4.svg('circle', { cx: p.x(opts.target[0]), cy: p.y(opts.target[1]), r: 16, fill: 'rgba(22,181,107,0.12)', stroke: C.green, 'stroke-width': 3, 'stroke-dasharray': '6 5' }, p.g);
      p.text(opts.target[0] + 0.75, opts.target[1] + 0.45, 'b', { fill: C.green, size: 18, weight: 700 });
    }
    p.arrow(0, 0, a1[0], a1[1], { stroke: 'rgba(122,92,255,0.3)', width: 3 });
    p.arrow(0, 0, a2[0], a2[1], { stroke: 'rgba(255,138,31,0.35)', width: 3 });
    var d1 = p.line(0, 0, 0, 0, { stroke: C.line, width: 2, dash: '5 5' });
    var d2 = p.line(0, 0, 0, 0, { stroke: C.line, width: 2, dash: '5 5' });
    var s1 = p.arrow(0, 0, 1, 1, { stroke: C.purple, width: 5 });
    var s2 = p.arrow(0, 0, 1, 1, { stroke: C.orange, width: 5 });
    var res = p.arrow(0, 0, 1, 1, { stroke: C.ink, width: 4 });
    var tip = p.point(0, 0, { r: 7, fill: C.ink });
    var l1 = p.text(0, 0, '', { fill: C.purple, size: 16, weight: 700 });
    var l2 = p.text(0, 0, '', { fill: '#c9640a', size: 16, weight: 700 });
    sc.update = function (x1, x2) {
      var ux = x1 * a1[0], uy = x1 * a1[1], vx = x2 * a2[0], vy = x2 * a2[1];
      var bx = ux + vx, by = uy + vy;
      s1.set(0, 0, ux, uy); s2.set(ux, uy, bx, by); res.set(0, 0, bx, by); tip.set(bx, by);
      d1.set(0, 0, vx, vy); d2.set(vx, vy, bx, by);
      // labels offset perpendicular to each arrow, away from the result diagonal
      var n1 = Math.sqrt(a1[0] * a1[0] + a1[1] * a1[1]), n2 = Math.sqrt(a2[0] * a2[0] + a2[1] * a2[1]);
      var cross = a1[0] * a2[1] - a1[1] * a2[0];
      var sgn = (cross * x1 * x2 >= 0) ? 1 : -1;
      var o = 0.6;
      l1.set(ux / 2 + sgn * (a1[1] / n1) * o, uy / 2 - sgn * (a1[0] / n1) * o, 'x₁a₁');
      l2.set(ux + vx / 2 + sgn * (a2[1] / n2) * o, uy + vy / 2 - sgn * (a2[0] / n2) * o, 'x₂a₂');
      return [bx, by];
    };
    return sc;
  }

  // ---------- Step 7: column picture explore ----------
  function mountColExplore(el, ctx) {
    injectStyle();
    var a1 = [2, 1], a2 = [-1, 2];
    var wrap = M4.el('div', { class: P + 'wrap' }, el);
    M4.el('div', { class: P + 'given', html: M4.tex('A = ' + pm([[2, -1], [1, 2]]) + ',\\quad \\mathbf{a}_1 = ' + pm([[2], [1]]) + ',\\quad \\mathbf{a}_2 = ' + pm([[-1], [2]])) }, wrap);
    var sc = columnScene(wrap, { a1: a1, a2: a2, xmin: -7, xmax: 7, ymin: -7, ymax: 7 });
    var ro = M4.el('div', { class: 'm4-readout' }, wrap);
    var x1 = 1.5, x2 = 1, raf = 0, anim = null, auto = false;
    function draw() {
      var b = sc.update(x1, x2);
      ro.innerHTML = M4.tex('A\\mathbf{x} = ' + fmt(x1) + M4.col([2, 1]) + ' + ' + par(x2) + M4.col([-1, 2]) + ' = ' + M4.col([fmt(b[0]), fmt(b[1])]));
    }
    var ctl = M4.el('div', { style: 'width:100%;max-width:520px' }, wrap);
    var sl1 = M4.slider(ctl, { min: -2, max: 2, step: 0.25, value: x1, label: 'x₁', format: fmt, onInput: function (v) { if (auto) return; stop(); x1 = +v; draw(); } });
    var sl2 = M4.slider(ctl, { min: -2, max: 2, step: 0.25, value: x2, label: 'x₂', format: fmt, onInput: function (v) { if (auto) return; stop(); x2 = +v; draw(); } });
    function setAuto(v) { auto = true; try { sl1.set(v); } finally { auto = false; } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } anim = null; }
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    M4.button(row, 'Sweep x₁', function () {
      stop();
      var t0 = performance.now(), base = x2;
      anim = function (now) {
        var t = (now - t0) / 4000;
        if (t >= 1) { x1 = 1.5; setAuto(x1); draw(); raf = 0; anim = null; return; }
        x1 = Math.round(1.5 * Math.cos(2 * Math.PI * t) * 100) / 100;
        x2 = base;
        setAuto(x1); draw();
        raf = requestAnimationFrame(anim);
      };
      raf = requestAnimationFrame(anim);
    });
    ctx.onCleanup(stop);
    draw();
  }

  // ---------- Step 8: sliders to hit the target ----------
  function mountColTarget(el, ctx) {
    injectStyle();
    var a1 = [2, 1], a2 = [-1, 1], target = [1, 5];
    var wrap = M4.el('div', { class: P + 'wrap' }, el);
    M4.el('div', { class: P + 'given', html: M4.tex('x_1' + pm([[2], [1]]) + ' + x_2' + pm([[-1], [1]]) + ' = ' + pm([[1], [5]])) }, wrap);
    var sc = columnScene(wrap, { a1: a1, a2: a2, xmin: -6, xmax: 8, ymin: -3, ymax: 7, width: 560, height: 400, target: target });
    var ro = M4.el('div', { class: 'm4-readout' }, wrap);
    var x1 = 1, x2 = 1, done = false;
    function draw() {
      var b = sc.update(x1, x2);
      ro.innerHTML = M4.tex('A\\mathbf{x} = ' + M4.col([fmt(b[0]), fmt(b[1])]) + ' \\qquad \\text{target } \\mathbf{b} = ' + M4.col([1, 5]));
      var d = Math.sqrt(Math.pow(b[0] - target[0], 2) + Math.pow(b[1] - target[1], 2));
      if (d < 1e-6) {
        if (!done) {
          done = true;
          sc.ring.setAttribute('fill', C.green);
          sc.ring.setAttribute('stroke-dasharray', 'none');
          ctx.note('\\(2\\,\\mathbf{a}_1 + 3\\,\\mathbf{a}_2 = \\mathbf{b}\\), so \\(\\mathbf{x} = \\begin{pmatrix}2\\\\3\\end{pmatrix}\\) solves \\(A\\mathbf{x} = \\mathbf{b}\\).');
          ctx.solved();
        }
      } else if (!done) {
        ctx.note('Distance from the tip to the target: ' + fmt(d) + '.');
      }
    }
    var ctl = M4.el('div', { style: 'width:100%;max-width:520px' }, wrap);
    M4.slider(ctl, { min: -1, max: 3, step: 0.5, value: x1, label: 'x₁', format: fmt, onInput: function (v) { x1 = +v; draw(); } });
    M4.slider(ctl, { min: -1, max: 3, step: 0.5, value: x2, label: 'x₂', format: fmt, onInput: function (v) { x2 = +v; draw(); } });
    draw();
  }

  // ---------- Step 9: drag input so output hits target ----------
  function mountInputTarget(el, ctx) {
    injectStyle();
    var A = [[1, -1], [1, 1]], target = [1, 3];
    var wrap = M4.el('div', { class: P + 'wrap' }, el);
    M4.el('div', { class: P + 'given', html: M4.tex('A = ' + pm(A) + ', \\qquad \\mathbf{b} = ' + pm([[1], [3]])) }, wrap);
    var holder = M4.el('div', { class: P + 'plane' }, wrap);
    var p = M4.plane(holder, { xmin: -7, xmax: 7, ymin: -7, ymax: 7, width: 520, height: 520 });
    var ring = M4.svg('circle', { cx: p.x(target[0]), cy: p.y(target[1]), r: 17, fill: 'rgba(22,181,107,0.12)', stroke: C.green, 'stroke-width': 3, 'stroke-dasharray': '6 5' }, p.g);
    p.text(target[0] + 0.3, target[1] + 0.85, 'b', { fill: C.green, size: 18, weight: 700 });
    var out = p.arrow(0, 0, 1, 1, { stroke: C.purple, width: 5 });
    var inp = p.arrow(0, 0, 1, 1, { stroke: C.orange, width: 4 });
    var r1 = M4.el('div', { class: 'm4-readout' }, wrap);
    var r2 = M4.el('div', { class: 'm4-readout' }, wrap);
    var done = false, h, last = [-1, 1];
    function calc(x, y) { return [A[0][0] * x + A[0][1] * y, A[1][0] * x + A[1][1] * y]; }
    function update(x, y) {
      var o = calc(x, y);
      inp.set(0, 0, x, y); out.set(0, 0, o[0], o[1]);
      r1.innerHTML = M4.tex('\\mathbf{x} = ' + M4.col([fmt(x), fmt(y)]));
      r2.innerHTML = M4.tex('A\\mathbf{x} = ' + M4.col([fmt(x) + ' - ' + par(y), fmt(x) + ' + ' + par(y)]) + ' = ' + M4.col([fmt(o[0]), fmt(o[1])]));
      return o;
    }
    function finish(x, y) {
      if (done) return;
      var o = calc(x, y);
      if (Math.abs(o[0] - target[0]) < 1e-6 && Math.abs(o[1] - target[1]) < 1e-6) {
        done = true;
        ring.setAttribute('fill', C.green);
        ring.setAttribute('stroke-dasharray', 'none');
        ctx.note('\\(A\\begin{pmatrix}2\\\\1\\end{pmatrix} = \\begin{pmatrix}2-1\\\\2+1\\end{pmatrix} = \\begin{pmatrix}1\\\\3\\end{pmatrix}\\).');
        ctx.solved();
      } else {
        var m = [];
        if (Math.abs(o[0] - target[0]) > 1e-6) m.push('row 1 gives ' + fmt(o[0]) + ' but must give 1');
        if (Math.abs(o[1] - target[1]) > 1e-6) m.push('row 2 gives ' + fmt(o[1]) + ' but must give 3');
        ctx.note('Not yet: ' + m.join('; ') + '.');
      }
    }
    h = p.handle(-1, 1, {
      color: C.orange, snap: 1, bounds: { xmin: -3, xmax: 3, ymin: -3, ymax: 3 },
      onDrag: function (x, y) {
        var cx = clamp(Math.round(x), -3, 3), cy = clamp(Math.round(y), -3, 3);
        if ((cx !== x || cy !== y) && h) h.set(cx, cy);
        last = [cx, cy];
        update(cx, cy);
      },
      onEnd: function (x, y) {
        if (typeof x === 'number' && typeof y === 'number' && isFinite(x) && isFinite(y)) {
          last = [clamp(Math.round(x), -3, 3), clamp(Math.round(y), -3, 3)];
        }
        if (h) h.set(last[0], last[1]);
        update(last[0], last[1]);
        finish(last[0], last[1]);
      }
    });
    update(-1, 1);
    var legend = M4.el('div', { class: P + 'legend' }, wrap);
    M4.el('span', { class: 'm4-chip', style: 'color:#c9640a', text: 'orange: input x (drag)' }, legend);
    M4.el('span', { class: 'm4-chip', style: 'color:' + C.purple, text: 'purple: output Ax' }, legend);
  }

  // ---------- Step 10: ML choice ----------
  function mountLayer(el, ctx) {
    injectStyle();
    var wrap = M4.el('div', { class: P + 'wrap' }, el);
    M4.choices(wrap, {
      options: [
        '\\(\\mathbf{x}\\) has 3 entries and \\(\\mathbf{z}\\) has 4 entries',
        '\\(\\mathbf{x}\\) has 4 entries and \\(\\mathbf{z}\\) has 3 entries',
        '\\(\\mathbf{x}\\) and \\(\\mathbf{z}\\) both have 4 entries',
        '\\(\\mathbf{x}\\) has 12 entries and \\(\\mathbf{z}\\) has 1 entry'
      ],
      correct: 1,
      onCorrect: function () {
        ctx.note('Each of the 3 rows holds 4 weights, so the matrix turns 4 input numbers into 3 scores.');
        ctx.solved();
      },
      onWrong: function (i) {
        ctx.note(i === 0
          ? 'Each row is paired entry by entry with \\(\\mathbf{x}\\), so the length of \\(\\mathbf{x}\\) equals the number of columns.'
          : 'There is one output entry per row, and each row needs as many entries as \\(\\mathbf{x}\\) has.');
      }
    });
  }

  // ---------- Step 11: 3x2 product, drag results ----------
  function mountFinal(el, ctx) {
    injectStyle();
    var A = [[1, 2], [0, -1], [3, 1]], x = [2, 3], ans = [8, -3, 9];
    var wrap = M4.el('div', { class: P + 'wrap' }, el);
    var line = M4.el('div', { class: P + 'line' }, wrap);
    M4.el('span', { html: M4.tex(pm(A) + pm([[x[0]], [x[1]]]) + ' = ', true) }, line);
    var vec = M4.el('div', { class: P + 'vec' }, line);
    var slots = ans.map(function (a, i) {
      var s = M4.el('span', { class: 'm4-slot ' + P + 'slot ' + P + 'slot-r' }, vec);
      s.dataset.value = String(a); s.dataset.row = String(i);
      return s;
    });
    var tray = M4.el('div', { class: P + 'tray' }, wrap);
    var tokens = [7, 9, -2, 8, 11, -3, 5].map(function (v) {
      var t = M4.el('div', { class: 'm4-token ' + P + 'tok ' + P + 'tok-r', text: fmt(v) }, tray);
      t.dataset.value = String(v);
      return t;
    });
    var filled = 0, done = false;
    M4.dragDrop({
      tokens: tokens,
      slots: slots,
      onDrop: function (tok, slot) {
        if (done || slot.dataset.done) { sendHome(tok, tray); return; }
        var i = +slot.dataset.row;
        if (tok.dataset.value !== slot.dataset.value) {
          sendHome(tok, tray);
          ctx.wrong('Entry ' + (i + 1) + ' is row ' + (i + 1) + ' of \\(A\\), \\(\\begin{pmatrix}' + fmt(A[i][0]).replace('−', '-') + ' & ' + fmt(A[i][1]).replace('−', '-') + '\\end{pmatrix}\\), dotted with \\(\\mathbf{x} = ' + M4.col([2, 3]) + '\\). Keep the order of the entries.');
          return;
        }
        consume(tok, tray);
        slot.textContent = fmt(+tok.dataset.value);
        slot.dataset.done = '1';
        slot.classList.add('filled', 'm4-filled', P + 'done', 'm4-pop');
        slot.style.color = C.green;
        filled++;
        if (filled === 3) {
          done = true;
          ctx.note('Column check: \\(2' + pm([[1], [0], [3]]) + ' + 3' + pm([[2], [-1], [1]]) + ' = ' + pm([[8], [-3], [9]]) + '\\).');
          ctx.solved();
        } else {
          ctx.note('Entry ' + (i + 1) + ': \\(' + A[i][0] + '\\cdot 2 + (' + A[i][1] + ')\\cdot 3 = ' + ans[i] + '\\).');
        }
      },
      onMiss: function (tok) { if (tok) sendHome(tok, tray); }
    });
  }

  M4.lesson({
    id: 'matrices-s2',
    module: 'matrices',
    title: 'Matrix times vector',
    summary: 'A matrix times a vector can be computed in two ways, as dot products with the rows or as a weighted sum of the columns.',
    minutes: 10,
    steps: [
      {
        kind: 'text',
        title: 'Rows and columns',
        html: '<p>A matrix \\(A\\) moves every point of the plane. The arithmetic behind this computes the output \\(A\\mathbf{x}\\) for a given input vector \\(\\mathbf{x}\\).</p>' +
          '<p>By the end you can compute \\(A\\mathbf{x}\\) entry by entry using the rows of \\(A\\), interpret the same product as a weighted sum of the columns of \\(A\\), and use the product to compute several scores at once.</p>'
      },
      {
        kind: 'text',
        title: 'The row picture',
        html: '<p>Let \\(A\\) be a matrix with entries \\(a, b\\) in its first row and \\(c, d\\) in its second row, and let \\(\\mathbf{x}\\) be a vector with entries \\(x_1, x_2\\). The product is defined as</p>' +
          '\\[\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}\\begin{pmatrix} x_1 \\\\ x_2 \\end{pmatrix} = \\begin{pmatrix} a\\,x_1 + b\\,x_2 \\\\ c\\,x_1 + d\\,x_2 \\end{pmatrix}.\\]' +
          '<p>Each output entry is a dot product: the entries of one row are multiplied with the matching entries of \\(\\mathbf{x}\\) and the products are added. Row 1 produces output entry 1, and row 2 produces output entry 2.</p>'
      },
      {
        kind: 'exercise',
        title: 'Row dot products',
        html: '<p>Drag each number into the computation of \\(A\\mathbf{x}\\). Purple slots take entries of the corresponding row of \\(A\\), and orange slots take entries of \\(\\mathbf{x}\\).</p>',
        hint: 'Row 1 of A is (2, 1). Its first entry multiplies the first entry of x, which is 5, and its second entry multiplies 6.',
        mount: mountEntries
      },
      {
        kind: 'explore',
        title: 'Row picture practice',
        html: '<p>The orange arrow is the input \\(\\mathbf{x}\\) and the purple arrow is the output \\(A\\mathbf{x}\\). The two values below show the dot product of each row with \\(\\mathbf{x}\\). The first is the horizontal coordinate of the output and the second is its vertical coordinate.</p>',
        mount: mountRowExplore
      },
      {
        kind: 'exercise',
        title: 'Both entries',
        html: '<p>Compute the two entries \\(y_1\\) and \\(y_2\\) of the product. Each entry is the dot product of one row with the vector.</p>',
        hint: 'y₁ = 1·4 + (−2)·1 and y₂ = 3·4 + 2·1.',
        mount: mountNumbers
      },
      {
        kind: 'text',
        title: 'The column picture',
        html: '<p>The same result can be grouped by the entries of \\(\\mathbf{x}\\) instead of by rows:</p>' +
          '\\[\\begin{pmatrix} a\\,x_1 + b\\,x_2 \\\\ c\\,x_1 + d\\,x_2 \\end{pmatrix} = x_1\\begin{pmatrix} a \\\\ c \\end{pmatrix} + x_2\\begin{pmatrix} b \\\\ d \\end{pmatrix} = x_1\\,\\mathbf{a}_1 + x_2\\,\\mathbf{a}_2 .\\]' +
          '<p>Here \\(\\mathbf{a}_1\\) and \\(\\mathbf{a}_2\\) denote the first and second column of \\(A\\). The product \\(A\\mathbf{x}\\) is a linear combination of the columns, and the entries of \\(\\mathbf{x}\\) are the weights. This agrees with the deformed grid picture: the columns are where the basis vectors land, and \\(\\mathbf{x}\\) states how much of each to take.</p>'
      },
      {
        kind: 'explore',
        title: 'Column picture practice',
        html: '<p>The sliders set the weights \\(x_1\\) and \\(x_2\\). The purple arrow is \\(x_1\\mathbf{a}_1\\), the orange arrow \\(x_2\\mathbf{a}_2\\) is attached to its tip, and the dark arrow from the origin is their sum \\(A\\mathbf{x}\\). The faint arrows show the unscaled columns.</p>',
        mount: mountColExplore
      },
      {
        kind: 'exercise',
        title: 'Reaching a target with columns',
        html: '<p>The columns are \\(\\mathbf{a}_1 = \\begin{pmatrix}2\\\\1\\end{pmatrix}\\) and \\(\\mathbf{a}_2 = \\begin{pmatrix}-1\\\\1\\end{pmatrix}\\). Set the weights \\(x_1\\) and \\(x_2\\) so that the combination \\(x_1\\mathbf{a}_1 + x_2\\mathbf{a}_2\\) ends on the target \\(\\mathbf{b} = \\begin{pmatrix}1\\\\5\\end{pmatrix}\\).</p>',
        hint: 'The second coordinates require x₁ + x₂ = 5 and the first require 2x₁ − x₂ = 1. Adding the two equations gives 3x₁ = 6.',
        mount: mountColTarget
      },
      {
        kind: 'exercise',
        title: 'Input from output',
        html: '<p>Drag the orange input \\(\\mathbf{x}\\) until the purple output \\(A\\mathbf{x}\\) lands on the target \\(\\mathbf{b}\\). The input snaps to whole numbers, and the answer is checked when the point is released.</p>',
        hint: 'Row 1 requires x₁ − x₂ = 1 and row 2 requires x₁ + x₂ = 3. Adding them gives 2x₁ = 4.',
        mount: mountInputTarget
      },
      {
        kind: 'exercise',
        title: 'Many scores at once',
        html: '<p>The vectors module scored an input \\(\\mathbf{x}\\) with a weighted sum \\(\\mathbf{w}\\cdot\\mathbf{x}\\). To compute several scores at once, stack one weight vector per score as the rows of a matrix \\(W\\). Then \\(\\mathbf{z} = W\\mathbf{x}\\) lists all the scores: entry \\(i\\) of \\(\\mathbf{z}\\) is the dot product of row \\(i\\) with \\(\\mathbf{x}\\). This product appears in almost every model later in the course.</p>' +
          '<p>Suppose \\(W\\) has 3 rows and 4 columns. Which statement about the sizes of \\(\\mathbf{x}\\) and \\(\\mathbf{z}\\) is correct?</p>',
        hint: 'A dot product pairs each entry of a row with one entry of x, and every row yields one output number.',
        mount: mountLayer
      },
      {
        kind: 'exercise',
        title: 'A matrix with three rows',
        html: '<p>A matrix need not be square. This matrix has 3 rows and 2 columns, so it takes a vector with 2 entries and returns a vector with 3 entries. Drag the correct value into each entry of the result. Four of the tiles are not used.</p>',
        hint: 'First entry: 1·2 + 2·3. Second entry: 0·2 + (−1)·3. Third entry: 3·2 + 1·3.',
        mount: mountFinal
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li><strong>Row picture.</strong> Entry \\(i\\) of \\(A\\mathbf{x}\\) is the dot product of row \\(i\\) of \\(A\\) with \\(\\mathbf{x}\\).</li>' +
          '<li><strong>Column picture.</strong> \\(A\\mathbf{x} = x_1\\mathbf{a}_1 + x_2\\mathbf{a}_2 + \\dots\\) is a linear combination of the columns of \\(A\\), weighted by the entries of \\(\\mathbf{x}\\).</li>' +
          '<li><strong>Shapes.</strong> A matrix with \\(m\\) rows and \\(n\\) columns takes a vector with \\(n\\) entries and returns one with \\(m\\) entries. Stacking weight vectors as rows computes many scores \\(\\mathbf{z} = W\\mathbf{x}\\) at once.</li>' +
          '</ul><p>The next session applies the same rule column by column to multiply two matrices.</p>'
      }
    ]
  });
})();
