(function () {
  'use strict';
  var M4 = window.M4;
  var C = M4.colors || {};
  var BLUE = C.blue || '#2f6bff', ORANGE = C.orange || '#ff8a1f', GREEN = C.green || '#16b56b',
    PINK = C.pink || '#ef4b8b', PURPLE = C.purple || '#7a5cff', INK = C.ink || '#1d1d1f',
    MUTED = C.muted || '#6b6f76', LINE = C.line || '#e6e4dd', RED = C.red || '#f0473e';

  function injectCss() {
    if (document.getElementById('l1-s2-style')) return;
    var s = document.createElement('style');
    s.id = 'l1-s2-style';
    s.textContent = [
      '.l1-s2-tray{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:14px 0;min-height:52px}',
      '.l1-s2-tok{touch-action:none;user-select:none;-webkit-user-select:none;font-size:16px;font-weight:600;padding:10px 14px;position:relative;z-index:1}',
      '.l1-s2-tok.l1-s2-dragging{z-index:50;box-shadow:0 10px 24px rgba(0,0,0,.16);cursor:grabbing}',
      '.l1-s2-tok.l1-s2-back{transition:transform .25s ease}',
      '.l1-s2-tok.l1-s2-done{border-color:' + GREEN + ';background:#eefaf3;cursor:default;pointer-events:none}',
      '.l1-s2-bins{display:grid;gap:14px;margin:10px 0}',
      '.l1-s2-bin{border:2px dashed ' + LINE + ';border-radius:16px;background:#fff;padding:12px;min-height:150px;display:flex;flex-direction:column;gap:8px;align-items:center;transition:border-color .15s,background .15s}',
      '.l1-s2-bin.l1-s2-hot{border-color:' + BLUE + ';background:#f1f5ff}',
      '.l1-s2-bin.l1-s2-full{border-style:solid;border-color:' + GREEN + '}',
      '.l1-s2-bin h4{margin:0;font-size:17px;font-weight:700;color:' + INK + ';text-align:center}',
      '.l1-s2-bin small{font-size:15px;color:' + MUTED + ';text-align:center}',
      '.l1-s2-binbody{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}',
      '.l1-s2-hw{display:grid;grid-template-columns:1fr;gap:6px;margin:8px 0}',
      '.l1-s2-bar{position:relative;height:30px;border-radius:15px;background:#efede6;overflow:visible;margin:44px 0 10px}',
      '.l1-s2-barfill{position:absolute;left:0;top:0;bottom:0;border-radius:15px;background:' + BLUE + ';transition:width .12s,background .2s}',
      '.l1-s2-barmark{position:absolute;left:50%;top:-8px;bottom:-8px;width:3px;background:' + INK + ';border-radius:2px}',
      '.l1-s2-barlabel{position:absolute;left:50%;top:-30px;transform:translateX(-50%);font-size:15px;font-weight:600;color:' + INK + ';white-space:nowrap}',
      '.l1-s2-low{background:#fff3e6;border-color:' + ORANGE + ';color:#a85400}',
      '.l1-s2-num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:' + BLUE + ';color:#fff;font-size:15px;font-weight:700;margin-right:8px}',
      '.l1-s2-svg{width:100%;height:auto;display:block}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function fmt(v) {
    var r = Math.round(v * 100) / 100;
    if (Object.is(r, -0)) r = 0;
    return String(r);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Drag an HTML token; on release call onDropAt(clientX, clientY) with the token centre.
  // If it returns false the token glides back.
  function makeDraggable(tok, onDropAt, onHover) {
    var lastX = 0, lastY = 0;
    M4.drag(tok, {
      onStart: function () {
        if (tok.classList.contains('l1-s2-done')) return;
        tok.classList.remove('l1-s2-back');
        tok.classList.add('l1-s2-dragging');
        lastX = 0; lastY = 0;
      },
      onMove: function (dx, dy) {
        if (tok.classList.contains('l1-s2-done')) return;
        lastX = dx; lastY = dy;
        tok.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        if (onHover) {
          var r = tok.getBoundingClientRect();
          onHover(r.left + r.width / 2, r.top + r.height / 2);
        }
      },
      onEnd: function () {
        if (tok.classList.contains('l1-s2-done')) return;
        tok.classList.remove('l1-s2-dragging');
        var r = tok.getBoundingClientRect();
        var ok = onDropAt(r.left + r.width / 2, r.top + r.height / 2);
        if (onHover) onHover(-1e9, -1e9);
        if (ok) {
          tok.style.transform = '';
        } else {
          tok.classList.add('l1-s2-back');
          tok.style.transform = 'translate(0px,0px)';
        }
      }
    });
  }

  // Generic sorting game: tokens -> bins.
  function sortGame(el, ctx, cfg) {
    injectCss();
    var tray = M4.el('div', { class: 'l1-s2-tray' }, el);
    var binsEl = M4.el('div', { class: 'l1-s2-bins', style: 'grid-template-columns:repeat(' + cfg.bins.length + ',1fr)' }, el);
    var bins = cfg.bins.map(function (b) {
      var d = M4.el('div', { class: 'l1-s2-bin' }, binsEl);
      M4.el('h4', { text: b.title }, d);
      if (b.sub) M4.el('small', { text: b.sub }, d);
      var body = M4.el('div', { class: 'l1-s2-binbody' }, d);
      return { el: d, body: body, count: 0, need: 0 };
    });
    cfg.tokens.forEach(function (t) { bins[t.bin].need++; });
    var left = cfg.tokens.length;
    function binAt(cx, cy) {
      for (var i = 0; i < bins.length; i++) {
        var r = bins[i].el.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return i;
      }
      return -1;
    }
    cfg.tokens.forEach(function (t) {
      var tok = M4.el('div', { class: 'm4-token l1-s2-tok', text: t.label }, tray);
      makeDraggable(tok, function (cx, cy) {
        var i = binAt(cx, cy);
        if (i < 0) return false;
        if (i !== t.bin) {
          ctx.wrong(cfg.wrong(t, i));
          return false;
        }
        tok.classList.add('l1-s2-done');
        tok.classList.remove('l1-s2-dragging');
        bins[i].body.appendChild(tok);
        bins[i].count++;
        if (bins[i].count === bins[i].need) bins[i].el.classList.add('l1-s2-full');
        left--;
        if (left === 0) {
          ctx.note(cfg.done);
          ctx.solved();
        } else {
          ctx.note(t.ok || 'Correct. ' + left + ' remaining.');
        }
        return true;
      }, function (cx, cy) {
        var i = binAt(cx, cy);
        bins.forEach(function (b, k) { b.el.classList.toggle('l1-s2-hot', k === i); });
      });
    });
  }

  // ---------- Linear algebra widget: A = [[2,1],[1,2]] ----------
  function eigenWidget(el, ctx, exercise) {
    injectCss();
    var p = M4.plane(el, { xmin: -5, xmax: 5, ymin: -5, ymax: 5, width: 520, height: 520 });
    var row = M4.el('div', { class: 'm4-row' }, el);
    var rX = M4.el('span', { class: 'm4-readout' }, row);
    var rAx = M4.el('span', { class: 'm4-readout' }, row);
    var rN = M4.el('span', { class: 'm4-readout' }, row);
    var ghost = null;
    if (exercise) {
      ghost = p.line(-4.6, -4.6, 4.6, 4.6, { stroke: GREEN, width: 2, dash: '6 8' });
      ghost.el.setAttribute('opacity', '0');
    }
    var aAx = p.arrow(0, 0, 2, 1, { stroke: ORANGE, width: 5 });
    var aX = p.arrow(0, 0, 1, 0, { stroke: BLUE, width: 5 });
    var tAx = p.text(0, 0, 'Ax', { fill: ORANGE, size: 18, weight: 700 });
    var tX = p.text(0, 0, 'x', { fill: BLUE, size: 18, weight: 700 });
    var done = false;
    function draw(x, y) {
      var ax = 2 * x + y, ay = x + 2 * y;
      aX.set(0, 0, x, y); aAx.set(0, 0, ax, ay);
      var n = Math.sqrt(x * x + y * y), na = Math.sqrt(ax * ax + ay * ay);
      // labels: x label perpendicular-offset from the midpoint of x; Ax label beyond the tip
      if (n > 0) {
        tX.set(x / 2 - 0.45 * y / n, y / 2 + 0.45 * x / n - 0.1, 'x');
        tAx.set(clamp(ax + 0.5 * ax / na, -4.6, 4.6), clamp(ay + 0.5 * ay / na - 0.1, -4.7, 4.6), 'Ax');
      } else { tX.set(0.4, 0.4, 'x'); tAx.set(-0.5, -0.5, 'Ax'); }
      rX.textContent = 'x = (' + fmt(x) + ', ' + fmt(y) + ')';
      rAx.textContent = 'Ax = (' + fmt(ax) + ', ' + fmt(ay) + ')';
      rN.textContent = '‖x‖ = ' + n.toFixed(2) + '   ‖Ax‖ = ' + na.toFixed(2);
      if (!exercise) {
        if (n === 0) ctx.note('The zero vector is mapped to the zero vector by every matrix.');
        else if (x === y) ctx.note('Here \\(A\\mathbf{x} = 3\\,\\mathbf{x}\\): the output is parallel to the input.');
        else if (x === -y) ctx.note('Here \\(A\\mathbf{x} = 1\\,\\mathbf{x}\\): the output equals the input.');
        else ctx.note('\\(A\\mathbf{x}\\) points in a different direction from \\(\\mathbf{x}\\).');
      }
    }
    function check(x, y) {
      if (!exercise || done) return;
      if (x === 0 && y === 0) { ctx.note('The zero vector does not count as an eigenvector. Choose a non-zero \\(\\mathbf{x}\\).'); return; }
      if (x === y) {
        done = true;
        ghost.el.setAttribute('opacity', '0.9');
        ctx.note('\\(A\\mathbf{x} = (' + fmt(3 * x) + ', ' + fmt(3 * y) + ') = 3\\,\\mathbf{x}\\). Every non-zero vector on the dashed line is an eigenvector with eigenvalue 3.');
        ctx.solved();
      } else if (x === -y) {
        ctx.note('Here \\(A\\mathbf{x} = \\mathbf{x}\\), so this is an eigenvector with eigenvalue 1. The task asks for eigenvalue 3.');
      } else {
        ctx.note('\\(A\\mathbf{x}\\) is not parallel to \\(\\mathbf{x}\\) here, so this \\(\\mathbf{x}\\) is not an eigenvector.');
      }
    }
    var B = 1.5;
    // snap to exact halves locally so the equality tests in draw/check are reliable
    function half(v) { var r = Math.round(clamp(v, -B, B) * 2) / 2; return r === 0 ? 0 : r; }
    var h = p.handle(1, 0, {
      color: BLUE, snap: 0.5, bounds: { xmin: -B, xmax: B, ymin: -B, ymax: B },
      onDrag: function (x, y) {
        var cx = half(x), cy = half(y);
        if (h && (cx !== x || cy !== y)) h.set(cx, cy);
        draw(cx, cy);
      },
      onEnd: function (x, y) {
        var cx = half(x), cy = half(y);
        if (cx !== x || cy !== y) h.set(cx, cy);
        draw(cx, cy); check(cx, cy);
      }
    });
    draw(1, 0);
    if (exercise) ctx.note('Drag the blue tip. The handle snaps to steps of 0.5.');
  }

  // ---------- Statistics widget ----------
  function statsWidget(el, ctx) {
    injectCss();
    var p = M4.plane(el, { xmin: -0.7, xmax: 10.7, ymin: -1.6, ymax: 2.6, width: 720, height: 265, grid: false, axes: false, labels: false });
    var row = M4.el('div', { class: 'm4-row' }, el);
    var rM = M4.el('span', { class: 'm4-readout' }, row);
    var rV = M4.el('span', { class: 'm4-readout' }, row);
    var band = p.path([[0, 0], [0, 0], [0, 0], [0, 0]], { stroke: 'none', width: 0, fill: ORANGE, closed: true });
    band.el.setAttribute('opacity', '0.16');
    p.line(0, 0, 10, 0, { stroke: INK, width: 3 });
    for (var k = 0; k <= 10; k++) {
      p.line(k, -0.12, k, 0.12, { stroke: INK, width: 2 });
      p.text(k, -0.62, String(k), { fill: MUTED, size: 16 });
    }
    var ghost = p.line(5, -0.3, 5, 2.3, { stroke: GREEN, width: 2, dash: '5 7' });
    p.text(5, -1.25, 'target mean 5', { fill: GREEN, size: 15, weight: 600 });
    var meanLine = p.line(4, -0.3, 4, 2.0, { stroke: ORANGE, width: 4 });
    var meanTxt = p.text(4, 2.2, 'μ', { fill: ORANGE, size: 18, weight: 700 });
    var xs = [1, 2, 3, 10];
    var hs = [];
    var done = false;
    function levels() {
      var seen = {};
      return xs.map(function (x) { var c = seen[x] || 0; seen[x] = c + 1; return 0.42 + 0.5 * c; });
    }
    function stats() {
      var m = (xs[0] + xs[1] + xs[2] + xs[3]) / 4, v = 0;
      xs.forEach(function (x) { v += (x - m) * (x - m); });
      return { m: m, v: v / 4 };
    }
    function draw(active) {
      var s = stats(), sd = Math.sqrt(s.v), lv = levels();
      hs.forEach(function (h, i) { if (h && i !== active) h.set(xs[i], lv[i]); });
      meanLine.set(s.m, -0.3, s.m, 2.0);
      meanTxt.set(s.m, 2.2, 'μ');
      band.set([[s.m - sd, -0.3], [s.m + sd, -0.3], [s.m + sd, 2.0], [s.m - sd, 2.0]]);
      rM.textContent = 'mean μ = ' + fmt(s.m);
      rV.textContent = 'variance σ² = ' + fmt(s.v);
      return s;
    }
    function check() {
      var s = draw(-1);
      if (done) return;
      if (s.m === 5 && s.v === 2.5) {
        done = true;
        ghost.el.setAttribute('stroke-dasharray', 'none');
        ctx.note('Mean 5 and variance 2.5: the squared deviations sum to \\(4 \\cdot 2.5 = 10\\).');
        ctx.solved();
      } else if (s.m !== 5) {
        ctx.note('The mean is ' + fmt(s.m) + '. The four values must sum to \\(4 \\cdot 5 = 20\\). The current sum is ' + fmt(4 * s.m) + '.');
      } else if (s.v > 2.5) {
        ctx.note('The mean is 5, but the variance ' + fmt(s.v) + ' is too large. Move points closer to the mean while keeping the sum at 20.');
      } else {
        ctx.note('The mean is 5, but the variance ' + fmt(s.v) + ' is too small. Spread the points further from the mean while keeping the sum at 20.');
      }
    }
    xs.forEach(function (x0, i) {
      hs[i] = p.handle(x0, 0.42, {
        color: BLUE, r: 13, snap: 1, bounds: { xmin: 0, xmax: 10, ymin: 0.42, ymax: 1.92 },
        onDrag: function (x) {
          xs[i] = clamp(Math.round(x), 0, 10);
          draw(i);
          if (hs[i]) hs[i].set(xs[i], levels()[i]);
        },
        onEnd: function (x) {
          xs[i] = clamp(Math.round(x), 0, 10);
          check();
        }
      });
    });
    draw(-1);
    ctx.note('The orange line marks the mean. The shaded band extends one standard deviation \\(\\sigma\\) to each side.');
  }

  // ---------- Homework admission widget ----------
  function admissionWidget(el, ctx) {
    injectCss();
    var maxes = [20, 15, 10, 15], total = 60, pts = [0, 0, 0, 0];
    var chips = [];
    var wrap = M4.el('div', { class: 'l1-s2-hw' }, el);
    var done = false;
    var bar, fill, rT, rA;
    function update() {
      var sum = pts[0] + pts[1] + pts[2] + pts[3];
      fill.style.width = (100 * sum / total) + '%';
      fill.style.background = sum >= total / 2 ? GREEN : BLUE;
      rT.textContent = 'total = ' + sum + ' / ' + total + ' (' + Math.round(100 * sum / total) + '%)';
      rA.textContent = sum >= total / 2 ? 'admitted to the exam' : 'not admitted';
      pts.forEach(function (v, i) {
        var low = v < maxes[i] / 2;
        chips[i].textContent = 'HW ' + (i + 1) + ': ' + Math.round(100 * v / maxes[i]) + '%';
        chips[i].classList.toggle('l1-s2-low', low);
      });
    }
    maxes.forEach(function (m, i) {
      M4.slider(wrap, {
        min: 0, max: m, step: 1, value: 0, label: 'Homework ' + (i + 1) + ' (max ' + m + ')',
        format: function (v) { return v + ' / ' + m; },
        onInput: function (v) { pts[i] = Math.round(Number(v)); update(); }
      });
    });
    var crow = M4.el('div', { class: 'm4-row' }, el);
    maxes.forEach(function () { chips.push(M4.el('span', { class: 'm4-chip' }, crow)); });
    bar = M4.el('div', { class: 'l1-s2-bar' }, el);
    fill = M4.el('div', { class: 'l1-s2-barfill' }, bar);
    M4.el('div', { class: 'l1-s2-barmark' }, bar);
    M4.el('div', { class: 'l1-s2-barlabel', text: '50% = 30 points' }, bar);
    var row = M4.el('div', { class: 'm4-row' }, el);
    rT = M4.el('span', { class: 'm4-readout' }, row);
    rA = M4.el('span', { class: 'm4-readout' }, row);
    var brow = M4.el('div', { class: 'm4-row', style: 'margin-top:12px' }, el);
    M4.button(brow, 'Check', function () {
      if (done) return;
      var sum = pts[0] + pts[1] + pts[2] + pts[3];
      var lows = pts.filter(function (v, i) { return v < maxes[i] / 2; }).length;
      if (sum < 30) {
        ctx.wrong('The total is ' + sum + ' of 60 points, below the required 30. This student is not admitted.');
      } else if (lows === 0) {
        ctx.wrong('This student is admitted, but every homework is at or above half of its own points. Lower one homework below 50% and compensate elsewhere.');
      } else {
        done = true;
        bar.classList.add('m4-pop');
        ctx.note('Admitted with ' + sum + ' of 60 points although ' + lows + ' homework' + (lows > 1 ? 's are' : ' is') + ' below half of its own maximum. Only the overall total counts.');
        ctx.solved();
      }
    }, { primary: true });
    update();
  }

  // ---------- Spam explore ----------
  var SPAM = [[8, 2], [2, 8], [6, 5], [5, 6], [9, 4], [4, 9], [7, 7]];
  var HAM = [[1, 1], [3, 2], [2, 4], [6, 1], [1, 6], [4, 4], [7, 1], [1, 7]];
  function spamWidget(el, ctx) {
    injectCss();
    var p = M4.plane(el, { xmin: -1, xmax: 11, ymin: -1, ymax: 11, width: 520, height: 520 });
    var region = p.path([[0, 0]], { stroke: 'none', width: 0, fill: PINK, closed: true });
    region.el.setAttribute('opacity', '0.12');
    var vLine = p.line(0, 0, 0, 0, { stroke: PURPLE, width: 3, dash: '8 6' });
    var hLine = p.line(0, 0, 0, 0, { stroke: PURPLE, width: 3, dash: '8 6' });
    var lLine = p.line(0, 0, 0, 0, { stroke: GREEN, width: 4 });
    p.text(10.6, 0.45, 'c', { fill: INK, size: 18, weight: 700 });
    p.text(0.45, 10.6, 'ℓ', { fill: INK, size: 18, weight: 700 });
    var pts = [];
    SPAM.forEach(function (q) { pts.push({ x: q[0], y: q[1], spam: true }); });
    HAM.forEach(function (q) { pts.push({ x: q[0], y: q[1], spam: false }); });
    pts.forEach(function (q) {
      q.ring = p.point(q.x, q.y, { r: 15, fill: 'none' });
      q.ring.el.setAttribute('stroke', INK); q.ring.el.setAttribute('stroke-width', '3'); q.ring.el.setAttribute('fill', 'none');
      q.dot = p.point(q.x, q.y, { r: 9, fill: q.spam ? PINK : BLUE });
    });
    var leg = M4.el('div', { class: 'm4-row' }, el);
    M4.el('span', { class: 'm4-chip', style: 'color:' + PINK, text: '● spam' }, leg);
    M4.el('span', { class: 'm4-chip', style: 'color:' + BLUE, text: '● not spam' }, leg);
    M4.el('span', { class: 'm4-chip', text: '◯ misclassified' }, leg);
    var rAcc = M4.el('span', { class: 'm4-readout' }, leg);
    var a = 5, b = 5, learned = false;
    function update() {
      var correct = 0;
      pts.forEach(function (q) {
        var pred = learned ? (q.x + q.y > 9) : (q.x > a || q.y > b);
        var ok = pred === q.spam;
        if (ok) correct++;
        q.ring.el.setAttribute('opacity', ok ? '0' : '1');
      });
      if (learned) {
        region.set([[-1, 10], [10, -1], [11, -1], [11, 11], [-1, 11]]);
        lLine.set(-1, 10, 10, -1);
        lLine.el.setAttribute('opacity', '1'); vLine.el.setAttribute('opacity', '0'); hLine.el.setAttribute('opacity', '0');
      } else {
        region.set([[-1, b], [a, b], [a, -1], [11, -1], [11, 11], [-1, 11]]);
        vLine.set(a, -1, a, b); hLine.set(-1, b, a, b);
        lLine.el.setAttribute('opacity', '0'); vLine.el.setAttribute('opacity', '1'); hLine.el.setAttribute('opacity', '1');
      }
      rAcc.textContent = 'correct: ' + correct + ' / ' + pts.length;
      if (learned) ctx.note('Learned function: spam if \\(c + \\ell > 9\\). The boundary was fitted to the data and classifies all 15 emails correctly.');
      else ctx.note('Hand-written rule: spam if \\(c > ' + fmt(a) + '\\) or \\(\\ell > ' + fmt(b) + '\\). The shaded region is predicted as spam.');
    }
    var ctl = M4.el('div', {}, el);
    M4.slider(ctl, { min: 0, max: 10, step: 0.5, value: a, label: 'threshold a (capitalised words)', format: fmt, onInput: function (v) { a = Number(v); update(); } });
    M4.slider(ctl, { min: 0, max: 10, step: 0.5, value: b, label: 'threshold b (links)', format: fmt, onInput: function (v) { b = Number(v); update(); } });
    var brow = M4.el('div', { class: 'm4-row', style: 'margin-top:10px' }, el);
    var btn = M4.button(brow, 'Show learned function', function () {
      learned = !learned;
      btn.textContent = learned ? 'Show hand-written rule' : 'Show learned function';
      update();
    }, { primary: true });
    update();
  }

  // ---------- Venn exercise ----------
  function vennWidget(el, ctx) {
    injectCss();
    var W = 720, H = 500;
    var ML = { x: 270, y: 260, r: 200 }, DL = { x: 330, y: 280, r: 110 }, NLP = { x: 500, y: 260, r: 170 };
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'l1-s2-svg' }, el);
    function circ(c, col, op) {
      return M4.svg('circle', { cx: c.x, cy: c.y, r: c.r, fill: col, 'fill-opacity': op, stroke: col, 'stroke-width': 3 }, svg);
    }
    circ(ML, BLUE, 0.10); circ(NLP, ORANGE, 0.12); circ(DL, PURPLE, 0.16);
    function label(x, y, s, col, anchor) {
      var t = M4.svg('text', { x: x, y: y, fill: col, 'font-size': 19, 'font-weight': 700, 'text-anchor': anchor || 'middle' }, svg);
      t.textContent = s; return t;
    }
    label(120, 50, 'Machine learning', BLUE);
    label(625, 70, 'NLP', ORANGE);
    label(290, 205, 'Deep learning', PURPLE);
    var dots = M4.svg('g', {}, svg);
    function inC(c, x, y) { return (x - c.x) * (x - c.x) + (y - c.y) * (y - c.y) <= c.r * c.r; }
    function region(x, y) {
      var m = inC(ML, x, y), d = inC(DL, x, y), n = inC(NLP, x, y);
      if (!m && !n) return 'out';
      if (d) return n ? 'dl-nlp' : 'dl';
      if (m) return n ? 'ml-nlp' : 'ml';
      return 'nlp';
    }
    var NAMES = {
      'ml': 'machine learning only (outside deep learning and NLP)',
      'dl': 'deep learning outside NLP',
      'dl-nlp': 'the overlap of deep learning and NLP',
      'ml-nlp': 'the overlap of machine learning and NLP outside deep learning',
      'nlp': 'NLP outside machine learning'
    };
    var items = [
      { label: 'Linear regression on house prices', r: 'ml', why: 'Linear regression learns from data but is not a neural network, and house prices are not language.' },
      { label: 'Neural network that labels images', r: 'dl', why: 'A neural network is deep learning, hence machine learning. Images are not language.' },
      { label: 'Transformer language model', r: 'dl-nlp', why: 'A transformer is a neural network, and it models human language.' },
      { label: 'Naive Bayes spam filter on email text', r: 'ml-nlp', why: 'Naive Bayes learns from text data, so it is machine learning applied to language, but it is not a neural network.' },
      { label: 'Hand-written grammar rules', r: 'nlp', why: 'Rules written by people process language without learning anything from data.' }
    ];
    var tray = M4.el('div', { class: 'l1-s2-tray' }, el);
    var left = items.length;
    items.forEach(function (it, i) {
      var tok = M4.el('div', { class: 'm4-token l1-s2-tok' }, tray);
      M4.el('span', { class: 'l1-s2-num', text: String(i + 1) }, tok);
      M4.el('span', { text: it.label }, tok);
      makeDraggable(tok, function (cx, cy) {
        var r = svg.getBoundingClientRect();
        if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false;
        var x = (cx - r.left) / r.width * W, y = (cy - r.top) / r.height * H;
        var reg = region(x, y);
        if (reg === 'out') { ctx.wrong('That point lies outside all three fields. ' + it.why); return false; }
        if (reg !== it.r) { ctx.wrong('That region is ' + NAMES[reg] + '. ' + it.why); return false; }
        var g = M4.svg('g', { class: 'm4-pop' }, dots);
        M4.svg('circle', { cx: x, cy: y, r: 16, fill: GREEN, stroke: '#fff', 'stroke-width': 3 }, g);
        var t = M4.svg('text', { x: x, y: y + 6, fill: '#fff', 'font-size': 16, 'font-weight': 700, 'text-anchor': 'middle' }, g);
        t.textContent = String(i + 1);
        tok.classList.add('l1-s2-done');
        left--;
        if (left === 0) {
          ctx.note('All five items are placed. Deep learning lies entirely inside machine learning, and NLP overlaps both without containing or being contained in either.');
          ctx.solved();
        } else {
          ctx.note('Correct: ' + it.why + ' ' + left + ' remaining.');
        }
        return true;
      });
    });
    ctx.note('Drop the centre of each tile on the region where the item belongs.');
  }

  M4.lesson({
    id: 'l1-s2',
    module: 'l1',
    title: 'What machine learning is',
    summary: 'How the course is organised, which mathematics it assumes, and how machine learning, deep learning and NLP relate.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Learning goals',
        html: '<p>The course has a fixed organisation and starts from a few definitions.</p><p>In this lesson you will state how the course is split and how a week is structured, check the three mathematical prerequisites on small examples, apply the exam-admission rule, and place a method correctly among machine learning, deep learning and natural language processing (NLP).</p>'
      },
      {
        kind: 'exercise',
        title: 'Course structure',
        html: '<p>The course has two parts. The first four weeks are a crash course on machine learning basics: they are more theoretical, build the mathematical foundations, and are more work-intensive than the rest. The remainder covers the most important NLP methods in deep learning, with two lectures per week.</p><p>Drag each topic into the part of the course in which it is taught.</p>',
        hint: 'The crash course covers regression versus classification, likelihood, loss functions, optimisation and neural network basics. Sequence models and transformer language models are the NLP methods of the second part.',
        mount: function (el, ctx) {
          sortGame(el, ctx, {
            bins: [
              { title: 'Weeks 1 to 4', sub: 'machine learning crash course' },
              { title: 'Rest of the course', sub: 'NLP methods in deep learning' }
            ],
            tokens: [
              { label: 'Likelihood', bin: 0 },
              { label: 'Sequence models', bin: 1 },
              { label: 'Loss functions', bin: 0 },
              { label: 'Optimisation', bin: 0 },
              { label: 'Transformer language models', bin: 1 },
              { label: 'Regression vs. classification', bin: 0 },
              { label: 'Neural network basics', bin: 0 }
            ],
            wrong: function (t, i) {
              return i === 0
                ? '"' + t.label + '" is an NLP method and is taught after the four-week crash course.'
                : '"' + t.label + '" is part of the mathematical foundations taught in the first four weeks.';
            },
            done: 'Five foundation topics fill the first four weeks. The two families of NLP models fill the rest.'
          });
        }
      },
      {
        kind: 'explore',
        title: 'Linear algebra',
        html: '<p>The first prerequisite is linear algebra: vectors and matrices, how to multiply them and what the product means, vector spaces, norms and eigenvalues. The figure shows a vector \\(\\mathbf{x} = (x_1, x_2)\\) and its image under the matrix \\(A = \\begin{pmatrix} 2 & 1 \\\\ 1 & 2 \\end{pmatrix}\\), that is \\(A\\mathbf{x} = (2x_1 + x_2,\\; x_1 + 2x_2)\\). The norm \\(\\lVert \\mathbf{x} \\rVert = \\sqrt{x_1^2 + x_2^2}\\) is the length of the arrow.</p><p>Drag the tip of \\(\\mathbf{x}\\) and observe how the direction and length of \\(A\\mathbf{x}\\) change.</p>',
        mount: function (el, ctx) { eigenWidget(el, ctx, false); }
      },
      {
        kind: 'exercise',
        title: 'An eigenvector',
        html: '<p>A non-zero vector \\(\\mathbf{x}\\) is an eigenvector of \\(A\\) with eigenvalue \\(\\lambda\\) if \\(A\\mathbf{x} = \\lambda\\,\\mathbf{x}\\): the matrix only rescales it. For \\(A = \\begin{pmatrix} 2 & 1 \\\\ 1 & 2 \\end{pmatrix}\\), drag \\(\\mathbf{x}\\) to an eigenvector with eigenvalue \\(\\lambda = 3\\).</p>',
        hint: 'The condition \\(2x_1 + x_2 = 3x_1\\) simplifies to \\(x_2 = x_1\\). Any non-zero vector with equal components works, for example \\((1, 1)\\).',
        mount: function (el, ctx) { eigenWidget(el, ctx, true); }
      },
      {
        kind: 'exercise',
        title: 'Multivariate calculus',
        html: '<p>The second prerequisite is multivariate calculus: differentiating functions with several inputs or several outputs, including Jacobian and Hessian matrices. For a function \\(f(x, y)\\), the partial derivative \\(\\partial f / \\partial x\\) is the derivative with respect to \\(x\\) while \\(y\\) is held constant.</p><p>Let \\(f(x, y) = x^2 + 3xy\\). Compute \\(\\dfrac{\\partial f}{\\partial x}\\) at the point \\((x, y) = (1, 2)\\).</p>',
        hint: 'Treating \\(y\\) as a constant gives \\(\\partial f / \\partial x = 2x + 3y\\). Insert \\(x = 1\\) and \\(y = 2\\).',
        mount: function (el, ctx) {
          M4.numberInput(el, {
            answer: 8, tolerance: 0.01, placeholder: 'value', label: '∂f/∂x at (1, 2) =',
            onCorrect: function () {
              ctx.note('\\(\\partial f/\\partial x = 2x + 3y = 2 \\cdot 1 + 3 \\cdot 2 = 8\\).');
              ctx.solved();
            },
            onWrong: function (v) {
              if (Math.abs(v - 3) < 0.01) ctx.wrong('3 is \\(\\partial f/\\partial y = 3x\\) at this point. The question asks for the derivative with respect to \\(x\\).');
              else if (Math.abs(v - 7) < 0.01) ctx.wrong('7 is the value \\(f(1, 2)\\) itself, not its partial derivative.');
              else if (Math.abs(v - 2) < 0.01) ctx.wrong('The term \\(3xy\\) also depends on \\(x\\). Its derivative with respect to \\(x\\) is \\(3y\\).');
              else ctx.wrong('Differentiate each term with respect to \\(x\\), keeping \\(y\\) constant, then insert the point.');
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Statistics',
        html: '<p>The third prerequisite is statistics: probability theory, expectation, variance, covariance and distributions. For \\(n\\) values \\(x_1, \\dots, x_n\\), the mean is \\(\\mu = \\frac{1}{n}\\sum_{i} x_i\\) and the variance is \\(\\sigma^2 = \\frac{1}{n}\\sum_{i} (x_i - \\mu)^2\\), the average squared distance from the mean.</p><p>Drag the four points along the number line until the mean is \\(5\\) and the variance is \\(2.5\\).</p>',
        hint: 'The values must sum to 20 and the squared deviations from 5 must sum to 10. Deviations of \\(-2, -1, 1, 2\\) satisfy both, giving the values 3, 4, 6, 7.',
        mount: function (el, ctx) { statsWidget(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'The weekly rhythm',
        html: '<p>Each teaching week has three sessions. The lecture introduces the material and its intuition. The tutorial follows directly after the lecture, in two parallel groups, and gives room for questions, more detailed explanations and the introduction of the weekly homework. The lab session is held online, adds no new content, and is reserved for questions about the homework and the lecture. Lectures and tutorials are in person only and are not recorded.</p><p>In the first five weeks, lectures take place on 13.10., 20.10., 3.11. and 10.11. The week of 26.10. has no sessions. Drag each session to its time slot.</p>',
        hint: 'The lecture comes first in the week, the tutorial follows immediately afterwards, and the lab session is at the end of the week.',
        mount: function (el, ctx) {
          sortGame(el, ctx, {
            bins: [
              { title: 'Tuesday 11 to 13', sub: 'in person' },
              { title: 'Tuesday 13 to 15', sub: 'in person, two groups' },
              { title: 'Friday 13 to 15', sub: 'online' }
            ],
            tokens: [
              { label: 'Lab session', bin: 2 },
              { label: 'Lecture', bin: 0 },
              { label: 'Tutorial', bin: 1 }
            ],
            wrong: function (t) {
              if (t.bin === 0) return 'The lecture opens the week: it is the first session on Tuesday.';
              if (t.bin === 1) return 'The tutorial takes place directly after the lecture, on the same day.';
              return 'The lab session is the online question session at the end of the week.';
            },
            done: 'Lecture on Tuesday 11 to 13, tutorial directly afterwards from 13 to 15, lab session online on Friday 13 to 15.'
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Homework and exam admission',
        html: '<p>Homework is assigned weekly. Each assignment is released on a Tuesday and is due on the Friday of the following week, so consecutive assignments overlap. Each is worth 10 to 20 points, and admission to the exam requires at least 50% of all homework points in total, not 50% of each assignment. The exam grade is 100% of the final grade. Homework counts only for admission.</p><p>The four maxima below are illustrative. Set the points so that the student is admitted even though at least one homework is below half of its own maximum, then press Check.</p>',
        hint: 'The total must reach 30 of 60. For example 20, 10, 0 and 0 points: the last two assignments are below 50%, yet the total is exactly 30.',
        mount: function (el, ctx) { admissionWidget(el, ctx); }
      },
      {
        kind: 'text',
        title: 'Generative AI and course materials',
        html: '<p>The course strongly recommends not using generative AI tools for the homework, and using them to solve it leads to exclusion from the course. The stated reason is that such tools speed up people who can already do the task and do not help people who cannot: owning a calculator does not make someone a mathematician. Since the exam alone determines the grade, homework solved by a tool yields admission without the understanding the exam tests.</p><p>The proposed self-test for understanding is the question "could I explain this in my own words". If the answer is no, the material has to be revised actively. All lecture materials, further reading, homework links and announcements are distributed through the Moodle course, so enrolment there is required.</p>'
      },
      {
        kind: 'explore',
        title: 'Rules and learned functions',
        html: '<p>Consider detecting spam. Each email is described by two features: the number of capitalised words \\(c\\) (horizontal axis) and the number of links \\(\\ell\\) (vertical axis). A hand-written rule declares an email spam if \\(c > a\\) or \\(\\ell > b\\) for thresholds \\(a\\) and \\(b\\) chosen by a person. Machine learning instead takes a dataset of features and labels and fits a mathematical function to it, so that the function itself captures the pattern.</p><p>Adjust the thresholds and observe the number of correctly classified emails. For this dataset no pair of thresholds classifies all 15 correctly. Then show the learned function.</p>',
        mount: function (el, ctx) { spamWidget(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'Machine learning, deep learning, NLP',
        html: '<p>Machine learning is the field of algorithms that find patterns in data without hand-defined rules. It includes linear regression, naive Bayes classifiers, principal component analysis and many others. Deep learning is the subfield of machine learning that studies artificial neural networks, especially large ones. Natural language processing is the computational study of patterns in human language, by machine learning or by rule-based methods. Hence all deep learning is machine learning, not all deep learning is NLP, and NLP and machine learning overlap only partly. Current NLP work, however, is almost entirely deep learning.</p><p>Drag each item into the region of the diagram where it belongs.</p>',
        hint: 'Ask three questions per item. Does it learn from data (machine learning)? Is it a neural network (deep learning)? Does it deal with human language (NLP)?',
        mount: function (el, ctx) { vennWidget(el, ctx); }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul><li>The course consists of a four-week, mathematically intensive machine learning crash course followed by NLP methods in deep learning. It assumes linear algebra, multivariate calculus and statistics.</li><li>A week has a lecture and a tutorial on Tuesday and an online lab session on Friday. At least 50% of the total homework points are required for exam admission, and the exam alone determines the grade.</li><li>Machine learning fits functions to data instead of hand-writing rules. Deep learning is the part of machine learning that uses neural networks. NLP overlaps both and is today dominated by deep learning.</li></ul>'
      }
    ]
  });
})();
