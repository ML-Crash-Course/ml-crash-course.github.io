(function () {
  'use strict';

  var C = M4.colors;
  var PRE = 'calculus-s4-';

  function injectStyle() {
    if (document.getElementById(PRE + 'style')) return;
    var s = document.createElement('style');
    s.id = PRE + 'style';
    s.textContent =
      '.' + PRE + 'wrap{max-width:520px;margin:0 auto;}' +
      '.' + PRE + 'pair{max-width:1000px;margin:0 auto;}.' + PRE + 'pair svg{width:100%;height:auto;}.' + PRE + 'pair .' + PRE + 'wrap{max-width:none;}' +
      '.' + PRE + 'row{margin-top:14px;justify-content:center;}' +
      '.' + PRE + 'eq{display:flex;align-items:center;justify-content:center;gap:14px;margin:12px 0;font-size:20px;}' +
      '.' + PRE + 'eq .m4-slot{min-width:150px;min-height:56px;display:flex;align-items:center;justify-content:center;font-size:20px;}' +
      '.' + PRE + 'tokens{margin-top:22px;justify-content:center;min-height:60px;}' +
      '.' + PRE + 'tokens .m4-token{padding:10px 16px;font-size:20px;touch-action:none;}' +
      '.' + PRE + 'done{border-color:#16b56b !important;background:#e9f8f0 !important;}' +
      '.' + PRE + 'inputs{display:flex;flex-direction:column;gap:16px;align-items:center;margin-top:8px;}';
    document.head.appendChild(s);
  }

  // The surface used throughout the session.
  function f(x, y) { return x * x / 4 + y * y / 2; }
  function fx(x) { return x / 2; }
  function fy(y) { return y; }

  function fmt(v, d) {
    var s = v.toFixed(d === undefined ? 2 : d);
    if (parseFloat(s) === 0) s = (0).toFixed(d === undefined ? 2 : d);
    return s.replace('-', '−');
  }

  // Points of the contour f = c (an ellipse with semi-axes 2*sqrt(c) and sqrt(2c)).
  function ellipse(c) {
    c = Math.max(c, 1e-4);
    var a = 2 * Math.sqrt(c), b = Math.sqrt(2 * c), pts = [], i, t;
    for (i = 0; i < 96; i++) {
      t = 2 * Math.PI * i / 96;
      pts.push([a * Math.cos(t), b * Math.sin(t)]);
    }
    return pts;
  }

  function halo(t) {
    t.el.setAttribute('paint-order', 'stroke');
    t.el.setAttribute('stroke', '#ffffff');
    t.el.setAttribute('stroke-width', '5');
    t.el.setAttribute('stroke-linejoin', 'round');
    t.el.style.pointerEvents = 'none';
  }

  // Recolours an arrow whether its element is a single shape or a group of shapes.
  function recolor(node, color) {
    var all = [node].concat(Array.prototype.slice.call(node.querySelectorAll ? node.querySelectorAll('*') : [])), i, n;
    for (i = 0; i < all.length; i++) {
      n = all[i];
      if (n === node || n.hasAttribute('stroke')) n.setAttribute('stroke', color);
      if (n.hasAttribute('fill') && n.getAttribute('fill') !== 'none') n.setAttribute('fill', color);
    }
  }

  // A plane with the contour map of f at levels 1..6.
  function contourPlane(el) {
    injectStyle();
    var wrap = M4.el('div', { class: PRE + 'wrap' }, el);
    var p = M4.plane(wrap, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 520, height: 520 });
    var c, t = 50 * Math.PI / 180;
    for (c = 6; c >= 1; c--) {
      p.path(ellipse(c), { stroke: '#8fd9b4', width: 2, fill: 'rgba(22,181,107,0.05)', closed: true });
    }
    for (c = 1; c <= 6; c++) {
      halo(p.text(2 * Math.sqrt(c) * Math.cos(t), Math.sqrt(2 * c) * Math.sin(t) - 0.12, String(c),
        { fill: '#0e8a50', size: 15, weight: 700 }));
    }
    return { p: p, wrap: wrap };
  }

  function readoutRow(parent, n) {
    var row = M4.el('div', { class: 'm4-row ' + PRE + 'row' }, parent), out = [], i;
    for (i = 0; i < n; i++) out.push(M4.el('div', { class: 'm4-readout' }, row));
    return out;
  }

  // Runs check() when a drag ends, or when the pointer rests for a moment; never twice for the same state.
  function settle(ctx, keyFn, check) {
    var timer = null, last = null;
    function run() {
      var k = keyFn();
      if (k === last) return;
      last = k;
      check();
    }
    ctx.onCleanup(function () { clearTimeout(timer); });
    return {
      drag: function () { clearTimeout(timer); timer = setTimeout(run, 900); },
      end: function () { clearTimeout(timer); run(); }
    };
  }

  var F_TEX = 'f(x,y)=\\tfrac{1}{4}x^2+\\tfrac{1}{2}y^2';

  M4.lesson({
    id: 'calculus-s4',
    module: 'calculus',
    title: 'Partial derivatives and the gradient',
    summary: 'Read functions of two variables as contour maps, differentiate one variable at a time, and assemble the gradient, the direction of steepest ascent.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html:
          '<p>Machine-learning models depend on many inputs at once, so the derivative has to be extended from functions of one input to a function \\(f(x,y)\\) of two variables.</p>' +
          '<p>In this lesson you will read a contour map, compute the partial derivatives \\(\\partial f/\\partial x\\) and \\(\\partial f/\\partial y\\), and combine them into the gradient \\(\\nabla f\\), a vector that is perpendicular to the contours and points uphill.</p>'
      },

      {
        kind: 'explore',
        title: 'Contour maps',
        html:
          '<p>A function \\(f(x,y)\\) assigns a height to every point \\((x,y)\\) of the plane. A <em>contour</em> is the set of points that share one height, as on a hiking map. The map below shows \\(' + F_TEX + '\\) with contours at heights 1 to 6.</p>' +
          '<p>On the left is the surface itself, a bowl. On the right is the same bowl seen from straight above, with every height ring drawn as a line. Drag the black ball on either picture and the other one follows. The bold green ring is the contour through the ball. The rings lie closer together where the bowl is steeper.</p>',
        mount: function (el, ctx) {
          injectStyle();
          var grid = M4.el('div', { class: 'm4-grid2 ' + PRE + 'pair' }, el);
          var left = M4.el('div', {}, grid), right = M4.el('div', {}, grid);
          var s3 = M4.surface3d(left, { f: f, r: 3.5, color: C.green, contours: [1, 2, 3, 4, 5, 6], width: 480, height: 440, scale: 0.4 });
          var svg3 = left.querySelector('svg');
          var ring3 = M4.svg('polyline', { fill: 'none', stroke: C.green, 'stroke-width': 3.5 }, svg3);
          var cp = contourPlane(right), p = cp.p;
          var cur = p.path(ellipse(f(2, 1)), { stroke: C.green, width: 4, closed: true });
          var out = readoutRow(el, 2), pos = { x: 2, y: 1 }, busy = false, ball, h;
          function drawRing() {
            var pts = ellipse(f(pos.x, pos.y)).filter(function (q) { return Math.abs(q[0]) <= 3.5 && Math.abs(q[1]) <= 3.5; });
            ring3.setAttribute('points', pts.length > 90 ? pts.concat([pts[0]]).map(function (q) { var r = s3.floor(q[0], q[1]); return r[0] + ',' + r[1]; }).join(' ') : '');
            svg3.firstChild.appendChild(ring3);
          }
          function update(x, y, from) {
            if (busy) return;
            busy = true;
            pos.x = x; pos.y = y;
            cur.set(ellipse(f(x, y)));
            if (from !== 'ball' && ball) ball.set(Math.max(-3.5, Math.min(3.5, x)), Math.max(-3.5, Math.min(3.5, y)));
            if (from !== 'map' && h) h.set(x, y);
            drawRing();
            out[0].textContent = '(x, y) = (' + fmt(x, 1) + ', ' + fmt(y, 1) + ')';
            out[1].textContent = 'height f(x, y) = ' + fmt(f(x, y));
            busy = false;
          }
          ball = s3.ball(2, 1, { onMove: function (x, y) { update(x, y, 'ball'); } });
          s3.onRedraw(drawRing);
          h = p.handle(2, 1, { color: C.ink, snap: 0.1, bounds: { xmin: -3.5, xmax: 3.5, ymin: -3.5, ymax: 3.5 }, onDrag: function (x, y) { update(x, y, 'map'); }, onEnd: function (x, y) { if (typeof x === 'number') update(x, y, 'map'); } });
          update(2, 1);
        }
      },

      {
        kind: 'exercise',
        title: 'Points of equal height',
        html:
          '<p>For \\(' + F_TEX + '\\), place the point so that \\(x = 2\\) and \\(f(x,y) = 3\\). The dashed blue line marks \\(x=2\\) and the dashed orange curve marks the contour of height 3.</p>',
        hint: 'With \\(x=2\\) the first term equals \\(\\tfrac14\\cdot 4 = 1\\). The second term \\(\\tfrac12 y^2\\) must supply the remaining 2, so \\(y^2 = 4\\).',
        mount: function (el, ctx) {
          var cp = contourPlane(el), p = cp.p, done = false;
          p.line(2, -5, 2, 5, { stroke: C.blue, width: 2.5, dash: '7 6' });
          var target = p.path(ellipse(3), { stroke: C.orange, width: 3, closed: true });
          target.el.setAttribute('stroke-dasharray', '8 6');
          var out = readoutRow(cp.wrap, 2);
          var pos = { x: -3, y: 0 };
          var ring = p.point(2, 2, { r: 0, fill: C.green });
          function show(x, y) {
            pos.x = x; pos.y = y;
            out[0].textContent = 'x = ' + fmt(x, 1);
            out[1].textContent = 'f(x, y) = ' + fmt(f(x, y));
          }
          var s = settle(ctx, function () { return pos.x + ',' + pos.y; }, function () {
            if (done) return;
            var okx = Math.abs(pos.x - 2) < 0.06, okf = Math.abs(f(pos.x, pos.y) - 3) < 0.13;
            if (okx && okf) {
              done = true;
              target.el.removeAttribute('stroke-dasharray');
              ring.set(pos.x, pos.y);
              ring.el.setAttribute('r', '18');
              ring.el.setAttribute('fill-opacity', '0.25');
              out[1].classList.add(PRE + 'done');
              ctx.note('At \\((2,' + (pos.y > 0 ? '' : '-') + '2)\\): \\(\\tfrac14\\cdot 4+\\tfrac12\\cdot 4 = 3\\). The mirror point with the opposite sign of \\(y\\) lies on the same contour.');
              ctx.solved();
            } else if (!okx) {
              ctx.note('The point has \\(x=' + pos.x.toFixed(1) + '\\). It must lie on the dashed blue line \\(x=2\\).');
            } else {
              ctx.note('On the line \\(x=2\\), but the height here is \\(' + f(pos.x, pos.y).toFixed(2) + '\\), which is ' + (f(pos.x, pos.y) < 3 ? 'below' : 'above') + ' 3. Slide along the line to the orange contour.');
            }
          });
          p.handle(-3, 0, {
            color: C.green, snap: 0.5,
            onDrag: function (x, y) { show(x, y); s.drag(); },
            onEnd: function (x, y) { if (typeof x === 'number') show(x, y); s.end(); }
          });
          show(-3, 0);
        }
      },

      {
        kind: 'text',
        title: 'Partial derivatives',
        html:
          '<p>The <em>partial derivative</em> \\(\\partial f/\\partial x\\) is the rate of change of \\(f\\) when \\(x\\) varies and \\(y\\) is held fixed. It is computed with the ordinary rules of differentiation, treating \\(y\\) as a constant. The partial derivative \\(\\partial f/\\partial y\\) is defined in the same way with the roles exchanged.</p>' +
          '<p>For \\(' + F_TEX + '\\) the term \\(\\tfrac12 y^2\\) is constant with respect to \\(x\\), so</p>' +
          '\\[\\frac{\\partial f}{\\partial x}=\\tfrac12 x,\\qquad \\frac{\\partial f}{\\partial y}=y.\\]'
      },

      {
        kind: 'explore',
        title: 'Slices of a surface',
        html:
          '<p>Fixing \\(y=y_0\\) cuts the surface along a line and leaves a curve in one variable, \\(x\\mapsto f(x,y_0)\\). The partial derivative \\(\\partial f/\\partial x\\) at \\((x_0,y_0)\\) is the slope of the tangent to that curve at \\(x_0\\).</p>' +
          '<p>Change \\(y_0\\) in the \\(x\\)-slice: the curve moves up or down, but its slope at \\(x_0\\) stays \\(\\tfrac12 x_0\\). Then switch to the slice along \\(y\\).</p>',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: PRE + 'wrap' }, el);
          var bar = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-bottom:10px;' }, wrap);
          var p = M4.plane(wrap, { xmin: -5, xmax: 5, ymin: -2, ymax: 8, width: 520, height: 520 });
          var st = { x0: 2, y0: 1, alongX: true };
          var curve = p.fn(function (t) { return f(t, st.y0); }, { stroke: C.green, width: 4 });
          var tan = p.line(0, 0, 1, 1, { stroke: C.orange, width: 4 });
          var pt = p.point(0, 0, { r: 8, fill: C.ink });
          var axis = p.text(4.5, -1.3, 'x', { fill: C.muted, size: 18, weight: 700 });
          var out = readoutRow(wrap, 2);
          var bx, by;
          function update() {
            var t0 = st.alongX ? st.x0 : st.y0;
            var slope = st.alongX ? fx(st.x0) : fy(st.y0);
            var h = f(st.x0, st.y0);
            var d = 1.6 / Math.sqrt(1 + slope * slope);
            curve.set(st.alongX ? function (t) { return f(t, st.y0); } : function (t) { return f(st.x0, t); });
            tan.set(t0 - d, h - slope * d, t0 + d, h + slope * d);
            pt.set(t0, h);
            axis.set(4.5, -1.3, st.alongX ? 'x' : 'y');
            out[0].textContent = st.alongX
              ? 'slice: f(x, ' + fmt(st.y0, 1) + ')'
              : 'slice: f(' + fmt(st.x0, 1) + ', y)';
            out[1].textContent = (st.alongX ? '∂f/∂x = ' : '∂f/∂y = ') + fmt(slope);
            bx.classList.toggle('primary', st.alongX);
            by.classList.toggle('primary', !st.alongX);
          }
          bx = M4.button(bar, 'Slice along x', function () { st.alongX = true; update(); }, { primary: true });
          by = M4.button(bar, 'Slice along y', function () { st.alongX = false; update(); });
          M4.slider(wrap, { min: -4, max: 4, step: 0.1, value: st.x0, label: 'x₀', format: function (v) { return fmt(+v, 1); }, onInput: function (v) { st.x0 = +v; update(); } });
          M4.slider(wrap, { min: -2.5, max: 2.5, step: 0.1, value: st.y0, label: 'y₀', format: function (v) { return fmt(+v, 1); }, onInput: function (v) { st.y0 = +v; update(); } });
          update();
        }
      },

      {
        kind: 'exercise',
        title: 'Partial derivative practice',
        html:
          '<p>Let \\(g(x,y)=x^2y+3y\\). Drag the correct expression into each slot. When differentiating with respect to one variable, the other is treated as a constant.</p>',
        hint: 'With respect to \\(x\\): \\(y\\) is a constant factor of \\(x^2\\), and \\(3y\\) is a constant. With respect to \\(y\\): \\(g = (x^2+3)\\,y\\), a constant times \\(y\\).',
        mount: function (el, ctx) {
          injectStyle();
          var slots = [], tokens = [], filled = 0;
          var rows = [['\\dfrac{\\partial g}{\\partial x}=', 'x'], ['\\dfrac{\\partial g}{\\partial y}=', 'y']];
          rows.forEach(function (r) {
            var row = M4.el('div', { class: PRE + 'eq' }, el);
            M4.el('span', { html: M4.tex(r[0]) }, row);
            var slot = M4.el('div', { class: 'm4-slot' }, row);
            slot.setAttribute('data-want', r[1]);
            slots.push(slot);
          });
          var tray = M4.el('div', { class: 'm4-row ' + PRE + 'tokens' }, el);
          var opts = [
            { t: 'x^2y', is: 'g' },
            { t: 'x^2+3', is: 'y' },
            { t: '2x+3', is: 'n' },
            { t: '2xy', is: 'x' },
            { t: '2xy+3', is: 'm' }
          ];
          opts.forEach(function (o) {
            var tok = M4.el('div', { class: 'm4-token', html: M4.tex(o.t) }, tray);
            tok.setAttribute('data-is', o.is);
            tok.setAttribute('data-tex', o.t);
            tokens.push(tok);
          });
          M4.dragDrop({
            tokens: tokens,
            slots: slots,
            onDrop: function (tok, slot) {
              var want = slot.getAttribute('data-want'), is = tok.getAttribute('data-is');
              if (slot.classList.contains('filled')) { if (tok.parentNode !== tray) tray.appendChild(tok); return; }
              if (is === want) {
                slot.innerHTML = M4.tex(tok.getAttribute('data-tex'));
                slot.classList.add('filled');
                slot.classList.add(PRE + 'done');
                slot.classList.add('m4-pop');
                tok.style.display = 'none';
                tray.appendChild(tok);
                filled++;
                if (filled === 2) {
                  ctx.note('\\(\\partial g/\\partial x = 2xy\\) and \\(\\partial g/\\partial y = x^2+3\\).');
                  ctx.solved();
                } else {
                  ctx.note('Correct. One slot remains.');
                }
                return;
              }
              if (tok.parentNode !== tray) tray.appendChild(tok);
              var msg;
              if (is === 'g') msg = 'That is the first term of g itself, not a derivative.';
              else if (is === 'x' || is === 'y') msg = 'That expression is the partial derivative with respect to the other variable.';
              else if (want === 'x') msg = 'With respect to x, the factor y stays in place and the term 3y is a constant, so it contributes 0.';
              else msg = 'With respect to y, x² is a constant coefficient: the derivative of x²y is x², and that of 3y is 3.';
              ctx.wrong(msg);
            },
            onMiss: function (tok) { if (tok.parentNode !== tray) tray.appendChild(tok); }
          });
        }
      },

      {
        kind: 'exercise',
        title: 'Partial derivatives at a point',
        html:
          '<p>For \\(g(x,y)=x^2y+3y\\) the partial derivatives are \\(\\partial g/\\partial x = 2xy\\) and \\(\\partial g/\\partial y = x^2+3\\). Evaluate both at the point \\((x,y)=(2,1)\\).</p>',
        hint: 'Substitute \\(x=2\\) and \\(y=1\\): \\(2\\cdot 2\\cdot 1\\) for the first, \\(2^2+3\\) for the second.',
        mount: function (el, ctx) {
          injectStyle();
          var box = M4.el('div', { class: PRE + 'inputs' }, el);
          var ok = [false, false];
          function check() {
            if (ok[0] && ok[1]) {
              ctx.note('At \\((2,1)\\): \\(\\partial g/\\partial x = 4\\) and \\(\\partial g/\\partial y = 7\\). A small step in \\(y\\) changes \\(g\\) almost twice as fast as the same step in \\(x\\).');
              ctx.solved();
            } else {
              ctx.note('Correct. Now the other one.');
            }
          }
          M4.numberInput(box, {
            answer: 4, tolerance: 0.01, placeholder: '?', label: '∂g/∂x at (2, 1)',
            onCorrect: function () { ok[0] = true; check(); },
            onWrong: function (v) { ctx.wrong(Math.abs(Number(v) - 7) < 0.01 ? 'That is the value of ∂g/∂y. Use 2xy here.' : 'Substitute x = 2 and y = 1 into 2xy.'); }
          });
          M4.numberInput(box, {
            answer: 7, tolerance: 0.01, placeholder: '?', label: '∂g/∂y at (2, 1)',
            onCorrect: function () { ok[1] = true; check(); },
            onWrong: function (v) { ctx.wrong(Math.abs(Number(v) - 4) < 0.01 ? 'That is the value of ∂g/∂x. Use x² + 3 here.' : 'Substitute x = 2 into x² + 3.'); }
          });
        }
      },

      {
        kind: 'explore',
        title: 'The gradient',
        html:
          '<p>The <em>gradient</em> collects the partial derivatives into one vector, \\(\\nabla f=\\left(\\dfrac{\\partial f}{\\partial x},\\dfrac{\\partial f}{\\partial y}\\right)\\). For \\(' + F_TEX + '\\) it equals \\(\\nabla f=(\\tfrac12 x,\\;y)\\).</p>' +
          '<p>Drag the point. The purple arrow is \\(\\nabla f\\) drawn from the point. The orange line is tangent to the contour. The gradient is always perpendicular to the contour, points toward greater heights, and is longer where the contours are closer together.</p>',
        mount: function (el, ctx) {
          var cp = contourPlane(el), p = cp.p;
          var cur = p.path(ellipse(1), { stroke: C.green, width: 3, closed: true });
          var tan = p.line(0, 0, 0, 0, { stroke: C.orange, width: 4 });
          var corner = p.path([[0, 0], [0, 0], [0, 0]], { stroke: C.ink, width: 2 });
          var arrow = p.arrow(0, 0, 1, 1, { stroke: C.purple, width: 5 });
          var out = readoutRow(cp.wrap, 3);
          function update(x, y) {
            var gx = fx(x), gy = fy(y), n = Math.sqrt(gx * gx + gy * gy);
            cur.set(ellipse(f(x, y)));
            if (n >= 0.03) arrow.set(x, y, x + gx, y + gy);
            arrow.el.style.visibility = n < 0.03 ? 'hidden' : 'visible';
            if (n < 0.03) {
              tan.set(x, y, x, y);
              corner.set([[x, y], [x, y], [x, y]]);
            } else {
              var ux = gx / n, uy = gy / n, tx = -uy, ty = ux, k = 0.32;
              tan.set(x - 1.7 * tx, y - 1.7 * ty, x + 1.7 * tx, y + 1.7 * ty);
              corner.set([[x + k * tx, y + k * ty], [x + k * tx + k * ux, y + k * ty + k * uy], [x + k * ux, y + k * uy]]);
            }
            out[0].textContent = '∇f = (' + fmt(gx) + ', ' + fmt(gy) + ')';
            out[1].textContent = '|∇f| = ' + fmt(n);
            out[2].textContent = 'f = ' + fmt(f(x, y));
          }
          p.handle(2, 1.5, { color: C.green, snap: 0.1, onDrag: update, onEnd: function (x, y) { if (typeof x === 'number') update(x, y); } });
          update(2, 1.5);
        }
      },

      {
        kind: 'exercise',
        title: 'Gradient practice',
        html:
          '<p>For \\(' + F_TEX + '\\), the point \\(P=(-2,1)\\) is marked in black. Drag the tip of the purple arrow so that the arrow, starting at \\(P\\), equals \\(\\nabla f(P)\\) at true length.</p>',
        hint: 'Use \\(\\nabla f=(\\tfrac12 x,\\;y)\\) with \\(x=-2\\), \\(y=1\\). The first component is the horizontal displacement of the tip from \\(P\\), the second the vertical displacement.',
        mount: function (el, ctx) {
          var cp = contourPlane(el), p = cp.p, done = false;
          var P = [-2, 1], G = [-1, 1], tip = { x: 0.5, y: 2.5 };
          p.path(ellipse(f(P[0], P[1])), { stroke: C.green, width: 3, closed: true });
          var arrow = p.arrow(P[0], P[1], tip.x, tip.y, { stroke: C.purple, width: 5 });
          p.point(P[0], P[1], { r: 8, fill: C.ink });
          halo(p.text(P[0] + 0.25, P[1] - 0.5, 'P', { fill: C.ink, size: 18, weight: 700 }));
          var out = readoutRow(cp.wrap, 1);
          function show(x, y) {
            tip.x = x; tip.y = y;
            arrow.set(P[0], P[1], x, y);
            out[0].textContent = 'arrow = (' + fmt(x - P[0], 1) + ', ' + fmt(y - P[1], 1) + ')';
          }
          var s = settle(ctx, function () { return tip.x + ',' + tip.y; }, function () {
            if (done) return;
            var vx = tip.x - P[0], vy = tip.y - P[1];
            var ex = Math.abs(vx - G[0]) < 0.06, ey = Math.abs(vy - G[1]) < 0.06;
            var dot = vx * G[0] + vy * G[1], cross = vx * G[1] - vy * G[0];
            if (ex && ey) {
              done = true;
              recolor(arrow.el, C.green);
              out[0].classList.add(PRE + 'done');
              ctx.note('\\(\\nabla f(-2,1)=(\\tfrac12\\cdot(-2),\\,1)=(-1,1)\\). The arrow crosses the contour through \\(P\\) at a right angle and points away from the minimum at the origin.');
              ctx.solved();
            } else if (Math.abs(cross) < 0.01 && dot > 0) {
              ctx.note('The direction is correct, but the length is not. The components must equal the partial derivatives exactly.');
            } else if (dot < 0) {
              ctx.note('This arrow points toward lower heights. The gradient points uphill, away from the centre of the contours.');
            } else if (!ex && ey) {
              ctx.note('The vertical component is correct. The horizontal component must equal \\(\\partial f/\\partial x=\\tfrac12 x\\) at \\(x=-2\\).');
            } else if (ex && !ey) {
              ctx.note('The horizontal component is correct. The vertical component must equal \\(\\partial f/\\partial y=y\\) at \\(y=1\\).');
            } else {
              ctx.note('Neither component matches yet. Evaluate \\(\\tfrac12 x\\) and \\(y\\) at \\(P=(-2,1)\\).');
            }
          });
          p.handle(tip.x, tip.y, {
            color: C.purple, snap: 0.5,
            onDrag: function (x, y) { show(x, y); s.drag(); },
            onEnd: function (x, y) { if (typeof x === 'number') show(x, y); s.end(); }
          });
          show(tip.x, tip.y);
        }
      },

      {
        kind: 'exercise',
        title: 'Direction of steepest descent',
        html:
          '<p>Moving from a point in a unit direction \\(\\mathbf u\\) changes \\(f\\) at the rate \\(\\nabla f\\cdot\\mathbf u\\). This rate is largest when \\(\\mathbf u\\) points along \\(\\nabla f\\), zero along the contour, and most negative opposite to \\(\\nabla f\\).</p>' +
          '<p>At \\(P=(2,1)\\) on the map of \\(' + F_TEX + '\\), rotate the blue arrow until the rate of change is as negative as possible, and hold it there.</p>',
        hint: 'The steepest descent direction is perpendicular to the contour through \\(P\\) and points toward lower heights. Here \\(\\nabla f(P)=(1,1)\\), so the rate cannot go below \\(-\\sqrt2\\approx-1.41\\).',
        mount: function (el, ctx) {
          var cp = contourPlane(el), p = cp.p, done = false;
          var P = [2, 1], G = [fx(2), fy(1)], R = 1.6;
          var u = { x: 1, y: 0 }, i, circ = [];
          for (i = 0; i < 72; i++) circ.push([P[0] + R * Math.cos(i * Math.PI / 36), P[1] + R * Math.sin(i * Math.PI / 36)]);
          p.path(ellipse(f(P[0], P[1])), { stroke: C.green, width: 3, closed: true });
          var ring = p.path(circ, { stroke: C.line, width: 2, closed: true });
          ring.el.setAttribute('stroke-dasharray', '4 5');
          var ghost = p.arrow(P[0], P[1], P[0] + G[0], P[1] + G[1], { stroke: C.purple, width: 4 });
          ghost.el.style.visibility = 'hidden';
          var arrow = p.arrow(P[0], P[1], P[0] + R, P[1], { stroke: C.blue, width: 5 });
          p.point(P[0], P[1], { r: 8, fill: C.ink });
          var out = readoutRow(cp.wrap, 2);
          var h;
          function rate() { return G[0] * u.x + G[1] * u.y; }
          function show(x, y) {
            var dx = x - P[0], dy = y - P[1], n = Math.sqrt(dx * dx + dy * dy);
            if (n > 0.15) { u.x = dx / n; u.y = dy / n; }
            arrow.set(P[0], P[1], P[0] + R * u.x, P[1] + R * u.y);
            out[0].textContent = 'u = (' + fmt(u.x) + ', ' + fmt(u.y) + ')';
            out[1].textContent = 'rate ∇f·u = ' + fmt(rate());
          }
          var s = settle(ctx, function () { return u.x.toFixed(3) + ',' + u.y.toFixed(3); }, function () {
            if (done) return;
            var r = rate();
            if (r <= -1.38) {
              done = true;
              ghost.el.style.visibility = 'visible';
              ghost.el.setAttribute('opacity', '0.45');
              out[1].classList.add(PRE + 'done');
              ctx.note('The steepest descent direction is \\(-\\nabla f/\\lVert\\nabla f\\rVert\\approx(-0.71,-0.71)\\), opposite to the gradient (shown faintly in purple). The rate there is \\(-\\lVert\\nabla f\\rVert=-\\sqrt2\\).');
              ctx.solved();
            } else if (r > 0.15) {
              ctx.note('The rate is \\(' + r.toFixed(2) + '\\), which is positive: this direction climbs.');
            } else if (r > -0.15) {
              ctx.note('The rate is close to zero: this direction runs along the contour, so the height barely changes.');
            } else {
              ctx.note('This direction descends at rate \\(' + r.toFixed(2) + '\\), but a steeper descent exists. Aim across the contours, not along them.');
            }
          });
          h = p.handle(P[0] + R, P[1], {
            color: C.blue,
            onDrag: function (x, y) { show(x, y); s.drag(); },
            onEnd: function (x, y) {
              if (typeof x === 'number') show(x, y);
              if (h && h.set) h.set(P[0] + R * u.x, P[1] + R * u.y);
              s.end();
            }
          });
          show(P[0] + R, P[1]);
        }
      },

      {
        kind: 'exercise',
        title: 'One step of gradient descent',
        html:
          '<p>Training a model means choosing weights that make a loss small. Read the map as a loss \\(L(w_1,w_2)=\\tfrac14 w_1^2+\\tfrac12 w_2^2\\), with \\(w_1\\) horizontal and \\(w_2\\) vertical. <em>Gradient descent</em> repeatedly replaces the weight vector \\(\\mathbf w\\) by \\(\\mathbf w-\\eta\\,\\nabla L(\\mathbf w)\\), where the learning rate \\(\\eta\\) sets the step size.</p>' +
          '<p>The current weights are \\(\\mathbf w=(4,-2)\\) and \\(\\eta=0.5\\). Drag the green point to the weights after one update.</p>',
        hint: 'First \\(\\nabla L=(\\tfrac12 w_1,\\;w_2)=(2,-2)\\) at \\((4,-2)\\). Multiply by \\(\\eta=0.5\\) to get \\((1,-1)\\), then subtract this from \\((4,-2)\\).',
        mount: function (el, ctx) {
          var cp = contourPlane(el), p = cp.p, done = false, timers = [];
          var W = [4, -2], T = [3, -1], pos = { x: W[0], y: W[1] };
          ctx.onCleanup(function () { timers.forEach(clearTimeout); });
          var step = p.line(W[0], W[1], W[0], W[1], { stroke: C.green, width: 4 });
          var start = p.point(W[0], W[1], { r: 9, fill: C.ink });
          start.el.style.pointerEvents = 'none';
          halo(p.text(W[0] + 0.1, W[1] - 0.75, 'w', { fill: C.ink, size: 18, weight: 700 }));
          var out = readoutRow(cp.wrap, 2);
          function show(x, y) {
            pos.x = x; pos.y = y;
            step.set(W[0], W[1], x, y);
            out[0].textContent = 'new w = (' + fmt(x, 1) + ', ' + fmt(y, 1) + ')';
            out[1].textContent = 'L = ' + fmt(f(x, y)) + '  (was ' + fmt(f(W[0], W[1])) + ')';
          }
          function trail() {
            var w = [T[0], T[1]], k;
            function next(k) {
              var nw = [w[0] - 0.5 * fx(w[0]), w[1] - 0.5 * fy(w[1])];
              p.line(w[0], w[1], nw[0], nw[1], { stroke: C.green, width: 3 }).el.setAttribute('opacity', '0.6');
              p.point(nw[0], nw[1], { r: 5, fill: C.green }).el.style.pointerEvents = 'none';
              w = nw;
              if (k < 7) timers.push(setTimeout(function () { next(k + 1); }, 260));
            }
            timers.push(setTimeout(function () { next(0); }, 350));
          }
          var s = settle(ctx, function () { return pos.x + ',' + pos.y; }, function () {
            if (done) return;
            var x = pos.x, y = pos.y;
            function at(a, b) { return Math.abs(x - a) < 0.06 && Math.abs(y - b) < 0.06; }
            if (at(W[0], W[1])) return;
            if (at(T[0], T[1])) {
              done = true;
              out[1].classList.add(PRE + 'done');
              ctx.note('\\((4,-2)-0.5\\,(2,-2)=(3,-1)\\). The loss falls from \\(6\\) to \\(2.75\\). Repeating the update traces a path toward the minimum at the origin.');
              trail();
              ctx.solved();
            } else if (at(2, 0)) {
              ctx.note('This is \\(\\mathbf w-\\nabla L\\), a step with \\(\\eta=1\\). With \\(\\eta=0.5\\) the step is half as long.');
            } else if (at(5, -3)) {
              ctx.note('This is \\(\\mathbf w+\\eta\\nabla L\\). Adding the gradient moves uphill. The loss rose to \\(' + f(x, y).toFixed(2) + '\\).');
            } else if (at(6, -4)) {
              ctx.note('This is \\(\\mathbf w+\\nabla L\\). The update subtracts the gradient and scales it by \\(\\eta=0.5\\).');
            } else if (f(x, y) >= f(W[0], W[1])) {
              ctx.note('The loss here is \\(' + f(x, y).toFixed(2) + '\\), not lower than the starting value \\(6\\). The step must go against the gradient \\((2,-2)\\).');
            } else {
              ctx.note('The loss decreased to \\(' + f(x, y).toFixed(2) + '\\), but this is not the gradient descent update. The displacement must equal \\(-\\eta\\nabla L=-0.5\\,(2,-2)\\).');
            }
          });
          p.handle(W[0], W[1], {
            color: C.green, snap: 0.5,
            onDrag: function (x, y) { show(x, y); s.drag(); },
            onEnd: function (x, y) { if (typeof x === 'number') show(x, y); s.end(); }
          });
          show(W[0], W[1]);
        }
      },

      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>A function \\(f(x,y)\\) can be read as a contour map: each contour joins points of equal height, and closely spaced contours indicate a steep surface.</li>' +
          '<li>The partial derivative \\(\\partial f/\\partial x\\) is the ordinary derivative with \\(y\\) held constant, and equals the slope of the slice of the surface along \\(x\\). \\(\\partial f/\\partial y\\) is defined likewise.</li>' +
          '<li>The gradient \\(\\nabla f=(\\partial f/\\partial x,\\;\\partial f/\\partial y)\\) is perpendicular to the contours and points in the direction of steepest ascent. Gradient descent trains models by stepping along \\(-\\nabla L\\).</li>' +
          '</ul>'
      }
    ]
  });
})();
