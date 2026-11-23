/* Normalization and residual drill: statistics, standardizing, normalization layers and residual gradients. */
(function () {
  'use strict';
  var D = M4.D, T = D.T, TT = D.TT;
  var R = M4.rand, pick = M4.pick;

  function lines(arr) { return '<div class="m4-drill-lines">' + arr.map(TT).join('') + '</div>'; }
  function sum(v) { return v.reduce(function (a, b) { return a + b; }, 0); }
  function sq(v) { return v.map(function (a) { return a * a; }); }
  function sgn(v) { return v < 0 ? '- ' + Math.abs(v) : '+ ' + v; }
  function list(v) { return v.map(function (a) { return D.t(a); }).join(', '); }

  /* Deviation patterns with mean 0 and a whole number standard deviation (1/n convention). */
  var DEV = [[[-1, -1, 1, 1], 1], [[-2, -2, 2, 2], 2], [[-3, -1, -1, 5], 3], [[-7, -1, 1, 7], 5], [[-6, -2, -2, 10], 6], [[-4, -4, 4, 4], 4]];
  function column() {
    var p = pick(DEV), s = pick([1, -1]), mu = R(-4, 6);
    var x = D.shuffle(p[0].map(function (d) { return mu + s * d; }));
    return { x: x, mu: mu, sd: p[1] };
  }
  /* Vectors with a whole number root mean square. */
  var RMS = [[[1, 1, 1, 1], 1], [[2, 2, 2, 2], 2], [[3, 1, 1, 5], 3], [[7, 1, 1, 7], 5], [[6, 2, 2, 10], 6]];
  function rmsVec() {
    var p = pick(RMS), v = D.shuffle(p[0].map(function (a) { return a * pick([1, -1]); }));
    return { v: v, r: p[1] };
  }
  function devLines(x, mu) {
    var d = x.map(function (a) { return a - mu; });
    return {
      d: d,
      tex: '\\sigma^2 = \\tfrac14\\big(' + d.map(function (a) { return D.pt(a) + '^2'; }).join(' + ') + '\\big) = \\tfrac{' + sum(sq(d)) + '}{4} = ' + D.t(sum(sq(d)) / 4)
    };
  }

  /* 1. mean and standard deviation of one feature */
  function lv1() {
    var c = column(), dl = devLines(c.x, c.mu);
    return {
      q: '<p>One feature takes these four values in the training set. Compute its mean and its standard deviation, dividing by ' + T('n = 4') + '.</p>' + TT('x = (' + list(c.x) + ')'),
      hint: 'First the mean. Then subtract it from every value, square, average, and take the square root.',
      fields: [{ label: T('\\mu'), answer: c.mu, tol: 0 }, { label: T('\\sigma'), answer: c.sd, tol: 0.01 }],
      solution: lines(['\\mu = \\tfrac14(' + c.x.join(' + ').replace(/\+ -/g, '- ') + ') = \\tfrac{' + sum(c.x) + '}{4} = ' + c.mu,
        'x - \\mu = (' + list(dl.d) + ')', dl.tex, '\\sigma = ' + c.sd]) +
        '<p>This is the sample mean and standard deviation from <a href="#/l/probability-s2">probability</a>, used here to describe one column of the data.</p>'
    };
  }

  /* 2. standardize a new point and undo it */
  function lv2() {
    var mu = [R(-5, 20), R(-5, 20)], sd = [pick([1, 2, 4, 5, 10]), pick([2, 3, 4, 5, 10])];
    var z = [pick([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2]), pick([-2, -1, -0.5, 0.5, 1, 2])];
    var x = [mu[0] + sd[0] * z[0], mu[1] + sd[1] * z[1]];
    var zb = pick([-1.5, -1, -0.5, 0.5, 1, 2.5]), xb = mu[0] + sd[0] * zb;
    return {
      q: '<p>The training set has feature means and standard deviations</p>' + TT('\\boldsymbol\\mu = ' + D.vec(mu) + ',\\qquad \\boldsymbol\\sigma = ' + D.vec(sd) + '.') +
        '<p>Standardize the new point ' + T('\\mathbf x = ' + D.vec(x)) + '. Then answer the reverse question: which raw value of feature 1 has the standardized value ' + T(D.t(zb)) + '?</p>',
      hint: 'Standardize with ' + T('z_j = (x_j - \\mu_j)/\\sigma_j') + ', always using the training statistics. Undo it with ' + T('x_j = \\mu_j + \\sigma_j z_j') + '.',
      fields: [{ label: T('\\mathbf z'), answer: z, tol: 0.01 }, { label: 'Raw value of feature 1', answer: xb, tol: 0.01 }],
      solution: lines(['z_1 = \\frac{' + x[0] + ' - ' + D.pt(mu[0]) + '}{' + sd[0] + '} = ' + D.t(z[0]) + ',\\qquad z_2 = \\frac{' + x[1] + ' - ' + D.pt(mu[1]) + '}{' + sd[1] + '} = ' + D.t(z[1]),
        'x_1 = ' + mu[0] + ' + ' + sd[0] + '\\cdot ' + D.pt(zb) + ' = ' + D.t(xb)]) +
        '<p>A standardized value counts standard deviations from the mean. Subtracting ' + T('\\mu') + ' moves the cloud to the origin, dividing by ' + T('\\sigma') + ' rescales each axis to unit spread.</p>'
    };
  }

  /* 3. batch norm on one channel */
  function lv3() {
    var c = column(), g = pick([1, 2, 3, c.sd, 2 * c.sd]), b = R(-3, 3);
    var xh = c.x.map(function (a) { return (a - c.mu) / c.sd; }), y = xh.map(function (a) { return g * a + b; });
    return {
      q: '<p>A batch of four examples reaches a batch norm layer. One channel holds the values below. Its learned scale and shift are ' + T('\\gamma = ' + g) + ' and ' + T('\\beta = ' + b) + '. Ignore ' + T('\\epsilon') + '.</p>' + TT('h = (' + list(c.x) + ')'),
      hint: 'Batch norm averages one channel over the batch. Compute ' + T('\\mu') + ' and ' + T('\\sigma') + ' of these four numbers, then ' + T('y = \\gamma\\,(h - \\mu)/\\sigma + \\beta') + '. Fractions like 5/3 are accepted.',
      fields: [{ label: T('\\mu_B'), answer: c.mu, tol: 0 }, { label: T('\\sigma_B'), answer: c.sd, tol: 0.01 }, { label: T('\\mathbf y'), answer: y }],
      cols: 1,
      solution: lines(['\\mu_B = ' + c.mu + ',\\qquad \\sigma_B = ' + c.sd, '\\hat h = (h - \\mu_B)/\\sigma_B = (' + list(xh) + ')', 'y = ' + g + '\\,\\hat h ' + sgn(b) + ' = (' + list(y) + ')']) +
        '<p>After the layer the channel has mean ' + T('\\beta = ' + b) + ' and standard deviation ' + T('|\\gamma| = ' + Math.abs(g)) + '. The network can learn any spread it likes, the layer only fixes where it starts.</p>'
    };
  }

  /* 4. layer norm on one token */
  function lv4() {
    var c = column(), g = [R(1, 3), R(1, 3), R(1, 3), R(1, 3)].map(function (a) { return a * pick([1, 1, -1]); }), b = D.randVec(4, -2, 2);
    var xh = c.x.map(function (a) { return (a - c.mu) / c.sd; }), y = xh.map(function (a, i) { return g[i] * a + b[i]; });
    return {
      q: '<p>Layer norm acts on one token vector ' + T('\\mathbf h \\in \\mathbb R^4') + ' with per feature scale ' + T('\\boldsymbol\\gamma') + ' and shift ' + T('\\boldsymbol\\beta') + '. Ignore ' + T('\\epsilon') + '.</p>' +
        TT('\\mathbf h = ' + D.vec(c.x) + ',\\qquad \\boldsymbol\\gamma = ' + D.vec(g) + ',\\qquad \\boldsymbol\\beta = ' + D.vec(b)),
      hint: 'The statistics come from the four features of this one vector. Then ' + T('y_j = \\gamma_j\\hat h_j + \\beta_j') + ' feature by feature.',
      fields: [{ label: T('\\mu'), answer: c.mu, tol: 0 }, { label: T('\\sigma'), answer: c.sd, tol: 0.01 }, { label: T('\\hat{\\mathbf h}'), answer: xh }, { label: T('\\mathbf y'), answer: y }],
      cols: 2,
      solution: lines(['\\mu = ' + c.mu + ',\\qquad \\sigma = ' + c.sd, '\\hat{\\mathbf h} = ' + D.vec(xh, 2), '\\mathbf y = \\boldsymbol\\gamma \\odot \\hat{\\mathbf h} + \\boldsymbol\\beta = ' + D.vec(g) + '\\odot' + D.vec(xh, 2) + ' + ' + D.vec(b) + ' = ' + D.vec(y, 2)]) +
        '<p>The same token gives the same output whatever else is in the batch, so layer norm behaves identically in training and evaluation.</p>'
    };
  }

  /* 5. RMSNorm */
  function lv5() {
    var r = rmsVec(), g = pick([1, 2, r.r, 2 * r.r]);
    var xh = r.v.map(function (a) { return a / r.r; }), y = xh.map(function (a) { return g * a; });
    var m = D.mean(r.v);
    return {
      q: '<p>RMSNorm with a shared scale ' + T('\\gamma = ' + g) + ' receives the vector below. Compute the root mean square, the output, and the mean of the input, which RMSNorm leaves in place.</p>' + TT('\\mathbf h = ' + D.rowv(r.v)),
      hint: T('\\mathrm{rms}(\\mathbf h) = \\sqrt{\\tfrac1n\\sum_j h_j^2}') + ' and ' + T('\\mathbf y = \\gamma\\,\\mathbf h/\\mathrm{rms}(\\mathbf h)') + '. No mean is subtracted.',
      fields: [{ label: T('\\mathrm{rms}(\\mathbf h)'), answer: r.r, tol: 0.01 }, { label: T('\\mathbf y'), answer: y }, { label: 'Mean of ' + T('\\mathbf h'), answer: m, tol: 0.01 }],
      cols: 1,
      solution: lines(['\\mathrm{rms} = \\sqrt{\\tfrac14(' + r.v.map(function (a) { return D.pt(a) + '^2'; }).join(' + ') + ')} = \\sqrt{\\tfrac{' + sum(sq(r.v)) + '}{4}} = ' + r.r,
        '\\mathbf y = ' + g + '\\cdot\\tfrac{1}{' + r.r + '}' + D.rowv(r.v) + ' = ' + D.rowv(y, 2)]) +
        '<p>The output always has root mean square ' + T('|\\gamma|') + ', so every output lies on a sphere. The mean ' + T(D.t(m)) + ' is only rescaled, never removed. That is the one step RMSNorm drops from layer norm.</p>'
    };
  }

  /* 6. how many numbers share one statistic */
  function lv6() {
    var img = pick([true, false]), layer;
    if (img) {
      var B = R(2, 32), Cc = pick([3, 8, 16, 64]), H = pick([4, 8, 16]), W = H;
      layer = pick(['bn', 'ln', 'in']);
      var size = { bn: B * H * W, ln: Cc * H * W, 'in': H * W }[layer], groups = { bn: Cc, ln: B, 'in': B * Cc }[layer];
      var name = { bn: 'batch norm', ln: 'layer norm', 'in': 'instance norm' }[layer];
      var over = { bn: 'the batch and both spatial axes', ln: 'channels and both spatial axes', 'in': 'both spatial axes' }[layer];
      return {
        q: '<p>A convolutional feature map has shape ' + T('(B, C, H, W) = (' + [B, Cc, H, W].join(', ') + ')') + '. It passes through <b>' + name + '</b>.</p><p>How many numbers are averaged into one mean, and how many different means are computed?</p>',
        hint: 'Batch norm keeps channels apart. Layer norm keeps examples apart. Instance norm keeps both apart.',
        fields: [{ label: 'Numbers per mean', answer: size, tol: 0 }, { label: 'Number of means', answer: groups, tol: 0 }],
        solution: '<p>' + name.charAt(0).toUpperCase() + name.slice(1) + ' averages over ' + over + '.</p>' +
          lines(['\\text{numbers per mean} = ' + ({ bn: B + '\\cdot ' + H + '\\cdot ' + W, ln: Cc + '\\cdot ' + H + '\\cdot ' + W, 'in': H + '\\cdot ' + W })[layer] + ' = ' + size,
            '\\text{number of means} = ' + ({ bn: 'C = ' + Cc, ln: 'B = ' + B, 'in': B + '\\cdot ' + Cc })[layer] + (layer === 'in' ? ' = ' + groups : '')]) +
          '<p>The two numbers multiply to the size of the whole tensor, ' + T(B * Cc * H * W) + ', since every entry belongs to exactly one group.</p>'
      };
    }
    var Bt = R(2, 16), Tt = pick([8, 16, 32, 128]), d = pick([64, 256, 512, 768]);
    layer = pick(['bn', 'ln']);
    var sz = layer === 'bn' ? Bt * Tt : d, gr = layer === 'bn' ? d : Bt * Tt;
    return {
      q: '<p>A transformer activation has shape ' + T('(B, T, d) = (' + [Bt, Tt, d].join(', ') + ')') + ': ' + Bt + ' sequences, ' + Tt + ' tokens each, ' + d + ' features per token. It passes through <b>' + (layer === 'bn' ? 'batch norm over features' : 'layer norm') + '</b>.</p><p>How many numbers are averaged into one mean, and how many different means are computed?</p>',
      hint: layer === 'bn' ? 'Each feature gets one mean, shared by every token of every sequence.' : 'Each token is normalized on its own, across its ' + d + ' features.',
      fields: [{ label: 'Numbers per mean', answer: sz, tol: 0 }, { label: 'Number of means', answer: gr, tol: 0 }],
      solution: (layer === 'bn' ? '<p>Batch norm pools all ' + T(Bt + '\\cdot ' + Tt + ' = ' + sz) + ' tokens for each of the ' + d + ' features.</p>' :
        '<p>Layer norm pools the ' + d + ' features of one token, and there are ' + T(Bt + '\\cdot ' + Tt + ' = ' + gr) + ' tokens.</p>') +
        '<p>Layer norm needs no other examples, which is why transformers use it. Sequences of different lengths and a batch of one cause it no trouble.</p>'
    };
  }

  /* shared residual block setup: y = x + W2 ReLU(W1 x) */
  function block() {
    var W1 = D.randMat(2, 2, -2, 2), W2 = D.randMat(2, 2, -2, 2), x = D.randVec(2, -2, 2, true);
    var z = D.mv(W1, x);
    if (z.some(function (v) { return v === 0; })) return null;
    var m = z.map(function (v) { return v > 0 ? 1 : 0; });
    return { W1: W1, W2: W2, x: x, z: z, m: m };
  }
  function blockTex(k) { return TT('\\mathbf y = \\mathbf x + W_2\\,\\mathrm{ReLU}(W_1\\mathbf x)') + TT('W_1 = ' + D.mat(k.W1) + ',\\quad W_2 = ' + D.mat(k.W2) + ',\\quad \\mathbf x = ' + D.vec(k.x)); }

  /* 7. residual Jacobian */
  function lv7() {
    var k = block(); if (!k) return null;
    var MW1 = k.W1.map(function (r, i) { return r.map(function (v) { return v * k.m[i]; }); });
    var P = D.mm(k.W2, MW1), J = P.map(function (r, i) { return r.map(function (v, j) { return v + (i === j ? 1 : 0); }); });
    return {
      q: '<p>Compute the Jacobian ' + T('\\partial\\mathbf y/\\partial\\mathbf x') + ' of the residual block at the given point.</p>' + blockTex(k),
      hint: T('J = I + W_2\\,\\mathrm{diag}(\\mathbf m)\\,W_1') + ' where ' + T('\\mathbf m = \\mathbb 1[\\mathbf z > 0]') + ' and ' + T('\\mathbf z = W_1\\mathbf x') + '. The diagonal mask zeroes the rows of ' + T('W_1') + ' whose unit is off.',
      fields: [{ label: T('\\mathbf z = W_1\\mathbf x'), answer: k.z, tol: 0 }, { label: T('J'), answer: J, tol: 0 }],
      solution: lines(['\\mathbf z = ' + D.vec(k.z) + ',\\qquad \\mathbf m = ' + D.vec(k.m), '\\mathrm{diag}(\\mathbf m)\\,W_1 = ' + D.mat(MW1),
        'W_2\\,\\mathrm{diag}(\\mathbf m)\\,W_1 = ' + D.mat(P), 'J = I + ' + D.mat(P) + ' = ' + D.mat(J)]) +
        '<p>The identity comes from the skip path. Even when both units are off, ' + T('J = I') + ' and the gradient passes through unchanged. See <a href="#/l/res-s1">Residual connections</a>.</p>'
    };
  }

  /* 8. residual backward pass */
  function lv8() {
    var k = block(); if (!k) return null;
    var g = D.randVec(2, -2, 2, true);
    var u = D.mv(D.tr(k.W2), g), v = u.map(function (a, i) { return a * k.m[i]; }), w = D.mv(D.tr(k.W1), v), out = D.add(g, w);
    return {
      q: '<p>The gradient ' + T('\\mathbf g = \\partial L/\\partial\\mathbf y = ' + D.vec(g)) + ' arrives at the residual block. Send it back to ' + T('\\mathbf x') + ' step by step, without forming the Jacobian.</p>' + blockTex(k),
      hint: 'Backward through ' + T('W_2') + ' multiplies by ' + T('W_2^\\top') + '. Through the ReLU, keep only the entries whose unit was on. Through ' + T('W_1') + ', multiply by ' + T('W_1^\\top') + '. Finally add the skip path ' + T('\\mathbf g') + '.',
      fields: [{ label: T('W_2^\\top\\mathbf g'), answer: u, tol: 0 }, { label: 'After the ReLU mask', answer: v, tol: 0 }, { label: T('\\partial L/\\partial\\mathbf x'), answer: out, tol: 0 }],
      cols: 1,
      solution: lines(['\\mathbf z = W_1\\mathbf x = ' + D.vec(k.z) + ',\\qquad \\mathbf m = ' + D.vec(k.m), 'W_2^\\top\\mathbf g = ' + D.mat(D.tr(k.W2)) + D.vec(g) + ' = ' + D.vec(u),
        '\\mathbf m \\odot W_2^\\top\\mathbf g = ' + D.vec(v), '\\frac{\\partial L}{\\partial\\mathbf x} = \\mathbf g + W_1^\\top(\\mathbf m\\odot W_2^\\top\\mathbf g) = ' + D.vec(g) + ' + ' + D.vec(w) + ' = ' + D.vec(out)]) +
        '<p>The skip connection adds ' + T('\\mathbf g') + ' itself to whatever the branch sends back. This is the vector form of ' + T('1 + w_2 w_1') + ' from the scalar block.</p>'
    };
  }

  var LEVELS = [
    ['Mean and spread', 'The sample mean and standard deviation of one feature.', lv1, 4],
    ['Standardizing', 'Move a new point into standardized units and back.', lv2, 4],
    ['Batch norm', 'Normalize one channel over a batch, then scale and shift.', lv3, 3],
    ['Layer norm', 'Normalize one token across its features.', lv4, 3],
    ['RMSNorm', 'Divide by the root mean square and keep the mean.', lv5, 3],
    ['Which numbers share a mean', 'Group sizes for batch, layer and instance norm.', lv6, 5],
    ['Residual Jacobian', 'The Jacobian of a block with a skip connection.', lv7, 3],
    ['Residual backward pass', 'Send a gradient through a residual block.', lv8, 3]
  ];

  var steps = [{
    kind: 'text', title: 'Normalization and residual practice',
    html: '<p>This drill repeats the computations from <a href="#/l/norm-s1">Standardizing features</a>, <a href="#/l/norm-s2">Normalization layers</a> and <a href="#/l/res-s1">Residual connections</a>. Each level generates fresh problems for as long as you like.</p>' +
      D.levelList('norm-drill', LEVELS.map(function (l) { return l[0]; })) +
      '<p class="m4-note">Standard deviations divide by ' + T('n') + '. Fractions such as 5/3 are accepted, and decimals are checked to about 2 percent. The residual levels use the matrix rules from <a href="#/l/mv-drill">Matrix calculus practice</a>.</p>'
  }];
  LEVELS.forEach(function (l, i) {
    steps.push({ kind: 'exercise', title: 'Level ' + (i + 1) + ': ' + l[0], html: '<p>' + l[1] + '</p>', mount: function (el, ctx) { M4.drill(el, ctx, { gen: function () { for (var t = 0; t < 200; t++) { var p = l[2](); if (p) return p; } return l[2](); }, n: l[3], key: 'norm-drill:' + (i + 1) }); } });
  });

  M4.lesson({ id: 'norm-drill', module: 'norm', title: 'Normalization and residual practice', summary: 'Practice problems on standardization, normalization layers and gradients through residual connections, arranged in eight levels. New problems are generated each time.', minutes: 25, free: true, drill: true, steps: steps });
})();
