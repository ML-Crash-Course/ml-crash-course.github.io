(function () {
  'use strict';

  var C = M4.colors;
  var PFX = 'probability-s3-';

  function injectStyle() {
    if (document.getElementById(PFX + 'style')) return;
    var s = document.createElement('style');
    s.id = PFX + 'style';
    s.textContent = [
      '.' + PFX + 'svg{display:block;width:100%;max-width:600px;height:auto;margin:0 auto;user-select:none;-webkit-user-select:none}',
      '.' + PFX + 'handle{cursor:grab;touch-action:none}',
      '.' + PFX + 'handle:active{cursor:grabbing}',
      '.' + PFX + 'readouts{justify-content:center;margin:14px 0 6px}',
      '.' + PFX + 'post{background:#fff3cc;border:2px solid ' + C.yellow + ';font-weight:700}',
      '.' + PFX + 'bar{display:flex;height:26px;border-radius:13px;overflow:hidden;border:2px solid ' + C.ink + ';max-width:480px;margin:10px auto 4px;position:relative;background:#fff}',
      '.' + PFX + 'bar > div{height:100%}',
      '.' + PFX + 'half{position:absolute;left:50%;top:-4px;bottom:-4px;width:0;border-left:2px dashed ' + C.ink + ';height:auto !important}',
      '.' + PFX + 'center{text-align:center}',
      '.' + PFX + 'formula{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;margin:18px 0}',
      '.' + PFX + 'frac{display:flex;flex-direction:column;align-items:center;gap:10px}',
      '.' + PFX + 'fracline{height:3px;background:' + C.ink + ';align-self:stretch;border-radius:2px}',
      '.' + PFX + 'cell{display:flex;flex-direction:column;align-items:center;gap:6px}',
      '.' + PFX + 'cell .m4-slot{min-width:132px;min-height:50px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px}',
      '.' + PFX + 'cell .m4-slot.filled{background:#fff3cc;border:2px solid ' + C.yellow + ';border-style:solid}',
      '.' + PFX + 'op{font-size:28px;font-weight:700}',
      '.' + PFX + 'tokens{justify-content:center;min-height:56px;margin-top:8px}',
      '.' + PFX + 'tokens .m4-token{font-weight:700;font-size:17px;padding:10px 16px;touch-action:none}',
      '.' + PFX + 'legend{justify-content:center;margin:10px 0}',
      '.' + PFX + 'sw{display:inline-block;width:14px;height:14px;border-radius:4px;margin-right:6px;vertical-align:-2px;border:1.5px solid rgba(0,0,0,.25)}',
      '.' + PFX + 'facts{justify-content:center;margin:6px 0 12px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function f2(v) { return v.toFixed(2); }
  function f3(v) { return v.toFixed(3); }
  function near(a, b) { return Math.abs(a - b) < 1e-6; }

  /* ------------------------------------------------------------------ */
  /* Unit-square widget                                                  */
  /* ------------------------------------------------------------------ */
  function square(el, ctx, o) {
    var W = 600, H = 446, x0 = 130, y0 = 50, S = 340;
    var names = o.names || { H: 'H', notH: 'not H', D: 'D' };
    var tx = o.tex || {
      jh: 'P(D \\cap H)', jn: 'P(D \\cap \\neg H)', d: 'P(D)', post: 'P(H \\mid D)'
    };
    var drag = o.drag || {};
    var snap = o.snap || 0.01;
    var lo = o.snap ? o.snap : 0.01, hi = 1 - lo;
    var st = { p: o.p, l: o.l, f: o.f };
    var showPost = o.showPost !== false;
    var raf = 0;

    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': PFX + 'svg' }, el);
    function rect(fill, op) {
      return M4.svg('rect', { fill: fill, 'fill-opacity': op }, svg);
    }
    var rHn = rect(C.yellow, 0.22), rHd = rect(C.yellow, 1);
    var rNn = rect(C.blue, 0.10), rNd = rect(C.blue, 0.85);
    M4.svg('rect', { x: x0, y: y0, width: S, height: S, fill: 'none', stroke: C.ink, 'stroke-width': 3, rx: 2 }, svg);
    var div = M4.svg('line', { stroke: C.ink, 'stroke-width': 3 }, svg);
    var lnL = M4.svg('line', { stroke: C.ink, 'stroke-width': 2 }, svg);
    var lnF = M4.svg('line', { stroke: C.ink, 'stroke-width': 2 }, svg);

    function txt(anchor, weight, size, fill) {
      return M4.svg('text', {
        'text-anchor': anchor || 'middle', 'font-size': size || 16, 'font-weight': weight || 500,
        fill: fill || C.ink, 'pointer-events': 'none'
      }, svg);
    }
    var aHd = txt('middle', 700), aHn = txt('middle', 600, 15, C.muted);
    var aNd = txt('middle', 700, 16, '#fff'), aNn = txt('middle', 600, 15, C.muted);
    var tH = txt('middle', 700), tN = txt('middle', 700);
    tH.textContent = names.H; tN.textContent = names.notH;
    var tP = txt('middle', 700);
    var L1 = txt('end', 500), L2 = txt('end', 500), L3 = txt('end', 800, 18);
    var R1 = txt('start', 500), R2 = txt('start', 500), R3 = txt('start', 800, 18);
    L1.textContent = 'P(' + names.D + ' |'; L2.textContent = names.H + ')';
    R1.textContent = 'P(' + names.D + ' |'; R2.textContent = names.notH + ')';

    // ghost target
    var ghost = null;
    if (o.target) {
      var t = o.target, gx = x0 + t.p * S;
      var gs = { stroke: C.ink, 'stroke-width': 2, 'stroke-dasharray': '6 6', 'stroke-opacity': 0.45, fill: 'none' };
      function gl(x1, y1, x2, y2) {
        var a = { x1: x1, y1: y1, x2: x2, y2: y2 }, k;
        for (k in gs) a[k] = gs[k];
        M4.svg('line', a, svg);
      }
      gl(gx, y0, gx, y0 + S);
      gl(x0, y0 + S - t.l * S, gx, y0 + S - t.l * S);
      gl(gx, y0 + S - t.f * S, x0 + S, y0 + S - t.f * S);
      function ring(cx, cy) {
        return M4.svg('circle', { cx: cx, cy: cy, r: 19, fill: C.green, 'fill-opacity': 0, stroke: C.green, 'stroke-width': 3, 'stroke-dasharray': '5 5' }, svg);
      }
      ghost = {
        p: ring(gx, y0 + S), l: ring(x0, y0 + S - t.l * S), f: ring(x0 + S, y0 + S - t.f * S)
      };
    }

    function mkHandle(key, color) {
      var g = M4.svg('g', {}, svg);
      if (!drag[key]) {
        M4.svg('circle', { r: 6, fill: C.ink }, g);
        return g;
      }
      g.setAttribute('class', PFX + 'handle');
      M4.svg('circle', { r: 24, fill: '#000', 'fill-opacity': 0 }, g);
      M4.svg('circle', { r: 13, fill: color, stroke: C.ink, 'stroke-width': 3 }, g);
      M4.svg('circle', { r: 4, fill: C.ink }, g);
      var start = 0;
      M4.drag(g, {
        onStart: function () { stop(); start = st[key]; },
        onMove: function (dx, dy) {
          var r = svg.getBoundingClientRect();
          var sc = r.width > 0 ? W / r.width : 1;
          var v = key === 'p' ? start + dx * sc / S : start - dy * sc / S;
          v = Math.round(v / snap) * snap;
          v = +clamp(v, lo, hi).toFixed(4);
          if (v !== st[key]) { st[key] = v; render(); if (o.onChange) o.onChange(st); }
        },
        onEnd: function () { if (o.onEnd) o.onEnd(st); }
      });
      return g;
    }
    var hP = mkHandle('p', C.orange), hL = mkHandle('l', C.yellow), hF = mkHandle('f', C.blue);

    // readouts
    var vals = {};
    var row = M4.el('div', { 'class': 'm4-row ' + PFX + 'readouts' }, el);
    function pill(key, texStr, extra) {
      var pEl = M4.el('span', { 'class': 'm4-readout' + (extra ? ' ' + extra : '') }, row);
      M4.el('span', { html: M4.tex(texStr) + ' = ' }, pEl);
      vals[key] = M4.el('span', { text: '' }, pEl);
    }
    pill('jh', tx.jh); pill('jn', tx.jn); pill('d', tx.d);
    var bar = null, bH = null, bN = null;
    if (showPost) {
      pill('post', tx.post, PFX + 'post');
      bar = M4.el('div', { 'class': PFX + 'bar' }, el);
      bH = M4.el('div', { style: 'background:' + C.yellow }, bar);
      bN = M4.el('div', { style: 'background:' + C.blue + ';opacity:.85' }, bar);
      if (o.half) M4.el('div', { 'class': PFX + 'half' }, bar);
      M4.el('div', { 'class': 'm4-note ' + PFX + 'center', text: o.barNote || 'The two coloured areas, rescaled to total 1. The yellow share is the posterior.' }, el);
    }

    function setRect(r, x, y, w, h) {
      r.setAttribute('x', x); r.setAttribute('y', y);
      r.setAttribute('width', Math.max(0, w)); r.setAttribute('height', Math.max(0, h));
    }
    function area(tEl, x, y, w, h, v) {
      if (w > 62 && h > 28) {
        tEl.setAttribute('x', x + w / 2); tEl.setAttribute('y', y + h / 2 + 6);
        tEl.textContent = f3(v);
      } else tEl.textContent = '';
    }
    function lines(a, b, c, x, yc, v) {
      a.setAttribute('x', x); a.setAttribute('y', yc - 18);
      b.setAttribute('x', x); b.setAttribute('y', yc + 2);
      c.setAttribute('x', x); c.setAttribute('y', yc + 25);
      c.textContent = '= ' + f2(v);
    }
    function render() {
      var p = st.p, l = st.l, f = st.f;
      var X = x0 + p * S, yl = y0 + S - l * S, yf = y0 + S - f * S;
      setRect(rHd, x0, yl, p * S, l * S); setRect(rHn, x0, y0, p * S, (1 - l) * S);
      setRect(rNd, X, yf, (1 - p) * S, f * S); setRect(rNn, X, y0, (1 - p) * S, (1 - f) * S);
      div.setAttribute('x1', X); div.setAttribute('x2', X); div.setAttribute('y1', y0); div.setAttribute('y2', y0 + S);
      lnL.setAttribute('x1', x0); lnL.setAttribute('x2', X); lnL.setAttribute('y1', yl); lnL.setAttribute('y2', yl);
      lnF.setAttribute('x1', X); lnF.setAttribute('x2', x0 + S); lnF.setAttribute('y1', yf); lnF.setAttribute('y2', yf);
      area(aHd, x0, yl, p * S, l * S, p * l); area(aHn, x0, y0, p * S, (1 - l) * S, p * (1 - l));
      area(aNd, X, yf, (1 - p) * S, f * S, (1 - p) * f); area(aNn, X, y0, (1 - p) * S, (1 - f) * S, (1 - p) * (1 - f));
      var wH = names.H.length * 10 + 12, wN = names.notH.length * 10 + 12;
      tH.setAttribute('x', x0 + p * S / 2); tH.setAttribute('y', y0 - 14);
      tH.setAttribute('visibility', p * S >= wH ? 'visible' : 'hidden');
      tN.setAttribute('x', X + (1 - p) * S / 2); tN.setAttribute('y', y0 - 14);
      tN.setAttribute('visibility', (1 - p) * S >= wN ? 'visible' : 'hidden');
      tP.setAttribute('x', clamp(X, x0 + 30, x0 + S - 30)); tP.setAttribute('y', y0 + S + 42);
      tP.textContent = 'P(' + names.H + ') = ' + f2(p);
      lines(L1, L2, L3, x0 - 24, clamp(yl, y0 + 30, y0 + S - 30), l);
      lines(R1, R2, R3, x0 + S + 24, clamp(yf, y0 + 30, y0 + S - 30), f);
      hP.setAttribute('transform', 'translate(' + X + ',' + (y0 + S) + ')');
      hL.setAttribute('transform', 'translate(' + x0 + ',' + yl + ')');
      hF.setAttribute('transform', 'translate(' + (x0 + S) + ',' + yf + ')');
      var jh = p * l, jn = (1 - p) * f, d = jh + jn, post = d > 0 ? jh / d : 0;
      vals.jh.textContent = f3(jh); vals.jn.textContent = f3(jn); vals.d.textContent = f3(d);
      if (showPost) {
        vals.post.textContent = f3(post);
        bH.style.width = (post * 100) + '%'; bN.style.width = ((1 - post) * 100) + '%';
      }
      if (ghost) {
        ['p', 'l', 'f'].forEach(function (k) {
          ghost[k].setAttribute('fill-opacity', near(st[k], o.target[k]) ? 0.35 : 0);
        });
      }
    }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    function animateTo(tp, tl, tf) {
      stop();
      var a = { p: st.p, l: st.l, f: st.f }, t0 = null, dur = 600;
      function tick(now) {
        if (t0 === null) t0 = now;
        var u = clamp((now - t0) / dur, 0, 1), e = u * u * (3 - 2 * u);
        st.p = a.p + (tp - a.p) * e; st.l = a.l + (tl - a.l) * e; st.f = a.f + (tf - a.f) * e;
        if (u >= 1) { st.p = tp; st.l = tl; st.f = tf; }
        render();
        if (o.onChange) o.onChange(st);
        raf = u < 1 ? requestAnimationFrame(tick) : 0;
      }
      raf = requestAnimationFrame(tick);
    }
    ctx.onCleanup(stop);
    render();
    return {
      state: st,
      set: function (p, l, f) { stop(); st.p = p; st.l = l; st.f = f; render(); },
      animateTo: animateTo,
      posterior: function () { var d = st.p * st.l + (1 - st.p) * st.f; return st.p * st.l / d; }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Steps                                                               */
  /* ------------------------------------------------------------------ */

  function mountRain(el, ctx) {
    injectStyle();
    var W = 600, H = 440, cell = 34, gap = 4, gx = 104, gy = 50, split = 14;
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': PFX + 'svg' }, el);
    function cx(c) { return gx + c * (cell + gap) + (c >= 4 ? split : 0); }
    for (var c = 0; c < 10; c++) {
      for (var r = 0; r < 10; r++) {
        var cloudy = c < 4;
        var rain = cloudy ? r >= 4 : r >= 9; // bottom 6 rows, or bottom row
        M4.svg('rect', {
          x: cx(c), y: gy + r * (cell + gap), width: cell, height: cell, rx: 7,
          fill: cloudy ? C.yellow : C.blue,
          'fill-opacity': rain ? (cloudy ? 1 : 0.85) : (cloudy ? 0.25 : 0.12)
        }, svg);
      }
    }
    function lab(x, str) {
      var t = M4.svg('text', { x: x, y: gy - 16, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: C.ink }, svg);
      t.textContent = str;
    }
    lab((cx(0) + cx(3) + cell) / 2, 'cloudy: 40 days');
    lab((cx(4) + cx(9) + cell) / 2, 'clear: 60 days');
    var leg = M4.el('div', { 'class': 'm4-row ' + PFX + 'legend' }, el);
    function chip(col, op, str) {
      var ch = M4.el('span', { 'class': 'm4-chip' }, leg);
      M4.el('span', { 'class': PFX + 'sw', style: 'background:' + col + ';opacity:' + op }, ch);
      M4.el('span', { text: str }, ch);
    }
    chip(C.yellow, 1, 'cloudy, rain: 24');
    chip(C.yellow, 0.25, 'cloudy, dry: 16');
    chip(C.blue, 0.85, 'clear, rain: 6');
    chip(C.blue, 0.12, 'clear, dry: 54');
    var msgs = {
      0: 'That is \\(P(\\text{rain} \\cap \\text{cloudy}) = 24/100\\), a share of all days. Conditioning on a cloudy morning restricts the count to the 40 cloudy days.',
      1: 'That is \\(P(\\text{rain}) = 30/100\\), which ignores the information that the morning was cloudy.',
      3: 'That is \\(P(\\text{cloudy} \\mid \\text{rain}) = 24/30\\). The question conditions the other way round: among cloudy mornings, how many had rain.'
    };
    M4.choices(el, {
      options: ['\\(0.24\\)', '\\(0.30\\)', '\\(0.60\\)', '\\(0.80\\)'],
      correct: 2,
      onCorrect: function () {
        ctx.note('Among the 40 cloudy mornings, 24 had rain: \\(24/40 = 0.60\\).');
        ctx.solved();
      },
      onWrong: function (i) { ctx.wrong(); ctx.note(msgs[i] || 'Count only the cloudy days.'); }
    });
  }

  function mountExploreSquare(el, ctx) {
    injectStyle();
    var sq = square(el, ctx, { p: 0.3, l: 0.8, f: 0.2, drag: { p: true, l: true, f: true }, snap: 0.01 });
    var row = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin-top:12px' }, el);
    M4.button(row, 'Rare hypothesis', function () { sq.animateTo(0.05, 0.9, 0.1); });
    M4.button(row, 'Common hypothesis', function () { sq.animateTo(0.6, 0.9, 0.1); });
    M4.button(row, 'Uninformative data', function () { sq.animateTo(0.3, 0.5, 0.5); });
    M4.el('div', { 'class': 'm4-note ' + PFX + 'center', text: 'Drag the three handles on the edges of the square, or choose a preset.' }, el);
  }

  function mountTokens(el, ctx) {
    injectStyle();
    var parts = [
      { k: 'posterior', sym: 'P(H \\mid D)', what: 'the probability of the hypothesis after the data are seen' },
      { k: 'likelihood', sym: 'P(D \\mid H)', what: 'the probability of the data if the hypothesis is true' },
      { k: 'prior', sym: 'P(H)', what: 'the probability of the hypothesis before any data are seen' },
      { k: 'evidence', sym: 'P(D)', what: 'the total probability of the data, summed over both columns of the square' }
    ];
    var byKey = {};
    parts.forEach(function (p) { byKey[p.k] = p; });
    var slots = [];
    var formula = M4.el('div', { 'class': PFX + 'formula' }, el);
    function cell(parent, part) {
      var c = M4.el('div', { 'class': PFX + 'cell' }, parent);
      var s = M4.el('div', { 'class': 'm4-slot' }, c);
      s.setAttribute('data-k', part.k);
      M4.el('div', { html: M4.tex(part.sym) }, c);
      slots.push(s);
    }
    cell(formula, parts[0]);
    M4.el('div', { 'class': PFX + 'op', text: '=' }, formula);
    var frac = M4.el('div', { 'class': PFX + 'frac' }, formula);
    var num = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;flex-wrap:nowrap' }, frac);
    cell(num, parts[1]);
    M4.el('div', { 'class': PFX + 'op', text: '\u00d7' }, num);
    cell(num, parts[2]);
    M4.el('div', { 'class': PFX + 'fracline' }, frac);
    cell(frac, parts[3]);

    var tray = M4.el('div', { 'class': 'm4-row ' + PFX + 'tokens' }, el);
    var tokens = ['evidence', 'prior', 'posterior', 'likelihood'].map(function (k) {
      var t = M4.el('div', { 'class': 'm4-token', text: k }, tray);
      t.setAttribute('data-k', k);
      return t;
    });
    var done = 0;
    M4.dragDrop({
      tokens: tokens,
      slots: slots,
      onDrop: function (tok, slot) {
        var tk = tok.getAttribute('data-k'), sk = slot.getAttribute('data-k');
        function back() {
          // undo any snapping the framework may have done, so the token stays usable
          if (tok.parentNode !== tray) tray.appendChild(tok);
          tok.style.transform = ''; tok.style.left = ''; tok.style.top = ''; tok.style.position = '';
        }
        if (slot.getAttribute('data-done') === '1') { back(); return; }
        if (tk === sk) {
          slot.textContent = tk;
          slot.setAttribute('data-done', '1');
          slot.classList.add('filled');
          slot.classList.add('m4-pop');
          tok.style.display = 'none';
          done += 1;
          ctx.note('Correct: ' + M4.tex(byKey[sk].sym) + ' is the ' + sk + ', ' + byKey[sk].what + '.');
          if (done === 4) ctx.solved();
        } else {
          back();
          slot.classList.remove('filled');
          ctx.wrong();
          ctx.note(M4.tex(byKey[sk].sym) + ' is ' + byKey[sk].what + '. That is not the ' + tk + '.');
        }
      },
      onMiss: function () { ctx.note('Drop each name onto one of the dashed boxes in the formula.'); }
    });
  }

  function mountBuild(el, ctx) {
    injectStyle();
    var facts = M4.el('div', { 'class': 'm4-row ' + PFX + 'facts' }, el);
    ['20% of emails are spam', 'word in 80% of spam', 'word in 10% of non-spam'].forEach(function (s) {
      M4.el('span', { 'class': 'm4-chip', text: s }, facts);
    });
    var target = { p: 0.2, l: 0.8, f: 0.1 };
    var label = { p: 'prior', l: 'likelihood for spam', f: 'likelihood for non-spam' };
    var solved = false;
    function status(st) {
      var bad = ['p', 'l', 'f'].filter(function (k) { return !near(st[k], target[k]); });
      return bad;
    }
    square(el, ctx, {
      p: 0.5, l: 0.5, f: 0.5, drag: { p: true, l: true, f: true }, snap: 0.05, target: target,
      names: { H: 'spam', notH: 'not spam', D: 'word' },
      tex: {
        jh: 'P(\\text{word} \\cap \\text{spam})', jn: 'P(\\text{word} \\cap \\text{not spam})',
        d: 'P(\\text{word})', post: 'P(\\text{spam} \\mid \\text{word})'
      },
      onChange: function (st) {
        if (solved) return;
        var bad = status(st);
        if (bad.length) ctx.note('Still to set: ' + bad.map(function (k) { return label[k]; }).join(', ') + '.');
      },
      onEnd: function (st) {
        if (solved) return;
        var bad = status(st);
        if (!bad.length) {
          solved = true;
          ctx.note('The square matches. \\(P(\\text{spam} \\mid \\text{word}) = \\dfrac{0.16}{0.16 + 0.08} \\approx 0.667\\): the word raises the probability of spam from 0.20 to about 0.67.');
          ctx.solved();
        } else if (near(st.l, target.f) && near(st.f, target.l)) {
          ctx.note('The two vertical handles are swapped: the left one belongs to spam (0.80), the right one to non-spam (0.10).');
        }
      }
    });
  }

  function mountIcons(el, ctx) {
    injectStyle();
    var COLS = 40, ROWS = 25, N = 1000, sp = 14.5, r = 5.2;
    var W = 600, H = Math.round(ROWS * sp + 16);
    var svg = M4.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': PFX + 'svg' }, el);
    var dots = [];
    for (var i = 0; i < N; i++) {
      var c = Math.floor(i / ROWS), rw = i % ROWS;
      dots.push(M4.svg('circle', { cx: 17 + c * sp, cy: 15 + rw * sp, r: r, 'stroke-width': 1.6 }, svg));
    }
    var leg = M4.el('div', { 'class': 'm4-row ' + PFX + 'legend' }, el);
    function chip(fill, stroke, str) {
      var ch = M4.el('span', { 'class': 'm4-chip' }, leg);
      M4.el('span', { 'class': PFX + 'sw', style: 'border-radius:50%;background:' + fill + ';border-color:' + stroke }, ch);
      M4.el('span', { text: str }, ch);
    }
    chip(C.yellow, C.orange, 'ill, positive');
    chip('#fff', C.orange, 'ill, negative');
    chip(C.blue, C.blue, 'healthy, positive');
    chip(C.line, C.line, 'healthy, negative');

    var row = M4.el('div', { 'class': 'm4-row ' + PFX + 'readouts' }, el);
    function pill(lbl, extra) {
      var p = M4.el('span', { 'class': 'm4-readout' + (extra ? ' ' + extra : '') }, row);
      M4.el('span', { html: lbl + ' ' }, p);
      return M4.el('span', { text: '' }, p);
    }
    var vPos = pill('positive tests:'), vTp = pill('of these ill:');
    var vPost = pill(M4.tex('P(\\text{ill} \\mid \\text{positive})') + ' =', PFX + 'post');

    var prev = 0.01, fpr = 0.10, sens = 0.9, only = false;
    function render() {
      var nIll = Math.round(N * prev), tp = Math.round(nIll * sens);
      var fp = Math.round((N - nIll) * fpr);
      for (var i = 0; i < N; i++) {
        var d = dots[i], pos, fill, stroke;
        if (i < nIll) {
          pos = i < tp; fill = pos ? C.yellow : '#fff'; stroke = C.orange;
        } else {
          pos = (i - nIll) < fp; fill = pos ? C.blue : C.line; stroke = pos ? C.blue : C.line;
        }
        d.setAttribute('fill', fill); d.setAttribute('stroke', stroke);
        d.setAttribute('opacity', only && !pos ? 0.12 : 1);
      }
      vPos.textContent = String(tp + fp);
      vTp.textContent = String(tp);
      vPost.textContent = (tp + fp) > 0 ? f3(tp / (tp + fp)) : 'n/a';
    }
    var pct = function (v) { return Math.round(v * 100) + '%'; };
    M4.slider(el, { min: 0.01, max: 0.5, step: 0.01, value: prev, label: 'Prevalence P(ill)', format: pct, onInput: function (v) { prev = +v; render(); } });
    M4.slider(el, { min: 0.01, max: 0.3, step: 0.01, value: fpr, label: 'False positive rate', format: pct, onInput: function (v) { fpr = +v; render(); } });
    var brow = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin-top:10px' }, el);
    var btn = M4.button(brow, 'Dim the negative tests', function () {
      only = !only;
      btn.textContent = only ? 'Show everyone' : 'Dim the negative tests';
      render();
    });
    M4.el('div', { 'class': 'm4-note ' + PFX + 'center', text: 'Each dot is one of 1000 people. The test detects 90% of ill people. Counts are rounded to whole people.' }, el);
    render();
  }

  function mountBaseRate(el, ctx) {
    injectStyle();
    var facts = M4.el('div', { 'class': 'm4-row ' + PFX + 'facts' }, el);
    ['1000 people', '2% are ill', 'test positive for 90% of ill people', 'test positive for 5% of healthy people'].forEach(function (s) {
      M4.el('span', { 'class': 'm4-chip', text: s }, facts);
    });
    M4.numberInput(el, {
      answer: 18 / 67, tolerance: 0.006, placeholder: 'e.g. 0.42',
      label: 'P(ill | positive) =',
      onCorrect: function () {
        ctx.note('18 ill people and 49 healthy people test positive, so \\(P(\\text{ill} \\mid \\text{positive}) = 18/67 \\approx 0.269\\). Most positive results come from the much larger healthy group.');
        ctx.solved();
      },
      onWrong: function (v) {
        var m;
        if (!isFinite(v)) m = 'Enter a number between 0 and 1.';
        else if (v > 1) m = 'Enter a probability between 0 and 1, not a percentage or a count.';
        else if (Math.abs(v - 0.9) < 0.006) m = '0.90 is \\(P(\\text{positive} \\mid \\text{ill})\\), the likelihood. The question asks for the reverse conditional.';
        else if (Math.abs(v - 0.018) < 0.002) m = '0.018 is the joint probability \\(P(\\text{ill} \\cap \\text{positive})\\). Divide it by \\(P(\\text{positive})\\).';
        else if (Math.abs(v - 0.067) < 0.002) m = '0.067 is \\(P(\\text{positive})\\), the evidence. It is the denominator, not the answer.';
        else if (Math.abs(v - 0.02) < 0.002) m = '0.02 is the prior. A positive test must change it.';
        else m = 'Count the ill people who test positive, then divide by everyone who tests positive.';
        ctx.wrong(); ctx.note(m);
      }
    });
  }

  function mountSlide(el, ctx) {
    injectStyle();
    var solved = false;
    var sq = square(el, ctx, {
      p: 0.01, l: 0.9, f: 0.1, drag: {}, half: true,
      names: { H: 'ill', notH: 'healthy', D: 'pos' },
      tex: {
        jh: 'P(\\text{pos} \\cap \\text{ill})', jn: 'P(\\text{pos} \\cap \\text{healthy})',
        d: 'P(\\text{pos})', post: 'P(\\text{ill} \\mid \\text{pos})'
      },
      barNote: 'The dashed mark is one half. Move the prior until the yellow share ends exactly there.'
    });
    M4.slider(el, {
      min: 0.01, max: 0.5, step: 0.01, value: 0.01, label: 'Prior P(ill)', format: function (v) { return (+v).toFixed(2); },
      onInput: function (v) { sq.set(+v, 0.9, 0.1); }
    });
    var row = M4.el('div', { 'class': 'm4-row', style: 'justify-content:center;margin-top:10px' }, el);
    M4.button(row, 'Check', function () {
      if (solved) return;
      var post = sq.posterior();
      if (Math.abs(post - 0.5) < 0.005) {
        solved = true;
        ctx.note('At a prior of 0.10 the two coloured areas are equal: \\(0.10 \\times 0.9 = 0.90 \\times 0.1 = 0.09\\), so the posterior is \\(0.5\\).');
        ctx.solved();
      } else if (post < 0.5) {
        ctx.wrong(); ctx.note('The posterior is ' + f3(post) + ', below one half. The yellow area is still smaller than the blue one. Increase the prior.');
      } else {
        ctx.wrong(); ctx.note('The posterior is ' + f3(post) + ', above one half. The yellow area is now larger than the blue one. Decrease the prior.');
      }
    }, { primary: true });
  }

  function mountFinal(el, ctx) {
    injectStyle();
    var facts = M4.el('div', { 'class': 'm4-row ' + PFX + 'facts' }, el);
    ['prior P(ill) = 0.25', 'P(pos | ill) = 0.9', 'P(pos | healthy) = 0.3', 'two independent positive tests'].forEach(function (s) {
      M4.el('span', { 'class': 'm4-chip', text: s }, facts);
    });
    square(el, ctx, {
      p: 0.25, l: 0.9, f: 0.3, drag: { p: true }, snap: 0.05, showPost: false,
      names: { H: 'ill', notH: 'healthy', D: 'pos' },
      tex: {
        jh: 'P(\\text{pos} \\cap \\text{ill})', jn: 'P(\\text{pos} \\cap \\text{healthy})',
        d: 'P(\\text{pos})', post: ''
      }
    });
    M4.el('div', { 'class': 'm4-note ' + PFX + 'center', text: 'The square shows one test. Drag the prior handle to reuse it for the second test.' }, el);
    M4.numberInput(el, {
      answer: 0.75, tolerance: 0.006, placeholder: 'e.g. 0.42',
      label: 'P(ill | two positives) =',
      onCorrect: function () {
        ctx.note('After the first test: \\(\\dfrac{0.225}{0.225 + 0.225} = 0.5\\). With prior \\(0.5\\), the second test gives \\(\\dfrac{0.45}{0.45 + 0.15} = 0.75\\).');
        ctx.solved();
      },
      onWrong: function (v) {
        var m;
        if (!isFinite(v)) m = 'Enter a number between 0 and 1.';
        else if (v > 1) m = 'Enter a probability between 0 and 1.';
        else if (Math.abs(v - 0.5) < 0.006) m = '0.5 is the posterior after the first positive test. Use it as the prior for the second test and update once more.';
        else if (Math.abs(v - 0.9) < 0.006) m = '0.9 is the likelihood \\(P(\\text{pos} \\mid \\text{ill})\\), not a posterior.';
        else if (Math.abs(v - 0.81) < 0.006) m = '0.81 is \\(P(\\text{two positives} \\mid \\text{ill})\\). It still has to be weighted by the prior and divided by the evidence.';
        else if (Math.abs(v - 0.2025) < 0.004) m = '0.2025 is the joint probability of being ill and testing positive twice. Divide by the total probability of two positives.';
        else m = 'Update in two stages: compute the posterior after one positive test, then set the prior handle to that value and read off the new areas.';
        ctx.wrong(); ctx.note(m);
      }
    });
  }

  M4.lesson({
    id: 'probability-s3',
    module: 'probability',
    title: 'Conditional probability and Bayes rule',
    summary: 'How observed data change a probability: the unit-square picture, prior, likelihood and posterior, and why base rates matter.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'Updating a probability',
        html: '<p>A probability describes uncertainty given what is currently known. When new information arrives, the probability should change, and conditional probability states how.</p>' +
          '<p>In this lesson you will compute a conditional probability from counts or areas, name the four terms of Bayes rule, and explain why a positive result from an accurate test can still leave the tested condition unlikely.</p>'
      },
      {
        kind: 'text',
        title: 'Conditional probability',
        html: '<p>Let \\(A\\) and \\(B\\) be events with \\(P(B) > 0\\). The conditional probability of \\(A\\) given \\(B\\), written \\(P(A \\mid B)\\), is the probability of \\(A\\) once it is known that \\(B\\) has occurred:</p>' +
          '\\[ P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)} . \\]' +
          '<p>Here \\(A \\cap B\\) is the event that both occur. Conditioning discards every outcome outside \\(B\\) and measures \\(A\\) as a share of what remains.</p>'
      },
      {
        kind: 'exercise',
        title: 'Conditioning on counts',
        html: '<p>A record of 100 days is drawn as 100 tiles. The four left columns are days with a cloudy morning, the six right columns are days with a clear morning, and the strongly coloured tiles are days with rain. What is \\(P(\\text{rain} \\mid \\text{cloudy})\\)?</p>',
        hint: 'Ignore the 60 clear days completely. Of the 40 cloudy tiles, count the strongly coloured ones.',
        mount: mountRain
      },
      {
        kind: 'explore',
        title: 'The unit square',
        html: '<p>Let \\(H\\) be a hypothesis and \\(D\\) an observation (the data). \\(\\neg H\\) means that \\(H\\) is false. A square of area 1 is cut vertically so that the left column has width \\(P(H)\\), called the <b>prior</b>. Each column is then filled from the bottom up to the height \\(P(D \\mid H)\\) or \\(P(D \\mid \\neg H)\\), the <b>likelihood</b> of the data in that column.</p>' +
          '<p>Each coloured rectangle has area width times height, which is a joint probability such as \\(P(D \\cap H) = P(D \\mid H)\\,P(H)\\). Observing \\(D\\) keeps only the coloured area. The yellow share of it is the <b>posterior</b> \\(P(H \\mid D)\\).</p>',
        mount: mountExploreSquare
      },
      {
        kind: 'exercise',
        title: 'The four terms of Bayes rule',
        html: '<p>Reading the posterior off the square gives Bayes rule:</p>' +
          '\\[ P(H \\mid D) = \\frac{P(D \\mid H)\\,P(H)}{P(D)}, \\qquad P(D) = P(D \\mid H)\\,P(H) + P(D \\mid \\neg H)\\,P(\\neg H). \\]' +
          '<p>The denominator \\(P(D)\\), the total coloured area, is called the <b>evidence</b>. Drag each name onto the term it denotes.</p>',
        hint: 'The prior involves no data at all. The likelihood has the data on the left of the bar and the hypothesis on the right. The posterior has them the other way round.',
        mount: mountTokens
      },
      {
        kind: 'exercise',
        title: 'A spam filter',
        html: '<p>A spam filter treats "the email is spam" as the hypothesis and "the email contains a particular word" as the data. Drag the three handles until the square represents the figures below. The dashed lines show the target.</p>',
        hint: 'The bottom handle sets the prior 0.20. The left handle sets the height of the spam column, 0.80, and the right handle the height of the non-spam column, 0.10.',
        mount: mountBuild
      },
      {
        kind: 'explore',
        title: 'Base rates',
        html: '<p>The prior of a condition in a population is called its base rate or prevalence. When the base rate is low, the healthy group is so large that even a small false positive rate, \\(P(\\text{positive} \\mid \\text{healthy})\\), produces many positive results.</p>' +
          '<p>Vary the prevalence and the false positive rate and compare the number of yellow dots with the number of blue dots. The posterior is the yellow fraction among all filled dots.</p>',
        mount: mountIcons
      },
      {
        kind: 'exercise',
        title: 'A positive test',
        html: '<p>Use the figures below to compute the probability that a person who tests positive is ill. Give the answer as a decimal between 0 and 1.</p>',
        hint: 'Of 1000 people, 20 are ill and 18 of them test positive. Of the 980 healthy people, 5% test positive, which is 49. The posterior is 18 divided by all positives.',
        mount: mountBaseRate
      },
      {
        kind: 'exercise',
        title: 'Size of the prior',
        html: '<p>A test has \\(P(\\text{pos} \\mid \\text{ill}) = 0.9\\) and \\(P(\\text{pos} \\mid \\text{healthy}) = 0.1\\). Move the prior until a positive result makes illness exactly as probable as health, that is \\(P(\\text{ill} \\mid \\text{pos}) = 0.5\\), then press Check.</p>',
        hint: 'The posterior is one half when the two coloured areas are equal: 0.9 \u00d7 p = 0.1 \u00d7 (1 \u2212 p), where p is the prior.',
        mount: mountSlide
      },
      {
        kind: 'text',
        title: 'Bayes rule in machine learning',
        html: '<p>A classifier that outputs a probability for each class is estimating a posterior \\(P(\\text{class} \\mid \\text{input})\\). The naive Bayes classifier computes it directly from Bayes rule, multiplying a class prior by the likelihoods of the observed words, as in the spam square.</p>' +
          '<p>The same structure governs learning itself: in Bayesian inference a prior over model parameters is combined with the likelihood of the training data to give a posterior over parameters. Class imbalance in a data set is a base-rate effect, which is why accuracy alone can mislead for rare classes.</p>'
      },
      {
        kind: 'exercise',
        title: 'Two tests in a row',
        html: '<p>Bayes rule can be applied repeatedly: the posterior after one observation serves as the prior for the next, provided the observations are independent given the hypothesis. A person with prior probability 0.25 of being ill takes the same test twice and both results are positive. Compute the probability of illness after both tests.</p>',
        hint: 'First update once: 0.25 \u00d7 0.9 against 0.75 \u00d7 0.3. Set the prior handle to the resulting posterior and compare the two new areas.',
        mount: mountFinal
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>Conditioning on \\(B\\) restricts attention to \\(B\\): \\(P(A \\mid B) = P(A \\cap B) / P(B)\\).</li>' +
          '<li>Bayes rule, \\(P(H \\mid D) = P(D \\mid H)\\,P(H) / P(D)\\), turns a prior and a likelihood into a posterior. In the unit square it is one coloured area divided by the total coloured area.</li>' +
          '<li>A low base rate can outweigh a high likelihood, and each posterior can serve as the prior for the next independent observation.</li>' +
          '</ul>'
      }
    ]
  });
})();
