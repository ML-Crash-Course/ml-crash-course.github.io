/* Reading and drawing computational graphs: formula to graph, graph to formula, counting gates, wires and paths. */
(function () {
  'use strict';
  var D = M4.D, C = M4.colors, V = D.V, K = D.K, op = D.op, T = D.T, TT = D.TT;
  var R = M4.rand, RN = M4.randNZ, pick = M4.pick;

  var UN = ['sq', 'relu', 'exp', 'sig', 'tanh'], BIN = ['add', 'mul', 'max'];
  var OPNAME = { add: 'plus', sub: 'minus', mul: 'times', max: 'max', sq: 'square', hsq: 'half square', relu: 'ReLU', exp: 'exp', sig: 'sigmoid', tanh: 'tanh', log: 'log', inv: 'reciprocal' };
  function arity(o) { return o === 'add' || o === 'sub' || o === 'mul' || o === 'max' ? 2 : 1; }

  /* ------------------------------------------------ expression helpers */
  function clone(e) {
    if (e.v != null) return V(e.v);
    if (e.c != null) return K(e.c);
    var c = op(e.op, e.a.map(clone)); if (e.name) c.name = e.name; return c;
  }
  // the graph does not show which wire is the first argument, so compare with sorted arguments
  function canon(e) {
    if (e.v != null) return e.v;
    if (e.c != null) return '#' + e.c;
    var a = e.a.map(canon); if (a.length > 1) a.sort();
    return e.op + '(' + a.join(',') + ')';
  }
  function inner(e, out) { out = out || []; if (e.op) { out.push(e); e.a.forEach(function (x) { inner(x, out); }); } return out; }
  function leaves(e, out) { out = out || []; if (e.op) e.a.forEach(function (x) { leaves(x, out); }); else out.push(e); return out; }
  function gates(e) { return inner(e).length; }

  function randExpr(n, vars, bin, un, kProb) {
    function leaf() { return Math.random() < (kProb || 0) ? K(RN(-3, 3)) : V(pick(vars)); }
    function build(g) {
      if (g === 0) return leaf();
      if (un.length && Math.random() < 0.35) return op(pick(un), [build(g - 1)]);
      var l = R(0, g - 1);
      return op(pick(bin), [build(l), build(g - 1 - l)]);
    }
    return build(n);
  }
  function usesAll(e, vars) { var s = leaves(e).map(function (l) { return l.v; }); return vars.every(function (v) { return s.indexOf(v) >= 0; }); }
  function silly(e) {
    // same input twice into a max, or a square of a square: legal but odd looking
    return inner(e).some(function (n) { return (n.op === 'max' && canon(n.a[0]) === canon(n.a[1])) || (n.op === n.a[0].op && arity(n.op) === 1); });
  }

  /* one small change that alters the picture */
  function mutate(e0, pools) {
    var e = clone(e0), ns = inner(e), kind = pick(['op', 'op', 'leaf', 'rot', 'rot']);
    if (kind === 'op') {
      var n = pick(ns), pool = arity(n.op) === 2 ? pools.bin : pools.un;
      var alt = pool.filter(function (o) { return o !== n.op; });
      if (!alt.length) return null;
      n.op = pick(alt); return e;
    }
    if (kind === 'leaf') {
      var ls = leaves(e).filter(function (l) { return l.v != null; });
      if (ls.length < 2) return null;
      var a = pick(ls), b = pick(ls);
      if (a.v === b.v) return null;
      var t = a.v; a.v = b.v; b.v = t; return e;
    }
    // rotation: n(A, m(B, C)) becomes m(n(A, B), C), or u(m(A, B)) becomes m(u(A), B)
    var cands = ns.filter(function (n) { return n.a.some(function (x) { return x.op && arity(x.op) === 2; }); });
    if (!cands.length) return null;
    var p = pick(cands), k = p.a.findIndex(function (x) { return x.op && arity(x.op) === 2; }), m = p.a[k];
    var j = R(0, 1), B = m.a[j], Cc = m.a[1 - j];
    var newP = op(p.op, p.a.slice()); newP.a[k] = B;
    var rot = op(m.op, [newP, Cc]);
    if (p === e) return rot;
    (function swap(x) { if (!x.op) return; x.a.forEach(function (y, i) { if (y === p) x.a[i] = rot; else swap(y); }); })(e);
    return e;
  }
  function distractors(e, n, pools, keep) {
    var seen = {}, out = [];
    seen[canon(e)] = 1;
    for (var i = 0; i < 400 && out.length < n; i++) {
      var m = mutate(e, pools);
      if (!m) continue;
      if (Math.random() < 0.3) m = mutate(m, pools) || m;
      var c = canon(m);
      if (seen[c] || silly(m) || (keep && !keep(m))) continue;
      seen[c] = 1; out.push(m);
    }
    return out.length === n ? out : null;
  }
  function graphOf(e, name) { return D.graph(e, {}, name || 'f'); }
  function drawSmall(el, e, name, o) { D.drawGraph(el, graphOf(e, name), Object.assign({ maxW: 600, rowGap: 56, colW: 96 }, o || {})); }
  function shuffled(correct, wrong) {
    var all = [correct].concat(wrong), idx = D.shuffle(all.map(function (_, i) { return i; }));
    return { list: idx.map(function (i) { return all[i]; }), answer: idx.indexOf(0) };
  }

  /* ------------------------------------------------ problem makers */
  function formulaToGraph(e, name, pools, intro) {
    var wr = distractors(e, 2, pools);
    if (!wr) return null;
    var s = shuffled(e, wr);
    return {
      q: (intro || '<p>Which graph computes this formula?</p>') + TT(name + ' = ' + D.tex(e)),
      options: s.list.map(function (x) { return function (b) { drawSmall(b, x, name, { names: false }); }; }),
      answer: s.answer, optCols: 1,
      solution: function (el) {
        var G = graphOf(e, name);
        el.innerHTML = '<p>Read the formula from the inside out. Every operation is one gate, and the innermost ones come first:</p><div class="m4-drill-lines">' +
          G.ops.map(function (n) { return TT(n.name + ' = ' + D.nodeTex(n)); }).join('') + '</div>' +
          '<p>Each variable appears once as an input box, even when the formula uses it several times. It then sends one wire to every gate that uses it.</p>';
        D.drawGraph(M4.el('div', { class: 'm4-drill-solfig' }, el), G, {});
      }
    };
  }
  function graphToFormula(e, name, pools) {
    var wr = distractors(e, 3, pools);
    if (!wr) return null;
    var s = shuffled(e, wr), G = graphOf(e, name);
    return {
      q: '<p>Which formula does this graph compute?</p>',
      figure: function (el) { D.drawGraph(el, G, { names: true }); },
      options: s.list.map(function (x) { return T(name + ' = ' + D.tex(x)); }),
      answer: s.answer, optCols: 2,
      solution: function (el) {
        el.innerHTML = '<p>Go gate by gate from left to right and write down what each one computes. Then substitute each name into the next line:</p><div class="m4-drill-lines">' +
          G.ops.map(function (n) { return TT(n.name + ' = ' + D.nodeTex(n)); }).join('') + '</div>' + TT(name + ' = ' + D.tex(e));
      }
    };
  }

  // number of distinct paths from every node to the output
  function paths(G) {
    var p = new Map(); p.set(G.out, 1);
    for (var i = G.nodes.length - 1; i >= 0; i--) {
      var n = G.nodes[i]; if (n === G.out) continue;
      p.set(n, n.users.reduce(function (s, u) { return s + (p.get(u) || 0); }, 0));
    }
    return p;
  }
  function depth(G) { var d = new Map(); G.nodes.forEach(function (n) { d.set(n, n.leaf ? 0 : 1 + Math.max.apply(null, n.args.map(function (a) { return d.get(a); }))); }); return d.get(G.out); }

  /* ------------------------------------------------ levels */
  var P1 = { bin: ['add', 'mul'], un: ['sq', 'relu', 'exp'] };
  function lv1() {
    for (var i = 0; i < 300; i++) {
      var vars = pick([['x', 'y'], ['x', 'y', 'z'], ['a', 'b', 'c']]);
      var e = randExpr(R(2, 3), vars, P1.bin, P1.un, 0.15);
      if (!usesAll(e, vars) || silly(e)) continue;
      var p = formulaToGraph(e, 'f', P1); if (p) return p;
    }
  }
  var P2 = { bin: BIN, un: UN };
  function lv2() {
    for (var i = 0; i < 300; i++) {
      var vars = pick([['x', 'y'], ['x', 'y', 'z'], ['a', 'b', 'c']]);
      var e = randExpr(R(3, 4), vars, P2.bin, P2.un, 0.12);
      if (!usesAll(e, vars) || silly(e)) continue;
      var p = graphToFormula(e, 'f', P2); if (p) return p;
    }
  }

  // which expression does the highlighted node compute
  function lv3() {
    for (var i = 0; i < 300; i++) {
      var vars = pick([['x', 'y', 'z'], ['a', 'b', 'c'], ['x', 'y']]);
      var e = randExpr(R(4, 5), vars, P2.bin, P2.un, 0.1);
      if (!usesAll(e, vars) || silly(e)) continue;
      var ins = inner(e).slice(1).filter(function (n) { return gates(n) >= 2; });
      if (!ins.length) continue;
      var target = pick(ins); target.name = 'h';
      var G = graphOf(e, 'f'), H = G.ops.filter(function (n) { return n.name === 'h'; })[0];
      var wr = distractors(target, 3, P2);
      if (!wr) continue;
      var s = shuffled(target, wr);
      return {
        q: '<p>The gate named ' + T('h') + ' is marked. Which expression in the inputs does it compute?</p>',
        figure: function (el) { D.drawGraph(el, G, { highlight: [H] }); },
        options: s.list.map(function (x) { return T('h = ' + D.tex(x)); }), answer: s.answer, optCols: 2,
        solution: function (el) {
          var sub = [], seen = new Set();
          (function walk(n) { if (n.leaf || seen.has(n)) return; seen.add(n); n.args.forEach(walk); sub.push(n); })(H);
          el.innerHTML = '<p>Only the gates that feed into ' + T('h') + ' matter. Follow its wires back to the inputs:</p><div class="m4-drill-lines">' +
            sub.map(function (n) { return TT(n.name + ' = ' + D.nodeTex(n)); }).join('') + '</div>' + TT('h = ' + D.tex(target)) +
            '<p class="m4-cap">Everything to the right of ' + T('h') + ' plays no role in its value. During backpropagation the reverse holds: the gradient arriving at ' + T('h') + ' depends only on the gates to its right.</p>';
        }
      };
    }
  }

  // counting gates, inputs, wires and depth from the formula alone
  function lv4() {
    for (var i = 0; i < 300; i++) {
      var vars = pick([['x', 'y'], ['x', 'y', 'z']]);
      var e = randExpr(R(3, 6), vars, ['add', 'mul', 'max'], UN, 0.1);
      if (!usesAll(e, vars) || silly(e)) continue;
      var G = graphOf(e, 'f'), x = G.vars.x;
      if (x.users.length < 2 && Math.random() < 0.7) continue;
      return {
        q: '<p>Without drawing anything, read off the graph of</p>' + TT('f = ' + D.tex(e)),
        fields: [
          { label: 'Number of gates', answer: G.ops.length, tol: 0 },
          { label: 'Number of input boxes (constants count)', answer: G.nodes.filter(function (n) { return n.leaf; }).length, tol: 0 },
          { label: 'Wires leaving ' + T('x'), answer: x.users.length, tol: 0 },
          { label: 'Gates on the longest path to ' + T('f'), answer: depth(G), tol: 0 }
        ], cols: 1,
        solution: function (el) {
          el.innerHTML = '<p>Each operation symbol is a gate, so count the operations: ' + G.ops.map(function (n) { return OPNAME[n.op]; }).join(', ') + '. ' +
            'Each distinct variable is one box, while every constant gets its own box. ' + T('x') + ' appears ' + x.users.length + (x.users.length === 1 ? ' time' : ' times') + ' in the formula, so ' + (x.users.length === 1 ? 'one wire leaves' : x.users.length + ' wires leave') + ' its box. The longest path is the deepest nesting of brackets.</p>';
          D.drawGraph(M4.el('div', { class: 'm4-drill-solfig' }, el), G, {});
        }
      };
    }
  }

  // neuron and network formulas
  function neuronExprs() {
    var lin = function (w, x, b) { return op('add', [op('mul', [V(w), V(x)]), V(b)]); };
    return [
      function () { return { e: op('sig', [lin('w', 'x', 'b')]), name: 'y' }; },
      function () { return { e: op('sq', [op('sub', [op('sig', [lin('w', 'x', 'b')]), V('t')])]), name: 'L' }; },
      function () { return { e: op('hsq', [op('sub', [op('relu', [lin('w', 'x', 'b')]), V('t')])]), name: 'L' }; },
      function () { return { e: op('sig', [op('add', [op('add', [op('mul', [V('w_1'), V('x_1')]), op('mul', [V('w_2'), V('x_2')])]), V('b')])]), name: 'y' }; },
      function () { return { e: op('add', [op('mul', [V('v'), op('relu', [lin('w', 'x', 'b')])]), V('c')]), name: 'y' }; },
      function () { return { e: op('add', [op('mul', [V('v_1'), op('relu', [lin('w_1', 'x', 'b_1')])]), op('mul', [V('v_2'), op('relu', [lin('w_2', 'x', 'b_2')])])]), name: 'y' }; },
      function () { return { e: op('add', [op('sq', [op('sub', [op('mul', [V('w'), V('x')]), V('t')])]), op('mul', [V('\\lambda'), op('sq', [V('w')])])]), name: 'L' }; },
      function () { return { e: op('add', [op('tanh', [lin('w', 'x', 'b')]), V('x')]), name: 'y' }; }
    ];
  }
  var P5 = { bin: ['add', 'mul'], un: ['sig', 'relu', 'tanh', 'sq'] };
  function lv5() {
    for (var i = 0; i < 100; i++) {
      var f = pick(neuronExprs())();
      var p = formulaToGraph(f.e, f.name, P5, '<p>Which graph computes this model?</p>');
      if (p) return p;
    }
  }
  function lv6() {
    for (var i = 0; i < 100; i++) {
      var f = pick(neuronExprs())();
      var p = graphToFormula(f.e, f.name, P5);
      if (p) return p;
    }
  }

  // fan-out and the number of paths: how many terms the chain rule produces
  function lv7() {
    for (var i = 0; i < 300; i++) {
      var useNet = Math.random() < 0.35, e, name = 'f', v = 'x';
      if (useNet) { var f = pick(neuronExprs().slice(4)) (); e = f.e; name = f.name; v = pick(['x', 'w'].filter(function (s) { return D.tex(e).indexOf(s) >= 0; })); }
      else {
        e = randExpr(R(3, 5), ['x', 'y'], ['add', 'mul'], ['sq', 'relu', 'exp', 'sig'], 0.08);
        if (!usesAll(e, ['x', 'y']) || silly(e)) continue;
      }
      var G = graphOf(e, name), X = G.vars[v];
      if (!X) continue;
      var pc = paths(G), np = pc.get(X);
      if (np < 2 && Math.random() < 0.8) continue;
      return {
        q: '<p>How many wires leave ' + T(v) + ', and how many different paths lead from ' + T(v) + ' to ' + T(name) + '?</p>',
        figure: function (el) { D.drawGraph(el, G, { names: false }); },
        fields: [{ label: 'Wires leaving ' + T(v), answer: X.users.length, tol: 0 }, { label: 'Paths from ' + T(v) + ' to ' + T(name), answer: np, tol: 0 }, { label: 'Terms in ' + T(D.dd(name, v)) + ' by the chain rule', answer: np, tol: 0 }],
        cols: 1,
        solution: function (el) {
          el.innerHTML = '<p>Count the paths backward. The output has one path to itself. Every other node has as many paths as all the gates it feeds have together. Next to each node below is its path count:</p>';
          D.drawGraph(M4.el('div', { class: 'm4-drill-solfig' }, el), G, { names: false, hideOps: function (n) { return pc.get(n); } });
          M4.el('p', { html: 'The chain rule produces one product of local derivatives per path, and then adds the products. So ' + T(D.dd(name, v)) + ' is a sum of ' + np + (np === 1 ? ' term' : ' terms') + '. Backpropagation never writes these terms out one by one. It adds them up at every node where wires meet, which is why it stays fast even when the number of paths explodes.' }, el);
          el.insertBefore(M4.el('p', { html: T(v) + ' sends ' + X.users.length + (X.users.length === 1 ? ' wire' : ' wires') + ' into the graph. Adding the counts at the ends of these wires gives ' + np + '.' }), el.children[2]);
        }
      };
    }
  }

  var LEVELS = [
    ['Formula to graph', 'Pick the graph that computes the formula. Small formulas with sums, products and a few unary gates.', lv1, 4],
    ['Graph to formula', 'Read the graph gate by gate and pick the formula it computes.', lv2, 4],
    ['What does this gate compute?', 'Follow the wires of one marked gate back to the inputs.', lv3, 4],
    ['Counting from the formula', 'Gates, input boxes, fan out and depth, read off the formula without drawing.', lv4, 3],
    ['Models to graphs', 'Neurons, losses and tiny networks. Pick the graph that computes the model.', lv5, 4],
    ['Graphs to models', 'The same models in reverse. Read the network off its graph.', lv6, 4],
    ['Wires and paths', 'Count how many paths connect an input to the output. That is the number of terms the chain rule produces.', lv7, 3]
  ];

  var steps = [{
    kind: 'text', title: 'Reading and drawing graphs',
    html: '<p>Before you can backpropagate through a formula, you need to see its graph. These levels train exactly that step: going from a formula to the graph and back, and reading off the structure that backpropagation cares about.</p>' +
      '<p>Every problem is generated fresh. The wrong options differ from the right one by a single change, such as a different gate, two swapped inputs, or brackets in another place, so look closely.</p>' +
      D.levelList('bp-graphs', LEVELS.map(function (l) { return l[0]; })) +
      '<p class="m4-note">When the graphs feel natural, move on to <a href="#/l/bp-drill">Backpropagation practice</a>, where you compute every value and gradient yourself.</p>'
  }];
  LEVELS.forEach(function (l, i) {
    steps.push({ kind: 'exercise', title: 'Level ' + (i + 1) + ': ' + l[0], html: '<p>' + l[1] + '</p>', mount: function (el, ctx) { M4.drill(el, ctx, { gen: l[2], n: l[3], key: 'bp-graphs:' + (i + 1) }); } });
  });

  M4.lesson({ id: 'bp-graphs', module: 'backprop', title: 'Reading and drawing graphs', summary: 'Seven levels that train the step from a formula to its computational graph and back.', minutes: 20, free: true, drill: true, steps: steps });
})();
