/* learn.js: behaviour of the learning page. Reading modes, the charging rail,
   the "your cell" thread, and one init function per figure. Every animation
   pauses when its figure leaves the viewport and is skipped entirely when the
   reader prefers reduced motion; the static frame is always a complete figure. */
(function () {
  'use strict';
  var P = window.Physics, S = window.Site || { reduce: false, motion: false, onScroll: function () {} };
  var NS = 'http://www.w3.org/2000/svg';
  var motion = !S.reduce;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function store(key, val) {
    try { if (val === undefined) { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; }
  }
  function fmt(x, d) { return Number(x).toFixed(d === undefined ? 2 : d); }

  /* ---------- reading modes ---------- */
  var body = document.body;
  var modeBtns = document.querySelectorAll('.modes button[data-mode]');
  function setMode(m, save) {
    body.setAttribute('data-mode', m);
    Array.prototype.forEach.call(modeBtns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    if (m === 'equations') Array.prototype.forEach.call(document.querySelectorAll('details.deeper'), function (d) { d.open = true; });
    if (save) store('learn.mode', m);
  }
  Array.prototype.forEach.call(modeBtns, function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode'), true); }); });
  setMode(store('learn.mode') || 'teach', false);

  /* ---------- the rail: a cell that charges as you read ---------- */
  var rail = document.getElementById('railCell');
  if (rail) {
    var fill = rail.querySelector('.rail-fill-rect'), pct = rail.querySelector('.pct');
    var labs = rail.querySelectorAll('.lab[data-act]');
    var acts = { A: 'actA', B: 'actB', C: 'actC' };
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
  var cellListeners = [];
  function setCell(neg, pos) { cell = { neg: neg, pos: pos }; store('learn.cell', cell); cellListeners.forEach(function (f) { f(cell); }); }

  /* ---------- particle flow along an SVG path ---------- */
  function flow(svg, path, opts) {
    var n = opts.n || 8, cls = opts.cls || 'e-dot', r = opts.r || 3, speed = opts.speed || 40; // px per second
    var L = path.getTotalLength(), dots = [], t0 = null, running = false, raf = 0;
    var g = el('g', { 'class': 'anim-only' }, svg);
    for (var i = 0; i < n; i++) { var d = el('circle', { 'class': cls, r: r }, g); dots.push({ e: d, s: (i / n) * L }); }
    function place(ts) {
      var dt = t0 === null ? 0 : (ts - t0) / 1000; t0 = ts;
      for (var i = 0; i < dots.length; i++) {
        dots[i].s = (dots[i].s + speed * dt) % L; var p = path.getPointAtLength(dots[i].s);
        dots[i].e.setAttribute('cx', p.x); dots[i].e.setAttribute('cy', p.y);
      }
    }
    function step(ts) { if (!running) return; place(ts); raf = requestAnimationFrame(step); }
    place(performance.now());
    return {
      start: function () { if (!motion || running) return; running = true; t0 = null; raf = requestAnimationFrame(step); },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      show: function (v) { g.style.display = v ? '' : 'none'; }
    };
  }
  /* Drifting particles inside a rectangle. dir: +1 rightwards, -1 leftwards. */
  function drift(svg, box, opts) {
    var n = opts.n || 10, cls = opts.cls || 'ion', r = opts.r || 3, v = opts.speed || 18, dir = opts.dir || 1;
    var g = el('g', { 'class': opts.animOnly === false ? '' : 'anim-only' }, svg), ps = [], running = false, raf = 0, t0 = null;
    for (var i = 0; i < n; i++) {
      var c = el('circle', { 'class': cls, r: r }, g);
      ps.push({ e: c, x: box.x + Math.random() * box.w, y: box.y + r + Math.random() * (box.h - 2 * r), ph: Math.random() * 6.28 });
    }
    function place(dt, ts) {
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i]; p.x += dir * v * dt; p.ph += dt * 2;
        if (dir > 0 && p.x > box.x + box.w) p.x = box.x; if (dir < 0 && p.x < box.x) p.x = box.x + box.w;
        p.e.setAttribute('cx', p.x); p.e.setAttribute('cy', p.y + Math.sin(p.ph) * 3);
      }
    }
    function step(ts) { if (!running) return; var dt = t0 === null ? 0 : Math.min(0.05, (ts - t0) / 1000); t0 = ts; place(dt, ts); raf = requestAnimationFrame(step); }
    place(0, 0);
    return { start: function () { if (!motion || running) return; running = true; t0 = null; raf = requestAnimationFrame(step); }, stop: function () { running = false; cancelAnimationFrame(raf); }, group: g };
  }

  /* ---------- figure registry ---------- */
  var figs = {};
  var loops = []; // {fig, start, stop}
  function register(id, fn) { figs[id] = fn; }
  function bind(fig, loop) { if (loop) loops.push({ fig: fig, loop: loop }); }

  /* ===== 1.1 The Daniell cell ===== */
  register('f1-1', function (fig) {
    var svg = fig.querySelector('svg'), sw = svg.querySelector('.sw'), blade = svg.querySelector('.blade'), lamp = svg.querySelector('.lamp');
    var status = fig.querySelector('.readout'), wire = svg.querySelector('#wirePath');
    var eflow = flow(svg, wire, { n: 12, cls: 'e-dot', r: 3, speed: 60 });
    var cat = drift(svg, { x: 142, y: 112, w: 236, h: 170 }, { n: 10, cls: 'ion', r: 3.2, speed: 16, dir: 1, animOnly: false });
    var an = drift(svg, { x: 142, y: 112, w: 236, h: 170 }, { n: 8, cls: 'ion an', r: 2.6, speed: 10, dir: -1, animOnly: false });
    var on = false;
    function render() {
      blade.setAttribute('x2', on ? '240' : '232'); blade.setAttribute('y2', on ? '30' : '8');
      lamp.setAttribute('class', 'lamp ' + (on ? 'lamp-on glow' : 'lamp-off'));
      sw.setAttribute('aria-pressed', String(on));
      eflow.show(on);
      status.innerHTML = on ? 'Switch closed: electrons flow through the lamp, ions drift through the liquid. Open-circuit voltage <b>1.10 V</b>; under load the terminal voltage is a little lower (module 5).'
                            : 'Switch open: nothing moves, but the push is still there. Open-circuit voltage <b>1.10 V</b>.';
      if (on) { eflow.start(); cat.start(); an.start(); } else { eflow.stop(); cat.stop(); an.stop(); }
    }
    function toggle() { on = !on; render(); }
    sw.addEventListener('click', toggle);
    sw.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    fig.querySelector('.sw-btn').addEventListener('click', toggle);
    render();
    bind(fig, { start: function () { if (on) { eflow.start(); cat.start(); an.start(); } }, stop: function () { eflow.stop(); cat.stop(); an.stop(); } });
  });

  /* ===== 1.2 Battery, fuel cell, supercapacitor ===== */
  register('f1-2', function (fig) {
    var svg = fig.querySelector('svg');
    var bat = drift(svg, { x: 58, y: 74, w: 74, h: 104 }, { n: 7, cls: 'ion', r: 2.8, speed: 12, dir: 1, animOnly: false });
    var h2 = flow(svg, svg.querySelector('#fcH2'), { n: 4, cls: 'e-dot', r: 2.6, speed: 30 });
    var o2 = flow(svg, svg.querySelector('#fcO2'), { n: 4, cls: 'ion an', r: 2.6, speed: 30 });
    var supIons = svg.querySelectorAll('.sc-ion');
    var t = 0, raf = 0, running = false, t0 = null;
    function step(ts) {
      if (!running) return; var dt = t0 === null ? 0 : (ts - t0) / 1000; t0 = ts; t += dt;
      var k = 0.5 + 0.5 * Math.sin(t * 1.2); // 0 relaxed .. 1 charged
      Array.prototype.forEach.call(supIons, function (c) {
        var home = +c.getAttribute('data-home'), wall = +c.getAttribute('data-wall');
        c.setAttribute('cx', String(home + (wall - home) * k));
      });
      raf = requestAnimationFrame(step);
    }
    bind(fig, { start: function () { if (!motion) return; bat.start(); h2.start(); o2.start(); if (!running) { running = true; t0 = null; raf = requestAnimationFrame(step); } }, stop: function () { bat.stop(); h2.stop(); o2.stop(); running = false; cancelAnimationFrame(raf); } });
  });

  /* ===== 1.3 Cell versus battery ===== */
  register('f1-3', function (fig) {
    var svg = fig.querySelector('svg'), btns = fig.querySelectorAll('button[data-arr]');
    var groups = { single: svg.querySelector('.arr-single'), series: svg.querySelector('.arr-series'), parallel: svg.querySelector('.arr-parallel') };
    var vbar = svg.querySelector('.vbar'), qbar = svg.querySelector('.qbar'), vlab = svg.querySelector('.vlab'), qlab = svg.querySelector('.qlab'), read = fig.querySelector('.readout');
    function show(a) {
      for (var k in groups) groups[k].style.display = k === a ? '' : 'none';
      var n = a === 'single' ? 1 : 3, V = a === 'parallel' ? 1 : n, Q = a === 'series' ? 1 : n;
      vbar.setAttribute('width', String(40 * V)); qbar.setAttribute('width', String(40 * Q));
      vlab.textContent = V + ' V'; qlab.textContent = Q + ' Q';
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-arr') === a)); });
      read.innerHTML = a === 'single' ? 'One cell: voltage <b>V</b>, capacity <b>Q</b>.' : a === 'series' ? 'Three in series: the voltages add to <b>3V</b>; the capacity stays <b>Q</b>.' : 'Three in parallel: the capacity and the current add to <b>3Q</b>; the voltage stays <b>V</b>.';
    }
    Array.prototype.forEach.call(btns, function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-arr')); }); });
    show('single');
  });

  /* ===== 2.1 Exploded coin cell ===== */
  register('f2-1', function (fig) {
    var svg = fig.querySelector('svg'), layers = svg.querySelectorAll('.layer'), range = fig.querySelector('input[type=range]'), info = fig.querySelector('.part-info');
    var jobs = {
      cap: ['Cap and gasket', 'Close the cell and seal it; the gasket keeps the cap electrically separate from the can, so the two terminals never touch.'],
      spring: ['Spring', 'Presses the stack together so every layer stays in contact.'],
      spacer: ['Spacer', 'Fills the height and spreads the spring’s pressure over the electrode.'],
      neg: ['Negative electrode', 'Graphite coated on copper foil. On discharge it gives up electrons: the reducing agent.'],
      sep: ['Separator, soaked with electrolyte', 'A porous film full of electrolyte: it lets ions through, blocks electrons, and keeps the electrodes apart. If they touched, the whole stored energy would turn into heat inside the cell.'],
      pos: ['Positive electrode', 'A lithium host such as LiCoO₂ coated on aluminium foil. On discharge it takes the electrons: the electron acceptor.'],
      can: ['Can', 'The container and the other terminal.']
    };
    var base = []; Array.prototype.forEach.call(layers, function (l) { base.push(+l.getAttribute('data-y')); });
    function explode(k) { Array.prototype.forEach.call(layers, function (l, i) { l.setAttribute('transform', 'translate(0,' + ((i - 3) * 34 * k) + ')'); }); }
    function pick(l) {
      Array.prototype.forEach.call(layers, function (x) { x.classList.toggle('picked', x === l); });
      var j = jobs[l.getAttribute('data-part')]; info.innerHTML = '<b>' + j[0] + '.</b> ' + j[1];
    }
    Array.prototype.forEach.call(layers, function (l) {
      l.addEventListener('click', function () { pick(l); }); l.addEventListener('mouseenter', function () { pick(l); });
      l.addEventListener('focus', function () { pick(l); });
      l.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(l); } });
    });
    range.addEventListener('input', function () { explode(+range.value / 100); });
    explode(+range.value / 100); pick(layers[3]);
  });

  /* ===== 2.2 The jelly roll ===== */
  register('f2-2', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.spirals');
    var cols = ['#4b6a72', '#83DBD0', '#C98D1E'], names = ['neg', 'sep', 'pos'];
    var paths = [];
    for (var s = 0; s < 3; s++) {
      var d = '', cx = 390, cy = 130;
      for (var i = 0; i <= 720; i += 4) {
        var th = i * Math.PI / 180, r = 18 + th * 6.2 + s * 2.1;
        d += (i === 0 ? 'M' : 'L') + (cx + r * Math.cos(th)).toFixed(1) + ',' + (cy + r * Math.sin(th)).toFixed(1);
      }
      var p = el('path', { d: d, fill: 'none', stroke: cols[s], 'stroke-width': s === 1 ? 2 : 4, 'stroke-linecap': 'round', 'class': 'spiral ' + names[s] }, g);
      paths.push(p);
    }
    var lens = paths.map(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = motion ? L : 0; return L; });
    var started = false;
    bind(fig, { start: function () {
      if (started || !motion) return; started = true;
      paths.forEach(function (p, i) { p.style.transition = 'stroke-dashoffset 2.4s cubic-bezier(.2,.7,.2,1) ' + (i * 0.25) + 's'; p.style.strokeDashoffset = 0; });
    }, stop: function () {} });
  });

  /* ===== 2.3 Nominal voltages ===== */
  register('f2-3', function (fig) {
    var svg = fig.querySelector('svg'), info = fig.querySelector('.part-info'), data = P.data.nominal;
    var x0 = 48, y0 = 236, w = 40, gap = 10, scale = 48; // px per volt
    var axis = el('g', { 'class': 'axis' }, svg);
    for (var v = 0; v <= 4; v++) {
      el('line', { x1: x0, y1: y0 - v * scale, x2: 500, y2: y0 - v * scale, stroke: 'var(--line-2)', 'stroke-dasharray': '2 5' }, axis);
      var t = el('text', { x: x0 - 8, y: y0 - v * scale + 4, 'text-anchor': 'end', 'class': 'lbl' }, axis); t.textContent = v + ' V';
    }
    data.forEach(function (d, i) {
      var x = x0 + 8 + i * (w + gap), h = d.V * scale;
      var g = el('g', { 'class': 'bar', tabindex: '0', role: 'button', 'aria-label': d.name + ', ' + d.V + ' volts' }, svg);
      el('rect', { x: x, y: y0 - h, width: w, height: h, rx: 4, fill: d.kind === 'primary' ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': d.kind === 'primary' ? '.55' : '.85' }, g);
      var vt = el('text', { x: x + w / 2, y: y0 - h - 6, 'text-anchor': 'middle', 'class': 'lbl strong' }, g); vt.textContent = d.V.toFixed(1);
      var nt = el('text', { x: x + w / 2, y: y0 + 14, 'text-anchor': 'middle', 'class': 'lbl', transform: 'rotate(-28 ' + (x + w / 2) + ' ' + (y0 + 14) + ')' }, g); nt.textContent = d.name;
      function show() { info.innerHTML = '<b>' + d.name + ', ' + d.V.toFixed(1) + ' V nominal.</b> Negative electrode: ' + d.anode + '. Positive electrode: ' + d.cathode + '. Electrolyte: ' + d.electrolyte + '.'; }
      g.addEventListener('mouseenter', show); g.addEventListener('focus', show); g.addEventListener('click', show);
    });
    info.innerHTML = 'Hover or tap a bar to see what is inside. Cyan bars are primary (single-use) systems, amber bars are rechargeable.';
  });

  /* ===== 2.4 Inside a composite electrode ===== */
  register('f2-4', function (fig) {
    var svg = fig.querySelector('svg');
    var e = flow(svg, svg.querySelector('#carbonPath'), { n: 6, cls: 'e-dot', r: 2.6, speed: 45 });
    var ion = flow(svg, svg.querySelector('#porePath'), { n: 4, cls: 'ion', r: 3, speed: 30 });
    bind(fig, { start: function () { e.start(); ion.start(); }, stop: function () { e.stop(); ion.stop(); } });
  });

  /* ===== 3.1 The potential ladder ===== */
  register('f3-1', function (fig) {
    var svg = fig.querySelector('svg'), selN = fig.querySelector('select[data-side=neg]'), selP = fig.querySelector('select[data-side=pos]');
    var read = fig.querySelector('.readout'), flags = fig.querySelector('.flags'), aq = fig.querySelector('input[type=checkbox]');
    var y = function (V) { return 318 - V * 58; };
    var w = P.data.carbonateWindow;
    var band = el('rect', { x: 226, y: y(w.high), width: 68, height: y(w.low) - y(w.high), fill: 'var(--cyan)', 'fill-opacity': '.16', stroke: 'var(--cyan)', 'stroke-opacity': '.5', rx: 4 }, svg.querySelector('.bands'));
    var bandT = el('text', { x: 260, y: y(w.high) - 8, 'text-anchor': 'middle', 'class': 'lbl cyan' }, svg.querySelector('.bands')); bandT.textContent = 'electrolyte stable';
    var bandB = el('text', { x: 260, y: y(w.low) + 14, 'text-anchor': 'middle', 'class': 'lbl cyan' }, svg.querySelector('.bands')); bandB.textContent = '1.1 to 4.3 V';
    var aqBand = el('rect', { x: 226, y: y(1.23), width: 68, height: y(0) - y(1.23), fill: 'var(--amber)', 'fill-opacity': '.14', stroke: 'var(--amber)', 'stroke-opacity': '.5', rx: 4, style: 'display:none' }, svg.querySelector('.bands'));
    var aqT = el('text', { x: 260, y: y(1.23) - 8, 'text-anchor': 'middle', 'class': 'lbl amber', style: 'display:none' }, svg.querySelector('.bands')); aqT.textContent = 'water: 1.23 V wide';
    var rungs = svg.querySelector('.rungs'), marks = {};
    var prevV = { neg: -9, pos: -9 }, prevT = { neg: null, pos: null };
    P.data.ladder.forEach(function (r) {
      var left = r.side === 'neg', x1 = left ? 70 : 316, x2 = left ? 200 : 446;
      var crowded = (r.V - prevV[r.side]) < 0.3;
      if (crowded && prevT[r.side]) prevT[r.side].setAttribute('y', y(prevV[r.side]) + 13);
      prevV[r.side] = r.V;
      var g = el('g', { 'class': 'rung', 'data-key': r.key }, rungs);
      el('line', { x1: x1, y1: y(r.V), x2: x2, y2: y(r.V), stroke: left ? 'var(--cyan)' : 'var(--amber)', 'stroke-width': 2 }, g);
      var t = el('text', { x: left ? x2 - 4 : x1 + 4, y: y(r.V) - 5, 'text-anchor': left ? 'end' : 'start', 'class': 'lbl' }, g); prevT[r.side] = t; t.textContent = r.name + ' ' + r.V.toFixed(r.V === 4.75 ? 2 : 1);
      marks[r.key] = g;
      var o = document.createElement('option'); o.value = r.key; o.textContent = r.name + ' (' + r.V.toFixed(r.V === 4.75 ? 2 : 1) + ' V)';
      (left ? selN : selP).appendChild(o);
    });
    var brace = svg.querySelector('.brace'), braceT = svg.querySelector('.brace-t');
    function render() {
      var n = rung(cell.neg), p = rung(cell.pos), V = p.V - n.V;
      for (var k in marks) marks[k].classList.toggle('picked', k === cell.neg || k === cell.pos);
      brace.setAttribute('d', 'M258,' + y(n.V) + ' L258,' + y(p.V));
      braceT.setAttribute('y', (y(n.V) + y(p.V)) / 2 + 4); braceT.textContent = V.toFixed(2) + ' V';
      read.innerHTML = 'Your cell: <b>' + n.name + '</b> against <b>' + p.name + '</b>. Open-circuit voltage about <b>' + V.toFixed(2) + ' V</b> (difference of the two rungs).';
      var f = '';
      if (n.V < w.low) f += '<span class="flag warn">negative electrode below the electrolyte limit: an SEI must form</span>';
      else f += '<span class="flag ok">negative electrode inside the window: no SEI needed</span>';
      if (p.V > w.high) f += '<span class="flag warn">positive electrode above the limit: electrolyte oxidizes unless a passivation layer forms</span>';
      else f += '<span class="flag ok">positive electrode inside the window</span>';
      flags.innerHTML = f;
      selN.value = cell.neg; selP.value = cell.pos;
    }
    selN.addEventListener('change', function () { setCell(selN.value, cell.pos); });
    selP.addEventListener('change', function () { setCell(cell.neg, selP.value); });
    aq.addEventListener('change', function () { var s = aq.checked ? '' : 'none'; aqBand.style.display = s; aqT.style.display = s; });
    cellListeners.push(render); render();
  });

  /* ===== 3.2 The electron energy picture ===== */
  register('f3-2', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout');
    var y = function (V) { return 40 + V * 42; }; // energy axis: potential downwards
    var w = P.data.carbonateWindow;
    var lumo = svg.querySelector('.lumo'), homo = svg.querySelector('.homo'), win = svg.querySelector('.win');
    var muA = svg.querySelector('.muA'), muC = svg.querySelector('.muC'), muAt = svg.querySelector('.muA-t'), muCt = svg.querySelector('.muC-t'), gap = svg.querySelector('.gap'), gapT = svg.querySelector('.gap-t');
    var dot = svg.querySelector('.e-drop'), warnA = svg.querySelector('.warnA'), warnC = svg.querySelector('.warnC');
    lumo.setAttribute('y1', y(w.low)); lumo.setAttribute('y2', y(w.low)); homo.setAttribute('y1', y(w.high)); homo.setAttribute('y2', y(w.high));
    win.setAttribute('y', y(w.low)); win.setAttribute('height', y(w.high) - y(w.low));
    var n, p, running = false, raf = 0, t = 0, t0 = null;
    function render() {
      n = rung(cell.neg); p = rung(cell.pos);
      muA.setAttribute('y1', y(n.V)); muA.setAttribute('y2', y(n.V)); muC.setAttribute('y1', y(p.V)); muC.setAttribute('y2', y(p.V));
      muAt.setAttribute('y', y(n.V) - 6); muAt.textContent = 'μ_A: ' + n.name; muCt.setAttribute('y', y(p.V) + 16); muCt.textContent = 'μ_C: ' + p.name;
      gap.setAttribute('y1', y(n.V)); gap.setAttribute('y2', y(p.V)); gapT.setAttribute('y', (y(n.V) + y(p.V)) / 2 + 4); gapT.textContent = 'e·V_OC = ' + (p.V - n.V).toFixed(2) + ' eV';
      warnA.style.display = n.V < w.low ? '' : 'none'; warnC.style.display = p.V > w.high ? '' : 'none';
      dot.setAttribute('cy', y(n.V));
      read.innerHTML = 'The electron energy of the negative electrode sits <b>' + (p.V - n.V).toFixed(2) + ' eV</b> above that of the positive one; divided by the electron charge, that is the open-circuit voltage.' + (n.V < w.low ? ' The negative electrode lies above the electrolyte’s LUMO, so the electrolyte would be reduced there unless a passivating layer forms.' : '') + (p.V > w.high ? ' The positive electrode lies below the HOMO, so the electrolyte would be oxidized there unless a layer forms.' : '');
    }
    function step(ts) {
      if (!running) return; var dt = t0 === null ? 0 : (ts - t0) / 1000; t0 = ts; t = (t + dt / 2.4) % 1;
      var k = t < 0.3 ? 0 : t > 0.8 ? 1 : (t - 0.3) / 0.5; k = k * k * (3 - 2 * k);
      dot.setAttribute('cy', y(n.V) + (y(p.V) - y(n.V)) * k); dot.setAttribute('cx', 150 + 220 * k);
      raf = requestAnimationFrame(step);
    }
    cellListeners.push(render); render();
    bind(fig, { start: function () { if (!motion || running) return; running = true; t0 = null; raf = requestAnimationFrame(step); }, stop: function () { running = false; cancelAnimationFrame(raf); } });
  });

  /* ===== 3.3 Why oxides give 4 V and sulfides 2.5 V ===== */
  register('f3-3', function (fig) {
    var svg = fig.querySelector('svg'), couples = svg.querySelectorAll('.couple');
    var t = 0, running = false, raf = 0, t0 = null;
    function step(ts) {
      if (!running) return; var dt = t0 === null ? 0 : (ts - t0) / 1000; t0 = ts; t = (t + dt / 3.2) % 1;
      var k = Math.min(1, t / 0.6); k = k * k * (3 - 2 * k);
      Array.prototype.forEach.call(couples, function (c) {
        var y0 = +c.getAttribute('data-y0'), y1 = +c.getAttribute('data-y1');
        c.setAttribute('transform', 'translate(0,' + ((y1 - y0) * k) + ')');
        c.classList.toggle('pinned', t > 0.6);
      });
      raf = requestAnimationFrame(step);
    }
    if (!motion) Array.prototype.forEach.call(couples, function (c) { c.setAttribute('transform', 'translate(0,' + (+c.getAttribute('data-y1') - +c.getAttribute('data-y0')) + ')'); c.classList.add('pinned'); });
    bind(fig, { start: function () { if (!motion || running) return; running = true; t0 = null; raf = requestAnimationFrame(step); }, stop: function () { running = false; cancelAnimationFrame(raf); } });
  });

  /* ===== 3.4 From reaction energy to voltage ===== */
  register('f3-4', function (fig) {
    var n = fig.querySelector('input[data-p=n]'), E = fig.querySelector('input[data-p=E]'), bar = fig.querySelector('.gbar'), read = fig.querySelector('.readout'), nl = fig.querySelector('.n-val'), El = fig.querySelector('.E-val');
    function render() {
      var nn = +n.value, EE = +E.value, dG = P.reactionEnergy(nn, EE) / 1000;
      bar.setAttribute('width', String(Math.min(440, -dG * 0.3)));
      nl.textContent = nn; El.textContent = EE.toFixed(1) + ' V';
      read.innerHTML = 'ΔG = −nFE = −' + nn + ' × 96 485 C/mol × ' + EE.toFixed(1) + ' V = <b>−' + fmt(-dG, 0) + ' kJ/mol</b>. Per electron that is ' + EE.toFixed(1) + ' eV: the voltage is the reaction’s free energy per unit of charge.';
    }
    n.addEventListener('input', render); E.addEventListener('input', render); render();
  });

  /* ---------- boot ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-fig]'), function (fig) {
    var id = fig.getAttribute('data-fig'); if (figs[id]) { try { figs[id](fig); } catch (e) { if (window.console) console.error('figure ' + id, e); } }
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { loops.forEach(function (l) { if (l.fig === en.target) { en.isIntersecting ? l.loop.start() : l.loop.stop(); } }); });
    }, { rootMargin: '80px 0px' });
    loops.forEach(function (l) { io.observe(l.fig); });
  } else loops.forEach(function (l) { l.loop.start(); });

  /* Reading time badge and the "your cell" name in the hero */
  var cellName = document.querySelectorAll('.your-cell-name');
  function names() { var n = rung(cell.neg), p = rung(cell.pos); Array.prototype.forEach.call(cellName, function (e) { e.textContent = n.name + ' | ' + p.name; }); }
  cellListeners.push(names); names();
})();
