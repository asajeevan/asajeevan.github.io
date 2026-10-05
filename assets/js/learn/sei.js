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
      { text: 'The bar shows the price: the lithium locked in the SEI came from the positive electrode and does not come back. Press <b>Second charge</b>: the layer is already there, so the big first-charge loss is not repeated. The layer keeps evolving slowly as the cell cycles (chapter 16).' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.6, onPlay: function () { if (k >= 1) { k = 0; if (cycle === 1) { seiW = 0; locked = 0; mols.forEach(function (m) { m.state = 'free'; m.e.style.display = ''; }); } } } });
    if (!motion) { k = 1; seiW = 14; locked = 0.12; mols.forEach(function (m, j) { if (j % 3 === 0) { m.state = 'gone'; m.e.style.display = 'none'; } }); }
    render(); bind(fig, loop);
  });
  /* figs-9.js */
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
