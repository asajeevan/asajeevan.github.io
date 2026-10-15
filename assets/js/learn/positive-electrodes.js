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
    el('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: 4, fill: 'rgba(20,23,28,.025)', stroke: 'var(--line)' }, g);
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
  var modeBtns = document.querySelectorAll('.modes button[data-mode]'), modeNotes = document.querySelectorAll('.modes-note');
  var NOTES = {
    show: 'Just show me: the questions, the figures and the one-line answers; the explanations are folded away.',
    teach: 'Teach me: everything at the main level. The “Go deeper” and “The mathematics” panels stay closed until you open them.',
    equations: 'Equations: every “Go deeper” panel and the mathematics of each chapter are now open and outlined in green.' + (document.getElementById('maths') ? ' <a href="#maths">Jump to the mathematics of this chapter</a>.' : '')
  };
  function setMode(m, save) {
    body.setAttribute('data-mode', m);
    Array.prototype.forEach.call(modeBtns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    Array.prototype.forEach.call(document.querySelectorAll('details.deeper'), function (d) { if (m === 'equations') d.open = true; else if (save) d.open = false; });
    Array.prototype.forEach.call(modeNotes, function (n) { n.innerHTML = NOTES[m] || ''; });
    if (save) store('learn.mode', m);
  }
  Array.prototype.forEach.call(modeBtns, function (b) { b.addEventListener('click', function () {
    var m = b.getAttribute('data-mode');
    // the page re-flows when the level changes: cross-fade the two states where the browser can
    if (motion && document.startViewTransition && body.getAttribute('data-mode') !== m) {
      document.documentElement.classList.add('vt-mode');
      var vt = document.startViewTransition(function () { setMode(m, true); });
      vt.finished.then(function () { document.documentElement.classList.remove('vt-mode'); }, function () { document.documentElement.classList.remove('vt-mode'); });
    } else setMode(m, true);
  }); });
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
  /* figs-9p.js */
  var POS = [ // r: 2 good, 1 moderate, 0 poor, -1 not rated (cost: Low = good)
    { n: 'LCO', f: 'LiCoO₂', q: 140, ql: '135–140', qk: 'p', r: { cost: 0, en: 1, th: 0, cy: 2 },
      t: 'The original lithium-ion positive electrode, still in phones and laptops. In practice it gives up only about half its lithium, about 135 to 140 mAh/g; structural degradation at high states of charge limits it to half its theoretical capacity. Ratings: high cost, moderate energy density, poor thermal stability, good cycle life.' , s: 'Frith et al. 2023; Manthiram 2020; Marie and Gifford 2023' },
    { n: 'LMO', f: 'LiMn₂O₄', q: 130, ql: '< 130', qk: 'p', r: { cost: 2, en: 1, th: 2, cy: 0 },
      t: 'A spinel at about 4 V with three-dimensional lithium channels, so it delivers power well; cheap because manganese is cheap. Its practical capacity is below 130 mAh/g, and manganese dissolution poisons the graphite and fades the capacity, worst when hot. Ratings: low cost, moderate energy density, good thermal stability, poor cycle life.', s: 'Manthiram 2020; Marie and Gifford 2023' },
    { n: 'LFP', f: 'LiFePO₄', q: 170, ql: '170*', qk: 't', r: { cost: 2, en: 0, th: 2, cy: 2 },
      t: 'An olivine of iron and phosphate, flat at 3.43 V vs Li. Lower voltage and lower specific capacity than NMC (the bar is the theoretical 170 mAh/g of chapter 4), but a considerably longer cycle and calendar life than most NMC cells; state-of-the-art cells rose from 90 Wh/kg in 2010 to 160 Wh/kg in 2022. Used for grid storage and shorter-range electric cars. Ratings: low cost, low energy density, good thermal stability, good cycle life.', s: 'Safari and Delacourt 2011; Marie and Gifford 2023' },
    { n: 'LMFP', f: 'LiMnₓFe₁₋ₓPO₄', q: 0, ql: '–', qk: 'n', r: { cost: -1, en: -1, th: -1, cy: -1 },
      t: 'LFP with manganese added. Cells reach around 210 to 240 Wh/kg, roughly 40 % more than LFP. Not rated in the source table; capacity not given there.', s: 'Marie and Gifford 2023' },
    { n: 'NMC622', f: 'LiNi₀.₆Mn₀.₂Co₀.₂O₂', q: 178, ql: '178', qk: 'p', r: { cost: 0, en: 2, th: 1, cy: 2 },
      t: 'Widely used in electric cars today. In one study, full cells against graphite gave 178 mAh/g of NMC when charged to 4.4 V and kept 94 % after 300 cycles at 1C, the highest stable specific energy of the three NMCs tested. Ratings: high cost, high energy density, moderate thermal stability, good cycle life.', s: 'Marie and Gifford 2023; Jung et al. 2017' },
    { n: 'NMC811', f: 'LiNi₀.₈Mn₀.₁Co₀.₁O₂', q: 200, ql: '~200', qk: 'p', r: { cost: 0, en: 2, th: 0, cy: 1 },
      t: 'More nickel, less cobalt: about 200 mAh/g. But it releases oxygen and fades sooner: in one study it cycled stably only to 4.0 V against graphite. Ratings: high cost, high energy density, poor thermal stability, moderate cycle life.', s: 'Marie and Gifford 2023; Jung et al. 2017' },
    { n: 'NCA', f: 'LiNi₀.₈Co₀.₁₅Al₀.₀₅O₂', q: 205, ql: '200–210', qk: 'r', r: { cost: 0, en: 2, th: 0, cy: 1 },
      t: 'Aluminium in place of manganese; first deployed in electric cars by Tesla. With NMC, 200 to 210 mAh/g in the 3.0 to 4.3 V window vs Li; its cycling tends to be better than NMC811’s but it holds more cobalt, about 10 wt%. Ratings: high cost, high energy density, poor thermal stability, moderate cycle life.', s: 'Marie and Gifford 2023; Eshetu et al. 2021' },
    { n: 'LNMO', f: 'LiNi₀.₅Mn₁.₅O₄', q: 135, ql: '~135', qk: 'p', r: { cost: -1, en: -1, th: -1, cy: -1 },
      t: 'The high-voltage spinel: about 4.7 V and about 135 mAh/g, cobalt-free. It releases no oxygen up to 5 V, but few electrolytes survive at that voltage. Not rated in the source table.', s: 'Manthiram 2020; Jung et al. 2017' },
    { n: 'LMR-NMC', f: 'Li₁.₂Mn₀.₄₈Ni₀.₁₆Co₀.₁₆O₂', q: 280, ql: '~280', qk: 'p', r: { cost: 1, en: 2, th: 1, cy: 0 },
      t: 'Lithium- and manganese-rich layered oxide, a candidate for the next generation: about 280 mAh/g against about 200 for NMC811, with oxide ions taking part in the redox. Its voltage decays on cycling as manganese migrates. Ratings: moderate cost, high energy density, moderate thermal stability, poor cycle life.', s: 'Manthiram 2020; Marie and Gifford 2023' }
  ];
  var POS_ASP = ['cost', 'en', 'th', 'cy'];
  var POS_HEAD = { cost: ['low', 'cost'], en: ['energy', 'density'], th: ['thermal', 'stability'], cy: ['cycle', 'life'] };
  var NMC_DATA = [ // Jung et al. 2017, Table I: full cells vs graphite, 1C, 25 °C; capacity of 5th and 300th cycle, mAh/g NMC
    { m: 'NMC111', v: 4.2, a: 140.2, b: 130.0, ret: 93 }, { m: 'NMC111', v: 4.4, a: 162.8, b: 153.2, ret: 94 }, { m: 'NMC111', v: 4.6, a: 183.4, b: 77.1, ret: 42 },
    { m: 'NMC622', v: 4.2, a: 155.4, b: 147.3, ret: 95 }, { m: 'NMC622', v: 4.4, a: 177.8, b: 166.8, ret: 94 }, { m: 'NMC622', v: 4.6, a: 203.1, b: 79.9, ret: 39 },
    { m: 'NMC811', v: 4.0, a: 131.9, b: 118.1, ret: 90 }, { m: 'NMC811', v: 4.1, a: 149.3, b: 114.4, ret: 77 }, { m: 'NMC811', v: 4.2, a: 172.5, b: 114.7, ret: 66 }
  ];
  var NMC_COL = { NMC111: 'var(--second)', NMC622: 'var(--accent)', NMC811: 'var(--heat)' };
  function ratingSymbol(g, x, y, r, rad) {
    rad = rad || 8;
    if (r === 2) el('circle', { cx: x, cy: y, r: rad, fill: 'var(--second)' }, g);
    else if (r === 1) { el('circle', { cx: x, cy: y, r: rad, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.6 }, g); el('path', { d: 'M' + x + ',' + (y - rad) + ' A' + rad + ',' + rad + ' 0 0 0 ' + x + ',' + (y + rad) + ' Z', fill: 'var(--accent)' }, g); }
    else if (r === 0) { var d = rad * 0.56; el('circle', { cx: x, cy: y, r: rad, fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.8 }, g); el('path', { d: 'M' + (x - d) + ',' + (y - d) + ' L' + (x + d) + ',' + (y + d) + ' M' + (x + d) + ',' + (y - d) + ' L' + (x - d) + ',' + (y + d), stroke: 'var(--heat)', 'stroke-width': 1.8 }, g); }
    else el('line', { x1: x - 5, x2: x + 5, y1: y, y2: y, stroke: 'var(--muted)', 'stroke-width': 1.6 }, g);
  }
  register('f9-12', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), vb = fig.querySelectorAll('button[data-view]');
    var gC = el('g', {}, svg), gN = el('g', {}, svg), sel = null, nsel = null;
    // ---------- the chemistries ----------
    var rx = 16, cQ = 104, qw = 92, c0 = 300, cw = 58, ry0 = 52, rh = 24;
    txt(gC, rx, 34, 'material', 'strong', 'start');
    txt(gC, cQ, 18, 'typical capacity', 'strong', 'start'); txt(gC, cQ, 35, 'mAh/g', '', 'start');
    POS_ASP.forEach(function (a, j) { var x = c0 + j * cw; txt(gC, x, 18, POS_HEAD[a][0], 'strong', 'middle'); txt(gC, x, 35, POS_HEAD[a][1], 'strong', 'middle'); });
    var rows = [];
    POS.forEach(function (p, i) {
      var y = ry0 + i * rh, row = el('g', { tabindex: 0, role: 'button', 'aria-label': p.n + ', ' + p.f, style: 'cursor:pointer' }, gC);
      var bg = el('rect', { x: 8, y: y - rh / 2 + 1, width: 504, height: rh - 2, rx: 6, fill: i % 2 ? 'transparent' : 'rgba(20,23,28,.03)', stroke: 'var(--accent)', 'stroke-opacity': 0, 'stroke-width': 1.5 }, row);
      txt(row, rx, y + 4, p.n, 'strong', 'start');
      if (p.q) {
        var w = qw * p.q / 300;
        if (p.qk === 't') el('rect', { x: cQ, y: y - 6, width: w, height: 12, rx: 3, fill: 'none', stroke: 'var(--second)', 'stroke-dasharray': '3 2' }, row);
        else el('rect', { x: cQ, y: y - 6, width: w, height: 12, rx: 3, fill: 'var(--second)', 'fill-opacity': '.7' }, row);
        txt(row, cQ + w + 5, y + 4, p.ql, '', 'start');
      } else txt(row, cQ, y + 4, 'not given', '', 'start', { style: 'fill:var(--muted)' });
      POS_ASP.forEach(function (a, j) { ratingSymbol(row, c0 + j * cw, y, p.r[a], 7); });
      rows.push({ p: p, bg: bg });
      pressable(row, function () { sel = p; placeC(); });
    });
    var ly = ry0 + POS.length * rh + 6;
    [[2, 'good'], [1, 'moderate'], [0, 'poor'], [-1, 'not rated']].forEach(function (L, j) { var x = 26 + j * 116; ratingSymbol(gC, x, ly, L[0], 6); txt(gC, x + 11, ly + 4, L[1], '', 'start'); });
    badge(gC, cQ + qw + 64, ry0 + 2 * rh, 1); badge(gC, c0 + 3 * cw + 30, ry0 + 4 * rh, 2);
    function placeC() {
      rows.forEach(function (r) { r.bg.setAttribute('stroke-opacity', sel === r.p ? 1 : 0); });
      if (!sel) { read.innerHTML = 'Tap a row to read what lies behind it. Ratings are the Faraday Institution’s 2023 summary; the capacities come from several sources under different conditions, so read them as typical values, not a contest.'; return; }
      read.innerHTML = '<b>' + sel.n + '</b> (' + sel.f + '). ' + sel.t + ' <span style="color:var(--muted)">Sources: ' + sel.s + '.</span>';
    }
    // ---------- the NMCs ----------
    var B = { x0: 64, y0: 236, x1: 500, y1: 44 }, VS = [4.0, 4.1, 4.2, 4.4, 4.6], gw = (B.x1 - B.x0) / VS.length;
    var YQ = function (q) { return B.y0 - q / 220 * (B.y0 - B.y1); };
    plotAxes(gN, B, { yt: [50, 100, 150, 200], ylo: 0, yhi: 220, yf: function (v) { return String(v); } });
    txt(gN, B.x0 - 40, B.y1 - 18, 'capacity, mAh/g of NMC (cycle 5, then cycle 300)', '', 'start');
    VS.forEach(function (v, k) { txt(gN, B.x0 + gw * (k + 0.5), B.y0 + 15, v.toFixed(1) + ' V', '', 'middle'); });
    txt(gN, B.x1, B.y0 + 30, 'upper cut-off of the full cell →', '', 'end');
    var bars = [];
    VS.forEach(function (v, k) {
      var here = NMC_DATA.filter(function (d) { return d.v === v; }), bw = 22, gap = 6, tot = here.length * bw + (here.length - 1) * gap, xs = B.x0 + gw * (k + 0.5) - tot / 2;
      here.forEach(function (d, j) {
        var x = xs + j * (bw + gap), g = el('g', { tabindex: 0, role: 'button', 'aria-label': d.m + ' to ' + d.v + ' V', style: 'cursor:pointer' }, gN);
        el('rect', { x: x, y: YQ(d.a), width: bw, height: B.y0 - YQ(d.a), rx: 2, fill: NMC_COL[d.m], 'fill-opacity': '.22', stroke: NMC_COL[d.m] }, g);
        el('rect', { x: x, y: YQ(d.b), width: bw, height: B.y0 - YQ(d.b), rx: 2, fill: NMC_COL[d.m], 'fill-opacity': '.85' }, g);
        var ring = el('rect', { x: x - 3, y: YQ(d.a) - 3, width: bw + 6, height: B.y0 - YQ(d.a) + 3, rx: 3, fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.5, 'stroke-opacity': 0 }, g);
        txt(g, x + bw / 2, YQ(d.a) - 5, d.ret + '%', d.ret < 80 ? 'heat' : '', 'middle');
        bars.push({ d: d, ring: ring });
        pressable(g, function () { nsel = d; placeN(); });
      });
    });
    badge(gN, B.x0 + gw * 2.5, YQ(205), 3); badge(gN, B.x0 + gw * 4.5 + 34, YQ(120), 4);
    function placeN() {
      bars.forEach(function (b) { b.ring.setAttribute('stroke-opacity', nsel === b.d ? 0.9 : 0); });
      if (!nsel) { read.innerHTML = 'Pale bar: capacity at cycle 5; solid bar: at cycle 300; the number is the capacity kept. Full cells against graphite, 1C, 25 °C, one study. Tap a bar.'; return; }
      var d = nsel;
      read.innerHTML = '<b>' + d.m + ' charged to ' + d.v.toFixed(1) + ' V</b> against graphite: ' + d.a.toFixed(1) + ' mAh/g at cycle 5, ' + d.b.toFixed(1) + ' at cycle 300, <b>' + d.ret + ' % kept</b>. ' + (d.ret >= 90 ? 'Stable.' : 'The positive electrode’s impedance grew. The study links this to oxygen released from the surface of the NMC, which begins at about 4.3 V vs Li for NMC811 and about 4.7 V for NMC111 and NMC622; these cut-offs are full-cell voltages, roughly 0.1 V below the potential of the positive electrode.');
    }
    function setView(v) {
      gC.style.display = v === 'c' ? '' : 'none'; gN.style.display = v === 'n' ? '' : 'none';
      Array.prototype.forEach.call(vb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
      if (v === 'c') placeC(); else placeN();
    }
    var st = null;
    Array.prototype.forEach.call(vb, function (b) { on(b, 'click', function () { var v = b.getAttribute('data-view'); if (st) st.go(v === 'n' ? 2 : 0); else setView(v); }); });
    setView('c');
    st = steps(fig, [
      { text: 'Nine positive electrode materials and how they score. No row is good everywhere: the layered oxides rich in nickel win on energy and mostly lose on heat and cost; LFP and LMO are cheap and thermally stable but store less.', on: function () { sel = null; setView('c'); } },
      { text: 'Look down the columns. The nickel-rich layered oxides score high on energy, poor on cost and mostly poor on heat; LFP rates good on cost, heat and cycle life. The next generation, LMR-NMC, promises the most capacity but does not yet last.', on: function () { sel = POS[8]; setView('c'); } },
      { text: 'Now the NMCs side by side. Charging to a higher voltage takes out more lithium: more capacity. NMC111 and NMC622 stay stable to 4.4 V; NMC811 only to 4.0 V.', on: function () { nsel = NMC_DATA[4]; setView('n'); } },
      { text: 'Push past the limit and the capacity collapses: 42 % and 39 % kept at 4.6 V, 66 % for NMC811 at 4.2 V. More nickel buys capacity at a lower voltage, but leaves less margin.', on: function () { nsel = NMC_DATA[8]; setView('n'); } }
    ]);
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
    var cv = document.getElementById('learnBg'); if (!cv || getComputedStyle(cv).display === 'none') return;
    var coarse = window.matchMedia('(pointer:coarse)').matches, small = window.innerWidth < 760;
    if (!motion || coarse || small) { cv.style.display = 'none'; return; }
    var ctx = cv.getContext('2d'), W, H, ps = [], raf = 0, t0 = null, running = false;
    function size() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    size(); window.addEventListener('resize', size);
    var boost = 1, kick = 0, lastY = window.scrollY || 0;
    window.addEventListener('scroll', function () { var y = window.scrollY || 0; kick = Math.min(7, kick + Math.abs(y - lastY) / 60); lastY = y; }, { passive: true });
    for (var i = 0; i < 34; i++) {
      var ion = i % 5 !== 0; // four cations to one electron
      ps.push({ ion: ion, x: Math.random() * 1600, y: Math.random() * 1000, r: ion ? 2.2 + Math.random() * 2.2 : 1.4 + Math.random(), v: ion ? 6 + Math.random() * 8 : -(14 + Math.random() * 14), ph: Math.random() * 6.28, a: 0.04 + Math.random() * 0.07 });
    }
    function frame(ts) {
      if (!running) return;
      var dt = t0 === null ? 0 : Math.min(0.05, (ts - t0) / 1000); t0 = ts;
      boost += (1 + Math.min(7, kick) - boost) * Math.min(1, dt * 4); kick *= Math.pow(0.04, dt);   // ions run faster while the page scrolls, then settle
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i]; p.x += p.v * dt * boost; p.ph += dt * 0.6; var y = p.y + Math.sin(p.ph) * 14;
        if (p.x > W + 20) p.x = -20; if (p.x < -20) p.x = W + 20; if (p.y > H + 20) p.y = Math.random() * H;
        var g = ctx.createRadialGradient(p.x, y, 0, p.x, y, p.r * 4);
        var c = p.ion ? '31,72,214' : '242,169,0';
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
    // a drawing with parts that take the keyboard is a group of controls, not a single image
    Array.prototype.forEach.call(fig.querySelectorAll('svg[role="img"]'), function (s) { if (s.querySelector('[tabindex], a[href], button, input')) s.setAttribute('role', 'group'); });
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
