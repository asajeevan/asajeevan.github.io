/* course.js: finding your way through the course. The contents drawer and its outline of
   the page (with the figure you are reading highlighted), the search, the keyboard keys, the
   button that brings you back after following a link to another chapter, the ticks on the
   chapters you have read, and, on the course home, "continue where you left off" and the
   forwarding of links into the old single page. Every element is optional. */
(function () {
  'use strict';
  var body = document.body, doc = document.documentElement;
  var root = body.getAttribute('data-root') || '../';
  var pageId = body.getAttribute('data-page') || '';
  var isChapter = /\bkind-(chapter|lab)\b/.test(body.className);
  function $(id) { return document.getElementById(id); }
  // Opened from the disk (file:) or from a host that does not serve a folder's index.html, a link to
  // a folder must name the file: rewrite the course's own links once, and build new ones the same way.
  var DIRIDX = location.protocol === 'file:' || body.hasAttribute('data-dir-index');
  function fixDir(u) { return DIRIDX && !/^[a-z]+:/i.test(u) ? u.replace(/\/(#|$)/, '/index.html$1') : u; }
  function link(path) { return fixDir(root + 'batteries/' + path); }
  if (DIRIDX) each(document.querySelectorAll('a[href]'), function (a) { var h = a.getAttribute('href'); if (h && h.charAt(0) !== '#') a.setAttribute('href', fixDir(h)); });
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function local(key, val) {
    try {
      if (val === undefined) { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function session(key, val) {
    try {
      if (val === undefined) { var v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; }
      if (val === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function typing(e) {
    var t = e.target, n = t && t.nodeName;
    return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT' || (t && t.isContentEditable);
  }

  /* ---------- the old single page: forward its anchors to their new pages ---------- */
  var oldMap = $('oldAnchors');
  if (oldMap && location.hash.length > 1) {
    var h = decodeURIComponent(location.hash.slice(1));
    if (!document.getElementById(h)) {
      try { var to = JSON.parse(oldMap.textContent)[h]; if (to) { location.replace(link(to)); return; } } catch (e) { /* ignore */ }
    }
  }

  /* ---------- contents drawer ---------- */
  var toc = $('toc'), tocBtn = $('tocBtn'), tocClose = $('tocClose'), scrim = $('tocScrim');
  function tocOpen() { return body.classList.contains('toc-open'); }
  function setToc(open, focusBack) {
    if (!toc) return;
    body.classList.toggle('toc-open', open);
    if (scrim) scrim.hidden = !open;
    if (tocBtn) tocBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      var here = toc.querySelector('.toc-outline a.here') || toc.querySelector('li.cur a');
      if (here && here.scrollIntoView) here.scrollIntoView({ block: 'center' });
      toc.focus({ preventScroll: true });
    } else if (focusBack && tocBtn) tocBtn.focus();
  }
  if (toc) {
    if (tocBtn) tocBtn.addEventListener('click', function () { setToc(!tocOpen(), false); });
    if (tocClose) tocClose.addEventListener('click', function () { setToc(false, true); });
    if (scrim) scrim.addEventListener('click', function () { setToc(false, false); });
    toc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (a && (a.getAttribute('href') || '').charAt(0) === '#' && window.innerWidth < 1400) setToc(false, false);
    });
  }

  /* ---------- where am I: highlight the figure or heading being read ---------- */
  var outlineLinks = toc ? Array.prototype.slice.call(toc.querySelectorAll('.toc-outline a[href^="#"]')) : [];
  var targets = outlineLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var lastHere = null;
  function spy() {
    if (!outlineLinks.length) return;
    var line = window.innerHeight * 0.35, best = -1;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && targets[i].getBoundingClientRect().top <= line) best = i;
    }
    var a = best >= 0 ? outlineLinks[best] : null;
    if (a === lastHere) return;
    if (lastHere) { lastHere.classList.remove('here'); lastHere.removeAttribute('aria-current'); }
    if (a) { a.classList.add('here'); a.setAttribute('aria-current', 'location'); }
    lastHere = a;
  }

  /* ---------- read ticks and "continue" ---------- */
  var visited = local('course.visited') || {};
  function markTicks() {
    each(document.querySelectorAll('[data-chap]'), function (el) {
      var v = visited[el.getAttribute('data-chap')];
      el.classList.toggle('seen', v === 1); el.classList.toggle('done', v === 2);
    });
  }
  if (isChapter) {
    if (!visited[pageId]) { visited[pageId] = 1; local('course.visited', visited); }
    var crumbN = document.querySelector('.crumb-n'), crumbT = document.querySelector('.crumb-t');
    local('course.last', { id: pageId, label: (crumbN ? crumbN.textContent : '') + ' · ' + (crumbT ? crumbT.textContent : '') });
  }
  markTicks();
  /* the course home shows how much of the course this browser has read */
  var hp = $('hubProgress');
  if (hp) {
    var cards = document.querySelectorAll('.card[data-chap]'), done = 0, seen = 0;
    each(cards, function (c) { var v = visited[c.getAttribute('data-chap')]; if (v === 2) done++; else if (v === 1) seen++; });
    if (done + seen > 0) {
      hp.hidden = false;
      hp.querySelector('.hp-t').innerHTML = '<b>' + done + ' of ' + cards.length + '</b> pages read' + (seen ? ', ' + seen + ' opened' : '');
      var fill = hp.querySelector('.hp-fill');
      setTimeout(function () { fill.style.width = (100 * done / cards.length).toFixed(1) + '%'; }, 300);
    }
  }
  var cell = $('tbCell'), cellFill = cell && cell.querySelector('.cell-f'), cellPct = -1;
  function readCheck() {
    if (!isChapter) return;
    var y = window.scrollY || window.pageYOffset, h = doc.scrollHeight - window.innerHeight;
    var refs = $('references'), end = Math.min(h, refs ? refs.offsetTop - window.innerHeight : h);
    if (cellFill) {   // the cell in the top bar charges as the chapter is read
      var f = end > 0 ? Math.max(0, Math.min(1, y / end)) : 1, pct = Math.round(f * 100);
      if (pct !== cellPct) {
        cellPct = pct;
        cellFill.style.transform = 'scaleX(' + f.toFixed(3) + ')';
        cell.setAttribute('title', pct + ' % read');
        cell.classList.toggle('full', pct >= 99);
      }
    }
    if (visited[pageId] === 2) return;
    if (y >= end - 40 && y > 0) { visited[pageId] = 2; local('course.visited', visited); markTicks(); }
  }
  var cont = $('continueBtn'), last = local('course.last');
  if (cont && last && last.id) {
    cont.setAttribute('href', link(last.id + '/'));
    var k = cont.querySelector('.hub-go-k'), t = cont.querySelector('.hub-go-t');
    if (k) k.textContent = 'Continue';
    if (t) t.textContent = last.label;
  }

  /* ---------- back chip ---------- */
  var chip = $('backChip');
  function nearestAnchor() {
    var line = window.innerHeight * 0.35, best = null;
    each(document.querySelectorAll('#content figure[id], #content h2.sub[id]'), function (el) { if (el.getBoundingClientRect().top <= line) best = el; });
    return best;
  }
  function anchorLabel(el) {
    if (!el) return '';
    var n = el.querySelector && el.querySelector('.fnum');
    return n ? n.textContent.replace('Figure', 'figure') : '';
  }
  var sameReturn = null, leftReturn = false;
  function showChip(text, href, onClick) {
    if (!chip) return;
    chip.innerHTML = '<span aria-hidden="true">&#8592;</span> ' + esc(text);
    chip.setAttribute('href', href);
    chip.hidden = false;
    chip.onclick = onClick || null;
  }
  function hideChip() { if (chip) { chip.hidden = true; chip.onclick = null; } sameReturn = null; }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('#content a[href], .page-refs a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    var href = a.getAttribute('href');
    if (!href) return;
    var y = window.scrollY || window.pageYOffset, near = nearestAnchor();
    var crumbN = document.querySelector('.crumb-n'), where = crumbN ? crumbN.textContent : 'the previous page';
    var label = anchorLabel(near);
    if (href.charAt(0) === '#') {
      if (href === '#' || href.indexOf('#ref-') === 0 && !a.closest('sup')) return;
      sameReturn = y; leftReturn = false;
      setTimeout(function () { showChip('Back to where you were' + (label ? ', ' + label : ''), '#', function (ev) { ev.preventDefault(); window.scrollTo(0, sameReturn || 0); hideChip(); }); }, 0);
      return;
    }
    if (pageId !== 'hub' && (a.classList.contains('xref') || /batteries\//.test(href))) {
      session('course.back', { from: pageId, path: location.pathname, y: y, label: 'Back to ' + where + (label ? ', ' + label : '') });
    }
  });
  var back = session('course.back');
  if (back && back.from !== pageId && back.path !== location.pathname) {
    showChip(back.label, back.path, function () { session('course.restore', { path: back.path, y: back.y }); session('course.back', null); });
  } else if (back && back.path === location.pathname) {
    session('course.back', null);
  }
  var restore = session('course.restore');
  if (restore && restore.path === location.pathname) {
    session('course.restore', null);
    window.addEventListener('load', function () { setTimeout(function () { window.scrollTo(0, restore.y); }, 60); });
  }
  if (chip) chip.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); chip.click(); } });

  /* ---------- search ---------- */
  var search = $('search'), input = $('searchInput'), results = $('searchResults'), hint = $('searchHint'), searchBtn = $('searchBtn');
  var INDEX = null, prepared = null, loading = false, lastFocus = null;
  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 8320); })
      .replace(/[⁰¹²³⁴-⁹]/g, function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c) + ''; })
      .replace(/[−–—]/g, '-').replace(/[’‘]/g, "'");
  }
  function prepare() {
    var P = INDEX.p, out = [];
    P.forEach(function (p, k) {
      out.push({ k: k, kind: 'c', a: '', title: p[1] + ' · ' + p[2], text: p[3] + '. ' + p[4], nt: norm(p[1] + ' ' + p[2] + ' ' + p[3]), nx: norm(p[4]) });
    });
    INDEX.e.forEach(function (e) {
      out.push({ k: e[0], kind: e[1], a: e[2], title: e[3], text: e[4], nt: norm(e[3]), nx: norm(e[4]) });
    });
    return out;
  }
  function loadIndex(cb) {
    if (INDEX) return cb();
    if (window.COURSE_INDEX) { INDEX = window.COURSE_INDEX; prepared = prepare(); return cb(); }
    if (loading) return;
    loading = true;
    if (hint) hint.textContent = 'Loading the index…';
    var s = document.createElement('script');
    s.src = root + 'assets/js/course-index.js';
    s.onload = function () { INDEX = window.COURSE_INDEX; prepared = prepare(); loading = false; if (hint) hint.textContent = 'Type a word or two: a material (LiFePO4), a method (GITT), an idea (tortuosity).'; cb(); };
    s.onerror = function () { loading = false; if (hint) hint.textContent = 'The search index could not be loaded.'; };
    document.head.appendChild(s);
  }
  function wordStart(hay, tok) { var i = hay.indexOf(tok); return i === 0 || (i > 0 && /[^a-z0-9]/.test(hay.charAt(i - 1))); }
  var WEIGHT = { c: 12, s: 7, f: 5, p: 1 };
  function run(q) {
    var toks = norm(q).split(/[^a-z0-9+\-'.]+/).filter(function (t) { return t.length > 0; });
    if (!toks.length) { results.innerHTML = ''; if (hint) hint.hidden = false; return; }
    if (hint) hint.hidden = true;
    var hits = [];
    prepared.forEach(function (e, i) {
      var score = 0;
      for (var j = 0; j < toks.length; j++) {
        var t = toks[j], inT = e.nt.indexOf(t) >= 0, inX = e.nx.indexOf(t) >= 0;
        if (!inT && !inX) return;
        score += (inT ? WEIGHT[e.kind] * 2 : 0) + (inX ? WEIGHT[e.kind] : 0) + ((inT ? wordStart(e.nt, t) : wordStart(e.nx, t)) ? 2 : 0);
      }
      hits.push({ e: e, s: score, i: i });
    });
    hits.sort(function (a, b) { return b.s - a.s || a.i - b.i; });
    var html = '', P = INDEX.p;
    hits.slice(0, 40).forEach(function (h) {
      var e = h.e, p = P[e.k], href = link(p[0] + (e.a ? '#' + e.a : ''));
      var ctx = e.kind === 'c' ? (p[1].indexOf('Lab') === 0 ? 'Lab handbook' : 'Chapter') : p[1] + ' · ' + p[2] + (e.kind === 'p' && e.title ? ' · near ' + e.title : '');
      var title = e.kind === 'p' ? '' : e.title;
      html += '<li class="r-' + e.kind + '"><a href="' + esc(href) + '"><span class="r-k">' + esc(ctx) + '</span>' +
        (title ? '<span class="r-t">' + mark(title, toks) + '</span>' : '') +
        (e.text ? '<span class="r-x">' + mark(snippet(e.text, e.nx, toks), toks) + '</span>' : '') + '</a></li>';
    });
    if (!hits.length) html = '<li class="r-none">Nothing found. Try a shorter word, or another spelling.</li>';
    else if (hits.length > 40) html += '<li class="r-none">' + (hits.length - 40) + ' more; add a word to narrow the search.</li>';
    results.innerHTML = html;
  }
  function snippet(text, ntext, toks) {
    var at = -1;
    for (var j = 0; j < toks.length && at < 0; j++) at = ntext.indexOf(toks[j]);
    if (text.length <= 170) return text;
    var a = Math.max(0, at - 60), b = Math.min(text.length, a + 170);
    return (a > 0 ? '…' : '') + text.slice(a, b) + (b < text.length ? '…' : '');
  }
  function mark(text, toks) {
    // highlight on the normalized text, which keeps the length of the original for these characters
    var n = norm(text), spans = [];
    toks.forEach(function (t) { var i = 0; while ((i = n.indexOf(t, i)) >= 0) { spans.push([i, i + t.length]); i += t.length; } });
    if (n.length !== text.length || !spans.length) return esc(text);
    spans.sort(function (x, y) { return x[0] - y[0]; });
    var out = '', pos = 0;
    spans.forEach(function (s) { if (s[0] < pos) return; out += esc(text.slice(pos, s[0])) + '<mark>' + esc(text.slice(s[0], s[1])) + '</mark>'; pos = s[1]; });
    return out + esc(text.slice(pos));
  }
  function setSearch(open) {
    if (!search) return;
    if (open) {
      lastFocus = document.activeElement;
      if (tocOpen()) setToc(false, false);
      search.hidden = false; body.classList.add('search-open');
      if (searchBtn) searchBtn.setAttribute('aria-expanded', 'true');
      input.focus(); input.select();
      loadIndex(function () { if (input.value) run(input.value); });
    } else {
      search.hidden = true; body.classList.remove('search-open');
      if (searchBtn) searchBtn.setAttribute('aria-expanded', 'false');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
  }
  if (search) {
    if (searchBtn) searchBtn.addEventListener('click', function () { setSearch(search.hidden); });
    $('searchClose').addEventListener('click', function () { setSearch(false); });
    search.addEventListener('click', function (e) { if (e.target === search) setSearch(false); });
    var timer = 0;
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { loadIndex(function () { run(input.value); }); }, 80); });
    search.addEventListener('keydown', function (e) {
      var links = Array.prototype.slice.call(results.querySelectorAll('a')), i = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (links.length) links[Math.min(links.length - 1, i + 1)].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0) input.focus(); else links[i - 1].focus(); }
      else if (e.key === 'Enter' && document.activeElement === input && links.length) { e.preventDefault(); links[0].click(); }
    });
    results.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (a && a.pathname === location.pathname) setSearch(false);   // a result on this page: close and jump
    });
  }

  /* ---------- keys ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (search && !search.hidden) { setSearch(false); return; }
      if (tocOpen()) { setToc(false, true); return; }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
    if (search && !search.hidden) return;
    if (e.key === '/') { if (search) { e.preventDefault(); setSearch(true); } }
    else if (e.key === 't' || e.key === 'T') { if (toc) { e.preventDefault(); setToc(!tocOpen(), false); } }
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.shiftKey && !tocOpen()) {
      var a = document.querySelector('#topbar a[rel="' + (e.key === 'ArrowLeft' ? 'prev' : 'next') + '"]');
      if (a) { e.preventDefault(); location.href = a.href; }
    }
  });

  /* ---------- scrolling ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false; spy(); readCheck();
      if (sameReturn !== null) {   // smooth scrolling passes the old place first: hide only once the reader had left it
        var dy = Math.abs((window.scrollY || window.pageYOffset) - sameReturn);
        if (dy > 240) leftReturn = true; else if (leftReturn && dy < 80) hideChip();
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  spy(); readCheck();
})();
