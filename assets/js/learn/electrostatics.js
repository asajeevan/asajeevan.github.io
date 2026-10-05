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

  /* figs-0.js */
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
      { text: 'The cell holds its two terminals a fixed <b>potential difference</b> V apart (chapter 1 shows how). On the strip, φ rises by V inside the cell. 1 V means 1 joule for every coulomb moved between the terminals.' },
      { text: 'Along the wire and through the lamp the potential <b>falls</b>. A current can only flow through a resistance if there is a potential difference to drive it: <b>V = I R</b>, Ohm’s law. Turn R up and the current drops.' },
      { text: 'Electrons (pale dots) leave the <b>−</b> terminal and travel through the wire to the <b>+</b> terminal: the force on a negative charge points against the field, up the potential hill. The lamp brightens with the power, P = I V.' },
      { text: 'Current is <b>charge per second</b>: 1 A is 1 C/s, about 6 × 10¹⁸ electrons a second. Open the switch and the slope vanishes: no current, one potential along each wire, the whole V across the gap.' }
    ]);
    render();
    bind(fig, { start: function () { if (closed) ef.start(); }, stop: ef.stop });
  });
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
