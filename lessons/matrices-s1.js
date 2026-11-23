(function () {
  'use strict';

  var C = (window.M4 && M4.colors) || {};
  var PURPLE = C.purple || '#7a5cff';
  var ORANGE = C.orange || '#ff8a1f';
  var GREEN = C.green || '#16b56b';
  var INK = C.ink || '#1d1d1f';
  var MUTED = C.muted || '#6b6f76';
  var GRID_STROKE = 'rgba(122,92,255,0.42)';
  var GRID_MAIN = 'rgba(122,92,255,0.85)';
  var FILL_SOFT = 'rgba(122,92,255,0.16)';

  var F_SHAPE = [[0, 0], [0.4, 0], [0.4, 0.8], [1, 0.8], [1, 1.2], [0.4, 1.2], [0.4, 1.6], [1.2, 1.6], [1.2, 2], [0, 2]];

  function injectCss() {
    if (document.getElementById('matrices-s1-style')) return;
    var s = document.createElement('style');
    s.id = 'matrices-s1-style';
    s.textContent = [
      '.matrices-s1-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;}',
      '.matrices-s1-plane{width:100%;max-width:480px;margin:0 auto;}',
      '.matrices-s1-plane svg{width:100%;height:auto;display:block;touch-action:none;overflow:hidden;}',
      '.matrices-s1-matrow{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;}',
      '.matrices-s1-mat{position:relative;display:inline-grid;grid-template-columns:auto auto;gap:6px 18px;padding:10px 18px;font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.3;}',
      '.matrices-s1-mat:before,.matrices-s1-mat:after{content:"";position:absolute;top:0;bottom:0;width:9px;border:3px solid ' + INK + ';}',
      '.matrices-s1-mat:before{left:0;border-right:none;border-radius:6px 0 0 6px;}',
      '.matrices-s1-mat:after{right:0;border-left:none;border-radius:0 6px 6px 0;}',
      '.matrices-s1-cell{min-width:62px;text-align:center;}',
      '.matrices-s1-c1{color:' + ORANGE + ';}',
      '.matrices-s1-c2{color:' + GREEN + ';}',
      '.matrices-s1-eq{font-size:24px;font-weight:600;}',
      '.matrices-s1-slot{width:72px;height:60px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;}',
      '.matrices-s1-slot.matrices-s1-s1{border-color:' + ORANGE + ';}',
      '.matrices-s1-slot.matrices-s1-s2{border-color:' + GREEN + ';}',
      '.matrices-s1-slot.matrices-s1-bad{background:rgba(240,71,62,0.10);}',
      '.matrices-s1-slot.matrices-s1-good{background:rgba(22,181,107,0.14);}',
      '.matrices-s1-tok{min-width:56px;height:48px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;box-sizing:border-box;touch-action:none;user-select:none;-webkit-user-select:none;}',
      '.matrices-s1-tray{min-height:60px;padding:8px;justify-content:center;}',
      '.matrices-s1-head{display:grid;grid-template-columns:72px 72px;gap:18px;font-size:15px;font-weight:700;text-align:center;}',
      '.matrices-s1-legend{display:flex;gap:18px;justify-content:center;flex-wrap:wrap;font-size:16px;font-weight:600;}',
      '.matrices-s1-dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:middle;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function fmt(n) {
    var r = Math.round(n * 100) / 100;
    if (r === 0) r = 0;
    return String(r).replace('-', '−');
  }
  function eq(u, v) {
    return Math.abs(u[0] - v[0]) < 1e-6 && Math.abs(u[1] - v[1]) < 1e-6;
  }
  function vecTex(v) {
    return M4.col([fmt(v[0]), fmt(v[1])]);
  }

  // Live 2x2 matrix display with coloured columns.
  function matrixView(parent, label) {
    var row = M4.el('div', { class: 'matrices-s1-matrow' }, parent);
    M4.el('div', { class: 'matrices-s1-eq', html: M4.tex(label || 'A =') }, row);
    var m = M4.el('div', { class: 'matrices-s1-mat' }, row);
    var cells = [
      M4.el('div', { class: 'matrices-s1-cell matrices-s1-c1' }, m),
      M4.el('div', { class: 'matrices-s1-cell matrices-s1-c2' }, m),
      M4.el('div', { class: 'matrices-s1-cell matrices-s1-c1' }, m),
      M4.el('div', { class: 'matrices-s1-cell matrices-s1-c2' }, m)
    ];
    return {
      row: row,
      el: m,
      set: function (a, b) {
        cells[0].textContent = fmt(a[0]);
        cells[1].textContent = fmt(b[0]);
        cells[2].textContent = fmt(a[1]);
        cells[3].textContent = fmt(b[1]);
      }
    };
  }

  function legend(parent) {
    var l = M4.el('div', { class: 'matrices-s1-legend' }, parent);
    var i1 = M4.el('span', {}, l);
    M4.el('span', { class: 'matrices-s1-dot', style: 'background:' + ORANGE }, i1);
    M4.el('span', { html: M4.tex('\\mathbf{a}_1') + ' = image of ' + M4.tex('\\mathbf{e}_1') }, i1);
    var i2 = M4.el('span', {}, l);
    M4.el('span', { class: 'matrices-s1-dot', style: 'background:' + GREEN }, i2);
    M4.el('span', { html: M4.tex('\\mathbf{a}_2') + ' = image of ' + M4.tex('\\mathbf{e}_2') }, i2);
    return l;
  }

  function halo(t) {
    if (t && t.el && t.el.setAttribute) {
      t.el.setAttribute('paint-order', 'stroke');
      t.el.setAttribute('stroke', '#ffffff');
      t.el.setAttribute('stroke-width', '5');
      t.el.setAttribute('stroke-linejoin', 'round');
      t.el.style.pointerEvents = 'none';
    }
  }

  // The transformed-grid widget shared by all steps.
  function gridWidget(parent, o) {
    var R = o.range || 4;
    var size = 480;
    var snap = o.snap || 0;
    var holder = M4.el('div', { class: 'matrices-s1-plane' }, parent);
    var p = M4.plane(holder, { xmin: -R, xmax: R, ymin: -R, ymax: R, width: size, height: size, grid: true, axes: true, labels: true });
    var st = { a: (o.a || [1, 0]).slice(), b: (o.b || [0, 1]).slice() };
    var N = 2 * R + 2, L = 4 * R;
    var fam1 = [], fam2 = [], i;
    for (i = -N; i <= N; i++) {
      fam1.push({ i: i, ln: p.line(0, 0, 0, 0, { stroke: i === 0 ? GRID_MAIN : GRID_STROKE, width: i === 0 ? 2.5 : 1.5 }) });
      fam2.push({ i: i, ln: p.line(0, 0, 0, 0, { stroke: i === 0 ? GRID_MAIN : GRID_STROKE, width: i === 0 ? 2.5 : 1.5 }) });
    }
    var ghostShape = null, ghostRings = [], shape = null, cell = null;
    if (o.ghostShape) {
      var ga = o.ghostShape.a, gb = o.ghostShape.b;
      ghostShape = p.path(F_SHAPE.map(function (q) {
        return [q[0] * ga[0] + q[1] * gb[0], q[0] * ga[1] + q[1] * gb[1]];
      }), { stroke: 'rgba(239,75,139,0.75)', width: 3, fill: 'rgba(239,75,139,0.10)', closed: true });
      if (ghostShape.el && ghostShape.el.setAttribute) ghostShape.el.setAttribute('stroke-dasharray', '7 6');
    }
    if (o.ghost) {
      // plain hex strokes plus opacity: arrowhead markers may be keyed by the colour string
      var gA = p.arrow(0, 0, o.ghost.a[0], o.ghost.a[1], { stroke: ORANGE, width: 4 });
      var gB = p.arrow(0, 0, o.ghost.b[0], o.ghost.b[1], { stroke: GREEN, width: 4 });
      [gA, gB].forEach(function (ar) {
        if (ar && ar.el && ar.el.setAttribute) { ar.el.setAttribute('opacity', '0.3'); ar.el.style.pointerEvents = 'none'; }
      });
      ghostRings.push(p.point(o.ghost.a[0], o.ghost.a[1], { r: 15, fill: 'rgba(255,138,31,0.20)' }));
      ghostRings.push(p.point(o.ghost.b[0], o.ghost.b[1], { r: 15, fill: 'rgba(22,181,107,0.20)' }));
    }
    if (o.shape) {
      shape = p.path(F_SHAPE, { stroke: PURPLE, width: 3, fill: 'rgba(122,92,255,0.28)', closed: true });
    } else {
      cell = p.path([[0, 0], [1, 0], [1, 1], [0, 1]], { stroke: PURPLE, width: 2, fill: FILL_SOFT, closed: true });
    }
    var arA = p.arrow(0, 0, st.a[0], st.a[1], { stroke: ORANGE, width: 5 });
    var arB = p.arrow(0, 0, st.b[0], st.b[1], { stroke: GREEN, width: 5 });
    var lbA = p.text(0, 0, 'a₁', { fill: ORANGE, size: 19, weight: 700 });
    var lbB = p.text(0, 0, 'a₂', { fill: GREEN, size: 19, weight: 700 });
    halo(lbA); halo(lbB);

    function lblPos(v, other) {
      var n = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
      var off = 0.13 * R;
      var dx, dy;
      if (n < 1e-6) { dx = -0.7; dy = -0.7; } else { dx = v[0] / n; dy = v[1] / n; }
      // push sideways, away from the other arrow, so the label clears handle and arrowhead
      var px = -dy, py = dx;
      var side = (px * (other[0] - v[0]) + py * (other[1] - v[1])) > 0 ? -1 : 1;
      var x = v[0] + off * (0.75 * dx + 0.65 * side * px);
      var y = v[1] + off * (0.75 * dy + 0.65 * side * py) - 0.03 * R;
      var m = R - 0.25;
      return [Math.max(-m, Math.min(m, x)), Math.max(-m, Math.min(m, y))];
    }

    function update() {
      var a = st.a, b = st.b, k, f;
      for (k = 0; k < fam1.length; k++) {
        f = fam1[k];
        f.ln.set(f.i * b[0] - L * a[0], f.i * b[1] - L * a[1], f.i * b[0] + L * a[0], f.i * b[1] + L * a[1]);
        f = fam2[k];
        f.ln.set(f.i * a[0] - L * b[0], f.i * a[1] - L * b[1], f.i * a[0] + L * b[0], f.i * a[1] + L * b[1]);
      }
      if (shape) {
        shape.set(F_SHAPE.map(function (q) {
          return [q[0] * a[0] + q[1] * b[0], q[0] * a[1] + q[1] * b[1]];
        }));
      }
      if (cell) cell.set([[0, 0], a, [a[0] + b[0], a[1] + b[1]], b]);
      arA.set(0, 0, a[0], a[1]);
      arB.set(0, 0, b[0], b[1]);
      var la = lblPos(a, b), lb = lblPos(b, a);
      lbA.set(la[0], la[1], 'a₁');
      lbB.set(lb[0], lb[1], 'a₂');
    }

    function clampSnap(x, y) {
      if (snap) { x = Math.round(x / snap) * snap; y = Math.round(y / snap) * snap; }
      var m = R - (snap || 0.25);
      if (snap) m = Math.floor((R - 0.01) / snap) * snap;
      x = Math.max(-m, Math.min(m, x));
      y = Math.max(-m, Math.min(m, y));
      return [x, y];
    }

    var hA = null, hB = null;
    function mkHandle(key, color) {
      var h = p.handle(st[key][0], st[key][1], {
        color: color, r: 13, snap: snap,
        onDrag: function (x, y) {
          var c = clampSnap(x, y);
          if (c[0] !== x || c[1] !== y) { try { h.set(c[0], c[1]); } catch (e) { /* ignore */ } }
          st[key] = c;
          update();
          if (o.onChange) o.onChange(st.a, st.b, 'drag');
        },
        onEnd: function (x, y) {
          var c = clampSnap(x, y);
          try { h.set(c[0], c[1]); } catch (e) { /* ignore */ }
          st[key] = c;
          update();
          if (o.onChange) o.onChange(st.a, st.b, 'end');
        }
      });
      return h;
    }
    if (o.handles) {
      hA = mkHandle('a', ORANGE);
      hB = mkHandle('b', GREEN);
    }
    update();

    return {
      p: p,
      state: st,
      set: function (a, b) {
        st.a = a.slice(); st.b = b.slice();
        if (hA) { try { hA.set(a[0], a[1]); } catch (e) { /* ignore */ } }
        if (hB) { try { hB.set(b[0], b[1]); } catch (e2) { /* ignore */ } }
        update();
      },
      celebrate: function () {
        if (ghostRings[0] && ghostRings[0].el) ghostRings[0].el.setAttribute('fill', 'rgba(255,138,31,0.55)');
        if (ghostRings[1] && ghostRings[1].el) ghostRings[1].el.setAttribute('fill', 'rgba(22,181,107,0.55)');
        if (ghostShape && ghostShape.el) {
          ghostShape.el.setAttribute('stroke', GREEN);
          ghostShape.el.removeAttribute('stroke-dasharray');
        }
        holder.classList.remove('m4-pop');
        void holder.offsetWidth;
        holder.classList.add('m4-pop');
      }
    };
  }

  function wrap(el) {
    injectCss();
    el.innerHTML = '';
    return M4.el('div', { class: 'matrices-s1-wrap' }, el);
  }

  // ---------------------------------------------------------------- steps

  var steps = [];

  steps.push({
    kind: 'text',
    title: 'Learning goals',
    html:
      '<p>A matrix can be read as an instruction for moving every point of the plane at once.</p>' +
      '<p>You will learn to read a \\(2 \\times 2\\) matrix as a picture of a deformed grid, ' +
      'and write down the matrix of a transformation from such a picture.</p>' +
      '<p>Both rest on one idea: the columns of the matrix record where the two basis vectors land.</p>'
  });

  steps.push({
    kind: 'text',
    title: 'Basis vectors and their images',
    html:
      '<p>The standard basis vectors of the plane are \\(\\mathbf{e}_1 = \\begin{pmatrix}1\\\\0\\end{pmatrix}\\), one step to the right, and \\(\\mathbf{e}_2 = \\begin{pmatrix}0\\\\1\\end{pmatrix}\\), one step up. ' +
      'A <em>linear map</em> is a transformation of the plane that keeps the origin fixed and keeps grid lines straight, parallel and evenly spaced.</p>' +
      '<p>Such a map is fully determined by two vectors: \\(\\mathbf{a}_1\\), the image of \\(\\mathbf{e}_1\\), and \\(\\mathbf{a}_2\\), the image of \\(\\mathbf{e}_2\\). ' +
      'Writing their coordinates as columns gives the matrix \\(A\\) of the map:</p>' +
      '\\[ \\mathbf{a}_1 = \\begin{pmatrix} a \\\\ c \\end{pmatrix}, \\quad \\mathbf{a}_2 = \\begin{pmatrix} b \\\\ d \\end{pmatrix} \\quad\\Longrightarrow\\quad A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}. \\]'
  });

  steps.push({
    kind: 'explore',
    title: 'Moving the basis vectors',
    html:
      '<p>The orange arrow is \\(\\mathbf{a}_1\\) and the green arrow is \\(\\mathbf{a}_2\\). Dragging their tips changes the map. The purple grid shows where the original grid lines go, and the shaded cell is the image of the unit square.</p>' +
      '<p>The first column of \\(A\\) always equals the coordinates of the orange tip, and the second column those of the green tip.</p>',
    mount: function (el, ctx) {
      var w = wrap(el);
      var mv, info;
      var g = gridWidget(w, {
        handles: true, snap: 0.5, a: [1, 0], b: [0, 1],
        onChange: function (a, b) { show(a, b); }
      });
      mv = matrixView(w);
      legend(w);
      var row = M4.el('div', { class: 'm4-row' }, w);
      info = M4.el('div', { class: 'm4-readout' }, row);
      function show(a, b) {
        mv.set(a, b);
        var cross = a[0] * b[1] - a[1] * b[0];
        if (Math.abs(cross) < 1e-9) {
          info.textContent = 'the two images are parallel: the grid collapses';
        } else if (eq(a, [1, 0]) && eq(b, [0, 1])) {
          info.textContent = 'identity: the grid is unchanged';
        } else {
          info.innerHTML = M4.tex('\\mathbf{a}_1 = ' + M4.col([fmt(a[0]), fmt(a[1])]) + ' \\qquad \\mathbf{a}_2 = ' + M4.col([fmt(b[0]), fmt(b[1])]));
        }
      }
      M4.button(row, 'Reset', function () { g.set([1, 0], [0, 1]); show([1, 0], [0, 1]); });
      show(g.state.a, g.state.b);
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'A matrix by dragging',
    html:
      '<p>Drag the two arrow tips so that the map has the matrix</p>' +
      '\\[ A = \\begin{pmatrix} 3 & -1 \\\\ 1 & 2 \\end{pmatrix}. \\]' +
      '<p>The faint rings mark the two positions that have to be found. Tips snap to whole numbers.</p>',
    hint: 'Read the matrix column by column. The first column \\(\\begin{pmatrix}3\\\\1\\end{pmatrix}\\) is where the orange tip belongs: 3 to the right and 1 up. The second column \\(\\begin{pmatrix}-1\\\\2\\end{pmatrix}\\) is where the green tip belongs.',
    mount: function (el, ctx) {
      var w = wrap(el);
      var TA = [3, 1], TB = [-1, 2], done = false, mv;
      var g = gridWidget(w, {
        handles: true, snap: 1, a: [1, 0], b: [0, 1], ghost: { a: TA, b: TB },
        onChange: function (a, b, phase) {
          mv.set(a, b);
          var okA = eq(a, TA), okB = eq(b, TB);
          if (okA && okB) {
            if (!done) { done = true; g.celebrate(); ctx.note('Both columns match: \\(\\mathbf{a}_1 = (3, 1)\\) and \\(\\mathbf{a}_2 = (-1, 2)\\).'); ctx.solved(); }
            return;
          }
          if (phase !== 'end' || done) return;
          if (eq(a, TB) && eq(b, TA)) {
            ctx.note('The two arrows are swapped. The orange tip gives the first column, the green tip the second.');
          } else if (eq(a, [3, -1]) || eq(b, [1, 2])) {
            ctx.note('That uses a row of the matrix. The coordinates of each image are read down a column.');
          } else if (okA) {
            ctx.note('The first column is correct. The green tip should be at \\(\\begin{pmatrix}-1\\\\2\\end{pmatrix}\\). It is at \\(' + vecTex(b) + '\\).');
          } else if (okB) {
            ctx.note('The second column is correct. The orange tip should be at \\(\\begin{pmatrix}3\\\\1\\end{pmatrix}\\). It is at \\(' + vecTex(a) + '\\).');
          } else {
            ctx.note('Current columns: \\(' + vecTex(a) + '\\) and \\(' + vecTex(b) + '\\). Neither matches a column of \\(A\\) yet.');
          }
        }
      });
      mv = matrixView(w, '\\text{current } A =');
      mv.set(g.state.a, g.state.b);
      legend(w);
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'Matrix from a picture',
    html:
      '<p>The picture shows the grid after a linear map. The orange arrow is \\(\\mathbf{a}_1\\), the image of \\(\\mathbf{e}_1\\), and the green arrow is \\(\\mathbf{a}_2\\), the image of \\(\\mathbf{e}_2\\).</p>' +
      '<p>Which matrix describes this map?</p>',
    hint: 'Read off the tip of the orange arrow, \\(\\begin{pmatrix}2\\\\1\\end{pmatrix}\\), and write it downwards as the first column. Do the same with the green tip for the second column.',
    mount: function (el, ctx) {
      var w = wrap(el);
      gridWidget(w, { handles: false, a: [2, 1], b: [-1, 1] });
      legend(w);
      var msgs = [
        '',
        'This matrix has the images written along the rows. Each image must be written down a column.',
        'The columns of this matrix are \\(\\begin{pmatrix}1\\\\1\\end{pmatrix}\\) and \\(\\begin{pmatrix}2\\\\-1\\end{pmatrix}\\). Neither is the tip of an arrow in the picture.',
        'The two columns are in the wrong order: the image of \\(\\mathbf{e}_1\\) comes first.'
      ];
      var box = M4.el('div', { style: 'width:100%' }, w);
      M4.choices(box, {
        options: [
          '\\(\\begin{pmatrix} 2 & -1 \\\\ 1 & 1 \\end{pmatrix}\\)',
          '\\(\\begin{pmatrix} 2 & 1 \\\\ -1 & 1 \\end{pmatrix}\\)',
          '\\(\\begin{pmatrix} 1 & 2 \\\\ 1 & -1 \\end{pmatrix}\\)',
          '\\(\\begin{pmatrix} -1 & 2 \\\\ 1 & 1 \\end{pmatrix}\\)'
        ],
        correct: 0,
        onCorrect: function () {
          ctx.note('The columns are \\(\\mathbf{a}_1 = \\begin{pmatrix}2\\\\1\\end{pmatrix}\\) and \\(\\mathbf{a}_2 = \\begin{pmatrix}-1\\\\1\\end{pmatrix}\\).');
          ctx.solved();
        },
        onWrong: function (i) { ctx.wrong(msgs[i] || 'Read each arrow tip and write it as a column.'); }
      });
    }
  });

  steps.push({
    kind: 'explore',
    title: 'Four standard transformations',
    html:
      '<p>Each button selects a matrix \\(A\\). The slider \\(t\\) blends from the identity matrix \\(I\\) at \\(t = 0\\) to \\(A\\) at \\(t = 1\\), using the matrix \\((1 - t)\\,I + t\\,A\\), so that the motion of the grid can be followed.</p>' +
      '<p>The purple letter F is carried along with the grid: every point keeps its grid coordinates while the grid itself moves.</p>',
    mount: function (el, ctx) {
      var w = wrap(el);
      var presets = [
        { name: 'Stretch', a: [2, 0], b: [0, 1], d: 'a₁ is doubled, a₂ is unchanged' },
        { name: 'Shear', a: [1, 0], b: [1, 1], d: 'a₁ stays, a₂ leans to the right' },
        { name: 'Rotate 90°', a: [0, 1], b: [-1, 0], d: 'both images turn a quarter turn anticlockwise' },
        { name: 'Reflect', a: [-1, 0], b: [0, 1], d: 'a₁ is flipped, a₂ is unchanged' }
      ];
      var cur = presets[0], t = 0, raf = 0, sl, mv, info, btns = [];
      var brow = M4.el('div', { class: 'm4-row' }, w);
      var g = gridWidget(w, { handles: false, shape: true, a: [1, 0], b: [0, 1] });
      mv = matrixView(w, '(1-t)\\,I + t\\,A =');
      function apply() {
        var a = [(1 - t) + t * cur.a[0], t * cur.a[1]];
        var b = [t * cur.b[0], (1 - t) + t * cur.b[1]];
        g.set(a, b);
        mv.set(a, b);
      }
      function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      function play() {
        stop();
        var t0 = null, dur = 1700;
        function frame(now) {
          if (t0 === null) t0 = now;
          var u = Math.min(1, (now - t0) / dur);
          t = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
          sl.set(Math.round(t * 100) / 100);
          apply();
          raf = u < 1 ? requestAnimationFrame(frame) : 0;
        }
        raf = requestAnimationFrame(frame);
      }
      function mark() {
        btns.forEach(function (b, i) {
          b.style.outline = presets[i] === cur ? '3px solid ' + PURPLE : 'none';
          b.style.outlineOffset = '2px';
        });
        info.textContent = cur.name + ': ' + cur.d;
      }
      presets.forEach(function (pr) {
        btns.push(M4.button(brow, pr.name, function () { cur = pr; mark(); play(); }));
      });
      var srow = M4.el('div', { style: 'width:100%;max-width:480px' }, w);
      sl = M4.slider(srow, {
        min: 0, max: 1, step: 0.01, value: 0, label: 't',
        format: function (v) { return Number(v).toFixed(2); },
        onInput: function (v) { stop(); t = Number(v); apply(); }
      });
      var row = M4.el('div', { class: 'm4-row' }, w);
      info = M4.el('div', { class: 'm4-readout' }, row);
      M4.button(row, 'Play', play, { primary: true });
      mark();
      apply();
      ctx.onCleanup(stop);
      play();
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'Matrix tiles',
    html:
      '<p>The picture shows a quarter turn anticlockwise. Drag number tiles into the four positions so that the matrix describes this map.</p>' +
      '<p>The left column belongs to \\(\\mathbf{a}_1\\) (orange) and the right column to \\(\\mathbf{a}_2\\) (green). One tile is not needed.</p>',
    hint: 'The orange tip is at \\(\\begin{pmatrix}0\\\\1\\end{pmatrix}\\): write 0 above 1 in the left column. The green tip is at \\(\\begin{pmatrix}-1\\\\0\\end{pmatrix}\\): write −1 above 0 in the right column.',
    mount: function (el, ctx) {
      var w = wrap(el);
      gridWidget(w, { handles: false, range: 3, a: [0, 1], b: [-1, 0] });
      var head = M4.el('div', { class: 'matrices-s1-head' }, w);
      M4.el('div', { style: 'color:' + ORANGE, text: 'a₁' }, head);
      M4.el('div', { style: 'color:' + GREEN, text: 'a₂' }, head);
      var mrow = M4.el('div', { class: 'matrices-s1-matrow' }, w);
      M4.el('div', { class: 'matrices-s1-eq', html: M4.tex('A =') }, mrow);
      var mat = M4.el('div', { class: 'matrices-s1-mat' }, mrow);
      var slots = [], k;
      for (k = 0; k < 4; k++) {
        slots.push(M4.el('div', { class: 'm4-slot matrices-s1-slot ' + (k % 2 === 0 ? 'matrices-s1-s1' : 'matrices-s1-s2') }, mat));
      }
      var tray = M4.el('div', { class: 'm4-row matrices-s1-tray' }, w);
      var vals = [1, 0, 2, -1, 0];
      var tokens = vals.map(function (v) {
        var tk = M4.el('div', { class: 'm4-token matrices-s1-tok', text: fmt(v) }, tray);
        tk.setAttribute('data-v', String(v));
        return tk;
      });
      var want = [0, -1, 1, 0], done = false;
      function tokIn(s) { return s.querySelector('.m4-token'); }
      function refresh() {
        slots.forEach(function (s) {
          s.classList.toggle('filled', !!tokIn(s));
          s.classList.remove('matrices-s1-bad');
          s.classList.remove('matrices-s1-good');
        });
      }
      function check() {
        var got = slots.map(function (s) { var tk = tokIn(s); return tk ? Number(tk.getAttribute('data-v')) : null; });
        if (got.indexOf(null) !== -1) { return; }
        var ok = got.map(function (v, i) { return v === want[i]; });
        if (ok.every(Boolean)) {
          slots.forEach(function (s) { s.classList.add('matrices-s1-good'); });
          if (!done) {
            done = true;
            mat.classList.add('m4-pop');
            ctx.note('The columns are \\(\\mathbf{a}_1 = \\begin{pmatrix}0\\\\1\\end{pmatrix}\\) and \\(\\mathbf{a}_2 = \\begin{pmatrix}-1\\\\0\\end{pmatrix}\\).');
            ctx.solved();
          }
          return;
        }
        slots.forEach(function (s, i) { if (!ok[i]) s.classList.add('matrices-s1-bad'); });
        if (got[0] === 0 && got[1] === 1 && got[2] === -1 && got[3] === 0) {
          ctx.wrong('The coordinates of each image are written down a column, not along a row.');
        } else if (got[0] === -1 && got[2] === 0 && got[1] === 0 && got[3] === 1) {
          ctx.wrong('The two columns are swapped: the image of \\(\\mathbf{e}_1\\) (orange) goes in the left column.');
        } else if (ok[0] && ok[2]) {
          ctx.wrong('The left column is correct. The right column must hold the green tip \\(\\begin{pmatrix}-1\\\\0\\end{pmatrix}\\), read from top to bottom.');
        } else if (ok[1] && ok[3]) {
          ctx.wrong('The right column is correct. The left column must hold the orange tip \\(\\begin{pmatrix}0\\\\1\\end{pmatrix}\\), read from top to bottom.');
        } else {
          ctx.wrong('The highlighted entries do not match the picture. The orange tip is at \\(\\begin{pmatrix}0\\\\1\\end{pmatrix}\\) and the green tip at \\(\\begin{pmatrix}-1\\\\0\\end{pmatrix}\\).');
        }
      }
      M4.dragDrop({
        tokens: tokens,
        slots: slots,
        onDrop: function (tk, slot) {
          var prev = tokIn(slot);
          if (prev && prev !== tk) tray.appendChild(prev);
          if (tk.parentNode !== slot) slot.appendChild(tk);
          refresh();
          check();
        },
        onMiss: function (tk) {
          if (tk.parentNode !== tray) tray.appendChild(tk);
          refresh();
        }
      });
      M4.button(w, 'Clear', function () {
        tokens.forEach(function (tk) { tray.appendChild(tk); });
        refresh();
        ctx.note('');
      });
      refresh();
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'A half turn',
    html:
      '<p>A rotation by the angle \\(\\theta\\) sends \\(\\mathbf{e}_1\\) to \\(\\begin{pmatrix}\\cos\\theta\\\\\\sin\\theta\\end{pmatrix}\\) and \\(\\mathbf{e}_2\\) to \\(\\begin{pmatrix}-\\sin\\theta\\\\\\cos\\theta\\end{pmatrix}\\), so its matrix is</p>' +
      '\\[ R(\\theta) = \\begin{pmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{pmatrix}. \\]' +
      '<p>Move the slider until the matrix equals \\(\\begin{pmatrix} -1 & 0 \\\\ 0 & -1 \\end{pmatrix}\\).</p>',
    hint: 'The first column \\(\\begin{pmatrix}-1\\\\0\\end{pmatrix}\\) says that the orange arrow must point to the left. That is half of a full turn.',
    mount: function (el, ctx) {
      var w = wrap(el);
      var done = false, moved = false;
      var g = gridWidget(w, { handles: false, range: 2, a: [1, 0], b: [0, 1], ghost: { a: [-1, 0], b: [0, -1] } });
      var mv = matrixView(w, 'R(\\theta) =');
      function apply(deg) {
        var th = deg * Math.PI / 180;
        var a = [Math.cos(th), Math.sin(th)], b = [-Math.sin(th), Math.cos(th)];
        g.set(a, b);
        mv.set(a, b);
        if (Math.abs(deg - 180) <= 2.5) {
          if (!done) {
            done = true;
            g.celebrate();
            ctx.note('At \\(\\theta = 180^\\circ\\), \\(\\cos\\theta = -1\\) and \\(\\sin\\theta = 0\\): both basis vectors are reversed.');
            ctx.solved();
          }
        } else if (moved && !done) {
          if (Math.abs(deg - 90) <= 2.5) {
            ctx.note('At \\(90^\\circ\\) the first column is \\(\\begin{pmatrix}0\\\\1\\end{pmatrix}\\): the orange arrow points up, not left.');
          } else if (Math.abs(deg - 270) <= 2.5) {
            ctx.note('At \\(270^\\circ\\) the first column is \\(\\begin{pmatrix}0\\\\-1\\end{pmatrix}\\): the orange arrow points down, not left.');
          } else if (deg >= 357.5 || deg <= 2.5) {
            ctx.note('This is the identity matrix: nothing has moved.');
          } else {
            ctx.note('The first column is \\(' + vecTex(a) + '\\). The target first column is \\(\\begin{pmatrix}-1\\\\0\\end{pmatrix}\\).');
          }
        }
      }
      var srow = M4.el('div', { style: 'width:100%;max-width:480px' }, w);
      M4.slider(srow, {
        min: 0, max: 360, step: 5, value: 30, label: 'θ',
        format: function (v) { return Math.round(v) + '°'; },
        onInput: function (v) { moved = true; apply(Number(v)); }
      });
      apply(30);
    }
  });

  steps.push({
    kind: 'text',
    title: 'Linear maps in machine learning',
    html:
      '<p>Many data sets describe each item by a list of numbers, for example a house by its size, age and number of rooms. A matrix can turn such a list into a new list: it mixes the old numbers into new ones that are more useful for the task at hand. ' +
      'Column \\(j\\) of the matrix is the output it produces when the \\(j\\)-th input number equals 1 and every other input number equals 0.</p>' +
      '<p>The picture of a deformed grid therefore carries over to more than two dimensions: each column states where one input direction is sent. ' +
      'The vectors module described a learning system as a collection of adjustable numbers. Later in the course many of these numbers sit in matrices like this one, and learning amounts to adjusting the columns until the deformed space is useful for the task.</p>'
  });

  steps.push({
    kind: 'exercise',
    title: 'Transformed shapes',
    html:
      '<p>The dashed pink outline is the image of the letter F under an unknown linear map. No target arrows are shown this time.</p>' +
      '<p>Drag the tips of \\(\\mathbf{a}_1\\) and \\(\\mathbf{a}_2\\) until the purple F covers the outline. Tips snap to whole numbers. The resulting matrix is the matrix of the unknown map.</p>',
    hint: 'In the original F the bottom edge runs along \\(\\mathbf{e}_1\\) and the long stem runs along \\(\\mathbf{e}_2\\) for 2 units. The stem of the outline ends at \\((-2, 2)\\), which is twice \\(\\mathbf{a}_2\\). Its bottom edge points along the diagonal towards \\(\\begin{pmatrix}1\\\\1\\end{pmatrix}\\).',
    mount: function (el, ctx) {
      var w = wrap(el);
      var TA = [1, 1], TB = [-1, 1], done = false, mv;
      var g = gridWidget(w, {
        handles: true, snap: 1, shape: true, a: [1, 0], b: [0, 1], ghostShape: { a: TA, b: TB },
        onChange: function (a, b, phase) {
          mv.set(a, b);
          var okA = eq(a, TA), okB = eq(b, TB);
          if (okA && okB) {
            if (!done) {
              done = true;
              g.celebrate();
              ctx.note('The map has the matrix \\(\\begin{pmatrix} 1 & -1 \\\\ 1 & 1 \\end{pmatrix}\\): a rotation by \\(45^\\circ\\) combined with an enlargement by the factor \\(\\sqrt{2}\\).');
              ctx.solved();
            }
            return;
          }
          if (phase !== 'end' || done) return;
          if (eq(a, TB) && eq(b, TA)) {
            ctx.note('The purple F is a mirror image of the outline: the two images are swapped.');
          } else if (okA) {
            ctx.note('The bottom edge of the F is in place, so \\(\\mathbf{a}_1 = \\begin{pmatrix}1\\\\1\\end{pmatrix}\\) is correct. The stem still points the wrong way. Adjust the green tip.');
          } else if (okB) {
            ctx.note('The stem of the F is in place, so \\(\\mathbf{a}_2 = \\begin{pmatrix}-1\\\\1\\end{pmatrix}\\) is correct. The bars still point the wrong way. Adjust the orange tip.');
          } else if (a[0] * b[1] - a[1] * b[0] === 0) {
            ctx.note('The two images are parallel, so the F is flattened onto a line. The outline is not flat.');
          } else {
            ctx.note('Neither edge matches yet. Compare the direction of the stem of the purple F with the stem of the outline.');
          }
        }
      });
      mv = matrixView(w, '\\text{current } A =');
      mv.set(g.state.a, g.state.b);
      legend(w);
    }
  });

  steps.push({
    kind: 'text',
    title: 'Recap',
    html:
      '<ul>' +
      '<li>A linear map keeps the origin fixed and keeps grid lines straight, parallel and evenly spaced. It is fully determined by the images \\(\\mathbf{a}_1\\) and \\(\\mathbf{a}_2\\) of the basis vectors \\(\\mathbf{e}_1\\) and \\(\\mathbf{e}_2\\).</li>' +
      '<li>The matrix of the map has \\(\\mathbf{a}_1\\) as its first column and \\(\\mathbf{a}_2\\) as its second column, so a matrix can be read from a picture and a picture can be drawn from a matrix.</li>' +
      '<li>Stretches, shears, rotations and reflections are all of this form, and in higher dimensions the columns of a matrix play the same role.</li>' +
      '</ul>' +
      '<p>The next session uses the columns to compute where an arbitrary vector lands.</p>'
  });

  M4.lesson({
    id: 'matrices-s1',
    module: 'matrices',
    title: 'A matrix moves the grid',
    summary: 'The columns of a matrix are the images of the basis vectors. Moving these columns transforms the whole grid of the plane.',
    minutes: 10,
    steps: steps
  });
})();
