/* Neural network drill: shapes, parameter counts, batches and forward passes, generated without end. */
(function () {
  'use strict';
  var D = M4.D, T = D.T, TT = D.TT;
  var R = M4.rand, pick = M4.pick;

  function retry(make) { for (var i = 0; i < 200; i++) { var p = make(); if (p) return p; } return make(true); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,'); }
  function relu(v) { return v.map(function (a) { return Math.max(0, a); }); }
  function lines(arr) { return '<div class="m4-drill-lines">' + arr.map(TT).join('') + '</div>'; }
  function hLabels(n) { var l = ['x']; for (var i = 1; i < n - 1; i++) l.push('h' + (n > 3 ? '₀₁₂₃₄₅'[i] : '')); l.push('ŷ'); return l; }
  function net(sizes, o) { return function (el) { D.netDiagram(el, sizes, Object.assign({ labels: hLabels(sizes.length), maxW: Math.min(560, (sizes.length - 1) * 150 + 120), gap: 40 }, o || {})); }; }
  function shape(m, n) { return T('\\mathbb R^{' + m + '\\times ' + n + '}'); }

  /* 1. one layer */
  function lv1() {
    var n = R(2, 6), m = R(1, 5);
    return {
      q: '<p>A layer takes ' + T('\\mathbf x \\in \\mathbb R^{' + n + '}') + ' to ' + T('\\mathbf h \\in \\mathbb R^{' + m + '}') + '.</p>' + TT('\\mathbf h = \\mathrm{ReLU}(W\\mathbf x + \\mathbf b)'),
      figure: net([n, m], { labels: ['x', 'h'] }),
      fields: [{ label: 'Rows of ' + T('W'), answer: m, tol: 0 }, { label: 'Columns of ' + T('W'), answer: n, tol: 0 },
        { label: 'Entries of ' + T('\\mathbf b'), answer: m, tol: 0 }, { label: 'Parameters in the layer', answer: m * n + m, tol: 0 }],
      cols: 1,
      solution: '<p>Row ' + T('i') + ' of ' + T('W') + ' holds the weights of hidden unit ' + T('i') + ', one per input. So ' + T('W') + ' has one row per output and one column per input, ' + T('W \\in ' + '\\mathbb R^{' + m + '\\times ' + n + '}') + '. Every output gets one bias.</p>' +
        TT(m + '\\cdot ' + n + ' + ' + m + ' = ' + (m * n + m)) +
        '<p class="m4-cap">In the picture every line is one weight. Count them: ' + n + ' inputs times ' + m + ' outputs.</p>'
    };
  }

  /* 2. a small MLP */
  function lv2() {
    var L = pick([3, 3, 4]), s = [R(2, 5)];
    for (var i = 1; i < L; i++) s.push(R(i === L - 1 ? 1 : 2, 6));
    var per = [], f = [];
    for (var l = 1; l < L; l++) { per.push(s[l] * s[l - 1] + s[l]); f.push({ label: 'Parameters in layer ' + l + ' ' + T('(W_' + l + ', \\mathbf b_' + l + ')'), answer: per[l - 1], tol: 0 }); }
    var tot = per.reduce(function (a, b) { return a + b; }, 0);
    f.push({ label: 'Total parameters', answer: tot, tol: 0 });
    return {
      q: '<p>Count the weights and biases of this network. Layer sizes from left to right: ' + s.join(', ') + '.</p>',
      figure: net(s),
      fields: f, cols: 1,
      solution: lines(per.map(function (p, i) { return 'W_' + (i + 1) + ' \\in \\mathbb R^{' + s[i + 1] + '\\times ' + s[i] + '},\\; \\mathbf b_' + (i + 1) + ' \\in \\mathbb R^{' + s[i + 1] + '}:\\quad ' + s[i + 1] + '\\cdot ' + s[i] + ' + ' + s[i + 1] + ' = ' + p; }).concat(['\\text{total} = ' + per.join(' + ') + ' = ' + tot])) +
        '<p class="m4-cap">Each layer costs (outputs times inputs) plus outputs. The input layer has no parameters of its own.</p>'
    };
  }

  /* 3. real sizes */
  var TASKS = [
    { what: 'a 28 by 28 grayscale digit, flattened', n: 784, out: 10, outw: '10 digit classes' },
    { what: 'a 32 by 32 color image with 3 channels, flattened', n: 3072, out: 10, outw: '10 object classes' },
    { what: 'a 300 dimensional word vector', n: 300, out: 2, outw: '2 sentiment classes' },
    { what: 'a bag of words over a vocabulary of 5000 words', n: 5000, out: 4, outw: '4 topics' }
  ];
  function lv3() {
    var t = pick(TASKS), h = [pick([64, 100, 128, 256, 512])];
    if (Math.random() < 0.6) h.push(pick([32, 50, 64, 100, 128]));
    var s = [t.n].concat(h, [t.out]), per = [];
    for (var l = 1; l < s.length; l++) per.push(s[l] * s[l - 1] + s[l]);
    var tot = per.reduce(function (a, b) { return a + b; }, 0), share = Math.round(per[0] / tot * 100);
    return {
      q: '<p>The input is ' + t.what + ', so ' + T('\\mathbf x \\in \\mathbb R^{' + t.n + '}') + '. The network has ' + (h.length === 1 ? 'one hidden layer of ' + h[0] + ' units' : 'hidden layers of ' + h[0] + ' and ' + h[1] + ' units') + ' and ' + t.outw + ' at the output.</p>',
      figure: net(s.map(function (v, i) { return Math.min(v, i === 0 ? 7 : i === s.length - 1 ? Math.min(v, 4) : 5); }), { labels: s.map(String) }),
      fields: [{ label: 'Parameters in the first layer', answer: per[0], tol: 0 }, { label: 'Total parameters', answer: tot, tol: 0 },
        { label: 'Share of the first layer, in percent', answer: share, tol: 1.5 }],
      cols: 1,
      hint: 'The picture shows only a few units per layer. Use the numbers underneath.',
      solution: lines(per.map(function (p, i) { return s[i + 1] + '\\cdot ' + s[i] + ' + ' + s[i + 1] + ' = ' + fmt(p); }).concat(['\\text{total} = ' + fmt(tot) + ',\\qquad ' + fmt(per[0]) + '/' + fmt(tot) + ' \\approx ' + share + '\\%'])) +
        '<p class="m4-cap">The layer that touches the raw input is usually the most expensive one, because the input is the widest vector in the network.</p>'
    };
  }

  /* 4. chaining shapes */
  function lv4() {
    var n = R(2, 9), a = R(2, 9), b = R(2, 9), o = R(1, 5);
    return {
      q: TT('\\hat{\\mathbf y} = W_3\\, \\mathrm{ReLU}\\big(W_2\\, \\mathrm{ReLU}(W_1 \\mathbf x + \\mathbf b_1) + \\mathbf b_2\\big) + \\mathbf b_3') +
        '<p>You know ' + T('W_1 \\in \\mathbb R^{' + a + '\\times ' + n + '}') + ', ' + T('W_2 \\in \\mathbb R^{' + b + '\\times ' + a + '}') + ' and that ' + T('W_3') + ' has ' + o + ' row' + (o > 1 ? 's' : '') + '. Fill in the rest.</p>',
      fields: [{ label: 'Length of ' + T('\\mathbf x'), answer: n, tol: 0 }, { label: 'Length of ' + T('\\mathbf h_1'), answer: a, tol: 0 },
        { label: 'Length of ' + T('\\mathbf h_2'), answer: b, tol: 0 }, { label: 'Columns of ' + T('W_3'), answer: b, tol: 0 },
        { label: 'Length of ' + T('\\mathbf b_3'), answer: o, tol: 0 }, { label: 'Length of ' + T('\\hat{\\mathbf y}'), answer: o, tol: 0 }],
      cols: 1,
      solution: '<p>A matrix with ' + T('n') + ' columns eats a vector of length ' + T('n') + ' and returns one of length equal to its rows. Walk from left to right.</p>' +
        lines(['\\underbrace{W_1}_{' + a + '\\times ' + n + '}\\underbrace{\\mathbf x}_{' + n + '} \\to \\mathbf h_1 \\in \\mathbb R^{' + a + '}',
          '\\underbrace{W_2}_{' + b + '\\times ' + a + '}\\underbrace{\\mathbf h_1}_{' + a + '} \\to \\mathbf h_2 \\in \\mathbb R^{' + b + '}',
          '\\underbrace{W_3}_{' + o + '\\times ' + b + '}\\underbrace{\\mathbf h_2}_{' + b + '} \\to \\hat{\\mathbf y} \\in \\mathbb R^{' + o + '}']) +
        '<p class="m4-cap">Neighboring shapes must agree: the columns of each matrix equal the rows of the one before it. ReLU keeps the length.</p>'
    };
  }

  /* 5. batches */
  function lv5() {
    var B = pick([4, 8, 16, 32, 64]), n = R(2, 12), m = R(2, 12);
    return {
      q: '<p>A batch of ' + B + ' examples is stacked into a matrix ' + T('X \\in \\mathbb R^{' + B + '\\times ' + n + '}') + ', one example per row. A layer with ' + T('W \\in \\mathbb R^{' + m + '\\times ' + n + '}') + ' processes the whole batch at once.</p>' +
        TT('H = \\mathrm{ReLU}(X W^\\top + \\mathbf 1 \\mathbf b^\\top)'),
      fields: [{ label: 'Rows of ' + T('H'), answer: B, tol: 0 }, { label: 'Columns of ' + T('H'), answer: m, tol: 0 },
        { label: 'Multiplications in ' + T('XW^\\top'), answer: B * m * n, tol: 0 }, { label: 'Parameters in the layer', answer: m * n + m, tol: 0 }],
      cols: 1,
      solution: lines(['\\underbrace{X}_{' + B + '\\times ' + n + '}\\;\\underbrace{W^\\top}_{' + n + '\\times ' + m + '} = \\underbrace{XW^\\top}_{' + B + '\\times ' + m + '}',
        B + '\\cdot ' + m + '\\ \\text{entries, each a dot product of length } ' + n + ' \\;\\Rightarrow\\; ' + B + '\\cdot ' + m + '\\cdot ' + n + ' = ' + (B * m * n)]) +
        '<p>Row ' + T('k') + ' of ' + T('H') + ' is exactly ' + T('\\mathrm{ReLU}(W\\mathbf x_k + \\mathbf b)^\\top') + ', the hidden vector of example ' + T('k') + '. The same ' + (m * n + m) + ' parameters are shared by every example. The batch size changes the work, never the parameter count.</p>'
    };
  }

  /* 6. forward pass, 2-2-1 */
  function lv6() {
    return retry(function () {
      var x = D.randVec(2, -2, 2, true), W = D.randMat(2, 2, -2, 2), b = D.randVec(2, -1, 1), w = D.randVec(2, -2, 2, true), c = R(-1, 1);
      var z = D.add(D.mv(W, x), b);
      if (z[0] === 0 || z[1] === 0) return null;
      if (!(z[0] > 0 || z[1] > 0) || Math.random() < 0.5 && !(z[0] < 0 || z[1] < 0)) return null;
      var h = relu(z), y = D.dot(w, h) + c;
      return {
        q: TT('\\mathbf z = W\\mathbf x + \\mathbf b,\\quad \\mathbf h = \\mathrm{ReLU}(\\mathbf z),\\quad \\hat y = \\mathbf w^\\top \\mathbf h + c') +
          TT('W = ' + D.mat(W) + ',\\; \\mathbf b = ' + D.vec(b) + ',\\; \\mathbf w = ' + D.vec(w) + ',\\; c = ' + c + ',\\; \\mathbf x = ' + D.vec(x)),
        figure: net([2, 2, 1]),
        fields: [{ label: T('\\mathbf z'), answer: z }, { label: T('\\mathbf h'), answer: h }, { label: T('\\hat y'), answer: y }],
        solution: lines(['\\mathbf z = ' + D.mat(W) + D.vec(x) + ' + ' + D.vec(b) + ' = ' + D.vec(D.mv(W, x)) + ' + ' + D.vec(b) + ' = ' + D.vec(z),
          '\\mathbf h = \\mathrm{ReLU}' + D.vec(z) + ' = ' + D.vec(h),
          '\\hat y = ' + D.rowv(w) + D.vec(h) + ' + ' + D.pt(c) + ' = ' + D.t(y)]) +
          '<p class="m4-cap">Row ' + T('i') + ' of ' + T('W') + ' dotted with ' + T('\\mathbf x') + ' gives ' + T('z_i') + '. A negative ' + T('z_i') + ' is switched off by ReLU and contributes nothing to ' + T('\\hat y') + '.</p>'
      };
    });
  }

  /* 7. forward pass to a class */
  function lv7() {
    return retry(function () {
      var x = D.randVec(2, -2, 2, true), W = D.randMat(3, 2, -2, 2), b = D.randVec(3, -1, 1), V = D.randMat(3, 3, -2, 2), c = D.randVec(3, -1, 1);
      var z = D.add(D.mv(W, x), b), h = relu(z), s = D.add(D.mv(V, h), c);
      if (z.some(function (v) { return v === 0; }) || h.every(function (v) { return v === 0; })) return null;
      var mx = Math.max.apply(null, s); if (s.filter(function (v) { return v === mx; }).length > 1) return null;
      var k = s.indexOf(mx) + 1, p = D.softmax(s)[k - 1];
      return {
        q: TT('\\mathbf h = \\mathrm{ReLU}(W\\mathbf x + \\mathbf b),\\quad \\mathbf s = V\\mathbf h + \\mathbf c,\\quad \\mathbf p = \\mathrm{softmax}(\\mathbf s)') +
          TT('W = ' + D.mat(W) + ',\\; \\mathbf b = ' + D.vec(b) + ',\\; \\mathbf x = ' + D.vec(x)) +
          TT('V = ' + D.mat(V) + ',\\; \\mathbf c = ' + D.vec(c)),
        figure: net([2, 3, 3], { labels: ['x', 'h', 's'] }),
        fields: [{ group: 'Forward pass' }, { label: T('\\mathbf h'), answer: h }, { label: T('\\mathbf s'), answer: s },
          { group: 'Prediction' }, { label: 'Predicted class (1, 2 or 3)', answer: k, tol: 0 }, { label: 'Its probability ' + T('p_{' + k + '}') + ' (two decimals)', answer: p, tol: 0.011 }],
        cols: 1,
        solution: lines(['\\mathbf z = ' + D.vec(z) + ',\\quad \\mathbf h = ' + D.vec(h),
          '\\mathbf s = ' + D.mat(V) + D.vec(h) + ' + ' + D.vec(c) + ' = ' + D.vec(s),
          'p_' + k + ' = \\frac{e^{' + D.t(s[k - 1]) + '}}{' + s.map(function (v) { return 'e^{' + D.t(v) + '}'; }).join(' + ') + '} \\approx ' + D.t(p, 2)]) +
          '<p class="m4-cap">The class with the largest score wins. Softmax never changes the order of the scores, so you can pick the class before computing any exponential.</p>'
      };
    });
  }

  /* 8. formula to diagram */
  function lv8() {
    var n = R(2, 4), a = R(2, 5), b = R(2, 5), o = R(1, 3);
    while (b === a) b = R(2, 5);
    var deep = Math.random() < 0.6, good = deep ? [n, a, b, o] : [n, a, o];
    var wrong = deep ? [[n, b, a, o], [o, b, a, n], [n, a, o]] : [[o, a, n], [n, a, a, o], [a, n, o]];
    wrong = wrong.filter(function (w) { return w.join() !== good.join(); });
    wrong = D.shuffle(wrong).slice(0, 2);
    var list = D.shuffle([good].concat(wrong)), ans = list.indexOf(good);
    var f = deep ? '\\hat{\\mathbf y} = W_3\\, \\mathrm{ReLU}(W_2\\, \\mathrm{ReLU}(W_1\\mathbf x))' : '\\hat{\\mathbf y} = W_2\\, \\mathrm{ReLU}(W_1\\mathbf x)';
    var sh = deep ? T('W_1 \\in \\mathbb R^{' + a + '\\times ' + n + '}') + ', ' + T('W_2 \\in \\mathbb R^{' + b + '\\times ' + a + '}') + ', ' + T('W_3 \\in \\mathbb R^{' + o + '\\times ' + b + '}')
      : T('W_1 \\in \\mathbb R^{' + a + '\\times ' + n + '}') + ', ' + T('W_2 \\in \\mathbb R^{' + o + '\\times ' + a + '}');
    return {
      q: '<p>Which diagram shows this network? Inputs are on the left.</p>' + TT(f) + '<p class="m4-cap">' + sh + '</p>',
      options: list.map(function (s) { return function (el) { D.netDiagram(el, s, { labels: hLabels(s.length), maxW: (s.length - 1) * 120 + 120, colW: 120, gap: 34 }); }; }),
      answer: ans, optCols: 1,
      solution: '<p>Read the shapes from the inside out. ' + T('W_1') + ' has ' + n + ' columns, so there are ' + n + ' inputs. Each matrix has as many rows as the layer it produces: ' + good.slice(1).join(', then ') + '. The layer sizes are ' + good.join(', ') + '.</p>' +
        '<p class="m4-cap">A diagram drawn backwards (outputs on the left) is a common mistake. The first matrix applied to ' + T('\\mathbf x') + ' is the innermost one in the formula.</p>'
    };
  }

  /* 9. linear layers collapse */
  function lv9() {
    var W1 = D.randMat(2, 2, -2, 2), b1 = D.randVec(2, -2, 2), W2 = D.randMat(2, 2, -2, 2), b2 = D.randVec(2, -2, 2);
    var W = D.mm(W2, W1), b = D.add(D.mv(W2, b1), b2);
    return {
      q: '<p>Two layers with no activation in between:</p>' + TT('\\hat{\\mathbf y} = W_2(W_1\\mathbf x + \\mathbf b_1) + \\mathbf b_2') +
        TT('W_1 = ' + D.mat(W1) + ',\\; \\mathbf b_1 = ' + D.vec(b1) + ',\\; W_2 = ' + D.mat(W2) + ',\\; \\mathbf b_2 = ' + D.vec(b2)) +
        '<p>Find the single layer ' + T('\\hat{\\mathbf y} = W\\mathbf x + \\mathbf b') + ' that computes exactly the same function.</p>',
      fields: [{ label: T('W'), answer: W }, { label: T('\\mathbf b'), answer: b }],
      solution: lines(['W_2(W_1\\mathbf x + \\mathbf b_1) + \\mathbf b_2 = (W_2 W_1)\\mathbf x + (W_2\\mathbf b_1 + \\mathbf b_2)',
        'W = W_2W_1 = ' + D.mat(W2) + D.mat(W1) + ' = ' + D.mat(W),
        '\\mathbf b = W_2\\mathbf b_1 + \\mathbf b_2 = ' + D.vec(D.mv(W2, b1)) + ' + ' + D.vec(b2) + ' = ' + D.vec(b)]) +
        '<p>However many linear layers you stack, the result is one linear layer. Depth only adds power when a nonlinearity such as ReLU sits between the layers. This is the algebra behind the folding pictures in <a href="#/l/l4-s2">Stacking layers</a>.</p>'
    };
  }

  var LEVELS = [
    ['One layer', 'Rows, columns and biases of a single layer.', lv1, 4],
    ['Counting parameters', 'Small networks, layer by layer.', lv2, 4],
    ['Real sizes', 'Image and text inputs with realistic widths. Where do the parameters live?', lv3, 3],
    ['Chaining shapes', 'Fill in the missing sizes of a three layer network.', lv4, 4],
    ['Batches', 'Many examples at once: the shape of the output and the cost of the product.', lv5, 3],
    ['Forward pass', 'Push one input through a tiny ReLU network.', lv6, 3],
    ['Forward pass to a class', 'Three hidden units, three scores, one predicted class.', lv7, 3],
    ['Formula to diagram', 'Pick the network diagram that matches the shapes.', lv8, 4],
    ['Linear layers collapse', 'Two layers without activation are one layer in disguise.', lv9, 3]
  ];

  var steps = [{
    kind: 'text', title: 'Neural network practice',
    html: '<p>Before backpropagation feels easy, the forward direction has to feel automatic: which shape every matrix has, how many parameters a network holds, and what a layer does to a vector of numbers. Each level below generates fresh problems for as long as you like.</p>' +
      D.levelList('nn-drill', LEVELS.map(function (l) { return l[0]; })) +
      '<p class="m4-note">The convention throughout is ' + T('\\mathbf h = W\\mathbf x + \\mathbf b') + ' with ' + T('W') + ' of shape (outputs, inputs). Counts must be exact. Decimal answers within about two percent are accepted.</p>'
  }];
  LEVELS.forEach(function (l, i) {
    steps.push({ kind: 'exercise', title: 'Level ' + (i + 1) + ': ' + l[0], html: '<p>' + l[1] + '</p>', mount: function (el, ctx) { M4.drill(el, ctx, { gen: l[2], n: l[3], key: 'nn-drill:' + (i + 1) }); } });
  });

  M4.lesson({ id: 'nn-drill', module: 'nn', title: 'Neural network practice', summary: 'Nine levels of endless problems on shapes, parameter counts, batches and forward passes.', minutes: 25, free: true, drill: true, steps: steps });
})();
