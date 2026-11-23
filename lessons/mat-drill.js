/* Matrix drill: matrix times vector, shapes, products, transposes, determinants, inverses and building a matrix from images of basis vectors. */
(function () {
  'use strict';
  var D = M4.D, T = D.T, TT = D.TT;
  var R = M4.rand, RN = M4.randNZ, pick = M4.pick;

  function lines(arr) { return '<div class="m4-drill-lines">' + arr.map(TT).join('') + '</div>'; }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b ? gcd(b, a % b) : a || 1; }
  function frac(n, d) {
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d); n /= g; d /= g;
    return d === 1 ? String(n) : (n < 0 ? '-' : '') + '\\tfrac{' + Math.abs(n) + '}{' + d + '}';
  }
  function mix(right, wrong) {
    var o = D.shuffle([right].concat(wrong));
    return { options: o, answer: o.indexOf(right) };
  }
  function rowTimes(r, x) { return r.map(function (a, j) { return D.pt(a) + '\\cdot' + D.pt(x[j]); }).join(' + '); }
  function e(i, n) { var v = []; for (var k = 0; k < n; k++) v.push(k === i ? 1 : 0); return v; }

  /* 1. matrix times vector, rows view */
  function lv1() {
    var n = pick([2, 3]), A = D.randMat(n, n, -4, 4), x = D.randVec(n, -3, 3), y = D.mv(A, x);
    return {
      q: '<p>Compute ' + T('A\\mathbf x') + '.</p>' + TT('A = ' + D.mat(A) + ',\\qquad \\mathbf x = ' + D.vec(x)),
      hint: 'Entry ' + T('i') + ' of the result is the dot product of row ' + T('i') + ' of ' + T('A') + ' with ' + T('\\mathbf x') + '.',
      fields: [{ label: T('A\\mathbf x'), answer: y, tol: 0 }],
      solution: lines(A.map(function (r, i) { return '(A\\mathbf x)_' + (i + 1) + ' = ' + rowTimes(r, x) + ' = ' + y[i]; })) +
        '<p>This is the rows view from <a href="#/l/matrices-s2">Matrix times vector</a>.</p>'
    };
  }

  /* 2. matrix times vector, columns view */
  function lv2() {
    var A = D.randMat(2, 3, -4, 4), x = D.randVec(3, -3, 3, true), y = D.mv(A, x), C = D.tr(A);
    return {
      q: '<p>Write ' + T('A\\mathbf x') + ' as a combination of the columns of ' + T('A') + ', then compute it.</p>' + TT('A = ' + D.mat(A) + ',\\qquad \\mathbf x = ' + D.vec(x)),
      hint: T('A\\mathbf x = x_1\\mathbf a_1 + x_2\\mathbf a_2 + x_3\\mathbf a_3') + ', where ' + T('\\mathbf a_j') + ' is column ' + T('j') + '. The weight of each column is the matching entry of ' + T('\\mathbf x') + '.',
      fields: [{ label: 'Weight of column 1', answer: x[0], tol: 0 }, { label: 'Weight of column 3', answer: x[2], tol: 0 }, { label: T('A\\mathbf x'), answer: y, tol: 0 }],
      solution: lines(['A\\mathbf x = ' + C.map(function (c, j) { return D.pt(x[j]) + D.vec(c); }).join(' + '),
        '= ' + C.map(function (c, j) { return D.vec(D.scale(c, x[j])); }).join(' + ') + ' = ' + D.vec(y)]) +
        '<p>Both views give the same vector. The columns view explains why the outputs of ' + T('A') + ' are the span of its columns.</p>'
    };
  }

  /* 3. shape rule */
  function lv3() {
    var m = R(1, 5), k = R(1, 5), n = R(1, 5), ok = Math.random() < 0.7, k2 = k;
    if (!ok) { do k2 = R(1, 5); while (k2 === k); }
    var right = ok ? T(m + '\\times ' + n) : 'Not defined';
    var wrong = ok ? [T(n + '\\times ' + m), T(m + '\\times ' + k), 'Not defined'] : [T(m + '\\times ' + n), T(k + '\\times ' + k2), T(m + '\\times ' + k2)];
    if (new Set(wrong.concat([right])).size < 4) return null;
    var o = mix(right, wrong);
    return {
      q: '<p>' + T('A') + ' has shape ' + T(m + '\\times ' + k) + ' and ' + T('B') + ' has shape ' + T(k2 + '\\times ' + n) + '. What is the shape of ' + T('AB') + '?</p>',
      hint: 'The inner sizes must match. The result keeps the outer sizes: rows of ' + T('A') + ' and columns of ' + T('B') + '.',
      options: o.options, answer: o.answer, optCols: 2,
      solution: '<p>' + (ok ? 'The inner sizes are both ' + k + ', so the product exists and has shape ' + T(m + '\\times ' + n) + '.' : 'A row of ' + T('A') + ' has ' + k + ' entries but a column of ' + T('B') + ' has ' + k2 + ', so the dot products cannot be formed.') + ' See <a href="#/l/matrices-s3">Matrix multiplication</a>.</p>'
    };
  }

  /* 4. 2x2 product */
  function lv4() {
    var A = D.randMat(2, 2, -3, 4), B = D.randMat(2, 2, -3, 4), P = D.mm(A, B), Bt = D.tr(B);
    return {
      q: '<p>Compute the product ' + T('AB') + '.</p>' + TT('A = ' + D.mat(A) + ',\\qquad B = ' + D.mat(B)),
      hint: 'Entry ' + T('(i,j)') + ' is row ' + T('i') + ' of ' + T('A') + ' dotted with column ' + T('j') + ' of ' + T('B') + '.',
      fields: [{ label: T('AB'), answer: P, tol: 0 }],
      solution: lines([0, 1].map(function (i) { return [0, 1].map(function (j) { return '(AB)_{' + (i + 1) + (j + 1) + '} = ' + rowTimes(A[i], Bt[j]) + ' = ' + P[i][j]; }).join(',\\quad '); }).concat(['AB = ' + D.mat(P)])) +
        '<p>Four entries, four dot products.</p>'
    };
  }

  /* 5. one entry of a larger product */
  function lv5() {
    var m = pick([2, 3]), k = pick([3, 4]), n = pick([2, 3]), A = D.randMat(m, k, -3, 4), B = D.randMat(k, n, -3, 4);
    var i = R(0, m - 1), j = R(0, n - 1), col = D.tr(B)[j], v = D.dot(A[i], col);
    return {
      q: '<p>Compute only the entry ' + T('(AB)_{' + (i + 1) + (j + 1) + '}') + '.</p>' + TT('A = ' + D.mat(A) + ',\\qquad B = ' + D.mat(B)),
      hint: 'Take row ' + (i + 1) + ' of ' + T('A') + ' and column ' + (j + 1) + ' of ' + T('B') + '. You never need the other entries.',
      fields: [{ label: T('(AB)_{' + (i + 1) + (j + 1) + '}'), answer: v, tol: 0 }],
      solution: lines(['(AB)_{' + (i + 1) + (j + 1) + '} = ' + rowTimes(A[i], col) + ' = ' + v]) +
        '<p>The full product has shape ' + T(m + '\\times ' + n) + ' and every entry is one dot product of length ' + k + '.</p>'
    };
  }

  /* 6. transpose of a product */
  function lv6() {
    var A = D.randMat(2, 3, -3, 3), B = D.randMat(3, 2, -3, 3), P = D.tr(D.mm(A, B));
    var kind = R(0, 1), right, wrong;
    if (kind === 0) {
      right = T('B^\\top A^\\top'); wrong = [T('A^\\top B^\\top'), T('AB'), T('BA')];
      var o = mix(right, wrong);
      return {
        q: '<p>Which expression equals ' + T('(AB)^\\top') + ' for all matrices whose product is defined?</p>',
        hint: 'Check the shapes. If ' + T('A') + ' is ' + T('2\\times 3') + ' and ' + T('B') + ' is ' + T('3\\times 4') + ', which candidate is defined and has shape ' + T('4\\times 2') + '?',
        options: o.options, answer: o.answer, optCols: 2,
        solution: '<p>Transposing reverses the order: ' + T('(AB)^\\top = B^\\top A^\\top') + '. With the shapes from the hint, ' + T('B^\\top A^\\top') + ' is ' + T('(4\\times 3)(3\\times 2) = 4\\times 2') + ', while ' + T('A^\\top B^\\top') + ' is not even defined. Later in the course this rule comes up whenever derivatives of matrix products are computed.</p>'
      };
    }
    return {
      q: '<p>Compute ' + T('B^\\top A^\\top') + '. It is quicker to find ' + T('AB') + ' first.</p>' + TT('A = ' + D.mat(A) + ',\\qquad B = ' + D.mat(B)),
      hint: T('B^\\top A^\\top = (AB)^\\top') + '. Compute the ' + T('2\\times 2') + ' product ' + T('AB') + ' and swap rows with columns.',
      fields: [{ label: T('B^\\top A^\\top'), answer: P, tol: 0 }],
      solution: lines(['AB = ' + D.mat(D.mm(A, B)), 'B^\\top A^\\top = (AB)^\\top = ' + D.mat(P)]) +
        '<p>Transposing swaps the off diagonal entries and leaves the diagonal alone.</p>'
    };
  }

  /* 7. determinant */
  function lv7() {
    var A = D.randMat(2, 2, -5, 5), d = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    var opts = ['Keeps orientation', 'Flips orientation', 'Squashes the plane flat'];
    if (d === 0 && Math.random() < 0.6) return null;
    return {
      q: '<p>Compute the determinant and say what the map does to the plane.</p>' + TT('A = ' + D.mat(A)),
      hint: T('\\det\\begin{bmatrix}a & b\\\\ c & d\\end{bmatrix} = ad - bc') + '. Its absolute value is the area factor and its sign tells whether the map flips the plane.',
      fields: [{ label: T('\\det A'), answer: d, tol: 0 }, { label: 'Area factor', answer: Math.abs(d), tol: 0 }, { label: 'Effect', answer: d > 0 ? 0 : d < 0 ? 1 : 2, select: opts }],
      solution: lines(['\\det A = ' + D.pt(A[0][0]) + '\\cdot' + D.pt(A[1][1]) + ' - ' + D.pt(A[0][1]) + '\\cdot' + D.pt(A[1][0]) + ' = ' + d]) +
        '<p>' + (d === 0 ? 'The columns are parallel, so the whole plane lands on a line and the map has no inverse.' : 'The unit square becomes a parallelogram of area ' + Math.abs(d) + (d < 0 ? ', and the map turns it over like a mirror.' : '.')) + ' See <a href="#/l/matrices-s4">Determinant and inverse</a>.</p>'
    };
  }

  /* 8. inverse */
  function lv8() {
    var A = D.randMat(2, 2, -4, 5), d = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    if (!d || Math.abs(d) > 12) return null;
    var adj = [[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]];
    var inv = adj.map(function (r) { return r.map(function (v) { return D.r(v / d, 4); }); });
    return {
      q: '<p>Compute the inverse. Fractions such as 3/7 are accepted.</p>' + TT('A = ' + D.mat(A)),
      hint: 'Swap the diagonal entries, negate the other two, then divide everything by ' + T('\\det A') + '.',
      fields: [{ label: T('\\det A'), answer: d, tol: 0 }, { label: T('A^{-1}'), answer: inv }],
      solution: lines(['\\det A = ' + d, 'A^{-1} = \\frac{1}{' + d + '}' + D.mat(adj) + ' = ' + D.mat(adj.map(function (r) { return r.map(function (v) { return frac(v, d); }); }))]) +
        '<p>Check one entry of ' + T('AA^{-1}') + ': the first row of ' + T('A') + ' times the first column of ' + T('A^{-1}') + ' gives ' + T('(' + A[0][0] + '\\cdot ' + D.pt(adj[0][0]) + ' + ' + D.pt(A[0][1]) + '\\cdot ' + D.pt(adj[1][0]) + ')/' + D.pt(d) + ' = 1') + '.</p>'
    };
  }

  /* 9. build the matrix from images of the basis vectors */
  function lv9() {
    var n = pick([2, 2, 3]), A = D.randMat(n, n, -3, 3), C = D.tr(A), x = D.randVec(n, -2, 3, true), y = D.mv(A, x);
    var names = n === 2 ? ['\\mathbf e_1', '\\mathbf e_2'] : ['\\mathbf e_1', '\\mathbf e_2', '\\mathbf e_3'];
    return {
      q: '<p>A linear map ' + T('f') + ' sends the basis vectors to</p>' + TT(C.map(function (c, j) { return 'f(' + names[j] + ') = ' + D.vec(c); }).join(',\\qquad ')) +
        '<p>Write down its matrix and use it to find ' + T('f(\\mathbf x)') + ' for ' + T('\\mathbf x = ' + D.vec(x)) + '.</p>',
      hint: 'The images of the basis vectors are the columns of the matrix, in order.',
      fields: [{ label: T('A'), answer: A, tol: 0 }, { label: T('f(\\mathbf x)'), answer: y, tol: 0 }],
      solution: lines(['A = ' + D.mat(A), 'f(\\mathbf x) = A\\mathbf x = ' + x.map(function (v, j) { return D.pt(v) + D.vec(C[j]); }).join(' + ') + ' = ' + D.vec(y)]) +
        '<p>Because ' + T('\\mathbf x = ' + x.map(function (v, j) { return (j ? (v < 0 ? '- ' : '+ ') + (Math.abs(v) === 1 ? '' : Math.abs(v)) : (v === 1 ? '' : v === -1 ? '-' : v)) + names[j]; }).join(' ')) + ' and ' + T('f') + ' is linear, its image is the same combination of the columns. See <a href="#/l/matrices-s1">Learning goals</a>.</p>'
    };
  }

  var LEVELS = [
    ['Matrix times vector', 'Each output entry is one row dotted with the vector.', lv1, 4],
    ['Columns view', 'The same product as a weighted sum of columns.', lv2, 3],
    ['Shape rule', 'When is a product defined, and what shape is it?', lv3, 4],
    ['2 by 2 product', 'Four entries, four dot products.', lv4, 3],
    ['One entry', 'Pick out a single entry of a larger product.', lv5, 4],
    ['Transpose of a product', 'The order flips.', lv6, 3],
    ['Determinant', 'Area factor and orientation.', lv7, 3],
    ['Inverse', 'The 2 by 2 inverse formula, with fractions.', lv8, 3],
    ['Matrix from a map', 'Columns are where the basis vectors land.', lv9, 3]
  ];

  var steps = [{
    kind: 'text', title: 'Matrix practice',
    html: '<p>This drill repeats the computations from <a href="#/l/matrices-s2">Matrix times vector</a>, <a href="#/l/matrices-s3">Matrix multiplication</a> and <a href="#/l/matrices-s4">Determinant and inverse</a>. Each level generates fresh problems for as long as you like.</p>' +
      D.levelList('mat-drill', LEVELS.map(function (l) { return l[0]; })) +
      '<p class="m4-note">Fractions such as 3/7 are accepted. Vectors come first in <a href="#/l/vec-drill">Vector practice</a>, and derivatives with matrices follow in <a href="#/l/mv-drill">Matrix calculus practice</a>.</p>'
  }];
  LEVELS.forEach(function (l, i) {
    steps.push({ kind: 'exercise', title: 'Level ' + (i + 1) + ': ' + l[0], html: '<p>' + l[1] + '</p>', mount: function (el, ctx) { M4.drill(el, ctx, { gen: function () { for (var t = 0; t < 200; t++) { var p = l[2](); if (p) return p; } return l[2](); }, n: l[3], key: 'mat-drill:' + (i + 1) }); } });
  });

  M4.lesson({ id: 'mat-drill', module: 'matrices', title: 'Matrix practice', summary: 'Practice problems on matrix products, shapes, determinants and inverses, arranged in nine levels. New problems are generated each time.', minutes: 25, free: true, drill: true, steps: steps });
})();
