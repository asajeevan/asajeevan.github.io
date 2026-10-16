  /* ===================== Lab 5: EIS analysis, continued (figures f11-40 to f11-42) ===================== */
  /* shared: a Nyquist frame with equal scales on both axes */
  function nyqFrame(g, b, rmax, o) {
    var W = b.x1 - b.x0, H = b.y0 - b.y1, span = rmax, px = Math.min(W / span, H / (span * (o && o.aspect || 0.55)));
    var X = function (r) { return b.x0 + r * px; }, Y = function (i) { return b.y0 - i * px; };
    el('line', { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0, stroke: 'var(--line-2)' }, g); el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, stroke: 'var(--line-2)' }, g);
    (o.xt || []).forEach(function (t) { el('line', { x1: X(t[0]), x2: X(t[0]), y1: b.y0, y2: b.y0 + 4, stroke: 'var(--line-2)' }, g); txt(g, X(t[0]), b.y0 + 16, t[1], '', 'middle'); });
    (o.yt || []).forEach(function (t) { if (Y(t[0]) < b.y1) return; el('line', { x1: b.x0 - 4, x2: b.x0, y1: Y(t[0]), y2: Y(t[0]), stroke: 'var(--line-2)' }, g); txt(g, b.x0 - 7, Y(t[0]) + 4, t[1], '', 'end'); });
    if (o.xl) txt(g, b.x1, b.y0 + 32, o.xl, '', 'end'); if (o.yl) txt(g, b.x0 - 6, b.y1 - 10, o.yl, '', 'start');
    return { X: X, Y: Y };
  }
  var EF_W = P.m11.freqs(1e5, 0.01, 10).map(function (f) { return 2 * Math.PI * f; });

  /* f11-40: reading an arc: diameter, apex frequency, time constant, and when two arcs resolve */
  register('f11-40', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var sr = fig.querySelector('.ar'), srv = fig.querySelector('.ar-val'), st = fig.querySelector('.at'), stv = fig.querySelector('.at-val');
    var R0 = 10, R1 = 20, C1 = 1e-4;   // mΩ, F: the fixed first arc
    var b = { x0: 58, y0: 236, x1: 310, y1: 40 }, pb = { x0: 372, y0: 236, x1: 500, y1: 40 }, gn = el('g', {}, g), gb = el('g', {}, g);
    badge(g, 120, 60, 1); badge(g, 270, 60, 2); badge(g, 470, 60, 3);
    function place() {
      var R2 = +sr.value, ratio = Math.pow(10, +st.value);
      // the second arc's time constant is set by its ratio to the first; its capacitance follows from R2
      var tau1 = R1 * 1e-3 * C1, tau2 = tau1 * ratio, C2 = tau2 / (R2 * 1e-3);
      setSvgText(srv, R2 + ' mΩ'); setSvgText(stv, ratio >= 100 ? ratio.toFixed(0) : ratio.toFixed(1));
      clear(gn); clear(gb);
      var rmax = (R0 + R1 + R2) * 1.08, fr = nyqFrame(gn, b, rmax, { xt: [[0, '0'], [20, '20'], [40, '40'], [60, '60']].filter(function (t) { return t[0] <= rmax; }), yt: [[0, '0'], [10, '10'], [20, '20']], xl: 'Z′, mΩ', yl: '−Z″, mΩ' });
      var zs = EF_W.map(function (w) { var z1 = P.m11.zRQ(R1 * 1e-3, C1, 1, w), z2 = P.m11.zRQ(R2 * 1e-3, C2, 1, w); return { re: (R0 * 1e-3 + z1.re + z2.re) * 1e3, im: -(z1.im + z2.im) * 1e3 }; });
      el('path', { d: cvPath(zs.map(function (z) { return z.re; }), zs.map(function (z) { return z.im; }), fr.X, fr.Y), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }, gn);
      // the readings: diameters and apex frequencies
      [[R0, R0 + R1, tau1, 'var(--second)'], [R0 + R1, R0 + R1 + R2, tau2, 'var(--heat)']].forEach(function (a, k) {
        el('line', { x1: fr.X(a[0]), x2: fr.X(a[1]), y1: fr.Y(0) + 8 + k * 9, y2: fr.Y(0) + 8 + k * 9, stroke: a[3], 'stroke-width': 2 }, gn);
        var fap = 1 / (2 * Math.PI * a[2]); txt(gn, fr.X((a[0] + a[1]) / 2), fr.Y((a[1] - a[0]) / 2) - 8, (fap >= 1000 ? (fap / 1000).toFixed(1) + ' kHz' : fap >= 1 ? fap.toFixed(fap >= 10 ? 0 : 1) + ' Hz' : (fap * 1000).toFixed(0) + ' mHz'), '', 'middle', { style: 'font-size:10px;fill:' + a[3] });
      });
      // Bode: −Z″ against frequency, where each arc is a peak
      var fb = cvFrame(gb, pb, [-2, 5], [0, (Math.max(R1, R2) / 2) * 1.3], { xt: [[-1, '0.1'], [1, '10'], [3, '10³'], [5, '10⁵']], yt: [[0, '0'], [5, '5'], [10, '10'], [15, '15']], xl: 'f, Hz', yl: '−Z″, mΩ' });
      el('path', { d: cvPath(EF_W.map(function (w) { return Math.log10(w / (2 * Math.PI)); }), zs.map(function (z) { return z.im; }), fb.X, fb.Y), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, gb);
      var resolved = ratio >= 100;
      read.innerHTML = 'First arc: ' + R1 + ' mΩ across, apex at ' + (1 / (2 * Math.PI * tau1)).toFixed(0) + ' Hz, so τ₁ = R₁C₁ = ' + (tau1 * 1000).toFixed(1) + ' ms. Second arc: ' + R2 + ' mΩ, τ₂ = ' + (tau2 >= 1 ? tau2.toFixed(2) + ' s' : (tau2 * 1000).toFixed(1) + ' ms') + ', ' + ratio.toFixed(0) + ' times slower, so C₂ = τ₂/R₂ = ' + (C2 >= 1 ? C2.toFixed(2) + ' F' : C2 >= 1e-3 ? (C2 * 1e3).toFixed(1) + ' mF' : (C2 * 1e6).toFixed(0) + ' µF') + '. ' + (resolved ? '<b>Two arcs resolve</b>: the time constants differ by a hundredfold or more, and the Bode plot shows two peaks.' : '<b>The arcs merge</b>: with time constants less than a hundred apart they overlap into one flattened arc, and a fit will share the resistance between them however it is started.') + ' The diameter of an arc is its resistance; the frequency at its top is 1/(2πRC); the capacitance follows.';
    }
    on(sr, 'input', place); on(st, 'input', place);
    steps(fig, [
      { text: 'A resistor in parallel with a capacitor draws a <b>semicircle</b>. Its diameter is R; the frequency at its top is where ωRC = 1, so τ = RC is read from the top, and C from R and τ.', on: function () { st.value = 2.5; place(); } },
      { text: 'Two pairs in series draw two arcs, but only if their <b>time constants differ by about a hundredfold</b>; closer than that, the arcs overlap and the plot shows one.', on: function () { st.value = 1; place(); } },
      { text: 'A <b>Bode plot</b> of −Z″ against frequency shows each arc as a peak at its own frequency; it separates what the Nyquist plot hides, and it shows the frequencies, which the Nyquist plot does not.', on: function () { st.value = 2.5; place(); } }
    ]);
    place();
  });

  /* f11-41: temperature tells the arcs apart: charge transfer follows an Arrhenius law (Chen et al. 2020) */
  register('f11-41', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), st = fig.querySelector('.et'), stv = fig.querySelector('.et-val');
    var EA = { nmc: 17.8e3, gr: 35.0e3 }, R25 = 1.80, Rg = 8.314;
    var b = { x0: 58, y0: 236, x1: 270, y1: 40 }, fr = cvFrame(g, b, [2.95, 3.4], [-1.2, 0.6], { xt: [[3.0, '3.0'], [3.1, '3.1'], [3.2, '3.2'], [3.3, '3.3']], yt: [[-1, '0.37'], [-0.5, '0.61'], [0, '1'], [0.5, '1.65']], xl: '1000/T, K⁻¹', yl: 'R_{ct}(T) / R_{ct}(25 °C)' });
    function line(Ea, col, lab, dy) { var d = '', on = false; for (var k = 0; k <= 40; k++) { var x = 2.95 + k * 0.01125, T = 1000 / x, y = Ea / Rg * (1 / T - 1 / 298.15); if (y < -1.2 || y > 0.6) { on = false; continue; } d += (on ? 'L' : 'M') + fr.X(x).toFixed(1) + ',' + fr.Y(y).toFixed(1); on = true; } el('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 2 }, g); txt(g, fr.X(3.3), fr.Y(Ea / Rg * (1 / (1000 / 3.3) - 1 / 298.15)) + dy, lab, '', 'end', { style: 'font-size:10px;fill:' + col }); }
    line(EA.nmc, 'var(--accent)', 'NMC 811, 17.8 kJ/mol', -8); line(EA.gr, 'var(--second)', 'graphite-SiOx, 35.0 kJ/mol', 16);
    // the measured NMC points: 1.80 ohm at 25, 0.94 at 60 °C
    [[25, 1.80, 8, 18, 'end'], [60, 0.94, 8, 4, 'start']].forEach(function (p) { var x = 1000 / (p[0] + 273.15); el('circle', { cx: fr.X(x), cy: fr.Y(Math.log(p[1] / R25)), r: 4.5, fill: 'var(--accent)', stroke: '#fff' }, g); txt(g, fr.X(x) + (p[4] === 'end' ? -p[2] : p[2]), fr.Y(Math.log(p[1] / R25)) + p[3], p[1] + ' Ω at ' + p[0] + ' °C', '', p[4], { style: 'font-size:10px' }); });
    [25, 40, 60].forEach(function (T) { var x = 1000 / (T + 273.15); txt(g, fr.X(x), b.y1 + 12, T + ' °C', '', 'middle', { style: 'font-size:10px' }); el('line', { x1: fr.X(x), x2: fr.X(x), y1: b.y1 + 16, y2: b.y0, stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g); });
    var dot = el('circle', { r: 5, fill: 'var(--heat)', stroke: '#fff' }, g);
    // right: the charge-transfer arc of the NMC electrode shrinking with temperature
    var pb = { x0: 320, y0: 236, x1: 500, y1: 40 }, gn = el('g', {}, g);
    badge(g, fr.X(3.05), fr.Y(-0.9), 1); badge(g, fr.X(3.13), fr.Y(0.4), 2); badge(g, 480, 60, 3);
    function place() {
      var T = +st.value, x = 1000 / (T + 273.15), f = Math.exp(EA.nmc / Rg * (1 / (T + 273.15) - 1 / 298.15)), Rct = R25 * f, fg = Math.exp(EA.gr / Rg * (1 / (T + 273.15) - 1 / 298.15));
      setSvgText(stv, T + ' °C'); dot.setAttribute('cx', fr.X(x)); dot.setAttribute('cy', fr.Y(Math.log(f)));
      clear(gn);
      var nf = nyqFrame(gn, pb, 2.6, { xt: [[0, '0'], [1, '1'], [2, '2']], yt: [[0, '0'], [1, '1']], xl: 'Z′, Ω', yl: '−Z″, Ω' });
      var zs = EF_W.map(function (w) { var z = P.m11.zRQ(Rct, 0.02, 0.9, w); return { re: 0.3 + z.re, im: -z.im }; });
      el('path', { d: cvPath(zs.map(function (z) { return z.re; }), zs.map(function (z) { return z.im; }), nf.X, nf.Y), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }, gn);
      txt(gn, nf.X(0.3 + Rct / 2), nf.Y(Rct / 2) - 10, 'R_{ct} ' + Rct.toFixed(2) + ' Ω', 'amber', 'middle', { style: 'font-size:11px' });
      var i0 = Rg * (T + 273.15) / (96485 * Rct);
      read.innerHTML = 'At ' + T + ' °C the NMC 811 charge-transfer resistance is <b>' + Rct.toFixed(2) + ' Ω</b> on the Arrhenius line through the measured 1.80 Ω at 25 °C, ' + (f > 1 ? (f).toFixed(2) + ' times its room-temperature value' : (1 / f).toFixed(2) + ' times smaller') + '; the graphite-SiOx electrode, with twice the activation energy, would change by ' + (fg > 1 ? fg.toFixed(2) + ' times' : (1 / fg).toFixed(2) + ' times the other way') + '. The exchange current that follows from RT/(F R<sub>ct</sub>) is ' + (i0 * 1000).toFixed(1) + ' mA for this electrode. Measured at 50 % state of charge, 10 mV, 10 mHz to 500 kHz, in a chamber; the arc on the right is schematic.';
    }
    on(st, 'input', place);
    steps(fig, [
      { text: 'Which arc is <b>charge transfer</b>? The one that shrinks fastest when the cell is warmed: its resistance follows an Arrhenius law, here with 17.8 kJ/mol on the NMC side and 35.0 on the graphite side.', on: function () { st.value = 60; place(); } },
      { text: 'Two points fix the line: 1.80 Ω at 25 °C and 0.94 Ω at 60 °C. A resistance that does not move with temperature in this way is not charge transfer, whatever the circuit called it.', on: function () { st.value = 25; place(); } },
      { text: 'From R<sub>ct</sub> the <b>exchange current</b> follows through the linear limit of Butler-Volmer, and from its temperature dependence the activation energy: the spectrum has become kinetics.', on: function () { st.value = 40; place(); } }
    ]);
    place();
  });

  /* f11-42: how many elements? the chi-square always falls, the residuals say when to stop, and the third arc is a fiction */
  register('f11-42', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), kb = fig.querySelectorAll('button[data-k]'), K = 1;
    var m = P.m11, TRUTH = [0.02, 0.004, 2.0, 0.9, 0.010, 40, 0.85];
    var seed = 5; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; }
    var Z = EF_W.map(function (w) { var z = m.chainZ(TRUTH, w), a = m.abs(z); return { re: z.re + 0.004 * a * rnd(), im: z.im + 0.004 * a * rnd() }; });
    var FITS = {};
    function fit(k) {
      if (FITS[k]) return FITS[k];
      var p0 = [0.02], e = [false]; for (var i = 0; i < k; i++) { p0.push(0.005, Math.pow(10, i * 1.5), 0.9); e.push(false, false, true); }
      return (FITS[k] = m.cnls(EF_W, Z, m.chainZ, p0, e, 80));
    }
    var b = { x0: 58, y0: 136, x1: 300, y1: 36 }, rb = { x0: 58, y0: 258, x1: 300, y1: 198 }, gn = el('g', {}, g), gr = el('g', {}, g), gt = el('g', {}, g);
    badge(g, 120, 50, 1); badge(g, 120, 212, 2); badge(g, 330, 250, 3);
    function place() {
      Array.prototype.forEach.call(kb, function (bt) { bt.setAttribute('aria-pressed', String(+bt.getAttribute('data-k') === K)); });
      var f = fit(K); clear(gn); clear(gr); clear(gt);
      var nf = nyqFrame(gn, b, 38, { xt: [[0, '0'], [10, '10'], [20, '20'], [30, '30']], yt: [[0, '0'], [5, '5']], xl: 'Z′, mΩ', yl: '−Z″, mΩ' });
      Z.forEach(function (z, i) { if (i % 2 === 0) el('circle', { cx: nf.X(z.re * 1e3), cy: nf.Y(-z.im * 1e3), r: 2.2, fill: 'var(--muted)' }, gn); });
      var zf = EF_W.map(function (w) { return m.chainZ(f.p, w); });
      el('path', { d: cvPath(zf.map(function (z) { return z.re * 1e3; }), zf.map(function (z) { return -z.im * 1e3; }), nf.X, nf.Y), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, gn);
      // residuals against frequency
      var fr = cvFrame(gr, rb, [-2, 5], [-6, 6], { xt: [[-2, '0.01'], [0, '1'], [2, '100'], [4, '10⁴']], yt: [[-5, '−5'], [0, '0'], [5, '5']], zero: true, yl: 'residual, % of |Z|' }); txt(gr, rb.x1, rb.y1 + 10, 'f, Hz', '', 'end', { style: 'font-size:10px' });
      f.res.forEach(function (r, i) { var x = Math.log10(EF_W[i] / (2 * Math.PI)); el('circle', { cx: fr.X(x), cy: fr.Y(Math.max(-6, Math.min(6, r[0] * 100))), r: 1.8, fill: 'var(--accent)' }, gr); el('circle', { cx: fr.X(x), cy: fr.Y(Math.max(-6, Math.min(6, r[1] * 100))), r: 1.8, fill: 'var(--heat)' }, gr); });
      // the table of fitted values
      var rows = [['R₀', (f.p[0] * 1e3).toFixed(2) + ' mΩ']]; for (var k = 1; k < f.p.length; k += 3) rows.push(['arc ' + ((k - 1) / 3 + 1), (f.p[k] * 1e3).toFixed(2) + ' mΩ, n = ' + f.p[k + 2].toFixed(2)]);
      rows.push(['χ²', f.chi2.toExponential(1)]);
      txt(gt, 340, 50, K + (K === 1 ? ' arc' : ' arcs') + ' fitted', 'strong', 'start');
      rows.forEach(function (r, i) { txt(gt, 340, 74 + i * 20, r[0], '', 'start', { style: 'font-size:11px' }); txt(gt, 500, 74 + i * 20, r[1], i === rows.length - 1 ? 'strong' : '', 'end', { style: 'font-size:11px' }); });
      txt(gt, 340, 220, 'true: 20; 4.0 (n 0.90); 10.0 (n 0.85) mΩ', '', 'start', { style: 'font-size:10px' });
      read.innerHTML = (K === 1 ? 'One arc cannot follow two: the fit misses the data systematically, and the residuals swing above and below zero in a pattern along the frequency axis. χ² is large.' : K === 2 ? 'Two arcs: the residuals are a scatter of about the noise, ±0.4 %, with no pattern, and the fitted values return the ones the data were made with. This is where to stop.' : 'Three arcs: χ² falls a little or not at all, because adding elements can only improve a fit, but the third arc has no process behind it: ' + (f.p[7] < 5e-4 ? 'here it has collapsed to ' + (f.p[7] * 1e3).toFixed(2) + ' mΩ, nothing' : 'here it has taken ' + (f.p[7] * 1e3).toFixed(2) + ' mΩ from the second arc') + ', and from another starting guess it would take another share. The residuals look no better than with two.') + ' Fitted by complex nonlinear least squares with modulus weighting, each residual divided by |Z| of its point.';
    }
    Array.prototype.forEach.call(kb, function (bt) { on(bt, 'click', function () { K = +bt.getAttribute('data-k'); place(); }); });
    steps(fig, [
      { text: 'The data are two depressed arcs with 0.4 % noise. Fit <b>one</b> arc and the residuals, the differences between fit and data, show a pattern: the model is too small.', on: function () { K = 1; place(); } },
      { text: 'Fit <b>two</b> and the residuals become noise. A residual plot, not the look of the Nyquist curve, is the judge of a fit.', on: function () { K = 2; place(); } },
      { text: 'Fit <b>three</b> and χ² still falls, as it always will, but the extra arc is a fiction the data cannot refute. Stop at the smallest circuit whose residuals are noise and whose elements each stand for a process.', on: function () { K = 3; place(); } }
    ]);
    place();
  });
