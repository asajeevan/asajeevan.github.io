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
    var out = [], i = 0, n = str.length, buf = '', mode = 0;
    function flush() { if (buf) out.push({ t: buf, s: mode }); buf = ''; }
    while (i < n) {
      var c = str[i], m;
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
    if (runs.length === 1 && runs[0].s === 0) { t.textContent = str; return t; }
    var cur = 0; // current baseline offset in base em (negative = raised)
    runs.forEach(function (r) {
      var target = r.s === 1 ? -0.42 : r.s === -1 ? 0.22 : 0, scale = r.s ? 0.72 : 1;
      var span = el('tspan', { dy: ((target - cur) / scale).toFixed(3) + 'em' }, t);
      if (r.s) span.setAttribute('font-size', '72%');
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
    runs.forEach(function (r) { var e = r.t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); o += r.s === 1 ? '<sup>' + e + '</sup>' : r.s === -1 ? '<sub>' + e + '</sub>' : e; });
    return o;
  }
  function mathifyNode(node) {
    if (node.nodeType === 3) {
      if (!node.parentNode) return;
      var v = node.nodeValue; if (!/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ₀₁₂₃₄₅₆₇₈₉₊₋]|\S[_^][A-Za-z0-9{]/.test(v)) return;
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
    if (opts.xlabel) txt(g, X(1), box.y + box.h + 14, opts.xlabel, '', 'end');
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
     Module 0: charge, field, potential, voltage. Every number drawn is
     computed in physics.js from the equations of Bard, Faulkner and
     White (B2): Coulomb's law (14.3.1 footnote 6), the field and the
     potential (2.2.1), the electron-volt (1.1.4), current (1.1.5),
     Ohm's law (4.2), mobility (2.3.3).
     ================================================================= */
  var VNM = P.e / (4 * Math.PI * P.eps0 * 1e-9); // potential 1 nm from one elementary charge: 1.44 V

  /* ===== 0.1 Two charges and the force between them ===== */
  register('f0-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var rSl = fig.querySelector('.r'), rv = fig.querySelector('.r-val'), sgn = fig.querySelectorAll('button[data-q]');
    var q1 = 1, q2 = 1, y = 118, xa = 150;
    txt(g, 260, 22, 'two charges in vacuum, r apart', 'strong', 'middle');
    var line = el('line', { y1: y, y2: y, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
    var rlab = txt(g, 0, y + 30, '', '', 'middle');
    var rbar = el('path', { fill: 'none', stroke: 'var(--muted)' }, g);
    var fa = el('line', { 'class': 'force-arrow', y1: y, y2: y }, g), fb = el('line', { 'class': 'force-arrow', y1: y, y2: y }, g);
    fa.setAttribute('marker-end', marker(svg, '#F0B441')); fb.setAttribute('marker-end', marker(svg, '#F0B441'));
    var ca = null, cb = null, fLab = txt(g, 0, y - 64, '', 'amber', 'middle'), fLab2 = txt(g, 0, y - 50, '', 'amber', 'middle');
    var fieldLab = txt(g, 0, y + 58, '', 'field', 'middle');
    var fieldArr = el('line', { 'class': 'field-arrow', y1: y + 44, y2: y + 44 }, g); fieldArr.setAttribute('marker-end', marker(svg, '#C4B5F7'));
    badge(g, xa - 34, y - 30, 1); var b2 = badge(g, 0, 0, 2); var b3 = badge(g, 0, 0, 3);
    txt(g, 260, 218, 'F = q q′ / (4π ε₀ r²),  with  ε₀ = 8.85 × 10⁻¹² C² N⁻¹ m⁻²', '', 'middle');
    function render() {
      var r = +rSl.value; setSvgText(rv, r.toFixed(1) + ' nm');
      var d = 40 + r * 62, xb = xa + d;
      line.setAttribute('x1', xa); line.setAttribute('x2', xb);
      rbar.setAttribute('d', 'M' + xa + ',' + (y + 18) + ' v6 M' + xb + ',' + (y + 18) + ' v6 M' + xa + ',' + (y + 21) + ' H' + xb);
      rlab.setAttribute('x', (xa + xb) / 2); setSvgText(rlab, 'r = ' + r.toFixed(1) + ' nm');
      if (ca) g.removeChild(ca); if (cb) g.removeChild(cb);
      ca = charge(g, xa, y, 11, q1); cb = charge(g, xb, y, 11, q2);
      var F = P.coulombForce(q1 * P.e, q2 * P.e, r * 1e-9), F2 = P.coulombForce(P.e, P.e, 2e-9);
      var L = Math.min(110, 30 * Math.sqrt(Math.abs(F) / F2)), rep = F > 0;
      // force on a: away from b if repulsive
      fa.setAttribute('x1', xa + (rep ? -14 : 14)); fa.setAttribute('x2', xa + (rep ? -14 - L : 14 + L));
      fb.setAttribute('x1', xb + (rep ? 14 : -14)); fb.setAttribute('x2', xb + (rep ? 14 + L : -14 - L));
      fa.style.display = fb.style.display = L < 18 && Math.abs(F) < F2 ? '' : '';
      fLab.setAttribute('x', (xa + xb) / 2); setSvgText(fLab, (rep ? 'repel' : 'attract') + ': F = ' + fmt(Math.abs(F) * 1e12, Math.abs(F) * 1e12 < 10 ? 2 : 0) + ' pN on each');
      fLab2.setAttribute('x', (xa + xb) / 2); setSvgText(fLab2, 'same size on both, opposite directions');
      b2.setAttribute('transform', 'translate(' + (xa + 12) + ',' + (y + 44) + ')');
      b3.setAttribute('transform', 'translate(' + (xb + 34) + ',' + (y - 30) + ')');
      // the field of a at b's place: force per unit charge, direction away from a if a is +
      var E = P.fieldOfCharge(q1 * P.e, r * 1e-9);
      fieldArr.setAttribute('x1', xb); fieldArr.setAttribute('x2', xb + (q1 > 0 ? 1 : -1) * Math.min(90, 26 * Math.sqrt(Math.abs(E) / P.fieldOfCharge(P.e, 2e-9))));
      fieldLab.setAttribute('x', xb); setSvgText(fieldLab, 'field of q at q′: ' + fmt(Math.abs(E) * 1e-9, 2) + ' V/nm');
      read.innerHTML = 'F = (' + (q1 > 0 ? '+' : '−') + 'e)(' + (q2 > 0 ? '+' : '−') + 'e) / (4π ε₀ r²) with r = ' + r.toFixed(1) + ' nm: <b>' + fmt(Math.abs(F) * 1e12, Math.abs(F) * 1e12 < 10 ? 2 : 1) + ' pN</b>, ' + (rep ? 'pushing the charges apart' : 'pulling them together') + '. Halve r and the force is four times larger.';
    }
    Array.prototype.forEach.call(sgn, function (b) { on(b, 'click', function () {
      var which = b.getAttribute('data-q'); if (which === 'a') q1 = -q1; else q2 = -q2;
      Array.prototype.forEach.call(sgn, function (x) { setSvgText(x, (x.getAttribute('data-q') === 'a' ? 'q: ' : 'q′: ') + ((x.getAttribute('data-q') === 'a' ? q1 : q2) > 0 ? '+e (tap to flip)' : '−e (tap to flip)')); });
      render();
    }); });
    on(rSl, 'input', render); render();
    steps(fig, [
      { text: 'Two charges push on each other. The force on each has the <b>same size</b>; like signs push apart, unlike signs pull together. Tap a charge button to flip its sign.' },
      { text: 'Drag the distance slider. Doubling <b>r</b> cuts the force to a quarter: the force falls with the <b>square</b> of the distance (Coulomb’s law).' },
      { text: 'Take q′ away in your mind. The push it would feel is still there at that spot: the <b>field</b> of q, the force per unit charge (lilac arrow). Figure 0.2 maps it.' }
    ]);
  });

  /* ===== 0.2 Field probe and the potential around a charge ===== */
  register('f0-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var rSl = fig.querySelector('.r'), rv = fig.querySelector('.r-val'), sgnBtn = fig.querySelector('button[data-probe]');
    var cx = 140, cy = 150, qp = 1, sc = 24; // px per nm
    // field arrows on rings (computed lengths, 1/r^2)
    var arrows = el('g', {}, g);
    [1.2, 2.2, 3.4].forEach(function (rn) {
      for (var k = 1; k < 8; k++) {
        var a = k * Math.PI / 4, E = P.fieldOfCharge(P.e, rn * 1e-9), L = 46 * Math.sqrt(E / P.fieldOfCharge(P.e, 1e-9));
        var x1 = cx + rn * sc * Math.cos(a), y1 = cy + rn * sc * Math.sin(a);
        arrow(arrows, x1, y1, x1 + L * Math.cos(a), y1 + L * Math.sin(a), '#C4B5F7', 1.4, 'field-arrow');
      }
    });
    charge(g, cx, cy, 12, 1);
    txt(g, cx, 24, 'the field around one positive charge', 'strong', 'middle');
    txt(g, cx, 286, 'arrow length: field strength (1/r²)', 'field', 'middle');
    // inset: potential against distance
    var px0 = 318, px1 = 500, py0 = 250, py1 = 60;
    el('line', { x1: px0, y1: py0, x2: px1, y2: py0, stroke: 'var(--line-2)' }, g); el('line', { x1: px0, y1: py0, x2: px0, y2: py1, stroke: 'var(--line-2)' }, g);
    txt(g, px1, py0 + 32, 'distance r, nm', '', 'end'); txt(g, px0 - 4, py1 - 8, 'φ, V', 'phi', 'end');
    [1, 2, 3, 4, 5].forEach(function (n) { var x = px0 + (n / 5.5) * (px1 - px0); el('line', { x1: x, y1: py0, x2: x, y2: py0 + 4, stroke: 'var(--line-2)' }, g); txt(g, x, py0 + 16, n, '', 'middle'); });
    [0.5, 1.0, 1.5].forEach(function (v) { var yy = py0 - (v / 1.6) * (py0 - py1); el('line', { x1: px0 - 4, y1: yy, x2: px0, y2: yy, stroke: 'var(--line-2)' }, g); txt(g, px0 - 7, yy + 4, v.toFixed(1), 'phi', 'end'); });
    var d = ''; for (var i = 0; i <= 60; i++) { var rr = 0.9 + i * (5.5 - 0.9) / 60, phi = P.potentialOfCharge(P.e, rr * 1e-9); d += (i ? ' L' : 'M') + (px0 + rr / 5.5 * (px1 - px0)).toFixed(1) + ',' + (py0 - phi / 1.6 * (py0 - py1)).toFixed(1); }
    el('path', { d: d, 'class': 'phi-line' }, g);
    txt(g, px0 + 62, py1 + 6, 'φ = q / (4π ε₀ r)', 'phi');
    var mark = el('circle', { r: 5, fill: 'var(--amber)' }, g), drop = el('line', { stroke: 'var(--amber)', 'stroke-dasharray': '3 3' }, g);
    var slope = el('line', { stroke: 'var(--field)', 'stroke-width': 1.6 }, g);
    var probe = null, pf = el('line', { 'class': 'force-arrow' }, g); pf.setAttribute('marker-end', marker(svg, '#F0B441'));
    badge(g, cx + 56, cy - 56, 1); badge(g, cx + 96, cy + 70, 2); var b3 = badge(g, 0, 0, 3); var b4 = badge(g, 0, 0, 4);
    function render() {
      var r = +rSl.value; setSvgText(rv, r.toFixed(1) + ' nm');
      var px = cx + r * sc, py = cy;
      if (probe) g.removeChild(probe); probe = charge(g, px, py, 8, qp);
      var E = P.fieldOfCharge(P.e, r * 1e-9), phi = P.potentialOfCharge(P.e, r * 1e-9), F = qp * P.e * E;
      var L = 30 * Math.sqrt(E / P.fieldOfCharge(P.e, 1e-9)) + 6;
      pf.setAttribute('x1', px + (qp > 0 ? 10 : -10)); pf.setAttribute('x2', px + (qp > 0 ? 10 + L : -10 - L)); pf.setAttribute('y1', py); pf.setAttribute('y2', py);
      var mx = px0 + r / 5.5 * (px1 - px0), my = py0 - phi / 1.6 * (py0 - py1);
      mark.setAttribute('cx', mx); mark.setAttribute('cy', my); drop.setAttribute('x1', mx); drop.setAttribute('x2', mx); drop.setAttribute('y1', my); drop.setAttribute('y2', py0);
      var s = -E * 1e-9 / 1.6 * (py0 - py1) / ((px1 - px0) / 5.5); // slope in px/px
      slope.setAttribute('x1', mx - 22); slope.setAttribute('x2', mx + 22); slope.setAttribute('y1', my + 22 * s); slope.setAttribute('y2', my - 22 * s);
      b3.setAttribute('transform', 'translate(' + (mx + 14) + ',' + (my - 18) + ')'); b4.setAttribute('transform', 'translate(' + (px0 + 30) + ',' + (py0 - 30) + ')');
      read.innerHTML = 'At r = ' + r.toFixed(1) + ' nm from one elementary charge: field <b>' + fmt(E * 1e-9, 2) + ' V/nm</b> (' + sci(E, 1) + ' V/m), potential <b>' + fmt(phi, 2) + ' V</b>. The probe (' + (qp > 0 ? '+e' : '−e') + ') feels ' + fmt(Math.abs(F) * 1e12, 2) + ' pN ' + (qp > 0 ? 'outward' : 'inward') + ' and has energy qφ = <b>' + fmt(qp * phi, 2) + ' eV</b> here.';
    }
    on(rSl, 'input', render);
    on(sgnBtn, 'click', function () { qp = -qp; setSvgText(sgnBtn, 'probe: ' + (qp > 0 ? '+e' : '−e') + ' (tap to flip)'); render(); });
    render();
    steps(fig, [
      { text: 'The lilac arrows map the <b>field</b>: at each point, the force a unit positive charge would feel. Around a positive charge they point outward.' },
      { text: 'Farther out the arrows shrink: the field falls as <b>1/r²</b>, like the force in figure 0.1. Slide the probe out and watch its force arrow shorten.' },
      { text: 'The graph is the <b>potential</b>: the work per unit charge to bring the probe in from far away, against the field. Only differences of φ can be measured; here “far away” is taken as zero.' },
      { text: 'The field is the <b>slope</b> of the potential (lilac tangent): where φ falls steeply, the push is strong. This is the picture to keep: potential is height, field is slope.' }
    ]);
  });

  /* ===== 0.3 Voltage: the potential hill between two plates ===== */
  register('f0-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var VSl = fig.querySelector('.V'), Vv = fig.querySelector('.V-val'), lSl = fig.querySelector('.l'), lv = fig.querySelector('.l-val'), xSl = fig.querySelector('.x'), sgnBtn = fig.querySelector('button[data-probe]');
    var xL = 130, xR = 390, yT = 44, yB = 178, qp = 1, xf = 0.3, V = 1.5, l = 2;
    // plates: conductors, each at one potential
    el('rect', { x: xL - 12, y: yT, width: 12, height: yB - yT, rx: 2, fill: 'var(--amber-2)' }, g);
    el('rect', { x: xR, y: yT, width: 12, height: yB - yT, rx: 2, fill: '#4b6a72' }, g);
    var pL = txt(g, xL - 6, yT - 10, '', 'amber', 'middle'), pR = txt(g, xR + 6, yT - 10, '0 V', 'cyan', 'middle');
    txt(g, xL - 6, yB + 16, 'plate at φ = V', 'amber', 'middle'); txt(g, xR + 6, yB + 16, 'plate at φ = 0', 'cyan', 'middle');
    txt(g, 60, 110, 'metal:', 'strong', 'middle'); txt(g, 60, 124, 'one', '', 'middle'); txt(g, 60, 138, 'potential', '', 'middle');
    var fa = el('g', {}, g);
    for (var k = 0; k < 4; k++) { var yy = yT + 16 + k * 34; arrow(fa, xL + 30, yy, xL + 70, yy, '#C4B5F7', 1.4, 'field-arrow'); arrow(fa, xR - 70, yy, xR - 30, yy, '#C4B5F7', 1.4, 'field-arrow'); }
    var eLab = txt(g, (xL + xR) / 2, yT + 10, '', 'field', 'middle');
    // strip
    var strip = phiStrip(g, { x: xL - 12, y: 210, w: xR + 12 - (xL - 12), h: 70 }, [], { vmin: 0, vmax: 5, label: 'φ', units: '0', xlabel: 'position across the gap' });
    txt(g, xL - 20, 246, '', 'phi', 'end');
    var probe = null, pf = el('line', { 'class': 'force-arrow' }, g); pf.setAttribute('marker-end', marker(svg, '#F0B441'));
    var pm = el('circle', { r: 5, fill: 'var(--amber)' }, g), plab = txt(g, 0, 0, '', 'amber', 'middle');
    badge(g, 92, 48, 1); badge(g, (xL + xR) / 2, yB + 40, 2); var b3 = badge(g, 0, 0, 3); badge(g, xR + 30, yB + 40, 4);
    var loop;
    function render() {
      V = +VSl.value; l = +lSl.value; setSvgText(Vv, V.toFixed(1) + ' V'); setSvgText(lv, l.toFixed(0) + ' mm');
      setSvgText(pL, V.toFixed(1) + ' V');
      var E = P.uniformField(V, l * 1e-3);
      setSvgText(eLab, 'E = V/l = ' + fmt(E, 0) + ' V/m, from + to −');
      var px = xL + xf * (xR - xL), py = 110;
      if (probe) g.removeChild(probe); probe = charge(g, px, py, 8, qp);
      var L = 20 + 8 * V;
      pf.setAttribute('x1', px + (qp > 0 ? 10 : -10)); pf.setAttribute('x2', px + (qp > 0 ? 10 + L : -10 - L)); pf.setAttribute('y1', py); pf.setAttribute('y2', py);
      plab.setAttribute('x', px); plab.setAttribute('y', py + 28); setSvgText(plab, 'test charge ' + (qp > 0 ? '+e' : '−e'));
      strip.update([{ x: 0, phi: V }, { x: 12 / (xR - xL + 24), phi: V }, { x: 1 - 12 / (xR - xL + 24), phi: 0 }, { x: 1, phi: 0 }]);
      var phi = V * (1 - xf), sx = strip.X((12 + xf * (xR - xL)) / (xR - xL + 24)), sy = strip.Y(phi);
      pm.setAttribute('cx', sx); pm.setAttribute('cy', sy);
      b3.setAttribute('transform', 'translate(' + (px - 30) + ',' + (py) + ')');
      var eV = qp * phi;
      read.innerHTML = 'V = ' + V.toFixed(1) + ' V across l = ' + l + ' mm gives a field of <b>' + fmt(E, 0) + ' V/m</b>. The test charge sits where φ = ' + fmt(phi, 2) + ' V, so its energy is qφ = <b>' + fmt(eV, 2) + ' eV</b>; crossing the whole gap changes it by ' + fmt(V, 1) + ' eV, which is ' + fmt(P.kJPerMolFromEV(V), 0) + ' kJ per mole of charges.';
    }
    on(VSl, 'input', render); on(lSl, 'input', render); on(xSl, 'input', function () { xf = +xSl.value / 100; render(); });
    on(sgnBtn, 'click', function () { qp = -qp; setSvgText(sgnBtn, 'test charge: ' + (qp > 0 ? '+e' : '−e') + ' (tap to flip)'); render(); });
    steps(fig, [
      { text: 'Each plate is a metal, a conductor. At rest a conductor has <b>no field inside</b> and sits at <b>one potential</b>: the strip is flat across each plate. Any excess charge sits on its surface.' },
      { text: 'Between the plates the potential falls in a straight line from V to 0. Its slope is the <b>field</b>, E = V / l: raise V or narrow the gap and the arrows strengthen.' },
      { text: 'The force on the test charge: a positive charge is pushed <b>downhill</b> (toward the lower potential), a negative one <b>uphill</b>. Flip the sign and watch the arrow turn round. Press Play to let it go.' },
      { text: 'Energy: moving a charge q across a potential difference Δφ changes its energy by <b>q Δφ</b>. One electron across 1 V is one <b>electron-volt</b>, 96.5 kJ per mole of electrons. That unit runs through the whole page.' }
    ]);
    render();
    loop = anim(fig, function (dt) {
      if (dt === 0) return;
      xf += (qp > 0 ? 1 : -1) * dt * 0.28; if (xf > 1.02) xf = -0.02; if (xf < -0.02) xf = 1.02;
      xSl.value = Math.round(Math.max(0, Math.min(1, xf)) * 100); render();
    }, { autoplay: false, stepDt: 0.35 });
    bind(fig, loop);
  });

  /* ===== 0.4 A wire carrying current: potential along the path ===== */
  register('f0-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var VSl = fig.querySelector('.V'), Vv = fig.querySelector('.V-val'), RSl = fig.querySelector('.R'), Rv = fig.querySelector('.R-val'), swBtn = fig.querySelector('.sw-btn');
    var closed = true, V = 1.5, R = 3;
    // the loop: cell at left, wire along the top through a switch, resistor (lamp) at right, wire back along the bottom
    var cx = 70, ct = 70, cb = 150; // cell box
    el('rect', { x: cx - 24, y: ct, width: 48, height: cb - ct, rx: 6, fill: 'var(--panel)', stroke: 'var(--line-2)' }, g);
    el('rect', { x: cx - 16, y: ct + 10, width: 32, height: 26, rx: 2, fill: 'var(--amber-2)', 'fill-opacity': '.8' }, g);
    el('rect', { x: cx - 16, y: cb - 36, width: 32, height: 26, rx: 2, fill: 'var(--metal)' }, g);
    txt(g, cx, ct - 8, '+', 'strong big', 'middle'); txt(g, cx, cb + 16, '−', 'strong big', 'middle');
    txt(g, cx - 30, 114, 'cell', '', 'end');
    var pathD = 'M' + cx + ',' + ct + ' V40 H200 M240,40 H410 V80 M410,140 V180 H' + cx + ' V' + cb;
    el('path', { d: pathD, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2.5 }, g);
    // switch
    var sw = el('g', { 'class': 'sw', role: 'button', tabindex: '0', 'aria-pressed': 'true', 'aria-label': 'Open or close the switch' }, g);
    el('rect', { x: 190, y: 8, width: 60, height: 50, fill: 'transparent' }, sw);
    el('circle', { cx: 200, cy: 40, r: 4, fill: 'var(--text)' }, sw); el('circle', { cx: 240, cy: 40, r: 4, fill: 'var(--text)' }, sw);
    var blade = el('line', { x1: 200, y1: 40, x2: 240, y2: 40, stroke: 'var(--text)', 'stroke-width': 3, 'stroke-linecap': 'round' }, sw);
    txt(sw, 220, 26, 'switch', 'amber', 'middle');
    // resistor as a zigzag (the lamp filament)
    el('path', { d: 'M410,80 l-10,8 l20,8 l-20,8 l20,8 l-20,8 l20,8 l-20,8 l10,4', fill: 'none', stroke: 'var(--text)', 'stroke-width': 2.2 }, g);
    var lamp = el('circle', { cx: 410, cy: 110, r: 24, fill: 'none', stroke: 'var(--line-2)' }, g);
    var glow = el('circle', { cx: 410, cy: 110, r: 24, 'class': 'lamp lamp-on' }, g); glow.setAttribute('fill-opacity', '.22');
    txt(g, 446, 106, 'lamp,', ''); var Rlab = txt(g, 446, 120, 'R', '');
    // electrons along the full wire path (one continuous path for the flow)
    var ePath = el('path', { d: 'M' + cx + ',' + cb + ' V180 H410 V40 H' + cx + ' V' + ct, fill: 'none', stroke: 'none' }, g);
    var ef = flow(svg, ePath, { n: 14, cls: 'e-dot', r: 3, speed: 40, parent: g });
    txt(g, 300, 196, 'electrons: from − to +, through the wire', 'cyan', 'middle');
    var fieldW = arrow(g, 330, 62, 290, 62, '#C4B5F7', 1.4, 'field-arrow'); txt(g, 310, 76, 'field along the wire', 'field', 'middle');
    // strip: the path unrolled from the − terminal, through the cell, the top wire, the switch, the lamp and the bottom wire
    var strip = phiStrip(g, { x: 56, y: 224, w: 440, h: 70 }, [], { vmin: 0, vmax: 5, label: 'φ', units: '0', xlabel: 'path: − terminal → cell → wire → switch → lamp → wire → −' });
    var segLabs = [['inside the cell', 0.1], ['wire', 0.3], ['switch', 0.44], ['lamp', 0.62], ['wire', 0.85]].map(function (s) { return txt(g, strip.X(s[1]), 212, s[0], '', 'middle'); });
    badge(g, cx + 40, ct - 8, 1); badge(g, 372, 150, 2); badge(g, 235, 166, 3); badge(g, 462, 150, 4);
    function render() {
      V = +VSl.value; R = +RSl.value; setSvgText(Vv, V.toFixed(1) + ' V'); setSvgText(Rv, R + ' Ω'); setSvgText(Rlab, 'R = ' + R + ' Ω');
      var I = closed ? P.ohmCurrent(V, R) : 0, Pw = P.power(I, V);
      blade.setAttribute('x2', closed ? 240 : 232); blade.setAttribute('y2', closed ? 40 : 16); sw.setAttribute('aria-pressed', String(closed));
      glow.setAttribute('class', 'lamp ' + (closed ? 'lamp-on glow' : 'lamp-off')); glow.setAttribute('fill-opacity', closed ? String(0.25 + 0.5 * Math.min(1, Pw / 2)) : '.15');
      ef.show(closed); ef.setSpeed(18 + 60 * Math.min(1, I / 1.5)); if (closed) ef.start(); else ef.stop();
      fieldW.style.display = closed ? '' : 'none';
      var wireDrop = closed ? 0.03 * V : 0, lampDrop = closed ? V - 2 * wireDrop : 0, swDrop = closed ? 0 : V;
      // unrolled path fractions: 0..0.12 cell, 0.12..0.40 top wire, 0.40..0.48 switch, 0.48..0.76 lamp, 0.76..1 bottom wire
      strip.update([{ x: 0, phi: 0 }, { x: 0.02, phi: 0 }, { x: 0.12, phi: V }, { x: 0.40, phi: V - wireDrop }, { x: 0.48, phi: V - wireDrop - swDrop },
        { x: 0.76, phi: V - wireDrop - swDrop - lampDrop }, { x: 1, phi: 0 }]);
      setSvgText(swBtn, closed ? 'Open the switch' : 'Close the switch');
      read.innerHTML = closed
        ? 'I = V / R = ' + V.toFixed(1) + ' V / ' + R + ' Ω = <b>' + fmt(I, 2) + ' A</b>: ' + fmt(I, 2) + ' coulombs per second, or ' + sci(P.electronsPerSecond(I), 1) + ' electrons per second past any point of the wire. Power P = I V = <b>' + fmt(Pw, 2) + ' W</b>. Almost all of the ' + V.toFixed(1) + ' V is dropped across the lamp; the copper wire takes a small share because metals conduct so well.'
        : 'Switch open: no current, so no drop along any conductor. Each side of the wire sits at one potential, the whole ' + V.toFixed(1) + ' V appears across the open switch, and the lamp is dark. The push is there; nothing can move.';
    }
    pressable(sw, function () { closed = !closed; render(); }); on(swBtn, 'click', function () { closed = !closed; render(); });
    on(VSl, 'input', render); on(RSl, 'input', render);
    steps(fig, [
      { text: 'The cell holds its two terminals a fixed <b>potential difference</b> V apart (module 1 shows how). On the strip, φ rises by V inside the cell. 1 V means 1 joule for every coulomb moved between the terminals.' },
      { text: 'Along the wire and through the lamp the potential <b>falls</b>. A current can only flow through a resistance if there is a potential difference to drive it: <b>V = I R</b>, Ohm’s law. Turn R up and the current drops.' },
      { text: 'Electrons (pale dots) leave the <b>−</b> terminal and travel through the wire to the <b>+</b> terminal: the force on a negative charge points against the field, up the potential hill. The lamp brightens with the power, P = I V.' },
      { text: 'Current is <b>charge per second</b>: 1 A is 1 C/s, about 6 × 10¹⁸ electrons a second. Open the switch and the slope vanishes: no current, one potential along each wire, the whole V across the gap.' }
    ]);
    render();
    bind(fig, { start: function () { if (closed) ef.start(); }, stop: ef.stop });
  });

  /* ===== 0.5 An ion in a liquid: force, drag, terminal velocity ===== */
  register('f0-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var ESl = fig.querySelector('.E'), Ev = fig.querySelector('.E-val'), rSl = fig.querySelector('.rad'), rv = fig.querySelector('.rad-val');
    var xL = 90, xR = 430, yT = 40, yB = 170;
    el('rect', { x: xL, y: yT, width: xR - xL, height: yB - yT, rx: 6, fill: 'var(--cyan)', 'fill-opacity': '.1', stroke: 'var(--cyan)', 'stroke-opacity': '.5' }, g);
    el('rect', { x: xL - 12, y: yT, width: 12, height: yB - yT, rx: 2, fill: 'var(--amber-2)', 'fill-opacity': '.8' }, g);
    el('rect', { x: xR, y: yT, width: 12, height: yB - yT, rx: 2, fill: '#4b6a72' }, g);
    txt(g, xL - 6, yT - 10, '+', 'strong big', 'middle'); txt(g, xR + 6, yT - 10, '−', 'strong big', 'middle');
    txt(g, 260, 24, 'liquid electrolyte between two electrodes', 'strong', 'middle');
    var farr = el('g', {}, g);
    for (var k = 0; k < 3; k++) { var yy = yT + 24 + k * 44; arrow(farr, xL + 20, yy, xL + 56, yy, '#C4B5F7', 1.2, 'field-arrow'); arrow(farr, xR - 56, yy, xR - 20, yy, '#C4B5F7', 1.2, 'field-arrow'); }
    var Elab = txt(g, 260, yB - 8, '', 'field', 'middle');
    // our ion (cation) and an anion, with force and drag arrows
    var ion = ourIon(g, 200, 90, 7, 'our ion, +', true), an = el('circle', { cx: 320, cy: 130, r: 6, 'class': 'ion an' }, g); txt(g, 320, 150, 'anion, −', '', 'middle');
    var fE = el('line', { 'class': 'force-arrow' }, g), fD = el('line', { stroke: 'var(--anion)', 'stroke-width': 2.2 }, g), fA = el('line', { 'class': 'force-arrow' }, g);
    fE.setAttribute('marker-end', marker(svg, '#F0B441')); fD.setAttribute('marker-end', marker(svg, '#9AA9A5')); fA.setAttribute('marker-end', marker(svg, '#F0B441'));
    var lE = txt(g, 0, 0, 'electric force |z|eE', 'amber', 'middle'), lD = txt(g, 0, 0, 'drag 6πηrv', '', 'middle');
    var strip = phiStrip(g, { x: xL - 12, y: 210, w: xR + 24 - xL, h: 60 }, [{ x: 0, phi: 1 }, { x: 0.03, phi: 1 }, { x: 0.97, phi: 0 }, { x: 1, phi: 0 }], { vmin: 0, vmax: 1.2, label: 'φ', units: '', xlabel: 'cations are driven down the slope, anions up' });
    badge(g, 150, 60, 1); var b2 = badge(g, 0, 0, 2); badge(g, 380, 60, 3); badge(g, 36, 232, 4);
    var x = 200, v = 0, xa = 320, va = 0, E = 1, rad = 1;
    function render() {
      setSvgText(Ev, ESl.value + ' (relative)'); setSvgText(rv, rSl.value + ' (relative)');
      E = +ESl.value; rad = +rSl.value; setSvgText(Elab, 'field E = slope of φ; here ' + E + ' unit' + (E > 1 ? 's' : ''));
      var u = 1 / rad, vt = u * E;
      ion.move(x, 90); an.setAttribute('cx', xa);
      var L = 14 + 18 * E, Ld = 14 + 18 * (rad * Math.abs(v)); // drag = 6 pi eta r v, in the same units
      fE.setAttribute('x1', x + 10); fE.setAttribute('x2', x + 10 + L); fE.setAttribute('y1', 90); fE.setAttribute('y2', 90);
      fD.setAttribute('x1', x - 10); fD.setAttribute('x2', x - 10 - Ld); fD.setAttribute('y1', 90); fD.setAttribute('y2', 90); fD.style.display = Ld > 14.5 ? '' : 'none';
      fA.setAttribute('x1', xa - 9); fA.setAttribute('x2', xa - 9 - (14 + 18 * E)); fA.setAttribute('y1', 130); fA.setAttribute('y2', 130);
      lE.setAttribute('x', x + 10 + L / 2); lE.setAttribute('y', 78); lD.setAttribute('x', x - 10 - Ld / 2); lD.setAttribute('y', 126); lD.style.display = fD.style.display;
      b2.setAttribute('transform', 'translate(' + (x - 10 - Ld - 16) + ',' + 90 + ')');
      read.innerHTML = 'Mobility u = |z| e / (6π η r): a bigger ion (larger r) or a thicker liquid (larger η) moves more slowly for the same push. Terminal speed v = u E = <b>' + fmt(vt, 2) + '</b> relative units here (field ' + E + ', radius ' + rad + '). Both ions carry current: cations one way, anions the other.';
    }
    on(ESl, 'input', function () { v = 0; va = 0; render(); }); on(rSl, 'input', function () { v = 0; render(); });
    steps(fig, [
      { text: 'The field between the electrodes pushes <b>our ion</b> (a cation) toward the − side with force |z| e E, and the anion the other way with the same size of force.' },
      { text: 'As the ion speeds up, the liquid drags on it, 6π η r v, harder the faster it goes. When drag equals the push the ion stops accelerating: it drifts at a <b>terminal velocity</b> v = u E, and u is its <b>mobility</b>. Press Play.' },
      { text: 'Both ions carry current. Conductivity adds up every ion’s charge, mobility and concentration: κ = F Σ |z| u C. Salty, thin liquids with small fast ions conduct best.' },
      { text: 'In a liquid carrying current the potential slopes (the strip): cations run <b>down</b> the slope, anions <b>up</b>. The slope is the field. Every region stays neutral: any pile-up of charge would make a huge field that erases it at once.' }
    ]);
    render();
    var loop = anim(fig, function (dt) {
      if (dt === 0) return;
      var u = 1 / rad, vt = u * E, tau = 0.35 * rad; // v relaxes to vt with the drag time scale
      v += (vt - v) * Math.min(1, dt / tau); va += (vt - va) * Math.min(1, dt / tau);
      x += v * 60 * dt; xa -= va * 60 * dt;
      if (x > xR - 30) { x = xL + 30; v = 0; } if (xa < xL + 30) { xa = xR - 30; va = 0; }
      render();
    }, { autoplay: true, stepDt: 0.2 });
    bind(fig, loop);
  });

  /* ===== hero: the page in one cell, animated ===== */
  register('hero', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg);
    var yT = 70, yB = 210, xN0 = 92, xN1 = 170, xP0 = 300, xP1 = 400;
    // collectors, negative host (layered), electrolyte, positive host (particles)
    el('rect', { x: xN0 - 12, y: yT, width: 12, height: yB - yT, fill: 'var(--copper)', 'fill-opacity': '.9' }, g);
    el('rect', { x: xP1, y: yT, width: 12, height: yB - yT, fill: '#cfd6d8' }, g);
    el('rect', { x: xN0, y: yT, width: xN1 - xN0, height: yB - yT, fill: '#2b3538' }, g);
    for (var i = 0; i < 9; i++) el('line', { x1: xN0 + 6, x2: xN1 - 6, y1: yT + 12 + i * 15.5, y2: yT + 12 + i * 15.5, stroke: 'var(--cyan)', 'stroke-opacity': '.35' }, g);
    el('rect', { x: xN1, y: yT, width: xP0 - xN1, height: yB - yT, fill: 'var(--cyan)', 'fill-opacity': '.12' }, g);
    el('line', { x1: (xN1 + xP0) / 2, x2: (xN1 + xP0) / 2, y1: yT + 4, y2: yB - 4, stroke: 'var(--cyan)', 'stroke-dasharray': '3 5', 'stroke-opacity': '.7' }, g);
    el('rect', { x: xP0, y: yT, width: xP1 - xP0, height: yB - yT, fill: 'var(--amber-2)', 'fill-opacity': '.18' }, g);
    var parts = [[326, 96, 14], [368, 108, 16], [334, 150, 17], [380, 160, 13], [322, 192, 12], [366, 196, 15]];
    parts.forEach(function (c) { el('circle', { cx: c[0], cy: c[1], r: c[2], fill: 'var(--amber-2)', 'fill-opacity': '.9', stroke: 'var(--amber)', 'stroke-opacity': '.6' }, g); });
    var target = el('circle', { cx: parts[2][0], cy: parts[2][1], r: parts[2][2] + 3, fill: 'none', stroke: 'var(--cation)', 'stroke-opacity': '0' }, g);
    // faint field arrows in the electrolyte (module 0)
    for (var k = 0; k < 3; k++) { var yy = yT + 34 + k * 44; arrow(g, xN1 + 14, yy, xN1 + 44, yy, '#C4B5F7', 1.1, 'field-arrow').setAttribute('opacity', '.55'); arrow(g, xP0 - 44, yy, xP0 - 14, yy, '#C4B5F7', 1.1, 'field-arrow').setAttribute('opacity', '.55'); }
    // the wire, the lamp and the electrons (module 1)
    var wireD = 'M' + (xN0 - 6) + ',' + yT + ' V34 H' + (xP1 + 6) + ' V' + yT;
    el('path', { d: wireD, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g);
    var lampX = 246, lamp = el('circle', { cx: lampX, cy: 34, r: 13, fill: 'var(--cation)', 'fill-opacity': '.35', stroke: 'var(--line-2)' }, g);
    var glow = el('circle', { cx: lampX, cy: 34, r: 22, fill: 'var(--cation)', 'fill-opacity': '.08' }, g);
    var ePath = el('path', { d: 'M' + (xN0 - 6) + ',' + yT + ' V34 H' + (xP1 + 6) + ' V' + yT, fill: 'none', stroke: 'none' }, g);
    var ef = flow(svg, ePath, { n: 9, cls: 'e-dot', r: 2.6, speed: 46, parent: g, animOnly: false });
    // our ion crossing (modules 1 and 3)
    var ion = ourIon(g, xN1 - 10, 150, 5, 'our ion', true);
    // potential strip (module 3)
    var strip = phiStrip(g, { x: xN0 - 12, y: 232, w: xP1 + 12 - (xN0 - 12), h: 40 }, [{ x: 0, phi: 0 }, { x: 0.24, phi: 0 }, { x: 0.241, phi: 0.5 }, { x: 0.76, phi: 0.5 }, { x: 0.761, phi: 1 }, { x: 1, phi: 1 }], { vmin: -0.1, vmax: 1.15, label: 'φ', units: '' });
    var cellT = txt(g, 60, 22, '', 'amber'); cellT.classList.add('your-cell-name');
    txt(g, 60, 22 - 12, 'Your cell', '');
    // module tags
    function tag(x, y, label, anchor) { var w = label.length * 6.6 + 14; var bx = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x; el('rect', { x: bx, y: y - 12, width: w, height: 17, rx: 8, 'class': 'tag-bg' }, g); txt(g, bx + w / 2, y, label, 'tag', 'middle'); }
    tag(252, yB + 16, '0 · the field', 'middle');
    tag(lampX + 30, 44, '1 · the wire and the lamp', 'start');
    tag(xN0 - 22, yB + 16, '2 · the parts', 'start');
    tag(xP1 + 12, 292, '3 · the voltage', 'end');
    tag(xP1 + 12, yB + 16, '4 · the energy', 'end');
    var t = 0, ph = 0;
    function tick(dt) {
      if (dt === 0) { return; }
      t += dt; ph = (ph + dt / 5.5) % 1; ef.advance(dt);
      var k = smooth(Math.min(1, ph / 0.8)), x = lerp(xN1 - 10, parts[2][0], k), y = lerp(150, parts[2][1], k) + Math.sin(ph * 12) * 4 * (1 - k);
      ion.move(x, y); ion.g.style.opacity = ph > 0.92 ? String((1 - ph) / 0.08) : ph < 0.05 ? String(ph / 0.05) : '1';
      target.setAttribute('stroke-opacity', String(ph > 0.8 ? 0.9 * (1 - (ph - 0.8) / 0.2) : 0));
      var pulse = 0.75 + 0.25 * Math.sin(t * 2.4);
      lamp.setAttribute('fill-opacity', String(0.45 + 0.45 * pulse)); glow.setAttribute('fill-opacity', String(0.06 + 0.14 * pulse)); glow.setAttribute('r', String(20 + 6 * pulse));
    }
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.3 });
    bind(fig, loop);
  });

  /* =================================================================
     Module 1: what a battery does. The Daniell cell after Winter and
     Brodd 2004 Figure 1, with the potential profile after Bard, Faulkner
     and White Figures 1.1.2 (open circuit) and 1.5.2 (current flowing).
     ================================================================= */

  /* ===== 1.1 The Daniell cell, with reaction events and the potential strip ===== */
  register('f1-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), swBtn = fig.querySelector('.sw-btn');
    var E0 = P.data.daniell.E; // 1.103 V
    var bx0 = 60, bx1 = 460, by0 = 104, by1 = 292, sep = 260;
    // beaker with two half-cells
    el('rect', { x: bx0, y: by0, width: bx1 - bx0, height: by1 - by0, rx: 8, fill: 'var(--cyan)', 'fill-opacity': '.1', stroke: 'var(--cyan)', 'stroke-opacity': '.5' }, g);
    el('line', { x1: sep, y1: by0 + 6, x2: sep, y2: by1 - 6, stroke: 'var(--cyan)', 'stroke-dasharray': '3 5' }, g);
    txt(g, 193, by0 + 16, 'ZnSO₄ solution', 'cyan', 'middle'); txt(g, 327, by0 + 16, 'CuSO₄ solution', 'cyan', 'middle');
    txt(g, sep, by1 + 16, 'porous separator: ions pass, the liquids do not mix', '', 'middle');
    // electrodes (the zinc thins, the copper thickens, as the cell runs)
    var zn = el('rect', { x: 100, y: 70, width: 26, height: 200, rx: 2, fill: 'var(--metal)' }, g);
    var cu = el('rect', { x: 394, y: 70, width: 26, height: 200, rx: 2, fill: 'var(--copper)' }, g);
    txt(g, 113, 262, 'Zn', 'strong', 'middle'); txt(g, 407, 262, 'Cu', 'strong', 'middle');
    txt(g, 88, 66, '−', 'strong big', 'end'); txt(g, 432, 66, '+', 'strong big');
    txt(g, 113, 326, 'Zn → Zn²⁺ + 2e⁻', '', 'middle'); txt(g, 407, 326, 'Cu²⁺ + 2e⁻ → Cu', '', 'middle');
    txt(g, 113, 340, 'the zinc dissolves', '', 'middle'); txt(g, 407, 340, 'copper plates out', '', 'middle');
    // wire with switch and lamp; voltmeter across the terminals
    var wireD = 'M113,70 V26 H176 M216,26 H407 V70';
    el('path', { d: wireD, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2.2 }, g);
    var sw = el('g', { 'class': 'sw', role: 'button', tabindex: '0', 'aria-pressed': 'false', 'aria-label': 'Open or close the switch' }, g);
    el('rect', { x: 166, y: 0, width: 60, height: 44, fill: 'transparent' }, sw);
    el('circle', { cx: 176, cy: 26, r: 4, fill: 'var(--text)' }, sw); el('circle', { cx: 216, cy: 26, r: 4, fill: 'var(--text)' }, sw);
    var blade = el('line', { x1: 176, y1: 26, x2: 208, y2: 6, stroke: 'var(--text)', 'stroke-width': 3, 'stroke-linecap': 'round' }, sw);
    txt(sw, 196, 44, 'switch', 'amber', 'middle');
    var lamp = el('circle', { cx: 310, cy: 26, r: 13, 'class': 'lamp lamp-off' }, g); txt(g, 310, 50, 'lamp', '', 'middle');
    el('path', { d: 'M113,58 H232 M288,58 H407', fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 1.2 }, g);
    el('circle', { cx: 260, cy: 58, r: 20, fill: 'var(--panel)', stroke: 'var(--line-2)' }, g);
    var vm = txt(g, 260, 62, '1.10 V', 'strong', 'middle'); txt(g, 260, 92, 'voltmeter', '', 'middle');
    var eLab = txt(g, 340, 12, 'e⁻ through the wire →', 'cyan', 'middle');
    var fieldW = arrow(g, 380, 40, 340, 40, '#C4B5F7', 1.3, 'field-arrow'); var fieldWl = txt(g, 360, 12 + 40, '', 'field', 'middle');
    // ions: sulfate (grey) migrating left across the separator; Zn2+ born at the zinc; Cu2+ consumed at the copper
    var ions = el('g', {}, g);
    var sulf = []; for (var i = 0; i < 7; i++) sulf.push({ x: 150 + Math.random() * 260, y: 130 + Math.random() * 140, c: el('circle', { r: 3.4, 'class': 'ion an' }, ions) });
    var cu2 = []; for (i = 0; i < 6; i++) cu2.push({ x: 300 + Math.random() * 80, y: 130 + Math.random() * 140, c: el('circle', { r: 3.4, 'class': 'ion' }, ions) });
    var zn2 = [];
    var lab = { s: txt(g, 193, 190, 'SO₄²⁻', '', 'middle'), c: txt(g, 327, 150, 'Cu²⁺', 'amber', 'middle'), z: txt(g, 193, 150, 'Zn²⁺', 'amber', 'middle') };
    var our = ourIon(g, 140, 200, 5, 'our ion'); our.g.style.display = 'none';
    var fieldS = arrow(g, 190, 280, 240, 280, '#C4B5F7', 1.3, 'field-arrow'); var fieldSl = txt(g, 215, 296 - 20, '', 'field', 'middle');
    // events at the electrodes
    var evZ = el('g', { 'class': 'event' }, g), evC = el('g', { 'class': 'event' }, g);
    var eflow = flow(svg, el('path', { d: 'M113,70 V26 H407 V70', fill: 'none', stroke: 'none' }, g), { n: 12, cls: 'e-dot', r: 3, speed: 60, parent: g });
    // the potential strip: Zn metal | solution (Zn side) | separator | solution (Cu side) | Cu metal
    var strip = phiStrip(g, { x: 100, y: 350, w: 320, h: 56 }, [], { vmin: -0.1, vmax: 1.3, label: 'φ', units: '', xlabel: '' });
    txt(g, 113, 418, 'Zn', 'phi', 'middle'); txt(g, 407, 418, 'Cu', 'phi', 'middle'); txt(g, 260, 418, 'solution', 'phi', 'middle');
    var jumpL = txt(g, 150, 364, 'jump', 'phi', 'middle'), jumpR = txt(g, 372, 364, 'jump', 'phi', 'middle'), sumT = txt(g, 470, 374, '', 'phi strong', 'middle');
    badge(g, 74, 210, 1); badge(g, 446, 210, 2); badge(g, 260, 244, 3); badge(g, 470, 404, 4); badge(g, 148, 26, 5);
    var closed = false, t = 0, evT = 0, ranZn = 0, ranCu = 0;
    function render() {
      blade.setAttribute('x2', closed ? 216 : 208); blade.setAttribute('y2', closed ? 26 : 6); sw.setAttribute('aria-pressed', String(closed));
      lamp.setAttribute('class', 'lamp ' + (closed ? 'lamp-on glow' : 'lamp-off'));
      eflow.show(closed); if (closed) eflow.start(); else eflow.stop();
      fieldW.style.display = fieldS.style.display = closed ? '' : 'none';
      setSvgText(fieldWl, closed ? 'field' : ''); setSvgText(fieldSl, closed ? 'field in the liquid' : '');
      eLab.style.display = closed ? '' : 'none';
      setSvgText(vm, closed ? 'below 1.10 V' : '1.10 V');
      setSvgText(swBtn, closed ? 'Open the switch' : 'Close the switch');
      var drop = closed ? 0.12 : 0, jL = 0.45, jR = E0 - jL; // the split between the two jumps is schematic (not measurable separately)
      strip.update([{ x: 0, phi: 0 }, { x: 0.08, phi: 0 }, { x: 0.081, phi: jL }, { x: 0.92, phi: jL - drop }, { x: 0.921, phi: jL - drop + jR }, { x: 1, phi: E0 - drop }]);
      setSvgText(sumT, closed ? '< 1.10 V' : '1.10 V');
      zn.setAttribute('width', String(26 - 3 * Math.min(1, ranZn / 12))); zn.setAttribute('x', String(100 + 3 * Math.min(1, ranZn / 12)));
      cu.setAttribute('width', String(26 + 3 * Math.min(1, ranCu / 12)));
      read.innerHTML = closed
        ? 'Switch closed: zinc atoms leave the left electrode as Zn²⁺ and their electrons run through the wire and the lamp to the copper, where Cu²⁺ ions take them and plate out. Inside the liquid, sulfate migrates toward the zinc and the cations toward the copper, so no charge piles up anywhere. The voltmeter now reads a little less than 1.10 V (a later module says how much less).'
        : 'Switch open: nothing moves, but the push is there. The voltmeter draws almost no current and reads the open-circuit voltage, <b>1.10 V</b>: the difference of the two standard potentials, 0.340 V − (−0.763 V).';
    }
    function spawnZn() { // a zinc atom leaves as Zn2+; two electrons go up the wire
      var y = 130 + Math.random() * 130; var c = el('circle', { r: 3.4, 'class': 'ion' }, ions); zn2.push({ x: 128, y: y, c: c, age: 0 });
      clear(evZ); var f = el('circle', { cx: 126, cy: y, r: 9, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.5 }, evZ); txt(evZ, 96, y + 4, '2e⁻ ↑', 'cyan', 'end');
      ranZn++; if (ranZn === 2) { our.g.style.display = ''; zn2[zn2.length - 1].our = true; }
    }
    function consumeCu() { // a Cu2+ near the copper takes two electrons and joins the metal
      var best = null; cu2.forEach(function (p) { if (!best || p.x > best.x) best = p; }); if (!best) return;
      clear(evC); el('circle', { cx: 392, cy: best.y, r: 9, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.5 }, evC); txt(evC, 424, best.y + 4, '← 2e⁻', 'cyan');
      best.x = 300 + Math.random() * 40; best.y = 130 + Math.random() * 140; ranCu++;
    }
    function tick(dt) {
      if (!closed || dt === 0) { return; }
      t += dt; evT += dt;
      if (evT > 1.6) { evT = 0; spawnZn(); consumeCu(); }
      if (t > 0.8) { evZ.style.opacity = '0'; evC.style.opacity = '0'; } else { evZ.style.opacity = '1'; evC.style.opacity = '1'; }
      if (evT < 0.05) t = 0;
      sulf.forEach(function (p) { p.x -= 22 * dt; p.y += Math.sin(t * 3 + p.x) * 6 * dt; if (p.x < 150) p.x = 440; p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
      cu2.forEach(function (p) { p.x += 14 * dt; if (p.x > 386) p.x = 386; p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
      zn2.forEach(function (p) { p.x += 14 * dt; p.age += dt; if (p.x > 250) p.x = 250; p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); if (p.our) our.move(p.x, p.y); });
      while (zn2.length > 8) { var old = zn2.shift(); ions.removeChild(old.c); if (old.our) our.g.style.display = 'none'; }
      render();
    }
    sulf.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); }); cu2.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
    pressable(sw, function () { closed = !closed; render(); }); on(swBtn, 'click', function () { closed = !closed; render(); });
    steps(fig, [
      { text: 'At the zinc, an atom gives up two electrons and leaves the metal as a <b>Zn²⁺</b> ion (amber ring flashes as it happens). The zinc slowly gets thinner. Close the switch to start.', on: function () { } },
      { text: 'At the copper, a <b>Cu²⁺</b> ion from the solution takes two electrons and becomes a copper atom on the surface. The copper slowly gets thicker.' },
      { text: 'Inside the liquid the current is carried by ions: <b>sulfate</b> drifts toward the zinc and the cations toward the copper, through the porous separator. The field in the liquid is the gentle slope on the strip. Our ion is a Zn²⁺ born at the zinc.' },
      { text: 'The strip: the potential <b>jumps</b> at each metal|liquid boundary and is flat through the liquid at open circuit. The voltmeter reads the sum of the jumps, <b>1.10 V</b>. Only the sum can be measured; the split drawn between the two jumps is schematic.' },
      { text: 'The electrons cannot cross the liquid (it has no free electrons) so they take the wire, from the more negative electrode to the more positive, and light the lamp on the way. The wire’s field points the other way; the force on a negative charge is against it.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.4, onPlay: function () { if (!closed) { closed = true; render(); } } });
    render();
    bind(fig, { start: function () { loop.start(); if (closed) eflow.start(); }, stop: function () { loop.stop(); eflow.stop(); } });
  });

  /* ===== 1.2 Two roads: electrons in the metal, ions in the liquid, linked at the boundary ===== */
  register('f1-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var yT = 60, yB = 200, xm0 = 40, xb = 260, xs1 = 480;
    el('rect', { x: xm0, y: yT, width: xb - xm0, height: yB - yT, rx: 4, fill: 'var(--metal)', 'fill-opacity': '.35', stroke: 'var(--metal)' }, g);
    el('rect', { x: xb, y: yT, width: xs1 - xb, height: yB - yT, rx: 4, fill: 'var(--cyan)', 'fill-opacity': '.12', stroke: 'var(--cyan)', 'stroke-opacity': '.5' }, g);
    txt(g, (xm0 + xb) / 2, yT - 14, 'metal electrode', 'strong', 'middle'); txt(g, (xb + xs1) / 2, yT - 14, 'liquid electrolyte', 'strong', 'middle');
    txt(g, (xm0 + xb) / 2, yT - 2, 'ions fixed in a lattice, electrons free', '', 'middle'); txt(g, (xb + xs1) / 2, yT - 2, 'ions free, no free electrons', '', 'middle');
    // lattice of fixed ion cores
    var lat = el('g', {}, g);
    for (var r = 0; r < 4; r++) for (var c = 0; c < 7; c++) { var x = xm0 + 22 + c * 32, y = yT + 24 + r * 32; el('circle', { cx: x, cy: y, r: 6, fill: 'var(--panel-2)', stroke: 'var(--muted)' }, lat); txt(lat, x, y + 4, '+', 'strong', 'middle'); }
    // mobile electrons in the metal, mobile ions in the liquid
    var es = []; for (var i = 0; i < 10; i++) es.push({ x: xm0 + 10 + Math.random() * (xb - xm0 - 20), y: yT + 10 + Math.random() * (yB - yT - 20), c: el('circle', { r: 3, 'class': 'e-dot' }, g) });
    var cats = []; for (i = 0; i < 6; i++) cats.push({ x: xb + 20 + Math.random() * 190, y: yT + 14 + Math.random() * (yB - yT - 28), c: el('circle', { r: 4, 'class': 'ion' }, g) });
    var ans = []; for (i = 0; i < 5; i++) ans.push({ x: xb + 20 + Math.random() * 190, y: yT + 14 + Math.random() * (yB - yT - 28), c: el('circle', { r: 3.4, 'class': 'ion an' }, g) });
    var our = ourIon(g, 0, 0, 4, 'our ion'); cats[0].our = true;
    // field arrows, same direction in both phases (from + to −); here + is on the right
    var fa = el('g', {}, g);
    arrow(fa, 150, yB + 22, 90, yB + 22, '#C4B5F7', 1.4, 'field-arrow'); txt(g, 120, yB + 40, 'field: force on a + charge', 'field', 'middle');
    arrow(fa, 400, yB + 22, 340, yB + 22, '#C4B5F7', 1.4, 'field-arrow'); txt(g, 370, yB + 40, 'same field, same direction', 'field', 'middle');
    txt(g, 120, yB + 56, 'electrons pushed the other way →', 'cyan', 'middle'); txt(g, 370, yB + 56, '← cations along it, anions against it', 'amber', 'middle');
    // the boundary: reaction event
    el('line', { x1: xb, y1: yT, x2: xb, y2: yB, stroke: 'var(--amber)', 'stroke-width': 2 }, g);
    var ev = el('g', { 'class': 'event' }, g);
    txt(g, xb, 24, 'boundary: a reaction hands the charge over', 'amber', 'middle');
    badge(g, 26, yB - 10, 1); badge(g, 494, yB - 10, 2); badge(g, xb, yB + 22, 3); badge(g, 30, yB + 22, 4);
    var t = 0, evT = 0;
    function place() {
      es.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
      cats.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); if (p.our) our.move(p.x, p.y); });
      ans.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
    }
    function tick(dt) {
      if (dt === 0) { place(); return; }
      t += dt; evT += dt;
      es.forEach(function (p) { p.x += 28 * dt; p.y += Math.sin(t * 4 + p.x) * 8 * dt; if (p.x > xb - 8) { p.x = xm0 + 8; } });
      cats.forEach(function (p) { p.x -= 16 * dt; p.y += Math.sin(t * 2 + p.x) * 6 * dt; if (p.x < xb + 10) { p.x = xs1 - 12; } });
      ans.forEach(function (p) { p.x += 12 * dt; if (p.x > xs1 - 10) p.x = xb + 12; });
      if (evT > 2.2) { evT = 0; clear(ev); var y = yT + 30 + Math.random() * (yB - yT - 60); el('circle', { cx: xb, cy: y, r: 10, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.6 }, ev); txt(ev, xb + 16, y + 4, 'cation + e⁻ → atom', 'amber'); ev.style.opacity = '1'; }
      if (evT > 1.2) ev.style.opacity = '0';
      place();
    }
    read.innerHTML = 'Two kinds of conductor, one field. In the metal the charge carriers are electrons; in the liquid they are ions. Charge can cross the boundary between them only through an electrode reaction that consumes electrons on one side and ions on the other.';
    steps(fig, [
      { text: 'In the <b>metal</b> the ion cores are locked in a lattice; only the electrons move. Pushed by the field (opposite to the arrow, because they are negative) they drift toward the + end.' },
      { text: 'In the <b>liquid</b> there are no free electrons: any that appear are gone in an instant. The carriers are ions, cations drifting one way and anions the other, both carrying current.' },
      { text: 'At the <b>boundary</b> the two roads meet. Charge can cross only if a reaction links them: an ion arrives, takes an electron from the metal and becomes an atom, or the reverse. No reaction, no current.' },
      { text: 'One field, two pushes: the field points from + to −; a positive ion is pushed along it, an electron against it. That is why, in figure 1.1, the electrons went one way round the circuit and the cations the other.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.3 });
    bind(fig, loop);
  });

  /* ===== 1.3 Cell versus battery: potentials add along a path, charge adds side by side ===== */
  register('f1-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), btns = fig.querySelectorAll('button[data-arr]'), read = fig.querySelector('.readout');
    var V = 1.5; // one cell, illustrative
    function cellSym(px, py, label) {
      var s = el('g', { transform: 'translate(' + px + ',' + py + ')' }, g);
      el('rect', { x: 0, y: 0, width: 40, height: 58, rx: 6, fill: 'var(--panel)', stroke: 'var(--line-2)' }, s);
      el('rect', { x: 7, y: 8, width: 26, height: 16, rx: 2, fill: 'var(--amber-2)', 'fill-opacity': '.8' }, s); el('rect', { x: 7, y: 34, width: 26, height: 16, rx: 2, fill: 'var(--metal)' }, s);
      txt(s, 20, -4, '+', 'strong', 'middle'); txt(s, 20, 72, '−', 'strong', 'middle');
      return s;
    }
    var arr = { single: el('g', {}, g), series: el('g', {}, g), parallel: el('g', {}, g) };
    cellSym.call(null, 120, 60); arr.single.appendChild(g.lastChild); txt(arr.single, 140, 150, 'one cell', '', 'middle');
    [50, 120, 190].forEach(function (x) { cellSym(x, 60); arr.series.appendChild(g.lastChild); });
    el('path', { d: 'M90,118 h12 v-62 h18 M160,118 h12 v-62 h18', fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.5 }, arr.series);
    txt(arr.series, 140, 150, 'in a chain: + to −', '', 'middle');
    [50, 120, 190].forEach(function (x) { cellSym(x, 60); arr.parallel.appendChild(g.lastChild); });
    el('path', { d: 'M70,56 v-12 h140 v12 M140,56 v-12 M70,118 v12 h140 v-12 M140,118 v12', fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.5 }, arr.parallel);
    txt(arr.parallel, 140, 150, 'side by side: + with +, − with −', '', 'middle');
    // bars
    txt(g, 300, 30, 'voltage between the ends', 'strong');
    el('rect', { x: 300, y: 38, width: 150, height: 16, rx: 3, fill: 'var(--cyan)', 'fill-opacity': '.25' }, g);
    var vbar = el('rect', { x: 300, y: 38, width: 50, height: 16, rx: 3, fill: 'var(--cyan)' }, g); var vlab = txt(g, 456, 51, '', 'strong');
    txt(g, 300, 86, 'charge stored (capacity)', 'strong');
    el('rect', { x: 300, y: 94, width: 150, height: 16, rx: 3, fill: 'var(--amber)', 'fill-opacity': '.25' }, g);
    var qbar = el('rect', { x: 300, y: 94, width: 50, height: 16, rx: 3, fill: 'var(--amber)' }, g); var qlab = txt(g, 456, 107, '', 'strong');
    // the potential along the path from the − end to the + end
    var strip = phiStrip(g, { x: 300, y: 138, w: 190, h: 60 }, [], { vmin: 0, vmax: 5, label: 'φ', units: '0', xlabel: 'along the path, − end → + end' });
    badge(g, 30, 40, 1); badge(g, 502, 46, 2); badge(g, 502, 102, 3);
    function show(a) {
      for (var k in arr) arr[k].style.display = k === a ? '' : 'none';
      var n = a === 'single' ? 1 : 3, Vn = a === 'parallel' ? 1 : n, Qn = a === 'series' ? 1 : n;
      vbar.setAttribute('width', String(50 * Vn)); qbar.setAttribute('width', String(50 * Qn));
      setSvgText(vlab, Vn + ' V'); setSvgText(qlab, Qn + ' Q');
      var pts = [{ x: 0, phi: 0 }];
      for (var i = 0; i < Vn; i++) { var f0 = 0.1 + i * 0.8 / Vn, f1 = f0 + 0.8 / Vn * 0.4; pts.push({ x: f0, phi: i * V }); pts.push({ x: f1, phi: (i + 1) * V }); }
      pts.push({ x: 1, phi: Vn * V }); strip.update(pts);
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-arr') === a)); });
      read.innerHTML = a === 'single' ? 'One cell: the potential rises by <b>V</b> once along the path; it holds a charge <b>Q</b>.'
        : a === 'series' ? 'Three in series: walking from the − end to the + end you climb three steps of V, and potential differences along a path add, so the voltage is <b>3V</b>. But the same current runs through all three in turn: every coulomb that leaves the first cell must pass through the second and the third, so all three empty together after <b>Q</b> coulombs. The capacity does not add.'
        : 'Three in parallel: all three + terminals are joined and all three − terminals are joined, so there is only one potential difference between the ends, <b>V</b>. The current splits three ways, each cell supplies a third of it, and together they can deliver <b>3Q</b> coulombs before all three are empty: the capacity adds, the voltage does not.';
    }
    Array.prototype.forEach.call(btns, function (b) { on(b, 'click', function () { show(b.getAttribute('data-arr')); }); });
    steps(fig, [
      { text: 'A cell is one unit: a rise of <b>V</b> in potential along the path from its − end to its + end, and a store of charge <b>Q</b>.' },
      { text: 'Series: the cells form one path, so potential differences along it <b>add</b> (three steps on the strip: 3V). The same current threads every cell, so each coulomb passes all three and they empty together: the capacity stays <b>Q</b>.' },
      { text: 'Parallel: all + ends are joined and all − ends are joined, so there is one rise, <b>V</b>. The current splits between the three cells, each gives a third, and together they hold <b>3Q</b>: the capacity adds, the voltage does not.' }
    ]);
    show('single');
  });

  /* =================================================================
     Module 2: anatomy of a cell. Coin-cell stack after Murray, Hall and
     Dahn 2019 Figure 1; layer jobs from Winter and Brodd 2004 section
     1.2; collectors after Goodenough and Park 2013 Figure 1; the
     composite coating after Winter and Brodd section 1.6.
     ================================================================= */

  /* ===== 2.1 A coin cell in cross-section ===== */
  register('f2-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), info = fig.querySelector('.part-info'), range = fig.querySelector('input[type=range]');
    var cx = 250, W = 270, x0 = cx - W / 2, x1 = cx + W / 2;
    // top view: a small disc to say "round"
    el('circle', { cx: 56, cy: 60, r: 30, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g); el('circle', { cx: 56, cy: 60, r: 24, fill: 'none', stroke: 'var(--line)' }, g);
    txt(g, 56, 64, '−', 'strong big', 'middle'); txt(g, 56, 106, 'top view: cap (−)', '', 'middle'); txt(g, 56, 120, '20 mm across', '', 'middle');
    txt(g, cx + 30, 24, 'a coin cell in cross-section, pulled apart (not to scale)', 'strong', 'middle');
    // layers, from the bottom up; y = resting position, h = thickness, k = explode order
    var layers = [
      { key: 'can', name: 'Can, aluminium-coated (+ terminal)', y: 216, h: 14, w: W, fill: '#5f7076', desc: 'Stainless-steel can with an aluminium coating on the inside: the container and the positive terminal. The positive electrode sits directly on it.' },
      { key: 'pos', name: 'Positive electrode', y: 202, h: 14, w: 200, fill: 'var(--amber-2)', desc: 'A coating of the positive active material (LiCoO₂ in the first commercial cell, a nickel-rich oxide in today’s research cells) on an aluminium surface. On discharge it takes the electrons: the electron acceptor.' },
      { key: 'sep', name: 'Separator, soaked with electrolyte', y: 194, h: 8, w: 230, fill: 'var(--cyan)', desc: 'A porous polymer film, two layers of it in this design, full of electrolyte: permeable to ions, inert, and a physical barrier that prevents electrical shorting. If the electrodes touched, the full stored energy would be released as heat inside the cell (their section 2.2).' },
      { key: 'neg', name: 'Negative electrode', y: 180, h: 14, w: 200, fill: '#2b3538', desc: 'Graphite coated on copper foil, as in the first commercial lithium-ion cell. On discharge it gives up electrons: the reducing agent.' },
      { key: 'spacer', name: 'Spacer, stainless steel', y: 168, h: 12, w: 220, fill: '#7d8f94', desc: 'A steel disc that fills the height so that the stack is pressed evenly.' },
      { key: 'spring', name: 'Spring, stainless steel', y: 152, h: 18, w: 140, fill: 'none', desc: 'A wave spring that presses the stack together so every layer stays in contact. Dropping the spring and spacer in from an angle misaligns the electrodes and can cost a fifth of the capacity in 100 cycles; placing them from directly above with a vacuum pen fixes it.' },
      { key: 'cap', name: 'Cap and gasket (− terminal)', y: 136, h: 14, w: W, fill: '#5f7076', desc: 'Stainless-steel cap, the negative terminal, crimped onto the can with a polymer gasket between them: the gasket seals the cell and keeps the two terminals from touching.' }
    ];
    var groups = {};
    layers.forEach(function (L, i) {
      var grp = el('g', { 'class': 'layer', 'data-part': L.key, tabindex: '0', role: 'button', 'aria-label': L.name }, g);
      var lx = cx - L.w / 2;
      if (L.key === 'can') { el('path', { 'class': 'shape', d: 'M' + x0 + ',' + (L.y - 60) + ' V' + (L.y + L.h - 6) + ' q0,6 6,6 H' + (x1 - 6) + ' q6,0 6,-6 V' + (L.y - 60) + ' h-8 V' + (L.y - 2) + ' H' + (x0 + 8) + ' V' + (L.y - 60) + ' Z', fill: L.fill, stroke: 'var(--line-2)' }, grp); el('rect', { x: x0 + 8, y: L.y - 2, width: W - 16, height: 3, fill: '#cfd6d8' }, grp); }
      else if (L.key === 'cap') { el('path', { 'class': 'shape', d: 'M' + (x0 + 14) + ',' + (L.y + 46) + ' V' + (L.y + 6) + ' q0,-6 6,-6 H' + (x1 - 20) + ' q6,0 6,6 V' + (L.y + 46) + ' h-8 V' + (L.y + 10) + ' H' + (x0 + 22) + ' V' + (L.y + 46) + ' Z', fill: L.fill, stroke: 'var(--line-2)' }, grp); el('rect', { x: x0 + 8, y: L.y + 12, width: 8, height: 40, rx: 2, fill: 'var(--amber)', 'fill-opacity': '.8' }, grp); el('rect', { x: x1 - 16, y: L.y + 12, width: 8, height: 40, rx: 2, fill: 'var(--amber)', 'fill-opacity': '.8' }, grp); }
      else if (L.key === 'spring') { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, fill: 'transparent', stroke: 'transparent' }, grp); el('path', { d: 'M' + lx + ',' + (L.y + L.h - 2) + ' l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14', fill: 'none', stroke: '#9fb1b6', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, grp); }
      else if (L.key === 'sep') { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, rx: 2, fill: L.fill, 'fill-opacity': '.35', stroke: 'var(--cyan)', 'stroke-opacity': '.7' }, grp); for (var k = 0; k < 26; k++) el('circle', { cx: lx + 6 + k * 8.8, cy: L.y + 4, r: 1.6, fill: 'var(--bg-2)' }, grp); }
      else { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, rx: 2, fill: L.fill, stroke: 'var(--line-2)' }, grp);
        if (L.key === 'neg') { el('rect', { x: lx, y: L.y, width: L.w, height: 3, fill: 'var(--copper)' }, grp); for (var q = 0; q < 12; q++) el('circle', { cx: lx + 10 + q * 17, cy: L.y + 9, r: 1.8, fill: 'var(--cyan)', 'fill-opacity': '.8' }, grp); }
        if (L.key === 'pos') { for (var q2 = 0; q2 < 12; q2++) el('circle', { cx: lx + 10 + q2 * 17, cy: L.y + 6, r: 1.8, fill: 'var(--cyan)', 'fill-opacity': '.8' }, grp); }
      }
      var shortName = { can: 'can (+)', pos: 'positive electrode', sep: 'separator', neg: 'negative electrode', spacer: 'spacer', spring: 'spring', cap: 'cap (−)' }[L.key];
      var lab = txt(grp, x1 + 10, L.y + (L.key === 'cap' ? 26 : L.key === 'can' ? 8 : L.key === 'spring' ? L.h / 2 + 10 : L.h / 2 + 4), shortName, '');
      groups[L.key] = grp; L.g = grp; L.i = i;
    });
    // the potential strip: cap (−) → negative → separator → positive → can (+)
    var strip = phiStrip(g, { x: 70, y: 286, w: 380, h: 40 }, [{ x: 0, phi: 0 }, { x: 0.18, phi: 0 }, { x: 0.181, phi: 0.6 }, { x: 0.8, phi: 0.6 }, { x: 0.801, phi: 1 }, { x: 1, phi: 1 }], { vmin: -0.1, vmax: 1.15, label: 'φ', units: '', xlabel: '' });
    txt(g, 100, 340, 'cap and graphite (−)', 'phi', 'middle'); txt(g, 260, 340, 'electrolyte in the separator', 'phi', 'middle'); txt(g, 420, 340, 'LiCoO₂ and can (+)', 'phi', 'middle');
    txt(g, 470, 300, 'V', 'phi strong', 'middle');
    badge(g, 108, 187, 1); badge(g, 108, 216, 2); badge(g, 108, 140, 3); badge(g, 415, 84, 4); badge(g, 40, 286, 5);
    function explode(k) { layers.forEach(function (L) { L.g.setAttribute('transform', 'translate(0,' + ((3 - L.i) * 30 * k) + ')'); }); Array.prototype.forEach.call(svg.querySelectorAll('.callout'), function (c) { var st = +c.getAttribute('data-step'); if (st === 4) c.setAttribute('transform', 'translate(415,' + (138 - 90 * k) + ')'); }); }
    function pick(L) { layers.forEach(function (x) { x.g.classList.toggle('picked', x === L); }); info.innerHTML = '<b>' + L.name + '.</b> ' + L.desc; }
    layers.forEach(function (L) { on(L.g, 'click', function () { pick(L); }); on(L.g, 'mouseenter', function () { pick(L); }); on(L.g, 'focus', function () { pick(L); }); on(L.g, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(L); } }); });
    on(range, 'input', function () { explode(+range.value / 100); });
    steps(fig, [
      { text: 'The electrochemical stack: <b>negative electrode</b> (graphite on copper), <b>separator</b>, <b>positive electrode</b> (a lithium host on aluminium). Everything else is packaging and pressure. Tap a layer to read its job.', on: function () { pick(layers[3]); } },
      { text: 'The <b>electrolyte</b> is a liquid: drops of 1 M LiPF₆ in a carbonate solvent, about 38 mg in a research coin cell, soak the separator and fill the pores of both electrodes (cyan dots). It is the ion road of module 1.', on: function () { pick(layers[2]); } },
      { text: 'The <b>spacer</b> and <b>spring</b> press the stack so every layer touches the next; a stack placed slightly askew loses capacity to lithium plating at the uncovered edge.', on: function () { pick(layers[5]); } },
      { text: 'The <b>can</b> is the + terminal and the <b>cap</b> the − terminal; the gasket between them seals the cell and keeps them apart. The whole cell voltage appears between these two pieces of steel.', on: function () { pick(layers[6]); } },
      { text: 'The strip from module 1, now in the coin cell: the potential jumps at the two electrode|electrolyte boundaries and is flat through the soaked separator at open circuit. The can sits V above the cap.' }
    ]);
    explode(+range.value / 100); pick(layers[3]);
  });

  /* ===== 2.2 The jelly roll: a flat stack wound into a cylinder ===== */
  register('f2-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), wind = fig.querySelector('.wind'), read = fig.querySelector('.readout');
    var cols = ['var(--copper)', '#2b3538', 'var(--cyan)', 'var(--amber-2)', '#cfd6d8'], widths = [3, 8, 4, 8, 3], names = ['copper foil (collector)', 'graphite', 'separator + electrolyte', 'LiCoO₂', 'aluminium foil (collector)'];
    var N = 200, turns = 2.2, xL = 40, xR = 330, yMid = 150, L = xR - xL, pitch = 2.2;
    var offs = [-13, -7, 0, 7, 13];
    var body = el('g', {}, g);
    var paths = cols.map(function (c, i) { return el('path', { fill: 'none', stroke: c, 'stroke-width': widths[i], 'stroke-linecap': 'round', 'class': 'spiral' }, body); });
    var labG = el('g', {}, g);
    var labY = [70, 100, 200, 230, 260];
    var labs = names.map(function (n, i) { var y = labY[i]; el('line', { x1: 120 + i * 40, y1: yMid + offs[i], x2: 120 + i * 40, y2: y + (y < yMid ? 4 : -12), stroke: 'var(--line-2)' }, labG); return txt(labG, 120 + i * 40, y, n, '', 'middle'); });
    var dimA = el('g', {}, g); arrow(dimA, xL, 40, xR, 40, '#A3B6B1', 1.2); arrow(dimA, xR, 40, xL, 40, '#A3B6B1', 1.2); txt(dimA, (xL + xR) / 2, 30, 'large area: the whole strip faces the other electrode', '', 'middle');
    var dimT = el('g', {}, g); el('path', { d: 'M' + (xR + 10) + ',' + (yMid - 3) + ' h6 v6 h-6', fill: 'none', stroke: 'var(--cyan)' }, dimT); txt(dimT, xR + 22, yMid + 4, 'thin electrolyte', 'cyan');
    var wl = txt(g, 420, 262, 'wound: a cylindrical cell', 'amber', 'middle'); wl.style.opacity = '0';
    badge(g, 20, 110, 1); badge(g, 20, 40, 2); badge(g, 500, 60, 3);
    function render() {
      var k = smooth(+wind.value / 100), kk = Math.max(0.02, k);
      var thMax = kk * turns * 2 * Math.PI, b = pitch, a = (L - b * thMax * thMax / 2) / thMax; // arc length stays about L
      var cx = xL + k * (400 - xL), cy = yMid + a; // the roll slides right as it winds
      paths.forEach(function (p, layer) {
        var d = '', off = offs[layer];
        for (var i = 0; i <= N; i++) {
          var f = i / N, th = f * thMax, r = a + b * th - off * (0.15 + 0.85 * k);
          var x = cx + r * Math.cos(th - Math.PI / 2), y = cy + r * Math.sin(th - Math.PI / 2) + off * (1 - k);
          if (k < 0.01) { x = xL + f * L; y = yMid + off; }
          d += (i ? ' L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
        }
        p.setAttribute('d', d);
      });
      labG.style.opacity = dimA.style.opacity = dimT.style.opacity = String(Math.max(0, 1 - 2.5 * k)); wl.style.opacity = String(k);
      read.innerHTML = k < 0.5 ? 'Flat: five thin layers, two of them metal foils (the current collectors), with the electrolyte held in the separator between the two coatings.' : 'Wound: the same five layers, rolled up so that a long, wide strip fits in a can. Every part of the strip still faces its partner electrode across the thin separator.';
    }
    on(wind, 'input', render); render();
    steps(fig, [
      { text: 'Five layers: <b>copper foil</b>, <b>graphite</b>, the <b>separator</b> soaked with electrolyte, <b>LiCoO₂</b>, <b>aluminium foil</b>. The two foils are the current collectors: metal roads for the electrons between the coating and the terminals.', on: function () { wind.value = 0; render(); } },
      { text: 'Why so thin and so wide: ions move through the electrolyte far more slowly than electrons move through a metal, so a cell wants a <b>large area</b> of electrode facing a <b>thin</b> layer of electrolyte.', on: function () { wind.value = 0; render(); } },
      { text: 'Slide “wind”, or press Play, to roll the strip up. A cylindrical cell is exactly this stack, wound; coin, prismatic and flat cells hold the same layers in other shapes.' }
    ]);
    var dir = 1, pos = 0;
    on(wind, 'input', function () { pos = +wind.value; });
    var loop = anim(fig, function (dt) { if (dt === 0) return; pos += dir * dt * 28; if (pos >= 100) { pos = 100; dir = -1; } if (pos <= 0) { pos = 0; dir = 1; } wind.value = String(Math.round(pos)); render(); }, { autoplay: false, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 2.3 Inside a composite electrode ===== */
  register('f2-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 60, x1 = 460, yTop = 40, yCol = 232;
    el('rect', { x: x0, y: yTop, width: x1 - x0, height: yCol - yTop, fill: 'var(--cyan)', 'fill-opacity': '.16' }, g); // pores: electrolyte
    el('rect', { x: x0, y: yCol, width: x1 - x0, height: 12, fill: '#cfd6d8' }, g); txt(g, 260, yCol + 26, 'current collector (aluminium foil)', '', 'middle');
    txt(g, 260, yTop - 24, 'separator side: Li⁺ arrive from here', 'cyan', 'middle');
    // particles: irregular polygons
    var parts = [[110, 90], [190, 70], [280, 84], [370, 72], [430, 120], [120, 170], [210, 150], [300, 160], [390, 168], [160, 214], [250, 212], [340, 218], [420, 212]];
    var pg = el('g', { fill: 'var(--amber-2)', stroke: 'var(--amber)', 'stroke-opacity': '.55' }, g);
    parts.forEach(function (c, i) { var d = '', n = 7, R = 24 + (i % 3) * 4; for (var k = 0; k < n; k++) { var a = k / n * 2 * Math.PI + i, r = R * (0.8 + 0.25 * Math.sin(3 * a + i)); d += (k ? ' L' : 'M') + (c[0] + r * Math.cos(a)).toFixed(1) + ',' + (c[1] + r * Math.sin(a)).toFixed(1); } el('path', { d: d + ' Z' }, pg); });
    // binder: short polymer strands at contacts
    var bg = el('g', { fill: 'none', stroke: 'var(--cyan-2)', 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
    [[150, 96], [236, 80], [326, 78], [398, 96], [166, 190], [256, 186], [346, 190], [126, 130], [210, 112], [296, 122], [380, 120], [206, 232], [296, 232], [384, 232]].forEach(function (p) { el('path', { d: 'M' + (p[0] - 8) + ',' + p[1] + ' q4,-6 8,0 t8,0' }, bg); });
    // carbon network: dots along a connected path down to the collector
    var carbon = 'M96,232 C96,200 110,196 120,150 C126,126 150,118 190,100 C220,86 250,96 280,110 C300,120 310,150 300,186 C296,206 320,224 340,232 M190,100 C200,130 190,160 210,180 C224,196 240,210 250,232 M280,110 C320,96 350,96 370,100 C400,106 420,140 430,150 C440,170 424,200 420,232';
    var cpath = el('path', { d: carbon, fill: 'none', stroke: 'var(--cyan)', 'stroke-opacity': '.85', 'stroke-width': 1.4, 'stroke-dasharray': '1.5 3.5', 'stroke-linecap': 'round' }, g);
    // roads to one particle (the one at 300,160): electrons up the carbon from the collector, Li+ down through the pores
    var ePath = el('path', { d: 'M340,232 C320,224 296,206 300,186 L300,170', fill: 'none', stroke: 'none' }, g);
    var ionPath = el('path', { d: 'M330,44 C336,66 350,100 330,120 C318,132 310,140 304,150', fill: 'none', stroke: 'var(--cyan)', 'stroke-opacity': '.4', 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    var ef = flow(svg, ePath, { n: 4, cls: 'e-dot', r: 2.6, speed: 40, parent: g });
    var ionf = flow(svg, ionPath, { n: 1, cls: 'ion our-ion', r: 4, speed: 34, parent: g });
    var ourT = txt(g, 0, 0, 'our ion', 'amber', 'start');
    txt(g, 300, 164, 'reacts here', 'strong', 'middle');
    badge(g, 40, 90, 1); badge(g, 40, 232, 2); badge(g, 480, 50, 3); badge(g, 480, 190, 4);
    var t = 0;
    function tick(dt) { if (dt === 0) return; t += dt; ef.advance(dt); ionf.advance(dt); var c = ionf.group.querySelector('circle'); ourT.setAttribute('x', +c.getAttribute('cx') + 8); ourT.setAttribute('y', +c.getAttribute('cy') + 4); }
    ef.show(true); ionf.show(true); ef.group.classList.remove('anim-only'); ionf.group.classList.remove('anim-only');
    read.innerHTML = 'A coating, not a block: active particles (amber), a network of conductive carbon (teal dots) that reaches every particle from the foil, a polymer binder (short teal strands) holding it all together, and pores, about 30 % of the volume, filled with electrolyte (cyan).';
    steps(fig, [
      { text: 'The <b>active particles</b> (amber) are the material that stores the lithium. They are irregular grains, not a solid slab.' },
      { text: 'The <b>carbon network</b> (teal dots) links every particle to the collector: the electron road. Electrons arrive along it from the foil.' },
      { text: 'The <b>pores</b> (cyan, about 30 % of the volume) are filled with electrolyte: the ion road. Our ion comes in from the separator side and reaches the same particle.' },
      { text: 'The <b>binder</b> (short teal strands) holds the mixture together and bonds it to the foil. A particle can react only where both roads reach it; a later module returns to what happens where one of them does not.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.3 });
    bind(fig, loop);
  });

  /* ===== 2.4 Nominal voltages of common systems ===== */
  register('f2-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), info = fig.querySelector('.part-info'), data = P.data.nominal;
    var xN = 168, xB = 178, sc = 62, rowH = 22, y = 40;
    txt(g, 20, 22, 'nominal cell voltage, V', 'strong');
    [1, 2, 3, 4].forEach(function (v) { var x = xB + v * sc; el('line', { x1: x, y1: 30, x2: x, y2: 284, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); txt(g, x, 298, v + ' V', '', 'middle'); });
    var groups = [['primary (single use)', 'primary'], ['rechargeable', 'rechargeable']];
    var rows = [];
    groups.forEach(function (grp) {
      txt(g, 20, y + 12, grp[0], grp[1] === 'primary' ? 'cyan' : 'amber'); y += rowH;
      data.filter(function (d) { return d.kind === grp[1]; }).forEach(function (d) {
        var r = el('g', { 'class': 'bar', tabindex: '0', role: 'button', 'aria-label': d.name + ', ' + d.V + ' volts' }, g);
        el('rect', { x: xB, y: y + 3, width: d.V * sc, height: rowH - 8, rx: 3, fill: d.kind === 'primary' ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': d.kind === 'primary' ? '.6' : '.85' }, r);
        txt(r, xN, y + 14, d.name, '', 'end'); txt(r, xB + d.V * sc + 6, y + 14, d.V.toFixed(1), 'strong');
        var aq = /^aq/.test(d.electrolyte);
        el('circle', { cx: xB + d.V * sc + 34, cy: y + 10, r: 4, fill: aq ? 'var(--cyan)' : 'var(--cation)', 'fill-opacity': aq ? '.5' : '.9' }, r);
        rows.push({ d: d, g: r, y: y });
        function show() { info.innerHTML = '<b>' + d.name + ', ' + d.V.toFixed(1) + ' V nominal.</b> Negative electrode: ' + d.anode + '. Positive electrode: ' + d.cathode + '. Electrolyte: ' + d.electrolyte + '.' + (d.name === 'Lithium-ion' ? ' On the ladder of module 3 this is graphite at about 0.2 V and LiCoO₂ at about 4.0 V versus lithium; the gap between the rungs is this bar.' : ''); }
        on(r, 'mouseenter', show); on(r, 'focus', show); on(r, 'click', show);
        y += rowH;
      });
      y += 6;
    });
    txt(g, 20, 318, '● cyan dot: water-based electrolyte   ● amber dot: nonaqueous, lithium-based', '');
    badge(g, 500, 74, 1); badge(g, 500, 212, 2); badge(g, 500, 140, 3);
    info.innerHTML = 'Hover or tap a bar to see what is inside.';
    steps(fig, [
      { text: 'The <b>primary</b> systems: zinc with manganese dioxide in the 1.5 V cells of a torch, zinc-air at 1.2 V, and the lithium cells of cameras at 3.0 V.' },
      { text: 'The <b>rechargeable</b> systems: lead-acid at 2.0 V, the nickel cells at 1.2 V, and lithium-ion at 4.0 V. Different chemistry, different voltage; the size of the cell changes nothing here.' },
      { text: 'Look at the dots. Every system with a <b>water-based</b> electrolyte sits at or below 2 V; every system above 2 V uses lithium and a nonaqueous electrolyte. Module 3 explains both facts.' }
    ]);
  });

  /* =================================================================
     Module 3: where the voltage comes from. Electron energy after Bard,
     Faulkner and White (B2) 1.1.4 and Figure 1.1.3; the Fermi level and
     equilibrium after 2.2.5; the double layer after 1.6.2, 1.6.3 and
     14.3.1; the ladder after Goodenough and Park 2013 (R6) and Tarascon
     and Armand 2001 (R2); the water window from B2 Table C.1 and 2.1.9.
     ================================================================= */

  /* ===== 3.1 Potential as electron energy: the Fermi level ===== */
  register('f3-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), ESl = fig.querySelector('.E'), Ev = fig.querySelector('.E-val');
    var y0 = 150, sc = 62; // y of E = 0 (the couple's standard potential); px per volt
    var Y = function (E) { return y0 + E * sc; }; // more positive potential: lower on the energy axis
    // axes: energy up on the left, potential down on the right
    var ax = arrow(g, 30, 270, 30, 30, '#A3B6B1', 1.2); txt(g, 22, 150, 'electron energy', '', 'middle', { transform: 'rotate(-90 22 150)' });
    arrow(g, 490, 30, 490, 270, '#A3B6B1', 1.2); txt(g, 502, 150, 'potential E, more positive ↓', '', 'middle', { transform: 'rotate(90 502 150)' });
    [-1.5, -1, -0.5, 0, 0.5, 1, 1.5].forEach(function (v) { el('line', { x1: 484, y1: Y(v), x2: 490, y2: Y(v), stroke: 'var(--line-2)' }, g); txt(g, 478, Y(v) + 4, (v > 0 ? '+' : '') + v.toFixed(1) + ' V', '', 'end'); });
    // the metal: filled states up to the Fermi level
    var xm0 = 70, xm1 = 190;
    el('rect', { x: xm0, y: 30, width: xm1 - xm0, height: 240, fill: 'var(--metal)', 'fill-opacity': '.18', stroke: 'var(--line-2)' }, g);
    var filled = el('rect', { x: xm0, y: Y(0), width: xm1 - xm0, height: 270 - Y(0), fill: 'var(--electron)', 'fill-opacity': '.25' }, g);
    var fermi = el('line', { x1: xm0 - 6, x2: xm1 + 6, y1: Y(0), y2: Y(0), stroke: 'var(--electron)', 'stroke-width': 3 }, g);
    var fLab = txt(g, (xm0 + xm1) / 2, Y(0) - 8, 'Fermi level: transferable electrons', 'cyan', 'middle');
    txt(g, (xm0 + xm1) / 2, 22, 'electrode (metal)', 'strong', 'middle'); txt(g, (xm0 + xm1) / 2, 284, 'filled states below, empty above', '', 'middle');
    // the species in solution: a vacant orbital above, an occupied one below (B2 Figure 1.1.3)
    var xs0 = 280, xs1 = 400, vac = -0.6, occ = 0.6;
    el('rect', { x: xs0 - 20, y: 30, width: xs1 - xs0 + 40, height: 240, fill: 'var(--cyan)', 'fill-opacity': '.08', stroke: 'var(--cyan)', 'stroke-opacity': '.4' }, g);
    txt(g, (xs0 + xs1) / 2, 22, 'species A in solution', 'strong', 'middle');
    el('line', { x1: xs0, x2: xs1, y1: Y(vac), y2: Y(vac), stroke: 'var(--cyan)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, g); txt(g, (xs0 + xs1) / 2, Y(vac) - 8, 'vacant orbital (empty)', 'cyan', 'middle');
    el('line', { x1: xs0, x2: xs1, y1: Y(occ), y2: Y(occ), stroke: 'var(--cyan)', 'stroke-width': 2 }, g); txt(g, (xs0 + xs1) / 2, Y(occ) + 18, 'occupied orbital (filled)', 'cyan', 'middle');
    el('circle', { cx: (xs0 + xs1) / 2 - 10, cy: Y(occ), r: 3, 'class': 'e-dot' }, g); el('circle', { cx: (xs0 + xs1) / 2 + 10, cy: Y(occ), r: 3, 'class': 'e-dot' }, g);
    var hop = el('circle', { r: 3.5, 'class': 'e-dot anim-only' }, g), hopLab = txt(g, 235, 0, '', 'amber', 'middle');
    var gapL = el('line', { x1: 220, x2: 220, stroke: 'var(--amber)', 'stroke-dasharray': '3 3' }, g), gapT = txt(g, 226, 0, '', 'amber');
    badge(g, 56, 40, 1); badge(g, 500, 24, 2); badge(g, 235, Y(vac) - 30, 3); badge(g, 235, Y(occ) + 34, 4);
    var E = 0, t = 0, mode = 'none', sweeping = false, sweepT = 0;
    function render() {
      E = +ESl.value; setSvgText(Ev, (E > 0 ? '+' : '') + E.toFixed(2) + ' V');
      var y = Y(E);
      fermi.setAttribute('y1', y); fermi.setAttribute('y2', y); filled.setAttribute('y', y); filled.setAttribute('height', 270 - y); fLab.setAttribute('y', y - 8);
      mode = E < vac ? 'red' : E > occ ? 'ox' : 'none';
      gapL.setAttribute('y1', Y(0)); gapL.setAttribute('y2', y); gapT.setAttribute('y', (Y(0) + y) / 2 + 4); setSvgText(gapT, Math.abs(E) < 0.3 ? '' : (E < 0 ? '+' : '−') + Math.abs(E).toFixed(2) + ' eV'); gapL.style.display = Math.abs(E) < 0.3 ? 'none' : '';
      setSvgText(hopLab, mode === 'red' ? 'reduction: e⁻ metal → A' : mode === 'ox' ? 'oxidation: e⁻ A → metal' : 'no transfer');
      hopLab.setAttribute('y', mode === 'red' ? Y(vac) - 24 : mode === 'ox' ? Y(occ) + 34 : y + 30);
      read.innerHTML = 'Electrode at <b>' + (E > 0 ? '+' : '') + E.toFixed(2) + ' V</b> relative to the couple’s standard potential: every transferable electron on the metal sits <b>' + Math.abs(E).toFixed(2) + ' eV ' + (E < 0 ? 'higher' : E > 0 ? 'lower' : 'from where it was') + '</b>. ' +
        (mode === 'red' ? 'That is above the vacant orbital of A, so electrons flow from the metal into A: a <b>reduction</b> current.' : mode === 'ox' ? 'That is below the occupied orbital of A, so electrons on A find a lower energy on the metal and flow there: an <b>oxidation</b> current.' : 'Between the two orbitals nothing can transfer: no current flows in this window.');
    }
    on(ESl, 'input', function () { sweeping = false; render(); });
    steps(fig, [
      { text: 'The pale line is the <b>Fermi level</b>: the energy of the electrons an electrode can give away or take in. Below it the metal’s states are full, above it empty.' },
      { text: 'Slide the potential. Making the electrode <b>more negative raises</b> its electrons: exactly <b>1 eV per volt</b>, the electron-volt of module 0. The right-hand axis is the same quantity measured as a potential, upside down.' },
      { text: 'Push it high enough and the electrons sit above an <b>empty</b> orbital of a species in the solution: they jump across. A flow of electrons from electrode to solution is a <b>reduction</b> current.' },
      { text: 'Pull it low enough and electrons on a <b>filled</b> orbital in the solution find a lower energy on the metal: they jump the other way, an <b>oxidation</b> current. In between, nothing moves.' }
    ]);
    render();
    var loop = anim(fig, function (dt) {
      if (dt === 0) return;
      if (sweeping) { sweepT += dt; ESl.value = (1.5 * Math.sin(sweepT / 3.2)).toFixed(2); render(); }
      t = (t + dt / 1.6) % 1; var k = smooth(t);
      if (mode === 'red') { hop.setAttribute('cx', lerp(xm1, xs0 + 30, k)); hop.setAttribute('cy', lerp(Y(E), Y(vac), k)); hop.style.display = ''; }
      else if (mode === 'ox') { hop.setAttribute('cx', lerp(xs0 + 30, xm1, k)); hop.setAttribute('cy', lerp(Y(occ), Y(E), k)); hop.style.display = ''; }
      else hop.style.display = 'none';
    }, { autoplay: true, stepDt: 0.25, onPlay: function () { sweeping = true; } });
    bind(fig, loop);
  });

  /* ===== 3.2 The interface: the electrical double layer ===== */
  register('f3-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), qSl = fig.querySelector('.q'), qv = fig.querySelector('.q-val'), formBtn = fig.querySelector('.form-btn');
    var xm = 40, xb = 200, xs = 480, yT = 40, yB = 190, qNow = null; // qNow: fractional charge during the replay
    el('rect', { x: xm, y: yT, width: xb - xm, height: yB - yT, fill: 'var(--metal)', 'fill-opacity': '.3', stroke: 'var(--line-2)' }, g);
    el('rect', { x: xb, y: yT, width: xs - xb, height: yB - yT, fill: 'var(--cyan)', 'fill-opacity': '.1', stroke: 'var(--cyan)', 'stroke-opacity': '.4' }, g);
    txt(g, (xm + xb) / 2, yT - 12, 'metal', 'strong', 'middle'); txt(g, (xb + xs) / 2, yT - 12, 'electrolyte', 'strong', 'middle');
    var surf = el('g', {}, g), compact = el('g', {}, g), diffuse = el('g', {}, g), solv = el('g', {}, g);
    // scale brackets
    el('path', { d: 'M196,' + (yB + 6) + ' v6 h8 v-6', fill: 'none', stroke: 'var(--muted)' }, g); txt(g, 198, yB + 26, '< 1 nm: the metal’s charge', '', 'end');
    el('path', { d: 'M212,' + (yT - 2) + ' v-6 h90 v6', fill: 'none', stroke: 'var(--muted)' }, g); txt(g, 257, yT - 30, 'diffuse layer: < 10 nm above 0.01 M', '', 'middle');
    txt(g, 214, yB + 26, 'compact layer', '', 'start');
    // strip: potential across the interface (B2 Figure 1.6.3b)
    var strip = phiStrip(g, { x: xm, y: 228, w: xs - xm, h: 64 }, [], { vmin: -1.1, vmax: 1.1, label: 'φ', units: '', xlabel: 'position across the interface: metal → compact layer → diffuse layer → bulk' });
    var fLab = txt(g, 472, 250, '', 'field', 'end');
    badge(g, xb - 36, yT + 16, 1); badge(g, 330, yT + 16, 2); badge(g, 100, 244, 3); badge(g, 500, 246, 4);
    function render() {
      var q = qNow === null ? +qSl.value : qNow; setSvgText(qv, q > 0 ? 'positive' : q < 0 ? 'negative' : 'zero');
      clear(surf); clear(compact); clear(diffuse); clear(solv);
      var n = Math.abs(q), s = q > 0 ? 1 : -1; if (Math.abs(q) < 0.05) { n = 0; }
      for (var i = 0; i < 7; i++) { var y = yT + 14 + i * 22; if (i < n * 3.5) charge(surf, xb - 7, y, 5, s); }
      for (i = 0; i < 6; i++) { var y2 = yT + 20 + i * 24; el('circle', { cx: xb + 9, cy: y2, r: 3, fill: 'var(--cyan)', 'fill-opacity': '.5' }, solv); if (i < n * 3) { charge(compact, xb + 22, y2, 5, -s); el('circle', { cx: xb + 22, cy: y2, r: 9, fill: 'none', stroke: 'var(--cyan)', 'stroke-opacity': '.6' }, compact); } }
      // diffuse layer on a fixed grid: denser near the surface, a few co-ions, no two on top of each other
      var grid = [[0, 0, -1], [0, 2, -1], [0, 4, -1], [1, 1, -1], [1, 3, -1], [1, 5, 1], [2, 0, -1], [2, 4, -1], [3, 2, -1], [3, 5, -1], [4, 1, 1], [4, 3, -1], [5, 0, -1], [5, 4, 1]];
      grid.forEach(function (c, i) { if (i < 4 + n * 5) charge(diffuse, xb + 44 + c[0] * 22, yT + 16 + c[1] * 26, 4, c[2] * -s * -1 === -s ? -s : s); });
      var phiM = 0.45 * q, phiS = 0;
      var pts = [{ x: 0, phi: phiM }, { x: (xb - xm) / (xs - xm), phi: phiM }]; var x2 = (xb + 22 - xm) / (xs - xm); pts.push({ x: x2, phi: phiM * 0.28 });
      for (var k = 1; k <= 12; k++) { var f = k / 12; pts.push({ x: x2 + f * ((xb + 130 - xm) / (xs - xm) - x2), phi: phiM * 0.28 * Math.exp(-4 * f) }); } pts.push({ x: 1, phi: phiS });
      strip.update(pts);
      setSvgText(fLab, q === 0 ? 'no excess charge: no jump' : 'field up to 10⁷ V/cm in the jump');
      if (qNow !== null) { read.innerHTML = 'Forming: ions cross the boundary, the separated charge grows, and the field it builds pulls back harder on each next ion. When the electrical pull balances the chemical push, the crossing stops.'; return; }
      read.innerHTML = q === 0 ? 'No excess charge on the metal, no countercharge in the liquid, no jump in potential: this is the potential of zero charge. Slide the charge to either side.'
        : 'The metal carries an excess of ' + (q > 0 ? 'positive charge (a deficiency of electrons)' : 'negative charge (extra electrons)') + ' in a layer thinner than a nanometre at its surface. The liquid answers with an equal and opposite charge: ' + (q > 0 ? 'anions' : 'solvated cations') + ' in a compact layer one solvent molecule out, and a diffuse tail beyond. The potential drops by ' + Math.abs(phiM).toFixed(1) + ' V across a few nanometres: the interfacial jump of figure 1.1, seen up close.';
    }
    on(qSl, 'input', function () { qNow = null; render(); }); render();
    var formT = 0, forming = false;
    function tick(dt) {
      if (dt === 0 || !forming) return;
      formT += dt; var target = +qSl.value || -2; var k = Math.min(1, formT / 2.2);
      qNow = target * (1 - Math.exp(-4 * k)) / (1 - Math.exp(-4));
      if (k >= 1) { forming = false; qNow = null; loop.stop(); }
      render();
    }
    steps(fig, [
      { text: 'Excess charge on a conductor sits at its <b>surface</b> (module 0). On an electrode it lies in a layer less than a nanometre thick, an excess or deficiency of electrons.' },
      { text: 'The liquid answers with an <b>equal and opposite</b> charge: ions of the other sign crowd the surface. Solvated ions stop one solvent molecule out (the compact layer); thermal motion smears the rest into a diffuse layer a few nanometres deep.' },
      { text: 'Two sheets of opposite charge a molecular distance apart: the potential <b>jumps</b> across them. That is where the steps of figure 1.1 live, and the field inside them can reach 10⁷ V/cm.' },
      { text: 'Two sheets of charge a distance apart is a <b>capacitor</b>: q = C·E, with 10 to 40 µF per cm² of electrode. Change the electrode’s potential and a charging current flows for about 10⁻⁸ s, with no chemistry at all.' },
      { text: '<b>How it forms.</b> Dip zinc into its salt: a few Zn²⁺ leave the metal and their electrons stay behind, so the metal goes negative and the liquid beside it positive. That separated charge is the field; it grows until its pull on the next ion balances the chemical push. Press Play or “Replay the formation”.', on: function () { startForming(); } }
    ]);
    var loop = anim(fig, tick, { autoplay: false, stepDt: 0.3, onPlay: function () { if (!forming) startForming(); } });
    function startForming() { if (+qSl.value === 0) qSl.value = -2; formT = 0; forming = true; qNow = 0; loop.wanted = true; if (motion) loop.start(); else { qNow = null; render(); } }
    on(formBtn, 'click', startForming);
    bind(fig, loop);
  });

  /* ===== 3.3 The potential ladder, with the water window in its right place ===== */
  register('f3-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), selN = fig.querySelector('select[data-side=neg]'), selP = fig.querySelector('select[data-side=pos]');
    var read = fig.querySelector('.readout'), flags = fig.querySelector('.flags'), aq = fig.querySelector('input[type=checkbox]'), pHSl = fig.querySelector('.pH'), pHv = fig.querySelector('.pH-val');
    var y = function (V) { return 322 - V * 58; };
    el('line', { x1: 44, y1: 26, x2: 44, y2: 326, stroke: 'var(--line-2)' }, g);
    for (var v = 0; v <= 5; v++) { el('line', { x1: 40, y1: y(v), x2: 44, y2: y(v), stroke: 'var(--line-2)' }, g); txt(g, 36, y(v) + 4, v + ' V', '', 'end'); }
    txt(g, 14, 180, 'potential vs Li/Li⁺ (energy per unit charge)', '', 'middle', { transform: 'rotate(-90 14 180)' });
    arrow(g, 228, 296, 228, 324, '#C4B5F7', 1.2); txt(g, 246, 308, 'electron energy', 'field', 'start'); txt(g, 246, 322, 'higher ↓', 'field', 'start');
    txt(g, 140, 20, 'negative electrodes', 'cyan', 'middle'); txt(g, 390, 20, 'positive electrodes', 'amber', 'middle');
    var w = P.data.carbonateWindow;
    var bands = el('g', {}, g);
    el('rect', { x: 222, y: y(w.high), width: 62, height: y(w.low) - y(w.high), fill: 'var(--cyan)', 'fill-opacity': '.16', stroke: 'var(--cyan)', 'stroke-opacity': '.5', rx: 4 }, bands);
    txt(bands, 253, y(w.high) - 6, 'carbonate', 'cyan', 'middle'); txt(bands, 253, y(w.high) + 14, 'electrolyte', 'cyan', 'middle'); txt(bands, 253, y(w.high) + 28, 'stable', 'cyan', 'middle'); txt(bands, 253, y(w.low) + 14, '1.1 to 4.3 V', 'cyan', 'middle');
    var aqG = el('g', { style: 'display:none' }, g);
    var aqBand = el('rect', { x: 304, y: 0, width: 26, height: 0, fill: 'var(--amber)', 'fill-opacity': '.18', stroke: 'var(--amber)', 'stroke-opacity': '.6', rx: 3 }, aqG);
    var aqT1 = txt(aqG, 317, 0, 'water', 'amber', 'middle'), aqT2 = txt(aqG, 317, 0, '', 'amber', 'middle'), aqT3 = txt(aqG, 317, 0, '', 'amber', 'middle');
    var rungs = el('g', {}, g), marks = {}, prevV = { neg: -9, pos: -9 }, prevT = { neg: null, pos: null };
    P.data.ladder.forEach(function (r) {
      var left = r.side === 'neg', x1 = left ? 78 : 346, x2 = left ? 214 : 476;
      var crowded = (r.V - prevV[r.side]) < 0.3;
      if (crowded && prevT[r.side]) prevT[r.side].setAttribute('y', y(prevV[r.side]) + 14);
      prevV[r.side] = r.V;
      var rg = el('g', { 'class': 'rung', 'data-key': r.key }, rungs);
      el('line', { x1: x1, y1: y(r.V), x2: x2, y2: y(r.V), stroke: left ? 'var(--cyan)' : 'var(--amber)', 'stroke-width': 2 }, rg);
      var t = txt(rg, left ? x2 - 4 : x1 + 4, y(r.V) - 5, r.name + ' ' + r.V.toFixed(r.V === 4.75 ? 2 : 1) + (r.key === 's' ? ' (Li–S, conversion)' : ''), '', left ? 'end' : 'start'); prevT[r.side] = t;
      marks[r.key] = rg;
      var o = document.createElement('option'); o.value = r.key; o.textContent = plain(r.name) + ' (' + r.V.toFixed(r.V === 4.75 ? 2 : 1) + ' V)'; (left ? selN : selP).appendChild(o);
    });
    var brace = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, g);
    el('rect', { x: 227, y: 0, width: 52, height: 18, rx: 4, fill: 'var(--bg-2)', 'class': 'brace-bg' }, g);
    var braceBg = g.lastChild, braceT = txt(g, 253, 0, '', 'strong', 'middle');
    badge(g, 30, 14, 1); badge(g, 300, 14, 2); badge(g, 190, 248, 3); var b4 = badge(g, 317, 0, 4);
    function renderAq() {
      var pH = +pHSl.value, ww = P.waterWindowVsLi(pH); setSvgText(pHv, 'pH ' + pH);
      aqBand.setAttribute('y', y(ww.high)); aqBand.setAttribute('height', y(ww.low) - y(ww.high));
      aqT1.setAttribute('y', y(ww.high) - 20); aqT2.setAttribute('y', y(ww.high) - 6); setSvgText(aqT2, 'O₂ ' + ww.high.toFixed(2));
      aqT3.setAttribute('y', y(ww.low) + 16); setSvgText(aqT3, 'H₂ ' + ww.low.toFixed(2));
      b4.setAttribute('transform', 'translate(317,' + (y(ww.low) + 34) + ')');
      var s = aq.checked ? '' : 'none'; aqG.style.display = s; b4.style.display = s;
    }
    function render() {
      var n = rung(cell.neg), p = rung(cell.pos), V = p.V - n.V;
      for (var k in marks) marks[k].classList.toggle('picked', k === cell.neg || k === cell.pos);
      brace.setAttribute('d', 'M253,' + y(n.V) + ' L253,' + y(p.V));
      var ym = (y(n.V) + y(p.V)) / 2; braceBg.setAttribute('y', ym - 9); braceT.setAttribute('y', ym + 4); setSvgText(braceT, V.toFixed(2) + ' V');
      read.innerHTML = 'Your cell: <b>' + n.name + '</b> against <b>' + p.name + '</b>. Open-circuit voltage about <b>' + V.toFixed(2) + ' V</b>: the difference of the two rungs, which is the difference of the two electron energies in electron-volts.';
      var f = '';
      f += n.V < w.low ? '<span class="flag warn">negative electrode above the electrolyte’s empty level: the electrolyte is reduced unless a passivating layer forms (the SEI, in a later module)</span>' : '<span class="flag ok">negative electrode inside the window: no passivating layer needed</span>';
      f += p.V > w.high ? '<span class="flag warn">positive electrode below the electrolyte’s filled level: the electrolyte is oxidized unless a layer forms</span>' : '<span class="flag ok">positive electrode inside the window</span>';
      flags.innerHTML = f; selN.value = cell.neg; selP.value = cell.pos;
    }
    on(selN, 'change', function () { setCell(selN.value, cell.pos); }); on(selP, 'change', function () { setCell(cell.neg, selP.value); });
    on(aq, 'change', renderAq); on(pHSl, 'input', renderAq);
    cellListeners.push(render); render(); renderAq();
    steps(fig, [
      { text: 'The axis is a <b>potential</b>: energy per unit charge, measured against lithium metal, which sits at 0. Up the axis the potential is more positive, so the electron energy is <b>lower</b> (the lilac arrow points the other way).' },
      { text: 'Each material is a rung. Pick a negative and a positive electrode; the cell voltage is the <b>gap</b> between the rungs, and it travels with you through the rest of the page.' },
      { text: 'The cyan band is where the carbonate electrolytes of lithium-ion cells are stable, between their filled and empty levels: about 1.1 to 4.3 V. A rung outside it needs a protective layer, the subject of a later module.' },
      { text: 'Tick the water window. Water is stable over only 1.23 V, and where that window sits depends on pH: 3.05 to 4.27 V versus lithium in acid, sliding 59 mV lower per pH unit. Every rung below about 3 V is out of reach for a water-based cell.', on: function () { aq.checked = true; renderAq(); } }
    ]);
  });

  /* ===== 3.4 The electron energy picture, with the wire ===== */
  register('f3-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var Y = function (V) { return 70 + V * 40; }; // energy axis: potential downward
    var w = P.data.carbonateWindow;
    arrow(g, 26, 262, 26, 44, '#A3B6B1', 1.2); txt(g, 16, 150, 'electron energy ↑', '', 'middle', { transform: 'rotate(-90 16 150)' });
    txt(g, 110, 40, 'negative electrode', 'strong', 'middle'); txt(g, 260, 40, 'electrolyte', 'strong', 'middle'); txt(g, 410, 40, 'positive electrode', 'strong', 'middle');
    el('rect', { x: 200, y: Y(w.low), width: 120, height: Y(w.high) - Y(w.low), fill: 'var(--cyan)', 'fill-opacity': '.12', rx: 4 }, g);
    el('line', { x1: 200, x2: 320, y1: Y(w.low), y2: Y(w.low), stroke: 'var(--cyan)', 'stroke-width': 2 }, g); txt(g, 260, Y(w.low) - 6, 'lowest empty level (LUMO)', 'cyan', 'middle');
    el('line', { x1: 200, x2: 320, y1: Y(w.high), y2: Y(w.high), stroke: 'var(--cyan)', 'stroke-width': 2 }, g); txt(g, 260, Y(w.high) + 16, 'highest filled level (HOMO)', 'cyan', 'middle');
    txt(g, 260, (Y(w.low) + Y(w.high)) / 2 + 4, 'window: 3.2 eV', 'cyan', 'middle');
    var muA = el('line', { x1: 60, x2: 160, stroke: 'var(--metal)', 'stroke-width': 3 }, g), muAt = txt(g, 68, 0, '', '');
    var muC = el('line', { x1: 360, x2: 476, stroke: 'var(--amber-2)', 'stroke-width': 3 }, g), muCt = txt(g, 360, 0, '', '');
    var warnA = txt(g, 68, 0, 'above the LUMO: layer needed', 'amber'), warnC = txt(g, 360, 0, 'below the HOMO: oxidation', 'amber');
    var gap = el('line', { x1: 340, x2: 340, stroke: 'var(--amber)', 'stroke-dasharray': '4 3' }, g), gapT = txt(g, 346, 0, '', 'strong');
    // the external circuit: a wire above the diagram; the electron goes round, never through the electrolyte
    var wire = el('path', { d: 'M60,0 L60,26 L476,26 L476,0', fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g);
    txt(g, 260, 14, 'external circuit: the electron goes round', 'cyan', 'middle');
    var eDot = el('circle', { r: 4, 'class': 'e-dot anim-only' }, g);
    var ion = ourIon(g, 170, 0, 5, 'our ion (Li⁺) goes through', true); ion.g.classList.add('anim-only');
    var x1 = txt(g, 260, 276, 'no electrons cross the electrolyte; only ions do', '', 'middle');
    var b1 = badge(g, 110, 112, 1); badge(g, 340, 56, 2); badge(g, 120, 14, 3); badge(g, 500, 150, 4);
    var n, p, t = 0;
    function render() {
      n = rung(cell.neg); p = rung(cell.pos);
      muA.setAttribute('y1', Y(n.V)); muA.setAttribute('y2', Y(n.V)); muC.setAttribute('y1', Y(p.V)); muC.setAttribute('y2', Y(p.V));
      muAt.setAttribute('y', Y(n.V) - 6); setSvgText(muAt, 'μ_A: ' + n.name); muCt.setAttribute('y', Y(p.V) + 16); setSvgText(muCt, 'μ_C: ' + p.name);
      warnA.setAttribute('y', Y(n.V) + 16); warnA.style.display = n.V < w.low ? '' : 'none'; warnC.setAttribute('y', Y(p.V) + 30); warnC.style.display = p.V > w.high ? '' : 'none';
      gap.setAttribute('y1', Y(n.V)); gap.setAttribute('y2', Y(p.V)); gapT.setAttribute('y', (Y(n.V) + Y(p.V)) / 2 + 4); setSvgText(gapT, 'e·V_OC = ' + (p.V - n.V).toFixed(2) + ' eV');
      wire.setAttribute('d', 'M60,' + Y(n.V) + ' L60,26 L476,26 L476,' + Y(p.V)); b1.setAttribute('transform', 'translate(110,' + (Y(n.V) + 34) + ')');
      read.innerHTML = 'An electron on the negative electrode sits <b>' + (p.V - n.V).toFixed(2) + ' eV</b> above one on the positive electrode. Divided by the electron charge that is the open-circuit voltage, V_OC = (μ_A − μ_C)/e. The electron gives up that energy only by going round the external circuit; inside the cell our ion crosses the electrolyte to keep the charge balanced.' + (n.V < w.low ? ' The negative electrode lies above the electrolyte’s empty level, so the electrolyte would be reduced there unless a passivating layer forms.' : '') + (p.V > w.high ? ' The positive electrode lies below the filled level, so the electrolyte would be oxidized there unless a layer forms.' : '');
    }
    cellListeners.push(render); render();
    steps(fig, [
      { text: 'μ_A and μ_C are the electron energies of the two electrodes: the Fermi levels of figure 3.1, drawn on one axis. Higher means the electron is held less tightly.' },
      { text: 'The electrolyte is stable only between its <b>lowest empty level</b> and its <b>highest filled level</b> (chemists call them LUMO and HOMO): an electrode above the first reduces it, one below the second oxidizes it.' },
      { text: 'Press Play. The electron leaves the negative electrode, travels along the wire <b>outside</b> the cell and drops onto the positive electrode; the energy it gives up on the way, e·V_OC, is the lamp of module 1. Our ion crosses the electrolyte inside.' },
      { text: 'Same numbers as the ladder of figure 3.3, axis turned upside down: a rung at x volts is an electron energy x eV below lithium’s.' }
    ]);
    var loop = anim(fig, function (dt) {
      if (dt === 0) return; t = (t + dt / 3) % 1; var k = smooth(Math.min(1, t / 0.85));
      var ya = Y(n.V), yc = Y(p.V);
      var L1 = ya - 26, L2 = 416, L3 = yc - 26, L = L1 + L2 + L3, s = k * L, x, y;
      if (s < L1) { x = 60; y = ya - s; } else if (s < L1 + L2) { x = 60 + (s - L1); y = 26; } else { x = 476; y = 26 + (s - L1 - L2); }
      eDot.setAttribute('cx', x); eDot.setAttribute('cy', y);
      ion.move(lerp(178, 342, k), (Y(w.low) + Y(w.high)) / 2 + 26);
    }, { autoplay: true, stepDt: 0.3 });
    bind(fig, loop);
  });

  /* ===== 3.5 Why oxides give 4 V and sulfides about 2.5 V ===== */
  register('f3-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg);
    var Y = function (eV) { return 44 + eV * 42; }; // eV below the lithium level, downward
    el('line', { x1: 60, x2: 470, y1: Y(0), y2: Y(0), stroke: 'var(--metal)', 'stroke-width': 2.5 }, g); txt(g, 62, Y(0) + 15, 'μ_A(Li): the lithium level, 0 eV', '');
    txt(g, 155, 26, 'layered sulfide LiMS₂', 'strong', 'middle'); txt(g, 365, 26, 'layered oxide LiMO₂', 'strong', 'middle');
    el('rect', { x: 100, y: Y(2.5), width: 110, height: Y(4.15) - Y(2.5), fill: '#c9a35c', 'fill-opacity': '.35', stroke: '#c9a35c', 'stroke-opacity': '.6' }, g); txt(g, 155, Y(3.6), 'S-3p band (filled)', '', 'middle'); txt(g, 155, Y(3.95), 'top 2.5 eV below', '', 'middle');
    el('rect', { x: 310, y: Y(4.0), width: 110, height: Y(5.1) - Y(4.0), fill: 'var(--heat)', 'fill-opacity': '.3', stroke: 'var(--heat)', 'stroke-opacity': '.6' }, g); txt(g, 365, Y(4.6), 'O-2p band (filled)', '', 'middle'); txt(g, 365, Y(4.95), 'top 4.0 eV below', '', 'middle');
    [[155, 2.5, 'about 2.5 V'], [365, 4.0, 'about 4 V']].forEach(function (c) {
      el('line', { x1: c[0] - 55, x2: c[0] + 55, y1: Y(c[1]) - 3, y2: Y(c[1]) - 3, stroke: 'var(--amber)', 'stroke-width': 3 }, g); (function () {})();
      txt(g, c[0] - 6, Y(c[1]) - 24, 'M(IV)/M(III) couple', 'amber', 'middle'); txt(g, c[0] - 6, Y(c[1]) - 10, 'pinned: ' + c[2], 'amber', 'middle');
      arrow(g, c[0] + 66, Y(c[1]) - 40, c[0] + 66, Y(c[1]) - 8, '#F0B441', 1.4); txt(g, c[0] + 72, Y(c[1]) - 36, 'cannot', 'amber', 'start'); txt(g, c[0] + 72, Y(c[1]) - 22, 'go lower', 'amber', 'start');
    });
    el('line', { x1: 60, x2: 470, y1: Y(4.3), y2: Y(4.3), stroke: 'var(--cyan)', 'stroke-dasharray': '5 3' }, g); txt(g, 62, Y(4.3) + 15, 'carbonate HOMO: 4.3 eV below', 'cyan');
    arrow(g, 30, Y(0.3), 30, Y(4.6), '#A3B6B1', 1.2); txt(g, 22, Y(2.4), 'electron energy, eV below Li', '', 'middle', { transform: 'rotate(-90 22 ' + Y(2.4) + ')' });
    badge(g, 300, Y(0) + 18, 1); badge(g, 84, Y(2.5) + 18, 2); badge(g, 262, Y(1.0), 3); badge(g, 480, Y(4.3) + 18, 4);
    steps(fig, [
      { text: 'The top line is the lithium level, the electron energy of a lithium metal electrode. Every positive-electrode energy is measured down from it, in electron-volts, which is the ladder’s volts.' },
      { text: 'Each host has a filled band of anion states, a continuum of electron levels made from the anions’ p orbitals. Its top lies about <b>2.5 eV</b> below lithium in a sulfide and about <b>4.0 eV</b> below in an oxide.' },
      { text: 'The transition-metal couple that stores the electrons cannot be pushed <b>below the top of that band</b>: it is pinned there. So a sulfide positive electrode gives about 2.5 V and an oxide about 4 V.' },
      { text: 'The carbonate electrolyte’s own filled level sits about 4.3 eV below lithium, just under the oxide band top: the oxide’s 4 V fits inside the window with little to spare, which is why oxide hosts run today’s cells.' }
    ]);
  });

  /* ===== 3.6 From reaction energy to voltage: dG = -nFE ===== */
  register('f3-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), n = fig.querySelector('input[data-p=n]'), E = fig.querySelector('input[data-p=E]'), read = fig.querySelector('.readout'), nl = fig.querySelector('.n-val'), El = fig.querySelector('.E-val'), presets = fig.querySelectorAll('button[data-preset]');
    txt(g, 40, 26, 'electrical energy available per mole of reaction, −ΔG = nFE', 'strong');
    el('rect', { x: 40, y: 40, width: 440, height: 30, rx: 4, fill: 'var(--amber)', 'fill-opacity': '.15' }, g);
    var bar = el('rect', { x: 40, y: 40, width: 0, height: 30, rx: 4, fill: 'var(--amber)' }, g);
    [0, 100, 200, 300, 400, 500].forEach(function (k) { el('line', { x1: 40 + k * 0.88, y1: 70, x2: 40 + k * 0.88, y2: 76, stroke: 'var(--line-2)' }, g); txt(g, 40 + k * 0.88, 90, k + (k === 500 ? ' kJ/mol' : ''), '', k === 0 ? 'start' : k === 500 ? 'end' : 'middle'); });
    var dan = el('line', { x1: 0, x2: 0, y1: 36, y2: 74, stroke: 'var(--cyan)', 'stroke-width': 2 }, g), danT = txt(g, 0, 110, 'Daniell cell: 213 kJ/mol', 'cyan', 'middle');
    var vt = txt(g, 0, 60, '', 'strong', 'start');
    badge(g, 20, 55, 1); badge(g, 500, 55, 2);
    function render() {
      var nn = +n.value, EE = +E.value, dG = P.reactionEnergy(nn, EE) / 1000;
      var wpx = Math.min(440, -dG * 0.88); bar.setAttribute('width', String(wpx));
      vt.setAttribute('x', wpx > 300 ? 40 + wpx - 6 : 40 + wpx + 6); vt.setAttribute('text-anchor', wpx > 300 ? 'end' : 'start'); vt.style.fill = wpx > 300 ? '#1a1405' : ''; setSvgText(vt, Math.round(-dG) + ' kJ/mol');
      var dx = 40 + 212.8 * 0.88; dan.setAttribute('x1', dx); dan.setAttribute('x2', dx); danT.setAttribute('x', dx);
      setSvgText(nl, nn); setSvgText(El, EE.toFixed(2) + ' V');
      read.innerHTML = 'ΔG = −nFE = −' + nn + ' × 96 485 C/mol × ' + EE.toFixed(2) + ' V = <b>−' + fmt(-dG, 0) + ' kJ/mol</b>. Per electron that is ' + EE.toFixed(2) + ' eV: the cell voltage is the reaction’s free energy per unit of charge, and nF, the charge per mole, is its capacity factor.';
    }
    Array.prototype.forEach.call(presets, function (b) { on(b, 'click', function () {
      var k = b.getAttribute('data-preset');
      if (k === 'daniell') { n.value = 2; E.value = P.data.daniell.E.toFixed(2); } else { var p = rung(cell.pos), q = rung(cell.neg); n.value = 1; E.value = (p.V - q.V).toFixed(2); }
      render();
    }); });
    on(n, 'input', render); on(E, 'input', render); render();
    steps(fig, [
      { text: 'The bar is the energy a mole of reaction can deliver as electricity: <b>−ΔG = nFE</b>. Doubling the electrons per formula unit, n, doubles it; so does doubling the voltage.' },
      { text: 'The cyan mark is the Daniell cell: n = 2, E = 1.10 V, −ΔG = 213 kJ per mole of zinc. Tap “Daniell cell”, then “your cell”, and compare.' }
    ]);
  });

  /* =================================================================
     Modules 4 and 5. A shared, clearly illustrative cell model feeds
     figures 4.2, 5.1 and 5.5. Its open-circuit shapes and parameters are
     not measurements; the equations it combines are the cited ones.
     ================================================================= */
  var RTF = P.R * P.T0 / P.F; // thermal voltage, 25.7 mV at 25 C
  function rateFromSlider(v) { return 0.1 * Math.pow(50, v / 100); } // 0.1C .. 5C, log scale
  function fmtRate(c) { return c < 1 ? 'C/' + Math.round(1 / c) : c.toFixed(c < 3 ? 1 : 0) + 'C'; }
  var model = {
    voc: function (shape, x) { // x = fraction of capacity delivered (0..1)
      if (shape === 'flat') return 3.42 - 0.02 * x - 0.9 * Math.pow(Math.max(0, x - 0.93) / 0.07, 2);
      return 4.15 - 0.5 * x - 0.25 * Math.pow(x, 4) - 0.2 * Math.pow(x, 12);
    },
    cut: function (shape) { return shape === 'flat' ? { lo: 2.5, hi: 3.9 } : { lo: 3.0, hi: 4.25 }; },
    eta: function (c, x) { // c in C-rate; ohmic + activation + concentration, illustrative parameters
      var ohm = 0.05 * c;                                   // R_b such that 1C costs 50 mV
      var act = 2 * RTF * Math.asinh(c / (2 * 0.3));        // exchange current of 0.3C
      var lim = 8;                                          // limiting current 8C
      var g = 1 + 5 * Math.pow(x, 4);                       // depletion near the end of discharge
      var f = (c / lim) * g;
      var conc = f >= 0.999 ? 10 : -4 * RTF * Math.log(1 - f); // rounded knee; the factor is illustrative
      return { ohm: ohm, act: act, conc: conc, total: ohm + act + conc };
    },
    curve: function (shape, c, charge) {
      var cut = this.cut(shape), pts = [], N = 200;
      for (var i = 0; i <= N; i++) {
        var x = i / N, e = this.eta(c, x).total, V = charge ? this.voc(shape, x) + e : this.voc(shape, x) - e;
        if (i > 0 && (charge ? V > cut.hi : V < cut.lo)) break;
        pts.push({ x: x, V: V });
      }
      if (pts.length < 2) pts.push({ x: 0.002, V: pts[0].V });
      return pts;
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
    badge(svg, 190, 60, 1); badge(svg, 440, 200, 2); badge(svg, 380, 60, 3);
    steps(fig, [
      { text: '<b>Supercapacitors</b> deliver energy fast but hold little; <b>fuel cells</b> hold much but deliver it slowly. Both axes are logarithmic and carry no numbers because the source figure is itself simplified.' },
      { text: '<b>Batteries</b> sit between the two and overlap both; a thin-film battery can reach the power of a supercapacitor.' },
      { text: 'The <b>combustion engine</b> is not an electrochemical device: it beats all three on both axes because its energy is stored in a fuel tank, not in an electrode. No single electrochemical system matches it, which is why the sources suggest combining them.' }
    ]);
  });

  /* ===== 5.1 Galvanostatic curve simulator ===== */
  register('f5-1', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), read = fig.querySelector('.readout'), sbtn = fig.querySelectorAll('button[data-shape]');
    var x0 = 60, y0 = 250, x1 = 490, y1 = 30, vmin = 2.0, vmax = 4.5, shape = shapeOfCell(), userShape = false;
    axes(el('g', {}, g), x0, y0, x1, y1, vmin, vmax, 'capacity, fraction of the low-rate value', 'V');
    var heat = el('path', { fill: 'var(--heat)', 'fill-opacity': '.18' }, g);
    var voc = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 4' }, g);
    var dis = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.2 }, g), ch = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.2 }, g);
    var cutLo = el('line', { stroke: 'var(--line-2)', 'stroke-dasharray': '4 3' }, g), cutHi = el('line', { stroke: 'var(--line-2)', 'stroke-dasharray': '4 3' }, g);
    var lab = el('text', { x: x0 + 8, y: y1 + 14, 'class': 'lbl' }, g);
    function render() {
      var c = rateFromSlider(+rate.value); setSvgText(rv, fmtRate(c));
      Array.prototype.forEach.call(sbtn, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-shape') === shape)); });
      var d = model.curve(shape, c, false), u = model.curve(shape, c, true), o = [];
      for (var i = 0; i <= 200; i++) o.push({ x: i / 200, V: model.voc(shape, i / 200) });
      dis.setAttribute('d', pathOf(d, x0, y0, x1, y1, vmin, vmax)); ch.setAttribute('d', pathOf(u, x0, y0, x1, y1, vmin, vmax)); voc.setAttribute('d', pathOf(o, x0, y0, x1, y1, vmin, vmax));
      var n = Math.min(d.length, u.length);
      heat.setAttribute('d', n > 1 ? pathOf(u.slice(0, n), x0, y0, x1, y1, vmin, vmax) + ' ' + pathOf(d.slice(0, n).reverse(), x0, y0, x1, y1, vmin, vmax).replace('M', 'L') + ' Z' : '');
      var cut = model.cut(shape), yl = y0 - (cut.lo - vmin) / (vmax - vmin) * (y0 - y1), yh = y0 - (cut.hi - vmin) / (vmax - vmin) * (y0 - y1);
      cutLo.setAttribute('x1', x0); cutLo.setAttribute('x2', x1); cutLo.setAttribute('y1', yl); cutLo.setAttribute('y2', yl);
      cutHi.setAttribute('x1', x0); cutHi.setAttribute('x2', x1); cutHi.setAttribute('y1', yh); cutHi.setAttribute('y2', yh);
      setSvgText(lab, 'dashed grey: open-circuit curve; dashed lines: cut-off voltages');
      var e = model.eta(c, 0.5), q = d[d.length - 1].x;
      read.innerHTML = 'At ' + fmtRate(c) + ' the gap at mid-capacity is 2η = <b>' + Math.round(2 * e.total * 1000) + ' mV</b> (ohmic ' + Math.round(e.ohm * 1000) + ', activation ' + Math.round(e.act * 1000) + ', concentration ' + Math.round(e.conc * 1000) + ' mV); the discharge reaches <b>' + Math.round(q * 100) + ' %</b> of the low-rate capacity before the cut-off. The shaded band between the branches is energy that leaves as heat.';
    }
    rate.addEventListener('input', render);
    Array.prototype.forEach.call(sbtn, function (b) { b.addEventListener('click', function () { shape = b.getAttribute('data-shape'); userShape = true; render(); }); });
    cellListeners.push(function () { if (!userShape) { shape = shapeOfCell(); render(); } }); render();
  });

  /* ===== 5.2 The three polarizations in time ===== */
  register('f5-2', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot');
    var x0 = 60, y0 = 210, x1 = 490, y1 = 30, tmin = -7, tmax = 2, vmin = -0.12, vmax = 0.01;
    var X = function (logt) { return x0 + (logt - tmin) / (tmax - tmin) * (x1 - x0); }, Y = function (v) { return y0 - (v - vmin) / (vmax - vmin) * (y0 - y1); };
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    for (var k = tmin; k <= tmax; k++) { el('line', { x1: X(k), y1: y0, x2: X(k), y2: y0 + 5, stroke: 'var(--line-2)' }, g); var t = el('text', { x: X(k), y: y0 + 18, 'text-anchor': 'middle', 'class': 'lbl' }, g); setSvgText(t, '10' + (k < 0 ? '⁻' : '') + String(Math.abs(k)).replace(/\d/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]; })); }
    var xl = el('text', { x: x1, y: y0 + 34, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(xl, 'time after the current is switched off, seconds');
    var yl = el('text', { x: x0 - 8, y: Y(0) + 4, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(yl, 'V_oc');
    var yl2 = el('text', { x: x0 - 8, y: Y(-0.1) + 4, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(yl2, '−100 mV');
    var ohm = 0.03, act = 0.04, conc = 0.03, ta = 1e-3, tc = 2;
    var d = 'M' + X(tmin) + ',' + Y(-(act + conc)); // ohmic step already gone at 1e-7 s
    for (var i = 0; i <= 300; i++) { var lt = tmin + (tmax - tmin) * i / 300, tt = Math.pow(10, lt); d += ' L' + X(lt).toFixed(1) + ',' + Y(-(act * Math.exp(-tt / ta) + conc * Math.exp(-tt / tc))).toFixed(1); }
    el('path', { d: 'M' + (x0 - 6) + ',' + Y(-(ohm + act + conc)) + ' L' + x0 + ',' + Y(-(ohm + act + conc)) + ' L' + x0 + ',' + Y(-(act + conc)), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, g);
    var path = el('path', { d: d, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2, 'class': 'draw-in' }, g);
    var labs = [[X(-6.8), Y(-0.055), 'ohmic step: instant, under 10⁻⁶ s', 'start'], [X(-3), Y(-0.02), 'activation: 10⁻⁴ to 10⁻² s', 'middle'], [X(0.6), Y(-0.045), 'concentration: 10⁻² s and longer', 'middle']];
    labs.forEach(function (l) { var t = el('text', { x: l[0], y: l[1], 'class': 'lbl amber', 'text-anchor': l[3] }, g); setSvgText(t, l[2]); });
    el('rect', { x: X(-4), y: y1, width: X(-2) - X(-4), height: y0 - y1, fill: 'var(--cyan)', 'fill-opacity': '.06' }, g);
    el('rect', { x: X(-2), y: y1, width: x1 - X(-2), height: y0 - y1, fill: 'var(--amber)', 'fill-opacity': '.05' }, g);
    var L = path.getTotalLength(); path.style.strokeDasharray = L; path.style.strokeDashoffset = motion ? L : 0;
    var started = false;
    bind(fig, { start: function () { if (started || !motion) return; started = true; path.style.transition = 'stroke-dashoffset 2.6s cubic-bezier(.2,.7,.2,1)'; path.style.strokeDashoffset = 0; }, stop: function () {} });
  });

  /* ===== 5.3 Plateau or slope ===== */
  register('f5-3', function (fig) {
    var svg = fig.querySelector('svg'), core = svg.querySelector('.core'), soln = svg.querySelector('.soln'), tr = svg.querySelector('.trace');
    var y0 = 240, h = 30;
    function trace(cx, flat) { var d = ''; for (var i = 0; i <= 40; i++) { var x = i / 40, v = flat ? 0.5 : 0.85 - 0.7 * x; d += (i ? 'L' : 'M') + (cx - 56 + x * 112).toFixed(1) + ',' + (y0 - v * h).toFixed(1); } return d; }
    el('path', { d: trace(130, true), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, tr); el('path', { d: trace(390, false), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, tr);
    var m1 = el('circle', { r: 4, 'class': 'ion' }, tr), m2 = el('circle', { r: 4, 'class': 'ion' }, tr);
    var t1 = el('text', { x: 130, y: y0 + 8, 'class': 'lbl', 'text-anchor': 'middle' }, tr); setSvgText(t1, 'voltage stays flat as lithium enters');
    var t2 = el('text', { x: 390, y: y0 + 8, 'class': 'lbl', 'text-anchor': 'middle' }, tr); setSvgText(t2, 'voltage slopes as lithium enters');
    var t = 0.35, running = false, raf = 0, t0 = null;
    function place(x) {
      core.setAttribute('r', String(56 * Math.sqrt(1 - x))); // unlithiated core shrinks, front sweeps in
      soln.setAttribute('fill-opacity', String(0.35 + 0.65 * x));
      m1.setAttribute('cx', 130 - 56 + x * 112); m1.setAttribute('cy', y0 - 0.5 * h);
      m2.setAttribute('cx', 390 - 56 + x * 112); m2.setAttribute('cy', y0 - (0.85 - 0.7 * x) * h);
    }
    function step(ts) { if (!running) return; var dt = t0 === null ? 0 : (ts - t0) / 1000; t0 = ts; t = (t + dt / 6) % 1; place(t); raf = requestAnimationFrame(step); }
    place(0.45);
    bind(fig, { start: function () { if (!motion || running) return; running = true; t0 = null; raf = requestAnimationFrame(step); }, stop: function () { running = false; cancelAnimationFrame(raf); } });
  });

  /* ===== 5.4 Cycle life and Coulombic efficiency ===== */
  register('f5-4', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), ce = fig.querySelector('.ce'), cv = fig.querySelector('.ce-val'), read = fig.querySelector('.readout');
    var x0 = 60, y0 = 220, x1 = 490, y1 = 30, N = 1000;
    var X = function (n) { return x0 + n / N * (x1 - x0); }, Y = function (r) { return y0 - r * (y0 - y1); };
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    [0, 250, 500, 750, 1000].forEach(function (n) { var t = el('text', { x: X(n), y: y0 + 16, 'text-anchor': 'middle', 'class': 'lbl' }, g); setSvgText(t, n); });
    [0.5, 0.8, 1].forEach(function (r) { var t = el('text', { x: x0 - 6, y: Y(r) + 4, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(t, Math.round(r * 100) + ' %'); });
    var xl = el('text', { x: x1, y: y0 + 32, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(xl, 'cycle number');
    el('line', { x1: x0, y1: Y(0.8), x2: x1, y2: Y(0.8), stroke: 'var(--amber)', 'stroke-dasharray': '4 3' }, g);
    var t80 = el('text', { x: x1, y: Y(0.8) - 5, 'text-anchor': 'end', 'class': 'lbl amber' }, g); setSvgText(t80, '80 %: end of life (Goodenough and Park)');
    el('line', { x1: X(300), y1: y0, x2: X(300), y2: y1, stroke: 'var(--cyan)', 'stroke-dasharray': '4 3' }, g);
    var t300 = el('text', { x: X(300) + 6, y: Y(0.45), 'class': 'lbl cyan' }, g); setSvgText(t300, '300 cycles: commercial minimum (Winter and Brodd)');
    var ghosts = [0.995, 0.999]; ghosts.forEach(function (c) { var d = ''; for (var n = 0; n <= N; n += 10) d += (n ? 'L' : 'M') + X(n).toFixed(1) + ',' + Y(Math.pow(c, n)).toFixed(1); el('path', { d: d, fill: 'none', stroke: 'var(--muted)', 'stroke-opacity': '.4' }, g); var t = el('text', { x: X(N) + 2, y: Y(Math.pow(c, N)) + 4, 'class': 'lbl' }, g); setSvgText(t, (c * 100).toFixed(1) + ' %'); });
    var line = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.2 }, g);
    function render() {
      var c = 0.99 + 0.0099 * (+ce.value / 100); c = Math.min(0.9999, c); setSvgText(cv, (c * 100).toFixed(2) + ' %');
      var d = ''; for (var n = 0; n <= N; n += 5) d += (n ? 'L' : 'M') + X(n).toFixed(1) + ',' + Y(Math.pow(c, n)).toFixed(1); line.setAttribute('d', d);
      var n80 = Math.log(0.8) / Math.log(c);
      read.innerHTML = 'If ' + (100 - c * 100).toFixed(2) + ' % of the charge is lost for good every cycle, the cell reaches 80 % after <b>' + Math.round(n80) + ' cycles</b>' + (n80 >= 300 ? ', which meets' : ', which fails') + ' the 300-cycle requirement. Real cells also lose capacity reversibly and unevenly, so treat this as an upper bound.';
    }
    ce.addEventListener('input', render); render();
  });

  /* ===== 5.5 Where the heat comes from ===== */
  register('f5-5', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), read = fig.querySelector('.readout'), sb = fig.querySelectorAll('button[data-sign]');
    var sign = 1, y0 = 120, sc = 600; // px per (V * C-rate) illustrative
    var zero = el('line', { x1: 60, y1: y0, x2: 490, y2: y0, stroke: 'var(--line-2)' }, g);
    var rev = el('rect', { x: 100, width: 110, rx: 4, fill: 'var(--cyan)', 'fill-opacity': '.7' }, g), irr = el('rect', { x: 300, width: 110, rx: 4, fill: 'var(--heat)', 'fill-opacity': '.8' }, g);
    var t1 = el('text', { x: 155, y: y0 + 40, 'text-anchor': 'middle', 'class': 'lbl strong' }, g); setSvgText(t1, 'reversible (entropic) heat');
    var t1b = el('text', { x: 155, y: y0 + 56, 'text-anchor': 'middle', 'class': 'lbl' }, g); setSvgText(t1b, 'sign set by dE/dT, size independent of rate');
    var t2 = el('text', { x: 355, y: y0 + 40, 'text-anchor': 'middle', 'class': 'lbl strong' }, g); setSvgText(t2, 'irreversible (Joule) heat, I·η');
    var t2b = el('text', { x: 355, y: y0 + 56, 'text-anchor': 'middle', 'class': 'lbl' }, g); setSvgText(t2b, 'grows faster than the current');
    var up = el('text', { x: 62, y: 40, 'class': 'lbl' }, g); setSvgText(up, 'heat released on discharge ↑');
    var dn = el('text', { x: 62, y: 206, 'class': 'lbl' }, g); setSvgText(dn, 'heat absorbed on discharge ↓');
    function render() {
      var c = rateFromSlider(+rate.value); setSvgText(rv, fmtRate(c));
      var e = model.eta(c, 0.5).total, q = c * e * sc, r = 0.012 * c * sc * sign; // entropic term proportional to current, sign by dE/dT
      irr.setAttribute('y', y0 - Math.min(q, 90)); irr.setAttribute('height', Math.min(q, 90));
      rev.setAttribute('y', r > 0 ? y0 - Math.min(r, 90) : y0); rev.setAttribute('height', Math.min(Math.abs(r), 90));
      Array.prototype.forEach.call(sb, function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-sign') === 'pos') === (sign < 0))); });
      read.innerHTML = 'On discharge at ' + fmtRate(c) + ': Joule heat I·η with η ≈ ' + Math.round(e * 1000) + ' mV. The entropic term is ' + (sign < 0 ? 'absorbed (positive dE/dT: the cell cools on discharge and heats on charge, as Ni-Cd does)' : 'released (negative dE/dT: the cell heats on discharge and cools on charge, as lead-acid does)') + '. In operation the irreversible part dominates.';
    }
    Array.prototype.forEach.call(sb, function (b) { b.addEventListener('click', function () { sign = b.getAttribute('data-sign') === 'pos' ? -1 : 1; render(); }); });
    sign = -1; rate.addEventListener('input', render); render();
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
    var id = fig.getAttribute('data-fig'); if (figs[id]) { try { figs[id](fig); } catch (e) { if (window.console) console.error('figure ' + id, e); } }
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
