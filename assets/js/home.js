(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  document.getElementById('year').textContent = String(new Date().getFullYear());

  /* ---------- always on: progress, nav, rail, lightbox, details ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll('section[id]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var rail = document.getElementById('rail');
  var railFill = document.getElementById('railFill');
  var railStages = Array.prototype.slice.call(document.querySelectorAll('.rail-stages li'));
  var progress = document.getElementById('progress');
  var stageOrder = ['about', 'research', 'experience', 'publications', 'techniques', 'contact'];

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, Math.max(0, y / h)) : 0;
    railFill.style.height = (p * 100) + '%';
    progress.style.width = (p * 100) + '%';
    rail.classList.toggle('show', y > window.innerHeight * 0.6);
    var current = null, mid = y + window.innerHeight * 0.35;
    for (var i = 0; i < sections.length; i++) if (sections[i].offsetTop <= mid) current = sections[i].id;
    navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + current); });
    var idx = stageOrder.indexOf(current);
    if (current === 'gallery' || current === 'labs') idx = stageOrder.indexOf('experience');
    if (current === 'conferences' || current === 'awards' || current === 'tools') idx = stageOrder.indexOf('techniques');
    railStages.forEach(function (li, i) { li.classList.toggle('lit', i <= idx); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* Mobile menu */
  var menuBtn = document.getElementById('menuBtn'), nav = document.getElementById('siteNav');
  function closeNav() { nav.classList.remove('open'); document.body.classList.remove('nav-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu'); }
  menuBtn.addEventListener('click', function () {
    var open = !nav.classList.contains('open');
    nav.classList.toggle('open', open); document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  navLinks.forEach(function (a) { a.addEventListener('click', closeNav); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
  window.addEventListener('resize', function () { if (window.innerWidth > 900) closeNav(); });

  /* Back to top */
  var toTop = document.getElementById('toTop');
  window.addEventListener('scroll', function () { toTop.classList.toggle('show', (window.scrollY || window.pageYOffset) > window.innerHeight * 1.2); }, { passive: true });

  /* Lightbox for every image with a data-caption */
  var lb = document.getElementById('lightbox'), lbImg = document.getElementById('lbImg'), lbCap = document.getElementById('lbCap');
  if (lb && typeof lb.showModal === 'function') {
    Array.prototype.forEach.call(document.querySelectorAll('img[data-caption]'), function (img) {
      img.addEventListener('click', function () {
        lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt; lbCap.textContent = img.getAttribute('data-caption');
        lb.showModal();
      });
      img.parentNode.addEventListener('keydown', function (e) { if (e.key === 'Enter') img.click(); });
    });
    document.getElementById('lbClose').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  }

  /* One open tile at a time */
  Array.prototype.forEach.call(document.querySelectorAll('.tiles'), function (group) {
    group.addEventListener('toggle', function (e) {
      if (e.target.open) Array.prototype.forEach.call(group.querySelectorAll('details[open]'), function (d) { if (d !== e.target) d.open = false; });
    }, true);
  });


  /* ---------- fallback: static page ---------- */
  function staticFinal() {
    root.classList.remove('motion');
    if (reduce) { Array.prototype.forEach.call(document.querySelectorAll('animateMotion'), function (a) { a.parentNode.removeChild(a); }); Array.prototype.forEach.call(document.querySelectorAll('.trace .soc'), function (g) { g.style.display = 'none'; }); }
    Array.prototype.forEach.call(document.querySelectorAll('.scene .bar'), function (b) {
      var big = b.classList.contains('bar-b');
      b.setAttribute('height', big ? '90' : '27'); b.setAttribute('y', big ? '10' : '73');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.draw, #map .arc, #chain .chain-line-fill, .trace .tr'), function (p) { p.style.strokeDashoffset = '0'; });
    Array.prototype.forEach.call(document.querySelectorAll('.vft-pts circle'), function (c) { c.style.opacity = '1'; });
    Array.prototype.forEach.call(document.querySelectorAll('#chain .node, .tl'), function (n) { n.classList.add('lit'); });
    Array.prototype.forEach.call(document.querySelectorAll('.h2'), function (h) { h.classList.add('in'); });
    document.querySelector('.timeline').style.setProperty('--tl', '100%');
  }
  if (reduce || !hasGsap) { staticFinal(); return; }
  root.classList.add('motion');

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  /* ---------- hero canvas: drifting ion field with pointer attraction ---------- */
  (function ionField() {
    var cv = document.getElementById('heroCanvas'); if (!cv) return;
    if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760) return;
    var ctx = cv.getContext('2d'), W, H, pts = [], px = -1e4, py = -1e4, running = true;
    function size() { var r = cv.parentNode.getBoundingClientRect(); W = cv.width = Math.floor(r.width * devicePixelRatio); H = cv.height = Math.floor(r.height * devicePixelRatio); }
    size(); window.addEventListener('resize', size);
    var N = Math.min(90, Math.floor(window.innerWidth / 14));
    for (var i = 0; i < N; i++) pts.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .0006, vy: (Math.random() - .5) * .0006, r: 1 + Math.random() * 1.6, a: Math.random() });
    cv.parentNode.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); px = (e.clientX - r.left) / r.width; py = (e.clientY - r.top) / r.height; });
    cv.parentNode.addEventListener('pointerleave', function () { px = py = -1e4; });
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      var d = devicePixelRatio;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var dx = px - p.x, dy = py - p.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < .18) { p.vx += dx * .00012; p.vy += dy * .00012; }
        p.vx *= .995; p.vy *= .995;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1; if (p.y < 0 || p.y > 1) p.vy *= -1;
        p.a += .01;
        var al = .25 + .25 * Math.sin(p.a);
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r * d, 0, 6.283);
        ctx.fillStyle = i % 4 === 0 ? 'rgba(240,180,65,' + al + ')' : 'rgba(131,219,208,' + al + ')';
        ctx.fill();
      }
      for (var a = 0; a < pts.length; a++) for (var b = a + 1; b < pts.length; b++) {
        var ex = (pts[a].x - pts[b].x) * W, ey = (pts[a].y - pts[b].y) * H, L = Math.sqrt(ex * ex + ey * ey);
        if (L < 110 * d) { ctx.strokeStyle = 'rgba(131,219,208,' + (.12 * (1 - L / (110 * d))) + ')'; ctx.lineWidth = d; ctx.beginPath(); ctx.moveTo(pts[a].x * W, pts[a].y * H); ctx.lineTo(pts[b].x * W, pts[b].y * H); ctx.stroke(); }
      }
      requestAnimationFrame(frame);
    }
    frame();
    window.ScrollTrigger.create({ trigger: '#hero', start: 'top bottom', end: 'bottom top',
      onLeave: function () { running = false; }, onEnterBack: function () { if (!running) { running = true; frame(); } } });
  })();

  /* ---------- hero entrance ---------- */
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .to('.kicker', { opacity: 1, duration: .6 }, 0)
    .to('.name span', { opacity: 1, y: 0, duration: .9, stagger: .14 }, .1)
    .to('.tagline', { opacity: 1, duration: .7 }, .5)
    .to('.lede', { opacity: 1, duration: .7, stagger: .12 }, .7)
    .to('.actions', { opacity: 1, duration: .6 }, 1.0)
    .to('.hero-fig', { opacity: 1, duration: .8 }, .3)
    .to('.hero-fig .layer', { opacity: 1, duration: .5, stagger: .14 }, .6)
    .to('.trace .charge', { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 1.2)
    .to('.trace .discharge', { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 1.8)
    .to('.trace .hyst', { opacity: 1, duration: 1.0 }, 2.6)
    .to('.trace .arrows', { opacity: 1, duration: .6 }, 3.0)
    .to('.trace .soc', { opacity: 1, duration: .6 }, 3.2)
    .to('.figures li', { opacity: 1, y: 0, duration: .6, stagger: .1 }, 1.2);

  Array.prototype.forEach.call(document.querySelectorAll('.figures b[data-count]'), function (el) {
    var target = parseFloat(el.getAttribute('data-count')), suffix = el.getAttribute('data-suffix') || '', o = { v: 0 };
    gsap.to(o, { v: target, duration: 1.8, ease: 'power2.out', delay: 1.3, onUpdate: function () { el.textContent = Math.round(o.v) + suffix; } });
  });

  /* Li+ ions in the hero cell: each ion leaves the lithium surface, crosses the membrane and inserts into an active-material particle */
  var ionsGroup = document.getElementById('ions'), NS = 'http://www.w3.org/2000/svg';
  var sites = Array.prototype.map.call(document.querySelectorAll('#cellSvg .active-material polygon'), function (p) { return { x: +p.getAttribute('data-cx'), y: +p.getAttribute('data-cy') }; });
  function launchIon(c, first) {
    var site = sites[Math.floor(Math.random() * sites.length)], d = 4.5 + Math.random() * 3.5;
    c.setAttribute('cx', '171'); c.setAttribute('cy', String(70 + Math.random() * 180)); c.setAttribute('opacity', '0');
    var tl = gsap.timeline({ delay: first ? 0 : .3 + Math.random() * 2, onComplete: function () { launchIon(c, false); } });
    tl.to(c, { attr: { opacity: 1 }, duration: .5 }, 0)
      .to(c, { attr: { cx: site.x }, duration: d, ease: 'none' }, 0)
      .to(c, { attr: { cy: site.y }, duration: d, ease: 'sine.inOut' }, 0)
      .to(c, { attr: { opacity: 0 }, duration: .5 }, d - .5);
    if (first) tl.progress(Math.random());
    c._tl = tl;
  }
  for (var k = 0; k < 12; k++) {
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('class', 'ion-dot'); c.setAttribute('r', String(2.6 + Math.random() * 1.2));
    ionsGroup.appendChild(c); launchIon(c, true);
  }
  function ionsRun(play) { Array.prototype.forEach.call(ionsGroup.children, function (c) { if (c._tl) { play ? c._tl.play() : c._tl.pause(); } }); }
  window.ScrollTrigger.create({ trigger: '#hero', start: 'top bottom', end: 'bottom top', onLeave: function () { ionsRun(false); }, onEnterBack: function () { ionsRun(true); } });

  /* Gentle parallax on the hero figure */
  gsap.to('.hero-fig', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------- reveals ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.sub, .prose, .scene-text, .scene-fig, .tile, .tl, .map-fig, .pub, .tech, .conf li, .cols3 > div, .shot, .lab, .tool, .contact .wrap, .h3'), function (el) { el.classList.add('reveal'); });
  gsap.utils.toArray('.reveal').forEach(function (el) {
    gsap.to(el, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  gsap.utils.toArray('.h2').forEach(function (h) {
    window.ScrollTrigger.create({ trigger: h, start: 'top 85%', once: true, onEnter: function () { h.classList.add('in'); } });
  });
  /* Gallery tiles: clip reveal */
  gsap.utils.toArray('.shot img').forEach(function (img, i) {
    gsap.from(img, { scale: 1.15, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: img, start: 'top 90%', once: true } });
  });

  /* ---------- about chain ---------- */
  var chainNodes = document.querySelectorAll('#chain .node');
  gsap.to('#chain .chain-line-fill', { strokeDashoffset: 0, ease: 'none',
    scrollTrigger: { trigger: '#about', start: 'top 60%', end: 'bottom 60%', scrub: true,
      onUpdate: function (self) { var lit = Math.round(self.progress * (chainNodes.length - 1)); Array.prototype.forEach.call(chainNodes, function (n, i) { n.classList.toggle('lit', i <= lit); }); } } });

  /* ---------- scene 2: bars ---------- */
  var A = { v: 0 }, B = { v: 0 }, sc = 90 / 188.2;
  gsap.timeline({ scrollTrigger: { trigger: '#scene2 .scene-fig', start: 'top 70%', once: true } })
    .to(A, { v: 56, duration: 1.1, ease: 'power2.out', onUpdate: function () { var h = A.v * sc; gsap.set('.bar-a', { attr: { height: h, y: 100 - h } }); var t = document.getElementById('barA'); t.textContent = Math.round(A.v); t.setAttribute('y', String(92 - h)); } }, 0)
    .to(B, { v: 188.2, duration: 1.6, ease: 'power2.out', onUpdate: function () { var h = B.v * sc; gsap.set('.bar-b', { attr: { height: h, y: 100 - h } }); var t = document.getElementById('barB'); t.textContent = B.v.toFixed(1); t.setAttribute('y', String(92 - h)); } }, .4)
    .from('#scene2 .insitu circle', { scale: 0, transformOrigin: 'center', stagger: .05, duration: .4, ease: 'back.out(2)' }, 0);

  /* ---------- scene 3 ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '#scene3 .scene-fig', start: 'top 70%', once: true } })
    .to('#scene3 .vft', { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 0)
    .to('#scene3 .vft-pts circle', { opacity: 1, stagger: .12, duration: .3 }, .3)
    .from('#scene3 .nyq-1', { scaleX: 0, scaleY: 0, transformOrigin: '50px 150px', duration: .6 }, .8)
    .from('#scene3 .nyq-2', { scaleX: 0, scaleY: 0, transformOrigin: '50px 150px', duration: .6 }, 1.2)
    .from('#scene3 .nyq-3', { scaleX: 0, scaleY: 0, transformOrigin: '50px 150px', duration: .6 }, 1.6)
    .to('#scene3 .clamp-top', { attr: { y: 32 }, duration: .8, ease: 'power2.inOut' }, 1.0)
    .to('#scene3 .arrow', { opacity: .35, yoyo: true, repeat: 3, duration: .4 }, 1.0);

  /* ---------- scene 4 ---------- */
  var streamY = { org: 60, li: 150, me: 240 };
  gsap.timeline({ scrollTrigger: { trigger: '#scene4 .scene-fig', start: 'top 70%', once: true } })
    .to('#scene4 .rp', { duration: 1.4, ease: 'power2.inOut', stagger: .08,
      attr: { cx: function (i) { return 318 + (i % 3) * 18; }, cy: function (i, el) { return streamY[el.classList.contains('org') ? 'org' : el.classList.contains('li') ? 'li' : 'me']; } } }, .2);

  /* ---------- experience: scrubbed line, dots, arcs ---------- */
  var tlEl = document.querySelector('.timeline');
  window.ScrollTrigger.create({ trigger: tlEl, start: 'top 70%', end: 'bottom 70%', scrub: true,
    onUpdate: function (self) { tlEl.style.setProperty('--tl', (self.progress * 100) + '%'); } });
  gsap.utils.toArray('.tl').forEach(function (li) {
    window.ScrollTrigger.create({ trigger: li, start: 'top 72%', once: true, onEnter: function () { li.classList.add('lit'); } });
  });
  gsap.to('#map .arc', { strokeDashoffset: 0, duration: 1.4, stagger: .3, ease: 'power2.inOut', scrollTrigger: { trigger: '#map', start: 'top 75%', once: true } });

  window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  window.ScrollTrigger.refresh();
})();

