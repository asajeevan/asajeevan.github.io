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

  /* figs-11.js */
  function e11d(pts) { var d = ''; for (var i = 0; i < pts.length; i++) { if (!isFinite(pts[i][0]) || !isFinite(pts[i][1])) continue; d += (d ? 'L' : 'M') + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1); } return d; }
  function e11axes(g, b, o) {
    el('line', { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0, stroke: 'var(--line-2)' }, g);
    el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, stroke: 'var(--line-2)' }, g);
    (o.xt || []).forEach(function (t) { var x = o.X(t[0]); el('line', { x1: x, x2: x, y1: b.y0, y2: b.y0 + 4, stroke: 'var(--line-2)' }, g); if (t[1] !== '') txt(g, x, b.y0 + 16, t[1], '', 'middle'); });
    (o.yt || []).forEach(function (t) { var y = o.Y(t[0]); el('line', { x1: b.x0 - 4, x2: b.x0, y1: y, y2: y, stroke: 'var(--line-2)' }, g); if (o.grid) el('line', { x1: b.x0, x2: b.x1, y1: y, y2: y, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); if (t[1] !== '') txt(g, b.x0 - 7, y + 4, t[1], '', 'end'); });
    if (o.xlab) txt(g, b.x1, b.y0 + (o.xt && o.xt.length ? 32 : 16), o.xlab, '', 'end');
    if (o.ylab) txt(g, b.x0 + 6, b.y1 - 8, o.ylab, '', 'start');
  }
  function e11log(v, lo, hi, a, b) { return a + (Math.log10(v) - lo) / (hi - lo) * (b - a); }
  function e11modes(fig, fn) {
    var bs = fig.querySelectorAll('.controls button[data-mode]');
    Array.prototype.forEach.call(bs, function (bt) { on(bt, 'click', function () { Array.prototype.forEach.call(bs, function (x) { x.setAttribute('aria-pressed', String(x === bt)); }); fn(bt.getAttribute('data-mode')); }); });
    var cur = Array.prototype.filter.call(bs, function (x) { return x.getAttribute('aria-pressed') === 'true'; })[0] || bs[0];
    return cur ? cur.getAttribute('data-mode') : null;
  }
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
  function m3centre(tpl) { var c = [0, 0, 0], A = tpl.atoms; A.forEach(function (x) { c[0] += x.p[0] / A.length; c[1] += x.p[1] / A.length; c[2] += x.p[2] / A.length; }); return { atoms: A.map(function (x) { return { e: x.e, p: [x.p[0] - c[0], x.p[1] - c[1], x.p[2] - c[2]] }; }), bonds: tpl.bonds, bind: tpl.bind }; }
  function v3n(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function v3x(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function v3d(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
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
  /* figs-9.js */
  var M9 = P.m9;
  var K9 = { intercalation: 'var(--amber)', alloy: '#C4B5F7', conversion: 'var(--copper)', metal: 'var(--metal)' };
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
  /* figs-9p.js */
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
  function itl(str) { return String(str).replace(/§([^§]*)§/g, '<i>$1</i>'); }
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
  /* figs-9s.js */
  M3_COL.Mg = ['#c8f5b8', '#3e9e45'];
  M3_R.Mg = 0.5;
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
