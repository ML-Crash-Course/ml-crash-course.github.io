(function () {
  'use strict';

  var C = M4.colors || {};
  var PINK = C.pink || '#ef4b8b';
  var BLUE = C.blue || '#2f6bff';
  var ORANGE = C.orange || '#ff8a1f';
  var GREEN = C.green || '#16b56b';
  var MUTED = C.muted || '#6b6f76';
  var INK = C.ink || '#1d1d1f';
  var LINE = C.line || '#e6e4dd';

  function injectStyle() {
    if (document.getElementById('l4-s2-style')) return;
    var s = document.createElement('style');
    s.id = 'l4-s2-style';
    s.textContent =
      '.l4-s2-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;}' +
      '.l4-s2-plane{width:100%;max-width:520px;margin:0 auto;}' +
      '.l4-s2-half{width:100%;max-width:360px;margin:0 auto;}' +
      '.l4-s2-cap{text-align:center;font-weight:600;font-size:15px;color:' + MUTED + ';margin-bottom:4px;}' +
      '.l4-s2-pairs{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;width:100%;max-width:640px;align-items:center;}' +
      '.l4-s2-bio{background:#fff;border:2px solid ' + LINE + ';border-radius:14px;padding:10px 14px;font-size:16px;line-height:1.3;}' +
      '.l4-s2-bio b{color:' + PINK + ';}' +
      '.l4-s2-slotbox{min-height:54px;display:flex;align-items:center;justify-content:center;}' +
      '.l4-s2-bank{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;min-height:54px;width:100%;}' +
      '.l4-s2-tok{padding:8px 14px;font-size:16px;touch-action:none;user-select:none;}' +
      '.l4-s2-done{border-color:' + GREEN + ' !important;background:#eafaf2 !important;}' +
      '.l4-s2-on{outline:3px solid ' + PINK + ';outline-offset:1px;}' +
      '.l4-s2-sliders{width:100%;max-width:520px;display:flex;flex-direction:column;gap:6px;}' +
      '@media (max-width:560px){.l4-s2-pairs{grid-template-columns:1fr;}}';
    document.head.appendChild(s);
  }

  function relu(z) { return z > 0 ? z : 0; }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
  function fmt(v, d) {
    var s = (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
    if (parseFloat(s) === 0) s = (0).toFixed(d);
    return s;
  }
  function wrap(el) {
    injectStyle();
    el.innerHTML = '';
    return M4.el('div', { class: 'l4-s2-wrap' }, el);
  }

  /* ---------- step 2: ReLU and sigmoid bend the grid ---------- */
  function mountGrid(el, ctx) {
    var root = wrap(el);
    var row = M4.el('div', { class: 'm4-row' }, root);
    var holder = M4.el('div', { class: 'l4-s2-plane' }, root);
    var p = M4.plane(holder, { xmin: -3, xmax: 3, ymin: -3, ymax: 3, width: 520, height: 520, grid: false });
    var mode = 'relu', t = 0, raf = 0;
    var pt = { x: -2, y: 1.5 };

    function act(v) { return mode === 'relu' ? relu(v) : sigmoid(v); }
    function img(x, y) { return [(1 - t) * x + t * act(x), (1 - t) * y + t * act(y)]; }

    var lines = [];
    var k, j;
    for (k = -3; k <= 3; k += 0.5) {
      lines.push({ vert: true, k: k, path: p.path([[k, -3], [k, 3]], { stroke: BLUE, width: k === 0 ? 3 : 1.5 }) });
      lines.push({ vert: false, k: k, path: p.path([[-3, k], [3, k]], { stroke: PINK, width: k === 0 ? 3 : 1.5 }) });
    }
    for (j = 0; j < lines.length; j++) lines[j].path.el.setAttribute('opacity', '0.75');

    var link = p.line(pt.x, pt.y, pt.x, pt.y, { stroke: ORANGE, width: 2, dash: '5 5' });
    var imgPt = p.point(pt.x, pt.y, { r: 8, fill: ORANGE });
    var handle;

    var row2 = M4.el('div', { class: 'm4-row' }, root);
    var rIn = M4.el('span', { class: 'm4-readout' }, row2);
    var rOut = M4.el('span', { class: 'm4-readout' }, row2);

    function draw() {
      for (var i = 0; i < lines.length; i++) {
        var L = lines[i], pts = [];
        for (var s = 0; s <= 48; s++) {
          var u = -3 + 6 * s / 48;
          pts.push(L.vert ? img(L.k, u) : img(u, L.k));
        }
        L.path.set(pts);
      }
      var q = img(pt.x, pt.y);
      imgPt.set(q[0], q[1]);
      link.set(pt.x, pt.y, q[0], q[1]);
      rIn.innerHTML = M4.tex('\\mathbf{z} = ' + M4.col([fmt(pt.x, 1), fmt(pt.y, 1)]));
      rOut.innerHTML = M4.tex((mode === 'relu' ? '\\mathrm{ReLU}(\\mathbf{z})' : '\\sigma(\\mathbf{z})') + ' = ' + M4.col([fmt(act(pt.x), 2), fmt(act(pt.y), 2)]));
    }

    handle = p.handle(pt.x, pt.y, {
      color: INK, snap: 0.5, bounds: { xmin: -3, xmax: 3, ymin: -3, ymax: 3 },
      onDrag: function (x, y) { pt.x = x; pt.y = y; draw(); }
    });

    var slider;
    function setT(v) { t = v; draw(); }
    var bRelu = M4.button(row, 'ReLU', function () { pick('relu'); });
    var bSig = M4.button(row, 'Sigmoid', function () { pick('sigmoid'); });
    function pick(m) {
      mode = m;
      bRelu.classList.toggle('l4-s2-on', m === 'relu');
      bSig.classList.toggle('l4-s2-on', m === 'sigmoid');
      draw();
    }
    M4.button(row, 'Animate', function () {
      cancelAnimationFrame(raf);
      var t0 = null;
      function tick(now) {
        if (t0 === null) t0 = now;
        var u = Math.min(1, (now - t0) / 1600);
        var e = u * u * (3 - 2 * u);
        slider.set(e); setT(e);
        if (u < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, { primary: true });

    var sl = M4.el('div', { class: 'l4-s2-sliders' }, root);
    slider = M4.slider(sl, {
      min: 0, max: 1, step: 0.01, value: 0, label: 'amount applied',
      format: function (v) { return Math.round(v * 100) + '%'; },
      onInput: function (v) { cancelAnimationFrame(raf); setT(+v); }
    });
    M4.el('div', { class: 'm4-note', text: 'Black point: z (draggable). Orange point: its image. Blue lines were vertical, pink lines were horizontal.' }, root);
    pick('relu');
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
  }

  /* ---------- step 3: drag z so that ReLU(z) hits the target ---------- */
  function mountReluTarget(el, ctx) {
    var root = wrap(el);
    var holder = M4.el('div', { class: 'l4-s2-plane' }, root);
    var p = M4.plane(holder, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 520, height: 520 });
    var done = false;
    var ring = M4.svg('circle', { cx: p.x(0), cy: p.y(3), r: 16, fill: 'none', stroke: PINK, 'stroke-width': 4, 'stroke-dasharray': '6 5', opacity: 0.7 }, p.g);
    p.text(0.95, 3.35, 'target', { fill: PINK, size: 16, weight: 600 });
    var region = M4.svg('rect', { x: p.x(-4), y: p.y(4), width: p.x(-2) - p.x(-4), height: p.y(-4) - p.y(4), fill: BLUE, opacity: 0.07 }, p.g);
    p.text(-3, -3.6, 'z₁ ≤ −2', { fill: BLUE, size: 16, weight: 600 });
    var link = p.line(2, 1, 2, 1, { stroke: ORANGE, width: 2, dash: '5 5' });
    var imgPt = p.point(2, 1, { r: 9, fill: ORANGE });
    var row = M4.el('div', { class: 'm4-row' }, root);
    var rIn = M4.el('span', { class: 'm4-readout' }, row);
    var rOut = M4.el('span', { class: 'm4-readout' }, row);
    void region;

    function upd(x, y) {
      var a = relu(x), b = relu(y);
      imgPt.set(a, b); link.set(x, y, a, b);
      rIn.innerHTML = M4.tex('\\mathbf{z} = ' + M4.col([fmt(x, 1), fmt(y, 1)]));
      rOut.innerHTML = M4.tex('\\mathrm{ReLU}(\\mathbf{z}) = ' + M4.col([fmt(a, 1), fmt(b, 1)]));
    }
    function ok(x, y) { return x <= -2 + 0.05 && Math.abs(y - 3) < 0.13; }
    function win() {
      if (done) return;
      done = true;
      ring.setAttribute('fill', PINK); ring.setAttribute('fill-opacity', '0.3'); ring.setAttribute('stroke-dasharray', 'none');
      ctx.note('Every point \\((z_1, 3)\\) with \\(z_1 \\le 0\\) is folded onto \\((0, 3)\\): ReLU is not invertible there.');
      ctx.solved();
    }
    p.handle(2, 1, {
      color: INK, snap: 0.5, bounds: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 },
      onDrag: function (x, y) { upd(x, y); if (ok(x, y)) win(); },
      onEnd: function (x, y) {
        if (done) return;
        if (ok(x, y)) { win(); return; }
        var a = relu(x), b = relu(y);
        if (a === 0 && Math.abs(b - 3) < 0.13) ctx.note('The image is on the target, but \\(z_1 = ' + fmt(x, 1) + '\\) is not in the shaded region \\(z_1 \\le -2\\).');
        else if (a !== 0) ctx.note('\\(\\mathrm{ReLU}(z)_1 = ' + fmt(a, 1) + '\\), but the target has first coordinate 0. A negative \\(z_1\\) is needed.');
        else ctx.note('\\(\\mathrm{ReLU}(z)_2 = ' + fmt(b, 1) + '\\), but the target has second coordinate 3. Positive coordinates pass through unchanged.');
      }
    });
    upd(2, 1);
  }

  /* ---------- step 4: affine -> ReLU -> affine by hand ---------- */
  function mountCollapse(el, ctx) {
    var root = wrap(el);
    var card = M4.el('div', { class: 'm4-row' }, root);
    M4.el('span', { class: 'm4-chip', html: M4.tex('x = -1') }, card);
    M4.el('span', { class: 'm4-chip', html: M4.tex('W_1 = 2,\\; b_1 = 1') }, card);
    M4.el('span', { class: 'm4-chip', html: M4.tex('W_2 = 3,\\; b_2 = 2') }, card);
    M4.numberInput(root, {
      answer: 2, tolerance: 0.01, label: 'y =', placeholder: '?',
      onCorrect: function () {
        ctx.note('\\(z = 2\\cdot(-1) + 1 = -1\\), \\(\\mathrm{ReLU}(-1) = 0\\), \\(y = 3\\cdot 0 + 2 = 2\\). The collapsed map \\(6x + 5\\) would give \\(-1\\).');
        ctx.solved();
      },
      onWrong: function (v) {
        if (Math.abs(v - (-1)) < 0.01) ctx.wrong('−1 is the value of the collapsed affine map 6x + 5. Here ReLU acts on z = −1 before the second map.');
        else if (Math.abs(v - 0) < 0.01) ctx.wrong('0 is the hidden value h = ReLU(z). The second affine map still has to be applied.');
        else ctx.wrong('Compute z = W₁x + b₁ first, then h = max(0, z), then y = W₂h + b₂.');
      }
    });
  }

  /* ---------- step 5: neuron analogy, drag and drop ---------- */
  function mountNeuron(el, ctx) {
    var root = wrap(el);
    var pairs = [
      { key: 'in', bio: '<b>Dendrites</b> receive signals from other neurons', tok: 'inputs ' + M4.tex('x_i') },
      { key: 'w', bio: '<b>Synapses</b>: strong or weak, exciting or inhibiting', tok: 'weights ' + M4.tex('w_i') },
      { key: 'sum', bio: '<b>Cell body</b> adds everything up, fires above a threshold', tok: M4.tex('w^\\top x + b') },
      { key: 'act', bio: '<b>Firing rate</b>: never negative, saturates', tok: 'activation ' + M4.tex('\\sigma(\\cdot)') },
      { key: 'next', bio: '<b>Axon</b> passes the signal on to other neurons', tok: 'the next layer' }
    ];
    var order = [3, 0, 4, 2, 1];
    var grid = M4.el('div', { class: 'l4-s2-pairs' }, root);
    var slots = [], tokens = [], placed = 0;
    pairs.forEach(function (pr) {
      M4.el('div', { class: 'l4-s2-bio', html: pr.bio }, grid);
      var s = M4.el('div', { class: 'm4-slot l4-s2-slotbox' }, grid);
      s.setAttribute('data-key', pr.key);
      slots.push(s);
    });
    var bank = M4.el('div', { class: 'l4-s2-bank' }, root);
    order.forEach(function (i) {
      var tkn = M4.el('div', { class: 'm4-token l4-s2-tok', html: pairs[i].tok }, bank);
      tkn.setAttribute('data-key', pairs[i].key);
      tokens.push(tkn);
    });
    var msg = {
      'in': 'Dendrites are where signals arrive. They correspond to what the unit receives.',
      w: 'Synapses set how strongly, and with which sign, each incoming signal counts.',
      sum: 'The cell body sums the weighted signals and compares the sum with a threshold.',
      act: 'The firing rate is the output strength after the threshold, not the raw sum.',
      next: 'The axon carries the output onwards to other neurons.'
    };
    M4.dragDrop({
      tokens: tokens, slots: slots,
      onDrop: function (tokenEl, slotEl) {
        if (slotEl.classList.contains('filled')) return;
        if (tokenEl.getAttribute('data-key') === slotEl.getAttribute('data-key')) {
          slotEl.appendChild(tokenEl);
          slotEl.classList.add('filled');
          tokenEl.classList.add('l4-s2-done', 'm4-pop');
          tokenEl.style.pointerEvents = 'none';
          placed += 1;
          ctx.note(placed + ' of 5 matched.');
          if (placed === 5) {
            ctx.note('All five matched. The bias \\(b\\) plays the role of the negative threshold.');
            ctx.solved();
          }
        } else {
          ctx.wrong(msg[slotEl.getAttribute('data-key')]);
        }
      },
      onMiss: function () { ctx.note('Drop each tile onto one of the dashed boxes on the right.'); }
    });
  }

  /* ---------- steps 6 and 7: rings, lifted into a third coordinate ---------- */
  var RING = (function () {
    var pts = [], i, r, a;
    for (i = 0; i < 16; i++) {
      r = 1 + 0.2 * Math.sin(i * 2.3); a = 2 * Math.PI * i / 16;
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), r: r, inner: true });
    }
    for (i = 0; i < 28; i++) {
      r = 3 + 0.3 * Math.sin(i * 1.7); a = 2 * Math.PI * i / 28 + 0.1;
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), r: r, inner: false });
    }
    return pts;
  })();
  function bump(r) { return 3 * Math.exp(-r * r / 4); }

  function mountRings(el, ctx, exercise) {
    var root = wrap(el);
    var grid = M4.el('div', { class: 'm4-grid2', style: 'width:100%;' }, root);
    var colL = M4.el('div', { class: 'l4-s2-half' }, grid);
    var colR = M4.el('div', { class: 'l4-s2-half' }, grid);
    M4.el('div', { class: 'l4-s2-cap', text: 'Input space (x₁, x₂)' }, colL);
    M4.el('div', { class: 'l4-s2-cap', text: 'Hidden space, side view (x₁, h₃)' }, colR);
    var pl = M4.plane(colL, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 360, height: 360, labels: false });
    var pr = M4.plane(colR, { xmin: -4, xmax: 4, ymin: -1, ymax: 4, width: 360, height: 360, labels: false });
    var lift = exercise ? 1 : 0, c = exercise ? 2.8 : 1.2, done = false;

    var boundary = pl.path([[0, 0], [0, 0]], { stroke: GREEN, width: 4, closed: true });
    var planeLine = pr.line(-4, c, 4, c, { stroke: GREEN, width: 4 });
    var planeLab = pr.text(2.6, c + 0.3, 'plane h₃ = c', { fill: GREEN, size: 15, weight: 600 });
    var dotsR = [];
    RING.forEach(function (q) {
      pl.point(q.x, q.y, { r: 6, fill: q.inner ? PINK : BLUE });
      dotsR.push(pr.point(q.x, 0, { r: 6, fill: q.inner ? PINK : BLUE }));
    });
    var row = M4.el('div', { class: 'm4-row' }, root);
    var rA = M4.el('span', { class: 'm4-readout' }, row);
    var rB = M4.el('span', { class: 'm4-readout' }, row);
    var rC = M4.el('span', { class: 'm4-readout' }, row);

    function errors() {
      var ei = 0, eo = 0;
      RING.forEach(function (q) {
        var h = lift * bump(q.r);
        if (q.inner && !(h > c)) ei++;
        if (!q.inner && !(h < c)) eo++;
      });
      return [ei, eo];
    }
    function draw() {
      RING.forEach(function (q, i) { dotsR[i].set(q.x, lift * bump(q.r)); });
      planeLine.set(-4, c, 4, c);
      planeLab.set(2.6, c + (c > 3.4 ? -0.35 : 0.3), 'plane h₃ = c');
      if (3 * lift > c && c > 0) {
        var rad = 2 * Math.sqrt(Math.log(3 * lift / c)), pts = [];
        for (var i = 0; i < 72; i++) pts.push([rad * Math.cos(i * Math.PI / 36), rad * Math.sin(i * Math.PI / 36)]);
        boundary.set(pts); boundary.el.style.display = '';
      } else { boundary.el.style.display = 'none'; }
      var e = errors();
      rA.textContent = exercise ? 'c = ' + fmt(c, 1) : 'lift = ' + Math.round(lift * 100) + '%';
      rB.textContent = 'inner ring wrong: ' + e[0] + ' / 16';
      rC.textContent = 'outer ring wrong: ' + e[1] + ' / 28';
    }
    var sl = M4.el('div', { class: 'l4-s2-sliders' }, root);
    if (!exercise) {
      M4.slider(sl, {
        min: 0, max: 1, step: 0.01, value: 0, label: 'lift into h₃',
        format: function (v) { return Math.round(v * 100) + '%'; },
        onInput: function (v) { lift = +v; draw(); }
      });
      M4.el('div', { class: 'm4-note', text: 'Pink: inner ring. Blue: outer ring. Green: the flat plane h₃ = 1.2 on the right, and the same boundary seen in input space on the left.' }, root);
    } else {
      M4.slider(sl, {
        min: 0, max: 3.6, step: 0.1, value: c, label: 'plane height c',
        format: function (v) { return fmt(+v, 1); },
        onInput: function (v) { c = +v; draw(); }
      });
      M4.button(root, 'Check', function () {
        if (done) return;
        var e = errors();
        if (e[0] === 0 && e[1] === 0) {
          done = true;
          var rad = 2 * Math.sqrt(Math.log(3 / c));
          ctx.note('The plane \\(h_3 = ' + fmt(c, 1) + '\\) separates the rings. In input space it is the circle of radius \\(' + fmt(rad, 2) + '\\).');
          ctx.solved();
        } else if (e[0] > 0) {
          ctx.wrong(e[0] + ' inner points lie on or below the plane. Lower c.');
        } else {
          ctx.wrong(e[1] + ' outer points lie on or above the plane. Raise c.');
        }
      }, { primary: true });
    }
    draw();
  }

  /* ---------- step 9: piecewise linear fit with n ReLU units ---------- */
  function target(x) { return Math.sin(1.5 * x) + 0.3 * x; }
  function mountFit(el, ctx) {
    var root = wrap(el);
    var row = M4.el('div', { class: 'm4-row' }, root);
    var holder = M4.el('div', { class: 'l4-s2-plane' }, root);
    var p = M4.plane(holder, { xmin: -4, xmax: 4, ymin: -3, ymax: 3, width: 520, height: 400 });
    var ghost = p.fn(target, { stroke: MUTED, width: 5 });
    ghost.el.setAttribute('opacity', '0.35');
    var fit = p.path([[-4, 0], [4, 0]], { stroke: PINK, width: 3.5 });
    var dots = [], i;
    for (i = 0; i < 10; i++) dots.push(p.point(0, 0, { r: 5.5, fill: ORANGE }));
    var row2 = M4.el('div', { class: 'm4-row' }, root);
    var rN = M4.el('span', { class: 'm4-readout' }, row2);
    var rE = M4.el('span', { class: 'm4-readout' }, row2);
    var btns = [], raf = 0, cur = null;

    function knots(n) {
      var pts = [];
      for (var k = 0; k <= n; k++) { var x = -4 + 8 * k / n; pts.push([x, target(x)]); }
      return pts;
    }
    function evalPL(pts, x) {
      var n = pts.length - 1, u = (x + 4) / 8 * n, k = Math.min(n - 1, Math.max(0, Math.floor(u))), f = u - k;
      return pts[k][1] * (1 - f) + pts[k + 1][1] * f;
    }
    function maxErr(pts) {
      var m = 0;
      for (var s = 0; s <= 800; s++) { var x = -4 + 8 * s / 800; m = Math.max(m, Math.abs(evalPL(pts, x) - target(x))); }
      return m;
    }
    function show(n, idx) {
      cancelAnimationFrame(raf);
      var pts = knots(n), from = cur, t0 = null;
      btns.forEach(function (b, j) { b.classList.toggle('l4-s2-on', j === idx); });
      for (var d = 0; d < 10; d++) {
        if (n <= 10 && d < n) { dots[d].set(pts[d][0], pts[d][1]); dots[d].el.style.display = ''; }
        else dots[d].el.style.display = 'none';
      }
      rN.textContent = n + (n === 1 ? ' ReLU unit, ' : ' ReLU units, ') + n + (n === 1 ? ' linear piece' : ' linear pieces');
      rE.textContent = 'largest error: ' + fmt(maxErr(pts), 3);
      function frame(now) {
        if (t0 === null) t0 = now;
        var u = Math.min(1, (now - t0) / 500), e = u * u * (3 - 2 * u), out = [];
        for (var s = 0; s <= 200; s++) {
          var x = -4 + 8 * s / 200, b = evalPL(pts, x), a = from ? evalPL(from, x) : b;
          out.push([x, a + (b - a) * e]);
        }
        fit.set(u < 1 ? out : pts);
        if (u < 1) raf = requestAnimationFrame(frame); else cur = pts;
      }
      raf = requestAnimationFrame(frame);
    }
    [1, 3, 10, 50].forEach(function (n, idx) {
      btns.push(M4.button(row, n + (n === 1 ? ' unit' : ' units'), function () { show(n, idx); }));
    });
    M4.el('div', { class: 'm4-note', text: 'Grey: the target curve. Pink: the network output. Orange dots: the kinks, one per unit (hidden for 50 units).' }, root);
    show(1, 0);
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
  }

  /* ---------- step 10: cost of finite differences ---------- */
  function mountCost(el, ctx) {
    var root = wrap(el);
    M4.numberInput(root, {
      answer: 5000, tolerance: 0.5, label: 'forward passes =', placeholder: '?',
      onCorrect: function () {
        ctx.note('5000 passes for finite differences, against a cost of about 2 forward passes for backpropagation: a factor of about 2500.');
        ctx.solved();
      },
      onWrong: function (v) {
        if (Math.abs(v - 2) < 0.5 || Math.abs(v - 1) < 0.5) ctx.wrong('That is the order of the cost of backpropagation. Finite differences reruns the network once for each nudged weight.');
        else if (Math.abs(v - 5001) < 0.5) ctx.wrong('The baseline pass is not counted here. Count only the nudged passes.');
        else ctx.wrong('One weight is nudged per forward pass, and every weight needs its own pass.');
      }
    });
  }

  /* ---------- step 11: build a piecewise linear function from three ReLU units ---------- */
  function mountBuild(el, ctx) {
    var root = wrap(el);
    var holder = M4.el('div', { class: 'l4-s2-plane' }, root);
    var p = M4.plane(holder, { xmin: -4, xmax: 4, ymin: -2, ymax: 6, width: 520, height: 520 });
    var T = [2, -3, 1], a = [1, 0, 0], done = false, touched = false;
    function pts(c) {
      return [-4, -2, 0, 2, 4].map(function (x) {
        return [x, c[0] * relu(x + 2) + c[1] * relu(x) + c[2] * relu(x - 2)];
      });
    }
    var ghost = p.path(pts(T), { stroke: MUTED, width: 9 });
    ghost.el.setAttribute('opacity', '0.28');
    p.text(-1.9, 3.1, 'target', { fill: MUTED, size: 16, weight: 600, anchor: 'end' });
    var cur = p.path(pts(a), { stroke: PINK, width: 4 });
    var kd = [-2, 0, 2].map(function (x) { return p.point(x, 0, { r: 6, fill: ORANGE }); });
    var row = M4.el('div', { class: 'm4-row' }, root);
    var ro = [0, 1, 2].map(function () { return M4.el('span', { class: 'm4-readout' }, row); });
    var names = ['[−2, 0]', '[0, 2]', '[2, 4]'];
    function draw() {
      var q = pts(a);
      cur.set(q);
      kd.forEach(function (d, i) { d.set(q[i + 1][0], q[i + 1][1]); });
      var s = [a[0], a[0] + a[1], a[0] + a[1] + a[2]];
      var ts = [2, -1, 0], bad = -1;
      s.forEach(function (v, i) {
        ro[i].textContent = 'slope on ' + names[i] + ': ' + fmt(v, 1);
        var hit = Math.abs(v - ts[i]) < 1e-6;
        ro[i].style.borderColor = hit ? GREEN : '';
        if (bad < 0 && !hit) bad = i;
      });
      if (done) return;
      if (bad < 0) {
        done = true;
        cur.el.setAttribute('stroke', GREEN);
        ctx.note('\\(f(x) = 2\\,\\mathrm{ReLU}(x+2) - 3\\,\\mathrm{ReLU}(x) + \\mathrm{ReLU}(x-2)\\). Each coefficient is the change of slope at its kink.');
        ctx.solved();
      } else if (touched) {
        ctx.note('The slope on \\(' + ['[-2, 0]', '[0, 2]', '[2, 4]'][bad] + '\\) is \\(' + fmt(s[bad], 1) + '\\). The target has slope \\(' + ts[bad] + '\\) there.');
      }
    }
    var sl = M4.el('div', { class: 'l4-s2-sliders' }, root);
    ['a₁  (kink at −2)', 'a₂  (kink at 0)', 'a₃  (kink at 2)'].forEach(function (lab, i) {
      M4.slider(sl, {
        min: -3, max: 3, step: 0.5, value: a[i], label: lab,
        format: function (v) { return fmt(+v, 1); },
        onInput: function (v) { a[i] = +v; touched = true; draw(); }
      });
    });
    draw();
  }

  M4.lesson({
    id: 'l4-s2',
    module: 'l4',
    title: 'Nonlinearities and hidden units',
    summary: 'Activation functions such as ReLU and sigmoid bend space. A hidden layer can then separate data that no affine map can separate, and training such a network requires backpropagation.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>Stacked affine maps \\(z = Wx + b\\) collapse into a single affine map, so depth alone adds nothing. A nonlinearity applied to each coordinate changes this.</p>' +
          '<p>This session trains you to describe how ReLU and sigmoid deform the plane, read a hidden unit as one logistic regression, explain why a ReLU network is piecewise linear, and state why gradient descent on a network needs backpropagation.</p>'
      },
      {
        kind: 'explore',
        title: 'Nonlinearities and the grid',
        html: '<p>The rectified linear unit is \\(\\mathrm{ReLU}(z) = \\max(0, z)\\): slope 0 for negative \\(z\\), slope 1 for positive \\(z\\). The sigmoid is \\(\\sigma(z) = \\dfrac{1}{1 + e^{-z}}\\), which maps every real number into \\((0, 1)\\). Both are applied to each coordinate of \\(z = \\begin{pmatrix}z_1\\\\z_2\\end{pmatrix}\\) separately.</p>' +
          '<p>Under ReLU the first quadrant stays in place and everything else is folded onto the axes. Under the sigmoid the whole plane is squashed smoothly into the unit square \\((0,1)^2\\), and straight lines bend.</p>',
        mount: mountGrid
      },
      {
        kind: 'exercise',
        title: 'Folding',
        html: '<p>The black handle is a point \\(z = \\begin{pmatrix}z_1\\\\z_2\\end{pmatrix}\\). The orange point is \\(\\mathrm{ReLU}(z) = \\begin{pmatrix}\\max(0, z_1)\\\\\\max(0, z_2)\\end{pmatrix}\\). Place \\(z\\) inside the shaded region \\(z_1 \\le -2\\) so that \\(\\mathrm{ReLU}(z)\\) lands on the target \\((0, 3)\\).</p>',
        hint: 'A negative first coordinate becomes 0. A positive second coordinate is left unchanged, so it must already equal 3.',
        mount: mountReluTarget
      },
      {
        kind: 'exercise',
        title: 'Affine, ReLU, affine',
        html: '<p>Two affine maps in a row satisfy \\(W_2(W_1 x + b_1) + b_2 = (W_2 W_1)x + (W_2 b_1 + b_2)\\). With a ReLU in between, the network is \\(y = W_2\\,\\mathrm{ReLU}(W_1 x + b_1) + b_2\\), and \\(W_2\\) cannot be pulled inside the maximum.</p>' +
          '<p>Take the one-dimensional case with the numbers below, for which the collapsed map would be \\(6x + 5\\). Compute the output \\(y\\) of the network with the ReLU in place.</p>',
        hint: 'First \\(z = W_1 x + b_1 = 2\\cdot(-1) + 1\\). Then \\(h = \\max(0, z)\\). Then \\(y = W_2 h + b_2\\).',
        mount: mountCollapse
      },
      {
        kind: 'exercise',
        title: 'The name neuron',
        html: '<p>One hidden unit computes \\(\\sigma(w^\\top x + b)\\), where \\(x\\) is the input vector, \\(w\\) a weight vector, \\(b\\) a bias and \\(\\sigma\\) the activation function. With a sigmoid activation this is one logistic regression. The name neuron comes from a loose analogy with a biological nerve cell.</p>' +
          '<p>Drag each part of the hidden unit onto the part of the biological neuron it corresponds to. The analogy is loose: real neurons spike in time, and the brain is not known to run backpropagation.</p>',
        hint: 'Follow the signal: it arrives (inputs), is scaled with a sign (weights), is summed and compared with a threshold, is emitted with some strength, and is passed on.',
        mount: mountNeuron
      },
      {
        kind: 'explore',
        title: 'Width and the rings',
        html: '<p>Consider two concentric rings of points. A network with 2 hidden units per layer can stretch and bend the plane but cannot tear it, so the inner ring stays inside the outer one and no straight line separates them.</p>' +
          '<p>With 3 hidden units the plane is mapped into three dimensions. The sketch shows this schematically with a third hidden coordinate \\(h_3\\) that is large near the origin: the inner ring rises, and a flat plane \\(h_3 = c\\) separates the rings. Increase the lift. The boundary then appears in input space.</p>',
        mount: function (el, ctx) { mountRings(el, ctx, false); }
      },
      {
        kind: 'exercise',
        title: 'Input space and hidden space',
        html: '<p>The last layer of a network is a logistic regression in hidden space, so its decision boundary there is flat. Seen from input space, the same boundary is curved: a straight line in hidden space is a curved boundary in input space.</p>' +
          '<p>Choose the height \\(c\\) of the plane \\(h_3 = c\\) so that every inner point lies above it and every outer point lies below it, then press Check.</p>',
        hint: 'The inner points sit at heights of roughly 2.1 to 2.6 and the outer points below 0.5. Any plane strictly between these two bands works.',
        mount: function (el, ctx) { mountRings(el, ctx, true); }
      },
      {
        kind: 'exercise',
        title: 'Learned features and their shapes',
        html: '<p>A neural network is logistic regression on learned features \\(\\varphi(x) = \\sigma(W_1 x + b_1)\\), in place of the hand-picked features \\(\\varphi(x)\\) in \\(w^\\top \\varphi(x)\\). For an input \\(x \\in \\mathbb{R}^d\\), the hidden vector is \\(h = \\sigma(W_1 x + b_1) \\in \\mathbb{R}^m\\), and the output layer \\(W_2 \\in \\mathbb{R}^{k \\times m}\\) feeds a softmax over \\(k\\) classes.</p>' +
          '<p>For the rings network with \\(d = 2\\) inputs, \\(m = 3\\) hidden units and \\(k = 2\\) classes, what is the shape of \\(W_1\\)?</p>',
        hint: 'Each row of \\(W_1\\) belongs to one hidden unit and holds one weight per input coordinate.',
        mount: function (el, ctx) {
          var root = wrap(el);
          M4.choices(root, {
            options: ['\\(2 \\times 3\\)', '\\(3 \\times 2\\)', '\\(3 \\times 3\\)', '\\(2 \\times 2\\)'],
            correct: 1,
            onCorrect: function () {
              ctx.note('\\(W_1 \\in \\mathbb{R}^{m \\times d} = \\mathbb{R}^{3 \\times 2}\\): three rows, one per hidden unit, each asking one question of the two inputs.');
              ctx.solved();
            },
            onWrong: function (i) {
              if (i === 0) ctx.wrong('2 × 3 is the shape of W₂ here (k × m). W₁ maps 2 inputs to 3 hidden units.');
              else ctx.wrong('W₁ must accept a vector of length d = 2 and return a vector of length m = 3.');
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Piecewise linear functions',
        html: '<p>With one input \\(x\\), a ReLU unit \\(\\mathrm{ReLU}(wx + b)\\) is flat on one side of the point \\(x = -b/w\\) and linear on the other: one unit is one fold, which appears as one kink in the graph. A weighted sum of such units is therefore a piecewise linear function.</p>' +
          '<p>More units give more kinks and a closer fit. The universal approximation theorem (Cybenko 1989, Hornik 1991) states that one hidden layer with enough units approximates any continuous function as closely as desired. It does not say how many units are needed, whether gradient descent finds the weights, or that the result generalizes.</p>',
        mount: mountFit
      },
      {
        kind: 'exercise',
        title: 'The need for backpropagation',
        html: '<p>Gradient descent needs the partial derivative \\(\\partial L / \\partial w\\) of the loss \\(L\\) for every weight \\(w\\). Finite differences estimates one such derivative by nudging one weight and rerunning the network, which costs one forward pass per weight. Backpropagation delivers all gradients for the cost of about two forward passes.</p>' +
          '<p>A small network has 5000 weights. How many nudged forward passes does finite differences need for a single gradient (not counting the baseline pass)?</p>',
        hint: 'Each nudged forward pass yields the derivative for exactly one weight.',
        mount: mountCost
      },
      {
        kind: 'exercise',
        title: 'A function with three kinks',
        html: '<p>The network \\(f(x) = a_1\\,\\mathrm{ReLU}(x + 2) + a_2\\,\\mathrm{ReLU}(x) + a_3\\,\\mathrm{ReLU}(x - 2)\\) has three hidden units with kinks at \\(x = -2\\), \\(0\\) and \\(2\\), and output weights \\(a_1, a_2, a_3\\). Set the output weights so that the pink graph coincides with the grey target.</p>',
        hint: 'To the right of a kink, that unit adds its coefficient to the slope. The target slopes are 2, then −1, then 0, so \\(a_1 = 2\\), \\(a_1 + a_2 = -1\\) and \\(a_1 + a_2 + a_3 = 0\\).',
        mount: mountBuild
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>A coordinate-wise nonlinearity bends space: ReLU folds everything outside the first quadrant onto the axes, the sigmoid squashes the plane into \\((0,1)^2\\). Affine, nonlinearity, affine no longer collapses into one affine map.</li>' +
          '<li>A network is logistic regression on learned features \\(\\varphi(x) = \\sigma(W_1 x + b_1)\\): a flat boundary in hidden space is a curved boundary in input space, and enough width (3 units for the rings) is needed to untangle the data.</li>' +
          '<li>A ReLU network is piecewise linear, with one kink per unit, and enough units approximate any continuous function. Training it needs \\(\\partial L/\\partial w\\) for every weight, which backpropagation provides for about two forward passes instead of one pass per weight.</li>' +
          '</ul>'
      }
    ]
  });
})();
