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

  /* figs-6.js */
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
  /* figs-6m.js */
  var M6_A = 2.46, M6_S3 = Math.sqrt(3), M6_D0 = 3.35, M6_DLI = 3.70, M6_X = 10.5, M6_Z = 2.6;
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
  /* figs-7a.js */
  function m7rng(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  /* figs-7m.js */
  var M3_COL = { C: ['#c3ccd3', '#5d6a73'], O: ['#ff9a8c', '#c0392b'], H: ['#ffffff', '#aab4ba'], F: ['#bff5b5', '#3e9e45'], P: ['#ffc58a', '#c76a12'], Li: ['#ffe6a3', '#d39b10'], Co: ['#a9c6ff', '#2b55b8'] };
  var M3_R = { C: 0.42, O: 0.42, H: 0.25, F: 0.4, P: 0.55, Li: 0.62, Co: 0.5 };
  function m3defs(svg, pfx) {
    var defs = el('defs', {}, svg);
    Object.keys(M3_COL).forEach(function (k) {
      var gr = el('radialGradient', { id: pfx + '-' + k, cx: '35%', cy: '30%', r: '70%' }, defs);
      el('stop', { offset: '0%', 'stop-color': M3_COL[k][0] }, gr); el('stop', { offset: '100%', 'stop-color': M3_COL[k][1] }, gr);
    });
  }
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
  function m3drag(svg, V, redraw) {
    var down = null;
    svg.style.touchAction = 'pan-y';
    on(svg, 'pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, yaw: V.yaw, pitch: V.pitch }; V.held = true; });
    on(window, 'pointerup', function () { down = null; V.held = false; });
    on(svg, 'pointermove', function (e) { if (!down) return; V.yaw = down.yaw + (e.clientX - down.x) * 0.012; V.pitch = Math.max(-1.3, Math.min(1.3, down.pitch + (e.clientY - down.y) * 0.012)); redraw(); });
  }

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
