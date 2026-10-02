  /* =================================================================
     Module 11, GITT (11.3 to 11.7). One titration step on a thin film
     (Kim et al. 2022, R67, eqs 3-16), the two straight-line assumptions
     and the dimensionless pulse length (Kang and Chueh 2021, R66, eq 5),
     six ways to compute D from one pulse (Nickol et al. 2020, R68, eqs
     10-12 and procedures P1-P6), the relaxation analysis on
     sqrt(t + tau) - sqrt(t) (R66 eq 4), and a whole run with
     quasi-equilibrium voltages, overpotentials and resistances (R67 eqs
     17-19; Abbas et al. 2025, R69). Physics in Physics.m11.
     ================================================================= */

  /* ===== 11.3 One titration step, inside and outside the film ===== */
  register('f11-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var Lm = 2e-6, D = 1e-15, T = Lm * Lm / D, tau = 600, tEnd = 4800, sim = M11.gittSlab({ tau: tau / T, tEnd: tEnd / T, N: 61, steps: 960, frames: 240 });
    var E1 = 3.900, IR = 0.015, k = 0.010 / (tau / T); // k: volts per unit of surface change, so that the settled step dEs is 10 mV
    function E(i) { var t = sim.t[i] * T; return E1 + (t < tau ? IR : 0) + k * sim.us[i]; }
    // film panel
    var fx0 = 58, fx1 = 210, fy0 = 64, fy1 = 236, c0y = 92, sc = 150;
    el('rect', { x: 20, y: fy0, width: fx0 - 20, height: fy1 - fy0, fill: 'var(--cyan)', 'fill-opacity': '.08' }, g);
    el('rect', { x: fx0, y: fy0, width: fx1 - fx0, height: fy1 - fy0, rx: 2, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    el('rect', { x: fx1, y: fy0, width: 12, height: fy1 - fy0, fill: 'var(--metal, #8a9aa0)', 'fill-opacity': '.7' }, g);
    txt(g, 39, fy0 - 8, 'electrolyte', '', 'middle'); txt(g, (fx0 + fx1) / 2, fy0 - 28, 'active film, 2 µm', 'strong', 'middle'); txt(g, (fx0 + fx1) / 2, fy0 - 8, 'lithium content', '', 'middle');
    txt(g, fx0 + 2, fy1 + 16, 'surface', '', 'start'); txt(g, fx1 + 12, fy1 + 16, 'back, no flux', '', 'end');
    el('line', { x1: fx0, x2: fx1, y1: c0y, y2: c0y, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
    var prof = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    var flux = arrow(g, fx0 - 4, 150, 26, 150, '#F0B441', 2, 'force-arrow');
    var ion = ourIon(g, fx0 - 6, 176, 5, 'our ion', true);
    // voltage panel
    var b = { x0: 286, y0: 214, x1: 488, y1: 44 }, vlo = 3.890, vhi = 3.950;
    var X = function (t) { return b.x0 + t / tEnd * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - (v - vlo) / (vhi - vlo) * (b.y0 - b.y1); };
    e11axes(g, b, { X: X, Y: Y, xt: [[0, '0'], [600, '10'], [1800, '30'], [3600, '60'], [4800, '80 min']], yt: [[3.90, '3.90'], [3.92, '3.92'], [3.94, '3.94']], grid: true, ylab: 'cell voltage, V' });
    var bc = { y0: 262, y1: 236 }, IY = function (on) { return on ? bc.y1 : bc.y0; };
    el('line', { x1: b.x0, x2: b.x1, y1: bc.y0, y2: bc.y0, stroke: 'var(--line-2)' }, g); txt(g, b.x0 - 7, bc.y1 + 4, 'I', 'cyan', 'end'); txt(g, b.x0 - 7, bc.y0 + 4, '0', '', 'end');
    el('path', { d: 'M' + b.x0 + ',' + bc.y0 + ' V' + bc.y1 + ' H' + X(tau) + ' V' + bc.y0 + ' H' + b.x1, fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.8 }, g);
    var vfull = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.2, 'stroke-opacity': '.25' }, g), vpath = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    var all = sim.t.map(function (t, i) { return [X(t * T), Y(E(i))]; }); vfull.setAttribute('d', e11d(all));
    var iEnd = sim.t.findIndex(function (t) { return t * T >= tau; }) - 1, E2 = E1 + IR + k * sim.us[1] * 0, E3 = E(iEnd), E4 = E(sim.t.length - 1);
    // E markers and brackets
    var mk = el('g', {}, g);
    [[0, E1, 'E₁', 'start', 7, 16], [0, E1 + IR, 'E₂', 'start', 7, -6], [tau, E3, 'E₃', 'start', 6, -6], [tEnd, E4, 'E₄', 'end', -6, -6]].forEach(function (m) { el('circle', { cx: X(m[0]), cy: Y(m[1]), r: 3, fill: 'var(--text)' }, mk); txt(mk, X(m[0]) + m[4], Y(m[1]) + m[5], m[2], 'strong', m[3]); });
    el('path', { d: 'M' + (X(tau) + 26) + ',' + Y(E1 + IR) + ' h6 V' + Y(E3) + ' h-6', fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.6 }, mk); txt(mk, X(tau) + 36, (Y(E1 + IR) + Y(E3)) / 2 + 4, 'ΔEₜ', 'heat', 'start');
    el('path', { d: 'M' + (X(tEnd) - 30) + ',' + Y(E1) + ' h6 V' + Y(E4) + ' h-6', fill: 'none', stroke: '#C4B5F7', 'stroke-width': 1.6 }, mk); var tes = txt(mk, X(tEnd) - 34, (Y(E1) + Y(E4)) / 2 + 4, 'ΔEₛ', '', 'end'); tes.style.fill = '#C4B5F7';
    el('line', { x1: X(0), x2: X(tEnd), y1: Y(E1), y2: Y(E1), stroke: 'var(--line-2)', 'stroke-dasharray': '2 4' }, mk);
    var cur = el('line', { y1: b.y1, y2: bc.y0, stroke: 'var(--text)', 'stroke-dasharray': '3 3', 'stroke-opacity': '.6' }, g);
    badge(g, fx0 + 16, c0y + 26, 1); badge(g, X(tau / 2), bc.y1 + 13, 2); badge(g, X(2400), Y(E4) - 22, 3); badge(g, X(tau) + 84, (Y(E1 + IR) + Y(E3)) / 2, 4);
    var dEs = E4 - E1, dEt = E3 - (E1 + IR), Dwh = 4 / (Math.PI * tau) * Lm * Lm * (dEs / dEt) * (dEs / dEt);
    var fi = 0, ion0 = 0;
    function place(t) {
      var i = Math.min(sim.t.length - 1, Math.round(t / tEnd * (sim.t.length - 1))), fr = sim.frames[Math.min(sim.frames.length - 1, Math.round(t / tEnd * (sim.frames.length - 1)))], u = fr.u, pts = [];
      for (var j = 0; j < u.length; j++) pts.push([fx0 + j / (u.length - 1) * (fx1 - fx0), c0y + u[j] * sc]);
      prof.setAttribute('d', e11d(pts));
      vpath.setAttribute('d', e11d(all.slice(0, i + 1)));
      cur.setAttribute('x1', X(t)); cur.setAttribute('x2', X(t));
      var onI = t > 0 && t <= tau; flux.style.display = onI ? '' : 'none'; ion.g.style.display = onI ? '' : 'none';
      var depl = (u[0] - u[u.length - 1]) / (u[u.length - 1] + 1e-9);
      read.innerHTML = (t <= 0 ? '<b>Before the pulse</b>: the film is in equilibrium, the same lithium content everywhere, at voltage E₁. ' : onI ? '<b>Current on</b> (' + e11time(t) + ' of a 10 min pulse): lithium leaves through the surface faster than it arrives from inside, so the surface runs ahead of the interior and the voltage rises with it. '
        : t < tau + 120 ? '<b>Current off</b>: the IR step disappears at once; the lithium left inside now spreads out and the profile flattens. '
          : '<b>Resting</b> (' + e11time(t - tau) + ' after the pulse): the profile is ' + (Math.abs(u[0] - u[u.length - 1]) < 0.01 ? 'flat again: the film is back in equilibrium at a slightly lower lithium content. ' : 'still flattening. '))
        + 'From this step: ΔEₛ = ' + (dEs * 1000).toFixed(1) + ' mV, ΔEₜ = ' + (dEt * 1000).toFixed(1) + ' mV, so the Weppner–Huggins formula gives D = <b>' + sci(Dwh * 1e4, 2) + ' cm²/s</b>; the film in the model has ' + sci(D * 1e4, 1) + ' cm²/s.';
    }
    var t = 0;
    steps(fig, [
      { text: 'Before the pulse the film is in equilibrium: the same lithium content everywhere (dashed line), voltage E₁. GITT starts from rest, every time.', on: function () { if (!(loop && loop.running())) { t = 0; place(t); } } },
      { text: 'Switch on a small constant current for a short time τ (here 10 min). The voltage jumps by the IR drop, E₁ → E₂, then climbs as lithium is pulled from the surface faster than diffusion refills it (E₂ → E₃). Lithium flux in or out at the surface is the cause.', on: function () { if (!(loop && loop.running())) { t = tau; place(t); } } },
      { text: 'Switch off. The IR drop vanishes at once, and the depleted surface is refilled from inside: the profile flattens and the voltage relaxes to E₄, a new equilibrium a little above E₁.', on: function () { if (!(loop && loop.running())) { t = tEnd; place(t); } } },
      { text: 'Two numbers come out. ΔEₛ = E₄ − E₁ is a step along the equilibrium (open-circuit) curve; ΔEₜ = E₃ − E₂ is how far the surface ran ahead during the pulse. The slower the diffusion, the larger ΔEₜ is compared with ΔEₛ. Their ratio, the pulse length and the sample size give D.', on: function () { if (!(loop && loop.running())) { t = tEnd; place(t); } } }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; var sp = t < tau + 300 ? 160 : 900; t += dt * sp; if (t > tEnd) t = 0; place(t); var s = (Date.now() / 900) % 1; ion.move(fx0 - 6 - s * 26, 176); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) t = tau; place(t);
    bind(fig, loop);
  });

  /* ===== 11.4 Two straight lines, one number: when the formula holds ===== */
  register('f11-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.ptau'), sv = fig.querySelector('.ptau-val');
    var Lm = 2e-6, D = 1e-15, T = Lm * Lm / D, geo = e11modes(fig, function (m) { geo = m; render(); });
    function surf(th) { return geo === 'sphere' ? M11.sphereF(th) : M11.slabSurface(th); }
    function ratio(th) { var f = surf(th), mean = geo === 'sphere' ? 3 * th : th, Lf = geo === 'sphere' ? 1 / 3 : 1; return 4 / (Math.PI * th) * Lf * Lf * (mean / f) * (mean / f); }
    // left: E - E2 against sqrt(t)
    var a = { x0: 60, y0: 230, x1: 236, y1: 44 }, r = { x0: 300, y0: 230, x1: 505, y1: 44 };
    var gl = el('g', {}, g), gr = el('g', {}, g);
    var curve = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, gl), ideal = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }, gl), axl = el('g', {}, gl);
    // right: D(Weppner-Huggins)/D against tau_hat
    var XR = function (th) { return e11log(th, -3, 0, r.x0, r.x1); }, YR = function (q) { return r.y0 - q / 1.2 * (r.y0 - r.y1); };
    e11axes(gr, r, { X: XR, Y: YR, xt: [[0.001, '0.001'], [0.01, '0.01'], [0.1, '0.1'], [1, '1']], yt: [[0, ''], [0.5, '0.5'], [1, '1']], grid: true, xlab: 'D τ / L² (dimensionless pulse)', ylab: 'D from the formula ÷ true D' });
    var cP = [], cS = []; for (var k = 0; k <= 90; k++) { var th = Math.pow(10, -3 + 3 * k / 90); var f1 = M11.slabSurface(th), f3 = M11.sphereF(th); cP.push([XR(th), YR(4 / (Math.PI * th) * (th / f1) * (th / f1))]); cS.push([XR(th), YR(4 / (Math.PI * th) * (1 / 9) * (3 * th / f3) * (3 * th / f3))]); }
    el('path', { d: e11d(cP), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2 }, gr); el('path', { d: e11d(cS), fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2 }, gr);
    txt(gr, XR(0.0012), YR(1) - 8, 'planar film', 'cyan', 'start'); txt(gr, XR(0.0012), YR(0.86) + 18, 'sphere', 'heat', 'start');
    [[0.25, 'cyan'], [0.025, 'heat']].forEach(function (q) { el('line', { x1: XR(q[0]), x2: XR(q[0]), y1: r.y1, y2: r.y0, stroke: q[1] === 'cyan' ? 'var(--cyan)' : 'var(--heat)', 'stroke-dasharray': '3 4', 'stroke-opacity': '.7' }, gr); });
    txt(gr, XR(0.25) - 4, YR(0.2), 'film limit', 'cyan', 'end'); txt(gr, XR(0.025) - 4, YR(0.1), 'sphere limit', 'heat', 'end');
    var mark = el('circle', { r: 6, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, gr);
    badge(g, a.x0 + 30, a.y1 + 22, 1); badge(g, a.x1 - 12, a.y1 + 50, 2); badge(g, XR(0.25) + 16, YR(1.1), 3);
    function render() {
      var tmin = +sl.value, tau = tmin * 60, th = tau / T, f = surf(th), q = ratio(th); setSvgText(sv, tmin + ' min');
      clear(axl);
      var smax = Math.sqrt(tau), ymax = Math.max(f, 2 * Math.sqrt(th / Math.PI)) * 1.1, X = function (s) { return a.x0 + s / smax * (a.x1 - a.x0); }, Y = function (u) { return a.y0 - u / ymax * (a.y0 - a.y1); };
      e11axes(axl, a, { X: X, Y: Y, xt: [[0, '0'], [smax, Math.round(smax) + '']], yt: [[0, '0']], xlab: '√t, √s', ylab: 'E − E₂ (diffusion part)' });
      var pts = [], idl = []; for (var j = 0; j <= 60; j++) { var s = smax * j / 60, tt = s * s / T; pts.push([X(s), Y(surf(tt))]); idl.push([X(s), Y(2 * Math.sqrt(tt / Math.PI))]); }
      curve.setAttribute('d', e11d(pts)); ideal.setAttribute('d', e11d(idl));
      mark.setAttribute('cx', XR(Math.min(1, Math.max(1e-3, th)))); mark.setAttribute('cy', YR(Math.min(1.2, q)));
      var lim = geo === 'sphere' ? 0.025 : 0.25;
      read.innerHTML = 'A ' + tmin + ' min pulse on a ' + (geo === 'sphere' ? 'particle of radius 2 µm' : 'film 2 µm thick') + ' with D = 1 × 10⁻¹¹ cm²/s: Dτ/L² = <b>' + th.toFixed(3) + '</b>. The formula returns <b>' + q.toFixed(2) + ' × the true D</b>' + (th <= lim ? ', inside the safe range (below ' + lim + ').' : ': the pulse is too long. Lithium has felt the far side of the ' + (geo === 'sphere' ? 'particle' : 'film') + ', the voltage no longer climbs as √t, and D comes out too small.');
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'The formula rests on two straight lines (Kim et al.). First: during a short pulse the diffusion part of the voltage grows as <b>√t</b> (dashed line), because only a thin layer near the surface has been disturbed.' },
      { text: 'Second: the step ΔEₛ is small enough that the equilibrium curve is straight over it. When both hold, ΔEₛ/ΔEₜ, the pulse length τ and the sample size give D. Lengthen the pulse and watch the amber curve leave the dashed √t line.' },
      { text: 'How long is “short”? The number that decides is Dτ/L², the pulse length in units of the time diffusion needs to cross the sample. Kang and Chueh recommend below 0.25 for a flat film and ten times less for spheres; most published GITT studies use longer pulses than that.' }
    ]);
    render();
  });

  /* ===== 11.5 Six recipes, one pulse ===== */
  register('f11-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.tdl'), sv = fig.querySelector('.tdl-val'), cb = fig.querySelector('.rctfall');
    var rP = 5e-6, D = 1e-15, tp = 1800, Tsc = rP * rP / D, thp = tp / Tsc, dEs = 0.010, Kd = dEs / (3 * thp), etaO = 0.005, etaC = 0.020;
    var radius = e11modes(fig, function (m) { radius = m; render(); });
    var tdl = 1, fall = false;
    function E(t) { // the measured potential, relative to E0, in volts
      var th = t / Tsc;
      if (t <= tp) { var rf = fall ? 1 - 0.4 * t / tp : 1; return etaO + etaC * rf * (1 - Math.exp(-t / tdl)) + Kd * M11.sphereF(th); }
      var rfe = fall ? 0.6 : 1, ctEnd = etaC * rfe * (1 - Math.exp(-tp / tdl));
      return ctEnd * Math.exp(-(t - tp) / tdl) + Kd * M11.sphereSurface(th, thp);
    }
    function linfit(xs, ys) { var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0; for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; } var m = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { m: m, c: (sy - m * sx) / n, sse: ys.reduce(function (s, y, i) { var e = y - (m * xs[i] + (sy - m * sx) / n); return s + e * e; }, 0) }; }
    function fitFull(t0) { // P5/P6: fit E = a + (Kd D/D') f(D' t/r^2) for t in [t0, tp]
      var ts = []; for (var t = Math.max(1, t0); t <= tp; t += 5) ts.push(t); var ys = ts.map(E);
      function sse(l) { var Dp = Math.pow(10, l), amp = Kd * D / Dp, fx = ts.map(function (t) { return amp * M11.sphereF(Dp * t / (rP * rP)); }), a = 0; for (var i = 0; i < ts.length; i++) a += ys[i] - fx[i]; a /= ts.length; var s = 0; for (i = 0; i < ts.length; i++) { var e = ys[i] - fx[i] - a; s += e * e; } return s; }
      var lo = -18, hi = -12, gr = 0.618; for (var it = 0; it < 60; it++) { var m1 = hi - gr * (hi - lo), m2 = lo + gr * (hi - lo); if (sse(m1) < sse(m2)) hi = m2; else lo = m1; } return Math.pow(10, (lo + hi) / 2);
    }
    // top: E - E0 against sqrt(t)
    var a = { x0: 60, y0: 196, x1: 500, y1: 42 }, smax = Math.sqrt(tp), ymax = 0.06;
    var X = function (s) { return a.x0 + s / smax * (a.x1 - a.x0); }, Y = function (v) { return a.y0 - v / ymax * (a.y0 - a.y1); };
    el('rect', { x: X(0), y: a.y1, width: X(Math.sqrt(360)) - X(0), height: a.y0 - a.y1, fill: 'var(--cyan)', 'fill-opacity': '.06' }, g);
    e11axes(g, a, { X: X, Y: Y, xt: [[0, '0'], [Math.sqrt(360), '√360'], [Math.sqrt(900), '√900'], [Math.sqrt(1800), '√1800']], yt: [[0, '0'], [0.02, '20'], [0.04, '40'], [0.06, '60']], grid: true, xlab: '√t, with t in s', ylab: 'E − E₀ during the pulse, mV' });
    txt(g, X(Math.sqrt(360)) - 4, a.y1 + 14, 'first 360 s', 'cyan', 'end');
    var cE = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), l3 = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g), l4a = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.3, 'stroke-opacity': '.6' }, g), l4b = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2 }, g);
    var e1 = el('circle', { r: 4, fill: 'var(--text)' }, g), e1t = txt(g, 0, 0, 'E₁ (5 s)', 'strong', 'start');
    // bottom: bars on a log axis
    var bb = { x0: 70, y0: 414, x1: 500, y1: 266 }, YB = function (q) { return bb.y0 - (Math.log10(q) + 4) / 5 * (bb.y0 - bb.y1); };
    e11axes(g, bb, { X: function (x) { return x; }, Y: YB, yt: [[1e-4, '10⁻⁴'], [1e-3, '10⁻³'], [0.01, '0.01'], [0.1, '0.1'], [1, '1'], [10, '10']], grid: true, ylab: 'D from the recipe ÷ true D' });
    el('line', { x1: bb.x0, x2: bb.x1, y1: YB(1), y2: YB(1), stroke: 'var(--text)', 'stroke-width': 1.4 }, g);
    var names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], bars = names.map(function (n, i) { var x = bb.x0 + 14 + i * 70; txt(g, x + 22, bb.y0 + 16, n, 'strong', 'middle'); return { r: el('rect', { x: x, width: 44, fill: i === 3 || i === 5 ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': '.8' }, g), t: txt(g, x + 22, 0, '', '', 'middle') }; });
    badge(g, X(Math.sqrt(5)) + 14, Y(E(5)) - 30, 1); badge(g, X(Math.sqrt(200)), a.y1 + 30, 2); badge(g, bb.x1 - 12, YB(1) - 14, 3);
    function render() {
      tdl = Math.pow(10, +sl.value); fall = cb.checked; setSvgText(sv, tdl < 1 ? tdl.toFixed(1) + ' s' : Math.round(tdl) + ' s');
      var pts = []; for (var k = 0; k <= 160; k++) { var s = smax * k / 160; pts.push([X(s), Y(E(Math.min(tp, s * s)))]); } cE.setAttribute('d', e11d(pts));
      var E4 = E(tp + 14400), E1 = E(5), E2 = E(tp), E3 = E(tp + 5);
      e1.setAttribute('cx', X(Math.sqrt(5))); e1.setAttribute('cy', Y(E1)); e1t.setAttribute('x', X(Math.sqrt(5)) + 8); e1t.setAttribute('y', Y(E1) + 16);
      var c = 4 / (9 * Math.PI) * rP * rP / tp, est = [];
      est.push(c * Math.pow(E4 / (E2 - E1), 2)); // P1, Nickol eq 11
      est.push(c * Math.pow(E4 / (E3), 2)); // P2, eq 12 (E0 = 0)
      var xs = [], ys = []; for (var t = 1; t <= 360; t += 1) { xs.push(Math.sqrt(t)); ys.push(E(t)); }
      var f3 = linfit(xs, ys); est.push(4 / (9 * Math.PI) * Math.pow(rP / tp * E4 / f3.m, 2)); // P3, eq 10
      var best = null; for (var kb = 5; kb < xs.length - 20; kb += 2) { var A = linfit(xs.slice(0, kb), ys.slice(0, kb)), B = linfit(xs.slice(kb), ys.slice(kb)); if (!best || A.sse + B.sse < best.s) best = { s: A.sse + B.sse, k: kb, A: A, B: B }; }
      est.push(4 / (9 * Math.PI) * Math.pow(rP / tp * E4 / best.B.m, 2)); // P4, two-line fit
      var tTR = xs[best.k] * xs[best.k];
      est.push(fitFull(1)); est.push(fitFull(tTR)); // P5, P6
      l3.setAttribute('d', e11d([[X(0), Y(f3.c)], [X(Math.sqrt(900)), Y(f3.c + f3.m * Math.sqrt(900))]]));
      l4a.setAttribute('d', e11d([[X(0), Y(best.A.c)], [X(xs[best.k]), Y(best.A.c + best.A.m * xs[best.k])]]));
      l4b.setAttribute('d', e11d([[X(xs[best.k] * 0.6), Y(best.B.c + best.B.m * xs[best.k] * 0.6)], [X(Math.sqrt(900)), Y(best.B.c + best.B.m * Math.sqrt(900))]]));
      var sc = radius === 'primary' ? Math.pow(0.25 / 5, 2) : 1;
      est.forEach(function (d, i) { var q = Math.max(1.2e-4, Math.min(9, d / D * sc)), y = YB(q), y1 = YB(1); bars[i].r.setAttribute('y', Math.min(y, y1)); bars[i].r.setAttribute('height', Math.max(1.5, Math.abs(y1 - y))); bars[i].t.setAttribute('y', (q >= 1 ? y - 6 : y + 16)); setSvgText(bars[i].t, (d / D * sc) >= 0.1 ? (d / D * sc).toFixed(2) : sci(d / D * sc, 1)); });
      var lo = Math.min.apply(null, est), hi = Math.max.apply(null, est);
      read.innerHTML = 'One simulated pulse, six recipes. They span a factor of <b>' + (hi / lo).toFixed(1) + '</b>' + (radius === 'primary' ? ', and referring the same data to 0.25 µm primary particles instead of 5 µm secondary particles divides every value by <b>400</b> (D scales with r²).' : '. P4 and P6 (cyan) leave out the start of the pulse, where the double layer is still charging.') + (fall ? ' With the charge-transfer resistance falling during the pulse, the voltage climbs more slowly late in the pulse, and the full fits (P5, P6) overestimate D.' : '');
    }
    on(sl, 'input', render); on(cb, 'change', render);
    steps(fig, [
      { text: 'A GITT pulse on a cathode of 5 µm particles with D = 10⁻¹¹ cm²/s, simulated with the spherical solution (Nickol et al.). Before diffusion shows, the IR drop is the ohmic part, instant, plus the charge-transfer part, which arrives only as the double layer charges, with time constant τ<sub>dl</sub> = R<sub>ct</sub>C<sub>dl</sub>.' },
      { text: 'P1 and P2 need the IR drop, read 5 s after switching. P3 fits one straight line to E against √t over the first 360 s; P4 fits two and keeps the second, so the double-layer transition is left out. P5 fits the whole pulse with the spherical solution; P6 does the same after the transition. Slide τ<sub>dl</sub> from 1 s to 100 s, as when the cell is cold.' },
      { text: 'The truth is the line at 1. At warm temperatures (τ<sub>dl</sub> below 1 s) the recipes agree within a few times; when the double layer charges slowly they spread by more than ten. Nickol et al. found exactly this on NMC523 and recommend P4 or P6 with τ<sub>dl</sub> measured by impedance, a three-electrode cell and a check with a second current.' }
    ]);
    render();
  });

  /* ===== 11.6 Read the rest, not the pulse ===== */
  register('f11-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.that'), sv = fig.querySelector('.that-val'), cR = fig.querySelector('.rfall'), cF = fig.querySelector('.fast');
    var a = { x0: 56, y0: 232, x1: 236, y1: 48 }, r = { x0: 312, y0: 232, x1: 505, y1: 48 };
    var gl = el('g', {}, g), gr = el('g', {}, g);
    txt(g, (a.x0 + a.x1) / 2, 20, 'during the pulse', 'strong', 'middle'); txt(g, (r.x0 + r.x1) / 2, 20, 'during the rest', 'strong', 'middle');
    badge(g, a.x0 + 22, a.y1 + 4, 1); badge(g, r.x0 + 0.45 * (r.x1 - r.x0), r.y0 - 20, 2); badge(g, r.x1 - 14, r.y0 - 20, 3);
    function linfit(xs, ys) { var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0; for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; } var m = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { m: m, c: (sy - m * sx) / n }; }
    function render() {
      var th = Math.pow(10, +sl.value), rfall = cR.checked, fast = cF.checked; setSvgText(sv, th < 0.01 ? th.toFixed(3) : th.toFixed(2));
      var k = 0.020 / (2 * Math.sqrt(th / Math.PI)), IR0 = 0.040, aF = 0.006, te = th / 40; // volts; diffusion rise 20 mV in an ideal pulse
      function Ep(t) { return IR0 * (rfall ? 1 - 0.17 * t / th : 1) + k * M11.slabSurface(t) + (fast ? aF * (1 - Math.exp(-t / te)) : 0); }
      function Vr(tr) { return k * (M11.slabSurface(tr + th) - M11.slabSurface(tr) - th) + (fast ? aF * Math.exp(-tr / te) : 0); }
      clear(gl); clear(gr);
      // pulse panel: E - E(0+) against sqrt(t)
      var sm = Math.sqrt(th), ps = [], xs = [], ys = [];
      for (var j = 0; j <= 80; j++) { var s = sm * j / 80, t = s * s; ps.push([s, Ep(t) - Ep(0)]); if (j >= 4) { xs.push(s); ys.push(Ep(t) - Ep(0)); } }
      var ymax = Math.max(0.03, ps[ps.length - 1][1] * 1.15), XL = function (s) { return a.x0 + s / sm * (a.x1 - a.x0); }, YL = function (v) { return a.y0 - (v + 0.008) / (ymax + 0.008) * (a.y0 - a.y1); };
      e11axes(gl, a, { X: XL, Y: YL, xt: [[0, '0'], [sm, '√τ']], yt: [[0, '0'], [0.02, '20']], xlab: '√t', ylab: 'E − E(0⁺), mV' });
      el('path', { d: e11d(ps.map(function (p) { return [XL(p[0]), YL(p[1])]; })), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, gl);
      var fp = linfit(xs, ys); el('path', { d: e11d([[XL(0), YL(fp.c)], [XL(sm), YL(fp.c + fp.m * sm)]]), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, gl);
      var ideal = k * 2 / Math.sqrt(Math.PI), qPulse = Math.pow(ideal / fp.m, 2);
      // rest panel: V - Veq against sqrt(tr + tau) - sqrt(tr)
      var rs = [], rx = [], ry = [], nx = [], ny = [], w0 = 0.15, w1 = 0.75;
      for (j = 0; j <= 160; j++) { var tr = th * Math.pow(10, -4 + 6 * j / 160), xv = Math.sqrt(tr + th) - Math.sqrt(tr), v = Vr(tr); rs.push([xv / sm, v]); if (xv / sm > w0 && xv / sm < w1) { rx.push(xv); ry.push(v); } if (tr <= th * 0.2) { nx.push(Math.sqrt(tr)); ny.push(v); } }
      var ymr = Math.max(0.03, Vr(0) * 1.1), XR = function (q) { return r.x0 + q * (r.x1 - r.x0); }, YR = function (v) { return r.y0 - (v + 0.004) / (ymr + 0.004) * (r.y0 - r.y1); };
      e11axes(gr, r, { X: XR, Y: YR, xt: [[0, '0'], [1, '√τ']], yt: [[0, '0'], [0.02, '20']], xlab: '√(t + τ) − √t, t = time at rest', ylab: 'E − E_eq, mV' });
      el('rect', { x: XR(w0), y: r.y1, width: XR(w1) - XR(w0), height: r.y0 - r.y1, fill: 'var(--cyan)', 'fill-opacity': '.06' }, gr);
      el('path', { d: e11d(rs.map(function (p) { return [XR(p[0]), YR(p[1])]; })), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, gr);
      var fr = linfit(rx, ry); el('path', { d: e11d([[XR(0), YR(fr.c)], [XR(1), YR(fr.c + fr.m * sm)]]), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }, gr);
      txt(gr, XR((w0 + w1) / 2), r.y1 + 14, 'fit here', 'cyan', 'middle');
      var qRelax = Math.pow(ideal / fr.m, 2), fn = linfit(nx, ny), qNaive = Math.pow(ideal / Math.abs(fn.m), 2);
      read.innerHTML = 'Dτ/L² = ' + th.toFixed(3) + '. D from the pulse slope: <b>' + qPulse.toFixed(2) + ' × true</b>; from the early rest against √t: ' + qNaive.toFixed(2) + ' ×; from the rest against √(t + τ) − √t: <b>' + qRelax.toFixed(2) + ' × true</b>.' + (rfall ? ' The resistance falling by 17 % during the pulse corrupts only the pulse value.' : '') + (fast ? ' The fast surface process sits at the start of the rest, outside the fitting region.' : '');
    }
    on(sl, 'input', render); on(cR, 'change', render); on(cF, 'change', render);
    steps(fig, [
      { text: 'During the pulse the voltage holds the IR drop, R<sub>tot</sub>I, on top of the diffusion signal. If R<sub>tot</sub> changes during the pulse, as charge-transfer resistance does with lithium content, the √t slope changes too: tick “resistance falls 17 %” and the pulse gives D about four times too large (Kang and Chueh).' },
      { text: 'During the rest no current flows, so no IR drop can drift. Kang and Chueh solved the rest after a pulse: plotted against √(t + τ) − √t, with t the time at rest, the voltage is a straight line whose slope gives D, without needing the final equilibrium voltage.' },
      { text: 'Fast processes that are not bulk diffusion, such as a surface layer, sit at the very start of the rest (the right-hand end of the plot); the finite size of the sample bends the very end (near zero). Fit the straight part between them (shaded), which for a short pulse lasts up to about ten pulse lengths of rest. Lengthen the pulse and it shrinks. Their checklist adds large, dense, single-phase samples and at least three pulse sizes.' }
    ]);
    render();
  });

  /* ===== 11.7 A whole run: voltages, overpotentials, resistances and D ===== */
  register('f11-7', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cbR = fig.querySelector('.longrest');
    var mode = e11modes(fig, function (m) { mode = m; render(); });
    var N = 16, x0 = 0.1, dx = 0.05, tp = 600, rP = 2e-6, I = 0.5e-3;
    function Eeq(x) { return 3.55 + 0.6 * x + 0.04 * Math.sin(2 * Math.PI * x); }
    function Dx(x) { return 3e-17 * Math.pow(10, 0.7 * Math.sin(Math.PI * x)); } // keeps D tau / r^2 below 0.025 (figure 11.4)
    function IRx(x) { return 0.010 + 0.040 * Math.exp(-(x - 0.1) / 0.08); }
    var a = { x0: 60, y0: 186, x1: 500, y1: 40 }, b = { x0: 60, y0: 390, x1: 500, y1: 246 };
    var top = el('g', {}, g), bot = el('g', {}, g);
    txt(g, 280, 16, 'cell voltage through 16 titration steps (rests drawn shorter)', 'strong', 'middle');
    badge(g, a.x0 + 24, a.y1 + 50, 1); badge(g, b.x1 - 12, b.y1 + 12, 2);
    function sim(trest) {
      var steps = [], xNow = x0, qPrev = Eeq(x0);
      for (var n = 0; n < N; n++) {
        var x = xNow + dx / 2, D = Dx(x), Tsc = rP * rP / D, thp = tp / Tsc, slope = 0.6 + 0.04 * 2 * Math.PI * Math.cos(2 * Math.PI * x), IR = IRx(x), amp = slope * dx / (3 * thp), base = qPrev;
        var Ep = function (t) { return base + (t <= tp ? IR : 0) + amp * M11.sphereSurface(t / Tsc, thp); };
        var trace = []; for (var k = 0; k <= 12; k++) trace.push([k / 12 * tp, Ep(k / 12 * tp)]); for (k = 1; k <= 24; k++) { var tt = tp + trest * k / 24; trace.push([tt, Ep(tt)]); }
        var E1 = base, E2 = base + IR, E3 = Ep(tp), E4 = Ep(tp + trest);
        steps.push({ x: xNow + dx, trace: trace, E1: E1, E2: E2, E3: E3, E4: E4, D: D, Dg: M11.gittDSphere(tp, rP, E4 - E1, E3 - E2), eta: E3 - E4 });
        qPrev = E4; xNow += dx;
      }
      return steps;
    }
    function render() {
      var trest = cbR.checked ? 4 * 3600 : 3600, st = sim(trest), sw = (a.x1 - a.x0) / N;
      clear(top); clear(bot);
      var vlo = 3.55, vhi = 4.15, Y = function (v) { return a.y0 - (v - vlo) / (vhi - vlo) * (a.y0 - a.y1); };
      e11axes(top, a, { X: function (x) { return x; }, Y: Y, yt: [[3.6, '3.6'], [3.8, '3.8'], [4.0, '4.0']], grid: true, ylab: 'V' });
      var d = '';
      st.forEach(function (s, n) { var xs = a.x0 + n * sw; s.trace.forEach(function (p, i) { var fx = p[0] <= tp ? p[0] / tp * 0.3 : 0.3 + (p[0] - tp) / trest * 0.7; d += (n + i ? 'L' : 'M') + (xs + fx * sw).toFixed(1) + ',' + Y(p[1]).toFixed(1); }); });
      el('path', { d: d, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.8 }, top);
      st.forEach(function (s, n) { var xs = a.x0 + n * sw; el('circle', { cx: xs + 0.3 * sw, cy: Y(s.E3), r: 2.6, fill: 'var(--heat)' }, top); el('circle', { cx: xs + sw, cy: Y(s.E4), r: 2.6, fill: 'var(--cyan)' }, top); });
      txt(top, a.x1, a.y0 + 16, 'end of each pulse (red) and of each rest (cyan)', '', 'end');
      // bottom panel
      var X = function (x) { return b.x0 + (x - x0) / (N * dx) * (b.x1 - b.x0); };
      if (mode === 'volt') {
        var Yb = function (v) { return b.y0 - (v - vlo) / (vhi - vlo) * (b.y0 - b.y1); };
        e11axes(bot, b, { X: X, Y: Yb, xt: [[0.1, '0.1'], [0.5, '0.5'], [0.9, '0.9']], yt: [[3.6, '3.6'], [3.8, '3.8'], [4.0, '4.0']], grid: true, xlab: 'lithium removed, x', ylab: 'V' });
        var eq = []; for (var q = 0; q <= 40; q++) { var xx = x0 + N * dx * q / 40; eq.push([X(xx), Yb(Eeq(xx))]); } el('path', { d: e11d(eq), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }, bot);
        el('path', { d: e11d(st.map(function (s) { return [X(s.x), Yb(s.E4)]; })), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2 }, bot);
        el('path', { d: e11d(st.map(function (s) { return [X(s.x - dx), Yb(s.E3)]; })), fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2 }, bot);
        txt(bot, X(0.62), Yb(Eeq(0.62)) + 24, 'quasi-OCV (end of rest)', 'cyan', 'start'); txt(bot, X(0.12), Yb(4.0), 'closed-circuit (end of pulse)', 'heat', 'start');
      } else if (mode === 'eta') {
        var Ye = function (v) { return b.y0 - v / 0.08 * (b.y0 - b.y1); };
        e11axes(bot, b, { X: X, Y: Ye, xt: [[0.1, '0.1'], [0.5, '0.5'], [0.9, '0.9']], yt: [[0, '0'], [0.04, '40'], [0.08, '80']], grid: true, xlab: 'lithium removed, x', ylab: 'η = CCV − QOCV, mV' });
        el('path', { d: e11d(st.map(function (s) { return [X(s.x - dx / 2), Ye(s.eta)]; })), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.2 }, bot);
        st.forEach(function (s) { el('circle', { cx: X(s.x - dx / 2), cy: Ye(s.eta), r: 3, fill: 'var(--amber)' }, bot); });
        txt(bot, b.x1, b.y1 + 12, 'R = η / I: ' + (st[0].eta / I).toFixed(0) + ' Ω at the start, ' + (st[N - 1].eta / I).toFixed(0) + ' Ω at the end (I = 0.5 mA)', '', 'end');
      } else {
        var Yd = function (v) { return b.y0 - (Math.log10(v) + 17.2) / 2 * (b.y0 - b.y1); };
        e11axes(bot, b, { X: X, Y: Yd, xt: [[0.1, '0.1'], [0.5, '0.5'], [0.9, '0.9']], yt: [[1e-17, '10⁻¹³'], [1e-16, '10⁻¹²']], grid: true, xlab: 'lithium removed, x', ylab: 'D, cm²/s (log)' });
        var tru = []; for (q = 0; q <= 40; q++) { xx = x0 + N * dx * q / 40; tru.push([X(xx), Yd(Dx(xx))]); } el('path', { d: e11d(tru), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }, bot);
        el('path', { d: e11d(st.map(function (s) { return [X(s.x - dx / 2), Yd(Math.max(7e-18, s.Dg))]; })), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2 }, bot);
        st.forEach(function (s) { el('circle', { cx: X(s.x - dx / 2), cy: Yd(Math.max(7e-18, s.Dg)), r: 3, fill: 'var(--cyan)' }, bot); });
        txt(bot, b.x1, b.y1 + 12, 'dashed: D in the model; dots: Weppner–Huggins from each step', '', 'end');
      }
      var days = N * (tp + trest) / 86400;
      read.innerHTML = N + ' steps of 10 min with ' + (trest / 3600) + ' h rests take <b>' + days.toFixed(1) + ' days</b>. ' + (mode === 'volt' ? 'The end-of-rest voltages trace the quasi-equilibrium curve (dashed); the end-of-pulse voltages sit above it by the overpotential.' : mode === 'eta' ? 'The overpotential η = CCV − QOCV, and the internal resistance η/I, are largest where the charge-transfer resistance is (here at the start of charge).' : (cbR.checked ? 'Even with every pulse inside the recommended range, the step values sit 15 to 25 % below the model: the √t law for spheres is only approximate at these pulse lengths (figure 11.4).' : 'Where D is smallest, a 1 h rest was not enough for the voltage to settle; ΔEₛ comes out too large and so does D.'));
    }
    on(cbR, 'change', render);
    steps(fig, [
      { text: 'A GITT run repeats the step of figure 11.3 across the whole charge: pulse, rest, pulse, rest. The voltage at the end of each rest is a <b>quasi-open-circuit voltage</b> (QOCV); joined up, they give the equilibrium curve. The voltage at the end of each pulse is the closed-circuit voltage (CCV).' },
      { text: 'Three products from one run (Kim et al.): the QOCV curve; the overpotential η = |CCV − QOCV| and the internal resistance η/I at each state of charge; and D at each step. Switch the panel below. Untick “4 h rests” to use 1 h rests and see where the voltage had not yet settled.' }
    ]);
    render();
  });
