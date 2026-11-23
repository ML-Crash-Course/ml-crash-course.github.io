/* Normalization layers: BatchNorm, LayerNorm, InstanceNorm and RMSNorm differ only in which numbers share a mean and a standard deviation. */
(function () {
  'use strict';
  var M4 = window.M4;
  if (!M4 || !M4.lesson) return;
  var C = M4.colors;
  function mix(p) {
    var idx = p.options.map(function (_, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    p.answer = idx.indexOf(p.answer); p.options = idx.map(function (i) { return p.options[i]; }); return p;
  }

  function readout(parent, items) {
    var row = M4.el('div', { class: 'm4-readout' }, parent), vals = {};
    items.forEach(function (it) {
      var sp = M4.el('span', null, row);
      var l = M4.el('span', { html: '\\(' + it[1] + '\\) = ' }, sp); M4.typeset(l);
      vals[it[0]] = M4.el('b', { text: '0' }, sp);
    });
    return function (k, v) {
      if (Array.isArray(v)) vals[k].innerHTML = M4.tex(M4.col(v.map(function (a) { return M4.fmt(a, 2); })));
      else vals[k].textContent = typeof v === 'string' ? v : M4.fmt(v, 2);
    };
  }
  function msd(xs) {
    var n = xs.length, m = 0, v = 0, i;
    for (i = 0; i < n; i++) m += xs[i] / n;
    for (i = 0; i < n; i++) v += (xs[i] - m) * (xs[i] - m) / n;
    return { m: m, s: Math.sqrt(v), rms: Math.sqrt(xs.reduce(function (a, x) { return a + x * x; }, 0) / n) };
  }

  /* ---------- the tensor grid: N examples, C channels, P positions ---------- */
  var MODES = {
    BN: { name: 'BatchNorm', same: function (a, b) { return a.c === b.c; }, desc: 'one mean and std per <b>channel</b>, shared by all examples in the batch and all positions' },
    LN: { name: 'LayerNorm', same: function (a, b) { return a.n === b.n; }, desc: 'one mean and std per <b>example</b>, over all of its channels and positions' },
    IN: { name: 'InstanceNorm', same: function (a, b) { return a.n === b.n && a.c === b.c; }, desc: 'one mean and std per <b>example and channel</b>, over the positions only' },
    RMS: { name: 'RMSNorm', same: function (a, b) { return a.n === b.n; }, desc: 'the same groups as LayerNorm, but nothing is subtracted: each value is divided by the root mean square of its group' }
  };
  function grid(el, ctx, o) {
    var N = 4, CH = 3, P = 4, vals = [];
    var data = o.data || [
      [7, 9, 8, 6, 1, 2, 0, 1, 5, 3, 4, 4],
      [8, 6, 9, 9, 2, 0, 1, 1, 6, 2, 5, 3],
      [3, 4, 2, 3, 0, 1, 2, 1, 4, 4, 6, 2],
      [6, 7, 5, 6, 1, 1, 0, 2, 7, 3, 2, 4]
    ];
    var chCol = [C.blue, C.orange, C.purple];
    var mode = o.mode || 'BN', sel = { n: 0, c: 0, p: 0 }, showNorm = false;
    var wrap = M4.el('div', { style: 'overflow-x:auto;display:flex;justify-content:center;margin:6px 0 10px' }, el);
    var g = M4.el('div', { style: 'display:grid;grid-template-columns:96px repeat(' + (CH * P) + ',44px);gap:3px;font-variant-numeric:tabular-nums' }, wrap);
    M4.el('div', null, g);
    for (var c = 0; c < CH; c++) {
      M4.el('div', { text: 'channel ' + (c + 1), style: 'grid-column:span ' + P + ';text-align:center;font-weight:600;font-size:15px;color:' + chCol[c] + ';border-bottom:3px solid ' + chCol[c] + ';padding-bottom:2px;margin:0 2px 4px' }, g);
    }
    var cells = [];
    for (var n = 0; n < N; n++) {
      M4.el('div', { text: 'example ' + (n + 1), style: 'font-size:15px;color:' + C.muted + ';align-self:center' }, g);
      for (c = 0; c < CH; c++) for (var p = 0; p < P; p++) {
        var cell = { n: n, c: c, p: p, v: data[n][c * P + p] };
        cell.el = M4.el('button', { type: 'button', style: 'height:40px;border:2px solid transparent;border-radius:6px;font:inherit;font-size:16px;cursor:pointer;background:#f3f1ea;color:' + C.ink + (p === 0 && c > 0 ? ';margin-left:8px' : '') }, g);
        (function (cl) { cl.el.addEventListener('click', function () { sel = cl; upd(); }); })(cell);
        cells.push(cell);
      }
    }
    var cap = M4.el('p', { class: 'm4-cap', style: 'font-size:17px;color:inherit;min-height:52px' }, el);
    var row = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, el), btns = {};
    Object.keys(MODES).forEach(function (k) {
      btns[k] = M4.button(row, MODES[k].name, function () { mode = k; upd(); });
    });
    var row2 = M4.el('div', { class: 'm4-row', style: 'justify-content:center' }, el);
    var tg = M4.button(row2, 'Show normalized values', function () { showNorm = !showNorm; tg.textContent = showNorm ? 'Show raw values' : 'Show normalized values'; upd(); }, { ghost: true });
    var seen = {};
    function group(cl) { return cells.filter(function (d) { return MODES[mode].same(cl, d); }); }
    function upd() {
      Object.keys(btns).forEach(function (k) { btns[k].className = 'm4-btn' + (k === mode ? ' primary' : ''); });
      var mine = group(sel), st = msd(mine.map(function (d) { return d.v; }));
      cells.forEach(function (d) {
        var inG = MODES[mode].same(sel, d), txt = String(d.v);
        if (showNorm) {
          var s2 = msd(group(d).map(function (e) { return e.v; }));
          var z = mode === 'RMS' ? d.v / (s2.rms + 1e-9) : (d.v - s2.m) / (s2.s + 1e-9);
          txt = M4.fmt(z, 1);
        }
        d.el.textContent = txt;
        d.el.style.background = inG ? 'rgba(184,105,42,0.28)' : '#f3f1ea';
        d.el.style.borderColor = d === sel ? C.ink : 'transparent';
        d.el.style.fontWeight = inG ? '600' : '400';
      });
      cap.innerHTML = '<b>' + MODES[mode].name + '</b>: ' + MODES[mode].desc + '. The selected group has ' + mine.length + ' numbers with ' +
        (mode === 'RMS' ? 'root mean square \\(' + M4.fmt(st.rms, 2) + '\\).' : 'mean \\(' + M4.fmt(st.m, 2) + '\\) and standard deviation \\(' + M4.fmt(st.s, 2) + '\\).');
      M4.typeset(cap);
      seen[mode] = true;
      if (o.onMode) o.onMode(mode);
    }
    upd();
  }

  /* ---------- LayerNorm and RMSNorm of a vector in the plane ---------- */
  function plane2(el) {
    var R2 = Math.SQRT2;
    var p = M4.plane(el, { xmin: -3.2, xmax: 3.2, ymin: -3.2, ymax: 3.2, width: 420, height: 420 });
    p.path([[-3.2, 3.2], [3.2, -3.2]], { stroke: C.green, width: 2, dash: true, layer: 'bg' });
    var circ = [];
    for (var k = 0; k <= 80; k++) circ.push([R2 * Math.cos(k / 40 * Math.PI), R2 * Math.sin(k / 40 * Math.PI)]);
    p.path(circ, { stroke: C.purple, width: 2, dash: true, layer: 'bg' });
    p.text(2.25, -2.75, 'centered vectors', { size: 14, fill: C.green, weight: 500 });
    p.text(-2.2, 2.0, 'radius \u221A2', { size: 14, fill: C.purple, weight: 500 });
    var aH = p.arrow(0, 0, 2, 1, { stroke: C.blue, width: 3 });
    var proj = p.path([], { stroke: C.ink, width: 2, dash: '4 5' });
    var ln = p.point(1, -1, { r: 8, color: C.green });
    var rm = p.point(1, 1, { r: 8, color: C.purple });
    var set = readout(el, [['h', '\\mathbf h'], ['l', '\\mathrm{LN}(\\mathbf h)'], ['r', '\\mathrm{RMS}(\\mathbf h)']]);
    function vs(v) { return [v[0], v[1]]; }
    function upd(x, y) {
      aH.set(0, 0, x, y);
      var m = (x + y) / 2, c = [x - m, y - m], s = Math.abs(x - y) / 2;
      var L = s < 1e-6 ? [0, 0] : [c[0] / s, c[1] / s];
      var r = Math.sqrt((x * x + y * y) / 2), Rv = r < 1e-6 ? [0, 0] : [x / r, y / r];
      proj.set([[x, y], [c[0], c[1]]]);
      ln.set(L[0], L[1]); rm.set(Rv[0], Rv[1]);
      set('h', vs([x, y])); set('l', s < 1e-6 ? 'undefined' : vs(L)); set('r', vs(Rv));
    }
    p.handle(2, 1, { color: C.blue, r: 9, bounds: { xmin: -3, xmax: 3, ymin: -3, ymax: 3 }, onDrag: upd });
    upd(2, 1);
    M4.typeset(M4.el('p', { class: 'm4-cap', html: 'Blue: the input \\(\\mathbf h\\). Green: LayerNorm output. Purple: RMSNorm output. The dashed black segment is the centering step, which moves \\(\\mathbf h\\) onto the green line.' }, el));
  }

  /* ---------- practice ---------- */
  var VEC3 = [[1, 3, 5], [2, 4, 9], [0, 3, 6], [1, 2, 6], [4, 5, 9], [2, 6, 7], [3, 3, 6], [0, 4, 8]];
  function vtex(v) { return M4.col(v); }
  function gen() {
    var kind = M4.pick(['ln', 'ln', 'rms', 'bn', 'axes', 'axes', 'eval']);
    if (kind === 'ln' || kind === 'rms') {
      var v = M4.pick(VEC3).slice(), sh = M4.rand(-2, 2);
      v = v.map(function (x) { return x + sh; });
      var st = msd(v), i = M4.rand(0, 2), names = ['first', 'second', 'third'];
      if (kind === 'ln') {
        var gam = M4.pick([1, 1, 2]), bet = M4.pick([0, 0, 1]);
        var z = (v[i] - st.m) / st.s, out = gam * z + bet;
        return {
          q: 'Apply LayerNorm with \\(\\gamma = ' + gam + '\\), \\(\\beta = ' + bet + '\\) and \\(\\varepsilon = 0\\) to \\(\\mathbf h = ' + vtex(v) + '\\). What is the ' + names[i] + ' entry of the output? Use the \\(1/d\\) variance.',
          answer: out, tol: 0.02,
          explain: 'Mean \\(' + M4.fmt(st.m, 3) + '\\), standard deviation \\(' + M4.fmt(st.s, 3) + '\\). The entry becomes \\(' + gam + '\\cdot(' + v[i] + ' - ' + M4.fmt(st.m, 3) + ')/' + M4.fmt(st.s, 3) + ' + ' + bet + ' = ' + M4.fmt(out, 3) + '\\).'
        };
      }
      return {
        q: 'Apply RMSNorm with \\(\\gamma = 1\\) and \\(\\varepsilon = 0\\) to \\(\\mathbf h = ' + vtex(v) + '\\). What is the ' + names[i] + ' entry of the output?',
        answer: v[i] / st.rms, tol: 0.02,
        explain: '\\(\\mathrm{rms}(\\mathbf h) = \\sqrt{(' + v.map(function (x) { return x + '^2'; }).join(' + ') + ')/3} = ' + M4.fmt(st.rms, 3) + '\\), so the entry is \\(' + v[i] + '/' + M4.fmt(st.rms, 3) + ' = ' + M4.fmt(v[i] / st.rms, 3) + '\\).'
      };
    }
    if (kind === 'bn') {
      var col = M4.pick([[1, 3, 5, 7], [2, 2, 6, 6], [0, 4, 4, 8], [3, 5, 7, 9], [1, 1, 5, 9]]).slice(), j = M4.rand(0, 3);
      var s = msd(col);
      return {
        q: 'In a batch of four examples, one feature takes the values \\(' + vtex(col) + '\\). BatchNorm with \\(\\gamma = 1\\), \\(\\beta = 0\\) and \\(\\varepsilon = 0\\) is applied in training mode. What does example ' + (j + 1) + ' get for this feature?',
        answer: (col[j] - s.m) / s.s, tol: 0.02,
        explain: 'Batch mean \\(' + M4.fmt(s.m, 2) + '\\), batch standard deviation \\(' + M4.fmt(s.s, 3) + '\\), so \\((' + col[j] + ' - ' + M4.fmt(s.m, 2) + ')/' + M4.fmt(s.s, 3) + ' = ' + M4.fmt((col[j] - s.m) / s.s, 3) + '\\).'
      };
    }
    if (kind === 'axes') {
      var qs = [
        ['A tensor has shape \\(N \\times C \\times H \\times W\\). Over which axes does BatchNorm compute its means?', ['\\(N, H, W\\)', '\\(C, H, W\\)', '\\(H, W\\)', '\\(N\\) only'], 0, 'BatchNorm keeps one statistic per channel and pools everything else, including the batch.'],
        ['A tensor has shape \\(N \\times C \\times H \\times W\\). Over which axes does InstanceNorm compute its means?', ['\\(N, H, W\\)', '\\(C, H, W\\)', '\\(H, W\\)', '\\(N, C\\)'], 2, 'InstanceNorm keeps one statistic per example and channel, so only the spatial axes are pooled.'],
        ['A transformer activation has shape batch \\(\\times\\) tokens \\(\\times\\) features. Over which axis does LayerNorm compute its means?', ['features', 'tokens', 'batch', 'batch and tokens'], 0, 'Each token of each example is normalized on its own, over its feature vector.'],
        ['Which normalization layer makes the output of one example depend on the other examples in the batch during training?', ['BatchNorm', 'LayerNorm', 'InstanceNorm', 'RMSNorm'], 0, 'Only BatchNorm pools over the batch axis.'],
        ['How many separate means does LayerNorm compute for an input of shape \\(8 \\times 16 \\times 512\\) (batch, tokens, features)?', ['\\(128\\)', '\\(512\\)', '\\(8\\)', '\\(65536\\)'], 0, 'One mean per token per example: \\(8 \\cdot 16 = 128\\).'],
        ['How many separate means does BatchNorm compute for an image batch of shape \\(32 \\times 64 \\times 28 \\times 28\\)?', ['\\(64\\)', '\\(32\\)', '\\(2048\\)', '\\(784\\)'], 0, 'One mean per channel, and there are 64 channels.']
      ];
      var qq = M4.pick(qs);
      return mix({ q: qq[0], options: qq[1].slice(), answer: qq[2], explain: qq[3] });
    }
    return mix({
      q: 'A network with BatchNorm is used to classify a single image at test time. Which statistics normalize it?',
      options: ['Running averages of the batch means and variances recorded during training', 'The mean and variance of that single image', 'Mean 0 and variance 1, so nothing changes', 'The statistics of the most recent training batch only'], answer: 0,
      explain: 'During training BatchNorm keeps exponential running averages of the batch statistics. In evaluation mode it uses those fixed numbers, so a prediction does not depend on what else is in the batch.'
    });
  }

  M4.lesson({
    id: 'norm-s2',
    module: 'norm',
    title: 'Normalization layers',
    summary: 'BatchNorm, LayerNorm, InstanceNorm and RMSNorm all standardize activations. They differ in which values share a mean and a standard deviation.',
    minutes: 16,
    steps: [
      {
        kind: 'text',
        title: 'Standardizing inside the network',
        html: '<p><a href="#/l/norm-s1">Standardizing the inputs</a> turns the loss into a rounder bowl for the first layer. The second layer, however, sees the activations of the first, and their scale changes every time the first layer is updated. A normalization layer standardizes those activations again, inside the network: \\[\\hat h = \\frac{h - \\mu}{\\sqrt{\\sigma^2 + \\varepsilon}}, \\qquad y = \\gamma\\, \\hat h + \\beta.\\]</p>' +
          '<p>The small \\(\\varepsilon\\) avoids division by zero. The learnable scale \\(\\gamma\\) and shift \\(\\beta\\) let the network undo the standardization when that helps, so the layer never limits what the network can express. The only open question is which numbers \\(\\mu\\) and \\(\\sigma\\) are computed over.</p>'
      },
      {
        kind: 'explore',
        title: 'Who shares a statistic',
        html: '<p>A batch of activations with 4 examples, 3 channels and 4 positions per channel. Positions are pixels in an image or tokens in a sentence. Click any cell to highlight the numbers that are standardized together with it, and switch between the four layers. Then show the normalized values.</p>',
        mount: function (el, ctx) { grid(el, ctx, {}); }
      },
      {
        kind: 'exercise',
        title: 'Name the layer',
        html: '<p>Four questions about axes and groups. Use the grid above if you are unsure. Get four right.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, { n: 4, gen: function () { var p; do { p = gen(); } while (!p.options); return p; } });
        }
      },
      {
        kind: 'explore',
        title: 'LayerNorm and RMSNorm as geometry',
        html: '<p>Take a hidden vector with two features, \\(\\mathbf h = \\begin{pmatrix}h_1\\\\h_2\\end{pmatrix}\\), and drag it. LayerNorm first subtracts the mean of the two entries. That lands on the line \\(h_1 + h_2 = 0\\) of centered vectors. Dividing by the standard deviation then pushes it to \\(\\begin{pmatrix}1\\\\-1\\end{pmatrix}\\) or \\(\\begin{pmatrix}-1\\\\1\\end{pmatrix}\\), the only two centered vectors with spread 1. RMSNorm skips the centering and only rescales, so its output can point anywhere on the circle of radius \\(\\sqrt 2\\).</p>',
        mount: function (el) { plane2(el); }
      },
      {
        kind: 'text',
        title: 'Every output has the same length',
        html: '<p>The picture generalizes to \\(d\\) features. RMSNorm divides by \\(\\mathrm{rms}(\\mathbf h) = \\|\\mathbf h\\|/\\sqrt d\\), so every output has length \\(\\sqrt d\\). It keeps the direction of \\(\\mathbf h\\) and forgets its length. LayerNorm is RMSNorm applied after centering: it also forgets the mean, so its outputs lie on a sphere of radius \\(\\sqrt d\\) inside the subspace of centered vectors.</p>' +
          '<p>RMSNorm is cheaper because it computes one statistic instead of two, and in large language models it works as well as LayerNorm. Llama models use it, for example.</p>'
      },
      {
        kind: 'text',
        title: 'Training mode and evaluation mode',
        html: '<p><b>BatchNorm</b> needs a batch. During training it uses the mean and variance of the current batch and also keeps running averages of them. At test time there may be a single example, so it switches to evaluation mode and uses the running averages. Forgetting this switch, for instance by calling <code>model.train()</code> during evaluation, is a classic bug.</p>' +
          '<p><b>LayerNorm</b>, <b>InstanceNorm</b> and <b>RMSNorm</b> compute their statistics from one example alone, so they behave identically in training and at test time and work with any batch size. This is why transformers, which process sequences of different lengths and are often run with small batches, use LayerNorm or RMSNorm. Convolutional networks for images traditionally use BatchNorm, and InstanceNorm is common in style transfer, where the per image contrast of each channel carries the style that should be removed.</p>'
      },
      {
        kind: 'exercise',
        title: 'Normalization practice',
        html: '<p>Compute LayerNorm, RMSNorm and BatchNorm outputs on small examples, and answer questions about axes. Get five right.</p>',
        hint: 'All three use the \\(1/d\\) variance. LayerNorm: subtract the mean of the vector, divide by its standard deviation, then scale by \\(\\gamma\\) and add \\(\\beta\\). RMSNorm: divide by \\(\\sqrt{\\tfrac1d \\sum_i h_i^2}\\). BatchNorm: the same as LayerNorm, but the statistics come from one feature across the batch.',
        mount: function (el, ctx) { M4.practice(el, ctx, { n: 5, gen: gen }); }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>A normalization layer standardizes activations with \\((h - \\mu)/\\sqrt{\\sigma^2 + \\varepsilon}\\), then applies a learnable scale \\(\\gamma\\) and shift \\(\\beta\\).</li>' +
          '<li>BatchNorm pools over the batch and positions, one statistic per channel. LayerNorm pools over the features of one example. InstanceNorm pools over the positions of one example and channel. RMSNorm uses the LayerNorm groups but only divides by the root mean square.</li>' +
          '<li>RMSNorm outputs have length \\(\\sqrt d\\). LayerNorm outputs are centered and also have length \\(\\sqrt d\\).</li>' +
          '<li>BatchNorm behaves differently in training and evaluation. The other three do not depend on the batch, which is why transformers use them.</li>' +
          '</ul>'
      }
    ]
  });
})();
