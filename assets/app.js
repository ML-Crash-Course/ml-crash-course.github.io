/* Machine Learning Crash Course: framework, helpers and app shell.
   No build step, no modules: this file defines window.M4. modules.js and lessons/*.js
   are plain scripts that load after it and register themselves. */
(function () {
  'use strict';
  var M4 = window.M4 = window.M4 || {};
  var SVGNS = 'http://www.w3.org/2000/svg';

  M4.colors = {
    blue: '#2f5f9e', green: '#2f7d5b', orange: '#b8692a', purple: '#5f4f9c', pink: '#a8476f',
    yellow: '#b68a1c', red: '#b1433a', ink: '#1d1b17', muted: '#7a705d', line: '#d6cbb3',
    bg: '#f1ead9', card: '#f6f0e2', paper: '#f6f0e2'
  };
  var C = M4.colors;
  var DARK = { blue: '#22487a', green: '#215d43', orange: '#8c4e1d', purple: '#463a78', pink: '#7f3453', yellow: '#876612', red: '#86322b' };

  M4.lessons = {};
  M4.modules = M4.modules || [];
  M4.lesson = function (def) {
    if (!def || !def.id) return;
    def.steps = def.steps || [];
    M4.lessons[def.id] = def;
  };

  /* ------------------------------------------------------------------ DOM helpers */
  function applyAttrs(node, attrs, isSvg) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { node.style[s] = v[s]; });
      else if (k === 'class' || k === 'className') node.setAttribute('class', v);
      else if (/^on[A-Za-z]/.test(k) && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v === true ? '' : String(v));
    });
  }
  M4.el = function (tag, attrs, parent) {
    var n = document.createElement(tag || 'div');
    applyAttrs(n, attrs, false);
    if (parent) parent.appendChild(n);
    return n;
  };
  M4.svg = function (tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag || 'g');
    applyAttrs(n, attrs, true);
    if (parent) parent.appendChild(n);
    return n;
  };

  /* ------------------------------------------------------------------ TeX */
  M4.tex = function (str, display) {
    str = String(str == null ? '' : str);
    if (window.katex) {
      try { return window.katex.renderToString(str, { displayMode: !!display, throwOnError: false }); } catch (e) { /* fall through */ }
    }
    var esc = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<span class="m4-texfb">' + esc + '</span>';
  };
  var TEX_DELIMS = [
    { left: '\\[', right: '\\]', display: true },
    { left: '$$', right: '$$', display: true },
    { left: '\\(', right: '\\)', display: false }
  ];
  M4.typeset = function (el) {
    if (!el || !window.renderMathInElement) return;
    try { window.renderMathInElement(el, { delimiters: TEX_DELIMS, throwOnError: false }); } catch (e) { /* ignore */ }
  };

  /* ------------------------------------------------------------------ controls */
  M4.button = function (parent, label, onClick, opts) {
    opts = opts || {};
    var b = M4.el('button', { type: 'button', class: 'm4-btn' + (opts.primary ? ' primary' : '') + (opts.success ? ' success' : '') + (opts.ghost ? ' ghost' : '') + (opts.class ? ' ' + opts.class : '') }, parent);
    b.innerHTML = label;
    if (/\\\(|\\\[/.test(label)) M4.typeset(b);
    if (onClick) b.addEventListener('click', function (e) { if (!b.disabled) onClick(e); });
    return b;
  };

  M4.slider = function (parent, o) {
    o = o || {};
    var min = o.min == null ? 0 : o.min, max = o.max == null ? 1 : o.max;
    var step = o.step == null ? (max - min) / 100 : o.step;
    var fmt = o.format || function (v) {
      var d = String(step).indexOf('.') >= 0 ? String(step).split('.')[1].length : 0;
      return Number(v).toFixed(Math.min(d, 4));
    };
    var wrap = M4.el('div', { class: 'm4-slider' }, parent);
    var lab = null;
    if (o.label != null && o.label !== '') {
      lab = M4.el('span', { class: 'm4-slider-label', html: o.label }, wrap);
      M4.typeset(lab);
    }
    var input = M4.el('input', { type: 'range', min: min, max: max, step: step }, wrap);
    input.value = o.value == null ? min : o.value;
    var val = M4.el('span', { class: 'm4-slider-val' }, wrap);
    function show() { val.textContent = fmt(+input.value); }
    show();
    input.addEventListener('input', function () { show(); if (o.onInput) o.onInput(+input.value); });
    if (o.onChange) input.addEventListener('change', function () { o.onChange(+input.value); });
    return {
      el: wrap, input: input, label: lab, valueEl: val,
      get: function () { return +input.value; },
      set: function (v, fire) { input.value = v; show(); if (fire && o.onInput) o.onInput(+input.value); }
    };
  };

  M4.choices = function (parent, o) {
    o = o || {};
    var wrap = M4.el('div', { class: 'm4-choices' }, parent);
    var keys = 'ABCDEFGH';
    var done = false;
    var btns = (o.options || []).map(function (opt, i) {
      var b = M4.el('button', { type: 'button', class: 'm4-choice' }, wrap);
      M4.el('span', { class: 'm4-choice-key', text: keys[i] || String(i + 1) }, b);
      var body = M4.el('span', { class: 'm4-choice-body', html: String(opt) }, b);
      M4.typeset(body);
      b.addEventListener('click', function () {
        if (done || b.classList.contains('wrong')) return;
        if (i === o.correct) {
          done = true;
          b.classList.add('right', 'm4-pop');
          wrap.classList.add('locked');
          if (o.onCorrect) o.onCorrect(i);
        } else {
          b.classList.add('wrong');
          shake(b);
          if (o.onWrong) o.onWrong(i);
        }
      });
      return b;
    });
    return { el: wrap, buttons: btns, reset: function () { done = false; wrap.classList.remove('locked'); btns.forEach(function (b) { b.classList.remove('right', 'wrong', 'm4-pop'); }); } };
  };

  M4.numberInput = function (parent, o) {
    o = o || {};
    var tol = o.tolerance == null ? 0.01 : o.tolerance;
    var wrap = M4.el('div', { class: 'm4-numin' }, parent);
    if (o.label) { var l = M4.el('label', { html: o.label }, wrap); M4.typeset(l); }
    var input = M4.el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', placeholder: o.placeholder || '?' }, wrap);
    var btn = M4.button(wrap, 'Check', null, { primary: true });
    var done = false;
    function parse(s) {
      s = String(s).trim().replace(/−/g, '-').replace(',', '.');
      if (/^-?\d*\.?\d+\s*\/\s*-?\d*\.?\d+$/.test(s)) { var p = s.split('/'); return +p[0] / +p[1]; }
      return s === '' ? NaN : Number(s);
    }
    function check() {
      if (done) return;
      var v = parse(input.value);
      if (isNaN(v)) { shake(wrap); return; }
      if (Math.abs(v - o.answer) <= tol + 1e-12) {
        done = true;
        wrap.classList.remove('wrong'); wrap.classList.add('right');
        input.disabled = true; btn.disabled = true;
        if (o.onCorrect) o.onCorrect(v);
      } else {
        wrap.classList.add('wrong');
        shake(wrap);
        if (o.onWrong) o.onWrong(v);
      }
    }
    btn.addEventListener('click', check);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); check(); } });
    input.addEventListener('input', function () { wrap.classList.remove('wrong'); });
    return { el: wrap, input: input, button: btn };
  };

  function shake(node) {
    if (!node) return;
    node.classList.remove('m4-shake');
    void node.offsetWidth;
    node.classList.add('m4-shake');
    setTimeout(function () { node.classList.remove('m4-shake'); }, 500);
  }
  M4.shake = shake;

  /* ------------------------------------------------------------------ dragging */
  M4.drag = function (node, o) {
    o = o || {};
    var sx = 0, sy = 0, id = null;
    node.style.touchAction = 'none';
    function down(e) {
      if (e.button != null && e.button > 0) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY;
      try { node.setPointerCapture(id); } catch (err) { /* ignore */ }
      e.preventDefault();
      if (o.onStart) o.onStart(e);
    }
    function move(e) { if (id === null || e.pointerId !== id) return; e.preventDefault(); if (o.onMove) o.onMove(e.clientX - sx, e.clientY - sy, e); }
    function up(e) {
      if (id === null || e.pointerId !== id) return;
      id = null;
      try { node.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (o.onEnd) o.onEnd(e);
    }
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    return { destroy: function () { node.removeEventListener('pointerdown', down); node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up); } };
  };

  M4.dragDrop = function (o) {
    o = o || {};
    var slots = o.slots || [];
    function slotAt(x, y) {
      var best = null, bestD = Infinity;
      for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        if (!s || !s.isConnected) continue;
        var r = s.getBoundingClientRect();
        var pad = 10;
        if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
          var d = Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2);
          if (d < bestD) { bestD = d; best = s; }
        }
      }
      return best;
    }
    (o.tokens || []).forEach(function (tok) {
      if (!tok) return;
      if (!tok.classList.contains('m4-token')) tok.classList.add('m4-token');
      var clone = null, rect = null, over = null, moved = false;
      M4.drag(tok, {
        onStart: function () {
          if (tok.classList.contains('locked') || tok.getAttribute('data-locked') === '1') return;
          rect = tok.getBoundingClientRect();
          clone = tok.cloneNode(true);
          clone.classList.add('m4-clone');
          clone.style.left = rect.left + 'px'; clone.style.top = rect.top + 'px';
          clone.style.width = rect.width + 'px'; clone.style.height = rect.height + 'px';
          document.body.appendChild(clone);
          tok.classList.add('m4-dragging');
          moved = false;
        },
        onMove: function (dx, dy, e) {
          if (!clone) return;
          if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
          clone.style.left = (rect.left + dx) + 'px'; clone.style.top = (rect.top + dy) + 'px';
          var s = slotAt(e.clientX, e.clientY);
          if (s !== over) { if (over) over.classList.remove('over'); over = s; if (over) over.classList.add('over'); }
        },
        onEnd: function (e) {
          if (!clone) return;
          var s = slotAt(e.clientX, e.clientY);
          if (!moved && !(e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom)) moved = true;
          if (over) over.classList.remove('over');
          over = null;
          var c = clone; clone = null;
          tok.classList.remove('m4-dragging');
          if (s && moved) {
            c.remove();
            try { if (o.onDrop) o.onDrop(tok, s); } catch (err) { console.error(err); }
            tok.classList.remove('m4-pop'); void tok.offsetWidth; tok.classList.add('m4-pop');
          } else {
            c.classList.add('m4-fly');
            c.style.left = rect.left + 'px'; c.style.top = rect.top + 'px'; c.style.opacity = '0';
            setTimeout(function () { c.remove(); }, 180);
            if (moved && o.onMiss) o.onMiss(tok);
          }
        }
      });
    });
    return { slots: slots };
  };

  /* ------------------------------------------------------------------ generated practice
     M4.practice(el, ctx, {gen, n}): gen() -> {q, answer, tol?, hint?, explain?, options?}
     q is HTML (may contain $...$). With options (array of strings), the answer is the index
     of the correct option; otherwise it is a number typed into a field. The step counts as
     solved after n correct answers. */
  M4.rand = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  M4.randNZ = function (a, b) { var v = 0; while (v === 0) v = M4.rand(a, b); return v; };
  M4.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  M4.fmt = function (v, d) { d = d == null ? 3 : d; var r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d); return String(r).replace('-', '−'); };
  // TeX for a sum of terms [[coef, 'x^2'], [coef, 'xy'], [coef, '']], skipping zeros: "3x^2 - xy + 2"
  M4.poly = function (terms) {
    var s = '';
    terms.forEach(function (t) {
      var c = t[0], m = t[1] || '';
      if (!c) return;
      var a = Math.abs(c), body = (a === 1 && m ? '' : String(+a.toFixed(4))) + m;
      s += s ? (c < 0 ? ' - ' : ' + ') + body : (c < 0 ? '-' : '') + body;
    });
    return s || '0';
  };
  // signed number for TeX: "(-3)" style when it follows an operator
  M4.sn = function (v) { return v < 0 ? '(' + v + ')' : String(v); };
  M4.practice = function (parent, ctx, o) {
    var need = o.n || 3, streak = 0, total = 0, prob = null, locked = false, finished = false;
    var wrap = M4.el('div', { class: 'm4-gen' }, parent);
    var dots = M4.el('div', { class: 'm4-gen-dots', title: need + ' correct answers' }, wrap);
    for (var i = 0; i < need; i++) M4.el('i', null, dots);
    var q = M4.el('div', { class: 'm4-gen-q' }, wrap);
    var area = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, wrap);
    var fb = M4.el('div', { class: 'm4-gen-fb' }, wrap);
    var ctrl = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, wrap);
    var nextBtn = M4.button(ctrl, 'New problem', function () { fresh(); });
    function paintDots() { [].forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k < streak); }); }
    function parse(s) {
      s = String(s).trim().replace(/−/g, '-').replace(',', '.');
      if (/^-?\d*\.?\d+\s*\/\s*-?\d*\.?\d+$/.test(s)) { var p = s.split('/'); return +p[0] / +p[1]; }
      return s === '' ? NaN : Number(s);
    }
    function verdict(ok) {
      locked = true; total++;
      if (ok) { streak++; fb.className = 'm4-gen-fb ok'; fb.innerHTML = 'Correct.' + (prob.explain ? ' ' + prob.explain : ''); }
      else {
        fb.className = 'm4-gen-fb bad';
        fb.innerHTML = 'Not quite. The answer is ' + (prob.options ? prob.options[prob.answer] : '\\(' + M4.fmt(prob.answer).replace('−', '-') + '\\)') + '.' + (prob.explain ? ' ' + prob.explain : '');
        M4.shake && M4.shake(wrap);
      }
      M4.typeset(fb); paintDots();
      nextBtn.textContent = 'Next problem'; nextBtn.classList.add('primary');
      if (streak >= need && !finished) { finished = true; ctx.solved(need + ' correct. Further problems are optional.'); }
    }
    function fresh() {
      prob = o.gen(); locked = false;
      q.innerHTML = prob.q; area.innerHTML = ''; fb.className = 'm4-gen-fb'; fb.innerHTML = prob.hint ? '<i>' + prob.hint + '</i>' : '';
      nextBtn.textContent = 'New problem'; nextBtn.classList.remove('primary');
      if (prob.options) {
        prob.options.forEach(function (lab, k) {
          var b = M4.button(area, lab, function () { if (locked) return; b.classList.add(k === prob.answer ? 'right' : 'wrong'); verdict(k === prob.answer); });
        });
      } else {
        var inp = M4.el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', placeholder: '?', class: 'm4-gen-in' }, M4.el('div', { class: 'm4-numin' }, area));
        var chk = M4.button(inp.parentNode, 'Check', function () { go(); }, { primary: true });
        function go() {
          if (locked) return;
          var v = parse(inp.value); if (isNaN(v)) { M4.shake && M4.shake(inp.parentNode); return; }
          var tol = prob.tol == null ? 0.01 : prob.tol;
          var ok = Math.abs(v - prob.answer) <= tol + 1e-9;
          inp.parentNode.classList.add(ok ? 'right' : 'wrong'); inp.disabled = true; chk.disabled = true;
          verdict(ok);
        }
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (locked) fresh(); else go(); } });
        setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 30);
      }
      M4.typeset(q); M4.typeset(fb); M4.typeset(area);
    }
    paintDots(); fresh();
    return { next: fresh };
  };

  /* ------------------------------------------------------------------ 3D surface z = f(x, y)
     Orthographic view of a shaded mesh over [-r, r]^2. Drag the background to turn it.
     o: {f, r, n, width, height, color, zmin, zmax, contours:[levels], yaw, pitch} */
  M4.surface3d = function (parent, o) {
    o = o || {};
    var W = o.width || 560, H = o.height || 420, r = o.r || 2, n = o.n || 26;
    var f = o.f, color = o.color || C.blue;
    var yaw = o.yaw == null ? -0.65 : o.yaw, pitch = o.pitch == null ? 0.5 : o.pitch;
    var svg = M4.svg('svg', { class: 'm4-surf', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, parent);
    svg.style.maxWidth = W + 'px';
    var gFloor = M4.svg('g', {}, svg), gMesh = M4.svg('g', {}, svg), gTop = M4.svg('g', {}, svg);
    var zmin, zmax, zs, overlay = null, onRedraw = [];
    function range() {
      if (o.zmin != null && o.zmax != null) { zmin = o.zmin; zmax = o.zmax; }
      else {
        zmin = Infinity; zmax = -Infinity;
        for (var i = 0; i <= 30; i++) for (var j = 0; j <= 30; j++) {
          var z = f(-r + 2 * r * i / 30, -r + 2 * r * j / 30); if (isFinite(z)) { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
        }
        if (zmax - zmin < 1e-6) { zmax += 1; zmin -= 1; }
      }
      zs = (o.zheight || 1.15) * r / (zmax - zmin);
    }
    var S = Math.min(W, H) * (o.scale || 0.3) / r;
    function cz(z) { return (Math.min(Math.max(z, zmin), zmax) - (zmin + zmax) / 2) * zs; }
    function proj(x, y, z, raw) {
      var zz = raw ? z : cz(z);
      var X = x * Math.cos(yaw) - y * Math.sin(yaw), Y = x * Math.sin(yaw) + y * Math.cos(yaw);
      var up = Y * Math.sin(pitch) + zz * Math.cos(pitch), depth = -Y * Math.cos(pitch) + zz * Math.sin(pitch);
      return [W / 2 + S * X, H * 0.52 - S * up, depth];
    }
    function floorZ() { return -(zmax - zmin) / 2 * zs - 0.35 * r; }
    function shade(hex, k) {
      var c = parseInt(hex.slice(1), 16), R = c >> 16, G = (c >> 8) & 255, B = c & 255;
      function mix(v) { return Math.round(255 - (255 - v) * k); }
      return 'rgb(' + mix(R) + ',' + mix(G) + ',' + mix(B) + ')';
    }
    function contour(level, out) {
      var m = 48, h = 2 * r / m, i, j;
      for (i = 0; i < m; i++) for (j = 0; j < m; j++) {
        var x0 = -r + i * h, y0 = -r + j * h;
        var v = [f(x0, y0) - level, f(x0 + h, y0) - level, f(x0 + h, y0 + h) - level, f(x0, y0 + h) - level];
        var P = [[x0, y0], [x0 + h, y0], [x0 + h, y0 + h], [x0, y0 + h]], pts = [];
        for (var e = 0; e < 4; e++) {
          var a = v[e], b = v[(e + 1) % 4];
          if ((a < 0) !== (b < 0)) { var t = a / (a - b), A = P[e], Bq = P[(e + 1) % 4]; pts.push([A[0] + t * (Bq[0] - A[0]), A[1] + t * (Bq[1] - A[1])]); }
        }
        if (pts.length >= 2) out.push([pts[0], pts[1]]);
        if (pts.length === 4) out.push([pts[2], pts[3]]);
      }
    }
    function draw() {
      gFloor.innerHTML = ''; gMesh.innerHTML = '';
      var fz = floorZ(), i, j, k;
      var corners = [[-r, -r], [r, -r], [r, r], [-r, r]].map(function (q) { return proj(q[0], q[1], fz, true); });
      M4.svg('polygon', { points: corners.map(function (q) { return q[0] + ',' + q[1]; }).join(' '), fill: '#f6f3ea', stroke: '#e2ddd0', 'stroke-width': 1 }, gFloor);
      for (k = -4; k <= 4; k++) {
        var t = k * r / 4, a1 = proj(t, -r, fz, true), b1 = proj(t, r, fz, true), a2 = proj(-r, t, fz, true), b2 = proj(r, t, fz, true);
        M4.svg('line', { x1: a1[0], y1: a1[1], x2: b1[0], y2: b1[1], stroke: '#ebe6da', 'stroke-width': 1 }, gFloor);
        M4.svg('line', { x1: a2[0], y1: a2[1], x2: b2[0], y2: b2[1], stroke: '#ebe6da', 'stroke-width': 1 }, gFloor);
      }
      if (o.contours) {
        var segs = [];
        o.contours.forEach(function (lv) { contour(lv, segs); });
        var d = '';
        segs.forEach(function (s) { var p = proj(s[0][0], s[0][1], fz, true), q = proj(s[1][0], s[1][1], fz, true); d += 'M' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + 'L' + q[0].toFixed(1) + ',' + q[1].toFixed(1); });
        M4.svg('path', { d: d, stroke: color, 'stroke-width': 1.2, opacity: 0.55, fill: 'none' }, gFloor);
      }
      var quads = [], h = 2 * r / n;
      for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
        var x0 = -r + i * h, y0 = -r + j * h;
        var P = [[x0, y0], [x0 + h, y0], [x0 + h, y0 + h], [x0, y0 + h]].map(function (q) { return [q[0], q[1], f(q[0], q[1])]; });
        var pr = P.map(function (q) { return proj(q[0], q[1], q[2]); });
        var dep = (pr[0][2] + pr[1][2] + pr[2][2] + pr[3][2]) / 4;
        // light from the upper left: shade by the surface normal
        var dx = (cz(P[1][2]) - cz(P[0][2]) + cz(P[2][2]) - cz(P[3][2])) / (2 * h), dy = (cz(P[3][2]) - cz(P[0][2]) + cz(P[2][2]) - cz(P[1][2])) / (2 * h);
        var nl = Math.hypot(dx, dy, 1), lum = (-dx * -0.45 + -dy * 0.35 + 1) / nl / 1.12;
        var hz = ((P[0][2] + P[2][2]) / 2 - zmin) / (zmax - zmin);
        quads.push({ pr: pr, dep: dep, k: 0.1 + 0.32 * Math.max(0, Math.min(1, hz)) + 0.18 * (1 - Math.max(0, Math.min(1, lum))) });
      }
      quads.sort(function (a, b) { return a.dep - b.dep; });
      quads.forEach(function (q) {
        M4.svg('polygon', { points: q.pr.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '), fill: shade(color, q.k), stroke: shade(color, q.k + 0.22), 'stroke-width': 0.6, 'stroke-linejoin': 'round' }, gMesh);
      });
      if (overlay) overlay.draw();
      onRedraw.forEach(function (fn) { fn(); });
    }
    range();
    var api = {
      svg: svg, top: gTop, proj: proj, width: W, height: H, r: r,
      floor: function (x, y) { return proj(x, y, floorZ(), true); },
      at: function (x, y) { return proj(x, y, f(x, y)); },
      setF: function (g, keepRange) { f = g; if (!keepRange) range(); draw(); },
      redraw: draw,
      onRedraw: function (fn) { onRedraw.push(fn); },
      // a small mesh patch z = g(x, y) over the square centred at (cx, cy) with half-width w
      patch: function (g, cx, cy, w, col) {
        overlay = { draw: function () {
          var m = 8, hh = 2 * w / m, d = '';
          for (var a = 0; a <= m; a++) {
            var s1 = '', s2 = '';
            for (var b = 0; b <= m; b++) {
              var x1 = cx - w + a * hh, y1 = cy - w + b * hh, p1 = proj(x1, y1, g(x1, y1));
              var x2 = cx - w + b * hh, y2 = cy - w + a * hh, p2 = proj(x2, y2, g(x2, y2));
              s1 += (b ? 'L' : 'M') + p1[0].toFixed(1) + ',' + p1[1].toFixed(1);
              s2 += (b ? 'L' : 'M') + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
            }
            d += s1 + s2;
          }
          var el = gMesh.querySelector('.m4-surf-patch') || M4.svg('path', { class: 'm4-surf-patch', fill: 'none', stroke: col || C.ink, 'stroke-width': 1.6, opacity: 0.9 }, gMesh);
          gMesh.appendChild(el); el.setAttribute('d', d);
        } };
        overlay.draw();
      },
      clearPatch: function () { overlay = null; var el = gMesh.querySelector('.m4-surf-patch'); if (el) el.remove(); },
      // world point -> pixel, then a draggable ball constrained to the surface
      ball: function (x, y, bo) {
        bo = bo || {};
        var b = { x: x, y: y };
        var shadow = M4.svg('ellipse', { rx: 7, ry: 3.5, fill: 'rgba(34,32,28,.22)' }, gTop);
        var drop = M4.svg('line', { stroke: 'rgba(34,32,28,.35)', 'stroke-width': 1.2, 'stroke-dasharray': '3 4' }, gTop);
        var g = M4.svg('g', { class: 'm4-handle m4-surf-ball' }, gTop);
        M4.svg('circle', { class: 'm4-handle-halo', r: 20, fill: bo.color || C.ink }, g);
        M4.svg('circle', { r: 10, fill: bo.color || C.ink, stroke: '#fff', 'stroke-width': 3 }, g);
        M4.svg('circle', { r: 24, fill: 'transparent' }, g);
        function place() {
          var p = proj(b.x, b.y, f(b.x, b.y)), q = proj(b.x, b.y, floorZ(), true);
          g.setAttribute('transform', 'translate(' + p[0] + ',' + p[1] + ')');
          shadow.setAttribute('cx', q[0]); shadow.setAttribute('cy', q[1]);
          drop.setAttribute('x1', q[0]); drop.setAttribute('y1', q[1]); drop.setAttribute('x2', p[0]); drop.setAttribute('y2', p[1]);
          gTop.appendChild(g);
        }
        b.set = function (a, c) { b.x = a; b.y = c; place(); if (bo.onMove) bo.onMove(b.x, b.y); };
        onRedraw.push(place);
        function toPx(e) { var m = svg.getScreenCTM(); var q = svg.createSVGPoint(); q.x = e.clientX; q.y = e.clientY; q = q.matrixTransform(m.inverse()); return [q.x, q.y]; }
        // find (x, y) whose surface point projects closest to the pointer (Newton steps, then a grid search as fallback)
        function solve(px, py) {
          var x = b.x, y = b.y, e = 1e-4, it;
          for (it = 0; it < 12; it++) {
            var p = proj(x, y, f(x, y)), px1 = proj(x + e, y, f(x + e, y)), py1 = proj(x, y + e, f(x, y + e));
            var a = (px1[0] - p[0]) / e, c = (py1[0] - p[0]) / e, bb = (px1[1] - p[1]) / e, d = (py1[1] - p[1]) / e;
            var det = a * d - bb * c, rx = px - p[0], ry = py - p[1];
            if (Math.abs(det) < 1e-6) break;
            var sx = (d * rx - c * ry) / det, sy = (-bb * rx + a * ry) / det, L = Math.hypot(sx, sy), cap = 0.4 * r;
            if (L > cap) { sx *= cap / L; sy *= cap / L; }
            x = Math.min(r, Math.max(-r, x + sx)); y = Math.min(r, Math.max(-r, y + sy));
          }
          var pe = proj(x, y, f(x, y));
          if (Math.hypot(pe[0] - px, pe[1] - py) > 6) {
            var best = Infinity, bx = x, by = y;
            for (var i = 0; i <= 40; i++) for (var j = 0; j <= 40; j++) {
              var gx = -r + 2 * r * i / 40, gy = -r + 2 * r * j / 40, q = proj(gx, gy, f(gx, gy)), dd = Math.hypot(q[0] - px, q[1] - py) - q[2] * 0.01;
              if (dd < best) { best = dd; bx = gx; by = gy; }
            }
            x = bx; y = by;
          }
          return [x, y];
        }
        var pid = null;
        g.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); pid = e.pointerId; try { g.setPointerCapture(pid); } catch (er) { /* ignore */ } g.classList.add('active', 'touched'); });
        g.addEventListener('pointermove', function (e) { if (pid !== e.pointerId) return; e.preventDefault(); var q = toPx(e), s = solve(q[0], q[1]); b.set(s[0], s[1]); });
        function up(e) { if (pid !== e.pointerId) return; pid = null; g.classList.remove('active'); if (bo.onEnd) bo.onEnd(b.x, b.y); }
        g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
        place();
        return b;
      },
      // an arrow between two projected pixel points, kept in the top layer
      arrow: function (col, w) {
        var el = M4.svg('g', {}, gTop);
        var ln = M4.svg('line', { stroke: col, 'stroke-width': w || 3.5, 'stroke-linecap': 'round' }, el);
        var hd = M4.svg('polygon', { fill: col }, el);
        return { el: el, set: function (p, q) {
          var dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
          if (L < 2) { el.style.display = 'none'; return; } el.style.display = '';
          var hl = Math.min(13, L * 0.5), ux = dx / L, uy = dy / L, bx = q[0] - ux * hl, by = q[1] - uy * hl, hw = hl * 0.6;
          ln.setAttribute('x1', p[0]); ln.setAttribute('y1', p[1]); ln.setAttribute('x2', bx); ln.setAttribute('y2', by);
          hd.setAttribute('points', q[0] + ',' + q[1] + ' ' + (bx - uy * hw) + ',' + (by + ux * hw) + ' ' + (bx + uy * hw) + ',' + (by - ux * hw));
        } };
      }
    };
    // turn the view by dragging the background
    var rid = null, last = null;
    svg.addEventListener('pointerdown', function (e) { if (rid !== null) return; rid = e.pointerId; last = [e.clientX, e.clientY]; try { svg.setPointerCapture(rid); } catch (er) { /* ignore */ } svg.classList.add('turning'); });
    svg.addEventListener('pointermove', function (e) {
      if (rid !== e.pointerId) return; e.preventDefault();
      yaw += (e.clientX - last[0]) * 0.01; pitch = Math.min(1.35, Math.max(0.12, pitch + (e.clientY - last[1]) * 0.006));
      last = [e.clientX, e.clientY]; draw();
    });
    function stop(e) { if (rid !== e.pointerId) return; rid = null; svg.classList.remove('turning'); }
    svg.addEventListener('pointerup', stop); svg.addEventListener('pointercancel', stop);
    draw();
    return api;
  };

  /* ------------------------------------------------------------------ confetti */
  M4.confetti = function (opts) {
    opts = opts || {};
    var cv = M4.el('canvas', { class: 'm4-confetti' }, document.body);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    var g = cv.getContext('2d'); g.scale(dpr, dpr);
    var cols = [C.blue, C.green, C.orange, C.purple, C.pink, C.yellow];
    var n = opts.count || 110, parts = [];
    var ox = opts.x == null ? W / 2 : opts.x, oy = opts.y == null ? H * 0.62 : opts.y;
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9, sp = 7 + Math.random() * 10;
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length], round: Math.random() < 0.3 });
    }
    var t0 = performance.now();
    (function frame(t) {
      var el = t - t0;
      g.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r);
        g.globalAlpha = Math.max(0, 1 - el / 1900);
        g.fillStyle = p.c;
        if (p.round) { g.beginPath(); g.arc(0, 0, p.w / 2, 0, 7); g.fill(); } else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)) + 2);
        g.restore();
      });
      if (el < 2000) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  };

  /* ------------------------------------------------------------------ coordinate plane */
  var planeCount = 0;
  function niceStep(range) {
    var raw = range / 10, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  }
  function fmtTick(v) { var s = Math.abs(v) < 1e-9 ? '0' : String(+v.toFixed(6)); return s.replace('-', '−'); }
  function pt(q) { return Array.isArray(q) ? q : [q.x, q.y]; }

  M4.plane = function (parent, o) {
    o = o || {};
    var xmin = o.xmin == null ? -5 : o.xmin, xmax = o.xmax == null ? 5 : o.xmax;
    var ymin = o.ymin == null ? -5 : o.ymin, ymax = o.ymax == null ? 5 : o.ymax;
    var W = o.width || 520, H = o.height || 520;
    var uid = 'pl' + (++planeCount);
    var svg = M4.svg('svg', { class: 'm4-plane' + (o.class ? ' ' + o.class : ''), viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, parent);
    svg.style.maxWidth = W + 'px';
    var X = function (v) { return (v - xmin) / (xmax - xmin) * W; };
    var Y = function (v) { return H - (v - ymin) / (ymax - ymin) * H; };
    var UX = function (px) { return xmin + px / W * (xmax - xmin); };
    var UY = function (py) { return ymin + (H - py) / H * (ymax - ymin); };
    var bg = M4.svg('g', { class: 'm4-plane-bg' }, svg);
    var g = M4.svg('g', {}, svg);
    var top = M4.svg('g', { class: 'm4-plane-top' }, svg);

    var sx = niceStep(xmax - xmin), sy = niceStep(ymax - ymin);
    var showGrid = o.grid !== false, showAxes = o.axes !== false, showLabels = o.labels !== false;
    var k, v;
    if (showGrid) {
      for (k = Math.ceil(xmin / sx); k * sx <= xmax + 1e-9; k++) { v = X(k * sx); M4.svg('line', { x1: v, y1: 0, x2: v, y2: H, stroke: '#eceae3', 'stroke-width': 1 }, bg); }
      for (k = Math.ceil(ymin / sy); k * sy <= ymax + 1e-9; k++) { v = Y(k * sy); M4.svg('line', { x1: 0, y1: v, x2: W, y2: v, stroke: '#eceae3', 'stroke-width': 1 }, bg); }
    }
    if (showAxes) {
      var ax = Math.min(Math.max(0, xmin), xmax), ay = Math.min(Math.max(0, ymin), ymax);
      M4.svg('line', { x1: 0, y1: Y(ay), x2: W, y2: Y(ay), stroke: '#a8a69e', 'stroke-width': 1.6 }, bg);
      M4.svg('line', { x1: X(ax), y1: 0, x2: X(ax), y2: H, stroke: '#a8a69e', 'stroke-width': 1.6 }, bg);
      if (showLabels) {
        var lx = Math.max(1, Math.round(((xmax - xmin) / sx) / 10)), ly = Math.max(1, Math.round(((ymax - ymin) / sy) / 10));
        for (k = Math.ceil(xmin / sx); k * sx <= xmax + 1e-9; k++) {
          if (k === 0 || k % lx) continue;
          v = k * sx; if (Math.abs(X(v)) < 8 || Math.abs(X(v) - W) < 8) continue;
          var ty = Y(ay) + 17; if (ty > H - 4) ty = Y(ay) - 7;
          M4.svg('text', { x: X(v), y: ty, 'text-anchor': 'middle', 'font-size': 12, fill: '#9a988f', text: fmtTick(v) }, bg);
        }
        for (k = Math.ceil(ymin / sy); k * sy <= ymax + 1e-9; k++) {
          if (k === 0 || k % ly) continue;
          v = k * sy; if (Math.abs(Y(v)) < 8 || Math.abs(Y(v) - H) < 8) continue;
          var tx = X(ax) - 7, anc = 'end'; if (tx < 20) { tx = X(ax) + 7; anc = 'start'; }
          M4.svg('text', { x: tx, y: Y(v) + 4, 'text-anchor': anc, 'font-size': 12, fill: '#9a988f', text: fmtTick(v) }, bg);
        }
      }
    }

    function layer(opts) { return opts && opts.layer === 'top' ? top : opts && opts.layer === 'bg' ? bg : g; }
    function common(node, opts) {
      if (opts.class) node.setAttribute('class', opts.class);
      if (opts.opacity != null) node.setAttribute('opacity', opts.opacity);
    }
    var p = { svg: svg, g: g, top: top, bg: bg, width: W, height: H, xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax, x: X, y: Y, ux: UX, uy: UY };

    p.line = function (x1, y1, x2, y2, opts) {
      opts = opts || {};
      var el = M4.svg('line', { stroke: opts.stroke || C.ink, 'stroke-width': opts.width == null ? 2 : opts.width, 'stroke-linecap': 'round' }, layer(opts));
      if (opts.dash) el.setAttribute('stroke-dasharray', opts.dash === true ? '6 6' : opts.dash);
      common(el, opts);
      function set(a, b, c, d) { el.setAttribute('x1', X(a)); el.setAttribute('y1', Y(b)); el.setAttribute('x2', X(c)); el.setAttribute('y2', Y(d)); }
      set(x1, y1, x2, y2);
      return { el: el, set: set };
    };

    p.arrow = function (x1, y1, x2, y2, opts) {
      opts = opts || {};
      var col = opts.stroke || C.ink, w = opts.width == null ? 4 : opts.width;
      var el = M4.svg('g', { class: 'm4-arrow' }, layer(opts));
      var ln = M4.svg('line', { stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' }, el);
      if (opts.dash) ln.setAttribute('stroke-dasharray', opts.dash === true ? '6 6' : opts.dash);
      var hd = M4.svg('polygon', { fill: col, 'stroke-linejoin': 'round', stroke: col, 'stroke-width': 1 }, el);
      common(el, opts);
      function set(a, b, c, d) {
        var px1 = X(a), py1 = Y(b), px2 = X(c), py2 = Y(d);
        var dx = px2 - px1, dy = py2 - py1, L = Math.hypot(dx, dy);
        if (L < 0.5) { ln.setAttribute('x1', px1); ln.setAttribute('y1', py1); ln.setAttribute('x2', px1); ln.setAttribute('y2', py1); hd.setAttribute('points', ''); return; }
        var hl = Math.min(Math.max(10, w * 3.2), L * 0.6), hw = hl * 0.62;
        var ux = dx / L, uy = dy / L;
        var bx = px2 - ux * hl, by = py2 - uy * hl;
        ln.setAttribute('x1', px1); ln.setAttribute('y1', py1); ln.setAttribute('x2', bx + ux * 1); ln.setAttribute('y2', by + uy * 1);
        hd.setAttribute('points', [px2 + ',' + py2, (bx - uy * hw) + ',' + (by + ux * hw), (bx + uy * hw) + ',' + (by - ux * hw)].join(' '));
      }
      set(x1, y1, x2, y2);
      return { el: el, line: ln, head: hd, set: set, setColor: function (c2) { ln.setAttribute('stroke', c2); hd.setAttribute('fill', c2); hd.setAttribute('stroke', c2); } };
    };

    p.point = function (x, y, opts) {
      opts = opts || {};
      var el = M4.svg('circle', { r: opts.r == null ? 6 : opts.r, fill: opts.fill || opts.color || C.ink }, layer(opts));
      if (opts.stroke) { el.setAttribute('stroke', opts.stroke); el.setAttribute('stroke-width', opts.width == null ? 2 : opts.width); }
      common(el, opts);
      function set(a, b) { el.setAttribute('cx', X(a)); el.setAttribute('cy', Y(b)); }
      set(x, y);
      return { el: el, set: set };
    };

    p.text = function (x, y, str, opts) {
      opts = opts || {};
      var el = M4.svg('text', { 'font-size': opts.size || 16, fill: opts.fill || C.ink, 'text-anchor': opts.anchor || 'middle', 'font-weight': opts.weight || 600, 'dominant-baseline': opts.baseline || 'middle' }, layer(opts));
      el.style.paintOrder = 'stroke';
      if (opts.halo !== false) { el.setAttribute('stroke', '#fff'); el.setAttribute('stroke-width', 4); el.setAttribute('stroke-linejoin', 'round'); }
      common(el, opts);
      function set(a, b, s) { el.setAttribute('x', X(a)); el.setAttribute('y', Y(b)); if (s !== undefined) el.textContent = s; }
      set(x, y, str == null ? '' : String(str));
      return { el: el, set: set };
    };

    p.path = function (points, opts) {
      opts = opts || {};
      var el = M4.svg('path', { stroke: opts.stroke || (opts.fill && opts.fill !== 'none' ? 'none' : C.ink), 'stroke-width': opts.width == null ? 3 : opts.width, fill: opts.fill || 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, layer(opts));
      if (opts.dash) el.setAttribute('stroke-dasharray', opts.dash === true ? '6 6' : opts.dash);
      if (opts.fillOpacity != null) el.setAttribute('fill-opacity', opts.fillOpacity);
      common(el, opts);
      function set(pts) {
        var d = '';
        (pts || []).forEach(function (q, i) { q = pt(q); d += (i ? 'L' : 'M') + X(q[0]).toFixed(2) + ',' + Y(q[1]).toFixed(2); });
        if (opts.closed && d) d += 'Z';
        el.setAttribute('d', d);
      }
      set(points);
      return { el: el, set: set };
    };

    p.fn = function (f, opts) {
      opts = opts || {};
      var n = opts.samples || 200;
      var el = M4.svg('path', { stroke: opts.stroke || C.blue, 'stroke-width': opts.width == null ? 3 : opts.width, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, layer(opts));
      if (opts.dash) el.setAttribute('stroke-dasharray', opts.dash === true ? '6 6' : opts.dash);
      common(el, opts);
      var a = opts.xmin == null ? xmin : opts.xmin, b = opts.xmax == null ? xmax : opts.xmax;
      var span = (ymax - ymin) * 4;
      function set(fun) {
        var d = '', pen = false;
        for (var i = 0; i <= n; i++) {
          var x = a + (b - a) * i / n, y;
          try { y = fun(x); } catch (e) { y = NaN; }
          if (!isFinite(y) || y > ymax + span || y < ymin - span) { pen = false; continue; }
          d += (pen ? 'L' : 'M') + X(x).toFixed(2) + ',' + Y(y).toFixed(2);
          pen = true;
        }
        el.setAttribute('d', d);
      }
      set(f);
      return { el: el, set: set };
    };

    p.handle = function (x, y, opts) {
      opts = opts || {};
      var col = opts.color || C.blue, r = opts.r || 11;
      var b = opts.bounds || {};
      var bx0 = b.xmin == null ? xmin : b.xmin, bx1 = b.xmax == null ? xmax : b.xmax;
      var by0 = b.ymin == null ? ymin : b.ymin, by1 = b.ymax == null ? ymax : b.ymax;
      var el = M4.svg('g', { class: 'm4-handle' }, top);
      M4.svg('circle', { class: 'm4-handle-halo', r: r * 1.9, fill: col }, el);
      M4.svg('circle', { class: 'm4-handle-dot', r: r, fill: col, stroke: '#fff', 'stroke-width': 3 }, el);
      M4.svg('circle', { r: Math.max(22, r * 2), fill: 'transparent' }, el);
      var h = { el: el, x: x, y: y };
      function place() { el.setAttribute('transform', 'translate(' + X(h.x) + ',' + Y(h.y) + ')'); }
      h.set = function (a, c) { h.x = a; h.y = c; place(); };
      place();
      var id = null, off = [0, 0];
      function toUnits(e) {
        var m = svg.getScreenCTM(); if (!m) return null;
        var q = svg.createSVGPoint(); q.x = e.clientX; q.y = e.clientY;
        q = q.matrixTransform(m.inverse());
        return [UX(q.x), UY(q.y)];
      }
      el.addEventListener('pointerdown', function (e) {
        if (e.button != null && e.button > 0) return;
        e.preventDefault(); e.stopPropagation();
        id = e.pointerId;
        try { el.setPointerCapture(id); } catch (err) { /* ignore */ }
        el.classList.add('active', 'touched');
        var u = toUnits(e); off = u ? [h.x - u[0], h.y - u[1]] : [0, 0];
        if (opts.onStart) opts.onStart(h.x, h.y);
      });
      el.addEventListener('pointermove', function (e) {
        if (id === null || e.pointerId !== id) return;
        e.preventDefault();
        var u = toUnits(e); if (!u) return;
        var nx = u[0] + off[0], ny = u[1] + off[1];
        if (opts.snap) { nx = Math.round(nx / opts.snap) * opts.snap; ny = Math.round(ny / opts.snap) * opts.snap; nx = +nx.toFixed(10); ny = +ny.toFixed(10); }
        nx = Math.min(bx1, Math.max(bx0, nx)); ny = Math.min(by1, Math.max(by0, ny));
        if (opts.constrain) { var cc = opts.constrain(nx, ny); if (cc) { nx = cc[0]; ny = cc[1]; } }
        if (nx === h.x && ny === h.y) return;
        h.x = nx; h.y = ny; place();
        if (opts.onDrag) opts.onDrag(nx, ny);
      });
      function end(e) {
        if (id === null || e.pointerId !== id) return;
        id = null; el.classList.remove('active');
        if (opts.onEnd) opts.onEnd(h.x, h.y);
      }
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      return h;
    };
    return p;
  };

  /* ================================================================== state */
  var KEY = 'math4ai.progress.v1';
  var S = { done: {}, solved: {}, xp: 0, streak: 0, lastDay: '', last: '' };
  try { var raw = localStorage.getItem(KEY); if (raw) { var o2 = JSON.parse(raw); if (o2 && typeof o2 === 'object') Object.keys(S).forEach(function (k) { if (o2[k] != null) S[k] = o2[k]; }); } } catch (e) { /* storage unavailable */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function touchStreak() {
    var t = today(); if (S.lastDay === t) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var ys = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    S.streak = S.lastDay === ys ? S.streak + 1 : 1;
    S.lastDay = t;
  }
  function liveStreak() {
    if (!S.lastDay) return 0;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var ys = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    return (S.lastDay === today() || S.lastDay === ys) ? S.streak : 0;
  }
  var XP_PER_LEVEL = 200;
  function level() { return Math.floor(S.xp / XP_PER_LEVEL) + 1; }
  M4.progress = S;
  M4.resetProgress = function () { S.done = {}; S.solved = {}; S.xp = 0; S.streak = 0; S.lastDay = ''; S.last = ''; save(); route(); };

  /* ================================================================== shell */
  var app;
  var ICON = {
    bolt: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="none" stroke="#b68a1c" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    flame: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" fill="none" stroke="#b8692a" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    star: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    close: '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>',
    back: '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bulb: '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lock: '<svg width="16" height="16" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>'
  };

  function topBar(parent) {
    var bar = M4.el('header', { class: 'm4-top' }, parent);
    var inn = M4.el('div', { class: 'm4-top-in' }, bar);
    M4.el('a', { class: 'm4-word', href: '#/', 'aria-label': 'Machine Learning Crash Course, home', html: '<span class="m4-word-mark">' + MARK + '</span><span class="m4-word-txt">Machine Learning <i class="m4-word-long">Crash Course</i></span>' }, inn);
    var star = M4.el('a', { class: 'm4-star', href: REPO_URL, target: '_blank', rel: 'noopener', title: 'Star the project on GitHub', 'aria-label': 'Star the project on GitHub', html: ICON.star + '<em class="m4-star-txt" style="font-style:normal">Star</em><span class="m4-star-n"></span>' }, inn);
    starCount(function (n) { var e = star.querySelector('.m4-star-n'); if (e && n != null) e.textContent = n.toLocaleString('en-US'); });
    if (M4.feedbackButton) M4.feedbackButton(inn);
    M4.el('span', { class: 'm4-stat', title: 'Day streak', html: ICON.flame + '<b>' + liveStreak() + '</b>' }, inn);
    M4.el('span', { class: 'm4-stat', title: 'Experience points', html: ICON.bolt + '<b class="m4-xpval">' + S.xp + '</b>' }, inn);
    var lv = M4.el('span', { class: 'm4-stat m4-level', title: 'Level' }, inn);
    M4.el('span', { html: 'Level <b>' + level() + '</b>' }, lv);
    var lb = M4.el('span', { class: 'm4-level-bar' }, lv);
    M4.el('i', { style: 'width:' + Math.round((S.xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100) + '%' }, lb);
    return bar;
  }

  var REPO = 'ML-Crash-Course/ml-crash-course.github.io', REPO_URL = 'https://github.com/' + REPO;
  var MARK = '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#1d1b17" stroke-width="1.4" stroke-linecap="round"><circle cx="14" cy="14" r="12.5"/><path d="M4 19 C9 19 10 8 14 8 S19 19 24 19" stroke="#b6472b" stroke-width="1.8"/><path d="M3 14h22M14 3v22" stroke-opacity=".25"/></svg>';
  function starCount(cb) {
    var K = 'm4.stars.v1', now = Date.now();
    try {
      var c = JSON.parse(localStorage.getItem(K) || 'null');
      if (c && now - c.t < 6 * 3600 * 1000) { cb(c.n); return; }
      if (c) cb(c.n);
    } catch (e) { /* storage blocked */ }
    if (!window.fetch) return;
    fetch('https://api.github.com/repos/' + REPO).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || typeof j.stargazers_count !== 'number') return;
      try { localStorage.setItem(K, JSON.stringify({ n: j.stargazers_count, t: now })); } catch (e) { /* ignore */ }
      cb(j.stargazers_count);
    }).catch(function () { /* offline or rate limited */ });
  }

  function moduleOf(lessonId) {
    for (var i = 0; i < M4.modules.length; i++) if (M4.modules[i].lessons.indexOf(lessonId) >= 0) return M4.modules[i];
    var L = M4.lessons[lessonId];
    if (L) for (i = 0; i < M4.modules.length; i++) if (M4.modules[i].id === L.module) return M4.modules[i];
    return null;
  }
  function modStats(m) {
    var avail = m.lessons.filter(function (id) { return M4.lessons[id]; });
    var done = avail.filter(function (id) { return S.done[id]; });
    return { total: m.lessons.length, avail: avail.length, done: done.length, frac: m.lessons.length ? done.length / m.lessons.length : 0 };
  }
  function nextLessonOf(m) {
    for (var i = 0; i < m.lessons.length; i++) { var id = m.lessons[i]; if (M4.lessons[id] && !S.done[id]) return id; }
    return null;
  }
  function col(name) { return C[name] || name || C.blue; }
  function dark(name) { return DARK[name] || '#333'; }

  /* ------------------------------------------------------------------ module artwork: line drawings on paper */
  function art(m, w, h, cls) {
    var c = col(m.color), ink = C.ink;
    var s = M4.svg('svg', { viewBox: '0 0 ' + w + ' ' + h, preserveAspectRatio: 'xMidYMid slice', class: cls || 'm4-mcard-art' });
    M4.svg('rect', { width: w, height: h, fill: C.paper }, s);
    var grid = M4.svg('g', { stroke: '#e2d8c2', 'stroke-width': 1 }, s);
    var step = Math.max(16, Math.round(h / 8));
    var cx = w / 2, cy = h / 2, k = h / 150;
    for (var gx = cx % step; gx <= w; gx += step) M4.svg('line', { x1: gx, y1: 0, x2: gx, y2: h }, grid);
    for (var gy = cy % step; gy <= h; gy += step) M4.svg('line', { x1: 0, y1: gy, x2: w, y2: gy }, grid);
    var gg = M4.svg('g', { fill: 'none', stroke: ink, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': 1.6 }, s);
    function P(x, y) { return (cx + x * k).toFixed(1) + ',' + (cy + y * k).toFixed(1); }
    function line(x1, y1, x2, y2, o) { return M4.svg('line', Object.assign({ x1: cx + x1 * k, y1: cy + y1 * k, x2: cx + x2 * k, y2: cy + y2 * k }, o || {}), gg); }
    function arrow(x1, y1, x2, y2, color, sw) {
      sw = sw || 2.2;
      var X1 = cx + x1 * k, Y1 = cy + y1 * k, X2 = cx + x2 * k, Y2 = cy + y2 * k;
      var dx = X2 - X1, dy = Y2 - Y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, hl = 5 + sw * 2.4;
      M4.svg('line', { x1: X1, y1: Y1, x2: X2 - ux * hl * .8, y2: Y2 - uy * hl * .8, stroke: color, 'stroke-width': sw }, gg);
      M4.svg('polygon', { points: [X2 + ',' + Y2, (X2 - ux * hl - uy * hl * .45) + ',' + (Y2 - uy * hl + ux * hl * .45), (X2 - ux * hl + uy * hl * .45) + ',' + (Y2 - uy * hl - ux * hl * .45)].join(' '), fill: color, stroke: 'none' }, gg);
    }
    function curve(f, x0, x1, o) {
      var d = ''; for (var t = 0; t <= 80; t++) { var x = x0 + (x1 - x0) * t / 80; d += (t ? 'L' : 'M') + P(x, f(x)); }
      return M4.svg('path', Object.assign({ d: d }, o || {}), gg);
    }
    function dot(x, y, r, fill) { return M4.svg('circle', { cx: cx + x * k, cy: cy + y * k, r: (r || 4) * k, fill: fill || ink, stroke: 'none' }, gg); }
    function ring(x, y, r, o) { return M4.svg('circle', Object.assign({ cx: cx + x * k, cy: cy + y * k, r: r * k, fill: C.paper }, o || {}), gg); }
    function ell(rx, ry, rot, o) { return M4.svg('ellipse', Object.assign({ cx: cx, cy: cy, rx: rx * k, ry: ry * k, transform: 'rotate(' + (rot || 0) + ' ' + cx + ' ' + cy + ')' }, o || {}), gg); }
    function axes(sx, sy) { line(-sx, 0, sx, 0, { stroke: '#b9b19e', 'stroke-width': 1 }); line(0, -sy, 0, sy, { stroke: '#b9b19e', 'stroke-width': 1 }); }
    var i, id = m.id;
    if (id === 'vectors') {
      axes(120, 62); arrow(0, 0, 70, -42, c, 2.6); arrow(0, 0, 92, 18, ink, 2);
      line(70, -42, 162 - 70, -24, { 'stroke-dasharray': '4 4', stroke: '#8a8373' }); line(92, 18, 162 - 70, -24, { 'stroke-dasharray': '4 4', stroke: '#8a8373' });
      arrow(0, 0, 92, -24, c, 1.4);
    } else if (id === 'matrices') {
      for (i = -4; i <= 4; i++) {
        line(i * 26 - 30, -70, i * 26 + 30, 70, { stroke: i ? '#b9b19e' : ink, 'stroke-width': i ? 1 : 1.6 });
        line(-130, i * 18 + 12, 130, i * 18 - 12, { stroke: i ? '#b9b19e' : ink, 'stroke-width': i ? 1 : 1.6 });
      }
      arrow(0, 0, 26 + 7, -6, c, 2.6); arrow(0, 0, 13, -36 - 2, c, 2.6);
    } else if (id === 'eigen') {
      ell(84, 36, -25, { stroke: ink }); ell(46, 46, 0, { stroke: '#b9b19e', 'stroke-dasharray': '3 5' });
      arrow(0, 0, 76, -36, c, 2.6); arrow(0, 0, 14, 30, c, 2.6);
      line(-120, 57, 120, -57, { stroke: c, 'stroke-opacity': .35, 'stroke-dasharray': '2 6' });
    } else if (id === 'functions') {
      axes(130, 64);
      curve(function (x) { return -Math.exp(x / 40) * 8 + 4; }, -130, 70, { stroke: c, 'stroke-width': 2.4 });
      curve(function (x) { return -Math.log(x / 40) * 26; }, 3, 130, { stroke: ink });
      line(-64, 64, 64, -64, { stroke: '#b9b19e', 'stroke-dasharray': '3 5' });
    } else if (id === 'calculus') {
      var f = function (x) { var u = x / 60; return -(u * u * u - u) * 30 + 10; };
      curve(f, -120, 120, { stroke: ink }); var x0 = -45, h0 = 1, sl = (f(x0 + h0) - f(x0)) / h0;
      line(x0 - 70, f(x0) - 70 * sl, x0 + 70, f(x0) + 70 * sl, { stroke: c, 'stroke-width': 2.2 }); dot(x0, f(x0), 4.5, c);
      line(x0, f(x0), x0 + 40, f(x0), { stroke: '#8a8373', 'stroke-dasharray': '3 4' }); line(x0 + 40, f(x0), x0 + 40, f(x0) + 40 * sl, { stroke: '#8a8373', 'stroke-dasharray': '3 4' });
    } else if (id === 'multivariable') {
      for (i = 1; i <= 5; i++) ell(i * 24, i * 12, -18, { stroke: i === 5 ? '#b9b19e' : ink, 'stroke-opacity': 1 - i * .12 });
      arrow(56, -36, 92, -64, c, 2.6); dot(56, -36, 4.5, c);
      line(56 - 40, -36 + 21, 56 + 40, -36 - 21, { stroke: '#8a8373', 'stroke-dasharray': '3 4' });
    } else if (id === 'probability') {
      line(-130, 50, 130, 50, { stroke: '#b9b19e', 'stroke-width': 1 });
      for (i = -4; i <= 4; i++) { var hh = Math.exp(-i * i / 5) * 92; M4.svg('rect', { x: cx + (i * 22 - 9) * k, y: cy + (50 - hh) * k, width: 18 * k, height: hh * k, fill: c, 'fill-opacity': .12, stroke: c, 'stroke-width': 1 }, gg); }
      curve(function (x) { var u = x / 46; return 50 - Math.exp(-u * u / 2) * 96; }, -130, 130, { stroke: ink, 'stroke-width': 2 });
    } else if (id === 'l1') {
      axes(130, 62);
      [[-100, 38], [-74, 30], [-50, 26], [-24, 4], [4, 0], [30, -18], [56, -22], [84, -42], [104, -44]].forEach(function (q, j) { var y = q[1] + (j % 2 ? 6 : -5); line(q[0], y, q[0], -q[0] * .45, { stroke: c, 'stroke-opacity': .5, 'stroke-width': 1 }); ring(q[0], y, 4.5, { stroke: ink, 'stroke-width': 1.4 }); });
      line(-125, 56, 125, -56, { stroke: c, 'stroke-width': 2.4 });
    } else if (id === 'mle') {
      line(-130, 46, 130, 46, { stroke: '#b9b19e', 'stroke-width': 1 });
      curve(function (x) { var u = (x - 12) / 34; return 46 - Math.exp(-u * u / 2) * 82; }, -130, 130, { stroke: c, 'stroke-width': 2.4 });
      curve(function (x) { var u = (x + 40) / 34; return 46 - Math.exp(-u * u / 2) * 82; }, -130, 130, { stroke: '#b9b19e', 'stroke-dasharray': '4 5' });
      [-38, -16, 0, 8, 20, 34, 58].forEach(function (x) { var u = (x - 12) / 34; line(x, 46, x, 46 - Math.exp(-u * u / 2) * 82, { stroke: ink, 'stroke-width': 1, 'stroke-dasharray': '2 3' }); dot(x, 46, 3.6); });
    } else if (id === 'info') {
      line(-110, 50, 110, 50, { stroke: '#b9b19e', 'stroke-width': 1 }); line(-110, 50, -110, -60, { stroke: '#b9b19e', 'stroke-width': 1 });
      curve(function (x) { var p = Math.min(.999, Math.max(.001, (x + 110) / 220)); return 50 - (-(p * Math.log2(p) + (1 - p) * Math.log2(1 - p))) * 100; }, -110, 110, { stroke: c, 'stroke-width': 2.4 });
      line(0, 50, 0, -50, { stroke: ink, 'stroke-dasharray': '3 4', 'stroke-width': 1.2 }); dot(0, -50, 4, ink);
    } else if (id === 'optimisation') {
      for (i = 1; i <= 5; i++) ell(i * 26, i * 11, 0, { stroke: i === 5 ? '#b9b19e' : ink, 'stroke-opacity': 1 - i * .12 });
      var zz = [[-118, -40], [-92, 30], [-64, -22], [-44, 15], [-26, -8], [-12, 4], [0, 0]];
      M4.svg('polyline', { points: zz.map(function (q) { return P(q[0], q[1]); }).join(' '), stroke: c, 'stroke-width': 2 }, gg);
      zz.forEach(function (q, j) { dot(q[0], q[1], j === zz.length - 1 ? 4.5 : 3, c); });
    } else if (id === 'optimizers') {
      for (i = 1; i <= 5; i++) ell(i * 26, i * 11, 0, { stroke: i === 5 ? '#b9b19e' : ink, 'stroke-opacity': 1 - i * .12 });
      M4.svg('polyline', { points: [[-118, -40], [-92, 30], [-64, -22], [-44, 15], [-26, -8], [-12, 4], [0, 0]].map(function (q) { return P(q[0], q[1]); }).join(' '), stroke: '#b9b19e', 'stroke-width': 1.4, 'stroke-dasharray': '3 4' }, gg);
      M4.svg('path', { d: 'M' + P(-118, -40) + ' C' + P(-80, -26) + ' ' + P(-40, -6) + ' ' + P(0, 0), stroke: c, 'stroke-width': 2.6 }, gg);
      dot(-118, -40, 4, ink); dot(0, 0, 4.5, c);
    } else if (id === 'generalisation') {
      var gsm = function (x) { return -32 * Math.sin(x / 38); };
      var gpts = [[-110, 4], [-88, 26], [-64, 40], [-40, 14], [-18, 24], [6, -14], [28, -10], [52, -44], [76, -24], [100, -36]];
      curve(function (x) { var y = gsm(x); gpts.forEach(function (q) { y += (q[1] - gsm(q[0])) * Math.exp(-Math.pow((x - q[0]) / 9, 2)); }); return y; }, -118, 108, { stroke: '#b9b19e', 'stroke-width': 1.4, 'stroke-dasharray': '3 4' });
      curve(gsm, -125, 115, { stroke: c, 'stroke-width': 2.6 });
      gpts.forEach(function (q) { dot(q[0], q[1], 4, ink); });
    } else if (id === 'nn') {
      var L1 = [-48, -16, 16, 48], L2 = [-32, 0, 32], X0 = -90, X1 = 0, X2 = 90;
      L1.forEach(function (a) { L2.forEach(function (b) { line(X0, a, X1, b, { stroke: '#b9b19e', 'stroke-width': 1 }); }); });
      L2.forEach(function (b) { line(X1, b, X2, 0, { stroke: c, 'stroke-width': 1.4, 'stroke-opacity': .7 }); });
      L1.forEach(function (a) { ring(X0, a, 8, { stroke: ink }); }); L2.forEach(function (b) { ring(X1, b, 9, { stroke: c, 'stroke-width': 2 }); }); ring(X2, 0, 10, { stroke: ink, 'stroke-width': 2 });
    } else if (id === 'backprop') {
      var nodes = [[-100, -30], [-100, 30], [-20, 0], [60, 0], [120, 0]];
      [[0, 2], [1, 2], [2, 3], [3, 4]].forEach(function (e) { var a = nodes[e[0]], b = nodes[e[1]]; arrow(a[0] + 12, a[1] * .8, b[0] - 13, b[1], ink, 1.4); });
      [[4, 3], [3, 2], [2, 0]].forEach(function (e) { var a = nodes[e[0]], b = nodes[e[1]]; M4.svg('path', { d: 'M' + P(a[0] - 8, a[1] + 14) + ' Q' + P((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 46) + ' ' + P(b[0] + 6, b[1] + 15), stroke: c, 'stroke-width': 1.8, 'stroke-dasharray': '4 4' }, gg); });
      nodes.forEach(function (q, j) { ring(q[0], q[1], j === 4 ? 13 : 11, { stroke: j === 4 ? c : ink, 'stroke-width': j === 4 ? 2.2 : 1.6 }); });
    } else if (id === 'norm') {
      M4.svg('rect', { x: cx - 34 * k, y: cy - 4 * k, width: 68 * k, height: 44 * k, rx: 4 * k, fill: C.paper, stroke: ink, 'stroke-width': 1.6 }, gg);
      line(-14, 10, 14, 10, { stroke: '#b9b19e', 'stroke-width': 1 }); line(-14, 22, 14, 22, { stroke: '#b9b19e', 'stroke-width': 1 });
      arrow(-120, 18, -38, 18, ink, 1.8); arrow(38, 18, 76, 18, ink, 1.8);
      M4.svg('path', { d: 'M' + P(-80, 18) + ' C' + P(-80, -66) + ' ' + P(92, -66) + ' ' + P(92, 4), stroke: c, 'stroke-width': 2.4 }, gg);
      M4.svg('polygon', { points: [P(92, 6), P(85, -6), P(99, -6)].join(' '), fill: c, stroke: 'none' }, gg);
      ring(92, 18, 12, { stroke: c, 'stroke-width': 2.2 }); line(86, 18, 98, 18, { stroke: c, 'stroke-width': 2 }); line(92, 12, 92, 24, { stroke: c, 'stroke-width': 2 });
      arrow(104, 18, 128, 18, ink, 1.8);
    } else if (id === 'training') {
      line(-120, 52, 125, 52, { stroke: '#b9b19e', 'stroke-width': 1 }); line(-120, 52, -120, -66, { stroke: '#b9b19e', 'stroke-width': 1 });
      var tl = function (x) { var t = (x + 112) / 230; return -60 + 104 * (1 - Math.exp(-t * 3.2)) + 5 * Math.sin(x / 5) * Math.exp(-t * 2); };
      var vl = function (x) { var t = (x + 112) / 230; return -54 + 92 * (1 - Math.exp(-t * 3.6)) - 70 * t * t; };
      curve(tl, -112, 118, { stroke: c, 'stroke-width': 2.4 });
      curve(vl, -112, 118, { stroke: ink, 'stroke-width': 1.4, 'stroke-dasharray': '4 4' });
      var vx = -112 + 230 * 0.455; line(vx, vl(vx), vx, 52, { stroke: '#8a8373', 'stroke-width': 1, 'stroke-dasharray': '2 3' }); dot(vx, vl(vx), 4.5, ink);
    } else if (id === 'language') {
      var lw = [[-96, 40, .9], [-48, 40, .25], [0, 40, .5], [48, 40, .15], [96, 40, 1]];
      lw.forEach(function (q) { line(q[0], q[1] - 10, 0, -38, { stroke: c, 'stroke-width': 1 + 3 * q[2], 'stroke-opacity': .3 + .7 * q[2] }); });
      lw.forEach(function (q) { M4.svg('rect', { x: cx + (q[0] - 16) * k, y: cy + (q[1] - 10) * k, width: 32 * k, height: 20 * k, rx: 4 * k, fill: C.paper, stroke: ink, 'stroke-width': 1.4 }, gg); });
      ring(0, -46, 10, { stroke: c, 'stroke-width': 2.4 });
    } else { axes(120, 60); arrow(0, 0, 80, -40, c, 2.6); }
    return s;
  }

  function ring(parent, frac, color, label) {
    var r = 19, L = 2 * Math.PI * r;
    var wrap = M4.el('div', { class: 'm4-ring' }, parent);
    var s = M4.svg('svg', { width: 48, height: 48, viewBox: '0 0 48 48' }, wrap);
    M4.svg('circle', { cx: 24, cy: 24, r: r, fill: 'none', stroke: C.line, 'stroke-width': 5 }, s);
    var fg = M4.svg('circle', { class: 'fg', cx: 24, cy: 24, r: r, fill: 'none', stroke: color, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-dasharray': L, 'stroke-dashoffset': L, transform: 'rotate(-90 24 24)' }, s);
    requestAnimationFrame(function () { requestAnimationFrame(function () { fg.setAttribute('stroke-dashoffset', L * (1 - frac)); }); });
    M4.el('span', { text: label }, wrap);
    return wrap;
  }

  /* ------------------------------------------------------------------ home */
  /* ------------------------------------------------------------------ home: almanac map */
  var UNIT_DEFS = [
    ['Linear algebra', ['vectors', 'matrices', 'eigen']],
    ['Calculus', ['functions', 'calculus', 'multivariable']],
    ['Probability', ['probability']],
    ['Learning from data', ['l1', 'mle', 'info']],
    ['Optimization', ['optimisation', 'optimizers', 'generalisation']],
    ['Neural networks', ['nn', 'backprop', 'norm', 'training']],
    ['Language', ['language']]
  ];
  var ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ'];
  function homeUnits() {
    var byId = {}; M4.modules.forEach(function (m) { byId[m.id] = m; });
    var seen = {}, units = UNIT_DEFS.map(function (d, k) {
      var mods = d[1].filter(function (id) { return byId[id]; }).map(function (id) { seen[id] = 1; return byId[id]; });
      return { k: k, name: d[0], mods: mods };
    }).filter(function (u) { return u.mods.length; });
    var rest = M4.modules.filter(function (m) { return !seen[m.id]; });
    if (rest.length) units.push({ k: units.length, name: 'More', mods: rest });
    units.forEach(function (u, k) { u.k = k; });
    return units;
  }
  function mapLayout(units, o) {
    var w = o.w, cx = w / 2, row = o.row, row1 = o.row1 || o.row, gap = o.gap, amp = o.amp, ug = o.unitGap;
    var pos = {}, edges = [], heads = [], y0 = o.top + ug, xs = [cx - gap, cx, cx + gap];
    var top = units.slice(0, 3), maxN = Math.max.apply(null, top.map(function (u) { return u.mods.length; }));
    top.forEach(function (u, b) {
      heads.push({ u: u, x: xs[b], y: y0 - ug * .7 });
      var off = (maxN - u.mods.length) / 2;
      u.mods.forEach(function (m, j) { pos[m.id] = { x: xs[b], y: y0 + (j + off) * row1, u: u }; if (j) edges.push([u.mods[j - 1].id, m.id]); });
    });
    var y = y0 + maxN * row1 + ug * .4 - row1, k = 0, prev = null;
    var lasts = top.map(function (u) { return u.mods[u.mods.length - 1].id; });
    for (var b = 3; b < units.length; b++) {
      var u = units[b]; y += row * .7 + ug; heads.push({ u: u, x: cx, y: y - ug * .75 }); y += 24;
      u.mods.forEach(function (m) {
        pos[m.id] = { x: cx + amp * Math.sin(k * Math.PI / 2.5), y: y, u: u };
        if (prev) edges.push([prev, m.id]); else lasts.forEach(function (l) { edges.push([l, m.id]); });
        prev = m.id; k++; y += row;
      });
      y -= row * .45;
    }
    return { pos: pos, edges: edges, heads: heads, h: y + 60 };
  }
  function mapCurve(a, b) { var my = (a.y + b.y) / 2; return 'M' + a.x + ' ' + a.y + ' C' + a.x + ' ' + my + ' ' + b.x + ' ' + my + ' ' + b.x + ' ' + b.y; }

  function renderHome() {
    document.title = 'Machine Learning Crash Course';
    app.innerHTML = '';
    topBar(app);
    var units = homeUnits(), order = [];
    units.forEach(function (u) { u.mods.forEach(function (m) { order.push(m); }); });

    var cont = S.last && M4.lessons[S.last] && !S.done[S.last] ? S.last : null;
    if (!cont) { for (var i = 0; i < order.length && !cont; i++) cont = nextLessonOf(order[i]); }
    var curMod = cont ? moduleOf(cont) : null;

    var wrap = M4.el('main', { class: 'm4-alm' }, app);
    var side = M4.el('aside', { class: 'm4-alm-side' }, wrap);
    M4.el('h1', { html: 'The mathematics behind <em>machine learning</em>' }, side);
    var intro = M4.el('div', { class: 'm4-intro' }, side);
    [
      'Hi, I’m Filipe! This little course is intended as supplementary material for my “Machine Learning Crash Course” as part of the “Deep Learning and NLP” course from Prof. Alan Akbik at Humboldt University Berlin (Winter Semester 2026/2027).',
      'You can freshen up your knowledge on the mathematical foundation of ML (Linear Algebra, Multivariate Calculus, and Probability), and additionally there are modules for each of my lecture topics (ML basics, Maximum Likelihood Estimation, Information Theory, Gradient Descent and advanced optimizers, Neural Networks, and Back Propagation).',
      'Hope this helps! If you have feedback or questions, feel free to text me at <span class="m4-mail">filipe dot laitenberger at hu-berlin dot de</span>, and if you like this course please consider giving a <a href="https://github.com/Thiggel/NLPandDL" target="_blank" rel="noopener">GitHub star</a>.',
      '-Filipe'
    ].forEach(function (h, i, arr) { M4.el('p', { html: h, class: i === arr.length - 1 ? 'm4-sign' : '' }, intro); });

    if (cont) {
      var L = M4.lessons[cont], now = M4.el('div', { class: 'm4-now' }, side);
      M4.el('h2', { text: L.title }, now);
      M4.el('a', { class: 'm4-cta', href: '#/l/' + cont, text: (S.xp ? 'Continue' : 'Start') + ' →' }, now);
    }

    var main = M4.el('div', { class: 'm4-alm-main' }, wrap);
    var map = M4.el('div', { class: 'm4-map' }, main);

    function draw() {
      var W = Math.min(860, map.clientWidth || main.clientWidth), narrow = W < 760;
      var LY = mapLayout(units, { w: W, top: 30, row: narrow ? 190 : 150, row1: 190, gap: Math.min(240, W / 3.3), amp: narrow ? 0 : 90, unitGap: 110 });
      map.innerHTML = ''; map.style.height = LY.h + 'px';
      var sv = M4.svg('svg', { class: 'edges', width: W, height: LY.h }, map);
      LY.edges.forEach(function (e) {
        var a = LY.pos[e[0]], b = LY.pos[e[1]], src = order.filter(function (m) { return m.id === e[0]; })[0];
        var done = src && modStats(src).done === modStats(src).total;
        M4.svg('path', { d: mapCurve(a, b), fill: 'none', stroke: C.ink, 'stroke-width': 1.5, 'stroke-dasharray': done ? '' : '3 6', 'stroke-linecap': 'round' }, sv);
      });
      LY.heads.forEach(function (h) {
        M4.el('div', { class: 'm4-uh', style: 'left:' + h.x + 'px;top:' + h.y + 'px', html: '<small>PART ' + (ROMAN[h.u.k] || h.u.k + 1) + '</small>' + h.u.name }, map);
      });
      order.forEach(function (m, idx) {
        var p = LY.pos[m.id], st = modStats(m);
        var state = st.total && st.done === st.total ? 'done' : m === curMod ? 'current' : st.done ? 'started' : 'new';
        var below = p.u.k < 3 || narrow, side2 = below ? 'below' : (p.x >= W / 2 + 10 ? 'left' : '');
        var a = M4.el('a', { class: 'm4-mn ' + state, href: '#/m/' + m.id, style: 'left:' + p.x + 'px;top:' + p.y + 'px' }, map);
        var disc = M4.el('span', { class: 'm4-disc' }, a);
        disc.appendChild(art(m, 156, 156));
        if (state === 'done') M4.el('span', { class: 'm4-check', html: '<svg width="14" height="14" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' }, a);
        var status = (st.done || state === 'current') ? st.done + '/' + st.total : st.total + (st.total === 1 ? ' lesson' : ' lessons');
        var lb = M4.el('span', { class: 'm4-lbl ' + side2 }, a);
        M4.el('b', { text: m.title }, lb);
        M4.el('span', { class: 'm4-kick', text: status }, lb);
      });
    }
    draw();
    var t = null;
    homeResize = function () { clearTimeout(t); t = setTimeout(draw, 80); };
    window.addEventListener('resize', homeResize);

    var foot = M4.el('footer', { class: 'm4-foot m4-alm-foot' }, main);
    M4.el('span', { html: 'Made with ❤️ by <a href="https://thiggel.github.io" target="_blank" rel="noopener">Filipe Laitenberger</a>' }, foot);
    var rs = M4.el('a', { href: '#/', text: 'Reset progress' }, foot);
    rs.addEventListener('click', function (e) { e.preventDefault(); if (confirm('Reset all progress, XP and streak?')) M4.resetProgress(); });
  }

  /* ------------------------------------------------------------------ module page */
  function renderModule(id) {
    var m = null;
    M4.modules.forEach(function (x) { if (x.id === id) m = x; });
    app.innerHTML = '';
    topBar(app);
    var page = M4.el('main', { class: 'm4-page' }, app);
    if (!m) { notFound(page); return; }
    document.title = m.title + ' · Machine Learning Crash Course';
    var c = col(m.color);
    M4.el('a', { class: 'm4-back', href: '#/', html: ICON.back + 'All modules' }, page);
    var head = M4.el('section', { class: 'm4-mhead' }, page);
    var hin = M4.el('div', { class: 'm4-mhead-in' }, head);
    var st = modStats(m);
    M4.el('h1', { text: m.title }, hin);
    M4.el('p', { text: m.blurb }, hin);
    head.appendChild(art(m, 520, 300, 'bgart'));

    var path = M4.el('div', { class: 'm4-path' }, page);
    path.style.setProperty('--mc', '#1d1b17');
    path.style.setProperty('--mcd', '#1d1b17');
    path.style.setProperty('--mcp', 'rgba(182,71,43,.14)');
    c = '#b6472b';
    var nxt = nextLessonOf(m);
    m.lessons.forEach(function (lid, i) {
      var L = M4.lessons[lid];
      var state = !L ? 'soon' : S.done[lid] ? 'done' : lid === nxt ? 'next' : '';
      var row = M4.el(L ? 'a' : 'div', { class: 'm4-node-row ' + state }, path);
      if (L) row.setAttribute('href', '#/l/' + lid);
      var rail = M4.el('div', { class: 'm4-node-rail' }, row);
      var node = M4.el('div', { class: 'm4-node', html: state === 'done' ? '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#f1ead9" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '<span>' + (i + 1) + '</span>' }, rail);
      if (state !== 'done') inkCenter(node);
      var card = M4.el('div', { class: 'm4-node-card' }, row);
      M4.el('h3', { text: L ? L.title : 'Session ' + (i + 1) }, card);
      M4.el('p', { text: L ? (L.summary || '') : 'In preparation.' }, card);
      var meta = M4.el('div', { class: 'm4-node-meta' }, card);
      if (L) {
        var nEx = L.steps.filter(function (s) { return s.kind === 'exercise'; }).length;
        M4.el('span', { class: 'm4-chip', text: (L.minutes || Math.max(5, L.steps.length)) + ' min' }, meta);
        M4.el('span', { class: 'm4-chip', text: L.steps.length + ' steps' }, meta);
        if (L.drill) M4.el('span', { class: 'm4-chip', text: 'Endless practice', style: 'border-color:' + c + ';color:' + c }, meta);
        else if (nEx) M4.el('span', { class: 'm4-chip', text: nEx + ' exercises' }, meta);
        if (state === 'done') M4.el('span', { class: 'm4-chip', text: 'Complete', style: 'border-color:' + c + ';color:' + c }, meta);
        if (state === 'next') M4.el('span', { class: 'm4-chip', text: 'Up next', style: 'border-color:' + c + ';color:' + c }, meta);
      }
    });
  }

  /* Centre a number on the ink of its glyphs. Digits in the serif font sit
     low and italic ones lean right, so flex centring alone looks off. */
  var inkCtx = null;
  function inkCenter(box) {
    var sp = box.firstChild;
    function fit() {
      if (!sp.isConnected) return;
      sp.style.transform = '';
      var cs = getComputedStyle(sp);
      inkCtx = inkCtx || document.createElement('canvas').getContext('2d');
      inkCtx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var m = inkCtx.measureText(sp.textContent);
      if (!m.actualBoundingBoxAscent) return;
      var r = sp.getBoundingClientRect(), b = box.getBoundingClientRect();
      var fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
      var base = r.top + (fa && fd ? (r.height - fa - fd) / 2 + fa : r.height * 0.8);
      var cy = base - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      var cx = r.left + (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
      var dx = (b.left + b.width / 2) - cx, dy = (b.top + b.height / 2) - cy;
      sp.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px)';
    }
    requestAnimationFrame(fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }

  function notFound(page) {
    var e = M4.el('div', { class: 'm4-empty' }, page);
    M4.el('h1', { text: 'Nothing here' }, e);
    M4.el('p', { html: 'This page does not exist. <a href="#/">Back to all modules</a>.' }, e);
  }

  /* ------------------------------------------------------------------ lesson player */
  var player = null;
  function renderLesson(id, startAt) {
    var L = M4.lessons[id];
    if (!L) { app.innerHTML = ''; topBar(app); notFound(M4.el('main', { class: 'm4-page' }, app)); return; }
    var m = moduleOf(id);
    var c = m ? col(m.color) : C.blue;
    document.title = L.title + ' · Machine Learning Crash Course';
    S.last = id; save();
    app.innerHTML = '';
    var root = M4.el('div', { class: 'm4-player' }, app);
    root.style.setProperty('--pc', c);
    var ptop = M4.el('div', { class: 'm4-ptop' }, root);
    var close = M4.el('button', { class: 'm4-close', type: 'button', title: 'Leave lesson', 'aria-label': 'Leave lesson', html: ICON.close }, ptop);
    close.addEventListener('click', function () { location.hash = m ? '#/m/' + m.id : '#/'; });
    var segs = M4.el('div', { class: 'm4-segs' }, ptop);
    if (M4.feedbackButton) M4.feedbackButton(ptop);
    var xpStat = M4.el('span', { class: 'm4-stat', html: ICON.bolt + '<span>' + S.xp + '</span>' }, ptop);
    var body = M4.el('div', { class: 'm4-pbody' }, root);
    var stage = M4.el('div', { class: 'm4-stage' }, body);
    var pbar = M4.el('div', { class: 'm4-pbar' }, root);
    var pin = M4.el('div', { class: 'm4-pbar-in' }, pbar);
    var backBtn = M4.button(pin, ICON.back + 'Back', function () { go(cur - 1); }, { ghost: true });
    var hintBtn = M4.button(pin, ICON.bulb + 'Hint', null, { ghost: true });
    M4.el('div', { class: 'spacer' }, pin);
    var contBtn = M4.button(pin, 'Continue', function () { advance(); }, { primary: true });
    contBtn.classList.add('cont');

    var n = L.steps.length;
    var reached = L.free ? n - 1 : 0, cur = 0, cleanups = [], stepSolved = {}, sessionXp = 0, sessionSolved = 0, finished = false;
    var segEls = L.steps.map(function (s, i) {
      var b = M4.el('button', { class: 'm4-seg', type: 'button', title: s.title || 'Step ' + (i + 1) }, segs);
      M4.el('i', {}, b);
      b.addEventListener('click', function () { if (i <= reached) go(i); });
      return b;
    });

    function bumpXp(amount) {
      S.xp += amount; sessionXp += amount; save();
      var sp = xpStat.querySelector('span'); sp.textContent = S.xp;
      xpStat.classList.remove('m4-bump'); void xpStat.offsetWidth; xpStat.classList.add('m4-bump');
    }
    function runCleanups() { cleanups.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); cleanups = []; }
    function updateSegs() {
      segEls.forEach(function (b, i) {
        b.classList.toggle('on', i < cur || (i === cur && canContinue()) || (finished));
        b.classList.toggle('cur', i === cur && !canContinue() && !finished);
        b.classList.toggle('reach', i <= reached);
      });
    }
    function canContinue() {
      var s = L.steps[cur];
      return !s || L.free || s.kind !== 'exercise' || !!stepSolved[cur] || !!S.solved[id + ':' + cur];
    }
    function updateBar() {
      backBtn.style.visibility = cur > 0 && !finished ? 'visible' : 'hidden';
      var s = L.steps[cur];
      hintBtn.style.display = !finished && s && s.hint ? '' : 'none';
      var ok = canContinue();
      contBtn.disabled = !ok && !finished;
      contBtn.classList.toggle('success', ok && s && s.kind === 'exercise' && !finished);
      contBtn.classList.toggle('primary', !(ok && s && s.kind === 'exercise') || finished);
      contBtn.innerHTML = finished ? 'Back to module' : (cur === n - 1 ? 'Finish' : (!ok ? 'Solve to continue' : 'Continue'));
      updateSegs();
    }

    function go(i, dir) {
      if (i < 0 || i >= n) return;
      dir = dir || (i >= cur ? 'r' : 'l');
      runCleanups();
      cur = i; finished = false;
      M4.where = { lesson: id, step: i };
      if (cur > reached) reached = cur;
      stage.innerHTML = '';
      body.scrollTop = 0;
      var s = L.steps[i];
      var kind = s.kind || 'text';
      var step = M4.el('article', { class: 'm4-step in-' + dir }, stage);
      if (s.title) { var h = M4.el('h1', { html: s.title }, step); M4.typeset(h); }
      if (s.html) { var pr = M4.el('div', { class: 'm4-prose', html: s.html }, step); M4.typeset(pr); }
      var hint = null;
      if (s.hint) { hint = M4.el('div', { class: 'm4-hintbox', html: '<b>Hint.</b> ' + s.hint }, step); M4.typeset(hint); }
      hintBtn.onclick = function () { if (hint) { hint.classList.toggle('show'); if (hint.classList.contains('show')) hint.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } };
      if (typeof s.mount === 'function') {
        var card = M4.el('div', { class: 'm4-wcard' + (S.solved[id + ':' + i] ? ' solved' : '') }, step);
        var widget = M4.el('div', { class: 'm4-widget' }, card);
        var noteLine = M4.el('div', { class: 'm4-noteline' }, card);
        var banner = M4.el('div', { class: 'm4-banner' }, card);
        var myIndex = i, alive = true;
        cleanups.push(function () { alive = false; });
        var ctx = {
          index: i, lesson: L,
          solved: function (msg) {
            if (!alive || stepSolved[myIndex]) return;
            stepSolved[myIndex] = true;
            var key = id + ':' + myIndex, first = !S.solved[key];
            banner.className = 'm4-banner ok';
            banner.innerHTML = '';
            M4.el('span', { class: 'm4-banner-ico', html: ICON.check }, banner);
            M4.el('span', { class: 'm4-banner-msg', html: '<b>Correct.</b>' + (msg ? ' ' + msg : '') }, banner);
            if (s.kind === 'exercise' && first) {
              S.solved[key] = true;
              touchStreak();
              sessionSolved++;
              M4.el('span', { class: 'm4-xpgain', text: '+10 XP' }, banner);
              bumpXp(10);
            } else if (s.kind === 'exercise') {
              sessionSolved++;
            }
            card.classList.add('solved');
            M4.typeset(banner);
            updateBar();
            setTimeout(function () { if (alive) banner.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
          },
          wrong: function (msg) {
            if (!alive) return;
            shake(widget);
            if (stepSolved[myIndex]) return;
            banner.className = 'm4-banner bad';
            banner.innerHTML = '';
            M4.el('span', { class: 'm4-banner-ico', html: ICON.x }, banner);
            M4.el('span', { class: 'm4-banner-msg', html: msg ? String(msg) : 'Not quite. Try again.' }, banner);
            M4.typeset(banner);
          },
          note: function (html) {
            if (!alive) return;
            noteLine.innerHTML = html == null ? '' : String(html);
            M4.typeset(noteLine);
          },
          onCleanup: function (fn) { if (typeof fn === 'function') cleanups.push(fn); },
          color: c
        };
        try { s.mount(widget, ctx); }
        catch (err) {
          console.error('[ML crash course] step ' + (i + 1) + ' of ' + id + ' failed to mount:', err);
          M4.el('div', { class: 'm4-err', text: 'This widget failed to load: ' + (err && err.message ? err.message : err) }, widget);
          stepSolved[i] = true;
        }
        M4.typeset(widget);
      }
      updateBar();
    }

    function advance() {
      if (finished) { location.hash = m ? '#/m/' + m.id : '#/'; return; }
      if (!canContinue()) { shake(contBtn); return; }
      if (cur < n - 1) go(cur + 1, 'r');
      else finish();
    }

    function finish() {
      runCleanups();
      var first = !S.done[id];
      var bonus = first ? 30 : 0;
      S.done[id] = true;
      touchStreak();
      if (bonus) bumpXp(bonus);
      save();
      finished = true;
      M4.where = { lesson: id, step: n - 1, done: true };
      reached = n - 1;
      stage.innerHTML = '';
      var d = M4.el('div', { class: 'm4-done m4-step in-r' }, stage);
      d.appendChild(trophy(c));
      M4.el('h1', { text: 'Session complete' }, d);
      M4.el('p', { text: L.title }, d);
      var stats = M4.el('div', { class: 'm4-done-stats' }, d);
      [[('+' + sessionXp), 'XP earned'], [String(L.steps.filter(function (s) { return s.kind === 'exercise'; }).length), 'Exercises'], [String(liveStreak() || 1), 'Day streak']].forEach(function (q, k) {
        var e = M4.el('div', { class: 'm4-done-stat', style: 'animation-delay:' + (0.35 + k * 0.12) + 's' }, stats);
        M4.el('b', { text: q[0] }, e); M4.el('span', { text: q[1] }, e);
      });
      if (m) {
        var nx = nextLessonOf(m);
        var row = M4.el('div', { class: 'm4-row', style: 'margin-top:14px' }, d);
        if (nx) M4.button(row, 'Next: ' + M4.lessons[nx].title, function () { location.hash = '#/l/' + nx; }, { primary: true });
        else M4.el('span', { class: 'm4-chip', text: 'Module complete: ' + m.title, style: 'border-color:' + c + ';color:' + c + ';font-size:16px;padding:8px 16px' }, row);
      }
      updateBar();
    }

    function onKey(e) {
      if (e.key !== 'Enter' || e.defaultPrevented) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'BUTTON' && t !== contBtn))) return;
      if (finished || canContinue()) { e.preventDefault(); advance(); }
    }
    document.addEventListener('keydown', onKey);
    player = { destroy: function () { runCleanups(); document.removeEventListener('keydown', onKey); } };
    go(Math.max(0, Math.min(n - 1, startAt || 0)), 'r');
  }

  function trophy(c) {
    var s = M4.svg('svg', { class: 'm4-trophy', viewBox: '0 0 280 200' });
    var g = M4.svg('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s);
    function draw(d, stroke, w, len, delay) {
      var p = M4.svg('path', { class: 'draw', d: d, stroke: stroke, 'stroke-width': w }, g);
      p.style.setProperty('--len', len); p.style.animationDelay = (delay || 0) + 's';
      return p;
    }
    draw('M140 30 a70 70 0 1 1 -0.1 0', C.ink, 1.6, 440, 0);
    draw('M108 102 l22 22 l44 -48', c, 4, 110, 0.55);
    // laurel strokes
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < 6; i++) {
        var an = Math.PI / 2 + side * (0.55 + i * 0.32), r = 84;
        var x = 140 + Math.cos(an) * r, y = 100 + Math.sin(an) * r;
        var tx = -Math.sin(an) * side, ty = Math.cos(an) * side;
        var leaf = M4.svg('path', { class: 'fade', d: 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' q' + (tx * 6 + Math.cos(an) * 8).toFixed(1) + ' ' + (ty * 6 + Math.sin(an) * 8).toFixed(1) + ' ' + (tx * 14).toFixed(1) + ' ' + (ty * 14).toFixed(1), stroke: c, 'stroke-width': 1.6, 'stroke-opacity': .8 }, g);
        leaf.style.animationDelay = (0.9 + i * 0.07) + 's';
      }
    }
    return s;
  }

  /* ------------------------------------------------------------------ router */
  var homeResize = null;
  function route() {
    if (player) { player.destroy(); player = null; }
    if (homeResize) { window.removeEventListener('resize', homeResize); homeResize = null; }
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/');
    window.scrollTo(0, 0);
    try {
      if (parts[0] === 'm' && parts[1]) renderModule(decodeURIComponent(parts[1]));
      else if (parts[0] === 'l' && parts[1]) renderLesson(decodeURIComponent(parts[1]), parts[2] ? (+parts[2] - 1) : 0);
      else renderHome();
    } catch (err) {
      console.error(err);
      app.innerHTML = '';
      M4.el('div', { class: 'm4-err', text: 'Something went wrong: ' + (err && err.message) }, app);
    }
  }
  M4.route = route;

  function boot() {
    app = document.getElementById('app') || M4.el('div', { id: 'app' }, document.body);
    window.addEventListener('hashchange', route);
    route();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);
})();
