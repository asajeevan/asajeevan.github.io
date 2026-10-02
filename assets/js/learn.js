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
    var q1 = 1, q2 = 1, y = 118, xa = 150, xmid = 260;
    txt(g, 260, 22, 'two charges in vacuum, r apart', 'strong', 'middle');
    var line = el('line', { y1: y, y2: y, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
    var rlab = txt(g, 0, y + 38, '', '', 'middle');
    var rbar = el('path', { fill: 'none', stroke: 'var(--muted)' }, g);
    var fa = el('line', { 'class': 'force-arrow', y1: y, y2: y }, g), fb = el('line', { 'class': 'force-arrow', y1: y, y2: y }, g);
    fa.setAttribute('marker-end', marker(svg, '#F0B441')); fb.setAttribute('marker-end', marker(svg, '#F0B441'));
    var ca = null, cb = null, fLab = txt(g, 0, y - 64, '', 'amber', 'middle'), fLab2 = txt(g, 0, y - 50, '', 'amber', 'middle');
    var fieldLab = txt(g, 0, y + 67, '', 'field', 'middle');
    var fieldArr = el('line', { 'class': 'field-arrow', y1: y + 48, y2: y + 48 }, g); fieldArr.setAttribute('marker-end', marker(svg, '#C4B5F7'));
    var b1 = badge(g, 0, 0, 1), b2 = badge(g, 0, 0, 2), b3 = badge(g, 0, 0, 3);
    txt(g, 260, 218, 'F = q q′ / (4π ε₀ r²),  with  ε₀ = 8.85 × 10⁻¹² C² N⁻¹ m⁻²', '', 'middle');
    function render() {
      var r = +rSl.value; setSvgText(rv, r.toFixed(1) + ' nm');
      var d = 40 + r * 62; xa = xmid - d / 2; var xb = xmid + d / 2; // the pair stays centred on the figure
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
      b1.setAttribute('transform', 'translate(' + (xa - 34) + ',' + (y - 30) + ')'); b2.setAttribute('transform', 'translate(' + (xa - 30) + ',' + (y + 34) + ')');
      b3.setAttribute('transform', 'translate(' + (xb + 34) + ',' + (y - 30) + ')');
      // the field of a at b's place: force per unit charge, direction away from a if a is +
      var E = P.fieldOfCharge(q1 * P.e, r * 1e-9);
      var eLen = (q1 > 0 ? 1 : -1) * Math.min(90, 26 * Math.sqrt(Math.abs(E) / P.fieldOfCharge(P.e, 2e-9)));
      fieldArr.setAttribute('x1', xb); fieldArr.setAttribute('x2', xb + eLen);
      fieldLab.setAttribute('x', Math.max(84, Math.min(436, xb + eLen / 2))); /* centred under the arrow, kept inside the frame */ setSvgText(fieldLab, 'field of q at q′: ' + fmt(Math.abs(E) * 1e-9, 2) + ' V/nm');
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
    txt(g, cx - 13, ct - 6, '+', 'strong big', 'middle'); txt(g, cx - 13, cb + 18, '−', 'strong big', 'middle');
    txt(g, cx - 30, 114, 'cell', '', 'end');
    var pathD = 'M' + cx + ',' + ct + ' V40 H200 M240,40 H410 V80 M410,140 V180 H' + cx + ' V' + cb;
    el('path', { d: pathD, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2.5 }, g);
    // switch
    var sw = el('g', { 'class': 'sw', role: 'button', tabindex: '0', 'aria-pressed': 'true', 'aria-label': 'Open or close the switch' }, g);
    el('rect', { x: 190, y: 8, width: 60, height: 50, fill: 'transparent' }, sw);
    el('circle', { cx: 200, cy: 40, r: 4, fill: 'var(--text)' }, sw); el('circle', { cx: 240, cy: 40, r: 4, fill: 'var(--text)' }, sw);
    var blade = el('line', { x1: 200, y1: 40, x2: 240, y2: 40, stroke: 'var(--text)', 'stroke-width': 3, 'stroke-linecap': 'round' }, sw);
    txt(sw, 220, 60, 'switch', 'amber', 'middle');
    // resistor as a zigzag (the lamp filament)
    var glow = el('circle', { cx: 410, cy: 110, r: 24, 'class': 'lamp lamp-on' }, g); glow.setAttribute('fill-opacity', '.22');
    el('circle', { cx: 410, cy: 110, r: 24, fill: 'none', stroke: 'var(--line-2)' }, g);
    el('path', { d: 'M410,80 l-10,8 l20,8 l-20,8 l20,8 l-20,8 l20,8 l-20,8 l10,4', fill: 'none', stroke: 'var(--text)', 'stroke-width': 2.2 }, g);
    txt(g, 446, 106, 'lamp,', ''); var Rlab = txt(g, 446, 120, 'R', '');
    // electrons along the full wire path (one continuous path for the flow)
    var ePath = el('path', { d: 'M' + cx + ',' + cb + ' V180 H410 V40 H' + cx + ' V' + ct, fill: 'none', stroke: 'none' }, g);
    var ef = flow(svg, ePath, { n: 14, cls: 'e-dot', r: 3, speed: 40, parent: g });
    txt(g, 252, 162, 'electrons: − to +, through the wire', 'cyan', 'middle');
    var fieldW = arrow(g, 296, 62, 336, 62, '#C4B5F7', 1.4, 'field-arrow'); txt(g, 316, 84, 'field along the wire', 'field', 'middle');
    // strip: the path unrolled from the − terminal, through the cell, the top wire, the switch, the lamp and the bottom wire
    var strip = phiStrip(g, { x: 56, y: 224, w: 440, h: 70 }, [], { vmin: 0, vmax: 5, label: 'φ', units: '0', xlabel: 'the loop unrolled: from the − terminal round to the − terminal', xanchor: 'middle' });
    [0.12, 0.40, 0.48, 0.76].forEach(function (f) { el('line', { x1: strip.X(f), y1: 224, x2: strip.X(f), y2: 294, stroke: 'var(--line)', 'stroke-dasharray': '3 3' }, strip.ticks); });
    [['cell', 0.06], ['wire', 0.26], ['switch', 0.44], ['lamp', 0.62], ['wire', 0.88]].forEach(function (s) { txt(g, strip.X(s[1]), 214, s[0], '', 'middle'); });
    badge(g, cx + 40, ct - 8, 1); badge(g, 388, 158, 2); badge(g, 118, 158, 3); badge(g, 268, 24, 4);
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
    var Elab = txt(g, 260, yB + 18, '', 'field', 'middle');
    // our ion (cation) and an anion, with force and drag arrows
    var ion = ourIon(g, 200, 90, 7, 'our ion, +', true), an = el('circle', { cx: 320, cy: 140, r: 6, 'class': 'ion an' }, g), anLab = txt(g, 320, 160, 'anion, −', '', 'middle');
    var fE = el('line', { 'class': 'force-arrow' }, g), fD = el('line', { stroke: 'var(--anion)', 'stroke-width': 2.2 }, g), fA = el('line', { 'class': 'force-arrow' }, g);
    fE.setAttribute('marker-end', marker(svg, '#F0B441')); fD.setAttribute('marker-end', marker(svg, '#9AA9A5')); fA.setAttribute('marker-end', marker(svg, '#F0B441'));
    var lE = txt(g, 0, 0, 'electric force |z|eE', 'amber', 'start'), lD = txt(g, 0, 0, 'drag 6πηrv', '', 'end');
    var strip = phiStrip(g, { x: xL - 12, y: 210, w: xR + 24 - xL, h: 60 }, [{ x: 0, phi: 1 }, { x: 0.03, phi: 1 }, { x: 0.97, phi: 0 }, { x: 1, phi: 0 }], { vmin: 0, vmax: 1.2, label: 'φ', units: '', xlabel: 'cations are driven down the slope, anions up' });
    badge(g, xL - 30, 105, 1); var b2 = badge(g, 0, 0, 2); badge(g, xR + 28, 46, 3); badge(g, 36, 232, 4);
    var x = 200, v = 0, xa = 320, va = 0, E = 1, rad = 1;
    function render() {
      setSvgText(Ev, ESl.value + ' (relative)'); setSvgText(rv, rSl.value + ' (relative)');
      E = +ESl.value; rad = +rSl.value; setSvgText(Elab, 'field E = slope of φ; here ' + E + ' unit' + (E > 1 ? 's' : ''));
      var u = 1 / rad, vt = u * E;
      ion.move(x, 90); an.setAttribute('cx', xa); anLab.setAttribute('x', xa);
      var L = 14 + 18 * E, Ld = 14 + 18 * (rad * Math.abs(v)); // drag = 6 pi eta r v, in the same units
      fE.setAttribute('x1', x + 10); fE.setAttribute('x2', x + 10 + L); fE.setAttribute('y1', 90); fE.setAttribute('y2', 90);
      fD.setAttribute('x1', x - 10); fD.setAttribute('x2', x - 10 - Ld); fD.setAttribute('y1', 90); fD.setAttribute('y2', 90); fD.style.display = Ld > 14.5 ? '' : 'none';
      fA.setAttribute('x1', xa - 9); fA.setAttribute('x2', xa - 9 - (14 + 18 * E)); fA.setAttribute('y1', 140); fA.setAttribute('y2', 140);
      lE.setAttribute('x', x + 12); lE.setAttribute('y', 74); lD.setAttribute('x', x - 12); lD.setAttribute('y', 104); lD.style.display = (Ld > 14.5 && x - 77 >= xL + 4) ? '' : 'none';
      ion.t.setAttribute('text-anchor', 'start'); ion.t.setAttribute('x', x + 2);
      b2.setAttribute('transform', 'translate(' + (x - 10 - Ld / 2) + ',' + 78 + ')');
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
      if (x > xR - 34) { x = xL + 30; v = 0; } if (xa < xL + 30) { xa = xR - 30; va = 0; }
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
    var eLab = txt(g, 340, 16, 'e⁻ through the wire →', 'cyan', 'middle');
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
    txt(g, (xm0 + xb) / 2, yT - 17, 'metal electrode', 'strong', 'middle'); txt(g, (xb + xs1) / 2, yT - 17, 'liquid electrolyte', 'strong', 'middle');
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
     Module 10: why batteries age. Loss categories after Goodenough and
     Park 2013 (R6) and Tarascon and Armand 2001 (R2); SEI growth regimes
     after von Kolzenberg, Latz and Horstmann 2020 (R37) eqs. 36 and 37;
     manganese dissolution after R6; self-discharge after Winter and
     Brodd 2004 (R1) 2.6. Curves are schematic unless stated.
     ================================================================= */

  /* ===== 10.1 Capacity fade, taken apart ===== */
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
      { text: 'Red: <b>active material lost</b>: particles that crack and lose contact, as in figure 9.2, or that dissolve, as in figure 10.3. The lithium may still be there, but there is less room to store it.' },
      { text: 'Lilac: capacity <b>hidden by resistance</b>. As interfaces thicken and contacts loosen, the voltage under current hits the cut-off sooner (figure 5.3). Measure at a low rate and this part comes back; the other two do not.' }
    ]);
    render();
  });

  /* ===== 10.2 The SEI keeps growing ===== */
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
      { text: 'The SEI that formed on the first charge (module 6) does not stop growing. Its thickness follows a power law, L ∝ t<sup>b</sup>, and the exponent tells you what limits it: <b>b = 1/2</b> when diffusion through the layer is the bottleneck, <b>b = 1</b> when the reaction or migration during charging is, <b>b = 0</b> for migration during discharge.' },
      { text: 'Every bit of new SEI locks up lithium and thickens the layer the ions must cross: the capacity falls, ΔQ ∝ t<sup>b</sup>, and the interfacial resistance rises. The layer grows fastest when the cell sits at a high state of charge or is charged fast.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; t += dt / 6; if (t > 1) t = 0.02; render(); }, { autoplay: true, stepDt: 0.5 });
    render(); bind(fig, loop);
  });

  /* ===== 10.3 Manganese on the move ===== */
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

  /* ===== 10.4 On the shelf: self-discharge ===== */
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
    read.innerHTML = 'Two points, not two curves: the sources give one figure for each, and nothing about the shape in between.';
  });

  /* =================================================================
     Module 11: testing and diagnosis. Impedance computed from the
     Randles circuit of Bard, Faulkner and White (B2) 11.3 and 11.4 with
     the assignments of Winter and Brodd 2004 (R1) 1.5; GITT from
     Weppner and Huggins 1977 (R38) eq. 4; cell formats after Murray,
     Hall and Dahn 2019 (R21) and Goodenough and Park 2013 (R6); the
     techniques after R1 1.5, Tarascon and Armand 2001 (R2) and Fichtner
     et al. 2022 (R48).
     ================================================================= */

  /* ===== 11.2 Impedance, frequency by frequency ===== */
  register('f11-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), rs = fig.querySelector('.rct'), rv = fig.querySelector('.rct-val');
    var Ru = 5, Cd = 20e-6, sigma = 6, Rct = 20;
    var x0 = 60, y0 = 230, sc = 4.2; // px per ohm, same on both axes so the semicircle is round
    var X = function (re) { return x0 + re * sc; }, Y = function (im) { return y0 - im * sc; };
    el('line', { x1: x0, y1: y0, x2: 500, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: 40, stroke: 'var(--line-2)' }, g);
    [0, 20, 40, 60, 80, 100].forEach(function (r) { el('line', { x1: X(r), x2: X(r), y1: y0, y2: y0 + 5, stroke: 'var(--line-2)' }, g); txt(g, X(r), y0 + 18, r, '', 'middle'); });
    [20, 40].forEach(function (r) { el('line', { x1: x0 - 5, x2: x0, y1: Y(r), y2: Y(r), stroke: 'var(--line-2)' }, g); txt(g, x0 - 8, Y(r) + 4, r, '', 'end'); });
    txt(g, 500, y0 + 34, 'real part Z′, Ω', '', 'end'); txt(g, x0 + 6, 40, '−Z″, Ω', '', 'start');
    var path = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), dot = el('circle', { r: 6, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var peak = el('circle', { r: 4, fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.6 }, g), peakT = txt(g, 0, 0, '', 'cyan', 'middle');
    var fT = txt(g, 498, 58, '', 'strong', 'end');
    // the equivalent circuit, top right
    var cx = 318, cy = 176, cg = el('g', {}, g);
    function box(x, w, lab) { var r = el('rect', { x: x, y: cy - 10, width: w, height: 20, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, cg); var t = txt(cg, x + w / 2, cy + 4, lab, 'strong', 'middle'); return r; }
    el('line', { x1: cx - 20, x2: cx + 196, y1: cy, y2: cy, stroke: 'var(--muted)' }, cg);
    var eRu = box(cx - 10, 36, 'R_u'), eRct = box(cx + 50, 40, 'R_ct'), eW = box(cx + 136, 36, 'W');
    el('path', { d: 'M' + (cx + 40) + ',' + cy + ' V' + (cy + 26) + ' H' + (cx + 100) + ' V' + cy, fill: 'none', stroke: 'var(--muted)' }, cg);
    var eCd = el('rect', { x: cx + 58, y: cy + 16, width: 24, height: 20, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, cg); txt(cg, cx + 70, cy + 30, 'C_d', 'strong', 'middle');
    badge(g, X(Ru) - 2, y0 - 22, 1); var b2 = badge(g, 0, 0, 2), b3 = badge(g, 0, 0, 3);
    var w = 7; // log10 of angular frequency; sweeps from high to low
    function Z(om) { var k = P.kineticImpedance(Ru, Rct, Cd, om), wb = P.warburg(sigma, om); return { re: k.re + wb.re, im: k.negIm + wb.negIm }; }
    function render() {
      Rct = +rs.value; setSvgText(rv, Rct + ' Ω');
      var d = ''; for (var k = 0; k <= 240; k++) { var lw = 6 - 7.5 * k / 240, z = Z(Math.pow(10, lw)); if (z.re > 112 || z.im > 46) break; d += (k ? 'L' : 'M') + X(z.re).toFixed(1) + ',' + Y(z.im).toFixed(1); }
      path.setAttribute('d', d);
      var pk = P.semicirclePeak(Rct, Cd), zp = Z(pk.omega);
      peak.setAttribute('cx', X(zp.re)); peak.setAttribute('cy', Y(zp.im)); peakT.setAttribute('x', X(zp.re)); peakT.setAttribute('y', Y(zp.im) - 12); setSvgText(peakT, 'top: f = ' + Math.round(pk.f) + ' Hz');
      b2.setAttribute('transform', 'translate(' + X(Ru + Rct / 2) + ',' + (y0 - 14) + ')');
      var zw = Z(Math.pow(10, 0)); b3.setAttribute('transform', 'translate(' + (Math.min(480, X(zw.re)) + 18) + ',' + (Y(zw.im) + 6) + ')');
      place();
    }
    function place() {
      var om = Math.pow(10, w), z = Z(om); dot.setAttribute('cx', Math.min(X(z.re), 500)); dot.setAttribute('cy', Math.max(Y(z.im), 30));
      var f = om / (2 * Math.PI); setSvgText(fT, 'f = ' + (f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 0 : 1) + ' kHz' : f >= 1 ? f.toFixed(f >= 10 ? 0 : 1) + ' Hz' : f.toFixed(2) + ' Hz'));
      var region = om > 20 / (Rct * Cd) ? 'u' : om > 0.4 * sigma * sigma / (Rct * Rct) ? 'ct' : 'w';
      [eRu, eRct, eCd, eW].forEach(function (e) { e.setAttribute('stroke', 'var(--line-2)'); e.setAttribute('stroke-width', 1); });
      (region === 'u' ? [eRu] : region === 'ct' ? [eRct, eCd] : [eW]).forEach(function (e) { e.setAttribute('stroke', 'var(--amber)'); e.setAttribute('stroke-width', 2.2); });
      read.innerHTML = region === 'u' ? 'High frequency: the double-layer capacitance passes the alternating current almost freely, short-circuiting R_ct, so the cell looks like a plain resistance, <b>R_u = ' + Ru + ' Ω</b>: the electrolyte and contacts.'
        : region === 'ct' ? 'Middle frequencies: the double-layer capacitance and the <b>charge-transfer resistance</b> share the current; together they draw a semicircle of diameter R_ct = ' + Rct + ' Ω, whose top sits at ω = 1/(R_ct C_d).'
          : 'Low frequency: diffusion can no longer keep up, and the <b>Warburg</b> element draws a straight line at 45°.';
    }
    on(rs, 'input', render);
    steps(fig, [
      { text: 'Apply a small alternating voltage and measure the current, frequency by frequency. At <b>high frequency</b> (the dot starts on the left) the plot meets the real axis at the ohmic resistance: electrolyte and contacts. It does not depend on frequency.' },
      { text: 'Lower the frequency and the <b>charge transfer</b> at the interface, in parallel with the double-layer capacitance, draws a <b>semicircle</b>. Its diameter is R_ct; its top lies at ω = 1/(R_ct C_d), that is f = 1/(2π R_ct C_d). Slide R_ct up, as an ageing interface would, and watch it grow.' },
      { text: 'At the lowest frequencies <b>diffusion</b> takes over and the plot becomes a straight line at 45°, the Warburg impedance.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; w -= dt * 1.1; if (w < -1.5) w = 6; place(); }, { autoplay: true, stepDt: 0.4 });
    if (!motion) { w = Math.log10(1 / (Rct * Cd)); place(); }
    bind(fig, loop);
  });

  /* ===== 11.1 One cell, four measurements ===== */
  register('f11-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var P4 = [
      { x: 20, y: 20, t: 'cycling at constant current', q: 'How much charge, at what voltage, for how many cycles?' },
      { x: 270, y: 20, t: 'current interruption', q: 'How big is each kind of polarization?' },
      { x: 20, y: 170, t: 'impedance spectroscopy', q: 'Which resistance: electrolyte, interface or diffusion?' },
      { x: 270, y: 170, t: 'GITT', q: 'How fast does lithium diffuse in the solid?' }
    ];
    var W = 230, H = 130;
    P4.forEach(function (p, i) {
      el('rect', { x: p.x, y: p.y, width: W, height: H, rx: 6, fill: 'var(--panel-2)', 'fill-opacity': '.5', stroke: 'var(--line-2)' }, g);
      txt(g, p.x + 10, p.y + 18, p.t, 'strong', 'start');
      var px = p.x + 16, py = p.y + 100, d = '';
      if (i === 0) { for (var cyc = 0; cyc < 2; cyc++) { var ox = px + cyc * 96; for (var k = 0; k <= 24; k++) { var u = k / 24; d += (cyc + k ? 'L' : 'M') + (ox + u * 48).toFixed(1) + ',' + (py - 62 + 22 * u + 22 * Math.pow(u, 8) + cyc * 3).toFixed(1); } for (k = 0; k <= 24; k++) { u = k / 24; d += 'L' + (ox + 48 + u * 48).toFixed(1) + ',' + (py - 18 - 22 * u - 22 * (1 - Math.pow(1 - u, 8)) + cyc * 3 + 3).toFixed(1); } } }
      if (i === 1) { d = 'M' + px + ',' + (py - 20) + ' H' + (px + 60) + ' V' + (py - 44); for (k = 0; k <= 40; k++) { var lt = k / 40; d += ' L' + (px + 60 + lt * 130) + ',' + (py - 44 - 22 * (1 - Math.exp(-lt * 5)) - 8 * lt); } }
      if (i === 2) { for (k = 0; k <= 50; k++) { var a = Math.PI * k / 50; d += (k ? 'L' : 'M') + (px + 70 - 50 * Math.cos(a)) + ',' + (py - 50 * Math.sin(a) * 0.9); } d += ' L' + (px + 170) + ',' + (py - 60); }
      if (i === 3) { d = 'M' + px + ',' + (py - 30); for (k = 0; k < 3; k++) { var x = px + k * 60; d += ' L' + (x + 8) + ',' + (py - 30 - k * 14) + ' L' + (x + 8) + ',' + (py - 50 - k * 14) + ' L' + (x + 28) + ',' + (py - 56 - k * 14) + ' L' + (x + 28) + ',' + (py - 40 - k * 14) + ' L' + (x + 60) + ',' + (py - 44 - k * 14); } }
      el('path', { d: d, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, g);
      txt(g, p.x + 10, p.y + H - 6, i === 0 ? 'voltage against time, cycle after cycle' : i === 1 ? 'three clocks (figure 5.4)' : i === 2 ? 'Nyquist plot (figure 11.2)' : 'pulse, rest, repeat (figure 11.3)', '', 'start');
      badge(g, p.x + W - 14, p.y + 14, i + 1);
      p.qText = p.q;
    });
    steps(fig, P4.map(function (p) { return { text: '<b>' + p.t.charAt(0).toUpperCase() + p.t.slice(1) + '</b>. ' + p.q, on: function () { read.innerHTML = 'The question this measurement answers: <b>' + p.q + '</b>'; } }; }));
  });

  /* ===== 11.3 GITT: pulse, rest, repeat ===== */
  register('f11-3', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), ts = fig.querySelector('.tau'), tv = fig.querySelector('.tau-val');
    var x0 = 62, x1 = 470, y0 = 220, y1 = 40;
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    txt(g, x1, y0 + 18, 'time (schematic)', '', 'end'); txt(g, x0 - 6, y1 - 12, 'cell voltage', '', 'start');
    var curve = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), cur = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.6 }, g);
    var mEt = el('path', { fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.6 }, g), mEs = el('path', { fill: 'none', stroke: '#C4B5F7', 'stroke-width': 1.6 }, g), mIR = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.4, 'stroke-dasharray': '2 2' }, g);
    var tEt = txt(g, 0, 0, 'ΔE_t', 'heat', 'start'), tEs = txt(g, 0, 0, 'ΔE_s', '', 'start'), tIR = txt(g, 0, 0, 'IR', '', 'end'); tEs.style.fill = '#C4B5F7';
    txt(g, x0 + 4, y0 - 6, 'current pulses', 'cyan', 'start');
    badge(g, 0, 0, 1).setAttribute('transform', 'translate(' + (x0 + 120) + ',' + (y0 - 32) + ')'); var b2 = badge(g, 0, 0, 2), b3 = badge(g, 0, 0, 3);
    function render() {
      var tau = +ts.value; setSvgText(tv, tau + ' s');
      // three pulse-rest steps; during a pulse the voltage rises as sqrt(t) (the regime of eq. 4); at rest it relaxes to a new plateau
      var seg = (x1 - x0) / 3, pw = seg * (tau / 1200) * 0.9 + 18, IR = 10, dEt = 20 * Math.sqrt(tau / 600), dEs = 12 * tau / 600, base = y0 - 40;
      var d = '', c = '';
      for (var k = 0; k < 3; k++) {
        var xs = x0 + k * seg, v0 = base - k * dEs;
        d += (k ? 'L' : 'M') + xs + ',' + v0 + ' L' + xs + ',' + (v0 - IR);
        for (var j = 1; j <= 20; j++) d += ' L' + (xs + pw * j / 20).toFixed(1) + ',' + (v0 - IR - dEt * Math.sqrt(j / 20)).toFixed(1);
        d += ' L' + (xs + pw) + ',' + (v0 - dEt);
        for (j = 1; j <= 20; j++) { var r = j / 20; d += ' L' + (xs + pw + (seg - pw) * r).toFixed(1) + ',' + (v0 - dEs - (dEt - dEs) * Math.exp(-r * 6)).toFixed(1); }
        c += 'M' + xs + ',' + (y0 - 14) + ' V' + (y0 - 24) + ' H' + (xs + pw) + ' V' + (y0 - 14) + ' H' + (xs + seg);
        if (k === 1) {
          mEt.setAttribute('d', 'M' + (xs + pw + 4) + ',' + (v0 - IR) + ' V' + (v0 - IR - dEt));
          mIR.setAttribute('d', 'M' + (xs - 4) + ',' + v0 + ' V' + (v0 - IR));
          mEs.setAttribute('d', 'M' + (xs + seg - 6) + ',' + v0 + ' V' + (v0 - dEs));
          tEt.setAttribute('x', xs + pw + 8); tEt.setAttribute('y', v0 - IR - dEt / 2 + 4); tIR.setAttribute('x', xs - 8); tIR.setAttribute('y', v0 - IR / 2 + 4); tEs.setAttribute('x', xs + seg - 2); tEs.setAttribute('y', v0 + 14);
          b2.setAttribute('transform', 'translate(' + (xs + pw + 44) + ',' + (v0 - IR - dEt / 2) + ')'); b3.setAttribute('transform', 'translate(' + (xs + seg - 30) + ',' + (v0 - dEs - 22) + ')');
        }
      }
      curve.setAttribute('d', d); cur.setAttribute('d', c);
      // D from eq. 4 with illustrative material numbers: mB = 10 mg, VM = 30 cm3/mol, MB = 100 g/mol, S = 1 cm2; dEs = 10 mV, dEt scales as sqrt(tau)
      var dEsV = 0.010 * tau / 600, dEtV = 0.035 * Math.sqrt(tau / 600), D = P.gittD(tau, 0.010, 30, 100, 1, dEsV, dEtV);
      read.innerHTML = 'A current pulse of length τ = <b>' + tau + ' s</b>, then rest. During the pulse the voltage jumps by the IR drop and then rises by ΔE<sub>t</sub>; after the rest it settles ΔE<sub>s</sub> above where it started. Weppner and Huggins: D = (4/πτ)(m<sub>B</sub>V<sub>M</sub>/M<sub>B</sub>S)²(ΔE<sub>s</sub>/ΔE<sub>t</sub>)², here ' + sci(D, 1) + ' cm²/s for illustrative numbers. Because ΔE<sub>s</sub> grows in proportion to τ (the charge passed) and ΔE<sub>t</sub> as √τ, the answer does not depend on the pulse length, as long as τ stays short compared with L²/D.';
    }
    on(ts, 'input', render);
    steps(fig, [
      { text: 'GITT, the galvanostatic intermittent titration technique: a short pulse of constant current, then a rest long enough for the voltage to settle, again and again across the whole state of charge.' },
      { text: 'During the pulse, after the instant IR drop (which is left out), the voltage changes by <b>ΔE<sub>t</sub></b>: the lithium content at the particle surface runs ahead of the interior, because diffusion cannot keep up.' },
      { text: 'At rest it relaxes to a new equilibrium, <b>ΔE<sub>s</sub></b> from the last one: the step in the open-circuit curve. The ratio of the two, with the pulse length and the electrode’s mass, molar volume and area, gives the diffusion coefficient.' }
    ]);
    render();
  });

  /* ===== 11.4 What each technique sees ===== */
  register('f11-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var cols = [
      { x: 20, t: 'from outside, cell intact', items: ['charge-discharge curves', 'impedance', 'voltage against temperature', 'pressure and strain'], col: 'var(--cyan)', why: 'Nondestructive: the cell keeps working. Charge-discharge and impedance give capacity, rate behaviour, resistances and state of health; voltage against temperature gives the entropy of the reaction; external pressure sensors can follow the SEI growing.' },
      { x: 187, t: 'inside, while it works', items: ['XANES (X-ray absorption)', 'NMR', 'Mössbauer', 'SEM, in situ'], col: 'var(--amber)', why: 'In situ: plastic lithium-ion cells made it possible to watch the electrodes with X-ray absorption, NMR, Mössbauer spectroscopy and the electron microscope while the cell runs.' },
      { x: 354, t: 'after it is opened', items: ['Raman', 'AFM', 'NMR', 'TEM', 'X-ray absorption'], col: 'var(--heat)', why: 'Post-mortem: tear the cell down and look at its parts with Raman, AFM, NMR, TEM and X-ray absorption. The cell is gone, but you see the damage directly.' }
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
     Module 12: safety, use and end of life. Thermal runaway as defined
     by Winter and Brodd 2004 (R1) 1.2 and 1.3; safeguards after Brandt
     1994 (R46), R1 2.6 and Goodenough and Park 2013 (R6); temperature
     ranges after R1 2.6, SEI growth after von Kolzenberg et al. 2020
     (R37), plating after Fichtner et al. 2022 (R48); recycling routes
     after R48 and R1 2.5.
     ================================================================= */

  /* ===== 12.1 The runaway loop ===== */
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
      { text: 'Thermal runaway is what happens when the reaction of an electrode with the electrolyte becomes <b>self-sustaining</b>: the heat it releases speeds it up, which releases more heat. An autocatalytic loop.' },
      { text: 'What breaks the loop is <b>heat removal</b>. The heat is released inside the cell, at the electrode surfaces, so a cell meant for high currents must be built to shed it. Slide the cooling down and watch the loop close.' },
      { text: 'The curve on the right is only a drawing device with two outcomes: the temperature levels off, or it runs away. No numbers, because no source in hand gives them for a real cell.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph += dt * 1.6; spin.setAttribute('cx', cx + R * Math.cos(ph - Math.PI / 2)); spin.setAttribute('cy', cy + R * Math.sin(ph - Math.PI / 2)); }, { autoplay: true, stepDt: 0.4 });
    spin.setAttribute('cx', cx); spin.setAttribute('cy', cy - R);
    bind(fig, loop);
  });

  /* ===== 12.2 Layers of protection ===== */
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

  /* ===== 12.3 The comfort zone ===== */
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
    read.innerHTML = 'Temperature ranges as Winter and Brodd give them for 2004-era cells; the two notes are the directions the sources give, without numbers.';
  });

  /* ===== 12.4 The recycling routes ===== */
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
    read.innerHTML = 'The recycling routes in use for lithium-ion batteries, after the 2022 BATTERY 2030+ review. In Europe the most common approach combines mechanical and hydrometallurgical steps.';
    var loop = anim(fig, function (dt) { if (dt === 0) return; t += dt / 9; place(); }, { autoplay: true, stepDt: 0.5 });
    place(); bind(fig, loop);
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
    txt(g, (xm + xb) / 2, yT - 12, 'metal', 'strong', 'middle'); txt(g, (xb + xs) / 2 + 90, yT - 12, 'electrolyte', 'strong', 'middle');
    var surf = el('g', {}, g), compact = el('g', {}, g), diffuse = el('g', {}, g), solv = el('g', {}, g);
    // scale brackets
    el('path', { d: 'M196,' + (yB + 6) + ' v6 h8 v-6', fill: 'none', stroke: 'var(--muted)' }, g); txt(g, 198, yB + 26, '< 1 nm: the metal’s charge', '', 'end');
    el('path', { d: 'M212,' + (yT - 2) + ' v-6 h90 v6', fill: 'none', stroke: 'var(--muted)' }, g); txt(g, 257, yT - 14, 'diffuse layer: < 10 nm above 0.01 M', '', 'middle');
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
      { text: 'The <b>red areas</b> between each branch and the dashed line are energy turned into heat: the integral of η over the charge passed. Figure 5.11 follows that heat in time.' }
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
      { text: 'The dashed cyan line is the requirement for a commercial rechargeable cell: <b>at least 300 full cycles</b> with less than 20 % loss.' },
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
     measured open-circuit curve (5.6), many LiFePO4 particles (5.7), inside
     a porous electrode (5.8) and reading a curve by its derivatives (5.9).
     Sources: Olson, López and Dickinson 2023 (R60); Moya 2025 (R61); Safari
     and Delacourt 2011 (R59); Doyle, Fuller and Newman 1993 (R62); Winter and
     Brodd 2004 (R1). Shared helpers come from figs-45.js and figs-5.js.
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
      read.innerHTML = 'Capacitor C10 of Moya 2025 (Table 2: R<sub>H</sub> = 0.31 Ω, R<sub>i</sub> = 0.32 Ω, C = 0.94 F, τ<sub>i</sub> = 0.095 s), charged at ' + Math.round(I0 * 1000) + ' mA for 10 s, then discharged at the same current. t = ' + tNow.toFixed(1) + ' s, v = <b>' + Math.max(0, vt(tNow, I0)).toFixed(3) + ' V</b>. Peak ' + V0.toFixed(3) + ' V. The voltage is a ramp, not a plateau: a capacitor stores charge in proportion to its voltage.';
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
      { text: 'Turn the curves on their side and plot dq/dU, the charge stored per volt. The battery gives a single <b>spike</b>; the capacitor a flat <b>level</b>. Real electrodes lie between the two, which is the idea behind figure 5.9.', on: function () { setView('a'); } },
      { text: 'A real supercapacitor at constant current (Moya’s capacitor C10): an instant jump, a short bend, then a straight ramp at slope I₀/C. Reverse the current and the voltage drops by twice the jump, then ramps down.', on: function () { setView('b'); } },
      { text: 'Zoom in. Just after each switch the curve bends towards a dashed straight line. In Moya’s circuit an inner branch, a resistance R<sub>i</sub> in parallel with a second capacitance that he links to the diffusion of ions in the capacitor, catches up with a time constant of about 0.1 s. The gap starts twice as large on discharge, because the current changes by 2I₀ there and only I₀ at the start.', on: function () { setView('b'); } }
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
      read.innerHTML = 'Lithium content y = <b>' + y.toFixed(2) + '</b>, open-circuit voltage <b>' + V.toFixed(3) + ' V</b> vs Li/Li⁺ (Safari and Delacourt’s fit), ' + where + '.';
    }
    steps(fig, [
      { text: 'An electrode is many particles. Over most of its range LiFePO₄ is two solid phases, one lithium-poor and one lithium-rich. Each particle is drawn turning from one to the other; adding lithium changes <b>how much</b> of each phase there is, not what either phase is made of.' },
      { text: 'This is the measured open-circuit curve: Safari and Delacourt’s fit to the average of a charge and a discharge at C/100. It sits at <b>3.43 V</b> from about y = 0.15 to 0.85.' },
      { text: 'Near the ends the curve slopes. There the material takes or gives lithium as a single phase, a partial solid solution, so its composition, and the voltage with it, can change.' },
      { text: 'Count with the Gibbs phase rule, F = C − P + 2, for two components (lithium and FePO₄). Two phases leave F = 2, both used by fixing temperature and pressure: the voltage cannot move, a <b>plateau</b>. One phase leaves one freedom, the composition: a <b>slope</b> (right, schematic).' },
      { text: 'Even the plateau is not quite one line. Dreyer and co-workers measured a gap of about <b>20 mV</b> between charge and discharge even at C/1000, a true hysteresis they traced to the many particles. The fit drawn here is to the average of Safari and Delacourt’s own C/100 charge and discharge.' }
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
      { text: 'Safari and Delacourt model a LiFePO₄ electrode as <b>four groups</b> of identical particles. They differ only in how well each is wired to the conductive carbon: the <b>contact resistance</b> R<sub>c</sub>, fitted to their cells. A quarter of the particles are well wired; one in twenty very poorly.' },
      { text: 'On a flat open-circuit curve every particle would react at the same voltage, so the current takes the easiest path: group 1 fills first and group 4 last. As the easy particles fill, the current is pushed through worse contacts, and the curve that should be flat <b>tilts</b>, more steeply the faster you go.' },
      { text: 'At higher rate the cut-off arrives while group 4 is still part empty: about half of the capacity lost at high rate is lithium that could not get into the badly connected particles (groups 3 and 4) in time.', on: function () { if (mode === 'path') { mode = 'dis'; press(mb, 'data-mode', mode); draw(); } } },
      { text: 'Now press <b>Same 50 %, two histories</b>. Bring the electrode to half charge from empty or from full, rest it for 2 hours, then charge at 1C. On the plateau nothing evens the groups out during the rest, because no voltage difference drives lithium from one particle to another; so the two electrodes remember how they got there.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; k0 += dt * 60; while (k0 >= 1) { k0 -= 1; kk++; } var n = mode === 'path' ? Math.max(data.A.pts.length, data.B.pts.length) : data.A.pts.length; if (kk >= n + 40) kk = 0; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
    if (!motion) { kk = 100000; place(); }
  });

  /* ===== 5.8 Inside a porous electrode (after Doyle, Fuller and Newman 1993; schematic) ===== */
  register('f5-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cb = fig.querySelectorAll('button[data-case]');
    var xf = 40, xsep = 116, xc = 486, ytop = 30, ybot = 136;
    el('rect', { x: 16, y: ytop, width: xf - 16, height: ybot - ytop, rx: 2, fill: 'var(--metal)' }, g);
    el('rect', { x: xf, y: ytop, width: xsep - xf, height: ybot - ytop, fill: 'var(--cyan)', 'fill-opacity': '.10', stroke: 'var(--line-2)' }, g);
    el('rect', { x: xsep, y: ytop, width: xc - xsep, height: ybot - ytop, fill: 'var(--cyan)', 'fill-opacity': '.10', stroke: 'var(--line-2)' }, g);
    el('rect', { x: xc, y: ytop, width: 14, height: ybot - ytop, rx: 2, fill: 'var(--metal)' }, g);
    txt(g, 28, 20, 'Li foil', '', 'middle'); txt(g, 78, 20, 'separator', '', 'middle'); txt(g, 300, 20, 'composite positive electrode', 'strong', 'middle'); txt(g, 506, 20, 'collector', '', 'end');
    var parts = [], NC = 8;
    for (var r = 0; r < 3; r++) for (var c = 0; c < NC; c++) {
      var cx = 141 + c * 46, cy = 50 + r * 34, base = el('circle', { cx: cx, cy: cy, r: 14, fill: 'var(--panel-2)', stroke: 'var(--amber)', 'stroke-opacity': '.5' }, g);
      parts.push({ c: c, f: el('circle', { cx: cx, cy: cy, r: 14, fill: 'var(--amber-2)', 'fill-opacity': '0' }, g), ring: el('circle', { cx: cx, cy: cy, r: 17, fill: 'none', stroke: 'var(--cation)', 'stroke-width': 2, 'stroke-opacity': '0' }, g) });
    }
    var ions = []; for (var i = 0; i < 10; i++) ions.push({ s: i / 10, y: ytop + 10 + (i * 41 % (ybot - ytop - 20)), e: el('circle', { r: 3.2, 'class': 'ion' }, g) });
    // salt concentration strip
    var sb = { x0: xf, x1: xc, y0: 250, y1: 186 }, cmax = 1.7;
    var YC = function (v) { return sb.y0 - v / cmax * (sb.y0 - sb.y1); };
    el('line', { x1: sb.x0, y1: sb.y0, x2: sb.x1, y2: sb.y0, stroke: 'var(--line-2)' }, g); el('line', { x1: sb.x0, y1: sb.y0, x2: sb.x0, y2: sb.y1, stroke: 'var(--line-2)' }, g);
    el('line', { x1: xsep, x2: xsep, y1: sb.y0, y2: sb.y1, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
    el('line', { x1: sb.x0, x2: sb.x1, y1: YC(1), y2: YC(1), stroke: 'var(--muted)', 'stroke-dasharray': '2 5' }, g);
    txt(g, sb.x0 + 34, sb.y1 - 8, 'salt concentration in the electrolyte', '', 'start'); txt(g, sb.x1, YC(1) - 5, 'at the start', '', 'end');
    txt(g, sb.x0 - 4, YC(1) + 4, '1', '', 'end'); txt(g, sb.x0 - 4, sb.y0 + 4, '0', '', 'end');
    var cl = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.2 }, g), cf = el('path', { fill: 'var(--cyan)', 'fill-opacity': '.12' }, g);
    // utilization meter
    var ub = { x0: xsep, x1: xc, y: 272, h: 14 };
    el('rect', { x: ub.x0, y: ub.y, width: ub.x1 - ub.x0, height: ub.h, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    var uf = el('rect', { x: ub.x0, y: ub.y, height: ub.h, rx: 3, fill: 'var(--amber)' }, g), um = el('line', { y1: ub.y - 4, y2: ub.y + ub.h + 4, stroke: 'var(--heat)', 'stroke-width': 2 }, g);
    txt(g, ub.x0 - 6, ub.y + 11, 'material used', '', 'end'); var ul = txt(g, 0, ub.y + ub.h + 16, '', 'heat', 'middle');
    badge(g, xsep + 22, ybot + 18, 2); badge(g, xc - 18, YC(0.35), 3); badge(g, 28, ybot + 18, 1); badge(g, xc + 2, ub.y + 7, 4);
    var CASES = { a: { I: 10, eps: 0.30, uEnd: 0.84, k: 1.7, dep: 0.95, rise: 0.5 }, b: { I: 20, eps: 0.30, uEnd: 0.30, k: 4.5, dep: 0.98, rise: 0.9 }, c: { I: 10, eps: 0.60, uEnd: 0.97, k: 0.7, dep: 0.5, rise: 0.3 } };
    var cs = CASES.a, s = 0.55, prev = null;
    function profile(U) { // local utilization, front-weighted, mean U (schematic)
      var w = []; for (var j = 0; j < NC; j++) w.push(Math.exp(-cs.k * (j + 0.5) / NC));
      var lo = 0, hi = 50; for (var n = 0; n < 50; n++) { var lam = 0.5 * (lo + hi), m = 0; w.forEach(function (x) { m += Math.min(1, lam * x); }); if (m / NC > U) hi = lam; else lo = lam; }
      return w.map(function (x) { return Math.min(1, lo * x); });
    }
    function place() {
      var sc = Math.min(1, s), U = sc * cs.uEnd, u = profile(U), u2 = profile(Math.min(cs.uEnd, U + 0.01)), rate = u2.map(function (x, j) { return x - u[j]; }), rmax = Math.max.apply(null, rate) || 1;
      parts.forEach(function (p) { p.f.setAttribute('fill-opacity', (0.05 + 0.9 * u[p.c]).toFixed(3)); p.ring.setAttribute('stroke-opacity', (0.9 * rate[p.c] / rmax).toFixed(3)); });
      // concentration: rises at the foil, falls across the electrode, flat at the collector (no flux there)
      var D = cs.dep * (1 - Math.exp(-sc / 0.12)), xs = [], vs = [];
      for (var i = 0; i <= 120; i++) { var x = sb.x0 + i / 120 * (sb.x1 - sb.x0), v;
        if (x <= xsep) v = 1 + cs.rise * D / cs.dep * (1 - (x - sb.x0) / (xsep - sb.x0)) * 0.9 + 0.0;
        else { var xi = (x - xsep) / (sb.x1 - xsep); v = 1 - D * (1 - (1 - xi) * (1 - xi)); }
        xs.push(x); vs.push(YC(Math.max(0.02, v))); }
      cl.setAttribute('d', polyD(xs, vs)); cf.setAttribute('d', polyD(xs, vs) + ' L' + sb.x1 + ',' + sb.y0 + ' L' + sb.x0 + ',' + sb.y0 + ' Z');
      uf.setAttribute('width', (ub.x1 - ub.x0) * U);
      var xe = ub.x0 + (ub.x1 - ub.x0) * cs.uEnd; um.setAttribute('x1', xe); um.setAttribute('x2', xe); ul.setAttribute('x', Math.min(ub.x1 - 40, Math.max(ub.x0 + 50, xe))); setSvgText(ul, 'cut-off at ' + Math.round(cs.uEnd * 100) + ' %');
      var front = 0, tw = 0; rate.forEach(function (r, j) { front += r * j; tw += r; }); fig._front = 141 + (tw ? front / tw : 0) * 46;
      read.innerHTML = 'Discharge at <b>' + cs.I + ' A/m²</b> with an electrode porosity of <b>' + cs.eps.toFixed(2) + '</b>: ' + Math.round(U * 100) + ' % of the positive material used so far. The gold rings mark where the reaction is fastest now. This case reaches the cut-off at about <b>' + Math.round(cs.uEnd * 100) + ' %</b> (Doyle, Fuller and Newman); the profiles are drawn, not computed.';
    }
    function flowIons(dt) { var xe = fig._front || 200; ions.forEach(function (o) { o.s += dt * 0.35; if (o.s > 1) o.s -= 1; o.e.setAttribute('cx', lerp(xf + 2, xe, o.s)); o.e.setAttribute('cy', o.y); o.e.style.opacity = s >= 1 ? 0 : 1; }); }
    Array.prototype.forEach.call(cb, function (b) { on(b, 'click', function () { cs = CASES[b.getAttribute('data-case')]; Array.prototype.forEach.call(cb, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); s = motion ? 0 : 1; place(); flowIons(0); }); });
    place(); flowIons(0);
    steps(fig, [
      { text: 'The cell Doyle, Fuller and Newman modelled: a <b>lithium foil</b>, a polymer electrolyte as separator, and a <b>composite</b> positive electrode of TiS₂ particles packed in the same electrolyte. Each ion must travel into the pores to reach a particle.' },
      { text: 'Early on the reaction crowds near the separator. The particles carry electrons about 10⁵ times better than the electrolyte carries ions, so the short ionic path wins. As the front particles fill, the reaction moves deeper.' },
      { text: 'The salt piles up near the foil and is drained from the back of the electrode. There the electrolyte runs short of ions, and the particles at the back are hardly used.' },
      { text: 'So the cut-off comes early: at 20 A/m² after about <b>30 %</b> of the material is used; at 10 A/m², 84 %. A more open electrode with the same capacity, porosity 0.60 instead of 0.30 (and so thicker), lifts that to 97 %.' }
    ]);
    var loop = anim(fig, function (dt) { flowIons(dt); if (dt === 0) return; s += dt / 8; if (s > 1.25) s = 0; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
    if (!motion) { s = 1; place(); flowIons(0); }
  });

  /* ===== 5.9 Reading a curve by its slopes: dV/dQ and dQ/dV (after Olson et al. 2023) ===== */
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
      { text: 'The square plot (Olson and co-workers) shows both at once: across, the negative electrode’s lithium; up, the positive’s, inverted. A cell is a straight line. Cyan bands are the negative’s plateaus, gold bands the positive’s, and a dQ/dV peak sits where the line crosses both. Lose lithium and the line moves up; lose positive material and it steepens.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; kq += dt / 10; if (kq > 1) kq = 0; place(); }, { autoplay: true, stepDt: 0.4 });
    bind(fig, loop);
  });

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
     Module 7: the electrolyte. Carriers after Winter and Brodd 2004 (R1)
     2.2 and Tarascon and Armand 2001 (R2) Fig. 3 and text; conductivity
     orderings after R2 Fig. 8; transference number and the steady-state
     salt gradient after Boz et al. 2021 (R36) eqs. 6, 7 and 12 and Bard,
     Faulkner and White (B2) 2.3.3; solid-electrolyte requirements and
     contact loss after Goodenough and Park 2013 (R6).
     ================================================================= */

  /* ===== 7.8 Three ways to carry a lithium ion ===== */
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
      { text: 'In a <b>ceramic</b> such as a garnet the framework is rigid and only the ion moves through it, drawn here as hops from site to site; the sources in hand do not describe the mechanism further.' }
    ]);
    drawChains(); render();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.4 });
    tick(0.01); bind(fig, loop);
  });

  /* ===== 7.9 Conductivity against temperature: the orderings of the sources ===== */
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

  /* ===== 7.10 Transference number and the salt gradient ===== */
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
      { text: 'The result is a salt gradient across the cell, Δc = (1 − t₊)·i·L/(F·D): high where Li⁺ is released, low where it is taken in. Slide t₊ from about 0.3 to about 0.6, the values the sources give for a polymer electrolyte without and with nanofillers, and watch the gradient shrink: a smaller gradient means less <b>concentration polarization</b> (module 5).' }
    ]);
    render();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.4 });
    cats.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); if (p.our) our.move(p.x, p.y); }); ans.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
    bind(fig, loop);
  });

  /* ===== 7.11 Solid against solid: the requirements and the contact ===== */
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
      { text: 'Goodenough and Park list <b>four requirements</b> for a solid electrolyte: an ion conductivity above 10⁻⁴ S/cm; blocking dendrites without being reduced by lithium; chemical stability; and a robust, flexible thin membrane.' },
      { text: 'Some ceramics pass the first two: a garnet conducts above 10⁻³ S/cm and is stable against lithium. Their 2013 suggestion for meeting all four at once: <b>ceramic-polymer composites</b>.' },
      { text: 'The interface is the other problem. Electrode particles change volume as lithium goes in and out; against a <b>rigid</b> solid electrolyte, contact is lost and the ion path breaks. Press Play and watch the gap open.' }
    ]);
    draw();
    var loop = anim(fig, function (dt) { if (dt === 0) return; t += dt; draw(); }, { autoplay: true, stepDt: 0.5, onPlay: function () { } });
    if (!motion) { t = 4.0; holeR = R0 + 4.2; draw(); }
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
     Figure 7.3: the ingredients of commercial electrolytes compared.
     Salts after Henderson 2014 (R53), section 1.3 and Tables 1.1 and 1.7;
     solvents after Ue et al. 2014 (R54), Table 2.1. Ratings are the page's
     summary of the source's words; every cell's wording is in SALTS below.
     ================================================================= */
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
      if (!sel) { read.innerHTML = 'Tap any symbol to read what the source says. Conductivities are for 1 M of each salt in PC:DME (50:50 by volume) at 25 °C, Henderson’s Table 1.1; LiPF₆ is the highest of the six.'; return; }
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
      read.innerHTML = '<b>' + A.lab.charAt(0).toUpperCase() + A.lab.slice(1) + '.</b> ' + A.note + ' Values from Ue and co-workers’ Table 2.1' + (asp === 'eps' || asp === 'eta' ? ' (* EC at 40 °C).' : '.');
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
      { text: 'Six lithium salts that have been used in electrolytes, and how each scores on the requirements Henderson lists. Failing any one of them rules a salt out of practical use. The bars give the conductivity of each at 1 M: LiPF₆ leads.', on: function () { setView('s'); sel = { s: SALTS[0], a: 'water' }; placeS(); } },
      { text: 'No salt scores well everywhere. LiPF₆ leads on conductivity, protects the aluminium and forms a good SEI, and loses on water and heat. The others each fail somewhere else: LiClO₄ can explode, LiAsF₆ can turn toxic, LiTFSI and the triflate eat the aluminium foil.', on: function () { setView('s'); sel = { s: SALTS[4], a: 'Al' }; placeS(); } },
      { text: 'Now the solvents. Pick an aspect: the cyclic carbonates (cyan) dissolve salts and are hard to ignite but are thick or solid; the linear ones (gold) flow easily and, except DMC, stay liquid in the cold, but flash near room temperature. A commercial electrolyte mixes the two.', on: function () { setView('v'); } }
    ]);
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
        var it = { kind: 'a', e: a.e, p: a.p.slice(), node: node, mol: mol, hl: opts.hl === i };
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


  /* =================================================================
     Module 8: electrodes are composites. Composite and porosity after
     Winter and Brodd 2004 (R1) 1.6; current distribution after R1 1.6
     and Fig. 9B, computed from Ohm's law in each phase with linearized
     kinetics (Bard, Faulkner and White, R_ct) and the cosh profile of
     Pathak and Bazant 2026 (R41); the poor conductor after R1 2.4 and
     Fig. 15E; carbon coating and nanosizing after Goodenough and Park
     2013 (R6) and Tarascon and Armand 2001 (R2).
     ================================================================= */

  /* ===== 8.1 Two roads to every particle (connectivity computed) ===== */
  register('f8-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), bC = fig.querySelector('.cut-carbon'), bP = fig.querySelector('.block-pores'), bR = fig.querySelector('.reset');
    var xc = 40, xs = 470, top = 40, bot = 250, cols = 5, rows = 4;
    el('rect', { x: xc - 14, y: top - 6, width: 14, height: bot - top + 12, fill: 'var(--metal)' }, g); txt(g, xc - 7, bot + 24, 'Al foil', 'strong', 'middle');
    el('rect', { x: xs, y: top - 6, width: 26, height: bot - top + 12, fill: 'var(--cyan)', 'fill-opacity': '.25', stroke: 'var(--cyan)', 'stroke-opacity': '.5' }, g); txt(g, xs + 13, bot + 24, 'separator', 'cyan', 'middle');
    var pore = el('rect', { x: xc, y: top - 6, width: xs - xc, height: bot - top + 12, fill: 'var(--cyan)', 'fill-opacity': '.12' }, g);
    txt(g, (xc + xs) / 2, top - 16, 'one coating, about 30 % of it pores filled with electrolyte', '', 'middle');
    var P = [], dx = (xs - xc - 40) / (cols - 1), dy = (bot - top - 40) / (rows - 1);
    for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) P.push({ c: c, r: r, x: xc + 22 + c * dx + (r % 2 ? 10 : -6), y: top + 20 + r * dy + (c % 2 ? 6 : -4), R: 15 + ((c * 7 + r * 3) % 5) });
    // carbon links: each particle to its neighbours and the first column to the foil
    var links = [];
    P.forEach(function (a, i) { P.forEach(function (b, j) { if (j > i && Math.abs(a.c - b.c) + Math.abs(a.r - b.r) === 1) links.push({ a: i, b: j }); }); if (a.c === 0) links.push({ a: i, b: -1 }); });
    var lg = el('g', {}, g);
    links.forEach(function (L) { var a = P[L.a], bx = L.b < 0 ? xc : P[L.b].x, by = L.b < 0 ? a.y : P[L.b].y; L.e = el('line', { x1: a.x, y1: a.y, x2: bx, y2: by, stroke: 'var(--cyan)', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-opacity': '.9' }, lg); L.on = true; });
    // ion access: each particle has a pore route to the separator unless blocked
    P.forEach(function (p) { p.wet = true; p.e = el('circle', { cx: p.x, cy: p.y, r: p.R, 'class': 'ptc' }, g); p.mk = el('text', { x: p.x, y: p.y + 4, 'text-anchor': 'middle', 'class': 'lbl strong' }, g); });
    var info = txt(g, (xc + xs) / 2, bot + 24, '', 'amber', 'middle');
    badge(g, xc - 7, top - 18, 1); badge(g, xs + 13, top - 18, 2); badge(g, (xc + xs) / 2 + 150, bot + 18, 3);
    function solve() {
      // electrons: breadth-first from the foil along intact carbon links
      var reach = P.map(function () { return false; }), q = [];
      links.forEach(function (L) { if (L.on && L.b < 0) { reach[L.a] = true; q.push(L.a); } });
      while (q.length) { var i = q.shift(); links.forEach(function (L) { if (!L.on || L.b < 0) return; var j = L.a === i ? L.b : L.b === i ? L.a : -1; if (j >= 0 && !reach[j]) { reach[j] = true; q.push(j); } }); }
      var n = 0;
      P.forEach(function (p, i) { p.ok = reach[i] && p.wet; if (p.ok) n++; p.e.setAttribute('class', 'ptc ' + (p.ok ? 'on' : 'dead')); setSvgText(p.mk, p.ok ? '' : (!reach[i] && !p.wet ? 'e⁻, Li⁺' : !reach[i] ? 'no e⁻' : 'no Li⁺')); });
      return n;
    }
    function render() {
      var n = solve();
      setSvgText(info, n + ' of ' + P.length + ' particles can work');
      read.innerHTML = 'A particle works only if <b>electrons</b> can reach it through the carbon network from the foil and <b>ions</b> can reach it through electrolyte-filled pores from the separator. Here <b>' + n + ' of ' + P.length + '</b> can; the rest are dead weight, mass and volume that store nothing.';
    }
    var rng = 7;
    function rand() { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; }
    on(bC, 'click', function () { var live = links.filter(function (L) { return L.on; }); for (var k = 0; k < 4 && live.length; k++) { var L = live.splice((rand() * live.length) | 0, 1)[0]; L.on = false; L.e.setAttribute('stroke-opacity', '.12'); L.e.setAttribute('stroke-dasharray', '2 4'); } render(); });
    on(bP, 'click', function () { var wet = P.filter(function (p) { return p.wet; }); for (var k = 0; k < 2 && wet.length; k++) { var p = wet.splice((rand() * wet.length) | 0, 1)[0]; p.wet = false; } render(); });
    on(bR, 'click', function () { links.forEach(function (L) { L.on = true; L.e.setAttribute('stroke-opacity', '.9'); L.e.removeAttribute('stroke-dasharray'); }); P.forEach(function (p) { p.wet = true; }); render(); });
    steps(fig, [
      { text: 'The <b>electron road</b>: a network of conductive carbon (teal) touching every particle and running back to the aluminium foil. Press <b>Break carbon contacts</b> a few times.' },
      { text: 'The <b>ion road</b>: the pores between particles are filled with electrolyte that connects to the separator. Press <b>Seal some pores</b>: a particle walled off by binder gets no ions.' },
      { text: 'A particle stores lithium only where <b>both roads arrive</b>. Every dark particle is mass and volume that the cell carries for nothing. The count is computed from the network you have left.' }
    ]);
    render();
  });

  /* ===== 8.2 Where does the current go? ===== */
  register('f8-2', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), rs = fig.querySelector('.ratio'), rv = fig.querySelector('.ratio-val'), ns = fig.querySelector('.nu'), nv = fig.querySelector('.nu-val');
    var x0 = 70, x1 = 460, y0 = 270, y1 = 130;
    // the electrode strip, shaded by the local reaction rate
    var cells = [], N = 40, sy = 46, sh = 50;
    el('rect', { x: x0 - 16, y: sy - 4, width: 14, height: sh + 8, fill: 'var(--metal)' }, g); txt(g, x0 - 9, sy - 10, 'collector', '', 'middle');
    el('rect', { x: x1 + 2, y: sy - 4, width: 14, height: sh + 8, fill: 'var(--cyan)', 'fill-opacity': '.3' }, g); txt(g, x1 + 9, sy - 10, 'separator', 'cyan', 'middle');
    for (var i = 0; i < N; i++) cells.push(el('rect', { x: x0 + i * (x1 - x0) / N, y: sy, width: (x1 - x0) / N + 0.5, height: sh, fill: 'var(--amber)' }, g));
    txt(g, (x0 + x1) / 2, sy + sh + 16, 'brighter = more of the reaction happens there', '', 'middle');
    // the profile plot
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    txt(g, x0, y0 + 16, 'collector', '', 'middle'); txt(g, x1, y0 + 16, 'separator', '', 'middle'); txt(g, (x0 + x1) / 2, y0 + 16, 'position across the electrode', '', 'middle');
    txt(g, x0 - 6, y1 + 4, 'local', '', 'end'); txt(g, x0 - 6, y1 + 20, 'rate', '', 'end');
    var avg = el('line', { x1: x0, x2: x1, stroke: 'var(--muted)', 'stroke-dasharray': '4 4' }, g), avgT = txt(g, x1 - 4, 0, 'uniform', '', 'end');
    var prof = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    badge(g, 30, sy + sh / 2, 1); badge(g, 490, y1 + 10, 2);
    function render() {
      var lr = +rs.value / 50 - 2, ratio = Math.pow(10, lr), nu = +ns.value / 10; // ratio = sigma/kappa (matrix over electrolyte)
      setSvgText(rv, ratio >= 1 ? '×' + (ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)) : '÷' + (1 / ratio < 10 ? (1 / ratio).toFixed(1) : Math.round(1 / ratio))); setSvgText(nv, nu.toFixed(1));
      // local rate j ~ (1/kappa) cosh(nu xi) + (1/sigma) cosh(nu (1 - xi)), xi measured from the collector;
      // multiplied by kappa: cosh(nu xi) + (kappa/sigma) cosh(nu (1 - xi)). nu = thickness / reaction depth.
      var f = function (xi) { return Math.cosh(nu * xi) + (1 / ratio) * Math.cosh(nu * (1 - xi)); };
      var pts = [], mean = 0; for (var k = 0; k <= 100; k++) { var v = f(k / 100); pts.push(v); mean += v / 101; }
      var mx = 0; pts = pts.map(function (v) { v /= mean; mx = Math.max(mx, v); return v; });
      var top = Math.max(2, Math.ceil(mx)), Y = function (v) { return y0 - v / top * (y0 - y1); };
      prof.setAttribute('d', pts.map(function (v, k) { return (k ? 'L' : 'M') + (x0 + k / 100 * (x1 - x0)).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' '));
      avg.setAttribute('y1', Y(1)); avg.setAttribute('y2', Y(1)); avgT.setAttribute('y', Y(1) - 5);
      cells.forEach(function (cEl, i) { var v = f((i + 0.5) / N) / mean; cEl.setAttribute('fill-opacity', String(Math.min(1, 0.08 + 0.6 * v / Math.max(1.4, mx)))); });
      var where = ratio > 1.2 ? 'next to the separator, where the ions arrive' : ratio < 0.83 ? 'next to the collector, where the electrons arrive' : 'at both faces, less in the middle';
      read.innerHTML = 'Matrix conductivity ' + (ratio >= 1 ? ratio.toFixed(ratio < 10 ? 1 : 0) + ' times higher than' : (1 / ratio).toFixed(1 / ratio < 10 ? 1 : 0) + ' times lower than') + ' the effective electrolyte conductivity; electrode ' + nu.toFixed(1) + ' reaction depths thick. The reaction crowds <b>' + (nu < 0.6 ? 'nowhere: it is almost uniform' : where) + '</b>; the busiest slice works ' + mx.toFixed(1) + ' times harder than the average.';
    }
    on(rs, 'input', render); on(ns, 'input', render);
    steps(fig, [
      { text: 'The strip is one electrode, from the current collector on the left to the separator on the right. Electrons come in from the left through the solid, ions from the right through the electrolyte in the pores. Where does the reaction happen?' },
      { text: 'Wherever the path is cheapest. If the solid conducts far better than the electrolyte, the reaction crowds next to the <b>separator</b>; if the electrolyte is the better conductor, next to the <b>collector</b>. Make the electrode thick compared with its reaction depth and the crowding gets worse: the far side of the coating does little.' }
    ]);
    render();
  });

  /* ===== 8.3 A poor conductor needs carbon ===== */
  register('f8-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), mb = fig.querySelectorAll('button[data-carbon]');
    var parts = [{ x: 130, label: 'one carbon contact' }, { x: 390, label: '' }];
    var R = 70, cy = 120, mode = 'dot', k = 0;
    var defs = svg.querySelector('defs') || el('defs', {}, svg);
    parts.forEach(function (p, i) {
      var id = 'f83c' + i + Math.random().toString(36).slice(2, 6), cp = el('clipPath', { id: id }, defs); el('circle', { cx: p.x, cy: cy, r: R }, cp);
      el('circle', { cx: p.x, cy: cy, r: R, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
      p.lit = el('circle', { cx: i === 0 ? p.x - R : p.x, cy: cy, r: 0, fill: 'var(--amber)', 'fill-opacity': '.85', 'clip-path': 'url(#' + id + ')' }, g);
    });
    // left: one carbon particle touching at the left edge
    el('circle', { cx: 130 - R - 12, cy: cy, r: 14, fill: 'var(--cyan)' }, g); txt(g, 130 - R - 12, cy + 34, 'carbon', 'cyan', 'middle');
    // right: a carbon coating or nothing
    var coat = el('circle', { cx: 390, cy: cy, r: R + 4, fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 6 }, g);
    var tR = txt(g, 390, cy + R + 28, '', 'cyan', 'middle'), tL = txt(g, 130, cy + R + 28, 'carbon at one point', 'cyan', 'middle');
    var pct = [txt(g, 130, cy + 4, '', 'strong', 'middle'), txt(g, 390, cy + 4, '', 'strong', 'middle')];
    badge(g, 130 - R - 12, cy - 26, 1); badge(g, 390 + R + 18, cy - R + 4, 2);
    function render() {
      Array.prototype.forEach.call(mb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-carbon') === mode)); });
      coat.style.display = mode === 'coat' ? '' : 'none'; setSvgText(tR, mode === 'coat' ? 'carbon coating all round' : 'no carbon at all');
      var rL = 2 * R * k, rR = mode === 'coat' ? R * k : 0;
      parts[0].lit.setAttribute('r', rL); parts[1].lit.setAttribute('r', mode === 'coat' ? R : 0);
      if (mode === 'coat') { parts[1].lit.setAttribute('r', R); parts[1].lit.setAttribute('fill-opacity', String(0.15 + 0.7 * Math.min(1, 2 * k))); }
      setSvgText(pct[0], k > 0.02 ? 'reacting' : ''); setSvgText(pct[1], mode === 'coat' ? (k > 0.02 ? 'reacting everywhere' : '') : 'dark');
      read.innerHTML = 'Left: the active material conducts electrons poorly, so it reacts first where it touches the carbon and the reacted zone spreads inward from there. Right: ' + (mode === 'coat' ? 'with a carbon coating every point of the surface is a contact, so the whole particle reacts at once.' : 'with no carbon contact at all, nothing happens: no electrons, no reaction.');
    }
    Array.prototype.forEach.call(mb, function (b) { on(b, 'click', function () { mode = b.getAttribute('data-carbon'); k = 0; render(); }); });
    steps(fig, [
      { text: 'A poorly conducting active material, such as the MnO₂ of an alkaline cell, can only take electrons where it touches the <b>carbon</b>. The reaction starts at that point and spreads from it.' },
      { text: 'LiFePO₄ is also a poor electronic conductor; making it work took a <b>carbon coating</b> and small particles. Switch between the two right-hand particles: no carbon, or carbon all round.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; k += dt / 6; if (k > 1.15) k = 0; render(); }, { autoplay: true, stepDt: 0.6 });
    if (!motion) k = 0.5;
    render(); bind(fig, loop);
  });

  /* ===== 8.4 The nanoparticle trade-off ===== */
  register('f8-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), ss = fig.querySelector('.size'), sv = fig.querySelector('.size-val');
    var bx = 40, by = 40, bw = 200, bh = 170, gx = 280;
    el('rect', { x: bx, y: by, width: bw, height: bh, rx: 6, fill: 'none', stroke: 'var(--line-2)' }, g);
    var box2 = el('rect', { x: gx, y: by, width: bw, height: bh, rx: 6, fill: 'none', stroke: 'var(--line-2)' }, g);
    txt(g, bx + bw / 2, by - 12, 'large particles', 'strong', 'middle'); var t2 = txt(g, gx + bw / 2, by - 12, '', 'strong', 'middle');
    var gL = el('g', {}, g), gS = el('g', {}, g);
    // large: 4 particles of radius 32 packed in the left box
    [[90, 95], [180, 95], [90, 170], [180, 170]].forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 34, fill: 'var(--amber-2)', 'fill-opacity': '.85' }, gL); });
    // bars: volume needed (tap density) and time to empty a particle (L^2/2D)
    var barY = 250, bt = [txt(g, 40, barY - 6, 'time for an ion to cross a particle, t ∝ L²', '', 'start'), txt(g, 40, barY + 42, 'volume the same mass of powder takes up', '', 'start')];
    var b1 = el('rect', { x: 40, y: barY, width: 0, height: 12, fill: 'var(--cyan)' }, g), b2 = el('rect', { x: 40, y: barY + 48, width: 0, height: 12, fill: 'var(--amber)' }, g);
    var r1 = el('rect', { x: 40, y: barY, width: 300, height: 12, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '2 3' }, g);
    el('rect', { x: 40, y: barY + 48, width: 150, height: 12, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '2 3' }, g);
    var v1 = txt(g, 350, barY + 11, '', 'cyan', 'start'), v2 = txt(g, 350, barY + 59, '', 'amber', 'start');
    badge(g, 500, barY + 6, 1); badge(g, 500, barY + 54, 2);
    function render() {
      var f = +ss.value / 100; // size relative to the large particles, 0.1 .. 1
      var kf = 1 / f, ks = Math.abs(kf - Math.round(kf)) < 0.05 ? String(Math.round(kf)) : kf.toFixed(1), kt = kf * kf, kts = kt.toFixed(kt < 10 ? 1 : 0);
      setSvgText(sv, f >= 0.999 ? 'same' : '1/' + ks); setSvgText(t2, f >= 0.999 ? 'same size, coated' : 'particles ' + ks + ' times smaller, coated');
      clear(gS);
      var r = 34 * f;
      // the same mass in more, smaller, coated particles: drawn as a packed region that grows with the coating share (schematic)
      var boxH = bh * (0.55 + 0.45 * Math.min(1, (1 - f) * 1.2));
      el('rect', { x: gx + 6, y: by + bh - boxH + 6, width: bw - 12, height: boxH - 12, rx: 4, fill: 'var(--panel-2)' }, gS);
      var rr = Math.max(3, r), step = 2 * rr + 3 + 2 * Math.max(1, 3 * f), top0 = by + bh - boxH + 6 + rr + 2;
      for (var yy = by + bh - 8 - rr; yy >= top0 - 0.1; yy -= step) for (var xx = gx + 10 + rr; xx <= gx + bw - 10 - rr; xx += step) el('circle', { cx: xx, cy: yy, r: rr, fill: 'var(--amber-2)', 'fill-opacity': '.85', stroke: 'var(--cyan)', 'stroke-width': Math.max(1, 3 * f) }, gS);
      var tRel = f * f, vRel = (boxH / bh) / 0.55;
      b1.setAttribute('width', 300 * tRel); b2.setAttribute('width', Math.min(300, 300 * vRel / 2));
      setSvgText(v1, f >= 0.999 ? '1 (reference)' : '÷' + kts); setSvgText(v2, 'more: lower tap density');
      read.innerHTML = (f >= 0.999 ? 'Particles of the same size, coated, empty in the same time' : 'Particles ' + ks + ' times smaller empty about <b>' + kts + ' times faster</b>') + ' (t ≈ L²/2D), and a coating gives every one an electron contact. The price: the coated powder packs less densely, so the same mass of active material takes more room, and the energy per litre falls. How much more room is not a number the sources give; the lower bar is schematic.';
    }
    on(ss, 'input', render);
    steps(fig, [
      { text: 'Smaller particles: the ion has less far to go. The time to cross a particle scales with the <b>square</b> of its size, so a tenth of the size is about a hundredth of the time.' },
      { text: 'The cost: small, coated particles pack poorly, so the powder has a lower <b>tap density</b> and the electrode stores less energy per litre. Coating every particle evenly also gets harder as they shrink.' }
    ]);
    render();
  });

  /* ===== 8.5 How an electrode, and a cell, is made (after Fichtner et al. 2022, section 5.3) ===== */
  register('f8-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var st = [
      { t: 'mix', s: 'slurry', d: 'Active material (about 90 % of the dry mass), conductive carbon and a polymer binder are dispersed in a liquid to make a slurry: water for graphite, the organic solvent NMP for most positive electrodes. NMP is toxic to reproduction, and because it is costly and polluting it is recovered during drying; water-based and solvent-free routes are being developed.' },
      { t: 'coat', s: 'on foil', d: 'The slurry is spread in a thin, even layer on a metal foil, the current collector, in a roll-to-roll process.' },
      { t: 'dry', s: 'pores', d: 'As the solvent evaporates, a porous solid layer is left; drying under vacuum can take 12 to 24 hours at 120 °C, and the evaporated NMP is captured.' },
      { t: 'press', s: 'calender', d: 'The dried electrode is pressed between rollers (calendering) to make its thickness uniform, improve its electronic conductivity and raise its energy density, at the cost of some porosity.' },
      { t: 'cut', s: 'stack, wind', d: 'The rolls are slit and cut; strips are wound with a porous separator into a jelly roll for cylindrical and pouch cells; in pouch cells the electrodes can instead be Z-folded from a continuous sheet or cut into sheets and stacked, and the uncoated tabs are welded together.' },
      { t: 'fill', s: 'liquid in', d: 'The stack goes into its can or pouch, and the electrolyte is injected; a pouch keeps a spare gas bag.' },
      { t: 'form', s: '1st cycles', d: 'Formation: the cell is cycled under precisely defined conditions, for up to a day, to build the SEI (module 6); the gas it gives off is let out or cut off with the gas bag.' },
      { t: 'test', s: 'and wait', d: 'Capacity and resistance are measured, and the cell is stored for several days at open circuit to catch any that self-discharge too fast.' }
    ];
    var n = st.length, w = 56, gap = (520 - 24 - n * w) / (n - 1), y = 70;
    var boxes = st.map(function (s, i) {
      var x = 12 + i * (w + gap);
      var r = el('rect', { x: x, y: y, width: w, height: 56, rx: 8, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
      txt(g, x + w / 2, y + 25, s.t, 'strong', 'middle'); txt(g, x + w / 2, y + 41, s.s, '', 'middle');
      if (i < n - 1) arrow(g, x + w + 1, y + 28, x + w + gap - 2, y + 28, '#A3B6B1', 1.2);
      badge(g, x + w / 2, y - 18, i + 1);
      return r;
    });
    txt(g, 12, 34, 'electrode making', 'amber', 'start'); txt(g, 12 + 4 * (w + gap), 34, 'cell assembly', 'cyan', 'start'); txt(g, 12 + 6 * (w + gap), 34, 'cell finishing', 'heat', 'start');
    var token = el('circle', { r: 6, fill: 'var(--amber)' }, g), t = 0;
    var lab = txt(g, 260, 170, '', 'strong', 'middle');
    function show(k) { boxes.forEach(function (b, i) { b.setAttribute('stroke', i === k ? 'var(--amber)' : 'var(--line-2)'); b.setAttribute('stroke-width', i === k ? 2.2 : 1); }); setSvgText(lab, 'step ' + (k + 1) + ' of ' + n + ': ' + st[k].t + ' (' + st[k].s + ')'); }
    var S = steps(fig, st.map(function (s, i) { return { text: s.d, on: function () { show(i); } }; }));
    var loop = anim(fig, function (dt) { if (dt === 0) return; t = (t + dt / 16) % 1; var u = t * (n - 1), i = Math.floor(u), f = u - i; token.setAttribute('cx', 12 + w / 2 + (i + f) * (w + gap)); token.setAttribute('cy', y + 72); var k = Math.min(n - 1, Math.round(u)); if (S.k !== k) S.go(k); }, { autoplay: false, stepDt: 0.5 });
    token.setAttribute('cx', 12 + w / 2); token.setAttribute('cy', y + 72);
    read.innerHTML = 'The process chain of a lithium-ion cell, in three stages: making the electrodes, assembling the cell, and finishing it. The same chain applies, with variations, to most battery chemistries.';
    bind(fig, loop);
  });

  /* =================================================================
     Module 9: lithium metal, sodium and organic electrodes. Plating and
     dendrites after Winter and Brodd 2004 (R1) 2.5, Tarascon and Armand
     2001 (R2) Fig. 2a and Goodenough and Park 2013 (R6); volume changes
     after R6 and R2; conversion after R2; sodium after R6; the family
     map after R6 and R2.
     ================================================================= */

  /* ===== 9.1 Plating and stripping: lithium metal against graphite ===== */
  register('f9-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sepB = fig.querySelector('.solid-sep');
    var panels = [{ x: 20, name: 'lithium metal', sub: 'lithium plates back as metal' }, { x: 270, name: 'graphite', sub: 'lithium inserts between sheets' }];
    var W = 230, top = 50, bot = 230, ex = 70; // electrode occupies x .. x + ex
    var rough = [], NP = 40;
    panels.forEach(function (p, i) {
      txt(g, p.x + W / 2, top - 22, p.name, 'strong', 'middle'); txt(g, p.x + W / 2, top - 8, p.sub, '', 'middle');
      el('rect', { x: p.x, y: top, width: W, height: bot - top, rx: 4, fill: 'var(--cyan)', 'fill-opacity': '.08', stroke: 'var(--line-2)' }, g);
      p.sep = el('rect', { x: p.x + 150, y: top, width: 10, height: bot - top, fill: 'var(--cyan)', 'fill-opacity': '.3' }, g);
      txt(g, p.x + 155, bot + 16, 'separator', 'cyan', 'middle');
      if (i === 0) { el('rect', { x: p.x, y: top, width: ex - 20, height: bot - top, fill: 'var(--metal)' }, g); p.dep = el('path', { fill: 'var(--metal)', 'fill-opacity': '.9' }, g); }
      else { el('rect', { x: p.x, y: top, width: ex, height: bot - top, fill: 'var(--panel-2)' }, g); for (var k = 0; k < 8; k++) el('line', { x1: p.x + 4, x2: p.x + ex - 4, y1: top + 10 + k * 22, y2: top + 10 + k * 22, stroke: 'var(--text)', 'stroke-opacity': '.5', 'stroke-width': 2 }, g); p.fill = el('rect', { x: p.x, y: top, width: 0, height: bot - top, fill: 'var(--amber)', 'fill-opacity': '.25' }, g); }
    });
    for (var j = 0; j <= NP; j++) rough.push(0);
    var seed = 3; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var cyc = 0, ph = 0, solid = false;
    var cT = txt(g, 135, bot + 34, '', 'amber', 'middle'), gT = txt(g, 385, bot + 34, '', 'amber', 'middle'), stopT = txt(g, 135, top + 16, '', 'heat', 'middle');
    badge(g, 40, bot + 26, 1); badge(g, 290, bot + 26, 2); badge(g, 245, top - 14, 3);
    function depPath(level) { // level 0..1 of the plating half-cycle
      var p = panels[0], x0 = p.x + ex - 20, d = 'M' + x0 + ',' + top;
      for (var j = 0; j <= NP; j++) { var y = top + (bot - top) * j / NP, w = level * (6 + rough[j]); d += ' L' + (x0 + Math.min(w, solid ? 150 - (ex - 20) - 2 : 999)).toFixed(1) + ',' + y.toFixed(1); }
      return d + ' L' + x0 + ',' + bot + ' Z';
    }
    function render() {
      var level = ph < 0.5 ? ph * 2 : 2 - ph * 2; // up while charging, down while discharging
      panels[0].dep.setAttribute('d', depPath(Math.max(0.15, level)));
      panels[1].fill.setAttribute('width', ex * level);
      panels.forEach(function (p) { p.sep.setAttribute('fill-opacity', solid ? '.75' : '.3'); p.sep.setAttribute('fill', solid ? 'var(--text)' : 'var(--cyan)'); p.sep.setAttribute('fill-opacity', solid ? '.35' : '.3'); });
      var maxR = 0; rough.forEach(function (r) { maxR = Math.max(maxR, r); });
      var touch = !solid && (6 + maxR) > 150 - (ex - 20) - 2;
      setSvgText(cT, 'cycles: ' + cyc + (touch ? ', the deposit reaches the separator' : ''));
      setSvgText(gT, 'cycles: ' + cyc + ', surface unchanged');
      setSvgText(stopT, touch ? 'short-circuit risk' : '');
      setSvgText(sepB, solid ? 'Porous separator' : 'Solid separator');
      read.innerHTML = 'Left: each time lithium is plated back it lands unevenly; the deposit roughens cycle after cycle into a mossy, dendritic layer that grows toward the separator. ' + (solid ? 'A <b>solid separator</b> that blocks the growth stops it there.' : 'In 2004 Winter and Brodd put the cycle life of lithium-metal cells at about 100 to 150 cycles, against the 300 a commercial cell needs.') + ' Right: graphite takes the lithium in between its sheets and its surface stays the same.';
    }
    function tick(dt) {
      if (dt === 0) return;
      var was = ph; ph = (ph + dt / 3) % 1;
      if (ph < was) { cyc++; for (var j = 0; j <= NP; j++) { var nb = j > 0 ? rough[j - 1] : 0; rough[j] += rnd() < 0.18 ? 6 + rnd() * 10 : rnd() * 1.5; rough[j] = Math.min(140, rough[j] * (1 + 0.04 * (nb > rough[j] ? 1 : 0))); } }
      render();
    }
    on(sepB, 'click', function () { solid = !solid; render(); });
    steps(fig, [
      { text: 'Left, a <b>lithium-metal</b> negative electrode. On charge, lithium is not inserted anywhere: it is plated back onto the metal, and it lands unevenly. Cycle after cycle the surface turns rough, mossy and dendritic.' },
      { text: 'Right, <b>graphite</b>: the same lithium slips in between the carbon sheets and the surface does not change. In normal use the rocking-chair cell of module 6 sidesteps plating.' },
      { text: 'The deposit grows toward the separator; if it gets through, the electrodes touch. Press <b>Solid separator</b>: a separator that blocks the growth is one of the routes back to lithium metal.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    if (!motion) { for (var c = 0; c < 9; c++) { tick(1.5); tick(1.5); } ph = 0.5; }
    render(); bind(fig, loop);
  });

  /* ===== 9.2 Breathing electrodes ===== */
  register('f9-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), bb = fig.querySelector('.buffer');
    var mats = [{ x: 90, name: 'graphite', vol: null, note: 'small change' }, { x: 260, name: 'an alloy', vol: 2.0, note: 'up to +200 % volume' }, { x: 430, name: 'silicon', vol: 3.0, note: 'about +300 % volume' }];
    var r0 = 28, cy = 120, buffer = false, ph = 0, cyc = 0;
    mats.forEach(function (m, i) {
      txt(g, m.x, 30, m.name, 'strong', 'middle'); txt(g, m.x, 222, m.note, 'amber', 'middle');
      m.ghost = el('circle', { cx: m.x, cy: cy, r: r0, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' }, g);
      m.box = el('circle', { cx: m.x, cy: cy, r: r0 * 1.62, fill: 'var(--cyan)', 'fill-opacity': '0', stroke: 'var(--cyan)', 'stroke-width': 3, 'stroke-opacity': '0' }, g);
      m.p = el('circle', { cx: m.x, cy: cy, r: r0, fill: 'var(--amber-2)', 'fill-opacity': '.85' }, g);
      m.cr = el('path', { fill: 'none', stroke: 'var(--bg)', 'stroke-width': 2.4 }, g);
      m.carbon = el('circle', { cx: m.x - r0 - 10, cy: cy + 40, r: 9, fill: 'var(--cyan)' }, g);
      m.link = el('line', { stroke: 'var(--cyan)', 'stroke-width': 3 }, g);
      badge(g, m.x + 54, 40, i + 1);
    });
    txt(g, 260, 244, 'dashed circle: the particle before lithiation; teal: its carbon contact', '', 'middle');
    function render() {
      var s = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI); // 0 delithiated .. 1 lithiated
      mats.forEach(function (m) {
        var scale = m.vol ? Math.pow(1 + m.vol * s, 1 / 3) : 1 + 0.03 * s, r = r0 * scale; m.p.setAttribute('r', r);
        var cracked = m.vol === 3.0 && !buffer && cyc >= 1, lost = cracked && cyc >= 2;
        m.cr.setAttribute('d', cracked ? 'M' + (m.x - r * 0.7) + ',' + (cy - r * 0.3) + ' L' + (m.x - 4) + ',' + (cy + 2) + ' L' + (m.x + r * 0.6) + ',' + (cy - r * 0.5) + ' M' + (m.x - 3) + ',' + (cy + 2) + ' L' + (m.x + 2) + ',' + (cy + r * 0.85) : '');
        m.p.setAttribute('fill-opacity', lost ? '.35' : '.85');
        m.box.setAttribute('stroke-opacity', buffer && m.vol ? '.8' : '0'); m.box.setAttribute('fill-opacity', buffer && m.vol ? '.1' : '0');
        var cx = m.x - r0 - 10, cyy = cy + 40, ang = Math.atan2(cyy - cy, cx - m.x), ex = m.x + Math.cos(ang) * r, ey = cy + Math.sin(ang) * r;
        m.link.setAttribute('x1', cx); m.link.setAttribute('y1', cyy); m.link.setAttribute('x2', lost ? cx + 4 : ex); m.link.setAttribute('y2', lost ? cyy - 3 : ey);
        m.link.setAttribute('stroke-dasharray', lost ? '2 3' : '');
      });
      setSvgText(bb, buffer ? 'Remove the buffer' : 'Add a buffer matrix');
      read.innerHTML = 'Lithiated ' + Math.round(s * 100) + ' %, cycle ' + cyc + '. Graphite barely changes size; an alloy can swell by up to 200 % in volume and silicon by about 300 %. ' + (buffer ? 'With a <b>buffer matrix</b> around the particles the electrical pathway survives the swelling.' : (cyc >= 2 ? 'The silicon particle has <b>cracked and lost contact</b> with its carbon: it now stores nothing.' : 'Swelling and shrinking like this on every cycle cracks the particle.'));
    }
    function tick(dt) { if (dt === 0) return; var was = ph; ph = (ph + dt / 4) % 1; if (ph < was) cyc++; render(); }
    on(bb, 'click', function () { buffer = !buffer; cyc = 0; render(); });
    steps(fig, [
      { text: '<b>Graphite</b> takes up lithium with a small change of size, drawn here without a number because the sources give none.' },
      { text: 'An <b>alloy</b> of lithium with a metal such as tin or antimony stores more, but can swell by up to 200 % of its volume.' },
      { text: '<b>Silicon</b> swells by about 300 %. Repeated on every cycle, that cracks the particle and breaks its contact with the carbon: capacity lost. Press <b>Add a buffer matrix</b>: a matrix that takes up the strain keeps the electrical path.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    if (!motion) { cyc = 2; ph = 0.5; }
    render(); bind(fig, loop);
  });

  /* ===== 9.3 Conversion: the particle that comes apart and reforms ===== */
  register('f9-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var cx = 150, cy = 120, R = 70, ph = 0.25;
    var big = el('circle', { cx: cx, cy: cy, r: R, fill: 'var(--copper)', 'fill-opacity': '.8' }, g);
    var mat = el('circle', { cx: cx, cy: cy, r: R, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    var nps = []; for (var i = 0; i < 26; i++) { var a = i * 2.4, rr = R * Math.sqrt((i + 0.5) / 26) * 0.9; nps.push(el('circle', { cx: cx + Math.cos(a) * rr, cy: cy + Math.sin(a) * rr, r: 5, fill: 'var(--metal)' }, g)); }
    var lbl = txt(g, cx, cy + R + 22, '', 'strong', 'middle');
    txt(g, 312, 40, 'capacity against graphite', 'strong', 'start');
    el('rect', { x: 330, y: 60, width: 60, height: 18, fill: 'var(--text)', 'fill-opacity': '.5' }, g); txt(g, 396, 74, 'graphite: 1×', '', 'start');
    el('rect', { x: 330, y: 90, width: 120, height: 18, fill: 'var(--copper)', 'fill-opacity': '.8' }, g); el('rect', { x: 450, y: 90, width: 60, height: 18, fill: 'var(--copper)', 'fill-opacity': '.35' }, g);
    txt(g, 312, 126, 'oxides: two to three times', '', 'start');
    var eq = txt(g, 312, 170, '', 'amber', 'start'), eq2 = txt(g, 312, 188, '', '', 'start');
    badge(g, cx - R - 4, cy - R + 6, 1); badge(g, 316, 99, 2);
    function render() {
      var s = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI); // 0 oxide .. 1 fully converted
      big.setAttribute('fill-opacity', String(0.8 * (1 - s))); mat.setAttribute('fill-opacity', String(s));
      nps.forEach(function (n) { n.setAttribute('fill-opacity', String(s)); });
      setSvgText(lbl, s > 0.5 ? 'metal nanoparticles in Li₂O' : 'metal oxide particle');
      setSvgText(eq, s > 0.5 ? 'lithium in: oxide + Li → M + Li₂O' : 'lithium out: M + Li₂O → oxide + Li');
      setSvgText(eq2, 'the oxide reforms as lithium leaves');
      read.innerHTML = s > 0.5 ? 'Lithiated: the oxide has been <b>converted</b> into metal nanoparticles embedded in Li₂O. No host survives; the particle is rebuilt.' : 'Delithiated: the metal and the Li₂O react back and the oxide forms again.';
    }
    steps(fig, [
      { text: 'A <b>conversion</b> electrode is not a host. As lithium goes in, the metal oxide reacts with it and falls apart into tiny metal particles embedded in Li₂O; as lithium comes out, the oxide forms again.' },
      { text: 'Working this way, such oxides store <b>two to three times</b> the capacity of carbon.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph = (ph + dt / 8) % 1; render(); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) ph = 0.5;
    render(); bind(fig, loop);
  });

  /* ===== 9.4 The family of electrode materials ===== */
  register('f9-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var Y = function (v) { return 266 - v / 5 * 236; };
    el('line', { x1: 60, x2: 60, y1: Y(0), y2: Y(5), stroke: 'var(--line-2)' }, g);
    [0, 1, 2, 3, 4, 5].forEach(function (v) { el('line', { x1: 56, x2: 60, y1: Y(v), y2: Y(v), stroke: 'var(--line-2)' }, g); txt(g, 52, Y(v) + 4, v + ' V', '', 'end'); });
    txt(g, 60, Y(5) - 12, 'V vs Li/Li⁺', '', 'middle');
    var fam = [
      { k: 'metal', x: 110, name: 'metal', col: 'var(--metal)', items: [{ v: 0, n: 'lithium' }], txt: 'Lithium metal itself, at 0 V by definition: the highest energy of all negative electrodes, held back by plating and dendrites (figure 9.1).' },
      { k: 'ins', x: 190, name: 'insertion', col: 'var(--amber)', items: [{ v: 0.2, n: 'graphite' }, { v: 1.5, n: 'Li titanate' }, { v: 2.2, n: 'TiS₂' }, { v: 3.5, n: 'LiFePO₄' }, { v: 4.0, n: 'LiCoO₂' }, { v: 4.75, n: 'LiNi₀.₅Mn₁.₅O₄' }], txt: 'Insertion hosts on both sides of today’s cells: graphite near 0.2 V, lithium titanate at 1.5 V, TiS₂ at about 2.2 V, LiFePO₄ at 3.5 V, LiCoO₂ near 4 V and LiNi₀.₅Mn₁.₅O₄ near 4.75 V.' },
      { k: 'alloy', x: 280, name: 'alloy', col: '#C4B5F7', items: [{ v: 0.2, v2: 0.8, n: 'Si, Sn, Sb' }], txt: 'Alloys of lithium with silicon, tin or antimony, at 0.2 to 0.8 V: more capacity than graphite, paid for in swelling (figure 9.2).' },
      { k: 'conv', x: 360, name: 'conversion', col: 'var(--copper)', items: [{ v: 2.4, n: 'sulfur' }], foot: '+ metal oxides', txt: 'Conversion electrodes are rebuilt on every cycle: sulfur at 2.4 V, and the metal oxides of figure 9.3, two to three times the capacity of carbon. The sources cited here give no voltage for the oxides, so they are listed under the axis rather than placed on it.' },
      { k: 'org', x: 450, name: 'organic', col: 'var(--cyan)', items: [{ v: null, v2: 3.0, n: 'disulfides' }], txt: 'Organic disulfides, whose S–S bonds break into thiolates and reform reversibly, up to 3 V; held back by their solubility in the electrolyte and by self-discharge.' }
    ];
    fam.forEach(function (f, i) {
      txt(g, f.x, 22, f.name, 'strong', 'middle');
      f.items.forEach(function (it, j) {
        if (it.v === null && it.v2 === undefined) { el('rect', { x: f.x - 34, y: Y(3.2), width: 68, height: Y(0.9) - Y(3.2), rx: 6, fill: f.col, 'fill-opacity': '.12', stroke: f.col, 'stroke-dasharray': '4 4' }, g); txt(g, f.x, Y(2.05), it.n, '', 'middle'); txt(g, f.x, Y(2.05) + 15, 'no voltage given', '', 'middle'); return; }
        if (it.v === null) { el('line', { x1: f.x - 20, x2: f.x + 20, y1: Y(it.v2), y2: Y(it.v2), stroke: f.col, 'stroke-width': 3, 'stroke-dasharray': '4 3' }, g); txt(g, f.x, Y(it.v2) - 8, it.n, '', 'middle'); txt(g, f.x, Y(it.v2) + 16, 'up to 3 V', '', 'middle'); return; }
        if (it.v2 !== undefined) { el('rect', { x: f.x - 14, y: Y(it.v2), width: 28, height: Y(it.v) - Y(it.v2), rx: 4, fill: f.col, 'fill-opacity': '.6' }, g); txt(g, f.x + 20, Y((it.v + it.v2) / 2) + 4, it.n, '', 'start'); return; }
        el('circle', { cx: f.x, cy: Y(it.v), r: 6, fill: f.col }, g);
        txt(g, f.x + 10, Y(it.v) + 4 + (it.n === 'graphite' ? 4 : 0), it.n, '', 'start');
      });
      if (f.foot) txt(g, f.x, Y(0) + 26, f.foot, '', 'middle');
      badge(g, f.x, Y(0) + 50, i + 1);
    });
    steps(fig, fam.map(function (f) { return { text: f.txt }; }));
    read.innerHTML = 'Five families of electrode, placed where the sources put them on the lithium scale. Low on the axis makes a good negative electrode, high a good positive one; the cell voltage is the gap you choose (module 3).';
  });

  /* ===== 9.5 Sodium is bigger ===== */
  register('f9-5', function (fig) {
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
