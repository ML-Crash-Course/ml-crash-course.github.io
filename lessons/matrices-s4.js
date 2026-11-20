(function () {
  'use strict';
  var M4 = window.M4;
  if (!M4 || !M4.lesson) { return; }
  var C = M4.colors || {};
  var PURPLE = C.purple || '#7a5cff', ORANGE = C.orange || '#ff8a1f', PINK = C.pink || '#ef4b8b',
      GREEN = C.green || '#16b56b', MUTED = C.muted || '#6b6f76', INK = C.ink || '#1d1d1f';

  function injectStyle() {
    if (document.getElementById('matrices-s4-style')) { return; }
    var s = document.createElement('style');
    s.id = 'matrices-s4-style';
    s.textContent =
      '.matrices-s4-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%}' +
      '.matrices-s4-wrap svg{max-width:100%;height:auto;touch-action:none}' +
      '.matrices-s4-mat{display:inline-grid;grid-template-columns:auto auto;gap:4px 18px;padding:6px 14px;' +
      'border-left:3px solid #1d1d1f;border-right:3px solid #1d1d1f;border-radius:9px;font-size:22px;font-weight:700;' +
      'font-variant-numeric:tabular-nums;text-align:center;line-height:1.3}' +
      '.matrices-s4-slotgrid{display:inline-grid;grid-template-columns:auto auto;gap:10px 14px;padding:10px 14px;' +
      'border-left:3px solid #1d1d1f;border-right:3px solid #1d1d1f;border-radius:10px}' +
      '.matrices-s4-slot{width:68px;height:56px;display:flex;align-items:center;justify-content:center;' +
      'font-size:22px;font-weight:700;cursor:pointer;box-sizing:border-box}' +
      '.matrices-s4-slot.matrices-s4-bad{border-color:#f0473e;color:#f0473e}' +
      '.matrices-s4-slot.matrices-s4-good{border-color:#16b56b;color:#16b56b;border-style:solid}' +
      '.matrices-s4-token{min-width:56px;height:52px;display:inline-flex;align-items:center;justify-content:center;' +
      'font-size:22px;font-weight:700;padding:0 10px;box-sizing:border-box;touch-action:none;user-select:none}' +
      '.matrices-s4-token.matrices-s4-sel{border-color:#7a5cff;box-shadow:0 0 0 3px rgba(122,92,255,0.25)}' +
      '.matrices-s4-big{font-size:22px;font-weight:700}';
    document.head.appendChild(s);
  }

  function fmt(v) {
    var r = Math.round(v * 100) / 100;
    if (Object.is(r, -0)) { r = 0; }
    var s = String(Math.abs(r));
    return (r < 0 ? '\u2212' : '') + s;
  }
  function par(v) { return v < 0 ? '(' + fmt(v) + ')' : fmt(v); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function det2(a, b) { return a[0] * b[1] - b[0] * a[1]; }

  function matBox(parent) {
    var m = M4.el('div', { class: 'matrices-s4-mat' }, parent);
    var cells = [];
    for (var i = 0; i < 4; i++) {
      cells.push(M4.el('span', { style: 'color:' + (i % 2 === 0 ? PURPLE : ORANGE), text: '0' }, m));
    }
    return {
      el: m,
      set: function (a, b) {
        cells[0].textContent = fmt(a[0]); cells[1].textContent = fmt(b[0]);
        cells[2].textContent = fmt(a[1]); cells[3].textContent = fmt(b[1]);
      }
    };
  }

  function labelPos(v, off) {
    var n = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    if (n < 1e-6) { return [off, off]; }
    return [v[0] + v[0] / n * off, v[1] + v[1] / n * off];
  }

  // Shared widget: the two columns of a matrix, the image of the unit square, live readouts.
  function colsWidget(el, o) {
    injectStyle();
    var wrap = M4.el('div', { class: 'matrices-s4-wrap' }, el);
    var p = M4.plane(wrap, {
      xmin: o.xmin, xmax: o.xmax, ymin: o.ymin, ymax: o.ymax,
      width: o.width || 480, height: o.height || 480
    });
    var a = o.a.slice(), b = o.b.slice();
    var off = (o.xmax - o.xmin) * 0.055;
    function pts() { return [[0, 0], a.slice(), [a[0] + b[0], a[1] + b[1]], b.slice()]; }
    p.path([[0, 0], [1, 0], [1, 1], [0, 1]], { stroke: MUTED, width: 2, fill: 'rgba(107,111,118,0.16)', closed: true });
    var para = p.path(pts(), { stroke: PURPLE, width: 3, fill: PURPLE, closed: true });
    para.el.setAttribute('fill-opacity', '0.2');
    para.el.setAttribute('stroke-linejoin', 'round');
    var arA = p.arrow(0, 0, a[0], a[1], { stroke: PURPLE, width: 5 });
    var arB = p.arrow(0, 0, b[0], b[1], { stroke: ORANGE, width: 5 });
    var la = labelPos(a, off), lb = labelPos(b, off);
    var tA = p.text(la[0], la[1], o.labelA || 'col 1', { fill: PURPLE, size: 16, weight: 700 });
    var tB = p.text(lb[0], lb[1], o.labelB || 'col 2', { fill: ORANGE, size: 16, weight: 700 });

    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var mb = matBox(row);
    var rDet = M4.el('span', { class: 'm4-readout' }, row);
    var rArea = M4.el('span', { class: 'm4-readout' }, row);
    var rOri = M4.el('span', { class: 'm4-readout' }, row);
    var rFormula = o.formula ? M4.el('div', { class: 'm4-note' }, wrap) : null;

    function update() {
      var d = det2(a, b);
      para.set(pts());
      if (!api.locked) { para.el.setAttribute('fill', d < 0 ? PINK : PURPLE); para.el.setAttribute('stroke', d < 0 ? PINK : PURPLE); }
      arA.set(0, 0, a[0], a[1]); arB.set(0, 0, b[0], b[1]);
      var q = labelPos(a, off); tA.set(q[0], q[1], o.labelA || 'col 1');
      q = labelPos(b, off); tB.set(q[0], q[1], o.labelB || 'col 2');
      mb.set(a, b);
      rDet.textContent = 'det = ' + fmt(d);
      rArea.textContent = 'area = ' + fmt(Math.abs(d));
      var r = Math.round(d * 100) / 100;
      rOri.textContent = r > 0 ? 'orientation kept' : (r < 0 ? 'orientation flipped' : 'squashed to a line');
      rOri.style.color = r > 0 ? PURPLE : (r < 0 ? PINK : MUTED);
      if (rFormula) {
        rFormula.textContent = 'ad \u2212 bc = ' + par(a[0]) + ' \u00b7 ' + par(b[1]) + ' \u2212 ' + par(b[0]) + ' \u00b7 ' + par(a[1]) + ' = ' + fmt(d);
      }
      if (o.onChange) { o.onChange(a, b, d); }
    }
    var lim = o.lim || [o.xmin + 0.5, o.xmax - 0.5, o.ymin + 0.5, o.ymax - 0.5];
    function mk(v, color) {
      var h = p.handle(v[0], v[1], {
        color: color, snap: o.snap || 0,
        onDrag: function (x, y) {
          if (api.locked) { if (h && h.set) { h.set(v[0], v[1]); } return; }
          var cx = clamp(x, lim[0], lim[1]), cy = clamp(y, lim[2], lim[3]);
          if ((cx !== x || cy !== y) && h && h.set) { h.set(cx, cy); }
          v[0] = cx; v[1] = cy; update();
        },
        onEnd: function () { if (o.onEnd) { o.onEnd(a, b, det2(a, b)); } }
      });
      return h;
    }
    var api = {
      p: p, para: para, locked: false,
      set: function (na, nb) { a[0] = na[0]; a[1] = na[1]; b[0] = nb[0]; b[1] = nb[1]; update(); },
      get: function () { return { a: a, b: b, det: det2(a, b) }; }
    };
    if (o.dragA) { mk(a, PURPLE); }
    if (o.dragB) { mk(b, ORANGE); }
    update();
    return api;
  }

  M4.lesson({
    id: 'matrices-s4',
    module: 'matrices',
    title: 'Determinant and inverse',
    summary: 'The determinant measures how a matrix scales area and whether it flips orientation. A matrix can be undone exactly when its determinant is not zero.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'A single number for a map',
        html: '<p>A \\(2 \\times 2\\) matrix \\(A\\) moves every point of the plane, and its columns are the places where the basis vectors \\((1,0)\\) and \\((0,1)\\) land. The <b>determinant</b> \\(\\det A\\) is a single number that records how much the map scales areas and whether it flips the plane over.</p>' +
          '<p>In this lesson you will read the determinant from a picture, compute it from the entries, recognise when a map cannot be undone, and build the <b>inverse</b> matrix \\(A^{-1}\\) that undoes it.</p>'
      },
      {
        kind: 'explore',
        title: 'Area of the transformed unit square',
        html: '<p>The grey square is the unit square, with area 1. The matrix sends it to the coloured parallelogram spanned by the two columns. Drag the tips of the columns and observe the values below. The area of the parallelogram is the absolute value of the determinant.</p>' +
          '<p>Because every grid cell is transformed in the same way, <em>every</em> region of the plane has its area multiplied by this same factor.</p>',
        mount: function (el, ctx) {
          colsWidget(el, {
            xmin: -4, xmax: 4, ymin: -4, ymax: 4, a: [2, 1], b: [-1, 2],
            dragA: true, dragB: true, snap: 0.5, formula: true
          });
          ctx.note('Try moving the orange column across the purple one. The sign of the determinant changes.');
        }
      },
      {
        kind: 'exercise',
        title: 'An area of 6',
        html: '<p>The first column is fixed at \\((2, 0)\\). Drag the tip of the second column so that the map scales areas by a factor of exactly \\(6\\) while keeping the orientation, that is, \\(\\det A = 6\\).</p>',
        hint: 'A parallelogram has area base times height. The base has length 2, so the tip of the second column must be at height 3. Its sideways position does not matter.',
        mount: function (el, ctx) {
          var done = false;
          var w = colsWidget(el, {
            xmin: -3, xmax: 5, ymin: -3, ymax: 5, a: [2, 0], b: [1, 1],
            dragB: true, snap: 0.5, lim: [-2.5, 2.5, -2.5, 4.5],
            onEnd: function (a, b, d) {
              if (done) { return; }
              if (Math.abs(d - 6) < 0.01) {
                done = true; w.locked = true;
                w.para.el.setAttribute('stroke', GREEN);
                w.para.el.setAttribute('fill', GREEN);
                ctx.note('Base \\(2\\) times height \\(3\\) gives area \\(6\\). Sliding the tip sideways is a shear and leaves the area unchanged.');
                ctx.solved();
              } else if (Math.abs(d + 6) < 0.01) {
                ctx.note('The area is 6, but the orientation is flipped: the determinant is \\(-6\\). Move the tip above the first column.');
              } else {
                ctx.note('The area is currently ' + fmt(Math.abs(d)) + '. Only the height of the tip above the first column changes it.');
              }
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'The formula',
        html: '<p>For a matrix with entries \\(a, b\\) in the first row and \\(c, d\\) in the second row, the determinant is \\[ \\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc. \\] It is the product along the main diagonal minus the product along the other diagonal.</p>' +
          '<p>Compute the determinant of \\( \\begin{pmatrix} 3 & 1 \\\\ 2 & 4 \\end{pmatrix} \\).</p>',
        hint: 'Here a = 3, b = 1, c = 2, d = 4. Compute 3 times 4, then subtract 1 times 2.',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: 'matrices-s4-wrap' }, el);
          M4.numberInput(wrap, {
            answer: 10, tolerance: 0.001, placeholder: 'det', label: 'det A =',
            onCorrect: function () {
              ctx.note('\\(3 \\cdot 4 - 1 \\cdot 2 = 10\\): this map makes every area ten times larger.');
              ctx.solved();
            },
            onWrong: function (v) {
              var x = Number(v);
              if (x === 14) { ctx.wrong('The two diagonal products are subtracted, not added.'); }
              else if (x === -10) { ctx.wrong('The order matters: main diagonal first, ad minus bc.'); }
              else if (x === 2 || x === -2) { ctx.wrong('Multiply along the diagonals: 3 with 4, and 1 with 2.'); }
              else { ctx.wrong('Compute ad minus bc with a = 3, b = 1, c = 2, d = 4.'); }
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Orientation',
        html: '<p>The letter F is drawn inside the unit square and transformed with it. The slider rotates the second column around the origin. While the second column lies anticlockwise from the first, the determinant is positive and the F remains readable. Once it crosses to the other side, the determinant is negative and the F appears mirrored.</p>' +
          '<p>At the crossing itself the two columns lie on one line, the F is flattened, and the determinant is \\(0\\).</p>',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: 'matrices-s4-wrap' }, el);
          var p = M4.plane(wrap, { xmin: -3.5, xmax: 3.5, ymin: -3.5, ymax: 3.5, width: 480, height: 480 });
          var L = 2, a = [L, 0], b = [0, L];
          var F = [[0.2, 0.1], [0.4, 0.1], [0.4, 0.45], [0.7, 0.45], [0.7, 0.6], [0.4, 0.6], [0.4, 0.75], [0.8, 0.75], [0.8, 0.9], [0.2, 0.9]];
          function map(pt) { return [pt[0] * a[0] + pt[1] * b[0], pt[0] * a[1] + pt[1] * b[1]]; }
          function sq() { return [[0, 0], a, [a[0] + b[0], a[1] + b[1]], b]; }
          var para = p.path(sq(), { stroke: PURPLE, width: 3, fill: PURPLE, closed: true });
          para.el.setAttribute('fill-opacity', '0.15');
          var f = p.path(F.map(map), { stroke: INK, width: 2, fill: PURPLE, closed: true });
          f.el.setAttribute('stroke-linejoin', 'round');
          var arA = p.arrow(0, 0, a[0], a[1], { stroke: PURPLE, width: 5 });
          var arB = p.arrow(0, 0, b[0], b[1], { stroke: ORANGE, width: 5 });
          var row = M4.el('div', { class: 'm4-row' }, wrap);
          var rDet = M4.el('span', { class: 'm4-readout' }, row);
          var rOri = M4.el('span', { class: 'm4-readout' }, row);
          var raf = 0;
          function update(deg) {
            var t = deg * Math.PI / 180;
            b = [L * Math.cos(t), L * Math.sin(t)];
            var d = det2(a, b), r = Math.round(d * 100) / 100;
            var col = r < 0 ? PINK : PURPLE;
            para.set(sq()); f.set(F.map(map));
            para.el.setAttribute('fill', col); para.el.setAttribute('stroke', col); f.el.setAttribute('fill', col);
            arB.set(0, 0, b[0], b[1]);
            rDet.textContent = 'det = ' + fmt(d);
            rOri.textContent = r > 0 ? 'orientation kept' : (r < 0 ? 'orientation flipped (mirrored)' : 'squashed to a line');
            rOri.style.color = r === 0 ? MUTED : col;
          }
          var sl = M4.slider(wrap, {
            min: -170, max: 170, step: 1, value: 90, label: 'angle of second column',
            format: function (v) { return Math.round(v) + '\u00b0'; },
            onInput: function (v) { cancelAnimationFrame(raf); raf = 0; update(Number(v)); }
          });
          M4.button(wrap, 'Sweep across', function () {
            cancelAnimationFrame(raf);
            var t0 = null;
            function tick(ts) {
              if (t0 === null) { t0 = ts; }
              var u = Math.min(1, (ts - t0) / 5000);
              var e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
              var deg = Math.round(150 - 300 * e);
              sl.set(deg); update(deg);
              if (u < 1) { raf = requestAnimationFrame(tick); } else { raf = 0; }
            }
            raf = requestAnimationFrame(tick);
          });
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
          update(90);
        }
      },
      {
        kind: 'exercise',
        title: 'Determinant zero',
        html: '<p>The matrix is \\( A = \\begin{pmatrix} 2 & k \\\\ 1 & 1.5 \\end{pmatrix} \\), where \\(k\\) is a number set by the slider. Choose \\(k\\) so that the two columns lie on the same line through the origin. The parallelogram then has area \\(0\\) and the whole plane is squashed onto that line. Press Check when the area has vanished.</p>',
        hint: 'The determinant is 2 times 1.5 minus k times 1, that is 3 minus k. It is zero when the second column is a multiple of the first column (2, 1).',
        mount: function (el, ctx) {
          var done = false, k = 0;
          var w = colsWidget(el, {
            xmin: -2, xmax: 7, ymin: -2, ymax: 4, width: 540, height: 360, a: [2, 1], b: [0, 1.5]
          });
          var wrap = M4.el('div', { class: 'matrices-s4-wrap', style: 'margin-top:14px' }, el);
          M4.slider(wrap, {
            min: -1, max: 4, step: 0.25, value: 0, label: 'k',
            format: function (v) { return fmt(Number(v)); },
            onInput: function (v) { if (done) { return; } k = Number(v); w.set([2, 1], [k, 1.5]); }
          });
          M4.button(wrap, 'Check', function () {
            if (done) { return; }
            var d = 3 - k;
            if (Math.abs(d) < 1e-9) {
              done = true; w.locked = true;
              w.para.el.setAttribute('stroke', GREEN);
              ctx.note('With \\(k = 3\\) the second column is \\((3, 1.5) = 1.5 \\cdot (2, 1)\\), so \\(\\det A = 3 - 3 = 0\\). Every point lands on one line.');
              ctx.solved();
            } else {
              ctx.wrong('The area is still ' + fmt(Math.abs(d)) + '. The columns do not yet point along the same line.');
            }
          }, { primary: true });
        }
      },
      {
        kind: 'text',
        title: 'The inverse',
        html: '<p>The <b>inverse</b> of \\(A\\) is the matrix \\(A^{-1}\\) that sends every output back to its input: \\(A^{-1}(A\\mathbf{x}) = \\mathbf{x}\\) for every vector \\(\\mathbf{x}\\). When \\(\\det A \\neq 0\\) it is given by \\[ A^{-1} = \\frac{1}{ad - bc} \\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}. \\] The diagonal entries swap places, the other two entries change sign, and everything is divided by the determinant.</p>' +
          '<p>When \\(\\det A = 0\\) the plane has been squashed onto a line, so many different inputs share the same output and no map can tell them apart again. The formula reflects this: it would require division by zero. Such a matrix is called <b>singular</b>.</p>'
      },
      {
        kind: 'exercise',
        title: 'Inverse practice',
        html: '<p>Let \\( A = \\begin{pmatrix} 4 & 2 \\\\ 1 & 1 \\end{pmatrix} \\). Its determinant is \\(4 \\cdot 1 - 2 \\cdot 1 = 2\\), so the factor in front of the inverse is \\(\\tfrac{1}{2}\\). Drag number tiles into the four slots to complete the matrix that follows this factor, then press Check. A tile can be used more than once. Tapping a filled slot empties it.</p>',
        hint: 'Start from the entries a = 4, b = 2, c = 1, d = 1. Swap a and d on the diagonal, and put a minus sign in front of b and c without moving them.',
        mount: function (el, ctx) {
          injectStyle();
          var done = false, selected = null;
          var answer = [1, -2, -1, 4];
          var wrap = M4.el('div', { class: 'matrices-s4-wrap' }, el);
          var row = M4.el('div', { class: 'm4-row' }, wrap);
          M4.el('span', { class: 'matrices-s4-big', html: M4.tex('A^{-1} = \\tfrac{1}{2}') }, row);
          var grid = M4.el('div', { class: 'matrices-s4-slotgrid' }, row);
          var slots = [], vals = [null, null, null, null];
          function place(i, v) {
            vals[i] = v;
            slots[i].textContent = v === null ? '' : fmt(v);
            slots[i].classList.toggle('filled', v !== null);
            slots[i].classList.remove('matrices-s4-bad');
          }
          function mkSlot(i) {
            var s = M4.el('div', { class: 'm4-slot matrices-s4-slot' }, grid);
            s.addEventListener('click', function () {
              if (done) { return; }
              if (selected) { place(i, Number(selected.getAttribute('data-v'))); }
              else { place(i, null); }
            });
            slots.push(s);
          }
          for (var i = 0; i < 4; i++) { mkSlot(i); }
          var pal = M4.el('div', { class: 'm4-row' }, wrap);
          var tokens = [];
          [-4, -2, -1, 1, 2, 4].forEach(function (v) {
            var t = M4.el('div', { class: 'm4-token matrices-s4-token', text: fmt(v) }, pal);
            t.setAttribute('data-v', String(v));
            t.addEventListener('click', function () {
              var was = selected === t;
              tokens.forEach(function (x) { x.classList.remove('matrices-s4-sel'); });
              selected = was ? null : t;
              if (selected) { t.classList.add('matrices-s4-sel'); }
            });
            tokens.push(t);
          });
          M4.el('div', { class: 'm4-note', text: 'Drag a tile onto a slot, or tap a tile and then a slot.' }, wrap);
          M4.dragDrop({
            tokens: tokens, slots: slots,
            onDrop: function (tok, slot) {
              if (done) { return; }
              var i = slots.indexOf(slot);
              if (i >= 0) { place(i, Number(tok.getAttribute('data-v'))); }
              // keep the palette intact if the framework moved the tile
              if (tok.parentNode !== pal) { pal.appendChild(tok); }
              tok.style.transform = ''; tok.style.visibility = ''; tok.style.display = '';
            },
            onMiss: function () {}
          });
          M4.button(wrap, 'Check', function () {
            if (done) { return; }
            if (vals.indexOf(null) >= 0) { ctx.wrong('Fill all four slots first.'); return; }
            var bad = [];
            for (var j = 0; j < 4; j++) { if (vals[j] !== answer[j]) { bad.push(j); } }
            if (!bad.length) {
              done = true;
              slots.forEach(function (s) { s.classList.add('matrices-s4-good'); s.classList.add('m4-pop'); });
              ctx.note('\\( A^{-1} = \\tfrac{1}{2}\\begin{pmatrix} 1 & -2 \\\\ -1 & 4 \\end{pmatrix} = \\begin{pmatrix} 0.5 & -1 \\\\ -0.5 & 2 \\end{pmatrix} \\), and indeed \\(A^{-1}A\\) is the identity matrix.');
              ctx.solved();
              return;
            }
            bad.forEach(function (j) { slots[j].classList.add('matrices-s4-bad'); });
            var diagBad = bad.indexOf(0) >= 0 || bad.indexOf(3) >= 0;
            var offBad = bad.indexOf(1) >= 0 || bad.indexOf(2) >= 0;
            var msg = '';
            if (diagBad) { msg += 'On the diagonal, the entries 4 and 1 swap places. '; }
            if (offBad) { msg += 'Off the diagonal, the entries 2 and 1 stay where they are and change sign.'; }
            ctx.wrong(msg);
          }, { primary: true });
        }
      },
      {
        kind: 'exercise',
        title: 'Input from output',
        html: '<p>Let \\( A = \\begin{pmatrix} 2 & 1 \\\\ 1 & 1 \\end{pmatrix} \\). The purple arrow is an input vector \\(\\mathbf{x}\\) and the orange arrow is its output \\(A\\mathbf{x}\\). Drag the tip of \\(\\mathbf{x}\\) until the output lands on the target \\(\\mathbf{b} = (4, 3)\\), marked by the ring.</p>' +
          '<p>The vector found this way is \\(A^{-1}\\mathbf{b}\\): applying the inverse to an output returns the input that produced it.</p>',
        hint: 'Here det A = 2 - 1 = 1, so the inverse has rows (1, -1) and (-1, 2). Apply it to (4, 3): the first entry is 4 - 3, the second is -4 + 6.',
        mount: function (el, ctx) {
          injectStyle();
          var done = false;
          var wrap = M4.el('div', { class: 'matrices-s4-wrap' }, el);
          var p = M4.plane(wrap, { xmin: -1, xmax: 8, ymin: -1, ymax: 6, width: 540, height: 420 });
          var x = [2, 0];
          function out() { return [2 * x[0] + x[1], x[0] + x[1]]; }
          var ring = M4.svg('circle', { cx: p.x(4), cy: p.y(3), r: 16, fill: 'none', stroke: ORANGE, 'stroke-width': 3, 'stroke-dasharray': '6 5', opacity: 0.8 }, p.g);
          p.text(4, 3.55, 'b', { fill: ORANGE, size: 18, weight: 700 });
          var o = out();
          var arO = p.arrow(0, 0, o[0], o[1], { stroke: ORANGE, width: 5 });
          var arX = p.arrow(0, 0, x[0], x[1], { stroke: PURPLE, width: 5 });
          var tO = p.text(o[0] + 0.45, o[1] - 0.35, 'Ax', { fill: ORANGE, size: 17, weight: 700 });
          var row = M4.el('div', { class: 'm4-row' }, wrap);
          var rX = M4.el('span', { class: 'm4-readout', style: 'color:' + PURPLE }, row);
          var rO = M4.el('span', { class: 'm4-readout', style: 'color:' + ORANGE }, row);
          var rB = M4.el('span', { class: 'm4-readout', text: 'target b = (4, 3)' }, row);
          function update() {
            var q = out();
            arX.set(0, 0, x[0], x[1]); arO.set(0, 0, q[0], q[1]);
            tO.set(q[0] + 0.45, q[1] - 0.35, 'Ax');
            rX.textContent = 'x = (' + fmt(x[0]) + ', ' + fmt(x[1]) + ')';
            rO.textContent = 'Ax = (' + fmt(q[0]) + ', ' + fmt(q[1]) + ')';
          }
          var h = p.handle(x[0], x[1], {
            color: PURPLE, snap: 0.5,
            onDrag: function (hx, hy) {
              if (done) { if (h && h.set) { h.set(x[0], x[1]); } return; }
              var cx = clamp(hx, 0, 2.5), cy = clamp(hy, 0, 2.5);
              if ((cx !== hx || cy !== hy) && h && h.set) { h.set(cx, cy); }
              x = [cx, cy]; update();
            },
            onEnd: function () {
              if (done) { return; }
              var q = out();
              if (Math.abs(q[0] - 4) < 0.01 && Math.abs(q[1] - 3) < 0.01) {
                done = true;
                ring.setAttribute('fill', ORANGE); ring.setAttribute('fill-opacity', '0.3');
                ring.setAttribute('stroke-dasharray', '');
                rB.style.color = GREEN;
                ctx.note('\\( \\mathbf{x} = A^{-1}\\mathbf{b} = \\begin{pmatrix} 1 & -1 \\\\ -1 & 2 \\end{pmatrix}\\begin{pmatrix} 4 \\\\ 3 \\end{pmatrix} = \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} \\).');
                ctx.solved();
              } else {
                var dx = 4 - q[0], dy = 3 - q[1];
                ctx.note('The output misses the target by (' + fmt(dx) + ', ' + fmt(dy) + '). Moving the input one unit to the right moves the output by the first column, (2, 1). One unit up moves it by the second column, (1, 1).');
              }
            }
          });
          update();
        }
      },
      {
        kind: 'exercise',
        title: 'Determinants in machine learning',
        html: '<p>A linear layer of a neural network computes \\(\\mathbf{y} = W\\mathbf{x}\\) with a weight matrix \\(W\\). Models called normalizing flows require every layer to be invertible and use \\(\\log\\lvert\\det W\\rvert\\) to track how the layer stretches volume. Linear regression can be solved in closed form only when a certain matrix built from the data is invertible.</p>' +
          '<p>Consider a layer with \\( W = \\begin{pmatrix} 1 & 2 \\\\ 2 & 4 \\end{pmatrix} \\). Can the input \\(\\mathbf{x}\\) always be recovered from the output \\(\\mathbf{y}\\)?</p>',
        hint: 'Compute the determinant: 1 times 4 minus 2 times 2. Compare the two columns of W.',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: [
              'Yes, by applying \\(W^{-1}\\), which exists for every square matrix.',
              'No. \\(\\det W = 0\\), so the layer squashes the plane onto a line and different inputs give the same output.',
              'Yes, because \\(W\\) is symmetric.',
              'No, because the entries of \\(W\\) are all positive.'
            ],
            correct: 1,
            onCorrect: function () {
              ctx.note('\\(\\det W = 1 \\cdot 4 - 2 \\cdot 2 = 0\\). For example \\((2, 0)\\) and \\((0, 1)\\) are both sent to \\((2, 4)\\), so the information about which one was the input is lost.');
              ctx.solved();
            },
            onWrong: function (i) {
              if (i === 0) { ctx.wrong('Not every square matrix has an inverse. Compute the determinant of W first.'); }
              else if (i === 2) { ctx.wrong('Symmetry does not guarantee an inverse. Check whether the columns lie on one line.'); }
              else { ctx.wrong('The conclusion is right but the reason is not: the sign of the entries is irrelevant. Compute ad minus bc.'); }
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Area and orientation together',
        html: '<p>The first column is fixed at \\((1, 2)\\). Place the second column so that the map multiplies areas by \\(3\\) <em>and</em> flips orientation, that is, \\(\\det A = -3\\). The condition is checked when the handle is released.</p>',
        hint: 'With second column (p, q) the determinant is 1 times q minus p times 2. For a negative determinant the second column must lie clockwise from the first. For example, try points with q = 2p - 3.',
        mount: function (el, ctx) {
          var done = false;
          var w = colsWidget(el, {
            xmin: -4, xmax: 4, ymin: -4, ymax: 4, a: [1, 2], b: [-1, 1],
            dragB: true, snap: 0.5, formula: true,
            onEnd: function (a, b, d) {
              if (done) { return; }
              if (Math.abs(d + 3) < 0.01) {
                done = true; w.locked = true;
                w.para.el.setAttribute('stroke', GREEN);
                ctx.note(('\\(\\det A = 1 \\cdot ' + par(b[1]) + ' - ' + par(b[0]) + ' \\cdot 2 = -3\\): areas are tripled and the plane is mirrored.').replace(/\u2212/g, '-'));
                ctx.solved();
              } else if (Math.abs(d - 3) < 0.01) {
                ctx.note('The area factor is 3, but the orientation is kept. Move the second column to the clockwise side of the first.');
              } else if (d < 0) {
                ctx.note('The orientation is flipped, but the area factor is ' + fmt(Math.abs(d)) + ' instead of 3.');
              } else if (Math.abs(d) < 0.01) {
                ctx.note('The columns lie on one line, so the area is 0.');
              } else {
                ctx.note('The determinant is ' + fmt(d) + '. It must be negative, with absolute value 3.');
              }
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>The determinant \\(\\det A = ad - bc\\) is the factor by which the map \\(A\\) scales every area. The unit square becomes a parallelogram of area \\(\\lvert \\det A \\rvert\\).</li>' +
          '<li>The sign records orientation: positive means the plane keeps its handedness, negative means it is mirrored, and \\(0\\) means the plane is squashed onto a line (or a point).</li>' +
          '<li>A matrix has an inverse exactly when \\(\\det A \\neq 0\\). Then \\( A^{-1} = \\dfrac{1}{ad - bc} \\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix} \\) undoes the map, and \\(A^{-1}\\mathbf{b}\\) is the input that produces the output \\(\\mathbf{b}\\).</li>' +
          '</ul>'
      }
    ]
  });
})();
