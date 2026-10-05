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
     Module 11, analysis (11.15 to 11.17): two different circuits with
     the same impedance (Lazanas and Prodromidis 2023, R63, sec. 8 and
     Fig. 7; Meddings et al. 2020, R64, sec. 3.2.2); the distribution of
     relaxation times and its regularisation (R64 eq 5 and sec. 3.2.1;
     Bakenhaster and Dewald 2025, R65, eqs 9 and 10 and sec. 4.3); and
     ageing check-ups, features and machine learning (R64 secs 1 and
     3.3.2; R65 sec. 4.2, Fig. 10). Physics in Physics.m11.
     ================================================================= */

  /* ===== 11.15 The same curve from different circuits ===== */
  register('f11-15', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.r2v'), sv = fig.querySelector('.r2v-val');
    var R0 = 0.020, R1 = 0.004, C1 = 0.25, C2 = 2, fs = M11.freqs(5000, 0.05, 12);
    txt(g, 20, 20, 'circuit 1: two arcs in series', 'amber', 'start'); txt(g, 290, 20, 'circuit 2: a nested ladder', 'cyan', 'start');
    var gc = el('g', {}, g);
    function wire(d) { el('path', { d: d, fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 1.4 }, gc); }
    function box(x, y, w, lab, val) { e11box(gc, x, y, w, lab, 'strong'); txt(gc, x + w / 2, y + 24, val, '', 'middle'); }
    var b = { x0: 60, y0: 330, x1: 470, y1: 150 }, F = e11nyq(g, b, [18, 38], 0, { xt: [[20, '20'], [25, '25'], [30, '30'], [35, '35 mΩ']], yt: [[0, '0'], [5, '5']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var p1 = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 3 }, g), dots = el('g', {}, g);
    badge(g, 250, 30, 1); badge(g, 506, 30, 2); badge(g, F.X(33), F.Y(6), 3);
    function render() {
      var R2 = +sl.value / 1000, L = M11.voigtToLadder(R1, C1, R2, C2); setSvgText(sv, (R2 * 1000).toFixed(0) + ' mΩ');
      clear(gc); clear(dots);
      // circuit 1: R0 - (R1||C1) - (R2||C2), shown as boxes with values
      wire('M14,64 H250'); box(20, 64, 50, 'R₀', e11mOhm(R0, 0)); box(86, 64, 74, 'R₁ ‖ C₁', e11mOhm(R1, 0) + ', ' + C1 + ' F'); box(176, 64, 74, 'R₂ ‖ C₂', e11mOhm(R2, 0) + ', ' + C2 + ' F');
      // circuit 2: R0 - [Ca || (Ra - (Rb||Cb))]
      wire('M284,64 H340 M340,44 V100 M340,44 H360 M420,44 H496 M340,100 H356 M410,100 H420 M496,100 H506 M496,44 V100 M506,64 V100');
      box(290, 64, 46, 'R₀', e11mOhm(R0, 0)); box(360, 44, 60, 'C_a', L.Ca.toFixed(2) + ' F');
      box(356, 100, 54, 'R_a', e11mOhm(L.Ra, 1)); box(420, 100, 76, 'R_b ‖ C_b', e11mOhm(L.Rb, 1) + ', ' + L.Cb.toFixed(2) + ' F');
      var z1 = fs.map(function (f) { return M11.voigtWZ({ R0: R0, R1: R1, C1: C1, R2: R2, C2: C2, sigma: 0 }, 2 * Math.PI * f); }), z2 = fs.map(function (f) { return M11.ladderZ(R0, L, 2 * Math.PI * f); });
      p1.setAttribute('d', e11zpath(z1, F, b, 1000));
      z2.forEach(function (z, i) { if (i % 2) return; el('circle', { cx: F.X(z.re * 1000), cy: F.Y(-z.im * 1000), r: 3.4, fill: 'var(--bg)', stroke: 'var(--cyan)', 'stroke-width': 1.8 }, dots); });
      var dmax = Math.max.apply(null, z1.map(function (z, i) { return M11.abs(M11.add(z, M11.scale(z2[i], -1))) / M11.abs(z); }));
      read.innerHTML = 'Largest difference between the two circuits over 5 kHz to 50 mHz: <b>' + (dmax < 1e-12 ? 'below 10⁻¹²' : sci(dmax, 1)) + '</b> of |Z|, rounding error only. Circuit 1 says R₁ + R₂ = ' + e11mOhm(R1 + R2) + ' of interface resistance in two separate films; circuit 2 says R<sub>a</sub> + R<sub>b</sub> = ' + e11mOhm(L.Ra + L.Rb) + ', arranged quite differently.';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'Circuit 1 is the usual reading of two arcs: the ohmic resistance, then two R‖C pairs in series, for example the SEI and charge transfer.' },
      { text: 'Circuit 2 nests the elements in a ladder: a capacitor in parallel with everything after it, as the SEI is sometimes drawn around the charge-transfer step. With the values shown, its impedance equals circuit 1 at every frequency. Change R₂ and the ladder values follow.' },
      { text: 'The orange line is circuit 1, the open circles circuit 2: one curve. A fit that looks perfect therefore cannot choose between them; the choice has to come from what is known about the cell. Keep the circuit as simple as the physics allows, and remember that every extra element improves the fit.' }
    ]);
    render();
  });

  /* ===== 11.16 Distribution of relaxation times ===== */
  register('f11-16', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.lam'), sv = fig.querySelector('.lam-val');
    var fs = M11.freqs(1e4, 0.1, 8), arcs = [{ R: 0.004, Q: 0.25, n: 0.9 }, { R: 0.010, Q: 2, n: 0.85 }];
    var rn = (function (s) { return function () { var x = 0; for (var j = 0; j < 6; j++) { s = (s * 1664525 + 1013904223) % 4294967296; x += s / 4294967296; } return (x - 3) / Math.sqrt(0.5); }; })(3);
    var Z = fs.map(function (f) { var w = 2 * Math.PI * f, z = M11.add(M11.zR(0.020), M11.zRQ(arcs[0].R, arcs[0].Q, arcs[0].n, w), M11.zRQ(arcs[1].R, arcs[1].Q, arcs[1].n, w)), m = M11.abs(z); return { re: z.re + 0.002 * m * rn(), im: z.im + 0.002 * m * rn() }; });
    var taus = [], NT = 60; for (var k = 0; k <= NT; k++) taus.push(Math.pow(10, -6 + 7 * k / NT));
    var dln = 7 / NT * Math.LN10;
    // exact distribution of an R || CPE arc (Cole-Cole form; this page's working): gamma(ln tau)
    function gExact(t) { return arcs.reduce(function (s, a) { var t0 = Math.pow(a.R * a.Q, 1 / a.n), u = a.n * Math.log(t / t0), p = (1 - a.n) * Math.PI; return s + a.R / (2 * Math.PI) * Math.sin(p) / (Math.cosh(u) - Math.cos(p)); }, 0); }
    // top: Nyquist
    var b = { x0: 60, y0: 170, x1: 300, y1: 30 }, F = e11nyq(g, b, [18, 38], -1, { xt: [[20, '20'], [25, '25'], [30, '30'], [35, '35']], yt: [[0, '0'], [5, '5']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    Z.forEach(function (z) { el('circle', { cx: F.X(z.re * 1000), cy: F.Y(-z.im * 1000), r: 2.8, fill: 'var(--amber)' }, g); });
    var pf = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.8 }, g);
    txt(g, 330, 50, 'the spectrum: two arcs', 'strong', 'start'); txt(g, 330, 68, 'that overlap; 0.2 % noise', '', 'start');
    // bottom: gamma against tau
    var d = { x0: 60, y0: 380, x1: 490, y1: 230 }, XT = function (t) { return e11log(t, -6, 1, d.x0, d.x1); }, ymax = 0.012, YG = function (v) { return d.y0 - v / ymax * (d.y0 - d.y1); };
    [[1e-5, 6e-5], [2e-4, 1e-2], [1e-2, 0.4]].forEach(function (s, i) { el('rect', { x: XT(s[0]), y: d.y1, width: XT(s[1]) - XT(s[0]), height: d.y0 - d.y1, fill: ['var(--cyan)', '#C4B5F7', 'var(--amber)'][i], 'fill-opacity': '.07' }, g); });
    txt(g, XT(2.4e-5), d.y1 + 14, 'bulk', '', 'middle'); txt(g, XT(1.4e-3), d.y1 + 14, 'SEI, surface', '', 'middle'); txt(g, XT(0.063), d.y1 + 14, 'charge transfer', '', 'middle');
    e11axes(g, d, { X: XT, Y: YG, xt: [[1e-6, '1 µs'], [1e-4, '0.1 ms'], [1e-2, '10 ms'], [1, '1 s'], [10, '10 s']], yt: [[0, ''], [0.005, '5'], [0.01, '10']], xlab: 'relaxation time τ (log)', ylab: 'γ(τ), mΩ per unit of ln τ' });
    var ex = []; for (k = 0; k <= 200; k++) { var t = Math.pow(10, -6 + 7 * k / 200); ex.push([XT(t), YG(gExact(t))]); }
    el('path', { d: e11d(ex), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g);
    var pg = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.6 }, g), pk = el('g', {}, g);
    badge(g, b.x1 - 14, b.y1 + 14, 1); badge(g, d.x1 - 12, d.y1 + 34, 2);
    function lamT(l) { return l >= 1 ? l.toFixed(0) : l >= 0.1 ? l.toFixed(l >= 0.3 ? 1 : 2).replace(/0+$/, '') : sci(l, 0).replace(/^1 × /, ''); }
    function render() {
      var lam = Math.pow(10, +sl.value); setSvgText(sv, lamT(lam));
      var res = M11.drt(fs, Z, taus, lam), dens = res.x.map(function (x) { return x / dln; });
      pf.setAttribute('d', e11zpath(res.fit, F, b, 1000));
      pg.setAttribute('d', e11d(taus.map(function (t, i) { return [XT(t), Math.max(d.y1 - 4, YG(dens[i]))]; })));
      clear(pk);
      var mx = Math.max.apply(null, dens), peaks = [];
      for (var i = 1; i < dens.length - 1; i++) if (dens[i] > dens[i - 1] && dens[i] >= dens[i + 1] && dens[i] > 0.05 * mx) peaks.push(i);
      peaks.forEach(function (i) { var x = XT(taus[i]), y = Math.max(d.y1 + 26, YG(dens[i])); el('line', { x1: x, x2: x, y1: y, y2: y - 8, stroke: 'var(--amber)' }, pk); txt(pk, x, y - 12, e11time(taus[i]), 'amber', 'middle'); });
      var verdict = peaks.length === 2 ? 'two peaks, one per process: about right' : peaks.length > 2 ? peaks.length + ' peaks: the extra ones come from noise, not from the cell' : 'one broad hump: the two processes have been smoothed into one';
      read.innerHTML = 'λ = <b>' + lamT(lam) + '</b>: ' + verdict + '. The dashed line is the exact distribution of the two depressed arcs used to make the data; the arcs peak at τ = ' + e11time(Math.pow(arcs[0].R * arcs[0].Q, 1 / arcs[0].n)) + ' and ' + e11time(Math.pow(arcs[1].R * arcs[1].Q, 1 / arcs[1].n)) + '.';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'A parallel R‖C pair relaxes with one time constant τ = RC. Any spectrum can be written as a distribution of such pairs, Z = R₀ + R<sub>pol</sub>∫g(τ)/(1 + jωτ) dτ. The distribution of relaxation times, the DRT, recovers g(τ): each process becomes a peak at its own τ, even when the arcs overlap in the Nyquist plot.' },
      { text: 'Recovering g(τ) from noisy data is unstable, so it needs <b>regularization</b>, a penalty of strength λ on large, spiky solutions. Slide λ down: noise turns into extra peaks. Slide it up: the two real peaks melt into one. Only a narrow range is right, and the number of peaks depends on it. DRT also needs excellent data: test it first (figure 11.14), and leave out the inductive and diffusion parts, which distort it.' }
    ]);
    render();
  });

  /* ===== 11.17 Following a cell as it ages ===== */
  register('f11-17', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.cyc'), sv = fig.querySelector('.cyc-val');
    var C = M11.CELL, fs = M11.freqs(2000, 0.5, 10);
    function cellAt(n) { var u = n / 400; return { L: C.L, R0: C.R0 * (1 + 0.15 * u), Rsei: C.Rsei * (1 + 1.2 * u), Qsei: C.Qsei, nsei: C.nsei, Rct: C.Rct * (1 + 1.0 * u), Cdl: C.Cdl, Rd: C.Rd, Cd: C.Cd }; }
    function soh(n) { var u = n / 400; return 100 - 6 * u - 3 * u * u; }
    var b = { x0: 50, y0: 216, x1: 270, y1: 40 }, F = e11nyq(g, b, [18, 52], -3, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[0, '0'], [10, '10']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    [0, 100, 200, 300, 400].forEach(function (n) { el('path', { d: e11zpath(fs.map(function (f) { return M11.cellZ(cellAt(n), 2 * Math.PI * f); }), F, b, 1000), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1, 'stroke-opacity': '.25' }, g); });
    var cur = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.6 }, g);
    var r = { x0: 340, y0: 110, x1: 505, y1: 40 }, c = { x0: 340, y0: 216, x1: 505, y1: 146 }, XC = function (n) { return r.x0 + n / 400 * (r.x1 - r.x0); };
    var YR = function (v) { return r.y0 - v / 0.035 * (r.y0 - r.y1); }, YS = function (s) { return c.y0 - (s - 90) / 10 * (c.y0 - c.y1); };
    e11axes(g, r, { X: XC, Y: YR, yt: [[0, '0'], [0.03, '30']], grid: true, ylab: 'fitted, mΩ' });
    e11axes(g, c, { X: XC, Y: YS, xt: [[0, '0'], [200, '200'], [400, '400']], yt: [[90, '90'], [100, '100']], grid: true, xlab: 'cycles', ylab: 'capacity, % of new' });
    var pts0 = [], pts1 = [], pts2 = []; for (var n = 0; n <= 400; n += 10) { var p = cellAt(n); pts0.push([XC(n), YR(p.R0)]); pts1.push([XC(n), YR(p.Rsei + p.Rct)]); pts2.push([XC(n), YS(soh(n))]); }
    el('path', { d: e11d(pts0), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.4, 'stroke-opacity': '.45' }, g); el('path', { d: e11d(pts1), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.4, 'stroke-opacity': '.45' }, g); el('path', { d: e11d(pts2), fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.4, 'stroke-opacity': '.45' }, g);
    txt(g, r.x0 + 4, YR(C.R0) - 6, 'R₀', 'cyan', 'start'); txt(g, r.x0 + 4, YR(C.Rsei + C.Rct) + 16, 'R_SEI + R_ct', 'amber', 'start');
    var m0 = el('circle', { r: 4, fill: 'var(--cyan)' }, g), m1 = el('circle', { r: 4, fill: 'var(--amber)' }, g), m2 = el('circle', { r: 4, fill: 'var(--heat)' }, g);
    // the machine-learning workflow (Bakenhaster and Dewald Fig. 10, after their ref. 81)
    var flow = ['impedance check-ups', 'extract features', 'split: train / test', 'train the model', 'predict SOC or SOH', 'check the errors'], fx = [20, 190, 360], boxes = [];
    flow.forEach(function (s, i) { var x = fx[i % 3], y = i < 3 ? 298 : 358; boxes.push(el('rect', { x: x, y: y - 16, width: 150, height: 30, rx: 5, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g)); txt(g, x + 75, y + 4, s, 'strong', 'middle'); if (i % 3 < 2) arrow(g, x + 152, y - 1, x + 168, y - 1, '#8a9aa0', 1.4); });
    el('path', { d: 'M470,314 V330 H95 V340', fill: 'none', stroke: '#8a9aa0', 'stroke-width': 1.4 }, g);
    txt(g, 20, 270, 'the data-driven route', 'strong', 'start');
    badge(g, b.x0 + 24, b.y1 + 10, 1); badge(g, r.x1 - 10, r.y1 + 8, 2); badge(g, 500, 268, 3);
    var cyc = 0;
    function place() {
      var p = cellAt(cyc); setSvgText(sv, Math.round(cyc) + '');
      cur.setAttribute('d', e11zpath(fs.map(function (f) { return M11.cellZ(p, 2 * Math.PI * f); }), F, b, 1000));
      m0.setAttribute('cx', XC(cyc)); m0.setAttribute('cy', YR(p.R0)); m1.setAttribute('cx', XC(cyc)); m1.setAttribute('cy', YR(p.Rsei + p.Rct)); m2.setAttribute('cx', XC(cyc)); m2.setAttribute('cy', YS(soh(cyc)));
      read.innerHTML = 'After <b>' + Math.round(cyc) + ' cycles</b> (illustrative numbers): R₀ = ' + e11mOhm(p.R0) + ' (+' + ((p.R0 / C.R0 - 1) * 100).toFixed(0) + ' %), R<sub>SEI</sub> + R<sub>ct</sub> = ' + e11mOhm(p.Rsei + p.Rct) + ' (+' + (((p.Rsei + p.Rct) / (C.Rsei + C.Rct) - 1) * 100).toFixed(0) + ' %), capacity ' + soh(cyc).toFixed(1) + ' % of new.' + (cyc >= 50 ? ' The interface part grows much faster than the ohmic part.' : '');
    }
    on(sl, 'input', function () { cyc = +sl.value; place(); });
    steps(fig, [
      { text: 'A <b>check-up</b> repeats the same measurement at fixed conditions, for example a spectrum at 50 % state of charge and 25 °C after a rest, every so many cycles: often enough to follow the ageing, rarely enough not to add to it. As the cell ages the impedance generally grows; here, as in many published cells, the arcs grow faster than the ohmic intercept moves.' },
      { text: 'A whole spectrum is many numbers; ageing studies reduce it to a few <b>features</b>: fitted resistances, DRT peaks, or the impedance at chosen frequencies. Individual contributions may track health, and warn of rapid fade, better than the total impedance does. Capacity is measured separately, by a full cycle.' },
      { text: '<b>Machine learning</b> learns the link between features and state of health or charge from many cells, then predicts it for a new one. Gaussian process regression is common; models based on relaxation times have reached errors near 1 %. The catch: they know only the chemistries and conditions in their training data, and temperature, state of charge and ageing all move the same spectrum.' }
    ]);
    place();
    var loop = anim(fig, function (dt) { if (dt === 0) return; cyc += dt * 60; if (cyc > 400) cyc = 0; sl.value = cyc; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* =================================================================
     Module 11, impedance basics (11.8 to 11.11): a sine in and a sine
     out, with the Lissajous plot (Lazanas and Prodromidis 2023, R63,
     secs 2, 6 and 7); Nyquist and Bode plots of the same data and when
     two arcs are resolved (R63 sec. 7.4 and sec. 8); the spectrum of a
     commercial cell built element by element (Meddings et al. 2020, R64,
     Fig. 1 and sec. 3.2.2); and the shapes real cells show: CPE, finite
     diffusion, spherical diffusion and the porous electrode (R63 secs
     12 to 14; Abbas et al. 2025, R69, eqs 6, 9 and 17). Physics in
     Physics.m11.
     ================================================================= */

  /* equal-scale Nyquist frame: b = {x0, y0, x1, y1}; xr = [lo, hi] in the plotted unit; the
     y range follows from the same scale (yLo at the bottom). Returns {X, Y, k} */
  function e11nyq(g, b, xr, yLo, o) {
    o = o || {};
    var k = (b.x1 - b.x0) / (xr[1] - xr[0]), X = function (v) { return b.x0 + (v - xr[0]) * k; }, Y = function (v) { return b.y0 - (v - yLo) * k; };
    var yHi = yLo + (b.y0 - b.y1) / k;
    if (yLo < 0) el('line', { x1: b.x0, x2: b.x1, y1: Y(0), y2: Y(0), stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g);
    e11axes(g, b, { X: X, Y: Y, xt: o.xt || [], yt: (o.yt || []).filter(function (t) { return t[0] >= yLo && t[0] <= yHi; }), xlab: o.xlab, ylab: o.ylab, grid: o.grid });
    return { X: X, Y: Y, k: k, yHi: yHi };
  }
  /* path of an impedance list, cut where it leaves the frame (so a capacitive line stops at the top) */
  function e11zpath(zs, F, b, unit) {
    var pts = [];
    for (var i = 0; i < zs.length; i++) { var x = F.X(zs[i].re * unit), y = F.Y(-zs[i].im * unit); if (y < b.y1 - 1 || x > b.x1 + 1 || x < b.x0 - 1 || y > b.y0 + 1) { if (pts.length) break; continue; } pts.push([x, y]); }
    return e11d(pts);
  }
  function e11deg(z) { return Math.atan2(z.im, z.re) * 180 / Math.PI; }

  /* ===== 11.8 A sine in, a sine out ===== */
  register('f11-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.fsl'), sv = fig.querySelector('.fsl-val');
    var V0 = 0.010, Rv = 20, Cv = 100e-6, Lv = 20e-3, elm = e11modes(fig, function (m) { elm = m; render(); });
    function Z(w) { return elm === 'R' ? M11.zR(Rv) : elm === 'C' ? M11.zC(Cv, w) : elm === 'L' ? M11.zL(Lv, w) : M11.parallel(M11.zR(Rv), M11.zC(Cv, w)); }
    // time panel
    var a = { x0: 52, x1: 300, yc: 122, h: 62 }, ty = a.yc + a.h + 10;
    el('line', { x1: a.x0, x2: a.x1, y1: a.yc, y2: a.yc, stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g);
    el('line', { x1: a.x0, x2: a.x0, y1: a.yc - a.h - 8, y2: ty, stroke: 'var(--line-2)' }, g); el('line', { x1: a.x0, x2: a.x1, y1: ty, y2: ty, stroke: 'var(--line-2)' }, g);
    txt(g, a.x0, 24, 'voltage applied and current measured', 'strong', 'start');
    var lv = txt(g, a.x0 + 6, a.yc - a.h - 12, '', 'amber', 'start'), li = txt(g, a.x0 + 120, a.yc - a.h - 12, '', 'cyan', 'start');
    var tk = [0, 1, 2].map(function (k) { var x = a.x0 + k * (a.x1 - a.x0) / 2; el('line', { x1: x, x2: x, y1: ty, y2: ty + 4, stroke: 'var(--line-2)' }, g); return txt(g, x, ty + 16, '', '', k === 0 ? 'start' : k === 2 ? 'end' : 'middle'); });
    var pv = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), pi = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.4 }, g);
    var cur = el('line', { y1: a.yc - a.h - 4, y2: a.yc + a.h + 4, stroke: 'var(--text)', 'stroke-dasharray': '3 3', 'stroke-opacity': '.6' }, g);
    var dV = el('circle', { r: 4.5, fill: 'var(--amber)' }, g), dI = el('circle', { r: 4.5, fill: 'var(--cyan)' }, g);
    // Lissajous panel
    var lc = { x: 420, y: 122, r: 62 };
    txt(g, lc.x, 24, 'current against voltage', 'strong', 'middle');
    el('rect', { x: lc.x - lc.r - 6, y: lc.y - lc.r - 6, width: 2 * lc.r + 12, height: 2 * lc.r + 12, fill: 'none', stroke: 'var(--line)' }, g);
    el('line', { x1: lc.x - lc.r - 6, x2: lc.x + lc.r + 6, y1: lc.y, y2: lc.y, stroke: 'var(--line-2)' }, g); el('line', { x1: lc.x, x2: lc.x, y1: lc.y - lc.r - 6, y2: lc.y + lc.r + 6, stroke: 'var(--line-2)' }, g);
    txt(g, lc.x + lc.r + 6, lc.y + lc.r + 22, 'V, scaled to ±V₀', 'amber', 'end'); txt(g, lc.x - lc.r - 6, lc.y - lc.r - 12, 'I, scaled to ±I₀', 'cyan', 'start');
    var liss = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g), dL = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var ph = txt(g, lc.x, lc.y + lc.r + 42, '', 'strong', 'middle');
    badge(g, a.x0 + 22, a.yc - a.h + 6, 1); badge(g, lc.x + lc.r - 8, lc.y - lc.r + 10, 2);
    var th = 0, f = 100, z = Z(2 * Math.PI * f), phi = 0;
    function place() {
      var u = (th % (4 * Math.PI)) / (4 * Math.PI), x = a.x0 + u * (a.x1 - a.x0), sv_ = Math.sin(th), si = Math.sin(th + phi);
      cur.setAttribute('x1', x); cur.setAttribute('x2', x);
      dV.setAttribute('cx', x); dV.setAttribute('cy', a.yc - sv_ * a.h); dI.setAttribute('cx', x); dI.setAttribute('cy', a.yc - si * a.h * 0.8);
      dL.setAttribute('cx', lc.x + sv_ * lc.r); dL.setAttribute('cy', lc.y - si * lc.r);
    }
    function render() {
      f = Math.pow(10, +sl.value); var w = 2 * Math.PI * f; z = Z(w); phi = -Math.atan2(z.im, z.re);
      var m = M11.abs(z), I0 = V0 / m, T = 1 / f, ptsV = [], ptsI = [], ptsL = [];
      setSvgText(sv, e11Hz(f));
      for (var k = 0; k <= 160; k++) { var t = 4 * Math.PI * k / 160, x = a.x0 + k / 160 * (a.x1 - a.x0); ptsV.push([x, a.yc - Math.sin(t) * a.h]); ptsI.push([x, a.yc - Math.sin(t + phi) * a.h * 0.8]); }
      for (k = 0; k <= 120; k++) { var t2 = 2 * Math.PI * k / 120; ptsL.push([lc.x + Math.sin(t2) * lc.r, lc.y - Math.sin(t2 + phi) * lc.r]); }
      pv.setAttribute('d', e11d(ptsV)); pi.setAttribute('d', e11d(ptsI)); liss.setAttribute('d', e11d(ptsL) + 'Z');
      setSvgText(lv, 'V: ±10 mV'); setSvgText(li, 'I: ±' + (I0 * 1000 >= 10 ? (I0 * 1000).toFixed(0) : (I0 * 1000).toFixed(2)) + ' mA');
      setSvgText(tk[0], '0'); setSvgText(tk[1], e11time(T)); setSvgText(tk[2], e11time(2 * T));
      var deg = Math.round(phi * 180 / Math.PI), names = { R: 'a resistor, 20 Ω', C: 'a capacitor, 100 µF', L: 'an inductor, 20 mH', RC: '20 Ω in parallel with 100 µF' };
      setSvgText(ph, Math.abs(deg) < 1 ? 'in phase' : deg > 0 ? 'current leads by ' + deg + '°' : 'current lags by ' + (-deg) + '°');
      read.innerHTML = 'At <b>' + e11Hz(f) + '</b>, ' + names[elm] + ': |Z| = V₀/I₀ = <b>' + (m >= 10 ? m.toFixed(1) : m.toFixed(2)) + ' Ω</b>, phase of Z = <b>' + e11n(-deg, 0) + '°</b>, so Z′ = ' + e11n(z.re, 2) + ' Ω and Z″ = ' + e11n(z.im, 2) + ' Ω.';
      place();
    }
    function pick(m) { var bt = fig.querySelector('button[data-mode="' + m + '"]'); if (bt) bt.click(); }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'Impedance spectroscopy applies a small sine, here a voltage of amplitude V₀ = 10 mV, and records the current that answers. In a linear system the current is a sine of the same frequency; only its size and its timing differ. Two numbers say how: |Z| = V₀/I₀ and the phase shift φ. Together they make one complex number, Z = Z′ + jZ″.' },
      { text: 'A <b>resistor</b>: the current is in phase with the voltage and |Z| = R at every frequency. Current against voltage, the <b>Lissajous plot</b> on the right, is a straight diagonal line.', on: function () { pick('R'); } },
      { text: 'A <b>capacitor</b>: the current leads the voltage by 90°, and |Z| = 1/(ωC) falls as the frequency rises (ω = 2πf). With both axes scaled to their amplitudes, the Lissajous plot is a circle. Slide the frequency.', on: function () { pick('C'); } },
      { text: 'An <b>inductor</b>, such as a long cable: the current lags by 90°, and |Z| = ωL grows with frequency.', on: function () { pick('L'); } },
      { text: 'A resistor and a capacitor in parallel, the building block of an interface: at low frequency the current goes through R, at high frequency through C, and in between it shares, with a phase between 0 and 90°. Analyzers draw the Lissajous plot live: a distorted shape means the response is not linear; a shape that drifts means the cell is changing during the measurement.', on: function () { pick('RC'); } }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; th += dt * Math.PI; place(); }, { autoplay: true, stepDt: 0.25 });
    bind(fig, loop);
  });

  /* ===== 11.9 One spectrum, two pictures ===== */
  register('f11-9', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.tratio'), sv = fig.querySelector('.tratio-val'), cbS = fig.querySelector('.stretch');
    var R0 = 10, R1 = 20, R2 = 20, tau2 = 1e-4, fs = M11.freqs(1e5, 0.1, 30);
    var b = { x0: 50, y0: 250, x1: 270, y1: 50 }, gN = el('g', {}, g), gB = el('g', {}, g);
    txt(g, b.x0, 14, 'Nyquist plot', 'strong', 'start'); txt(g, 330, 14, 'Bode plot', 'strong', 'start');
    var ba = { x0: 330, y0: 128, x1: 492, y1: 46 }, bp = { x0: 330, y0: 250, x1: 492, y1: 164 };
    var XB = function (f) { return e11log(f, -1, 5, ba.x0, ba.x1); }, YA = function (m) { return e11log(m, 0, 2, ba.y0, ba.y1); }, YP = function (d) { return bp.y0 - d / 60 * (bp.y0 - bp.y1); };
    e11axes(g, ba, { X: XB, Y: YA, xt: [[0.1, ''], [10, ''], [1000, ''], [1e5, '']], yt: [[1, '1'], [10, '10'], [100, '100']], grid: true, ylab: '|Z|, Ω (log)' });
    e11axes(g, bp, { X: XB, Y: YP, xt: [[0.1, '0.1'], [10, '10'], [1000, '1 k'], [1e5, '100 k']], yt: [[0, '0'], [30, '30'], [60, '60']], grid: true, xlab: 'frequency, Hz (log)', ylab: '−phase, degrees' });
    var pA = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.2 }, g), pP = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.2 }, g);
    var dA = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g), dP = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var pN = null, dN = null, F = null, zs = [], tau1 = 1e-2, fi = 0, tops = [];
    badge(g, b.x0 + 24, b.y1 + 14, 1); badge(g, ba.x1 - 12, ba.y1 + 12, 2); badge(g, bp.x1 - 12, bp.y1 + 12, 3);
    function Z(f, t1) { var w = 2 * Math.PI * f; return M11.add(M11.zR(R0), M11.parallel(M11.zR(R1), M11.zC(t1 / R1, w)), M11.parallel(M11.zR(R2), M11.zC(tau2 / R2, w))); }
    function render() {
      var lr = +sl.value, ratio = Math.pow(10, lr); tau1 = tau2 * ratio; setSvgText(sv, ratio < 10 ? ratio.toFixed(1) : Math.round(ratio) + '');
      zs = fs.map(function (f) { return Z(f, tau1); });
      clear(gN);
      var st = cbS.checked ? 2 : 1;
      F = e11nyq(gN, b, [0, 55], 0, { xt: [[0, '0'], [10, '10'], [30, '30'], [50, '50']], yt: [[0, '0'], [10, '10'], [20, '20'], [30, '30'], [40, '40'], [50, '50']], xlab: 'Z′, Ω', ylab: '−Z″, Ω' });
      if (st > 1) { clear(gN); var k = (b.x1 - b.x0) / 55; F = { X: function (v) { return b.x0 + v * k; }, Y: function (v) { return b.y0 - v * k * st; }, k: k }; e11axes(gN, b, { X: F.X, Y: F.Y, xt: [[0, '0'], [10, '10'], [30, '30'], [50, '50']], yt: [[0, '0'], [5, '5'], [10, '10'], [15, '15'], [20, '20']], xlab: 'Z′, Ω', ylab: '−Z″, Ω (stretched ×2)' }); }
      el('path', { d: e11d(zs.map(function (z) { return [F.X(z.re), F.Y(-z.im)]; })), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, gN);
      [tau1, tau2].forEach(function (t, i) { var fT = 1 / (2 * Math.PI * t), z = Z(fT, tau1); el('circle', { cx: F.X(z.re), cy: F.Y(-z.im), r: 3.5, fill: 'var(--cyan)' }, gN); if (lr >= 1) txt(gN, F.X(z.re), F.Y(-z.im) - 10, e11Hz(fT), 'cyan', 'middle'); });
      txt(gN, b.x0 + 8, b.y0 + 32, 'high f ←', '', 'start');
      dN = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, gN);
      pA.setAttribute('d', e11d(fs.map(function (f, i) { return [XB(f), YA(M11.abs(zs[i]))]; })));
      pP.setAttribute('d', e11d(fs.map(function (f, i) { return [XB(f), YP(-e11deg(zs[i]))]; })));
      place();
    }
    function place() {
      var i = Math.min(fs.length - 1, Math.floor(fi)), z = zs[i], f = fs[i];
      dN.setAttribute('cx', F.X(z.re)); dN.setAttribute('cy', F.Y(-z.im));
      dA.setAttribute('cx', XB(f)); dA.setAttribute('cy', YA(M11.abs(z))); dP.setAttribute('cx', XB(f)); dP.setAttribute('cy', YP(-e11deg(z)));
      var ratio = tau1 / tau2;
      read.innerHTML = 'f = <b>' + e11Hz(f) + '</b>: Z′ = ' + z.re.toFixed(1) + ' Ω, −Z″ = ' + e11n(-z.im) + ' Ω, |Z| = ' + M11.abs(z).toFixed(1) + ' Ω, phase ' + e11n(e11deg(z), 0) + '°. τ₁/τ₂ = <b>' + (ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)) + '</b>: ' + (ratio >= 100 ? 'two separate arcs and two phase peaks.' : ratio < 1.5 ? 'the two arcs have merged into one; nothing in the plot says there are two processes.' : 'the arcs overlap; they are poorly resolved below a ratio of about 100.');
    }
    on(sl, 'input', render); on(cbS, 'change', render);
    steps(fig, [
      { text: 'The <b>Nyquist plot</b> draws each frequency as one point: Z′ to the right, −Z″ upward, high frequencies on the left. A resistor in parallel with a capacitor draws a semicircle; its diameter is R and its top sits at ω = 1/(RC). Here the arcs start at R₀ = 10 Ω and end at R₀ + R₁ + R₂ = 50 Ω. What the plot does not show is the frequency of each point: follow the dot.' },
      { text: 'The <b>Bode plot</b> shows the same data against frequency: |Z| and the phase, both on a logarithmic frequency axis, so the frequency of every point can be read and decades of frequency are equally clear.' },
      { text: 'Two processes with time constants τ₁ = R₁C₁ and τ₂ = R₂C₂ give two arcs only when the time constants are far apart: about a factor of 100 or more. Slide the ratio down: the arcs merge, and at equal τ a single semicircle remains. The phase plot shows two peaks for as long as it can.' },
      { text: 'One rule for Nyquist plots: both axes on the same scale. Tick “stretch” to zoom the vertical axis twice, a common mistake: the arcs look round and tall when they are not.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; fi += dt * 30; if (fi >= fs.length) fi = 0; place(); }, { autoplay: true, stepDt: 0.25 });
    bind(fig, loop);
  });

  /* ===== 11.10 A commercial cell, one element at a time ===== */
  register('f11-10', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var C = M11.CELL, fs = M11.freqs(5000, 3e-3, 12), stage = 4;
    var parts = [
      { lab: 'L', w: 34 }, { lab: 'R₀', w: 40 }, { lab: 'R_SEI ‖ Q_SEI', w: 104 }, { lab: 'R_ct ‖ C_dl', w: 86 }, { lab: 'Z_d (sphere)', w: 96 }
    ], x = 22, boxes = [];
    parts.forEach(function (p, i) { if (i) { el('line', { x1: x - 14, x2: x, y1: 30, y2: 30, stroke: 'var(--line-2)' }, g); } boxes.push(e11box(g, x, 30, p.w, p.lab, 'strong')); x += p.w + 14; });
    txt(g, 22, 58, 'Z_d sits in series with R_ct, both in parallel with C_dl (the Randles arrangement)', '', 'start');
    var b = { x0: 60, y0: 352, x1: 470, y1: 80 }, F = e11nyq(g, b, [18, 59], -6, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[-5, '−5'], [0, '0'], [10, '10'], [20, '20']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var bands = [[5000, 1000, 'kHz', 'var(--cyan)'], [1000, 1, 'Hz', 'var(--amber)'], [1, 3e-3, 'mHz', '#C4B5F7']];
    function Zs(f, st) { var w = 2 * Math.PI * f, z = M11.add(M11.zL(C.L, w), M11.zR(C.R0)); if (st >= 1) z = M11.add(z, M11.zRQ(C.Rsei, C.Qsei, C.nsei, w)); if (st === 2) z = M11.add(z, M11.parallel(M11.zR(C.Rct), M11.zC(C.Cdl, w))); if (st >= 3) z = M11.add(z, M11.parallel(M11.zC(C.Cdl, w), M11.add(M11.zR(C.Rct), M11.zSphere(C.Rd, C.Cd, w)))); return z; }
    var full = fs.map(function (f) { return M11.cellZ(C, 2 * Math.PI * f); });
    el('path', { d: e11zpath(full, F, b, 1000), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.2, 'stroke-opacity': '.3' }, g);
    var bandG = el('g', {}, g), path = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.6 }, g), decs = el('g', {}, g);
    var dot = el('circle', { r: 5.5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    badge(g, F.X(20) + 16, F.Y(-4), 1); badge(g, F.X(22.5), F.Y(5), 2); badge(g, F.X(28.3), F.Y(9.5), 3); badge(g, F.X(44), F.Y(18), 4);
    var zs = [], fi = 0;
    function render(st) {
      stage = st; zs = fs.map(function (f) { return Zs(f, st >= 4 ? 3 : st); });
      path.setAttribute('d', e11zpath(zs, F, b, 1000));
      boxes.forEach(function (r, i) { e11lit(r, i <= st, i === 0 ? 'var(--cyan)' : 'var(--amber)'); });
      clear(decs); clear(bandG);
      var placed = [];
      [1000, 100, 10, 1, 0.1, 0.01].forEach(function (f) { var z = Zs(f, st >= 4 ? 3 : st), px = F.X(z.re * 1000), py = F.Y(-z.im * 1000); if (py < b.y1) return; el('circle', { cx: px, cy: py, r: 3, fill: 'var(--cyan)' }, decs); var lx = px + 8, ly = py + (f >= 100 ? 18 : -10); if (placed.some(function (q) { return Math.abs(q[0] - lx) < 56 && Math.abs(q[1] - ly) < 18; })) return; placed.push([lx, ly]); txt(decs, lx, ly, e11Hz(f), 'cyan', 'start'); });
      if (st >= 4) bands.forEach(function (bd) { var zA = Zs(bd[0], 3), zB = Zs(bd[1], 3), xA = F.X(zA.re * 1000), xB = Math.min(b.x1, F.X(zB.re * 1000)); el('rect', { x: xA, y: b.y1, width: xB - xA, height: b.y0 - b.y1, fill: bd[3], 'fill-opacity': '.07' }, bandG); txt(bandG, (xA + xB) / 2, b.y1 + 14, bd[2], 'strong', 'middle'); });
      place();
    }
    function place() {
      var i = Math.min(fs.length - 1, Math.floor(fi)), z = zs[i], f = fs[i], py = F.Y(-z.im * 1000);
      dot.style.display = py < b.y1 ? 'none' : ''; dot.setAttribute('cx', F.X(z.re * 1000)); dot.setAttribute('cy', py);
      var what = f > 1000 ? 'the cables and windings (inductance) and the ohmic resistance' : f > 50 ? 'the SEI arc' : f > 1 ? 'charge transfer with the double layer' : 'diffusion of lithium inside the particles';
      read.innerHTML = 'f = <b>' + e11Hz(f) + '</b>: Z′ = ' + (z.re * 1000).toFixed(1) + ' mΩ, −Z″ = ' + e11n(-z.im * 1000) + ' mΩ. ' + (stage >= 4 ? 'This range is dominated by <b>' + what + '</b>.' : '');
    }
    steps(fig, [
      { text: 'Start at the highest frequencies. The cables and the cell windings act as an <b>inductance</b>, so the spectrum begins below the axis. Where it crosses the axis, the <b>ohmic resistance</b> is read: electrolyte, active material, current collectors and contacts together. A commercial cell has tens of milliohms, not ohms.', on: function () { render(0); } },
      { text: 'Add the <b>SEI</b>: lithium crossing the surface film, in parallel with the film’s own capacitance, gives a first, small arc at a few hundred hertz. Real arcs are depressed, so a constant phase element Q stands in for the capacitor.', on: function () { render(1); } },
      { text: 'Add <b>charge transfer</b> in parallel with the double layer: a second, larger arc at a few hertz. In a real cell the arcs of the two electrodes and their SEI layers overlap; with only two terminals there is no telling them apart from this plot alone.', on: function () { render(2); } },
      { text: 'Add <b>solid diffusion</b> inside the particles: the tail at low frequency. It starts at 45° and bends upward, towards a vertical line, because each particle can hold only so much lithium.', on: function () { render(3); } },
      { text: 'The three frequency ranges of a real spectrum: <b>kHz</b> (inductance and ohmic), <b>Hz</b> (interfaces) and <b>mHz</b> (diffusion). An analyzer sweeps from high to low. With 12 frequencies per decade down to 3 mHz, a single period at each frequency adds up to ' + Math.round(fs.reduce(function (s, f) { return s + 1 / f; }, 0) / 60) + ' minutes, nearly all of it below 0.1 Hz; instruments average several periods per point, so a real sweep takes longer.', on: function () { render(4); } }
    ]);
    render(4);
    var loop = anim(fig, function (dt) { if (dt === 0) return; fi += dt * 12; if (fi >= fs.length) fi = 0; place(); }, { autoplay: true, stepDt: 0.25 });
    bind(fig, loop);
  });

  /* ===== 11.11 The shapes real cells draw ===== */
  register('f11-11', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sn = fig.querySelector('.nexp'), snv = fig.querySelector('.nexp-val'), sr = fig.querySelector('.rpor'), srv = fig.querySelector('.rpor-val');
    var ws = M11.freqs(1e5, 1e-5, 20).map(function (f) { return 2 * Math.PI * f; }), wsA = M11.freqs(1e9, 1e-9, 12).map(function (f) { return 2 * Math.PI * f; });
    var P = [
      { b: { x0: 40, y0: 210, x1: 240, y1: 70 }, t: 'A: constant phase element' },
      { b: { x0: 300, y0: 210, x1: 500, y1: 70 }, t: 'B: diffusion into a film' },
      { b: { x0: 40, y0: 430, x1: 240, y1: 290 }, t: 'C: film or sphere' },
      { b: { x0: 300, y0: 430, x1: 500, y1: 290 }, t: 'D: porous electrode' }
    ];
    txt(g, 260, 18, 'each panel: −Z″ up, Z′ across, both in mΩ on the same scale', '', 'middle');
    var Fs = P.map(function (p, i) { txt(g, p.b.x0, p.b.y1 - 22, p.t, 'strong', 'start'); badge(g, p.b.x1 - 10, p.b.y1 - 26, i + 1); return e11nyq(g, p.b, [0, 15], 0, { xt: [[0, '0'], [5, '5'], [10, '10'], [15, '15']], yt: [[0, '0'], [5, '5'], [10, '10']] }); });
    function draw(gr, zs, F, b, col, w, dash) { return el('path', { d: e11zpath(zs, F, b, 1000), fill: 'none', stroke: col, 'stroke-width': w || 2.2, 'stroke-dasharray': dash || null }, gr); }
    var gA = el('g', {}, g), gD = el('g', {}, g), R = 0.010;
    // A: R || CPE against R || C
    draw(g, ws.map(function (w) { return M11.zRQ(R, 1, 1, w); }), Fs[0], P[0].b, 'var(--text)', 1.2, '4 4');
    // B: semi-infinite, transmissive (tanh), reflective (coth); Rd = 10 mOhm, B = 1 s^1/2
    var B = Math.sqrt(1), Y0 = B / R;
    draw(g, ws.map(function (w) { return M11.zQ(Y0, 0.5, w); }), Fs[1], P[1].b, 'var(--text)', 1.2, '4 4');
    draw(g, ws.map(function (w) { return M11.zFiniteT(Y0, B, w); }), Fs[1], P[1].b, 'var(--cyan)');
    draw(g, ws.map(function (w) { return M11.zFiniteR(Y0, B, w); }), Fs[1], P[1].b, 'var(--amber)');
    txt(g, Fs[1].X(10.6), Fs[1].Y(1.2), 'open end', 'cyan', 'start'); txt(g, Fs[1].X(3.9), Fs[1].Y(8.6), 'closed end', 'amber', 'start'); txt(g, Fs[1].X(7.6), Fs[1].Y(4.6), '45°, endless', '', 'start');
    // C: Abbas eqs 9 and 6 with the same Rd and Cd: film (1D, coth) against sphere
    var Rd = 0.024, Cd = 1;
    draw(g, ws.map(function (w) { return M11.scale(M11.div(M11.ccoth(M11.csqrt(M11.cx(0, w * Rd * Cd))), M11.csqrt(M11.cx(0, w * Rd * Cd))), Rd); }), Fs[2], P[2].b, 'var(--amber)');
    draw(g, ws.map(function (w) { return M11.zSphere(Rd, Cd, w); }), Fs[2], P[2].b, 'var(--heat)');
    el('line', { x1: Fs[2].X(8), x2: Fs[2].X(8), y1: P[2].b.y0, y2: P[2].b.y1, stroke: 'var(--amber)', 'stroke-dasharray': '2 4', 'stroke-opacity': '.6' }, g); el('line', { x1: Fs[2].X(1.6), x2: Fs[2].X(1.6), y1: P[2].b.y0, y2: P[2].b.y1, stroke: 'var(--heat)', 'stroke-dasharray': '2 4', 'stroke-opacity': '.6' }, g);
    txt(g, Fs[2].X(8) + 4, Fs[2].Y(2), 'film: R_d/3', 'amber', 'start'); txt(g, Fs[2].X(1.6) + 6, Fs[2].Y(8.6), 'sphere: R_d/15', 'heat', 'start');
    function render() {
      var n = +sn.value, rp = +sr.value / 1000; setSvgText(snv, n.toFixed(2)); setSvgText(srv, (rp * 1000).toFixed(0) + ' mΩ');
      clear(gA); clear(gD);
      draw(gA, wsA.map(function (w) { return M11.zRQ(R, 1, n, w); }), Fs[0], P[0].b, 'var(--amber)', 2.4);
      var th = 90 * (1 - n); txt(gA, Fs[0].X(5), Fs[0].Y(0.9), n > 0.98 ? 'ideal semicircle' : 'sunk by ' + th.toFixed(0) + '°', 'amber', 'middle');
      // D: Bisquert line, Rct = 10 mOhm, Cdl = 1 F, plus the plain R || C it reduces to when Rm = 0
      draw(gD, ws.map(function (w) { return M11.parallel(M11.zR(R), M11.zC(1, w)); }), Fs[3], P[3].b, 'var(--text)', 1.2, '4 4');
      if (rp > 0) {
        draw(gD, ws.map(function (w) { return M11.zPorous(rp, R, 1, w); }), Fs[3], P[3].b, 'var(--cyan)', 2.4);
        var c = Math.sqrt(rp * R) / Math.tanh(Math.sqrt(rp / R)); el('circle', { cx: Fs[3].X(c * 1000), cy: P[3].b.y0, r: 3.5, fill: 'var(--cyan)' }, gD);
        txt(gD, Fs[3].X(0.3), Fs[3].Y(8.4), 'dot: the DC end', 'cyan', 'start');
      }
      read.innerHTML = 'A: n = <b>' + n.toFixed(2) + '</b>; n = 1 is a capacitor, n = 0.5 a Warburg line, n = 0 a resistor. D: pore resistance R<sub>m</sub> = <b>' + (rp * 1000).toFixed(0) + ' mΩ</b>' + (rp > 0 ? '; the arc starts with a 45° line and ends at √(R<sub>m</sub>R<sub>ct</sub>) coth √(R<sub>m</sub>/R<sub>ct</sub>) = ' + (Math.sqrt(rp * R) / Math.tanh(Math.sqrt(rp / R)) * 1000).toFixed(1) + ' mΩ (the dot), not at R<sub>ct</sub> = 10 mΩ.' : ': no pore resistance, the plain semicircle.');
    }
    on(sn, 'input', render); on(sr, 'input', render);
    steps(fig, [
      { text: '<b>Depressed arcs.</b> Real interfaces are not ideal capacitors. A constant phase element, Z = 1/(Y₀(jω)ⁿ), with n a little below 1 sinks the centre of the semicircle below the axis by 90°(1 − n). Its physical origin is still debated; treat n as a measure of non-ideality, not a fact about the surface.' },
      { text: '<b>Diffusion into a layer of finite thickness.</b> At high frequency the lithium does not reach the far side: the 45° Warburg line. Lower down it does. If the far side lets lithium through (open), the line bends back to the axis in an arc (tanh form); if it is closed, as at the back of an active particle, the line turns vertical, like a capacitor (coth form).' },
      { text: '<b>Particles are spheres.</b> With the same diffusion resistance R<sub>d</sub> and capacitance C<sub>d</sub>, a film turns vertical at R<sub>d</sub>/3 and a sphere at R<sub>d</sub>/15, and the sphere turns upward sooner. Fitting a film model to a cell of spheres misreads R<sub>d</sub>, and with it D = r²/(R<sub>d</sub>C<sub>d</sub>).' },
      { text: '<b>A porous electrode</b> is a ladder: electrolyte resistance down each pore, an interface on every grain. With pore resistance R<sub>m</sub> the arc starts with a 45° line at high frequency and grows wider. Slide R<sub>m</sub> to 0 and the plain semicircle returns.' }
    ]);
    render();
  });

  /* =================================================================
     Module 11, GITT (11.3 to 11.7). One titration step on a thin film
     (Kim et al. 2022, R67, eqs 3-16), the two straight-line assumptions
     and the dimensionless pulse length (Kang and Chueh 2021, R66, eq 5),
     six ways to compute D from one pulse (Nickol et al. 2020, R68, eqs
     10-12 and procedures P1-P6), the relaxation analysis on
     sqrt(t + tau) - sqrt(t) (R66 eq 4), and a whole run with
     quasi-equilibrium voltages, overpotentials and resistances (R67 eqs
     17-19; Abbas et al. 2025, R69). Physics in Physics.m11.
     ================================================================= */

  /* ===== 11.3 One titration step, inside and outside the film ===== */
  register('f11-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var Lm = 2e-6, D = 1e-15, T = Lm * Lm / D, tau = 600, tEnd = 4800, sim = M11.gittSlab({ tau: tau / T, tEnd: tEnd / T, N: 61, steps: 960, frames: 240 });
    var E1 = 3.900, IR = 0.015, k = 0.010 / (tau / T); // k: volts per unit of surface change, so that the settled step dEs is 10 mV
    function E(i) { var t = sim.t[i] * T; return E1 + (t < tau ? IR : 0) + k * sim.us[i]; }
    // film panel
    var fx0 = 58, fx1 = 210, fy0 = 64, fy1 = 236, c0y = 92, sc = 150;
    el('rect', { x: 20, y: fy0, width: fx0 - 20, height: fy1 - fy0, fill: 'var(--cyan)', 'fill-opacity': '.08' }, g);
    el('rect', { x: fx0, y: fy0, width: fx1 - fx0, height: fy1 - fy0, rx: 2, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    el('rect', { x: fx1, y: fy0, width: 12, height: fy1 - fy0, fill: 'var(--metal, #8a9aa0)', 'fill-opacity': '.7' }, g);
    txt(g, 39, fy0 - 8, 'electrolyte', '', 'middle'); txt(g, (fx0 + fx1) / 2, fy0 - 28, 'active film, 2 µm', 'strong', 'middle'); txt(g, (fx0 + fx1) / 2, fy0 - 8, 'lithium content', '', 'middle');
    txt(g, fx0 + 2, fy1 + 16, 'surface', '', 'start'); txt(g, fx1 + 12, fy1 + 16, 'back, no flux', '', 'end');
    el('line', { x1: fx0, x2: fx1, y1: c0y, y2: c0y, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
    var prof = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    var flux = arrow(g, fx0 - 4, 150, 26, 150, '#F0B441', 2, 'force-arrow');
    var ion = ourIon(g, fx0 - 6, 176, 5, 'our ion', true);
    // voltage panel
    var b = { x0: 286, y0: 214, x1: 488, y1: 44 }, vlo = 3.890, vhi = 3.950;
    var X = function (t) { return b.x0 + t / tEnd * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - (v - vlo) / (vhi - vlo) * (b.y0 - b.y1); };
    e11axes(g, b, { X: X, Y: Y, xt: [[0, '0'], [600, '10'], [1800, '30'], [3600, '60'], [4800, '80 min']], yt: [[3.90, '3.90'], [3.92, '3.92'], [3.94, '3.94']], grid: true, ylab: 'cell voltage, V' });
    var bc = { y0: 262, y1: 236 }, IY = function (on) { return on ? bc.y1 : bc.y0; };
    el('line', { x1: b.x0, x2: b.x1, y1: bc.y0, y2: bc.y0, stroke: 'var(--line-2)' }, g); txt(g, b.x0 - 7, bc.y1 + 4, 'I', 'cyan', 'end'); txt(g, b.x0 - 7, bc.y0 + 4, '0', '', 'end');
    el('path', { d: 'M' + b.x0 + ',' + bc.y0 + ' V' + bc.y1 + ' H' + X(tau) + ' V' + bc.y0 + ' H' + b.x1, fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.8 }, g);
    var vfull = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.2, 'stroke-opacity': '.25' }, g), vpath = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    var all = sim.t.map(function (t, i) { return [X(t * T), Y(E(i))]; }); vfull.setAttribute('d', e11d(all));
    var iEnd = sim.t.findIndex(function (t) { return t * T >= tau; }) - 1, E2 = E1 + IR + k * sim.us[1] * 0, E3 = E(iEnd), E4 = E(sim.t.length - 1);
    // E markers and brackets
    var mk = el('g', {}, g);
    [[0, E1, 'E₁', 'start', 7, 16], [0, E1 + IR, 'E₂', 'start', 7, -6], [tau, E3, 'E₃', 'start', 6, -6], [tEnd, E4, 'E₄', 'end', -6, -6]].forEach(function (m) { el('circle', { cx: X(m[0]), cy: Y(m[1]), r: 3, fill: 'var(--text)' }, mk); txt(mk, X(m[0]) + m[4], Y(m[1]) + m[5], m[2], 'strong', m[3]); });
    el('path', { d: 'M' + (X(tau) + 26) + ',' + Y(E1 + IR) + ' h6 V' + Y(E3) + ' h-6', fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.6 }, mk); txt(mk, X(tau) + 36, (Y(E1 + IR) + Y(E3)) / 2 + 4, 'ΔEₜ', 'heat', 'start');
    el('path', { d: 'M' + (X(tEnd) - 30) + ',' + Y(E1) + ' h6 V' + Y(E4) + ' h-6', fill: 'none', stroke: '#C4B5F7', 'stroke-width': 1.6 }, mk); var tes = txt(mk, X(tEnd) - 34, (Y(E1) + Y(E4)) / 2 + 4, 'ΔEₛ', '', 'end'); tes.style.fill = '#C4B5F7';
    el('line', { x1: X(0), x2: X(tEnd), y1: Y(E1), y2: Y(E1), stroke: 'var(--line-2)', 'stroke-dasharray': '2 4' }, mk);
    var cur = el('line', { y1: b.y1, y2: bc.y0, stroke: 'var(--text)', 'stroke-dasharray': '3 3', 'stroke-opacity': '.6' }, g);
    badge(g, fx0 + 16, c0y + 26, 1); badge(g, X(tau / 2), bc.y1 + 13, 2); badge(g, X(2400), Y(E4) - 22, 3); badge(g, X(tau) + 84, (Y(E1 + IR) + Y(E3)) / 2, 4);
    var dEs = E4 - E1, dEt = E3 - (E1 + IR), Dwh = 4 / (Math.PI * tau) * Lm * Lm * (dEs / dEt) * (dEs / dEt);
    var fi = 0, ion0 = 0;
    function place(t) {
      var i = Math.min(sim.t.length - 1, Math.round(t / tEnd * (sim.t.length - 1))), fr = sim.frames[Math.min(sim.frames.length - 1, Math.round(t / tEnd * (sim.frames.length - 1)))], u = fr.u, pts = [];
      for (var j = 0; j < u.length; j++) pts.push([fx0 + j / (u.length - 1) * (fx1 - fx0), c0y + u[j] * sc]);
      prof.setAttribute('d', e11d(pts));
      vpath.setAttribute('d', e11d(all.slice(0, i + 1)));
      cur.setAttribute('x1', X(t)); cur.setAttribute('x2', X(t));
      var onI = t > 0 && t <= tau; flux.style.display = onI ? '' : 'none'; ion.g.style.display = onI ? '' : 'none';
      var depl = (u[0] - u[u.length - 1]) / (u[u.length - 1] + 1e-9);
      read.innerHTML = (t <= 0 ? '<b>Before the pulse</b>: the film is in equilibrium, the same lithium content everywhere, at voltage E₁. ' : onI ? '<b>Current on</b> (' + e11time(t) + ' of a 10 min pulse): lithium leaves through the surface faster than it arrives from inside, so the surface runs ahead of the interior and the voltage rises with it. '
        : t < tau + 120 ? '<b>Current off</b>: the IR step disappears at once; the lithium left inside now spreads out and the profile flattens. '
          : '<b>Resting</b> (' + e11time(t - tau) + ' after the pulse): the profile is ' + (Math.abs(u[0] - u[u.length - 1]) < 0.01 ? 'flat again: the film is back in equilibrium at a slightly lower lithium content. ' : 'still flattening. '))
        + 'From this step: ΔEₛ = ' + (dEs * 1000).toFixed(1) + ' mV, ΔEₜ = ' + (dEt * 1000).toFixed(1) + ' mV, so the Weppner–Huggins formula gives D = <b>' + sci(Dwh * 1e4, 2) + ' cm²/s</b>; the film in the model has ' + sci(D * 1e4, 1) + ' cm²/s.';
    }
    var t = 0;
    steps(fig, [
      { text: 'Before the pulse the film is in equilibrium: the same lithium content everywhere (dashed line), voltage E₁. GITT starts from rest, every time.', on: function () { if (!(loop && loop.running())) { t = 0; place(t); } } },
      { text: 'Switch on a small constant current for a short time τ (here 10 min). The voltage jumps by the IR drop, E₁ → E₂, then climbs as lithium is pulled from the surface faster than diffusion refills it (E₂ → E₃). Lithium flux in or out at the surface is the cause.', on: function () { if (!(loop && loop.running())) { t = tau; place(t); } } },
      { text: 'Switch off. The IR drop vanishes at once, and the depleted surface is refilled from inside: the profile flattens and the voltage relaxes to E₄, a new equilibrium a little above E₁.', on: function () { if (!(loop && loop.running())) { t = tEnd; place(t); } } },
      { text: 'Two numbers come out. ΔEₛ = E₄ − E₁ is a step along the equilibrium (open-circuit) curve; ΔEₜ = E₃ − E₂ is how far the surface ran ahead during the pulse. The slower the diffusion, the larger ΔEₜ is compared with ΔEₛ. Their ratio, the pulse length and the sample size give D.', on: function () { if (!(loop && loop.running())) { t = tEnd; place(t); } } }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; var sp = t < tau + 300 ? 160 : 900; t += dt * sp; if (t > tEnd) t = 0; place(t); var s = (Date.now() / 900) % 1; ion.move(fx0 - 6 - s * 26, 176); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) t = tau; place(t);
    bind(fig, loop);
  });

  /* ===== 11.4 Two straight lines, one number: when the formula holds ===== */
  register('f11-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.ptau'), sv = fig.querySelector('.ptau-val');
    var Lm = 2e-6, D = 1e-15, T = Lm * Lm / D, geo = e11modes(fig, function (m) { geo = m; render(); });
    function surf(th) { return geo === 'sphere' ? M11.sphereF(th) : M11.slabSurface(th); }
    function ratio(th) { var f = surf(th), mean = geo === 'sphere' ? 3 * th : th, Lf = geo === 'sphere' ? 1 / 3 : 1; return 4 / (Math.PI * th) * Lf * Lf * (mean / f) * (mean / f); }
    // left: E - E2 against sqrt(t)
    var a = { x0: 60, y0: 230, x1: 236, y1: 44 }, r = { x0: 300, y0: 230, x1: 505, y1: 44 };
    var gl = el('g', {}, g), gr = el('g', {}, g);
    var curve = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, gl), ideal = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }, gl), axl = el('g', {}, gl);
    // right: D(Weppner-Huggins)/D against tau_hat
    var XR = function (th) { return e11log(th, -3, 0, r.x0, r.x1); }, YR = function (q) { return r.y0 - q / 1.2 * (r.y0 - r.y1); };
    e11axes(gr, r, { X: XR, Y: YR, xt: [[0.001, '0.001'], [0.01, '0.01'], [0.1, '0.1'], [1, '1']], yt: [[0, ''], [0.5, '0.5'], [1, '1']], grid: true, xlab: 'D τ / L² (dimensionless pulse)', ylab: 'D from the formula ÷ true D' });
    var cP = [], cS = []; for (var k = 0; k <= 90; k++) { var th = Math.pow(10, -3 + 3 * k / 90); var f1 = M11.slabSurface(th), f3 = M11.sphereF(th); cP.push([XR(th), YR(4 / (Math.PI * th) * (th / f1) * (th / f1))]); cS.push([XR(th), YR(4 / (Math.PI * th) * (1 / 9) * (3 * th / f3) * (3 * th / f3))]); }
    el('path', { d: e11d(cP), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2 }, gr); el('path', { d: e11d(cS), fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2 }, gr);
    txt(gr, XR(0.0012), YR(1) - 8, 'planar film', 'cyan', 'start'); txt(gr, XR(0.0012), YR(0.86) + 18, 'sphere', 'heat', 'start');
    [[0.25, 'cyan'], [0.025, 'heat']].forEach(function (q) { el('line', { x1: XR(q[0]), x2: XR(q[0]), y1: r.y1, y2: r.y0, stroke: q[1] === 'cyan' ? 'var(--cyan)' : 'var(--heat)', 'stroke-dasharray': '3 4', 'stroke-opacity': '.7' }, gr); });
    txt(gr, XR(0.25) - 4, YR(0.2), 'film limit', 'cyan', 'end'); txt(gr, XR(0.025) - 4, YR(0.1), 'sphere limit', 'heat', 'end');
    var mark = el('circle', { r: 6, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, gr);
    badge(g, a.x0 + 30, a.y1 + 22, 1); badge(g, a.x1 - 12, a.y1 + 50, 2); badge(g, XR(0.25) + 16, YR(1.1), 3);
    function render() {
      var tmin = +sl.value, tau = tmin * 60, th = tau / T, f = surf(th), q = ratio(th); setSvgText(sv, tmin + ' min');
      clear(axl);
      var smax = Math.sqrt(tau), ymax = Math.max(f, 2 * Math.sqrt(th / Math.PI)) * 1.1, X = function (s) { return a.x0 + s / smax * (a.x1 - a.x0); }, Y = function (u) { return a.y0 - u / ymax * (a.y0 - a.y1); };
      e11axes(axl, a, { X: X, Y: Y, xt: [[0, '0'], [smax, Math.round(smax) + '']], yt: [[0, '0']], xlab: '√t, √s', ylab: 'E − E₂ (diffusion part)' });
      var pts = [], idl = []; for (var j = 0; j <= 60; j++) { var s = smax * j / 60, tt = s * s / T; pts.push([X(s), Y(surf(tt))]); idl.push([X(s), Y(2 * Math.sqrt(tt / Math.PI))]); }
      curve.setAttribute('d', e11d(pts)); ideal.setAttribute('d', e11d(idl));
      mark.setAttribute('cx', XR(Math.min(1, Math.max(1e-3, th)))); mark.setAttribute('cy', YR(Math.min(1.2, q)));
      var lim = geo === 'sphere' ? 0.025 : 0.25;
      read.innerHTML = 'A ' + tmin + ' min pulse on a ' + (geo === 'sphere' ? 'particle of radius 2 µm' : 'film 2 µm thick') + ' with D = 1 × 10⁻¹¹ cm²/s: Dτ/L² = <b>' + th.toFixed(3) + '</b>. The formula returns <b>' + q.toFixed(2) + ' × the true D</b>' + (th <= lim ? ', inside the safe range (below ' + lim + ').' : ': the pulse is too long. Lithium has felt the far side of the ' + (geo === 'sphere' ? 'particle' : 'film') + ', the voltage no longer climbs as √t, and D comes out too small.');
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'The formula rests on two straight lines. First: during a short pulse the diffusion part of the voltage grows as <b>√t</b> (dashed line), because only a thin layer near the surface has been disturbed.' },
      { text: 'Second: the step ΔEₛ is small enough that the equilibrium curve is straight over it. When both hold, ΔEₛ/ΔEₜ, the pulse length τ and the sample size give D. Lengthen the pulse and watch the amber curve leave the dashed √t line.' },
      { text: 'How long is “short”? The number that decides is Dτ/L², the pulse length in units of the time diffusion needs to cross the sample. The recommended limit is below 0.25 for a flat film and ten times less for spheres; most published GITT studies use longer pulses than that.' }
    ]);
    render();
  });

  /* ===== 11.5 Six recipes, one pulse ===== */
  register('f11-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.tdl'), sv = fig.querySelector('.tdl-val'), cb = fig.querySelector('.rctfall');
    var rP = 5e-6, D = 1e-15, tp = 1800, Tsc = rP * rP / D, thp = tp / Tsc, dEs = 0.010, Kd = dEs / (3 * thp), etaO = 0.005, etaC = 0.020;
    var radius = e11modes(fig, function (m) { radius = m; render(); });
    var tdl = 1, fall = false;
    function E(t) { // the measured potential, relative to E0, in volts
      var th = t / Tsc;
      if (t <= tp) { var rf = fall ? 1 - 0.4 * t / tp : 1; return etaO + etaC * rf * (1 - Math.exp(-t / tdl)) + Kd * M11.sphereF(th); }
      var rfe = fall ? 0.6 : 1, ctEnd = etaC * rfe * (1 - Math.exp(-tp / tdl));
      return ctEnd * Math.exp(-(t - tp) / tdl) + Kd * M11.sphereSurface(th, thp);
    }
    function linfit(xs, ys) { var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0; for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; } var m = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { m: m, c: (sy - m * sx) / n, sse: ys.reduce(function (s, y, i) { var e = y - (m * xs[i] + (sy - m * sx) / n); return s + e * e; }, 0) }; }
    function fitFull(t0) { // P5/P6: fit E = a + (Kd D/D') f(D' t/r^2) for t in [t0, tp]
      var ts = []; for (var t = Math.max(1, t0); t <= tp; t += 5) ts.push(t); var ys = ts.map(E);
      function sse(l) { var Dp = Math.pow(10, l), amp = Kd * D / Dp, fx = ts.map(function (t) { return amp * M11.sphereF(Dp * t / (rP * rP)); }), a = 0; for (var i = 0; i < ts.length; i++) a += ys[i] - fx[i]; a /= ts.length; var s = 0; for (i = 0; i < ts.length; i++) { var e = ys[i] - fx[i] - a; s += e * e; } return s; }
      var lo = -18, hi = -12, gr = 0.618; for (var it = 0; it < 60; it++) { var m1 = hi - gr * (hi - lo), m2 = lo + gr * (hi - lo); if (sse(m1) < sse(m2)) hi = m2; else lo = m1; } return Math.pow(10, (lo + hi) / 2);
    }
    // top: E - E0 against sqrt(t)
    var a = { x0: 60, y0: 196, x1: 500, y1: 42 }, smax = Math.sqrt(tp), ymax = 0.06;
    var X = function (s) { return a.x0 + s / smax * (a.x1 - a.x0); }, Y = function (v) { return a.y0 - v / ymax * (a.y0 - a.y1); };
    el('rect', { x: X(0), y: a.y1, width: X(Math.sqrt(360)) - X(0), height: a.y0 - a.y1, fill: 'var(--cyan)', 'fill-opacity': '.06' }, g);
    e11axes(g, a, { X: X, Y: Y, xt: [[0, '0'], [Math.sqrt(360), '√360'], [Math.sqrt(900), '√900'], [Math.sqrt(1800), '√1800']], yt: [[0, '0'], [0.02, '20'], [0.04, '40'], [0.06, '60']], grid: true, xlab: '√t, with t in s', ylab: 'E − E₀ during the pulse, mV' });
    txt(g, X(Math.sqrt(360)) - 4, a.y1 + 14, 'first 360 s', 'cyan', 'end');
    var cE = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), l3 = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g), l4a = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.3, 'stroke-opacity': '.6' }, g), l4b = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2 }, g);
    var e1 = el('circle', { r: 4, fill: 'var(--text)' }, g), e1t = txt(g, 0, 0, 'E₁ (5 s)', 'strong', 'start');
    // bottom: bars on a log axis
    var bb = { x0: 70, y0: 414, x1: 500, y1: 266 }, YB = function (q) { return bb.y0 - (Math.log10(q) + 4) / 5 * (bb.y0 - bb.y1); };
    e11axes(g, bb, { X: function (x) { return x; }, Y: YB, yt: [[1e-4, '10⁻⁴'], [1e-3, '10⁻³'], [0.01, '0.01'], [0.1, '0.1'], [1, '1'], [10, '10']], grid: true, ylab: 'D from the recipe ÷ true D' });
    el('line', { x1: bb.x0, x2: bb.x1, y1: YB(1), y2: YB(1), stroke: 'var(--text)', 'stroke-width': 1.4 }, g);
    var names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], bars = names.map(function (n, i) { var x = bb.x0 + 14 + i * 70; txt(g, x + 22, bb.y0 + 16, n, 'strong', 'middle'); return { r: el('rect', { x: x, width: 44, fill: i === 3 || i === 5 ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': '.8' }, g), t: txt(g, x + 22, 0, '', '', 'middle') }; });
    badge(g, X(Math.sqrt(5)) + 14, Y(E(5)) - 30, 1); badge(g, X(Math.sqrt(200)), a.y1 + 30, 2); badge(g, bb.x1 - 12, YB(1) - 14, 3);
    function render() {
      tdl = Math.pow(10, +sl.value); fall = cb.checked; setSvgText(sv, tdl < 1 ? tdl.toFixed(1) + ' s' : Math.round(tdl) + ' s');
      var pts = []; for (var k = 0; k <= 160; k++) { var s = smax * k / 160; pts.push([X(s), Y(E(Math.min(tp, s * s)))]); } cE.setAttribute('d', e11d(pts));
      var E4 = E(tp + 14400), E1 = E(5), E2 = E(tp), E3 = E(tp + 5);
      e1.setAttribute('cx', X(Math.sqrt(5))); e1.setAttribute('cy', Y(E1)); e1t.setAttribute('x', X(Math.sqrt(5)) + 8); e1t.setAttribute('y', Y(E1) + 16);
      var c = 4 / (9 * Math.PI) * rP * rP / tp, est = [];
      est.push(c * Math.pow(E4 / (E2 - E1), 2)); // P1, Nickol eq 11
      est.push(c * Math.pow(E4 / (E3), 2)); // P2, eq 12 (E0 = 0)
      var xs = [], ys = []; for (var t = 1; t <= 360; t += 1) { xs.push(Math.sqrt(t)); ys.push(E(t)); }
      var f3 = linfit(xs, ys); est.push(4 / (9 * Math.PI) * Math.pow(rP / tp * E4 / f3.m, 2)); // P3, eq 10
      var best = null; for (var kb = 5; kb < xs.length - 20; kb += 2) { var A = linfit(xs.slice(0, kb), ys.slice(0, kb)), B = linfit(xs.slice(kb), ys.slice(kb)); if (!best || A.sse + B.sse < best.s) best = { s: A.sse + B.sse, k: kb, A: A, B: B }; }
      est.push(4 / (9 * Math.PI) * Math.pow(rP / tp * E4 / best.B.m, 2)); // P4, two-line fit
      var tTR = xs[best.k] * xs[best.k];
      est.push(fitFull(1)); est.push(fitFull(tTR)); // P5, P6
      l3.setAttribute('d', e11d([[X(0), Y(f3.c)], [X(Math.sqrt(900)), Y(f3.c + f3.m * Math.sqrt(900))]]));
      l4a.setAttribute('d', e11d([[X(0), Y(best.A.c)], [X(xs[best.k]), Y(best.A.c + best.A.m * xs[best.k])]]));
      l4b.setAttribute('d', e11d([[X(xs[best.k] * 0.6), Y(best.B.c + best.B.m * xs[best.k] * 0.6)], [X(Math.sqrt(900)), Y(best.B.c + best.B.m * Math.sqrt(900))]]));
      var sc = radius === 'primary' ? Math.pow(0.25 / 5, 2) : 1;
      est.forEach(function (d, i) { var q = Math.max(1.2e-4, Math.min(9, d / D * sc)), y = YB(q), y1 = YB(1); bars[i].r.setAttribute('y', Math.min(y, y1)); bars[i].r.setAttribute('height', Math.max(1.5, Math.abs(y1 - y))); bars[i].t.setAttribute('y', (q >= 1 ? y - 6 : y + 16)); setSvgText(bars[i].t, (d / D * sc) >= 0.1 ? (d / D * sc).toFixed(2) : sci(d / D * sc, 1)); });
      var lo = Math.min.apply(null, est), hi = Math.max.apply(null, est);
      read.innerHTML = 'One simulated pulse, six recipes. They span a factor of <b>' + (hi / lo).toFixed(1) + '</b>' + (radius === 'primary' ? ', and referring the same data to 0.25 µm primary particles instead of 5 µm secondary particles divides every value by <b>400</b> (D scales with r²).' : '. P4 and P6 (cyan) leave out the start of the pulse, where the double layer is still charging.') + (fall ? ' With the charge-transfer resistance falling during the pulse, the voltage climbs more slowly late in the pulse, and the full fits (P5, P6) overestimate D.' : '');
    }
    on(sl, 'input', render); on(cb, 'change', render);
    steps(fig, [
      { text: 'A GITT pulse on a positive electrode of 5 µm particles with D = 10⁻¹¹ cm²/s, simulated with the spherical diffusion solution. Before diffusion shows, the IR drop is the ohmic part, instant, plus the charge-transfer part, which arrives only as the double layer charges, with time constant τ<sub>dl</sub> = R<sub>ct</sub>C<sub>dl</sub>.' },
      { text: 'P1 and P2 need the IR drop, read 5 s after switching. P3 fits one straight line to E against √t over the first 360 s; P4 fits two and keeps the second, so the double-layer transition is left out. P5 fits the whole pulse with the spherical solution; P6 does the same after the transition. Slide τ<sub>dl</sub> from 1 s to 100 s, as when the cell is cold.' },
      { text: 'The truth is the line at 1. At warm temperatures (τ<sub>dl</sub> below 1 s) the recipes agree within a few times; when the double layer charges slowly they spread by more than ten. One study found exactly this on NMC523 and recommends P4 or P6 with τ<sub>dl</sub> measured by impedance, a three-electrode cell and a check with a second current.' }
    ]);
    render();
  });

  /* ===== 11.6 Read the rest, not the pulse ===== */
  register('f11-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.that'), sv = fig.querySelector('.that-val'), cR = fig.querySelector('.rfall'), cF = fig.querySelector('.fast');
    var a = { x0: 56, y0: 232, x1: 236, y1: 48 }, r = { x0: 312, y0: 232, x1: 505, y1: 48 };
    var gl = el('g', {}, g), gr = el('g', {}, g);
    txt(g, (a.x0 + a.x1) / 2, 20, 'during the pulse', 'strong', 'middle'); txt(g, (r.x0 + r.x1) / 2, 20, 'during the rest', 'strong', 'middle');
    badge(g, a.x0 + 22, a.y1 + 4, 1); badge(g, r.x0 + 0.45 * (r.x1 - r.x0), r.y0 - 20, 2); badge(g, r.x1 - 14, r.y0 - 20, 3);
    function linfit(xs, ys) { var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0; for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; } var m = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { m: m, c: (sy - m * sx) / n }; }
    function render() {
      var th = Math.pow(10, +sl.value), rfall = cR.checked, fast = cF.checked; setSvgText(sv, th < 0.01 ? th.toFixed(3) : th.toFixed(2));
      var k = 0.020 / (2 * Math.sqrt(th / Math.PI)), IR0 = 0.040, aF = 0.006, te = th / 40; // volts; diffusion rise 20 mV in an ideal pulse
      function Ep(t) { return IR0 * (rfall ? 1 - 0.17 * t / th : 1) + k * M11.slabSurface(t) + (fast ? aF * (1 - Math.exp(-t / te)) : 0); }
      function Vr(tr) { return k * (M11.slabSurface(tr + th) - M11.slabSurface(tr) - th) + (fast ? aF * Math.exp(-tr / te) : 0); }
      clear(gl); clear(gr);
      // pulse panel: E - E(0+) against sqrt(t)
      var sm = Math.sqrt(th), ps = [], xs = [], ys = [];
      for (var j = 0; j <= 80; j++) { var s = sm * j / 80, t = s * s; ps.push([s, Ep(t) - Ep(0)]); if (j >= 4) { xs.push(s); ys.push(Ep(t) - Ep(0)); } }
      var ymax = Math.max(0.03, ps[ps.length - 1][1] * 1.15), XL = function (s) { return a.x0 + s / sm * (a.x1 - a.x0); }, YL = function (v) { return a.y0 - (v + 0.008) / (ymax + 0.008) * (a.y0 - a.y1); };
      e11axes(gl, a, { X: XL, Y: YL, xt: [[0, '0'], [sm, '√τ']], yt: [[0, '0'], [0.02, '20']], xlab: '√t', ylab: 'E − E(0⁺), mV' });
      el('path', { d: e11d(ps.map(function (p) { return [XL(p[0]), YL(p[1])]; })), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, gl);
      var fp = linfit(xs, ys); el('path', { d: e11d([[XL(0), YL(fp.c)], [XL(sm), YL(fp.c + fp.m * sm)]]), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, gl);
      var ideal = k * 2 / Math.sqrt(Math.PI), qPulse = Math.pow(ideal / fp.m, 2);
      // rest panel: V - Veq against sqrt(tr + tau) - sqrt(tr)
      var rs = [], rx = [], ry = [], nx = [], ny = [], w0 = 0.15, w1 = 0.75;
      for (j = 0; j <= 160; j++) { var tr = th * Math.pow(10, -4 + 6 * j / 160), xv = Math.sqrt(tr + th) - Math.sqrt(tr), v = Vr(tr); rs.push([xv / sm, v]); if (xv / sm > w0 && xv / sm < w1) { rx.push(xv); ry.push(v); } if (tr <= th * 0.2) { nx.push(Math.sqrt(tr)); ny.push(v); } }
      var ymr = Math.max(0.03, Vr(0) * 1.1), XR = function (q) { return r.x0 + q * (r.x1 - r.x0); }, YR = function (v) { return r.y0 - (v + 0.004) / (ymr + 0.004) * (r.y0 - r.y1); };
      e11axes(gr, r, { X: XR, Y: YR, xt: [[0, '0'], [1, '√τ']], yt: [[0, '0'], [0.02, '20']], xlab: '√(t + τ) − √t, t = time at rest', ylab: 'E − E_eq, mV' });
      el('rect', { x: XR(w0), y: r.y1, width: XR(w1) - XR(w0), height: r.y0 - r.y1, fill: 'var(--cyan)', 'fill-opacity': '.06' }, gr);
      el('path', { d: e11d(rs.map(function (p) { return [XR(p[0]), YR(p[1])]; })), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, gr);
      var fr = linfit(rx, ry); el('path', { d: e11d([[XR(0), YR(fr.c)], [XR(1), YR(fr.c + fr.m * sm)]]), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }, gr);
      txt(gr, XR((w0 + w1) / 2), r.y1 + 14, 'fit here', 'cyan', 'middle');
      var qRelax = Math.pow(ideal / fr.m, 2), fn = linfit(nx, ny), qNaive = Math.pow(ideal / Math.abs(fn.m), 2);
      read.innerHTML = 'Dτ/L² = ' + th.toFixed(3) + '. D from the pulse slope: <b>' + qPulse.toFixed(2) + ' × true</b>; from the early rest against √t: ' + qNaive.toFixed(2) + ' ×; from the rest against √(t + τ) − √t: <b>' + qRelax.toFixed(2) + ' × true</b>.' + (rfall ? ' The resistance falling by 17 % during the pulse corrupts only the pulse value.' : '') + (fast ? ' The fast surface process sits at the start of the rest, outside the fitting region.' : '');
    }
    on(sl, 'input', render); on(cR, 'change', render); on(cF, 'change', render);
    steps(fig, [
      { text: 'During the pulse the voltage holds the IR drop, R<sub>tot</sub>I, on top of the diffusion signal. If R<sub>tot</sub> changes during the pulse, as charge-transfer resistance does with lithium content, the √t slope changes too: tick “resistance falls 17 %” and the pulse gives D about four times too large.' },
      { text: 'During the rest no current flows, so no IR drop can drift. The rest after a pulse can be solved exactly: plotted against √(t + τ) − √t, with t the time at rest, the voltage is a straight line whose slope gives D, without needing the final equilibrium voltage.' },
      { text: 'Fast processes that are not bulk diffusion, such as a surface layer, sit at the very start of the rest (the right-hand end of the plot); the finite size of the sample bends the very end (near zero). Fit the straight part between them (shaded), which for a short pulse lasts up to about ten pulse lengths of rest. Lengthen the pulse and it shrinks. The recommended procedure adds large, dense, single-phase samples and at least three pulse sizes.' }
    ]);
    render();
  });

  /* ===== 11.7 A whole run: voltages, overpotentials, resistances and D ===== */
  register('f11-7', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cbR = fig.querySelector('.longrest');
    var mode = e11modes(fig, function (m) { mode = m; render(); });
    var N = 16, x0 = 0.1, dx = 0.05, tp = 600, rP = 2e-6, I = 0.5e-3;
    function Eeq(x) { return 3.55 + 0.6 * x + 0.04 * Math.sin(2 * Math.PI * x); }
    function Dx(x) { return 3e-17 * Math.pow(10, 0.7 * Math.sin(Math.PI * x)); } // keeps D tau / r^2 below 0.025 (figure 11.4)
    function IRx(x) { return 0.010 + 0.040 * Math.exp(-(x - 0.1) / 0.08); }
    var a = { x0: 60, y0: 186, x1: 500, y1: 40 }, b = { x0: 60, y0: 390, x1: 500, y1: 246 };
    var top = el('g', {}, g), bot = el('g', {}, g);
    txt(g, 280, 16, 'cell voltage through 16 titration steps (rests drawn shorter)', 'strong', 'middle');
    badge(g, a.x0 + 24, a.y1 + 50, 1); badge(g, b.x1 - 12, b.y1 + 12, 2);
    function sim(trest) {
      var steps = [], xNow = x0, qPrev = Eeq(x0);
      for (var n = 0; n < N; n++) {
        var x = xNow + dx / 2, D = Dx(x), Tsc = rP * rP / D, thp = tp / Tsc, slope = 0.6 + 0.04 * 2 * Math.PI * Math.cos(2 * Math.PI * x), IR = IRx(x), amp = slope * dx / (3 * thp), base = qPrev;
        var Ep = function (t) { return base + (t <= tp ? IR : 0) + amp * M11.sphereSurface(t / Tsc, thp); };
        var trace = []; for (var k = 0; k <= 12; k++) trace.push([k / 12 * tp, Ep(k / 12 * tp)]); for (k = 1; k <= 24; k++) { var tt = tp + trest * k / 24; trace.push([tt, Ep(tt)]); }
        var E1 = base, E2 = base + IR, E3 = Ep(tp), E4 = Ep(tp + trest);
        steps.push({ x: xNow + dx, trace: trace, E1: E1, E2: E2, E3: E3, E4: E4, D: D, Dg: M11.gittDSphere(tp, rP, E4 - E1, E3 - E2), eta: E3 - E4 });
        qPrev = E4; xNow += dx;
      }
      return steps;
    }
    function render() {
      var trest = cbR.checked ? 4 * 3600 : 3600, st = sim(trest), sw = (a.x1 - a.x0) / N;
      clear(top); clear(bot);
      var vlo = 3.55, vhi = 4.15, Y = function (v) { return a.y0 - (v - vlo) / (vhi - vlo) * (a.y0 - a.y1); };
      e11axes(top, a, { X: function (x) { return x; }, Y: Y, yt: [[3.6, '3.6'], [3.8, '3.8'], [4.0, '4.0']], grid: true, ylab: 'V' });
      var d = '';
      st.forEach(function (s, n) { var xs = a.x0 + n * sw; s.trace.forEach(function (p, i) { var fx = p[0] <= tp ? p[0] / tp * 0.3 : 0.3 + (p[0] - tp) / trest * 0.7; d += (n + i ? 'L' : 'M') + (xs + fx * sw).toFixed(1) + ',' + Y(p[1]).toFixed(1); }); });
      el('path', { d: d, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.8 }, top);
      st.forEach(function (s, n) { var xs = a.x0 + n * sw; el('circle', { cx: xs + 0.3 * sw, cy: Y(s.E3), r: 2.6, fill: 'var(--heat)' }, top); el('circle', { cx: xs + sw, cy: Y(s.E4), r: 2.6, fill: 'var(--cyan)' }, top); });
      txt(top, a.x1, a.y0 + 16, 'end of each pulse (red) and of each rest (cyan)', '', 'end');
      // bottom panel
      var X = function (x) { return b.x0 + (x - x0) / (N * dx) * (b.x1 - b.x0); };
      if (mode === 'volt') {
        var Yb = function (v) { return b.y0 - (v - vlo) / (vhi - vlo) * (b.y0 - b.y1); };
        e11axes(bot, b, { X: X, Y: Yb, xt: [[0.1, '0.1'], [0.5, '0.5'], [0.9, '0.9']], yt: [[3.6, '3.6'], [3.8, '3.8'], [4.0, '4.0']], grid: true, xlab: 'lithium removed, x', ylab: 'V' });
        var eq = []; for (var q = 0; q <= 40; q++) { var xx = x0 + N * dx * q / 40; eq.push([X(xx), Yb(Eeq(xx))]); } el('path', { d: e11d(eq), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }, bot);
        el('path', { d: e11d(st.map(function (s) { return [X(s.x), Yb(s.E4)]; })), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2 }, bot);
        el('path', { d: e11d(st.map(function (s) { return [X(s.x - dx), Yb(s.E3)]; })), fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2 }, bot);
        txt(bot, X(0.62), Yb(Eeq(0.62)) + 24, 'quasi-OCV (end of rest)', 'cyan', 'start'); txt(bot, X(0.12), Yb(4.0), 'closed-circuit (end of pulse)', 'heat', 'start');
      } else if (mode === 'eta') {
        var Ye = function (v) { return b.y0 - v / 0.08 * (b.y0 - b.y1); };
        e11axes(bot, b, { X: X, Y: Ye, xt: [[0.1, '0.1'], [0.5, '0.5'], [0.9, '0.9']], yt: [[0, '0'], [0.04, '40'], [0.08, '80']], grid: true, xlab: 'lithium removed, x', ylab: 'η = CCV − QOCV, mV' });
        el('path', { d: e11d(st.map(function (s) { return [X(s.x - dx / 2), Ye(s.eta)]; })), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.2 }, bot);
        st.forEach(function (s) { el('circle', { cx: X(s.x - dx / 2), cy: Ye(s.eta), r: 3, fill: 'var(--amber)' }, bot); });
        txt(bot, b.x1, b.y1 + 12, 'R = η / I: ' + (st[0].eta / I).toFixed(0) + ' Ω at the start, ' + (st[N - 1].eta / I).toFixed(0) + ' Ω at the end (I = 0.5 mA)', '', 'end');
      } else {
        var Yd = function (v) { return b.y0 - (Math.log10(v) + 17.2) / 2 * (b.y0 - b.y1); };
        e11axes(bot, b, { X: X, Y: Yd, xt: [[0.1, '0.1'], [0.5, '0.5'], [0.9, '0.9']], yt: [[1e-17, '10⁻¹³'], [1e-16, '10⁻¹²']], grid: true, xlab: 'lithium removed, x', ylab: 'D, cm²/s (log)' });
        var tru = []; for (q = 0; q <= 40; q++) { xx = x0 + N * dx * q / 40; tru.push([X(xx), Yd(Dx(xx))]); } el('path', { d: e11d(tru), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }, bot);
        el('path', { d: e11d(st.map(function (s) { return [X(s.x - dx / 2), Yd(Math.max(7e-18, s.Dg))]; })), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2 }, bot);
        st.forEach(function (s) { el('circle', { cx: X(s.x - dx / 2), cy: Yd(Math.max(7e-18, s.Dg)), r: 3, fill: 'var(--cyan)' }, bot); });
        txt(bot, b.x1, b.y1 + 12, 'dashed: D in the model; dots: Weppner–Huggins from each step', '', 'end');
      }
      var days = N * (tp + trest) / 86400;
      read.innerHTML = N + ' steps of 10 min with ' + (trest / 3600) + ' h rests take <b>' + days.toFixed(1) + ' days</b>. ' + (mode === 'volt' ? 'The end-of-rest voltages trace the quasi-equilibrium curve (dashed); the end-of-pulse voltages sit above it by the overpotential.' : mode === 'eta' ? 'The overpotential η = CCV − QOCV, and the internal resistance η/I, are largest where the charge-transfer resistance is (here at the start of charge).' : (cbR.checked ? 'Even with every pulse inside the recommended range, the step values sit 15 to 25 % below the model: the √t law for spheres is only approximate at these pulse lengths (figure 11.4).' : 'Where D is smallest, a 1 h rest was not enough for the voltage to settle; ΔEₛ comes out too large and so does D.'));
    }
    on(cbR, 'change', render);
    steps(fig, [
      { text: 'A GITT run repeats the step of figure 11.3 across the whole charge: pulse, rest, pulse, rest. The voltage at the end of each rest is a <b>quasi-open-circuit voltage</b> (QOCV); joined up, they give the equilibrium curve. The voltage at the end of each pulse is the closed-circuit voltage (CCV).' },
      { text: 'Three products from one run: the QOCV curve; the overpotential η = |CCV − QOCV| and the internal resistance η/I at each state of charge; and D at each step. Switch the panel below. Untick “4 h rests” to use 1 h rests and see where the voltage had not yet settled.' }
    ]);
    render();
  });

  /* =================================================================
     Module 11, measuring well (11.12 to 11.14): how small the sine must
     be, from the Butler-Volmer curve and its harmonics (Bard, Faulkner
     and White 2022, B2, eqs 3.4.11 and 3.4.13 and sec. 11.6; Meddings et
     al. 2020, R64, sec. 3.1; Bakenhaster and Dewald 2025, R65, sec. 4.4);
     two terminals against four (Lazanas and Prodromidis 2023, R63, eqs 82
     and 83 and sec. 15); and the Kramers-Kronig test (R63 secs 7 and
     16.5; R64 sec. 3.3.1). Physics in Physics.m11.
     ================================================================= */

  /* ===== 11.12 How small is small? ===== */
  register('f11-12', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sA = fig.querySelector('.amp'), sAv = fig.querySelector('.amp-val'), sa = fig.querySelector('.alpha'), sav = fig.querySelector('.alpha-val');
    var i0 = 1e-3, f = 96485 / (8.314 * 298.15);
    // left: the Butler-Volmer curve
    var a = { x0: 50, y0: 220, x1: 240, y1: 40 }, X = function (e) { return a.x0 + (e + 0.12) / 0.24 * (a.x1 - a.x0); }, Y = function (i) { return (a.y0 + a.y1) / 2 - i / 0.016 * (a.y0 - a.y1); };
    e11axes(g, a, { X: X, Y: function (i) { return Y(i); }, xt: [[-0.1, '−100'], [0, '0'], [0.1, '100 mV']], yt: [[-0.008, '−8'], [0, '0'], [0.008, '8']], xlab: 'overpotential η', ylab: 'current, mA' });
    el('line', { x1: a.x0, x2: a.x1, y1: Y(0), y2: Y(0), stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g);
    var bv = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.6 }, g), tang = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g), seg = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    txt(g, X(0.02), Y(0.0062), 'slope 1/R_ct', 'cyan', 'start');
    // right top: current over one period against a pure sine
    var r = { x0: 300, y0: 128, x1: 505, y1: 40 }, XT = function (u) { return r.x0 + u * (r.x1 - r.x0); };
    txt(g, r.x0, 24, 'current over one period', 'strong', 'start');
    el('line', { x1: r.x0, x2: r.x1, y1: (r.y0 + r.y1) / 2, y2: (r.y0 + r.y1) / 2, stroke: 'var(--line-2)' }, g);
    var pS = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g), pI = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    txt(g, r.x1, r.y0 + 18, 'dashed: a pure sine', '', 'end');
    // right bottom: harmonics
    var h = { x0: 320, y0: 270, x1: 505, y1: 192 }, YH = function (q) { return h.y0 - (Math.log10(Math.max(q, 1e-5)) + 5) / 5 * (h.y0 - h.y1); };
    e11axes(g, h, { X: function (x) { return x; }, Y: YH, yt: [[1e-4, '10⁻⁴'], [1e-2, '0.01'], [1, '1']], grid: true, ylab: 'size ÷ fundamental' });
    var bars = [1, 2, 3, 4, 5].map(function (n) { var x = h.x0 + 8 + (n - 1) * 36; txt(g, x + 13, h.y0 + 16, n === 1 ? 'f' : n + 'f', 'strong', 'middle'); return el('rect', { x: x, width: 26, fill: n === 1 ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': '.85' }, g); });
    badge(g, X(-0.08), Y(0.0062), 1); badge(g, r.x1 - 12, r.y1 + 6, 2); badge(g, h.x1 - 10, h.y1 + 4, 3);
    function render() {
      var A = Math.pow(10, +sA.value) / 1000, al = +sa.value, res = M11.bvHarmonics(i0, al, A, 298.15, 256);
      setSvgText(sAv, (A * 1000).toFixed(A < 0.01 ? 1 : 0) + ' mV'); setSvgText(sav, al.toFixed(2));
      var pts = []; for (var k = 0; k <= 120; k++) { var e = -0.12 + 0.24 * k / 120, i = i0 * (Math.exp((1 - al) * f * e) - Math.exp(-al * f * e)); if (Math.abs(i) <= 0.0085) pts.push([X(e), Y(i)]); }
      bv.setAttribute('d', e11d(pts));
      var eT = Math.min(0.12, 0.008 / (i0 * f)); tang.setAttribute('d', e11d([[X(-eT), Y(-i0 * f * eT)], [X(eT), Y(i0 * f * eT)]])); // tangent at eta = 0: slope i0 F/(RT) = 1/Rct for any alpha
      var sp = []; for (k = 0; k <= 60; k++) { var e2 = -A + 2 * A * k / 60; sp.push([X(e2), Y(i0 * (Math.exp((1 - al) * f * e2) - Math.exp(-al * f * e2)))]); }
      seg.setAttribute('d', e11d(sp.filter(function (p) { return p[1] >= a.y1 - 4 && p[1] <= a.y0 + 4; })));
      var imax = Math.max.apply(null, res.wave.map(function (w) { return Math.abs(w.i); })), yc = (r.y0 + r.y1) / 2, hh = (r.y0 - r.y1) / 2 - 4;
      pI.setAttribute('d', e11d(res.wave.map(function (w, k2) { return [XT(k2 / res.wave.length), yc - w.i / imax * hh]; })));
      pS.setAttribute('d', e11d(res.wave.map(function (w, k2) { return [XT(k2 / res.wave.length), yc - res.amps[1] * Math.sin(2 * Math.PI * k2 / res.wave.length) / imax * hh]; })));
      bars.forEach(function (bar, n) { var q = res.amps[n + 1] / res.amps[1], y = YH(q); bar.setAttribute('y', y); bar.setAttribute('height', Math.max(0, h.y0 - y)); });
      read.innerHTML = 'Amplitude <b>' + (A * 1000).toFixed(A < 0.01 ? 1 : 0) + ' mV</b>: total harmonic distortion <b>' + (res.thd * 100).toFixed(res.thd < 0.01 ? 2 : 1) + ' %</b>; the resistance read from the fundamental is <b>' + (res.rApparent / res.rct * 100).toFixed(1) + ' %</b> of R<sub>ct</sub> = RT/(Fi₀) = ' + res.rct.toFixed(1) + ' Ω.' + (Math.abs(al - 0.5) < 0.005 ? ' With α = 0.5 the curve is symmetric about η = 0, so there is no second harmonic.' : ' With α ≠ 0.5 the curve is lopsided and a second harmonic appears.');
    }
    on(sA, 'input', render); on(sa, 'input', render);
    steps(fig, [
      { text: 'Impedance assumes a linear system, but an electrode reaction is not linear: the Butler–Volmer current grows exponentially with overpotential. Close to equilibrium the curve is nearly straight, with slope 1/R<sub>ct</sub>, where R<sub>ct</sub> = RT/(Fi₀); that straight piece is what impedance measures.' },
      { text: 'A small sine, 5 to 10 mV, stays on the straight piece and the current is a sine too. Raise the amplitude: the current is distorted, and the resistance read from the fundamental drifts away from R<sub>ct</sub>.' },
      { text: 'A distorted current contains <b>harmonics</b>, signals at 2f, 3f and so on, because harmonics reflect the curvature of the current–voltage curve. Their combined size over the fundamental is the total harmonic distortion: a quick test that the amplitude is small enough. Nonlinear methods turn this round and drive the cell harder on purpose, reading the harmonics for kinetics, ageing and lithium plating.' }
    ]);
    render();
  });

  /* ===== 11.13 Two wires or four ===== */
  register('f11-13', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.cable'), sv = fig.querySelector('.cable-val');
    var C = M11.CELL, rPerM = 0.004, lPerM = 0.2e-6, fs = M11.freqs(10000, 0.5, 20);
    // the two set-ups
    function cell(x, y) { el('rect', { x: x, y: y, width: 40, height: 56, rx: 4, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g); txt(g, x + 20, y + 33, 'cell', 'strong', 'middle'); }
    function meter(x, y, lab) { el('rect', { x: x, y: y, width: 70, height: 56, rx: 4, fill: 'none', stroke: 'var(--line-2)' }, g); txt(g, x + 35, y + 22, 'analyzer', 'strong', 'middle'); txt(g, x + 35, y + 40, lab, '', 'middle'); }
    meter(20, 40, '2 terminals'); cell(200, 40);
    el('path', { d: 'M90,54 H200 M90,82 H200', stroke: 'var(--amber)', 'stroke-width': 2, fill: 'none' }, g);
    txt(g, 145, 34, 'current and voltage share the wires', '', 'middle');
    meter(280, 40, '4 terminals'); cell(460, 40);
    el('path', { d: 'M350,50 H460 M350,86 H460', stroke: 'var(--amber)', 'stroke-width': 2, fill: 'none' }, g);
    el('path', { d: 'M350,60 H440 V58 H460 M350,76 H440 V78 H460', stroke: 'var(--cyan)', 'stroke-width': 1.6, fill: 'none' }, g);
    txt(g, 405, 34, 'current pair (amber), sense pair (cyan)', '', 'middle');
    var b = { x0: 60, y0: 330, x1: 470, y1: 130 }, F = e11nyq(g, b, [16, 57], -12, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[-10, '−10'], [0, '0'], [5, '5']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var z4 = fs.map(function (f) { var w = 2 * Math.PI * f; return M11.add(M11.zL(C.L, w), M11.zR(C.R0), M11.zRQ(C.Rsei, C.Qsei, C.nsei, w), M11.parallel(M11.zR(C.Rct), M11.zC(C.Cdl, w))); });
    el('path', { d: e11zpath(z4, F, b, 1000), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.4 }, g);
    var p2 = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), mk = el('g', {}, g);
    txt(g, F.X(36), F.Y(4.8), '4 terminals: the cell', 'cyan', 'start'); var l2 = txt(g, 0, 0, '2 terminals: cell + wires', 'amber', 'start');
    badge(g, 120, 104, 1); badge(g, 400, 104, 2); badge(g, F.X(18), F.Y(-9), 3);
    function render() {
      var Lm = +sl.value, Rw = rPerM * Lm, Lw = lPerM * Lm; setSvgText(sv, Lm.toFixed(1) + ' m');
      var z2 = z4.map(function (z, i) { var w = 2 * Math.PI * fs[i]; return M11.add(z, M11.zR(Rw), M11.zL(Lw, w)); });
      p2.setAttribute('d', e11zpath(z2, F, b, 1000));
      clear(mk);
      var x4 = z4.reduce(function (best, z) { return Math.abs(z.im) < Math.abs(best.im) ? z : best; }), x2 = z2.reduce(function (best, z) { return Math.abs(z.im) < Math.abs(best.im) ? z : best; });
      l2.setAttribute('x', Math.min(F.X(x2.re * 1000) + 8, b.x1 - 150)); l2.setAttribute('y', F.Y(-8));
      var z10 = z2[0];
      read.innerHTML = 'With <b>' + Lm.toFixed(1) + ' m</b> of cable on each side the two-terminal reading adds about <b>' + (Rw * 1000).toFixed(1) + ' mΩ</b> of wire to a cell whose ohmic resistance is ' + (C.R0 * 1000).toFixed(0) + ' mΩ, and at 10 kHz the inductive part reaches ' + (z10.im * 1000).toFixed(1) + ' mΩ below the axis instead of ' + (z4[0].im * 1000).toFixed(1) + ' mΩ. The four-terminal curve does not change.';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: '<b>Two terminals</b>: the analyzer passes the current and measures the voltage through the same two wires, so it measures the cell and the wires together, Z = Z<sub>cell</sub> + Z<sub>wire</sub>. For a cell of tens of milliohms, the wires are not negligible.' },
      { text: '<b>Four terminals</b>: one pair carries the current; a second pair senses the voltage at the cell’s own terminals and carries almost no current, so the wires drop no voltage on it and Z = Z<sub>cell</sub>. This is the connection recommended for batteries.' },
      { text: 'Longer cables add resistance and <b>inductance</b>, which pulls the high-frequency end further below the axis; it is worst for low-impedance cells such as batteries. Short cables, current and sense wires twisted in pairs, the same cables for calibration and measurement, and a fixed cell holder keep it small.' }
    ]);
    render();
  });

  /* ===== 11.14 Is the spectrum valid? The Kramers-Kronig test ===== */
  register('f11-14', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cb = fig.querySelector('.drift'), sl = fig.querySelector('.noise'), sv = fig.querySelector('.noise-val');
    var C = M11.CELL, fs = M11.freqs(5000, 0.01, 8), tt = 0, ts = fs.map(function (f) { tt += Math.max(2 / f, 1); return tt; }), T = tt;
    function gauss(seed) { var s = seed; return function () { var x = 0; for (var j = 0; j < 6; j++) { s = (s * 1664525 + 1013904223) % 4294967296; x += s / 4294967296; } return (x - 3) / Math.sqrt(0.5); }; }
    var b = { x0: 60, y0: 210, x1: 470, y1: 40 }, F = e11nyq(g, b, [18, 59], -6, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[-5, '−5'], [0, '0'], [10, '10']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var r = { x0: 60, y0: 350, x1: 470, y1: 284 }, XR = function (f) { return e11log(f, -2, Math.log10(5000), r.x0, r.x1); }, YR = function (q) { return (r.y0 + r.y1) / 2 - q / 0.03 * (r.y0 - r.y1); };
    el('rect', { x: r.x0, y: YR(0.01), width: r.x1 - r.x0, height: YR(-0.01) - YR(0.01), fill: 'var(--cyan)', 'fill-opacity': '.07' }, g);
    e11axes(g, { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 }, { X: XR, Y: YR, xt: [[0.01, '0.01'], [1, '1'], [100, '100'], [5000, '5 kHz']], yt: [[-0.01, '−1'], [0, '0'], [0.01, '1']], ylab: 'residual, % of |Z|' });
    el('line', { x1: r.x0, x2: r.x1, y1: YR(0), y2: YR(0), stroke: 'var(--line-2)' }, g);
    var gd = el('g', {}, g), fit = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.8 }, g), gr = el('g', {}, g);
    badge(g, F.X(52), F.Y(10), 1); badge(g, r.x1 - 12, r.y1 + 12, 2);
    function render() {
      var drift = cb.checked, nz = +sl.value / 100, rn = gauss(7); setSvgText(sv, (nz * 100).toFixed(1) + ' %');
      var Z = fs.map(function (f, i) { var k = drift ? 1 + 0.3 * ts[i] / T : 1, p = { L: C.L, R0: C.R0, Rsei: C.Rsei * k, Qsei: C.Qsei, nsei: C.nsei, Rct: C.Rct * k, Cdl: C.Cdl, Rd: C.Rd, Cd: C.Cd }, z = M11.cellZ(p, 2 * Math.PI * f), m = M11.abs(z); return { re: z.re + nz * m * rn(), im: z.im + nz * m * rn() }; });
      var kk = M11.linKK(fs, Z);
      clear(gd); clear(gr);
      Z.forEach(function (z) { var y = F.Y(-z.im * 1000); if (y >= b.y1) el('circle', { cx: F.X(z.re * 1000), cy: y, r: 3, fill: 'var(--amber)' }, gd); });
      fit.setAttribute('d', e11zpath(kk.fit, F, b, 1000));
      kk.res.forEach(function (q, i) { el('circle', { cx: XR(fs[i]), cy: Math.max(r.y1, Math.min(r.y0, YR(q.re))), r: 2.6, fill: 'var(--amber)' }, gr); el('circle', { cx: XR(fs[i]), cy: Math.max(r.y1, Math.min(r.y0, YR(q.im))), r: 2.6, fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.4 }, gr); });
      var mx = Math.max.apply(null, kk.res.map(function (q) { return Math.max(Math.abs(q.re), Math.abs(q.im)); })), chi = kk.chi2;
      var verdict = chi < 1e-6 ? 'excellent' : chi < 1e-5 ? 'reasonable' : chi < 1e-4 ? 'marginal' : 'bad';
      read.innerHTML = 'Linear Kramers–Kronig test with ' + kk.M + ' R‖C elements of fixed time constants: pseudo-χ² = <b>' + sci(chi, 1) + '</b> (' + verdict + ' by the usual rule of thumb), largest residual <b>' + (mx * 100).toFixed(2) + ' %</b>. ' + (drift ? 'The cell changed during the ' + Math.round(T / 60) + '-minute sweep, and the residuals at low frequency, measured last, follow a pattern instead of scattering.' : nz > 0 ? 'Noise scatters the residuals evenly around zero: the data are noisy but valid.' : 'The residuals are tiny: the spectrum is consistent with a linear, causal, stable system.');
    }
    on(cb, 'change', render); on(sl, 'input', render);
    steps(fig, [
      { text: 'Before fitting any model, check that the spectrum could have come from a linear, causal and stable system that stayed the same during the sweep. For such a system the real and imaginary parts are not independent: the Kramers–Kronig relations compute one from the other. They need every frequency from zero to infinity, so in practice a test circuit is fitted instead: many R‖C elements with fixed, evenly spread time constants, only their resistances free. Any valid spectrum can be fitted this way.' },
      { text: 'The residuals, data minus fit as a fraction of |Z|, should be small and randomly scattered around zero; well below 1 % is the usual aim. Tick “cell drifting”: the cell’s resistances grow by 30 % during the sweep, and the low frequencies, measured last, leave a pattern in the residuals. Add noise: the residuals scatter, but without a pattern.' }
    ]);
    render();
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
