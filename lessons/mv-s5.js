/* Gradients and Hessians, session 5: vector and matrix derivatives. */
(function () {
  'use strict';
  var C = M4.colors;

  function readout(parent, items) {
    var row = M4.el('div', { class: 'm4-readout' }, parent), vals = {};
    items.forEach(function (it) {
      var s = M4.el('span', null, row);
      var l = M4.el('span', { html: '\\(' + it[1] + '\\) = ' }, s); M4.typeset(l);
      vals[it[0]] = M4.el('b', { text: '0' }, s);
    });
    return function (k, v) { vals[k].textContent = typeof v === 'string' ? v : M4.fmt(v, 2); };
  }
  function vstr(v) { return '(' + v.map(function (a) { return M4.fmt(a, 2); }).join(', ') + ')'; }

  /* f(x) = a.x : straight contour lines, constant gradient */
  function mountLinear(el) {
    var p = M4.plane(el, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 440, height: 440 });
    var lines = [], k;
    for (k = -8; k <= 8; k++) lines.push(p.path([], { stroke: k === 0 ? C.muted : '#cdd6e6', width: k === 0 ? 2 : 1.5, layer: 'bg' }));
    var aArrow = p.arrow(0, 0, 1, 1, { stroke: C.blue, width: 4 });
    var gArrow = p.arrow(0, 0, 1, 1, { stroke: C.orange, width: 4 });
    var a = [1.5, 1], x = [-2, 1.5];
    var set = readout(el, [['a', '\\mathbf a'], ['x', '\\mathbf x'], ['f', 'f(\\mathbf x)'], ['g', '\\nabla f(\\mathbf x)']]);
    function upd() {
      var n2 = a[0] * a[0] + a[1] * a[1];
      lines.forEach(function (ln, i) {
        var c = i - 8;
        if (n2 < 1e-4) { ln.set([]); return; }
        var b0 = [c * a[0] / n2, c * a[1] / n2], t = [-a[1], a[0]], s = 20 / Math.sqrt(n2);
        ln.set([[b0[0] - s * t[0], b0[1] - s * t[1]], [b0[0] + s * t[0], b0[1] + s * t[1]]]);
      });
      aArrow.set(0, 0, a[0], a[1]);
      gArrow.set(x[0], x[1], x[0] + a[0], x[1] + a[1]);
      set('a', vstr(a)); set('x', vstr(x)); set('f', a[0] * x[0] + a[1] * x[1]); set('g', vstr(a));
    }
    p.handle(a[0], a[1], { color: C.blue, snap: 0.5, bounds: { xmin: -3, xmax: 3, ymin: -3, ymax: 3 }, onDrag: function (u, v) { a = [u, v]; upd(); } });
    p.handle(x[0], x[1], { color: C.ink, r: 9, bounds: { xmin: -3.5, xmax: 3.5, ymin: -3.5, ymax: 3.5 }, onDrag: function (u, v) { x = [u, v]; upd(); } });
    upd();
    M4.el('p', { class: 'm4-cap', html: 'Blue: the vector \\(\\mathbf a\\). Orange: the gradient at the black point. Gray lines: the contours \\(f = -8, \\dots, 8\\).' }, el);
    M4.typeset(el);
  }

  /* f(x) = x^T A x : elliptic contours, gradient 2Ax */
  function mountBowl(el) {
    var A = [[1.5, 0.4], [0.4, 0.7]], x = [1.2, 0.8];
    var p = M4.plane(el, { xmin: -3.5, xmax: 3.5, ymin: -3.5, ymax: 3.5, width: 440, height: 440 });
    var LEV = [0.25, 1, 2.25, 4, 6.25, 9];
    var rings = LEV.map(function () { return p.path([], { stroke: '#cdd6e6', width: 1.6, closed: true, layer: 'bg' }); });
    var here = p.path([], { stroke: C.blue, width: 2.4, dash: '5 5', closed: true });
    var gArrow = p.arrow(0, 0, 1, 1, { stroke: C.orange, width: 4 });
    function f(v) { return A[0][0] * v[0] * v[0] + 2 * A[0][1] * v[0] * v[1] + A[1][1] * v[1] * v[1]; }
    function ring(level) {
      var pts = [];
      for (var i = 0; i <= 96; i++) { var t = i / 96 * 2 * Math.PI, u = [Math.cos(t), Math.sin(t)], q = f(u); pts.push([u[0] * Math.sqrt(level / q), u[1] * Math.sqrt(level / q)]); }
      return pts;
    }
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center;flex-wrap:wrap;gap:6px 22px' }, el);
    var sa = M4.slider(row, { label: '\\(A_{11}\\)', min: 0.6, max: 2, step: 0.1, value: A[0][0], onInput: function (v) { A[0][0] = v; upd(); } });
    var sb = M4.slider(row, { label: '\\(A_{12} = A_{21}\\)', min: -0.5, max: 0.5, step: 0.1, value: A[0][1], onInput: function (v) { A[0][1] = A[1][0] = v; upd(); } });
    var sc = M4.slider(row, { label: '\\(A_{22}\\)', min: 0.6, max: 2, step: 0.1, value: A[1][1], onInput: function (v) { A[1][1] = v; upd(); } });
    var set = readout(el, [['f', 'f(\\mathbf x)'], ['g', '\\nabla f = 2A\\mathbf x']]);
    function upd() {
      rings.forEach(function (r, i) { r.set(ring(LEV[i])); });
      here.set(ring(Math.max(1e-6, f(x))));
      var g = [2 * (A[0][0] * x[0] + A[0][1] * x[1]), 2 * (A[1][0] * x[0] + A[1][1] * x[1])];
      gArrow.set(x[0], x[1], x[0] + g[0] / 4, x[1] + g[1] / 4);
      set('f', f(x)); set('g', vstr(g));
    }
    p.handle(x[0], x[1], { color: C.ink, r: 9, bounds: { xmin: -3.2, xmax: 3.2, ymin: -3.2, ymax: 3.2 }, onDrag: function (u, v) { x = [u, v]; upd(); } });
    upd();
    M4.el('p', { class: 'm4-cap', html: 'The orange arrow is \\(\\nabla f\\), drawn at a quarter of its length. The dashed curve is the contour through the black point.' }, el);
    M4.typeset(el);
  }

  /* a nonlinear map and its Jacobian */
  function F(u, v) { return [u + 0.25 * v * v, v + 0.8 * Math.sin(u)]; }
  function J(u, v) { return [[1, 0.5 * v], [0.8 * Math.cos(u), 1]]; }
  function mountJacobian(el) {
    var two = M4.el('div', { class: 'm4-two' }, el);
    var L = M4.el('div', { style: 'display:flex;flex-direction:column;align-items:center' }, two);
    var Rr = M4.el('div', { style: 'display:flex;flex-direction:column;align-items:center' }, two);
    var pi = M4.plane(L, { xmin: -1.5, xmax: 3, ymin: -1.5, ymax: 3, width: 340, height: 340 });
    var po = M4.plane(Rr, { xmin: -1.5, xmax: 4.5, ymin: -1.5, ymax: 4.5, width: 340, height: 340 });
    M4.el('p', { class: 'm4-cap', html: 'Input \\(\\mathbf x\\)' }, L);
    M4.el('p', { class: 'm4-cap', html: 'Output \\(\\mathbf f(\\mathbf x)\\)' }, Rr);
    var sqIn = pi.path([], { stroke: C.blue, width: 2, fill: C.blue, fillOpacity: 0.12, closed: true });
    var e1i = pi.arrow(0, 0, 0, 0, { stroke: C.blue, width: 3 }), e2i = pi.arrow(0, 0, 0, 0, { stroke: C.green, width: 3 });
    var sqOut = po.path([], { stroke: C.pink, width: 2, fill: C.pink, fillOpacity: 0.14, closed: true });
    var par = po.path([], { stroke: C.ink, width: 1.8, dash: '5 5', closed: true });
    var e1o = po.arrow(0, 0, 0, 0, { stroke: C.blue, width: 3 }), e2o = po.arrow(0, 0, 0, 0, { stroke: C.green, width: 3 });
    var x = [0.5, 0.8], h = 1;
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, el);
    M4.slider(row, { label: 'Size of the square', min: 0.1, max: 1.6, step: 0.05, value: h, onInput: function (v) { h = v; upd(); } });
    var set = readout(el, [['j11', '\\partial f_1/\\partial x_1'], ['j12', '\\partial f_1/\\partial x_2'], ['j21', '\\partial f_2/\\partial x_1'], ['j22', '\\partial f_2/\\partial x_2']]);
    function edge(a, b, n) { var o = []; for (var i = 0; i <= n; i++) o.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return o; }
    function upd() {
      var c = [[0, 0], [h, 0], [h, h], [0, h]].map(function (d) { return [x[0] + d[0], x[1] + d[1]]; });
      sqIn.set(c);
      e1i.set(x[0], x[1], x[0] + h, x[1]); e2i.set(x[0], x[1], x[0], x[1] + h);
      var bnd = [];
      for (var k = 0; k < 4; k++) bnd = bnd.concat(edge(c[k], c[(k + 1) % 4], 24));
      sqOut.set(bnd.map(function (q) { return F(q[0], q[1]); }));
      var f0 = F(x[0], x[1]), j = J(x[0], x[1]);
      var c1 = [j[0][0] * h, j[1][0] * h], c2 = [j[0][1] * h, j[1][1] * h];
      par.set([f0, [f0[0] + c1[0], f0[1] + c1[1]], [f0[0] + c1[0] + c2[0], f0[1] + c1[1] + c2[1]], [f0[0] + c2[0], f0[1] + c2[1]]]);
      e1o.set(f0[0], f0[1], f0[0] + c1[0], f0[1] + c1[1]); e2o.set(f0[0], f0[1], f0[0] + c2[0], f0[1] + c2[1]);
      set('j11', j[0][0]); set('j12', j[0][1]); set('j21', j[1][0]); set('j22', j[1][1]);
    }
    pi.handle(x[0], x[1], { color: C.ink, r: 9, bounds: { xmin: -1.2, xmax: 1.4, ymin: -1.2, ymax: 1.4 }, onDrag: function (u, v) { x = [u, v]; upd(); } });
    upd();
    M4.typeset(el);
  }

  /* outer product heat map */
  function mountOuter(el) {
    var d = [1, -0.5, 0], x = [2, 0.5, -1];
    var two = M4.el('div', { class: 'm4-two', style: 'align-items:start' }, el);
    var colL = M4.el('div', null, two), colR = M4.el('div', null, two);
    M4.el('p', { class: 'm4-cap', html: 'Known gradient \\(\\boldsymbol\\delta = \\partial L/\\partial \\mathbf z\\)' }, colL);
    M4.el('p', { class: 'm4-cap', html: 'Input \\(\\mathbf x\\)' }, colR);
    d.forEach(function (v, i) { M4.slider(colL, { label: '\\(\\delta_' + (i + 1) + '\\)', min: -2, max: 2, step: 0.5, value: v, onInput: function (w) { d[i] = w; upd(); } }); });
    x.forEach(function (v, j) { M4.slider(colR, { label: '\\(x_' + (j + 1) + '\\)', min: -2, max: 2, step: 0.5, value: v, onInput: function (w) { x[j] = w; upd(); } }); });
    var tab = M4.el('table', { style: 'margin:18px auto 4px;border-collapse:separate;border-spacing:6px;font-size:1.05rem' }, el);
    var head = M4.el('tr', null, tab);
    M4.el('td', null, head);
    var xh = x.map(function (_, j) { return M4.el('td', { style: 'text-align:center;color:' + C.green + ';font-weight:600;padding-bottom:2px' }, head); });
    var cells = [], dh = [];
    d.forEach(function (_, i) {
      var tr = M4.el('tr', null, tab);
      dh.push(M4.el('td', { style: 'text-align:right;color:' + C.blue + ';font-weight:600;padding-right:8px' }, tr));
      cells.push(x.map(function () { return M4.el('td', { style: 'width:78px;height:58px;text-align:center;border-radius:8px;font-weight:600;font-variant-numeric:tabular-nums' }, tr); }));
    });
    function upd() {
      xh.forEach(function (c, j) { c.innerHTML = '<i>x</i><sub>' + (j + 1) + '</sub> = ' + M4.fmt(x[j], 1); });
      dh.forEach(function (c, i) { c.innerHTML = '<i>δ</i><sub>' + (i + 1) + '</sub> = ' + M4.fmt(d[i], 1); });
      cells.forEach(function (row, i) {
        row.forEach(function (c, j) {
          var v = d[i] * x[j], a = Math.min(1, Math.abs(v) / 4);
          c.textContent = M4.fmt(v, 2);
          c.style.background = v === 0 ? '#f3f1ea' : (v > 0 ? 'rgba(47,95,158,' : 'rgba(177,67,58,') + (0.12 + 0.6 * a) + ')';
          c.style.color = a > 0.55 ? '#fff' : C.ink;
        });
      });
    }
    upd();
    M4.el('p', { class: 'm4-cap', html: 'Entry \\((i, j)\\) of \\(\\partial L/\\partial W = \\boldsymbol\\delta\\mathbf x^\\top\\) is \\(\\delta_i x_j\\). Blue is positive, red is negative.' }, el);
    M4.typeset(el);
  }

  function T(s) { return '\\(' + s + '\\)'; }

  M4.lesson({
    id: 'mv-s5',
    module: 'multivariable',
    title: 'Vector and matrix derivatives',
    summary: 'Gradients with respect to vectors and matrices, the Jacobian of a vector function, and the outer product rule for derivatives with respect to a matrix.',
    minutes: 25,
    steps: [
      {
        kind: 'text',
        title: 'The gradient has the shape of the variable',
        html: '<p>Many functions take many numbers and return one number. When those numbers are collected in a vector \\(\\mathbf x \\in \\mathbb R^n\\), the gradient collects the partial derivatives in a vector of the same shape:</p>' +
          '\\[ \\nabla f(\\mathbf x) = \\frac{\\partial f}{\\partial \\mathbf x} = \\begin{pmatrix} \\partial f/\\partial x_1 \\\\ \\vdots \\\\ \\partial f/\\partial x_n \\end{pmatrix}. \\]' +
          '<p>Every formula in this session can be checked the slow way: write the function as a sum over components, differentiate with respect to one component \\(x_j\\), and collect the results. One small tool does the bookkeeping. The derivative of one component with respect to another is 1 if they are the same component and 0 otherwise. This is the <b>Kronecker delta</b>:</p>' +
          '\\[ \\frac{\\partial x_i}{\\partial x_j} = \\delta_{ij} = \\begin{cases} 1 & i = j \\\\ 0 & i \\neq j \\end{cases} \\]' +
          '<p>Inside a sum, \\(\\delta_{ij}\\) keeps the single term with \\(i = j\\) and removes all others. The simplest case is a linear function</p>' +
          '\\[ f(\\mathbf x) = \\mathbf a^\\top \\mathbf x = \\sum_{i} a_i x_i, \\qquad \\frac{\\partial f}{\\partial x_j} = \\sum_i a_i\\, \\delta_{ij} = a_j, \\qquad \\nabla f = \\mathbf a. \\]' +
          '<p>This is the vector version of \\(\\tfrac{d}{dx}(ax) = a\\).</p>'
      },
      {
        kind: 'explore',
        title: 'A linear function',
        html: '<p>The contours of \\(f(\\mathbf x) = \\mathbf a^\\top\\mathbf x\\) are parallel lines, all perpendicular to \\(\\mathbf a\\). Drag the blue handle to change \\(\\mathbf a\\) and the black point to move \\(\\mathbf x\\).</p>' +
          '<p>Wherever the point goes, the gradient is the same arrow. A longer \\(\\mathbf a\\) packs the contours closer together, since \\(f\\) then grows faster.</p>',
        mount: mountLinear
      },
      {
        kind: 'text',
        title: 'Quadratic forms',
        html: '<p>The next building block is the <b>quadratic form</b> \\(f(\\mathbf x) = \\mathbf x^\\top A\\mathbf x = \\sum_{i,k} x_i A_{ik} x_k\\). By the product rule each term gives two pieces, and the Kronecker deltas pick out the terms that contain \\(x_j\\):</p>' +
          '\\[ \\frac{\\partial f}{\\partial x_j} = \\sum_{i,k} \\big(\\delta_{ij} A_{ik} x_k + x_i A_{ik}\\, \\delta_{kj}\\big) = \\sum_k A_{jk}x_k + \\sum_i x_i A_{ij}. \\]' +
          '<p>The first sum is entry \\(j\\) of \\(A\\mathbf x\\), the second is entry \\(j\\) of \\(A^\\top\\mathbf x\\), so</p>' +
          '\\[  \\nabla f = A\\mathbf x + A^\\top\\mathbf x = (A + A^\\top)\\mathbf x. \\]' +
          '<p>For a symmetric matrix this is \\(2A\\mathbf x\\), the vector version of \\(\\tfrac{d}{dx}(ax^2) = 2ax\\). The special case \\(A = I\\) gives the squared length:</p>' +
          '\\[ \\nabla \\lVert \\mathbf x \\rVert^2 = \\nabla (\\mathbf x^\\top\\mathbf x) = 2\\mathbf x. \\]' +
          '<p>Combined with the chain rule this gives the gradient of the least squares error, \\(\\nabla \\lVert A\\mathbf x - \\mathbf b \\rVert^2 = 2A^\\top(A\\mathbf x - \\mathbf b)\\), which you met in <a href="#/l/mv-s4">Gradients of loss functions</a>.</p>'
      },
      {
        kind: 'explore',
        title: 'The gradient of a bowl',
        html: '<p>Here \\(f(\\mathbf x) = \\mathbf x^\\top A\\mathbf x\\) for a symmetric matrix \\(A\\). Its contours are ellipses. Drag the black point and change the entries of \\(A\\) with the sliders.</p>' +
          '<p>The gradient \\(2A\\mathbf x\\) always crosses the dashed contour at a right angle. It only points straight away from the origin when \\(\\mathbf x\\) lies on an axis of the ellipse, that is, when \\(\\mathbf x\\) is an eigenvector of \\(A\\).</p>',
        mount: mountBowl
      },
      {
        kind: 'exercise',
        title: 'Gradients of vector functions',
        html: '<p>Use \\(\\nabla(\\mathbf a^\\top\\mathbf x) = \\mathbf a\\) and \\(\\nabla(\\mathbf x^\\top A\\mathbf x) = (A + A^\\top)\\mathbf x\\). Each answer is one component of a gradient.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 4,
            gen: function () {
              var t = M4.rand(0, 2), x = [M4.randNZ(-3, 3), M4.randNZ(-3, 3)], j = M4.rand(1, 2);
              if (t === 0) {
                var a = [M4.randNZ(-4, 4), M4.randNZ(-4, 4)], c = M4.randNZ(-2, 2), g = [a[0] + 2 * c * x[0], a[1] + 2 * c * x[1]];
                return {
                  q: '<p>' + T('f(\\mathbf x) = \\mathbf a^\\top\\mathbf x + ' + c + '\\,\\lVert\\mathbf x\\rVert^2') + ' with ' + T('\\mathbf a = (' + a.join(', ') + ')') + '. Compute ' + T('\\partial f/\\partial x_' + j) + ' at ' + T('\\mathbf x = (' + x.join(', ') + ')') + '.</p>',
                  answer: g[j - 1],
                  explain: T('\\nabla f = \\mathbf a + ' + 2 * c + '\\mathbf x = (' + g.join(', ') + ')') + '.'
                };
              }
              var A = [[M4.rand(-3, 3), M4.rand(-3, 3)], [M4.rand(-3, 3), M4.rand(-3, 3)]];
              var S = [[2 * A[0][0], A[0][1] + A[1][0]], [A[0][1] + A[1][0], 2 * A[1][1]]];
              var gg = [S[0][0] * x[0] + S[0][1] * x[1], S[1][0] * x[0] + S[1][1] * x[1]];
              return {
                q: '<p>' + T('f(\\mathbf x) = \\mathbf x^\\top A\\mathbf x') + ' with ' + T('A = \\begin{pmatrix}' + A[0].join(' & ') + '\\\\' + A[1].join(' & ') + '\\end{pmatrix}') + '. Compute ' + T('\\partial f/\\partial x_' + j) + ' at ' + T('\\mathbf x = (' + x.join(', ') + ')') + '.</p>',
                answer: gg[j - 1],
                explain: T('A + A^\\top = \\begin{pmatrix}' + S[0].join(' & ') + '\\\\' + S[1].join(' & ') + '\\end{pmatrix}') + ', so ' + T('\\nabla f = (A + A^\\top)\\mathbf x = (' + gg.join(', ') + ')') + '.'
              };
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'The Jacobian',
        html: '<p>Many functions take a vector to a vector, \\(\\mathbf f : \\mathbb R^n \\to \\mathbb R^m\\). Its derivative is the <b>Jacobian</b>, the \\(m \\times n\\) matrix of all partial derivatives:</p>' +
          '\\[ J_{ij} = \\frac{\\partial f_i}{\\partial x_j}, \\qquad \\mathbf f(\\mathbf x + \\Delta\\mathbf x) \\approx \\mathbf f(\\mathbf x) + J\\,\\Delta\\mathbf x. \\]' +
          '<p>Row \\(i\\) is the gradient of the output \\(f_i\\). Column \\(j\\) says how all outputs move when only \\(x_j\\) moves. Three cases come up again and again:</p>' +
          '<ul><li>\\(\\mathbf f(\\mathbf x) = W\\mathbf x + \\mathbf b\\) has Jacobian \\(W\\), the same everywhere.</li>' +
          '<li>An elementwise function such as \\(e^x\\) or \\(\\sigma\\) applied to each entry has a diagonal Jacobian \\(\\mathrm{diag}\\big(\\phi\'(x_1), \\dots, \\phi\'(x_n)\\big)\\), because output \\(i\\) depends on input \\(i\\) alone.</li>' +
          '<li>A composition \\(\\mathbf g(\\mathbf f(\\mathbf x))\\) has Jacobian \\(J_{\\mathbf g}\\, J_{\\mathbf f}\\). This is the chain rule, and the shapes \\((k \\times m)(m \\times n)\\) fit together like any matrix product.</li></ul>'
      },
      {
        kind: 'explore',
        title: 'A curved map, seen up close',
        html: '<p>The map \\(\\mathbf f(x_1, x_2) = \\big(x_1 + \\tfrac14 x_2^2,\\; x_2 + 0.8\\sin x_1\\big)\\) bends the plane. Its Jacobian is</p>' +
          '\\[ J = \\begin{pmatrix} 1 & \\tfrac12 x_2 \\\\ 0.8\\cos x_1 & 1 \\end{pmatrix}. \\]' +
          '<p>The blue square on the left is sent to the pink curved shape on the right. The dashed parallelogram is what the Jacobian predicts: the edges \\(h\\mathbf e_1\\) and \\(h\\mathbf e_2\\) go to the columns of \\(hJ\\). Drag the square around, then shrink it with the slider and watch the two shapes merge.</p>',
        mount: mountJacobian
      },
      {
        kind: 'text',
        title: 'Derivatives with respect to a matrix',
        html: '<p>Now let a scalar function \\(L\\) depend on a matrix \\(W \\in \\mathbb R^{m \\times n}\\). Its gradient again has the shape of the variable: \\(\\partial L/\\partial W\\) is an \\(m \\times n\\) matrix whose entry \\((i, j)\\) is \\(\\partial L/\\partial W_{ij}.\\)</p>' +
          '<p>Suppose \\(L\\) depends on \\(W\\) and \\(\\mathbf b\\) only through \\(\\mathbf z = W\\mathbf x + \\mathbf b\\), and that its gradient \\(\\boldsymbol\\delta = \\partial L/\\partial \\mathbf z\\) is known. Write \\(z_k = \\sum_l W_{kl}x_l + b_k\\). The entry \\(W_{ij}\\) only appears in \\(z_i\\), with factor \\(x_j\\), and the Kronecker delta says exactly that: \\(\\partial z_k/\\partial W_{ij} = \\delta_{ki}\\, x_j\\). The chain rule sums over all \\(z_k\\):</p>' +
          '\\[ \\frac{\\partial L}{\\partial W_{ij}} = \\sum_k \\frac{\\partial L}{\\partial z_k}\\, \\delta_{ki}\\, x_j = \\frac{\\partial L}{\\partial z_i}\\, x_j. \\]' +
          '<p>Do not confuse the two deltas. The Kronecker delta \\(\\delta_{ki}\\) has two indices and is always 0 or 1. The gradient \\(\\delta_i = \\partial L/\\partial z_i\\) has one index. With that notation</p>' +
          '\\[ \\frac{\\partial L}{\\partial W_{ij}} = \\delta_i\\, x_j, \\qquad \\frac{\\partial L}{\\partial W} = \\boldsymbol\\delta\\, \\mathbf x^\\top, \\qquad \\frac{\\partial L}{\\partial \\mathbf b} = \\boldsymbol\\delta, \\qquad \\frac{\\partial L}{\\partial \\mathbf x} = W^\\top \\boldsymbol\\delta. \\]' +
          '<p>The gradient with respect to \\(W\\) is the <b>outer product</b> of the known gradient \\(\\boldsymbol\\delta\\) and the input \\(\\mathbf x\\). The gradient with respect to \\(\\mathbf x\\) multiplies \\(\\boldsymbol\\delta\\) by the transpose \\(W^\\top\\). Later in the course, neural networks compute all their gradients with exactly these two rules.</p>'
      },
      {
        kind: 'explore',
        title: 'The outer product',
        html: '<p>Change the known gradient \\(\\boldsymbol\\delta\\) and the input \\(\\mathbf x\\), and watch the weight gradient \\(\\boldsymbol\\delta\\mathbf x^\\top\\).</p>' +
          '<p>Set one \\(\\delta_i\\) to zero: the whole row goes blank, because \\(L\\) does not change with \\(z_i\\), so the entries that feed \\(z_i\\) do not matter. Set one \\(x_j\\) to zero: the whole column goes blank, because the entries \\(W_{ij}\\) multiply \\(x_j = 0\\) and have no effect on \\(L\\).</p>',
        mount: mountOuter
      },
      {
        kind: 'exercise',
        title: 'Shapes of gradients',
        html: '<p>A gradient always has the shape of the variable it is taken with respect to. Use that to check every formula before computing anything.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 4,
            gen: function () {
              var m = M4.rand(2, 6), n = M4.rand(2, 6), t = M4.rand(0, 3);
              while (n === m) n = M4.rand(2, 6);
              var setup = '<p>Let ' + T('\\mathbf z = W\\mathbf x + \\mathbf b') + ' with ' + T('W \\in \\mathbb R^{' + m + '\\times ' + n + '}') + '. ';
              var Q = [
                ['the gradient ' + T('\\partial L/\\partial W'), m + '\\times ' + n, 'It has the shape of ' + T('W') + ', and ' + T('\\boldsymbol\\delta\\mathbf x^\\top') + ' is ' + T('(' + m + '\\times 1)(1\\times ' + n + ')') + '.'],
                ['the gradient ' + T('\\partial L/\\partial\\mathbf x = W^\\top\\boldsymbol\\delta'), n + '\\times 1', T('W^\\top') + ' is ' + T(n + '\\times ' + m) + ' and ' + T('\\boldsymbol\\delta') + ' has length ' + m + '. The result has the shape of ' + T('\\mathbf x') + '.'],
                ['the Jacobian ' + T('\\partial\\mathbf z/\\partial\\mathbf x'), m + '\\times ' + n, 'One row per output, one column per input. It equals ' + T('W') + '.'],
                ['the gradient ' + T('\\partial L/\\partial\\mathbf b'), m + '\\times 1', 'It equals ' + T('\\boldsymbol\\delta') + ', one entry per output.']
              ][t];
              var opts = D_unique([m + '\\times ' + n, n + '\\times ' + m, m + '\\times 1', n + '\\times 1']);
              return {
                q: setup + 'What is the shape of ' + Q[0] + '?</p>',
                options: opts.map(function (o) { return T(o); }),
                answer: opts.indexOf(Q[1]),
                explain: Q[2]
              };
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Backwards through Wx + b',
        html: '<p>For \\(\\mathbf z = W\\mathbf x + \\mathbf b\\) with known gradient \\(\\boldsymbol\\delta = \\partial L/\\partial\\mathbf z\\): \\(\\partial L/\\partial W = \\boldsymbol\\delta\\mathbf x^\\top\\) and \\(\\partial L/\\partial\\mathbf x = W^\\top\\boldsymbol\\delta\\). Each problem asks for a single entry.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 4,
            gen: function () {
              var W = [[M4.rand(-3, 3), M4.rand(-3, 3), M4.rand(-3, 3)], [M4.rand(-3, 3), M4.rand(-3, 3), M4.rand(-3, 3)]];
              var x = [M4.randNZ(-3, 3), M4.randNZ(-3, 3), M4.randNZ(-3, 3)], d = [M4.randNZ(-2, 2), M4.randNZ(-2, 2)];
              var Wt = '\\begin{pmatrix}' + W[0].join(' & ') + '\\\\' + W[1].join(' & ') + '\\end{pmatrix}';
              var given = '<p>' + T('W = ' + Wt) + ', ' + T('\\mathbf x = (' + x.join(', ') + ')^\\top') + ', ' + T('\\boldsymbol\\delta = (' + d.join(', ') + ')^\\top') + '. ';
              if (M4.rand(0, 1) === 0) {
                var i = M4.rand(1, 2), j = M4.rand(1, 3);
                return {
                  q: given + 'Compute ' + T('\\partial L/\\partial W_{' + i + j + '}') + '.</p>',
                  answer: d[i - 1] * x[j - 1],
                  explain: T('\\partial L/\\partial W_{' + i + j + '} = \\delta_' + i + ' x_' + j + ' = ' + M4.sn(d[i - 1]) + '\\cdot ' + M4.sn(x[j - 1]) + ' = ' + d[i - 1] * x[j - 1]) + '. Row ' + i + ' of the outer product, column ' + j + '.'
                };
              }
              var k = M4.rand(1, 3), v = W[0][k - 1] * d[0] + W[1][k - 1] * d[1];
              return {
                q: given + 'Compute ' + T('\\partial L/\\partial x_' + k) + '.</p>',
                answer: v,
                explain: 'Entry ' + k + ' of ' + T('W^\\top\\boldsymbol\\delta') + ' is column ' + k + ' of ' + T('W') + ' dotted with ' + T('\\boldsymbol\\delta') + ': ' + T(M4.sn(W[0][k - 1]) + '\\cdot ' + M4.sn(d[0]) + ' + ' + M4.sn(W[1][k - 1]) + '\\cdot ' + M4.sn(d[1]) + ' = ' + v) + '.'
              };
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>The gradient of a scalar has the shape of the variable: a vector for a vector, a matrix for a matrix.</li>' +
          '<li>\\(\\nabla(\\mathbf a^\\top\\mathbf x) = \\mathbf a\\), \\(\\nabla(\\mathbf x^\\top A\\mathbf x) = (A + A^\\top)\\mathbf x\\) and \\(\\nabla\\lVert\\mathbf x\\rVert^2 = 2\\mathbf x\\).</li>' +
          '<li>The Jacobian of \\(\\mathbf f : \\mathbb R^n \\to \\mathbb R^m\\) is \\(m \\times n\\) and is the best linear approximation of \\(\\mathbf f\\) near a point. Jacobians of a composition multiply.</li>' +
          '<li>For \\(\\mathbf z = W\\mathbf x + \\mathbf b\\): \\(\\partial L/\\partial W = \\boldsymbol\\delta\\mathbf x^\\top\\), \\(\\partial L/\\partial\\mathbf b = \\boldsymbol\\delta\\), \\(\\partial L/\\partial\\mathbf x = W^\\top\\boldsymbol\\delta\\).</li>' +
          '</ul>' +
          '<p class="m4-note">To make these rules automatic, work through <a href="#/l/mv-drill">Matrix calculus practice</a>. To see the same rules come out of plain sums, continue with <a href="#/l/mv-s6">Two ways to differentiate</a>.</p>'
      }
    ]
  });

  function D_unique(a) { var s = []; a.forEach(function (v) { if (s.indexOf(v) < 0) s.push(v); }); return s; }
})();
