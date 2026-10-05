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

  /* =================================================================
     Module 11: testing and diagnosis. This file holds the helpers shared
     by figs-11*.js, the overview (11.1), the current pulse (11.2) and
     what each technique sees (11.18). GITT is in figs-11g.js, impedance
     basics in figs-11e.js, measuring well in figs-11m.js and analysis in
     figs-11a.js. All physics is in Physics.m11 (assets/js/physics.js),
     with the source of each formula stated there.
     ================================================================= */
  var M11 = P.m11;
  function e11d(pts) { var d = ''; for (var i = 0; i < pts.length; i++) { if (!isFinite(pts[i][0]) || !isFinite(pts[i][1])) continue; d += (d ? 'L' : 'M') + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1); } return d; }
  /* axes with tick labels: b = {x0, y0, x1, y1} (y0 is the bottom); o.xt / o.yt = [[value, label]] mapped by o.X / o.Y */
  function e11axes(g, b, o) {
    el('line', { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0, stroke: 'var(--line-2)' }, g);
    el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, stroke: 'var(--line-2)' }, g);
    (o.xt || []).forEach(function (t) { var x = o.X(t[0]); el('line', { x1: x, x2: x, y1: b.y0, y2: b.y0 + 4, stroke: 'var(--line-2)' }, g); if (t[1] !== '') txt(g, x, b.y0 + 16, t[1], '', 'middle'); });
    (o.yt || []).forEach(function (t) { var y = o.Y(t[0]); el('line', { x1: b.x0 - 4, x2: b.x0, y1: y, y2: y, stroke: 'var(--line-2)' }, g); if (o.grid) el('line', { x1: b.x0, x2: b.x1, y1: y, y2: y, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); if (t[1] !== '') txt(g, b.x0 - 7, y + 4, t[1], '', 'end'); });
    if (o.xlab) txt(g, b.x1, b.y0 + (o.xt && o.xt.length ? 32 : 16), o.xlab, '', 'end');
    if (o.ylab) txt(g, b.x0 + 6, b.y1 - 8, o.ylab, '', 'start');
  }
  function e11mOhm(r, d) { return (r * 1000).toFixed(d === undefined ? 1 : d) + ' mΩ'; }
  function e11Hz(f) {
    var s = f >= 1e3 ? (f / 1e3).toFixed(f >= 1e4 ? 0 : 1) + ' kHz' : f >= 1 ? f.toFixed(f >= 10 ? 0 : 1) + ' Hz' : (f * 1e3).toFixed(f * 1e3 >= 10 ? 0 : 1) + ' mHz';
    return s.replace('.0 ', ' ');
  }
  /* a signed number with a true minus sign */
  function e11n(x, d) { var s = Math.abs(x).toFixed(d === undefined ? 1 : d); return (x < 0 && +s !== 0 ? '−' : '') + s; }
  function e11time(t) {
    if (t < 1e-3) return (t * 1e6).toFixed(0) + ' µs';
    if (t < 1) return (t * 1e3).toFixed(t < 0.01 ? 1 : 0) + ' ms';
    if (t < 120) return t.toFixed(t < 10 ? 1 : 0) + ' s';
    if (t < 7200) return (t / 60).toFixed(0) + ' min';
    return (t / 3600).toFixed(t < 36000 ? 1 : 0) + ' h';
  }
  function e11log(v, lo, hi, a, b) { return a + (Math.log10(v) - lo) / (hi - lo) * (b - a); }
  /* a circuit-element box with a label, used by several figures */
  function e11box(g, x, y, w, lab, cls) { var r = el('rect', { x: x, y: y - 10, width: w, height: 20, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g); txt(g, x + w / 2, y + 4, lab, cls || 'strong', 'middle'); return r; }
  function e11lit(r, onOff, col) { r.setAttribute('stroke', onOff ? (col || 'var(--amber)') : 'var(--line-2)'); r.setAttribute('stroke-width', onOff ? 2.2 : 1); }
  /* button group helper: buttons with data-mode inside .controls; calls fn(mode) */
  function e11modes(fig, fn) {
    var bs = fig.querySelectorAll('.controls button[data-mode]');
    Array.prototype.forEach.call(bs, function (bt) { on(bt, 'click', function () { Array.prototype.forEach.call(bs, function (x) { x.setAttribute('aria-pressed', String(x === bt)); }); fn(bt.getAttribute('data-mode')); }); });
    var cur = Array.prototype.filter.call(bs, function (x) { return x.getAttribute('aria-pressed') === 'true'; })[0] || bs[0];
    return cur ? cur.getAttribute('data-mode') : null;
  }

  /* ===== 11.1 One cell, many questions ===== */
  register('f11-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var P4 = [
      { x: 20, y: 20, t: 'cycling at constant current', q: 'How much charge, at what voltage, for how many cycles?', where: 'module 5' },
      { x: 270, y: 20, t: 'a current pulse', q: 'How big is the resistance, read after how long?', where: 'figure 11.2' },
      { x: 20, y: 170, t: 'GITT: pulse and rest', q: 'How fast does lithium move inside the solid?', where: 'figures 11.3 to 11.7' },
      { x: 270, y: 170, t: 'impedance spectroscopy', q: 'Which part resists, and how fast does it answer?', where: 'figures 11.8 to 11.17' }
    ];
    var W = 230, H = 130;
    P4.forEach(function (p, i) {
      el('rect', { x: p.x, y: p.y, width: W, height: H, rx: 6, fill: 'var(--panel-2)', 'fill-opacity': '.5', stroke: 'var(--line-2)' }, g);
      txt(g, p.x + 10, p.y + 18, p.t, 'strong', 'start');
      var px = p.x + 16, py = p.y + 100, d = '', k, j, u;
      if (i === 0) { for (var cyc = 0; cyc < 2; cyc++) { var ox = px + cyc * 96; for (k = 0; k <= 24; k++) { u = k / 24; d += (cyc + k ? 'L' : 'M') + (ox + u * 48).toFixed(1) + ',' + (py - 62 + 22 * u + 22 * Math.pow(u, 8) + cyc * 3).toFixed(1); } for (k = 0; k <= 24; k++) { u = k / 24; d += 'L' + (ox + 48 + u * 48).toFixed(1) + ',' + (py - 18 - 22 * u - 22 * Math.pow(u, 8) + cyc * 3).toFixed(1); } } }
      if (i === 1) { d = 'M' + px + ',' + (py - 10) + ' H' + (px + 40) + ' V' + (py - 40); for (k = 0; k <= 40; k++) { var lt = k / 40; d += ' L' + (px + 40 + lt * 150).toFixed(1) + ',' + (py - 40 - 20 * (1 - Math.exp(-lt * 6)) - 14 * Math.sqrt(lt)).toFixed(1); } }
      if (i === 2) { d = 'M' + px + ',' + (py - 20); for (k = 0; k < 3; k++) { var x = px + k * 62; d += ' L' + (x + 6) + ',' + (py - 20 - k * 12) + ' L' + (x + 6) + ',' + (py - 32 - k * 12); for (j = 1; j <= 6; j++) d += ' L' + (x + 6 + j * 3) + ',' + (py - 32 - k * 12 - 10 * Math.sqrt(j / 6)).toFixed(1); d += ' L' + (x + 24) + ',' + (py - 34 - k * 12); for (j = 1; j <= 10; j++) d += ' L' + (x + 24 + j * 3.6).toFixed(1) + ',' + (py - 32 - (k + 1) * 12 + 12 * Math.exp(-j / 2.5)).toFixed(1); } }
      if (i === 3) { for (k = 0; k <= 50; k++) { var a = Math.PI * k / 50; d += (k ? 'L' : 'M') + (px + 30 + 34 - 34 * Math.cos(a)).toFixed(1) + ',' + (py - 34 * Math.sin(a) * 0.9).toFixed(1); } d += ' L' + (px + 170) + ',' + (py - 60); }
      el('path', { d: d, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, g);
      txt(g, p.x + 10, p.y + H - 6, p.where, '', 'start');
      badge(g, p.x + W - 14, p.y + 14, i + 1);
    });
    steps(fig, P4.map(function (p) { return { text: '<b>' + p.t.charAt(0).toUpperCase() + p.t.slice(1) + '</b>. ' + p.q, on: function () { read.innerHTML = 'The question this measurement answers: <b>' + p.q + '</b> (' + p.where + ')'; } }; }));
  });

  /* ===== 11.2 A current pulse: the resistance depends on when you read it ===== */
  register('f11-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.tread'), sv = fig.querySelector('.tread-val');
    var p = { R0: 0.020, R1: 0.004, C1: 0.25, R2: 0.010, C2: 2, sigma: 0.002 };
    var b = { x0: 60, y0: 230, x1: 500, y1: 46 }, lo = -4, hi = 2, rmax = 0.07;
    var X = function (t) { return e11log(t, lo, hi, b.x0, b.x1); }, Y = function (r) { return b.y0 - r / rmax * (b.y0 - b.y1); };
    var band = el('g', {}, g);
    [[1e-4, 2e-4], [2e-4, 0.15], [0.15, 100]].forEach(function (s, i) { el('rect', { x: X(s[0]), y: b.y1, width: X(s[1]) - X(s[0]), height: b.y0 - b.y1, fill: i === 0 ? 'var(--cyan)' : i === 1 ? 'var(--amber)' : '#C4B5F7', 'fill-opacity': '.06' }, band); });
    e11axes(g, b, { X: X, Y: Y, xt: [[1e-4, '0.1 ms'], [1e-3, '1 ms'], [1e-2, '10 ms'], [0.1, '0.1 s'], [1, '1 s'], [10, '10 s'], [100, '100 s']], yt: [[0, ''], [0.02, '20'], [0.04, '40'], [0.06, '60']], grid: true, xlab: 'time since the current was switched on (log scale)', ylab: 'ΔV/I read off the voltage, mΩ' });
    var pts = [], k, t;
    for (k = 0; k <= 200; k++) { t = Math.pow(10, lo + (hi - lo) * k / 200); pts.push([X(t), Y(M11.stepResistance(p, t))]); }
    el('path', { d: e11d(pts), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    for (k = 0; k <= 24; k++) { t = Math.pow(10, lo + (hi - lo) * k / 24); var z = M11.voigtWZ(p, 1 / t); el('circle', { cx: X(t), cy: Y(z.re), r: 3, fill: 'var(--cyan)', 'fill-opacity': '.85' }, g); }
    var cur = el('line', { y1: b.y1, y2: b.y0, stroke: 'var(--text)', 'stroke-dasharray': '4 3' }, g), dot = el('circle', { r: 6, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var tl = txt(g, 0, 0, '', 'strong tag', 'start');
    badge(g, X(1.4e-4), Y(0.02) - 20, 1); badge(g, X(0.006), Y(0.036) - 24, 2); badge(g, X(14), Y(M11.stepResistance(p, 14)) + 24, 3);
    var lt = 0, tRead = 1;
    function place() {
      var R = M11.stepResistance(p, tRead), z = M11.voigtWZ(p, 1 / tRead), f = 1 / (2 * Math.PI * tRead), x = X(tRead), y = Y(R);
      cur.setAttribute('x1', x); cur.setAttribute('x2', x); dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      tl.setAttribute('x', x > b.x1 - 150 ? x - 10 : x + 10); tl.setAttribute('text-anchor', x > b.x1 - 150 ? 'end' : 'start'); tl.setAttribute('y', Math.max(y - 14, b.y1 + 14)); setSvgText(tl, e11mOhm(R) + ' at ' + e11time(tRead));
      setSvgText(sv, e11time(tRead));
      var part = tRead < 2e-4 ? 'the instantaneous drop, the <b>ohmic</b> resistance of electrolyte, electrodes and contacts' : tRead < 0.15 ? 'the ohmic part plus the <b>interfaces</b> (SEI and charge transfer) charging their double layers' : 'everything above plus a <b>diffusion</b> part that keeps growing as √t';
      read.innerHTML = 'Read at t = <b>' + e11time(tRead) + '</b>: ΔV/I = <b>' + e11mOhm(R) + '</b>, ' + part + '. Impedance at the matching frequency f = 1/(2πt) = ' + e11Hz(f) + ' has a real part of ' + e11mOhm(z.re) + ' (cyan dots).';
    }
    on(sl, 'input', function () { lt = +sl.value; tRead = Math.pow(10, lt); place(); });
    steps(fig, [
      { text: 'Switch on a constant current I. The voltage jumps at once. That <b>instantaneous drop</b> divided by the current, ΔV/ΔI, is the ohmic resistance: electrolyte, active material, current collectors and contacts. The number you get depends on how fast the instrument samples.' },
      { text: 'Keep the current on and the voltage keeps moving. The interfaces, the SEI and the charge transfer, each in parallel with its double layer, need their own time to answer (here about 1 ms and 20 ms).' },
      { text: 'At long times <b>diffusion</b> adds a part that keeps growing as √t. So “the resistance” of a cell depends on when you read it: the values at 10 ms, 1 s and 10 s are different numbers. That is why test standards fix the pulse length.' },
      { text: 'The cyan dots are the real part of the impedance of the same cell at f = 1/(2πt). They roughly follow the pulse curve: values from a pulse and from a sine agree when the timescales match. Impedance spectroscopy, from figure 11.8 on, measures one frequency at a time.' }
    ]);
    place();
    var loop = anim(fig, function (dt) { if (dt === 0) return; lt += dt * 0.9; if (lt > hi) lt = lo; tRead = Math.pow(10, lt); sl.value = lt; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 11.18 What each technique sees, and what it costs the cell ===== */
  register('f11-18', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var cols = [
      { x: 20, t: 'from outside, cell intact', items: ['cycling, dQ/dV', 'current pulses', 'GITT', 'impedance', 'cyclic voltammetry'], col: 'var(--cyan)', why: 'Nondestructive: the cell keeps working, so the same cell can be followed as it ages. Capacity, rate, resistances, diffusion and state of health come from here. Capacity, cyclic voltammetry and differential capacity are also used to check what impedance and a tear-down suggest.' },
      { x: 187, t: 'inside, while it works', items: ['three-electrode cell', 'in situ X-ray, NMR', 'local impedance', 'pressure sensing'], col: 'var(--amber)', why: 'In situ: a reference electrode separates the two electrodes; plastic cells let X-ray absorption, NMR, Mössbauer spectroscopy and the electron microscope watch the electrodes while the cell runs; local impedance probes one spot with a moving tip; a pressure sensor follows the SEI swelling.' },
      { x: 354, t: 'after it is opened', items: ['symmetric cells', 'microscopy', 'XPS, Raman', 'X-ray CT (before)'], col: 'var(--heat)', why: 'Post-mortem: discharge the cell, open it in an argon glove box and examine its parts. Electrodes harvested from a commercial cell can be rebuilt into symmetric cells, two identical electrodes, to see which electrode carries which arc. X-ray tomography before opening shows where to cut. A fresh cell treated the same way is the baseline.' }
    ];
    cols.forEach(function (c, i) {
      el('rect', { x: c.x, y: 30, width: 150, height: 190, rx: 6, fill: c.col, 'fill-opacity': '.08', stroke: c.col, 'stroke-opacity': '.6' }, g);
      txt(g, c.x + 75, 20, c.t, 'strong', 'middle');
      c.items.forEach(function (it, j) { txt(g, c.x + 12, 58 + j * 26, '• ' + it, '', 'start'); });
      badge(g, c.x + 136, 206, i + 1);
    });
    txt(g, 260, 244, 'accelerating-rate calorimetry finds where thermal runaway starts (module 12)', '', 'middle');
    steps(fig, cols.map(function (c) { return { text: c.why, on: function () { read.innerHTML = '<b>' + c.t + '</b>: ' + c.items.join(', ') + '.'; } }; }));
  });

  /* =================================================================
     Modules 4 and 5. A shared, clearly illustrative cell model feeds
     figure 4.2 and the module 5 figures in figs-5.js. Its open-circuit shapes and parameters are
     not measurements; the equations it combines are the cited ones.
     ================================================================= */
  var RTF = P.R * P.T0 / P.F; // thermal voltage, 25.7 mV at 25 C
  function rateFromSlider(v) { return 0.1 * Math.pow(50, v / 100); } // 0.1C .. 5C, log scale
  function fmtRate(c) { if (c < 0.67) return 'C/' + Math.round(1 / c); var r = Math.round(c * 10) / 10; return (Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : r.toFixed(1)) + 'C'; }
  /* The illustrative cell. x is the fraction of the low-rate capacity delivered
     (0 = full, 1 = empty); the state of charge is 1 - x. Open-circuit shapes are
     smooth illustrative functions: a flat two-phase plateau (LiFePO4-like, R6) and a
     sloping single-phase curve (LiCoO2-like, R6), each with the steep ends every cell
     shows when one electrode runs out. Polarization combines the cited forms:
       ohmic          eta = I R_b                         (R6 eq. 1; R1 eq. 15)
       activation     eta = (2RT/F) asinh(i / 2 i0)       (B2 eq. 3.4.11 with alpha = 0.5)
       concentration  eta = (RT/F) ln(C0 / C), C/C0 = 1 - i/i_lim (R1 eq. 16, F restored)
     where the limiting current falls as the electrode that is being emptied runs short
     of lithium (the end of discharge) or of room for it (the end of charge). R_b, i0 and
     i_lim are illustrative, chosen so that the picture is legible; nothing is measured. */
  var model = {
    Rb: 0.05, i0: 0.3, lim: 8,
    voc: function (shape, x) {
      if (shape === 'flat') return 3.40 - 0.04 * x + 0.30 * Math.exp(-x / 0.02) - 0.70 * Math.exp(-(1 - x) / 0.025);
      return 4.02 - 0.47 * x + 0.06 * Math.exp(-x / 0.03) - 0.55 * Math.exp(-(1 - x) / 0.04);
    },
    cut: function (shape) { return shape === 'flat' ? { lo: 2.5, hi: 3.9 } : { lo: 3.0, hi: 4.2 }; },
    eta: function (c, x, charge) { // c in C-rate
      var ohm = this.Rb * c;
      var act = 2 * RTF * Math.asinh(c / (2 * this.i0));
      var end = charge ? (1 - x) : x;                         // how close the cell is to the end it is heading for
      var f = (c / this.lim) * (1 + 5 * Math.pow(end, 4));     // i / i_lim
      var conc = f >= 0.999 ? RTF * Math.log(1000) + 2 : RTF * Math.log(1 / (1 - f));
      return { ohm: ohm, act: act, conc: conc, total: ohm + act + conc };
    },
    /* discharge from full (x = 0) down to the lower cut-off, or charge from empty (x = 1)
       up to the upper cut-off. Points carry x, V, the open-circuit V and eta. */
    curve: function (shape, c, charge, xStart) {
      var cut = this.cut(shape), pts = [], N = 240, dx = 1 / N;
      var x = charge ? (xStart === undefined ? 1 : xStart) : (xStart || 0);
      for (var i = 0; i <= N + 1; i++) {
        var e = this.eta(c, x, charge), o = this.voc(shape, x), V = charge ? o + e.total : o - e.total;
        if (i > 0 && (charge ? V > cut.hi : V < cut.lo)) break;
        pts.push({ x: x, V: V, voc: o, eta: e });
        x += charge ? -dx : dx;
        if (x < -1e-9 || x > 1 + 1e-9) break;
      }
      if (pts.length < 2) pts.push({ x: pts[0].x + (charge ? -0.002 : 0.002), V: pts[0].V, voc: pts[0].voc, eta: pts[0].eta });
      return pts;
    },
    /* both half-cycles at rate c, each started from rest at its own end: discharge from a
       full cell, charge from an empty one, as a test protocol does after a slow step.
       Energies per unit of the low-rate capacity (V x fraction); heat as the area between
       each branch and the open-circuit curve, which is the integral of eta dq. */
    cycle: function (shape, c) {
      var d = this.curve(shape, c, false, 0), u = this.curve(shape, c, true, 1);
      function integ(p, key) { var s = 0; for (var i = 1; i < p.length; i++) s += 0.5 * (p[i][key] + p[i - 1][key]) * Math.abs(p[i].x - p[i - 1].x); return s; }
      var Ed = integ(d, 'V'), Ec = integ(u, 'V');
      d.forEach(function (p) { p.h = p.voc - p.V; }); u.forEach(function (p) { p.h = p.V - p.voc; });
      return { dis: d, ch: u, Qdis: d[d.length - 1].x - d[0].x, Qch: u[0].x - u[u.length - 1].x, Edis: Ed, Ech: Ec, heatDis: integ(d, 'h'), heatCh: integ(u, 'h') };
    }
  };
  function shapeOfCell() { return cell.pos === 'lfp' ? 'flat' : 'slope'; }
  function axes(g, x0, y0, x1, y1, vmin, vmax, xlab, ylab) {
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g);
    el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    for (var v = Math.ceil(vmin * 2) / 2; v <= vmax; v += 0.5) {
      var yy = y0 - (v - vmin) / (vmax - vmin) * (y0 - y1);
      el('line', { x1: x0, y1: yy, x2: x1, y2: yy, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g);
      var t = el('text', { x: x0 - 6, y: yy + 4, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(t, v.toFixed(1));
    }
    var tx = el('text', { x: x1, y: y0 + 18, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(tx, xlab);
    var ty = el('text', { x: x0 - 34, y: y1 - 8, 'class': 'lbl' }, g); setSvgText(ty, ylab);
  }
  function pathOf(pts, x0, y0, x1, y1, vmin, vmax) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + (x0 + p.x * (x1 - x0)).toFixed(1) + ',' + (y0 - (p.V - vmin) / (vmax - vmin) * (y0 - y1)).toFixed(1); }).join(' ');
  }

  /* ===== 4.1 Faraday calculator ===== */
  register('f4-1', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.calc-bars'), sel = fig.querySelector('.mat'), M = fig.querySelector('.M'), n = fig.querySelector('.n'), V = fig.querySelector('.V'), Vv = fig.querySelector('.V-val'), read = fig.querySelector('.readout'), note = fig.querySelector('.note');
    P.data.materials.forEach(function (m) { var o = document.createElement('option'); o.value = m.key; o.textContent = plain(m.name); sel.appendChild(o); });
    var o = document.createElement('option'); o.value = 'custom'; setSvgText(o, 'Custom (type M and n)'); sel.appendChild(o);
    var refs = [{ name: 'graphite', basis: 'per g of C₆', q: P.specificCapacity(1, 6 * 12.011) }, { name: 'LiFePO₄', basis: 'per g of LiFePO₄', q: P.specificCapacity(1, 6.94 + 55.845 + 30.974 + 4 * 15.999) }, { name: 'lithium metal', basis: 'per g of Li', q: P.specificCapacity(1, 6.94) }];
    var scale = 300 / 4000;
    badge(svg, 20, 42, 1); badge(svg, 20, 82, 2); badge(svg, 500, 190, 3);
    function valid() { var mm = +M.value, nn = +n.value; return isFinite(mm) && mm >= 1 && mm <= 1000 && isFinite(nn) && nn >= 0.1 && nn <= 10; }
    function render() {
      var mat = null; P.data.materials.forEach(function (m) { if (m.key === sel.value) mat = m; });
      if (mat) { M.value = mat.M.toFixed(2); n.value = mat.n; }
      setSvgText(Vv, (+V.value).toFixed(1) + ' V');
      clear(g);
      if (!valid()) { read.innerHTML = '<span class="invalid">Enter a molar mass between 1 and 1000 g/mol and an electron count between 0.1 and 10.</span>'; note.innerHTML = ''; return; }
      var q = P.specificCapacity(+n.value, +M.value), E = q * (+V.value); // mAh/g x V = mWh/g = Wh/kg
      var rows = [{ name: mat ? mat.name.split(' (')[0] : 'your material', basis: mat ? 'per g of ' + mat.basis.split(' (')[0] : 'per g of it', q: q, me: true }].concat(refs.filter(function (r) { return Math.abs(r.q - q) > 0.5; }));
      rows.forEach(function (r, i) {
        var y = 30 + i * 40, w = Math.min(300, r.q * scale);
        el('rect', { x: 180, y: y, width: w, height: 22, rx: 4, fill: r.me ? 'var(--amber)' : 'var(--cyan)', 'fill-opacity': r.me ? '.95' : '.45' }, g);
        txt(g, 174, y + 7, r.name, r.me ? 'strong' : '', 'end'); txt(g, 174, y + 24, r.basis, '', 'end');
        var inside = w > 200;
        txt(g, inside ? 176 + w : 186 + w, y + 15, Math.round(r.q) + ' mAh/g', 'strong', inside ? 'end' : 'start', inside ? { fill: '#1a1405' } : null);
      });
      txt(g, 480, 194, 'theoretical specific capacity, 0 to 4000 mAh/g, each on its own mass basis', '', 'end');
      read.innerHTML = 'Q = nF/(3.6 M) = ' + (+n.value) + ' × 96 485.3 / (3.6 × ' + (+M.value).toFixed(2) + ') = <b>' + Math.round(q) + ' mAh/g</b>' + (mat ? ' on the ' + mat.basis + ' basis' : '') + '. Against a counter electrode that puts the cell at ' + (+V.value).toFixed(1) + ' V, that is <b>' + Math.round(E) + ' Wh per kilogram of this electrode’s active material</b>, this electrode alone: the other electrode, the electrolyte and the packaging all add mass and none adds energy (see the note under figure 4.3).';
      note.innerHTML = mat ? (mat.printed ? '<span class="flag ok">reproduces the printed value, ' + mat.printed + ' mAh/g</span> ' : '<span class="flag">computed from Faraday’s law; the sources print no theoretical value for this one</span> ') + '<span class="flag">' + mat.practical + '</span>' : '<span class="flag">custom entry: computed, no printed check</span>';
    }
    on(sel, 'change', render);
    [M, n].forEach(function (i) { on(i, 'input', function () { sel.value = 'custom'; render(); }); });
    on(V, 'input', render);
    function fromCell() { var p = rung(cell.pos), nn = rung(cell.neg); V.value = Math.max(0.5, Math.min(5, p.V - nn.V)).toFixed(1); if (cell.pos === 'lfp' || cell.pos === 'lco' || cell.pos === 's') sel.value = cell.pos; render(); }
    steps(fig, [
      { text: 'The amber bar is the material you chose: its <b>theoretical capacity</b> from Faraday’s law, Q = nF/(3.6 M), in milliampere-hours per gram.' },
      { text: 'The cyan bars are three references. Read the small print: each is <b>per gram of a different thing</b> (the carbon host, the lithiated phosphate, the bare metal), so compare with care.' },
      { text: 'Multiply by the cell voltage and you get watt-hours per kilogram <b>of this electrode’s active material only</b>. Energy belongs to a pair of electrodes; a whole cell delivers far less per kilogram (the note under figure 4.3 says why).' }
    ]);
    cellListeners.push(fromCell); fromCell();
  });

  /* ===== 4.2 Energy is the area under the curve ===== */
  register('f4-2', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), read = fig.querySelector('.readout');
    var x0 = 60, y0 = 250, x1 = 490, y1 = 30, vmin = 2.0, vmax = 4.5;
    var ax = el('g', {}, g); axes(ax, x0, y0, x1, y1, vmin, vmax, '', 'V');
    [0, 25, 50, 75, 100].forEach(function (pc) { var xx = x0 + pc / 100 * (x1 - x0); el('line', { x1: xx, y1: y0, x2: xx, y2: y0 + 5, stroke: 'var(--line-2)' }, ax); txt(ax, xx, y0 + 18, pc + ' %', '', 'middle'); });
    txt(ax, x1, y0 + 34, 'capacity delivered, % of the C/10 value', '', 'end');
    var area = el('path', { fill: 'var(--amber)', 'fill-opacity': '.22' }, g), line = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, g);
    var ref = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-opacity': '.45', 'stroke-dasharray': '3 4' }, g);
    // legend
    el('line', { x1: x0 + 14, x2: x0 + 40, y1: y1 + 14, y2: y1 + 14, stroke: 'var(--amber)', 'stroke-width': 2 }, g); txt(g, x0 + 46, y1 + 18, 'this rate', '');
    el('line', { x1: x0 + 120, x2: x0 + 146, y1: y1 + 14, y2: y1 + 14, stroke: 'var(--amber)', 'stroke-opacity': '.45', 'stroke-dasharray': '3 4' }, g); txt(g, x0 + 152, y1 + 18, 'C/10 reference', '');
    el('rect', { x: x0 + 250, y: y1 + 7, width: 26, height: 14, fill: 'var(--amber)', 'fill-opacity': '.22' }, g); txt(g, x0 + 282, y1 + 18, 'energy = area', '');
    badge(svg, x0 + 200, y0 - 60, 1); badge(svg, x1 - 30, y0 - 30, 2); badge(svg, 30, y1 + 14, 3);
    var E0 = null;
    function render() {
      var shape = shapeOfCell(), c = rateFromSlider(+rate.value); setSvgText(rv, fmtRate(c));
      var pts = model.curve(shape, c, false), slow = model.curve(shape, 0.1, false);
      var d = pathOf(pts, x0, y0, x1, y1, vmin, vmax); line.setAttribute('d', d);
      area.setAttribute('d', d + ' L' + (x0 + pts[pts.length - 1].x * (x1 - x0)).toFixed(1) + ',' + y0 + ' L' + x0 + ',' + y0 + ' Z');
      ref.setAttribute('d', pathOf(slow, x0, y0, x1, y1, vmin, vmax));
      var E = P.energyFromCurve(pts.map(function (p) { return p.x; }), pts.map(function (p) { return p.V; }));
      E0 = P.energyFromCurve(slow.map(function (p) { return p.x; }), slow.map(function (p) { return p.V; }));
      var q = pts[pts.length - 1].x, vavg = E / q;
      read.innerHTML = 'At ' + fmtRate(c) + ': capacity reached <b>' + Math.round(q * 100) + ' %</b> of the C/10 value, average voltage <b>' + vavg.toFixed(2) + ' V</b>, energy (the shaded area) <b>' + Math.round(100 * E / E0) + ' %</b> of the energy at C/10 (dashed). Energy = average voltage × capacity.';
    }
    on(rate, 'input', render); cellListeners.push(render); render();
    steps(fig, [
      { text: 'The curve is the cell voltage as charge is drawn out, for <b>your cell</b>: flat for LiFePO₄, sloping for the oxides (a later module explains the shapes). The shaded <b>area</b> under it is the energy delivered.' },
      { text: 'Slide the rate up. The curve drops (voltage lost to resistance and kinetics) and it ends earlier (capacity lost to slow transport): the area shrinks from both sides.' },
      { text: 'The dashed line is the gentle C/10 discharge that sets 100 %. Whatever the rate, energy is the integral of V over the charge, which is the same as the average voltage times the capacity.' }
    ]);
  });

  /* ===== 4.3 The Ragone map (static) ===== */
  register('f4-3', function (fig) {
    var svg = fig.querySelector('svg');
    badge(svg, 190, 60, 1); badge(svg, 440, 200, 2); badge(svg, 372, 112, 3);
    steps(fig, [
      { text: '<b>Supercapacitors</b> deliver energy fast but hold little; <b>fuel cells</b> hold much but deliver it slowly. Both axes are logarithmic and carry no numbers because the source figure is itself simplified.' },
      { text: '<b>Batteries</b> sit between the two and overlap both; a thin-film battery can reach the power of a supercapacitor.' },
      { text: 'The <b>combustion engine</b> is not an electrochemical device: it beats all three on both axes because its energy is stored in a fuel tank, not in an electrode. No single electrochemical system matches it, which is why the sources suggest combining them.' }
    ]);
  });


  /* =================================================================
     Module 5: charging and discharging. Every curve comes from the
     illustrative cell model in figs-45.js (cited equations, illustrative
     parameters). Potential profile with current after Bard, Faulkner and
     White Figure 1.5.2; V = Voc -/+ eta after Goodenough and Park 2013,
     eqs. 1.1 and 1.2; the three polarizations and their clocks after
     Winter and Brodd 2004, section 1.4; the phase rule after Winter and
     Brodd section 2.4; heat after Jindal et al. 2022, eq. 1.
     ================================================================= */
  var C5 = { ohm: '#C4B5F7', act: 'var(--amber)', conc: 'var(--cyan)' }; // colours of the three polarizations
  function niceStep(span, n) { var raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
  function cellVoc() { var p = rung(cell.pos), n = rung(cell.neg); return Math.max(0.5, p.V - n.V); }
  function mv(v) { return Math.round(v * 1000) + ' mV'; }

  /* ===== 5.2 Where the voltage goes when current flows ===== */
  register('f5-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), mb = fig.querySelectorAll('button[data-mode]');
    var xn0 = 64, xn1 = 112, xp0 = 408, xp1 = 456, ye0 = 92, ye1 = 222, xsep = 260;
    // the cell: negative electrode | electrolyte with separator | positive electrode
    el('rect', { x: xn1, y: ye0, width: xp0 - xn1, height: ye1 - ye0, fill: 'var(--cyan)', 'fill-opacity': '.1', stroke: 'var(--cyan)', 'stroke-opacity': '.45' }, g);
    el('line', { x1: xsep, y1: ye0 + 4, x2: xsep, y2: ye1 - 4, stroke: 'var(--cyan)', 'stroke-dasharray': '3 5' }, g);
    el('rect', { x: xn0, y: ye0 - 10, width: xn1 - xn0, height: ye1 - ye0 + 20, rx: 3, fill: 'var(--metal)', 'fill-opacity': '.55' }, g);
    el('rect', { x: xp0, y: ye0 - 10, width: xp1 - xp0, height: ye1 - ye0 + 20, rx: 3, fill: 'var(--amber-2)', 'fill-opacity': '.6' }, g);
    for (var k = 0; k < 5; k++) { el('line', { x1: xn0 + 6, x2: xn1 - 6, y1: ye0 + 6 + k * 26, y2: ye0 + 6 + k * 26, stroke: 'var(--text)', 'stroke-opacity': '.35' }, g); el('line', { x1: xp0 + 6, x2: xp1 - 6, y1: ye0 + 6 + k * 26, y2: ye0 + 6 + k * 26, stroke: 'var(--text)', 'stroke-opacity': '.35' }, g); }
    txt(g, (xn0 + xn1) / 2, ye1 + 26, 'negative', 'strong', 'middle'); txt(g, (xp0 + xp1) / 2, ye1 + 26, 'positive', 'strong', 'middle');
    txt(g, xsep, ye1 + 26, 'electrolyte and separator', 'cyan', 'middle');
    // the external circuit: lamp for discharge, charger for charge
    var wy = 40;
    el('path', { d: 'M' + (xn0 + xn1) / 2 + ',' + (ye0 - 10) + ' V' + wy + ' H' + (xp0 + xp1) / 2 + ' V' + (ye0 - 10), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g);
    var ePath = el('path', { d: 'M' + (xn0 + xn1) / 2 + ',' + (ye0 - 10) + ' V' + wy + ' H' + (xp0 + xp1) / 2 + ' V' + (ye0 - 10), fill: 'none', stroke: 'none' }, g);
    var eflow = flow(svg, ePath, { n: 10, cls: 'e-dot', r: 3, speed: 55, parent: g });
    var box = el('rect', { x: xsep - 46, y: wy - 16, width: 92, height: 32, rx: 6, fill: 'var(--panel)', stroke: 'var(--line-2)' }, g);
    var boxT = txt(g, xsep, wy + 4, 'open switch', 'strong', 'middle');
    var eDir = txt(g, xsep, wy - 24, '', 'cyan', 'middle');
    // our ion and the direction of travel inside
    var our = ourIon(g, xn1 + 16, 150, 5, 'our ion', true);
    var iDir = txt(g, xsep, ye0 + 18, '', 'amber', 'middle');
    var others = []; for (var i = 0; i < 6; i++) others.push({ x: xn1 + 20 + Math.random() * (xp0 - xn1 - 40), y: ye0 + 36 + (i % 3) * 30 + Math.random() * 8, c: el('circle', { r: 3.4, 'class': 'ion' }, g) });
    // the potential strip (polarization magnified so that it can be seen)
    var MAG = 4, sx0 = xn0, sw = xp1 - xn0, sy = 286, sh = 84;
    var strip = phiStrip(g, { x: sx0, y: sy, w: sw, h: sh }, [], { vmin: -1.3, vmax: 6.0, label: 'φ', units: 'V' });
    var fN = (xn1 - xn0) / sw, fP = (xp0 - xn0) / sw;
    var jL = txt(g, sx0 + fN * sw + 8, sy + sh - 6, '', 'phi', 'start'), jR = txt(g, sx0 + fP * sw - 8, sy + 12, '', 'phi', 'end'), slopeT = txt(g, sx0 + 0.5 * sw, sy + sh + 14, '', 'phi', 'middle');
    var VT = txt(g, 490, sy + 30, '', 'strong', 'middle'), VT2 = txt(g, 490, sy + 46, '', 'phi', 'middle');
    txt(g, 490, sy + 62, 'terminal', 'phi', 'middle');
    txt(g, sx0, sy + sh + 30, 'polarization drawn ' + MAG + ' × larger; split between the two jumps schematic', '', 'start');
    badge(g, sx0 + fN * sw - 14, sy + sh - 30, 1); badge(g, sx0 + 0.36 * sw, sy + sh - 18, 2); badge(g, sx0 + fP * sw + 16, sy + sh - 30, 3); badge(g, 490, sy + 8, 4); badge(g, 36, 150, 5);
    var mode = 'open', t = 0;
    function parts() { var c = +rateFromSlider(+rate.value), e = model.eta(c, 0.5, mode === 'charge'); return { c: c, e: e }; }
    function render() {
      var q = parts(), c = q.c, e = q.e, Voc = cellVoc(); setSvgText(rv, fmtRate(c));
      Array.prototype.forEach.call(mb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
      var s = mode === 'open' ? 0 : mode === 'discharge' ? -1 : 1; // sign of eta in the terminal voltage
      var ohm = mode === 'open' ? 0 : e.ohm, inter = mode === 'open' ? 0 : (e.act + e.conc) / 2;
      var j1 = 0.9, j2 = Voc - 0.9; // schematic split of Voc between the two interfaces (only the sum is measurable)
      var a = j1 + s * inter * MAG, slopeV = ohm * MAG, b = j2 + s * inter * MAG;
      // discharge: cations run left to right, so the electrolyte potential falls left to right; charge: the reverse
      var phiL = a, phiR = mode === 'discharge' ? a - slopeV : mode === 'charge' ? a + slopeV : a;
      strip.update([{ x: 0, phi: 0 }, { x: fN, phi: 0 }, { x: fN + 0.001, phi: phiL }, { x: fP, phi: phiR }, { x: fP + 0.001, phi: phiR + b }, { x: 1, phi: phiR + b }]);
      jL.setAttribute('y', strip.Y(0) + 15); jR.setAttribute('y', strip.Y(phiR + b / 2) + 4);
      setSvgText(jL, mode === 'open' ? 'jump' : (s < 0 ? 'smaller' : 'larger'));
      setSvgText(jR, mode === 'open' ? 'jump' : (s < 0 ? 'smaller' : 'larger'));
      setSvgText(slopeT, mode === 'open' ? 'flat: no current, no field in the liquid' : 'slope: ohmic drop, I·R = ' + mv(e.ohm));
      var V = Voc + s * e.total;
      setSvgText(VT, V.toFixed(2) + ' V'); setSvgText(VT2, mode === 'open' ? '= V_OC' : (s < 0 ? 'V_OC − η' : 'V_OC + η'));
      setSvgText(boxT, mode === 'open' ? 'open switch' : mode === 'discharge' ? 'lamp' : 'charger');
      box.setAttribute('stroke', mode === 'discharge' ? 'var(--amber)' : mode === 'charge' ? 'var(--cyan)' : 'var(--line-2)');
      setSvgText(eDir, mode === 'discharge' ? 'electrons → through the lamp' : mode === 'charge' ? '← electrons pushed by the charger' : '');
      setSvgText(iDir, mode === 'discharge' ? 'Li⁺ → toward the positive' : mode === 'charge' ? '← Li⁺ back to the negative' : 'no net motion');
      eflow.show(mode !== 'open'); eflow.setSpeed(mode === 'charge' ? -55 : 55);
      read.innerHTML = mode === 'open'
        ? 'Open circuit: no current, so the potential is flat through the liquid and the terminals show the full open-circuit voltage of your cell, <b>V<sub>OC</sub> = ' + Voc.toFixed(2) + ' V</b>, the sum of the two jumps.'
        : (mode === 'discharge' ? 'Discharging' : 'Charging') + ' at ' + fmtRate(c) + ': the liquid now carries a slope (ohmic drop ' + mv(e.ohm) + ') and each interface gives up, or demands, an overpotential (activation ' + mv(e.act) + ' and concentration ' + mv(e.conc) + ' in all). Total polarization η = <b>' + mv(e.total) + '</b>, so the terminals read <b>' + V.toFixed(2) + ' V</b>, ' + (s < 0 ? 'below' : 'above') + ' V<sub>OC</sub>.';
    }
    var loop = null;
    function tick(dt) {
      if (dt === 0) return;
      t += dt;
      if (mode === 'open') { our.move(xn1 + 16, 150); return; }
      var k = (t / 4) % 1, x = mode === 'discharge' ? lerp(xn1 + 14, xp0 - 14, k) : lerp(xp0 - 14, xn1 + 14, k);
      our.move(x, 150 + Math.sin(t * 2.2) * 6);
      others.forEach(function (p, j) { p.x += (mode === 'discharge' ? 1 : -1) * 16 * dt; if (p.x > xp0 - 10) p.x = xn1 + 10; if (p.x < xn1 + 10) p.x = xp0 - 10; p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y + Math.sin(t * 2 + j) * 3); });
      eflow.advance(dt);
    }
    others.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
    Array.prototype.forEach.call(mb, function (b) { on(b, 'click', function () { mode = b.getAttribute('data-mode'); t = 0; render(); }); });
    on(rate, 'input', render);
    steps(fig, [
      { text: 'Open circuit first. The potential <b>jumps</b> at each electrode-electrolyte boundary and is flat in between; the two jumps add up to V<sub>OC</sub>, as in module 1. Only their sum can be measured; the split drawn is schematic.', on: function () { if (mode !== 'open') { mode = 'open'; render(); } } },
      { text: 'Switch to <b>Discharge</b>. Our ion now moves through the liquid from the negative to the positive electrode, and moving ions through a resistance needs a field: the flat stretch becomes a <b>slope</b>, the ohmic drop I·R.', on: function () { if (mode === 'open') { mode = 'discharge'; render(); } } },
      { text: 'Each interface also has to be pushed off balance before its reaction runs at the rate the current demands: on discharge both <b>jumps shrink</b>. The shortfall is the <b>overpotential</b> of that electrode (activation, plus a concentration part when supply runs short).' },
      { text: 'Add it up along the path: the terminals read V<sub>OC</sub> − η on discharge. Switch to <b>Charge</b>: the charger drives everything backwards, the slope reverses, both jumps <b>grow</b>, and it must apply V<sub>OC</sub> + η.' },
      { text: '<b>Our ion</b> makes the trip in both directions: out of the negative electrode on discharge, back into it on charge. The electrons go round the outside, through the lamp or the charger, never through the liquid.' }
    ]);
    loop = anim(fig, tick, { autoplay: true, stepDt: 0.4, onPlay: function () { if (mode === 'open') { mode = 'discharge'; render(); } eflow.show(mode !== 'open'); } });
    cellListeners.push(render); render();
    bind(fig, { start: function () { loop.start(); }, stop: function () { loop.stop(); eflow.stop(); } });
  });

  /* ===== 5.3 The voltage curve, computed, with the polarization on the plot ===== */
  register('f5-3', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), probe = fig.querySelector('.probe'), pv = fig.querySelector('.probe-val'), sbtn = fig.querySelectorAll('button[data-shape]');
    var x0 = 50, x1 = 336, y0 = 256, y1 = 40, shape = shapeOfCell(), userShape = false;
    var ax = el('g', {}, g), heatD = el('path', { fill: 'var(--heat)', 'fill-opacity': '.2' }, g), heatC = el('path', { fill: 'var(--heat)', 'fill-opacity': '.2' }, g);
    // the breakdown panel: the polarization at the probe, drawn large
    var PX = 394, PW = 24, PY = 150, panel = el('g', {}, g);
    el('rect', { x: 350, y: 18, width: 162, height: 258, rx: 8, fill: 'rgba(234,240,236,.035)', stroke: 'var(--line)' }, g);
    var pTitle = txt(g, 431, 36, '', 'strong', 'middle');
    var vocP = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.4, 'stroke-dasharray': '4 4' }, g);
    var dis = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), ch = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.4 }, g);
    var cutHi = el('line', { stroke: 'var(--line-2)', 'stroke-dasharray': '6 4' }, g), cutLo = el('line', { stroke: 'var(--line-2)', 'stroke-dasharray': '6 4' }, g);
    var cutHiT = txt(g, x1, 0, '', '', 'end'), cutLoT = txt(g, x0 + 4, 0, '', '', 'start');
    var probeL = el('line', { stroke: 'var(--text)', 'stroke-opacity': '.35', 'stroke-dasharray': '2 3' }, g);
    var bars = el('g', {}, g), pm = [0, 1, 2].map(function (i) { return el('circle', { r: 4, fill: i === 0 ? 'var(--muted)' : i === 1 ? 'var(--amber)' : 'var(--cyan)', stroke: 'var(--bg)', 'stroke-width': 1.2 }, g); }), dot = el('circle', { r: 5.5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var dLab = txt(g, 0, 0, '← discharge', 'amber tag', 'end'), cLab = txt(g, 0, 0, 'charge →', 'cyan tag', 'start');
    var b1 = badge(g, 0, 0, 1), b2 = badge(g, 0, 0, 2), b3 = badge(g, 0, 0, 3), b4 = badge(g, 0, 0, 4);
    var vmin, vmax, X = function (s) { return x0 + s * (x1 - x0); }, Y = function (v) { return y0 - (v - vmin) / (vmax - vmin) * (y0 - y1); };
    function P(p) { return X(1 - p.x).toFixed(1) + ',' + Y(p.V).toFixed(1); }
    function line(pts, key) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + X(1 - p.x).toFixed(1) + ',' + Y(key ? p[key] : p.V).toFixed(1); }).join(' '); }
    var cy = null, play = { on: false, k: 0 };
    function drawAxes() {
      clear(ax);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, ax); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, ax);
      for (var v = Math.ceil(vmin * 2) / 2; v <= vmax + 1e-9; v += 0.5) { el('line', { x1: x0, y1: Y(v), x2: x1, y2: Y(v), stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, ax); txt(ax, x0 - 6, Y(v) + 4, v.toFixed(1), '', 'end'); }
      txt(ax, x0 - 6, y1 - 12, 'V', '', 'end');
      [0, 25, 50, 75, 100].forEach(function (pc) { el('line', { x1: X(pc / 100), y1: y0, x2: X(pc / 100), y2: y0 + 5, stroke: 'var(--line-2)' }, ax); txt(ax, X(pc / 100), y0 + 18, pc + ' %', '', 'middle'); });
      txt(ax, x1, y0 + 34, 'state of charge, % of low-rate capacity', '', 'end');
    }
    function render() {
      var c = rateFromSlider(+rate.value); setSvgText(rv, fmtRate(c));
      Array.prototype.forEach.call(sbtn, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-shape') === shape)); });
      var cut = model.cut(shape); vmin = shape === 'flat' ? 2.4 : 2.8; vmax = shape === 'flat' ? 4.1 : 4.4; drawAxes();
      cy = model.cycle(shape, c);
      var o = []; for (var i = 0; i <= 240; i++) o.push({ x: i / 240, V: model.voc(shape, i / 240) });
      vocP.setAttribute('d', line(o)); dis.setAttribute('d', line(cy.dis)); ch.setAttribute('d', line(cy.ch));
      heatD.setAttribute('d', line(cy.dis) + ' ' + line(cy.dis.slice().reverse(), 'voc').replace('M', 'L') + ' Z');
      heatC.setAttribute('d', line(cy.ch) + ' ' + line(cy.ch.slice().reverse(), 'voc').replace('M', 'L') + ' Z');
      [[cutHi, cut.hi, cutHiT, 'upper cut-off ' + cut.hi.toFixed(1) + ' V', -6], [cutLo, cut.lo, cutLoT, 'lower cut-off ' + cut.lo.toFixed(1) + ' V', 14]].forEach(function (r) { r[0].setAttribute('x1', x0); r[0].setAttribute('x2', x1); r[0].setAttribute('y1', Y(r[1])); r[0].setAttribute('y2', Y(r[1])); r[2].setAttribute('y', Y(r[1]) + r[4]); setSvgText(r[2], r[3]); });
      // branch labels
      var dm = cy.dis[Math.min(cy.dis.length - 1, Math.floor(240 * 0.12))], cm = cy.ch[Math.floor(cy.ch.length * 0.7)];
      dLab.setAttribute('x', X(1 - dm.x) - 4); dLab.setAttribute('y', Y(dm.V) + 18);
      cLab.setAttribute('x', Math.min(X(1 - cm.x) - 30, x1 - 70)); cLab.setAttribute('y', Y(cm.V) - 12);
      drawProbe();
      var dEnd = 1 - cy.dis[cy.dis.length - 1].x, cEnd = 1 - cy.ch[cy.ch.length - 1].x;
      b1.setAttribute('transform', 'translate(' + (X(1 - dm.x) - 14) + ',' + (Y(dm.V) + 36) + ')');
      b3.setAttribute('transform', 'translate(' + X(dEnd) + ',' + (Y(cut.lo) - 16) + ')');
      var hp = at(cy.dis, 0.38) || cy.dis[Math.floor(cy.dis.length / 2)]; b4.setAttribute('transform', 'translate(' + X(1 - hp.x) + ',' + ((Y(hp.V) + Y(hp.voc)) / 2) + ')');
      var heat = cy.heatDis + cy.heatCh;
      read.innerHTML = 'At ' + fmtRate(c) + ': the discharge stops at the lower cut-off after delivering <b>' + Math.round(cy.Qdis * 100) + ' %</b> of the low-rate capacity; the charge stops at the upper cut-off after taking in <b>' + Math.round(cy.Qch * 100) + ' %</b>. ' + probeText() + ' The two red areas, the energy turned into heat, add up to <b>' + Math.round(100 * heat / cy.Ech) + ' %</b> of the energy put in on charge.';
    }
    function at(pts, s) { // the point of a branch at state of charge s, or null
      for (var i = 1; i < pts.length; i++) { var a = 1 - pts[i - 1].x, b = 1 - pts[i].x; if ((s - a) * (s - b) <= 0) return pts[i]; }
      return null;
    }
    function probeText() {
      var s = +probe.value / 100, d = at(cy.dis, s), u = at(cy.ch, s), out = 'At ' + Math.round(s * 100) + ' % charge ';
      if (d && u) out += 'the gap between the branches is <b>' + mv(u.V - d.V) + '</b>: discharge η = ' + mv(d.eta.total) + ' (ohmic ' + mv(d.eta.ohm) + ', activation ' + mv(d.eta.act) + ', concentration ' + mv(d.eta.conc) + '), charge η = ' + mv(u.eta.total) + '.';
      else if (d) out += 'only the discharge reaches this far: η = ' + mv(d.eta.total) + '.';
      else if (u) out += 'only the charge reaches this far: η = ' + mv(u.eta.total) + '.';
      else out += 'neither branch reaches this state of charge at this rate.';
      return out;
    }
    function stack(p, up, sc) { // ohmic, activation, concentration, stacked away from the open-circuit level in the panel
      var base = 0, labs = [];
      [['ohm', p.eta.ohm, 'ohmic'], ['act', p.eta.act, 'activation'], ['conc', p.eta.conc, 'conc.']].forEach(function (r) {
        var a = PY - (up ? 1 : -1) * base * sc, b = PY - (up ? 1 : -1) * (base + r[1]) * sc, top = Math.min(a, b), h = Math.abs(a - b);
        el('rect', { x: PX, y: top, width: PW, height: Math.max(0.8, h), fill: C5[r[0]] }, panel);
        labs.push({ y: top + h / 2 + 4, t: r[2] + ' ' + Math.round(r[1] * 1000) });
        base += r[1];
      });
      // keep the three labels apart
      if (!up) labs.reverse();
      for (var i = 1; i < labs.length; i++) labs[i].y = Math.min(labs[i].y, labs[i - 1].y - 14);
      if (!up) { labs.reverse(); for (i = 1; i < labs.length; i++) labs[i].y = Math.max(labs[i].y, labs[i - 1].y + 14); }
      labs.forEach(function (l) { txt(panel, PX + PW + 6, Math.max(68, Math.min(254, l.y)), l.t, '', 'start'); });
      txt(panel, 431, up ? 54 : 268, (up ? 'charge +' : 'discharge −') + mv(base), up ? 'cyan' : 'amber', 'middle');
    }
    function drawProbe() {
      clear(bars); clear(panel); var s = +probe.value / 100; setSvgText(pv, Math.round(s * 100) + ' %');
      probeL.setAttribute('x1', X(s)); probeL.setAttribute('x2', X(s)); probeL.setAttribute('y1', y1); probeL.setAttribute('y2', y0);
      var d = at(cy.dis, s), u = at(cy.ch, s), o = model.voc(shape, 1 - s);
      setSvgText(pTitle, 'at ' + Math.round(s * 100) + ' % charge');
      var mx = Math.max(d ? d.eta.total : 0, u ? u.eta.total : 0, 0.04), sc = 84 / mx;
      el('line', { x1: 356, x2: 506, y1: PY, y2: PY, stroke: 'var(--muted)', 'stroke-dasharray': '4 4' }, panel);
      txt(panel, PX - 4, PY + 4, 'rest', '', 'end'); txt(panel, 506, PY + 4, 'mV', '', 'end');
      if (u) stack(u, true, sc); if (d) stack(d, false, sc);
      if (!u && !d) txt(panel, 432, PY + 22, 'not reached', '', 'middle');
      [[o, 0], [d && d.V, 1], [u && u.V, 2]].forEach(function (r, i) { pm[i].style.display = r[0] ? '' : 'none'; if (r[0]) { pm[i].setAttribute('cx', X(s)); pm[i].setAttribute('cy', Y(r[0])); } });
      b2.setAttribute('transform', 'translate(' + (PX - 22) + ',' + (PY + 48) + ')');
    }
    function placeDot() {
      var all = cy.dis.concat(cy.ch), n = all.length, k = Math.min(n - 1, Math.floor(play.k * n)), p = all[k];
      dot.setAttribute('cx', X(1 - p.x)); dot.setAttribute('cy', Y(p.V));
    }
    on(rate, 'input', render); on(probe, 'input', function () { drawProbe(); render(); });
    Array.prototype.forEach.call(sbtn, function (b) { on(b, 'click', function () { shape = b.getAttribute('data-shape'); userShape = true; render(); placeDot(); }); });
    cellListeners.push(function () { if (!userShape) { shape = shapeOfCell(); render(); placeDot(); } });
    steps(fig, [
      { text: 'The <b>amber</b> branch is a discharge at constant current from a full cell, read right to left; the <b>cyan</b> branch a charge from an empty one, left to right. The dashed grey line is the open-circuit voltage: where the cell would rest at each state of charge.' },
      { text: 'Move the probe. The panel on the right enlarges the gap at that state of charge: how far the charge sits <b>above</b> the resting voltage and the discharge <b>below</b> it, each split into <b>ohmic</b> (lilac), <b>activation</b> (amber) and <b>concentration</b> (cyan).' },
      { text: 'Slide the rate up. Every bar grows, the branches move apart, and the discharge hits the <b>lower cut-off</b> earlier: capacity is lost at high rate, mostly to the concentration part, which shoots up near the end.' },
      { text: 'The <b>red areas</b> between each branch and the dashed line are energy turned into heat: the integral of η over the charge passed. Figure 5.12 follows that heat in time.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) { placeDot(); return; } play.k = (play.k + dt / 9) % 1; placeDot(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 5.4 Switch the current off: three clocks ===== */
  register('f5-4', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val');
    var xb0 = 62, xb1 = 118, x0 = 130, x1 = 486, y0 = 232, y1 = 44, tmin = -7, tmax = 2;
    var X = function (lt) { return x0 + (lt - tmin) / (tmax - tmin) * (x1 - x0); };
    var TA = 1e-3, TC = 1; // illustrative time constants inside the ranges of Winter and Brodd 1.4
    // bands for the source's time ranges
    el('rect', { x: X(-4), y: y1, width: X(-2) - X(-4), height: y0 - y1, fill: C5.act, 'fill-opacity': '.08' }, g);
    el('rect', { x: X(-2), y: y1, width: x1 - X(-2), height: y0 - y1, fill: C5.conc, 'fill-opacity': '.07' }, g);
    var ax = el('g', {}, g), curve = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), pre = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    var jump = el('line', { stroke: C5.ohm, 'stroke-width': 3 }, g), cursor = el('line', { y1: y1, y2: y0, stroke: 'var(--text)', 'stroke-opacity': '.4' }, g);
    el('line', { x1: xb1 + 6, x2: xb1 + 6, y1: y1 - 8, y2: y0, stroke: 'var(--text)', 'stroke-dasharray': '3 3' }, g);
    txt(g, xb1 + 6, y1 - 14, 'current off', 'strong', 'middle');
    txt(g, (xb0 + xb1) / 2, y0 + 18, 'before', '', 'middle');
    var lO = txt(g, X(-6.6), 0, 'ohmic: under 10⁻⁶ s', 'field', 'start'), lA = txt(g, X(-3), y1 + 14, 'activation: 10⁻⁴ to 10⁻² s', 'amber', 'middle'), lC = txt(g, X(0), y1 + 30, 'concentration: 10⁻² s and longer', 'cyan', 'middle');
    var lV = txt(g, xb0 + 2, 0, 'under load', '', 'start');
    badge(g, (xb0 + xb1) / 2, y0 - 16, 1); var bO = badge(g, X(-6.2), 0, 2); badge(g, X(-3), y1 + 36, 3); badge(g, X(0.6), y1 + 54, 4);
    var e, H, Y, tNow = tmax;
    function Vt(t) { return -(e.act * Math.exp(-t / TA) + e.conc * Math.exp(-t / TC)); } // the ohmic part has gone within 1e-6 s: drawn as the step at switch-off
    function render() {
      var c = rateFromSlider(+rate.value); setSvgText(rv, fmtRate(c));
      e = model.eta(c, 0.5, false); H = Math.max(0.05, e.total * 1.15);
      Y = function (v) { return y1 + (-v) / H * (y0 - y1); }; // 0 (V_OC) at the top, -H at the bottom
      clear(ax);
      el('line', { x1: xb0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, ax); el('line', { x1: xb0, y1: y0, x2: xb0, y2: y1, stroke: 'var(--line-2)' }, ax);
      for (var k = tmin; k <= tmax; k++) { el('line', { x1: X(k), y1: y0, x2: X(k), y2: y0 + 5, stroke: 'var(--line-2)' }, ax); if ((k - tmin) % 2 === 0 || k === tmax) txt(ax, X(k), y0 + 18, '10' + sup(k), '', 'middle'); }
      txt(ax, x1, y0 + 34, 'time after the current is switched off, s (log scale)', '', 'end');
      var st = niceStep(H * 1000, 4) / 1000;
      for (var v = 0; v <= H + 1e-9; v += st) { el('line', { x1: xb0, y1: Y(-v), x2: x1, y2: Y(-v), stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, ax); txt(ax, xb0 - 6, Y(-v) + 4, v === 0 ? 'V_OC' : '−' + Math.round(v * 1000), '', 'end'); }
      txt(ax, xb0 - 6, y1 - 14, 'mV', '', 'end');
      pre.setAttribute('d', 'M' + xb0 + ',' + Y(-e.total) + ' H' + (xb1 + 6));
      jump.setAttribute('x1', xb1 + 6); jump.setAttribute('x2', xb1 + 6); jump.setAttribute('y1', Y(-e.total)); jump.setAttribute('y2', Y(-(e.act + e.conc)));
      lV.setAttribute('y', Y(-e.total) - 8); lO.setAttribute('y', Y(-(e.act + e.conc)) + 18); bO.setAttribute('transform', 'translate(' + (xb1 - 8) + ',' + Y(-(e.ohm / 2 + e.act + e.conc)) + ')');
      draw();
    }
    function draw() {
      var d = 'M' + (xb1 + 6) + ',' + Y(-(e.act + e.conc));
      for (var i = 0; i <= 300; i++) { var lt = tmin + (tmax - tmin) * i / 300; if (lt > tNow) break; d += ' L' + X(lt).toFixed(1) + ',' + Y(Vt(Math.pow(10, lt))).toFixed(1); }
      curve.setAttribute('d', d); cursor.setAttribute('x1', X(tNow)); cursor.setAttribute('x2', X(tNow));
      var t = Math.pow(10, tNow), left = -Vt(t);
      read.innerHTML = 'Before: the cell was discharging at ' + fmtRate(rateFromSlider(+rate.value)) + ', <b>' + mv(e.total) + '</b> below V<sub>OC</sub>. ' + (tNow >= tmax - 1e-6 ? 'After switching off, the ' + mv(e.ohm) + ' ohmic part vanished at once, the ' + mv(e.act) + ' activation part within milliseconds, and the ' + mv(e.conc) + ' concentration part over seconds.' : 'At t = ' + sci(t, 1) + ' s, ' + mv(left) + ' of it remains.');
    }
    on(rate, 'input', render);
    steps(fig, [
      { text: 'On the left the cell is <b>under load</b>: discharging, its voltage sits η below the open-circuit value. Then the current is switched off and the clock starts. The time axis is logarithmic: each tick is ten times longer than the one before.' , on: function () { tNow = tmin; if (e) draw(); } },
      { text: 'The <b>ohmic</b> part disappears at once, within a microsecond: no current, no I·R drop. The lilac step is its size.' , on: function () { tNow = -6; if (e) draw(); } },
      { text: 'The <b>activation</b> part relaxes next, between 10⁻⁴ and 10⁻² s, as the two interfaces return to equilibrium.' , on: function () { tNow = -2.5; if (e) draw(); } },
      { text: 'The <b>concentration</b> part is slowest, 10⁻² s and longer: the ions piled up or depleted near the electrodes have to diffuse back. Interrupting the current and timing the recovery is how the three parts are told apart in the lab.' , on: function () { tNow = tmax; if (e) draw(); } }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; tNow += dt * 2.2; if (tNow > tmax + 1.6) tNow = tmin; draw(); }, { autoplay: true, stepDt: 0.5, onPlay: function () { if (tNow >= tmax) tNow = tmin; } });
    bind(fig, loop);
  });

  /* ===== 5.10 Cycle life and Coulombic efficiency ===== */
  register('f5-10', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), ce = fig.querySelector('.ce'), cv = fig.querySelector('.ce-val'), read = fig.querySelector('.readout');
    var x0 = 62, y0 = 228, x1 = 470, y1 = 30, N = 1000;
    var X = function (n) { return x0 + n / N * (x1 - x0); }, Y = function (r) { return y0 - (r - 0.4) / 0.6 * (y0 - y1); };
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    [0, 250, 500, 750, 1000].forEach(function (n) { el('line', { x1: X(n), y1: y0, x2: X(n), y2: y0 + 5, stroke: 'var(--line-2)' }, g); txt(g, X(n), y0 + 18, n, '', 'middle'); });
    [0.4, 0.6, 0.8, 1].forEach(function (r) { el('line', { x1: x0, y1: Y(r), x2: x1, y2: Y(r), stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); txt(g, x0 - 6, Y(r) + 4, Math.round(r * 100) + ' %', '', 'end'); });
    txt(g, x1, y0 + 34, 'cycle number', '', 'end'); txt(g, x0 - 6, y1 - 12, 'capacity kept', '', 'start');
    el('line', { x1: x0, y1: Y(0.8), x2: x1, y2: Y(0.8), stroke: 'var(--amber)', 'stroke-dasharray': '5 4' }, g);
    txt(g, x1, Y(0.8) - 6, '80 %: end of cycle life', 'amber', 'end');
    el('line', { x1: X(300), y1: y0, x2: X(300), y2: y1, stroke: 'var(--cyan)', 'stroke-dasharray': '5 4' }, g);
    txt(g, X(300) + 6, Y(0.46), 'at least 300 cycles', 'cyan', 'start'); txt(g, X(300) + 6, Y(0.46) + 15, 'for a commercial cell', 'cyan', 'start');
    [0.995, 0.999, 0.9999].forEach(function (c) {
      var d = ''; for (var n = 0; n <= N; n += 5) { var rr = Math.pow(c, n); if (rr < 0.4) break; d += (n ? 'L' : 'M') + X(n).toFixed(1) + ',' + Y(rr).toFixed(1); }
      el('path', { d: d, fill: 'none', stroke: 'var(--muted)', 'stroke-opacity': '.55', 'stroke-dasharray': '2 3' }, g);
    });
    txt(g, X(150), Y(Math.pow(0.995, 150)) + 16, '99.5 %', '', 'start'); txt(g, X(620), Y(Math.pow(0.999, 620)) + 16, '99.9 %', '', 'start'); txt(g, X(880), Y(Math.pow(0.9999, 880)) + 16, '99.99 %', '', 'middle');
    var line = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), mk = el('circle', { r: 5, fill: 'var(--amber)', stroke: 'var(--bg)' }, g);
    badge(g, x1 - 14, Y(0.8) + 18, 1); badge(g, X(300) - 16, y1 + 14, 2); badge(g, X(60), Y(0.97) + 22, 3);
    function cOf() { return 0.99 + 0.0001 * (+ce.value); }
    function render() {
      var c = cOf(); setSvgText(cv, (c * 100).toFixed(2) + ' %');
      var d = ''; for (var n = 0; n <= N; n += 5) { var rr = Math.pow(c, n); if (rr < 0.4) break; d += (n ? 'L' : 'M') + X(n).toFixed(1) + ',' + Y(rr).toFixed(1); } line.setAttribute('d', d);
      var n80 = Math.log(0.8) / Math.log(c); mk.setAttribute('cx', X(Math.min(N, n80))); mk.setAttribute('cy', Y(n80 <= N ? 0.8 : Math.pow(c, N)));
      read.innerHTML = 'If ' + (100 - c * 100).toFixed(2) + ' % of the charge were lost for good every cycle, the capacity would fall to 80 % after <b>' + Math.round(n80) + ' cycles</b>, which ' + (n80 >= 300 ? 'meets' : 'fails') + ' the 300-cycle requirement. To last 300 cycles this way the efficiency must be at least <b>99.93 %</b>.';
    }
    on(ce, 'input', render);
    steps(fig, [
      { text: 'The amber line is the capacity kept after N cycles if a fixed fraction of the charge is lost for good on every cycle: retention = CE<sup>N</sup>. The dashed amber line is <b>end of life</b>, 80 % of the initial capacity.' },
      { text: 'The dashed cyan line is the 2004 requirement for a commercial rechargeable cell: <b>at least 300 full cycles</b> with less than 20 % loss.' },
      { text: 'The grey dotted lines are fixed references at 99.5, 99.9 and 99.99 % for comparison. Slide the efficiency: 99.9 % sounds excellent and still fails. Real cells are not this simple (a later module says why), so read the curve as arithmetic, not as a prediction.' }
    ]);
    render();
  });

  /* ===== 5.11 Heat through one cycle ===== */
  register('f5-11', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), sb = fig.querySelectorAll('button[data-sign]');
    var x0 = 62, x1 = 470, y0 = 224, y1 = 36, sign = 1, dUdT = 0.2e-3; // illustrative magnitude, V/K
    var ax = el('g', {}, g), irr = el('path', { fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2.2 }, g), rev = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.2 }, g), tot = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.6, 'stroke-dasharray': '5 3' }, g);
    var divL = el('line', { stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' }, g), dT = txt(g, 0, y1 + 10, 'discharge', 'amber', 'middle'), cT = txt(g, 0, y1 + 10, 'charge', 'cyan', 'middle');
    var b1 = badge(g, 0, 0, 1), b2 = badge(g, 0, 0, 2), b3 = badge(g, 0, 0, 3);
    function render() {
      var c = rateFromSlider(+rate.value), shape = shapeOfCell(); setSvgText(rv, fmtRate(c));
      Array.prototype.forEach.call(sb, function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-sign') === sign)); });
      var cy = model.cycle(shape, c), td = cy.Qdis / c, tc = cy.Qch / c, T = td + tc;
      var TdU = P.T0 * dUdT * sign;
      // Bernardi: Q = I(U - V) - I T dU/dT with I > 0 on discharge (W per Ah of capacity when I is in C-rate)
      var pts = []; cy.dis.forEach(function (p, i) { pts.push({ t: (p.x - cy.dis[0].x) / c, irr: c * p.eta.total, rev: -c * TdU }); });
      cy.ch.forEach(function (p) { pts.push({ t: td + (cy.ch[0].x - p.x) / c, irr: c * p.eta.total, rev: c * TdU }); });
      var hi = 0, lo = 0; pts.forEach(function (p) { hi = Math.max(hi, p.irr + Math.max(0, p.rev), p.irr, p.rev); lo = Math.min(lo, p.rev, p.irr + p.rev); });
      hi = Math.min(hi, c * 1.2); var span = hi - lo, st = niceStep(span, 4); hi = Math.ceil(hi / st) * st; lo = Math.floor(lo / st) * st;
      var X = function (t) { return x0 + t / T * (x1 - x0); }, Y = function (q) { return y0 - (q - lo) / (hi - lo) * (y0 - y1); };
      clear(ax);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, ax); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, ax);
      for (var q = lo; q <= hi + 1e-9; q += st) { el('line', { x1: x0, y1: Y(q), x2: x1, y2: Y(q), stroke: q === 0 ? 'var(--line-2)' : 'var(--line)', 'stroke-dasharray': q === 0 ? '' : '2 5' }, ax); txt(ax, x0 - 6, Y(q) + 4, (Math.abs(q) < 1e-9 ? '0' : q.toFixed(st < 0.01 ? 3 : st < 0.1 ? 2 : 1)), '', 'end'); }
      txt(ax, x0 - 6, y1 - 14, 'W per Ah', '', 'start');
      var ts = niceStep(T, 5); for (var t = 0; t <= T + 1e-9; t += ts) { el('line', { x1: X(t), y1: y0, x2: X(t), y2: y0 + 5, stroke: 'var(--line-2)' }, ax); txt(ax, X(t), y0 + 18, (ts < 1 ? t.toFixed(ts < 0.1 ? 2 : 1) : Math.round(t)), '', 'middle'); }
      txt(ax, x1, y0 + 34, 'time, hours (discharge, then charge)', '', 'end');
      txt(ax, x1, Y(0) - 6, 'released ↑', '', 'end'); txt(ax, x1, Y(0) + 16, 'absorbed ↓', '', 'end');
      function path(key) { return pts.map(function (p, i) { var v = key === 'tot' ? p.irr + p.rev : p[key]; return (i ? 'L' : 'M') + X(p.t).toFixed(1) + ',' + Y(Math.max(lo, Math.min(hi, v))).toFixed(1); }).join(' '); }
      irr.setAttribute('d', path('irr')); rev.setAttribute('d', path('rev')); tot.setAttribute('d', path('tot'));
      divL.setAttribute('x1', X(td)); divL.setAttribute('x2', X(td)); divL.setAttribute('y1', y1); divL.setAttribute('y2', y0);
      dT.setAttribute('x', X(td / 2)); cT.setAttribute('x', X(td + tc / 2));
      var mid = pts[Math.floor(cy.dis.length / 2)];
      b1.setAttribute('transform', 'translate(' + X(mid.t) + ',' + (Y(mid.irr) - 16) + ')');
      b2.setAttribute('transform', 'translate(' + X(mid.t * 0.5) + ',' + (Y(mid.rev) + (mid.rev < 0 ? 18 : -16)) + ')');
      b3.setAttribute('transform', 'translate(' + X(td) + ',' + (y1 + 26) + ')');
      var irrWh = cy.heatDis + cy.heatCh, revD = -TdU * cy.Qdis, revC = TdU * cy.Qch;
      read.innerHTML = 'One cycle at ' + fmtRate(c) + ' (' + (td).toFixed(td < 1 ? 2 : 1) + ' h out, ' + tc.toFixed(tc < 1 ? 2 : 1) + ' h back). Irreversible heat: <b>' + irrWh.toFixed(3) + ' Wh per Ah</b>, always released: the same quantity as the two red areas of figure 5.3 for the same cell shape. Entropic heat: ' + (revD >= 0 ? 'released' : 'absorbed') + ' ' + Math.abs(revD).toFixed(3) + ' Wh/Ah on discharge, ' + (revC >= 0 ? 'released' : 'absorbed') + ' ' + Math.abs(revC).toFixed(3) + ' on charge: over a full cycle it ' + (Math.abs(revD + revC) < 0.002 ? 'cancels.' : 'does not quite cancel (the discharge passed ' + cy.Qdis.toFixed(2) + ' and the charge ' + cy.Qch.toFixed(2) + ' of the low-rate capacity).');
    }
    on(rate, 'input', render);
    Array.prototype.forEach.call(sb, function (b) { on(b, 'click', function () { sign = +b.getAttribute('data-sign'); render(); }); });
    cellListeners.push(render);
    steps(fig, [
      { text: 'The <b>red</b> line is irreversible heat, current times polarization, I·η. It is released on charge and on discharge alike, and since η itself grows with the current, it grows faster than the current does.' },
      { text: 'The <b>cyan</b> line is the reversible, entropic heat, −I·T·dE/dT. Its size follows the current, and its sign flips when the current reverses: with dE/dT positive the cell cools on discharge and warms on charge (nickel-cadmium); with dE/dT negative, the reverse (lead-acid).' },
      { text: 'The dashed line is the total. Slide the rate down to C/10: the entropic part then outweighs the irreversible one. Slide it up to 5C: the irreversible part takes over.' }
    ]);
    render();
  });

  /* =================================================================
     Module 5, the detailed charge and discharge figures: the test bench
     (5.1), battery against capacitor (5.5), the phase rule rebuilt on a
     measured open-circuit curve (5.6), many LiFePO4 particles (5.7), porosity
     and tortuosity (5.8), inside a porous electrode (5.9) and reading a curve
     by its derivatives (5.10).
     Sources: Olson, López and Dickinson 2023 (R60); Moya 2025 (R61); Safari
     and Delacourt 2011 (R59); Doyle, Fuller and Newman 1993 (R62); Winter and
     Brodd 2004 (R1); Landesfeind et al. 2016 (R74). Shared helpers come from figs-45.js and figs-5.js.
     ================================================================= */
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

  /* ===== 5.1 The test bench: constant current, cut-offs, constant voltage ===== */
  register('f5-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val');
    var CAP = 2.0; // Ah, the illustrative cell's low-rate capacity
    // --- the cell and the cycler ---
    var cx0 = 24, cx1 = 242, cy0 = 64, cy1 = 120, xn = 76, xp = 190, xs = 133;
    el('rect', { x: cx0, y: cy0, width: xn - cx0, height: cy1 - cy0, rx: 3, fill: 'var(--cyan)', 'fill-opacity': '.22', stroke: 'var(--cyan)', 'stroke-opacity': '.6' }, g);
    el('rect', { x: xn, y: cy0, width: xp - xn, height: cy1 - cy0, fill: 'var(--cyan)', 'fill-opacity': '.07', stroke: 'var(--line-2)' }, g);
    el('rect', { x: xp, y: cy0, width: cx1 - xp, height: cy1 - cy0, rx: 3, fill: 'var(--amber)', 'fill-opacity': '.2', stroke: 'var(--amber)', 'stroke-opacity': '.6' }, g);
    el('line', { x1: xs, y1: cy0 + 3, x2: xs, y2: cy1 - 3, stroke: 'var(--cyan)', 'stroke-dasharray': '3 4', 'stroke-opacity': '.7' }, g);
    txt(g, (cx0 + xn) / 2, cy1 + 15, 'negative', '', 'middle'); txt(g, (xn + xp) / 2, cy1 + 15, 'electrolyte', '', 'middle'); txt(g, (xp + cx1) / 2, cy1 + 15, 'positive', '', 'middle');
    el('rect', { x: 78, y: 10, width: 110, height: 26, rx: 5, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    txt(g, 133, 27, 'cycler', 'strong', 'middle');
    var wire = [[50, cy0], [50, 23], [78, 23], [188, 23], [216, 23], [216, cy0]];
    el('path', { d: polyD(wire.map(function (p) { return p[0]; }), wire.map(function (p) { return p[1]; })), fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 2 }, g);
    txt(g, 38, 50, '−', 'strong big', 'middle'); txt(g, 228, 50, '+', 'strong big', 'middle');
    var segL = [], wl = 0; for (var i = 1; i < wire.length; i++) { var l = Math.hypot(wire[i][0] - wire[i - 1][0], wire[i][1] - wire[i - 1][1]); segL.push(l); wl += l; }
    function along(s) { s = ((s % 1) + 1) % 1 * wl; for (var k = 0; k < segL.length; k++) { if (s <= segL[k]) { var f = s / segL[k]; return [lerp(wire[k][0], wire[k + 1][0], f), lerp(wire[k][1], wire[k + 1][1], f)]; } s -= segL[k]; } return wire[wire.length - 1]; }
    var eDots = [], liDots = [], NE = 9, NL = 7;
    for (i = 0; i < NE; i++) eDots.push({ s: i / NE, e: el('circle', { r: 3, 'class': 'e-dot' }, g) });
    for (i = 0; i < NL; i++) liDots.push({ s: i / NL, y: cy0 + 9 + (i * 37 % (cy1 - cy0 - 18)), e: el('circle', { r: 3.6, 'class': 'ion' }, g) });
    var arrE = el('g', {}, g), arrL = el('g', {}, g);
    // --- the meter panel ---
    var mx = 270;
    var mPh = txt(g, mx, 26, '', 'strong'), mI = txt(g, mx, 52, '', 'amber big'), mV = txt(g, mx, 76, '', 'cyan big'), mQ = txt(g, mx, 100, '', 'strong'), mT = txt(g, mx, 122, '', '');
    // --- the two plots ---
    var b1 = { x0: 60, y0: 264, x1: 500, y1: 174 }, b2 = { x0: 60, y0: 346, x1: 500, y1: 292 };
    var axV = el('g', {}, g), axI = el('g', {}, g), bands = el('g', {}, g);
    var pV0 = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-opacity': '.35', 'stroke-width': 1.4 }, g), pV = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    var pI0 = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-opacity': '.35', 'stroke-width': 1.4 }, g), pIs = [el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, g), el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g), el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2 }, g)];
    var cur = el('line', { y1: b1.y1, y2: b2.y0, stroke: 'var(--amber)', 'stroke-opacity': '.6' }, g);
    var cutLines = el('g', {}, g);
    badge(g, 133, 52, 1); badge(g, 258, 92, 2); badge(g, 488, 214, 3); badge(g, 488, 302, 4);
    var tr = [], tEnd = 1, sh = 'slope', c = 1, k = 0, phases = ['Discharge at constant current', 'Rest, no current', 'Charge at constant current', 'Charge at constant voltage', 'Rest, no current'];
    function vocB(x) { return model.voc(sh, x) + wallA * Math.exp(-x / 0.015); }
    var wallA = 0;
    function build() {
      sh = shapeOfCell(); c = rateFromSlider(+rate.value); setSvgText(rv, fmtRate(c));
      var cut = model.cut(sh); wallA = Math.max(0, cut.hi + 0.03 - model.voc(sh, 0));
      var x = 0; while (vocB(x) > cut.hi - 0.03 && x < 0.2) x += 0.0005; // the "full" cell rests 30 mV below the upper cut-off
      var xFull = x, dx = 1 / 260, dt = dx / c, t = 0, q0 = x, V;
      tr = [];
      function push(ph, I, V) { tr.push({ t: t, V: V, I: I, x: x, ph: ph, q: CAP * Math.abs(x - q0) }); }
      push(1, 0, vocB(x));
      for (var n = 0; n < 2000; n++) { V = vocB(x) - model.eta(c, x, false).total; if (n && V < cut.lo) break; push(0, -c, V); x += dx; t += dt; if (x > 1.02) break; }
      var tr1 = Math.max(0.12, 0.12 / c), t1 = t; q0 = x;
      for (; t < t1 + tr1; t += tr1 / 30) push(1, 0, vocB(x));
      q0 = x;
      for (n = 0; n < 2000; n++) { V = vocB(x) + model.eta(c, x, true).total; if (V >= cut.hi) break; push(2, c, V); x -= dx; t += dt; }
      q0 = x;
      for (n = 0; n < 4000; n++) { // constant voltage: find the current that holds V at the cut-off
        var lo = 0, hi = c; for (var m = 0; m < 40; m++) { var mid = 0.5 * (lo + hi); if (vocB(x) + model.eta(mid, x, true).total > cut.hi) hi = mid; else lo = mid; }
        push(3, lo, cut.hi); if (lo <= 0.05) break; x -= lo * dt; t += dt;
      }
      var t2 = t; q0 = x;
      for (; t <= t2 + tr1 + 1e-9; t += tr1 / 30) push(4, 0, vocB(x));
      tEnd = t; cutLines.innerHTML = ''; axV.innerHTML = ''; axI.innerHTML = ''; bands.innerHTML = '';
      var vlo = cut.lo - 0.2, vhi = cut.hi + 0.25;
      var X = function (tt) { return b1.x0 + tt / tEnd * (b1.x1 - b1.x0); }, YV = function (v) { return b1.y0 - (v - vlo) / (vhi - vlo) * (b1.y0 - b1.y1); }, YI = function (ii) { return (b2.y0 + b2.y1) / 2 - ii / (1.25 * c) * (b2.y0 - b2.y1) / 2; };
      fig._X = X; fig._YV = YV; fig._YI = YI;
      var tick = []; for (var v = Math.ceil(vlo * 2) / 2; v <= vhi; v += 0.5) tick.push(v);
      plotAxes(axV, b1, { yt: tick, ylo: vlo, yhi: vhi, yf: function (v) { return v.toFixed(1); }, ylab: 'voltage V, volts' });
      el('line', { x1: b2.x0, y1: b2.y0, x2: b2.x0, y2: b2.y1, stroke: 'var(--line-2)' }, axI);
      el('line', { x1: b2.x0, y1: YI(0), x2: b2.x1, y2: YI(0), stroke: 'var(--line-2)' }, axI);
      txt(axI, b2.x0 - 5, YI(c) + 4, '+' + fmtRate(c), '', 'end'); txt(axI, b2.x0 - 5, YI(-c) + 4, '−' + fmtRate(c), '', 'end');
      txt(axI, b2.x0 + 4, b2.y1 - 4, 'current I: + charging, − discharging', '', 'start');
      var hstep = niceStep(tEnd, 5); for (var h = 0; h <= tEnd + 1e-9; h += hstep) { el('line', { x1: X(h), y1: b2.y0, x2: X(h), y2: b2.y0 + 4, stroke: 'var(--line-2)' }, axI); txt(axI, X(h), b2.y0 + 15, (hstep < 1 ? h.toFixed(1) : String(Math.round(h))), '', 'middle'); }
      txt(axI, b2.x1, b2.y0 + 30, 'time, hours', '', 'end');
      [cut.lo, cut.hi].forEach(function (v, j) { el('line', { x1: b1.x0, x2: b1.x1, y1: YV(v), y2: YV(v), stroke: 'var(--heat)', 'stroke-dasharray': '5 4', 'stroke-opacity': '.8' }, cutLines); txt(cutLines, j ? b1.x0 + 24 : b1.x1 - 4, YV(v) - 4, (j ? 'upper' : 'lower') + ' cut-off, ' + v.toFixed(1) + ' V', 'heat', j ? 'start' : 'end'); });
      // phase bands
      var start = 0; for (var j = 1; j <= tr.length; j++) {
        if (j === tr.length || tr[j].ph !== tr[start].ph) {
          var ph = tr[start].ph, xa = X(tr[start].t), xb = X(tr[j - 1].t);
          if (ph !== 0 && ph !== 2) el('rect', { x: xa, y: b1.y1, width: Math.max(1, xb - xa), height: b2.y0 - b1.y1, fill: ph === 3 ? 'var(--cyan)' : 'var(--muted)', 'fill-opacity': ph === 3 ? '.10' : '.07' }, bands);
          start = j;
        }
      }
      var xsArr = tr.map(function (p) { return X(p.t); });
      pV0.setAttribute('d', polyD(xsArr, tr.map(function (p) { return YV(p.V); }))); pI0.setAttribute('d', polyD(xsArr, tr.map(function (p) { return YI(p.I); })));
      k = 0; place();
    }
    function place() {
      var p = tr[k], X = fig._X, sub = tr.slice(0, k + 1), xsArr = sub.map(function (q) { return X(q.t); });
      pV.setAttribute('d', polyD(xsArr, sub.map(function (q) { return fig._YV(q.V); })));
      pIs.forEach(function (pp, j) { var d = ''; sub.forEach(function (q, i) { var c = q.I < 0 ? 0 : q.I > 0 ? 2 : 1; if (c !== j) return; var prev = i && (sub[i - 1].I < 0 ? 0 : sub[i - 1].I > 0 ? 2 : 1) === j; d += (prev ? 'L' : 'M') + xsArr[i].toFixed(1) + ',' + fig._YI(q.I).toFixed(1); }); pp.setAttribute('d', d); });
      cur.setAttribute('x1', X(p.t)); cur.setAttribute('x2', X(p.t));
      var amps = Math.abs(p.I) * CAP, hh = Math.floor(p.t), mm = Math.round((p.t - hh) * 60); if (mm === 60) { hh++; mm = 0; }
      setSvgText(mPh, phases[p.ph]);
      setSvgText(mI, 'I = ' + (p.I < 0 ? '−' : p.I > 0 ? '+' : '') + amps.toFixed(2) + ' A');
      setSvgText(mV, 'V = ' + p.V.toFixed(3) + ' V');
      setSvgText(mQ, 'Q this step = ' + p.q.toFixed(2) + ' Ah');
      setSvgText(mT, 't = ' + hh + ' h ' + (mm < 10 ? '0' : '') + mm + ' min');
      arrE.innerHTML = ''; arrL.innerHTML = '';
      var dir = p.I < 0 ? 1 : p.I > 0 ? -1 : 0;
      if (dir) { arrow(arrE, dir > 0 ? 100 : 166, 44, dir > 0 ? 166 : 100, 44, 'var(--electron)', 1.6); arrow(arrL, dir > 0 ? 112 : 154, cy1 - 6, dir > 0 ? 154 : 112, cy1 - 6, 'var(--cation)', 1.6); }
      var mode = p.ph === 3 ? 'the voltage is held at the upper cut-off and the current tapers' : p.ph === 1 || p.ph === 4 ? 'the voltage settles to the open-circuit value' : p.ph === 0 ? 'lithium ions and electrons leave the negative electrode' : 'the cycler drives lithium ions and electrons back to the negative electrode';
      read.innerHTML = '<b>' + phases[p.ph] + '</b>: ' + mode + '. ' + (p.I === 0 ? 'No current' : 'Current ' + amps.toFixed(2) + ' A on a ' + CAP.toFixed(1) + ' Ah cell, a rate of ' + fmtRate(Math.abs(p.I))) + '. Charge passed in this step, ' + (p.ph === 3 ? 'Q = ∫I dt' : 'Q = I·t') + ' = <b>' + p.q.toFixed(2) + ' Ah</b>.';
    }
    var phase = 0;
    function flowTick(dt) {
      var p = tr[k], dir = p.I < 0 ? 1 : p.I > 0 ? -1 : 0, sp = dir * (0.12 + 0.08 * Math.min(3, Math.abs(p.I)));
      eDots.forEach(function (d) { d.s += sp * dt; var q = along(d.s); d.e.setAttribute('cx', q[0]); d.e.setAttribute('cy', q[1]); d.e.style.opacity = dir ? 1 : 0.35; });
      liDots.forEach(function (d) { d.s = (((d.s + sp * 1.3 * dt) % 1) + 1) % 1; d.e.setAttribute('cx', 34 + d.s * 198); d.e.setAttribute('cy', d.y); d.e.style.opacity = dir ? 1 : 0.35; });
    }
    on(rate, 'input', function () { build(); flowTick(0); });
    cellListeners.push(function () { build(); flowTick(0); });
    build(); flowTick(0);
    steps(fig, [
      { text: 'The <b>cycler</b> is a current source with a voltmeter. It pushes a chosen current through the cell and records the voltage at regular intervals. Holding the current constant is called <b>galvanostatic</b> cycling, and most curves in this module were recorded, or drawn, that way.' },
      { text: 'The meter reads what the cycler sees. On <b>discharge</b> electrons leave the negative electrode through the wire (white) while lithium ions leave it through the electrolyte (gold); on <b>charge</b> the cycler drives both back.' },
      { text: 'Each half-cycle stops at a <b>cut-off voltage</b> (red dashes). Between the steps the cell rests; its voltage is drawn returning at once to the open-circuit value (figure 5.4 shows the real, gradual return).' },
      { text: 'Charging usually ends with a <b>constant-voltage</b> step: the cycler holds the upper cut-off and lets the current fall away until it reaches a small limit, here C/20 (the shaded band).' }
    ]);
    var loop = anim(fig, function (dt) { flowTick(dt); if (dt === 0) return; phase += dt * tr.length / 16; while (phase >= 1) { phase -= 1; k++; if (k >= tr.length) k = 0; } place(); }, { autoplay: true, stepDt: 0.6 });
    bind(fig, loop);
    // reduced motion: show the whole protocol at once
    if (!motion) { k = tr.length - 1; place(); }
  });

  /* ===== 5.5 Battery or capacitor: two ideal limits and a real supercapacitor ===== */
  register('f5-5', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), I0s = fig.querySelector('.i0'), I0v = fig.querySelector('.i0-val'), mb = fig.querySelectorAll('button[data-view]');
    var gA = el('g', {}, svg), gB = el('g', {}, svg);
    // ---------- view A: Olson et al., eqs. 1 to 8 and Figures 2 and 3 ----------
    var cols = [{ x0: 52, x1: 232, name: 'ideal battery material' }, { x0: 312, x1: 492, name: 'ideal capacitor material' }];
    var top = { y0: 128, y1: 40 }, bot = { y0: 272, y1: 184 }, uLo = 0.18, uHi = 0.82, uEq = 0.5;
    var dyn = [];
    cols.forEach(function (cl, j) {
      txt(gA, (cl.x0 + cl.x1) / 2, 18, cl.name, 'strong', 'middle');
      var bt = { x0: cl.x0, y0: top.y0, x1: cl.x1, y1: top.y1 }, bb = { x0: cl.x0, y0: bot.y0, x1: cl.x1, y1: bot.y1 };
      plotAxes(gA, bt, { xlab: 'charge stored, q →', ylab: 'potential U' });
      plotAxes(gA, bb, { xlab: 'potential U →', ylab: 'dq/dU' });
      var Y = function (u) { return bt.y0 - u * (bt.y0 - bt.y1); }, Xq = function (q) { return bt.x0 + 8 + q * (bt.x1 - bt.x0 - 24); }, Xu = function (u) { return bb.x0 + u * (bb.x1 - bb.x0); };
      if (j === 0) {
        el('path', { d: 'M' + Xq(0) + ',' + Y(uEq) + ' L' + Xq(1) + ',' + Y(uEq), stroke: 'var(--amber)', 'stroke-width': 2.4, fill: 'none' }, gA);
        txt(gA, Xq(0.5), Y(uEq) - 8, 'U = U_eq, all the way', 'amber', 'middle');
        el('line', { x1: Xu(uEq), x2: Xu(uEq), y1: bb.y0, y2: bb.y1 + 10, stroke: 'var(--amber)', 'stroke-width': 3 }, gA);
        el('path', { d: 'M' + (Xu(uEq) - 5) + ',' + (bb.y1 + 12) + ' L' + Xu(uEq) + ',' + (bb.y1 + 2) + ' L' + (Xu(uEq) + 5) + ',' + (bb.y1 + 12) + ' Z', fill: 'var(--amber)' }, gA);
        txt(gA, Xu(uEq) + 9, bb.y1 + 26, 'one spike:', '', 'start'); txt(gA, Xu(uEq) + 9, bb.y1 + 44, 'all of q_sat', '', 'start'); txt(gA, Xu(uEq) + 9, bb.y1 + 62, 'at U_eq', '', 'start');
        badge(gA, cl.x0 + 16, top.y1 + 14, 1);
      } else {
        el('path', { d: 'M' + Xq(0) + ',' + Y(uLo) + ' L' + Xq(1) + ',' + Y(uHi), stroke: 'var(--cyan)', 'stroke-width': 2.4, fill: 'none' }, gA);
        txt(gA, Xq(0.62), Y(lerp(uLo, uHi, 0.62)) + 18, 'slope 1/C_sp', 'cyan', 'start');
        el('line', { x1: Xu(uLo), x2: Xu(uHi), y1: bb.y0 - 44, y2: bb.y0 - 44, stroke: 'var(--cyan)', 'stroke-width': 2.4 }, gA);
        [uLo, uHi].forEach(function (u, m) { el('line', { x1: Xu(u), x2: Xu(u), y1: bb.y0, y2: bb.y1 + 14, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, gA); txt(gA, Xu(u), bb.y1 + 10, m ? 'U_EOC' : 'U_EOD', '', 'middle'); });
        txt(gA, Xu(0.5), bb.y0 - 50, 'level: C_sp', 'cyan', 'middle');
        badge(gA, cl.x0 + 16, top.y1 + 14, 2); badge(gA, cl.x1 - 16, bot.y0 - 20, 3);
      }
      var dot = el('circle', { r: 5, 'class': 'ion' }, gA), fill = el('rect', { y: j ? bb.y0 - 44 : bb.y0, height: j ? 44 : 0, width: 0, x: Xu(uLo), fill: j ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': '.3' }, gA);
      dyn.push({ j: j, dot: dot, fill: fill, Xq: Xq, Y: Y, Xu: Xu, bb: bb });
    });
    var qs = 0.35;
    function placeA() {
      dyn.forEach(function (d) {
        var u = d.j ? lerp(uLo, uHi, qs) : uEq;
        d.dot.setAttribute('cx', d.Xq(qs)); d.dot.setAttribute('cy', d.Y(u));
        if (d.j) { d.fill.setAttribute('width', Math.max(0, d.Xu(u) - d.Xu(uLo))); }
        else { var h = qs * (d.bb.y0 - d.bb.y1 - 12); d.fill.setAttribute('x', d.Xu(uEq) - 6); d.fill.setAttribute('width', 12); d.fill.setAttribute('y', d.bb.y0 - h); d.fill.setAttribute('height', h); }
      });
      read.innerHTML = 'Charge stored so far: <b>' + Math.round(qs * 100) + ' %</b>. The battery material’s potential has not moved; the capacitor’s has climbed ' + Math.round(qs * 100) + ' % of the way across its window. In the lower plots the shaded area is the charge stored so far: dq/dU summed over U.';
    }
    // ---------- view B: Moya 2025, eqs. 6 and 12 with Table 2 (capacitor C10) ----------
    var RH = 0.31, Ri = 0.32, Cc = 0.94, tau = 0.095, t0 = 10, tMax = 19.4;
    var bm = { x0: 60, y0: 262, x1: 330, y1: 34 }, vMax = 0.6;
    var Xt = function (t) { return bm.x0 + t / tMax * (bm.x1 - bm.x0); }, Yv = function (v) { return bm.y0 - v / vMax * (bm.y0 - bm.y1); };
    plotAxes(gB, bm, { yt: [0, 0.2, 0.4, 0.6], ylo: 0, yhi: vMax, yf: function (v) { return v.toFixed(1); }, ylab: 'voltage, V' }); txt(gB, bm.x1, bm.y0 + 30, 'time, s', '', 'end');
    [0, 5, 10, 15].forEach(function (t) { txt(gB, Xt(t), bm.y0 + 15, String(t), '', 'middle'); });
    var asym = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '4 4' }, gB), curve = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.2 }, gB);
    var mk = el('circle', { r: 4.5, 'class': 'ion' }, gB);
    var ins = [{ x0: 390, y0: 136, x1: 505, y1: 46, ta: 0, tb: 0.6, name: 'start' }, { x0: 390, y0: 262, x1: 505, y1: 172, ta: t0 - 0.05, tb: t0 + 0.55, name: 'reversal' }];
    ins.forEach(function (b) {
      el('rect', { x: b.x0, y: b.y1, width: b.x1 - b.x0, height: b.y0 - b.y1, fill: 'rgba(234,240,236,.03)', stroke: 'var(--line)' }, gB);
      txt(gB, b.x0, b.y1 - 6, 'zoom: ' + b.name, '', 'start');
      b.asym = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '4 4' }, gB); b.curve = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2 }, gB);
      b.lab = txt(gB, b.x1 - 4, b.name === 'start' ? b.y0 - 6 : b.y1 + 14, '', 'cyan', 'end');
      b.bracket = el('line', { stroke: 'var(--amber)', 'stroke-width': 1.6 }, gB);
    });
    var lj = txt(gB, 0, 0, '', 'amber tag', 'start'), ls = txt(gB, 0, 0, '', 'cyan tag', 'start'), ld = txt(gB, 0, 0, '', 'amber tag', 'start');
    badge(gB, Xt(17), Yv(0.5), 4); badge(gB, 376, 60, 5);
    var tNow = 3;
    function vt(t, I0) { return P.edlcCycle(t, t0, I0, RH, Ri, Cc, tau); }
    function va(t, I0) { var Re = RH + Ri; return t < t0 ? Re * I0 + I0 * t / Cc : (Re * I0 + I0 * t0 / Cc) - 2 * Re * I0 - I0 * (t - t0) / Cc; }
    function drawB() {
      var I0 = +I0s.value / 1000; setSvgText(I0v, Math.round(I0 * 1000) + ' mA');
      var ts = [], n = 600; for (var i = 0; i <= n; i++) ts.push(i / n * tMax);
      // keep the jumps vertical: add the points either side of t0
      ts.push(t0 - 1e-6); ts.sort(function (a, b) { return a - b; });
      curve.setAttribute('d', polyD(ts.map(Xt), ts.map(function (t) { return Yv(Math.max(0, vt(t, I0))); })));
      var ta = ts.filter(function (t) { return t < t0; }), tb = ts.filter(function (t) { return t >= t0; });
      asym.setAttribute('d', polyD(ta.map(Xt), ta.map(function (t) { return Yv(va(t, I0)); })) + ' ' + polyD(tb.map(Xt), tb.map(function (t) { return Yv(Math.max(0, va(t, I0))); })).replace('M', 'M'));
      ins.forEach(function (b, j) {
        var tt = [], m = 160; for (var i = 0; i <= m; i++) tt.push(b.ta + i / m * (b.tb - b.ta)); if (j) { tt.push(t0 - 1e-6); tt.sort(function (a, c) { return a - c; }); }
        var vs = tt.map(function (t) { return t < 0 ? 0 : vt(t, I0); }), as = tt.map(function (t) { return t < 0 ? NaN : va(t, I0); });
        var lo = Math.min.apply(null, vs.concat(as.filter(isFinite))), hi = Math.max.apply(null, vs.concat(as.filter(isFinite))), pad = (hi - lo) * 0.12;
        lo -= pad; hi += pad;
        var X = function (t) { return b.x0 + (t - b.ta) / (b.tb - b.ta) * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - (v - lo) / (hi - lo) * (b.y0 - b.y1); };
        b.curve.setAttribute('d', polyD(tt.map(X), vs.map(Y)));
        var ok = tt.filter(function (t, i) { return isFinite(as[i]) && (j ? t >= t0 : true); });
        b.asym.setAttribute('d', polyD(ok.map(X), ok.map(function (t) { return Y(va(t, I0)); })));
        var gap = j ? 2 * Ri * I0 : Ri * I0, tg = j ? t0 + 0.004 : 0.004;
        b.bracket.setAttribute('x1', X(tg) + 6); b.bracket.setAttribute('x2', X(tg) + 6); b.bracket.setAttribute('y1', Y(vt(tg, I0))); b.bracket.setAttribute('y2', Y(va(tg, I0)));
        setSvgText(b.lab, (j ? '2R_i I₀ = ' : 'R_i I₀ = ') + (gap * 1000).toFixed(1) + ' mV');
      });
      lj.setAttribute('x', Xt(2.2)); lj.setAttribute('y', bm.y0 - 8); setSvgText(lj, 'jump R_H I₀ = ' + (RH * I0 * 1000).toFixed(1) + ' mV');
      ls.setAttribute('x', Xt(5.5)); ls.setAttribute('y', Yv(va(5, I0)) + 18); setSvgText(ls, 'slope I₀/C = ' + (I0 / Cc * 1000).toFixed(0) + ' mV/s');
      ld.setAttribute('x', Xt(t0) + 10); ld.setAttribute('y', Yv(vt(t0 - 1e-6, I0)) - 6); setSvgText(ld, 'drop 2R_H I₀');
      placeB();
    }
    function placeB() {
      var I0 = +I0s.value / 1000; mk.setAttribute('cx', Xt(tNow)); mk.setAttribute('cy', Yv(Math.max(0, vt(tNow, I0))));
      var V0 = vt(t0 - 1e-6, I0);
      read.innerHTML = 'Capacitor C10, fitted values (R<sub>H</sub> = 0.31 Ω, R<sub>i</sub> = 0.32 Ω, C = 0.94 F, τ<sub>i</sub> = 0.095 s), charged at ' + Math.round(I0 * 1000) + ' mA for 10 s, then discharged at the same current. t = ' + tNow.toFixed(1) + ' s, v = <b>' + Math.max(0, vt(tNow, I0)).toFixed(3) + ' V</b>. Peak ' + V0.toFixed(3) + ' V. The voltage is a ramp, not a plateau: a capacitor stores charge in proportion to its voltage.';
    }
    function setView(v) {
      gA.style.display = v === 'a' ? '' : 'none'; gB.style.display = v === 'b' ? '' : 'none';
      Array.prototype.forEach.call(mb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
      fig.querySelector('.i0-wrap').style.display = v === 'b' ? '' : 'none';
      view = v; if (v === 'a') placeA(); else drawB();
    }
    var view = 'a';
    var st = null;
    Array.prototype.forEach.call(mb, function (b) { on(b, 'click', function () { var v = b.getAttribute('data-view'); if (st) st.go(v === 'b' ? 3 : 0); else setView(v); }); });
    on(I0s, 'input', drawB);
    setView('a');
    st = steps(fig, [
      { text: 'An <b>ideal battery material</b> stores all its charge in one reaction at one potential, U<sub>eq</sub>: the curve is a perfect plateau, and the energy is simply charge × U<sub>eq</sub>.', on: function () { setView('a'); } },
      { text: 'An <b>ideal capacitor material</b> has a fixed capacitance: every bit of charge raises the potential by the same amount, so the curve is a straight ramp with slope 1/C<sub>sp</sub>.', on: function () { setView('a'); } },
      { text: 'Turn the curves on their side and plot dq/dU, the charge stored per volt. The battery gives a single <b>spike</b>; the capacitor a flat <b>level</b>. Real electrodes lie between the two, which is the idea behind figure 5.10.', on: function () { setView('a'); } },
      { text: 'A real commercial supercapacitor at constant current: an instant jump, a short bend, then a straight ramp at slope I₀/C. Reverse the current and the voltage drops by twice the jump, then ramps down.', on: function () { setView('b'); } },
      { text: 'Zoom in. Just after each switch the curve bends towards a dashed straight line. In the fitted circuit an inner branch, a resistance R<sub>i</sub> in parallel with a second capacitance attributed to the diffusion of ions in the capacitor, catches up with a time constant of about 0.1 s. The gap starts twice as large on discharge, because the current changes by 2I₀ there and only I₀ at the start.', on: function () { setView('b'); } }
    ]);
    var loop = anim(fig, function (dt) {
      if (dt === 0) return;
      if (view === 'a') { qs += dt / 6; if (qs > 1) qs = 0; placeA(); } else { tNow += dt * 2; if (tNow > tMax) tNow = 0; placeB(); }
    }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 5.6 Plateau or slope: the phase rule on a measured curve ===== */
  register('f5-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var colX = [20, 270], parts = [[], []], order = [7, 2, 10, 4, 0, 9, 5, 11, 1, 6, 3, 8];
    txt(g, 135, 16, 'two phases: LiFePO₄', 'strong', 'middle'); txt(g, 385, 16, 'one phase (schematic)', 'strong', 'middle');
    colX.forEach(function (x0, j) {
      for (var i = 0; i < 12; i++) {
        var cx = x0 + 43 + (i % 4) * 49, cy = 40 + Math.floor(i / 4) * 33;
        el('circle', { cx: cx, cy: cy, r: 13, fill: 'var(--panel-2)', stroke: 'var(--amber)', 'stroke-opacity': '.55' }, g);
        parts[j].push(el('circle', { cx: cx, cy: cy, r: 13, fill: 'var(--amber-2)', 'fill-opacity': '0' }, g));
      }
    });
    badge(g, 30, 40, 1); badge(g, 506, 40, 4);
    var bL = { x0: 62, y0: 286, x1: 240, y1: 156 }, bR = { x0: 312, y0: 286, x1: 490, y1: 156 }, vlo = 2.6, vhi = 4.4;
    plotAxes(g, bL, { yt: [3.0, 3.5, 4.0], ylo: vlo, yhi: vhi, yf: function (v) { return v.toFixed(1); }, ylab: 'V vs Li/Li⁺' });
    plotAxes(g, bR, { ylab: 'V' });
    txt(g, bL.x1, bL.y0 + 15, 'lithium content y →', '', 'end'); txt(g, bR.x1, bR.y0 + 15, 'lithium content →', '', 'end');
    var XL = function (y) { return bL.x0 + y * (bL.x1 - bL.x0); }, YL = function (v) { return bL.y0 - (v - vlo) / (vhi - vlo) * (bL.y0 - bL.y1); };
    var XR = function (y) { return bR.x0 + y * (bR.x1 - bR.x0); }, sl = function (y) { return 0.86 - 0.62 * y + 0.10 * Math.exp(-y / 0.04) - 0.12 * Math.exp(-(1 - y) / 0.04); }, YR = function (y) { return bR.y0 - Math.max(0.02, Math.min(1, sl(y))) * (bR.y0 - bR.y1); };
    var ys = []; for (var i = 0; i <= 400; i++) ys.push(0.002 + 0.996 * i / 400);
    el('line', { x1: bL.x0, x2: bL.x1, y1: YL(3.4323), y2: YL(3.4323), stroke: 'var(--amber)', 'stroke-opacity': '.45', 'stroke-dasharray': '2 3' }, g);
    el('path', { d: polyD(ys.map(XL), ys.map(function (y) { return YL(Math.max(vlo, Math.min(vhi, P.lfpOcp(y)))); })), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.2 }, g);
    txt(g, XL(0.5), YL(3.4323) - 8, '3.43 V, flat', 'amber tag', 'middle');
    el('path', { d: polyD(ys.map(XR), ys.map(YR)), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.2 }, g);
    txt(g, XR(0.5), YR(0.5) - 12, 'keeps changing', 'cyan tag', 'start');
    badge(g, XL(0.08), YL(4.25), 2); badge(g, XL(0.84), YL(3.88), 3);
    var dL = el('circle', { r: 5, 'class': 'ion' }, g), dR = el('circle', { r: 5, 'class': 'ion' }, g);
    txt(g, 135, 324, 'P = 2: F = 2 − 2 + 2 = 2', 'amber', 'middle'); txt(g, 135, 339, 'fix T and p: none left, so flat', '', 'middle');
    txt(g, 385, 324, 'P = 1: F = 2 − 1 + 2 = 3', 'cyan', 'middle'); txt(g, 385, 339, 'fix T and p: one left, so it slopes', '', 'middle');
    var y = 0.42, A = 0.13, B = 0.87;
    function partContent(i, y) { // schematic: solid solution near the ends, particles switching one by one between
      if (y <= A) return y; if (y >= B) return y;
      var th = A + (B - A) * (order.indexOf(i) + 0.5) / 12, w = 0.025;
      return lerp(A, B, smooth((y - th + w) / (2 * w)));
    }
    function place() {
      var rich = 0;
      parts[0].forEach(function (c, i) { var u = partContent(i, y); if (u > 0.5 * (A + B)) rich++; c.setAttribute('fill-opacity', (0.05 + 0.9 * u).toFixed(3)); });
      parts[1].forEach(function (c) { c.setAttribute('fill-opacity', (0.05 + 0.9 * y).toFixed(3)); });
      var V = P.lfpOcp(y);
      dL.setAttribute('cx', XL(y)); dL.setAttribute('cy', YL(Math.max(vlo, Math.min(vhi, V)))); dR.setAttribute('cx', XR(y)); dR.setAttribute('cy', YR(y));
      var where = y < 0.15 || y > 0.85 ? 'on a sloping end, where the material takes lithium as one phase' : 'on the plateau: ' + rich + ' of 12 particles are lithium-rich, the rest lithium-poor';
      read.innerHTML = 'Lithium content y = <b>' + y.toFixed(2) + '</b>, open-circuit voltage <b>' + V.toFixed(3) + ' V</b> vs Li/Li⁺ (the fitted curve), ' + where + '.';
    }
    steps(fig, [
      { text: 'An electrode is many particles. Over most of its range LiFePO₄ is two solid phases, one lithium-poor and one lithium-rich. Each particle is drawn turning from one to the other; adding lithium changes <b>how much</b> of each phase there is, not what either phase is made of.' },
      { text: 'This is the measured open-circuit curve: a fit to the average of a charge and a discharge at C/100. It sits at <b>3.43 V</b> from about y = 0.15 to 0.85.' },
      { text: 'Near the ends the curve slopes. There the material takes or gives lithium as a single phase, a partial solid solution, so its composition, and the voltage with it, can change.' },
      { text: 'Count with the Gibbs phase rule, F = C − P + 2, for two components (lithium and FePO₄). Two phases leave F = 2, both used by fixing temperature and pressure: the voltage cannot move, a <b>plateau</b>. One phase leaves one freedom, the composition: a <b>slope</b> (right, schematic).' },
      { text: 'Even the plateau is not quite one line. A gap of about <b>20 mV</b> remains between charge and discharge even at C/1000, a true hysteresis traced to the many particles. The fit drawn here is to the average of a C/100 charge and discharge.' }
    ]);
    place();
    var loop = anim(fig, function (dt) { if (dt === 0) return; y += dt / 9; if (y > 0.995) y = 0.005; place(); }, { autoplay: true, stepDt: 0.6 });
    bind(fig, loop);
  });

  /* ===== 5.7 Many particles: the resistive-reactant LiFePO4 electrode ===== */
  register('f5-7', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), mb = fig.querySelectorAll('button[data-mode]'), rb = fig.querySelectorAll('button[data-rate]');
    var b = { x0: 58, y0: 268, x1: 326, y1: 30 }, vlo = 2.4, vhi = 4.3;
    var X = function (q) { return b.x0 + q * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - (Math.max(vlo, Math.min(vhi, v)) - vlo) / (vhi - vlo) * (b.y0 - b.y1); };
    plotAxes(g, b, { yt: [2.5, 3.0, 3.5, 4.0], ylo: vlo, yhi: vhi, yf: function (v) { return v.toFixed(1); }, ylab: 'V vs Li/Li⁺' });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (q) { txt(g, X(q), b.y0 + 15, Math.round(q * 100) + ' %', '', 'middle'); });
    var xl = txt(g, b.x1, b.y0 + 30, '', '', 'end');
    var ocp = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 4' }, g), ref = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.6, 'stroke-opacity': '.7' }, g);
    var pA = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.2 }, g), pB = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.2 }, g);
    var dA = el('circle', { r: 4.5, 'class': 'ion' }, g), dB = el('circle', { r: 4.5, 'class': 'ion' }, g);
    var lA = txt(g, 0, 0, '', 'amber tag', 'start'), lB = txt(g, 0, 0, '', 'cyan tag', 'start'), lR = txt(g, 0, 0, '', 'tag', 'start');
    // the particle groups
    var gb = el('g', {}, g), bars = [], by0 = 236, by1 = 66;
    var head = txt(g, 430, 22, '', 'strong', 'middle'), sub1 = txt(g, 430, 40, '', '', 'middle');
    for (var k = 0; k < 8; k++) {
      var r0 = el('rect', { y: by1, height: by0 - by1, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, gb);
      var r1 = el('rect', { rx: 3, fill: 'var(--amber-2)' }, gb);
      var t1 = txt(gb, 0, by1 - 7, '', 'strong', 'middle'), t2 = txt(gb, 0, by0 + 16, '', '', 'middle'), t3 = txt(gb, 0, by0 + 31, '', '', 'middle');
      bars.push({ r0: r0, r1: r1, t1: t1, t2: t2, t3: t3 });
    }
    var foot = txt(g, 430, by0 + 48, '', '', 'middle'), setA = txt(g, 397, by0 + 16, 'from empty', 'cyan', 'middle'), setB = txt(g, 469, by0 + 16, 'from full', 'amber', 'middle');
    badge(g, 344, 150, 1); badge(g, X(0.5), Y(3.1), 2); badge(g, X(0.86), Y(2.75), 3);
    var cache = {}, mode = 'dis', rate = 1, data = null, k0 = 0, kk = 0;
    var M = P.lfpElectrode(), C1 = M.oneC, FR = M.frac, RC = M.Rc;
    function key() { return mode + ':' + (mode === 'path' ? 1 : rate); }
    function compute() {
      if (cache[key()]) return cache[key()];
      var d;
      if (mode === 'path') {
        var hist = function (fromEmpty) {
          var m = P.lfpElectrode({ y0: fromEmpty ? 0.995 : 0.005 });
          var a = m.run(fromEmpty ? C1 / 25 : -C1 / 25, { yStop: 0.5 }), r = m.run(0, { tmax: 7200, dtmax: 300 }), c = m.run(C1);
          var yR = r[r.length - 1].y;
          return { pre: a[a.length - 1], rest: r[r.length - 1], pts: c.map(function (p) { return { q: yR - p.y, V: p.V, groups: p.groups }; }) };
        };
        d = { A: hist(true), B: hist(false) };
      } else {
        var ch = mode === 'ch', I = rate * C1 * (ch ? 1 : -1), y0 = ch ? 0.995 : 0.005;
        var run = function (I) { var m = P.lfpElectrode({ y0: y0 }); return m.run(I).map(function (p) { return { q: Math.abs(p.y - y0), V: p.V, groups: p.groups }; }); };
        d = { A: { pts: run(I) }, slow: run(I / rate / 25) };
      }
      cache[key()] = d; return d;
    }
    function sdOf(gs) { var m = 0; gs.forEach(function (x) { m += x.y; }); m /= gs.length; var s = 0; gs.forEach(function (x) { s += (x.y - m) * (x.y - m); }); return Math.sqrt(s / gs.length); }
    function layout() {
      var path = mode === 'path';
      bars.forEach(function (bb, i) {
        var show = path || i < 4, w = path ? 15 : 26, x = path ? (i < 4 ? 360 + i * 19 : 432 + (i - 4) * 19) : 368 + i * 36;
        [bb.r0, bb.r1].forEach(function (r) { r.style.display = show ? '' : 'none'; r.setAttribute('x', x); r.setAttribute('width', w); });
        [bb.t1, bb.t2, bb.t3].forEach(function (t) { t.style.display = show ? '' : 'none'; t.setAttribute('x', x + w / 2); });
        setSvgText(bb.t1, String(i % 4 + 1));
        setSvgText(bb.t2, path ? '' : Math.round(FR[i % 4] * 100) + ' %'); setSvgText(bb.t3, path ? '' : (RC[i % 4] < 10 ? RC[i % 4].toFixed(2) : RC[i % 4].toFixed(1)));
      });
      setSvgText(head, path ? 'lithium in each group' : 'lithium in each group'); setSvgText(sub1, 'group 1 best wired, 4 worst'); setA.style.display = path ? '' : 'none'; setB.style.display = path ? '' : 'none';
      setSvgText(foot, path ? 'both rested 2 h at 50 %' : 'share of volume; R_c, Ω m²');
    }
    function draw() {
      data = compute(); layout();
      var path = mode === 'path', ch = mode === 'ch';
      var ys = []; for (var i = 0; i <= 200; i++) ys.push(0.003 + 0.994 * i / 200);
      if (!path) { ocp.setAttribute('d', polyD(ys.map(function (y) { return X(ch ? 1 - y : y); }), ys.map(function (y) { return Y(P.lfpOcp(y)); }))); ocp.style.display = ''; }
      else ocp.style.display = 'none';
      var A = data.A.pts, Bp = path ? data.B.pts : null;
      pA.setAttribute('d', polyD(A.map(function (p) { return X(p.q); }), A.map(function (p) { return Y(p.V); })));
      pA.setAttribute('stroke', path ? 'var(--cyan)' : ch ? 'var(--cyan)' : 'var(--amber)');
      pB.style.display = path ? '' : 'none'; dB.style.display = path ? '' : 'none'; lB.style.display = path ? '' : 'none';
      if (path) pB.setAttribute('d', polyD(Bp.map(function (p) { return X(p.q); }), Bp.map(function (p) { return Y(p.V); }))), pB.setAttribute('stroke', 'var(--amber)');
      ref.style.display = path ? 'none' : ''; lR.style.display = path ? 'none' : '';
      if (!path) { var s = data.slow; ref.setAttribute('d', polyD(s.map(function (p) { return X(p.q); }), s.map(function (p) { return Y(p.V); }))); }
      var eA = A[A.length - 1];
      lA.setAttribute('class', 'lbl tag ' + (path || ch ? 'cyan' : 'amber'));
      if (path) {
        var eB = Bp[Bp.length - 1];
        lA.setAttribute('x', X(eA.q) - 8); lA.setAttribute('y', Y(3.75)); lA.setAttribute('text-anchor', 'end'); setSvgText(lA, 'came from empty');
        lB.setAttribute('x', X(eB.q) + 8); lB.setAttribute('y', Y(3.95)); setSvgText(lB, 'came from full');
        setSvgText(xl, 'capacity charged at 1C, % of theoretical');
      } else {
        var mid = A[Math.floor(A.length * 0.45)];
        lA.setAttribute('text-anchor', 'middle'); lA.setAttribute('x', X(mid.q)); lA.setAttribute('y', Y(mid.V) + (ch ? -12 : 20)); setSvgText(lA, fmtRate(rate));
        var sm = data.slow[Math.floor(data.slow.length * 0.6)]; lR.setAttribute('x', X(sm.q)); lR.setAttribute('y', Y(sm.V) + (ch ? 18 : -10)); lR.setAttribute('text-anchor', 'middle'); setSvgText(lR, 'C/25');
        setSvgText(xl, (ch ? 'charged' : 'discharged') + ', % of theoretical capacity');
      }
      kk = motion ? 0 : 100000; place();
    }
    function setBars(groups, off) { for (var i = 0; i < 4; i++) { var bb = bars[i + off], y = groups[i].y, h = y * (by0 - by1); bb.r1.setAttribute('y', by0 - h); bb.r1.setAttribute('height', Math.max(0, h)); } }
    function place() {
      var A = data.A.pts, n = A.length, path = mode === 'path';
      if (path) {
        var Bp = data.B.pts, kA = Math.min(kk, A.length - 1), kB = Math.min(kk, Bp.length - 1);
        dA.setAttribute('cx', X(A[kA].q)); dA.setAttribute('cy', Y(A[kA].V)); dB.setAttribute('cx', X(Bp[kB].q)); dB.setAttribute('cy', Y(Bp[kB].V));
        setBars(A[kA].groups, 0); setBars(Bp[kB].groups, 4);
        var uA = A[A.length - 1].q, uB = Bp[Bp.length - 1].q;
        read.innerHTML = 'Both electrodes start the 1C charge at 50 %, after 2 h of rest. One got there by a slow half charge from empty, the other by a slow half discharge from full. Spread of lithium among the groups before the rest: <b>' + sdOf(data.A.pre.groups).toFixed(3) + '</b> and <b>' + sdOf(data.B.pre.groups).toFixed(3) + '</b>; after it: <b>' + sdOf(data.A.rest.groups).toFixed(3) + '</b> and <b>' + sdOf(data.B.rest.groups).toFixed(3) + '</b>, unchanged. The 1C charge then delivers <b>' + Math.round(uA * 1000) / 10 + ' %</b> and <b>' + Math.round(uB * 1000) / 10 + ' %</b> of the theoretical capacity: the same state of charge, two answers.';
      } else {
        var p = A[Math.min(kk, n - 1)], u = A[n - 1].q, us = data.slow[data.slow.length - 1].q;
        dA.setAttribute('cx', X(p.q)); dA.setAttribute('cy', Y(p.V)); setBars(p.groups, 0);
        read.innerHTML = (mode === 'ch' ? 'Charge' : 'Discharge') + ' at ' + fmtRate(rate) + ': V = <b>' + p.V.toFixed(3) + ' V</b> after ' + Math.round(p.q * 100) + ' %. Lithium content of groups 1 to 4: ' + p.groups.map(function (x) { return x.y.toFixed(2); }).join(', ') + '. This run reaches the cut-off at <b>' + Math.round(u * 100) + ' %</b> of the theoretical capacity; at C/25, ' + Math.round(us * 100) + ' %.';
      }
    }
    function press(list, attr, v) { Array.prototype.forEach.call(list, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute(attr) === String(v))); }); }
    Array.prototype.forEach.call(mb, function (bt) { on(bt, 'click', function () { mode = bt.getAttribute('data-mode'); press(mb, 'data-mode', mode); draw(); }); });
    Array.prototype.forEach.call(rb, function (bt) { on(bt, 'click', function () { rate = +bt.getAttribute('data-rate'); press(rb, 'data-rate', bt.getAttribute('data-rate')); if (mode === 'path') { mode = 'dis'; press(mb, 'data-mode', mode); } draw(); }); });
    draw();
    steps(fig, [
      { text: 'Model a LiFePO₄ electrode as <b>four groups</b> of identical particles. They differ only in how well each is wired to the conductive carbon: the <b>contact resistance</b> R<sub>c</sub>, fitted to measured cells. A quarter of the particles are well wired; one in twenty very poorly.' },
      { text: 'On a flat open-circuit curve every particle would react at the same voltage, so the current takes the easiest path: group 1 fills first and group 4 last. As the easy particles fill, the current is pushed through worse contacts, and the curve that should be flat <b>tilts</b>, more steeply the faster you go.' },
      { text: 'At higher rate the cut-off arrives while group 4 is still part empty: about half of the capacity lost at high rate is lithium that could not get into the badly connected particles (groups 3 and 4) in time.', on: function () { if (mode === 'path') { mode = 'dis'; press(mb, 'data-mode', mode); draw(); } } },
      { text: 'Now press <b>Same 50 %, two histories</b>. Bring the electrode to half charge from empty or from full, rest it for 2 hours, then charge at 1C. On the plateau nothing evens the groups out during the rest, because no voltage difference drives lithium from one particle to another; so the two electrodes remember how they got there.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; k0 += dt * 60; while (k0 >= 1) { k0 -= 1; kk++; } var n = mode === 'path' ? Math.max(data.A.pts.length, data.B.pts.length) : data.A.pts.length; if (kk >= n + 40) kk = 0; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
    if (!motion) { kk = 100000; place(); }
  });

  /* ===== Shared: a drawn packing of particles at a chosen porosity, and the shortest way through its pores ===== */
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  // Particles in a w x h box (origin 0,0). shape 'disk': hexagonal rows of circles of radius r;
  // 'plate': staggered rows of flat bars 4r long and r thick, lying flat. The gap between particles is
  // found by bisection so that the solid share of the box area (sampled on a 1 px grid) equals phi.
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
  // Dijkstra on the pore cells (8 neighbours, no corner cutting) from the top row to the bottom row.
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

  /* ===== 5.8 Porosity and tortuosity (after Landesfeind et al. 2016, R74) ===== */
  // Measured fits of the MacMullin number N_M = kappa/kappa_eff against porosity, their Figure 19
  // (generalized Bruggeman with a prefactor): graphite-1 4.7 eps^-1.1, LFP-lowC 3.1 eps^-1.6, LFP-highC 3.0 eps^-1.2.
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

  /* ===== 5.9 Inside a porous electrode (after Doyle, Fuller and Newman 1993; schematic) ===== */
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

  /* ===== 5.10 Reading a curve by its slopes: dV/dQ and dQ/dV (after Olson et al. 2023) ===== */
  /* A toy cell. Each electrode's lithium content is a sum of smooth steps in its potential,
     x(U) = sum w / (1 + exp((U - Uj)/xi)), one step per plateau: an illustrative choice of ours
     with the properties Olson et al. ask of such a function (smooth, strictly monotonic). The
     plateau potentials are invented, not those of a real material. */
  var TOY = {
    neg: [{ U: 0.21, w: 0.40, xi: 0.010 }, { U: 0.12, w: 0.50, xi: 0.008 }, { U: 0.55, w: 0.10, xi: 0.12 }],
    pos: [{ U: 3.70, w: 0.30, xi: 0.06 }, { U: 3.92, w: 0.30, xi: 0.012 }, { U: 4.10, w: 0.22, xi: 0.015 }, { U: 4.45, w: 0.18, xi: 0.08 }]
  };
  function toyX(st, U) { var x = 0; st.forEach(function (s) { x += s.w / (1 + Math.exp((U - s.U) / s.xi)); }); return x; }
  function toyU(st, x) { var lo = -3, hi = 7; for (var n = 0; n < 60; n++) { var m = 0.5 * (lo + hi); if (toyX(st, m) > x) lo = m; else hi = m; } return 0.5 * (lo + hi); }
  register('f5-9', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sLLI = fig.querySelector('.lli'), sLAM = fig.querySelector('.lam'), vLLI = fig.querySelector('.lli-val'), vLAM = fig.querySelector('.lam-val');
    var A = { x0: 50, y0: 128, x1: 290, y1: 28 }, B = { x0: 50, y0: 296, x1: 290, y1: 176 }, Cb = { x0: 344, y0: 128, x1: 505, y1: 28 }, D = { x0: 382, y0: 296, x1: 500, y1: 178 };
    var Vlo = 3.0, Vhi = 4.2, Cn0 = 1.15, QMAX = 1.0, DVMAX = 12, DQMAX = 5;
    plotAxes(g, A, { yt: [3.0, 3.6, 4.2], ylo: 2.9, yhi: 4.3, yf: function (v) { return v.toFixed(1); }, ylab: 'cell voltage V', xlab: 'charge Q →' });
    plotAxes(g, B, { ylab: 'dV/dQ', xlab: 'charge Q →' });
    plotAxes(g, Cb, { ylab: 'dQ/dV' });
    [3.0, 3.6, 4.2].forEach(function (v) { txt(g, Cb.x0 + (v - Vlo) / (Vhi - Vlo) * (Cb.x1 - Cb.x0), Cb.y0 + 15, v.toFixed(1) + (v > 4 ? ' V' : ''), '', v > 4 ? 'end' : 'middle'); });
    el('rect', { x: D.x0, y: D.y1, width: D.x1 - D.x0, height: D.y0 - D.y1, fill: 'none', stroke: 'var(--line-2)' }, g);
    txt(g, D.x1, D.y0 + 15, 'x_neg →', '', 'end'); txt(g, D.x0 - 5, D.y1 + 8, '1 − x_pos', '', 'end');
    var bandG = el('g', {}, g);
    var XD = function (x) { return D.x0 + x * (D.x1 - D.x0); }, YD = function (y) { return D.y0 - y * (D.y0 - D.y1); };
    // plateau bands on the square plot: where each electrode sits on a plateau (|U - Uj| < 2 xi)
    TOY.neg.forEach(function (s) { if (s.xi > 0.05) return; var a = toyX(TOY.neg, s.U + 2 * s.xi), b2 = toyX(TOY.neg, s.U - 2 * s.xi); el('rect', { x: XD(a), y: D.y1, width: XD(b2) - XD(a), height: D.y0 - D.y1, fill: 'var(--cyan)', 'fill-opacity': '.16' }, bandG); });
    TOY.pos.forEach(function (s) { if (s.xi > 0.05) return; var a = 1 - toyX(TOY.pos, s.U - 2 * s.xi), b2 = 1 - toyX(TOY.pos, s.U + 2 * s.xi); el('rect', { x: D.x0, y: YD(b2), width: D.x1 - D.x0, height: YD(a) - YD(b2), fill: 'var(--amber)', 'fill-opacity': '.16' }, bandG); });
    var lineF = el('line', { stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, g), lineA = el('line', { stroke: 'var(--text)', 'stroke-width': 2 }, g);
    var pVf = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, g), pV = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    var pP = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.4 }, g), pN = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.4 }, g), pT = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    var pCf = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, g), pC = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    txt(g, B.x1 - 4, B.y1 + 12, 'from the positive', 'amber', 'end'); txt(g, B.x1 - 4, B.y1 + 30, 'from the negative', 'cyan', 'end');
    var dots = [0, 1, 2, 3].map(function () { return el('circle', { r: 4, 'class': 'ion' }, g); });
    badge(g, A.x0 + 18, A.y1 + 12, 1); badge(g, B.x0 + 18, B.y1 + 14, 2); badge(g, Cb.x0 + 18, Cb.y1 + 14, 3); badge(g, D.x0 - 18, D.y0 - 22, 4);
    var cur = null, fresh = null, kq = 0.5;
    function cell(LLI, LAM) {
      var Cp = 1 - LAM, nLi = 1 - LLI;
      function V(Q) { return toyU(TOY.pos, (nLi - Q) / Cp) - toyU(TOY.neg, Q / Cn0); }
      function solveV(target) { var lo = 1e-4, hi = nLi - 1e-4; for (var n = 0; n < 60; n++) { var m = 0.5 * (lo + hi); if (V(m) < target) lo = m; else hi = m; } return 0.5 * (lo + hi); }
      var q0 = solveV(Vlo), q1 = solveV(Vhi), N = 360, pts = [];
      for (var i = 0; i <= N; i++) {
        var Q = q0 + (q1 - q0) * i / N, h = (q1 - q0) / N * 0.25;
        var up = toyU(TOY.pos, (nLi - Q) / Cp), un = toyU(TOY.neg, Q / Cn0);
        var dup = (toyU(TOY.pos, (nLi - Q - h) / Cp) - toyU(TOY.pos, (nLi - Q + h) / Cp)) / (2 * h), dun = (toyU(TOY.neg, (Q - h) / Cn0) - toyU(TOY.neg, (Q + h) / Cn0)) / (2 * h);
        pts.push({ Q: Q - q0, V: up - un, dP: dup, dN: dun, dV: dup + dun, xn: Q / Cn0, yp: 1 - (nLi - Q) / Cp });
      }
      return { pts: pts, cap: q1 - q0, a: Cn0 / Cp, b: 1 - nLi / Cp, q0: q0, q1: q1, Cp: Cp, nLi: nLi };
    }
    var XA = function (q) { return A.x0 + q / QMAX * (A.x1 - A.x0); }, YA = function (v) { return A.y0 - (v - 2.9) / 1.4 * (A.y0 - A.y1); };
    var XB = function (q) { return B.x0 + q / QMAX * (B.x1 - B.x0); }, YB = function (d) { return B.y0 - Math.min(d, DVMAX) / DVMAX * (B.y0 - B.y1); };
    var XC = function (v) { return Cb.x0 + (v - Vlo) / (Vhi - Vlo) * (Cb.x1 - Cb.x0); }, YCc = function (d) { return Cb.y0 - Math.min(d, DQMAX) / DQMAX * (Cb.y0 - Cb.y1); };
    function lineOf(c, node) { var p0 = c.pts[0], p1 = c.pts[c.pts.length - 1]; node.setAttribute('x1', XD(p0.xn)); node.setAttribute('y1', YD(p0.yp)); node.setAttribute('x2', XD(p1.xn)); node.setAttribute('y2', YD(p1.yp)); }
    function draw() {
      var LLI = +sLLI.value / 100, LAM = +sLAM.value / 100; setSvgText(vLLI, Math.round(LLI * 100) + ' %'); setSvgText(vLAM, Math.round(LAM * 100) + ' %');
      if (!fresh) fresh = cell(0, 0);
      cur = cell(LLI, LAM);
      var P1 = cur.pts, F1 = fresh.pts;
      pVf.setAttribute('d', polyD(F1.map(function (p) { return XA(p.Q); }), F1.map(function (p) { return YA(p.V); })));
      pV.setAttribute('d', polyD(P1.map(function (p) { return XA(p.Q); }), P1.map(function (p) { return YA(p.V); })));
      pP.setAttribute('d', polyD(P1.map(function (p) { return XB(p.Q); }), P1.map(function (p) { return YB(p.dP); })));
      pN.setAttribute('d', polyD(P1.map(function (p) { return XB(p.Q); }), P1.map(function (p) { return YB(p.dN); })));
      pT.setAttribute('d', polyD(P1.map(function (p) { return XB(p.Q); }), P1.map(function (p) { return YB(p.dV); })));
      pCf.setAttribute('d', polyD(F1.map(function (p) { return XC(p.V); }), F1.map(function (p) { return YCc(1 / p.dV); })));
      pC.setAttribute('d', polyD(P1.map(function (p) { return XC(p.V); }), P1.map(function (p) { return YCc(1 / p.dV); })));
      lineOf(fresh, lineF); lineOf(cur, lineA);
      place();
    }
    function place() {
      var P1 = cur.pts, p = P1[Math.max(0, Math.min(P1.length - 1, Math.round(kq * (P1.length - 1))))];
      var at = [[XA(p.Q), YA(p.V)], [XB(p.Q), YB(p.dV)], [XC(p.V), YCc(1 / p.dV)], [XD(p.xn), YD(p.yp)]];
      dots.forEach(function (d, i) { d.setAttribute('cx', at[i][0]); d.setAttribute('cy', at[i][1]); });
      var who = p.dP > 2 * p.dN ? 'the positive electrode is between two plateaus' : p.dN > 2 * p.dP ? 'the negative electrode is between two plateaus' : (p.dV < 0.6 ? 'both electrodes sit on plateaus, so the cell voltage barely moves: a dQ/dV peak' : 'both electrodes are changing');
      read.innerHTML = 'Toy cell, aged by ' + sLLI.value + ' % lithium loss and ' + sLAM.value + ' % positive-material loss: capacity between 3.0 and 4.2 V is <b>' + Math.round(cur.cap / fresh.cap * 100) + ' %</b> of the fresh cell’s. At the cursor V = <b>' + p.V.toFixed(3) + ' V</b>: ' + who + '. Charging line: slope a = ' + cur.a.toFixed(2) + ', intercept b = ' + cur.b.toFixed(2) + '.';
    }
    on(sLLI, 'input', draw); on(sLAM, 'input', draw);
    draw();
    steps(fig, [
      { text: 'A toy cell with invented plateaus. Its voltage is the positive electrode’s potential minus the negative’s, V = U<sub>pos</sub> − U<sub>neg</sub>, and each electrode has its own plateaus. The dashed lines are the fresh cell.' },
      { text: '<b>dV/dQ</b> is the slope of the curve. The cell’s is simply the sum of the two electrodes’ (gold plus cyan), so every peak belongs to one electrode: it marks that electrode leaving one plateau for the next.' },
      { text: '<b>dQ/dV</b> turns the curve on its side: charge stored per volt. A peak means the voltage hardly moves while charge flows, which needs <b>both</b> electrodes on a plateau at once.' },
      { text: 'The square plot shows both at once: across, the negative electrode’s lithium; up, the positive’s, inverted. A cell is a straight line. Cyan bands are the negative’s plateaus, gold bands the positive’s, and a dQ/dV peak sits where the line crosses both. Lose lithium and the line moves up; lose positive material and it steepens.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; kq += dt / 10; if (kq > 1) kq = 0; place(); }, { autoplay: true, stepDt: 0.4 });
    bind(fig, loop);
  });

  /* =================================================================
     Module 7, first half: the liquid electrolyte from the ground up.
     Composition and solvent properties after Ue et al. 2014 (R54), section
     2.1, Table 2.1 and p. 97; the salt after Henderson 2014 (R53), pp. 5 to
     13; the solvation shell, ion pairing, transport modes and the interfacial
     structure after Borodin 2014 (R57), pp. 382 to 391 (molecular dynamics,
     with the experiments it cites); the double layer and electroneutrality
     after Bard, Faulkner and White (B2) 1.6 and 2.3. Molecules are drawn as
     glyphs, not to scale, except where a figure says otherwise.
     ================================================================= */

  /* A carbonate molecule as a glyph. EC: a small ring (it is cyclic); DMC: a
     stretched capsule (it is a chain). The red dot is the carbonyl oxygen, the
     atom that binds to Li⁺ (R53 p. 9, R57 p. 389). ang points the oxygen. */
  var M7_O = '#ff8f7a', M7_DMC = '#9fe3d9';
  function m7mol(g, type, x, y, ang, sc) {
    sc = sc || 1.2; var grp = el('g', {}, g);
    if (type === 'ec') {
      el('circle', { r: 5.5, fill: 'var(--cyan)', 'fill-opacity': '.22', stroke: 'var(--cyan)', 'stroke-width': 1.3 }, grp);
      el('circle', { cx: 8, cy: 0, r: 2.3, fill: M7_O }, grp);
    } else {
      el('rect', { x: -8, y: -3.2, width: 16, height: 6.4, rx: 3.2, fill: M7_DMC, 'fill-opacity': '.14', stroke: M7_DMC, 'stroke-width': 1.2 }, grp);
      el('circle', { cx: 0, cy: 5.6, r: 2.3, fill: M7_O }, grp);
    }
    var m = { g: grp, type: type, x: x, y: y, a: ang || 0, sc: sc };
    m.set = function (nx, ny, na) { m.x = nx; m.y = ny; if (na !== undefined) m.a = na; grp.setAttribute('transform', 'translate(' + nx.toFixed(1) + ',' + ny.toFixed(1) + ') rotate(' + (m.a * 180 / Math.PI - (type === 'ec' ? 0 : 90)).toFixed(1) + ') scale(' + sc + ')'); };
    m.set(x, y, ang || 0);
    return m;
  }
  /* point the oxygen of m at (tx, ty) from a distance d: places the glyph so that its O sits d from the target */
  function m7aim(m, tx, ty, dir, d) {
    var off = (m.type === 'ec' ? 8 : 5.6) * m.sc; // centre-to-oxygen distance of the glyph
    var ox = tx + Math.cos(dir) * d, oy = ty + Math.sin(dir) * d;
    m.set(ox + Math.cos(dir) * off, oy + Math.sin(dir) * off, dir + Math.PI); m.fx = m.x; m.fy = m.y;
  }
  function m7anion(g, x, y, r) { var c = el('circle', { cx: x, cy: y, r: r || 6.5, 'class': 'ion an' }, g); return { c: c, x: x, y: y, set: function (nx, ny) { this.x = nx; this.y = ny; c.setAttribute('cx', nx.toFixed(1)); c.setAttribute('cy', ny.toFixed(1)); } }; }
  function m7li(g, x, y, r) { var c = el('circle', { cx: x, cy: y, r: r || 5, 'class': 'ion' }, g); return { c: c, x: x, y: y, set: function (nx, ny) { this.x = nx; this.y = ny; c.setAttribute('cx', nx.toFixed(1)); c.setAttribute('cy', ny.toFixed(1)); } }; }
  function m7rng(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  /* ===== 7.2 What the liquid is made of ===== */
  register('f7-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), btns = fig.querySelectorAll('button[data-solv]');
    var EC = { phi: 1, rho: 1.32, M: 88.1 }, DMC = { phi: 1, rho: 1.06, M: 90.1 };
    // panel 1: the recipe
    txt(g, 90, 22, 'the recipe', 'strong', 'middle');
    el('path', { d: 'M52,44 V196 Q52,210 66,210 H114 Q128,210 128,196 V44', fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 1.6 }, g);
    var liq = el('rect', { x: 54, y: 92, width: 72, height: 116, rx: 10, fill: 'var(--cyan)', 'fill-opacity': '.14' }, g);
    var r1 = txt(g, 90, 118, '1 mol LiPF₆', 'amber', 'middle'), r2 = txt(g, 90, 136, 'per litre of', '', 'middle'), r3 = txt(g, 90, 154, 'EC : DMC', 'strong', 'middle'), r4 = txt(g, 90, 172, '3 : 7', 'strong', 'middle');
    badge(g, 140, 54, 1);
    // panel 2: count per lithium ion
    var bx = 196, bw = 130, by = 40, bh = 170;
    txt(g, bx + bw / 2 + 4, 22, 'molecules per Li⁺', 'strong', 'middle');
    el('line', { x1: bx, y1: by + bh, x2: bx + bw, y2: by + bh, stroke: 'var(--line-2)' }, g);
    var bars = [['EC', 'var(--cyan)'], ['DMC', M7_DMC], ['Li⁺', 'var(--cation)'], ['PF₆⁻', 'var(--anion)']].map(function (b, i) {
      var x = bx + 8 + i * 31;
      return { r: el('rect', { x: x, width: 22, y: by + bh, height: 0, fill: b[1], 'fill-opacity': '.75' }, g), v: txt(g, x + 11, by + bh - 4, '', 'strong', 'middle'), l: txt(g, x + 11, by + bh + 16, b[0], '', 'middle'), x: x };
    });
    badge(g, bx + bw + 4, by + 8, 2);
    // panel 3: a window a few nanometres across
    var wx = 350, wy = 40, ww = 156, wh = 170;
    txt(g, wx + ww / 2, 22, 'a few nanometres of it', 'strong', 'middle');
    el('rect', { x: wx, y: wy, width: ww, height: wh, rx: 6, fill: 'var(--cyan)', 'fill-opacity': '.05', stroke: 'var(--line-2)' }, g);
    var win = el('g', {}, g), cap = txt(g, wx + ww / 2, wy + wh + 18, '', 'amber', 'middle');
    badge(g, wx + ww - 6, wy + wh + 14, 3);
    var mols = [], state = 'mix', t = 0;
    function build() {
      while (win.firstChild) win.removeChild(win.firstChild); mols = [];
      var rnd = m7rng(state === 'ec' ? 11 : state === 'dmc' ? 23 : 37);
      if (state === 'ec') { // a solid: molecules on a lattice, the salt not shown dissolved
        for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) { var m = m7mol(win, 'ec', wx + 16 + c * 25 + (r % 2) * 6, wy + 16 + r * 27, (r + c) % 2 ? 0 : Math.PI); m.fx = m.x; m.fy = m.y; m.ph = 0; mols.push(m); }
        return;
      }
      var nLi = 3, perLi = state === 'dmc' ? { ec: 0, dmc: P.solventPerIon([DMC], 1) } : { ec: P.solventPerIon([{ phi: 0.3, rho: EC.rho, M: EC.M }], 1), dmc: P.solventPerIon([{ phi: 0.7, rho: DMC.rho, M: DMC.M }], 1) };
      var list = [];
      for (var i = 0; i < Math.round(perLi.ec * nLi); i++) list.push('ec');
      for (i = 0; i < Math.round(perLi.dmc * nLi); i++) list.push('dmc');
      var spots = []; // jittered grid, so that glyphs do not pile up
      for (var yy = 0; yy < 8; yy++) for (var xx = 0; xx < 7; xx++) spots.push({ x: wx + 14 + xx * 21.5 + rnd() * 6, y: wy + 14 + yy * 20.5 + rnd() * 6 });
      spots.sort(function () { return rnd() - 0.5; });
      var k = 0;
      for (i = 0; i < nLi; i++) {
        var s = spots[k++], li = m7li(win, s.x, s.y, 4.5); li.fx = s.x; li.fy = s.y; li.ph = rnd() * 6; li.kind = 'li'; mols.push(li);
        var sa = state === 'dmc' ? { x: s.x + 11, y: s.y + 1 } : spots[k++]; // in DMC the anion sits against the cation: paired
        var an = m7anion(win, sa.x, sa.y, 5.5); an.fx = sa.x; an.fy = sa.y; an.ph = rnd() * 6; an.kind = 'an'; an.partner = state === 'dmc' ? li : null; mols.push(an);
      }
      list.forEach(function (type) { var s = spots[k++]; if (!s) return; var m = m7mol(win, type, s.x, s.y, rnd() * 6.28); m.fx = s.x; m.fy = s.y; m.ph = rnd() * 6; m.spin = (rnd() - 0.5) * 0.8; mols.push(m); });
    }
    function render() {
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-solv') === state)); });
      var c = state === 'ec' ? { ec: P.solventPerIon([EC], 1), dmc: 0 } : state === 'dmc' ? { ec: 0, dmc: P.solventPerIon([DMC], 1) } : { ec: P.solventPerIon([{ phi: 0.3, rho: 1.32, M: 88.1 }], 1), dmc: P.solventPerIon([{ phi: 0.7, rho: 1.06, M: 90.1 }], 1) };
      var vals = [c.ec, c.dmc, 1, 1], max = 16;
      bars.forEach(function (b, i) { var h = vals[i] / max * (bh - 20); b.r.setAttribute('y', by + bh - h); b.r.setAttribute('height', h); b.v.setAttribute('y', by + bh - h - 5); setSvgText(b.v, vals[i] ? (i < 2 ? fmt(vals[i], 1) : '1') : '0'); });
      setSvgText(r3, state === 'ec' ? 'EC alone' : state === 'dmc' ? 'DMC alone' : 'EC : DMC'); setSvgText(r4, state === 'mix' ? '3 : 7' : '');
      liq.setAttribute('fill-opacity', state === 'ec' ? '.32' : '.14');
      setSvgText(cap, state === 'ec' ? 'solid below about 36 °C' : state === 'dmc' ? 'ions mostly in pairs' : 'more ions apart');
      build();
      read.innerHTML = state === 'ec'
        ? '<b>EC alone.</b> Relative permittivity 90 and viscosity 1.9 mPa s (both at 40 °C): very good at pulling a salt apart, but EC melts at about 36 °C, so at room temperature it is a solid. 1 litre holds ' + fmt(c.ec, 1) + ' mol of it.'
        : state === 'dmc'
        ? '<b>DMC alone.</b> Viscosity 0.59 mPa s against EC’s 1.9, so it flows easily; relative permittivity only 3.1, so it separates ions poorly and most of them stay in pairs. Measured with LiTFSI, the conductivity in DMC is only 11 % of what fully independent ions would give, against 62 % in PC.'
        : '<b>The mixture, 3 : 7 by volume.</b> For every Li⁺ there are about ' + fmt(c.ec, 1) + ' EC and ' + fmt(c.dmc, 1) + ' DMC molecules, ' + fmt(c.ec + c.dmc, 1) + ' in all, and one PF₆⁻. EC separates the ions, DMC thins the liquid, and the two together stay liquid far below EC’s melting point.';
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      var a = state === 'ec' ? 0.4 : 2.2;
      mols.forEach(function (m, i) {
        var x = m.fx + Math.sin(t * 1.7 + (m.ph || 0) + i) * a, y = m.fy + Math.cos(t * 1.3 + (m.ph || 0) * 1.3 + i) * a;
        if (m.partner) { x = m.partner.x + 11; y = m.partner.y + 1; }
        if (m.set.length === 2) m.set(x, y); else m.set(x, y, m.a + (m.spin || 0) * dt);
      });
    }
    Array.prototype.forEach.call(btns, function (b) { on(b, 'click', function () { state = b.getAttribute('data-solv'); render(); }); });
    steps(fig, [
      { text: 'The recipe of most commercial lithium-ion electrolytes: about <b>1 mol of LiPF₆</b> per litre of a mixture of a cyclic carbonate, here EC, and a linear one, here DMC.' },
      { text: 'Count the molecules. For every lithium ion there is one PF₆⁻ anion and about <b>13 solvent molecules</b>. Most of the liquid is solvent; the ions are the minority that carries the current.' },
      { text: 'Zoom in to a few nanometres. Everything moves; nothing is in rows. Try the three buttons: EC alone is a solid, DMC alone leaves the ions paired, the mixture gets both jobs done.' }
    ]);
    render();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    tick(0.01); bind(fig, loop);
  });

  /* ===== 7.6 How the ion moves ===== */
  register('f7-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), fb = fig.querySelector('.fieldbtn');
    var x0 = 18, y0 = 36, w = 316, h = 196;
    el('rect', { x: x0, y: y0, width: w, height: h, rx: 6, fill: 'var(--cyan)', 'fill-opacity': '.05', stroke: 'var(--line-2)' }, g);
    var rnd = m7rng(91), bg = el('g', { opacity: '.45' }, g), bgm = [];
    for (var i = 0; i < 26; i++) { var m = m7mol(bg, i % 3 ? 'dmc' : 'ec', x0 + 12 + rnd() * (w - 24), y0 + 12 + rnd() * (h - 24), rnd() * 6.28); m.fx = m.x; m.fy = m.y; bgm.push(m); }
    var trail = el('polyline', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.4, 'stroke-opacity': '.8' }, g);
    // the field: plates at the two ends and arrows across the liquid
    var farr = el('g', {}, g);
    el('rect', { x: x0 - 8, y: y0, width: 6, height: h, fill: 'var(--heat)', 'fill-opacity': '.8' }, farr); txt(farr, x0 - 5, y0 - 6, '+', 'heat', 'middle', { style: 'font-size:15px;font-weight:700' });
    el('rect', { x: x0 + w + 2, y: y0, width: 6, height: h, fill: 'var(--cyan-2)', 'fill-opacity': '.9' }, farr); txt(farr, x0 + w + 5, y0 - 6, '−', 'cyan', 'middle', { style: 'font-size:15px;font-weight:700' });
    [0.2, 0.5, 0.8].forEach(function (f) { arrow(farr, x0 + 40, y0 + h * f, x0 + w - 40, y0 + h * f, 'rgba(196,181,247,.35)', 1.2); });
    txt(farr, x0 + w / 2, y0 - 8, 'field: from + to −', 'field', 'middle');
    var others = [];
    [[1, 0.3], [1, 0.75], [-1, 0.2], [-1, 0.55], [-1, 0.85]].forEach(function (o, k) {
      var c = el('circle', { r: o[0] > 0 ? 4.5 : 6, 'class': o[0] > 0 ? 'ion' : 'ion an' }, g);
      others.push({ z: o[0], c: c, x: x0 + 40 + k * 55, y: y0 + h * o[1], vx: 0, vy: 0 });
    });
    var shellC = el('circle', { r: 15, fill: 'none', stroke: 'var(--cyan)', 'stroke-dasharray': '2 2' }, g);
    var ion = ourIon(g, 0, 0, 5, 'our ion', true);
    var cnt = txt(g, x0 + w - 6, y0 + h - 8, '', 'amber', 'end');
    var flab = txt(g, x0 + w / 2, y0 + h + 18, '', 'amber', 'middle');
    badge(g, x0 + 18, y0 + 18, 1); badge(g, x0 + w - 18, y0 + 18, 2);
    // right: the two ways of moving
    var rx = 350;
    txt(g, rx + 78, 30, 'two ways to move', 'strong', 'middle');
    txt(g, rx + 8, 54, 'carried with its shell', '', 'start');
    txt(g, rx + 8, 150, 'handed on, shell to shell', '', 'start');
    var veh = el('g', {}, g), vli = m7li(veh, 0, 0, 5), vsh = [0, 1, 2, 3].map(function (k) { return m7mol(veh, k % 2 ? 'dmc' : 'ec', 0, 0, 0); });
    var exg = el('g', {}, g), eA = [], eB = [], eli = m7li(exg, 0, 0, 5);
    [0, 1, 2].forEach(function (k) { eA.push(m7mol(exg, 'ec', 0, 0, 0)); eB.push(m7mol(exg, k === 1 ? 'dmc' : 'ec', 0, 0, 0)); });
    var cA = { x: rx + 46, y: 196 }, cB = { x: rx + 116, y: 196 };
    [[-2.0, 2.0, Math.PI], [-1.1, 1.1, 0]].forEach(function (set, j) { set.forEach(function (a, k) { m7aim((j ? eB : eA)[k], j ? cB.x : cA.x, j ? cB.y : cA.y, a, 16); }); });
    badge(g, rx + 156, 30, 3);
    var on1 = false, t = 0, p = { x: x0 + 70, y: y0 + h / 2, vx: 0, vy: 0, z: 1 }, pts = [], laps = 0, net = 0;
    function render() {
      fb.setAttribute('aria-pressed', String(on1)); setSvgText(fb, on1 ? 'Switch the field off' : 'Switch the field on');
      farr.style.display = on1 ? '' : 'none';
      setSvgText(flab, on1 ? 'Li⁺ drift to −, PF₆⁻ to + (drift exaggerated)' : 'no field: no net direction');
      read.innerHTML = on1
        ? '<b>Field on.</b> Every ion still wanders, but each step is nudged: the lithium ions (amber) drift towards the − plate, down the potential, and the PF₆⁻ anions (grey) towards the + plate. Watch the track of our ion head right. In a real cell the nudge is far gentler than drawn: at 1 mA/cm² the lithium ions move on average about 0.1 µm per second.'
        : '<b>No field.</b> The ion wanders at random, bumped by its neighbours; it is as likely to go left as right, so on average it goes nowhere. This is diffusion.';
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      // random walk with an optional drift; the drift is exaggerated for visibility (see label)
      walk(p, dt);
      others.forEach(function (o) { walk(o, dt); o.c.setAttribute('cx', o.x.toFixed(1)); o.c.setAttribute('cy', o.y.toFixed(1)); });
      ion.move(p.x, p.y); shellC.setAttribute('cx', p.x); shellC.setAttribute('cy', p.y);
      setSvgText(cnt, on1 ? 'our ion has crossed ' + laps + (laps === 1 ? ' time' : ' times') : '');
      pts.push(p.x.toFixed(1) + ',' + p.y.toFixed(1)); if (pts.length > 400) pts.shift(); trail.setAttribute('points', pts.join(' '));
      bgm.forEach(function (m, j) { m.set(m.fx + Math.sin(t * 1.3 + j) * 2.5, m.fy + Math.cos(t * 1.7 + j) * 2.5, m.a + 0.4 * dt); });
      // carried: the whole solvated ion slides across
      var k = (t % 6) / 6, vx = rx + 24 + 110 * k, vy = 94;
      vli.set(vx, vy); vsh.forEach(function (m, j) { m7aim(m, vx, vy, j * Math.PI / 2 + Math.PI / 4, 13); });
      // handed on: the ion leaves the shell on the left and enters the shell on the right
      var q = (t % 5) / 5, ex = q < 0.35 ? cA.x : q > 0.65 ? cB.x : lerp(cA.x, cB.x, smooth((q - 0.35) / 0.3));
      eli.set(ex, cA.y);
    }
    /* a random walk with friction, plus a steady drift when the field is on: cations towards the - plate (right), anions towards + (left).
       The drift is exaggerated relative to the wandering so that it can be seen (see the label). */
    function walk(o, dt) {
      var kick = 420 * Math.sqrt(dt), drift = on1 ? 42 * o.z : 0;
      o.vx += (Math.random() - 0.5) * kick - o.vx * 3 * dt; o.vy += (Math.random() - 0.5) * kick - o.vy * 3 * dt;
      o.x += (o.vx + drift) * dt; o.y += o.vy * dt;
      if (o.y < y0 + 14) { o.y = y0 + 14; o.vy = Math.abs(o.vy); } if (o.y > y0 + h - 26) { o.y = y0 + h - 26; o.vy = -Math.abs(o.vy); }
      if (on1) {
        if (o.x > x0 + w - 12) { o.x = x0 + 14; if (o === p) { laps++; pts = []; } }
        if (o.x < x0 + 12) { o.x = x0 + w - 14; if (o === p) pts = []; }
      } else {
        if (o.x < x0 + 14) { o.x = x0 + 14; o.vx = Math.abs(o.vx); } if (o.x > x0 + w - 14) { o.x = x0 + w - 14; o.vx = -Math.abs(o.vx); }
      }
    }
    on(fb, 'click', function () { on1 = !on1; pts = []; laps = 0; render(); if (!motion) { for (var n = 0; n < 120; n++) tick(0.05); } });
    steps(fig, [
      { text: 'Without a field the ion takes a <b>random walk</b>: it is bumped by the molecules around it, in every direction alike. The amber line is its track. On average it gets nowhere; it only spreads out.' },
      { text: 'Draw current and a small field appears across the liquid. Every step is now nudged one way, cations down the potential and anions up it. Press <b>Switch the field on</b>. The drift is exaggerated here so that you can see it.' },
      { text: 'Two ways to move, in roughly equal measure in EC : DMC with LiPF₆: the ion <b>carries its shell along</b>, or it is <b>handed on</b>, leaving some molecules behind and picking up new ones.' }
    ]);
    render();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.3 });
    for (i = 0; i < 90; i++) tick(0.05);
    bind(fig, loop);
  });


  /* =================================================================
     Module 7: molecules in three dimensions. A small ball-and-stick renderer
     (rotation, perspective, depth sorting, shaded atoms) for the solvents, the
     salt and the solvation shell. Structures follow the chemical names (ethylene
     carbonate is cyclic, dimethyl carbonate a chain, Ue et al. 2014 (R54) Table
     2.1; PF6- octahedral, Henderson 2014 (R53) Fig. 1.3). Atom positions are
     approximate, built from typical bond lengths; the only distance taken from a
     source is the Li-O distance of the solvation shell, 2.04 Angstrom (Borodin
     2014 (R57) p. 382). Atoms are drawn smaller than their real size so that the
     bonds stay visible.
     ================================================================= */

  var M3_COL = { C: ['#c3ccd3', '#5d6a73'], O: ['#ff9a8c', '#c0392b'], H: ['#ffffff', '#aab4ba'], F: ['#bff5b5', '#3e9e45'], P: ['#ffc58a', '#c76a12'], Li: ['#ffe6a3', '#d39b10'], Co: ['#a9c6ff', '#2b55b8'] };
  var M3_R = { C: 0.42, O: 0.42, H: 0.25, F: 0.4, P: 0.55, Li: 0.62, Co: 0.5 }; // display radii in Angstrom (ball-and-stick, not van der Waals)
  function m3defs(svg, pfx) {
    var defs = el('defs', {}, svg);
    Object.keys(M3_COL).forEach(function (k) {
      var gr = el('radialGradient', { id: pfx + '-' + k, cx: '35%', cy: '30%', r: '70%' }, defs);
      el('stop', { offset: '0%', 'stop-color': M3_COL[k][0] }, gr); el('stop', { offset: '100%', 'stop-color': M3_COL[k][1] }, gr);
    });
  }
  /* Molecular geometries computed for this page: B3LYP/def2-SVP, optimised with PySCF (2026-10-01).
     Coordinates in Angstrom. bind = index of the atom that binds Li+ (the carbonyl oxygen). */
  var M3_GEOM = {"ec": [["C", 0.0, 1.168, -0.0], ["O", 1.096, 0.386, 0.187], ["O", -1.096, 0.386, -0.187], ["C", -0.766, -0.979, 0.053], ["C", 0.766, -0.979, -0.053], ["O", -0.0, 2.356, 0.0], ["H", -1.119, -1.268, 1.058], ["H", -1.261, -1.611, -0.697], ["H", 1.261, -1.611, 0.697], ["H", 1.119, -1.268, -1.058]], "dmc": [["C", 0.0, 0.149, -0.0], ["O", 0.0, 1.355, -0.0], ["O", 1.083, -0.633, -0.0], ["O", -1.083, -0.633, -0.0], ["C", 2.335, 0.048, 0.0], ["C", -2.335, 0.048, 0.0], ["H", 3.105, -0.733, 0.0], ["H", 2.439, 0.683, 0.893], ["H", 2.439, 0.683, -0.893], ["H", -3.105, -0.733, 0.0], ["H", -2.439, 0.683, 0.893], ["H", -2.439, 0.683, -0.893]], "pf6": [["P", -0.0, -0.0, 0.0], ["F", 1.639, 0.0, 0.0], ["F", -1.639, 0.0, -0.0], ["F", 0.0, 1.639, -0.0], ["F", 0.0, -1.639, -0.0], ["F", 0.0, 0.0, 1.639], ["F", -0.0, -0.0, -1.639]]};
  var M7_QC = {"dipole": {"ec": 5.23, "dmc": 0.33, "pf6": 0.0}, "maps": {"ec": {"R": 5.6, "atoms": [["C", 0.0, 0.779], ["O", 1.108, -0.004], ["O", -1.108, -0.004], ["C", -0.757, -1.369], ["C", 0.757, -1.369], ["O", -0.0, 1.967], ["H", -1.016, -1.658], ["H", -1.32, -2.001], ["H", 1.32, -2.001], ["H", 1.016, -1.658]], "espMin": -1.77, "espMax": 1.68}, "dmc": {"R": 6.2, "atoms": [["C", -0.0, 0.093], ["O", -0.0, 1.299], ["O", 1.083, -0.689], ["O", -1.083, -0.689], ["C", 2.335, -0.008], ["C", -2.335, -0.008], ["H", 3.105, -0.789], ["H", 2.439, 0.627], ["H", 2.439, 0.627], ["H", -3.105, -0.789], ["H", -2.439, 0.627], ["H", -2.439, 0.627]], "espMin": -1.54, "espMax": 0.83}, "pf6": {"R": 5.0, "atoms": [["P", 0.0, 0.0], ["F", 1.639, -0.0], ["F", -1.639, 0.0], ["F", 0.0, 1.639], ["F", 0.0, -1.639], ["F", 0.0, 0.0], ["F", -0.0, 0.0]], "espMin": -5.43, "espMax": -4.73}, "li": {"R": 3.4, "atoms": [["Li", 0.0, 0.0]], "espMin": 14.51, "espMax": 15.25}}};
  function m3fromGeom(k, bind) {
    var A = M3_GEOM[k].map(function (a) { return { e: a[0], p: [a[1], a[2], a[3]] }; }), b = [];
    for (var i = 0; i < A.length; i++) for (var j = i + 1; j < A.length; j++) {
      var d = Math.hypot(A[i].p[0] - A[j].p[0], A[i].p[1] - A[j].p[1], A[i].p[2] - A[j].p[2]);
      if (d < 1.7 && !(A[i].e === 'H' && A[j].e === 'H')) b.push([i, j, (A[i].e === 'C' && A[j].e === 'O' || A[i].e === 'O' && A[j].e === 'C') && d < 1.25 ? 2 : 1]);
    }
    return { atoms: A, bonds: b, bind: bind };
  }
  function m3EC() { return m3fromGeom('ec', 5); }
  function m3DMC() { return m3fromGeom('dmc', 1); }
  function m3PF6() { return m3fromGeom('pf6', 1); }
  function m3centre(tpl) { var c = [0, 0, 0], A = tpl.atoms; A.forEach(function (x) { c[0] += x.p[0] / A.length; c[1] += x.p[1] / A.length; c[2] += x.p[2] / A.length; }); return { atoms: A.map(function (x) { return { e: x.e, p: [x.p[0] - c[0], x.p[1] - c[1], x.p[2] - c[2]] }; }), bonds: tpl.bonds, bind: tpl.bind }; }
  function m3Li() { return { atoms: [{ e: 'Li', p: [0, 0, 0] }], bonds: [], bind: 0 }; }
  /* vector helpers */
  function v3n(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function v3x(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function v3d(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function v3rot(v, k, th) { // Rodrigues: rotate v about unit axis k by th
    var c = Math.cos(th), s = Math.sin(th), kx = v3x(k, v), kd = v3d(k, v);
    return [v[0] * c + kx[0] * s + k[0] * kd * (1 - c), v[1] * c + kx[1] * s + k[1] * kd * (1 - c), v[2] * c + kx[2] * s + k[2] * kd * (1 - c)];
  }
  /* place a template so that its binding atom sits at distance d from point L along unit n,
     with the molecule pointing away from L; spin turns it about that axis */
  function m3place(tpl, L, n, d, spin) {
    var A = tpl.atoms, B = A[tpl.bind].p, cen = [0, 0, 0];
    A.forEach(function (x) { cen[0] += x.p[0] / A.length; cen[1] += x.p[1] / A.length; cen[2] += x.p[2] / A.length; });
    var v = v3n([B[0] - cen[0], B[1] - cen[1], B[2] - cen[2]]), want = [-n[0], -n[1], -n[2]];
    var ax = v3x(v, want), s = Math.hypot(ax[0], ax[1], ax[2]), th = Math.atan2(s, v3d(v, want));
    ax = s < 1e-6 ? (Math.abs(v[0]) < 0.9 ? v3n(v3x(v, [1, 0, 0])) : v3n(v3x(v, [0, 1, 0]))) : [ax[0] / s, ax[1] / s, ax[2] / s];
    var tgt = [L[0] + n[0] * d, L[1] + n[1] * d, L[2] + n[2] * d];
    var out = A.map(function (x) {
      var q = [x.p[0] - B[0], x.p[1] - B[1], x.p[2] - B[2]];
      q = th > 1e-6 || s < 1e-6 ? v3rot(q, ax, s < 1e-6 && v3d(v, want) > 0 ? 0 : th) : q;
      q = v3rot(q, want, spin || 0);
      return { e: x.e, p: [q[0] + tgt[0], q[1] + tgt[1], q[2] + tgt[2]] };
    });
    return { atoms: out, bonds: tpl.bonds, bind: tpl.bind };
  }
  /* a scene: several placed molecules drawn into one group, depth sorted every frame */
  function m3scene(g, pfx) {
    var S = { items: [], mols: [], g: g };
    S.add = function (m, opts) {
      opts = opts || {};
      var mol = { atoms: [], bonds: [], off: [0, 0, 0], fade: 1, tag: opts.tag };
      m.atoms.forEach(function (a, i) {
        var node = el('circle', { fill: 'url(#' + pfx + '-' + a.e + ')', stroke: 'rgba(0,0,0,.35)', 'stroke-width': .6 }, g);
        var it = { kind: 'a', e: a.e, p: a.p.slice(), node: node, mol: mol, hl: Array.isArray(opts.hl) ? opts.hl.indexOf(i) >= 0 : opts.hl === i };
        if (it.hl) { it.ring = el('circle', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }, g); }
        mol.atoms.push(it); S.items.push(it);
      });
      m.bonds.forEach(function (b) {
        var node = el('g', {}, g), n = b[2] || 1, lines = [];
        for (var k = 0; k < n; k++) lines.push(el('line', { stroke: '#d9e2e6', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-opacity': '.85' }, node));
        var it = { kind: 'b', a: mol.atoms[b[0]], b: mol.atoms[b[1]], node: node, lines: lines, mol: mol };
        mol.bonds.push(it); S.items.push(it);
      });
      S.mols.push(mol); return mol;
    };
    S.clear = function () { while (g.firstChild) g.removeChild(g.firstChild); S.items = []; S.mols = []; };
    /* view: yaw, pitch (radians), cx, cy, scale px per Angstrom, centre (Angstrom) */
    S.draw = function (V) {
      var cy = Math.cos(V.yaw), sy = Math.sin(V.yaw), cp = Math.cos(V.pitch), sp = Math.sin(V.pitch), c0 = V.centre || [0, 0, 0];
      S.items.forEach(function (it) {
        if (it.kind !== 'a') return;
        var x = it.p[0] + it.mol.off[0] - c0[0], y = it.p[1] + it.mol.off[1] - c0[1], z = it.p[2] + it.mol.off[2] - c0[2];
        var x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        var f = 1 / (1 - z2 / 40);
        it.sx = V.cx + x1 * V.scale * f; it.sy = V.cy - y1 * V.scale * f; it.z = z2; it.f = f;
      });
      S.items.forEach(function (it) {
        if (it.kind === 'a') {
          var r = M3_R[it.e] * V.scale * it.f;
          it.node.setAttribute('cx', it.sx.toFixed(1)); it.node.setAttribute('cy', it.sy.toFixed(1)); it.node.setAttribute('r', r.toFixed(1));
          it.node.style.opacity = String(it.mol.fade);
          if (it.ring) { it.ring.setAttribute('cx', it.sx.toFixed(1)); it.ring.setAttribute('cy', it.sy.toFixed(1)); it.ring.setAttribute('r', (r + 4).toFixed(1)); it.ring.style.opacity = String(it.mol.fade); }
        } else {
          var dx = it.b.sx - it.a.sx, dy = it.b.sy - it.a.sy, L = Math.hypot(dx, dy) || 1, nx = -dy / L * 2.2, ny = dx / L * 2.2, n = it.lines.length;
          it.z = (it.a.z + it.b.z) / 2 - 0.01;
          it.lines.forEach(function (ln, k) {
            var o = n === 1 ? 0 : (k - 0.5) * 2;
            ln.setAttribute('x1', (it.a.sx + nx * o).toFixed(1)); ln.setAttribute('y1', (it.a.sy + ny * o).toFixed(1)); ln.setAttribute('x2', (it.b.sx + nx * o).toFixed(1)); ln.setAttribute('y2', (it.b.sy + ny * o).toFixed(1));
          });
          it.node.style.opacity = String(it.mol.fade);
        }
      });
      S.items.slice().sort(function (p, q) { return p.z - q.z; }).forEach(function (it) { g.appendChild(it.node); if (it.ring) g.appendChild(it.ring); });
    };
    return S;
  }
  /* drag to turn a 3D view */
  function m3drag(svg, V, redraw) {
    var down = null;
    svg.style.touchAction = 'pan-y';
    on(svg, 'pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, yaw: V.yaw, pitch: V.pitch }; V.held = true; });
    on(window, 'pointerup', function () { down = null; V.held = false; });
    on(svg, 'pointermove', function (e) { if (!down) return; V.yaw = down.yaw + (e.clientX - down.x) * 0.012; V.pitch = Math.max(-1.3, Math.min(1.3, down.pitch + (e.clientY - down.y) * 0.012)); redraw(); });
  }

  /* ===== 7.1 Meet the molecules ===== */
  register('f7-1', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), btns = fig.querySelectorAll('button[data-mol]'), vbtns = fig.querySelectorAll('button[data-view]');
    var pfx = 'm71'; m3defs(svg, pfx);
    var g = el('g', {}, svg), stage = el('g', {}, g), S = m3scene(stage, pfx);
    var clip = el('clipPath', { id: pfx + '-clip' }, svg.querySelector('defs')); el('rect', { x: 14, y: 50, width: 420, height: 196, rx: 10 }, clip);
    var maps = el('g', { 'clip-path': 'url(#' + pfx + '-clip)' }, g);
    var V = { yaw: 0.6, pitch: 0.35, cx: 236, cy: 150, scale: 30 };
    var name = txt(g, 236, 22, '', 'strong', 'middle'), sub = txt(g, 236, 40, '', '', 'middle');
    var hint = txt(g, 236, 262, '', '', 'middle');
    var key = el('g', {}, g);
    [['C', 'carbon'], ['O', 'oxygen'], ['H', 'hydrogen'], ['F', 'fluorine'], ['P', 'phosphorus'], ['Li', 'lithium']].forEach(function (k, i) {
      var y = 70 + i * 24; el('circle', { cx: 494, cy: y, r: 7, fill: 'url(#' + pfx + '-' + k[0] + ')' }, key); txt(key, 482, y + 4, k[1], '', 'end');
    });
    // colour bars for the two maps
    var barD = el('g', {}, g), barE = el('g', {}, g);
    (function () {
      var gd = el('linearGradient', { id: pfx + '-bd', x1: '0', x2: '0', y1: '1', y2: '0' }, svg.querySelector('defs'));
      ['#0c2730', '#1f5b6b', '#3fa7a0', '#9fe3d9', '#fff3c4', '#ffffff'].forEach(function (c, k) { el('stop', { offset: (k / 5 * 100) + '%', 'stop-color': c }, gd); });
      el('rect', { x: 452, y: 66, width: 14, height: 150, fill: 'url(#' + pfx + '-bd)', stroke: 'var(--line-2)' }, barD);
      [['30', 66], ['1', 66 + 150 * 1.5 / 4.5], ['0.01', 66 + 150 * 3.5 / 4.5], ['0.001', 216]].forEach(function (t) { txt(barD, 472, t[1] + 4, t[0], '', 'start'); });
      txt(barD, 459, 240, 'electrons per Å³', '', 'middle');
      var ge = el('linearGradient', { id: pfx + '-be', x1: '0', x2: '0', y1: '1', y2: '0' }, svg.querySelector('defs'));
      ['#d7301f', '#f58f6b', '#f7f4ee', '#7fb3e6', '#2563c9'].forEach(function (c, k) { el('stop', { offset: (k / 4 * 100) + '%', 'stop-color': c }, ge); });
      el('rect', { x: 452, y: 66, width: 14, height: 150, fill: 'url(#' + pfx + '-be)', stroke: 'var(--line-2)' }, barE);
      [['+2 V', 66], ['0', 141], ['−2 V', 216]].forEach(function (t) { txt(barE, 472, t[1] + 4, t[0], '', 'start'); });
      txt(barE, 459, 240, 'potential', '', 'middle');
    })();
    var b1 = badge(g, 108, 150, 1), b2 = badge(g, 70, 190, 2), oTag = txt(g, 0, 0, 'carbonyl oxygen', 'amber tag ok', 'start'), names4 = el('g', {}, g);
    var cur = 'ec', view = '3d', IMG = '../assets/img/learn/m7-';
    var Q = M7_QC, fm = function (v, d) { return v.toFixed(d === undefined ? 1 : d).replace('-', '−'); };
    var INFO = {
      ec: ['ethylene carbonate (EC)', 'C₃H₄O₃: a ring'],
      dmc: ['dimethyl carbonate (DMC)', 'C₃H₆O₃: a chain'],
      pf6: ['the hexafluorophosphate anion (PF₆⁻)', 'one phosphorus, six fluorines'],
      li: ['the lithium ion (Li⁺)', 'one atom, one positive charge'],
      all: ['all four, to the same scale', 'EC, DMC, PF₆⁻ and Li⁺']
    };
    var TXT = {
      '3d': {
        ec: '<b>Ethylene carbonate, EC.</b> A ring of five atoms: two CH₂ carbons, two oxygens and the carbonate carbon. A third oxygen, the <b>carbonyl oxygen</b> (ringed), sticks out of the ring; it is the atom that binds a lithium ion. EC is a cyclic carbonate.',
        dmc: '<b>Dimethyl carbonate, DMC.</b> The same carbonate group, but open: two CH₃ (methyl) groups, one on either side, instead of a ring. It is a linear carbonate. Its carbonyl oxygen (ringed) binds lithium too.',
        pf6: '<b>PF₆⁻.</b> A phosphorus atom with six fluorine atoms at the corners of an octahedron, carrying one negative charge between them. The P–F bonds are the weak point of the salt: they break easily, and with water they give hydrofluoric acid.',
        li: '<b>Li⁺.</b> A single lithium atom that has given up its outer electron. On its own it is tiny next to the molecules around it; in the liquid it is never on its own, as figure 7.5 shows.',
        all: '<b>All four, to the same scale.</b> The solvents are the large objects; the lithium ion is the smallest thing in the liquid. For every lithium ion there are about thirteen solvent molecules in the electrolyte of figure 7.2.'
      },
      dens: {
        ec: '<b>Where the electrons are, in EC.</b> A slice through the plane of the ring. Bright spots are the atoms, where the density peaks; the glow between them is the electrons shared in the bonds. The faint outer edge is where the molecule fades into space; the usual measure of its size is the surface at 0.001 electron per bohr³, about 0.007 per Å³.',
        dmc: '<b>Where the electrons are, in DMC.</b> A slice through the plane of the carbonate group and the two methyl carbons; the hydrogens stick out above and below the slice, so they show only faintly.',
        pf6: '<b>Where the electrons are, in PF₆⁻.</b> A slice through the phosphorus and four of the six fluorines. Each fluorine holds a dense cloud of its own; the extra electron is spread over the whole ion.',
        li: '<b>Where the electrons are, in Li⁺.</b> Only two electrons are left, held tightly close to the nucleus: a small, hard sphere.',
        all: '<b>The four side by side</b>, each as a slice through its own plane, all to the same scale.'
      },
      esp: {
        ec: '<b>Charge around EC.</b> The colour is the electric potential just outside the molecule (inside the white line it is grey). <b>Red is negative</b>, around the carbonyl oxygen, down to ' + fm(Q.maps.ec.espMin, 1) + ' V; blue is positive, at the CH₂ end, up to +' + fm(Q.maps.ec.espMax, 1) + ' V. One end negative, the other positive: EC is strongly polar, with a computed dipole moment of ' + fm(Q.dipole.ec, 1) + ' debye. A lithium ion is drawn to the red end.',
        dmc: '<b>Charge around DMC.</b> Red again near the carbonyl oxygen (' + fm(Q.maps.dmc.espMin, 1) + ' V) and on the two ether oxygens below; blue near the methyl hydrogens. The two halves almost cancel: the computed dipole moment is only ' + fm(Q.dipole.dmc, 1) + ' debye, which is why DMC separates ions poorly.',
        pf6: '<b>Charge around PF₆⁻.</b> Red all round, from ' + fm(Q.maps.pf6.espMax, 1) + ' to ' + fm(Q.maps.pf6.espMin, 1) + ' V: the extra electron makes the whole surface negative, but evenly, with no single point that grips a lithium ion strongly.',
        li: '<b>Charge around Li⁺.</b> Strongly positive all round, about +' + fm(Q.maps.li.espMin, 0) + ' V at its surface (off the scale): a small point of concentrated positive charge, which is why solvent oxygens crowd round it.',
        all: '<b>All four, the same colour scale.</b> The solvents are partly negative and partly positive; PF₆⁻ is negative all over and Li⁺ positive all over, both beyond the ±2 V scale.'
      }
    };
    function mapImg(k, cx, cy, size, kind) {
      var R = Q.maps[k].R, s = size / (2 * R);
      var nm = k + '-' + (kind === 'dens' ? 'd' : 'e') + '.webp';
      el('image', { href: (window.M7_IMG && window.M7_IMG['m7-' + nm]) || IMG + nm, x: cx - size / 2, y: cy - size / 2, width: size, height: size, preserveAspectRatio: 'none' }, maps);
      if (kind === 'dens' || cur !== 'all') Q.maps[k].atoms.forEach(function (a) { if (a[0] === 'H') return; txt(maps, cx + a[1] * s, cy - a[2] * s + 4, a[0], 'tag ok', 'middle', { style: 'font-size:10px' }); });
      return s;
    }
    function build() {
      S.clear(); while (maps.firstChild) maps.removeChild(maps.firstChild); while (names4.firstChild) names4.removeChild(names4.firstChild);
      V.centre = [0, 0, 0];
      stage.style.display = view === '3d' ? '' : 'none'; key.style.display = view === '3d' ? '' : 'none';
      barD.style.display = view === 'dens' ? '' : 'none'; barE.style.display = view === 'esp' ? '' : 'none';
      if (view === '3d') {
        if (cur === 'ec') S.add(m3centre(m3EC()), { hl: 5 });
        else if (cur === 'dmc') S.add(m3centre(m3DMC()), { hl: 1 });
        else if (cur === 'pf6') S.add(m3PF6());
        else if (cur === 'li') S.add(m3Li());
        else {
          var xs = [-6.4, -1.4, 3.1, 6.6];
          [m3EC(), m3DMC(), m3PF6(), m3Li()].forEach(function (tpl, i) { var m = S.add(m3centre(tpl), { hl: i < 2 ? (i === 0 ? 5 : 1) : undefined }); m.off = [xs[i], 0, 0]; });
          [['EC', -6.4], ['DMC', -1.4], ['PF₆⁻', 3.1], ['Li⁺', 6.6]].forEach(function (n) { txt(names4, V.cx + n[1] * 15, 232, n[0], 'strong', 'middle'); });
        }
        V.scale = cur === 'all' ? 15 : cur === 'li' ? 60 : 30;
        setSvgText(hint, 'drag to turn it; geometry computed for this page');
      } else {
        if (cur === 'all') {
          var ks = ['ec', 'dmc', 'pf6', 'li'], xs2 = [62, 172, 278, 372], sc = 9.5; // one scale for all four: 9.5 px per Angstrom
          ks.forEach(function (k, i) { mapImg(k, xs2[i], 150, 2 * Q.maps[k].R * sc, view); txt(names4, xs2[i], 232, ['EC', 'DMC', 'PF₆⁻', 'Li⁺'][i], 'strong', 'middle'); });
        } else {
          mapImg(cur, 216, 146, 2 * Q.maps[cur].R * (cur === 'li' ? 34 : 27), view);
        }
        setSvgText(hint, view === 'dens' ? 'computed electron density, slice through the molecule' : 'computed electric potential around the molecule');
      }
      setSvgText(name, INFO[cur][0]); setSvgText(sub, INFO[cur][1]);
      read.innerHTML = TXT[view][cur];
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mol') === cur)); });
      Array.prototype.forEach.call(vbtns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === view)); });
      draw();
    }
    function draw() {
      var showO = false, h = null;
      if (view === '3d') { S.draw(V); S.items.forEach(function (it) { if (it.hl && !h) h = it; }); showO = h && cur !== 'all'; }
      b2.style.display = showO ? '' : 'none'; oTag.style.display = showO ? '' : 'none'; b1.style.display = view === '3d' ? '' : 'none';
      if (showO) { b2.setAttribute('transform', 'translate(' + (h.sx - 18).toFixed(1) + ',' + (h.sy - 14).toFixed(1) + ')'); oTag.setAttribute('x', (h.sx + 12).toFixed(1)); oTag.setAttribute('y', (h.sy - 8).toFixed(1)); }
    }
    var tt = 0;
    function tick(dt) { if (dt === 0 || view !== '3d') return; tt += dt; if (!V.held) { if (cur === 'all') V.yaw = 0.35 * Math.sin(tt * 0.6); else V.yaw += dt * 0.5; } draw(); }
    Array.prototype.forEach.call(btns, function (b) { on(b, 'click', function () { cur = b.getAttribute('data-mol'); if (cur === 'all') V.yaw = 0; build(); }); });
    Array.prototype.forEach.call(vbtns, function (b) { on(b, 'click', function () { view = b.getAttribute('data-view'); build(); }); });
    m3drag(svg, V, draw);
    steps(fig, [
      { text: 'The two solvents share one group of atoms, the <b>carbonate</b>: a carbon bonded to three oxygens. In EC it closes into a ring; in DMC it is an open chain. Try the EC and DMC buttons and turn the molecules with your finger or mouse.', on: function () { view = '3d'; build(); } },
      { text: 'The ringed atom in both is the <b>carbonyl oxygen</b>, the one double-bonded to carbon. Remember it: it is the atom that holds on to a lithium ion in every figure that follows, where the molecules are drawn as simple symbols: a ring with a red dot for EC, a capsule with a red dot for DMC.', on: function () { view = '3d'; build(); } },
      { text: 'Press <b>Electron density</b>: where the electrons actually are. A molecule has no hard edge; its electron cloud fades out over a fraction of a nanometre. Atoms are the bright peaks, bonds the bridges between them.', on: function () { view = 'dens'; build(); } },
      { text: 'Press <b>Charge around it</b>: the electric potential just outside each molecule. Red regions attract a positive lithium ion, blue regions repel it. In EC the red end is the carbonyl oxygen, which is why the oxygen points at the lithium in every figure that follows.', on: function () { view = 'esp'; build(); } }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 7.4 Dissolving the salt ===== */
  register('f7-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 40, y0 = 60, sp = 26, nx = 4, ny = 6, cells = [];
    txt(g, x0 + sp * 1.5, 34, 'solid LiPF₆', 'strong', 'middle'); txt(g, 360, 34, 'solution', 'strong', 'middle');
    el('line', { x1: 168, y1: 44, x2: 168, y2: 222, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
    var lat = el('g', {}, g), sol = el('g', { opacity: '.42' }, g), out = el('g', {}, g);
    function anionGlyph(gp, x, y) { var grp = el('g', { transform: 'translate(' + x + ',' + y + ')' }, gp); el('circle', { r: 7.5, 'class': 'ion an' }, grp); [0, 1, 2, 3].forEach(function (k) { el('circle', { cx: Math.cos(k * Math.PI / 2 + 0.6) * 7.5, cy: Math.sin(k * Math.PI / 2 + 0.6) * 7.5, r: 2.2, fill: '#8be08b' }, grp); }); return grp; }
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var li = (i + j) % 2 === 0, x = x0 + i * sp, y = y0 + j * sp;
      cells.push({ li: li, x: x, y: y, node: li ? el('circle', { cx: x, cy: y, r: 5, 'class': 'ion' }, lat) : anionGlyph(lat, x, y), gone: false });
    }
    // solvent molecules in the solution, wandering
    var rnd = m7rng(17), mols = [];
    for (i = 0; i < 22; i++) { var m = m7mol(sol, i % 3 ? 'dmc' : 'ec', 190 + rnd() * 310, 52 + rnd() * 166, rnd() * 6.28); m.fx = m.x; m.fy = m.y; mols.push(m); }
    var free = []; // dissolved ions now in solution
    badge(g, x0 - 22, y0 - 4, 1); badge(g, 150, 214, 2); badge(g, 330, 214, 3);
    var job = null, t = 0, done = 0, tagLi = txt(g, 0, 0, 'Li⁺ in its new shell', 'amber tag ok', 'middle'), tagAn = txt(g, 0, 0, 'PF₆⁻: no fixed shell', 'strong tag ok', 'middle');
    tagLi.style.display = 'none'; tagAn.style.display = 'none';
    function startJob() {
      var edge = cells.filter(function (c) { return c.li && !c.gone && (c.x === x0 + (nx - 1) * sp || !cells.some(function (d) { return !d.gone && d.y === c.y && d.x === c.x + sp; })); });
      if (!edge.length) { reset(); return; }
      var c = edge[(rnd() * edge.length) | 0];
      var sh = [0, 1, 2, 3].map(function (k) { var mm = m7mol(out, k % 2 ? 'dmc' : 'ec', 200 + k * 20, 40 + k * 50, 0); mm.dir = [-2.4, -0.75, 0.75, 2.4][k]; return mm; });
      job = { c: c, sh: sh, k: 0, an: cells.find(function (d) { return !d.li && !d.gone && d.y === c.y && Math.abs(d.x - c.x) === sp; }) };
      job.dest = { x: 220 + rnd() * 250, y: 70 + rnd() * 130 };
    }
    /* weak, fleeting neighbours of a free anion: two faint solvent molecules circling loosely, CH end (not oxygen) towards it */
    function looseTick(f, dt) {
      if (!f.loose) return; f.la += dt;
      f.loose.forEach(function (m, j) { var ang = (j ? 1 : -0.7) * f.la * 0.5 + j * 2.6, r = 19 + 3 * Math.sin(f.la * 0.9 + j); m.set(Math.cos(ang) * r, Math.sin(ang) * r, ang); m.g.style.opacity = String(0.22 + 0.22 * Math.sin(f.la * 0.7 + j * 2)); });
    }
    function reset() { cells.forEach(function (c) { c.gone = false; c.node.style.display = ''; }); free.forEach(function (f) { f.g.parentNode && f.g.parentNode.removeChild(f.g); }); free = []; done = 0; }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      mols.forEach(function (m, i) { m.set(m.fx + Math.sin(t * 1.2 + i) * 4, m.fy + Math.cos(t * 0.9 + i * 1.3) * 4, m.a + 0.4 * dt); });
      free.forEach(function (f, i) { f.x += Math.sin(t * 0.8 + i) * 6 * dt; f.y += Math.cos(t * 0.7 + i * 2) * 6 * dt; f.set(f.x, f.y); looseTick(f, dt); });
      if (!job) { if (t > 0.6) startJob(); return; }
      job.k += dt / 5.5; var k = job.k, c = job.c;
      // phase 1 (0-0.35): solvent molecules arrive at the exposed Li+; phase 2 (0.35-1): it leaves with them
      var p = k < 0.35 ? { x: c.x, y: c.y } : { x: lerp(c.x, job.dest.x, smooth((k - 0.35) / 0.65)), y: lerp(c.y, job.dest.y, smooth((k - 0.35) / 0.65)) };
      if (k >= 0.35 && !c.gone) { c.gone = true; c.node.style.display = 'none'; job.ion = m7li(out, p.x, p.y, 5); }
      if (job.ion) { job.ion.set(p.x, p.y); tagLi.style.display = ''; tagLi.setAttribute('x', Math.max(70, p.x).toFixed(1)); tagLi.setAttribute('y', (p.y - 26).toFixed(1)); }
      job.sh.forEach(function (m, i) {
        var arr = smooth(Math.min(1, k / 0.33)), r = lerp(80, 13, arr);
        var dirs = [-1.0, 1.0, -0.35, 0.35]; // arrive from the solution side, on the right
        var dd = k < 0.35 ? dirs[i] : m.dir;
        m7aim(m, p.x, p.y, k < 0.35 ? dd : lerp(dirs[i], m.dir, smooth((k - 0.35) / 0.3)), r);
      });
      if (job.an && k > 0.5 && !job.an.gone) { job.an.gone = true; job.an.node.style.display = 'none'; var fa = { x: job.an.x, y: job.an.y }; fa.g = anionGlyph(out, fa.x, fa.y); fa.loose = [m7mol(fa.g, 'ec', 0, 0, 0), m7mol(fa.g, 'dmc', 0, 0, 0)]; fa.la = 0; fa.set = function (x, y) { fa.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')'); }; fa.vx = 30; job.fa = fa; }
      if (job.fa) looseTick(job.fa, dt);
      if (job.fa && k <= 1) { job.fa.x = lerp(job.fa.x, 200 + ((done * 97) % 280), dt * 0.9); job.fa.y = lerp(job.fa.y, 60 + ((done * 53) % 150), dt * 0.9); job.fa.set(job.fa.x, job.fa.y); tagAn.style.display = ''; tagAn.setAttribute('x', Math.max(50, job.fa.x).toFixed(1)); tagAn.setAttribute('y', (job.fa.y + 22).toFixed(1)); }
      if (k >= 1) {
        // the solvated ion becomes one object wandering in the solution
        var grp = el('g', {}, out); el('circle', { r: 27, fill: 'var(--cyan)', 'fill-opacity': '.07', stroke: 'var(--amber)', 'stroke-opacity': '.6', 'stroke-dasharray': '3 3' }, grp); var ion = m7li(grp, 0, 0, 5); job.sh.forEach(function (m) { m.g.parentNode.removeChild(m.g); });
        [0, 1, 2, 3].forEach(function (q) { var mm = m7mol(grp, q % 2 ? 'dmc' : 'ec', 0, 0, 0); m7aim(mm, 0, 0, [-2.4, -0.75, 0.75, 2.4][q], 13); });
        if (job.ion) job.ion.c.parentNode.removeChild(job.ion.c);
        var f = { g: grp, x: p.x, y: p.y, set: function (x, y) { grp.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')'); } }; f.set(p.x, p.y); free.push(f);
        if (job.fa) { job.fa.set = (function (fa) { return function (x, y) { fa.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')'); }; })(job.fa); free.push(job.fa); }
        done++; job = null; t = 0; tagLi.style.display = 'none'; tagAn.style.display = 'none';
        if (done >= 5) reset();
      }
    }
    steps(fig, [
      { text: 'Solid LiPF₆: Li⁺ and PF₆⁻ ions packed together, held by the attraction of opposite charges. (The real crystal is three-dimensional and arranged differently; this is a flat sketch.)' },
      { text: 'At the surface, solvent molecules turn their carbonyl oxygens towards an exposed lithium ion and bind to it, about four of them.' },
      { text: 'The lithium ion leaves the solid inside its new shell. The anion goes into the liquid too, but <b>without a shell of its own</b>: the carbonates have no acidic hydrogen to bind it, so solvent molecules only drift past, their slightly positive CH ends (blue in figure 7.1) a little nearer, and never stay. What you end up with is solvated Li⁺ and nearly bare PF₆⁻.' }
    ]);
    read.innerHTML = 'Dissolving is a tug of war for the lithium ion: the anions of the crystal on one side, the oxygens of the solvent on the other. In a good solvent the solvent wins. The anion is set free as well, but it stays almost unsolvated: the faint molecules near each PF₆⁻ come and go.';
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    for (i = 0; i < 150; i++) tick(0.1);
    bind(fig, loop);
  });

  /* ===== 7.5 One ion and its shell, in three dimensions ===== */
  register('f7-5', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), btns = fig.querySelectorAll('button[data-pair]');
    var pfx = 'm74'; m3defs(svg, pfx);
    var g = el('g', {}, svg), stage = el('g', {}, g), S = m3scene(stage, pfx);
    var V = { yaw: 0.4, pitch: 0.3, cx: 172, cy: 134, scale: 19 };
    var lbl = txt(g, 170, 22, '', 'amber', 'middle');
    txt(g, 170, 262, 'drag to turn; Li⁺ to O drawn at 0.204 nm', '', 'middle');
    badge(g, 30, 50, 1); badge(g, 30, 220, 2); badge(g, 306, 50, 3);
    // residence-time panel
    var px = 350, pw = 150;
    txt(g, px + pw / 2 + 4, 120, 'how long a partner stays', 'strong', 'middle');
    var Xn = function (ns) { return px + 8 + ns / 3 * (pw - 16); };
    el('line', { x1: Xn(0), y1: 196, x2: Xn(3), y2: 196, stroke: 'var(--line-2)' }, g);
    [0, 1, 2, 3].forEach(function (n) { el('line', { x1: Xn(n), y1: 196, x2: Xn(n), y2: 200, stroke: 'var(--line-2)' }, g); txt(g, Xn(n), 212, n + ' ns', '', 'middle'); });
    el('rect', { x: Xn(0), y: 140, width: Xn(0.5) - Xn(0), height: 14, fill: 'var(--cyan)', 'fill-opacity': '.7' }, g); txt(g, Xn(0.5) + 4, 151, 'EC: about 0.5', 'cyan', 'start');
    el('rect', { x: Xn(0), y: 166, width: Xn(2) - Xn(0), height: 14, fill: 'var(--anion)', 'fill-opacity': '.8' }, g); el('rect', { x: Xn(2), y: 166, width: Xn(3) - Xn(2), height: 14, fill: 'var(--anion)', 'fill-opacity': '.3', stroke: 'var(--anion)', 'stroke-dasharray': '2 2' }, g);
    txt(g, Xn(0) + 4, 177, 'anion: 2 to 3', 'strong', 'start');
    badge(g, px + pw - 2, 226, 4);
    var T = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v3n), d0 = 2.04, mode = 'ssip', shell = [], swap = null, swapT = 0;
    function build() {
      S.clear(); shell = [];
      S.add(m3Li());
      var types = [m3EC, m3DMC, m3EC, m3DMC];
      if (mode === 'ssip') {
        T.forEach(function (n, i) { var m = S.add(m3place(types[i](), [0, 0, 0], n, d0, i * 1.1), { hl: types[i] === m3EC ? 5 : 1 }); m.n = n; shell.push(m); });
        var an = S.add(m3PF6()); an.off = [7.4, 0, 0];
        V.centre = [1.4, 0, 0]; V.scale = 20;
      } else {
        [0, 1, 2].forEach(function (i) { var m = S.add(m3place(types[i](), [0, 0, 0], T[i], d0, i * 1.1), { hl: types[i] === m3EC ? 5 : 1 }); m.n = T[i]; shell.push(m); });
        var n4 = T[3], pf = m3place(m3PF6(), [0, 0, 0], n4, 1.9, 0.3); S.add(pf);
        if (mode === 'agg') {
          // the F opposite the bound one binds a second Li+, which has its own three solvent molecules
          var Fb = pf.atoms[1].p, Pp = pf.atoms[0].p, far = [2 * Pp[0] - Fb[0], 2 * Pp[1] - Fb[1], 2 * Pp[2] - Fb[2]];
          var L2 = [far[0] + n4[0] * 1.9, far[1] + n4[1] * 1.9, far[2] + n4[2] * 1.9], li2 = m3Li(); li2.atoms[0].p = L2; S.add(li2);
          var back = [-n4[0], -n4[1], -n4[2]], perp = v3n(v3x(back, [0, 1, 0.3]));
          [0, 1, 2].forEach(function (k) { var dir = v3n(v3rot(v3rot(back, perp, 1.91), back, k * 2.094)); S.add(m3place((k === 1 ? m3DMC : m3EC)(), L2, dir, d0, k), { hl: k === 1 ? 1 : 5 }); });
          V.centre = [L2[0] / 2, L2[1] / 2, L2[2] / 2]; V.scale = 12.5;
        } else { V.centre = [n4[0] * 1.2, n4[1] * 1.2, n4[2] * 1.2]; V.scale = 21; }
      }
      setSvgText(lbl, mode === 'ssip' ? 'solvent-separated ion pair (SSIP)' : mode === 'cip' ? 'contact ion pair (CIP)' : 'aggregate (AGG)');
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-pair') === mode)); });
      read.innerHTML = mode === 'ssip'
        ? '<b>Free ion.</b> Four solvent molecules, two EC and two DMC here, each holding the Li⁺ by its carbonyl oxygen (ringed), at the corners of a tetrahedron. The PF₆⁻ is outside the shell, with solvent between the two ions.'
        : mode === 'cip'
        ? '<b>Contact ion pair.</b> The anion has taken one of the four places, bound through a single fluorine, the arrangement simulations find most stable in the liquid. The pair as a whole carries no net charge.'
        : '<b>Aggregate.</b> One anion bound to two lithium ions at once, each with its own solvent: a charged cluster. Clusters like this still carry some current.';
      swap = null; swapT = 0; draw();
    }
    var tags = el('g', {}, g);
    function draw() {
      S.draw(V); while (tags.firstChild) tags.removeChild(tags.firstChild);
      var lis = S.mols.filter(function (m) { return m.atoms.length === 1; }).map(function (m) { return m.atoms[0]; });
      S.items.forEach(function (it) { if (!it.hl || it.mol.fade < 0.6) return; var best = null, bd = 1e9; lis.forEach(function (l) { var d = Math.hypot(l.sx - it.sx, l.sy - it.sy); if (d < bd) { bd = d; best = l; } }); if (best) el('line', { x1: best.sx, y1: best.sy, x2: it.sx, y2: it.sy, stroke: 'var(--amber)', 'stroke-width': 1.6, 'stroke-dasharray': '3 2', 'stroke-opacity': '.9' }, tags); });
      S.mols.forEach(function (m) {
        var n = m.atoms.length, x = 0, y = 0; m.atoms.forEach(function (a) { x += a.sx / n; y += a.sy / n; });
        var lab = n === 1 ? 'Li⁺' : n === 7 ? 'PF₆⁻' : n === 10 ? 'EC' : 'DMC';
        if (m.fade < 0.6) return;
        txt(tags, x, n === 1 ? y - 12 : y + 4, lab, n === 1 ? 'amber tag ok' : n === 7 ? 'strong tag ok' : 'cyan tag ok', 'middle');
      });
    }
    function tick(dt) {
      if (dt === 0) return;
      if (!V.held) V.yaw += dt * 0.35;
      swapT += dt;
      if (!swap && swapT > 3.5 && shell.length) swap = { m: shell[(Math.random() * shell.length) | 0], k: 0 };
      if (swap) {
        swap.k += dt / 2; var k = swap.k, out2 = k < 0.5 ? smooth(k * 2) : 1 - smooth((k - 0.5) * 2), n = swap.m.n;
        swap.m.off = [n[0] * out2 * 3.5, n[1] * out2 * 3.5, n[2] * out2 * 3.5]; swap.m.fade = 1 - out2 * 0.75;
        if (k >= 1) { swap.m.off = [0, 0, 0]; swap.m.fade = 1; swap = null; swapT = 0; }
      }
      draw();
    }
    Array.prototype.forEach.call(btns, function (b) { on(b, 'click', function () { mode = b.getAttribute('data-pair'); build(); }); });
    m3drag(svg, V, draw);
    steps(fig, [
      { text: 'Each Li⁺ (amber, centre) gathers solvent molecules that turn their <b>carbonyl oxygen</b> (ringed) towards it. About <b>four</b> of them make its first shell, at the corners of a tetrahedron: turn it and look.' },
      { text: 'The shell is tight: in propylene carbonate, neutron diffraction puts the oxygen <b>0.204 nm</b> from the lithium, with 4.5 molecules on average. That distance is drawn to scale; the other atom positions are approximate.' },
      { text: 'The anion competes for the same places. Free ion, contact pair or aggregate: try the three buttons. LiPF₆, with LiAsF₆, pairs up least of the common salts, which is one reason it conducts so well.' },
      { text: 'Nothing stays for long. A given EC molecule stays in the shell for about <b>half a nanosecond</b>, an anion partner for 2 to 3 ns; watch one molecule pull away and come back, slowed about ten billion times.' }
    ]);
    build();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 7.7 Layer by layer: the electrolyte against a graphite electrode =====
     Top: a molecular close-up of the first 2.4 nm, to scale (ball and stick, computed geometries).
     Basal-face views (negative, uncharged, positive) after the simulations in Borodin 2014 pp. 389-391:
     EC replaces DMC on a charged surface; carbonyls turned away at negative, towards at positive;
     PF6- gathers at positive; Li+ adsorbed and EC-solvated at negative. Edge view ("getting in"):
     graphite sheets end on, hydrogen-terminated, as in Borodin's desolvation model (Fig. 8.11: z = 0 at the
     graphite hydrogens, free-energy minimum about 5 A out, steep rise inside 4 A, DMC shed first, EC last).
     Bottom: the potential and the ion excess over the first 10 nm (Bard, Faulkner and White; schematic shapes)
     or, in the edge view, the free-energy profile with Borodin's numbers. */
  register('f7-7', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), btns = fig.querySelectorAll('button[data-q]');
    var pfx = 'm76'; m3defs(svg, pfx);
    var cl = el('clipPath', { id: pfx + '-clip' }, svg.querySelector('defs')); el('rect', { x: 0, y: 34, width: 512, height: 172 }, cl);
    var g = el('g', {}, svg), stage = el('g', { 'clip-path': 'url(#' + pfx + '-clip)' }, g), S = m3scene(stage, pfx), ann = el('g', {}, g), low = el('g', {}, g);
    var X0 = 92, PX = 15.5; // screen x of the electrode surface (x = 0) and pixels per Angstrom
    var V = { yaw: 0.0, pitch: 0.18, cx: X0, cy: 118, scale: PX, centre: [0, 0, 0] };
    var q = 'neg', t = 0, rnd, entering = null;
    function ang3() { var a = rnd() * 6.283, b = Math.acos(2 * rnd() - 1); return [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)]; }
    function mol(type, Opos, n, spin, opts) { var tpl = type === 'ec' ? m3EC() : m3DMC(); return S.add(m3place(tpl, [Opos[0] + n[0] * 0.001, Opos[1], Opos[2]], v3n(n), 0, spin || 0), opts || {}); }
    function ion(e, p) { var tpl = e === 'Li' ? m3Li() : m3centre(m3PF6()); var A = tpl.atoms.map(function (a) { return { e: a.e, p: [a.p[0] + p[0], a.p[1] + p[1], a.p[2] + p[2]] }; }); return S.add({ atoms: A, bonds: tpl.bonds }); }
    function sheetsBasal() { // three graphene sheets parallel to the surface, at x = 0, -3.35, -6.7
      var a = 2.46, s3 = Math.sqrt(3), atoms = [], bonds = [];
      [0, -3.35, -6.7].forEach(function (x, k) {
        var st = atoms.length, oy = k % 2 ? a / 2 : 0;
        for (var i = -8; i <= 8; i++) for (var j = -3; j <= 3; j++) { var y0 = i * a + j * a / 2 + oy, z0 = j * a * s3 / 2; [[y0, z0], [y0 + a / 2, z0 + a / (2 * s3)]].forEach(function (pt) { if (Math.abs(pt[0]) <= 7.6 && Math.abs(pt[1]) <= 2.2) atoms.push({ e: 'C', p: [x, pt[0], pt[1]] }); }); }
        for (var m = st; m < atoms.length; m++) for (var n = m + 1; n < atoms.length; n++) { var A = atoms[m].p, B = atoms[n].p; if (Math.hypot(A[1] - B[1], A[2] - B[2]) < 1.5) bonds.push([m, n, 1]); }
      });
      S.add({ atoms: atoms, bonds: bonds });
    }
    function sheetsEdge() { // graphite seen end on: sheets at y = +-1.675, +-5.025, ending at x = 0 with hydrogens
      var a = 2.46, s3 = Math.sqrt(3), atoms = [], bonds = [];
      [-5.025, -1.675, 1.675, 5.025].forEach(function (y) {
        var st = atoms.length;
        for (var i = -8; i <= 2; i++) for (var j = -3; j <= 3; j++) { var x0 = i * a + j * a / 2, z0 = j * a * s3 / 2; [[x0, z0], [x0 + a / 2, z0 + a / (2 * s3)]].forEach(function (pt) { if (pt[0] <= -1.1 && pt[0] >= -7 && Math.abs(pt[1]) <= 2.2) atoms.push({ e: 'C', p: [pt[0] + 1.1, y, pt[1]] }); }); }
        var edge = []; for (var m = st; m < atoms.length; m++) { var nb = 0; for (var n = st; n < atoms.length; n++) if (n !== m && Math.hypot(atoms[m].p[0] - atoms[n].p[0], atoms[m].p[2] - atoms[n].p[2]) < 1.5) { nb++; if (n > m) bonds.push([m, n, 1]); } if (nb < 3 && atoms[m].p[0] > -1.2) edge.push(m); }
        edge.forEach(function (m) { atoms.push({ e: 'H', p: [atoms[m].p[0] + 1.08, y, atoms[m].p[2]] }); bonds.push([m, atoms.length - 1, 1]); });
      });
      S.add({ atoms: atoms, bonds: bonds });
    }
    function filler(x0, x1, nEC, nDMC, ions) { // random liquid in the slab x0..x1 (Angstrom)
      var spots = []; for (var x = x0; x <= x1; x += 6.5) for (var y = -4.6; y <= 4.6; y += 4.6) spots.push([x + (rnd() - 0.5) * 1.2, y + (rnd() - 0.5) * 1.0, (rnd() - 0.5) * 1.6]);
      spots.sort(function () { return rnd() - 0.5; });
      var k = 0;
      (ions || []).forEach(function (e) { var sp = spots[k++]; ion(e, sp); });
      for (var i = 0; i < nEC; i++) { var sp1 = spots[k++]; if (sp1) mol('ec', sp1, ang3(), rnd() * 6); }
      for (i = 0; i < nDMC; i++) { var sp2 = spots[k++]; if (sp2) mol('dmc', sp2, ang3(), rnd() * 6); }
    }
    function solvatedLi(p, types, dirs) { ion('Li', p); return types.map(function (tp, i) { var n = v3n(dirs[i]); var m = S.add(m3place(tp === 'ec' ? m3EC() : m3DMC(), p, n, 2.04, i * 1.3), { hl: tp === 'ec' ? 5 : 1 }); m.n = n; m.tp = tp; return m; }); }
    function build() {
      S.clear(); while (ann.firstChild) ann.removeChild(ann.firstChild); while (low.firstChild) low.removeChild(low.firstChild);
      rnd = m7rng(q === 'neg' ? 5 : q === 'pos' ? 9 : q === 'zero' ? 13 : 21); entering = null;
      var edgeView = q === 'edge';
      if (edgeView) {
        sheetsEdge();
        filler(19, 24, 1, 1, ['PF6']);
        var sh = solvatedLi([14, 0, 0], ['ec', 'dmc', 'ec', 'dmc'], [[0.6, 0.75, 0.3], [0.7, -0.7, -0.2], [0.2, 0.2, -0.95], [-0.3, -0.3, 0.9]]);
        entering = { li: S.mols[S.mols.length - 5], sh: sh, k: 0 };
      } else {
        sheetsBasal();
        if (q === 'neg') {
          // first molecular layer: EC, carbonyl pointing away from the surface (+x)
          [[3.2, -4.4, 0.6], [3.2, 4.2, -0.8]].forEach(function (o, i) { mol('ec', [o[0] + 2.4, o[1], o[2]], [-1, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3], i); });
          // Li+ adsorbed about 5 A out, solvated by EC on the liquid side
          solvatedLi([5.0, 0, 0], ['ec', 'ec', 'ec'], [[0.9, 0.42, 0], [0.55, -0.8, 0.2], [0.6, 0.1, -0.8]]);
          filler(13, 23, 2, 2, ['Li', 'PF6']);
        } else if (q === 'pos') {
          // PF6- at the surface; EC with carbonyl pointing towards the surface (-x)
          ion('PF6', [3.6, -3.0, 0]); ion('PF6', [3.6, 3.8, 0.4]);
          [[2.6, 0.5, 0.8], [5.6, -5.2, -0.6]].forEach(function (o, i) { mol('ec', o, [1, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.4], i + 2); });
          filler(11, 23, 2, 2, ['Li', 'PF6']);
        } else {
          [[3.0, -4.6, 0.5, 'dmc'], [3.0, 1.0, -0.6, 'ec'], [3.4, 5.6, 0.2, 'dmc']].forEach(function (o, i) { mol(o[3], [o[0] + 1.5, o[1], o[2]], ang3(), i); });
          filler(11, 23, 2, 2, ['Li', 'PF6']);
        }
      }
      // distance scale and zone labels
      var yAx = 214; el('line', { x1: X0, y1: yAx, x2: X0 + 24 * PX, y2: yAx, stroke: 'var(--line-2)' }, ann);
      [0, 5, 10, 15, 20].forEach(function (d) { el('line', { x1: X0 + d * PX, y1: yAx, x2: X0 + d * PX, y2: yAx + 4, stroke: 'var(--line-2)' }, ann); txt(ann, X0 + d * PX, yAx + 16, d === 0 ? '0' : (d / 10) + ' nm', '', 'middle'); });
      txt(ann, X0 - 44, 26, edgeView ? 'graphite, end on' : 'graphite', 'strong ok', 'middle');
      if (!edgeView) {
        el('rect', { x: X0, y: 34, width: 6 * PX, height: 168, fill: 'var(--cyan)', 'fill-opacity': '.12' }, ann);
        el('rect', { x: X0 + 6 * PX, y: 34, width: 7 * PX, height: 168, fill: 'var(--amber)', 'fill-opacity': q === 'zero' ? '0' : '.06' }, ann);
        el('line', { x1: X0, x2: X0, y1: 30, y2: 206, stroke: 'var(--text)', 'stroke-opacity': '.5', 'stroke-width': 1.5 }, ann);
        el('line', { x1: X0 + 6 * PX, x2: X0 + 6 * PX, y1: 30, y2: 206, stroke: 'var(--cyan)', 'stroke-opacity': '.5', 'stroke-dasharray': '3 3' }, ann);
        el('line', { x1: X0 + 13 * PX, x2: X0 + 13 * PX, y1: 30, y2: 206, stroke: 'var(--amber)', 'stroke-opacity': '.4', 'stroke-dasharray': '3 3' }, ann);
        txt(ann, X0 + 3 * PX, 26, 'first layer', 'cyan ok', 'middle'); txt(ann, X0 + 9.5 * PX, 26, q === 'zero' ? 'liquid' : 'diffuse layer', 'amber ok', 'middle'); txt(ann, X0 + 18.5 * PX, 26, 'bulk liquid →', 'ok', 'middle');
        if (q !== 'zero') for (var k = 0; k < 6; k++) txt(ann, X0 - 72, 50 + k * 28, q === 'neg' ? '−' : '+', q === 'neg' ? 'cyan' : 'heat', 'middle', { style: 'font-size:18px;font-weight:700' });
      } else {
        el('line', { x1: X0 + 4 * PX, y1: 34, x2: X0 + 4 * PX, y2: 202, stroke: 'var(--heat)', 'stroke-dasharray': '4 4' }, ann); txt(ann, X0 + 4 * PX, 26, 'shell must go', 'heat ok', 'middle');
        el('line', { x1: X0 + 5 * PX, y1: 34, x2: X0 + 5 * PX, y2: 202, stroke: 'var(--amber)', 'stroke-dasharray': '2 4' }, ann); txt(ann, X0 + 8.5 * PX, 26, 'resting place', 'amber ok', 'start');
      }
      lower(edgeView);
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-q') === q)); });
      read.innerHTML = q === 'neg'
        ? '<b>Negative electrode.</b> The molecules touching the surface are now mostly EC, their carbonyl oxygens turned away from it. Lithium ions come up against the surface, still wearing a shell mostly of EC. Below: the potential rises steeply over the first layer and then levels off where the excess of Li⁺ dies away (in a real 1 M electrolyte within about a nanometre; the plot stretches it).'
        : q === 'pos'
        ? '<b>Positive electrode.</b> PF₆⁻ anions gather at the surface, and the EC molecules there turn their carbonyl oxygens towards it. This is where oxidation of the electrolyte would begin. Below: the potential falls across the first layer; the excess here is of anions.'
        : q === 'zero'
        ? '<b>Uncharged surface.</b> No excess of either ion and no step in the potential: EC and DMC lie against the surface in every orientation, much as in the bulk.'
        : '<b>Getting in.</b> Lithium enters graphite between the sheets, at their edges. A solvated ion rests about 0.5 nm from the edge; to come closer than about 0.4 nm it must shed its shell, DMC first and EC last. Below: the free energy along the way, as the simulation computed it.';
      S.draw(V);
    }
    function lower(edgeView) {
      var x0 = X0, x1 = 500, y0 = edgeView ? 246 : 238, y1 = 326;
      el('line', { x1: x0, y1: y1, x2: x1, y2: y1, stroke: 'var(--line-2)' }, low); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, low);
      if (edgeView) {
        // free energy against distance from the graphite hydrogens (Borodin 2014, Fig. 8.11), drawn through his three numbers
        var X = function (z) { return x0 + z / 12 * (x1 - x0); }, Y = function (G) { return y1 - 6 - (G + 1) / 21 * (y1 - y0 - 8); };
        var pts = []; for (var z = 1.8; z <= 12; z += 0.1) { var G = z < 5 ? -0.5 + 16 * Math.pow((5 - z) / 3.2, 2.2) * (z < 4 ? 1 : 0.15 + 0.85 * (5 - z)) : -0.5 * Math.exp(-Math.pow((z - 5) / 2.2, 2)); pts.push(X(z).toFixed(1) + ',' + Y(Math.min(G, 20)).toFixed(1)); }
        el('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, low);
        el('line', { x1: X(0), y1: Y(0), x2: X(12), y2: Y(0), stroke: 'var(--line-2)', 'stroke-dasharray': '2 4' }, low);
        [0, 4, 8, 12].forEach(function (z) { txt(low, X(z), y1 + 14, (z / 10) + ' nm', '', 'middle'); });
        txt(low, X(5.6), Y(-0.5) - 8, 'minimum, −0.5 kcal/mol, about 0.5 nm', 'amber', 'start');
        txt(low, X(2.0) + 8, Y(16) + 4, '12 to 19 kcal/mol', 'heat', 'start');
        txt(low, x0 - 6, y0 + 8, 'free energy', '', 'end'); txt(low, x0 - 6, y0 + 22, 'of Li⁺', '', 'end');
      } else {
        // over the first 10 nm, two panels: the potential, and the ion concentrations (Li+ amber, PF6- grey); schematic shapes
        var Xn = function (nm) { return x0 + nm / 10 * (x1 - x0); }, s = q === 'neg' ? -1 : q === 'pos' ? 1 : 0;
        var pa = { t: 242, b: 274 }, pb = { t: 286, b: 326 };
        el('line', { x1: x0, y1: pa.b + 6, x2: x1, y2: pa.b + 6, stroke: 'var(--line)' }, low);
        var phi = [], cp = [], cm = [], yb = pb.b - 16, amp = 16;
        for (var nm = 0; nm <= 10; nm += 0.05) {
          var f = nm < 0.6 ? 1 - 0.7 * nm / 0.6 : 0.3 * Math.exp(-(nm - 0.6) / 1.4);
          phi.push(Xn(nm).toFixed(1) + ',' + ((pa.t + pa.b) / 2 - 15 * s * f).toFixed(1));
          var ex = nm < 0.3 ? 0 : Math.exp(-(nm - 0.3) / 1.4);
          cp.push(Xn(nm).toFixed(1) + ',' + (yb - amp * (s < 0 ? 1.6 : s > 0 ? -0.8 : 0) * ex - (s === 0 ? 1.5 : 0)).toFixed(1));
          cm.push(Xn(nm).toFixed(1) + ',' + (yb - amp * (s > 0 ? 1.6 : s < 0 ? -0.8 : 0) * ex + (s === 0 ? 1.5 : 0)).toFixed(1));
        }
        el('line', { x1: x0, x2: x1, y1: yb, y2: yb, stroke: 'var(--muted)', 'stroke-dasharray': '2 4' }, low);
        el('polyline', { points: cm.join(' '), fill: 'none', stroke: 'var(--anion)', 'stroke-width': 2 }, low);
        el('polyline', { points: cp.join(' '), fill: 'none', stroke: 'var(--cation)', 'stroke-width': 2 }, low);
        el('polyline', { points: phi.join(' '), fill: 'none', stroke: 'var(--phi)', 'stroke-width': 2 }, low);
        el('rect', { x: Xn(0), y: pa.t - 4, width: Xn(2.4) - Xn(0), height: pb.b - pa.t + 4, fill: 'var(--cyan)', 'fill-opacity': '.05', stroke: 'var(--cyan)', 'stroke-opacity': '.6', 'stroke-dasharray': '3 3' }, low);
        txt(low, Xn(2.4) - 4, pa.t + 8, 'close-up above', 'cyan', 'end');
        [0, 2, 4, 6, 8, 10].forEach(function (nm) { txt(low, Xn(nm), y1 + 16, nm + ' nm', '', 'middle'); });
        txt(low, x0 - 6, (pa.t + pa.b) / 2 + 4, 'potential', 'phi', 'end'); txt(low, x0 - 6, (pb.t + pb.b) / 2 + 4, 'ions', '', 'end');
        if (s) {
          txt(low, Xn(2.6), pb.t + 6, s < 0 ? 'Li⁺: excess near the surface' : 'PF₆⁻: excess near the surface', s < 0 ? 'amber' : '', 'start');
          txt(low, Xn(2.6), pb.b - 3, s < 0 ? 'PF₆⁻: depleted' : 'Li⁺: depleted', s < 0 ? '' : 'amber', 'start');
          txt(low, Xn(4.2), s < 0 ? pa.t + 6 : pa.b - 1, s < 0 ? 'rises over the first layer, then levels off' : 'falls over the first layer, then levels off', 'phi', 'start');
        } else txt(low, Xn(4.2), (pa.t + pa.b) / 2 - 6, 'flat: no excess, no step', 'phi', 'start');
        txt(low, Xn(10), yb - 4, 'bulk: equal amounts', '', 'end');
      }
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      if (!V.held) V.yaw = 0.07 * Math.sin(t * 0.3);
      if (entering) {
        entering.k += dt / 7; var k = entering.k % 1.15, e = entering;
        var x = k < 0.35 ? 14 - 9 * smooth(k / 0.35) : k < 0.55 ? 5 : k < 0.95 ? 5 - 9 * smooth((k - 0.55) / 0.4) : -4;
        e.li.off = [x - 14, 0, 0];
        e.sh.forEach(function (m) {
          var go = m.tp === 'dmc' ? (k > 0.55 ? smooth((k - 0.55) / 0.15) : 0) : (k > 0.72 ? smooth((k - 0.72) / 0.15) : 0);
          m.off = [x - 14 + m.n[0] * go * 4 + go * 3, m.n[1] * go * 4, m.n[2] * go * 4]; m.fade = 1 - go * 0.85;
        });
      }
      S.draw(V);
    }
    Array.prototype.forEach.call(btns, function (b) { on(b, 'click', function () { q = b.getAttribute('data-q'); build(); }); });
    m3drag(svg, V, function () { S.draw(V); });
    badge(g, 494, 60, 1); badge(g, X0 + 6 * PX + 14, 48, 2); badge(g, X0 + 18, 196, 3);
    build();
    steps(fig, [
      { text: '<b>The bulk</b>, a few nanometres or more from the surface (right-hand part of the close-up, and most of the plot below). Every small volume holds equal positive and negative charge, molecules point every way, and at rest the potential is flat.', on: function () { if (q === 'edge') { q = 'neg'; build(); } } },
      { text: '<b>The diffuse layer.</b> Near a charged electrode, ions of the opposite sign gather and their excess fades with distance: the curves in the lower plot, stretched so they can be seen (at 1 M the real diffuse layer is under a nanometre thick). This crowd screens the electrode’s charge from the bulk (module 3).', on: function () { if (q === 'edge') { q = 'neg'; build(); } } },
      { text: '<b>The first layer</b>, within about 0.6 nm of the surface. Its make-up depends on the electrode’s charge: try Negative, Uncharged and Positive. On either charged surface EC pushes DMC out, and the oxygens turn round between the two.', on: function () { if (q === 'edge') { q = 'neg'; build(); } } },
      { text: '<b>Getting in.</b> Press <b>Getting in</b> or this step: graphite end on, a lithium ion arriving at the gap between two sheets, shedding DMC and then EC, and slipping in.', on: function () { q = 'edge'; build(); } }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });


  /* =================================================================
     Module 9: electrode materials (negative side here; positive and organic in figs-9p.js), from graphite to lithium metal, and
     beyond lithium. Built on Rahman et al. 2025 (R70): the map of anode
     classes (Fig. 1, Tables 1 and 2), the three storage mechanisms
     (Fig. 2), the SEI and ageing of graphite (sec. 3, Table 3, Figs. 4
     and 5), fast charging (sec. 5), silicon and conversion anodes (secs.
     2 and 4), lithium metal and anode-free cells (sec. 7, Table 4,
     Figs. 10 and 11) and solid-state interfaces (sec. 6, Figs. 8 and 9).
     Earlier sources kept where they still say something R70 does not:
     Winter and Brodd (R1), Tarascon and Armand (R2), Goodenough and Park
     (R6), Brandt (R46), Shanmukaraj et al. (R44). Calculations in
     Physics.m9. Plot helpers (e11axes, e11d, e11log, e11modes) are shared
     with figs-11.js.
     ================================================================= */
  var M9 = P.m9;
  var K9 = { intercalation: 'var(--amber)', alloy: '#C4B5F7', conversion: 'var(--copper)', metal: 'var(--metal)' };

  /* ===== 9.1 The map of negative electrodes, and what capacity buys ===== */
  register('f9-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var A = M9.ANODES, POS = { q: 200, v: 3.8 };
    var b = { x0: 60, y0: 262, x1: 330, y1: 40 }, X = function (q) { return e11log(q, 2, Math.log10(5000), b.x0, b.x1); }, Y = function (v) { return b.y0 - v / 2 * (b.y0 - b.y1); };
    el('rect', { x: b.x0, y: Y(0.8), width: b.x1 - b.x0, height: Y(0) - Y(0.8), fill: 'var(--cyan)', 'fill-opacity': '.05' }, g);
    e11axes(g, b, { X: X, Y: Y, xt: [[100, '100'], [300, '300'], [1000, '1000'], [3000, '3000']], yt: [[0, ''], [0.5, '0.5'], [1, '1.0'], [1.5, '1.5'], [2, '2.0']], grid: true, xlab: 'capacity, mAh/g (log)', ylab: 'V vs Li/Li⁺' });
    txt(g, b.x1 - 4, Y(0.8) - 6, 'low and right: best', 'cyan', 'end');
    var names = { graphite: 'graphite', lto: 'Li₄Ti₅O₁₂', tnb: 'TiNb₂O₇', si: 'Si', sn: 'Sn', ge: 'Ge', sb: 'Sb', tio2: 'TiO₂', fe2o3: 'Fe₂O₃', mno2: 'MnO₂', mos2: 'MoS₂', fep: 'FeP', li: 'Li metal' };
    var lab = { graphite: [8, 4, 'start'], lto: [0, -10, 'middle'], tnb: [0, -62, 'middle'], tio2: [-8, 18, 'end'], si: [-8, -16, 'end'], sn: [0, 46, 'middle'], ge: [8, 30, 'start'], sb: [-8, 0, 'end'], fe2o3: [-8, 4, 'end'], mno2: [8, -8, 'start'], mos2: [0, -45, 'middle'], fep: [8, 4, 'start'], li: [-8, -8, 'end'] };
    var dots = {};
    Object.keys(A).forEach(function (k) {
      var a = A[k], x = X(a.q), col = K9[a.kind];
      if (a.hi > a.lo) el('line', { x1: x, x2: x, y1: Y(a.lo), y2: Y(a.hi), stroke: col, 'stroke-width': 7, 'stroke-opacity': '.45', 'stroke-linecap': 'round' }, g);
      dots[k] = el('circle', { cx: x, cy: Y(a.v), r: 4.5, fill: col, stroke: 'var(--bg)', 'stroke-width': 1 }, g);
      var L = lab[k]; txt(g, x + L[0], Y(a.v) + L[1], names[k], '', L[2]);
    });
    var e = { x0: 380, y0: 262, x1: 505, y1: 40 }, YE = function (w) { return e.y0 - w / 800 * (e.y0 - e.y1); };
    e11axes(g, e, { X: function (x) { return x; }, Y: YE, yt: [[0, '0'], [200, '200'], [400, '400'], [600, '600'], [800, '800']], grid: true, ylab: 'Wh/kg of the pair' });
    var bars = [0, 1].map(function (i) { var x = e.x0 + 14 + i * 56; return { r: el('rect', { x: x, width: 40, fill: i ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': '.85' }, g), v: txt(g, x + 20, 0, '', 'strong', 'middle'), n: txt(g, x + 20, e.y0 + 16, '', '', 'middle') }; });
    var ring = el('circle', { r: 9, fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    badge(g, b.x0 + 24, b.y1 + 14, 1); badge(g, X(1600), Y(1.95), 2); badge(g, e.x1 - 8, e.y1 + 8, 3);
    var cur = e11modes(fig, function (m) { cur = m; render(); });
    function render() {
      var a = A[cur], g0 = M9.pairEnergy(POS.q, POS.v, A.graphite.q, A.graphite.v), p = M9.pairEnergy(POS.q, POS.v, a.q, a.v);
      ring.setAttribute('cx', dots[cur].getAttribute('cx')); ring.setAttribute('cy', dots[cur].getAttribute('cy'));
      [g0, p].forEach(function (q, i) { var y = YE(q.E); bars[i].r.setAttribute('y', y); bars[i].r.setAttribute('height', e.y0 - y); bars[i].v.setAttribute('y', y - 6); setSvgText(bars[i].v, Math.round(q.E) + ''); setSvgText(bars[i].n, i ? names[cur] : 'graphite'); });
      bars[1].r.setAttribute('fill', K9[a.kind]);
      read.innerHTML = '<b>' + names[cur] + '</b> (' + a.kind + '): ' + a.q + ' mAh/g at ' + (a.hi > a.lo ? a.lo + ' to ' + a.hi : a.v) + ' V. Paired with a positive electrode like NMC811, which gives about 200 mAh/g, at an illustrative average of 3.8 V, the two active materials store <b>' + Math.round(p.E) + ' Wh/kg</b>, ' + (p.E / g0.E).toFixed(2) + ' × graphite’s ' + Math.round(g0.E) + '. That is ' + (a.q / A.graphite.q).toFixed(1) + ' × the capacity of graphite, but each gram of the pair still passes only ' + Math.round(p.Q) + ' mAh, at a cell voltage of ' + p.V.toFixed(2) + ' V.';
    }
    steps(fig, [
      { text: 'Every negative electrode sits somewhere on this map: across, how much charge a gram stores; up, its potential against lithium metal. A good negative electrode is <b>low</b>, so that the cell voltage stays large, and <b>to the right</b>, so that it stores a lot.' },
      { text: 'Four families: <b>intercalation</b> hosts (graphite, titanium and niobium oxides), <b>alloys</b> (silicon, tin, germanium, antimony), <b>conversion</b> materials (oxides, sulfides, phosphides) and <b>lithium metal</b> itself. Bars show where a range of working voltage is quoted.' },
      { text: 'More capacity is not more energy one for one: the same charge passes through both electrodes, so the positive electrode sets a ceiling. Choose lithium metal, ten times graphite’s capacity: the pair gains about half again. Choose Li₄Ti₅O₁₂: 1.4 V of cell voltage is given away.' }
    ]);
    render();
  });

  /* ===== 9.2 Three ways to store lithium ===== */
  register('f9-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var gs = el('g', {}, g), gc = el('g', {}, g), eq = txt(g, 135, 250, '', 'amber', 'middle'), eq2 = txt(g, 135, 268, '', '', 'middle');
    var b = { x0: 316, y0: 230, x1: 505, y1: 40 };
    var MODES = {
      intercalation: { name: 'intercalation: graphite', qmax: 450, vmax: 1.0, irr: 0.1, react: 'Li⁺ + e⁻ + xC ⇌ LiCₓ', sub: 'the host keeps its structure', how: 'Li⁺ goes between the graphene layers',
        lith: function (u) { return 0.08 + 0.12 * Math.exp(-u * 8) + 0.6 * Math.exp(-u * 60); }, deli: function (u) { return 0.1 + 0.1 * Math.pow(u, 3) + 0.7 * Math.pow(u, 30); } },
      alloy: { name: 'alloying: silicon', qmax: 2600, vmax: 0.7, irr: 0.25, react: 'xLi⁺ + xe⁻ + Si ⇌ LiₓSi', sub: 'the particle swells and can break', how: 'lithium and silicon form an alloy, LiₓSi',
        lith: function (u) { return 0.08 + 0.12 * Math.exp(-u * 5) + 0.4 * Math.exp(-u * 40); }, deli: function (u) { return 0.25 + 0.25 * u + 0.12 * Math.pow(u, 8); } },
      conversion: { name: 'conversion: Fe₂O₃', qmax: 2100, vmax: 3.5, irr: 0.25, react: 'MₓO_y + 2yLi⁺ + 2ye⁻ ⇌ yLi₂O + xM', sub: 'the particle is rebuilt each cycle', how: 'the oxide becomes metal grains in Li₂O, and back',
        lith: function (u) { return 0.85 + 1.4 * Math.exp(-u * 10) - 0.75 * Math.pow(u, 4); }, deli: function (u) { return 1.0 + 1.6 * u + 0.4 * Math.pow(u, 6); } }
    };
    var mode = e11modes(fig, function (m) { mode = m; build(); });
    var ph = 0.15, dot = null, X = null, Yv = null;
    function geom() { var M = MODES[mode], qr = M.qmax / (1 + M.irr) * 0.92; return { M: M, qr: qr, qi: qr * M.irr }; }
    function build() {
      var G = geom(), M = G.M; clear(gs); clear(gc);
      txt(gs, 135, 22, M.name, 'strong', 'middle'); txt(gs, 135, 38, M.sub, '', 'middle');
      X = function (q) { return b.x0 + q / M.qmax * (b.x1 - b.x0); }; Yv = function (v) { return b.y0 - v / M.vmax * (b.y0 - b.y1); };
      e11axes(gc, b, { X: X, Y: Yv, xt: [[0, '0'], [M.qmax / 2, Math.round(M.qmax / 2) + ''], [M.qmax, M.qmax + '']], yt: [[0, '0'], [M.vmax / 2, (M.vmax / 2).toFixed(2)], [M.vmax, M.vmax.toFixed(1)]], grid: true, xlab: 'capacity, mAh/g', ylab: 'V vs Li/Li⁺' });
      el('rect', { x: X(0), y: b.y1, width: X(G.qi) - X(0), height: b.y0 - b.y1, fill: 'var(--heat)', 'fill-opacity': '.1' }, gc);
      txt(gc, X(G.qi) + 4, b.y1 + 14, 'lost on the first charge', 'heat', 'start');
      var p1 = [], p3 = [], k, u;
      for (k = 0; k <= 60; k++) { u = k / 60; p1.push([X(u * (G.qr + G.qi)), Yv(M.lith(u))]); p3.push([X(G.qi + G.qr * u), Yv(Math.min(M.vmax, M.deli(u)))]); }
      el('path', { d: e11d(p1), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, gc);
      el('path', { d: e11d(p3), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.4 }, gc);
      txt(gc, X(G.qi + G.qr * 0.55), Yv(M.lith(0.55)) + 16, 'lithium in', 'amber', 'middle');
      txt(gc, X(G.qi + G.qr * 0.4), Yv(Math.min(M.vmax, M.deli(0.4))) - 8, 'lithium out', 'cyan', 'middle');
      dot = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, gc);
      badge(gc, 24, 24, 1); badge(gc, b.x1 - 10, b.y1 + 10, 2);
      setSvgText(eq, M.react); setSvgText(eq2, M.how);
      place();
    }
    function scene(s) { // s: 0 empty .. 1 fully lithiated
      var old = gs.querySelector('.scn'); if (old) gs.removeChild(old);
      var sc = el('g', { 'class': 'scn' }, gs), cx = 135, cy = 140;
      if (mode === 'intercalation') {
        for (var j = 0; j < 6; j++) { var y = 82 + j * 22; el('line', { x1: 60, x2: 210, y1: y, y2: y, stroke: 'var(--text)', 'stroke-opacity': '.55', 'stroke-width': 3 }, sc); }
        var n = Math.round(s * 20); for (var i = 0; i < n; i++) { var jj = i % 5, ii = Math.floor(i / 5); el('circle', { cx: 78 + ii * 34 + (jj % 2) * 12, cy: 93 + jj * 22, r: 4.5, 'class': 'ion' }, sc); }
        txt(sc, 135, 222, 'the layers stay; volume up about 10 %', '', 'middle');
      } else if (mode === 'alloy') {
        var r = 34 * Math.pow(1 + 2.8 * s, 1 / 3); el('circle', { cx: cx, cy: cy, r: 34, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' }, sc);
        el('circle', { cx: cx, cy: cy, r: r, fill: '#C4B5F7', 'fill-opacity': '.55', stroke: '#C4B5F7' }, sc);
        if (s > 0.85) el('path', { d: 'M' + (cx - r * 0.7) + ',' + (cy - r * 0.2) + ' L' + cx + ',' + (cy + 4) + ' L' + (cx + r * 0.6) + ',' + (cy - r * 0.5) + ' M' + cx + ',' + (cy + 4) + ' L' + (cx + 6) + ',' + (cy + r * 0.85), fill: 'none', stroke: 'var(--bg)', 'stroke-width': 2.4 }, sc);
        txt(sc, 135, 222, 'volume × ' + (1 + 2.8 * s).toFixed(1) + ' (dashed: before)', '', 'middle');
      } else {
        el('circle', { cx: cx, cy: cy, r: 50, fill: 'var(--copper)', 'fill-opacity': String(0.8 * (1 - s)) }, sc);
        el('circle', { cx: cx, cy: cy, r: 50, fill: 'var(--panel-2)', 'fill-opacity': String(s), stroke: 'var(--line-2)' }, sc);
        for (var q = 0; q < 22; q++) { var a = q * 2.4, rr = 50 * Math.sqrt((q + 0.5) / 22) * 0.88; el('circle', { cx: cx + Math.cos(a) * rr, cy: cy + Math.sin(a) * rr, r: 4.5, fill: 'var(--metal)', 'fill-opacity': String(s) }, sc); }
        txt(sc, 135, 222, s > 0.5 ? 'Fe grains in Li₂O' : 'Fe₂O₃ particle', '', 'middle');
      }
    }
    function place() {
      var G = geom(), M = G.M, u, x, y, s;
      if (ph < 0.5) { u = ph * 2; x = X(u * (G.qr + G.qi)); y = Yv(M.lith(u)); s = u; } else { u = (ph - 0.5) * 2; x = X(G.qi + G.qr * (1 - u)); y = Yv(Math.min(M.vmax, M.deli(1 - u))); s = 1 - u; }
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); scene(s);
      var notes = { intercalation: 'Graphite keeps its layers; lithium slips in between them. About 10 % of the first charge goes into the SEI, and the voltage hysteresis is only 10 to 50 mV.', alloy: 'Silicon stores close to ten times as much as graphite, but the particle swells by close to 300 % and can break; 20 to 40 % of the first charge can be lost.', conversion: 'The oxide is taken apart into metal grains in Li₂O and rebuilt on the way back. High capacity, but a large first-cycle loss and almost a volt between lithium in and lithium out.' };
      read.innerHTML = (ph < 0.5 ? '<b>Lithium in</b>' : '<b>Lithium out</b>') + ' (' + Math.round(s * 100) + ' % lithiated). ' + notes[mode];
    }
    steps(fig, [
      { text: 'Three ways a negative electrode can take up lithium. Choose one with the buttons and press Play. Left, what happens to the material; below it, the reaction.' },
      { text: 'Right, the voltage on the first charge (amber, lithium in) and on the way back (cyan). The shaded part of the first charge never comes back: it builds the SEI. The gap between the two curves is the <b>hysteresis</b>, energy lost on every cycle.' }
    ]);
    build();
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph = (ph + dt / 8) % 1; place(); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) { ph = 0.45; place(); }
    bind(fig, loop);
  });

  /* ===== 9.3 Graphite's skin: the SEI, and how a graphite anode ages ===== */
  register('f9-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.temp'), sv = fig.querySelector('.temp-val');
    var gx0 = 30, gx1 = 170, top = 50, bot = 240;
    for (var j = 0; j < 8; j++) el('line', { x1: gx0, x2: gx1, y1: top + 12 + j * 24, y2: top + 12 + j * 24, stroke: 'var(--text)', 'stroke-opacity': '.5', 'stroke-width': 3 }, g);
    txt(g, (gx0 + gx1) / 2, top - 10, 'graphite', 'strong', 'middle'); txt(g, 420, top - 10, 'electrolyte', 'strong', 'middle');
    var sei = el('g', {}, g), extra = el('g', {}, g), ann = el('g', {}, g);
    badge(g, gx0 + 14, bot + 18, 1); badge(g, 300, bot + 18, 2); badge(g, 470, bot + 18, 3);
    var stage = 0;
    function render() {
      var T = +sl.value, Ts = (T < 0 ? '−' : '') + Math.abs(T) + ' °C'; setSvgText(sv, Ts);
      var hot = T > 45, cold = T < 5, w = hot ? 64 : 34;
      clear(sei); clear(extra); clear(ann);
      var xi = gx1, xo = gx1 + w * 0.45, xe = gx1 + w;
      for (var k = 0; k < 9; k++) { var y = top + k * 21; el('rect', { x: xi, y: y, width: xo - xi, height: 20, fill: ['#9fb7c3', '#b8c9b3', '#c7b9d8'][k % 3], 'fill-opacity': '.75', stroke: 'var(--bg)' }, sei); el('rect', { x: xo, y: y + (k % 2) * 6, width: xe - xo - (hot ? 0 : (k % 3) * 4), height: 20, fill: '#d9c48f', 'fill-opacity': hot ? '.8' : '.45', stroke: 'var(--bg)' }, sei); }
      if (!hot) for (var p = 0; p < 6; p++) el('circle', { cx: xo + 6 + (p % 2) * 8, cy: top + 20 + p * 30, r: 3, fill: 'var(--bg)' }, sei);
      txt(ann, xe + 10, top + 16, 'inner: Li₂CO₃, Li₂O, LiF', '', 'start'); txt(ann, xe + 10, top + 34, 'outer: semi-carbonates, polyolefins', '', 'start');
      txt(ann, xe + 10, top + 58, hot ? 'hot: thick and dense' : cold ? 'cold: lithium plates' : 'about 25 °C: even and porous', hot || cold ? 'heat' : 'cyan', 'start');
      if (cold) { var d = 'M' + xe + ',' + (top + 90); for (var q = 0; q <= 10; q++) d += ' L' + (xe + 8 + (q % 2 ? 18 : 4)) + ',' + (top + 90 + q * 9); d += ' L' + xe + ',' + (top + 180) + ' Z'; el('path', { d: d, fill: 'var(--metal)' }, extra); txt(ann, xe + 34, top + 176, 'plated lithium', 'heat', 'start'); }
      if (stage === 1) { el('path', { d: 'M' + (gx1 - 30) + ',' + (top + 60) + ' l12,-10 l14,0', fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2.4 }, extra); txt(ann, gx1 - 34, top + 84, 'solvent pushed in', 'heat', 'end'); txt(ann, gx1 - 34, top + 100, 'layers split', 'heat', 'end'); }
      if (stage === 2) { for (var m = 0; m < 4; m++) el('circle', { cx: xe + 70 + m * 30, cy: top + 84 + (m % 2) * 18, r: 5, fill: 'var(--copper)' }, extra); arrow(extra, xe + 66, top + 90, xe + 6, top + 90, '#c9773b', 1.6); txt(ann, xe + 70, top + 132, 'metal ions from the positive side', '', 'start'); }
      var dom = hot ? 'SEI growth: lithium and electrolyte are consumed and the resistance rises' : cold ? 'lithium plating: lithium is deposited as metal instead of going into the graphite' : 'a stable SEI: decomposition has slowed down';
      read.innerHTML = 'At <b>' + Ts + '</b> the main ageing route drawn here is ' + dom + '.';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'Graphite works below the potential at which the electrolyte is stable, so on the first charge the electrolyte is reduced on its surface and leaves a film, the <b>SEI</b>. In the mosaic model the film is a patchwork: inorganic Li₂CO₃, Li₂O and LiF next to the graphite, organic semi-carbonates and polyolefins further out. Once formed, it slows further decomposition.', on: function () { stage = 0; render(); } },
      { text: 'Some electrolytes, such as ethers, let solvent molecules and solvated ions through the SEI and in between the graphene layers. The graphite <b>exfoliates</b>: its layers split, and the fresh surface keeps eating electrolyte.', on: function () { stage = 1; render(); } },
      { text: 'Metal ions dissolved from the positive electrode cross the cell and deposit in the SEI, where they speed up decomposition: <b>cross-talk</b>. Now move the temperature: above about 45 °C the SEI grows thick and dense; in the cold, lithium cannot get into the graphite fast enough and <b>plates</b> on it.', on: function () { stage = 2; render(); } }
    ]);
    render();
  });

  /* ===== 9.4 Fast charging: how close to 0 V? ===== */
  register('f9-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sc = fig.querySelector('.crate'), scv = fig.querySelector('.crate-val'), st = fig.querySelector('.ftemp'), stv = fig.querySelector('.ftemp-val');
    var b = { x0: 60, y0: 236, x1: 350, y1: 40 }, X = function (x) { return b.x0 + x * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - (v + 0.2) / 0.5 * (b.y0 - b.y1); };
    el('rect', { x: b.x0, y: Y(0), width: b.x1 - b.x0, height: b.y0 - Y(0), fill: 'var(--heat)', 'fill-opacity': '.1' }, g);
    e11axes(g, b, { X: X, Y: Y, xt: [[0, '0'], [0.5, '50'], [1, '100 %']], yt: [[-0.2, '−0.2'], [0, '0'], [0.1, '0.1'], [0.2, '0.2'], [0.3, '0.3']], grid: true, xlab: 'state of charge of the graphite', ylab: 'graphite surface, V vs Li/Li⁺' });
    el('line', { x1: b.x0, x2: b.x1, y1: Y(0), y2: Y(0), stroke: 'var(--heat)', 'stroke-width': 1.4 }, g);
    txt(g, b.x1 - 4, Y(0) + 16, 'below 0 V: lithium plates', 'heat', 'end');
    var u = []; for (var k = 0; k <= 100; k++) u.push([X(k / 100), Math.max(b.y1, Y(M9.graphiteU(k / 100)))]);
    el('path', { d: e11d(u), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g);
    txt(g, X(0.5), Y(M9.graphiteU(0.5)) - 8, 'at rest', '', 'middle');
    var pc = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.6 }, g), mk = el('circle', { r: 5, fill: 'var(--heat)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var m = { x0: 400, y0: 236, x1: 505, y1: 40 }, YM = function (v) { return m.y0 - v / 1.8 * (m.y0 - m.y1); };
    e11axes(g, m, { X: function (x) { return x; }, Y: YM, yt: [[0, '0'], [0.5, '0.5'], [1, '1.0'], [1.5, '1.5']], grid: true, ylab: 'margin to 0 V, V' });
    var MB = [{ n: 'graphite', v: M9.graphiteU(0.98), col: 'var(--amber)' }, { n: 'Nb oxide', v: 1.0, col: '#C4B5F7' }, { n: 'LTO', v: 1.55, col: 'var(--cyan)' }];
    MB.forEach(function (q, i) { var x = m.x0 + 8 + i * 32, y = YM(q.v); el('rect', { x: x, y: y, width: 24, height: m.y0 - y, fill: q.col, 'fill-opacity': '.85' }, g); txt(g, x + 12, m.y0 + (i % 2 ? 30 : 16), q.n, '', 'middle'); });
    var cutl = el('line', { x1: m.x0, x2: m.x1, stroke: 'var(--heat)', 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }, g);
    badge(g, b.x0 + 24, b.y1 + 14, 1); badge(g, X(0.85), Y(-0.15), 2); badge(g, m.x1 - 8, m.y1 + 8, 3);
    function render() {
      var c = +sc.value, T = +st.value, eta = M9.polarization(c, T + 273.15), onset = M9.platingOnset(c, T + 273.15);
      var Ts = (T < 0 ? '−' : '') + Math.abs(T) + ' °C'; setSvgText(scv, (c % 1 ? c.toFixed(1) : c.toFixed(0)) + 'C'); setSvgText(stv, Ts);
      var p = []; for (var k = 0; k <= 100; k++) p.push([X(k / 100), Math.max(b.y1, Math.min(b.y0, Y(M9.graphiteU(k / 100) - eta)))]); pc.setAttribute('d', e11d(p));
      mk.style.display = onset < 1 ? '' : 'none'; mk.setAttribute('cx', X(onset)); mk.setAttribute('cy', Y(0));
      var yc = YM(Math.min(1.75, eta)); cutl.setAttribute('y1', yc); cutl.setAttribute('y2', yc);
      read.innerHTML = 'Charging at <b>' + scv.textContent + '</b> and <b>' + Ts + '</b> pulls the graphite surface about <b>' + Math.round(eta * 1000) + ' mV</b> below its resting potential (illustrative model). ' + (onset < 0.03 ? 'It is below 0 V almost from the start: lithium plates instead of going in.' : onset < 1 ? 'It reaches 0 V at about <b>' + Math.round(onset * 100) + ' %</b> state of charge: from there on, lithium plates instead of going in.' : 'It never reaches 0 V: no plating.') + ' The dashed red line on the right is the same pull; titanate and niobium oxides start a volt or more above it.';
    }
    on(sc, 'input', render); on(st, 'input', render);
    steps(fig, [
      { text: 'Graphite takes up lithium only a little above the potential of lithium metal (dashed, an illustrative curve). Charging pulls its surface lower, the more so the higher the current: the lithium arrives faster than it can get into the graphite.' },
      { text: 'Once the surface reaches <b>0 V</b>, lithium plates on it as metal. Slide the current up, or the temperature down: in the cold the same current pulls further, because every step slows. Plated lithium costs capacity and can grow into a short circuit.' },
      { text: 'Titanate (Li₄Ti₅O₁₂, about 1.55 V) and niobium oxides (about 1 to 2 V) leave a margin of a volt or more, so they do not plate and avoid most SEI formation. They pay with a smaller cell voltage and less capacity, which is why they serve power, not range.' }
    ]);
    render();
  });

  /* ===== 9.5 Silicon breathes ===== */
  register('f9-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), bb = fig.querySelector('.buffer'), sw = fig.querySelector('.siw'), swv = fig.querySelector('.siw-val');
    var mats = [{ x: 80, name: 'Li₄Ti₅O₁₂', dv: 0.002, note: 'about 0.2 %' }, { x: 220, name: 'graphite', dv: 0.10, note: 'about 10 %' }, { x: 400, name: 'silicon', dv: 2.8, note: 'about 280 %', si: true }];
    var r0 = 26, cy = 116, buffer = false, ph = 0, cyc = 0;
    mats.forEach(function (m, i) {
      txt(g, m.x, 24, m.name, 'strong', 'middle'); txt(g, m.x, 214, m.note + ' in volume', 'amber', 'middle');
      el('circle', { cx: m.x, cy: cy, r: r0, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' }, g);
      m.sei = el('circle', { cx: m.x, cy: cy, r: r0 + 3, fill: 'none', stroke: '#d9c48f', 'stroke-width': 3 }, g);
      m.p = el('circle', { cx: m.x, cy: cy, r: r0, fill: m.si ? '#C4B5F7' : 'var(--amber-2)', 'fill-opacity': '.85' }, g);
      m.cr = el('path', { fill: 'none', stroke: 'var(--bg)', 'stroke-width': 2.4 }, g);
      badge(g, m.x + 50, 34, i + 1);
    });
    var shell = el('circle', { cx: 400, cy: cy, r: r0 * 1.56 + 10, fill: 'var(--cyan)', 'fill-opacity': '0', stroke: 'var(--cyan)', 'stroke-width': 3, 'stroke-opacity': '0' }, g);
    txt(g, 260, 236, 'dashed: the particle before lithium goes in; gold rim: its SEI', '', 'middle');
    var blend = el('g', {}, g);
    function render() {
      var s = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI), w = +sw.value / 100; setSvgText(swv, Math.round(w * 100) + ' wt%');
      mats.forEach(function (m) {
        var r = r0 * Math.pow(1 + m.dv * s, 1 / 3); m.p.setAttribute('r', r);
        var broken = m.si && !buffer && s > 0.6, thick = m.si && !buffer ? Math.min(12, 3 + cyc * 2) : 3;
        m.sei.setAttribute('r', r + thick / 2 + 1); m.sei.setAttribute('stroke-width', thick); m.sei.setAttribute('stroke-dasharray', broken ? '6 5' : '');
        m.cr.setAttribute('d', m.si && !buffer && cyc >= 1 ? 'M' + (m.x - r * 0.7) + ',' + (cy - r * 0.3) + ' L' + (m.x - 4) + ',' + (cy + 2) + ' L' + (m.x + r * 0.6) + ',' + (cy - r * 0.5) + ' M' + (m.x - 3) + ',' + (cy + 2) + ' L' + (m.x + 2) + ',' + (cy + r * 0.85) : '');
      });
      shell.setAttribute('stroke-opacity', buffer ? '.8' : '0'); shell.setAttribute('fill-opacity', buffer ? '.08' : '0');
      setSvgText(bb, buffer ? 'Take the room away' : 'Give it room to swell');
      clear(blend); var q = M9.blendCapacity(w), x0 = 40, xw = 440, scale = xw / 1500;
      el('rect', { x: x0, y: 252, width: xw, height: 12, rx: 3, fill: 'var(--panel-2)' }, blend);
      el('rect', { x: x0, y: 252, width: Math.min(xw, q * scale), height: 12, rx: 3, fill: 'var(--amber)', 'fill-opacity': '.8' }, blend);
      el('line', { x1: x0 + 372 * scale, x2: x0 + 372 * scale, y1: 248, y2: 268, stroke: 'var(--text)' }, blend);
      txt(blend, x0 + 372 * scale, 282, 'graphite: 372', '', 'middle'); txt(blend, x0 + xw, 282, Math.round(q) + ' mAh/g with ' + Math.round(w * 100) + ' wt% Si', 'strong', 'end');
      read.innerHTML = 'Lithiated ' + Math.round(s * 100) + ' %, cycle ' + cyc + '. ' + (buffer ? 'Given room to swell (small, porous or hollow particles in a carbon framework), the silicon keeps its contact and its SEI stays thin.' : cyc >= 1 ? 'Each swelling <b>cracks the SEI</b> on the silicon; fresh surface is exposed and new SEI forms, thicker every cycle, using up lithium and electrolyte. The particle itself has started to crack.' : 'Silicon swells to nearly four times its volume.') + ' A blend of ' + Math.round(w * 100) + ' wt% silicon in graphite stores ' + Math.round(q) + ' mAh/g (a simple mixture of the two).';
    }
    function tick(dt) { if (dt === 0) return; var was = ph; ph = (ph + dt / 4) % 1; if (ph < was) cyc++; render(); }
    on(bb, 'click', function () { buffer = !buffer; cyc = 0; render(); }); on(sw, 'input', render);
    steps(fig, [
      { text: '<b>Li₄Ti₅O₁₂</b> barely changes size (about 0.2 %: “zero strain”), and <b>graphite</b> by about 10 %. Both keep their particles whole.' },
      { text: '<b>Silicon</b> stores close to ten times as much as graphite but swells by about 280 % in volume. Its SEI cracks on every swelling and grows again on the new surface; the particle cracks and loses contact, and the electrode can come away from its current collector.' },
      { text: 'The fixes: smaller particles, porous, hollow or yolk–shell shapes, carbon frameworks, binders that keep the contact, and blending. Cells on sale today use graphite with <b>5 to 10 wt%</b> silicon; more than 20 % is the next step, traded against cycle life. Slide the silicon fraction.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    if (!motion) { cyc = 2; ph = 0.5; }
    render(); bind(fig, loop);
  });

  /* ===== 9.6 Conversion: high capacity, a volt of hysteresis ===== */
  register('f9-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.hyst'), sv = fig.querySelector('.hyst-val');
    var cx = 100, cy = 120, R = 62, ph = 0.25;
    var big = el('circle', { cx: cx, cy: cy, r: R, fill: 'var(--copper)', 'fill-opacity': '.8' }, g);
    var mat = el('circle', { cx: cx, cy: cy, r: R, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    var nps = []; for (var i = 0; i < 24; i++) { var a = i * 2.4, rr = R * Math.sqrt((i + 0.5) / 24) * 0.88; nps.push(el('circle', { cx: cx + Math.cos(a) * rr, cy: cy + Math.sin(a) * rr, r: 4.5, fill: 'var(--metal)' }, g)); }
    var lbl = txt(g, cx, cy + R + 22, '', 'strong', 'middle');
    var b = { x0: 250, y0: 226, x1: 505, y1: 40 }, X = function (u) { return b.x0 + u * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - v / 3 * (b.y0 - b.y1); };
    e11axes(g, b, { X: X, Y: Y, xt: [[0, '0'], [0.5, '50'], [1, '100 %']], yt: [[0, '0'], [1, '1'], [2, '2'], [3, '3']], grid: true, xlab: 'lithium content', ylab: 'V vs Li/Li⁺' });
    var fill = el('path', { fill: 'var(--heat)', 'fill-opacity': '.12' }, g), lin = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), lout = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.4 }, g);
    el('path', { d: e11d([[X(0.05), Y(0.15)], [X(0.95), Y(0.15)]]), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }, g);
    txt(g, X(0.98), Y(0.15) - 6, 'graphite, for scale', '', 'end');
    var dot = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    badge(g, cx - R + 4, cy - R + 6, 1); badge(g, b.x0 + 24, b.y1 + 14, 2); badge(g, b.x1 - 12, b.y1 + 14, 3);
    var Va = 1.25, h = 1.0;
    function vin(u) { return Va - h / 2 + 0.5 * Math.exp(-u * 12) - 0.25 * (u - 0.5); }
    function vout(u) { return Va + h / 2 - 0.25 * (u - 0.5) + 0.15 * Math.pow(1 - u, 3); }
    function render() {
      h = +sl.value; setSvgText(sv, h.toFixed(2) + ' V');
      var pi = [], po = []; for (var k = 0; k <= 60; k++) { var u = k / 60; pi.push([X(u), Y(vin(u))]); po.push([X(u), Y(vout(u))]); }
      lin.setAttribute('d', e11d(pi)); lout.setAttribute('d', e11d(po)); fill.setAttribute('d', e11d(pi) + ' L' + po.slice().reverse().map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L') + ' Z');
      place();
    }
    function place() {
      var s = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI), going = ph < 0.5;
      big.setAttribute('fill-opacity', String(0.8 * (1 - s))); mat.setAttribute('fill-opacity', String(s)); nps.forEach(function (n) { n.setAttribute('fill-opacity', String(s)); });
      setSvgText(lbl, s > 0.5 ? 'metal grains in Li₂O' : 'metal oxide particle');
      dot.setAttribute('cx', X(s)); dot.setAttribute('cy', Y(going ? vin(s) : vout(s)));
      var eff = M9.hysteresisEfficiency(3.8, Va, h), effG = M9.hysteresisEfficiency(3.8, 0.15, 0.03);
      read.innerHTML = (going ? '<b>Lithium in</b>: the oxide is converted into metal grains in Li₂O. ' : '<b>Lithium out</b>: metal and Li₂O react back to the oxide. ') + 'With ' + h.toFixed(2) + ' V of hysteresis, a cell with a 3.8 V positive electrode gives back about <b>' + Math.round(eff * 100) + ' %</b> of the energy put in, against ' + Math.round(effG * 100) + ' % with graphite (this page’s estimate, electrodes only).';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'A <b>conversion</b> material is not a host. Lithium takes the oxide apart, MₓO_y + 2y Li⁺ + 2y e⁻ ⇌ y Li₂O + x M, into metal grains a few nanometres across embedded in Li₂O. On the way back the oxide forms again. Fe₂O₃ stores about 1000 mAh/g, MnO₂ about 1230.' },
      { text: 'Lithium goes in at a lower voltage than it comes out (amber against cyan): almost <b>1 V of hysteresis</b>. Several solid phases form and dissolve, and oxygen and metal atoms have to move, not just lithium.' },
      { text: 'The shaded area is energy turned into heat on every cycle; slide the hysteresis. Add the first-cycle loss, the swelling and the insulating Li₂O, and conversion negative electrodes stay in the laboratory, despite their capacity.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph = (ph + dt / 8) % 1; place(); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) { ph = 0.3; place(); }
    bind(fig, loop);
  });

  /* ===== 9.7 Lithium metal: dendrites and dead lithium ===== */
  register('f9-7', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.cd'), sv = fig.querySelector('.cd-val'), sepB = fig.querySelector('.solid-sep');
    var x0 = 70, top = 40, bot = 240, sepX = 320, NP = 46, rough = [], dead = [];
    el('rect', { x: 20, y: top, width: x0 - 20, height: bot - top, fill: 'var(--metal)' }, g);
    txt(g, 45, top - 10, 'lithium', 'strong', 'middle'); txt(g, (x0 + sepX) / 2, top - 10, 'electrolyte', 'strong', 'middle');
    var sep = el('rect', { x: sepX, y: top, width: 14, height: bot - top, fill: 'var(--cyan)', 'fill-opacity': '.3' }, g);
    var gb = el('g', {}, g), sepT = txt(g, sepX + 7, bot + 16, 'separator', 'cyan', 'middle');
    el('rect', { x: sepX + 14, y: top, width: 160, height: bot - top, fill: 'var(--panel-2)', 'fill-opacity': '.6' }, g); txt(g, sepX + 94, top - 10, 'positive electrode', 'strong', 'middle');
    var dep = el('path', { fill: 'var(--metal)', 'fill-opacity': '.9' }, g), deadG = el('g', {}, g), seiP = el('path', { fill: 'none', stroke: '#d9c48f', 'stroke-width': 2 }, g);
    var cT = txt(g, x0 + 4, bot + 34, '', 'amber', 'start'), stopT = txt(g, sepX - 10, top + 16, '', 'heat', 'end');
    badge(g, x0 + 14, top + 14, 1); badge(g, x0 + 14, bot - 14, 2); badge(g, sepX - 12, bot - 14, 3);
    for (var j = 0; j <= NP; j++) rough.push(2);
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var cyc = 0, ph = 0, solid = false, cd = 1;
    function lim(j) { var free = sepX - x0 - 2; if (!solid) return free; return (j % 15 === 7) ? free + 8 : free; } // grain boundaries of a ceramic let filaments through
    function render() {
      cd = +sl.value; setSvgText(sv, cd.toFixed(1) + ' mA/cm²');
      var level = ph < 0.5 ? ph * 2 : 2 - ph * 2, d = 'M' + x0 + ',' + top, s = '';
      for (var j = 0; j <= NP; j++) { var y = top + (bot - top) * j / NP, w = Math.min(lim(j), (4 + rough[j]) * Math.max(0.25, level)); d += ' L' + (x0 + w).toFixed(1) + ',' + y.toFixed(1); s += (j ? ' L' : 'M') + (x0 + w + 2).toFixed(1) + ',' + y.toFixed(1); }
      dep.setAttribute('d', d + ' L' + x0 + ',' + bot + ' Z'); seiP.setAttribute('d', s);
      clear(deadG); dead.forEach(function (q) { el('circle', { cx: q.x, cy: q.y, r: q.r, fill: 'var(--metal)', 'fill-opacity': '.45', stroke: 'var(--line-2)' }, deadG); });
      clear(gb); if (solid) for (var k = 7; k <= NP; k += 15) { var yy = top + (bot - top) * k / NP; el('line', { x1: sepX, x2: sepX + 14, y1: yy, y2: yy + 4, stroke: 'var(--bg)', 'stroke-width': 2 }, gb); }
      sep.setAttribute('fill', solid ? 'var(--text)' : 'var(--cyan)'); sep.setAttribute('fill-opacity', solid ? '.35' : '.3'); setSvgText(sepT, solid ? 'ceramic' : 'separator');
      var maxR = 0, through = false; rough.forEach(function (r, j) { maxR = Math.max(maxR, r + 4); if (4 + r > sepX - x0 - 1 && lim(j) > sepX - x0) through = true; });
      var touch = !solid ? maxR > sepX - x0 - 2 : through;
      setSvgText(cT, 'cycles: ' + cyc + '; dead lithium pieces: ' + dead.length);
      setSvgText(stopT, touch ? (solid ? 'through a grain boundary' : 'short-circuit risk') : '');
      setSvgText(sepB, solid ? 'Porous separator' : 'Ceramic separator');
      read.innerHTML = 'At <b>' + cd.toFixed(1) + ' mA/cm²</b>' + (cd > 2 ? ', high for this picture: lithium is plated faster than the ions arrive, and the deposit grows as whiskers from its tips.' : ', the deposit grows rougher every cycle.') + ' Pieces that break off when lithium is stripped are cut off from the metal: <b>dead lithium</b>, ' + dead.length + ' pieces so far.' + (solid ? ' A ceramic separator stops most of the deposit, but filaments can still find a way along its grain boundaries.' : '');
    }
    function tick(dt) {
      if (dt === 0) return;
      var was = ph; ph = (ph + dt / 3) % 1;
      if (ph < was) {
        cyc++;
        var pTip = 0.06 + 0.05 * cd;
        for (var j = 0; j <= NP; j++) { var nb = Math.max(j > 0 ? rough[j - 1] : 0, j < NP ? rough[j + 1] : 0); var tip = rough[j] >= nb; rough[j] += (tip && rnd() < pTip ? 4 + rnd() * 6 * cd : rnd() * 1.2); rough[j] = Math.min(sepX - x0 + 10, rough[j]); }
        for (var q = 0; q < Math.round(1 + cd); q++) { var jj = Math.floor(rnd() * NP); if (rough[jj] > 10) { dead.push({ x: x0 + 6 + rnd() * Math.min(rough[jj], 60), y: top + (bot - top) * jj / NP, r: 2 + rnd() * 2.5 }); rough[jj] *= 0.85; } }
        if (dead.length > 60) dead.splice(0, dead.length - 60);
      }
      render();
    }
    on(sl, 'input', render); on(sepB, 'click', function () { solid = !solid; render(); });
    steps(fig, [
      { text: 'A lithium-metal electrode stores 3860 mAh/g at 0 V, the best place on the map of figure 9.1. But on charge the lithium is not put anywhere: it is <b>plated</b> back onto the metal, and it does not land evenly. Tips and defects see a stronger field and grow faster; where plating outruns the supply of ions, the deposit turns into whiskers.' },
      { text: 'When lithium is stripped again, pieces break off and lose contact: <b>dead lithium</b>. With the SEI that forms on every fresh surface, this lowers the Coulombic efficiency; in one study the dead layer grew from about 2 µm to about 100 µm within a few dozen cycles. Slide the current density.' },
      { text: 'Whiskers that reach through the separator short the cell, with a risk of fire. A hard <b>ceramic</b> separator was expected to stop them, since lithium is soft (Young’s modulus about 4.9 GPa); yet lithium still gets through, along the ceramic’s grain boundaries. Press the button.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    for (var c = 0; c < (motion ? 4 : 8); c++) { tick(1.5); tick(1.5); } ph = 0.5;
    render(); bind(fig, loop);
  });

  /* ===== 9.8 How many cycles? Coulombic efficiency and excess lithium ===== */
  register('f9-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.ce'), sv = fig.querySelector('.ce-val');
    var N = 500, b = { x0: 60, y0: 236, x1: 500, y1: 40 }, X = function (n) { return b.x0 + n / N * (b.x1 - b.x0); }, Y = function (c) { return b.y0 - c * (b.y0 - b.y1); };
    e11axes(g, b, { X: X, Y: Y, xt: [[0, '0'], [100, '100'], [200, '200'], [300, '300'], [400, '400'], [500, '500']], yt: [[0, '0'], [0.5, '50'], [0.8, '80'], [1, '100']], grid: true, xlab: 'cycles', ylab: 'capacity, % of the first cycle' });
    el('line', { x1: b.x0, x2: b.x1, y1: Y(0.8), y2: Y(0.8), stroke: 'var(--heat)', 'stroke-dasharray': '4 3' }, g); txt(g, b.x1 - 4, Y(0.8) - 6, '80 %: end of life', 'heat', 'end');
    var CASES = [{ ex: 0, n: 'anode-free', col: 'var(--heat)' }, { ex: 1, n: '1× excess', col: 'var(--amber)' }, { ex: 3, n: '3× excess', col: 'var(--cyan)' }];
    var paths = CASES.map(function (c) { var t = txt(g, 0, 0, c.n, 'strong', 'start'); t.style.fill = c.col; return { c: c, p: el('path', { fill: 'none', stroke: c.col, 'stroke-width': 2.4 }, g), t: t }; });
    badge(g, b.x0 + 24, b.y0 - 24, 1); badge(g, X(250), Y(1) - 14, 2);
    function life(arr) { for (var k = 0; k < arr.length; k++) if (arr[k] < 0.8) return k + 1; return null; }
    function render() {
      var ce = +sl.value / 100; setSvgText(sv, (ce * 100).toFixed(2) + ' %');
      var lives = [];
      paths.forEach(function (p, i) {
        var a = M9.inventory(ce, p.c.ex, N), pts = [[X(0), Y(1)]]; a.forEach(function (c, k) { pts.push([X(k + 1), Y(c)]); });
        p.p.setAttribute('d', e11d(pts)); lives.push(life(a));
        var n = [40, 150, 420][i], v = a[n], y = v > 0.97 ? Y(1) + 16 : Y(v) - 8;
        p.t.setAttribute('x', X(n)); p.t.setAttribute('y', Math.max(b.y1 + 12, Math.min(b.y0 - 6, y)));
      });
      read.innerHTML = 'Coulombic efficiency <b>' + (ce * 100).toFixed(2) + ' %</b>: each cycle ' + ((1 - ce) * 100).toFixed(2) + ' % of the cycled lithium is lost. Down to 80 %: anode-free after <b>' + (lives[0] || 'more than ' + N) + '</b> cycles, with 1× excess after ' + (lives[1] || 'more than ' + N) + ', with 3× excess after ' + (lives[2] || 'more than ' + N) + '. An excess lasts excess ÷ (1 − CE) cycles before the capacity starts to fall (this page’s model).';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'Every cycle a lithium-metal electrode loses a little lithium to SEI and dead lithium; the fraction it keeps is the <b>Coulombic efficiency</b>, CE. In an <b>anode-free</b> cell all the lithium comes from the positive electrode and is plated onto bare copper: nothing in reserve, so the capacity falls as CEⁿ from the first cycle.' },
      { text: 'A reservoir of <b>excess lithium</b> hides the losses until it is used up, at a price in weight and cost. Slide the efficiency: at 99 % an anode-free cell is down to 80 % after about 22 cycles; even 99.9 % gives only about 220.' }
    ]);
    render();
  });

  /* ===== 9.9 Making anode-free cells work ===== */
  register('f9-9', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var top = 50, bot = 220, cu0 = 40, cu1 = 62, sep0 = 300, sep1 = 312;
    el('rect', { x: cu0, y: top, width: cu1 - cu0, height: bot - top, fill: 'var(--copper)' }, g); txt(g, (cu0 + cu1) / 2, top - 10, 'Cu', 'strong', 'middle');
    el('rect', { x: sep0, y: top, width: sep1 - sep0, height: bot - top, fill: 'var(--cyan)', 'fill-opacity': '.3' }, g);
    el('rect', { x: sep1, y: top, width: 170, height: bot - top, fill: 'var(--panel-2)', 'fill-opacity': '.7' }, g); txt(g, sep1 + 85, top - 10, 'positive electrode', 'strong', 'middle'); txt(g, 180, top - 10, 'electrolyte', 'strong', 'middle');
    for (var i = 0; i < 10; i++) el('circle', { cx: sep1 + 20 + (i % 5) * 32, cy: top + 40 + Math.floor(i / 5) * 70, r: 5, 'class': 'ion' }, g);
    var layer = el('g', {}, g), plated = el('path', { fill: 'var(--metal)' }, g);
    badge(g, cu1 + 18, bot + 18, 1); badge(g, 120, bot + 18, 2); badge(g, 200, bot + 18, 3); badge(g, 280, bot + 18, 4);
    var stage = 0, ph = 0;
    var S = [
      { t: 'Anode-free means no negative electrode material at all: copper only. On the first charge, lithium from the positive electrode is plated onto the copper; on discharge it goes back. Simple, light and cheap to make, but with no lithium to spare (figure 9.8).', r: 'Advantages: high energy density, lower cost, lower weight and volume, a simple design that is easy to make. Challenges: dendrites, a thick or unstable SEI, low Coulombic efficiency, irreversible plating and stripping, dead lithium.' },
      { t: 'An <b>artificial SEI</b> on the copper: a spin-coated graphene-oxide film made the lithium deposit evenly, without dendrites.', r: 'Graphene oxide on Cu: average CE 98 % and 44 % of the capacity kept after 50 cycles, against 89 % and 26.9 % after only 20 cycles on bare copper.' },
      { t: '<b>Electrolyte</b> design: additives that build a better SEI, such as KNO₃, and new salt and solvent mixtures: a dual-salt LiDFOB/LiBF₄ electrolyte, localized high-concentration electrolytes, fluorinated solvents.', r: 'KNO₃: average CE of Cu|Li cells over 60 cycles 96.20 %, against 85.74 % without it. LiDFOB/LiBF₄: anode-free pouch cells kept 80 % after 90 cycles, the lithium growing as large mosaic grains about 50 µm across.' },
      { t: 'A <b>3D current collector</b>: porous copper made by dissolving the zinc out of a Cu–Zn alloy. Its large area spreads the current and gives the lithium room.', r: 'Porous Cu: CE above 97 % over 250 cycles; with LiFePO₄, 89.7 % of the capacity kept after 300 cycles, against 58.2 % on flat copper.' }
    ];
    function render() {
      clear(layer);
      var lv = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI), d = 'M' + cu1 + ',' + top;
      for (var j = 0; j <= 30; j++) { var y = top + (bot - top) * j / 30, w = lv * (stage >= 1 ? 14 : 8 + ((j * 7) % 11) * 1.6); d += ' L' + (cu1 + (stage === 3 ? 10 : 0) + w).toFixed(1) + ',' + y.toFixed(1); }
      plated.setAttribute('d', d + ' L' + cu1 + ',' + bot + ' Z');
      if (stage === 1) el('rect', { x: cu1, y: top, width: 4, height: bot - top, fill: '#d9c48f' }, layer);
      if (stage === 2) for (var k = 0; k < 8; k++) el('circle', { cx: 110 + (k % 4) * 45, cy: top + 30 + Math.floor(k / 4) * 90, r: 4, fill: '#C4B5F7' }, layer);
      if (stage === 3) for (var m = 0; m < 9; m++) el('rect', { x: cu1, y: top + 6 + m * 19, width: 10, height: 8, fill: 'var(--copper)' }, layer);
      txt(layer, 180, bot + 40, ['bare copper', 'graphene-oxide film on the copper', 'an additive in the electrolyte', 'porous copper'][stage], 'amber', 'middle');
      read.innerHTML = S[stage].r;
    }
    steps(fig, S.map(function (s, i) { return { text: s.t, on: function () { stage = i; render(); } }; }));
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph = (ph + dt / 5) % 1; render(); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) ph = 0.5;
    render(); bind(fig, loop);
  });

  /* ===== 9.10 Solid-state cells: the lithium/ceramic interface ===== */
  register('f9-10', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.icd'), sv = fig.querySelector('.icd-val');
    var mode = e11modes(fig, function (m) { mode = m; render(); });
    var top = 50, bot = 200, xi = 120;
    el('rect', { x: 30, y: top, width: xi - 30, height: bot - top, fill: 'var(--metal)' }, g); txt(g, 75, top - 10, 'lithium', 'strong', 'middle');
    el('rect', { x: xi + 6, y: top, width: 90, height: bot - top, fill: 'var(--text)', 'fill-opacity': '.25' }, g); txt(g, xi + 51, top - 10, 'ceramic', 'strong', 'middle');
    var gap = el('g', {}, g), inter = el('rect', { x: xi, y: top, width: 6, height: bot - top, fill: 'var(--cyan)' }, g), capT = txt(g, 123, bot + 20, '', '', 'middle');
    var b = { x0: 290, y0: 200, x1: 505, y1: 40 }, Y = function (r) { return e11log(Math.max(r, 0.5), -0.3, 3.9, b.y0, b.y1); };
    e11axes(g, b, { X: function (x) { return x; }, Y: Y, yt: [[1, '1'], [10, '10'], [100, '100'], [1000, '1000']], grid: true, ylab: 'interface resistance, Ω cm² (log)' });
    var PAIRS = [{ n: 'Li–C', a: 381, c: 11 }, { n: 'Al layer', a: 950, c: 75 }, { n: 'ALD Al₂O₃', a: 1710, c: 1 }];
    var rects = PAIRS.map(function (p, i) { var x = b.x0 + 16 + i * 68; txt(g, x + 22, b.y0 + 16, p.n, '', 'middle'); return { p: p, ra: el('rect', { x: x, width: 20, fill: 'var(--heat)' }, g), rc: el('rect', { x: x + 24, width: 20, fill: 'var(--cyan)' }, g), ta: txt(g, x + 10, 0, '', '', 'middle'), tc: txt(g, x + 34, 0, '', '', 'middle') }; });
    badge(g, 30, bot + 16, 1); badge(g, b.x1 - 10, b.y1 + 8, 2);
    function render() {
      var i = +sl.value, with_ = mode === 'with'; setSvgText(sv, i.toFixed(1) + ' mA/cm²');
      clear(gap); if (!with_) for (var k = 0; k < 6; k++) el('ellipse', { cx: xi + 2, cy: top + 14 + k * 26, rx: 5, ry: 7, fill: 'var(--bg)' }, gap);
      inter.style.display = with_ ? '' : 'none';
      setSvgText(capT, with_ ? 'interlayer: the lithium wets the ceramic' : 'bare: contact only at points');
      rects.forEach(function (o) { var ya = Y(o.p.a), yc = Y(o.p.c); o.ra.setAttribute('y', ya); o.ra.setAttribute('height', b.y0 - ya); o.rc.setAttribute('y', yc); o.rc.setAttribute('height', b.y0 - yc); o.ta.setAttribute('y', ya - 5); setSvgText(o.ta, o.p.a + ''); o.tc.setAttribute('y', yc - 5); setSvgText(o.tc, o.p.c + ''); o.rc.setAttribute('fill-opacity', with_ ? '.9' : '.25'); o.ra.setAttribute('fill-opacity', with_ ? '.3' : '.8'); });
      read.innerHTML = 'At <b>' + i.toFixed(1) + ' mA/cm²</b> the interface alone costs ' + PAIRS.map(function (p) { var v = (with_ ? p.c : p.a) * i; return p.n + ' ' + (v >= 1000 ? (v / 1000).toFixed(2) + ' V' : (v >= 10 ? Math.round(v) : v.toFixed(1)) + ' mV'); }).join(', ') + (with_ ? ', with the interlayer.' : ', with bare lithium (V = R × i).');
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'A solid electrolyte would let a cell use lithium metal. The trouble is the contact: a ceramic such as garnet is poorly wetted by lithium, so the two touch only at points, the current crowds through them, and the interface resistance is high. The interface can also react, and lithium can still grow through the ceramic’s grain boundaries.' },
      { text: 'Thin interlayers fix the contact. Red, bare; teal, with the interlayer, as measured: a lithium–graphite composite (381 → 11 Ω cm²), a thin aluminium layer that alloys with lithium (950 → 75), and an Al₂O₃ film made by atomic layer deposition (1710 → 1). Slide the current: at 1 mA/cm² the worst bare interface alone would cost 1.7 V.' }
    ]);
    render();
  });

  /* ===== 9.11 Sodium is bigger ===== */
  register('f9-11', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var scaled = !!fig.querySelector('.r42'); // ion sizes to scale only once the Shannon radii are verified
    var rLi = 7, rNa = scaled ? 7 * 102 / 76 : 10;
    function frame(x0, cols, d, R) {
      var c = [];
      for (var j = 0; j < 3; j++) for (var i = 0; i < cols; i++) { var x = x0 + R + i * d + (j % 2 ? d / 2 : 0), y = 64 + j * d * 0.866; c.push({ x: x, y: y, i: i, j: j }); el('circle', { cx: x, cy: y, r: R, fill: 'var(--anion)', 'fill-opacity': '.3', stroke: 'var(--anion)' }, g); }
      function at(i, j) { for (var k = 0; k < c.length; k++) if (c[k].i === i && c[k].j === j) return c[k]; }
      return function (i, j) { var A = at(i, j), B = at(i + 1, j), C = at(i, j + 1); return { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3, free: d / Math.sqrt(3) - R }; };
    }
    txt(g, 140, 22, 'close-packed oxide', 'strong', 'middle'); txt(g, 395, 22, 'more open framework', 'strong', 'middle');
    var L = frame(30, 4, 54, 24), Rf = frame(296, 3, 70, 22);
    var s1 = L(0, 0), s2 = L(2, 0), s3 = Rf(1, 0);
    el('circle', { cx: s1.x, cy: s1.y, r: rLi, 'class': 'ion' }, g);
    el('circle', { cx: s2.x, cy: s2.y, r: rNa, fill: '#e9a0f0', stroke: 'var(--heat)', 'stroke-width': 1.6 }, g);
    el('circle', { cx: s3.x, cy: s3.y, r: rNa, fill: '#e9a0f0', stroke: '#fff', 'stroke-width': .8 }, g);
    txt(g, 140, 226, 'Li⁺ fits; Na⁺ is squeezed (red rim)', '', 'middle'); txt(g, 395, 226, 'Na⁺ fits', 'cyan', 'middle');
    txt(g, 260, 246, scaled ? 'ions to scale: Li⁺ 76 pm, Na⁺ 102 pm (six-coordinate radii); frameworks schematic' : 'sizes not to scale', '', 'middle');
    badge(g, 18, 40, 1); badge(g, 500, 40, 2);
    steps(fig, [
      { text: 'Na⁺ is a bigger ion than Li⁺. In the close-packed oxygen frameworks that serve lithium so well, the spaces between the oxide ions can be too small for it.' },
      { text: 'A sodium host needs <b>more open</b> interstitial space, which is why sodium-ion cells cannot simply reuse the lithium-ion materials.' }
    ]);
    read.innerHTML = 'The size of the guest ion decides which frameworks can host it.' + (scaled ? ' Ionic radii from Shannon’s table.' : '');
  });

  /* =================================================================
     Module 9, the positive electrodes and the organic electrodes.
     9.12 Positive electrodes compared: ratings after Marie and Gifford 2023
     (Faraday Insights 18, R73, Box 1); capacities and notes after R71, R72,
     R73, R75, R76 as stated in each note; the NMC view is Jung et al. 2017
     (R75), Table I. 9.13 Organic electrodes: types after Guo et al. 2024 (R78)
     and Jouhara et al. 2018 (R77); potentials from R77 (Fig. 5b, read off the plot), Jouhara et al.
     2025 (R80), Guo et al. 2024 (R78) and Wang et al. 2023 (R79).
     ================================================================= */
  var POS = [ // r: 2 good, 1 moderate, 0 poor, -1 not rated (cost: Low = good)
    { n: 'LCO', f: 'LiCoO₂', q: 140, ql: '135–140', qk: 'p', r: { cost: 0, en: 1, th: 0, cy: 2 },
      t: 'The original lithium-ion positive electrode, still in phones and laptops. In practice it gives up only about half its lithium, about 135 to 140 mAh/g; structural degradation at high states of charge limits it to half its theoretical capacity. Ratings: high cost, moderate energy density, poor thermal stability, good cycle life.' , s: 'Frith et al. 2023; Manthiram 2020; Marie and Gifford 2023' },
    { n: 'LMO', f: 'LiMn₂O₄', q: 130, ql: '< 130', qk: 'p', r: { cost: 2, en: 1, th: 2, cy: 0 },
      t: 'A spinel at about 4 V with three-dimensional lithium channels, so it delivers power well; cheap because manganese is cheap. Its practical capacity is below 130 mAh/g, and manganese dissolution poisons the graphite and fades the capacity, worst when hot. Ratings: low cost, moderate energy density, good thermal stability, poor cycle life.', s: 'Manthiram 2020; Marie and Gifford 2023' },
    { n: 'LFP', f: 'LiFePO₄', q: 170, ql: '170*', qk: 't', r: { cost: 2, en: 0, th: 2, cy: 2 },
      t: 'An olivine of iron and phosphate, flat at 3.43 V vs Li. Lower voltage and lower specific capacity than NMC (the bar is the theoretical 170 mAh/g of module 4), but a considerably longer cycle and calendar life than most NMC cells; state-of-the-art cells rose from 90 Wh/kg in 2010 to 160 Wh/kg in 2022. Used for grid storage and shorter-range electric cars. Ratings: low cost, low energy density, good thermal stability, good cycle life.', s: 'Safari and Delacourt 2011; Marie and Gifford 2023' },
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
  var NMC_COL = { NMC111: 'var(--cyan)', NMC622: 'var(--amber)', NMC811: 'var(--heat)' };
  function ratingSymbol(g, x, y, r, rad) {
    rad = rad || 8;
    if (r === 2) el('circle', { cx: x, cy: y, r: rad, fill: 'var(--cyan)' }, g);
    else if (r === 1) { el('circle', { cx: x, cy: y, r: rad, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.6 }, g); el('path', { d: 'M' + x + ',' + (y - rad) + ' A' + rad + ',' + rad + ' 0 0 0 ' + x + ',' + (y + rad) + ' Z', fill: 'var(--amber)' }, g); }
    else if (r === 0) { var d = rad * 0.56; el('circle', { cx: x, cy: y, r: rad, fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.8 }, g); el('path', { d: 'M' + (x - d) + ',' + (y - d) + ' L' + (x + d) + ',' + (y + d) + ' M' + (x + d) + ',' + (y - d) + ' L' + (x - d) + ',' + (y + d), stroke: 'var(--heat)', 'stroke-width': 1.8 }, g); }
    else el('line', { x1: x - 5, x2: x + 5, y1: y, y2: y, stroke: 'var(--muted)', 'stroke-width': 1.6 }, g);
  }

  /* ===== 9.12 Positive electrodes compared ===== */
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
      var bg = el('rect', { x: 8, y: y - rh / 2 + 1, width: 504, height: rh - 2, rx: 6, fill: i % 2 ? 'transparent' : 'rgba(234,240,236,.035)', stroke: 'var(--amber)', 'stroke-opacity': 0, 'stroke-width': 1.5 }, row);
      txt(row, rx, y + 4, p.n, 'strong', 'start');
      if (p.q) {
        var w = qw * p.q / 300;
        if (p.qk === 't') el('rect', { x: cQ, y: y - 6, width: w, height: 12, rx: 3, fill: 'none', stroke: 'var(--cyan)', 'stroke-dasharray': '3 2' }, row);
        else el('rect', { x: cQ, y: y - 6, width: w, height: 12, rx: 3, fill: 'var(--cyan)', 'fill-opacity': '.7' }, row);
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

  /* ===== 9.13 Organic electrodes: how they work, and where their voltages sit ===== */
  var ORG = [ // potentials vs Li+/Li; col: 0 M(Li2)-p-DHT spectator-cation series, 1 other relatives of p-DHT, 2 Wurster-type and oximate
    // names use §p§ for the italic locant (see setSvgText); readouts convert it with itl()
    { n: 'Li₄-§p§-DHT', col: 0, v: 2.55, dy: -1, t: 'Dilithium (2,5-dilithium-oxy)-terephthalate, where lithium is also the spectator cation. The phenolates are the redox centre, about 2.6 V; in bulk it exchanges one electron per formula unit, half of its theoretical capacity (241 mAh/g for two electrons, computed from its formula). Exfoliated nanosheets reach both electrons. It is oxidized by air.', s: 'Jouhara et al. 2018 and 2025' },
    { n: 'Ba(Li₂)-§p§-DHT', col: 0, v: 2.45, dy: 11, t: 'Barium as the spectator cation: the lowest ionic potential (charge over radius) of the series, and no gain, about 2.45 V against about 2.55 V for the all-lithium salt.', s: 'Jouhara et al. 2018, Fig. 5b' },
    { n: 'Ca(Li₂)-§p§-DHT', col: 0, v: 2.85, dy: -7, t: 'Calcium as the spectator cation: an intermediate ionic potential and an intermediate gain, about 2.85 V.', s: 'Jouhara et al. 2018, Fig. 5b' },
    { n: 'Mg(Li₂)-§p§-DHT', col: 0, v: 3.40, dy: 15, t: 'Magnesium, the spectator cation with the highest ionic potential. In the crystal each Mg²⁺ is chelated by two organic ions, each through a phenolate oxygen and the neighbouring carboxylate oxygen, and each phenolate oxygen is bonded to one Li⁺ and two Mg²⁺. The more covalent Mg–O bond draws electron density from the phenolate and the ring, and lifts the potential by about 0.8 V, to about 3.4 V (3.45 V calculated), in the range of LiFePO₄. About 100 mAh/g (one electron of two), stable cycling, stable in air once dehydrated.', s: 'Jouhara et al. 2018 and 2025' },
    { n: 'Li₄-§o§-DHT', col: 1, v: 2.85, t: 'Dilithium (2,3-dilithium-oxy)-terephthalate, the §ortho§ isomer: moving the two –OLi groups next to each other raises the potential by about 0.3 V, but bulk material still gives one electron of two, and it is oxidized by air.', s: 'Jouhara et al. 2018' },
    { n: 'Li₄-§p§-DOBDA', col: 1, v: 3.35, dy: 4, t: 'Tetralithium 2,5-dioxido-1,4-benzenediacetate: carboxylates held off the ring by a methylene (CH₂) spacer are no longer conjugated with it; the authors attribute the rise to a through-space charge modulation in the solid. 3.35 V with both electrons, 215 mAh/g, but a large polarization on cycling.', s: 'Jouhara et al. 2025' },
    { n: 'Li₂-BQDO', col: 2, v: 3.0, t: 'A conjugated oximate, with its charge on C=N–O⁻ groups: about 350 mAh/g at about 3.0 V, close to 1 kWh/kg at the material level; it polymerizes reversibly as it charges, which slows dissolution.', s: 'Wang et al. 2023' },
    { n: 'Li₂-PDCA', col: 2, v: 3.15, t: 'A conjugated cyanamide: a §p§-phenylenediamine core with –C≡N on each nitrogen (Wurster-type redox). 3.15 and 3.32 V in the solid, 320 mAh/g in theory for two electrons. The charged form dissolves, so cycling one electron (160 mAh/g) kept about 80 % after 100 cycles.', s: 'Guo et al. 2024' },
    { n: 'Li₂-PDFSA', col: 2, v: 3.55, t: 'A conjugated triflimide: the same core with –SO₂CF₃ on each nitrogen, the more strongly electron-withdrawing relative of the conjugated sulfonamides. About 3.55 V in the solid, 140 mAh/g in theory; stable in moist ambient air.', s: 'Guo et al. 2024' },
    { n: 'Li₂-DF-PDFSA', col: 2, v: 3.70, t: 'Two fluorine atoms on the ring raise it further: about 3.7 V on its first plateau in the solid; in solution its two steps sit at 3.68 and 3.91 V, the second the highest n-type organic potential reported in that work.', s: 'Guo et al. 2024' }
  ];
  function itl(str) { return String(str).replace(/§([^§]*)§/g, '<i>$1</i>'); } // §p§ -> <i>p</i> for HTML readouts
  register('f9-13', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), vb = fig.querySelectorAll('button[data-view]');
    var gM = el('g', {}, svg), gL = el('g', {}, svg), osel = null;
    // ---------- how they work: three panels ----------
    var P = [{ x: 90, k: 'n', h: 'n-type', s1: 'reduced: takes e⁻', s2: 'a cation (Li⁺) balances it' }, { x: 260, k: 'p', h: 'p-type', s1: 'oxidized: gives e⁻', s2: 'an anion (A⁻) balances it' }, { x: 430, k: 'b', h: 'bipolar', s1: 'both, in different', s2: 'potential windows' }];
    var parts = {};
    P.forEach(function (p) {
      var g = el('g', {}, gM); parts[p.k] = g;
      txt(g, p.x, 22, p.h, 'strong', 'middle');
      el('rect', { x: p.x - 34, y: 92, width: 68, height: 36, rx: 10, fill: 'var(--panel-2)', stroke: 'var(--amber)' }, g);
      txt(g, p.x, 115, 'R', 'strong', 'middle');
      if (p.k !== 'p') { el('rect', { x: p.x - 34, y: 152, width: 68, height: 36, rx: 10, fill: 'var(--panel-2)', stroke: 'var(--cyan)' }, g); txt(g, p.x, 175, 'R⁻ Li⁺', 'cyan', 'middle'); el('line', { x1: p.x, y1: 130, x2: p.x, y2: 148, stroke: 'var(--cyan)', 'stroke-width': 1.6, 'marker-end': 'url(#f913-arc)' }, g); }
      if (p.k !== 'n') { el('rect', { x: p.x - 34, y: 34, width: 68, height: 36, rx: 10, fill: 'var(--panel-2)', stroke: 'var(--heat)' }, g); txt(g, p.x, 57, 'R⁺ A⁻', 'heat', 'middle'); el('line', { x1: p.x, y1: 90, x2: p.x, y2: 74, stroke: 'var(--heat)', 'stroke-width': 1.6, 'marker-end': 'url(#f913-arh)' }, g); }
      txt(g, p.x, 214, p.s1, '', 'middle'); txt(g, p.x, 230, p.s2, '', 'middle');
    });
    var defs = el('defs', {}, svg); [['f913-arc', 'var(--cyan)'], ['f913-arh', 'var(--heat)']].forEach(function (m) { var mk = el('marker', { id: m[0], viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', fill: m[1] }, mk); });
    txt(gM, 260, 272, 'neutral form in the middle; R = the redox-active molecule or polymer', '', 'middle', { style: 'fill:var(--muted)' });
    badge(gM, 90 - 50, 110, 1); badge(gM, 260 - 50, 52, 2); badge(gM, 430 - 50, 110, 3);
    // ---------- the voltage ladder ----------
    var L = { x0: 60, y0: 250, y1: 40, lo: 2.4, hi: 3.8 }, YV = function (v) { return L.y0 - (v - L.lo) / (L.hi - L.lo) * (L.y0 - L.y1); };
    var CX = [150, 290, 430], CH = ['M(Li₂)-§p§-DHT salts', 'other §p§-DHT relatives', 'Wurster-type, oximate'];
    el('line', { x1: L.x0, y1: L.y0, x2: L.x0, y2: L.y1, stroke: 'var(--line-2)' }, gL);
    [2.4, 3.2, 3.6].forEach(function (v) { el('line', { x1: L.x0, x2: 505, y1: YV(v), y2: YV(v), stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, gL); txt(gL, L.x0 - 6, YV(v) + 4, v.toFixed(1), '', 'end'); });
    txt(gL, L.x0 - 40, L.y1 - 18, 'average potential, V vs Li⁺/Li', '', 'start');
    CH.forEach(function (h, i) { txt(gL, CX[i], L.y0 + 28, h, 'strong', 'middle'); });
    el('line', { x1: L.x0, x2: 505, y1: YV(2.91), y2: YV(2.91), stroke: 'var(--heat)', 'stroke-dasharray': '6 4' }, gL);
    txt(gL, L.x0 - 6, YV(2.91) + 4, '2.91', 'heat', 'end');
    el('line', { x1: L.x0, x2: 505, y1: YV(3.43), y2: YV(3.43), stroke: 'var(--muted)', 'stroke-width': 1.4 }, gL);
    txt(gL, 505, YV(3.43) + 14, 'LiFePO₄, 3.43 V', '', 'end', { style: 'fill:var(--muted)' });
    var dots = [];
    ORG.forEach(function (o) {
      var x = CX[o.col], y = YV(o.v), g = el('g', { tabindex: 0, role: 'button', 'aria-label': o.n.replace(/§/g, '') + ', ' + o.v.toFixed(2) + ' volts', style: 'cursor:pointer' }, gL);
      el('circle', { cx: x, cy: y, r: 9, fill: 'transparent' }, g);
      var c = el('circle', { cx: x, cy: y, r: 5, fill: o.v >= 2.91 ? 'var(--cyan)' : 'var(--amber)', stroke: 'var(--bg)', 'stroke-width': 1 }, g);
      var ring = el('circle', { cx: x, cy: y, r: 9, fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.5, 'stroke-opacity': 0 }, g);
      txt(g, x + 10, y + (o.dy || 4), o.n, '', 'start');
      dots.push({ o: o, ring: ring });
      pressable(g, function () { osel = o; placeL(); });
    });
    badge(gL, CX[0] - 26, YV(3.62), 4); badge(gL, CX[2] - 26, YV(3.70), 5);
    function placeL() {
      dots.forEach(function (d) { d.ring.setAttribute('stroke-opacity', osel === d.o ? 0.9 : 0); });
      if (!osel) { read.innerHTML = 'Each dot is the average (or first-plateau) potential of a lithiated organic positive electrode, measured against lithium. Below the dashed line a lithiated material is thermodynamically prone to oxidation by air. Tap a dot.'; return; }
      read.innerHTML = '<b>' + itl(osel.n) + '</b>, about ' + osel.v.toFixed(2) + ' V vs Li. ' + itl(osel.t) + ' <span style="color:var(--muted)">Sources: ' + osel.s + '.</span>';
    }
    function placeM(k) {
      ['n', 'p', 'b'].forEach(function (q) { parts[q].style.opacity = !k || k === q ? 1 : 0.3; });
      var T = { n: 'n-type: the molecule is reduced and a cation, here Li⁺, balances the extra negative charge. n-type materials suit lithium-ion cells, because they work with the cation that already rocks between the electrodes. <span style="color:var(--muted)">Source: Guo et al. 2024.</span>', p: 'p-type: the molecule is oxidized and an anion from the electrolyte balances the positive charge. These work at relatively high potential, but they store the anion, which suits dual-ion or lithium-free cells rather than the rocking chair. <span style="color:var(--muted)">Sources: Guo et al. 2024; Wang et al. 2023.</span>', b: 'Bipolar: one material can do both, taking a cation in one window of potential and an anion in another. <span style="color:var(--muted)">Source: Guo et al. 2024.</span>' };
      read.innerHTML = k ? T[k] : 'Organic electrodes are sorted by the charge their molecule takes on, and by which ion balances it. Use the steps.';
    }
    function setView(v) {
      gM.style.display = v === 'm' ? '' : 'none'; gL.style.display = v === 'l' ? '' : 'none';
      Array.prototype.forEach.call(vb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
      if (v === 'l') placeL(); else placeM(null);
    }
    var st = null;
    Array.prototype.forEach.call(vb, function (b) { on(b, 'click', function () { var v = b.getAttribute('data-view'); if (st) st.go(v === 'l' ? 3 : 0); else setView(v); }); });
    setView('m');
    st = steps(fig, [
      { text: 'n-type: reduction, balanced by a cation such as Li⁺. A lithiated n-type material is made in its reduced form and gives up its lithium on the first charge, like LiCoO₂.', on: function () { setView('m'); placeM('n'); } },
      { text: 'p-type: oxidation, balanced by an anion from the electrolyte. High potentials, but the anion, not lithium, is what the electrode takes up.', on: function () { setView('m'); placeM('p'); } },
      { text: 'Bipolar: both, a cation in one window of potential and an anion in another.', on: function () { setView('m'); placeM('b'); } },
      { text: 'Now the voltages of lithiated n-type positive electrodes. In the M(Li₂)-<i>p</i>-DHT salts the organic ion is the same and the spectator cation sets the potential: barium and lithium near 2.5 V, calcium about 2.85 V, magnesium 3.4 V.', on: function () { osel = ORG[3]; setView('l'); } },
      { text: 'A <i>p</i>-phenylenediamine core with electron-withdrawing groups on its nitrogens (Wurster-type redox) goes higher still: the conjugated triflimides reach about 3.7 V; the simplest cyanamide stores more but dissolves when fully charged.', on: function () { osel = ORG[ORG.length - 1]; setView('l'); } }
    ]);
  });


  /* ===== 9.14 The p-DHT family in 3D, and where the cations sit in Mg(Li2)-p-DHT =====
     Geometries of the three tetra-anions computed for this page: GFN2-xTB (tblite, ASE BFGS to
     fmax 0.01 eV/A), charge -4, ALPB implicit water standing in for the cations (2026-10-04).
     Start structures from RDKit (ETKDG + MMFF). A B3LYP/def2-SVP check was started but not finished.
     Coordinates in Angstrom. The cations view is a schematic of the coordination reported for the
     solved crystal structure (Jouhara et al. 2025, CCDC 2247807); positions are not to scale. */
    M3_COL.Mg = ['#c8f5b8', '#3e9e45']; M3_R.Mg = 0.5;
  var DHT_GEOM = /*GEOM*/{"pdht": [["O", 3.405, 0.873, 1.052], ["C", 2.884, 0.203, 0.119], ["O", 3.566, -0.322, -0.802], ["C", 1.386, 0.065, 0.078], ["C", 0.66, 1.026, -0.603], ["C", -0.745, 1.019, -0.721], ["O", -1.387, 1.957, -1.382], ["C", -1.386, -0.065, -0.078], ["C", -2.884, -0.203, -0.119], ["O", -3.405, -0.873, -1.052], ["O", -3.566, 0.322, 0.802], ["C", -0.66, -1.026, 0.603], ["C", 0.745, -1.019, 0.721], ["O", 1.387, -1.957, 1.382], ["H", 1.208, 1.845, -1.084], ["H", -1.208, -1.845, 1.084]], "odht": [["O", 3.585, 0.785, -0.041], ["C", 2.808, 0.108, 0.686], ["O", 3.219, -0.564, 1.672], ["C", 1.345, 0.057, 0.333], ["C", 0.896, -0.931, -0.541], ["C", -0.436, -0.999, -0.88], ["C", -1.339, -0.08, -0.349], ["C", -2.791, -0.177, -0.737], ["O", -3.556, -0.909, -0.05], ["O", -3.189, 0.44, -1.763], ["C", -0.937, 0.934, 0.535], ["O", -1.796, 1.798, 1.031], ["C", 0.475, 1.007, 0.894], ["O", 0.907, 1.936, 1.718], ["H", 1.62, -1.641, -0.944], ["H", -0.809, -1.765, -1.562]], "pdobda": [["O", 4.197, -1.103, 0.675], ["C", 3.792, 0.007, 0.255], ["O", 4.19, 1.11, 0.702], ["C", 2.794, 0.018, -0.91], ["C", 1.342, 0.009, -0.477], ["C", 0.978, -0.009, 0.855], ["C", -0.357, -0.019, 1.305], ["O", -0.663, -0.036, 2.583], ["C", -1.342, -0.009, 0.286], ["C", -2.794, -0.019, 0.719], ["C", -3.793, -0.007, -0.446], ["O", -4.197, 1.103, -0.866], ["O", -4.19, -1.109, -0.893], ["C", -0.978, 0.009, -1.046], ["C", 0.357, 0.018, -1.496], ["O", 0.663, 0.035, -2.774], ["H", 2.965, 0.914, -1.523], ["H", 2.971, -0.861, -1.544], ["H", 1.765, -0.016, 1.614], ["H", -2.965, -0.915, 1.331], ["H", -2.971, 0.861, 1.353], ["H", -1.765, 0.016, -1.805]]}/*END*/;
  var DHT_RCOV = { H: 0.31, C: 0.76, O: 0.66 };
  function dhtTpl(k) { // atoms, bonds (single sticks: the charge is delocalized), and the phenolate oxygens
    var A = DHT_GEOM[k].map(function (a) { return { e: a[0], p: [a[1], a[2], a[3]] }; }), b = [], nb = A.map(function () { return []; });
    for (var i = 0; i < A.length; i++) for (var j = i + 1; j < A.length; j++) {
      var d = Math.hypot(A[i].p[0] - A[j].p[0], A[i].p[1] - A[j].p[1], A[i].p[2] - A[j].p[2]);
      if (d < 1.15 * (DHT_RCOV[A[i].e] + DHT_RCOV[A[j].e])) { b.push([i, j, 1]); nb[i].push(j); nb[j].push(i); }
    }
    var phen = [];
    A.forEach(function (a, i) {
      if (a.e !== 'O' || nb[i].length !== 1) return;
      var c = nb[i][0]; if (A[c].e !== 'C') return;
      var nO = nb[c].filter(function (q) { return A[q].e === 'O'; }).length, nC = nb[c].filter(function (q) { return A[q].e === 'C'; }).length;
      if (nO === 1 && nC === 2) phen.push(i); // an oxygen on a ring carbon: the phenolate
    });
    return { tpl: m3centre({ atoms: A, bonds: b, bind: 0 }), phen: phen, nb: nb };
  }
  register('f9-14', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), btns = fig.querySelectorAll('button[data-mol]');
    var pfx = 'm914'; m3defs(svg, pfx);
    var g = el('g', {}, svg), stage = el('g', {}, g), S = m3scene(stage, pfx), flat = el('g', {}, g);
    var V = { yaw: 0.5, pitch: 0.45, cx: 260, cy: 158, scale: 26 };
    var name = txt(g, 260, 22, '', 'strong', 'middle'), sub = txt(g, 260, 40, '', '', 'middle');
    var hint = txt(g, 260, 290, '', '', 'middle', { style: 'fill:var(--muted)' });
    var cur = 'pdht';
    var INFO = {
      pdht: ['§p§-DHT⁴⁻', '2,5-dioxido-1,4-benzenedicarboxylate', 'The ion of Li₄-<i>p</i>-DHT and of Mg(Li₂)-<i>p</i>-DHT. The two phenolate oxygens (ringed) sit opposite each other, <i>para</i>, each next to a carboxylate (–CO₂⁻). The phenolates are the redox centre: they give up electrons on charge, at about 2.6 V in the all-lithium salt. The carboxylates make the salts nearly insoluble in carbonate electrolytes and react only near 0.8 V.', 'Jouhara et al. 2018'],
      odht: ['§o§-DHT⁴⁻', '2,3-dioxido-1,4-benzenedicarboxylate', 'The ion of Li₄-<i>o</i>-DHT. The same atoms, but the two phenolate oxygens are now neighbours, <i>ortho</i>, each still next to a carboxylate. That change alone raises the potential by about 0.3 V; like the <i>para</i> salt, it is oxidized by air.', 'Jouhara et al. 2018'],
      pdobda: ['§p§-DOBDA⁴⁻', '2,5-dioxido-1,4-benzenediacetate', 'The ion of Li₄-<i>p</i>-DOBDA. A methylene (CH₂) spacer holds each carboxylate off the ring, so the carboxylate is no longer conjugated with it. The potential still rises, to about 3.35 V, which the authors attribute to a through-space charge modulation in the solid, with both electrons exchanged, 215 mAh/g, though with a large polarization on cycling.', 'Jouhara et al. 2025'],
      mg: ['Mg(Li₂)-§p§-DHT: where the cations sit', 'schematic of the solved crystal structure', 'Each Mg²⁺ (green) is chelated by two <i>p</i>-DHT⁴⁻ ions, each through a phenolate oxygen and the neighbouring carboxylate oxygen, closing two six-membered rings (one is drawn), and sits in an octahedron of four phenolate and two carboxylate oxygens. Each phenolate oxygen, the redox centre, is bonded to one Li⁺ and two Mg²⁺; each Li⁺ (gold) is in a tetrahedron of three carboxylate and one phenolate oxygen. So magnesium is not confined to the carboxylates: it binds the phenolate oxygen itself, and the more covalent Mg–O bond takes electron density from it and from the ring, which is why the potential rises to about 3.4 V. The rings stack 3.18 Å apart; after one lithium per formula unit is removed they are calculated to pair into dimers, 2.92 and 3.10 Å apart.', 'Jouhara et al. 2025; Jouhara et al. 2018']
    };
    var cache = {};
    function tplOf(k) { return cache[k] || (cache[k] = dhtTpl(k)); }
    function extent(t) { var m = 0; t.tpl.atoms.forEach(function (a) { m = Math.max(m, Math.hypot(a.p[0], a.p[1], a.p[2])); }); return m; }
    /* ---------- the cations view: a flat drawing of p-DHT4- with its metal neighbours ---------- */
    function drawFlat() {
      clear(flat);
      var t = tplOf('pdht'), A = t.tpl.atoms;
      // best plane of the ring: the plane through the six ring carbons (normal from two ring vectors)
      var ring = A.map(function (a, i) { return i; }).filter(function (i) { return A[i].e === 'C' && t.nb[i].filter(function (q) { return A[q].e === 'C'; }).length >= 2 && t.nb[i].filter(function (q) { return A[q].e === 'O'; }).length < 2; });
      var u = v3n([A[ring[0]].p[0], A[ring[0]].p[1], A[ring[0]].p[2]]), w0 = A[ring[1]].p, nrm = v3n(v3x(u, w0)), v = v3n(v3x(nrm, u));
      // long axis along x: the line through the two carboxylate carbons
      var cc = A.map(function (a, i) { return i; }).filter(function (i) { return A[i].e === 'C' && t.nb[i].filter(function (q) { return A[q].e === 'O'; }).length === 2; });
      var ax = v3n([A[cc[0]].p[0] - A[cc[1]].p[0], A[cc[0]].p[1] - A[cc[1]].p[1], A[cc[0]].p[2] - A[cc[1]].p[2]]);
      ax = v3n([v3d(ax, u) * u[0] + v3d(ax, v) * v[0], v3d(ax, u) * u[1] + v3d(ax, v) * v[1], v3d(ax, u) * u[2] + v3d(ax, v) * v[2]]);
      var ay = v3n(v3x(nrm, ax)), s = 24, X0 = 156, Y0 = 162;
      var P = A.map(function (a) { return [X0 + v3d(a.p, ax) * s, Y0 - v3d(a.p, ay) * s]; });
      var P2 = function (i) { return P[i]; };
      // metal positions (schematic): Mg in each chelate pocket, 2.05 A from the phenolate O and the nearer carboxylate O
      var mets = [];
      t.phen.forEach(function (io) {
        var c = t.nb[io][0], oc = null, best = 1e9;
        A.forEach(function (a, j) { if (a.e !== 'O' || j === io || t.phen.indexOf(j) >= 0) return; var d = Math.hypot(P[j][0] - P[io][0], P[j][1] - P[io][1]); if (d < best) { best = d; oc = j; } });
        var mx = (P[io][0] + P[oc][0]) / 2, my = (P[io][1] + P[oc][1]) / 2, half = best / 2, r = 2.05 * s, h = Math.sqrt(Math.max(r * r - half * half, 4));
        var nx = -(P[oc][1] - P[io][1]) / best, ny = (P[oc][0] - P[io][0]) / best;
        if ((mx + nx - X0) * (mx - X0) + (my + ny - Y0) * (my - Y0) < (mx - X0) * (mx - X0) + (my - Y0) * (my - Y0)) { nx = -nx; ny = -ny; } // point away from the ring centre
        mets.push({ e: 'Mg', x: mx + nx * h, y: my + ny * h, to: [io, oc], chel: true });
        // the phenolate's other two neighbours: one more Mg2+ and one Li+, drawn as pale stubs (each is shared with neighbouring ions)
        var ox = P[io][0] - P[c][0], oy = P[io][1] - P[c][1], L = Math.hypot(ox, oy); ox /= L; oy /= L;
        var side = (ox * (Y0 - P[io][1]) - oy * (X0 - P[io][0])) > 0 ? 1 : -1;
        mets.push({ e: 'Li', x: P[io][0] + (ox * 0.5 - oy * 0.86 * side) * 1.9 * s, y: P[io][1] + (oy * 0.5 + ox * 0.86 * side) * 1.9 * s, to: [io], stub: true });
        mets.push({ e: 'Mg', x: P[io][0] + ox * 1.6 * s + nx * 0.2 * s, y: P[io][1] + oy * 1.6 * s + ny * 0.2 * s, to: [io], stub: true, far: true });
      });
      t.tpl.bonds.forEach(function (b) { el('line', { x1: P2(b[0])[0], y1: P2(b[0])[1], x2: P2(b[1])[0], y2: P2(b[1])[1], stroke: '#d9e2e6', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-opacity': '.85' }, flat); });
      mets.forEach(function (m) { m.to.forEach(function (j) { el('line', { x1: m.x, y1: m.y, x2: P[j][0], y2: P[j][1], stroke: m.e === 'Mg' ? '#3e9e45' : '#d39b10', 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }, flat); }); });
      A.forEach(function (a, i) {
        el('circle', { cx: P[i][0], cy: P[i][1], r: M3_R[a.e] * s, fill: 'url(#' + pfx + '-' + a.e + ')', stroke: 'rgba(0,0,0,.35)', 'stroke-width': .6 }, flat);
        if (t.phen.indexOf(i) >= 0) el('circle', { cx: P[i][0], cy: P[i][1], r: M3_R.O * s + 4, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }, flat);
      });
      mets.forEach(function (m) {
        el('circle', { cx: m.x, cy: m.y, r: (m.e === 'Mg' ? 0.5 : 0.45) * s * (m.stub ? 0.8 : 1), fill: 'url(#' + pfx + '-' + m.e + ')', stroke: 'rgba(0,0,0,.35)', 'stroke-width': .6, 'fill-opacity': m.stub ? 0.75 : 1 }, flat);
      });
      var stubs = mets.filter(function (m) { return m.stub; });
      // the counts, on the right
      var R = [['Mg²⁺: MgO₆ octahedron', 'strong'], ['4 phenolate O + 2 carboxylate O', ''], ['Li⁺: LiO₄ tetrahedron', 'strong'], ['3 carboxylate O + 1 phenolate O', ''], ['each phenolate O (ringed):', 'strong'], ['1 Li⁺ + 2 Mg²⁺', ''], ['each –CO₂⁻: 3 Li⁺ + 1 Mg²⁺', ''], ['each §p§-DHT⁴⁻: 8 Li⁺ + 4 Mg²⁺', ''], ['bright: Mg²⁺ closing a chelate', 'm'], ['pale: the other Li⁺ and Mg²⁺', 'm']];
      R.forEach(function (r, i) { txt(flat, 314, 70 + i * 20 + (i > 7 ? 8 : 0), r[0], r[1] === 'm' ? '' : r[1], 'start', r[1] === 'm' ? { style: 'fill:var(--muted)' } : undefined); });
      return stubs.length;
    }
    function build() {
      S.clear(); clear(flat);
      var is3 = cur !== 'mg';
      stage.style.display = is3 ? '' : 'none'; flat.style.display = is3 ? 'none' : '';
      if (is3) {
        var t = tplOf(cur);
        S.add(t.tpl, { hl: t.phen });
        V.scale = Math.min(34, 132 / extent(t));
        setSvgText(hint, 'drag to turn it; computed for this page');
      } else {
        drawFlat();
        setSvgText(hint, 'schematic; bonding counts from the crystal structure, positions not to scale');
      }
      setSvgText(name, INFO[cur][0]); setSvgText(sub, INFO[cur][1]);
      read.innerHTML = INFO[cur][2] + ' <span style="color:var(--muted)">Sources: ' + INFO[cur][3] + '.</span>';
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mol') === cur)); });
      draw();
    }
    function draw() { if (cur !== 'mg') S.draw(V); }
    function tick(dt) { if (dt === 0 || cur === 'mg') return; if (!V.held) V.yaw += dt * 0.5; draw(); }
    var st = null;
    Array.prototype.forEach.call(btns, function (b) { on(b, 'click', function () { cur = b.getAttribute('data-mol'); if (st) st.go(cur === 'pdht' ? 0 : cur === 'mg' ? 1 : 2); else build(); }); });
    m3drag(svg, V, draw);
    st = steps(fig, [
      { text: 'The organic ion of Li₄-<i>p</i>-DHT and Mg(Li₂)-<i>p</i>-DHT, <i>p</i>-DHT⁴⁻. The two ringed atoms are the <b>phenolate oxygens</b>, the redox centre; each sits next to a carboxylate.', on: function () { cur = 'pdht'; build(); } },
      { text: 'In Mg(Li₂)-<i>p</i>-DHT, magnesium does not sit only at the carboxylates. Each Mg²⁺ is chelated by a phenolate oxygen and its neighbouring carboxylate oxygen (of two organic ions), and each phenolate oxygen is bonded to one Li⁺ and two Mg²⁺.', on: function () { cur = 'mg'; build(); } },
      { text: 'Changing the organic ion: the <i>ortho</i> isomer, or carboxylates held off the ring by a CH₂ spacer. Each raises the potential. Try the buttons.', on: function () { if (cur !== 'odht' && cur !== 'pdobda') cur = 'odht'; build(); } }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
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
