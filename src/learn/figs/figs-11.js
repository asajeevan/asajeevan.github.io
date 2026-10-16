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
  function e11lit(r, onOff, col) { r.setAttribute('stroke', onOff ? (col || 'var(--accent)') : 'var(--line-2)'); r.setAttribute('stroke-width', onOff ? 2.2 : 1); }
  /* button group helper: buttons with data-mode inside .controls; calls fn(mode) */
  function e11modes(fig, fn) {
    var bs = fig.querySelectorAll('.controls button[data-mode]');
    Array.prototype.forEach.call(bs, function (bt) { on(bt, 'click', function () { Array.prototype.forEach.call(bs, function (x) { x.setAttribute('aria-pressed', String(x === bt)); }); fn(bt.getAttribute('data-mode')); }); });
    var cur = Array.prototype.filter.call(bs, function (x) { return x.getAttribute('aria-pressed') === 'true'; })[0] || bs[0];
    return cur ? cur.getAttribute('data-mode') : null;
  }

  /* ===== 11.1 One cell, many questions ===== */
  register('f11-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sel = 0, ph = 0.3;
    // six stations round one cell: what we impose (left sparkline) and what comes back (right sparkline)
    var ST = [
      { t: 'Galvanostatic cycling', k: 'Lab 1', q: 'How much charge, at what voltage, for how many cycles?', where: '{{ch:lab/cell-testing}}', thief: 'lost lithium and lost material, from the capacity and its slopes',
        imp: function (u) { return u < 0.5 ? 0.8 : 0.2; }, impL: 'I', res: function (u) { return u < 0.5 ? 0.25 + 0.45 * u + 0.4 * Math.pow(2 * u, 8) * 0.5 : 0.75 - 0.45 * (u - 0.5) - 0.4 * Math.pow(2 * (u - 0.5), 8) * 0.5; }, resL: 'V' },
      { t: 'Cyclic voltammetry', k: 'Lab 2', q: 'Where does it react, and how fast?', where: '{{ch:lab/cyclic-voltammetry}}', thief: 'a surface film or a sluggish reaction, from peaks that drift apart',
        imp: function (u) { return u < 0.5 ? 0.2 + 1.2 * u : 1.4 - 1.2 * u; }, impL: 'E', res: function (u) { var e = u < 0.5 ? 0.2 + 1.2 * u : 1.4 - 1.2 * u; return 0.5 + (u < 0.5 ? 0.42 * Math.exp(-Math.pow((e - 0.95) / 0.16, 2)) - 0.02 : -0.42 * Math.exp(-Math.pow((e - 0.65) / 0.16, 2)) + 0.02); }, resL: 'i' },
      { t: 'GITT', k: 'Lab 3', q: 'How fast does lithium move inside the solid?', where: '{{ch:lab/gitt}}', thief: 'slowed transport in a cracked or coated particle',
        imp: function (u) { return (u % 0.34) < 0.12 ? 0.75 : 0.2; }, impL: 'I', res: function (u) { var k = Math.floor(u / 0.34), f = u % 0.34, base = 0.25 + 0.17 * k; return f < 0.12 ? base + 0.08 + 0.1 * Math.sqrt(f / 0.12) : base + 0.17 * 0.5 - 0.09 * Math.exp(-(f - 0.12) / 0.06) + 0.0; }, resL: 'V' },
      { t: 'Impedance', k: 'Labs 4 and 5', q: 'Which part resists, and how fast does it answer?', where: '{{ch:lab/eis-measurement}}', thief: 'a thickening interface or a lost contact, from an arc that grows',
        imp: function (u) { return 0.5 + 0.35 * Math.sin(u * 6 * Math.PI * (0.4 + u)); }, impL: 'E, f', res: function (u) { return 0.5 + 0.28 * Math.sin(u * 6 * Math.PI * (0.4 + u) - 0.6); }, resL: 'i', nyq: true },
      { t: 'A current pulse', k: 'Figure L3.1', q: 'How big is the resistance, read after how long?', where: '{{ch:lab/gitt}}', thief: 'resistance that has grown, from the drop at a fixed time',
        imp: function (u) { return u < 0.2 ? 0.2 : 0.75; }, impL: 'I', res: function (u) { return u < 0.2 ? 0.25 : 0.55 + 0.2 * (1 - Math.exp(-(u - 0.2) * 12)) + 0.15 * Math.sqrt(u - 0.2); }, resL: 'V' },
      { t: 'Post-mortem', k: 'Lab 6', q: 'When the outside is not enough, what is inside?', where: '{{ch:lab/post-mortem}}', thief: 'plated lithium, cracks, deposits and lost adhesion, seen directly',
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

  /* ===== 11.2 A current pulse: the resistance depends on when you read it ===== */
  register('f11-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.tread'), sv = fig.querySelector('.tread-val');
    var p = { R0: 0.020, R1: 0.004, C1: 0.25, R2: 0.010, C2: 2, sigma: 0.002 };
    var b = { x0: 60, y0: 230, x1: 500, y1: 46 }, lo = -4, hi = 2, rmax = 0.07;
    var X = function (t) { return e11log(t, lo, hi, b.x0, b.x1); }, Y = function (r) { return b.y0 - r / rmax * (b.y0 - b.y1); };
    var band = el('g', {}, g);
    [[1e-4, 2e-4], [2e-4, 0.15], [0.15, 100]].forEach(function (s, i) { el('rect', { x: X(s[0]), y: b.y1, width: X(s[1]) - X(s[0]), height: b.y0 - b.y1, fill: i === 0 ? 'var(--second)' : i === 1 ? 'var(--accent)' : 'var(--field)', 'fill-opacity': '.06' }, band); });
    e11axes(g, b, { X: X, Y: Y, xt: [[1e-4, '0.1 ms'], [1e-3, '1 ms'], [1e-2, '10 ms'], [0.1, '0.1 s'], [1, '1 s'], [10, '10 s'], [100, '100 s']], yt: [[0, ''], [0.02, '20'], [0.04, '40'], [0.06, '60']], grid: true, xlab: 'time since the current was switched on (log scale)', ylab: 'ΔV/I read off the voltage, mΩ' });
    var pts = [], k, t;
    for (k = 0; k <= 200; k++) { t = Math.pow(10, lo + (hi - lo) * k / 200); pts.push([X(t), Y(M11.stepResistance(p, t))]); }
    el('path', { d: e11d(pts), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g);
    for (k = 0; k <= 24; k++) { t = Math.pow(10, lo + (hi - lo) * k / 24); var z = M11.voigtWZ(p, 1 / t); el('circle', { cx: X(t), cy: Y(z.re), r: 3, fill: 'var(--second)', 'fill-opacity': '.85' }, g); }
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
      read.innerHTML = 'Read at t = <b>' + e11time(tRead) + '</b>: ΔV/I = <b>' + e11mOhm(R) + '</b>, ' + part + '. Impedance at the matching frequency f = 1/(2πt) = ' + e11Hz(f) + ' has a real part of ' + e11mOhm(z.re) + ' (green dots).';
    }
    on(sl, 'input', function () { lt = +sl.value; tRead = Math.pow(10, lt); place(); });
    steps(fig, [
      { text: 'Switch on a constant current I. The voltage jumps at once. That <b>instantaneous drop</b> divided by the current, ΔV/ΔI, is the ohmic resistance: electrolyte, active material, current collectors and contacts. The number you get depends on how fast the instrument samples.' },
      { text: 'Keep the current on and the voltage keeps moving. The interfaces, the SEI and the charge transfer, each in parallel with its double layer, need their own time to answer (here about 1 ms and 20 ms).' },
      { text: 'At long times <b>diffusion</b> adds a part that keeps growing as √t. So “the resistance” of a cell depends on when you read it: the values at 10 ms, 1 s and 10 s are different numbers. That is why test standards fix the pulse length.' },
      { text: 'The green dots are the real part of the impedance of the same cell at f = 1/(2πt). They roughly follow the pulse curve: values from a pulse and from a sine agree when the timescales match. Impedance spectroscopy, from figure {{fig:f11-8}} on, measures one frequency at a time.' }
    ]);
    place();
    var loop = anim(fig, function (dt) { if (dt === 0) return; lt += dt * 0.9; if (lt > hi) lt = lo; tRead = Math.pow(10, lt); sl.value = lt; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 11.18 What each technique sees, and what it costs the cell ===== */
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
    txt(g, 260, 244, 'accelerating-rate calorimetry finds where thermal runaway starts ({{ch:safety}})', '', 'middle');
    steps(fig, cols.map(function (c) { return { text: c.why, on: function () { read.innerHTML = '<b>' + c.t + '</b>: ' + c.items.join(', ') + '.'; } }; }));
  });
