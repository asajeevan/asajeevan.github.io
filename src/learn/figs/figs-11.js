  /* =================================================================
     Module 11: testing and diagnosis. This file holds the helpers shared
     by figs-11*.js, the overview (11.1), the current pulse (11.2) and
     what each technique sees (11.18). GITT is in figs-11g.js, impedance
     basics in figs-11e.js, measuring well in figs-11m.js and analysis in
     figs-11a.js. All physics is in Physics.m11 (assets/js/physics.js),
     with the source of each formula stated there.
     ================================================================= */
  var M11 = P.m11;
  function e11d(pts) { var d = ''; for (var i = 0; i < pts.length; i++) { if (!isFinite(pts[i][0]) || !isFinite(pts[i][1])) continue; d += (d ? 'L' : 'M') + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1); } return d; }
  /* axes with tick labels: b = {x0, y0, x1, y1} (y0 is the bottom); o.xt / o.yt = [[value, label]] mapped by o.X / o.Y */
  function e11axes(g, b, o) {
    el('line', { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0, stroke: 'var(--line-2)' }, g);
    el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, stroke: 'var(--line-2)' }, g);
    (o.xt || []).forEach(function (t) { var x = o.X(t[0]); el('line', { x1: x, x2: x, y1: b.y0, y2: b.y0 + 4, stroke: 'var(--line-2)' }, g); if (t[1] !== '') txt(g, x, b.y0 + 16, t[1], '', 'middle'); });
    (o.yt || []).forEach(function (t) { var y = o.Y(t[0]); el('line', { x1: b.x0 - 4, x2: b.x0, y1: y, y2: y, stroke: 'var(--line-2)' }, g); if (o.grid) el('line', { x1: b.x0, x2: b.x1, y1: y, y2: y, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); if (t[1] !== '') txt(g, b.x0 - 7, y + 4, t[1], '', 'end'); });
    if (o.xlab) txt(g, b.x1, b.y0 + (o.xt && o.xt.length ? 32 : 16), o.xlab, '', 'end');
    if (o.ylab) txt(g, b.x0 + 6, b.y1 - 8, o.ylab, '', 'start');
  }
  function e11mOhm(r, d) { return (r * 1000).toFixed(d === undefined ? 1 : d) + ' mΩ'; }
  function e11Hz(f) {
    var s = f >= 1e3 ? (f / 1e3).toFixed(f >= 1e4 ? 0 : 1) + ' kHz' : f >= 1 ? f.toFixed(f >= 10 ? 0 : 1) + ' Hz' : (f * 1e3).toFixed(f * 1e3 >= 10 ? 0 : 1) + ' mHz';
    return s.replace('.0 ', ' ');
  }
  /* a signed number with a true minus sign */
  function e11n(x, d) { var s = Math.abs(x).toFixed(d === undefined ? 1 : d); return (x < 0 && +s !== 0 ? '−' : '') + s; }
  function e11time(t) {
    if (t < 1e-3) return (t * 1e6).toFixed(0) + ' µs';
    if (t < 1) return (t * 1e3).toFixed(t < 0.01 ? 1 : 0) + ' ms';
    if (t < 120) return t.toFixed(t < 10 ? 1 : 0) + ' s';
    if (t < 7200) return (t / 60).toFixed(0) + ' min';
    return (t / 3600).toFixed(t < 36000 ? 1 : 0) + ' h';
  }
  function e11log(v, lo, hi, a, b) { return a + (Math.log10(v) - lo) / (hi - lo) * (b - a); }
  /* a circuit-element box with a label, used by several figures */
  function e11box(g, x, y, w, lab, cls) { var r = el('rect', { x: x, y: y - 10, width: w, height: 20, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g); txt(g, x + w / 2, y + 4, lab, cls || 'strong', 'middle'); return r; }
  function e11lit(r, onOff, col) { r.setAttribute('stroke', onOff ? (col || 'var(--amber)') : 'var(--line-2)'); r.setAttribute('stroke-width', onOff ? 2.2 : 1); }
  /* button group helper: buttons with data-mode inside .controls; calls fn(mode) */
  function e11modes(fig, fn) {
    var bs = fig.querySelectorAll('.controls button[data-mode]');
    Array.prototype.forEach.call(bs, function (bt) { on(bt, 'click', function () { Array.prototype.forEach.call(bs, function (x) { x.setAttribute('aria-pressed', String(x === bt)); }); fn(bt.getAttribute('data-mode')); }); });
    var cur = Array.prototype.filter.call(bs, function (x) { return x.getAttribute('aria-pressed') === 'true'; })[0] || bs[0];
    return cur ? cur.getAttribute('data-mode') : null;
  }

  /* ===== 11.1 One cell, many questions ===== */
  register('f11-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var P4 = [
      { x: 20, y: 20, t: 'cycling at constant current', q: 'How much charge, at what voltage, for how many cycles?', where: 'module 5' },
      { x: 270, y: 20, t: 'a current pulse', q: 'How big is the resistance, read after how long?', where: 'figure 11.2' },
      { x: 20, y: 170, t: 'GITT: pulse and rest', q: 'How fast does lithium move inside the solid?', where: 'figures 11.3 to 11.7' },
      { x: 270, y: 170, t: 'impedance spectroscopy', q: 'Which part resists, and how fast does it answer?', where: 'figures 11.8 to 11.17' }
    ];
    var W = 230, H = 130;
    P4.forEach(function (p, i) {
      el('rect', { x: p.x, y: p.y, width: W, height: H, rx: 6, fill: 'var(--panel-2)', 'fill-opacity': '.5', stroke: 'var(--line-2)' }, g);
      txt(g, p.x + 10, p.y + 18, p.t, 'strong', 'start');
      var px = p.x + 16, py = p.y + 100, d = '', k, j, u;
      if (i === 0) { for (var cyc = 0; cyc < 2; cyc++) { var ox = px + cyc * 96; for (k = 0; k <= 24; k++) { u = k / 24; d += (cyc + k ? 'L' : 'M') + (ox + u * 48).toFixed(1) + ',' + (py - 62 + 22 * u + 22 * Math.pow(u, 8) + cyc * 3).toFixed(1); } for (k = 0; k <= 24; k++) { u = k / 24; d += 'L' + (ox + 48 + u * 48).toFixed(1) + ',' + (py - 18 - 22 * u - 22 * Math.pow(u, 8) + cyc * 3).toFixed(1); } } }
      if (i === 1) { d = 'M' + px + ',' + (py - 10) + ' H' + (px + 40) + ' V' + (py - 40); for (k = 0; k <= 40; k++) { var lt = k / 40; d += ' L' + (px + 40 + lt * 150).toFixed(1) + ',' + (py - 40 - 20 * (1 - Math.exp(-lt * 6)) - 14 * Math.sqrt(lt)).toFixed(1); } }
      if (i === 2) { d = 'M' + px + ',' + (py - 20); for (k = 0; k < 3; k++) { var x = px + k * 62; d += ' L' + (x + 6) + ',' + (py - 20 - k * 12) + ' L' + (x + 6) + ',' + (py - 32 - k * 12); for (j = 1; j <= 6; j++) d += ' L' + (x + 6 + j * 3) + ',' + (py - 32 - k * 12 - 10 * Math.sqrt(j / 6)).toFixed(1); d += ' L' + (x + 24) + ',' + (py - 34 - k * 12); for (j = 1; j <= 10; j++) d += ' L' + (x + 24 + j * 3.6).toFixed(1) + ',' + (py - 32 - (k + 1) * 12 + 12 * Math.exp(-j / 2.5)).toFixed(1); } }
      if (i === 3) { for (k = 0; k <= 50; k++) { var a = Math.PI * k / 50; d += (k ? 'L' : 'M') + (px + 30 + 34 - 34 * Math.cos(a)).toFixed(1) + ',' + (py - 34 * Math.sin(a) * 0.9).toFixed(1); } d += ' L' + (px + 170) + ',' + (py - 60); }
      el('path', { d: d, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, g);
      txt(g, p.x + 10, p.y + H - 6, p.where, '', 'start');
      badge(g, p.x + W - 14, p.y + 14, i + 1);
    });
    steps(fig, P4.map(function (p) { return { text: '<b>' + p.t.charAt(0).toUpperCase() + p.t.slice(1) + '</b>. ' + p.q, on: function () { read.innerHTML = 'The question this measurement answers: <b>' + p.q + '</b> (' + p.where + ')'; } }; }));
  });

  /* ===== 11.2 A current pulse: the resistance depends on when you read it ===== */
  register('f11-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.tread'), sv = fig.querySelector('.tread-val');
    var p = { R0: 0.020, R1: 0.004, C1: 0.25, R2: 0.010, C2: 2, sigma: 0.002 };
    var b = { x0: 60, y0: 230, x1: 500, y1: 46 }, lo = -4, hi = 2, rmax = 0.07;
    var X = function (t) { return e11log(t, lo, hi, b.x0, b.x1); }, Y = function (r) { return b.y0 - r / rmax * (b.y0 - b.y1); };
    var band = el('g', {}, g);
    [[1e-4, 2e-4], [2e-4, 0.15], [0.15, 100]].forEach(function (s, i) { el('rect', { x: X(s[0]), y: b.y1, width: X(s[1]) - X(s[0]), height: b.y0 - b.y1, fill: i === 0 ? 'var(--cyan)' : i === 1 ? 'var(--amber)' : '#C4B5F7', 'fill-opacity': '.06' }, band); });
    e11axes(g, b, { X: X, Y: Y, xt: [[1e-4, '0.1 ms'], [1e-3, '1 ms'], [1e-2, '10 ms'], [0.1, '0.1 s'], [1, '1 s'], [10, '10 s'], [100, '100 s']], yt: [[0, ''], [0.02, '20'], [0.04, '40'], [0.06, '60']], grid: true, xlab: 'time since the current was switched on (log scale)', ylab: 'ΔV/I read off the voltage, mΩ' });
    var pts = [], k, t;
    for (k = 0; k <= 200; k++) { t = Math.pow(10, lo + (hi - lo) * k / 200); pts.push([X(t), Y(M11.stepResistance(p, t))]); }
    el('path', { d: e11d(pts), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    for (k = 0; k <= 24; k++) { t = Math.pow(10, lo + (hi - lo) * k / 24); var z = M11.voigtWZ(p, 1 / t); el('circle', { cx: X(t), cy: Y(z.re), r: 3, fill: 'var(--cyan)', 'fill-opacity': '.85' }, g); }
    var cur = el('line', { y1: b.y1, y2: b.y0, stroke: 'var(--text)', 'stroke-dasharray': '4 3' }, g), dot = el('circle', { r: 6, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var tl = txt(g, 0, 0, '', 'strong tag', 'start');
    badge(g, X(1.4e-4), Y(0.02) - 20, 1); badge(g, X(0.006), Y(0.036) - 24, 2); badge(g, X(14), Y(M11.stepResistance(p, 14)) + 24, 3);
    var lt = 0, tRead = 1;
    function place() {
      var R = M11.stepResistance(p, tRead), z = M11.voigtWZ(p, 1 / tRead), f = 1 / (2 * Math.PI * tRead), x = X(tRead), y = Y(R);
      cur.setAttribute('x1', x); cur.setAttribute('x2', x); dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      tl.setAttribute('x', x > b.x1 - 150 ? x - 10 : x + 10); tl.setAttribute('text-anchor', x > b.x1 - 150 ? 'end' : 'start'); tl.setAttribute('y', Math.max(y - 14, b.y1 + 14)); setSvgText(tl, e11mOhm(R) + ' at ' + e11time(tRead));
      setSvgText(sv, e11time(tRead));
      var part = tRead < 2e-4 ? 'the instantaneous drop, the <b>ohmic</b> resistance of electrolyte, electrodes and contacts' : tRead < 0.15 ? 'the ohmic part plus the <b>interfaces</b> (SEI and charge transfer) charging their double layers' : 'everything above plus a <b>diffusion</b> part that keeps growing as √t';
      read.innerHTML = 'Read at t = <b>' + e11time(tRead) + '</b>: ΔV/I = <b>' + e11mOhm(R) + '</b>, ' + part + '. Impedance at the matching frequency f = 1/(2πt) = ' + e11Hz(f) + ' has a real part of ' + e11mOhm(z.re) + ' (cyan dots).';
    }
    on(sl, 'input', function () { lt = +sl.value; tRead = Math.pow(10, lt); place(); });
    steps(fig, [
      { text: 'Switch on a constant current I. The voltage jumps at once. That <b>instantaneous drop</b> divided by the current, ΔV/ΔI, is the ohmic resistance: electrolyte, active material, current collectors and contacts. The number you get depends on how fast the instrument samples.' },
      { text: 'Keep the current on and the voltage keeps moving. The interfaces, the SEI and the charge transfer, each in parallel with its double layer, need their own time to answer (here about 1 ms and 20 ms).' },
      { text: 'At long times <b>diffusion</b> adds a part that keeps growing as √t. So “the resistance” of a cell depends on when you read it: the values at 10 ms, 1 s and 10 s are different numbers. That is why test standards fix the pulse length.' },
      { text: 'The cyan dots are the real part of the impedance of the same cell at f = 1/(2πt). They roughly follow the pulse curve: values from a pulse and from a sine agree when the timescales match. Impedance spectroscopy, from figure 11.8 on, measures one frequency at a time.' }
    ]);
    place();
    var loop = anim(fig, function (dt) { if (dt === 0) return; lt += dt * 0.9; if (lt > hi) lt = lo; tRead = Math.pow(10, lt); sl.value = lt; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 11.18 What each technique sees, and what it costs the cell ===== */
  register('f11-18', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var cols = [
      { x: 20, t: 'from outside, cell intact', items: ['cycling, dQ/dV', 'current pulses', 'GITT', 'impedance', 'cyclic voltammetry'], col: 'var(--cyan)', why: 'Nondestructive: the cell keeps working, so the same cell can be followed as it ages. Capacity, rate, resistances, diffusion and state of health come from here. Capacity, cyclic voltammetry and differential capacity are also used to check what impedance and a tear-down suggest.' },
      { x: 187, t: 'inside, while it works', items: ['three-electrode cell', 'in situ X-ray, NMR', 'local impedance', 'pressure sensing'], col: 'var(--amber)', why: 'In situ: a reference electrode separates the two electrodes; plastic cells let X-ray absorption, NMR, Mössbauer spectroscopy and the electron microscope watch the electrodes while the cell runs; local impedance probes one spot with a moving tip; a pressure sensor follows the SEI swelling.' },
      { x: 354, t: 'after it is opened', items: ['symmetric cells', 'microscopy', 'XPS, Raman', 'X-ray CT (before)'], col: 'var(--heat)', why: 'Post-mortem: discharge the cell, open it in an argon glove box and examine its parts. Electrodes harvested from a commercial cell can be rebuilt into symmetric cells, two identical electrodes, to see which electrode carries which arc. X-ray tomography before opening shows where to cut. A fresh cell treated the same way is the baseline.' }
    ];
    cols.forEach(function (c, i) {
      el('rect', { x: c.x, y: 30, width: 150, height: 190, rx: 6, fill: c.col, 'fill-opacity': '.08', stroke: c.col, 'stroke-opacity': '.6' }, g);
      txt(g, c.x + 75, 20, c.t, 'strong', 'middle');
      c.items.forEach(function (it, j) { txt(g, c.x + 12, 58 + j * 26, '• ' + it, '', 'start'); });
      badge(g, c.x + 136, 206, i + 1);
    });
    txt(g, 260, 244, 'accelerating-rate calorimetry finds where thermal runaway starts (module 12)', '', 'middle');
    steps(fig, cols.map(function (c) { return { text: c.why, on: function () { read.innerHTML = '<b>' + c.t + '</b>: ' + c.items.join(', ') + '.'; } }; }));
  });
