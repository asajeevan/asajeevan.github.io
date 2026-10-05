  /* =================================================================
     Module 11, measuring well (11.12 to 11.14): how small the sine must
     be, from the Butler-Volmer curve and its harmonics (Bard, Faulkner
     and White 2022, B2, eqs 3.4.11 and 3.4.13 and sec. 11.6; Meddings et
     al. 2020, R64, sec. 3.1; Bakenhaster and Dewald 2025, R65, sec. 4.4);
     two terminals against four (Lazanas and Prodromidis 2023, R63, eqs 82
     and 83 and sec. 15); and the Kramers-Kronig test (R63 secs 7 and
     16.5; R64 sec. 3.3.1). Physics in Physics.m11.
     ================================================================= */

  /* ===== 11.12 How small is small? ===== */
  register('f11-12', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sA = fig.querySelector('.amp'), sAv = fig.querySelector('.amp-val'), sa = fig.querySelector('.alpha'), sav = fig.querySelector('.alpha-val');
    var i0 = 1e-3, f = 96485 / (8.314 * 298.15);
    // left: the Butler-Volmer curve
    var a = { x0: 50, y0: 220, x1: 240, y1: 40 }, X = function (e) { return a.x0 + (e + 0.12) / 0.24 * (a.x1 - a.x0); }, Y = function (i) { return (a.y0 + a.y1) / 2 - i / 0.016 * (a.y0 - a.y1); };
    e11axes(g, a, { X: X, Y: function (i) { return Y(i); }, xt: [[-0.1, '−100'], [0, '0'], [0.1, '100 mV']], yt: [[-0.008, '−8'], [0, '0'], [0.008, '8']], xlab: 'overpotential η', ylab: 'current, mA' });
    el('line', { x1: a.x0, x2: a.x1, y1: Y(0), y2: Y(0), stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g);
    var bv = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.6 }, g), tang = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g), seg = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    txt(g, X(0.02), Y(0.0062), 'slope 1/R_ct', 'cyan', 'start');
    // right top: current over one period against a pure sine
    var r = { x0: 300, y0: 128, x1: 505, y1: 40 }, XT = function (u) { return r.x0 + u * (r.x1 - r.x0); };
    txt(g, r.x0, 24, 'current over one period', 'strong', 'start');
    el('line', { x1: r.x0, x2: r.x1, y1: (r.y0 + r.y1) / 2, y2: (r.y0 + r.y1) / 2, stroke: 'var(--line-2)' }, g);
    var pS = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g), pI = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    txt(g, r.x1, r.y0 + 18, 'dashed: a pure sine', '', 'end');
    // right bottom: harmonics
    var h = { x0: 320, y0: 270, x1: 505, y1: 192 }, YH = function (q) { return h.y0 - (Math.log10(Math.max(q, 1e-5)) + 5) / 5 * (h.y0 - h.y1); };
    e11axes(g, h, { X: function (x) { return x; }, Y: YH, yt: [[1e-4, '10⁻⁴'], [1e-2, '0.01'], [1, '1']], grid: true, ylab: 'size ÷ fundamental' });
    var bars = [1, 2, 3, 4, 5].map(function (n) { var x = h.x0 + 8 + (n - 1) * 36; txt(g, x + 13, h.y0 + 16, n === 1 ? 'f' : n + 'f', 'strong', 'middle'); return el('rect', { x: x, width: 26, fill: n === 1 ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': '.85' }, g); });
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

  /* ===== 11.13 Two wires or four ===== */
  register('f11-13', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.cable'), sv = fig.querySelector('.cable-val');
    var C = M11.CELL, rPerM = 0.004, lPerM = 0.2e-6, fs = M11.freqs(10000, 0.5, 20);
    // the two set-ups
    function cell(x, y) { el('rect', { x: x, y: y, width: 40, height: 56, rx: 4, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g); txt(g, x + 20, y + 33, 'cell', 'strong', 'middle'); }
    function meter(x, y, lab) { el('rect', { x: x, y: y, width: 70, height: 56, rx: 4, fill: 'none', stroke: 'var(--line-2)' }, g); txt(g, x + 35, y + 22, 'analyzer', 'strong', 'middle'); txt(g, x + 35, y + 40, lab, '', 'middle'); }
    meter(20, 40, '2 terminals'); cell(200, 40);
    el('path', { d: 'M90,54 H200 M90,82 H200', stroke: 'var(--amber)', 'stroke-width': 2, fill: 'none' }, g);
    txt(g, 145, 34, 'current and voltage share the wires', '', 'middle');
    meter(280, 40, '4 terminals'); cell(460, 40);
    el('path', { d: 'M350,50 H460 M350,86 H460', stroke: 'var(--amber)', 'stroke-width': 2, fill: 'none' }, g);
    el('path', { d: 'M350,60 H440 V58 H460 M350,76 H440 V78 H460', stroke: 'var(--cyan)', 'stroke-width': 1.6, fill: 'none' }, g);
    txt(g, 405, 34, 'current pair (amber), sense pair (cyan)', '', 'middle');
    var b = { x0: 60, y0: 330, x1: 470, y1: 130 }, F = e11nyq(g, b, [16, 57], -12, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[-10, '−10'], [0, '0'], [5, '5']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var z4 = fs.map(function (f) { var w = 2 * Math.PI * f; return M11.add(M11.zL(C.L, w), M11.zR(C.R0), M11.zRQ(C.Rsei, C.Qsei, C.nsei, w), M11.parallel(M11.zR(C.Rct), M11.zC(C.Cdl, w))); });
    el('path', { d: e11zpath(z4, F, b, 1000), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.4 }, g);
    var p2 = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), mk = el('g', {}, g);
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

  /* ===== 11.14 Is the spectrum valid? The Kramers-Kronig test ===== */
  register('f11-14', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cb = fig.querySelector('.drift'), sl = fig.querySelector('.noise'), sv = fig.querySelector('.noise-val');
    var C = M11.CELL, fs = M11.freqs(5000, 0.01, 8), tt = 0, ts = fs.map(function (f) { tt += Math.max(2 / f, 1); return tt; }), T = tt;
    function gauss(seed) { var s = seed; return function () { var x = 0; for (var j = 0; j < 6; j++) { s = (s * 1664525 + 1013904223) % 4294967296; x += s / 4294967296; } return (x - 3) / Math.sqrt(0.5); }; }
    var b = { x0: 60, y0: 210, x1: 470, y1: 40 }, F = e11nyq(g, b, [18, 59], -6, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[-5, '−5'], [0, '0'], [10, '10']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var r = { x0: 60, y0: 350, x1: 470, y1: 284 }, XR = function (f) { return e11log(f, -2, Math.log10(5000), r.x0, r.x1); }, YR = function (q) { return (r.y0 + r.y1) / 2 - q / 0.03 * (r.y0 - r.y1); };
    el('rect', { x: r.x0, y: YR(0.01), width: r.x1 - r.x0, height: YR(-0.01) - YR(0.01), fill: 'var(--cyan)', 'fill-opacity': '.07' }, g);
    e11axes(g, { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 }, { X: XR, Y: YR, xt: [[0.01, '0.01'], [1, '1'], [100, '100'], [5000, '5 kHz']], yt: [[-0.01, '−1'], [0, '0'], [0.01, '1']], ylab: 'residual, % of |Z|' });
    el('line', { x1: r.x0, x2: r.x1, y1: YR(0), y2: YR(0), stroke: 'var(--line-2)' }, g);
    var gd = el('g', {}, g), fit = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.8 }, g), gr = el('g', {}, g);
    badge(g, F.X(52), F.Y(10), 1); badge(g, r.x1 - 12, r.y1 + 12, 2);
    function render() {
      var drift = cb.checked, nz = +sl.value / 100, rn = gauss(7); setSvgText(sv, (nz * 100).toFixed(1) + ' %');
      var Z = fs.map(function (f, i) { var k = drift ? 1 + 0.3 * ts[i] / T : 1, p = { L: C.L, R0: C.R0, Rsei: C.Rsei * k, Qsei: C.Qsei, nsei: C.nsei, Rct: C.Rct * k, Cdl: C.Cdl, Rd: C.Rd, Cd: C.Cd }, z = M11.cellZ(p, 2 * Math.PI * f), m = M11.abs(z); return { re: z.re + nz * m * rn(), im: z.im + nz * m * rn() }; });
      var kk = M11.linKK(fs, Z);
      clear(gd); clear(gr);
      Z.forEach(function (z) { var y = F.Y(-z.im * 1000); if (y >= b.y1) el('circle', { cx: F.X(z.re * 1000), cy: y, r: 3, fill: 'var(--amber)' }, gd); });
      fit.setAttribute('d', e11zpath(kk.fit, F, b, 1000));
      kk.res.forEach(function (q, i) { el('circle', { cx: XR(fs[i]), cy: Math.max(r.y1, Math.min(r.y0, YR(q.re))), r: 2.6, fill: 'var(--amber)' }, gr); el('circle', { cx: XR(fs[i]), cy: Math.max(r.y1, Math.min(r.y0, YR(q.im))), r: 2.6, fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.4 }, gr); });
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
