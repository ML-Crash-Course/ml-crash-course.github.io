(function () {
  'use strict';

  var C = M4.colors || { blue: '#2f6bff', green: '#16b56b', orange: '#ff8a1f', purple: '#7a5cff', pink: '#ef4b8b', yellow: '#ffc533', red: '#f0473e', ink: '#1d1d1f', muted: '#6b6f76', line: '#e6e4dd', bg: '#faf9f5', card: '#ffffff' };
  var NS = 'http://www.w3.org/2000/svg';

  function ensureStyle() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('functions-s1-style')) return;
    var st = document.createElement('style');
    st.id = 'functions-s1-style';
    st.textContent = [
      '.functions-s1-svg{display:block;width:100%;height:auto;max-width:720px;margin:0 auto;}',
      '.functions-s1-center{display:flex;flex-direction:column;align-items:center;gap:14px;}',
      '.functions-s1-pills{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:10px 0;}',
      '.functions-s1-tray{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;min-height:60px;padding:12px;margin-bottom:18px;border-radius:16px;background:#fff4e8;}',
      '.functions-s1-match{display:grid;grid-template-columns:1fr 170px;gap:12px 18px;align-items:center;max-width:560px;margin:0 auto;}',
      '.functions-s1-desc{font-size:18px;text-align:right;}',
      '.functions-s1-slotbox{min-height:58px;min-width:150px;display:flex;align-items:center;justify-content:center;}',
      '.functions-s1-tok{font-size:19px;padding:10px 16px;touch-action:none;user-select:none;}',
      '.functions-s1-tok.functions-s1-locked{border-color:#16b56b;background:#eafaf2;cursor:default;pointer-events:none;}',
      '.functions-s1-sliders{max-width:520px;margin:8px auto 0;}',
      '@media (max-width:520px){.functions-s1-match{grid-template-columns:1fr 150px;}.functions-s1-desc{font-size:16px;}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function s(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function r2(v) {
    var r = Math.round(v * 100) / 100;
    return r === 0 ? 0 : r;
  }
  function num(v) { return String(r2(v)); }
  function numTxt(v) { return num(v).replace('-', '−'); }

  function lineTex(m, b, lhs, x) {
    lhs = lhs || 'y';
    x = x || 'x';
    m = r2(m); b = r2(b);
    if (m === 0) return lhs + ' = ' + num(b);
    var str = lhs + ' = ' + (m === 1 ? '' : m === -1 ? '-' : num(m)) + x;
    if (b > 0) str += ' + ' + num(b);
    if (b < 0) str += ' - ' + num(-b);
    return str;
  }

  function shiftTex(base, a, h, k) {
    a = r2(a); h = r2(h); k = r2(k);
    if (a === 0) return 'g(x) = ' + num(k);
    var inner = h === 0 ? 'x' : (h > 0 ? 'x - ' + num(h) : 'x + ' + num(-h));
    var core = base === 'abs' ? '|' + inner + '|' : (h === 0 ? 'x^2' : '(' + inner + ')^2');
    var str = 'g(x) = ' + (a === 1 ? '' : a === -1 ? '-' : num(a)) + core;
    if (k > 0) str += ' + ' + num(k);
    if (k < 0) str += ' - ' + num(-k);
    return str;
  }

  // Segment of y = m x + b clipped to the box.
  function clipLine(m, b, xmin, xmax, ymin, ymax) {
    var lo = xmin, hi = xmax;
    if (m !== 0) {
      var xa = (ymin - b) / m, xb = (ymax - b) / m;
      lo = Math.max(lo, Math.min(xa, xb));
      hi = Math.min(hi, Math.max(xa, xb));
    } else if (b < ymin || b > ymax) {
      return [xmin, ymin, xmin, ymin];
    }
    if (lo > hi) return [xmin, ymin, xmin, ymin];
    return [lo, m * lo + b, hi, m * hi + b];
  }

  function curvePts(f, xmin, xmax, ymin, ymax) {
    var pts = [], n = 240;
    for (var i = 0; i <= n; i++) {
      var x = xmin + (xmax - xmin) * i / n;
      var y = f(x);
      if (y >= ymin - 0.05 && y <= ymax + 0.05) pts.push([x, y]);
    }
    if (pts.length < 2) pts = [[xmin, ymin], [xmin, ymin]];
    return pts;
  }

  function readout(parent) {
    var e = M4.el('div', { class: 'm4-readout' }, parent);
    return {
      el: e,
      tex: function (t) { e.innerHTML = M4.tex(t); }
    };
  }

  // The input-output machine drawing. Returns setters.
  function machine(parent) {
    ensureStyle();
    var svg = s('svg', { viewBox: '0 0 720 230', class: 'functions-s1-svg', role: 'img', 'aria-label': 'Function machine' }, parent);
    s('line', { x1: 160, y1: 115, x2: 250, y2: 115, stroke: C.line, 'stroke-width': 8, 'stroke-linecap': 'round' }, svg);
    s('line', { x1: 470, y1: 115, x2: 560, y2: 115, stroke: C.line, 'stroke-width': 8, 'stroke-linecap': 'round' }, svg);
    s('path', { d: 'M236 101 L254 115 L236 129', fill: 'none', stroke: C.muted, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    s('path', { d: 'M546 101 L564 115 L546 129', fill: 'none', stroke: C.muted, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    var ball = s('circle', { cx: 110, cy: 115, r: 11, fill: C.blue, opacity: 0 }, svg);
    s('rect', { x: 260, y: 38, width: 200, height: 160, rx: 26, fill: '#d96f0e' }, svg);
    s('rect', { x: 260, y: 32, width: 200, height: 156, rx: 26, fill: C.orange }, svg);
    var rule = s('text', { x: 360, y: 121, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 700, fill: '#ffffff', 'font-style': 'italic' }, svg, 'f');
    s('circle', { cx: 100, cy: 115, r: 52, fill: '#ffffff', stroke: C.blue, 'stroke-width': 5 }, svg);
    s('circle', { cx: 620, cy: 115, r: 52, fill: '#ffffff', stroke: C.green, 'stroke-width': 5 }, svg);
    var tin = s('text', { x: 100, y: 126, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 700, fill: C.blue }, svg, '');
    var tout = s('text', { x: 620, y: 126, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 700, fill: C.green }, svg, '');
    s('text', { x: 100, y: 34, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 600, fill: C.muted }, svg, 'input x');
    s('text', { x: 620, y: 34, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 600, fill: C.muted }, svg, 'output f(x)');
    s('text', { x: 360, y: 222, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: C.muted }, svg, 'rule');
    return {
      svg: svg, ball: ball,
      setIn: function (t) { tin.textContent = t; },
      setOut: function (t) { tout.textContent = t; },
      setRule: function (t) { rule.textContent = t; }
    };
  }

  ensureStyle();

  M4.lesson({
    id: 'functions-s1',
    module: 'functions',
    title: 'Functions and graphs',
    summary: 'Functions as input-output rules, straight lines with slope and intercept, and how shifting and scaling change a graph.',
    minutes: 10,
    steps: [
      // 1
      {
        kind: 'text',
        title: 'Learning goals',
        html:
          '<p>A function is a rule that assigns exactly one output to each input. Almost every formula in machine learning is a function. A system that predicts house prices, for example, is a function from the description of a house to a price.</p>' +
          '<p>In this lesson you will evaluate a function, read the slope and intercept of a line \\(y = mx + b\\) from its graph, and predict how a graph moves when its formula is shifted or scaled.</p>'
      },

      // 2
      {
        kind: 'explore',
        title: 'Functions as machines',
        html:
          '<p>The notation \\(f(x)\\) denotes the output that the function \\(f\\) assigns to the input \\(x\\). The machine below applies one fixed rule. The same input always produces the same output.</p>' +
          '<p>Move the slider to change the input, and switch between rules to compare their outputs.</p>',
        mount: function (el, ctx) {
          var rules = [
            { label: '2x + 1', tex: '2x + 1', f: function (x) { return 2 * x + 1; }, sub: function (x) { return '2 \\cdot ' + par(x) + ' + 1'; } },
            { label: 'x²', tex: 'x^2', f: function (x) { return x * x; }, sub: function (x) { return par(x) + '^2'; } },
            { label: '3 − x', tex: '3 - x', f: function (x) { return 3 - x; }, sub: function (x) { return '3 - ' + par(x); } }
          ];
          function par(x) { return x < 0 ? '(' + num(x) + ')' : num(x); }
          var cur = 0, x = 2, raf = 0;
          var wrap = M4.el('div', { class: 'functions-s1-center' }, el);
          var row = M4.el('div', { class: 'm4-row' }, wrap);
          var mc = machine(wrap);
          var pills = M4.el('div', { class: 'functions-s1-pills' }, wrap);
          var ro1 = readout(pills), ro2 = readout(pills);
          var btns = rules.map(function (r, i) {
            return M4.button(row, 'f(x) = ' + r.label, function () { cur = i; update(true); });
          });
          function animate() {
            cancelAnimationFrame(raf);
            var t0 = performance.now();
            function frame(now) {
              var t = Math.min(1, (now - t0) / 650);
              var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
              mc.ball.setAttribute('cx', 160 + 400 * e);
              mc.ball.setAttribute('fill', e < 0.5 ? C.blue : C.green);
              mc.ball.setAttribute('opacity', t < 1 ? 1 : 0);
              if (t < 1) raf = requestAnimationFrame(frame);
            }
            raf = requestAnimationFrame(frame);
          }
          function update(anim) {
            var r = rules[cur], y = r.f(x);
            btns.forEach(function (b, i) { b.classList.toggle('primary', i === cur); });
            mc.setIn(numTxt(x));
            mc.setOut(numTxt(y));
            ro1.tex('f(x) = ' + r.tex);
            ro2.tex('f(' + num(x) + ') = ' + r.sub(x) + ' = ' + num(y));
            if (anim) animate();
          }
          var sl = M4.el('div', { class: 'functions-s1-sliders' }, el);
          M4.slider(sl, {
            min: -5, max: 5, step: 1, value: x, label: 'input x',
            format: function (v) { return numTxt(v); },
            onInput: function (v) { x = Number(v); update(true); }
          });
          update(true);
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
        }
      },

      // 3
      {
        kind: 'exercise',
        title: 'Function values',
        html:
          '<p>To evaluate a function, replace every occurrence of \\(x\\) in the rule by the given input and compute the result.</p>' +
          '<p>Let \\(f(x) = 3x - 2\\). Compute the output \\(f(4)\\).</p>',
        hint: 'Replace x by 4: the rule becomes 3 times 4, minus 2.',
        mount: function (el, ctx) {
          var wrap = M4.el('div', { class: 'functions-s1-center' }, el);
          var mc = machine(wrap);
          mc.setIn('4');
          mc.setOut('?');
          var pills = M4.el('div', { class: 'functions-s1-pills' }, wrap);
          readout(pills).tex('f(x) = 3x - 2');
          M4.numberInput(wrap, {
            answer: 10, tolerance: 0.001, placeholder: 'f(4)', label: 'f(4) =',
            onCorrect: function () {
              mc.setOut('10');
              ctx.note('\\(f(4) = 3 \\cdot 4 - 2 = 10\\).');
              ctx.solved();
            },
            onWrong: function (v) {
              if (Number(v) === 14) ctx.wrong('The rule subtracts 2 after multiplying; 3 · 4 + 2 would give 14.');
              else if (Number(v) === 6) ctx.wrong('Multiply before subtracting: 3 · 4 = 12, then subtract 2.');
              else ctx.wrong('Substitute 4 for x: compute 3 · 4 first, then subtract 2.');
            }
          });
        }
      },

      // 4
      {
        kind: 'text',
        title: 'Graphs and straight lines',
        html:
          '<p>The graph of a function \\(f\\) is the set of all points \\((x, f(x))\\) in the plane: the horizontal coordinate is the input and the vertical coordinate is the output. Reading a graph therefore means reading input-output pairs.</p>' +
          '<p>The simplest graphs are straight lines, given by \\(y = mx + b\\). The number \\(b\\) is the <em>intercept</em>, the output at \\(x = 0\\). The number \\(m\\) is the <em>slope</em>, the change in the output when the input increases by 1:</p>' +
          '\\[ m = \\frac{\\text{rise}}{\\text{run}} = \\frac{y_2 - y_1}{x_2 - x_1} \\]' +
          '<p>for any two distinct points \\((x_1, y_1)\\) and \\((x_2, y_2)\\) on the line.</p>'
      },

      // 5
      {
        kind: 'explore',
        title: 'Slope and intercept',
        html:
          '<p>The sliders set the slope \\(m\\) and the intercept \\(b\\) of the line \\(y = mx + b\\). The triangle starts where the line crosses the vertical axis: one step to the right (the run) is followed by a vertical step of length \\(m\\) (the rise).</p>' +
          '<p>Observe that \\(b\\) moves the line up and down without changing its direction, whereas \\(m\\) tilts it about the point \\((0, b)\\).</p>',
        mount: function (el, ctx) {
          var m = 1, b = 1;
          var pills = M4.el('div', { class: 'functions-s1-pills' }, el);
          var roEq = readout(pills), roM = readout(pills), roB = readout(pills);
          var p = M4.plane(el, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 520, height: 520 });
          var ln = p.line(0, 0, 0, 0, { stroke: C.orange, width: 4 });
          var run = p.line(0, 0, 0, 0, { stroke: C.blue, width: 4 });
          var rise = p.line(0, 0, 0, 0, { stroke: C.green, width: 4 });
          var pt = p.point(0, 0, { r: 7, fill: C.orange });
          var tRun = p.text(0, 0, 'run 1', { fill: C.blue, size: 16, weight: 700 });
          var tRise = p.text(0, 0, '', { fill: C.green, size: 16, weight: 700, anchor: 'start' });
          function update() {
            var c = clipLine(m, b, -5, 5, -5, 5);
            ln.set(c[0], c[1], c[2], c[3]);
            run.set(0, b, 1, b);
            rise.set(1, b, 1, Math.max(-5, Math.min(5, b + m)));
            pt.set(0, b);
            tRun.set(0.5, b + (m >= 0 ? -0.45 : 0.25), 'run 1');
            tRise.set(1.2, b + m / 2 - 0.1, 'rise ' + numTxt(m));
            roEq.tex(lineTex(m, b));
            roM.tex('\\text{slope } m = ' + num(m));
            roB.tex('\\text{intercept } b = ' + num(b));
          }
          var sl = M4.el('div', { class: 'functions-s1-sliders' }, el);
          M4.slider(sl, {
            min: -3, max: 3, step: 0.25, value: m, label: 'slope m',
            format: function (v) { return numTxt(v); },
            onInput: function (v) { m = Number(v); update(); }
          });
          M4.slider(sl, {
            min: -3, max: 3, step: 0.5, value: b, label: 'intercept b',
            format: function (v) { return numTxt(v); },
            onInput: function (v) { b = Number(v); update(); }
          });
          update();
        }
      },

      // 6
      {
        kind: 'exercise',
        title: 'A line through two points',
        html:
          '<p>Two distinct points determine exactly one straight line. Drag the two handles so that the line through them is</p>' +
          '\\[ y = 2x - 1. \\]' +
          '<p>The handles snap to whole-number coordinates.</p>',
        hint: 'The intercept is −1, so (0, −1) lies on the line. From there, each step of 1 to the right raises the line by 2, which gives (1, 1).',
        mount: function (el, ctx) {
          var A = { x: -3, y: 2 }, B = { x: 3, y: 2 }, done = false;
          var pills = M4.el('div', { class: 'functions-s1-pills' }, el);
          var roT = readout(pills), roC = readout(pills);
          roT.tex('\\text{target: } y = 2x - 1');
          var p = M4.plane(el, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 520, height: 520 });
          var ln = p.line(0, 0, 0, 0, { stroke: C.orange, width: 4 });
          function info() {
            if (A.x === B.x) return null;
            var m = (B.y - A.y) / (B.x - A.x);
            return { m: m, b: A.y - m * A.x };
          }
          function draw() {
            var f = info();
            if (!f) {
              if (A.y === B.y) ln.set(A.x, A.y, A.x, A.y); else ln.set(A.x, -5, A.x, 5);
              roC.tex(A.y === B.y ? '\\text{the two points coincide}' : '\\text{vertical: not a function of } x');
              return;
            }
            var c = clipLine(f.m, f.b, -5, 5, -5, 5);
            ln.set(c[0], c[1], c[2], c[3]);
            roC.tex('\\text{current: } ' + lineTex(f.m, f.b));
          }
          function check() {
            if (done) return;
            var f = info();
            if (!f) { ctx.note('A vertical line, or a single point, does not define a line of the form \\(y = mx + b\\).'); return; }
            var okM = Math.abs(f.m - 2) < 1e-9, okB = Math.abs(f.b + 1) < 1e-9;
            if (okM && okB) {
              done = true;
              ln.el.setAttribute('stroke', C.green);
              ctx.note('Both points satisfy \\(y = 2x - 1\\): slope 2, intercept \\(-1\\).');
              ctx.solved();
            } else if (okM) {
              ctx.note('The slope is correct. The line crosses the vertical axis at \\(' + num(f.b) + '\\) instead of \\(-1\\). Move both handles ' + (f.b > -1 ? 'down' : 'up') + ' by the same amount.');
            } else if (okB) {
              ctx.note('The intercept is correct. The slope is \\(' + num(f.m) + '\\). It must be 2, a rise of 2 for every run of 1.');
            } else {
              ctx.note('Current slope \\(' + num(f.m) + '\\) and intercept \\(' + num(f.b) + '\\). The target has slope 2 and intercept \\(-1\\).');
            }
          }
          var lim = { xmin: -5, xmax: 5, ymin: -5, ymax: 5 };
          p.handle(A.x, A.y, {
            color: C.blue, snap: 1, bounds: lim,
            onDrag: function (x, y) { A.x = Math.round(x); A.y = Math.round(y); draw(); },
            onEnd: function (x, y) { A.x = Math.round(x); A.y = Math.round(y); draw(); check(); }
          });
          p.handle(B.x, B.y, {
            color: C.purple, snap: 1, bounds: lim,
            onDrag: function (x, y) { B.x = Math.round(x); B.y = Math.round(y); draw(); },
            onEnd: function (x, y) { B.x = Math.round(x); B.y = Math.round(y); draw(); check(); }
          });
          draw();
        }
      },

      // 7
      {
        kind: 'exercise',
        title: 'Slope from two points',
        html:
          '<p>A line passes through the points \\((1, 2)\\) and \\((4, 8)\\). The dashed segments show the run (horizontal change) and the rise (vertical change) between them.</p>' +
          '<p>What is the slope of the line?</p>',
        hint: 'The run is 4 − 1 = 3 and the rise is 8 − 2 = 6. The slope is the rise divided by the run.',
        mount: function (el, ctx) {
          var p = M4.plane(el, { xmin: -1, xmax: 9, ymin: -1, ymax: 9, width: 480, height: 480 });
          var c = clipLine(2, 0, -1, 9, -1, 9);
          p.line(c[0], c[1], c[2], c[3], { stroke: C.orange, width: 4 });
          p.line(1, 2, 4, 2, { stroke: C.blue, width: 3, dash: '7 6' });
          p.line(4, 2, 4, 8, { stroke: C.green, width: 3, dash: '7 6' });
          p.point(1, 2, { r: 8, fill: C.ink });
          p.point(4, 8, { r: 8, fill: C.ink });
          p.text(1.2, 1.2, '(1, 2)', { fill: C.ink, size: 17, weight: 700, anchor: 'start' });
          p.text(4.3, 8.2, '(4, 8)', { fill: C.ink, size: 17, weight: 700, anchor: 'start' });
          p.text(2.5, 2.3, 'run', { fill: C.blue, size: 16, weight: 700 });
          p.text(4.25, 4.9, 'rise', { fill: C.green, size: 16, weight: 700, anchor: 'start' });
          var msgs = [
            null,
            'That is run divided by rise. The slope is rise divided by run.',
            'That is the rise alone. Divide it by the run, 4 − 1 = 3.',
            'That is the run alone. The slope is the rise, 8 − 2 = 6, divided by the run.'
          ];
          M4.choices(el, {
            options: ['\\(2\\)', '\\(\\tfrac{1}{2}\\)', '\\(6\\)', '\\(3\\)'],
            correct: 0,
            onCorrect: function () {
              ctx.note('\\(m = \\dfrac{8 - 2}{4 - 1} = \\dfrac{6}{3} = 2\\).');
              ctx.solved();
            },
            onWrong: function (i) { ctx.wrong(msgs[i] || 'Divide the rise by the run.'); }
          });
        }
      },

      // 8
      {
        kind: 'explore',
        title: 'Shifting and scaling a graph',
        html:
          '<p>Starting from a base function \\(f\\), the function \\(g(x) = a\\,f(x - h) + k\\) has the graph of \\(f\\) stretched vertically by the factor \\(a\\) and then moved \\(h\\) units to the right and \\(k\\) units up. A negative \\(a\\) also reflects the graph in the horizontal axis.</p>' +
          '<p>Drag the orange handle to shift the graph and use the slider to scale it. The dashed curve is the unchanged base function.</p>',
        mount: function (el, ctx) {
          var base = 'sq', a = 1, h = 0, k = 0;
          var fns = { sq: function (x) { return x * x; }, abs: function (x) { return Math.abs(x); } };
          var row = M4.el('div', { class: 'm4-row' }, el);
          var bSq = M4.button(row, 'f(x) = x²', function () { base = 'sq'; update(); });
          var bAbs = M4.button(row, 'f(x) = |x|', function () { base = 'abs'; update(); });
          var pills = M4.el('div', { class: 'functions-s1-pills' }, el);
          var roG = readout(pills), roH = readout(pills), roK = readout(pills);
          var p = M4.plane(el, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 520, height: 520 });
          var ghost = p.path([[-5, -5], [-5, -5]], { stroke: C.muted, width: 2 });
          ghost.el.setAttribute('stroke-dasharray', '6 6');
          ghost.el.setAttribute('opacity', '0.6');
          var curve = p.path([[-5, -5], [-5, -5]], { stroke: C.orange, width: 4 });
          function update() {
            var f = fns[base];
            bSq.classList.toggle('primary', base === 'sq');
            bAbs.classList.toggle('primary', base === 'abs');
            ghost.set(curvePts(f, -5, 5, -5, 5));
            curve.set(curvePts(function (x) { return a * f(x - h) + k; }, -5, 5, -5, 5));
            roG.tex(shiftTex(base, a, h, k));
            roH.tex('h = ' + num(h) + '\\ (\\text{right})');
            roK.tex('k = ' + num(k) + '\\ (\\text{up})');
          }
          p.handle(h, k, {
            color: C.orange, snap: 0.5, bounds: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 },
            onDrag: function (x, y) { h = r2(x); k = r2(y); update(); },
            onEnd: function (x, y) { h = r2(x); k = r2(y); update(); }
          });
          var sl = M4.el('div', { class: 'functions-s1-sliders' }, el);
          M4.slider(sl, {
            min: -2, max: 2, step: 0.25, value: a, label: 'scale a',
            format: function (v) { return numTxt(v); },
            onInput: function (v) { a = Number(v); update(); }
          });
          update();
        }
      },

      // 9
      {
        kind: 'exercise',
        title: 'A shifted parabola',
        html:
          '<p>The dashed curve is the base function \\(f(x) = x^2\\), whose lowest point lies at the origin. Drag the handle so that the orange curve is the graph of</p>' +
          '\\[ g(x) = (x - 2)^2 - 3. \\]',
        hint: 'The squared term is smallest when x − 2 = 0, that is at x = 2, and the value there is −3. The lowest point of the graph is therefore (2, −3).',
        mount: function (el, ctx) {
          var h = 0, k = 0, done = false;
          var pills = M4.el('div', { class: 'functions-s1-pills' }, el);
          var roT = readout(pills), roC = readout(pills);
          roT.tex('\\text{target: } g(x) = (x - 2)^2 - 3');
          var p = M4.plane(el, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 520, height: 520 });
          var ghost = p.path(curvePts(function (x) { return x * x; }, -5, 5, -5, 5), { stroke: C.muted, width: 2 });
          ghost.el.setAttribute('stroke-dasharray', '6 6');
          ghost.el.setAttribute('opacity', '0.6');
          var curve = p.path([[-5, -5], [-5, -5]], { stroke: C.orange, width: 4 });
          function draw() {
            curve.set(curvePts(function (x) { return (x - h) * (x - h) + k; }, -5, 5, -5, 5));
            roC.tex('\\text{current: } ' + shiftTex('sq', 1, h, k));
          }
          function check() {
            if (done) return;
            if (h === 2 && k === -3) {
              done = true;
              curve.el.setAttribute('stroke', C.green);
              ctx.note('The graph of \\(x^2\\) moved 2 units to the right and 3 units down.');
              ctx.solved();
            } else if (h === -2) {
              ctx.note('The curve is now \\((x + 2)^2\\), which is shifted to the left. Subtracting 2 inside the bracket moves the graph to the right.');
            } else if (h === 2) {
              ctx.note('The horizontal position is correct. The constant \\(-3\\) outside the bracket moves the graph 3 units down.');
            } else if (k === -3) {
              ctx.note('The vertical position is correct. The term \\((x - 2)^2\\) is zero at \\(x = 2\\), so the lowest point must lie there.');
            } else {
              ctx.note('The lowest point is at \\((' + num(h) + ', ' + num(k) + ')\\). Find where \\((x - 2)^2\\) is zero and which value \\(g\\) takes there.');
            }
          }
          p.handle(h, k, {
            color: C.orange, snap: 1, bounds: { xmin: -4, xmax: 4, ymin: -4, ymax: 4 },
            onDrag: function (x, y) { h = Math.round(x); k = Math.round(y); draw(); },
            onEnd: function (x, y) { h = Math.round(x); k = Math.round(y); draw(); check(); }
          });
          draw();
        }
      },

      // 10
      {
        kind: 'exercise',
        title: 'Formulas and transformations',
        html:
          '<p>Each formula below changes the graph of a function \\(f\\) in one specific way. Changes outside \\(f\\) act on the output and move the graph vertically. Changes inside the bracket act on the input and move it horizontally.</p>' +
          '<p>Drag each formula to the transformation it produces.</p>',
        hint: 'f(x − 2) reaches a given output two units later than f does, so its graph lies two units to the right. Adding a number to x has the opposite effect.',
        mount: function (el, ctx) {
          var items = [
            { key: 'up', tex: 'f(x) + 2', desc: 'shifted 2 units up' },
            { key: 'right', tex: 'f(x - 2)', desc: 'shifted 2 units to the right' },
            { key: 'left', tex: 'f(x + 2)', desc: 'shifted 2 units to the left' },
            { key: 'stretch', tex: '2\\,f(x)', desc: 'stretched vertically by the factor 2' },
            { key: 'flip', tex: '-f(x)', desc: 'reflected in the horizontal axis' }
          ];
          var why = {
            up: 'Adding 2 to the output raises every point of the graph by 2.',
            right: 'Subtracting 2 from the input moves the graph 2 units to the right.',
            left: 'Adding 2 to the input moves the graph 2 units to the left.',
            stretch: 'Multiplying the output by 2 doubles every height.',
            flip: 'Negating the output mirrors the graph in the horizontal axis.'
          };
          var tray = M4.el('div', { class: 'functions-s1-tray' }, el);
          var grid = M4.el('div', { class: 'functions-s1-match' }, el);
          var order = [3, 1, 4, 0, 2];
          var tokens = order.map(function (i) {
            var t = M4.el('div', { class: 'm4-token functions-s1-tok', html: M4.tex(items[i].tex) }, tray);
            t.setAttribute('data-key', items[i].key);
            return t;
          });
          var slots = items.map(function (it) {
            M4.el('div', { class: 'functions-s1-desc', text: it.desc }, grid);
            var sl = M4.el('div', { class: 'm4-slot functions-s1-slotbox' }, grid);
            sl.setAttribute('data-key', it.key);
            return sl;
          });
          var placed = 0;
          M4.dragDrop({
            tokens: tokens,
            slots: slots,
            onDrop: function (tok, slot) {
              var tk = tok.getAttribute('data-key'), sk = slot.getAttribute('data-key');
              if (slot.classList.contains('filled') && tok.parentNode !== slot) {
                tray.appendChild(tok);
                return;
              }
              if (tk === sk) {
                if (tok.classList.contains('functions-s1-locked')) return;
                slot.appendChild(tok);
                slot.classList.add('filled');
                tok.classList.add('functions-s1-locked', 'm4-pop');
                placed += 1;
                ctx.note(why[tk]);
                if (placed === items.length) ctx.solved();
              } else {
                tray.appendChild(tok);
                ctx.wrong(why[tk]);
              }
            },
            onMiss: function (tok) {
              if (!tok.classList.contains('functions-s1-locked')) tray.appendChild(tok);
            }
          });
        }
      },

      // 11
      {
        kind: 'exercise',
        title: 'A line through data',
        html:
          '<p>The simplest learning system predicts an output with a line, \\(\\hat{y} = wx + b\\). As in the vectors module, \\(w\\) is called a weight. The intercept \\(b\\) is called the bias. Learning means adjusting \\(w\\) and \\(b\\) until the predictions are close to the observed data points \\((x_i, y_i)\\).</p>' +
          '<p>Closeness is measured by the mean squared error, the average of the squared vertical distances \\((y_i - \\hat{y}_i)^2\\), drawn in pink. Adjust \\(w\\) and \\(b\\) until the mean squared error is below \\(0.05\\), then check.</p>',
        hint: 'First set b to the height at which the points cross the vertical axis, close to 1. Then tilt the line: the points rise by about 1 for every 2 units to the right.',
        mount: function (el, ctx) {
          var xs = [-4, -2, 0, 2, 4], ys = [-1.2, 0.2, 0.9, 2.1, 2.9];
          var w = -0.5, b = -1, done = false;
          var pills = M4.el('div', { class: 'functions-s1-pills' }, el);
          var roEq = readout(pills), roE = readout(pills);
          var p = M4.plane(el, { xmin: -5, xmax: 5, ymin: -4, ymax: 5, width: 520, height: 468 });
          var res = xs.map(function () { return p.line(0, 0, 0, 0, { stroke: C.pink, width: 4 }); });
          var ln = p.line(0, 0, 0, 0, { stroke: C.orange, width: 4 });
          xs.forEach(function (x, i) { p.point(x, ys[i], { r: 8, fill: C.blue }); });
          function resid() { return xs.map(function (x, i) { return ys[i] - (w * x + b); }); }
          function mse() {
            var r = resid(), sum = 0;
            for (var i = 0; i < r.length; i++) sum += r[i] * r[i];
            return sum / r.length;
          }
          function update() {
            var c = clipLine(w, b, -5, 5, -4, 5);
            ln.set(c[0], c[1], c[2], c[3]);
            xs.forEach(function (x, i) {
              var yh = Math.max(-4, Math.min(5, w * x + b));
              res[i].set(x, ys[i], x, yh);
            });
            var e = mse();
            roEq.tex(lineTex(w, b, '\\hat{y}'));
            roE.tex('\\text{mean squared error} = ' + e.toFixed(3));
            roE.el.style.color = e < 0.05 ? C.green : '';
          }
          var sl = M4.el('div', { class: 'functions-s1-sliders' }, el);
          M4.slider(sl, {
            min: -1, max: 2, step: 0.1, value: w, label: 'weight w',
            format: function (v) { return numTxt(v); },
            onInput: function (v) { w = r2(Number(v)); update(); }
          });
          M4.slider(sl, {
            min: -3, max: 3, step: 0.1, value: b, label: 'bias b',
            format: function (v) { return numTxt(v); },
            onInput: function (v) { b = r2(Number(v)); update(); }
          });
          var row = M4.el('div', { class: 'm4-row', style: 'margin-top:14px' }, el);
          M4.button(row, 'Check', function () {
            if (done) return;
            var e = mse();
            if (e < 0.05) {
              done = true;
              ln.el.setAttribute('stroke', C.green);
              ctx.note('Mean squared error \\(' + e.toFixed(3) + '\\). The fitted line \\(' + lineTex(w, b, '\\hat{y}') + '\\) passes close to every point.');
              ctx.solved();
              return;
            }
            var r = resid(), mean = 0, tilt = 0;
            for (var i = 0; i < r.length; i++) { mean += r[i] / r.length; tilt += r[i] * xs[i]; }
            if (Math.abs(mean) > 0.1) {
              ctx.wrong('Mean squared error ' + e.toFixed(3) + '. On average the line lies ' + (mean > 0 ? 'below' : 'above') + ' the points, so ' + (mean > 0 ? 'increase' : 'decrease') + ' the bias b.');
            } else {
              ctx.wrong('Mean squared error ' + e.toFixed(3) + '. The height is about right, but the line is ' + (tilt > 0 ? 'too flat' : 'too steep') + ', so ' + (tilt > 0 ? 'increase' : 'decrease') + ' the weight w.');
            }
          }, { primary: true });
          update();
        }
      },

      // 12
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>A function \\(f\\) assigns exactly one output \\(f(x)\\) to each input \\(x\\). Its graph is the set of points \\((x, f(x))\\).</li>' +
          '<li>A line \\(y = mx + b\\) has intercept \\(b\\), its value at \\(x = 0\\), and slope \\(m = \\dfrac{y_2 - y_1}{x_2 - x_1}\\), the rise per unit of run.</li>' +
          '<li>The graph of \\(a\\,f(x - h) + k\\) is the graph of \\(f\\) stretched vertically by \\(a\\) and then shifted \\(h\\) to the right and \\(k\\) up. A line \\(\\hat{y} = wx + b\\) is fitted to data by choosing \\(w\\) and \\(b\\) to make the mean squared error small.</li>' +
          '</ul>' +
          '<p>The next session treats exponential functions, whose outputs are multiplied by a fixed factor for every unit step of the input.</p>'
      }
    ]
  });
})();
