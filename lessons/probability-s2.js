(function () {
  'use strict';
  var M4 = window.M4;
  if (!M4 || !M4.lesson) return;
  var C = M4.colors || {};
  var COL = {
    yellow: C.yellow || '#ffc533', edge: '#d99e00', ink: C.ink || '#1d1d1f', muted: C.muted || '#6b6f76',
    line: C.line || '#e6e4dd', purple: C.purple || '#7a5cff', blue: C.blue || '#2f6bff',
    green: C.green || '#16b56b', orange: C.orange || '#ff8a1f', red: C.red || '#f0473e', card: C.card || '#ffffff'
  };

  function css() {
    if (document.getElementById('probability-s2-style')) return;
    var s = document.createElement('style');
    s.id = 'probability-s2-style';
    s.textContent =
      '.probability-s2-card{background:#fff;border:2px solid ' + COL.line + ';border-radius:18px;padding:10px;margin:8px 0 14px;}' +
      '.probability-s2-svg{display:block;width:100%;height:auto;user-select:none;-webkit-user-select:none;font-family:inherit;}' +
      '.probability-s2-grab{cursor:grab;touch-action:none;}' +
      '.probability-s2-tap{cursor:pointer;}' +
      '.probability-s2-bar{margin:10px 0;justify-content:center;}' +
      '.probability-s2-table{border-collapse:collapse;margin:6px auto 16px;font-size:18px;}' +
      '.probability-s2-table td,.probability-s2-table th{border:2px solid ' + COL.line + ';padding:10px 22px;text-align:center;background:#fff;}' +
      '.probability-s2-table th{background:#fff8e0;font-weight:600;}' +
      '.probability-s2-eq{display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:8px 6px;font-size:20px;}' +
      '.probability-s2-slot{min-width:76px;min-height:54px;display:inline-flex;align-items:center;justify-content:center;}' +
      '.probability-s2-tok{min-width:60px;text-align:center;font-size:20px;font-weight:700;padding:10px 14px;}' +
      '.probability-s2-given{text-align:center;margin:4px 0 12px;font-size:19px;}';
    document.head.appendChild(s);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function root(el, w, h) {
    css();
    var wrap = M4.el('div', { class: 'probability-s2-card' }, el);
    return M4.svg('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'probability-s2-svg' }, wrap);
  }
  function scaleOf(svg, w) {
    var r = svg.getBoundingClientRect();
    return r.width ? w / r.width : 1;
  }
  function txt(parent, x, y, str, attrs) {
    var a = { x: x, y: y, 'text-anchor': 'middle', 'font-size': 16, fill: COL.ink };
    if (attrs) for (var k in attrs) a[k] = attrs[k];
    var t = M4.svg('text', a, parent);
    t.textContent = str;
    return t;
  }
  function readout(parent, label) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    return function (v) { r.textContent = label + ' ' + v; };
  }
  function bar(el) { return M4.el('div', { class: 'm4-row probability-s2-bar' }, el); }

  /* ---------- balance beam (steps 2 and 3) ---------- */
  function beam(el, ctx, cfg) {
    var W = 640, H = 400, BY = 280, HP = 360, n = 5;
    var X = function (v) { return 80 + (v - 1) * 120; };
    var w = cfg.weights.slice();
    var svg = root(el, W, H);
    var row = bar(el);
    var roMean = cfg.editable ? readout(row, 'E[X] =') : null;
    var roF = cfg.fulcrumDrag ? readout(row, 'pivot at') : null;
    var roT = cfg.fulcrumDrag ? readout(row, 'net moment Σ p(x)(x − pivot) =') : null;

    M4.svg('line', { x1: 40, y1: 344, x2: 600, y2: 344, stroke: COL.line, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    for (var i = 0; i < n; i++) txt(svg, X(i + 1), 376, String(i + 1), { 'font-size': 18, 'font-weight': 600, fill: COL.muted });
    var gB = M4.svg('g', {}, svg);
    M4.svg('rect', { x: 44, y: BY, width: 552, height: 10, rx: 5, fill: COL.ink }, gB);
    var bars = [], labs = [], hands = [];
    for (i = 0; i < n; i++) {
      bars.push(M4.svg('rect', { x: X(i + 1) - 28, width: 56, rx: 6, fill: COL.yellow, stroke: COL.edge, 'stroke-width': 2 }, gB));
      labs.push(txt(gB, X(i + 1), 0, '', { 'font-size': 16, 'font-weight': 600 }));
    }
    var tri = M4.svg('polygon', { fill: COL.purple, stroke: '#5a3fe0', 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    if (cfg.fulcrumDrag) tri.setAttribute('class', 'probability-s2-grab');

    function probs() {
      var s = 0, k; for (k = 0; k < n; k++) s += w[k];
      return w.map(function (v) { return v / s; });
    }
    function mean() {
      var p = probs(), m = 0; for (var k = 0; k < n; k++) m += p[k] * (k + 1);
      return m;
    }
    var f = cfg.fulcrum != null ? cfg.fulcrum : mean();
    var fcur = f, ang = 0, done = false;

    function layout() {
      var p = probs();
      for (var k = 0; k < n; k++) {
        var h = w[k] * HP;
        bars[k].setAttribute('y', BY - h);
        bars[k].setAttribute('height', h);
        labs[k].setAttribute('y', BY - h - (cfg.editable ? 24 : 10));
        labs[k].textContent = p[k].toFixed(2);
        if (hands[k]) hands[k].setAttribute('cy', BY - h);
      }
      var m = mean();
      if (roMean) roMean(m.toFixed(2));
      if (roF) roF(f.toFixed(1));
      if (roT) { var t = m - f; roT((Math.abs(t) < 0.005 ? 0 : t).toFixed(2)); }
    }

    if (cfg.editable) {
      for (i = 0; i < n; i++) (function (k) {
        var hnd = M4.svg('circle', { cx: X(k + 1), r: 13, fill: '#fff', stroke: COL.ink, 'stroke-width': 3, class: 'probability-s2-grab' }, gB);
        hands[k] = hnd;
        var w0 = 0, sc = 1;
        M4.drag(hnd, {
          onStart: function () { w0 = w[k]; sc = scaleOf(svg, W); },
          onMove: function (dx, dy) { w[k] = clamp(w0 - dy * sc / HP, 0.03, 0.6); layout(); }
        });
      })(i);
    }
    if (cfg.fulcrumDrag) {
      var f0 = 0, sc2 = 1;
      M4.drag(tri, {
        onStart: function () { f0 = f; sc2 = scaleOf(svg, W); },
        onMove: function (dx) {
          if (done) return;
          f = clamp(Math.round((f0 + dx * sc2 / 120) * 10) / 10, 1, 5);
          layout();
        },
        onEnd: function () {
          if (done) return;
          var m = mean();
          if (Math.abs(f - m) < 0.151) {
            done = true; f = Math.round(m * 10) / 10; layout();
            tri.setAttribute('fill', COL.green); tri.setAttribute('stroke', '#0e8f52');
            ctx.note('The beam is level: the pivot sits at \\(\\mathbb{E}[X] = ' + m.toFixed(1) + '\\), where the moments on both sides cancel.');
            ctx.solved();
          } else if (f < m) {
            ctx.note('The beam tips to the right: more probability-weighted distance lies right of the pivot. Move the pivot right.');
          } else {
            ctx.note('The beam tips to the left: more probability-weighted distance lies left of the pivot. Move the pivot left.');
          }
        }
      });
    }

    layout();
    var raf = 0;
    function tick() {
      var m = mean();
      var ft = cfg.fulcrumDrag ? f : m;
      fcur += (ft - fcur) * (cfg.fulcrumDrag ? 0.5 : 0.12);
      var target = clamp((m - fcur) * 10, -6, 6);
      ang += (target - ang) * 0.1;
      var px = X(fcur);
      gB.setAttribute('transform', 'rotate(' + ang.toFixed(3) + ' ' + px.toFixed(2) + ' ' + (BY + 10) + ')');
      tri.setAttribute('points', px + ',' + (BY + 12) + ' ' + (px - 32) + ',342 ' + (px + 32) + ',342');
      raf = requestAnimationFrame(tick);
    }
    tick();
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
  }

  /* ---------- variance squares (step 5) ---------- */
  function varianceExplore(el, ctx) {
    var W = 640, H = 370, AY = 300, CX = 320, U = 80;
    var svg = root(el, W, H);
    var d = 1.5, q = 0.5;
    var sqL = M4.svg('rect', { fill: COL.orange, stroke: COL.orange, 'stroke-width': 2 }, svg);
    var sqR = M4.svg('rect', { fill: COL.orange, stroke: COL.orange, 'stroke-width': 2 }, svg);
    M4.svg('line', { x1: 40, y1: AY, x2: 600, y2: AY, stroke: COL.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    for (var t = -3; t <= 3; t++) {
      M4.svg('line', { x1: CX + t * U, y1: AY, x2: CX + t * U, y2: AY + 8, stroke: COL.ink, 'stroke-width': 2 }, svg);
      txt(svg, CX + t * U, AY + 28, String(t).replace('-', '−'), { fill: COL.muted });
    }
    txt(svg, CX, AY + 56, 'μ = 0', { 'font-weight': 700, fill: COL.purple, 'font-size': 17 });
    var lab = txt(svg, CX, 0, '', { 'font-weight': 600, fill: '#c25e00' });
    var stems = [], dots = [];
    for (var i = 0; i < 3; i++) {
      stems.push(M4.svg('line', { stroke: COL.ink, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg));
      dots.push(M4.svg('circle', { r: 10, fill: COL.yellow, stroke: COL.ink, 'stroke-width': 2.5 }, svg));
    }
    var row = bar(el);
    var roV = readout(row, 'Var(X) = q·d² =');
    var roS = readout(row, 'σ =');
    function draw() {
      var s = d * U, op = 0.06 + 0.5 * (q / 2) * 2;
      sqL.setAttribute('x', CX - s); sqL.setAttribute('y', AY - s); sqL.setAttribute('width', s); sqL.setAttribute('height', s);
      sqR.setAttribute('x', CX); sqR.setAttribute('y', AY - s); sqR.setAttribute('width', s); sqR.setAttribute('height', s);
      sqL.setAttribute('fill-opacity', op * 0.6); sqR.setAttribute('fill-opacity', op * 0.6);
      lab.setAttribute('y', AY - s - 12);
      lab.textContent = 'squared deviation of each tail: d² = ' + (d * d).toFixed(2);
      var xs = [CX - s, CX, CX + s], ps = [q / 2, 1 - q, q / 2];
      for (var k = 0; k < 3; k++) {
        var h = ps[k] * 170;
        stems[k].setAttribute('x1', xs[k]); stems[k].setAttribute('x2', xs[k]);
        stems[k].setAttribute('y1', AY); stems[k].setAttribute('y2', AY - h);
        dots[k].setAttribute('cx', xs[k]); dots[k].setAttribute('cy', AY - h);
        dots[k].setAttribute('opacity', ps[k] < 0.001 ? 0.25 : 1);
      }
      var v = q * d * d;
      roV(v.toFixed(2)); roS(Math.sqrt(v).toFixed(2));
    }
    M4.slider(el, { min: 0.5, max: 3, step: 0.1, value: d, label: 'distance d of the tails from μ', format: function (v) { return (+v).toFixed(1); }, onInput: function (v) { d = +v; draw(); } });
    M4.slider(el, { min: 0, max: 1, step: 0.05, value: q, label: 'total probability q in the tails', format: function (v) { return (+v).toFixed(2); }, onInput: function (v) { q = +v; draw(); } });
    draw();
  }

  /* ---------- aX + b sliders (step 8) ---------- */
  function affineExercise(el, ctx) {
    var W = 640, H = 330, A1 = 120, A2 = 280;
    var X = function (v) { return 40 + (v + 6) * 40; };
    var svg = root(el, W, H);
    var xs = [1, 2, 3], ps = [0.25, 0.5, 0.25], tg = [-1, 1, 3];
    var a = 1, b = 0, done = false, i;
    function axis(y) {
      M4.svg('line', { x1: 24, y1: y, x2: 616, y2: y, stroke: COL.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
      for (var t = -6; t <= 8; t++) {
        M4.svg('line', { x1: X(t), y1: y, x2: X(t), y2: y + (t % 2 === 0 ? 8 : 5), stroke: COL.ink, 'stroke-width': 2 }, svg);
        if (t % 2 === 0) txt(svg, X(t), y + 26, String(t).replace('-', '−'), { fill: COL.muted, 'font-size': 15 });
      }
    }
    axis(A1); axis(A2);
    txt(svg, 28, 32, 'X', { 'text-anchor': 'start', 'font-weight': 700, 'font-size': 18, fill: COL.blue });
    var yLab = txt(svg, 28, 182, 'Y = aX + b', { 'text-anchor': 'start', 'font-weight': 700, 'font-size': 18 });
    txt(svg, 612, 182, 'dashed: target', { 'text-anchor': 'end', fill: COL.muted, 'font-size': 15 });
    for (i = 0; i < 3; i++) {
      var h = ps[i] * 120;
      M4.svg('line', { x1: X(xs[i]), y1: A1, x2: X(xs[i]), y2: A1 - h, stroke: COL.blue, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
      M4.svg('circle', { cx: X(xs[i]), cy: A1 - h, r: 9, fill: COL.blue }, svg);
    }
    var ghosts = [];
    for (i = 0; i < 3; i++) {
      var hg = ps[i] * 120;
      M4.svg('line', { x1: X(tg[i]), y1: A2, x2: X(tg[i]), y2: A2 - hg, stroke: COL.muted, 'stroke-width': 2, 'stroke-dasharray': '5 5' }, svg);
      ghosts.push(M4.svg('circle', { cx: X(tg[i]), cy: A2 - hg, r: 14, fill: 'none', stroke: COL.muted, 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }, svg));
    }
    var stems = [], dots = [];
    for (i = 0; i < 3; i++) {
      stems.push(M4.svg('line', { stroke: COL.ink, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg));
      dots.push(M4.svg('circle', { r: 9, fill: COL.yellow, stroke: COL.ink, 'stroke-width': 2.5 }, svg));
    }
    var row = bar(el);
    var roE = readout(row, 'E[Y] =');
    var roS = readout(row, 'σ(Y) =');
    M4.el('span', { class: 'm4-chip', text: 'target: E[Y] = 1, σ(Y) = 1.41' }, row);
    function fmt(v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(1); }
    function draw() {
      for (var k = 0; k < 3; k++) {
        var v = a * xs[k] + b, hh = ps[k] * 120, vis = v >= -6.5 && v <= 8.5;
        stems[k].setAttribute('x1', X(v)); stems[k].setAttribute('x2', X(v));
        stems[k].setAttribute('y1', A2); stems[k].setAttribute('y2', A2 - hh);
        dots[k].setAttribute('cx', X(v)); dots[k].setAttribute('cy', A2 - hh);
        stems[k].setAttribute('visibility', vis ? 'visible' : 'hidden');
        dots[k].setAttribute('visibility', vis ? 'visible' : 'hidden');
      }
      yLab.textContent = 'Y = ' + fmt(a) + '·X ' + (b < 0 ? '− ' : '+ ') + Math.abs(b).toFixed(1);
      var e = 2 * a + b, s = Math.abs(a) * Math.SQRT1_2;
      roE(fmt(e)); roS(s.toFixed(2));
      if (done) return;
      var okS = Math.abs(Math.abs(a) - 2) < 1e-9, okE = Math.abs(e - 1) < 1e-9;
      if (okS && okE) {
        done = true;
        ghosts.forEach(function (g) { g.setAttribute('stroke', COL.green); g.setAttribute('stroke-dasharray', ''); g.setAttribute('fill', COL.green); g.setAttribute('fill-opacity', 0.2); });
        ctx.note('Matched: \\(\\mathbb{E}[Y] = a\\,\\mathbb{E}[X] + b = 1\\) and \\(\\sigma(Y) = |a|\\,\\sigma(X) = 2 \\cdot 0.71\\).');
        ctx.solved();
      } else if (okS) {
        ctx.note('The spread matches the target. Only \\(b\\) is needed now: it shifts the centre without changing the spread.');
      } else if (okE) {
        ctx.note('The centre matches, but the spread does not. The spread depends only on \\(|a|\\). Changing \\(a\\) also moves the centre, so \\(b\\) must be readjusted.');
      } else {
        ctx.note('Set the spread first with \\(a\\), then move the centre with \\(b\\).');
      }
    }
    var f1 = function (v) { return fmt(+v); };
    M4.slider(el, { min: -3, max: 3, step: 0.5, value: a, label: 'scale a', format: f1, onInput: function (v) { a = +v; draw(); } });
    M4.slider(el, { min: -6, max: 6, step: 0.5, value: b, label: 'shift b', format: f1, onInput: function (v) { b = +v; draw(); } });
    draw();
  }

  /* ---------- token matching (step 9) ---------- */
  function tokenExercise(el, ctx) {
    css();
    M4.el('div', { class: 'probability-s2-given', html: 'Given: ' + M4.tex('\\mathbb{E}[X] = 3,\\qquad \\mathrm{Var}(X) = 4,\\qquad \\mathbb{E}[Y] = 5') }, el);
    var rows = [
      { tex: '\\mathbb{E}[X + Y] =', ans: 8, msg: 'The expectation of a sum is the sum of the expectations.' },
      { tex: '\\mathbb{E}[2X + 1] =', ans: 7, msg: 'Scale the expectation by 2, then add the shift 1.' },
      { tex: '\\mathrm{Var}(2X + 1) =', ans: 16, msg: 'A shift does not change the variance, and the scale factor enters squared.' },
      { tex: '\\mathrm{Var}(X + 3) =', ans: 4, msg: 'Adding a constant moves every value and the mean by the same amount, so deviations are unchanged.' }
    ];
    var grid = M4.el('div', { class: 'm4-grid2' }, el);
    var slots = [], filled = 0;
    rows.forEach(function (r, i) {
      var line = M4.el('div', { class: 'probability-s2-eq' }, grid);
      M4.el('span', { html: M4.tex(r.tex) }, line);
      var s = M4.el('div', { class: 'm4-slot probability-s2-slot' }, line);
      s.setAttribute('data-i', i);
      slots.push(s);
    });
    var tray = M4.el('div', { class: 'm4-row probability-s2-bar', style: 'margin-top:18px;min-height:64px' }, el);
    var tokens = [16, 9, 4, 8, 11, 7].map(function (v) {
      var t = M4.el('div', { class: 'm4-token probability-s2-tok', text: String(v) }, tray);
      t.setAttribute('data-v', v);
      return t;
    });
    M4.dragDrop({
      tokens: tokens, slots: slots,
      onDrop: function (tok, slot) {
        var r = rows[+slot.getAttribute('data-i')], v = +tok.getAttribute('data-v');
        if (slot.getAttribute('data-done')) return;
        if (v === r.ans) {
          slot.setAttribute('data-done', '1');
          slot.classList.add('filled');
          slot.appendChild(tok);
          tok.style.pointerEvents = 'none';
          tok.style.position = ''; tok.style.left = ''; tok.style.top = ''; tok.style.transform = '';
          tok.style.borderColor = COL.green;
          tok.classList.add('m4-pop');
          filled++;
          if (filled === rows.length) { ctx.note('All four follow from linearity: constants pass through expectations, and variance ignores shifts and squares scales.'); ctx.solved(); }
          else ctx.note('Correct. ' + (rows.length - filled) + ' remaining.');
        } else {
          ctx.wrong(r.msg);
        }
      },
      onMiss: function () {}
    });
  }

  /* ---------- mini-batch explore (step 10) ---------- */
  function batchExplore(el, ctx) {
    var W = 640, H = 345, BY = 280, MAXH = 215, NB = 41, CAP = 1500;
    var X = function (v) { return 60 + v * 130; };
    var svg = root(el, W, H);
    var vals = [0, 1, 2, 4], cum = [0.4, 0.7, 0.9, 1.0001], MU = 1.1, SD = Math.sqrt(1.49);
    var rects = [], i;
    for (i = 0; i < NB; i++) rects.push(M4.svg('rect', { x: X(i / 10) - 5.5, width: 11, y: BY, height: 0, rx: 2, fill: COL.yellow, stroke: COL.edge, 'stroke-width': 1 }, svg));
    M4.svg('line', { x1: 40, y1: BY, x2: 600, y2: BY, stroke: COL.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    for (i = 0; i <= 4; i++) {
      M4.svg('line', { x1: X(i), y1: BY, x2: X(i), y2: BY + 8, stroke: COL.ink, 'stroke-width': 2 }, svg);
      txt(svg, X(i), BY + 27, String(i), { fill: COL.muted });
    }
    txt(svg, 320, BY + 54, 'mini-batch average loss', { fill: COL.muted });
    M4.svg('line', { x1: X(MU), y1: 44, x2: X(MU), y2: BY, stroke: COL.purple, 'stroke-width': 3, 'stroke-dasharray': '7 6' }, svg);
    txt(svg, X(MU), 30, 'expected loss E[L] = 1.1', { fill: COL.purple, 'font-weight': 700 });
    var row = bar(el);
    var roN = readout(row, 'batches:');
    var roM = readout(row, 'mean of estimates:');
    var roS = readout(row, 'spread of estimates:');
    var roT = readout(row, 'σ/√n =');
    var n = 4, counts, total, sum, sum2;
    function reset() {
      counts = []; for (var k = 0; k < NB; k++) counts.push(0);
      total = 0; sum = 0; sum2 = 0;
      roT((SD / Math.sqrt(n)).toFixed(2));
    }
    function one() {
      var s = 0;
      for (var k = 0; k < n; k++) {
        var u = Math.random(), j = 0;
        while (u > cum[j]) j++;
        s += vals[j];
      }
      var m = s / n;
      counts[clamp(Math.round(m * 10), 0, NB - 1)]++;
      total++; sum += m; sum2 += m * m;
    }
    function draw() {
      var mx = 1, k;
      for (k = 0; k < NB; k++) if (counts[k] > mx) mx = counts[k];
      for (k = 0; k < NB; k++) {
        var h = counts[k] / mx * MAXH;
        rects[k].setAttribute('y', BY - h); rects[k].setAttribute('height', h);
      }
      roN(String(total));
      if (total > 1) {
        var m = sum / total;
        roM(m.toFixed(2)); roS(Math.sqrt(Math.max(0, sum2 / total - m * m)).toFixed(2));
      } else { roM('–'); roS('–'); }
    }
    reset();
    M4.slider(el, { min: 0, max: 6, step: 1, value: 2, label: 'batch size n', format: function (v) { return String(Math.pow(2, +v)); }, onInput: function (v) { var nn = Math.pow(2, +v); if (nn !== n) { n = nn; reset(); draw(); } } });
    M4.button(el, 'Restart sampling', function () { reset(); draw(); });
    var raf = 0;
    function tick() {
      if (total < CAP) { for (var k = 0; k < 4; k++) one(); draw(); }
      raf = requestAnimationFrame(tick);
    }
    tick();
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
  }

  /* ---------- build a distribution (step 11) ---------- */
  function buildExercise(el, ctx) {
    var W = 640, H = 400, BY = 290, BH = 44, MAXC = 4, TY = 40;
    var X = function (v) { return 100 + (v - 1) * 110; };
    var svg = root(el, W, H);
    var c = [0, 2, 1, 0, 0], done = false, i;
    var S2 = Math.SQRT2;
    // ghost target: mean 3, sigma sqrt 2
    M4.svg('line', { x1: X(3 - S2), y1: TY, x2: X(3 + S2), y2: TY, stroke: COL.muted, 'stroke-width': 12, 'stroke-linecap': 'round', opacity: 0.22 }, svg);
    M4.svg('circle', { cx: X(3), cy: TY, r: 13, fill: 'none', stroke: COL.muted, 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }, svg);
    var spread = M4.svg('line', { y1: TY, y2: TY, stroke: COL.orange, 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
    var mdot = M4.svg('circle', { cy: TY, r: 8, fill: COL.purple }, svg);
    txt(svg, 320, 16, 'mean (dot) and μ ± σ (bar), grey: target', { fill: COL.muted, 'font-size': 15 });
    M4.svg('line', { x1: 40, y1: BY, x2: 600, y2: BY, stroke: COL.ink, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    var blocks = [], hands = [];
    for (i = 0; i < 5; i++) (function (k) {
      txt(svg, X(k + 1), BY + 28, String(k + 1), { 'font-size': 18, 'font-weight': 600, fill: COL.muted });
      M4.svg('line', { x1: X(k + 1), y1: BY, x2: X(k + 1), y2: BY - MAXC * BH, stroke: COL.line, 'stroke-width': 2, 'stroke-dasharray': '4 6' }, svg);
      blocks[k] = [];
      for (var j = 0; j < MAXC; j++) blocks[k].push(M4.svg('rect', { x: X(k + 1) - 36, y: BY - (j + 1) * BH + 3, width: 72, height: BH - 5, rx: 8, fill: COL.yellow, stroke: COL.edge, 'stroke-width': 2 }, svg));
      [-1, 1].forEach(function (s) {
        var g = M4.svg('g', { class: 'probability-s2-tap' }, svg);
        M4.svg('circle', { cx: X(k + 1) + s * 24, cy: BY + 68, r: 19, fill: '#fff', stroke: COL.line, 'stroke-width': 2.5 }, g);
        txt(g, X(k + 1) + s * 24, BY + 75, s < 0 ? '−' : '+', { 'font-size': 22, 'font-weight': 700 });
        g.addEventListener('click', function () { if (done) return; c[k] = clamp(c[k] + s, 0, MAXC); draw(); check(); });
      });
      var hnd = M4.svg('circle', { cx: X(k + 1), r: 13, fill: '#fff', stroke: COL.ink, 'stroke-width': 3, class: 'probability-s2-grab' }, svg);
      hands[k] = hnd;
      var c0 = 0, sc = 1;
      M4.drag(hnd, {
        onStart: function () { c0 = c[k]; sc = scaleOf(svg, W); },
        onMove: function (dx, dy) { if (done) return; c[k] = clamp(Math.round(c0 - dy * sc / BH), 0, MAXC); draw(); },
        onEnd: function () { check(); }
      });
    })(i);
    var row = bar(el);
    var roM = readout(row, 'E[X] =');
    var roV = readout(row, 'Var(X) =');
    M4.el('span', { class: 'm4-chip', text: 'target: E[X] = 3, Var(X) = 2' }, row);
    function stats() {
      var n = 0, s = 0, k;
      for (k = 0; k < 5; k++) { n += c[k]; s += c[k] * (k + 1); }
      if (!n) return null;
      var m = s / n, v = 0;
      for (k = 0; k < 5; k++) v += c[k] * (k + 1 - m) * (k + 1 - m);
      return { n: n, s: s, m: m, v: v / n };
    }
    function draw() {
      for (var k = 0; k < 5; k++) {
        for (var j = 0; j < MAXC; j++) blocks[k][j].setAttribute('visibility', j < c[k] ? 'visible' : 'hidden');
        hands[k].setAttribute('cy', BY - c[k] * BH);
      }
      var st = stats();
      if (!st) { roM('–'); roV('–'); mdot.setAttribute('visibility', 'hidden'); spread.setAttribute('visibility', 'hidden'); return; }
      mdot.setAttribute('visibility', 'visible'); spread.setAttribute('visibility', 'visible');
      var sd = Math.sqrt(st.v);
      mdot.setAttribute('cx', X(st.m));
      spread.setAttribute('x1', X(st.m - sd)); spread.setAttribute('x2', X(st.m + sd));
      roM(st.m.toFixed(2)); roV(st.v.toFixed(2));
    }
    function check() {
      if (done) return;
      var st = stats();
      if (!st) { ctx.note('At least one block is needed: probabilities must sum to 1.'); return; }
      var okM = st.s === 3 * st.n, okV = Math.abs(st.v - 2) < 1e-9;
      if (okM && okV) {
        done = true;
        mdot.setAttribute('fill', COL.green); spread.setAttribute('stroke', COL.green);
        ctx.note('With ' + st.n + ' equally likely blocks, \\(\\mathbb{E}[X] = 3\\) and \\(\\mathrm{Var}(X) = 2\\), so \\(\\sigma = \\sqrt{2} \\approx 1.41\\).');
        ctx.solved();
      } else if (!okM) {
        ctx.note('The mean is ' + st.m.toFixed(2) + (st.m < 3 ? ', left of the target. Shift probability to the right.' : ', right of the target. Shift probability to the left.'));
      } else if (st.v < 2) {
        ctx.note('The mean is 3, but the variance ' + st.v.toFixed(2) + ' is too small. Move probability away from the mean, symmetrically so that the mean stays fixed.');
      } else {
        ctx.note('The mean is 3, but the variance ' + st.v.toFixed(2) + ' is too large. Move probability toward the mean, symmetrically so that the mean stays fixed.');
      }
    }
    draw();
    ctx.note('Each block is one equally likely outcome. The probability of a value is its share of the blocks.');
  }

  function table(el, vals, probs) {
    css();
    var t = M4.el('table', { class: 'probability-s2-table' }, el);
    var r1 = M4.el('tr', {}, t), r2 = M4.el('tr', {}, t);
    M4.el('th', { html: M4.tex('x') }, r1);
    M4.el('th', { html: M4.tex('p(x)') }, r2);
    vals.forEach(function (v, i) {
      M4.el('td', { text: String(v) }, r1);
      M4.el('td', { text: String(probs[i]) }, r2);
    });
  }


  /* sample mean and standard deviation of draggable data points */
  function sampleExplore(el) {
    var p = M4.plane(el, { xmin: 0.4, xmax: 10.6, ymin: -1, ymax: 3.2, width: 620, height: 280, grid: false, labels: false });
    for (var t = 1; t <= 10; t++) p.text(t, -0.55, String(t), { size: 14, fill: COL.muted, weight: 400 });
    var xs = [2, 3, 3.5, 5, 8.5];
    var band = p.path([], { fill: COL.orange, fillOpacity: 0.16, closed: true, layer: 'bg' });
    var meanLine = p.path([], { stroke: COL.purple, width: 3 });
    var meanLab = p.text(5, 2.95, 'mean', { fill: COL.purple });
    var devs = xs.map(function () { return p.path([], { stroke: COL.orange, width: 3 }); });
    var sq = M4.el('p', { class: 'm4-cap' }, el);
    var set = readoutMulti(el, [['m', '\\bar x'], ['v', 's^2'], ['s', 's']]);
    function upd() {
      var n = xs.length, m = 0, v = 0, i;
      for (i = 0; i < n; i++) m += xs[i] / n;
      for (i = 0; i < n; i++) v += (xs[i] - m) * (xs[i] - m) / n;
      var sd = Math.sqrt(v);
      band.set([[m - sd, -0.6], [m + sd, -0.6], [m + sd, 2.7], [m - sd, 2.7]]);
      meanLine.set([[m, -0.6], [m, 2.7]]);
      meanLab.set(m, 2.95);
      xs.forEach(function (x, k) { devs[k].set([[x, 0.45 + 0.42 * k], [m, 0.45 + 0.42 * k]]); });
      sq.innerHTML = 'Squared deviations: ' + xs.map(function (x) { return M4.fmt((x - m) * (x - m), 2); }).join(', ') + '. Their average is the variance.';
      set('m', m); set('v', v); set('s', sd);
    }
    xs.forEach(function (x, k) {
      p.handle(x, 0, { color: COL.blue, r: 10, snap: 0.5, bounds: { xmin: 1, xmax: 10, ymin: 0, ymax: 0 }, onDrag: function (u) { xs[k] = u; upd(); } });
    });
    upd();
  }
  function readoutMulti(parent, items) {
    var row = M4.el('div', { class: 'm4-readout' }, parent), vals = {};
    items.forEach(function (it) {
      var sp = M4.el('span', null, row);
      var l = M4.el('span', { html: '\\(' + it[1] + '\\) = ' }, sp); M4.typeset(l);
      vals[it[0]] = M4.el('b', { text: '0' }, sp);
    });
    return function (k, v) { vals[k].textContent = M4.fmt(v, 2); };
  }
  function sampleGen() {
    var n = M4.pick([4, 5]), xs = [], i, kind = M4.pick(['mean', 'var', 'sd', 'z']);
    for (i = 0; i < n; i++) xs.push(M4.rand(0, 9));
    var m = xs.reduce(function (a, b) { return a + b; }, 0) / n;
    var v = xs.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / n;
    if (v === 0) return sampleGen();
    var sd = Math.sqrt(v), data = '\\(' + xs.join(',\\ ') + '\\)';
    var base = 'The mean is \\(\\bar x = ' + M4.fmt(m, 2) + '\\)';
    if (kind === 'mean') return { q: 'Data: ' + data + '. Compute the sample mean \\(\\bar x\\).', answer: m, tol: 0.01, explain: 'Add the ' + n + ' values and divide by ' + n + '.' };
    if (kind === 'var') return { q: 'Data: ' + data + '. Compute the sample variance \\(s^2 = \\frac1n\\sum_i (x_i - \\bar x)^2\\).', answer: v, tol: 0.02, explain: base + '. Average the squared deviations from it.' };
    if (kind === 'sd') return { q: 'Data: ' + data + '. Compute the sample standard deviation \\(s\\), using the \\(\\frac1n\\) convention.', answer: sd, tol: 0.02, explain: base + ' and \\(s^2 = ' + M4.fmt(v, 2) + '\\).' };
    var j = M4.rand(0, n - 1);
    return { q: 'Data: ' + data + '. Compute the standardized value \\(z = (x - \\bar x)/s\\) of \\(x = ' + xs[j] + '\\).', answer: (xs[j] - m) / sd, tol: 0.03, hint: 'Use the \\(\\frac1n\\) convention for \\(s\\).', explain: base + ' and \\(s = ' + M4.fmt(sd, 2) + '\\).' };
  }

  M4.lesson({
    id: 'probability-s2',
    module: 'probability',
    title: 'Expectation and variance',
    summary: 'The mean is the balance point of a distribution and the variance measures its spread. Linearity of expectation makes both easy to compute.',
    minutes: 16,
    steps: [
      {
        kind: 'text',
        title: 'Summaries of a distribution',
        html: '<p>A distribution assigns a probability \\(p(x)\\) to every value \\(x\\) that a random variable \\(X\\) can take. Two numbers summarise it: the <b>expectation</b>, which states where the distribution is centred, and the <b>variance</b>, which states how widely it is spread.</p>' +
          '<p>After this lesson you should be able to compute both for a discrete distribution, interpret the expectation as a balance point, and use the rules for \\(aX + b\\) and for sums of random variables.</p>'
      },
      {
        kind: 'explore',
        title: 'The expectation as a balance point',
        html: '<p>The expectation of \\(X\\) is the probability-weighted average of its values: \\[\\mathbb{E}[X] = \\sum_x x\\,p(x).\\] If each probability is drawn as a weight standing on a beam at position \\(x\\), the beam balances at \\(\\mathbb{E}[X]\\). Drag the white handles to change the weights. The numbers above the bars are the probabilities after rescaling so that they sum to 1, and the pivot follows the expectation.</p>',
        mount: function (el, ctx) { beam(el, ctx, { weights: [0.2, 0.2, 0.2, 0.2, 0.2], editable: true }); }
      },
      {
        kind: 'exercise',
        title: 'The balance point',
        html: '<p>The beam carries the distribution \\(p(1) = 0.1\\), \\(p(2) = 0.1\\), \\(p(3) = 0.2\\), \\(p(4) = 0.2\\), \\(p(5) = 0.4\\). Drag the purple pivot until the beam is level. The beam is level when the net moment \\(\\sum_x p(x)\\,(x - \\text{pivot})\\) is zero.</p>',
        hint: 'Compute \\(1(0.1) + 2(0.1) + 3(0.2) + 4(0.2) + 5(0.4)\\). The pivot moves in steps of 0.1 and snaps into place when it is released within 0.1 of the balance point.',
        mount: function (el, ctx) { beam(el, ctx, { weights: [0.1, 0.1, 0.2, 0.2, 0.4], fulcrumDrag: true, fulcrum: 2.5 }); }
      },
      {
        kind: 'exercise',
        title: 'Expectation practice',
        html: '<p>A random variable \\(X\\) has the distribution in the table. Compute \\(\\mathbb{E}[X] = \\sum_x x\\,p(x)\\).</p>',
        hint: 'Multiply each value by its probability and add: \\(0 \\cdot 0.5 + 1 \\cdot 0.3 + 2 \\cdot 0.2\\).',
        mount: function (el, ctx) {
          table(el, [0, 1, 2], [0.5, 0.3, 0.2]);
          M4.numberInput(el, {
            answer: 0.7, tolerance: 0.005, placeholder: '0.0', label: 'E[X] =',
            onCorrect: function () { ctx.note('\\(0 \\cdot 0.5 + 1 \\cdot 0.3 + 2 \\cdot 0.2 = 0.7\\). The expectation need not be a value that \\(X\\) can take.'); ctx.solved(); },
            onWrong: function (v) {
              if (Math.abs(v - 1) < 0.005) ctx.wrong('1 is the plain average of the values 0, 1, 2. Each value must be weighted by its probability.');
              else if (Math.abs(v) < 0.005) ctx.wrong('0 is the most probable value, not the probability-weighted average.');
              else ctx.wrong('Weight each value by its probability and add the three products.');
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'Variance',
        html: '<p>Write \\(\\mu = \\mathbb{E}[X]\\). The <b>variance</b> is the expected squared distance from the mean, \\[\\mathrm{Var}(X) = \\mathbb{E}\\big[(X - \\mu)^2\\big] = \\sum_x (x - \\mu)^2\\,p(x),\\] and its square root \\(\\sigma = \\sqrt{\\mathrm{Var}(X)}\\) is the <b>standard deviation</b>, which has the same units as \\(X\\). The distribution below places probability \\(q/2\\) at each of \\(\\mu - d\\) and \\(\\mu + d\\) and the remainder at \\(\\mu\\). Each orange square has area \\(d^2\\), the squared deviation of a tail. Doubling \\(d\\) quadruples the variance, while \\(q\\) changes it only in proportion.</p>',
        mount: function (el, ctx) { varianceExplore(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'Variance practice',
        html: '<p>A random variable \\(X\\) takes the value 0 with probability 0.75 and the value 4 with probability 0.25. Compute \\(\\mathrm{Var}(X)\\): first find \\(\\mu\\), then average the squared deviations \\((x - \\mu)^2\\) with the probabilities as weights.</p>',
        hint: 'The mean is \\(\\mu = 4 \\cdot 0.25 = 1\\). The squared deviations are \\((0 - 1)^2 = 1\\) and \\((4 - 1)^2 = 9\\).',
        mount: function (el, ctx) {
          table(el, [0, 4], [0.75, 0.25]);
          M4.numberInput(el, {
            answer: 3, tolerance: 0.005, placeholder: '0.0', label: 'Var(X) =',
            onCorrect: function () { ctx.note('\\(0.75 \\cdot 1 + 0.25 \\cdot 9 = 3\\), so \\(\\sigma = \\sqrt{3} \\approx 1.73\\).'); ctx.solved(); },
            onWrong: function (v) {
              if (Math.abs(v - 1) < 0.005) ctx.wrong('1 is the mean. The variance averages the squared deviations from that mean.');
              else if (Math.abs(v - 4) < 0.005) ctx.wrong('4 is E[X²]. Deviations must be measured from the mean: subtract μ² = 1.');
              else if (Math.abs(v - Math.sqrt(3)) < 0.01) ctx.wrong('That is the standard deviation. The variance is its square.');
              else if (Math.abs(v - 1.5) < 0.005) ctx.wrong('That averages the absolute deviations. The variance uses squared deviations.');
              else ctx.wrong('Use 0.75 · (0 − μ)² + 0.25 · (4 − μ)² with μ = 1.');
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Linearity of expectation',
        html: '<p>For constants \\(a\\) and \\(b\\) and any random variables \\(X\\) and \\(Y\\), \\[\\mathbb{E}[aX + b] = a\\,\\mathbb{E}[X] + b, \\qquad \\mathbb{E}[X + Y] = \\mathbb{E}[X] + \\mathbb{E}[Y].\\] The second rule holds whether or not \\(X\\) and \\(Y\\) are independent. Variance behaves differently: a shift leaves every deviation unchanged and a scale multiplies every deviation by \\(a\\), so \\[\\mathrm{Var}(aX + b) = a^2\\,\\mathrm{Var}(X), \\qquad \\sigma(aX + b) = |a|\\,\\sigma(X).\\]</p>'
      },
      {
        kind: 'exercise',
        title: 'Scaling and shifting',
        html: '<p>The variable \\(X\\) takes the values 1, 2, 3 with probabilities 0.25, 0.5, 0.25, so \\(\\mathbb{E}[X] = 2\\) and \\(\\sigma(X) = \\sqrt{0.5} \\approx 0.71\\). Choose \\(a\\) and \\(b\\) so that \\(Y = aX + b\\) coincides with the dashed target distribution, which has \\(\\mathbb{E}[Y] = 1\\) and \\(\\sigma(Y) \\approx 1.41\\).</p>',
        hint: 'The target is twice as wide as \\(X\\), so \\(|a| = 2\\). Then solve \\(2a + b = 1\\) for \\(b\\).',
        mount: function (el, ctx) { affineExercise(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'Linearity practice',
        html: '<p>Drag the correct value into each slot. Two of the six tiles are not used.</p>',
        hint: 'Expectation: \\(\\mathbb{E}[aX + b] = a\\,\\mathbb{E}[X] + b\\). Variance: \\(\\mathrm{Var}(aX + b) = a^2\\,\\mathrm{Var}(X)\\).',
        mount: function (el, ctx) { tokenExercise(el, ctx); }
      },
      {
        kind: 'explore',
        title: 'The loss as an expectation',
        html: '<p>Training aims for a small <b>expected loss</b> \\(\\mathbb{E}[L]\\), the average loss over all examples the model could ever see. Nobody can compute it exactly, so each training step estimates it by the average loss of a small random batch of \\(n\\) examples, called a <b>mini-batch</b>. By linearity the expectation of that average is \\(\\mathbb{E}[L]\\), and for independent examples its standard deviation is \\(\\sigma/\\sqrt{n}\\), where \\(\\sigma\\) is the standard deviation of a single loss. Here a single loss is 0, 1, 2 or 4 with probabilities 0.4, 0.3, 0.2, 0.1. The histogram collects mini-batch averages.</p>',
        mount: function (el, ctx) { batchExplore(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'A distribution with given moments',
        html: '<p>Build a distribution on the values 1 to 5 with \\(\\mathbb{E}[X] = 3\\) and \\(\\mathrm{Var}(X) = 2\\). Drag the white handles or use the buttons to stack up to four blocks on each value. Every block carries the same probability. The purple dot shows the mean and the orange bar spans \\(\\mu \\pm \\sigma\\).</p>',
        hint: 'A symmetric arrangement about 3 fixes the mean. Squared deviations are 4 at the values 1 and 5, 1 at 2 and 4, and 0 at 3. Their average must be 2. One block on every value works.',
        mount: function (el, ctx) { buildExercise(el, ctx); }
      },
      {
        kind: 'text',
        title: 'From a distribution to data',
        html: '<p>Usually we do not know \\(p(x)\\). We have \\(n\\) observed values \\(x_1, \\dots, x_n\\) and treat each as having probability \\(1/n\\). The expectation and the variance of that distribution are the <b>sample mean</b> and the <b>sample variance</b>: \\[\\bar x = \\frac1n \\sum_{i=1}^n x_i, \\qquad s^2 = \\frac1n \\sum_{i=1}^n (x_i - \\bar x)^2, \\qquad s = \\sqrt{s^2}.\\] Statistics texts often divide by \\(n - 1\\) to estimate the variance of the underlying distribution without bias. Normalization layers in neural networks use \\(\\frac1n\\), and so does this course. For large \\(n\\) the two agree closely.</p>'
      },
      {
        kind: 'explore',
        title: 'Sample mean and spread',
        html: '<p>Drag the five blue data points along the line. The purple line is the sample mean \\(\\bar x\\), each orange segment is the deviation \\(x_i - \\bar x\\) of one point, and the shaded band spans \\(\\bar x \\pm s\\). Move one point far away and watch both numbers react: a single outlier shifts the mean and inflates \\(s\\) quickly, because its deviation enters squared.</p>',
        mount: function (el) { sampleExplore(el); }
      },
      {
        kind: 'exercise',
        title: 'Sample statistics practice',
        html: '<p>Compute the requested statistic. Answers within 0.02 count, and fractions such as 7/2 are accepted. Get four right.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: sampleGen }); }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>The expectation \\(\\mathbb{E}[X] = \\sum_x x\\,p(x)\\) is the balance point of the distribution: the moments \\(p(x)\\,(x - \\mu)\\) on both sides cancel.</li>' +
          '<li>The variance \\(\\mathrm{Var}(X) = \\mathbb{E}[(X - \\mu)^2]\\) is the average squared deviation from the mean. The standard deviation \\(\\sigma\\) is its square root.</li>' +
          '<li>For data \\(x_1, \\dots, x_n\\), the sample mean \\(\\bar x\\) and sample standard deviation \\(s\\) are the same quantities computed with weight \\(1/n\\) on each point.</li>' +
          '<li>Expectation is linear, \\(\\mathbb{E}[aX + b] = a\\,\\mathbb{E}[X] + b\\) and \\(\\mathbb{E}[X + Y] = \\mathbb{E}[X] + \\mathbb{E}[Y]\\), while \\(\\mathrm{Var}(aX + b) = a^2\\,\\mathrm{Var}(X)\\). This is why a mini-batch average is an unbiased estimate of the expected loss, with noise \\(\\sigma/\\sqrt{n}\\).</li>' +
          '</ul>'
      }
    ]
  });
})();
