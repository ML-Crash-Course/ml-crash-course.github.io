(function () {
  'use strict';

  var C = M4.colors;
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- local helpers ---------- */

  function injectStyle() {
    if (document.getElementById('l1-s3-style')) return;
    var s = document.createElement('style');
    s.id = 'l1-s3-style';
    s.textContent = [
      '.l1-s3-svg{width:100%;height:auto;display:block;user-select:none;-webkit-user-select:none}',
      '.l1-s3-card{background:#fff;border:2px solid ' + C.line + ';border-radius:18px;padding:14px;margin:10px 0}',
      '.l1-s3-bins{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}',
      '@media(max-width:640px){.l1-s3-bins{grid-template-columns:1fr}}',
      '.l1-s3-bin{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:8px;min-height:190px;height:auto;width:auto;padding:12px;border-radius:16px;box-sizing:border-box}',
      '.l1-s3-binhead{font-weight:700;font-size:16px;text-align:center;padding-bottom:4px}',
      '.l1-s3-pool{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;min-height:60px}',
      '.l1-s3-tok{font-size:15px;line-height:1.3;padding:10px 12px;max-width:220px;text-align:center;touch-action:none}',
      '.l1-s3-tok.l1-s3-done{cursor:default;pointer-events:none;max-width:none;border-color:' + C.green + ';background:#effaf4}',
      '.l1-s3-grip{cursor:grab;touch-action:none}',
      '.l1-s3-grip:active{cursor:grabbing}',
      '.l1-s3-center{display:flex;justify-content:center}',
      '.l1-s3-ok{border-color:' + C.green + ' !important;color:' + C.green + ' !important}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function S(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
      }
    }
    if (text !== undefined && text !== null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  function makeSvg(parent, w, h) {
    var svg = S('svg', { viewBox: '0 0 ' + w + ' ' + h, 'class': 'l1-s3-svg' }, parent);
    svg.setAttribute('font-family', 'Inter, system-ui, sans-serif');
    return svg;
  }

  function readout(parent, text) {
    return M4.el('span', { 'class': 'm4-readout', text: text || '' }, parent);
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function ramp(u, a, b) { return clamp((u - a) / (b - a), 0, 1); }
  function ease(u) { return u * u * (3 - 2 * u); }

  /* ---------- step 3: sort tasks into the three types ---------- */

  function mountSort(el, ctx) {
    injectStyle();
    var items = [
      { t: 'Label e-mails as spam or no spam, using e-mails that were annotated by people', k: 0 },
      { t: 'Partition data points into groups that lie close together', k: 1 },
      { t: 'Learn to play Go by playing games and receiving reward for winning', k: 2 },
      { t: 'Estimate the age of a person on a photo, given photos with known ages', k: 0 },
      { t: 'Find the outline, eyes and whiskers of a cat from unannotated photos', k: 1 },
      { t: 'Steer a robot by trial, with reward for each second it stays upright', k: 2 }
    ];
    var names = ['Supervised', 'Unsupervised', 'Reinforcement'];
    var cols = [C.blue, C.orange, C.purple];
    var why = [
      'Supervised learning needs a gold label for every example.',
      'Unsupervised learning uses data without labels and looks for structure.',
      'Reinforcement learning requires interaction with an environment and a reward.'
    ];

    var pool = M4.el('div', { 'class': 'l1-s3-pool' }, el);
    var bins = M4.el('div', { 'class': 'l1-s3-bins' }, el);
    var slots = [], tokens = [], placed = 0;

    names.forEach(function (n, i) {
      var b = M4.el('div', { 'class': 'm4-slot l1-s3-bin' }, bins);
      b.setAttribute('data-k', String(i));
      M4.el('div', { 'class': 'l1-s3-binhead', style: 'color:' + cols[i], text: n }, b);
      slots.push(b);
    });
    items.forEach(function (it) {
      var t = M4.el('div', { 'class': 'm4-token l1-s3-tok', text: it.t }, pool);
      t.setAttribute('data-k', String(it.k));
      tokens.push(t);
    });

    M4.dragDrop({
      tokens: tokens,
      slots: slots,
      onDrop: function (tok, slot) {
        var want = +tok.getAttribute('data-k');
        var got = +slot.getAttribute('data-k');
        if (tok.classList.contains('l1-s3-done')) return;
        if (want === got) {
          tok.classList.add('l1-s3-done');
          tok.style.transform = '';
          tok.style.left = '';
          tok.style.top = '';
          tok.style.position = '';
          slot.appendChild(tok);
          placed += 1;
          ctx.note(placed + ' of ' + items.length + ' tasks placed.');
          if (placed === items.length) {
            ctx.note('All six tasks are placed in the correct type of learning.');
            ctx.solved();
          }
        } else {
          if (tok.parentNode !== pool) pool.appendChild(tok);
          ctx.wrong('This task is not ' + names[got].toLowerCase() + ' learning. ' + why[got]);
        }
      },
      onMiss: function () {
        ctx.note('Drop each task onto one of the three columns.');
      }
    });
  }

  /* ---------- step 4: clustering by dragging two centres ---------- */

  function mountCluster(el, ctx) {
    injectStyle();
    var r = rng(11);
    function gauss() {
      var u = Math.max(r(), 1e-9), v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    var pts = [], i;
    for (i = 0; i < 14; i++) pts.push([clamp(3 + 0.85 * gauss(), 0.6, 9.4), clamp(6.6 + 0.85 * gauss(), 0.6, 9.4)]);
    for (i = 0; i < 14; i++) pts.push([clamp(7 + 0.85 * gauss(), 0.6, 9.4), clamp(3.4 + 0.85 * gauss(), 0.6, 9.4)]);

    function assign(c) {
      return pts.map(function (p) {
        var d0 = (p[0] - c[0][0]) * (p[0] - c[0][0]) + (p[1] - c[0][1]) * (p[1] - c[0][1]);
        var d1 = (p[0] - c[1][0]) * (p[0] - c[1][0]) + (p[1] - c[1][1]) * (p[1] - c[1][1]);
        return d0 <= d1 ? { k: 0, d: d0 } : { k: 1, d: d1 };
      });
    }
    function cost(c) {
      var a = assign(c), s = 0;
      for (var j = 0; j < a.length; j++) s += a[j].d;
      return s / a.length;
    }
    function means(c) {
      var a = assign(c), m = [[0, 0, 0], [0, 0, 0]];
      for (var j = 0; j < a.length; j++) { m[a[j].k][0] += pts[j][0]; m[a[j].k][1] += pts[j][1]; m[a[j].k][2] += 1; }
      return m.map(function (q, k) { return q[2] ? [q[0] / q[2], q[1] / q[2], q[2]] : [c[k][0], c[k][1], 0]; });
    }
    // optimum by Lloyd's iterations from the generating centres
    var opt = [[3, 6.6], [7, 3.4]];
    for (i = 0; i < 12; i++) { var mm = means(opt); opt = [[mm[0][0], mm[0][1]], [mm[1][0], mm[1][1]]]; }
    var best = cost(opt);
    var target = Math.ceil(best * 1.25 * 100) / 100;

    var bar = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin-bottom:10px' }, el);
    var rCost = readout(bar, '');
    var rTarget = readout(bar, 'target: at most ' + target.toFixed(2));

    var wrap = M4.el('div', {}, el);
    var p = M4.plane(wrap, { xmin: 0, xmax: 10, ymin: 0, ymax: 10, width: 520, height: 520 });
    var cols = [C.blue, C.orange];
    var c = [[2, 2], [8, 8]];
    var lines = pts.map(function (q) { return p.line(q[0], q[1], q[0], q[1], { stroke: C.line, width: 1.5 }); });
    var dots = pts.map(function (q) { return p.point(q[0], q[1], { r: 7, fill: C.muted }); });
    var done = false;

    function draw() {
      var a = assign(c);
      for (var j = 0; j < pts.length; j++) {
        var cc = c[a[j].k];
        lines[j].set(pts[j][0], pts[j][1], cc[0], cc[1]);
        lines[j].el.setAttribute('stroke', cols[a[j].k]);
        lines[j].el.setAttribute('stroke-opacity', '0.3');
        dots[j].el.setAttribute('fill', cols[a[j].k]);
      }
      var v = cost(c);
      rCost.textContent = 'mean squared distance: ' + v.toFixed(2);
      if (v <= target) {
        rCost.classList.add('l1-s3-ok');
        if (!done) {
          done = true;
          ctx.note('Each centre lies close to the mean of its group, so the partition separates the two groups.');
          ctx.solved();
        }
      } else {
        rCost.classList.remove('l1-s3-ok');
      }
      return v;
    }
    function feedback() {
      if (cost(c) <= target) return;
      var m = means(c), nm = ['blue', 'orange'], worst = 0, wd = -1;
      for (var k = 0; k < 2; k++) {
        if (m[k][2] === 0) { ctx.note('The ' + nm[k] + ' centre has no points assigned to it. Move it closer to the data.'); return; }
        var d = Math.sqrt(Math.pow(c[k][0] - m[k][0], 2) + Math.pow(c[k][1] - m[k][1], 2));
        if (d > wd) { wd = d; worst = k; }
      }
      if (Math.abs(m[0][2] - m[1][2]) > 4) {
        ctx.note('The groups are split unevenly: ' + m[0][2] + ' points are blue and ' + m[1][2] + ' are orange. Each visible group should receive its own centre.');
      } else {
        ctx.note('The ' + nm[worst] + ' centre is ' + wd.toFixed(1) + ' units from the mean of its points.');
      }
    }
    function mk(k) {
      var h = p.handle(c[k][0], c[k][1], {
        color: cols[k], r: 14, snap: 0,
        onDrag: function (x, y) { c[k] = [clamp(x, 0, 10), clamp(y, 0, 10)]; draw(); },
        onEnd: function (x, y) {
          c[k] = [clamp(x, 0, 10), clamp(y, 0, 10)];
          if (x !== c[k][0] || y !== c[k][1]) h.set(c[k][0], c[k][1]);
          draw(); feedback();
        }
      });
      return h;
    }
    mk(0); mk(1);
    draw();
  }

  /* ---------- step 5: the training loop ---------- */

  function mountTrain(el, ctx) {
    injectStyle();
    var r = rng(5), data = [], i;
    for (i = 0; i < 12; i++) {
      var dog = i % 2;
      var n1 = (r() - 0.5) * 0.6, n2 = (r() - 0.5) * 0.6;
      data.push(dog ? { y: 1, x: [-0.6 + n1, 0.7 + n2] } : { y: 0, x: [0.8 + n1, -0.7 + n2] });
    }
    var W0 = [0.9, -0.8], LR = 0.5;
    function pred(w, x) { return 1 / (1 + Math.exp(-(w[0] * x[0] + w[1] * x[1]))); }
    function meanErr(w) {
      var s = 0;
      for (var j = 0; j < data.length; j++) s += Math.abs(pred(w, data[j].x) - data[j].y);
      return s / data.length;
    }
    var st = { w: W0.slice(), step: 0, hist: [meanErr(W0)], anim: null, auto: false, raf: 0, dead: false };

    var card = M4.el('div', { 'class': 'l1-s3-card' }, el);
    var svg = makeSvg(card, 720, 300);

    // input card
    S('text', { x: 95, y: 52, 'text-anchor': 'middle', 'font-size': 16, fill: C.muted, 'font-weight': 600 }, svg, 'input');
    var gIn = S('g', { opacity: 0 }, svg);
    S('rect', { x: 20, y: 66, width: 150, height: 150, rx: 18, fill: '#fff', stroke: C.line, 'stroke-width': 2 }, gIn);
    var gFace = S('g', { transform: 'translate(95,146)' }, gIn);

    // arrows
    function arrow(x1, x2, y) {
      S('line', { x1: x1, y1: y, x2: x2 - 8, y2: y, stroke: C.muted, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
      S('path', { d: 'M' + (x2 - 12) + ' ' + (y - 8) + ' L' + x2 + ' ' + y + ' L' + (x2 - 12) + ' ' + (y + 8), fill: 'none', stroke: C.muted, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    }
    arrow(180, 232, 141);
    arrow(488, 532, 141);

    // engine
    S('text', { x: 360, y: 38, 'text-anchor': 'middle', 'font-size': 16, fill: C.blue, 'font-weight': 700 }, svg, 'model');
    S('rect', { x: 240, y: 50, width: 240, height: 190, rx: 22, fill: '#eaf0ff', stroke: C.blue, 'stroke-width': 3 }, svg);
    function gear(cx, cy) {
      var g = S('g', {}, svg), n = 10, d = '', stepA = 2 * Math.PI / n;
      for (var k = 0; k < n; k++) {
        var a = k * stepA;
        var q = [[30, a], [38, a + 0.18 * stepA], [38, a + 0.5 * stepA], [30, a + 0.68 * stepA]];
        for (var m = 0; m < 4; m++) {
          d += (d ? 'L' : 'M') + (q[m][0] * Math.cos(q[m][1])).toFixed(2) + ' ' + (q[m][0] * Math.sin(q[m][1])).toFixed(2);
        }
      }
      S('path', { d: d + 'Z', fill: C.blue, stroke: '#1f4fd1', 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
      S('circle', { cx: 0, cy: 0, r: 10, fill: '#fff' }, g);
      S('circle', { cx: 0, cy: -21, r: 5.5, fill: C.yellow }, g);
      return { g: g, cx: cx, cy: cy };
    }
    var gears = [gear(305, 128), gear(415, 128)];
    var wText = [
      S('text', { x: 305, y: 208, 'text-anchor': 'middle', 'font-size': 16, fill: C.ink, 'font-weight': 600 }, svg, ''),
      S('text', { x: 415, y: 208, 'text-anchor': 'middle', 'font-size': 16, fill: C.ink, 'font-weight': 600 }, svg, '')
    ];

    // right column
    var gPred = S('g', { opacity: 0 }, svg);
    S('text', { x: 620, y: 52, 'text-anchor': 'middle', 'font-size': 16, fill: C.muted, 'font-weight': 600 }, gPred, 'prediction');
    S('rect', { x: 545, y: 62, width: 150, height: 50, rx: 14, fill: '#fff', stroke: C.line, 'stroke-width': 2 }, gPred);
    var tPred = S('text', { x: 620, y: 94, 'text-anchor': 'middle', 'font-size': 20, fill: C.ink, 'font-weight': 700 }, gPred, '');
    var gLab = S('g', { opacity: 0 }, svg);
    var tErr = S('text', { x: 620, y: 147, 'text-anchor': 'middle', 'font-size': 17, fill: C.red, 'font-weight': 700 }, gLab, '');
    S('rect', { x: 545, y: 166, width: 150, height: 50, rx: 14, fill: '#fff', stroke: C.line, 'stroke-width': 2 }, gLab);
    var tLab = S('text', { x: 620, y: 198, 'text-anchor': 'middle', 'font-size': 20, fill: C.ink, 'font-weight': 700 }, gLab, '');
    S('text', { x: 620, y: 236, 'text-anchor': 'middle', 'font-size': 16, fill: C.muted, 'font-weight': 600 }, gLab, 'true label');

    var tCap = S('text', { x: 360, y: 282, 'text-anchor': 'middle', 'font-size': 17, fill: C.ink, 'font-weight': 600 }, svg, '');

    function drawFace(y) {
      while (gFace.firstChild) gFace.removeChild(gFace.firstChild);
      if (y === 0) {
        S('path', { d: 'M-38 -18 L-34 -58 L-8 -34 Z', fill: C.orange }, gFace);
        S('path', { d: 'M38 -18 L34 -58 L8 -34 Z', fill: C.orange }, gFace);
        S('circle', { cx: 0, cy: 4, r: 40, fill: C.orange }, gFace);
        S('path', { d: 'M-6 10 L6 10 L0 17 Z', fill: C.ink }, gFace);
        S('path', { d: 'M-34 14 L-12 16 M-34 24 L-12 20 M34 14 L12 16 M34 24 L12 20', stroke: C.ink, 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' }, gFace);
      } else {
        S('circle', { cx: 0, cy: 0, r: 38, fill: C.purple }, gFace);
        S('ellipse', { cx: -38, cy: 2, rx: 12, ry: 30, fill: '#5a3fd6' }, gFace);
        S('ellipse', { cx: 38, cy: 2, rx: 12, ry: 30, fill: '#5a3fd6' }, gFace);
        S('ellipse', { cx: 0, cy: 20, rx: 17, ry: 13, fill: '#fff', 'fill-opacity': 0.9 }, gFace);
        S('ellipse', { cx: 0, cy: 14, rx: 7, ry: 5, fill: C.ink }, gFace);
      }
      S('circle', { cx: -14, cy: -6, r: 5, fill: C.ink }, gFace);
      S('circle', { cx: 14, cy: -6, r: 5, fill: C.ink }, gFace);
    }

    function setGears(w) {
      for (var k = 0; k < 2; k++) {
        gears[k].g.setAttribute('transform', 'translate(' + gears[k].cx + ',' + gears[k].cy + ') rotate(' + (w[k] * 120).toFixed(2) + ')');
        wText[k].textContent = 'w' + (k ? '₂' : '₁') + ' = ' + w[k].toFixed(2);
      }
    }

    // history chart
    var card2 = M4.el('div', { 'class': 'l1-s3-card' }, el);
    var hs = makeSvg(card2, 720, 170);
    S('text', { x: 60, y: 22, 'font-size': 16, fill: C.muted, 'font-weight': 600 }, hs, 'mean error over all 12 examples, after each step');
    var HX0 = 60, HX1 = 700, HY0 = 140, HY1 = 40;
    [0, 0.5, 1].forEach(function (v) {
      var yy = HY0 + (HY1 - HY0) * v;
      S('line', { x1: HX0, y1: yy, x2: HX1, y2: yy, stroke: C.line, 'stroke-width': v === 0 ? 2 : 1 }, hs);
      S('text', { x: HX0 - 10, y: yy + 5, 'text-anchor': 'end', 'font-size': 15, fill: C.muted }, hs, v.toFixed(1));
    });
    var hPath = S('polyline', { fill: 'none', stroke: C.red, 'stroke-width': 3.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, hs);
    var hDot = S('circle', { r: 6, fill: C.red }, hs);
    S('text', { x: (HX0 + HX1) / 2, y: 164, 'text-anchor': 'middle', 'font-size': 15, fill: C.muted }, hs, 'training steps');

    var bar = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin-top:8px' }, el);
    var rStep = readout(bar, ''), rErr = readout(bar, '');

    function drawHist() {
      var n = Math.max(24, st.hist.length - 1), s = '', x = HX0, y = HY0;
      for (var j = 0; j < st.hist.length; j++) {
        x = HX0 + (HX1 - HX0) * j / n;
        y = HY0 + (HY1 - HY0) * st.hist[j];
        s += x.toFixed(1) + ',' + y.toFixed(1) + ' ';
      }
      hPath.setAttribute('points', s);
      hDot.setAttribute('cx', x); hDot.setAttribute('cy', y);
      rStep.textContent = 'steps: ' + st.step;
      rErr.textContent = 'mean error: ' + st.hist[st.hist.length - 1].toFixed(2);
    }

    function idle() {
      gIn.setAttribute('opacity', 0); gPred.setAttribute('opacity', 0); gLab.setAttribute('opacity', 0);
      setGears(st.w);
      tCap.textContent = st.step === 0 ? 'The untrained model: two parameters, shown as gears.' : 'The example is gone. The model remains, with its adjusted parameters.';
    }

    function frame(now) {
      if (st.dead || !st.anim) return;
      var a = st.anim, u = clamp((now - a.t0) / a.dur, 0, 1);
      var out = 1 - ramp(u, 0.9, 1);
      var g = ease(ramp(u, 0.58, 0.84));
      var w = [a.w0[0] + (a.w1[0] - a.w0[0]) * g, a.w0[1] + (a.w1[1] - a.w0[1]) * g];
      var p = pred(w, a.ex.x);
      gIn.setAttribute('opacity', (ramp(u, 0, 0.1) * out).toFixed(3));
      gPred.setAttribute('opacity', (ramp(u, 0.18, 0.28) * out).toFixed(3));
      gLab.setAttribute('opacity', (ramp(u, 0.36, 0.46) * out).toFixed(3));
      tPred.textContent = p > 0.5 ? 'dog' : 'cat';
      tPred.setAttribute('fill', (p > 0.5) === (a.ex.y === 1) ? C.green : C.red);
      tErr.textContent = 'error ' + Math.abs(p - a.ex.y).toFixed(2);
      setGears(w);
      tCap.textContent = u < 0.18 ? '1. An example enters the model.'
        : u < 0.36 ? '2. The model outputs a prediction.'
        : u < 0.58 ? '3. Comparing with the true label gives the error.'
        : u < 0.9 ? '4. The parameters are adjusted and the error decreases.'
        : 'The example is gone. The model remains, with its adjusted parameters.';
      if (u >= 1) {
        st.w = a.w1; st.step += 1; st.hist.push(meanErr(st.w)); st.anim = null;
        drawHist(); idle();
        if (st.auto && st.step < 200) { begin(); } else if (st.auto) { toggleAuto(); }
        return;
      }
      st.raf = requestAnimationFrame(frame);
    }

    function begin() {
      if (st.anim || st.dead) return;
      var ex = data[st.step % data.length];
      var p = pred(st.w, ex.x);
      var w1 = [st.w[0] - LR * (p - ex.y) * ex.x[0], st.w[1] - LR * (p - ex.y) * ex.x[1]];
      drawFace(ex.y);
      tLab.textContent = ex.y ? 'dog' : 'cat';
      st.anim = { t0: performance.now(), dur: st.auto ? 1100 : 2800, ex: ex, w0: st.w.slice(), w1: w1 };
      st.raf = requestAnimationFrame(frame);
    }

    var ctl = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin-top:12px' }, el);
    M4.button(ctl, 'Feed one example', function () { begin(); }, { primary: true });
    var autoBtn = M4.button(ctl, 'Run the loop', function () { toggleAuto(); });
    function toggleAuto() {
      st.auto = !st.auto;
      autoBtn.textContent = st.auto ? 'Pause' : 'Run the loop';
      if (st.auto) begin();
    }
    M4.button(ctl, 'Reset', function () {
      cancelAnimationFrame(st.raf);
      st.anim = null;
      if (st.auto) { st.auto = false; autoBtn.textContent = 'Run the loop'; }
      st.w = W0.slice(); st.step = 0; st.hist = [meanErr(W0)];
      drawHist(); idle();
    });

    drawHist(); idle();
    ctx.onCleanup(function () { st.dead = true; st.auto = false; cancelAnimationFrame(st.raf); });
  }

  /* ---------- step 6: inference ---------- */

  function mountInference(el, ctx) {
    injectStyle();
    M4.choices(el, {
      options: [
        'The error is computed and the parameters are adjusted slightly.',
        'The parameters stay fixed and the model returns a prediction. Nothing checks whether it is correct.',
        'The true label is supplied so that a wrong prediction can be corrected.',
        'The model returns no answer, because the photo was not part of the training data.'
      ],
      correct: 1,
      onCorrect: function () {
        ctx.note('At inference there is no true label and no error, so the prediction is returned unchecked.');
        ctx.solved();
      },
      onWrong: function (i) {
        var msg = [
          'Computing an error requires a true label, and adjusting parameters is training. Neither happens at inference.',
          '',
          'No true label is available at inference. That side of the training picture has been discarded.',
          'Inference is defined on inputs the model has never seen. It always returns an answer.'
        ];
        ctx.wrong(msg[i] || 'That describes training, not inference.');
      }
    });
  }

  /* ---------- step 7: split bar ---------- */

  function mountSplit(el, ctx) {
    injectStyle();
    var N = 5000;
    var a = 50, b = 75, done = false;
    var X0 = 30, PW = 6.6, BY = 62, BH = 64;
    var card = M4.el('div', { 'class': 'l1-s3-card' }, el);
    var svg = makeSvg(card, 720, 200);
    function X(pc) { return X0 + pc * PW; }

    S('rect', { x: X(0) - 3, y: BY - 3, width: 100 * PW + 6, height: BH + 6, rx: 17, fill: C.line }, svg);
    var clip = S('clipPath', { id: 'l1-s3-clip' }, svg);
    S('rect', { x: X(0), y: BY, width: 100 * PW, height: BH, rx: 14 }, clip);
    var gb = S('g', { 'clip-path': 'url(#l1-s3-clip)' }, svg);
    var segs = [C.blue, C.orange, C.purple].map(function (c) { return S('rect', { y: BY, height: BH, fill: c }, gb); });
    // ghost of the target split
    [80, 90].forEach(function (pc) {
      S('line', { x1: X(pc), y1: BY - 16, x2: X(pc), y2: BY + BH + 16, stroke: C.ink, 'stroke-opacity': 0.22, 'stroke-width': 2, 'stroke-dasharray': '5 5' }, svg);
    });
    var names = ['training', 'validation', 'test'];
    var cols = [C.blue, C.orange, C.purple];
    var lab = names.map(function (n, i) {
      var y = i === 1 ? 24 : 160;
      return {
        n: S('text', { y: y, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: cols[i] }, svg, n),
        p: S('text', { y: y + 20, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: C.ink }, svg, '')
      };
    });

    function grip() {
      var g = S('g', { 'class': 'l1-s3-grip' }, svg);
      S('rect', { x: -24, y: BY - 20, width: 48, height: BH + 40, fill: 'transparent' }, g);
      S('rect', { x: -9, y: BY - 12, width: 18, height: BH + 24, rx: 9, fill: '#fff', stroke: C.ink, 'stroke-width': 2.5 }, g);
      S('line', { x1: -3, y1: BY + 18, x2: -3, y2: BY + BH - 18, stroke: C.muted, 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
      S('line', { x1: 3, y1: BY + 18, x2: 3, y2: BY + BH - 18, stroke: C.muted, 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
      return g;
    }
    var gA = grip(), gB = grip();

    var bar = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin-top:6px' }, el);
    var ro = names.map(function () { return readout(bar, ''); });

    function draw() {
      var w = [a, b - a, 100 - b], st = [0, a, b];
      for (var i = 0; i < 3; i++) {
        segs[i].setAttribute('x', X(st[i]));
        segs[i].setAttribute('width', w[i] * PW);
        var cx = clamp(X(st[i] + w[i] / 2), 44, 676);
        lab[i].n.setAttribute('x', cx); lab[i].p.setAttribute('x', cx);
        lab[i].p.textContent = w[i] + '%';
        ro[i].textContent = names[i] + ': ' + Math.round(N * w[i] / 100) + ' examples';
        ro[i].classList.toggle('l1-s3-ok', w[i] === [80, 10, 10][i]);
      }
      gA.setAttribute('transform', 'translate(' + X(a) + ',0)');
      gB.setAttribute('transform', 'translate(' + X(b) + ',0)');
    }
    function check() {
      if (a === 80 && b === 90) {
        if (!done) {
          done = true;
          ctx.note('Of 5000 examples, 4000 are used for training, 500 for validation and 500 for testing.');
          ctx.solved();
        }
      } else if (a !== 80) {
        ctx.note('The training part holds ' + a + '% of the data. In the split from the lecture it holds 80%.');
      } else {
        ctx.note('Validation holds ' + (b - a) + '% and test holds ' + (100 - b) + '%. The lecture gives each of them 10%.');
      }
    }
    function scale() {
      var r = svg.getBoundingClientRect();
      return r.width > 0 ? 720 / r.width : 1;
    }
    function snap5(v) { return Math.round(v / 5) * 5; }
    var a0 = a, b0 = b;
    M4.drag(gA, {
      onStart: function () { a0 = a; },
      onMove: function (dx) { a = clamp(snap5(a0 + dx * scale() / PW), 5, b - 5); draw(); },
      onEnd: function () { check(); }
    });
    M4.drag(gB, {
      onStart: function () { b0 = b; },
      onMove: function (dx) { b = clamp(snap5(b0 + dx * scale() / PW), a + 5, 95); draw(); },
      onEnd: function () { check(); }
    });
    draw();
  }

  /* ---------- step 8: selection on validation data is optimistic ---------- */

  function mountOptimism(el, ctx) {
    injectStyle();
    var KMAX = 50, NV = 100, TRUE = 70, REPS = 200;
    function binom(r) { var s = 0; for (var j = 0; j < NV; j++) if (r() < TRUE / 100) s++; return s; }
    // long-run averages for every k
    var avgBest = [], avgTest = [], k, rep;
    (function () {
      var r = rng(2024), sb = [], stt = [];
      for (k = 0; k <= KMAX; k++) { sb.push(0); stt.push(0); }
      for (rep = 0; rep < REPS; rep++) {
        var bv = -1, bt = 0;
        for (k = 1; k <= KMAX; k++) {
          var v = binom(r), t = binom(r);
          if (v > bv) { bv = v; bt = t; }
          sb[k] += bv; stt[k] += bt;
        }
      }
      for (k = 0; k <= KMAX; k++) { avgBest.push(sb[k] / REPS); avgTest.push(stt[k] / REPS); }
    })();

    var st = { k: 1, seed: 1, val: [], test: [], raf: 0, dead: false };
    function sample() {
      var r = rng(1000 + st.seed * 7919);
      st.val = []; st.test = [];
      for (var j = 0; j < KMAX; j++) { st.val.push(binom(r)); st.test.push(binom(r)); }
    }
    sample();

    var card = M4.el('div', { 'class': 'l1-s3-card' }, el);
    var svg = makeSvg(card, 720, 330);
    var AX0 = 40, AX1 = 680, LO = 50, HI = 90, BASE = 168, TROW = 262;
    function X(v) { return AX0 + (clamp(v, LO, HI) - LO) / (HI - LO) * (AX1 - AX0); }
    S('text', { x: AX0, y: 22, 'font-size': 16, 'font-weight': 600, fill: C.muted }, svg, 'validation accuracy of each candidate model');
    [50, 60, 70, 80, 90].forEach(function (v) {
      S('line', { x1: X(v), y1: 36, x2: X(v), y2: 282, stroke: C.line, 'stroke-width': 1 }, svg);
      S('text', { x: X(v), y: 200, 'text-anchor': 'middle', 'font-size': 15, fill: C.muted }, svg, v + '%');
    });
    S('line', { x1: AX0, y1: BASE + 10, x2: AX1, y2: BASE + 10, stroke: C.muted, 'stroke-width': 2 }, svg);
    S('line', { x1: AX0, y1: TROW + 20, x2: AX1, y2: TROW + 20, stroke: C.muted, 'stroke-width': 2 }, svg);
    S('line', { x1: X(TRUE), y1: 36, x2: X(TRUE), y2: 296, stroke: C.green, 'stroke-width': 2.5, 'stroke-dasharray': '6 6' }, svg);
    S('text', { x: X(TRUE), y: 316, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 600, fill: C.green }, svg, 'true accuracy of every model: 70%');
    S('text', { x: AX0, y: 232, 'font-size': 16, 'font-weight': 600, fill: C.muted }, svg, 'test accuracy of the selected model');
    var gDots = S('g', {}, svg);
    var link = S('line', { stroke: C.orange, 'stroke-width': 2, 'stroke-dasharray': '3 5', 'stroke-opacity': 0.7 }, svg);
    var testDot = S('circle', { r: 10, cy: TROW, fill: C.purple, stroke: '#fff', 'stroke-width': 2 }, svg);

    var bar = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin-top:6px' }, el);
    var rBest = readout(bar, ''), rTest = readout(bar, '');
    var bar2 = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin-top:6px' }, el);
    var rAvgB = readout(bar2, ''), rAvgT = readout(bar2, '');
    rBest.style.color = C.orange; rTest.style.color = C.purple;

    var nodes = [];
    function layout() {
      var cnt = {}, best = 0, j, items = [];
      for (j = 1; j < st.k; j++) if (st.val[j] > st.val[best]) best = j;
      for (j = 0; j < st.k; j++) {
        var v = clamp(st.val[j], LO, HI);
        cnt[v] = (cnt[v] || 0) + 1;
        items.push({ x: X(v), y: BASE - (cnt[v] - 1) * 12.5, best: j === best });
      }
      return { items: items, best: best };
    }
    function render(u) {
      var L = layout(), e = ease(u), j, x0 = X(TRUE);
      while (nodes.length < L.items.length) nodes.push(S('circle', { r: 6 }, gDots));
      for (j = 0; j < nodes.length; j++) {
        if (j >= L.items.length) { nodes[j].setAttribute('display', 'none'); continue; }
        var it = L.items[j];
        nodes[j].removeAttribute('display');
        nodes[j].setAttribute('cx', (x0 + (it.x - x0) * e).toFixed(1));
        nodes[j].setAttribute('cy', it.y);
        nodes[j].setAttribute('r', it.best ? 8 : 6);
        nodes[j].setAttribute('fill', it.best ? C.orange : C.blue);
        nodes[j].setAttribute('fill-opacity', it.best ? 1 : 0.55);
      }
      var b = L.items[L.best], tx = x0 + (X(st.test[L.best]) - x0) * e, bx = x0 + (b.x - x0) * e;
      testDot.setAttribute('cx', tx.toFixed(1));
      link.setAttribute('x1', bx.toFixed(1)); link.setAttribute('y1', b.y + 9);
      link.setAttribute('x2', tx.toFixed(1)); link.setAttribute('y2', TROW - 11);
      rBest.textContent = 'best validation accuracy: ' + st.val[L.best] + '%';
      rTest.textContent = 'its test accuracy: ' + st.test[L.best] + '%';
      rAvgB.textContent = 'average over ' + REPS + ' repetitions: ' + avgBest[st.k].toFixed(1) + '%';
      rAvgT.textContent = 'average over ' + REPS + ' repetitions: ' + avgTest[st.k].toFixed(1) + '%';
    }
    function animate() {
      cancelAnimationFrame(st.raf);
      var t0 = performance.now();
      (function f(now) {
        if (st.dead) return;
        var u = clamp((now - t0) / 500, 0, 1);
        render(u);
        if (u < 1) st.raf = requestAnimationFrame(f);
      })(t0);
    }

    var ctl = M4.el('div', { style: 'margin-top:12px' }, el);
    M4.slider(ctl, {
      min: 1, max: KMAX, step: 1, value: 1, label: 'candidate models compared',
      format: function (v) { return String(Math.round(v)); },
      onInput: function (v) { st.k = clamp(Math.round(+v), 1, KMAX); cancelAnimationFrame(st.raf); render(1); }
    });
    var row = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin-top:10px' }, el);
    M4.button(row, 'Draw new data sets', function () { st.seed += 1; sample(); animate(); }, { primary: true });
    M4.el('div', { 'class': 'm4-note', style: 'text-align:center;margin-top:8px', text: 'Each validation set and each test set contains 100 examples. All differences between the models are due to chance.' }, el);

    animate();
    ctx.onCleanup(function () { st.dead = true; cancelAnimationFrame(st.raf); });
  }

  /* ---------- step 9: one prediction of a regression model ---------- */

  function mountPredict(el, ctx) {
    injectStyle();
    var row = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin:6px 0 14px' }, el);
    M4.el('span', { 'class': 'm4-chip', html: M4.tex('1.5 \\cdot 2') }, row);
    M4.el('span', { 'class': 'm4-chip', html: M4.tex('(-0.5) \\cdot 3') }, row);
    M4.el('span', { 'class': 'm4-chip', html: M4.tex('2.5 \\cdot 1') }, row);
    var box = M4.el('div', { 'class': 'l1-s3-center' }, el);
    M4.numberInput(box, {
      answer: 4, tolerance: 0.01, placeholder: 'prediction', label: 'f_w(x) =',
      onCorrect: function () {
        ctx.note('\\(3 - 1.5 + 2.5 = 4\\): the model predicts an increase of 4, as in the example from the lecture.');
        ctx.solved();
      },
      onWrong: function (v) {
        var x = +v;
        if (Math.abs(x - 7) < 0.01) ctx.wrong('The second weight is negative, so its term \\(-1.5\\) is subtracted.');
        else if (Math.abs(x - 6) < 0.01) ctx.wrong('That is the sum of the features. Each feature must first be multiplied by its weight.');
        else if (Math.abs(x - 3.5) < 0.01) ctx.wrong('That is the sum of the weights. Each weight must be multiplied by its feature.');
        else ctx.wrong('The three products are \\(3\\), \\(-1.5\\) and \\(2.5\\). Their sum is the prediction.');
      }
    });
  }

  /* ---------- step 10: tune three weights to fit three examples ---------- */

  function mountTune(el, ctx) {
    injectStyle();
    var ex = [
      { x: [2, 1, 1], y: 4 },
      { x: [1, 2, 0], y: 2.5 },
      { x: [0, 2, 1], y: 1.5 }
    ];
    var w = [0, 0, 0], done = false;
    var card = M4.el('div', { 'class': 'l1-s3-card' }, el);
    var svg = makeSvg(card, 720, 290);
    var AX0 = 220, AX1 = 690, LO = -1, HI = 7;
    function X(v) { return AX0 + (clamp(v, LO, HI) - LO) / (HI - LO) * (AX1 - AX0); }
    S('text', { x: 20, y: 24, 'font-size': 16, 'font-weight': 700, fill: C.muted }, svg, 'features x');
    S('text', { x: (AX0 + AX1) / 2, y: 24, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: C.muted }, svg, 'prediction (blue) and true value (green ring)');
    for (var v = LO; v <= HI; v++) {
      S('line', { x1: X(v), y1: 44, x2: X(v), y2: 248, stroke: C.line, 'stroke-width': 1 }, svg);
      S('text', { x: X(v), y: 272, 'text-anchor': 'middle', 'font-size': 15, fill: C.muted }, svg, String(v));
    }
    var rows = ex.map(function (e, i) {
      var y = 86 + i * 70;
      S('text', { x: 20, y: y + 6, 'font-size': 18, 'font-weight': 600, fill: C.ink }, svg, '(' + e.x.join(', ') + ')');
      S('line', { x1: AX0, y1: y, x2: AX1, y2: y, stroke: C.muted, 'stroke-width': 2, 'stroke-opacity': 0.5 }, svg);
      var ring = S('circle', { cx: X(e.y), cy: y, r: 15, fill: C.green, 'fill-opacity': 0.08, stroke: C.green, 'stroke-width': 3, 'stroke-dasharray': '5 4' }, svg);
      var stem = S('line', { y1: y, y2: y, stroke: C.red, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-opacity': 0.55 }, svg);
      var dot = S('circle', { cy: y, r: 9, fill: C.blue, stroke: '#fff', 'stroke-width': 2 }, svg);
      var txt = S('text', { y: y - 24, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: C.blue }, svg, '');
      return { ring: ring, stem: stem, dot: dot, txt: txt, y: y };
    });

    var bar = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin:6px 0 10px' }, el);
    var rOk = readout(bar, ''), rErr = readout(bar, '');

    function predict(e) { return w[0] * e.x[0] + w[1] * e.x[1] + w[2] * e.x[2]; }
    function draw() {
      var ok = 0, tot = 0;
      ex.forEach(function (e, i) {
        var p = predict(e), hit = Math.abs(p - e.y) < 1e-6, r = rows[i];
        tot += Math.abs(p - e.y);
        r.dot.setAttribute('cx', X(p));
        r.stem.setAttribute('x1', X(p)); r.stem.setAttribute('x2', X(e.y));
        r.txt.setAttribute('x', clamp(X(p), AX0 + 14, AX1 - 14));
        r.txt.textContent = (p < LO ? '< ' : p > HI ? '> ' : '') + p.toFixed(1);
        r.txt.setAttribute('fill', hit ? C.green : C.blue);
        r.dot.setAttribute('fill', hit ? C.green : C.blue);
        r.ring.setAttribute('fill-opacity', hit ? 0.3 : 0.08);
        if (hit) { r.ring.removeAttribute('stroke-dasharray'); ok++; } else { r.ring.setAttribute('stroke-dasharray', '5 4'); }
      });
      rOk.textContent = 'examples matched: ' + ok + ' of 3';
      rErr.textContent = 'mean error: ' + (tot / 3).toFixed(2);
      rOk.classList.toggle('l1-s3-ok', ok === 3);
      if (ok === 3) {
        if (!done) {
          done = true;
          ctx.note('With \\(w = (1.5,\\ 0.5,\\ 0.5)\\) all three predictions equal the true values: \\(4\\), \\(2.5\\) and \\(1.5\\).');
          ctx.solved();
        }
      } else if (!done) {
        if (ok === 0) ctx.note('No prediction matches yet. The red segments show the error of each example.');
        else ctx.note(ok + ' of 3 predictions match. A weight that fixes one example can move the others, because the examples share weights.');
      }
    }
    var sub = ['₁', '₂', '₃'];
    var names = ['price yesterday', 'oil price', 'tweet'];
    [0, 1, 2].forEach(function (k) {
      var box = M4.el('div', { style: 'margin:6px 0' }, el);
      M4.slider(box, {
        min: -1, max: 3, step: 0.5, value: 0, label: 'w' + sub[k] + ' (' + names[k] + ')',
        format: function (v) { return (+v).toFixed(1); },
        onInput: function (v) { w[k] = +v; draw(); }
      });
    });
    draw();
  }

  /* ---------- lesson ---------- */

  M4.lesson({
    id: 'l1-s3',
    module: 'l1',
    title: 'Types of learning and data splits',
    summary: 'Supervised, unsupervised and reinforcement learning, how a supervised model is trained and used, the train, validation and test split, and regression as prediction of a number.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>Machine learning is commonly divided into three types of learning: supervised, unsupervised and reinforcement learning. A supervised model goes through two phases, training and inference.</p>' +
          '<p>A data set is split into training, validation and test parts. In regression, in which a model \\(f_w\\) maps a vector of features to a number.</p>'
      },
      {
        kind: 'text',
        title: 'Three types of learning',
        html: '<p>In <b>supervised learning</b> every example comes with a gold label assigned by people, and the model learns to imitate that judgement. Predicting a discrete category, such as cat or dog, is called <b>classification</b>. Predicting a continuous quantity, such as a stock price or the age of a person on a photo, is called <b>regression</b>.</p>' +
          '<p>In <b>unsupervised learning</b> there are no labels, and the model finds general patterns in the data. In <b>reinforcement learning</b> a model interacts with an environment, receives reward, and learns from the interaction which behaviours are good. AlphaGo is a well-known example.</p>'
      },
      {
        kind: 'exercise',
        title: 'Types of learning in examples',
        html: '<p>Drag each task into the type of learning that it belongs to. The deciding question is what the model receives: labelled examples, unlabelled data, or reward from an environment.</p>',
        hint: 'A task is supervised if every example has a known answer supplied in advance. It is reinforcement learning if the model acts and receives reward. Otherwise only raw data is available.',
        mount: mountSort
      },
      {
        kind: 'exercise',
        title: 'Clustering without labels',
        html: '<p>Clustering is a classic unsupervised method: data points are partitioned into groups of points that lie close together. Below, each point is assigned to the nearer of two centres, and the value below shows the mean squared distance between a point and its centre.</p>' +
          '<p>Drag the two centres until the mean squared distance is at or below the target.</p>',
        hint: 'The distance is smallest when each centre sits in the middle of one visible group of points.',
        mount: mountCluster
      },
      {
        kind: 'explore',
        title: 'Training a model',
        html: '<p>A model is a fixed piece of machinery with a set of numbers that may be changed, the <b>parameters</b>. Here there are two, \\(w_1\\) and \\(w_2\\), drawn as gears. In each training step an example enters, the model outputs a prediction, and a comparison with the true label gives an <b>error</b>. The parameters are then adjusted so that the error decreases.</p>' +
          '<p>Feed examples one at a time, then run the loop. The examples come and go, the model stays, and the mean error falls. This iterative adjustment is called <b>optimization</b>. How the error determines the direction of each adjustment is the subject of a later lecture.</p>',
        mount: mountTrain
      },
      {
        kind: 'exercise',
        title: 'Inference',
        html: '<p>After training, the true label and the error are discarded and the parameters are fixed. Using the model in this state on an input it has never seen is called <b>inference</b>.</p>' +
          '<p>A trained cat and dog classifier receives a new photo at inference. Which statement is correct?</p>',
        hint: 'Compare with the training picture: which of its parts required a true label?',
        mount: mountInference
      },
      {
        kind: 'exercise',
        title: 'Train, validation and test data',
        html: '<p>A model is not trained on all available data. The <b>training set</b> is the only data the model learns from. The <b>validation set</b> is used to make decisions, such as how large the model should be or how long to train. The <b>test set</b> is locked away until the very end.</p>' +
          '<p>Drag the two dividers so that a data set of 5000 examples is split as in the lecture: 80% training, 10% validation, 10% test.</p>',
        hint: 'The left divider belongs at 80% and the right divider at 90%; faint dashed lines mark both positions.',
        mount: mountSplit
      },
      {
        kind: 'explore',
        title: 'Separate validation and test sets',
        html: '<p>As soon as a data set is used to make a choice, the choice is fitted to that data. Below, every candidate model has the same true accuracy of 70%, so their validation scores differ only by chance. The model with the best validation score is selected and then evaluated once on the test set.</p>' +
          '<p>Increase the number of candidates. The best validation score rises well above 70%, while the test accuracy of the selected model stays near 70% on average. The validation score of a selected model is optimistic. The test score is not.</p>',
        mount: mountOptimism
      },
      {
        kind: 'exercise',
        title: 'Regression',
        html: '<p>In regression the label is a number. The input is a vector of chosen features, here \\(x = (x_1, x_2, x_3)\\): the stock price yesterday, the oil price, and \\(1\\) or \\(0\\) depending on whether a famous person recently tweeted about the company. The model is written \\(f_w(x)\\), where \\(w\\) denotes its adjustable numbers, the <b>weights</b>.</p>' +
          '<p>Take the model \\(f_w(x) = w_1 x_1 + w_2 x_2 + w_3 x_3\\) with \\(w = (1.5,\\ -0.5,\\ 2.5)\\) and features, in rescaled units, \\(x = (2,\\ 3,\\ 1)\\). Compute the prediction.</p>',
        hint: 'Multiply each weight by the feature in the same position, then add the three products.',
        mount: mountPredict
      },
      {
        kind: 'exercise',
        title: 'Manual weight tuning',
        html: '<p>Three examples are given, each with a feature vector \\(x\\) and a true value \\(y\\). The model is again \\(f_w(x) = w_1 x_1 + w_2 x_2 + w_3 x_3\\), and the same weights \\(w\\) are used for every example.</p>' +
          '<p>Adjust the three weights until every prediction coincides with its true value. Training performs this adjustment automatically, and for models with billions of weights.</p>',
        hint: 'The second example has \\(x_3 = 0\\), so it depends only on \\(w_1\\) and \\(w_2\\): it requires \\(w_1 + 2 w_2 = 2.5\\). The third example has \\(x_1 = 0\\) and requires \\(2 w_2 + w_3 = 1.5\\). Trying \\(w_2 = 0.5\\) fixes the other two weights.',
        mount: mountTune
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>Supervised learning uses labelled examples (classification for categories, regression for numbers), unsupervised learning finds patterns without labels, and reinforcement learning learns from reward obtained by interaction.</li>' +
          '<li>Training repeats one loop: predict, measure the error against the true label, adjust the parameters. At inference the parameters are fixed and the prediction is not checked.</li>' +
          '<li>Data are split into roughly 80% training, 10% validation and 10% test: the model learns from the first, decisions are made on the second, and the third is used once for an honest final score. A regression model \\(f_w(x)\\) maps a feature vector \\(x\\) to a number using weights \\(w\\).</li>' +
          '</ul>'
      }
    ]
  });
})();
