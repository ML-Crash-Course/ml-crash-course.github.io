(function () {
  'use strict';
  var M4 = window.M4;
  if (!M4 || typeof M4.lesson !== 'function') { return; }
  var C = M4.colors || {};
  var ORANGE = C.orange || '#ff8a1f', BLUE = C.blue || '#2f6bff', GREEN = C.green || '#16b56b',
    PURPLE = C.purple || '#7a5cff', RED = C.red || '#f0473e', INK = C.ink || '#1d1d1f',
    MUTED = C.muted || '#6b6f76', LINE = C.line || '#e6e4dd';

  function injectStyle() {
    if (document.getElementById('functions-s3-style')) { return; }
    var s = document.createElement('style');
    s.id = 'functions-s3-style';
    s.textContent = [
      '.functions-s3-wrap{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%}',
      '.functions-s3-wrap svg{max-width:100%;height:auto;touch-action:none}',
      '.functions-s3-rows{display:flex;flex-direction:column;gap:14px;align-items:center;width:100%}',
      '.functions-s3-eq{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-size:20px}',
      '.functions-s3-lhs{min-width:120px;text-align:right}',
      '.functions-s3-slot{min-width:210px;min-height:56px;display:flex;align-items:center;justify-content:center;font-size:20px}',
      '.functions-s3-slot.functions-s3-ok{border-style:solid;border-color:' + GREEN + ';background:rgba(22,181,107,.10)}',
      '.functions-s3-tok{font-size:20px;padding:12px 18px;touch-action:none}',
      '.functions-s3-card{background:#fff;border:2px solid ' + LINE + ';border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;transition:border-color .2s,background .2s}',
      '.functions-s3-card.functions-s3-bad{border-color:' + RED + ';background:rgba(240,71,62,.07)}',
      '.functions-s3-card.functions-s3-good{border-color:' + GREEN + ';background:rgba(22,181,107,.07)}',
      '.functions-s3-big{font-size:30px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.2}',
      '.functions-s3-lab{font-size:16px;color:' + MUTED + '}',
      '.functions-s3-track{width:100%;height:14px;border-radius:7px;background:' + LINE + ';overflow:hidden}',
      '.functions-s3-fill{height:100%;border-radius:7px;background:' + ORANGE + ';width:0}',
      '.functions-s3-full{width:100%}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function wrap(el) {
    injectStyle();
    el.innerHTML = '';
    return M4.el('div', { class: 'functions-s3-wrap' }, el);
  }
  function readout(parent) {
    return M4.el('span', { class: 'm4-readout', text: '' }, parent);
  }
  function fx(v, d) { return v.toFixed(d).replace('-', '−'); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function setFill(h, color) {
    try { if (h && h.el) { h.el.setAttribute('fill', color); } } catch (e) { /* ignore */ }
  }

  /* ---------- step 3: exp and ln as mirror images ---------- */
  function mountMirror(el) {
    var w = wrap(el);
    var p = M4.plane(w, { xmin: -3, xmax: 8, ymin: -3, ymax: 8, width: 520, height: 520 });
    var XMAX = Math.log(8), i, t, ex = [], ln = [];
    for (i = 0; i <= 160; i++) {
      t = -3 + (XMAX + 3) * i / 160;
      ex.push([t, Math.exp(t)]);
      ln.push([Math.exp(t), t]);
    }
    p.line(-3, -3, 8, 8, { stroke: MUTED, width: 2, dash: '6 6' });
    p.path(ex, { stroke: ORANGE, width: 4 });
    p.path(ln, { stroke: BLUE, width: 4 });
    p.text(0.5, 7.3, 'y = eˣ', { fill: ORANGE, size: 18, anchor: 'end', weight: 700 });
    p.text(6.9, 1.1, 'y = ln x', { fill: BLUE, size: 18, weight: 700 });
    p.text(7.2, 6.1, 'y = x', { fill: MUTED, size: 16 });
    var link = p.line(1, Math.E, Math.E, 1, { stroke: PURPLE, width: 2, dash: '4 5' });
    var mirror = p.point(Math.E, 1, { r: 8, fill: BLUE });
    var row = M4.el('div', { class: 'm4-row' }, w);
    var r1 = readout(row), r2 = readout(row), r3 = readout(row);
    function update(x) {
      var y = Math.exp(x);
      link.set(x, y, y, x);
      mirror.set(y, x);
      r1.textContent = 'x = ' + fx(x, 2);
      r2.textContent = 'eˣ = ' + fx(y, 2);
      r3.textContent = 'ln(' + fx(y, 2) + ') = ' + fx(x, 2);
    }
    var h = p.handle(1, Math.E, {
      color: ORANGE,
      onDrag: function (x) {
        var cx = clamp(x, -3, XMAX);
        h.set(cx, Math.exp(cx));
        update(cx);
      }
    });
    update(1);
    M4.el('div', { class: 'm4-note', text: 'Drag the orange point along the exponential curve. The blue point is its reflection in the dashed line.' }, w);
  }

  /* ---------- step 5: find x with log2 x = 3 ---------- */
  function mountFindLog(el, ctx) {
    var w = wrap(el);
    var p = M4.plane(w, { xmin: -1, xmax: 17, ymin: -2, ymax: 5, width: 640, height: 400 });
    var pts = [], i, x;
    for (i = 0; i <= 200; i++) {
      x = 0.26 + (17 - 0.26) * i / 200;
      pts.push([x, Math.log(x) / Math.LN2]);
    }
    p.line(-1, 3, 17, 3, { stroke: GREEN, width: 2, dash: '7 6' });
    p.text(2.2, 3.35, 'output 3', { fill: GREEN, size: 16, weight: 700 });
    p.path(pts, { stroke: ORANGE, width: 4 });
    p.text(14.2, 4.45, 'y = log₂ x', { fill: ORANGE, size: 17, weight: 700 });
    var vx = p.line(2, 0, 2, 1, { stroke: MUTED, width: 2, dash: '4 5' });
    var hy = p.line(0, 1, 2, 1, { stroke: MUTED, width: 2, dash: '4 5' });
    var row = M4.el('div', { class: 'm4-row' }, w);
    var r1 = readout(row), r2 = readout(row);
    var done = false;
    function snapX(v) { return clamp(Math.round(v * 2) / 2, 0.5, 16); }
    function update(cx) {
      var y = Math.log(cx) / Math.LN2;
      vx.set(cx, 0, cx, y);
      hy.set(0, y, cx, y);
      r1.textContent = 'x = ' + fx(cx, 1);
      r2.textContent = 'log₂ x = ' + fx(y, 2);
    }
    var h = p.handle(2, 1, {
      color: ORANGE,
      onDrag: function (xx) {
        var cx = snapX(xx);
        h.set(cx, Math.log(cx) / Math.LN2);
        update(cx);
      },
      onEnd: function (xx) {
        var cx = snapX(xx), y = Math.log(cx) / Math.LN2;
        h.set(cx, y);
        update(cx);
        if (cx === 8) {
          if (!done) { done = true; setFill(h, GREEN); }
          ctx.note('\\(\\log_2 8 = 3\\) because \\(2^3 = 8\\).');
          ctx.solved();
        } else if (!done) {
          ctx.note('At \\(x = ' + cx + '\\) the output is ' + y.toFixed(2) + ', which is ' + (y < 3 ? 'below' : 'above') + ' 3. Move the point to the ' + (y < 3 ? 'right' : 'left') + '.');
        }
      }
    });
    update(2);
  }

  /* ---------- step 6: slide rule ---------- */
  function mountSlideRule(el) {
    var w = wrap(el);
    var p = M4.plane(w, { xmin: -0.15, xmax: 2.15, ymin: 0, ymax: 1, width: 640, height: 260, grid: false, axes: false, labels: false });
    var ticks = [1, 2, 3, 5, 10, 20, 30, 50, 100], i, u;
    p.line(0, 0.28, 2, 0.28, { stroke: INK, width: 3 });
    for (i = 0; i < ticks.length; i++) {
      u = Math.log(ticks[i]) / Math.LN10;
      p.line(u, 0.22, u, 0.34, { stroke: INK, width: 2 });
      p.text(u, 0.08, String(ticks[i]), { fill: INK, size: 16 });
    }
    var barA = p.line(0, 0.62, 0.3, 0.62, { stroke: ORANGE, width: 18 });
    var barB = p.line(0.3, 0.62, 0.6, 0.62, { stroke: BLUE, width: 18 });
    var labA = p.text(0.15, 0.84, 'log a', { fill: ORANGE, size: 17, weight: 700 });
    var labB = p.text(0.45, 0.84, 'log c', { fill: BLUE, size: 17, weight: 700 });
    var drop = p.line(0.6, 0.62, 0.6, 0.28, { stroke: PURPLE, width: 2, dash: '4 5' });
    var dot = p.point(0.6, 0.28, { r: 8, fill: PURPLE });
    var row = M4.el('div', { class: 'm4-row' }, w);
    var r1 = readout(row), r2 = readout(row), r3 = readout(row);
    var a = 2, b = 3;
    function update() {
      var la = Math.log(a) / Math.LN10, lb = Math.log(b) / Math.LN10, e = 0.004;
      barA.set(0, 0.62, Math.max(la, e), 0.62);
      barB.set(la, 0.62, la + Math.max(lb, e), 0.62);
      labA.set(la / 2 - 0.03, 0.84, 'log a');
      labB.set(la + lb / 2 + 0.03, 0.84, 'log c');
      drop.set(la + lb, 0.62, la + lb, 0.28);
      dot.set(la + lb, 0.28);
      r1.textContent = 'log₁₀ a + log₁₀ c = ' + fx(la, 3) + ' + ' + fx(lb, 3);
      r2.textContent = 'sum = ' + fx(la + lb, 3);
      r3.textContent = 'a · c = ' + fx(a * b, 2);
    }
    var col = M4.el('div', { class: 'm4-col functions-s3-full' }, w);
    M4.slider(col, { min: 1, max: 10, step: 0.5, value: a, label: 'a', format: function (v) { return Number(v).toFixed(1); }, onInput: function (v) { a = Number(v); update(); } });
    M4.slider(col, { min: 1, max: 10, step: 0.5, value: b, label: 'c', format: function (v) { return Number(v).toFixed(1); }, onInput: function (v) { b = Number(v); update(); } });
    update();
    M4.el('div', { class: 'm4-note', text: 'The ruler is marked on a logarithmic scale: the distance from 1 to a number is its base-10 logarithm.' }, w);
  }

  /* ---------- step 7: match the laws ---------- */
  function mountLaws(el, ctx) {
    var w = wrap(el);
    var rowsEl = M4.el('div', { class: 'functions-s3-rows' }, w);
    var defs = [
      { key: 'sum', lhs: '\\log(xy)' },
      { key: 'diff', lhs: '\\log\\!\\left(\\dfrac{x}{y}\\right)' },
      { key: 'pow', lhs: '\\log(x^3)' }
    ];
    var toks = [
      { key: 'diff', tex: '\\log x - \\log y' },
      { key: 'pow', tex: '3\\log x' },
      { key: 'prod', tex: '\\log x \\cdot \\log y' },
      { key: 'sum', tex: '\\log x + \\log y' }
    ];
    var slots = [], tokens = [], filled = 0;
    defs.forEach(function (d) {
      var r = M4.el('div', { class: 'functions-s3-eq' }, rowsEl);
      M4.el('span', { class: 'functions-s3-lhs', html: M4.tex(d.lhs) }, r);
      M4.el('span', { html: M4.tex('=') }, r);
      var s = M4.el('div', { class: 'm4-slot functions-s3-slot' }, r);
      s.setAttribute('data-want', d.key);
      slots.push(s);
    });
    var tray = M4.el('div', { class: 'm4-row' }, w);
    toks.forEach(function (t) {
      var k = M4.el('div', { class: 'm4-token functions-s3-tok', html: M4.tex(t.tex) }, tray);
      k.setAttribute('data-key', t.key);
      k.setAttribute('data-tex', t.tex);
      tokens.push(k);
    });
    M4.dragDrop({
      tokens: tokens,
      slots: slots,
      onDrop: function (tok, slot) {
        if (!tok || !slot || slot.getAttribute('data-done')) { return; }
        var key = tok.getAttribute('data-key'), want = slot.getAttribute('data-want');
        if (key === want) {
          slot.setAttribute('data-done', '1');
          slot.innerHTML = M4.tex(tok.getAttribute('data-tex'));
          slot.classList.add('filled', 'functions-s3-ok', 'm4-pop');
          tok.style.visibility = 'hidden';
          tok.style.pointerEvents = 'none';
          filled++;
          if (filled === 3) {
            ctx.note('All three laws follow from the exponent rules \\(b^{u}b^{v}=b^{u+v}\\) and \\((b^{u})^{k}=b^{ku}\\).');
            ctx.solved();
          } else {
            ctx.note('Correct. ' + (3 - filled) + ' remaining.');
          }
        } else if (key === 'prod') {
          ctx.wrong('The logarithm of a product is a sum of logarithms, not a product of logarithms.');
        } else if (want === 'sum') {
          ctx.wrong('A product inside the logarithm becomes an addition outside it.');
        } else if (want === 'diff') {
          ctx.wrong('A quotient inside the logarithm becomes a subtraction outside it.');
        } else {
          ctx.wrong('A power inside the logarithm becomes a factor in front: x³ is x · x · x.');
        }
      },
      onMiss: function () { }
    });
  }

  /* ---------- step 8: linear vs log scale ---------- */
  function mountScale(el, ctx) {
    var w = wrap(el);
    var p = M4.plane(w, { xmin: -0.09, xmax: 1.09, ymin: 0, ymax: 1, width: 640, height: 300, grid: false, axes: false, labels: false });
    var vals = [1, 10, 100, 1000, 10000, 100000];
    var names = ['1', '10', '100', '1 000', '10 000', '100 000'];
    var cols = [ORANGE, BLUE, GREEN, PURPLE, C.pink || '#ef4b8b', RED];
    p.line(0, 0.12, 1, 0.12, { stroke: INK, width: 3 });
    var items = vals.map(function (v, i) {
      var ly = 0.28 + i * 0.12;
      return {
        lin: v / 100000, log: i / 5, ly: ly,
        lead: p.line(0, 0.12, 0, ly - 0.04, { stroke: cols[i], width: 2 }),
        pt: p.point(0, 0.12, { r: 8, fill: cols[i] }),
        tx: p.text(0, ly, names[i], { fill: cols[i], size: 17, weight: 700 }),
        name: names[i]
      };
    });
    var s = 0, target = 0, raf = 0;
    function draw() {
      var e = s * s * (3 - 2 * s);
      items.forEach(function (it) {
        var x = it.lin + (it.log - it.lin) * e;
        it.pt.set(x, 0.12);
        it.lead.set(x, 0.12, x, it.ly - 0.04);
        it.tx.set(x, it.ly, it.name);
      });
    }
    function tick() {
      var d = target - s;
      if (Math.abs(d) < 0.01) { s = target; draw(); raf = 0; return; }
      s += d * 0.12;
      draw();
      raf = requestAnimationFrame(tick);
    }
    var row = M4.el('div', { class: 'm4-row' }, w);
    var ro = readout(row);
    function setMode(t) {
      target = t;
      ro.textContent = t ? 'log scale: position = log₁₀ of the value' : 'linear scale: position = value';
      bLin.classList.toggle('primary', !t);
      bLog.classList.toggle('primary', !!t);
      if (!raf) { raf = requestAnimationFrame(tick); }
    }
    var bLin = M4.button(row, 'Linear scale', function () { setMode(0); }, { primary: true });
    var bLog = M4.button(row, 'Log scale', function () { setMode(1); });
    ro.textContent = 'linear scale: position = value';
    draw();
    ctx.onCleanup(function () { if (raf) { cancelAnimationFrame(raf); raf = 0; } });
  }

  /* ---------- step 9: place 1000 on a log axis ---------- */
  function mountPlace(el, ctx) {
    var w = wrap(el);
    var p = M4.plane(w, { xmin: -0.4, xmax: 4.4, ymin: -1, ymax: 1, width: 640, height: 220, grid: false, axes: false, labels: false });
    var i;
    p.line(0, 0, 4, 0, { stroke: INK, width: 3 });
    for (i = 0; i <= 4; i++) { p.line(i, -0.16, i, 0.16, { stroke: INK, width: 2 }); }
    p.text(0, -0.5, '1', { fill: INK, size: 18, weight: 700 });
    p.text(4, -0.5, '10 000', { fill: INK, size: 18, weight: 700 });
    var lab = p.text(0.5, 0.55, '?', { fill: ORANGE, size: 18, weight: 700 });
    var done = false;
    function sn(v) { return clamp(Math.round(v * 20) / 20, 0, 4); }
    var h = p.handle(0.5, 0, {
      color: ORANGE, r: 13,
      onDrag: function (x) {
        var u = sn(x);
        h.set(u, 0);
        lab.set(u, 0.55, done ? '1 000' : '?');
      },
      onEnd: function (x) {
        var u = sn(x), v = Math.pow(10, u);
        h.set(u, 0);
        if (Math.abs(u - 3) <= 0.151) {
          done = true;
          h.set(3, 0);
          lab.set(3, 0.55, '1 000');
          setFill(h, GREEN);
          ctx.note('\\(\\log_{10} 1000 = 3\\), so 1000 sits three quarters of the way from \\(10^0\\) to \\(10^4\\).');
          ctx.solved();
        } else if (!done) {
          lab.set(u, 0.55, '?');
          ctx.note('That position corresponds to about ' + (v >= 100 ? Math.round(v) : v.toFixed(1)) + '. Each tick multiplies the value by 10. The marker is too far ' + (u < 3 ? 'left' : 'right') + '.');
        }
      }
    });
    M4.el('div', { class: 'm4-note', text: 'The axis is logarithmic. Every tick mark is 10 times the previous one.' }, w);
  }

  /* ---------- step 10: underflow ---------- */
  function mountUnderflow(el, ctx) {
    var w = wrap(el);
    var grid = M4.el('div', { class: 'm4-grid2 functions-s3-full' }, w);
    var c1 = M4.el('div', { class: 'functions-s3-card' }, grid);
    M4.el('div', { class: 'functions-s3-lab', html: 'product ' + M4.tex('p = 0.1^{\\,n}') + ' in 64-bit floating point' }, c1);
    var big1 = M4.el('div', { class: 'functions-s3-big' }, c1);
    var n1 = M4.el('div', { class: 'functions-s3-lab' }, c1);
    var c2 = M4.el('div', { class: 'functions-s3-card' }, grid);
    M4.el('div', { class: 'functions-s3-lab', html: 'sum of logs ' + M4.tex('\\ln p = n\\,\\ln 0.1') }, c2);
    var big2 = M4.el('div', { class: 'functions-s3-big' }, c2);
    var track = M4.el('div', { class: 'functions-s3-track' }, c2);
    var fill = M4.el('div', { class: 'functions-s3-fill' }, track);
    function update(n) {
      var prod = 1, sum = 0, i, l = Math.log(0.1);
      for (i = 0; i < n; i++) { prod *= 0.1; sum += l; }
      big2.textContent = fx(sum, 2);
      fill.style.width = (100 * n / 400) + '%';
      if (prod === 0) {
        big1.textContent = '0';
        n1.textContent = 'underflow: the true value 10^−' + n + ' is lost';
        c1.classList.add('functions-s3-bad');
        c2.classList.add('functions-s3-good');
        ctx.note('The product has underflowed to exactly 0, while the sum of logarithms is still an ordinary number, about ' + fx(sum, 1) + '.');
        ctx.solved();
      } else {
        var parts = prod.toExponential(2).split('e');
        big1.textContent = '';
        big1.appendChild(document.createTextNode(parts[0] + ' × 10'));
        M4.el('sup', { text: String(Number(parts[1])).replace('-', '−') }, big1);
        n1.textContent = 'still representable';
        c1.classList.remove('functions-s3-bad');
        c2.classList.remove('functions-s3-good');
      }
    }
    M4.slider(w, { min: 1, max: 400, step: 1, value: 5, label: 'number of factors n', format: function (v) { return String(Math.round(v)); }, onInput: function (v) { update(Math.round(Number(v))); } });
    update(5);
  }

  M4.lesson({
    id: 'functions-s3',
    module: 'functions',
    title: 'Logarithms',
    summary: 'The logarithm inverts the exponential, turns products into sums, and is the reason machine learning works with log-probabilities.',
    minutes: 10,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>The inverse of an exponential function such as \\(2^x\\) or \\(e^x\\) is the logarithm.</p><p>In this lesson you will evaluate simple logarithms, apply the rule that turns products into sums, read a logarithmic scale, and explain why machine learning computes with logarithms of probabilities.</p>'
      },
      {
        kind: 'text',
        title: 'The logarithm as an exponent',
        html: '<p>Let \\(b\\) be a positive number other than 1, called the base, and let \\(x\\) be a positive number. The logarithm \\(\\log_b x\\) is the exponent \\(y\\) that satisfies \\(b^y = x\\).</p>\\[\\log_b x = y \\quad\\Longleftrightarrow\\quad b^y = x\\]<p>For example, \\(\\log_{10} 1000 = 3\\) because \\(10^3 = 1000\\). The logarithm with base \\(e \\approx 2.718\\) is called the natural logarithm and is written \\(\\ln x\\). Since \\(b^y\\) is always positive, the logarithm is defined only for \\(x &gt; 0\\).</p>'
      },
      {
        kind: 'explore',
        title: 'Logarithm and exponential',
        html: '<p>The exponential maps \\(x\\) to \\(e^x\\). The natural logarithm maps \\(e^x\\) back to \\(x\\). Swapping input and output swaps the two coordinates of every point, so the graph of \\(\\ln\\) is the reflection of the graph of \\(e^x\\) in the line \\(y = x\\). In particular \\(\\ln 1 = 0\\), and \\(\\ln x\\) is negative for \\(0 &lt; x &lt; 1\\).</p>',
        mount: mountMirror
      },
      {
        kind: 'exercise',
        title: 'Logarithm values',
        html: '<p>Find the value of \\(\\log_2 32\\), the exponent to which 2 must be raised to obtain 32.</p>',
        hint: 'Double repeatedly: 2, 4, 8, 16, 32. Count the factors of 2.',
        mount: function (el, ctx) {
          var w = wrap(el);
          M4.choices(w, {
            options: ['\\(4\\)', '\\(5\\)', '\\(16\\)', '\\(64\\)'],
            correct: 1,
            onCorrect: function () { ctx.note('\\(2^5 = 32\\), so \\(\\log_2 32 = 5\\).'); ctx.solved(); },
            onWrong: function (i) {
              ctx.wrong(i === 0 ? '2 raised to the power 4 is 16, not 32.' : i === 2 ? '16 is 32 divided by 2. The logarithm is an exponent, not a quotient.' : '64 is 32 times 2. The logarithm is an exponent, not a product.');
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Logarithms from a graph',
        html: '<p>The curve shows \\(y = \\log_2 x\\). Drag the point along the curve until the output equals 3, that is, until it reaches the dashed green line. The values below show the current input and output.</p>',
        hint: 'The output is 3 when \\(2^3 = x\\).',
        mount: mountFindLog
      },
      {
        kind: 'explore',
        title: 'Logarithm of a product',
        html: '<p>Write two positive numbers as powers of the base: \\(a = b^{u}\\) and \\(c = b^{v}\\), so that \\(u = \\log_b a\\) and \\(v = \\log_b c\\). Multiplying gives \\(ac = b^{u+v}\\), which says</p>\\[\\log_b(ac) = \\log_b a + \\log_b c.\\]<p>Below, two bars whose lengths are the base-10 logarithms of \\(a\\) and \\(c\\) are placed end to end on a logarithmic ruler. Their combined length always ends at the product \\(a \\cdot c\\).</p>',
        mount: mountSlideRule
      },
      {
        kind: 'exercise',
        title: 'Three laws of logarithms',
        html: '<p>The product rule has two companions: a quotient becomes a difference, and a power becomes a multiplying factor. Drag the matching right-hand side into each slot. One tile does not belong anywhere. The laws hold for every base, so the base is omitted.</p>',
        hint: 'Write \\(x^3 = x \\cdot x \\cdot x\\) and apply the product rule twice. For the quotient, use \\(\\log(x/y) + \\log y = \\log x\\).',
        mount: mountLaws
      },
      {
        kind: 'explore',
        title: 'The logarithmic scale',
        html: '<p>On a linear scale, the position of a point is its value. Quantities that span several orders of magnitude are then unreadable: the small values collapse onto one spot. On a logarithmic scale, the position is the logarithm of the value, so equal distances correspond to equal ratios. Switch between the two scales for the values \\(1, 10, \\dots, 100\\,000\\).</p>',
        mount: mountScale
      },
      {
        kind: 'exercise',
        title: 'Values on a log axis',
        html: '<p>The axis below is logarithmic and runs from 1 to 10 000. Drag the orange marker to the position of the value 1000.</p>',
        hint: 'The end points are \\(10^0\\) and \\(10^4\\). Write 1000 as a power of 10 and count ticks.',
        mount: mountPlace
      },
      {
        kind: 'exercise',
        title: 'Log-probabilities',
        html: '<p>A model that assigns a probability to each of \\(n\\) independent observations assigns their product to the whole data set. Each factor lies between 0 and 1, so the product shrinks rapidly. A computer stores numbers with finite precision and rounds anything below roughly \\(5 \\times 10^{-324}\\) to zero. Taking the logarithm replaces the product by a sum, \\(\\ln(p_1 p_2 \\cdots p_n) = \\ln p_1 + \\dots + \\ln p_n\\), which stays in a comfortable range. Because \\(\\ln\\) is increasing, the parameters that maximise the sum also maximise the product. Here every factor is 0.1. Increase \\(n\\) until the stored product becomes exactly 0.</p>',
        hint: 'The product is \\(10^{-n}\\). It is lost once \\(n\\) exceeds roughly 323.',
        mount: mountUnderflow
      },
      {
        kind: 'exercise',
        title: 'Logarithm laws practice',
        html: '<p>Use only the two values \\(\\ln 2 \\approx 0.693\\) and \\(\\ln 3 \\approx 1.099\\) to compute \\(\\ln 72\\). Give the answer to two decimal places.</p>',
        hint: 'Factorise: \\(72 = 8 \\cdot 9 = 2^3 \\cdot 3^2\\). Then use the product rule and the power rule.',
        mount: function (el, ctx) {
          var w = wrap(el);
          M4.numberInput(w, {
            answer: 4.277, tolerance: 0.012, placeholder: '0.00', label: 'ln 72 ≈',
            onCorrect: function () {
              ctx.note('\\(\\ln 72 = \\ln(2^3 \\cdot 3^2) = 3\\ln 2 + 2\\ln 3 \\approx 2.079 + 2.198 = 4.277\\).');
              ctx.solved();
            },
            onWrong: function (v) {
              var x = Number(v);
              if (Math.abs(x - 1.792) < 0.02) { ctx.wrong('That is ln 2 + ln 3 = ln 6. The exponents in the factorisation of 72 are missing.'); }
              else if (Math.abs(x - 0.693 * 1.099) < 0.02) { ctx.wrong('The logarithms are added, not multiplied.'); }
              else if (Math.abs(x - 4.683) < 0.02) { ctx.wrong('Check the exponents: 72 = 2³ · 3², so the weights are 3 and 2.'); }
              else { ctx.wrong('Factorise 72 into powers of 2 and 3, then turn the product into a sum.'); }
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>The logarithm is the inverse of the exponential: \\(\\log_b x = y\\) means \\(b^y = x\\), and \\(\\ln\\) is the logarithm with base \\(e\\).</li><li>Logarithms turn multiplication into addition: \\(\\log(xy) = \\log x + \\log y\\), \\(\\log(x/y) = \\log x - \\log y\\) and \\(\\log(x^k) = k \\log x\\). On a logarithmic scale, equal distances are equal ratios.</li><li>Machine learning sums log-probabilities instead of multiplying probabilities. The sum is numerically stable and has the same maximiser as the product. The next session treats sums, products and the argmax in detail.</li></ul>'
      }
    ]
  });
})();
