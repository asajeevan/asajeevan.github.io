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
    pbo2:        ['#3E2E25', '#6A5446', '#43322A', '#281D17', '#4E3B31'],
    mno2:        ['#2F2D2B', '#57534F', '#34312E', '#1E1C1A', '#403D3A'],
    ag2o:        ['#3A3430', '#635B55', '#3F3834', '#26211E', '#4A433E']
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
  window.LearnCore = { loops: loops };   // read by assets/js/export.js to record animated figures

  /* figs-2.js */
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
        el('rect', { x: xB, y: y + 3, width: d.V * sc, height: rowH - 8, rx: 3, fill: d.kind === 'primary' ? 'var(--second)' : 'var(--accent)', 'fill-opacity': d.kind === 'primary' ? '.6' : '.85' }, r);
        txt(r, xN, y + 14, d.name, '', 'end'); txt(r, xB + d.V * sc + 6, y + 14, d.V.toFixed(1), 'strong');
        var aq = /^aq/.test(d.electrolyte);
        el('circle', { cx: xB + d.V * sc + 34, cy: y + 10, r: 4, fill: aq ? 'var(--second)' : 'var(--cation)', 'fill-opacity': aq ? '.5' : '.9' }, r);
        rows.push({ d: d, g: r, y: y });
        function show() { info.innerHTML = '<b>' + d.name + ', ' + d.V.toFixed(1) + ' V nominal.</b> Negative electrode: ' + d.anode + '. Positive electrode: ' + d.cathode + '. Electrolyte: ' + d.electrolyte + '.' + (d.name === 'Lithium-ion' ? ' On the ladder of chapter 3 this is graphite at about 0.2 V and LiCoO₂ at about 4.0 V versus lithium; the gap between the rungs is this bar.' : ''); }
        on(r, 'mouseenter', show); on(r, 'focus', show); on(r, 'click', show);
        y += rowH;
      });
      y += 6;
    });
    txt(g, 20, 318, '● green dot: water-based electrolyte   ● blue dot: nonaqueous, lithium-based', '');
    badge(g, 500, 74, 1); badge(g, 500, 212, 2); badge(g, 500, 140, 3);
    info.innerHTML = 'Hover or tap a bar to see what is inside.';
    steps(fig, [
      { text: 'The <b>primary</b> systems: zinc with manganese dioxide in the 1.5 V cells of a torch, zinc-air at 1.2 V, and the lithium cells of cameras at 3.0 V.' },
      { text: 'The <b>rechargeable</b> systems: lead-acid at 2.0 V, the nickel cells at 1.2 V, and lithium-ion at 4.0 V. Different chemistry, different voltage; the size of the cell changes nothing here.' },
      { text: 'Look at the dots. Every system with a <b>water-based</b> electrolyte sits at or below 2 V; every system above 2 V uses lithium and a nonaqueous electrolyte. Chapter 3 explains both facts.' }
    ]);
  });
  /* figs-3.js */
  register('f3-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), ESl = fig.querySelector('.E'), Ev = fig.querySelector('.E-val');
    var y0 = 150, sc = 62; // y of E = 0 (the couple's standard potential); px per volt
    var Y = function (E) { return y0 + E * sc; }; // more positive potential: lower on the energy axis
    // axes: energy up on the left, potential down on the right
    var ax = arrow(g, 30, 270, 30, 30, 'var(--muted)', 1.2); txt(g, 22, 150, 'electron energy', '', 'middle', { transform: 'rotate(-90 22 150)' });
    arrow(g, 490, 30, 490, 270, 'var(--muted)', 1.2); txt(g, 502, 150, 'potential E, more positive ↓', '', 'middle', { transform: 'rotate(90 502 150)' });
    [-1.5, -1, -0.5, 0, 0.5, 1, 1.5].forEach(function (v) { el('line', { x1: 484, y1: Y(v), x2: 490, y2: Y(v), stroke: 'var(--line-2)' }, g); txt(g, 478, Y(v) + 4, (v > 0 ? '+' : '') + v.toFixed(1) + ' V', '', 'end'); });
    // the metal: filled states up to the Fermi level
    var xm0 = 70, xm1 = 190;
    el('rect', { x: xm0, y: 30, width: xm1 - xm0, height: 240, fill: M('steel'), 'fill-opacity': '.5', stroke: '#8B95A0' }, g);
    var filled = el('rect', { x: xm0, y: Y(0), width: xm1 - xm0, height: 270 - Y(0), fill: 'var(--electron)', 'fill-opacity': '.25' }, g);
    var fermi = el('line', { x1: xm0 - 6, x2: xm1 + 6, y1: Y(0), y2: Y(0), stroke: 'var(--electron)', 'stroke-width': 3 }, g);
    var fLab = txt(g, (xm0 + xm1) / 2, Y(0) - 8, 'Fermi level: transferable electrons', 'cyan', 'middle');
    txt(g, (xm0 + xm1) / 2, 22, 'electrode (metal)', 'strong', 'middle'); txt(g, (xm0 + xm1) / 2, 284, 'filled states below, empty above', '', 'middle');
    // the species in solution: a vacant orbital above, an occupied one below (B2 Figure 1.1.3)
    var xs0 = 280, xs1 = 400, vac = -0.6, occ = 0.6;
    el('rect', { x: xs0 - 20, y: 30, width: xs1 - xs0 + 40, height: 240, fill: MV('electrolyte'), stroke: '#9FB3C2' }, g);
    txt(g, (xs0 + xs1) / 2, 22, 'species A in solution', 'strong', 'middle');
    el('line', { x1: xs0, x2: xs1, y1: Y(vac), y2: Y(vac), stroke: 'var(--second)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, g); txt(g, (xs0 + xs1) / 2, Y(vac) - 8, 'vacant orbital (empty)', 'cyan', 'middle');
    el('line', { x1: xs0, x2: xs1, y1: Y(occ), y2: Y(occ), stroke: 'var(--second)', 'stroke-width': 2 }, g); txt(g, (xs0 + xs1) / 2, Y(occ) + 18, 'occupied orbital (filled)', 'cyan', 'middle');
    el('circle', { cx: (xs0 + xs1) / 2 - 10, cy: Y(occ), r: 3, 'class': 'e-dot' }, g); el('circle', { cx: (xs0 + xs1) / 2 + 10, cy: Y(occ), r: 3, 'class': 'e-dot' }, g);
    var hop = el('circle', { r: 3.5, 'class': 'e-dot anim-only' }, g), hopLab = txt(g, 235, 0, '', 'amber', 'middle');
    var gapL = el('line', { x1: 220, x2: 220, stroke: 'var(--accent)', 'stroke-dasharray': '3 3' }, g), gapT = txt(g, 226, 0, '', 'amber');
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
      { text: 'The yellow line is the <b>Fermi level</b>: the energy of the electrons an electrode can give away or take in. Below it the metal’s states are full, above it empty.' },
      { text: 'Slide the potential. Making the electrode <b>more negative raises</b> its electrons: exactly <b>1 eV per volt</b>, the electron-volt of chapter 0. The right-hand axis is the same quantity measured as a potential, upside down.' },
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
  register('f3-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), qSl = fig.querySelector('.q'), qv = fig.querySelector('.q-val'), formBtn = fig.querySelector('.form-btn');
    var xm = 40, xb = 200, xs = 480, yT = 40, yB = 190, qNow = null; // qNow: fractional charge during the replay
    el('rect', { x: xm, y: yT, width: xb - xm, height: yB - yT, fill: M('steel'), 'fill-opacity': '.75', stroke: '#8B95A0' }, g);
    el('rect', { x: xb, y: yT, width: xs - xb, height: yB - yT, fill: MV('electrolyte'), stroke: '#9FB3C2' }, g);
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
      for (i = 0; i < 6; i++) { var y2 = yT + 20 + i * 24; el('circle', { cx: xb + 9, cy: y2, r: 3, fill: 'var(--second)', 'fill-opacity': '.5' }, solv); if (i < n * 3) { charge(compact, xb + 22, y2, 5, -s); el('circle', { cx: xb + 22, cy: y2, r: 9, fill: 'none', stroke: 'var(--second)', 'stroke-opacity': '.6' }, compact); } }
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
      { text: 'Excess charge on a conductor sits at its <b>surface</b> (chapter 0). On an electrode it lies in a layer less than a nanometre thick, an excess or deficiency of electrons.' },
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
  register('f3-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), selN = fig.querySelector('select[data-side=neg]'), selP = fig.querySelector('select[data-side=pos]');
    var read = fig.querySelector('.readout'), flags = fig.querySelector('.flags'), aq = fig.querySelector('input[type=checkbox]'), pHSl = fig.querySelector('.pH'), pHv = fig.querySelector('.pH-val');
    var y = function (V) { return 322 - V * 58; };
    el('line', { x1: 44, y1: 26, x2: 44, y2: 326, stroke: 'var(--line-2)' }, g);
    for (var v = 0; v <= 5; v++) { el('line', { x1: 40, y1: y(v), x2: 44, y2: y(v), stroke: 'var(--line-2)' }, g); txt(g, 36, y(v) + 4, v + ' V', '', 'end'); }
    txt(g, 14, 180, 'potential vs Li/Li⁺ (energy per unit charge)', '', 'middle', { transform: 'rotate(-90 14 180)' });
    arrow(g, 228, 296, 228, 324, 'var(--field)', 1.2); txt(g, 246, 308, 'electron energy', 'field', 'start'); txt(g, 246, 322, 'higher ↓', 'field', 'start');
    txt(g, 140, 20, 'negative electrodes', 'cyan', 'middle'); txt(g, 390, 20, 'positive electrodes', 'amber', 'middle');
    var w = P.data.carbonateWindow;
    var bands = el('g', {}, g);
    el('rect', { x: 222, y: y(w.high), width: 62, height: y(w.low) - y(w.high), fill: 'var(--second)', 'fill-opacity': '.16', stroke: 'var(--second)', 'stroke-opacity': '.5', rx: 4 }, bands);
    txt(bands, 253, y(w.high) - 6, 'carbonate', 'cyan', 'middle'); txt(bands, 253, y(w.high) + 14, 'electrolyte', 'cyan', 'middle'); txt(bands, 253, y(w.high) + 28, 'stable', 'cyan', 'middle'); txt(bands, 253, y(w.low) + 14, '1.1 to 4.3 V', 'cyan', 'middle');
    var aqG = el('g', { style: 'display:none' }, g);
    var aqBand = el('rect', { x: 304, y: 0, width: 26, height: 0, fill: 'var(--accent)', 'fill-opacity': '.18', stroke: 'var(--accent)', 'stroke-opacity': '.6', rx: 3 }, aqG);
    var aqT1 = txt(aqG, 317, 0, 'water', 'amber', 'middle'), aqT2 = txt(aqG, 317, 0, '', 'amber', 'middle'), aqT3 = txt(aqG, 317, 0, '', 'amber', 'middle');
    var rungs = el('g', {}, g), marks = {}, prevV = { neg: -9, pos: -9 }, prevT = { neg: null, pos: null };
    P.data.ladder.forEach(function (r) {
      var left = r.side === 'neg', x1 = left ? 78 : 346, x2 = left ? 214 : 476;
      var crowded = (r.V - prevV[r.side]) < 0.3;
      if (crowded && prevT[r.side]) prevT[r.side].setAttribute('y', y(prevV[r.side]) + 14);
      prevV[r.side] = r.V;
      var rg = el('g', { 'class': 'rung', 'data-key': r.key }, rungs);
      el('line', { x1: x1, y1: y(r.V), x2: x2, y2: y(r.V), stroke: left ? 'var(--second)' : 'var(--accent)', 'stroke-width': 2 }, rg);
      var t = txt(rg, left ? x2 - 4 : x1 + 4, y(r.V) - 5, r.name + ' ' + r.V.toFixed(r.V === 4.75 ? 2 : 1) + (r.key === 's' ? ' (Li–S, conversion)' : ''), '', left ? 'end' : 'start'); prevT[r.side] = t;
      marks[r.key] = rg;
      var o = document.createElement('option'); o.value = r.key; o.textContent = plain(r.name) + ' (' + r.V.toFixed(r.V === 4.75 ? 2 : 1) + ' V)'; (left ? selN : selP).appendChild(o);
    });
    var brace = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, g);
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
      { text: 'The axis is a <b>potential</b>: energy per unit charge, measured against lithium metal, which sits at 0. Up the axis the potential is more positive, so the electron energy is <b>lower</b> (the violet arrow points the other way).' },
      { text: 'Each material is a rung. Pick a negative and a positive electrode; the cell voltage is the <b>gap</b> between the rungs, and it travels with you through the rest of the page.' },
      { text: 'The green band is where the carbonate electrolytes of lithium-ion cells are stable, between their filled and empty levels: about 1.1 to 4.3 V. A rung outside it needs a protective layer, the subject of a later module.' },
      { text: 'Tick the water window. Water is stable over only 1.23 V, and where that window sits depends on pH: 3.05 to 4.27 V versus lithium in acid, sliding 59 mV lower per pH unit. Every rung below about 3 V is out of reach for a water-based cell.', on: function () { aq.checked = true; renderAq(); } }
    ]);
  });
  register('f3-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var Y = function (V) { return 70 + V * 40; }; // energy axis: potential downward
    var w = P.data.carbonateWindow;
    arrow(g, 26, 262, 26, 44, 'var(--muted)', 1.2); txt(g, 16, 150, 'electron energy ↑', '', 'middle', { transform: 'rotate(-90 16 150)' });
    txt(g, 122, 40, 'negative electrode', 'strong', 'middle'); txt(g, 260, 40, 'electrolyte', 'strong', 'middle'); txt(g, 410, 40, 'positive electrode', 'strong', 'middle');
    el('rect', { x: 200, y: Y(w.low), width: 120, height: Y(w.high) - Y(w.low), fill: 'var(--second)', 'fill-opacity': '.12', rx: 4 }, g);
    el('line', { x1: 200, x2: 320, y1: Y(w.low), y2: Y(w.low), stroke: 'var(--second)', 'stroke-width': 2 }, g); txt(g, 260, Y(w.low) - 6, 'lowest empty level (LUMO)', 'cyan', 'middle');
    el('line', { x1: 200, x2: 320, y1: Y(w.high), y2: Y(w.high), stroke: 'var(--second)', 'stroke-width': 2 }, g); txt(g, 260, Y(w.high) + 16, 'highest filled level (HOMO)', 'cyan', 'middle');
    txt(g, 260, (Y(w.low) + Y(w.high)) / 2 + 4, 'window: 3.2 eV', 'cyan', 'middle');
    var muA = el('line', { x1: 60, x2: 160, stroke: 'var(--metal)', 'stroke-width': 3 }, g), muAt = txt(g, 68, 0, '', '');
    var muC = el('line', { x1: 360, x2: 476, stroke: 'var(--accent-strong)', 'stroke-width': 3 }, g), muCt = txt(g, 360, 0, '', '');
    var warnA = txt(g, 68, 0, 'above the LUMO: layer needed', 'amber'), warnC = txt(g, 360, 0, 'below the HOMO: oxidation', 'amber');
    var gap = el('line', { x1: 340, x2: 340, stroke: 'var(--accent)', 'stroke-dasharray': '4 3' }, g), gapT = txt(g, 346, 0, '', 'strong');
    // the external circuit: a wire above the diagram; the electron goes round, never through the electrolyte
    var wire = el('path', { d: 'M60,0 L60,26 L476,26 L476,0', fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g);
    txt(g, 260, 14, 'external circuit: the electron goes round', 'cyan', 'middle');
    var eDot = el('circle', { cx: 60, cy: 26, r: 4, 'class': 'e-dot anim-only' }, g);
    var ion = ourIon(g, 170, 0, 5, 'our ion (Li⁺) goes through', true); ion.g.classList.add('anim-only');
    ion.move(178, (Y(w.low) + Y(w.high)) / 2 + 26);   // start on its path through the electrolyte, not on the wire's label
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
      { text: 'μ_A and μ_C are the electron energies of the two electrodes: the Fermi levels of figure 3.2, drawn on one axis. Higher means the electron is held less tightly.' },
      { text: 'The electrolyte is stable only between its <b>lowest empty level</b> and its <b>highest filled level</b> (chemists call them LUMO and HOMO): an electrode above the first reduces it, one below the second oxidizes it.' },
      { text: 'Press Play. The electron leaves the negative electrode, travels along the wire <b>outside</b> the cell and drops onto the positive electrode; the energy it gives up on the way, e·V_OC, is the lamp of chapter 1. Our ion crosses the electrolyte inside.' },
      { text: 'Same numbers as the ladder of figure 3.4, axis turned upside down: a rung at x volts is an electron energy x eV below lithium’s.' }
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
  register('f3-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg);
    var Y = function (eV) { return 44 + eV * 42; }; // eV below the lithium level, downward
    el('line', { x1: 60, x2: 470, y1: Y(0), y2: Y(0), stroke: 'var(--metal)', 'stroke-width': 2.5 }, g); txt(g, 62, Y(0) + 15, 'μ_A(Li): the lithium level, 0 eV', '');
    txt(g, 155, 26, 'layered sulfide LiMS₂', 'strong', 'middle'); txt(g, 365, 26, 'layered oxide LiMO₂', 'strong', 'middle');
    el('rect', { x: 100, y: Y(2.5), width: 110, height: Y(4.15) - Y(2.5), fill: '#c9a35c', 'fill-opacity': '.35', stroke: '#c9a35c', 'stroke-opacity': '.6' }, g); txt(g, 155, Y(3.6), 'S-3p band (filled)', '', 'middle'); txt(g, 155, Y(3.95), 'top 2.5 eV below', '', 'middle');
    el('rect', { x: 310, y: Y(4.0), width: 110, height: Y(5.1) - Y(4.0), fill: 'var(--heat)', 'fill-opacity': '.3', stroke: 'var(--heat)', 'stroke-opacity': '.6' }, g); txt(g, 365, Y(4.6), 'O-2p band (filled)', '', 'middle'); txt(g, 365, Y(4.95), 'top 4.0 eV below', '', 'middle');
    [[155, 2.5, 'about 2.5 V'], [365, 4.0, 'about 4 V']].forEach(function (c) {
      el('line', { x1: c[0] - 55, x2: c[0] + 55, y1: Y(c[1]) - 3, y2: Y(c[1]) - 3, stroke: 'var(--accent)', 'stroke-width': 3 }, g); (function () {})();
      txt(g, c[0] - 6, Y(c[1]) - 24, 'M(IV)/M(III) couple', 'amber', 'middle'); txt(g, c[0] - 6, Y(c[1]) - 10, 'pinned: ' + c[2], 'amber', 'middle');
      arrow(g, c[0] + 66, Y(c[1]) - 40, c[0] + 66, Y(c[1]) - 8, 'var(--accent)', 1.4); txt(g, c[0] + 72, Y(c[1]) - 36, 'cannot', 'amber', 'start'); txt(g, c[0] + 72, Y(c[1]) - 22, 'go lower', 'amber', 'start');
    });
    el('line', { x1: 60, x2: 470, y1: Y(4.3), y2: Y(4.3), stroke: 'var(--second)', 'stroke-dasharray': '5 3' }, g); txt(g, 62, Y(4.3) + 15, 'carbonate HOMO: 4.3 eV below', 'cyan');
    arrow(g, 30, Y(0.3), 30, Y(4.6), 'var(--muted)', 1.2); txt(g, 22, Y(2.4), 'electron energy, eV below Li', '', 'middle', { transform: 'rotate(-90 22 ' + Y(2.4) + ')' });
    badge(g, 300, Y(0) + 18, 1); badge(g, 84, Y(2.5) + 18, 2); badge(g, 262, Y(1.0), 3); badge(g, 480, Y(4.3) + 18, 4);
    steps(fig, [
      { text: 'The top line is the lithium level, the electron energy of a lithium metal electrode. Every positive-electrode energy is measured down from it, in electron-volts, which is the ladder’s volts.' },
      { text: 'Each host has a filled band of anion states, a continuum of electron levels made from the anions’ p orbitals. Its top lies about <b>2.5 eV</b> below lithium in a sulfide and about <b>4.0 eV</b> below in an oxide.' },
      { text: 'The transition-metal couple that stores the electrons cannot be pushed <b>below the top of that band</b>: it is pinned there. So a sulfide positive electrode gives about 2.5 V and an oxide about 4 V.' },
      { text: 'The carbonate electrolyte’s own filled level sits about 4.3 eV below lithium, just under the oxide band top: the oxide’s 4 V fits inside the window with little to spare, which is why oxide hosts run today’s cells.' }
    ]);
  });
  register('f3-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), n = fig.querySelector('input[data-p=n]'), E = fig.querySelector('input[data-p=E]'), read = fig.querySelector('.readout'), nl = fig.querySelector('.n-val'), El = fig.querySelector('.E-val'), presets = fig.querySelectorAll('button[data-preset]');
    txt(g, 40, 26, 'electrical energy available per mole of reaction, −ΔG = nFE', 'strong');
    el('rect', { x: 40, y: 40, width: 440, height: 30, rx: 4, fill: 'var(--accent)', 'fill-opacity': '.15' }, g);
    var bar = el('rect', { x: 40, y: 40, width: 0, height: 30, rx: 4, fill: 'var(--accent)' }, g);
    [0, 100, 200, 300, 400, 500].forEach(function (k) { el('line', { x1: 40 + k * 0.88, y1: 70, x2: 40 + k * 0.88, y2: 76, stroke: 'var(--line-2)' }, g); txt(g, 40 + k * 0.88, 90, k + (k === 500 ? ' kJ/mol' : ''), '', k === 0 ? 'start' : k === 500 ? 'end' : 'middle'); });
    var dan = el('line', { x1: 0, x2: 0, y1: 36, y2: 74, stroke: 'var(--second)', 'stroke-width': 2 }, g), danT = txt(g, 0, 110, 'Daniell cell: 213 kJ/mol', 'cyan', 'middle');
    var vt = txt(g, 0, 60, '', 'strong', 'start');
    badge(g, 20, 55, 1); badge(g, 500, 55, 2);
    function render() {
      var nn = +n.value, EE = +E.value, dG = P.reactionEnergy(nn, EE) / 1000;
      var wpx = Math.min(440, -dG * 0.88); bar.setAttribute('width', String(wpx));
      vt.setAttribute('x', wpx > 300 ? 40 + wpx - 6 : 40 + wpx + 6); vt.setAttribute('text-anchor', wpx > 300 ? 'end' : 'start'); vt.style.fill = wpx > 300 ? '#fff' : ''; setSvgText(vt, Math.round(-dG) + ' kJ/mol');
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
      { text: 'The green mark is the Daniell cell: n = 2, E = 1.10 V, −ΔG = 213 kJ per mole of zinc. Tap “Daniell cell”, then “your cell”, and compare.' }
    ]);
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
