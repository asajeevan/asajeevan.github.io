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

  /* figs-11.js */
  register('f11-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sel = 0, ph = 0.3;
    // six stations round one cell: what we impose (left sparkline) and what comes back (right sparkline)
    var ST = [
      { t: 'Galvanostatic cycling', k: 'Lab 1', q: 'How much charge, at what voltage, for how many cycles?', where: 'Lab 1', thief: 'lost lithium and lost material, from the capacity and its slopes',
        imp: function (u) { return u < 0.5 ? 0.8 : 0.2; }, impL: 'I', res: function (u) { return u < 0.5 ? 0.25 + 0.45 * u + 0.4 * Math.pow(2 * u, 8) * 0.5 : 0.75 - 0.45 * (u - 0.5) - 0.4 * Math.pow(2 * (u - 0.5), 8) * 0.5; }, resL: 'V' },
      { t: 'Cyclic voltammetry', k: 'Lab 2', q: 'Where does it react, and how fast?', where: 'Lab 2', thief: 'a surface film or a sluggish reaction, from peaks that drift apart',
        imp: function (u) { return u < 0.5 ? 0.2 + 1.2 * u : 1.4 - 1.2 * u; }, impL: 'E', res: function (u) { var e = u < 0.5 ? 0.2 + 1.2 * u : 1.4 - 1.2 * u; return 0.5 + (u < 0.5 ? 0.42 * Math.exp(-Math.pow((e - 0.95) / 0.16, 2)) - 0.02 : -0.42 * Math.exp(-Math.pow((e - 0.65) / 0.16, 2)) + 0.02); }, resL: 'i' },
      { t: 'GITT', k: 'Lab 3', q: 'How fast does lithium move inside the solid?', where: 'Lab 3', thief: 'slowed transport in a cracked or coated particle',
        imp: function (u) { return (u % 0.34) < 0.12 ? 0.75 : 0.2; }, impL: 'I', res: function (u) { var k = Math.floor(u / 0.34), f = u % 0.34, base = 0.25 + 0.17 * k; return f < 0.12 ? base + 0.08 + 0.1 * Math.sqrt(f / 0.12) : base + 0.17 * 0.5 - 0.09 * Math.exp(-(f - 0.12) / 0.06) + 0.0; }, resL: 'V' },
      { t: 'Impedance', k: 'Labs 4 and 5', q: 'Which part resists, and how fast does it answer?', where: 'Lab 4', thief: 'a thickening interface or a lost contact, from an arc that grows',
        imp: function (u) { return 0.5 + 0.35 * Math.sin(u * 6 * Math.PI * (0.4 + u)); }, impL: 'E, f', res: function (u) { return 0.5 + 0.28 * Math.sin(u * 6 * Math.PI * (0.4 + u) - 0.6); }, resL: 'i', nyq: true },
      { t: 'A current pulse', k: 'Figure L3.1', q: 'How big is the resistance, read after how long?', where: 'Lab 3', thief: 'resistance that has grown, from the drop at a fixed time',
        imp: function (u) { return u < 0.2 ? 0.2 : 0.75; }, impL: 'I', res: function (u) { return u < 0.2 ? 0.25 : 0.55 + 0.2 * (1 - Math.exp(-(u - 0.2) * 12)) + 0.15 * Math.sqrt(u - 0.2); }, resL: 'V' },
      { t: 'Post-mortem', k: 'Lab 6', q: 'When the outside is not enough, what is inside?', where: 'Lab 6', thief: 'plated lithium, cracks, deposits and lost adhesion, seen directly',
        imp: null, impL: '', res: null, resL: '' }
    ];
    var CX = 260, CY = 178;
    // the cell in the middle: a coin cell seen from above, with its leads
    el('circle', { cx: CX, cy: CY, r: 34, fill: M('steel'), stroke: '#8B95A0', filter: 'url(#fx-lift)' }, g);
    el('circle', { cx: CX, cy: CY, r: 24, fill: 'none', stroke: '#8B95A0', 'stroke-opacity': .5 }, g);
    txt(g, CX, CY + 4, '+', 'strong', 'middle', { style: 'font-size:16px' });
    txt(g, CX, CY + 52, 'one cell', '', 'middle', { style: 'font-size:11px' });
    var POS = [[14, 14], [292, 14], [14, 112], [292, 112], [14, 262], [292, 262]], W = 214, H = 80, cards = [], curs = [];
    ST.forEach(function (s, k) {
      var x = POS[k][0], y = POS[k][1], grp = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(s.t), style: 'cursor:pointer' }, g);
      var card = el('rect', { x: x, y: y, width: W, height: H, rx: 8, fill: 'var(--panel-2)', 'fill-opacity': .6, stroke: 'var(--line-2)' }, grp);
      txt(grp, x + 10, y + 16, s.t, 'strong', 'start', { style: 'font-size:11.5px' });
      txt(grp, x + W - 8, y + 16, s.k, 'tag', 'end', { style: 'font-size:10px' });
      // the lead from the card to the cell
      var lx = x < CX ? x + W : x, ly = y + H / 2; el('path', { d: 'M' + lx + ',' + ly + ' Q' + ((lx + CX) / 2) + ',' + ly + ' ' + (CX + (x < CX ? -36 : 36)) + ',' + CY, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
      if (s.imp) {
        var bx = x + 10, by = y + 70, w = 86, h = 40;
        [[bx, s.imp, 'var(--muted)', s.impL, 'impose'], [bx + 112, s.res, 'var(--accent)', s.resL, 'measure']].forEach(function (q, j) {
          var d = '';
          if (s.nyq && j === 1) { for (var m = 0; m <= 40; m++) { var a2 = Math.PI * m / 40; d += (m ? 'L' : 'M') + (q[0] + 8 + 30 - 30 * Math.cos(a2)).toFixed(1) + ',' + (by - 30 * Math.sin(a2) * 0.8).toFixed(1); } d += ' L' + (q[0] + w) + ',' + (by - 36); }
          else for (var m2 = 0; m2 <= 60; m2++) { var u = m2 / 60; d += (m2 ? 'L' : 'M') + (q[0] + u * w).toFixed(1) + ',' + (by - q[1](u) * h).toFixed(1); }
          el('line', { x1: q[0], x2: q[0] + w, y1: by + 2, y2: by + 2, stroke: 'var(--line-2)' }, grp);
          el('path', { d: d, fill: 'none', stroke: q[2], 'stroke-width': 1.6 }, grp);
          txt(grp, q[0], by + 2 - h - 2, q[3], '', 'start', { style: 'font-size:9px;fill:' + q[2] });
          txt(grp, q[0] + w, by + 2 - h - 2, q[4], '', 'end', { style: 'font-size:9px;fill:' + q[2] });
        });
        arrow(grp, bx + w + 6, by - 20, bx + 112 - 6, by - 20, 'var(--muted)', 1.2);
        curs.push([el('circle', { r: 3, fill: 'var(--electron)', stroke: 'var(--electron-edge)' }, grp), el('circle', { r: 3, fill: 'var(--electron)', stroke: 'var(--electron-edge)' }, grp), s, bx, by, w, h]);
      } else {
        // post-mortem: the opened cell and a magnifier
        el('rect', { x: x + 14, y: y + 34, width: 60, height: 34, rx: 3, fill: MV('graphite') }, grp); el('rect', { x: x + 14, y: y + 34, width: 60, height: 34, rx: 3, fill: 'none', stroke: '#1C1F23' }, grp);
        [[x + 26, y + 44], [x + 48, y + 56], [x + 62, y + 42]].forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 3.5, fill: '#C9A14A' }, grp); });
        el('circle', { cx: x + 120, cy: y + 50, r: 16, fill: 'rgba(255,255,255,.5)', stroke: 'var(--accent)', 'stroke-width': 2 }, grp); el('line', { x1: x + 132, y1: y + 62, x2: x + 146, y2: y + 76, stroke: 'var(--accent)', 'stroke-width': 3, 'stroke-linecap': 'round' }, grp);
        txt(grp, x + 150, y + 54, 'open, look', '', 'start', { style: 'font-size:9px;fill:var(--accent)' });
      }
      cards.push(card); pressable(grp, function () { sel = k; place(); });
    });
    function place() {
      cards.forEach(function (c, k) { c.setAttribute('stroke', k === sel ? 'var(--accent)' : 'var(--line-2)'); c.setAttribute('stroke-width', k === sel ? 2 : 1); });
      var s = ST[sel];
      read.innerHTML = '<b>' + s.t + '</b> (' + s.where + '). The question: <b>' + s.q + '</b> The thief it helps to catch: ' + s.thief + '.';
    }
    function tick(dt) {
      ph = (ph + dt / 6) % 1;
      curs.forEach(function (c) { var s = c[2], bx = c[3], by = c[4], w = c[5], h = c[6]; c[0].setAttribute('cx', bx + ph * w); c[0].setAttribute('cy', by - s.imp(ph) * h); if (s.nyq) { var a2 = Math.PI * Math.min(1, ph * 1.3); c[1].setAttribute('cx', ph < 0.77 ? bx + 112 + 8 + 30 - 30 * Math.cos(a2) : bx + 112 + 68 + (ph - 0.77) / 0.23 * 18); c[1].setAttribute('cy', ph < 0.77 ? by - 30 * Math.sin(a2) * 0.8 : by - (ph - 0.77) / 0.23 * 36); } else { c[1].setAttribute('cx', bx + 112 + ph * w); c[1].setAttribute('cy', by - s.res(ph) * h); } });
    }
    steps(fig, [
      { text: 'Every measurement <b>imposes</b> one thing on the cell and <b>measures</b> another: a current and read the voltage, or a voltage and read the current. The left trace in each card is what we impose, the right what comes back.', on: function () { sel = 0; place(); } },
      { text: 'Three measurements impose a <b>current</b>: steady for cycling, a step for the pulse, pulses and rests for GITT. Two impose a <b>potential</b>: a sweep for voltammetry, a small sine at many frequencies for impedance.', on: function () { sel = 2; place(); } },
      { text: 'The sixth does neither: when the outside is not enough, the cell is opened. Choose the question first; the handbook takes the six in this order.', on: function () { sel = 5; place(); } }
    ]);
    place();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.4 });
    bind(fig, loop);
  });
  /* figs-11ct.js */
  register('f11-28', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sel = -1;
    // the parts, bottom to top, in the order of the stack: [name, colour fill, width, height, note]
    var PARTS = [
      ['Can', M('steel'), 300, 14, 'The <b>can</b> is the negative terminal of the finished cell; inside it is coated with aluminium. It goes in first, and the gasket sits in it with its narrower opening downwards.'],
      ['Gasket', MV('polymer'), 300, 10, 'The <b>gasket</b> is the polymer ring that insulates the can from the cap and seals the cell when it is crimped. Separate gaskets have slightly different top and bottom diameters: the smaller aperture faces down, on the can.'],
      ['Positive electrode, 14 mm', MV('lco'), 196, 10, 'The <b>positive electrode</b>: a 14 mm disc punched from the laminate, dried under vacuum for at least 12 h (120 °C for a PVDF binder), weighed, and placed with its coating upwards. Its active mass comes from the disc mass, the mean mass of bare collector discs and the formulation (L1.3).'],
      ['Separator and 100 µL of electrolyte', MV('separator'), 240, 8, 'The <b>separator</b>, a polypropylene-polyethylene trilayer, never dried above 50 °C. Once it is in place, <b>100 µL</b> of electrolyte is dispensed onto it with a calibrated pipette; the electrodes are aligned through the translucent separator to limit edge effects.'],
      ['Lithium, 15 mm, 200 µm', M('lithium'), 210, 8, 'The <b>lithium disc</b>: 15 mm across and 200 µm thick, punched with its own punch on a PEEK or POM base, never on PTFE. Only shiny, smooth, grey lithium is used; black, white or reddish surfaces are rejected.'],
      ['Spacer, 16 mm, 0.3 mm', M('steel'), 224, 6, 'Two <b>spacers</b>, 16 mm across and 0.3 mm thick, fill the height of the can so that the stack is pressed. A spacer with a soldered wave washer can replace the top one.'],
      ['Spacer', M('steel'), 224, 6, 'The second spacer.'],
      ['Wave washer', M('steel'), 200, 10, 'The <b>wave washer</b> is the spring that keeps the stack under pressure after crimping.'],
      ['Cap', M('steel'), 290, 12, 'The <b>cap</b> closes the cell and becomes the positive terminal. The whole stack is then crimped at about 500 psi (3.4 MPa): undershooting is preferred to overshooting, which can short the cell.']
    ];
    var SHORT = ['Can', 'Gasket', 'Positive electrode', 'Separator, electrolyte', 'Lithium', 'Spacer', 'Spacer', 'Wave washer', 'Cap'];
    var ys = [], y = 258, shapes = [], CX = 330;
    PARTS.forEach(function (p, k) { y -= p[3] + 8; ys.push(y); });
    PARTS.forEach(function (p, k) {
      var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(p[0]), style: 'cursor:pointer' }, g);
      var x = CX - p[2] / 2;
      // a thin disc drawn in slight perspective: an ellipse top, a side face
      el('ellipse', { cx: CX, cy: ys[k] + p[3], rx: p[2] / 2, ry: 7, fill: p[1], stroke: 'rgba(20,23,28,.25)' }, grp);
      el('rect', { x: x, y: ys[k], width: p[2], height: p[3], fill: p[1], stroke: 'rgba(20,23,28,.25)' }, grp);
      el('ellipse', { cx: CX, cy: ys[k], rx: p[2] / 2, ry: 7, fill: p[1], stroke: 'rgba(20,23,28,.35)' }, grp);
      if (k === 0) el('ellipse', { cx: CX, cy: ys[k], rx: p[2] / 2 - 10, ry: 5, fill: 'none', stroke: 'rgba(20,23,28,.2)' }, grp);
      var hl = el('ellipse', { cx: CX, cy: ys[k] + p[3] / 2, rx: p[2] / 2 + 6, ry: 7 + p[3] / 2, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-opacity': 0 }, grp);
      txt(grp, 16, ys[k] + p[3] / 2 + 4, (k + 1) + '  ' + SHORT[k], '', 'start', { style: 'font-size:11px' });
      shapes.push(hl);
      pressable(grp, function () { sel = k; place(); });
    });
    txt(g, 16, 40, 'stacked in this order', 'tag', 'start', { style: 'font-size:11px' });
    arrow(g, 150, 262, 150, 52, 'var(--muted)', 1.2);
    txt(g, CX, 284, 'CR2032: 20 mm across, 3.2 mm tall', '', 'middle', { style: 'font-size:11px' });
    badge(g, 490, 100, 1); badge(g, 490, 200, 2); badge(g, 180, 30, 3);
    function place() {
      shapes.forEach(function (s, k) { s.setAttribute('stroke-opacity', k === sel ? 1 : 0); });
      read.innerHTML = sel < 0 ? 'Tap a part. Nine parts, in the order they go into the can; a half cell against lithium metal, the format most electrode studies start with.' : PARTS[sel][4];
    }
    steps(fig, [
      { text: 'A <b>half cell</b>: the electrode under study faces a disc of lithium metal, which supplies and takes lithium at a nearly fixed potential. Everything is assembled in an argon glovebox with oxygen and water below 0.1 ppm, because lithium reacts with both, and with nitrogen.', on: function () { sel = 4; place(); } },
      { text: 'The <b>order matters</b>: can, gasket, electrode, separator with the electrolyte dropped onto it, lithium, two spacers, wave washer, cap. Then the crimp, at about 500 psi. A cell is not a cell until it is crimped.', on: function () { sel = 0; place(); } },
      { text: 'Everything is <b>recorded</b>: the disc masses, the diameters, the electrolyte volume, the crimp pressure, the open-circuit voltage as assembled, the assembler and the date. The metadata is what later tells a bad batch from a bad idea.', on: function () { sel = 8; place(); } }
    ]);
    place();
  });
  register('f11-29', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var sM = fig.querySelector('.dm'), sMv = fig.querySelector('.dm-val'), sF = fig.querySelector('.fa'), sFv = fig.querySelector('.fa-val'), sC = fig.querySelector('.cr'), sCv = fig.querySelector('.cr-val');
    var mb = fig.querySelectorAll('button[data-mat]'), mat = 'lfp';
    var MATS = { lfp: { n: 1, M: 157.76, name: 'LiFePO₄', q: null }, lco: { n: 1, M: 97.87, name: 'LiCoO₂', q: null }, gr: { n: 1, M: 72.07, name: 'graphite (LiC₆)', q: null } };
    Object.keys(MATS).forEach(function (k) { MATS[k].q = P.specificCapacity(MATS[k].n, MATS[k].M); });
    var D = 14, mCol = 6.2;   // a 14 mm disc; the mean mass of ten bare collector discs, in mg (15 µm aluminium foil: about 6 mg)
    // the chain of four boxes
    var BOX = [[20, 'disc mass', 'minus the collector'], [150, 'active mass', '× active fraction'], [280, 'areal loading', 'per cm² of disc'], [410, 'current at C-rate', 'from the capacity']];
    var vals = BOX.map(function (b, k) {
      el('rect', { x: b[0], y: 40, width: 100, height: 100, rx: 10, fill: 'var(--panel-2)', stroke: 'var(--line)' }, g);
      txt(g, b[0] + 50, 60, b[1], '', 'middle', { style: 'font-size:11px' });
      if (k < 3) arrow(g, b[0] + 102, 86, b[0] + 128, 86, 'var(--muted)', 1.4);
      return [txt(g, b[0] + 50, 92, '', 'strong', 'middle', { style: 'font-size:16px' }), txt(g, b[0] + 50, 112, b[2], '', 'middle', { style: 'font-size:10px' }), txt(g, b[0] + 50, 128, '', '', 'middle', { style: 'font-size:10px' })];
    });
    // the disc, with its diameter
    el('circle', { cx: 100, cy: 210, r: 42, fill: MV('lco'), stroke: '#1C1F23' }, g);
    el('line', { x1: 58, x2: 142, y1: 258, y2: 258, stroke: 'var(--text)', 'stroke-width': 1 }, g); txt(g, 100, 272, D + ' mm, ' + (Math.PI * 0.49).toFixed(2) + ' cm²', '', 'middle', { style: 'font-size:11px' });
    var tq = txt(g, 300, 180, '', '', 'start'), tq2 = txt(g, 300, 200, '', '', 'start'), tq3 = txt(g, 300, 220, '', 'strong', 'start'), tq4 = txt(g, 300, 244, '', '', 'start', { style: 'font-size:11px' }), tq5 = txt(g, 300, 260, '', '', 'start', { style: 'font-size:11px' });
    badge(g, 150, 160, 1); badge(g, 470, 160, 2); badge(g, 280, 150, 3);
    function place() {
      Array.prototype.forEach.call(mb, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-mat') === mat)); });
      var m = MATS[mat], mD = +sM.value, fA = +sF.value / 100, cr = Math.pow(10, +sC.value);
      setSvgText(sMv, mD.toFixed(1) + ' mg'); setSvgText(sFv, sF.value + ' %'); setSvgText(sCv, cr >= 1 ? cr.toFixed(cr >= 2 ? 0 : 1) + 'C' : 'C/' + (1 / cr).toFixed(0));
      var mA = P.lab.activeMass(mD / 1000, mCol / 1000, fA), load = P.lab.arealLoading(mA, D), Qth = m.q * mA, I = Qth * cr;   // mAh (mAh/g × g), mA
      setSvgText(vals[0][0], mD.toFixed(1) + ' mg'); setSvgText(vals[0][2], 'collector ' + mCol.toFixed(1) + ' mg');
      setSvgText(vals[1][0], (mA * 1000).toFixed(2) + ' mg'); setSvgText(vals[1][2], (fA * 100).toFixed(0) + ' % of the coating');
      setSvgText(vals[2][0], load.toFixed(2) + ' mg/cm²'); setSvgText(vals[2][2], (load * m.q / 1000).toFixed(2) + ' mAh/cm²');
      setSvgText(vals[3][0], (I >= 1 ? I.toFixed(2) + ' mA' : (I * 1000).toFixed(0) + ' µA')); setSvgText(vals[3][2], sCv.textContent + ', ' + (1 / cr).toFixed(1) + ' h');
      setSvgText(tq, m.name + ': n = ' + m.n + ', M = ' + m.M.toFixed(2) + ' g/mol');
      setSvgText(tq2, 'theoretical ' + m.q.toFixed(0) + ' mAh/g (nF/3.6M)');
      setSvgText(tq3, 'disc capacity ' + Qth.toFixed(3) + ' mAh');
      setSvgText(tq4, 'at ' + sCv.textContent + ' the current is ' + (I >= 1 ? I.toFixed(3) + ' mA' : (I * 1000).toFixed(0) + ' µA'));
      setSvgText(tq5, 'for ' + (1 / cr).toFixed(1) + ' h per half cycle');
      read.innerHTML = 'A ' + D + ' mm disc of ' + m.name + ' weighing ' + mD.toFixed(1) + ' mg, on a collector of ' + mCol.toFixed(1) + ' mg, with ' + (fA * 100).toFixed(0) + ' % active material: <b>' + (mA * 1000).toFixed(2) + ' mg</b> of active material, a loading of <b>' + load.toFixed(2) + ' mg/cm²</b> (' + (load * m.q / 1000).toFixed(2) + ' mAh/cm²), a theoretical capacity of <b>' + Qth.toFixed(3) + ' mAh</b>, and a current of <b>' + (I >= 1 ? I.toFixed(3) + ' mA' : (I * 1000).toFixed(0) + ' µA') + '</b> at ' + sCv.textContent + '. The practical capacity, measured in a slow first cycle, is what later C-rates are usually defined from.';
    }
    Array.prototype.forEach.call(mb, function (bt) { on(bt, 'click', function () { mat = bt.getAttribute('data-mat'); place(); }); });
    on(sM, 'input', place); on(sF, 'input', place); on(sC, 'input', place);
    steps(fig, [
      { text: 'Weigh the <b>disc</b>, subtract the mean mass of at least ten bare collector discs punched with the same punch, and multiply by the active fraction of the formulation: that is the active mass.' },
      { text: 'The <b>C-rate current</b> follows from the capacity: 1C discharges the capacity in one hour, C/10 in ten. Set the rate here and read the current to type into the cycler.' },
      { text: 'The theoretical capacity nF/M is a ceiling. Define the C-rate from the <b>practical</b> capacity of a slow first cycle, and say which one you used; it changes every number that follows.' }
    ]);
    place();
  });
  register('f11-30', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sv = fig.querySelector('.ocv'), svv = fig.querySelector('.ocv-val');
    // a gauge of the OCV, with the zones of NPL GPG 153 for NMC 811 against lithium
    var b = { x0: 60, y0: 120, x1: 460, y1: 120 }, X = function (v) { return b.x0 + (v - 1) / 2.6 * (b.x1 - b.x0); };
    el('rect', { x: X(1), y: 104, width: X(2) - X(1), height: 32, fill: 'var(--heat)', 'fill-opacity': .25 }, g);
    el('rect', { x: X(2), y: 104, width: X(3.18) - X(2), height: 32, fill: 'var(--warm, #F0A35B)', 'fill-opacity': .3 }, g);
    el('rect', { x: X(3.18), y: 104, width: X(3.45) - X(3.18), height: 32, fill: 'var(--second)', 'fill-opacity': .3 }, g);
    el('rect', { x: X(3.45), y: 104, width: X(3.6) - X(3.45), height: 32, fill: 'var(--warm, #F0A35B)', 'fill-opacity': .3 }, g);
    [1, 1.5, 2, 2.5, 3, 3.18, 3.45].forEach(function (v) { el('line', { x1: X(v), x2: X(v), y1: 136, y2: 142, stroke: 'var(--line-2)' }, g); txt(g, X(v), 156, String(v), '', 'middle', { style: 'font-size:11px' }); });
    txt(g, X(1.5), 96, 'discard', 'heat', 'middle', { style: 'font-size:11px' }); txt(g, X(2.6), 96, 'cycles, but seldom reproducible', '', 'middle', { style: 'font-size:11px' }); txt(g, X(3.31), 84, 'in range', 'cyan', 'middle', { style: 'font-size:11px' });
    txt(g, b.x1, 172, 'open-circuit voltage as assembled, V vs Li⁺/Li (NMC 811)', '', 'end', { style: 'font-size:11px' });
    var needle = el('path', { d: 'M0,-14 L6,0 L-6,0 Z', fill: 'var(--text)' }, g), nt = txt(g, 0, 60, '', 'strong', 'middle');
    // the crimp gauge
    var cb = { x0: 60, x1: 460, y: 232 }, Xp = function (p) { return cb.x0 + p / 900 * (cb.x1 - cb.x0); };
    el('rect', { x: Xp(0), y: 220, width: Xp(900) - Xp(0), height: 24, rx: 4, fill: 'var(--panel-2)', stroke: 'var(--line)' }, g);
    el('rect', { x: Xp(450), y: 220, width: Xp(550) - Xp(450), height: 24, fill: 'var(--second)', 'fill-opacity': .3 }, g);
    el('rect', { x: Xp(700), y: 220, width: Xp(900) - Xp(700), height: 24, fill: 'var(--heat)', 'fill-opacity': .25 }, g);
    [0, 300, 500, 700, 900].forEach(function (p) { el('line', { x1: Xp(p), x2: Xp(p), y1: 244, y2: 250, stroke: 'var(--line-2)' }, g); txt(g, Xp(p), 264, String(p), '', 'middle', { style: 'font-size:11px' }); });
    txt(g, Xp(500), 212, 'target 500 psi', 'cyan', 'middle', { style: 'font-size:11px' }); txt(g, Xp(800), 212, 'over 700: shorts, stuck cells', 'heat', 'middle', { style: 'font-size:11px' });
    txt(g, b.x1, 282, 'crimp pressure, psi (3.4 MPa at 500)', '', 'end', { style: 'font-size:11px' });
    badge(g, 30, 120, 1); badge(g, 30, 232, 2); badge(g, 486, 60, 3);
    function place() {
      var v = +sv.value; setSvgText(svv, v.toFixed(2) + ' V');
      needle.setAttribute('transform', 'translate(' + X(v).toFixed(1) + ',102)'); nt.setAttribute('x', X(v)); setSvgText(nt, v.toFixed(2) + ' V');
      var verdict = v <= 2 ? 'at or below 2.00 V: <b>discard</b>. Something is shorting the cell, or the lithium is bad.' : v < 3.18 ? 'between 2.00 and 3.18 V: the cell may cycle, but such cells are often not reproducible, for no obvious reason. Cycle it at your own risk, and say so in the notes.' : v <= 3.45 ? '<b>in range</b> (3.18 to 3.45 V for NMC 811 with a carbonate electrolyte and a Celgard 2325 separator). Label the can with the cell number in permanent marker and bag it.' : 'above the expected range for this chemistry: check the wiring of the meter and the electrode. Every chemistry has its own range; record yours.';
      read.innerHTML = 'Open-circuit voltage as assembled, ' + v.toFixed(2) + ' V: ' + verdict;
    }
    on(sv, 'input', place);
    steps(fig, [
      { text: 'Before any cycling, measure the <b>open-circuit voltage</b> of the fresh cell with a hand-held meter and compare it with the range expected for its chemistry. A low value means a short or bad lithium; discard rather than hope.' },
      { text: 'The <b>crimp</b> seals the cell: too little pressure and it leaks or loses contact, too much and the stack shorts. Aim for the target and record the estimate when it falls short.' },
      { text: 'Then <b>clean</b> the cell in the glovebox with a wipe of DMC or acetone: salt residue on the outside turns into HF in air and corrodes the can and the holders. Check the holders before every run.' }
    ]);
    place();
  });
  register('f11-31', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var sc = fig.querySelector('.pc'), scv = fig.querySelector('.pc-val'), sr = fig.querySelector('.pr'), srv = fig.querySelector('.pr-val');
    var U = function (x) { return P.lfpOcp(1 - x) - P.m9.graphiteU(x); }, Q = 0.002, Vmax = 3.8, Vmin = 2.5, TAU = 0.04;
    var b = { x0: 58, y0: 140, x1: 500, y1: 30 }, bi = { x0: 58, y0: 250, x1: 500, y1: 196 }, gv = el('g', {}, g), gi = el('g', {}, g);
    var fV, fI, pv, pi, zones = [], labs = [];
    badge(g, 100, 70, 1); badge(g, 330, 70, 2); badge(g, 470, 210, 3);
    function place() {
      var cr = Math.pow(10, +sc.value), R = +sr.value;
      setSvgText(scv, cr >= 1 ? cr.toFixed(cr >= 2 ? 0 : 1) + 'C' : 'C/' + (1 / cr).toFixed(0)); setSvgText(srv, R + ' Ω');
      var o = P.lab.cccv({ U: U, Q: Q, R: R, crate: cr, Vmax: Vmax, Vmin: Vmin, cvRate: 0.05, dt: 1 / 1200, tau: TAU }), T = o.t[o.t.length - 1];
      clear(gv); clear(gi);
      var xt = [0, 0.25, 0.5, 0.75, 1].map(function (f) { return [f * T, (f * T).toFixed(T >= 4 ? 0 : 1)]; });
      fV = cvFrame(gv, b, [0, T], [2.4, 4.1], { xt: xt, yt: [[2.5, '2.5'], [3.0, '3.0'], [3.5, '3.5']], yl: 'cell voltage, V' });
      fI = cvFrame(gi, bi, [0, T], [-Q * cr * 1100, Q * cr * 1100], { xt: xt, yt: [[-Q * cr * 1000, '−' + (Q * cr * 1000).toFixed(1)], [0, '0'], [Q * cr * 1000, (Q * cr * 1000).toFixed(1)]], zero: true, xl: 'time, h', yl: 'current, mA' });
      el('line', { x1: b.x0, x2: b.x1, y1: fV.Y(Vmax), y2: fV.Y(Vmax), stroke: 'var(--line-2)', 'stroke-dasharray': '4 3' }, gv); txt(gv, b.x1 - 4, fV.Y(Vmax) + 12, 'upper cut-off ' + Vmax + ' V', '', 'end', { style: 'font-size:10px' });
      el('line', { x1: b.x0, x2: b.x1, y1: fV.Y(Vmin), y2: fV.Y(Vmin), stroke: 'var(--line-2)', 'stroke-dasharray': '4 3' }, gv); txt(gv, b.x1 - 4, fV.Y(Vmin) - 4, 'lower cut-off ' + Vmin + ' V', '', 'end', { style: 'font-size:10px' });
      // the phases, shaded
      var tcc = o.Qcc / (Q * cr), tcv = tcc, tdis0 = T, k;
      for (k = 0; k < o.t.length; k++) { if (o.I[k] > 0) tcv = o.t[k]; if (o.I[k] < 0) { tdis0 = o.t[k]; break; } }
      [[0, tcc, 'CC charge', 'var(--accent)'], [tcc, tcv, 'CV', 'var(--second)'], [tcv, tdis0, 'rest', 'var(--muted)'], [tdis0, T, 'CC discharge', 'var(--heat)']].forEach(function (z) {
        el('rect', { x: fV.X(z[0]), y: b.y1, width: Math.max(0, fV.X(z[1]) - fV.X(z[0])), height: b.y0 - b.y1, fill: z[3], 'fill-opacity': .06 }, gv);
        if (fV.X(z[1]) - fV.X(z[0]) > 24) txt(gv, (fV.X(z[0]) + fV.X(z[1])) / 2, b.y1 + 12, z[2], '', 'middle', { style: 'font-size:10px;fill:' + z[3] });
      });
      var step = Math.max(1, Math.floor(o.t.length / 600)), ts = [], vs = [], is = [];
      for (k = 0; k < o.t.length; k += step) { ts.push(o.t[k]); vs.push(o.V[k]); is.push(o.I[k] * 1000); }
      el('path', { d: cvPath(ts, vs, fV.X, fV.Y), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }, gv);
      el('path', { d: cvPath(ts, is, fI.X, fI.Y), fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2 }, gi);
      var cvShare = 100 * o.Qcv / o.Qch;
      read.innerHTML = 'At ' + scv.textContent + ' behind ' + R + ' Ω, the constant-current charge reaches ' + Vmax + ' V after ' + (o.Qcc * 1000).toFixed(2) + ' mAh; the constant-voltage hold adds <b>' + (o.Qcv * 1000).toFixed(2) + ' mAh (' + cvShare.toFixed(0) + ' %)</b> before the current falls to C/20. After a rest the discharge returns ' + (o.Qdis * 1000).toFixed(2) + ' mAh. Illustrative: a 2 mAh LiFePO₄ | graphite cell as one resistance in series with its open-circuit curve, the surface of the particles leading the average in proportion to the current; the model has no side reactions; what the discharge does not return is lithium left behind by the cut-off, which the next cycle would recover, not a loss.';
    }
    on(sc, 'input', place); on(sr, 'input', place);
    steps(fig, [
      { text: 'A cycle has four parts. <b>Constant current</b> until the upper cut-off; the voltage rises with the state of charge plus the i R drop.', on: function () { sc.value = 0; sr.value = 60; place(); } },
      { text: 'At the cut-off the cycler <b>holds the voltage</b> and the current decays; what flows in now is charge the i R drop had hidden. The hold ends at a current limit, C/20 here. The faster the rate or the larger the resistance, the larger its share.', on: function () { sc.value = 0; sr.value = 150; place(); } },
      { text: 'A <b>rest</b>, then a constant-current <b>discharge</b> to the lower cut-off. Capacity is the current times the time; Coulombic efficiency is the discharge capacity over the charge capacity. Report the window, the rates, the rest and the temperature with every number.', on: function () { sc.value = -1; sr.value = 60; place(); } }
    ]);
    place();
  });
  register('f11-32', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sce = fig.querySelector('.ce'), scev = fig.querySelector('.ce-val');
    var b = { x0: 58, y0: 236, x1: 330, y1: 34 }, fr = cvFrame(g, b, [0, 1000], [0.5, 1.02], { xt: [[0, '0'], [250, '250'], [500, '500'], [750, '750'], [1000, '1000']], yt: [[0.5, '50'], [0.6, '60'], [0.7, '70'], [0.8, '80'], [0.9, '90'], [1, '100']], xl: 'cycles', yl: 'capacity kept, % of the first' });
    el('line', { x1: b.x0, x2: b.x1, y1: fr.Y(0.8), y2: fr.Y(0.8), stroke: 'var(--heat)', 'stroke-dasharray': '4 3' }, g); txt(g, b.x1 - 2, fr.Y(0.8) - 4, '80 %: a common end of life', 'heat', 'end', { style: 'font-size:10px' });
    var REF = [[0.99, '99 %'], [0.995, '99.5 %'], [0.999, '99.9 %'], [0.9995, '99.95 %'], [0.9999, '99.99 %']];
    function curve(ce) { var d = '', on = false; for (var n = 0; n <= 1000; n += 5) { var v = P.lab.retention(ce, n); if (v < 0.5) break; d += (on ? 'L' : 'M') + fr.X(n).toFixed(1) + ',' + fr.Y(v).toFixed(1); on = true; } return d; }
    REF.forEach(function (r, k) { el('path', { d: curve(r[0]), fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 1.2 }, g); var lv = [0.62, 0.72, 0.56, 0, 0][k], nl = lv ? P.lab.cyclesTo(r[0], lv) : 1000, yv = lv || P.lab.retention(r[0], 1000); txt(g, fr.X(nl) + (lv ? 5 : -3), fr.Y(yv) + (lv ? 4 : (k === 4 ? -5 : 12)), r[1], '', lv ? 'start' : 'end', { style: 'font-size:10px' }); });
    var cur = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g), dot = el('circle', { r: 5, fill: 'var(--accent)', stroke: '#fff' }, g);
    // the right panel: the loss per cycle as a bar you can barely see
    var pb = { x0: 380, y0: 236, x1: 500, y1: 34 }, pf = cvFrame(g, pb, [0, 1], [0, 1], { yt: [[0, '0'], [0.5, '50'], [1, '100']], yl: 'one cycle, %' });
    el('rect', { x: pf.X(0.2), y: pf.Y(1), width: pf.X(0.8) - pf.X(0.2), height: pf.Y(0) - pf.Y(1), fill: 'var(--accent)', 'fill-opacity': .18 }, g);
    var lost = el('rect', { x: pf.X(0.2), width: pf.X(0.8) - pf.X(0.2), fill: 'var(--heat)' }, g), lt = txt(g, pf.X(0.5), pf.Y(1) + 20, '', 'heat', 'middle', { style: 'font-size:10px' });
    txt(g, pf.X(0.5), pf.Y(0) + 16, 'charged', '', 'middle', { style: 'font-size:11px' });
    badge(g, fr.X(120), fr.Y(0.93), 1); badge(g, pf.X(0.5), pf.Y(0.45), 2); badge(g, fr.X(560), fr.Y(0.58), 3);
    function place() {
      var ce = +sce.value / 100; setSvgText(scev, (+sce.value).toFixed(2) + ' %');
      cur.setAttribute('d', curve(ce));
      var n80 = P.lab.cyclesTo(ce, 0.8), nd = Math.min(1000, n80); dot.setAttribute('cx', fr.X(nd)); dot.setAttribute('cy', fr.Y(Math.max(0.5, P.lab.retention(ce, nd)))); dot.style.display = n80 > 1000 ? 'none' : '';
      var h = Math.max(1.5, (1 - ce) * (pf.Y(0) - pf.Y(1))); lost.setAttribute('y', pf.Y(1)); lost.setAttribute('height', h); setSvgText(lt, 'lost: ' + ((1 - ce) * 100).toFixed(2) + ' %');
      read.innerHTML = 'If every cycle returns <b>' + (+sce.value).toFixed(2) + ' %</b> of what went in and loses the rest for good, the capacity after n cycles is CE<sup>n</sup>: <b>' + (P.lab.retention(ce, 100) * 100).toFixed(1) + ' % after 100 cycles</b>, ' + (P.lab.retention(ce, 500) * 100).toFixed(1) + ' % after 500, and 80 % is reached after about <b>' + (n80 > 20000 ? 'more than 20 000' : n80.toFixed(0)) + ' cycles</b>. Telling 99.90 from 99.95 % needs the charge measured to better than 0.05 %; a cycler that is 0.1 % accurate cannot, and ten cycles of it cannot rank two materials by cycle life. This is a simple sum, not a model of any mechanism.';
    }
    on(sce, 'input', place);
    steps(fig, [
      { text: 'Coulombic efficiency is the <b>discharge capacity over the charge capacity</b> of a cycle. Below 100 %, some of the charge went into side reactions, such as the growth of the SEI, rather than into lithium that comes back.' },
      { text: 'A loss of 0.1 % per cycle is invisible in one cycle; the bar on the right barely shows it. It <b>compounds</b>: the curves on the left are CE<sup>n</sup> for five values of CE.' },
      { text: 'So the first cycles do not predict the thousandth unless CE is measured with high precision, under controlled temperature, at a fixed rate and window. A fresh cell also loses extra charge in its <b>first cycle</b>, when the SEI forms; report the first-cycle efficiency separately.' }
    ]);
    place();
  });
  register('f11-33', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), st = fig.querySelector('.rt'), stv = fig.querySelector('.rt-val');
    var U = function (x) { return P.lfpOcp(1 - x) - P.m9.graphiteU(x); }, Q = 0.002, Vmax = 3.8, Vmin = 2.5;
    var RATES = [0.1, 0.2, 0.5, 1, 2, 5, 0.1], R25 = 60, TAU25 = 0.04, Ea = 40e3;   // resistance and lag both follow an Arrhenius law: illustrative
    var b = { x0: 58, y0: 236, x1: 300, y1: 34 }, fr = cvFrame(g, b, [0, 35], [0, 2.2], { xt: [[0, '0'], [10, '10'], [20, '20'], [30, '30']], yt: [[0, '0'], [0.5, '0.5'], [1, '1.0'], [1.5, '1.5'], [2, '2.0']], xl: 'cycle', yl: 'discharge capacity, mAh' });
    RATES.forEach(function (r, k) { txt(g, fr.X(k * 5 + 2.5), b.y1 + 12, r >= 1 ? r + 'C' : 'C/' + (1 / r), '', 'middle', { style: 'font-size:10px' }); if (k) el('line', { x1: fr.X(k * 5), x2: fr.X(k * 5), y1: b.y1, y2: b.y0, stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g); });
    var gp = el('g', {}, g);
    var pb = { x0: 360, y0: 236, x1: 500, y1: 34 }, pf = cvFrame(g, pb, [2.4, 3.8], [0, 2.1], { xt: [[2.5, '2.5'], [3, '3.0'], [3.5, '3.5']], yt: [[0, '0'], [1, '1'], [2, '2']], xl: 'V', yl: 'discharge curves' });
    var gc = el('g', {}, g);
    badge(g, fr.X(27), fr.Y(1.5), 1); badge(g, fr.X(33), fr.Y(0.5), 2); badge(g, pf.X(2.7), pf.Y(1.8), 3);
    function place() {
      var T = +st.value; setSvgText(stv, T + ' °C');
      var ar = Math.exp(Ea / 8.314 * (1 / (T + 273.15) - 1 / 298.15)), R = R25 * ar, tau = TAU25 * ar;
      clear(gp); clear(gc);
      var caps = [], COL = ['#9DB4F0', '#7C9BEB', '#5A80E3', '#3A66D8', '#1F48D6', '#15348F', '#9DB4F0'];
      RATES.forEach(function (r, k) {
        var o = P.lab.cccv({ U: U, Q: Q, R: R, crate: r, Vmax: Vmax, Vmin: Vmin, cvRate: 0.05, dt: 1 / 600, tau: tau }), q = o.Qdis * 1000; caps.push(q);
        for (var c = 0; c < 5; c++) el('circle', { cx: fr.X(k * 5 + c + 0.5), cy: fr.Y(q), r: 3.5, fill: COL[k], stroke: '#fff' }, gp);
        // the discharge curve: capacity against voltage
        var d = '', acc = 0, first = true;
        for (var m = 0; m < o.t.length; m++) if (o.I[m] < 0) { acc += -o.I[m] * (o.t[m] - o.t[m - 1]) * 1000; if (m % 4 === 0) { d += (first ? 'M' : 'L') + pf.X(o.V[m]).toFixed(1) + ',' + pf.Y(acc).toFixed(1); first = false; } }
        if (k < 6) el('path', { d: d, fill: 'none', stroke: COL[k], 'stroke-width': 1.6 }, gc);
      });
      read.innerHTML = 'At ' + T + ' °C the cell&#8217;s resistance is ' + R.toFixed(0) + ' Ω in this model, and its surface lag ' + (tau * 60).toFixed(1) + ' min at 1C. The discharge capacity falls from ' + caps[0].toFixed(2) + ' mAh at C/10 to <b>' + caps[5].toFixed(2) + ' mAh at 5C</b>, because the i R drop reaches the lower cut-off earlier; back at C/10 the cell returns <b>' + caps[6].toFixed(2) + ' mAh</b>, so nothing was lost, only hidden by polarization. Illustrative: the resistance and the lag of the particle surface behind its average both follow an Arrhenius law with 40 kJ/mol, a choice of ours; the cell is that of L1.5.';
    }
    on(st, 'input', place);
    steps(fig, [
      { text: 'A <b>rate test</b> runs five cycles at each rate, from slow to fast. The capacity falls with rate because the i R drop, and the concentration polarization behind it, bring the voltage to the cut-off before the electrode is empty.' },
      { text: 'The last step <b>returns to the slow rate</b>. If the capacity comes back, the fast cycles cost nothing lasting; if it does not, they did damage, such as plating on graphite.' },
      { text: 'Lower the <b>temperature</b>: the resistance rises, every curve sags, and the fast rates lose most. That is why a test without a temperature chamber cannot be compared with another laboratory&#8217;s.' }
    ]);
    place();
  });
  /* figs-11cv.js */
  function cvFrame(g, b, xr, yr, o) {
    o = o || {};
    var X = function (x) { return b.x0 + (x - xr[0]) / (xr[1] - xr[0]) * (b.x1 - b.x0); };
    var Y = function (y) { return b.y0 - (y - yr[0]) / (yr[1] - yr[0]) * (b.y0 - b.y1); };
    el('line', { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0, stroke: 'var(--line-2)' }, g);
    el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, stroke: 'var(--line-2)' }, g);
    (o.xt || []).forEach(function (t) { var x = X(t[0]); el('line', { x1: x, x2: x, y1: b.y0, y2: b.y0 + 4, stroke: 'var(--line-2)' }, g); if (o.grid) el('line', { x1: x, x2: x, y1: b.y0, y2: b.y1, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); txt(g, x, b.y0 + 16, t[1], '', 'middle'); });
    (o.yt || []).forEach(function (t) { var y = Y(t[0]); el('line', { x1: b.x0 - 4, x2: b.x0, y1: y, y2: y, stroke: 'var(--line-2)' }, g); if (o.grid) el('line', { x1: b.x0, x2: b.x1, y1: y, y2: y, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); txt(g, b.x0 - 7, y + 4, t[1], '', 'end'); });
    if (o.zero) el('line', { x1: b.x0, x2: b.x1, y1: Y(0), y2: Y(0), stroke: 'var(--line-2)', 'stroke-dasharray': '4 3' }, g);
    if (o.xl) txt(g, b.x1, b.y0 + 32, o.xl, '', 'end');
    if (o.yl) txt(g, b.x0 - 6, b.y1 - 10, o.yl, '', 'start');
    return { X: X, Y: Y };
  }
  function cvPath(xs, ys, X, Y, from, to) {
    var d = '', a = from || 0, z = to === undefined ? xs.length : to;
    for (var k = a; k < z; k++) d += (k === a ? 'M' : 'L') + X(xs[k]).toFixed(1) + ',' + Y(ys[k]).toFixed(1);
    return d;
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
  function polyD(xs, ys) { var d = ''; for (var i = 0; i < xs.length; i++) d += (i ? 'L' : 'M') + xs[i].toFixed(1) + ',' + ys[i].toFixed(1); return d; }
  var TOY = {
    neg: [{ U: 0.21, w: 0.40, xi: 0.010 }, { U: 0.12, w: 0.50, xi: 0.008 }, { U: 0.55, w: 0.10, xi: 0.12 }],
    pos: [{ U: 3.70, w: 0.30, xi: 0.06 }, { U: 3.92, w: 0.30, xi: 0.012 }, { U: 4.10, w: 0.22, xi: 0.015 }, { U: 4.45, w: 0.18, xi: 0.08 }]
  };
  function toyX(st, U) { var x = 0; st.forEach(function (s) { x += s.w / (1 + Math.exp((U - s.U) / s.xi)); }); return x; }
  function toyU(st, x) { var lo = -3, hi = 7; for (var n = 0; n < 60; n++) { var m = 0.5 * (lo + hi); if (toyX(st, m) > x) lo = m; else hi = m; } return 0.5 * (lo + hi); }
  register('f5-9', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sLLI = fig.querySelector('.lli'), sLAM = fig.querySelector('.lam'), vLLI = fig.querySelector('.lli-val'), vLAM = fig.querySelector('.lam-val');
    var A = { x0: 50, y0: 132, x1: 290, y1: 28 }, A2 = { x0: 50, y0: 190, x1: 290, y1: 150 }, B = { x0: 50, y0: 352, x1: 290, y1: 226 }, Cb = { x0: 344, y0: 150, x1: 505, y1: 28 }, D = { x0: 382, y0: 352, x1: 500, y1: 226 };
    var Vlo = 3.0, Vhi = 4.2, Cn0 = 1.15, QMAX = 1.0, DVMAX = 12, DQMAX = 5;
    plotAxes(g, A, { yt: [3.0, 3.6, 4.2], ylo: 2.9, yhi: 4.3, yf: function (v) { return v.toFixed(1); }, ylab: 'cell voltage V, and U_{pos} (thin, blue)' });
    plotAxes(g, A2, { yt: [0, 0.3, 0.6], ylo: -0.02, yhi: 0.7, yf: function (v) { return v.toFixed(1); }, ylab: 'U_{neg} against Li', xlab: 'charge Q →' });
    plotAxes(g, B, { ylab: 'dV/dQ', xlab: 'charge Q →' });
    plotAxes(g, Cb, { ylab: 'dQ/dV' });
    [3.0, 3.6, 4.2].forEach(function (v) { txt(g, Cb.x0 + (v - Vlo) / (Vhi - Vlo) * (Cb.x1 - Cb.x0), Cb.y0 + 15, v.toFixed(1) + (v > 4 ? ' V' : ''), '', v > 4 ? 'end' : 'middle'); });
    el('rect', { x: D.x0, y: D.y1, width: D.x1 - D.x0, height: D.y0 - D.y1, fill: 'none', stroke: 'var(--line-2)' }, g);
    txt(g, D.x1, D.y0 + 15, 'x_neg →', '', 'end'); txt(g, D.x0 - 5, D.y1 + 8, '1 − x_pos', '', 'end');
    var bandG = el('g', {}, g);
    var XD = function (x) { return D.x0 + x * (D.x1 - D.x0); }, YD = function (y) { return D.y0 - y * (D.y0 - D.y1); };
    // plateau bands on the square plot: where each electrode sits on a plateau (|U - Uj| < 2 xi)
    TOY.neg.forEach(function (s) { if (s.xi > 0.05) return; var a = toyX(TOY.neg, s.U + 2 * s.xi), b2 = toyX(TOY.neg, s.U - 2 * s.xi); el('rect', { x: XD(a), y: D.y1, width: XD(b2) - XD(a), height: D.y0 - D.y1, fill: 'var(--second)', 'fill-opacity': '.16' }, bandG); });
    TOY.pos.forEach(function (s) { if (s.xi > 0.05) return; var a = 1 - toyX(TOY.pos, s.U - 2 * s.xi), b2 = 1 - toyX(TOY.pos, s.U + 2 * s.xi); el('rect', { x: D.x0, y: YD(b2), width: D.x1 - D.x0, height: YD(a) - YD(b2), fill: 'var(--accent)', 'fill-opacity': '.16' }, bandG); });
    var lineF = el('line', { stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, g), lineA = el('line', { stroke: 'var(--text)', 'stroke-width': 2 }, g);
    var pVf = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, g), pV = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    var pP = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.4 }, g), pN = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 1.4 }, g), pT = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    var pCf = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, g), pC = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
        var pUp = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.3 }, g), pUn = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 1.8 }, g), pkG = el('g', {}, g);
    var YA2 = function (v) { return A2.y0 - (v + 0.02) / 0.72 * (A2.y0 - A2.y1); };
    var dots = [0, 1, 2, 3].map(function () { return el('circle', { r: 4, 'class': 'ion' }, g); });
    badge(g, A.x0 + 18, A.y1 + 14, 1); badge(g, B.x0 + 18, B.y1 + 14, 2); badge(g, Cb.x0 + 18, Cb.y1 + 14, 3); badge(g, D.x0 - 18, D.y0 - 22, 4);
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
        pts.push({ Q: Q - q0, V: up - un, up: up, un: un, dP: dup, dN: dun, dV: dup + dun, xn: Q / Cn0, yp: 1 - (nLi - Q) / Cp });
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
      pUp.setAttribute('d', polyD(P1.map(function (p) { return XA(p.Q); }), P1.map(function (p) { return YA(Math.min(4.3, p.up)); })));
      pUn.setAttribute('d', polyD(P1.map(function (p) { return XA(p.Q); }), P1.map(function (p) { return YA2(Math.min(0.7, p.un)); })));
      // mark each dV/dQ peak with the colour of the electrode that makes it
      clear(pkG);
      for (var i = 2; i < P1.length - 2; i++) { var d = P1[i].dV; if (d > 1.2 && d > P1[i - 1].dV && d >= P1[i + 1].dV && d > P1[i - 2].dV && d >= P1[i + 2].dV) el('circle', { cx: XB(P1[i].Q), cy: Math.max(B.y1 + 6, YB(d) - 7), r: 3.5, fill: P1[i].dP > P1[i].dN ? 'var(--accent)' : 'var(--second)', stroke: '#fff' }, pkG); }
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
      { text: '<b>dV/dQ</b> is the slope of the curve. The cell’s is simply the sum of the two electrodes’ (blue plus green), so every peak belongs to one electrode: it marks that electrode leaving one plateau for the next.' },
      { text: '<b>dQ/dV</b> turns the curve on its side: charge stored per volt. A peak means the voltage hardly moves while charge flows, which needs <b>both</b> electrodes on a plateau at once.' },
      { text: 'The square plot shows both at once: across, the negative electrode’s lithium; up, the positive’s, inverted. A cell is a straight line. Green bands are the negative’s plateaus, blue bands the positive’s, and a dQ/dV peak sits where the line crosses both. Lose lithium and the line moves up; lose positive material and it steepens.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; kq += dt / 10; if (kq > 1) kq = 0; place(); }, { autoplay: true, stepDt: 0.4 });
    bind(fig, loop);
  });
  /* figs-9p.js */
  var POS = [ // r: 2 good, 1 moderate, 0 poor, -1 not rated (cost: Low = good)
    { n: 'LCO', f: 'LiCoO₂', fam: 'L', qt: [274], q: 140, ql: '135–140', qk: 'p', r: { cost: 0, en: 1, th: 0, cy: 2 },
      t: 'The original lithium-ion positive electrode, still in phones and laptops. In practice it gives up only about half its lithium, about 135 to 140 mAh/g; structural degradation at high states of charge limits it to half its theoretical capacity. Its theoretical capacity is 274 mAh/g, the tick on the bar. Ratings: high cost, moderate energy density, poor thermal stability, good cycle life.' , s: 'Frith et al. 2023; Manthiram 2020; Marie and Gifford 2023; Faruque et al. 2026' },
    { n: 'LMO', f: 'LiMn₂O₄', fam: 'S', qt: [148], q: 130, ql: '< 130', qk: 'p', r: { cost: 2, en: 1, th: 2, cy: 0 },
      t: 'A spinel at about 4 V with three-dimensional lithium channels, so it delivers power well; cheap because manganese is cheap. Its practical capacity is below 130 mAh/g, and manganese dissolution poisons the graphite and fades the capacity, worst when hot. Its theoretical capacity is 148 mAh/g. Ratings: low cost, moderate energy density, good thermal stability, poor cycle life.', s: 'Manthiram 2020; Marie and Gifford 2023; Faruque et al. 2026' },
    { n: 'LFP', f: 'LiFePO₄', fam: 'O', qt: [170], q: 170, ql: '170*', qk: 't', r: { cost: 2, en: 0, th: 2, cy: 2 },
      t: 'An olivine of iron and phosphate, flat at 3.43 V vs Li. Lower voltage and lower specific capacity than NMC (the bar is the theoretical 170 mAh/g of chapter 4), but a considerably longer cycle and calendar life than most NMC cells; state-of-the-art cells rose from 90 Wh/kg in 2010 to 160 Wh/kg in 2022. Used for grid storage and shorter-range electric cars. Ratings: low cost, low energy density, good thermal stability, good cycle life.', s: 'Safari and Delacourt 2011; Marie and Gifford 2023' },
    { n: 'LMFP', f: 'LiMnₓFe₁₋ₓPO₄', fam: 'O', q: 0, ql: '–', qk: 'n', r: { cost: -1, en: -1, th: -1, cy: -1 },
      t: 'LFP with manganese added. Cells reach around 210 to 240 Wh/kg, roughly 40 % more than LFP. Not rated in the source table; capacity not given there.', s: 'Marie and Gifford 2023' },
    { n: 'NMC622', f: 'LiNi₀.₆Mn₀.₂Co₀.₂O₂', fam: 'L', qt: [270, 285], q: 178, ql: '178', qk: 'p', r: { cost: 0, en: 2, th: 1, cy: 2 },
      t: 'Widely used in electric cars today. In one study, full cells against graphite gave 178 mAh/g of NMC when charged to 4.4 V and kept 94 % after 300 cycles at 1C, the highest stable specific energy of the three NMCs tested. The tick spans the 270 to 285 mAh/g that a 2026 review gives as the theoretical capacity of the nickel-cobalt layered oxides. Ratings: high cost, high energy density, moderate thermal stability, good cycle life.', s: 'Marie and Gifford 2023; Jung et al. 2017; Faruque et al. 2026' },
    { n: 'NMC811', f: 'LiNi₀.₈Mn₀.₁Co₀.₁O₂', fam: 'L', qt: [270, 285], q: 200, ql: '~200', qk: 'p', r: { cost: 0, en: 2, th: 0, cy: 1 },
      t: 'More nickel, less cobalt: about 200 mAh/g. But it releases oxygen and fades sooner: in one study it cycled stably only to 4.0 V against graphite. The tick spans the 270 to 285 mAh/g that a 2026 review gives as the theoretical capacity of the nickel-cobalt layered oxides. Ratings: high cost, high energy density, poor thermal stability, moderate cycle life.', s: 'Marie and Gifford 2023; Jung et al. 2017; Faruque et al. 2026' },
    { n: 'NCA', f: 'LiNi₀.₈Co₀.₁₅Al₀.₀₅O₂', fam: 'L', qt: [270, 285], q: 205, ql: '200–210', qk: 'r', r: { cost: 0, en: 2, th: 0, cy: 1 },
      t: 'Aluminium in place of manganese; first deployed in electric cars by Tesla. With NMC, 200 to 210 mAh/g in the 3.0 to 4.3 V window vs Li; its cycling tends to be better than NMC811’s but it holds more cobalt, about 10 wt%. The tick spans the 270 to 285 mAh/g that a 2026 review gives as the theoretical capacity of the nickel-cobalt layered oxides. Ratings: high cost, high energy density, poor thermal stability, moderate cycle life.', s: 'Marie and Gifford 2023; Eshetu et al. 2021; Faruque et al. 2026' },
    { n: 'LNMO', f: 'LiNi₀.₅Mn₁.₅O₄', fam: 'S', q: 135, ql: '~135', qk: 'p', r: { cost: -1, en: -1, th: -1, cy: -1 },
      t: 'The high-voltage spinel: about 4.7 V and about 135 mAh/g, cobalt-free. It releases no oxygen up to 5 V, but few electrolytes survive at that voltage. Not rated in the source table.', s: 'Manthiram 2020; Jung et al. 2017' },
    { n: 'LMR-NMC', f: 'Li₁.₂Mn₀.₄₈Ni₀.₁₆Co₀.₁₆O₂', fam: 'L', q: 280, ql: '~280', qk: 'p', r: { cost: 1, en: 2, th: 1, cy: 0 },
      t: 'Lithium- and manganese-rich layered oxide, a candidate for the next generation: about 280 mAh/g against about 200 for NMC811, with oxide ions taking part in the redox. Its voltage decays on cycling as manganese migrates. Ratings: moderate cost, high energy density, moderate thermal stability, poor cycle life.', s: 'Manthiram 2020; Marie and Gifford 2023' }
  ];

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
