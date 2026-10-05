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

  /* figs-12.js */
  register('f12-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cs = fig.querySelector('.cool'), cv = fig.querySelector('.cool-val');
    var cx = 140, cy = 130, R = 78;
    var nodes = [{ a: -90, t: 'heat released' }, { a: 30, t: 'temperature rises' }, { a: 150, t: 'reactions speed up' }];
    var ring = el('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: 'var(--heat)', 'stroke-width': 3, 'stroke-dasharray': '6 6' }, g);
    nodes.forEach(function (n, i) {
      var x = cx + R * Math.cos(n.a * Math.PI / 180), y = cy + R * Math.sin(n.a * Math.PI / 180);
      el('rect', { x: x - 62, y: y - 13, width: 124, height: 26, rx: 13, fill: 'var(--panel-2)', stroke: 'var(--heat)' }, g);
      txt(g, x, y + 4, n.t, 'strong', 'middle');
    });
    var spin = el('circle', { r: 6, fill: 'var(--heat)' }, g);
    var coolA = arrow(g, cx + R + 6, cy - 10, cx + R + 52, cy - 10, '#83DBD0', 3), coolT = txt(g, cx + R + 30, cy + 14, 'heat', 'cyan', 'middle'); txt(g, cx + R + 30, cy + 28, 'removed', 'cyan', 'middle');
    // schematic temperature traces
    var x0 = 300, x1 = 500, y0 = 230, y1 = 64;
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    txt(g, x1, y0 + 16, 'time', '', 'end'); txt(g, x0 + 4, y1 - 8, 'cell temperature', '', 'start'); txt(g, x1, y1 - 8, 'schematic', '', 'end');
    var tr = el('path', { fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2.4 }, g), trT = txt(g, x1, 0, '', 'strong', 'end');
    badge(g, cx, cy - R - 26, 1); badge(g, cx + R + 30, cy - 32, 2); badge(g, x1 - 8, y1 + 14, 3);
    var ph = 0;
    function render() {
      var c = +cs.value / 100; setSvgText(cv, c < 0.27 ? 'weak' : c < 0.67 ? 'moderate' : 'strong');
      coolA.setAttribute('stroke-width', String(1 + 4 * c));
      // dT/dt = G exp(k T) - c T, integrated: a drawing device to show the two outcomes, not a cell model
      var T = 0, d = 'M' + x0 + ',' + y0, run = false, k;
      for (k = 1; k <= 120; k++) { T += 0.05 * (0.6 * Math.exp(0.9 * T) - (0.3 + 1.4 * c) * T * 2.2); if (T > 3.4) { run = true; T = 3.4; } d += ' L' + (x0 + k / 120 * (x1 - x0)).toFixed(1) + ',' + (y0 - T / 3.4 * (y0 - y1)).toFixed(1); if (run) break; }
      if (!run && (0.3 + 1.4 * c) * 2.2 < 0.54 * Math.E) run = true; // no steady state: it would still run away
      tr.setAttribute('d', d); trT.setAttribute('y', run ? y1 + 40 : y0 - T / 3.4 * (y0 - y1) - 8); setSvgText(trT, run ? 'runaway' : 'levels off');
      ring.setAttribute('stroke-opacity', run ? '1' : '.35');
      read.innerHTML = run ? 'Cooling too weak: the heat from the reactions raises the temperature faster than it can leave, the reactions speed up, and the loop feeds itself: <b>thermal runaway</b>.' : 'Cooling strong enough: heat leaves as fast as the reactions make it, and the temperature settles. The loop is there, but it does not close.';
    }
    on(cs, 'input', render);
    steps(fig, [
      { text: 'Let us start with the loop. Thermal runaway is what happens when the reaction of an electrode with the electrolyte becomes <b>self-sustaining</b>: the heat it releases speeds it up, which releases more heat. An autocatalytic loop.' },
      { text: 'What breaks the loop is <b>heat removal</b>. The heat is released inside the cell, at the electrode surfaces, so a cell meant for high currents must be built to shed it. Slide the cooling down and watch the loop close.' },
      { text: 'The curve on the right is only a drawing device with two outcomes: the temperature levels off, or it runs away. It carries no numbers, because we have none for a real cell.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph += dt * 1.6; spin.setAttribute('cx', cx + R * Math.cos(ph - Math.PI / 2)); spin.setAttribute('cy', cy + R * Math.sin(ph - Math.PI / 2)); }, { autoplay: true, stepDt: 0.4 });
    spin.setAttribute('cx', cx); spin.setAttribute('cy', cy - R);
    bind(fig, loop);
  });
  register('f12-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), ab = fig.querySelectorAll('button[data-abuse]');
    var layers = [
      { k: 'bms', t: 'electronics: watch every cell', s: 'stop at the voltage limits; limit the current' },
      { k: 'cid', t: 'pressure switch in the cap', s: 'cuts the charging current when the pressure rises' },
      { k: 'shut', t: 'shutdown separator', s: 'loses its porosity when it gets hot: no more ions' },
      { k: 'coat', t: 'ceramic-coated separator', s: 'Al₂O₃ coating that dendrites cannot cross' },
      { k: 'add', t: 'additives in the electrolyte', s: 'react above the working voltage to limit or cut the charge' },
      { k: 'chem', t: 'the chemistry itself', s: 'insertion electrode or polymer electrolyte: fewer dendrites' }
    ];
    var acts = {
      over: { bms: 'acts first', cid: 'backs it up', shut: 'if it heats', coat: '', add: 'can act', chem: '', txt: '<b>Overcharge.</b> The electronics are the first line: lithium cells cannot absorb overcharge, so charging is stopped at the voltage limit of every single cell. If it still goes on, the pressure-operated switch in the cap interrupts the charging current; some electrolyte additives give off gas when overcharged so as to trip it, others consume the current through a redox process or coat the positive electrode with an insulating polymer that raises its resistance.' },
      ext: { bms: 'limits current', cid: '', shut: 'acts', coat: '', add: '', chem: '', txt: '<b>Short circuit outside the cell.</b> The whole cell heats fairly evenly, which is the case a shutdown separator handles well: it closes its pores and stops the ions. The electronics also limit the current.' },
      int: { bms: 'cannot see it', cid: '', shut: 'less effective', coat: 'prevents it', add: '', chem: 'prevents it', txt: '<b>Short circuit inside the cell</b>, for instance a dendrite through the separator. The heating is local, so a shutdown separator helps much less; the electronics cannot interrupt a short that is inside. Prevention is what counts: a separator dendrites cannot cross, and an electrode that plates far less readily.' },
      over2: { bms: 'stops discharge', cid: '', shut: '', coat: '', add: '', chem: '', txt: '<b>Overdischarge.</b> Discharged down to zero volts, the negative electrode is dragged up to the potential of the positive one, about 4 V vs Li/Li⁺, where its copper current collector oxidizes and dissolves. Only the electronics prevent it, by stopping the discharge of each cell in time.' }
    };
    var y0 = 34, h = 36, rows = [];
    layers.forEach(function (L, i) {
      var y = y0 + i * (h + 5);
      var r = el('rect', { x: 20, y: y, width: 356, height: h, rx: 8, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
      txt(g, 32, y + 15, L.t, 'strong', 'start'); txt(g, 32, y + 30, L.s, '', 'start');
      var st = txt(g, 512, y + 23, '', 'amber', 'end');
      rows.push({ r: r, st: st, k: L.k });
    });
    txt(g, 20, 20, 'safeguards, from the outside in', 'strong', 'start');
    badge(g, 394, y0 + 18, 1); badge(g, 394, y0 + 18 + 2 * (h + 5), 2); badge(g, 394, y0 + 18 + 5 * (h + 5), 3);
    var mode = 'over';
    function render() {
      Array.prototype.forEach.call(ab, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-abuse') === mode)); });
      var a = acts[mode];
      rows.forEach(function (row) { var s = a[row.k]; setSvgText(row.st, s); row.r.setAttribute('stroke', s ? (/cannot|less/.test(s) ? 'var(--heat)' : 'var(--amber)') : 'var(--line-2)'); row.r.setAttribute('stroke-width', s ? 2 : 1); row.st.setAttribute('class', 'lbl ' + (/cannot|less/.test(s) ? 'heat' : 'amber')); });
      read.innerHTML = a.txt;
    }
    Array.prototype.forEach.call(ab, function (b) { on(b, 'click', function () { mode = b.getAttribute('data-abuse'); render(); }); });
    steps(fig, [
      { text: 'The outermost layer is <b>electronics</b>: in a battery of several cells in series, the voltage of every cell is watched and charge and discharge are stopped before any one of them goes over or under its limits.' },
      { text: 'Inside the cell, <b>mechanical and material safeguards</b>: a switch that opens when the pressure rises, a separator that shuts its pores when it gets hot, a ceramic coating that blocks dendrites, and additives in the electrolyte that react only when the cell is overcharged.' },
      { text: 'Innermost, the <b>chemistry</b>. Replacing lithium metal with an insertion electrode largely removed the plating that caused the internal shorts of the early cells. Try the four kinds of abuse.' }
    ]);
    render();
  });
  register('f12-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 60, x1 = 490, Tm = -60, TM = 100, X = function (T) { return x0 + (T - Tm) / (TM - Tm) * (x1 - x0); };
    el('line', { x1: x0, x2: x1, y1: 224, y2: 224, stroke: 'var(--line-2)' }, g);
    [-50, -20, 0, 40, 85].forEach(function (T) { el('line', { x1: X(T), x2: X(T), y1: 220, y2: 228, stroke: 'var(--line-2)' }, g); txt(g, X(T), 244, T + ' °C', '', 'middle'); });
    function band(a, b, y, col, lab) { el('rect', { x: X(a), y: y, width: X(b) - X(a), height: 22, rx: 4, fill: col, 'fill-opacity': '.35', stroke: col }, g); txt(g, X(a), y - 6, lab, 'strong', 'start'); }
    band(0, 40, 36, 'var(--amber)', 'consumer cells, in use');
    band(-20, 85, 86, 'var(--cyan)', 'consumer cells, in storage');
    band(-50, 85, 136, 'var(--metal)', 'military and automotive');
    txt(g, X(-50), 186, 'cold: charging fast risks lithium plating', 'cyan', 'start');
    txt(g, X(85), 206, 'warm: faster self-discharge', 'heat', 'end');
    badge(g, X(40) + 16, 47, 1); badge(g, X(85) + 16, 97, 2); badge(g, X(-50) - 16, 182, 3);
    steps(fig, [
      { text: 'Consumer cells are meant to be <b>used between about 0 and 40 °C</b>.' },
      { text: 'They can be <b>stored between −20 and 85 °C</b>; military and automotive cells must work from −50 to 85 °C.' },
      { text: 'Why the middle is kind: in the cold, a fast charge can push the graphite into <b>lithium plating</b>; in the heat, self-discharge speeds up. And at any temperature, a cell kept full and charged fast grows its SEI fastest (module 10).' }
    ]);
    read.innerHTML = 'Temperature ranges for cells of around 2004; the two notes give directions only, without numbers.';
  });
  register('f12-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    function node(x, y, w, t, s, col) { el('rect', { x: x, y: y, width: w, height: 44, rx: 8, fill: 'var(--panel-2)', stroke: col || 'var(--line-2)' }, g); txt(g, x + w / 2, y + 18, t, 'strong', 'middle'); if (s) txt(g, x + w / 2, y + 34, s, '', 'middle'); return { x: x, y: y, w: w }; }
    var a = node(20, 20, 150, 'spent cells', 'hazardous goods'), b = node(185, 20, 150, 'pre-treatment', 'discharge, dismantle'), c = node(350, 20, 150, 'crush and sort', 'sieve, density, magnet');
    var p = node(20, 120, 150, 'pyrometallurgy', 'smelt, about 1000 °C', 'var(--heat)'), h = node(185, 120, 150, 'hydrometallurgy', 'leach in acid', 'var(--cyan)'), d = node(350, 120, 150, 'direct recycling', 'keep materials whole', 'var(--amber)');
    var o1 = txt(g, 95, 190, 'Cu, Ni, Co alloy', '', 'middle'), o1b = txt(g, 95, 206, 'Li, Mn to slag', 'heat', 'middle');
    txt(g, 260, 190, 'metal salts', '', 'middle'); txt(g, 260, 206, 'high recovery, many steps', '', 'middle');
    txt(g, 425, 190, 'electrode materials', '', 'middle'); txt(g, 425, 206, 'still immature', '', 'middle');
    arrow(g, 170, 42, 183, 42, '#A3B6B1', 1.6); arrow(g, 335, 42, 348, 42, '#A3B6B1', 1.6);
    [[260, 64, 95, 118], [425, 64, 260, 118], [425, 64, 425, 118]].forEach(function (r) { arrow(g, r[0], r[1], r[2], r[3], '#A3B6B1', 1.4); });
    txt(g, 260, 244, 'back into new cells', 'amber', 'middle');
    [95, 260, 425].forEach(function (x) { arrow(g, x, 212, 260, 230, '#F0B441', 1.2); });
    var dot = ourIon(g, 95, 42, 5, '', true);
    badge(g, 20, 14, 1); badge(g, 500, 76, 2); badge(g, 20, 114, 3); badge(g, 185, 114, 4); badge(g, 350, 114, 5);
    var route = [[95, 42], [260, 42], [425, 42], [425, 90], [260, 142], [260, 220], [260, 236]], t = 0;
    function place() { var n = route.length - 1, u = (t % 1) * n, i = Math.floor(u), f = u - i, A = route[i], B = route[Math.min(n, i + 1)]; dot.move(lerp(A[0], B[0], f), lerp(A[1], B[1], f)); }
    steps(fig, [
      { text: 'Spent lithium-ion batteries are <b>hazardous goods</b>: collecting and transporting them safely, protected against short circuits and leaks, is already a large part of the cost of recycling.' },
      { text: '<b>Pre-treatment</b> makes them safe and takes them apart: discharge through a load (or in salt water for low-voltage cells), sometimes heat at 500 to 600 °C to burn off the electrolyte and plastics, dismantle packs into modules and cells, then crush, sieve and separate by density and magnetism.' },
      { text: '<b>Pyrometallurgy</b> smelts everything at about 1000 °C. Copper, nickel and cobalt come out as an alloy; lithium, manganese and titanium end up in the slag; the electrolyte, binder and carbon burn and supply energy. Robust and simple, but energy-hungry, and the lithium goes to the slag instead of being recovered.' },
      { text: '<b>Hydrometallurgy</b> dissolves the electrode materials in acid and separates the metals by precipitation, ion exchange or solvent extraction: higher recovery and lower energy, at the price of complex processing and many chemicals.' },
      { text: '<b>Direct recycling</b> recovers the electrode materials whole, for direct reuse, without strong acids. It is cheaper in principle but still immature, and how well it works depends on the health of the spent cell.' }
    ]);
    read.innerHTML = 'The recycling routes in use for lithium-ion batteries as of 2022. In Europe the most common approach combines mechanical and hydrometallurgical steps.';
    var loop = anim(fig, function (dt) { if (dt === 0) return; t += dt / 9; place(); }, { autoplay: true, stepDt: 0.5 });
    place(); bind(fig, loop);
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
