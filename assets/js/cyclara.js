/* cyclara.js: the Cyclara page. Theme switch and menu (as on the home page), the live figure (the synthetic
   demonstration cell, analysed by Cyclara: assets/js/cyclara-demo.js), the tour tabs, a picture viewer and the
   copy buttons. Everything is optional: without scripts the page still reads, and every picture and download
   is a plain link. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : darkMq.matches; }
  var themeListeners = [];

  /* ---------- theme: auto, light, dark (shared with the home page through localStorage "theme") ---------- */
  (function () {
    var btn = document.getElementById('themeBtn'); if (!btn) return;
    function mode() { return root.getAttribute('data-theme') || 'auto'; }
    function label(m) {
      var next = m === 'auto' ? 'light' : m === 'light' ? 'dark' : 'automatic';
      btn.setAttribute('data-mode', m);
      btn.setAttribute('aria-label', (m === 'auto' ? 'Theme: follows your system' : m === 'light' ? 'Theme: light' : 'Theme: dark') + '. Switch to ' + next);
    }
    btn.addEventListener('click', function () {
      var m = mode(), next = m === 'auto' ? 'light' : m === 'light' ? 'dark' : 'auto';
      if (next === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', next);
      try { if (next === 'auto') localStorage.removeItem('theme'); else localStorage.setItem('theme', next); } catch (e) {}
      label(next);
      themeListeners.forEach(function (fn) { fn(); });
    });
    label(mode());
    var onMq = function () { label(mode()); themeListeners.forEach(function (fn) { fn(); }); };
    if (darkMq.addEventListener) darkMq.addEventListener('change', onMq); else if (darkMq.addListener) darkMq.addListener(onMq);
  })();

  /* ---------- menu on narrow screens, and the section the reader is in ---------- */
  (function () {
    var menuBtn = document.getElementById('menuBtn'), nav = document.getElementById('siteNav');
    if (!menuBtn || !nav) return;
    function close() {
      nav.classList.remove('open'); document.body.classList.remove('nav-open');
      menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu');
    }
    menuBtn.addEventListener('click', function () {
      var open = !nav.classList.contains('open');
      nav.classList.toggle('open', open); document.body.classList.toggle('nav-open', open);
      menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 980) close(); });
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    function onScroll() {
      var mid = (window.scrollY || window.pageYOffset) + window.innerHeight * 0.35, cur = null;
      secs.forEach(function (s) { if (s.offsetTop <= mid) cur = s.id; });
      links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + cur); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- the live figure ----------
     Drawn at the width it is shown, so its type stays at true size on a phone; rebuilt when that width changes. */
  (function () {
    var D = window.CYCLARA_DEMO, host = document.getElementById('demoPlot');
    if (!D || !host) return;
    var NS = 'http://www.w3.org/2000/svg';
    var X0 = 0, X1 = 140, Y0 = 2.2, Y1 = 3.9;
    var n = D.cycles.length;
    function el(name, attrs, parent) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    }
    function hex(s) { s = s.trim().replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; }
    function ramp(x, stops) {
      var f = x * (stops.length - 1), k = Math.min(Math.floor(f), stops.length - 2), t = f - k, a = stops[k], b = stops[k + 1];
      return 'rgb(' + [0, 1, 2].map(function (m) { return Math.round(a[m] + (b[m] - a[m]) * t); }).join(',') + ')';
    }

    var svg, plot, paths = [], pts = [], labC, labD, W = 0, H = 0, L = 54, R = 12, T = 10, B = 46;
    var colours = [], focus = 0, drawnOnce = false;
    var sx = function (q) { return L + (q - X0) / (X1 - X0) * (W - L - R); };
    var sy = function (v) { return T + (Y1 - v) / (Y1 - Y0) * (H - T - B); };

    function build() {
      var w = Math.round(host.clientWidth);
      if (!w || w === W) return;
      W = w; H = Math.round(Math.min(440, Math.max(250, W * 0.66)));
      host.textContent = '';
      svg = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-labelledby': 'demoTitle demoDesc' });
      el('title', { id: 'demoTitle' }, svg).textContent = 'Potential against specific capacity, 50 cycles';
      el('desc', { id: 'demoDesc' }, svg).textContent = 'Charge and discharge curves of a synthetic cell, coloured from the first cycle to the fiftieth. The cell has three plateaus, with mid-points near 2.56, 3.02 and 3.56 V.';
      var g = el('g', {}, svg);
      var step = W < 440 ? 40 : 20;
      for (var q = X0; q <= X1; q += step) {
        if (q > X0 && q < X1) el('line', { x1: sx(q), x2: sx(q), y1: T, y2: H - B, 'class': 'grid-line' }, g);
        el('line', { x1: sx(q), x2: sx(q), y1: H - B, y2: H - B - 5, 'class': 'tick' }, g);
        el('text', { x: sx(q), y: H - B + 17, 'text-anchor': 'middle', 'class': 'tick-l' }, g).textContent = q;
      }
      [2.4, 2.8, 3.2, 3.6].forEach(function (v) {
        el('line', { x1: L, x2: W - R, y1: sy(v), y2: sy(v), 'class': 'grid-line' }, g);
        el('line', { x1: L, x2: L + 5, y1: sy(v), y2: sy(v), 'class': 'tick' }, g);
        el('text', { x: L - 8, y: sy(v) + 4, 'text-anchor': 'end', 'class': 'tick-l' }, g).textContent = v.toFixed(1);
      });
      el('text', { x: L + (W - L - R) / 2, y: H - 9, 'text-anchor': 'middle', 'class': 'axis-t' }, g)
        .innerHTML = 'Specific capacity (mAh g<tspan dy="-5" font-size="9.5">−1</tspan><tspan dy="5">)</tspan>';
      el('text', { transform: 'translate(15 ' + (T + (H - T - B) / 2) + ') rotate(-90)', 'text-anchor': 'middle', 'class': 'axis-t' }, g)
        .innerHTML = 'Potential (V vs Li<tspan dy="-5" font-size="9.5">+</tspan><tspan dy="5">/Li)</tspan>';
      plot = el('g', { 'class': 'plot' }, svg);
      paths = []; pts = [];
      D.cycles.forEach(function (c, i) {
        ['c', 'd'].forEach(function (k) {
          var a = c[k], d = '';
          for (var j = 0; j < a.length; j += 2) {
            var x = sx(a[j] / 10), y = sy(a[j + 1] / 1000);
            d += (j ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
            pts.push([x, y, i + 1]);
          }
          var p = el('path', { d: d, 'class': 'curve' }, plot);
          p.dataset.i = i;
          paths.push(p);
        });
      });
      /* in the empty space beside each branch's upper and lower plateau */
      labC = el('text', { x: sx(80), y: sy(3.66), 'text-anchor': 'end', 'class': 'dir-l' }, svg); labC.textContent = 'charge';
      labD = el('text', { x: sx(86), y: sy(2.42), 'text-anchor': 'end', 'class': 'dir-l' }, svg); labD.textContent = 'discharge';
      el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, 'class': 'frame' }, svg);
      host.appendChild(svg);
      svg.addEventListener('pointermove', point);
      svg.addEventListener('pointerdown', point);
      svg.addEventListener('pointerleave', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;      /* a finger lifted: keep the cycle it chose */
        hovering = false; if (document.activeElement !== input) focusCycle(0);
      });
      paint();
      focusCycle(focus, true);
      if (!drawnOnce) { drawnOnce = true; drawIn(); }
    }

    /* the ramp: first cycle at r0, last at r3, read from the page's tokens so it follows the theme */
    var strip = document.getElementById('demoStrip'), bars = [];
    var qmax = Math.max.apply(null, D.cycles.map(function (c) { return c.qd; }));
    D.cycles.forEach(function (c) {
      var s = document.createElement('span');
      s.style.height = (100 * c.qd / qmax).toFixed(1) + '%';
      strip.appendChild(s); bars.push(s);
    });
    function paint() {
      var cs = getComputedStyle(root), stops = ['--r0', '--r1', '--r2', '--r3'].map(function (v) { return hex(cs.getPropertyValue(v)); });
      colours = D.cycles.map(function (c, i) { return ramp(n > 1 ? i / (n - 1) : 0, stops); });
      paths.forEach(function (p) { p.style.stroke = colours[+p.dataset.i]; });
      bars.forEach(function (b, i) { b.style.setProperty('--c', colours[i]); });
      if (labC) { labC.style.fill = colours[Math.round(n * 0.2)]; labD.style.fill = colours[Math.round(n * 0.75)]; }
    }
    themeListeners.push(paint);

    /* the readout: the cell's summary until a cycle is chosen, then that cycle */
    var S = D.summary, out = document.getElementById('demoReadout'), input = document.getElementById('demoCycle');
    var g1 = ' mAh g<sup>−1</sup>';
    function setRows(rows) {
      var dts = out.querySelectorAll('dt'), dds = out.querySelectorAll('dd');
      rows.forEach(function (r, i) { dts[i].textContent = r[0]; dds[i].innerHTML = r[1]; });
    }
    function focusCycle(k, quiet) {
      focus = k;
      var on = k > 0;
      if (plot) plot.classList.toggle('has-focus', on);
      strip.classList.toggle('has-focus', on);
      paths.forEach(function (p) { p.classList.toggle('on', on && +p.dataset.i === k - 1); });
      if (on && paths.length) { plot.appendChild(paths[2 * (k - 1)]); plot.appendChild(paths[2 * (k - 1) + 1]); }
      bars.forEach(function (b, i) { b.classList.toggle('on', on && i === k - 1); });
      if (!on) {
        setRows([['Cycles', '1–' + S.cycles], ['First discharge', S.first_qd.toFixed(1) + g1],
                 ['Retention at cycle ' + S.cycles, S.ret_last.toFixed(1) + ' %'], ['Mean efficiency, cycles 2–' + S.cycles, S.mean_ce.toFixed(2) + ' %']]);
        input.setAttribute('aria-valuetext', 'No cycle chosen; the cell summary is shown');
        return;
      }
      var c = D.cycles[k - 1];
      setRows([['Cycle', String(c.n)], ['Discharge', c.qd.toFixed(1) + g1], ['Coulombic efficiency', c.ce.toFixed(2) + ' %'], ['Average discharge potential', c.vd.toFixed(3) + ' V']]);
      if (!quiet) input.value = String(k);
      input.setAttribute('aria-valuetext', 'Cycle ' + c.n + ': discharge ' + c.qd.toFixed(1) + ' mAh per gram, Coulombic efficiency ' + c.ce.toFixed(2) + ' per cent');
    }

    /* the strip: drag or point along it; the range input underneath takes the keys */
    var wrap = document.getElementById('demoStripWrap'), hovering = false, dragging = false;
    function fromX(e) {
      var r = strip.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
      return Math.max(1, Math.min(n, Math.floor(x * n) + 1));
    }
    input.addEventListener('input', function () { focusCycle(+input.value); });
    input.addEventListener('keydown', function () { wrap.classList.add('kbd'); });     /* the focus ring is for keys, not for a tap */
    input.addEventListener('blur', function () { if (!hovering && !dragging) focusCycle(0); });
    wrap.addEventListener('pointerdown', function (e) {
      e.preventDefault();                  /* no compatibility mousedown, which would take the focus away from the input */
      wrap.classList.remove('kbd');
      dragging = true; try { wrap.setPointerCapture(e.pointerId); } catch (x) {}
      focusCycle(fromX(e)); try { input.focus({ preventScroll: true }); } catch (x) { input.focus(); }
    });
    wrap.addEventListener('pointermove', function (e) { if (dragging || e.pointerType === 'mouse') { hovering = true; focusCycle(fromX(e)); } });
    wrap.addEventListener('pointerup', function () { dragging = false; });
    wrap.addEventListener('pointerleave', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      hovering = false; if (!dragging && document.activeElement !== input) focusCycle(0);
    });

    /* pointing at the plot brings the nearest curve forward */
    var raf = 0;
    function nearest(e) {
      var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      if (x < L || x > W - R || y < T || y > H - B) return 0;
      var best = 1e9, k = 0;
      for (var i = 0; i < pts.length; i++) { var dx = pts[i][0] - x, dy = pts[i][1] - y, d = dx * dx + dy * dy; if (d < best) { best = d; k = pts[i][2]; } }
      return best < 400 ? k : 0;
    }
    function point(e) {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; var k = nearest(e); hovering = k > 0; if (k) focusCycle(k); });
    }

    /* one moment of motion: the curves are drawn in cycle order the first time the figure is seen */
    function drawIn() {
      if (reduce || !('IntersectionObserver' in window)) return;
      paths.forEach(function (p) { var len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
      var mine = paths.slice();
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        mine.forEach(function (p) {
          p.style.transition = 'stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1) ' + (+p.dataset.i * 22) + 'ms';
          requestAnimationFrame(function () { p.style.strokeDashoffset = 0; });
          p.addEventListener('transitionend', function done() { p.style.transition = ''; p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.removeEventListener('transitionend', done); });
        });
      }, { threshold: 0.3 });
      io.observe(svg);
    }

    build();
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 120); });
  })();

  /* ---------- tour tabs ---------- */
  (function () {
    var list = document.querySelector('[role="tablist"]'); if (!list) return;
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(t, focus) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) t.focus();
      t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, j = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : null;
        if (j === null) return;
        e.preventDefault(); select(tabs[(j + tabs.length) % tabs.length], true);
      });
    });
  })();

  /* ---------- picture viewer: the full-size screenshot in the current theme ---------- */
  (function () {
    var box = document.getElementById('viewer'); if (!box || typeof box.showModal !== 'function') return;
    var img = box.querySelector('img'), cap = box.querySelector('p'), opener = null;
    Array.prototype.forEach.call(document.querySelectorAll('[data-full-light]'), function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault(); opener = b;
        img.src = isDark() && b.dataset.fullDark ? b.dataset.fullDark : b.dataset.fullLight;
        img.alt = b.dataset.alt || '';
        cap.textContent = b.dataset.caption || '';
        box.showModal();
      });
    });
    box.querySelector('.close').addEventListener('click', function () { box.close(); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
    box.addEventListener('close', function () { img.removeAttribute('src'); if (opener) opener.focus(); });
  })();

  /* ---------- download counter ----------
     GitHub's own count of every installer download, summed over all releases, read from the public releases API.
     Shown at once from the last count this browser saw, then checked again on load and every five minutes while
     the page is visible; the browser revalidates with the response's ETag, and an unchanged answer does not count
     against GitHub's limit of 60 requests an hour for a visitor. Without an answer and without a stored count, the
     line stays hidden. */
  (function () {
    var box = document.getElementById('downloads');
    if (!box || !window.fetch) return;
    var API = 'https://api.github.com/repos/asajeevan/electrochem-toolkit/releases?per_page=100';
    var KEY = 'cyclara-downloads', EVERY = 5 * 60 * 1000;
    var KINDS = [['win', /-Setup\.exe$/i], ['arm', /-macOS-AppleSilicon\.zip$/i], ['intel', /-macOS-Intel\.zip$/i]];
    function $(id) { return document.getElementById(id); }
    function stored() { try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && typeof d.t === 'number' ? d : null; } catch (e) { return null; } }
    function store(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
    function count(releases) {
      var d = { win: 0, arm: 0, intel: 0 };
      (releases || []).forEach(function (r) {
        (r.assets || []).forEach(function (a) {
          KINDS.forEach(function (k) { if (k[1].test(a.name || '')) d[k[0]] += +a.download_count || 0; });
        });
      });
      return d;
    }
    function show(d, fresh) {
      var total = d.win + d.arm + d.intel;
      var when = new Date(d.t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      $('dlTotal').textContent = total.toLocaleString('en-GB');
      $('dlLabel').textContent = total === 1 ? 'installer download so far' : 'installer downloads so far';
      $('dlSplit').textContent = 'Windows ' + d.win.toLocaleString('en-GB') + ', Mac with Apple silicon ' + d.arm.toLocaleString('en-GB') + ', Mac with Intel ' + d.intel.toLocaleString('en-GB') + '.';
      $('dlWhen').textContent = fresh ? 'Counted by GitHub, checked at ' + when + '.' : 'Counted by GitHub at ' + when + '; GitHub cannot be reached just now.';
      box.classList.toggle('stale', !fresh);
      box.hidden = false;
    }
    function load() {
      fetch(API, { cache: 'no-cache', headers: { Accept: 'application/vnd.github+json' } })
        .then(function (r) { if (!r.ok) throw new Error('GitHub answered ' + r.status); return r.json(); })
        .then(function (releases) { var d = count(releases); d.t = Date.now(); store(d); show(d, true); })
        .catch(function () { var d = stored(); if (d) show(d, false); });
    }
    var last = stored();
    if (last) show(last, Date.now() - last.t < EVERY);
    load();
    setInterval(function () { if (document.visibilityState === 'visible') load(); }, EVERY);
    document.addEventListener('visibilitychange', function () {
      var d = stored();
      if (document.visibilityState === 'visible' && (!d || Date.now() - d.t >= EVERY)) load();
    });
  })();

  /* ---------- copy buttons ---------- */
  (function () {
    function fallback(text) {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', '');
      t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(t); return ok;
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
      var label = b.textContent;
      b.addEventListener('click', function () {
        var src = document.getElementById(b.dataset.copy), text = src ? src.textContent.trim() : '';
        function done(ok) { b.textContent = ok ? 'Copied' : 'Select and copy by hand'; setTimeout(function () { b.textContent = label; }, 1800); }
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallback(text)); });
        else done(fallback(text));
      });
    });
  })();
})();
