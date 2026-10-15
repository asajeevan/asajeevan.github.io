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
  function e11d(pts) { var d = ''; for (var i = 0; i < pts.length; i++) { if (!isFinite(pts[i][0]) || !isFinite(pts[i][1])) continue; d += (d ? 'L' : 'M') + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1); } return d; }
  function e11axes(g, b, o) {
    el('line', { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0, stroke: 'var(--line-2)' }, g);
    el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, stroke: 'var(--line-2)' }, g);
    (o.xt || []).forEach(function (t) { var x = o.X(t[0]); el('line', { x1: x, x2: x, y1: b.y0, y2: b.y0 + 4, stroke: 'var(--line-2)' }, g); if (t[1] !== '') txt(g, x, b.y0 + 16, t[1], '', 'middle'); });
    (o.yt || []).forEach(function (t) { var y = o.Y(t[0]); el('line', { x1: b.x0 - 4, x2: b.x0, y1: y, y2: y, stroke: 'var(--line-2)' }, g); if (o.grid) el('line', { x1: b.x0, x2: b.x1, y1: y, y2: y, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); if (t[1] !== '') txt(g, b.x0 - 7, y + 4, t[1], '', 'end'); });
    if (o.xlab) txt(g, b.x1, b.y0 + (o.xt && o.xt.length ? 32 : 16), o.xlab, '', 'end');
    if (o.ylab) txt(g, b.x0 + 6, b.y1 - 8, o.ylab, '', 'start');
  }
  function e11log(v, lo, hi, a, b) { return a + (Math.log10(v) - lo) / (hi - lo) * (b - a); }
  function e11modes(fig, fn) {
    var bs = fig.querySelectorAll('.controls button[data-mode]');
    Array.prototype.forEach.call(bs, function (bt) { on(bt, 'click', function () { Array.prototype.forEach.call(bs, function (x) { x.setAttribute('aria-pressed', String(x === bt)); }); fn(bt.getAttribute('data-mode')); }); });
    var cur = Array.prototype.filter.call(bs, function (x) { return x.getAttribute('aria-pressed') === 'true'; })[0] || bs[0];
    return cur ? cur.getAttribute('data-mode') : null;
  }
  /* figs-9.js */
  var M9 = P.m9;
  var K9 = { intercalation: 'var(--accent)', alloy: 'var(--field)', conversion: 'var(--copper)', metal: 'var(--metal)' };
  register('f9-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var A = M9.ANODES, POS = { q: 200, v: 3.8 };
    var LO = 2, HI = Math.log10(5000);
    // the map, full width: capacity across (log), potential against lithium up
    var b = { x0: 60, y0: 340, x1: 500, y1: 140 }, X = function (q) { return e11log(q, LO, HI, b.x0, b.x1); }, Y = function (v) { return b.y0 - v / 2 * (b.y0 - b.y1); };
    // a family is shown by colour and by the shape of its marker
    function marker(p, x, y, kind, r) {
      var c = K9[kind], a = { fill: c, stroke: 'var(--bg)', 'stroke-width': 1.2 };
      if (kind === 'alloy') return el('path', Object.assign({ d: 'M' + x + ',' + (y - r - 1) + ' l' + (r + 1) + ',' + (r + 1) + ' l' + (-r - 1) + ',' + (r + 1) + ' l' + (-r - 1) + ',' + (-r - 1) + ' z' }, a), p);
      if (kind === 'conversion') return el('rect', Object.assign({ x: x - r + 0.5, y: y - r + 0.5, width: 2 * r - 1, height: 2 * r - 1, rx: 1 }, a), p);
      if (kind === 'metal') return el('circle', Object.assign({ cx: x, cy: y, r: r + 0.5, fill: MB('lithium'), stroke: '#8B95A0' }), p);
      return el('circle', Object.assign({ cx: x, cy: y, r: r }, a), p);
    }
    // ---------- top strip: theoretical capacities by class, from a 2026 review ----------
    txt(g, 16, 16, 'theoretical capacity by class, as a 2026 review lists it', 'strong', 'start');
    var CL = [['nanostructured carbons', 372, 1750, 'intercalation', 'up to 1750'], ['metal oxides', 375, 1170, 'conversion', '375–1170'], ['metal nitrides', 400, 1300, 'conversion', '400–1300'], ['metal sulfides', 447, 1230, 'conversion', '447–1230'], ['metal phosphides', 700, 1800, 'conversion', '700–1800']];
    CL.forEach(function (c, i) {
      var y = 32 + i * 14, x1 = X(c[1]), x2 = X(c[2]);
      el('rect', { x: x1, y: y - 5, width: x2 - x1, height: 9, rx: 4.5, fill: K9[c[3]], 'fill-opacity': c[3] === 'intercalation' ? .55 : .5 }, g);
      txt(g, x1 - 6, y + 3.5, c[0], '', 'end', { style: 'font-size:11px' }); txt(g, x2 + 5, y + 3.5, c[4], '', 'start', { style: 'font-size:11px;fill:var(--muted)' });
    });
    var EL = [['Sn', 960, -1, -1], ['In', 1012, 1, 1], ['Ge', 1384, 1, -1], ['P', 2596, 1, 1], ['Si', 4200, -1, -1]], ye = 110; // [name, mAh/g, side, above (-1) or below (1)]
    txt(g, X(372) - 6, ye + 3.5, 'elements that alloy', '', 'end', { style: 'font-size:11px' });
    el('line', { x1: X(372), x2: b.x1, y1: ye, y2: ye, stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g);
    EL.forEach(function (e) { var x = X(e[1]); marker(g, x, ye, 'alloy', 4); txt(g, x + e[2] * 6, e[3] < 0 ? ye - 6 : ye + 15, e[0] + ' ' + e[1], '', e[2] > 0 ? 'start' : 'end', { style: 'font-size:11px' }); });
    // ---------- the map ----------
    el('rect', { x: b.x0, y: Y(0.8), width: b.x1 - b.x0, height: Y(0) - Y(0.8), fill: 'var(--second)', 'fill-opacity': '.05' }, g);
    e11axes(g, b, { X: X, Y: Y, xt: [[100, '100'], [300, '300'], [1000, '1000'], [3000, '3000']], yt: [[0, ''], [0.5, '0.5'], [1, '1.0'], [1.5, '1.5'], [2, '2.0']], grid: true, xlab: 'capacity, mAh/g (log)', ylab: 'potential, V vs Li⁺/Li' });
    txt(g, b.x1 - 6, Y(0.95), 'low and to the right: best', 'cyan', 'end');
    var names = { graphite: 'graphite', lto: 'Li₄Ti₅O₁₂', tnb: 'TiNb₂O₇', si: 'Si', sn: 'Sn', ge: 'Ge', sb: 'Sb', tio2: 'TiO₂', fe2o3: 'Fe₂O₃', mno2: 'MnO₂', mos2: 'MoS₂', fep: 'FeP', li: 'Li metal' };
    // label positions: [x offset, potential at which to write, anchor]
    var lab = { graphite: [9, 0.15, 'start'], lto: [0, 1.68, 'middle'], tnb: [7, 1.9, 'start'], tio2: [-8, 1.5, 'end'], si: [-9, 0.5, 'end'], sn: [8, 0.32, 'start'], ge: [8, 0.5, 'start'],
      sb: [-8, 0.5, 'end'], fe2o3: [0, 1.6, 'middle'], mno2: [8, 1.25, 'start'], mos2: [-7, 1.72, 'end'], fep: [-8, 0.75, 'end'], li: [-9, 0.09, 'end'] };
    var dots = {}, LAB = { graphite: 'lithium', lto: 'lto', si: 'silicon', fe2o3: 'hematite' };
    Object.keys(A).forEach(function (k) {
      var a = A[k], x = X(a.q), col = K9[a.kind];
      if (a.hi > a.lo) el('line', { x1: x, x2: x, y1: Y(a.lo), y2: Y(a.hi), stroke: col, 'stroke-width': 5, 'stroke-opacity': '.4', 'stroke-linecap': 'round' }, g);
      dots[k] = marker(g, x, Y(a.v), a.kind, 4.5);
      var L = lab[k]; txt(g, x + L[0], Y(L[1]) + 4, names[k], '', L[2], { style: 'paint-order:stroke;stroke:var(--panel);stroke-width:3px;stroke-linejoin:round' });
    });
    var ring = el('circle', { r: 10, fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    // ---------- bottom strip: the energy of the pair ----------
    var ex0 = 140, ex1 = 400, EY = [404, 424], EW = function (w) { return ex0 + w / 800 * (ex1 - ex0); };
    txt(g, 16, 388, 'Wh/kg of the two active materials, against a 200 mAh/g, 3.8 V positive electrode', 'strong', 'start');
    [0, 200, 400, 600, 800].forEach(function (w) { el('line', { x1: EW(w), x2: EW(w), y1: 396, y2: 436, stroke: 'var(--line)', 'stroke-dasharray': w ? '2 4' : '' }, g); txt(g, EW(w), 450, String(w), '', 'middle', { style: 'font-size:11px' }); });
    var bars = EY.map(function (y, i) { return { r: el('rect', { x: ex0, y: y - 7, height: 14, rx: 3, fill: i ? K9.alloy : K9.intercalation, 'fill-opacity': .85 }, g), v: txt(g, 0, y + 4, '', 'strong', 'start'), n: txt(g, ex0 - 8, y + 4, '', '', 'end') }; });
    badge(g, b.x0 + 16, b.y1 + 14, 1); badge(g, 506, 38, 2); badge(g, 24, 414, 3);
    var cur = e11modes(fig, function (m) { cur = m; render(); });
    function render() {
      var a = A[cur], g0 = M9.pairEnergy(POS.q, POS.v, A.graphite.q, A.graphite.v), p = M9.pairEnergy(POS.q, POS.v, a.q, a.v), d = dots[cur], bb = d.getBBox();
      ring.setAttribute('cx', bb.x + bb.width / 2); ring.setAttribute('cy', bb.y + bb.height / 2);
      [g0, p].forEach(function (q, i) {
        var w = EW(q.E) - ex0, hide = i === 1 && cur === 'graphite';
        bars[i].r.setAttribute('width', hide ? 0 : w); bars[i].v.setAttribute('x', ex0 + w + 6);
        setSvgText(bars[i].v, hide ? '' : Math.round(q.E) + (i ? ', ×' + (p.E / g0.E).toFixed(2) : ''));
        setSvgText(bars[i].n, i ? (hide ? 'choose a material' : names[cur]) : 'graphite');
      });
      bars[1].r.setAttribute('fill', a.kind === 'metal' ? '#9AA3AD' : K9[a.kind]);
      var extra = { si: ' A 2026 review lists silicon at 4200 mAh/g; the map uses 3579.', ge: '', fe2o3: ' The same review puts metal oxides as a class at 375 to 1170 mAh/g.' }[cur] || '';
      read.innerHTML = '<b>' + names[cur] + '</b> (' + a.kind + '): ' + a.q + ' mAh/g at ' + (a.hi > a.lo ? a.lo + ' to ' + a.hi : a.v) + ' V.' + extra + ' Paired with a positive electrode like NMC811, which gives about 200 mAh/g, at an illustrative average of 3.8 V, the two active materials store <b>' + Math.round(p.E) + ' Wh/kg</b>, ' + (p.E / g0.E).toFixed(2) + ' × graphite’s ' + Math.round(g0.E) + '. That is ' + (a.q / A.graphite.q).toFixed(1) + ' × the capacity of graphite, but each gram of the pair still passes only ' + Math.round(p.Q) + ' mAh, at a cell voltage of ' + p.V.toFixed(2) + ' V.';
    }
    steps(fig, [
      { text: 'Every negative electrode sits somewhere on this map: across, how much charge a gram stores; up, its potential against lithium metal. A good negative electrode is <b>low</b>, so that the cell voltage stays large, and <b>to the right</b>, so that it stores a lot.' },
      { text: 'Four families, told apart by colour and shape: <b>intercalation</b> hosts (circles: graphite, titanium and niobium oxides), <b>alloys</b> (diamonds: silicon, tin, germanium, antimony), <b>conversion</b> materials (squares: oxides, sulfides, phosphides) and <b>lithium metal</b>. Bars show where a range of working voltage is quoted. The strip above gives a 2026 review&#8217;s theoretical capacities by class, and for more alloying elements, phosphorus and indium among them.' },
      { text: 'More capacity is not more energy one for one: the same charge passes through both electrodes, so the positive electrode sets a ceiling. Choose lithium metal, ten times graphite’s capacity: the pair gains about half again. Choose Li₄Ti₅O₁₂: 1.4 V of cell voltage is given away.' }
    ]);
    render();
  });
  register('f9-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sc = fig.querySelector('.crate'), scv = fig.querySelector('.crate-val'), st = fig.querySelector('.ftemp'), stv = fig.querySelector('.ftemp-val');
    var b = { x0: 60, y0: 236, x1: 350, y1: 40 }, X = function (x) { return b.x0 + x * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - (v + 0.2) / 0.5 * (b.y0 - b.y1); };
    el('rect', { x: b.x0, y: Y(0), width: b.x1 - b.x0, height: b.y0 - Y(0), fill: 'var(--heat)', 'fill-opacity': '.1' }, g);
    e11axes(g, b, { X: X, Y: Y, xt: [[0, '0'], [0.5, '50'], [1, '100 %']], yt: [[-0.2, '−0.2'], [0, '0'], [0.1, '0.1'], [0.2, '0.2'], [0.3, '0.3']], grid: true, xlab: 'state of charge of the graphite', ylab: 'graphite surface, V vs Li/Li⁺' });
    el('line', { x1: b.x0, x2: b.x1, y1: Y(0), y2: Y(0), stroke: 'var(--heat)', 'stroke-width': 1.4 }, g);
    txt(g, b.x1 - 4, Y(0) + 16, 'below 0 V: lithium plates', 'heat', 'end');
    var u = []; for (var k = 0; k <= 100; k++) u.push([X(k / 100), Math.max(b.y1, Y(M9.graphiteU(k / 100)))]);
    el('path', { d: e11d(u), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g);
    txt(g, X(0.5), Y(M9.graphiteU(0.5)) - 8, 'at rest', '', 'middle');
    var pc = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.6 }, g), mk = el('circle', { r: 5, fill: 'var(--heat)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var m = { x0: 400, y0: 236, x1: 505, y1: 40 }, YM = function (v) { return m.y0 - v / 1.8 * (m.y0 - m.y1); };
    e11axes(g, m, { X: function (x) { return x; }, Y: YM, yt: [[0, '0'], [0.5, '0.5'], [1, '1.0'], [1.5, '1.5']], grid: true, ylab: 'margin to 0 V, V' });
    var MB = [{ n: 'graphite', v: M9.graphiteU(0.98), col: 'var(--accent)' }, { n: 'Nb oxide', v: 1.0, col: 'var(--field)' }, { n: 'LTO', v: 1.55, col: 'var(--second)' }];
    MB.forEach(function (q, i) { var x = m.x0 + 8 + i * 32, y = YM(q.v); el('rect', { x: x, y: y, width: 24, height: m.y0 - y, fill: q.col, 'fill-opacity': '.85' }, g); txt(g, x + 12, m.y0 + (i % 2 ? 30 : 16), q.n, '', 'middle'); });
    var cutl = el('line', { x1: m.x0, x2: m.x1, stroke: 'var(--heat)', 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }, g);
    badge(g, b.x0 + 24, b.y1 + 14, 1); badge(g, X(0.85), Y(-0.15), 2); badge(g, m.x1 - 8, m.y1 + 8, 3);
    function render() {
      var c = +sc.value, T = +st.value, eta = M9.polarization(c, T + 273.15), onset = M9.platingOnset(c, T + 273.15);
      var Ts = (T < 0 ? '−' : '') + Math.abs(T) + ' °C'; setSvgText(scv, (c % 1 ? c.toFixed(1) : c.toFixed(0)) + 'C'); setSvgText(stv, Ts);
      var p = []; for (var k = 0; k <= 100; k++) p.push([X(k / 100), Math.max(b.y1, Math.min(b.y0, Y(M9.graphiteU(k / 100) - eta)))]); pc.setAttribute('d', e11d(p));
      mk.style.display = onset < 1 ? '' : 'none'; mk.setAttribute('cx', X(onset)); mk.setAttribute('cy', Y(0));
      var yc = YM(Math.min(1.75, eta)); cutl.setAttribute('y1', yc); cutl.setAttribute('y2', yc);
      read.innerHTML = 'Charging at <b>' + scv.textContent + '</b> and <b>' + Ts + '</b> pulls the graphite surface about <b>' + Math.round(eta * 1000) + ' mV</b> below its resting potential (illustrative model). ' + (onset < 0.03 ? 'It is below 0 V almost from the start: lithium plates instead of going in.' : onset < 1 ? 'It reaches 0 V at about <b>' + Math.round(onset * 100) + ' %</b> state of charge: from there on, lithium plates instead of going in.' : 'It never reaches 0 V: no plating.') + ' The dashed red line on the right is the same pull; titanate and niobium oxides start a volt or more above it.';
    }
    on(sc, 'input', render); on(st, 'input', render);
    steps(fig, [
      { text: 'Graphite takes up lithium only a little above the potential of lithium metal (dashed, an illustrative curve). Charging pulls its surface lower, the more so the higher the current: the lithium arrives faster than it can get into the graphite.' },
      { text: 'Once the surface reaches <b>0 V</b>, lithium plates on it as metal. Slide the current up, or the temperature down: in the cold the same current pulls further, because every step slows. Plated lithium costs capacity and can grow into a short circuit.' },
      { text: 'Titanate (Li₄Ti₅O₁₂, about 1.55 V) and niobium oxides (about 1 to 2 V) leave a margin of a volt or more, so they do not plate and avoid most SEI formation. They pay with a smaller cell voltage and less capacity, which is why they serve power, not range.' }
    ]);
    render();
  });
  register('f9-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), bb = fig.querySelector('.buffer'), sw = fig.querySelector('.siw'), swv = fig.querySelector('.siw-val');
    var mats = [{ x: 80, name: 'Li₄Ti₅O₁₂', dv: 0.002, note: 'about 0.2 %' }, { x: 220, name: 'graphite', dv: 0.10, note: 'about 10 %' }, { x: 400, name: 'silicon', dv: 2.8, note: 'about 280 %', si: true }];
    var r0 = 26, cy = 116, buffer = false, ph = 0, cyc = 0;
    mats.forEach(function (m, i) {
      txt(g, m.x, 24, m.name, 'strong', 'middle'); txt(g, m.x, 214, m.note + ' in volume', 'amber', 'middle');
      el('circle', { cx: m.x, cy: cy, r: r0, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' }, g);
      m.sei = el('circle', { cx: m.x, cy: cy, r: r0 + 3, fill: 'none', stroke: MC('sei'), 'stroke-width': 3 }, g);
      m.p = el('circle', { cx: m.x, cy: cy, r: r0, fill: MB(['lto', 'graphite', 'silicon'][i]), stroke: i ? 'none' : '#C9C5BB' }, g);
      m.cr = el('path', { fill: 'none', stroke: 'var(--bg)', 'stroke-width': 2.4 }, g);
      badge(g, m.x + 50, 34, i + 1);
    });
    var shell = el('circle', { cx: 400, cy: cy, r: r0 * 1.56 + 10, fill: MC('carbon'), 'fill-opacity': '0', stroke: MC('carbon'), 'stroke-width': 3, 'stroke-dasharray': '1 4', 'stroke-linecap': 'round', 'stroke-opacity': '0' }, g);
    txt(g, 260, 236, 'dashed: the particle before lithium goes in; brown rim: its SEI', '', 'middle');
    var blend = el('g', {}, g);
    function render() {
      var s = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI), w = +sw.value / 100; setSvgText(swv, Math.round(w * 100) + ' wt%');
      mats.forEach(function (m) {
        var r = r0 * Math.pow(1 + m.dv * s, 1 / 3); m.p.setAttribute('r', r);
        var broken = m.si && !buffer && s > 0.6, thick = m.si && !buffer ? Math.min(12, 3 + cyc * 2) : 3;
        m.sei.setAttribute('r', r + thick / 2 + 1); m.sei.setAttribute('stroke-width', thick); m.sei.setAttribute('stroke-dasharray', broken ? '6 5' : '');
        m.cr.setAttribute('d', m.si && !buffer && cyc >= 1 ? 'M' + (m.x - r * 0.7) + ',' + (cy - r * 0.3) + ' L' + (m.x - 4) + ',' + (cy + 2) + ' L' + (m.x + r * 0.6) + ',' + (cy - r * 0.5) + ' M' + (m.x - 3) + ',' + (cy + 2) + ' L' + (m.x + 2) + ',' + (cy + r * 0.85) : '');
      });
      shell.setAttribute('stroke-opacity', buffer ? '.8' : '0'); shell.setAttribute('fill-opacity', buffer ? '.08' : '0');
      setSvgText(bb, buffer ? 'Take the room away' : 'Give it room to swell');
      clear(blend); var q = M9.blendCapacity(w), x0 = 40, xw = 440, scale = xw / 1500;
      el('rect', { x: x0, y: 252, width: xw, height: 12, rx: 3, fill: 'var(--panel-2)' }, blend);
      el('rect', { x: x0, y: 252, width: Math.min(xw, q * scale), height: 12, rx: 3, fill: 'var(--accent)', 'fill-opacity': '.8' }, blend);
      el('line', { x1: x0 + 372 * scale, x2: x0 + 372 * scale, y1: 248, y2: 268, stroke: 'var(--text)' }, blend);
      txt(blend, x0 + 372 * scale, 282, 'graphite: 372', '', 'middle'); txt(blend, x0 + xw, 282, Math.round(q) + ' mAh/g with ' + Math.round(w * 100) + ' wt% Si', 'strong', 'end');
      read.innerHTML = 'Lithiated ' + Math.round(s * 100) + ' %, cycle ' + cyc + '. ' + (buffer ? 'Given room to swell (small, porous or hollow particles in a carbon framework), the silicon keeps its contact and its SEI stays thin.' : cyc >= 1 ? 'Each swelling <b>cracks the SEI</b> on the silicon; fresh surface is exposed and new SEI forms, thicker every cycle, using up lithium and electrolyte. The particle itself has started to crack.' : 'Silicon swells to nearly four times its volume.') + ' A blend of ' + Math.round(w * 100) + ' wt% silicon in graphite stores ' + Math.round(q) + ' mAh/g (a simple mixture of the two).';
    }
    function tick(dt) { if (dt === 0) return; var was = ph; ph = (ph + dt / 4) % 1; if (ph < was) cyc++; render(); }
    on(bb, 'click', function () { buffer = !buffer; cyc = 0; render(); }); on(sw, 'input', render);
    steps(fig, [
      { text: '<b>Li₄Ti₅O₁₂</b> barely changes size (about 0.2 %: “zero strain”), and <b>graphite</b> by about 10 %. Both keep their particles whole.' },
      { text: '<b>Silicon</b> stores close to ten times as much as graphite but swells by about 280 % in volume. Its SEI cracks on every swelling and grows again on the new surface; the particle cracks and loses contact, and the electrode can come away from its current collector.' },
      { text: 'The fixes: smaller particles, porous, hollow or yolk–shell shapes, carbon frameworks, binders that keep the contact, and blending. Cells on sale today use graphite with <b>5 to 10 wt%</b> silicon; more than 20 % is the next step, traded against cycle life. Slide the silicon fraction.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    if (!motion) { cyc = 2; ph = 0.5; }
    render(); bind(fig, loop);
  });
  register('f9-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.hyst'), sv = fig.querySelector('.hyst-val');
    var cx = 100, cy = 120, R = 62, ph = 0.25;
    var mat = el('circle', { cx: cx, cy: cy, r: R, fill: MB('li2o'), stroke: '#C9C5BB' }, g);
    var big = el('circle', { cx: cx, cy: cy, r: R, fill: MB('hematite') }, g);
    var nps = []; for (var i = 0; i < 24; i++) { var a = i * 2.4, rr = R * Math.sqrt((i + 0.5) / 24) * 0.88; nps.push(el('circle', { cx: cx + Math.cos(a) * rr, cy: cy + Math.sin(a) * rr, r: 4.5, fill: MB('iron') }, g)); }
    var lbl = txt(g, cx, cy + R + 22, '', 'strong', 'middle');
    var b = { x0: 250, y0: 226, x1: 505, y1: 40 }, X = function (u) { return b.x0 + u * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - v / 3 * (b.y0 - b.y1); };
    e11axes(g, b, { X: X, Y: Y, xt: [[0, '0'], [0.5, '50'], [1, '100']], yt: [[0, '0'], [1, '1'], [2, '2'], [3, '3']], grid: true, xlab: 'lithium content, %', ylab: 'V vs Li/Li⁺' });
    var fill = el('path', { fill: 'var(--heat)', 'fill-opacity': '.12' }, g), lin = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g), lout = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2.4 }, g);
    el('path', { d: e11d([[X(0.05), Y(0.15)], [X(0.95), Y(0.15)]]), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }, g);
    txt(g, X(0.98), Y(0.15) - 6, 'graphite, for scale', '', 'end');
    var dot = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    badge(g, cx - R + 4, cy - R + 6, 1); badge(g, b.x0 + 24, b.y1 + 14, 2); badge(g, b.x1 - 12, b.y1 + 14, 3);
    var Va = 1.25, h = 1.0;
    function vin(u) { return Va - h / 2 + 0.5 * Math.exp(-u * 12) - 0.25 * (u - 0.5); }
    function vout(u) { return Va + h / 2 - 0.25 * (u - 0.5) + 0.15 * Math.pow(1 - u, 3); }
    function render() {
      h = +sl.value; setSvgText(sv, h.toFixed(2) + ' V');
      var pi = [], po = []; for (var k = 0; k <= 60; k++) { var u = k / 60; pi.push([X(u), Y(vin(u))]); po.push([X(u), Y(vout(u))]); }
      lin.setAttribute('d', e11d(pi)); lout.setAttribute('d', e11d(po)); fill.setAttribute('d', e11d(pi) + ' L' + po.slice().reverse().map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L') + ' Z');
      place();
    }
    function place() {
      var s = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI), going = ph < 0.5;
      big.setAttribute('fill-opacity', String(1 - s)); nps.forEach(function (n) { n.setAttribute('fill-opacity', String(s)); });
      setSvgText(lbl, s > 0.5 ? 'metal grains in Li₂O' : 'metal oxide particle');
      dot.setAttribute('cx', X(s)); dot.setAttribute('cy', Y(going ? vin(s) : vout(s)));
      var eff = M9.hysteresisEfficiency(3.8, Va, h), effG = M9.hysteresisEfficiency(3.8, 0.15, 0.03);
      read.innerHTML = (going ? '<b>Lithium in</b>: the oxide is converted into metal grains in Li₂O. ' : '<b>Lithium out</b>: metal and Li₂O react back to the oxide. ') + 'With ' + h.toFixed(2) + ' V of hysteresis, a cell with a 3.8 V positive electrode gives back about <b>' + Math.round(eff * 100) + ' %</b> of the energy put in, against ' + Math.round(effG * 100) + ' % with graphite (this page’s estimate, electrodes only).';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'A <b>conversion</b> material is not a host. Lithium takes the oxide apart, MₓO_y + 2y Li⁺ + 2y e⁻ ⇌ y Li₂O + x M, into metal grains a few nanometres across embedded in Li₂O. On the way back the oxide forms again. Fe₂O₃ stores about 1000 mAh/g, MnO₂ about 1230.' },
      { text: 'Lithium goes in at a lower voltage than it comes out (blue against green): almost <b>1 V of hysteresis</b>. Several solid phases form and dissolve, and oxygen and metal atoms have to move, not just lithium.' },
      { text: 'The shaded area is energy turned into heat on every cycle; slide the hysteresis. Add the first-cycle loss, the swelling and the insulating Li₂O, and conversion negative electrodes stay in the laboratory, despite their capacity.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph = (ph + dt / 8) % 1; place(); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) { ph = 0.3; place(); }
    bind(fig, loop);
  });
  register('f9-7', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.cd'), sv = fig.querySelector('.cd-val'), sepB = fig.querySelector('.solid-sep');
    var x0 = 70, top = 40, bot = 240, sepX = 320, NP = 46, rough = [], dead = [];
    el('rect', { x: x0, y: top, width: sepX - x0, height: bot - top, fill: MV('electrolyte') }, g);
    el('rect', { x: 20, y: top, width: x0 - 20, height: bot - top, fill: M('lithium'), stroke: '#9AA3AD', 'stroke-width': .8 }, g);
    txt(g, 45, top - 10, 'lithium', 'strong', 'middle'); txt(g, (x0 + sepX) / 2, top - 10, 'electrolyte', 'strong', 'middle');
    var sep = el('rect', { x: sepX, y: top, width: 14, height: bot - top, fill: M('separator'), stroke: '#C4C8BF', 'stroke-width': .8 }, g);
    var gb = el('g', {}, g), sepT = txt(g, sepX + 7, bot + 16, 'separator', '', 'middle');
    el('rect', { x: sepX + 14, y: top, width: 160, height: bot - top, fill: M('lco') }, g); txt(g, sepX + 94, top - 10, 'positive electrode', 'strong', 'middle');
    var dep = el('path', { fill: M('lithium'), stroke: '#9AA3AD', 'stroke-width': .7 }, g), deadG = el('g', {}, g), seiP = el('path', { fill: 'none', stroke: MC('sei'), 'stroke-width': 2 }, g);
    var cT = txt(g, x0 + 4, bot + 34, '', 'amber', 'start'), stopT = txt(g, sepX - 10, top + 16, '', 'heat', 'end');
    badge(g, x0 + 14, top + 14, 1); badge(g, x0 + 14, bot - 14, 2); badge(g, sepX - 12, bot - 14, 3);
    for (var j = 0; j <= NP; j++) rough.push(2);
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var cyc = 0, ph = 0, solid = false, cd = 1;
    function lim(j) { var free = sepX - x0 - 2; if (!solid) return free; return (j % 15 === 7) ? free + 8 : free; } // grain boundaries of a ceramic let filaments through
    function render() {
      cd = +sl.value; setSvgText(sv, cd.toFixed(1) + ' mA/cm²');
      var level = ph < 0.5 ? ph * 2 : 2 - ph * 2, d = 'M' + x0 + ',' + top, s = '';
      for (var j = 0; j <= NP; j++) { var y = top + (bot - top) * j / NP, w = Math.min(lim(j), (4 + rough[j]) * Math.max(0.25, level)); d += ' L' + (x0 + w).toFixed(1) + ',' + y.toFixed(1); s += (j ? ' L' : 'M') + (x0 + w + 2).toFixed(1) + ',' + y.toFixed(1); }
      dep.setAttribute('d', d + ' L' + x0 + ',' + bot + ' Z'); seiP.setAttribute('d', s);
      clear(deadG); dead.forEach(function (q) { el('circle', { cx: q.x, cy: q.y, r: q.r, fill: '#6E757D', 'fill-opacity': '.55', stroke: MC('sei'), 'stroke-width': 1 }, deadG); });
      clear(gb); if (solid) for (var k = 7; k <= NP; k += 15) { var yy = top + (bot - top) * k / NP; el('line', { x1: sepX, x2: sepX + 14, y1: yy, y2: yy + 4, stroke: 'var(--bg)', 'stroke-width': 2 }, gb); }
      sep.setAttribute('fill', solid ? M('ceramic') : M('separator')); sep.setAttribute('stroke', solid ? '#B9B2A2' : '#C4C8BF'); setSvgText(sepT, solid ? 'ceramic' : 'separator');
      var maxR = 0, through = false; rough.forEach(function (r, j) { maxR = Math.max(maxR, r + 4); if (4 + r > sepX - x0 - 1 && lim(j) > sepX - x0) through = true; });
      var touch = !solid ? maxR > sepX - x0 - 2 : through;
      setSvgText(cT, 'cycles: ' + cyc + '; dead lithium pieces: ' + dead.length);
      setSvgText(stopT, touch ? (solid ? 'through a grain boundary' : 'short-circuit risk') : '');
      setSvgText(sepB, solid ? 'Porous separator' : 'Ceramic separator');
      read.innerHTML = 'At <b>' + cd.toFixed(1) + ' mA/cm²</b>' + (cd > 2 ? ', high for this picture: lithium is plated faster than the ions arrive, and the deposit grows as whiskers from its tips.' : ', the deposit grows rougher every cycle.') + ' Pieces that break off when lithium is stripped are cut off from the metal: <b>dead lithium</b>, ' + dead.length + ' pieces so far.' + (solid ? ' A ceramic separator stops most of the deposit, but filaments can still find a way along its grain boundaries.' : '');
    }
    function tick(dt) {
      if (dt === 0) return;
      var was = ph; ph = (ph + dt / 3) % 1;
      if (ph < was) {
        cyc++;
        var pTip = 0.06 + 0.05 * cd;
        for (var j = 0; j <= NP; j++) { var nb = Math.max(j > 0 ? rough[j - 1] : 0, j < NP ? rough[j + 1] : 0); var tip = rough[j] >= nb; rough[j] += (tip && rnd() < pTip ? 4 + rnd() * 6 * cd : rnd() * 1.2); rough[j] = Math.min(sepX - x0 + 10, rough[j]); }
        for (var q = 0; q < Math.round(1 + cd); q++) { var jj = Math.floor(rnd() * NP); if (rough[jj] > 10) { dead.push({ x: x0 + 6 + rnd() * Math.min(rough[jj], 60), y: top + (bot - top) * jj / NP, r: 2 + rnd() * 2.5 }); rough[jj] *= 0.85; } }
        if (dead.length > 60) dead.splice(0, dead.length - 60);
      }
      render();
    }
    on(sl, 'input', render); on(sepB, 'click', function () { solid = !solid; render(); });
    steps(fig, [
      { text: 'A lithium-metal electrode stores 3860 mAh/g at 0 V, the best place on the map of figure 12.1. But on charge the lithium is not put anywhere: it is <b>plated</b> back onto the metal, and it does not land evenly. Tips and defects see a stronger field and grow faster; where plating outruns the supply of ions, the deposit turns into whiskers.' },
      { text: 'When lithium is stripped again, pieces break off and lose contact: <b>dead lithium</b>. With the SEI that forms on every fresh surface, this lowers the Coulombic efficiency; in one study the dead layer grew from about 2 µm to about 100 µm within a few dozen cycles. Slide the current density.' },
      { text: 'Whiskers that reach through the separator short the cell, with a risk of fire. A hard <b>ceramic</b> separator was expected to stop them, since lithium is soft (Young’s modulus about 4.9 GPa); yet lithium still gets through, along the ceramic’s grain boundaries. Press the button.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    for (var c = 0; c < (motion ? 4 : 8); c++) { tick(1.5); tick(1.5); } ph = 0.5;
    render(); bind(fig, loop);
  });
  register('f9-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.ce'), sv = fig.querySelector('.ce-val');
    var N = 500, b = { x0: 60, y0: 236, x1: 500, y1: 40 }, X = function (n) { return b.x0 + n / N * (b.x1 - b.x0); }, Y = function (c) { return b.y0 - c * (b.y0 - b.y1); };
    e11axes(g, b, { X: X, Y: Y, xt: [[0, '0'], [100, '100'], [200, '200'], [300, '300'], [400, '400'], [500, '500']], yt: [[0, '0'], [0.5, '50'], [0.8, '80'], [1, '100']], grid: true, xlab: 'cycles', ylab: 'capacity, % of the first cycle' });
    el('line', { x1: b.x0, x2: b.x1, y1: Y(0.8), y2: Y(0.8), stroke: 'var(--heat)', 'stroke-dasharray': '4 3' }, g); txt(g, b.x1 - 4, Y(0.8) - 6, '80 %: end of life', 'heat', 'end');
    var CASES = [{ ex: 0, n: 'anode-free', col: 'var(--heat)' }, { ex: 1, n: '1× excess', col: 'var(--accent)' }, { ex: 3, n: '3× excess', col: 'var(--second)' }];
    var paths = CASES.map(function (c) { var t = txt(g, 0, 0, c.n, 'strong', 'start'); t.style.fill = c.col; return { c: c, p: el('path', { fill: 'none', stroke: c.col, 'stroke-width': 2.4 }, g), t: t }; });
    badge(g, b.x0 + 24, b.y0 - 24, 1); badge(g, X(250), Y(1) - 14, 2);
    function life(arr) { for (var k = 0; k < arr.length; k++) if (arr[k] < 0.8) return k + 1; return null; }
    function render() {
      var ce = +sl.value / 100; setSvgText(sv, (ce * 100).toFixed(2) + ' %');
      var lives = [];
      paths.forEach(function (p, i) {
        var a = M9.inventory(ce, p.c.ex, N), pts = [[X(0), Y(1)]]; a.forEach(function (c, k) { pts.push([X(k + 1), Y(c)]); });
        p.p.setAttribute('d', e11d(pts)); lives.push(life(a));
        var n = [40, 150, 420][i], v = a[n], y = v > 0.97 ? Y(1) + 16 : Y(v) - 8;
        p.t.setAttribute('x', X(n)); p.t.setAttribute('y', Math.max(b.y1 + 12, Math.min(b.y0 - 6, y)));
      });
      read.innerHTML = 'Coulombic efficiency <b>' + (ce * 100).toFixed(2) + ' %</b>: each cycle ' + ((1 - ce) * 100).toFixed(2) + ' % of the cycled lithium is lost. Down to 80 %: anode-free after <b>' + (lives[0] || 'more than ' + N) + '</b> cycles, with 1× excess after ' + (lives[1] || 'more than ' + N) + ', with 3× excess after ' + (lives[2] || 'more than ' + N) + '. An excess lasts excess ÷ (1 − CE) cycles before the capacity starts to fall (this page’s model).';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'Every cycle a lithium-metal electrode loses a little lithium to SEI and dead lithium; the fraction it keeps is the <b>Coulombic efficiency</b>, CE. In an <b>anode-free</b> cell all the lithium comes from the positive electrode and is plated onto bare copper: nothing in reserve, so the capacity falls as CEⁿ from the first cycle.' },
      { text: 'A reservoir of <b>excess lithium</b> hides the losses until it is used up, at a price in weight and cost. Slide the efficiency: at 99 % an anode-free cell is down to 80 % after about 22 cycles; even 99.9 % gives only about 220.' }
    ]);
    render();
  });
  register('f9-9', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var top = 50, bot = 220, cu0 = 40, cu1 = 62, sep0 = 300, sep1 = 312;
    el('rect', { x: cu1, y: top, width: sep0 - cu1, height: bot - top, fill: MV('electrolyte') }, g);
    el('rect', { x: cu0, y: top, width: cu1 - cu0, height: bot - top, fill: M('copper'), filter: 'url(#fx-lift)' }, g); txt(g, (cu0 + cu1) / 2, top - 10, 'Cu', 'strong', 'middle');
    el('rect', { x: sep0, y: top, width: sep1 - sep0, height: bot - top, fill: M('separator'), stroke: '#C4C8BF', 'stroke-width': .8 }, g);
    el('rect', { x: sep1, y: top, width: 170, height: bot - top, fill: M('lco') }, g); txt(g, sep1 + 85, top - 10, 'positive electrode', 'strong', 'middle'); txt(g, 180, top - 10, 'electrolyte', 'strong', 'middle');
    for (var i = 0; i < 10; i++) el('circle', { cx: sep1 + 20 + (i % 5) * 32, cy: top + 40 + Math.floor(i / 5) * 70, r: 5, 'class': 'ion' }, g);
    var layer = el('g', {}, g), plated = el('path', { fill: M('lithium'), stroke: '#9AA3AD', 'stroke-width': .7 }, g);
    badge(g, cu1 + 18, bot + 18, 1); badge(g, 120, bot + 18, 2); badge(g, 200, bot + 18, 3); badge(g, 280, bot + 18, 4);
    var stage = 0, ph = 0;
    var S = [
      { t: 'Anode-free means no negative electrode material at all: copper only. On the first charge, lithium from the positive electrode is plated onto the copper; on discharge it goes back. Simple, light and cheap to make, but with no lithium to spare (figure 12.6).', r: 'Advantages: high energy density, lower cost, lower weight and volume, a simple design that is easy to make. Challenges: dendrites, a thick or unstable SEI, low Coulombic efficiency, irreversible plating and stripping, dead lithium.' },
      { t: 'An <b>artificial SEI</b> on the copper: a spin-coated graphene-oxide film made the lithium deposit evenly, without dendrites.', r: 'Graphene oxide on Cu: average CE 98 % and 44 % of the capacity kept after 50 cycles, against 89 % and 26.9 % after only 20 cycles on bare copper.' },
      { t: '<b>Electrolyte</b> design: additives that build a better SEI, such as KNO₃, and new salt and solvent mixtures: a dual-salt LiDFOB/LiBF₄ electrolyte, localized high-concentration electrolytes, fluorinated solvents.', r: 'KNO₃: average CE of Cu|Li cells over 60 cycles 96.20 %, against 85.74 % without it. LiDFOB/LiBF₄: anode-free pouch cells kept 80 % after 90 cycles, the lithium growing as large mosaic grains about 50 µm across.' },
      { t: 'A <b>3D current collector</b>: porous copper made by dissolving the zinc out of a Cu–Zn alloy. Its large area spreads the current and gives the lithium room.', r: 'Porous Cu: CE above 97 % over 250 cycles; with LiFePO₄, 89.7 % of the capacity kept after 300 cycles, against 58.2 % on flat copper.' }
    ];
    function render() {
      clear(layer);
      var lv = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI), d = 'M' + cu1 + ',' + top;
      for (var j = 0; j <= 30; j++) { var y = top + (bot - top) * j / 30, w = lv * (stage >= 1 ? 14 : 8 + ((j * 7) % 11) * 1.6); d += ' L' + (cu1 + (stage === 3 ? 10 : 0) + w).toFixed(1) + ',' + y.toFixed(1); }
      plated.setAttribute('d', d + ' L' + cu1 + ',' + bot + ' Z');
      if (stage === 1) el('rect', { x: cu1, y: top, width: 4, height: bot - top, fill: MC('go') }, layer);
      if (stage === 2) for (var k = 0; k < 8; k++) el('circle', { cx: 110 + (k % 4) * 45, cy: top + 30 + Math.floor(k / 4) * 90, r: 4, fill: 'var(--field)' }, layer);
      if (stage === 3) for (var m = 0; m < 9; m++) el('rect', { x: cu1, y: top + 6 + m * 19, width: 10, height: 8, fill: M('copper') }, layer);
      txt(layer, 180, bot + 40, ['bare copper', 'graphene-oxide film on the copper', 'an additive in the electrolyte', 'porous copper'][stage], 'amber', 'middle');
      read.innerHTML = S[stage].r;
    }
    steps(fig, S.map(function (s, i) { return { text: s.t, on: function () { stage = i; render(); } }; }));
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph = (ph + dt / 5) % 1; render(); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) ph = 0.5;
    render(); bind(fig, loop);
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
