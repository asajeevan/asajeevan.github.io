  /* ===================== Lab 2, continued: extracting the parameters (figures f11-43 to f11-46) ===================== */
  /* f11-43: everything that can be read off one voltammogram, with the baselines that the readings need */
  register('f11-43', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sc = fig.querySelector('.xc'), scv = fig.querySelector('.xc-val'), sr = fig.querySelector('.xr'), srv = fig.querySelector('.xr-val');
    var v = 0.1, b = { x0: 58, y0: 236, x1: 330, y1: 34 }, gp = el('g', {}, g), gt = el('g', {}, g), sel = 0;
    badge(g, 300, 60, 1); badge(g, 112, 46, 3);
    function place() {
      var Cdl = +sc.value * 1e-6, Ru = +sr.value; setSvgText(scv, sc.value + ' µF/cm²'); setSvgText(srv, Ru + ' Ω');
      var o = cvRun({ v: v, Cdl: Cdl, Ru: Ru, steps: 500 }), n = o.E.length, half = n / 2, I = o.i.map(uA);
      clear(gp); clear(gt);
      var imax = Math.max.apply(null, I) * 1.15, imin = Math.min.apply(null, I) * 1.15, yt = [];
      for (var yv = Math.ceil(imin / 10) * 10; yv <= imax; yv += 10) yt.push([yv, (yv < 0 ? '−' : '') + Math.abs(yv)]);
      var fr = cvFrame(gp, b, [-0.3, 0.3], [imin, imax], { xt: [[-0.3, '−0.3'], [-0.15, '−0.15'], [0, '0'], [0.15, '+0.15'], [0.3, '+0.3']], yt: yt, zero: true, xl: 'E − E°′, V', yl: 'i, µA' });
      el('path', { d: cvPath(o.E, I, fr.X, fr.Y), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }, gp);
      // 1. the forward baseline: a line fitted to the flat foot of the forward sweep, extrapolated under the peak
      var kA = 0, kC = half; for (var k = 0; k < half; k++) if (I[k] > I[kA]) kA = k; for (k = half; k < n; k++) if (I[k] < I[kC]) kC = k;
      function foot(from, to) { var sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0; for (var j = from; j < to; j++) { sx += o.E[j]; sy += I[j]; sxx += o.E[j] * o.E[j]; sxy += o.E[j] * I[j]; m++; } var sl = (m * sxy - sx * sy) / (m * sxx - sx * sx); return { a: sl, c: (sy - sl * sx) / m }; }
      var fA = foot(Math.round(half * 0.08), Math.round(half * 0.3)), fC = foot(half + Math.round(half * 0.08), half + Math.round(half * 0.3));
      var baseA = fA.a * o.E[kA] + fA.c, baseC = fC.a * o.E[kC] + fC.c;
      el('line', { x1: fr.X(o.E[Math.round(half * 0.08)]), y1: fr.Y(fA.a * o.E[Math.round(half * 0.08)] + fA.c), x2: fr.X(o.E[kA] + 0.08), y2: fr.Y(fA.a * (o.E[kA] + 0.08) + fA.c), stroke: 'var(--muted)', 'stroke-dasharray': '4 3' }, gp);
      el('line', { x1: fr.X(o.E[half + Math.round(half * 0.08)]), y1: fr.Y(fC.a * o.E[half + Math.round(half * 0.08)] + fC.c), x2: fr.X(o.E[kC] - 0.08), y2: fr.Y(fC.a * (o.E[kC] - 0.08) + fC.c), stroke: 'var(--muted)', 'stroke-dasharray': '4 3' }, gp);
      el('line', { x1: fr.X(o.E[kA]), y1: fr.Y(baseA), x2: fr.X(o.E[kA]), y2: fr.Y(I[kA]), stroke: 'var(--heat)', 'stroke-width': 2 }, gp);
      el('line', { x1: fr.X(o.E[kC]), y1: fr.Y(baseC), x2: fr.X(o.E[kC]), y2: fr.Y(I[kC]), stroke: 'var(--heat)', 'stroke-width': 2 }, gp);
      el('circle', { cx: fr.X(o.E[kA]), cy: fr.Y(I[kA]), r: 4, fill: 'var(--heat)' }, gp); el('circle', { cx: fr.X(o.E[kC]), cy: fr.Y(I[kC]), r: 4, fill: 'var(--heat)' }, gp);
      txt(gp, fr.X(o.E[kA]) + 6, fr.Y(I[kA]) - 6, 'E_{pa}, i_{pa}', 'heat', 'start', { style: 'font-size:10px' }); txt(gp, fr.X(o.E[kC]) - 6, fr.Y(I[kC]) + 14, 'E_{pc}, i_{pc}', 'heat', 'end', { style: 'font-size:10px' });
      // 2. the charge under the forward peak above its baseline
      var dq = '', Q = 0; for (k = Math.round(half * 0.3); k < half; k++) { var base = fA.a * o.E[k] + fA.c; if (I[k] > base) { Q += (I[k] - base) * (o.t[k] - o.t[k - 1]); dq += (dq ? 'L' : 'M') + fr.X(o.E[k]).toFixed(1) + ',' + fr.Y(I[k]).toFixed(1); } }
      for (k = half - 1; k >= Math.round(half * 0.3); k--) { var bb = fA.a * o.E[k] + fA.c; if (I[k] > bb) dq += 'L' + fr.X(o.E[k]).toFixed(1) + ',' + fr.Y(bb).toFixed(1); }
      if (dq) el('path', { d: dq + 'Z', fill: 'var(--accent)', 'fill-opacity': .12, stroke: 'none' }, gp);
      var k15 = Math.round(half * 0.75); badge(gp, fr.X(o.E[k15]), (fr.Y(I[k15]) + fr.Y(fA.a * o.E[k15] + fA.c)) / 2, 2);
      // 3. the double-layer band at the start, where nothing reacts
      var i0a = I[Math.round(half * 0.12)];
      el('rect', { x: fr.X(-0.3), y: fr.Y(Math.max(i0a, 0)), width: fr.X(-0.2) - fr.X(-0.3), height: Math.max(1.5, Math.abs(fr.Y(0) - fr.Y(i0a))), fill: 'var(--second)', 'fill-opacity': .3 }, gp);
      var ipa = I[kA] - baseA, ipc = baseC - I[kC], dEp = (o.E[kA] - o.E[kC]) * 1000, Eh = (o.E[kA] + o.E[kC]) / 2, Cmeas = i0a / (v * 1e6) / CV_A * 1e6;   // µA / (V/s) → F, per cm2, in µF
      var rows = [['E_{pa}', (o.E[kA] * 1000).toFixed(0) + ' mV'], ['E_{pc}', (o.E[kC] * 1000).toFixed(0) + ' mV'], ['ΔE_{p}', dEp.toFixed(0) + ' mV'], ['E_{½}', (Eh * 1000).toFixed(0) + ' mV'], ['i_{pa} (from baseline)', ipa.toFixed(1) + ' µA'], ['i_{pc}', ipc.toFixed(1) + ' µA'], ['i_{pc}/i_{pa}', (ipc / ipa).toFixed(2)], ['Q under the peak', (Q * 1e-6 * 1e6).toFixed(2) + ' µC'], ['C_{dl} from the foot', Cmeas.toFixed(0) + ' µF/cm²']];
      rows.forEach(function (r, i) { txt(gt, 352, 70 + i * 19, r[0], '', 'start', { style: 'font-size:10.5px' }); txt(gt, 506, 70 + i * 19, r[1], 'strong', 'end', { style: 'font-size:10.5px' }); });
      txt(gt, 352, 50, 'read off this curve', 'tag', 'start', { style: 'font-size:10px' });
      read.innerHTML = 'At ' + (v * 1000) + ' mV/s with ' + sc.value + ' µF/cm² and ' + Ru + ' Ω: the peaks are ' + dEp.toFixed(0) + ' mV apart' + (dEp > 65 ? ', more than the 57 mV of a reversible couple, which here is the i R drop, not slow kinetics' : ', as a reversible couple should be') + '; E½ = ' + (Eh * 1000).toFixed(0) + ' mV estimates E°′' + (Ru > 0 ? ' and is hardly moved by the resistance, because the two peaks shift in opposite directions' : '') + '. The peak currents are measured from the extrapolated <b>foot</b> of each sweep, not from zero: read from zero, i<sub>pa</sub> would be ' + I[kA].toFixed(1) + ' µA. The double-layer capacitance read from the flat foot of the forward sweep, where nothing reacts yet, i/(v A), returns ' + Cmeas.toFixed(0) + ' µF/cm² against the ' + sc.value + ' put in.';
    }
    on(sc, 'input', place); on(sr, 'input', place);
    steps(fig, [
      { text: 'The <b>peak potentials</b> and currents, the peak separation and the midpoint E½. The currents are measured from a <b>baseline</b>: the flat foot of each sweep, fitted and extrapolated under the peak (dashed).', on: function () { sc.value = 20; sr.value = 0; place(); } },
      { text: 'The <b>charge</b> under a peak, the shaded area divided by the scan rate, is the capacity of that reaction; for a battery electrode, divided by the active mass, it is its mAh/g at that rate.', on: function () { sc.value = 20; sr.value = 0; place(); } },
      { text: 'The <b>double-layer capacitance</b> is read where nothing reacts yet: the flat current at the foot of the forward sweep, divided by the scan rate and the area. On a porous battery electrode it can be a sizeable share of the whole current. And a separation above 57 mV with a <b>resistance</b> in the cell is the i R drop, which the next figure removes.', on: function () { sc.value = 1000; sr.value = 300; place(); } }
    ]);
    place();
  });

  /* f11-44: de-polarization: the peak potential against the peak current across scan rates is a line whose slope is the ohmic resistance (Pu et al. 2021) */
  register('f11-44', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sr = fig.querySelector('.dr'), srv = fig.querySelector('.dr-val'), mb = fig.querySelectorAll('button[data-view]'), view = 'raw';
    var VS = [0.02, 0.05, 0.1, 0.2, 0.5], COL = ['#9DB4F0', '#7C9BEB', '#5A80E3', '#3A66D8', '#1F48D6'];
    var b = { x0: 58, y0: 236, x1: 300, y1: 34 }, pb = { x0: 358, y0: 236, x1: 506, y1: 34 }, gp = el('g', {}, g), gq = el('g', {}, g);
    badge(g, 120, 60, 1); badge(g, 488, 206, 2); badge(g, 270, 200, 3);
    function place() {
      var Ru = +sr.value; setSvgText(srv, Ru + ' Ω');
      Array.prototype.forEach.call(mb, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-view') === view)); });
      clear(gp); clear(gq);
      var runs = VS.map(function (vv) { var o = P.cv.simulate({ Ei: -0.35, Es: 0.35, E0: 0, D: CV_D, C: 5 * CV_C, A: CV_A, v: vv, Ru: Ru, steps: 500 }); var p = P.cv.peaks(o); return { o: o, p: p, v: vv }; });
      // the fit: Epa against ipa and Epc against ipc, two lines whose common slope is R
      function fitLine(xs, ys) { var n2 = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0; for (var k = 0; k < n2; k++) { sx += xs[k]; sy += ys[k]; sxx += xs[k] * xs[k]; sxy += xs[k] * ys[k]; } var sl = (n2 * sxy - sx * sy) / (n2 * sxx - sx * sx); return { a: sl, c: (sy - sl * sx) / n2 }; }
      var fa = fitLine(runs.map(function (r) { return r.p.ipa; }), runs.map(function (r) { return r.p.Epa; })), fc = fitLine(runs.map(function (r) { return r.p.ipc; }), runs.map(function (r) { return r.p.Epc; }));
      var Rfit = (fa.a + fc.a) / 2;
      var imax = Math.max.apply(null, runs.map(function (r) { return r.p.ipa; })) * 1e6 * 1.15;
      var fr = cvFrame(gp, b, [-0.35, 0.35], [-imax * 0.9, imax], { xt: [[-0.3, '−0.3'], [0, '0'], [0.3, '+0.3']], yt: [[-200, '−200'], [0, '0'], [200, '200']].filter(function (t) { return Math.abs(t[0]) < imax; }), zero: true, xl: view === 'raw' ? 'E applied − E°′, V' : 'E − i R_{fit} − E°′, V', yl: 'i, µA' });
      runs.forEach(function (r, k) { var Es = view === 'raw' ? r.o.E : r.o.E.map(function (e, j) { return e - r.o.i[j] * Rfit; }); el('path', { d: cvPath(Es, r.o.i.map(uA), fr.X, fr.Y), fill: 'none', stroke: COL[k], 'stroke-width': 1.8 }, gp); });
      VS.forEach(function (vv, k) { txt(gp, b.x0 + 8, b.y1 + 12 + k * 13, (vv * 1000) + ' mV/s', '', 'start', { style: 'font-size:10px;fill:' + COL[k] }); });
      // right: Ep against ip
      var ir = imax / 1e6;
      var pf = cvFrame(gq, pb, [-ir, ir], [-0.25, 0.25], { xt: [[-ir * 0.8, '−' + (ir * 0.8e6).toFixed(0)], [0, '0'], [ir * 0.8, (ir * 0.8e6).toFixed(0)]], yt: [[-0.2, '−0.2'], [0, '0'], [0.2, '+0.2']], zero: true, xl: 'i_{p}, µA', yl: 'E_{p} − E°′, V' });
      [[fa, 1], [fc, -1]].forEach(function (q) { el('line', { x1: pf.X(0), y1: pf.Y(q[0].c), x2: pf.X(q[1] * ir), y2: pf.Y(q[0].a * q[1] * ir + q[0].c), stroke: 'var(--muted)', 'stroke-dasharray': '4 3' }, gq); });
      runs.forEach(function (r, k) { el('circle', { cx: pf.X(r.p.ipa), cy: pf.Y(r.p.Epa), r: 4.5, fill: COL[k], stroke: '#fff' }, gq); el('circle', { cx: pf.X(r.p.ipc), cy: pf.Y(r.p.Epc), r: 4.5, fill: COL[k], stroke: '#fff' }, gq); });
      txt(gq, pb.x0 + 6, pb.y1 + 12, 'slope ' + Rfit.toFixed(0) + ' Ω; cell ' + Ru + ' Ω', 'strong', 'start', { style: 'font-size:11px' });
      txt(gq, pb.x0 + 6, pb.y1 + 26, 'intercepts ' + (fa.c * 1000).toFixed(0) + ' and ' + (fc.c * 1000).toFixed(0) + ' mV', '', 'start', { style: 'font-size:10px' });
      var corr = runs.map(function (r) { var Es = r.o.E.map(function (e, j) { return e - r.o.i[j] * Rfit; }); var ka = r.o.i.indexOf(r.p.ipa), kc = r.o.i.indexOf(r.p.ipc); return (Es[ka] - Es[kc]) * 1000; });
      read.innerHTML = 'With ' + Ru + ' Ω in the cell, the five peak potentials plotted against their peak currents fall on two parallel lines; their common slope returns <b>R<sub>fit</sub> = ' + Rfit.toFixed(0) + ' Ω</b>' + (Ru > 0 ? ' against the ' + Ru + ' Ω put in: for a diffusion-controlled couple in solution the drop also slows the sweep the electrode feels around the peak, so the peaks shift by more than i<sub>p</sub> R and the slope is an upper estimate of the ohmic resistance (on their battery electrodes, Pu et al. found the part the slope did not explain below 7 %)' : '') + '. The intercepts, ' + (fa.c * 1000).toFixed(0) + ' and ' + (fc.c * 1000).toFixed(0) + ' mV, are the peak potentials the couple would have at zero current, ' + ((fa.c - fc.c) * 1000).toFixed(0) + ' mV apart. ' + (view === 'raw' ? 'The raw separations run from ' + ((runs[0].p.Epa - runs[0].p.Epc) * 1000).toFixed(0) + ' mV at 20 mV/s to ' + ((runs[4].p.Epa - runs[4].p.Epc) * 1000).toFixed(0) + ' mV at 500 mV/s: a growth with scan rate that would pass for slow kinetics.' : 'Replotted against E − i R<sub>fit</sub>, the separations become ' + corr[0].toFixed(0) + ' to ' + corr[4].toFixed(0) + ' mV: the couple was reversible all along.') + ' Simulated, 5 mM, no capacitance.';
    }
    Array.prototype.forEach.call(mb, function (bt) { on(bt, 'click', function () { view = bt.getAttribute('data-view'); place(); }); });
    on(sr, 'input', place);
    steps(fig, [
      { text: 'Run the same electrode at several scan rates. If the peaks drift apart in proportion to the peak current, the drift is <b>ohmic</b>: a plot of E<sub>p</sub> against i<sub>p</sub> is a straight line, and its slope estimates the resistance.', on: function () { view = 'raw'; place(); } },
      { text: 'Two lines, one for each peak, <b>parallel</b>: the same resistance acts on both, which is what an ohmic drop does and a slow reaction does not. The intercepts are the peak potentials at zero current.', on: function () { view = 'raw'; place(); } },
      { text: '<b>De-polarize</b>: subtract i R from every point and replot. The curves fold back onto each other, symmetric about the peak positions. Only now is a fit of the currents against scan rate meaningful.', on: function () { view = 'corr'; place(); } }
    ]);
    place();
  });

  /* f11-45: three powers of the scan rate: |i| = a v^1/2 + b v + c v^3/2, fitted without negative coefficients at every potential (Ghasemiahangarani et al. 2026) */
  register('f11-45', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var sa = fig.querySelector('.sa'), sav = fig.querySelector('.sa-val'), sb = fig.querySelector('.sb'), sbv = fig.querySelector('.sb-val'), tg = fig.querySelector('button[data-edge]');
    var VS = [0.5, 1, 2, 5, 10, 20], edge = false;   // mV/s
    var base = cvRun({ v: 0.1, steps: 400 }), pk = P.cv.peaks(base), n = base.E.length, Es = base.E;
    // the three shapes, each normalized: diffusive (the reversible duck), capacitive (a box), non-diffusion-limited faradaic (a broad hump, surface redox)
    var gD = base.i.map(function (i) { return i / pk.ipa; });
    var gC = Es.map(function (E, k) { var s = k < n / 2 ? 1 : -1, ed = 1 - Math.exp(-((k < n / 2 ? E + 0.3 : 0.3 - E) / 0.03)); return s * ed; });
    var gP = Es.map(function (E, k) { var s = k < n / 2 ? 1 : -1; return s * Math.exp(-(E - 0.05 * s) * (E - 0.05 * s) / 0.02); });
    var b = { x0: 58, y0: 236, x1: 300, y1: 34 }, pb = { x0: 352, y0: 236, x1: 506, y1: 60 }, gp = el('g', {}, g), gq = el('g', {}, g);
    badge(g, 120, 60, 1); badge(g, 372, 112, 2); badge(g, 270, 200, 3);
    // each shape normalized to unit charge over the forward sweep, so that the coefficients are shares of the charge at 1 mV/s; v in mV/s throughout
    function area(gs) { var a = 0; for (var k = 1; k < n / 2; k++) a += Math.abs(gs[k]) * (Es[k] - Es[k - 1]); return a; }
    var aD = area(gD), aC = area(gC), aP = area(gP);
    function model(k, v, A, B, C) { var e = edge && k < n / 2 && Es[k] > 0.22 ? 0.3 * (A + B + C) * Math.exp((Es[k] - 0.3) / 0.03) * Math.pow(v, 1.25) : 0; return A * Math.sqrt(v) * gD[k] + B * v * gC[k] + C * Math.pow(v, 1.5) * gP[k] + e; }
    function place() {
      var sh = [+sa.value, +sb.value]; var rest = Math.max(0, 100 - sh[0] - sh[1]);   // shares of the charge at 1 mV/s: diffusive, capacitive, the rest pseudocapacitive
      setSvgText(sav, sh[0] + ' %'); setSvgText(sbv, sh[1] + ' %'); tg.setAttribute('aria-pressed', String(edge));
      var A = sh[0] / 100 / aD, B = sh[1] / 100 / aC, C = rest / 100 / aP;
      // fit at every potential: non-negative least squares of |i| on [v^1/2, v, v^3/2], forward sweep only
      var fitA = [], fitB = [], fitC = [], R2sum = 0, cnt = 0;
      for (var k = 0; k < n / 2; k++) {
        var rows = VS.map(function (v) { return [Math.sqrt(v), v, Math.pow(v, 1.5)]; }), ys = VS.map(function (v) { return Math.abs(model(k, v, A, B, C)); });
        var x = P.m11.nnls(rows, ys, 60); fitA.push(x[0]); fitB.push(x[1]); fitC.push(x[2]);
        var mean = ys.reduce(function (s, y) { return s + y; }, 0) / ys.length, ssT = 0, ssR = 0; ys.forEach(function (y, j) { var yh = rows[j][0] * x[0] + rows[j][1] * x[1] + rows[j][2] * x[2]; ssT += (y - mean) * (y - mean); ssR += (y - yh) * (y - yh); }); if (ssT > 1e-12) { R2sum += 1 - ssR / ssT; cnt++; }
      }
      var R2 = cnt ? R2sum / cnt : 1, vShow = 5;
      clear(gp); clear(gq);
      var tot = [], parts = [[], [], []], ymax = 0;
      for (k = 0; k < n / 2; k++) { var p1 = fitA[k] * Math.sqrt(vShow), p2 = fitB[k] * vShow, p3 = fitC[k] * Math.pow(vShow, 1.5); parts[0].push(p1); parts[1].push(p2); parts[2].push(p3); tot.push(Math.abs(model(k, vShow, A, B, C))); ymax = Math.max(ymax, tot[k], p1 + p2 + p3); }
      var fr = cvFrame(gp, b, [-0.3, 0.3], [0, ymax * 1.1], { xt: [[-0.3, '−0.3'], [0, '0'], [0.3, '+0.3']], yt: [], xl: 'E − E°′, V (forward sweep, 5 mV/s)', yl: '|i|, stacked by mechanism' });
      var xsF = Es.slice(0, n / 2);
      // stacked areas: capacitive at the bottom, then pseudocapacitive, then diffusive
      var order = [[1, 'var(--second)', .45], [2, 'var(--warm, #F0A35B)', .55], [0, 'var(--accent)', .35]], acc = new Array(n / 2).fill(0);
      order.forEach(function (q) { var top = acc.map(function (a2, k2) { return a2 + parts[q[0]][k2]; }); var d = cvPath(xsF, top, fr.X, fr.Y); for (k = n / 2 - 1; k >= 0; k--) d += 'L' + fr.X(xsF[k]).toFixed(1) + ',' + fr.Y(acc[k]).toFixed(1); el('path', { d: d + 'Z', fill: q[1], 'fill-opacity': q[2], stroke: 'none' }, gp); acc = top; });
      el('path', { d: cvPath(xsF, tot, fr.X, fr.Y), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }, gp);
      // charge shares at 5 mV/s, as bars
      var Qs = [0, 0, 0]; for (k = 1; k < n / 2; k++) { var dE = Es[k] - Es[k - 1]; Qs[0] += parts[0][k] * dE; Qs[1] += parts[1][k] * dE; Qs[2] += parts[2][k] * dE; }
      var QT = Qs[0] + Qs[1] + Qs[2];
      var pf = cvFrame(gq, pb, [-0.5, 2.5], [0, 100], { yt: [[0, '0'], [50, '50'], [100, '100']], yl: 'share at 5 mV/s, %' });
      [['v^{1/2}', 'var(--accent)', Qs[0]], ['v', 'var(--second)', Qs[1]], ['v^{3/2}', 'var(--warm, #F0A35B)', Qs[2]]].forEach(function (q, k2) { var pc = 100 * q[2] / QT; el('rect', { x: pf.X(k2) - 20, y: pf.Y(pc), width: 40, height: pf.Y(0) - pf.Y(pc), fill: q[1], 'fill-opacity': .8 }, gq); txt(gq, pf.X(k2), pf.Y(pc) - 5, pc.toFixed(0) + ' %', 'strong', 'middle', { style: 'font-size:10px' }); txt(gq, pf.X(k2), pb.y0 + 14, q[0], '', 'middle', { style: 'font-size:10px' }); });
      txt(gq, pb.x0 - 6, pb.y0 + 30, 'mean R² of the fits: ' + R2.toFixed(3), R2 < 0.99 ? 'heat' : 'strong', 'start', { style: 'font-size:10px' });
      read.innerHTML = 'Six scan rates from 0.5 to 20 mV/s, fitted potential by potential with |i| = a v<sup>1/2</sup> + b v + c v<sup>3/2</sup> and no negative coefficient. At 5 mV/s the charge divides into <b>' + (100 * Qs[0] / QT).toFixed(0) + ' % diffusion-limited, ' + (100 * Qs[1] / QT).toFixed(0) + ' % capacitive and ' + (100 * Qs[2] / QT).toFixed(0) + ' % non-diffusion-limited faradaic</b>' + (edge ? '. With electrolyte decomposition switched on at the top of the window (here growing as v<sup>1.25</sup>), the fit still reports a high R² and books that current as storage, split between the v and v<sup>3/2</sup> terms: the method classifies by scaling, not by chemistry, so it cannot tell decomposition from storage (Ghasemiahangarani et al. warn that it tends to land in the non-diffusion-limited faradaic term), and the window must stop before decomposition.' : '; the shares move with the rate, because the three terms scale differently, while the coefficients do not.') + ' The electrode is illustrative: three shapes with exact power laws.';
    }
    on(sa, 'input', place); on(sb, 'input', place); on(tg, 'click', function () { edge = !edge; place(); });
    steps(fig, [
      { text: 'Three mechanisms, three powers of the scan rate: diffusion-limited faradaic current grows as <b>v<sup>1/2</sup></b>, capacitive current as <b>v</b>, and a faradaic reaction that is not limited by diffusion as <b>v<sup>3/2</sup></b>. At least four scan rates give the fit enough freedom.', on: function () { edge = false; place(); } },
      { text: 'The fit is made at every potential, oxidation and reduction separately, with the coefficients held non-negative; the current of each term is then integrated over the sweep to give the <b>charge</b> stored by each mechanism, and a mean R² below 0.99 says the three-term model does not describe the data.', on: function () { edge = false; place(); } },
      { text: 'The method classifies by scaling, not by chemistry: <b>decomposition</b> of the electrolyte at the edge of the window is booked as a non-diffusion-limited faradaic current. Keep the window inside the stable range.', on: function () { edge = true; place(); } }
    ]);
    place();
  });

  /* f11-46: a mechanical artefact: lattice stress shifts the peak by sigma Omega / F and inflates the apparent diffusion coefficient; the scan-rate test tells it from an ohmic shift (Chen, Dhiman and Huang 2026) */
  register('f11-46', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), ss = fig.querySelector('.sg'), ssv = fig.querySelector('.sg-val');
    var OMEGA = 3.0e-6;   // partial molar volume of lithium in an olivine host, m3/mol: illustrative order of magnitude
    var b = { x0: 58, y0: 236, x1: 300, y1: 34 }, pb = { x0: 358, y0: 236, x1: 506, y1: 34 }, gp = el('g', {}, g), gq = el('g', {}, g);
    badge(g, 250, 70, 1); badge(g, 372, 200, 2); badge(g, 270, 200, 3);
    function place() {
      var sig = +ss.value; setSvgText(ssv, sig.toFixed(1) + ' GPa');
      var shift = sig * 1e9 * OMEGA / 96485;   // V
      clear(gp); clear(gq);
      // left: the shift of a peak against scan rate: constant for stress, growing for an ohmic drop
      var fr = cvFrame(gp, b, [-2, 0], [0, 0.16], { xt: [[-1.7, '0.02'], [-1, '0.1'], [0, '1']], yt: [[0, '0'], [0.05, '50'], [0.1, '100'], [0.15, '150']], xl: 'scan rate, V/s (log)', yl: 'shift of the oxidation peak, mV' });
      var dO = '', dS = '';
      for (var k = 0; k <= 40; k++) { var lv = -2 + k / 20, v = Math.pow(10, lv), ipk = P.cv.randlesSevcik(1, CV_A, 5 * CV_C, CV_D, v), ohm = ipk * 150; dO += (k ? 'L' : 'M') + fr.X(lv).toFixed(1) + ',' + fr.Y(Math.min(0.16, ohm)).toFixed(1); dS += (k ? 'L' : 'M') + fr.X(lv).toFixed(1) + ',' + fr.Y(Math.min(0.16, shift)).toFixed(1); }
      el('path', { d: dO, fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2 }, gp); el('path', { d: dS, fill: 'none', stroke: 'var(--field)', 'stroke-width': 2.4 }, gp);
      txt(gp, fr.X(-1.9), fr.Y(Math.min(0.15, shift)) - 6, 'lattice stress: σΩ/F, the same at every rate', 'field', 'start', { style: 'font-size:10px' });
      txt(gp, fr.X(-1.9), fr.Y(0.148), 'ohmic drop i_{p}R: grows as v^{1/2}', 'heat', 'start', { style: 'font-size:10px' });
      // right: the apparent D from Randles-Sevcik, inflated by stress through the peak current
      var pf = cvFrame(gq, pb, [0, 4], [0, 3.5], { xt: [[0, '0'], [2, '2'], [4, '4']], yt: [[1, '1'], [2, '2'], [3, '3']], xl: 'stress, GPa', yl: 'apparent D / true D' });
      el('line', { x1: pf.X(0), y1: pf.Y(1), x2: pf.X(4), y2: pf.Y(1), stroke: 'var(--line-2)', 'stroke-dasharray': '4 3' }, gq);
      var dI = ''; for (k = 0; k <= 40; k++) { var s2 = k / 10, f = 1 + 2.3 * (s2 / 4) * (s2 / 4); dI += (k ? 'L' : 'M') + pf.X(s2).toFixed(1) + ',' + pf.Y(Math.min(3.5, f)).toFixed(1); }
      el('path', { d: dI, fill: 'none', stroke: 'var(--field)', 'stroke-width': 2.2 }, gq);
      var fac = 1 + 2.3 * (sig / 4) * (sig / 4);
      el('circle', { cx: pf.X(sig), cy: pf.Y(Math.min(3.5, fac)), r: 5, fill: 'var(--field)', stroke: '#fff' }, gq);
      txt(gq, pb.x1 - 30, pf.Y(3.3) + 2, 'modelled LiFePO₄: 3.3×', '', 'end', { style: 'font-size:9.5px' }); txt(gq, pb.x1 - 30, pf.Y(3.3) + 14, 'at the highest dislocation', '', 'end', { style: 'font-size:9.5px' }); txt(gq, pb.x1 - 30, pf.Y(3.3) + 26, 'density', '', 'end', { style: 'font-size:9.5px' });
      read.innerHTML = 'A hydrostatic stress of ' + sig.toFixed(1) + ' GPa in the host lattice moves the insertion potential by σΩ/F = <b>' + (shift * 1000).toFixed(0) + ' mV</b> for a partial molar volume of 3 cm³/mol: tensile stress to higher potential, compressive to lower. The shift is the same at every scan rate, where an ohmic shift grows with the peak current; that is the test. Through the peak current, the same stress inflates the apparent diffusion coefficient; the modelled olivine particle with the densest dislocations returned <b>3.3 times</b> the true value. Illustrative curve through the two anchor points of the model; the review itself warns that no experimental threshold exists yet.';
    }
    on(ss, 'input', place);
    steps(fig, [
      { text: 'Stress enters the chemical potential of lithium in the lattice: a hydrostatic stress σ shifts the insertion potential by <b>σΩ/F</b>, tens of millivolts for the gigapascals that coherency strain and dislocations produce. A shifted, asymmetric peak may be <b>mechanics</b>, not kinetics.' },
      { text: 'The <b>test</b> is the scan rate. A stress shift is the same at every rate and keeps the v<sup>1/2</sup> law of the peak current; an ohmic shift grows with the peak current, and a slow reaction spreads the peaks with rate.' },
      { text: 'The peak current is inflated with the shift, so a Randles-Sevcik diffusion coefficient from a stressed electrode is too large: a modelled factor of 3.3 that would pass for better transport. Compare D from CV with GITT ({{fig:f11-26}}), and look for the asymmetric broadening on the high-overpotential flank.' }
    ]);
    place();
  });
