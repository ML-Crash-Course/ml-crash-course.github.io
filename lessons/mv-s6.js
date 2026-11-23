/* Gradients and Hessians, session 6: two ways to differentiate with vectors and matrices. */
(function () {
  'use strict';
  var C = M4.colors;
  var SUB = '₁₂₃₄';
  var ROW = 'rgba(184,105,42,.20)', COL = 'rgba(47,95,158,.17)';

  function T(s) { return '\\(' + s + '\\)'; }
  function pm(A) { return '\\begin{pmatrix}' + A.map(function (r) { return r.join(' & '); }).join('\\\\') + '\\end{pmatrix}'; }
  function col(v) { return pm(v.map(function (a) { return [a]; })); }
  function sn(v) { return M4.sn(v); }
  function ri(a, b) { return M4.rand(a, b); }
  function rnz(a, b) { return M4.randNZ(a, b); }
  function rmat(m, n, a, b) { var A = []; for (var i = 0; i < m; i++) { A.push([]); for (var k = 0; k < n; k++) A[i].push(ri(a, b)); } return A; }
  function rvec(n, a, b) { var v = []; for (var i = 0; i < n; i++) v.push(rnz(a, b)); return v; }
  function mv(A, x) { return A.map(function (r) { return r.reduce(function (s, a, k) { return s + a * x[k]; }, 0); }); }
  function mtv(A, y) { return A[0].map(function (_, k) { return A.reduce(function (s, r, i) { return s + r[k] * y[i]; }, 0); }); }
  function dot(a, b) { return a.reduce(function (s, v, i) { return s + v * b[i]; }, 0); }
  function sumTex(terms) { return terms.join(' + ').replace(/\+ -/g, '- '); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function choose(right, wrong) {
    var opts = shuffle([right].concat(shuffle(wrong.slice()).slice(0, 3)));
    return { options: opts.map(T), answer: opts.indexOf(right) };
  }
  function cellStyle(extra) { return 'min-width:96px;height:66px;text-align:center;border-radius:8px;border:1px solid ' + C.line + ';padding:4px 8px;transition:background .2s;' + (extra || ''); }

  /* ------------------------------------------------ the term grid of x^T A x */
  function mountTermGrid(el) {
    var A, x, j = 0, n = 3;
    function fresh() {
      do { A = rmat(n, n, -3, 3); } while (A[0][1] === A[1][0] && A[0][2] === A[2][0]);
      x = rvec(n, -2, 2);
    }
    fresh();
    var given = M4.el('div', { class: 'm4-row', style: 'gap:10px 36px;font-size:19px' }, el);
    var seg = M4.el('div', { class: 'm4-row', style: 'margin:12px 0 2px;gap:8px' }, el);
    M4.el('span', { class: 'm4-note', text: 'Differentiate with respect to' }, seg);
    var btns = [0, 1, 2].map(function (k) {
      var b = M4.button(seg, '\\(x_' + (k + 1) + '\\)', function () { j = k; upd(); });
      b.style.minWidth = '64px'; return b;
    });
    var tab = M4.el('table', { style: 'margin:10px auto 4px;border-collapse:separate;border-spacing:6px;font-size:17px' }, el);
    var head = M4.el('tr', null, tab);
    M4.el('td', null, head);
    var colH = [], rowH = [], cells = [];
    for (var k = 0; k < n; k++) colH.push(M4.el('td', { style: 'text-align:center;color:' + C.muted + ';font-size:15px', html: 'column ' + (k + 1) }, head));
    for (var i = 0; i < n; i++) {
      var tr = M4.el('tr', null, tab);
      rowH.push(M4.el('td', { style: 'text-align:right;color:' + C.muted + ';font-size:15px;padding-right:6px', html: 'row ' + (i + 1) }, tr));
      cells.push([]);
      for (k = 0; k < n; k++) {
        var td = M4.el('td', { style: cellStyle() }, tr);
        M4.el('div', { html: T('A_{' + (i + 1) + (k + 1) + '}x_' + (i + 1) + 'x_' + (k + 1)) }, td);
        cells[i].push(M4.el('div', { style: 'font-size:15px;color:' + C.muted + ';font-variant-numeric:tabular-nums' }, td));
      }
    }
    var lines = M4.el('div', { style: 'max-width:720px;margin:6px auto 0;font-size:18px' }, el);
    var ctrl = M4.el('div', { class: 'm4-row', style: 'margin-top:8px' }, el);
    M4.button(ctrl, 'New numbers', function () { fresh(); upd(); }, { ghost: true });
    M4.typeset(tab);

    function upd() {
      var Ax = mv(A, x), Atx = mtv(A, x), g = Ax.map(function (v, i) { return v + Atx[i]; }), J = j + 1;
      given.innerHTML = T('A = ' + pm(A)) + '<span>' + T('\\mathbf x = ' + col(x)) + '</span>' + '<span>' + T('f(\\mathbf x) = \\sum_i\\sum_k A_{ik}x_ix_k') + '</span>';
      btns.forEach(function (b, k) { b.classList.toggle('primary', k === j); });
      cells.forEach(function (row, i) {
        row.forEach(function (c, k) {
          c.textContent = M4.fmt(A[i][k] * x[i] * x[k], 1);
          var td = c.parentNode, inR = i === j, inC = k === j;
          td.style.background = inR && inC ? 'linear-gradient(135deg,' + ROW + ' 50%,' + COL + ' 50%)' : inR ? ROW : inC ? COL : '#fff';
          td.style.opacity = inR || inC ? '1' : '.45';
        });
      });
      rowH.forEach(function (h, i) { h.style.color = i === j ? C.orange : C.muted; h.style.fontWeight = i === j ? '600' : '400'; });
      colH.forEach(function (h, k) { h.style.color = k === j ? C.blue : C.muted; h.style.fontWeight = k === j ? '600' : '400'; });
      var rowT = [], colT = [];
      for (var k = 0; k < n; k++) { rowT.push(sn(A[j][k]) + '\\cdot ' + sn(x[k])); colT.push(sn(A[k][j]) + '\\cdot ' + sn(x[k])); }
      lines.innerHTML =
        '<p style="margin:4px 0"><span style="color:' + C.orange + '">Row ' + J + '</span>, terms ' + T('A_{' + J + 'k}x_' + J + 'x_k') + ': their derivative is ' + T('\\sum_k A_{' + J + 'k}x_k = ' + rowT.join(' + ') + ' = ' + Ax[j]) + ', which is ' + T('(A\\mathbf x)_' + J) + '.</p>' +
        '<p style="margin:4px 0"><span style="color:' + C.blue + '">Column ' + J + '</span>, terms ' + T('A_{i' + J + '}x_ix_' + J) + ': their derivative is ' + T('\\sum_i A_{i' + J + '}x_i = ' + colT.join(' + ') + ' = ' + Atx[j]) + ', which is ' + T('(A^\\top\\mathbf x)_' + J) + '.</p>' +
        '<p style="margin:4px 0">The corner term ' + T('A_{' + J + J + '}x_' + J + '^2') + ' sits in both and has derivative ' + T('2A_{' + J + J + '}x_' + J) + ', one share for each.</p>' +
        '<p style="margin:10px 0 0;text-align:center">' + T('\\dfrac{\\partial f}{\\partial x_' + J + '} = ' + Ax[j] + ' + ' + sn(Atx[j]) + ' = ' + g[j]) + ' &nbsp; and in all &nbsp; ' +
        T('\\nabla f = (A + A^\\top)\\mathbf x = ' + col(g.map(function (v, i) { return i === j ? '\\mathbf{' + v + '}' : v; }))) + '</p>';
      M4.typeset(given); M4.typeset(lines);
    }
    upd();
  }

  /* ------------------------------------------------ f(W) = a^T W b, one entry at a time */
  function mountEntries(el) {
    var a, b, W, shown;
    function fresh() { a = rvec(2, -3, 3); b = rvec(3, -3, 3); W = rmat(2, 3, -2, 2); shown = [[0, 0, 0], [0, 0, 0]]; }
    fresh();
    var given = M4.el('div', { class: 'm4-row', style: 'gap:10px 36px;font-size:19px' }, el);
    M4.el('p', { class: 'm4-cap', style: 'margin-top:14px', html: 'Click an entry of ' + T('\\partial f/\\partial W') + ' to work it out.' }, el);
    var tab = M4.el('table', { style: 'margin:6px auto 4px;border-collapse:separate;border-spacing:6px;font-size:18px' }, el);
    var head = M4.el('tr', null, tab);
    M4.el('td', null, head);
    var bh = [0, 1, 2].map(function () { return M4.el('td', { style: 'text-align:center;color:' + C.green + ';font-weight:600' }, head); });
    var ah = [], cells = [];
    [0, 1].forEach(function (i) {
      var tr = M4.el('tr', null, tab);
      ah.push(M4.el('td', { style: 'text-align:right;color:' + C.blue + ';font-weight:600;padding-right:8px' }, tr));
      cells.push([0, 1, 2].map(function (k) {
        var td = M4.el('td', { style: cellStyle('cursor:pointer;font-size:19px;font-weight:600;font-variant-numeric:tabular-nums') }, tr);
        td.addEventListener('click', function () { shown[i][k] = 1; say(i, k); paint(); });
        return td;
      }));
    });
    var why = M4.el('div', { style: 'min-height:64px;max-width:680px;margin:8px auto 0;text-align:center;font-size:18px' }, el);
    var ctrl = M4.el('div', { class: 'm4-row', style: 'margin-top:6px' }, el);
    M4.button(ctrl, 'Fill all', function () { shown = [[1, 1, 1], [1, 1, 1]]; paint(); }, { ghost: true });
    M4.button(ctrl, 'New numbers', function () { fresh(); why.innerHTML = ''; top(); paint(); }, { ghost: true });

    function top() {
      given.innerHTML = '<span>' + T('\\mathbf a = ' + col(a)) + '</span><span>' + T('W = ' + pm(W)) + '</span><span>' + T('\\mathbf b = ' + col(b)) + '</span>';
      M4.typeset(given);
      bh.forEach(function (h, k) { h.textContent = 'b' + SUB[k] + ' = ' + M4.fmt(b[k], 1); });
      ah.forEach(function (h, i) { h.textContent = 'a' + SUB[i] + ' = ' + M4.fmt(a[i], 1); });
    }
    function say(i, k) {
      var I = i + 1, K = k + 1, v = a[i] * b[k];
      why.innerHTML = '<p style="margin:2px 0">' + T('W_{' + I + K + '}') + ' appears in one term of the sum only, ' + T('a_' + I + 'W_{' + I + K + '}b_' + K) + '.</p>' +
        '<p style="margin:8px 0 2px">' + T('\\dfrac{\\partial f}{\\partial W_{' + I + K + '}} = a_' + I + 'b_' + K + ' = ' + sn(a[i]) + '\\cdot ' + sn(b[k]) + ' = ' + v) + '</p>';
      M4.typeset(why);
    }
    function paint() {
      var all = true;
      cells.forEach(function (row, i) {
        row.forEach(function (td, k) {
          if (shown[i][k]) {
            var v = a[i] * b[k], s = Math.min(1, Math.abs(v) / 9);
            td.textContent = M4.fmt(v, 1);
            td.style.background = (v > 0 ? 'rgba(47,95,158,' : 'rgba(177,67,58,') + (0.12 + 0.55 * s) + ')';
            td.style.color = s > 0.6 ? '#fff' : C.ink;
          } else { all = false; td.textContent = '?'; td.style.background = C.paper; td.style.color = C.muted; }
        });
      });
      if (all) {
        why.innerHTML = '<p style="margin:2px 0">Entry ' + T('(i, j)') + ' is ' + T('a_ib_j') + ', so the whole matrix is the outer product</p>' +
          '<p style="margin:2px 0">' + T('\\dfrac{\\partial f}{\\partial W} = \\mathbf a\\,\\mathbf b^\\top = ' + pm(a.map(function (ai) { return b.map(function (bk) { return ai * bk; }); }))) + '</p>';
        M4.typeset(why);
      }
    }
    top(); paint();
    M4.el('p', { class: 'm4-cap', html: T('f(W) = \\mathbf a^\\top W\\mathbf b = \\sum_i\\sum_j a_iW_{ij}b_j') + '. The value of ' + T('W') + ' plays no role in the gradient, since ' + T('f') + ' is linear in ' + T('W') + '.' }, el);
    M4.typeset(el);
  }

  /* ------------------------------------------------ exercise generators */
  function genIndex() {
    var groups = [
      [['\\sum_k A_{ik}x_k', 'i', 'A\\mathbf x'], ['\\sum_k A_{ki}x_k', 'i', 'A^\\top\\mathbf x'], ['\\sum_k A_{ik}y_k', 'i', 'A\\mathbf y'], ['\\sum_k A_{ki}y_k', 'i', 'A^\\top\\mathbf y']],
      [['\\sum_k A_{ik}B_{kj}', '(i, j)', 'AB'], ['\\sum_k A_{ki}B_{kj}', '(i, j)', 'A^\\top B'], ['\\sum_k A_{ik}B_{jk}', '(i, j)', 'AB^\\top'], ['\\sum_k B_{ik}A_{kj}', '(i, j)', 'BA'], ['a_ib_j', '(i, j)', '\\mathbf a\\mathbf b^\\top'], ['b_ia_j', '(i, j)', '\\mathbf b\\mathbf a^\\top'], ['A_{ji}', '(i, j)', 'A^\\top']],
      [['\\sum_k x_ky_k', '', '\\mathbf x^\\top\\mathbf y'], ['\\sum_i\\sum_k x_iA_{ik}y_k', '', '\\mathbf x^\\top A\\mathbf y'], ['\\sum_i\\sum_k y_iA_{ik}x_k', '', '\\mathbf y^\\top A\\mathbf x'], ['\\sum_k x_k^2', '', '\\lVert\\mathbf x\\rVert^2']]
    ];
    var g = M4.pick(groups), it = M4.pick(g);
    var wrong = g.filter(function (o) { return o !== it; }).map(function (o) { return o[2]; });
    var c = choose(it[2], wrong);
    var q = it[1] ? 'Which matrix expression has entry ' + T(it[1]) + ' equal to ' + T(it[0]) + '?' : 'Which matrix expression equals ' + T(it[0]) + '?';
    var why = {
      'A\\mathbf x': 'The sum runs over the second index of ' + T('A') + ', next to ' + T('x_k') + ', so this is row ' + T('i') + ' of ' + T('A') + ' times ' + T('\\mathbf x') + '.',
      'A^\\top\\mathbf x': 'The sum runs over the first index of ' + T('A') + '. Since ' + T('A_{ki} = (A^\\top)_{ik}') + ', this is row ' + T('i') + ' of ' + T('A^\\top') + ' times ' + T('\\mathbf x') + '.',
      'A\\mathbf y': 'The sum runs over the second index of ' + T('A') + ', next to ' + T('y_k') + '.',
      'A^\\top\\mathbf y': 'The sum runs over the first index of ' + T('A') + ', so ' + T('A') + ' is transposed.',
      'AB': 'The summed index ' + T('k') + ' sits on the inside, ' + T('A_{ik}B_{kj}') + ', as in a matrix product.',
      'A^\\top B': 'Write ' + T('A_{ki} = (A^\\top)_{ik}') + ' to bring ' + T('k') + ' to the inside: ' + T('(A^\\top)_{ik}B_{kj}') + '.',
      'AB^\\top': 'Write ' + T('B_{jk} = (B^\\top)_{kj}') + ' to bring ' + T('k') + ' to the inside: ' + T('A_{ik}(B^\\top)_{kj}') + '.',
      'BA': 'Here ' + T('B') + ' comes first and the summed index sits on the inside, ' + T('B_{ik}A_{kj}') + '.',
      '\\mathbf a\\mathbf b^\\top': 'Nothing is summed. Row ' + T('i') + ' takes ' + T('a_i') + ', column ' + T('j') + ' takes ' + T('b_j') + ': an outer product.',
      '\\mathbf b\\mathbf a^\\top': 'Nothing is summed and the row index belongs to ' + T('\\mathbf b') + ', so ' + T('\\mathbf b') + ' is the column vector on the left.',
      'A^\\top': 'Swapping the indices is the transpose.',
      '\\mathbf x^\\top\\mathbf y': 'Multiply matching entries and add: the dot product.',
      '\\mathbf x^\\top A\\mathbf y': 'The inner sum ' + T('\\sum_k A_{ik}y_k') + ' is ' + T('(A\\mathbf y)_i') + ', and then ' + T('\\sum_i x_i(A\\mathbf y)_i = \\mathbf x^\\top A\\mathbf y') + '.',
      '\\mathbf y^\\top A\\mathbf x': 'The inner sum ' + T('\\sum_k A_{ik}x_k') + ' is ' + T('(A\\mathbf x)_i') + ', and it is weighted by ' + T('y_i') + '.',
      '\\lVert\\mathbf x\\rVert^2': 'The sum of squared entries is the squared length, ' + T('\\mathbf x^\\top\\mathbf x') + '.'
    }[it[2]];
    return { q: '<p>' + q + '</p>', options: c.options, answer: c.answer, explain: why };
  }

  function genBySums() {
    var t = ri(0, 1), x = rvec(2, -2, 2), j = ri(1, 2);
    if (t === 0) {
      var A = rmat(2, 2, -2, 2), b = rvec(2, -3, 3), r = mv(A, x).map(function (v, i) { return v - b[i]; });
      var g = mtv(A, r).map(function (v) { return 2 * v; });
      return {
        q: '<p>' + T('f(\\mathbf x) = \\lVert A\\mathbf x - \\mathbf b\\rVert^2 = \\sum_i r_i^2') + ' with ' + T('r_i = \\sum_k A_{ik}x_k - b_i') + '.</p>' +
          '<p>' + T('A = ' + pm(A)) + ', ' + T('\\mathbf b = ' + col(b)) + ', ' + T('\\mathbf x = ' + col(x)) + '. Compute ' + T('\\partial f/\\partial x_' + j) + '.</p>',
        hint: 'First compute \\(\\mathbf r\\). Then the derivative of \\(r_i\\) with respect to \\(x_' + j + '\\) is \\(A_{i' + j + '}\\).',
        answer: g[j - 1],
        explain: T('\\mathbf r = ' + M4.col(r)) + '. By sums, ' + T('\\partial f/\\partial x_' + j + ' = \\sum_i 2r_iA_{i' + j + '} = 2(' + sn(r[0]) + '\\cdot ' + sn(A[0][j - 1]) + ' + ' + sn(r[1]) + '\\cdot ' + sn(A[1][j - 1]) + ') = ' + g[j - 1]) + '. By rules, ' + T('\\nabla f = 2A^\\top\\mathbf r = ' + M4.col(g)) + '.'
      };
    }
    var a = rvec(2, -3, 3), c = rvec(2, -3, 3), ax = dot(a, x), cx = dot(c, x);
    var gg = [a[0] * cx + ax * c[0], a[1] * cx + ax * c[1]];
    return {
      q: '<p>' + T('f(\\mathbf x) = (\\mathbf a^\\top\\mathbf x)(\\mathbf c^\\top\\mathbf x) = \\big(\\sum_i a_ix_i\\big)\\big(\\sum_k c_kx_k\\big)') + '.</p>' +
        '<p>' + T('\\mathbf a = ' + col(a)) + ', ' + T('\\mathbf c = ' + col(c)) + ', ' + T('\\mathbf x = ' + col(x)) + '. Compute ' + T('\\partial f/\\partial x_' + j) + '.</p>',
      hint: 'Product rule: differentiate one bracket at a time. The first bracket has derivative \\(a_' + j + '\\).',
      answer: gg[j - 1],
      explain: T('\\mathbf a^\\top\\mathbf x = ' + ax) + ' and ' + T('\\mathbf c^\\top\\mathbf x = ' + cx) + '. ' + T('\\partial f/\\partial x_' + j + ' = a_' + j + '(\\mathbf c^\\top\\mathbf x) + (\\mathbf a^\\top\\mathbf x)c_' + j + ' = ' + sn(a[j - 1]) + '\\cdot ' + sn(cx) + ' + ' + sn(ax) + '\\cdot ' + sn(c[j - 1]) + ' = ' + gg[j - 1]) + '. In matrix form ' + T('\\nabla f = (\\mathbf c^\\top\\mathbf x)\\,\\mathbf a + (\\mathbf a^\\top\\mathbf x)\\,\\mathbf c') + ', a rule no table needs to list.'
    };
  }

  var RULES = [
    ['\\mathbf a^\\top\\mathbf x', '\\nabla f', '\\mathbf a', ['\\mathbf x', '2\\mathbf a', '\\mathbf a^\\top\\mathbf a', '\\mathbf a\\mathbf x^\\top'], 'Each ' + T('x_j') + ' appears once, with coefficient ' + T('a_j') + '.'],
    ['\\mathbf x^\\top A\\mathbf x', '\\nabla f', '(A + A^\\top)\\mathbf x', ['A\\mathbf x', 'A^\\top\\mathbf x', '2\\mathbf x', 'A + A^\\top'], 'Row ' + T('j') + ' of the term grid gives ' + T('(A\\mathbf x)_j') + ', column ' + T('j') + ' gives ' + T('(A^\\top\\mathbf x)_j') + '.'],
    ['\\lVert\\mathbf x\\rVert^2', '\\nabla f', '2\\mathbf x', ['\\mathbf x', '2\\lVert\\mathbf x\\rVert', '\\mathbf x\\mathbf x^\\top', '2'], T('\\sum_k x_k^2') + ' has derivative ' + T('2x_j') + ' with respect to ' + T('x_j') + '.'],
    ['\\mathbf b^\\top A\\mathbf x', '\\nabla f', 'A^\\top\\mathbf b', ['A\\mathbf b', 'A\\mathbf x', '\\mathbf b', '\\mathbf b\\mathbf x^\\top'], 'It is ' + T('\\mathbf a^\\top\\mathbf x') + ' with ' + T('\\mathbf a = A^\\top\\mathbf b') + '. Shape check: ' + T('A^\\top\\mathbf b') + ' has the length of ' + T('\\mathbf x') + '.'],
    ['\\lVert A\\mathbf x - \\mathbf b\\rVert^2', '\\nabla f', '2A^\\top(A\\mathbf x - \\mathbf b)', ['2A(A\\mathbf x - \\mathbf b)', '2(A\\mathbf x - \\mathbf b)', '2A^\\top A', '2\\lVert A\\mathbf x - \\mathbf b\\rVert'], 'The rule for ' + T('\\lVert\\mathbf r\\rVert^2') + ' gives ' + T('2\\mathbf r') + ', and the chain rule through ' + T('A\\mathbf x - \\mathbf b') + ' multiplies by ' + T('A^\\top') + '.'],
    ['\\mathbf x^\\top\\mathbf x + \\mathbf a^\\top\\mathbf x', '\\nabla f', '2\\mathbf x + \\mathbf a', ['\\mathbf x + \\mathbf a', '2\\mathbf x', '2(\\mathbf x + \\mathbf a)', '2\\mathbf x\\mathbf a^\\top'], 'Gradients of a sum add: ' + T('2\\mathbf x') + ' plus ' + T('\\mathbf a') + '.'],
    ['g(A\\mathbf x + \\mathbf c)', '\\nabla f', 'A^\\top\\nabla g(A\\mathbf x + \\mathbf c)', ['A\\nabla g(A\\mathbf x + \\mathbf c)', '\\nabla g(A\\mathbf x + \\mathbf c)', 'A^\\top\\nabla g(\\mathbf x)', 'A^\\top A\\,\\nabla g(\\mathbf x)'], 'The chain rule through the linear map ' + T('A\\mathbf x + \\mathbf c') + ' multiplies by ' + T('A^\\top') + '.'],
    ['\\mathbf a^\\top W\\mathbf b', '\\partial f/\\partial W', '\\mathbf a\\mathbf b^\\top', ['\\mathbf b\\mathbf a^\\top', '\\mathbf a^\\top\\mathbf b', 'W\\mathbf b', '\\mathbf a\\mathbf b^\\top W'], 'Each ' + T('W_{ij}') + ' appears once, with coefficient ' + T('a_ib_j') + '.'],
    ['\\lVert W\\mathbf x\\rVert^2', '\\partial f/\\partial W', '2W\\mathbf x\\mathbf x^\\top', ['2W\\mathbf x', '2\\mathbf x\\mathbf x^\\top', '2W^\\top W\\mathbf x', '2\\mathbf x\\mathbf x^\\top W'], 'With ' + T('\\mathbf z = W\\mathbf x') + ': ' + T('\\nabla_{\\mathbf z} f = 2\\mathbf z') + ', and a function of ' + T('W\\mathbf x') + ' has ' + T('\\partial f/\\partial W = (\\nabla_{\\mathbf z} f)\\,\\mathbf x^\\top') + '.'],
    ['\\lVert W\\mathbf x - \\mathbf y\\rVert^2', '\\partial f/\\partial W', '2(W\\mathbf x - \\mathbf y)\\mathbf x^\\top', ['2W^\\top(W\\mathbf x - \\mathbf y)', '2(W\\mathbf x - \\mathbf y)', '2\\mathbf x(W\\mathbf x - \\mathbf y)^\\top', '2\\mathbf x\\mathbf x^\\top'], 'The gradient with respect to ' + T('\\mathbf z = W\\mathbf x') + ' is ' + T('2(\\mathbf z - \\mathbf y)') + ', and then the outer product with ' + T('\\mathbf x') + ' gives the shape of ' + T('W') + '.']
  ];
  function genRule() {
    var r = M4.pick(RULES), c = choose(r[2], r[3]);
    var isW = r[1] !== '\\nabla f';
    return {
      q: '<p>' + T('f = ' + r[0]) + (isW ? ', with ' + T('W') + ' the variable.' : ', with ' + T('\\mathbf x') + ' the variable.') + ' Which is ' + T(r[1]) + '?</p>',
      options: c.options, answer: c.answer, explain: r[4]
    };
  }

  function genMatrixEntry() {
    var t = ri(0, 2), i = ri(1, 2), k = ri(1, 3);
    if (t === 0) {
      var a = rvec(2, -3, 3), b = rvec(3, -3, 3), W = rmat(2, 3, -2, 2);
      return {
        q: '<p>' + T('f(W) = \\mathbf a^\\top W\\mathbf b') + ' with ' + T('\\mathbf a = ' + col(a)) + ', ' + T('W = ' + pm(W)) + ', ' + T('\\mathbf b = ' + col(b)) + '.</p><p>Compute ' + T('\\partial f/\\partial W_{' + i + k + '}') + '.</p>',
        answer: a[i - 1] * b[k - 1],
        explain: T('W_{' + i + k + '}') + ' appears only in ' + T('a_' + i + 'W_{' + i + k + '}b_' + k) + ', so the answer is ' + T('a_' + i + 'b_' + k + ' = ' + sn(a[i - 1]) + '\\cdot ' + sn(b[k - 1]) + ' = ' + a[i - 1] * b[k - 1]) + '. The numbers in ' + T('W') + ' do not matter.'
      };
    }
    var W2 = rmat(2, 3, -2, 2), x = rvec(3, -2, 2), z = mv(W2, x), y = t === 2 ? rvec(2, -3, 3) : [0, 0];
    var e = z.map(function (v, p) { return v - y[p]; }), ans = 2 * e[i - 1] * x[k - 1];
    var f = t === 2 ? '\\lVert W\\mathbf x - \\mathbf y\\rVert^2' : '\\lVert W\\mathbf x\\rVert^2';
    return {
      q: '<p>' + T('f(W) = ' + f) + ' with ' + T('W = ' + pm(W2)) + ', ' + T('\\mathbf x = ' + col(x)) + (t === 2 ? ', ' + T('\\mathbf y = ' + col(y)) : '') + '.</p><p>Compute ' + T('\\partial f/\\partial W_{' + i + k + '}') + '.</p>',
      hint: 'Only output ' + i + ' of \\(W\\mathbf x\\) contains \\(W_{' + i + k + '}\\), with coefficient \\(x_' + k + '\\).',
      answer: ans,
      explain: T('W\\mathbf x = ' + M4.col(z)) + (t === 2 ? ', so ' + T('W\\mathbf x - \\mathbf y = ' + M4.col(e)) : '') + '. Entry ' + T('(' + i + ', ' + k + ')') + ' of ' + T(t === 2 ? '2(W\\mathbf x - \\mathbf y)\\mathbf x^\\top' : '2W\\mathbf x\\mathbf x^\\top') + ' is ' + T('2\\cdot ' + sn(e[i - 1]) + '\\cdot ' + sn(x[k - 1]) + ' = ' + ans) + '.'
    };
  }

  var TABLE = '<div style="overflow-x:auto"><table class="m4-rules"><tr><th>function</th><th>gradient</th><th>shape check</th></tr>' +
    '<tr><td>\\(\\mathbf a^\\top\\mathbf x\\)</td><td>\\(\\mathbf a\\)</td><td>like \\(\\mathbf x\\)</td></tr>' +
    '<tr><td>\\(\\mathbf x^\\top A\\mathbf x\\)</td><td>\\((A + A^\\top)\\mathbf x\\), or \\(2A\\mathbf x\\) for symmetric \\(A\\)</td><td>like \\(\\mathbf x\\)</td></tr>' +
    '<tr><td>\\(\\lVert\\mathbf x\\rVert^2\\)</td><td>\\(2\\mathbf x\\)</td><td>like \\(\\mathbf x\\)</td></tr>' +
    '<tr><td>\\(g(A\\mathbf x + \\mathbf c)\\)</td><td>\\(A^\\top\\,\\nabla g(A\\mathbf x + \\mathbf c)\\)</td><td>\\((n\\times m)(m\\times 1)\\)</td></tr>' +
    '<tr><td>\\(\\mathbf a^\\top W\\mathbf b\\)</td><td>\\(\\mathbf a\\,\\mathbf b^\\top\\)</td><td>like \\(W\\)</td></tr>' +
    '<tr><td>\\(h(W\\mathbf x)\\)</td><td>\\(\\nabla h(W\\mathbf x)\\,\\mathbf x^\\top\\)</td><td>\\((m\\times 1)(1\\times n)\\)</td></tr>' +
    '</table></div>';

  M4.lesson({
    id: 'mv-s6',
    module: 'multivariable',
    title: 'Two ways to differentiate',
    summary: 'Functions of vectors and matrices can be differentiated in two ways, by writing them as sums over indices or with a short table of matrix rules.',
    minutes: 30,
    steps: [
      {
        kind: 'text',
        title: 'Two ways to the same answer',
        html: '<p>A function of a vector or a matrix that returns one number can be differentiated in two ways.</p>' +
          '<p><b>By sums.</b> Write the function out with indices, as a sum of ordinary numbers. Differentiate with respect to one entry, say \\(x_j\\), with the calculus of one variable. Then read the result back as a matrix expression.</p>' +
          '<p><b>By rules.</b> Use a short table of matrix rules together with the chain rule, the same way you use \\(\\tfrac{d}{dx}x^2 = 2x\\) without going back to limits.</p>' +
          '<p>Rules are fast. Sums always work, also for functions that no table lists, and they are how every rule is proved. The last step of the sums method needs a small dictionary from index sums to matrices:</p>' +
          '<div style="overflow-x:auto"><table class="m4-rules"><tr><th>index form</th><th>matrix form</th></tr>' +
          '<tr><td>\\(\\sum_k A_{ik}x_k\\)</td><td>\\((A\\mathbf x)_i\\)</td></tr>' +
          '<tr><td>\\(\\sum_k A_{ki}x_k\\)</td><td>\\((A^\\top\\mathbf x)_i\\)</td></tr>' +
          '<tr><td>\\(\\sum_k x_ky_k\\)</td><td>\\(\\mathbf x^\\top\\mathbf y\\)</td></tr>' +
          '<tr><td>\\(a_ib_j\\)</td><td>\\((\\mathbf a\\mathbf b^\\top)_{ij}\\)</td></tr>' +
          '<tr><td>\\(\\sum_k A_{ik}B_{kj}\\)</td><td>\\((AB)_{ij}\\)</td></tr>' +
          '<tr><td>\\(\\sum_k A_{ki}B_{kj}\\)</td><td>\\((A^\\top B)_{ij}\\)</td></tr></table></div>' +
          '<p>One habit makes the dictionary easy. In a matrix product the summed index sits on the inside, \\(A_{ik}B_{kj}\\). When it sits on the outside of a matrix, transpose that matrix to move it inside: \\(A_{ki} = (A^\\top)_{ik}\\).</p>'
      },
      {
        kind: 'exercise',
        title: 'Read an index sum',
        html: '<p>Translate each index expression into matrix form. Find the summed index and check whether it sits on the inside.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: genIndex }); }
      },
      {
        kind: 'explore',
        title: 'Where one variable hides in a quadratic form',
        html: '<p>Write \\(f(\\mathbf x) = \\mathbf x^\\top A\\mathbf x = \\sum_i\\sum_k A_{ik}x_ix_k\\) as a grid of nine terms, with term \\((i, k)\\) in row \\(i\\) and column \\(k\\). Pick a variable \\(x_j\\).</p>' +
          '<p>Only the terms that contain \\(x_j\\) remain after differentiation, and they form a cross: row \\(j\\) and column \\(j\\). The row gives \\((A\\mathbf x)_j\\) and the column gives \\((A^\\top\\mathbf x)_j\\).</p>',
        mount: mountTermGrid
      },
      {
        kind: 'text',
        title: 'One example, both ways',
        html: '<p>Take \\(f(\\mathbf x) = \\lVert A\\mathbf x - \\mathbf b\\rVert^2\\) with \\(A \\in \\mathbb R^{m\\times n}\\), the squared error of a least squares fit. Call the error vector \\(\\mathbf r = A\\mathbf x - \\mathbf b\\).</p>' +
          '<div class="m4-two" style="align-items:start;gap:28px"><div>' +
          '<p><b>By sums.</b> \\(f = \\sum_i r_i^2\\) with \\(r_i = \\sum_k A_{ik}x_k - b_i\\). Only the term \\(k = j\\) of \\(r_i\\) contains \\(x_j\\), so \\(\\partial r_i/\\partial x_j = A_{ij}\\). Then</p>' +
          '\\[ \\frac{\\partial f}{\\partial x_j} = \\sum_i 2r_i A_{ij}. \\]' +
          '<p>The sum runs over the first index of \\(A\\), so this is entry \\(j\\) of \\(A^\\top(2\\mathbf r)\\).</p></div><div>' +
          '<p><b>By rules.</b> \\(f = \\lVert\\mathbf r\\rVert^2\\) and the rule \\(\\nabla\\lVert\\mathbf r\\rVert^2 = 2\\mathbf r\\) gives the gradient with respect to \\(\\mathbf r\\). The chain rule through the linear map \\(\\mathbf r = A\\mathbf x - \\mathbf b\\) multiplies it by \\(A^\\top\\).</p>' +
          '<p>Shape check: \\(A^\\top\\) is \\(n\\times m\\) and \\(\\mathbf r\\) has length \\(m\\), so the result has length \\(n\\), like \\(\\mathbf x\\).</p></div></div>' +
          '\\[ \\nabla f(\\mathbf x) = 2A^\\top(A\\mathbf x - \\mathbf b). \\]' +
          '<p>Both routes land on the same formula. When you are unsure of a rule, take the sums route for one entry and compare.</p>'
      },
      {
        kind: 'exercise',
        title: 'One entry, by sums',
        html: '<p>Write the function out as sums and differentiate with respect to a single \\(x_j\\). The second kind of function is a product, which the rule table does not cover, so the sums route is the natural one there.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: genBySums }); }
      },
      {
        kind: 'text',
        title: 'The rule table',
        html: '<p>Each row of this table was proved by sums, in this session or the previous one. Here \\(\\mathbf x \\in \\mathbb R^n\\), \\(A, W \\in \\mathbb R^{m\\times n}\\) (with \\(m = n\\) in the quadratic form), and \\(g, h\\) are any scalar functions on \\(\\mathbb R^m\\).</p>' + TABLE +
          '<p>The chain rule row needs one line of sums. With \\(\\mathbf z = A\\mathbf x + \\mathbf c\\), only \\(z_i = \\sum_k A_{ik}x_k + c_i\\) depends on \\(x_j\\), with factor \\(A_{ij}\\), so</p>' +
          '\\[ \\frac{\\partial g}{\\partial x_j} = \\sum_i \\frac{\\partial g}{\\partial z_i}A_{ij} = \\big(A^\\top\\nabla g\\big)_j. \\]' +
          '<p>Two habits catch most mistakes. A gradient has the shape of its variable. And a transpose appears whenever a sum runs over the first index of a matrix.</p>'
      },
      {
        kind: 'exercise',
        title: 'Pick the rule',
        html: '<p>Match each function to its gradient. Wrong options often have the wrong shape, or forget a transpose or a factor of 2.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 5, gen: genRule }); }
      },
      {
        kind: 'text',
        title: 'Derivatives with respect to a matrix',
        html: '<p>For a matrix variable \\(W \\in \\mathbb R^{m\\times n}\\), the sums route works entry by entry. The gradient \\(\\partial f/\\partial W\\) is the \\(m\\times n\\) matrix of all \\(\\partial f/\\partial W_{ij}\\).</p>' +
          '<p><b>Example 1.</b> \\(f(W) = \\mathbf a^\\top W\\mathbf b = \\sum_i\\sum_j a_iW_{ij}b_j\\). Each entry \\(W_{ij}\\) appears in exactly one term, so \\(\\partial f/\\partial W_{ij} = a_ib_j\\) and \\(\\partial f/\\partial W = \\mathbf a\\mathbf b^\\top\\).</p>' +
          '<p><b>Example 2.</b> \\(f(W) = \\lVert W\\mathbf x\\rVert^2 = \\sum_i z_i^2\\) with \\(z_i = \\sum_k W_{ik}x_k\\). The entry \\(W_{pq}\\) appears only in \\(z_p\\), with factor \\(x_q\\). So \\(\\partial f/\\partial W_{pq} = 2z_px_q\\) and</p>' +
          '\\[ \\frac{\\partial f}{\\partial W} = 2\\mathbf z\\,\\mathbf x^\\top = 2W\\mathbf x\\,\\mathbf x^\\top. \\]' +
          '<p>Both examples follow the last row of the table. When \\(f\\) depends on \\(W\\) only through \\(\\mathbf z = W\\mathbf x\\), the gradient is the outer product of \\(\\nabla_{\\mathbf z} f\\) and \\(\\mathbf x\\).</p>'
      },
      {
        kind: 'explore',
        title: 'Entry by entry',
        html: '<p>Here \\(f(W) = \\mathbf a^\\top W\\mathbf b\\) with \\(W\\) of size \\(2\\times 3\\). Click the entries of the gradient one at a time, then fill in the rest, and compare the finished matrix with \\(\\mathbf a\\mathbf b^\\top\\).</p>',
        mount: mountEntries
      },
      {
        kind: 'exercise',
        title: 'Matrix gradients, one entry',
        html: '<p>Each problem asks for one entry of \\(\\partial f/\\partial W\\). Use whichever route you prefer, then check it with the other.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: genMatrixEntry }); }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li><b>By sums:</b> write \\(f\\) with indices, differentiate with respect to one entry, and translate back. A transpose appears whenever a sum runs over the first index of a matrix.</li>' +
          '<li><b>By rules:</b> \\(\\nabla\\mathbf a^\\top\\mathbf x = \\mathbf a\\), \\(\\nabla\\mathbf x^\\top A\\mathbf x = (A + A^\\top)\\mathbf x\\), \\(\\nabla\\lVert\\mathbf x\\rVert^2 = 2\\mathbf x\\), the chain rule \\(\\nabla g(A\\mathbf x + \\mathbf c) = A^\\top\\nabla g\\), and \\(\\partial h(W\\mathbf x)/\\partial W = \\nabla h\\,\\mathbf x^\\top\\).</li>' +
          '<li>Every gradient has the shape of its variable. Check it before computing anything.</li>' +
          '</ul>' +
          '<p class="m4-note">For endless practice with both routes, work through <a href="#/l/mv-drill">Matrix calculus practice</a>.</p>'
      }
    ]
  });
})();
