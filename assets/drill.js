/* Drill engine: endless generated problems with worked solutions, plus computational graph drawing.
   M4.drill(parent, ctx, {gen, n, key}) where gen() returns a problem:
     { q, figure(el)?, fields:[...]?, options:[...]?, answer?, solution: html | fn(el), cols? }
   field: {label, answer, tol?} | {label, answer:[...] or [[...]]} | {label, select:[...], answer:i} | {group:'...'} */
(function () {
  'use strict';
  var C = M4.colors;
  var D = M4.D = {};

  /* ---------------------------------------------------------------- numbers and TeX */
  D.r = function (v, d) { d = d == null ? 3 : d; var k = Math.pow(10, d); var x = Math.round(v * k) / k; return x === 0 ? 0 : x; };
  D.t = function (v, d) { return String(D.r(v, d)); };
  D.pt = function (v, d) { var x = D.r(v, d); return x < 0 ? '(' + x + ')' : String(x); };
  D.T = function (s) { return '\\(' + s + '\\)'; };
  D.TT = function (s) { return '\\[' + s + '\\]'; };
  D.mat = function (A, d) { return '\\begin{bmatrix}' + A.map(function (r) { return r.map(function (v) { return typeof v === 'string' ? v : D.t(v, d); }).join(' & '); }).join(' \\\\ ') + '\\end{bmatrix}'; };
  D.vec = function (v, d) { return D.mat(v.map(function (x) { return [x]; }), d); };
  D.rowv = function (v, d) { return D.mat([v], d); };
  D.mv = function (A, x) { return A.map(function (r) { return r.reduce(function (s, a, j) { return s + a * x[j]; }, 0); }); };
  D.mm = function (A, B) { return A.map(function (r) { return B[0].map(function (_, j) { return r.reduce(function (s, a, k) { return s + a * B[k][j]; }, 0); }); }); };
  D.tr = function (A) { return A[0].map(function (_, j) { return A.map(function (r) { return r[j]; }); }); };
  D.outer = function (u, v) { return u.map(function (a) { return v.map(function (b) { return a * b; }); }); };
  D.dot = function (u, v) { return u.reduce(function (s, a, i) { return s + a * v[i]; }, 0); };
  D.add = function (u, v) { return u.map(function (a, i) { return a + v[i]; }); };
  D.sub = function (u, v) { return u.map(function (a, i) { return a - v[i]; }); };
  D.scale = function (u, c) { return u.map(function (a) { return a * c; }); };
  D.sig = function (z) { return 1 / (1 + Math.exp(-z)); };
  D.softmax = function (z) { var m = Math.max.apply(null, z), e = z.map(function (v) { return Math.exp(v - m); }), s = e.reduce(function (a, b) { return a + b; }, 0); return e.map(function (v) { return v / s; }); };
  D.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  D.randVec = function (n, a, b, nz) { var v = []; for (var i = 0; i < n; i++) v.push(nz ? M4.randNZ(a, b) : M4.rand(a, b)); return v; };
  D.randMat = function (m, n, a, b, nz) { var A = []; for (var i = 0; i < m; i++) A.push(D.randVec(n, a, b, nz)); return A; };
  D.mean = function (v) { return v.reduce(function (s, a) { return s + a; }, 0) / v.length; };
  // TeX name to plain unicode for SVG labels
  var SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', 'i': 'ᵢ', 'k': 'ₖ' };
  D.uni = function (s) {
    s = String(s).replace(/\\hat\s*\{?y\}?/g, 'ŷ').replace(/\\hat\s*\{?x\}?/g, 'x̂').replace(/\\sigma/g, 'σ').replace(/\\mu/g, 'μ').replace(/\\gamma/g, 'γ').replace(/\\beta/g, 'β').replace(/\\delta/g, 'δ').replace(/\\lambda/g, 'λ').replace(/\\alpha/g, 'α').replace(/\\epsilon/g, 'ε').replace(/\\eta/g, 'η');
    s = s.replace(/_\{?([0-9ik])\}?/g, function (_, c) { return SUB[c]; });
    s = s.replace(/\\mathbf\{(\w)\}/g, '$1').replace(/[{}\\]/g, '');
    return s.replace(/-/g, '−');
  };
  D.num = function (v, d) { return String(D.r(v, d == null ? 2 : d)).replace('-', '−'); };

  /* ---------------------------------------------------------------- progress counter */
  function counts() { try { return JSON.parse(localStorage.getItem('m4drill') || '{}'); } catch (e) { return {}; } }
  function bump(key) { var c = counts(); c[key] = (c[key] || 0) + 1; try { localStorage.setItem('m4drill', JSON.stringify(c)); } catch (e) { /* ignore */ } return c[key]; }
  D.count = function (key) { return counts()[key] || 0; };

  function parse(s) {
    s = String(s).trim().replace(/−/g, '-').replace(',', '.');
    if (/^-?\d*\.?\d+\s*\/\s*-?\d*\.?\d+$/.test(s)) { var p = s.split('/'); return +p[0] / +p[1]; }
    return s === '' ? NaN : Number(s);
  }
  function defTol(a) { return Math.max(0.011, 0.02 * Math.abs(a)); }

  /* ---------------------------------------------------------------- the drill widget */
  M4.drill = function (parent, ctx, o) {
    var need = o.n || 3, key = o.key || (ctx.lesson && ctx.lesson.id + ':' + ctx.index) || 'drill';
    var streak = 0, finished = false, prob = null, st = null, cells = [];
    var wrap = M4.el('div', { class: 'm4-drill' }, parent);
    var head = M4.el('div', { class: 'm4-drill-head' }, wrap);
    var dots = M4.el('div', { class: 'm4-gen-dots', title: need + ' solved on the first try' }, head);
    for (var i = 0; i < need; i++) M4.el('i', null, dots);
    var cnt = M4.el('div', { class: 'm4-drill-count' }, head);
    var q = M4.el('div', { class: 'm4-drill-q' }, wrap);
    var fig = M4.el('div', { class: 'm4-drill-fig' }, wrap);
    var area = M4.el('div', { class: 'm4-drill-area' }, wrap);
    var fb = M4.el('div', { class: 'm4-gen-fb' }, wrap);
    var ctrl = M4.el('div', { class: 'm4-row m4-drill-ctrl' }, wrap);
    var solBtn = M4.button(ctrl, 'Show solution', function () { toggleSol(); }, { ghost: true });
    var newBtn = M4.button(ctrl, 'Skip', function () { fresh(); }, { ghost: true });
    var chkBtn = M4.button(ctrl, 'Check', function () { if (st.done) fresh(); else check(); }, { primary: true });
    var sol = M4.el('div', { class: 'm4-drill-sol' }, wrap);

    function paintCount() { var c = D.count(key); cnt.textContent = c ? c + ' solved here so far' : ''; }
    function paintDots() { [].forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k < streak); }); }
    function say(cls, html) { fb.className = 'm4-gen-fb' + (cls ? ' ' + cls : ''); fb.innerHTML = html; M4.typeset(fb); }

    function finish() {
      st.done = true;
      var clean = st.first && !st.peeked;
      if (clean) streak++;
      bump(key); paintCount(); paintDots();
      var msg = clean ? M4.pick(['Correct.', 'Right.', 'All correct.', 'Exactly.']) : 'All boxes are right now. Only problems solved on the first try count toward the dots.';
      if (streak >= need && !finished) {
        finished = true;
        ctx.solved(need + ' solved. This level is done, and you can keep practicing here as long as you like.');
        msg += ' Level complete.';
      }
      say('ok', msg);
      chkBtn.textContent = 'Next problem'; newBtn.style.visibility = 'hidden';
      if (prob.after) { var a = M4.el('div', { class: 'm4-drill-after', html: prob.after }, fb); M4.typeset(a); }
    }
    function miss() {
      st.first = false;
    }
    function check() {
      var open = cells.filter(function (c) { return !c.locked; });
      if (open.some(function (c) { return c.kind === 'num' ? isNaN(parse(c.inp.value)) : c.inp.value === ''; })) {
        open.forEach(function (c) { var bad = c.kind === 'num' ? isNaN(parse(c.inp.value)) : c.inp.value === ''; c.box.classList.toggle('empty', bad); });
        M4.shake(area); say('', 'Fill in every box with a number first. Fractions like 3/4 work too.');
        return;
      }
      var all = true;
      open.forEach(function (c) {
        var ok;
        if (c.kind === 'num') { var v = parse(c.inp.value); ok = Math.abs(v - c.answer) <= c.tol + 1e-9; }
        else ok = +c.inp.value === c.answer;
        c.box.classList.remove('empty');
        if (ok) { c.locked = true; c.inp.disabled = true; c.box.classList.remove('wrong'); c.box.classList.add('right'); }
        else { all = false; c.box.classList.add('wrong'); }
      });
      if (all) finish();
      else {
        miss(); M4.shake(area);
        var nw = open.filter(function (c) { return c.box.classList.contains('wrong'); }).length;
        say('bad', (nw === 1 ? 'One box is' : nw + ' boxes are') + ' not right yet. Green boxes are locked in. Fix the red ones, or open the solution.');
        var first = cells.filter(function (c) { return !c.locked; })[0];
        if (first) try { first.inp.focus({ preventScroll: true }); first.inp.select && first.inp.select(); } catch (e) { /* ignore */ }
      }
    }
    function toggleSol() {
      if (sol.classList.contains('open')) { sol.classList.remove('open'); solBtn.textContent = 'Show solution'; return; }
      if (!st.done) st.peeked = true;
      sol.innerHTML = '';
      var inner = M4.el('div', { class: 'm4-drill-sol-in' }, sol);
      if (typeof prob.solution === 'function') prob.solution(inner); else inner.innerHTML = prob.solution || '';
      M4.typeset(inner);
      sol.classList.add('open'); solBtn.textContent = 'Hide solution';
    }
    function addCell(parentEl, answer, tol, kind, select) {
      var box = M4.el('span', { class: 'm4-cell' }, parentEl), inp;
      if (kind === 'sel') {
        inp = M4.el('select', {}, box);
        M4.el('option', { value: '', text: 'choose' }, inp);
        select.forEach(function (s, k) { M4.el('option', { value: String(k), text: s }, inp); });
        inp.addEventListener('change', function () { box.classList.remove('wrong', 'empty'); });
      } else {
        inp = M4.el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', placeholder: '?' }, box);
        inp.addEventListener('input', function () { box.classList.remove('wrong', 'empty'); });
      }
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (st.done) fresh(); else check(); } });
      var c = { box: box, inp: inp, answer: answer, tol: tol == null ? defTol(answer) : tol, kind: kind, locked: false };
      cells.push(c); return c;
    }
    function renderFields(fields) {
      // three or fewer plain answer boxes stack in one centered column so each label sits next to its own box
      var plain = fields.filter(function (f) { return !f.group && !Array.isArray(f.answer); }).length;
      var oneCol = prob.cols === 1 || (prob.cols !== 2 && plain <= 3 && plain === fields.filter(function (f) { return !f.group; }).length);
      var grid = M4.el('div', { class: 'm4-drill-fields' + (oneCol ? ' one' : '') + (prob.cols === 3 ? ' c3' : '') }, area);
      // a section (fields between two group headers) that holds a vector or matrix is laid out in one centered column
      var sec = 0, secWide = {};
      fields.forEach(function (f) { if (f.group) sec++; else if (Array.isArray(f.answer)) secWide[sec] = true; });
      sec = 0;
      fields.forEach(function (f) {
        if (f.group) sec++; else if (secWide[sec]) f = Object.assign({ wideRow: true }, f);
        if (f.group) { var g = M4.el('div', { class: 'm4-drill-group', html: f.group }, grid); M4.typeset(g); return; }
        var row = M4.el('div', { class: 'm4-drill-f' + (Array.isArray(f.answer) || f.wideRow ? ' wide' : '') }, grid);
        var lab = M4.el('label', { html: f.label }, row); M4.typeset(lab);
        if (f.select) { addCell(row, f.answer, null, 'sel', f.select); return; }
        if (!Array.isArray(f.answer)) { addCell(row, f.answer, f.tol != null ? f.tol : prob.tol, 'num'); return; }
        var A = Array.isArray(f.answer[0]) ? f.answer : f.answer.map(function (v) { return [v]; });
        var m = M4.el('span', { class: 'm4-mat' }, row);
        m.style.gridTemplateColumns = 'repeat(' + A[0].length + ', auto)';
        A.forEach(function (r) { r.forEach(function (v) { addCell(m, v, f.tol != null ? f.tol : prob.tol, 'num'); }); });
      });
    }
    function renderOptions() {
      var grid = M4.el('div', { class: 'm4-drill-opts' + (prob.optCols ? ' c' + prob.optCols : '') }, area);
      var keys = 'ABCDEF';
      prob.options.forEach(function (opt, k) {
        var b = M4.el('button', { type: 'button', class: 'm4-choice m4-drill-opt' }, grid);
        M4.el('span', { class: 'm4-choice-key', text: keys[k] }, b);
        var body = M4.el('span', { class: 'm4-choice-body' }, b);
        if (typeof opt === 'function') opt(body); else { body.innerHTML = opt; M4.typeset(body); }
        b.addEventListener('click', function () {
          if (st.done || b.classList.contains('wrong')) return;
          if (k === prob.answer) { b.classList.add('right'); grid.classList.add('locked'); finish(); }
          else { b.classList.add('wrong'); M4.shake(b); miss(); say('bad', 'Not this one. Try another option.'); }
        });
      });
    }
    function fresh() {
      prob = o.gen(); st = { done: false, first: true, peeked: false }; cells = [];
      q.innerHTML = prob.q || ''; fig.innerHTML = ''; area.innerHTML = ''; sol.innerHTML = ''; sol.classList.remove('open');
      solBtn.textContent = 'Show solution'; chkBtn.textContent = 'Check'; newBtn.style.visibility = '';
      say('', prob.hint ? '<i>' + prob.hint + '</i>' : '');
      if (prob.figure) prob.figure(fig);
      fig.style.display = prob.figure ? '' : 'none';
      if (prob.options) { renderOptions(); chkBtn.style.display = 'none'; }
      else { renderFields(prob.fields || []); chkBtn.style.display = ''; }
      M4.typeset(q); M4.typeset(fig);
      if (cells[0] && !o.noFocus) setTimeout(function () { try { cells[0].inp.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 30);
    }
    paintCount(); paintDots(); fresh();
    return { next: fresh };
  };

  /* helper: a text step that lists the levels of a drill lesson */
  D.levelList = function (id, levels, from) {
    from = from || 1;
    return '<ol class="m4-levels">' + levels.map(function (t, i) { return '<li><a href="#/l/' + id + '/' + (i + from) + '">' + t + '</a></li>'; }).join('') + '</ol>';
  };

  /* ---------------------------------------------------------------- expression engine */
  function P(s, p) { return { s: s, p: p }; }
  function wrapIf(x, cond) { return cond ? '\\left(' + x.s + '\\right)' : x.s; }
  var OPS = D.OPS = {
    add: { sym: '+', f: function (a, b) { return a + b; }, d: function (a, b) { return [1, 1]; }, tex: function (A, B) { return P(A.s + ' + ' + wrapIf(B, B.p <= 1), 1); }, ntex: function (a, b) { return a + ' + ' + b; }, dtex: function () { return '1'; } },
    sub: { sym: '−', f: function (a, b) { return a - b; }, d: function () { return [1, -1]; }, tex: function (A, B) { return P(A.s + ' - ' + wrapIf(B, B.p <= 1), 1); }, ntex: function (a, b) { return a + ' - ' + b; }, dtex: function (n, i) { return i ? '-1' : '1'; } },
    mul: { sym: '×', f: function (a, b) { return a * b; }, d: function (a, b) { return [b, a]; },
      tex: function (A, B, e) { var l = wrapIf(A, A.p < 2), r = wrapIf(B, B.p <= 2); var jux = e.a[0].c != null && (e.a[1].v != null || B.p === 9 || B.p === 3) && !/^-/.test(r); return P(l + (jux ? ' ' : ' \\cdot ') + r, 2); },
      ntex: function (a, b) { return a + ' \\cdot ' + b; }, dtex: function (n, i) { return n.args[1 - i].tname; } },
    max: { sym: 'max', f: function (a, b) { return Math.max(a, b); }, d: function (a, b) { return a >= b ? [1, 0] : [0, 1]; }, tex: function (A, B) { return P('\\max(' + A.s + ', ' + B.s + ')', 9); }, ntex: function (a, b) { return '\\max(' + a + ', ' + b + ')'; }, dtex: function (n, i) { return '[\\text{' + (i ? 'second' : 'first') + ' is larger}]'; } },
    sq: { sym: '( )²', f: function (a) { return a * a; }, d: function (a) { return [2 * a]; }, tex: function (A) { return P(wrapIf(A, A.p < 9) + '^2', 3); }, ntex: function (a) { return a + '^2'; }, dtex: function (n) { return '2' + n.args[0].tname; } },
    hsq: { sym: '½( )²', f: function (a) { return a * a / 2; }, d: function (a) { return [a]; }, tex: function (A) { return P('\\tfrac{1}{2}' + wrapIf(A, A.p < 9) + '^2', 2); }, ntex: function (a) { return '\\tfrac{1}{2}' + a + '^2'; }, dtex: function (n) { return n.args[0].tname; } },
    exp: { sym: 'exp', f: Math.exp, d: function (a) { return [Math.exp(a)]; }, tex: function (A) { return P('e^{' + A.s + '}', 3); }, ntex: function (a) { return 'e^{' + a + '}'; }, dtex: function (n) { return 'e^{' + n.args[0].tname + '}'; } },
    log: { sym: 'log', f: Math.log, d: function (a) { return [1 / a]; }, tex: function (A) { return P('\\log(' + A.s + ')', 9); }, ntex: function (a) { return '\\log ' + a; }, dtex: function (n) { return '1/' + n.args[0].tname; } },
    sig: { sym: 'σ', f: D.sig, d: function (a) { var s = D.sig(a); return [s * (1 - s)]; }, tex: function (A) { return P('\\sigma(' + A.s + ')', 9); }, ntex: function (a) { return '\\sigma(' + a + ')'; }, dtex: function (n) { return n.tname + '(1 - ' + n.tname + ')'; } },
    relu: { sym: 'ReLU', f: function (a) { return Math.max(0, a); }, d: function (a) { return [a > 0 ? 1 : 0]; }, tex: function (A) { return P('\\mathrm{ReLU}(' + A.s + ')', 9); }, ntex: function (a) { return '\\mathrm{ReLU}(' + a + ')'; }, dtex: function (n) { return '[' + n.args[0].tname + ' > 0]'; } },
    tanh: { sym: 'tanh', f: Math.tanh, d: function (a) { var t = Math.tanh(a); return [1 - t * t]; }, tex: function (A) { return P('\\tanh(' + A.s + ')', 9); }, ntex: function (a) { return '\\tanh(' + a + ')'; }, dtex: function (n) { return '1 - ' + n.tname + '^2'; } },
    inv: { sym: '1/( )', f: function (a) { return 1 / a; }, d: function (a) { return [-1 / (a * a)]; }, tex: function (A) { return P('\\frac{1}{' + A.s + '}', 9); }, ntex: function (a) { return '1/' + a; }, dtex: function (n) { return '-1/' + n.args[0].tname + '^2'; } }
  };
  D.V = function (name) { return { v: name }; };
  D.K = function (c) { return { c: c }; };
  D.op = function (op, args, name) { var e = { op: op, a: args }; if (name) e.name = name; return e; };

  D.tex = function (e) {
    function go(e) {
      if (e.v != null) return P(e.v, 9);
      if (e.c != null) return P(e.c < 0 ? '(' + e.c + ')' : String(e.c), 9);
      if (e.texAs) return P(e.texAs, 9);
      var o = OPS[e.op]; var args = e.a.map(go);
      if (!o) return P((e.sym || e.op) + '(' + args.map(function (a) { return a.s; }).join(', ') + ')', 9);
      return o.tex.apply(null, args.concat([e]));
    }
    return go(e).s;
  };

  var AUTO = ['a', 'c', 'd', 'g', 'h', 'k', 'm', 'n', 'p', 'q', 'r', 's', 'u', 'v'];
  D.graph = function (expr, vals, outName) {
    vals = vals || {};
    var seen = new Map(), nodes = [], vars = {};
    function visit(e) {
      if (seen.has(e)) return seen.get(e);
      var n;
      if (e.v != null) {
        if (vars[e.v]) { seen.set(e, vars[e.v]); return vars[e.v]; }
        n = { leaf: true, name: e.v, val: vals[e.v], args: [], users: [] }; vars[e.v] = n;
      } else if (e.c != null) {
        n = { leaf: true, konst: true, name: String(e.c), val: e.c, args: [], users: [] };
      } else {
        var args = e.a.map(visit);
        n = { op: e.op, sym: e.sym, name: e.name, args: args, users: [] };
        args.forEach(function (a) { a.users.push(n); });
      }
      seen.set(e, n); nodes.push(n); return n;
    }
    var out = visit(expr);
    if (!out.name) out.name = outName || expr.name || 'f';
    var used = {}; nodes.forEach(function (n) { if (n.name) used[n.name] = 1; });
    var ai = 0;
    nodes.forEach(function (n) { if (!n.leaf && !n.name) { while (used[AUTO[ai]]) ai++; n.name = AUTO[ai++] || ('t' + ai); used[n.name] = 1; } });
    nodes.forEach(function (n) { n.tname = n.konst && n.val < 0 ? '(' + n.name + ')' : n.name; });
    var computable = nodes.every(function (n) { return n.leaf ? n.val != null : !!OPS[n.op]; });
    if (computable) {
      nodes.forEach(function (n) { if (!n.leaf) n.val = OPS[n.op].f.apply(null, n.args.map(function (a) { return a.val; })); n.grad = 0; });
      out.grad = 1;
      for (var i = nodes.length - 1; i >= 0; i--) {
        var n = nodes[i]; if (n.leaf) continue;
        n.local = OPS[n.op].d.apply(null, n.args.map(function (a) { return a.val; }).concat([n.val]));
        n.args.forEach(function (a, k) { a.grad += n.grad * n.local[k]; });
      }
    }
    return { nodes: nodes, out: out, vars: vars, ops: nodes.filter(function (n) { return !n.leaf; }), computable: computable };
  };
  D.nodeTex = function (n) { var o = OPS[n.op]; var a = n.args.map(function (x) { return x.tname; }); return o ? o.ntex.apply(null, a) : (n.sym || n.op) + '(' + a.join(', ') + ')'; };
  D.dd = function (f, v) { return '\\partial ' + f + '/\\partial ' + v; };
  D.ddf = function (f, v) { return '\\frac{\\partial ' + f + '}{\\partial ' + v + '}'; };

  // worked solution: forward lines, backward lines, totals, annotated graph
  D.solveGraph = function (el, G, o) {
    o = o || {};
    var dp = o.d == null ? 3 : o.d, F = G.out.name;
    var h = '<p class="m4-drill-sh">Forward pass, left to right</p><div class="m4-drill-lines">';
    G.ops.forEach(function (n) {
      var nums = n.args.map(function (a) { return D.pt(a.val, dp); });
      var o2 = OPS[n.op]; var subst = o2.ntex.apply(null, nums);
      h += D.TT(n.name + ' = ' + D.nodeTex(n) + ' = ' + subst + ' = ' + D.t(n.val, dp));
    });
    h += '</div><p class="m4-drill-sh">Backward pass, right to left</p><div class="m4-drill-lines">';
    h += D.TT(D.ddf(F, F) + ' = 1');
    var acc = {};
    for (var i = G.ops.length - 1; i >= 0; i--) {
      var n = G.ops[i];
      n.args.forEach(function (a, k) {
        if (a.konst) return;
        var dt = OPS[n.op].dtex(n, k), plus = a.users.length > 1;
        var line = D.ddf(F, a.name) + (plus ? ' \\mathrel{+}= ' : ' = ') + D.ddf(F, n.name) + '\\cdot ' + D.ddf(n.name, a.name) + ' = ' + D.pt(n.grad, dp) + ' \\cdot ' + (/^[-\d.]+$/.test(dt) ? '' : dt + ' = ') + D.pt(n.local[k], dp);
        if (plus) { acc[a.name] = (acc[a.name] || 0) + n.grad * n.local[k]; line += ' \\quad(\\text{running total } {' + D.t(acc[a.name], dp) + '})'; }
        else line += ' = ' + D.t(n.grad * n.local[k], dp);
        h += D.TT(line);
      });
    }
    h += '</div>';
    var multi = G.nodes.filter(function (n) { return !n.konst && n.users.length > 1; });
    if (multi.length) h += '<p class="m4-cap">' + multi.map(function (n) { return D.T(n.name); }).join(' and ') + ' feed' + (multi.length === 1 ? 's' : '') + ' more than one gate, so the contributions from every outgoing wire add up.</p>';
    el.innerHTML = h;
    if (o.graph !== false) {
      var gbox = M4.el('div', { class: 'm4-drill-solfig' }, el);
      D.drawGraph(gbox, G, { vals: true, grads: true, numbers: true, d: o.gd || 2 });
      M4.el('p', { class: 'm4-cap', html: 'Above each wire the forward value, <b style="color:' + C.red + '">below it the gradient</b> of ' + D.T(F) + ' with respect to that value.' }, el);
    }
  };

  /* ---------------------------------------------------------------- graph drawing */
  var MID = 0;
  function sv(tag, attrs, parent) { return M4.svg(tag, attrs, parent); }
  function stxt(p, x, y, s, o) {
    o = o || {};
    var t = sv('text', { x: x, y: y, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': 'central', 'font-size': o.size || 18, 'font-weight': o.weight || 600, fill: o.fill || C.ink, 'font-style': o.italic ? 'italic' : 'normal' }, p);
    t.textContent = s; return t;
  }
  D.drawGraph = function (el, G, o) {
    o = o || {};
    var dp = o.d == null ? 2 : o.d;
    var nodes = G.nodes.slice(), ops = G.ops;
    // columns: op nodes by depth, leaves right before their first consumer
    ops.forEach(function (n) { n._c = 1 + Math.max.apply(null, n.args.map(function (a) { return a.leaf ? 0 : a._c; })); });
    nodes.forEach(function (n) { if (n.leaf) n._c = Math.min.apply(null, n.users.map(function (u) { return u._c; })) - 1; });
    var maxC = Math.max.apply(null, nodes.map(function (n) { return n._c; }));
    var cols = []; for (var c = 0; c <= maxC; c++) cols.push([]);
    nodes.forEach(function (n, i) { n._i = i; cols[n._c].push(n); });
    var gap = o.rowGap || 84;
    function place() { cols.forEach(function (col) { col.forEach(function (n, k) { n._y = (k - (col.length - 1) / 2) * gap; }); }); }
    function avg(arr, d) { return arr.length ? arr.reduce(function (s, a) { return s + a._y; }, 0) / arr.length : d; }
    place();
    for (var pass = 0; pass < 3; pass++) {
      for (c = 1; c <= maxC; c++) { cols[c].sort(function (a, b) { return avg(a.args, a._y) - avg(b.args, b._y); }); place(); }
      for (c = maxC - 1; c >= 0; c--) { cols[c].sort(function (a, b) { return avg(a.users, a._y) - avg(b.users, b._y); }); place(); }
    }
    var colW = o.colW || (maxC > 5 ? 128 : 150), left = 60, maxN = Math.max.apply(null, cols.map(function (c) { return c.length; }));
    var W = left + maxC * colW + 130, H = Math.max(150, maxN * gap + 50), cy = H / 2;
    nodes.forEach(function (n) { n._x = left + n._c * colW; n._yy = cy + n._y; });
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'm4-graph', role: 'img' }, el);
    svg.style.maxWidth = (o.maxW || W) + 'px';
    if (!o.maxW && W > 820) { svg.classList.add('wide'); svg.style.setProperty('--gw', Math.round(W * 0.92) + 'px'); el.classList.add('m4-gscroll'); }
    var mid = 'm4ar' + (++MID);
    var defs = sv('defs', {}, svg);
    var mk = sv('marker', { id: mid, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    sv('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#b9b19e' }, mk);
    var gE = sv('g', {}, svg), gL = sv('g', {}, svg), gN = sv('g', {}, svg);
    function lw(n) { if (!n.leaf) return 25; var s = n._lab || D.uni(n.name); return Math.max(24, s.length * 5.6 + 16); }
    nodes.forEach(function (n) { if (n.leaf) n._lab = D.uni(n.name) + (o.numbers && !n.konst && n.val != null ? ' = ' + D.num(n.val, dp) : ''); });
    // edges
    ops.forEach(function (n) {
      var cnt = {};
      n.args.forEach(function (a, k) {
        var x1 = a._x + lw(a), y1 = a._yy, x2 = n._x, y2 = n._yy;
        var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
        x2 -= dx / L * 28; y2 -= dy / L * 28;
        var dup = n.args.indexOf(a) !== k || n.args.lastIndexOf(a) !== k;
        var bend = dup ? (n.args.indexOf(a) === k ? -22 : 22) : 0;
        if (!dup && n._c - a._c > 1) {
          // a wire that skips columns: bend it around any node it would cross
          var hit = null;
          nodes.forEach(function (m) { if (m === a || m === n || m._c <= a._c || m._c >= n._c) return; var yl = y1 + (m._x - x1) / dx * dy; if (Math.abs(yl - m._yy) < 34) hit = m; });
          if (hit) { var yl2 = y1 + (hit._x - x1) / dx * dy; bend = (hit._yy >= yl2 ? -1 : 1) * Math.max(90, 2 * (52 - Math.abs(yl2 - hit._yy))); }
        }
        var mx = (x1 + x2) / 2 - dy / L * bend, my = (y1 + y2) / 2 + dx / L * bend;
        sv('path', { d: 'M' + x1 + ' ' + y1 + ' Q' + mx + ' ' + my + ' ' + x2 + ' ' + y2, fill: 'none', stroke: '#cfc8b8', 'stroke-width': 2.4, 'marker-end': 'url(#' + mid + ')' }, gE);
        var nx = -dy / L, ny = dx / L, t = 0.5;
        var lx = (1 - t) * (1 - t) * x1 + 2 * t * (1 - t) * mx + t * t * x2, ly = (1 - t) * (1 - t) * y1 + 2 * t * (1 - t) * my + t * t * y2;
        if (o.vals && a.val != null && !a.leaf) stxt(gL, lx + nx * -13, ly + ny * -13 - 2, D.num(a.val, dp), { size: 15, fill: C.ink, weight: 600 });
        if (o.grads && a.grad != null && !a.konst) stxt(gL, lx + nx * 14, ly + ny * 14 + 2, D.num(n.grad * n.local[k], dp), { size: 15, fill: C.red, weight: 700 });
      });
    });
    // output wire
    var out = G.out, ox = out._x + 28, oy = out._yy;
    sv('path', { d: 'M' + ox + ' ' + oy + ' L' + (ox + 52) + ' ' + oy, stroke: '#cfc8b8', 'stroke-width': 2.4, 'marker-end': 'url(#' + mid + ')' }, gE);
    stxt(gN, ox + 62, oy, D.uni(out.name) + (o.vals && out.val != null ? ' = ' + D.num(out.val, dp) : ''), { anchor: 'start', size: 20, weight: 700, italic: true });
    if (o.grads && out.grad != null) stxt(gL, ox + 26, oy + 16, '1', { size: 15, fill: C.red, weight: 700 });
    // nodes
    nodes.forEach(function (n, idx) {
      if (n.leaf) {
        var w = lw(n);
        sv('rect', { x: n._x - w, y: n._yy - 19, width: 2 * w, height: 38, rx: 10, fill: n.konst ? '#f6f3ec' : '#fff', stroke: n.konst ? '#d9d2c2' : C.ink, 'stroke-width': n.konst ? 1.5 : 2 }, gN);
        stxt(gN, n._x, n._yy, n._lab, { size: 17, weight: n.konst ? 500 : 700, italic: !n.konst && !o.numbers, fill: n.konst ? C.muted : C.ink });
        if (o.grads && n.grad != null && !n.konst && n.users.length > 1) stxt(gL, n._x, n._yy + 33, 'total ' + D.num(n.grad, dp), { size: 14, fill: C.red, weight: 700 });
      } else {
        var hl = o.highlight && o.highlight.indexOf(n) >= 0;
        sv('circle', { cx: n._x, cy: n._yy, r: 25, fill: hl ? '#fdf6e6' : '#fff', stroke: hl ? C.yellow : C.ink, 'stroke-width': 2.2 }, gN);
        var label = o.hideOps ? String(o.hideOps(n)) : (n.sym || OPS[n.op].sym);
        stxt(gN, n._x, n._yy + 1, label, { size: label.length > 3 ? 12.5 : label.length > 1 ? 15 : 22, weight: 700, fill: o.hideOps ? C.muted : C.ink });
        if (o.names !== false && n !== G.out) stxt(gN, n._x, n._yy - 36, D.uni(n.name), { size: 15, fill: C.muted, weight: 600, italic: true });
      }
    });
    return svg;
  };

  /* layered network picture, sizes like [3, 4, 2] */
  D.netDiagram = function (el, sizes, o) {
    o = o || {};
    var colW = o.colW || 150, gap = o.gap || 46, maxN = Math.max.apply(null, sizes);
    var W = (sizes.length - 1) * colW + 120, H = maxN * gap + (o.labels ? 64 : 30);
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'm4-graph', role: 'img' }, el);
    svg.style.maxWidth = (o.maxW || W) + 'px';
    if (!o.maxW && W > 820) { svg.classList.add('wide'); svg.style.setProperty('--gw', Math.round(W * 0.92) + 'px'); el.classList.add('m4-gscroll'); }
    var cy = (maxN * gap + 30) / 2, pos = sizes.map(function (n, l) { var a = []; for (var i = 0; i < n; i++) a.push([60 + l * colW, cy + (i - (n - 1) / 2) * gap]); return a; });
    var colors = o.colors || [C.blue, C.purple, C.purple, C.purple, C.green];
    for (var l = 0; l + 1 < sizes.length; l++) pos[l].forEach(function (p) { pos[l + 1].forEach(function (q) { sv('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: '#d9d2c2', 'stroke-width': 1.4 }, svg); }); });
    pos.forEach(function (col, l) {
      var c = l === 0 ? colors[0] : l === sizes.length - 1 ? colors[colors.length - 1] : colors[Math.min(l, colors.length - 2)];
      col.forEach(function (p) { sv('circle', { cx: p[0], cy: p[1], r: 14, fill: '#fff', stroke: c, 'stroke-width': 2.4 }, svg); });
      if (o.labels) stxt(svg, 60 + l * colW, H - 20, o.labels[l], { size: 17, fill: C.muted, italic: true });
    });
    return svg;
  };
})();
