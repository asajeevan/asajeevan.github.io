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
     Module 6: inside a lithium-ion cell. The rocking chair after
     Tarascon and Armand 2001 (R2) Fig. 2b and Goodenough and Park 2013
     (R6) Fig. 1; insertion after Winter and Brodd 2004 (R1) 2.4; the
     SEI after R6, R1 2.4 and R2; host paths after R6; the timeline
     after R6 and R2.
     ================================================================= */

  /* ===== 6.1 The rocking chair ===== */
  register('f6-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), mb = fig.querySelectorAll('button[data-mode]');
    var gx0 = 62, gx1 = 168, px0 = 352, px1 = 458, y0 = 96, y1 = 246, xsep = 260, nL = 6;
    var gap = (y1 - y0) / nL;
    // current collectors
    el('rect', { x: gx0 - 12, y: y0 - 6, width: 10, height: y1 - y0 + 12, fill: 'var(--copper)' }, g); txt(g, gx0 - 7, y1 + 20, 'Cu', 'strong', 'middle');
    el('rect', { x: px1 + 2, y: y0 - 6, width: 10, height: y1 - y0 + 12, fill: 'var(--metal)' }, g); txt(g, px1 + 7, y1 + 20, 'Al', 'strong', 'middle');
    // electrolyte
    el('rect', { x: gx1, y: y0 - 6, width: px0 - gx1, height: y1 - y0 + 12, fill: 'var(--cyan)', 'fill-opacity': '.1' }, g);
    el('line', { x1: xsep, y1: y0, x2: xsep, y2: y1, stroke: 'var(--cyan)', 'stroke-dasharray': '3 5' }, g);
    // graphite: graphene sheets; LiCoO2: CoO2 slabs drawn as rows of octahedra (squares)
    for (var i = 0; i <= nL; i++) {
      var y = y0 + i * gap;
      el('line', { x1: gx0, x2: gx1, y1: y, y2: y, stroke: 'var(--text)', 'stroke-opacity': '.55', 'stroke-width': 2 }, g);
      for (var k = 0; k < 7; k++) el('rect', { x: px0 + 4 + k * 15, y: y - 4, width: 8, height: 8, transform: 'rotate(45 ' + (px0 + 8 + k * 15) + ' ' + y + ')', fill: 'var(--amber-2)', 'fill-opacity': '.65' }, g);
    }
    txt(g, (gx0 + gx1) / 2, y0 - 16, 'graphite', 'strong', 'middle'); txt(g, (px0 + px1) / 2, y0 - 16, 'LiCoO₂', 'strong', 'middle');
    txt(g, (gx0 + gx1) / 2, y1 + 20, 'sheets of carbon', '', 'middle'); txt(g, (px0 + px1) / 2, y1 + 20, 'CoO₂ layers', '', 'middle');
    txt(g, xsep, y1 + 20, 'electrolyte', 'cyan', 'middle');
    // external circuit
    var wy = 36, xL = gx0 - 7, xR = px1 + 7;
    var ePath = el('path', { d: 'M' + xL + ',' + (y0 - 6) + ' V' + wy + ' H' + xR + ' V' + (y0 - 6), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g);
    var eflow = flow(svg, ePath, { n: 10, cls: 'e-dot', r: 3, speed: 50, parent: g });
    var box = el('rect', { x: xsep - 58, y: wy - 15, width: 116, height: 30, rx: 6, fill: 'var(--panel)', stroke: 'var(--amber)' }, g);
    var boxT = txt(g, xsep, wy + 4, 'lamp', 'strong', 'middle'), eT = txt(g, xsep, wy - 22, '', 'cyan', 'middle');
    // sites: 6 interlayer rows x 3 sites on each side
    var sites = { neg: [], pos: [] };
    for (i = 0; i < nL; i++) for (k = 0; k < 3; k++) { sites.neg.push({ x: gx0 + 22 + k * 32, y: y0 + gap * (i + 0.5) }); sites.pos.push({ x: px0 + 20 + k * 34, y: y0 + gap * (i + 0.5) }); }
    var N = 12, ions = [];
    for (i = 0; i < N; i++) ions.push({ side: 'neg', slot: i, c: el('circle', { r: 4.2, 'class': 'ion' }, g) });
    var our = ourIon(g, 0, 0, 5.5, 'our ion', true); ions[3].our = true; ions[3].c.style.display = 'none';
    var cnt = txt(g, 260, 300, '', 'phi', 'middle'), cnt2 = txt(g, 260, 318, '', 'amber', 'middle');
    // inventory bars
    var bx = 112, bw = 296, by = 330;
    el('rect', { x: bx, y: by, width: bw, height: 12, rx: 3, fill: 'none', stroke: 'var(--line-2)' }, g);
    var barN = el('rect', { x: bx, y: by, height: 12, rx: 3, fill: 'var(--text)', 'fill-opacity': '.55' }, g), barP = el('rect', { y: by, height: 12, rx: 3, fill: 'var(--amber)' }, g);
    txt(g, bx - 6, by + 10, 'in graphite', '', 'end'); txt(g, bx + bw + 6, by + 10, 'in LiCoO₂', '', 'start');
    txt(g, 260, by + 30, 'the same lithium, only its address changes', 'phi', 'middle');
    badge(g, 30, 170, 1); badge(g, xsep, y0 + 14, 2); badge(g, 490, 170, 3); badge(g, xsep + 70, wy, 4); badge(g, 494, by + 6, 5);
    var mode = 'discharge', moving = null, t = 0;
    function freeSlot(side) { var used = {}; ions.forEach(function (p) { if (p.side === side) used[p.slot] = 1; }); var opts = []; for (var s = 0; s < sites[side].length; s++) if (!used[s]) opts.push(s); return opts.length ? opts[(opts.length * 0.37) | 0] : null; }
    function place(p) { var s = sites[p.side][p.slot]; p.c.setAttribute('cx', s.x); p.c.setAttribute('cy', s.y); if (p.our) our.move(s.x, s.y); }
    function count(side) { return ions.filter(function (p) { return p.side === side && p !== moving; }).length; }
    function render() {
      Array.prototype.forEach.call(mb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
      var n = count('neg'), p = count('pos'), tot = N;
      setSvgText(boxT, mode === 'discharge' ? 'lamp' : 'charger, above V_OC'); box.setAttribute('stroke', mode === 'discharge' ? 'var(--amber)' : 'var(--cyan)');
      setSvgText(eT, mode === 'discharge' ? 'electrons → through the lamp' : '← electrons pushed back');
      eflow.setSpeed(mode === 'discharge' ? 50 : -50);
      barN.setAttribute('width', bw * n / tot); barP.setAttribute('x', bx + bw * (tot - p) / tot); barP.setAttribute('width', bw * p / tot);
      setSvgText(cnt, 'graphite holds ' + n + ' of ' + tot + ' movable ions, LiCoO₂ ' + p + (moving ? ', one crossing' : ''));
      setSvgText(cnt2, mode === 'discharge' ? (n === 0 && !moving ? 'graphite empty: the cell is discharged' : 'discharging: Li⁺ leaves the graphite') : (p === 0 && !moving ? 'LiCoO₂ emptied as far as this sketch goes' : 'charging: Li⁺ returns to the graphite'));
      read.innerHTML = mode === 'discharge'
        ? 'Discharge: a lithium ion leaves the space between two carbon sheets, crosses the electrolyte and slips in between two CoO₂ layers; at the same moment an electron leaves the graphite through the copper, runs through the lamp and enters the LiCoO₂ through the aluminium. Neither host is used up.'
        : 'Charge: the charger, set above the open-circuit voltage, pulls electrons out of the LiCoO₂ and pushes them into the graphite; lithium ions follow inside, back between the carbon sheets. The hosts are the same ones; only the lithium has moved.';
    }
    function launch() {
      var from = mode === 'discharge' ? 'neg' : 'pos', to = from === 'neg' ? 'pos' : 'neg';
      var cand = ions.filter(function (p) { return p.side === from; }); if (!cand.length) return;
      var pick = cand.filter(function (p) { return p.our; })[0] && Math.random() < 0.4 ? cand.filter(function (p) { return p.our; })[0] : cand[(cand.length * 0.61) | 0];
      var slot = freeSlot(to); if (slot === null) return;
      var a = sites[from][pick.slot], b = sites[to][slot];
      moving = pick; pick.k = 0; pick.a = a; pick.b = b; pick.to = to; pick.toSlot = slot;
    }
    function tick(dt) {
      if (dt === 0) return; t += dt; eflow.advance(dt);
      if (!moving) { launch(); render(); return; }
      var p = moving; p.k += dt / 2.2; var k = smooth(Math.min(1, p.k));
      var x = lerp(p.a.x, p.b.x, k), y = lerp(p.a.y, p.b.y, k) + Math.sin(k * Math.PI * 3) * 6;
      p.c.setAttribute('cx', x); p.c.setAttribute('cy', y); if (p.our) our.move(x, y);
      if (p.k >= 1) { p.side = p.to; p.slot = p.toSlot; moving = null; place(p); render(); }
    }
    ions.forEach(function (p, i) { p.slot = i; place(p); });
    Array.prototype.forEach.call(mb, function (b) { on(b, 'click', function () { mode = b.getAttribute('data-mode'); render(); }); });
    steps(fig, [
      { text: 'The <b>negative electrode</b> is graphite on copper foil: sheets of carbon atoms with room between them. In a charged cell the lithium sits there, up to one lithium for every six carbons (LiC₆).' },
      { text: 'On discharge a lithium ion leaves its gap, crosses the <b>electrolyte</b> as Li⁺ and goes into the other electrode. The electrolyte carries ions, not electrons.' },
      { text: 'The <b>positive electrode</b> is LiCoO₂: layers of cobalt and oxygen with lithium between them, on aluminium foil. The ion slides in between two layers. Neither host is dissolved or rebuilt: this is <b>insertion</b>, and for layered hosts like these two, <b>intercalation</b>.' },
      { text: 'Every ion that crosses inside is matched by an electron that goes round outside, through the lamp. Switch to <b>Charge</b>: the charger, set above V<sub>OC</sub>, drives both back.' },
      { text: 'The bar counts the movable lithium. It only ever moves from one end to the other: nothing is consumed in an ideal lithium-ion cell. This back and forth is why it was called the <b>rocking-chair</b> cell.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    render(); bind(fig, loop);
  });

  /* ===== 6.3 The first charge and the SEI ===== */
  register('f6-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cyc = fig.querySelectorAll('button[data-cycle]');
    // left: close-up of the graphite surface; right: the potential of the graphite on the lithium scale
    var gx0 = 40, gx1 = 120, ex1 = 300, y0 = 50, y1 = 250;
    for (var i = 0; i < 9; i++) el('line', { x1: gx0, x2: gx1, y1: y0 + 10 + i * 22, y2: y0 + 10 + i * 22, stroke: 'var(--text)', 'stroke-opacity': '.5', 'stroke-width': 2 }, g);
    txt(g, (gx0 + gx1) / 2, y0 - 14, 'graphite', 'strong', 'middle');
    el('rect', { x: gx1, y: y0, width: ex1 - gx1, height: y1 - y0, fill: 'var(--cyan)', 'fill-opacity': '.08' }, g);
    txt(g, (gx1 + ex1) / 2 + 20, y0 - 14, 'electrolyte', 'cyan', 'middle');
    var sei = el('rect', { x: gx1, y: y0, width: 0, height: y1 - y0, fill: 'var(--anion)', 'fill-opacity': '.7' }, g);
    var seiT = txt(g, gx1 + 4, y1 + 18, '', 'strong', 'start');
    var mols = []; for (i = 0; i < 9; i++) mols.push({ x: gx1 + 40 + Math.random() * 130, y: y0 + 14 + Math.random() * (y1 - y0 - 28), e: el('ellipse', { rx: 7, ry: 4, fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.4 }, g), state: 'free' });
    var our = ourIon(g, ex1 - 20, 150, 5, 'our ion', true);
    var eHit = el('circle', { r: 3, 'class': 'e-dot' }, g); eHit.style.display = 'none';
    // right: potential scale
    var ax = 380, Y = function (v) { return 260 - v / 4.5 * 220; };
    el('line', { x1: ax, y1: Y(0), x2: ax, y2: Y(4.5), stroke: 'var(--line-2)' }, g);
    el('rect', { x: ax - 30, y: Y(4.3), width: 60, height: Y(1.1) - Y(4.3), fill: 'var(--cyan)', 'fill-opacity': '.12', stroke: 'var(--cyan)', 'stroke-opacity': '.4' }, g);
    txt(g, ax + 20, Y(2.7), 'electrolyte stable', 'cyan', 'middle', { transform: 'rotate(-90 ' + (ax + 20) + ' ' + Y(2.7) + ')' });
    [[0, '0'], [0.2, '0.2'], [1.1, '1.1'], [4.3, '4.3']].forEach(function (r) { el('line', { x1: ax - 4, x2: ax, y1: Y(r[0]), y2: Y(r[0]) }, g); txt(g, ax - 36, Y(r[0]) + (r[0] === 0 ? 8 : r[0] === 0.2 ? -2 : 4), r[1] + ' V', '', 'end'); });
    txt(g, ax + 36, Y(1.1) + 4, 'lower edge', 'cyan', 'start');
    txt(g, ax, Y(0) + 18, 'V vs Li/Li⁺', '', 'middle');
    var mark = el('line', { x1: ax - 30, x2: ax + 30, stroke: 'var(--text)', 'stroke-width': 3 }, g), markT = txt(g, ax + 36, 0, 'graphite now', 'strong', 'start');
    // lithium inventory
    var bx = 40, bw = 260, by = 290;
    el('rect', { x: bx, y: by, width: bw, height: 12, rx: 3, fill: 'none', stroke: 'var(--line-2)' }, g);
    var bG = el('rect', { x: bx, y: by, height: 12, fill: 'var(--amber)' }, g), bS = el('rect', { y: by, height: 12, fill: 'var(--anion)' }, g), bP = el('rect', { y: by, height: 12, fill: 'var(--amber-2)', 'fill-opacity': '.5' }, g);
    txt(g, bx, by + 28, 'lithium from the positive electrode, left to right:', '', 'start'); txt(g, bx, by + 43, 'in the graphite (amber), locked in the SEI (grey), not yet moved', '', 'start');
    txt(g, bx + bw + 6, by + 10, 'sizes schematic', '', 'start');
    badge(g, ax + 60, Y(3.4), 1); badge(g, ax - 84, Y(1.1), 2); badge(g, gx1 + 10, y0 - 18, 3); badge(g, 150, by - 12, 4);
    var cycle = 1, k = 0, seiW = 0, locked = 0; // k: progress of this charge (0..1)
    /* Schematic first charge, k = share of the movable lithium sent from the positive electrode.
       Cycle 1: the potential drops quickly to the 1.1 V edge, then slopes down while the SEI forms
       (k up to 0.12, the charge locked in it), then the graphite fills near 0.2 V. Cycle 2: no SEI step. */
    var KS = 0.12;
    function V(kk) {
      if (cycle === 1) return kk < 0.01 ? 3.0 - 1.9 * kk / 0.01 : kk < KS ? 1.1 - 0.8 * (kk - 0.01) / (KS - 0.01) : 0.2 + 0.1 * Math.exp(-(kk - KS) / 0.08);
      return kk < 0.04 ? 3.0 - 2.7 * kk / 0.04 : 0.2 + 0.1 * Math.exp(-(kk - 0.04) / 0.08);
    }
    function render() {
      Array.prototype.forEach.call(cyc, function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-cycle') === cycle)); });
      var v = V(k); mark.setAttribute('y1', Y(v)); mark.setAttribute('y2', Y(v)); markT.setAttribute('y', Y(v) + 4);
      sei.setAttribute('width', seiW); setSvgText(seiT, seiW > 4 ? 'SEI' : '');
      var stored = cycle === 1 ? Math.max(0, k - KS) : k * (1 - locked), w = bw;
      bG.setAttribute('width', w * stored); bS.setAttribute('x', bx + w * stored); bS.setAttribute('width', w * locked); bP.setAttribute('x', bx + w * (stored + locked)); bP.setAttribute('width', Math.max(0, w * (1 - stored - locked)));
      var below = v < 1.1;
      read.innerHTML = (cycle === 1 ? 'First charge. ' : 'Second charge. ') + 'The graphite is at about <b>' + v.toFixed(1) + ' V</b> vs Li/Li⁺. ' +
        (!below ? 'Still inside the window where the electrolyte is stable: nothing reacts at the surface.' :
          cycle === 1 ? (locked < KS - 1e-6 ? 'Below the lower edge of the window the electrolyte is reduced at the graphite surface; its products build a layer, and the lithium they lock up came from the positive electrode and will not come back.' : 'The layer is complete: it blocks electrons, so the electrolyte behind it is protected, but it lets Li⁺ through, and the graphite fills.') :
            'The layer formed on the first charge is already there: Li⁺ passes, electrons do not, and the large first-charge loss is not repeated.');
    }
    function tick(dt) {
      if (dt === 0) return;
      k += dt / 12; if (k > 1) { k = 1; }
      var v = V(k);
      if (cycle === 1 && v < 1.1 && locked < KS) {
        locked = Math.min(KS, Math.max(0, k - 0.01) * KS / (KS - 0.01)); seiW = 14 * locked / KS;
        var m = mols[(Math.random() * mols.length) | 0];
        if (m.state === 'free' && Math.random() < dt * 2) { m.state = 'hit'; m.t = 0; }
      }
      mols.forEach(function (m, j) {
        if (m.state === 'hit') { m.t += dt; m.x = lerp(m.x, gx1 + seiW + 8, 0.08); if (m.t > 1.2) { m.state = 'gone'; m.e.style.display = 'none'; eHit.style.display = 'none'; } else { eHit.style.display = ''; eHit.setAttribute('cx', gx1 + seiW + 2); eHit.setAttribute('cy', m.y); } }
        else if (m.state === 'free') { m.x += Math.sin((k * 40) + j) * 0.3; }
        m.e.setAttribute('cx', m.x); m.e.setAttribute('cy', m.y);
      });
      var ok = v < 1.1 ? 1 : 0, ph = (k * 9) % 1; // our ion keeps crossing into the graphite
      our.move(lerp(ex1 - 20, gx1 - 14, smooth(ph)), 150 + Math.sin(ph * 6) * 4);
      render();
    }
    Array.prototype.forEach.call(cyc, function (b) { on(b, 'click', function () { cycle = +b.getAttribute('data-cycle'); k = 0; if (cycle === 1) { seiW = 0; locked = 0; mols.forEach(function (m) { m.state = 'free'; m.e.style.display = ''; }); } else { seiW = 14; locked = 0.12; mols.forEach(function (m, j) { if (j % 2) { m.state = 'gone'; m.e.style.display = 'none'; } }); } render(); }); });
    steps(fig, [
      { text: 'A lithium-ion cell is <b>built discharged</b>: all the movable lithium starts in the positive electrode and the graphite starts empty. Press Play to charge it for the first time; the white bar on the right is the graphite’s potential.' },
      { text: 'As lithium arrives, the graphite’s potential falls toward 0.2 V vs Li/Li⁺, <b>below the lower edge</b> of the window in which the carbonate electrolyte is stable (about 1.1 V).' },
      { text: 'Below that edge, the electrolyte is reduced at the graphite surface, and the products build a thin layer: the <b>solid-electrolyte interphase</b>, or SEI. Once it is thick enough it is <b>electronically insulating but passes Li⁺</b>, so it stops further reduction while the graphite keeps filling.' },
      { text: 'The bar shows the price: the lithium locked in the SEI came from the positive electrode and does not come back. Press <b>Second charge</b>: the layer is already there, so the big first-charge loss is not repeated. The layer keeps evolving slowly as the cell cycles (module 10).' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.6, onPlay: function () { if (k >= 1) { k = 0; if (cycle === 1) { seiW = 0; locked = 0; mols.forEach(function (m) { m.state = 'free'; m.e.style.display = ''; }); } } } });
    if (!motion) { k = 1; seiW = 14; locked = 0.12; mols.forEach(function (m, j) { if (j % 3 === 0) { m.state = 'gone'; m.e.style.display = 'none'; } }); }
    render(); bind(fig, loop);
  });

  /* ===== 6.4 Three hosts, three kinds of path ===== */
  register('f6-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    /* isometric drawing of a unit box per host; x and z run along the floor, y up */
    var S = 118, c30 = Math.cos(Math.PI / 6), s30 = 0.5;
    function P(o, x, y, z) { return { x: o.x + (x - z) * c30 * S * 0.62, y: o.y - y * S * 0.78 + (x + z) * s30 * S * 0.62 }; }
    function poly(gp, o, pts, a) { el('path', Object.assign({ d: pts.map(function (p, k) { var q = P(o, p[0], p[1], p[2]); return (k ? 'L' : 'M') + q.x.toFixed(1) + ',' + q.y.toFixed(1); }).join(' ') + ' Z' }, a), gp); }
    function seg(gp, o, A, B, a) { var p = P(o, A[0], A[1], A[2]), q = P(o, B[0], B[1], B[2]); return el('line', Object.assign({ x1: p.x, y1: p.y, x2: q.x, y2: q.y }, a), gp); }
    function plane(gp, o, y, a) { poly(gp, o, [[0, y, 0], [1, y, 0], [1, y, 1], [0, y, 1]], a); }
    function cross(gp, x, y) { el('path', { d: 'M' + (x - 6) + ',' + (y - 6) + ' L' + (x + 6) + ',' + (y + 6) + ' M' + (x + 6) + ',' + (y - 6) + ' L' + (x - 6) + ',' + (y + 6), stroke: 'var(--heat)', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, gp); }
    var cols = [88, 260, 432], oy = 142;
    var heads = [['layered', 'LiCoO₂', '2D: within planes'], ['spinel', 'LiMn₂O₄', '3D: a network'], ['olivine', 'LiFePO₄', '1D: channels']];
    heads.forEach(function (h, i) { txt(g, cols[i], 20, h[0], 'strong', 'middle'); txt(g, cols[i], 36, h[1], '', 'middle'); txt(g, cols[i], 262, h[2], 'amber', 'middle'); badge(g, cols[i] + 70, 26, i + 1); });
    var O = cols.map(function (cx) { return { x: cx, y: oy }; });
    var frame = { fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' };
    // 1. layered: oxide slabs (solid) and lithium planes (dashed amber) between them
    var gA = el('g', {}, g), oA = O[0];
    [0, 0.5, 1].forEach(function (y) { plane(gA, oA, y, { fill: 'var(--amber-2)', 'fill-opacity': '.28', stroke: 'var(--amber-2)' }); });
    [0.25, 0.75].forEach(function (y) { plane(gA, oA, y, { fill: 'var(--cation)', 'fill-opacity': '.08', stroke: 'var(--cation)', 'stroke-dasharray': '4 3' }); });
    var a1 = P(oA, 0.15, 0.25, 0.5), a2 = P(oA, 0.85, 0.25, 0.5), a3 = P(oA, 0.5, 0.25, 0.15), a4 = P(oA, 0.5, 0.25, 0.85);
    arrow(gA, a1.x, a1.y, a2.x, a2.y, 'var(--cation)', 1.6); arrow(gA, a2.x, a2.y, a1.x, a1.y, 'var(--cation)', 1.6);
    arrow(gA, a3.x, a3.y, a4.x, a4.y, 'var(--cation)', 1.6); arrow(gA, a4.x, a4.y, a3.x, a3.y, 'var(--cation)', 1.6);
    var v1 = P(oA, 0.9, 0.27, 0.9), v2 = P(oA, 0.9, 0.73, 0.9); el('line', { x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y, stroke: 'var(--heat)', 'stroke-dasharray': '3 3' }, gA); cross(gA, (v1.x + v2.x) / 2, (v1.y + v2.y) / 2);
    // 2. spinel: a three-dimensional network of paths
    var gB = el('g', {}, g), oB = O[1];
    [0, 0.5, 1].forEach(function (u) { [0, 0.5, 1].forEach(function (v) {
      seg(gB, oB, [0, u, v], [1, u, v], { stroke: 'var(--cation)', 'stroke-opacity': '.55', 'stroke-width': 1.6 });
      seg(gB, oB, [u, 0, v], [u, 1, v], { stroke: 'var(--cation)', 'stroke-opacity': '.55', 'stroke-width': 1.6 });
      seg(gB, oB, [u, v, 0], [u, v, 1], { stroke: 'var(--cation)', 'stroke-opacity': '.55', 'stroke-width': 1.6 });
    }); });
    [0, 0.5, 1].forEach(function (u) { [0, 0.5, 1].forEach(function (v) { [0, 0.5, 1].forEach(function (w) { var q = P(oB, u, v, w); el('circle', { cx: q.x, cy: q.y, r: 3.2, fill: 'var(--amber-2)', 'fill-opacity': '.8' }, gB); }); }); });
    // 3. olivine: parallel channels along x only
    var gC = el('g', {}, g), oC = O[2];
    [0.2, 0.5, 0.8].forEach(function (y) { [0.2, 0.5, 0.8].forEach(function (z) { var p = P(oC, 0, y, z), q = P(oC, 1, y, z); el('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: 'var(--amber-2)', 'stroke-opacity': '.35', 'stroke-width': 11, 'stroke-linecap': 'round' }, gC); el('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: 'var(--cation)', 'stroke-opacity': '.6', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }, gC); }); });
    var w1 = P(oC, 0.62, 0.5, 0.5), w2 = P(oC, 0.62, 0.8, 0.5); el('line', { x1: w1.x, y1: w1.y, x2: w2.x, y2: w2.y, stroke: 'var(--heat)', 'stroke-dasharray': '3 3' }, gC); cross(gC, (w1.x + w2.x) / 2, (w1.y + w2.y) / 2);
    [oA, oB, oC].forEach(function (o, i) { [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]].forEach(function (b) { seg([gA, gB, gC][i], o, b, [b[0], 1, b[2]], frame); }); });
    // the moving ions
    var ionA = el('circle', { r: 5.5, 'class': 'ion' }, g), ionB = ourIon(g, 0, 0, 5.5, 'our ion', true), ionC = el('circle', { r: 5.5, 'class': 'ion' }, g);
    var pa = { x: 0.5, z: 0.5, tx: 0.8, tz: 0.3 }, pb = { p: [0.5, 0.5, 0.5], q: [1, 0.5, 0.5], k: 0 }, t = 0;
    function place() {
      var a = P(oA, pa.x, 0.25, pa.z); ionA.setAttribute('cx', a.x); ionA.setAttribute('cy', a.y);
      var pp = [lerp(pb.p[0], pb.q[0], pb.k), lerp(pb.p[1], pb.q[1], pb.k), lerp(pb.p[2], pb.q[2], pb.k)], b = P(oB, pp[0], pp[1], pp[2]); ionB.move(b.x, b.y);
      var c = P(oC, 0.5 + 0.42 * Math.sin(t * 0.9), 0.5, 0.5); ionC.setAttribute('cx', c.x); ionC.setAttribute('cy', c.y);
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      // layered: wander anywhere within the plane
      var dx = pa.tx - pa.x, dz = pa.tz - pa.z, d = Math.hypot(dx, dz);
      if (d < 0.02) { pa.tx = 0.12 + Math.random() * 0.76; pa.tz = 0.12 + Math.random() * 0.76; } else { pa.x += dx / d * dt * 0.35; pa.z += dz / d * dt * 0.35; }
      // spinel: along the network, turning at the nodes in any of the three directions
      pb.k += dt * 1.1;
      if (pb.k >= 1) { pb.p = pb.q; pb.k = 0; var opts = []; for (var ax = 0; ax < 3; ax++) [-0.5, 0.5].forEach(function (st) { var n = pb.p.slice(); n[ax] += st; if (n[ax] >= -0.01 && n[ax] <= 1.01) opts.push(n); }); pb.q = opts[(Math.random() * opts.length) | 0]; }
      place();
    }
    steps(fig, [
      { text: '<b>Layered</b> oxides such as LiCoO₂: the lithium moves in <b>two dimensions</b>, anywhere within its plane between two oxide layers, but not across an oxide layer (red cross).' },
      { text: '<b>Spinel</b> LiMn₂O₄: the framework leaves a <b>three-dimensional</b> network of paths, so the ion can turn up, down and sideways at every junction.' },
      { text: '<b>Olivine</b> LiFePO₄: <b>one-dimensional</b> channels, all parallel; the ion can only go back and forth along its channel, not across to the next. A blocked channel is a dead end, which is one reason why small particles matter (module 8).' }
    ]);
    read.innerHTML = 'Three hosts, three kinds of path: a plane (2D), a network (3D) and a channel (1D). Each block is a schematic piece of the structure; the real frameworks are polyhedra.';
    place();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.3 });
    bind(fig, loop);
  });

  /* ===== 6.5 Timeline, 1972 to 1996 ===== */
  register('f6-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 34, x1 = 486, yA = 54, X = function (yr) { return x0 + (yr - 1971) / (1997 - 1971) * (x1 - x0); };
    var ev = [
      { yr: 1972, y: 36, an: 'start', note: 'Layered TiS₂ singled out as a positive electrode; the recipe for an intercalation electrode set out.', a: 'Belgirate, 1972', b: 'Steele; Armand', txt: '1972, a NATO conference at Belgirate: Steele singles out the layered dichalcogenides such as TiS₂ as positive electrodes (Rüdorff, Rouxel and co-workers had shown alkali metals entering them fast), and Armand sets out what an intercalation electrode needs and proposes putting cations into graphite.' },
      { yr: 1976, y: 222, an: 'middle', note: 'Lithium goes in and out of TiS₂ at about 2.2 V; Exxon’s lithium-metal cell later fails on dendrites.', a: 'Li vs TiS₂, 2.2 V', b: 'Whittingham; Steele', txt: '1976: Whittingham at Exxon, and Steele and co-workers, show lithium going rapidly and reversibly into TiS₂ against a lithium-metal electrode, at about 2.2 V. Exxon showed a 45 Wh cell in 1977, but dendrites grew across to the positive electrode, the shorts ignited the electrolyte, and the programme was abandoned.' },
      { yr: 1978.5, y: 268, an: 'middle', note: 'Two insertion electrodes, no lithium metal: the first rocking-chair cell, LiₓWO₂ against TiS₂.', a: 'the rocking chair', b: 'Armand; Lazzari, Scrosati', txt: 'Late 1970s: Armand proposes the rocking-chair cell, two insertion electrodes at different potentials, to get rid of lithium-metal dendrites. Lazzari and Scrosati build one almost at once, LiₓWO₂ against TiS₂: about 2 V and 70 good cycles. In 1978 Armand also proposes polymer electrolytes (module 7) and, in a patent, graphite as the negative host.' },
      { yr: 1980, y: 128, an: 'end', note: 'Over half the lithium comes out of LiCoO₂ reversibly, at about 4 V: cells can be built discharged.', a: 'LiCoO₂, 4 V', b: 'Goodenough', txt: '1979 to 1980: Goodenough’s group finds that over half of the lithium can be taken reversibly out of layered LiCoO₂, at about 4 V vs Li/Li⁺, twice TiS₂. A cell can now be built discharged, with all its lithium in the positive electrode.' },
      { yr: 1983, y: 82, an: 'middle', note: 'Petroleum coke cycles in a carbonate electrolyte; carbon against LiCoO₂ is proposed.', a: 'carbon negative', b: 'Yoshino; Yazami', txt: '1983: Yoshino cycles petroleum coke in a propylene-carbonate electrolyte and proposes soft carbon against LiCoO₂, the building blocks of today’s cell; Yazami and Touzain insert lithium into graphite electrochemically. LiMn₂O₄ follows the same year.' },
      { yr: 1990, y: 36, an: 'end', note: 'Ethylene carbonate forms a protective film on graphite, mostly on the first charge.', a: 'EC protects graphite', b: 'Fong, von Sacken, Dahn', txt: '1990: with ethylene carbonate in the electrolyte, a protective, Li⁺-conducting film forms on graphite during the first insertion only; after that, intercalation is fully reversible. The SEI of figure 6.3.' },
      { yr: 1991, y: 222, an: 'end', note: 'Carbon against LiCoO₂ goes on sale: about 80 Wh/kg, ahead of every other rechargeable.', a: 'Sony, June 1991', b: '80 Wh/kg, 200 Wh/L', txt: 'June 1991: Sony puts the carbon | LiCoO₂ cell on the market, after Yoshino’s 1986 safety tests showed it more tolerant of abuse than lithium-metal cells: about 80 Wh/kg and 200 Wh/L, ahead of every rechargeable of the day.' },
      { yr: 1993, y: 128, an: 'start', note: 'LiPF₆ in EC/DMC becomes the standard electrolyte.', a: 'LiPF₆ in EC/DMC', b: 'Guyomard, Tarascon', txt: '1993: Guyomard and Tarascon propose LiPF₆ in ethylene carbonate and dimethyl carbonate, which became the standard electrolyte. With it, LiCoO₂ cells have reached about 250 Wh/kg and 600 Wh/L (2020), three times Sony’s first.' },
      { yr: 1996, y: 268, an: 'end', note: 'LiFePO₄ is proposed; a carbon coating makes it work.', a: 'LiFePO₄', b: 'Goodenough; Armand', txt: '1996: Goodenough’s group proposes LiFePO₄; Armand and co-workers make it work by coating the particles with carbon (module 8). By 2020 it was produced in thousands of tonnes a year.' }
    ];
    el('line', { x1: x0, x2: x1, y1: yA, y2: yA, stroke: 'var(--line-2)', 'stroke-width': 2 }, g);
    var dots = ev.map(function (e, i) {
      var x = X(e.yr), d = el('circle', { cx: x, cy: yA, r: 6, fill: 'var(--panel-2)', stroke: 'var(--amber)', 'stroke-width': 2 }, g);
      txt(g, x, i % 2 ? yA + 24 : yA - 14, e.yr === 1978.5 ? 'late 1970s' : String(e.yr), '', 'middle');
      return d;
    });
    badge(g, x1 + 10, yA - 30, 1);
    // the event card
    el('rect', { x: 24, y: 96, width: 472, height: 150, rx: 12, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    var pointer = el('path', { fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    var cYear = txt(g, 48, 140, '', 'amber', 'start', { style: 'font-size:30px;font-weight:700' });
    var cTitle = txt(g, 150, 128, '', 'strong', 'start', { style: 'font-size:17px' });
    var cWho = txt(g, 150, 150, '', 'cyan', 'start', { style: 'font-size:13px' });
    var cNote = [txt(g, 48, 186, '', '', 'start', { style: 'font-size:13px' }), txt(g, 48, 206, '', '', 'start', { style: 'font-size:13px' }), txt(g, 48, 226, '', '', 'start', { style: 'font-size:13px' })];
    var cur = 0;
    function wrap(str, n) { var w = str.split(' '), lines = [''], k = 0; w.forEach(function (x) { if ((lines[k] + ' ' + x).trim().length > n) { k++; lines[k] = ''; } lines[k] = (lines[k] + ' ' + x).trim(); }); return lines; }
    function show(i) {
      cur = i; var e = ev[i], x = X(e.yr);
      dots.forEach(function (d, k) { d.setAttribute('fill', k === i ? 'var(--amber)' : k < i ? 'var(--amber-2)' : 'var(--panel-2)'); d.setAttribute('r', k === i ? 8 : 6); });
      pointer.setAttribute('d', 'M' + (x - 8) + ',96.5 L' + x + ',' + (yA + 10) + ' L' + (x + 8) + ',96.5 Z');
      setSvgText(cYear, e.yr === 1978.5 ? '1970s' : String(e.yr)); setSvgText(cTitle, e.a); setSvgText(cWho, e.b);
      var lines = wrap(e.note, 62); cNote.forEach(function (t2, k) { setSvgText(t2, lines[k] || ''); });
      read.innerHTML = e.txt;
    }
    var st = steps(fig, ev.map(function (e, i) { return { text: '<b>' + (e.yr === 1978.5 ? 'Late 1970s' : e.yr) + '.</b> ' + e.a + '.', on: function () { show(i); } }; }));
    var acc = 0, loop = anim(fig, function (dt) { if (dt === 0) return; acc += dt; if (acc > 5) { acc = 0; st.go((cur + 1) % ev.length); } }, { autoplay: true, stepDt: 5 });
    bind(fig, loop);
  });


  /* =================================================================
     Module 6: the two hosts in three dimensions, with the ball-and-stick
     renderer of figs-7m.js.
     Graphite after Nagendra et al. 2026 (R58): hexagonal graphene layers held by
     van der Waals forces, ABAB stacking, 0.335 nm between layers, C-C 0.14 nm
     (their Fig. 2a), staging from stage 4 to stage 1 with the stage the number of
     graphene layers between lithium planes, LiC12 (stage 2) and LiC6 (stage 1), the
     Rudorff-Hofmann picture of full lithium layers (their Fig. 4), lithium entering
     at the edge planes, about 10 % volume expansion mostly along the stacking axis.
     LiC6: one lithium per six carbons (Goodenough and Park 2013, R6). Drawn from the
     standard crystal structure, not yet from a source in hand (FLAG in the
     verification record): lithium over every third ring centre, AA stacking across a
     gap that holds lithium, and that gap 0.370 nm wide.
     LiCoO2: lithium between two octahedral CoO2 sheets (Zhang et al. 2020, R47),
     about half of it used (R2, R6). Cell dimensions from the standard structure
     (a = 0.282 nm, sheets 0.468 nm apart), also flagged.
     Drawn to scale within each view (the LiCoO₂ view is magnified 1.3 times).
     ================================================================= */
  var M6_A = 2.46, M6_S3 = Math.sqrt(3), M6_D0 = 3.35, M6_DLI = 3.70, M6_X = 10.5, M6_Z = 2.6;
  /* graphite: nS sheets; filled[g] true when gap g (between sheet g-1 and g) holds lithium.
     Stacking: the next sheet shifts by one C-C bond across an empty gap (ABAB) and keeps its
     position across a filled gap (AA). Returns atoms, bonds, lithium sites and layer heights. */
  function m6graphiteStage(nS, filled) {
    var atoms = [], bonds = [], sites = [], ys = [0], shift = [0], letters = ['A'];
    for (var g = 1; g < nS; g++) { ys.push(ys[g - 1] + (filled[g] ? M6_DLI : M6_D0)); shift.push(filled[g] ? shift[g - 1] : 1 - shift[g - 1]); letters.push(shift[g] ? 'B' : 'A'); }
    var mid = ys[nS - 1] / 2; ys = ys.map(function (y) { return y - mid; });
    var dx = M6_A / 2, dz = M6_A / (2 * M6_S3);
    ys.forEach(function (y, k) {
      var start = atoms.length, ox = shift[k] * dx, oz = shift[k] * dz;
      for (var i = -9; i <= 9; i++) for (var j = -4; j <= 4; j++) {
        var x0 = i * M6_A + j * M6_A / 2 + ox, z0 = j * M6_A * M6_S3 / 2 + oz;
        [[x0, z0], [x0 + dx, z0 + dz]].forEach(function (p) { if (Math.abs(p[0]) <= M6_X && Math.abs(p[1]) <= M6_Z) atoms.push({ e: 'C', p: [p[0], y, p[1]] }); });
      }
      for (var m = start; m < atoms.length; m++) for (var n = m + 1; n < atoms.length; n++) { var A = atoms[m].p, B = atoms[n].p; if (Math.hypot(A[0] - B[0], A[2] - B[2]) < 1.5) bonds.push([m, n, 1]); }
    });
    for (g = 1; g < nS; g++) {
      if (!filled[g]) continue;
      var yl = (ys[g - 1] + ys[g]) / 2, ox2 = shift[g] * dx, oz2 = shift[g] * dz;
      for (var i2 = -9; i2 <= 9; i2++) for (var j2 = -4; j2 <= 4; j2++) {
        if (((i2 - j2) % 3 + 3) % 3 !== 0) continue; // every third ring centre: one Li per six C in a full layer
        var x = i2 * M6_A + j2 * M6_A / 2 + ox2, z = j2 * M6_A * M6_S3 / 2 + M6_A / M6_S3 + oz2;
        if (Math.abs(x) <= M6_X - 0.6 && Math.abs(z) <= M6_Z) sites.push([x, yl, z]);
      }
    }
    return { atoms: atoms, bonds: bonds, sites: sites, ys: ys, letters: letters };
  }
  /* LiCoO2: three CoO2 sheets 4.68 A apart, Co-O 1.92 A, lithium octahedral between sheets */
  function m6lcoSheets() {
    var a = 2.82, atoms = [], bonds = [], sites = [], ys = [-4.68, 0, 4.68], h = 1.02;
    var P3 = [[0, 0], [a / 2, a / (2 * M6_S3)], [a, a / M6_S3]];
    function lay(e, y, off) { var idx = []; for (var i = -8; i <= 8; i++) for (var j = -3; j <= 3; j++) { var x = i * a + j * a / 2 + off[0], z = j * a * M6_S3 / 2 + off[1]; if (Math.abs(x) <= 8.4 && Math.abs(z) <= 1.7) { atoms.push({ e: e, p: [x, y, z] }); idx.push(atoms.length - 1); } } return idx; }
    var slabs = [[2, 0, 1], [0, 1, 2], [1, 2, 0]];
    ys.forEach(function (y, k) {
      var sl = slabs[k], co = lay('Co', y, P3[sl[1]]), ob = lay('O', y - h, P3[sl[0]]), ot = lay('O', y + h, P3[sl[2]]);
      co.forEach(function (c) { ob.concat(ot).forEach(function (o) { var A = atoms[c].p, B = atoms[o].p; if (Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) < 2.05) bonds.push([c, o, 1]); }); });
    });
    [0, 1].forEach(function (k) {
      var below = slabs[k][2], above = slabs[k + 1][0], pos = [0, 1, 2].filter(function (q) { return q !== below && q !== above; })[0], y = (ys[k] + ys[k + 1]) / 2;
      for (var i = -8; i <= 8; i++) for (var j = -3; j <= 3; j++) { var x = i * a + j * a / 2 + P3[pos][0], z = j * a * M6_S3 / 2 + P3[pos][1]; if (Math.abs(x) <= 8.0 && Math.abs(z) <= 1.7) sites.push([x, y, z]); }
    });
    return { atoms: atoms, bonds: bonds, sites: sites, ys: ys };
  }

  /* ===== 6.2 The two hosts, atom by atom: graphite stages, and LiCoO2 ===== */
  register('f6-2', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout');
    var hostB = fig.querySelectorAll('button[data-host]'), stB = fig.querySelectorAll('button[data-stage]'), rowG = fig.querySelector('.row-g'), rowL = fig.querySelector('.row-l');
    var sl = fig.querySelector('.lco'), sv = fig.querySelector('.lco-val');
    var pfx = 'm62'; m3defs(svg, pfx);
    var g = el('g', {}, svg), stage = el('g', {}, g), S = m3scene(stage, pfx), ann = el('g', {}, g);
    var V = { yaw: 0.22, pitch: 0.16, cx: 214, cy: 150, scale: 8.6 };
    var title = txt(g, 214, 20, '', 'strong', 'middle'), sub = txt(g, 214, 37, '', '', 'middle');
    var host = 'g', st = 0, x = 1, t = 0, lis = [], frame = null;
    var STAGES = { 0: [], 4: [4], 3: [3, 6], 2: [2, 4, 6], 1: [1, 2, 3, 4, 5, 6] };
    var NAMES = { 0: 'graphite, no lithium', 4: 'stage 4', 3: 'stage 3', 2: 'stage 2: LiC₁₂', 1: 'stage 1: LiC₆' };
    function yScr(y) { return V.cy - y * V.scale * Math.cos(V.pitch); }
    function build() {
      S.clear(); while (ann.firstChild) ann.removeChild(ann.firstChild); lis = [];
      V.scale = host === 'g' ? 8.6 : 11.5;
      var xr = V.cx + (host === 'g' ? M6_X : 8.4) * V.scale + 18; // annotation column to the right of the drawing
      if (host === 'g') {
        var filled = {}; STAGES[st].forEach(function (k) { filled[k] = true; });
        frame = m6graphiteStage(7, filled);
        S.add({ atoms: frame.atoms, bonds: frame.bonds });
        frame.sites.forEach(function (p) { var m = S.add({ atoms: [{ e: 'Li', p: p }], bonds: [] }); m.home = p; m.k = 0; m.delay = (M6_X - p[0]) / (2 * M6_X) * 0.8; lis.push(m); });
        // stacking letters on the left, gap labels on the right
        frame.ys.forEach(function (y, k) { txt(ann, V.cx - M6_X * V.scale - 22, yScr(y) + 4, frame.letters[k], 'strong', 'middle'); });
        var firstEmpty = true;
        for (var k2 = 1; k2 < frame.ys.length; k2++) {
          var y1 = yScr(frame.ys[k2 - 1]), y2 = yScr(frame.ys[k2]), ym = (y1 + y2) / 2, f = filled[k2];
          el('path', { d: 'M' + (xr - 4) + ',' + (y1 - 2) + ' H' + xr + ' V' + (y2 + 2) + ' H' + (xr - 4), fill: 'none', stroke: f ? 'var(--amber)' : 'var(--line-2)' }, ann);
          txt(ann, xr + 6, ym + 4, f ? 'lithium layer' : (firstEmpty ? 'empty gap, 0.335 nm' : 'empty gap'), f ? 'amber' : '', 'start');
          if (!f) firstEmpty = false;
        }
        setSvgText(title, NAMES[st]); setSvgText(sub, st === 0 ? 'graphene sheets, stacked A B A B' : 'lithium in every ' + (st === 1 ? '' : (st === 2 ? 'second' : st === 3 ? 'third' : 'fourth') + ' ') + 'gap');
        lis.forEach(function (m) { if (motion) { m.off = [M6_X + 3 - m.home[0], 0, 0]; m.fade = 0; m.k = -m.delay; } else { m.off = [0, 0, 0]; m.fade = 1; m.k = 1; } });
        read.innerHTML = st === 0
          ? '<b>Graphite.</b> Flat sheets of carbon (graphene), each a honeycomb of hexagonal rings with carbon atoms 0.14 nm apart, stacked 0.335 nm apart and held together by weak van der Waals forces. In natural graphite the sheets mostly alternate A, B, A, B: each is shifted by one bond from the next.'
          : st === 1
          ? '<b>Stage 1, LiC₆.</b> Every gap holds a lithium layer: one lithium for every six carbons, the full charge, 372 mAh per gram of carbon. Each change of stage is thermodynamically favoured but kinetically hindered, this last one most of all. Across each filled gap the sheets sit directly above one another (A, A) and the gap is wider; overall the graphite swells by about 10 %, mostly along the stacking direction.'
          : st === 2
          ? '<b>Stage 2, LiC₁₂.</b> Lithium in every second gap: two graphene sheets between lithium layers, half the lithium of LiC₆. Stages 2 and 3 are stable phases, and they affect the equilibrium potential.'
          : '<b>Stage ' + st + '.</b> The stage is the number of graphene sheets between two lithium layers: here ' + st + '. Lithium does not spread evenly over all the gaps at first; it fills some gaps and leaves others empty, and as charging goes on the structure passes from stage 4 to stage 1.';
      } else {
        frame = m6lcoSheets();
        S.add({ atoms: frame.atoms, bonds: frame.bonds });
        var rnd = m7rng(41);
        frame.sites.forEach(function (p) { var m = S.add({ atoms: [{ e: 'Li', p: p }], bonds: [] }); m.home = p; m.order = rnd(); m.fade = 1; lis.push(m); });
        lis.sort(function (p, q) { return p.order - q.order; });
        frame.ys.forEach(function (y) { txt(ann, xr + 6, yScr(y) + 4, 'CoO₂ sheet', '', 'start'); });
        [0, 1].forEach(function (k) { txt(ann, xr + 6, yScr((frame.ys[k] + frame.ys[k + 1]) / 2) + 4, 'lithium layer', 'amber', 'start'); });
        setSvgText(title, 'Li_{' + fmt(x, 2) + '}CoO₂'); setSvgText(sub, 'cobalt (blue) in octahedra of oxygen (red)');
        applyX();
      }
      Array.prototype.forEach.call(hostB, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-host') === host)); });
      Array.prototype.forEach.call(stB, function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-stage') === st)); });
      rowG.style.display = host === 'g' ? '' : 'none'; rowL.style.display = host === 'l' ? '' : 'none';
      S.draw(V);
    }
    function applyX() {
      var n = Math.round(x * lis.length); lis.forEach(function (m, i) { m.target = i < n ? 1 : 0; if (!motion) m.fade = m.target; }); S.draw(V);
      setSvgText(title, 'Li_{' + fmt(x, 2) + '}CoO₂'); sl.value = Math.round(x * 100); sv.textContent = 'x = ' + fmt(x, 2);
      read.innerHTML = '<b>LiCoO₂.</b> Layers of cobalt, each cobalt in an octahedron of six oxygens, form CoO₂ sheets; lithium sits in the plane between two sheets. Charging takes lithium out of those planes, x falls from 1; only about half is used (x down to about 0.5), because removing more than about 0.55 of it makes the oxide give off oxygen. Now x = ' + fmt(x, 2) + '.';
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      if (!V.held) V.yaw = 0.22 + 0.22 * Math.sin(t * 0.35);
      if (host === 'g') lis.forEach(function (m) { m.k += dt; var k = Math.max(0, Math.min(1, m.k / 0.9)); m.off = [(M6_X + 3 - m.home[0]) * (1 - smooth(k)), 0, 0]; m.fade = Math.min(1, k * 3); });
      else lis.forEach(function (m) { m.fade += ((m.target || 0) - m.fade) * Math.min(1, dt * 4); });
      S.draw(V);
    }
    Array.prototype.forEach.call(hostB, function (b) { on(b, 'click', function () { host = b.getAttribute('data-host'); build(); }); });
    Array.prototype.forEach.call(stB, function (b) { on(b, 'click', function () { st = +b.getAttribute('data-stage'); build(); }); });
    on(sl, 'input', function () { x = sl.value / 100; applyX(); });
    m3drag(svg, V, function () { S.draw(V); });
    badge(g, 30, 60, 1); badge(g, 30, 150, 2); badge(g, 30, 240, 3); badge(g, 494, 24, 4);
    steps(fig, [
      { text: '<b>Graphite</b>: sheets of carbon rings (graphene) stacked A, B, A, B, 0.335 nm apart. The letters on the left mark how each sheet sits relative to the one below.', on: function () { host = 'g'; st = 0; build(); } },
      { text: '<b>Lithium goes in by stages.</b> It goes in at the edges of the sheets, the favourable sites, and fills <b>some gaps completely while others stay empty</b>. The stage is the number of graphene sheets between two lithium layers: stage 4, then 3, then 2.', on: function () { host = 'g'; st = 4; build(); } },
      { text: 'Stage 2 is <b>LiC₁₂</b>, stage 1 is <b>LiC₆</b>: every gap full, one lithium per six carbons. Filled gaps are wider and their sheets line up A, A. Try the stage buttons in order.', on: function () { host = 'g'; st = 1; build(); } },
      { text: '<b>LiCoO₂</b>, the other host: CoO₂ sheets with lithium between them. Drag the slider: only about half of the lithium is taken out in normal use.', on: function () { host = 'l'; x = 1; build(); } }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    lis.forEach(function (m) { m.k = 1; }); tick(0.01);
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
