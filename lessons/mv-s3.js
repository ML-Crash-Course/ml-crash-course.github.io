/* Gradients and Hessians, session 3: the Hessian as local curvature. */
(function () {
  'use strict';
  var C = M4.colors;

  function eig(a, b, c) {
    // symmetric [[a, c], [c, b]]
    var m = (a + b) / 2, d = Math.sqrt((a - b) * (a - b) / 4 + c * c);
    var l1 = m + d, l2 = m - d, v1, v2;
    if (Math.abs(c) < 1e-9) { v1 = a >= b ? [1, 0] : [0, 1]; v2 = a >= b ? [0, 1] : [1, 0]; }
    else { var L = Math.hypot(c, l1 - a); v1 = [c / L, (l1 - a) / L]; v2 = [-v1[1], v1[0]]; }
    return { l1: l1, l2: l2, v1: v1, v2: v2 };
  }

  function shapeName(l1, l2) {
    var e = 0.05;
    if (l1 > e && l2 > e) return 'bowl (minimum)';
    if (l1 < -e && l2 < -e) return 'dome (maximum)';
    if (l1 > e && l2 < -e) return 'saddle';
    if (Math.abs(l1) <= e && Math.abs(l2) <= e) return 'flat';
    return 'valley or ridge';
  }

  function readout(parent, items) {
    var row = M4.el('div', { class: 'm4-readout' }, parent), vals = {};
    items.forEach(function (it) {
      var s = M4.el('span', null, row);
      var l = M4.el('span', { html: it[1] }, s); M4.typeset(l);
      vals[it[0]] = M4.el('b', { text: '0' }, s);
    });
    return function (k, v) { vals[k].textContent = typeof v === 'number' ? M4.fmt(v, 2) : v; };
  }

  // Gradient descent on f = (l1 x^2 + l2 y^2) / 2 drawn over its contour map.
  function valleyScene(el, ctx) {
    var quiz = !!ctx, l1 = 3, l2 = quiz ? 0.5 : 0.4, eta = 0.3, x0 = -2.6, y0 = 1.5, newton = false;
    var p = M4.plane(el, { xmin: -3.2, xmax: 3.2, ymin: -2, ymax: 2, width: 600, height: 375 });
    var rings = [0.25, 1, 2.5, 5, 9].map(function () { return p.path([], { stroke: C.line, width: 1.5, layer: 'bg' }); });
    var path = p.path([], { stroke: C.orange, width: 2.5 });
    var dots = M4.svg('g', null, p.g);
    var nArrow = p.arrow(x0, y0, x0, y0, { stroke: C.green, width: 3.5, dash: '7 6' });
    p.point(0, 0, { color: C.green, r: 5 });
    p.point(x0, y0, { color: C.ink, r: 7 });
    var set = readout(el, [['k', '\\(\\kappa\\) = '], ['b', '\\(2/\\lambda_{\\max}\\) = '], ['n', 'steps to the minimum: ']]);
    function steps() {
      var x = x0, y = y0, pts = [[x, y]], n = null;
      for (var k = 1; k <= 200; k++) {
        x *= 1 - eta * l1; y *= 1 - eta * l2;
        if (k <= 40) pts.push([x, y]);
        if (n === null && Math.hypot(x, y) < 0.05) n = k;
        if (Math.hypot(x, y) > 60) break;
      }
      return { pts: pts, n: n };
    }
    function clip(q) { return [Math.max(-9, Math.min(9, q[0])), Math.max(-9, Math.min(9, q[1]))]; }
    function upd() {
      [0.25, 1, 2.5, 5, 9].forEach(function (c, i) {
        var a = Math.sqrt(2 * c / l1), b = Math.sqrt(2 * c / l2), pts = [];
        for (var j = 0; j <= 96; j++) { var t = 2 * Math.PI * j / 96; pts.push([a * Math.cos(t), b * Math.sin(t)]); }
        rings[i].set(pts);
      });
      var r = steps(), pts = r.pts.map(clip);
      path.set(pts);
      while (dots.firstChild) dots.removeChild(dots.firstChild);
      pts.slice(1).forEach(function (q) { M4.svg('circle', { cx: p.x(q[0]), cy: p.y(q[1]), r: 3.5, fill: C.orange }, dots); });
      nArrow.set(x0, y0, newton ? 0 : x0, newton ? 0 : y0);
      set('k', Math.max(l1, l2) / Math.min(l1, l2));
      set('b', 2 / Math.max(l1, l2));
      set('n', r.n === null ? (eta >= 2 / Math.max(l1, l2) ? 'diverges' : 'more than 200') : String(r.n));
      return r;
    }
    var ctrl = M4.el('div', { class: 'm4-row' }, el);
    if (!quiz) {
      M4.slider(ctrl, { label: '\\(\\lambda_1\\)', min: 0.2, max: 4, step: 0.1, value: l1, onInput: function (v) { l1 = v; upd(); } });
      M4.slider(ctrl, { label: '\\(\\lambda_2\\)', min: 0.2, max: 4, step: 0.1, value: l2, onInput: function (v) { l2 = v; upd(); } });
    }
    M4.slider(ctrl, { label: '\\(\\eta\\)', min: 0.02, max: 1, step: 0.01, value: eta, format: function (v) { return M4.fmt(v, 2); }, onInput: function (v) { eta = v; upd(); } });
    var row = M4.el('div', { class: 'm4-row' }, el);
    if (quiz) {
      M4.button(row, 'Check', function () {
        var r = upd();
        if (r.n !== null && r.n <= 13) ctx.solved('With \\(\\eta = ' + M4.fmt(eta, 2) + '\\) descent arrives in ' + r.n + ' steps. The best value is \\(2/(\\lambda_1 + \\lambda_2) \\approx 0.57\\), where both directions shrink by the same factor.');
        else if (r.n === null) ctx.wrong('The path never settles. The steep direction needs \\(\\eta < 2/3\\).');
        else if (eta < 0.5) ctx.wrong('That takes ' + r.n + ' steps. The flat direction is crawling, so try a larger step.');
        else ctx.wrong('That takes ' + r.n + ' steps. The path is bouncing across the steep direction, so try a slightly smaller step.');
      }, { primary: true });
    } else {
      var nb = M4.button(row, 'Show the Newton step', function () {
        newton = !newton; nb.textContent = newton ? 'Hide the Newton step' : 'Show the Newton step'; upd();
      }, { ghost: true });
      M4.typeset(M4.el('p', { class: 'm4-cap', html: 'The dashed green arrow is one Newton step \\(-H^{-1}\\nabla f\\). On a quadratic it lands on the minimum at once, whatever the shape of the valley.' }, el));
    }
    upd();
  }

  M4.lesson({
    id: 'mv-s3',
    module: 'multivariable',
    title: 'The Hessian and curvature',
    summary: 'Second derivatives collect into a matrix. Its eigenvalues say how the surface bends in each direction and decide between minimum, maximum and saddle.',
    minutes: 22,
    steps: [
      {
        kind: 'text',
        title: 'Second derivatives in two dimensions',
        html: '<p>The gradient tells us the slope. The next question is how the slope itself changes as we move. The slope has two parts, \\(\\partial f/\\partial x\\) and \\(\\partial f/\\partial y\\), and we can step in two directions, along \\(x\\) or along \\(y\\). So there are four ways it can change: each of the two slopes, for a step in each of the two directions.</p>' +
          '<p>Differentiating once more gives these four numbers. They form the <b>Hessian matrix</b></p>' +
          '\\[ H = \\begin{pmatrix} \\dfrac{\\partial^2 f}{\\partial x^2} & \\hspace{2.5em} \\dfrac{\\partial^2 f}{\\partial x\\,\\partial y} \\\\[6mm] \\dfrac{\\partial^2 f}{\\partial y\\,\\partial x} & \\hspace{2.5em} \\dfrac{\\partial^2 f}{\\partial y^2} \\end{pmatrix}. \\]' +
          '<p>The diagonal entries say how the slope along \\(x\\) changes when we step along \\(x\\), and likewise for \\(y\\). They measure how strongly the surface curves along each axis. The two entries off the diagonal say how the slope in one direction changes when we step in the other. For every function in this course they are equal, so \\(H\\) is symmetric.</p>'
      },
      {
        kind: 'text',
        title: 'What the Hessian adds',
        html: '<p>Zoom in close to a point and the surface looks like a tilted plane. That is what the gradient describes. Zoom out a little and the plane starts to bend, up like a bowl, down like a dome, or up in one direction and down in another like a saddle. The Hessian describes this bending.</p>' +
          '<p>Take a small step \\(\\mathbf h\\) away from \\(\\mathbf x\\). The new height is approximately the sum of three parts:</p>' +
          '\\[ f(\\mathbf x + \\mathbf h) \\;\\approx\\; \\underbrace{f(\\mathbf x)}_{\\text{height now}} \\;+\\; \\underbrace{\\nabla f(\\mathbf x) \\cdot \\mathbf h}_{\\text{change along the tilt}} \\;+\\; \\underbrace{\\tfrac12\\, \\mathbf h^\\top H \\mathbf h}_{\\text{bending}}. \\]' +
          '<p>At the bottom of a valley, the top of a hill or the centre of a saddle, the surface is flat and the gradient is zero. The middle part vanishes and only the bending is left. If \\(\\tfrac12\\mathbf h^\\top H\\mathbf h\\) is positive for every step, every step goes up and we sit at a minimum. If it is negative for every step, we sit at a maximum. If it is positive for some steps and negative for others, we sit on a saddle. The next widget shows all three shapes.</p>'
      },
      {
        kind: 'explore',
        title: 'Shapes of quadratics',
        html: '<p>The sliders set \\(H = \\begin{pmatrix} a & c \\\\ c & b \\end{pmatrix}\\). On the left is the surface \\(q(\\mathbf x) = \\tfrac12 \\mathbf x^\\top H \\mathbf x\\). Drag it to turn it. On the right the dashed unit circle is mapped by \\(H\\) to the shaded ellipse. The two arrows are the eigenvectors, stretched by their eigenvalues.</p>',
        mount: function (el) {
          var a = 1.5, b = 0.6, c = 0;
          var two = M4.el('div', { class: 'm4-two' }, el);
          var left = M4.el('div', null, two), right = M4.el('div', null, two);
          function q(x, y) { return 0.5 * (a * x * x + 2 * c * x * y + b * y * y); }
          var s = M4.surface3d(left, { f: q, r: 1.6, n: 22, width: 420, height: 360, color: C.red });
          var p = M4.plane(right, { xmin: -2.5, xmax: 2.5, ymin: -2.5, ymax: 2.5, width: 360, height: 360, labels: false });
          var circ = []; for (var i = 0; i <= 80; i++) { var t = 2 * Math.PI * i / 80; circ.push([Math.cos(t), Math.sin(t)]); }
          p.path(circ, { stroke: C.muted, width: 1.5, dash: '4 5', layer: 'bg' });
          var ell = p.path([], { stroke: C.red, width: 2, fill: C.red, fillOpacity: 0.12, closed: true });
          var e1 = p.arrow(0, 0, 1, 0, { stroke: C.blue, width: 3.5 });
          var e2 = p.arrow(0, 0, 0, 1, { stroke: C.orange, width: 3.5 });
          var set = readout(el, [['l1', '\\(\\lambda_1\\) = '], ['l2', '\\(\\lambda_2\\) = '], ['shape', 'shape: ']]);
          var ctrl = M4.el('div', { class: 'm4-row' }, el);
          function upd() {
            var pts = circ.map(function (u) { return [a * u[0] + c * u[1], c * u[0] + b * u[1]]; });
            ell.set(pts);
            var E = eig(a, b, c);
            e1.set(0, 0, E.l1 * E.v1[0], E.l1 * E.v1[1]);
            e2.set(0, 0, E.l2 * E.v2[0], E.l2 * E.v2[1]);
            set('l1', E.l1); set('l2', E.l2); set('shape', shapeName(E.l1, E.l2));
            s.setF(q);
          }
          M4.slider(ctrl, { label: '\\(a\\)', min: -2, max: 2, step: 0.1, value: a, onInput: function (v) { a = v; upd(); } });
          M4.slider(ctrl, { label: '\\(b\\)', min: -2, max: 2, step: 0.1, value: b, onInput: function (v) { b = v; upd(); } });
          M4.slider(ctrl, { label: '\\(c\\)', min: -2, max: 2, step: 0.1, value: c, onInput: function (v) { c = v; upd(); } });
          upd();
          M4.el('p', { class: 'm4-cap', text: 'Try a = 1, b = -1 for a saddle, and c = 1.4 with a = b = 1 to see a tilted valley appear.' }, el);
        }
      },
      {
        kind: 'text',
        title: 'Eigenvalues as curvatures',
        html: '<p>Because \\(H\\) is symmetric it has two orthogonal eigenvectors \\(\\mathbf v_1, \\mathbf v_2\\) with real eigenvalues \\(\\lambda_1 \\ge \\lambda_2\\). Walking along \\(\\mathbf v_i\\), the quadratic part equals \\(\\tfrac12 \\lambda_i t^2\\), a parabola with curvature \\(\\lambda_i\\). The eigenvalues are the largest and smallest curvatures over all directions.</p>' +
          '<ul><li>Both positive: the surface curves up in every direction, a <b>local minimum</b>.</li>' +
          '<li>Both negative: it curves down in every direction, a <b>local maximum</b>.</li>' +
          '<li>Opposite signs: up along one eigenvector and down along the other, a <b>saddle point</b>.</li></ul>' +
          '<p>Since \\(\\det H = \\lambda_1 \\lambda_2\\), a negative determinant always means a saddle. When the determinant is positive, the sign of \\(\\partial^2 f/\\partial x^2\\) separates minimum from maximum.</p>' +
          '<p>The ratio \\(\\kappa = \\lambda_1 / \\lambda_2\\) at a minimum is the <b>condition number</b>. A large \\(\\kappa\\) means a long narrow valley: steep across, nearly flat along. That shape is what slows gradient descent down.</p>'
      },
      {
        kind: 'exercise',
        title: 'A saddle point',
        html: '<p>The surface is \\(f(x, y) = x^3 - 3x + y^2\\). The dark wire patch under the ball is the quadratic approximation at the ball\'s position. The function has two critical points. Drag the ball to the saddle point. The values below show the Hessian eigenvalues as you move.</p>',
        hint: '\\(\\nabla f = (3x^2 - 3,\\ 2y)\\) vanishes at \\((\\pm 1, 0)\\). The Hessian is \\(\\mathrm{diag}(6x, 2)\\). Which of the two points has a negative eigenvalue?',
        mount: function (el, ctx) {
          function f(x, y) { return x * x * x - 3 * x + y * y; }
          var s = M4.surface3d(el, { f: f, r: 2, n: 26, color: C.red, contours: [-1.5, -1, 0, 1, 2, 3] });
          var set = readout(el, [['g', '\\(\\lVert\\nabla f\\rVert\\) = '], ['l', 'eigenvalues: '], ['shape', 'local shape: ']]);
          var done = false, warned = false;
          function local(x0, y0) {
            var f0 = f(x0, y0), gx = 3 * x0 * x0 - 3, gy = 2 * y0, hxx = 6 * x0;
            return function (x, y) { var dx = x - x0, dy = y - y0; return f0 + gx * dx + gy * dy + 0.5 * (hxx * dx * dx + 2 * dy * dy); };
          }
          function upd(x, y) {
            var gx = 3 * x * x - 3, gy = 2 * y, G = Math.hypot(gx, gy), l1 = 6 * x;
            s.patch(local(x, y), x, y, 0.55, C.ink);
            set('g', G);
            set('l', M4.fmt(Math.max(l1, 2), 2) + ', ' + M4.fmt(Math.min(l1, 2), 2));
            set('shape', l1 > 0.05 ? 'bowl' : l1 < -0.05 ? 'saddle' : 'valley');
            if (done || G > 0.25) return;
            if (x < 0) { done = true; ctx.solved('At \\((-1, 0)\\) the Hessian is \\(\\mathrm{diag}(-6, 2)\\): down along \\(x\\), up along \\(y\\).'); }
            else if (!warned) { warned = true; ctx.note('This critical point at \\((1, 0)\\) is a minimum, since both eigenvalues are positive. Look for the other one.'); }
          }
          var ball = s.ball(0, 1.2, { color: C.ink, onMove: upd });
          upd(ball.x, ball.y);
        }
      },
      {
        kind: 'exercise',
        title: 'Critical point classification',
        html: '<p>Each function has a critical point at the origin. Write down the Hessian and use its determinant and diagonal.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 4,
            gen: function () {
              var al, be, ga, det;
              do { al = M4.randNZ(-3, 3); be = M4.randNZ(-3, 3); ga = M4.rand(-4, 4); det = 4 * al * be - ga * ga; } while (det === 0);
              var ans = det < 0 ? 2 : al > 0 ? 0 : 1;
              var why = det < 0 ? 'negative, so the eigenvalues have opposite signs' : 'positive and \\(f_{xx} = ' + 2 * al + '\\) is ' + (al > 0 ? 'positive' : 'negative');
              return {
                q: '<p>Classify the critical point of \\(f(x, y) = ' + M4.poly([[al, 'x^2'], [ga, 'xy'], [be, 'y^2']]) + '\\) at \\((0, 0)\\).</p>',
                options: ['minimum', 'maximum', 'saddle point'],
                answer: ans,
                explain: '\\(H = \\begin{pmatrix} ' + 2 * al + ' & ' + ga + ' \\\\ ' + ga + ' & ' + 2 * be + ' \\end{pmatrix}\\), \\(\\det H = ' + det + '\\), which is ' + why + '.'
              };
            }
          });
        }
      },
      {
        kind: 'exercise',
        title: 'Mixed partials',
        html: '<p>Differentiate once with respect to each variable, in either order.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 3,
            gen: function () {
              var a = M4.randNZ(-3, 3), b = M4.randNZ(-3, 3), p = M4.randNZ(-2, 2), q = M4.randNZ(-2, 2);
              var kind = M4.pick(['xy', 'xx', 'yy']);
              // f = a x^2 y + b x y^3
              var fxy = 2 * a * p + 3 * b * q * q, fxx = 2 * a * q, fyy = 6 * b * p * q;
              var lab = kind === 'xy' ? '\\dfrac{\\partial^2 f}{\\partial x\\,\\partial y}' : kind === 'xx' ? '\\dfrac{\\partial^2 f}{\\partial x^2}' : '\\dfrac{\\partial^2 f}{\\partial y^2}';
              var ans = kind === 'xy' ? fxy : kind === 'xx' ? fxx : fyy;
              var ex = kind === 'xy' ? '\\(f_x = ' + 2 * a + 'xy + ' + M4.sn(b) + 'y^3\\), so \\(f_{xy} = ' + 2 * a + 'x + ' + 3 * b + 'y^2 = ' + fxy + '\\).'
                : kind === 'xx' ? '\\(f_x = ' + 2 * a + 'xy + ' + M4.sn(b) + 'y^3\\), so \\(f_{xx} = ' + 2 * a + 'y = ' + fxx + '\\).'
                : '\\(f_y = ' + a + 'x^2 + ' + 3 * b + 'xy^2\\), so \\(f_{yy} = ' + 6 * b + 'xy = ' + fyy + '\\).';
              return {
                q: '<p>Let \\(f(x, y) = ' + M4.poly([[a, 'x^2 y'], [b, 'x y^3']]) + '\\). Compute \\(' + lab + '\\) at \\((' + p + ', ' + q + ')\\).</p>',
                answer: ans,
                explain: ex
              };
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Curvature in optimisation',
        html: '<p>Near a minimum a loss behaves like \\(\\tfrac12 \\mathbf h^\\top H \\mathbf h\\). Gradient descent with step size \\(\\eta\\) multiplies the error along eigenvector \\(\\mathbf v_i\\) by \\(1 - \\eta\\lambda_i\\) at every step. The iteration converges only if \\(|1 - \\eta \\lambda_i| < 1\\) for all \\(i\\), which means</p>' +
          '\\[ \\eta < \\frac{2}{\\lambda_{\\max}}. \\]' +
          '<p>The steepest direction caps the step size, and the flattest direction, with factor \\(1 - \\eta\\lambda_{\\min}\\), then sets how slowly the last part of the error disappears. The number of steps grows roughly in proportion to the condition number \\(\\kappa\\).</p>' +
          '<p><b>Newton\'s method</b> uses the Hessian directly: \\(\\mathbf x \\leftarrow \\mathbf x - H^{-1} \\nabla f\\). On a quadratic it reaches the minimum in one step, whatever \\(\\kappa\\) is. Neural networks have millions of parameters, so storing and inverting \\(H\\) is out of reach. The optimizers in the later modules approximate its effect with cheaper per-coordinate statistics.</p>'
      },
      {
        kind: 'explore',
        title: 'Descent in a narrow valley',
        html: '<p>The loss is \\(f(x, y) = \\tfrac12(\\lambda_1 x^2 + \\lambda_2 y^2)\\), so the Hessian is \\(\\mathrm{diag}(\\lambda_1, \\lambda_2)\\). The orange path shows forty steps of gradient descent from the black start point. Make the valley narrow by pulling the two curvatures apart, then try different step sizes.</p>',
        mount: function (el) { valleyScene(el, null); }
      },
      {
        kind: 'exercise',
        title: 'Tune the step size',
        html: '<p>Here \\(\\lambda_1 = 3\\) and \\(\\lambda_2 = 0.5\\). Choose a step size \\(\\eta\\) so that gradient descent gets within 0.05 of the minimum in at most 13 steps, then press Check.</p>',
        hint: 'A small step crawls along the flat \\(y\\) direction. A step close to \\(2/\\lambda_1 \\approx 0.67\\) makes the path bounce across the steep \\(x\\) direction. The best compromise makes both factors \\(|1 - \\eta\\lambda_i|\\) equally small, which happens at \\(\\eta = 2/(\\lambda_1 + \\lambda_2)\\).',
        mount: function (el, ctx) { valleyScene(el, ctx); }
      },
      {
        kind: 'exercise',
        title: 'Largest stable step',
        html: '<p>Gradient descent on a quadratic converges only if \\(\\eta < 2/\\lambda_{\\max}\\). Find the bound for each Hessian.</p>',
        mount: function (el, ctx) {
          M4.practice(el, ctx, {
            n: 3,
            gen: function () {
              if (Math.random() < 0.5) {
                var l1 = M4.pick([1, 2, 4, 5, 8, 10]), l2 = M4.pick([0.5, 1, 2, 4]);
                var mx = Math.max(l1, l2);
                return {
                  q: '<p>\\(H = \\begin{pmatrix} ' + l1 + ' & 0 \\\\ 0 & ' + l2 + ' \\end{pmatrix}\\). What is the largest step size \\(\\eta\\) for which gradient descent still converges? Give the bound \\(2/\\lambda_{\\max}\\).</p>',
                  answer: 2 / mx, tol: 0.01,
                  explain: 'The eigenvalues of a diagonal matrix are its diagonal entries, so \\(\\lambda_{\\max} = ' + mx + '\\) and the bound is \\(2/' + mx + ' = ' + M4.fmt(2 / mx, 3) + '\\).'
                };
              }
              // symmetric [[a, c], [c, a]] has eigenvalues a + c and a - c
              var a = M4.pick([2, 3, 4, 5]), c = M4.pick([1, 2]) * (Math.random() < 0.5 ? -1 : 1);
              var top = a + Math.abs(c);
              return {
                q: '<p>\\(H = \\begin{pmatrix} ' + a + ' & ' + c + ' \\\\ ' + c + ' & ' + a + ' \\end{pmatrix}\\). Its eigenvectors are \\((1, 1)\\) and \\((1, -1)\\). What is the bound \\(2/\\lambda_{\\max}\\)?</p>',
                answer: 2 / top, tol: 0.01,
                explain: 'Multiplying \\((1, 1)\\) by \\(H\\) gives \\(' + (a + c) + '(1, 1)\\), and \\((1, -1)\\) gives \\(' + (a - c) + '(1, -1)\\). So \\(\\lambda_{\\max} = ' + top + '\\) and the bound is \\(' + M4.fmt(2 / top, 3) + '\\).'
              };
            }
          });
        }
      },
      {
        kind: 'text',
        title: 'Recap',
        html: '<ul>' +
          '<li>The Hessian collects the second derivatives. Near a point, the surface is a tilted plane plus the quadratic \\(\\tfrac12 \\mathbf h^\\top H \\mathbf h\\).</li>' +
          '<li>Its eigenvalues are the curvatures along its eigenvectors. Their signs separate minimum, maximum and saddle.</li>' +
          '<li>The largest curvature caps the step size at \\(2/\\lambda_{\\max}\\), and the condition number \\(\\lambda_{\\max}/\\lambda_{\\min}\\) decides how slow descent becomes.</li>' +
          '</ul>'
      }
    ]
  });
})();
