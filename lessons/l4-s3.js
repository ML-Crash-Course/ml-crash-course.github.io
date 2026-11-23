(function () {
  'use strict';

  var C = (window.M4 && M4.colors) || {};
  var PINK = C.pink || '#ef4b8b';
  var PURPLE = C.purple || '#7a5cff';
  var ORANGE = C.orange || '#ff8a1f';
  var GREEN = C.green || '#16b56b';
  var RED = C.red || '#f0473e';
  var INK = C.ink || '#1d1d1f';
  var MUTED = C.muted || '#6b6f76';
  var LINE = C.line || '#e6e4dd';

  // ---------- styles (injected once) ----------
  function ensureStyle() {
    if (document.getElementById('l4-s3-style')) return;
    var s = document.createElement('style');
    s.id = 'l4-s3-style';
    s.textContent = [
      '.l4-s3-svg{width:100%;height:auto;display:block;touch-action:pan-y;user-select:none;-webkit-user-select:none}',
      '.l4-s3-wrap{display:flex;flex-direction:column;gap:16px;align-items:stretch}',
      '.l4-s3-slotrow{display:flex;justify-content:center;gap:22px;flex-wrap:wrap}',
      '.l4-s3-slotcol{display:flex;flex-direction:column;align-items:center;gap:8px;font-weight:600}',
      '.l4-s3-slot{min-width:92px;min-height:54px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}',
      '.l4-s3-slot.filled{border-style:solid;border-color:' + PINK + ';background:#fff0f6;color:' + INK + '}',
      '.l4-s3-tokrow{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;min-height:60px}',
      '.l4-s3-tok{min-width:72px;padding:12px 16px;text-align:center;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;touch-action:none}',
      '.l4-s3-grid{display:grid;grid-template-columns:auto repeat(3,auto);gap:10px;justify-content:center;align-items:center}',
      '.l4-s3-hd{font-weight:700;font-size:20px;text-align:center;padding:6px 10px;border-radius:12px}',
      '.l4-s3-cell{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border:2px solid ' + LINE + ';border-radius:16px;background:#fff;min-width:84px}',
      '.l4-s3-cell.bad{border-color:' + RED + ';background:#fff1f0}',
      '.l4-s3-cell.good{border-color:' + GREEN + ';background:#eefbf4}',
      '.l4-s3-cell .v{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;min-width:48px;text-align:center}',
      '.l4-s3-step{width:44px;height:34px;border-radius:10px;border:2px solid ' + LINE + ';border-bottom-width:4px;background:#fff;font-size:20px;font-weight:700;cursor:pointer;color:' + INK + ';line-height:1}',
      '.l4-s3-step:active{transform:translateY(2px);border-bottom-width:2px}',
      '.l4-s3-seg{display:inline-flex;border:2px solid ' + LINE + ';border-radius:14px;overflow:hidden;background:#fff}',
      '.l4-s3-seg button{border:0;background:transparent;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer;color:' + MUTED + '}',
      '.l4-s3-seg button.on{background:' + PINK + ';color:#fff}',
      '.l4-s3-goal{opacity:.55}',
      '.l4-s3-goal.done{opacity:1;background:#eefbf4;border-color:' + GREEN + ';color:#0c7a47}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------- small utilities ----------
  function fmt(v) {
    var r = Math.round(v * 100) / 100;
    if (r === 0) r = 0;
    var s = String(r);
    return s.replace('-', '\u2212');
  }
  var SUP = { '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079', '-': '\u207b' };
  function sup(n) {
    return String(n).split('').map(function (ch) { return SUP[ch] || ch; }).join('');
  }
  function sci(v) {
    if (!isFinite(v)) return '\u221e';
    var a = Math.abs(v);
    if (a >= 0.01 && a < 1000) return String(Math.round(v * 1000) / 1000);
    var e = Math.floor(Math.log(a) / Math.LN10);
    var m = Math.round(v / Math.pow(10, e) * 10) / 10;
    if (Math.abs(m) >= 10) { m = m / 10; e += 1; }
    return m + ' \u00d7 10' + sup(e);
  }
  function svgText(parent, x, y, str, o) {
    o = o || {};
    var t = M4.svg('text', {
      x: x, y: y, 'text-anchor': o.anchor || 'middle', 'font-size': o.size || 16,
      'font-weight': o.weight || 500, fill: o.fill || INK, 'font-family': 'Inter, system-ui, sans-serif'
    }, parent);
    t.textContent = str;
    return t;
  }
  function arrow(parent, x1, y1, x2, y2, color, width) {
    var g = M4.svg('g', {}, parent);
    var ang = Math.atan2(y2 - y1, x2 - x1), L = 11;
    var bx = x2 - L * Math.cos(ang), by = y2 - L * Math.sin(ang);
    var ln = M4.svg('line', { x1: x1, y1: y1, x2: bx, y2: by, stroke: color, 'stroke-width': width || 3, 'stroke-linecap': 'round' }, g);
    var px = -Math.sin(ang) * 6, py = Math.cos(ang) * 6;
    var hd = M4.svg('polygon', { points: x2 + ',' + y2 + ' ' + (bx + px) + ',' + (by + py) + ' ' + (bx - px) + ',' + (by - py), fill: color }, g);
    return { g: g, line: ln, head: hd };
  }

  // ---------- the lecture's smallest network ----------
  var BASE = { x: 2, w1: 1.5, b1: -1, w2: 1.6, y: 1 };
  function compute(s) {
    var z = s.w1 * s.x + s.b1;
    var h = Math.max(0, z);
    var yh = s.w2 * h;
    var L = 0.5 * (yh - s.y) * (yh - s.y);
    var dy = yh - s.y;
    var dh = dy * s.w2;
    var dz = z > 0 ? dh : 0;
    return { z: z, h: h, yh: yh, L: L, dy: dy, dh: dh, dz: dz, gw2: dy * h, gw1: dz * s.x, gb1: dz };
  }

  // Computational graph x -> z -> h -> yhat -> L as SVG.
  function chainGraph(parent) {
    var W = 720, H = 240;
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'l4-s3-svg' }, parent);
    var cx = [70, 215, 360, 505, 650], top = 62, bw = 104, bh = 76;
    var names = ['x', 'z', 'h', '\u0177', 'L'];
    var edges = ['\u00b7w\u2081 + b\u2081', 'ReLU', '\u00b7w\u2082', '\u00bd(\u0177 \u2212 y)\u00b2'];
    var edgeT = [], valT = [], boxes = [], i;
    for (i = 0; i < 4; i++) {
      arrow(svg, cx[i] + bw / 2 + 3, top + bh / 2, cx[i + 1] - bw / 2 - 3, top + bh / 2, MUTED, 3);
      edgeT.push(svgText(svg, (cx[i] + cx[i + 1]) / 2, top - 22, edges[i], { size: 16, weight: 600, fill: MUTED }));
    }
    for (i = 0; i < 5; i++) {
      boxes.push(M4.svg('rect', { x: cx[i] - bw / 2, y: top, width: bw, height: bh, rx: 16, fill: '#fff', stroke: i === 4 ? PINK : LINE, 'stroke-width': 3 }, svg));
      svgText(svg, cx[i], top + 24, names[i], { size: 16, weight: 600, fill: MUTED });
      valT.push(svgText(svg, cx[i], top + 58, '', { size: 24, weight: 700 }));
    }
    var gy = top + bh + 34, wy = top + bh + 72;
    var gT = {
      z: svgText(svg, cx[1], gy, '', { size: 16, weight: 700, fill: PURPLE }),
      h: svgText(svg, cx[2], gy, '', { size: 16, weight: 700, fill: PURPLE }),
      yh: svgText(svg, cx[3], gy, '', { size: 16, weight: 700, fill: PURPLE }),
      w1: svgText(svg, 80, wy, '', { size: 16, weight: 700, fill: PURPLE }),
      b1: svgText(svg, 232, wy, '', { size: 16, weight: 700, fill: PURPLE }),
      w2: svgText(svg, (cx[2] + cx[3]) / 2, wy, '', { size: 16, weight: 700, fill: PURPLE })
    };
    var gName = { z: '\u2202L/\u2202z', h: '\u2202L/\u2202h', yh: '\u2202L/\u2202\u0177', w1: '\u2202L/\u2202w\u2081', b1: '\u2202L/\u2202b\u2081', w2: '\u2202L/\u2202w\u2082' };
    return {
      // vals: array of 5 strings (null -> '?'); grads: {z,h,yh,w1,b1,w2} strings (missing -> hidden)
      set: function (vals, grads, dead) {
        for (var k = 0; k < 5; k++) {
          var v = vals[k];
          valT[k].textContent = (v === null || v === undefined) ? '?' : v;
          valT[k].setAttribute('fill', (v === null || v === undefined) ? LINE : INK);
        }
        grads = grads || {};
        Object.keys(gT).forEach(function (key) {
          gT[key].textContent = (grads[key] === undefined || grads[key] === null) ? '' : gName[key] + ' = ' + grads[key];
        });
        edgeT[1].setAttribute('fill', dead ? RED : MUTED);
        edgeT[1].textContent = dead ? 'ReLU (off)' : 'ReLU';
        boxes[2].setAttribute('stroke', dead ? RED : LINE);
      }
    };
  }
  function fwdVals(s, r) { return [fmt(s.x), fmt(r.z), fmt(r.h), fmt(r.yh), fmt(r.L)]; }

  // Tokens-into-slots game. slots: [{label (TeX), answer, why}], tokens: [string]
  function tokenGame(el, ctx, cfg) {
    var slotRow = M4.el('div', { 'class': 'l4-s3-slotrow' }, el);
    var tokRow = M4.el('div', { 'class': 'l4-s3-tokrow' }, el);
    var slotEls = [], tokEls = [], left = cfg.slots.length;
    cfg.slots.forEach(function (sl, i) {
      var col = M4.el('div', { 'class': 'l4-s3-slotcol' }, slotRow);
      M4.el('div', { html: M4.tex(sl.label) }, col);
      var s = M4.el('div', { 'class': 'm4-slot l4-s3-slot' }, col);
      s.setAttribute('data-i', String(i));
      slotEls.push(s);
    });
    cfg.tokens.forEach(function (t) {
      var tk = M4.el('div', { 'class': 'm4-token l4-s3-tok', text: t.replace('-', '\u2212') }, tokRow);
      tk.setAttribute('data-v', t);
      tokEls.push(tk);
    });
    M4.dragDrop({
      tokens: tokEls,
      slots: slotEls,
      onDrop: function (tk, sl) {
        var i = parseInt(sl.getAttribute('data-i'), 10);
        var spec = cfg.slots[i];
        if (sl.classList.contains('filled')) return;
        if (tk.getAttribute('data-v') === spec.answer) {
          sl.textContent = tk.textContent;
          sl.classList.add('filled');
          sl.classList.add('m4-pop');
          tk.style.visibility = 'hidden';
          tk.style.pointerEvents = 'none';
          left -= 1;
          if (cfg.onPlace) cfg.onPlace(i);
          if (left === 0) {
            ctx.note(cfg.done || 'All values are in place.');
            ctx.solved();
          } else {
            ctx.note('Correct. ' + left + ' more to place.');
          }
        } else {
          ctx.wrong(spec.why);
        }
      },
      onMiss: function () { ctx.note('Drop the tile on one of the dashed boxes.'); }
    });
  }

  // Log-scale bar chart of the gradient magnitude at each of 50 layers.
  function barChart(parent) {
    var W = 720, H = 330, x0 = 78, x1 = 704, yMid = 150, per = 21.5; // px per decade
    var N = 50, MAXD = 6;
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'l4-s3-svg' }, parent);
    [-6, -3, 0, 3, 6].forEach(function (d) {
      var y = yMid - d * per;
      M4.svg('line', { x1: x0, y1: y, x2: x1, y2: y, stroke: d === 0 ? MUTED : LINE, 'stroke-width': d === 0 ? 2 : 1.5 }, svg);
      svgText(svg, x0 - 10, y + 5, d === 0 ? '1' : '10' + sup(d), { anchor: 'end', size: 15, fill: MUTED, weight: 600 });
    });
    var bw = (x1 - x0) / N, bars = [];
    for (var l = 1; l <= N; l++) {
      bars.push(M4.svg('rect', { x: x0 + (l - 1) * bw + 1.5, y: yMid - 1, width: bw - 3, height: 2, rx: 2, fill: PURPLE }, svg));
    }
    svgText(svg, x0, H - 28, 'layer 1', { anchor: 'start', size: 15, fill: MUTED, weight: 600 });
    svgText(svg, x1, H - 28, 'layer 50 (next to the loss)', { anchor: 'end', size: 15, fill: MUTED, weight: 600 });
    svgText(svg, (x0 + x1) / 2, H - 6, '\u2190 direction of the backward pass', { size: 15, fill: PURPLE, weight: 600 });
    return {
      set: function (f) {
        var lf = Math.log(f) / Math.LN10;
        for (var l = 1; l <= N; l++) {
          var d = lf * (N + 1 - l);
          var clamped = Math.abs(d) > MAXD;
          var dd = Math.max(-MAXD, Math.min(MAXD, d));
          var hpx = Math.max(2, Math.abs(dd) * per);
          var b = bars[l - 1];
          b.setAttribute('height', hpx);
          b.setAttribute('y', dd >= 0 ? yMid - hpx + (hpx === 2 ? 1 : 0) : yMid);
          b.setAttribute('fill', clamped ? RED : PURPLE);
        }
      }
    };
  }

  // =====================================================================
  M4.lesson({
    id: 'l4-s3',
    module: 'l4',
    title: 'Backpropagation in numbers',
    summary: 'A forward and a backward pass through a small network, computed with concrete numbers. Written in matrix form, the same computation shows why gradients vanish or explode in long chains.',
    minutes: 12,
    steps: [
      // 1 ---------------------------------------------------------------
      {
        kind: 'text',
        title: 'Learning goals',
        html:
          '<p>Gradient descent needs the derivative of the loss \\(L\\) with respect to every weight. Backpropagation delivers all of them for roughly the cost of two forward passes.</p>' +
          '<p>After this lesson you should be able to run a forward and a backward pass through a small network on paper, state the same computation in matrix form, and explain why the gradient can vanish or explode when many layers are chained.</p>'
      },
      // 2 ---------------------------------------------------------------
      {
        kind: 'explore',
        title: 'Forward pass as a computational graph',
        html:
          '<p>The smallest network has one input \\(x\\), one hidden unit and one output. It computes \\(z = w_1 x + b_1\\), \\(h = \\mathrm{ReLU}(z) = \\max(0, z)\\), the prediction \\(\\hat y = w_2 h\\), and the loss \\(L = \\tfrac12(\\hat y - y)^2\\) against the target \\(y\\).</p>' +
          '<p>Here \\(x = 2\\) and \\(y = 1\\) are fixed. Move the weights and observe how each box, read from left to right, depends only on the box before it.</p>',
        mount: function (el, ctx) {
          ensureStyle();
          var wrap = M4.el('div', { 'class': 'l4-s3-wrap' }, el);
          var g = chainGraph(wrap);
          var s = { x: BASE.x, w1: BASE.w1, b1: BASE.b1, w2: BASE.w2, y: BASE.y };
          var row = M4.el('div', { 'class': 'm4-row' }, wrap);
          var rd = M4.el('span', { 'class': 'm4-readout' }, row);
          var st = M4.el('span', { 'class': 'm4-chip' }, row);
          function upd() {
            var r = compute(s);
            g.set(fwdVals(s, r), {}, r.z <= 0);
            rd.textContent = 'L = \u00bd(' + fmt(r.yh) + ' \u2212 1)\u00b2 = ' + fmt(r.L);
            st.textContent = r.z > 0 ? 'hidden unit active (z > 0)' : 'hidden unit silent (z \u2264 0)';
          }
          var f1 = function (v) { return fmt(v); };
          var sw1 = M4.slider(wrap, { min: -2, max: 3, step: 0.1, value: s.w1, label: 'w\u2081', format: f1, onInput: function (v) { s.w1 = +v; upd(); } });
          var sb1 = M4.slider(wrap, { min: -4, max: 2, step: 0.5, value: s.b1, label: 'b\u2081', format: f1, onInput: function (v) { s.b1 = +v; upd(); } });
          var sw2 = M4.slider(wrap, { min: -2, max: 3, step: 0.1, value: s.w2, label: 'w\u2082', format: f1, onInput: function (v) { s.w2 = +v; upd(); } });
          var br = M4.el('div', { 'class': 'm4-row' }, wrap);
          M4.button(br, 'Reset to the lecture values', function () {
            s.w1 = BASE.w1; s.b1 = BASE.b1; s.w2 = BASE.w2;
            sw1.set(s.w1); sb1.set(s.b1); sw2.set(s.w2); upd();
          });
          upd();
        }
      },
      // 3 ---------------------------------------------------------------
      {
        kind: 'exercise',
        title: 'Forward pass values',
        html:
          '<p>Take \\(x = 2\\), \\(w_1 = 1.5\\), \\(b_1 = -1\\), \\(w_2 = 1.6\\) and \\(y = 1\\). Compute the four values from left to right and drag each tile into its box.</p>' +
          '<p>Every value stays stored in its box, because the backward pass will need it.</p>',
        hint: 'z = 1.5 · 2 − 1. ReLU leaves a positive number unchanged. Then multiply by 1.6, and finally take half of the squared difference to y = 1.',
        mount: function (el, ctx) {
          ensureStyle();
          var wrap = M4.el('div', { 'class': 'l4-s3-wrap' }, el);
          var g = chainGraph(wrap);
          var shown = ['2', null, null, null, null];
          g.set(shown, {});
          var answers = ['2', '2', '3.2', '2.42'];
          tokenGame(wrap, ctx, {
            slots: [
              { label: 'z', answer: '2', why: 'z = w\u2081x + b\u2081 = 1.5 \u00b7 2 \u2212 1.' },
              { label: 'h', answer: '2', why: 'h = max(0, z), and z is positive here.' },
              { label: '\\hat y', answer: '3.2', why: '\u0177 = w\u2082 \u00b7 h = 1.6 \u00b7 h.' },
              { label: 'L', answer: '2.42', why: 'L = \u00bd(\u0177 \u2212 1)\u00b2. Do not forget the factor \u00bd.' }
            ],
            tokens: ['4.84', '2', '3.2', '3', '2.42', '2', '1.1'],
            onPlace: function (i) { shown[i + 1] = answers[i]; g.set(shown, {}); },
            done: 'Forward pass complete: \\(z = 2,\\ h = 2,\\ \\hat y = 3.2,\\ L = \\tfrac12 (3.2 - 1)^2 = 2.42\\).'
          });
        }
      },
      // 4 ---------------------------------------------------------------
      {
        kind: 'exercise',
        title: 'Backward pass',
        html:
          '<p>The backward pass starts at the loss and moves to the left. Each node takes the gradient arriving from its right and multiplies it by its own local derivative.</p>' +
          '<p>The local derivatives are \\(\\partial L / \\partial \\hat y = \\hat y - y\\) for the loss, \\(w_2\\) for the multiplication \\(\\hat y = w_2 h\\), and \\(\\mathrm{ReLU}\'(z)\\), which is \\(1\\) for \\(z &gt; 0\\) and \\(0\\) otherwise. Enter the three gradients one after another.</p>',
        hint: 'First 3.2 − 1. Then multiply that by w₂ = 1.6. Then multiply by ReLU′(z), which is 1 because z = 2 is positive.',
        mount: function (el, ctx) {
          ensureStyle();
          var wrap = M4.el('div', { 'class': 'l4-s3-wrap' }, el);
          var g = chainGraph(wrap);
          var r = compute(BASE), vals = fwdVals(BASE, r), grads = {};
          g.set(vals, grads);
          var box = M4.el('div', { 'class': 'm4-row' }, wrap);
          var stages = [
            { key: 'yh', label: '\u2202L/\u2202\u0177 =', answer: 2.2, ok: '\\(\\partial L/\\partial \\hat y = 3.2 - 1 = 2.2\\). Next: multiply by the local derivative of \\(\\hat y = w_2 h\\) with respect to \\(h\\).',
              bad: function () { return 'The derivative of \u00bd(\u0177 \u2212 y)\u00b2 with respect to \u0177 is \u0177 \u2212 y.'; } },
            { key: 'h', label: '\u2202L/\u2202h =', answer: 3.52, ok: '\\(\\partial L/\\partial h = 2.2 \\cdot 1.6 = 3.52\\). Next: pass through the ReLU.',
              bad: function (v) { return Math.abs(v - 4.4) < 0.01 ? 'That is 2.2 \u00b7 h. The derivative of w\u2082h with respect to h is w\u2082, not h.' : 'Multiply the incoming gradient 2.2 by w\u2082 = 1.6.'; } },
            { key: 'z', label: '\u2202L/\u2202z =', answer: 3.52, ok: '\\(\\partial L/\\partial z = 3.52 \\cdot 1 = 3.52\\): the unit is active, so the ReLU passes the gradient unchanged.',
              bad: function (v) { return Math.abs(v) < 0.01 ? 'The gradient would be 0 only for z \u2264 0. Here z = 2.' : 'Multiply 3.52 by ReLU\u2032(z). Since z = 2 > 0, that factor is 1.'; } }
          ];
          var timer = null;
          ctx.onCleanup(function () { if (timer) clearTimeout(timer); });
          function show(k) {
            while (box.firstChild) box.removeChild(box.firstChild);
            if (k >= stages.length) {
              M4.el('span', { 'class': 'm4-chip', text: 'Backward chain complete' }, box);
              ctx.solved();
              return;
            }
            var st = stages[k];
            M4.numberInput(box, {
              answer: st.answer, tolerance: 0.011, placeholder: '?', label: st.label,
              onCorrect: function () {
                grads[st.key] = fmt(st.answer);
                g.set(vals, grads);
                ctx.note(st.ok);
                timer = setTimeout(function () { show(k + 1); }, 700);
              },
              onWrong: function (v) { ctx.wrong(st.bad(Number(v))); }
            });
          }
          show(0);
        }
      },
      // 5 ---------------------------------------------------------------
      {
        kind: 'exercise',
        title: 'Weight gradients branch off',
        html:
          '<p>The weights sit on the edges of the graph. The gradient of a weight is the gradient arriving at the node it feeds, multiplied by the input that this weight saw in the forward pass.</p>' +
          '<p>So \\(\\partial L/\\partial w_2 = \\frac{\\partial L}{\\partial \\hat y} \\cdot h\\), \\(\\partial L/\\partial w_1 = \\frac{\\partial L}{\\partial z} \\cdot x\\), and \\(\\partial L/\\partial b_1 = \\frac{\\partial L}{\\partial z}\\), because the bias enters with input \\(1\\). Drag the correct value into each box.</p>',
        hint: 'Read the purple gradients and the stored forward values from the graph: 2.2 · 2, 3.52 · 2, and 3.52 · 1.',
        mount: function (el, ctx) {
          ensureStyle();
          var wrap = M4.el('div', { 'class': 'l4-s3-wrap' }, el);
          var g = chainGraph(wrap);
          var r = compute(BASE), vals = fwdVals(BASE, r);
          var grads = { yh: '2.2', h: '3.52', z: '3.52' };
          g.set(vals, grads);
          var keys = ['w2', 'w1', 'b1'], ans = ['4.4', '7.04', '3.52'];
          tokenGame(wrap, ctx, {
            slots: [
              { label: '\\partial L/\\partial w_2', answer: '4.4', why: 'w\u2082 feeds \u0177: take \u2202L/\u2202\u0177 = 2.2 times the input it saw, h = 2.' },
              { label: '\\partial L/\\partial w_1', answer: '7.04', why: 'w\u2081 feeds z: take \u2202L/\u2202z = 3.52 times the input it saw, x = 2.' },
              { label: '\\partial L/\\partial b_1', answer: '3.52', why: 'The bias is added to z directly, so its gradient equals \u2202L/\u2202z.' }
            ],
            tokens: ['5.28', '3.52', '2.2', '7.04', '3.2', '4.4'],
            onPlace: function (i) { grads[keys[i]] = ans[i]; g.set(vals, grads); },
            done: '\\(\\partial L/\\partial w_2 = 2.2 \\cdot 2 = 4.4\\), \\(\\partial L/\\partial w_1 = 3.52 \\cdot 2 = 7.04\\), \\(\\partial L/\\partial b_1 = 3.52\\).'
          });
        }
      },
      // 6 ---------------------------------------------------------------
      {
        kind: 'exercise',
        title: 'A dead unit',
        html:
          '<p>The ReLU contributes the factor \\(\\mathrm{ReLU}\'(z)\\) to the backward pass. If \\(z &lt; 0\\) this factor is \\(0\\), and every gradient to the left of the unit becomes \\(0\\) as well. Such a unit is called dead for this input.</p>' +
          '<p>Lower the bias \\(b_1\\) until the hidden unit is switched off, and compare the purple gradients.</p>',
        hint: 'z = 1.5 · 2 + b₁ = 3 + b₁. The unit is off once z is negative, which requires b₁ below −3.',
        mount: function (el, ctx) {
          ensureStyle();
          var wrap = M4.el('div', { 'class': 'l4-s3-wrap' }, el);
          var g = chainGraph(wrap);
          var s = { x: BASE.x, w1: BASE.w1, b1: BASE.b1, w2: BASE.w2, y: BASE.y };
          var row = M4.el('div', { 'class': 'm4-row' }, wrap);
          var rz = M4.el('span', { 'class': 'm4-readout' }, row);
          var rr = M4.el('span', { 'class': 'm4-readout' }, row);
          function upd() {
            var r = compute(s);
            g.set(fwdVals(s, r), { yh: fmt(r.dy), h: fmt(r.dh), z: fmt(r.dz), w1: fmt(r.gw1), b1: fmt(r.gb1), w2: fmt(r.gw2) }, r.z <= 0);
            rz.textContent = 'z = 3 + (' + fmt(s.b1) + ') = ' + fmt(r.z);
            rr.textContent = 'ReLU\u2032(z) = ' + (r.z > 0 ? '1' : '0');
            if (r.z < 0) {
              ctx.note('With \\(z &lt; 0\\) the ReLU blocks the gradient: \\(\\partial L/\\partial w_1 = \\partial L/\\partial b_1 = 0\\). Since \\(h = 0\\), also \\(\\partial L/\\partial w_2 = \\frac{\\partial L}{\\partial \\hat y} \\cdot h = 0\\). No weight receives an update from this input.');
              ctx.solved();
            } else if (r.z === 0) {
              ctx.note('Here \\(z\\) is \\(0\\), the kink of the ReLU. Lower \\(b_1\\) one more step so that \\(z\\) is negative.');
            } else {
              ctx.note('The unit is still active: \\(z = ' + String(Math.round(r.z * 100) / 100) + ' &gt; 0\\), so the gradient passes through unchanged.');
            }
          }
          M4.slider(wrap, { min: -5, max: 1, step: 0.5, value: s.b1, label: 'b\u2081', format: function (v) { return fmt(v); }, onInput: function (v) { s.b1 = +v; upd(); } });
          upd();
        }
      },
      // 7 ---------------------------------------------------------------
      {
        kind: 'explore',
        title: 'Two hidden units',
        html:
          '<p>Now \\(x = 2\\) feeds two hidden units, \\(h_j = \\mathrm{ReLU}(w_j x)\\) for \\(j = 1, 2\\), and both feed the output \\(\\hat y = v_1 h_1 + v_2 h_2\\) with \\(v_1 = 1\\) and \\(v_2 = 0.5\\). In the backward pass, \\(x\\) receives one gradient along each path, and the two are summed.</p>' +
          '<p>With more layers the number of paths doubles at every layer, while backpropagation sends one message per node and reuses it. The lower slider compares the two counts for a network of width 2.</p>',
        mount: function (el, ctx) {
          ensureStyle();
          var wrap = M4.el('div', { 'class': 'l4-s3-wrap' }, el);
          var W = 720, H = 300;
          var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'l4-s3-svg' }, wrap);
          var P = { x: [90, 150], h1: [360, 70], h2: [360, 230], y: [630, 150] }, bw = 108, bh = 68;
          var cols = [PINK, ORANGE];
          var e = [
            arrow(svg, P.x[0] + bw / 2 + 3, P.x[1] - 14, P.h1[0] - bw / 2 - 3, P.h1[1], PINK, 4),
            arrow(svg, P.h1[0] + bw / 2 + 3, P.h1[1], P.y[0] - bw / 2 - 3, P.y[1] - 14, PINK, 4),
            arrow(svg, P.x[0] + bw / 2 + 3, P.x[1] + 14, P.h2[0] - bw / 2 - 3, P.h2[1], ORANGE, 4),
            arrow(svg, P.h2[0] + bw / 2 + 3, P.h2[1], P.y[0] - bw / 2 - 3, P.y[1] + 14, ORANGE, 4)
          ];
          var lab = [
            svgText(svg, 205, 80, '', { size: 16, weight: 700, fill: PINK }),
            svgText(svg, 205, 232, '', { size: 16, weight: 700, fill: ORANGE })
          ];
          svgText(svg, 520, 80, '\u00b7v\u2081 = 1', { size: 16, weight: 700, fill: PINK });
          svgText(svg, 520, 232, '\u00b7v\u2082 = 0.5', { size: 16, weight: 700, fill: ORANGE });
          function node(p, name, stroke) {
            M4.svg('rect', { x: p[0] - bw / 2, y: p[1] - bh / 2, width: bw, height: bh, rx: 16, fill: '#fff', stroke: stroke, 'stroke-width': 3 }, svg);
            svgText(svg, p[0], p[1] - 10, name, { size: 15, weight: 600, fill: MUTED });
            return svgText(svg, p[0], p[1] + 22, '', { size: 22, weight: 700 });
          }
          node(P.x, 'x', LINE).textContent = '2';
          var t1 = node(P.h1, 'h\u2081', PINK), t2 = node(P.h2, 'h\u2082', ORANGE), ty = node(P.y, '\u0177', LINE);
          var row = M4.el('div', { 'class': 'm4-row' }, wrap);
          var r1 = M4.el('span', { 'class': 'm4-readout', style: 'border-color:' + PINK }, row);
          var r2 = M4.el('span', { 'class': 'm4-readout', style: 'border-color:' + ORANGE }, row);
          var r3 = M4.el('span', { 'class': 'm4-readout' }, row);
          var w = [1.5, 1], v = [1, 0.5], X = 2;
          function upd() {
            var h = [Math.max(0, w[0] * X), Math.max(0, w[1] * X)];
            var on = [w[0] * X > 0, w[1] * X > 0];
            var g = [on[0] ? v[0] * w[0] : 0, on[1] ? v[1] * w[1] : 0];
            t1.textContent = fmt(h[0]); t2.textContent = fmt(h[1]);
            ty.textContent = fmt(v[0] * h[0] + v[1] * h[1]);
            lab[0].textContent = '\u00b7w\u2081 = ' + fmt(w[0]) + ', ReLU';
            lab[1].textContent = '\u00b7w\u2082 = ' + fmt(w[1]) + ', ReLU';
            [0, 1].forEach(function (j) {
              var op = on[j] ? 1 : 0.22;
              e[2 * j].g.setAttribute('opacity', op); e[2 * j + 1].g.setAttribute('opacity', op);
            });
            r1.textContent = 'path 1: ' + (on[0] ? '1 \u00b7 1 \u00b7 ' + fmt(w[0]) : 'ReLU off') + ' = ' + fmt(g[0]);
            r2.textContent = 'path 2: ' + (on[1] ? '0.5 \u00b7 1 \u00b7 ' + fmt(w[1]) : 'ReLU off') + ' = ' + fmt(g[1]);
            r3.textContent = '\u2202\u0177/\u2202x = ' + fmt(g[0]) + ' + ' + (g[1] < 0 ? '(' + fmt(g[1]) + ')' : fmt(g[1])) + ' = ' + fmt(g[0] + g[1]);
          }
          var f = function (val) { return fmt(val); };
          M4.slider(wrap, { min: -2, max: 2, step: 0.25, value: w[0], label: 'w\u2081', format: f, onInput: function (val) { w[0] = +val; upd(); } });
          M4.slider(wrap, { min: -2, max: 2, step: 0.25, value: w[1], label: 'w\u2082', format: f, onInput: function (val) { w[1] = +val; upd(); } });
          upd();
          var row2 = M4.el('div', { 'class': 'm4-row', style: 'margin-top:8px' }, wrap);
          var p1 = M4.el('span', { 'class': 'm4-readout' }, row2);
          var p2 = M4.el('span', { 'class': 'm4-readout', style: 'border-color:' + PURPLE }, row2);
          function updD(d) {
            var paths = Math.pow(2, d);
            p1.textContent = 'paths from x to \u0177: 2' + sup(d) + ' = ' + paths.toLocaleString('en-US');
            p2.textContent = 'backprop messages (one per hidden unit): ' + (2 * d);
          }
          M4.slider(wrap, { min: 1, max: 30, step: 1, value: 3, label: 'hidden layers', format: function (val) { return String(val); }, onInput: function (val) { updD(+val); } });
          updD(3);
        }
      },
      // 8 ---------------------------------------------------------------
      {
        kind: 'text',
        title: 'The same in matrix form',
        html:
          '<p>For layers with many units the forward pass reads \\(z_1 = W_1 x + b_1\\), \\(h = \\varphi(z_1)\\), \\(z_2 = W_2 h + b_2\\), \\(L = \\ell(z_2, y)\\), where \\(\\varphi\\) is the nonlinearity applied to each entry. The backward pass starts with \\(\\delta_2 = \\partial L/\\partial z_2\\). For softmax with cross-entropy this is \\(\\delta_2 = q - y\\), the predicted probabilities minus the one-hot target.</p>' +
          '\\[ \\nabla W_2 = \\delta_2 h^\\top, \\qquad \\delta_1 = (W_2^\\top \\delta_2) \\odot \\varphi\'(z_1), \\qquad \\nabla W_1 = \\delta_1 x^\\top \\]' +
          '<p>The outer product \\(\\delta_2 h^\\top\\) is the earlier \\(2.2 \\cdot h\\) for all weights at once: incoming gradient times the input the weight saw. \\(W_2^\\top\\) sends the gradient back one layer, and the entrywise product \\(\\odot\\) with \\(\\varphi\'(z_1)\\) switches silent units off. \\(\\nabla W\\) always has the shape of \\(W\\), so a shape mismatch indicates a missing transpose.</p>' +
          '<p>Automatic differentiation performs these steps: during the forward pass PyTorch records the graph and stores the activations, and <code>loss.backward()</code> runs the backward pass from the loss to every weight. The stored activations are the reason training memory grows with depth.</p>'
      },
      // 9 ---------------------------------------------------------------
      {
        kind: 'exercise',
        title: 'The outer product',
        html:
          '<p>Let the output layer have two units with \\(\\delta_2 = \\begin{pmatrix}2\\\\-1\\end{pmatrix}\\), and let the hidden layer have three units with \\(h = \\begin{pmatrix}1\\\\0\\\\3\\end{pmatrix}\\). Then \\(W_2\\) is a \\(2 \\times 3\\) matrix, and so is \\(\\nabla W_2 = \\delta_2 h^\\top\\).</p>' +
          '<p>The entry in row \\(i\\) and column \\(j\\) is \\(\\delta_{2,i} \\cdot h_j\\). Set all six entries with the plus and minus buttons, then check.</p>',
        hint: 'Multiply the row label by the column label. A hidden unit with h = 0 gives a whole column of zeros: its outgoing weights receive no gradient.',
        mount: function (el, ctx) {
          ensureStyle();
          var d = [2, -1], h = [1, 0, 3];
          var wrap = M4.el('div', { 'class': 'l4-s3-wrap' }, el);
          var grid = M4.el('div', { 'class': 'l4-s3-grid' }, wrap);
          M4.el('div', { 'class': 'l4-s3-hd', html: M4.tex('\\delta_2 h^\\top'), style: 'color:' + MUTED }, grid);
          h.forEach(function (hv, j) {
            M4.el('div', { 'class': 'l4-s3-hd', style: 'color:' + PINK, html: M4.tex('h_' + (j + 1) + ' = ' + hv) }, grid);
          });
          var cells = [], done = false;
          d.forEach(function (dv, i) {
            M4.el('div', { 'class': 'l4-s3-hd', style: 'color:' + PURPLE, html: M4.tex('\\delta_{2,' + (i + 1) + '} = ' + dv) }, grid);
            h.forEach(function (hv) {
              var c = M4.el('div', { 'class': 'l4-s3-cell' }, grid);
              var cell = { el: c, v: 0, want: dv * hv };
              var up = M4.el('button', { 'class': 'l4-s3-step', text: '+', type: 'button' }, c);
              var val = M4.el('div', { 'class': 'v', text: '0' }, c);
              var dn = M4.el('button', { 'class': 'l4-s3-step', text: '\u2212', type: 'button' }, c);
              up.setAttribute('aria-label', 'increase'); dn.setAttribute('aria-label', 'decrease');
              function bump(k) {
                if (done) return;
                cell.v = Math.max(-9, Math.min(9, cell.v + k));
                val.textContent = fmt(cell.v);
                c.classList.remove('bad'); c.classList.remove('good');
              }
              up.addEventListener('click', function () { bump(1); });
              dn.addEventListener('click', function () { bump(-1); });
              cells.push(cell);
            });
          });
          var row = M4.el('div', { 'class': 'm4-row' }, wrap);
          M4.button(row, 'Check', function () {
            if (done) return;
            var bad = 0;
            cells.forEach(function (c) {
              var ok = c.v === c.want;
              c.el.classList.toggle('bad', !ok);
              c.el.classList.toggle('good', ok);
              if (!ok) bad += 1;
            });
            if (bad === 0) {
              done = true;
              ctx.note('\\(\\nabla W_2 = \\begin{pmatrix} 2 &amp; 0 &amp; 6 \\\\ -1 &amp; 0 &amp; -3 \\end{pmatrix}\\). It has the shape of \\(W_2\\), and the column of the silent unit \\(h_2 = 0\\) is zero.');
              ctx.solved();
            } else {
              ctx.wrong(bad + (bad === 1 ? ' entry is' : ' entries are') + ' not yet right. Each entry is its row label \u03b4 times its column label h.');
            }
          }, { primary: true });
        }
      },
      // 10 --------------------------------------------------------------
      {
        kind: 'explore',
        title: 'Vanishing and exploding gradients',
        html:
          '<p>Consider a chain of 50 layers. The backward pass multiplies the gradient by one factor per layer, so after 50 layers a constant factor \\(f\\) has been applied \\(50\\) times: the gradient at layer 1 is scaled by \\(f^{50}\\).</p>' +
          '<p>The bars show the gradient magnitude at each layer on a logarithmic scale, starting from \\(1\\) at the loss. Red bars lie beyond the plotted range of \\(10^{-6}\\) to \\(10^{6}\\).</p>',
        mount: function (el, ctx) {
          ensureStyle();
          var wrap = M4.el('div', { 'class': 'l4-s3-wrap' }, el);
          var chart = barChart(wrap);
          var row = M4.el('div', { 'class': 'm4-row' }, wrap);
          var rd = M4.el('span', { 'class': 'm4-readout', style: 'border-color:' + PURPLE }, row);
          var tag = M4.el('span', { 'class': 'm4-chip' }, row);
          function upd(f) {
            var p = Math.pow(f, 50);
            chart.set(f);
            rd.textContent = 'gradient at layer 1: ' + f.toFixed(2) + '\u2075\u2070 \u2248 ' + sci(p);
            tag.textContent = p < 0.5 ? 'vanishes' : (p > 2 ? 'explodes' : 'stays stable');
            tag.style.color = p < 0.5 || p > 2 ? RED : GREEN;
          }
          var sl = M4.slider(wrap, { min: 0.5, max: 1.5, step: 0.01, value: 0.8, label: 'factor per layer f', format: function (v) { return (+v).toFixed(2); }, onInput: function (v) { upd(+v); } });
          var br = M4.el('div', { 'class': 'm4-row' }, wrap);
          [0.8, 1, 1.2].forEach(function (f) {
            M4.button(br, 'f = ' + f, function () { sl.set(f); upd(f); });
          });
          upd(0.8);
        }
      },
      // 11 --------------------------------------------------------------
      {
        kind: 'exercise',
        title: 'Gradients through 50 layers',
        html:
          '<p>In a chain of one-unit layers the factor per layer is the weight \\(w\\) times the derivative of the activation, \\(f = w \\cdot \\varphi\'(z)\\). The sigmoid has \\(\\sigma\'(z) \\le 0.25\\), so ten sigmoid layers with \\(w = 1\\) already scale the gradient by at most \\(0.25^{10} \\approx 10^{-6}\\). An active ReLU has derivative \\(1\\), which is one reason ReLU replaced the sigmoid.</p>' +
          '<p>Assume the best case \\(\\sigma\'(z) = 0.25\\) for the sigmoid and an active unit for the ReLU. For each activation, find a weight \\(w\\) for which the gradient at layer 1 stays between \\(0.5\\) and \\(2\\).</p>',
        hint: 'The product f⁵⁰ stays near 1 only if f = w · φ′ is very close to 1. For ReLU that means w = 1. For the sigmoid w must cancel the factor 0.25.',
        mount: function (el, ctx) {
          ensureStyle();
          var wrap = M4.el('div', { 'class': 'l4-s3-wrap' }, el);
          var top = M4.el('div', { 'class': 'm4-row' }, wrap);
          var seg = M4.el('div', { 'class': 'l4-s3-seg' }, top);
          var acts = [{ name: 'sigmoid', d: 0.25 }, { name: 'ReLU', d: 1 }];
          var cur = 0, w = 2, ok = [false, false];
          var btns = acts.map(function (a, i) {
            var b = M4.el('button', { text: a.name + '  (\u03c6\u2032 = ' + a.d + ')', type: 'button' }, seg);
            b.addEventListener('click', function () { cur = i; upd(); });
            return b;
          });
          var goals = acts.map(function (a) {
            return M4.el('span', { 'class': 'm4-chip l4-s3-goal', text: a.name + ': open' }, top);
          });
          var chart = barChart(wrap);
          var row = M4.el('div', { 'class': 'm4-row' }, wrap);
          var rf = M4.el('span', { 'class': 'm4-readout' }, row);
          var rp = M4.el('span', { 'class': 'm4-readout', style: 'border-color:' + PURPLE }, row);
          var sl;
          function upd() {
            var a = acts[cur], f = Math.round(w * a.d * 10000) / 10000, p = Math.pow(f, 50);
            btns.forEach(function (b, i) { b.classList.toggle('on', i === cur); });
            chart.set(f);
            rf.textContent = 'f = ' + w.toFixed(2) + ' \u00b7 ' + a.d + ' = ' + f;
            rp.textContent = 'f\u2075\u2070 \u2248 ' + sci(p);
            var good = p >= 0.5 && p <= 2;
            if (good && !ok[cur]) {
              ok[cur] = true;
              goals[cur].textContent = a.name + ': w = ' + w.toFixed(2) + ' \u2713';
              goals[cur].classList.add('done'); goals[cur].classList.add('m4-pop');
            }
            if (ok[0] && ok[1]) {
              ctx.note('Both chains are stable only when \\(w \\cdot \\varphi\'\\) is close to \\(1\\): \\(w \\approx 1\\) for ReLU and \\(w \\approx 4\\) for the sigmoid. A deviation of a few percent per layer already compounds to a large factor over 50 layers.');
              ctx.solved();
            } else if (good) {
              ctx.note('Stable for ' + a.name + ': \\(f^{50} \\approx ' + (Math.round(p * 100) / 100) + '\\). Now switch to the other activation.');
            } else if (p < 0.5) {
              ctx.note('The gradient vanishes: \\(f = ' + f + ' &lt; 1\\) is multiplied 50 times. Increase \\(w\\).');
            } else {
              ctx.note('The gradient explodes: \\(f = ' + f + ' &gt; 1\\) is multiplied 50 times. Decrease \\(w\\).');
            }
          }
          function setW(v) {
            w = Math.max(0.5, Math.min(5, Math.round(v * 20) / 20));
            sl.set(w); upd();
          }
          sl = M4.slider(wrap, { min: 0.5, max: 5, step: 0.05, value: w, label: 'weight w', format: function (v) { return (+v).toFixed(2); }, onInput: function (v) { w = Math.round(+v * 20) / 20; upd(); } });
          var br = M4.el('div', { 'class': 'm4-row' }, wrap);
          M4.button(br, '\u2212 0.05', function () { setW(w - 0.05); });
          M4.button(br, '+ 0.05', function () { setW(w + 0.05); });
          upd();
        }
      },
      // 12 --------------------------------------------------------------
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>The forward pass computes and stores every value from left to right. The backward pass moves from the loss to the left, and each node multiplies the incoming gradient by its local derivative. In the example, \\(2.2 \\to 3.52 \\to 3.52\\), and a ReLU with \\(z &lt; 0\\) sets everything to its left to \\(0\\).</li>' +
          '<li>A weight gradient is the incoming gradient times the input that weight saw, and gradients arriving along several paths are summed. In matrix form: \\(\\nabla W_2 = \\delta_2 h^\\top\\), \\(\\delta_1 = (W_2^\\top \\delta_2) \\odot \\varphi\'(z_1)\\), \\(\\nabla W_1 = \\delta_1 x^\\top\\), which is what <code>loss.backward()</code> executes.</li>' +
          '<li>Depth multiplies one factor per layer: \\(0.8^{50} \\approx 10^{-5}\\) vanishes, \\(1.2^{50} \\approx 9000\\) explodes, and only a factor close to \\(1\\) keeps the gradient at a usable size. The forward pass has the same problem for the activations, which motivates careful initialization.</li>' +
          '</ul>'
      }
    ]
  });
})();
