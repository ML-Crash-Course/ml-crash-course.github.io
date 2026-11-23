(function () {
  'use strict';

  var C = M4.colors;
  var PINK = C.pink, BLUE = C.blue, INK = C.ink, GREEN = C.green;
  var gridId = 0;

  function injectStyle() {
    if (document.getElementById('eigen-s1-style')) return;
    var s = document.createElement('style');
    s.id = 'eigen-s1-style';
    s.textContent = [
      '.eigen-s1-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;}',
      '.eigen-s1-plane{width:100%;max-width:520px;margin:0 auto;}',
      '.eigen-s1-plane svg{width:100%;height:auto;display:block;touch-action:none;}',
      '.eigen-s1-readouts{justify-content:center;}',
      '.eigen-s1-matrow{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-size:22px;}',
      '.eigen-s1-mat{display:grid;grid-template-columns:repeat(2,76px);grid-auto-rows:64px;gap:10px;padding:10px 14px;',
      'border-left:4px solid ' + INK + ';border-right:4px solid ' + INK + ';border-radius:10px;}',
      '.eigen-s1-slot{min-width:76px;min-height:64px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;}',
      '.eigen-s1-slot.eigen-s1-bad{border-color:' + C.red + ';background:rgba(240,71,62,0.08);}',
      '.eigen-s1-slot.eigen-s1-good{border-color:' + GREEN + ';background:rgba(22,181,107,0.10);}',
      '.eigen-s1-tok{min-width:56px;height:48px;display:inline-flex;align-items:center;justify-content:center;',
      'font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;user-select:none;-webkit-user-select:none;touch-action:none;}',
      '.eigen-s1-tray{min-height:60px;justify-content:center;padding:8px;}',
      '.eigen-s1-sliders{width:100%;max-width:520px;display:flex;flex-direction:column;gap:8px;}'
    ].join('');
    document.head.appendChild(s);
  }

  function fmt(x) {
    var r = Math.round(x * 100) / 100;
    if (Math.abs(r) < 0.005) r = 0;
    var s = String(r);
    return s.replace('-', '−');
  }
  function texNum(x) {
    var r = Math.round(x * 100) / 100;
    if (Math.abs(r) < 0.005) r = 0;
    return String(r);
  }
  function texPair(a, b) { return M4.col([texNum(a), texNum(b)]); }

  function det(b1, b2) { return b1[0] * b2[1] - b1[1] * b2[0]; }
  // coordinates of v with respect to basis (b1, b2); null if not a basis
  function coords(b1, b2, v) {
    var d = det(b1, b2);
    if (Math.abs(d) < 1e-9) return null;
    return [(v[0] * b2[1] - v[1] * b2[0]) / d, (b1[0] * v[1] - b1[1] * v[0]) / d];
  }

  function makePlane(parent, R) {
    var holder = M4.el('div', { class: 'eigen-s1-plane' }, parent);
    return M4.plane(holder, { xmin: -R, xmax: R, ymin: -R, ymax: R, width: 520, height: 520 });
  }

  // skewed grid of the basis (b1, b2), drawn beneath everything else in p.g
  function makeGrid(p, R, color) {
    var id = 'eigen-s1-clip-' + (++gridId);
    var defs = M4.svg('defs', {}, p.svg);
    var cp = M4.svg('clipPath', { id: id }, defs);
    M4.svg('rect', {
      x: p.x(-R), y: p.y(R), width: p.x(R) - p.x(-R), height: p.y(-R) - p.y(R)
    }, cp);
    var path = M4.svg('path', {
      fill: 'none', stroke: color, 'stroke-width': 1.5, 'stroke-opacity': 0.38,
      'clip-path': 'url(#' + id + ')', 'pointer-events': 'none'
    });
    p.g.insertBefore(path, p.g.firstChild);
    return {
      set: function (b1, b2) {
        if (Math.abs(det(b1, b2)) < 1e-6) { path.setAttribute('d', ''); return; }
        var N = 40, L = 60, d = '', k;
        function seg(ax, ay, bx, by) {
          d += 'M' + p.x(ax).toFixed(1) + ' ' + p.y(ay).toFixed(1) +
               'L' + p.x(bx).toFixed(1) + ' ' + p.y(by).toFixed(1);
        }
        for (k = -N; k <= N; k++) {
          seg(k * b1[0] - L * b2[0], k * b1[1] - L * b2[1], k * b1[0] + L * b2[0], k * b1[1] + L * b2[1]);
          seg(k * b2[0] - L * b1[0], k * b2[1] - L * b1[1], k * b2[0] + L * b1[0], k * b2[1] + L * b1[1]);
        }
        path.setAttribute('d', d);
      }
    };
  }

  // label placed just beyond the tip of an arrow from the origin
  function tipLabel(p, str, color) {
    var t = p.text(0, 0, str, { fill: color, size: 19, weight: 700 });
    return {
      set: function (x, y) {
        var n = Math.sqrt(x * x + y * y) || 1;
        t.set(x + 0.62 * x / n, y + 0.62 * y / n - 0.12, str);
      }
    };
  }

  function readout(parent) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    return { el: r, set: function (tex) { r.innerHTML = M4.tex(tex); } };
  }

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  // A scene with a basis, a vector and its decomposition. Returns an updater.
  function basisScene(el, o) {
    var R = o.R || 6;
    var wrap = M4.el('div', { class: 'eigen-s1-wrap' }, el);
    var p = makePlane(wrap, R);
    var grid = makeGrid(p, R, PINK);
    var st = { b1: o.b1.slice(), b2: o.b2.slice(), v: o.v.slice() };
    var d1 = p.line(0, 0, 0, 0, { stroke: PINK, width: 3, dash: '7 6' });
    var d2 = p.line(0, 0, 0, 0, { stroke: BLUE, width: 3, dash: '7 6' });
    var a1 = p.arrow(0, 0, st.b1[0], st.b1[1], { stroke: PINK, width: 5 });
    var a2 = p.arrow(0, 0, st.b2[0], st.b2[1], { stroke: BLUE, width: 5 });
    var av = p.arrow(0, 0, st.v[0], st.v[1], { stroke: INK, width: 5 });
    var l1 = tipLabel(p, 'b₁', PINK);
    var l2 = tipLabel(p, 'b₂', BLUE);
    var lv = tipLabel(p, 'v', INK);
    var scene = { p: p, st: st, wrap: wrap };
    scene.redraw = function () {
      var b1 = st.b1, b2 = st.b2, v = st.v;
      grid.set(b1, b2);
      a1.set(0, 0, b1[0], b1[1]);
      a2.set(0, 0, b2[0], b2[1]);
      av.set(0, 0, v[0], v[1]);
      l1.set(b1[0], b1[1]); l2.set(b2[0], b2[1]); lv.set(v[0], v[1]);
      var c = coords(b1, b2, v);
      if (c && o.decompose !== false) {
        d1.set(0, 0, c[0] * b1[0], c[0] * b1[1]);
        d2.set(c[0] * b1[0], c[0] * b1[1], v[0], v[1]);
      } else {
        d1.set(0, 0, 0, 0); d2.set(0, 0, 0, 0);
      }
      if (o.onChange) o.onChange(c, st);
    };
    function addHandle(key, color, snap) {
      var h = p.handle(st[key][0], st[key][1], {
        color: color, r: 12, snap: snap,
        onDrag: function (x, y) {
          var lim = R - 1;
          var cx = clamp(x, -lim, lim), cy = clamp(y, -lim, lim);
          if (cx !== x || cy !== y) h.set(cx, cy);
          st[key][0] = cx; st[key][1] = cy;
          scene.redraw();
        }
      });
      return h;
    }
    scene.addHandle = addHandle;
    return scene;
  }

  M4.lesson({
    id: 'eigen-s1',
    module: 'eigen',
    title: 'Change of basis',
    summary: 'The same vector has different coordinates in different bases. The basis matrix and its inverse convert between them.',
    minutes: 10,
    steps: [
      {
        kind: 'text',
        title: 'Coordinates and bases',
        html: '<p>A vector is a geometric object: an arrow with a length and a direction. Its coordinates are a description of that arrow, and the description depends on which reference directions are used.</p>' +
          '<p>This session trains you to express a vector in a new basis, write down the basis matrix \\(B\\), and use \\(B\\) and its inverse \\(B^{-1}\\) to translate coordinates in both directions.</p>'
      },
      {
        kind: 'text',
        title: 'Coordinates as weights',
        html: '<p>A <em>basis</em> of the plane is a pair of vectors \\(\\mathbf{b}_1, \\mathbf{b}_2\\) that do not lie on one line. Every vector \\(\\mathbf{v}\\) can then be written in exactly one way as</p>' +
          '\\[ \\mathbf{v} = c_1\\,\\mathbf{b}_1 + c_2\\,\\mathbf{b}_2 . \\]' +
          '<p>The numbers \\(c_1, c_2\\) are the <em>coordinates of \\(\\mathbf{v}\\) in the basis</em> \\(B\\), written \\([\\mathbf{v}]_B = \\begin{pmatrix}c_1\\\\c_2\\end{pmatrix}\\). The familiar coordinates \\(\\begin{pmatrix}x\\\\y\\end{pmatrix}\\) are the special case in which the basis is \\(\\mathbf{e}_1 = \\begin{pmatrix}1\\\\0\\end{pmatrix}\\), \\(\\mathbf{e}_2 = \\begin{pmatrix}0\\\\1\\end{pmatrix}\\), called the standard basis.</p>'
      },
      {
        kind: 'explore',
        title: 'A movable basis',
        html: '<p>The pink grid is the coordinate grid of the basis \\(\\mathbf{b}_1, \\mathbf{b}_2\\). The dashed path shows the recipe: \\(c_1\\) steps along \\(\\mathbf{b}_1\\), then \\(c_2\\) steps along \\(\\mathbf{b}_2\\). Drag the tips of \\(\\mathbf{b}_1\\), \\(\\mathbf{b}_2\\) and \\(\\mathbf{v}\\) and compare the two coordinate pairs below the plot.</p>',
        mount: function (el, ctx) {
          injectStyle();
          var rStd, rB;
          var scene = basisScene(el, {
            b1: [2, 1], b2: [-1, 1], v: [3, 3],
            onChange: function (c, st) {
              if (!rStd) return;
              rStd.set('\\mathbf{v} = ' + texPair(st.v[0], st.v[1]));
              if (c) {
                rB.set('[\\mathbf{v}]_B = ' + texPair(c[0], c[1]));
                ctx.note('Moving \\(\\mathbf{b}_1\\) or \\(\\mathbf{b}_2\\) changes \\([\\mathbf{v}]_B\\) while the arrow \\(\\mathbf{v}\\) stays where it is.');
              } else {
                rB.set('[\\mathbf{v}]_B\\ \\text{undefined}');
                ctx.note('\\(\\mathbf{b}_1\\) and \\(\\mathbf{b}_2\\) lie on one line, so they do not form a basis.');
              }
            }
          });
          var row = M4.el('div', { class: 'm4-row eigen-s1-readouts' }, scene.wrap);
          M4.el('span', { class: 'm4-chip', text: 'standard' }, row);
          rStd = readout(row);
          M4.el('span', { class: 'm4-chip', text: 'basis B' }, row);
          rB = readout(row);
          scene.addHandle('b1', PINK, 0.5);
          scene.addHandle('b2', BLUE, 0.5);
          scene.addHandle('v', INK, 0.5);
          scene.redraw();
        }
      },
      {
        kind: 'exercise',
        title: 'From B-coordinates to standard coordinates',
        html: '<p>Let \\(\\mathbf{b}_1 = \\begin{pmatrix}2\\\\1\\end{pmatrix}\\) and \\(\\mathbf{b}_2 = \\begin{pmatrix}-1\\\\1\\end{pmatrix}\\). A vector has coordinates \\([\\mathbf{v}]_B = \\begin{pmatrix}2\\\\1\\end{pmatrix}\\) in this basis. What are its standard coordinates?</p>',
        hint: 'Follow the recipe: compute \\(2\\,\\mathbf{b}_1 + 1\\,\\mathbf{b}_2\\) entry by entry.',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['\\(\\begin{pmatrix}2\\\\1\\end{pmatrix}\\)', '\\(\\begin{pmatrix}3\\\\3\\end{pmatrix}\\)', '\\(\\begin{pmatrix}1\\\\2\\end{pmatrix}\\)', '\\(\\begin{pmatrix}4\\\\2\\end{pmatrix}\\)'],
            correct: 1,
            onCorrect: function () {
              ctx.note('\\(2\\,\\begin{pmatrix}2\\\\1\\end{pmatrix} + 1\\,\\begin{pmatrix}-1\\\\1\\end{pmatrix} = \\begin{pmatrix}4-1\\\\2+1\\end{pmatrix} = \\begin{pmatrix}3\\\\3\\end{pmatrix}\\).');
              ctx.solved();
            },
            onWrong: function (i) {
              if (i === 0) ctx.wrong('\\((2, 1)\\) are the coordinates in the basis \\(B\\), not in the standard basis.');
              else if (i === 3) ctx.wrong('That is \\(2\\,\\mathbf{b}_1\\) alone. The step along \\(\\mathbf{b}_2\\) is missing.');
              else ctx.wrong('Compute \\(2\\,\\mathbf{b}_1 + 1\\,\\mathbf{b}_2\\) entry by entry.');
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'A vector from its coordinates',
        html: '<p>The basis is again \\(\\mathbf{b}_1 = \\begin{pmatrix}2\\\\1\\end{pmatrix}\\), \\(\\mathbf{b}_2 = \\begin{pmatrix}-1\\\\1\\end{pmatrix}\\), and the pink grid is its coordinate grid. Drag the tip of \\(\\mathbf{v}\\) to the point whose coordinates in this basis are \\([\\mathbf{v}]_B = \\begin{pmatrix}-1\\\\2\\end{pmatrix}\\), then press Check.</p>',
        hint: 'Start at the origin, take one step against \\(\\mathbf{b}_1\\), then two steps along \\(\\mathbf{b}_2\\), following the pink grid lines.',
        mount: function (el, ctx) {
          injectStyle();
          var rStd, done = false;
          var scene = basisScene(el, {
            b1: [2, 1], b2: [-1, 1], v: [3, -2], decompose: false,
            onChange: function (c, st) {
              if (rStd) rStd.set('\\mathbf{v} = ' + texPair(st.v[0], st.v[1]));
            }
          });
          var ring = scene.p.point(-4, 1, { r: 16, fill: GREEN });
          ring.el.setAttribute('fill-opacity', '0');
          ring.el.setAttribute('pointer-events', 'none');
          var row = M4.el('div', { class: 'm4-row eigen-s1-readouts' }, scene.wrap);
          M4.el('span', { class: 'm4-chip', text: 'standard' }, row);
          rStd = readout(row);
          scene.addHandle('v', INK, 1);
          M4.button(row, 'Check', function () {
            if (done) return;
            var c = coords(scene.st.b1, scene.st.b2, scene.st.v);
            if (Math.abs(c[0] + 1) < 0.01 && Math.abs(c[1] - 2) < 0.01) {
              done = true;
              ring.el.setAttribute('fill-opacity', '0.3');
              ctx.note('\\(-1\\,\\begin{pmatrix}2\\\\1\\end{pmatrix} + 2\\,\\begin{pmatrix}-1\\\\1\\end{pmatrix} = \\begin{pmatrix}-4\\\\1\\end{pmatrix}\\).');
              ctx.solved();
            } else {
              ctx.wrong('This point has coordinates \\([\\mathbf{v}]_B = ' + texPair(c[0], c[1]) + '\\). The target is \\(\\begin{pmatrix}-1\\\\2\\end{pmatrix}\\).');
            }
          }, { primary: true });
          scene.redraw();
        }
      },
      {
        kind: 'text',
        title: 'The basis matrix and its inverse',
        html: '<p>Place the basis vectors side by side as the columns of a matrix \\(B = \\begin{pmatrix} \\mathbf{b}_1 &amp; \\mathbf{b}_2 \\end{pmatrix}\\). With \\(\\mathbf{c} = [\\mathbf{v}]_B\\), the recipe \\(\\mathbf{v} = c_1\\mathbf{b}_1 + c_2\\mathbf{b}_2\\) is the matrix product \\(\\mathbf{v} = B\\,\\mathbf{c}\\). The opposite translation uses the inverse matrix: \\(\\mathbf{c} = B^{-1}\\mathbf{v}\\).</p>' +
          '<p>For a \\(2 \\times 2\\) matrix the inverse has a closed form, valid whenever \\(ad - bc \\neq 0\\):</p>' +
          '\\[ B = \\begin{pmatrix} a &amp; b \\\\ c &amp; d \\end{pmatrix} \\quad\\Longrightarrow\\quad B^{-1} = \\frac{1}{ad - bc} \\begin{pmatrix} d &amp; -b \\\\ -c &amp; a \\end{pmatrix}. \\]' +
          '<p>The quantity \\(ad - bc\\) is the determinant of \\(B\\). It is zero exactly when the two columns lie on one line, in which case they are not a basis and no inverse exists.</p>'
      },
      {
        kind: 'exercise',
        title: 'Inverse of a basis matrix',
        html: '<p>For \\(\\mathbf{b}_1 = \\begin{pmatrix}2\\\\1\\end{pmatrix}\\) and \\(\\mathbf{b}_2 = \\begin{pmatrix}-1\\\\1\\end{pmatrix}\\) the basis matrix is \\(B = \\begin{pmatrix} 2 &amp; -1 \\\\ 1 &amp; 1 \\end{pmatrix}\\), with determinant \\(2 \\cdot 1 - (-1) \\cdot 1 = 3\\). Drag tiles into the four slots to complete \\(B^{-1}\\).</p>',
        hint: 'Exchange the two diagonal entries of \\(B\\), and change the sign of the two off-diagonal entries without moving them.',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: 'eigen-s1-wrap' }, el);
          var matrow = M4.el('div', { class: 'eigen-s1-matrow' }, wrap);
          M4.el('span', { html: M4.tex('B^{-1} = \\dfrac{1}{3}') }, matrow);
          var mat = M4.el('div', { class: 'eigen-s1-mat' }, matrow);
          var answer = [1, 1, -1, 2];
          var slots = [], tokens = [], i, done = false;
          for (i = 0; i < 4; i++) slots.push(M4.el('div', { class: 'm4-slot eigen-s1-slot' }, mat));
          var tray = M4.el('div', { class: 'm4-row eigen-s1-tray' }, wrap);
          var values = [2, -1, 1, 3, 1, -2];
          for (i = 0; i < values.length; i++) {
            var t = M4.el('div', { class: 'm4-token eigen-s1-tok', text: fmt(values[i]) }, tray);
            t.setAttribute('data-v', String(values[i]));
            tokens.push(t);
          }
          function refresh() {
            for (var k = 0; k < 4; k++) {
              var has = !!slots[k].querySelector('.m4-token');
              slots[k].classList.toggle('filled', has);
              slots[k].classList.remove('eigen-s1-bad');
            }
          }
          function check() {
            var vals = [], k;
            for (k = 0; k < 4; k++) {
              var tk = slots[k].querySelector('.m4-token');
              if (!tk) { ctx.note(''); return; }
              vals.push(Number(tk.getAttribute('data-v')));
            }
            var bad = [];
            for (k = 0; k < 4; k++) if (vals[k] !== answer[k]) bad.push(k);
            if (!bad.length) {
              done = true;
              for (k = 0; k < 4; k++) slots[k].classList.add('eigen-s1-good');
              mat.classList.add('m4-pop');
              ctx.note('Check: \\(B^{-1}\\begin{pmatrix}3\\\\3\\end{pmatrix} = \\tfrac{1}{3}\\begin{pmatrix}1\\cdot 3 + 1\\cdot 3\\\\ -1\\cdot 3 + 2\\cdot 3\\end{pmatrix} = \\begin{pmatrix}2\\\\1\\end{pmatrix}\\), the coordinates found earlier.');
              ctx.solved();
              return;
            }
            for (k = 0; k < bad.length; k++) slots[bad[k]].classList.add('eigen-s1-bad');
            var diagBad = bad.indexOf(0) >= 0 || bad.indexOf(3) >= 0;
            ctx.wrong(diagBad
              ? 'The diagonal entries of \\(B\\), 2 and 1, exchange places.'
              : 'The off-diagonal entries of \\(B\\), \\(-1\\) and \\(1\\), stay in place and change sign.');
          }
          M4.dragDrop({
            tokens: tokens,
            slots: slots,
            onDrop: function (tok, slot) {
              if (done) return;
              var old = slot.querySelector('.m4-token');
              if (old && old !== tok) tray.appendChild(old);
              slot.appendChild(tok);
              refresh();
              check();
            },
            onMiss: function (tok) {
              if (done) return;
              tray.appendChild(tok);
              refresh();
              ctx.note('');
            }
          });
          M4.button(wrap, 'Reset', function () {
            if (done) return;
            for (var k = 0; k < tokens.length; k++) tray.appendChild(tokens[k]);
            refresh();
            ctx.note('');
          });
        }
      },
      {
        kind: 'explore',
        title: 'Changing the grid',
        html: '<p>The slider deforms the standard grid into the grid of \\(\\mathbf{b}_1 = \\begin{pmatrix}2\\\\1\\end{pmatrix}\\), \\(\\mathbf{b}_2 = \\begin{pmatrix}-1\\\\1\\end{pmatrix}\\). The vector \\(\\mathbf{v} = \\begin{pmatrix}3\\\\3\\end{pmatrix}\\) stays fixed throughout. Only its description relative to the current grid changes, from \\(\\begin{pmatrix}3\\\\3\\end{pmatrix}\\) to \\(\\begin{pmatrix}2\\\\1\\end{pmatrix}\\).</p>',
        mount: function (el, ctx) {
          injectStyle();
          var rB, rEq, raf = 0, t = 0;
          var scene = basisScene(el, {
            b1: [1, 0], b2: [0, 1], v: [3, 3],
            onChange: function (c, st) {
              if (!rB) return;
              rB.set('[\\mathbf{v}]_B = ' + texPair(c[0], c[1]));
              rEq.set(texNum(c[0]) + '\\,\\mathbf{b}_1 + ' + texNum(c[1]) + '\\,\\mathbf{b}_2 = \\begin{pmatrix}3\\\\3\\end{pmatrix}');
            }
          });
          var row = M4.el('div', { class: 'm4-row eigen-s1-readouts' }, scene.wrap);
          rB = readout(row);
          rEq = readout(row);
          function apply(tt) {
            t = tt;
            scene.st.b1[0] = 1 + t; scene.st.b1[1] = t;
            scene.st.b2[0] = -t; scene.st.b2[1] = 1;
            scene.redraw();
          }
          var box = M4.el('div', { class: 'eigen-s1-sliders' }, scene.wrap);
          var sl = M4.slider(box, {
            min: 0, max: 1, step: 0.01, value: 0, label: 'standard → B',
            format: function (v) { return Math.round(v * 100) + '%'; },
            onInput: function (v) { cancelAnimationFrame(raf); apply(Number(v)); }
          });
          var brow = M4.el('div', { class: 'm4-row eigen-s1-readouts' }, scene.wrap);
          M4.button(brow, 'Play', function () {
            cancelAnimationFrame(raf);
            var from = t > 0.5 ? 1 : 0, to = 1 - from, start = null;
            function frame(now) {
              if (start === null) start = now;
              var u = Math.min(1, (now - start) / 1800);
              var e = u * u * (3 - 2 * u);
              var tt = from + (to - from) * e;
              sl.set(tt);
              apply(tt);
              if (u < 1) raf = requestAnimationFrame(frame);
            }
            raf = requestAnimationFrame(frame);
          }, { primary: true });
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
          apply(0);
        }
      },
      {
        kind: 'exercise',
        title: 'Coordinates in a new basis',
        html: '<p>Here \\(\\mathbf{b}_1 = \\begin{pmatrix}1\\\\2\\end{pmatrix}\\) and \\(\\mathbf{b}_2 = \\begin{pmatrix}3\\\\-1\\end{pmatrix}\\). The faint arrow is the target \\(\\mathbf{v} = \\begin{pmatrix}-1\\\\5\\end{pmatrix}\\). Adjust \\(c_1\\) and \\(c_2\\) until the chain \\(c_1\\mathbf{b}_1 + c_2\\mathbf{b}_2\\) ends at the tip of \\(\\mathbf{v}\\).</p>',
        hint: 'A negative coefficient reverses a basis vector. The target lies to the left of \\(c_1\\mathbf{b}_1\\), so \\(c_2\\) must be negative. Solving \\(c_1 + 3c_2 = -1\\) and \\(2c_1 - c_2 = 5\\) gives the exact values.',
        mount: function (el, ctx) {
          injectStyle();
          var R = 7, b1 = [1, 2], b2 = [3, -1], v = [-1, 5];
          var c1 = 1, c2 = 1, done = false;
          var wrap = M4.el('div', { class: 'eigen-s1-wrap' }, el);
          var p = makePlane(wrap, R);
          makeGrid(p, R, PINK).set(b1, b2);
          var ghost = p.arrow(0, 0, v[0], v[1], { stroke: INK, width: 5 });
          ghost.el.setAttribute('opacity', '0.22');
          var ring = p.point(v[0], v[1], { r: 15, fill: GREEN });
          ring.el.setAttribute('fill-opacity', '0');
          ring.el.setAttribute('stroke', INK);
          ring.el.setAttribute('stroke-opacity', '0.35');
          ring.el.setAttribute('stroke-width', '2');
          ring.el.setAttribute('stroke-dasharray', '5 4');
          p.text(v[0] - 0.9, v[1] + 0.55, 'v', { fill: C.muted, size: 19, weight: 700 });
          // created with their real initial geometry: a zero-length arrow has no defined head direction
          var a1 = p.arrow(0, 0, c1 * b1[0], c1 * b1[1], { stroke: PINK, width: 5 });
          var a2 = p.arrow(c1 * b1[0], c1 * b1[1], c1 * b1[0] + c2 * b2[0], c1 * b1[1] + c2 * b2[1], { stroke: BLUE, width: 5 });
          var tip = p.point(c1 * b1[0] + c2 * b2[0], c1 * b1[1] + c2 * b2[1], { r: 7, fill: INK });
          var row = M4.el('div', { class: 'm4-row eigen-s1-readouts' }, wrap);
          var rSum = readout(row);
          var rC = readout(row);
          function update() {
            var ax = c1 * b1[0], ay = c1 * b1[1];
            var sx = ax + c2 * b2[0], sy = ay + c2 * b2[1];
            a1.el.style.display = c1 === 0 ? 'none' : '';
            a2.el.style.display = c2 === 0 ? 'none' : '';
            if (c1 !== 0) a1.set(0, 0, ax, ay);
            if (c2 !== 0) a2.set(ax, ay, sx, sy);
            tip.set(sx, sy);
            rSum.set('c_1\\mathbf{b}_1 + c_2\\mathbf{b}_2 = ' + texPair(sx, sy));
            rC.set('(c_1, c_2) = ' + texPair(c1, c2));
            if (done) return;
            var dist = Math.sqrt((sx - v[0]) * (sx - v[0]) + (sy - v[1]) * (sy - v[1]));
            if (dist < 0.01) {
              done = true;
              ring.el.setAttribute('fill-opacity', '0.35');
              ring.el.setAttribute('stroke', GREEN);
              ring.el.setAttribute('stroke-opacity', '1');
              ctx.note('\\([\\mathbf{v}]_B = \\begin{pmatrix}2\\\\-1\\end{pmatrix}\\), since \\(2\\,\\begin{pmatrix}1\\\\2\\end{pmatrix} - \\begin{pmatrix}3\\\\-1\\end{pmatrix} = \\begin{pmatrix}-1\\\\5\\end{pmatrix}\\).');
              ctx.solved();
            } else {
              ctx.note('The chain ends at \\(' + texPair(sx, sy) + '\\), a distance \\(' + texNum(dist) + '\\) from the target \\(\\begin{pmatrix}-1\\\\5\\end{pmatrix}\\).');
            }
          }
          var box = M4.el('div', { class: 'eigen-s1-sliders' }, wrap);
          M4.slider(box, {
            min: -3, max: 3, step: 0.5, value: c1, label: 'c₁', format: fmt,
            onInput: function (x) { c1 = Number(x); update(); }
          });
          M4.slider(box, {
            min: -3, max: 3, step: 0.5, value: c2, label: 'c₂', format: fmt,
            onInput: function (x) { c2 = Number(x); update(); }
          });
          update();
        }
      },
      {
        kind: 'exercise',
        title: 'Orthonormal bases',
        html: '<p>Data is often easier to read in a new basis, for example one whose first direction follows the long axis of a cloud of points. Such bases are often <em>orthonormal</em>: the basis vectors have length 1 and are perpendicular. For such a matrix \\(Q\\) the inverse is the transpose, \\(Q^{-1} = Q^{\\top}\\), so each new coordinate is a dot product, \\(c_i = \\mathbf{q}_i \\cdot \\mathbf{v}\\).</p>' +
          '<p>Let \\(\\mathbf{q}_1 = \\begin{pmatrix}0.6\\\\0.8\\end{pmatrix}\\) and \\(\\mathbf{q}_2 = \\begin{pmatrix}-0.8\\\\0.6\\end{pmatrix}\\). What are the coordinates of \\(\\mathbf{v} = \\begin{pmatrix}5\\\\0\\end{pmatrix}\\) in this basis?</p>',
        hint: 'Compute the two dot products \\(\\mathbf{q}_1 \\cdot \\mathbf{v}\\) and \\(\\mathbf{q}_2 \\cdot \\mathbf{v}\\).',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['\\(\\begin{pmatrix}3\\\\4\\end{pmatrix}\\)', '\\(\\begin{pmatrix}5\\\\0\\end{pmatrix}\\)', '\\(\\begin{pmatrix}3\\\\-4\\end{pmatrix}\\)', '\\(\\begin{pmatrix}0.6\\\\-0.8\\end{pmatrix}\\)'],
            correct: 2,
            onCorrect: function () {
              ctx.note('\\(\\mathbf{q}_1 \\cdot \\mathbf{v} = 0.6 \\cdot 5 = 3\\) and \\(\\mathbf{q}_2 \\cdot \\mathbf{v} = -0.8 \\cdot 5 = -4\\). Check: \\(3\\,\\mathbf{q}_1 - 4\\,\\mathbf{q}_2 = \\begin{pmatrix}1.8 + 3.2\\\\2.4 - 2.4\\end{pmatrix} = \\begin{pmatrix}5\\\\0\\end{pmatrix}\\).');
              ctx.solved();
            },
            onWrong: function (i) {
              if (i === 0) ctx.wrong('The first entry of \\(\\mathbf{q}_2\\) is negative, so \\(\\mathbf{q}_2 \\cdot \\mathbf{v}\\) is negative.');
              else if (i === 1) ctx.wrong('Those are the standard coordinates. The new basis is rotated relative to the standard one.');
              else ctx.wrong('The dot products must be taken with \\(\\mathbf{v} = \\begin{pmatrix}5\\\\0\\end{pmatrix}\\), which scales the first entries by 5.');
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'A basis with given coordinates',
        html: '<p>The vector \\(\\mathbf{v} = \\begin{pmatrix}3\\\\3\\end{pmatrix}\\) is fixed. Drag the tips of \\(\\mathbf{b}_1\\) and \\(\\mathbf{b}_2\\) until the coordinates of \\(\\mathbf{v}\\) in the basis are \\([\\mathbf{v}]_B = \\begin{pmatrix}2\\\\-1\\end{pmatrix}\\). Several bases satisfy the condition. \\(\\mathbf{b}_1\\) and \\(\\mathbf{b}_2\\) must not lie on one line.</p>',
        hint: 'The condition is \\(2\\,\\mathbf{b}_1 - \\mathbf{b}_2 = \\begin{pmatrix}3\\\\3\\end{pmatrix}\\). Choose any \\(\\mathbf{b}_1\\) not on the line through \\(\\mathbf{v}\\), for example \\(\\begin{pmatrix}2\\\\1\\end{pmatrix}\\), and set \\(\\mathbf{b}_2 = 2\\,\\mathbf{b}_1 - \\begin{pmatrix}3\\\\3\\end{pmatrix}\\).',
        mount: function (el, ctx) {
          injectStyle();
          var rB, rT, done = false;
          var scene = basisScene(el, {
            b1: [1, 0], b2: [0, 1], v: [3, 3],
            onChange: function (c, st) {
              if (!rB) return;
              if (!c) {
                rB.set('[\\mathbf{v}]_B\\ \\text{undefined}');
                if (!done) ctx.note('\\(\\mathbf{b}_1\\) and \\(\\mathbf{b}_2\\) lie on one line, so they do not form a basis and \\(B\\) has no inverse.');
                return;
              }
              rB.set('[\\mathbf{v}]_B = ' + texPair(c[0], c[1]));
              if (done) return;
              if (Math.abs(c[0] - 2) < 0.01 && Math.abs(c[1] + 1) < 0.01) {
                done = true;
                rB.el.classList.add('m4-pop');
                ctx.note('\\(2\\,' + texPair(st.b1[0], st.b1[1]) + ' - ' + texPair(st.b2[0], st.b2[1]) + ' = \\begin{pmatrix}3\\\\3\\end{pmatrix}\\).');
                ctx.solved();
              } else {
                var sx = 2 * st.b1[0] - st.b2[0], sy = 2 * st.b1[1] - st.b2[1];
                ctx.note('With the current basis, \\(2\\,\\mathbf{b}_1 - \\mathbf{b}_2 = ' + texPair(sx, sy) + '\\). It must equal \\(\\begin{pmatrix}3\\\\3\\end{pmatrix}\\).');
              }
            }
          });
          var row = M4.el('div', { class: 'm4-row eigen-s1-readouts' }, scene.wrap);
          M4.el('span', { class: 'm4-chip', text: 'current' }, row);
          rB = readout(row);
          M4.el('span', { class: 'm4-chip', text: 'target' }, row);
          rT = readout(row);
          rT.set('[\\mathbf{v}]_B = \\begin{pmatrix}2\\\\-1\\end{pmatrix}');
          scene.addHandle('b1', PINK, 1);
          scene.addHandle('b2', BLUE, 1);
          scene.redraw();
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>A basis \\(\\mathbf{b}_1, \\mathbf{b}_2\\) assigns to each vector unique coordinates \\([\\mathbf{v}]_B = \\begin{pmatrix}c_1\\\\c_2\\end{pmatrix}\\) with \\(\\mathbf{v} = c_1\\mathbf{b}_1 + c_2\\mathbf{b}_2\\). Changing the basis changes the coordinates, not the vector.</li>' +
          '<li>With the basis vectors as columns of \\(B\\), the translations are \\(\\mathbf{v} = B\\,[\\mathbf{v}]_B\\) and \\([\\mathbf{v}]_B = B^{-1}\\mathbf{v}\\). The inverse exists exactly when the determinant of \\(B\\) is not zero.</li>' +
          '<li>For an orthonormal basis \\(Q\\) the inverse is the transpose, so coordinates are dot products. This makes changing to such a basis cheap, and it is used throughout machine learning.</li>' +
          '</ul>' +
          '<p>The next session asks which vectors keep their direction when a matrix is applied. Expressed in a basis of such vectors, the matrix takes a particularly simple form.</p>'
      }
    ]
  });
})();
