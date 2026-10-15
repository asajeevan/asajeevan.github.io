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

  /* figs-11.js */
  var M11 = P.m11;
  function e11d(pts) { var d = ''; for (var i = 0; i < pts.length; i++) { if (!isFinite(pts[i][0]) || !isFinite(pts[i][1])) continue; d += (d ? 'L' : 'M') + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1); } return d; }
  function e11axes(g, b, o) {
    el('line', { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0, stroke: 'var(--line-2)' }, g);
    el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, stroke: 'var(--line-2)' }, g);
    (o.xt || []).forEach(function (t) { var x = o.X(t[0]); el('line', { x1: x, x2: x, y1: b.y0, y2: b.y0 + 4, stroke: 'var(--line-2)' }, g); if (t[1] !== '') txt(g, x, b.y0 + 16, t[1], '', 'middle'); });
    (o.yt || []).forEach(function (t) { var y = o.Y(t[0]); el('line', { x1: b.x0 - 4, x2: b.x0, y1: y, y2: y, stroke: 'var(--line-2)' }, g); if (o.grid) el('line', { x1: b.x0, x2: b.x1, y1: y, y2: y, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); if (t[1] !== '') txt(g, b.x0 - 7, y + 4, t[1], '', 'end'); });
    if (o.xlab) txt(g, b.x1, b.y0 + (o.xt && o.xt.length ? 32 : 16), o.xlab, '', 'end');
    if (o.ylab) txt(g, b.x0 + 6, b.y1 - 8, o.ylab, '', 'start');
  }
  function e11mOhm(r, d) { return (r * 1000).toFixed(d === undefined ? 1 : d) + ' mΩ'; }
  function e11time(t) {
    if (t < 1e-3) return (t * 1e6).toFixed(0) + ' µs';
    if (t < 1) return (t * 1e3).toFixed(t < 0.01 ? 1 : 0) + ' ms';
    if (t < 120) return t.toFixed(t < 10 ? 1 : 0) + ' s';
    if (t < 7200) return (t / 60).toFixed(0) + ' min';
    return (t / 3600).toFixed(t < 36000 ? 1 : 0) + ' h';
  }
  function e11log(v, lo, hi, a, b) { return a + (Math.log10(v) - lo) / (hi - lo) * (b - a); }
  function e11box(g, x, y, w, lab, cls) { var r = el('rect', { x: x, y: y - 10, width: w, height: 20, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g); txt(g, x + w / 2, y + 4, lab, cls || 'strong', 'middle'); return r; }
  /* figs-11a.js */
  register('f11-15', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.r2v'), sv = fig.querySelector('.r2v-val');
    var R0 = 0.020, R1 = 0.004, C1 = 0.25, C2 = 2, fs = M11.freqs(5000, 0.05, 12);
    txt(g, 20, 20, 'circuit 1: two arcs in series', 'amber', 'start'); txt(g, 290, 20, 'circuit 2: a nested ladder', 'cyan', 'start');
    var gc = el('g', {}, g);
    function wire(d) { el('path', { d: d, fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 1.4 }, gc); }
    function box(x, y, w, lab, val) { e11box(gc, x, y, w, lab, 'strong'); txt(gc, x + w / 2, y + 24, val, '', 'middle'); }
    var b = { x0: 60, y0: 330, x1: 470, y1: 150 }, F = e11nyq(g, b, [18, 38], 0, { xt: [[20, '20'], [25, '25'], [30, '30'], [35, '35 mΩ']], yt: [[0, '0'], [5, '5']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var p1 = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 3 }, g), dots = el('g', {}, g);
    badge(g, 250, 30, 1); badge(g, 506, 30, 2); badge(g, F.X(33), F.Y(6), 3);
    function render() {
      var R2 = +sl.value / 1000, L = M11.voigtToLadder(R1, C1, R2, C2); setSvgText(sv, (R2 * 1000).toFixed(0) + ' mΩ');
      clear(gc); clear(dots);
      // circuit 1: R0 - (R1||C1) - (R2||C2), shown as boxes with values
      wire('M14,64 H250'); box(20, 64, 50, 'R₀', e11mOhm(R0, 0)); box(86, 64, 74, 'R₁ ‖ C₁', e11mOhm(R1, 0) + ', ' + C1 + ' F'); box(176, 64, 74, 'R₂ ‖ C₂', e11mOhm(R2, 0) + ', ' + C2 + ' F');
      // circuit 2: R0 - [Ca || (Ra - (Rb||Cb))]
      wire('M284,64 H340 M340,44 V100 M340,44 H360 M420,44 H496 M340,100 H356 M410,100 H420 M496,100 H506 M496,44 V100 M506,64 V100');
      box(290, 64, 46, 'R₀', e11mOhm(R0, 0)); box(360, 44, 60, 'C_a', L.Ca.toFixed(2) + ' F');
      box(356, 100, 54, 'R_a', e11mOhm(L.Ra, 1)); box(420, 100, 76, 'R_b ‖ C_b', e11mOhm(L.Rb, 1) + ', ' + L.Cb.toFixed(2) + ' F');
      var z1 = fs.map(function (f) { return M11.voigtWZ({ R0: R0, R1: R1, C1: C1, R2: R2, C2: C2, sigma: 0 }, 2 * Math.PI * f); }), z2 = fs.map(function (f) { return M11.ladderZ(R0, L, 2 * Math.PI * f); });
      p1.setAttribute('d', e11zpath(z1, F, b, 1000));
      z2.forEach(function (z, i) { if (i % 2) return; el('circle', { cx: F.X(z.re * 1000), cy: F.Y(-z.im * 1000), r: 3.4, fill: 'var(--bg)', stroke: 'var(--second)', 'stroke-width': 1.8 }, dots); });
      var dmax = Math.max.apply(null, z1.map(function (z, i) { return M11.abs(M11.add(z, M11.scale(z2[i], -1))) / M11.abs(z); }));
      read.innerHTML = 'Largest difference between the two circuits over 5 kHz to 50 mHz: <b>' + (dmax < 1e-12 ? 'below 10⁻¹²' : sci(dmax, 1)) + '</b> of |Z|, rounding error only. Circuit 1 says R₁ + R₂ = ' + e11mOhm(R1 + R2) + ' of interface resistance in two separate films; circuit 2 says R<sub>a</sub> + R<sub>b</sub> = ' + e11mOhm(L.Ra + L.Rb) + ', arranged quite differently.';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'Circuit 1 is the usual reading of two arcs: the ohmic resistance, then two R‖C pairs in series, for example the SEI and charge transfer.' },
      { text: 'Circuit 2 nests the elements in a ladder: a capacitor in parallel with everything after it, as the SEI is sometimes drawn around the charge-transfer step. With the values shown, its impedance equals circuit 1 at every frequency. Change R₂ and the ladder values follow.' },
      { text: 'The blue line is circuit 1, the open circles circuit 2: one curve. A fit that looks perfect therefore cannot choose between them; the choice has to come from what is known about the cell. Keep the circuit as simple as the physics allows, and remember that every extra element improves the fit.' }
    ]);
    render();
  });
  register('f11-16', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.lam'), sv = fig.querySelector('.lam-val');
    var fs = M11.freqs(1e4, 0.1, 8), arcs = [{ R: 0.004, Q: 0.25, n: 0.9 }, { R: 0.010, Q: 2, n: 0.85 }];
    var rn = (function (s) { return function () { var x = 0; for (var j = 0; j < 6; j++) { s = (s * 1664525 + 1013904223) % 4294967296; x += s / 4294967296; } return (x - 3) / Math.sqrt(0.5); }; })(3);
    var Z = fs.map(function (f) { var w = 2 * Math.PI * f, z = M11.add(M11.zR(0.020), M11.zRQ(arcs[0].R, arcs[0].Q, arcs[0].n, w), M11.zRQ(arcs[1].R, arcs[1].Q, arcs[1].n, w)), m = M11.abs(z); return { re: z.re + 0.002 * m * rn(), im: z.im + 0.002 * m * rn() }; });
    var taus = [], NT = 60; for (var k = 0; k <= NT; k++) taus.push(Math.pow(10, -6 + 7 * k / NT));
    var dln = 7 / NT * Math.LN10;
    // exact distribution of an R || CPE arc (Cole-Cole form; this page's working): gamma(ln tau)
    function gExact(t) { return arcs.reduce(function (s, a) { var t0 = Math.pow(a.R * a.Q, 1 / a.n), u = a.n * Math.log(t / t0), p = (1 - a.n) * Math.PI; return s + a.R / (2 * Math.PI) * Math.sin(p) / (Math.cosh(u) - Math.cos(p)); }, 0); }
    // top: Nyquist
    var b = { x0: 60, y0: 170, x1: 300, y1: 30 }, F = e11nyq(g, b, [18, 38], -1, { xt: [[20, '20'], [25, '25'], [30, '30'], [35, '35']], yt: [[0, '0'], [5, '5']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    Z.forEach(function (z) { el('circle', { cx: F.X(z.re * 1000), cy: F.Y(-z.im * 1000), r: 2.8, fill: 'var(--accent)' }, g); });
    var pf = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 1.8 }, g);
    txt(g, 330, 50, 'the spectrum: two arcs', 'strong', 'start'); txt(g, 330, 68, 'that overlap; 0.2 % noise', '', 'start');
    // bottom: gamma against tau
    var d = { x0: 60, y0: 380, x1: 490, y1: 230 }, XT = function (t) { return e11log(t, -6, 1, d.x0, d.x1); }, ymax = 0.012, YG = function (v) { return d.y0 - v / ymax * (d.y0 - d.y1); };
    [[1e-5, 6e-5], [2e-4, 1e-2], [1e-2, 0.4]].forEach(function (s, i) { el('rect', { x: XT(s[0]), y: d.y1, width: XT(s[1]) - XT(s[0]), height: d.y0 - d.y1, fill: ['var(--second)', 'var(--field)', 'var(--accent)'][i], 'fill-opacity': '.07' }, g); });
    txt(g, XT(2.4e-5), d.y1 + 14, 'bulk', '', 'middle'); txt(g, XT(1.4e-3), d.y1 + 14, 'SEI, surface', '', 'middle'); txt(g, XT(0.063), d.y1 + 14, 'charge transfer', '', 'middle');
    e11axes(g, d, { X: XT, Y: YG, xt: [[1e-6, '1 µs'], [1e-4, '0.1 ms'], [1e-2, '10 ms'], [1, '1 s'], [10, '10 s']], yt: [[0, ''], [0.005, '5'], [0.01, '10']], xlab: 'relaxation time τ (log)', ylab: 'γ(τ), mΩ per unit of ln τ' });
    var ex = []; for (k = 0; k <= 200; k++) { var t = Math.pow(10, -6 + 7 * k / 200); ex.push([XT(t), YG(gExact(t))]); }
    el('path', { d: e11d(ex), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g);
    var pg = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.6 }, g), pk = el('g', {}, g);
    badge(g, b.x1 - 14, b.y1 + 14, 1); badge(g, d.x1 - 12, d.y1 + 34, 2);
    function lamT(l) { return l >= 1 ? l.toFixed(0) : l >= 0.1 ? l.toFixed(l >= 0.3 ? 1 : 2).replace(/0+$/, '') : sci(l, 0).replace(/^1 × /, ''); }
    function render() {
      var lam = Math.pow(10, +sl.value); setSvgText(sv, lamT(lam));
      var res = M11.drt(fs, Z, taus, lam), dens = res.x.map(function (x) { return x / dln; });
      pf.setAttribute('d', e11zpath(res.fit, F, b, 1000));
      pg.setAttribute('d', e11d(taus.map(function (t, i) { return [XT(t), Math.max(d.y1 - 4, YG(dens[i]))]; })));
      clear(pk);
      var mx = Math.max.apply(null, dens), peaks = [];
      for (var i = 1; i < dens.length - 1; i++) if (dens[i] > dens[i - 1] && dens[i] >= dens[i + 1] && dens[i] > 0.05 * mx) peaks.push(i);
      peaks.forEach(function (i) { var x = XT(taus[i]), y = Math.max(d.y1 + 26, YG(dens[i])); el('line', { x1: x, x2: x, y1: y, y2: y - 8, stroke: 'var(--accent)' }, pk); txt(pk, x, y - 12, e11time(taus[i]), 'amber', 'middle'); });
      var verdict = peaks.length === 2 ? 'two peaks, one per process: about right' : peaks.length > 2 ? peaks.length + ' peaks: the extra ones come from noise, not from the cell' : 'one broad hump: the two processes have been smoothed into one';
      read.innerHTML = 'λ = <b>' + lamT(lam) + '</b>: ' + verdict + '. The dashed line is the exact distribution of the two depressed arcs used to make the data; the arcs peak at τ = ' + e11time(Math.pow(arcs[0].R * arcs[0].Q, 1 / arcs[0].n)) + ' and ' + e11time(Math.pow(arcs[1].R * arcs[1].Q, 1 / arcs[1].n)) + '.';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'A parallel R‖C pair relaxes with one time constant τ = RC. Any spectrum can be written as a distribution of such pairs, Z = R₀ + R<sub>pol</sub>∫g(τ)/(1 + jωτ) dτ. The distribution of relaxation times, the DRT, recovers g(τ): each process becomes a peak at its own τ, even when the arcs overlap in the Nyquist plot.' },
      { text: 'Recovering g(τ) from noisy data is unstable, so it needs <b>regularization</b>, a penalty of strength λ on large, spiky solutions. Slide λ down: noise turns into extra peaks. Slide it up: the two real peaks melt into one. Only a narrow range is right, and the number of peaks depends on it. DRT also needs excellent data: test it first (figure L3.7), and leave out the inductive and diffusion parts, which distort it.' }
    ]);
    render();
  });
  register('f11-17', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.cyc'), sv = fig.querySelector('.cyc-val');
    var C = M11.CELL, fs = M11.freqs(2000, 0.5, 10);
    function cellAt(n) { var u = n / 400; return { L: C.L, R0: C.R0 * (1 + 0.15 * u), Rsei: C.Rsei * (1 + 1.2 * u), Qsei: C.Qsei, nsei: C.nsei, Rct: C.Rct * (1 + 1.0 * u), Cdl: C.Cdl, Rd: C.Rd, Cd: C.Cd }; }
    function soh(n) { var u = n / 400; return 100 - 6 * u - 3 * u * u; }
    var b = { x0: 50, y0: 216, x1: 270, y1: 40 }, F = e11nyq(g, b, [18, 52], -3, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[0, '0'], [10, '10']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    [0, 100, 200, 300, 400].forEach(function (n) { el('path', { d: e11zpath(fs.map(function (f) { return M11.cellZ(cellAt(n), 2 * Math.PI * f); }), F, b, 1000), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1, 'stroke-opacity': '.25' }, g); });
    var cur = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.6 }, g);
    var r = { x0: 340, y0: 110, x1: 505, y1: 40 }, c = { x0: 340, y0: 216, x1: 505, y1: 146 }, XC = function (n) { return r.x0 + n / 400 * (r.x1 - r.x0); };
    var YR = function (v) { return r.y0 - v / 0.035 * (r.y0 - r.y1); }, YS = function (s) { return c.y0 - (s - 90) / 10 * (c.y0 - c.y1); };
    e11axes(g, r, { X: XC, Y: YR, yt: [[0, '0'], [0.03, '30']], grid: true, ylab: 'fitted, mΩ' });
    e11axes(g, c, { X: XC, Y: YS, xt: [[0, '0'], [200, '200'], [400, '400']], yt: [[90, '90'], [100, '100']], grid: true, xlab: 'cycles', ylab: 'capacity, % of new' });
    var pts0 = [], pts1 = [], pts2 = []; for (var n = 0; n <= 400; n += 10) { var p = cellAt(n); pts0.push([XC(n), YR(p.R0)]); pts1.push([XC(n), YR(p.Rsei + p.Rct)]); pts2.push([XC(n), YS(soh(n))]); }
    el('path', { d: e11d(pts0), fill: 'none', stroke: 'var(--second)', 'stroke-width': 1.4, 'stroke-opacity': '.45' }, g); el('path', { d: e11d(pts1), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.4, 'stroke-opacity': '.45' }, g); el('path', { d: e11d(pts2), fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.4, 'stroke-opacity': '.45' }, g);
    txt(g, r.x0 + 4, YR(C.R0) - 6, 'R₀', 'cyan', 'start'); txt(g, r.x0 + 4, YR(C.Rsei + C.Rct) + 16, 'R_SEI + R_ct', 'amber', 'start');
    var m0 = el('circle', { r: 4, fill: 'var(--second)' }, g), m1 = el('circle', { r: 4, fill: 'var(--accent)' }, g), m2 = el('circle', { r: 4, fill: 'var(--heat)' }, g);
    // the machine-learning workflow (Bakenhaster and Dewald Fig. 10, after their ref. 81)
    var flow = ['impedance check-ups', 'extract features', 'split: train / test', 'train the model', 'predict SOC or SOH', 'check the errors'], fx = [20, 190, 360], boxes = [];
    flow.forEach(function (s, i) { var x = fx[i % 3], y = i < 3 ? 298 : 358; boxes.push(el('rect', { x: x, y: y - 16, width: 150, height: 30, rx: 5, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g)); txt(g, x + 75, y + 4, s, 'strong', 'middle'); if (i % 3 < 2) arrow(g, x + 152, y - 1, x + 168, y - 1, '#8a9aa0', 1.4); });
    el('path', { d: 'M470,314 V330 H95 V340', fill: 'none', stroke: '#8a9aa0', 'stroke-width': 1.4 }, g);
    txt(g, 20, 270, 'the data-driven route', 'strong', 'start');
    badge(g, b.x0 + 24, b.y1 + 10, 1); badge(g, r.x1 - 10, r.y1 + 8, 2); badge(g, 500, 268, 3);
    var cyc = 0;
    function place() {
      var p = cellAt(cyc); setSvgText(sv, Math.round(cyc) + '');
      cur.setAttribute('d', e11zpath(fs.map(function (f) { return M11.cellZ(p, 2 * Math.PI * f); }), F, b, 1000));
      m0.setAttribute('cx', XC(cyc)); m0.setAttribute('cy', YR(p.R0)); m1.setAttribute('cx', XC(cyc)); m1.setAttribute('cy', YR(p.Rsei + p.Rct)); m2.setAttribute('cx', XC(cyc)); m2.setAttribute('cy', YS(soh(cyc)));
      read.innerHTML = 'After <b>' + Math.round(cyc) + ' cycles</b> (illustrative numbers): R₀ = ' + e11mOhm(p.R0) + ' (+' + ((p.R0 / C.R0 - 1) * 100).toFixed(0) + ' %), R<sub>SEI</sub> + R<sub>ct</sub> = ' + e11mOhm(p.Rsei + p.Rct) + ' (+' + (((p.Rsei + p.Rct) / (C.Rsei + C.Rct) - 1) * 100).toFixed(0) + ' %), capacity ' + soh(cyc).toFixed(1) + ' % of new.' + (cyc >= 50 ? ' The interface part grows much faster than the ohmic part.' : '');
    }
    on(sl, 'input', function () { cyc = +sl.value; place(); });
    steps(fig, [
      { text: 'A <b>check-up</b> repeats the same measurement at fixed conditions, for example a spectrum at 50 % state of charge and 25 °C after a rest, every so many cycles: often enough to follow the ageing, rarely enough not to add to it. As the cell ages the impedance generally grows; here, as in many published cells, the arcs grow faster than the ohmic intercept moves.' },
      { text: 'A whole spectrum is many numbers; ageing studies reduce it to a few <b>features</b>: fitted resistances, DRT peaks, or the impedance at chosen frequencies. Individual contributions may track health, and warn of rapid fade, better than the total impedance does. Capacity is measured separately, by a full cycle.' },
      { text: '<b>Machine learning</b> learns the link between features and state of health or charge from many cells, then predicts it for a new one. Gaussian process regression is common; models based on relaxation times have reached errors near 1 %. The catch: they know only the chemistries and conditions in their training data, and temperature, state of charge and ageing all move the same spectrum.' }
    ]);
    place();
    var loop = anim(fig, function (dt) { if (dt === 0) return; cyc += dt * 60; if (cyc > 400) cyc = 0; sl.value = cyc; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });
  /* figs-11e.js */
  function e11nyq(g, b, xr, yLo, o) {
    o = o || {};
    var k = (b.x1 - b.x0) / (xr[1] - xr[0]), X = function (v) { return b.x0 + (v - xr[0]) * k; }, Y = function (v) { return b.y0 - (v - yLo) * k; };
    var yHi = yLo + (b.y0 - b.y1) / k;
    if (yLo < 0) el('line', { x1: b.x0, x2: b.x1, y1: Y(0), y2: Y(0), stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g);
    e11axes(g, b, { X: X, Y: Y, xt: o.xt || [], yt: (o.yt || []).filter(function (t) { return t[0] >= yLo && t[0] <= yHi; }), xlab: o.xlab, ylab: o.ylab, grid: o.grid });
    return { X: X, Y: Y, k: k, yHi: yHi };
  }
  function e11zpath(zs, F, b, unit) {
    var pts = [];
    for (var i = 0; i < zs.length; i++) { var x = F.X(zs[i].re * unit), y = F.Y(-zs[i].im * unit); if (y < b.y1 - 1 || x > b.x1 + 1 || x < b.x0 - 1 || y > b.y0 + 1) { if (pts.length) break; continue; } pts.push([x, y]); }
    return e11d(pts);
  }

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
