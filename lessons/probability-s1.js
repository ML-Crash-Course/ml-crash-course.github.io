(function () {
  'use strict';

  var C = M4.colors || {};
  var YELLOW = C.yellow || '#ffc533';
  var YELLOW_DARK = '#d99e00';
  var BLUE = C.blue || '#2f6bff';
  var GREEN = C.green || '#16b56b';
  var GREEN_DARK = '#0e8f52';
  var PINK = C.pink || '#ef4b8b';
  var INK = C.ink || '#1d1d1f';
  var MUTED = C.muted || '#6b6f76';
  var LINE = C.line || '#e6e4dd';
  var OFF = '#f1efe8';

  function injectStyle() {
    if (document.getElementById('probability-s1-style')) return;
    var st = document.createElement('style');
    st.id = 'probability-s1-style';
    st.textContent =
      '.probability-s1-chart{display:block;width:100%;max-width:640px;height:auto;margin:8px auto 4px;user-select:none;-webkit-user-select:none}' +
      '.probability-s1-chart text{font-family:Inter,system-ui,sans-serif}' +
      '.probability-s1-bar{transition:fill .2s}' +
      '.probability-s1-row{margin:12px 0;justify-content:center}' +
      '.probability-s1-slots{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin:14px 0}' +
      '.probability-s1-slotcol{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:18px}' +
      '.probability-s1-slotcol .m4-slot{min-width:92px;min-height:64px;display:flex;align-items:center;justify-content:center}' +
      '.probability-s1-tray{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;min-height:68px;margin:10px 0}' +
      '.probability-s1-tray .m4-token,.probability-s1-slotcol .m4-token{padding:10px 18px;font-size:20px;touch-action:none}' +
      '.probability-s1-dice{display:block;width:100%;max-width:340px;height:auto;margin:6px auto}' +
      '.probability-s1-counts{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:10px 0}';
    document.head.appendChild(st);
  }

  function S(tag, attrs, parent, text) {
    var e = M4.svg(tag, attrs || {}, parent);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function sum(a) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i];
    return s;
  }

  function near(a, b) { return Math.abs(a - b) < 1e-6; }

  // Bar chart of a probability mass function.
  // o: {labels, values, ymax, ticks, draggable (bool or array), snap, ghost, onChange(i,v,vals), onEnd(i), onTap(i), format, ytitle}
  function chart(parent, o) {
    var W = 640, H = 360, L = 60, R = 14, T = 34, B = 46;
    var plotW = W - L - R, plotH = H - T - B;
    var n = o.labels.length;
    var ymax = o.ymax || 1;
    var vals = o.values.slice();
    var ghost = o.ghost ? o.ghost.slice() : null;
    var fmt = o.format || function (v) { return v.toFixed(2); };
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'probability-s1-chart' }, parent);
    function Y(v) { return T + plotH * (1 - Math.min(v, ymax) / ymax); }
    var ticks = o.ticks || [0, 0.25, 0.5, 0.75, 1];
    ticks.forEach(function (t) {
      if (t > ymax + 1e-9) return;
      S('line', { x1: L, x2: W - R, y1: Y(t), y2: Y(t), stroke: t === 0 ? INK : LINE, 'stroke-width': t === 0 ? 2 : 1.5 }, svg);
      S('text', { x: L - 8, y: Y(t) + 5, 'text-anchor': 'end', 'font-size': 15, fill: MUTED }, svg, t.toFixed(2));
    });
    S('text', { x: 15, y: T + plotH / 2, 'text-anchor': 'middle', 'font-size': 15, fill: MUTED,
      transform: 'rotate(-90 15 ' + (T + plotH / 2) + ')' }, svg, o.ytitle || 'probability');
    var cw = plotW / n, bw = Math.min(cw * 0.62, 92);
    var bars = [], ghosts = [], grips = [], labels = [];
    function isDrag(i) { return Array.isArray(o.draggable) ? !!o.draggable[i] : !!o.draggable; }
    for (var k = 0; k < n; k++) (function (i) {
      var cx = L + cw * (i + 0.5);
      var g = S('rect', { x: cx - bw / 2 - 5, width: bw + 10, rx: 8, fill: 'none', stroke: BLUE,
        'stroke-width': 2.5, 'stroke-dasharray': '7 6', opacity: 0.75 }, svg);
      ghosts.push(g);
      var r = S('rect', { x: cx - bw / 2, width: bw, rx: 7, fill: YELLOW, stroke: YELLOW_DARK,
        'stroke-width': 2.5, 'class': 'probability-s1-bar' }, svg);
      bars.push(r);
      var grip = null;
      if (isDrag(i)) {
        grip = S('rect', { x: cx - 20, width: 40, height: 10, rx: 5, fill: '#ffffff', stroke: INK, 'stroke-width': 2.5 }, svg);
      }
      grips.push(grip);
      labels.push(S('text', { x: cx, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: INK }, svg, ''));
      S('text', { x: cx, y: H - B + 26, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 600, fill: INK }, svg, o.labels[i]);
      if (isDrag(i) || o.onTap) {
        var hit = S('rect', { x: L + cw * i, y: 0, width: cw, height: H - B + 4, fill: 'transparent',
          style: isDrag(i) ? 'touch-action:none;cursor:ns-resize' : 'cursor:pointer' }, svg);
        if (isDrag(i)) {
          var start = 0;
          M4.drag(hit, {
            onStart: function () { start = vals[i]; },
            onMove: function (dx, dy) {
              var rect = svg.getBoundingClientRect();
              var scale = (rect.height || H) / H;
              var v = start - (dy / (scale * plotH)) * ymax;
              if (o.snap) v = Math.round(v / o.snap) * o.snap;
              v = Math.max(0, Math.min(o.max !== undefined ? o.max : ymax, v));
              v = +v.toFixed(4);
              if (v === vals[i]) return;
              vals[i] = v;
              if (o.onChange) o.onChange(i, v, vals);
              render();
            },
            onEnd: function () { if (o.onEnd) o.onEnd(i); }
          });
        } else {
          hit.addEventListener('click', function () { o.onTap(i); });
        }
      }
    })(k);
    function render() {
      for (var i = 0; i < n; i++) {
        var y = Y(vals[i]);
        bars[i].setAttribute('y', y);
        bars[i].setAttribute('height', Math.max(0, T + plotH - y));
        var top = y;
        if (ghost) {
          var gy = Y(ghost[i]);
          ghosts[i].setAttribute('y', gy);
          ghosts[i].setAttribute('height', Math.max(0, T + plotH - gy));
          ghosts[i].setAttribute('visibility', 'visible');
          top = Math.min(top, gy);
        } else {
          ghosts[i].setAttribute('visibility', 'hidden');
        }
        if (grips[i]) grips[i].setAttribute('y', y - 5);
        labels[i].setAttribute('y', top - (grips[i] ? 13 : 9));
        labels[i].textContent = fmt(vals[i], i);
      }
    }
    render();
    return {
      svg: svg,
      values: vals,
      set: function (a) { for (var i = 0; i < n; i++) vals[i] = a[i]; render(); },
      setFill: function (i, fill, stroke) { bars[i].setAttribute('fill', fill); bars[i].setAttribute('stroke', stroke); },
      render: render
    };
  }

  function readout(parent, text) {
    return M4.el('span', { 'class': 'm4-readout', text: text || '' }, parent);
  }

  function row(parent) {
    return M4.el('div', { 'class': 'm4-row probability-s1-row' }, parent);
  }

  function sampleFrom(p) {
    var u = Math.random(), c = 0;
    for (var i = 0; i < p.length; i++) { c += p[i]; if (u < c) return i; }
    return p.length - 1;
  }

  // ---------------------------------------------------------------- steps

  var steps = [];

  steps.push({
    kind: 'text',
    title: 'Learning goals',
    html:
      '<p>A model that predicts under uncertainty does not output a single answer. It outputs a probability for every possible answer. ' +
      'The object that holds those probabilities is the <em>distribution</em> of a random variable.</p>' +
      '<p>In this lesson you will read and construct a probability mass function, compute the probability of an event from it, ' +
      'and explain why a histogram of many samples takes the shape of the distribution that produced them.</p>'
  });

  steps.push({
    kind: 'text',
    title: 'Random variables and the probability mass function',
    html:
      '<p>A <em>random variable</em> \\(X\\) is a quantity whose value is determined by a random experiment, such as the number shown by a die. ' +
      'A <em>discrete</em> random variable takes values from a list of separate outcomes \\(x_1, x_2, \\dots, x_n\\).</p>' +
      '<p>Its <em>probability mass function</em> (PMF) \\(p\\) assigns to each outcome \\(x\\) the probability \\(p(x) = P(X = x)\\) that \\(X\\) takes that value. ' +
      'Two conditions make \\(p\\) a valid PMF: no probability is negative, and the probabilities of all outcomes add up to one.</p>' +
      '\\[ p(x_i) \\ge 0 \\quad \\text{for every } i, \\qquad \\sum_{i=1}^{n} p(x_i) = 1 . \\]'
  });

  steps.push({
    kind: 'explore',
    title: 'Total probability',
    html:
      '<p>The bars show the PMF of a six-sided die. The height of bar \\(x\\) is \\(p(x)\\). Drag any bar up or down to load the die. ' +
      'The total probability is a fixed budget of one, so the other bars rescale in proportion whenever one bar changes.</p>',
    mount: function (el, ctx) {
      injectStyle();
      var fair = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
      var ch, rSum, rMode;
      function update() {
        var v = ch.values, best = 0;
        for (var i = 1; i < v.length; i++) if (v[i] > v[best] + 1e-9) best = i;
        var ties = v.filter(function (x) { return near(x, v[best]); }).length;
        rSum.textContent = 'sum of bars = ' + sum(v).toFixed(2);
        rMode.textContent = ties > 1 ? 'most likely outcome: tie' : 'most likely outcome: ' + (best + 1);
      }
      ch = chart(el, {
        labels: ['1', '2', '3', '4', '5', '6'], values: fair, draggable: true, max: 1,
        onChange: function (i, v, vals) {
          var rest = 0, j;
          for (j = 0; j < vals.length; j++) if (j !== i) rest += vals[j];
          var target = 1 - v;
          for (j = 0; j < vals.length; j++) {
            if (j === i) continue;
            vals[j] = rest > 1e-9 ? vals[j] * target / rest : target / (vals.length - 1);
          }
          update();
        }
      });
      var r = row(el);
      rSum = readout(r);
      rMode = readout(r);
      var b = row(el);
      M4.button(b, 'Fair die', function () { ch.set(fair); update(); });
      M4.button(b, 'Loaded towards 6', function () { ch.set([0.1, 0.1, 0.1, 0.1, 0.1, 0.5]); update(); });
      update();
      ctx.note('Whatever the shape, the bar heights always add up to 1.');
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'A missing probability',
    html:
      '<p>A random variable \\(X\\) takes the values 1, 2, 3 and 4. Three of its probabilities are fixed: ' +
      '\\(p(1) = 0.15\\), \\(p(2) = 0.35\\) and \\(p(3) = 0.20\\). Drag the fourth bar to the height that makes this a valid PMF.</p>',
    hint: 'The four probabilities must sum to one, so \\(p(4) = 1 - (0.15 + 0.35 + 0.20)\\).',
    mount: function (el, ctx) {
      injectStyle();
      var done = false, rSum;
      var ch = chart(el, {
        labels: ['1', '2', '3', '4'], values: [0.15, 0.35, 0.2, 0.05], draggable: [false, false, false, true],
        snap: 0.05, ymax: 0.75, ticks: [0, 0.25, 0.5, 0.75], max: 0.75,
        onChange: function () { show(); },
        onEnd: function () {
          if (done) return;
          var s = sum(ch.values);
          if (near(s, 1)) {
            done = true;
            ch.setFill(3, GREEN, GREEN_DARK);
            ctx.note('The bars now sum to 1, so \\(p(4) = 0.30\\).');
            ctx.solved();
          } else if (s < 1) {
            ctx.note('The bars sum to ' + s.toFixed(2) + '. Some probability is still unassigned.');
          } else {
            ctx.note('The bars sum to ' + s.toFixed(2) + ', which exceeds the total budget of 1.');
          }
        }
      });
      ch.setFill(3, BLUE, '#1f4fd1');
      var r = row(el);
      rSum = readout(r);
      function show() { rSum.textContent = 'sum of bars = ' + sum(ch.values).toFixed(2); }
      show();
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'Valid PMFs',
    html:
      '<p>Each option lists candidate values \\(\\big(p(1),\\, p(2),\\, p(3)\\big)\\) for a random variable with three outcomes. ' +
      'Exactly one of them satisfies both conditions of a probability mass function. Select it.</p>',
    hint: 'Check two things for each option: every entry is at least zero, and the three entries add up to exactly one.',
    mount: function (el, ctx) {
      var reasons = [
        'These values sum to 1.1, which is more than one.',
        'These values sum to one, but a probability cannot be negative.',
        '',
        'These values sum to 0.75, which is less than one.'
      ];
      M4.choices(el, {
        options: [
          '\\( (0.5,\\; 0.3,\\; 0.3) \\)',
          '\\( (0.6,\\; 0.5,\\; -0.1) \\)',
          '\\( (0.2,\\; 0.5,\\; 0.3) \\)',
          '\\( (0.25,\\; 0.25,\\; 0.25) \\)'
        ],
        correct: 2,
        onCorrect: function () {
          ctx.note('All entries are non-negative and \\(0.2 + 0.5 + 0.3 = 1\\).');
          ctx.solved();
        },
        onWrong: function (i) { ctx.wrong(reasons[i]); }
      });
    }
  });

  steps.push({
    kind: 'explore',
    title: 'Sampling and the histogram',
    html:
      '<p>To <em>sample</em> from a distribution is to run the experiment once and record the outcome. After \\(N\\) samples, the ' +
      '<em>relative frequency</em> of an outcome is the number of times it occurred divided by \\(N\\). A bar chart of these frequencies is a histogram.</p>' +
      '<p>The dashed outlines show the true PMF and the filled bars show the histogram. Draw samples and observe how the gap between the two shrinks as \\(N\\) grows.</p>',
    mount: function (el, ctx) {
      injectStyle();
      var p = [0.1, 0.2, 0.4, 0.3];
      var counts = [0, 0, 0, 0], N = 0, raf = 0, running = false;
      var ch = chart(el, {
        labels: ['1', '2', '3', '4'], values: [0, 0, 0, 0], ghost: p, ymax: 1,
        format: function (v) { return N ? v.toFixed(2) : ''; }
      });
      var r = row(el);
      var rN = readout(r), rGap = readout(r), rLast = readout(r);
      function draw(k) {
        var last = 0;
        for (var i = 0; i < k; i++) { last = sampleFrom(p); counts[last]++; }
        N += k;
        rLast.textContent = 'last sample: ' + (last + 1);
        refresh();
      }
      function refresh() {
        var f = counts.map(function (c) { return N ? c / N : 0; });
        ch.set(f);
        var gap = 0;
        for (var i = 0; i < p.length; i++) gap = Math.max(gap, Math.abs(f[i] - p[i]));
        rN.textContent = 'N = ' + N;
        rGap.textContent = N ? 'largest gap = ' + gap.toFixed(3) : 'largest gap = n/a';
        if (!N) rLast.textContent = 'last sample: none';
      }
      function stop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        runBtn.textContent = 'Run';
      }
      function tick() {
        if (!running) return;
        draw(Math.max(1, Math.min(200, Math.floor(N / 40))));
        if (N >= 20000) { stop(); return; }
        raf = requestAnimationFrame(tick);
      }
      var b = row(el);
      M4.button(b, 'Draw 1', function () { draw(1); });
      M4.button(b, 'Draw 100', function () { draw(100); });
      var runBtn = M4.button(b, 'Run', function () {
        if (running) { stop(); return; }
        if (N >= 20000) return;
        running = true;
        runBtn.textContent = 'Pause';
        raf = requestAnimationFrame(tick);
      }, { primary: true });
      M4.button(b, 'Reset', function () { stop(); counts = [0, 0, 0, 0]; N = 0; refresh(); });
      refresh();
      ctx.note('With few samples the histogram is erratic. With thousands it is almost indistinguishable from the PMF.');
      ctx.onCleanup(stop);
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'Expected counts',
    html:
      '<p>The chart shows the PMF from the previous step, with \\(p(3) = 0.40\\). Suppose \\(N = 2000\\) samples are drawn from it. ' +
      'Because the relative frequency of an outcome settles near its probability, the count of each outcome can be predicted approximately. ' +
      'About how many of the 2000 samples equal 3?</p>',
    hint: 'Relative frequency is count divided by \\(N\\). Set \\(\\text{count} / 2000 \\approx 0.40\\) and solve for the count.',
    mount: function (el, ctx) {
      injectStyle();
      var ch = chart(el, { labels: ['1', '2', '3', '4'], values: [0.1, 0.2, 0.4, 0.3], ymax: 0.75, ticks: [0, 0.25, 0.5, 0.75] });
      ch.setFill(2, BLUE, '#1f4fd1');
      var r = row(el);
      M4.numberInput(r, {
        answer: 800, tolerance: 0.5, placeholder: 'count', label: 'Samples equal to 3 \u2248',
        onCorrect: function () {
          ch.setFill(2, GREEN, GREEN_DARK);
          ctx.note('\\(0.40 \\times 2000 = 800\\). The actual count in any one run will differ slightly from this value.');
          ctx.solved();
        },
        onWrong: function (v) {
          if (near(v, 0.4)) ctx.wrong('0.40 is the relative frequency. The question asks for the number of samples.');
          else if (v > 2000) ctx.wrong('The count cannot exceed the number of samples, 2000.');
          else ctx.wrong('Multiply the probability of the outcome by the number of samples.');
        }
      });
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'Events',
    html:
      '<p>An <em>event</em> \\(A\\) is a set of outcomes, and its probability is the sum of the PMF over the outcomes it contains: ' +
      '\\(P(A) = \\sum_{x \\in A} p(x)\\). Tap bars to add outcomes to \\(A\\) or remove them. ' +
      'Build an event with probability exactly \\(0.6\\).</p>',
    hint: 'Look for bars whose heights add up to 0.6. There are two such sets: one with two outcomes and one with three.',
    mount: function (el, ctx) {
      injectStyle();
      var p = [0.1, 0.2, 0.3, 0.4], sel = [false, false, false, false], done = false, rP, rA;
      var ch = chart(el, {
        labels: ['1', '2', '3', '4'], values: p, ymax: 0.75, ticks: [0, 0.25, 0.5, 0.75],
        onTap: function (i) {
          if (done) return;
          sel[i] = !sel[i];
          paint();
          var s = total();
          if (near(s, 0.6)) {
            done = true;
            for (var j = 0; j < 4; j++) if (sel[j]) ch.setFill(j, GREEN, GREEN_DARK);
            ctx.note('The selected bars sum to 0.60, so \\(P(A) = 0.6\\).');
            ctx.solved();
          } else if (s > 0.6) {
            ctx.note('\\(P(A) = ' + s.toFixed(2) + '\\) is above 0.6. Remove an outcome or exchange one for a shorter bar.');
          } else if (s > 0) {
            ctx.note('\\(P(A) = ' + s.toFixed(2) + '\\) is below 0.6. Add an outcome or exchange one for a taller bar.');
          } else {
            ctx.note('The empty event has probability 0.');
          }
        }
      });
      function total() { var s = 0; for (var i = 0; i < 4; i++) if (sel[i]) s += p[i]; return s; }
      function paint() {
        var names = [];
        for (var i = 0; i < 4; i++) {
          ch.setFill(i, sel[i] ? YELLOW : OFF, sel[i] ? YELLOW_DARK : '#c9c6bb');
          if (sel[i]) names.push(i + 1);
        }
        rA.textContent = 'A = {' + names.join(', ') + '}';
        rP.textContent = 'P(A) = ' + total().toFixed(2);
      }
      var r = row(el);
      rA = readout(r);
      rP = readout(r);
      paint();
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'The sum of two dice',
    html:
      '<p>Two fair dice are rolled and \\(S\\) denotes the sum of the two numbers. The table lists \\(S\\) for all 36 equally likely pairs, ' +
      'so \\(P(S = s)\\) is the number of cells showing \\(s\\) divided by 36. Drag the correct probability into each slot.</p>',
    hint: 'Count the coloured cells for each sum: one cell shows 2, three cells show 4, and six cells show 7.',
    mount: function (el, ctx) {
      injectStyle();
      var tint = { 2: BLUE, 4: PINK, 7: YELLOW };
      var cs = 46, off = 50, size = off + 6 * cs + 8;
      var svg = S('svg', { viewBox: '0 0 ' + size + ' ' + size, 'class': 'probability-s1-dice' }, el);
      for (var a = 1; a <= 6; a++) {
        S('text', { x: off + (a - 0.5) * cs, y: 32, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: MUTED }, svg, String(a));
        S('text', { x: 26, y: off + (a - 0.5) * cs + 6, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: MUTED }, svg, String(a));
        for (var b = 1; b <= 6; b++) {
          var s = a + b, col = tint[s];
          S('rect', { x: off + (a - 1) * cs + 2, y: off + (b - 1) * cs + 2, width: cs - 4, height: cs - 4, rx: 8,
            fill: col || '#ffffff', 'fill-opacity': col ? 0.3 : 1, stroke: col || LINE, 'stroke-width': 2 }, svg);
          S('text', { x: off + (a - 0.5) * cs, y: off + (b - 0.5) * cs + 6, 'text-anchor': 'middle', 'font-size': 17,
            'font-weight': col ? 700 : 500, fill: INK }, svg, String(s));
        }
      }
      var slotsWrap = M4.el('div', { 'class': 'probability-s1-slots' }, el);
      var specs = [{ s: 2, k: 1 }, { s: 4, k: 3 }, { s: 7, k: 6 }];
      var slots = specs.map(function (sp) {
        var col = M4.el('div', { 'class': 'probability-s1-slotcol' }, slotsWrap);
        M4.el('div', { html: M4.tex('P(S = ' + sp.s + ')') }, col);
        var slot = M4.el('div', { 'class': 'm4-slot' }, col);
        slot.setAttribute('data-k', String(sp.k));
        slot.setAttribute('data-s', String(sp.s));
        return slot;
      });
      var tray = M4.el('div', { 'class': 'probability-s1-tray' }, el);
      var tokens = [3, 1, 6, 2].map(function (k) {
        var t = M4.el('div', { 'class': 'm4-token', html: M4.tex('\\tfrac{' + k + '}{36}') }, tray);
        t.setAttribute('data-k', String(k));
        return t;
      });
      var filled = 0;
      M4.dragDrop({
        tokens: tokens, slots: slots,
        onDrop: function (tok, slot) {
          if (slot.classList.contains('m4-slot') && slot.classList.contains('filled')) {
            if (tok.parentNode !== slot) ctx.note('That slot is already filled correctly.');
            return;
          }
          if (tok.getAttribute('data-k') === slot.getAttribute('data-k')) {
            slot.appendChild(tok);
            slot.classList.add('filled');
            tok.classList.add('m4-pop');
            tok.style.pointerEvents = 'none';
            filled++;
            if (filled === 3) {
              ctx.note('One, three and six of the 36 cells show the sums 2, 4 and 7. The value \\(\\tfrac{2}{36}\\) belongs to \\(S = 3\\) and \\(S = 11\\).');
              ctx.solved();
            } else {
              ctx.note('Correct. ' + (3 - filled) + ' slot' + (filled === 2 ? '' : 's') + ' remaining.');
            }
          } else {
            if (tok.parentNode !== tray) tray.appendChild(tok);
            ctx.wrong('Count the cells of the table that show ' + slot.getAttribute('data-s') + ' and divide by 36.');
          }
        },
        onMiss: function (tok) {
          if (tok.style.pointerEvents !== 'none' && tok.parentNode !== tray) tray.appendChild(tok);
        }
      });
    }
  });

  steps.push({
    kind: 'explore',
    title: 'Distributions in machine learning',
    html:
      '<p>A <em>classifier</em> is a model that sorts inputs into classes, for example pictures into cat, dog and bird. It does not output a class directly. It computes one real number per class, called a <em>logit</em> \\(z_i\\), and converts the logits into a PMF with the <em>softmax</em> function:</p>' +
      '\\[ p_i = \\frac{e^{z_i}}{\\sum_{j} e^{z_j}} . \\]' +
      '<p>Each \\(p_i\\) is positive and the values sum to one, so the output is a valid distribution over classes. A text generator does the same over every word it knows and then picks the next word at random from that PMF. Move the logits and observe the bars.</p>',
    mount: function (el, ctx) {
      injectStyle();
      var z = [1, 0, -1], rSum, rTop, names = ['cat', 'dog', 'bird'];
      function soft() {
        var m = Math.max.apply(null, z);
        var e = z.map(function (v) { return Math.exp(v - m); });
        var t = sum(e);
        return e.map(function (v) { return v / t; });
      }
      var ch = chart(el, { labels: names, values: soft(), ymax: 1 });
      var r = row(el);
      rSum = readout(r);
      rTop = readout(r);
      function update() {
        var p = soft(), best = 0;
        for (var i = 1; i < 3; i++) if (p[i] > p[best]) best = i;
        ch.set(p);
        rSum.textContent = 'sum of bars = ' + sum(p).toFixed(2);
        rTop.textContent = 'largest: ' + names[best] + ' (' + p[best].toFixed(2) + ')';
      }
      var col = M4.el('div', { 'class': 'm4-col' }, el);
      names.forEach(function (nm, i) {
        M4.slider(col, {
          min: -3, max: 3, step: 0.1, value: z[i], label: 'logit of ' + nm,
          format: function (v) { return Number(v).toFixed(1); },
          onInput: function (v) { z[i] = Number(v); update(); }
        });
      });
      update();
      ctx.note('Raising one logit takes probability from the other classes, as in the loaded die. Adding the same constant to all logits changes nothing.');
    }
  });

  steps.push({
    kind: 'exercise',
    title: 'Estimates from samples',
    html:
      '<p>A random variable \\(X\\) with outcomes 0 to 4 was sampled \\(N = 200\\) times. The recorded counts are shown below, but the count for outcome 4 was lost. ' +
      'The relative frequencies of the samples serve as an estimate of the unknown PMF. Drag the five bars so that each one equals the relative frequency of its outcome.</p>',
    hint: 'The five counts must total 200, which gives the missing count as \\(200 - (20 + 50 + 70 + 40) = 20\\). Each bar height is its count divided by 200.',
    mount: function (el, ctx) {
      injectStyle();
      var target = [0.1, 0.25, 0.35, 0.2, 0.1], done = false, rSum, rOk;
      var cr = M4.el('div', { 'class': 'probability-s1-counts' }, el);
      ['0: 20', '1: 50', '2: 70', '3: 40', '4: ?'].forEach(function (t) {
        M4.el('span', { 'class': 'm4-chip', text: 'outcome ' + t }, cr);
      });
      var ch = chart(el, {
        labels: ['0', '1', '2', '3', '4'], values: [0.2, 0.2, 0.2, 0.2, 0.2], draggable: true, snap: 0.05,
        ymax: 0.5, ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5], max: 0.5,
        onChange: function () { show(); },
        onEnd: function () {
          if (done) return;
          var ok = matches(), s = sum(ch.values);
          if (ok === 5) {
            done = true;
            for (var i = 0; i < 5; i++) ch.setFill(i, GREEN, GREEN_DARK);
            ctx.note('The estimate is \\((0.10,\\, 0.25,\\, 0.35,\\, 0.20,\\, 0.10)\\): each count divided by 200, with the missing count equal to 20.');
            ctx.solved();
          } else if (!near(s, 1)) {
            ctx.note('The bars sum to ' + s.toFixed(2) + '. Relative frequencies always sum to 1, because the counts sum to \\(N\\).');
          } else {
            ctx.note('The bars sum to 1, but only ' + ok + ' of 5 equal count divided by 200.');
          }
        }
      });
      function matches() {
        var k = 0;
        for (var i = 0; i < 5; i++) if (near(ch.values[i], target[i])) k++;
        return k;
      }
      var r = row(el);
      rSum = readout(r);
      rOk = readout(r);
      function show() {
        rSum.textContent = 'sum of bars = ' + sum(ch.values).toFixed(2);
        rOk.textContent = 'bars matching: ' + matches() + ' / 5';
      }
      show();
    }
  });

  steps.push({
    kind: 'text',
    title: 'Recap',
    html:
      '<ul>' +
      '<li>A discrete random variable \\(X\\) is described by its probability mass function \\(p(x) = P(X = x)\\), whose values are non-negative and sum to one.</li>' +
      '<li>The probability of an event is the sum of \\(p(x)\\) over the outcomes in the event.</li>' +
      '<li>The relative frequencies of many samples approach the PMF, so a histogram both reveals a distribution and provides an estimate of it. Classifiers and language models output such a PMF through the softmax function.</li>' +
      '</ul>' +
      '<p>The next session summarises a distribution by two numbers, its expectation and its variance.</p>'
  });

  M4.lesson({
    id: 'probability-s1',
    module: 'probability',
    title: 'Random variables and distributions',
    summary: 'Probability mass functions as bars that sum to one, sampling, and histograms that converge to the distribution.',
    minutes: 10,
    steps: steps
  });
})();
