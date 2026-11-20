/* Matrix calculus drill: gradients by sums and by rules, Jacobians, matrix gradients, generated without end. */
(function () {
  'use strict';
  var D = M4.D, T = D.T, TT = D.TT;
  var R = M4.rand, pick = M4.pick;

  function lines(arr) { return '<div class="m4-drill-lines">' + arr.map(TT).join('') + '</div>'; }
  function sum(v) { return v.reduce(function (a, b) { return a + b; }, 0); }
  function coef(c, s) { return c === 1 ? s : c === -1 ? '-' + s : c + s; }
  function signed(c, s) { return (c < 0 ? ' - ' : ' + ') + coef(Math.abs(c), s); }

  /* 1. a + c x : gradient of a linear term plus a squared norm */
  function lv1() {
    var n = pick([2, 3]), a = D.randVec(n, -4, 4, true), c = M4.randNZ(-2, 2), x = D.randVec(n, -3, 3, true);
    var g = D.add(a, D.scale(x, 2 * c));
    return {
      q: '<p>Compute the gradient of</p>' + TT('f(\\mathbf x) = \\mathbf a^\\top\\mathbf x ' + (c < 0 ? '-' : '+') + ' ' + (Math.abs(c) === 1 ? '' : Math.abs(c)) + '\\lVert\\mathbf x\\rVert^2,\\qquad \\mathbf a = ' + D.vec(a) + ',\\quad \\mathbf x = ' + D.vec(x)),
      hint: T('\\nabla(\\mathbf a^\\top\\mathbf x) = \\mathbf a') + ' and ' + T('\\nabla\\lVert\\mathbf x\\rVert^2 = 2\\mathbf x') + '.',
      fields: [{ label: T('\\nabla f(\\mathbf x)'), answer: g, tol: 0 }],
      solution: lines(['\\nabla f = \\mathbf a ' + (c < 0 ? '- ' : '+ ') + Math.abs(2 * c) + '\\mathbf x = ' + D.vec(a) + ' + ' + D.vec(D.scale(x, 2 * c)) + ' = ' + D.vec(g)]) +
        '<p>Check one entry the slow way: ' + T('f') + ' contains ' + T('a_1x_1 ' + (c < 0 ? '- ' : '+ ') + (Math.abs(c) === 1 ? '' : Math.abs(c)) + 'x_1^2') + ', whose derivative in ' + T('x_1') + ' is ' + T('a_1 ' + (c < 0 ? '- ' : '+ ') + Math.abs(2 * c) + 'x_1') + '.</p>'
    };
  }

  /* 2. quadratic form with a general matrix */
  function lv2() {
    var n = pick([2, 2, 3]), A = D.randMat(n, n, -3, 3), x = D.randVec(n, -2, 2, true);
    var At = D.tr(A), S = A.map(function (r, i) { return D.add(r, At[i]); }), g = D.mv(S, x);
    return {
      q: '<p>Compute the gradient of ' + T('f(\\mathbf x) = \\mathbf x^\\top A\\mathbf x') + ' at the given point. The matrix is not symmetric.</p>' + TT('A = ' + D.mat(A) + ',\\qquad \\mathbf x = ' + D.vec(x)),
      hint: T('\\nabla(\\mathbf x^\\top A\\mathbf x) = (A + A^\\top)\\mathbf x') + '. Only for symmetric ' + T('A') + ' is this ' + T('2A\\mathbf x') + '.',
      fields: [{ label: T('\\nabla f(\\mathbf x)'), answer: g, tol: 0 }],
      solution: lines(['A + A^\\top = ' + D.mat(S), '\\nabla f = (A + A^\\top)\\mathbf x = ' + D.mat(S) + D.vec(x) + ' = ' + D.vec(g)]) +
        '<p>Using ' + T('2A\\mathbf x') + ' would give ' + T(D.vec(D.scale(D.mv(A, x), 2))) + ', which is wrong here.</p>'
    };
  }

  /* 3. Jacobian of a small polynomial map */
  function lv3() {
    var a = M4.randNZ(-3, 3), b = M4.randNZ(-3, 3), c = M4.randNZ(-3, 3), d = M4.randNZ(-3, 3), x = D.randVec(2, -2, 2, true);
    var J = [[2 * a * x[0] + b * x[1], b * x[0]], [d, 2 * c * x[1]]];
    return {
      q: '<p>Compute the Jacobian of ' + T('\\mathbf f : \\mathbb R^2 \\to \\mathbb R^2') + ' at ' + T('\\mathbf x = (' + x.join(', ') + ')') + '.</p>' +
        TT('f_1(x_1, x_2) = ' + coef(a, 'x_1^2') + signed(b, 'x_1x_2') + ',\\qquad f_2(x_1, x_2) = ' + coef(c, 'x_2^2') + signed(d, 'x_1')),
      hint: 'Row ' + T('i') + ' of the Jacobian is the gradient of ' + T('f_i') + '. Entry ' + T('(i, j)') + ' is ' + T('\\partial f_i/\\partial x_j') + '.',
      fields: [{ label: T('J'), answer: J, tol: 0 }],
      solution: lines(['J = \\begin{bmatrix} ' + 2 * a + 'x_1 ' + (b < 0 ? '-' : '+') + ' ' + Math.abs(b) + 'x_2 & ' + b + 'x_1 \\\\ ' + d + ' & ' + 2 * c + 'x_2 \\end{bmatrix} = ' + D.mat(J)]) +
        '<p>Row 1 holds the two partial derivatives of ' + T('f_1') + ', row 2 those of ' + T('f_2') + '.</p>'
    };
  }

  /* 4. Jacobian shapes through a composition */
  function lv4() {
    var n = R(2, 9), m = R(2, 9), k = R(1, 9);
    var lay = pick([0, 1]);
    var desc = lay ? '<p>' + T('\\mathbf h = A\\mathbf x') + ' with ' + T('A \\in \\mathbb R^{' + m + '\\times ' + n + '}') + ', then ' + T('\\mathbf y = \\mathbf g(\\mathbf h)') + ' with ' + T('\\mathbf g : \\mathbb R^{' + m + '} \\to \\mathbb R^{' + k + '}') + '.</p>'
      : '<p>' + T('\\mathbf f : \\mathbb R^{' + n + '} \\to \\mathbb R^{' + m + '}') + ' and ' + T('\\mathbf g : \\mathbb R^{' + m + '} \\to \\mathbb R^{' + k + '}') + '. Let ' + T('\\mathbf y = \\mathbf g(\\mathbf f(\\mathbf x))') + '.</p>';
    var a = lay ? '\\partial\\mathbf h/\\partial\\mathbf x' : 'J_{\\mathbf f}', b = lay ? '\\partial\\mathbf y/\\partial\\mathbf h' : 'J_{\\mathbf g}';
    return {
      q: desc + '<p>Give the number of rows and columns of each Jacobian.</p>',
      fields: [{ label: 'Rows of ' + T(a), answer: m, tol: 0 }, { label: 'Columns of ' + T(a), answer: n, tol: 0 },
        { label: 'Rows of ' + T(b), answer: k, tol: 0 }, { label: 'Columns of ' + T(b), answer: m, tol: 0 },
        { label: 'Rows of ' + T('\\partial\\mathbf y/\\partial\\mathbf x'), answer: k, tol: 0 }, { label: 'Columns of ' + T('\\partial\\mathbf y/\\partial\\mathbf x'), answer: n, tol: 0 }],
      cols: 2,
      solution: '<p>A Jacobian has one row per output and one column per input. The chain rule multiplies them:</p>' +
        TT('\\underbrace{\\frac{\\partial\\mathbf y}{\\partial\\mathbf x}}_{' + k + '\\times ' + n + '} = \\underbrace{' + b + '}_{' + k + '\\times ' + m + '}\\;\\underbrace{' + a + '}_{' + m + '\\times ' + n + '}') +
        (lay ? '<p>Here ' + T('\\partial\\mathbf h/\\partial\\mathbf x = A') + ' itself, since the Jacobian of a linear map is its matrix.</p>' : '<p>The inner dimension ' + m + ' must match, just as in any matrix product.</p>')
    };
  }

  /* 5. weight and bias gradient */
  function lv5() {
    var m = pick([2, 3]), n = pick([2, 3]), d = D.randVec(m, -3, 3, true), x = D.randVec(n, -3, 3, true);
    var G = D.outer(d, x);
    return {
      q: '<p>A scalar function ' + T('L') + ' depends on ' + T('W') + ' and ' + T('\\mathbf b') + ' only through ' + T('\\mathbf z = W\\mathbf x + \\mathbf b') + '. At the given ' + T('\\mathbf x') + ' its gradient ' + T('\\boldsymbol\\delta = \\partial L/\\partial\\mathbf z') + ' is known.</p>' + TT('\\mathbf x = ' + D.vec(x) + ',\\qquad \\boldsymbol\\delta = ' + D.vec(d)),
      hint: T('\\partial L/\\partial W = \\boldsymbol\\delta\\mathbf x^\\top') + ' has the shape of ' + T('W') + ', here ' + T(m + '\\times ' + n) + '.',
      fields: [{ label: T('\\partial L/\\partial W'), answer: G, tol: 0 }, { label: T('\\partial L/\\partial\\mathbf b'), answer: d, tol: 0 }],
      solution: lines(['\\frac{\\partial L}{\\partial W} = \\boldsymbol\\delta\\mathbf x^\\top = ' + D.vec(d) + D.rowv(x) + ' = ' + D.mat(G), '\\frac{\\partial L}{\\partial \\mathbf b} = \\boldsymbol\\delta = ' + D.vec(d)]) +
        '<p>Entry ' + T('(i, j)') + ' is ' + T('\\delta_i x_j') + '. By sums: ' + T('W_{ij}') + ' appears only in ' + T('z_i') + ', with factor ' + T('x_j') + '.</p>'
    };
  }

  /* 6. backward through a ReLU layer */
  function lv6() {
    var W = D.randMat(2, 3, -3, 3), x = D.randVec(3, -2, 2, true), b = D.randVec(2, -2, 2);
    var z = D.add(D.mv(W, x), b);
    if (z[0] === 0 || z[1] === 0) return null;
    if (z[0] > 0 && z[1] > 0 && Math.random() < 0.6) return null;
    var g = D.randVec(2, -3, 3, true), dz = z.map(function (v, i) { return v > 0 ? g[i] : 0; });
    var dx = D.mv(D.tr(W), dz);
    return {
      q: '<p>Forward: ' + T('\\mathbf z = W\\mathbf x + \\mathbf b') + ', then ' + T('h_i = \\max(0, z_i)') + ' for each entry. A scalar function ' + T('L') + ' of ' + T('\\mathbf h') + ' has known gradient ' + T('\\partial L/\\partial\\mathbf h') + '. Use the chain rule to find ' + T('\\partial L/\\partial\\mathbf x') + '.</p>' +
        TT('W = ' + D.mat(W) + ',\\; \\mathbf x = ' + D.vec(x) + ',\\; \\mathbf b = ' + D.vec(b) + ',\\; \\frac{\\partial L}{\\partial\\mathbf h} = ' + D.vec(g)),
      hint: 'First compute ' + T('\\mathbf z') + '. The derivative of ' + T('\\max(0, z)') + ' is 1 for ' + T('z > 0') + ' and 0 for ' + T('z < 0') + ', so the gradient passes where ' + T('z_i > 0') + ' and blocks it elsewhere. Then multiply by ' + T('W^\\top') + '.',
      fields: [{ label: T('\\mathbf z'), answer: z, tol: 0 }, { label: T('\\partial L/\\partial\\mathbf z'), answer: dz, tol: 0 }, { label: T('\\partial L/\\partial\\mathbf x'), answer: dx, tol: 0 }],
      solution: lines(['\\mathbf z = ' + D.mat(W) + D.vec(x) + ' + ' + D.vec(b) + ' = ' + D.vec(z),
        '\\frac{\\partial L}{\\partial\\mathbf z} = \\frac{\\partial L}{\\partial\\mathbf h}\\odot\\mathbb 1[\\mathbf z > 0] = ' + D.vec(g) + '\\odot' + D.vec(z.map(function (v) { return v > 0 ? 1 : 0; })) + ' = ' + D.vec(dz),
        '\\frac{\\partial L}{\\partial\\mathbf x} = W^\\top\\frac{\\partial L}{\\partial\\mathbf z} = ' + D.mat(D.tr(W)) + D.vec(dz) + ' = ' + D.vec(dx)]) +
        '<p>The Jacobian of an entrywise function is diagonal, so multiplying by it is an entrywise product. An entry with ' + T('z_i < 0') + ' passes nothing back.</p>'
    };
  }

  /* 7. least squares gradient */
  function lv7() {
    var X = D.randMat(3, 2, -2, 2), w = D.randVec(2, -2, 2, true), y = D.randVec(3, -3, 3);
    var r = D.sub(D.mv(X, w), y), g = D.scale(D.mv(D.tr(X), r), 2);
    if (sum(r.map(Math.abs)) === 0) return null;
    return {
      q: '<p>Compute the gradient of the squared error ' + T('L(\\mathbf w) = \\lVert X\\mathbf w - \\mathbf y\\rVert^2') + ' with respect to ' + T('\\mathbf w') + '.</p>' +
        TT('X = ' + D.mat(X) + ',\\qquad \\mathbf w = ' + D.vec(w) + ',\\qquad \\mathbf y = ' + D.vec(y)),
      hint: 'Write ' + T('\\mathbf r = X\\mathbf w - \\mathbf y') + '. Then ' + T('L = \\mathbf r^\\top\\mathbf r') + ', ' + T('\\partial L/\\partial\\mathbf r = 2\\mathbf r') + ', and the chain rule through ' + T('X\\mathbf w') + ' multiplies by ' + T('X^\\top') + '.',
      fields: [{ label: 'Residual ' + T('\\mathbf r'), answer: r, tol: 0 }, { label: T('\\nabla_{\\mathbf w} L'), answer: g, tol: 0 }],
      solution: lines(['\\mathbf r = X\\mathbf w - \\mathbf y = ' + D.vec(D.mv(X, w)) + ' - ' + D.vec(y) + ' = ' + D.vec(r),
        '\\nabla_{\\mathbf w}L = 2X^\\top\\mathbf r = 2' + D.mat(D.tr(X)) + D.vec(r) + ' = ' + D.vec(g)]) +
        '<p>By sums: ' + T('\\partial L/\\partial w_j = \\sum_i 2r_iX_{ij}') + ', a sum over the first index of ' + T('X') + ', hence the transpose.</p>'
    };
  }

  /* 8. batch shape puzzle */
  function lv8() {
    var B = R(2, 9), n = R(2, 9), m = R(2, 9);
    if (B === n || B === m || n === m) return null;
    var cands = [['G^\\top X', true], ['X^\\top G', false], ['G X^\\top', false], ['X G^\\top', false], ['X^\\top G^\\top', false]];
    var opts = D.shuffle(cands.slice(0, 4));
    function sh(e) {
      var dims = { G: [B, m], X: [B, n] }, parts = e.replace(/\\top/g, "'").split(' ');
      var ss = parts.map(function (p) { var dd = dims[p[0]]; return p.indexOf("'") >= 0 ? [dd[1], dd[0]] : dd; });
      return ss[0][1] === ss[1][0] ? T(ss[0][0] + '\\times ' + ss[1][1]) : 'undefined, ' + T(ss[0][1] + '\\ne ' + ss[1][0]);
    }
    return {
      q: '<p>' + B + ' vectors are stored row by row in ' + T('X \\in \\mathbb R^{' + B + '\\times ' + n + '}') + '. Let ' + T('Z = XW^\\top') + ' with ' + T('W \\in \\mathbb R^{' + m + '\\times ' + n + '}') + ', so ' + T('Z \\in \\mathbb R^{' + B + '\\times ' + m + '}') + '. A scalar function ' + T('L') + ' of ' + T('Z') + ' has known gradient ' + T('G = \\partial L/\\partial Z') + ', of the same shape as ' + T('Z') + '.</p>' +
        '<p>Which expression is ' + T('\\partial L/\\partial W') + '? Use only the shapes.</p>',
      options: opts.map(function (o) { return T(o[0]); }),
      answer: opts.findIndex(function (o) { return o[1]; }),
      optCols: 2,
      solution: '<p>' + T('\\partial L/\\partial W') + ' must have the shape of ' + T('W') + ', which is ' + T(m + '\\times ' + n) + '. Check every candidate:</p>' +
        '<ul>' + opts.map(function (o) { return '<li>' + T(o[0]) + ': ' + sh(o[0]) + '</li>'; }).join('') + '</ul>' +
        '<p>Only ' + T('G^\\top X') + ' fits. It is the sum of the outer products ' + T('\\mathbf g_b\\mathbf x_b^\\top') + ', one per row ' + T('b') + ', where ' + T('\\mathbf g_b') + ' and ' + T('\\mathbf x_b') + ' are row ' + T('b') + ' of ' + T('G') + ' and ' + T('X') + '.</p>'
    };
  }

  function psn(v) { return v < 0 ? "(" + v + ")" : String(v); }
  function sg(v) { return v < 0 ? ' - ' + (-v) : ' + ' + v; }
  function msc(A, c) { return A.map(function (r) { return r.map(function (a) { return a * c; }); }); }

  /* by sums: expand a 2 by 2 quadratic form */
  function lvExpand() {
    var A = D.randMat(2, 2, -3, 3);
    if (A[0][1] === A[1][0] || A[0][0] === 0 || A[1][1] === 0) return null;
    var c11 = A[0][0], c12 = A[0][1] + A[1][0], c22 = A[1][1];
    return {
      q: '<p>Write ' + T('f(\\mathbf x) = \\mathbf x^\\top A\\mathbf x = \\sum_i\\sum_k A_{ik}x_ix_k') + ' out as a polynomial in ' + T('x_1, x_2') + '. Give the coefficients, then differentiate and write ' + T('\\partial f/\\partial x_1 = p\\,x_1 + q\\,x_2') + ' and ' + T('\\partial f/\\partial x_2 = r\\,x_1 + s\\,x_2') + '.</p>' + TT('A = ' + D.mat(A)),
      hint: 'There are four terms. The two mixed terms ' + T('A_{12}x_1x_2') + ' and ' + T('A_{21}x_2x_1') + ' combine.',
      fields: [{ group: 'The polynomial' }, { label: T('x_1^2'), answer: c11, tol: 0 }, { label: T('x_1x_2'), answer: c12, tol: 0 }, { label: T('x_2^2'), answer: c22, tol: 0 },
        { group: 'The derivatives' }, { label: T('\\begin{pmatrix} p & q \\\\ r & s \\end{pmatrix} ='), answer: [[2 * c11, c12], [c12, 2 * c22]], tol: 0 }],
      cols: 3,
      solution: lines(['f = ' + c11 + 'x_1^2 + (' + A[0][1] + sg(A[1][0]) + ')\\,x_1x_2' + sg(c22) + 'x_2^2',
        '\\frac{\\partial f}{\\partial x_1} = ' + 2 * c11 + 'x_1' + sg(c12) + 'x_2', '\\frac{\\partial f}{\\partial x_2} = ' + c12 + 'x_1' + sg(2 * c22) + 'x_2']) +
        '<p>Compare with the rule: the matrix of coefficients is exactly ' + T('A + A^\\top = ' + D.mat([[2 * c11, c12], [c12, 2 * c22]])) + ', so ' + T('\\nabla f = (A + A^\\top)\\mathbf x') + '.</p>'
    };
  }

  /* by sums: translate an index sum */
  var IDX = [
    [['\\sum_k A_{ik}x_k', 'i', 'A\\mathbf x'], ['\\sum_k A_{ki}x_k', 'i', 'A^\\top\\mathbf x'], ['\\sum_k A_{ik}y_k', 'i', 'A\\mathbf y'], ['\\sum_k A_{ki}y_k', 'i', 'A^\\top\\mathbf y']],
    [['\\sum_k A_{ik}B_{kj}', '(i, j)', 'AB'], ['\\sum_k A_{ki}B_{kj}', '(i, j)', 'A^\\top B'], ['\\sum_k A_{ik}B_{jk}', '(i, j)', 'AB^\\top'], ['\\sum_k B_{ik}A_{kj}', '(i, j)', 'BA'], ['a_ib_j', '(i, j)', '\\mathbf a\\mathbf b^\\top'], ['b_ia_j', '(i, j)', '\\mathbf b\\mathbf a^\\top'], ['\\sum_k A_{ki}B_{jk}', '(i, j)', 'A^\\top B^\\top']],
    [['\\sum_k x_ky_k', '', '\\mathbf x^\\top\\mathbf y'], ['\\sum_i\\sum_k x_iA_{ik}y_k', '', '\\mathbf x^\\top A\\mathbf y'], ['\\sum_i\\sum_k y_iA_{ik}x_k', '', '\\mathbf y^\\top A\\mathbf x'], ['\\sum_i\\sum_k x_iA_{ki}y_k', '', '\\mathbf x^\\top A^\\top\\mathbf y']]
  ];
  function lvIndex() {
    var g = pick(IDX), it = pick(g), rest = D.shuffle(g.filter(function (o) { return o !== it; })).slice(0, 3);
    var opts = D.shuffle([it].concat(rest));
    return {
      q: '<p>' + (it[1] ? 'Which matrix expression has entry ' + T(it[1]) + ' equal to' : 'Which matrix expression equals') + '</p>' + TT(it[0]),
      hint: 'Find the summed index. In a matrix product it sits on the inside, as in ' + T('A_{ik}B_{kj}') + '. If it sits on the outside of a matrix, transpose that matrix.',
      options: opts.map(function (o) { return T(o[2]); }),
      answer: opts.indexOf(it),
      optCols: 2,
      solution: '<p>' + T(it[0]) + (it[1] ? ' is entry ' + T(it[1]) + ' of ' : ' equals ') + T(it[2]) + '. Use ' + T('A_{ki} = (A^\\top)_{ik}') + ' to move a summed index to the inside.</p>'
    };
  }

  /* by rules: match a function to its gradient */
  var RULES = [
    ['\\mathbf a^\\top\\mathbf x', '\\nabla f', '\\mathbf a', ['\\mathbf x', '2\\mathbf a', '\\mathbf a^\\top\\mathbf a', '\\mathbf a\\mathbf x^\\top']],
    ['\\mathbf x^\\top A\\mathbf x', '\\nabla f', '(A + A^\\top)\\mathbf x', ['A\\mathbf x', 'A^\\top\\mathbf x', '2\\mathbf x', 'A + A^\\top']],
    ['\\lVert\\mathbf x\\rVert^2', '\\nabla f', '2\\mathbf x', ['\\mathbf x', '2\\lVert\\mathbf x\\rVert', '\\mathbf x\\mathbf x^\\top', '2']],
    ['\\mathbf b^\\top A\\mathbf x', '\\nabla f', 'A^\\top\\mathbf b', ['A\\mathbf b', 'A\\mathbf x', '\\mathbf b', '\\mathbf b\\mathbf x^\\top']],
    ['\\lVert A\\mathbf x - \\mathbf b\\rVert^2', '\\nabla f', '2A^\\top(A\\mathbf x - \\mathbf b)', ['2A(A\\mathbf x - \\mathbf b)', '2(A\\mathbf x - \\mathbf b)', '2A^\\top A', '2\\lVert A\\mathbf x - \\mathbf b\\rVert']],
    ['\\mathbf x^\\top\\mathbf x + \\mathbf a^\\top\\mathbf x', '\\nabla f', '2\\mathbf x + \\mathbf a', ['\\mathbf x + \\mathbf a', '2\\mathbf x', '2(\\mathbf x + \\mathbf a)', '2\\mathbf x\\mathbf a^\\top']],
    ['\\mathbf x^\\top S\\mathbf x\\ \\text{with}\\ S = S^\\top', '\\nabla f', '2S\\mathbf x', ['S\\mathbf x', '2\\mathbf x', 'S + S^\\top', '2S']],
    ['g(A\\mathbf x + \\mathbf c)', '\\nabla f', 'A^\\top\\nabla g(A\\mathbf x + \\mathbf c)', ['A\\nabla g(A\\mathbf x + \\mathbf c)', '\\nabla g(A\\mathbf x + \\mathbf c)', 'A^\\top\\nabla g(\\mathbf x)', 'A^\\top A\\nabla g(\\mathbf x)']],
    ['\\lVert A\\mathbf x\\rVert^2', '\\nabla f', '2A^\\top A\\mathbf x', ['2A\\mathbf x', '2AA^\\top\\mathbf x', '2A^\\top\\mathbf x', '2\\mathbf x']],
    ['\\mathbf a^\\top W\\mathbf b', '\\partial f/\\partial W', '\\mathbf a\\mathbf b^\\top', ['\\mathbf b\\mathbf a^\\top', '\\mathbf a^\\top\\mathbf b', 'W\\mathbf b', '\\mathbf a\\mathbf b^\\top W']],
    ['\\lVert W\\mathbf x\\rVert^2', '\\partial f/\\partial W', '2W\\mathbf x\\mathbf x^\\top', ['2W\\mathbf x', '2\\mathbf x\\mathbf x^\\top', '2W^\\top W\\mathbf x', '2\\mathbf x\\mathbf x^\\top W']],
    ['\\lVert W\\mathbf x - \\mathbf y\\rVert^2', '\\partial f/\\partial W', '2(W\\mathbf x - \\mathbf y)\\mathbf x^\\top', ['2W^\\top(W\\mathbf x - \\mathbf y)', '2(W\\mathbf x - \\mathbf y)', '2\\mathbf x(W\\mathbf x - \\mathbf y)^\\top', '2\\mathbf x\\mathbf x^\\top']],
    ['\\mathbf u^\\top W\\mathbf x + \\mathbf c^\\top W\\mathbf x', '\\partial f/\\partial W', '(\\mathbf u + \\mathbf c)\\mathbf x^\\top', ['\\mathbf x(\\mathbf u + \\mathbf c)^\\top', '\\mathbf u\\mathbf x^\\top', '(\\mathbf u + \\mathbf c)^\\top\\mathbf x', 'W^\\top(\\mathbf u + \\mathbf c)']]
  ];
  function lvRules() {
    var r = pick(RULES), wr = D.shuffle(r[3].slice()).slice(0, 3), opts = D.shuffle([r[2]].concat(wr));
    var isW = r[1] !== '\\nabla f';
    return {
      q: '<p>Which expression is ' + T(r[1]) + ' when</p>' + TT('f(' + (isW ? 'W' : '\\mathbf x') + ') = ' + r[0]),
      hint: 'First check the shape: the gradient has the shape of ' + T(isW ? 'W' : '\\mathbf x') + '. Then look for a missing transpose or factor of 2.',
      options: opts.map(function (o) { return T(o); }), answer: opts.indexOf(r[2]), optCols: 2,
      solution: '<p>' + T(r[1] + ' = ' + r[2]) + '. If the rule does not come to mind, write ' + T('f') + ' as a sum, take one partial derivative and read off the matrix form.</p>'
    };
  }

  /* both routes: a^T W b with respect to W */
  function lvAWB() {
    var m = 2, n = pick([2, 3]), a = D.randVec(m, -3, 3, true), b = D.randVec(n, -3, 3, true), W = D.randMat(m, n, -2, 2);
    var G = D.outer(a, b), i = R(1, m), j = R(1, n);
    return {
      q: '<p>Compute the gradient of ' + T('f(W) = \\mathbf a^\\top W\\mathbf b') + ' with respect to the matrix ' + T('W') + '.</p>' + TT('\\mathbf a = ' + D.vec(a) + ',\\quad W = ' + D.mat(W) + ',\\quad \\mathbf b = ' + D.vec(b)),
      hint: 'By sums, ' + T('f = \\sum_i\\sum_j a_iW_{ij}b_j') + ', and ' + T('W_{ij}') + ' appears in one term only.',
      fields: [{ label: T('\\partial f/\\partial W'), answer: G, tol: 0 }],
      solution: lines(['\\frac{\\partial f}{\\partial W_{' + i + j + '}} = a_' + i + 'b_' + j + ' = ' + psn(a[i - 1]) + '\\cdot ' + psn(b[j - 1]) + ' = ' + G[i - 1][j - 1],
        '\\frac{\\partial f}{\\partial W} = \\mathbf a\\mathbf b^\\top = ' + D.vec(a) + D.rowv(b) + ' = ' + D.mat(G)]) +
        '<p>The entries of ' + T('W') + ' do not matter, because ' + T('f') + ' is linear in ' + T('W') + '.</p>'
    };
  }

  /* both routes: squared error with respect to W */
  function lvWx() {
    var m = 2, n = pick([2, 3]), W = D.randMat(m, n, -2, 2), x = D.randVec(n, -2, 2, true), y = D.randVec(m, -3, 3);
    var e = D.sub(D.mv(W, x), y), G = msc(D.outer(e, x), 2);
    if (e[0] === 0 && e[1] === 0) return null;
    return {
      q: '<p>Compute the gradient of ' + T('f(W) = \\lVert W\\mathbf x - \\mathbf y\\rVert^2') + ' with respect to ' + T('W') + '.</p>' + TT('W = ' + D.mat(W) + ',\\quad \\mathbf x = ' + D.vec(x) + ',\\quad \\mathbf y = ' + D.vec(y)),
      hint: 'Let ' + T('\\mathbf e = W\\mathbf x - \\mathbf y') + '. The entry ' + T('W_{pq}') + ' appears only in ' + T('e_p') + ', with factor ' + T('x_q') + ', so ' + T('\\partial f/\\partial W_{pq} = 2e_px_q') + '.',
      fields: [{ label: T('\\mathbf e = W\\mathbf x - \\mathbf y'), answer: e, tol: 0 }, { label: T('\\partial f/\\partial W'), answer: G, tol: 0 }],
      solution: lines(['\\mathbf e = ' + D.vec(D.mv(W, x)) + ' - ' + D.vec(y) + ' = ' + D.vec(e),
        '\\frac{\\partial f}{\\partial W} = 2\\mathbf e\\,\\mathbf x^\\top = 2' + D.vec(e) + D.rowv(x) + ' = ' + D.mat(G)]) +
        '<p>By rules: ' + T('f') + ' depends on ' + T('W') + ' only through ' + T('\\mathbf z = W\\mathbf x') + ' with ' + T('\\nabla_{\\mathbf z}f = 2(\\mathbf z - \\mathbf y)') + ', and the gradient with respect to ' + T('W') + ' is that vector times ' + T('\\mathbf x^\\top') + '.</p>'
    };
  }

  var LEVELS = [
    ['Index sums to matrices', 'Translate a sum over indices into matrix form.', lvIndex, 5],
    ['Expand a quadratic form', 'Write the function out as a polynomial and differentiate term by term.', lvExpand, 3],
    ['Linear and squared terms', 'The gradient of a.x plus a multiple of the squared length.', lv1, 4],
    ['Quadratic forms', 'The gradient of x transposed A x for a matrix that is not symmetric.', lv2, 4],
    ['Pick the rule', 'Match a function to its gradient. Check the shape first.', lvRules, 6],
    ['Least squares', 'The gradient of a squared error, by sums and by rules.', lv7, 3],
    ['Jacobians', 'All partial derivatives of a map from the plane to the plane.', lv3, 4],
    ['Jacobian shapes', 'Rows and columns through a composition.', lv4, 3],
    ['Gradient by a matrix', 'The gradient of a transposed W b with respect to W.', lvAWB, 3],
    ['Squared error by a matrix', 'The gradient of the squared length of Wx minus y with respect to W.', lvWx, 3],
    ['The outer product rule', 'Gradients with respect to W and b when the gradient with respect to z = Wx + b is known.', lv5, 4],
    ['Through max(0, z)', 'The chain rule through Wx + b and an entrywise maximum.', lv6, 3],
    ['Stacked inputs', 'Find the gradient with respect to W by matching shapes.', lv8, 4]
  ];

  var steps = [{
    kind: 'text', title: 'Matrix calculus practice',
    html: '<p>The first levels practise the sums route from <a href="#/l/mv-s6">Two ways to differentiate</a>, the later ones the rules from <a href="#/l/mv-s5">Vector and matrix derivatives</a>. Several levels ask for both. Each level generates fresh problems for as long as you like.</p>' +
      D.levelList('mv-drill', LEVELS.map(function (l) { return l[0]; })) +
      '<p class="m4-note">Enter vectors and matrices entry by entry. All answers are whole numbers. Later in the course, exactly these rules compute the gradients of neural networks.</p>'
  }];
  LEVELS.forEach(function (l, i) {
    steps.push({ kind: 'exercise', title: 'Level ' + (i + 1) + ': ' + l[0], html: '<p>' + l[1] + '</p>', mount: function (el, ctx) { M4.drill(el, ctx, { gen: function () { for (var t = 0; t < 200; t++) { var p = l[2](); if (p) return p; } return l[2](); }, n: l[3], key: 'mv-drill:' + (i + 1) }); } });
  });

  M4.lesson({ id: 'mv-drill', module: 'multivariable', title: 'Matrix calculus practice', summary: 'Thirteen levels of endless problems: index sums, gradients by sums and by rules, Jacobians and gradients with respect to a matrix.', minutes: 25, free: true, drill: true, steps: steps });
})();
