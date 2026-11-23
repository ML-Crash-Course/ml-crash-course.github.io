/* Vector drill: combinations, dot products, norms, distances, cosine similarity, projections and solving for weights. */
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
  function sq(v) { return v.map(function (x) { return D.pt(x) + '^2'; }).join(' + '); }
  function prods(u, v) { return u.map(function (a, i) { return D.pt(a) + '\\cdot' + D.pt(v[i]); }).join(' + '); }
  /* a vector whose length is a whole number */
  function niceVec() {
    var b = pick([[3, 4], [6, 8], [5, 12], [8, 6], [1, 2, 2], [2, 3, 6], [2, 6, 9], [4, 4, 2], [1, 4, 8]]);
    return D.shuffle(b).map(function (x) { return pick([-1, 1]) * x; });
  }
  function nm(v) { return Math.sqrt(D.dot(v, v)); }
  function cf(a) { return a === 1 ? '' : a === -1 ? '-' : String(a); }
  function combo(a, b) { return cf(a) + '\\mathbf u ' + (b < 0 ? '- ' : '+ ') + cf(Math.abs(b)) + '\\mathbf v'; }

  /* 1. scale and add */
  function lv1() {
    var n = pick([2, 3]), u = D.randVec(n, -4, 4), v = D.randVec(n, -4, 4), a = RN(-3, 3), b = RN(-3, 3);
    var w = D.add(D.scale(u, a), D.scale(v, b));
    return {
      q: '<p>Compute the linear combination.</p>' + TT(combo(a, b) + ',\\qquad \\mathbf u = ' + D.vec(u) + ',\\quad \\mathbf v = ' + D.vec(v)),
      hint: 'Scale each vector entry by entry, then add the entries in the same position.',
      fields: [{ label: T(combo(a, b)), answer: w, tol: 0 }],
      solution: lines([cf(a) + '\\mathbf u = ' + D.vec(D.scale(u, a)) + ',\\qquad ' + cf(b) + '\\mathbf v = ' + D.vec(D.scale(v, b)), combo(a, b) + ' = ' + D.vec(w)]) +
        '<p>Every entry is computed on its own. In the plane this is the tip to tail picture from <a href="#/l/vectors-s1">Learning goals</a>.</p>'
    };
  }

  /* 2. dot product */
  function lv2() {
    var n = pick([3, 4]), u = D.randVec(n, -5, 5), v = D.randVec(n, -5, 5), d = D.dot(u, v);
    return {
      q: '<p>Compute the dot product.</p>' + TT('\\mathbf u = ' + D.vec(u) + ',\\qquad \\mathbf v = ' + D.vec(v)),
      hint: 'Multiply matching entries and add the ' + n + ' products.',
      fields: [{ label: T('\\mathbf u\\cdot\\mathbf v'), answer: d, tol: 0 }],
      solution: lines(['\\mathbf u\\cdot\\mathbf v = ' + prods(u, v) + ' = ' + d]) +
        '<p>' + (d > 0 ? 'Positive: the vectors point into the same half space.' : d < 0 ? 'Negative: the vectors point into opposite half spaces.' : 'Zero: the vectors are perpendicular.') + ' See <a href="#/l/vectors-s2">The dot product</a>.</p>'
    };
  }

  /* 3. norms */
  function lv3() {
    var v = niceVec(), l2 = nm(v), l1 = v.reduce(function (s, x) { return s + Math.abs(x); }, 0), li = Math.max.apply(null, v.map(Math.abs));
    return {
      q: '<p>Compute three norms of the vector below.</p>' + TT('\\mathbf v = ' + D.vec(v)),
      hint: T('\\|\\mathbf v\\|_1') + ' adds the absolute values, ' + T('\\|\\mathbf v\\|_2') + ' is the square root of the sum of squares, and ' + T('\\|\\mathbf v\\|_\\infty') + ' is the largest absolute value.',
      fields: [{ label: T('\\|\\mathbf v\\|_1'), answer: l1, tol: 0 }, { label: T('\\|\\mathbf v\\|_2'), answer: l2, tol: 0 }, { label: T('\\|\\mathbf v\\|_\\infty'), answer: li, tol: 0 }],
      solution: lines(['\\|\\mathbf v\\|_1 = ' + v.map(function (x) { return '|' + x + '|'; }).join(' + ') + ' = ' + l1,
        '\\|\\mathbf v\\|_2 = \\sqrt{' + sq(v) + '} = \\sqrt{' + l2 * l2 + '} = ' + l2, '\\|\\mathbf v\\|_\\infty = ' + li]) +
        '<p>For every vector ' + T('\\|\\mathbf v\\|_\\infty \\le \\|\\mathbf v\\|_2 \\le \\|\\mathbf v\\|_1') + '. See <a href="#/l/vectors-s3">Length and distance</a>.</p>'
    };
  }

  /* 4. distance and unit vector */
  function lv4() {
    var d = niceVec(), a = D.randVec(d.length, -4, 4), b = D.add(a, d), L = nm(d), u = d.map(function (x) { return D.r(x / L, 4); });
    return {
      q: '<p>Two points are given. Compute their distance and the unit vector that points from ' + T('\\mathbf a') + ' to ' + T('\\mathbf b') + '.</p>' + TT('\\mathbf a = ' + D.vec(a) + ',\\qquad \\mathbf b = ' + D.vec(b)),
      hint: 'First form the difference ' + T('\\mathbf b - \\mathbf a') + '. Its length is the distance, and dividing it by that length gives a unit vector.',
      fields: [{ label: T('\\|\\mathbf b - \\mathbf a\\|'), answer: L, tol: 0 }, { label: 'Unit vector', answer: u, tol: 0.006 }],
      solution: lines(['\\mathbf b - \\mathbf a = ' + D.vec(d), '\\|\\mathbf b - \\mathbf a\\| = \\sqrt{' + sq(d) + '} = ' + L, '\\frac{\\mathbf b - \\mathbf a}{' + L + '} = ' + D.mat(d.map(function (x) { return [frac(x, L)]; }))]) +
        '<p>A unit vector keeps only the direction. Its length is 1.</p>'
    };
  }

  /* 5. cosine similarity */
  function lv5() {
    var u = niceVec(), v = niceVec();
    if (u.length !== v.length) return null;
    var d = D.dot(u, v), cs = d / (nm(u) * nm(v)), kind = Math.abs(cs) < 1e-9 ? 2 : cs > 0 ? 0 : 1;
    var opts = ['Less than 90°', 'More than 90°', 'Exactly 90°'];
    return {
      q: '<p>Compute the cosine similarity of the two vectors, then decide what kind of angle they enclose.</p>' + TT('\\mathbf u = ' + D.vec(u) + ',\\qquad \\mathbf v = ' + D.vec(v)),
      hint: T('\\cos\\theta = \\dfrac{\\mathbf u\\cdot\\mathbf v}{\\|\\mathbf u\\|\\,\\|\\mathbf v\\|}') + '. Both lengths here are whole numbers. The sign of the cosine decides the angle.',
      fields: [{ label: T('\\mathbf u\\cdot\\mathbf v'), answer: d, tol: 0 }, { label: T('\\cos\\theta'), answer: D.r(cs, 4), tol: 0.006 }, { label: 'Angle', answer: kind, select: opts }],
      solution: lines(['\\mathbf u\\cdot\\mathbf v = ' + prods(u, v) + ' = ' + d, '\\|\\mathbf u\\| = ' + nm(u) + ',\\qquad \\|\\mathbf v\\| = ' + nm(v), '\\cos\\theta = \\frac{' + d + '}{' + nm(u) + '\\cdot' + nm(v) + '} = ' + frac(d, nm(u) * nm(v)) + ' \\approx ' + D.t(cs, 3)]) +
        '<p>Cosine similarity ignores length and compares only direction. Search systems use it to compare a query vector with stored vectors. The last module of the course uses it to compare words.</p>'
    };
  }

  /* 6. projection */
  function lv6() {
    var n = pick([2, 3]), v = D.randVec(n, -3, 3), u = D.randVec(n, -4, 4), vv = D.dot(v, v), uv = D.dot(u, v);
    if (vv === 0 || uv === 0) return null;
    var c = uv / vv, p = v.map(function (x) { return D.r(c * x, 4); });
    return {
      q: '<p>Project ' + T('\\mathbf u') + ' onto the line through ' + T('\\mathbf v') + '. Fractions are accepted.</p>' + TT('\\mathbf u = ' + D.vec(u) + ',\\qquad \\mathbf v = ' + D.vec(v)),
      hint: 'The projection is ' + T('c\\,\\mathbf v') + ' with ' + T('c = \\dfrac{\\mathbf u\\cdot\\mathbf v}{\\mathbf v\\cdot\\mathbf v}') + '.',
      fields: [{ label: T('\\mathbf u\\cdot\\mathbf v'), answer: uv, tol: 0 }, { label: T('\\mathbf v\\cdot\\mathbf v'), answer: vv, tol: 0 }, { label: T('c'), answer: c }, { label: 'Projection', answer: p }],
      solution: lines(['c = \\frac{' + uv + '}{' + vv + '} = ' + frac(uv, vv), '\\text{proj} = ' + frac(uv, vv) + D.vec(v) + ' = ' + D.mat(v.map(function (x) { return [frac(uv * x, vv)]; }))]) +
        '<p>What remains, ' + T('\\mathbf u - c\\,\\mathbf v') + ', is perpendicular to ' + T('\\mathbf v') + '. Check it: its dot product with ' + T('\\mathbf v') + ' is ' + T('\\mathbf u\\cdot\\mathbf v - c\\,\\mathbf v\\cdot\\mathbf v = 0') + '.</p>'
    };
  }

  /* 7. make two vectors perpendicular */
  function lv7() {
    var v = D.randVec(3, -4, 4), j = R(0, 2), k;
    if (v[j] === 0) return null;
    var u = D.randVec(3, -4, 4);
    var rest = 0; for (var i = 0; i < 3; i++) if (i !== j) rest += u[i] * v[i];
    if (rest % v[j] !== 0) return null;
    k = -rest / v[j];
    var shown = u.map(function (x, i) { return i === j ? 'k' : String(x); });
    return {
      q: '<p>Find the number ' + T('k') + ' that makes the two vectors perpendicular.</p>' + TT('\\mathbf u = ' + D.mat(shown.map(function (x) { return [x]; })) + ',\\qquad \\mathbf v = ' + D.vec(v)),
      hint: 'Perpendicular means ' + T('\\mathbf u\\cdot\\mathbf v = 0') + '. Write out the dot product. It is a linear equation in ' + T('k') + '.',
      fields: [{ label: T('k'), answer: k, tol: 0 }],
      solution: lines(['\\mathbf u\\cdot\\mathbf v = ' + shown.map(function (x, i) { return (x === 'k' ? 'k' : D.pt(+x)) + '\\cdot' + D.pt(v[i]); }).join(' + ') + ' = ' + v[j] + 'k ' + (rest < 0 ? '- ' : '+ ') + Math.abs(rest) + ' = 0', 'k = ' + k]) +
        '<p>Perpendicular vectors share no direction at all, so their dot product vanishes.</p>'
    };
  }

  /* 8. weights of a linear combination */
  function eq(p, q, r) {
    var t = [];
    if (p) t.push(cf(p) + 'a');
    if (q) t.push((t.length ? (q < 0 ? '- ' : '+ ') + cf(Math.abs(q)) : cf(q)) + 'b');
    return t.join(' ') + ' = ' + r;
  }
  function lv8() {
    var u = D.randVec(2, -3, 3), v = D.randVec(2, -3, 3), det = u[0] * v[1] - u[1] * v[0];
    if (det === 0) return null;
    var a = RN(-3, 3), b = RN(-3, 3), w = D.add(D.scale(u, a), D.scale(v, b));
    return {
      q: '<p>Find the weights ' + T('a') + ' and ' + T('b') + ' with ' + T('a\\mathbf u + b\\mathbf v = \\mathbf w') + '.</p>' + TT('\\mathbf u = ' + D.vec(u) + ',\\quad \\mathbf v = ' + D.vec(v) + ',\\quad \\mathbf w = ' + D.vec(w)),
      hint: 'Each entry gives one equation: ' + T(eq(u[0], v[0], w[0])) + ' and ' + T(eq(u[1], v[1], w[1])) + '. Eliminate one unknown.',
      fields: [{ label: T('a'), answer: a, tol: 0 }, { label: T('b'), answer: b, tol: 0 }],
      solution: lines([eq(u[0], v[0], w[0]) + ',\\qquad ' + eq(u[1], v[1], w[1]), 'a = ' + a + ',\\qquad b = ' + b,
        a + D.vec(u) + ' + ' + D.pt(b) + D.vec(v) + ' = ' + D.vec(w)]) +
        '<p>A solution exists for every ' + T('\\mathbf w') + ' because ' + T('\\mathbf u') + ' and ' + T('\\mathbf v') + ' are not parallel, so together they span the plane. See <a href="#/l/vectors-s4">Linear combinations and span</a>.</p>'
    };
  }

  var LEVELS = [
    ['Scale and add', 'A linear combination of two vectors.', lv1, 4],
    ['Dot product', 'Multiply matching entries and add.', lv2, 4],
    ['Three norms', 'The 1-norm, the 2-norm and the max norm.', lv3, 3],
    ['Distance and direction', 'The distance between two points and the unit vector between them.', lv4, 3],
    ['Cosine similarity', 'Compare directions and classify the angle.', lv5, 3],
    ['Projection', 'The shadow of one vector on the line of another.', lv6, 3],
    ['Perpendicular', 'Choose an entry so that the dot product vanishes.', lv7, 3],
    ['Find the weights', 'Write a target vector as a combination of two others.', lv8, 3]
  ];

  var steps = [{
    kind: 'text', title: 'Vector practice',
    html: '<p>This drill repeats the computations from <a href="#/l/vectors-s2">The dot product</a>, <a href="#/l/vectors-s3">Length and distance</a> and <a href="#/l/vectors-s4">Linear combinations and span</a>. Each level generates fresh problems for as long as you like.</p>' +
      D.levelList('vec-drill', LEVELS.map(function (l) { return l[0]; })) +
      '<p class="m4-note">Fractions such as 3/5 are accepted, and decimals are checked to about 2 percent. Matrices continue in <a href="#/l/mat-drill">Matrix practice</a>.</p>'
  }];
  LEVELS.forEach(function (l, i) {
    steps.push({ kind: 'exercise', title: 'Level ' + (i + 1) + ': ' + l[0], html: '<p>' + l[1] + '</p>', mount: function (el, ctx) { M4.drill(el, ctx, { gen: function () { for (var t = 0; t < 200; t++) { var p = l[2](); if (p) return p; } return l[2](); }, n: l[3], key: 'vec-drill:' + (i + 1) }); } });
  });

  M4.lesson({ id: 'vec-drill', module: 'vectors', title: 'Vector practice', summary: 'Practice problems on dot products, norms, projections and linear combinations, arranged in eight levels. New problems are generated each time.', minutes: 20, free: true, drill: true, steps: steps });
})();
