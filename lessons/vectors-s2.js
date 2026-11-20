(function () {
  'use strict';
  var M4 = window.M4;
  if (!M4 || !M4.lesson) { return; }
  var C = M4.colors || {};
  var BLUE = C.blue || '#2f6bff', GREEN = C.green || '#16b56b', ORANGE = C.orange || '#ff8a1f',
    PURPLE = C.purple || '#7a5cff', PINK = C.pink || '#ef4b8b', RED = C.red || '#f0473e',
    INK = C.ink || '#1d1d1f', MUTED = C.muted || '#6b6f76', LINE = C.line || '#e6e4dd';

  function injectStyle() {
    if (document.getElementById('vectors-s2-style')) { return; }
    var s = document.createElement('style');
    s.id = 'vectors-s2-style';
    s.textContent =
      '.vectors-s2-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;}' +
      '.vectors-s2-wrap svg{max-width:100%;}' +
      '.vectors-s2-ok{background:#e7f8ef !important;color:#0c7a47 !important;border-color:#16b56b !important;}' +
      '.vectors-s2-bins{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;width:100%;}' +
      '@media(max-width:620px){.vectors-s2-bins{grid-template-columns:1fr;}}' +
      '.vectors-s2-bin{display:flex;flex-direction:column;align-items:center;gap:8px;}' +
      '.vectors-s2-binlabel{font-weight:700;font-size:16px;}' +
      '.vectors-s2-slot{min-height:92px;width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:8px;}' +
      '.vectors-s2-token{padding:10px 14px;font-size:16px;text-align:center;line-height:1.7;touch-action:none;}' +
      '.vectors-s2-chart{width:100%;max-width:520px;height:auto;display:block;}';
    document.head.appendChild(s);
  }

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function fmt(v, d) {
    var s = (Math.round(v * Math.pow(10, d == null ? 1 : d)) / Math.pow(10, d == null ? 1 : d));
    if (Object.is(s, -0)) { s = 0; }
    return s.toFixed(d == null ? 1 : d).replace('-', '−');
  }
  function wrap(el) {
    injectStyle();
    el.textContent = '';
    return M4.el('div', { class: 'vectors-s2-wrap' }, el);
  }
  function readout(parent, text) {
    return M4.el('div', { class: 'm4-readout', text: text || '' }, parent);
  }
  // place a label just beyond the tip of a vector
  function tipPos(v, off) {
    var l = len(v);
    if (l < 1e-9) { return [off, off]; }
    return [v[0] + v[0] / l * off, v[1] + v[1] / l * off];
  }
  function setOk(el, ok) {
    if (ok) { el.classList.add('vectors-s2-ok'); } else { el.classList.remove('vectors-s2-ok'); }
  }

  M4.lesson({
    id: 'vectors-s2',
    module: 'vectors',
    title: 'The dot product',
    summary: 'One number that measures how strongly two vectors point in the same direction.',
    minutes: 10,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>The dot product takes two vectors and returns a single number.</p><p>In this lesson you will compute it from components, read it geometrically as a projection, use it to find the angle between two vectors, and recognise when two vectors are orthogonal (perpendicular).</p>' +
          '<p>The same operation is the basic building block of linear models, neural network layers and similarity search.</p>'
      },
      {
        kind: 'text',
        title: 'Definition from components',
        html: '<p>Let \\(\\mathbf{a} = (a_1, a_2)\\) and \\(\\mathbf{b} = (b_1, b_2)\\) be two vectors in the plane. Their dot product is the sum of the products of matching components:</p>' +
          '\\[ \\mathbf{a} \\cdot \\mathbf{b} = a_1 b_1 + a_2 b_2 . \\]' +
          '<p>The result is a number, not a vector. For example, \\((1, 2) \\cdot (4, -1) = 1 \\cdot 4 + 2 \\cdot (-1) = 2\\). The order does not matter: \\(\\mathbf{a} \\cdot \\mathbf{b} = \\mathbf{b} \\cdot \\mathbf{a}\\).</p>'
      },
      {
        kind: 'exercise',
        title: 'Dot product practice',
        html: '<p>Let \\(\\mathbf{a} = (3, 1)\\) and \\(\\mathbf{b} = (2, 4)\\). Compute \\(\\mathbf{a} \\cdot \\mathbf{b}\\).</p>',
        hint: 'Multiply the first components, multiply the second components, then add: \\(3 \\cdot 2 + 1 \\cdot 4\\).',
        mount: function (el, ctx) {
          var w = wrap(el);
          M4.numberInput(w, {
            answer: 10, tolerance: 0.01, placeholder: '?', label: 'a · b =',
            onCorrect: function () {
              ctx.note('Correct: \\(3 \\cdot 2 + 1 \\cdot 4 = 10\\).');
              ctx.solved();
            },
            onWrong: function (v) {
              var msg = 'Not yet. Add the two products 3 · 2 and 1 · 4.';
              if (Math.abs(v - 24) < 0.01) { msg = 'That is the product of all four numbers. The two component products are added, not multiplied.'; }
              else if (Math.abs(v - 14) < 0.01) { msg = 'That pairs the components crosswise. Pair first with first and second with second.'; }
              ctx.wrong(msg);
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'The dot product as a projection',
        html: '<p>Drop a perpendicular from the tip of \\(\\mathbf{b}\\) onto the line through \\(\\mathbf{a}\\). The orange segment is the projection (the shadow) of \\(\\mathbf{b}\\) on \\(\\mathbf{a}\\). Its signed length is positive when it points along \\(\\mathbf{a}\\) and negative when it points against it.</p>' +
          '<p>The dot product equals this signed length multiplied by the length \\(|\\mathbf{a}|\\) of \\(\\mathbf{a}\\). Drag both tips and compare the values below.</p>',
        mount: function (el) {
          var w = wrap(el);
          var p = M4.plane(w, { xmin: -6, xmax: 6, ymin: -6, ymax: 6 });
          var a = [4, 1], b = [2, 3];
          var guide = p.line(0, 0, 0, 0, { stroke: LINE, width: 2, dash: '6 6' });
          var drop = p.line(0, 0, 0, 0, { stroke: MUTED, width: 2, dash: '5 5' });
          var shadow = p.line(0, 0, 0, 0, { stroke: ORANGE, width: 9 });
          var aA = p.arrow(0, 0, a[0], a[1], { stroke: BLUE, width: 4 });
          var bA = p.arrow(0, 0, b[0], b[1], { stroke: PINK, width: 4 });
          var aT = p.text(0, 0, 'a', { fill: BLUE, size: 20, weight: 700 });
          var bT = p.text(0, 0, 'b', { fill: PINK, size: 20, weight: 700 });
          var row = M4.el('div', { class: 'm4-row' }, w);
          var r1 = readout(row), r2 = readout(row), r3 = readout(row);
          M4.el('div', { class: 'm4-note', text: 'signed shadow length × |a| = a · b' }, w);
          function update() {
            var la = len(a), d = dot(a, b);
            aA.set(0, 0, a[0], a[1]); bA.set(0, 0, b[0], b[1]);
            var ta = tipPos(a, 0.75), tb = tipPos(b, 0.75);
            aT.set(ta[0], ta[1], 'a'); bT.set(tb[0], tb[1], 'b');
            if (la > 1e-6) {
              var k = d / (la * la), f = [k * a[0], k * a[1]];
              var u = [a[0] / la * 9, a[1] / la * 9];
              guide.set(-u[0], -u[1], u[0], u[1]);
              shadow.set(0, 0, f[0], f[1]);
              drop.set(b[0], b[1], f[0], f[1]);
              r2.textContent = 'shadow = ' + fmt(d / la, 2);
            } else {
              guide.set(0, 0, 0, 0); shadow.set(0, 0, 0, 0); drop.set(0, 0, 0, 0);
              r2.textContent = 'shadow undefined';
            }
            r1.textContent = '|a| = ' + fmt(la, 2);
            r3.textContent = 'a · b = ' + fmt(d, 1);
            setOk(r3, Math.abs(d) < 0.01 && la > 0);
          }
          p.handle(a[0], a[1], { color: BLUE, snap: 0.5, onDrag: function (x, y) { a = [x, y]; update(); } });
          p.handle(b[0], b[1], { color: PINK, snap: 0.5, onDrag: function (x, y) { b = [x, y]; update(); } });
          update();
        }
      },
      {
        kind: 'exercise',
        title: 'A target dot product',
        html: '<p>The vector \\(\\mathbf{a} = (3, 1)\\) is fixed. Drag the tip of \\(\\mathbf{b}\\) until \\(\\mathbf{a} \\cdot \\mathbf{b} = 6\\). The tip snaps to half-integer coordinates.</p>',
        hint: 'With \\(\\mathbf{b} = (b_1, b_2)\\) the condition is \\(3 b_1 + b_2 = 6\\). One solution is \\(\\mathbf{b} = (2, 0)\\). Another is \\((1, 3)\\).',
        mount: function (el, ctx) {
          var w = wrap(el);
          var p = M4.plane(w, { xmin: -5, xmax: 5, ymin: -5, ymax: 5 });
          var a = [3, 1], b = [-2, 2], done = false;
          var sol = p.line(1 / 3, 5, 11 / 3, -5, { stroke: GREEN, width: 3, dash: '8 6' });
          sol.el.style.opacity = '0';
          sol.el.style.transition = 'opacity .5s';
          p.arrow(0, 0, a[0], a[1], { stroke: BLUE, width: 4 });
          var ta = tipPos(a, 0.6);
          p.text(ta[0], ta[1], 'a', { fill: BLUE, size: 20, weight: 700 });
          var bA = p.arrow(0, 0, b[0], b[1], { stroke: PINK, width: 4 });
          var bT = p.text(0, 0, 'b', { fill: PINK, size: 20, weight: 700 });
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rb = readout(row), rd = readout(row);
          M4.el('div', { class: 'm4-chip', text: 'target: a · b = 6' }, row);
          function update() {
            bA.set(0, 0, b[0], b[1]);
            var tb = tipPos(b, 0.7);
            bT.set(tb[0], tb[1], 'b');
            var d = dot(a, b);
            rb.textContent = 'b = (' + fmt(b[0]) + ', ' + fmt(b[1]) + ')';
            rd.textContent = 'a · b = ' + fmt(d);
            setOk(rd, Math.abs(d - 6) < 0.01);
          }
          function check() {
            var d = dot(a, b);
            if (Math.abs(d - 6) < 0.01) {
              if (!done) {
                done = true;
                sol.el.style.opacity = '0.8';
                ctx.note('Correct. Every \\(\\mathbf{b}\\) whose tip lies on the green line has the same shadow on \\(\\mathbf{a}\\), and therefore the same dot product 6.');
                ctx.solved();
              }
            } else if (!done) {
              ctx.note(d < 6
                ? 'The value ' + fmt(d) + ' is too small. Move the tip further in the direction of \\(\\mathbf{a}\\).'
                : 'The value ' + fmt(d) + ' is too large. Move the tip back against the direction of \\(\\mathbf{a}\\).');
            }
          }
          p.handle(b[0], b[1], {
            color: PINK, snap: 0.5,
            onDrag: function (x, y) { b = [x, y]; update(); },
            onEnd: function (x, y) { if (typeof x === 'number') { b = [x, y]; } update(); check(); }
          });
          update();
        }
      },
      {
        kind: 'explore',
        title: 'The angle formula',
        html: '<p>Let \\(\\theta\\) be the angle between \\(\\mathbf{a}\\) and \\(\\mathbf{b}\\). The shadow of \\(\\mathbf{b}\\) on \\(\\mathbf{a}\\) has signed length \\(|\\mathbf{b}| \\cos\\theta\\), which gives the geometric form</p>' +
          '\\[ \\mathbf{a} \\cdot \\mathbf{b} = |\\mathbf{a}|\\,|\\mathbf{b}| \\cos\\theta . \\]' +
          '<p>Here both vectors have length 3. Rotate \\(\\mathbf{b}\\) and observe that the dot product is largest when the vectors align, zero at a right angle, and most negative when they point in opposite directions.</p>',
        mount: function (el, ctx) {
          var w = wrap(el);
          var p = M4.plane(w, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 440, height: 440 });
          var arc = p.path([[0, 0]], { stroke: ORANGE, width: 3 });
          p.arrow(0, 0, 3, 0, { stroke: BLUE, width: 4 });
          p.text(3.5, 0.35, 'a', { fill: BLUE, size: 20, weight: 700 });
          var bA = p.arrow(0, 0, 0, 3, { stroke: PINK, width: 4 });
          var bT = p.text(0, 3.5, 'b', { fill: PINK, size: 20, weight: 700 });
          var row = M4.el('div', { class: 'm4-row' }, w);
          var r1 = readout(row), r2 = readout(row), r3 = readout(row);
          // chart of 9 cos(theta)
          var W = 520, H = 200, X0 = 44, X1 = 500, YM = 96, AMP = 70;
          var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'vectors-s2-chart' }, w);
          M4.svg('line', { x1: X0, y1: YM, x2: X1, y2: YM, stroke: MUTED, 'stroke-width': 1.5 }, svg);
          M4.svg('line', { x1: X0, y1: YM - AMP - 8, x2: X0, y2: YM + AMP + 8, stroke: MUTED, 'stroke-width': 1.5 }, svg);
          var k, pts = '';
          for (k = 0; k <= 360; k += 4) {
            pts += (k ? ' L' : 'M') + (X0 + (X1 - X0) * k / 360).toFixed(1) + ' ' + (YM - AMP * Math.cos(k * Math.PI / 180)).toFixed(1);
          }
          M4.svg('path', { d: pts, fill: 'none', stroke: PURPLE, 'stroke-width': 3 }, svg);
          [0, 90, 180, 270, 360].forEach(function (deg) {
            var x = X0 + (X1 - X0) * deg / 360;
            M4.svg('line', { x1: x, y1: YM - 5, x2: x, y2: YM + 5, stroke: MUTED, 'stroke-width': 1.5 }, svg);
            var t = M4.svg('text', { x: x, y: H - 6, 'text-anchor': 'middle', 'font-size': 15, fill: MUTED }, svg);
            t.textContent = deg + '°';
          });
          var l9 = M4.svg('text', { x: X0 - 8, y: YM - AMP + 5, 'text-anchor': 'end', 'font-size': 15, fill: MUTED }, svg); l9.textContent = '9';
          var lm = M4.svg('text', { x: X0 - 8, y: YM + AMP + 5, 'text-anchor': 'end', 'font-size': 15, fill: MUTED }, svg); lm.textContent = '−9';
          var l0 = M4.svg('text', { x: X0 - 8, y: YM + 5, 'text-anchor': 'end', 'font-size': 15, fill: MUTED }, svg); l0.textContent = '0';
          var stem = M4.svg('line', { x1: 0, y1: YM, x2: 0, y2: YM, stroke: ORANGE, 'stroke-width': 3 }, svg);
          var dotEl = M4.svg('circle', { r: 8, cx: 0, cy: 0, fill: ORANGE, stroke: '#fff', 'stroke-width': 2 }, svg);
          var theta = 60, raf = 0, playing = false, last = 0;
          function update() {
            var t = theta * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
            if (Math.abs(c) < 1e-9) { c = 0; }
            bA.set(0, 0, 3 * c, 3 * s);
            bT.set(3.55 * Math.cos(t), 3.55 * Math.sin(t), 'b');
            var ap = [], i, n = Math.max(2, Math.ceil(theta / 5));
            for (i = 0; i <= n; i++) { var u = t * i / n; ap.push([0.9 * Math.cos(u), 0.9 * Math.sin(u)]); }
            arc.set(ap);
            r1.textContent = 'θ = ' + Math.round(theta) + '°';
            r2.textContent = 'cos θ = ' + fmt(c, 2);
            r3.textContent = 'a · b = ' + fmt(9 * c, 2);
            setOk(r3, c === 0);
            var x = X0 + (X1 - X0) * theta / 360, y = YM - AMP * c;
            dotEl.setAttribute('cx', x); dotEl.setAttribute('cy', y);
            stem.setAttribute('x1', x); stem.setAttribute('x2', x); stem.setAttribute('y2', y);
            var col = c > 1e-9 ? GREEN : (c < -1e-9 ? RED : INK);
            dotEl.setAttribute('fill', col); stem.setAttribute('stroke', col);
          }
          var sl = M4.slider(w, {
            min: 0, max: 360, step: 1, value: theta, label: 'angle θ',
            format: function (v) { return Math.round(v) + '°'; },
            onInput: function (v) { theta = +v; update(); }
          });
          var btn = M4.button(w, 'Animate', function () {
            playing = !playing;
            btn.textContent = playing ? 'Pause' : 'Animate';
            if (playing) { last = 0; raf = requestAnimationFrame(tick); } else { cancelAnimationFrame(raf); }
          });
          function tick(ts) {
            if (!playing) { return; }
            if (last) { theta = (theta + (ts - last) * 0.05) % 360; }
            last = ts;
            if (sl && sl.set) { sl.set(Math.round(theta)); }
            update();
            raf = requestAnimationFrame(tick);
          }
          ctx.onCleanup(function () { playing = false; cancelAnimationFrame(raf); });
          update();
        }
      },
      {
        kind: 'exercise',
        title: 'Orthogonal vectors',
        html: '<p>Two non-zero vectors are called orthogonal when the angle between them is \\(90^\\circ\\). Since \\(\\cos 90^\\circ = 0\\), this happens exactly when their dot product is zero.</p>' +
          '<p>The vector \\(\\mathbf{a} = (2, 3)\\) is fixed. Drag \\(\\mathbf{b}\\) to a non-zero vector that is orthogonal to \\(\\mathbf{a}\\).</p>',
        hint: 'Solve \\(2 b_1 + 3 b_2 = 0\\). Swapping the components of \\(\\mathbf{a}\\) and negating one of them works: \\((3, -2)\\) or \\((-3, 2)\\).',
        mount: function (el, ctx) {
          var w = wrap(el);
          var p = M4.plane(w, { xmin: -5, xmax: 5, ymin: -5, ymax: 5 });
          var a = [2, 3], b = [3, 1], done = false;
          var corner = p.path([[0, 0]], { stroke: GREEN, width: 3 });
          corner.el.style.opacity = '0';
          p.arrow(0, 0, a[0], a[1], { stroke: BLUE, width: 4 });
          var ta = tipPos(a, 0.6);
          p.text(ta[0], ta[1], 'a', { fill: BLUE, size: 20, weight: 700 });
          var bA = p.arrow(0, 0, b[0], b[1], { stroke: PINK, width: 4 });
          var bT = p.text(0, 0, 'b', { fill: PINK, size: 20, weight: 700 });
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rd = readout(row), rt = readout(row);
          function angle() {
            var lb = len(b);
            if (lb < 1e-9) { return null; }
            return Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * lb)))) * 180 / Math.PI;
          }
          function update() {
            bA.set(0, 0, b[0], b[1]);
            var tb = tipPos(b, 0.7);
            bT.set(tb[0], tb[1], 'b');
            var d = dot(a, b), th = angle();
            rd.textContent = 'a · b = ' + fmt(d);
            rt.textContent = th == null ? 'θ undefined' : 'θ = ' + fmt(th, 0) + '°';
            var ok = Math.abs(d) < 0.01 && len(b) >= 0.9;
            setOk(rd, ok); setOk(rt, ok);
            if (ok) {
              var la = len(a), lb = len(b), u = [a[0] / la * 0.55, a[1] / la * 0.55], v = [b[0] / lb * 0.55, b[1] / lb * 0.55];
              corner.set([u, [u[0] + v[0], u[1] + v[1]], v]);
              corner.el.style.opacity = '1';
            } else { corner.el.style.opacity = '0'; }
          }
          function check() {
            var d = dot(a, b), lb = len(b);
            if (Math.abs(d) < 0.01 && lb >= 0.9) {
              if (!done) {
                done = true;
                ctx.note('Correct: \\(2 \\cdot ' + (b[0] < 0 ? '(' + b[0] + ')' : b[0]) + ' + 3 \\cdot ' + (b[1] < 0 ? '(' + b[1] + ')' : b[1]) + ' = 0\\), so the angle is \\(90^\\circ\\).');
                ctx.solved();
              }
            } else if (!done) {
              if (lb < 0.9) { ctx.note('The zero vector has dot product 0 with every vector but has no direction. Choose a longer \\(\\mathbf{b}\\).'); }
              else if (d > 0) { ctx.note('The dot product is positive, so the angle is below \\(90^\\circ\\). Rotate \\(\\mathbf{b}\\) further away from \\(\\mathbf{a}\\).'); }
              else { ctx.note('The dot product is negative, so the angle is above \\(90^\\circ\\). Rotate \\(\\mathbf{b}\\) back towards \\(\\mathbf{a}\\).'); }
            }
          }
          p.handle(b[0], b[1], {
            color: PINK, snap: 0.5,
            onDrag: function (x, y) { b = [x, y]; update(); },
            onEnd: function (x, y) { if (typeof x === 'number') { b = [x, y]; } update(); check(); }
          });
          update();
        }
      },
      {
        kind: 'exercise',
        title: 'Projection practice',
        html: '<p>Let \\(\\mathbf{a} = (4, 2)\\) and \\(\\mathbf{b} = (1, 3)\\). The orange point is \\(t\\,\\mathbf{a}\\) for a number \\(t\\). It is the projection of \\(\\mathbf{b}\\) onto \\(\\mathbf{a}\\) when the remainder \\(\\mathbf{b} - t\\,\\mathbf{a}\\) (dashed) is orthogonal to \\(\\mathbf{a}\\).</p>' +
          '<p>Move the slider until that condition holds, then release.</p>',
        hint: 'Setting \\((\\mathbf{b} - t\\,\\mathbf{a}) \\cdot \\mathbf{a} = 0\\) gives \\(t = \\dfrac{\\mathbf{a} \\cdot \\mathbf{b}}{\\mathbf{a} \\cdot \\mathbf{a}} = \\dfrac{10}{20}\\).',
        mount: function (el, ctx) {
          var w = wrap(el);
          var p = M4.plane(w, { xmin: -1, xmax: 6, ymin: -1, ymax: 5, width: 560, height: 480 });
          var a = [4, 2], b = [1, 3], t = 0.1, done = false, hasChange = true;
          p.line(-1, -0.5, 6, 3, { stroke: LINE, width: 2, dash: '6 6' });
          var corner = p.path([[0, 0]], { stroke: GREEN, width: 3 });
          corner.el.style.opacity = '0';
          var rem = p.line(0, 0, 0, 0, { stroke: MUTED, width: 3, dash: '7 6' });
          var sh = p.line(0, 0, 0, 0, { stroke: ORANGE, width: 9 });
          p.arrow(0, 0, a[0], a[1], { stroke: BLUE, width: 4 });
          p.text(4.45, 1.75, 'a', { fill: BLUE, size: 20, weight: 700 });
          p.arrow(0, 0, b[0], b[1], { stroke: PINK, width: 4 });
          p.text(0.75, 3.4, 'b', { fill: PINK, size: 20, weight: 700 });
          var pt = p.point(0, 0, { r: 9, fill: ORANGE });
          var pl = p.text(0, 0, 't a', { fill: ORANGE, size: 18, weight: 700 });
          var row = M4.el('div', { class: 'm4-row' }, w);
          var r1 = readout(row), r2 = readout(row);
          function update() {
            var f = [t * a[0], t * a[1]], r = [b[0] - f[0], b[1] - f[1]], d = dot(r, a);
            if (Math.abs(d) < 1e-9) { d = 0; }
            pt.set(f[0], f[1]); sh.set(0, 0, f[0], f[1]); rem.set(f[0], f[1], b[0], b[1]);
            pl.set(f[0] + 0.3, f[1] - 0.5, 't a');
            r1.textContent = 't a = (' + fmt(f[0]) + ', ' + fmt(f[1]) + ')';
            r2.textContent = '(b − t a) · a = ' + fmt(d);
            var ok = d === 0;
            setOk(r2, ok);
            if (ok) {
              var u = [a[0] / len(a) * 0.4, a[1] / len(a) * 0.4], v = [r[0] / len(r) * 0.4, r[1] / len(r) * 0.4];
              corner.set([[f[0] + u[0], f[1] + u[1]], [f[0] + u[0] + v[0], f[1] + u[1] + v[1]], [f[0] + v[0], f[1] + v[1]]]);
              corner.el.style.opacity = '1';
            } else { corner.el.style.opacity = '0'; }
          }
          function check() {
            if (done) { return; }
            if (Math.abs(t - 0.5) < 0.001) {
              done = true;
              ctx.note('Correct. The projection of \\(\\mathbf{b}\\) onto \\(\\mathbf{a}\\) is \\(\\tfrac{\\mathbf{a} \\cdot \\mathbf{b}}{\\mathbf{a} \\cdot \\mathbf{a}}\\,\\mathbf{a} = \\tfrac{10}{20}(4, 2) = (2, 1)\\).');
              ctx.solved();
            } else {
              ctx.note(t < 0.5
                ? 'The remainder still leans along \\(\\mathbf{a}\\) (positive dot product). Increase \\(t\\).'
                : 'The remainder now leans against \\(\\mathbf{a}\\) (negative dot product). Decrease \\(t\\).');
            }
          }
          var sl = M4.slider(w, {
            min: 0, max: 1.25, step: 0.05, value: t, label: 't',
            format: function (v) { return (+v).toFixed(2); },
            onInput: function (v) { t = Math.round(+v * 100) / 100; update(); if (!hasChange && Math.abs(t - 0.5) < 0.001) { check(); } }
          });
          hasChange = !!(sl && sl.input);
          if (hasChange) {
            sl.input.addEventListener('change', function () {
              t = Math.round(+sl.input.value * 100) / 100; update(); check();
            });
          }
          update();
        }
      },
      {
        kind: 'exercise',
        title: 'Sign of the dot product',
        html: '<p>The sign of the dot product classifies the angle \\(\\theta\\) between two non-zero vectors: positive for an acute angle (\\(\\theta < 90^\\circ\\)), zero for a right angle, negative for an obtuse angle (\\(\\theta > 90^\\circ\\)).</p>' +
          '<p>Drag each pair of vectors into the matching box.</p>',
        hint: 'Compute each dot product from components. For example, \\((2, -1) \\cdot (1, 2) = 2 - 2\\).',
        mount: function (el, ctx) {
          var w = wrap(el);
          var pairs = [
            { key: 'zero', a: '(2,\\,-1)', b: '(1,\\,2)', why: '\\(2 \\cdot 1 + (-1) \\cdot 2 = 0\\)' },
            { key: 'neg', a: '(3,\\,1)', b: '(-2,\\,1)', why: '\\(3 \\cdot (-2) + 1 \\cdot 1 = -5\\)' },
            { key: 'pos', a: '(2,\\,1)', b: '(1,\\,3)', why: '\\(2 \\cdot 1 + 1 \\cdot 3 = 5\\)' }
          ];
          var bins = [
            { key: 'pos', label: 'acute', color: GREEN },
            { key: 'zero', label: 'right angle', color: BLUE },
            { key: 'neg', label: 'obtuse', color: RED }
          ];
          var tray = M4.el('div', { class: 'm4-row' }, w);
          var tokens = pairs.map(function (pr) {
            var t = M4.el('div', {
              class: 'm4-token vectors-s2-token',
              html: M4.tex('\\mathbf{a} = ' + pr.a) + '<br>' + M4.tex('\\mathbf{b} = ' + pr.b)
            }, tray);
            t.setAttribute('data-key', pr.key);
            return t;
          });
          var grid = M4.el('div', { class: 'vectors-s2-bins' }, w);
          var slots = bins.map(function (bn) {
            var col = M4.el('div', { class: 'vectors-s2-bin' }, grid);
            M4.el('div', { class: 'vectors-s2-binlabel', style: 'color:' + bn.color, text: bn.label }, col);
            var s = M4.el('div', { class: 'm4-slot vectors-s2-slot' }, col);
            s.setAttribute('data-key', bn.key);
            return s;
          });
          var placed = 0;
          M4.dragDrop({
            tokens: tokens, slots: slots,
            onDrop: function (tok, slot) {
              var k = tok.getAttribute('data-key');
              if (tok.getAttribute('data-done')) { return; }
              var pr = pairs.filter(function (q) { return q.key === k; })[0];
              if (slot.getAttribute('data-key') === k) {
                tok.setAttribute('data-done', '1');
                slot.appendChild(tok);
                slot.classList.add('filled');
                tok.classList.add('m4-pop');
                tok.style.cursor = 'default';
                placed += 1;
                if (placed === 3) {
                  ctx.note('All three pairs are placed correctly. The sign alone was enough. No angle had to be computed.');
                  ctx.solved();
                } else {
                  ctx.note('Correct: ' + pr.why + '.');
                }
              } else {
                ctx.wrong('That box does not match the sign of this dot product. Compute it from the components and choose again.');
              }
            },
            onMiss: function () { }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Dot products in machine learning',
        html: '<p>A linear model scores an input vector \\(\\mathbf{x}\\) with a weight vector \\(\\mathbf{w}\\) by computing \\(\\mathbf{w} \\cdot \\mathbf{x}\\). Every neuron in a neural network starts with this operation. Search systems use the same idea: texts are mapped to vectors (embeddings), and a document is ranked by the dot product of its vector with the query vector.</p>' +
          '<p>The query is \\(\\mathbf{q} = (2, 1)\\). Which document vector receives the highest score \\(\\mathbf{q} \\cdot \\mathbf{d}\\)?</p>',
        hint: 'Compute all three scores: \\(2 \\cdot 1 + 1 \\cdot 3\\), \\(2 \\cdot 3 + 1 \\cdot 0\\) and \\(2 \\cdot (-1) + 1 \\cdot 4\\).',
        mount: function (el, ctx) {
          var w = wrap(el);
          var p = M4.plane(w, { xmin: -3, xmax: 5, ymin: -2, ymax: 6, width: 440, height: 440 });
          p.line(-3, -1.5, 5, 2.5, { stroke: LINE, width: 2, dash: '6 6' });
          var docs = [[1, 3, 'd₁', PURPLE], [3, 0, 'd₂', ORANGE], [-1, 4, 'd₃', PINK]];
          docs.forEach(function (d) {
            p.arrow(0, 0, d[0], d[1], { stroke: d[3], width: 4 });
            var tp = tipPos([d[0], d[1]], 0.5);
            p.text(tp[0], tp[1] - 0.1, d[2], { fill: d[3], size: 19, weight: 700 });
          });
          p.arrow(0, 0, 2, 1, { stroke: BLUE, width: 5 });
          p.text(2.45, 1.45, 'q', { fill: BLUE, size: 20, weight: 700 });
          M4.choices(w, {
            options: ['\\(\\mathbf{d}_1 = (1, 3)\\)', '\\(\\mathbf{d}_2 = (3, 0)\\)', '\\(\\mathbf{d}_3 = (-1, 4)\\)'],
            correct: 1,
            onCorrect: function () {
              ctx.note('Correct. The scores are \\(5\\), \\(6\\) and \\(2\\). The vector \\(\\mathbf{d}_2\\) has the longest shadow on \\(\\mathbf{q}\\), although \\(\\mathbf{d}_3\\) is the longest vector.');
              ctx.solved();
            },
            onWrong: function (i) {
              ctx.wrong(i === 0
                ? 'The score of d₁ is 2·1 + 1·3 = 5. Another document scores higher.'
                : 'The score of d₃ is 2·(−1) + 1·4 = 2. Length alone does not decide the score.');
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Combined conditions',
        html: '<p>Let \\(\\mathbf{a} = (1, 2)\\) and \\(\\mathbf{c} = (3, -1)\\). Drag \\(\\mathbf{b}\\) until both conditions hold at the same time:</p>' +
          '\\[ \\mathbf{a} \\cdot \\mathbf{b} = 4 \\qquad \\text{and} \\qquad \\mathbf{c} \\cdot \\mathbf{b} = 5 . \\]' +
          '<p>Each condition fixes the shadow of \\(\\mathbf{b}\\) on one of the two vectors.</p>',
        hint: 'With \\(\\mathbf{b} = (b_1, b_2)\\) the conditions are \\(b_1 + 2 b_2 = 4\\) and \\(3 b_1 - b_2 = 5\\). Satisfy one of them first, then slide \\(\\mathbf{b}\\) perpendicular to that vector, which leaves its dot product unchanged.',
        mount: function (el, ctx) {
          var w = wrap(el);
          var p = M4.plane(w, { xmin: -5, xmax: 5, ymin: -5, ymax: 5 });
          var a = [1, 2], c = [3, -1], b = [-2, -1], done = false;
          var la = p.line(-5, 4.5, 5, -0.5, { stroke: BLUE, width: 3, dash: '8 6' });
          var lc = p.line(0, -5, 10 / 3, 5, { stroke: PURPLE, width: 3, dash: '8 6' });
          [la, lc].forEach(function (l) { l.el.style.opacity = '0'; l.el.style.transition = 'opacity .4s'; });
          p.arrow(0, 0, a[0], a[1], { stroke: BLUE, width: 4 });
          p.text(0.75, 2.65, 'a', { fill: BLUE, size: 20, weight: 700 });
          p.arrow(0, 0, c[0], c[1], { stroke: PURPLE, width: 4 });
          p.text(3.55, -1.3, 'c', { fill: PURPLE, size: 20, weight: 700 });
          var bA = p.arrow(0, 0, b[0], b[1], { stroke: ORANGE, width: 4 });
          var bT = p.text(0, 0, 'b', { fill: ORANGE, size: 20, weight: 700 });
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rb = readout(row), ra = readout(row), rc = readout(row);
          function update() {
            bA.set(0, 0, b[0], b[1]);
            var tb = tipPos(b, 0.7);
            bT.set(tb[0], tb[1], 'b');
            var da = dot(a, b), dc = dot(c, b);
            var oa = Math.abs(da - 4) < 0.01, oc = Math.abs(dc - 5) < 0.01;
            rb.textContent = 'b = (' + fmt(b[0]) + ', ' + fmt(b[1]) + ')';
            ra.textContent = 'a · b = ' + fmt(da) + '  (target 4)';
            rc.textContent = 'c · b = ' + fmt(dc) + '  (target 5)';
            setOk(ra, oa); setOk(rc, oc);
            la.el.style.opacity = oa ? '0.75' : '0';
            lc.el.style.opacity = oc ? '0.75' : '0';
            return [oa, oc];
          }
          function check() {
            var ok = update();
            if (ok[0] && ok[1]) {
              if (!done) {
                done = true;
                ctx.note('Correct: \\(\\mathbf{b} = (2, 1)\\) gives \\(1 \\cdot 2 + 2 \\cdot 1 = 4\\) and \\(3 \\cdot 2 - 1 \\cdot 1 = 5\\). The two dashed lines of constant dot product cross in exactly one point.');
                ctx.solved();
              }
            } else if (!done) {
              if (ok[0]) { ctx.note('The first condition holds. Keep the tip on the blue dashed line, which is perpendicular to \\(\\mathbf{a}\\), and move along it until \\(\\mathbf{c} \\cdot \\mathbf{b} = 5\\).'); }
              else if (ok[1]) { ctx.note('The second condition holds. Keep the tip on the purple dashed line, which is perpendicular to \\(\\mathbf{c}\\), and move along it until \\(\\mathbf{a} \\cdot \\mathbf{b} = 4\\).'); }
              else { ctx.note('Neither condition holds yet. Start by reaching \\(\\mathbf{a} \\cdot \\mathbf{b} = 4\\). A dashed line then shows all positions that keep this value.'); }
            }
          }
          p.handle(b[0], b[1], {
            color: ORANGE, snap: 0.5,
            onDrag: function (x, y) { b = [x, y]; update(); },
            onEnd: function (x, y) { if (typeof x === 'number') { b = [x, y]; } check(); }
          });
          update();
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>The dot product of \\(\\mathbf{a} = (a_1, a_2)\\) and \\(\\mathbf{b} = (b_1, b_2)\\) is the number \\(\\mathbf{a} \\cdot \\mathbf{b} = a_1 b_1 + a_2 b_2\\), and it equals \\(|\\mathbf{a}|\\,|\\mathbf{b}| \\cos\\theta\\), where \\(\\theta\\) is the angle between the vectors.</li>' +
          '<li>Geometrically it is the signed length of the projection of \\(\\mathbf{b}\\) on \\(\\mathbf{a}\\) multiplied by \\(|\\mathbf{a}|\\). The projection itself is the vector \\(\\dfrac{\\mathbf{a} \\cdot \\mathbf{b}}{\\mathbf{a} \\cdot \\mathbf{a}}\\,\\mathbf{a}\\).</li>' +
          '<li>The sign classifies the angle: positive for acute, zero for orthogonal, negative for obtuse. Linear models and neurons compute scores \\(\\mathbf{w} \\cdot \\mathbf{x}\\), and similarity search ranks by dot products of embedding vectors.</li>' +
          '</ul>'
      }
    ]
  });
})();
