(function () {
  'use strict';

  var C = M4.colors;
  var PINK = C.pink, BLUE = C.blue, ORANGE = C.orange, GREEN = C.green, MUTED = C.muted;

  function injectStyle() {
    if (document.getElementById('eigen-s3-style')) return;
    var s = document.createElement('style');
    s.id = 'eigen-s3-style';
    s.textContent =
      '.eigen-s3-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:8px}' +
      '.eigen-s3-wrap svg{max-width:100%;height:auto}' +
      '.eigen-s3-expr{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;font-size:26px;font-weight:600;margin:6px 0}' +
      '.eigen-s3-expr .m4-slot{min-width:72px;min-height:56px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:700}' +
      '.eigen-s3-ok{border-color:' + GREEN + ' !important;color:' + GREEN + ';background:#eafaf2}' +
      '.eigen-s3-tok{min-width:60px;text-align:center;font-size:22px;font-weight:700;padding:10px 14px;touch-action:none}' +
      '.eigen-s3-chip-on{background:' + PINK + ' !important;color:#fff !important;border-color:' + PINK + ' !important}' +
      '.eigen-s3-legend{display:inline-block;width:14px;height:14px;border-radius:4px;margin-right:6px;vertical-align:-1px}' +
      '.eigen-s3-matrix{font-size:20px;min-height:64px;display:flex;align-items:center;justify-content:center}' +
      '.eigen-s3-sliders{width:100%;max-width:520px;display:flex;flex-direction:column;gap:6px}';
    document.head.appendChild(s);
  }

  function fmt(v, n) {
    var s = Number(v).toFixed(n === undefined ? 2 : n);
    if (parseFloat(s) === 0) s = Number(0).toFixed(n === undefined ? 2 : n);
    return s.replace('-', '−');
  }
  function texNum(v, n) {
    var s = Number(v).toFixed(n === undefined ? 2 : n);
    if (parseFloat(s) === 0) s = Number(0).toFixed(n === undefined ? 2 : n);
    return s;
  }
  function wrap(el) {
    injectStyle();
    return M4.el('div', { class: 'eigen-s3-wrap' }, el);
  }
  function readout(parent) {
    return M4.el('span', { class: 'm4-readout' }, parent);
  }
  function legend(parent, color, text) {
    var chip = M4.el('span', { class: 'm4-chip' }, parent);
    M4.el('span', { class: 'eigen-s3-legend', style: 'background:' + color }, chip);
    chip.appendChild(document.createTextNode(text));
    return chip;
  }

  /* ------------------------------------------------------------------ */
  /* Shared widget: the plane transformed by A - lambda I               */
  /* ------------------------------------------------------------------ */
  function squash(el, ctx, A, o) {
    var w = wrap(el);
    var lam = o.value;
    var mat = M4.el('div', { class: 'eigen-s3-matrix' }, w);
    var p = M4.plane(w, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 480, height: 480, grid: false, labels: false });
    var K = 8, lines = [];
    for (var k = -K; k <= K; k++) {
      var a = p.line(0, 0, 0, 0, { stroke: PINK, width: 1.5 });
      var b = p.line(0, 0, 0, 0, { stroke: PINK, width: 1.5 });
      a.el.setAttribute('stroke-opacity', '0.28');
      b.el.setAttribute('stroke-opacity', '0.28');
      lines.push([k, a, b]);
    }
    var sq = p.path([[0, 0], [1, 0], [1, 1], [0, 1]], { stroke: PINK, width: 2.5, fill: PINK, closed: true });
    sq.el.setAttribute('fill-opacity', '0.22');
    var c1 = p.arrow(0, 0, 1, 0, { stroke: BLUE, width: 4 });
    var c2 = p.arrow(0, 0, 0, 1, { stroke: ORANGE, width: 4 });

    var leg = M4.el('div', { class: 'm4-row' }, w);
    legend(leg, BLUE, 'first column');
    legend(leg, ORANGE, 'second column');
    legend(leg, PINK, 'image of the unit square');

    var row = M4.el('div', { class: 'm4-row' }, w);
    var rDet = readout(row);
    var rState = readout(row);

    function update(v) {
      lam = +v;
      var b11 = A[0][0] - lam, b12 = A[0][1], b21 = A[1][0], b22 = A[1][1] - lam;
      var det = b11 * b22 - b12 * b21;
      function T(x, y) { return [b11 * x + b12 * y, b21 * x + b22 * y]; }
      for (var i = 0; i < lines.length; i++) {
        var kk = lines[i][0];
        var s1 = T(kk, -K), e1 = T(kk, K), s2 = T(-K, kk), e2 = T(K, kk);
        lines[i][1].set(s1[0], s1[1], e1[0], e1[1]);
        lines[i][2].set(s2[0], s2[1], e2[0], e2[1]);
      }
      sq.set([[0, 0], T(1, 0), T(1, 1), T(0, 1)]);
      c1.set(0, 0, b11, b21);
      c2.set(0, 0, b12, b22);
      mat.innerHTML = M4.tex('A-\\lambda I=\\begin{pmatrix}' + texNum(b11) + '&' + texNum(b12) + '\\\\' + texNum(b21) + '&' + texNum(b22) + '\\end{pmatrix}');
      rDet.textContent = 'det(A − λI) = ' + fmt(det, 2);
      var flat = Math.abs(det) < 0.03;
      rState.textContent = flat ? 'collapsed onto a line' : 'area scaled by ' + fmt(Math.abs(det), 2);
      rState.style.background = flat ? PINK : '';
      rState.style.color = flat ? '#fff' : '';
      sq.el.setAttribute('stroke-width', flat ? '6' : '2.5');
      if (o.onLambda) o.onLambda(lam, det);
    }

    var sl = M4.el('div', { class: 'eigen-s3-sliders' }, w);
    var slider = M4.slider(sl, {
      min: o.min, max: o.max, step: 0.05, value: lam, label: 'λ',
      format: function (v) { return fmt(v, 2); },
      onInput: function (v) { stop(); update(v); }
    });
    function setLam(v) {
      v = Math.max(o.min, Math.min(o.max, Math.round(v * 20) / 20));
      slider.set(v);
      update(v);
    }
    var raf = 0;
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    var btns = M4.el('div', { class: 'm4-row' }, w);
    M4.button(btns, '− 0.05', function () { stop(); setLam(lam - 0.05); });
    M4.button(btns, '+ 0.05', function () { stop(); setLam(lam + 0.05); });
    if (o.sweep) {
      M4.button(btns, 'Sweep λ', function () {
        stop();
        var t0 = null, dur = 7000;
        function frame(t) {
          if (t0 === null) t0 = t;
          var u = Math.min(1, (t - t0) / dur);
          var v = o.min + (o.max - o.min) * u;
          slider.set(Math.round(v * 20) / 20);
          update(v);
          if (u < 1) raf = requestAnimationFrame(frame); else { raf = 0; setLam(o.max); }
        }
        raf = requestAnimationFrame(frame);
      }, { primary: true });
    }
    ctx.onCleanup(stop);
    update(lam);
    return { w: w, row: row };
  }

  /* ------------------------------------------------------------------ */
  M4.lesson({
    id: 'eigen-s3',
    module: 'eigen',
    title: 'Finding eigenvalues',
    summary: 'Eigenvalues are the values of λ for which A − λI collapses the plane. For a 2×2 matrix they are the roots of a quadratic.',
    minutes: 12,
    steps: [
      {
        kind: 'text',
        title: 'A procedure for eigenvalues',
        html:
          '<p>An eigenvector of a matrix \\(A\\) is a non-zero vector \\(v\\) that \\(A\\) only stretches: \\(Av=\\lambda v\\), where the number \\(\\lambda\\) is the eigenvalue. Such vectors can be spotted by eye, but a procedure exists that finds every eigenvalue of a \\(2\\times 2\\) matrix.</p>' +
          '<p>In this lesson you will test a candidate \\(\\lambda\\) with a determinant, write down the characteristic polynomial of a \\(2\\times 2\\) matrix, solve it, and explain why a rotation has no real eigenvalues.</p>'
      },
      {
        kind: 'text',
        title: 'Rearranging the eigenvalue equation',
        html:
          '<p>Let \\(I\\) denote the identity matrix, so that \\(\\lambda v=\\lambda I v\\). The equation \\(Av=\\lambda v\\) can then be rewritten as \\[(A-\\lambda I)\\,v=0 .\\]</p>' +
          '<p>The matrix \\(A-\\lambda I\\) is \\(A\\) with \\(\\lambda\\) subtracted from both diagonal entries. It must send a non-zero vector \\(v\\) to zero, which is only possible if it collapses the plane onto a line or a point. A matrix collapses the plane exactly when its determinant is zero, so \\(\\lambda\\) is an eigenvalue of \\(A\\) exactly when \\[\\det(A-\\lambda I)=0 .\\]</p>'
      },
      {
        kind: 'explore',
        title: 'Collapse of the plane',
        html:
          '<p>The picture shows what \\(A-\\lambda I\\) does to the plane for \\(A=\\begin{pmatrix}2&1\\\\1&2\\end{pmatrix}\\). The shaded parallelogram is the image of the unit square, and its area equals \\(|\\det(A-\\lambda I)|\\). Move \\(\\lambda\\) and observe the two values at which the grid folds flat onto a single line.</p>',
        mount: function (el, ctx) {
          squash(el, ctx, [[2, 1], [1, 2]], { min: -1, max: 5, value: 0, sweep: true });
          ctx.note('For this matrix \\(\\det(A-\\lambda I)=(2-\\lambda)^2-1\\), which vanishes at \\(\\lambda=1\\) and \\(\\lambda=3\\).');
        }
      },
      {
        kind: 'exercise',
        title: 'Both eigenvalues of a matrix',
        html:
          '<p>Now take \\(A=\\begin{pmatrix}1&2\\\\2&1\\end{pmatrix}\\). Adjust \\(\\lambda\\) until \\(A-\\lambda I\\) collapses the plane, and do this for both eigenvalues. Each value that is found lights up below.</p>',
        hint: 'The determinant is \\((1-\\lambda)^2-4\\). It is zero when \\(1-\\lambda=\\pm 2\\). One eigenvalue is negative.',
        mount: function (el, ctx) {
          var roots = [-1, 3], found = [false, false], chips = [], done = false, ready = false;
          var api = squash(el, ctx, [[1, 2], [2, 1]], {
            min: -2, max: 4, value: 0.5,
            onLambda: function (lam, det) {
              if (!ready) return;
              var hit = -1;
              for (var i = 0; i < 2; i++) if (Math.abs(lam - roots[i]) < 0.026) hit = i;
              if (hit >= 0 && !found[hit]) {
                found[hit] = true;
                chips[hit].textContent = 'λ = ' + fmt(roots[hit], 0);
                chips[hit].classList.add('eigen-s3-chip-on', 'm4-pop');
              }
              if (found[0] && found[1]) {
                if (!done) {
                  done = true;
                  ctx.note('Both found: \\(\\lambda=-1\\) and \\(\\lambda=3\\). At each of them \\(A-\\lambda I\\) sends a whole line of vectors to zero, and those vectors are the eigenvectors.');
                  ctx.solved();
                }
              } else if (hit >= 0) {
                ctx.note('The plane is flat at \\(\\lambda=' + roots[hit] + '\\). One more eigenvalue remains. The determinant is zero at a second value.');
              } else {
                ctx.note('\\(\\det(A-\\lambda I)=' + texNum(det) + '\\). ' + (det > 0 ? 'The determinant is positive here. It becomes zero where it changes sign.' : 'The determinant is negative here, so one eigenvalue lies on each side of this \\(\\lambda\\).'));
              }
            }
          });
          var crow = M4.el('div', { class: 'm4-row' }, api.w);
          chips.push(M4.el('span', { class: 'm4-chip', text: 'first eigenvalue: ?' }, crow));
          chips.push(M4.el('span', { class: 'm4-chip', text: 'second eigenvalue: ?' }, crow));
          ready = true;
        }
      },
      {
        kind: 'text',
        title: 'The characteristic polynomial',
        html:
          '<p>For \\(A=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}\\) the determinant can be expanded once and for all: \\[\\det(A-\\lambda I)=(a-\\lambda)(d-\\lambda)-bc=\\lambda^2-(a+d)\\,\\lambda+(ad-bc).\\]</p>' +
          '<p>This quadratic \\(p(\\lambda)\\) is the characteristic polynomial of \\(A\\). The sum \\(a+d\\) is called the trace, written \\(\\operatorname{tr}A\\), and \\(ad-bc\\) is the determinant, so \\(p(\\lambda)=\\lambda^2-\\operatorname{tr}A\\;\\lambda+\\det A\\). The eigenvalues are its roots. Consequently they add up to the trace and multiply to the determinant.</p>'
      },
      {
        kind: 'exercise',
        title: 'Characteristic polynomial practice',
        html:
          '<p>Drag the correct numbers into the two slots to complete the characteristic polynomial of \\(A=\\begin{pmatrix}4&1\\\\2&3\\end{pmatrix}\\).</p>',
        hint: 'The coefficient of \\(\\lambda\\) is the trace \\(4+3\\). The constant term is the determinant \\(4\\cdot 3-1\\cdot 2\\).',
        mount: function (el, ctx) {
          var w = wrap(el);
          var expr = M4.el('div', { class: 'eigen-s3-expr' }, w);
          M4.el('span', { html: M4.tex('p(\\lambda)=\\lambda^2-') }, expr);
          var s1 = M4.el('span', { class: 'm4-slot' }, expr);
          M4.el('span', { html: M4.tex('\\lambda\\;+') }, expr);
          var s2 = M4.el('span', { class: 'm4-slot' }, expr);
          var tray = M4.el('div', { class: 'm4-row' }, w);
          var vals = [12, 7, 2, 10, 5, 14], tokens = [];
          vals.forEach(function (v) {
            var t = M4.el('div', { class: 'm4-token eigen-s3-tok', text: String(v) }, tray);
            t.setAttribute('data-v', String(v));
            tokens.push(t);
          });
          var want = [7, 10], slots = [s1, s2], filled = [false, false];
          M4.el('div', { class: 'm4-note', text: 'Drag a tile onto a dashed slot.' }, w);
          M4.dragDrop({
            tokens: tokens,
            slots: slots,
            onDrop: function (tok, slot) {
              var i = slots.indexOf(slot), v = +tok.getAttribute('data-v');
              if (i < 0 || filled[i]) return;
              if (v === want[i]) {
                filled[i] = true;
                tok.style.display = 'none';
                slot.textContent = String(v);
                slot.classList.add('filled', 'eigen-s3-ok', 'm4-pop');
                if (filled[0] && filled[1]) {
                  ctx.note('\\(p(\\lambda)=\\lambda^2-7\\lambda+10=(\\lambda-2)(\\lambda-5)\\), so the eigenvalues are \\(2\\) and \\(5\\).');
                  ctx.solved();
                } else {
                  ctx.note(i === 0 ? 'Correct: the trace is \\(4+3=7\\).' : 'Correct: the determinant is \\(4\\cdot 3-1\\cdot 2=10\\).');
                }
              } else if (i === 0) {
                ctx.wrong('The coefficient of λ is the trace: the sum of the two diagonal entries, 4 and 3.');
              } else if (v === 12) {
                ctx.wrong('12 is only the product of the diagonal entries. The determinant also subtracts the product of the other two entries.');
              } else {
                ctx.wrong('The constant term is the determinant: 4·3 minus 1·2.');
              }
            },
            onMiss: function () {}
          });
        }
      },
      {
        kind: 'explore',
        title: 'Trace, determinant and the roots',
        html:
          '<p>Every \\(2\\times 2\\) matrix with trace \\(t\\) and determinant \\(d\\) has the characteristic polynomial \\(p(\\lambda)=\\lambda^2-t\\lambda+d\\). The eigenvalues are the points where the parabola crosses the horizontal axis. Change \\(t\\) and \\(d\\) and follow the discriminant \\(t^2-4d\\). When it is negative, the parabola lies above the axis and there is no real eigenvalue.</p>',
        mount: function (el, ctx) {
          var w = wrap(el);
          var p = M4.plane(w, { xmin: -4, xmax: 6, ymin: -6, ymax: 10, width: 560, height: 448 });
          p.text(5.6, 0.7, 'λ', { fill: MUTED, size: 18, weight: 700 });
          p.text(0.8, 9.2, 'p(λ)', { fill: MUTED, size: 16, weight: 700 });
          var t = 4, d = 3;
          var curve = p.fn(function (x) { return x * x - t * x + d; }, { stroke: PINK, width: 4 });
          var r1 = p.point(0, 0, { r: 9, fill: BLUE }), r2 = p.point(0, 0, { r: 9, fill: BLUE });
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rD = readout(row), rR = readout(row);
          function update() {
            curve.set(function (x) { return x * x - t * x + d; });
            var disc = t * t - 4 * d;
            rD.textContent = 't² − 4d = ' + fmt(disc, 2);
            if (disc < -1e-9) {
              r1.el.style.display = 'none'; r2.el.style.display = 'none';
              rR.textContent = 'no real eigenvalues';
            } else {
              var s = Math.sqrt(Math.max(0, disc)), a = (t - s) / 2, b = (t + s) / 2;
              r1.el.style.display = ''; r2.el.style.display = '';
              r1.set(a, 0); r2.set(b, 0);
              rR.textContent = s < 1e-6 ? 'λ = ' + fmt(a, 2) + ' (repeated)' : 'λ = ' + fmt(a, 2) + ' and ' + fmt(b, 2);
            }
          }
          var sl = M4.el('div', { class: 'eigen-s3-sliders' }, w);
          M4.slider(sl, { min: -2, max: 6, step: 0.5, value: t, label: 'trace t', format: function (v) { return fmt(v, 1); }, onInput: function (v) { t = +v; update(); } });
          M4.slider(sl, { min: -4, max: 8, step: 0.5, value: d, label: 'determinant d', format: function (v) { return fmt(v, 1); }, onInput: function (v) { d = +v; update(); } });
          update();
          ctx.note('The quadratic formula gives \\(\\lambda=\\tfrac12\\big(t\\pm\\sqrt{t^2-4d}\\big)\\).');
        }
      },
      {
        kind: 'exercise',
        title: 'Eigenvalues on the number line',
        html:
          '<p>The matrix \\(A=\\begin{pmatrix}4&1\\\\2&3\\end{pmatrix}\\) has \\(p(\\lambda)=\\lambda^2-7\\lambda+10\\). Each marker on the \\(\\lambda\\)-axis carries a stem whose height is the value of \\(p\\) at that position. Drag the two markers to the two eigenvalues, where the stems vanish.</p>',
        hint: 'Two numbers that add up to 7 and multiply to 10 are required, since \\(p(\\lambda)=(\\lambda-r_1)(\\lambda-r_2)\\).',
        mount: function (el, ctx) {
          var w = wrap(el);
          var p = M4.plane(w, { xmin: -1, xmax: 8, ymin: -4, ymax: 12, width: 560, height: 448 });
          p.text(7.7, 0.8, 'λ', { fill: MUTED, size: 18, weight: 700 });
          function f(x) { return x * x - 7 * x + 10; }
          var curve = p.fn(f, { stroke: PINK, width: 4 });
          curve.el.style.display = 'none';
          var xs = [0.5, 6.5], cols = [BLUE, ORANGE], stems = [], tips = [], hs = [], done = false;
          var row = M4.el('div', { class: 'm4-row' }, w);
          var outs = [readout(row), readout(row)];
          outs[0].style.color = BLUE; outs[1].style.color = ORANGE;
          function draw(i) {
            stems[i].set(xs[i], 0, xs[i], f(xs[i]));
            tips[i].set(xs[i], f(xs[i]));
            outs[i].textContent = 'p(' + fmt(xs[i], 1) + ') = ' + fmt(f(xs[i]), 2);
          }
          function check() {
            if (done) return;
            var a = Math.min(xs[0], xs[1]), b = Math.max(xs[0], xs[1]);
            if (a === 2 && b === 5) {
              done = true;
              curve.el.style.display = '';
              ctx.note('The parabola crosses the axis at \\(\\lambda=2\\) and \\(\\lambda=5\\): \\(2+5=7\\) is the trace and \\(2\\cdot 5=10\\) is the determinant.');
              ctx.solved();
            } else if (xs[0] === xs[1] && f(xs[0]) === 0) {
              ctx.note('Both markers sit on the same eigenvalue. The other eigenvalue is a different number.');
            } else if (f(xs[0]) === 0 || f(xs[1]) === 0) {
              ctx.note('One stem has vanished. The two eigenvalues add up to the trace, 7.');
            } else {
              ctx.note('A stem above the axis means \\(p>0\\), below means \\(p<0\\). The eigenvalues are where \\(p\\) changes sign.');
            }
          }
          [0, 1].forEach(function (i) {
            stems[i] = p.line(xs[i], 0, xs[i], f(xs[i]), { stroke: cols[i], width: 5 });
            tips[i] = p.point(xs[i], f(xs[i]), { r: 6, fill: cols[i] });
          });
          [0, 1].forEach(function (i) {
            hs[i] = p.handle(xs[i], 0, {
              color: cols[i], r: 13, snap: 0.5,
              onDrag: function (x) {
                x = Math.max(0, Math.min(7, Math.round(x * 2) / 2));
                xs[i] = x; hs[i].set(x, 0); draw(i); check();
              },
              onEnd: function () { hs[i].set(xs[i], 0); draw(i); check(); }
            });
            draw(i);
          });
          ctx.note('Markers snap to multiples of 0.5.');
        }
      },
      {
        kind: 'exercise',
        title: 'Rotations',
        html:
          '<p>A rotation by the angle \\(\\theta\\) has the matrix \\(R=\\begin{pmatrix}\\cos\\theta&-\\sin\\theta\\\\ \\sin\\theta&\\cos\\theta\\end{pmatrix}\\), with trace \\(2\\cos\\theta\\) and determinant \\(1\\). Its characteristic polynomial \\(\\lambda^2-2\\cos\\theta\\,\\lambda+1\\) has discriminant \\(4\\cos^2\\theta-4\\), which is negative for almost every angle: a rotation turns every vector off its own line, so no vector is merely stretched.</p>' +
          '<p>Drag the blue vector \\(v\\) to confirm that its image \\(Rv\\) never lies on the dashed line through \\(v\\). Then set the angle to the one value in the slider range at which a real eigenvalue does exist.</p>',
        hint: 'The discriminant \\(4\\cos^2\\theta-4\\) is zero only when \\(\\cos\\theta=\\pm 1\\). Which rotation sends every vector to its exact opposite?',
        mount: function (el, ctx) {
          var w = wrap(el);
          var p = M4.plane(w, { xmin: -4, xmax: 4, ymin: -4, ymax: 4, width: 480, height: 480 });
          var th = 60, v = [2.5, 1], done = false;
          var span = p.line(0, 0, 0, 0, { stroke: BLUE, width: 2, dash: '7 7' });
          var av = p.arrow(0, 0, 0, 0, { stroke: PINK, width: 5 });
          var vv = p.arrow(0, 0, v[0], v[1], { stroke: BLUE, width: 5 });
          var leg = M4.el('div', { class: 'm4-row' }, w);
          legend(leg, BLUE, 'v');
          legend(leg, PINK, 'Rv');
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rD = readout(row), rE = readout(row);
          function update() {
            var r = th * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
            if (th === 180) { c = -1; s = 0; }
            var n = Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1, k = 12 / n;
            span.set(-k * v[0], -k * v[1], k * v[0], k * v[1]);
            vv.set(0, 0, v[0], v[1]);
            av.set(0, 0, c * v[0] - s * v[1], s * v[0] + c * v[1]);
            var disc = 4 * c * c - 4;
            rD.textContent = 'discriminant = ' + fmt(disc, 2);
            if (th === 180) {
              rE.textContent = 'λ = −1 (repeated)';
              rE.style.background = PINK; rE.style.color = '#fff';
              if (!done) {
                done = true;
                ctx.note('A half turn sends every \\(v\\) to \\(-v\\), so every non-zero vector is an eigenvector with \\(\\lambda=-1\\). Apart from \\(\\theta=0^\\circ\\) and \\(180^\\circ\\), a rotation has no real eigenvalues.');
                ctx.solved();
              }
            } else {
              rE.textContent = 'no real eigenvalues';
              rE.style.background = ''; rE.style.color = '';
              if (!done) ctx.note('At \\(\\theta=' + th + '^\\circ\\) the discriminant is \\(' + texNum(disc) + '<0\\): the pink arrow is off the dashed line for every choice of \\(v\\).');
            }
          }
          var h = p.handle(v[0], v[1], {
            color: BLUE, r: 13,
            onDrag: function (x, y) {
              x = Math.max(-3.6, Math.min(3.6, x)); y = Math.max(-3.6, Math.min(3.6, y));
              if (Math.abs(x) < 0.3 && Math.abs(y) < 0.3) { x = 0.3; }
              v = [x, y]; h.set(x, y); update();
            }
          });
          var sl = M4.el('div', { class: 'eigen-s3-sliders' }, w);
          M4.slider(sl, { min: 15, max: 345, step: 15, value: th, label: 'angle θ', format: function (x) { return Math.round(x) + '°'; }, onInput: function (x) { th = Math.round(+x); update(); } });
          update();
        }
      },
      {
        kind: 'exercise',
        title: 'Spread along a direction',
        html:
          '<p>The previous session summarised a cloud of data points by its spread matrix \\(\\Sigma\\). Its eigenvectors are the axes of the cloud, and its eigenvalues measure how far the cloud spreads along them. The largest eigenvalue therefore measures the spread along the long axis.</p>' +
          '<p>The cloud below has spread matrix \\(\\Sigma=\\begin{pmatrix}5&2\\\\2&2\\end{pmatrix}\\). Compute the largest eigenvalue of \\(\\Sigma\\).</p>',
        hint: 'The trace is 7 and the determinant is \\(5\\cdot 2-2\\cdot 2=6\\), so solve \\(\\lambda^2-7\\lambda+6=0\\) and take the larger root.',
        mount: function (el, ctx) {
          var w = wrap(el);
          var p = M4.plane(w, { xmin: -7, xmax: 7, ymin: -7, ymax: 7, width: 440, height: 440, labels: false });
          var seed = 12345;
          function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return (seed + 0.5) / 4294967296; }
          var s5 = Math.sqrt(5), u1 = [2 / s5, 1 / s5], u2 = [-1 / s5, 2 / s5], s6 = Math.sqrt(6);
          for (var i = 0; i < 90; i++) {
            var a = Math.sqrt(-2 * Math.log(rnd())), b = 2 * Math.PI * rnd();
            var z1 = a * Math.cos(b) * s6, z2 = a * Math.sin(b);
            var pt = p.point(z1 * u1[0] + z2 * u2[0], z1 * u1[1] + z2 * u2[1], { r: 4.5, fill: MUTED });
            pt.el.setAttribute('fill-opacity', '0.45');
          }
          var shown = false;
          function reveal() {
            if (shown) return; shown = true;
            p.arrow(0, 0, s6 * u1[0], s6 * u1[1], { stroke: PINK, width: 5 });
            p.arrow(0, 0, u2[0], u2[1], { stroke: BLUE, width: 5 });
            p.text(4.3, 0.2, 'spread 6', { fill: PINK, size: 17, weight: 700 });
            p.text(-2.6, 1.6, 'spread 1', { fill: BLUE, size: 17, weight: 700 });
          }
          M4.numberInput(w, {
            answer: 6, tolerance: 0.01, label: 'largest eigenvalue', placeholder: 'λ',
            onCorrect: function () {
              reveal();
              ctx.note('\\(\\lambda^2-7\\lambda+6=(\\lambda-1)(\\lambda-6)\\). The arrows have lengths \\(\\sqrt6\\) and \\(1\\), the square roots of the two eigenvalues.');
              ctx.solved();
            },
            onWrong: function (v) {
              v = +v;
              if (Math.abs(v - 1) < 0.01) ctx.wrong('1 is an eigenvalue, but the smaller one.');
              else if (Math.abs(v - 7) < 0.01) ctx.wrong('7 is the trace, which is the sum of both eigenvalues.');
              else if (Math.abs(v - 5) < 0.01) ctx.wrong('5 is a diagonal entry: the spread along the horizontal axis, not along the long axis of the cloud.');
              else ctx.wrong('Form λ² − (trace)λ + (determinant) and find its larger root.');
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'A matrix with given eigenvalues',
        html:
          '<p>The matrix \\(A=\\begin{pmatrix}a&2\\\\1&d\\end{pmatrix}\\) has two fixed entries and two adjustable diagonal entries \\(a\\) and \\(d\\). Choose \\(a\\) and \\(d\\) so that the eigenvalues of \\(A\\) are exactly \\(1\\) and \\(4\\), marked by the rings on the axis. The solid curve is the characteristic polynomial of the current matrix and the dashed curve is the target.</p>',
        hint: 'The eigenvalues must add up to the trace, so \\(a+d=5\\), and multiply to the determinant, so \\(ad-2=4\\).',
        mount: function (el, ctx) {
          var w = wrap(el);
          var mat = M4.el('div', { class: 'eigen-s3-matrix' }, w);
          var p = M4.plane(w, { xmin: -2, xmax: 7, ymin: -6, ymax: 10, width: 560, height: 448 });
          p.text(6.7, 0.8, 'λ', { fill: MUTED, size: 18, weight: 700 });
          var ghost = p.fn(function (x) { return (x - 1) * (x - 4); }, { stroke: MUTED, width: 2.5 });
          ghost.el.setAttribute('stroke-dasharray', '8 8');
          ghost.el.setAttribute('stroke-opacity', '0.7');
          var rings = [1, 4].map(function (x) {
            var r = p.point(x, 0, { r: 13, fill: '#ffffff' });
            r.el.setAttribute('stroke', PINK); r.el.setAttribute('stroke-width', '3');
            r.el.setAttribute('stroke-dasharray', '5 4');
            return r;
          });
          var a = 1, d = 1, done = false;
          var curve = p.fn(function (x) { return x * x; }, { stroke: PINK, width: 4 });
          var r1 = p.point(0, 0, { r: 7, fill: BLUE }), r2 = p.point(0, 0, { r: 7, fill: BLUE });
          var row = M4.el('div', { class: 'm4-row' }, w);
          var rT = readout(row), rDt = readout(row), rR = readout(row);
          function update() {
            var t = a + d, dt = a * d - 2;
            mat.innerHTML = M4.tex('A=\\begin{pmatrix}' + a + '&2\\\\1&' + d + '\\end{pmatrix}');
            curve.set(function (x) { return x * x - t * x + dt; });
            rT.textContent = 'trace = ' + fmt(t, 0);
            rDt.textContent = 'det = ' + fmt(dt, 0);
            var disc = t * t - 4 * dt, s = Math.sqrt(Math.max(0, disc));
            r1.set((t - s) / 2, 0); r2.set((t + s) / 2, 0);
            rR.textContent = 'λ = ' + fmt((t - s) / 2, 2) + ' and ' + fmt((t + s) / 2, 2);
          }
          var sl = M4.el('div', { class: 'eigen-s3-sliders' }, w);
          M4.slider(sl, { min: 0, max: 6, step: 1, value: a, label: 'a', format: function (v) { return fmt(v, 0); }, onInput: function (v) { a = Math.round(+v); update(); } });
          M4.slider(sl, { min: 0, max: 6, step: 1, value: d, label: 'd', format: function (v) { return fmt(v, 0); }, onInput: function (v) { d = Math.round(+v); update(); } });
          var br = M4.el('div', { class: 'm4-row' }, w);
          M4.button(br, 'Check', function () {
            if (done) return;
            var t = a + d, dt = a * d - 2;
            if (t === 5 && dt === 4) {
              done = true;
              rings.forEach(function (r) { r.el.setAttribute('fill', PINK); r.el.style.fill = PINK; r.el.removeAttribute('stroke-dasharray'); r.el.classList.add('m4-pop'); });
              ctx.note('\\(p(\\lambda)=\\lambda^2-5\\lambda+4=(\\lambda-1)(\\lambda-4)\\). Both \\((a,d)=(2,3)\\) and \\((3,2)\\) work, since only the trace and the determinant enter the polynomial.');
              ctx.solved();
            } else if (t !== 5) {
              ctx.wrong('The eigenvalues add up to the trace. The target is 1 + 4 = 5, the current trace is ' + t + '.');
            } else {
              ctx.wrong('The trace is right. The eigenvalues multiply to the determinant: ad − 2 must equal 4, but it is currently ' + dt + '.');
            }
          }, { primary: true });
          update();
          // discriminant here is (a-d)^2 + 8 > 0, so two real roots always exist
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html:
          '<ul>' +
          '<li>A number \\(\\lambda\\) is an eigenvalue of \\(A\\) exactly when \\(A-\\lambda I\\) collapses the plane, that is, when \\(\\det(A-\\lambda I)=0\\).</li>' +
          '<li>For a \\(2\\times 2\\) matrix this condition is the quadratic \\(\\lambda^2-\\operatorname{tr}A\\;\\lambda+\\det A=0\\). Its roots add up to the trace and multiply to the determinant.</li>' +
          '<li>If the discriminant \\((\\operatorname{tr}A)^2-4\\det A\\) is negative, as for a rotation, there are no real eigenvalues. For a symmetric matrix such as a spread matrix the eigenvalues are always real.</li>' +
          '</ul>' +
          '<p>The next session uses eigenvalues and eigenvectors together to diagonalise a matrix and to predict what happens when a map is applied many times.</p>'
      }
    ]
  });
})();
