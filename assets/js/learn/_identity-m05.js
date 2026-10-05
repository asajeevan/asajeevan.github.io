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
