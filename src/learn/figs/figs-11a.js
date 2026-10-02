  /* =================================================================
     Module 11, analysis (11.15 to 11.17): two different circuits with
     the same impedance (Lazanas and Prodromidis 2023, R63, sec. 8 and
     Fig. 7; Meddings et al. 2020, R64, sec. 3.2.2); the distribution of
     relaxation times and its regularisation (R64 eq 5 and sec. 3.2.1;
     Bakenhaster and Dewald 2025, R65, eqs 9 and 10 and sec. 4.3); and
     ageing check-ups, features and machine learning (R64 secs 1 and
     3.3.2; R65 sec. 4.2, Fig. 10). Physics in Physics.m11.
     ================================================================= */

  /* ===== 11.15 The same curve from different circuits ===== */
  register('f11-15', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.r2v'), sv = fig.querySelector('.r2v-val');
    var R0 = 0.020, R1 = 0.004, C1 = 0.25, C2 = 2, fs = M11.freqs(5000, 0.05, 12);
    txt(g, 20, 20, 'circuit 1: two arcs in series', 'amber', 'start'); txt(g, 290, 20, 'circuit 2: a nested ladder', 'cyan', 'start');
    var gc = el('g', {}, g);
    function wire(d) { el('path', { d: d, fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 1.4 }, gc); }
    function box(x, y, w, lab, val) { e11box(gc, x, y, w, lab, 'strong'); txt(gc, x + w / 2, y + 24, val, '', 'middle'); }
    var b = { x0: 60, y0: 330, x1: 470, y1: 150 }, F = e11nyq(g, b, [18, 38], 0, { xt: [[20, '20'], [25, '25'], [30, '30'], [35, '35 mΩ']], yt: [[0, '0'], [5, '5']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var p1 = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 3 }, g), dots = el('g', {}, g);
    badge(g, 250, 30, 1); badge(g, 506, 30, 2); badge(g, F.X(33), F.Y(6), 3);
    function render() {
      var R2 = +sl.value / 1000, L = M11.voigtToLadder(R1, C1, R2, C2); setSvgText(sv, (R2 * 1000).toFixed(0) + ' mΩ');
      clear(gc); clear(dots);
      // circuit 1: R0 - (R1||C1) - (R2||C2), shown as boxes with values
      wire('M14,64 H250'); box(20, 64, 50, 'R₀', e11mOhm(R0, 0)); box(86, 64, 74, 'R₁ ‖ C₁', e11mOhm(R1, 0) + ', ' + C1 + ' F'); box(176, 64, 74, 'R₂ ‖ C₂', e11mOhm(R2, 0) + ', ' + C2 + ' F');
      // circuit 2: R0 - [Ca || (Ra - (Rb||Cb))]
      wire('M284,64 H340 M340,44 V100 M340,44 H360 M420,44 H496 M340,100 H356 M410,100 H420 M496,100 H506 M496,44 V100 M506,64 V100');
      box(290, 64, 46, 'R₀', e11mOhm(R0, 0)); box(360, 44, 60, 'C_a', L.Ca.toFixed(2) + ' F');
      box(356, 100, 54, 'R_a', e11mOhm(L.Ra, 1)); box(420, 100, 76, 'R_b ‖ C_b', e11mOhm(L.Rb, 1) + ', ' + L.Cb.toFixed(2) + ' F');
      var z1 = fs.map(function (f) { return M11.voigtWZ({ R0: R0, R1: R1, C1: C1, R2: R2, C2: C2, sigma: 0 }, 2 * Math.PI * f); }), z2 = fs.map(function (f) { return M11.ladderZ(R0, L, 2 * Math.PI * f); });
      p1.setAttribute('d', e11zpath(z1, F, b, 1000));
      z2.forEach(function (z, i) { if (i % 2) return; el('circle', { cx: F.X(z.re * 1000), cy: F.Y(-z.im * 1000), r: 3.4, fill: 'var(--bg)', stroke: 'var(--cyan)', 'stroke-width': 1.8 }, dots); });
      var dmax = Math.max.apply(null, z1.map(function (z, i) { return M11.abs(M11.add(z, M11.scale(z2[i], -1))) / M11.abs(z); }));
      read.innerHTML = 'Largest difference between the two circuits over 5 kHz to 50 mHz: <b>' + (dmax < 1e-12 ? 'below 10⁻¹²' : sci(dmax, 1)) + '</b> of |Z|, rounding error only. Circuit 1 says R₁ + R₂ = ' + e11mOhm(R1 + R2) + ' of interface resistance in two separate films; circuit 2 says R<sub>a</sub> + R<sub>b</sub> = ' + e11mOhm(L.Ra + L.Rb) + ', arranged quite differently.';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'Circuit 1 is the usual reading of two arcs: the ohmic resistance, then two R‖C pairs in series, for example the SEI and charge transfer.' },
      { text: 'Circuit 2 nests the elements in a ladder: a capacitor in parallel with everything after it, as some authors draw the SEI around the charge-transfer step. With the values shown, its impedance equals circuit 1 at every frequency. Change R₂ and the ladder values follow.' },
      { text: 'The orange line is circuit 1, the open circles circuit 2: one curve. A fit that looks perfect therefore cannot choose between them; the choice has to come from what is known about the cell. Keep the circuit as simple as the physics allows, and remember that every extra element improves the fit.' }
    ]);
    render();
  });

  /* ===== 11.16 Distribution of relaxation times ===== */
  register('f11-16', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.lam'), sv = fig.querySelector('.lam-val');
    var fs = M11.freqs(1e4, 0.1, 8), arcs = [{ R: 0.004, Q: 0.25, n: 0.9 }, { R: 0.010, Q: 2, n: 0.85 }];
    var rn = (function (s) { return function () { var x = 0; for (var j = 0; j < 6; j++) { s = (s * 1664525 + 1013904223) % 4294967296; x += s / 4294967296; } return (x - 3) / Math.sqrt(0.5); }; })(3);
    var Z = fs.map(function (f) { var w = 2 * Math.PI * f, z = M11.add(M11.zR(0.020), M11.zRQ(arcs[0].R, arcs[0].Q, arcs[0].n, w), M11.zRQ(arcs[1].R, arcs[1].Q, arcs[1].n, w)), m = M11.abs(z); return { re: z.re + 0.002 * m * rn(), im: z.im + 0.002 * m * rn() }; });
    var taus = [], NT = 60; for (var k = 0; k <= NT; k++) taus.push(Math.pow(10, -6 + 7 * k / NT));
    var dln = 7 / NT * Math.LN10;
    // exact distribution of an R || CPE arc (Cole-Cole form; this page's working): gamma(ln tau)
    function gExact(t) { return arcs.reduce(function (s, a) { var t0 = Math.pow(a.R * a.Q, 1 / a.n), u = a.n * Math.log(t / t0), p = (1 - a.n) * Math.PI; return s + a.R / (2 * Math.PI) * Math.sin(p) / (Math.cosh(u) - Math.cos(p)); }, 0); }
    // top: Nyquist
    var b = { x0: 60, y0: 170, x1: 300, y1: 30 }, F = e11nyq(g, b, [18, 38], -1, { xt: [[20, '20'], [25, '25'], [30, '30'], [35, '35']], yt: [[0, '0'], [5, '5']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    Z.forEach(function (z) { el('circle', { cx: F.X(z.re * 1000), cy: F.Y(-z.im * 1000), r: 2.8, fill: 'var(--amber)' }, g); });
    var pf = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.8 }, g);
    txt(g, 330, 50, 'the spectrum: two arcs', 'strong', 'start'); txt(g, 330, 68, 'that overlap; 0.2 % noise', '', 'start');
    // bottom: gamma against tau
    var d = { x0: 60, y0: 380, x1: 490, y1: 230 }, XT = function (t) { return e11log(t, -6, 1, d.x0, d.x1); }, ymax = 0.012, YG = function (v) { return d.y0 - v / ymax * (d.y0 - d.y1); };
    [[1e-5, 6e-5], [2e-4, 1e-2], [1e-2, 0.4]].forEach(function (s, i) { el('rect', { x: XT(s[0]), y: d.y1, width: XT(s[1]) - XT(s[0]), height: d.y0 - d.y1, fill: ['var(--cyan)', '#C4B5F7', 'var(--amber)'][i], 'fill-opacity': '.07' }, g); });
    txt(g, XT(2.4e-5), d.y1 + 14, 'bulk', '', 'middle'); txt(g, XT(1.4e-3), d.y1 + 14, 'SEI, surface', '', 'middle'); txt(g, XT(0.063), d.y1 + 14, 'charge transfer', '', 'middle');
    e11axes(g, d, { X: XT, Y: YG, xt: [[1e-6, '1 µs'], [1e-4, '0.1 ms'], [1e-2, '10 ms'], [1, '1 s'], [10, '10 s']], yt: [[0, ''], [0.005, '5'], [0.01, '10']], xlab: 'relaxation time τ (log)', ylab: 'γ(τ), mΩ per unit of ln τ' });
    var ex = []; for (k = 0; k <= 200; k++) { var t = Math.pow(10, -6 + 7 * k / 200); ex.push([XT(t), YG(gExact(t))]); }
    el('path', { d: e11d(ex), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g);
    var pg = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.6 }, g), pk = el('g', {}, g);
    badge(g, b.x1 - 14, b.y1 + 14, 1); badge(g, d.x1 - 12, d.y1 + 34, 2);
    function lamT(l) { return l >= 1 ? l.toFixed(0) : l >= 0.1 ? l.toFixed(l >= 0.3 ? 1 : 2).replace(/0+$/, '') : sci(l, 0).replace(/^1 × /, ''); }
    function render() {
      var lam = Math.pow(10, +sl.value); setSvgText(sv, lamT(lam));
      var res = M11.drt(fs, Z, taus, lam), dens = res.x.map(function (x) { return x / dln; });
      pf.setAttribute('d', e11zpath(res.fit, F, b, 1000));
      pg.setAttribute('d', e11d(taus.map(function (t, i) { return [XT(t), Math.max(d.y1 - 4, YG(dens[i]))]; })));
      clear(pk);
      var mx = Math.max.apply(null, dens), peaks = [];
      for (var i = 1; i < dens.length - 1; i++) if (dens[i] > dens[i - 1] && dens[i] >= dens[i + 1] && dens[i] > 0.05 * mx) peaks.push(i);
      peaks.forEach(function (i) { var x = XT(taus[i]), y = Math.max(d.y1 + 26, YG(dens[i])); el('line', { x1: x, x2: x, y1: y, y2: y - 8, stroke: 'var(--amber)' }, pk); txt(pk, x, y - 12, e11time(taus[i]), 'amber', 'middle'); });
      var verdict = peaks.length === 2 ? 'two peaks, one per process: about right' : peaks.length > 2 ? peaks.length + ' peaks: the extra ones come from noise, not from the cell' : 'one broad hump: the two processes have been smoothed into one';
      read.innerHTML = 'λ = <b>' + lamT(lam) + '</b>: ' + verdict + '. The dashed line is the exact distribution of the two depressed arcs used to make the data; the arcs peak at τ = ' + e11time(Math.pow(arcs[0].R * arcs[0].Q, 1 / arcs[0].n)) + ' and ' + e11time(Math.pow(arcs[1].R * arcs[1].Q, 1 / arcs[1].n)) + '.';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'A parallel R‖C pair relaxes with one time constant τ = RC. Any spectrum can be written as a distribution of such pairs, Z = R₀ + R<sub>pol</sub>∫g(τ)/(1 + jωτ) dτ. The distribution of relaxation times, the DRT, recovers g(τ): each process becomes a peak at its own τ, even when the arcs overlap in the Nyquist plot.' },
      { text: 'Recovering g(τ) from noisy data is unstable, so it needs <b>regularisation</b>, a penalty of strength λ on large, spiky solutions. Slide λ down: noise turns into extra peaks. Slide it up: the two real peaks melt into one. Only a narrow range is right, and the number of peaks depends on it. DRT also needs excellent data: test it first (figure 11.14), and leave out the inductive and diffusion parts, which distort it.' }
    ]);
    render();
  });

  /* ===== 11.17 Following a cell as it ages ===== */
  register('f11-17', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.cyc'), sv = fig.querySelector('.cyc-val');
    var C = M11.CELL, fs = M11.freqs(2000, 0.5, 10);
    function cellAt(n) { var u = n / 400; return { L: C.L, R0: C.R0 * (1 + 0.15 * u), Rsei: C.Rsei * (1 + 1.2 * u), Qsei: C.Qsei, nsei: C.nsei, Rct: C.Rct * (1 + 1.0 * u), Cdl: C.Cdl, Rd: C.Rd, Cd: C.Cd }; }
    function soh(n) { var u = n / 400; return 100 - 6 * u - 3 * u * u; }
    var b = { x0: 50, y0: 216, x1: 270, y1: 40 }, F = e11nyq(g, b, [18, 52], -3, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[0, '0'], [10, '10']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    [0, 100, 200, 300, 400].forEach(function (n) { el('path', { d: e11zpath(fs.map(function (f) { return M11.cellZ(cellAt(n), 2 * Math.PI * f); }), F, b, 1000), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1, 'stroke-opacity': '.25' }, g); });
    var cur = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.6 }, g);
    var r = { x0: 340, y0: 110, x1: 505, y1: 40 }, c = { x0: 340, y0: 216, x1: 505, y1: 146 }, XC = function (n) { return r.x0 + n / 400 * (r.x1 - r.x0); };
    var YR = function (v) { return r.y0 - v / 0.035 * (r.y0 - r.y1); }, YS = function (s) { return c.y0 - (s - 90) / 10 * (c.y0 - c.y1); };
    e11axes(g, r, { X: XC, Y: YR, yt: [[0, '0'], [0.03, '30']], grid: true, ylab: 'fitted, mΩ' });
    e11axes(g, c, { X: XC, Y: YS, xt: [[0, '0'], [200, '200'], [400, '400']], yt: [[90, '90'], [100, '100']], grid: true, xlab: 'cycles', ylab: 'capacity, % of new' });
    var pts0 = [], pts1 = [], pts2 = []; for (var n = 0; n <= 400; n += 10) { var p = cellAt(n); pts0.push([XC(n), YR(p.R0)]); pts1.push([XC(n), YR(p.Rsei + p.Rct)]); pts2.push([XC(n), YS(soh(n))]); }
    el('path', { d: e11d(pts0), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.4, 'stroke-opacity': '.45' }, g); el('path', { d: e11d(pts1), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.4, 'stroke-opacity': '.45' }, g); el('path', { d: e11d(pts2), fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.4, 'stroke-opacity': '.45' }, g);
    txt(g, r.x0 + 4, YR(C.R0) - 6, 'R₀', 'cyan', 'start'); txt(g, r.x0 + 4, YR(C.Rsei + C.Rct) + 16, 'R_SEI + R_ct', 'amber', 'start');
    var m0 = el('circle', { r: 4, fill: 'var(--cyan)' }, g), m1 = el('circle', { r: 4, fill: 'var(--amber)' }, g), m2 = el('circle', { r: 4, fill: 'var(--heat)' }, g);
    // the machine-learning workflow (Bakenhaster and Dewald Fig. 10, after their ref. 81)
    var flow = ['impedance check-ups', 'extract features', 'split: train / test', 'train the model', 'predict SOC or SOH', 'check the errors'], fx = [20, 190, 360], boxes = [];
    flow.forEach(function (s, i) { var x = fx[i % 3], y = i < 3 ? 298 : 358; boxes.push(el('rect', { x: x, y: y - 16, width: 150, height: 30, rx: 5, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g)); txt(g, x + 75, y + 4, s, 'strong', 'middle'); if (i % 3 < 2) arrow(g, x + 152, y - 1, x + 168, y - 1, '#8a9aa0', 1.4); });
    el('path', { d: 'M470,314 V330 H95 V340', fill: 'none', stroke: '#8a9aa0', 'stroke-width': 1.4 }, g);
    txt(g, 20, 270, 'the data-driven route', 'strong', 'start');
    badge(g, b.x0 + 24, b.y1 + 10, 1); badge(g, r.x1 - 10, r.y1 + 8, 2); badge(g, 500, 268, 3);
    var cyc = 0;
    function place() {
      var p = cellAt(cyc); setSvgText(sv, Math.round(cyc) + '');
      cur.setAttribute('d', e11zpath(fs.map(function (f) { return M11.cellZ(p, 2 * Math.PI * f); }), F, b, 1000));
      m0.setAttribute('cx', XC(cyc)); m0.setAttribute('cy', YR(p.R0)); m1.setAttribute('cx', XC(cyc)); m1.setAttribute('cy', YR(p.Rsei + p.Rct)); m2.setAttribute('cx', XC(cyc)); m2.setAttribute('cy', YS(soh(cyc)));
      read.innerHTML = 'After <b>' + Math.round(cyc) + ' cycles</b> (illustrative numbers): R₀ = ' + e11mOhm(p.R0) + ' (+' + ((p.R0 / C.R0 - 1) * 100).toFixed(0) + ' %), R<sub>SEI</sub> + R<sub>ct</sub> = ' + e11mOhm(p.Rsei + p.Rct) + ' (+' + (((p.Rsei + p.Rct) / (C.Rsei + C.Rct) - 1) * 100).toFixed(0) + ' %), capacity ' + soh(cyc).toFixed(1) + ' % of new.' + (cyc >= 50 ? ' The interface part grows much faster than the ohmic part.' : '');
    }
    on(sl, 'input', function () { cyc = +sl.value; place(); });
    steps(fig, [
      { text: 'A <b>check-up</b> repeats the same measurement at fixed conditions, for example a spectrum at 50 % state of charge and 25 °C after a rest, every so many cycles: often enough to follow the ageing, rarely enough not to add to it. As the cell ages the impedance generally grows; here, as in many published cells, the arcs grow faster than the ohmic intercept moves.' },
      { text: 'A whole spectrum is many numbers; ageing studies reduce it to a few <b>features</b>: fitted resistances, DRT peaks, or the impedance at chosen frequencies. Individual contributions may track health, and warn of rapid fade, better than the total impedance does. Capacity is measured separately, by a full cycle.' },
      { text: '<b>Machine learning</b> learns the link between features and state of health or charge from many cells, then predicts it for a new one. Gaussian process regression is common; models based on relaxation times have reached errors near 1 %. The catch: they know only the chemistries and conditions in their training data, and temperature, state of charge and ageing all move the same spectrum.' }
    ]);
    place();
    var loop = anim(fig, function (dt) { if (dt === 0) return; cyc += dt * 60; if (cyc > 400) cyc = 0; sl.value = cyc; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });
