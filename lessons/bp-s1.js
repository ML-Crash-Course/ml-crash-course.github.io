(function () {
  'use strict';

  var C = M4.colors;
  var NS = 'http://www.w3.org/2000/svg';

  function chip(parent, label, color) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    var l = M4.el('span', { text: label + ' ' }, r);
    l.style.fontWeight = '700';
    if (color) l.style.color = color;
    var v = M4.el('span', { text: '' }, r);
    return function (t) { v.textContent = t; };
  }
  function f(v, d) { return M4.fmt(v, d == null ? 2 : d); }
  function row(el) { return M4.el('div', { class: 'm4-row', style: 'justify-content:center;margin-top:8px' }, el); }
  function ctl(el) { return M4.el('div', { style: 'max-width:420px;margin:8px auto 0' }, el); }

  /* ---------- small SVG kit for gate diagrams ---------- */
  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgRoot(el, w, h) {
    return mk('svg', { viewBox: '0 0 ' + w + ' ' + h, style: 'width:100%;max-width:' + w + 'px;height:auto;display:block;margin:0 auto;user-select:none' }, el);
  }
  function txt(parent, x, y, s, o) {
    o = o || {};
    var t = mk('text', { x: x, y: y, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': 'middle', 'font-size': o.size || 20, 'font-weight': o.weight || 600, fill: o.fill || C.ink }, parent);
    t.textContent = s;
    return t;
  }
  // an edge with a value label above and a gradient label below
  function edge(svg, x1, y1, x2, y2, t) {
    t = t == null ? 0.45 : t;
    var line = mk('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: C.line, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    var mx = x1 + t * dx, my = y1 + t * dy;
    var val = txt(svg, mx - 18 * nx, my - 18 * ny, '', { fill: C.ink });
    var grad = txt(svg, mx + 22 * nx, my + 22 * ny, '', { fill: C.red });
    return {
      value: function (s) { val.textContent = s; },
      grad: function (s) { grad.textContent = s; },
      color: function (c) { line.setAttribute('stroke', c); }
    };
  }
  function gate(svg, x, y, sym) {
    var c = mk('circle', { cx: x, cy: y, r: 30, fill: '#fff', stroke: C.line, 'stroke-width': 3 }, svg);
    txt(svg, x, y + 1, sym, { size: sym.length > 1 ? 17 : 26, weight: 700 });
    return { on: function (b) { c.setAttribute('stroke', b ? C.ink : C.line); } };
  }
  function legend(el) {
    var p = M4.el('p', { class: 'm4-cap' }, el);
    p.innerHTML = '<b style="color:' + C.ink + '">Above each wire</b> the forward value, <b style="color:' + C.red + '">below</b> the gradient of the output with respect to it.';
  }

  /* ---------- f = (x + y) z, step by step ---------- */
  function graphScene(el, o) {
    o = o || {};
    var X = -2, Y = 5, Z = -4, Q = X + Y, F = Q * Z;
    var svg = svgRoot(el, 720, 320);
    txt(svg, 40, 40, 'x', { size: 24, weight: 700 });
    txt(svg, 40, 196, 'y', { size: 24, weight: 700 });
    txt(svg, 40, 284, 'z', { size: 24, weight: 700 });
    txt(svg, 690, 176, 'f', { size: 24, weight: 700 });
    var ex = edge(svg, 64, 40, 292, 102);
    var ey = edge(svg, 64, 196, 292, 130);
    var eq = edge(svg, 350, 122, 512, 166, 0.5);
    var ez = edge(svg, 64, 284, 514, 188, 0.6);
    var ef = edge(svg, 570, 176, 668, 176, 0.5);
    var gq = gate(svg, 320, 116, '+');
    var gf = gate(svg, 540, 176, '×');
    txt(svg, 320, 66, 'q', { size: 18, fill: C.muted });
    var bar = row(el);
    var cap = M4.el('p', { style: 'text-align:center;min-height:56px;margin:12px auto 0;max-width:560px' }, el);
    legend(el);
    var steps = [
      { cap: 'The inputs are \\(x = -2\\), \\(y = 5\\) and \\(z = -4\\).' },
      { cap: 'The \\(+\\) gate computes \\(q = x + y = 3\\).', g: gq },
      { cap: 'The \\(\\times\\) gate computes \\(f = q z = -12\\). The forward pass is complete.', g: gf },
      { cap: 'The backward pass starts at the output with \\(\\partial f / \\partial f = 1\\).' },
      { cap: 'Local gradient of \\(\\times\\) with respect to \\(q\\) is \\(z = -4\\). Times the upstream \\(1\\) gives \\(\\partial f / \\partial q = -4\\).', g: gf },
      { cap: 'Local gradient of \\(\\times\\) with respect to \\(z\\) is \\(q = 3\\). Times the upstream \\(1\\) gives \\(\\partial f / \\partial z = 3\\).', g: gf },
      { cap: 'Local gradients of \\(+\\) are both \\(1\\). Times the upstream \\(-4\\) gives \\(\\partial f / \\partial x = \\partial f / \\partial y = -4\\).', g: gq }
    ];
    var s = 0;
    var next = M4.button(bar, 'Next step', function () { if (s < steps.length - 1) { s++; paint(); } }, { primary: true });
    M4.button(bar, 'Reset', function () { s = 0; paint(); });
    function paint() {
      ex.value(f(X)); ey.value(f(Y)); ez.value(f(Z));
      eq.value(s >= 1 ? f(Q) : ''); ef.value(s >= 2 ? f(F) : '');
      ef.grad(s >= 3 ? '1' : ''); eq.grad(s >= 4 ? f(Z) : ''); ez.grad(s >= 5 ? f(Q) : '');
      ex.grad(s >= 6 ? f(Z) : ''); ey.grad(s >= 6 ? f(Z) : '');
      gq.on(steps[s].g === gq); gf.on(steps[s].g === gf);
      cap.innerHTML = steps[s].cap;
      M4.typeset(cap);
      next.disabled = s === steps.length - 1;
      if (o.onStep) o.onStep(s, steps.length - 1);
    }
    paint();
  }

  /* ---------- a single gate with adjustable inputs ---------- */
  var GATES = {
    add: { sym: '+', name: 'Add', out: function (a, b) { return a + b; }, da: function (a, b) { return 1; }, db: function (a, b) { return 1; },
      cap: 'The add gate passes the upstream gradient unchanged to both inputs.' },
    mul: { sym: '×', name: 'Multiply', out: function (a, b) { return a * b; }, da: function (a, b) { return b; }, db: function (a, b) { return a; },
      cap: 'The multiply gate sends each input the upstream gradient times the other input.' },
    max: { sym: 'max', name: 'Max', out: function (a, b) { return Math.max(a, b); }, da: function (a, b) { return a >= b ? 1 : 0; }, db: function (a, b) { return a >= b ? 0 : 1; },
      cap: 'The max gate sends the whole upstream gradient to the larger input and zero to the other.' }
  };
  function gateScene(el, o) {
    o = o || {};
    var mode = o.mode || 'add';
    var a = o.a == null ? 2 : o.a, b = o.b == null ? -1 : o.b, g = o.g == null ? 1.5 : o.g;
    if (!o.fixed) {
      var tabs = row(el), tb = {};
      Object.keys(GATES).forEach(function (k) {
        tb[k] = M4.button(tabs, GATES[k].name, function () { mode = k; build(); paint(); });
      });
    }
    var holder = M4.el('div', {}, el);
    var cap = M4.el('p', { class: 'm4-cap', style: 'min-height:24px' }, el);
    legend(el);
    var sl = ctl(el);
    M4.slider(sl, { min: -3, max: 3, step: 0.5, value: a, label: 'input a', format: function (v) { return f(v, 1); }, onInput: function (v) { a = v; paint(); } });
    M4.slider(sl, { min: -3, max: 3, step: 0.5, value: b, label: 'input b', format: function (v) { return f(v, 1); }, onInput: function (v) { b = v; paint(); } });
    M4.slider(sl, { min: -3, max: 3, step: 0.5, value: g, label: 'upstream gradient', format: function (v) { return f(v, 1); }, onInput: function (v) { g = v; paint(); } });
    var ea, eb, eo;
    function build() {
      holder.innerHTML = '';
      var svg = svgRoot(holder, 600, 230);
      txt(svg, 50, 44, 'a', { size: 24, weight: 700 });
      txt(svg, 50, 186, 'b', { size: 24, weight: 700 });
      txt(svg, 560, 115, 'out', { size: 20, weight: 700 });
      ea = edge(svg, 76, 44, 272, 101, 0.4);
      eb = edge(svg, 76, 186, 272, 129, 0.4);
      eo = edge(svg, 330, 115, 524, 115, 0.5);
      gate(svg, 300, 115, GATES[mode].sym).on(true);
      if (tb) Object.keys(tb).forEach(function (k) { tb[k].classList.toggle('primary', k === mode); });
    }
    function paint() {
      var G = GATES[mode], ga = G.da(a, b) * g, gb = G.db(a, b) * g;
      ea.value(f(a)); eb.value(f(b)); eo.value(f(G.out(a, b)));
      eo.grad(f(g)); ea.grad(f(ga)); eb.grad(f(gb));
      cap.textContent = G.cap;
      if (o.onChange) o.onChange(ga, gb, a, b, g);
    }
    build(); paint();
  }

  /* ---------- sigmoid and its slope ---------- */
  function sig(x) { return 1 / (1 + Math.exp(-x)); }
  function sigmoidScene(el) {
    var P = M4.plane(el, { xmin: -6.5, xmax: 6.5, ymin: -0.15, ymax: 1.15, width: 560, height: 300 });
    P.line(-6.5, 0, 6.5, 0, { stroke: C.line, width: 1.5, layer: 'bg' });
    P.line(0, -0.15, 0, 1.15, { stroke: C.line, width: 1.5, layer: 'bg' });
    P.line(-6.5, 1, 6.5, 1, { stroke: C.line, width: 1, dash: '4 5', layer: 'bg' });
    P.fn(sig, { stroke: C.blue, width: 3 });
    P.fn(function (x) { var s = sig(x); return s * (1 - s); }, { stroke: C.orange, width: 2.5 });
    P.text(5.9, 0.9, 'σ(x)', { size: 17, fill: C.blue, anchor: 'end' });
    P.text(3.4, 0.14, 'slope', { size: 17, fill: C.orange, anchor: 'start' });
    var tan = P.line(0, 0, 0, 0, { stroke: C.ink, width: 1.8, dash: '6 5' });
    var p1 = P.point(0, 0, { color: C.blue, r: 7 });
    var p2 = P.point(0, 0, { color: C.orange, r: 6 });
    var r1 = row(el);
    var c1 = chip(r1, 'σ(x)', C.blue), c2 = chip(r1, 'σ(x)(1 − σ(x))', C.orange);
    var x = 1;
    function paint() {
      var s = sig(x), d = s * (1 - s);
      p1.set(x, s); p2.set(x, d);
      tan.set(x - 1.6, s - 1.6 * d, x + 1.6, s + 1.6 * d);
      c1(f(s, 3)); c2(f(d, 3));
    }
    M4.slider(ctl(el), { min: -6, max: 6, step: 0.1, value: x, label: 'x', format: function (v) { return f(v, 1); }, onInput: function (v) { x = v; paint(); } });
    paint();
  }

  /* ---------- generated practice ---------- */
  function gen() {
    var kind = M4.pick(['add', 'mul', 'max', 'fan', 'sig', 'chain']);
    var a = M4.rand(-5, 5) || 2, b = M4.rand(-5, 5) || -3, g = M4.pick([-3, -2, -1, 2, 3, 4]);
    if (kind === 'add') return {
      q: 'An add gate receives \\(a = ' + a + '\\) and \\(b = ' + b + '\\), and the gradient arriving from above is \\(' + g + '\\). What gradient does it send to \\(b\\)?',
      answer: g, explain: 'The local gradient of \\(a + b\\) with respect to \\(b\\) is \\(1\\), so \\(b\\) receives \\(1 \\cdot ' + g + ' = ' + g + '\\).'
    };
    if (kind === 'mul') return {
      q: 'A multiply gate computes \\(a \\cdot b\\) with \\(a = ' + a + '\\) and \\(b = ' + b + '\\). The upstream gradient is \\(' + g + '\\). What gradient does it send to \\(a\\)?',
      answer: b * g, hint: 'The local gradient with respect to \\(a\\) is the other input.',
      explain: '\\(\\partial (ab) / \\partial a = b = ' + b + '\\), times the upstream \\(' + g + '\\) gives \\(' + (b * g) + '\\).'
    };
    if (kind === 'max') {
      if (a === b) b = a + 2;
      var big = a > b ? 'a' : 'b', ask = M4.pick(['a', 'b']);
      var ans = ask === big ? g : 0;
      return {
        q: 'A max gate receives \\(a = ' + a + '\\) and \\(b = ' + b + '\\), and the upstream gradient is \\(' + g + '\\). What gradient does it send to \\(' + ask + '\\)?',
        answer: ans,
        explain: 'The output equals \\(' + big + '\\), so \\(' + big + '\\) receives the full \\(' + g + '\\) and the other input receives \\(0\\).'
      };
    }
    if (kind === 'fan') {
      var x = M4.rand(1, 4), y = M4.rand(-4, 4) || 3, z = M4.rand(-4, 4) || -2;
      return {
        q: 'Compute \\(\\partial f / \\partial x\\) for \\(f = x y + x z\\) at \\(x = ' + x + '\\), \\(y = ' + y + '\\), \\(z = ' + z + '\\).',
        answer: y + z, hint: '\\(x\\) feeds two multiply gates. Add the gradients from both paths.',
        explain: 'One path gives \\(y = ' + y + '\\), the other \\(z = ' + z + '\\). Their sum is \\(' + (y + z) + '\\).'
      };
    }
    if (kind === 'sig') {
      var s = M4.pick([0.1, 0.2, 0.25, 0.5, 0.6, 0.8, 0.9]), gs = M4.pick([1, 2, 4, -2]);
      var d = s * (1 - s) * gs;
      return {
        q: 'A sigmoid gate outputs \\(\\sigma = ' + s + '\\), and the upstream gradient is \\(' + gs + '\\). What gradient does it send to its input?',
        answer: d, tol: 0.001, hint: 'The local gradient is \\(\\sigma (1 - \\sigma)\\).',
        explain: '\\(' + s + ' \\cdot ' + M4.fmt(1 - s, 2) + ' \\cdot ' + gs + ' = ' + M4.fmt(d, 3) + '\\).'
      };
    }
    var c = M4.rand(-3, 3), dd = M4.pick([-3, -2, 2, 3]);
    return {
      q: 'For \\(f = (a b + c)\\, d\\) with \\(a = ' + a + '\\), \\(b = ' + b + '\\), \\(c = ' + c + '\\), \\(d = ' + dd + '\\), compute \\(\\partial f / \\partial a\\).',
      answer: dd * b, hint: 'The multiply by \\(d\\) sends \\(d\\) back, the add passes it on, and the product \\(ab\\) multiplies it by \\(b\\).',
      explain: '\\(\\partial f / \\partial a = d \\cdot 1 \\cdot b = ' + dd + ' \\cdot ' + b + ' = ' + (dd * b) + '\\).'
    };
  }

  M4.lesson({
    id: 'bp-s1',
    module: 'backprop',
    title: 'The chain rule on a graph',
    summary: 'Any expression can be split into small operations called gates. The gradient of the output flows backwards through these gates, with one multiplication at each gate.',
    minutes: 19,
    steps: [
      {
        kind: 'text',
        title: 'Expressions as graphs',
        html: '<p>The expression \\(f(x, y, z) = (x + y)\\, z\\) can be computed in two steps:</p>' +
          '\\[ q = x + y, \\qquad f = q\\, z. \\]' +
          '<p>Drawn as a graph, each step is a <b>gate</b> with inputs on the left and one output on the right. The <b>forward pass</b> evaluates the gates from left to right. The <b>backward pass</b> then computes the gradient of \\(f\\) with respect to every wire, from right to left.</p>' +
          '<p>Each gate only needs to know its own <b>local gradient</b>, the derivative of its output with respect to each of its inputs. The chain rule does the rest:</p>' +
          '\\[ \\frac{\\partial f}{\\partial x} = \\underbrace{\\frac{\\partial f}{\\partial q}}_{\\text{upstream}} \\cdot \\underbrace{\\frac{\\partial q}{\\partial x}}_{\\text{local}}. \\]'
      },
      {
        kind: 'explore',
        title: 'Forward and backward pass',
        html: '<p>Step through both passes for \\(x = -2\\), \\(y = 5\\), \\(z = -4\\).</p>',
        mount: function (el) { graphScene(el); }
      },
      {
        kind: 'exercise',
        title: 'Gradients of a small graph',
        html: '<p>In the graph of the previous step, increasing \\(x\\) by a small amount \\(\\varepsilon\\) changes \\(f\\) by approximately how much?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['\\(-4\\varepsilon\\)', '\\(3\\varepsilon\\)', '\\(\\varepsilon\\)', '\\(-12\\varepsilon\\)'],
            correct: 0,
            onCorrect: function () { ctx.solved('\\(\\partial f / \\partial x = -4\\). A check: \\((-2 + \\varepsilon + 5)(-4) = -12 - 4\\varepsilon\\).'); },
            onWrong: function () { ctx.wrong(); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Three gate patterns',
        html: '<p>Most of the gradient flow in a network goes through three kinds of gates, and each has a simple rule.</p>' +
          '<ul><li><b>Add</b> \\(a + b\\). Both local gradients are \\(1\\), so the upstream gradient is copied to every input.</li>' +
          '<li><b>Multiply</b> \\(a b\\). The local gradient with respect to \\(a\\) is \\(b\\) and the other way round, so each input receives the upstream gradient scaled by the other input.</li>' +
          '<li><b>Max</b> \\(\\max(a, b)\\). The local gradient is \\(1\\) for the larger input and \\(0\\) for the smaller, so the whole gradient is routed to the input that won. ReLU is a max gate with one input fixed at \\(0\\).</li></ul>'
      },
      {
        kind: 'explore',
        title: 'Add, multiply and max gates',
        html: '<p>Choose a gate, then move the inputs and the upstream gradient.</p>',
        mount: function (el) { gateScene(el); }
      },
      {
        kind: 'exercise',
        title: 'Gradient routing',
        html: '<p>Set the multiply gate so that the gradient reaching \\(a\\) is \\(6\\).</p>',
        hint: 'The gradient reaching \\(a\\) is \\(b\\) times the upstream gradient.',
        mount: function (el, ctx) {
          var done = false;
          gateScene(el, {
            mode: 'mul', fixed: true, a: 1, b: 1, g: 1, onChange: function (ga, gb, a, b, g) {
              if (done || Math.abs(ga - 6) > 1e-9) return;
              done = true;
              ctx.solved('\\(b \\cdot g = ' + f(b) + ' \\cdot ' + f(g) + ' = 6\\). The value of \\(a\\) itself plays no role in its own gradient.');
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Branching wires',
        html: '<p>A variable can feed more than one gate. In \\(f = x y + x\\), the input \\(x\\) enters a multiply gate and an add gate. A small change in \\(x\\) changes \\(f\\) along both paths, and the two effects add up:</p>' +
          '\\[ \\frac{\\partial f}{\\partial x} = \\underbrace{y}_{\\text{through } x y} + \\underbrace{1}_{\\text{through } + x}. \\]' +
          '<p>In the backward pass this means that gradients arriving at the same wire from several gates are <b>summed</b>. Autograd libraries implement this by accumulating into a buffer, which is why gradients have to be reset to zero before every training step.</p>'
      },
      {
        kind: 'exercise',
        title: 'A variable used twice',
        html: '<p>For \\(f = x y + x\\) at \\(x = 3\\), \\(y = 4\\), what is \\(\\partial f / \\partial x\\)?</p>',
        mount: function (el, ctx) {
          M4.choices(el, {
            options: ['\\(4\\)', '\\(5\\)', '\\(1\\)', '\\(7\\)'],
            correct: 1,
            onCorrect: function () { ctx.solved('\\(y + 1 = 5\\). The path through \\(x y\\) contributes \\(4\\), the direct path \\(1\\).'); },
            onWrong: function () { ctx.wrong(); }
          });
        }
      },
      {
        kind: 'text',
        title: 'Composite gates',
        html: '<p>Gates can be as large as convenient, as long as their local gradient is known. The sigmoid \\(\\sigma(x) = 1 / (1 + e^{-x})\\) could be split into a negation, an exponential, an addition and a reciprocal. Treated as one gate, its derivative has a compact form:</p>' +
          '\\[ \\sigma\'(x) = \\sigma(x)\\,\\bigl(1 - \\sigma(x)\\bigr). \\]' +
          '<p>The backward pass can therefore reuse the output stored during the forward pass, without evaluating any exponential again.</p>'
      },
      {
        kind: 'explore',
        title: 'The slope of the sigmoid',
        html: '<p>Move \\(x\\) and compare the slope of the dashed tangent with the height of the orange curve, which plots \\(\\sigma(1 - \\sigma)\\).</p>',
        mount: function (el) {
          sigmoidScene(el);
          M4.el('p', { class: 'm4-cap', html: 'The slope is largest at \\(x = 0\\), where it equals \\(0.25\\). Far from zero the gate passes back almost nothing.' }, el);
          M4.typeset(el);
        }
      },
      {
        kind: 'exercise',
        title: 'Gradients through gates',
        html: '<p>Round to three decimals where needed.</p>',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 4, gen: gen }); }
      },
      {
        kind: 'explore',
        title: 'Checking a gradient',
        html: '<p>A hand-written backward pass is easy to get wrong. The standard test compares it with a <b>finite difference</b>, which only needs the forward pass:</p>' +
          '\\[ \\frac{f(x + \\varepsilon) - f(x)}{\\varepsilon} \\quad\\text{(one-sided)}, \\qquad \\frac{f(x + \\varepsilon) - f(x - \\varepsilon)}{2\\varepsilon} \\quad\\text{(centred)}. \\]' +
          '<p>Here \\(f = \\sigma\\), and the backward pass gives \\(\\sigma(x)(1 - \\sigma(x))\\). The orange line runs through the two points at \\(x \\pm \\varepsilon\\). Shrink \\(\\varepsilon\\) step by step and compare the errors of both formulas.</p>',
        mount: function (el) {
          var sig = function (t) { return 1 / (1 + Math.exp(-t)); };
          var p = M4.plane(el, { xmin: -6, xmax: 6, ymin: -0.15, ymax: 1.15, width: 600, height: 280 });
          p.fn(sig, { stroke: C.ink, width: 2.5 });
          var tan = p.path([], { stroke: C.blue, width: 7, opacity: 0.3 });
          var sec = p.path([], { stroke: C.orange, width: 2.5, dash: '7 5' });
          var a = p.point(0, 0, { r: 5, color: C.orange }), b = p.point(0, 0, { r: 5, color: C.orange });
          var x0 = 1, le = 0;
          var h = p.handle(x0, sig(x0), { color: C.blue, constrain: function (x) { x = Math.max(-5, Math.min(5, x)); return [x, sig(x)]; }, onDrag: function (x) { x0 = x; draw(); } });
          var tbl = M4.el('div', { style: 'max-width:520px;margin:8px auto' }, el);
          M4.slider(el, { min: -12, max: 0, step: 0.5, value: 0, label: '\\(\\log_{10} \\varepsilon\\)', format: function (v) { var sup = { '-': '\u207b', '.': '\u00b7', '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079' }; return '\u03b5 = 10' + String(v).split('').map(function (c) { return sup[c]; }).join(''); }, onInput: function (v) { le = v; draw(); } });
          function sci(v) { if (v === 0) return '0'; var e = Math.floor(Math.log10(Math.abs(v))); return (v / Math.pow(10, e)).toFixed(1) + '·' + '10<sup>' + e + '</sup>'; }
          function draw() {
            var eps = Math.pow(10, le), s = sig(x0), g = s * (1 - s);
            var one = (sig(x0 + eps) - s) / eps, cen = (sig(x0 + eps) - sig(x0 - eps)) / (2 * eps);
            tan.set([[x0 - 3, s - 3 * g], [x0 + 3, s + 3 * g]]);
            var ya = sig(x0 - eps), yb = sig(x0 + eps);
            sec.set([[x0 - 3, s - 3 * cen], [x0 + 3, s + 3 * cen]]);
            a.set(x0 - eps, ya); b.set(x0 + eps, yb);
            tbl.innerHTML = '<table class="m4-table" style="width:100%;text-align:center;border-collapse:collapse">' +
              '<tr style="color:' + C.muted + '"><td></td><td>value</td><td>error</td></tr>' +
              '<tr><td style="text-align:left;color:' + C.blue + '"><b>backward pass</b></td><td>' + g.toFixed(8) + '</td><td></td></tr>' +
              '<tr><td style="text-align:left">one-sided</td><td>' + one.toFixed(8) + '</td><td>' + sci(Math.abs(one - g)) + '</td></tr>' +
              '<tr><td style="text-align:left;color:' + C.orange + '"><b>centred</b></td><td>' + cen.toFixed(8) + '</td><td>' + sci(Math.abs(cen - g)) + '</td></tr></table>';
          }
          draw();
          M4.el('p', { class: 'm4-cap', text: 'Each factor of ten in ε cuts the one-sided error by ten and the centred error by a hundred. The centred error is smallest near 10⁻⁵ and the one-sided error near 10⁻⁸. Below that both grow again, because the two function values agree in almost every digit and rounding errors dominate their difference.' }, el);
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>The backward pass visits the gates from right to left and multiplies each upstream gradient by the local gradient of the gate.</li>' +
          '<li>An add gate copies the gradient to its inputs, a multiply gate swaps the input values, and a max gate routes it to the larger input. Gradients that meet on one wire are summed.</li>' +
          '<li>A centred finite difference with \\(\\varepsilon\\) around \\(10^{-5}\\) is the standard check that a backward pass is correct.</li></ul>'
      }
    ]
  });
})();
