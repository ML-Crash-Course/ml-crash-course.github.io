(function () {
  'use strict';
  var M4 = window.M4;
  var C = M4.colors || { blue: '#2f6bff', green: '#16b56b', orange: '#ff8a1f', purple: '#7a5cff', pink: '#ef4b8b', yellow: '#ffc533', red: '#f0473e', ink: '#1d1d1f', muted: '#6b6f76', line: '#e6e4dd', bg: '#faf9f5', card: '#ffffff' };

  // ---------- local helpers ----------
  function injectStyle() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('calculus-s1-style')) return;
    var s = document.createElement('style');
    s.id = 'calculus-s1-style';
    s.textContent =
      '.calculus-s1-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 18px;margin:10px 0 6px;font-size:15px;color:#6b6f76}' +
      '.calculus-s1-key{display:inline-flex;align-items:center;gap:7px}' +
      '.calculus-s1-dot{width:14px;height:14px;border-radius:50%;display:inline-block}' +
      '.calculus-s1-dash{width:22px;height:0;border-top:3px dashed;display:inline-block}' +
      '.calculus-s1-readouts{margin:10px 0}' +
      '.calculus-s1-slotcol{display:flex;flex-direction:column;align-items:center;gap:6px;font-weight:600}' +
      '.calculus-s1-slot{min-width:92px;min-height:60px;display:flex;align-items:center;justify-content:center}' +
      '.calculus-s1-tray{min-height:72px;margin-top:14px;padding:8px;border-radius:14px;background:#f3f1ea}' +
      '.calculus-s1-token{min-width:64px;text-align:center;font-size:20px;font-weight:700;padding:10px 14px;touch-action:none}' +
      '.calculus-s1-caption{text-align:center;font-size:15px;color:#6b6f76;margin:6px 0 2px;font-weight:600}';
    document.head.appendChild(s);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function fmt(v, d) {
    if (d === undefined) d = 2;
    var s = v.toFixed(d);
    if (parseFloat(s) === 0) s = (0).toFixed(d);
    return s.replace('-', '\u2212');
  }

  function readout(parent, label) {
    var r = M4.el('span', { class: 'm4-readout' }, parent);
    return {
      el: r,
      set: function (txt) { r.textContent = label + ' = ' + txt; }
    };
  }

  function legend(parent, items) {
    var box = M4.el('div', { class: 'calculus-s1-legend' }, parent);
    items.forEach(function (it) {
      var k = M4.el('span', { class: 'calculus-s1-key' }, box);
      if (it.dash) M4.el('span', { class: 'calculus-s1-dash', style: 'border-color:' + it.color }, k);
      else M4.el('span', { class: 'calculus-s1-dot', style: 'background:' + it.color }, k);
      M4.el('span', { text: it.label }, k);
    });
    return box;
  }

  // endpoints of the line through (x0, y0) with slope m, clipped to a box
  function clipLine(x0, y0, m, b) {
    var lo = b.xmin - x0, hi = b.xmax - x0;
    if (Math.abs(m) > 1e-9) {
      var t1 = (b.ymin - y0) / m, t2 = (b.ymax - y0) / m;
      lo = Math.max(lo, Math.min(t1, t2));
      hi = Math.min(hi, Math.max(t1, t2));
    } else if (y0 < b.ymin || y0 > b.ymax) {
      return [x0, y0, x0, y0];
    }
    if (lo > hi) return [x0, y0, x0, y0];
    return [x0 + lo, y0 + m * lo, x0 + hi, y0 + m * hi];
  }

  function setClipped(line, x0, y0, m, b) {
    var c = clipLine(x0, y0, m, b);
    line.set(c[0], c[1], c[2], c[3]);
  }

  // ---------- functions used in the session ----------
  function sq(x) { return x * x; }                 // f(x) = x^2,        f'(x) = 2x
  function g(x) { return x * x * x / 6 - x; }      // g(x) = x^3/6 - x,  g'(x) = x^2/2 - 1
  function dg(x) { return x * x / 2 - 1; }
  function loss(w) { return (w - 1) * (w - 1); }   // L(w) = (w-1)^2,    L'(w) = 2(w-1)

  var BOX = { xmin: -3, xmax: 3, ymin: -1, ymax: 9 };

  // shared secant widget on y = x^2
  function secantWidget(el, o) {
    var p = M4.plane(el, { xmin: BOX.xmin, xmax: BOX.xmax, ymin: BOX.ymin, ymax: BOX.ymax, width: 520, height: 520 });
    p.fn(sq, { stroke: C.green, width: 4 });
    var tan = p.line(0, 0, 0, 0, { stroke: C.purple, width: 2, dash: '7 6' });
    var run = p.line(0, 0, 0, 0, { stroke: C.muted, width: 2, dash: '3 4' });
    var rise = p.line(0, 0, 0, 0, { stroke: C.muted, width: 2, dash: '3 4' });
    var sec = p.line(0, 0, 0, 0, { stroke: C.orange, width: 3 });
    var q = p.point(0, 0, { r: 8, fill: C.orange });
    var st = { a: o.a, h: o.h };
    var pFixed = null, hd = null;

    legend(el, [
      { color: C.green, label: o.draggable ? 'P (drag along the curve)' : 'P' },
      { color: C.orange, label: 'Q and the secant' },
      { color: C.purple, dash: true, label: 'tangent at P' }
    ]);
    var row = M4.el('div', { class: 'm4-row calculus-s1-readouts' }, el);
    var rA = readout(row, 'a'), rH = readout(row, 'h'), rS = readout(row, 'secant slope'), rT = readout(row, 'tangent slope');

    function update() {
      var a = st.a, h = st.h, fa = sq(a), fb = sq(a + h);
      var m = (fb - fa) / h;
      setClipped(sec, a, fa, m, BOX);
      setClipped(tan, a, fa, 2 * a, BOX);
      run.set(a, fa, a + h, fa);
      rise.set(a + h, fa, a + h, fb);
      q.set(a + h, fb);
      if (hd) hd.set(a, fa);
      if (pFixed) pFixed.set(a, fa);
      rA.set(fmt(a)); rH.set(fmt(h)); rS.set(fmt(m)); rT.set(fmt(2 * a));
      if (o.onUpdate) o.onUpdate(st, m);
    }

    if (o.draggable) {
      hd = p.handle(st.a, sq(st.a), {
        color: C.green,
        onDrag: function (x) {
          st.a = clamp(x, o.amin, o.amax);
          update();
        }
      });
    } else {
      pFixed = p.point(st.a, sq(st.a), { r: 8, fill: C.green });
    }
    update();
    return { p: p, st: st, update: update };
  }

  injectStyle();

  M4.lesson({
    id: 'calculus-s1',
    module: 'calculus',
    title: 'Slope and the derivative',
    summary: 'Secant lines become the tangent as the step shrinks, and the tangent slope at every point defines a new function, the derivative.',
    minutes: 10,
    steps: [
      // 1
      {
        kind: 'text',
        title: 'Steepness of a curve',
        html:
          '<p>A straight line has one slope. A curve has a different steepness at every point, and the derivative is the tool that measures it.</p>' +
          '<p>In this lesson you will compute the slope of a secant line, explain how the tangent slope arises as a limit of secant slopes, and read the derivative as a function that assigns a slope to every input.</p>'
      },
      // 2
      {
        kind: 'text',
        title: 'The secant slope',
        html:
          '<p>Let \\(f\\) be a function and let \\(a\\) be an input. Move the input by a step \\(h \\neq 0\\). The straight line through the two points \\(P = (a, f(a))\\) and \\(Q = (a+h, f(a+h))\\) on the graph is called a <b>secant line</b>.</p>' +
          '<p>Its slope is the change in output divided by the change in input:</p>' +
          '\\[ \\text{secant slope} = \\frac{f(a+h) - f(a)}{h}. \\]' +
          '<p>This number is the average rate of change of \\(f\\) between \\(a\\) and \\(a+h\\).</p>'
      },
      // 3
      {
        kind: 'explore',
        title: 'Secant and tangent',
        html:
          '<p>The curve is \\(f(x) = x^2\\). Drag the point \\(P\\) along the curve and change the step \\(h\\) with the slider. The dashed line is the tangent at \\(P\\), the line that touches the curve there with the same steepness.</p>' +
          '<p>Observe how the secant slope approaches the tangent slope as \\(h\\) becomes small.</p>',
        mount: function (el, ctx) {
          var raf = 0;
          var w = secantWidget(el, { a: 0.5, h: 1.5, draggable: true, amin: -2.5, amax: 1.4 });
          var sl = M4.slider(el, {
            min: 0.01, max: 1.5, step: 0.01, value: 1.5, label: 'step h',
            format: function (v) { return fmt(+v); },
            onInput: function (v) { cancelAnimationFrame(raf); w.st.h = +v; w.update(); }
          });
          var row = M4.el('div', { class: 'm4-row' }, el);
          M4.button(row, 'Shrink h toward 0', function () {
            cancelAnimationFrame(raf);
            var h0 = Math.max(w.st.h, 0.05), t0 = null, T = 2600;
            function tick(t) {
              if (t0 === null) t0 = t;
              var u = clamp((t - t0) / T, 0, 1);
              var h = h0 * Math.pow(0.01 / h0, u);
              h = Math.max(0.01, Math.round(h * 100) / 100);
              w.st.h = h; sl.set(h); w.update();
              if (u < 1) raf = requestAnimationFrame(tick);
            }
            raf = requestAnimationFrame(tick);
          }, { primary: true });
          M4.button(row, 'Reset h', function () {
            cancelAnimationFrame(raf);
            w.st.h = 1.5; sl.set(1.5); w.update();
          });
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
        }
      },
      // 4
      {
        kind: 'exercise',
        title: 'Secant slope between two points',
        html:
          '<p>For \\(f(x) = x^2\\), take \\(a = 1\\) and \\(h = 2\\), so the secant passes through \\(P = (1, 1)\\) and \\(Q = (3, 9)\\). Compute the slope of this secant line.</p>',
        hint: 'Divide the change in output, 9 − 1, by the change in input, 3 − 1.',
        mount: function (el, ctx) {
          var p = M4.plane(el, { xmin: BOX.xmin, xmax: BOX.xmax, ymin: BOX.ymin, ymax: BOX.ymax, width: 520, height: 520 });
          p.fn(sq, { stroke: C.green, width: 4 });
          var sec = p.line(0, 0, 0, 0, { stroke: C.orange, width: 3 });
          setClipped(sec, 1, 1, 4, BOX);
          p.line(1, 1, 3, 1, { stroke: C.muted, width: 2, dash: '3 4' });
          p.line(3, 1, 3, 9, { stroke: C.muted, width: 2, dash: '3 4' });
          p.point(1, 1, { r: 8, fill: C.green });
          p.point(3, 9, { r: 8, fill: C.orange });
          p.text(0.62, 1.55, 'P', { fill: C.green, size: 18, weight: 700 });
          p.text(2.62, 8.6, 'Q', { fill: C.orange, size: 18, weight: 700 });
          p.text(2, 0.35, 'run', { fill: C.muted, size: 16 });
          p.text(2.62, 5, 'rise', { fill: C.muted, size: 16 });
          var row = M4.el('div', { class: 'm4-row', style: 'margin-top:12px' }, el);
          M4.numberInput(row, {
            answer: 4, tolerance: 0.01, placeholder: '?', label: 'secant slope =',
            onCorrect: function () {
              ctx.note('Correct: \\( \\dfrac{9 - 1}{3 - 1} = \\dfrac{8}{2} = 4 \\).');
              ctx.solved();
            },
            onWrong: function (v) {
              if (Math.abs(v - 8) < 0.01) ctx.wrong('8 is the rise. Divide it by the run, which is 2.');
              else if (Math.abs(v - 2) < 0.01) ctx.wrong('2 is the run, or the tangent slope at P. The secant slope is rise divided by run.');
              else if (Math.abs(v - 0.25) < 0.01) ctx.wrong('That is run divided by rise. The slope is rise divided by run.');
              else ctx.wrong('Compute the rise f(3) − f(1) and divide by the run 3 − 1.');
            }
          });
        }
      },
      // 5
      {
        kind: 'text',
        title: 'The derivative as a limit',
        html:
          '<p>The <b>derivative</b> of \\(f\\) at \\(a\\), written \\(f\'(a)\\), is the value that the secant slope approaches as the step \\(h\\) approaches zero:</p>' +
          '\\[ f\'(a) = \\lim_{h \\to 0} \\frac{f(a+h) - f(a)}{h}. \\]' +
          '<p>For \\(f(x) = x^2\\) the secant slope simplifies as follows:</p>' +
          '\\[ \\frac{(a+h)^2 - a^2}{h} = \\frac{2ah + h^2}{h} = 2a + h. \\]' +
          '<p>As \\(h\\) approaches zero this approaches \\(2a\\), so \\(f\'(a) = 2a\\). The step \\(h\\) is never set equal to zero, since the quotient would then be undefined.</p>'
      },
      // 6
      {
        kind: 'exercise',
        title: 'The shrinking interval',
        html:
          '<p>The point \\(P\\) is fixed at \\(a = 1\\) on \\(f(x) = x^2\\), where the tangent slope is \\(f\'(1) = 2\\). Reduce the step \\(h\\) until the secant slope differs from the tangent slope by less than \\(0.1\\).</p>',
        hint: 'The secant slope at a = 1 is 2 + h, so the gap equals h itself.',
        mount: function (el, ctx) {
          var done = false;
          var gapR = null;
          var w = secantWidget(el, {
            a: 1, h: 1.5, draggable: false,
            onUpdate: function (st, m) {
              var gap = Math.abs(st.h);
              if (gapR) {
                gapR.set(fmt(gap));
                gapR.el.style.borderColor = gap < 0.1 ? C.green : '';
                gapR.el.style.color = gap < 0.1 ? C.green : '';
              }
            }
          });
          var row = M4.el('div', { class: 'm4-row calculus-s1-readouts' }, el);
          gapR = readout(row, 'gap |secant − tangent|');
          M4.slider(el, {
            min: 0.02, max: 1.8, step: 0.02, value: 1.5, label: 'step h',
            format: function (v) { return fmt(+v); },
            onInput: function (v) {
              w.st.h = +v; w.update();
              var gap = Math.abs(w.st.h);
              if (gap < 0.1 - 1e-9) {
                if (!done) {
                  done = true;
                  gapR.el.classList.add('m4-pop');
                  ctx.note('With \\(h = ' + w.st.h.toFixed(2) + '\\) the secant slope is \\(2 + h = ' + (2 + w.st.h).toFixed(2) + '\\). The secant is now almost indistinguishable from the tangent.');
                  ctx.solved();
                }
              } else if (!done) {
                ctx.note('The gap is ' + fmt(gap) + ', which is still at least 0.1. Reduce \\(h\\) further.');
              }
            }
          });
          w.update();
        }
      },
      // 7
      {
        kind: 'explore',
        title: 'The derivative function',
        html:
          '<p>Computing \\(f\'(a)\\) at every input \\(a\\) produces a new function \\(f\'\\), the derivative of \\(f\\). The upper panel shows \\(f(x) = \\tfrac{1}{6}x^3 - x\\) with its tangent at a draggable point.</p>' +
          '<p>The lower panel plots the tangent slope against \\(x\\). Drag the point across the whole curve to trace the graph of \\(f\'\\). Where \\(f\\) rises, \\(f\'\\) is positive. Where \\(f\\) falls, \\(f\'\\) is negative.</p>',
        mount: function (el) {
          var b1 = { xmin: -3, xmax: 3, ymin: -2, ymax: 2 };
          var b2 = { xmin: -3, xmax: 3, ymin: -1.5, ymax: 4 };
          M4.el('div', { class: 'calculus-s1-caption', text: 'the function f' }, el);
          var p1 = M4.plane(el, { xmin: -3, xmax: 3, ymin: -2, ymax: 2, width: 520, height: 300 });
          M4.el('div', { class: 'calculus-s1-caption', text: 'its derivative f\u2032 (tangent slope against x)' }, el);
          var p2 = M4.plane(el, { xmin: -3, xmax: 3, ymin: -1.5, ymax: 4, width: 520, height: 300 });
          p1.fn(g, { stroke: C.green, width: 4 });
          var guide1 = p1.line(0, 0, 0, 0, { stroke: C.line, width: 2, dash: '4 5' });
          var guide2 = p2.line(0, 0, 0, 0, { stroke: C.line, width: 2, dash: '4 5' });
          var tan = p1.line(0, 0, 0, 0, { stroke: C.orange, width: 4 });
          var trail = p2.path([[0, dg(0)], [0, dg(0)]], { stroke: C.orange, width: 4 });
          var dot = p2.point(0, dg(0), { r: 8, fill: C.orange });
          var a = -2.2, lo = a, hi = a;
          var row = M4.el('div', { class: 'm4-row calculus-s1-readouts' }, el);
          var rX = readout(row, 'x'), rF = readout(row, 'f(x)'), rD = readout(row, 'slope f\u2032(x)');
          var hd;
          function update() {
            var m = dg(a), y = g(a);
            var dx = 0.9 / Math.sqrt(1 + m * m);
            var x1 = a - dx, x2 = a + dx;
            tan.set(x1, y - m * dx, x2, y + m * dx);
            guide1.set(a, b1.ymin, a, b1.ymax);
            guide2.set(a, b2.ymin, a, b2.ymax);
            lo = Math.min(lo, a); hi = Math.max(hi, a);
            var pts = [], n = 60, i;
            for (i = 0; i <= n; i++) {
              var x = lo + (hi - lo) * i / n;
              pts.push([x, dg(x)]);
            }
            trail.set(pts);
            dot.set(a, m);
            if (hd) hd.set(a, y);
            rX.set(fmt(a)); rF.set(fmt(y)); rD.set(fmt(m));
          }
          hd = p1.handle(a, g(a), {
            color: C.green,
            onDrag: function (x) { a = clamp(x, -2.9, 2.9); update(); }
          });
          update();
          var r2 = M4.el('div', { class: 'm4-row' }, el);
          M4.button(r2, 'Clear trace', function () { lo = a; hi = a; update(); });
        }
      },
      // 8
      {
        kind: 'exercise',
        title: 'A horizontal tangent',
        html:
          '<p>The curve is again \\(f(x) = \\tfrac{1}{6}x^3 - x\\). Drag the point to a position where the derivative is zero, that is, where the tangent line is horizontal.</p>',
        hint: 'A horizontal tangent occurs at the top of a hill or the bottom of a valley of the graph.',
        mount: function (el, ctx) {
          var done = false;
          var p = M4.plane(el, { xmin: -3, xmax: 3, ymin: -2, ymax: 2, width: 520, height: 347 });
          p.fn(g, { stroke: C.green, width: 4 });
          var tan = p.line(0, 0, 0, 0, { stroke: C.orange, width: 4 });
          var a = 0.2;
          var row = M4.el('div', { class: 'm4-row calculus-s1-readouts' }, el);
          var rX = readout(row, 'x'), rD = readout(row, 'slope f\u2032(x)');
          var hd;
          function update() {
            var m = dg(a), y = g(a);
            var dx = 1.1 / Math.sqrt(1 + m * m);
            tan.set(a - dx, y - m * dx, a + dx, y + m * dx);
            if (hd) hd.set(a, y);
            rX.set(fmt(a)); rD.set(fmt(m));
          }
          hd = p.handle(a, g(a), {
            color: C.green,
            onDrag: function (x) {
              if (done) { update(); return; }
              a = clamp(x, -2.9, 2.9); update();
            },
            onEnd: function () {
              if (done) return;
              var m = dg(a);
              if (Math.abs(m) < 0.2) {
                done = true;
                a = (a > 0 ? 1 : -1) * Math.SQRT2;
                update();
                tan.el.setAttribute('stroke', C.green);
                var ring = M4.svg('circle', {
                  cx: p.x(a), cy: p.y(g(a)), r: 22, fill: 'none',
                  stroke: C.green, 'stroke-width': 4, 'pointer-events': 'none'
                }, p.g);
                ring.setAttribute('class', 'm4-pop');
                ctx.note('The tangent is horizontal at \\(x = ' + (a > 0 ? '' : '-') + '\\sqrt{2} \\approx ' + (a > 0 ? '' : '-') + '1.41\\), where \\(f\'(x) = \\tfrac{1}{2}x^2 - 1 = 0\\).');
                ctx.solved();
              } else if (m > 0) {
                ctx.wrong('The slope here is ' + fmt(m) + ', so the tangent still rises to the right. Move toward a peak or a valley.');
              } else {
                ctx.wrong('The slope here is ' + fmt(m) + ', so the tangent falls to the right. Move toward a peak or a valley.');
              }
            }
          });
          update();
        }
      },
      // 9
      {
        kind: 'exercise',
        title: 'Slopes at marked points',
        html:
          '<p>Three points are marked on \\(f(x) = x^2\\): \\(A\\) at \\(x = -1\\), \\(B\\) at \\(x = 0.5\\) and \\(C\\) at \\(x = 2\\). Drag the correct derivative value into the slot of each point. One tile is not used.</p>',
        hint: 'For this function the derivative is f′(a) = 2a. A falling tangent has a negative slope.',
        mount: function (el, ctx) {
          var p = M4.plane(el, { xmin: BOX.xmin, xmax: BOX.xmax, ymin: BOX.ymin, ymax: BOX.ymax, width: 520, height: 520 });
          p.fn(sq, { stroke: C.green, width: 4 });
          var pts = [
            { k: 'A', x: -1, lx: -1.55, ly: 1.15, col: C.purple },
            { k: 'B', x: 0.5, lx: 0.5, ly: 1.25, col: C.blue },
            { k: 'C', x: 2, lx: 2.5, ly: 3.55, col: C.pink }
          ];
          pts.forEach(function (q) {
            var m = 2 * q.x, y = sq(q.x), dx = 0.75 / Math.sqrt(1 + m * m * 0.36);
            p.line(q.x - dx, y - m * dx, q.x + dx, y + m * dx, { stroke: q.col, width: 3 });
            p.point(q.x, y, { r: 8, fill: q.col });
            p.text(q.lx, q.ly, q.k, { fill: q.col, size: 20, weight: 700 });
          });
          var slotsRow = M4.el('div', { class: 'm4-row', style: 'margin-top:12px;gap:22px' }, el);
          var slots = pts.map(function (q) {
            var col = M4.el('div', { class: 'calculus-s1-slotcol' }, slotsRow);
            M4.el('div', { text: 'slope at ' + q.k, style: 'color:' + q.col }, col);
            var s = M4.el('div', { class: 'm4-slot calculus-s1-slot' }, col);
            s.setAttribute('data-want', String(2 * q.x));
            return s;
          });
          var tray = M4.el('div', { class: 'm4-row calculus-s1-tray' }, el);
          var tokens = [4, -2, 0, 1].map(function (v) {
            var t = M4.el('div', { class: 'm4-token calculus-s1-token', text: fmt(v, 0) }, tray);
            t.setAttribute('data-v', String(v));
            return t;
          });
          var done = false, timer = 0;
          function tokenIn(s) { return s.querySelector('.m4-token'); }
          function refresh() {
            slots.forEach(function (s) { s.classList.toggle('filled', !!tokenIn(s)); });
          }
          function check() {
            var filled = slots.every(function (s) { return !!tokenIn(s); });
            if (!filled) { ctx.note(''); return; }
            var bad = slots.filter(function (s) { return tokenIn(s).getAttribute('data-v') !== s.getAttribute('data-want'); });
            if (bad.length === 0) {
              done = true;
              slots.forEach(function (s) { s.style.borderColor = C.green; s.classList.add('m4-pop'); });
              ctx.note('Correct: \\(f\'(-1) = -2\\), \\(f\'(0.5) = 1\\) and \\(f\'(2) = 4\\).');
              ctx.solved();
            } else {
              ctx.wrong((3 - bad.length) + ' of 3 slopes are correct. The incorrect tiles return to the tray. Compare each tangent with the sign and size of the value.');
              bad.forEach(function (s) { s.classList.add('m4-shake'); });
              timer = setTimeout(function () {
                bad.forEach(function (s) {
                  s.classList.remove('m4-shake');
                  var t = tokenIn(s);
                  if (t) tray.appendChild(t);
                });
                refresh();
              }, 550);
            }
          }
          M4.dragDrop({
            tokens: tokens,
            slots: slots,
            onDrop: function (t, s) {
              if (done) return;
              var old = tokenIn(s);
              if (old && old !== t) tray.appendChild(old);
              s.appendChild(t);
              refresh();
              check();
            },
            onMiss: function (t) {
              if (done) return;
              tray.appendChild(t);
              refresh();
            }
          });
          ctx.onCleanup(function () { clearTimeout(timer); });
        }
      },
      // 10
      {
        kind: 'text',
        title: 'Derivatives in machine learning',
        html:
          '<p>A machine learning program, called a <em>model</em>, makes predictions that depend on adjustable numbers, called <em>parameters</em>. A single number \\(L(w)\\), called the <em>loss</em>, measures how wrong the predictions are for the parameter value \\(w\\). <em>Training</em> means changing \\(w\\) until the loss is small. The derivative \\(L\'(w)\\) states how the loss responds to a small change of \\(w\\): if it is positive, increasing \\(w\\) increases the loss. If it is negative, increasing \\(w\\) decreases it.</p>' +
          '<p><b>Gradient descent</b> therefore moves the parameter against the sign of the derivative, with a step proportional to its size (the name comes from the version with many parameters, which the multivariable module covers):</p>' +
          '\\[ w_{\\text{new}} = w - \\eta \\, L\'(w), \\]' +
          '<p>where \\(\\eta > 0\\) is a small constant called the learning rate. Where the derivative is zero the update stops, which is the flat tangent found earlier.</p>'
      },
      // 11
      {
        kind: 'exercise',
        title: 'One step of gradient descent',
        html:
          '<p>The loss is \\(L(w) = (w-1)^2\\). The limit computation used for \\(x^2\\) gives the secant slope \\(2(w-1) + h\\), hence \\(L\'(w) = 2(w-1)\\). The parameter starts at \\(w = 3\\) and the learning rate is \\(\\eta = 0.25\\).</p>' +
          '<p>Drag the point to the position \\(w_{\\text{new}} = w - \\eta\\, L\'(w)\\) reached after one update, then press Check.</p>',
        hint: 'First evaluate L′(3) = 2(3 − 1). Multiply by 0.25 and subtract the result from 3.',
        mount: function (el, ctx) {
          var b = { xmin: -1, xmax: 5, ymin: -1, ymax: 9 };
          var p = M4.plane(el, { xmin: -1, xmax: 5, ymin: -1, ymax: 9, width: 520, height: 520 });
          var pts = [], i;
          for (i = 0; i <= 100; i++) { var x = -1 + 5 * i / 100; pts.push([x, loss(x)]); }
          p.path(pts, { stroke: C.green, width: 4 });
          var tan = p.line(0, 0, 0, 0, { stroke: C.purple, width: 2, dash: '7 6' });
          setClipped(tan, 3, 4, 4, b);
          p.point(3, 4, { r: 9, fill: C.muted });
          p.text(3.3, 3.6, 'start, w = 3', { fill: C.muted, size: 16, anchor: 'start' });
          p.text(4.75, -0.55, 'w', { fill: C.ink, size: 18, weight: 700 });
          p.text(-0.55, 8.5, 'L', { fill: C.ink, size: 18, weight: 700 });
          var drop = p.line(3, 0, 3, 4, { stroke: C.orange, width: 2, dash: '3 4' });
          var w = 3, done = false;
          var row = M4.el('div', { class: 'm4-row calculus-s1-readouts' }, el);
          var rW = readout(row, 'w'), rL = readout(row, 'L(w)'), rD = readout(row, 'L\u2032(w)');
          var hd;
          function update() {
            if (hd) hd.set(w, loss(w));
            drop.set(w, 0, w, loss(w));
            rW.set(fmt(w)); rL.set(fmt(loss(w))); rD.set(fmt(2 * (w - 1)));
          }
          hd = p.handle(3, 4, {
            color: C.orange,
            onDrag: function (x) {
              if (!done) w = clamp(Math.round(x / 0.25) * 0.25, -1, 4);
              update();
            }
          });
          update();
          var r2 = M4.el('div', { class: 'm4-row' }, el);
          M4.button(r2, 'Check', function () {
            if (done) return;
            if (Math.abs(w - 2) < 1e-6) {
              done = true;
              p.arrow(3, 0, 2.08, 0, { stroke: C.orange, width: 4 });
              var ring = M4.svg('circle', {
                cx: p.x(2), cy: p.y(1), r: 22, fill: 'none',
                stroke: C.green, 'stroke-width': 4, 'pointer-events': 'none'
              }, p.g);
              ring.setAttribute('class', 'm4-pop');
              ctx.note('Correct: \\(L\'(3) = 4\\), so \\(w_{\\text{new}} = 3 - 0.25 \\cdot 4 = 2\\). The loss falls from \\(4\\) to \\(1\\).');
              ctx.solved();
            } else if (Math.abs(w - 3) < 1e-6) {
              ctx.wrong('The point has not moved. The derivative at w = 3 is not zero, so the update changes w.');
            } else if (w > 3) {
              ctx.wrong('This moves uphill and the loss increases. The update subtracts η · L′(w), and L′(3) is positive.');
            } else if (Math.abs(w - 1) < 1e-6) {
              ctx.wrong('That is the minimum of the loss, but a single step moves only by η · L′(3) = 0.25 · 4.');
            } else if (Math.abs(w + 1) < 1e-6) {
              ctx.wrong('That subtracts L′(3) = 4 without multiplying by the learning rate 0.25.');
            } else {
              ctx.wrong('The direction is correct, but the step length must equal η · L′(3) with L′(3) = 2(3 − 1).');
            }
          }, { primary: true });
        }
      },
      // 12
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>The secant slope \\(\\dfrac{f(a+h) - f(a)}{h}\\) is the average rate of change of \\(f\\) between \\(a\\) and \\(a+h\\).</li>' +
          '<li>The derivative \\(f\'(a)\\) is the limit of the secant slope as \\(h \\to 0\\). It is the slope of the tangent at \\(a\\). For \\(f(x) = x^2\\) it equals \\(2a\\).</li>' +
          '<li>The derivative is itself a function. Its sign states whether \\(f\\) rises or falls, and gradient descent uses it to update a parameter by \\(w - \\eta\\, L\'(w)\\).</li>' +
          '</ul>' +
          '<p>The next session derives rules that give derivatives of common functions without computing a limit each time.</p>'
      }
    ]
  });
})();
