(function () {
  'use strict';

  var C = M4.colors || {};
  var P = 'optimisation-s2-';

  function injectStyle() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById(P + 'style')) return;
    var s = document.createElement('style');
    s.id = P + 'style';
    s.textContent =
      '.' + P + 'bar{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;margin:14px 0 6px}' +
      '.' + P + 'eq{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;font-size:24px;margin:18px 0}' +
      '.' + P + 'eq .m4-slot{min-width:92px;min-height:60px;display:flex;align-items:center;justify-content:center}' +
      '.' + P + 'tray{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:center;min-height:68px;margin:10px 0}' +
      '.' + P + 'tray .m4-token,.' + P + 'eq .m4-token{font-size:22px;padding:10px 18px;min-width:56px;text-align:center;touch-action:none}' +
      '.' + P + 'done{border-color:#16b56b !important;background:#e9f9f1 !important}' +
      '.' + P + 'wrap{max-width:560px;margin:0 auto}';
    document.head.appendChild(s);
  }

  function fmt(v, d) {
    var n = (d === undefined) ? 2 : d;
    var s = (Math.abs(v) < 0.5 * Math.pow(10, -n) ? 0 : v).toFixed(n);
    return s.replace('-', '\u2212');
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function readout(parent) {
    return M4.el('span', { class: 'm4-readout' }, parent);
  }
  function bar(parent) {
    return M4.el('div', { class: P + 'bar' }, parent);
  }

  // rAF tween with cleanup; returns a cancel function
  function tween(ctx, ms, onFrame, onDone) {
    var raf = 0, t0 = null, dead = false;
    function tick(t) {
      if (dead) return;
      if (t0 === null) t0 = t;
      var u = clamp((t - t0) / ms, 0, 1);
      var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      onFrame(e);
      if (u < 1) raf = requestAnimationFrame(tick);
      else if (onDone) onDone();
    }
    raf = requestAnimationFrame(tick);
    function cancel() { dead = true; cancelAnimationFrame(raf); }
    ctx.onCleanup(cancel);
    return cancel;
  }

  // ---------- shared 2D bowl: L(x, y) = (x^2 + 2 y^2) / 2, gradient (x, 2y)
  function L2(x, y) { return 0.5 * (x * x + 2 * y * y); }
  function drawContours(p) {
    var levels = [0.5, 1.5, 3, 5, 8, 12, 17];
    if (p.svg && p.svg.style) p.svg.style.overflow = 'hidden';
    levels.forEach(function (c) {
      var pts = [], a = Math.sqrt(2 * c), b = Math.sqrt(c), i, t;
      for (i = 0; i < 72; i++) {
        t = i / 72 * 2 * Math.PI;
        pts.push([a * Math.cos(t), b * Math.sin(t)]);
      }
      var path = p.path(pts, { stroke: C.muted, width: 1.5, closed: true });
      if (path && path.el) path.el.setAttribute('opacity', '0.45');
    });
    p.point(0, 0, { r: 7, fill: C.green });
    p.text(0.2, -0.55, 'minimum', { fill: C.green, size: 15, anchor: 'start', weight: 600 });
  }

  // ---------- 1D curve used in explore and drag exercise
  function f1(x) { return 0.25 * x * x; }
  function g1(x) { return 0.5 * x; }

  injectStyle();

  M4.lesson({
    id: 'optimisation-s2',
    module: 'optimisation',
    title: 'Gradient descent',
    summary: 'Reduce a loss by repeatedly taking a small step against the gradient, first on a curve and then on a contour map.',
    minutes: 10,
    steps: [
      // 1
      {
        kind: 'text',
        title: 'A rule for descent',
        html:
          '<p>A loss can be pictured as a landscape whose lowest point is the minimum. <b>Gradient descent</b> is a procedure for reaching that point without seeing the whole landscape.</p>' +
          '<p>In this lesson you will state the update rule, compute one step on paper for a function of one variable, and predict where a step lands on a contour map of a function of two variables.</p>'
      },
      // 2
      {
        kind: 'text',
        title: 'The slope gives the direction',
        html:
          '<p>Let \\(f(x)\\) be a function of one variable and \\(f\'(x)\\) its derivative, the slope of the curve at \\(x\\). A positive slope means that \\(f\\) increases as \\(x\\) increases, so the downhill direction is towards smaller \\(x\\). A negative slope means the opposite.</p>' +
          '<p>In both cases the downhill direction along the \\(x\\)-axis has the sign of \\(-f\'(x)\\). Only local information is needed: the slope at the current position.</p>'
      },
      // 3
      {
        kind: 'explore',
        title: 'A ball on a curve',
        html:
          '<p>The curve is \\(f(x)=\\tfrac14 x^2\\), with slope \\(f\'(x)=\\tfrac12 x\\). Drag the ball along the curve: the dashed line is the tangent and the red arrow on the axis shows \\(-f\'(x)\\). The Step button moves the ball by \\(-0.4\\,f\'(x)\\).</p>',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: P + 'wrap' }, el);
          var p = M4.plane(wrap, { xmin: -5, xmax: 5, ymin: -1, ymax: 7, width: 520, height: 416 });
          p.fn(f1, { stroke: C.ink, width: 3 });
          var tan = p.line(0, 0, 0, 0, { stroke: C.blue, width: 2, dash: '6 6' });
          var arr = p.arrow(0, 0, 0, 0, { stroke: C.red, width: 5 });
          var x = 4, busy = null, steps = 0;
          var h = p.handle(x, f1(x), {
            color: C.red, r: 13,
            onDrag: function (nx) {
              if (busy) { busy(); busy = null; }
              steps = 0;
              x = clamp(nx, -4.8, 4.8);
              draw();
            }
          });
          var b = bar(el);
          var rx = readout(b), rg = readout(b), rf = readout(b), rs = readout(b);
          function draw() {
            var g = g1(x), y = f1(x), w = 1.3;
            h.set(x, y);
            tan.set(x - w, y - w * g, x + w, y + w * g);
            arr.set(x, -0.5, x - g, -0.5);
            arr.el.style.opacity = Math.abs(g) < 0.06 ? '0' : '1';
            rx.textContent = 'x = ' + fmt(x);
            rg.textContent = "f'(x) = " + fmt(g);
            rf.textContent = 'f(x) = ' + fmt(y);
            rs.textContent = 'steps: ' + steps;
          }
          var b2 = bar(el);
          M4.button(b2, 'Step', function () {
            if (busy) return;
            var a = x, t = x - 0.4 * g1(x);
            steps++;
            busy = tween(ctx, 420, function (e) { x = a + (t - a) * e; draw(); }, function () { busy = null; });
          }, { primary: true });
          M4.button(b2, 'Reset', function () {
            if (busy) { busy(); busy = null; }
            x = 4; steps = 0; draw();
          });
          draw();
          ctx.note('Each step is shorter than the last, because the slope shrinks as the ball approaches the minimum at \\(x=0\\).');
        }
      },
      // 4
      {
        kind: 'exercise',
        title: 'Direction of a step',
        html:
          '<p>At the current position the slope is \\(f\'(x)=+2\\). In which direction does a gradient descent step move \\(x\\)?</p>',
        hint: 'A positive slope means the function rises to the right. The step has the sign of \\(-f\'(x)\\).',
        mount: function (el, ctx) {
          injectStyle();
          M4.choices(el, {
            options: [
              'Towards smaller \\(x\\)',
              'Towards larger \\(x\\)',
              'It does not move'
            ],
            correct: 0,
            onCorrect: function () {
              ctx.note('Correct: \\(-f\'(x) = -2\\) is negative, so \\(x\\) decreases.');
              ctx.solved();
            },
            onWrong: function (i) {
              ctx.wrong(i === 1
                ? 'Moving towards larger x follows a positive slope uphill.'
                : 'The ball rests only where the slope is zero. Here it is +2.');
            }
          });
        }
      },
      // 5
      {
        kind: 'text',
        title: 'The update rule',
        html:
          '<p>Gradient descent replaces the current position \\(x\\) by</p>' +
          '\\[ x_{\\text{new}} = x - \\eta\\, f\'(x), \\]' +
          '<p>where \\(\\eta\\) (eta) is a small positive number called the <b>learning rate</b> or step size. The step \\(-\\eta f\'(x)\\) points downhill and its length is proportional to the steepness. Repeating the rule produces a sequence of positions \\(x_0, x_1, x_2, \\dots\\) called iterates.</p>'
      },
      // 6
      {
        kind: 'exercise',
        title: 'One step on paper',
        html:
          '<p>Let \\(f(x)=x^2\\), so \\(f\'(x)=2x\\). Starting from \\(x=3\\) with learning rate \\(\\eta=0.1\\), compute \\(x_{\\text{new}} = x - \\eta f\'(x)\\).</p>',
        hint: 'The slope at 3 is \\(2\\cdot 3 = 6\\). Multiply by \\(\\eta\\) and subtract the result from 3.',
        mount: function (el, ctx) {
          injectStyle();
          M4.numberInput(el, {
            answer: 2.4, tolerance: 0.01, placeholder: 'x new', label: 'x_new =',
            onCorrect: function () {
              ctx.note('\\(3 - 0.1\\cdot 6 = 2.4\\). The value of \\(f\\) drops from \\(9\\) to \\(5.76\\).');
              ctx.solved();
            },
            onWrong: function (v) {
              if (Math.abs(v - 3.6) < 0.011) ctx.wrong('That adds the step. The rule subtracts eta times the slope.');
              else if (Math.abs(v + 3) < 0.011) ctx.wrong('That subtracts the whole slope. The slope must first be multiplied by eta = 0.1.');
              else if (Math.abs(v - 0.6) < 0.011) ctx.wrong('0.6 is the size of the step. Subtract it from the current position 3.');
              else ctx.wrong('Compute the slope 2 x 3 = 6, scale it by 0.1, then subtract from 3.');
            }
          });
        }
      },
      // 7
      {
        kind: 'exercise',
        title: 'The next iterate',
        html:
          '<p>The curve is again \\(f(x)=\\tfrac14x^2\\) with \\(f\'(x)=\\tfrac12x\\). The grey ball marks the current position \\(x_0=-4\\) and the learning rate is \\(\\eta=1.5\\). Drag the red ball along the curve to the next iterate \\(x_1\\) and release it.</p>',
        hint: 'The slope at \\(-4\\) is \\(-2\\), so the step is \\(-1.5\\cdot(-2)=+3\\).',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: P + 'wrap' }, el);
          var p = M4.plane(wrap, { xmin: -5, xmax: 5, ymin: -1, ymax: 7, width: 520, height: 416 });
          p.fn(f1, { stroke: C.ink, width: 3 });
          p.point(-4, 4, { r: 10, fill: C.muted });
          p.text(-4, 4.75, 'x\u2080 = \u22124', { fill: C.muted, size: 16, weight: 600 });
          var ring = p.point(-1, f1(-1), { r: 16, fill: 'none' });
          ring.el.setAttribute('stroke', C.green);
          ring.el.setAttribute('stroke-width', '4');
          ring.el.style.opacity = '0';
          var link = p.line(-4, -0.5, -4, -0.5, { stroke: C.red, width: 4 });
          var x = 3, done = false;
          var b = bar(el);
          var rx = readout(b), rd = readout(b);
          function draw() {
            h.set(x, f1(x));
            link.set(-4, -0.5, x, -0.5);
            rx.textContent = 'x\u2081 = ' + fmt(x, 1);
            rd.textContent = 'step = ' + fmt(x + 4, 1);
          }
          var h = p.handle(x, f1(x), {
            color: C.red, r: 14,
            onDrag: function (nx) {
              if (done) { draw(); return; }
              x = clamp(Math.round(nx * 2) / 2, -4.5, 4.5);
              draw();
            },
            onEnd: function () {
              if (done) { draw(); return; }
              draw();
              if (Math.abs(x + 1) < 0.01) {
                done = true;
                ring.el.style.opacity = '1';
                ring.el.setAttribute('fill', C.green);
                ring.el.setAttribute('fill-opacity', '0.25');
                ctx.note('\\(x_1 = -4 - 1.5\\cdot(-2) = -1\\). The slope was negative, so the step went to the right.');
                ctx.solved();
              } else if (x < -4) {
                ctx.wrong('That moves uphill. The slope at -4 is negative, so the step -eta f\'(x) is positive.');
              } else if (Math.abs(x + 2) < 0.01) {
                ctx.wrong('That is a step of 2, the size of the slope alone. Multiply the slope by eta = 1.5.');
              } else if (Math.abs(x + 7) < 0.01 || Math.abs(x - 2) < 0.01) {
                ctx.wrong('Check the arithmetic: the step is -1.5 x (-2) = +3, measured from -4.');
              } else {
                ctx.wrong('The step should be exactly -eta f\'(-4). The current step is ' + fmt(x + 4, 1) + '.');
              }
            }
          });
          draw();
        }
      },
      // 8
      {
        kind: 'explore',
        title: 'Two variables',
        html:
          '<p>For a function of two variables, \\(L(x,y)\\), the <b>gradient</b> \\(\\nabla L\\) is the vector of the two partial slopes. It points in the direction of steepest increase and is perpendicular to the contour lines, the curves of equal \\(L\\). Here \\(L(x,y)=\\tfrac12(x^2+2y^2)\\) and \\(\\nabla L=(x,\\,2y)\\).</p>' +
          '<p>Drag the ball to choose a start. The red arrow is the next step \\(-\\eta\\nabla L\\) with \\(\\eta=0.2\\). Step and Run apply it.</p>',
        mount: function (el, ctx) {
          injectStyle();
          var eta = 0.2;
          var wrap = M4.el('div', { class: P + 'wrap' }, el);
          var p = M4.plane(wrap, { xmin: -4.5, xmax: 4.5, ymin: -4.5, ymax: 4.5, width: 520, height: 520 });
          drawContours(p);
          var trail = [[-3.5, 2.5]];
          var tr = p.path(trail, { stroke: C.orange, width: 3 });
          var dots = M4.svg('g', {}, p.g);
          var arr = p.arrow(0, 0, 0, 0, { stroke: C.red, width: 5 });
          var x = -3.5, y = 2.5, busy = null, queue = 0, n = 0;
          var b = bar(el);
          var rp = readout(b), rg = readout(b), rl = readout(b), rn = readout(b);
          function draw() {
            var gx = x, gy = 2 * y;
            h.set(x, y);
            arr.set(x, y, x - eta * gx, y - eta * gy);
            arr.el.style.opacity = Math.hypot(gx, gy) * eta < 0.12 ? '0' : '1';
            tr.set(trail.concat([[x, y]]));
            rp.textContent = '(x, y) = (' + fmt(x) + ', ' + fmt(y) + ')';
            rg.textContent = '\u2207L = (' + fmt(gx) + ', ' + fmt(gy) + ')';
            rl.textContent = 'L = ' + fmt(L2(x, y));
            rn.textContent = 'steps: ' + n;
          }
          function clearDots() { while (dots.firstChild) dots.removeChild(dots.firstChild); }
          function dot(px, py) {
            M4.svg('circle', { cx: p.x(px), cy: p.y(py), r: 4, fill: C.orange }, dots);
          }
          function stop() { if (busy) { busy(); busy = null; } queue = 0; }
          function step() {
            if (busy) return;
            var ax = x, ay = y, bx = x - eta * x, by = y - eta * 2 * y;
            if (Math.hypot(ax, ay) < 0.02) { queue = 0; return; }
            n++;
            busy = tween(ctx, 360, function (e) {
              x = ax + (bx - ax) * e; y = ay + (by - ay) * e; draw();
            }, function () {
              busy = null;
              trail.push([x, y]); dot(x, y); draw();
              if (queue > 0) { queue--; step(); }
            });
          }
          var h = p.handle(x, y, {
            color: C.red, r: 13,
            onDrag: function (nx, ny) {
              stop();
              x = clamp(nx, -4.2, 4.2); y = clamp(ny, -4.2, 4.2);
              trail = [[x, y]]; n = 0; clearDots(); draw();
            }
          });
          var b2 = bar(el);
          M4.button(b2, 'Step', function () { queue = 0; step(); }, { primary: true });
          M4.button(b2, 'Run 12 steps', function () { if (!busy) { queue = 11; step(); } });
          M4.button(b2, 'Reset', function () {
            stop(); x = -3.5; y = 2.5; trail = [[x, y]]; n = 0; clearDots(); draw();
          });
          draw();
          ctx.note('Each step crosses the contour at a right angle. The path curves because the bowl is steeper in \\(y\\) than in \\(x\\).');
        }
      },
      // 9
      {
        kind: 'exercise',
        title: 'Gradient descent in training',
        html:
          '<p>In machine learning the position is the vector of model parameters \\(\\theta\\) and the function is the loss \\(L(\\theta)\\), which measures the error on the training data. Training repeats one update. For neural networks, a later module shows how to compute \\(\\nabla L(\\theta)\\) efficiently.</p>' +
          '<p>Drag the tiles into the slots to complete the gradient descent update.</p>',
        hint: 'The pattern is the same as in one variable: current position, minus, step size times slope.',
        mount: function (el, ctx) {
          injectStyle();
          var eq = M4.el('div', { class: P + 'eq' }, el);
          M4.el('span', { html: M4.tex('\\theta_{\\text{new}} \\;=\\; \\theta') }, eq);
          var want = ['minus', 'eta', 'grad'];
          var slots = want.map(function (w) {
            var s = M4.el('div', { class: 'm4-slot' }, eq);
            s.setAttribute('data-want', w);
            return s;
          });
          var tray = M4.el('div', { class: P + 'tray' }, el);
          var defs = [
            ['grad', '\\nabla L(\\theta)'],
            ['plus', '+'],
            ['eta', '\\eta'],
            ['loss', 'L(\\theta)'],
            ['minus', '-']
          ];
          var tokens = defs.map(function (d) {
            var t = M4.el('div', { class: 'm4-token', html: M4.tex(d[1]) }, tray);
            t.setAttribute('data-v', d[0]);
            return t;
          });
          var placed = 0;
          M4.dragDrop({
            tokens: tokens,
            slots: slots,
            onDrop: function (tok, slot) {
              var v = tok.getAttribute('data-v'), w = slot.getAttribute('data-want');
              if (slot.getAttribute('data-full') || tok.getAttribute('data-placed')) return;
              if (v === w) {
                slot.appendChild(tok);
                slot.classList.add('filled');
                slot.classList.add(P + 'done');
                slot.setAttribute('data-full', '1');
                tok.setAttribute('data-placed', '1');
                tok.style.cursor = 'default';
                tok.classList.add('m4-pop');
                placed++;
                if (placed === 3) {
                  ctx.note('\\(\\theta_{\\text{new}} = \\theta - \\eta\\,\\nabla L(\\theta)\\): every parameter moves against its own partial slope.');
                  ctx.solved();
                } else {
                  ctx.note('Placed ' + placed + ' of 3.');
                }
              } else if (v === 'plus') {
                ctx.wrong('Adding the gradient term moves uphill and increases the loss.');
              } else if (v === 'loss') {
                ctx.wrong('The loss value is a single number. It carries no direction. The gradient does.');
              } else {
                ctx.wrong('That tile belongs in the rule, but in another slot: sign, then step size, then gradient.');
              }
            },
            onMiss: function () {
              ctx.note('Release a tile over one of the dashed slots.');
            }
          });
        }
      },
      // 10
      {
        kind: 'exercise',
        title: 'Number of steps',
        html:
          '<p>Let \\(f(x)=x^2\\) with \\(f\'(x)=2x\\), start at \\(x_0=4\\) and use \\(\\eta=0.25\\). Each update gives \\(x_{k+1}=x_k-0.25\\cdot 2x_k\\). Move the slider to the <b>smallest</b> number of steps \\(k\\) for which \\(|x_k|&lt;0.1\\), then press Check.</p>',
        hint: 'Each step halves the position: \\(x_k = 4\\cdot(\\tfrac12)^k\\). The displayed value updates as the slider moves.',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: P + 'wrap' }, el);
          var p = M4.plane(wrap, { xmin: -0.5, xmax: 4.5, ymin: -2, ymax: 18, width: 520, height: 400 });
          p.fn(function (x) { return x * x; }, { stroke: C.ink, width: 3 });
          var band = p.line(0.1, -2, 0.1, 18, { stroke: C.green, width: 2, dash: '5 5' });
          if (band && band.el) band.el.setAttribute('opacity', '0.8');
          p.text(0.2, 16.6, '|x| below 0.1 left of this line', { fill: C.green, size: 15, anchor: 'start', weight: 600 });
          var path = p.path([[4, 16]], { stroke: C.orange, width: 2.5 });
          var dots = M4.svg('g', {}, p.g);
          var ball = p.point(4, 16, { r: 11, fill: C.red });
          var b = bar(el);
          var rk = readout(b), rx = readout(b), rf = readout(b);
          var k = 0;
          function draw() {
            var pts = [], i, x = 4;
            while (dots.firstChild) dots.removeChild(dots.firstChild);
            for (i = 0; i <= k; i++) {
              pts.push([x, x * x]);
              if (i < k) M4.svg('circle', { cx: p.x(x), cy: p.y(x * x), r: 5, fill: C.orange }, dots);
              if (i < k) x = x - 0.25 * 2 * x;
            }
            path.set(pts.length > 1 ? pts : [[4, 16], [4, 16]]);
            ball.set(x, x * x);
            rk.textContent = 'k = ' + k;
            rx.textContent = 'x\u2096 = ' + fmt(x, 4);
            rf.textContent = 'f(x\u2096) = ' + fmt(x * x, 4);
          }
          M4.slider(el, {
            min: 0, max: 10, step: 1, value: 0, label: 'steps k',
            format: function (v) { return String(Math.round(v)); },
            onInput: function (v) { k = Math.round(v); draw(); }
          });
          var b2 = bar(el);
          M4.button(b2, 'Check', function () {
            var xk = 4 * Math.pow(0.5, k);
            if (k === 6) {
              ball.el.setAttribute('fill', C.green);
              ctx.note('\\(x_6 = 4\\cdot(\\tfrac12)^6 = 0.0625 &lt; 0.1\\), while \\(x_5 = 0.125\\) is still too large.');
              ctx.solved();
            } else if (k < 6) {
              ctx.wrong('After ' + k + ' steps the position is ' + xk.toFixed(4) + ', which is not yet below 0.1.');
            } else {
              ctx.wrong('The condition holds after ' + k + ' steps, but it already holds for a smaller k.');
            }
          }, { primary: true });
          draw();
        }
      },
      // 11
      {
        kind: 'exercise',
        title: 'One step on the contour map',
        html:
          '<p>The loss is \\(L(x,y)=\\tfrac12(x^2+2y^2)\\) with gradient \\(\\nabla L=(x,\\,2y)\\). The current parameters are \\(\\theta=(2,2)\\), shown in grey, and the learning rate is \\(\\eta=0.25\\). Drag the red ball to \\(\\theta_{\\text{new}}=\\theta-\\eta\\nabla L(\\theta)\\) and release it.</p>',
        hint: 'The gradient at \\((2,2)\\) is \\((2,4)\\). Scale it by \\(0.25\\) and subtract it from \\((2,2)\\) component by component.',
        mount: function (el, ctx) {
          injectStyle();
          var wrap = M4.el('div', { class: P + 'wrap' }, el);
          var p = M4.plane(wrap, { xmin: -4.5, xmax: 4.5, ymin: -4.5, ymax: 4.5, width: 520, height: 520 });
          drawContours(p);
          var ring = p.point(1.5, 1, { r: 17, fill: 'none' });
          ring.el.setAttribute('stroke', C.green);
          ring.el.setAttribute('stroke-width', '4');
          ring.el.style.opacity = '0';
          var arr = p.arrow(2, 2, 2, 2, { stroke: C.red, width: 4 });
          p.point(2, 2, { r: 9, fill: C.muted });
          p.text(2.3, 2.3, '\u03b8 = (2, 2)', { fill: C.ink, size: 16, anchor: 'start', weight: 600 });
          var x = -2, y = -2, done = false;
          var b = bar(el);
          var rp = readout(b), rl = readout(b);
          function draw() {
            h.set(x, y);
            arr.set(2, 2, x, y);
            rp.textContent = '\u03b8 new = (' + fmt(x, 1) + ', ' + fmt(y, 1) + ')';
            rl.textContent = 'L = ' + fmt(L2(x, y), 3) + '   (was 6.000)';
          }
          var h = p.handle(x, y, {
            color: C.red, r: 14,
            onDrag: function (nx, ny) {
              if (done) { draw(); return; }
              x = clamp(Math.round(nx * 2) / 2, -4, 4);
              y = clamp(Math.round(ny * 2) / 2, -4, 4);
              draw();
            },
            onEnd: function () {
              if (done) { draw(); return; }
              draw();
              var dx = x - 2, dy = y - 2;
              var cross = dx * 4 - dy * 2, dot = dx * (-2) + dy * (-4);
              if (Math.abs(x - 1.5) < 0.01 && Math.abs(y - 1) < 0.01) {
                done = true;
                ring.el.style.opacity = '1';
                ring.el.setAttribute('fill', C.green);
                ring.el.setAttribute('fill-opacity', '0.25');
                arr.el.setAttribute('stroke', C.green);
                ctx.note('\\((2,2)-0.25\\cdot(2,4)=(1.5,\\,1)\\). The loss falls from \\(6\\) to \\(2.125\\).');
                ctx.solved();
              } else if (dx === 0 && dy === 0) {
                ctx.wrong('That is the current position. The gradient (2, 4) is not zero, so the step has non-zero length.');
              } else if (Math.abs(cross) < 0.01 && dot < 0) {
                ctx.wrong('That step is along +gradient, the direction of steepest increase. The rule subtracts.');
              } else if (Math.abs(cross) < 0.01) {
                ctx.wrong('The direction is correct. The length is not: the step is 0.25 x (2, 4) = (0.5, 1), and the current step is (' + fmt(dx, 1) + ', ' + fmt(dy, 1) + ').');
              } else if (L2(x, y) >= 6) {
                ctx.wrong('The loss at that point is ' + L2(x, y).toFixed(3) + ', not lower than 6. A descent step must reduce it.');
              } else {
                ctx.wrong('The loss is lower there, but the step is not parallel to -gradient = (-2, -4). The y-component must be twice the x-component.');
              }
            }
          });
          draw();
        }
      },
      // 12
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>The gradient points in the direction of steepest increase. Gradient descent steps in the opposite direction.</li>' +
          '<li>The update rule is \\(\\theta_{\\text{new}}=\\theta-\\eta\\,\\nabla L(\\theta)\\), which in one variable reads \\(x_{\\text{new}}=x-\\eta f\'(x)\\). The step is long where the landscape is steep and short where it is flat.</li>' +
          '<li>Repeating the update produces iterates that approach a minimum, provided the learning rate \\(\\eta\\) is suitably small. The choice of \\(\\eta\\) is the subject of the next session.</li>' +
          '</ul>'
      }
    ]
  });
})();
