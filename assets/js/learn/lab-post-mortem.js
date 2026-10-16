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
  register('f11-18', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var cols = [
      { x: 20, t: 'from outside, cell intact', items: ['cycling, dQ/dV', 'current pulses', 'GITT', 'impedance', 'cyclic voltammetry'], col: 'var(--second)', why: 'Nondestructive: the cell keeps working, so the same cell can be followed as it ages. Capacity, rate, resistances, diffusion and state of health come from here. Capacity, cyclic voltammetry and differential capacity are also used to check what impedance and a tear-down suggest.' },
      { x: 187, t: 'inside, while it works', items: ['three-electrode cell', 'in situ X-ray, NMR', 'local impedance', 'pressure sensing'], col: 'var(--accent)', why: 'In situ: a reference electrode separates the two electrodes; plastic cells let X-ray absorption, NMR, Mössbauer spectroscopy and the electron microscope watch the electrodes while the cell runs; local impedance probes one spot with a moving tip; a pressure sensor follows the SEI swelling.' },
      { x: 354, t: 'after it is opened', items: ['symmetric cells', 'microscopy', 'XPS, Raman', 'X-ray CT (before)'], col: 'var(--heat)', why: 'Post-mortem: discharge the cell, open it in an argon glove box and examine its parts. Electrodes harvested from a commercial cell can be rebuilt into symmetric cells, two identical electrodes, to see which electrode carries which arc. X-ray tomography before opening shows where to cut. A fresh cell treated the same way is the baseline.' }
    ];
    cols.forEach(function (c, i) {
      el('rect', { x: c.x, y: 30, width: 150, height: 190, rx: 6, fill: c.col, 'fill-opacity': '.08', stroke: c.col, 'stroke-opacity': '.6' }, g);
      txt(g, c.x + 75, 20, c.t, 'strong', 'middle');
      c.items.forEach(function (it, j) { txt(g, c.x + 12, 58 + j * 26, '• ' + it, '', 'start'); });
      badge(g, c.x + 136, 206, i + 1);
    });
    txt(g, 260, 244, 'accelerating-rate calorimetry finds where thermal runaway starts (chapter 17)', '', 'middle');
    steps(fig, cols.map(function (c) { return { text: c.why, on: function () { read.innerHTML = '<b>' + c.t + '</b>: ' + c.items.join(', ') + '.'; } }; }));
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
  /* figs-11pm.js */
  register('f11-34', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sel = 0;
    var STEPS = [
      ['Outside first', 'capacity, dV/dQ, EIS', 'Everything that can be learnt without opening is learnt first: the capacity and its history, the differential curves that flag lost lithium, lost material and plating, the impedance spectrum. A cell that is opened cannot be measured again, and a fresh cell treated the same way is the baseline.'],
      ['Discharge', 'to the cut-off, slowly', 'The cell is discharged to its lower cut-off, at C/2 with a constant-voltage hold to C/50 in one study, so that the positive electrode is as full of lithium as it can be and the negative as empty: the safest state, and the one in which what is missing shows.'],
      ['Open in argon', 'O₂ and H₂O ≤ 1 ppm', 'The pouch is cut along its long side with ceramic scissors and a scalpel, without touching the stack or shorting it, inside an argon glovebox with oxygen and water below 1 ppm, so that nothing on the electrodes reacts with air before it is seen.'],
      ['Map the samples', 'stack, edge and centre', 'A large cell ages unevenly. Samples are cut from the beginning, middle and end of the stack, and from the edge and centre of each sheet, and each is labelled by its position; one measurement per cell would hide the pattern.'],
      ['Wash, or not', 'a DMC dip, or none', 'Electrolyte residue is removed with a dip in dimethyl carbonate and vacuum drying at room temperature; but surface spectroscopy is done on unwashed samples, and bulky deposits are left unwashed because washing would carry them away.'],
      ['Measure', 'one question, one technique', 'Then the techniques, each for one question: peel tests for adhesion, microscopy for morphology, diffraction for the lithium left in the lattice, spectroscopy for the surface layers, and the electrode rebuilt in a coin cell for the capacity it can still deliver.']
    ];
    var boxes = [];
    STEPS.forEach(function (s, k) {
      var x = 20 + (k % 3) * 166, y = 36 + Math.floor(k / 3) * 118;
      var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(s[0]), style: 'cursor:pointer' }, g);
      var r = el('rect', { x: x, y: y, width: 150, height: 90, rx: 12, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, grp);
      el('circle', { cx: x + 20, cy: y + 20, r: 11, fill: 'var(--accent)' }, grp); txt(grp, x + 20, y + 24, String(k + 1), 'strong', 'middle', { style: 'fill:#fff;font-size:11px' });
      txt(grp, x + 38, y + 24, s[0], 'strong', 'start', { style: 'font-size:12px' });
      txt(grp, x + 12, y + 48, s[1], '', 'start', { style: 'font-size:10.5px' });
      if (k < 5) arrow(g, k % 3 === 2 ? x + 75 : x + 152, k % 3 === 2 ? y + 92 : y + 45, k % 3 === 2 ? x + 75 : x + 164, k % 3 === 2 ? y + 116 : y + 45, 'var(--muted)', 1.4);
      boxes.push(r); pressable(grp, function () { sel = k; place(); });
    });
    // the one-way sign
    txt(g, 260, 272, 'one way: a cell that has been opened cannot be measured again', 'heat', 'middle', { style: 'font-size:11px' });
    badge(g, 505, 40, 1); badge(g, 505, 250, 2); badge(g, 20, 262, 3);
    function place() { boxes.forEach(function (r, k) { r.setAttribute('stroke', k === sel ? 'var(--accent)' : 'var(--line-2)'); r.setAttribute('stroke-width', k === sel ? 2 : 1); }); read.innerHTML = '<b>' + (sel + 1) + '. ' + STEPS[sel][0] + '.</b> ' + STEPS[sel][2]; }
    steps(fig, [
      { text: 'The order is the method. Nothing is opened before the <b>non-destructive</b> record is complete, because opening ends the experiment.', on: function () { sel = 0; place(); } },
      { text: 'Opening is done <b>discharged and in argon</b>, and the samples are <b>mapped</b>: in a stacked cell the middle and the edge age differently, and a single sample would tell the wrong story.', on: function () { sel = 3; place(); } },
      { text: 'Each later technique answers one question and disturbs the sample in its own way; <b>washing</b> is already a choice that removes some of the evidence.', on: function () { sel = 4; place(); } }
    ]);
    place();
  });
  register('f11-35', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cb = fig.querySelectorAll('button[data-cell]'), cell = 'A';
    // residual capacity, % of the pristine 2.53 mAh: [beginning edge, beginning centre, middle edge, middle centre]
    var DATA = { A: { v: [70.7, 62.8, 65.6, 88.9], soh: 72, rate: '0.3C', cyc: 533 }, B: { v: [79, 68.4, 66.4, 68.4], soh: 79.7, rate: '2C', cyc: 660 } };
    // the stack, drawn edge-on, with the sampled sheets marked
    var sx = 96, sy = 50, N = 38;
    for (var k = 0; k < N; k++) { var y = sy + k * 4.6; el('rect', { x: sx, y: y, width: 90, height: 3, fill: k % 2 ? MV('lco') : MV('graphite') }, g); }
    el('rect', { x: sx - 6, y: sy - 6, width: 102, height: N * 4.6 + 8, rx: 4, fill: 'none', stroke: '#9FB3C2' }, g);
    txt(g, sx + 45, sy - 14, '38 negative, 37 positive sheets', '', 'middle', { style: 'font-size:10px' });
    [['B', 2, 'beginning'], ['M', 18, 'middle'], ['E', 35, 'end']].forEach(function (p) { el('line', { x1: sx - 14, x2: sx - 6, y1: sy + p[1] * 4.6 + 1.5, y2: sy + p[1] * 4.6 + 1.5, stroke: 'var(--accent)', 'stroke-width': 2 }, g); txt(g, sx - 18, sy + p[1] * 4.6 + 5, p[2], '', 'end', { style: 'font-size:10px' }); });
    // one sheet, face on: edge and centre samples
    var fx = 230, fy = 60, fw = 150, fh = 170, cells = [], labs = [];
    [[0, 'edge', 'B'], [1, 'centre', 'B'], [2, 'edge', 'M'], [3, 'centre', 'M']].forEach(function (q, i) {});
    el('rect', { x: fx, y: fy, width: fw, height: fh, rx: 4, fill: MV('lco'), stroke: '#1C1F23' }, g);
    txt(g, fx + fw / 2, fy - 10, 'one positive sheet, face on', '', 'middle', { style: 'font-size:10px' });
    // four sample squares: beginning (left half) and middle (right half) sheets would be different sheets; here the sheet shows edge/centre, and two columns stand for the two stack positions
    var POS = [[fx + 12, fy + 12, 'B, edge'], [fx + 42, fy + 62, 'B, centre'], [fx + 96, fy + 12, 'M, edge'], [fx + 96, fy + 100, 'M, centre']];
    POS.forEach(function (p, i) { var r = el('rect', { x: p[0], y: p[1], width: 42, height: 42, rx: 4, fill: '#fff', stroke: '#fff', 'stroke-width': 1.5 }, g); cells.push(r); labs.push(txt(g, p[0] + 21, p[1] + 26, '', 'strong', 'middle', { style: 'font-size:11px' })); txt(g, p[0] + 21, p[1] + 54, p[2], '', 'middle', { style: 'font-size:9px;fill:#E6E8EB' }); });
    txt(g, fx + fw / 2, fy + fh + 16, 'residual capacity, % of pristine', '', 'middle', { style: 'font-size:10px' });
    // scale
    var scx = 410, scy = 70; for (var s = 0; s < 8; s++) { var v = 60 + s * 5; el('rect', { x: scx, y: scy + (7 - s) * 18, width: 16, height: 18, fill: col(v) }, g); if (s % 2 === 0) txt(g, scx + 22, scy + (7 - s) * 18 + 13, v + ' %', '', 'start', { style: 'font-size:10px' }); }
    txt(g, scx, scy - 10, 'colour', '', 'start', { style: 'font-size:10px' });
    function col(v) { var t = Math.max(0, Math.min(1, (v - 60) / 35)); return 'rgb(' + Math.round(230 - 180 * t) + ',' + Math.round(80 + 100 * t) + ',' + Math.round(60 + 100 * t) + ')'; }
    badge(g, 190, 110, 1); badge(g, 216, 222, 2); badge(g, 470, 240, 3);
    function place() {
      Array.prototype.forEach.call(cb, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-cell') === cell)); });
      var d = DATA[cell];
      d.v.forEach(function (v, i) { cells[i].setAttribute('fill', col(v)); setSvgText(labs[i], v.toFixed(1)); });
      var mx = Math.max.apply(null, d.v), mn = Math.min.apply(null, d.v);
      read.innerHTML = 'Cell ' + cell + ', charged at ' + d.rate + ' at 5 °C, ' + d.cyc + ' equivalent cycles, state of health ' + d.soh + ' %: positive electrode discs cut from four places and cycled again in coin cells deliver from <b>' + mn + ' to ' + mx + ' %</b> of the pristine capacity. ' + (cell === 'A' ? 'The centre of the middle sheet kept 89 %; the edge of the first sheet 71 %, its centre 63 %: the same electrode, aged by a factor of three differently, depending on where it sat.' : 'The spread is smaller at the faster charge; the authors suggest the higher current warmed the cell above 5 °C.') + ' After their first discharge all discs cycled alike in a rate test, so the material was intact: the loss was lithium, not active material.';
    }
    Array.prototype.forEach.call(cb, function (bt) { on(bt, 'click', function () { cell = bt.getAttribute('data-cell'); place(); }); });
    steps(fig, [
      { text: 'A 16 Ah pouch cell is a <b>stack</b> of 38 negative and 37 positive sheets; samples were cut from the first, middle and last sheets, at the edge and at the centre.' },
      { text: 'Rebuilt in coin cells, the discs show <b>where the capacity went</b>: the first sheet and the edges lost most, the centre of the stack least. The authors attribute the pattern mainly to pressure, highest in the middle of the stack and the centre of each sheet.' },
      { text: 'The colour scale runs from 60 to 95 %. One sample per cell, taken anywhere, could have reported any of these numbers.' }
    ]);
    place();
  });
  register('f11-36', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sel = -1;
    var ROWS = [['pristine', 5.4, 504], ['fresh, formed', 2.2, 372], ['cell A, beginning', 5, 336], ['cell A, middle', 3.3, 358], ['cell A, end', 3.2, 534], ['cell B, beginning', 4.7, 579], ['cell B, middle', 8, 560], ['cell B, end', 3.5, 342]];
    // the peel test sketch
    el('rect', { x: 20, y: 60, width: 120, height: 10, fill: M('copper') }, g);
    el('path', { d: 'M20,60 H90 Q98,60 98,52 V20', fill: 'none', stroke: MV('graphite'), 'stroke-width': 8 }, g);
    arrow(g, 98, 30, 98, 8, 'var(--accent)', 1.6); txt(g, 110, 16, '90°, 20 mm/min', '', 'start', { style: 'font-size:10px' });
    txt(g, 20, 90, 'strip 20 × 90 mm', '', 'start', { style: 'font-size:10px' }); txt(g, 20, 103, 'force per width, N/m', '', 'start', { style: 'font-size:10px' });
    // the two bar charts, log scale
    var b = { x0: 190, y0: 250, x1: 500, y1: 110 }, L = function (v) { return Math.log10(v); };
    var fr = cvFrame(g, b, [-0.5, 7.5], [0, 3], { yt: [[0, '1'], [1, '10'], [2, '100'], [3, '1000']], yl: 'adhesion, N/m (log)' });
    var bars = [];
    ROWS.forEach(function (r, k) {
      var x = fr.X(k), w = 11;
      var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(r[0]), style: 'cursor:pointer' }, g);
      var a = el('rect', { x: x - w - 1, y: fr.Y(L(r[1])), width: w, height: fr.Y(0) - fr.Y(L(r[1])), fill: MV('graphite') }, grp);
      var c = el('rect', { x: x + 1, y: fr.Y(L(r[2])), width: w, height: fr.Y(0) - fr.Y(L(r[2])), fill: 'var(--accent)' }, grp);
      el('rect', { x: x - w - 3, y: b.y1, width: 2 * w + 6, height: b.y0 - b.y1, fill: 'transparent' }, grp);
      txt(g, x, b.y0 + 14, ['prist.', 'fresh', 'A·B', 'A·M', 'A·E', 'B·B', 'B·M', 'B·E'][k], '', 'middle', { style: 'font-size:10px' });
      bars.push([a, c]); pressable(grp, function () { sel = k; place(); });
    });
    el('rect', { x: 200, y: 36, width: 10, height: 10, fill: MV('graphite') }, g); txt(g, 214, 45, 'negative (graphite on copper)', '', 'start', { style: 'font-size:10px' });
    el('rect', { x: 200, y: 54, width: 10, height: 10, fill: 'var(--accent)' }, g); txt(g, 214, 63, 'positive (LiFePO₄ on aluminium)', '', 'start', { style: 'font-size:10px' });
    badge(g, fr.X(1), fr.Y(1.6), 1); badge(g, fr.X(4.5), fr.Y(2.95), 2); badge(g, 60, 40, 3);
    function place() {
      bars.forEach(function (p, k) { p[0].setAttribute('stroke', k === sel ? 'var(--text)' : 'none'); p[1].setAttribute('stroke', k === sel ? 'var(--text)' : 'none'); });
      if (sel < 0) { read.innerHTML = 'Tap a pair of bars. Note the logarithmic scale: the positive coating holds a hundred times harder than the negative.'; return; }
      var r = ROWS[sel];
      read.innerHTML = '<b>' + r[0] + '</b>: negative electrode ' + r[1] + ' N/m, positive electrode ' + (sel === 6 ? 'above 550' : r[2]) + ' N/m. ' + (sel === 0 ? 'Before formation the graphite coating still holds with 5.4 N/m.' : sel === 1 ? 'After formation alone, the graphite adhesion has more than halved: the SEI and the first swelling loosen the coating before any ageing.' : 'The positive coating stays above 330 N/m in every aged sample; the negative is so loose that half cells could not be built from some of the aged discs.');
    }
    steps(fig, [
      { text: 'A <b>peel test</b> pulls a strip of coating off its collector at 90° and reports the force per width. It is the first thing to measure, because it decides which samples can be handled at all.' },
      { text: 'The positive coating holds at several hundred N/m, aged or not; the graphite coating at a few, and its adhesion drops by more than half in formation. Delamination is a negative-electrode problem here.' },
      { text: 'A coating that peels on its own is not only a mechanical finding: it is active material that no longer counts, and a sample that cannot be rebuilt into a coin cell.' }
    ]);
    place();
  });
  register('f11-37', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), mb = fig.querySelectorAll('button[data-view]'), view = 'map';
    var gp = el('g', {}, g);
    badge(g, 30, 60, 1); badge(g, 490, 60, 2); badge(g, 260, 262, 3);
    function draw() {
      clear(gp);
      if (view === 'map') {
        // the aged graphite sheet of an 18650 cell, unrolled: deposits on 11 % of its area, mostly at the ends of the roll
        var x0 = 40, y0 = 60, w = 440, h = 150;
        el('rect', { x: x0, y: y0, width: w, height: h, rx: 3, fill: MV('graphite') }, gp);
        var seed = 3; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
        for (var k = 0; k < 60; k++) { var end = rnd() < 0.8, cx = end ? (rnd() < 0.5 ? x0 + rnd() * 70 : x0 + w - rnd() * 70) : x0 + rnd() * w, cy = y0 + 8 + rnd() * (h - 16); el('ellipse', { cx: cx, cy: cy, rx: 4 + rnd() * 10, ry: 3 + rnd() * 6, fill: rnd() < 0.5 ? '#C9A14A' : '#D8DCE2', opacity: .85 }, gp); }
        for (k = 0; k < 6; k++) { var lx = x0 + 20 + rnd() * (w - 40); el('path', { d: 'M' + lx + ',' + (y0 + 10) + ' l' + (rnd() * 6 - 3) + ',' + (h - 20), fill: 'none', stroke: '#0E0F11', 'stroke-width': .8 }, gp); }
        txt(gp, x0 + w / 2, y0 - 10, 'aged graphite sheet, unrolled: deposits (gold, grey) and cracks', '', 'middle', { style: 'font-size:10px' });
        txt(gp, x0, y0 + h + 16, 'end of the roll', '', 'start', { style: 'font-size:10px' }); txt(gp, x0 + w, y0 + h + 16, 'end of the roll', '', 'end', { style: 'font-size:10px' });
        txt(gp, x0 + w / 2, y0 + h + 34, 'deposits on 11 % of the area (8.4 % one side, 13.2 % the other); the LiFePO₄ sheet showed none', '', 'middle', { style: 'font-size:10px' });
      } else {
        // the bars: what the coin cell measured against what the whole cell lost
        var b = { x0: 120, y0: 230, x1: 440, y1: 60 }, fr = cvFrame(gp, b, [-0.5, 1.5], [0, 35], { yt: [[0, '0'], [10, '10'], [20, '20'], [30, '30']], yl: 'negative-electrode capacity lost, %' });
        [[0, 9, 'harvested disc\nin a coin cell', 'var(--accent)'], [1, 30, 'whole cell,\nestimated from outside', 'var(--heat)']].forEach(function (q) {
          el('rect', { x: fr.X(q[0]) - 40, y: fr.Y(q[1]), width: 80, height: fr.Y(0) - fr.Y(q[1]), fill: q[3], 'fill-opacity': .8 }, gp);
          txt(gp, fr.X(q[0]), fr.Y(q[1]) - 6, 'about ' + q[1] + ' %', 'strong', 'middle', { style: 'font-size:12px' });
          q[2].split('\n').forEach(function (l, i) { txt(gp, fr.X(q[0]), b.y0 + 16 + i * 13, l, '', 'middle', { style: 'font-size:10px' }); });
        });
        txt(gp, 280, 270, 'the difference is the material under the deposits, which peeled off and could not be tested', 'heat', 'middle', { style: 'font-size:10px' });
      }
    }
    function place() { Array.prototype.forEach.call(mb, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-view') === view)); }); draw(); read.innerHTML = view === 'map' ? 'An 18650 LiFePO₄ | graphite cell cycled at 50 °C to 30 to 40 % state of health, opened in argon and <b>not washed</b>, so as not to disturb the bulky deposits. The positive sheet showed no deposits, cracks or exfoliation; the negative showed all three, concentrated at the ends of the roll, where the deposits were mainly oxygen in the electron probe and the light grey areas about 60 % fluorine, read as LiF.' : 'Discs of the aged graphite rebuilt into coin cells against lithium lost on average <b>9 %</b> of their capacity; the whole cell&#8217;s negative electrode, estimated from outside in a companion study, had lost about <b>30 %</b>. The discs that could be tested were the good ones: the material under the bulky deposits peeled off the copper and never reached a coin cell.'; }
    Array.prototype.forEach.call(mb, function (bt) { on(bt, 'click', function () { view = bt.getAttribute('data-view'); place(); }); });
    steps(fig, [
      { text: 'Inspection first, with the naked eye and a camera: colour, deposits, cracks, exfoliation, and <b>where</b> they are. In a wound cell the ends of the roll age first.', on: function () { view = 'map'; place(); } },
      { text: 'The harvested electrode <b>back in a coin cell</b> against lithium measures what the material can still do; the positive disc here delivered its full capacity, the negative lost 9 %.', on: function () { view = 'bars'; place(); } },
      { text: 'But a coin cell can only test what survives punching and handling. The disc result and the whole-cell estimate disagree by a factor of three, and the difference is the part that fell off. A post-mortem number always carries its sampling.', on: function () { view = 'bars'; place(); } }
    ]);
    place();
  });
  register('f11-38', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sel = -1;
    // LiFePO4 / FePO4 % after discharge: [label, FePO4 %]
    var ROWS = [['fresh', 9], ['A, beginning, centre', 30], ['A, beginning, edge', 20], ['A, middle, centre', 25], ['A, middle, edge', 15], ['A, end, centre', 26], ['A, end, edge', 18], ['B, beginning, centre', 25], ['B, middle, centre', 26], ['B, end, centre', 3]];
    // a diffraction sketch: two peaks whose heights follow the fractions
    var b = { x0: 40, y0: 150, x1: 190, y1: 40 }, fr = cvFrame(g, b, [16, 24], [0, 1.1], { xt: [[17, '17'], [20, '20'], [23, '23']], xl: '2θ, schematic', yl: 'intensity' });
    var pk = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, g);
    txt(g, fr.X(17.0), b.y1 + 12, 'LiFePO₄', 'amber', 'end', { style: 'font-size:10px' }); txt(g, fr.X(18.7), b.y1 + 12, 'FePO₄', 'heat', 'start', { style: 'font-size:10px' });
    // the bars
    var bb = { x0: 300, y0: 236, x1: 500, y1: 40 }, fb = cvFrame(g, bb, [0, 35], [-0.5, 9.5], { xt: [[0, '0'], [10, '10'], [20, '20'], [30, '30']], xl: 'FePO₄ left after discharge, %' });
    var bars = [];
    ROWS.forEach(function (r, k) {
      var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(r[0]), style: 'cursor:pointer' }, g);
      var y = fb.Y(9 - k);
      var rect = el('rect', { x: bb.x0, y: y - 8, width: fb.X(r[1]) - bb.x0, height: 16, fill: k === 0 ? 'var(--muted)' : r[0][0] === 'A' ? 'var(--accent)' : 'var(--second)', 'fill-opacity': .8 }, grp);
      el('rect', { x: bb.x0 - 100, y: y - 9, width: bb.x1 - bb.x0 + 100, height: 18, fill: 'transparent' }, grp);
      txt(grp, bb.x0 - 4, y + 4, r[0].replace('beginning', 'begin.'), '', 'end', { style: 'font-size:9.5px' });
      txt(grp, fb.X(r[1]) + 4, y + 4, r[1] + ' %', '', 'start', { style: 'font-size:10px' });
      bars.push(rect); pressable(grp, function () { sel = k; place(); });
    });
    badge(g, fr.X(22.5), fr.Y(0.85), 1); badge(g, bb.x1 - 10, fb.Y(5), 2); badge(g, bb.x1 - 10, fb.Y(0), 3);
    function peak(x0, hgt, wdt) { var d = ''; for (var k = 0; k <= 200; k++) { var x = 16 + k * 0.04, y = hgt * Math.exp(-((x - x0) * (x - x0)) / (2 * wdt * wdt)); d += (k ? 'L' : 'M') + fr.X(x).toFixed(1) + ',' + fr.Y(y).toFixed(1); } return d; }
    function place() {
      bars.forEach(function (r, k) { r.setAttribute('stroke', k === sel ? 'var(--text)' : 'none'); });
      var f = sel < 0 ? 9 : ROWS[sel][1];
      var d = '', pts = [];
      for (var k = 0; k <= 200; k++) { var x = 16 + k * 0.04, y = (1 - f / 100) * Math.exp(-((x - 17.2) * (x - 17.2)) / (2 * 0.12 * 0.12)) + (f / 100) * Math.exp(-((x - 18.4) * (x - 18.4)) / (2 * 0.12 * 0.12)) + 0.02; d += (k ? 'L' : 'M') + fr.X(x).toFixed(1) + ',' + fr.Y(y).toFixed(1); }
      pk.setAttribute('d', d);
      read.innerHTML = (sel < 0 ? 'Tap a bar. ' : '<b>' + ROWS[sel][0] + '</b>: ' + ROWS[sel][1] + ' % of the iron phosphate is still FePO₄ after a full discharge. ') + 'A discharged LiFePO₄ electrode should be all LiFePO₄; the FePO₄ that remains is lattice that no lithium came back to fill, because that lithium was lost on the negative side. The fresh cell leaves 9 %; cell A up to 30 % at the centre of the first sheet, and less at the edges; cell B&#8217;s last sheet only 3 %. The two phases are counted by Rietveld refinement of a pattern taken on the electrode itself.';
    }
    steps(fig, [
      { text: 'X-ray diffraction on the electrode itself counts the two phases of a two-phase material: after discharge, every FePO<sub>4</sub> peak left standing is <b>lithium that did not return</b>.' },
      { text: 'Cell A: the centre of each sheet holds more FePO<sub>4</sub> than its edge, and the first sheet the most. The lithium inventory was lost unevenly, following the same pattern as the residual capacity of L6.3.' },
      { text: 'Cell B&#8217;s last sheet is almost fully lithiated again; its loss sat elsewhere. One diffraction pattern per cell would have reported whichever sheet was chosen.' }
    ]);
    place();
  });
  register('f11-39', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), tb = fig.querySelectorAll('button[data-tech]'), tech = 'nmr', gp = el('g', {}, g);
    badge(g, 30, 40, 1); badge(g, 490, 40, 2); badge(g, 30, 266, 3);
    function draw() {
      clear(gp);
      if (tech === 'nmr') {
        var b = { x0: 60, y0: 230, x1: 480, y1: 50 }, fr = cvFrame(gp, b, [320, -40], [0, 1.15], { xt: [[300, '300'], [250, '250'], [200, '200'], [100, '100'], [0, '0']], xl: '⁷Li shift, ppm (metallic lithium at 245 to 270 ppm, ions near 0)', yl: 'signal' });
        [['fresh', 0, 'var(--muted)', 0], ['real-aged, 93 %', 0, 'var(--second)', 0.03], ['artificially aged, 85 %', 0.45, 'var(--heat)', 0.06]].forEach(function (s, i) {
          var d = ''; for (var k = 0; k <= 360; k++) { var x = 320 - k; var y = Math.exp(-(x * x) / (2 * 8 * 8)) * (0.9 - i * 0.2) + s[1] * Math.exp(-((x - 258) * (x - 258)) / (2 * 10 * 10)) + s[3]; d += (k ? 'L' : 'M') + fr.X(x).toFixed(1) + ',' + fr.Y(y).toFixed(1); }
          el('path', { d: d, fill: 'none', stroke: s[2], 'stroke-width': 1.8 }, gp); txt(gp, fr.X(90), fr.Y(0.95 - i * 0.2) - 2, s[0], '', 'start', { style: 'font-size:10px;fill:' + s[2] });
        });
        txt(gp, fr.X(258), fr.Y(0.55), 'Knight shift: metal', 'heat', 'middle', { style: 'font-size:10px' });
      } else if (tech === 'icp') {
        var b2 = { x0: 80, y0: 230, x1: 480, y1: 50 }, fb = cvFrame(gp, b2, [-0.5, 3.5], [0, 1.2], { yl: 'water-soluble Li⁺ per mass of coating (relative)' });
        [['fresh', 0.4, 'var(--muted)'], ['real-aged', 0.7, 'var(--second)'], ['aged, opened', 0.72, 'var(--heat)'], ['aged, 11 weeks', 1.0, 'var(--heat)']].forEach(function (s, k) {
          el('rect', { x: fb.X(k) - 30, y: fb.Y(s[1]), width: 60, height: fb.Y(0) - fb.Y(s[1]), fill: s[2], 'fill-opacity': .8 }, gp);
          txt(gp, fb.X(k), b2.y0 + 14, s[0], '', 'middle', { style: 'font-size:9.5px' });
        });
        txt(gp, 280, 262, 'schematic order of the measured values, not their magnitudes; errors 1 to 3 %', '', 'middle', { style: 'font-size:10px' });
      } else {
        el('rect', { x: 60, y: 50, width: 400, height: 180, fill: MV('graphite') }, gp);
        var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
        for (var k = 0; k < 40; k++) el('circle', { cx: 70 + rnd() * 380, cy: 60 + rnd() * 160, r: 6 + rnd() * 10, fill: '#5A5F66', stroke: '#2C2F33' }, gp);
        for (k = 0; k < 120; k++) { var cx = 300 + rnd() * 140, cy = 70 + rnd() * 140; el('circle', { cx: cx, cy: cy, r: 1.5 + rnd() * 2.5, fill: '#C9CDD2', opacity: .9 }, gp); }
        el('ellipse', { cx: 370, cy: 140, rx: 80, ry: 70, fill: 'none', stroke: 'var(--heat)', 'stroke-dasharray': '4 3' }, gp);
        txt(gp, 260, 246, 'mossy layer: oxygen and fluorine hot spots in the electron probe,', 'heat', 'middle', { style: 'font-size:10px' }); txt(gp, 260, 259, 'the carbon signal weaker beneath', 'heat', 'middle', { style: 'font-size:10px' });
        txt(gp, 160, 42, 'bare graphite', '', 'middle', { style: 'font-size:10px' });
      }
    }
    function place() {
      Array.prototype.forEach.call(tb, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-tech') === tech)); }); draw();
      read.innerHTML = tech === 'nmr' ? '<b>⁷Li magic-angle-spinning NMR</b> on active material scraped from the copper and sealed in a rotor inside the glovebox. Metallic lithium has a Knight shift of 245 to 270 ppm, far from the ions near 0 ppm: a direct signature, found in both artificially aged cells and in neither the fresh nor the car-aged cell, and still there after 11 weeks of storage. Direct, but only qualitative.' : tech === 'icp' ? '<b>ICP-OES</b> of the lithium that dissolves when a weighed piece of electrode is stirred in water: plated metal reacts with water and is counted, with the soluble salts. Quantitative, with errors of 1 to 3 %, but indirect: lithium that has already turned into LiF is insoluble and is missed. The aged cells held more soluble lithium than the fresh one.' : '<b>Scanning electron microscopy</b> with elemental mapping sees a mossy layer on the aged graphite, absent from fresh and car-aged samples, with oxygen and fluorine hot spots where the metal has reacted with air during preparation. Lithium itself cannot be mapped; the finding is indirect and local, a square centimetre at most.';
    }
    Array.prototype.forEach.call(tb, function (bt) { on(bt, 'click', function () { tech = bt.getAttribute('data-tech'); place(); }); });
    steps(fig, [
      { text: 'Plated lithium is the finding that matters most for safety, and three techniques look for it in three ways: by its <b>nuclear signature</b>, by what <b>dissolves</b>, and by what the microscope <b>sees</b>.', on: function () { tech = 'nmr'; place(); } },
      { text: 'Each has a reach: NMR and ICP average over a large piece, the microscope over a very small one; NMR is direct but not quantitative, ICP quantitative but indirect, the microscope neither.', on: function () { tech = 'icp'; place(); } },
      { text: 'Agreement between them, on samples whose position in the cell is known, is the evidence. One of them alone is a hint.', on: function () { tech = 'sem'; place(); } }
    ]);
    place();
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
