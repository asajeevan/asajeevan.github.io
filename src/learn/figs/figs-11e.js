  /* =================================================================
     Module 11, impedance basics (11.8 to 11.11): a sine in and a sine
     out, with the Lissajous plot (Lazanas and Prodromidis 2023, R63,
     secs 2, 6 and 7); Nyquist and Bode plots of the same data and when
     two arcs are resolved (R63 sec. 7.4 and sec. 8); the spectrum of a
     commercial cell built element by element (Meddings et al. 2020, R64,
     Fig. 1 and sec. 3.2.2); and the shapes real cells show: CPE, finite
     diffusion, spherical diffusion and the porous electrode (R63 secs
     12 to 14; Abbas et al. 2025, R69, eqs 6, 9 and 17). Physics in
     Physics.m11.
     ================================================================= */

  /* equal-scale Nyquist frame: b = {x0, y0, x1, y1}; xr = [lo, hi] in the plotted unit; the
     y range follows from the same scale (yLo at the bottom). Returns {X, Y, k} */
  function e11nyq(g, b, xr, yLo, o) {
    o = o || {};
    var k = (b.x1 - b.x0) / (xr[1] - xr[0]), X = function (v) { return b.x0 + (v - xr[0]) * k; }, Y = function (v) { return b.y0 - (v - yLo) * k; };
    var yHi = yLo + (b.y0 - b.y1) / k;
    if (yLo < 0) el('line', { x1: b.x0, x2: b.x1, y1: Y(0), y2: Y(0), stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g);
    e11axes(g, b, { X: X, Y: Y, xt: o.xt || [], yt: (o.yt || []).filter(function (t) { return t[0] >= yLo && t[0] <= yHi; }), xlab: o.xlab, ylab: o.ylab, grid: o.grid });
    return { X: X, Y: Y, k: k, yHi: yHi };
  }
  /* path of an impedance list, cut where it leaves the frame (so a capacitive line stops at the top) */
  function e11zpath(zs, F, b, unit) {
    var pts = [];
    for (var i = 0; i < zs.length; i++) { var x = F.X(zs[i].re * unit), y = F.Y(-zs[i].im * unit); if (y < b.y1 - 1 || x > b.x1 + 1 || x < b.x0 - 1 || y > b.y0 + 1) { if (pts.length) break; continue; } pts.push([x, y]); }
    return e11d(pts);
  }
  function e11deg(z) { return Math.atan2(z.im, z.re) * 180 / Math.PI; }

  /* ===== 11.8 A sine in, a sine out ===== */
  register('f11-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.fsl'), sv = fig.querySelector('.fsl-val');
    var V0 = 0.010, Rv = 20, Cv = 100e-6, Lv = 20e-3, elm = e11modes(fig, function (m) { elm = m; render(); });
    function Z(w) { return elm === 'R' ? M11.zR(Rv) : elm === 'C' ? M11.zC(Cv, w) : elm === 'L' ? M11.zL(Lv, w) : M11.parallel(M11.zR(Rv), M11.zC(Cv, w)); }
    // time panel
    var a = { x0: 52, x1: 300, yc: 122, h: 62 }, ty = a.yc + a.h + 10;
    el('line', { x1: a.x0, x2: a.x1, y1: a.yc, y2: a.yc, stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g);
    el('line', { x1: a.x0, x2: a.x0, y1: a.yc - a.h - 8, y2: ty, stroke: 'var(--line-2)' }, g); el('line', { x1: a.x0, x2: a.x1, y1: ty, y2: ty, stroke: 'var(--line-2)' }, g);
    txt(g, a.x0, 24, 'voltage applied and current measured', 'strong', 'start');
    var lv = txt(g, a.x0 + 6, a.yc - a.h - 12, '', 'amber', 'start'), li = txt(g, a.x0 + 120, a.yc - a.h - 12, '', 'cyan', 'start');
    var tk = [0, 1, 2].map(function (k) { var x = a.x0 + k * (a.x1 - a.x0) / 2; el('line', { x1: x, x2: x, y1: ty, y2: ty + 4, stroke: 'var(--line-2)' }, g); return txt(g, x, ty + 16, '', '', k === 0 ? 'start' : k === 2 ? 'end' : 'middle'); });
    var pv = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), pi = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.4 }, g);
    var cur = el('line', { y1: a.yc - a.h - 4, y2: a.yc + a.h + 4, stroke: 'var(--text)', 'stroke-dasharray': '3 3', 'stroke-opacity': '.6' }, g);
    var dV = el('circle', { r: 4.5, fill: 'var(--amber)' }, g), dI = el('circle', { r: 4.5, fill: 'var(--cyan)' }, g);
    // Lissajous panel
    var lc = { x: 420, y: 122, r: 62 };
    txt(g, lc.x, 24, 'current against voltage', 'strong', 'middle');
    el('rect', { x: lc.x - lc.r - 6, y: lc.y - lc.r - 6, width: 2 * lc.r + 12, height: 2 * lc.r + 12, fill: 'none', stroke: 'var(--line)' }, g);
    el('line', { x1: lc.x - lc.r - 6, x2: lc.x + lc.r + 6, y1: lc.y, y2: lc.y, stroke: 'var(--line-2)' }, g); el('line', { x1: lc.x, x2: lc.x, y1: lc.y - lc.r - 6, y2: lc.y + lc.r + 6, stroke: 'var(--line-2)' }, g);
    txt(g, lc.x + lc.r + 6, lc.y + lc.r + 22, 'V, scaled to ±V₀', 'amber', 'end'); txt(g, lc.x - lc.r - 6, lc.y - lc.r - 12, 'I, scaled to ±I₀', 'cyan', 'start');
    var liss = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g), dL = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var ph = txt(g, lc.x, lc.y + lc.r + 42, '', 'strong', 'middle');
    badge(g, a.x0 + 22, a.yc - a.h + 6, 1); badge(g, lc.x + lc.r - 8, lc.y - lc.r + 10, 2);
    var th = 0, f = 100, z = Z(2 * Math.PI * f), phi = 0;
    function place() {
      var u = (th % (4 * Math.PI)) / (4 * Math.PI), x = a.x0 + u * (a.x1 - a.x0), sv_ = Math.sin(th), si = Math.sin(th + phi);
      cur.setAttribute('x1', x); cur.setAttribute('x2', x);
      dV.setAttribute('cx', x); dV.setAttribute('cy', a.yc - sv_ * a.h); dI.setAttribute('cx', x); dI.setAttribute('cy', a.yc - si * a.h * 0.8);
      dL.setAttribute('cx', lc.x + sv_ * lc.r); dL.setAttribute('cy', lc.y - si * lc.r);
    }
    function render() {
      f = Math.pow(10, +sl.value); var w = 2 * Math.PI * f; z = Z(w); phi = -Math.atan2(z.im, z.re);
      var m = M11.abs(z), I0 = V0 / m, T = 1 / f, ptsV = [], ptsI = [], ptsL = [];
      setSvgText(sv, e11Hz(f));
      for (var k = 0; k <= 160; k++) { var t = 4 * Math.PI * k / 160, x = a.x0 + k / 160 * (a.x1 - a.x0); ptsV.push([x, a.yc - Math.sin(t) * a.h]); ptsI.push([x, a.yc - Math.sin(t + phi) * a.h * 0.8]); }
      for (k = 0; k <= 120; k++) { var t2 = 2 * Math.PI * k / 120; ptsL.push([lc.x + Math.sin(t2) * lc.r, lc.y - Math.sin(t2 + phi) * lc.r]); }
      pv.setAttribute('d', e11d(ptsV)); pi.setAttribute('d', e11d(ptsI)); liss.setAttribute('d', e11d(ptsL) + 'Z');
      setSvgText(lv, 'V: ±10 mV'); setSvgText(li, 'I: ±' + (I0 * 1000 >= 10 ? (I0 * 1000).toFixed(0) : (I0 * 1000).toFixed(2)) + ' mA');
      setSvgText(tk[0], '0'); setSvgText(tk[1], e11time(T)); setSvgText(tk[2], e11time(2 * T));
      var deg = Math.round(phi * 180 / Math.PI), names = { R: 'a resistor, 20 Ω', C: 'a capacitor, 100 µF', L: 'an inductor, 20 mH', RC: '20 Ω in parallel with 100 µF' };
      setSvgText(ph, Math.abs(deg) < 1 ? 'in phase' : deg > 0 ? 'current leads by ' + deg + '°' : 'current lags by ' + (-deg) + '°');
      read.innerHTML = 'At <b>' + e11Hz(f) + '</b>, ' + names[elm] + ': |Z| = V₀/I₀ = <b>' + (m >= 10 ? m.toFixed(1) : m.toFixed(2)) + ' Ω</b>, phase of Z = <b>' + e11n(-deg, 0) + '°</b>, so Z′ = ' + e11n(z.re, 2) + ' Ω and Z″ = ' + e11n(z.im, 2) + ' Ω.';
      place();
    }
    function pick(m) { var bt = fig.querySelector('button[data-mode="' + m + '"]'); if (bt) bt.click(); }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'Impedance spectroscopy applies a small sine, here a voltage of amplitude V₀ = 10 mV, and records the current that answers. In a linear system the current is a sine of the same frequency; only its size and its timing differ. Two numbers say how: |Z| = V₀/I₀ and the phase shift φ. Together they make one complex number, Z = Z′ + jZ″.' },
      { text: 'A <b>resistor</b>: the current is in phase with the voltage and |Z| = R at every frequency. Current against voltage, the <b>Lissajous plot</b> on the right, is a straight diagonal line.', on: function () { pick('R'); } },
      { text: 'A <b>capacitor</b>: the current leads the voltage by 90°, and |Z| = 1/(ωC) falls as the frequency rises (ω = 2πf). With both axes scaled to their amplitudes, the Lissajous plot is a circle. Slide the frequency.', on: function () { pick('C'); } },
      { text: 'An <b>inductor</b>, such as a long cable: the current lags by 90°, and |Z| = ωL grows with frequency.', on: function () { pick('L'); } },
      { text: 'A resistor and a capacitor in parallel, the building block of an interface: at low frequency the current goes through R, at high frequency through C, and in between it shares, with a phase between 0 and 90°. Analyzers draw the Lissajous plot live: a distorted shape means the response is not linear; a shape that drifts means the cell is changing during the measurement.', on: function () { pick('RC'); } }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; th += dt * Math.PI; place(); }, { autoplay: true, stepDt: 0.25 });
    bind(fig, loop);
  });

  /* ===== 11.9 One spectrum, two pictures ===== */
  register('f11-9', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.tratio'), sv = fig.querySelector('.tratio-val'), cbS = fig.querySelector('.stretch');
    var R0 = 10, R1 = 20, R2 = 20, tau2 = 1e-4, fs = M11.freqs(1e5, 0.1, 30);
    var b = { x0: 50, y0: 250, x1: 270, y1: 50 }, gN = el('g', {}, g), gB = el('g', {}, g);
    txt(g, b.x0, 14, 'Nyquist plot', 'strong', 'start'); txt(g, 330, 14, 'Bode plot', 'strong', 'start');
    var ba = { x0: 330, y0: 128, x1: 492, y1: 46 }, bp = { x0: 330, y0: 250, x1: 492, y1: 164 };
    var XB = function (f) { return e11log(f, -1, 5, ba.x0, ba.x1); }, YA = function (m) { return e11log(m, 0, 2, ba.y0, ba.y1); }, YP = function (d) { return bp.y0 - d / 60 * (bp.y0 - bp.y1); };
    e11axes(g, ba, { X: XB, Y: YA, xt: [[0.1, ''], [10, ''], [1000, ''], [1e5, '']], yt: [[1, '1'], [10, '10'], [100, '100']], grid: true, ylab: '|Z|, Ω (log)' });
    e11axes(g, bp, { X: XB, Y: YP, xt: [[0.1, '0.1'], [10, '10'], [1000, '1 k'], [1e5, '100 k']], yt: [[0, '0'], [30, '30'], [60, '60']], grid: true, xlab: 'frequency, Hz (log)', ylab: '−phase, degrees' });
    var pA = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.2 }, g), pP = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.2 }, g);
    var dA = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g), dP = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var pN = null, dN = null, F = null, zs = [], tau1 = 1e-2, fi = 0, tops = [];
    badge(g, b.x0 + 24, b.y1 + 14, 1); badge(g, ba.x1 - 12, ba.y1 + 12, 2); badge(g, bp.x1 - 12, bp.y1 + 12, 3);
    function Z(f, t1) { var w = 2 * Math.PI * f; return M11.add(M11.zR(R0), M11.parallel(M11.zR(R1), M11.zC(t1 / R1, w)), M11.parallel(M11.zR(R2), M11.zC(tau2 / R2, w))); }
    function render() {
      var lr = +sl.value, ratio = Math.pow(10, lr); tau1 = tau2 * ratio; setSvgText(sv, ratio < 10 ? ratio.toFixed(1) : Math.round(ratio) + '');
      zs = fs.map(function (f) { return Z(f, tau1); });
      clear(gN);
      var st = cbS.checked ? 2 : 1;
      F = e11nyq(gN, b, [0, 55], 0, { xt: [[0, '0'], [10, '10'], [30, '30'], [50, '50']], yt: [[0, '0'], [10, '10'], [20, '20'], [30, '30'], [40, '40'], [50, '50']], xlab: 'Z′, Ω', ylab: '−Z″, Ω' });
      if (st > 1) { clear(gN); var k = (b.x1 - b.x0) / 55; F = { X: function (v) { return b.x0 + v * k; }, Y: function (v) { return b.y0 - v * k * st; }, k: k }; e11axes(gN, b, { X: F.X, Y: F.Y, xt: [[0, '0'], [10, '10'], [30, '30'], [50, '50']], yt: [[0, '0'], [5, '5'], [10, '10'], [15, '15'], [20, '20']], xlab: 'Z′, Ω', ylab: '−Z″, Ω (stretched ×2)' }); }
      el('path', { d: e11d(zs.map(function (z) { return [F.X(z.re), F.Y(-z.im)]; })), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, gN);
      [tau1, tau2].forEach(function (t, i) { var fT = 1 / (2 * Math.PI * t), z = Z(fT, tau1); el('circle', { cx: F.X(z.re), cy: F.Y(-z.im), r: 3.5, fill: 'var(--cyan)' }, gN); if (lr >= 1) txt(gN, F.X(z.re), F.Y(-z.im) - 10, e11Hz(fT), 'cyan', 'middle'); });
      txt(gN, b.x0 + 8, b.y0 + 32, 'high f ←', '', 'start');
      dN = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, gN);
      pA.setAttribute('d', e11d(fs.map(function (f, i) { return [XB(f), YA(M11.abs(zs[i]))]; })));
      pP.setAttribute('d', e11d(fs.map(function (f, i) { return [XB(f), YP(-e11deg(zs[i]))]; })));
      place();
    }
    function place() {
      var i = Math.min(fs.length - 1, Math.floor(fi)), z = zs[i], f = fs[i];
      dN.setAttribute('cx', F.X(z.re)); dN.setAttribute('cy', F.Y(-z.im));
      dA.setAttribute('cx', XB(f)); dA.setAttribute('cy', YA(M11.abs(z))); dP.setAttribute('cx', XB(f)); dP.setAttribute('cy', YP(-e11deg(z)));
      var ratio = tau1 / tau2;
      read.innerHTML = 'f = <b>' + e11Hz(f) + '</b>: Z′ = ' + z.re.toFixed(1) + ' Ω, −Z″ = ' + e11n(-z.im) + ' Ω, |Z| = ' + M11.abs(z).toFixed(1) + ' Ω, phase ' + e11n(e11deg(z), 0) + '°. τ₁/τ₂ = <b>' + (ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)) + '</b>: ' + (ratio >= 100 ? 'two separate arcs and two phase peaks.' : ratio < 1.5 ? 'the two arcs have merged into one; nothing in the plot says there are two processes.' : 'the arcs overlap; they are poorly resolved below a ratio of about 100.');
    }
    on(sl, 'input', render); on(cbS, 'change', render);
    steps(fig, [
      { text: 'The <b>Nyquist plot</b> draws each frequency as one point: Z′ to the right, −Z″ upward, high frequencies on the left. A resistor in parallel with a capacitor draws a semicircle; its diameter is R and its top sits at ω = 1/(RC). Here the arcs start at R₀ = 10 Ω and end at R₀ + R₁ + R₂ = 50 Ω. What the plot does not show is the frequency of each point: follow the dot.' },
      { text: 'The <b>Bode plot</b> shows the same data against frequency: |Z| and the phase, both on a logarithmic frequency axis, so the frequency of every point can be read and decades of frequency are equally clear.' },
      { text: 'Two processes with time constants τ₁ = R₁C₁ and τ₂ = R₂C₂ give two arcs only when the time constants are far apart: about a factor of 100 or more. Slide the ratio down: the arcs merge, and at equal τ a single semicircle remains. The phase plot shows two peaks for as long as it can.' },
      { text: 'One rule for Nyquist plots: both axes on the same scale. Tick “stretch” to zoom the vertical axis twice, a common mistake: the arcs look round and tall when they are not.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; fi += dt * 30; if (fi >= fs.length) fi = 0; place(); }, { autoplay: true, stepDt: 0.25 });
    bind(fig, loop);
  });

  /* ===== 11.10 A commercial cell, one element at a time ===== */
  register('f11-10', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var C = M11.CELL, fs = M11.freqs(5000, 3e-3, 12), stage = 4;
    var parts = [
      { lab: 'L', w: 34 }, { lab: 'R₀', w: 40 }, { lab: 'R_SEI ‖ Q_SEI', w: 104 }, { lab: 'R_ct ‖ C_dl', w: 86 }, { lab: 'Z_d (sphere)', w: 96 }
    ], x = 22, boxes = [];
    parts.forEach(function (p, i) { if (i) { el('line', { x1: x - 14, x2: x, y1: 30, y2: 30, stroke: 'var(--line-2)' }, g); } boxes.push(e11box(g, x, 30, p.w, p.lab, 'strong')); x += p.w + 14; });
    txt(g, 22, 58, 'Z_d sits in series with R_ct, both in parallel with C_dl (the Randles arrangement)', '', 'start');
    var b = { x0: 60, y0: 352, x1: 470, y1: 80 }, F = e11nyq(g, b, [18, 59], -6, { xt: [[20, '20'], [30, '30'], [40, '40'], [50, '50']], yt: [[-5, '−5'], [0, '0'], [10, '10'], [20, '20']], xlab: 'Z′, mΩ', ylab: '−Z″, mΩ' });
    var bands = [[5000, 1000, 'kHz', 'var(--cyan)'], [1000, 1, 'Hz', 'var(--amber)'], [1, 3e-3, 'mHz', '#C4B5F7']];
    function Zs(f, st) { var w = 2 * Math.PI * f, z = M11.add(M11.zL(C.L, w), M11.zR(C.R0)); if (st >= 1) z = M11.add(z, M11.zRQ(C.Rsei, C.Qsei, C.nsei, w)); if (st === 2) z = M11.add(z, M11.parallel(M11.zR(C.Rct), M11.zC(C.Cdl, w))); if (st >= 3) z = M11.add(z, M11.parallel(M11.zC(C.Cdl, w), M11.add(M11.zR(C.Rct), M11.zSphere(C.Rd, C.Cd, w)))); return z; }
    var full = fs.map(function (f) { return M11.cellZ(C, 2 * Math.PI * f); });
    el('path', { d: e11zpath(full, F, b, 1000), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.2, 'stroke-opacity': '.3' }, g);
    var bandG = el('g', {}, g), path = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.6 }, g), decs = el('g', {}, g);
    var dot = el('circle', { r: 5.5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    badge(g, F.X(20) + 16, F.Y(-4), 1); badge(g, F.X(22.5), F.Y(5), 2); badge(g, F.X(28.3), F.Y(9.5), 3); badge(g, F.X(44), F.Y(18), 4);
    var zs = [], fi = 0;
    function render(st) {
      stage = st; zs = fs.map(function (f) { return Zs(f, st >= 4 ? 3 : st); });
      path.setAttribute('d', e11zpath(zs, F, b, 1000));
      boxes.forEach(function (r, i) { e11lit(r, i <= st, i === 0 ? 'var(--cyan)' : 'var(--amber)'); });
      clear(decs); clear(bandG);
      var placed = [];
      [1000, 100, 10, 1, 0.1, 0.01].forEach(function (f) { var z = Zs(f, st >= 4 ? 3 : st), px = F.X(z.re * 1000), py = F.Y(-z.im * 1000); if (py < b.y1) return; el('circle', { cx: px, cy: py, r: 3, fill: 'var(--cyan)' }, decs); var lx = px + 8, ly = py + (f >= 100 ? 18 : -10); if (placed.some(function (q) { return Math.abs(q[0] - lx) < 56 && Math.abs(q[1] - ly) < 18; })) return; placed.push([lx, ly]); txt(decs, lx, ly, e11Hz(f), 'cyan', 'start'); });
      if (st >= 4) bands.forEach(function (bd) { var zA = Zs(bd[0], 3), zB = Zs(bd[1], 3), xA = F.X(zA.re * 1000), xB = Math.min(b.x1, F.X(zB.re * 1000)); el('rect', { x: xA, y: b.y1, width: xB - xA, height: b.y0 - b.y1, fill: bd[3], 'fill-opacity': '.07' }, bandG); txt(bandG, (xA + xB) / 2, b.y1 + 14, bd[2], 'strong', 'middle'); });
      place();
    }
    function place() {
      var i = Math.min(fs.length - 1, Math.floor(fi)), z = zs[i], f = fs[i], py = F.Y(-z.im * 1000);
      dot.style.display = py < b.y1 ? 'none' : ''; dot.setAttribute('cx', F.X(z.re * 1000)); dot.setAttribute('cy', py);
      var what = f > 1000 ? 'the cables and windings (inductance) and the ohmic resistance' : f > 50 ? 'the SEI arc' : f > 1 ? 'charge transfer with the double layer' : 'diffusion of lithium inside the particles';
      read.innerHTML = 'f = <b>' + e11Hz(f) + '</b>: Z′ = ' + (z.re * 1000).toFixed(1) + ' mΩ, −Z″ = ' + e11n(-z.im * 1000) + ' mΩ. ' + (stage >= 4 ? 'This range is dominated by <b>' + what + '</b>.' : '');
    }
    steps(fig, [
      { text: 'Start at the highest frequencies. The cables and the cell windings act as an <b>inductance</b>, so the spectrum begins below the axis. Where it crosses the axis, the <b>ohmic resistance</b> is read: electrolyte, active material, current collectors and contacts together. A commercial cell has tens of milliohms, not ohms.', on: function () { render(0); } },
      { text: 'Add the <b>SEI</b>: lithium crossing the surface film, in parallel with the film’s own capacitance, gives a first, small arc at a few hundred hertz. Real arcs are depressed, so a constant phase element Q stands in for the capacitor.', on: function () { render(1); } },
      { text: 'Add <b>charge transfer</b> in parallel with the double layer: a second, larger arc at a few hertz. In a real cell the arcs of the two electrodes and their SEI layers overlap; with only two terminals there is no telling them apart from this plot alone.', on: function () { render(2); } },
      { text: 'Add <b>solid diffusion</b> inside the particles: the tail at low frequency. It starts at 45° and bends upward, towards a vertical line, because each particle can hold only so much lithium.', on: function () { render(3); } },
      { text: 'The three frequency ranges of a real spectrum: <b>kHz</b> (inductance and ohmic), <b>Hz</b> (interfaces) and <b>mHz</b> (diffusion). An analyzer sweeps from high to low. With 12 frequencies per decade down to 3 mHz, a single period at each frequency adds up to ' + Math.round(fs.reduce(function (s, f) { return s + 1 / f; }, 0) / 60) + ' minutes, nearly all of it below 0.1 Hz; instruments average several periods per point, so a real sweep takes longer.', on: function () { render(4); } }
    ]);
    render(4);
    var loop = anim(fig, function (dt) { if (dt === 0) return; fi += dt * 12; if (fi >= fs.length) fi = 0; place(); }, { autoplay: true, stepDt: 0.25 });
    bind(fig, loop);
  });

  /* ===== 11.11 The shapes real cells draw ===== */
  register('f11-11', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sn = fig.querySelector('.nexp'), snv = fig.querySelector('.nexp-val'), sr = fig.querySelector('.rpor'), srv = fig.querySelector('.rpor-val');
    var ws = M11.freqs(1e5, 1e-5, 20).map(function (f) { return 2 * Math.PI * f; }), wsA = M11.freqs(1e9, 1e-9, 12).map(function (f) { return 2 * Math.PI * f; });
    var P = [
      { b: { x0: 40, y0: 210, x1: 240, y1: 70 }, t: 'A: constant phase element' },
      { b: { x0: 300, y0: 210, x1: 500, y1: 70 }, t: 'B: diffusion into a film' },
      { b: { x0: 40, y0: 430, x1: 240, y1: 290 }, t: 'C: film or sphere' },
      { b: { x0: 300, y0: 430, x1: 500, y1: 290 }, t: 'D: porous electrode' }
    ];
    txt(g, 260, 18, 'each panel: −Z″ up, Z′ across, both in mΩ on the same scale', '', 'middle');
    var Fs = P.map(function (p, i) { txt(g, p.b.x0, p.b.y1 - 22, p.t, 'strong', 'start'); badge(g, p.b.x1 - 10, p.b.y1 - 26, i + 1); return e11nyq(g, p.b, [0, 15], 0, { xt: [[0, '0'], [5, '5'], [10, '10'], [15, '15']], yt: [[0, '0'], [5, '5'], [10, '10']] }); });
    function draw(gr, zs, F, b, col, w, dash) { return el('path', { d: e11zpath(zs, F, b, 1000), fill: 'none', stroke: col, 'stroke-width': w || 2.2, 'stroke-dasharray': dash || null }, gr); }
    var gA = el('g', {}, g), gD = el('g', {}, g), R = 0.010;
    // A: R || CPE against R || C
    draw(g, ws.map(function (w) { return M11.zRQ(R, 1, 1, w); }), Fs[0], P[0].b, 'var(--text)', 1.2, '4 4');
    // B: semi-infinite, transmissive (tanh), reflective (coth); Rd = 10 mOhm, B = 1 s^1/2
    var B = Math.sqrt(1), Y0 = B / R;
    draw(g, ws.map(function (w) { return M11.zQ(Y0, 0.5, w); }), Fs[1], P[1].b, 'var(--text)', 1.2, '4 4');
    draw(g, ws.map(function (w) { return M11.zFiniteT(Y0, B, w); }), Fs[1], P[1].b, 'var(--cyan)');
    draw(g, ws.map(function (w) { return M11.zFiniteR(Y0, B, w); }), Fs[1], P[1].b, 'var(--amber)');
    txt(g, Fs[1].X(10.6), Fs[1].Y(1.2), 'open end', 'cyan', 'start'); txt(g, Fs[1].X(3.9), Fs[1].Y(8.6), 'closed end', 'amber', 'start'); txt(g, Fs[1].X(7.6), Fs[1].Y(4.6), '45°, endless', '', 'start');
    // C: Abbas eqs 9 and 6 with the same Rd and Cd: film (1D, coth) against sphere
    var Rd = 0.024, Cd = 1;
    draw(g, ws.map(function (w) { return M11.scale(M11.div(M11.ccoth(M11.csqrt(M11.cx(0, w * Rd * Cd))), M11.csqrt(M11.cx(0, w * Rd * Cd))), Rd); }), Fs[2], P[2].b, 'var(--amber)');
    draw(g, ws.map(function (w) { return M11.zSphere(Rd, Cd, w); }), Fs[2], P[2].b, 'var(--heat)');
    el('line', { x1: Fs[2].X(8), x2: Fs[2].X(8), y1: P[2].b.y0, y2: P[2].b.y1, stroke: 'var(--amber)', 'stroke-dasharray': '2 4', 'stroke-opacity': '.6' }, g); el('line', { x1: Fs[2].X(1.6), x2: Fs[2].X(1.6), y1: P[2].b.y0, y2: P[2].b.y1, stroke: 'var(--heat)', 'stroke-dasharray': '2 4', 'stroke-opacity': '.6' }, g);
    txt(g, Fs[2].X(8) + 4, Fs[2].Y(2), 'film: R_d/3', 'amber', 'start'); txt(g, Fs[2].X(1.6) + 6, Fs[2].Y(8.6), 'sphere: R_d/15', 'heat', 'start');
    function render() {
      var n = +sn.value, rp = +sr.value / 1000; setSvgText(snv, n.toFixed(2)); setSvgText(srv, (rp * 1000).toFixed(0) + ' mΩ');
      clear(gA); clear(gD);
      draw(gA, wsA.map(function (w) { return M11.zRQ(R, 1, n, w); }), Fs[0], P[0].b, 'var(--amber)', 2.4);
      var th = 90 * (1 - n); txt(gA, Fs[0].X(5), Fs[0].Y(0.9), n > 0.98 ? 'ideal semicircle' : 'sunk by ' + th.toFixed(0) + '°', 'amber', 'middle');
      // D: Bisquert line, Rct = 10 mOhm, Cdl = 1 F, plus the plain R || C it reduces to when Rm = 0
      draw(gD, ws.map(function (w) { return M11.parallel(M11.zR(R), M11.zC(1, w)); }), Fs[3], P[3].b, 'var(--text)', 1.2, '4 4');
      if (rp > 0) {
        draw(gD, ws.map(function (w) { return M11.zPorous(rp, R, 1, w); }), Fs[3], P[3].b, 'var(--cyan)', 2.4);
        var c = Math.sqrt(rp * R) / Math.tanh(Math.sqrt(rp / R)); el('circle', { cx: Fs[3].X(c * 1000), cy: P[3].b.y0, r: 3.5, fill: 'var(--cyan)' }, gD);
        txt(gD, Fs[3].X(0.3), Fs[3].Y(8.4), 'dot: the DC end', 'cyan', 'start');
      }
      read.innerHTML = 'A: n = <b>' + n.toFixed(2) + '</b>; n = 1 is a capacitor, n = 0.5 a Warburg line, n = 0 a resistor. D: pore resistance R<sub>m</sub> = <b>' + (rp * 1000).toFixed(0) + ' mΩ</b>' + (rp > 0 ? '; the arc starts with a 45° line and ends at √(R<sub>m</sub>R<sub>ct</sub>) coth √(R<sub>m</sub>/R<sub>ct</sub>) = ' + (Math.sqrt(rp * R) / Math.tanh(Math.sqrt(rp / R)) * 1000).toFixed(1) + ' mΩ (the dot), not at R<sub>ct</sub> = 10 mΩ.' : ': no pore resistance, the plain semicircle.');
    }
    on(sn, 'input', render); on(sr, 'input', render);
    steps(fig, [
      { text: '<b>Depressed arcs.</b> Real interfaces are not ideal capacitors. A constant phase element, Z = 1/(Y₀(jω)ⁿ), with n a little below 1 sinks the centre of the semicircle below the axis by 90°(1 − n). Its physical origin is still debated; treat n as a measure of non-ideality, not a fact about the surface.' },
      { text: '<b>Diffusion into a layer of finite thickness.</b> At high frequency the lithium does not reach the far side: the 45° Warburg line. Lower down it does. If the far side lets lithium through (open), the line bends back to the axis in an arc (tanh form); if it is closed, as at the back of an active particle, the line turns vertical, like a capacitor (coth form).' },
      { text: '<b>Particles are spheres.</b> With the same diffusion resistance R<sub>d</sub> and capacitance C<sub>d</sub>, a film turns vertical at R<sub>d</sub>/3 and a sphere at R<sub>d</sub>/15, and the sphere turns upward sooner. Fitting a film model to a cell of spheres misreads R<sub>d</sub>, and with it D = r²/(R<sub>d</sub>C<sub>d</sub>).' },
      { text: '<b>A porous electrode</b> is a ladder: electrolyte resistance down each pore, an interface on every grain. With pore resistance R<sub>m</sub> the arc starts with a 45° line at high frequency and grows wider. Slide R<sub>m</sub> to 0 and the plain semicircle returns.' }
    ]);
    render();
  });
