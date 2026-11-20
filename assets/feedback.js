/* Feedback button and dialog.
   Messages go to Web3Forms, which forwards them by email. The access key below
   only identifies the inbox on the Web3Forms side, the address itself never
   appears in this code. Paste the key from web3forms.com into FEEDBACK_KEY. */
(function () {
  'use strict';
  var FEEDBACK_KEY = 'b95e413d-02de-4a1f-8bf8-406c224ca081';
  var ENDPOINT = 'https://api.web3forms.com/submit';
  var COOLDOWN_MS = 60 * 1000, MIN_OPEN_MS = 3000, MAX_LEN = 4000;
  var ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12.5h5"/></svg>';

  M4.where = M4.where || {};

  /* ---------- where is the learner right now ---------- */
  function moduleOf(lessonId) {
    for (var i = 0; i < M4.modules.length; i++) if (M4.modules[i].lessons.indexOf(lessonId) >= 0) return { m: M4.modules[i], i: i };
    return null;
  }
  // visible text of the current step, with formulas written as TeX
  function stepText() {
    var el = document.querySelector('.m4-step');
    if (!el) return '';
    var c = el.cloneNode(true);
    [].forEach.call(c.querySelectorAll('.katex'), function (k) {
      var a = k.querySelector('annotation[encoding="application/x-tex"]');
      k.replaceWith(document.createTextNode(a ? ' $' + a.textContent.trim() + '$ ' : k.textContent));
    });
    [].forEach.call(c.querySelectorAll('input'), function (inp) {
      inp.replaceWith(document.createTextNode('[' + (inp.value || ' ') + ']'));
    });
    [].forEach.call(c.querySelectorAll('svg,script,style'), function (s) { s.remove(); });
    return c.textContent.replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim().slice(0, 1500);
  }
  function where() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    var lines = [];
    if (h[0] === 'l' && h[1]) {
      var id = decodeURIComponent(h[1]), L = M4.lessons[id], mo = moduleOf(id);
      if (mo) lines.push('Module ' + (mo.i + 1) + ' of ' + M4.modules.length + ': ' + mo.m.title + ' (id ' + mo.m.id + ')');
      if (L) lines.push('Lesson ' + (mo ? (mo.m.lessons.indexOf(id) + 1) + ' of ' + mo.m.lessons.length + ': ' : '') + L.title + ' (id ' + id + ')');
      var k = M4.where.lesson === id ? M4.where.step : (h[2] ? +h[2] - 1 : 0);
      if (M4.where.lesson === id && M4.where.done) lines.push('Lesson summary screen (after the last step)');
      else if (L && L.steps[k]) {
        var s = L.steps[k], tmp = document.createElement('div');
        tmp.innerHTML = s.title || '';
        lines.push('Step ' + (k + 1) + ' of ' + L.steps.length + ': ' + (tmp.textContent || '(untitled)') + (s.mount ? ' (interactive)' : ' (text)'));
      }
      var dc = document.querySelector('.m4-step .m4-drill-count');
      if (dc && dc.textContent.trim()) lines.push('Drill progress: ' + dc.textContent.trim().slice(0, 120));
    } else if (h[0] === 'm' && h[1]) {
      var mid = decodeURIComponent(h[1]), mm = null;
      M4.modules.forEach(function (x, i) { if (x.id === mid) mm = { m: x, i: i }; });
      lines.push('Module overview page' + (mm ? ': module ' + (mm.i + 1) + ', ' + mm.m.title + ' (id ' + mid + ')' : ' (id ' + mid + ')'));
    } else lines.push('Home page');
    return lines;
  }
  function link() {
    var base = location.href.split('#')[0].replace(/[?&]r=\d+/, '').replace(/\?$/, '');
    var h = location.hash.split('/');
    if (h[1] === 'l' && h[2] && M4.where.lesson === decodeURIComponent(h[2])) return base + '#/l/' + h[2] + '/' + (M4.where.step + 1);
    return base + location.hash;
  }
  function shortWhere() { var w = where(); return w.slice(0, 3).join('\n'); }

  /* ---------- dialog ---------- */
  var open = null;
  function close() { if (open) { open.remove(); open = null; document.removeEventListener('keydown', onKey, true); } }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  function lastSent() { try { return +localStorage.getItem('m4.fb.t') || 0; } catch (e) { return 0; } }
  function markSent() { try { localStorage.setItem('m4.fb.t', String(Date.now())); } catch (e) {} }

  function openDialog() {
    if (open) return;
    var opened = Date.now(), place = where(), url = link(), text = stepText();
    var ov = M4.el('div', { class: 'm4-fb-ov' }, document.body);
    open = ov;
    var dlg = M4.el('div', { class: 'm4-fb', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Send feedback' }, ov);
    M4.el('h2', { text: 'Feedback on this screen' }, dlg);
    M4.el('p', { class: 'm4-fb-sub', text: 'Something unclear, wrong or broken? Or an idea? Tell me. This goes straight to the author.' }, dlg);
    var ctx = M4.el('div', { class: 'm4-fb-where' }, dlg);
    M4.el('b', { text: 'Sent along with your message' }, ctx);
    M4.el('pre', { text: place.join('\n') }, ctx);
    var form = M4.el('form', { novalidate: 'novalidate' }, dlg);
    var ta = M4.el('textarea', { rows: 5, maxlength: MAX_LEN, placeholder: 'What should be better here?', 'aria-label': 'Your feedback' }, form);
    var em = M4.el('input', { type: 'email', placeholder: 'Your email, only if you want a reply', 'aria-label': 'Your email (optional)', autocomplete: 'email' }, form);
    // trap for bots: invisible to people, bots tend to tick every box
    var trapWrap = M4.el('div', { class: 'm4-fb-trap', 'aria-hidden': 'true' }, form);
    var trap = M4.el('input', { type: 'checkbox', name: 'botcheck', tabindex: '-1', autocomplete: 'off' }, trapWrap);
    var msg = M4.el('div', { class: 'm4-fb-msg', role: 'status' }, form);
    var row = M4.el('div', { class: 'm4-fb-row' }, form);
    M4.button(row, 'Cancel', close, { ghost: true });
    var send = M4.button(row, 'Send', null, { primary: true });
    send.type = 'submit';
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey, true);
    setTimeout(function () { ta.focus(); }, 30);

    function say(t, cls) { msg.textContent = t; msg.className = 'm4-fb-msg' + (cls ? ' ' + cls : ''); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var body = ta.value.trim();
      if (body.length < 3) { say('Please write a few words first.', 'bad'); ta.focus(); return; }
      if (trap.checked) { say('Thank you.', 'good'); setTimeout(close, 900); return; }
      if (Date.now() - opened < MIN_OPEN_MS) { say('One moment, then press Send again.', 'bad'); return; }
      var wait = COOLDOWN_MS - (Date.now() - lastSent());
      if (wait > 0) { say('Thanks! You can send more feedback in ' + Math.ceil(wait / 1000) + ' seconds.', 'bad'); return; }
      if (!FEEDBACK_KEY) { say('Feedback is not switched on yet on this copy of the site.', 'bad'); return; }
      var reply = em.value.trim();
      if (reply && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply)) { say('That email address looks incomplete. Leave it empty if you do not need a reply.', 'bad'); em.focus(); return; }
      send.disabled = true; say('Sending…');
      var title = place[place.length > 1 ? 1 : 0].replace(/ \(id [^)]*\)$/, '');
      var payload = {
        access_key: FEEDBACK_KEY,
        subject: 'ML Crash Course feedback: ' + title.slice(0, 90),
        from_name: 'ML Crash Course',
        botcheck: false,
        'Feedback': body,
        'Where': place.join('\n'),
        'Link': url,
        'Reply to': reply || '(none given)',
        'Screen content': text || '(empty)',
        'Browser': navigator.userAgent + ', window ' + innerWidth + 'x' + innerHeight,
        'Sent at': new Date().toISOString()
      };
      if (reply) payload.replyto = reply;
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().catch(function () { return { success: r.ok }; }); })
        .then(function (j) {
          if (!j || !j.success) throw new Error((j && j.message) || 'failed');
          markSent();
          form.style.display = 'none'; ctx.style.display = 'none';
          dlg.querySelector('.m4-fb-sub').textContent = 'Thank you! Your feedback was sent.';
          var r2 = M4.el('div', { class: 'm4-fb-row' }, dlg);
          M4.button(r2, 'Close', close, { primary: true });
        })
        .catch(function () { send.disabled = false; say('Sending failed. Please check your connection and try again.', 'bad'); });
    });
  }

  /* button that app.js places in every top bar */
  M4.feedbackButton = function (parent) {
    var b = M4.el('button', { class: 'm4-fb-btn', type: 'button', title: 'Give feedback on this screen', 'aria-label': 'Give feedback on this screen', html: ICON + '<span>Feedback</span>' }, parent);
    b.addEventListener('click', openDialog);
    return b;
  };
  M4.openFeedback = openDialog;
  M4.feedbackWhere = shortWhere;
})();
