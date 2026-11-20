(function () {
  'use strict';

  var C = M4.colors;
  var NS = 'http://www.w3.org/2000/svg';

  function f(v, d) { return M4.fmt(v, d == null ? 2 : d); }
  function row(el) { return M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el); }
  function ctl(el) { return M4.el('div', { style: 'max-width:420px;margin:8px auto 0' }, el); }
  function chip(parent, label, color) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    var l = M4.el('span', { text: label + ' ' }, r);
    l.style.fontWeight = '700';
    if (color) l.style.color = color;
    var v = M4.el('span', { text: '' }, r);
    return function (t) { v.textContent = t; };
  }
  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgRoot(el, w, h) {
    return mk('svg', { viewBox: '0 0 ' + w + ' ' + h, style: 'width:100%;max-width:' + w + 'px;height:auto;display:block;margin:0 auto;user-select:none' }, el);
  }
  function txt(parent, x, y, s, o) {
    o = o || {};
    var t = mk('text', { x: x, y: y, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': 'middle', 'font-size': o.size || 18, 'font-weight': o.weight || 600, fill: o.fill || C.ink }, parent);
    t.textContent = s;
    return t;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  /* ---------- shapes of W^T delta ---------- */
  function shapeScene(el) {
    var m = 3, n = 5;
    var svg = svgRoot(el, 640, 210);
    var cap = M4.el('p', { class: 'm4-cap', style: 'text-align:center' }, el);
    var box = ctl(el);
    M4.slider(box, { min: 1, max: 6, step: 1, value: m, label: 'outputs \\(m\\)', onInput: function (v) { m = v; draw(); } });
    M4.slider(box, { min: 1, max: 6, step: 1, value: n, label: 'inputs \\(n\\)', onInput: function (v) { n = v; draw(); } });
    function grid(x, y, rows, cols, color, fill) {
      var s = 24;
      for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) {
        mk('rect', { x: x + j * s, y: y + i * s, width: s - 3, height: s - 3, rx: 3, fill: fill, stroke: color, 'stroke-width': 1.5 }, svg);
      }
      return { w: cols * s, h: rows * s };
    }
    function draw() {
      clear(svg);
      var top = 40, mid = top + 72, S = 24;
      var total = m * S + 40 + S + 40 + 40 + S + 70 + n * S;
      // W^T  (n x m)
      var x0 = (640 - total) / 2;
      var a = grid(x0, mid - n * 12, n, m, C.blue, '#e8eef7');
      txt(svg, x0 + a.w / 2, top - 18, 'Wᵀ', { fill: C.blue, size: 20 });
      txt(svg, x0 + a.w / 2, mid + n * 12 + 18, n + ' × ' + m, { fill: C.muted, size: 15 });
      // delta (m)
      var x1 = x0 + a.w + 40;
      var b = grid(x1, mid - m * 12, m, 1, C.red, '#f7e6e3');
      txt(svg, x1 + b.w / 2, top - 18, 'δ', { fill: C.red, size: 20 });
      txt(svg, x1 + b.w / 2, mid + m * 12 + 18, String(m), { fill: C.muted, size: 15 });
      // equals
      var x2 = x1 + b.w + 20;
      txt(svg, x2 + 8, mid - 2, '=', { size: 28 });
      // result (n)
      var x3 = x2 + 40;
      var c = grid(x3, mid - n * 12, n, 1, C.green, '#e5f1e8');
      txt(svg, x3 + c.w / 2, top - 18, '∂L/∂x', { fill: C.green, size: 18 });
      txt(svg, x3 + c.w / 2, mid + n * 12 + 18, String(n), { fill: C.muted, size: 15 });
      // divider, then the gradient for W (m x n)
      mk('line', { x1: x3 + c.w + 33, y1: top - 10, x2: x3 + c.w + 33, y2: mid + 80, stroke: C.line, 'stroke-width': 1.5, 'stroke-dasharray': '4 5' }, svg);
      var x4 = x3 + c.w + 70;
      var d = grid(x4, mid - m * 12, m, n, C.purple, '#efe8f5');
      txt(svg, x4 + d.w / 2, top - 18, '∂L/∂W', { fill: C.purple, size: 18 });
      txt(svg, x4 + d.w / 2, mid + m * 12 + 18, m + ' × ' + n, { fill: C.muted, size: 15 });
      cap.innerHTML = 'A layer \\(y = W x\\) with \\(W\\) of shape \\(' + m + ' \\times ' + n + '\\). The gradient \\(\\delta\\) arriving at \\(y\\) has \\(' + m + '\\) entries. \\(W^\\top\\) turns it into \\(' + n + '\\) entries, one per input, and \\(\\partial L / \\partial W\\) has the shape of \\(W\\).';
      M4.typeset(cap);
    }
    draw();
  }

  /* ---------- ReLU masks the gradient ---------- */
  function reluScene(el, o) {
    o = o || {};
    var N = 6;
    var z = o.z ? o.z.slice() : [], g = o.g ? o.g.slice() : [];
    function sample() {
      z = []; g = [];
      for (var i = 0; i < N; i++) { z.push(M4.randNZ(-3, 3)); g.push(M4.randNZ(-3, 3)); }
    }
    if (!z.length) sample();
    var svg = svgRoot(el, 620, 250);
    var bar = row(el);
    if (!o.fixed) M4.button(bar, 'New sample', function () { sample(); draw(); });
    var cap = M4.el('p', { class: 'm4-cap', style: 'text-align:center' }, el);
    cap.innerHTML = 'Click a pre-activation to flip its sign.';
    var rows = [
      { y: 50, label: 'z', color: C.ink },
      { y: 110, label: 'ReLU(z)', color: C.blue },
      { y: 170, label: 'upstream', color: C.muted },
      { y: 230, label: 'to z', color: C.red }
    ];
    function draw() {
      clear(svg);
      rows.forEach(function (r) { txt(svg, 100, r.y, r.label, { anchor: 'end', size: 16, fill: r.color }); });
      for (var i = 0; i < N; i++) {
        var x = 160 + i * 74, on = z[i] > 0;
        (function (i) {
          var cell = mk('rect', { x: x - 28, y: 30, width: 56, height: 40, rx: 8, fill: on ? '#fff' : '#f1efe9', stroke: on ? C.ink : C.line, 'stroke-width': 2, style: 'cursor:pointer' }, svg);
          var t = txt(svg, x, 50, f(z[i]), { size: 18 });
          t.style.cursor = 'pointer';
          var flip = function () { z[i] = -z[i]; draw(); if (o.onChange) o.onChange(z, g); };
          cell.addEventListener('click', flip);
          t.addEventListener('click', flip);
        })(i);
        txt(svg, x, 110, f(Math.max(0, z[i])), { fill: on ? C.blue : C.muted });
        txt(svg, x, 170, f(g[i]), { fill: C.muted });
        mk('rect', { x: x - 28, y: 210, width: 56, height: 40, rx: 8, fill: on ? '#f7e6e3' : '#f1efe9', stroke: on ? C.red : C.line, 'stroke-width': 2 }, svg);
        txt(svg, x, 230, f(on ? g[i] : 0), { fill: on ? C.red : C.muted });
      }
    }
    draw();
    return { z: function () { return z; }, g: function () { return g; } };
  }

  /* ---------- softmax with cross-entropy ---------- */
  function softmax(zs) {
    var mx = Math.max.apply(null, zs), e = zs.map(function (v) { return Math.exp(v - mx); });
    var s = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (v) { return v / s; });
  }
  function softmaxScene(el, o) {
    o = o || {};
    var names = ['cat', 'dog', 'bird'];
    var zs = o.z ? o.z.slice() : [1, 0.5, -1], y = o.y == null ? 0 : o.y;
    var tabs = row(el), tb = [];
    names.forEach(function (nm, k) {
      tb.push(M4.button(tabs, nm, function () { y = k; draw(); }));
    });
    var svg = svgRoot(el, 480, 280);
    var chips = row(el);
    var cL = chip(chips, 'loss −log p', C.ink);
    var box = ctl(el);
    var sl = zs.map(function (v, k) {
      return M4.slider(box, { min: -3, max: 3, step: 0.1, value: v, label: '\\(z_{\\text{' + names[k] + '}}\\)', format: function (u) { return f(u, 1); }, onInput: function (u) { zs[k] = u; draw(); } });
    });
    function draw() {
      tb.forEach(function (b, k) { b.classList.toggle('primary', k === y); });
      clear(svg);
      var p = softmax(zs);
      var base = 128, H = 100;
      // axis
      mk('line', { x1: 20, y1: base, x2: 460, y2: base, stroke: C.line, 'stroke-width': 2 }, svg);
      names.forEach(function (nm, k) {
        var cx = 90 + k * 150;
        var py = p[k], yy = k === y ? 1 : 0, d = py - yy;
        // p bar
        mk('rect', { x: cx - 58, y: base - py * H, width: 34, height: Math.max(1, py * H), fill: C.blue, rx: 3 }, svg);
        txt(svg, cx - 41, base - py * H - 12, f(py), { size: 16, fill: C.blue });
        // y bar (outline)
        if (yy) mk('rect', { x: cx - 17, y: base - H, width: 34, height: H, fill: 'none', stroke: C.green, 'stroke-width': 2.5, rx: 3 }, svg);
        txt(svg, cx, base - yy * H - 12, String(yy), { size: 16, fill: C.green });
        // p - y bar, drawn from the axis
        var h = d * H;
        mk('rect', { x: cx + 24, y: h >= 0 ? base - h : base, width: 34, height: Math.max(1, Math.abs(h)), fill: C.red, rx: 3 }, svg);
        txt(svg, cx + 41, h >= 0 ? base - h - 12 : base - h + 14, f(d), { size: 16, fill: C.red });
        txt(svg, cx, 270, nm, { size: 20, fill: k === y ? C.ink : C.muted, weight: k === y ? 700 : 500 });
      });
      cL(f(-Math.log(p[y]), 3));
      if (o.onChange) o.onChange(p, y);
    }
    var leg = M4.el('p', { class: 'm4-cap', style: 'text-align:center' }, el);
    leg.innerHTML = '<b style="color:' + C.blue + '">Blue</b> the probability \\(p\\), <b style="color:' + C.green + '">green</b> the one-hot target \\(y\\), <b style="color:' + C.red + '">red</b> the gradient \\(p - y\\) on each logit.';
    M4.typeset(leg);
    draw();
    return { sliders: sl };
  }

  /* ---------- an autograd tape ---------- */
  function tapeScene(el) {
    var W = 2, X = 3, B = 1, T = 4;
    var U = W * X, Z = U + B, E = Z - T, L = E * E;
    var ops = [
      { op: 'u = w · x', val: U, grads: ['w̄ = ū · x = ' + f(2 * E * X), 'x̄ = ū · w = ' + f(2 * E * W)] },
      { op: 'z = u + b', val: Z, grads: ['ū = z̄ = ' + f(2 * E), 'b̄ = z̄ = ' + f(2 * E)] },
      { op: 'e = z − t', val: E, grads: ['z̄ = ē = ' + f(2 * E), 't̄ = −ē = ' + f(-2 * E)] },
      { op: 'L = e²', val: L, grads: ['ē = 2e · L̄ = ' + f(2 * E)] }
    ];
    var head = M4.el('p', { style: 'text-align:center;margin:0 0 8px' }, el);
    head.innerHTML = '\\(w = ' + W + ',\\ x = ' + X + ',\\ b = ' + B + ',\\ t = ' + T + '\\)';
    M4.typeset(head);
    var table = M4.el('div', { style: 'max-width:600px;margin:0 auto;display:grid;grid-template-columns:auto auto 1fr;gap:6px clamp(8px,2.5vw,14px);font-size:clamp(15px,4vw,17px);align-items:center' }, el);
    ['#', 'forward', 'backward'].forEach(function (h) {
      M4.el('div', { text: h, style: 'font-size:15px;color:' + C.muted }, table);
    });
    var cells = ops.map(function (o, i) {
      var n = M4.el('div', { text: String(i + 1), style: 'color:' + C.muted }, table);
      var a = M4.el('div', { style: 'padding:6px 10px;border-radius:8px;border:2px solid transparent;white-space:nowrap' }, table);
      var b = M4.el('div', { style: 'padding:6px 10px;border-radius:8px;border:2px solid transparent;color:' + C.red }, table);
      return { n: n, a: a, b: b };
    });
    var bar = row(el);
    var cap = M4.el('p', { style: 'text-align:center;min-height:56px;margin:12px auto 0;max-width:560px' }, el);
    var leg = M4.el('p', { class: 'm4-cap', style: 'text-align:center' }, el);
    leg.innerHTML = 'A bar over a variable, as in \\(\\bar{u}\\), stands for \\(\\partial L / \\partial u\\).';
    M4.typeset(leg);
    var s = 0, last = 2 * ops.length;
    var next = M4.button(bar, 'Next step', function () { if (s < last) { s++; paint(); } }, { primary: true });
    M4.button(bar, 'Reset', function () { s = 0; paint(); });
    function paint() {
      cells.forEach(function (c, i) {
        var rec = s > i, back = s - ops.length >= ops.length - i;
        c.a.textContent = rec ? ops[i].op + '  →  ' + f(ops[i].val) : '';
        c.b.innerHTML = back ? ops[i].grads.map(function (g) { return '<span style="display:inline-block;white-space:nowrap;margin-right:14px">' + g + '</span>'; }).join('') : '';
        var activeF = s <= ops.length && s === i + 1;
        var activeB = s > ops.length && s - ops.length === ops.length - i;
        c.a.style.borderColor = activeF ? C.ink : 'transparent';
        c.b.style.borderColor = activeB ? C.red : 'transparent';
        c.a.style.background = rec ? '#fff' : 'transparent';
      });
      var msg;
      if (s === 0) msg = 'The tape is empty. The forward pass will record every operation together with the values it needs later.';
      else if (s <= ops.length) msg = s < ops.length ? 'Operation ' + s + ' runs and is appended to the tape.' : 'The forward pass is done and \\(L = ' + L + '\\). Calling <code>backward()</code> starts with \\(\\bar{L} = 1\\).';
      else {
        var k = ops.length - (s - ops.length) + 1;
        msg = s < last ? 'The tape is read in reverse. Record ' + k + ' turns the gradient of its output into gradients of its inputs.' : 'Every leaf now holds its gradient, for example \\(\\bar{w} = 2 e x = ' + (2 * E * X) + '\\).';
      }
      cap.innerHTML = msg;
      M4.typeset(cap);
      next.disabled = s === last;
    }
    paint();
  }

  /* ---------- generated practice ---------- */
  function gen() {
    var kind = M4.pick(['shape', 'wtd', 'relu', 'soft', 'tape']);
    if (kind === 'shape') {
      var m = M4.rand(2, 8), n = M4.rand(2, 9), ask = M4.pick(['W', 'x']);
      return ask === 'W' ? {
        q: 'A layer computes \\(y = W x\\) with \\(W\\) of shape \\(' + m + ' \\times ' + n + '\\). How many entries does \\(\\partial L / \\partial W\\) have?',
        answer: m * n, hint: 'The gradient with respect to a parameter has the shape of that parameter.',
        explain: '\\(\\partial L / \\partial W\\) has the shape of \\(W\\), so \\(' + m + ' \\cdot ' + n + ' = ' + (m * n) + '\\) entries.'
      } : {
        q: 'A layer computes \\(y = W x\\) with \\(W\\) of shape \\(' + m + ' \\times ' + n + '\\). How many entries does \\(\\partial L / \\partial x = W^\\top \\delta\\) have?',
        answer: n, hint: '\\(W^\\top\\) has shape \\(' + n + ' \\times ' + m + '\\).',
        explain: '\\(W^\\top\\) is \\(' + n + ' \\times ' + m + '\\) and \\(\\delta\\) has \\(' + m + '\\) entries, so the result has \\(' + n + '\\), one per input.'
      };
    }
    if (kind === 'wtd') {
      var a = M4.randNZ(-3, 3), b = M4.randNZ(-3, 3), c = M4.randNZ(-3, 3), d = M4.randNZ(-3, 3);
      var d1 = M4.randNZ(-2, 2), d2 = M4.randNZ(-2, 2), j = M4.pick([1, 2]);
      var ans = j === 1 ? a * d1 + c * d2 : b * d1 + d * d2;
      return {
        q: 'For \\(y = W x\\) with \\(W = \\begin{pmatrix} ' + a + ' & ' + b + ' \\\\ ' + c + ' & ' + d + ' \\end{pmatrix}\\) and \\(\\delta = \\partial L / \\partial y = (' + d1 + ', ' + d2 + ')\\), compute entry ' + j + ' of \\(\\partial L / \\partial x\\).',
        answer: ans, hint: 'Entry ' + j + ' of \\(W^\\top \\delta\\) is column ' + j + ' of \\(W\\) dotted with \\(\\delta\\).',
        explain: 'Column ' + j + ' of \\(W\\) is \\((' + (j === 1 ? a + ', ' + c : b + ', ' + d) + ')\\). Its dot product with \\(\\delta\\) is \\(' + ans + '\\).'
      };
    }
    if (kind === 'relu') {
      var zz = [], gg = [];
      for (var i = 0; i < 4; i++) { zz.push(M4.randNZ(-4, 4)); gg.push(M4.randNZ(-3, 3)); }
      var k = M4.rand(1, 4), on = zz[k - 1] > 0;
      return {
        q: 'A ReLU layer receives \\(z = (' + zz.join(', ') + ')\\), and the upstream gradient is \\((' + gg.join(', ') + ')\\). What gradient reaches \\(z_' + k + '\\)?',
        answer: on ? gg[k - 1] : 0, hint: 'ReLU passes the gradient where \\(z > 0\\) and blocks it elsewhere.',
        explain: on ? '\\(z_' + k + ' = ' + zz[k - 1] + ' > 0\\), so the upstream \\(' + gg[k - 1] + '\\) passes through.' : '\\(z_' + k + ' = ' + zz[k - 1] + ' \\le 0\\), so the gradient is \\(0\\).'
      };
    }
    if (kind === 'soft') {
      var sets = [[0.7, 0.2, 0.1], [0.5, 0.3, 0.2], [0.6, 0.3, 0.1], [0.25, 0.25, 0.5], [0.1, 0.8, 0.1], [0.4, 0.4, 0.2]];
      var p = M4.pick(sets), yy = M4.rand(1, 3), kk = M4.rand(1, 3);
      var v = p[kk - 1] - (kk === yy ? 1 : 0);
      return {
        q: 'Softmax outputs \\(p = (' + p.join(', ') + ')\\), and the correct class is ' + yy + '. With cross-entropy loss, what is \\(\\partial L / \\partial z_' + kk + '\\)?',
        answer: v, tol: 0.001, hint: 'The gradient on logit \\(k\\) is \\(p_k - y_k\\).',
        explain: '\\(p_' + kk + ' - y_' + kk + ' = ' + p[kk - 1] + ' - ' + (kk === yy ? 1 : 0) + ' = ' + f(v) + '\\).'
      };
    }
    var w = M4.randNZ(-2, 3), x = M4.randNZ(-3, 3), bb = M4.rand(-2, 2), t = M4.rand(-3, 3);
    var e = w * x + bb - t;
    return {
      q: 'For \\(L = (w x + b - t)^2\\) with \\(w = ' + w + '\\), \\(x = ' + x + '\\), \\(b = ' + bb + '\\), \\(t = ' + t + '\\), compute \\(\\partial L / \\partial w\\).',
      answer: 2 * e * x, hint: 'Let \\(e = w x + b - t\\). Then \\(\\partial L / \\partial w = 2 e x\\).',
      explain: '\\(e = ' + e + '\\), so \\(2 e x = 2 \\cdot ' + M4.sn(e) + ' \\cdot ' + M4.sn(x) + ' = ' + (2 * e * x) + '\\).'
    };
  }

  M4.lesson({
    id: 'bp-s2',
    module: 'backprop',
    title: 'Vectors, masks and the autograd tape',
    summary: 'Backpropagation with whole vectors: shapes, the transpose, ReLU masks, the softmax gradient, and the tape that autograd libraries record.',
    minutes: 17,
    steps: [
      {
        kind: 'text',
        title: 'Gradient shapes',
        html: '<p>A network computes one scalar loss \\(L\\) from many numbers. For every array \\(A\\) in the network, the gradient \\(\\partial L / \\partial A\\) holds one partial derivative per entry of \\(A\\), so it has the same shape as \\(A\\).</p>' +
          '<p>For a linear layer \\(y = W x\\) with \\(W \\in \\mathbb{R}^{m \\times n}\\), write \\(\\delta = \\partial L / \\partial y\\), a vector with \\(m\\) entries. Entry \\(x_j\\) influences every \\(y_i\\) through the weight \\(W_{ij}\\), and the influences add up:</p>' +
          '\\[ \\frac{\\partial L}{\\partial x_j} = \\sum_i W_{ij}\\, \\delta_i \\quad\\Longrightarrow\\quad \\frac{\\partial L}{\\partial x} = W^\\top \\delta. \\]' +
          '<p>The transpose appears because the backward pass runs the layer in the opposite direction, from \\(m\\) outputs to \\(n\\) inputs.</p>'
      },
      {
        kind: 'explore',
        title: 'Shapes in the backward pass',
        html: '<p>Change the number of outputs and inputs. Every shape adjusts to match.</p>',
        mount: function (el) { shapeScene(el); }
      },
      {
        kind: 'exercise',
        title: 'Shape of a weight gradient',
        html: '<p>A layer maps \\(512\\) inputs to \\(10\\) outputs with \\(y = W x\\). What is the shape of \\(\\partial L / \\partial W\\)?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['\\(10 \\times 512\\)', '\\(512 \\times 10\\)', '\\(10\\)', '\\(512\\)'],
            correct: 0,
            onCorrect: function () { ctx.solved('\\(W\\) is \\(10 \\times 512\\), and the gradient has the same shape. If code produces a \\(512 \\times 10\\) array here, a transpose is missing.'); },
            onWrong: function () { ctx.wrong(); }
          });
        }
      },
      {
        kind: 'text',
        title: 'ReLU as a mask',
        html: '<p>ReLU acts on every entry separately, \\(h_i = \\max(0, z_i)\\). Its local gradient is \\(1\\) where \\(z_i > 0\\) and \\(0\\) elsewhere. In the backward pass the upstream gradient is therefore multiplied entrywise by a mask of zeros and ones:</p>' +
          '\\[ \\frac{\\partial L}{\\partial z} = \\frac{\\partial L}{\\partial h} \\odot \\mathbb{1}[z > 0]. \\]' +
          '<p>A unit that was silent in the forward pass receives no gradient, so its incoming weights do not change on this example.</p>'
      },
      {
        kind: 'explore',
        title: 'ReLU gates',
        html: '<p>Each column is one unit. Flip the sign of a pre-activation and see which gradients reach \\(z\\).</p>',
        mount: function (el) { reluScene(el); }
      },
      {
        kind: 'exercise',
        title: 'A single active unit',
        html: '<p>Flip signs until exactly one unit passes its gradient back.</p>',
        hint: 'A unit passes its gradient when its pre-activation is positive.',
        mount: function (el, ctx) {
          var done = false;
          reluScene(el, {
            fixed: true, z: [2, -1, 3, 1, -2, 1], g: [1, -2, 2, -1, 3, 2],
            onChange: function (z) {
              if (done) return;
              var open = z.filter(function (v) { return v > 0; }).length;
              if (open !== 1) return;
              done = true;
              ctx.solved('Only one entry of the mask is \\(1\\). The other five units send nothing back.');
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Softmax and cross-entropy together',
        html: '<p>A classifier turns logits \\(z\\) into probabilities \\(p = \\operatorname{softmax}(z)\\) and pays \\(L = -\\log p_c\\) for the correct class \\(c\\). Differentiating the two steps separately produces a full Jacobian of the softmax. Differentiating them together gives a short result:</p>' +
          '\\[ \\frac{\\partial L}{\\partial z_k} = p_k - y_k, \\]' +
          '<p>where \\(y\\) is the one-hot vector of the correct class. The gradient pushes the correct logit up by \\(1 - p_c\\) and every other logit down by its own probability. Libraries fuse the two operations into one call, such as <code>cross_entropy</code> in PyTorch, for this reason and because it avoids taking the logarithm of a tiny probability.</p>'
      },
      {
        kind: 'explore',
        title: 'The softmax cross-entropy gradient',
        html: '<p>Choose the correct class with the buttons and move the logits. The red bars are the gradients on the logits.</p>',
        mount: function (el) { softmaxScene(el); }
      },
      {
        kind: 'exercise',
        title: 'Gradient for a given label',
        html: '<p>A model predicts \\(p = (0.7, 0.2, 0.1)\\), and the correct class is the second one. What is \\(\\partial L / \\partial z_2\\)?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['\\(0.2\\)', '\\(-0.8\\)', '\\(0.8\\)', '\\(-0.2\\)'],
            correct: 1,
            onCorrect: function () { ctx.solved('\\(p_2 - 1 = -0.8\\). Gradient descent subtracts the gradient, so \\(z_2\\) goes up.'); },
            onWrong: function () { ctx.wrong(); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Reverse mode and the tape',
        html: '<p>There are two ways to apply the chain rule to a graph. <b>Forward mode</b> pushes the derivative with respect to one input from left to right. It needs one pass per input. <b>Reverse mode</b>, which is backpropagation, pulls the derivative of one output from right to left. It needs one pass per output.</p>' +
          '<p>A network has millions of parameters and one loss, so reverse mode wins by a factor of millions. A single backward pass costs about as much as one or two forward passes and returns the gradient for every parameter at once.</p>' +
          '<p>Autograd libraries implement reverse mode with a <b>tape</b>. During the forward pass every operation is recorded together with the values its local gradient will need. <code>backward()</code> walks the tape in reverse order.</p>'
      },
      {
        kind: 'explore',
        title: 'Recording and replaying the tape',
        html: '<p>The loss \\(L = (w x + b - t)^2\\) as four recorded operations.</p>',
        mount: function (el) { tapeScene(el); }
      },
      {
        kind: 'exercise',
        title: 'Number of backward passes',
        html: '<p>A model has \\(10^6\\) parameters and one scalar loss. How many passes through the graph does forward mode need to compute the full gradient, and how many does reverse mode need?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['Forward \\(1\\), reverse \\(10^6\\)', 'Both need \\(1\\)', 'Forward \\(10^6\\), reverse \\(1\\)', 'Both need \\(10^6\\)'],
            correct: 2,
            onCorrect: function () { ctx.solved('Forward mode tracks one input direction per pass, reverse mode one output. With one loss, a single backward pass after the forward pass is enough.'); },
            onWrong: function () { ctx.wrong(); }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Vector gradients',
        html: '<p>Round to three decimals where needed.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 5, gen: gen }); }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>The gradient with respect to an array has the shape of that array. For \\(y = Wx\\), the backward pass gives \\(\\partial L / \\partial W = \\delta x^\\top\\) and \\(\\partial L / \\partial x = W^\\top \\delta\\).</li>' +
          '<li>ReLU passes the gradient through units that were active in the forward pass and blocks it everywhere else.</li>' +
          '<li>Softmax followed by cross-entropy has the gradient \\(p - y\\) on the logits. Reverse mode records a tape in the forward pass and returns the gradient for every parameter in one backward pass.</li></ul>'
      }
    ]
  });
})();
