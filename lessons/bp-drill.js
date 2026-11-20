/* Backpropagation drill: endless problems, from two gates up to matrices and residual blocks. */
(function () {
  'use strict';
  var D = M4.D, C = M4.colors, V = D.V, K = D.K, op = D.op, T = D.T, TT = D.TT;
  var R = M4.rand, RN = M4.randNZ, pick = M4.pick;

  function sane(G, lim) {
    lim = lim || 60;
    return G.nodes.every(function (n) {
      if (Math.abs(n.val) > lim || (n.grad != null && Math.abs(n.grad) > 200)) return false;
      if (n.op === 'relu' && n.args[0].val === 0) return false;
      if (n.op === 'max' && n.args[0].val === n.args[1].val) return false;
      return true;
    });
  }
  function retry(make) { for (var i = 0; i < 200; i++) { var p = make(); if (p) return p; } return make(true); }

  // generic problem from an expression: value of f plus every partial
  function exprProblem(e, vals, o) {
    o = o || {};
    var G = D.graph(e, vals);
    if (!o.force && !sane(G, o.lim)) return null;
    var F = G.out.name, names = Object.keys(G.vars).sort();
    var fields = [{ label: T(F), answer: G.out.val }];
    if (o.table) {
      fields = [{ group: 'Forward pass' }];
      G.ops.forEach(function (n) { fields.push({ label: T(n.name), answer: n.val }); });
      fields.push({ group: 'Backward pass' });
      G.ops.slice().reverse().forEach(function (n) { if (n !== G.out) fields.push({ label: T(D.dd(F, n.name)), answer: n.grad }); });
    }
    names.forEach(function (v) { fields.push({ label: T(D.dd(F, v)), answer: G.vars[v].grad }); });
    var q = TT(F + ' = ' + D.tex(e)) + '<p class="m4-cap">with ' + names.map(function (v) { return T(v + ' = ' + D.t(vals[v])); }).join(', ') + '</p>';
    return {
      q: q,
      figure: function (el) { D.drawGraph(el, G, { numbers: true, maxW: o.maxW }); },
      fields: fields,
      solution: function (el) { D.solveGraph(el, G); }
    };
  }

  // random scalar expression over the given variables
  function randExpr(nGates, vars, binOps, unOps) {
    var leaves = vars.map(V);
    function leaf() { return Math.random() < 0.18 ? K(RN(-3, 3)) : pick(leaves); }
    function build(g) {
      if (g === 0) return leaf();
      if (unOps && unOps.length && Math.random() < 0.3) return op(pick(unOps), [build(g - 1)]);
      var left = R(0, g - 1);
      return op(pick(binOps), [build(left), build(g - 1 - left)]);
    }
    return build(nGates);
  }
  function usesAll(e, vars) {
    var s = D.tex(e); return vars.every(function (v) { return s.indexOf(v) >= 0; });
  }
  function randVals(vars, a, b) { var o = {}; vars.forEach(function (v) { o[v] = RN(a || -4, b || 4); }); return o; }

  /* ------------------------------------------------ levels */
  function lv1() {
    return retry(function () {
      var vars = pick([['x', 'y'], ['x', 'y', 'z']]);
      var e = randExpr(R(2, 3), vars, ['add', 'mul', 'mul', 'sub']);
      if (!usesAll(e, vars) || e.c != null || e.v != null) return null;
      return exprProblem(e, randVals(vars));
    });
  }
  function lv2() {
    return retry(function () {
      var vars = ['x', 'y'];
      var e = randExpr(R(3, 4), vars, ['add', 'mul', 'sub', 'max'], ['sq', 'relu']);
      if (!usesAll(e, vars) || e.c != null || !e.a) return null;
      var G = D.graph(e, {});
      if (!G.ops.some(function (n) { return n.op === 'sq' || n.op === 'relu' || n.op === 'max'; })) return null;
      if (!G.nodes.some(function (n) { return n.leaf && !n.konst && n.users.length > 1; }) && Math.random() < 0.6) return null;
      return exprProblem(e, randVals(vars, -3, 3), { lim: 40 });
    });
  }
  function lv3() {
    return retry(function () {
      var vars = pick([['x', 'y'], ['x', 'y', 'z']]);
      var e = randExpr(R(4, 5), vars, ['add', 'mul', 'sub', 'max'], ['sq', 'relu']);
      if (!usesAll(e, vars) || !e.a) return null;
      var p = exprProblem(e, randVals(vars, -3, 3), { table: true, lim: 50 });
      if (p) p.q += '<p class="m4-cap">Fill the whole table: every node forward, then every gradient backward.</p>';
      return p;
    });
  }

  // one neuron with squared error
  function lv4() {
    return retry(function () {
      var act = pick(['relu', 'sig', 'tanh', 'relu']);
      var x = RN(-3, 3), w = act === 'relu' ? RN(-3, 3) : pick([-1, -0.5, 0.5, 1]), b = act === 'relu' ? R(-3, 3) : pick([-1, -0.5, 0, 0.5, 1]), y = act === 'relu' ? R(-2, 4) : pick([0, 1, 0.5]);
      var u = op('mul', [V('w'), V('x')], 'u'), z = op('add', [u, V('b')], 'z'), a = op(act, [z], 'a'), r = op('sub', [a, V('y')], 'r'), L = op('sq', [r], 'L');
      var vals = { w: w, x: x, b: b, y: y };
      var G = D.graph(L, vals);
      var zv = G.nodes.filter(function (n) { return n.name === 'z'; })[0].val;
      if (!sane(G) || zv === 0 || (act === 'relu' && zv < 0 && Math.random() < 0.8)) return null;
      var N = {}; G.nodes.forEach(function (n) { N[n.name] = n; });
      var actT = { relu: '\\mathrm{ReLU}', sig: '\\sigma', tanh: '\\tanh' }[act];
      return {
        q: TT('L = \\big(' + actT + '(w x + b) - y\\big)^2') + '<p class="m4-cap">with ' + [T('w = ' + w), T('x = ' + x), T('b = ' + b), T('y = ' + y)].join(', ') + (act === 'sig' ? '. Use ' + T("\\sigma'(z) = \\sigma(z)(1-\\sigma(z))") : act === 'tanh' ? '. Use ' + T("\\tanh'(z) = 1 - \\tanh^2(z)") : '') + '</p>',
        figure: function (el) { D.drawGraph(el, G, { numbers: true }); },
        fields: [{ group: 'Forward pass' }, { label: T('z'), answer: N.z.val }, { label: T('a'), answer: N.a.val }, { label: T('L'), answer: N.L.val },
          { group: 'Backward pass' }, { label: T(D.dd('L', 'a')), answer: N.a.grad }, { label: T(D.dd('L', 'z')), answer: N.z.grad }, { label: T(D.dd('L', 'w')), answer: N.w.grad }, { label: T(D.dd('L', 'b')), answer: N.b.grad }],
        solution: function (el) { D.solveGraph(el, G); }
      };
    });
  }

  // two layer scalar network, one or two hidden units
  function lv5() {
    return retry(function () {
      var two = Math.random() < 0.6, x = RN(-2, 3), y = R(-3, 4);
      var vals = { x: x, y: y, w_1: RN(-2, 2), b_1: R(-2, 2), v_1: RN(-2, 2), c: R(-2, 2) };
      var X = V('x');
      var z1 = op('add', [op('mul', [V('w_1'), X], 'u_1'), V('b_1')], 'z_1'), h1 = op('relu', [z1], 'h_1');
      var out = op('mul', [V('v_1'), h1], 'q_1');
      if (two) {
        vals.w_2 = RN(-2, 2); vals.b_2 = R(-2, 2); vals.v_2 = RN(-2, 2);
        var z2 = op('add', [op('mul', [V('w_2'), X], 'u_2'), V('b_2')], 'z_2'), h2 = op('relu', [z2], 'h_2');
        out = op('add', [out, op('mul', [V('v_2'), h2], 'q_2')], 's');
      }
      var yh = op('add', [out, V('c')], '\\hat y'), L = op('hsq', [op('sub', [yh, V('y')], 'r')], 'L');
      var G = D.graph(L, vals);
      if (!sane(G)) return null;
      var N = {}; G.nodes.forEach(function (n) { N[n.name] = n; });
      var hs = two ? [1, 2] : [1];
      if (!hs.some(function (k) { return N['z_' + k].val > 0; })) return null;
      var f = [{ group: 'Forward pass' }];
      hs.forEach(function (k) { f.push({ label: T('h_' + k), answer: N['h_' + k].val }); });
      f.push({ label: T('\\hat y'), answer: N['\\hat y'].val }, { label: T('L'), answer: N.L.val }, { group: 'Backward pass' });
      f.push({ label: T(D.dd('L', '\\hat y')), answer: N['\\hat y'].grad }, { label: T(D.dd('L', 'x')), answer: N.x.grad });
      hs.forEach(function (k) { f.push({ label: T(D.dd('L', 'v_' + k)), answer: N['v_' + k].grad }); });
      hs.forEach(function (k) { f.push({ label: T(D.dd('L', 'w_' + k)), answer: N['w_' + k].grad }); });
      var form = two ? '\\hat y = v_1\\,\\mathrm{ReLU}(w_1 x + b_1) + v_2\\,\\mathrm{ReLU}(w_2 x + b_2) + c' : '\\hat y = v_1\\,\\mathrm{ReLU}(w_1 x + b_1) + c';
      return {
        q: TT(form) + TT('L = \\tfrac12(\\hat y - y)^2') + '<p class="m4-cap">with ' + Object.keys(vals).map(function (k) { return T(k + ' = ' + vals[k]); }).join(', ') + '</p>',
        figure: function (el) { D.drawGraph(el, G, { numbers: true, colW: 118, rowGap: 70 }); },
        fields: f,
        solution: function (el) { D.solveGraph(el, G, { gd: 1 }); }
      };
    });
  }

  // matrix network
  function lv6() {
    return retry(function () {
      var m = pick([2, 3]);
      var x = D.randVec(2, -2, 2, true), W = D.randMat(m, 2, -2, 2), b = D.randVec(m, -1, 1), w2 = D.randVec(m, -2, 2, true), b2 = R(-1, 1), y = R(-2, 3);
      var z = D.add(D.mv(W, x), b);
      if (z.some(function (v) { return v === 0; }) || !z.some(function (v) { return v > 0; }) || !z.some(function (v) { return v < 0; }) && Math.random() < 0.5) return null;
      var h = z.map(function (v) { return Math.max(0, v); }), yh = D.dot(w2, h) + b2, d = yh - y;
      if (Math.abs(yh) > 30 || d === 0) return null;
      var gw2 = D.scale(h, d), gh = D.scale(w2, d), mask = z.map(function (v) { return v > 0 ? 1 : 0; }), gz = gh.map(function (v, i) { return v * mask[i]; });
      var gW = D.outer(gz, x);
      return {
        q: TT('\\mathbf z = W\\mathbf x + \\mathbf b,\\quad \\mathbf h = \\mathrm{ReLU}(\\mathbf z),\\quad \\hat y = \\mathbf w_2^\\top \\mathbf h + b_2,\\quad L = \\tfrac12(\\hat y - y)^2') +
          TT('W = ' + D.mat(W) + ',\\; \\mathbf x = ' + D.vec(x) + ',\\; \\mathbf b = ' + D.vec(b) + ',\\; \\mathbf w_2 = ' + D.vec(w2) + ',\\; b_2 = ' + b2 + ',\\; y = ' + y),
        figure: function (el) { D.netDiagram(el, [2, m, 1], { labels: ['x', 'h', 'ŷ'], maxW: 420 }); },
        fields: [{ group: 'Forward pass' }, { label: T('\\mathbf z'), answer: z }, { label: T('\\mathbf h'), answer: h }, { label: T('\\hat y'), answer: yh },
          { group: 'Backward pass' }, { label: T('\\delta = \\partial L/\\partial \\hat y'), answer: d }, { label: T('\\partial L/\\partial \\mathbf w_2'), answer: gw2 }, { label: T('\\partial L/\\partial \\mathbf h'), answer: gh },
          { label: T('\\partial L/\\partial \\mathbf z'), answer: gz }, { label: T('\\partial L/\\partial W'), answer: gW }, { label: T('\\partial L/\\partial \\mathbf b'), answer: gz }],
        solution: '<div class="m4-drill-lines">' +
          TT('\\mathbf z = ' + D.mat(W) + D.vec(x) + ' + ' + D.vec(b) + ' = ' + D.vec(z)) +
          TT('\\mathbf h = \\mathrm{ReLU}(\\mathbf z) = ' + D.vec(h) + ',\\quad \\hat y = ' + D.rowv(w2) + D.vec(h) + ' + ' + D.pt(b2) + ' = ' + D.t(yh)) +
          TT('\\delta = \\hat y - y = ' + D.t(d)) +
          TT('\\frac{\\partial L}{\\partial \\mathbf w_2} = \\delta\\, \\mathbf h = ' + D.vec(gw2) + ',\\quad \\frac{\\partial L}{\\partial \\mathbf h} = \\delta\\, \\mathbf w_2 = ' + D.vec(gh)) +
          TT('\\frac{\\partial L}{\\partial \\mathbf z} = \\frac{\\partial L}{\\partial \\mathbf h} \\odot [\\mathbf z > 0] = ' + D.vec(gh) + ' \\odot ' + D.vec(mask) + ' = ' + D.vec(gz)) +
          TT('\\frac{\\partial L}{\\partial W} = \\frac{\\partial L}{\\partial \\mathbf z}\\, \\mathbf x^\\top = ' + D.vec(gz) + D.rowv(x) + ' = ' + D.mat(gW)) +
          TT('\\frac{\\partial L}{\\partial \\mathbf b} = \\frac{\\partial L}{\\partial \\mathbf z} = ' + D.vec(gz)) + '</div>' +
          '<p class="m4-cap">The outer product rule ' + T('\\partial L/\\partial W = \\boldsymbol\\delta\\,\\mathbf x^\\top') + ' is derived in <a href="#/l/mv-s5">Vector and matrix derivatives</a>. The full derivation for a layer is in <a href="#/l/l4-s3">Backpropagation through a layer</a>.</p>'
      };
    });
  }

  // softmax cross entropy from logits
  function niceLogits(k) {
    // logits where exp values give clean probabilities: use ln of small integers
    var ints = D.shuffle([1, 1, 2, 2, 3, 4, 5, 6]).slice(0, k);
    return ints;
  }
  function lv7() {
    var k = pick([3, 3, 4]), ints = niceLogits(k), s = ints.reduce(function (a, b) { return a + b; }, 0);
    var z = ints.map(Math.log), p = ints.map(function (v) { return v / s; }), y = R(0, k - 1), L = -Math.log(p[y]);
    var oh = p.map(function (_, i) { return i === y ? 1 : 0; }), g = p.map(function (v, i) { return v - oh[i]; });
    var zt = ints.map(function (v) { return v === 1 ? '0' : '\\log ' + v; });
    return {
      q: TT('\\mathbf z = ' + D.vec(zt) + ',\\quad \\text{true class } y = ' + (y + 1)) + '<p class="m4-cap">' + T('\\mathbf p = \\mathrm{softmax}(\\mathbf z)') + ' and ' + T('L = -\\log p_y') + '. The logits are logarithms so that ' + T('e^{z_i}') + ' is a whole number.</p>',
      fields: [{ label: T('\\mathbf p'), answer: p, tol: 0.011 }, { label: T('L'), answer: L, tol: 0.02 }, { label: T('\\partial L/\\partial \\mathbf z'), answer: g, tol: 0.011 }],
      cols: 1,
      solution: '<div class="m4-drill-lines">' +
        TT('e^{\\mathbf z} = ' + D.vec(ints) + ',\\quad \\textstyle\\sum_i e^{z_i} = ' + s + ',\\quad \\mathbf p = \\tfrac{1}{' + s + '}' + D.vec(ints) + ' = ' + D.vec(p) ) +
        TT('L = -\\log p_' + (y + 1) + ' = -\\log ' + D.t(p[y]) + ' = ' + D.t(L)) +
        TT('\\frac{\\partial L}{\\partial \\mathbf z} = \\mathbf p - \\mathbf e_' + (y + 1) + ' = ' + D.vec(p) + ' - ' + D.vec(oh) + ' = ' + D.vec(g)) + '</div>' +
        '<p class="m4-cap">Every wrong class gets pushed down by its probability, the true class gets pulled up by ' + T('1 - p_y') + '. The entries of the gradient always sum to zero.</p>'
    };
  }

  // linear layer into softmax cross entropy
  function lv8() {
    return retry(function () {
      var W = D.randMat(3, 2, -1, 1), x = D.randVec(2, -1, 1), b = [0, 0, 0];
      if (x.every(function (v) { return v === 0; })) return null;
      var z = D.add(D.mv(W, x), b), p = D.softmax(z), y = R(0, 2);
      var oh = [0, 1, 2].map(function (i) { return i === y ? 1 : 0; }), g = D.sub(p, oh), gW = D.outer(g, x), gx = D.mv(D.tr(W), g);
      return {
        q: TT('\\mathbf z = W\\mathbf x,\\quad \\mathbf p = \\mathrm{softmax}(\\mathbf z),\\quad L = -\\log p_y') + TT('W = ' + D.mat(W) + ',\\quad \\mathbf x = ' + D.vec(x) + ',\\quad y = ' + (y + 1)) +
          '<p class="m4-cap">Two decimals are enough. ' + T('e^{1} \\approx 2.718') + ', ' + T('e^{2} \\approx 7.389') + ', ' + T('e^{-1} \\approx 0.368') + ', ' + T('e^{-2} \\approx 0.135') + '.</p>',
        fields: [{ label: T('\\mathbf z'), answer: z }, { label: T('\\mathbf p'), answer: p, tol: 0.012 }, { label: T('\\partial L/\\partial \\mathbf z'), answer: g, tol: 0.012 }, { label: T('\\partial L/\\partial W'), answer: gW, tol: 0.012 }, { label: T('\\partial L/\\partial \\mathbf x'), answer: gx, tol: 0.02 }],
        cols: 1,
        solution: '<div class="m4-drill-lines">' +
          TT('\\mathbf z = ' + D.mat(W) + D.vec(x) + ' = ' + D.vec(z)) +
          TT('\\mathbf p = \\mathrm{softmax}(\\mathbf z) = ' + D.vec(p)) +
          TT('\\boldsymbol\\delta = \\mathbf p - \\mathbf e_' + (y + 1) + ' = ' + D.vec(g)) +
          TT('\\frac{\\partial L}{\\partial W} = \\boldsymbol\\delta\\,\\mathbf x^\\top = ' + D.mat(gW)) +
          TT('\\frac{\\partial L}{\\partial \\mathbf x} = W^\\top \\boldsymbol\\delta = ' + D.mat(D.tr(W)) + D.vec(g) + ' = ' + D.vec(gx)) + '</div>'
      };
    });
  }

  // residual block
  function lv9() {
    return retry(function () {
      var vals = { x: RN(-3, 3), w_1: RN(-2, 2), b: R(-2, 2), w_2: RN(-2, 2), t: R(-3, 4) };
      var X = V('x');
      var z = op('add', [op('mul', [V('w_1'), X], 'u'), V('b')], 'z'), h = op('relu', [z], 'h'), Fx = op('mul', [V('w_2'), h], 'F');
      var y = op('add', [X, Fx], 'y'), L = op('hsq', [op('sub', [y, V('t')], 'r')], 'L');
      var G = D.graph(L, vals);
      if (!sane(G)) return null;
      var N = {}; G.nodes.forEach(function (n) { N[n.name] = n; });
      if (N.r.val === 0 || N.z.val === 0 || (N.z.val < 0 && Math.random() < 0.6)) return null;
      var skip = N.y.grad, branch = N.x.grad - skip;
      return {
        q: TT('y = x + w_2\\,\\mathrm{ReLU}(w_1 x + b),\\qquad L = \\tfrac12 (y - t)^2') + '<p class="m4-cap">with ' + Object.keys(vals).map(function (k) { return T(k + ' = ' + vals[k]); }).join(', ') + '. Follow both paths from ' + T('x') + ' to ' + T('y') + '.</p>',
        figure: function (el) { D.drawGraph(el, G, { numbers: true, colW: 124 }); },
        fields: [{ group: 'Forward pass' }, { label: T('h'), answer: N.h.val }, { label: T('y'), answer: N.y.val }, { label: T('L'), answer: N.L.val },
          { group: 'Backward pass' }, { label: T(D.dd('L', 'y')), answer: N.y.grad }, { label: T('\\text{via the skip}'), answer: skip }, { label: T('\\text{via the branch}'), answer: branch }, { label: T(D.dd('L', 'x')), answer: N.x.grad }, { label: T(D.dd('L', 'w_1')), answer: N.w_1.grad }],
        solution: function (el) {
          D.solveGraph(el, G);
          var p = M4.el('div', { class: 'm4-drill-lines', html: TT('\\frac{\\partial y}{\\partial x} = \\underbrace{1}_{\\text{skip}} + \\underbrace{w_2\\,[z > 0]\\, w_1}_{\\text{branch}} = 1 + ' + D.pt(vals.w_2) + '\\cdot ' + (N.z.val > 0 ? 1 : 0) + '\\cdot ' + D.pt(vals.w_1) + ' = ' + D.t(1 + vals.w_2 * (N.z.val > 0 ? 1 : 0) * vals.w_1)) }, el);
          el.insertBefore(p, el.querySelector('.m4-drill-solfig'));
          M4.el('p', { class: 'm4-cap', html: 'The skip contributes ' + T('\\partial L/\\partial y \\cdot 1') + ' no matter what the branch does. Even when the ReLU is off, the gradient still reaches ' + T('x') + '. More in <a href="#/l/res-s1">Residual connections</a>.' }, el);
        }
      };
    });
  }

  var LEVELS = [
    ['Two or three gates', 'Sums, products and differences of a few variables. Find the output and every partial derivative.', lv1, 4],
    ['Squares, ReLU and max', 'Unary gates and a max gate. A variable that is used twice collects gradient from both uses.', lv2, 4],
    ['The full table', 'Bigger graphs. Write down every forward value, then every gradient going backward.', lv3, 3],
    ['One neuron', 'A weight, a bias, an activation and a squared error.', lv4, 4],
    ['A tiny two layer network', 'Scalar weights, ReLU hidden units, half squared error.', lv5, 3],
    ['Matrices', 'The same network with a weight matrix. Gradients of matrices are outer products.', lv6, 3],
    ['Softmax and cross entropy', 'From logits to probabilities to the loss, and the famous gradient ' + T('\\mathbf p - \\mathbf e_y') + '.', lv7, 3],
    ['A linear classifier', 'A weight matrix in front of softmax cross entropy, all the way back to the input.', lv8, 3],
    ['A residual block', 'Two paths from the input to the output. Their gradients add.', lv9, 3]
  ];

  var steps = [{
    kind: 'text', title: 'Backpropagation practice',
    html: '<p>Backpropagation is a skill of the hands. You get fast at it the same way you got fast at multiplying, by doing many problems. Every level below generates a fresh problem each time, so you can stay on one level for as long as you like.</p>' +
      '<p>Each problem shows the computational graph. Type the forward values and the gradients, then press <b>Check</b> or Enter. Correct boxes turn green and stay. A level is complete after a few problems solved on the first try, and you can jump between levels with the bar at the top.</p>' +
      D.levelList('bp-drill', LEVELS.map(function (l) { return l[0]; })) +
      '<p class="m4-note">Answers within about two percent are accepted. Fractions such as <code>-3/4</code> work too. If the matrix levels feel unfamiliar, start with <a href="#/l/mv-drill">matrix calculus practice</a>. To practice drawing graphs from formulas, see <a href="#/l/bp-graphs">Reading and drawing graphs</a>.</p>'
  }];
  LEVELS.forEach(function (l, i) {
    steps.push({ kind: 'exercise', title: 'Level ' + (i + 1) + ': ' + l[0], html: '<p>' + l[1] + '</p>', mount: function (el, ctx) { M4.drill(el, ctx, { gen: l[2], n: l[3], key: 'bp-drill:' + (i + 1) }); } });
  });

  M4.lesson({ id: 'bp-drill', module: 'backprop', title: 'Backpropagation practice', summary: 'Nine levels of endless problems, from two gates to matrices, softmax and residual blocks.', minutes: 30, free: true, drill: true, steps: steps });
})();
