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

  /* figs-5.js */
  function niceStep(span, n) { var raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
  /* figs-7.js */
  register('f7-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), tb = fig.querySelector('.chains');
    var W = 150, top = 46, h = 170, xs = [20, 185, 350];
    var names = [['liquid', 'organic carbonate + LiPF₆'], ['dry polymer', 'PEO + lithium salt'], ['ceramic', 'garnet']];
    xs.forEach(function (x, i) {
      el('rect', { x: x, y: top, width: W, height: h, rx: 6, fill: i === 0 ? 'var(--cyan)' : i === 1 ? 'var(--cyan-2)' : 'var(--metal)', 'fill-opacity': i === 2 ? '.18' : '.1', stroke: 'var(--line-2)' }, g);
      txt(g, x + W / 2, top - 22, names[i][0], 'strong', 'middle'); txt(g, x + W / 2, top - 8, names[i][1], '', 'middle');
      badge(g, x + W - 2, top + h + 16, i + 1);
    });
    // liquid: solvent molecules, a solvated Li+, anions; occasional ion pair
    var sol = []; for (var i = 0; i < 16; i++) sol.push({ x: xs[0] + 10 + Math.random() * 130, y: top + 10 + Math.random() * 150, e: el('ellipse', { rx: 6, ry: 3.5, fill: 'none', stroke: 'var(--cyan)', 'stroke-opacity': '.6' }, g) });
    var an1 = []; for (i = 0; i < 4; i++) an1.push({ x: xs[0] + 20 + Math.random() * 110, y: top + 20 + Math.random() * 130, c: el('circle', { r: 4, 'class': 'ion an' }, g) });
    var shell = el('circle', { r: 11, fill: 'none', stroke: 'var(--cyan)', 'stroke-dasharray': '2 2' }, g);
    var li1 = ourIon(g, xs[0] + 75, top + 85, 5, 'our ion', true), p1 = { x: xs[0] + 75, y: top + 85, vx: 14, vy: 9 };
    var pairT = txt(g, xs[0] + W / 2, top + h + 16, '', 'amber', 'middle');
    // polymer: wavy chains with coordinating sites; Li+ hops between sites as segments move
    var chains = [];
    for (i = 0; i < 4; i++) chains.push({ y: top + 30 + i * 38, p: el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2, 'stroke-opacity': '.8' }, g), ph: Math.random() * 6 });
    var an2 = []; for (i = 0; i < 3; i++) an2.push({ x: xs[1] + 30 + i * 45, y: top + 49 + (i % 2) * 76, c: el('circle', { cx: xs[1] + 30 + i * 45, cy: top + 49 + (i % 2) * 76, r: 4, 'class': 'ion an' }, g) });
    var li2 = el('circle', { r: 5, 'class': 'ion' }, g), p2 = { chain: 1, k: 0.3, tgt: 2, hop: 0 };
    // ceramic: rigid lattice with vacant Li sites
    var lat = [];
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) { var lx = xs[2] + 22 + c * 36, ly = top + 26 + r * 40; el('rect', { x: lx - 7, y: ly - 7, width: 14, height: 14, transform: 'rotate(45 ' + lx + ' ' + ly + ')', fill: 'var(--metal)', 'fill-opacity': '.7' }, g); lat.push({ x: lx + 18, y: ly + 20 }); }
    lat = lat.filter(function (p) { return p.x < xs[2] + W - 6 && p.y < top + h - 6; });
    lat.forEach(function (p) { el('circle', { cx: p.x, cy: p.y, r: 3, fill: 'none', stroke: 'var(--amber)', 'stroke-opacity': '.5', 'stroke-dasharray': '1.5 1.5' }, g); });
    var li3 = el('circle', { r: 5, 'class': 'ion' }, g), p3 = { i: 0, j: 1, k: 0 };
    var frozen = false, t = 0;
    function chainY(ch, x) { return ch.y + Math.sin(x / 9 + ch.ph) * (frozen ? 5 : 5 + 2 * Math.sin(t * 2 + ch.ph)); }
    function drawChains() { chains.forEach(function (ch) { var d = ''; for (var x = xs[1] + 6; x <= xs[1] + W - 6; x += 4) d += (d ? 'L' : 'M') + x + ',' + chainY(ch, x).toFixed(1); ch.p.setAttribute('d', d); }); }
    function render() {
      tb.setAttribute('aria-pressed', String(frozen)); setSvgText(tb, frozen ? 'Warm the polymer' : 'Cool the polymer');
      read.innerHTML = frozen
        ? 'Polymer cooled: the chain segments stop moving, and the lithium ion, which moved only with their help, stops too. The liquid and the ceramic do not depend on chain motion.'
        : 'Liquid: the ion travels inside its shell of solvent molecules and now and then pairs with an anion. Polymer: it hops between sites on the chains, carried by their wriggling. Ceramic: it moves through a framework that itself stays still.';
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      // liquid
      p1.x += p1.vx * dt; p1.y += p1.vy * dt; if (p1.x < xs[0] + 16 || p1.x > xs[0] + W - 16) p1.vx *= -1; if (p1.y < top + 16 || p1.y > top + h - 16) p1.vy *= -1;
      li1.move(p1.x, p1.y); shell.setAttribute('cx', p1.x); shell.setAttribute('cy', p1.y);
      sol.forEach(function (m, j) { m.x += Math.sin(t * 1.3 + j) * 6 * dt; m.y += Math.cos(t * 1.1 + j) * 6 * dt; m.e.setAttribute('cx', m.x); m.e.setAttribute('cy', m.y); });
      var near = false; an1.forEach(function (a, j) { a.x += Math.sin(t * 0.7 + j * 2) * 8 * dt; a.y += Math.cos(t * 0.9 + j) * 8 * dt; a.c.setAttribute('cx', a.x); a.c.setAttribute('cy', a.y); if (Math.hypot(a.x - p1.x, a.y - p1.y) < 18) near = true; });
      setSvgText(pairT, near ? 'ion pair' : '');
      // polymer
      drawChains();
      if (!frozen) {
        p2.k += dt * 0.06; if (p2.k > 0.95) p2.k = 0.05;
        p2.hop += dt; if (p2.hop > 2.4) { p2.hop = 0; p2.chain = (p2.chain + (Math.random() < 0.5 ? 1 : 3)) % 4; }
      }
      var ch = chains[p2.chain], x2 = xs[1] + 10 + p2.k * (W - 20); li2.setAttribute('cx', x2); li2.setAttribute('cy', chainY(ch, x2) + 6);
      // ceramic
      p3.k += dt / 1.1; if (p3.k >= 1) { p3.k = 0; p3.i = p3.j; var cand = lat.map(function (p, j) { return j; }).filter(function (j) { return j !== p3.i && Math.hypot(lat[j].x - lat[p3.i].x, lat[j].y - lat[p3.i].y) < 45; }); p3.j = cand[(Math.random() * cand.length) | 0]; }
      var a = lat[p3.i], b = lat[p3.j], kk = p3.k < 0.7 ? 0 : smooth((p3.k - 0.7) / 0.3);
      li3.setAttribute('cx', lerp(a.x, b.x, kk)); li3.setAttribute('cy', lerp(a.y, b.y, kk));
    }
    on(tb, 'click', function () { frozen = !frozen; render(); });
    steps(fig, [
      { text: 'In a <b>liquid</b> the lithium salt dissolves and the ion moves inside a shell of solvent molecules. Organic solvents dissolve salts less well than water, so ions also pair up, which lowers the conductivity.' },
      { text: 'In a <b>dry polymer</b> such as PEO there is no solvent: the ion is held by the oxygen atoms of the chain and hops from one coordinating site to the next as the chain segments move. Press <b>Cool the polymer</b>: frozen chains, frozen ion. This is why these cells run warm.' },
      { text: 'In a <b>ceramic</b> such as a garnet the framework is rigid and only the ion moves through it, drawn here as hops from site to site; the mechanism is not described further here.' }
    ]);
    drawChains(); render();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.4 });
    tick(0.01); bind(fig, loop);
  });
  register('f7-9', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), boxes = fig.querySelectorAll('input[type=checkbox]');
    var x0 = 62, x1 = 470, y0 = 236, y1 = 30;
    // x: 1000/T from 2.65 (104 C) to 3.45 (17 C); high temperature on the left, as in Arrhenius plots
    var ix0 = 2.65, ix1 = 3.45, X = function (inv) { return x0 + (inv - ix0) / (ix1 - ix0) * (x1 - x0); };
    var lmin = -9.8, lmax = -2.4, Y = function (l) { return y0 - (l - lmin) / (lmax - lmin) * (y0 - y1); };
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    [100, 80, 60, 40, 20].forEach(function (C) { var inv = 1000 / (C + 273.15); el('line', { x1: X(inv), y1: y0, x2: X(inv), y2: y0 + 5, stroke: 'var(--line-2)' }, g); txt(g, X(inv), y0 + 18, C + ' °C', '', 'middle'); });
    txt(g, x1, y0 + 34, 'temperature (axis linear in 1000/T)', '', 'end');
    txt(g, x0 + 6, y1 - 8, 'log conductivity: each grid line is ×10 (no absolute values)', '', 'start');
    for (var k = 1; k <= 7; k++) el('line', { x1: x0, x2: x1, y1: Y(lmin + k), y2: Y(lmin + k), stroke: 'var(--line)', 'stroke-dasharray': '2 6' }, g);
    // 80 C marker
    var i80 = 1000 / 353.15; el('line', { x1: X(i80), x2: X(i80), y1: y1 + 14, y2: y0, stroke: 'var(--heat)', 'stroke-dasharray': '4 4' }, g);
    txt(g, X(i80) - 4, y0 - 26, 'dry-polymer', 'heat', 'end'); txt(g, X(i80) - 4, y0 - 12, 'cells: 80 °C', 'heat', 'end');
    /* Series: polymer curves bend (chain motion freezes on cooling); only the ratios of R2 are kept:
       PEO-TFSI = 10 x PEO-triflate; plasticized = 10 x PEO-TFSI; gel = liquid / 3.5 (R2: 2 to 5 times). */
    function polymer(inv) { var T = 1000 / inv; return -2.6 - 520 / (T - 200); } // log10 of an illustrative curved form
    function liquid(inv) { var T = 1000 / inv; return -1.9 - 240 / (T - 150); }
    var S = [
      { key: 'liq', name: 'liquid (organic)', col: 'var(--cyan)', f: liquid },
      { key: 'gel', name: 'gel polymer', col: '#9fe3d9', f: function (i) { return liquid(i) - Math.log10(3.5); } },
      { key: 'pla', name: 'plasticized PEO-LiTFSI', col: '#C4B5F7', f: function (i) { return polymer(i) + 1; } },
      { key: 'tfsi', name: 'PEO-LiTFSI', col: 'var(--amber)', f: polymer },
      { key: 'trf', name: 'PEO-LiCF₃SO₃', col: 'var(--heat)', f: function (i) { return polymer(i) - 1; } }
    ];
    S.forEach(function (s) {
      var d = ''; for (var n = 0; n <= 120; n++) { var inv = ix0 + (ix1 - ix0) * n / 120; d += (n ? 'L' : 'M') + X(inv).toFixed(1) + ',' + Y(s.f(inv)).toFixed(1); }
      s.p = el('path', { d: d, fill: 'none', stroke: s.col, 'stroke-width': 2.2 }, g);
    });
    // ratio brackets at 40 C
    var i40 = 1000 / 313.15, br = el('g', {}, g);
    function bracket(fa, fb, lab, dx) { var ya = Y(fa(i40)), yb = Y(fb(i40)), x = X(i40) + dx; el('path', { d: 'M' + (x - 4) + ',' + ya + ' H' + x + ' V' + yb + ' H' + (x - 4), fill: 'none', stroke: 'var(--text)', 'stroke-opacity': '.6' }, br); txt(br, x + 4, (ya + yb) / 2 + 4, lab, 'strong', 'start'); }
    bracket(S[3].f, S[4].f, '×10 salt', 6); bracket(S[2].f, S[3].f, '×10 plasticizer', 6); bracket(S[0].f, S[1].f, '2 to 5×', 6);
    badge(g, X(i40) - 14, Y(S[4].f(i40)) + 14, 1); badge(g, X(i40) - 14, Y(S[2].f(i40)) - 4, 2); badge(g, X(i40) - 14, Y(S[1].f(i40)) + 10, 3); badge(g, X(i80) + 14, y0 - 22, 4);
    function render() {
      var on2 = {}; Array.prototype.forEach.call(boxes, function (b) { on2[b.value] = b.checked; });
      S.forEach(function (s) { var v = on2[s.key] !== false; s.p.style.display = v ? '' : 'none'; });
      read.innerHTML = 'Read the gaps, not the heights: each grid line is a factor of ten. At the same temperature PEO-LiTFSI conducts about ten times better than PEO-LiCF₃SO₃, a plasticized PEO-LiTFSI ten times better again, and a gel 2 to 5 times less than the liquid it holds.';
    }
    Array.prototype.forEach.call(boxes, function (b) { on(b, 'change', render); });
    steps(fig, [
      { text: 'The two lowest curves are dry PEO with two different salts. Changing the salt from LiCF₃SO₃ (triflate) to LiTFSI gains about <b>an order of magnitude</b>.' },
      { text: 'Adding 10 to 25 % of a plasticizer to the polymer gains <b>another order of magnitude</b>: the lilac curve.' },
      { text: 'A <b>gel</b>, 60 to 95 % liquid held in a polymer, comes within <b>2 to 5 times</b> of the liquid itself: the two top curves.' },
      { text: 'The dashed red line: dry-polymer lithium cells need warming, up to about <b>80 °C</b>, to bring the polymer to a useful conductivity.' }
    ]);
    render();
  });
  register('f7-10', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), ts = fig.querySelector('.tplus'), tv = fig.querySelector('.tplus-val');
    var xL = 70, xR = 450, y0 = 60, y1 = 170;
    el('rect', { x: xL - 22, y: y0 - 6, width: 22, height: y1 - y0 + 12, fill: 'var(--metal)' }, g); el('rect', { x: xR, y: y0 - 6, width: 22, height: y1 - y0 + 12, fill: 'var(--amber-2)' }, g);
    el('rect', { x: xL, y: y0, width: xR - xL, height: y1 - y0, fill: 'var(--cyan)', 'fill-opacity': '.08' }, g);
    txt(g, xL - 11, y1 + 26, 'Li⁺ released', '', 'middle'); txt(g, xR + 11, y1 + 26, 'Li⁺ taken in', '', 'middle');
    arrow(g, 220, y0 - 16, 300, y0 - 16, '#C4B5F7', 1.4); txt(g, 260, y0 - 24, 'field in the electrolyte', 'field', 'middle');
    txt(g, 260, y1 + 26, 'electrolyte: Li⁺ and its anion', 'cyan', 'middle');
    var cats = [], ans = [];
    for (var i = 0; i < 14; i++) { cats.push({ x: xL + 10 + Math.random() * (xR - xL - 20), y: y0 + 8 + Math.random() * (y1 - y0 - 16), c: el('circle', { r: 4, 'class': 'ion' }, g) }); ans.push({ x: xL + 10 + Math.random() * (xR - xL - 20), y: y0 + 8 + Math.random() * (y1 - y0 - 16), c: el('circle', { r: 4, 'class': 'ion an' }, g) }); }
    var our = ourIon(g, 0, 0, 5, 'our ion', true); cats[0].our = true; cats[0].c.style.display = 'none';
    // share of the current
    var bx = 110, bw = 300, by = 214;
    var bLi = el('rect', { x: bx, y: by, height: 14, fill: 'var(--cation)' }, g), bAn = el('rect', { y: by, height: 14, fill: 'var(--anion)' }, g);
    var tLi = txt(g, bx, by + 30, '', 'amber', 'start'), tAn = txt(g, bx + bw, by + 30, '', '', 'end');
    txt(g, bx - 8, by + 12, 'current', '', 'end');
    // salt concentration profile, steady state, computed
    var px0 = xL, px1 = xR, py = 300, ph = 50;
    el('line', { x1: px0, x2: px1, y1: py, y2: py, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
    txt(g, px0 - 8, py + 4, 'c₀', '', 'end');
    var prof = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), fillP = el('path', { fill: 'var(--amber)', 'fill-opacity': '.15' }, g);
    var hiT = txt(g, px0 + 4, 0, '', '', 'start'), loT = txt(g, px1 - 4, 0, '', '', 'end');
    txt(g, 260, py + ph + 22, 'salt concentration across the cell, steady state', '', 'middle');
    badge(g, bx + bw + 24, by + 7, 1); badge(g, 30, y0 + 40, 2); badge(g, 490, py - 30, 3);
    var t = 0;
    function tp() { return +ts.value / 100; }
    function render() {
      var T = tp(); setSvgText(tv, T.toFixed(2));
      bLi.setAttribute('width', bw * T); bAn.setAttribute('x', bx + bw * T); bAn.setAttribute('width', bw * (1 - T));
      setSvgText(tLi, 'Li⁺ carries ' + Math.round(T * 100) + ' %'); setSvgText(tAn, 'anion ' + Math.round((1 - T) * 100) + ' %');
      var dc = 0.8 * (1 - T); // Δc/c0 = (1 - t+) i L / (F D c0), with i L / (F D c0) = 0.8 illustrative
      var a = py - ph * dc / 0.8 * 0.9, b = py + ph * dc / 0.8 * 0.9; // high at the left (salt released), low at the right
      prof.setAttribute('d', 'M' + px0 + ',' + a.toFixed(1) + ' L' + px1 + ',' + b.toFixed(1));
      fillP.setAttribute('d', 'M' + px0 + ',' + py + ' L' + px0 + ',' + a.toFixed(1) + ' L' + px1 + ',' + b.toFixed(1) + ' L' + px1 + ',' + py + ' Z');
      hiT.setAttribute('y', a - 6); loT.setAttribute('y', b + 16);
      setSvgText(hiT, dc > 0.02 ? 'salt piles up' : ''); setSvgText(loT, dc > 0.02 ? 'salt runs short' : '');
      read.innerHTML = 'Transference number t₊ = <b>' + T.toFixed(2) + '</b>: lithium carries ' + Math.round(T * 100) + ' % of the current, the anions ' + Math.round((1 - T) * 100) + ' %. In the steady state the salt concentration differs across the cell by Δc = (1 − t₊)·i·L/(F·D), here <b>' + Math.round(100 * dc) + ' %</b> of c₀ end to end for illustrative values of current, thickness and diffusion coefficient.' + (T >= 0.99 ? ' With t₊ = 1 no gradient forms at all.' : '');
    }
    function tick(dt) {
      if (dt === 0) return; t += dt; var T = tp();
      cats.forEach(function (p, j) { p.x += (10 + 40 * T) * dt; p.y += Math.sin(t * 2 + j) * 4 * dt; if (p.x > xR - 6) p.x = xL + 6; p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); if (p.our) our.move(p.x, p.y); });
      ans.forEach(function (p, j) { p.x -= (10 + 40 * (1 - T)) * dt; p.y += Math.cos(t * 2 + j) * 4 * dt; if (p.x < xL + 6) p.x = xR - 6; p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
    }
    on(ts, 'input', render);
    steps(fig, [
      { text: 'Under the field the Li⁺ ions drift one way and the anions the other, and both carry current. The <b>transference number</b> t₊ is the share carried by lithium.' },
      { text: 'Only lithium is made or consumed at the electrodes. The anions arrive at the left electrode and cannot go in, so whatever share of the current they carry has to be <b>made up by diffusion</b>.' },
      { text: 'The result is a salt gradient across the cell, Δc = (1 − t₊)·i·L/(F·D): high where Li⁺ is released, low where it is taken in. Slide t₊ from about 0.3 to about 0.6, the values for a polymer electrolyte without and with nanofillers, and watch the gradient shrink: a smaller gradient means less <b>concentration polarization</b> (module 5).' }
    ]);
    render();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.4 });
    cats.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); if (p.our) our.move(p.x, p.y); }); ans.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
    bind(fig, loop);
  });
  register('f7-11', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    // left: the four requirements of R6
    var req = ['ion conductivity above 10⁻⁴ S/cm', 'blocks dendrites, not reduced by Li', 'chemically stable in the cell', 'a robust, flexible thin membrane'];
    txt(g, 24, 30, 'what a solid electrolyte must do', 'strong', 'start');
    req.forEach(function (r, i) { var y = 58 + i * 30; el('rect', { x: 24, y: y - 13, width: 236, height: 22, rx: 5, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g); txt(g, 32, y + 2, (i + 1) + '. ' + r, '', 'start'); });
    txt(g, 24, 186, 'garnet: above 10⁻³ S/cm, stable vs Li', 'cyan', 'start');
    txt(g, 24, 202, '2013: try ceramic-polymer composites', 'amber', 'start');
    badge(g, 272, 58, 1); badge(g, 272, 190, 2);
    // right: a particle breathing against a rigid solid electrolyte
    var cx = 390, cy = 120, R0 = 46;
    el('rect', { x: 290, y: 30, width: 200, height: 180, rx: 6, fill: 'var(--metal)', 'fill-opacity': '.25', stroke: 'var(--line-2)' }, g);
    txt(g, 390, 24, 'rigid solid electrolyte', 'strong', 'middle');
    var hole = el('circle', { cx: cx, cy: cy, r: R0 + 4, fill: 'var(--bg-2)', stroke: 'var(--line-2)' }, g);
    var part = el('circle', { cx: cx, cy: cy, r: R0, fill: 'var(--amber-2)', 'fill-opacity': '.85' }, g);
    txt(g, cx, cy + 4, 'electrode particle', 'strong', 'middle');
    var gapT = txt(g, 390, 232, '', 'heat', 'middle'), stage = txt(g, 390, 250, '', '', 'middle');
    var path = el('g', {}, g);
    badge(g, 300, 222, 3);
    var t = 0, cyc = 0, holeR = R0 + 4;
    function draw() {
      var s = Math.sin(t * 1.2), r = R0 + 4 * s; // swells on one half-cycle, shrinks on the other
      if (r > holeR) holeR = r; // the rigid hole is pushed out (wears) but never closes back
      part.setAttribute('r', r); hole.setAttribute('r', holeR);
      var gap = holeR - r; clear(path);
      [0, 1, 2, 3, 4, 5].forEach(function (k) { var a = k * Math.PI / 3, x0 = cx + Math.cos(a) * (holeR + 18), y0 = cy + Math.sin(a) * (holeR + 18), x1 = cx + Math.cos(a) * (r + 1), y1 = cy + Math.sin(a) * (r + 1); el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: gap > 2.5 ? 'var(--heat)' : 'var(--cation)', 'stroke-width': 2, 'stroke-dasharray': gap > 2.5 ? '3 3' : '' }, path); });
      setSvgText(gapT, gap > 2.5 ? 'gap: the ion path is broken here' : 'in contact: ions can cross'); gapT.setAttribute('class', 'lbl ' + (gap > 2.5 ? 'heat' : 'amber'));
      setSvgText(stage, s > 0 ? 'lithiated: the particle swells' : 'delithiated: it shrinks back');
      read.innerHTML = gap > 2.5 ? 'The particle has shrunk back but the rigid electrolyte around it has not followed: the contact is lost over part of the surface, and with it the path for the ions.' : 'Particle and electrolyte touch all round, so ions can cross the boundary everywhere.';
    }
    steps(fig, [
      { text: 'A solid electrolyte has <b>four requirements</b> to meet: an ion conductivity above 10⁻⁴ S/cm; blocking dendrites without being reduced by lithium; chemical stability; and a robust, flexible thin membrane.' },
      { text: 'Some ceramics pass the first two: a garnet conducts above 10⁻³ S/cm and is stable against lithium. A 2013 suggestion for meeting all four at once: <b>ceramic-polymer composites</b>.' },
      { text: 'The interface is the other problem. Electrode particles change volume as lithium goes in and out; against a <b>rigid</b> solid electrolyte, contact is lost and the ion path breaks. Press Play and watch the gap open.' }
    ]);
    draw();
    var loop = anim(fig, function (dt) { if (dt === 0) return; t += dt; draw(); }, { autoplay: true, stepDt: 0.5, onPlay: function () { } });
    if (!motion) { t = 4.0; holeR = R0 + 4.2; draw(); }
    bind(fig, loop);
  });
  /* figs-7a.js */
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
  function m7aim(m, tx, ty, dir, d) {
    var off = (m.type === 'ec' ? 8 : 5.6) * m.sc; // centre-to-oxygen distance of the glyph
    var ox = tx + Math.cos(dir) * d, oy = ty + Math.sin(dir) * d;
    m.set(ox + Math.cos(dir) * off, oy + Math.sin(dir) * off, dir + Math.PI); m.fx = m.x; m.fy = m.y;
  }
  function m7anion(g, x, y, r) { var c = el('circle', { cx: x, cy: y, r: r || 6.5, 'class': 'ion an' }, g); return { c: c, x: x, y: y, set: function (nx, ny) { this.x = nx; this.y = ny; c.setAttribute('cx', nx.toFixed(1)); c.setAttribute('cy', ny.toFixed(1)); } }; }
  function m7li(g, x, y, r) { var c = el('circle', { cx: x, cy: y, r: r || 5, 'class': 'ion' }, g); return { c: c, x: x, y: y, set: function (nx, ny) { this.x = nx; this.y = ny; c.setAttribute('cx', nx.toFixed(1)); c.setAttribute('cy', ny.toFixed(1)); } }; }
  function m7rng(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
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
  /* figs-7c.js */
  var SALT_ASPECTS = ['water', 'heat', 'Al', 'hazard', 'use'];
  var SALT_HEAD = { water: ['resists', 'water'], heat: ['stable', 'to heat'], Al: ['protects', 'Al foil'], hazard: ['safe to', 'handle'], use: ['used in', 'Li-ion'] };
  var SALTS = [ // r: 2 good, 1 partly, 0 poor, -1 not stated in the source
    { n: 'LiPF₆', k: 15.3, r: { water: 0, heat: 0, Al: 2, hazard: -1, use: 2 },
      t: { water: 'The P–F bond is labile, so the salt readily reacts with water (hydrolysis); HF in LiPF₆ electrolytes is one of the principal concerns about its use.', heat: 'Relatively low thermal stability.', Al: 'Forms a stable interface with the aluminium current collector at high potential.', hazard: 'The source raises HF as a concern for cell performance, not as a handling rating.', use: 'Used almost exclusively in commercial Li-ion batteries: the best balance of the properties a salt needs.' } },
    { n: 'LiBF₄', k: 9.5, r: { water: 1, heat: 2, Al: 2, hazard: -1, use: 1 },
      t: { water: 'The B–F bond is less labile than P–F, so it is less susceptible to hydrolysis than LiPF₆.', heat: 'More thermally stable than LiPF₆.', Al: 'Its electrolytes passivate aluminium well at high potential.', hazard: 'Not rated in the source.', use: 'Its significantly lower conductivity has been a major impediment to commercial use; it can serve as an additive to LiPF₆ electrolytes.' } },
    { n: 'LiClO₄', k: 13.5, r: { water: -1, heat: 2, Al: 1, hazard: 0, use: 0 },
      t: { water: 'Not rated in the source.', heat: 'High thermal and electrochemical stability.', Al: 'Its electrolytes do not passivate aluminium as well as those with LiPF₆.', hazard: 'Chlorine in its highest oxidation state makes the anion a strong oxidant and the salt a potential explosive.', use: 'Widely used in research in the 1970s and 1980s, but the explosion risk has largely precluded commercial use.' } },
    { n: 'LiAsF₆', k: 14.8, r: { water: -1, heat: -1, Al: -1, hazard: 0, use: 0 },
      t: { water: 'Not rated separately; it shares many properties with LiPF₆.', heat: 'Not rated separately; it shares many properties with LiPF₆.', Al: 'Not rated separately.', hazard: 'As(V) is not toxic, but the As(III) and As(0) that electrochemical reduction might form are highly toxic.', use: 'Potential hazards have largely prevented commercial use.' } },
    { n: 'LiTFSI', k: 12.6, r: { water: 2, heat: 2, Al: 0, hazard: -1, use: -1 },
      t: { water: 'Not susceptible to hydrolysis: its C–F bonds are very stable.', heat: 'High thermal stability.', Al: 'Dilute solutions in carbonate-type solvents strongly corrode aluminium at high potential (aluminium repassivation potential 3.7 V vs Li in PC:DME, against above 5 V for LiPF₆), though not in ionic liquids or at very high concentration.', hazard: 'Not rated in the source.', use: 'First of interest for polymer electrolytes, where it stays amorphous with PEO; its commercial status is not given here.' } },
    { n: 'LiSO₃CF₃', k: 6.1, r: { water: 2, heat: 2, Al: 0, hazard: -1, use: 0 },
      t: { water: 'Not susceptible to hydrolysis.', heat: 'High thermal stability.', Al: 'Corrodes the aluminium current collector at high potential.', hazard: 'Not rated in the source.', use: 'Notably less conductive; used widely in research, especially in polymer electrolytes, but not in commercial Li-ion batteries.' } }
  ];
  var SOLV = [ // Ue et al. 2014, Table 2.1; EC permittivity and viscosity at 40 °C
    { n: 'EC', cyc: true, eps: 90, eta: 1.9, mp: 36, bp: 238, fp: 143, eox: 6.2 },
    { n: 'PC', cyc: true, eps: 65, eta: 2.5, mp: -49, bp: 242, fp: 138, eox: 6.6 },
    { n: 'DMC', cyc: false, eps: 3.1, eta: 0.59, mp: 5, bp: 90, fp: 17, eox: 6.5 },
    { n: 'EMC', cyc: false, eps: 3.0, eta: 0.65, mp: -53, bp: 108, fp: 23, eox: 6.7 },
    { n: 'DEC', cyc: false, eps: 2.8, eta: 0.75, mp: -74, bp: 127, fp: 25, eox: 6.7 }
  ];
  var ASP = {
    eps: { lab: 'relative permittivity', u: '', lo: 0, hi: 100, d: 1, note: 'Pulls a salt apart into free ions: the cyclic carbonates are about 20 to 30 times higher than the linear ones. EC is measured at 40 °C, because it is solid at 25 °C.' },
    eta: { lab: 'viscosity', u: ' mPa s', lo: 0, hi: 3, d: 2, note: 'Lower is better: ions move faster through a runnier liquid. The linear carbonates flow two and a half to four times more easily. EC at 40 °C.' },
    mp: { lab: 'melting point', u: ' °C', lo: -80, hi: 50, d: 0, note: 'EC melts at 36 °C, so it is a solid at room temperature on its own; mixing it with linear carbonates keeps the liquid liquid well below 0 °C.' },
    bp: { lab: 'boiling point', u: ' °C', lo: 0, hi: 260, d: 0, note: 'The linear carbonates boil at 90 to 127 °C, the cyclic ones above 230 °C.' },
    fp: { lab: 'flash point', u: ' °C', lo: 0, hi: 160, d: 0, note: 'The temperature above which the vapour can be ignited. The runny linear carbonates flash at 17 to 25 °C, near room temperature; the cyclic ones above 130 °C.' },
    eox: { lab: 'oxidation limit', u: ' V vs Li', lo: 5, hi: 7, d: 1, note: 'The axis starts at 5 V. Measured on glassy carbon with a tetraalkylammonium salt (5 mV/s, 1 mA/cm² criterion). All are reduced at about 0 V. Henderson warns that a window measured on inert carbon is not a clear indicator of stability against real electrode materials.' }
  };
  register('f7-3', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), vb = fig.querySelectorAll('button[data-view]'), ab = fig.querySelectorAll('button[data-asp]'), arow = fig.querySelector('.asp-row');
    var gS = el('g', {}, svg), gV = el('g', {}, svg), view = 's', asp = 'fp', sel = null;
    // ---------- the salts ----------
    var rx = 18, cK = 96, cw = 64, c0 = 228, ry0 = 74, rh = 34;
    txt(gS, rx, 30, 'salt, 1 M', 'strong', 'start');
    txt(gS, cK, 22, 'conductivity', 'strong', 'start'); txt(gS, cK, 36, 'mS/cm, PC:DME', '', 'start');
    SALT_ASPECTS.forEach(function (a, j) { var x = c0 + j * cw; txt(gS, x, 22, SALT_HEAD[a][0], 'strong', 'middle'); txt(gS, x, 36, SALT_HEAD[a][1], 'strong', 'middle'); });
    var cells = [];
    SALTS.forEach(function (s, i) {
      var y = ry0 + i * rh;
      if (i % 2 === 0) el('rect', { x: 10, y: y - rh / 2, width: 500, height: rh, rx: 6, fill: 'rgba(234,240,236,.035)' }, gS);
      txt(gS, rx, y + 5, s.n, s.n === 'LiPF₆' ? 'amber strong' : 'strong', 'start');
      el('rect', { x: cK, y: y - 6, width: 60 * s.k / 16, height: 12, rx: 3, fill: 'var(--cyan)', 'fill-opacity': '.7' }, gS);
      txt(gS, cK + 60 * s.k / 16 + 5, y + 4, s.k.toFixed(1), '', 'start');
      SALT_ASPECTS.forEach(function (a, j) {
        var x = c0 + j * cw, r = s.r[a], c = el('g', { tabindex: 0, role: 'button', 'aria-label': s.n + ', ' + SALT_HEAD[a].join(' '), style: 'cursor:pointer' }, gS);
        el('circle', { cx: x, cy: y, r: 14, fill: 'transparent' }, c);
        var ring = el('circle', { cx: x, cy: y, r: 13, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2, 'stroke-opacity': 0 }, c);
        if (r === 2) el('circle', { cx: x, cy: y, r: 8, fill: 'var(--cyan)' }, c);
        else if (r === 1) { el('circle', { cx: x, cy: y, r: 8, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.6 }, c); el('path', { d: 'M' + x + ',' + (y - 8) + ' A8,8 0 0 0 ' + x + ',' + (y + 8) + ' Z', fill: 'var(--amber)' }, c); }
        else if (r === 0) { el('circle', { cx: x, cy: y, r: 8, fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.8 }, c); el('path', { d: 'M' + (x - 4.5) + ',' + (y - 4.5) + ' L' + (x + 4.5) + ',' + (y + 4.5) + ' M' + (x + 4.5) + ',' + (y - 4.5) + ' L' + (x - 4.5) + ',' + (y + 4.5), stroke: 'var(--heat)', 'stroke-width': 1.8 }, c); }
        else el('line', { x1: x - 5, x2: x + 5, y1: y, y2: y, stroke: 'var(--muted)', 'stroke-width': 1.6 }, c);
        cells.push({ s: s, a: a, ring: ring });
        pressable(c, function () { sel = { s: s, a: a }; placeS(); });
      });
    });
    // legend
    var ly = ry0 + SALTS.length * rh + 8;
    [[2, 'good'], [1, 'partly'], [0, 'poor'], [-1, 'not rated']].forEach(function (L, j) {
      var x = 30 + j * 118, y = ly;
      if (L[0] === 2) el('circle', { cx: x, cy: y, r: 7, fill: 'var(--cyan)' }, gS);
      else if (L[0] === 1) { el('circle', { cx: x, cy: y, r: 7, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.6 }, gS); el('path', { d: 'M' + x + ',' + (y - 7) + ' A7,7 0 0 0 ' + x + ',' + (y + 7) + ' Z', fill: 'var(--amber)' }, gS); }
      else if (L[0] === 0) { el('circle', { cx: x, cy: y, r: 7, fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.8 }, gS); el('path', { d: 'M' + (x - 4) + ',' + (y - 4) + ' L' + (x + 4) + ',' + (y + 4) + ' M' + (x + 4) + ',' + (y - 4) + ' L' + (x - 4) + ',' + (y + 4), stroke: 'var(--heat)', 'stroke-width': 1.8 }, gS); }
      else el('line', { x1: x - 5, x2: x + 5, y1: y, y2: y, stroke: 'var(--muted)', 'stroke-width': 1.6 }, gS);
      txt(gS, x + 12, y + 4, L[1], '', 'start');
    });
    badge(gS, 196, ry0 + 5 * rh, 1); badge(gS, c0 + 2 * cw + 28, ry0 + 5 * rh - 18, 2);
    function placeS() {
      cells.forEach(function (c) { c.ring.setAttribute('stroke-opacity', sel && c.s === sel.s && c.a === sel.a ? 1 : 0); });
      if (!sel) { read.innerHTML = 'Tap any symbol to read the verdict behind it. Conductivities are for 1 M of each salt in PC:DME (50:50 by volume) at 25 °C; LiPF₆ is the highest of the six.'; return; }
      var r = sel.s.r[sel.a];
      read.innerHTML = '<b>' + sel.s.n + ', ' + SALT_HEAD[sel.a].join(' ') + '</b> (' + (r === 2 ? 'good' : r === 1 ? 'partly' : r === 0 ? 'poor' : 'not rated') + '): ' + sel.s.t[sel.a] + ' Conductivity, 1 M in PC:DME at 25 °C: ' + sel.s.k.toFixed(1) + ' mS/cm.';
    }
    // ---------- the solvents ----------
    var bx0 = 96, bx1 = 470, by0 = 64, bh = 30, vT = txt(gV, 260, 26, '', 'strong', 'middle'), axG = el('g', {}, gV), bars = [];
    SOLV.forEach(function (s, i) {
      var y = by0 + i * (bh + 14);
      txt(gV, 20, y + bh / 2 + 5, s.n, 'strong', 'start'); txt(gV, 58, y + bh / 2 + 5, s.cyc ? 'cyclic' : 'linear', s.cyc ? 'cyan' : 'amber', 'start');
      bars.push({ s: s, r: el('rect', { y: y, height: bh, rx: 4, fill: s.cyc ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': '.75' }, gV), t: txt(gV, 0, y + bh / 2 + 5, '', 'strong', 'start') });
    });
    badge(gV, 494, by0 + 10, 3);
    function placeV() {
      var A = ASP[asp], X = function (v) { return bx0 + (v - A.lo) / (A.hi - A.lo) * (bx1 - bx0); };
      setSvgText(vT, A.lab + (A.u ? ',' + A.u : ''));
      clear(axG);
      var z = X(Math.max(A.lo, 0)); el('line', { x1: z, x2: z, y1: by0 - 8, y2: by0 + 5 * (bh + 14) - 6, stroke: 'var(--line-2)' }, axG);
      var tk = niceStep(A.hi - A.lo, 5); for (var v = Math.ceil(A.lo / tk) * tk; v <= A.hi + 1e-9; v += tk) { txt(axG, X(v), by0 + 5 * (bh + 14) + 10, String(Math.round(v * 100) / 100).replace('-', '−'), '', 'middle'); el('line', { x1: X(v), x2: X(v), y1: by0 - 8, y2: by0 + 5 * (bh + 14) - 6, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, axG); }
      bars.forEach(function (b) {
        var v = b.s[asp], base = Math.max(A.lo, Math.min(0, A.hi)), xa = X(asp === 'mp' ? 0 : A.lo), xb = X(v);
        if (asp !== 'mp') xa = X(A.lo);
        b.r.setAttribute('x', Math.min(xa, xb)); b.r.setAttribute('width', Math.max(2, Math.abs(xb - xa)));
        var lab = (b.s.n === 'EC' && (asp === 'eps' || asp === 'eta') ? v + '*' : String(v)).replace('-', '−') + A.u;
        b.t.setAttribute('x', Math.max(xa, xb) + 6); b.t.setAttribute('text-anchor', 'start');
        if (Math.max(xa, xb) + 6 + lab.length * 6.5 > 514) { b.t.setAttribute('x', Math.max(xa, xb) - 6); b.t.setAttribute('text-anchor', 'end'); b.t.setAttribute('class', 'lbl strong tag'); } else b.t.setAttribute('class', 'lbl strong');
        setSvgText(b.t, lab);
      });
      read.innerHTML = '<b>' + A.lab.charAt(0).toUpperCase() + A.lab.slice(1) + '.</b> ' + A.note + ' Values from Ue et al. 2014, Table 2.1' + (asp === 'eps' || asp === 'eta' ? ' (* EC at 40 °C).' : '.');
      Array.prototype.forEach.call(ab, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-asp') === asp)); });
    }
    function setView(v) {
      view = v; gS.style.display = v === 's' ? '' : 'none'; gV.style.display = v === 'v' ? '' : 'none'; arow.style.display = v === 'v' ? '' : 'none';
      Array.prototype.forEach.call(vb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
      if (v === 's') placeS(); else placeV();
    }
    var st = null;
    Array.prototype.forEach.call(vb, function (b) { on(b, 'click', function () { var v = b.getAttribute('data-view'); if (st) st.go(v === 'v' ? 2 : 0); else setView(v); }); });
    Array.prototype.forEach.call(ab, function (b) { on(b, 'click', function () { asp = b.getAttribute('data-asp'); placeV(); }); });
    setView('s');
    st = steps(fig, [
      { text: 'Six lithium salts that have been used in electrolytes, and how each scores on the requirements a salt must meet. Failing any one of them rules a salt out of practical use. The bars give the conductivity of each at 1 M: LiPF₆ leads.', on: function () { setView('s'); sel = { s: SALTS[0], a: 'water' }; placeS(); } },
      { text: 'No salt scores well everywhere. LiPF₆ leads on conductivity, protects the aluminium and forms a good SEI, and loses on water and heat. The others each fail somewhere else: LiClO₄ can explode, LiAsF₆ can turn toxic, LiTFSI and the triflate eat the aluminium foil.', on: function () { setView('s'); sel = { s: SALTS[4], a: 'Al' }; placeS(); } },
      { text: 'Now the solvents. Pick an aspect: the cyclic carbonates (cyan) dissolve salts and are hard to ignite but are thick or solid; the linear ones (gold) flow easily and, except DMC, stay liquid in the cold, but flash near room temperature. A commercial electrolyte mixes the two.', on: function () { setView('v'); } }
    ]);
  });
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
  function v3n(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function v3x(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function v3d(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function v3rot(v, k, th) { // Rodrigues: rotate v about unit axis k by th
    var c = Math.cos(th), s = Math.sin(th), kx = v3x(k, v), kd = v3d(k, v);
    return [v[0] * c + kx[0] * s + k[0] * kd * (1 - c), v[1] * c + kx[1] * s + k[1] * kd * (1 - c), v[2] * c + kx[2] * s + k[2] * kd * (1 - c)];
  }
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
