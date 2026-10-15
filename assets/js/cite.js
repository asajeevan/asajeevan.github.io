/* Cite this page: the block at the foot of every course page (built by tools/build_course.py, section#cite).
   Without scripts the block shows an APA reference. This script adds the choice of what to cite (this page or
   the whole course), five formats (APA 7, Nature, Harvard, BibTeX, RIS), copy to the clipboard (with italics
   where the paste target keeps them) and a .bib or .ris download. The access date is today's date. */
(function () {
  'use strict';
  var sec = document.getElementById('cite');
  if (!sec) return;
  var d = sec.dataset, courseOnly = sec.hasAttribute('data-course-only');
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var now = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var acc = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
  var year = (d.date || '').slice(0, 4) || String(acc.y);
  var family = d.family, given = d.given, initials = given.split(/[\s-]+/).map(function (w) { return w.charAt(0) + '.'; }).join(' ');

  function work(scope) {
    if (scope === 'course') return { title: d.courseTitle + ': ' + d.courseSubtitle, short: d.courseTitle, url: d.courseUrl, site: '', key: 'batteries' };
    var slug = (d.url.replace(d.courseUrl, '').replace(/\/$/, '').split('/').pop() || 'page').replace(/[^a-z0-9]/gi, '');
    return { title: d.title, short: d.title, url: d.url, site: d.courseTitle, key: slug };
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* each format returns {html, text} for display and copying, or {text, file} for the reference-manager formats */
  var FMT = {
    apa: { label: 'APA', name: 'APA 7th edition', make: function (w) {
      // author. (year). Title in italics. Site. Retrieved date, from URL (the course changes over time, so APA asks for the date)
      var r = 'Retrieved ' + MONTHS[acc.m] + ' ' + acc.d + ', ' + acc.y + ', from ';
      var head = family + ', ' + initials + ' (' + year + '). ';
      var site = w.site ? ' ' + w.site + '.' : '';
      return { html: esc(head) + '<i>' + esc(w.title) + '</i>.' + esc(site) + ' ' + esc(r) + esc(w.url),
               text: head + w.title + '.' + site + ' ' + r + w.url };
    } },
    nature: { label: 'Nature', name: 'Nature reference style', make: function (w) {
      var t = family + ', ' + initials + ' ' + w.title + '. ' + (w.site ? w.site + ' ' : '') + w.url + ' (' + year + ').';
      return { html: esc(t), text: t };
    } },
    harvard: { label: 'Harvard', name: 'Harvard (Cite Them Right)', make: function (w) {
      var a = family + ', ' + initials + ' (' + year + ') ', tail = (w.site ? ' ' + w.site + '.' : '') + ' Available at: ' + w.url + ' (Accessed: ' + acc.d + ' ' + MONTHS[acc.m] + ' ' + acc.y + ').';
      return { html: esc(a) + '<i>' + esc(w.title) + '</i>.' + esc(tail), text: a + w.title + '.' + tail };
    } },
    bibtex: { label: 'BibTeX', name: 'BibTeX', file: 'bib', make: function (w) {
      var key = family.replace(/[^A-Za-z]/g, '') + year + w.key;
      var t = '@misc{' + key + ',\n' +
        '  author       = {' + family + ', ' + given + '},\n' +
        '  title        = {{' + w.title + '}},\n' +
        (w.site ? '  howpublished = {' + w.site + ', \\url{' + w.url + '}},\n' : '  howpublished = {\\url{' + w.url + '}},\n') +
        '  year         = {' + year + '},\n' +
        '  url          = {' + w.url + '},\n' +
        '  urldate      = {' + acc.y + '-' + pad(acc.m + 1) + '-' + pad(acc.d) + '},\n' +
        '  note         = {Accessed ' + acc.d + ' ' + MONTHS[acc.m] + ' ' + acc.y + '}\n}\n';
      return { text: t, pre: true };
    } },
    ris: { label: 'RIS', name: 'RIS (Zotero, Mendeley, EndNote)', file: 'ris', make: function (w) {
      var L = ['TY  - ELEC', 'AU  - ' + family + ', ' + given, 'TI  - ' + w.title];
      if (w.site) L.push('T2  - ' + w.site);
      L.push('PY  - ' + year, 'DA  - ' + (d.date || '').replace(/-/g, '/'), 'UR  - ' + w.url, 'Y2  - ' + acc.y + '/' + pad(acc.m + 1) + '/' + pad(acc.d), 'LA  - en', 'ER  - ');
      return { text: L.join('\r\n') + '\r\n', pre: true };
    } }
  };
  var ORDER = ['apa', 'nature', 'harvard', 'bibtex', 'ris'];
  var state = { scope: courseOnly ? 'course' : 'page', fmt: 'apa' };
  try { var saved = localStorage.getItem('cite-fmt'); if (FMT[saved]) state.fmt = saved; } catch (e) {}

  /* ---------- build the controls ---------- */
  var ui = sec.querySelector('.cite-ui');
  ui.innerHTML = '';
  var bar = document.createElement('div'); bar.className = 'cite-bar'; ui.appendChild(bar);
  var scopeBtns = {};
  if (!courseOnly) {
    var sg = document.createElement('div'); sg.className = 'cite-scope'; sg.setAttribute('role', 'group'); sg.setAttribute('aria-label', 'What to cite');
    [['page', 'This page'], ['course', 'The whole course']].forEach(function (s) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = s[1]; b.className = 'cite-chip';
      b.addEventListener('click', function () { state.scope = s[0]; render(); });
      scopeBtns[s[0]] = b; sg.appendChild(b);
    });
    bar.appendChild(sg);
  }
  var tl = document.createElement('div'); tl.className = 'cite-tabs'; tl.setAttribute('role', 'tablist'); tl.setAttribute('aria-label', 'Citation format');
  var tabs = {};
  ORDER.forEach(function (k, i) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'cite-tab'; b.id = 'citeTab-' + k;
    b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'citePanel'); b.textContent = FMT[k].label; b.title = FMT[k].name;
    b.addEventListener('click', function () { state.fmt = k; try { localStorage.setItem('cite-fmt', k); } catch (e) {} render(); });
    b.addEventListener('keydown', function (e) {
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? ORDER.length - 1 : null;
      if (j === null) return; e.preventDefault(); j = (j + ORDER.length) % ORDER.length;
      state.fmt = ORDER[j]; render(); tabs[ORDER[j]].focus();
    });
    tabs[k] = b; tl.appendChild(b);
  });
  ui.appendChild(tl);
  var panel = document.createElement('div'); panel.className = 'cite-panel'; panel.id = 'citePanel'; panel.setAttribute('role', 'tabpanel'); panel.tabIndex = 0;
  ui.appendChild(panel);
  var out = document.createElement('div'); out.className = 'cite-out'; panel.appendChild(out);
  var acts = document.createElement('div'); acts.className = 'cite-acts'; panel.appendChild(acts);
  var copyB = document.createElement('button'); copyB.type = 'button'; copyB.className = 'btn cite-copy'; copyB.textContent = 'Copy';
  var dlB = document.createElement('button'); dlB.type = 'button'; dlB.className = 'btn cite-dl';
  var note = document.createElement('span'); note.className = 'cite-note'; note.setAttribute('role', 'status'); note.setAttribute('aria-live', 'polite');
  acts.appendChild(copyB); acts.appendChild(dlB); acts.appendChild(note);

  var current = null;
  function render() {
    var f = FMT[state.fmt], w = work(state.scope);
    current = f.make(w); current.fmt = state.fmt; current.w = w;
    Object.keys(scopeBtns).forEach(function (k) { scopeBtns[k].setAttribute('aria-pressed', String(k === state.scope)); });
    ORDER.forEach(function (k) { var on = k === state.fmt; tabs[k].setAttribute('aria-selected', String(on)); tabs[k].tabIndex = on ? 0 : -1; });
    panel.setAttribute('aria-labelledby', 'citeTab-' + state.fmt);
    out.innerHTML = '';
    if (current.pre) { var pre = document.createElement('pre'); pre.textContent = current.text; out.appendChild(pre); }
    else { var p = document.createElement('p'); p.innerHTML = current.html; out.appendChild(p); }
    dlB.hidden = !f.file; if (f.file) dlB.textContent = 'Download .' + f.file;
    note.textContent = '';
  }

  function say(msg) { note.textContent = msg; clearTimeout(say.t); say.t = setTimeout(function () { note.textContent = ''; }, 2600); }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); return ok;
  }
  copyB.addEventListener('click', function () {
    var text = current.text, html = current.html;
    var done = function () { say('Copied'); }, fail = function () { if (fallbackCopy(text)) done(); else selectOut(); };
    if (html && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]).then(done, function () {
        (navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject()).then(done, fail);
      });
    } else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
    else fail();
  });
  function selectOut() { var r = document.createRange(); r.selectNodeContents(out); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); say('Selected: press Ctrl+C or ⌘C to copy'); }
  dlB.addEventListener('click', function () {
    var f = FMT[current.fmt]; if (!f.file) return;
    var name = (family.replace(/[^A-Za-z]/g, '') + year + '-' + current.w.key).toLowerCase() + '.' + f.file;
    var blob = new Blob([current.text], { type: f.file === 'ris' ? 'application/x-research-info-systems' : 'application/x-bibtex' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 400);
    say('Saved as ' + name);
  });
  render();
})();
