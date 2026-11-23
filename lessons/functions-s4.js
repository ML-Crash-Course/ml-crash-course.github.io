(function () {
  'use strict';

  var M4 = window.M4;
  var C = M4.colors || {};
  var ORANGE = C.orange || '#ff8a1f';
  var BLUE = C.blue || '#2f6bff';
  var GREEN = C.green || '#16b56b';
  var PURPLE = C.purple || '#7a5cff';
  var INK = C.ink || '#1d1d1f';
  var MUTED = C.muted || '#6b6f76';
  var LINE = C.line || '#e6e4dd';
  var FAINT = '#d9d6cc';
  var SUB = ['\u2080', '\u2081', '\u2082', '\u2083', '\u2084', '\u2085', '\u2086', '\u2087', '\u2088', '\u2089'];

  function injectStyle() {
    if (document.getElementById('functions-s4-style')) return;
    var s = document.createElement('style');
    s.id = 'functions-s4-style';
    s.textContent = [
      '.functions-s4-chart{background:#fff;border:2px solid ' + LINE + ';border-radius:18px;padding:8px;margin:8px 0 14px}',
      '.functions-s4-svg{width:100%;height:auto;display:block;user-select:none;-webkit-user-select:none}',
      '.functions-s4-grab{cursor:ns-resize;touch-action:none}',
      '.functions-s4-formula{min-height:74px;display:flex;align-items:center;justify-content:center;font-size:20px;text-align:center;margin:4px 0 10px;overflow-x:auto}',
      '.functions-s4-controls{display:flex;flex-direction:column;gap:10px;margin:8px 0}',
      '.functions-s4-build{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;background:#fff;border:2px solid ' + LINE + ';border-radius:18px;padding:22px 14px;margin:8px 0 16px}',
      '.functions-s4-sigcol{display:flex;flex-direction:column;align-items:center;gap:4px}',
      '.functions-s4-sigma{font-size:84px;line-height:0.95;color:' + ORANGE + ';font-family:KaTeX_Size2,KaTeX_Main,"Times New Roman",serif}',
      '.functions-s4-slot{min-width:92px;min-height:54px;display:flex;align-items:center;justify-content:center;box-sizing:border-box}',
      '.functions-s4-rhs{font-size:22px}',
      '.functions-s4-tray{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;min-height:60px;margin:6px 0 10px}',
      '.functions-s4-token{min-width:64px;min-height:46px;display:inline-flex;align-items:center;justify-content:center;padding:4px 14px;font-size:20px;box-sizing:border-box;touch-action:none}',
      '.functions-s4-ok{background:' + GREEN + ' !important;color:#fff !important;border-color:' + GREEN + ' !important}',
      '.functions-s4-barrow{display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center;margin:14px 0}',
      '.functions-s4-barlabel{font-size:16px;font-weight:600;color:' + INK + '}',
      '.functions-s4-track{height:30px;border-radius:15px;background:#f1efe8;overflow:hidden}',
      '.functions-s4-fill{height:100%;border-radius:15px;min-width:2px;transition:width .12s linear}',
      '.functions-s4-panel{background:#fff;border:2px solid ' + LINE + ';border-radius:18px;padding:14px 18px;margin:8px 0 14px}',
      '@media (max-width:520px){.functions-s4-barrow{grid-template-columns:1fr}.functions-s4-sigma{font-size:64px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function fmt(v) {
    var r = Math.round(v * 100) / 100;
    return String(r);
  }

  function sum(a) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i];
    return s;
  }

  function argmax(a) {
    var best = 0, count = 1;
    for (var i = 1; i < a.length; i++) {
      if (a[i] > a[best] + 1e-9) { best = i; count = 1; }
      else if (Math.abs(a[i] - a[best]) <= 1e-9) count++;
    }
    return { index: best, value: a[best], unique: count === 1 };
  }

  function svgText(parent, x, y, str, attrs) {
    var a = { x: x, y: y, 'text-anchor': 'middle', 'font-size': 17, fill: INK, 'font-family': 'Inter, system-ui, sans-serif' };
    if (attrs) for (var k in attrs) a[k] = attrs[k];
    var t = M4.svg('text', a, parent);
    t.textContent = str;
    return t;
  }

  function readout(parent, text) {
    return M4.el('span', { class: 'm4-readout', text: text }, parent);
  }

  // Generic bar chart with optionally draggable bars.
  function barChart(parent, o) {
    var W = 640, H = 392, pL = 46, pR = 104, pT = 46, pB = 58;
    var vals = o.values.slice();
    var n = vals.length;
    var ymax = o.ymax;
    var tick = o.tick || 2;
    var snap = o.snap || 1;
    var plotH = H - pT - pB;
    var slotW = (W - pL - pR) / n;
    var barW = Math.min(66, slotW * 0.62);
    var baseY = H - pB;
    function Y(v) { return baseY - (v / ymax) * plotH; }
    function X(i) { return pL + slotW * (i + 0.5); }
    function canDrag(i) {
      if (typeof o.draggable === 'function') return !!o.draggable(i);
      return !!o.draggable;
    }

    var wrap = M4.el('div', { class: 'functions-s4-chart' }, parent);
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'functions-s4-svg' }, wrap);
    var t;
    for (t = 0; t <= ymax + 1e-9; t += tick) {
      M4.svg('line', { x1: pL, x2: W - pR, y1: Y(t), y2: Y(t), stroke: t === 0 ? INK : LINE, 'stroke-width': t === 0 ? 2 : 1 }, svg);
      svgText(svg, pL - 10, Y(t) + 5, fmt(t), { 'text-anchor': 'end', 'font-size': 15, fill: MUTED });
    }
    var gBars = M4.svg('g', {}, svg);
    var gLines = M4.svg('g', {}, svg);
    var gTop = M4.svg('g', {}, svg);
    var bars = [];
    var locked = false;

    function makeBar(i) {
      var rect = M4.svg('rect', { x: X(i) - barW / 2, width: barW, rx: 8, ry: 8, fill: ORANGE }, gBars);
      var val = svgText(gTop, X(i), 0, '', { 'font-weight': 700, 'font-size': 17 });
      var lab = svgText(svg, X(i), baseY + 26, o.labels ? o.labels[i] : 'x' + SUB[i + 1], { 'font-size': 18, fill: INK });
      var mark = svgText(svg, X(i), baseY + 48, '', { 'font-size': 15, 'font-weight': 700, fill: PURPLE });
      var handle = null;
      if (canDrag(i)) {
        handle = M4.svg('circle', { cx: X(i), r: 13, fill: '#fff', stroke: ORANGE, 'stroke-width': 4, class: 'functions-s4-grab' }, gTop);
        rect.setAttribute('class', 'functions-s4-grab');
        var start = 0;
        var cfg = {
          onStart: function () { start = vals[i]; },
          onMove: function (dx, dy) {
            if (locked) return;
            var r = svg.getBoundingClientRect();
            var scale = r.height > 0 ? H / r.height : 1;
            var v = start - (dy * scale / plotH) * ymax;
            v = Math.round(v / snap) * snap;
            v = Math.max(o.ymin || 0, Math.min(ymax, v));
            if (v !== vals[i]) {
              vals[i] = v;
              redraw();
              if (o.onChange) o.onChange(vals.slice());
            }
          },
          onEnd: function () {
            if (locked) return;
            if (o.onEnd) o.onEnd(vals.slice());
          }
        };
        M4.drag(rect, cfg);
        M4.drag(handle, cfg);
      }
      bars.push({ rect: rect, val: val, lab: lab, mark: mark, handle: handle });
    }
    for (var i = 0; i < n; i++) makeBar(i);

    function redraw() {
      for (var i = 0; i < n; i++) {
        var b = bars[i];
        var st = (o.style ? o.style(i, vals) : null) || {};
        var fill = st.fill || ORANGE;
        var h = Math.max(2, baseY - Y(vals[i]));
        b.rect.setAttribute('y', baseY - h);
        b.rect.setAttribute('height', h);
        b.rect.setAttribute('fill', fill);
        b.rect.setAttribute('opacity', st.opacity == null ? 1 : st.opacity);
        b.val.textContent = fmt(vals[i]);
        b.val.setAttribute('y', baseY - h - (b.handle ? 22 : 10));
        b.lab.setAttribute('font-weight', st.bold ? 800 : 500);
        b.lab.setAttribute('fill', st.bold ? (st.labelFill || INK) : INK);
        b.mark.textContent = st.mark || '';
        if (b.handle) {
          b.handle.setAttribute('cy', baseY - h);
          b.handle.setAttribute('stroke', fill);
        }
      }
    }

    function hline(color, opt) {
      opt = opt || {};
      var ln = M4.svg('line', { x1: pL, x2: W - pR, stroke: color, 'stroke-width': opt.width || 3, 'stroke-dasharray': opt.dash || '', opacity: opt.opacity == null ? 1 : opt.opacity, 'stroke-linecap': 'round' }, gLines);
      var tx = svgText(svg, W - pR + 8, 0, '', { 'text-anchor': 'start', 'font-size': 15, 'font-weight': 700, fill: color });
      return {
        set: function (v, label) {
          ln.setAttribute('y1', Y(v)); ln.setAttribute('y2', Y(v));
          tx.setAttribute('y', Y(v) + (opt.labelDy == null ? 5 : opt.labelDy));
          tx.textContent = label || '';
        }
      };
    }

    redraw();
    return {
      svg: svg,
      values: function () { return vals.slice(); },
      redraw: redraw,
      hline: hline,
      lock: function () { locked = true; }
    };
  }

  // ---------- Sigma widget (explore and exercise) ----------
  function sigmaWidget(el, ctx, target) {
    injectStyle();
    el.textContent = '';
    var x = [3, 1, 4, 1, 5, 9, 2, 6];
    var m = target ? 1 : 2, n = target ? 2 : 5;
    var done = false;
    var formula = M4.el('div', { class: 'functions-s4-formula' }, el);
    var chart = barChart(el, {
      values: x, ymax: 10, tick: 2, draggable: false,
      style: function (i) {
        var inside = i + 1 >= m && i + 1 <= n;
        return { fill: inside ? (done ? GREEN : ORANGE) : FAINT, bold: inside, labelFill: done ? GREEN : ORANGE };
      }
    });
    var row = M4.el('div', { class: 'm4-row' }, el);
    var rSum = readout(row, '');
    var rTarget = target ? readout(row, 'target = ' + target) : null;
    var controls = M4.el('div', { class: 'functions-s4-controls' }, el);

    function update() {
      chart.redraw();
      var terms = x.slice(m - 1, n);
      var s = m <= n ? sum(terms) : 0;
      var head = '\\sum_{i=' + m + '}^{' + n + '} x_i';
      var body;
      if (m > n) body = head + ' = 0 \\quad \\text{(empty sum)}';
      else if (terms.length === 1) body = head + ' = ' + s;
      else body = head + ' = ' + terms.join(' + ') + ' = ' + s;
      formula.innerHTML = M4.tex(body, true);
      rSum.textContent = 'sum = ' + s;
      if (target && !done) {
        if (m <= n && s === target) {
          done = true;
          chart.redraw();
          rSum.classList.add('functions-s4-ok');
          ctx.note('The terms \\(x_' + m + '\\) to \\(x_' + n + '\\) add up to ' + target + '.');
          ctx.solved();
        } else if (m > n) {
          ctx.note('The lower limit exceeds the upper limit, so no terms are included.');
        } else {
          ctx.note('The current sum is ' + s + ', which is ' + Math.abs(target - s) + (s < target ? ' below' : ' above') + ' the target.');
        }
      }
    }

    M4.slider(controls, {
      min: 1, max: 8, step: 1, value: m, label: 'lower limit m',
      onInput: function (v) { m = Math.round(Number(v)); update(); }
    });
    M4.slider(controls, {
      min: 1, max: 8, step: 1, value: n, label: 'upper limit n',
      onInput: function (v) { n = Math.round(Number(v)); update(); }
    });
    update();
  }

  // ---------- Token exercise ----------
  function mountTokens(el, ctx) {
    injectStyle();
    el.textContent = '';
    var done = false;
    var build = M4.el('div', { class: 'functions-s4-build' }, el);
    var col = M4.el('div', { class: 'functions-s4-sigcol' }, build);
    var sUpper = M4.el('div', { class: 'm4-slot functions-s4-slot' }, col);
    M4.el('div', { class: 'functions-s4-sigma', text: '\u2211' }, col);
    var sLower = M4.el('div', { class: 'm4-slot functions-s4-slot' }, col);
    var sBody = M4.el('div', { class: 'm4-slot functions-s4-slot' }, build);
    M4.el('div', { class: 'functions-s4-rhs', html: M4.tex('=\\; 2^2 + 3^2 + 4^2 + 5^2') }, build);
    sUpper.dataset.role = 'upper'; sLower.dataset.role = 'lower'; sBody.dataset.role = 'body';
    var slots = [sUpper, sLower, sBody];

    var tray = M4.el('div', { class: 'functions-s4-tray' }, el);
    var defs = [
      { v: 'i=1', tex: 'i = 1', kind: 'lower' },
      { v: '5', tex: '5', kind: 'upper' },
      { v: '2i', tex: '2i', kind: 'body' },
      { v: 'i=2', tex: 'i = 2', kind: 'lower' },
      { v: '4', tex: '4', kind: 'upper' },
      { v: 'i^2', tex: 'i^2', kind: 'body' }
    ];
    var tokens = defs.map(function (d) {
      var tk = M4.el('div', { class: 'm4-token functions-s4-token', html: M4.tex(d.tex) }, tray);
      tk.dataset.v = d.v; tk.dataset.kind = d.kind;
      return tk;
    });

    function tokenIn(slot) { return slot.querySelector('.m4-token'); }
    function refresh() {
      slots.forEach(function (s) {
        if (tokenIn(s)) s.classList.add('filled'); else s.classList.remove('filled');
      });
    }
    function check() {
      var u = tokenIn(sUpper), l = tokenIn(sLower), b = tokenIn(sBody);
      if (!u || !l || !b) {
        ctx.note('Fill all three positions: above the sigma, below it, and to its right.');
        return;
      }
      if (u.dataset.kind !== 'upper' || l.dataset.kind !== 'lower' || b.dataset.kind !== 'body') {
        ctx.wrong('The position below the sigma names the index and its first value, the position above holds the last value, and the term to be added stands to the right.');
        return;
      }
      if (b.dataset.v !== 'i^2') { ctx.wrong('With the summand 2i the terms would be multiples of 2, such as 4 + 6 + 8. Each term here is a square.'); return; }
      if (l.dataset.v !== 'i=2') { ctx.wrong('Starting at i = 1 would add the extra term 1\u00b2 = 1. The first term is 2\u00b2.'); return; }
      if (u.dataset.v !== '5') { ctx.wrong('Stopping at 4 would omit the last term. The last term is 5\u00b2.'); return; }
      done = true;
      slots.forEach(function (s) { s.classList.add('functions-s4-ok'); });
      ctx.note('\\(\\sum_{i=2}^{5} i^2 = 4 + 9 + 16 + 25 = 54\\).');
      ctx.solved();
    }

    M4.dragDrop({
      tokens: tokens,
      slots: slots,
      onDrop: function (tk, slot) {
        if (done) return;
        var prev = tokenIn(slot);
        if (prev && prev !== tk) tray.appendChild(prev);
        slot.appendChild(tk);
        refresh();
        check();
      },
      onMiss: function (tk) {
        if (done) return;
        tray.appendChild(tk);
        refresh();
      }
    });
    M4.el('div', { class: 'm4-note', text: 'Drag a tile onto a dashed position. Dropping a tile elsewhere returns it to the tray.' }, el);
  }

  // ---------- Mean explore ----------
  function mountMeanExplore(el) {
    injectStyle();
    el.textContent = '';
    var line, rS, rM;
    var chart = barChart(el, {
      values: [2, 7, 4, 8, 4], ymax: 10, tick: 2, snap: 0.5, draggable: true,
      style: function () { return { fill: ORANGE }; },
      onChange: function (v) { upd(v); }
    });
    line = chart.hline(BLUE, { dash: '8 7' });
    var row = M4.el('div', { class: 'm4-row' }, el);
    rS = readout(row, '');
    readout(row, 'n = 5');
    rM = readout(row, '');
    function upd(v) {
      var s = sum(v), mu = s / v.length;
      line.set(mu, 'mean ' + fmt(mu));
      rS.textContent = 'sum = ' + fmt(s);
      rM.textContent = 'mean = ' + fmt(s) + ' / 5 = ' + fmt(mu);
    }
    upd(chart.values());
    M4.el('div', { class: 'm4-note', text: 'Drag the top of any bar. The dashed line marks the mean.' }, el);
  }

  // ---------- Mean exercise ----------
  function mountMeanExercise(el, ctx) {
    injectStyle();
    el.textContent = '';
    var done = false;
    var TARGET = 4;
    var chart = barChart(el, {
      values: [1, 5, 2, 3, 6], ymax: 10, tick: 2, snap: 0.5,
      draggable: function (i) { return i === 3; },
      style: function (i) { return i === 3 ? { fill: done ? GREEN : ORANGE, bold: true, labelFill: done ? GREEN : ORANGE } : { fill: '#c9d6f5' }; },
      onChange: function (v) { upd(v); },
      onEnd: function (v) {
        if (done) return;
        var mu = sum(v) / 5;
        if (Math.abs(mu - TARGET) < 1e-9) {
          done = true;
          chart.lock();
          chart.redraw();
          rM.classList.add('functions-s4-ok');
          ctx.note('The sum is \\(1 + 5 + 2 + 6 + 6 = 20\\), and \\(20 / 5 = 4\\).');
          ctx.solved();
        } else {
          ctx.note('The mean is ' + fmt(mu) + ', which is ' + (mu < TARGET ? 'below' : 'above') + ' the target 4. The sum is ' + fmt(sum(v)) + '; a mean of 4 over five values requires a sum of 20.');
        }
      }
    });
    var ghost = chart.hline(GREEN, { dash: '3 8', opacity: 0.55, labelDy: 20 });
    ghost.set(TARGET, 'target 4');
    var line = chart.hline(BLUE, { dash: '8 7', labelDy: -6 });
    var row = M4.el('div', { class: 'm4-row' }, el);
    var rS = readout(row, '');
    var rM = readout(row, '');
    function upd(v) {
      var s = sum(v), mu = s / 5;
      line.set(mu, 'mean ' + fmt(mu));
      rS.textContent = 'sum = ' + fmt(s);
      rM.textContent = 'mean = ' + fmt(mu);
    }
    upd(chart.values());
  }

  // ---------- Product exercise ----------
  function mountProduct(el, ctx) {
    injectStyle();
    el.textContent = '';
    M4.el('div', { class: 'functions-s4-formula', html: M4.tex('\\prod_{k=1}^{3} (k + 1) = \\;?', true) }, el);
    var row = M4.el('div', { class: 'm4-row' }, el);
    M4.numberInput(row, {
      answer: 24, tolerance: 0.001, placeholder: 'value', label: 'Product',
      onCorrect: function () {
        ctx.note('\\(\\prod_{k=1}^{3}(k+1) = 2 \\cdot 3 \\cdot 4 = 24\\).');
        ctx.solved();
      },
      onWrong: function (v) {
        var x = Number(v);
        if (x === 9) ctx.wrong('9 is the sum 2 + 3 + 4. The symbol \u03a0 multiplies the factors.');
        else if (x === 6) ctx.wrong('6 is 1 \u00b7 2 \u00b7 3. Each factor is k + 1, not k.');
        else ctx.wrong('Write out the three factors for k = 1, 2, 3 and multiply them.');
      }
    });
  }

  // ---------- Likelihood explore ----------
  function mountLikelihood(el) {
    injectStyle();
    el.textContent = '';
    var n = 20, p = 0.8;
    var MAXLOG = 200 * Math.log(2);
    var panel = M4.el('div', { class: 'functions-s4-panel' }, el);
    var r1 = M4.el('div', { class: 'functions-s4-barrow' }, panel);
    M4.el('div', { class: 'functions-s4-barlabel', html: 'product ' + M4.tex('\\prod_i p_i') }, r1);
    var f1 = M4.el('div', { class: 'functions-s4-fill', style: 'background:' + ORANGE }, M4.el('div', { class: 'functions-s4-track' }, r1));
    var r2 = M4.el('div', { class: 'functions-s4-barrow' }, panel);
    M4.el('div', { class: 'functions-s4-barlabel', html: 'size of ' + M4.tex('\\sum_i \\ln p_i') }, r2);
    var f2 = M4.el('div', { class: 'functions-s4-fill', style: 'background:' + PURPLE }, M4.el('div', { class: 'functions-s4-track' }, r2));
    var row = M4.el('div', { class: 'm4-row' }, el);
    var rp = M4.el('span', { class: 'm4-readout' }, row);
    var rl = M4.el('span', { class: 'm4-readout' }, row);
    var controls = M4.el('div', { class: 'functions-s4-controls' }, el);

    function sci(v) {
      if (v >= 0.001) return v.toFixed(4);
      var e = Math.floor(Math.log(v) / Math.LN10);
      var mant = v / Math.pow(10, e);
      if (mant >= 9.995) { mant = 1; e += 1; }
      return mant.toFixed(2) + ' \\times 10^{' + e + '}';
    }
    function upd() {
      var prod = Math.pow(p, n);
      var ls = n * Math.log(p);
      f1.style.width = (prod * 100) + '%';
      f2.style.width = Math.min(100, (-ls / MAXLOG) * 100) + '%';
      rp.innerHTML = M4.tex('\\prod_{i=1}^{' + n + '} p_i = ' + sci(prod));
      rl.innerHTML = M4.tex('\\sum_{i=1}^{' + n + '} \\ln p_i = ' + ls.toFixed(2));
    }
    M4.slider(controls, {
      min: 1, max: 200, step: 1, value: n, label: 'number of examples n',
      onInput: function (v) { n = Math.round(Number(v)); upd(); }
    });
    M4.slider(controls, {
      min: 0.5, max: 0.99, step: 0.01, value: p, label: 'chance p of each',
      format: function (v) { return Number(v).toFixed(2); },
      onInput: function (v) { p = Number(v); upd(); }
    });
    upd();
  }

  // ---------- Max / argmax explore ----------
  function mountArgmaxExplore(el) {
    injectStyle();
    el.textContent = '';
    var line, rMax, rArg, note;
    var chart = barChart(el, {
      values: [3, 6, 2, 8, 5], ymax: 10, tick: 2, snap: 0.5, draggable: true,
      style: function (i, v) {
        var a = argmax(v);
        return i === a.index ? { fill: ORANGE, bold: true, labelFill: PURPLE, mark: 'argmax' } : { fill: '#ffd9b3' };
      },
      onChange: function (v) { upd(v); }
    });
    line = chart.hline(BLUE, { dash: '8 7' });
    var row = M4.el('div', { class: 'm4-row' }, el);
    rMax = readout(row, '');
    rArg = readout(row, '');
    note = M4.el('div', { class: 'm4-note' }, el);
    function upd(v) {
      var a = argmax(v);
      line.set(a.value, 'max ' + fmt(a.value));
      rMax.textContent = 'max = ' + fmt(a.value) + '  (a height)';
      rArg.textContent = 'argmax = ' + (a.index + 1) + '  (a position)';
      note.textContent = a.unique
        ? 'Drag the bars. The dashed line reads off the maximum. The marker under the axis reads off the argmax.'
        : 'Several bars share the largest value. The argmax is then not unique. By convention the smallest such index is reported.';
    }
    upd(chart.values());
  }

  // ---------- Classifier choice exercise ----------
  function mountClassifier(el, ctx) {
    injectStyle();
    el.textContent = '';
    barChart(el, {
      values: [1.2, 3.4, 0.5], ymax: 4, tick: 1, draggable: false,
      labels: ['i = 1  cat', 'i = 2  dog', 'i = 3  bird'],
      style: function () { return { fill: ORANGE }; }
    });
    M4.choices(el, {
      options: [
        '\\(\\max_i z_i = 2\\) and \\(\\arg\\max_i z_i = 3.4\\)',
        '\\(\\max_i z_i = 3.4\\) and \\(\\arg\\max_i z_i = 2\\)',
        '\\(\\max_i z_i = 3.4\\) and \\(\\arg\\max_i z_i = 3.4\\)',
        '\\(\\max_i z_i = 3\\) and \\(\\arg\\max_i z_i = 2\\)'
      ],
      correct: 1,
      onCorrect: function () {
        ctx.note('The largest score is 3.4 and it sits at index 2, so the predicted class is dog.');
        ctx.solved();
      },
      onWrong: function (i) {
        if (i === 0) ctx.wrong('The two answers are swapped: max is a score, argmax is an index.');
        else if (i === 2) ctx.wrong('The argmax is an index from 1, 2, 3, not a score.');
        else ctx.wrong('The max is one of the listed scores; 3 is not among them.');
      }
    });
  }

  // ---------- Final build exercise ----------
  function mountFinal(el, ctx) {
    injectStyle();
    el.textContent = '';
    var done = false;
    var row = M4.el('div', { class: 'm4-row' }, el);
    var cA = M4.el('span', { class: 'm4-chip', text: 'argmax = 2' }, row);
    var cM = M4.el('span', { class: 'm4-chip', text: 'max = 9' }, row);
    var cU = M4.el('span', { class: 'm4-chip', text: 'mean = 5' }, row);
    function state(v) {
      var a = argmax(v);
      var mu = sum(v) / v.length;
      return {
        a: a, mu: mu,
        okA: a.unique && a.index === 1,
        okM: Math.abs(a.value - 9) < 1e-9,
        okU: Math.abs(mu - 5) < 1e-9
      };
    }
    var chart = barChart(el, {
      values: [5, 5, 5, 5, 5], ymax: 10, tick: 2, snap: 1, draggable: true,
      style: function (i, v) {
        var a = argmax(v);
        if (done) return { fill: GREEN, bold: i === 1, labelFill: GREEN, mark: i === 1 ? 'argmax' : '' };
        return (a.unique && i === a.index) ? { fill: ORANGE, bold: true, labelFill: PURPLE, mark: 'argmax' } : { fill: '#ffd9b3' };
      },
      onChange: function (v) { upd(v); },
      onEnd: function (v) {
        if (done) return;
        var s = state(v);
        if (s.okA && s.okM && s.okU) {
          done = true;
          chart.lock();
          chart.redraw();
          ctx.note('All three conditions hold: the largest value 9 sits at index 2 and the five values sum to 25.');
          ctx.solved();
          return;
        }
        var msg = [];
        if (!s.a.unique) msg.push('Several bars share the largest value, so the argmax is not unique.');
        else if (!s.okA) msg.push('The largest value is at index ' + (s.a.index + 1) + ', not 2.');
        if (!s.okM) msg.push('The maximum is ' + fmt(s.a.value) + ', not 9.');
        if (!s.okU) msg.push('The sum is ' + fmt(sum(v)) + '; a mean of 5 requires a sum of 25.');
        ctx.note(msg.join(' '));
      }
    });
    var lMax = chart.hline(BLUE, { dash: '8 7', labelDy: -6 });
    var lMean = chart.hline(PURPLE, { dash: '3 7', labelDy: 20 });
    var row2 = M4.el('div', { class: 'm4-row' }, el);
    var rS = readout(row2, '');
    var rM = readout(row2, '');
    function setChip(c, ok) { if (ok) c.classList.add('functions-s4-ok'); else c.classList.remove('functions-s4-ok'); }
    function upd(v) {
      var s = state(v);
      lMax.set(s.a.value, 'max ' + fmt(s.a.value));
      lMean.set(s.mu, 'mean ' + fmt(s.mu));
      rS.textContent = 'sum = ' + fmt(sum(v));
      rM.textContent = 'mean = ' + fmt(s.mu);
      setChip(cA, s.okA); setChip(cM, s.okM); setChip(cU, s.okU);
    }
    upd(chart.values());
  }

  M4.lesson({
    id: 'functions-s4',
    module: 'functions',
    title: 'Sums, products and argmax',
    summary: 'Sums and products of many terms are written with Σ and Π. The mean is a scaled sum, and the largest value of a function is different from the position where it occurs.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Notation for long expressions',
        html: '<p>Formulas in machine learning routinely combine thousands of numbers, so they are written with symbols that describe a whole pattern of terms at once.</p><p>The goals are to read and write sums with \\(\\Sigma\\) and products with \\(\\Pi\\), express the mean as a sum, and distinguish \\(\\max\\) from \\(\\arg\\max\\).</p>' +
          '<p>Throughout, \\(x_1, x_2, \\dots, x_n\\) denotes a list of \\(n\\) numbers. The small number attached to \\(x\\) is called the <em>index</em>. It states the position in the list.</p>'
      },
      {
        kind: 'explore',
        title: 'Sigma notation',
        html: '<p>The expression \\[\\sum_{i=m}^{n} x_i = x_m + x_{m+1} + \\dots + x_n\\] is read as follows: the index \\(i\\) starts at the lower limit \\(m\\), increases in steps of one up to the upper limit \\(n\\), and the term \\(x_i\\) is added for every value of \\(i\\). The letter \\(i\\) is only a counter. Replacing it by \\(j\\) or \\(k\\) everywhere does not change the value.</p>' +
          '<p>The list below is \\(x = (3, 1, 4, 1, 5, 9, 2, 6)\\). Move the two limits and observe which terms are included.</p>',
        mount: function (el, ctx) { sigmaWidget(el, ctx, 0); }
      },
      {
        kind: 'exercise',
        title: 'Limits of a sum',
        html: '<p>For the same list \\(x = (3, 1, 4, 1, 5, 9, 2, 6)\\), set the lower limit \\(m\\) and the upper limit \\(n\\) such that \\[\\sum_{i=m}^{n} x_i = 19.\\]</p>',
        hint: 'The largest value 9 must be included, since the terms before it only add up to 14. Then look for neighbours of 9 that contribute the remaining 10.',
        mount: function (el, ctx) { sigmaWidget(el, ctx, 19); }
      },
      {
        kind: 'exercise',
        title: 'Sums in sigma notation',
        html: '<p>The term after the sigma, called the <em>summand</em>, may be any expression in the index, not only a list entry. Assemble the sigma expression that equals \\(2^2 + 3^2 + 4^2 + 5^2\\) by dragging three tiles into the three positions.</p>',
        hint: 'Every term is a square of the index. Read off the first and the last base: they are the start and the end value of the index.',
        mount: mountTokens
      },
      {
        kind: 'explore',
        title: 'The mean as a sum',
        html: '<p>The arithmetic mean of \\(n\\) numbers is their sum divided by their count: \\[\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i.\\] The symbol \\(\\bar{x}\\) is read "x bar". Geometrically, the mean is the common height all bars would have if the total were redistributed evenly.</p>' +
          '<p>Raising one bar by 1 raises the sum by 1 and the mean by \\(1/n\\).</p>',
        mount: mountMeanExplore
      },
      {
        kind: 'exercise',
        title: 'A mean of given value',
        html: '<p>Four of the five values are fixed: \\(x_1 = 1\\), \\(x_2 = 5\\), \\(x_3 = 2\\), \\(x_5 = 6\\). Drag the bar of \\(x_4\\) so that the mean \\(\\bar{x} = \\frac{1}{5}\\sum_{i=1}^{5} x_i\\) equals 4, then release it.</p>',
        hint: 'A mean of 4 over five values requires a sum of \\(5 \\cdot 4 = 20\\). The four fixed values sum to 14.',
        mount: mountMeanExercise
      },
      {
        kind: 'exercise',
        title: 'Products with the capital pi',
        html: '<p>The capital Greek letter \\(\\Pi\\) works like \\(\\Sigma\\), with multiplication in place of addition: \\[\\prod_{i=m}^{n} x_i = x_m \\cdot x_{m+1} \\cdots x_n.\\] For example, \\(\\prod_{i=1}^{4} i = 1 \\cdot 2 \\cdot 3 \\cdot 4 = 24\\).</p>' +
          '<p>Evaluate the product below, in which the index is called \\(k\\) and each factor is \\(k + 1\\).</p>',
        hint: 'Substitute \\(k = 1, 2, 3\\) into \\(k + 1\\) to obtain the three factors, then multiply them.',
        mount: mountProduct
      },
      {
        kind: 'explore',
        title: 'A product becomes a sum',
        html: '<p>Suppose a program answers \\(n\\) questions and gets question \\(i\\) right with chance \\(p_i\\). The chance of getting all of them right is the product \\(\\prod_{i=1}^{n} p_i\\) (the probability module explains when this holds). Because the logarithm of a product is the sum of the logarithms, \\[\\ln \\prod_{i=1}^{n} p_i = \\sum_{i=1}^{n} \\ln p_i,\\] and the sum on the right is much easier to compute with.</p>' +
          '<p>For simplicity every \\(p_i\\) below has the same value \\(p\\). The product shrinks towards zero very quickly, whereas the sum of logarithms grows only in proportion to \\(n\\).</p>',
        mount: mountLikelihood
      },
      {
        kind: 'explore',
        title: 'Max and argmax',
        html: '<p>Two different questions can be asked about the largest entry of a list. The <em>maximum</em> \\(\\max_i x_i\\) is the largest value itself. The <em>argmax</em> \\(\\arg\\max_i x_i\\) is the index \\(i\\) at which that value occurs.</p>' +
          '<p>In the chart, the maximum is a height read on the vertical axis and the argmax is a position read on the horizontal axis.</p>',
        mount: mountArgmaxExplore
      },
      {
        kind: 'exercise',
        title: 'Argmax in a classifier',
        html: '<p>An image classifier is a program that sorts pictures into classes. It outputs one score per class: \\(z_1 = 1.2\\) for cat, \\(z_2 = 3.4\\) for dog and \\(z_3 = 0.5\\) for bird. The predicted class is the one with index \\(\\arg\\max_i z_i\\). Select the statement in which both quantities are correct.</p>',
        hint: 'The maximum must be one of the three scores. The argmax must be one of the indices 1, 2, 3.',
        mount: mountClassifier
      },
      {
        kind: 'exercise',
        title: 'Combined conditions',
        html: '<p>Adjust the five values \\(x_1, \\dots, x_5\\), which move in steps of 1, so that all three conditions hold simultaneously: \\[\\arg\\max_i x_i = 2, \\qquad \\max_i x_i = 9, \\qquad \\frac{1}{5}\\sum_{i=1}^{5} x_i = 5.\\] The argmax counts only if a single bar is the largest. The check is made when a bar is released.</p>',
        hint: 'Set \\(x_2 = 9\\) first. The sum must be \\(5 \\cdot 5 = 25\\), so the other four values must add up to 16 while each stays below 9, for example \\(4, 4, 4, 4\\).',
        mount: mountFinal
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>\\(\\sum_{i=m}^{n} x_i\\) adds the terms for \\(i = m, m+1, \\dots, n\\), and \\(\\prod_{i=m}^{n} x_i\\) multiplies them. The index is a counter whose name does not matter.</li>' +
          '<li>The mean is a scaled sum, \\(\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i\\), and the logarithm converts a product into a sum, \\(\\ln \\prod_i p_i = \\sum_i \\ln p_i\\), which keeps a long product of small numbers from vanishing.</li>' +
          '<li>\\(\\max_i x_i\\) is the largest value, whereas \\(\\arg\\max_i x_i\\) is the index at which it occurs. A classifier predicts the class with the argmax score.</li>' +
          '</ul>'
      }
    ]
  });
})();
