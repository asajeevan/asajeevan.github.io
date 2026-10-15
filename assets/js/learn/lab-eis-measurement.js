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
    go:          ['#4A3D31', '#76675A', '#4E4135', '#2F261E', '#5A4C40']
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
  function e11Hz(f) {
    var s = f >= 1e3 ? (f / 1e3).toFixed(f >= 1e4 ? 0 : 1) + ' kHz' : f >= 1 ? f.toFixed(f >= 10 ? 0 : 1) + ' Hz' : (f * 1e3).toFixed(f * 1e3 >= 10 ? 0 : 1) + ' mHz';
    return s.replace('.0 ', ' ');
  }
  function e11n(x, d) { var s = Math.abs(x).toFixed(d === undefined ? 1 : d); return (x < 0 && +s !== 0 ? '−' : '') + s; }
  function e11time(t) {
    if (t < 1e-3) return (t * 1e6).toFixed(0) + ' µs';
    if (t < 1) return (t * 1e3).toFixed(t < 0.01 ? 1 : 0) + ' ms';
    if (t < 120) return t.toFixed(t < 10 ? 1 : 0) + ' s';
    if (t < 7200) return (t / 60).toFixed(0) + ' min';
    return (t / 3600).toFixed(t < 36000 ? 1 : 0) + ' h';
  }
  function e11log(v, lo, hi, a, b) { return a + (Math.log10(v) - lo) / (hi - lo) * (b - a); }
  function e11box(g, x, y, w, lab, cls) { var r = el('rect', { x: x, y: y - 10, width: w, height: 20, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g); txt(g, x + w / 2, y + 4, lab, cls || 'strong', 'middle'); return r; }
  function e11lit(r, onOff, col) { r.setAttribute('stroke', onOff ? (col || 'var(--accent)') : 'var(--line-2)'); r.setAttribute('stroke-width', onOff ? 2.2 : 1); }
  function e11modes(fig, fn) {
    var bs = fig.querySelectorAll('.controls button[data-mode]');
    Array.prototype.forEach.call(bs, function (bt) { on(bt, 'click', function () { Array.prototype.forEach.call(bs, function (x) { x.setAttribute('aria-pressed', String(x === bt)); }); fn(bt.getAttribute('data-mode')); }); });
    var cur = Array.prototype.filter.call(bs, function (x) { return x.getAttribute('aria-pressed') === 'true'; })[0] || bs[0];
    return cur ? cur.getAttribute('data-mode') : null;
  }
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
  function e11deg(z) { return Math.atan2(z.im, z.re) * 180 / Math.PI; }
  register('f11-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.fsl'), sv = fig.querySelector('.fsl-val');
    var V0 = 0.010, Rv = 20, Cv = 100e-6, Lv = 20e-3, elm = e11modes(fig, function (m) { elm = m; render(); });
    function Z(w) { return elm === 'R' ? M11.zR(Rv) : elm === 'C' ? M11.zC(Cv, w) : elm === 'L' ? M11.zL(Lv, w) : M11.parallel(M11.zR(Rv), M11.zC(Cv, w)); }
    // time panel
    var a = { x0: 52, x1: 300, yc: 122, h: 62 }, ty = a.yc + a.h + 10;
    el('line', { x1: a.x0, x2: a.x1, y1: a.yc, y2: a.yc, stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g);
    el('line', { x1: a.x0, x2: a.x0, y1: a.yc - a.h - 8, y2: ty, stroke: 'var(--line-2)' }, g); el('line', { x1: a.x0, x2: a.x1, y1: ty, y2: ty, stroke: 'var(--line-2)' }, g);
    txt(g, a.x0, 24, 'voltage applied and current measured', 'strong', 'start');
    var lv = txt(g, a.x0 + 6, a.yc - a.h - 12, '', 'amber', 'start'), li = txt(g, a.x0 + 120, a.yc - a.h - 12, '', 'cyan', 'start');
    var tk = [0, 1, 2].map(function (k) { var x = a.x0 + k * (a.x1 - a.x0) / 2; el('line', { x1: x, x2: x, y1: ty, y2: ty + 4, stroke: 'var(--line-2)' }, g); return txt(g, x, ty + 16, '', '', k === 0 ? 'start' : k === 2 ? 'end' : 'middle'); });
    var pv = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g), pi = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2.4 }, g);
    var cur = el('line', { y1: a.yc - a.h - 4, y2: a.yc + a.h + 4, stroke: 'var(--text)', 'stroke-dasharray': '3 3', 'stroke-opacity': '.6' }, g);
    var dV = el('circle', { r: 4.5, fill: 'var(--accent)' }, g), dI = el('circle', { r: 4.5, fill: 'var(--second)' }, g);
    // Lissajous panel
    var lc = { x: 420, y: 122, r: 62 };
    txt(g, lc.x, 24, 'current against voltage', 'strong', 'middle');
    el('rect', { x: lc.x - lc.r - 6, y: lc.y - lc.r - 6, width: 2 * lc.r + 12, height: 2 * lc.r + 12, fill: 'none', stroke: 'var(--line)' }, g);
    el('line', { x1: lc.x - lc.r - 6, x2: lc.x + lc.r + 6, y1: lc.y, y2: lc.y, stroke: 'var(--line-2)' }, g); el('line', { x1: lc.x, x2: lc.x, y1: lc.y - lc.r - 6, y2: lc.y + lc.r + 6, stroke: 'var(--line-2)' }, g);
    txt(g, lc.x + lc.r + 6, lc.y + lc.r + 22, 'V, scaled to ±V₀', 'amber', 'end'); txt(g, lc.x - lc.r - 6, lc.y - lc.r - 12, 'I, scaled to ±I₀', 'cyan', 'start');
    var liss = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g), dL = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var ph = txt(g, lc.x, lc.y + lc.r + 42, '', 'strong', 'middle');
    badge(g, a.x0 + 22, a.yc - a.h + 6, 1); badge(g, lc.x + lc.r - 8, lc.y - lc.r + 10, 2);
    var th = 0, f = 100, z = Z(2 * Math.PI * f), phi = 0;
    function place() {
      var u = (th % (4 * Math.PI)) / (4 * Math.PI), x = a.x0 + u * (a.x1 - a.x0), sv_ = Math.sin(th), si = Math.sin(th + phi);
      cur.setAttribute('x1', x); cur.setAttribute('x2', x);
      dV.setAttribute('cx', x); dV.setAttribute('cy', a.yc - sv_ * a.h); dI.setAttribute('cx', x); dI.setAttribute('cy', a.yc - si * a.h * 0.8);
      dL.setAttribute('cx', lc.x + sv_ * lc.r); dL.setAttribute('cy', lc.y - si * lc.r);
    }
    function render() {
      f = Math.pow(10, +sl.value); var w = 2 * Math.PI * f; z = Z(w); phi = -Math.atan2(z.im, z.re);
      var m = M11.abs(z), I0 = V0 / m, T = 1 / f, ptsV = [], ptsI = [], ptsL = [];
      setSvgText(sv, e11Hz(f));
      for (var k = 0; k <= 160; k++) { var t = 4 * Math.PI * k / 160, x = a.x0 + k / 160 * (a.x1 - a.x0); ptsV.push([x, a.yc - Math.sin(t) * a.h]); ptsI.push([x, a.yc - Math.sin(t + phi) * a.h * 0.8]); }
      for (k = 0; k <= 120; k++) { var t2 = 2 * Math.PI * k / 120; ptsL.push([lc.x + Math.sin(t2) * lc.r, lc.y - Math.sin(t2 + phi) * lc.r]); }
      pv.setAttribute('d', e11d(ptsV)); pi.setAttribute('d', e11d(ptsI)); liss.setAttribute('d', e11d(ptsL) + 'Z');
      setSvgText(lv, 'V: ±10 mV'); setSvgText(li, 'I: ±' + (I0 * 1000 >= 10 ? (I0 * 1000).toFixed(0) : (I0 * 1000).toFixed(2)) + ' mA');
      setSvgText(tk[0], '0'); setSvgText(tk[1], e11time(T)); setSvgText(tk[2], e11time(2 * T));
      var deg = Math.round(phi * 180 / Math.PI), names = { R: 'a resistor, 20 Ω', C: 'a capacitor, 100 µF', L: 'an inductor, 20 mH', RC: '20 Ω in parallel with 100 µF' };
      setSvgText(ph, Math.abs(deg) < 1 ? 'in phase' : deg > 0 ? 'current leads by ' + deg + '°' : 'current lags by ' + (-deg) + '°');
      read.innerHTML = 'At <b>' + e11Hz(f) + '</b>, ' + names[elm] + ': |Z| = V₀/I₀ = <b>' + (m >= 10 ? m.toFixed(1) : m.toFixed(2)) + ' Ω</b>, phase of Z = <b>' + e11n(-deg, 0) + '°</b>, so Z′ = ' + e11n(z.re, 2) + ' Ω and Z″ = ' + e11n(z.im, 2) + ' Ω.';
      place();
    }
    function pick(m) { var bt = fig.querySelector('button[data-mode="' + m + '"]'); if (bt) bt.click(); }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'Impedance spectroscopy applies a small sine, here a voltage of amplitude V₀ = 10 mV, and records the current that answers. In a linear system the current is a sine of the same frequency; only its size and its timing differ. Two numbers say how: |Z| = V₀/I₀ and the phase shift φ. Together they make one complex number, Z = Z′ + jZ″.' },
      { text: 'A <b>resistor</b>: the current is in phase with the voltage and |Z| = R at every frequency. Current against voltage, the <b>Lissajous plot</b> on the right, is a straight diagonal line.', on: function () { pick('R'); } },
      { text: 'A <b>capacitor</b>: the current leads the voltage by 90°, and |Z| = 1/(ωC) falls as the frequency rises (ω = 2πf). With both axes scaled to their amplitudes, the Lissajous plot is a circle. Slide the frequency.', on: function () { pick('C'); } },
      { text: 'An <b>inductor</b>, such as a long cable: the current lags by 90°, and |Z| = ωL grows with frequency.', on: function () { pick('L'); } },
      { text: 'A resistor and a capacitor in parallel, the building block of an interface: at low frequency the current goes through R, at high frequency through C, and in between it shares, with a phase between 0 and 90°. Analyzers draw the Lissajous plot live: a distorted shape means the response is not linear; a shape that drifts means the cell is changing during the measurement.', on: function () { pick('RC'); } }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; th += dt * Math.PI; place(); }, { autoplay: true, stepDt: 0.25 });
    bind(fig, loop);
  });
  register('f11-9', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.tratio'), sv = fig.querySelector('.tratio-val'), cbS = fig.querySelector('.stretch');
    var R0 = 10, R1 = 20, R2 = 20, tau2 = 1e-4, fs = M11.freqs(1e5, 0.1, 30);
    var b = { x0: 50, y0: 250, x1: 270, y1: 50 }, gN = el('g', {}, g), gB = el('g', {}, g);
    txt(g, b.x0, 14, 'Nyquist plot', 'strong', 'start'); txt(g, 330, 14, 'Bode plot', 'strong', 'start');
    var ba = { x0: 330, y0: 128, x1: 492, y1: 46 }, bp = { x0: 330, y0: 250, x1: 492, y1: 164 };
    var XB = function (f) { return e11log(f, -1, 5, ba.x0, ba.x1); }, YA = function (m) { return e11log(m, 0, 2, ba.y0, ba.y1); }, YP = function (d) { return bp.y0 - d / 60 * (bp.y0 - bp.y1); };
    e11axes(g, ba, { X: XB, Y: YA, xt: [[0.1, ''], [10, ''], [1000, ''], [1e5, '']], yt: [[1, '1'], [10, '10'], [100, '100']], grid: true, ylab: '|Z|, Ω (log)' });
    e11axes(g, bp, { X: XB, Y: YP, xt: [[0.1, '0.1'], [10, '10'], [1000, '1 k'], [1e5, '100 k']], yt: [[0, '0'], [30, '30'], [60, '60']], grid: true, xlab: 'frequency, Hz (log)', ylab: '−phase, degrees' });
    var pA = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }, g), pP = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2.2 }, g);
    var dA = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g), dP = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var pN = null, dN = null, F = null, zs = [], tau1 = 1e-2, fi = 0, tops = [];
    badge(g, b.x0 + 24, b.y1 + 14, 1); badge(g, ba.x1 - 12, ba.y1 + 12, 2); badge(g, bp.x1 - 12, bp.y1 + 12, 3);
    function Z(f, t1) { var w = 2 * Math.PI * f; return M11.add(M11.zR(R0), M11.parallel(M11.zR(R1), M11.zC(t1 / R1, w)), M11.parallel(M11.zR(R2), M11.zC(tau2 / R2, w))); }
    function render() {
      var lr = +sl.value, ratio = Math.pow(10, lr); tau1 = tau2 * ratio; setSvgText(sv, ratio < 10 ? ratio.toFixed(1) : Math.round(ratio) + '');
      zs = fs.map(function (f) { return Z(f, tau1); });
      clear(gN);
      var st = cbS.checked ? 2 : 1;
      F = e11nyq(gN, b, [0, 55], 0, { xt: [[0, '0'], [10, '10'], [30, '30'], [50, '50']], yt: [[0, '0'], [10, '10'], [20, '20'], [30, '30'], [40, '40'], [50, '50']], xlab: 'Z′, Ω', ylab: '−Z″, Ω' });
      if (st > 1) { clear(gN); var k = (b.x1 - b.x0) / 55; F = { X: function (v) { return b.x0 + v * k; }, Y: function (v) { return b.y0 - v * k * st; }, k: k }; e11axes(gN, b, { X: F.X, Y: F.Y, xt: [[0, '0'], [10, '10'], [30, '30'], [50, '50']], yt: [[0, '0'], [5, '5'], [10, '10'], [15, '15'], [20, '20']], xlab: 'Z′, Ω', ylab: '−Z″, Ω (stretched ×2)' }); }
      el('path', { d: e11d(zs.map(function (z) { return [F.X(z.re), F.Y(-z.im)]; })), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, gN);
      [tau1, tau2].forEach(function (t, i) { var fT = 1 / (2 * Math.PI * t), z = Z(fT, tau1); el('circle', { cx: F.X(z.re), cy: F.Y(-z.im), r: 3.5, fill: 'var(--second)' }, gN); if (lr >= 1) txt(gN, F.X(z.re), F.Y(-z.im) - 10, e11Hz(fT), 'cyan', 'middle'); });
      txt(gN, b.x0 + 8, b.y0 + 32, 'high f ←', '', 'start');
      dN = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, gN);
      pA.setAttribute('d', e11d(fs.map(function (f, i) { return [XB(f), YA(M11.abs(zs[i]))]; })));
      pP.setAttribute('d', e11d(fs.map(function (f, i) { return [XB(f), YP(-e11deg(zs[i]))]; })));
      place();
    }
    function place() {
      var i = Math.min(fs.length - 1, Math.floor(fi)), z = zs[i], f = fs[i];
      dN.setAttribute('cx', F.X(z.re)); dN.setAttribute('cy', F.Y(-z.im));
      dA.setAttribute('cx', XB(f)); dA.setAttribute('cy', YA(M11.abs(z))); dP.setAttribute('cx', XB(f)); dP.setAttribute('cy', YP(-e11deg(z)));
      var ratio = tau1 / tau2;
      read.innerHTML = 'f = <b>' + e11Hz(f) + '</b>: Z′ = ' + z.re.toFixed(1) + ' Ω, −Z″ = ' + e11n(-z.im) + ' Ω, |Z| = ' + M11.abs(z).toFixed(1) + ' Ω, phase ' + e11n(e11deg(z), 0) + '°. τ₁/τ₂ = <b>' + (ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)) + '</b>: ' + (ratio >= 100 ? 'two separate arcs and two phase peaks.' : ratio < 1.5 ? 'the two arcs have merged into one; nothing in the plot says there are two processes.' : 'the arcs overlap; they are poorly resolved below a ratio of about 100.');
    }
    on(sl, 'input', render); on(cbS, 'change', render);
    steps(fig, [
      { text: 'The <b>Nyquist plot</b> draws each frequency as one point: Z′ to the right, −Z″ upward, high frequencies on the left. A resistor in parallel with a capacitor draws a semicircle; its diameter is R and its top sits at ω = 1/(RC). Here the arcs start at R₀ = 10 Ω and end at R₀ + R₁ + R₂ = 50 Ω. What the plot does not show is the frequency of each point: follow the dot.' },
      { text: 'The <b>Bode plot</b> shows the same data against frequency: |Z| and the phase, both on a logarithmic frequency axis, so the frequency of every point can be read and decades of frequency are equally clear.' },
      { text: 'Two processes with time constants τ₁ = R₁C₁ and τ₂ = R₂C₂ give two arcs only when the time constants are far apart: about a factor of 100 or more. Slide the ratio down: the arcs merge, and at equal τ a single semicircle remains. The phase plot shows two peaks for as long as it can.' },
      { text: 'One rule for Nyquist plots: both axes on the same scale. Tick “stretch” to zoom the vertical axis twice, a common mistake: the arcs look round and tall when they are not.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; fi += dt * 30; if (fi >= fs.length) fi = 0; place(); }, { autoplay: true, stepDt: 0.25 });
    bind(fig, loop);
  });
  register('f11-10', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var C = M11.CELL, fs = M11.freqs(5000, 3e-3, 12), stage = 4;
    var parts = [
      { lab: 'L', w: 34 }, { lab: 'R₀', w: 40 }, { lab: 'R_SEI ‖ Q_SEI', w: 104 }, { lab: 'R_ct ‖ C_dl', w: 86 }, { lab: 'Z_d (sphere)', w: 96 }
    ], x = 22, boxes = [];
    parts.forEach(function (p, i) { if (i) { el('line', { x1: x - 14, x2: x, y1: 30, y2: 30, stroke: 'var(--line-2)' }, g); } boxes.push(e11box(g, x, 30, p.w, p.lab, 'strong')); x += p.w + 14; });
    txt(g, 22, 54, 'Z_d sits in series with R_ct, both in parallel with C_dl (the Randles arrangement)', '', 'start');
    var b = { x0: 60, y0: 352, x1: 470, y1: 86 }, F = e11nyq(g, b, [18, 59], -6, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[-5, '−5'], [0, '0'], [10, '10'], [20, '20']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var bands = [[5000, 1000, 'kHz', 'var(--second)'], [1000, 1, 'Hz', 'var(--accent)'], [1, 3e-3, 'mHz', 'var(--field)']];
    function Zs(f, st) { var w = 2 * Math.PI * f, z = M11.add(M11.zL(C.L, w), M11.zR(C.R0)); if (st >= 1) z = M11.add(z, M11.zRQ(C.Rsei, C.Qsei, C.nsei, w)); if (st === 2) z = M11.add(z, M11.parallel(M11.zR(C.Rct), M11.zC(C.Cdl, w))); if (st >= 3) z = M11.add(z, M11.parallel(M11.zC(C.Cdl, w), M11.add(M11.zR(C.Rct), M11.zSphere(C.Rd, C.Cd, w)))); return z; }
    var full = fs.map(function (f) { return M11.cellZ(C, 2 * Math.PI * f); });
    el('path', { d: e11zpath(full, F, b, 1000), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.2, 'stroke-opacity': '.3' }, g);
    var bandG = el('g', {}, g), path = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.6 }, g), decs = el('g', {}, g);
    var dot = el('circle', { r: 5.5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    badge(g, F.X(20) + 16, F.Y(-4), 1); badge(g, F.X(22.5), F.Y(5), 2); badge(g, F.X(28.3), F.Y(9.5), 3); badge(g, F.X(44), F.Y(18), 4);
    var zs = [], fi = 0;
    function render(st) {
      stage = st; zs = fs.map(function (f) { return Zs(f, st >= 4 ? 3 : st); });
      path.setAttribute('d', e11zpath(zs, F, b, 1000));
      boxes.forEach(function (r, i) { e11lit(r, i <= st, i === 0 ? 'var(--second)' : 'var(--accent)'); });
      clear(decs); clear(bandG);
      var placed = [];
      [1000, 100, 10, 1, 0.1, 0.01].forEach(function (f) { var z = Zs(f, st >= 4 ? 3 : st), px = F.X(z.re * 1000), py = F.Y(-z.im * 1000); if (py < b.y1) return; el('circle', { cx: px, cy: py, r: 3, fill: 'var(--second)' }, decs); var lx = px + 8, ly = py + (f >= 100 ? 18 : -10); if (placed.some(function (q) { return Math.abs(q[0] - lx) < 56 && Math.abs(q[1] - ly) < 18; })) return; placed.push([lx, ly]); txt(decs, lx, ly, e11Hz(f), 'cyan', 'start'); });
      if (st >= 4) bands.forEach(function (bd) { var zA = Zs(bd[0], 3), zB = Zs(bd[1], 3), xA = F.X(zA.re * 1000), xB = Math.min(b.x1, F.X(zB.re * 1000)); el('rect', { x: xA, y: b.y1, width: xB - xA, height: b.y0 - b.y1, fill: bd[3], 'fill-opacity': '.07' }, bandG); txt(bandG, (xA + xB) / 2, b.y1 + 14, bd[2], 'strong', 'middle'); });
      place();
    }
    function place() {
      var i = Math.min(fs.length - 1, Math.floor(fi)), z = zs[i], f = fs[i], py = F.Y(-z.im * 1000);
      dot.style.display = py < b.y1 ? 'none' : ''; dot.setAttribute('cx', F.X(z.re * 1000)); dot.setAttribute('cy', py);
      var what = f > 1000 ? 'the cables and windings (inductance) and the ohmic resistance' : f > 50 ? 'the SEI arc' : f > 1 ? 'charge transfer with the double layer' : 'diffusion of lithium inside the particles';
      read.innerHTML = 'f = <b>' + e11Hz(f) + '</b>: Z′ = ' + (z.re * 1000).toFixed(1) + ' mΩ, −Z″ = ' + e11n(-z.im * 1000) + ' mΩ. ' + (stage >= 4 ? 'This range is dominated by <b>' + what + '</b>.' : '');
    }
    steps(fig, [
      { text: 'Start at the highest frequencies. The cables and the cell windings act as an <b>inductance</b>, so the spectrum begins below the axis. Where it crosses the axis, the <b>ohmic resistance</b> is read: electrolyte, active material, current collectors and contacts together. A commercial cell has tens of milliohms, not ohms.', on: function () { render(0); } },
      { text: 'Add the <b>SEI</b>: lithium crossing the surface film, in parallel with the film’s own capacitance, gives a first, small arc at a few hundred hertz. Real arcs are depressed, so a constant phase element Q stands in for the capacitor.', on: function () { render(1); } },
      { text: 'Add <b>charge transfer</b> in parallel with the double layer: a second, larger arc at a few hertz. In a real cell the arcs of the two electrodes and their SEI layers overlap; with only two terminals there is no telling them apart from this plot alone.', on: function () { render(2); } },
      { text: 'Add <b>solid diffusion</b> inside the particles: the tail at low frequency. It starts at 45° and bends upward, towards a vertical line, because each particle can hold only so much lithium.', on: function () { render(3); } },
      { text: 'The three frequency ranges of a real spectrum: <b>kHz</b> (inductance and ohmic), <b>Hz</b> (interfaces) and <b>mHz</b> (diffusion). An analyzer sweeps from high to low. With 12 frequencies per decade down to 3 mHz, a single period at each frequency adds up to ' + Math.round(fs.reduce(function (s, f) { return s + 1 / f; }, 0) / 60) + ' minutes, nearly all of it below 0.1 Hz; instruments average several periods per point, so a real sweep takes longer.', on: function () { render(4); } }
    ]);
    render(4);
    var loop = anim(fig, function (dt) { if (dt === 0) return; fi += dt * 12; if (fi >= fs.length) fi = 0; place(); }, { autoplay: true, stepDt: 0.25 });
    bind(fig, loop);
  });
  register('f11-11', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sn = fig.querySelector('.nexp'), snv = fig.querySelector('.nexp-val'), sr = fig.querySelector('.rpor'), srv = fig.querySelector('.rpor-val');
    var ws = M11.freqs(1e5, 1e-5, 20).map(function (f) { return 2 * Math.PI * f; }), wsA = M11.freqs(1e9, 1e-9, 12).map(function (f) { return 2 * Math.PI * f; });
    var P = [
      { b: { x0: 40, y0: 210, x1: 240, y1: 70 }, t: 'A: constant phase element' },
      { b: { x0: 300, y0: 210, x1: 500, y1: 70 }, t: 'B: diffusion into a film' },
      { b: { x0: 40, y0: 430, x1: 240, y1: 290 }, t: 'C: film or sphere' },
      { b: { x0: 300, y0: 430, x1: 500, y1: 290 }, t: 'D: porous electrode' }
    ];
    txt(g, 260, 18, 'each panel: −Z″ up, Z′ across, both in mΩ on the same scale', '', 'middle');
    var Fs = P.map(function (p, i) { txt(g, p.b.x0, p.b.y1 - 22, p.t, 'strong', 'start'); badge(g, p.b.x1 - 10, p.b.y1 - 26, i + 1); return e11nyq(g, p.b, [0, 15], 0, { xt: [[0, '0'], [5, '5'], [10, '10'], [15, '15']], yt: [[0, '0'], [5, '5'], [10, '10']] }); });
    function draw(gr, zs, F, b, col, w, dash) { return el('path', { d: e11zpath(zs, F, b, 1000), fill: 'none', stroke: col, 'stroke-width': w || 2.2, 'stroke-dasharray': dash || null }, gr); }
    var gA = el('g', {}, g), gD = el('g', {}, g), R = 0.010;
    // A: R || CPE against R || C
    draw(g, ws.map(function (w) { return M11.zRQ(R, 1, 1, w); }), Fs[0], P[0].b, 'var(--text)', 1.2, '4 4');
    // B: semi-infinite, transmissive (tanh), reflective (coth); Rd = 10 mOhm, B = 1 s^1/2
    var B = Math.sqrt(1), Y0 = B / R;
    draw(g, ws.map(function (w) { return M11.zQ(Y0, 0.5, w); }), Fs[1], P[1].b, 'var(--text)', 1.2, '4 4');
    draw(g, ws.map(function (w) { return M11.zFiniteT(Y0, B, w); }), Fs[1], P[1].b, 'var(--second)');
    draw(g, ws.map(function (w) { return M11.zFiniteR(Y0, B, w); }), Fs[1], P[1].b, 'var(--accent)');
    txt(g, Fs[1].X(10.6), Fs[1].Y(1.2), 'open end', 'cyan', 'start'); txt(g, Fs[1].X(3.9), Fs[1].Y(8.6), 'closed end', 'amber', 'start'); txt(g, Fs[1].X(7.6), Fs[1].Y(4.6), '45°, endless', '', 'start');
    // C: Abbas eqs 9 and 6 with the same Rd and Cd: film (1D, coth) against sphere
    var Rd = 0.024, Cd = 1;
    draw(g, ws.map(function (w) { return M11.scale(M11.div(M11.ccoth(M11.csqrt(M11.cx(0, w * Rd * Cd))), M11.csqrt(M11.cx(0, w * Rd * Cd))), Rd); }), Fs[2], P[2].b, 'var(--accent)');
    draw(g, ws.map(function (w) { return M11.zSphere(Rd, Cd, w); }), Fs[2], P[2].b, 'var(--heat)');
    el('line', { x1: Fs[2].X(8), x2: Fs[2].X(8), y1: P[2].b.y0, y2: P[2].b.y1, stroke: 'var(--accent)', 'stroke-dasharray': '2 4', 'stroke-opacity': '.6' }, g); el('line', { x1: Fs[2].X(1.6), x2: Fs[2].X(1.6), y1: P[2].b.y0, y2: P[2].b.y1, stroke: 'var(--heat)', 'stroke-dasharray': '2 4', 'stroke-opacity': '.6' }, g);
    txt(g, Fs[2].X(8) + 4, Fs[2].Y(2), 'film: R_d/3', 'amber', 'start'); txt(g, Fs[2].X(1.6) + 6, Fs[2].Y(8.6), 'sphere: R_d/15', 'heat', 'start');
    function render() {
      var n = +sn.value, rp = +sr.value / 1000; setSvgText(snv, n.toFixed(2)); setSvgText(srv, (rp * 1000).toFixed(0) + ' mΩ');
      clear(gA); clear(gD);
      draw(gA, wsA.map(function (w) { return M11.zRQ(R, 1, n, w); }), Fs[0], P[0].b, 'var(--accent)', 2.4);
      var th = 90 * (1 - n); txt(gA, Fs[0].X(5), Fs[0].Y(0.9), n > 0.98 ? 'ideal semicircle' : 'sunk by ' + th.toFixed(0) + '°', 'amber', 'middle');
      // D: Bisquert line, Rct = 10 mOhm, Cdl = 1 F, plus the plain R || C it reduces to when Rm = 0
      draw(gD, ws.map(function (w) { return M11.parallel(M11.zR(R), M11.zC(1, w)); }), Fs[3], P[3].b, 'var(--text)', 1.2, '4 4');
      if (rp > 0) {
        draw(gD, ws.map(function (w) { return M11.zPorous(rp, R, 1, w); }), Fs[3], P[3].b, 'var(--second)', 2.4);
        var c = Math.sqrt(rp * R) / Math.tanh(Math.sqrt(rp / R)); el('circle', { cx: Fs[3].X(c * 1000), cy: P[3].b.y0, r: 3.5, fill: 'var(--second)' }, gD);
        txt(gD, Fs[3].X(0.3), Fs[3].Y(8.4), 'dot: the DC end', 'cyan', 'start');
      }
      read.innerHTML = 'A: n = <b>' + n.toFixed(2) + '</b>; n = 1 is a capacitor, n = 0.5 a Warburg line, n = 0 a resistor. D: pore resistance R<sub>m</sub> = <b>' + (rp * 1000).toFixed(0) + ' mΩ</b>' + (rp > 0 ? '; the arc starts with a 45° line and ends at √(R<sub>m</sub>R<sub>ct</sub>) coth √(R<sub>m</sub>/R<sub>ct</sub>) = ' + (Math.sqrt(rp * R) / Math.tanh(Math.sqrt(rp / R)) * 1000).toFixed(1) + ' mΩ (the dot), not at R<sub>ct</sub> = 10 mΩ.' : ': no pore resistance, the plain semicircle.');
    }
    on(sn, 'input', render); on(sr, 'input', render);
    steps(fig, [
      { text: '<b>Depressed arcs.</b> Real interfaces are not ideal capacitors. A constant phase element, Z = 1/(Y₀(jω)ⁿ), with n a little below 1 sinks the centre of the semicircle below the axis by 90°(1 − n). Its physical origin is still debated; treat n as a measure of non-ideality, not a fact about the surface.' },
      { text: '<b>Diffusion into a layer of finite thickness.</b> At high frequency the lithium does not reach the far side: the 45° Warburg line. Lower down it does. If the far side lets lithium through (open), the line bends back to the axis in an arc (tanh form); if it is closed, as at the back of an active particle, the line turns vertical, like a capacitor (coth form).' },
      { text: '<b>Particles are spheres.</b> With the same diffusion resistance R<sub>d</sub> and capacitance C<sub>d</sub>, a film turns vertical at R<sub>d</sub>/3 and a sphere at R<sub>d</sub>/15, and the sphere turns upward sooner. Fitting a film model to a cell of spheres misreads R<sub>d</sub>, and with it D = r²/(R<sub>d</sub>C<sub>d</sub>).' },
      { text: '<b>A porous electrode</b> is a ladder: electrolyte resistance down each pore, an interface on every grain. With pore resistance R<sub>m</sub> the arc starts with a 45° line at high frequency and grows wider. Slide R<sub>m</sub> to 0 and the plain semicircle returns.' }
    ]);
    render();
  });
  /* figs-11m.js */
  register('f11-12', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sA = fig.querySelector('.amp'), sAv = fig.querySelector('.amp-val'), sa = fig.querySelector('.alpha'), sav = fig.querySelector('.alpha-val');
    var i0 = 1e-3, f = 96485 / (8.314 * 298.15);
    // left: the Butler-Volmer curve
    var a = { x0: 50, y0: 220, x1: 240, y1: 40 }, X = function (e) { return a.x0 + (e + 0.12) / 0.24 * (a.x1 - a.x0); }, Y = function (i) { return (a.y0 + a.y1) / 2 - i / 0.016 * (a.y0 - a.y1); };
    e11axes(g, a, { X: X, Y: function (i) { return Y(i); }, xt: [[-0.1, '−100'], [0, '0'], [0.1, '100 mV']], yt: [[-0.008, '−8'], [0, '0'], [0.008, '8']], xlab: 'overpotential η', ylab: 'current, mA' });
    el('line', { x1: a.x0, x2: a.x1, y1: Y(0), y2: Y(0), stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g);
    var bv = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.6 }, g), tang = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g), seg = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    txt(g, X(0.02), Y(0.0062), 'slope 1/R_ct', 'cyan', 'start');
    // right top: current over one period against a pure sine
    var r = { x0: 300, y0: 128, x1: 505, y1: 40 }, XT = function (u) { return r.x0 + u * (r.x1 - r.x0); };
    txt(g, r.x0, 24, 'current over one period', 'strong', 'start');
    el('line', { x1: r.x0, x2: r.x1, y1: (r.y0 + r.y1) / 2, y2: (r.y0 + r.y1) / 2, stroke: 'var(--line-2)' }, g);
    var pS = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g), pI = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g);
    txt(g, r.x1, r.y0 + 18, 'dashed: a pure sine', '', 'end');
    // right bottom: harmonics
    var h = { x0: 320, y0: 270, x1: 505, y1: 192 }, YH = function (q) { return h.y0 - (Math.log10(Math.max(q, 1e-5)) + 5) / 5 * (h.y0 - h.y1); };
    e11axes(g, h, { X: function (x) { return x; }, Y: YH, yt: [[1e-4, '10⁻⁴'], [1e-2, '0.01'], [1, '1']], grid: true, ylab: 'size ÷ fundamental' });
    var bars = [1, 2, 3, 4, 5].map(function (n) { var x = h.x0 + 8 + (n - 1) * 36; txt(g, x + 13, h.y0 + 16, n === 1 ? 'f' : n + 'f', 'strong', 'middle'); return el('rect', { x: x, width: 26, fill: n === 1 ? 'var(--second)' : 'var(--accent)', 'fill-opacity': '.85' }, g); });
    badge(g, X(-0.08), Y(0.0062), 1); badge(g, r.x1 - 12, r.y1 + 6, 2); badge(g, h.x1 - 10, h.y1 + 4, 3);
    function render() {
      var A = Math.pow(10, +sA.value) / 1000, al = +sa.value, res = M11.bvHarmonics(i0, al, A, 298.15, 256);
      setSvgText(sAv, (A * 1000).toFixed(A < 0.01 ? 1 : 0) + ' mV'); setSvgText(sav, al.toFixed(2));
      var pts = []; for (var k = 0; k <= 120; k++) { var e = -0.12 + 0.24 * k / 120, i = i0 * (Math.exp((1 - al) * f * e) - Math.exp(-al * f * e)); if (Math.abs(i) <= 0.0085) pts.push([X(e), Y(i)]); }
      bv.setAttribute('d', e11d(pts));
      var eT = Math.min(0.12, 0.008 / (i0 * f)); tang.setAttribute('d', e11d([[X(-eT), Y(-i0 * f * eT)], [X(eT), Y(i0 * f * eT)]])); // tangent at eta = 0: slope i0 F/(RT) = 1/Rct for any alpha
      var sp = []; for (k = 0; k <= 60; k++) { var e2 = -A + 2 * A * k / 60; sp.push([X(e2), Y(i0 * (Math.exp((1 - al) * f * e2) - Math.exp(-al * f * e2)))]); }
      seg.setAttribute('d', e11d(sp.filter(function (p) { return p[1] >= a.y1 - 4 && p[1] <= a.y0 + 4; })));
      var imax = Math.max.apply(null, res.wave.map(function (w) { return Math.abs(w.i); })), yc = (r.y0 + r.y1) / 2, hh = (r.y0 - r.y1) / 2 - 4;
      pI.setAttribute('d', e11d(res.wave.map(function (w, k2) { return [XT(k2 / res.wave.length), yc - w.i / imax * hh]; })));
      pS.setAttribute('d', e11d(res.wave.map(function (w, k2) { return [XT(k2 / res.wave.length), yc - res.amps[1] * Math.sin(2 * Math.PI * k2 / res.wave.length) / imax * hh]; })));
      bars.forEach(function (bar, n) { var q = res.amps[n + 1] / res.amps[1], y = YH(q); bar.setAttribute('y', y); bar.setAttribute('height', Math.max(0, h.y0 - y)); });
      read.innerHTML = 'Amplitude <b>' + (A * 1000).toFixed(A < 0.01 ? 1 : 0) + ' mV</b>: total harmonic distortion <b>' + (res.thd * 100).toFixed(res.thd < 0.01 ? 2 : 1) + ' %</b>; the resistance read from the fundamental is <b>' + (res.rApparent / res.rct * 100).toFixed(1) + ' %</b> of R<sub>ct</sub> = RT/(Fi₀) = ' + res.rct.toFixed(1) + ' Ω.' + (Math.abs(al - 0.5) < 0.005 ? ' With α = 0.5 the curve is symmetric about η = 0, so there is no second harmonic.' : ' With α ≠ 0.5 the curve is lopsided and a second harmonic appears.');
    }
    on(sA, 'input', render); on(sa, 'input', render);
    steps(fig, [
      { text: 'Impedance assumes a linear system, but an electrode reaction is not linear: the Butler–Volmer current grows exponentially with overpotential. Close to equilibrium the curve is nearly straight, with slope 1/R<sub>ct</sub>, where R<sub>ct</sub> = RT/(Fi₀); that straight piece is what impedance measures.' },
      { text: 'A small sine, 5 to 10 mV, stays on the straight piece and the current is a sine too. Raise the amplitude: the current is distorted, and the resistance read from the fundamental drifts away from R<sub>ct</sub>.' },
      { text: 'A distorted current contains <b>harmonics</b>, signals at 2f, 3f and so on, because harmonics reflect the curvature of the current–voltage curve. Their combined size over the fundamental is the total harmonic distortion: a quick test that the amplitude is small enough. Nonlinear methods turn this round and drive the cell harder on purpose, reading the harmonics for kinetics, ageing and lithium plating.' }
    ]);
    render();
  });
  register('f11-13', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.cable'), sv = fig.querySelector('.cable-val');
    var C = M11.CELL, rPerM = 0.004, lPerM = 0.2e-6, fs = M11.freqs(10000, 0.5, 20);
    // the two set-ups
    function cell(x, y) { cellCan(g, x + 4, y, 32, 56); txt(g, x + 20, y + 33, 'cell', 'strong tag', 'middle'); }
    function meterBox(x, y) { el('rect', { x: x - 8, y: y, width: 78, height: 56, rx: 4, fill: MV('steel'), stroke: '#8B95A0', filter: 'url(#fx-lift)' }, g); el('rect', { x: x - 4, y: y + 5, width: 70, height: 44, rx: 2, fill: '#FBFCFD', stroke: '#C9CED6', 'stroke-width': .6 }, g); }
    function meter(x, y, lab) { meterBox(x, y); txt(g, x + 31, y + 22, 'analyzer', 'strong', 'middle'); txt(g, x + 31, y + 40, lab, '', 'middle'); }
    meter(20, 40, '2 terminals'); cell(200, 40);
    el('path', { d: 'M90,54 H200 M90,82 H200', stroke: 'var(--accent)', 'stroke-width': 2, fill: 'none' }, g);
    txt(g, 145, 34, 'current and voltage share the wires', '', 'middle');
    meter(280, 40, '4 terminals'); cell(460, 40);
    el('path', { d: 'M350,50 H460 M350,86 H460', stroke: 'var(--accent)', 'stroke-width': 2, fill: 'none' }, g);
    el('path', { d: 'M350,60 H440 V58 H460 M350,76 H440 V78 H460', stroke: 'var(--second)', 'stroke-width': 1.6, fill: 'none' }, g);
    txt(g, 405, 34, 'current pair (blue), sense pair (green)', '', 'middle');
    var b = { x0: 60, y0: 330, x1: 470, y1: 130 }, F = e11nyq(g, b, [16, 57], -12, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[-10, '−10'], [0, '0'], [5, '5']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var z4 = fs.map(function (f) { var w = 2 * Math.PI * f; return M11.add(M11.zL(C.L, w), M11.zR(C.R0), M11.zRQ(C.Rsei, C.Qsei, C.nsei, w), M11.parallel(M11.zR(C.Rct), M11.zC(C.Cdl, w))); });
    el('path', { d: e11zpath(z4, F, b, 1000), fill: 'none', stroke: 'var(--second)', 'stroke-width': 2.4 }, g);
    var p2 = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g), mk = el('g', {}, g);
    txt(g, F.X(36), F.Y(4.8), '4 terminals: the cell', 'cyan', 'start'); var l2 = txt(g, 0, 0, '2 terminals: cell + wires', 'amber', 'start');
    badge(g, 120, 104, 1); badge(g, 400, 104, 2); badge(g, F.X(18), F.Y(-9), 3);
    function render() {
      var Lm = +sl.value, Rw = rPerM * Lm, Lw = lPerM * Lm; setSvgText(sv, Lm.toFixed(1) + ' m');
      var z2 = z4.map(function (z, i) { var w = 2 * Math.PI * fs[i]; return M11.add(z, M11.zR(Rw), M11.zL(Lw, w)); });
      p2.setAttribute('d', e11zpath(z2, F, b, 1000));
      clear(mk);
      var x4 = z4.reduce(function (best, z) { return Math.abs(z.im) < Math.abs(best.im) ? z : best; }), x2 = z2.reduce(function (best, z) { return Math.abs(z.im) < Math.abs(best.im) ? z : best; });
      l2.setAttribute('x', Math.min(F.X(x2.re * 1000) + 8, b.x1 - 150)); l2.setAttribute('y', F.Y(-8));
      var z10 = z2[0];
      read.innerHTML = 'With <b>' + Lm.toFixed(1) + ' m</b> of cable on each side the two-terminal reading adds about <b>' + (Rw * 1000).toFixed(1) + ' mΩ</b> of wire to a cell whose ohmic resistance is ' + (C.R0 * 1000).toFixed(0) + ' mΩ, and at 10 kHz the inductive part reaches ' + (z10.im * 1000).toFixed(1) + ' mΩ below the axis instead of ' + (z4[0].im * 1000).toFixed(1) + ' mΩ. The four-terminal curve does not change.';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: '<b>Two terminals</b>: the analyzer passes the current and measures the voltage through the same two wires, so it measures the cell and the wires together, Z = Z<sub>cell</sub> + Z<sub>wire</sub>. For a cell of tens of milliohms, the wires are not negligible.' },
      { text: '<b>Four terminals</b>: one pair carries the current; a second pair senses the voltage at the cell’s own terminals and carries almost no current, so the wires drop no voltage on it and Z = Z<sub>cell</sub>. This is the connection recommended for batteries.' },
      { text: 'Longer cables add resistance and <b>inductance</b>, which pulls the high-frequency end further below the axis; it is worst for low-impedance cells such as batteries. Short cables, current and sense wires twisted in pairs, the same cables for calibration and measurement, and a fixed cell holder keep it small.' }
    ]);
    render();
  });
  register('f11-14', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cb = fig.querySelector('.drift'), sl = fig.querySelector('.noise'), sv = fig.querySelector('.noise-val');
    var C = M11.CELL, fs = M11.freqs(5000, 0.01, 8), tt = 0, ts = fs.map(function (f) { tt += Math.max(2 / f, 1); return tt; }), T = tt;
    function gauss(seed) { var s = seed; return function () { var x = 0; for (var j = 0; j < 6; j++) { s = (s * 1664525 + 1013904223) % 4294967296; x += s / 4294967296; } return (x - 3) / Math.sqrt(0.5); }; }
    var b = { x0: 60, y0: 210, x1: 470, y1: 40 }, F = e11nyq(g, b, [18, 59], -6, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[-5, '−5'], [0, '0'], [10, '10']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var r = { x0: 60, y0: 350, x1: 470, y1: 284 }, XR = function (f) { return e11log(f, -2, Math.log10(5000), r.x0, r.x1); }, YR = function (q) { return (r.y0 + r.y1) / 2 - q / 0.03 * (r.y0 - r.y1); };
    el('rect', { x: r.x0, y: YR(0.01), width: r.x1 - r.x0, height: YR(-0.01) - YR(0.01), fill: 'var(--second)', 'fill-opacity': '.07' }, g);
    e11axes(g, { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 }, { X: XR, Y: YR, xt: [[0.01, '0.01'], [1, '1'], [100, '100'], [5000, '5 kHz']], yt: [[-0.01, '−1'], [0, '0'], [0.01, '1']], ylab: 'residual, % of |Z|' });
    el('line', { x1: r.x0, x2: r.x1, y1: YR(0), y2: YR(0), stroke: 'var(--line-2)' }, g);
    var gd = el('g', {}, g), fit = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 1.8 }, g), gr = el('g', {}, g);
    badge(g, F.X(52), F.Y(10), 1); badge(g, r.x1 - 12, r.y1 + 12, 2);
    function render() {
      var drift = cb.checked, nz = +sl.value / 100, rn = gauss(7); setSvgText(sv, (nz * 100).toFixed(1) + ' %');
      var Z = fs.map(function (f, i) { var k = drift ? 1 + 0.3 * ts[i] / T : 1, p = { L: C.L, R0: C.R0, Rsei: C.Rsei * k, Qsei: C.Qsei, nsei: C.nsei, Rct: C.Rct * k, Cdl: C.Cdl, Rd: C.Rd, Cd: C.Cd }, z = M11.cellZ(p, 2 * Math.PI * f), m = M11.abs(z); return { re: z.re + nz * m * rn(), im: z.im + nz * m * rn() }; });
      var kk = M11.linKK(fs, Z);
      clear(gd); clear(gr);
      Z.forEach(function (z) { var y = F.Y(-z.im * 1000); if (y >= b.y1) el('circle', { cx: F.X(z.re * 1000), cy: y, r: 3, fill: 'var(--accent)' }, gd); });
      fit.setAttribute('d', e11zpath(kk.fit, F, b, 1000));
      kk.res.forEach(function (q, i) { el('circle', { cx: XR(fs[i]), cy: Math.max(r.y1, Math.min(r.y0, YR(q.re))), r: 2.6, fill: 'var(--accent)' }, gr); el('circle', { cx: XR(fs[i]), cy: Math.max(r.y1, Math.min(r.y0, YR(q.im))), r: 2.6, fill: 'none', stroke: 'var(--second)', 'stroke-width': 1.4 }, gr); });
      var mx = Math.max.apply(null, kk.res.map(function (q) { return Math.max(Math.abs(q.re), Math.abs(q.im)); })), chi = kk.chi2;
      var verdict = chi < 1e-6 ? 'excellent' : chi < 1e-5 ? 'reasonable' : chi < 1e-4 ? 'marginal' : 'bad';
      read.innerHTML = 'Linear Kramers–Kronig test with ' + kk.M + ' R‖C elements of fixed time constants: pseudo-χ² = <b>' + sci(chi, 1) + '</b> (' + verdict + ' by the usual rule of thumb), largest residual <b>' + (mx * 100).toFixed(2) + ' %</b>. ' + (drift ? 'The cell changed during the ' + Math.round(T / 60) + '-minute sweep, and the residuals at low frequency, measured last, follow a pattern instead of scattering.' : nz > 0 ? 'Noise scatters the residuals evenly around zero: the data are noisy but valid.' : 'The residuals are tiny: the spectrum is consistent with a linear, causal, stable system.');
    }
    on(cb, 'change', render); on(sl, 'input', render);
    steps(fig, [
      { text: 'Before fitting any model, check that the spectrum could have come from a linear, causal and stable system that stayed the same during the sweep. For such a system the real and imaginary parts are not independent: the Kramers–Kronig relations compute one from the other. They need every frequency from zero to infinity, so in practice a test circuit is fitted instead: many R‖C elements with fixed, evenly spread time constants, only their resistances free. Any valid spectrum can be fitted this way.' },
      { text: 'The residuals, data minus fit as a fraction of |Z|, should be small and randomly scattered around zero; well below 1 % is the usual aim. Tick “cell drifting”: the cell’s resistances grow by 30 % during the sweep, and the low frequencies, measured last, leave a pattern in the residuals. Add noise: the residuals scatter, but without a pattern.' }
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
