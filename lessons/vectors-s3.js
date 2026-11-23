(function () {
  'use strict';

  var C = M4.colors || {};
  var BLUE = C.blue, ORANGE = C.orange, GREEN = C.green, PURPLE = C.purple, MUTED = C.muted;

  function injectCss() {
    if (document.getElementById('vectors-s3-style')) return;
    var s = document.createElement('style');
    s.id = 'vectors-s3-style';
    s.textContent =
      '.vectors-s3-readouts{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:14px 0 6px}' +
      '.vectors-s3-val{font-weight:700;margin-left:6px}' +
      '.vectors-s3-tray{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin:18px 0;min-height:60px}' +
      '.vectors-s3-tray .m4-token,.vectors-s3-slot .m4-token{min-width:64px;padding:10px 16px;text-align:center;font-size:20px;font-weight:700}' +
      '.vectors-s3-slots{display:flex;flex-wrap:wrap;justify-content:center;gap:22px;margin:14px 0}' +
      '.vectors-s3-slotwrap{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:150px}' +
      '.vectors-s3-slotlabel{font-size:17px;text-align:center}' +
      '.vectors-s3-slot{min-width:110px;min-height:62px;display:flex;align-items:center;justify-content:center}' +
      '.vectors-s3-locked{pointer-events:none;border-color:' + GREEN + ' !important}' +
      '.vectors-s3-center{display:flex;flex-direction:column;align-items:center;gap:10px}';
    document.head.appendChild(s);
  }

  function f2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  function f1(n) { var r = Math.round(n * 10) / 10; return (r === 0 ? 0 : r).toString(); }

  // A pill with a typeset label and a live value.
  function readout(parent, texLabel, color) {
    var pill = M4.el('div', { class: 'm4-readout' }, parent);
    M4.el('span', { html: M4.tex(texLabel) }, pill);
    var val = M4.el('span', { class: 'vectors-s3-val', text: '' }, pill);
    if (color) val.style.color = color;
    return { el: pill, set: function (t) { val.textContent = t; }, tex: function (t) { val.innerHTML = M4.tex(t); } };
  }

  function circle(p, r, stroke, opts) {
    opts = opts || {};
    var c = M4.svg('circle', {
      cx: p.x(0), cy: p.y(0), r: Math.abs(p.x(r) - p.x(0)),
      fill: opts.fill || 'none', stroke: stroke, 'stroke-width': opts.width || 2.5,
      'stroke-dasharray': opts.dash || '', opacity: opts.opacity == null ? 1 : opts.opacity
    }, p.g);
    return {
      el: c,
      setR: function (rr) { c.setAttribute('r', Math.abs(p.x(rr) - p.x(0))); }
    };
  }

  function makeTokens(tray, items) {
    return items.map(function (it) {
      var t = M4.el('div', { class: 'm4-token', html: M4.tex(it.tex) }, tray);
      t.setAttribute('data-val', it.val);
      return t;
    });
  }

  function makeSlot(parent, labelHtml, want) {
    var wrap = M4.el('div', { class: 'vectors-s3-slotwrap' }, parent);
    M4.el('div', { class: 'vectors-s3-slotlabel', html: labelHtml }, wrap);
    var slot = M4.el('div', { class: 'm4-slot vectors-s3-slot' }, wrap);
    slot.setAttribute('data-want', want);
    return slot;
  }

  // Shared token/slot logic: each slot accepts exactly one token value.
  function wireDrop(ctx, tray, tokens, slots, wrongMsg, onAll) {
    var done = 0;
    M4.dragDrop({
      tokens: tokens,
      slots: slots,
      onDrop: function (tok, slot) {
        if (slot.classList.contains('filled')) { tray.appendChild(tok); return; }
        var val = tok.getAttribute('data-val'), want = slot.getAttribute('data-want');
        if (val === want) {
          slot.appendChild(tok);
          slot.classList.add('filled');
          tok.classList.add('vectors-s3-locked');
          tok.classList.add('m4-pop');
          done += 1;
          if (done === slots.length) { onAll(); ctx.solved(); }
          else ctx.note('Correct. ' + (slots.length - done) + ' slot' + (slots.length - done > 1 ? 's' : '') + ' remaining.');
        } else {
          tray.appendChild(tok);
          ctx.wrong(wrongMsg(val, want));
        }
      },
      onMiss: function (tok) { if (!tok.classList.contains('vectors-s3-locked')) tray.appendChild(tok); }
    });
  }

  M4.lesson({
    id: 'vectors-s3',
    module: 'vectors',
    title: 'Length and distance',
    summary: 'Norms measure the length of a vector, distances compare two vectors, and cosine similarity compares their directions.',
    minutes: 10,
    steps: [
      // 1
      {
        kind: 'text',
        title: 'Measuring vectors',
        html:
          '<p>A vector \\(\\mathbf{v} = \\begin{pmatrix}v_1\\\\v_2\\end{pmatrix}\\) has a size as well as a direction. Two ways of measuring size are the \\(L_2\\) norm and the \\(L_1\\) norm, and uses them to define unit vectors and the distance between two vectors.</p>' +
          '<p>It closes with cosine similarity, which compares the directions of two vectors while ignoring their lengths. After the session it should be possible to compute each of these quantities on paper and to read them off a picture.</p>'
      },
      // 2
      {
        kind: 'explore',
        title: 'The L2 norm',
        html:
          '<p>The components \\(v_1\\) and \\(v_2\\) of a vector are the two legs of a right triangle whose hypotenuse is the arrow itself. By the Pythagorean theorem the length of the arrow is \\[\\lVert \\mathbf{v} \\rVert_2 = \\sqrt{v_1^2 + v_2^2},\\] which is called the \\(L_2\\) norm or Euclidean norm. It equals \\(\\sqrt{\\mathbf{v} \\cdot \\mathbf{v}}\\), the square root of the dot product of the vector with itself. Drag the tip of the arrow and observe how the legs determine the length.</p>',
        mount: function (el, ctx) {
          injectCss();
          var p = M4.plane(el, { xmin: -6, xmax: 6, ymin: -6, ymax: 6 });
          var legH = p.line(0, 0, 4, 0, { stroke: ORANGE, width: 4 });
          var legV = p.line(4, 0, 4, 3, { stroke: PURPLE, width: 4 });
          var arrow = p.arrow(0, 0, 4, 3, { stroke: BLUE, width: 5 });
          var l1 = p.text(2, -0.5, 'v₁', { fill: ORANGE, size: 18, weight: 700 });
          var l2 = p.text(4.5, 1.5, 'v₂', { fill: PURPLE, size: 18, weight: 700 });
          var row = M4.el('div', { class: 'vectors-s3-readouts' }, el);
          var rv = readout(row, '\\mathbf{v} =');
          var rs = readout(row, 'v_1^2 + v_2^2 =');
          var rn = readout(row, '\\lVert \\mathbf{v} \\rVert_2 =', BLUE);
          function update(x, y) {
            legH.set(0, 0, x, 0);
            legV.set(x, 0, x, y);
            arrow.set(0, 0, x, y);
            l1.set(x / 2, y >= 0 ? -0.5 : 0.5, 'v₁');
            l2.set(x + (x >= 0 ? 0.55 : -0.55), y / 2, 'v₂');
            rv.tex(M4.col([f1(x), f1(y)]));
            rs.set(f2(x * x + y * y));
            rn.set(f2(Math.sqrt(x * x + y * y)));
          }
          p.handle(4, 3, { color: BLUE, snap: 0.5, onDrag: update });
          update(4, 3);
        }
      },
      // 3
      {
        kind: 'exercise',
        title: 'A vector of length 5',
        html:
          '<p>Drag the tip of the arrow so that \\(\\lVert \\mathbf{v} \\rVert_2 = 5\\). The tip snaps to whole-number coordinates, and there are several correct positions.</p>',
        hint: 'The squares of the two components must add up to \\(25\\). Both \\(5^2 + 0^2\\) and \\(3^2 + 4^2\\) do.',
        mount: function (el, ctx) {
          injectCss();
          var p = M4.plane(el, { xmin: -6, xmax: 6, ymin: -6, ymax: 6 });
          var ring = circle(p, 5, GREEN, { width: 4, opacity: 0 });
          var arrow = p.arrow(0, 0, 2, 1, { stroke: BLUE, width: 5 });
          var row = M4.el('div', { class: 'vectors-s3-readouts' }, el);
          var rv = readout(row, '\\mathbf{v} =');
          var rn = readout(row, '\\lVert \\mathbf{v} \\rVert_2 =', BLUE);
          function sq(n) { n = Math.round(n); return (n < 0 ? '(' + n + ')' : '' + (n === 0 ? 0 : n)) + '^2'; }
          var done = false;
          function update(x, y) {
            arrow.set(0, 0, x, y);
            rv.tex(M4.col([f1(x), f1(y)]));
            rn.set(f2(Math.sqrt(x * x + y * y)));
          }
          function check(x, y) {
            if (done) return;
            var s = Math.round(x * x + y * y);
            if (s === 25) {
              done = true;
              ring.el.setAttribute('opacity', 1);
              ring.el.setAttribute('fill', GREEN);
              ring.el.setAttribute('fill-opacity', 0.08);
              ctx.note('\\(' + sq(x) + ' + ' + sq(y) + ' = 25\\), so the length is \\(5\\). Every such vector ends on the circle of radius \\(5\\).');
              ctx.solved();
            } else if (s < 25) {
              ctx.note('\\(v_1^2 + v_2^2 = ' + s + '\\), which is less than \\(25\\). The vector is too short.');
            } else {
              ctx.note('\\(v_1^2 + v_2^2 = ' + s + '\\), which is more than \\(25\\). The vector is too long.');
            }
          }
          p.handle(2, 1, { color: BLUE, snap: 1, onDrag: update, onEnd: check });
          update(2, 1);
        }
      },
      // 4
      {
        kind: 'explore',
        title: 'The L1 norm',
        html:
          '<p>A second measure of size adds the absolute values of the components: \\[\\lVert \\mathbf{v} \\rVert_1 = |v_1| + |v_2|.\\] This \\(L_1\\) norm is the length of a path from the origin to the tip that runs only parallel to the axes, shown in orange. All vectors with the same \\(L_1\\) norm end on a diamond, whereas all vectors with the same \\(L_2\\) norm end on a circle. The straight arrow is never longer than the axis-parallel path, so \\(\\lVert \\mathbf{v} \\rVert_2 \\le \\lVert \\mathbf{v} \\rVert_1\\).</p>',
        mount: function (el, ctx) {
          injectCss();
          var p = M4.plane(el, { xmin: -6, xmax: 6, ymin: -6, ymax: 6 });
          var diamond = p.path([[0, 0]], { stroke: ORANGE, width: 2.5, closed: true });
          diamond.el.setAttribute('opacity', 0.45);
          var circ = circle(p, 1, BLUE, { opacity: 0.4 });
          var route = p.path([[0, 0]], { stroke: ORANGE, width: 5 });
          var arrow = p.arrow(0, 0, 3, 2, { stroke: BLUE, width: 5 });
          var row = M4.el('div', { class: 'vectors-s3-readouts' }, el);
          var rv = readout(row, '\\mathbf{v} =');
          var r1 = readout(row, '\\lVert \\mathbf{v} \\rVert_1 =', ORANGE);
          var r2 = readout(row, '\\lVert \\mathbf{v} \\rVert_2 =', BLUE);
          function update(x, y) {
            var a = Math.abs(x) + Math.abs(y), n = Math.sqrt(x * x + y * y);
            diamond.set([[a, 0], [0, a], [-a, 0], [0, -a]]);
            circ.setR(n);
            route.set([[0, 0], [x, 0], [x, y]]);
            arrow.set(0, 0, x, y);
            rv.tex(M4.col([f1(x), f1(y)]));
            r1.set(f2(a));
            r2.set(f2(n));
          }
          p.handle(3, 2, { color: BLUE, snap: 0.5, onDrag: update });
          update(3, 2);
          M4.el('div', { class: 'm4-note', text: 'On an axis the two norms agree. Along a diagonal they differ the most.' }, el);
        }
      },
      // 5
      {
        kind: 'exercise',
        title: 'Computing an L1 norm',
        html:
          '<p>The vector \\(\\mathbf{w} = \\begin{pmatrix}-3\\\\4\\end{pmatrix}\\) is drawn below. Enter its \\(L_1\\) norm \\(\\lVert \\mathbf{w} \\rVert_1\\).</p>',
        hint: 'Take the absolute value of each component before adding: \\(|-3| + |4|\\).',
        mount: function (el, ctx) {
          injectCss();
          var p = M4.plane(el, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 420, height: 420 });
          p.path([[0, 0], [-3, 0], [-3, 4]], { stroke: ORANGE, width: 5 });
          p.arrow(0, 0, -3, 4, { stroke: BLUE, width: 5 });
          p.text(-3.2, 4.45, 'w = (−3, 4)', { fill: BLUE, size: 17, weight: 700 });
          var wrap = M4.el('div', { class: 'vectors-s3-center', style: 'margin-top:14px' }, el);
          M4.numberInput(wrap, {
            answer: 7, tolerance: 0.01, placeholder: '?', label: '‖w‖₁ =',
            onCorrect: function () {
              ctx.note('\\(|-3| + |4| = 3 + 4 = 7\\). For comparison, \\(\\lVert \\mathbf{w} \\rVert_2 = \\sqrt{9 + 16} = 5\\).');
              ctx.solved();
            },
            onWrong: function (v) {
              if (Math.abs(v - 5) < 0.01) ctx.wrong('5 is the L2 norm. The L1 norm adds the absolute values of the components.');
              else if (Math.abs(v - 1) < 0.01) ctx.wrong('The components were added with their signs. Use absolute values.');
              else ctx.wrong('Add the absolute values of the two components.');
            }
          });
        }
      },
      // 6
      {
        kind: 'exercise',
        title: 'Normalising to a unit vector',
        html:
          '<p>A <em>unit vector</em> is a vector whose \\(L_2\\) norm is \\(1\\). Multiplying a vector by a positive number \\(c\\) keeps its direction and multiplies its length by \\(c\\), so \\(\\lVert c\\,\\mathbf{v} \\rVert_2 = c\\,\\lVert \\mathbf{v} \\rVert_2\\). For \\(\\mathbf{v} = \\begin{pmatrix}3\\\\4\\end{pmatrix}\\), set the scale \\(c\\) so that \\(c\\,\\mathbf{v}\\) is a unit vector, then press Check.</p>',
        hint: 'The length of \\(\\mathbf{v}\\) is \\(5\\). The required scale is \\(c = 1 / \\lVert \\mathbf{v} \\rVert_2\\).',
        mount: function (el, ctx) {
          injectCss();
          var p = M4.plane(el, { xmin: -1, xmax: 5, ymin: -1, ymax: 5 });
          var unit = circle(p, 1, GREEN, { dash: '7 6', opacity: 0.8 });
          var ghost = p.arrow(0, 0, 3, 4, { stroke: MUTED, width: 3 });
          ghost.el.setAttribute('opacity', 0.3);
          p.text(3.5, 4.35, 'v = (3, 4)', { fill: MUTED, size: 16 });
          p.text(1.25, -0.5, 'length 1', { fill: GREEN, size: 15, anchor: 'start' });
          var arrow = p.arrow(0, 0, 3, 4, { stroke: BLUE, width: 5 });
          var row = M4.el('div', { class: 'vectors-s3-readouts' }, el);
          var rc = readout(row, 'c\\,\\mathbf{v} =');
          var rn = readout(row, '\\lVert c\\,\\mathbf{v} \\rVert_2 =', BLUE);
          var c = 1, done = false;
          function update(v) {
            c = v;
            arrow.set(0, 0, 3 * c, 4 * c);
            rc.tex(M4.col([f2(3 * c), f2(4 * c)]));
            rn.set(f2(5 * c));
          }
          M4.slider(el, {
            min: 0.05, max: 1, step: 0.05, value: 1, label: 'scale c',
            format: function (v) { return f2(v); },
            onInput: function (v) { update(+v); }
          });
          var row2 = M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:12px' }, el);
          M4.button(row2, 'Check', function () {
            if (done) return;
            if (Math.abs(c - 0.2) < 0.001) {
              done = true;
              unit.el.setAttribute('stroke-dasharray', '');
              unit.el.setAttribute('fill', GREEN);
              unit.el.setAttribute('fill-opacity', 0.1);
              ctx.note('\\(c = \\tfrac{1}{5}\\) gives \\(\\hat{\\mathbf{v}} = \\begin{pmatrix}0.6\\\\0.8\\end{pmatrix}\\), and \\(0.6^2 + 0.8^2 = 1\\). In general \\(\\hat{\\mathbf{v}} = \\mathbf{v} / \\lVert \\mathbf{v} \\rVert_2\\).');
              ctx.solved();
            } else {
              ctx.wrong('The scaled vector has length ' + f2(5 * c) + ', which is ' + (5 * c > 1 ? 'greater' : 'less') + ' than 1.');
            }
          }, { primary: true });
          update(1);
        }
      },
      // 7
      {
        kind: 'exercise',
        title: 'Distance between two vectors',
        html:
          '<p>The distance between two vectors \\(\\mathbf{u}\\) and \\(\\mathbf{v}\\) is the norm of their difference. With the \\(L_2\\) norm this is the Euclidean distance \\(\\lVert \\mathbf{u} - \\mathbf{v} \\rVert_2\\), the length of the straight segment between the two tips. With the \\(L_1\\) norm it is \\(\\lVert \\mathbf{u} - \\mathbf{v} \\rVert_1\\). For \\(\\mathbf{u} = \\begin{pmatrix}1\\\\2\\end{pmatrix}\\) and \\(\\mathbf{v} = \\begin{pmatrix}4\\\\6\\end{pmatrix}\\), drag the correct value into each slot.</p>',
        hint: 'First compute the difference \\(\\mathbf{v} - \\mathbf{u} = \\begin{pmatrix}3\\\\4\\end{pmatrix}\\), then take its norms. The third slot concerns \\(\\mathbf{u}\\) alone.',
        mount: function (el, ctx) {
          injectCss();
          var p = M4.plane(el, { xmin: -1, xmax: 7, ymin: -1, ymax: 7, width: 440, height: 440 });
          p.path([[1, 2], [4, 2], [4, 6]], { stroke: ORANGE, width: 4 });
          p.line(1, 2, 4, 6, { stroke: BLUE, width: 5 });
          p.point(1, 2, { r: 8, fill: C.ink });
          p.point(4, 6, { r: 8, fill: C.ink });
          p.text(0.45, 2.3, 'u', { size: 19, weight: 700 });
          p.text(4.45, 6.3, 'v', { size: 19, weight: 700 });
          var slotsRow = M4.el('div', { class: 'vectors-s3-slots' }, el);
          var slots = [
            makeSlot(slotsRow, M4.tex('\\lVert \\mathbf{u} - \\mathbf{v} \\rVert_2'), '5'),
            makeSlot(slotsRow, M4.tex('\\lVert \\mathbf{u} - \\mathbf{v} \\rVert_1'), '7'),
            makeSlot(slotsRow, M4.tex('\\lVert \\mathbf{u} \\rVert_1'), '3')
          ];
          var tray = M4.el('div', { class: 'vectors-s3-tray' }, el);
          var tokens = makeTokens(tray, [
            { tex: '25', val: '25' }, { tex: '3', val: '3' }, { tex: '7', val: '7' },
            { tex: '1', val: '1' }, { tex: '5', val: '5' }
          ]);
          wireDrop(ctx, tray, tokens, slots, function (val, want) {
            if (val === '25') return '25 is the sum of squares 3² + 4². The L2 norm is its square root.';
            if (val === '1') return 'No quantity here equals 1. Compute the difference (3, 4) first.';
            if (want === '5') return 'The Euclidean distance is the square root of 3² + 4².';
            if (want === '7') return 'The L1 distance adds the absolute differences |3| + |4|.';
            return 'This slot asks for the L1 norm of u = (1, 2) alone.';
          }, function () {
            ctx.note('The difference vector is \\(\\begin{pmatrix}3\\\\4\\end{pmatrix}\\). Its Euclidean length is \\(5\\) and its \\(L_1\\) length is \\(7\\). For \\(\\mathbf{u}\\) itself, \\(\\lVert \\mathbf{u} \\rVert_1 = 1 + 2 = 3\\).');
          });
        }
      },
      // 8
      {
        kind: 'explore',
        title: 'Cosine similarity',
        html:
          '<p>Dividing the dot product of two non-zero vectors by the product of their lengths gives the cosine of the angle \\(\\theta\\) between them: \\[\\cos\\theta = \\frac{\\mathbf{u} \\cdot \\mathbf{v}}{\\lVert \\mathbf{u} \\rVert_2\\,\\lVert \\mathbf{v} \\rVert_2}.\\] This number is called the cosine similarity. It lies between \\(-1\\) and \\(1\\) and depends only on the two directions. Drag either tip, and in particular move one tip along its own direction to confirm that the value does not change with length.</p>',
        mount: function (el, ctx) {
          injectCss();
          var p = M4.plane(el, { xmin: -6, xmax: 6, ymin: -6, ymax: 6 });
          var arc = p.path([[0, 0]], { stroke: PURPLE, width: 4 });
          var au = p.arrow(0, 0, 4, 1, { stroke: BLUE, width: 5 });
          var av = p.arrow(0, 0, 2, 4, { stroke: ORANGE, width: 5 });
          var lu = p.text(0, 0, 'u', { fill: BLUE, size: 19, weight: 700 });
          var lv = p.text(0, 0, 'v', { fill: ORANGE, size: 19, weight: 700 });
          var row = M4.el('div', { class: 'vectors-s3-readouts' }, el);
          var rd = readout(row, '\\mathbf{u} \\cdot \\mathbf{v} =');
          var rl = readout(row, '\\lVert \\mathbf{u} \\rVert_2 \\lVert \\mathbf{v} \\rVert_2 =');
          var rc = readout(row, '\\cos\\theta =', PURPLE);
          var ra = readout(row, '\\theta =', PURPLE);
          var u = [4, 1], v = [2, 4];
          function place(lbl, a, name) {
            var n = Math.sqrt(a[0] * a[0] + a[1] * a[1]) || 1;
            lbl.set(a[0] + 0.7 * a[0] / n, a[1] + 0.7 * a[1] / n - 0.15, name);
          }
          function update() {
            au.set(0, 0, u[0], u[1]);
            av.set(0, 0, v[0], v[1]);
            place(lu, u, 'u'); place(lv, v, 'v');
            var dot = u[0] * v[0] + u[1] * v[1];
            var nn = Math.sqrt(u[0] * u[0] + u[1] * u[1]) * Math.sqrt(v[0] * v[0] + v[1] * v[1]);
            rd.set(f2(dot));
            rl.set(f2(nn));
            if (nn < 1e-9) {
              rc.set('undefined'); ra.set('undefined'); arc.set([[0, 0]]);
              return;
            }
            var cs = Math.max(-1, Math.min(1, dot / nn));
            rc.set(f2(cs));
            ra.set(Math.round(Math.acos(cs) * 180 / Math.PI) + '°');
            var a1 = Math.atan2(u[1], u[0]), d = Math.atan2(v[1], v[0]) - a1;
            while (d > Math.PI) d -= 2 * Math.PI;
            while (d <= -Math.PI) d += 2 * Math.PI;
            var pts = [], i, t;
            for (i = 0; i <= 28; i++) { t = a1 + d * i / 28; pts.push([1.1 * Math.cos(t), 1.1 * Math.sin(t)]); }
            arc.set(pts);
          }
          p.handle(u[0], u[1], { color: BLUE, snap: 0.5, onDrag: function (x, y) { u = [x, y]; update(); } });
          p.handle(v[0], v[1], { color: ORANGE, snap: 0.5, onDrag: function (x, y) { v = [x, y]; update(); } });
          update();
        }
      },
      // 9
      {
        kind: 'exercise',
        title: 'Cosine similarity zero',
        html:
          '<p>The vector \\(\\mathbf{u} = \\begin{pmatrix}4\\\\2\\end{pmatrix}\\) is fixed. Drag the tip of \\(\\mathbf{v}\\) to a position where the cosine similarity of \\(\\mathbf{u}\\) and \\(\\mathbf{v}\\) is \\(0\\). The tip snaps to whole-number coordinates, and \\(\\mathbf{v}\\) must not be the zero vector.</p>',
        hint: 'The cosine similarity is zero exactly when \\(\\mathbf{u} \\cdot \\mathbf{v} = 4 v_1 + 2 v_2 = 0\\), that is, when \\(v_2 = -2 v_1\\).',
        mount: function (el, ctx) {
          injectCss();
          var p = M4.plane(el, { xmin: -5, xmax: 5, ymin: -5, ymax: 5 });
          var perp = p.line(-2.5, 5, 2.5, -5, { stroke: GREEN, width: 3, dash: '8 7' });
          perp.el.setAttribute('opacity', 0);
          p.arrow(0, 0, 4, 2, { stroke: BLUE, width: 5 });
          p.text(4.45, 2.35, 'u', { fill: BLUE, size: 19, weight: 700 });
          var av = p.arrow(0, 0, 3, 3, { stroke: ORANGE, width: 5 });
          var row = M4.el('div', { class: 'vectors-s3-readouts' }, el);
          var rv = readout(row, '\\mathbf{v} =');
          var rd = readout(row, '\\mathbf{u} \\cdot \\mathbf{v} =');
          var rc = readout(row, '\\cos\\theta =', PURPLE);
          var done = false;
          function cosOf(x, y) {
            var n = Math.sqrt(20) * Math.sqrt(x * x + y * y);
            return n < 1e-9 ? null : (4 * x + 2 * y) / n;
          }
          function update(x, y) {
            av.set(0, 0, x, y);
            rv.tex(M4.col([f1(x), f1(y)]));
            rd.set(f1(4 * x + 2 * y));
            var cs = cosOf(x, y);
            rc.set(cs === null ? 'undefined' : f2(cs));
          }
          function check(x, y) {
            if (done) return;
            x = Math.round(x); y = Math.round(y);
            var cs = cosOf(x, y);
            if (cs === null) { ctx.note('The zero vector has no direction, so its cosine similarity is undefined.'); return; }
            var dot = 4 * x + 2 * y;
            if (dot === 0) {
              done = true;
              perp.el.setAttribute('opacity', 0.9);
              ctx.note('\\(\\mathbf{u} \\cdot \\mathbf{v} = 0\\), so the vectors are perpendicular. Every non-zero vector on the dashed line has cosine similarity \\(0\\) with \\(\\mathbf{u}\\).');
              ctx.solved();
            } else if (dot > 0) {
              ctx.note('\\(\\cos\\theta = ' + f2(cs) + '\\) is positive: the angle is smaller than \\(90^\\circ\\). Rotate \\(\\mathbf{v}\\) further away from \\(\\mathbf{u}\\).');
            } else {
              ctx.note('\\(\\cos\\theta = ' + f2(cs) + '\\) is negative: the angle is larger than \\(90^\\circ\\). Rotate \\(\\mathbf{v}\\) back towards \\(\\mathbf{u}\\).');
            }
          }
          p.handle(3, 3, { color: ORANGE, snap: 1, onDrag: update, onEnd: check });
          update(3, 3);
        }
      },
      // 10
      {
        kind: 'text',
        title: 'Distances in machine learning',
        html:
          '<p>Words, images and documents can be described by vectors of numbers, chosen so that related items get vectors that lie close together. Later in the course these vectors are called embeddings. To find the items most related to a query, a search system ranks the stored vectors by their Euclidean distance or their cosine similarity to the query vector. Cosine similarity is the better choice when only the direction of a vector carries meaning.</p>' +
          '<p>Norms also measure errors. Write a list of guesses and the list of true values as two vectors, and the length of their difference says how far off the guesses are as a whole. This way of measuring error comes back from the first model of the course onwards.</p>'
      },
      // 11
      {
        kind: 'exercise',
        title: 'Nearest neighbours under two measures',
        html:
          '<p>A query vector \\(\\mathbf{q} = \\begin{pmatrix}2\\\\1\\end{pmatrix}\\) is compared with three stored vectors \\(\\mathbf{a} = \\begin{pmatrix}4\\\\2\\end{pmatrix}\\), \\(\\mathbf{b} = \\begin{pmatrix}1\\\\2\\end{pmatrix}\\) and \\(\\mathbf{c} = \\begin{pmatrix}-1\\\\1\\end{pmatrix}\\). Drag the vector with the smallest Euclidean distance to \\(\\mathbf{q}\\) into the first slot, and the vector with the largest cosine similarity to \\(\\mathbf{q}\\) into the second slot.</p>',
        hint: 'The differences from \\(\\mathbf{q}\\) are \\(\\begin{pmatrix}2\\\\1\\end{pmatrix}\\), \\(\\begin{pmatrix}-1\\\\1\\end{pmatrix}\\) and \\(\\begin{pmatrix}-3\\\\0\\end{pmatrix}\\). Compare their lengths. For cosine similarity, look for the vector that points in the same direction as \\(\\mathbf{q}\\).',
        mount: function (el, ctx) {
          injectCss();
          var p = M4.plane(el, { xmin: -3, xmax: 5, ymin: -3, ymax: 5, width: 460, height: 460 });
          var dA = p.line(2, 1, 4, 2, { stroke: GREEN, width: 3, dash: '6 6' });
          var dB = p.line(2, 1, 1, 2, { stroke: GREEN, width: 3, dash: '6 6' });
          dA.el.setAttribute('opacity', 0); dB.el.setAttribute('opacity', 0);
          // a = 2q lies on top of q, so a is drawn as a wide translucent band underneath q to stay visible from the origin
          var aArr = p.arrow(0, 0, 4, 2, { stroke: ORANGE, width: 12 });
          aArr.el.setAttribute('opacity', 0.4);
          p.arrow(0, 0, 1, 2, { stroke: PURPLE, width: 3 });
          p.arrow(0, 0, -1, 1, { stroke: C.pink, width: 3 });
          p.arrow(0, 0, 2, 1, { stroke: BLUE, width: 4 });
          p.text(4.4, 2.3, 'a', { fill: ORANGE, size: 19, weight: 700 });
          p.text(0.8, 2.4, 'b', { fill: PURPLE, size: 19, weight: 700 });
          p.text(-1.35, 1.3, 'c', { fill: C.pink, size: 19, weight: 700 });
          p.text(2.2, 0.35, 'q', { fill: BLUE, size: 19, weight: 700 });
          var slotsRow = M4.el('div', { class: 'vectors-s3-slots' }, el);
          var slots = [
            makeSlot(slotsRow, 'smallest ' + M4.tex('\\lVert \\mathbf{q} - \\mathbf{x} \\rVert_2'), 'b'),
            makeSlot(slotsRow, 'largest ' + M4.tex('\\cos\\theta') + ' with ' + M4.tex('\\mathbf{q}'), 'a')
          ];
          var tray = M4.el('div', { class: 'vectors-s3-tray' }, el);
          var tokens = makeTokens(tray, [
            { tex: '\\mathbf{a}', val: 'a' }, { tex: '\\mathbf{b}', val: 'b' }, { tex: '\\mathbf{c}', val: 'c' }
          ]);
          wireDrop(ctx, tray, tokens, slots, function (val, want) {
            if (want === 'b') {
              if (val === 'a') return 'a points the same way as q, but its tip is √5 ≈ 2.24 away. Another tip is closer.';
              return 'The tip of c is 3 units from the tip of q. Another tip is closer.';
            }
            if (val === 'b') return 'b is closest in distance, but its cosine similarity with q is 4 / 5 = 0.8. Another vector reaches 1.';
            return 'c makes an angle of more than 90° with q, so its cosine similarity is negative.';
          }, function () {
            dB.el.setAttribute('opacity', 1);
            ctx.note('Distances: \\(\\sqrt5 \\approx 2.24\\) to \\(\\mathbf{a}\\), \\(\\sqrt2 \\approx 1.41\\) to \\(\\mathbf{b}\\), \\(3\\) to \\(\\mathbf{c}\\). Cosine similarities: \\(1\\), \\(0.8\\) and \\(-0.32\\). Since \\(\\mathbf{a} = 2\\mathbf{q}\\), both arrows start at the origin and point the same way. The angle between them is \\(0^\\circ\\), so \\(\\cos\\theta = 1\\), although \\(\\mathbf{a}\\) is not the closest point.');
          });
        }
      },
      // 12
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>The \\(L_2\\) norm \\(\\lVert \\mathbf{v} \\rVert_2 = \\sqrt{v_1^2 + v_2^2}\\) is the length of the arrow, and the \\(L_1\\) norm \\(\\lVert \\mathbf{v} \\rVert_1 = |v_1| + |v_2|\\) is the length of an axis-parallel path. Dividing a non-zero vector by its \\(L_2\\) norm gives a unit vector.</li>' +
          '<li>The distance between \\(\\mathbf{u}\\) and \\(\\mathbf{v}\\) is the norm of the difference \\(\\mathbf{u} - \\mathbf{v}\\).</li>' +
          '<li>Cosine similarity \\(\\dfrac{\\mathbf{u} \\cdot \\mathbf{v}}{\\lVert \\mathbf{u} \\rVert_2 \\lVert \\mathbf{v} \\rVert_2}\\) lies between \\(-1\\) and \\(1\\) and compares directions only, so the nearest vector by distance need not be the most similar by cosine.</li>' +
          '</ul>' +
          '<p>The formulas extend unchanged to vectors with any number of components, which is the setting of the next session on linear combinations and span.</p>'
      }
    ]
  });
})();
