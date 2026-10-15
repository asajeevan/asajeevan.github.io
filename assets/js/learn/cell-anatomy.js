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
    el('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: 4, fill: 'rgba(20,23,28,.025)', stroke: 'var(--line)' }, g);
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
    equations: 'Equations: every “Go deeper” panel and the mathematics of each chapter are now open and outlined in green.' + (document.getElementById('maths') ? ' <a href="#maths">Jump to the mathematics of this chapter</a>.' : '')
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

  /* ---------- materials: what the parts of a real cell look like ----------
     Each physical part is drawn in its own colour (copper foil copper, aluminium foil silver,
     graphite and the oxide powders black-grey, LiFePO4 grey, Li4Ti5O12 white, sulfur yellow,
     the electrolyte clear, the separator white). Ions, electrons, fields and curves keep the
     teaching colours, because they have no colour of their own. One hidden <svg> holds the
     shared gradients: M(key) a sheet lit from the left, MV(key) lit from the top, MB(key) a
     sphere lit from the upper left, MC(key) the plain colour. */
  var MAT = {
    copper:      ['#B87333', '#E8AC7C', '#C47D46', '#8F4F26', '#B46E3A'],
    alu:         ['#C3C9CF', '#F4F6F8', '#CED4DA', '#A6AEB7', '#D8DDE2'],
    steel:       ['#AEB6BE', '#EDF0F3', '#BBC2CA', '#8B95A0', '#C6CDD4'],
    lithium:     ['#C8CDD3', '#F7F8FA', '#D4D9DE', '#AAB1B9', '#DEE2E6'],
    zinc:        ['#A6B0BA', '#E4E9EE', '#B2BCC6', '#87929E', '#BFC7CF'],
    graphite:    ['#3A3E44', '#61666E', '#3B3F45', '#232629', '#484D54'],
    silicon:     ['#58626F', '#8994A2', '#5B6573', '#3B434E', '#68727F'],
    lco:         ['#2F3339', '#5A6068', '#31363C', '#1C1F23', '#3D424A'],
    lfp:         ['#4C5156', '#7A8086', '#4F5459', '#33373B', '#5C6167'],
    lto:         ['#E9E7E1', '#FBFAF7', '#ECEAE4', '#CFCBC1', '#F1EFEA'],
    tis2:        ['#A98A3E', '#DCC07A', '#AF8F42', '#7C6427', '#B99B50'],
    sulfur:      ['#E2BC2B', '#F7E27B', '#E5C031', '#B88F12', '#EBCB45'],
    carbon:      ['#1F2124', '#4A4E54', '#232528', '#111214', '#2C2F33'],
    binder:      ['#ECEBE6', '#FFFFFF', '#EFEEE9', '#D3D1CA', '#F4F3EF'],
    separator:   ['#F1F2EE', '#FFFFFF', '#F3F4F0', '#DADCD5', '#F7F7F4'],
    electrolyte: ['#E6F0F6', '#F7FBFD', '#E8F2F7', '#CFE0EA', '#EEF5F9'],
    cuso4:       ['#8EBEE6', '#C4DEF3', '#93C2E8', '#5E97C8', '#A6CCEC'],
    sei:         ['#97773F', '#C9A86A', '#9B7B43', '#6D5428', '#A8884F'],
    ceramic:     ['#E8E4DA', '#FAF8F3', '#EBE7DE', '#CBC5B6', '#F0EDE6'],
    polymer:     ['#EEEBE2', '#FDFCF8', '#F0EDE5', '#D6D1C4', '#F4F2EB'],
    oxide:       ['#7F8A99', '#B7BFCA', '#848F9D', '#5D6774', '#929CA9'],
    hematite:    ['#7E3527', '#B0604C', '#83392B', '#55221A', '#8F4636'],
    iron:        ['#5E6368', '#969BA1', '#63686D', '#3F4246', '#71767B'],
    li2o:        ['#ECEAE5', '#FFFFFF', '#EEECE7', '#D3D0C8', '#F4F3EF'],
    go:          ['#4A3D31', '#76675A', '#4E4135', '#2F261E', '#5A4C40'],
    silver:      ['#C9CDD2', '#F5F6F7', '#D3D6DA', '#A3A8AE', '#DDE0E3'],
    lead:        ['#6B7178', '#9CA2A8', '#70767D', '#4E535A', '#7E848A'],
    pbo2:        ['#3E2E25', '#6A5446', '#43322A', '#281D17', '#4E3B31']
  };
  var RUNG_MAT = { li: 'lithium', gr: 'graphite', alloy: 'silicon', lto: 'lto', tis2: 'tis2', s: 'sulfur', lfp: 'lfp', lco: 'lco', lnmo: 'lco' };
  function MC(k) { return (MAT[k] || MAT.steel)[0]; }
  function M(k) { return 'url(#m-' + (MAT[k] ? k : 'steel') + ')'; }
  function MV(k) { return 'url(#mv-' + (MAT[k] ? k : 'steel') + ')'; }
  function MB(k) { return 'url(#mb-' + (MAT[k] ? k : 'steel') + ')'; }
  function rungMat(key) { return RUNG_MAT[key] || 'lco'; }
  /* an upright cylindrical cell (steel can, printed wrap, the + nub on top) at x, y, w wide, h tall */
  function cellCan(parent, x, y, w, h) {
    var s = el('g', {}, parent);
    el('rect', { x: x + w * 0.32, y: y - 5, width: w * 0.36, height: 7, rx: 2, fill: M('steel'), stroke: '#8B95A0', 'stroke-width': 0.8 }, s);
    el('rect', { x: x, y: y, width: w, height: h, rx: 5, fill: M('steel'), stroke: '#8B95A0', 'stroke-width': 0.8, filter: 'url(#fx-lift)' }, s);
    el('rect', { x: x, y: y + h * 0.16, width: w, height: h * 0.68, fill: M('lco') }, s);
    el('rect', { x: x + w * 0.14, y: y + h * 0.16, width: w * 0.1, height: h * 0.68, fill: '#fff', opacity: 0.16 }, s);
    return s;
  }
  /* a glass beaker or tank: liquid inside, a thin glass outline and a highlight */
  function tank(parent, x, y, w, h, liquid, rx) {
    var s = el('g', {}, parent);
    el('rect', { x: x, y: y, width: w, height: h, rx: rx === undefined ? 8 : rx, fill: liquid ? MV(liquid) : 'none', stroke: '#9FB3C2', 'stroke-width': 1.4 }, s);
    el('rect', { x: x + 6, y: y + 8, width: 3, height: h - 16, rx: 1.5, fill: '#fff', opacity: 0.55 }, s);
    return s;
  }
  (function () {
    var host = document.createElementNS(NS, 'svg');
    host.setAttribute('aria-hidden', 'true'); host.setAttribute('focusable', 'false');
    host.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    var defs = el('defs', {}, host);
    Object.keys(MAT).forEach(function (k) {
      var c = MAT[k];
      [['m-', { x1: 0, y1: 0, x2: 1, y2: 0 }], ['mv-', { x1: 0, y1: 0, x2: 0, y2: 1 }]].forEach(function (d) {
        var lg = el('linearGradient', Object.assign({ id: d[0] + k }, d[1]), defs);
        [[0, c[2]], [0.18, c[1]], [0.55, c[2]], [0.85, c[3]], [1, c[4]]].forEach(function (st) { el('stop', { offset: st[0], 'stop-color': st[1] }, lg); });
      });
      var rg = el('radialGradient', { id: 'mb-' + k, cx: 0.36, cy: 0.32, r: 0.75, fx: 0.32, fy: 0.26 }, defs);
      [[0, c[1]], [0.45, c[2]], [1, c[3]]].forEach(function (st) { el('stop', { offset: st[0], 'stop-color': st[1] }, rg); });
    });
    // a soft contact shadow for objects that stand on the page
    var f = el('filter', { id: 'fx-lift', x: '-20%', y: '-20%', width: '140%', height: '150%' }, defs);
    el('feDropShadow', { dx: 0, dy: 1.2, stdDeviation: 1.4, 'flood-color': '#101828', 'flood-opacity': 0.22 }, f);
    (document.body || document.documentElement).appendChild(host);
  })();

  /* ---------- figure registry ---------- */
  var figs = {};
  var loops = []; // {fig, loop}
  function register(id, fn) { figs[id] = fn; }
  function bind(fig, loop) { if (loop) loops.push({ fig: fig, loop: loop }); }

  /* figs-2.js */
  register('f2-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), info = fig.querySelector('.part-info'), range = fig.querySelector('input[type=range]');
    var cx = 250, W = 270, x0 = cx - W / 2, x1 = cx + W / 2;
    // top view: a small disc to say "round"
    el('circle', { cx: 56, cy: 60, r: 30, fill: MB('steel'), stroke: '#8B95A0', filter: 'url(#fx-lift)' }, g); el('circle', { cx: 56, cy: 60, r: 24, fill: 'none', stroke: '#9AA3AD' }, g);
    txt(g, 56, 64, '−', 'strong big', 'middle'); txt(g, 56, 106, 'top view: cap (−)', '', 'middle'); txt(g, 56, 120, '20 mm across', '', 'middle');
    txt(g, cx + 30, 24, 'a coin cell in cross-section, pulled apart (not to scale)', 'strong', 'middle');
    // layers, from the bottom up; y = resting position, h = thickness, k = explode order
    var layers = [
      { key: 'can', name: 'Can, aluminium-coated (+ terminal)', y: 216, h: 14, w: W, fill: MV('steel'), desc: 'Stainless-steel can with an aluminium coating on the inside: the container and the positive terminal. The positive electrode sits directly on it.' },
      { key: 'pos', name: 'Positive electrode', y: 202, h: 14, w: 200, fill: M('lco'), desc: 'A coating of the positive active material (LiCoO₂ in the first commercial cell, a nickel-rich oxide in today’s research cells) on an aluminium surface. On discharge it takes the electrons: the electron acceptor.' },
      { key: 'sep', name: 'Separator, soaked with electrolyte', y: 194, h: 8, w: 230, fill: M('separator'), desc: 'A porous polymer film, two layers of it in this design, full of electrolyte: permeable to ions, inert, and a physical barrier that prevents electrical shorting. If the electrodes touched, the full stored energy would be released as heat inside the cell (their section 2.2).' },
      { key: 'neg', name: 'Negative electrode', y: 180, h: 14, w: 200, fill: M('graphite'), desc: 'Graphite coated on copper foil, as in the first commercial lithium-ion cell. On discharge it gives up electrons: the reducing agent.' },
      { key: 'spacer', name: 'Spacer, stainless steel', y: 168, h: 12, w: 220, fill: MV('steel'), desc: 'A steel disc that fills the height so that the stack is pressed evenly.' },
      { key: 'spring', name: 'Spring, stainless steel', y: 152, h: 18, w: 140, fill: 'none', desc: 'A wave spring that presses the stack together so every layer stays in contact. Dropping the spring and spacer in from an angle misaligns the electrodes and can cost a fifth of the capacity in 100 cycles; placing them from directly above with a vacuum pen fixes it.' },
      { key: 'cap', name: 'Cap and gasket (− terminal)', y: 136, h: 14, w: W, fill: MV('steel'), desc: 'Stainless-steel cap, the negative terminal, crimped onto the can with a polymer gasket between them: the gasket seals the cell and keeps the two terminals from touching.' }
    ];
    var groups = {};
    layers.forEach(function (L, i) {
      var grp = el('g', { 'class': 'layer', 'data-part': L.key, tabindex: '0', role: 'button', 'aria-label': L.name }, g);
      var lx = cx - L.w / 2;
      if (L.key === 'can') { el('path', { 'class': 'shape', d: 'M' + x0 + ',' + (L.y - 60) + ' V' + (L.y + L.h - 6) + ' q0,6 6,6 H' + (x1 - 6) + ' q6,0 6,-6 V' + (L.y - 60) + ' h-8 V' + (L.y - 2) + ' H' + (x0 + 8) + ' V' + (L.y - 60) + ' Z', fill: L.fill, stroke: 'var(--line-2)' }, grp); el('rect', { x: x0 + 8, y: L.y - 2, width: W - 16, height: 3, fill: '#B4BDC6' }, grp); }
      else if (L.key === 'cap') { el('path', { 'class': 'shape', d: 'M' + (x0 + 14) + ',' + (L.y + 46) + ' V' + (L.y + 6) + ' q0,-6 6,-6 H' + (x1 - 20) + ' q6,0 6,6 V' + (L.y + 46) + ' h-8 V' + (L.y + 10) + ' H' + (x0 + 22) + ' V' + (L.y + 46) + ' Z', fill: L.fill, stroke: 'var(--line-2)' }, grp); el('rect', { x: x0 + 8, y: L.y + 12, width: 8, height: 40, rx: 2, fill: '#2B2E33' }, grp); el('rect', { x: x1 - 16, y: L.y + 12, width: 8, height: 40, rx: 2, fill: '#2B2E33' }, grp); }
      else if (L.key === 'spring') { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, fill: 'transparent', stroke: 'transparent' }, grp); el('path', { d: 'M' + lx + ',' + (L.y + L.h - 2) + ' l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14', fill: 'none', stroke: '#9fb1b6', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, grp); }
      else if (L.key === 'sep') { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, rx: 2, fill: L.fill, stroke: '#C4C8BF' }, grp); for (var k = 0; k < 26; k++) el('circle', { cx: lx + 6 + k * 8.8, cy: L.y + 4, r: 1.6, fill: '#A9CBE0' }, grp); }
      else { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, rx: 2, fill: L.fill, stroke: 'var(--line-2)' }, grp);
        if (L.key === 'neg') { el('rect', { x: lx, y: L.y, width: L.w, height: 3, fill: MV('copper') }, grp); for (var q = 0; q < 12; q++) el('circle', { cx: lx + 10 + q * 17, cy: L.y + 9, r: 1.8, fill: '#A9CBE0' }, grp); }
        if (L.key === 'pos') { el('rect', { x: lx, y: L.y + L.h - 3, width: L.w, height: 3, fill: MV('alu') }, grp); for (var q2 = 0; q2 < 12; q2++) el('circle', { cx: lx + 10 + q2 * 17, cy: L.y + 6, r: 1.8, fill: '#A9CBE0' }, grp); }
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
      { text: 'The <b>electrolyte</b> is a liquid: drops of 1 M LiPF₆ in a carbonate solvent, about 38 mg in a research coin cell, soak the separator and fill the pores of both electrodes (pale blue dots). It is the ion road of chapter 1.', on: function () { pick(layers[2]); } },
      { text: 'The <b>spacer</b> and <b>spring</b> press the stack so every layer touches the next; a stack placed slightly askew loses capacity to lithium plating at the uncovered edge.', on: function () { pick(layers[5]); } },
      { text: 'The <b>can</b> is the + terminal and the <b>cap</b> the − terminal; the gasket between them seals the cell and keeps them apart. The whole cell voltage appears between these two pieces of steel.', on: function () { pick(layers[6]); } },
      { text: 'The strip from chapter 1, now in the coin cell: the potential jumps at the two electrode|electrolyte boundaries and is flat through the soaked separator at open circuit. The can sits V above the cap.' }
    ]);
    explode(+range.value / 100); pick(layers[3]);
  });
  register('f2-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), wind = fig.querySelector('.wind'), read = fig.querySelector('.readout');
    var cols = [MC('copper'), '#4A4F57', '#D5D9D0', '#23272D', MC('alu')], widths = [3, 8, 4, 8, 3], names = ['copper foil (collector)', 'graphite', 'separator + electrolyte', 'LiCoO₂', 'aluminium foil (collector)'];
    var N = 200, turns = 2.2, xL = 40, xR = 330, yMid = 150, L = xR - xL, pitch = 2.2;
    var offs = [-13, -7, 0, 7, 13];
    var body = el('g', {}, g);
    var paths = cols.map(function (c, i) { return el('path', { fill: 'none', stroke: c, 'stroke-width': widths[i], 'stroke-linecap': 'round', 'class': 'spiral' }, body); });
    var labG = el('g', {}, g);
    var labY = [70, 100, 200, 230, 260];
    var labs = names.map(function (n, i) { var y = labY[i]; el('line', { x1: 120 + i * 40, y1: yMid + offs[i], x2: 120 + i * 40, y2: y + (y < yMid ? 4 : -12), stroke: 'var(--line-2)' }, labG); return txt(labG, 120 + i * 40, y, n, '', 'middle'); });
    var dimA = el('g', {}, g); arrow(dimA, xL, 40, xR, 40, 'var(--muted)', 1.2); arrow(dimA, xR, 40, xL, 40, 'var(--muted)', 1.2); txt(dimA, (xL + xR) / 2, 30, 'large area: the whole strip faces the other electrode', '', 'middle');
    var dimT = el('g', {}, g); el('path', { d: 'M' + (xR + 10) + ',' + (yMid - 3) + ' h6 v6 h-6', fill: 'none', stroke: 'var(--second)' }, dimT); txt(dimT, xR + 22, yMid + 4, 'thin electrolyte', 'cyan');
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
  register('f2-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 60, x1 = 460, yTop = 40, yCol = 232;
    el('rect', { x: x0, y: yTop, width: x1 - x0, height: yCol - yTop, fill: MV('electrolyte'), stroke: '#B7CCDA' }, g); // pores: electrolyte
    el('rect', { x: x0, y: yCol, width: x1 - x0, height: 12, fill: MV('alu'), stroke: '#9CA4AD', 'stroke-width': .6 }, g); txt(g, 260, yCol + 26, 'current collector (aluminium foil)', '', 'middle');
    txt(g, 260, yTop - 24, 'separator side: Li⁺ arrive from here', 'cyan', 'middle');
    // particles: irregular polygons
    var parts = [[110, 90], [190, 70], [280, 84], [370, 72], [430, 120], [120, 170], [210, 150], [300, 160], [390, 168], [160, 214], [250, 212], [340, 218], [420, 212]];
    var pg = el('g', { fill: MB('lco'), stroke: '#15181B', 'stroke-opacity': '.6', filter: 'url(#fx-lift)' }, g);
    parts.forEach(function (c, i) { var d = '', n = 7, R = 24 + (i % 3) * 4; for (var k = 0; k < n; k++) { var a = k / n * 2 * Math.PI + i, r = R * (0.8 + 0.25 * Math.sin(3 * a + i)); d += (k ? ' L' : 'M') + (c[0] + r * Math.cos(a)).toFixed(1) + ',' + (c[1] + r * Math.sin(a)).toFixed(1); } el('path', { d: d + ' Z' }, pg); });
    // binder: short polymer strands at contacts
    var bg = el('g', { fill: 'none', stroke: '#A9A497', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g);
    [[150, 96], [236, 80], [326, 78], [398, 96], [166, 190], [256, 186], [346, 190], [126, 130], [210, 112], [296, 122], [380, 120], [206, 232], [296, 232], [384, 232]].forEach(function (p) { el('path', { d: 'M' + (p[0] - 8) + ',' + p[1] + ' q4,-6 8,0 t8,0' }, bg); });
    // carbon network: dots along a connected path down to the collector
    var carbon = 'M96,232 C96,200 110,196 120,150 C126,126 150,118 190,100 C220,86 250,96 280,110 C300,120 310,150 300,186 C296,206 320,224 340,232 M190,100 C200,130 190,160 210,180 C224,196 240,210 250,232 M280,110 C320,96 350,96 370,100 C400,106 420,140 430,150 C440,170 424,200 420,232';
    var cpath = el('path', { d: carbon, fill: 'none', stroke: MC('carbon'), 'stroke-width': 3.6, 'stroke-dasharray': '0.1 4.6', 'stroke-linecap': 'round' }, g);
    // roads to one particle (the one at 300,160): electrons up the carbon from the collector, Li+ down through the pores
    var ePath = el('path', { d: 'M340,232 C320,224 296,206 300,186 L300,170', fill: 'none', stroke: 'none' }, g);
    var ionPath = el('path', { d: 'M330,44 C336,66 350,100 330,120 C318,132 310,140 304,150', fill: 'none', stroke: 'var(--second)', 'stroke-opacity': '.4', 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    var ef = flow(svg, ePath, { n: 4, cls: 'e-dot', r: 2.6, speed: 40, parent: g });
    var ionf = flow(svg, ionPath, { n: 1, cls: 'ion our-ion', r: 4, speed: 34, parent: g });
    var ourT = txt(g, 0, 0, 'our ion', 'amber', 'start');
    txt(g, 300, 164, 'reacts here', 'strong tag', 'middle');
    badge(g, 40, 90, 1); badge(g, 40, 232, 2); badge(g, 480, 50, 3); badge(g, 480, 190, 4);
    var t = 0;
    function tick(dt) { if (dt === 0) return; t += dt; ef.advance(dt); ionf.advance(dt); var c = ionf.group.querySelector('circle'); ourT.setAttribute('x', +c.getAttribute('cx') + 8); ourT.setAttribute('y', +c.getAttribute('cy') + 4); }
    ef.show(true); ionf.show(true); ef.group.classList.remove('anim-only'); ionf.group.classList.remove('anim-only');
    read.innerHTML = 'A coating, not a block: active particles (dark grey), a network of conductive carbon (black dots) that reaches every particle from the foil, a polymer binder (short pale strands) holding it all together, and pores, about 30 % of the volume, filled with electrolyte (pale blue).';
    steps(fig, [
      { text: 'The <b>active particles</b> (dark grey) are the material that stores the lithium. They are irregular grains, not a solid slab.' },
      { text: 'The <b>carbon network</b> (black dots) links every particle to the collector: the electron road. Electrons arrive along it from the foil.' },
      { text: 'The <b>pores</b> (pale blue, about 30 % of the volume) are filled with electrolyte: the ion road. Our ion comes in from the separator side and reaches the same particle.' },
      { text: 'The <b>binder</b> (short pale strands) holds the mixture together and bonds it to the foil. A particle can react only where both roads reach it; a later module returns to what happens where one of them does not.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.3 });
    bind(fig, loop);
  });
  register('f2-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), fb = fig.querySelectorAll('button[data-fmt]');
    var cells = el('g', {}, g), dec = el('g', {}, g), rings = {};
    var X = { coin: 70, cyl: 190, prism: 320, pouch: 448 }, base = 146;
    function ring(k, x, w, h) { rings[k] = el('rect', { x: x - w / 2 - 8, y: base - h - 14, width: w + 16, height: h + 22, rx: 8, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-opacity': 0 }, cells); }
    // coin: top view and a thin side view
    (function () {
      var x = X.coin, r = 34, cy = base - 58;
      ring('coin', x, 76, 104);
      el('circle', { cx: x, cy: cy, r: r, fill: MB('steel'), stroke: '#8B95A0', filter: 'url(#fx-lift)' }, cells);
      el('circle', { cx: x, cy: cy, r: r - 6, fill: 'none', stroke: '#8B95A0', 'stroke-width': .8 }, cells);
      txt(cells, x, cy + 5, '+', 'strong', 'middle');
      el('rect', { x: x - r, y: base - 12, width: 2 * r, height: 6, rx: 2, fill: MV('steel'), stroke: '#8B95A0', 'stroke-width': .6 }, cells);
      el('rect', { x: x - r + 3, y: base - 15, width: 2 * r - 6, height: 3, rx: 1, fill: '#2B2E33' }, cells);
    })();
    // cylindrical: steel can with printed wrap
    ring('cyl', X.cyl, 40, 112); cellCan(cells, X.cyl - 20, base - 104, 40, 104);
    // prismatic: aluminium case, two terminals and a vent
    (function () {
      var x = X.prism, w = 74, h = 96, y = base - h;
      ring('prism', x, w, h + 8);
      el('rect', { x: x - w / 2, y: y, width: w, height: h, rx: 4, fill: M('alu'), stroke: '#A6AEB7', filter: 'url(#fx-lift)' }, cells);
      el('rect', { x: x - w / 2 + 6, y: y + 4, width: 6, height: h - 8, rx: 3, fill: '#fff', opacity: .35 }, cells);
      el('rect', { x: x - 26, y: y - 7, width: 12, height: 7, rx: 1.5, fill: M('alu'), stroke: '#A6AEB7' }, cells);
      el('rect', { x: x + 14, y: y - 7, width: 12, height: 7, rx: 1.5, fill: M('copper'), stroke: '#8F4F26' }, cells);
      el('ellipse', { cx: x, cy: y + 10, rx: 7, ry: 4, fill: '#C7CDD3', stroke: '#8B95A0', 'stroke-width': .8 }, cells);
    })();
    // pouch: silvery laminate, sealed rim, two tabs
    (function () {
      var x = X.pouch, w = 76, h = 92, y = base - h;
      ring('pouch', x, w, h + 12);
      el('rect', { x: x - w / 2, y: y, width: w, height: h, rx: 3, fill: MV('alu'), stroke: '#A6AEB7', filter: 'url(#fx-lift)' }, cells);
      el('rect', { x: x - w / 2 + 6, y: y + 6, width: w - 12, height: h - 12, rx: 3, fill: M('alu'), stroke: '#B9C0C7', 'stroke-width': .8 }, cells);
      el('rect', { x: x - 24, y: y - 12, width: 12, height: 14, fill: M('alu'), stroke: '#A6AEB7', 'stroke-width': .6 }, cells);
      el('rect', { x: x + 12, y: y - 12, width: 12, height: 14, fill: M('copper'), stroke: '#8F4F26', 'stroke-width': .6 }, cells);
    })();
    [['coin', 'coin'], ['cyl', 'cylindrical'], ['prism', 'prismatic'], ['pouch', 'pouch']].forEach(function (k) { txt(cells, X[k[0]], base + 18, k[1], 'strong', 'middle'); });
    el('line', { x1: 16, x2: 504, y1: base + 30, y2: base + 30, stroke: 'var(--line-2)' }, g);
    var INFO = {
      coin: { code: [['C', 'a lithium', 'chemistry'], ['R', 'round', ''], ['20', '20 mm', 'across'], ['25', '2.5 mm', 'high']], t: '<b>Coin cell.</b> A flat stainless-steel case, wider than it is high, with a gasket, a cap, a spacer plate and a spring; in the laboratory its negative electrode is often lithium foil. Its name is standardized by the IEC: CR2025 is the most common design at laboratory scale.' },
      cyl: { note: ['18650, 21700, 26650 …', 'five digits that give the size'], t: '<b>Cylindrical cell.</b> Electrodes and separator wound in a spiral inside a cylindrical case: good cycling stability, but round cells pack less densely. A 2026 review reports cylindrical 18650 cells as particularly susceptible to damage by vibration.' },
      prism: { code: [['50', '5.0 mm', 'thick'], ['40', '40 mm', 'wide'], ['50', '50 mm', 'long']], t: '<b>Prismatic cell.</b> Large stacked sheets in a rectangular case of aluminium, steel or semi-hard plastic, usually with a vent; suits uses where swelling matters. Its six digits give the thickness in tenths of a millimetre, then the width and the length in millimetres.' },
      pouch: { note: ['stacked layers in a sealed, flexible foil', 'light and cheap to make'], t: '<b>Pouch cell.</b> Electrodes and separator stacked, not wound, in a sealed, soft, flat case; tabs welded to the current collectors, aluminium on the positive side and copper on the negative, carry the current out. Pouch and prismatic cells are reported as more tolerant of vibration when tightly packed.' }
    };
    var mode = 'coin';
    function render() {
      Array.prototype.forEach.call(fb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-fmt') === mode)); });
      Object.keys(rings).forEach(function (k) { rings[k].setAttribute('stroke-opacity', k === mode ? 1 : 0); });
      clear(dec); var I = INFO[mode], y = base + 58;
      if (I.code) {
        var bw = 58, gap = 34, n = I.code.length, tot = n * bw + (n - 1) * gap, xs = 260 - tot / 2;
        txt(dec, 260, y - 14, mode === 'coin' ? 'reading the name CR2025' : 'reading the name 504050', 'strong', 'middle');
        I.code.forEach(function (c, j) {
          var x = xs + j * (bw + gap);
          el('rect', { x: x, y: y, width: bw, height: 30, rx: 6, fill: 'var(--panel-2)', stroke: 'var(--accent)' }, dec);
          txt(dec, x + bw / 2, y + 20, c[0], 'strong big', 'middle');
          txt(dec, x + bw / 2, y + 48, c[1], 'amber', 'middle'); if (c[2]) txt(dec, x + bw / 2, y + 63, c[2], '', 'middle');
        });
      } else {
        txt(dec, 260, y + 14, I.note[0], 'strong', 'middle'); txt(dec, 260, y + 34, I.note[1], '', 'middle');
      }
      read.innerHTML = I.t;
    }
    Array.prototype.forEach.call(fb, function (b) { on(b, 'click', function () { mode = b.getAttribute('data-fmt'); render(); }); });
    badge(g, 18, 120, 1); badge(g, X.prism + 50, 24, 2); badge(g, 500, base + 46, 3);
    steps(fig, [
      { text: 'The same layers in four shapes. A <b>coin cell</b> is the laboratory’s format: CR2025, the most common, is read as C (a lithium chemistry), R (round), 20 mm across, 2.5 mm high.' },
      { text: '<b>Wound or stacked.</b> Cylindrical cells wind the layers into a spiral; prismatic and pouch cells stack them, in a rigid case or a flexible foil.' },
      { text: 'Some names are <b>sizes</b>: six digits for a prismatic cell (504050: 5.0 by 40 by 50 mm), five for a cylindrical one. Choose a format to read it.' }
    ]);
    render();
  });
  /* figs-6.js */
  register('f6-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), mb = fig.querySelectorAll('button[data-mode]');
    var gx0 = 62, gx1 = 168, px0 = 352, px1 = 458, y0 = 96, y1 = 246, xsep = 260, nL = 6;
    var gap = (y1 - y0) / nL;
    // current collectors
    el('rect', { x: gx0 - 12, y: y0 - 6, width: 10, height: y1 - y0 + 12, fill: M('copper') }, g); txt(g, gx0 - 7, y1 + 20, 'Cu', 'strong', 'middle');
    el('rect', { x: px1 + 2, y: y0 - 6, width: 10, height: y1 - y0 + 12, fill: M('alu') }, g); txt(g, px1 + 7, y1 + 20, 'Al', 'strong', 'middle');
    // electrolyte
    el('rect', { x: gx1, y: y0 - 6, width: px0 - gx1, height: y1 - y0 + 12, fill: MV('electrolyte') }, g);
    el('line', { x1: xsep, y1: y0, x2: xsep, y2: y1, stroke: 'var(--second)', 'stroke-dasharray': '3 5' }, g);
    // graphite: graphene sheets; LiCoO2: CoO2 slabs drawn as rows of octahedra (squares)
    for (var i = 0; i <= nL; i++) {
      var y = y0 + i * gap;
      el('line', { x1: gx0, x2: gx1, y1: y, y2: y, stroke: MC('graphite'), 'stroke-opacity': '.9', 'stroke-width': 2.4 }, g);
      for (var k = 0; k < 7; k++) el('rect', { x: px0 + 4 + k * 15, y: y - 4, width: 8, height: 8, transform: 'rotate(45 ' + (px0 + 8 + k * 15) + ' ' + y + ')', fill: MB('oxide'), stroke: '#5D6774', 'stroke-width': .6 }, g);
    }
    txt(g, (gx0 + gx1) / 2, y0 - 16, 'graphite', 'strong', 'middle'); txt(g, (px0 + px1) / 2, y0 - 16, 'LiCoO₂', 'strong', 'middle');
    txt(g, (gx0 + gx1) / 2, y1 + 20, 'sheets of carbon', '', 'middle'); txt(g, (px0 + px1) / 2, y1 + 20, 'CoO₂ layers', '', 'middle');
    txt(g, xsep, y1 + 20, 'electrolyte', 'cyan', 'middle');
    // external circuit
    var wy = 36, xL = gx0 - 7, xR = px1 + 7;
    var ePath = el('path', { d: 'M' + xL + ',' + (y0 - 6) + ' V' + wy + ' H' + xR + ' V' + (y0 - 6), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g);
    var eflow = flow(svg, ePath, { n: 10, cls: 'e-dot', r: 3, speed: 50, parent: g });
    var box = el('rect', { x: xsep - 58, y: wy - 15, width: 116, height: 30, rx: 6, fill: 'var(--panel)', stroke: 'var(--accent)' }, g);
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
    var barN = el('rect', { x: bx, y: by, height: 12, rx: 3, fill: 'var(--text)', 'fill-opacity': '.55' }, g), barP = el('rect', { y: by, height: 12, rx: 3, fill: 'var(--accent)' }, g);
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
      setSvgText(boxT, mode === 'discharge' ? 'lamp' : 'charger, above V_OC'); box.setAttribute('stroke', mode === 'discharge' ? 'var(--accent)' : 'var(--second)');
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
  register('f6-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 34, x1 = 486, yA = 54, X = function (yr) { return x0 + (yr - 1971) / (1997 - 1971) * (x1 - x0); };
    var ev = [
      { yr: 1972, y: 36, an: 'start', note: 'Layered TiS₂ singled out as a positive electrode; the recipe for an intercalation electrode set out.', a: 'Belgirate, 1972', b: 'Steele; Armand', txt: '1972, a NATO conference at Belgirate: Steele singles out the layered dichalcogenides such as TiS₂ as positive electrodes (Rüdorff, Rouxel and co-workers had shown alkali metals entering them fast), and Armand sets out what an intercalation electrode needs and proposes putting cations into graphite.' },
      { yr: 1976, y: 222, an: 'middle', note: 'Lithium goes in and out of TiS₂ at about 2.2 V; Exxon’s lithium-metal cell later fails on dendrites.', a: 'Li vs TiS₂, 2.2 V', b: 'Whittingham; Steele', txt: '1976: Whittingham at Exxon, and Steele and co-workers, show lithium going rapidly and reversibly into TiS₂ against a lithium-metal electrode, at about 2.2 V. Exxon showed a 45 Wh cell in 1977, but dendrites grew across to the positive electrode, the shorts ignited the electrolyte, and the programme was abandoned.' },
      { yr: 1978.5, y: 268, an: 'middle', note: 'Two insertion electrodes, no lithium metal: the first rocking-chair cell, LiₓWO₂ against TiS₂.', a: 'the rocking chair', b: 'Armand; Lazzari, Scrosati', txt: 'Late 1970s: Armand proposes the rocking-chair cell, two insertion electrodes at different potentials, to get rid of lithium-metal dendrites. Lazzari and Scrosati build one almost at once, LiₓWO₂ against TiS₂: about 2 V and 70 good cycles. In 1978 Armand also proposes polymer electrolytes (chapter 14) and, in a patent, graphite as the negative host.' },
      { yr: 1980, y: 128, an: 'end', note: 'Over half the lithium comes out of LiCoO₂ reversibly, at about 4 V: cells can be built discharged.', a: 'LiCoO₂, 4 V', b: 'Goodenough', txt: '1979 to 1980: Goodenough’s group finds that over half of the lithium can be taken reversibly out of layered LiCoO₂, at about 4 V vs Li/Li⁺, twice TiS₂. A cell can now be built discharged, with all its lithium in the positive electrode.' },
      { yr: 1983, y: 82, an: 'middle', note: 'Petroleum coke cycles in a carbonate electrolyte; carbon against LiCoO₂ is proposed.', a: 'carbon negative', b: 'Yoshino; Yazami', txt: '1983: Yoshino cycles petroleum coke in a propylene-carbonate electrolyte and proposes soft carbon against LiCoO₂, the building blocks of today’s cell; Yazami and Touzain insert lithium into graphite electrochemically. LiMn₂O₄ follows the same year.' },
      { yr: 1990, y: 36, an: 'end', note: 'Ethylene carbonate forms a protective film on graphite, mostly on the first charge.', a: 'EC protects graphite', b: 'Fong, von Sacken, Dahn', txt: '1990: with ethylene carbonate in the electrolyte, a protective, Li⁺-conducting film forms on graphite during the first insertion only; after that, intercalation is fully reversible. The SEI of figure 6.3.' },
      { yr: 1991, y: 222, an: 'end', note: 'Carbon against LiCoO₂ goes on sale: about 80 Wh/kg, ahead of every other rechargeable.', a: 'Sony, June 1991', b: '80 Wh/kg, 200 Wh/L', txt: 'June 1991: Sony puts the carbon | LiCoO₂ cell on the market, after Yoshino’s 1986 safety tests showed it more tolerant of abuse than lithium-metal cells: about 80 Wh/kg and 200 Wh/L, ahead of every rechargeable of the day.' },
      { yr: 1993, y: 128, an: 'start', note: 'LiPF₆ in EC/DMC becomes the standard electrolyte.', a: 'LiPF₆ in EC/DMC', b: 'Guyomard, Tarascon', txt: '1993: Guyomard and Tarascon propose LiPF₆ in ethylene carbonate and dimethyl carbonate, which became the standard electrolyte. With it, LiCoO₂ cells have reached about 250 Wh/kg and 600 Wh/L (2020), three times Sony’s first.' },
      { yr: 1996, y: 268, an: 'end', note: 'LiFePO₄ is proposed; a carbon coating makes it work.', a: 'LiFePO₄', b: 'Goodenough; Armand', txt: '1996: Goodenough’s group proposes LiFePO₄; Armand and co-workers make it work by coating the particles with carbon (chapter 11). By 2020 it was produced in thousands of tonnes a year.' }
    ];
    el('line', { x1: x0, x2: x1, y1: yA, y2: yA, stroke: 'var(--line-2)', 'stroke-width': 2 }, g);
    var dots = ev.map(function (e, i) {
      var x = X(e.yr), d = el('circle', { cx: x, cy: yA, r: 6, fill: 'var(--panel-2)', stroke: 'var(--accent)', 'stroke-width': 2 }, g);
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
      dots.forEach(function (d, k) { d.setAttribute('fill', k === i ? 'var(--accent)' : k < i ? 'var(--accent-strong)' : 'var(--panel-2)'); d.setAttribute('r', k === i ? 8 : 6); });
      pointer.setAttribute('d', 'M' + (x - 8) + ',96.5 L' + x + ',' + (yA + 10) + ' L' + (x + 8) + ',96.5 Z');
      setSvgText(cYear, e.yr === 1978.5 ? '1970s' : String(e.yr)); setSvgText(cTitle, e.a); setSvgText(cWho, e.b);
      var lines = wrap(e.note, 62); cNote.forEach(function (t2, k) { setSvgText(t2, lines[k] || ''); });
      read.innerHTML = e.txt;
    }
    var st = steps(fig, ev.map(function (e, i) { return { text: '<b>' + (e.yr === 1978.5 ? 'Late 1970s' : e.yr) + '.</b> ' + e.a + '.', on: function () { show(i); } }; }));
    var acc = 0, loop = anim(fig, function (dt) { if (dt === 0) return; acc += dt; if (acc > 5) { acc = 0; st.go((cur + 1) % ev.length); } }, { autoplay: true, stepDt: 5 });
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
    var cv = document.getElementById('learnBg'); if (!cv || getComputedStyle(cv).display === 'none') return;
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
        var c = p.ion ? '31,72,214' : '242,169,0';
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
