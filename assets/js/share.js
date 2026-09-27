/* Shared by the home page and the learning page: the visitor counter and the share button. */
(function () {
  'use strict';

  /* ---------- visitor counter ----------
     Preferred: your own Cloudflare Worker (counter/README.md), set COUNTER_URL.
     Fallback when COUNTER_URL is empty: a public counter on counterapi.dev v2
     (free account, workspace + counter created in their dashboard). Counts are
     buffered on their side, so the number can lag a little.
     One count per browser session, shared across the pages of the site. If the
     counter cannot be reached the footer line stays hidden. */
  var COUNTER_URL = 'https://visitor-counter.aswadhssajeevan7-3.workers.dev';
  var COUNTER_WORKSPACE = 'asajeevan'; // counterapi.dev workspace name (public counter, no token)
  var COUNTER_NAME = 'visits';
  (function visitorCounter() {
    var box = document.getElementById('visits'), num = document.getElementById('visitCount');
    if (!box || !num) return;
    var counted = false;
    try { counted = sessionStorage.getItem('counted') === '1'; } catch (e) {}
    var url;
    if (COUNTER_URL) {
      url = COUNTER_URL.replace(/\/$/, '') + (counted ? '/count' : '/hit');
    } else {
      if (!COUNTER_WORKSPACE) return;
      url = 'https://api.counterapi.dev/v2/' + COUNTER_WORKSPACE + '/' + COUNTER_NAME + (counted ? '' : '/up');
    }
    function readCount(d) {
      if (!d) return null;
      if (typeof d.count === 'number') return d.count;
      if (typeof d.Count === 'number') return d.Count;
      if (d.data && typeof d.data.up_count === 'number') return d.data.up_count;
      if (d.data && typeof d.data.count === 'number') return d.data.count;
      if (d.data && typeof d.data.value === 'number') return d.data.value;
      return null;
    }
    fetch(url, { mode: 'cors', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) {
        var target = readCount(d);
        if (target === null) return;
        try { sessionStorage.setItem('counted', '1'); } catch (e) {}
        box.hidden = false;
        var start = Math.max(0, target - 40), t0 = null;
        function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / 900), e = 1 - Math.pow(1 - p, 3);
          num.textContent = Math.round(start + (target - start) * e).toLocaleString('en-GB');
          if (p < 1) requestAnimationFrame(step);
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) num.textContent = target.toLocaleString('en-GB');
        else requestAnimationFrame(step);
      })
      .catch(function () { box.hidden = true; });
  })();

  /* ---------- share ----------
     Every element with class "js-share" opens the device's own share sheet where
     the browser has one (phones, Safari, Edge) and otherwise a small menu: copy
     the link, LinkedIn, X, WhatsApp, e-mail. The link shared is the canonical
     address of the page, so a preview copy never leaks its own URL. */
  var canon = document.querySelector('link[rel="canonical"]');
  var pageUrl = canon ? canon.getAttribute('href') : location.href.split('#')[0];
  var og = document.querySelector('meta[property="og:title"]');
  var pageTitle = og ? og.getAttribute('content') : document.title;
  var ogd = document.querySelector('meta[property="og:description"]');
  var pageText = ogd ? ogd.getAttribute('content') : '';
  var enc = encodeURIComponent;
  var TARGETS = [
    { k: 'copy', label: 'Copy link' },
    { k: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/sharing/share-offsite/?url=' + enc(pageUrl) },
    { k: 'x', label: 'X', href: 'https://twitter.com/intent/tweet?text=' + enc(pageTitle) + '&url=' + enc(pageUrl) },
    { k: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/?text=' + enc(pageTitle + ' ' + pageUrl) },
    { k: 'email', label: 'E-mail', href: 'mailto:?subject=' + enc(pageTitle) + '&body=' + enc((pageText ? pageText + '\n\n' : '') + pageUrl) }
  ];

  var menu = null, toast = null, opener = null;
  function buildMenu() {
    menu = document.createElement('div'); menu.className = 'share-menu'; menu.hidden = true;
    menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', 'Share this page');
    var h = document.createElement('p'); h.className = 'share-h'; h.textContent = 'Share this page'; menu.appendChild(h);
    var list = document.createElement('div'); list.className = 'share-list'; menu.appendChild(list);
    TARGETS.forEach(function (t) {
      var a = document.createElement(t.href ? 'a' : 'button');
      a.className = 'share-it share-' + t.k; a.textContent = t.label;
      if (t.href) { a.href = t.href; if (t.k !== 'email') { a.target = '_blank'; a.rel = 'noopener'; } a.addEventListener('click', closeMenu); }
      else { a.type = 'button'; a.addEventListener('click', copyLink); }
      list.appendChild(a);
    });
    var url = document.createElement('p'); url.className = 'share-url'; url.textContent = pageUrl; menu.appendChild(url);
    document.body.appendChild(menu);
    document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target) && !(opener && opener.contains(e.target))) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { closeMenu(); if (opener) opener.focus(); } });
  }
  function openMenu(btn) {
    if (!menu) buildMenu();
    opener = btn; menu.hidden = false;
    // put the menu next to the button that opened it: above a floating button, below an inline one
    var r = btn.getBoundingClientRect(), floating = btn.closest('.share-fab');
    menu.classList.toggle('from-fab', !!floating);
    if (floating) { menu.style.left = ''; menu.style.top = ''; }
    else {
      var w = menu.offsetWidth, left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left));
      menu.style.left = (left + window.scrollX) + 'px'; menu.style.top = (r.bottom + 8 + window.scrollY) + 'px';
    }
    btn.setAttribute('aria-expanded', 'true');
    var first = menu.querySelector('.share-it'); if (first) first.focus();
  }
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true; if (opener) opener.setAttribute('aria-expanded', 'false');
  }
  function say(msg) {
    if (!toast) { toast = document.createElement('div'); toast.className = 'share-toast'; toast.setAttribute('role', 'status'); document.body.appendChild(toast); }
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(say.t); say.t = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }
  function copyLink() {
    function done() { say('Link copied'); closeMenu(); }
    function fail() {
      // last resort: select the address so the reader can copy it by hand
      var u = menu && menu.querySelector('.share-url');
      if (u && window.getSelection) { var range = document.createRange(); range.selectNodeContents(u); var s = window.getSelection(); s.removeAllRanges(); s.addRange(range); }
      say('Select the address and copy it');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(pageUrl).then(done, fail);
    else fail();
  }
  function share(btn) {
    if (navigator.share) {
      navigator.share({ title: pageTitle, text: pageText, url: pageUrl }).then(function () { say('Thanks for sharing'); }, function (err) {
        // the reader closed the sheet, or this browser cannot share this page: fall back to the menu
        if (!err || err.name !== 'AbortError') openMenu(btn);
      });
    } else if (menu && !menu.hidden && opener === btn) closeMenu();
    else openMenu(btn);
  }
  Array.prototype.forEach.call(document.querySelectorAll('.js-share'), function (btn) {
    btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function (e) { e.preventDefault(); share(btn); });
  });
})();
