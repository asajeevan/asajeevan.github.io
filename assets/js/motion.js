/* motion.js: the course's motion layer. Everything here is decoration on top of a page that is
   complete without it: nothing is hidden unless this script runs, and nothing runs when the
   reader asks for reduced motion or the animation library is missing.

   - between pages: the browser's cross-document view transitions (CSS in learn.css); this file
     tells the new page which way the reader went (forward or back in the course) and lets the
     title of a chapter card on the course home grow into the chapter's title;
   - course home: the hero assembles itself, the wire through the parts charges as you scroll,
     cards follow the pointer;
   - chapter pages: the opening rises into place, each figure slides in from its own side and
     lights up, headings draw their rule, folds open smoothly, a figure reached through a link
     flashes once. */
(function () {
  'use strict';
  var doc = document.documentElement, body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap, ST = window.ScrollTrigger;

  /* ---------- direction of travel, for the page transition (no animation library needed) ---------- */
  function orderOf(url) {
    var links = document.querySelectorAll('#toc .toc-home, #toc .toc-part a');
    var path = new URL(url, location.href).pathname.replace(/index\.html$/, '');
    for (var i = 0; i < links.length; i++) if (links[i].pathname.replace(/index\.html$/, '') === path) return i;
    return -1;
  }
  var intros = [];   // openings: skipped when the browser animated the arrival (vt-arrived, set in the page head)
  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition || !e.activation || !e.activation.entry) return;
    try {
      var to = new URL(e.activation.entry.url).pathname.replace(/index\.html$/, '');
      Array.prototype.forEach.call(document.querySelectorAll('.card a'), function (x) {
        if (x.pathname.replace(/index\.html$/, '') === to) x.querySelector('.c-t').style.viewTransitionName = 'ch-title';
      });
      var a = orderOf(location.href), b = orderOf(e.activation.entry.url), dir = a >= 0 && b >= 0 && b < a ? 'back' : 'forward';
      e.viewTransition.types.add(dir);
      sessionStorage.setItem('vt-dir', dir);
      sessionStorage.setItem('vt-from', location.pathname.replace(/index\.html$/, ''));
    } catch (err) { /* ignore */ }
  });

  if (reduce || !G || !ST) return;
  G.registerPlugin(ST);
  doc.classList.add('fx');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var EASE = 'power3.out';
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function inView(el) { var r = el.getBoundingClientRect(); return r.top < window.innerHeight * 0.92 && r.bottom > 0; }

  /* words of a heading, each in a mask it rises out of; screen readers keep the plain text */
  function splitWords(el) {
    if (!el || el.getAttribute('data-split')) return [];
    el.setAttribute('data-split', '1');
    var label = el.textContent.replace(/\s+/g, ' ').trim(), nodes = Array.prototype.slice.call(el.childNodes), out = [], cur = null;
    el.textContent = '';
    function word() { var m = document.createElement('span'); m.className = 'w'; var i = document.createElement('span'); i.className = 'wi'; m.appendChild(i); el.appendChild(m); out.push(i); return i; }
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); cur = null; return; }
          (cur || (cur = word())).appendChild(document.createTextNode(part));
        });
      } else (cur || (cur = word())).appendChild(n);
    });
    el.setAttribute('aria-label', label);
    $$('.w', el).forEach(function (w) { w.setAttribute('aria-hidden', 'true'); });
    return out;
  }

  /* ---------- the course home ---------- */
  var hero = document.querySelector('.hub-hero');
  if (hero) {
    var intro = G.timeline({ defaults: { ease: EASE } });
    var k = hero.querySelector('.kicker'), h1 = hero.querySelector('.h1'), words = splitWords(h1);
    G.set(hero.querySelectorAll('[data-intro]'), { opacity: 1 });
    intro.from(k, { opacity: 0, x: -16, duration: 0.6 })
      .from(words, { yPercent: 110, rotate: 3, duration: 0.9, stagger: 0.08 }, 0.1)
      .from(hero.querySelector('.promise'), { opacity: 0, y: 18, duration: 0.7 }, 0.45)
      .from(hero.querySelector('.lede'), { opacity: 0, y: 18, duration: 0.7 }, 0.6)
      .from(hero.querySelector('.hub-actions'), { opacity: 0, y: 14, duration: 0.6 }, 0.75)
      .from(hero.querySelector('.hero-fig-learn'), { opacity: 0, y: 30, rotateX: -12, scale: 0.94, transformPerspective: 900, duration: 1.1, ease: 'expo.out',
        onComplete: function () { hero.querySelector('.hero-fig-learn').classList.add('lit'); } }, 0.3);
    intros.push(intro); if (doc.classList.contains('vt-arrived')) intro.progress(1);
    // the course in numbers counts up as the hero settles
    var nums = $$('.hub-numbers li');
    if (nums.length) {
      G.from(nums, { opacity: 0, y: 24, duration: 0.7, stagger: 0.08, delay: 0.8, ease: EASE, clearProps: 'transform' });
      nums.forEach(function (li) {
        var b = li.querySelector('b[data-count]'), o = { v: 0 }, t = +b.getAttribute('data-count');
        G.to(o, { v: t, duration: 1.6, ease: 'power2.out', delay: 1, onUpdate: function () { b.textContent = Math.round(o.v); } });
      });
    }
    // the hero cell drifts up a little as the page scrolls away
    G.to(hero.querySelector('.hero-fig-learn'), { yPercent: -8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    // the start button leans toward the pointer
    var go = document.getElementById('continueBtn');
    if (go && fine) {
      var gx = G.quickTo(go, 'x', { duration: 0.4, ease: 'power3' }), gy = G.quickTo(go, 'y', { duration: 0.4, ease: 'power3' });
      go.addEventListener('pointermove', function (e) { var r = go.getBoundingClientRect(); gx((e.clientX - r.left - r.width / 2) * 0.18); gy((e.clientY - r.top - r.height / 2) * 0.3); });
      go.addEventListener('pointerleave', function () { gx(0); gy(0); });
    }
  }

  /* the wire through the parts charges as the map scrolls past; each part's node lights when reached */
  var parts = document.querySelector('.hub-parts');
  if (parts) {
    var fill = parts.querySelector('.circuit-fill'), ion = parts.querySelector('.circuit-ion'), nodes = $$('.hub-part', parts);
    ST.create({
      trigger: parts, start: 'top 70%', end: 'bottom 70%', scrub: 0.6,
      onUpdate: function (st) {
        var p = st.progress, H = parts.offsetHeight;
        fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
        ion.style.transform = 'translateY(' + (p * (H - 12)).toFixed(1) + 'px)';
        ion.style.opacity = p > 0.002 && p < 0.998 ? 1 : 0;
        nodes.forEach(function (n) { n.classList.toggle('lit', n.offsetTop <= p * H + 4); });
      }
    });
    nodes.forEach(function (n) {
      var cards = $$('.card', n);
      G.from(n.querySelector('.part-k'), { opacity: 0, x: -14, duration: 0.6, ease: EASE, scrollTrigger: { trigger: n, start: 'top 85%', once: true } });
      G.from(n.querySelector('.part-t'), { opacity: 0, y: 16, duration: 0.7, ease: EASE, scrollTrigger: { trigger: n, start: 'top 85%', once: true } });
      G.from(cards, { opacity: 0, y: 36, scale: 0.97, duration: 0.7, stagger: 0.07, ease: EASE, clearProps: 'transform', scrollTrigger: { trigger: n, start: 'top 80%', once: true } });
    });
  }
  $$('.how-card').forEach(function (c, i) {
    G.from(c, { opacity: 0, y: 30, duration: 0.7, delay: (i % 4) * 0.08, ease: EASE, scrollTrigger: { trigger: c, start: 'top 88%', once: true } });
  });
  /* cards follow the pointer: a soft light where it is, a slight tilt toward it */
  if (fine) $$('.card a, .pn, .how-card, .hub-numbers li').forEach(function (a) {
    var tilt = a.classList.contains('card') || a.parentNode.classList.contains('card');
    var rx = tilt && G.quickTo(a, 'rotateX', { duration: 0.5, ease: 'power3' }), ry = tilt && G.quickTo(a, 'rotateY', { duration: 0.5, ease: 'power3' });
    if (tilt) G.set(a, { transformPerspective: 700 });
    a.addEventListener('pointermove', function (e) {
      var r = a.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      a.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); a.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      if (tilt) { rx((0.5 - y) * 7); ry((x - 0.5) * 9); }
    });
    a.addEventListener('pointerleave', function () { if (tilt) { rx(0); ry(0); } });
  });

  /* ---------- chapter pages ---------- */
  var ch = document.getElementById('ch');
  if (ch) {
    var head = ch.querySelector('.wrap'), mn = head.querySelector('.mod-n'), t1 = head.querySelector('h1'), hook = head.querySelector('.hook'), where = head.querySelector('.where');
    var tw = splitWords(t1);
    G.set([mn, t1, hook, where].filter(Boolean), { opacity: 1 });
    var open = G.timeline({ defaults: { ease: EASE } });
    open.from(mn, { opacity: 0, x: -18, duration: 0.6 })
      .from(tw, { yPercent: 110, rotate: 2, duration: 0.85, stagger: 0.045 }, 0.05)
      .from(hook, { opacity: 0, y: 16, duration: 0.7 }, 0.45);
    if (where) open.from(where, { opacity: 0, clipPath: 'inset(0 100% 0 0 round 10px)', duration: 0.9, ease: 'expo.out' }, 0.6);
    intros.push(open); if (doc.classList.contains('vt-arrived')) open.progress(1);
    // the large chapter number drifts behind the title
    G.to(ch, { '--num-y': '90px', ease: 'none', scrollTrigger: { trigger: ch, start: 'top top', end: '+=700', scrub: true } });

    $$('.beat', ch).forEach(function (beat, i) {
      var fig = beat.querySelector(':scope > .fig'), text = beat.querySelector(':scope > .text');
      var side = beat.classList.contains('alt') ? 1 : -1, narrow = window.innerWidth < 820;
      if (fig) G.from(fig, {
        opacity: 0, x: narrow ? 0 : side * 56, y: narrow ? 34 : 0, duration: 0.95, ease: 'expo.out', clearProps: 'transform,opacity',
        scrollTrigger: { trigger: beat, start: 'top 82%', once: true, onEnter: function () { setTimeout(function () { fig.classList.add('lit'); }, 350); } }
      });
      if (text) G.from($$(':scope > *', text).filter(function (x) { return !x.matches('details, .lesson'); }), {
        opacity: 0, y: 22, duration: 0.7, stagger: 0.06, ease: EASE, clearProps: 'transform,opacity', scrollTrigger: { trigger: text, start: 'top 85%', once: true }
      });
    });
    // section headings draw their rule; the one-line lessons are underlined by a light sweep
    $$('h2.sub, .lesson, .recap, .bridge', ch).forEach(function (el) {
      ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { el.classList.add('in'); } });
    });
  }
  // reference pages and the chapter foot
  $$('.ref-page .ref-h, .page-refs .h2, .pagenav .pn').forEach(function (el) {
    G.from(el, { opacity: 0, y: 24, duration: 0.7, ease: EASE, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  var az = $$('.az a');
  if (az.length) G.from(az, { opacity: 0, y: 10, scale: 0.8, duration: 0.4, stagger: 0.02, ease: 'back.out(2)', delay: 0.15 });

  /* ---------- folds open and close smoothly ---------- */
  $$('details.deeper > summary, .fig details.src > summary').forEach(function (sum) {
    var d = sum.parentNode;
    sum.addEventListener('click', function (e) {
      if (!d.animate) return;
      e.preventDefault();
      if (d._anim) d._anim.cancel();
      var body2 = d.querySelector(':scope > .body, :scope > .basis') || sum.nextElementSibling, start = d.offsetHeight;
      d.style.overflow = 'hidden';
      if (!d.open) {
        d.open = true;
        var end = d.offsetHeight;
        d._anim = d.animate({ height: [start + 'px', end + 'px'] }, { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
        if (body2) body2.animate({ opacity: [0, 1], transform: ['translateY(-6px)', 'none'] }, { duration: 420, easing: 'ease-out' });
        d._anim.onfinish = function () { d._anim = null; d.style.overflow = ''; ST.refresh(); };
      } else {
        var endc = sum.offsetHeight + (parseFloat(getComputedStyle(d).borderTopWidth) || 0) * 2;
        d._anim = d.animate({ height: [start + 'px', endc + 'px'] }, { duration: 320, easing: 'cubic-bezier(.4,0,.2,1)' });
        d._anim.onfinish = function () { d.open = false; d._anim = null; d.style.overflow = ''; ST.refresh(); };
      }
    });
  });

  /* ---------- a place reached through a link flashes once ---------- */
  function flash(id) {
    var el = id && document.getElementById(id);
    if (!el || !el.matches('figure, h2, h3, .deeper, li, dt')) return;
    el.classList.remove('arrive'); void el.offsetWidth; el.classList.add('arrive');
    setTimeout(function () { el.classList.remove('arrive'); }, 1700);
  }
  window.addEventListener('hashchange', function () { flash(decodeURIComponent(location.hash.slice(1))); });
  if (location.hash.length > 1) setTimeout(function () { flash(decodeURIComponent(location.hash.slice(1))); }, 500);

  /* ---------- the contents panel and the search results arrive in sequence ---------- */
  var toc = document.getElementById('toc');
  if (toc) new MutationObserver(function () {
    if (!body.classList.contains('toc-open')) return;
    G.fromTo($$('.toc-sec', toc), { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.06, ease: EASE, delay: 0.08, clearProps: 'all' });
    var here = toc.querySelector('.toc-outline a.here');
    if (here) G.fromTo(here, { backgroundColor: 'rgba(31,72,214,.22)' }, { backgroundColor: 'rgba(31,72,214,.08)', duration: 1.2, delay: 0.3, clearProps: 'backgroundColor' });
  }).observe(body, { attributes: true, attributeFilter: ['class'] });
  var res = document.getElementById('searchResults');
  if (res) new MutationObserver(function () {
    G.fromTo($$('li', res).slice(0, 12), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.025, ease: EASE, clearProps: 'all' });
  }).observe(res, { childList: true });

  /* ---------- print, and anything that hides text, shows the end state ---------- */
  window.addEventListener('beforeprint', function () { ST.getAll().forEach(function (t) { if (t.animation) t.animation.progress(1); }); });
  window.addEventListener('load', function () { ST.refresh(); });
})();
