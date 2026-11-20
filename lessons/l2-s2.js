(function () {
  'use strict';
  var M4 = window.M4;
  var C = M4.colors;

  /* ---------- one-time CSS ---------- */
  function css() {
    if (document.getElementById('l2-s2-style')) return;
    var s = document.createElement('style');
    s.id = 'l2-s2-style';
    s.textContent = [
      '.l2-s2-wrap{display:flex;flex-direction:column;align-items:stretch;gap:14px;width:100%}',
      '.l2-s2-wrap>.m4-note{text-align:center}',
      '.l2-s2-wrap svg{width:100%;height:auto;max-width:640px;display:block;margin:0 auto;user-select:none;-webkit-user-select:none}',
      '.l2-s2-wrap svg.l2-s2-drag{touch-action:none}',
      '.l2-s2-coins{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}',
      '.l2-s2-coin{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px;border:2px solid ' + C.line + ';background:#fff;color:' + C.ink + '}',
      '.l2-s2-coin.h{background:' + C.purple + ';border-color:' + C.purple + ';color:#fff}',
      '.l2-s2-coin.t{background:#fff;border-color:' + C.orange + ';color:' + C.orange + '}',
      '.l2-s2-bar{width:100%;max-width:560px;margin:0 auto;height:18px;border-radius:9px;background:' + C.line + ';overflow:hidden}',
      '.l2-s2-bar>div{height:100%;border-radius:9px;background:' + C.purple + ';width:0;transition:width .08s linear}',
      '.l2-s2-eq{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;font-size:20px}',
      '.l2-s2-frac{display:flex;flex-direction:column;align-items:center;gap:6px}',
      '.l2-s2-fracline{width:100%;height:3px;background:' + C.ink + ';border-radius:2px}',
      '.l2-s2-slot{min-width:150px;min-height:58px;display:flex;align-items:center;justify-content:center;padding:4px}',
      '.l2-s2-tray{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;min-height:64px;padding:10px;border-radius:16px;background:' + C.bg + ';border:2px solid ' + C.line + ';width:100%;box-sizing:border-box}',
      '.l2-s2-tok{padding:10px 14px;font-size:18px;touch-action:none}',
      '.l2-s2-handle{cursor:grab;touch-action:none}',
      '.l2-s2-handle:active{cursor:grabbing}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- small local helpers ---------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function snap(v, s) { return Math.round(v / s) * s; }
  function readout(parent, label) {
    var r = M4.el('div', { class: 'm4-readout' }, parent);
    M4.el('span', { text: label + ' ', style: 'color:' + C.muted }, r);
    var v = M4.el('b', { text: '' }, r);
    return { el: r, set: function (t) { v.textContent = t; } };
  }
  function handleCircle(p, color) {
    // group with a large transparent hit area so the handle is finger-friendly
    var g = M4.svg('g', { class: 'l2-s2-handle' }, p.g);
    M4.svg('circle', { r: 30, fill: '#000', 'fill-opacity': 0, 'pointer-events': 'all' }, g);
    var c = M4.svg('circle', { r: 14, fill: color, stroke: '#fff', 'stroke-width': 3 }, g);
    return {
      el: g,
      set: function (x, y) { g.setAttribute('transform', 'translate(' + p.x(x) + ',' + p.y(y) + ')'); },
      fill: function (f) { c.setAttribute('fill', f); }
    };
  }
  // drag a node; cb receives maths coordinates of the dragged position
  function dragMaths(p, W, node, getXY, onMove, onEnd) {
    var x0 = 0, y0 = 0;
    if (p.svg && p.svg.classList) p.svg.classList.add('l2-s2-drag');
    M4.drag(node, {
      onStart: function () { var s = getXY(); x0 = s[0]; y0 = s[1]; },
      onMove: function (dx, dy) {
        var rect = p.svg.getBoundingClientRect();
        var k = rect.width > 0 ? W / rect.width : 1;
        onMove(p.ux(p.x(x0) + dx * k), p.uy(p.y(y0) + dy * k));
      },
      onEnd: function () { if (onEnd) onEnd(); }
    });
  }
  function texNum(v, d) { return fmt(v, d).replace('\u2212', '-'); }
  function fmt(v, d) { return (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d).replace('-', '\u2212'); }

  /* ---------- step 2: underflow explorer ---------- */
  function mountUnderflow(el) {
    css();
    var wrap = M4.el('div', { class: 'l2-s2-wrap' }, el);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rN = readout(row, 'data points n');
    var rProd = readout(row, 'product in the computer');
    var row2 = M4.el('div', { class: 'm4-row' }, wrap);
    var rTrue = readout(row2, 'true product');
    var rSum = readout(row2, 'sum of logs');

    var W = 640, H = 170, X0 = 40, X1 = 600, EMAX = 550;
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H }, wrap);
    function ex(e) { return X0 + (X1 - X0) * (-e / EMAX); }
    M4.svg('rect', { x: ex(-324), y: 50, width: X1 - ex(-324), height: 44, fill: C.red, opacity: 0.13, rx: 8 }, svg);
    var t = M4.svg('text', { x: (ex(-324) + X1) / 2, y: 38, 'text-anchor': 'middle', 'font-size': 16, fill: C.red, 'font-weight': 600 }, svg);
    t.textContent = 'stored as 0';
    M4.svg('line', { x1: X0, y1: 72, x2: X1, y2: 72, stroke: C.ink, 'stroke-width': 2 }, svg);
    for (var e = 0; e >= -500; e -= 100) {
      M4.svg('line', { x1: ex(e), y1: 64, x2: ex(e), y2: 80, stroke: C.ink, 'stroke-width': 2 }, svg);
      var tl = M4.svg('text', { x: ex(e), y: 118, 'text-anchor': 'middle', 'font-size': 15, fill: C.muted }, svg);
      tl.textContent = e === 0 ? '0' : '\u2212' + (-e);
    }
    var ax = M4.svg('text', { x: W / 2, y: 152, 'text-anchor': 'middle', 'font-size': 15, fill: C.muted }, svg);
    ax.textContent = 'power of ten of the product 0.3\u207F';
    var trail = M4.svg('line', { x1: X0, y1: 72, x2: X0, y2: 72, stroke: C.purple, 'stroke-width': 8, 'stroke-linecap': 'round' }, svg);
    var dot = M4.svg('circle', { cx: X0, cy: 72, r: 12, fill: C.purple, stroke: '#fff', 'stroke-width': 3 }, svg);

    function update(n) {
      var v = Math.pow(0.3, n);
      var e10 = n * Math.log(0.3) / Math.LN10;
      var fl = Math.floor(e10);
      var mant = Math.pow(10, e10 - fl);
      if (mant >= 9.95) { mant = 1; fl += 1; }
      rN.set(String(n));
      rProd.set(v === 0 ? '0 (underflow)' : v.toExponential(2).replace('e-', ' \u00d7 10^\u2212'));
      rProd.el.style.borderColor = v === 0 ? C.red : '';
      rTrue.set(mant.toFixed(1) + ' \u00d7 10^\u2212' + (-fl));
      rSum.set(fmt(n * Math.log(0.3), 1));
      var x = ex(e10);
      dot.setAttribute('cx', x);
      trail.setAttribute('x2', x);
      dot.setAttribute('fill', v === 0 ? C.red : C.purple);
    }
    M4.slider(wrap, {
      min: 1, max: 1000, step: 1, value: 10, label: 'n',
      format: function (v) { return String(Math.round(v)); },
      onInput: function (v) { update(Math.round(v)); }
    });
    update(10);
  }

  /* ---------- coin helpers ---------- */
  function coinRow(parent) {
    var row = M4.el('div', { class: 'l2-s2-coins' }, parent);
    ['H', 'H', 'T', 'H', 'H', 'H', 'T', 'H'].forEach(function (c) {
      M4.el('div', { class: 'l2-s2-coin ' + (c === 'H' ? 'h' : 't'), text: c }, row);
    });
    return row;
  }
  function coinL(p) { return Math.pow(p, 6) * Math.pow(1 - p, 2); }
  function coinLL(p) { return 6 * Math.log(p) + 2 * Math.log(1 - p); }

  /* ---------- step 4: likelihood curve explorer ---------- */
  function mountCoinExplore(el) {
    css();
    var wrap = M4.el('div', { class: 'l2-s2-wrap' }, el);
    coinRow(wrap);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rp = readout(row, 'p =');
    var rL = readout(row, 'L(p) =');
    var rl = readout(row, 'ln L(p) =');
    var W = 640, H = 400;
    var p = M4.plane(wrap, { xmin: -0.12, xmax: 1.06, ymin: -0.0028, ymax: 0.0128, width: W, height: H, grid: false, axes: false, labels: false });
    p.line(0, 0, 1.02, 0, { stroke: C.ink, width: 2 });
    p.line(0, 0, 0, 0.0122, { stroke: C.ink, width: 2 });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      p.line(v, 0, v, -0.0003, { stroke: C.ink, width: 2 });
      p.text(v, -0.0012, String(v), { fill: C.muted, size: 15 });
    });
    [0.004, 0.008, 0.012].forEach(function (v) {
      p.line(-0.01, v, 0, v, { stroke: C.ink, width: 2 });
      p.text(-0.02, v - 0.0002, v.toFixed(3), { fill: C.muted, size: 15, anchor: 'end' });
    });
    p.text(0.5, -0.002, 'heads probability p', { fill: C.muted, size: 15 });
    var pts = [];
    for (var i = 0; i <= 200; i++) pts.push([i / 200, coinL(i / 200)]);
    p.path(pts, { stroke: C.purple, width: 4 });
    var guide = p.line(0.5, 0, 0.5, coinL(0.5), { stroke: C.purple, width: 2, dash: '6 6' });
    var hguide = p.line(0, coinL(0.5), 0.5, coinL(0.5), { stroke: C.purple, width: 2, dash: '6 6' });
    var h = handleCircle(p, C.orange);
    var cur = 0.5;
    function update() {
      var L = coinL(cur);
      h.set(cur, L);
      guide.set(cur, 0, cur, L);
      hguide.set(0, L, cur, L);
      rp.set(cur.toFixed(2));
      rL.set(L.toFixed(5));
      rl.set(fmt(coinLL(cur), 3));
      h.fill(Math.abs(cur - 0.75) < 0.006 ? C.green : C.orange);
    }
    dragMaths(p, W, h.el, function () { return [cur, coinL(cur)]; }, function (x) {
      cur = clamp(snap(x, 0.01), 0.02, 0.98);
      update();
    });
    update();
  }

  /* ---------- step 5: slope of the log-likelihood ---------- */
  function mountSlope(el, ctx) {
    css();
    var wrap = M4.el('div', { class: 'l2-s2-wrap' }, el);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rp = readout(row, 'p =');
    var rs = readout(row, 'slope 6/p \u2212 2/(1\u2212p) =');
    var W = 640, H = 400;
    var p = M4.plane(wrap, { xmin: -0.12, xmax: 1.06, ymin: -17, ymax: -2.5, width: W, height: H, grid: false, axes: false, labels: false });
    p.line(0, -15, 1.02, -15, { stroke: C.ink, width: 2 });
    p.line(0, -15, 0, -3, { stroke: C.ink, width: 2 });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      p.line(v, -15, v, -15.3, { stroke: C.ink, width: 2 });
      p.text(v, -16.1, String(v), { fill: C.muted, size: 15 });
    });
    [-12, -9, -6, -3].forEach(function (v) {
      p.line(-0.01, v, 0, v, { stroke: C.ink, width: 2 });
      p.text(-0.02, v - 0.2, '\u2212' + (-v), { fill: C.muted, size: 15, anchor: 'end' });
    });
    p.text(0.03, -3.1, 'ln L(p)', { fill: C.muted, size: 15, anchor: 'start' });
    p.text(1.02, -14.4, 'p', { fill: C.muted, size: 16 });
    var pts = [];
    for (var i = 0; i <= 200; i++) { var q = 0.085 + (0.975 - 0.085) * i / 200; pts.push([q, coinLL(q)]); }
    p.path(pts, { stroke: C.purple, width: 4 });
    var tan = p.line(0, 0, 0, 0, { stroke: C.orange, width: 5 });
    var h = handleCircle(p, C.orange);
    var cur = 0.3, done = false;
    function slope(q) { return 6 / q - 2 / (1 - q); }
    function update() {
      var y = coinLL(cur), s = slope(cur);
      // tangent of fixed pixel length
      var sx = p.x(1) - p.x(0), sy = p.y(1) - p.y(0);
      var vx = sx, vy = sy * s, n = Math.sqrt(vx * vx + vy * vy) || 1;
      var k = 80 / n;
      tan.set(cur - k, y - k * s, cur + k, y + k * s);
      h.set(cur, y);
      rp.set(cur.toFixed(2));
      rs.set(fmt(s, 2));
      var col = done ? C.green : C.orange;
      h.fill(col);
      tan.el.setAttribute('stroke', col);
    }
    dragMaths(p, W, h.el, function () { return [cur, coinLL(cur)]; }, function (x) {
      if (done) return;
      cur = clamp(snap(x, 0.01), 0.1, 0.95);
      update();
    }, function () {
      if (done) return;
      if (Math.abs(cur - 0.75) < 0.011) {
        cur = 0.75; done = true; update();
        ctx.note('The slope is zero at \\(p = 0.75 = 6/8\\): the tangent is horizontal at the top of the curve.');
        ctx.solved();
      } else {
        var s = slope(cur);
        ctx.note('At \\(p = ' + cur.toFixed(2) + '\\) the slope is \\(' + texNum(s, 2) + '\\), which is ' + (s > 0 ? 'positive: the log-likelihood still rises, so \\(p\\) must increase.' : 'negative: the log-likelihood is already falling, so \\(p\\) must decrease.'));
      }
    });
    update();
  }

  /* ---------- steps 7 and 8: best constant ---------- */
  var RENTS = [6, 7, 8, 9, 20];
  function mountConstant(mode) {
    return function (el, ctx) {
      css();
      var sq = mode === 'sq';
      var target = sq ? 10 : 8;
      var wrap = M4.el('div', { class: 'l2-s2-wrap' }, el);
      var row = M4.el('div', { class: 'm4-row' }, wrap);
      var rmu = readout(row, '\u03bc =');
      var rloss = readout(row, sq ? 'sum of squared errors =' : 'sum of absolute errors =');
      var rbest = readout(row, 'lowest so far =');
      var bar = M4.el('div', { class: 'l2-s2-bar' }, wrap);
      var fill = M4.el('div', {}, bar);
      var W = 640, H = 440;
      var p = M4.plane(wrap, { xmin: -0.9, xmax: 7, ymin: -2.6, ymax: 23.5, width: W, height: H, grid: false, axes: false, labels: false });
      p.line(0, 0, 0, 22.5, { stroke: C.ink, width: 2 });
      p.line(0, 0, 6.6, 0, { stroke: C.ink, width: 2 });
      [0, 5, 10, 15, 20].forEach(function (v) {
        p.line(-0.08, v, 0, v, { stroke: C.ink, width: 2 });
        p.line(0, v, 6.6, v, { stroke: C.line, width: 1 });
        p.text(-0.18, v - 0.35, String(v * 100), { fill: C.muted, size: 15, anchor: 'end' });
      });
      p.text(0.15, 22.4, 'rent in euros', { fill: C.muted, size: 15, anchor: 'start' });
      p.text(3, -1.6, 'five apartments of 50 m\u00b2', { fill: C.muted, size: 15 });
      var mu = 14, best = Infinity, done = false;
      var res = RENTS.map(function (y, i) { return p.line(i + 1, y, i + 1, mu, { stroke: C.orange, width: 4 }); });
      var line = p.line(0.4, mu, 5.9, mu, { stroke: C.purple, width: 5 });
      RENTS.forEach(function (y, i) { p.point(i + 1, y, { r: 9, fill: i === 4 ? C.pink : C.ink }); });
      p.text(5, 21.3, 'outlier', { fill: C.pink, size: 15, weight: 600 });
      var lab = p.text(6.25, mu + 1.2, '\u03bc', { fill: C.purple, size: 20, weight: 700 });
      var h = handleCircle(p, C.purple);
      function loss(m) {
        return RENTS.reduce(function (a, y) { return a + (sq ? (y - m) * (y - m) : Math.abs(y - m)); }, 0);
      }
      var maxLoss = Math.max(loss(4), loss(22));
      function update() {
        var L = loss(mu);
        if (L < best) best = L;
        line.set(0.4, mu, 5.9, mu);
        res.forEach(function (r, i) { r.set(i + 1, RENTS[i], i + 1, mu); });
        lab.set(6.25, mu + 1.2, '\u03bc');
        h.set(6.25, mu);
        rmu.set(String(Math.round(mu * 100)) + ' \u20ac');
        rloss.set(fmt(L, sq ? 2 : 1));
        rbest.set(fmt(best, sq ? 2 : 1));
        fill.style.width = (100 * Math.sqrt(L / maxLoss)).toFixed(1) + '%';
        var col = done ? C.green : C.purple;
        fill.style.background = col;
        h.fill(col);
        line.el.setAttribute('stroke', col);
      }
      dragMaths(p, W, h.el, function () { return [6.25, mu]; }, function (x, y) {
        if (done) return;
        mu = clamp(snap(y, 0.5), 4, 22);
        update();
      }, function () {
        if (done) return;
        if (Math.abs(mu - target) < 1e-9) {
          done = true; update();
          ctx.note(sq
            ? 'The minimum is at \\(\\mu = 1000\\) euros, the mean \\(\\tfrac{600+700+800+900+2000}{5}\\). Four of the five rents lie below it: the outlier has pulled it upwards.'
            : 'The minimum is at \\(\\mu = 800\\) euros, the median: two rents lie below it and two above. The outlier counts as one point above, however far away it is.');
          ctx.solved();
        } else if (sq) {
          var d = RENTS.reduce(function (a, y) { return a + (y - mu); }, 0);
          ctx.note('Here \\(\\sum_i (y_i - \\mu) = ' + texNum(d, 1) + '\\) (in units of 100 euros). It is ' + (d > 0 ? 'positive, so raising \\(\\mu\\) lowers the loss.' : 'negative, so lowering \\(\\mu\\) lowers the loss.'));
        } else {
          var above = RENTS.filter(function (y) { return y > mu; }).length;
          var below = RENTS.filter(function (y) { return y < mu; }).length;
          ctx.note(above + ' rents lie above \\(\\mu\\) and ' + below + ' below. Moving \\(\\mu\\) towards the larger group shortens more residuals than it lengthens.');
        }
      });
      update();
    };
  }

  /* ---------- step 10: build the negative log of the Gaussian ---------- */
  function mountTokens(el, ctx) {
    css();
    var wrap = M4.el('div', { class: 'l2-s2-wrap' }, el);
    var eq = M4.el('div', { class: 'l2-s2-eq' }, wrap);
    M4.el('div', { html: M4.tex('-\\ln \\mathcal{N}\\big(y_i;\\, f(x_i),\\, \\sigma^2\\big) \\;=') }, eq);
    var frac = M4.el('div', { class: 'l2-s2-frac' }, eq);
    var sNum = M4.el('div', { class: 'm4-slot l2-s2-slot' }, frac);
    M4.el('div', { class: 'l2-s2-fracline' }, frac);
    var sDen = M4.el('div', { class: 'm4-slot l2-s2-slot' }, frac);
    M4.el('div', { html: M4.tex('+') }, eq);
    var sConst = M4.el('div', { class: 'm4-slot l2-s2-slot' }, eq);
    var slots = [sNum, sDen, sConst];
    var want = ['res2', 'var2', 'const'];
    var tray = M4.el('div', { class: 'l2-s2-tray' }, wrap);
    var defs = [
      ['abs', '|y_i - f(x_i)|'],
      ['const', '\\ln\\!\\big(\\sigma\\sqrt{2\\pi}\\big)'],
      ['var2', '2\\sigma^2'],
      ['exp', 'e^{-(y_i - f(x_i))^2}'],
      ['res2', '\\big(y_i - f(x_i)\\big)^2'],
      ['sig', '\\sigma']
    ];
    var tokens = defs.map(function (d) {
      var t = M4.el('div', { class: 'm4-token l2-s2-tok', html: M4.tex(d[1]) }, tray);
      t.setAttribute('data-k', d[0]);
      return t;
    });
    M4.el('div', { class: 'm4-note', text: 'Three tiles belong in the formula. Three are left over.' }, wrap);
    var done = false;
    function tokIn(slot) { return slot.querySelector('.m4-token'); }
    function refresh() {
      slots.forEach(function (s) { s.classList.toggle('filled', !!tokIn(s)); });
    }
    function check() {
      if (done) return;
      if (!slots.every(tokIn)) return;
      var bad = [];
      slots.forEach(function (s, i) { if (tokIn(s).getAttribute('data-k') !== want[i]) bad.push(i); });
      if (bad.length === 0) {
        done = true;
        slots.forEach(function (s) { s.style.borderColor = C.green; s.classList.add('m4-pop'); });
        ctx.note('Only the first term contains \\(f(x_i)\\). The second term is the same for every choice of parameters, so it does not move the minimum.');
        ctx.solved();
        return;
      }
      var k = tokIn(slots[bad[0]]).getAttribute('data-k');
      var msg = 'Not yet. ';
      if (k === 'exp') msg += 'The logarithm cancels the exponential, so no \\(e^{\\dots}\\) remains.';
      else if (k === 'abs') msg += 'The Gaussian exponent contains the squared distance, not the absolute distance.';
      else if (bad[0] === 0) msg += 'The numerator is the exponent of the Gaussian without its sign: the squared distance between \\(y_i\\) and \\(f(x_i)\\).';
      else if (bad[0] === 1) msg += 'The exponent of the Gaussian is divided by \\(2\\sigma^2\\).';
      else msg += 'The additive term is the logarithm of the normalising factor \\(\\tfrac{1}{\\sigma\\sqrt{2\\pi}}\\), with the sign flipped.';
      bad.forEach(function (i) { tray.appendChild(tokIn(slots[i])); });
      refresh();
      ctx.wrong(msg);
    }
    M4.dragDrop({
      tokens: tokens,
      slots: slots,
      onDrop: function (tok, slot) {
        if (done) return;
        var old = tokIn(slot);
        if (old && old !== tok) tray.appendChild(old);
        slot.appendChild(tok);
        refresh();
        check();
      },
      onMiss: function (tok) {
        if (done) return;
        tray.appendChild(tok);
        refresh();
      }
    });
  }

  /* ---------- step 11: squared penalty ---------- */
  function mountPenalty(el, ctx) {
    css();
    var wrap = M4.el('div', { class: 'l2-s2-wrap' }, el);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rsmall = readout(row, 'four small penalties =');
    rsmall.set('1 + 1 + 1 + 1 = 4');
    var rres = readout(row, 'residual r =');
    var rpen = readout(row, 'its penalty r\u00b2 =');
    var W = 520;
    var p = M4.plane(wrap, { xmin: 0, xmax: 10, ymin: 0, ymax: 10, width: W, height: W, grid: true, axes: false, labels: false });
    function f(x) { return 0.5 * x + 2; }
    var small = [[1, 1], [3, -1], [5, 1], [7, -1]];
    small.forEach(function (s) {
      var x = s[0], y0 = f(x), y1 = y0 + s[1];
      var sqr = p.path([[x, y0], [x, y1], [x - 1, y1], [x - 1, y0]], { stroke: C.orange, width: 2, fill: C.orange, closed: true });
      sqr.el.setAttribute('fill-opacity', '0.22');
    });
    p.line(0, f(0), 10, f(10), { stroke: C.green, width: 4 });
    p.text(1.6, 1.9, 'f(x)', { fill: C.green, size: 17, weight: 700 });
    small.forEach(function (s) {
      p.line(s[0], f(s[0]), s[0], f(s[0]) + s[1], { stroke: C.orange, width: 3 });
      p.point(s[0], f(s[0]) + s[1], { r: 8, fill: C.ink });
    });
    var X = 9, F = f(X);
    var ghostUp = p.point(X, F + 2, { r: 12, fill: 'none' });
    var ghostDn = p.point(X, F - 2, { r: 12, fill: 'none' });
    [ghostUp, ghostDn].forEach(function (g) {
      g.el.setAttribute('stroke', C.purple); g.el.setAttribute('stroke-width', 2);
      g.el.setAttribute('stroke-dasharray', '4 4'); g.el.setAttribute('opacity', '0'); g.el.setAttribute('fill', 'none');
    });
    var big = p.path([[X, F], [X, F], [X, F], [X, F]], { stroke: C.purple, width: 2, fill: C.purple, closed: true });
    big.el.setAttribute('fill-opacity', '0.22');
    var seg = p.line(X, F, X, F, { stroke: C.purple, width: 3 });
    var h = handleCircle(p, C.purple);
    var y = F + 0.5, done = false;
    function update() {
      var r = y - F, a = Math.abs(r);
      big.set([[X, F], [X, y], [X - a, y], [X - a, F]]);
      seg.set(X, F, X, y);
      h.set(X, y);
      rres.set(fmt(r, 1));
      rpen.set(fmt(r * r, 2));
      var col = done ? C.green : C.purple;
      h.fill(col);
      big.el.setAttribute('fill', col);
      big.el.setAttribute('stroke', col);
    }
    dragMaths(p, W, h.el, function () { return [X, y]; }, function (x, yy) {
      if (done) return;
      y = clamp(snap(yy, 0.5), 0.5, 9.5);
      update();
    }, function () {
      if (done) return;
      var r = y - F;
      if (Math.abs(Math.abs(r) - 2) < 1e-9) {
        done = true; update();
        (r > 0 ? ghostDn : ghostUp).el.setAttribute('opacity', '0.9');
        ctx.note('A residual of \\(' + (r > 0 ? '+2' : '-2') + '\\) costs \\(2^2 = 4\\), as much as four residuals of size 1. The dashed ring marks the other solution, \\(r = ' + (r > 0 ? '-2' : '+2') + '\\): the square ignores the sign.');
        ctx.solved();
      } else {
        var pen = r * r;
        ctx.note('A residual of \\(' + texNum(r, 1) + '\\) gives a penalty of \\(' + texNum(pen, 2) + '\\), which is ' + (pen < 4 ? 'less' : 'more') + ' than 4. The penalty is the area of the purple square.');
      }
    });
    update();
  }

  /* ---------- lesson ---------- */
  M4.lesson({
    id: 'l2-s2',
    module: 'l2',
    title: 'From likelihood to loss',
    summary: 'The negative log-likelihood turns a product of probabilities into a loss. For a coin it gives heads over flips, and for Gaussian noise it gives the mean squared error.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>A model assigns a probability to every observed data point. These probabilities combine into a single number, the <em>negative log-likelihood</em>, which is the loss that is minimised in machine learning.</p>' +
          '<p>In this lesson you will (1) write the likelihood of independent data as a product and its logarithm as a sum, (2) find the maximum-likelihood estimate of a coin by setting a derivative to zero, (3) explain why the squared error leads to the mean and the absolute error to the median, and (4) derive the mean squared error from the assumption of Gaussian noise.</p>'
      },
      {
        kind: 'explore',
        title: 'Products of small probabilities',
        html: '<p>Let \\(\\theta\\) denote the parameters of a model and \\(p(y_i \\mid \\theta)\\) the probability it assigns to the \\(i\\)-th of \\(n\\) data points. For independent data points the probabilities multiply, which gives the likelihood \\[ L(\\theta) = \\prod_{i=1}^{n} p(y_i \\mid \\theta). \\]</p>' +
          '<p>Suppose every data point has probability \\(0.3\\), so that \\(L = 0.3^{\\,n}\\). Increase \\(n\\) and compare the product as the computer stores it with the sum of logarithms \\(\\ln L = \\sum_i \\ln p(y_i \\mid \\theta) = n \\ln 0.3\\). For \\(n = 1000\\) the product is about \\(10^{-523}\\), which is stored as \\(0\\). The sum remains an ordinary number.</p>',
        mount: mountUnderflow
      },
      {
        kind: 'exercise',
        title: 'The negative log-likelihood',
        html: '<p>The logarithm is an increasing function, so \\(L(\\theta)\\) and \\(\\ln L(\\theta)\\) have their maximum at the same \\(\\theta\\). Maximising \\(\\ln L\\) is the same as minimising the <em>negative log-likelihood</em> \\[ \\mathrm{NLL}(\\theta) = -\\ln L(\\theta) = -\\sum_{i=1}^{n} \\ln p(y_i \\mid \\theta), \\] and this quantity is the loss.</p>' +
          '<p>A model assigns the probabilities \\(0.5\\), \\(0.2\\) and \\(0.1\\) to three independent data points. Compute the negative log-likelihood with the natural logarithm, to two decimal places.</p>',
        hint: 'The product is \\(0.5 \\cdot 0.2 \\cdot 0.1 = 0.01\\), and \\(-\\ln 0.01 = \\ln 100\\). Equivalently, add \\(-\\ln 0.5\\), \\(-\\ln 0.2\\) and \\(-\\ln 0.1\\).',
        mount: function (el, ctx) {
          css();
          var wrap = M4.el('div', { class: 'l2-s2-wrap' }, el);
          var row = M4.el('div', { class: 'm4-row' }, wrap);
          [0.5, 0.2, 0.1].forEach(function (v, i) {
            M4.el('div', { class: 'm4-chip', html: M4.tex('p(y_' + (i + 1) + '\\mid\\theta) = ' + v) }, row);
          });
          M4.numberInput(wrap, {
            answer: 4.605, tolerance: 0.011, placeholder: 'e.g. 1.23', label: 'NLL =',
            onCorrect: function () {
              ctx.note('\\(-\\ln(0.5 \\cdot 0.2 \\cdot 0.1) = -\\ln 0.01 \\approx 0.693 + 1.609 + 2.303 = 4.605\\).');
              ctx.solved();
            },
            onWrong: function (v) {
              v = Number(v);
              if (Math.abs(v + 4.605) < 0.011) ctx.wrong('That is the log-likelihood. The loss carries a minus sign, so it is positive.');
              else if (Math.abs(v - 0.01) < 0.001) ctx.wrong('That is the likelihood itself, the product. Take its natural logarithm and flip the sign.');
              else if (Math.abs(v - 2) < 0.011) ctx.wrong('That value uses the logarithm to base 10. Use the natural logarithm.');
              else if (Math.abs(v - 0.223) < 0.011 || Math.abs(v - 0.8) < 0.011) ctx.wrong('The probabilities multiply. They are not added before the logarithm is taken.');
              else ctx.wrong('Add the three values \\(-\\ln 0.5\\), \\(-\\ln 0.2\\) and \\(-\\ln 0.1\\).');
            }
          });
        }
      },
      {
        kind: 'explore',
        title: 'A coin with unknown bias',
        html: '<p>A coin lands heads with an unknown probability \\(p\\) and tails with probability \\(1 - p\\). It is flipped 8 times and shows 6 heads (H) and 2 tails (T). Because the flips are independent, the likelihood of this outcome is \\[ L(p) = p^{6}\\,(1 - p)^{2}. \\]</p>' +
          '<p>Drag the point along the curve. The data are fixed. Only the parameter \\(p\\) changes, and the values below show how probable the observed flips are under each value of \\(p\\).</p>',
        mount: mountCoinExplore
      },
      {
        kind: 'exercise',
        title: 'The zero of the derivative',
        html: '<p>The log-likelihood of the coin is \\(\\ln L(p) = 6 \\ln p + 2 \\ln(1 - p)\\). Its derivative with respect to \\(p\\), the slope of the curve below, is \\[ \\frac{d}{dp} \\ln L(p) = \\frac{6}{p} - \\frac{2}{1 - p}. \\]</p>' +
          '<p>At a maximum the slope is zero. Drag the point until the orange tangent is horizontal.</p>',
        hint: 'Setting \\(\\tfrac{6}{p} = \\tfrac{2}{1-p}\\) gives \\(6(1 - p) = 2p\\), hence \\(6 = 8p\\).',
        mount: mountSlope
      },
      {
        kind: 'exercise',
        title: 'The estimate for a coin',
        html: '<p>Solving \\(\\tfrac{6}{p} - \\tfrac{2}{1 - p} = 0\\) gives the maximum-likelihood estimate \\(\\hat p = \\tfrac{6}{8} = 0.75\\). In general, for \\(h\\) heads in \\(n\\) flips the same calculation gives \\(\\hat p = h / n\\): the intuitive estimate is the result of minimising a loss exactly, with calculus.</p>' +
          '<p>A different coin is flipped 20 times and shows 7 heads. Enter the value of \\(p\\) that maximises \\(L(p) = p^{7}(1 - p)^{13}\\).</p>',
        hint: 'The derivative of the log-likelihood is \\(\\tfrac{7}{p} - \\tfrac{13}{1 - p}\\). It is zero when \\(7(1 - p) = 13p\\).',
        mount: function (el, ctx) {
          css();
          var wrap = M4.el('div', { class: 'l2-s2-wrap' }, el);
          var row = M4.el('div', { class: 'l2-s2-coins' }, wrap);
          var seq = 'THTTHTTTHTHTTHTTHTTH';
          seq.split('').forEach(function (c) {
            M4.el('div', { class: 'l2-s2-coin ' + (c === 'H' ? 'h' : 't'), text: c }, row);
          });
          M4.numberInput(wrap, {
            answer: 0.35, tolerance: 0.006, placeholder: '0 to 1', label: 'p\u0302 =',
            onCorrect: function () {
              ctx.note('\\(\\hat p = 7/20 = 0.35\\), the fraction of heads.');
              ctx.solved();
            },
            onWrong: function (v) {
              v = Number(v);
              if (Math.abs(v - 0.65) < 0.006) ctx.wrong('That is the fraction of tails, \\(13/20\\). The parameter \\(p\\) is the probability of heads.');
              else if (v > 1 || v < 0) ctx.wrong('A probability lies between 0 and 1.');
              else if (Math.abs(v - 7 / 13) < 0.006) ctx.wrong('That is heads divided by tails. Divide by the total number of flips.');
              else ctx.wrong('Set \\(\\tfrac{7}{p} - \\tfrac{13}{1-p}\\) to zero and solve for \\(p\\).');
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'The best constant under squared error',
        html: '<p>Five apartments of 50 m² have the rents \\(y_i\\) = 600, 700, 800, 900 and 2000 euros. A single constant \\(\\mu\\) is to be predicted for all of them. The sum of squared errors is \\(\\sum_i (y_i - \\mu)^2\\). Its derivative \\(-2\\sum_i (y_i - \\mu)\\) is zero exactly when \\(\\mu = \\tfrac{1}{n}\\sum_i y_i\\), the mean.</p>' +
          '<p>Drag the purple line to the value of \\(\\mu\\) with the smallest sum of squared errors (shown in units of 100 euros, squared). The bar shrinks as the loss decreases.</p>',
        hint: 'The mean is \\(\\tfrac{600 + 700 + 800 + 900 + 2000}{5} = \\tfrac{5000}{5}\\) euros.',
        mount: mountConstant('sq')
      },
      {
        kind: 'exercise',
        title: 'The best constant under absolute error',
        html: '<p>The mean of 1000 euros lies above four of the five rents, because the single outlier contributes a very large squared error and pulls \\(\\mu\\) towards itself. A different loss, the sum of absolute errors \\(\\sum_i |y_i - \\mu|\\), treats every unit of distance equally.</p>' +
          '<p>Drag the line to the value of \\(\\mu\\) that minimises the sum of absolute errors (in units of 100 euros) for the same five rents.</p>',
        hint: 'The sum of absolute errors stops decreasing when as many points lie above \\(\\mu\\) as below it. That value is the median, the middle of the sorted rents.',
        mount: mountConstant('abs')
      },
      {
        kind: 'text',
        title: 'Gaussian noise gives the squared error',
        html: '<p>The choice between the two losses follows from an assumption about the noise. In regression, a model \\(f\\) does not pass through every data point, and the data are written as \\(y = f(x) + \\varepsilon\\) with random noise \\(\\varepsilon\\). If \\(\\varepsilon\\) is normally distributed with standard deviation \\(\\sigma\\), each \\(y_i\\) follows a Gaussian centred on the prediction: \\[ p(y_i \\mid x_i, \\theta) = \\mathcal{N}\\big(y_i;\\, f(x_i),\\, \\sigma^2\\big) = \\frac{1}{\\sigma\\sqrt{2\\pi}} \\exp\\!\\left(-\\frac{(y_i - f(x_i))^2}{2\\sigma^2}\\right). \\]</p>' +
          '<p>In the negative log-likelihood, the logarithm and the exponential cancel. What remains for each data point is the squared residual \\((y_i - f(x_i))^2\\), scaled by a constant, plus a constant. Assuming Laplace noise instead leads in the same way to the absolute error, and therefore to the median.</p>'
      },
      {
        kind: 'exercise',
        title: 'Assemble the negative log of the Gaussian',
        html: '<p>Take the negative logarithm of \\(\\tfrac{1}{\\sigma\\sqrt{2\\pi}} \\exp\\!\\big(-\\tfrac{(y_i - f(x_i))^2}{2\\sigma^2}\\big)\\), using \\(\\ln(ab) = \\ln a + \\ln b\\) and \\(\\ln e^{u} = u\\). Drag the correct tiles into the numerator, the denominator and the additive term.</p>',
        hint: 'The exponent, with its sign flipped, becomes the fraction. The factor \\(\\tfrac{1}{\\sigma\\sqrt{2\\pi}}\\) becomes \\(-\\ln\\tfrac{1}{\\sigma\\sqrt{2\\pi}} = \\ln(\\sigma\\sqrt{2\\pi})\\).',
        mount: mountTokens
      },
      {
        kind: 'exercise',
        title: 'Large and small errors',
        html: '<p>The factor \\(\\tfrac{1}{2\\sigma^2}\\) and the additive constant do not depend on the parameters, so they do not move the minimum. Dropping them and averaging leaves the mean squared error \\(\\mathrm{MSE} = \\tfrac{1}{n}\\sum_i (y_i - f(x_i))^2\\): maximum likelihood with Gaussian noise is the minimisation of the MSE. Each data point pays the square of its residual \\(r_i = y_i - f(x_i)\\), drawn here as the area of a square.</p>' +
          '<p>Four points have residuals of size 1. Drag the purple point so that its single penalty equals the total penalty of the other four.</p>',
        hint: 'The four small squares have a total area of \\(4\\). A square of area \\(4\\) has side length \\(2\\), and the point may lie above or below the line.',
        mount: mountPenalty
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>For independent data the likelihood is a product, \\(L(\\theta) = \\prod_i p(y_i \\mid \\theta)\\). The logarithm turns it into a numerically stable sum without moving the maximum, and the loss is the negative log-likelihood \\(-\\sum_i \\ln p(y_i \\mid \\theta)\\).</li>' +
          '<li>Setting the derivative of the log-likelihood to zero gives exact estimates: \\(\\hat p = \\text{heads}/\\text{flips}\\) for a coin (\\(6/8 = 0.75\\)), and the mean for the best constant under squared error. The absolute error gives the median, which an outlier does not pull away.</li>' +
          '<li>Assuming \\(y = f(x) + \\varepsilon\\) with Gaussian noise, the negative log-likelihood is the squared residual plus constants, so maximum likelihood equals minimising the MSE. The penalty grows with the square of the residual (residual 1 costs 1, residual 2 costs 4) and is the same for misses above and below.</li>' +
          '</ul>'
      }
    ]
  });
})();
