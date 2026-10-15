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
  var modeBtns = document.querySelectorAll('.modes button[data-mode]'), modeNotes = document.querySelectorAll('.modes-note');
  var NOTES = {
    show: 'Just show me: the questions, the figures and the one-line answers; the explanations are folded away.',
    teach: 'Teach me: everything at the main level. The “Go deeper” and “The mathematics” panels stay closed until you open them.',
    equations: 'Equations: every “Go deeper” panel and the mathematics of each chapter are now open and outlined in cyan.' + (document.getElementById('maths') ? ' <a href="#maths">Jump to the mathematics of this chapter</a>.' : '')
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

  /* figs-10.js */
  register('f10-1', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), boxes = fig.querySelectorAll('input[type=checkbox]'), slow = fig.querySelector('.slow');
    var x0 = 62, x1 = 470, y0 = 236, y1 = 36, N = 1000;
    var X = function (n) { return x0 + n / N * (x1 - x0); }, Y = function (q) { return y0 - (q - 0.7) / 0.3 * (y0 - y1); };
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    [0.7, 0.8, 0.9, 1].forEach(function (q) { el('line', { x1: x0, x2: x1, y1: Y(q), y2: Y(q), stroke: q === 0.8 ? 'var(--amber)' : 'var(--line)', 'stroke-dasharray': q === 0.8 ? '5 4' : '2 5' }, g); txt(g, x0 - 6, Y(q) + 4, Math.round(q * 100) + ' %', '', 'end'); });
    txt(g, x0 + 6, Y(0.8) + 16, '80 %: end of cycle life', 'amber', 'start');
    [0, 250, 500, 750, 1000].forEach(function (n) { el('line', { x1: X(n), x2: X(n), y1: y0, y2: y0 + 5, stroke: 'var(--line-2)' }, g); txt(g, X(n), y0 + 18, n, '', 'middle'); });
    txt(g, x1, y0 + 34, 'cycle number (schematic)', '', 'end'); txt(g, x0 - 6, y1 - 14, 'capacity measured', '', 'start');
    var parts = [
      { key: 'li', name: 'lithium lost to the SEI', col: 'var(--anion)', f: function (n) { return 0.10 * Math.sqrt(n / N); } },
      { key: 'am', name: 'active material lost', col: 'var(--heat)', f: function (n) { return 0.08 * n / N; } },
      { key: 'r', name: 'hidden by resistance', col: '#C4B5F7', f: function (n) { return 0.07 * Math.pow(n / N, 1.3); } }
    ];
    var areas = parts.map(function (p) { return el('path', { fill: p.col, 'fill-opacity': '.45' }, g); }), line = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    var bdg = [badge(g, 0, 0, 1), badge(g, 0, 0, 2), badge(g, 0, 0, 3)], at = [30, 60, 90];
    function render() {
      var on2 = {}; Array.prototype.forEach.call(boxes, function (b) { on2[b.value] = b.checked; });
      var lowRate = slow.getAttribute('aria-pressed') === 'true';
      var use = parts.filter(function (p) { return on2[p.key] !== false && !(lowRate && p.key === 'r'); });
      var base = []; for (var n = 0; n <= N; n += 10) base.push(1);
      parts.forEach(function (p, k) {
        var show = use.indexOf(p) >= 0, top = base.slice(), d = '';
        if (show) { for (var i = 0; i < base.length; i++) base[i] -= p.f(i * 10); }
        for (i = 0; i < top.length; i++) d += (i ? 'L' : 'M') + X(i * 10).toFixed(1) + ',' + Y(top[i]).toFixed(1);
        for (i = base.length - 1; i >= 0; i--) d += 'L' + X(i * 10).toFixed(1) + ',' + Y(base[i]).toFixed(1);
        areas[k].setAttribute('d', show ? d + 'Z' : '');
        var j = at[k]; bdg[k].setAttribute('transform', 'translate(' + X(j * 10) + ',' + Y((top[j] + base[j]) / 2) + ')'); bdg[k].style.display = show ? '' : 'none';
      });
      line.setAttribute('d', base.map(function (q, i) { return (i ? 'L' : 'M') + X(i * 10).toFixed(1) + ',' + Y(q).toFixed(1); }).join(' '));
      var end = base[base.length - 1], n80 = null; for (var i = 0; i < base.length; i++) if (base[i] < 0.8) { n80 = i * 10; break; }
      read.innerHTML = 'After 1000 schematic cycles the cell delivers <b>' + Math.round(end * 100) + ' %</b> of its first capacity' + (n80 ? ', and crossed the 80 % end-of-life line at about cycle ' + n80 : '') + '. ' + (lowRate ? 'Measured at a low rate, the part hidden by resistance comes back: that part was not lost, only out of reach.' : 'Press <b>Measure at a low rate</b> to see which part comes back.');
    }
    Array.prototype.forEach.call(boxes, function (b) { on(b, 'change', render); });
    on(slow, 'click', function () { slow.setAttribute('aria-pressed', String(slow.getAttribute('aria-pressed') !== 'true')); render(); });
    steps(fig, [
      { text: 'Grey: <b>lithium lost</b> to side reactions, above all to the SEI, which keeps growing after the first charge. Each lithium it locks up is one fewer to rock between the electrodes. Drawn following the square-root law of figure 10.2.' },
      { text: 'Red: <b>active material lost</b>: particles that crack and lose contact, as in figure 7.3, or that dissolve, as in figure 10.3. The lithium may still be there, but there is less room to store it.' },
      { text: 'Lilac: capacity <b>hidden by resistance</b>. As interfaces thicken and contacts loosen, the voltage under current hits the cut-off sooner (figure 5.3). Measure at a low rate and this part comes back; the other two do not.' }
    ]);
    render();
  });
  register('f10-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), rb = fig.querySelectorAll('button[data-b]');
    var x0 = 220, x1 = 480, y0 = 210, y1 = 40, b = 0.5, t = 1;
    var X = function (tt) { return x0 + tt * (x1 - x0); }, Y = function (L) { return y0 - L * (y0 - y1); };
    // both laws anchored to the same loss after the first month (t = 1/12 of the axis); b = 1 reaches 0.85 at the end
    var T1 = 1 / 12, A1 = 0.85 / 12; function LL(bb, tt) { return bb === 0 ? A1 : A1 * Math.pow(Math.max(tt, 1e-6) / T1, bb); }
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    txt(g, x1, y0 + 18, 'time (or charge passed), schematic', '', 'end'); txt(g, x0 - 6, y1 - 10, 'SEI thickness, lithium lost', '', 'start');
    var refs = [0.5, 1, 0].map(function (bb) { var d = ''; for (var i = 0; i <= 100; i++) { var tt = i / 100; d += (i ? 'L' : 'M') + X(tt).toFixed(1) + ',' + Y(0.08 + LL(bb, tt)).toFixed(1); } return el('path', { d: d, fill: 'none', stroke: 'var(--muted)', 'stroke-opacity': '.35', 'stroke-dasharray': '3 4' }, g); });
    var curve = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.6 }, g), dot = el('circle', { r: 5, fill: 'var(--amber)' }, g);
    var bl = txt(g, x1 - 4, 0, '', 'amber', 'end');
    // cartoon: graphite with a thickening SEI, lithium counter and resistance bar
    var gx = 30, gy = 50;
    for (var i = 0; i < 7; i++) el('line', { x1: gx, x2: gx + 60, y1: gy + 10 + i * 20, y2: gy + 10 + i * 20, stroke: 'var(--text)', 'stroke-opacity': '.5', 'stroke-width': 2 }, g);
    txt(g, gx + 30, gy - 10, 'graphite', 'strong', 'middle');
    var sei = el('rect', { x: gx + 62, y: gy, width: 4, height: 150, fill: 'var(--anion)', 'fill-opacity': '.8' }, g);
    txt(g, gx + 100, gy - 10, 'SEI', '', 'middle');
    var rbar = el('rect', { x: gx, y: 226, width: 0, height: 10, fill: '#C4B5F7' }, g); txt(g, gx, 250, 'interfacial resistance', '', 'start');
    badge(g, x0 + 30, y1 + 6, 1); badge(g, gx + 140, gy + 70, 2);
    function L(tt) { return LL(b, tt); }
    function render() {
      Array.prototype.forEach.call(rb, function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-b') === b)); });
      var d = ''; for (var i = 0; i <= 100; i++) { var tt = i / 100 * t; d += (i ? 'L' : 'M') + X(tt).toFixed(1) + ',' + Y(0.08 + L(tt)).toFixed(1); }
      curve.setAttribute('d', d); dot.setAttribute('cx', X(t)); dot.setAttribute('cy', Y(0.08 + L(t)));
      bl.setAttribute('y', Y(0.08 + L(1)) - 8); setSvgText(bl, b === 0.5 ? 'L ∝ t^{1/2}' : b === 1 ? 'L ∝ t' : 'L constant');
      var th = 4 + 30 * (0.08 + L(t)); sei.setAttribute('width', th);
      rbar.setAttribute('width', 6 + 150 * L(t));
      read.innerHTML = (b === 0.5 ? 'Diffusion-limited growth, L ∝ t<sup>1/2</sup>: the layer slows its own growth, because what feeds it has to diffuse through it. This is the standard assumption in the literature.' : b === 1 ? 'Growth limited by the reaction itself, or by migration while charging: L ∝ t, no slowing down.' : 'Limited by migration while discharging: the layer does not grow, b = 0.') + ' Lost capacity follows the same law, ΔQ ∝ t<sup>b</sup>, and the growth is fastest at a high state of charge and a high charging rate.';
    }
    Array.prototype.forEach.call(rb, function (x) { on(x, 'click', function () { b = +x.getAttribute('data-b'); render(); }); });
    steps(fig, [
      { text: 'The SEI that formed on the first charge (chapter 10) does not stop growing. Its thickness follows a power law, L ∝ t<sup>b</sup>, and the exponent tells us what limits it: <b>b = 1/2</b> when diffusion through the layer is the bottleneck, <b>b = 1</b> when the reaction or migration during charging is, <b>b = 0</b> for migration during discharge.' },
      { text: 'Every bit of new SEI locks up lithium and thickens the layer the ions must cross: the capacity falls, ΔQ ∝ t<sup>b</sup>, and the interfacial resistance rises. The layer grows fastest when the cell sits at a high state of charge or is charged fast.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; t += dt / 6; if (t > 1) t = 0.02; render(); }, { autoplay: true, stepDt: 0.5 });
    render(); bind(fig, loop);
  });
  register('f10-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var nx = 40, px = 400, top = 50, bot = 200;
    el('rect', { x: nx, y: top, width: 70, height: bot - top, fill: 'var(--panel-2)' }, g);
    for (var i = 0; i < 7; i++) el('line', { x1: nx + 4, x2: nx + 66, y1: top + 10 + i * 20, y2: top + 10 + i * 20, stroke: 'var(--text)', 'stroke-opacity': '.5', 'stroke-width': 2 }, g);
    var sei = el('rect', { x: nx + 70, y: top, width: 8, height: bot - top, fill: 'var(--anion)', 'fill-opacity': '.8' }, g);
    el('rect', { x: nx + 78, y: top, width: px - nx - 78, height: bot - top, fill: 'var(--cyan)', 'fill-opacity': '.08' }, g);
    el('rect', { x: px, y: top, width: 80, height: bot - top, fill: 'var(--amber-2)', 'fill-opacity': '.55' }, g);
    txt(g, nx + 35, top - 12, 'graphite', 'strong', 'middle'); txt(g, nx + 74, bot + 18, 'SEI', '', 'middle'); txt(g, 255, top - 12, 'electrolyte', 'cyan', 'middle'); txt(g, px + 40, top - 12, 'LiMn₂O₄ spinel', 'strong', 'middle');
    var mns = [], n = 0, t = 0;
    var cnt = txt(g, 255, bot + 18, '', 'amber', 'middle'), q = txt(g, nx + 74, bot + 36, '', 'heat', 'middle');
    badge(g, px + 92, top + 20, 1); badge(g, 255, top + 20, 2); badge(g, nx + 74, top - 30, 3);
    function spawn() { var y = top + 20 + Math.random() * (bot - top - 40); mns.push({ x: px - 4, y: y, c: el('circle', { cx: px - 4, cy: y, r: 4.5, fill: '#b98cf0', stroke: '#fff', 'stroke-width': .8 }, g), done: false }); }
    function render() {
      setSvgText(cnt, n ? n + ' Mn ions have reached the SEI' : 'Mn²⁺ leaves the spinel');
      sei.setAttribute('fill', n > 3 ? '#8f8aa8' : 'var(--anion)'); setSvgText(q, n > 3 ? 'poisoned: works worse' : '');
      read.innerHTML = n > 3 ? 'The manganese has lodged in the SEI on the graphite, and the layer protects the electrode less well: more electrolyte is consumed, more lithium is lost. Damage at one electrode shows up at the other.' : 'Manganese, as Mn(II), dissolves from the spinel positive electrode into the electrolyte and drifts across the cell.';
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      if (t > 1.4 && mns.filter(function (m) { return !m.done; }).length < 3) { t = 0; spawn(); }
      mns.forEach(function (m) { if (m.done) return; m.x -= 50 * dt; m.y += Math.sin(m.x / 12) * 0.6; if (m.x <= nx + 76) { m.x = nx + 72 + Math.random() * 6; m.done = true; n++; } m.c.setAttribute('cx', m.x); m.c.setAttribute('cy', m.y); });
      while (mns.length > 14) { var o = mns.shift(); g.removeChild(o.c); }
      render();
    }
    steps(fig, [
      { text: 'Manganese, as <b>Mn(II)</b>, dissolves out of the LiMn₂O₄ spinel of the positive electrode: active material lost.' },
      { text: 'It crosses the electrolyte to the negative electrode.' },
      { text: 'There it lodges in the <b>SEI</b> on the graphite, which then protects less well. One electrode&#8217;s loss becomes the other&#8217;s problem.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    if (!motion) { for (var k = 0; k < 6; k++) { spawn(); var m = mns[mns.length - 1]; m.x = nx + 74; m.done = true; n++; m.c.setAttribute('cx', m.x); } spawn(); mns[mns.length - 1].x = 260; mns[mns.length - 1].c.setAttribute('cx', 260); }
    render(); bind(fig, loop);
  });
  register('f10-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 150, x1 = 470;
    // log time axis from 1 day to 10 years
    var t0 = Math.log10(1), t1 = Math.log10(3650), X = function (days) { return x0 + (Math.log10(days) - t0) / (t1 - t0) * (x1 - x0); };
    [[1, '1 day'], [30, '1 month'], [365, '1 year'], [2920, '8 years']].forEach(function (r) { el('line', { x1: X(r[0]), x2: X(r[0]), y1: 40, y2: 196, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); txt(g, X(r[0]), 214, r[1], '', 'middle'); });
    txt(g, x1, 232, 'time on the shelf (log scale)', '', 'end');
    var rows = [
      { y: 80, name: 'Li-MnO₂ primary', keep: 0.9, at: 2920, txt: '90 % kept after 8 years', col: 'var(--amber)' },
      { y: 150, name: 'Ni-MH rechargeable', keep: 0.7, at: 30, txt: 'up to 30 % lost in a month', col: 'var(--cyan)' }
    ];
    rows.forEach(function (r, i) {
      txt(g, x0 - 10, r.y + 4, r.name, 'strong', 'end');
      el('line', { x1: x0, x2: X(r.at), y1: r.y, y2: r.y, stroke: r.col, 'stroke-width': 10, 'stroke-opacity': '.35' }, g);
      el('circle', { cx: X(r.at), cy: r.y, r: 6, fill: r.col }, g);
      txt(g, X(r.at) + (i ? 10 : -10), r.y - 12, r.txt, '', i ? 'start' : 'end');
      badge(g, x0 - 10 - 136, r.y - 18, i + 1);
    });
    txt(g, x0, 30, 'what each keeps, at the point the source gives', '', 'start');
    steps(fig, [
      { text: 'A lithium-MnO₂ <b>primary</b> cell keeps 90 % of its charge after 8 years on the shelf.' },
      { text: 'A nickel-metal hydride <b>rechargeable</b> cell can lose up to 30 % in a single month. Self-discharge speeds up with temperature.' }
    ]);
    read.innerHTML = 'Two points, not two curves: we have one value for each, and nothing about the shape in between.';
  });
  /* figs-5.js */
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
