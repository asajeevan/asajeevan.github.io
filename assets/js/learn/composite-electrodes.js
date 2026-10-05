/* learn.js: behaviour of the learning page. Reading modes, the charging rail,
   the "your cell" thread, the shared figure helpers (step callouts, the player,
   potential strips, the named ion) and one init function per figure. Every
   animation pauses when its figure leaves the viewport and is skipped when the
   reader prefers reduced motion; the static frame is always a complete figure
   with its callouts visible, and the step buttons still work without motion.
   Generated file: edit src/learn/learn-core.js and src/learn/figs/*.js. */
(function () {
  'use strict';
  var P = window.Physics, S = window.Site || { reduce: false, motion: false, onScroll: function () {} };
  var NS = 'http://www.w3.org/2000/svg';
  var motion = !S.reduce;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k) && attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  /* ---------- typesetting: sub- and superscripts ----------
     Labels are written with Unicode script characters (Zn²⁺, ε₀, 10⁻¹²) or with
     TeX-like markers (μ_A, V_OC, x^2, x^{2+}). The site font has no script glyphs,
     so both are converted into raised or lowered <tspan>s in SVG and <sup>/<sub>
     in HTML, with the same size and offsets everywhere. */
  var SUPC = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ', SUPN = '0123456789+−n', SUBC = '₀₁₂₃₄₅₆₇₈₉₊₋', SUBN = '0123456789+−';
  function scriptRuns(str) { // -> [{t: text, s: 0 | 1 (sup) | -1 (sub)}]
    var out = [], i = 0, n = str.length, buf = '', mode = 0, it = false;
    function flush() { if (buf) out.push({ t: buf, s: mode, it: it }); buf = ''; }
    while (i < n) {
      var c = str[i], m;
      if (c === '§') { flush(); it = !it; i++; continue; } // §p§ sets p in italics (locants such as p-, o-)
      if (SUPC.indexOf(c) >= 0) { m = 1; c = SUPN[SUPC.indexOf(c)]; }
      else if (SUBC.indexOf(c) >= 0) { m = -1; c = SUBN[SUBC.indexOf(c)]; }
      else if ((c === '_' || c === '^') && i + 1 < n && i > 0 && !/\s/.test(str[i - 1])) {
        var mm = c === '^' ? 1 : -1, j = i + 1, body = '';
        if (str[j] === '{') { var k = str.indexOf('}', j); if (k < 0) { buf += c; i++; continue; } body = str.slice(j + 1, k); i = k + 1; }
        else { var mt = /^[A-Za-z0-9+−-]+/.exec(str.slice(j)); if (!mt) { buf += c; i++; continue; } body = mt[0]; i = j + body.length; }
        if (mode !== mm) { flush(); mode = mm; } buf += body; continue;
      }
      else m = 0;
      if (m !== mode) { flush(); mode = m; }
      buf += c; i++;
    }
    flush(); return out;
  }
  function setSvgText(t, str) {
    if (!t || t.namespaceURI !== NS) { if (t) t.textContent = str; return t; } // HTML elements: plain text (the observer typesets them)
    var runs = scriptRuns(str);
    while (t.firstChild) t.removeChild(t.firstChild);
    if (runs.length === 1 && runs[0].s === 0 && !runs[0].it) { t.textContent = runs[0].t; return t; }
    var cur = 0; // current baseline offset in base em (negative = raised)
    runs.forEach(function (r) {
      var target = r.s === 1 ? -0.42 : r.s === -1 ? 0.22 : 0, scale = r.s ? 0.72 : 1;
      var span = el('tspan', { dy: ((target - cur) / scale).toFixed(3) + 'em' }, t);
      if (r.s) span.setAttribute('font-size', '72%');
      if (r.it) span.setAttribute('font-style', 'italic');
      span.textContent = r.t; cur = target;
    });
    return t;
  }
  function txt(parent, x, y, str, cls, anchor, attrs) {
    var a = { x: x, y: y, 'class': 'lbl' + (cls ? ' ' + cls : '') };
    if (anchor) a['text-anchor'] = anchor;
    if (attrs) for (var k in attrs) a[k] = attrs[k];
    var t = el('text', a, parent); setSvgText(t, String(str));
    return t;
  }
  /* plain(str): scripts flattened to ordinary characters, for <option> text and titles */
  function plain(str) { return scriptRuns(String(str)).map(function (r) { return r.t; }).join(''); }
  /* HTML side: convert the same characters inside a node's text into <sup>/<sub>. */
  function mathifyHtml(str) {
    var runs = scriptRuns(str), o = '';
    runs.forEach(function (r) { var e = r.t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); if (r.it) e = '<i>' + e + '</i>'; o += r.s === 1 ? '<sup>' + e + '</sup>' : r.s === -1 ? '<sub>' + e + '</sub>' : e; });
    return o;
  }
  function mathifyNode(node) {
    if (node.nodeType === 3) {
      if (!node.parentNode) return;
      var v = node.nodeValue; if (!/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ₀₁₂₃₄₅₆₇₈₉₊₋§]|\S[_^][A-Za-z0-9{]/.test(v)) return;
      var span = document.createElement('span'); span.className = 'ts'; span.innerHTML = mathifyHtml(v);
      node.parentNode.replaceChild(span, node);
    } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && node.tagName !== 'svg' && !node.closest('svg')) {
      Array.prototype.slice.call(node.childNodes).forEach(mathifyNode);
    }
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function store(key, val) {
    try { if (val === undefined) { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; }
  }
  function fmt(x, d) { return Number(x).toFixed(d === undefined ? 2 : d); }
  function sci(x, d) { // 3.1 x 10^19 as text with a superscript exponent
    if (x === 0) return '0';
    var ex = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, ex);
    if (Math.abs(m) >= 9.995) { m /= 10; ex += 1; }
    return fmt(m, d === undefined ? 1 : d) + ' × 10' + sup(ex);
  }
  function sup(n) { var s = String(n), o = ''; for (var i = 0; i < s.length; i++) o += ({ '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' })[s[i]] || s[i]; return o; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function smooth(k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }
  function on(node, ev, fn) { node.addEventListener(ev, fn); }
  function pressable(node, fn) {
    on(node, 'click', fn);
    on(node, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } });
  }

  /* ---------- arrow markers: one per colour per svg ---------- */
  function marker(svg, color, id) {
    var mid = id || ('arr-' + color.replace(/[^a-z0-9]/gi, ''));
    var uid = svg.getAttribute('data-uid'); if (!uid) { uid = 'u' + Math.random().toString(36).slice(2, 7); svg.setAttribute('data-uid', uid); }
    mid = uid + '-' + mid;
    if (!svg.querySelector('#' + mid)) {
      var defs = svg.querySelector('defs') || el('defs', {}, svg);
      var m = el('marker', { id: mid, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0,0 L10,5 L0,10 z', fill: color }, m);
    }
    return 'url(#' + mid + ')';
  }
  function arrow(g, x1, y1, x2, y2, color, width, cls) {
    var svg = g.ownerSVGElement || g;
    return el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color, 'stroke-width': width || 1.6, 'marker-end': marker(svg, color), 'class': cls || '' }, g);
  }

  /* ---------- numbered callouts ---------- */
  /* badge(g, x, y, n): a numbered circle. A callout group carries class "callout" and
     data-step="n"; steps() lights it. Elements inside with class "hl" get an amber
     stroke when lit. */
  function badge(g, x, y, n) {
    var b = el('g', { 'class': 'callout', 'data-step': n, transform: 'translate(' + x + ',' + y + ')' }, g);
    el('circle', { r: 9, 'class': 'co-badge' }, b);
    el('circle', { r: 13, 'class': 'co-ring' }, b);
    var t = el('text', { y: 4, 'text-anchor': 'middle', 'class': 'co-num' }, b); t.textContent = n;
    return b;
  }
  /* steps(fig, list): list = [{text, on(k)}]. Builds the "Where to look" bar with one
     button per step, a step box that shows the text, and optional per-step callbacks.
     Returns {go(k), k}. All callouts stay visible; the current one is lit. */
  function steps(fig, list, opts) {
    opts = opts || {};
    var svg = fig.querySelector('svg'), bar = document.createElement('div'), box = document.createElement('div');
    bar.className = 'stepbar'; box.className = 'stepbox';
    var lab = document.createElement('span'); lab.className = 'stepk'; lab.textContent = 'Where to look:'; bar.appendChild(lab);
    var btns = [];
    list.forEach(function (st, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = String(i + 1); b.setAttribute('aria-label', 'Step ' + (i + 1) + ' of ' + list.length);
      on(b, 'click', function () { go(i); }); bar.appendChild(b); btns.push(b);
    });
    var anchor = fig.querySelector('.controls') || fig.querySelector('.key') || fig.querySelector('figcaption');
    fig.insertBefore(bar, anchor); fig.insertBefore(box, anchor);
    var state = { k: -1 };
    function go(k) {
      state.k = k;
      btns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === k)); });
      Array.prototype.forEach.call(svg.querySelectorAll('.callout'), function (c) { c.classList.toggle('lit', +c.getAttribute('data-step') === k + 1); });
      box.innerHTML = '<span class="sn">' + (k + 1) + '.</span> ' + list[k].text;
      if (list[k].on) list[k].on(k);
      if (opts.onStep) opts.onStep(k);
    }
    state.go = go; state.bar = bar; state.box = box; state.n = list.length;
    state.next = function () { go((state.k + 1) % list.length); };
    go(opts.start || 0);
    return state;
  }

  /* ---------- the player: play, pause, step for every animation ---------- */
  /* anim(fig, tick, opts): tick(dt, t) advances the figure by dt seconds. Returns a loop
     {start, stop, step, running, t}. Adds play/pause and step buttons to the step bar (or
     a controls row). With reduced motion the loop never auto-runs, but "step" still
     advances by opts.stepDt seconds so the reader can walk through the motion. */
  function anim(fig, tick, opts) {
    opts = opts || {};
    var running = false, raf = 0, t0 = null, loop = { t: 0, wanted: motion && opts.autoplay !== false };
    function frame(ts) {
      if (!running) return;
      var dt = t0 === null ? 0 : Math.min(0.05, (ts - t0) / 1000); t0 = ts; loop.t += dt; tick(dt, loop.t);
      raf = requestAnimationFrame(frame);
    }
    loop.start = function () { if (running || !motion || !loop.wanted) return; running = true; t0 = null; raf = requestAnimationFrame(frame); sync(); };
    loop.stop = function () { running = false; cancelAnimationFrame(raf); sync(); };
    loop.step = function () { loop.stop(); loop.wanted = false; if (opts.onPlay) opts.onPlay(); var dt = opts.stepDt || 0.25; loop.t += dt; tick(dt, loop.t); sync(); };
    loop.toggle = function () { if (running) { loop.wanted = false; loop.stop(); } else { loop.wanted = true; if (opts.onPlay) opts.onPlay(); if (!motion) { loop.step(); } else loop.start(); } };
    loop.running = function () { return running; };
    var bar = fig.querySelector('.stepbar') || fig.querySelector('.controls');
    var play = document.createElement('button'), step = document.createElement('button');
    play.type = 'button'; step.type = 'button'; play.className = 'ctl'; step.className = 'ctl';
    play.setAttribute('aria-label', 'Play or pause the animation'); step.setAttribute('aria-label', 'Advance the animation one step');
    step.textContent = 'Step ▸';
    function sync() { play.textContent = running ? '❚❚ Pause' : '▶ Play'; play.setAttribute('aria-pressed', String(running)); }
    on(play, 'click', loop.toggle); on(step, 'click', loop.step);
    if (bar) { bar.appendChild(play); bar.appendChild(step); }
    sync();
    tick(0, 0);
    return loop;
  }

  /* ---------- potential-against-position strip ---------- */
  /* phiStrip(g, box, pts, opts): box = {x, y, w, h}; pts = [{x: 0..1, phi: volts}] in order;
     opts.vmin, vmax set the scale; opts.label names the axis. Returns {update(pts)}.
     The profile is drawn as one polyline, so vertical segments are the interfacial jumps
     (Bard, Faulkner and White, Figure 1.1.2) and sloping segments the ohmic drops
     (their Figure 1.5.2). */
  function phiStrip(g, box, pts, opts) {
    opts = opts || {};
    var vmin = opts.vmin === undefined ? 0 : opts.vmin, vmax = opts.vmax === undefined ? 1 : opts.vmax;
    el('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: 4, fill: 'rgba(234,240,236,.04)', stroke: 'var(--line)' }, g);
    var Y = function (v) { return box.y + box.h - (v - vmin) / (vmax - vmin) * box.h; }, X = function (f) { return box.x + f * box.w; };
    var fill = el('path', { 'class': 'phi-fill' }, g), line = el('path', { 'class': 'phi-line' }, g);
    txt(g, box.x - 6, box.y + 4, opts.label || 'potential φ', 'phi', 'end');
    txt(g, box.x - 6, box.y + box.h, opts.units || 'V', 'phi', 'end');
    if (opts.xlabel) txt(g, opts.xanchor === 'middle' ? X(0.5) : X(1), box.y + box.h + 14, opts.xlabel, '', opts.xanchor || 'end');
    var ticks = el('g', {}, g);
    function update(p) {
      if (!p || !p.length) return;
      var d = ''; for (var i = 0; i < p.length; i++) d += (i ? ' L' : 'M') + X(p[i].x).toFixed(1) + ',' + Y(p[i].phi).toFixed(1);
      line.setAttribute('d', d);
      fill.setAttribute('d', d + ' L' + X(p[p.length - 1].x).toFixed(1) + ',' + (box.y + box.h) + ' L' + X(p[0].x).toFixed(1) + ',' + (box.y + box.h) + ' Z');
    }
    update(pts);
    return { update: update, X: X, Y: Y, g: g, ticks: ticks };
  }

  /* ---------- the named ion ---------- */
  function ourIon(g, x, y, r, label, below) {
    var grp = el('g', { 'class': 'our' }, g), rr = r || 5;
    var c = el('circle', { cx: x, cy: y, r: rr, 'class': 'ion our-ion' }, grp);
    var pos = function (nx, ny) { return below ? { x: nx, y: ny + rr + 13, a: 'middle' } : { x: nx + rr + 4, y: ny + 4, a: 'start' }; };
    var p0 = pos(x, y);
    var t = el('text', { x: p0.x, y: p0.y, 'class': 'our-ion-t', 'text-anchor': p0.a }, grp); setSvgText(t, label === undefined ? 'our ion' : label);
    return { g: grp, c: c, t: t, move: function (nx, ny) { c.setAttribute('cx', nx); c.setAttribute('cy', ny); var q = pos(nx, ny); t.setAttribute('x', q.x); t.setAttribute('y', q.y); } };
  }
  /* a charge symbol: filled circle with + or - */
  function charge(g, x, y, r, sign, cls) {
    var grp = el('g', { transform: 'translate(' + x + ',' + y + ')', 'class': cls || '' }, g);
    el('circle', { r: r, 'class': sign > 0 ? 'q-pos' : 'q-neg' }, grp);
    var t = el('text', { y: r * 0.42, 'text-anchor': 'middle', 'class': 'q-sign', style: 'font-size:' + Math.round(r * 1.5) + 'px' }, grp); t.textContent = sign > 0 ? '+' : '−';
    return grp;
  }

  /* ---------- reading modes ---------- */
  var body = document.body;
  var modeBtns = document.querySelectorAll('.modes button[data-mode]'), modeNote = document.querySelector('.modes-note');
  var NOTES = {
    show: 'Just show me: the questions, the figures and the one-line answers; the explanations are folded away.',
    teach: 'Teach me: everything at the main level. The “Go deeper” and “The mathematics” panels stay closed until you open them.',
    equations: 'Equations: every “Go deeper” panel and every “The mathematics of this module” panel below is now open and outlined in cyan. <a href="#m00-maths">Jump to the first one</a>.'
  };
  function setMode(m, save) {
    body.setAttribute('data-mode', m);
    Array.prototype.forEach.call(modeBtns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    Array.prototype.forEach.call(document.querySelectorAll('details.deeper'), function (d) { if (m === 'equations') d.open = true; else if (save) d.open = false; });
    if (modeNote) modeNote.innerHTML = NOTES[m] || '';
    if (save) store('learn.mode', m);
  }
  Array.prototype.forEach.call(modeBtns, function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode'), true); }); });
  setMode(store('learn.mode') || 'teach', false);

  /* ---------- the rail: a cell that charges as you read ---------- */
  var rail = document.getElementById('railCell');
  if (rail) {
    var fill = rail.querySelector('.rail-fill-rect'), pct = rail.querySelector('.pct');
    var labs = rail.querySelectorAll('.lab[data-act]');
    S.onScroll(function (p, current) {
      var h = 150 * p; fill.setAttribute('y', String(190 - h)); fill.setAttribute('height', String(h));
      pct.textContent = Math.round(p * 100) + '%';
      rail.classList.toggle('show', p > 0.02);
      var sec = current ? document.getElementById(current) : null, act = sec ? sec.getAttribute('data-act') : null;
      Array.prototype.forEach.call(labs, function (l) { l.classList.toggle('lit', l.getAttribute('data-act') === act); });
    });
  }

  /* ---------- your cell ---------- */
  var cell = store('learn.cell') || { neg: 'gr', pos: 'lco' };
  function rung(key) { for (var i = 0; i < P.data.ladder.length; i++) if (P.data.ladder[i].key === key) return P.data.ladder[i]; return null; }
  if (!rung(cell.neg) || !rung(cell.pos)) cell = { neg: 'gr', pos: 'lco' };
  var cellListeners = [];
  function setCell(neg, pos) { cell = { neg: neg, pos: pos }; store('learn.cell', cell); cellListeners.forEach(function (f) { f(cell); }); }

  /* ---------- particle flow along an SVG path ---------- */
  function flow(svg, path, opts) {
    var n = opts.n || 8, cls = opts.cls || 'e-dot', r = opts.r || 3, speed = opts.speed || 40; // px per second
    var L = path.getTotalLength(), dots = [], running = false, raf = 0, t0 = null;
    var g = el('g', { 'class': opts.animOnly === false ? '' : 'anim-only' }, opts.parent || svg);
    for (var i = 0; i < n; i++) { var d = el('circle', { 'class': cls, r: r }, g); dots.push({ e: d, s: (i / n) * L }); }
    function place(dt) {
      for (var i = 0; i < dots.length; i++) {
        dots[i].s = ((dots[i].s + speed * dt) % L + L) % L; var p = path.getPointAtLength(dots[i].s);
        dots[i].e.setAttribute('cx', p.x); dots[i].e.setAttribute('cy', p.y);
      }
    }
    function step(ts) { if (!running) return; var dt = t0 === null ? 0 : Math.min(0.05, (ts - t0) / 1000); t0 = ts; place(dt); raf = requestAnimationFrame(step); }
    place(0);
    return {
      start: function () { if (!motion || running) return; running = true; t0 = null; raf = requestAnimationFrame(step); },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      advance: place, setSpeed: function (v) { speed = v; }, show: function (v) { g.style.display = v ? '' : 'none'; }, group: g
    };
  }

  /* ---------- figure registry ---------- */
  var figs = {};
  var loops = []; // {fig, loop}
  function register(id, fn) { figs[id] = fn; }
  function bind(fig, loop) { if (loop) loops.push({ fig: fig, loop: loop }); }

  /* figs-5n.js */
  function plotAxes(g, b, o) { // b = {x0, y0, x1, y1}; o = {xlab, ylab, yt: [values], yf: fmt, ylo, yhi}
    el('line', { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0, stroke: 'var(--line-2)' }, g);
    el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, stroke: 'var(--line-2)' }, g);
    (o.yt || []).forEach(function (v) {
      var yy = b.y0 - (v - o.ylo) / (o.yhi - o.ylo) * (b.y0 - b.y1);
      el('line', { x1: b.x0, y1: yy, x2: b.x1, y2: yy, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g);
      txt(g, b.x0 - 5, yy + 4, o.yf ? o.yf(v) : String(v), '', 'end');
    });
    if (o.xlab) txt(g, b.x1, b.y0 + 16, o.xlab, '', 'end');
    if (o.ylab) txt(g, b.x0 + 4, b.y1 - 6, o.ylab, '', 'start');
  }
  function polyD(xs, ys) { var d = ''; for (var i = 0; i < xs.length; i++) d += (i ? 'L' : 'M') + xs[i].toFixed(1) + ',' + ys[i].toFixed(1); return d; }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function packParticles(w, h, phi, shape, r, seed) {
    function build(gap) {
      var R = rng(seed), list = [], x, y, row, j;
      if (shape === 'disk') {
        var s = 2 * r + gap, dy = s * Math.sqrt(3) / 2; j = Math.min(3, gap * 0.3);
        for (row = 0, y = -dy / 2; y < h + r; row++, y += dy)
          for (x = (row % 2 ? s / 2 : 0) - s; x < w + s; x += s)
            list.push({ k: 'c', x: x + (R() - 0.5) * 2 * j, y: y + (R() - 0.5) * 2 * j, r: r });
      } else {
        var a = 2 * r, b = r / 2, sx = 2 * a + 2 * gap, sy = 2 * b + gap; j = Math.min(4, gap * 0.4);
        for (row = 0, y = gap / 2 + b; y < h + sy; row++, y += sy)
          for (x = (row % 2 ? sx / 2 : 0) - sx; x < w + sx; x += sx)
            list.push({ k: 'p', x: x + (R() - 0.5) * 2 * j, y: y, a: a, b: b });
      }
      return list;
    }
    var lo = 0.4, hi = 60, list = null;
    for (var n = 0; n < 28; n++) { var mid = 0.5 * (lo + hi), L = build(mid), f = solidShare(L, w, h); if (f > phi) lo = mid; else hi = mid; }
    list = build(0.5 * (lo + hi));
    return { list: list, mask: solidMask(list, w, h) };
  }
  function solidMask(list, w, h) {
    var m = new Uint8Array(w * h);
    list.forEach(function (p) {
      var x0, x1, y0, y1, X, Y;
      if (p.k === 'c') { x0 = Math.max(0, Math.floor(p.x - p.r)); x1 = Math.min(w - 1, Math.ceil(p.x + p.r)); y0 = Math.max(0, Math.floor(p.y - p.r)); y1 = Math.min(h - 1, Math.ceil(p.y + p.r));
        for (Y = y0; Y <= y1; Y++) for (X = x0; X <= x1; X++) { var dx = X + 0.5 - p.x, dy = Y + 0.5 - p.y; if (dx * dx + dy * dy <= p.r * p.r) m[Y * w + X] = 1; } }
      else { x0 = Math.max(0, Math.floor(p.x - p.a)); x1 = Math.min(w - 1, Math.ceil(p.x + p.a)); y0 = Math.max(0, Math.floor(p.y - p.b)); y1 = Math.min(h - 1, Math.ceil(p.y + p.b));
        for (Y = y0; Y <= y1; Y++) for (X = x0; X <= x1; X++) { if (Math.abs(X + 0.5 - p.x) <= p.a && Math.abs(Y + 0.5 - p.y) <= p.b) m[Y * w + X] = 1; } }
    });
    return m;
  }
  function solidShare(list, w, h) { var m = solidMask(list, w, h), s = 0; for (var i = 0; i < m.length; i++) s += m[i]; return s / m.length; }
  function shortestPore(mask, w, h) {
    var N = w * h, dist = new Float64Array(N), prev = new Int32Array(N), hd = [], hi = [];
    for (var i = 0; i < N; i++) { dist[i] = Infinity; prev[i] = -1; }
    function push(d, k) { hd.push(d); hi.push(k); var c = hd.length - 1; while (c > 0) { var p = (c - 1) >> 1; if (hd[p] <= hd[c]) break; var t = hd[p]; hd[p] = hd[c]; hd[c] = t; t = hi[p]; hi[p] = hi[c]; hi[c] = t; c = p; } }
    function pop() { var d = hd[0], k = hi[0], ld = hd.pop(), lk = hi.pop(); if (hd.length) { hd[0] = ld; hi[0] = lk; var c = 0; for (;;) { var l = 2 * c + 1, r = l + 1, m = c; if (l < hd.length && hd[l] < hd[m]) m = l; if (r < hd.length && hd[r] < hd[m]) m = r; if (m === c) break; var t = hd[m]; hd[m] = hd[c]; hd[c] = t; t = hi[m]; hi[m] = hi[c]; hi[c] = t; c = m; } } return [d, k]; }
    for (var x = 0; x < w; x++) if (!mask[x]) { dist[x] = 0.5; push(0.5, x); }
    var end = -1, S2 = Math.SQRT2;
    while (hd.length) {
      var top = pop(), d = top[0], k = top[1]; if (d > dist[k]) continue;
      var X = k % w, Y = (k - X) / w; if (Y === h - 1) { end = k; break; }
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; var nx = X + dx, ny = Y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var nk = ny * w + nx; if (mask[nk]) continue;
        if (dx && dy && (mask[Y * w + nx] || mask[ny * w + X])) continue;
        var nd = d + (dx && dy ? S2 : 1); if (nd < dist[nk]) { dist[nk] = nd; prev[nk] = k; push(nd, nk); }
      }
    }
    if (end < 0) return null;
    var path = [], c = end; while (c >= 0) { path.push([c % w + 0.5, Math.floor(c / w) + 0.5]); c = prev[c]; }
    path.reverse(); path.unshift([path[0][0], 0]); path.push([path[path.length - 1][0], h]);
    return { len: dist[end] + 0.5, path: path };
  }
  var NM_FITS = [
    { name: 'graphite', f: 4.7, p: 1.1, lo: 0.30, hi: 0.70, col: 'var(--cyan)' },
    { name: 'LiFePO₄, 5 % carbon', f: 3.1, p: 1.6, lo: 0.25, hi: 0.75, col: 'var(--heat)' },
    { name: 'LiFePO₄, 15 % carbon', f: 3.0, p: 1.2, lo: 0.25, hi: 0.75, col: 'var(--field)' }
  ];
  register('f5-8p', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.eps'), sv = fig.querySelector('.eps-val'), sb = fig.querySelectorAll('button[data-shape]');
    var B = { x: 30, y: 46, w: 180, h: 180 }, shape = 'disk', eps = 0.30;
    var defs = el('defs', {}, svg), cp = el('clipPath', { id: 'f58p-clip' }, defs); el('rect', { x: B.x, y: B.y, width: B.w, height: B.h }, cp);
    txt(g, B.x + B.w / 2, B.y - 22, 'a slice through the coating', 'strong', 'middle');
    txt(g, B.x + B.w / 2, B.y - 7, 'separator side', '', 'middle'); txt(g, B.x + B.w / 2, B.y + B.h + 15, 'current collector side', '', 'middle');
    el('rect', { x: B.x, y: B.y, width: B.w, height: B.h, fill: 'var(--cyan)', 'fill-opacity': '.20' }, g);
    var pg = el('g', { 'clip-path': 'url(#f58p-clip)' }, g);
    el('rect', { x: B.x, y: B.y, width: B.w, height: B.h, fill: 'none', stroke: 'var(--line-2)' }, g);
    var route = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
    var xd = B.x + B.w + 14;
    el('line', { x1: xd, y1: B.y, x2: xd, y2: B.y + B.h, stroke: 'var(--muted)', 'stroke-dasharray': '4 4' }, g);
    el('line', { x1: xd - 4, y1: B.y, x2: xd + 4, y2: B.y, stroke: 'var(--muted)' }, g); el('line', { x1: xd - 4, y1: B.y + B.h, x2: xd + 4, y2: B.y + B.h, stroke: 'var(--muted)' }, g);
    txt(g, xd + 6, B.y + B.h / 2 + 4, 'd', '', 'start');
    // right: what is left of the conductivity
    var P = { x0: 312, y0: 226, x1: 506, y1: 46 }, XP = function (e) { return P.x0 + (e - 0.2) / 0.6 * (P.x1 - P.x0); }, YP = function (k) { return P.y0 - k / 0.6 * (P.y0 - P.y1); };
    el('rect', { x: XP(0.30), y: P.y1, width: XP(0.35) - XP(0.30), height: P.y0 - P.y1, fill: 'var(--muted)', 'fill-opacity': '.14' }, g);
    plotAxes(g, P, { yt: [0.2, 0.4, 0.6], ylo: 0, yhi: 0.6, yf: function (v) { return v.toFixed(1); } });
    txt(g, P.x0 - 34, P.y1 - 24, 'conductivity left in the pores, κ_eff / κ', '', 'start');
    [0.2, 0.4, 0.6, 0.8].forEach(function (e) { txt(g, XP(e), P.y0 + 15, e.toFixed(1), '', 'middle'); });
    txt(g, P.x1, P.y0 + 30, 'porosity ε →', '', 'end');
    txt(g, XP(0.325), P.y1 + 12, 'typical', '', 'middle');
    var eb = []; for (var e = 0.2; e <= 0.711; e += 0.01) eb.push(e);
    el('path', { d: polyD(eb.map(XP), eb.map(function (e) { return YP(Math.pow(e, 1.5)); })), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.8, 'stroke-dasharray': '5 4' }, g);
    txt(g, XP(0.47), YP(0.40), 'estimate, ε^1.5', '', 'end');
    NM_FITS.forEach(function (c) { var es = []; for (var e = c.lo; e <= c.hi + 1e-9; e += 0.01) es.push(e); el('path', { d: polyD(es.map(XP), es.map(function (e) { return YP(Math.pow(e, c.p) / c.f); })), fill: 'none', stroke: c.col, 'stroke-width': 2.2 }, g); });
    var mk = el('line', { y1: P.y0, y2: P.y1, stroke: 'var(--text)', 'stroke-opacity': '.5' }, g);
    var dots = [{ col: 'var(--muted)' }].concat(NM_FITS).map(function (c) { return el('circle', { r: 4, fill: c.col, stroke: 'var(--bg)', 'stroke-width': 1 }, g); });
    badge(g, B.x - 14, B.y + 10, 1); badge(g, xd + 6, B.y + 16, 2); badge(g, XP(0.52), P.y1 + 12, 3);
    var cache = {};
    function draw() {
      eps = +sl.value / 100; setSvgText(sv, eps.toFixed(2));
      var key = shape + eps, pk = cache[key] || (cache[key] = (function () { var q = packParticles(B.w, B.h, 1 - eps, shape, 9, shape === 'disk' ? 7 : 11); q.route = shortestPore(q.mask, B.w, B.h); return q; })());
      while (pg.firstChild) pg.removeChild(pg.firstChild);
      pk.list.forEach(function (p) {
        if (p.k === 'c') el('circle', { cx: B.x + p.x, cy: B.y + p.y, r: p.r, fill: 'var(--amber-2)', 'fill-opacity': '.55', stroke: 'var(--amber)', 'stroke-width': 1 }, pg);
        else el('rect', { x: B.x + p.x - p.a, y: B.y + p.y - p.b, width: 2 * p.a, height: 2 * p.b, rx: 2, fill: 'var(--amber-2)', 'fill-opacity': '.55', stroke: 'var(--amber)', 'stroke-width': 1 }, pg);
      });
      var sol = 0; for (var i = 0; i < pk.mask.length; i++) sol += pk.mask[i]; var drawn = 1 - sol / pk.mask.length;
      var tg = pk.route ? pk.route.len / B.h : NaN;
      if (pk.route) { var pts = pk.route.path.filter(function (q, i, a) { return i % 3 === 0 || i === a.length - 1; }); route.setAttribute('d', polyD(pts.map(function (q) { return B.x + q[0]; }), pts.map(function (q) { return B.y + q[1]; }))); }
      mk.setAttribute('x1', XP(eps)); mk.setAttribute('x2', XP(eps));
      var vals = [Math.pow(eps, 1.5)].concat(NM_FITS.map(function (c) { return eps >= c.lo - 1e-9 && eps <= c.hi + 1e-9 ? Math.pow(eps, c.p) / c.f : NaN; }));
      dots.forEach(function (d, i) { var ok = isFinite(vals[i]) && vals[i] <= 0.6; d.style.display = ok ? '' : 'none'; if (ok) { d.setAttribute('cx', XP(eps)); d.setAttribute('cy', YP(vals[i])); } });
      var fmt = function (v) { return isFinite(v) ? v.toFixed(2) : 'not measured'; };
      read.innerHTML = 'Porosity <b>ε = ' + eps.toFixed(2) + '</b> (pores drawn: ' + Math.round(drawn * 100) + ' % of the slice). In this sketch the shortest way through the pores is <b>' + tg.toFixed(2) + ' × d</b>, a geometric tortuosity of a 2-D drawing. Conductivity left in the pores, κ<sub>eff</sub>/κ: estimate ε<sup>1.5</sup> = <b>' + vals[0].toFixed(2) + '</b>; measured graphite ' + fmt(vals[1]) + ', LiFePO₄ with 5 % carbon ' + fmt(vals[2]) + ', with 15 % carbon ' + fmt(vals[3]) + '.';
    }
    on(sl, 'input', draw);
    Array.prototype.forEach.call(sb, function (b) { on(b, 'click', function () { shape = b.getAttribute('data-shape'); Array.prototype.forEach.call(sb, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); draw(); }); });
    draw();
    steps(fig, [
      { text: 'A slice through a coating: particles (amber) and the pores between them, filled with electrolyte (blue). The <b>porosity</b> ε is the share of the coating’s volume that is pore. Here it is drawn as the share of the slice’s area.' },
      { text: 'An ion cannot cross in a straight line, the dashed distance d. The white line is the shortest way through the pores of this sketch. Its length divided by d is a geometric <b>tortuosity</b>. Switch to flat plates, lying as graphite flakes do, and watch the way round grow.', on: function () { } },
      { text: 'What the ions feel is the conductivity left in the pores, κ<sub>eff</sub>/κ = ε/τ. The dashed curve is the usual estimate, ε<sup>1.5</sup>. The solid curves are fits to impedance measurements on real electrodes; all lie well below it.' }
    ]);
  });
  register('f5-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cb = fig.querySelectorAll('button[data-case]');
    var xf = 40, xsep = 116, ytop = 30, ybot = 136, PXUM = 1.9; // electrode thickness drawn to scale, 1.9 px per µm
    el('rect', { x: 16, y: ytop, width: xf - 16, height: ybot - ytop, rx: 2, fill: 'var(--metal)' }, g);
    el('rect', { x: xf, y: ytop, width: xsep - xf, height: ybot - ytop, fill: 'var(--cyan)', 'fill-opacity': '.10', stroke: 'var(--line-2)' }, g);
    txt(g, 28, 20, 'Li foil', '', 'middle'); txt(g, 78, 20, 'separator', '', 'middle');
    var defs = el('defs', {}, svg), cp = el('clipPath', { id: 'f58-clip' }, defs), cpr = el('rect', { x: xsep, y: ytop, height: ybot - ytop }, cp);
    var cg = el('g', {}, g), pg = el('g', { 'clip-path': 'url(#f58-clip)' }, g), og = el('g', {}, g);
    var parts = [], NC = 8, xc = 306;
    var ions = []; for (var i = 0; i < 10; i++) ions.push({ s: i / 10, y: ytop + 10 + (i * 41 % (ybot - ytop - 20)), e: el('circle', { r: 3.2, 'class': 'ion' }, g) });
    // salt concentration strip
    var sb = { x0: xf, y0: 250, y1: 186 }, cmax = 1.7;
    var YC = function (v) { return sb.y0 - v / cmax * (sb.y0 - sb.y1); };
    el('line', { x1: sb.x0, y1: sb.y0, x2: sb.x0, y2: sb.y1, stroke: 'var(--line-2)' }, g);
    el('line', { x1: xsep, x2: xsep, y1: sb.y0, y2: sb.y1, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
    txt(g, sb.x0 + 34, sb.y1 - 8, 'salt concentration in the electrolyte', '', 'start');
    txt(g, sb.x0 - 4, YC(1) + 4, '1', '', 'end'); txt(g, sb.x0 - 4, sb.y0 + 4, '0', '', 'end');
    var cl = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.2 }, g), cf = el('path', { fill: 'var(--cyan)', 'fill-opacity': '.12' }, g);
    // utilization meter
    var ub = { x0: xsep, x1: 486, y: 272, h: 14 };
    el('rect', { x: ub.x0, y: ub.y, width: ub.x1 - ub.x0, height: ub.h, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    var uf = el('rect', { x: ub.x0, y: ub.y, height: ub.h, rx: 3, fill: 'var(--amber)' }, g), um = el('line', { y1: ub.y - 4, y2: ub.y + ub.h + 4, stroke: 'var(--heat)', 'stroke-width': 2 }, g);
    txt(g, ub.x0 - 6, ub.y + 11, 'material used', '', 'end'); var ul = txt(g, 0, ub.y + ub.h + 16, '', 'heat', 'middle');
    badge(g, 28, ybot + 18, 1); badge(g, xsep - 14, YC(0.35), 3); badge(g, ub.x1 + 14, ub.y + 7, 4); var b2 = el('g', {}, g);
    // thickness L at porosity eps holds the same solid volume: L(1 - eps) = 100 µm × 0.70
    var CASES = { a: { I: 10, eps: 0.30, L: 100, uEnd: 0.84, k: 1.7, dep: 0.95, rise: 0.5 }, b: { I: 20, eps: 0.30, L: 100, uEnd: 0.30, k: 4.5, dep: 0.98, rise: 0.9 }, c: { I: 10, eps: 0.60, L: 175, uEnd: 0.97, k: 0.7, dep: 0.5, rise: 0.3 } };
    var cs = CASES.a, s = 0.55, built = null;
    function build() {
      var Lpx = Math.round(cs.L * PXUM), key = cs.eps + '/' + cs.L; xc = xsep + Lpx;
      if (built === key) return; built = key;
      cpr.setAttribute('width', Lpx);
      while (cg.firstChild) cg.removeChild(cg.firstChild); while (pg.firstChild) pg.removeChild(pg.firstChild); while (og.firstChild) og.removeChild(og.firstChild); while (b2.firstChild) b2.removeChild(b2.firstChild);
      el('rect', { x: xsep, y: ytop, width: Lpx, height: ybot - ytop, fill: 'var(--cyan)', 'fill-opacity': '.20' }, cg);
      el('rect', { x: xsep, y: ytop, width: Lpx, height: ybot - ytop, fill: 'none', stroke: 'var(--line-2)' }, og);
      el('rect', { x: xc, y: ytop, width: 14, height: ybot - ytop, rx: 2, fill: 'var(--metal)' }, og);
      txt(og, xsep + Lpx / 2, 20, 'positive electrode', 'strong', 'middle'); txt(og, xc + 7, 20, 'collector', '', 'middle');
      var yd = ybot + 10; el('line', { x1: xsep, y1: yd, x2: xc, y2: yd, stroke: 'var(--muted)' }, og);
      el('line', { x1: xsep, y1: yd - 4, x2: xsep, y2: yd + 4, stroke: 'var(--muted)' }, og); el('line', { x1: xc, y1: yd - 4, x2: xc, y2: yd + 4, stroke: 'var(--muted)' }, og);
      txt(og, xsep + Lpx / 2, yd + 15, cs.L + ' µm, porosity ' + cs.eps.toFixed(2), '', 'middle');
      el('line', { x1: sb.x0, y1: sb.y0, x2: xc, y2: sb.y0, stroke: 'var(--line-2)' }, og);
      el('line', { x1: sb.x0, x2: xc, y1: YC(1), y2: YC(1), stroke: 'var(--muted)', 'stroke-dasharray': '2 5' }, og);
      txt(og, xc, YC(1) - 5, 'at the start', '', 'end');
      badge(b2, xc - 14, ytop + 12, 2);
      var pk = packParticles(Lpx, ybot - ytop, 1 - cs.eps, 'disk', 7, 5);
      parts = pk.list.map(function (p) {
        var cx = xsep + p.x, cy = ytop + p.y, c = Math.max(0, Math.min(NC - 1, Math.floor(p.x / Lpx * NC)));
        el('circle', { cx: cx, cy: cy, r: p.r, fill: 'var(--panel-2)', stroke: 'var(--amber)', 'stroke-opacity': '.6' }, pg);
        return { c: c, f: el('circle', { cx: cx, cy: cy, r: p.r, fill: 'var(--amber-2)', 'fill-opacity': '0' }, pg), ring: el('circle', { cx: cx, cy: cy, r: p.r + 2.5, fill: 'none', stroke: 'var(--cation)', 'stroke-width': 1.6, 'stroke-opacity': '0' }, pg) };
      });
    }
    function profile(U) { // local utilization, front-weighted, mean U (schematic)
      var w = []; for (var j = 0; j < NC; j++) w.push(Math.exp(-cs.k * (j + 0.5) / NC));
      var lo = 0, hi = 50; for (var n = 0; n < 50; n++) { var lam = 0.5 * (lo + hi), m = 0; w.forEach(function (x) { m += Math.min(1, lam * x); }); if (m / NC > U) hi = lam; else lo = lam; }
      return w.map(function (x) { return Math.min(1, lo * x); });
    }
    function place() {
      build();
      var sc = Math.min(1, s), U = sc * cs.uEnd, u = profile(U), u2 = profile(Math.min(cs.uEnd, U + 0.01)), rate = u2.map(function (x, j) { return x - u[j]; }), rmax = Math.max.apply(null, rate) || 1;
      parts.forEach(function (p) { p.f.setAttribute('fill-opacity', (0.05 + 0.9 * u[p.c]).toFixed(3)); p.ring.setAttribute('stroke-opacity', (0.9 * rate[p.c] / rmax).toFixed(3)); });
      // concentration: rises at the foil, falls across the electrode, flat at the collector (no flux there)
      var D = cs.dep * (1 - Math.exp(-sc / 0.12)), xs = [], vs = [];
      for (var i = 0; i <= 120; i++) { var x = sb.x0 + i / 120 * (xc - sb.x0), v;
        if (x <= xsep) v = 1 + cs.rise * D / cs.dep * (1 - (x - sb.x0) / (xsep - sb.x0)) * 0.9;
        else { var xi = (x - xsep) / (xc - xsep); v = 1 - D * (1 - (1 - xi) * (1 - xi)); }
        xs.push(x); vs.push(YC(Math.max(0.02, v))); }
      cl.setAttribute('d', polyD(xs, vs)); cf.setAttribute('d', polyD(xs, vs) + ' L' + xc + ',' + sb.y0 + ' L' + sb.x0 + ',' + sb.y0 + ' Z');
      uf.setAttribute('width', (ub.x1 - ub.x0) * U);
      var xe = ub.x0 + (ub.x1 - ub.x0) * cs.uEnd; um.setAttribute('x1', xe); um.setAttribute('x2', xe); ul.setAttribute('x', Math.min(ub.x1 - 40, Math.max(ub.x0 + 50, xe))); setSvgText(ul, 'cut-off at ' + Math.round(cs.uEnd * 100) + ' %');
      var front = 0, tw = 0; rate.forEach(function (r, j) { front += r * j; tw += r; }); fig._front = xsep + ((tw ? front / tw : 0) + 0.5) / NC * (xc - xsep);
      read.innerHTML = 'Discharge at <b>' + cs.I + ' A/m²</b>, electrode <b>' + cs.L + ' µm</b> thick with porosity <b>' + cs.eps.toFixed(2) + '</b>: ' + Math.round(U * 100) + ' % of the positive material used so far. The rings mark where the reaction is fastest now. This case reaches the cut-off at about <b>' + Math.round(cs.uEnd * 100) + ' %</b> (the published model); the profiles are drawn, not computed.';
    }
    function flowIons(dt) { var xe = fig._front || 200; ions.forEach(function (o) { o.s += dt * 0.35; if (o.s > 1) o.s -= 1; o.e.setAttribute('cx', lerp(xf + 2, xe, o.s)); o.e.setAttribute('cy', o.y); o.e.style.opacity = s >= 1 ? 0 : 1; }); }
    Array.prototype.forEach.call(cb, function (b) { on(b, 'click', function () { cs = CASES[b.getAttribute('data-case')]; Array.prototype.forEach.call(cb, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); s = motion ? 0 : 1; place(); flowIons(0); }); });
    place(); flowIons(0);
    steps(fig, [
      { text: 'The modelled cell: a <b>lithium foil</b>, a polymer electrolyte as separator, and a <b>composite</b> positive electrode of TiS₂ particles packed in the same electrolyte, 100 µm thick with porosity 0.30. Each ion must travel into the pores to reach a particle.' },
      { text: 'Early on the reaction crowds near the separator. The particles carry electrons about 10⁵ times better than the electrolyte carries ions, so the short ionic path wins. As the front particles fill, the reaction moves deeper.' },
      { text: 'The salt piles up near the foil and is drained from the back of the electrode. There the electrolyte runs short of ions, and the particles at the back are hardly used.' },
      { text: 'So the cut-off comes early: at 20 A/m² after about <b>30 %</b> of the material is used; at 10 A/m², 84 %. The same amount of material spread more openly, porosity 0.60 and so 175 µm thick, lifts that to 97 %.' }
    ]);
    var loop = anim(fig, function (dt) { flowIons(dt); if (dt === 0) return; s += dt / 8; if (s > 1.25) s = 0; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
    if (!motion) { s = 1; place(); flowIons(0); }
  });
  /* figs-8.js */
  register('f8-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), bC = fig.querySelector('.cut-carbon'), bP = fig.querySelector('.block-pores'), bR = fig.querySelector('.reset');
    var xc = 40, xs = 470, top = 40, bot = 250, cols = 5, rows = 4;
    el('rect', { x: xc - 14, y: top - 6, width: 14, height: bot - top + 12, fill: 'var(--metal)' }, g); txt(g, xc - 7, bot + 24, 'Al foil', 'strong', 'middle');
    el('rect', { x: xs, y: top - 6, width: 26, height: bot - top + 12, fill: 'var(--cyan)', 'fill-opacity': '.25', stroke: 'var(--cyan)', 'stroke-opacity': '.5' }, g); txt(g, xs + 13, bot + 24, 'separator', 'cyan', 'middle');
    var pore = el('rect', { x: xc, y: top - 6, width: xs - xc, height: bot - top + 12, fill: 'var(--cyan)', 'fill-opacity': '.12' }, g);
    txt(g, (xc + xs) / 2, top - 16, 'one coating, about 30 % of it pores filled with electrolyte', '', 'middle');
    var P = [], dx = (xs - xc - 40) / (cols - 1), dy = (bot - top - 40) / (rows - 1);
    for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) P.push({ c: c, r: r, x: xc + 22 + c * dx + (r % 2 ? 10 : -6), y: top + 20 + r * dy + (c % 2 ? 6 : -4), R: 15 + ((c * 7 + r * 3) % 5) });
    // carbon links: each particle to its neighbours and the first column to the foil
    var links = [];
    P.forEach(function (a, i) { P.forEach(function (b, j) { if (j > i && Math.abs(a.c - b.c) + Math.abs(a.r - b.r) === 1) links.push({ a: i, b: j }); }); if (a.c === 0) links.push({ a: i, b: -1 }); });
    var lg = el('g', {}, g);
    links.forEach(function (L) { var a = P[L.a], bx = L.b < 0 ? xc : P[L.b].x, by = L.b < 0 ? a.y : P[L.b].y; L.e = el('line', { x1: a.x, y1: a.y, x2: bx, y2: by, stroke: 'var(--cyan)', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-opacity': '.9' }, lg); L.on = true; });
    // ion access: each particle has a pore route to the separator unless blocked
    P.forEach(function (p) { p.wet = true; p.e = el('circle', { cx: p.x, cy: p.y, r: p.R, 'class': 'ptc' }, g); p.mk = el('text', { x: p.x, y: p.y + 4, 'text-anchor': 'middle', 'class': 'lbl strong' }, g); });
    var info = txt(g, (xc + xs) / 2, bot + 24, '', 'amber', 'middle');
    badge(g, xc - 7, top - 18, 1); badge(g, xs + 13, top - 18, 2); badge(g, (xc + xs) / 2 + 150, bot + 18, 3);
    function solve() {
      // electrons: breadth-first from the foil along intact carbon links
      var reach = P.map(function () { return false; }), q = [];
      links.forEach(function (L) { if (L.on && L.b < 0) { reach[L.a] = true; q.push(L.a); } });
      while (q.length) { var i = q.shift(); links.forEach(function (L) { if (!L.on || L.b < 0) return; var j = L.a === i ? L.b : L.b === i ? L.a : -1; if (j >= 0 && !reach[j]) { reach[j] = true; q.push(j); } }); }
      var n = 0;
      P.forEach(function (p, i) { p.ok = reach[i] && p.wet; if (p.ok) n++; p.e.setAttribute('class', 'ptc ' + (p.ok ? 'on' : 'dead')); setSvgText(p.mk, p.ok ? '' : (!reach[i] && !p.wet ? 'e⁻, Li⁺' : !reach[i] ? 'no e⁻' : 'no Li⁺')); });
      return n;
    }
    function render() {
      var n = solve();
      setSvgText(info, n + ' of ' + P.length + ' particles can work');
      read.innerHTML = 'A particle works only if <b>electrons</b> can reach it through the carbon network from the foil and <b>ions</b> can reach it through electrolyte-filled pores from the separator. Here <b>' + n + ' of ' + P.length + '</b> can; the rest are dead weight, mass and volume that store nothing.';
    }
    var rng = 7;
    function rand() { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; }
    on(bC, 'click', function () { var live = links.filter(function (L) { return L.on; }); for (var k = 0; k < 4 && live.length; k++) { var L = live.splice((rand() * live.length) | 0, 1)[0]; L.on = false; L.e.setAttribute('stroke-opacity', '.12'); L.e.setAttribute('stroke-dasharray', '2 4'); } render(); });
    on(bP, 'click', function () { var wet = P.filter(function (p) { return p.wet; }); for (var k = 0; k < 2 && wet.length; k++) { var p = wet.splice((rand() * wet.length) | 0, 1)[0]; p.wet = false; } render(); });
    on(bR, 'click', function () { links.forEach(function (L) { L.on = true; L.e.setAttribute('stroke-opacity', '.9'); L.e.removeAttribute('stroke-dasharray'); }); P.forEach(function (p) { p.wet = true; }); render(); });
    steps(fig, [
      { text: 'The <b>electron road</b>: a network of conductive carbon (teal) touching every particle and running back to the aluminium foil. Press <b>Break carbon contacts</b> a few times.' },
      { text: 'The <b>ion road</b>: the pores between particles are filled with electrolyte that connects to the separator. Press <b>Seal some pores</b>: a particle walled off by binder gets no ions.' },
      { text: 'A particle stores lithium only where <b>both roads arrive</b>. Every dark particle is mass and volume that the cell carries for nothing. The count is computed from the network you have left.' }
    ]);
    render();
  });
  register('f8-2', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), rs = fig.querySelector('.ratio'), rv = fig.querySelector('.ratio-val'), ns = fig.querySelector('.nu'), nv = fig.querySelector('.nu-val');
    var x0 = 70, x1 = 460, y0 = 270, y1 = 130;
    // the electrode strip, shaded by the local reaction rate
    var cells = [], N = 40, sy = 46, sh = 50;
    el('rect', { x: x0 - 16, y: sy - 4, width: 14, height: sh + 8, fill: 'var(--metal)' }, g); txt(g, x0 - 9, sy - 10, 'collector', '', 'middle');
    el('rect', { x: x1 + 2, y: sy - 4, width: 14, height: sh + 8, fill: 'var(--cyan)', 'fill-opacity': '.3' }, g); txt(g, x1 + 9, sy - 10, 'separator', 'cyan', 'middle');
    for (var i = 0; i < N; i++) cells.push(el('rect', { x: x0 + i * (x1 - x0) / N, y: sy, width: (x1 - x0) / N + 0.5, height: sh, fill: 'var(--amber)' }, g));
    txt(g, (x0 + x1) / 2, sy + sh + 16, 'brighter = more of the reaction happens there', '', 'middle');
    // the profile plot
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    txt(g, x0, y0 + 16, 'collector', '', 'middle'); txt(g, x1, y0 + 16, 'separator', '', 'middle'); txt(g, (x0 + x1) / 2, y0 + 16, 'position across the electrode', '', 'middle');
    txt(g, x0 - 6, y1 + 4, 'local', '', 'end'); txt(g, x0 - 6, y1 + 20, 'rate', '', 'end');
    var avg = el('line', { x1: x0, x2: x1, stroke: 'var(--muted)', 'stroke-dasharray': '4 4' }, g), avgT = txt(g, x1 - 4, 0, 'uniform', '', 'end');
    var prof = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    badge(g, 30, sy + sh / 2, 1); badge(g, 490, y1 + 10, 2);
    function render() {
      var lr = +rs.value / 50 - 2, ratio = Math.pow(10, lr), nu = +ns.value / 10; // ratio = sigma/kappa (matrix over electrolyte)
      setSvgText(rv, ratio >= 1 ? '×' + (ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)) : '÷' + (1 / ratio < 10 ? (1 / ratio).toFixed(1) : Math.round(1 / ratio))); setSvgText(nv, nu.toFixed(1));
      // local rate j ~ (1/kappa) cosh(nu xi) + (1/sigma) cosh(nu (1 - xi)), xi measured from the collector;
      // multiplied by kappa: cosh(nu xi) + (kappa/sigma) cosh(nu (1 - xi)). nu = thickness / reaction depth.
      var f = function (xi) { return Math.cosh(nu * xi) + (1 / ratio) * Math.cosh(nu * (1 - xi)); };
      var pts = [], mean = 0; for (var k = 0; k <= 100; k++) { var v = f(k / 100); pts.push(v); mean += v / 101; }
      var mx = 0; pts = pts.map(function (v) { v /= mean; mx = Math.max(mx, v); return v; });
      var top = Math.max(2, Math.ceil(mx)), Y = function (v) { return y0 - v / top * (y0 - y1); };
      prof.setAttribute('d', pts.map(function (v, k) { return (k ? 'L' : 'M') + (x0 + k / 100 * (x1 - x0)).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' '));
      avg.setAttribute('y1', Y(1)); avg.setAttribute('y2', Y(1)); avgT.setAttribute('y', Y(1) - 5);
      cells.forEach(function (cEl, i) { var v = f((i + 0.5) / N) / mean; cEl.setAttribute('fill-opacity', String(Math.min(1, 0.08 + 0.6 * v / Math.max(1.4, mx)))); });
      var where = ratio > 1.2 ? 'next to the separator, where the ions arrive' : ratio < 0.83 ? 'next to the collector, where the electrons arrive' : 'at both faces, less in the middle';
      read.innerHTML = 'Matrix conductivity ' + (ratio >= 1 ? ratio.toFixed(ratio < 10 ? 1 : 0) + ' times higher than' : (1 / ratio).toFixed(1 / ratio < 10 ? 1 : 0) + ' times lower than') + ' the effective electrolyte conductivity; electrode ' + nu.toFixed(1) + ' reaction depths thick. The reaction crowds <b>' + (nu < 0.6 ? 'nowhere: it is almost uniform' : where) + '</b>; the busiest slice works ' + mx.toFixed(1) + ' times harder than the average.';
    }
    on(rs, 'input', render); on(ns, 'input', render);
    steps(fig, [
      { text: 'The strip is one electrode, from the current collector on the left to the separator on the right. Electrons come in from the left through the solid, ions from the right through the electrolyte in the pores. Where does the reaction happen?' },
      { text: 'Wherever the combined path is cheapest. If the solid conducts far better than the electrolyte, the reaction crowds next to the <b>separator</b>; if the electrolyte is the better conductor, next to the <b>collector</b>. Make the electrode thick compared with its reaction depth and the crowding gets worse: the far side of the coating does little.' }
    ]);
    render();
  });
  register('f8-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), mb = fig.querySelectorAll('button[data-carbon]');
    var parts = [{ x: 130, label: 'one carbon contact' }, { x: 390, label: '' }];
    var R = 70, cy = 120, mode = 'dot', k = 0;
    var defs = svg.querySelector('defs') || el('defs', {}, svg);
    parts.forEach(function (p, i) {
      var id = 'f83c' + i + Math.random().toString(36).slice(2, 6), cp = el('clipPath', { id: id }, defs); el('circle', { cx: p.x, cy: cy, r: R }, cp);
      el('circle', { cx: p.x, cy: cy, r: R, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
      p.lit = el('circle', { cx: i === 0 ? p.x - R : p.x, cy: cy, r: 0, fill: 'var(--amber)', 'fill-opacity': '.85', 'clip-path': 'url(#' + id + ')' }, g);
    });
    // left: one carbon particle touching at the left edge
    el('circle', { cx: 130 - R - 12, cy: cy, r: 14, fill: 'var(--cyan)' }, g); txt(g, 130 - R - 12, cy + 34, 'carbon', 'cyan', 'middle');
    // right: a carbon coating or nothing
    var coat = el('circle', { cx: 390, cy: cy, r: R + 4, fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 6 }, g);
    var tR = txt(g, 390, cy + R + 28, '', 'cyan', 'middle'), tL = txt(g, 130, cy + R + 28, 'carbon at one point', 'cyan', 'middle');
    var pct = [txt(g, 130, cy + 4, '', 'strong', 'middle'), txt(g, 390, cy + 4, '', 'strong', 'middle')];
    badge(g, 130 - R - 12, cy - 26, 1); badge(g, 390 + R + 18, cy - R + 4, 2);
    function render() {
      Array.prototype.forEach.call(mb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-carbon') === mode)); });
      coat.style.display = mode === 'coat' ? '' : 'none'; setSvgText(tR, mode === 'coat' ? 'carbon coating all round' : 'no carbon at all');
      var rL = 2 * R * k, rR = mode === 'coat' ? R * k : 0;
      parts[0].lit.setAttribute('r', rL); parts[1].lit.setAttribute('r', mode === 'coat' ? R : 0);
      if (mode === 'coat') { parts[1].lit.setAttribute('r', R); parts[1].lit.setAttribute('fill-opacity', String(0.15 + 0.7 * Math.min(1, 2 * k))); }
      setSvgText(pct[0], k > 0.02 ? 'reacting' : ''); setSvgText(pct[1], mode === 'coat' ? (k > 0.02 ? 'reacting everywhere' : '') : 'dark');
      read.innerHTML = 'Left: the active material conducts electrons poorly, so it reacts first where it touches the carbon and the reacted zone spreads inward from there. Right: ' + (mode === 'coat' ? 'with a carbon coating every point of the surface is a contact, so the whole particle reacts at once.' : 'with no carbon contact at all, nothing happens: no electrons, no reaction.');
    }
    Array.prototype.forEach.call(mb, function (b) { on(b, 'click', function () { mode = b.getAttribute('data-carbon'); k = 0; render(); }); });
    steps(fig, [
      { text: 'A poorly conducting active material, such as the MnO₂ of an alkaline cell, can only take electrons where it touches the <b>carbon</b>. The reaction starts at that point and spreads from it.' },
      { text: 'LiFePO₄ is also a poor electronic conductor; making it work took a <b>carbon coating</b> and small particles. Switch between the two right-hand particles: no carbon, or carbon all round.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; k += dt / 6; if (k > 1.15) k = 0; render(); }, { autoplay: true, stepDt: 0.6 });
    if (!motion) k = 0.5;
    render(); bind(fig, loop);
  });
  register('f8-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), ss = fig.querySelector('.size'), sv = fig.querySelector('.size-val');
    var bx = 40, by = 40, bw = 200, bh = 170, gx = 280;
    el('rect', { x: bx, y: by, width: bw, height: bh, rx: 6, fill: 'none', stroke: 'var(--line-2)' }, g);
    var box2 = el('rect', { x: gx, y: by, width: bw, height: bh, rx: 6, fill: 'none', stroke: 'var(--line-2)' }, g);
    txt(g, bx + bw / 2, by - 12, 'large particles', 'strong', 'middle'); var t2 = txt(g, gx + bw / 2, by - 12, '', 'strong', 'middle');
    var gL = el('g', {}, g), gS = el('g', {}, g);
    // large: 4 particles of radius 32 packed in the left box
    [[90, 95], [180, 95], [90, 170], [180, 170]].forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 34, fill: 'var(--amber-2)', 'fill-opacity': '.85' }, gL); });
    // bars: volume needed (tap density) and time to empty a particle (L^2/2D)
    var barY = 250, bt = [txt(g, 40, barY - 6, 'time for an ion to cross a particle, t ∝ L²', '', 'start'), txt(g, 40, barY + 42, 'volume the same mass of powder takes up', '', 'start')];
    var b1 = el('rect', { x: 40, y: barY, width: 0, height: 12, fill: 'var(--cyan)' }, g), b2 = el('rect', { x: 40, y: barY + 48, width: 0, height: 12, fill: 'var(--amber)' }, g);
    var r1 = el('rect', { x: 40, y: barY, width: 300, height: 12, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '2 3' }, g);
    el('rect', { x: 40, y: barY + 48, width: 150, height: 12, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '2 3' }, g);
    var v1 = txt(g, 350, barY + 11, '', 'cyan', 'start'), v2 = txt(g, 350, barY + 59, '', 'amber', 'start');
    badge(g, 500, barY + 6, 1); badge(g, 500, barY + 54, 2);
    function render() {
      var f = +ss.value / 100; // size relative to the large particles, 0.1 .. 1
      var kf = 1 / f, ks = Math.abs(kf - Math.round(kf)) < 0.05 ? String(Math.round(kf)) : kf.toFixed(1), kt = kf * kf, kts = kt.toFixed(kt < 10 ? 1 : 0);
      setSvgText(sv, f >= 0.999 ? 'same' : '1/' + ks); setSvgText(t2, f >= 0.999 ? 'same size, coated' : 'particles ' + ks + ' times smaller, coated');
      clear(gS);
      var r = 34 * f;
      // the same mass in more, smaller, coated particles: drawn as a packed region that grows with the coating share (schematic)
      var boxH = bh * (0.55 + 0.45 * Math.min(1, (1 - f) * 1.2));
      el('rect', { x: gx + 6, y: by + bh - boxH + 6, width: bw - 12, height: boxH - 12, rx: 4, fill: 'var(--panel-2)' }, gS);
      var rr = Math.max(3, r), step = 2 * rr + 3 + 2 * Math.max(1, 3 * f), top0 = by + bh - boxH + 6 + rr + 2;
      for (var yy = by + bh - 8 - rr; yy >= top0 - 0.1; yy -= step) for (var xx = gx + 10 + rr; xx <= gx + bw - 10 - rr; xx += step) el('circle', { cx: xx, cy: yy, r: rr, fill: 'var(--amber-2)', 'fill-opacity': '.85', stroke: 'var(--cyan)', 'stroke-width': Math.max(1, 3 * f) }, gS);
      var tRel = f * f, vRel = (boxH / bh) / 0.55;
      b1.setAttribute('width', 300 * tRel); b2.setAttribute('width', Math.min(300, 300 * vRel / 2));
      setSvgText(v1, f >= 0.999 ? '1 (reference)' : '÷' + kts); setSvgText(v2, 'more: lower tap density');
      read.innerHTML = (f >= 0.999 ? 'Particles of the same size, coated, empty in the same time' : 'Particles ' + ks + ' times smaller empty about <b>' + kts + ' times faster</b>') + ' (t ≈ L²/2D), and a coating gives every one an electron contact. The price: the coated powder packs less densely, so the same mass of active material takes more room, and the energy per litre falls. We have no number for how much more room; the lower bar is schematic.';
    }
    on(ss, 'input', render);
    steps(fig, [
      { text: 'Smaller particles: the ion has less far to go. The time to cross a particle scales with the <b>square</b> of its size, so a tenth of the size is about a hundredth of the time.' },
      { text: 'The cost: small, coated particles pack poorly, so the powder has a lower <b>tap density</b> and the electrode stores less energy per litre. Coating every particle evenly also gets harder as they shrink.' }
    ]);
    render();
  });
  register('f8-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var st = [
      { t: 'mix', s: 'slurry', d: 'Active material (about 90 % of the dry mass), conductive carbon and a polymer binder are dispersed in a liquid to make a slurry: water for graphite, the organic solvent NMP for most positive electrodes. NMP is toxic to reproduction, and because it is costly and polluting it is recovered during drying; water-based and solvent-free routes are being developed.' },
      { t: 'coat', s: 'on foil', d: 'The slurry is spread in a thin, even layer on a metal foil, the current collector, in a roll-to-roll process.' },
      { t: 'dry', s: 'pores', d: 'As the solvent evaporates, a porous solid layer is left; drying under vacuum can take 12 to 24 hours at 120 °C, and the evaporated NMP is captured.' },
      { t: 'press', s: 'calender', d: 'The dried electrode is pressed between rollers (calendering) to make its thickness uniform, improve its electronic conductivity and raise its energy density, at the cost of some porosity.' },
      { t: 'cut', s: 'stack, wind', d: 'The rolls are slit and cut; strips are wound with a porous separator into a jelly roll for cylindrical and pouch cells; in pouch cells the electrodes can instead be Z-folded from a continuous sheet or cut into sheets and stacked, and the uncoated tabs are welded together.' },
      { t: 'fill', s: 'liquid in', d: 'The stack goes into its can or pouch, and the electrolyte is injected; a pouch keeps a spare gas bag.' },
      { t: 'form', s: '1st cycles', d: 'Formation: the cell is cycled under precisely defined conditions, for up to a day, to build the SEI (chapter 10); the gas it gives off is let out or cut off with the gas bag.' },
      { t: 'test', s: 'and wait', d: 'Capacity and resistance are measured, and the cell is stored for several days at open circuit to catch any that self-discharge too fast.' }
    ];
    var n = st.length, w = 56, gap = (520 - 24 - n * w) / (n - 1), y = 70;
    var boxes = st.map(function (s, i) {
      var x = 12 + i * (w + gap);
      var r = el('rect', { x: x, y: y, width: w, height: 56, rx: 8, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
      txt(g, x + w / 2, y + 25, s.t, 'strong', 'middle'); txt(g, x + w / 2, y + 41, s.s, '', 'middle');
      if (i < n - 1) arrow(g, x + w + 1, y + 28, x + w + gap - 2, y + 28, '#A3B6B1', 1.2);
      badge(g, x + w / 2, y - 18, i + 1);
      return r;
    });
    txt(g, 12, 34, 'electrode making', 'amber', 'start'); txt(g, 12 + 4 * (w + gap), 34, 'cell assembly', 'cyan', 'start'); txt(g, 12 + 6 * (w + gap), 34, 'cell finishing', 'heat', 'start');
    var token = el('circle', { r: 6, fill: 'var(--amber)' }, g), t = 0;
    var lab = txt(g, 260, 170, '', 'strong', 'middle');
    function show(k) { boxes.forEach(function (b, i) { b.setAttribute('stroke', i === k ? 'var(--amber)' : 'var(--line-2)'); b.setAttribute('stroke-width', i === k ? 2.2 : 1); }); setSvgText(lab, 'step ' + (k + 1) + ' of ' + n + ': ' + st[k].t + ' (' + st[k].s + ')'); }
    var S = steps(fig, st.map(function (s, i) { return { text: s.d, on: function () { show(i); } }; }));
    var loop = anim(fig, function (dt) { if (dt === 0) return; t = (t + dt / 16) % 1; var u = t * (n - 1), i = Math.floor(u), f = u - i; token.setAttribute('cx', 12 + w / 2 + (i + f) * (w + gap)); token.setAttribute('cy', y + 72); var k = Math.min(n - 1, Math.round(u)); if (S.k !== k) S.go(k); }, { autoplay: false, stepDt: 0.5 });
    token.setAttribute('cx', 12 + w / 2); token.setAttribute('cy', y + 72);
    read.innerHTML = 'The process chain of a lithium-ion cell, in three stages: making the electrodes, assembling the cell, and finishing it. The same chain applies, with variations, to most battery chemistries.';
    bind(fig, loop);
  });

  /* ---------- typeset the dynamic text of every figure card ---------- */
  var mo = ('MutationObserver' in window) ? new MutationObserver(function (recs) {
    recs.forEach(function (r) { Array.prototype.forEach.call(r.addedNodes, function (nd) { if (!nd.closest || !nd.closest('svg')) mathifyNode(nd); }); });
  }) : null;
  Array.prototype.forEach.call(document.querySelectorAll('.fig'), function (fig) {
    if (mo) mo.observe(fig, { childList: true, subtree: true, characterData: false });
  });

  /* ---------- background: slow ions and electrons behind the page ---------- */
  (function background() {
    var cv = document.getElementById('learnBg'); if (!cv) return;
    var coarse = window.matchMedia('(pointer:coarse)').matches, small = window.innerWidth < 760;
    if (!motion || coarse || small) { cv.style.display = 'none'; return; }
    var ctx = cv.getContext('2d'), W, H, ps = [], raf = 0, t0 = null, running = false;
    function size() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    size(); window.addEventListener('resize', size);
    for (var i = 0; i < 34; i++) {
      var ion = i % 5 !== 0; // four cations to one electron
      ps.push({ ion: ion, x: Math.random() * 1600, y: Math.random() * 1000, r: ion ? 2.2 + Math.random() * 2.2 : 1.4 + Math.random(), v: ion ? 6 + Math.random() * 8 : -(14 + Math.random() * 14), ph: Math.random() * 6.28, a: 0.04 + Math.random() * 0.07 });
    }
    function frame(ts) {
      if (!running) return;
      var dt = t0 === null ? 0 : Math.min(0.05, (ts - t0) / 1000); t0 = ts;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i]; p.x += p.v * dt; p.ph += dt * 0.6; var y = p.y + Math.sin(p.ph) * 14;
        if (p.x > W + 20) p.x = -20; if (p.x < -20) p.x = W + 20; if (p.y > H + 20) p.y = Math.random() * H;
        var g = ctx.createRadialGradient(p.x, y, 0, p.x, y, p.r * 4);
        var c = p.ion ? '255,209,102' : '131,219,208';
        g.addColorStop(0, 'rgba(' + c + ',' + p.a + ')'); g.addColorStop(1, 'rgba(' + c + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, y, p.r * 4, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(' + c + ',' + (p.a * 2.4) + ')'; ctx.beginPath(); ctx.arc(p.x, y, p.r, 0, 6.283); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; t0 = null; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    start();
  })();

  /* ---------- boot ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-fig]'), function (fig) {
    var id = fig.getAttribute('data-fig'); if (figs[id]) { if (window.__qaSeed) window.__qaSeed(id); try { figs[id](fig); } catch (e) { if (window.console) console.error('figure ' + id, e); } }
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { loops.forEach(function (l) { if (l.fig === en.target) { en.isIntersecting ? l.loop.start() : l.loop.stop(); } }); });
    }, { rootMargin: '80px 0px' });
    loops.forEach(function (l) { io.observe(l.fig); });
  } else loops.forEach(function (l) { l.loop.start(); });

  /* The "your cell" name wherever it is shown */
  var cellName = document.querySelectorAll('.your-cell-name');
  function names() { var n = rung(cell.neg), p = rung(cell.pos), s = n.name + ' | ' + p.name; Array.prototype.forEach.call(cellName, function (e) { if (e.namespaceURI === NS) setSvgText(e, s); else e.innerHTML = mathifyHtml(s); }); }
  cellListeners.push(names); names();
})();
