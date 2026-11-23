(function () {
  'use strict';

  var C = M4.colors;
  var GREEN = C.green, ORANGE = C.orange, BLUE = C.blue, PURPLE = C.purple;

  /* ------------------------------------------------------------------ */
  /* styles (injected once)                                              */
  /* ------------------------------------------------------------------ */
  function injectStyle() {
    if (document.getElementById('l3-s4-style')) return;
    var st = document.createElement('style');
    st.id = 'l3-s4-style';
    st.textContent = [
      '.l3-s4-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%}',
      '.l3-s4-svg{width:100%;height:auto;display:block;background:#fff;border:1px solid ' + C.line + ';border-radius:16px;touch-action:pan-y}',
      '.l3-s4-eq{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;font-size:22px;min-height:64px}',
      '.l3-s4-eqbox{display:flex;flex-direction:column;gap:14px;background:#fff;border:1px solid ' + C.line + ';border-radius:16px;padding:20px 16px;width:100%;box-sizing:border-box}',
      '.l3-s4-slot{display:inline-flex;align-items:center;justify-content:center;min-width:84px;min-height:54px;box-sizing:border-box;vertical-align:middle}',
      '.l3-s4-slot.l3-s4-bad{border-color:' + C.red + ';background:#fff1f0}',
      '.l3-s4-slot.l3-s4-good{border-color:' + GREEN + ';background:#eafaf2;border-style:solid}',
      '.l3-s4-frac{display:inline-flex;flex-direction:column;align-items:center;gap:6px}',
      '.l3-s4-fracbar{height:3px;width:100%;min-width:96px;background:' + C.ink + ';border-radius:2px}',
      '.l3-s4-tray{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;min-height:62px;width:100%}',
      '.l3-s4-tok{min-width:68px;min-height:46px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;padding:4px 10px;box-sizing:border-box;touch-action:none;user-select:none;-webkit-user-select:none}',
      '.l3-s4-tok.l3-s4-sel{border-color:' + GREEN + ';box-shadow:0 0 0 3px rgba(22,181,107,.25)}',
      '.l3-s4-gauge{position:relative;width:100%;max-width:560px;height:26px;border-radius:13px;background:#f0eee7;overflow:hidden;border:1px solid ' + C.line + '}',
      '.l3-s4-gfill{position:absolute;left:0;top:0;bottom:0;background:' + GREEN + ';border-radius:13px;transition:width .08s linear}',
      '.l3-s4-gband{position:absolute;top:0;bottom:0;background:rgba(255,138,31,.28);border-left:2px dashed ' + ORANGE + ';border-right:2px dashed ' + ORANGE + '}',
      '.l3-s4-glabels{display:flex;justify-content:space-between;width:100%;max-width:560px;font-size:15px;color:' + C.muted + '}',
      '.l3-s4-legend{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}',
      '.l3-s4-key{display:inline-flex;align-items:center;gap:8px;font-size:16px;padding:6px 12px;border-radius:999px;background:#fff;border:1px solid ' + C.line + ';font-variant-numeric:tabular-nums}',
      '.l3-s4-dot{width:14px;height:14px;border-radius:50%;display:inline-block}',
      '.l3-s4-h{cursor:grab;touch-action:none}',
      '.l3-s4-h:active{cursor:grabbing}',
      '.l3-s4-sliders{width:100%;max-width:560px;display:flex;flex-direction:column;gap:8px}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ */
  /* small helpers                                                       */
  /* ------------------------------------------------------------------ */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fx(v, d) { var s = v.toFixed(d); return (s.replace(/[-0.]/g, '') === '' ? s.replace('-', '') : s).replace('-', '\u2212'); }
  function wrap(el) { injectStyle(); return M4.el('div', { class: 'l3-s4-wrap' }, el); }
  function svgRoot(parent, w, h) {
    return M4.svg('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'l3-s4-svg', style: 'max-width:' + w + 'px' }, parent);
  }
  function readout(parent, label) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    return { el: r, set: function (v) { r.textContent = label + ' ' + v; }, vec: function (a) { r.textContent = label + ' '; r.insertAdjacentHTML('beforeend', M4.tex(M4.col(a))); } };
  }

  // Deterministic, centred, unit-variance noise sequence.
  var T = 120;
  var EPS = (function () {
    var s = 1, out = [], i;
    function r() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    for (i = 0; i < T; i++) out.push(Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()));
    var m = 0; for (i = 0; i < T; i++) m += out[i]; m /= T;
    var q = 0; for (i = 0; i < T; i++) { out[i] -= m; q += out[i] * out[i]; }
    q = Math.sqrt(q / T);
    for (i = 0; i < T; i++) out[i] /= q;
    return out;
  })();

  // Running averages of g and g^2 (start-up phase normalised), plus averages over the second half.
  function runAverages(mu, sigma, scale) {
    var b1 = 0.9, b2 = 0.99, v = 0, G = 0, g = [], vs = [], rs = [];
    var mv = 0, mr = 0, mq = 0, n = 0;
    for (var t = 1; t <= T; t++) {
      var gt = scale * (mu + sigma * EPS[t - 1]);
      v = b1 * v + (1 - b1) * gt;
      G = b2 * G + (1 - b2) * gt * gt;
      var vh = v / (1 - Math.pow(b1, t));
      var rh = Math.sqrt(G / (1 - Math.pow(b2, t)));
      g.push(gt); vs.push(vh); rs.push(rh);
      if (t > T / 2) { mv += vh; mr += rh; mq += rh > 1e-12 ? vh / rh : 0; n++; }
    }
    return { g: g, v: vs, r: rs, mv: mv / n, mr: mr / n, ratio: mq / n };
  }

  /* ------------------------------------------------------------------ */
  /* signal / noise widget (explore + exercise)                          */
  /* ------------------------------------------------------------------ */
  function snrWidget(el, ctx, opts) {
    var root = wrap(el);
    var W = 640, H = 300, X0 = 54, X1 = 624, Y0 = 18, Y1 = 282, YM = 6;
    var legend = M4.el('div', { class: 'l3-s4-legend' }, root);
    [['gradient \\(g\\)', C.muted], ['signal \\(v\\)', GREEN], ['size \\(\\sqrt{G}\\)', ORANGE]].forEach(function (k) {
      var key = M4.el('span', { class: 'l3-s4-key' }, legend);
      M4.el('span', { class: 'l3-s4-dot', style: 'background:' + k[1] }, key);
      M4.el('span', { html: k[0] }, key);
    });
    M4.typeset(legend);
    var svg = svgRoot(root, W, H);
    function px(t) { return X0 + (X1 - X0) * (t + 0.5) / T; }
    function py(v) { return Y0 + (Y1 - Y0) * (YM - clamp(v, -YM, YM)) / (2 * YM); }
    [-4, -2, 0, 2, 4].forEach(function (v) {
      M4.svg('line', { x1: X0, x2: X1, y1: py(v), y2: py(v), stroke: v === 0 ? C.ink : C.line, 'stroke-width': v === 0 ? 1.5 : 1 }, svg);
      var tx = M4.svg('text', { x: X0 - 10, y: py(v) + 5, 'text-anchor': 'end', 'font-size': 15, fill: C.muted }, svg);
      tx.textContent = (v < 0 ? '\u2212' : '') + Math.abs(v);
    });
    var lab = M4.svg('text', { x: X1, y: Y1 + 14, 'text-anchor': 'end', 'font-size': 15, fill: C.muted }, svg);
    lab.textContent = 'step t \u2192';
    var stems = [], dots = [], i;
    for (i = 0; i < T; i++) {
      stems.push(M4.svg('line', { x1: px(i), x2: px(i), y1: py(0), y2: py(0), stroke: '#b9bcc2', 'stroke-width': 2 }, svg));
      dots.push(M4.svg('circle', { cx: px(i), cy: py(0), r: 2.6, fill: '#8b8f96' }, svg));
    }
    var rLine = M4.svg('polyline', { fill: 'none', stroke: ORANGE, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, svg);
    var vLine = M4.svg('polyline', { fill: 'none', stroke: GREEN, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, svg);

    var outs = M4.el('div', { class: 'm4-row' }, root);
    var oV = readout(outs, 'v \u2248'), oR = readout(outs, '\u221AG \u2248'), oQ = readout(outs, 'v / \u221AG \u2248');
    oQ.el.style.borderColor = GREEN;
    var gauge = M4.el('div', { class: 'l3-s4-gauge' }, root);
    if (opts.band) M4.el('div', { class: 'l3-s4-gband', style: 'left:' + (opts.band[0] * 100) + '%;width:' + ((opts.band[1] - opts.band[0]) * 100) + '%' }, gauge);
    var fill = M4.el('div', { class: 'l3-s4-gfill' }, gauge);
    var gl = M4.el('div', { class: 'l3-s4-glabels' }, root);
    M4.el('span', { text: '0  (noise)' }, gl);
    M4.el('span', { text: 'v / \u221AG' }, gl);
    M4.el('span', { text: '1  (consistent)' }, gl);

    var state = { mu: opts.mu, sigma: opts.sigma, ratio: 0 };
    function draw() {
      var a = runAverages(state.mu, state.sigma, 1), pv = '', pr = '';
      for (var k = 0; k < T; k++) {
        stems[k].setAttribute('y2', py(a.g[k]));
        dots[k].setAttribute('cy', py(a.g[k]));
        pv += px(k).toFixed(1) + ',' + py(a.v[k]).toFixed(1) + ' ';
        pr += px(k).toFixed(1) + ',' + py(a.r[k]).toFixed(1) + ' ';
      }
      vLine.setAttribute('points', pv); rLine.setAttribute('points', pr);
      state.ratio = a.ratio;
      oV.set(fx(a.mv, 2)); oR.set(fx(a.mr, 2)); oQ.set(fx(a.ratio, 2));
      fill.style.width = (clamp(Math.abs(a.ratio), 0, 1) * 100) + '%';
      fill.style.background = a.ratio < 0 ? C.pink : GREEN;
    }
    var sl = M4.el('div', { class: 'l3-s4-sliders' }, root);
    var sMu = null, sSig;
    if (!opts.fixMu) {
      sMu = M4.slider(sl, { min: -1, max: 1, step: 0.05, value: state.mu, label: 'mean gradient', format: function (v) { return fx(+v, 2); },
        onInput: function (v) { state.mu = +v; draw(); } });
    }
    sSig = M4.slider(sl, { min: 0, max: 2.5, step: 0.05, value: state.sigma, label: 'noise level', format: function (v) { return fx(+v, 2); },
      onInput: function (v) { state.sigma = +v; draw(); } });
    draw();
    return { root: root, state: state, sMu: sMu, sSig: sSig, draw: draw, fill: fill };
  }

  /* ------------------------------------------------------------------ */
  /* curved-valley race                                                  */
  /* ------------------------------------------------------------------ */
  var VA = 3, VB = 0.2, MINX = 2, MINY = 1, SX = -3, SY = 4, NSTEPS = 200;
  function loss(x, y) { var r = y - 0.25 * x * x; return VA * r * r + VB * (x - MINX) * (x - MINX); }
  function grad(x, y) { var r = y - 0.25 * x * x; return [-VA * r * x + 2 * VB * (x - MINX), 2 * VA * r]; }
  // Returns the path and the step at which the iterate enters (and stays in) the target disc.
  function simulate(kind, eta, n) {
    var x = SX, y = SY, vx = 0, vy = 0, Gx = 0, Gy = 0, e = 1e-8, path = [[x, y]], hit = -1;
    for (var t = 1; t <= n; t++) {
      var g = grad(x, y), gx = g[0], gy = g[1];
      if (kind === 'gd') { x -= eta * gx; y -= eta * gy; }
      else if (kind === 'mom') { vx = 0.9 * vx + gx; vy = 0.9 * vy + gy; x -= eta * vx; y -= eta * vy; }
      else if (kind === 'rms') {
        Gx = 0.9 * Gx + 0.1 * gx * gx; Gy = 0.9 * Gy + 0.1 * gy * gy;
        x -= eta * gx / (Math.sqrt(Gx) + e); y -= eta * gy / (Math.sqrt(Gy) + e);
      } else {
        vx = 0.9 * vx + 0.1 * gx; vy = 0.9 * vy + 0.1 * gy;
        Gx = 0.999 * Gx + 0.001 * gx * gx; Gy = 0.999 * Gy + 0.001 * gy * gy;
        var c1 = 1 - Math.pow(0.9, t), c2 = 1 - Math.pow(0.999, t);
        x -= eta * (vx / c1) / (Math.sqrt(Gx / c2) + e); y -= eta * (vy / c1) / (Math.sqrt(Gy / c2) + e);
      }
      if (!isFinite(x) || !isFinite(y)) { hit = -1; break; }
      path.push([x, y]);
      var d = Math.sqrt((x - MINX) * (x - MINX) + (y - MINY) * (y - MINY));
      if (hit < 0 && d < 0.2) hit = t;
      if (hit > 0 && d >= 0.35) hit = -1;
    }
    return { path: path, hit: hit };
  }

  var bgCache = null;
  function valleyBackground(xmin, xmax, ymin, ymax) {
    if (bgCache !== null) return bgCache;
    try {
      var cw = 270, ch = 210, cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      var c2 = cv.getContext('2d'), img = c2.createImageData(cw, ch);
      for (var j = 0; j < ch; j++) for (var i = 0; i < cw; i++) {
        var x = xmin + (xmax - xmin) * (i + 0.5) / cw, y = ymax - (ymax - ymin) * (j + 0.5) / ch;
        var l = Math.log(loss(x, y) + 0.03) / Math.LN2;           // about -5 .. 8
        var tt = clamp((l + 5) / 13, 0, 1), band = Math.floor(l * 1.6);
        var sh = (band % 2 === 0) ? 0 : -7;
        var o = (j * cw + i) * 4;
        img.data[o] = 250 - 40 * tt + sh; img.data[o + 1] = 252 - 30 * tt + sh; img.data[o + 2] = 248 - 14 * tt + sh; img.data[o + 3] = 255;
      }
      c2.putImageData(img, 0, 0);
      bgCache = cv.toDataURL('image/png');
    } catch (err) { bgCache = ''; }
    return bgCache;
  }

  function valleyPlane(parent) {
    var xmin = -4.5, xmax = 4.5, ymin = -1.5, ymax = 5.5;
    var p = M4.plane(parent, { xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax, width: 630, height: 490, grid: false, axes: false, labels: false });
    var url = valleyBackground(xmin, xmax, ymin, ymax);
    if (url) {
      var im = M4.svg('image', { x: p.x(xmin), y: p.y(ymax), width: p.x(xmax) - p.x(xmin), height: p.y(ymin) - p.y(ymax), preserveAspectRatio: 'none' }, p.g);
      im.setAttribute('href', url);
      im.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
    }
    // valley floor (dashed), target disc, start, labels
    var floor = [];
    for (var x = -4.5; x <= 4.501; x += 0.1) floor.push([x, 0.25 * x * x]);
    var fl = p.path(floor, { stroke: '#aab0b8', width: 2 });
    fl.el.setAttribute('stroke-dasharray', '6 7');
    var ring = M4.svg('circle', { cx: p.x(MINX), cy: p.y(MINY), r: Math.abs(p.x(0.2) - p.x(0)), fill: 'rgba(22,181,107,.12)', stroke: GREEN, 'stroke-width': 2.5, 'stroke-dasharray': '5 4' }, p.g);
    p.point(MINX, MINY, { r: 4, fill: GREEN });
    p.text(MINX + 0.25, MINY - 0.65, 'minimum', { fill: C.ink, size: 16, weight: 600 });
    p.point(SX, SY, { r: 7, fill: C.ink });
    p.text(SX, SY + 0.45, 'start', { fill: C.ink, size: 16, weight: 600 });
    p.text(3.9, -1.15, '\u03B8\u2081 \u2192', { fill: C.muted, size: 16 });
    p.text(-4.05, 5.0, '\u03B8\u2082 \u2191', { fill: C.muted, size: 16 });
    return { p: p, ring: ring };
  }

  /* ------------------------------------------------------------------ */
  /* lesson                                                              */
  /* ------------------------------------------------------------------ */
  M4.lesson({
    id: 'l3-s4',
    module: 'l3',
    title: 'Adam',
    summary: 'Adam combines a running average of the gradients with a running average of their squares. Its step size is bounded by the learning rate, and its behaviour is compared with that of the other optimizers.',
    minutes: 12,
    steps: [
      /* 1 ------------------------------------------------------------ */
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>Momentum smooths the gradient, and RMSProp gives every parameter its own step size. Adam combines the two and is the optimizer used for almost all deep learning models.</p>' +
          '<p>The aim is to write down the Adam update, explain why the quantity \\(v/\\sqrt{G}\\) behaves like a signal-to-noise ratio, predict how far a parameter moves in one Adam step, and describe the learning-rate schedule used with Adam.</p>'
      },
      /* 2 ------------------------------------------------------------ */
      {
        kind: 'text',
        title: 'The Adam update',
        html: '<p>Let \\(g\\) be the gradient of the loss with respect to one parameter \\(\\theta\\), and let \\(\\eta\\) be the learning rate. Adam keeps two running averages per parameter: \\(v\\), the average of past gradients (as in momentum), and \\(G\\), the average of past squared gradients (as in RMSProp).</p>' +
          '\\[\\begin{aligned} v &\\leftarrow \\beta_1 v + (1-\\beta_1)\\,g \\\\ G &\\leftarrow \\beta_2 G + (1-\\beta_2)\\,g^2 \\\\ \\theta &\\leftarrow \\theta - \\eta\\,\\frac{v}{\\sqrt{G}} \\end{aligned}\\]' +
          '<p>The constants \\(\\beta_1\\) and \\(\\beta_2\\) lie between 0 and 1 and control how slowly old gradients are forgotten. Common values are \\(\\beta_1 = 0.9\\) and \\(\\beta_2 = 0.999\\). The step is the gradient-descent step with the gradient replaced by its smoothed version \\(v\\), divided by \\(\\sqrt{G}\\) so that steep directions take small steps and shallow directions take large ones.</p>'
      },
      /* 3 ------------------------------------------------------------ */
      {
        kind: 'exercise',
        title: 'Adam update practice',
        html: '<p>Four pieces of the Adam update are missing. Drag the tiles into the dashed slots so that \\(v\\) averages the gradients, \\(G\\) averages the squared gradients, and the step uses both. Two tiles are not needed.</p>',
        hint: 'The first line is the momentum average and takes the plain gradient. The second line is the RMSProp average and takes the squared gradient. The step divides the smoothed gradient by the root of the average squared gradient.',
        mount: function (el, ctx) {
          var root = wrap(el);
          var box = M4.el('div', { class: 'l3-s4-eqbox' }, root);
          var want = ['g', 'g2', 'v', 'rG'], slots = [];
          function slot(parent, idx) {
            var s = M4.el('span', { class: 'm4-slot l3-s4-slot' }, parent);
            s.setAttribute('data-i', idx); slots[idx] = s; return s;
          }
          function piece(parent, tex) { return M4.el('span', { html: M4.tex(tex) }, parent); }
          var l1 = M4.el('div', { class: 'l3-s4-eq' }, box);
          piece(l1, 'v \\leftarrow \\beta_1 v + (1-\\beta_1)'); slot(l1, 0);
          var l2 = M4.el('div', { class: 'l3-s4-eq' }, box);
          piece(l2, 'G \\leftarrow \\beta_2 G + (1-\\beta_2)'); slot(l2, 1);
          var l3 = M4.el('div', { class: 'l3-s4-eq' }, box);
          piece(l3, '\\theta \\leftarrow \\theta - \\eta\\,\\cdot');
          var fr = M4.el('span', { class: 'l3-s4-frac' }, l3);
          slot(fr, 2); M4.el('span', { class: 'l3-s4-fracbar' }, fr); slot(fr, 3);

          var tray = M4.el('div', { class: 'l3-s4-tray' }, root);
          var defs = [['rG', '\\sqrt{G}'], ['g', 'g'], ['eta', '\\eta'], ['v', 'v'], ['g2', 'g^2'], ['G', 'G']];
          var tokens = defs.map(function (d) {
            var t = M4.el('div', { class: 'm4-token l3-s4-tok', html: M4.tex(d[1]) }, tray);
            t.setAttribute('data-k', d[0]); return t;
          });
          M4.el('div', { class: 'm4-note', text: 'Drag a tile into a slot, or tap a tile and then tap a slot.' }, root);

          var done = false, selected = null, lastDrop = 0;
          function select(t) {
            if (selected) selected.classList.remove('l3-s4-sel');
            selected = t; if (t) t.classList.add('l3-s4-sel');
          }
          function toTray(t) { t.style.transform = ''; t.style.left = ''; t.style.top = ''; t.style.position = ''; tray.appendChild(t); }
          function refresh() {
            slots.forEach(function (s) {
              var has = !!s.querySelector('.m4-token');
              s.classList.toggle('filled', has);
              s.classList.remove('l3-s4-bad');
            });
          }
          function place(t, s) {
            if (done) return;
            var old = s.querySelector('.m4-token');
            if (old && old !== t) toTray(old);
            t.style.transform = ''; t.style.left = ''; t.style.top = ''; t.style.position = '';
            s.appendChild(t); select(null); refresh(); check();
          }
          function check() {
            var filled = slots.every(function (s) { return s.querySelector('.m4-token'); });
            if (!filled) { ctx.note(''); return; }
            var bad = [];
            slots.forEach(function (s, i) {
              if (s.querySelector('.m4-token').getAttribute('data-k') !== want[i]) bad.push(i);
            });
            if (bad.length === 0) {
              done = true;
              slots.forEach(function (s) { s.classList.add('l3-s4-good'); });
              box.classList.add('m4-pop');
              ctx.note('Correct: \\(v\\) averages \\(g\\), \\(G\\) averages \\(g^2\\), and the step is \\(\\eta\\,v/\\sqrt{G}\\).');
              ctx.solved();
              return;
            }
            var msg = bad[0] === 0 ? 'The first line is the momentum average: it mixes in the gradient itself, not its square.'
              : bad[0] === 1 ? 'The second line is the RMSProp average: it mixes in the squared gradient \\(g^2\\).'
                : 'The step is the smoothed gradient \\(v\\) divided by \\(\\sqrt{G}\\), the typical size of the gradient.';
            bad.forEach(function (i) { slots[i].classList.add('l3-s4-bad'); });
            ctx.wrong(msg);
            var tm = setTimeout(function () {
              bad.forEach(function (i) { var t = slots[i].querySelector('.m4-token'); if (t) toTray(t); });
              refresh();
            }, 900);
            ctx.onCleanup(function () { clearTimeout(tm); });
          }
          M4.dragDrop({
            tokens: tokens, slots: slots,
            onDrop: function (t, s) { lastDrop = Date.now(); place(t, s); },
            onMiss: function (t) { lastDrop = Date.now(); if (done) return; toTray(t); refresh(); }
          });
          tokens.forEach(function (t) {
            t.addEventListener('click', function (ev) {
              if (done || Date.now() - lastDrop < 400) return;
              ev.stopPropagation();
              if (t.parentNode !== tray) { toTray(t); refresh(); select(null); return; }
              select(selected === t ? null : t);
            });
          });
          slots.forEach(function (s) {
            s.addEventListener('click', function () {
              if (done || !selected || Date.now() - lastDrop < 400) return;
              place(selected, s);
            });
          });
        }
      },
      /* 4 ------------------------------------------------------------ */
      {
        kind: 'explore',
        title: 'Signal and noise',
        html: '<p>The plot shows the gradient \\(g\\) of one parameter over 120 steps. The green curve is \\(v\\), the average gradient: opposite signs cancel in it. The orange curve is \\(\\sqrt{G}\\), the typical size of the gradient: squaring makes every term positive, so nothing cancels.</p>' +
          '<p>Change the mean and the noise level. When the gradient always points the same way, \\(v/\\sqrt{G}\\) is close to 1. When it is mostly noise, \\(v/\\sqrt{G}\\) is close to 0. Adam takes large steps where the direction is certain and small steps where it is not.</p>',
        mount: function (el, ctx) {
          var w = snrWidget(el, ctx, { mu: 1, sigma: 0.2 });
          var row = M4.el('div', { class: 'm4-row' }, w.root);
          function preset(mu, sg) {
            return function () { w.state.mu = mu; w.state.sigma = sg; if (w.sMu) w.sMu.set(mu); w.sSig.set(sg); w.draw(); };
          }
          M4.button(row, 'Consistent gradient', preset(1, 0.2));
          M4.button(row, 'Pure noise', preset(0, 1));
          M4.el('div', { class: 'm4-note', text: 'The displayed values are averages over the second half of the run. The running averages are normalised for their start-up phase, a detail the update rule above leaves out.' }, w.root);
        }
      },
      /* 5 ------------------------------------------------------------ */
      {
        kind: 'exercise',
        title: 'Noise and step size',
        html: '<p>The mean gradient is fixed at 1. With no noise, \\(v/\\sqrt{G} = 1\\) and Adam moves the parameter by the full \\(\\eta\\) per step. Increase the noise level until \\(v/\\sqrt{G}\\) lies in the orange band around \\(0.5\\), so that Adam moves at half speed, then press Check.</p>',
        hint: 'Noise does not change \\(v\\) much, because it averages out, but it increases \\(\\sqrt{G}\\). The ratio is roughly \\(1/\\sqrt{1+\\sigma^2}\\) for noise level \\(\\sigma\\), which equals 0.5 near \\(\\sigma \\approx 1.7\\).',
        mount: function (el, ctx) {
          var w = snrWidget(el, ctx, { mu: 1, sigma: 0, fixMu: true, band: [0.47, 0.53] });
          var row = M4.el('div', { class: 'm4-row' }, w.root);
          M4.button(row, 'Check', function () {
            var r = w.state.ratio;
            if (r >= 0.47 && r <= 0.53) {
              w.fill.classList.add('m4-pop');
              ctx.note('With noise about 1.7 times as large as the mean, \\(v/\\sqrt{G} \\approx ' + r.toFixed(2) + '\\): the same average gradient now produces half the step.');
              ctx.solved();
            } else if (r > 0.53) {
              ctx.wrong('The ratio is ' + r.toFixed(2) + ', still above the band. The gradient is too consistent: add more noise.');
            } else {
              ctx.wrong('The ratio is ' + r.toFixed(2) + ', below the band. The noise now dominates: reduce it.');
            }
          }, { primary: true });
        }
      },
      /* 6 ------------------------------------------------------------ */
      {
        kind: 'explore',
        title: 'Scaled gradients',
        html: '<p>Suppose every gradient is multiplied by a constant \\(c\\). Then \\(v\\) is multiplied by \\(c\\), \\(G\\) by \\(c^2\\), and \\(\\sqrt{G}\\) by \\(c\\), so the factor cancels in \\(v/\\sqrt{G}\\).</p>' +
          '<p>Move the slider to rescale the gradients. The gradient-descent step \\(\\eta\\,|g|\\) changes over four orders of magnitude, while the Adam step \\(\\eta\\,|v|/\\sqrt{G}\\) stays where it is. Adam responds to how consistent the gradients are, not to how large they are.</p>',
        mount: function (el, ctx) {
          var root = wrap(el);
          var W = 640, H = 250, X0 = 40, X1 = 600, eta = 0.01;
          var svg = svgRoot(root, W, H);
          function lx(step) { return X0 + (X1 - X0) * (clamp(Math.log(step) / Math.LN10, -5, 0) + 5) / 5; }
          var sup = ['\u2070', '\u207B\u00B9', '\u207B\u00B2', '\u207B\u00B3', '\u207B\u2074', '\u207B\u2075'];
          for (var k = -5; k <= 0; k++) {
            var gx = X0 + (X1 - X0) * (k + 5) / 5;
            M4.svg('line', { x1: gx, x2: gx, y1: 30, y2: 205, stroke: C.line, 'stroke-width': 1.5 }, svg);
            var tk = M4.svg('text', { x: gx, y: 232, 'text-anchor': 'middle', 'font-size': 16, fill: C.muted }, svg);
            tk.textContent = '10' + sup[-k];
          }
          var etaX = lx(eta);
          M4.svg('line', { x1: etaX, x2: etaX, y1: 22, y2: 205, stroke: GREEN, 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg);
          var et = M4.svg('text', { x: etaX + 8, y: 24, 'font-size': 15, fill: GREEN, 'font-weight': 600 }, svg);
          et.textContent = '\u03B7 = 0.01';
          var t1 = M4.svg('text', { x: X0, y: 62, 'font-size': 16, fill: C.ink, 'font-weight': 600 }, svg);
          t1.textContent = 'gradient descent step';
          var b1 = M4.svg('rect', { x: X0, y: 72, height: 34, width: 10, rx: 8, fill: BLUE }, svg);
          var t2 = M4.svg('text', { x: X0, y: 142, 'font-size': 16, fill: C.ink, 'font-weight': 600 }, svg);
          t2.textContent = 'Adam step';
          var b2 = M4.svg('rect', { x: X0, y: 152, height: 34, width: 10, rx: 8, fill: GREEN }, svg);

          var outs = M4.el('div', { class: 'm4-row' }, root);
          var oV = readout(outs, 'v \u2248'), oR = readout(outs, '\u221AG \u2248'), oQ = readout(outs, 'v / \u221AG \u2248');
          var outs2 = M4.el('div', { class: 'm4-row' }, root);
          var oG = readout(outs2, 'GD step \u2248'), oA = readout(outs2, 'Adam step \u2248');
          oG.el.style.borderColor = BLUE; oA.el.style.borderColor = GREEN;
          function sig(v) { return v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v >= 0.01 ? v.toFixed(3) : v.toExponential(1).replace('e-', '\u00B710^\u2212').replace('10^\u22125', '10\u207B\u2075').replace('10^\u22124', '10\u207B\u2074').replace('10^\u22123', '10\u207B\u00B3'); }
          var s = 0;
          function draw() {
            var c = Math.pow(10, s), a = runAverages(0.6, 0.4, c);
            var gd = eta * Math.abs(a.mv), ad = eta * Math.abs(a.ratio);
            b1.setAttribute('width', Math.max(10, lx(gd) - X0));
            b2.setAttribute('width', Math.max(10, lx(ad) - X0));
            oV.set(sig(a.mv)); oR.set(sig(a.mr)); oQ.set(a.ratio.toFixed(2));
            oG.set(sig(gd)); oA.set(sig(ad));
          }
          var sl = M4.el('div', { class: 'l3-s4-sliders' }, root);
          var slider = M4.slider(sl, { min: -2, max: 2, step: 0.05, value: 0, label: 'gradient scale c',
            format: function (v) { var c = Math.pow(10, +v); return '\u00D7 ' + (c >= 10 ? c.toFixed(0) : c >= 1 ? c.toFixed(1) : c.toFixed(2)); },
            onInput: function (v) { s = +v; draw(); } });
          var raf = 0;
          function animateTo(target) {
            cancelAnimationFrame(raf);
            var from = s, t0 = null;
            function frame(ts) {
              if (t0 === null) t0 = ts;
              var u = clamp((ts - t0) / 900, 0, 1), e = u * u * (3 - 2 * u);
              s = from + (target - from) * e; slider.set(Math.round(s * 20) / 20); draw();
              if (u < 1) raf = requestAnimationFrame(frame); else { s = target; slider.set(target); draw(); }
            }
            raf = requestAnimationFrame(frame);
          }
          var row = M4.el('div', { class: 'm4-row' }, root);
          M4.button(row, 'Gradients \u00D7 100', function () { animateTo(2); }, { primary: true });
          M4.button(row, 'Gradients \u00F7 100', function () { animateTo(-2); });
          M4.button(row, 'Reset', function () { animateTo(0); });
          M4.el('div', { class: 'm4-note', text: 'Horizontal axis: size of the parameter update, on a logarithmic scale.' }, root);
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
          draw();
        }
      },
      /* 7 ------------------------------------------------------------ */
      {
        kind: 'exercise',
        title: 'The size of one step',
        html: '<p>A parameter receives the same gradient \\(g = 0.5\\) at every step, long enough for the running averages to settle at \\(v = g\\) and \\(G = g^2\\). The learning rate is \\(\\eta = 0.01\\). By how much does Adam change the parameter in one step? Enter the size \\(|\\Delta\\theta|\\).</p>',
        hint: 'Compute \\(v/\\sqrt{G} = 0.5/\\sqrt{0.25}\\) first, then multiply by \\(\\eta\\).',
        mount: function (el, ctx) {
          var root = wrap(el);
          var box = M4.el('div', { class: 'l3-s4-eqbox' }, root);
          M4.el('div', { class: 'l3-s4-eq', html: M4.tex('|\\Delta\\theta| = \\eta\\,\\frac{|v|}{\\sqrt{G}} = 0.01\\cdot\\frac{0.5}{\\sqrt{0.25}} = \\;?') }, box);
          M4.numberInput(root, {
            answer: 0.01, tolerance: 0.0005, placeholder: '0.000', label: '|\u0394\u03B8| =',
            onCorrect: function () {
              box.classList.add('m4-pop');
              ctx.note('Since \\(v/\\sqrt{G} = 0.5/0.5 = 1\\), the step is \\(\\eta = 0.01\\). A gradient of 50 would give the same step. Because \\(|v|/\\sqrt{G}\\) is at most about 1, each weight moves at most about \\(\\eta\\) per step.');
              ctx.solved();
            },
            onWrong: function (v) {
              if (Math.abs(v - 0.005) < 0.0005) ctx.wrong('0.005 is \\(\\eta\\,g\\), the gradient-descent step. Adam divides by \\(\\sqrt{G} = 0.5\\) as well.');
              else if (Math.abs(v - 1) < 0.01) ctx.wrong('1 is the ratio \\(v/\\sqrt{G}\\). The step is that ratio multiplied by \\(\\eta\\).');
              else if (Math.abs(v - 0.02) < 0.0005) ctx.wrong('The denominator is \\(\\sqrt{G} = \\sqrt{0.25} = 0.5\\), not \\(G = 0.25\\).');
              else ctx.wrong('Not yet. Evaluate \\(0.5/\\sqrt{0.25}\\) and multiply by \\(0.01\\).');
            }
          });
        }
      },
      /* 8 ------------------------------------------------------------ */
      {
        kind: 'exercise',
        title: 'Four Adam steps',
        html: '<p>A model has two parameters \\(\\theta = \\begin{pmatrix}\\theta_1\\\\\\theta_2\\end{pmatrix}\\), starting at \\((-3, -2)\\). The gradient is the same at every step, \\(g = \\begin{pmatrix}-40\\\\0.2\\end{pmatrix}\\), and the running averages have settled. The learning rate is \\(\\eta = 0.5\\). Drag the green point to the position of \\(\\theta\\) after four Adam steps.</p>',
        hint: 'For a constant gradient, \\(v/\\sqrt{G} = g/|g|\\), which is \\(+1\\) or \\(-1\\). Each parameter therefore moves by \\(\\eta = 0.5\\) per step, against the sign of its gradient, regardless of the size of the gradient.',
        mount: function (el, ctx) {
          var root = wrap(el);
          var outs = M4.el('div', { class: 'm4-row' }, root);
          var oG = readout(outs, 'g ='), oE = readout(outs, '\u03B7 ='), oP = readout(outs, '\u03B8 =');
          oG.set('(\u221240, 0.2)'); oE.set('0.5'); oP.el.style.borderColor = GREEN;
          var p = M4.plane(root, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 520, height: 520 });
          var ring = M4.svg('circle', { cx: p.x(-1), cy: p.y(-4), r: 20, fill: 'none', stroke: 'none', 'stroke-width': 4 }, p.g);
          var arrow = p.arrow(-3, -2, -3, -2, { stroke: GREEN, width: 4 });
          arrow.el.style.opacity = 0;
          p.point(-3, -2, { r: 7, fill: C.ink });
          p.text(-3.1, -1.45, 'start', { fill: C.ink, size: 16, weight: 600, anchor: 'end' });
          var done = false;
          function show(x, y) {
            oP.vec([fx(x, 1), fx(y, 1)]);
            var moved = Math.abs(x + 3) + Math.abs(y + 2) > 0.3;
            arrow.el.style.opacity = moved ? 1 : 0;
            if (moved) arrow.set(-3, -2, x, y);
          }
          var h = p.handle(-3, -2, {
            color: GREEN, r: 13, snap: 0.5,
            onDrag: function (x, y) { if (!done) show(x, y); },
            onEnd: function (x, y) {
              if (done) return;
              show(x, y);
              var dx = x + 3, dy = y + 2;
              if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
              if (Math.abs(x + 1) < 0.26 && Math.abs(y + 4) < 0.26) {
                done = true; h.set(-1, -4); show(-1, -4);
                ring.setAttribute('stroke', GREEN); ring.setAttribute('fill', 'rgba(22,181,107,.18)');
                ring.classList.add('m4-pop');
                ctx.note('Both parameters moved by \\(4 \\times 0.5 = 2\\): \\(\\theta_1\\) up, since \\(g_1 &lt; 0\\), and \\(\\theta_2\\) down, since \\(g_2 &gt; 0\\). The gradient of size 40 and the gradient of size 0.2 produce steps of the same length.');
                ctx.solved();
              } else if (dx < -0.01 || dy > 0.01) {
                ctx.wrong('The step is against the gradient: \\(g_1 = -40\\) is negative, so \\(\\theta_1\\) increases. \\(g_2 = 0.2\\) is positive, so \\(\\theta_2\\) decreases.');
              } else if (Math.abs(dy) < 0.26 && dx > 0.01) {
                ctx.wrong('\\(\\theta_2\\) moves as well. Its gradient is small, but \\(v/\\sqrt{G}\\) is \\(0.2/0.2 = 1\\), the same as for \\(\\theta_1\\).');
              } else if (Math.abs(dx - 2) > 0.26) {
                ctx.wrong('\\(\\theta_1\\) moves by \\(\\eta = 0.5\\) per step, so by 2 in four steps, not by ' + fx(Math.abs(dx), 1) + '. The size of the gradient does not matter.');
              } else {
                ctx.wrong('\\(\\theta_1\\) is correct. \\(\\theta_2\\) also moves by \\(\\eta = 0.5\\) per step, so by 2 in four steps, not by ' + fx(Math.abs(dy), 1) + '.');
              }
            }
          });
          show(-3, -2);
        }
      },
      /* 9 ------------------------------------------------------------ */
      {
        kind: 'explore',
        title: 'Comparing optimizers',
        html: '<p>The map shows a loss with a curved valley, seen from above. The dashed curve is the valley floor and darker bands are higher loss. Gradient descent, momentum, RMSProp and Adam start from the same point and run for 200 steps, each with a learning rate that works well for it.</p>' +
          '<p>Start the race and compare the paths. Gradient descent drops into the valley quickly and then creeps along the floor, where the gradient is small. Adam keeps a step of about \\(\\eta\\) per parameter along the floor and reaches the minimum first.</p>',
        mount: function (el, ctx) {
          var root = wrap(el);
          var runs = [
            { name: 'Gradient descent', kind: 'gd', eta: 0.05, color: '#5b6068' },
            { name: 'Momentum', kind: 'mom', eta: 0.008, color: BLUE },
            { name: 'RMSProp', kind: 'rms', eta: 0.08, color: ORANGE },
            { name: 'Adam', kind: 'adam', eta: 0.6, color: GREEN }
          ];
          var legend = M4.el('div', { class: 'l3-s4-legend' }, root);
          var vp = valleyPlane(root), p = vp.p;
          runs.forEach(function (r) {
            r.sim = simulate(r.kind, r.eta, NSTEPS);
            var key = M4.el('span', { class: 'l3-s4-key' }, legend);
            M4.el('span', { class: 'l3-s4-dot', style: 'background:' + r.color }, key);
            M4.el('span', { text: r.name + ':' }, key);
            r.out = M4.el('span', { text: '\u2014', style: 'font-weight:700;min-width:74px;display:inline-block' }, key);
            r.trail = p.path([[SX, SY], [SX, SY]], { stroke: r.color, width: r.kind === 'adam' ? 4 : 3 });
            r.head = p.point(SX, SY, { r: 7, fill: r.color });
          });
          var stepOut = readout(M4.el('div', { class: 'm4-row' }, root), 'step');
          var raf = 0, t = 0, acc = 0, last = null;
          function draw() {
            var n = Math.floor(t);
            stepOut.set(n + ' / ' + NSTEPS);
            runs.forEach(function (r) {
              var k = Math.min(n, r.sim.path.length - 1), pts = r.sim.path.slice(0, k + 1);
              if (pts.length < 2) pts = [pts[0], pts[0]];
              r.trail.set(pts); r.head.set(r.sim.path[k][0], r.sim.path[k][1]);
              r.out.textContent = (r.sim.hit > 0 && n >= r.sim.hit) ? r.sim.hit + ' steps' : (n >= NSTEPS ? 'not there' : '\u2014');
            });
          }
          function frame(ts) {
            if (last === null) last = ts;
            t = Math.min(NSTEPS, t + (ts - last) * 0.035); last = ts;   // about 35 steps per second
            draw();
            if (t < NSTEPS) raf = requestAnimationFrame(frame);
          }
          function start() { cancelAnimationFrame(raf); t = 0; last = null; raf = requestAnimationFrame(frame); }
          var row = M4.el('div', { class: 'm4-row' }, root);
          M4.button(row, 'Start race', start, { primary: true });
          M4.button(row, 'Reset', function () { cancelAnimationFrame(raf); t = 0; draw(); });
          M4.el('div', { class: 'm4-note', text: 'The count is the step at which a path enters the dashed circle around the minimum and stays inside.' }, root);
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
          void acc;
          draw();
        }
      },
      /* 10 ----------------------------------------------------------- */
      {
        kind: 'exercise',
        title: 'A learning-rate schedule',
        html: '<p>Adam is usually run with a learning rate \\(\\eta\\) that changes during training: it is first warmed up slowly and then decayed, so that late steps are small enough to settle into a narrow minimum. Drag the five points to draw such a schedule: \\(\\eta\\) rises to its peak at 25% of training and falls steadily afterwards. The first and the last value should each be at most half the peak.</p>',
        hint: 'Leave the second point high. Pull the first point down to less than half of it, then lower the third, fourth and fifth points so that each is below the one before, ending at less than half the peak.',
        mount: function (el, ctx) {
          var root = wrap(el);
          var W = 640, H = 360, X0 = 80, X1 = 600, Y0 = 40, Y1 = 290;
          var svg = svgRoot(root, W, H);
          function px(i) { return X0 + (X1 - X0) * i / 4; }
          function py(v) { return Y1 - (Y1 - Y0) * v; }
          M4.svg('rect', { x: px(0), y: Y0, width: px(1) - px(0), height: Y1 - Y0, fill: 'rgba(22,181,107,.08)' }, svg);
          M4.svg('rect', { x: px(1), y: Y0, width: px(4) - px(1), height: Y1 - Y0, fill: 'rgba(122,92,255,.06)' }, svg);
          var a1 = M4.svg('text', { x: (px(0) + px(1)) / 2, y: Y0 - 12, 'text-anchor': 'middle', 'font-size': 16, fill: GREEN, 'font-weight': 600 }, svg);
          a1.textContent = 'warm-up';
          var a2 = M4.svg('text', { x: (px(1) + px(4)) / 2, y: Y0 - 12, 'text-anchor': 'middle', 'font-size': 16, fill: PURPLE, 'font-weight': 600 }, svg);
          a2.textContent = 'decay';
          [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
            M4.svg('line', { x1: X0, x2: X1, y1: py(v), y2: py(v), stroke: v === 0 ? C.ink : C.line, 'stroke-width': v === 0 ? 1.5 : 1 }, svg);
            var tx = M4.svg('text', { x: X0 - 14, y: py(v) + 5, 'text-anchor': 'end', 'font-size': 15, fill: C.muted }, svg);
            tx.textContent = v.toFixed(2);
          });
          ['0%', '25%', '50%', '75%', '100%'].forEach(function (s, i) {
            var tx = M4.svg('text', { x: px(i), y: Y1 + 26, 'text-anchor': 'middle', 'font-size': 15, fill: C.muted }, svg);
            tx.textContent = s;
          });
          var yl = M4.svg('text', { x: 22, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', 'font-size': 16, fill: C.muted, transform: 'rotate(-90 22 ' + ((Y0 + Y1) / 2) + ')' }, svg);
          yl.textContent = '\u03B7 (\u00D7 10\u207B\u00B3)';
          var xl = M4.svg('text', { x: (X0 + X1) / 2, y: H - 10, 'text-anchor': 'middle', 'font-size': 16, fill: C.muted }, svg);
          xl.textContent = 'fraction of training completed';

          var vals = [0.5, 0.5, 0.5, 0.5, 0.5], done = false;
          var area = M4.svg('polygon', { fill: 'rgba(22,181,107,.14)', stroke: 'none' }, svg);
          var line = M4.svg('polyline', { fill: 'none', stroke: GREEN, 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
          var hs = [];
          function draw() {
            var pts = vals.map(function (v, i) { return px(i) + ',' + py(v); }).join(' ');
            line.setAttribute('points', pts);
            area.setAttribute('points', px(0) + ',' + py(0) + ' ' + pts + ' ' + px(4) + ',' + py(0));
            hs.forEach(function (c, i) { c.setAttribute('cy', py(vals[i])); });
            out.set(vals.map(function (v) { return v.toFixed(2); }).join(' \u2192 '));
          }
          var out = readout(M4.el('div', { class: 'm4-row' }, root), '\u03B7 :');
          vals.forEach(function (v, i) {
            var c = M4.svg('circle', { cx: px(i), cy: py(v), r: 15, fill: '#fff', stroke: GREEN, 'stroke-width': 5, class: 'l3-s4-h' }, svg);
            hs.push(c);
            var startV = 0;
            M4.drag(c, {
              onStart: function () { startV = vals[i]; },
              onMove: function (dx, dy) {
                if (done) return;
                var rect = svg.getBoundingClientRect();
                var scale = rect.height > 0 ? H / rect.height : 1;
                var nv = startV - dy * scale / (Y1 - Y0);
                vals[i] = clamp(Math.round(nv * 20) / 20, 0, 1);
                draw();
              },
              onEnd: function () {}
            });
          });
          draw();
          var row = M4.el('div', { class: 'm4-row' }, root);
          M4.button(row, 'Check', function () {
            if (done) return;
            var e = 1e-9, pk = vals[1];
            if (!(pk > vals[0] + e && pk > vals[2] + e && pk > vals[3] + e && pk > vals[4] + e)) {
              ctx.wrong('The peak should be at 25% of training: the second point must be strictly the highest.');
            } else if (vals[0] > 0.5 * pk + e) {
              ctx.wrong('The warm-up should start low: the first value (' + vals[0].toFixed(2) + ') is more than half the peak (' + pk.toFixed(2) + ').');
            } else if (!(vals[2] > vals[3] + e && vals[3] > vals[4] + e)) {
              ctx.wrong('After the peak the learning rate should fall at every point: each value must be below the one before it.');
            } else if (vals[4] > 0.5 * pk + e) {
              ctx.wrong('The decay should continue further: the final value (' + vals[4].toFixed(2) + ') is more than half the peak (' + pk.toFixed(2) + ').');
            } else {
              done = true;
              hs.forEach(function (c) { c.setAttribute('fill', GREEN); });
              svg.classList.add('m4-pop');
              ctx.note('A warm-up followed by a decay. Early steps are small while \\(v\\) and \\(G\\) are still unreliable. Late steps are small so that the parameters can settle into a narrow minimum.');
              ctx.solved();
            }
          }, { primary: true });
          M4.button(row, 'Reset', function () { if (done) return; vals = [0.5, 0.5, 0.5, 0.5, 0.5]; draw(); ctx.note(''); });
        }
      },
      /* 11 ----------------------------------------------------------- */
      {
        kind: 'exercise',
        title: 'Adam learning rate',
        html: '<p>Because each parameter moves at most about \\(\\eta\\) per step, the learning rate of Adam can be read as a distance on the map. Choose \\(\\eta\\) and run Adam on the curved valley. The task is to reach the dashed circle around the minimum, and stay inside it, within 70 steps.</p>',
        hint: 'The start is roughly 5 units from the minimum in \\(\\theta_1\\). A small \\(\\eta\\) cannot cover that distance in 70 steps. A very large \\(\\eta\\) overshoots the valley floor and oscillates around the minimum. Values between about 0.5 and 0.7 work.',
        mount: function (el, ctx) {
          var root = wrap(el);
          var LIMIT = 70;
          var outs = M4.el('div', { class: 'm4-row' }, root);
          var oS = readout(outs, 'step'), oL = readout(outs, 'loss'), oR = readout(outs, 'arrived after');
          oR.el.style.borderColor = GREEN;
          var vp = valleyPlane(root), p = vp.p;
          var trail = p.path([[SX, SY], [SX, SY]], { stroke: GREEN, width: 4 });
          var head = p.point(SX, SY, { r: 8, fill: GREEN });
          var eta = 0.1, sim = null, raf = 0, t = 0, last = null, done = false;
          function draw() {
            var n = Math.floor(t);
            if (!sim) { trail.set([[SX, SY], [SX, SY]]); head.set(SX, SY); oS.set('0 / ' + NSTEPS); oL.set(loss(SX, SY).toFixed(2)); oR.set('\u2014'); return; }
            var k = Math.min(n, sim.path.length - 1), pts = sim.path.slice(0, k + 1);
            if (pts.length < 2) pts = [pts[0], pts[0]];
            trail.set(pts); head.set(sim.path[k][0], sim.path[k][1]);
            oS.set(k + ' / ' + NSTEPS);
            var l = loss(sim.path[k][0], sim.path[k][1]);
            oL.set(l < 0.001 ? '< 0.001' : l.toFixed(3));
            oR.set(sim.hit > 0 && n >= sim.hit ? sim.hit + ' steps' : '\u2014');
          }
          function finish() {
            if (sim.hit > 0 && sim.hit <= LIMIT) {
              if (!done) {
                done = true;
                vp.ring.setAttribute('fill', 'rgba(22,181,107,.45)'); vp.ring.removeAttribute('stroke-dasharray');
                vp.ring.classList.add('m4-pop');
                ctx.note('With \\(\\eta = ' + eta.toFixed(2) + '\\) Adam settles at the minimum after ' + sim.hit + ' steps. Gradient descent with its best stable learning rate needs several times as many on this valley.');
                ctx.solved();
              }
            } else if (sim.hit > 0) {
              var big = eta > 0.7;
              ctx.wrong('Settled after ' + sim.hit + ' steps, more than ' + LIMIT + '. ' + (big ? 'The steps are so long that the path overshoots and has to come back: reduce \\(\\eta\\).' : 'Each step covers at most about \\(\\eta\\) per parameter, which is too short here: increase \\(\\eta\\).'));
            } else {
              ctx.wrong('Not settled at the minimum within ' + NSTEPS + ' steps. ' + (eta > 0.7 ? 'The steps are too long: reduce \\(\\eta\\).' : 'The steps are too short to cover the distance: increase \\(\\eta\\).'));
            }
          }
          function frame(ts) {
            if (last === null) last = ts;
            t = Math.min(NSTEPS, t + (ts - last) * 0.06); last = ts;
            draw();
            var stopAt = sim.hit > 0 ? Math.min(NSTEPS, sim.hit + 25) : NSTEPS;
            if (t < stopAt) raf = requestAnimationFrame(frame); else finish();
          }
          var sl = M4.el('div', { class: 'l3-s4-sliders' }, root);
          M4.slider(sl, { min: 0.05, max: 1.5, step: 0.05, value: eta, label: 'learning rate \u03B7', format: function (v) { return (+v).toFixed(2); },
            onInput: function (v) { eta = +v; cancelAnimationFrame(raf); sim = null; t = 0; draw(); } });
          var row = M4.el('div', { class: 'm4-row' }, root);
          M4.button(row, 'Run Adam', function () {
            cancelAnimationFrame(raf);
            sim = simulate('adam', eta, NSTEPS); t = 0; last = null; ctx.note('');
            raf = requestAnimationFrame(frame);
          }, { primary: true });
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
          draw();
        }
      },
      /* 12 ----------------------------------------------------------- */
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li><strong>Gradient descent</strong> takes small steps against the gradient until it reaches a minimum. The learning rate \\(\\eta\\) must be chosen well: if it is too large on a steeply curved loss, training diverges. Normalizing the inputs makes the curvature more even.</li>' +
          '<li><strong>Better optimizers</strong> address the same problem. Momentum averages the gradients, RMSProp divides by the typical gradient size, and Adam does both: \\(\\theta \\leftarrow \\theta - \\eta\\,v/\\sqrt{G}\\). The ratio \\(v/\\sqrt{G}\\) is close to 1 for a consistent gradient and close to 0 for noise, it does not change when all gradients are rescaled, and each weight moves at most about \\(\\eta\\) per step.</li>' +
          '<li><strong>Common choice:</strong> the gradient is always computed on minibatches (stochastic gradient descent), and the usual choice is Adam with a learning rate that is warmed up slowly and then decayed.</li>' +
          '</ul>' +
          '<p>The homework that accompanies this lecture is on gradient descent. The next lecture turns to geometry and neural networks.</p>'
      }
    ]
  });
})();
