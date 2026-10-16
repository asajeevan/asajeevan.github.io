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
  /* figs-7.js */
  register('f7-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), tb = fig.querySelector('.chains');
    var W = 150, top = 46, h = 170, xs = [20, 185, 350];
    var names = [['liquid', 'organic carbonate + LiPF₆'], ['dry polymer', 'PEO + lithium salt'], ['ceramic', 'garnet']];
    xs.forEach(function (x, i) {
      el('rect', { x: x, y: top, width: W, height: h, rx: 6, fill: i === 0 ? MV('electrolyte') : i === 1 ? MV('polymer') : MV('ceramic'), stroke: i === 0 ? '#9FB3C2' : '#C9C3B4', 'stroke-width': 1.2, filter: i ? 'url(#fx-lift)' : null }, g);
      txt(g, x + W / 2, top - 22, names[i][0], 'strong', 'middle'); txt(g, x + W / 2, top - 8, names[i][1], '', 'middle');
      badge(g, x + W - 2, top + h + 16, i + 1);
    });
    // liquid: solvent molecules, a solvated Li+, anions; occasional ion pair
    var sol = []; for (var i = 0; i < 16; i++) sol.push({ x: xs[0] + 10 + Math.random() * 130, y: top + 10 + Math.random() * 150, e: el('ellipse', { rx: 6, ry: 3.5, fill: 'none', stroke: 'var(--second)', 'stroke-opacity': '.6' }, g) });
    var an1 = []; for (i = 0; i < 4; i++) an1.push({ x: xs[0] + 20 + Math.random() * 110, y: top + 20 + Math.random() * 130, c: el('circle', { r: 4, 'class': 'ion an' }, g) });
    var shell = el('circle', { r: 11, fill: 'none', stroke: 'var(--second)', 'stroke-dasharray': '2 2' }, g);
    var li1 = ourIon(g, xs[0] + 75, top + 85, 5, 'our ion', true), p1 = { x: xs[0] + 75, y: top + 85, vx: 14, vy: 9 };
    var pairT = txt(g, xs[0] + W / 2, top + h + 16, '', 'amber', 'middle');
    // polymer: wavy chains with coordinating sites; Li+ hops between sites as segments move
    var chains = [];
    for (i = 0; i < 4; i++) chains.push({ y: top + 30 + i * 38, p: el('path', { fill: 'none', stroke: '#8A826F', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, g), ph: Math.random() * 6 });
    var an2 = []; for (i = 0; i < 3; i++) an2.push({ x: xs[1] + 30 + i * 45, y: top + 49 + (i % 2) * 76, c: el('circle', { cx: xs[1] + 30 + i * 45, cy: top + 49 + (i % 2) * 76, r: 4, 'class': 'ion an' }, g) });
    var li2 = el('circle', { r: 5, 'class': 'ion' }, g), p2 = { chain: 1, k: 0.3, tgt: 2, hop: 0 };
    // ceramic: rigid lattice with vacant Li sites
    var lat = [];
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) { var lx = xs[2] + 22 + c * 36, ly = top + 26 + r * 40; el('rect', { x: lx - 7, y: ly - 7, width: 14, height: 14, transform: 'rotate(45 ' + lx + ' ' + ly + ')', fill: MB('oxide'), stroke: '#5D6774', 'stroke-width': .6 }, g); lat.push({ x: lx + 18, y: ly + 20 }); }
    lat = lat.filter(function (p) { return p.x < xs[2] + W - 6 && p.y < top + h - 6; });
    lat.forEach(function (p) { el('circle', { cx: p.x, cy: p.y, r: 3, fill: 'none', stroke: 'var(--accent)', 'stroke-opacity': '.5', 'stroke-dasharray': '1.5 1.5' }, g); });
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
      { text: 'In a <b>ceramic</b> such as a garnet the framework is rigid and only the ion moves through it, drawn here as hops from site to site; the mechanism is not described further here.' }
    ]);
    drawChains(); render();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.4 });
    tick(0.01); bind(fig, loop);
  });
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
      { key: 'liq', name: 'liquid (organic)', col: 'var(--second)', f: liquid },
      { key: 'gel', name: 'gel polymer', col: '#3BA88A', f: function (i) { return liquid(i) - Math.log10(3.5); } },
      { key: 'pla', name: 'plasticized PEO-LiTFSI', col: 'var(--field)', f: function (i) { return polymer(i) + 1; } },
      { key: 'tfsi', name: 'PEO-LiTFSI', col: 'var(--accent)', f: polymer },
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
      { text: 'Adding 10 to 25 % of a plasticizer to the polymer gains <b>another order of magnitude</b>: the violet curve.' },
      { text: 'A <b>gel</b>, 60 to 95 % liquid held in a polymer, comes within <b>2 to 5 times</b> of the liquid itself: the two top curves.' },
      { text: 'The dashed red line: dry-polymer lithium cells need warming, up to about <b>80 °C</b>, to bring the polymer to a useful conductivity.' }
    ]);
    render();
  });
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
    el('rect', { x: 290, y: 30, width: 200, height: 180, rx: 6, fill: MV('ceramic'), stroke: '#C9C3B4', 'stroke-width': 1.2, filter: 'url(#fx-lift)' }, g);
    txt(g, 390, 24, 'rigid solid electrolyte', 'strong', 'middle');
    var hole = el('circle', { cx: cx, cy: cy, r: R0 + 4, fill: '#FFFFFF', stroke: '#B9B2A2' }, g);
    var part = el('circle', { cx: cx, cy: cy, r: R0, fill: MB('lco') }, g);
    txt(g, cx, cy + 4, 'electrode particle', 'strong tag', 'middle');
    var gapT = txt(g, 390, 232, '', 'heat', 'middle'), stage = txt(g, 390, 250, '', '', 'middle');
    var path = el('g', {}, g);
    badge(g, 298, 248, 3);
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
      { text: 'A solid electrolyte has <b>four requirements</b> to meet: an ion conductivity above 10⁻⁴ S/cm; blocking dendrites without being reduced by lithium; chemical stability; and a robust, flexible thin membrane.' },
      { text: 'Some ceramics pass the first two: a garnet conducts above 10⁻³ S/cm and is stable against lithium. A 2013 suggestion for meeting all four at once: <b>ceramic-polymer composites</b>.' },
      { text: 'The interface is the other problem. Electrode particles change volume as lithium goes in and out; against a <b>rigid</b> solid electrolyte, contact is lost and the ion path breaks. Press Play and watch the gap open.' }
    ]);
    draw();
    var loop = anim(fig, function (dt) { if (dt === 0) return; t += dt; draw(); }, { autoplay: true, stepDt: 0.5, onPlay: function () { } });
    if (!motion) { t = 4.0; holeR = R0 + 4.2; draw(); }
    bind(fig, loop);
  });
  /* figs-9.js */
  register('f9-10', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.icd'), sv = fig.querySelector('.icd-val');
    var mode = e11modes(fig, function (m) { mode = m; render(); });
    var top = 50, bot = 200, xi = 120;
    el('rect', { x: 30, y: top, width: xi - 30, height: bot - top, fill: M('lithium'), stroke: '#9AA3AD', 'stroke-width': .8 }, g); txt(g, 75, top - 10, 'lithium', 'strong', 'middle');
    el('rect', { x: xi + 6, y: top, width: 90, height: bot - top, fill: M('ceramic'), stroke: '#B9B2A2', 'stroke-width': .8 }, g); txt(g, xi + 51, top - 10, 'ceramic', 'strong', 'middle');
    var gap = el('g', {}, g), inter = el('rect', { x: xi, y: top, width: 6, height: bot - top, fill: 'var(--second)' }, g), capT = txt(g, 123, bot + 20, '', '', 'middle');
    var b = { x0: 290, y0: 200, x1: 505, y1: 40 }, Y = function (r) { return e11log(Math.max(r, 0.5), -0.3, 3.9, b.y0, b.y1); };
    e11axes(g, b, { X: function (x) { return x; }, Y: Y, yt: [[1, '1'], [10, '10'], [100, '100'], [1000, '1000']], grid: true, ylab: 'interface resistance, Ω cm² (log)' });
    var PAIRS = [{ n: 'Li–C', a: 381, c: 11 }, { n: 'Al layer', a: 950, c: 75 }, { n: 'ALD Al₂O₃', a: 1710, c: 1 }];
    var rects = PAIRS.map(function (p, i) { var x = b.x0 + 16 + i * 68; txt(g, x + 22, b.y0 + 16, p.n, '', 'middle'); return { p: p, ra: el('rect', { x: x, width: 20, fill: 'var(--heat)' }, g), rc: el('rect', { x: x + 24, width: 20, fill: 'var(--second)' }, g), ta: txt(g, x + 10, 0, '', '', 'middle'), tc: txt(g, x + 34, 0, '', '', 'middle') }; });
    badge(g, 30, bot + 16, 1); badge(g, b.x1 - 10, b.y1 + 8, 2);
    function render() {
      var i = +sl.value, with_ = mode === 'with'; setSvgText(sv, i.toFixed(1) + ' mA/cm²');
      clear(gap); if (!with_) for (var k = 0; k < 6; k++) el('ellipse', { cx: xi + 2, cy: top + 14 + k * 26, rx: 5, ry: 7, fill: 'var(--bg)' }, gap);
      inter.style.display = with_ ? '' : 'none';
      setSvgText(capT, with_ ? 'interlayer: the lithium wets the ceramic' : 'bare: contact only at points');
      rects.forEach(function (o) { var ya = Y(o.p.a), yc = Y(o.p.c); o.ra.setAttribute('y', ya); o.ra.setAttribute('height', b.y0 - ya); o.rc.setAttribute('y', yc); o.rc.setAttribute('height', b.y0 - yc); o.ta.setAttribute('y', ya - 5); setSvgText(o.ta, o.p.a + ''); o.tc.setAttribute('y', yc - 5); setSvgText(o.tc, o.p.c + ''); o.rc.setAttribute('fill-opacity', with_ ? '.9' : '.25'); o.ra.setAttribute('fill-opacity', with_ ? '.3' : '.8'); });
      read.innerHTML = 'At <b>' + i.toFixed(1) + ' mA/cm²</b> the interface alone costs ' + PAIRS.map(function (p) { var v = (with_ ? p.c : p.a) * i; return p.n + ' ' + (v >= 1000 ? (v / 1000).toFixed(2) + ' V' : (v >= 10 ? Math.round(v) : v.toFixed(1)) + ' mV'); }).join(', ') + (with_ ? ', with the interlayer.' : ', with bare lithium (V = R × i).');
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'A solid electrolyte would let a cell use lithium metal. The trouble is the contact: a ceramic such as garnet is poorly wetted by lithium, so the two touch only at points, the current crowds through them, and the interface resistance is high. The interface can also react, and lithium can still grow through the ceramic’s grain boundaries.' },
      { text: 'Thin interlayers fix the contact. Red, bare; green, with the interlayer, as measured: a lithium–graphite composite (381 → 11 Ω cm²), a thin aluminium layer that alloys with lithium (950 → 75), and an Al₂O₃ film made by atomic layer deposition (1710 → 1). Slide the current: at 1 mA/cm² the worst bare interface alone would cost 1.7 V.' }
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
