(function () {
  'use strict';

  var ID = 'calculus-s2';
  var C = M4.colors;

  /* ---------- one-time CSS ---------- */
  function injectCss() {
    if (document.getElementById(ID + '-style')) return;
    var s = document.createElement('style');
    s.id = ID + '-style';
    s.textContent = [
      '.calculus-s2-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%}',
      '.calculus-s2-eq{display:flex;align-items:center;justify-content:center;gap:10px;font-size:30px;flex-wrap:wrap;padding:18px 8px}',
      '.calculus-s2-slot{min-width:68px;min-height:58px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box}',
      '.calculus-s2-exp{align-self:flex-start;margin-top:-22px;margin-left:-4px}',
      '.calculus-s2-tray{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;min-height:64px;padding:10px;width:100%;box-sizing:border-box}',
      '.calculus-s2-token{min-width:56px;min-height:48px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:600;padding:4px 14px;box-sizing:border-box;touch-action:none;user-select:none;-webkit-user-select:none}',
      '.calculus-s2-legend{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}',
      '.calculus-s2-key{display:inline-flex;align-items:center;gap:8px;font-size:17px}',
      '.calculus-s2-swatch{display:inline-block;width:26px;height:6px;border-radius:3px}',
      '.calculus-s2-card{background:#fff;border:2px solid #e6e4dd;border-radius:16px;padding:10px 10px 14px;display:flex;flex-direction:column;align-items:center;gap:8px}',
      '.calculus-s2-card.ok{border-color:#16b56b;background:#effaf4}',
      '.calculus-s2-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;width:100%}',
      '.calculus-s2-cardtitle{font-weight:700;font-size:16px;color:#6b6f76}',
      '.calculus-s2-svg{width:100%;height:auto;display:block;max-width:560px}',
      '.calculus-s2-seg{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}',
      '.calculus-s2-on{outline:3px solid #16b56b;outline-offset:2px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- small helpers ---------- */
  function fmt(v, d) {
    if (d === undefined) d = 2;
    var s = v.toFixed(d);
    if (parseFloat(s) === 0) s = (0).toFixed(d);
    return s.replace('-', '\u2212');
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function wrap(el) {
    injectCss();
    el.textContent = '';
    return M4.el('div', { class: 'calculus-s2-wrap' }, el);
  }

  function readout(parent, label) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    var f = function (v) { r.textContent = label + ' = ' + v; };
    f.el = r;
    return f;
  }

  function legend(parent, items) {
    var row = M4.el('div', { class: 'calculus-s2-legend' }, parent);
    items.forEach(function (it) {
      var k = M4.el('span', { class: 'calculus-s2-key' }, row);
      M4.el('span', { class: 'calculus-s2-swatch', style: 'background:' + it[0] }, k);
      var t = M4.el('span', {}, k);
      t.innerHTML = M4.tex(it[1]);
    });
    return row;
  }

  // sample f on [lo, hi], keeping only points inside the visible y range
  function samplePts(f, lo, hi, ymin, ymax, n) {
    n = n || 300;
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var x = lo + (hi - lo) * i / n;
      var y = f(x);
      if (isFinite(y) && y >= ymin && y <= ymax) pts.push([x, y]);
    }
    if (pts.length < 2) pts = [[lo, 0], [lo, 0]];
    return pts;
  }

  // tangent segment of fixed on-screen length through (x, y) with slope m
  function tangentEnds(p, x, y, m, lenPx) {
    var sx = Math.abs(p.x(1) - p.x(0));
    var sy = Math.abs(p.y(1) - p.y(0));
    var t = lenPx / Math.sqrt(sx * sx + sy * sy * m * m);
    return [x - t, y - m * t, x + t, y + m * t];
  }

  // drag-and-drop wiring where the lesson owns token placement
  function wireTokens(tokens, slots, tray, onChange) {
    function refresh() {
      slots.forEach(function (s) {
        if (s.querySelector('.m4-token')) s.classList.add('filled');
        else s.classList.remove('filled');
      });
    }
    M4.dragDrop({
      tokens: tokens,
      slots: slots,
      onDrop: function (tok, slot) {
        var prev = slot.querySelector('.m4-token');
        if (prev && prev !== tok) tray.appendChild(prev);
        if (tok.parentNode !== slot) slot.appendChild(tok);
        refresh();
        onChange();
      },
      onMiss: function (tok) {
        if (tok.parentNode !== tray) tray.appendChild(tok);
        refresh();
        onChange();
      }
    });
    return { refresh: refresh };
  }

  /* =====================================================================
     STEP MOUNTS
     ===================================================================== */

  /* ----- explore: power rule ----- */
  function mountPower(el, ctx) {
    var w = wrap(el);
    legend(w, [[C.green, 'f(x)=x^n'], [C.orange, "f'(x)=n\\,x^{n-1}"], [C.purple, '\\text{tangent}']]);
    var YMIN = -6, YMAX = 10;
    var p = M4.plane(w, { xmin: -3, xmax: 3, ymin: YMIN, ymax: YMAX, width: 540, height: 460 });
    var n = 2, x0 = 1;
    function f(x) { return Math.pow(x, n); }
    function df(x) { return n * Math.pow(x, n - 1); }
    function xr() {
      var hi = Math.min(2.8, Math.pow(9.5, 1 / n));
      var lo = (n % 2 === 1) ? -Math.min(2.8, Math.pow(5.6, 1 / n)) : -hi;
      return [lo, hi];
    }
    var cf = p.path(samplePts(f, -3, 3, YMIN, YMAX), { stroke: C.green, width: 4 });
    var cd = p.path(samplePts(df, -3, 3, YMIN, YMAX), { stroke: C.orange, width: 3 });
    var tan = p.line(0, 0, 1, 1, { stroke: C.purple, width: 3 });
    var drop = p.line(0, 0, 0, 0, { stroke: C.muted, width: 1.5, dash: '5 5' });
    var dpt = p.point(0, 0, { r: 7, fill: C.orange });
    var row = M4.el('div', { class: 'm4-row' }, w);
    var rx = readout(row, 'x'), rf = readout(row, 'f(x)'), rd = readout(row, "f\u2032(x)");
    var h;
    function update() {
      var r = xr();
      x0 = clamp(x0, r[0], r[1]);
      var y = f(x0), m = df(x0);
      var t = tangentEnds(p, x0, y, m, 85);
      tan.set(t[0], t[1], t[2], t[3]);
      var md = clamp(m, YMIN, YMAX);
      dpt.set(x0, md);
      drop.set(x0, y, x0, md);
      if (h) h.set(x0, y);
      rx(fmt(x0)); rf(fmt(y)); rd(fmt(m));
    }
    h = p.handle(x0, f(x0), {
      color: C.green,
      onDrag: function (x) { x0 = x; update(); },
      onEnd: function (x) { x0 = x; update(); }
    });
    M4.slider(w, {
      min: 1, max: 4, step: 1, value: 2, label: 'exponent n',
      format: function (v) { return String(v); },
      onInput: function (v) {
        n = Math.round(v);
        cf.set(samplePts(f, -3, 3, YMIN, YMAX));
        cd.set(samplePts(df, -3, 3, YMIN, YMAX));
        update();
        ctx.note('For \\(n=' + n + '\\): \\(f(x)=x^{' + n + '}\\) and \\(f\'(x)=' + (n === 1 ? '1' : n + (n === 2 ? 'x' : 'x^{' + (n - 1) + '}')) + '\\).');
      }
    });
    update();
    ctx.note('Drag the green point along the curve. The orange point shows the slope of the tangent as a height.');
  }

  /* ----- exercise: build the derivative of x^5 with tokens ----- */
  function mountPowerTokens(el, ctx) {
    var w = wrap(el);
    var eq = M4.el('div', { class: 'calculus-s2-eq' }, w);
    var lhs = M4.el('span', {}, eq);
    lhs.innerHTML = M4.tex('\\dfrac{d}{dx}\\,x^{5}\\;=');
    var sCoef = M4.el('span', { class: 'm4-slot calculus-s2-slot' }, eq);
    var xs = M4.el('span', {}, eq);
    xs.innerHTML = M4.tex('x');
    var sExp = M4.el('span', { class: 'm4-slot calculus-s2-slot calculus-s2-exp' }, eq);
    var tray = M4.el('div', { class: 'calculus-s2-tray' }, w);
    var tokens = ['4', '6', '5', '1'].map(function (v) {
      var t = M4.el('div', { class: 'm4-token calculus-s2-token', text: v }, tray);
      t.setAttribute('data-v', v);
      return t;
    });
    M4.el('div', { class: 'm4-note', text: 'Drag one tile into the coefficient slot and one into the exponent slot.' }, w);
    var done = false;
    function val(slot) {
      var t = slot.querySelector('.m4-token');
      return t ? t.getAttribute('data-v') : null;
    }
    var wired = wireTokens(tokens, [sCoef, sExp], tray, function () {
      if (done) return;
      var a = val(sCoef), b = val(sExp);
      if (a === null || b === null) { ctx.note(''); return; }
      if (a === '5' && b === '4') {
        done = true;
        eq.classList.add('m4-pop');
        ctx.note('\\(\\dfrac{d}{dx}x^5 = 5x^4\\): the exponent comes down as a factor and is then reduced by one.');
        ctx.solved();
        return;
      }
      var msg;
      if (a === '4' && b === '5') msg = 'The two numbers are swapped: the old exponent becomes the coefficient.';
      else if (a !== '5') msg = 'The coefficient must equal the original exponent.';
      else msg = 'The new exponent is the original exponent minus one.';
      ctx.wrong(msg);
      if (a !== '5') tray.appendChild(sCoef.querySelector('.m4-token'));
      if (b !== '4') tray.appendChild(sExp.querySelector('.m4-token'));
      wired.refresh();
    });
  }

  /* ----- exercise: number input, sum rule ----- */
  function mountSumNumber(el, ctx) {
    var w = wrap(el);
    var eq = M4.el('div', { class: 'calculus-s2-eq' }, w);
    eq.innerHTML = M4.tex("f(x)=3x^{2}+2x \\qquad f'(2)=\\;?");
    M4.numberInput(w, {
      answer: 14, tolerance: 0.01, placeholder: 'value', label: "f\u2032(2) =",
      onCorrect: function () {
        ctx.note("\\(f'(x)=3\\cdot 2x+2=6x+2\\), so \\(f'(2)=14\\).");
        ctx.solved();
      },
      onWrong: function (v) {
        var x = Number(v);
        if (Math.abs(x - 16) < 0.01) ctx.wrong('16 is the value f(2), not the slope. Differentiate first, then substitute.');
        else if (Math.abs(x - 12) < 0.01) ctx.wrong('12 is the contribution of the term 3x\u00b2 alone. The term 2x adds its own slope.');
        else if (Math.abs(x - 6) < 0.01 || Math.abs(x - 8) < 0.01) ctx.wrong('Check the term 3x\u00b2: its derivative is 6x, which must be evaluated at x = 2.');
        else ctx.wrong('Differentiate each term separately, then substitute x = 2.');
      }
    });
  }

  /* ----- explore: product rule rectangle ----- */
  function mountProduct(el, ctx) {
    var w = wrap(el);
    var U = 4, V = 3, S = 58, OX = 96, OY = 352;
    var svg = M4.svg('svg', { viewBox: '0 0 560 400', class: 'calculus-s2-svg' }, w);
    var main = M4.svg('rect', { fill: C.green, 'fill-opacity': 0.22, stroke: C.green, 'stroke-width': 3, rx: 2 }, svg);
    var right = M4.svg('rect', { fill: C.orange, 'fill-opacity': 0.4, stroke: C.orange, 'stroke-width': 2 }, svg);
    var top = M4.svg('rect', { fill: C.purple, 'fill-opacity': 0.35, stroke: C.purple, 'stroke-width': 2 }, svg);
    var corner = M4.svg('rect', { fill: C.pink, 'fill-opacity': 0.75, stroke: C.pink, 'stroke-width': 2 }, svg);
    function label(fill) {
      return M4.svg('text', { 'font-size': 18, 'font-weight': 700, fill: fill, 'text-anchor': 'middle', 'font-family': 'inherit' }, svg);
    }
    var lu = label(C.green), lv = label(C.green), ldu = label(C.orange), ldv = label(C.purple), lc = label(C.ink);
    lu.textContent = 'u = 4'; lv.textContent = 'v = 3'; lc.textContent = 'u\u00b7v = 12';
    var du = 1, dv = 1, raf = 0;
    var row = M4.el('div', { class: 'm4-row' }, w);
    var r1 = readout(row, 'v\u00b7\u0394u'), r2 = readout(row, 'u\u00b7\u0394v'), r3 = readout(row, '\u0394u\u00b7\u0394v');
    var row2 = M4.el('div', { class: 'm4-row' }, w);
    var r4 = readout(row2, 'corner share of the gain');
    r1.el.style.color = C.orange; r2.el.style.color = C.purple; r3.el.style.color = C.pink;
    function rect(r, x, y, wd, ht) {
      r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', Math.max(0, wd)); r.setAttribute('height', Math.max(0, ht));
    }
    function pos(t, x, y) { t.setAttribute('x', x); t.setAttribute('y', y); }
    function draw() {
      var uw = U * S, vh = V * S, dw = du * S, dh = dv * S;
      rect(main, OX, OY - vh, uw, vh);
      rect(right, OX + uw, OY - vh, dw, vh);
      rect(top, OX, OY - vh - dh, uw, dh);
      rect(corner, OX + uw, OY - vh - dh, dw, dh);
      pos(lu, OX + uw / 2, OY + 28);
      pos(lv, OX - 44, OY - vh / 2 + 6);
      pos(ldu, OX + uw + Math.max(dw / 2, 22), OY + 28);
      pos(ldv, OX - 44, OY - vh - dh / 2 + 6);
      pos(lc, OX + uw / 2, OY - vh / 2 + 6);
      ldu.textContent = '\u0394u';
      ldv.textContent = '\u0394v';
      var a = V * du, b = U * dv, c = du * dv;
      r1(fmt(a, 3)); r2(fmt(b, 3)); r3(fmt(c, 4));
      r4(fmt(100 * c / (a + b + c), 1) + ' %');
    }
    var s1 = M4.slider(w, { min: 0.02, max: 1.5, step: 0.01, value: 1, label: '\u0394u', format: function (v) { return fmt(v); }, onInput: function (v) { du = v; draw(); } });
    var s2 = M4.slider(w, { min: 0.02, max: 1.5, step: 0.01, value: 1, label: '\u0394v', format: function (v) { return fmt(v); }, onInput: function (v) { dv = v; draw(); } });
    var btns = M4.el('div', { class: 'm4-row' }, w);
    M4.button(btns, 'Shrink both changes', function () {
      cancelAnimationFrame(raf);
      var a0 = du, b0 = dv, t0 = null;
      function tick(ts) {
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / 2200);
        var e = k * k * (3 - 2 * k);
        du = a0 * Math.pow(0.02 / a0, e);
        dv = b0 * Math.pow(0.02 / b0, e);
        s1.set(du); s2.set(dv);
        draw();
        if (k < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, { primary: true });
    M4.button(btns, 'Reset', function () {
      cancelAnimationFrame(raf);
      du = 1; dv = 1; s1.set(1); s2.set(1); draw();
    });
    ctx.onCleanup(function () { cancelAnimationFrame(raf); });
    draw();
    ctx.note('The two strips shrink in proportion to the changes. The pink corner shrinks in proportion to their product, so its share of the gain tends to zero.');
  }

  /* ----- exercise: choices, product rule ----- */
  function mountProductChoice(el, ctx) {
    var w = wrap(el);
    var msgs = [
      'This multiplies the two derivatives. The product rule adds two terms, each with only one factor differentiated.',
      '',
      'This keeps \\(x^2\\) fixed and differentiates only \\(e^x\\). The term in which \\(x^2\\) is differentiated is missing.',
      'This is the derivative of the sum \\(x^2+e^x\\), not of the product.'
    ];
    M4.choices(w, {
      options: ['\\(2x\\,e^{x}\\)', '\\(2x\\,e^{x}+x^{2}e^{x}\\)', '\\(x^{2}e^{x}\\)', '\\(2x+e^{x}\\)'],
      correct: 1,
      onCorrect: function () {
        ctx.note("With \\(u=x^2\\) and \\(v=e^x\\): \\(u'v+uv' = 2x\\,e^x+x^2e^x\\).");
        ctx.solved();
      },
      onWrong: function (i) { ctx.wrong(); ctx.note(msgs[i] || ''); }
    });
  }

  /* ----- explore: e^x and ln x ----- */
  function mountExpLog(el, ctx) {
    var w = wrap(el);
    var seg = M4.el('div', { class: 'calculus-s2-seg' }, w);
    var holder = M4.el('div', { style: 'width:100%;display:flex;flex-direction:column;align-items:center;gap:16px' }, w);
    var bExp, bLn;
    function build(kind) {
      holder.textContent = '';
      bExp.classList.toggle('calculus-s2-on', kind === 'exp');
      bLn.classList.toggle('calculus-s2-on', kind === 'ln');
      var YMIN = -3, YMAX = 7;
      var p = M4.plane(holder, { xmin: -3, xmax: 4, ymin: YMIN, ymax: YMAX, width: 540, height: 460 });
      var isExp = kind === 'exp';
      var f = isExp ? Math.exp : Math.log;
      var df = isExp ? Math.exp : function (x) { return 1 / x; };
      var lo = isExp ? -3 : 0.06, hi = isExp ? 1.9 : 4;
      p.path(samplePts(f, isExp ? -3 : 0.05, 4, YMIN, YMAX, 400), { stroke: C.green, width: 4 });
      var bar = p.line(0, 0, 0, 0, { stroke: C.orange, width: 5 });
      var tan = p.line(0, 0, 1, 1, { stroke: C.purple, width: 3 });
      p.text(isExp ? -2 : 2.9, isExp ? 0.75 : 0.45, isExp ? 'y = e\u02e3' : 'y = ln x', { fill: C.green, size: 18, weight: 700 });
      var row = M4.el('div', { class: 'm4-row' }, holder);
      var rx = readout(row, 'x');
      var ra = readout(row, isExp ? 'height e\u02e3' : '1 / x');
      var rs = readout(row, 'tangent slope');
      ra.el.style.color = C.orange; rs.el.style.color = C.purple;
      var x0 = isExp ? 0 : 1, h;
      function update() {
        x0 = clamp(x0, lo, hi);
        var y = f(x0), m = df(x0);
        var t = tangentEnds(p, x0, y, m, 90);
        tan.set(t[0], t[1], t[2], t[3]);
        if (isExp) bar.set(x0, 0, x0, y); else bar.set(0, 0, x0, 0);
        if (h) h.set(x0, y);
        rx(fmt(x0)); ra(fmt(m, 3)); rs(fmt(m, 3));
      }
      h = p.handle(x0, f(x0), {
        color: C.green,
        onDrag: function (x) { x0 = x; update(); },
        onEnd: function (x) { x0 = x; update(); }
      });
      update();
      ctx.note(isExp
        ? 'The orange bar is the height \\(e^x\\). At every point it equals the slope of the purple tangent.'
        : 'The orange bar has length \\(x\\). The slope of the purple tangent is its reciprocal \\(1/x\\): steep near zero, flat far to the right.');
    }
    bExp = M4.button(seg, 'f(x) = e\u02e3', function () { build('exp'); });
    bLn = M4.button(seg, 'f(x) = ln x', function () { build('ln'); });
    build('exp');
  }

  /* ----- exercise: slide the base until a^x is its own derivative ----- */
  function mountBase(el, ctx) {
    var w = wrap(el);
    legend(w, [[C.green, 'f(x)=a^{x}'], [C.orange, "f'(x)=(\\ln a)\\,a^{x}"]]);
    var YMIN = -1, YMAX = 5;
    var p = M4.plane(w, { xmin: -2, xmax: 2, ymin: YMIN, ymax: YMAX, width: 540, height: 420 });
    var a = 2, done = false;
    function f(x) { return Math.pow(a, x); }
    function df(x) { return Math.log(a) * Math.pow(a, x); }
    var cd = p.path(samplePts(df, -2, 2, YMIN, YMAX), { stroke: C.orange, width: 5 });
    var cf = p.path(samplePts(f, -2, 2, YMIN, YMAX), { stroke: C.green, width: 3 });
    var pt1 = p.point(0, 1, { r: 7, fill: C.green });
    var pt2 = p.point(0, Math.log(2), { r: 7, fill: C.orange });
    var row = M4.el('div', { class: 'm4-row' }, w);
    var ra = readout(row, 'a'), rs = readout(row, "f\u2032(0)"), rr = readout(row, "f\u2032 / f");
    function update() {
      cf.set(samplePts(f, -2, 2, YMIN, YMAX));
      cd.set(samplePts(df, -2, 2, YMIN, YMAX));
      pt1.set(0, 1); pt2.set(0, Math.log(a));
      ra(fmt(a)); rs(fmt(Math.log(a), 3)); rr(fmt(Math.log(a), 3));
    }
    M4.slider(w, {
      min: 1.5, max: 4, step: 0.01, value: 2, label: 'base a',
      format: function (v) { return fmt(v); },
      onInput: function (v) { if (done) return; a = v; update(); }
    });
    var btns = M4.el('div', { class: 'm4-row' }, w);
    M4.button(btns, 'Check', function () {
      if (done) return;
      var k = Math.log(a);
      if (Math.abs(k - 1) <= 0.012) {
        done = true;
        cf.el.setAttribute('stroke-width', 5);
        cd.el.setAttribute('stroke-opacity', 0.45);
        w.classList.add('m4-pop');
        ctx.note('The two curves coincide for \\(a\\approx 2.718\\). This base is the number \\(e\\), defined by \\(\\ln e = 1\\).');
        ctx.solved();
      } else if (k < 1) {
        ctx.wrong('The derivative curve lies below the function (ratio ' + fmt(k, 3) + '). Increase the base.');
      } else {
        ctx.wrong('The derivative curve lies above the function (ratio ' + fmt(k, 3) + '). Decrease the base.');
      }
    }, { primary: true });
    update();
  }

  /* ----- exercise: cross-entropy slope ----- */
  function mountLoss(el, ctx) {
    var w = wrap(el);
    var YMIN = -0.5, YMAX = 5;
    var p = M4.plane(w, { xmin: -0.1, xmax: 1.1, ymin: YMIN, ymax: YMAX, width: 540, height: 440 });
    function f(x) { return -Math.log(x); }
    function df(x) { return -1 / x; }
    p.path(samplePts(f, 0.005, 1.1, YMIN, YMAX, 500), { stroke: C.green, width: 4 });
    p.line(0.66, 4.5, 0.96, 3.9, { stroke: C.orange, width: 3, dash: '7 6' });
    p.text(0.81, 4.68, 'target slope \u22122', { fill: C.orange, size: 16, weight: 700 });
    p.text(0.3, 2.35, 'L(p) = \u2212ln p', { fill: C.green, size: 17, weight: 700, anchor: 'start' });
    var tan = p.line(0, 0, 1, 1, { stroke: C.purple, width: 3 });
    var row = M4.el('div', { class: 'm4-row' }, w);
    var rp = readout(row, 'p'), rl = readout(row, 'loss L(p)'), rs = readout(row, 'slope L\u2032(p)');
    rs.el.style.color = C.purple;
    var x0 = 0.15, done = false, h;
    function update() {
      x0 = clamp(x0, 0.03, 1);
      var y = f(x0), m = df(x0);
      var t = tangentEnds(p, x0, y, m, 80);
      tan.set(t[0], t[1], t[2], t[3]);
      if (h) h.set(x0, y);
      rp(fmt(x0)); rl(fmt(y, 3)); rs(fmt(m, 2));
    }
    h = p.handle(x0, f(x0), {
      color: C.green,
      onDrag: function (x) { if (done) { update(); return; } x0 = x; update(); },
      onEnd: function (x) {
        if (done) { update(); return; }
        x0 = x; update();
        var m = df(x0);
        if (Math.abs(x0 - 0.5) <= 0.04) {
          done = true;
          x0 = 0.5; update();
          tan.el.setAttribute('stroke', C.orange);
          tan.el.setAttribute('stroke-width', 5);
          ctx.note("At \\(p=0.5\\) the slope is \\(L'(p)=-1/p=-2\\). A confident wrong prediction (small \\(p\\)) gives a much steeper slope, and therefore a larger correction during training.");
          ctx.solved();
        } else if (m < -2) {
          ctx.note('The slope here is ' + fmt(m, 2) + ', steeper than \u22122. Move the point to the right.');
        } else {
          ctx.note('The slope here is ' + fmt(m, 2) + ', flatter than \u22122. Move the point to the left.');
        }
      }
    });
    update();
  }

  /* ----- exercise: match functions to derivative graphs ----- */
  function miniGraph(parent, f, lo, hi) {
    var svg = M4.svg('svg', { viewBox: '0 0 200 160', style: 'width:100%;max-width:240px;height:auto;display:block' }, parent);
    var X = function (x) { return 100 + x * 30; }, Y = function (y) { return 80 - y * 28; };
    for (var i = -3; i <= 3; i++) {
      M4.svg('line', { x1: X(i), y1: 4, x2: X(i), y2: 156, stroke: C.line, 'stroke-width': 1 }, svg);
    }
    for (var j = -2; j <= 2; j++) {
      M4.svg('line', { x1: 6, y1: Y(j), x2: 194, y2: Y(j), stroke: C.line, 'stroke-width': 1 }, svg);
    }
    M4.svg('line', { x1: 6, y1: Y(0), x2: 194, y2: Y(0), stroke: C.ink, 'stroke-width': 1.6 }, svg);
    M4.svg('line', { x1: X(0), y1: 4, x2: X(0), y2: 156, stroke: C.ink, 'stroke-width': 1.6 }, svg);
    M4.svg('line', { x1: X(1), y1: Y(0) - 4, x2: X(1), y2: Y(0) + 4, stroke: C.ink, 'stroke-width': 1.6 }, svg);
    M4.svg('line', { x1: X(0) - 4, y1: Y(1), x2: X(0) + 4, y2: Y(1), stroke: C.ink, 'stroke-width': 1.6 }, svg);
    var t1 = M4.svg('text', { x: X(1), y: Y(0) + 19, 'font-size': 15, fill: C.muted, 'text-anchor': 'middle' }, svg);
    t1.textContent = '1';
    var t2 = M4.svg('text', { x: X(0) - 9, y: Y(1) + 5, 'font-size': 15, fill: C.muted, 'text-anchor': 'end' }, svg);
    t2.textContent = '1';
    var d = '', first = true;
    for (var k = 0; k <= 240; k++) {
      var x = lo + (hi - lo) * k / 240, y = f(x);
      if (!isFinite(y) || y > 2.75 || y < -2.75) continue;
      d += (first ? 'M' : 'L') + X(x).toFixed(1) + ' ' + Y(y).toFixed(1);
      first = false;
    }
    M4.svg('path', { d: d, fill: 'none', stroke: C.orange, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    return svg;
  }

  function mountMatch(el, ctx) {
    var w = wrap(el);
    var graphs = [
      { key: 'ln', f: function (x) { return 1 / x; }, lo: 0.3, hi: 3.1 },
      { key: 'sq', f: function (x) { return 2 * x; }, lo: -3.1, hi: 3.1 },
      { key: 'exp', f: Math.exp, lo: -3.1, hi: 3.1 },
      { key: 'cu', f: function (x) { return 3 * x * x; }, lo: -3.1, hi: 3.1 }
    ];
    var toks = [
      { key: 'cu', tex: 'x^{3}' },
      { key: 'exp', tex: 'e^{x}' },
      { key: 'ln', tex: '\\ln x' },
      { key: 'sq', tex: 'x^{2}' }
    ];
    var tray = M4.el('div', { class: 'calculus-s2-tray' }, w);
    var tokens = toks.map(function (t) {
      var e = M4.el('div', { class: 'm4-token calculus-s2-token' }, tray);
      e.innerHTML = M4.tex('f(x)=' + t.tex);
      e.setAttribute('data-k', t.key);
      return e;
    });
    var grid = M4.el('div', { class: 'calculus-s2-cards' }, w);
    var slots = [], cards = [];
    graphs.forEach(function (g, i) {
      var card = M4.el('div', { class: 'calculus-s2-card' }, grid);
      M4.el('div', { class: 'calculus-s2-cardtitle', text: 'Derivative graph ' + 'ABCD'.charAt(i) }, card);
      miniGraph(card, g.f, g.lo, g.hi);
      var slot = M4.el('div', { class: 'm4-slot calculus-s2-slot', style: 'min-width:150px' }, card);
      slot.setAttribute('data-k', g.key);
      slots.push(slot); cards.push(card);
    });
    M4.el('div', { class: 'm4-note', text: 'Each orange curve is the derivative of exactly one of the four functions. Drag each function under its derivative.' }, w);
    var done = false;
    var wired = wireTokens(tokens, slots, tray, function () {
      if (done) return;
      var filled = 0, right = 0, wrongSlots = [];
      slots.forEach(function (s, i) {
        var t = s.querySelector('.m4-token');
        cards[i].classList.remove('ok');
        if (!t) return;
        filled++;
        if (t.getAttribute('data-k') === s.getAttribute('data-k')) right++;
        else wrongSlots.push(s);
      });
      if (filled < 4) { ctx.note(filled + ' of 4 placed.'); return; }
      if (right === 4) {
        done = true;
        cards.forEach(function (c) { c.classList.add('ok'); c.classList.add('m4-pop'); });
        ctx.note('A: \\(1/x\\) from \\(\\ln x\\). B: \\(2x\\) from \\(x^2\\). C: \\(e^x\\) from \\(e^x\\). D: \\(3x^2\\) from \\(x^3\\).');
        ctx.solved();
        return;
      }
      slots.forEach(function (s, i) { if (wrongSlots.indexOf(s) < 0) cards[i].classList.add('ok'); });
      wrongSlots.forEach(function (s) { tray.appendChild(s.querySelector('.m4-token')); });
      wired.refresh();
      ctx.wrong(right + ' of 4 are correct and stay in place. Check where each derivative graph is zero, negative, or undefined.');
    });
  }

  /* =====================================================================
     LESSON
     ===================================================================== */
  M4.lesson({
    id: ID,
    module: 'calculus',
    title: 'Derivative rules',
    summary: 'Rules for differentiating powers, sums and products, together with the derivatives of the exponential and the logarithm.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Limits and rules',
        html: '<p>The derivative \\(f\'(x)\\) of a function \\(f\\) is the slope of its tangent at \\(x\\). Computing it from the limit definition each time is slow, so a small set of rules is used instead.</p>' +
          '<p>By the end you can differentiate powers, sums and products, state the derivatives of \\(e^x\\) and \\(\\ln x\\), and recognise a function from the graph of its derivative.</p>'
      },
      {
        kind: 'explore',
        title: 'The power rule',
        html: '<p>For a fixed exponent \\(n\\), the power rule states \\[\\frac{d}{dx}\\,x^{n} = n\\,x^{n-1}.\\] The exponent becomes a factor, and the exponent itself drops by one. Change \\(n\\) and move the point: the height of the orange curve always equals the slope of the purple tangent.</p>',
        mount: mountPower
      },
      {
        kind: 'exercise',
        title: 'Power rule practice',
        html: '<p>Complete the derivative of \\(x^5\\) by placing the correct coefficient and the correct exponent.</p>',
        hint: 'In \\(n\\,x^{n-1}\\) with \\(n=5\\), the coefficient is \\(n\\) and the exponent is \\(n-1\\).',
        mount: mountPowerTokens
      },
      {
        kind: 'text',
        title: 'Constants and sums',
        html: '<p>Let \\(f\\) and \\(g\\) be differentiable functions and \\(c\\) a constant. Then \\[\\frac{d}{dx}\\big[c\\,f(x)\\big]=c\\,f\'(x), \\qquad \\frac{d}{dx}\\big[f(x)+g(x)\\big]=f\'(x)+g\'(x).\\]</p>' +
          '<p>A polynomial can therefore be differentiated term by term. For example, \\(\\frac{d}{dx}\\,(4x^3+x) = 12x^2+1\\). The derivative of a constant term is zero, because a constant does not change.</p>'
      },
      {
        kind: 'exercise',
        title: 'Sums of terms',
        html: '<p>Use the power rule and the sum rule to find the slope of \\(f(x)=3x^2+2x\\) at the point \\(x=2\\).</p>',
        hint: 'First find \\(f\'(x)\\): the term \\(3x^2\\) gives \\(6x\\) and the term \\(2x\\) gives \\(2\\). Then substitute \\(x=2\\).',
        mount: mountSumNumber
      },
      {
        kind: 'explore',
        title: 'The product rule',
        html: '<p>A product \\(u\\cdot v\\) is the area of a rectangle with sides \\(u\\) and \\(v\\). If the sides grow by \\(\\Delta u\\) and \\(\\Delta v\\), the area gains two strips, \\(v\\,\\Delta u\\) and \\(u\\,\\Delta v\\), and a small corner \\(\\Delta u\\,\\Delta v\\). For small changes the corner is negligible, which gives \\[(uv)\' = u\'v + u\\,v\'.\\]</p>',
        mount: mountProduct
      },
      {
        kind: 'exercise',
        title: 'Product rule practice',
        html: '<p>The derivative of \\(e^x\\) is \\(e^x\\) itself (this is examined in the next step). Using this fact and the product rule, select the derivative of \\(x^2 e^x\\).</p>',
        hint: 'Set \\(u=x^2\\) and \\(v=e^x\\). Then \\(u\'=2x\\) and \\(v\'=e^x\\), and the result is \\(u\'v+uv\'\\).',
        mount: mountProductChoice
      },
      {
        kind: 'explore',
        title: 'Exponential and logarithm',
        html: '<p>Two functions appear throughout machine learning: the exponential \\(e^x\\) and its inverse, the natural logarithm \\(\\ln x\\), defined for \\(x>0\\). Their derivatives are \\[\\frac{d}{dx}\\,e^{x}=e^{x}, \\qquad \\frac{d}{dx}\\,\\ln x=\\frac{1}{x}.\\] Drag the point and compare the orange quantity with the slope of the tangent.</p>',
        mount: mountExpLog
      },
      {
        kind: 'exercise',
        title: 'The special base e',
        html: '<p>For any base \\(a>0\\), the derivative of \\(a^x\\) is \\((\\ln a)\\,a^x\\): a multiple of the function itself. Adjust the base until the function and its derivative are the same curve, then press Check.</p>',
        hint: 'The curves coincide when the factor \\(\\ln a\\) equals 1. Move the slider while checking the displayed value of \\(f\'/f\\) until it is as close to 1 as possible (within about 0.01).',
        mount: mountBase
      },
      {
        kind: 'exercise',
        title: 'The slope of a loss',
        html: '<p>A model gives the correct answer the chance \\(p\\) between 0 and 1, and its loss is \\(L(p)=-\\ln p\\): zero when \\(p=1\\), and larger the smaller \\(p\\) gets. Training moves in proportion to the slope \\(L\'(p)=-1/p\\). Drag the point to the chance at which the slope of the loss equals \\(-2\\).</p>',
        hint: 'Solve \\(-1/p=-2\\) for \\(p\\), then release the point at that value on the horizontal axis.',
        mount: mountLoss
      },
      {
        kind: 'exercise',
        title: 'Functions and their derivative graphs',
        html: '<p>Each panel shows the graph of a derivative \\(f\'\\). Assign each function \\(f\\) to the panel that shows its derivative.</p>',
        hint: 'Compute the four derivatives: \\(2x\\), \\(3x^2\\), \\(e^x\\) and \\(1/x\\). A straight line through the origin, a curve that is never negative and touches zero, a curve that is always positive and rising, and a curve that exists only for \\(x>0\\).',
        mount: mountMatch
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li><b>Power and sum rules.</b> \\(\\frac{d}{dx}x^n=n\\,x^{n-1}\\), constants factor out, and sums are differentiated term by term.</li>' +
          '<li><b>Product rule.</b> \\((uv)\'=u\'v+uv\'\\): each factor is differentiated once while the other is held fixed.</li>' +
          '<li><b>Exponential and logarithm.</b> \\(\\frac{d}{dx}e^x=e^x\\) and \\(\\frac{d}{dx}\\ln x=1/x\\). The second gives the slope \\(-1/p\\) of the loss \\(-\\ln p\\), which returns later in the course as the cross-entropy loss.</li>' +
          '</ul>' +
          '<p>The next session treats functions nested inside other functions, which require the chain rule.</p>'
      }
    ]
  });
})();
