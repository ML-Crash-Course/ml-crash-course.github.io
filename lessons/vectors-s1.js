(function () {
  'use strict';
  var M4 = window.M4;
  if (!M4 || !M4.lesson) { return; }
  var C = M4.colors || {};
  var BLUE = C.blue || '#2f6bff', ORANGE = C.orange || '#ff8a1f', GREEN = C.green || '#16b56b',
      PURPLE = C.purple || '#7a5cff', MUTED = C.muted || '#6b6f76', INK = C.ink || '#1d1d1f';

  function injectStyle() {
    if (document.getElementById('vectors-s1-style')) { return; }
    var s = document.createElement('style');
    s.id = 'vectors-s1-style';
    s.textContent =
      '.vectors-s1-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;}' +
      '.vectors-s1-plane{width:100%;max-width:520px;margin:0 auto;touch-action:none;}' +
      '.vectors-s1-eq{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;font-size:22px;}' +
      '.vectors-s1-slot{min-width:64px;min-height:56px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;cursor:pointer;}' +
      '.vectors-s1-token{min-width:56px;min-height:52px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;touch-action:none;user-select:none;-webkit-user-select:none;}' +
      '.vectors-s1-used{opacity:.3;}' +
      '.vectors-s1-vec{display:inline-flex;flex-direction:column;gap:8px;padding:8px 10px;border-left:3px solid #1d1d1f;border-right:3px solid #1d1d1f;border-radius:10px;}';
    document.head.appendChild(s);
  }

  function fmt(v) {
    var r = Math.round(v * 100) / 100;
    if (Object.is(r, -0)) { r = 0; }
    return String(r);
  }
  function vt(name, x, y) {
    return '\\mathbf{' + name + '} = (' + fmt(x) + ',\\ ' + fmt(y) + ')';
  }
  function wrap(el) {
    injectStyle();
    el.innerHTML = '';
    return M4.el('div', { class: 'vectors-s1-wrap' }, el);
  }
  function mkPlane(parent, r) {
    var holder = M4.el('div', { class: 'vectors-s1-plane' }, parent);
    return M4.plane(holder, { xmin: -r, xmax: r, ymin: -r, ymax: r, width: 520, height: 520 });
  }
  function readout(parent, color) {
    var d = M4.el('div', { class: 'm4-readout' }, parent);
    if (color) { d.style.color = color; }
    return { el: d, set: function (tex) { d.innerHTML = M4.tex(tex); } };
  }
  // place a label beside the middle of an arrow, offset perpendicular to it
  function labelPos(x1, y1, x2, y2, off) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1;
    return [(x1 + x2) / 2 - dy / L * off, (y1 + y2) / 2 + dx / L * off];
  }
  function fade(o, a) { if (o && o.el) { o.el.setAttribute('opacity', a); } return o; }

  var steps = [];

  /* 1 ------------------------------------------------------------------ */
  steps.push({
    kind: 'text',
    title: 'Learning goals',
    html:
      '<p>A <b>vector</b> is a quantity with a direction and a length, drawn as an arrow. In the plane it is recorded by two numbers, its <b>components</b>.</p>' +
      '<p>In this lesson you will read the components of an arrow, add two vectors by placing them tip to tail, and stretch or flip a vector by multiplying it with a number.</p>'
  });

  /* 2 ------------------------------------------------------------------ */
  steps.push({
    kind: 'explore',
    title: 'Components',
    html:
      '<p>Write \\(\\mathbf{v} = (v_1, v_2)\\) for the arrow that moves \\(v_1\\) units horizontally and \\(v_2\\) units vertically. The number \\(v_1\\) is the horizontal component and \\(v_2\\) is the vertical component. Negative values point left or down.</p>' +
      '<p>Drag the tip of the arrow. The dashed segments show the two components.</p>',
    mount: function (el) {
      var w = wrap(el);
      var p = mkPlane(w, 5);
      var v = [3, 2];
      var hx = p.line(0, 0, v[0], 0, { stroke: ORANGE, width: 4, dash: '7 6' });
      var hy = p.line(v[0], 0, v[0], v[1], { stroke: PURPLE, width: 4, dash: '7 6' });
      var ar = p.arrow(0, 0, v[0], v[1], { stroke: BLUE, width: 5 });
      var tx = p.text(0, 0, '', { fill: ORANGE, size: 17, weight: 700 });
      var ty = p.text(0, 0, '', { fill: PURPLE, size: 17, weight: 700 });
      var row = M4.el('div', { class: 'm4-row' }, w);
      var rv = readout(row, BLUE), r1 = readout(row, ORANGE), r2 = readout(row, PURPLE);
      function draw() {
        hx.set(0, 0, v[0], 0); hy.set(v[0], 0, v[0], v[1]); ar.set(0, 0, v[0], v[1]);
        tx.set(v[0] / 2, v[1] >= 0 ? -0.45 : 0.3, 'v₁ = ' + fmt(v[0]));
        ty.set(v[0] + (v[0] >= 0 ? 0.25 : -0.25), v[1] / 2 - 0.1, 'v₂ = ' + fmt(v[1]));
        ty.el.setAttribute('text-anchor', v[0] >= 0 ? 'start' : 'end');
        rv.set(vt('v', v[0], v[1])); r1.set('v_1 = ' + fmt(v[0])); r2.set('v_2 = ' + fmt(v[1]));
      }
      p.handle(v[0], v[1], { color: BLUE, snap: 0.5, onDrag: function (x, y) { v = [x, y]; draw(); } });
      draw();
    }
  });

  /* 3 ------------------------------------------------------------------ */
  steps.push({
    kind: 'exercise',
    title: 'Vectors from components',
    html: '<p>Drag the tip so that the arrow represents \\(\\mathbf{v} = (3, -2)\\). Release the tip to have the arrow checked.</p>',
    hint: 'The first component counts steps to the right, the second counts steps upward. A second component of \\(-2\\) means two steps down.',
    mount: function (el, ctx) {
      var w = wrap(el);
      var p = mkPlane(w, 5);
      var v = [1, 1], done = false;
      var ring = p.point(3, -2, { r: 16, fill: GREEN });
      ring.el.setAttribute('opacity', 0);
      var ar = p.arrow(0, 0, v[0], v[1], { stroke: BLUE, width: 5 });
      var row = M4.el('div', { class: 'm4-row' }, w);
      var rv = readout(row, BLUE);
      function draw() { ar.set(0, 0, v[0], v[1]); rv.set(vt('v', v[0], v[1])); }
      p.handle(v[0], v[1], {
        color: BLUE, snap: 1,
        onDrag: function (x, y) { if (!done) { v = [x, y]; draw(); } },
        onEnd: function () {
          if (done) { return; }
          if (v[0] === 3 && v[1] === -2) {
            done = true; ring.el.setAttribute('opacity', 0.3);
            ctx.note('The arrow moves 3 units right and 2 units down, so \\(\\mathbf{v} = (3, -2)\\).');
            ctx.solved();
          } else if (v[0] !== 3) {
            ctx.wrong('The horizontal component is ' + fmt(v[0]) + '; it should be 3.');
          } else {
            ctx.wrong('The vertical component is ' + fmt(v[1]) + '; it should be −2.');
          }
        }
      });
      draw();
    }
  });

  /* 4 ------------------------------------------------------------------ */
  steps.push({
    kind: 'exercise',
    title: 'Arrows away from the origin',
    html:
      '<p>A vector records a displacement, not a position: the same arrow may be drawn starting anywhere. Its components are the tip coordinates minus the tail coordinates.</p>' +
      '<p>The arrow below starts at the point \\((-2, 1)\\) and ends at the point \\((2, 3)\\). Which vector does it represent?</p>',
    hint: 'Subtract tail from tip, coordinate by coordinate: \\(2 - (-2)\\) and \\(3 - 1\\).',
    mount: function (el, ctx) {
      var w = wrap(el);
      var p = mkPlane(w, 5);
      p.arrow(-2, 1, 2, 3, { stroke: BLUE, width: 5 });
      p.point(-2, 1, { r: 6, fill: INK });
      p.text(-2, 0.35, '(−2, 1)', { fill: INK, size: 16, weight: 600 });
      p.text(2.2, 3.4, '(2, 3)', { fill: INK, size: 16, weight: 600 });
      var box = M4.el('div', { style: 'width:100%' }, w);
      M4.choices(box, {
        options: ['\\((2, 3)\\)', '\\((4, 2)\\)', '\\((-2, 1)\\)', '\\((0, 4)\\)'],
        correct: 1,
        onCorrect: function () {
          p.line(-2, 1, 2, 1, { stroke: ORANGE, width: 4, dash: '7 6' });
          p.line(2, 1, 2, 3, { stroke: PURPLE, width: 4, dash: '7 6' });
          ctx.note('\\((2 - (-2),\\ 3 - 1) = (4, 2)\\): four units right, two units up.');
          ctx.solved();
        },
        onWrong: function (i) {
          var m = ['That is the position of the tip, not the displacement from tail to tip.', '',
            'That is the position of the tail, not the displacement from tail to tip.',
            'That adds the coordinates. The components are differences: tip minus tail.'][i];
          ctx.wrong(m);
        }
      });
    }
  });

  /* 5 ------------------------------------------------------------------ */
  steps.push({
    kind: 'explore',
    title: 'Tip-to-tail addition',
    html:
      '<p>To add \\(\\mathbf{a}\\) and \\(\\mathbf{b}\\), place the tail of \\(\\mathbf{b}\\) at the tip of \\(\\mathbf{a}\\). The sum \\(\\mathbf{a} + \\mathbf{b}\\) runs from the tail of \\(\\mathbf{a}\\) to the tip of \\(\\mathbf{b}\\), and its components are \\((a_1 + b_1,\\ a_2 + b_2)\\).</p>' +
      '<p>Drag both tips. The faint arrows show the other order, \\(\\mathbf{b}\\) first and then \\(\\mathbf{a}\\), which ends at the same point.</p>',
    mount: function (el, ctx) {
      var w = wrap(el);
      var p = mkPlane(w, 6);
      var a = [3, 1], b = [1, 2], raf = 0;
      var gb = fade(p.arrow(0, 0, b[0], b[1], { stroke: ORANGE, width: 3 }), 0.3);
      var ga = fade(p.arrow(b[0], b[1], a[0] + b[0], a[1] + b[1], { stroke: BLUE, width: 3 }), 0.3);
      var sum = p.arrow(0, 0, a[0] + b[0], a[1] + b[1], { stroke: GREEN, width: 5 });
      var aa = p.arrow(0, 0, a[0], a[1], { stroke: BLUE, width: 5 });
      var ab = p.arrow(a[0], a[1], a[0] + b[0], a[1] + b[1], { stroke: ORANGE, width: 5 });
      var la = p.text(0, 0, 'a', { fill: BLUE, size: 20, weight: 700 });
      var lb = p.text(0, 0, 'b', { fill: ORANGE, size: 20, weight: 700 });
      var walker = p.point(0, 0, { r: 9, fill: INK });
      walker.el.setAttribute('opacity', 0);
      var row = M4.el('div', { class: 'm4-row' }, w);
      var ra = readout(row, BLUE), rb = readout(row, ORANGE), rs = readout(row, GREEN);
      var hb;
      function draw() {
        var s = [a[0] + b[0], a[1] + b[1]];
        gb.set(0, 0, b[0], b[1]); ga.set(b[0], b[1], s[0], s[1]);
        sum.set(0, 0, s[0], s[1]); aa.set(0, 0, a[0], a[1]); ab.set(a[0], a[1], s[0], s[1]);
        var q = labelPos(0, 0, a[0], a[1], -0.5); la.set(q[0], q[1] - 0.15, 'a');
        q = labelPos(a[0], a[1], s[0], s[1], -0.5); lb.set(q[0], q[1] - 0.15, 'b');
        ra.set(vt('a', a[0], a[1])); rb.set(vt('b', b[0], b[1]));
        rs.set('\\mathbf{a}+\\mathbf{b} = (' + fmt(s[0]) + ',\\ ' + fmt(s[1]) + ')');
      }
      function clamp(v) { return Math.max(-6, Math.min(6, v)); }
      hb = p.handle(a[0] + b[0], a[1] + b[1], {
        color: ORANGE, snap: 0.5,
        onDrag: function (x, y) { b = [x - a[0], y - a[1]]; draw(); }
      });
      p.handle(a[0], a[1], {
        color: BLUE, snap: 0.5,
        onDrag: function (x, y) {
          a = [x, y];
          var sx = clamp(a[0] + b[0]), sy = clamp(a[1] + b[1]);
          b = [sx - a[0], sy - a[1]];
          hb.set(sx, sy); draw();
        }
      });
      var brow = M4.el('div', { class: 'm4-row' }, w);
      M4.button(brow, 'Walk the path', function () {
        cancelAnimationFrame(raf);
        var t0 = null;
        walker.el.setAttribute('opacity', 1);
        function tick(ts) {
          if (t0 === null) { t0 = ts; }
          var t = Math.min((ts - t0) / 1800, 1), x, y;
          if (t < 0.5) { x = a[0] * t * 2; y = a[1] * t * 2; }
          else { x = a[0] + b[0] * (t - 0.5) * 2; y = a[1] + b[1] * (t - 0.5) * 2; }
          walker.set(x, y);
          if (t < 1) { raf = requestAnimationFrame(tick); }
        }
        raf = requestAnimationFrame(tick);
      });
      ctx.onCleanup(function () { cancelAnimationFrame(raf); });
      draw();
    }
  });

  /* 6 ------------------------------------------------------------------ */
  steps.push({
    kind: 'exercise',
    title: 'The sum of two vectors',
    html: '<p>The vectors \\(\\mathbf{a} = (2, 1)\\) and \\(\\mathbf{b} = (1, 3)\\) are both drawn from the origin. Drag the green tip so that the green arrow is \\(\\mathbf{a} + \\mathbf{b}\\), then release.</p>',
    hint: 'Imagine sliding \\(\\mathbf{b}\\) so that its tail sits on the tip of \\(\\mathbf{a}\\), or add the components: \\((2 + 1,\\ 1 + 3)\\).',
    mount: function (el, ctx) {
      var w = wrap(el);
      var p = mkPlane(w, 5);
      var a = [2, 1], b = [1, 3], s = [-2, -2], done = false;
      p.arrow(0, 0, a[0], a[1], { stroke: BLUE, width: 5 });
      p.arrow(0, 0, b[0], b[1], { stroke: ORANGE, width: 5 });
      p.text(1.4, 0.15, 'a', { fill: BLUE, size: 20, weight: 700 });
      p.text(0.15, 1.6, 'b', { fill: ORANGE, size: 20, weight: 700 });
      var ar = p.arrow(0, 0, s[0], s[1], { stroke: GREEN, width: 5 });
      var row = M4.el('div', { class: 'm4-row' }, w);
      readout(row, BLUE).set(vt('a', 2, 1)); readout(row, ORANGE).set(vt('b', 1, 3));
      var rs = readout(row, GREEN);
      function draw() { ar.set(0, 0, s[0], s[1]); rs.set('\\text{green} = (' + fmt(s[0]) + ',\\ ' + fmt(s[1]) + ')'); }
      p.handle(s[0], s[1], {
        color: GREEN, snap: 1,
        onDrag: function (x, y) { if (!done) { s = [x, y]; draw(); } },
        onEnd: function () {
          if (done) { return; }
          if (s[0] === 3 && s[1] === 4) {
            done = true;
            fade(p.arrow(2, 1, 3, 4, { stroke: ORANGE, width: 3 }), 0.45);
            fade(p.arrow(1, 3, 3, 4, { stroke: BLUE, width: 3 }), 0.45);
            ctx.note('\\(\\mathbf{a} + \\mathbf{b} = (2 + 1,\\ 1 + 3) = (3, 4)\\). The faint copies complete the parallelogram.');
            ctx.solved();
          } else if (s[0] !== 3) {
            ctx.wrong('The first component should be 2 + 1. The green arrow has ' + fmt(s[0]) + '.');
          } else {
            ctx.wrong('The second component should be 1 + 3. The green arrow has ' + fmt(s[1]) + '.');
          }
        }
      });
      draw();
    }
  });

  /* 7 ------------------------------------------------------------------ */
  steps.push({
    kind: 'explore',
    title: 'Scalar multiplication',
    html:
      '<p>A plain number is called a <b>scalar</b>. Multiplying a vector \\(\\mathbf{a}\\) by a scalar \\(c\\) multiplies each component: \\(c\\,\\mathbf{a} = (c\\,a_1,\\ c\\,a_2)\\).</p>' +
      '<p>Move the slider and drag the tip of \\(\\mathbf{a}\\). The arrow \\(c\\,\\mathbf{a}\\) stays on the dashed line through \\(\\mathbf{a}\\). Its length is scaled by \\(|c|\\), and a negative \\(c\\) reverses its direction.</p>',
    mount: function (el) {
      var w = wrap(el);
      var p = mkPlane(w, 6);
      var a = [2, 1], c = 1.5;
      var ln = p.line(0, 0, 0, 0, { stroke: MUTED, width: 2, dash: '6 6' });
      var ca = p.arrow(0, 0, 0, 0, { stroke: ORANGE, width: 9 });
      fade(ca, 0.75);
      var aa = p.arrow(0, 0, a[0], a[1], { stroke: BLUE, width: 4 });
      var row = M4.el('div', { class: 'm4-row' }, w);
      var ra = readout(row, BLUE), rc = readout(row, ORANGE), rl = readout(row, MUTED);
      function draw() {
        var k = 6 / (Math.max(Math.abs(a[0]), Math.abs(a[1])) || 1);
        ln.set(-a[0] * k, -a[1] * k, a[0] * k, a[1] * k);
        ca.set(0, 0, c * a[0], c * a[1]);
        ca.el.setAttribute('opacity', Math.abs(c) < 0.01 ? 0 : 0.75);
        aa.set(0, 0, a[0], a[1]);
        ra.set(vt('a', a[0], a[1]));
        rc.set(fmt(c) + '\\,\\mathbf{a} = (' + fmt(c * a[0]) + ',\\ ' + fmt(c * a[1]) + ')');
        rl.set('\\text{length ratio } ' + fmt(Math.abs(c)));
      }
      p.handle(a[0], a[1], { color: BLUE, snap: 0.5, onDrag: function (x, y) { a = [x, y]; draw(); } });
      var sl = M4.el('div', { style: 'width:100%;max-width:520px' }, w);
      M4.slider(sl, { min: -2.5, max: 2.5, step: 0.25, value: c, label: 'c', format: fmt, onInput: function (v) { c = Number(v); draw(); } });
      draw();
    }
  });

  /* 8 ------------------------------------------------------------------ */
  steps.push({
    kind: 'exercise',
    title: 'The scalar factor',
    html: '<p>Let \\(\\mathbf{a} = (2, 1)\\). The faint arrow is the target \\(\\mathbf{t} = (-3, -1.5)\\). Move the slider until \\(c\\,\\mathbf{a}\\) coincides with the target.</p>',
    hint: 'The target points opposite to \\(\\mathbf{a}\\), so \\(c\\) is negative. Compare first components: \\(c \\cdot 2 = -3\\).',
    mount: function (el, ctx) {
      var w = wrap(el);
      var p = mkPlane(w, 5);
      var a = [2, 1], c = 1, done = false;
      p.line(-5, -2.5, 5, 2.5, { stroke: MUTED, width: 2, dash: '6 6' });
      var tg = fade(p.arrow(0, 0, -3, -1.5, { stroke: INK, width: 9 }), 0.18);
      p.text(-2.2, -0.5, 't', { fill: MUTED, size: 20, weight: 700 });
      var ca = p.arrow(0, 0, c * a[0], c * a[1], { stroke: ORANGE, width: 5 });
      fade(p.arrow(0, 0, a[0], a[1], { stroke: BLUE, width: 3 }), 0.55);
      p.text(1.1, 1.0, 'a', { fill: BLUE, size: 20, weight: 700 });
      var row = M4.el('div', { class: 'm4-row' }, w);
      var rc = readout(row, ORANGE);
      readout(row, MUTED).set('\\mathbf{t} = (-3,\\ -1.5)');
      function draw() {
        ca.set(0, 0, c * a[0], c * a[1]);
        ca.el.setAttribute('opacity', Math.abs(c) < 0.01 ? 0 : 1);
        rc.set(fmt(c) + '\\,\\mathbf{a} = (' + fmt(c * a[0]) + ',\\ ' + fmt(c * a[1]) + ')');
      }
      var sl = M4.el('div', { style: 'width:100%;max-width:520px' }, w);
      var sld = M4.slider(sl, {
        min: -3, max: 3, step: 0.25, value: c, label: 'c', format: fmt,
        onInput: function (v) {
          if (done) { return; }
          c = Number(v); draw();
          if (Math.abs(c + 1.5) < 0.01) {
            done = true;
            tg.el.setAttribute('opacity', 0.35);
            if (sld && sld.input) { sld.input.disabled = true; }
            ctx.note('\\(-1.5 \\cdot (2, 1) = (-3, -1.5)\\): the direction is reversed and the length is multiplied by 1.5.');
            ctx.solved();
          } else if (c >= 0) {
            ctx.note('With \\(c \\ge 0\\) the arrow cannot point opposite to \\(\\mathbf{a}\\).');
          } else if (c > -1.5) {
            ctx.note('The direction is right, but \\(c\\,\\mathbf{a}\\) is shorter than the target.');
          } else {
            ctx.note('The direction is right, but \\(c\\,\\mathbf{a}\\) is longer than the target.');
          }
        }
      });
      draw();
    }
  });

  /* 9 ------------------------------------------------------------------ */
  steps.push({
    kind: 'exercise',
    title: 'Addition and scaling combined',
    html: '<p>Let \\(\\mathbf{a} = (1, 2)\\) and \\(\\mathbf{b} = (3, -1)\\). Drag the correct numbers into the two slots so that the column holds the components of \\(2\\,\\mathbf{a} + \\mathbf{b}\\), first component on top. Tap a filled slot to empty it.</p>',
    hint: 'First scale: \\(2\\,\\mathbf{a} = (2, 4)\\). Then add \\(\\mathbf{b}\\) component by component.',
    mount: function (el, ctx) {
      var w = wrap(el);
      var done = false;
      var eq = M4.el('div', { class: 'vectors-s1-eq' }, w);
      M4.el('span', { html: M4.tex('2\\begin{pmatrix}1\\\\2\\end{pmatrix} + \\begin{pmatrix}3\\\\-1\\end{pmatrix} =') }, eq);
      var vec = M4.el('div', { class: 'vectors-s1-vec' }, eq);
      var slots = [0, 1].map(function () { return M4.el('div', { class: 'm4-slot vectors-s1-slot' }, vec); });
      var tray = M4.el('div', { class: 'm4-row' }, w);
      var values = [4, 3, 7, 5, 1, 2];
      var tokens = values.map(function (v) {
        var t = M4.el('div', { class: 'm4-token vectors-s1-token', text: String(v) }, tray);
        t.setAttribute('data-v', String(v));
        return t;
      });
      function clear(slot) {
        var v = slot.getAttribute('data-v');
        if (v === null) { return; }
        tokens.forEach(function (t) { if (t.getAttribute('data-v') === v) { t.classList.remove('vectors-s1-used'); } });
        slot.removeAttribute('data-v'); slot.textContent = ''; slot.classList.remove('filled');
      }
      function check() {
        var x = slots[0].getAttribute('data-v'), y = slots[1].getAttribute('data-v');
        if (x === null || y === null) { return; }
        if (x === '5' && y === '3') {
          done = true;
          vec.classList.add('m4-pop');
          slots.forEach(function (s) { s.style.borderColor = GREEN; s.style.color = GREEN; });
          ctx.note('\\(2\\,\\mathbf{a} + \\mathbf{b} = (2 + 3,\\ 4 - 1) = (5, 3)\\).');
          ctx.solved();
        } else {
          var msg = (x === '3' && y === '5')
            ? 'The numbers are right but the order is swapped: the first component goes on top.'
            : (x !== '5' ? 'Check the top slot: 2 · 1 + 3.' : 'Check the bottom slot: 2 · 2 + (−1).');
          ctx.wrong(msg);
          if (x !== '5') { clear(slots[0]); }
          if (y !== '3') { clear(slots[1]); }
        }
      }
      slots.forEach(function (s) {
        s.addEventListener('click', function () { if (!done) { clear(s); } });
      });
      M4.dragDrop({
        tokens: tokens, slots: slots,
        onDrop: function (tok, slot) {
          if (done || tok.classList.contains('vectors-s1-used')) { return; }
          clear(slot);
          slot.setAttribute('data-v', tok.getAttribute('data-v'));
          slot.textContent = tok.getAttribute('data-v');
          slot.classList.add('filled');
          tok.classList.add('vectors-s1-used');
          check();
        },
        onMiss: function () {}
      });
    }
  });

  /* 10 ----------------------------------------------------------------- */
  steps.push({
    kind: 'text',
    title: 'Vectors in machine learning',
    html:
      '<p>The adjustable numbers of a model, its <b>weights</b>, are collected in one vector \\(\\mathbf{w}\\). Here it has two components. A real model has millions, and the rules are the same.</p>' +
      '<p>Training repeatedly replaces \\(\\mathbf{w}\\) by \\(\\mathbf{w} + \\Delta\\mathbf{w}\\), where the update \\(\\Delta\\mathbf{w}\\) is a vector added tip to tail. In gradient descent the update is \\(\\Delta\\mathbf{w} = -\\eta\\,\\mathbf{g}\\): a direction vector \\(\\mathbf{g}\\), called the gradient, multiplied by the negative of a small positive scalar \\(\\eta\\), the learning rate.</p>' +
      '<p>One training step therefore consists of the two operations above, a scalar multiplication followed by a vector addition.</p>'
  });

  /* 11 ----------------------------------------------------------------- */
  steps.push({
    kind: 'exercise',
    title: 'The missing update',
    html:
      '<p>The current weights are \\(\\mathbf{w} = (3, 1)\\) and the desired weights are marked by the ring at \\((1, 4)\\). Drag the tip of the orange arrow \\(\\Delta\\mathbf{w}\\), drawn from the origin, until \\(\\mathbf{w} + \\Delta\\mathbf{w}\\) ends in the ring, then release.</p>' +
      '<p>The dashed copy of \\(\\Delta\\mathbf{w}\\) is attached to the tip of \\(\\mathbf{w}\\) and the green arrow shows the current sum.</p>',
    hint: 'The update is the displacement from the tip of \\(\\mathbf{w}\\) to the target: target minus \\(\\mathbf{w}\\), component by component.',
    mount: function (el, ctx) {
      var w = wrap(el);
      var p = mkPlane(w, 5);
      var a = [3, 1], t = [1, 4], b = [1, -2], done = false;
      var ring = p.point(t[0], t[1], { r: 17, fill: GREEN });
      ring.el.setAttribute('fill-opacity', 0.08);
      ring.el.setAttribute('stroke', GREEN);
      ring.el.setAttribute('stroke-width', 3);
      ring.el.setAttribute('stroke-dasharray', '6 5');
      var sum = p.arrow(0, 0, 0, 0, { stroke: GREEN, width: 4 });
      var copy = p.line(0, 0, 0, 0, { stroke: ORANGE, width: 4, dash: '8 6' });
      p.arrow(0, 0, a[0], a[1], { stroke: BLUE, width: 5 });
      p.text(1.7, 0.05, 'w', { fill: BLUE, size: 20, weight: 700 });
      var ab = p.arrow(0, 0, b[0], b[1], { stroke: ORANGE, width: 5 });
      var tip = p.point(0, 0, { r: 6, fill: GREEN });
      var row = M4.el('div', { class: 'm4-row' }, w);
      var rb = readout(row, ORANGE), rs = readout(row, GREEN);
      function draw() {
        var s = [a[0] + b[0], a[1] + b[1]];
        sum.set(0, 0, s[0], s[1]); copy.set(a[0], a[1], s[0], s[1]);
        ab.set(0, 0, b[0], b[1]); tip.set(s[0], s[1]);
        rb.set('\\Delta\\mathbf{w} = (' + fmt(b[0]) + ',\\ ' + fmt(b[1]) + ')');
        rs.set('\\mathbf{w}+\\Delta\\mathbf{w} = (' + fmt(s[0]) + ',\\ ' + fmt(s[1]) + ')');
      }
      p.handle(b[0], b[1], {
        color: ORANGE, snap: 1,
        onDrag: function (x, y) { if (!done) { b = [x, y]; draw(); } },
        onEnd: function () {
          if (done) { return; }
          var s = [a[0] + b[0], a[1] + b[1]];
          if (s[0] === t[0] && s[1] === t[1]) {
            done = true;
            ring.el.setAttribute('fill-opacity', 0.4);
            ring.el.removeAttribute('stroke-dasharray');
            ctx.note('\\(\\Delta\\mathbf{w} = (1 - 3,\\ 4 - 1) = (-2, 3)\\), and \\((3, 1) + (-2, 3) = (1, 4)\\).');
            ctx.solved();
          } else {
            var dx = t[0] - s[0], dy = t[1] - s[1], parts = [];
            if (dx !== 0) { parts.push(Math.abs(dx) + ' unit' + (Math.abs(dx) === 1 ? '' : 's') + ' too far ' + (dx > 0 ? 'left' : 'right')); }
            if (dy !== 0) { parts.push(Math.abs(dy) + ' unit' + (Math.abs(dy) === 1 ? '' : 's') + ' too ' + (dy > 0 ? 'low' : 'high')); }
            ctx.wrong('The sum ends ' + parts.join(' and ') + '.');
          }
        }
      });
      draw();
    }
  });

  /* 12 ----------------------------------------------------------------- */
  steps.push({
    kind: 'text',
    title: 'Recap',
    html:
      '<ul>' +
      '<li>A vector \\(\\mathbf{v} = (v_1, v_2)\\) is a displacement: \\(v_1\\) units horizontally and \\(v_2\\) units vertically, equal to tip minus tail wherever the arrow is drawn.</li>' +
      '<li>Addition places arrows tip to tail and adds components: \\(\\mathbf{a} + \\mathbf{b} = (a_1 + b_1,\\ a_2 + b_2)\\). The order does not matter.</li>' +
      '<li>Scalar multiplication \\(c\\,\\mathbf{a} = (c\\,a_1,\\ c\\,a_2)\\) scales the length by \\(|c|\\) and reverses the direction when \\(c\\) is negative. A gradient-descent step \\(\\mathbf{w} - \\eta\\,\\mathbf{g}\\) combines both operations.</li>' +
      '</ul>'
  });

  M4.lesson({
    id: 'vectors-s1',
    module: 'vectors',
    title: 'Vectors as arrows',
    summary: 'Read components, add vectors tip to tail and scale them with a number, by dragging arrows in the plane.',
    minutes: 9,
    steps: steps
  });
})();
