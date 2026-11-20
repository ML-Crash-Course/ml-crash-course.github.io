/* Residual connections: y = x + F(x), why the identity path keeps gradients alive, and how to differentiate a residual block. */
(function () {
  'use strict';
  var M4 = window.M4;
  if (!M4 || !M4.lesson) return;
  var C = M4.colors;
  var R = M4.rand, pick = M4.pick;

  function readout(parent, items) {
    var row = M4.el('div', { class: 'm4-readout' }, parent), vals = {};
    items.forEach(function (it) {
      var sp = M4.el('span', null, row);
      var l = M4.el('span', { html: it[1] + ' = ' }, sp); M4.typeset(l);
      vals[it[0]] = M4.el('b', { text: '0' }, sp);
    });
    return function (k, v) { vals[k].textContent = typeof v === 'string' ? v : M4.fmt(v, 3); };
  }
  function relu(z) { return z > 0 ? z : 0; }
  function sci(v) {
    if (v === 0) return '0';
    var e = Math.floor(Math.log10(Math.abs(v)));
    if (e >= -2 && e <= 3) return M4.fmt(v, 3);
    var sup = String(e).replace(/-/g, '⁻').replace(/[0-9]/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]; });
    return M4.fmt(v / Math.pow(10, e), 2) + ' × 10' + sup;
  }

  /* ---------- gradient size versus depth ---------- */
  function depthPlot(el) {
    var L = 40;
    var p = M4.plane(el, { xmin: 0, xmax: L, ymin: -8, ymax: 8, width: 560, height: 340 });
    p.text(1, 7.2, 'log₁₀ of the gradient size', { size: 14, fill: C.muted, anchor: 'start' });
    p.text(L - 1, 7.3, 'number of layers the gradient passes', { size: 14, fill: C.muted, anchor: 'end' });
    var plain = p.path([], { stroke: C.red, width: 3 });
    var res = p.path([], { stroke: C.green, width: 3 });
    var lp = p.text(0, 0, 'plain', { size: 15, fill: C.red, weight: 600, anchor: 'end', halo: true });
    var lr = p.text(0, 0, 'residual', { size: 15, fill: C.green, weight: 600, anchor: 'end', halo: true });
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;gap:28px' }, el);
    var set = readout(el, [['p', 'plain, 40 layers'], ['r', 'residual, 40 blocks']]);
    function clampY(v) { return Math.max(-8, Math.min(8, v)); }
    function upd() {
      var a = sa.get(), b = sb.get(), P = [], Q = [];
      for (var k = 0; k <= L; k++) {
        P.push([k, clampY(k * Math.log10(Math.abs(a)))]);
        Q.push([k, clampY(k * Math.log10(Math.abs(1 + b)))]);
      }
      plain.set(P); res.set(Q);
      lp.set(L - 0.5, Math.max(-6.6, Math.min(6.6, P[L][1] + 0.7)));
      lr.set(L - 0.5, Math.max(-6.6, Math.min(6.6, Q[L][1] + 0.7)));
      set('p', sci(Math.pow(a, L))); set('r', sci(Math.pow(1 + b, L)));
    }
    var sa = M4.slider(row, { label: 'plain layer derivative \\(a\\)', min: 0.3, max: 1.3, step: 0.01, value: 0.6, onInput: upd });
    var sb = M4.slider(row, { label: 'branch derivative \\(b\\)', min: -0.3, max: 0.3, step: 0.01, value: 0.02, onInput: upd });
    upd();
    M4.typeset(M4.el('p', { class: 'm4-cap', html: 'Each plain layer multiplies the gradient by \\(a\\). Each residual block multiplies it by \\(1 + b\\). The vertical axis is logarithmic, so a straight line means exponential growth or decay.' }, el));
  }

  /* ---------- path expansion through three blocks ---------- */
  function paths(el) {
    var vals = [0.5, -0.4, 0.3], names = ['a', 'b', 'c'];
    var p = M4.plane(el, { xmin: 0, xmax: 10, ymin: 0, ymax: 4, width: 600, height: 240, grid: false, axes: false, labels: false });
    var X = [0.7, 3.6, 6.4, 9.3], Y0 = 2.2;
    function seg(k, branch) {
      var a = X[k], b = X[k + 1];
      return branch ? [[a, Y0], [a + 0.5, 1.0], [b - 0.5, 1.0], [b, Y0]] : [[a, Y0], [a + 0.5, 3.3], [b - 0.5, 3.3], [b, Y0]];
    }
    var base = [], hi = [];
    for (var k = 0; k < 3; k++) {
      base.push(p.path(seg(k, false), { stroke: C.line, width: 3 }), p.path(seg(k, true), { stroke: C.line, width: 3 }));
      p.text((X[k] + X[k + 1]) / 2, 3.55, 'skip: ×1', { size: 14, fill: C.muted });
      p.text((X[k] + X[k + 1]) / 2, 0.55, 'F' + (k + 1) + ': ×' + names[k], { size: 14, fill: C.muted });
      hi.push(p.path([], { stroke: C.orange, width: 6 }));
    }
    var labs = ['x', 'h₁', 'h₂', 'y'];
    X.forEach(function (x, i) { p.point(x, Y0, { r: 16, color: C.ink }); p.text(x, Y0 + 0.02, labs[i], { size: 15, fill: '#fff', weight: 600 }); });
    var sum = M4.el('p', { style: 'text-align:center;font-size:18px;margin:8px 0' }, el);
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, el), btns = [];
    var seen = {};
    function term(mask) {
      var t = 1, s = [];
      for (var k = 0; k < 3; k++) if (mask & (1 << k)) { t *= vals[k]; s.push(names[k]); }
      return { v: t, s: s.length ? s.join('') : '1' };
    }
    function show(mask) {
      for (var k = 0; k < 3; k++) hi[k].set(seg(k, !!(mask & (1 << k))));
      btns.forEach(function (b, i) { b.className = 'm4-btn' + (i === mask ? ' primary' : ''); });
      seen[mask] = true;
      var n = Object.keys(seen).length, tot = 0, parts = [];
      for (var m = 0; m < 8; m++) { var t = term(m); tot += t.v; parts.push(t.s); }
      var cur = term(mask);
      sum.innerHTML = 'This path contributes \\(' + cur.s + ' = ' + M4.fmt(cur.v, 3) + '\\). Paths visited: ' + n + ' of 8.' +
        (n === 8 ? '<br>Sum of all eight: \\(' + parts.join(' + ') + ' = ' + M4.fmt(tot, 3) + ' = (1+a)(1+b)(1+c)\\).' : '');
      M4.typeset(sum);
    }
    for (var m = 0; m < 8; m++) (function (m) { btns.push(M4.button(row, term(m).s, function () { show(m); })); })(m);
    M4.typeset(M4.el('p', { class: 'm4-cap', html: 'Here \\(a = 0.5\\), \\(b = -0.4\\) and \\(c = 0.3\\) are the derivatives of the three branches. Each button picks one route from \\(x\\) to \\(y\\).' }, el));
    show(0);
  }

  /* ---------- problems ---------- */
  function scalarBlock(back) {
    var x = pick([-2, -1, 1, 2, 3]), w1 = pick([-2, -1, 1, 2, 3]), w2 = pick([-2, -1, 1, 2]);
    var z = w1 * x, on = z > 0 ? 1 : 0, d = 1 + w2 * w1 * on;
    var blk = '\\(y = x + w_2\\,\\mathrm{ReLU}(w_1 x)\\) with \\(w_1 = ' + w1 + '\\), \\(w_2 = ' + w2 + '\\) at \\(x = ' + x + '\\)';
    var why = 'The pre activation is \\(w_1 x = ' + z + '\\), so the ReLU is ' + (on ? 'on and passes slope 1' : 'off and passes slope 0') + '. \\(\\partial y/\\partial x = 1 + w_2 \\cdot ' + on + ' \\cdot w_1 = ' + d + '\\).';
    if (!back) return { q: 'A residual block ' + blk + '. What is \\(\\partial y/\\partial x\\)?', answer: d, tol: 1e-6, explain: why };
    var g = pick([-2, 1, 2, 3]);
    return { q: 'A residual block ' + blk + '. The gradient arriving from above is \\(\\partial L/\\partial y = ' + g + '\\). What is \\(\\partial L/\\partial x\\)?', answer: g * d, tol: 1e-6, explain: why + ' Multiply by the upstream gradient: \\(' + g + ' \\cdot ' + d + ' = ' + g * d + '\\).' };
  }
  function m2(M) { return '\\begin{pmatrix}' + M[0][0] + ' & ' + M[0][1] + '\\\\ ' + M[1][0] + ' & ' + M[1][1] + '\\end{pmatrix}'; }
  function v2(v) { return '\\begin{pmatrix}' + v[0] + '\\\\ ' + v[1] + '\\end{pmatrix}'; }
  function jacProb() {
    var W1, x, z, m;
    do {
      W1 = [[R(-2, 2), R(-2, 2)], [R(-2, 2), R(-2, 2)]]; x = [R(-2, 2), R(-2, 2)];
      z = [W1[0][0] * x[0] + W1[0][1] * x[1], W1[1][0] * x[0] + W1[1][1] * x[1]];
    } while (z[0] === 0 || z[1] === 0 || (z[0] > 0) === (z[1] > 0));
    m = [z[0] > 0 ? 1 : 0, z[1] > 0 ? 1 : 0];
    var W2 = [[R(-2, 2), R(-2, 2)], [R(-2, 2), R(-2, 2)]];
    var J = [[0, 0], [0, 0]];
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      var s = 0; for (var k = 0; k < 2; k++) s += W2[i][k] * m[k] * W1[k][j];
      J[i][j] = (i === j ? 1 : 0) + s;
    }
    var i0 = R(0, 1), j0 = R(0, 1);
    return {
      q: 'A residual block \\(\\mathbf y = \\mathbf x + W_2\\,\\mathrm{ReLU}(W_1 \\mathbf x)\\) has \\(W_1 = ' + m2(W1) + '\\), \\(W_2 = ' + m2(W2) + '\\) and input \\(\\mathbf x = ' + v2(x) + '\\). What is the entry \\(J_{' + (i0 + 1) + (j0 + 1) + '} = \\partial y_' + (i0 + 1) + '/\\partial x_' + (j0 + 1) + '\\) of its Jacobian?',
      answer: J[i0][j0], tol: 1e-6,
      hint: 'First find which ReLU units are on: compute \\(W_1\\mathbf x\\). Then \\(J = I + W_2\\,\\mathrm{diag}(\\mathbf m)\\,W_1\\).',
      explain: '\\(W_1\\mathbf x = ' + v2(z) + '\\), so the mask is \\(\\mathbf m = ' + v2(m) + '\\). Only unit ' + (m[0] ? 1 : 2) + ' is on, which keeps column ' + (m[0] ? 1 : 2) + ' of \\(W_2\\) and row ' + (m[0] ? 1 : 2) + ' of \\(W_1\\). \\(J = I + W_2\\,\\mathrm{diag}(\\mathbf m)\\,W_1 = ' + m2(J) + '\\).'
    };
  }
  function pathProb() {
    if (Math.random() < 0.5) {
      var L = R(3, 10);
      return { q: 'A gradient travels backward through ' + L + ' residual blocks. Each block offers two routes, the skip and the branch. How many distinct routes lead from the output back to the input?', answer: Math.pow(2, L), tol: 0, explain: 'Each block contributes a factor \\((1 + b_k)\\), and expanding the product of ' + L + ' such factors gives \\(2^{' + L + '} = ' + Math.pow(2, L) + '\\) terms.' };
    }
    var a = pick([0.5, -0.5, 0.2, 1]), b = pick([0.5, -0.5, 2, -0.2]), c = pick([1, 0.5, -1]);
    var v = (1 + a) * (1 + b) * (1 + c);
    return { q: 'Three residual blocks are stacked. Their branch derivatives at the current input are \\(' + a + '\\), \\(' + b + '\\) and \\(' + c + '\\). What is \\(\\partial y/\\partial x\\) through the whole stack?', answer: v, tol: 1e-4, explain: '\\((1 + ' + a + ')(1 + ' + b + ')(1 + ' + c + ') = ' + M4.fmt(v, 4) + '\\). Note what happens when a branch derivative equals \\(-1\\): that block blocks the gradient completely.' };
  }
  function mixGen() {
    var k = pick(['s', 'b', 'b', 'j', 'p']);
    return k === 's' ? scalarBlock(false) : k === 'b' ? scalarBlock(true) : k === 'j' ? jacProb() : pathProb();
  }

  M4.lesson({
    id: 'res-s1',
    module: 'norm',
    title: 'Residual connections',
    summary: 'A skip connection adds the input of a block to its output. Its derivative adds an identity, which keeps gradients alive in very deep networks.',
    minutes: 16,
    steps: [
      {
        kind: 'text',
        title: 'Add the input back',
        html: '<p>A residual block computes \\[\\mathbf y = \\mathbf x + F(\\mathbf x),\\] where \\(F\\) is a small network, for example \\(F(\\mathbf x) = W_2\\,\\mathrm{ReLU}(W_1\\mathbf x)\\). The block only has to learn the change \\(F\\) it wants to make to \\(\\mathbf x\\). If the best thing is to do nothing, \\(F = 0\\) is enough, and small weights already come close.</p>' +
          '<p>Every transformer layer and every ResNet is built this way. The reason is the backward pass. By the <a href="#/l/bp-s1">chain rule</a>, the gradient that reaches the first layer of a plain deep network is a product of one factor per layer, and a product of many factors drifts to zero or explodes.</p>'
      },
      {
        kind: 'explore',
        title: 'Products of many factors',
        html: '<p>Suppose each plain layer multiplies the gradient by the same number \\(a\\), and each residual block by \\(1 + b\\), where \\(b\\) is the derivative of its branch. Move the sliders. For the plain network, anything except \\(a\\) very close to 1 vanishes or explodes after 40 layers. For the residual network, a branch with small weights gives \\(b \\approx 0\\), and \\(1 + b \\approx 1\\) passes the gradient almost unchanged.</p>',
        mount: function (el) { depthPlot(el); }
      },
      {
        kind: 'text',
        title: 'Differentiating a residual block',
        html: '<p>Take the scalar block \\(y = x + w_2\\,\\mathrm{ReLU}(w_1 x)\\). The derivative of a sum is the sum of the derivatives: \\[\\frac{\\partial y}{\\partial x} = 1 + w_2 \\cdot \\mathbb 1[w_1 x > 0] \\cdot w_1.\\] The 1 comes from the skip, the rest from the branch, exactly as in the <a href="#/l/bp-s1">chain rule</a> for any composition. When the ReLU is off, the branch contributes nothing, but the derivative is still 1.</p>' +
          '<p>For vectors the same computation gives a Jacobian with an identity added: \\[J = \\frac{\\partial \\mathbf y}{\\partial \\mathbf x} = I + W_2\\,\\mathrm{diag}(\\mathbf m)\\,W_1, \\qquad \\mathbf m = \\mathbb 1[W_1\\mathbf x > 0].\\] In the backward pass the upstream gradient \\(\\mathbf g = \\partial L/\\partial \\mathbf y\\) becomes \\[\\frac{\\partial L}{\\partial \\mathbf x} = J^\\top \\mathbf g = \\mathbf g + W_1^\\top\\big(\\mathbf m \\odot W_2^\\top \\mathbf g\\big).\\] The first term is the gradient copied straight through the skip. See the <a href="#/l/mv-drill">matrix calculus drills</a> if the transposes are unfamiliar.</p>'
      },
      {
        kind: 'exercise',
        title: 'Differentiate a scalar block',
        html: '<p>Compute the derivative of a residual block, then push an upstream gradient through it. Get four right.</p>',
        hint: 'Check the sign of \\(w_1 x\\) first. If it is positive, \\(\\partial y/\\partial x = 1 + w_2 w_1\\). Otherwise it is 1.',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: function () { return scalarBlock(Math.random() < 0.5); } }); }
      },
      {
        kind: 'explore',
        title: 'Many short paths',
        html: '<p>Three blocks in a row give \\(\\partial y/\\partial x = (1+a)(1+b)(1+c)\\). Multiplying out produces eight terms, and each term is one route through the network: at every block the gradient either takes the skip, which multiplies by 1, or the branch. Click all eight routes. The route \\(1\\) never touches a branch, so it survives even when every branch has a tiny derivative.</p>',
        mount: function (el) { paths(el); }
      },
      {
        kind: 'exercise',
        title: 'The Jacobian of a vector block',
        html: '<p>Two inputs, two hidden units. Find which ReLU is on, then compute one entry of \\(J = I + W_2\\,\\mathrm{diag}(\\mathbf m)\\,W_1\\). Get three right.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 3, gen: jacProb }); }
      },
      {
        kind: 'exercise',
        title: 'Residual practice',
        html: '<p>A mix of scalar blocks, backward passes, Jacobians and stacks. Get five right.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 5, gen: mixGen }); }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>A residual block computes \\(\\mathbf y = \\mathbf x + F(\\mathbf x)\\), so the branch only learns a correction.</li>' +
          '<li>Its Jacobian is \\(I + J_F\\). The backward pass adds the upstream gradient to whatever the branch sends back.</li>' +
          '<li>Through \\(L\\) blocks the gradient is a sum over \\(2^L\\) routes, and the route through all skips carries the gradient unchanged.</li>' +
          '<li>With small branch weights, a deep residual network starts close to the identity, which is a safe place to begin training.</li>' +
          '</ul><p>Grind more of these in the <a href="#/l/norm-drill">normalization and residual drills</a>.</p>'
      }
    ]
  });
})();
