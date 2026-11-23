(function () {
  'use strict';

  var M4 = window.M4;
  var C = M4.colors;

  // ---------- local helpers ----------
  function injectStyle() {
    if (document.getElementById('eigen-s2-style')) return;
    var s = document.createElement('style');
    s.id = 'eigen-s2-style';
    s.textContent =
      '.eigen-s2-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%}' +
      '.eigen-s2-plane{width:100%;max-width:520px}' +
      '.eigen-s2-done{background:#16b56b !important;color:#fff !important;border-color:#16b56b !important}' +
      '.eigen-s2-tray{display:flex;justify-content:center;align-items:center;gap:14px;flex-wrap:wrap;min-height:64px;width:100%}' +
      '.eigen-s2-slots{display:flex;justify-content:center;align-items:flex-start;gap:18px;flex-wrap:wrap;width:100%}' +
      '.eigen-s2-slotcol{display:flex;flex-direction:column;align-items:center;gap:8px}' +
      '.eigen-s2-slot{min-width:150px;min-height:64px;display:flex;align-items:center;justify-content:center}' +
      '.eigen-s2-slotlabel{font-weight:700;font-size:16px}' +
      '.eigen-s2-token{font-size:20px;padding:10px 18px;touch-action:none}' +
      '.eigen-s2-big{font-size:22px;text-align:center}';
    document.head.appendChild(s);
  }

  function mul(A, v) {
    return [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
  }
  function len(v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1]); }
  function angleDeg(a, b) {
    var cr = a[0] * b[1] - a[1] * b[0];
    var d = a[0] * b[0] + a[1] * b[1];
    return Math.atan2(Math.abs(cr), d) * 180 / Math.PI;
  }
  function fmt(x, n) {
    var s = x.toFixed(n === undefined ? 2 : n);
    if (parseFloat(s) === 0) s = (0).toFixed(n === undefined ? 2 : n);
    return s.replace('-', '−');
  }
  function vecStr(v, n) { return M4.col([fmt(v[0], n), fmt(v[1], n)]); }
  function matTex(A) {
    return '\\begin{bmatrix}' + A[0][0] + ' & ' + A[0][1] + ' \\\\ ' + A[1][0] + ' & ' + A[1][1] + '\\end{bmatrix}';
  }
  function setArrow(a, x, y) {
    if (Math.abs(x) + Math.abs(y) < 1e-6) { a.set(0, 0, 1e-3, 0); } else { a.set(0, 0, x, y); }
  }
  function show(obj, on) { obj.el.style.display = on ? '' : 'none'; }
  function wrapEl(el) {
    injectStyle();
    return M4.el('div', { class: 'eigen-s2-wrap' }, el);
  }
  function matrixHeader(parent, A) {
    var row = M4.el('div', { class: 'm4-row' }, parent);
    M4.el('span', { class: 'eigen-s2-big', html: M4.tex('A = ' + matTex(A)) }, row);
    return row;
  }
  function planeBox(parent, opts) {
    var box = M4.el('div', { class: 'eigen-s2-plane' }, parent);
    return M4.plane(box, opts);
  }

  // A plane showing v (blue) and Av (pink; green when aligned), with labels that sit beside the tips.
  function vectorPair(p, unit) {
    var o = {};
    o.span = p.line(0, 0, 0, 0, { stroke: C.blue, width: 1.5, dash: '6 6' });
    o.avPink = p.arrow(0, 0, 1, 0, { stroke: C.pink, width: 7 });
    o.avGreen = p.arrow(0, 0, 1, 0, { stroke: C.green, width: 7 });
    o.v = p.arrow(0, 0, 1, 0, { stroke: C.blue, width: 4 });
    o.lv = p.text(0, 0, 'v', { fill: C.blue, size: 20, weight: 700 });
    o.lav = p.text(0, 0, 'Av', { fill: C.pink, size: 20, weight: 700 });
    o.update = function (v, w, aligned, R) {
      var L = len(v) || 1;
      var d = [v[0] / L, v[1] / L];
      o.span.set(-d[0] * R, -d[1] * R, d[0] * R, d[1] * R);
      setArrow(o.avPink, w[0], w[1]);
      setArrow(o.avGreen, w[0], w[1]);
      show(o.avPink, !aligned);
      show(o.avGreen, aligned);
      setArrow(o.v, v[0], v[1]);
      // v label: beyond the tip, pushed to the left of v; Av label: pushed to the right of Av
      o.lv.set(v[0] + d[0] * unit * 0.6 - d[1] * unit, v[1] + d[1] * unit * 0.6 + d[0] * unit - unit * 0.3, 'v');
      var Lw = len(w) || 1;
      var e = [w[0] / Lw, w[1] / Lw];
      o.lav.set(w[0] + e[0] * unit * 0.6 + e[1] * unit * 1.2, w[1] + e[1] * unit * 0.6 - e[0] * unit * 1.2 - unit * 0.3, 'Av');
    };
    return o;
  }

  // Probe on the unit circle. opts.onChange(v, Av, angle), opts.onEnd(api)
  function probeWidget(el, A, startDeg, opts) {
    var wrap = wrapEl(el);
    matrixHeader(wrap, A);
    var p = planeBox(wrap, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 520, height: 520 });
    var pts = [];
    for (var i = 0; i < 72; i++) {
      pts.push([Math.cos(i * Math.PI / 36), Math.sin(i * Math.PI / 36)]);
    }
    p.path(pts, { stroke: C.muted, width: 1.5, closed: true });
    var pair = vectorPair(p, 0.3);
    var row = M4.el('div', { class: 'm4-row' }, wrap);
    var rAng = M4.el('span', { class: 'm4-readout' }, row);
    var rStr = M4.el('span', { class: 'm4-readout' }, row);
    var rAv = M4.el('span', { class: 'm4-readout' }, row);
    var th = startDeg * Math.PI / 180;
    var v = [Math.cos(th), Math.sin(th)];
    var busy = false;
    var handle;
    var api = { wrap: wrap, v: v, angle: 0 };

    function render() {
      var w = mul(A, v);
      var ang = angleDeg(v, w);
      api.v = v; api.w = w; api.angle = ang;
      var aligned = ang < (opts.tol || 2);
      pair.update(v, w, aligned, 6);
      rAng.textContent = 'angle between v and Av: ' + fmt(ang, 1) + '°';
      rStr.textContent = '|Av| / |v| = ' + fmt(len(w));
      rAv.innerHTML = M4.tex('A\\mathbf{v} = ' + vecStr(w));
      if (opts.onChange) opts.onChange(api, aligned);
    }
    api.setV = function (nv) {
      var L = len(nv);
      if (L < 1e-9) return;
      v = [nv[0] / L, nv[1] / L];
      if (handle) { busy = true; handle.set(v[0], v[1]); busy = false; }
      render();
    };
    handle = p.handle(v[0], v[1], {
      color: C.blue, r: 12,
      onDrag: function (x, y) {
        if (busy) return;
        api.setV([x, y]);
      },
      onEnd: function () {
        if (busy) return;
        api.setV(v);
        if (opts.onEnd) opts.onEnd(api);
      }
    });
    render();
    return api;
  }

  // The plane morphs from the identity (t = 0) to A (t = 1). Eight arrows ride along.
  // opts.colorize: arrows that stay on their own dashed line turn green, the others pink.
  // opts.onEnd(): called when t reaches 1.
  var warpId = 0;
  function recolor(arrow, col) {
    var ln = arrow.el.querySelector('line'), hd = arrow.el.querySelector('polygon');
    if (ln) ln.setAttribute('stroke', col);
    if (hd) { hd.setAttribute('fill', col); hd.setAttribute('stroke', col); }
  }
  function warpScene(el, A, opts) {
    opts = opts || {};
    var R = 5, Lv = 1.5;
    var wrap = wrapEl(el);
    matrixHeader(wrap, A);
    var p = planeBox(wrap, { xmin: -R, xmax: R, ymin: -R, ymax: R, width: 520, height: 520 });
    var id = 'eigen-s2-clip-' + (++warpId);
    var defs = M4.svg('defs', {}, p.svg);
    var cp = M4.svg('clipPath', { id: id }, defs);
    M4.svg('rect', { x: p.x(-R), y: p.y(R), width: p.x(R) - p.x(-R), height: p.y(-R) - p.y(R) }, cp);
    var grid = M4.svg('path', {
      fill: 'none', stroke: C.blue, 'stroke-width': 1.6, 'stroke-opacity': 0.4,
      'clip-path': 'url(#' + id + ')', 'pointer-events': 'none'
    });
    p.g.insertBefore(grid, p.g.firstChild);
    var cell = p.path([[0, 0], [1, 0], [1, 1], [0, 1]], { stroke: C.blue, width: 2, closed: true, fill: C.blue });
    cell.el.setAttribute('fill-opacity', '0.14');
    var k, dirs = [];
    for (k = 0; k < 4; k++) {
      var a = k * Math.PI / 4, c = Math.cos(a), sn = Math.sin(a);
      p.line(-R * 1.5 * c, -R * 1.5 * sn, R * 1.5 * c, R * 1.5 * sn, { stroke: C.muted, width: 1.5, dash: '6 6' });
    }
    for (k = 0; k < 8; k++) {
      var b = k * Math.PI / 4;
      var v = [Lv * Math.cos(b), Lv * Math.sin(b)];
      dirs.push({ v: v, w: mul(A, v), arrow: p.arrow(0, 0, v[0], v[1], { stroke: C.ink, width: 5 }) });
    }
    var t = 0, raf = 0, slider, ended = false;
    function M(tt) {
      return [[1 + tt * (A[0][0] - 1), tt * A[0][1]], [tt * A[1][0], 1 + tt * (A[1][1] - 1)]];
    }
    function render() {
      var Mt = M(t), e1 = [Mt[0][0], Mt[1][0]], e2 = [Mt[0][1], Mt[1][1]];
      var d = '', N = 30, L = 40, j;
      function seg(ax, ay, bx, by) {
        d += 'M' + p.x(ax).toFixed(1) + ' ' + p.y(ay).toFixed(1) + 'L' + p.x(bx).toFixed(1) + ' ' + p.y(by).toFixed(1);
      }
      for (j = -N; j <= N; j++) {
        seg(j * e1[0] - L * e2[0], j * e1[1] - L * e2[1], j * e1[0] + L * e2[0], j * e1[1] + L * e2[1]);
        seg(j * e2[0] - L * e1[0], j * e2[1] - L * e1[1], j * e2[0] + L * e1[0], j * e2[1] + L * e1[1]);
      }
      grid.setAttribute('d', d);
      cell.set([[0, 0], e1, [e1[0] + e2[0], e1[1] + e2[1]], e2]);
      for (j = 0; j < dirs.length; j++) {
        var q = dirs[j], x = mul(Mt, q.v);
        q.arrow.set(0, 0, x[0], x[1]);
        var col = C.ink;
        if (opts.colorize && t > 0.04) col = angleDeg(q.v, x) < 1 ? C.green : C.pink;
        recolor(q.arrow, col);
      }
      if (t >= 0.999 && !ended) { ended = true; if (opts.onEnd) opts.onEnd(); }
    }
    var box = M4.el('div', { style: 'width:100%;max-width:520px' }, wrap);
    slider = M4.slider(box, {
      min: 0, max: 1, step: 0.01, value: 0, label: 't',
      format: function (x) { return Number(x).toFixed(2); },
      onInput: function (x) { cancelAnimationFrame(raf); t = Number(x); render(); }
    });
    M4.button(wrap, 'Play', function () {
      cancelAnimationFrame(raf);
      var t0 = null;
      function frame(now) {
        if (t0 === null) t0 = now;
        var u = Math.min(1, (now - t0) / 2600);
        t = u * u * (3 - 2 * u);
        slider.set(Math.round(t * 100) / 100);
        render();
        if (u < 1) raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }, { primary: true });
    return { wrap: wrap, render: render, stop: function () { cancelAnimationFrame(raf); } };
  }

  // ---------- matrices used ----------
  var A1 = [[2, 1], [1, 2]];   // eigenvectors (1,1) lambda 3, (1,-1) lambda 1
  var A2 = [[3, 1], [0, 2]];   // eigenvectors (1,0) lambda 3, (1,-1) lambda 2
  var A3 = [[4, 1], [2, 3]];   // (1,1) lambda 5
  var A4 = [[1, 2], [2, 1]];   // (1,-1) lambda -1
  var A5 = [[2, 2], [1, 3]];   // (1,1) lambda 4, (2,-1) lambda 1

  M4.lesson({
    id: 'eigen-s2',
    module: 'eigen',
    title: 'Eigenvectors',
    summary: 'Some directions are only stretched by a matrix, not rotated. These are its eigenvectors, and the stretch factor of each is its eigenvalue.',
    minutes: 13,
    steps: [
      // 1
      {
        kind: 'text',
        title: 'Invariant directions',
        html:
          '<p>A matrix \\(A\\) sends each vector \\(\\mathbf{v}\\) to a new vector \\(A\\mathbf{v}\\). In general the output points in a different direction from the input.</p>' +
          '<p>For most matrices there are a few special directions in which the output stays on the same line as the input.</p><p>After this lesson you should be able to locate such directions by eye, state the definition of an eigenvector and an eigenvalue, and test whether a given vector is an eigenvector.</p>'
      },
      // 1b
      {
        kind: 'explore',
        title: 'Warping the plane',
        html:
          '<p>Think of \\(A\\) as a machine that moves every point of the plane at once. The slider blends from doing nothing (\\(t = 0\\)) to applying \\(A\\) in full (\\(t = 1\\)): the grid squares become slanted parallelograms, and eight arrows of equal length are carried along.</p>' +
          '<p>Each dashed line marks the line an arrow starts on. Press Play and follow the arrows. An arrow that turns away from its dashed line becomes pink. An arrow that stays on its line becomes green: it only gets longer or shorter.</p>',
        mount: function (el, ctx) {
          var sc = warpScene(el, A1, {
            colorize: true,
            onEnd: function () {
              ctx.note('Four arrows turn. The four along the diagonals never leave their lines: along \\(\\begin{pmatrix}1\\\\1\\end{pmatrix}\\) they grow to 3 times their length, along \\(\\begin{pmatrix}1\\\\-1\\end{pmatrix}\\) they keep their length. These are the special directions of \\(A\\).');
            }
          });
          ctx.onCleanup(sc.stop);
          sc.render();
        }
      },
      {
        kind: 'exercise',
        title: 'Directions that do not turn',
        html:
          '<p>Here is a different matrix, and this time the arrows keep one colour. Play the warp, or drag the slider slowly, and watch which arrows stay on their dashed lines.</p>' +
          '<p>Which two directions does \\(A\\) only stretch?</p>',
        hint: 'Drag the slider to \\(t = 1\\) and check each dashed line. The horizontal arrows stay horizontal. Which diagonal keeps its arrows?',
        mount: function (el, ctx) {
          var wo = {};
          var sc = warpScene(el, A2, wo);
          ctx.onCleanup(sc.stop);
          sc.render();
          var box = M4.el('div', { style: 'width:100%' }, sc.wrap);
          M4.choices(box, {
            options: ['\\(\\begin{pmatrix}1\\\\0\\end{pmatrix}\\) and \\(\\begin{pmatrix}0\\\\1\\end{pmatrix}\\)', '\\(\\begin{pmatrix}1\\\\0\\end{pmatrix}\\) and \\(\\begin{pmatrix}1\\\\-1\\end{pmatrix}\\)', '\\(\\begin{pmatrix}1\\\\1\\end{pmatrix}\\) and \\(\\begin{pmatrix}1\\\\-1\\end{pmatrix}\\)', '\\(\\begin{pmatrix}0\\\\1\\end{pmatrix}\\) and \\(\\begin{pmatrix}1\\\\1\\end{pmatrix}\\)'],
            correct: 1,
            onCorrect: function () {
              wo.colorize = true;
              sc.render();
              ctx.solved('\\(A(1, 0) = \\begin{pmatrix}3\\\\0\\end{pmatrix}\\) and \\(A(1, -1) = \\begin{pmatrix}2\\\\-2\\end{pmatrix}\\): both stay on their lines, stretched by 3 and by 2. The vertical arrows tip to the right, since \\(A(0, 1) = \\begin{pmatrix}1\\\\2\\end{pmatrix}\\).');
            },
            onWrong: function (k) {
              if (k === 0) ctx.wrong('The horizontal arrows stay put, but the vertical ones lean over: \\(A(0, 1) = (1, 2)\\).');
              else if (k === 2) ctx.wrong('\\(A(1, 1) = \\begin{pmatrix}4\\\\2\\end{pmatrix}\\), which is not on the line through \\(\\begin{pmatrix}1\\\\1\\end{pmatrix}\\).');
              else ctx.wrong('\\(A(0, 1) = \\begin{pmatrix}1\\\\2\\end{pmatrix}\\) leaves the vertical line. Look again at the horizontal arrows.');
            }
          });
        }
      },
      // 2
      {
        kind: 'explore',
        title: 'A rotating probe vector',
        html:
          '<p>To find such directions precisely, test one direction at a time. The blue arrow is a probe vector \\(\\mathbf{v}\\) of length 1, and the pink arrow is its image \\(A\\mathbf{v}\\). The dashed line is the line through \\(\\mathbf{v}\\).</p>' +
          '<p>Drag the blue point around the circle and observe the angle between the two arrows. At certain positions the pink arrow falls onto the dashed line and turns green.</p>',
        mount: function (el, ctx) {
          var last = null;
          var api = probeWidget(el, A1, 20, {
            tol: 4,
            onChange: function (a, aligned) {
              var msg = aligned
                ? 'Aligned: here \\(A\\mathbf{v}\\) is about ' + Math.round(len(a.w)) + ' times \\(\\mathbf{v}\\).'
                : '\\(A\\mathbf{v}\\) leaves the line through \\(\\mathbf{v}\\).';
              if (msg !== last) { last = msg; ctx.note(msg); }
            }
          });
          void api;
        }
      },
      // 3
      {
        kind: 'text',
        title: 'Definition',
        html:
          '<p>A non-zero vector \\(\\mathbf{v}\\) is an <b>eigenvector</b> of a square matrix \\(A\\) if \\(A\\mathbf{v}\\) is a multiple of \\(\\mathbf{v}\\):</p>' +
          '\\[ A\\mathbf{v} = \\lambda\\,\\mathbf{v}. \\]' +
          '<p>The number \\(\\lambda\\) (lambda) is the <b>eigenvalue</b> belonging to \\(\\mathbf{v}\\). It is the factor by which \\(A\\) stretches vectors along that direction. The zero vector is excluded because \\(A\\mathbf{0} = \\lambda\\mathbf{0}\\) holds for every \\(\\lambda\\) and carries no information.</p>'
      },
      // 4
      {
        kind: 'exercise',
        title: 'Both eigendirections',
        html:
          '<p>This matrix has two eigen-directions. Rotate the probe \\(\\mathbf{v}\\) until \\(A\\mathbf{v}\\) lies on the line through \\(\\mathbf{v}\\), then release. Find both directions.</p>',
        hint: 'Use the displayed angle and move in the direction that makes it smaller. One direction is horizontal. The other lies on a diagonal.',
        mount: function (el, ctx) {
          var found = [false, false];
          var dirs = [[1, 0], [Math.SQRT1_2, -Math.SQRT1_2]];
          var lams = [3, 2];
          var chips = [];
          var api = probeWidget(el, A2, 70, {
            tol: 1,
            onEnd: function (a) {
              if (a.angle < 5) {
                var c0 = Math.abs(a.v[0] * dirs[0][1] - a.v[1] * dirs[0][0]);
                var c1 = Math.abs(a.v[0] * dirs[1][1] - a.v[1] * dirs[1][0]);
                var k = c0 < c1 ? 0 : 1;
                var d = dirs[k];
                var sgn = (a.v[0] * d[0] + a.v[1] * d[1]) >= 0 ? 1 : -1;
                a.setV([sgn * d[0], sgn * d[1]]);
                var already = found[k];
                found[k] = true;
                chips[k].classList.add('eigen-s2-done');
                chips[k].textContent = 'direction with λ = ' + lams[k] + ' found';
                if (found[0] && found[1]) {
                  ctx.note('Both directions found: \\(A\\mathbf{v} = 3\\mathbf{v}\\) along the horizontal line and \\(A\\mathbf{v} = 2\\mathbf{v}\\) along the diagonal.');
                  ctx.solved();
                } else if (already) {
                  ctx.note('This direction is already recorded. The second eigen-direction is on a different line.');
                } else {
                  ctx.note('Aligned: \\(A\\mathbf{v} = ' + lams[k] + '\\,\\mathbf{v}\\). One more direction remains.');
                }
              } else {
                ctx.note('The angle between \\(\\mathbf{v}\\) and \\(A\\mathbf{v}\\) is still ' + fmt(a.angle, 1).replace('−', '-') + '°. It must reach 0°.');
              }
            }
          });
          var row = M4.el('div', { class: 'm4-row' }, api.wrap);
          chips.push(M4.el('span', { class: 'm4-chip', text: 'first direction: open' }, row));
          chips.push(M4.el('span', { class: 'm4-chip', text: 'second direction: open' }, row));
        }
      },
      // 5
      {
        kind: 'text',
        title: 'The eigenvalue as a stretch factor',
        html:
          '<p>The eigenvalue \\(\\lambda\\) describes what \\(A\\) does along its eigen-direction. If \\(\\lambda > 1\\) vectors are lengthened, if \\(0 < \\lambda < 1\\) they are shortened, and if \\(\\lambda = 1\\) they are left unchanged.</p>' +
          '<p>A negative \\(\\lambda\\) reverses the vector: the image points the opposite way but is still on the same line, so the vector is still an eigenvector. To read off \\(\\lambda\\), compute \\(A\\mathbf{v}\\) and compare it with \\(\\mathbf{v}\\) component by component.</p>'
      },
      // 6
      {
        kind: 'exercise',
        title: 'Eigenvalue from a picture',
        html:
          '<p>The vector \\(\\mathbf{v} = \\begin{pmatrix}1\\\\1\\end{pmatrix}\\) is an eigenvector of the matrix below. Compute \\(A\\mathbf{v}\\) and enter the eigenvalue \\(\\lambda\\).</p>',
        hint: 'Each component of \\(A\\mathbf{v}\\) is a row of \\(A\\) times \\(\\mathbf{v}\\): the first is \\(4\\cdot 1 + 1\\cdot 1\\).',
        mount: function (el, ctx) {
          var wrap = wrapEl(el);
          M4.el('div', {
            class: 'eigen-s2-big',
            html: M4.tex(matTex(A3) + '\\begin{bmatrix}1 \\\\ 1\\end{bmatrix} = \\lambda \\begin{bmatrix}1 \\\\ 1\\end{bmatrix}', true)
          }, wrap);
          M4.numberInput(wrap, {
            answer: 5, tolerance: 0.01, placeholder: '?', label: 'λ =',
            onCorrect: function () {
              ctx.note('\\(A\\mathbf{v} = \\begin{pmatrix}5\\\\5\\end{pmatrix} = 5\\,\\begin{pmatrix}1\\\\1\\end{pmatrix}\\), so \\(\\lambda = 5\\).');
              ctx.solved();
            },
            onWrong: function () {
              ctx.wrong('A v = (4 + 1, 2 + 3) = (5, 5). Which number multiplies (1, 1) to give this?');
            }
          });
        }
      },
      // 7
      {
        kind: 'exercise',
        title: 'Stretch factors',
        html:
          '<p>Here \\(\\mathbf{v} = \\begin{pmatrix}1\\\\-1\\end{pmatrix}\\) (blue) and its image \\(A\\mathbf{v}\\) (pink) lie on one line. The wide purple arrow shows \\(\\lambda\\mathbf{v}\\) for the value of \\(\\lambda\\) on the slider. Set \\(\\lambda\\) so that \\(\\lambda\\mathbf{v}\\) coincides with \\(A\\mathbf{v}\\), then check.</p>',
        hint: 'The pink arrow points opposite to the blue one and has the same length.',
        mount: function (el, ctx) {
          var wrap = wrapEl(el);
          matrixHeader(wrap, A4);
          var p = planeBox(wrap, { xmin: -3, xmax: 3, ymin: -3, ymax: 3, width: 520, height: 520 });
          var v = [1, -1];
          var w = mul(A4, v);
          p.line(-3, 3, 3, -3, { stroke: C.muted, width: 1.5, dash: '6 6' });
          var ghost = p.arrow(0, 0, 1, 0, { stroke: C.purple, width: 14 });
          ghost.el.setAttribute('opacity', '0.35');
          p.arrow(0, 0, w[0], w[1], { stroke: C.pink, width: 5 });
          p.arrow(0, 0, v[0], v[1], { stroke: C.blue, width: 5 });
          p.text(1.45, -0.75, 'v', { fill: C.blue, size: 20, weight: 700 });
          p.text(-1.5, 0.65, 'Av', { fill: C.pink, size: 20, weight: 700 });
          var row = M4.el('div', { class: 'm4-row' }, wrap);
          var r1 = M4.el('span', { class: 'm4-readout' }, row);
          M4.el('span', { class: 'm4-readout', html: M4.tex('A\\mathbf{v} = ' + vecStr(w, 1)) }, row);
          var lam = 2;
          function render() {
            setArrow(ghost, lam * v[0], lam * v[1]);
            r1.innerHTML = M4.tex('\\lambda\\mathbf{v} = ' + vecStr([lam * v[0], lam * v[1]], 1));
          }
          var box = M4.el('div', { style: 'width:100%;max-width:520px' }, wrap);
          M4.slider(box, {
            min: -3, max: 3, step: 0.5, value: lam, label: 'λ',
            format: function (x) { return fmt(Number(x), 1); },
            onInput: function (x) { lam = Number(x); render(); }
          });
          M4.button(wrap, 'Check', function () {
            if (Math.abs(lam + 1) < 0.01) {
              ghost.el.setAttribute('opacity', '0.6');
              ctx.note('\\(A\\mathbf{v} = \\begin{pmatrix}-1\\\\1\\end{pmatrix} = -1\\cdot(1, -1)\\). The eigenvalue is \\(-1\\): the vector is reversed, not rotated off its line.');
              ctx.solved();
            } else if (lam > 0) {
              ctx.wrong('With a positive λ the purple arrow points the same way as v, but Av points the opposite way.');
            } else if (lam === 0) {
              ctx.wrong('λ = 0 collapses the purple arrow to the origin, while Av has non-zero length.');
            } else {
              ctx.wrong('The direction is right, but the purple arrow is ' + (lam < -1 ? 'longer' : 'shorter') + ' than Av.');
            }
          }, { primary: true });
          render();
        }
      },
      // 8
      {
        kind: 'explore',
        title: 'The whole plane',
        html:
          '<p>Each spoke is a vector of length 1. The slider moves every tip from \\(\\mathbf{v}\\) (at \\(t = 0\\)) to \\(A\\mathbf{v}\\) (at \\(t = 1\\)), turning the circle into an ellipse.</p>' +
          '<p>Most spokes rotate as they move. The pink and orange spokes are eigenvectors: their tips slide along the dashed lines, and the orange ones do not move at all because their eigenvalue is 1.</p>',
        mount: function (el, ctx) {
          var wrap = wrapEl(el);
          matrixHeader(wrap, A1);
          var p = planeBox(wrap, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 520, height: 520 });
          p.line(-4, -4, 4, 4, { stroke: C.pink, width: 1.5, dash: '6 6' });
          p.line(-4, 4, 4, -4, { stroke: C.orange, width: 1.5, dash: '6 6' });
          var N = 24, i;
          var circ = [];
          for (i = 0; i < 72; i++) circ.push([Math.cos(i * Math.PI / 36), Math.sin(i * Math.PI / 36)]);
          p.path(circ, { stroke: C.line, width: 2, closed: true });
          var outline = p.path(circ, { stroke: C.blue, width: 3, closed: true });
          var spokes = [];
          for (i = 0; i < N; i++) {
            var a = i * 2 * Math.PI / N;
            var v = [Math.cos(a), Math.sin(a)];
            var kind = (i % 6 === 3) ? ((i % 12 === 3) ? 'p' : 'o') : 'n';
            var col = kind === 'p' ? C.pink : kind === 'o' ? C.orange : C.muted;
            spokes.push({
              v: v, w: mul(A1, v),
              line: p.line(0, 0, v[0], v[1], { stroke: col, width: kind === 'n' ? 1.5 : 5 }),
              pt: p.point(v[0], v[1], { r: kind === 'n' ? 5 : 8, fill: kind === 'n' ? C.blue : col })
            });
          }
          p.text(2.3, 3.5, 'λ = 3', { fill: C.pink, size: 18, weight: 700 });
          p.text(-2.3, 3.5, 'λ = 1', { fill: C.orange, size: 18, weight: 700 });
          var t = 0, raf = 0, slider;
          function render() {
            var j, s, x, y;
            for (j = 0; j < N; j++) {
              s = spokes[j];
              x = s.v[0] + t * (s.w[0] - s.v[0]);
              y = s.v[1] + t * (s.w[1] - s.v[1]);
              s.line.set(0, 0, x, y);
              s.pt.set(x, y);
            }
            var pts = [];
            for (j = 0; j < 72; j++) {
              var c = circ[j], m = mul(A1, c);
              pts.push([c[0] + t * (m[0] - c[0]), c[1] + t * (m[1] - c[1])]);
            }
            outline.set(pts);
          }
          var box = M4.el('div', { style: 'width:100%;max-width:520px' }, wrap);
          slider = M4.slider(box, {
            min: 0, max: 1, step: 0.01, value: 0, label: 't',
            format: function (x) { return Number(x).toFixed(2); },
            onInput: function (x) { cancelAnimationFrame(raf); t = Number(x); render(); }
          });
          M4.button(wrap, 'Play', function () {
            cancelAnimationFrame(raf);
            var t0 = null;
            function frame(now) {
              if (t0 === null) t0 = now;
              var u = Math.min(1, (now - t0) / 2200);
              t = u * u * (3 - 2 * u);
              slider.set(Math.round(t * 100) / 100);
              render();
              if (u < 1) raf = requestAnimationFrame(frame);
            }
            raf = requestAnimationFrame(frame);
          }, { primary: true });
          ctx.onCleanup(function () { cancelAnimationFrame(raf); });
          render();
        }
      },
      // 9
      {
        kind: 'exercise',
        title: 'Eigenvectors and other vectors',
        html:
          '<p>For the matrix below, drag each vector into the box that describes it. Compute \\(A\\mathbf{v}\\) for each vector and compare it with \\(\\mathbf{v}\\).</p>' +
          '<p>Any non-zero multiple of an eigenvector is again an eigenvector with the same eigenvalue, since \\(A(c\\mathbf{v}) = c\\,A\\mathbf{v} = \\lambda\\,(c\\mathbf{v})\\).</p>',
        hint: 'For \\(\\mathbf{v} = \\begin{pmatrix}2\\\\2\\end{pmatrix}\\): \\(A\\mathbf{v} = \\begin{pmatrix}2\\cdot 2 + 1\\cdot 2\\\\1\\cdot 2 + 2\\cdot 2\\end{pmatrix} = \\begin{pmatrix}6\\\\6\\end{pmatrix}\\).',
        mount: function (el, ctx) {
          var wrap = wrapEl(el);
          matrixHeader(wrap, A1);
          var data = [
            { tex: '\\begin{pmatrix}1\\\\0\\end{pmatrix}', slot: 2, msg: '\\(A\\begin{pmatrix}1\\\\0\\end{pmatrix} = \\begin{pmatrix}2\\\\1\\end{pmatrix}\\). Is \\(\\begin{pmatrix}2\\\\1\\end{pmatrix}\\) a multiple of \\(\\begin{pmatrix}1\\\\0\\end{pmatrix}\\)?', ok: '\\(A\\begin{pmatrix}1\\\\0\\end{pmatrix} = \\begin{pmatrix}2\\\\1\\end{pmatrix}\\) is not a multiple of \\(\\begin{pmatrix}1\\\\0\\end{pmatrix}\\).' },
            { tex: '\\begin{pmatrix}2\\\\2\\end{pmatrix}', slot: 0, msg: '\\(A\\begin{pmatrix}2\\\\2\\end{pmatrix} = \\begin{pmatrix}6\\\\6\\end{pmatrix}\\). Compare this with \\(\\begin{pmatrix}2\\\\2\\end{pmatrix}\\).', ok: '\\(A\\begin{pmatrix}2\\\\2\\end{pmatrix} = \\begin{pmatrix}6\\\\6\\end{pmatrix} = 3\\begin{pmatrix}2\\\\2\\end{pmatrix}\\).' },
            { tex: '\\begin{pmatrix}1\\\\-1\\end{pmatrix}', slot: 1, msg: '\\(A\\begin{pmatrix}1\\\\-1\\end{pmatrix} = \\begin{pmatrix}1\\\\-1\\end{pmatrix}\\). Compare this with \\(\\begin{pmatrix}1\\\\-1\\end{pmatrix}\\).', ok: '\\(A\\begin{pmatrix}1\\\\-1\\end{pmatrix} = \\begin{pmatrix}1\\\\-1\\end{pmatrix} = 1 \\cdot \\begin{pmatrix}1\\\\-1\\end{pmatrix}\\).' }
          ];
          var tray = M4.el('div', { class: 'eigen-s2-tray' }, wrap);
          var tokens = data.map(function (d) {
            var t = M4.el('div', { class: 'm4-token eigen-s2-token', html: M4.tex('\\mathbf{v} = ' + d.tex) }, tray);
            d.el = t;
            return t;
          });
          var slotRow = M4.el('div', { class: 'eigen-s2-slots' }, wrap);
          var labels = ['\\lambda = 3', '\\lambda = 1', '\\text{not an eigenvector}'];
          var slotCols = [C.pink, C.orange, C.muted];
          var slots = labels.map(function (l, i) {
            var col = M4.el('div', { class: 'eigen-s2-slotcol' }, slotRow);
            M4.el('div', { class: 'eigen-s2-slotlabel', style: 'color:' + slotCols[i], html: M4.tex(l) }, col);
            return M4.el('div', { class: 'm4-slot eigen-s2-slot' }, col);
          });
          var placed = 0;
          function find(tok) {
            for (var i = 0; i < data.length; i++) if (data[i].el === tok) return data[i];
            return null;
          }
          M4.dragDrop({
            tokens: tokens,
            slots: slots,
            onDrop: function (tok, slot) {
              var d = find(tok);
              if (!d) return;
              if (d.done) { slots[d.slot].appendChild(tok); return; }
              var si = slots.indexOf(slot);
              if (si === d.slot) {
                d.done = true;
                slot.appendChild(tok);
                slot.classList.add('filled');
                tok.classList.remove('m4-pop');
                void tok.offsetWidth;
                tok.classList.add('m4-pop');
                placed++;
                if (placed === data.length) {
                  ctx.note('All three are sorted. \\(\\begin{pmatrix}2\\\\2\\end{pmatrix}\\) is a multiple of \\(\\begin{pmatrix}1\\\\1\\end{pmatrix}\\) and shares its eigenvalue 3.');
                  ctx.solved();
                } else {
                  ctx.note(d.ok);
                }
              } else {
                tray.appendChild(tok);
                ctx.wrong(d.msg);
              }
            },
            onMiss: function (tok) {
              var d = find(tok);
              if (d && d.done) { slots[d.slot].appendChild(tok); } else { tray.appendChild(tok); }
            }
          });
        }
      },
      // 10
      {
        kind: 'exercise',
        title: 'The long axis of a data cloud',
        html:
          '<p>A cloud of data points can be summarised by a symmetric matrix \\(\\Sigma\\), its <em>spread matrix</em>, which records how far the points spread out in each direction. The eigenvectors of \\(\\Sigma\\) point along the axes of the cloud, and each eigenvalue measures how far the cloud spreads along its eigenvector. The probability module calls \\(\\Sigma\\) the covariance matrix, and finding these axes is called principal component analysis.</p>' +
          '<p>The cloud below has spread matrix \\(\\Sigma = \\begin{bmatrix}2 & 1 \\\\ 1 & 2\\end{bmatrix}\\). Which vector points along the direction of greatest spread?</p>',
        hint: 'This matrix appeared earlier in the session. Its eigenvalues are 3 and 1. The larger eigenvalue marks the direction of greatest spread.',
        mount: function (el, ctx) {
          var wrap = wrapEl(el);
          var p = planeBox(wrap, { xmin: -6.5, xmax: 6.5, ymin: -5, ymax: 5, width: 520, height: 400 });
          var seed = 12345;
          function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return (seed + 0.5) / 4294967296; }
          function gauss() { return Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd()); }
          var s3 = Math.sqrt(3), h = Math.SQRT1_2;
          for (var i = 0; i < 90; i++) {
            var a = gauss() * s3, b = gauss();
            var x = (a + b) * h, y = (a - b) * h;
            if (Math.abs(x) < 6.3 && Math.abs(y) < 4.8) {
              var pt = p.point(x, y, { r: 4.5, fill: C.blue });
              pt.el.setAttribute('opacity', '0.45');
            }
          }
          var box = M4.el('div', { style: 'width:100%' }, wrap);
          M4.choices(box, {
            options: ['\\(\\begin{pmatrix}1\\\\0\\end{pmatrix}\\)', '\\(\\begin{pmatrix}1\\\\1\\end{pmatrix}\\)', '\\(\\begin{pmatrix}1\\\\-1\\end{pmatrix}\\)', '\\(\\begin{pmatrix}0\\\\1\\end{pmatrix}\\)'],
            correct: 1,
            onCorrect: function () {
              p.arrow(0, 0, 2 * s3 * h, 2 * s3 * h, { stroke: C.pink, width: 6 });
              p.arrow(0, 0, 2 * h, -2 * h, { stroke: C.orange, width: 6 });
              p.text(3.4, 2.2, 'λ = 3', { fill: C.pink, size: 18, weight: 700 });
              p.text(2.6, -1.6, 'λ = 1', { fill: C.orange, size: 18, weight: 700 });
              ctx.note('\\(\\Sigma(1,1) = \\begin{pmatrix}3\\\\3\\end{pmatrix}\\): spread 3 along \\(\\begin{pmatrix}1\\\\1\\end{pmatrix}\\). Along \\(\\begin{pmatrix}1\\\\-1\\end{pmatrix}\\) the spread is only 1. Each arrow has length twice the square root of its eigenvalue.');
              ctx.solved();
            },
            onWrong: function (k) {
              if (k === 2) ctx.wrong('(1, −1) is an eigenvector, but its eigenvalue is 1, the smaller of the two.');
              else if (k === 0) ctx.wrong('Σ(1, 0) = (2, 1), which is not a multiple of (1, 0), so this is not an eigenvector.');
              else ctx.wrong('Σ(0, 1) = (1, 2), which is not a multiple of (0, 1), so this is not an eigenvector.');
            }
          });
        }
      },
      // 11
      {
        kind: 'exercise',
        title: 'Eigenvectors on the grid',
        html:
          '<p>The blue vector \\(\\mathbf{v}\\) can be dragged to any grid point with coordinates between \\(-2\\) and \\(2\\). This matrix has eigenvalues \\(4\\) and \\(1\\). Place \\(\\mathbf{v}\\) on an eigenvector for one eigenvalue, release, and then find an eigenvector for the other.</p>',
        hint: 'Eigenvalue 1 means \\(A\\mathbf{v} = \\mathbf{v}\\): the first row gives \\(2x + 2y = x\\), so \\(x = -2y\\). For eigenvalue 4, try a vector with equal components.',
        mount: function (el, ctx) {
          var wrap = wrapEl(el);
          matrixHeader(wrap, A5);
          var p = planeBox(wrap, { xmin: -10, xmax: 10, ymin: -10, ymax: 10, width: 520, height: 520 });
          var pair = vectorPair(p, 0.7);
          var row = M4.el('div', { class: 'm4-row' }, wrap);
          var rV = M4.el('span', { class: 'm4-readout' }, row);
          var rAv = M4.el('span', { class: 'm4-readout' }, row);
          var row2 = M4.el('div', { class: 'm4-row' }, wrap);
          var chip4 = M4.el('span', { class: 'm4-chip', text: 'λ = 4: open' }, row2);
          var chip1 = M4.el('span', { class: 'm4-chip', text: 'λ = 1: open' }, row2);
          var found = { 4: false, 1: false };
          var v = [1, 0], busy = false, handle;
          function clamp(x) { return Math.max(-2, Math.min(2, Math.round(x))); }
          function render() {
            var w = mul(A5, v);
            var zero = v[0] === 0 && v[1] === 0;
            var aligned = !zero && (v[0] * w[1] - v[1] * w[0]) === 0;
            pair.update(zero ? [1e-3, 0] : v, zero ? [1e-3, 0] : w, aligned, 15);
            rV.innerHTML = M4.tex('\\mathbf{v} = ' + vecStr(v, 0));
            rAv.innerHTML = M4.tex('A\\mathbf{v} = ' + vecStr(w, 0));
          }
          function place(x, y) {
            v = [clamp(x), clamp(y)];
            busy = true; handle.set(v[0], v[1]); busy = false;
            render();
          }
          handle = p.handle(v[0], v[1], {
            color: C.blue, r: 13, snap: 1,
            onDrag: function (x, y) { if (!busy) place(x, y); },
            onEnd: function (x, y) {
              if (busy) return;
              place(x, y);
              var w = mul(A5, v);
              if (v[0] === 0 && v[1] === 0) {
                ctx.note('The zero vector is excluded by definition. Choose a non-zero \\(\\mathbf{v}\\).');
                return;
              }
              if (v[0] * w[1] - v[1] * w[0] !== 0) {
                ctx.note('\\(A\\mathbf{v} = ' + M4.col([w[0], w[1]]) + '\\) is not a multiple of \\(\\mathbf{v} = ' + M4.col([v[0], v[1]]) + '\\). The angle between them is ' + angleDeg(v, w).toFixed(1) + '°.');
                return;
              }
              var lam = Math.round((w[0] * v[0] + w[1] * v[1]) / (v[0] * v[0] + v[1] * v[1]));
              found[lam] = true;
              var chip = lam === 4 ? chip4 : chip1;
              chip.classList.add('eigen-s2-done');
              chip.textContent = 'λ = ' + lam + ': found';
              if (found[4] && found[1]) {
                ctx.note('Both found: \\(A(1,1) = 4\\,\\begin{pmatrix}1\\\\1\\end{pmatrix}\\) and \\(A(2,-1) = \\begin{pmatrix}2\\\\-1\\end{pmatrix}\\), together with their multiples.');
                ctx.solved();
              } else {
                ctx.note('\\(A\\mathbf{v} = ' + lam + '\\,\\mathbf{v}\\). Now find an eigenvector with eigenvalue ' + (lam === 4 ? 1 : 4) + ', which lies on a different line.');
              }
            }
          });
          render();
        }
      },
      // 12
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>A non-zero vector \\(\\mathbf{v}\\) is an eigenvector of \\(A\\) if \\(A\\mathbf{v} = \\lambda\\mathbf{v}\\): the matrix keeps \\(\\mathbf{v}\\) on its own line.</li>' +
          '<li>The eigenvalue \\(\\lambda\\) is the stretch factor along that line. A negative value reverses the vector, and every non-zero multiple of an eigenvector is an eigenvector with the same \\(\\lambda\\).</li>' +
          '<li>To test a candidate, compute \\(A\\mathbf{v}\\) and check whether it is a multiple of \\(\\mathbf{v}\\). For the spread matrix of a data cloud the eigenvectors are the axes of the cloud and the eigenvalues measure the spread along them.</li>' +
          '</ul>' +
          '<p>The next session shows how to compute eigenvalues directly from the entries of a matrix, without trial and error.</p>'
      }
    ]
  });
})();
