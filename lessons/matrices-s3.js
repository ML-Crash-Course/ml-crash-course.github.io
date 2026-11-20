(function () {
  'use strict';

  var C = M4.colors;
  var PRE = 'matrices-s3-';

  function injectStyle() {
    if (document.getElementById(PRE + 'style')) return;
    var s = document.createElement('style');
    s.id = PRE + 'style';
    s.textContent = [
      '.matrices-s3-stage{justify-content:center;align-items:center;gap:18px;margin:18px 0}',
      '.matrices-s3-mat{display:inline-flex;gap:8px;padding:8px 10px;border-left:3px solid #1d1d1f;border-right:3px solid #1d1d1f;border-radius:10px}',
      '.matrices-s3-vert{flex-direction:column}',
      '.matrices-s3-rowtok{display:flex;gap:22px;justify-content:center;padding:10px 20px;font-size:22px;font-weight:700;border-color:#7a5cff;color:#7a5cff;touch-action:none;user-select:none;-webkit-user-select:none}',
      '.matrices-s3-colslot{display:flex;flex-direction:column;gap:10px;align-items:center;padding:10px 18px;font-size:22px;font-weight:700;color:#ff8a1f;min-width:56px;border-color:#ff8a1f}',
      '.matrices-s3-grid{display:grid;grid-template-columns:repeat(2,64px);gap:8px}',
      '.matrices-s3-cell{height:56px;border-radius:12px;background:#f3f1ea;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;border:2px solid transparent;color:#6b6f76}',
      '.matrices-s3-cell.matrices-s3-target{border-color:#7a5cff;background:#efeaff;color:#7a5cff}',
      '.matrices-s3-cell.matrices-s3-done{background:#e3f7ec;color:#16b56b}',
      '.matrices-s3-op{font-size:28px;font-weight:700;color:#6b6f76}',
      '.matrices-s3-label{text-align:center;font-weight:700;color:#6b6f76;margin-bottom:6px;font-size:16px}',
      '.matrices-s3-numslot{width:64px;height:56px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;box-sizing:border-box}',
      '.matrices-s3-numslot.filled{color:#16b56b;border-style:solid;border-color:#16b56b;background:#e3f7ec}',
      '.matrices-s3-numtok{min-width:52px;height:52px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;touch-action:none;user-select:none;-webkit-user-select:none;box-sizing:border-box}',
      '.matrices-s3-svg{width:100%;height:auto;display:block}',
      '.matrices-s3-center{justify-content:center;margin:10px 0}',
      '.matrices-s3-big{font-size:22px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------- small maths helpers ----------
  function mul(X, Y) {
    return [
      [X[0][0] * Y[0][0] + X[0][1] * Y[1][0], X[0][0] * Y[0][1] + X[0][1] * Y[1][1]],
      [X[1][0] * Y[0][0] + X[1][1] * Y[1][0], X[1][0] * Y[0][1] + X[1][1] * Y[1][1]]
    ];
  }
  function app(M, v) {
    return [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]];
  }
  function lerpM(X, Y, t) {
    return [
      [X[0][0] + (Y[0][0] - X[0][0]) * t, X[0][1] + (Y[0][1] - X[0][1]) * t],
      [X[1][0] + (Y[1][0] - X[1][0]) * t, X[1][1] + (Y[1][1] - X[1][1]) * t]
    ];
  }
  var I2 = [[1, 0], [0, 1]];
  function fmt(v) {
    var s = (Math.round(v * 100) / 100).toFixed(2);
    if (s === '-0.00') s = '0.00';
    return s;
  }
  function matText(M) {
    return '[ ' + fmt(M[0][0]) + '  ' + fmt(M[0][1]) + ' ;  ' + fmt(M[1][0]) + '  ' + fmt(M[1][1]) + ' ]';
  }
  function bm(rows) {
    return '\\begin{bmatrix}' + rows.map(function (r) { return r.join(' & '); }).join(' \\\\ ') + '\\end{bmatrix}';
  }
  var FSHAPE = [[0, 0], [0, 2], [1.5, 2], [1.5, 1.6], [0.4, 1.6], [0.4, 1.2], [1.1, 1.2], [1.1, 0.8], [0.4, 0.8], [0.4, 0]];

  // ---------- shape diagram (steps 4 and 5) ----------
  function makeShapeSvg(parent) {
    var svg = M4.svg('svg', { viewBox: '0 0 720 300', class: PRE + 'svg' }, parent);
    return svg;
  }
  function svgText(svg, x, y, parts, size) {
    var t = M4.svg('text', { x: x, y: y, 'text-anchor': 'middle', 'font-size': size || 20, 'font-weight': 700 }, svg);
    parts.forEach(function (p) {
      var ts = M4.svg('tspan', { fill: p[1] || C.ink }, t);
      ts.textContent = p[0];
    });
    return t;
  }
  function cellGrid(svg, cx, cy, rows, cols, color) {
    var c = 26, g = 4, w = cols * (c + g) - g, h = rows * (c + g) - g;
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < cols; j++) {
        M4.svg('rect', {
          x: cx - w / 2 + j * (c + g), y: cy - h / 2 + i * (c + g),
          width: c, height: c, rx: 6, fill: color, 'fill-opacity': 0.85
        }, svg);
      }
    }
  }
  function drawShapes(svg, m, n, p, q) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var ok = n === p;
    var inner = ok ? C.green : C.red;
    cellGrid(svg, 130, 120, m, n, C.purple);
    cellGrid(svg, 360, 120, p, q, C.orange);
    svgText(svg, 130, 250, [['A:  ' + m + ' \u00d7 '], [String(n), inner]]);
    svgText(svg, 360, 250, [['B:  '], [String(p), inner], [' \u00d7 ' + q]]);
    svgText(svg, 130, 282, [[m + ' rows, ' + n + ' columns', C.muted]], 15);
    svgText(svg, 360, 282, [[p + ' rows, ' + q + ' columns', C.muted]], 15);
    svgText(svg, 475, 128, [['=', C.muted]], 30);
    if (ok) {
      cellGrid(svg, 590, 120, m, q, C.green);
      svgText(svg, 590, 250, [['AB:  ' + m + ' \u00d7 ' + q, C.green]]);
      svgText(svg, 590, 282, [['inner sizes match', C.muted]], 15);
    } else {
      svgText(svg, 590, 128, [['not defined', C.red]], 22);
      svgText(svg, 590, 250, [[n + ' \u2260 ' + p, C.red]]);
      svgText(svg, 590, 282, [['inner sizes differ', C.muted]], 15);
    }
  }

  // ---------- transformed grid for planes ----------
  function makeGrid(p, R, color) {
    var lines = [];
    for (var i = -R; i <= R; i++) {
      var a = p.line(i, -R, i, R, { stroke: color, width: 1.5 });
      var b = p.line(-R, i, R, i, { stroke: color, width: 1.5 });
      a.el.setAttribute('opacity', 0.28);
      b.el.setAttribute('opacity', 0.28);
      lines.push({ h: a, p1: [i, -R], p2: [i, R] }, { h: b, p1: [-R, i], p2: [R, i] });
    }
    return function (M) {
      lines.forEach(function (l) {
        var u = app(M, l.p1), v = app(M, l.p2);
        l.h.set(u[0], u[1], v[0], v[1]);
      });
    };
  }

  M4.lesson({
    id: 'matrices-s3',
    module: 'matrices',
    title: 'Matrix multiplication',
    summary: 'Multiplying two matrices row by column, the shape rule, and why the product means doing one linear map after another.',
    minutes: 12,
    steps: [
      // 1 ------------------------------------------------------------
      {
        kind: 'text',
        title: 'The product of two matrices',
        html:
          '<p>A matrix can multiply a vector, and it can also multiply another matrix.</p>' +
          '<p>In this lesson you will compute each entry of a product \\(AB\\) from a row of \\(A\\) and a column of \\(B\\), ' +
          'decide from the shapes whether a product exists, and read \\(AB\\) as the single linear map that applies \\(B\\) first and \\(A\\) second.</p>' +
          '<p>The order of the factors matters: in general \\(AB\\) and \\(BA\\) are different matrices.</p>'
      },
      // 2 ------------------------------------------------------------
      {
        kind: 'text',
        title: 'Row times column',
        html:
          '<p>Let \\(A\\) and \\(B\\) be matrices. The entry of \\(AB\\) in row \\(i\\) and column \\(j\\), written \\((AB)_{ij}\\), ' +
          'is obtained from row \\(i\\) of \\(A\\) and column \\(j\\) of \\(B\\): multiply the entries pairwise and add the results.</p>' +
          '\\[(AB)_{ij} = \\sum_{k} A_{ik}\\,B_{kj}\\]' +
          '<p>For example, with \\(A = ' + bm([[2, 1], [0, 3]]) + '\\) and \\(B = ' + bm([[1, 4], [2, 1]]) + '\\), the top-left entry uses row 1 of \\(A\\), ' +
          'which is \\((2,\\,1)\\), and column 1 of \\(B\\), which is \\((1,\\,2)\\): \\(2\\cdot 1 + 1\\cdot 2 = 4\\).</p>'
      },
      // 3 ------------------------------------------------------------
      {
        kind: 'exercise',
        title: 'Products cell by cell',
        html:
          '<p>The highlighted cell of \\(AB\\) is waiting for a value. Drag the row of \\(A\\) that it needs onto the column of \\(B\\) that it needs. ' +
          'Repeat for all four cells.</p>',
        hint: 'The cell in row i and column j of AB needs row i of A and column j of B. The row index comes from the left factor, the column index from the right factor.',
        mount: function (el, ctx) {
          injectStyle();
          el.textContent = '';
          var A = [[2, 1], [0, 3]], B = [[1, 4], [2, 1]];
          var order = [[0, 0], [0, 1], [1, 0], [1, 1]];
          var k = 0;

          var stage = M4.el('div', { class: 'm4-row ' + PRE + 'stage' }, el);

          var aBox = M4.el('div', {}, stage);
          M4.el('div', { class: PRE + 'label', text: 'A (drag a row)' }, aBox);
          var aMat = M4.el('div', { class: PRE + 'mat ' + PRE + 'vert' }, aBox);
          var tokens = A.map(function (row, i) {
            var t = M4.el('div', { class: 'm4-token ' + PRE + 'rowtok' }, aMat);
            t.setAttribute('data-i', i);
            row.forEach(function (v) { M4.el('span', { text: String(v) }, t); });
            return t;
          });

          var bBox = M4.el('div', {}, stage);
          M4.el('div', { class: PRE + 'label', text: 'B (drop on a column)' }, bBox);
          var bMat = M4.el('div', { class: PRE + 'mat' }, bBox);
          var slots = [0, 1].map(function (j) {
            var s = M4.el('div', { class: 'm4-slot ' + PRE + 'colslot' }, bMat);
            s.setAttribute('data-j', j);
            M4.el('span', { text: String(B[0][j]) }, s);
            M4.el('span', { text: String(B[1][j]) }, s);
            return s;
          });

          M4.el('div', { class: PRE + 'op', text: '=' }, stage);

          var cBox = M4.el('div', {}, stage);
          M4.el('div', { class: PRE + 'label', text: 'AB' }, cBox);
          var cMat = M4.el('div', { class: PRE + 'mat' }, cBox);
          var grid = M4.el('div', { class: PRE + 'grid' }, cMat);
          var cells = [[null, null], [null, null]];
          for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
            cells[i][j] = M4.el('div', { class: PRE + 'cell', text: '\u00b7' }, grid);
          }

          var infoRow = M4.el('div', { class: 'm4-row ' + PRE + 'center' }, el);
          var info = M4.el('span', { class: 'm4-readout' }, infoRow);

          function showTarget() {
            for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) cells[i][j].classList.remove(PRE + 'target');
            if (k < 4) {
              var t = order[k];
              cells[t[0]][t[1]].classList.add(PRE + 'target');
              cells[t[0]][t[1]].textContent = '?';
              info.textContent = 'Fill the entry in row ' + (t[0] + 1) + ', column ' + (t[1] + 1);
            } else {
              info.textContent = 'AB is complete';
            }
          }
          function rehome() {
            // keep rows of A and columns of B in place regardless of how the drop was handled
            tokens.forEach(function (t) { if (t.parentNode !== aMat) aMat.appendChild(t); });
            if (tokens[0].nextSibling !== tokens[1]) { aMat.appendChild(tokens[0]); aMat.appendChild(tokens[1]); }
            tokens.forEach(function (t) { t.style.display = ''; t.style.visibility = ''; });
            slots.forEach(function (s) { s.classList.remove('filled'); });
          }
          showTarget();

          M4.dragDrop({
            tokens: tokens,
            slots: slots,
            onDrop: function (tok, slot) {
              var i = +tok.getAttribute('data-i'), j = +slot.getAttribute('data-j');
              rehome();
              if (k >= 4) return;
              var t = order[k];
              if (i === t[0] && j === t[1]) {
                var val = A[i][0] * B[0][j] + A[i][1] * B[1][j];
                var cell = cells[i][j];
                cell.textContent = String(val);
                cell.classList.remove(PRE + 'target');
                cell.classList.add(PRE + 'done', 'm4-pop');
                ctx.note('Row ' + (i + 1) + ' of \\(A\\) times column ' + (j + 1) + ' of \\(B\\): \\(' +
                  A[i][0] + '\\cdot ' + B[0][j] + ' + ' + A[i][1] + '\\cdot ' + B[1][j] + ' = ' + val + '\\).');
                k++;
                showTarget();
                if (k === 4) ctx.solved();
              } else {
                ctx.wrong('Row ' + (i + 1) + ' of A with column ' + (j + 1) + ' of B gives the entry in row ' + (i + 1) +
                  ', column ' + (j + 1) + '. The highlighted cell is in row ' + (t[0] + 1) + ', column ' + (t[1] + 1) + '.');
              }
            },
            onMiss: function () { rehome(); }
          });
        }
      },
      // 4 ------------------------------------------------------------
      {
        kind: 'explore',
        title: 'The shape rule',
        html:
          '<p>A matrix with \\(m\\) rows and \\(n\\) columns has shape \\(m \\times n\\). A row of \\(A\\) can only be paired with a column of \\(B\\) if both have the same number of entries, ' +
          'so the number of columns of \\(A\\) must equal the number of rows of \\(B\\). If \\(A\\) is \\(m \\times n\\) and \\(B\\) is \\(n \\times q\\), the product \\(AB\\) is \\(m \\times q\\): ' +
          'the two inner sizes must agree, and the two outer sizes give the shape of the result.</p>' +
          '<p>Change the shapes below and observe when the product exists.</p>',
        mount: function (el, ctx) {
          injectStyle();
          el.textContent = '';
          var s = { m: 2, n: 3, p: 3, q: 4 };
          var svg = makeShapeSvg(el);
          function draw() { drawShapes(svg, s.m, s.n, s.p, s.q); }
          var grid = M4.el('div', { class: 'm4-grid2' }, el);
          function sl(key, label) {
            M4.slider(grid, {
              min: 1, max: 5, step: 1, value: s[key], label: label,
              format: function (v) { return String(v); },
              onInput: function (v) { s[key] = Math.round(v); draw(); }
            });
          }
          sl('m', 'rows of A');
          sl('p', 'rows of B');
          sl('n', 'columns of A');
          sl('q', 'columns of B');
          draw();
        }
      },
      // 5 ------------------------------------------------------------
      {
        kind: 'exercise',
        title: 'A shape for B',
        html:
          '<p>The matrix \\(A\\) has shape \\(2 \\times 3\\). Set the number of rows and columns of \\(B\\) so that the product \\(AB\\) is defined and has shape \\(2 \\times 4\\).</p>',
        hint: 'The rows of B must match the columns of A, which is 3. The columns of B become the columns of AB.',
        mount: function (el, ctx) {
          injectStyle();
          el.textContent = '';
          var s = { p: 2, q: 2 };
          var done = false;
          var svg = makeShapeSvg(el);
          function check() {
            drawShapes(svg, 2, 3, s.p, s.q);
            if (done) return;
            if (s.p !== 3) {
              ctx.note('Not defined: \\(A\\) has 3 columns but \\(B\\) has ' + s.p + (s.p === 1 ? ' row' : ' rows') + '.');
            } else if (s.q !== 4) {
              ctx.note('Defined, with shape \\(2 \\times ' + s.q + '\\). The target shape is \\(2 \\times 4\\).');
            } else {
              done = true;
              ctx.note('\\((2 \\times 3)(3 \\times 4)\\) gives \\(2 \\times 4\\).');
              ctx.solved();
            }
          }
          var grid = M4.el('div', { class: 'm4-grid2' }, el);
          M4.slider(grid, {
            min: 1, max: 5, step: 1, value: s.p, label: 'rows of B',
            format: function (v) { return String(v); },
            onInput: function (v) { s.p = Math.round(v); check(); }
          });
          M4.slider(grid, {
            min: 1, max: 5, step: 1, value: s.q, label: 'columns of B',
            format: function (v) { return String(v); },
            onInput: function (v) { s.q = Math.round(v); check(); }
          });
          check();
        }
      },
      // 6 ------------------------------------------------------------
      {
        kind: 'explore',
        title: 'Products as compositions',
        html:
          '<p>A matrix moves the whole grid. Applying \\(B\\) to a vector \\(x\\) and then applying \\(A\\) to the result gives \\(A(Bx)\\). ' +
          'The product is defined so that one matrix does both moves at once: \\((AB)x = A(Bx)\\) for every \\(x\\).</p>' +
          '<p>Here \\(B = ' + bm([[0, -1], [1, 0]]) + '\\) rotates by a quarter turn and \\(A = ' + bm([[1, 1], [0, 1]]) + '\\) is a shear. ' +
          'Move the slider: the first half applies \\(B\\), the second half applies \\(A\\), and the end state is the grid moved by \\(AB = ' + bm([[1, -1], [1, 0]]) + '\\).</p>',
        mount: function (el, ctx) {
          injectStyle();
          el.textContent = '';
          var A = [[1, 1], [0, 1]], B = [[0, -1], [1, 0]];
          var p = M4.plane(el, { xmin: -4, xmax: 4, ymin: -4, ymax: 4 });
          var setGrid = makeGrid(p, 6, C.purple);
          var shape = p.path(FSHAPE, { stroke: C.purple, width: 3, fill: C.purple, closed: true });
          shape.el.setAttribute('fill-opacity', 0.25);
          var e1 = p.arrow(0, 0, 1, 0, { stroke: C.orange, width: 5 });
          var e2 = p.arrow(0, 0, 0, 1, { stroke: C.green, width: 5 });

          var row = M4.el('div', { class: 'm4-row ' + PRE + 'center' }, el);
          var stageR = M4.el('span', { class: 'm4-readout' }, row);
          var matR = M4.el('span', { class: 'm4-readout' }, row);

          function current(t) {
            if (t <= 1) return lerpM(I2, B, t);
            return mul(lerpM(I2, A, t - 1), B);
          }
          function update(t) {
            var M = current(t);
            setGrid(M);
            shape.set(FSHAPE.map(function (q) { return app(M, q); }));
            var a = app(M, [1, 0]), b = app(M, [0, 1]);
            e1.set(0, 0, a[0], a[1]);
            e2.set(0, 0, b[0], b[1]);
            stageR.textContent = t === 0 ? 'start: identity' : t < 1 ? 'applying B' : t === 1 ? 'B applied' : t < 2 ? 'applying A after B' : 'result: AB';
            matR.textContent = 'grid matrix ' + matText(M);
          }

          var raf = 0;
          var slider = M4.slider(el, {
            min: 0, max: 2, step: 0.01, value: 0, label: 'progress',
            format: function (v) { return v <= 1 ? 'B ' + Math.round(v * 100) + '%' : 'A ' + Math.round((v - 1) * 100) + '%'; },
            onInput: function (v) { cancelAnimationFrame(raf); raf = 0; update(+v); }
          });
          var btnRow = M4.el('div', { class: 'm4-row ' + PRE + 'center' }, el);
          M4.button(btnRow, 'Play B, then A', function () {
            cancelAnimationFrame(raf);
            var t0 = null, dur = 3600;
            function ease(u) { return u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u); }
            function frame(now) {
              if (t0 === null) t0 = now;
              var u = Math.min(1, (now - t0) / dur);
              var t = u < 0.5 ? ease(u * 2) : 1 + ease((u - 0.5) * 2);
              t = Math.round(t * 100) / 100;
              slider.set(t);
              update(t);
              if (u < 1) raf = requestAnimationFrame(frame);
            }
            raf = requestAnimationFrame(frame);
          }, { primary: true });
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
          update(0);
        }
      },
      // 7 ------------------------------------------------------------
      {
        kind: 'exercise',
        title: 'Reading the order',
        html:
          '<p>In the expression \\(ABx\\), the matrix nearest to the vector acts first, so products are read from right to left. ' +
          'Let \\(S\\) be a shear and \\(R\\) a rotation. Which product represents the map that shears first and rotates second?</p>',
        hint: 'The map applied first must stand next to the vector x. Write out what happens to x: first S x, then R applied to that.',
        mount: function (el, ctx) {
          injectStyle();
          el.textContent = '';
          var msgs = [
            '',
            '\\(SRx = S(Rx)\\): here the rotation acts on \\(x\\) first.',
            'Adding matrices adds the outputs of the two maps. It does not apply one after the other.',
            'The order matters in general: \\(RS\\) and \\(SR\\) are usually different matrices.'
          ];
          M4.choices(el, {
            options: ['\\(RS\\)', '\\(SR\\)', '\\(R + S\\)', 'Either \\(RS\\) or \\(SR\\). They are always equal'],
            correct: 0,
            onCorrect: function () {
              ctx.note('\\(RSx = R(Sx)\\): the shear acts on \\(x\\) first, then the rotation.');
              ctx.solved();
            },
            onWrong: function (i) { ctx.wrong(); ctx.note(msgs[i] || ''); }
          });
        }
      },
      // 8 ------------------------------------------------------------
      {
        kind: 'exercise',
        title: 'A vector through two maps',
        html:
          '<p>Use the same matrices as before, \\(A = ' + bm([[1, 1], [0, 1]]) + '\\) and \\(B = ' + bm([[0, -1], [1, 0]]) + '\\), and the vector \\(x = ' + bm([[2], [1]]) + '\\) drawn in black. ' +
          'Drag the purple handle to the point \\(ABx\\) and release it.</p>',
        hint: 'Work from the right. First compute Bx: its entries are 0·2 + (−1)·1 and 1·2 + 0·1. Then multiply A by that result.',
        mount: function (el, ctx) {
          injectStyle();
          el.textContent = '';
          var done = false;
          var p = M4.plane(el, { xmin: -4, xmax: 4, ymin: -4, ymax: 4 });
          p.arrow(0, 0, 2, 1, { stroke: C.ink, width: 4 });
          p.text(2.35, 1.3, 'x', { fill: C.ink, size: 20, weight: 700 });
          var ghostB = p.arrow(0, 0, 0, 0, { stroke: C.orange, width: 4 });
          ghostB.el.setAttribute('opacity', 0);
          var lblB = p.text(-1.45, 2.35, '', { fill: C.orange, size: 18, weight: 700 });
          var res = p.arrow(0, 0, 0, 0, { stroke: C.purple, width: 5 });
          res.el.setAttribute('opacity', 0);
          var lblR = p.text(1.55, 2.35, '', { fill: C.purple, size: 18, weight: 700 });

          var row = M4.el('div', { class: 'm4-row ' + PRE + 'center' }, el);
          var read = M4.el('span', { class: 'm4-readout' }, row);
          function show(x, y) { read.textContent = 'handle at (' + Math.round(x) + ', ' + Math.round(y) + ')'; }

          var h = p.handle(3, -2, {
            color: C.purple, snap: 1,
            bounds: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 },
            onDrag: function (x, y) { show(x, y); },
            onEnd: function (x, y) {
              if (done) return;
              x = Math.round(x); y = Math.round(y);
              show(x, y);
              if (x === 1 && y === 2) {
                done = true;
                ghostB.set(0, 0, -1, 2);
                ghostB.el.setAttribute('opacity', 0.55);
                lblB.set(-1.45, 2.35, 'Bx');
                res.set(0, 0, 1, 2);
                res.el.setAttribute('opacity', 1);
                lblR.set(1.6, 2.35, 'ABx');
                ctx.note('\\(Bx = ' + bm([[-1], [2]]) + '\\), then \\(A(Bx) = ' + bm([[1], [2]]) + '\\). The single matrix \\(AB = ' + bm([[1, -1], [1, 0]]) + '\\) gives the same point.');
                ctx.solved();
              } else if (x === -1 && y === 3) {
                ctx.wrong('That point is BAx: the shear A was applied first. In ABx the matrix B acts first.');
              } else if (x === -1 && y === 2) {
                ctx.wrong('That point is Bx. The matrix A still has to be applied to it.');
              } else if (x === 3 && y === 1) {
                ctx.wrong('That point is Ax. In ABx the matrix B acts on x first.');
              } else {
                ctx.wrong('Not yet. Compute Bx first, then multiply A by that result.');
              }
            }
          });
          show(h.x, h.y);
        }
      },
      // 9 ------------------------------------------------------------
      {
        kind: 'explore',
        title: 'Order of multiplication',
        html:
          '<p>Let \\(A = ' + bm([[1, 'k'], [0, 1]]) + '\\) be a shear of strength \\(k\\) and let \\(B\\) be a rotation by the angle \\(\\theta\\). ' +
          'The purple shape is the image of the letter under \\(AB\\) (rotate, then shear). The orange shape is its image under \\(BA\\) (shear, then rotate).</p>' +
          '<p>The two images coincide only in special cases, for instance when \\(k = 0\\) or \\(\\theta = 0^\\circ\\). Matrix multiplication is not commutative.</p>',
        mount: function (el, ctx) {
          injectStyle();
          el.textContent = '';
          var st = { k: 1, th: 90 };
          var p = M4.plane(el, { xmin: -5, xmax: 5, ymin: -5, ymax: 5 });
          var base = p.path(FSHAPE, { stroke: C.muted, width: 2, closed: true });
          base.el.setAttribute('stroke-dasharray', '6 5');
          var sBA = p.path(FSHAPE, { stroke: C.orange, width: 3, fill: C.orange, closed: true });
          sBA.el.setAttribute('fill-opacity', 0.22);
          var sAB = p.path(FSHAPE, { stroke: C.purple, width: 3, fill: C.purple, closed: true });
          sAB.el.setAttribute('fill-opacity', 0.22);

          var row = M4.el('div', { class: 'm4-row ' + PRE + 'center' }, el);
          var rAB = M4.el('span', { class: 'm4-readout', style: 'color:' + C.purple }, row);
          var rBA = M4.el('span', { class: 'm4-readout', style: 'color:' + C.orange }, row);
          var row2 = M4.el('div', { class: 'm4-row ' + PRE + 'center' }, el);
          var rEq = M4.el('span', { class: 'm4-readout' }, row2);

          function update() {
            var a = st.th * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
            var A = [[1, st.k], [0, 1]], B = [[c, -s], [s, c]];
            var AB = mul(A, B), BA = mul(B, A);
            sAB.set(FSHAPE.map(function (q) { return app(AB, q); }));
            sBA.set(FSHAPE.map(function (q) { return app(BA, q); }));
            rAB.textContent = 'AB = ' + matText(AB);
            rBA.textContent = 'BA = ' + matText(BA);
            var d = 0;
            for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) d = Math.max(d, Math.abs(AB[i][j] - BA[i][j]));
            rEq.textContent = d < 0.005 ? 'AB = BA for these values' : 'AB \u2260 BA, largest entry difference ' + fmt(d);
            rEq.style.color = d < 0.005 ? C.green : C.ink;
          }
          var grid = M4.el('div', { class: 'm4-grid2' }, el);
          M4.slider(grid, {
            min: -1.5, max: 1.5, step: 0.1, value: st.k, label: 'shear k',
            format: function (v) { return (+v).toFixed(1); },
            onInput: function (v) { st.k = +v; update(); }
          });
          M4.slider(grid, {
            min: 0, max: 180, step: 5, value: st.th, label: 'angle \u03b8',
            format: function (v) { return Math.round(v) + '\u00b0'; },
            onInput: function (v) { st.th = +v; update(); }
          });
          update();
        }
      },
      // 10 -----------------------------------------------------------
      {
        kind: 'exercise',
        title: 'Matrix products in machine learning',
        html:
          '<p>The previous session computed several scores of one input with \\(W\\mathbf{x}\\). Data usually comes in many examples at once. Store them as the rows of a matrix \\(X\\), one example per row, and put one weight vector in each column of \\(W\\). ' +
          'Then the single product \\(XW\\) holds every score of every example: entry \\((i, j)\\) is the dot product of example \\(i\\) with weight vector \\(j\\). ' +
          'Two such steps in a row compute \\((XW_1)W_2 = X(W_1W_2)\\), which is again a single matrix product. This fact becomes important later in the course.</p>' +
          '<p>A batch \\(X\\) holds 32 images, each flattened to 784 numbers, so \\(X\\) has shape \\(32 \\times 784\\). The matrix \\(W\\) holds 10 weight vectors as columns, so it has shape \\(784 \\times 10\\). What is the shape of \\(XW\\)?</p>',
        hint: 'Check that the inner sizes agree, then read off the outer sizes: rows of X and columns of W.',
        mount: function (el, ctx) {
          injectStyle();
          el.textContent = '';
          var msgs = [
            'The rows and columns are swapped: \\(XW\\) keeps the 32 rows of \\(X\\) and the 10 columns of \\(W\\).',
            '',
            'The inner sizes, 784 and 784, cancel out of the result. Only the outer sizes remain.',
            'The inner sizes are 784 and 784, which agree, so the product is defined.'
          ];
          M4.choices(el, {
            options: ['\\(10 \\times 32\\)', '\\(32 \\times 10\\)', '\\(784 \\times 784\\)', 'The product is not defined'],
            correct: 1,
            onCorrect: function () {
              ctx.note('\\((32 \\times 784)(784 \\times 10)\\) gives \\(32 \\times 10\\): one row of 10 scores for each of the 32 images.');
              ctx.solved();
            },
            onWrong: function (i) { ctx.wrong(); ctx.note(msgs[i] || ''); }
          });
        }
      },
      // 11 -----------------------------------------------------------
      {
        kind: 'exercise',
        title: 'A full product with unequal shapes',
        html:
          '<p>Let \\(A = ' + bm([[1, 2, 0], [0, 1, 3]]) + '\\) with shape \\(2 \\times 3\\) and \\(B = ' + bm([[3, 1], [1, 0], [1, 2]]) + '\\) with shape \\(3 \\times 2\\). ' +
          'The product \\(AB\\) has shape \\(2 \\times 2\\). Drag the correct number into each of its four cells. Three of the tiles are not needed.</p>',
        hint: 'Each cell is a sum of three products. Top-left: row 1 of A is (1, 2, 0) and column 1 of B is (3, 1, 1), giving 1·3 + 2·1 + 0·1.',
        mount: function (el, ctx) {
          injectStyle();
          el.textContent = '';
          var A = [[1, 2, 0], [0, 1, 3]], B = [[3, 1], [1, 0], [1, 2]];
          var AB = [[0, 0], [0, 0]];
          for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) for (var k = 0; k < 3; k++) AB[i][j] += A[i][k] * B[k][j];
          var filled = 0;

          var stage = M4.el('div', { class: 'm4-row ' + PRE + 'stage ' + PRE + 'big' }, el);
          M4.el('span', { html: M4.tex(bm(A)) }, stage);
          M4.el('span', { html: M4.tex(bm(B)) }, stage);
          M4.el('div', { class: PRE + 'op', text: '=' }, stage);
          var cMat = M4.el('div', { class: PRE + 'mat' }, stage);
          var grid = M4.el('div', { class: PRE + 'grid' }, cMat);
          var slots = [];
          for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) {
            var s = M4.el('div', { class: 'm4-slot ' + PRE + 'numslot' }, grid);
            s.setAttribute('data-i', i);
            s.setAttribute('data-j', j);
            slots.push(s);
          }
          var tray = M4.el('div', { class: 'm4-row ' + PRE + 'center' }, el);
          var tokens = [6, 2, 5, 7, 1, 3, 4].map(function (v) {
            var t = M4.el('div', { class: 'm4-token ' + PRE + 'numtok', text: String(v) }, tray);
            t.setAttribute('data-v', v);
            return t;
          });
          function backToTray(tok) {
            if (tok.parentNode !== tray) tray.appendChild(tok);
            tok.style.visibility = '';
          }
          M4.dragDrop({
            tokens: tokens,
            slots: slots,
            onDrop: function (tok, slot) {
              var v = +tok.getAttribute('data-v');
              var i = +slot.getAttribute('data-i'), j = +slot.getAttribute('data-j');
              if (slot.getAttribute('data-done') === '1') {
                backToTray(tok);
                slot.textContent = String(AB[i][j]);
                return;
              }
              var expr = A[i].map(function (a, k) { return a + '\u00b7' + B[k][j]; }).join(' + ');
              if (v === AB[i][j]) {
                slot.textContent = String(v);
                slot.classList.add('filled', 'm4-pop');
                slot.setAttribute('data-done', '1');
                tok.style.display = 'none';
                if (tok.parentNode !== tray) tray.appendChild(tok);
                filled++;
                ctx.note('Row ' + (i + 1) + ', column ' + (j + 1) + ': \\(' + expr.replace(/\u00b7/g, '\\cdot ') + ' = ' + v + '\\).');
                if (filled === 4) ctx.solved();
              } else {
                backToTray(tok);
                slot.textContent = '';
                slot.classList.remove('filled');
                ctx.wrong('The cell in row ' + (i + 1) + ', column ' + (j + 1) + ' is ' + expr + ', which is not ' + v + '.');
              }
            },
            onMiss: function (tok) { backToTray(tok); }
          });
        }
      },
      // 12 -----------------------------------------------------------
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>The entry of \\(AB\\) in row \\(i\\), column \\(j\\) is row \\(i\\) of \\(A\\) times column \\(j\\) of \\(B\\): \\((AB)_{ij} = \\sum_k A_{ik}B_{kj}\\).</li>' +
          '<li>The product of an \\(m \\times n\\) matrix and a \\(p \\times q\\) matrix is defined only when \\(n = p\\), and it then has shape \\(m \\times q\\).</li>' +
          '<li>\\(AB\\) is the linear map that applies \\(B\\) first and \\(A\\) second, so \\((AB)x = A(Bx)\\). In general \\(AB \\neq BA\\).</li>' +
          '</ul>' +
          '<p>The next session asks how much a matrix stretches area and when its effect can be undone, which leads to the determinant and the inverse.</p>'
      }
    ]
  });
})();
