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

  /* figs-45.js */
  var RTF = P.R * P.T0 / P.F;
  function rateFromSlider(v) { return 0.1 * Math.pow(50, v / 100); }
  function fmtRate(c) { if (c < 0.67) return 'C/' + Math.round(1 / c); var r = Math.round(c * 10) / 10; return (Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : r.toFixed(1)) + 'C'; }
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
  /* figs-5.js */
  var C5 = { ohm: 'var(--field)', act: 'var(--accent)', conc: 'var(--second)' };
  function niceStep(span, n) { var raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
  function cellVoc() { var p = rung(cell.pos), n = rung(cell.neg); return Math.max(0.5, p.V - n.V); }
  function mv(v) { return Math.round(v * 1000) + ' mV'; }
  register('f5-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), mb = fig.querySelectorAll('button[data-mode]');
    var xn0 = 64, xn1 = 112, xp0 = 408, xp1 = 456, ye0 = 92, ye1 = 222, xsep = 260;
    // the cell: negative electrode | electrolyte with separator | positive electrode
    el('rect', { x: xn1, y: ye0, width: xp0 - xn1, height: ye1 - ye0, fill: MV('electrolyte'), stroke: '#9FB3C2' }, g);
    el('rect', { x: xsep - 3, y: ye0 + 2, width: 6, height: ye1 - ye0 - 4, fill: M('separator'), stroke: '#C4C8BF', 'stroke-width': .6 }, g);
    // the electrodes of your cell, in the colour of their material
    el('rect', { x: xn0, y: ye0 - 10, width: xn1 - xn0, height: ye1 - ye0 + 20, rx: 3, fill: M(rungMat(cell.neg)), stroke: '#2B2E33', 'stroke-opacity': '.4' }, g);
    el('rect', { x: xp0, y: ye0 - 10, width: xp1 - xp0, height: ye1 - ye0 + 20, rx: 3, fill: M(rungMat(cell.pos)), stroke: '#2B2E33', 'stroke-opacity': '.4' }, g);
    for (var k = 0; k < 5; k++) { el('line', { x1: xn0 + 6, x2: xn1 - 6, y1: ye0 + 6 + k * 26, y2: ye0 + 6 + k * 26, stroke: '#9AA0A8', 'stroke-opacity': '.6' }, g); el('line', { x1: xp0 + 6, x2: xp1 - 6, y1: ye0 + 6 + k * 26, y2: ye0 + 6 + k * 26, stroke: 'var(--text)', 'stroke-opacity': '.35' }, g); }
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
      box.setAttribute('stroke', mode === 'discharge' ? 'var(--accent)' : mode === 'charge' ? 'var(--second)' : 'var(--line-2)');
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
      { text: 'Open circuit first. The potential <b>jumps</b> at each electrode-electrolyte boundary and is flat in between; the two jumps add up to V<sub>OC</sub>, as in chapter 1. Only their sum can be measured; the split drawn is schematic.', on: function () { if (mode !== 'open') { mode = 'open'; render(); } } },
      { text: 'Switch to <b>Discharge</b>. Our ion now moves through the liquid from the negative to the positive electrode, and moving ions through a resistance needs a field: the flat stretch becomes a <b>slope</b>, the ohmic drop I·R.', on: function () { if (mode === 'open') { mode = 'discharge'; render(); } } },
      { text: 'Each interface also has to be pushed off balance before its reaction runs at the rate the current demands: on discharge both <b>jumps shrink</b>. The shortfall is the <b>overpotential</b> of that electrode (activation, plus a concentration part when supply runs short).' },
      { text: 'Add it up along the path: the terminals read V<sub>OC</sub> − η on discharge. Switch to <b>Charge</b>: the charger drives everything backwards, the slope reverses, both jumps <b>grow</b>, and it must apply V<sub>OC</sub> + η.' },
      { text: '<b>Our ion</b> makes the trip in both directions: out of the negative electrode on discharge, back into it on charge. The electrons go round the outside, through the lamp or the charger, never through the liquid.' }
    ]);
    loop = anim(fig, tick, { autoplay: true, stepDt: 0.4, onPlay: function () { if (mode === 'open') { mode = 'discharge'; render(); } eflow.show(mode !== 'open'); } });
    cellListeners.push(render); render();
    bind(fig, { start: function () { loop.start(); }, stop: function () { loop.stop(); eflow.stop(); } });
  });
  register('f5-3', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), probe = fig.querySelector('.probe'), pv = fig.querySelector('.probe-val'), sbtn = fig.querySelectorAll('button[data-shape]');
    var x0 = 50, x1 = 336, y0 = 256, y1 = 40, shape = shapeOfCell(), userShape = false;
    var ax = el('g', {}, g), heatD = el('path', { fill: 'var(--heat)', 'fill-opacity': '.2' }, g), heatC = el('path', { fill: 'var(--heat)', 'fill-opacity': '.2' }, g);
    // the breakdown panel: the polarization at the probe, drawn large
    var PX = 394, PW = 24, PY = 150, panel = el('g', {}, g);
    el('rect', { x: 350, y: 18, width: 162, height: 258, rx: 8, fill: 'rgba(20,23,28,.03)', stroke: 'var(--line)' }, g);
    var pTitle = txt(g, 431, 36, '', 'strong', 'middle');
    var vocP = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.4, 'stroke-dasharray': '4 4' }, g);
    var dis = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g), ch = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2.4 }, g);
    var cutHi = el('line', { stroke: 'var(--line-2)', 'stroke-dasharray': '6 4' }, g), cutLo = el('line', { stroke: 'var(--line-2)', 'stroke-dasharray': '6 4' }, g);
    var cutHiT = txt(g, x1, 0, '', '', 'end'), cutLoT = txt(g, x0 + 4, 0, '', '', 'start');
    var probeL = el('line', { stroke: 'var(--text)', 'stroke-opacity': '.35', 'stroke-dasharray': '2 3' }, g);
    var bars = el('g', {}, g), pm = [0, 1, 2].map(function (i) { return el('circle', { r: 4, fill: i === 0 ? 'var(--muted)' : i === 1 ? 'var(--accent)' : 'var(--second)', stroke: 'var(--bg)', 'stroke-width': 1.2 }, g); }), dot = el('circle', { r: 5.5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
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
      { text: 'The <b>blue</b> branch is a discharge at constant current from a full cell, read right to left; the <b>green</b> branch a charge from an empty one, left to right. The dashed grey line is the open-circuit voltage: where the cell would rest at each state of charge.' },
      { text: 'Move the probe. The panel on the right enlarges the gap at that state of charge: how far the charge sits <b>above</b> the resting voltage and the discharge <b>below</b> it, each split into <b>ohmic</b> (violet), <b>activation</b> (blue) and <b>concentration</b> (green).' },
      { text: 'Slide the rate up. Every bar grows, the branches move apart, and the discharge hits the <b>lower cut-off</b> earlier: capacity is lost at high rate, mostly to the concentration part, which shoots up near the end.' },
      { text: 'The <b>red areas</b> between each branch and the dashed line are energy turned into heat: the integral of η over the charge passed. Figure 5.5 follows that heat in time.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) { placeDot(); return; } play.k = (play.k + dt / 9) % 1; placeDot(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });
  register('f5-4', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val');
    var xb0 = 62, xb1 = 118, x0 = 130, x1 = 486, y0 = 232, y1 = 44, tmin = -7, tmax = 2;
    var X = function (lt) { return x0 + (lt - tmin) / (tmax - tmin) * (x1 - x0); };
    var TA = 1e-3, TC = 1; // illustrative time constants inside the ranges of Winter and Brodd 1.4
    // bands for the source's time ranges
    el('rect', { x: X(-4), y: y1, width: X(-2) - X(-4), height: y0 - y1, fill: C5.act, 'fill-opacity': '.08' }, g);
    el('rect', { x: X(-2), y: y1, width: x1 - X(-2), height: y0 - y1, fill: C5.conc, 'fill-opacity': '.07' }, g);
    var ax = el('g', {}, g), curve = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g), pre = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g);
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
      { text: 'The <b>ohmic</b> part disappears at once, within a microsecond: no current, no I·R drop. The violet step is its size.' , on: function () { tNow = -6; if (e) draw(); } },
      { text: 'The <b>activation</b> part relaxes next, between 10⁻⁴ and 10⁻² s, as the two interfaces return to equilibrium.' , on: function () { tNow = -2.5; if (e) draw(); } },
      { text: 'The <b>concentration</b> part is slowest, 10⁻² s and longer: the ions piled up or depleted near the electrodes have to diffuse back. Interrupting the current and timing the recovery is how the three parts are told apart in the lab.' , on: function () { tNow = tmax; if (e) draw(); } }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; tNow += dt * 2.2; if (tNow > tmax + 1.6) tNow = tmin; draw(); }, { autoplay: true, stepDt: 0.5, onPlay: function () { if (tNow >= tmax) tNow = tmin; } });
    bind(fig, loop);
  });
  register('f5-11', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), sb = fig.querySelectorAll('button[data-sign]');
    var x0 = 62, x1 = 470, y0 = 224, y1 = 36, sign = 1, dUdT = 0.2e-3; // illustrative magnitude, V/K
    var ax = el('g', {}, g), irr = el('path', { fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2.2 }, g), rev = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2.2 }, g), tot = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.6, 'stroke-dasharray': '5 3' }, g);
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
      { text: 'The <b>green</b> line is the reversible, entropic heat, −I·T·dE/dT. Its size follows the current, and its sign flips when the current reverses: with dE/dT positive the cell cools on discharge and warms on charge (nickel-cadmium); with dE/dT negative, the reverse (lead-acid).' },
      { text: 'The dashed line is the total. Slide the rate down to C/10: the entropic part then outweighs the irreversible one. Slide it up to 5C: the irreversible part takes over.' }
    ]);
    render();
  });
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
  register('f5-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val');
    var CAP = 2.0; // Ah, the illustrative cell's low-rate capacity
    // --- the cell and the cycler ---
    var cx0 = 24, cx1 = 242, cy0 = 64, cy1 = 120, xn = 76, xp = 190, xs = 133;
    el('rect', { x: cx0, y: cy0, width: xn - cx0, height: cy1 - cy0, rx: 3, fill: M(rungMat(cell.neg)), stroke: '#2B2E33', 'stroke-opacity': '.4' }, g);
    el('rect', { x: xn, y: cy0, width: xp - xn, height: cy1 - cy0, fill: MV('electrolyte'), stroke: '#9FB3C2' }, g);
    el('rect', { x: xp, y: cy0, width: cx1 - xp, height: cy1 - cy0, rx: 3, fill: M(rungMat(cell.pos)), stroke: '#2B2E33', 'stroke-opacity': '.4' }, g);
    el('rect', { x: xs - 2.5, y: cy0 + 2, width: 5, height: cy1 - cy0 - 4, fill: M('separator'), stroke: '#C4C8BF', 'stroke-width': .6 }, g);
    txt(g, (cx0 + xn) / 2, cy1 + 15, 'negative', '', 'middle'); txt(g, (xn + xp) / 2, cy1 + 15, 'electrolyte', '', 'middle'); txt(g, (xp + cx1) / 2, cy1 + 15, 'positive', '', 'middle');
    var wire = [[50, cy0], [50, 23], [78, 23], [188, 23], [216, 23], [216, cy0]];
    el('path', { d: polyD(wire.map(function (p) { return p[0]; }), wire.map(function (p) { return p[1]; })), fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 2 }, g);
    el('rect', { x: 78, y: 10, width: 110, height: 26, rx: 5, fill: MV('steel'), stroke: '#8B95A0', filter: 'url(#fx-lift)' }, g);
    txt(g, 133, 27, 'cycler', 'strong', 'middle');
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
    var pI0 = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-opacity': '.35', 'stroke-width': 1.4 }, g), pIs = [el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, g), el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g), el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2 }, g)];
    var cur = el('line', { y1: b1.y1, y2: b2.y0, stroke: 'var(--accent)', 'stroke-opacity': '.6' }, g);
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
          if (ph !== 0 && ph !== 2) el('rect', { x: xa, y: b1.y1, width: Math.max(1, xb - xa), height: b2.y0 - b1.y1, fill: ph === 3 ? 'var(--second)' : 'var(--muted)', 'fill-opacity': ph === 3 ? '.10' : '.07' }, bands);
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
      { text: 'The meter reads what the cycler sees. On <b>discharge</b> electrons leave the negative electrode through the wire (yellow) while lithium ions leave it through the electrolyte (blue); on <b>charge</b> the cycler drives both back.' },
      { text: 'Each half-cycle stops at a <b>cut-off voltage</b> (red dashes). Between the steps the cell rests; its voltage is drawn returning at once to the open-circuit value (figure 5.4 shows the real, gradual return).' },
      { text: 'Charging usually ends with a <b>constant-voltage</b> step: the cycler holds the upper cut-off and lets the current fall away until it reaches a small limit, here C/20 (the shaded band).' }
    ]);
    var loop = anim(fig, function (dt) { flowTick(dt); if (dt === 0) return; phase += dt * tr.length / 16; while (phase >= 1) { phase -= 1; k++; if (k >= tr.length) k = 0; } place(); }, { autoplay: true, stepDt: 0.6 });
    bind(fig, loop);
    // reduced motion: show the whole protocol at once
    if (!motion) { k = tr.length - 1; place(); }
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
