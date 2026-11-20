(function () {
  'use strict';
  var C = M4.colors;
  var PINK = C.pink, BLUE = C.blue, RED = C.red, GREEN = C.green, ORANGE = C.orange;

  (function injectCss() {
    if (document.getElementById('l4-s1-style')) return;
    var s = document.createElement('style');
    s.id = 'l4-s1-style';
    s.textContent =
      '.l4-s1-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;}' +
      '.l4-s1-svg{width:100%;max-width:660px;height:auto;display:block;background:#fff;border:2px solid ' + C.line + ';border-radius:18px;}' +
      '.l4-s1-eq{font-size:20px;text-align:center;}' +
      '.l4-s1-slot{min-width:72px;min-height:56px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;}' +
      '.l4-s1-tok{min-width:60px;text-align:center;font-size:24px;font-weight:700;padding:10px 14px;}' +
      '.l4-s1-sliders{width:100%;max-width:520px;display:flex;flex-direction:column;gap:8px;}' +
      '.l4-s1-on{outline:3px solid ' + PINK + ';}';
    document.head.appendChild(s);
  })();

  function fmt(v, d) {
    var s = (Math.round(v * 100) / 100).toFixed(d === undefined ? 1 : d);
    return s.replace('-', '−');
  }
  function num(v) { // compact number for KaTeX
    var r = Math.round(v * 100) / 100;
    return String(r);
  }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
  function wrap(el) { return M4.el('div', { class: 'l4-s1-wrap' }, el); }
  function readoutRow(parent, n) {
    var row = M4.el('div', { class: 'm4-row' }, parent), out = [];
    for (var i = 0; i < n; i++) out.push(M4.el('span', { class: 'm4-readout' }, row));
    return out;
  }

  // ---------- data ----------
  function ringData() {
    var pts = [], i, a;
    for (i = 0; i < 10; i++) { a = 2 * Math.PI * i / 10; pts.push({ x: Math.cos(a), y: Math.sin(a), c: 0 }); }
    for (i = 0; i < 16; i++) { a = 2 * Math.PI * i / 16 + 0.2; pts.push({ x: 2.5 * Math.cos(a), y: 2.5 * Math.sin(a), c: 1 }); }
    return pts;
  }
  var OFF = [[0, 0], [0.7, 0.3], [-0.6, 0.5], [0.3, -0.7], [-0.4, -0.5], [0.8, -0.4], [-0.8, -0.1], [0.1, 0.8], [0.5, 0.7]];
  function cloudData(bx, by, rx, ry) {
    var pts = [];
    OFF.forEach(function (o) {
      pts.push({ x: bx + o[0], y: by + o[1], c: 1 });
      pts.push({ x: rx - o[0], y: ry + o[1], c: 0 });
    });
    return pts;
  }
  function colOf(c) { return c === 1 ? BLUE : RED; }

  // ---------- number line widget (1D affine map) ----------
  function numberLine(parent, opts) {
    var W = 640, H = 270, L = 40, R = 600, YT = 70, YB = 190;
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'l4-s1-svg' }, parent);
    function sx(v) { return L + (v + 6) / 12 * (R - L); }
    function s01(v) { return L + v * (R - L); }
    function txt(x, y, s, fill, size, weight) {
      var t = M4.svg('text', { x: x, y: y, 'text-anchor': 'middle', 'font-size': size || 15, fill: fill || C.muted, 'font-weight': weight || 500 }, svg);
      t.textContent = s; return t;
    }
    function axis(y, ticks, scale, faint) {
      M4.svg('line', { x1: L - 12, y1: y, x2: R + 12, y2: y, stroke: faint ? '#c9c6bd' : C.ink, 'stroke-width': faint ? 2 : 3, 'stroke-linecap': 'round' }, svg);
      ticks.forEach(function (t) {
        M4.svg('line', { x1: scale(t), y1: y - 6, x2: scale(t), y2: y + 6, stroke: faint ? '#c9c6bd' : C.ink, 'stroke-width': 2 }, svg);
        txt(scale(t), y + (faint ? -14 : 28), fmt(t, t % 1 === 0 ? 0 : 1), C.muted, 15);
      });
    }
    function draw(w, b, sig) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var clip = M4.svg('clipPath', { id: 'l4-s1-clip' }, M4.svg('defs', {}, svg));
      M4.svg('rect', { x: L - 16, y: 0, width: R - L + 32, height: H }, clip);
      txt(W / 2, 26, 'input x', C.muted, 16, 700);
      txt(W / 2, H - 14, sig ? 'output σ(wx + b)' : 'output z = wx + b', PINK, 16, 700);
      axis(YT, [-6, -4, -2, 0, 2, 4, 6], sx, true);
      if (sig) {
        axis(YB, [0, 0.5, 1], s01, false);
        M4.svg('line', { x1: s01(0.5), y1: YB - 26, x2: s01(0.5), y2: YB + 8, stroke: ORANGE, 'stroke-width': 3, 'stroke-dasharray': '6 5' }, svg);
      } else {
        axis(YB, [-6, -4, -2, 0, 2, 4, 6], sx, false);
      }
      var g = M4.svg('g', { 'clip-path': 'url(#l4-s1-clip)' }, svg);
      if (opts.targets && !sig) {
        opts.targets.forEach(function (t) {
          M4.svg('circle', { cx: sx(t), cy: YB, r: 14, fill: 'none', stroke: PINK, 'stroke-width': 3, 'stroke-dasharray': '5 4', opacity: 0.6 }, g);
        });
      }
      opts.points.forEach(function (p) {
        var z = w * p.x + b, px = sig ? s01(sigmoid(z)) : sx(z);
        M4.svg('line', { x1: sx(p.x), y1: YT, x2: px, y2: YB, stroke: p.col, 'stroke-width': 1.5, opacity: 0.35 }, g);
        M4.svg('circle', { cx: sx(p.x), cy: YT, r: 6, fill: p.col, opacity: 0.4 }, g);
        M4.svg('circle', { cx: px, cy: YB, r: 9, fill: p.col, stroke: '#fff', 'stroke-width': 2 }, g);
      });
    }
    return { draw: draw };
  }
  var EXAM = [1, 1.5, 2, 2.5].map(function (x) { return { x: x, col: RED }; })
    .concat([3.5, 4, 4.5, 5].map(function (x) { return { x: x, col: BLUE }; }));

  // ---------- affine grid widget (2D) ----------
  function affineWidget(parent, ctx, o) {
    var range = o.range || 5, half = o.half || 3, snap = o.snap === undefined ? 0.5 : o.snap;
    var p = M4.plane(parent, { xmin: -range, xmax: range, ymin: -range, ymax: range, width: 520, height: 520 });
    var st = { W: [[1, 0], [0, 1]], b: [0, 0] };
    function ap(M, t, x, y) { return [M[0][0] * x + M[0][1] * y + t[0], M[1][0] * x + M[1][1] * y + t[1]]; }
    var segs = [], k;
    for (k = -half; k <= half; k++) { segs.push([k, -half, k, half]); segs.push([-half, k, half, k]); }
    if (o.ghost) {
      segs.forEach(function (s) {
        var a = ap(o.ghost.W, o.ghost.b, s[0], s[1]), c = ap(o.ghost.W, o.ghost.b, s[2], s[3]);
        p.line(a[0], a[1], c[0], c[1], { stroke: BLUE, width: 5 }).el.setAttribute('opacity', '0.22');
      });
      p.point(o.ghost.b[0], o.ghost.b[1], { r: 9, fill: BLUE }).el.setAttribute('opacity', '0.35');
    }
    var lines = segs.map(function (s) {
      var l = p.line(s[0], s[1], s[2], s[3], { stroke: PINK, width: (s[0] === 0 && s[2] === 0) || (s[1] === 0 && s[3] === 0) ? 3.5 : 1.5 });
      l.el.setAttribute('opacity', '0.75');
      return l;
    });
    var data = o.rings ? ringData() : [];
    var dots = data.map(function (d) { return p.point(d.x, d.y, { r: 6, fill: colOf(d.c) }); });
    var a1 = p.arrow(0, 0, 1, 0, { stroke: PINK, width: 5 });
    var a2 = p.arrow(0, 0, 0, 1, { stroke: GREEN, width: 5 });
    function fromHandles(which, x, y) {
      if (which === 0) { st.b = [x, y]; }
      else if (which === 1) { st.W = [[x - st.b[0], st.W[0][1]], [y - st.b[1], st.W[1][1]]]; }
      else { st.W = [[st.W[0][0], x - st.b[0]], [st.W[1][0], y - st.b[1]]]; }
      render(which); if (o.onChange) o.onChange(st, true);
    }
    var hb = p.handle(0, 0, { color: ORANGE, r: 12, snap: snap, onDrag: function (x, y) { fromHandles(0, x, y); }, onEnd: function () { if (o.onEnd) o.onEnd(st); } });
    var h1 = p.handle(1, 0, { color: PINK, r: 12, snap: snap, onDrag: function (x, y) { fromHandles(1, x, y); }, onEnd: function () { if (o.onEnd) o.onEnd(st); } });
    var h2 = p.handle(0, 1, { color: GREEN, r: 12, snap: snap, onDrag: function (x, y) { fromHandles(2, x, y); }, onEnd: function () { if (o.onEnd) o.onEnd(st); } });
    function render(skip) {
      var W = st.W, b = st.b;
      segs.forEach(function (s, i) {
        var a = ap(W, b, s[0], s[1]), c = ap(W, b, s[2], s[3]);
        lines[i].set(a[0], a[1], c[0], c[1]);
      });
      data.forEach(function (d, i) { var q = ap(W, b, d.x, d.y); dots[i].set(q[0], q[1]); });
      var c1 = [b[0] + W[0][0], b[1] + W[1][0]], c2 = [b[0] + W[0][1], b[1] + W[1][1]];
      a1.set(b[0], b[1], c1[0], c1[1]); a2.set(b[0], b[1], c2[0], c2[1]);
      if (skip !== 0) hb.set(b[0], b[1]);
      if (skip !== 1) h1.set(c1[0], c1[1]);
      if (skip !== 2) h2.set(c2[0], c2[1]);
    }
    var raf = 0;
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
    function animateTo(W, b) {
      cancelAnimationFrame(raf);
      var W0 = st.W, b0 = st.b, t0 = null;
      function mix(a, c, t) { return a + (c - a) * t; }
      function frame(now) {
        if (t0 === null) t0 = now;
        var u = Math.min(1, (now - t0) / 700), e = u * u * (3 - 2 * u);
        st.W = [[mix(W0[0][0], W[0][0], e), mix(W0[0][1], W[0][1], e)], [mix(W0[1][0], W[1][0], e), mix(W0[1][1], W[1][1], e)]];
        st.b = [mix(b0[0], b[0], e), mix(b0[1], b[1], e)];
        render(-1); if (o.onChange) o.onChange(st, false);
        if (u < 1) raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }
    render(-1);
    return { state: st, animateTo: animateTo, plane: p };
  }
  function matTex(st) {
    var W = st.W, b = st.b;
    return 'W = \\begin{pmatrix}' + num(W[0][0]) + ' & ' + num(W[0][1]) + '\\\\ ' + num(W[1][0]) + ' & ' + num(W[1][1]) +
      '\\end{pmatrix},\\quad b = \\begin{pmatrix}' + num(b[0]) + '\\\\ ' + num(b[1]) + '\\end{pmatrix}';
  }

  // ---------- projection widget (2D logistic regression) ----------
  function unit(w) { var n = Math.hypot(w[0], w[1]); return n < 1e-6 ? null : [w[0] / n, w[1] / n]; }

  M4.lesson({
    id: 'l4-s1',
    module: 'l4',
    title: 'Affine maps as moving grids',
    summary: 'What wx + b, logistic regression and a layer Wx + b do geometrically, and why stacking affine layers gains nothing.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>Gradient descent finds good weights once a model and its gradient are given. The model itself has a geometric reading: the map \\(x \\mapsto wx + b\\) on a number line, logistic regression \\(\\sigma(w^\\top x + b)\\) on the plane, and the affine map \\(z = Wx + b\\) that moves a whole grid.</p>' +
          '<p>In this lesson you will read a weight matrix as a transformation of space, compute the single affine map that equals two affine maps applied in sequence, and state why affine maps alone cannot separate every data set.</p>'
      },
      {
        kind: 'explore',
        title: 'Hand-picked and learned features',
        html: '<p>Linear models so far used hand-picked features, for example \\(\\phi(x) = (1, x, x^2, x^3)\\) in \\(w^\\top \\phi(x)\\). Logistic regression \\(\\sigma(w^\\top x + b)\\) on raw two-dimensional inputs has a straight decision boundary. The data below form two rings, red inside and blue outside. Move the line and observe the best accuracy it can reach.</p>' +
          '<p>The hand-made feature \\(x_1^2 + x_2^2\\) would separate the rings, but for text or images nobody knows the right \\(\\phi\\). The idea of neural networks is to learn \\(\\phi\\).</p>',
        mount: function (el, ctx) {
          var box = wrap(el);
          var p = M4.plane(box, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 480, height: 480 });
          var data = ringData();
          var line = p.line(0, -6, 0, 6, { stroke: PINK, width: 4 });
          var dots = data.map(function (d) { return p.point(d.x, d.y, { r: 8, fill: colOf(d.c) }); });
          var out = readoutRow(box, 2);
          var th = 0, c = 0;
          function upd() {
            var n = [Math.cos(th), Math.sin(th)], t = [-n[1], n[0]];
            line.set(c * n[0] - 8 * t[0], c * n[1] - 8 * t[1], c * n[0] + 8 * t[0], c * n[1] + 8 * t[1]);
            var side = data.map(function (d) { return d.x * n[0] + d.y * n[1] > c ? 1 : 0; });
            var ok = 0; side.forEach(function (s, i) { if (s === data[i].c) ok++; });
            var flip = ok < data.length - ok; if (flip) ok = data.length - ok;
            data.forEach(function (d, i) { dots[i].el.setAttribute('opacity', ((side[i] === d.c) !== flip) ? '1' : '0.25'); });
            out[0].textContent = 'correct: ' + ok + ' / ' + data.length;
            out[1].textContent = 'accuracy: ' + Math.round(100 * ok / data.length) + ' %';
          }
          var sl = M4.el('div', { class: 'l4-s1-sliders' }, box);
          M4.slider(sl, { min: 0, max: 180, step: 1, value: 0, label: 'angle', format: function (v) { return v + '°'; }, onInput: function (v) { th = v * Math.PI / 180; upd(); } });
          M4.slider(sl, { min: -3.5, max: 3.5, step: 0.1, value: 0, label: 'offset', format: function (v) { return fmt(v); }, onInput: function (v) { c = v; upd(); } });
          M4.el('div', { class: 'm4-note', text: 'Faded points are misclassified by the line. No position reaches 100 %.' }, box);
          upd();
        }
      },
      {
        kind: 'explore',
        title: 'One input',
        html: '<p>With a single input \\(x\\), a weight \\(w\\) and a bias \\(b\\), the map \\(z = wx + b\\) moves every point of the number line. The points are hours studied before an exam (red: fail, blue: pass). The faint upper line is the input. The lower line shows where each point lands.</p>' +
          '<p>A weight \\(w = 2\\) stretches the line, \\(w = 0.5\\) shrinks it, \\(w = -1\\) flips it, and \\(b\\) shifts it. Applying the sigmoid \\(\\sigma(z) = 1/(1 + e^{-z})\\) afterwards squashes the whole line into the interval \\((0, 1)\\). Outputs above \\(0.5\\) are read as "pass". This is logistic regression in one dimension.</p>',
        mount: function (el, ctx) {
          var box = wrap(el);
          var nl = numberLine(box, { points: EXAM });
          var w = 1, b = 0, sig = false;
          var out = readoutRow(box, 2);
          var sl = M4.el('div', { class: 'l4-s1-sliders' }, box);
          function upd() {
            nl.draw(w, b, sig);
            out[0].textContent = 'z = ' + fmt(w) + ' · x ' + (b < 0 ? '− ' : '+ ') + fmt(Math.abs(b));
            out[1].textContent = w === 0 ? 'no boundary' : 'z = 0 at x = ' + fmt(-b / w, 2);
          }
          var sw = M4.slider(sl, { min: -3, max: 3, step: 0.5, value: 1, label: 'w', format: function (v) { return fmt(v); }, onInput: function (v) { w = v; upd(); } });
          var sb = M4.slider(sl, { min: -6, max: 6, step: 0.5, value: 0, label: 'b', format: function (v) { return fmt(v); }, onInput: function (v) { b = v; upd(); } });
          var row = M4.el('div', { class: 'm4-row' }, box);
          function preset(label, pw, pb) {
            M4.button(row, label, function () { w = pw; b = pb; sw.set(pw); sb.set(pb); upd(); });
          }
          preset('stretch w = 2', 2, 0); preset('shrink w = 0.5', 0.5, 0); preset('flip w = −1', -1, 0); preset('shift b = 1', 1, 1);
          var tb = M4.button(row, 'apply σ', function () { sig = !sig; tb.classList.toggle('l4-s1-on', sig); upd(); }, { primary: true });
          M4.el('div', { class: 'm4-note', text: 'With σ applied, try w = 2, b = −6: the dashed mark at 0.5 then separates fail from pass.' }, box);
          upd();
        }
      },
      {
        kind: 'exercise',
        title: 'Choosing w and b',
        html: '<p>Two inputs are marked: \\(x = 1\\) and \\(x = 3\\). Set the weight \\(w\\) and the bias \\(b\\) so that \\(z = wx + b\\) sends \\(x = 1\\) to \\(z = 0\\) and \\(x = 3\\) to \\(z = 4\\). The dashed rings on the output line mark the two targets.</p>',
        hint: 'The two inputs are 2 apart and their images must be 4 apart, which fixes the stretch factor w. Then choose b so that w · 1 + b = 0.',
        mount: function (el, ctx) {
          var box = wrap(el);
          var nl = numberLine(box, { points: [{ x: 1, col: PINK }, { x: 3, col: PINK }], targets: [0, 4] });
          var w = 1, b = 0, done = false;
          var out = readoutRow(box, 2);
          var sl = M4.el('div', { class: 'l4-s1-sliders' }, box);
          function upd(user) {
            nl.draw(w, b, false);
            var z1 = w + b, z3 = 3 * w + b;
            out[0].textContent = 'x = 1 ↦ ' + fmt(z1);
            out[1].textContent = 'x = 3 ↦ ' + fmt(z3);
            if (!user || done) return;
            if (z1 === 0 && z3 === 4) { done = true; ctx.note('Both points sit on their targets: \\(z = 2x - 2\\).'); ctx.solved(); }
            else if (z3 - z1 !== 4) ctx.note('The images are \\(' + num(z3 - z1) + '\\) apart. They must be \\(4\\) apart. The distance is controlled by \\(w\\) alone.');
            else ctx.note('The spacing is right. Shift with \\(b\\) until \\(x = 1\\) lands on \\(0\\).');
          }
          M4.slider(sl, { min: -3, max: 3, step: 0.5, value: 1, label: 'w', format: function (v) { return fmt(v); }, onInput: function (v) { w = v; upd(true); } });
          M4.slider(sl, { min: -4, max: 4, step: 0.5, value: 0, label: 'b', format: function (v) { return fmt(v); }, onInput: function (v) { b = v; upd(true); } });
          upd(false);
        }
      },
      {
        kind: 'exercise',
        title: 'The 0.5 crossing of the sigmoid',
        html: '<p>A one-dimensional logistic regression has \\(w = 2\\) and \\(b = -6\\), so it outputs \\(\\sigma(2x - 6)\\) with \\(\\sigma(z) = 1/(1 + e^{-z})\\). Since \\(\\sigma(0) = 0.5\\), the output equals \\(0.5\\) exactly where \\(z = 0\\). Enter the number of hours \\(x\\) at which the prediction switches from "fail" to "pass".</p>',
        hint: 'Solve 2x − 6 = 0.',
        mount: function (el, ctx) {
          var box = wrap(el);
          M4.numberInput(box, {
            answer: 3, tolerance: 0.01, placeholder: 'x', label: 'x =',
            onCorrect: function () { ctx.note('\\(2 \\cdot 3 - 6 = 0\\) and \\(\\sigma(0) = 0.5\\).'); ctx.solved(); },
            onWrong: function (v) {
              var z = 2 * v - 6;
              if (isFinite(z)) ctx.wrong('At x = ' + v + ' the value is z = ' + fmt(z, 2) + ', so σ(z) = ' + fmt(sigmoid(z), 3) + ', not 0.5.');
              else ctx.wrong('Enter a number.');
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Two inputs',
        html: '<p>For an input \\(x = (x_1, x_2)\\) and a weight vector \\(w = (w_1, w_2)\\), the number \\(z = w^\\top x + b = w_1 x_1 + w_2 x_2 + b\\) depends only on how far \\(x\\) lies along the direction of \\(w\\). The whole plane is therefore squashed onto one line along \\(w\\), and every line perpendicular to \\(w\\) collapses to a single point, because all its points receive the same \\(z\\).</p>' +
          '<p>Drag the arrow \\(w\\) and move the slider to collapse the plane (shown with \\(b = 0\\), since the bias only shifts all values of \\(z\\)). Then switch to the rings and rotate \\(w\\) through all directions.</p>',
        mount: function (el, ctx) {
          var box = wrap(el);
          var row = M4.el('div', { class: 'm4-row' }, box);
          var p = M4.plane(box, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 520, height: 520 });
          var w = [2, 1], t = 0, data = [], dots = [], raf = 0;
          var axisL = p.line(0, 0, 0, 0, { stroke: PINK, width: 2 }); axisL.el.setAttribute('opacity', '0.4');
          var perp = p.line(0, 0, 0, 0, { stroke: ORANGE, width: 3, dash: '7 6' });
          var grp = M4.svg('g', {}, p.g);
          var arrow = p.arrow(0, 0, w[0], w[1], { stroke: PINK, width: 5 });
          var lab = p.text(0, 0, 'w', { fill: PINK, size: 18, weight: 700 });
          var out = readoutRow(box, 2);
          function setData(kind) {
            dots.forEach(function (d) { if (d.el.parentNode) d.el.parentNode.removeChild(d.el); });
            data = kind === 'rings' ? ringData() : cloudData(2, 1.5, -2, -1.5);
            dots = data.map(function (d) { var pt = p.point(d.x, d.y, { r: 7, fill: colOf(d.c) }); grp.appendChild(pt.el); return pt; });
            upd();
          }
          function upd() {
            var u = unit(w); if (!u) return;
            axisL.set(-8 * u[0], -8 * u[1], 8 * u[0], 8 * u[1]);
            arrow.set(0, 0, w[0], w[1]);
            lab.set(w[0] + 0.45 * u[0] - 0.35 * u[1], w[1] + 0.45 * u[1] + 0.35 * u[0], 'w');
            var lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
            data.forEach(function (d, i) {
              var s = d.x * u[0] + d.y * u[1];
              lo[d.c] = Math.min(lo[d.c], s); hi[d.c] = Math.max(hi[d.c], s);
              dots[i].set(d.x + t * (s * u[0] - d.x), d.y + t * (s * u[1] - d.y));
            });
            var d0 = data[0], s0 = d0.x * u[0] + d0.y * u[1];
            perp.set(s0 * u[0] + 8 * u[1], s0 * u[1] - 8 * u[0], s0 * u[0] - 8 * u[1], s0 * u[1] + 8 * u[0]);
            var overlap = !(hi[0] < lo[1] || hi[1] < lo[0]);
            out[0].textContent = 'w = (' + fmt(w[0]) + ', ' + fmt(w[1]) + ')';
            out[1].textContent = overlap ? 'classes overlap on the line' : 'classes separated on the line';
            out[1].style.color = overlap ? RED : GREEN;
          }
          p.handle(w[0], w[1], { color: PINK, r: 12, snap: 0, onDrag: function (x, y) { if (Math.hypot(x, y) > 0.3) { w = [x, y]; upd(); } } });
          var sl = M4.el('div', { class: 'l4-s1-sliders' }, box);
          var ts = M4.slider(sl, { min: 0, max: 1, step: 0.01, value: 0, label: 'collapse', format: function (v) { return Math.round(v * 100) + ' %'; }, onInput: function (v) { cancelAnimationFrame(raf); t = v; upd(); } });
          var bc = M4.button(row, 'two clouds', function () { bc.classList.add('l4-s1-on'); br.classList.remove('l4-s1-on'); setData('clouds'); });
          var br = M4.button(row, 'two rings', function () { br.classList.add('l4-s1-on'); bc.classList.remove('l4-s1-on'); setData('rings'); });
          M4.button(row, 'animate collapse', function () {
            cancelAnimationFrame(raf); var t0 = null;
            (function go() {
              raf = requestAnimationFrame(function (now) {
                if (t0 === null) t0 = now;
                var u = Math.min(1, (now - t0) / 1400); t = u * u * (3 - 2 * u); ts.set(Math.round(t * 100) / 100); upd();
                if (u < 1) go();
              });
            })();
          }, { primary: true });
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
          bc.classList.add('l4-s1-on');
          M4.el('div', { class: 'm4-note', text: 'The dashed orange line is perpendicular to w: all of its points collapse to the same position.' }, box);
          setData('clouds');
        }
      },
      {
        kind: 'exercise',
        title: 'Orienting w',
        html: '<p>Take \\(b = 0\\), so the decision boundary \\(w^\\top x = 0\\) is the line through the origin perpendicular to \\(w\\). Points with \\(w^\\top x &gt; 0\\) are predicted blue, points with \\(w^\\top x &lt; 0\\) red. Drag the tip of \\(w\\) until every blue point has \\(z &gt; 0\\) and every red point has \\(z &lt; 0\\).</p>',
        hint: 'The boundary must pass between the two clouds, and w must point to the side where the blue cloud lies. A direction such as up and to the left works.',
        mount: function (el, ctx) {
          var box = wrap(el);
          var p = M4.plane(box, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 520, height: 520 });
          var data = cloudData(1, 2.5, 2.5, -1), w = [2, 1], done = false;
          var bound = p.line(0, 0, 0, 0, { stroke: C.ink, width: 3, dash: '8 6' });
          var dots = data.map(function (d) { return p.point(d.x, d.y, { r: 8, fill: colOf(d.c) }); });
          var arrow = p.arrow(0, 0, w[0], w[1], { stroke: PINK, width: 5 });
          var out = readoutRow(box, 2);
          function upd(user) {
            var u = unit(w); if (!u) return;
            bound.set(8 * u[1], -8 * u[0], -8 * u[1], 8 * u[0]);
            arrow.set(0, 0, w[0], w[1]);
            var okB = 0, okR = 0, nB = 0, nR = 0, minM = Infinity;
            data.forEach(function (d, i) {
              var z = d.x * u[0] + d.y * u[1], good = d.c === 1 ? z > 0 : z < 0;
              if (d.c === 1) { nB++; if (good) okB++; } else { nR++; if (good) okR++; }
              minM = Math.min(minM, d.c === 1 ? z : -z);
              dots[i].el.setAttribute('opacity', good ? '1' : '0.3');
            });
            out[0].textContent = 'blue with z > 0: ' + okB + ' / ' + nB;
            out[1].textContent = 'red with z < 0: ' + okR + ' / ' + nR;
            if (!user || done) return;
            if (minM > 0.1) {
              done = true; bound.el.setAttribute('stroke', GREEN);
              ctx.note('Separated: \\(w = (' + num(w[0]) + ', ' + num(w[1]) + ')\\) gives \\(z &gt; 0\\) for all blue points and \\(z &lt; 0\\) for all red points.');
              ctx.solved();
            } else if (okB === 0 && okR === 0) ctx.note('The boundary separates the clouds, but the signs are reversed: \\(w\\) must point towards the blue cloud.');
            else if (okB === nB && okR === 0) ctx.note('Both clouds lie on the positive side of the boundary. Rotate \\(w\\) so the dashed line passes between them.');
            else ctx.note('Faded points are on the wrong side. Rotate \\(w\\) until the dashed boundary passes between the clouds.');
          }
          p.handle(w[0], w[1], { color: PINK, r: 13, snap: 0.5, onDrag: function (x, y) { if (Math.hypot(x, y) > 0.3) { w = [x, y]; upd(true); } } });
          upd(false);
        }
      },
      {
        kind: 'exercise',
        title: 'A point on the decision boundary',
        html: '<p>A logistic regression on the plane has \\(w = (1, 2)\\) and \\(b = -4\\). Its decision boundary is the set of points with \\(w^\\top x + b = 0\\), where \\(\\sigma(w^\\top x + b) = 0.5\\). Which of the following points lies on the boundary?</p>',
        hint: 'Evaluate x₁ + 2x₂ − 4 for each candidate and look for the value 0.',
        mount: function (el, ctx) {
          var vals = ['\\(z = 1 + 4 - 4 = 1\\)', '', '\\(z = 4 + 2 - 4 = 2\\)', '\\(z = -4\\)'];
          M4.choices(wrap(el), {
            options: ['\\((1, 2)\\)', '\\((2, 1)\\)', '\\((4, 1)\\)', '\\((0, 0)\\)'],
            correct: 1,
            onCorrect: function () { ctx.note('\\(1 \\cdot 2 + 2 \\cdot 1 - 4 = 0\\), so \\((2, 1)\\) lies on the boundary.'); ctx.solved(); },
            onWrong: function (i) { ctx.note('For this point ' + vals[i] + ', which is not \\(0\\).'); }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Two outputs',
        html: '<p>A second weight row \\(w_2\\) with bias \\(b_2\\) is a second regression with its own line. Stacking the rows gives a \\(2 \\times 2\\) matrix \\(W\\) and a vector \\(b\\). Each point now receives two numbers \\((z_1, z_2)\\), that is, a new position \\(z = Wx + b\\). One row is one question put to the input, and the answers are the new coordinates.</p>' +
          '<p>The pink and green handles are the images of the two unit vectors (the columns of \\(W\\)). The orange handle is \\(b\\), the image of the origin. Straight lines stay straight and the inner ring stays inside the outer ring, so an affine map cannot untangle the rings.</p>',
        mount: function (el, ctx) {
          var box = wrap(el);
          var row = M4.el('div', { class: 'm4-row' }, box);
          var eq = M4.el('div', { class: 'l4-s1-eq' });
          var out;
          function show(st) {
            eq.innerHTML = M4.tex(matTex(st), true);
            var det = st.W[0][0] * st.W[1][1] - st.W[0][1] * st.W[1][0];
            out[0].textContent = 'det W = ' + fmt(det, 2);
            out[1].textContent = Math.abs(det) < 0.02 ? 'rank 1: plane squashed onto a line' : 'grid stays two-dimensional';
          }
          var aw = affineWidget(box, ctx, { range: 5, half: 3, snap: 0.5, rings: true, onChange: function (st) { show(st); } });
          box.appendChild(eq);
          out = readoutRow(box, 2);
          var c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
          [['identity', [[1, 0], [0, 1]], [0, 0]],
           ['rotation', [[c, -s], [s, c]], [0, 0]],
           ['scaling', [[1.5, 0], [0, 0.5]], [0, 0]],
           ['shear', [[1, 1], [0, 1]], [0, 0]],
           ['squash (rank 1)', [[1, 1], [0.5, 0.5]], [0, 0]],
           ['shift by b', [[1, 0], [0, 1]], [1.5, 1]]
          ].forEach(function (pr) { M4.button(row, pr[0], function () { aw.animateTo(pr[1], pr[2]); }); });
          show(aw.state);
        }
      },
      {
        kind: 'exercise',
        title: 'A new position on paper',
        html: '<p>Let \\[W = \\begin{pmatrix} 1 &amp; 2 \\\\ 3 &amp; -1 \\end{pmatrix}, \\qquad b = \\begin{pmatrix} 1 \\\\ -2 \\end{pmatrix}, \\qquad x = \\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix}.\\] Each row of \\(W\\) asks one question of the input: \\(z_k\\) is row \\(k\\) of \\(W\\) times \\(x\\), plus \\(b_k\\). Drag the correct values into the slots for \\(z = Wx + b\\).</p>',
        hint: 'z₁ = 1·2 + 2·1 + 1 and z₂ = 3·2 + (−1)·1 + (−2).',
        mount: function (el, ctx) {
          var box = wrap(el);
          var answers = [5, 3], filled = [false, false];
          var srow = M4.el('div', { class: 'm4-row', style: 'gap:28px;font-size:22px' }, box);
          var slots = [0, 1].map(function (k) {
            var g = M4.el('div', { class: 'm4-row' }, srow);
            M4.el('span', { html: M4.tex('z_' + (k + 1) + ' =') }, g);
            var s = M4.el('div', { class: 'm4-slot l4-s1-slot' }, g);
            s.setAttribute('data-k', String(k));
            return s;
          });
          var trow = M4.el('div', { class: 'm4-row', style: 'margin-top:10px' }, box);
          var tokens = [4, 7, 3, 1, 5].map(function (v) {
            var t = M4.el('div', { class: 'm4-token l4-s1-tok', text: String(v).replace('-', '−') }, trow);
            t.setAttribute('data-v', String(v));
            return t;
          });
          M4.dragDrop({
            tokens: tokens, slots: slots,
            onDrop: function (tok, slot) {
              var k = +slot.getAttribute('data-k'), v = +tok.getAttribute('data-v');
              if (filled[k]) return;
              if (v === answers[k]) {
                filled[k] = true; slot.textContent = String(v); slot.classList.add('filled', 'm4-pop');
                tok.style.visibility = 'hidden';
                if (filled[0] && filled[1]) { ctx.note('\\(z = (5, 3)\\): the point \\((2, 1)\\) moves to \\((5, 3)\\).'); ctx.solved(); }
                else ctx.note('Correct. One slot remains.');
              } else if (k === 0 && v === 4) ctx.wrong('4 is row 1 times x. The bias b₁ = 1 still has to be added.');
              else if (k === 1 && v === 5) ctx.wrong('5 is row 2 times x. The bias b₂ = −2 still has to be added.');
              else if (k === 1 && v === 7) ctx.wrong('Check the signs: 3·2 + (−1)·1 = 5, then add b₂ = −2.');
              else ctx.wrong(k === 0 ? 'Compute 1·2 + 2·1 + 1.' : 'Compute 3·2 + (−1)·1 + (−2).');
            },
            onMiss: function () {}
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Composition of affine maps',
        html: '<p>Applying \\(W_1, b_1\\) and then \\(W_2, b_2\\) gives \\[W_2(W_1 x + b_1) + b_2 = (W_2 W_1)\\,x + (W_2 b_1 + b_2),\\] a single affine map. Here \\[W_1 = \\begin{pmatrix} 1 &amp; 1 \\\\ 0 &amp; 1 \\end{pmatrix},\\; b_1 = \\begin{pmatrix} 1 \\\\ 0 \\end{pmatrix},\\qquad W_2 = \\begin{pmatrix} 0 &amp; -1 \\\\ 1 &amp; 0 \\end{pmatrix},\\; b_2 = \\begin{pmatrix} 0 \\\\ 1 \\end{pmatrix}.\\]</p>' +
          '<p>The faint blue grid is the result of the two maps in sequence. Build the single equivalent map: drag the orange handle to \\(W_2 b_1 + b_2\\) and the pink and green handles so that the columns of \\(W\\) equal those of \\(W_2 W_1\\).</p>',
        hint: 'W₂W₁ has rows (0, −1) and (1, 1), so its columns are (0, 1) and (−1, 1). W₂b₁ + b₂ = (0, 1) + (0, 1) = (0, 2). Place the orange handle first. The pink handle then sits at b plus the first column.',
        mount: function (el, ctx) {
          var box = wrap(el);
          var T = { W: [[0, -1], [1, 1]], b: [0, 2] }, done = false;
          var eq = M4.el('div', { class: 'l4-s1-eq' });
          function eqm(a, c) { return Math.abs(a - c) < 1e-9; }
          function check(st, final) {
            eq.innerHTML = M4.tex(matTex(st), true);
            if (done) return;
            var W = st.W, bOk = eqm(st.b[0], T.b[0]) && eqm(st.b[1], T.b[1]);
            var c1 = eqm(W[0][0], 0) && eqm(W[1][0], 1), c2 = eqm(W[0][1], -1) && eqm(W[1][1], 1);
            if (bOk && c1 && c2) {
              done = true;
              ctx.note('The single map \\(W_2 W_1 = \\begin{pmatrix} 0 &amp; -1 \\\\ 1 &amp; 1 \\end{pmatrix}\\), \\(W_2 b_1 + b_2 = (0, 2)\\) produces the same grid as the two maps in sequence.');
              ctx.solved(); return;
            }
            if (!final) return;
            if (!bOk) ctx.note('The origin is sent to \\(b\\). Compute \\(W_2 b_1 + b_2\\) and place the orange handle there. The faint blue dot marks the image of the origin.');
            else if (!c1 && !c2) ctx.note('The shift is correct. Now set the columns: the first column of \\(W_2 W_1\\) is \\(W_2\\) applied to the first column of \\(W_1\\).');
            else if (!c1) ctx.note('The second column is correct. The first column (pink) should equal \\(W_2 (1, 0)^\\top\\).');
            else ctx.note('The first column is correct. The second column (green) should equal \\(W_2 (1, 1)^\\top\\).');
          }
          var aw = affineWidget(box, ctx, { range: 6, half: 2, snap: 1, ghost: T, onChange: function (st) { check(st, false); }, onEnd: function (st) { check(st, true); } });
          box.appendChild(eq);
          M4.el('div', { class: 'm4-note', text: 'Handles snap to whole numbers. Pink: image of (1, 0). Green: image of (0, 1). Orange: image of the origin.' }, box);
          eq.innerHTML = M4.tex(matTex(aw.state), true);
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>The map \\(z = wx + b\\) stretches, flips and shifts the number line. Logistic regression \\(\\sigma(w^\\top x + b)\\) flattens the plane onto a line along \\(w\\), so its decision boundary \\(w^\\top x + b = 0\\) is straight.</li>' +
          '<li>An affine map \\(z = Wx + b\\) gives every point a new position: each row of \\(W\\) is one question, the columns of \\(W\\) are the images of the unit vectors, and \\(b\\) is the image of the origin. Straight lines stay straight, so the rings stay nested.</li>' +
          '<li>\\(W_2(W_1 x + b_1) + b_2 = (W_2 W_1)x + (W_2 b_1 + b_2)\\): any number of stacked affine layers equals one affine layer, so depth alone adds nothing. The next session adds nonlinearities, which bend the grid.</li>' +
          '</ul>'
      }
    ]
  });
})();
