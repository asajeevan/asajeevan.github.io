/* site.js: behaviour shared by every page (top bar progress, active nav link,
   mobile menu, back to top, year, scroll reveals). Every element is optional. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var motion = !reduce && hasGsap;
  if (motion) root.classList.add('motion'); else root.classList.remove('motion');

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  var sections = Array.prototype.slice.call(document.querySelectorAll('section[id], article[id][data-nav]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var progress = document.getElementById('progress');

  function scrollFraction() {
    var y = window.scrollY || window.pageYOffset;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    return h > 0 ? Math.min(1, Math.max(0, y / h)) : 0;
  }
  function currentSection() {
    var y = window.scrollY || window.pageYOffset, mid = y + window.innerHeight * 0.35, current = null;
    for (var i = 0; i < sections.length; i++) if (sections[i].offsetTop <= mid) current = sections[i].id;
    return current;
  }
  var listeners = [];
  function onScroll() {
    var p = scrollFraction(), current = currentSection();
    if (progress) progress.style.width = (p * 100) + '%';
    navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + current); });
    listeners.forEach(function (fn) { fn(p, current); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* Mobile menu */
  var menuBtn = document.getElementById('menuBtn'), nav = document.getElementById('siteNav');
  function closeNav() {
    if (!nav || !menuBtn) return;
    nav.classList.remove('open'); document.body.classList.remove('nav-open');
    menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu');
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = !nav.classList.contains('open');
      nav.classList.toggle('open', open); document.body.classList.toggle('nav-open', open);
      menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) { a.addEventListener('click', closeNav); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) closeNav(); });
  }

  /* Back to top */
  var toTop = document.getElementById('toTop');
  if (toTop) window.addEventListener('scroll', function () { toTop.classList.toggle('show', (window.scrollY || window.pageYOffset) > window.innerHeight * 1.2); }, { passive: true });

  /* Reveals and heading underlines */
  var revealTargets = document.querySelectorAll('[data-reveal]');
  Array.prototype.forEach.call(revealTargets, function (el) { el.classList.add('reveal'); });
  if (motion) {
    var gsap = window.gsap; gsap.registerPlugin(window.ScrollTrigger);
    gsap.utils.toArray('.reveal').forEach(function (el) {
      gsap.to(el, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    gsap.utils.toArray('.h2').forEach(function (h) {
      window.ScrollTrigger.create({ trigger: h, start: 'top 85%', once: true, onEnter: function () { h.classList.add('in'); } });
    });
    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  } else {
    Array.prototype.forEach.call(document.querySelectorAll('.h2'), function (h) { h.classList.add('in'); });
  }

  window.Site = {
    reduce: reduce, hasGsap: hasGsap, motion: motion,
    onScroll: function (fn) { listeners.push(fn); },
    refresh: onScroll
  };
  onScroll();
})();
