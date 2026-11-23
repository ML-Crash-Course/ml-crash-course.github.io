/* Derivative drill: power, product and chain rules, exp and log, activations, a gradient step and a minimum. */
(function () {
  'use strict';
  var D = M4.D, T = D.T, TT = D.TT;
  var R = M4.rand, RN = M4.randNZ, pick = M4.pick;

  function lines(arr) { return '<div class="m4-drill-lines">' + arr.map(TT).join('') + '</div>'; }
  /* polynomial from [coefficient, power] pairs */
  function poly(terms, v) {
    v = v || 'x';
    var s = '';
    terms.forEach(function (t) {
      var c = t[0], p = t[1];
      if (!c) return;
      var mono = p === 0 ? '' : p === 1 ? v : v + '^{' + p + '}';
      var a = Math.abs(c), body = (a === 1 && p > 0) ? mono : D.t(a) + mono;
      s += s === '' ? (c < 0 ? '-' : '') + body : (c < 0 ? ' - ' : ' + ') + body;
    });
    return s || '0';
  }
  function frac(n, d) {
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(Math.abs(n), d); n /= g; d /= g;
    return d === 1 ? String(n) : (n < 0 ? '-' : '') + '\\tfrac{' + Math.abs(n) + '}{' + d + '}';
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a || 1; }
  function mix(right, wrong) {
    var opts = D.shuffle([right].concat(wrong));
    return { options: opts.map(T), answer: opts.indexOf(right) };
  }

  /* 1. power rule on a cubic */
  function lv1() {
    var a = RN(-3, 3), b = R(-4, 4), c = R(-5, 5), d = R(-6, 6), x = RN(-2, 2);
    var fp = [[3 * a, 2], [2 * b, 1], [c, 0]], ans = 3 * a * x * x + 2 * b * x + c;
    return {
      q: '<p>Compute the derivative at ' + T('x = ' + x) + '.</p>' + TT('f(x) = ' + poly([[a, 3], [b, 2], [c, 1], [d, 0]])),
      hint: 'Power rule: ' + T('\\tfrac{d}{dx}x^n = n x^{n-1}') + '. Constants vanish and sums are differentiated term by term.',
      fields: [{ label: T("f'(" + x + ')'), answer: ans, tol: 0 }],
      solution: lines(["f'(x) = " + poly(fp), "f'(" + x + ') = ' + 3 * a + '\\cdot' + D.pt(x) + '^2 ' + (2 * b < 0 ? '- ' : '+ ') + Math.abs(2 * b) + '\\cdot' + D.pt(x) + ' ' + (c < 0 ? '- ' : '+ ') + Math.abs(c) + ' = ' + ans]) +
        '<p>The constant ' + T(String(d)) + ' shifts the graph up or down and does not change any slope.</p>'
    };
  }

  /* 2. product rule */
  function lv2() {
    var a = RN(-3, 3), b = R(-4, 4), c = RN(-2, 2), d = R(-4, 4), x = RN(-2, 2);
    var u = a * x + b, v = c * x * x + d, du = a, dv = 2 * c * x, ans = du * v + u * dv;
    return {
      q: '<p>Compute the derivative at ' + T('x = ' + x) + ' with the product rule.</p>' + TT('f(x) = (' + poly([[a, 1], [b, 0]]) + ')(' + poly([[c, 2], [d, 0]]) + ')'),
      hint: 'With ' + T('u = ' + poly([[a, 1], [b, 0]])) + ' and ' + T('v = ' + poly([[c, 2], [d, 0]])) + ', the product rule says ' + T("f' = u'v + uv'") + '. Evaluate each piece at the point first.',
      fields: [{ label: T('u(' + x + ')'), answer: u, tol: 0 }, { label: T('v(' + x + ')'), answer: v, tol: 0 }, { label: T("f'(" + x + ')'), answer: ans, tol: 0 }],
      solution: lines(['u = ' + u + ",\\quad u' = " + du + ',\\qquad v = ' + v + ",\\quad v' = " + 2 * c + 'x = ' + dv,
        "f'(" + x + ") = u'v + uv' = " + du + '\\cdot' + D.pt(v) + ' + ' + D.pt(u) + '\\cdot' + D.pt(dv) + ' = ' + ans]) +
        '<p>Multiplying out first and using the power rule gives the same number. The product rule is faster once the factors get longer. See <a href="#/l/calculus-s2">Derivative rules</a>.</p>'
    };
  }

  /* 3. chain rule with a power */
  function lv3() {
    var a = RN(-2, 2), b = R(-3, 3), n = pick([2, 3]), x = RN(-2, 2);
    var u = a * x * x + b, du = 2 * a * x, ans = n * Math.pow(u, n - 1) * du;
    if (u === 0) return null;
    return {
      q: '<p>Compute the derivative at ' + T('x = ' + x) + '.</p>' + TT('f(x) = (' + poly([[a, 2], [b, 0]]) + ')^{' + n + '}'),
      hint: 'Call the inside ' + T('u = ' + poly([[a, 2], [b, 0]])) + '. Then ' + T("f' = " + n + 'u^{' + (n - 1) + "}\\cdot u'") + ', the outer derivative times the inner derivative.',
      fields: [{ label: T('u(' + x + ')'), answer: u, tol: 0 }, { label: T("u'(" + x + ')'), answer: du, tol: 0 }, { label: T("f'(" + x + ')'), answer: ans, tol: 0 }],
      solution: lines(['u = ' + a * x * x + ' ' + (b < 0 ? '- ' : '+ ') + Math.abs(b) + ' = ' + u + ",\\qquad u' = " + 2 * a + 'x = ' + du,
        "f'(" + x + ') = ' + n + '\\cdot' + D.pt(u) + (n === 3 ? '^2' : '') + '\\cdot' + D.pt(du) + ' = ' + ans]) +
        '<p>The outer function sees only ' + T('u') + '. Its slope ' + T(n + 'u^{' + (n - 1) + '}') + ' gets multiplied by how fast ' + T('u') + ' moves with ' + T('x') + '. See <a href="#/l/calculus-s3">The chain rule</a>.</p>'
    };
  }

  /* 4. exponentials and logarithms */
  function lv4() {
    var k = pick([0, 1, 2, 3, 4]), x, f, ans, sol, a, b, c;
    if (k === 0) {
      a = RN(-3, 3); x = R(-2, 3); var inner = R(1, 6); b = inner - a * x;
      f = '\\ln(' + poly([[a, 1], [b, 0]]) + ')'; ans = a / inner;
      sol = ["f'(x) = \\frac{" + a + '}{' + poly([[a, 1], [b, 0]]) + '}', "f'(" + x + ') = \\frac{' + a + '}{' + inner + '} = ' + frac(a, inner)];
    } else if (k === 1) {
      a = RN(-3, 3); x = RN(-2, 2); b = -a * x;
      f = 'x\\,e^{' + poly([[a, 1], [b, 0]]) + '}'; ans = 1 + a * x;
      sol = ["f'(x) = e^{" + poly([[a, 1], [b, 0]]) + '} + x\\cdot ' + a + 'e^{' + poly([[a, 1], [b, 0]]) + '} = (1 ' + (a < 0 ? '- ' : '+ ') + (Math.abs(a) === 1 ? '' : Math.abs(a)) + 'x)\\,e^{' + poly([[a, 1], [b, 0]]) + '}',
        'x = ' + x + '\\text{ makes the exponent } 0,\\text{ so } e^0 = 1', "f'(" + x + ') = 1 ' + (a < 0 ? '- ' : '+ ') + Math.abs(a) + '\\cdot' + D.pt(x) + ' = ' + ans];
    } else if (k === 2) {
      c = R(1, 5); x = RN(-3, 3);
      f = '\\ln(x^2 + ' + c + ')'; ans = 2 * x / (x * x + c);
      sol = ["f'(x) = \\frac{2x}{x^2 + " + c + '}', "f'(" + x + ') = \\frac{' + 2 * x + '}{' + (x * x + c) + '} = ' + frac(2 * x, x * x + c)];
    } else if (k === 3) {
      a = RN(-2, 2); x = RN(-2, 2); b = -a * x;
      f = 'e^{' + poly([[a, 2], [b, 1]]) + '}'; ans = 2 * a * x + b;
      sol = ["f'(x) = (" + poly([[2 * a, 1], [b, 0]]) + ')\\,e^{' + poly([[a, 2], [b, 1]]) + '}', 'x = ' + x + '\\text{ makes the exponent } 0', "f'(" + x + ') = ' + 2 * a * x + ' ' + (b < 0 ? '- ' : '+ ') + Math.abs(b) + ' = ' + ans];
    } else {
      c = RN(-4, 4); var m = RN(-4, 4); x = R(1, 4);
      f = (c === 1 ? '' : c === -1 ? '-' : c) + '\\ln x ' + (m < 0 ? '- ' : '+ ') + '\\frac{' + Math.abs(m) + '}{x}'; ans = c / x - m / (x * x);
      sol = ["f'(x) = \\frac{" + c + '}{x} ' + (m < 0 ? '+ ' : '- ') + '\\frac{' + Math.abs(m) + '}{x^2}', "f'(" + x + ') = ' + frac(c, x) + ' ' + (m < 0 ? '+ ' : '- ') + frac(Math.abs(m), x * x) + ' = ' + frac(c * x - m, x * x)];
    }
    return {
      q: '<p>Compute the derivative at ' + T('x = ' + x) + '. Fractions like 3/5 are accepted.</p>' + TT('f(x) = ' + f),
      hint: T('\\tfrac{d}{dx}e^{u} = e^{u}u\'') + ' and ' + T('\\tfrac{d}{dx}\\ln u = u\'/u') + '. Both are the chain rule with the outer derivatives ' + T('e^u') + ' and ' + T('1/u') + '.',
      fields: [{ label: T("f'(" + x + ')'), answer: ans }],
      solution: lines(sol) + '<p>These two outer derivatives come back in softmax and in every loss built from a logarithm. See <a href="#/l/functions-s2">Exponentials</a> for the rules on ' + T('e^x') + '.</p>'
    };
  }

  /* 5. activation functions */
  function lv5() {
    var k = pick([0, 1, 2, 3, 4]), q, hint, ans, sol;
    if (k === 0) {
      var p = pick([0.1, 0.2, 0.25, 0.5, 0.6, 0.75, 0.8, 0.9]); ans = p * (1 - p);
      q = 'At some input ' + T('z') + ' the sigmoid has the value ' + T('\\sigma(z) = ' + p) + '. Compute ' + T("\\sigma'(z)") + '.';
      hint = T("\\sigma'(z) = \\sigma(z)\\,(1 - \\sigma(z))") + '. You never need ' + T('z') + ' itself.';
      sol = ["\\sigma'(z) = " + p + '\\cdot(1 - ' + p + ') = ' + D.t(ans, 4)];
    } else if (k === 1) {
      var t = pick([0, 0.5, -0.5, 0.6, -0.8, 0.9]); ans = 1 - t * t;
      q = 'At some input ' + T('z') + ' the hyperbolic tangent has the value ' + T('\\tanh(z) = ' + t) + '. Compute the derivative of ' + T('\\tanh') + ' there.';
      hint = T("\\tanh'(z) = 1 - \\tanh^2(z)") + '.';
      sol = ["\\tanh'(z) = 1 - " + D.pt(t) + '^2 = ' + D.t(ans, 4)];
    } else if (k === 2) {
      var e = R(1, 9); ans = e / (1 + e);
      q = 'Softplus is ' + T('s(z) = \\ln(1 + e^{z})') + '. At some ' + T('z') + ' you know ' + T('e^{z} = ' + e) + '. Compute ' + T("s'(z)") + '.';
      hint = 'Use ' + T('\\tfrac{d}{dz}\\ln u = u\'/u') + ' with ' + T('u = 1 + e^z') + '.';
      sol = ["s'(z) = \\frac{e^{z}}{1 + e^{z}} = \\frac{" + e + '}{' + (1 + e) + '} \\approx ' + D.t(ans, 3), '\\text{This is } \\sigma(z)\\text{, the sigmoid.}'];
    } else if (k === 3) {
      var p2 = pick([0.2, 0.25, 0.5, 0.75, 0.8]), xx = RN(-3, 3); ans = p2 * (1 - p2) * xx;
      q = 'Let ' + T('a = \\sigma(wx)') + ' with input ' + T('x = ' + xx) + '. At the current value of ' + T('w') + ' the output is ' + T('a = ' + p2) + '. Compute ' + T('\\mathrm{d}a/\\mathrm{d}w') + '.';
      hint = 'Chain rule: ' + T("\\sigma'(wx)") + ' times the derivative of ' + T('wx') + ' with respect to ' + T('w') + ', which is ' + T('x') + '.';
      sol = ['\\frac{\\mathrm{d}a}{\\mathrm{d}w} = a(1 - a)\\cdot x = ' + p2 + '\\cdot' + D.t(1 - p2) + '\\cdot' + D.pt(xx) + ' = ' + D.t(ans, 4)];
    } else {
      var z = RN(-5, 5), leak = pick([0, 0, 0.1, 0.01]); ans = z > 0 ? 1 : leak;
      q = (leak ? 'Leaky ReLU is ' + T('f(z) = \\max(' + leak + 'z, z)') : 'ReLU is ' + T('f(z) = \\max(0, z)')) + '. Compute ' + T("f'(z)") + ' at ' + T('z = ' + z) + '.';
      hint = 'On each side of zero the function is a straight line. Read off its slope.';
      sol = [z > 0 ? 'z > 0:\\ f(z) = z,\\ f\'(z) = 1' : 'z < 0:\\ f(z) = ' + (leak ? leak + 'z' : '0') + ",\\ f'(z) = " + ans];
    }
    return {
      q: '<p>' + q + '</p>', hint: hint,
      fields: [{ label: 'Derivative', answer: ans, tol: 0.005 }],
      solution: lines(sol) + '<p>Later in the course, neural networks use these functions and multiply by this derivative on their way back. See <a href="#/l/calculus-s3">The chain rule</a>.</p>'
    };
  }

  /* 6. pick the derivative */
  function lv6() {
    var a = pick([-3, -2, 2, 3]), b = RN(-4, 4), n = pick([2, 3, 4, 5]), u = poly([[a, 1], [b, 0]]);
    var T6 = [
      { f: '(' + u + ')^{' + n + '}', r: n * a + '(' + u + ')^{' + (n - 1) + '}', w: [n + '(' + u + ')^{' + (n - 1) + '}', '\\tfrac{1}{' + (n + 1) + '}(' + u + ')^{' + (n + 1) + '}', n * a + '(' + u + ')^{' + n + '}'],
        why: 'The outer derivative ' + T(n + 'u^{' + (n - 1) + '}') + ' times the inner derivative ' + T(String(a)) + '.' },
      { f: 'e^{-x^2}', r: '-2x\\,e^{-x^2}', w: ['e^{-x^2}', '-x^2 e^{-x^2 - 1}', '-2x\\,e^{-2x}'],
        why: 'The exponential keeps its form and is multiplied by the derivative of the exponent, ' + T('-2x') + '.' },
      { f: 'x\\ln x', r: '\\ln x + 1', w: ['\\tfrac1x', '\\ln x', 'x + \\ln x'],
        why: 'Product rule: ' + T('1\\cdot\\ln x + x\\cdot\\tfrac1x') + '.' },
      { f: '\\frac{1}{1 + e^{-x}}', r: '\\frac{e^{-x}}{(1 + e^{-x})^2}', w: ['\\frac{-e^{-x}}{(1 + e^{-x})^2}', '\\frac{1}{(1 + e^{-x})^2}', '\\frac{e^{-x}}{1 + e^{-x}}'],
        why: 'Write it as ' + T('(1 + e^{-x})^{-1}') + '. The outer derivative is ' + T('-(1 + e^{-x})^{-2}') + ' and the inner derivative is ' + T('-e^{-x}') + ', so the two minus signs cancel.' },
      { f: '\\ln(x^2 + 1)', r: '\\frac{2x}{x^2 + 1}', w: ['\\frac{1}{x^2 + 1}', '\\frac{1}{2x}', '2x\\ln(x^2 + 1)'],
        why: 'The derivative of the inside, ' + T('2x') + ', divided by the inside.' },
      { f: '\\sqrt{x}', r: '\\frac{1}{2\\sqrt x}', w: ['\\frac{\\sqrt x}{2}', '2\\sqrt x', '\\frac{1}{\\sqrt x}'],
        why: 'Power rule with ' + T('n = \\tfrac12') + ': ' + T('\\tfrac12 x^{-1/2}') + '.' },
      { f: 'e^{' + a + 'x}', r: a + 'e^{' + a + 'x}', w: ['e^{' + a + 'x}', a + 'x\\,e^{' + (a - 1) + 'x}', 'e^{' + a + '}'],
        why: 'Chain rule with the inner derivative ' + T(String(a)) + '.' },
      { f: '\\ln(1 + e^{x})', r: '\\frac{e^{x}}{1 + e^{x}}', w: ['\\frac{1}{1 + e^{x}}', 'e^{x}\\ln(1 + e^{x})', '\\frac{1}{e^{x}}'],
        why: 'The inner derivative ' + T('e^{x}') + ' over the inside ' + T('1 + e^{x}') + '. This is the sigmoid.' },
      { f: '\\frac{1}{x^{' + n + '}}', r: '-\\frac{' + n + '}{x^{' + (n + 1) + '}}', w: ['\\frac{' + n + '}{x^{' + (n + 1) + '}}', '-\\frac{' + n + '}{x^{' + (n - 1) + '}}', '\\frac{1}{' + n + 'x^{' + (n - 1) + '}}'],
        why: 'Write it as ' + T('x^{-' + n + '}') + ' and apply the power rule: ' + T('-' + n + 'x^{-' + (n + 1) + '}') + '.' }
    ];
    var t = pick(T6), m = mix(t.r, t.w);
    return {
      q: '<p>Which expression is the derivative?</p>' + TT('\\frac{d}{dx}\\,' + t.f),
      hint: 'Identify the outer function and the inside. Differentiate the outer function, leave the inside as it is, then multiply by the derivative of the inside.',
      options: m.options, answer: m.answer, optCols: 2,
      solution: lines(['\\frac{d}{dx}\\,' + t.f + ' = ' + t.r]) + '<p>' + t.why + '</p>'
    };
  }

  /* 7. derivative of a squared loss and one gradient step */
  function lv7() {
    var x = RN(-3, 3), y = R(-5, 5), w = R(-2, 2), eta = pick([0.1, 0.05, 0.01]);
    var r = w * x - y, g = 2 * x * r, w1 = D.r(w - eta * g, 4);
    return {
      q: '<p>One training example ' + T('(x, y) = (' + x + ', ' + y + ')') + ' and the squared loss</p>' + TT('L(w) = (wx - y)^2') +
        '<p>At ' + T('w = ' + w) + ' compute ' + T('dL/dw') + ', then take one gradient descent step with learning rate ' + T('\\eta = ' + eta) + '.</p>',
      hint: 'Chain rule: the outer square gives ' + T('2(wx - y)') + ' and the inside has derivative ' + T('x') + ' with respect to ' + T('w') + '. The step is ' + T("w - \\eta\\,L'(w)") + '.',
      fields: [{ label: T('dL/dw'), answer: g, tol: 0 }, { label: 'New ' + T('w'), answer: w1, tol: 0.002 }],
      solution: lines(['wx - y = ' + w + '\\cdot' + D.pt(x) + ' - ' + D.pt(y) + ' = ' + r, '\\frac{dL}{dw} = 2(wx - y)\\,x = 2\\cdot' + D.pt(r) + '\\cdot' + D.pt(x) + ' = ' + g,
        'w \\leftarrow ' + w + ' - ' + eta + '\\cdot' + D.pt(g) + ' = ' + D.t(w1, 4)]) +
        '<p>' + (g === 0 ? 'The prediction is already exact, so the derivative is zero and the weight stays put.' : 'The step moves ' + T('w') + ' against the sign of the derivative, toward the weight ' + T('y/x = ' + D.t(y / x)) + ' that fits this example exactly.') + ' See <a href="#/l/calculus-s1">Slope and the derivative</a>.</p>'
    };
  }

  /* 8. a chain of three functions */
  function lv8() {
    var a = RN(-3, 3), b = R(-3, 3), c = R(1, 4), x = R(-2, 2), outer = pick(['ln', 'sq']);
    var u = a * x + b, v = u * u + c, ans = outer === 'ln' ? 2 * a * u / v : 4 * a * u * v;
    var f = outer === 'ln' ? '\\ln\\big((' + poly([[a, 1], [b, 0]]) + ')^2 + ' + c + '\\big)' : '\\big((' + poly([[a, 1], [b, 0]]) + ')^2 + ' + c + '\\big)^2';
    var last = outer === 'ln' ? '\\frac{df}{dv} = \\frac1v = \\frac{1}{' + v + '}' : '\\frac{df}{dv} = 2v = ' + 2 * v;
    return {
      q: '<p>Compute the derivative at ' + T('x = ' + x) + ' by splitting the function into three steps ' + T('u = ' + poly([[a, 1], [b, 0]])) + ', ' + T('v = u^2 + ' + c) + ' and ' + (outer === 'ln' ? T('f = \\ln v') : T('f = v^2')) + '.</p>' + TT('f(x) = ' + f),
      hint: 'Forward first: compute ' + T('u') + ' and ' + T('v') + ' at the point. Then multiply the three local slopes ' + T('df/dv\\cdot dv/du\\cdot du/dx') + '.',
      fields: [{ label: T('u'), answer: u, tol: 0 }, { label: T('v'), answer: v, tol: 0 }, { label: T("f'(" + x + ')'), answer: ans }],
      solution: lines(['u = ' + u + ',\\qquad v = ' + D.pt(u) + '^2 + ' + c + ' = ' + v, last + ',\\qquad \\frac{dv}{du} = 2u = ' + 2 * u + ',\\qquad \\frac{du}{dx} = ' + a,
        "f'(" + x + ') = ' + (outer === 'ln' ? frac(1, v) : 2 * v) + '\\cdot' + D.pt(2 * u) + '\\cdot' + D.pt(a) + ' = ' + (outer === 'ln' ? frac(2 * a * u, v) : ans)]) +
        '<p>This is a backward pass on a computation graph with three nodes. <a href="#/l/bp-drill">Backpropagation practice</a> does the same with weights and many inputs.</p>'
    };
  }

  /* 9. set the derivative to zero */
  function lv9() {
    var a = pick([1, 2, 3, 4]), b = RN(-8, 8), c = R(-5, 5);
    var xs = -b / (2 * a), fs = c - b * b / (4 * a);
    return {
      q: '<p>Find the minimum of the parabola below: the point ' + T('x^*') + ' where the slope is zero, and the value ' + T('f(x^*)') + ' there. Fractions are accepted.</p>' + TT('f(x) = ' + poly([[a, 2], [b, 1], [c, 0]])),
      hint: 'Solve ' + T("f'(x) = " + poly([[2 * a, 1], [b, 0]]) + ' = 0') + ' for ' + T('x') + ', then put that ' + T('x') + ' back into ' + T('f') + '.',
      fields: [{ label: T('x^*'), answer: xs }, { label: T('f(x^*)'), answer: fs }],
      solution: lines(["f'(x) = " + poly([[2 * a, 1], [b, 0]]) + ' = 0 \\;\\Rightarrow\\; x^* = ' + frac(-b, 2 * a), 'f(x^*) = ' + frac(c * 4 * a - b * b, 4 * a)]) +
        '<p>The coefficient of ' + T('x^2') + ' is positive, so the parabola opens upward and this flat point is its lowest point. Linear regression is solved the same way, with a gradient in place of the derivative.</p>'
    };
  }

  var LEVELS = [
    ['Power rule', 'Differentiate a cubic and evaluate the slope.', lv1, 4],
    ['Product rule', 'Two factors, each with its own derivative.', lv2, 3],
    ['Chain rule', 'A power of an inner function.', lv3, 3],
    ['Exponentials and logarithms', 'The outer derivatives e to the u and 1 over u.', lv4, 4],
    ['Sigmoid, softplus and ReLU', 'Four functions that neural networks use later in the course. The <em>sigmoid</em> \\(\\sigma(z) = 1/(1 + e^{-z})\\) squeezes every number into the range from 0 to 1, and the quotient rule gives \\(\\sigma\'(z) = \\sigma(z)(1 - \\sigma(z))\\). The <em>hyperbolic tangent</em> \\(\\tanh\\) squeezes into the range from \\(-1\\) to 1, with \\(\\tanh\'(z) = 1 - \\tanh^2(z)\\). <em>Softplus</em> is \\(\\ln(1 + e^{z})\\), and <em>ReLU</em> is \\(\\max(0, z)\\). Find their slopes.', lv5, 4],
    ['Pick the derivative', 'Choose the right formula among four.', lv6, 4],
    ['A gradient descent step', 'Differentiate a squared loss and update the weight.', lv7, 3],
    ['Three links in a chain', 'Multiply three local slopes.', lv8, 3],
    ['Where the slope is zero', 'Find the minimum of a parabola.', lv9, 3]
  ];

  var steps = [{
    kind: 'text', title: 'Derivative practice',
    html: '<p>This drill repeats the computations from <a href="#/l/calculus-s1">Slope and the derivative</a>, <a href="#/l/calculus-s2">Derivative rules</a> and <a href="#/l/calculus-s3">The chain rule</a>. Each level generates fresh problems for as long as you like.</p>' +
      D.levelList('calc-drill', LEVELS.map(function (l) { return l[0]; })) +
      '<p class="m4-note">Fractions such as 3/5 are accepted, and decimals are checked to about 2 percent. Once these feel automatic, continue with <a href="#/l/mv-drill">Matrix calculus practice</a>.</p>'
  }];
  LEVELS.forEach(function (l, i) {
    steps.push({ kind: 'exercise', title: 'Level ' + (i + 1) + ': ' + l[0], html: '<p>' + l[1] + '</p>', mount: function (el, ctx) { M4.drill(el, ctx, { gen: function () { for (var t = 0; t < 200; t++) { var p = l[2](); if (p) return p; } return l[2](); }, n: l[3], key: 'calc-drill:' + (i + 1) }); } });
  });

  M4.lesson({ id: 'calc-drill', module: 'calculus', title: 'Derivative practice', summary: 'Practice problems on derivative rules, the sigmoid and ReLU functions, and gradient descent steps, arranged in nine levels. New problems are generated each time.', minutes: 25, free: true, drill: true, steps: steps });
})();
