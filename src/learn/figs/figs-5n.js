  /* =================================================================
     Module 5, the detailed charge and discharge figures: the test bench
     (5.1), battery against capacitor (5.5), the phase rule rebuilt on a
     measured open-circuit curve (5.6), many LiFePO4 particles (5.7), porosity
     and tortuosity (5.8), inside a porous electrode (5.9) and reading a curve
     by its derivatives (5.10).
     Sources: Olson, López and Dickinson 2023 (R60); Moya 2025 (R61); Safari
     and Delacourt 2011 (R59); Doyle, Fuller and Newman 1993 (R62); Winter and
     Brodd 2004 (R1); Landesfeind et al. 2016 (R74). Shared helpers come from figs-45.js and figs-5.js.
     ================================================================= */
  function plotAxes(g, b, o) { // b = {x0, y0, x1, y1}; o = {xlab, ylab, yt: [values], yf: fmt, ylo, yhi}
    el('line', { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0, stroke: 'var(--line-2)' }, g);
    el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, stroke: 'var(--line-2)' }, g);
    (o.yt || []).forEach(function (v) {
      var yy = b.y0 - (v - o.ylo) / (o.yhi - o.ylo) * (b.y0 - b.y1);
      el('line', { x1: b.x0, y1: yy, x2: b.x1, y2: yy, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g);
      txt(g, b.x0 - 5, yy + 4, o.yf ? o.yf(v) : String(v), '', 'end');
    });
    if (o.xlab) txt(g, b.x1, b.y0 + 16, o.xlab, '', 'end');
    if (o.ylab) txt(g, b.x0 + 4, b.y1 - 6, o.ylab, '', 'start');
  }
  function polyD(xs, ys) { var d = ''; for (var i = 0; i < xs.length; i++) d += (i ? 'L' : 'M') + xs[i].toFixed(1) + ',' + ys[i].toFixed(1); return d; }

  /* ===== 5.1 The test bench: constant current, cut-offs, constant voltage ===== */
  register('f5-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val');
    var CAP = 2.0; // Ah, the illustrative cell's low-rate capacity
    // --- the cell and the cycler ---
    var cx0 = 24, cx1 = 242, cy0 = 64, cy1 = 120, xn = 76, xp = 190, xs = 133;
    el('rect', { x: cx0, y: cy0, width: xn - cx0, height: cy1 - cy0, rx: 3, fill: M(rungMat(cell.neg)), stroke: '#2B2E33', 'stroke-opacity': '.4' }, g);
    el('rect', { x: xn, y: cy0, width: xp - xn, height: cy1 - cy0, fill: MV('electrolyte'), stroke: '#9FB3C2' }, g);
    el('rect', { x: xp, y: cy0, width: cx1 - xp, height: cy1 - cy0, rx: 3, fill: M(rungMat(cell.pos)), stroke: '#2B2E33', 'stroke-opacity': '.4' }, g);
    el('rect', { x: xs - 2.5, y: cy0 + 2, width: 5, height: cy1 - cy0 - 4, fill: M('separator'), stroke: '#C4C8BF', 'stroke-width': .6 }, g);
    txt(g, (cx0 + xn) / 2, cy1 + 15, 'negative', '', 'middle'); txt(g, (xn + xp) / 2, cy1 + 15, 'electrolyte', '', 'middle'); txt(g, (xp + cx1) / 2, cy1 + 15, 'positive', '', 'middle');
    var wire = [[50, cy0], [50, 23], [78, 23], [188, 23], [216, 23], [216, cy0]];
    el('path', { d: polyD(wire.map(function (p) { return p[0]; }), wire.map(function (p) { return p[1]; })), fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 2 }, g);
    el('rect', { x: 78, y: 10, width: 110, height: 26, rx: 5, fill: MV('steel'), stroke: '#8B95A0', filter: 'url(#fx-lift)' }, g);
    txt(g, 133, 27, 'cycler', 'strong', 'middle');
    txt(g, 38, 50, '−', 'strong big', 'middle'); txt(g, 228, 50, '+', 'strong big', 'middle');
    var segL = [], wl = 0; for (var i = 1; i < wire.length; i++) { var l = Math.hypot(wire[i][0] - wire[i - 1][0], wire[i][1] - wire[i - 1][1]); segL.push(l); wl += l; }
    function along(s) { s = ((s % 1) + 1) % 1 * wl; for (var k = 0; k < segL.length; k++) { if (s <= segL[k]) { var f = s / segL[k]; return [lerp(wire[k][0], wire[k + 1][0], f), lerp(wire[k][1], wire[k + 1][1], f)]; } s -= segL[k]; } return wire[wire.length - 1]; }
    var eDots = [], liDots = [], NE = 9, NL = 7;
    for (i = 0; i < NE; i++) eDots.push({ s: i / NE, e: el('circle', { r: 3, 'class': 'e-dot' }, g) });
    for (i = 0; i < NL; i++) liDots.push({ s: i / NL, y: cy0 + 9 + (i * 37 % (cy1 - cy0 - 18)), e: el('circle', { r: 3.6, 'class': 'ion' }, g) });
    var arrE = el('g', {}, g), arrL = el('g', {}, g);
    // --- the meter panel ---
    var mx = 270;
    var mPh = txt(g, mx, 26, '', 'strong'), mI = txt(g, mx, 52, '', 'amber big'), mV = txt(g, mx, 76, '', 'cyan big'), mQ = txt(g, mx, 100, '', 'strong'), mT = txt(g, mx, 122, '', '');
    // --- the two plots ---
    var b1 = { x0: 60, y0: 264, x1: 500, y1: 174 }, b2 = { x0: 60, y0: 346, x1: 500, y1: 292 };
    var axV = el('g', {}, g), axI = el('g', {}, g), bands = el('g', {}, g);
    var pV0 = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-opacity': '.35', 'stroke-width': 1.4 }, g), pV = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    var pI0 = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-opacity': '.35', 'stroke-width': 1.4 }, g), pIs = [el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, g), el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g), el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2 }, g)];
    var cur = el('line', { y1: b1.y1, y2: b2.y0, stroke: 'var(--accent)', 'stroke-opacity': '.6' }, g);
    var cutLines = el('g', {}, g);
    badge(g, 133, 52, 1); badge(g, 258, 92, 2); badge(g, 488, 214, 3); badge(g, 488, 302, 4);
    var tr = [], tEnd = 1, sh = 'slope', c = 1, k = 0, phases = ['Discharge at constant current', 'Rest, no current', 'Charge at constant current', 'Charge at constant voltage', 'Rest, no current'];
    function vocB(x) { return model.voc(sh, x) + wallA * Math.exp(-x / 0.015); }
    var wallA = 0;
    function build() {
      sh = shapeOfCell(); c = rateFromSlider(+rate.value); setSvgText(rv, fmtRate(c));
      var cut = model.cut(sh); wallA = Math.max(0, cut.hi + 0.03 - model.voc(sh, 0));
      var x = 0; while (vocB(x) > cut.hi - 0.03 && x < 0.2) x += 0.0005; // the "full" cell rests 30 mV below the upper cut-off
      var xFull = x, dx = 1 / 260, dt = dx / c, t = 0, q0 = x, V;
      tr = [];
      function push(ph, I, V) { tr.push({ t: t, V: V, I: I, x: x, ph: ph, q: CAP * Math.abs(x - q0) }); }
      push(1, 0, vocB(x));
      for (var n = 0; n < 2000; n++) { V = vocB(x) - model.eta(c, x, false).total; if (n && V < cut.lo) break; push(0, -c, V); x += dx; t += dt; if (x > 1.02) break; }
      var tr1 = Math.max(0.12, 0.12 / c), t1 = t; q0 = x;
      for (; t < t1 + tr1; t += tr1 / 30) push(1, 0, vocB(x));
      q0 = x;
      for (n = 0; n < 2000; n++) { V = vocB(x) + model.eta(c, x, true).total; if (V >= cut.hi) break; push(2, c, V); x -= dx; t += dt; }
      q0 = x;
      for (n = 0; n < 4000; n++) { // constant voltage: find the current that holds V at the cut-off
        var lo = 0, hi = c; for (var m = 0; m < 40; m++) { var mid = 0.5 * (lo + hi); if (vocB(x) + model.eta(mid, x, true).total > cut.hi) hi = mid; else lo = mid; }
        push(3, lo, cut.hi); if (lo <= 0.05) break; x -= lo * dt; t += dt;
      }
      var t2 = t; q0 = x;
      for (; t <= t2 + tr1 + 1e-9; t += tr1 / 30) push(4, 0, vocB(x));
      tEnd = t; cutLines.innerHTML = ''; axV.innerHTML = ''; axI.innerHTML = ''; bands.innerHTML = '';
      var vlo = cut.lo - 0.2, vhi = cut.hi + 0.25;
      var X = function (tt) { return b1.x0 + tt / tEnd * (b1.x1 - b1.x0); }, YV = function (v) { return b1.y0 - (v - vlo) / (vhi - vlo) * (b1.y0 - b1.y1); }, YI = function (ii) { return (b2.y0 + b2.y1) / 2 - ii / (1.25 * c) * (b2.y0 - b2.y1) / 2; };
      fig._X = X; fig._YV = YV; fig._YI = YI;
      var tick = []; for (var v = Math.ceil(vlo * 2) / 2; v <= vhi; v += 0.5) tick.push(v);
      plotAxes(axV, b1, { yt: tick, ylo: vlo, yhi: vhi, yf: function (v) { return v.toFixed(1); }, ylab: 'voltage V, volts' });
      el('line', { x1: b2.x0, y1: b2.y0, x2: b2.x0, y2: b2.y1, stroke: 'var(--line-2)' }, axI);
      el('line', { x1: b2.x0, y1: YI(0), x2: b2.x1, y2: YI(0), stroke: 'var(--line-2)' }, axI);
      txt(axI, b2.x0 - 5, YI(c) + 4, '+' + fmtRate(c), '', 'end'); txt(axI, b2.x0 - 5, YI(-c) + 4, '−' + fmtRate(c), '', 'end');
      txt(axI, b2.x0 + 4, b2.y1 - 4, 'current I: + charging, − discharging', '', 'start');
      var hstep = niceStep(tEnd, 5); for (var h = 0; h <= tEnd + 1e-9; h += hstep) { el('line', { x1: X(h), y1: b2.y0, x2: X(h), y2: b2.y0 + 4, stroke: 'var(--line-2)' }, axI); txt(axI, X(h), b2.y0 + 15, (hstep < 1 ? h.toFixed(1) : String(Math.round(h))), '', 'middle'); }
      txt(axI, b2.x1, b2.y0 + 30, 'time, hours', '', 'end');
      [cut.lo, cut.hi].forEach(function (v, j) { el('line', { x1: b1.x0, x2: b1.x1, y1: YV(v), y2: YV(v), stroke: 'var(--heat)', 'stroke-dasharray': '5 4', 'stroke-opacity': '.8' }, cutLines); txt(cutLines, j ? b1.x0 + 24 : b1.x1 - 4, YV(v) - 4, (j ? 'upper' : 'lower') + ' cut-off, ' + v.toFixed(1) + ' V', 'heat', j ? 'start' : 'end'); });
      // phase bands
      var start = 0; for (var j = 1; j <= tr.length; j++) {
        if (j === tr.length || tr[j].ph !== tr[start].ph) {
          var ph = tr[start].ph, xa = X(tr[start].t), xb = X(tr[j - 1].t);
          if (ph !== 0 && ph !== 2) el('rect', { x: xa, y: b1.y1, width: Math.max(1, xb - xa), height: b2.y0 - b1.y1, fill: ph === 3 ? 'var(--second)' : 'var(--muted)', 'fill-opacity': ph === 3 ? '.10' : '.07' }, bands);
          start = j;
        }
      }
      var xsArr = tr.map(function (p) { return X(p.t); });
      pV0.setAttribute('d', polyD(xsArr, tr.map(function (p) { return YV(p.V); }))); pI0.setAttribute('d', polyD(xsArr, tr.map(function (p) { return YI(p.I); })));
      k = 0; place();
    }
    function place() {
      var p = tr[k], X = fig._X, sub = tr.slice(0, k + 1), xsArr = sub.map(function (q) { return X(q.t); });
      pV.setAttribute('d', polyD(xsArr, sub.map(function (q) { return fig._YV(q.V); })));
      pIs.forEach(function (pp, j) { var d = ''; sub.forEach(function (q, i) { var c = q.I < 0 ? 0 : q.I > 0 ? 2 : 1; if (c !== j) return; var prev = i && (sub[i - 1].I < 0 ? 0 : sub[i - 1].I > 0 ? 2 : 1) === j; d += (prev ? 'L' : 'M') + xsArr[i].toFixed(1) + ',' + fig._YI(q.I).toFixed(1); }); pp.setAttribute('d', d); });
      cur.setAttribute('x1', X(p.t)); cur.setAttribute('x2', X(p.t));
      var amps = Math.abs(p.I) * CAP, hh = Math.floor(p.t), mm = Math.round((p.t - hh) * 60); if (mm === 60) { hh++; mm = 0; }
      setSvgText(mPh, phases[p.ph]);
      setSvgText(mI, 'I = ' + (p.I < 0 ? '−' : p.I > 0 ? '+' : '') + amps.toFixed(2) + ' A');
      setSvgText(mV, 'V = ' + p.V.toFixed(3) + ' V');
      setSvgText(mQ, 'Q this step = ' + p.q.toFixed(2) + ' Ah');
      setSvgText(mT, 't = ' + hh + ' h ' + (mm < 10 ? '0' : '') + mm + ' min');
      arrE.innerHTML = ''; arrL.innerHTML = '';
      var dir = p.I < 0 ? 1 : p.I > 0 ? -1 : 0;
      if (dir) { arrow(arrE, dir > 0 ? 100 : 166, 44, dir > 0 ? 166 : 100, 44, 'var(--electron)', 1.6); arrow(arrL, dir > 0 ? 112 : 154, cy1 - 6, dir > 0 ? 154 : 112, cy1 - 6, 'var(--cation)', 1.6); }
      var mode = p.ph === 3 ? 'the voltage is held at the upper cut-off and the current tapers' : p.ph === 1 || p.ph === 4 ? 'the voltage settles to the open-circuit value' : p.ph === 0 ? 'lithium ions and electrons leave the negative electrode' : 'the cycler drives lithium ions and electrons back to the negative electrode';
      read.innerHTML = '<b>' + phases[p.ph] + '</b>: ' + mode + '. ' + (p.I === 0 ? 'No current' : 'Current ' + amps.toFixed(2) + ' A on a ' + CAP.toFixed(1) + ' Ah cell, a rate of ' + fmtRate(Math.abs(p.I))) + '. Charge passed in this step, ' + (p.ph === 3 ? 'Q = ∫I dt' : 'Q = I·t') + ' = <b>' + p.q.toFixed(2) + ' Ah</b>.';
    }
    var phase = 0;
    function flowTick(dt) {
      var p = tr[k], dir = p.I < 0 ? 1 : p.I > 0 ? -1 : 0, sp = dir * (0.12 + 0.08 * Math.min(3, Math.abs(p.I)));
      eDots.forEach(function (d) { d.s += sp * dt; var q = along(d.s); d.e.setAttribute('cx', q[0]); d.e.setAttribute('cy', q[1]); d.e.style.opacity = dir ? 1 : 0.35; });
      liDots.forEach(function (d) { d.s = (((d.s + sp * 1.3 * dt) % 1) + 1) % 1; d.e.setAttribute('cx', 34 + d.s * 198); d.e.setAttribute('cy', d.y); d.e.style.opacity = dir ? 1 : 0.35; });
    }
    on(rate, 'input', function () { build(); flowTick(0); });
    cellListeners.push(function () { build(); flowTick(0); });
    build(); flowTick(0);
    steps(fig, [
      { text: 'The <b>cycler</b> is a current source with a voltmeter. It pushes a chosen current through the cell and records the voltage at regular intervals. Holding the current constant is called <b>galvanostatic</b> cycling, and most curves in this module were recorded, or drawn, that way.' },
      { text: 'The meter reads what the cycler sees. On <b>discharge</b> electrons leave the negative electrode through the wire (yellow) while lithium ions leave it through the electrolyte (blue); on <b>charge</b> the cycler drives both back.' },
      { text: 'Each half-cycle stops at a <b>cut-off voltage</b> (red dashes). Between the steps the cell rests; its voltage is drawn returning at once to the open-circuit value (figure {{fig:f5-4}} shows the real, gradual return).' },
      { text: 'Charging usually ends with a <b>constant-voltage</b> step: the cycler holds the upper cut-off and lets the current fall away until it reaches a small limit, here C/20 (the shaded band).' }
    ]);
    var loop = anim(fig, function (dt) { flowTick(dt); if (dt === 0) return; phase += dt * tr.length / 16; while (phase >= 1) { phase -= 1; k++; if (k >= tr.length) k = 0; } place(); }, { autoplay: true, stepDt: 0.6 });
    bind(fig, loop);
    // reduced motion: show the whole protocol at once
    if (!motion) { k = tr.length - 1; place(); }
  });

  /* ===== 5.5 Battery or capacitor: two ideal limits and a real supercapacitor ===== */
  register('f5-5', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), I0s = fig.querySelector('.i0'), I0v = fig.querySelector('.i0-val'), mb = fig.querySelectorAll('button[data-view]');
    var gA = el('g', {}, svg), gB = el('g', {}, svg);
    // ---------- view A: Olson et al., eqs. 1 to 8 and Figures 2 and 3 ----------
    var cols = [{ x0: 52, x1: 232, name: 'ideal battery material' }, { x0: 312, x1: 492, name: 'ideal capacitor material' }];
    var top = { y0: 128, y1: 40 }, bot = { y0: 272, y1: 184 }, uLo = 0.18, uHi = 0.82, uEq = 0.5;
    var dyn = [];
    cols.forEach(function (cl, j) {
      txt(gA, (cl.x0 + cl.x1) / 2, 18, cl.name, 'strong', 'middle');
      var bt = { x0: cl.x0, y0: top.y0, x1: cl.x1, y1: top.y1 }, bb = { x0: cl.x0, y0: bot.y0, x1: cl.x1, y1: bot.y1 };
      plotAxes(gA, bt, { xlab: 'charge stored, q →', ylab: 'potential U' });
      plotAxes(gA, bb, { xlab: 'potential U →', ylab: 'dq/dU' });
      var Y = function (u) { return bt.y0 - u * (bt.y0 - bt.y1); }, Xq = function (q) { return bt.x0 + 8 + q * (bt.x1 - bt.x0 - 24); }, Xu = function (u) { return bb.x0 + u * (bb.x1 - bb.x0); };
      if (j === 0) {
        el('path', { d: 'M' + Xq(0) + ',' + Y(uEq) + ' L' + Xq(1) + ',' + Y(uEq), stroke: 'var(--accent)', 'stroke-width': 2.4, fill: 'none' }, gA);
        txt(gA, Xq(0.5), Y(uEq) - 8, 'U = U_eq, all the way', 'amber', 'middle');
        el('line', { x1: Xu(uEq), x2: Xu(uEq), y1: bb.y0, y2: bb.y1 + 10, stroke: 'var(--accent)', 'stroke-width': 3 }, gA);
        el('path', { d: 'M' + (Xu(uEq) - 5) + ',' + (bb.y1 + 12) + ' L' + Xu(uEq) + ',' + (bb.y1 + 2) + ' L' + (Xu(uEq) + 5) + ',' + (bb.y1 + 12) + ' Z', fill: 'var(--accent)' }, gA);
        txt(gA, Xu(uEq) + 9, bb.y1 + 26, 'one spike:', '', 'start'); txt(gA, Xu(uEq) + 9, bb.y1 + 44, 'all of q_sat', '', 'start'); txt(gA, Xu(uEq) + 9, bb.y1 + 62, 'at U_eq', '', 'start');
        badge(gA, cl.x0 + 16, top.y1 + 14, 1);
      } else {
        el('path', { d: 'M' + Xq(0) + ',' + Y(uLo) + ' L' + Xq(1) + ',' + Y(uHi), stroke: 'var(--second)', 'stroke-width': 2.4, fill: 'none' }, gA);
        txt(gA, Xq(0.62), Y(lerp(uLo, uHi, 0.62)) + 18, 'slope 1/C_sp', 'cyan', 'start');
        el('line', { x1: Xu(uLo), x2: Xu(uHi), y1: bb.y0 - 44, y2: bb.y0 - 44, stroke: 'var(--second)', 'stroke-width': 2.4 }, gA);
        [uLo, uHi].forEach(function (u, m) { el('line', { x1: Xu(u), x2: Xu(u), y1: bb.y0, y2: bb.y1 + 14, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, gA); txt(gA, Xu(u), bb.y1 + 10, m ? 'U_EOC' : 'U_EOD', '', 'middle'); });
        txt(gA, Xu(0.5), bb.y0 - 50, 'level: C_sp', 'cyan', 'middle');
        badge(gA, cl.x0 + 16, top.y1 + 14, 2); badge(gA, cl.x1 - 16, bot.y0 - 20, 3);
      }
      var dot = el('circle', { r: 5, 'class': 'ion' }, gA), fill = el('rect', { y: j ? bb.y0 - 44 : bb.y0, height: j ? 44 : 0, width: 0, x: Xu(uLo), fill: j ? 'var(--second)' : 'var(--accent)', 'fill-opacity': '.3' }, gA);
      dyn.push({ j: j, dot: dot, fill: fill, Xq: Xq, Y: Y, Xu: Xu, bb: bb });
    });
    var qs = 0.35;
    function placeA() {
      dyn.forEach(function (d) {
        var u = d.j ? lerp(uLo, uHi, qs) : uEq;
        d.dot.setAttribute('cx', d.Xq(qs)); d.dot.setAttribute('cy', d.Y(u));
        if (d.j) { d.fill.setAttribute('width', Math.max(0, d.Xu(u) - d.Xu(uLo))); }
        else { var h = qs * (d.bb.y0 - d.bb.y1 - 12); d.fill.setAttribute('x', d.Xu(uEq) - 6); d.fill.setAttribute('width', 12); d.fill.setAttribute('y', d.bb.y0 - h); d.fill.setAttribute('height', h); }
      });
      read.innerHTML = 'Charge stored so far: <b>' + Math.round(qs * 100) + ' %</b>. The battery material’s potential has not moved; the capacitor’s has climbed ' + Math.round(qs * 100) + ' % of the way across its window. In the lower plots the shaded area is the charge stored so far: dq/dU summed over U.';
    }
    // ---------- view B: Moya 2025, eqs. 6 and 12 with Table 2 (capacitor C10) ----------
    var RH = 0.31, Ri = 0.32, Cc = 0.94, tau = 0.095, t0 = 10, tMax = 19.4;
    var bm = { x0: 60, y0: 262, x1: 330, y1: 34 }, vMax = 0.6;
    var Xt = function (t) { return bm.x0 + t / tMax * (bm.x1 - bm.x0); }, Yv = function (v) { return bm.y0 - v / vMax * (bm.y0 - bm.y1); };
    plotAxes(gB, bm, { yt: [0, 0.2, 0.4, 0.6], ylo: 0, yhi: vMax, yf: function (v) { return v.toFixed(1); }, ylab: 'voltage, V' }); txt(gB, bm.x1, bm.y0 + 30, 'time, s', '', 'end');
    [0, 5, 10, 15].forEach(function (t) { txt(gB, Xt(t), bm.y0 + 15, String(t), '', 'middle'); });
    var asym = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '4 4' }, gB), curve = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2.2 }, gB);
    var mk = el('circle', { r: 4.5, 'class': 'ion' }, gB);
    var ins = [{ x0: 390, y0: 136, x1: 505, y1: 46, ta: 0, tb: 0.6, name: 'start' }, { x0: 390, y0: 262, x1: 505, y1: 172, ta: t0 - 0.05, tb: t0 + 0.55, name: 'reversal' }];
    ins.forEach(function (b) {
      el('rect', { x: b.x0, y: b.y1, width: b.x1 - b.x0, height: b.y0 - b.y1, fill: 'rgba(20,23,28,.03)', stroke: 'var(--line)' }, gB);
      txt(gB, b.x0, b.y1 - 6, 'zoom: ' + b.name, '', 'start');
      b.asym = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '4 4' }, gB); b.curve = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2 }, gB);
      b.lab = txt(gB, b.x1 - 4, b.name === 'start' ? b.y0 - 6 : b.y1 + 14, '', 'cyan', 'end');
      b.bracket = el('line', { stroke: 'var(--accent)', 'stroke-width': 1.6 }, gB);
    });
    var lj = txt(gB, 0, 0, '', 'amber tag', 'start'), ls = txt(gB, 0, 0, '', 'cyan tag', 'start'), ld = txt(gB, 0, 0, '', 'amber tag', 'start');
    badge(gB, Xt(17), Yv(0.5), 4); badge(gB, 376, 60, 5);
    var tNow = 3;
    function vt(t, I0) { return P.edlcCycle(t, t0, I0, RH, Ri, Cc, tau); }
    function va(t, I0) { var Re = RH + Ri; return t < t0 ? Re * I0 + I0 * t / Cc : (Re * I0 + I0 * t0 / Cc) - 2 * Re * I0 - I0 * (t - t0) / Cc; }
    function drawB() {
      var I0 = +I0s.value / 1000; setSvgText(I0v, Math.round(I0 * 1000) + ' mA');
      var ts = [], n = 600; for (var i = 0; i <= n; i++) ts.push(i / n * tMax);
      // keep the jumps vertical: add the points either side of t0
      ts.push(t0 - 1e-6); ts.sort(function (a, b) { return a - b; });
      curve.setAttribute('d', polyD(ts.map(Xt), ts.map(function (t) { return Yv(Math.max(0, vt(t, I0))); })));
      var ta = ts.filter(function (t) { return t < t0; }), tb = ts.filter(function (t) { return t >= t0; });
      asym.setAttribute('d', polyD(ta.map(Xt), ta.map(function (t) { return Yv(va(t, I0)); })) + ' ' + polyD(tb.map(Xt), tb.map(function (t) { return Yv(Math.max(0, va(t, I0))); })).replace('M', 'M'));
      ins.forEach(function (b, j) {
        var tt = [], m = 160; for (var i = 0; i <= m; i++) tt.push(b.ta + i / m * (b.tb - b.ta)); if (j) { tt.push(t0 - 1e-6); tt.sort(function (a, c) { return a - c; }); }
        var vs = tt.map(function (t) { return t < 0 ? 0 : vt(t, I0); }), as = tt.map(function (t) { return t < 0 ? NaN : va(t, I0); });
        var lo = Math.min.apply(null, vs.concat(as.filter(isFinite))), hi = Math.max.apply(null, vs.concat(as.filter(isFinite))), pad = (hi - lo) * 0.12;
        lo -= pad; hi += pad;
        var X = function (t) { return b.x0 + (t - b.ta) / (b.tb - b.ta) * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - (v - lo) / (hi - lo) * (b.y0 - b.y1); };
        b.curve.setAttribute('d', polyD(tt.map(X), vs.map(Y)));
        var ok = tt.filter(function (t, i) { return isFinite(as[i]) && (j ? t >= t0 : true); });
        b.asym.setAttribute('d', polyD(ok.map(X), ok.map(function (t) { return Y(va(t, I0)); })));
        var gap = j ? 2 * Ri * I0 : Ri * I0, tg = j ? t0 + 0.004 : 0.004;
        b.bracket.setAttribute('x1', X(tg) + 6); b.bracket.setAttribute('x2', X(tg) + 6); b.bracket.setAttribute('y1', Y(vt(tg, I0))); b.bracket.setAttribute('y2', Y(va(tg, I0)));
        setSvgText(b.lab, (j ? '2R_i I₀ = ' : 'R_i I₀ = ') + (gap * 1000).toFixed(1) + ' mV');
      });
      lj.setAttribute('x', Xt(2.2)); lj.setAttribute('y', bm.y0 - 8); setSvgText(lj, 'jump R_H I₀ = ' + (RH * I0 * 1000).toFixed(1) + ' mV');
      ls.setAttribute('x', Xt(5.5)); ls.setAttribute('y', Yv(va(5, I0)) + 18); setSvgText(ls, 'slope I₀/C = ' + (I0 / Cc * 1000).toFixed(0) + ' mV/s');
      ld.setAttribute('x', Xt(t0) + 10); ld.setAttribute('y', Yv(vt(t0 - 1e-6, I0)) - 6); setSvgText(ld, 'drop 2R_H I₀');
      placeB();
    }
    function placeB() {
      var I0 = +I0s.value / 1000; mk.setAttribute('cx', Xt(tNow)); mk.setAttribute('cy', Yv(Math.max(0, vt(tNow, I0))));
      var V0 = vt(t0 - 1e-6, I0);
      read.innerHTML = 'Capacitor C10, fitted values (R<sub>H</sub> = 0.31 Ω, R<sub>i</sub> = 0.32 Ω, C = 0.94 F, τ<sub>i</sub> = 0.095 s), charged at ' + Math.round(I0 * 1000) + ' mA for 10 s, then discharged at the same current. t = ' + tNow.toFixed(1) + ' s, v = <b>' + Math.max(0, vt(tNow, I0)).toFixed(3) + ' V</b>. Peak ' + V0.toFixed(3) + ' V. The voltage is a ramp, not a plateau: a capacitor stores charge in proportion to its voltage.';
    }
    function setView(v) {
      gA.style.display = v === 'a' ? '' : 'none'; gB.style.display = v === 'b' ? '' : 'none';
      Array.prototype.forEach.call(mb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
      fig.querySelector('.i0-wrap').style.display = v === 'b' ? '' : 'none';
      view = v; if (v === 'a') placeA(); else drawB();
    }
    var view = 'a';
    var st = null;
    Array.prototype.forEach.call(mb, function (b) { on(b, 'click', function () { var v = b.getAttribute('data-view'); if (st) st.go(v === 'b' ? 3 : 0); else setView(v); }); });
    on(I0s, 'input', drawB);
    setView('a');
    st = steps(fig, [
      { text: 'An <b>ideal battery material</b> stores all its charge in one reaction at one potential, U<sub>eq</sub>: the curve is a perfect plateau, and the energy is simply charge × U<sub>eq</sub>.', on: function () { setView('a'); } },
      { text: 'An <b>ideal capacitor material</b> has a fixed capacitance: every bit of charge raises the potential by the same amount, so the curve is a straight ramp with slope 1/C<sub>sp</sub>.', on: function () { setView('a'); } },
      { text: 'Turn the curves on their side and plot dq/dU, the charge stored per volt. The battery gives a single <b>spike</b>; the capacitor a flat <b>level</b>. Real electrodes lie between the two, which is the idea behind figure {{fig:f5-9}}.', on: function () { setView('a'); } },
      { text: 'A real commercial supercapacitor at constant current: an instant jump, a short bend, then a straight ramp at slope I₀/C. Reverse the current and the voltage drops by twice the jump, then ramps down.', on: function () { setView('b'); } },
      { text: 'Zoom in. Just after each switch the curve bends towards a dashed straight line. In the fitted circuit an inner branch, a resistance R<sub>i</sub> in parallel with a second capacitance attributed to the diffusion of ions in the capacitor, catches up with a time constant of about 0.1 s. The gap starts twice as large on discharge, because the current changes by 2I₀ there and only I₀ at the start.', on: function () { setView('b'); } }
    ]);
    var loop = anim(fig, function (dt) {
      if (dt === 0) return;
      if (view === 'a') { qs += dt / 6; if (qs > 1) qs = 0; placeA(); } else { tNow += dt * 2; if (tNow > tMax) tNow = 0; placeB(); }
    }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 5.6 Plateau or slope: the phase rule on a measured curve ===== */
  register('f5-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var colX = [20, 270], parts = [[], []], order = [7, 2, 10, 4, 0, 9, 5, 11, 1, 6, 3, 8];
    txt(g, 135, 16, 'two phases: LiFePO₄', 'strong', 'middle'); txt(g, 385, 16, 'one phase (schematic)', 'strong', 'middle');
    colX.forEach(function (x0, j) {
      for (var i = 0; i < 12; i++) {
        var cx = x0 + 43 + (i % 4) * 49, cy = 40 + Math.floor(i / 4) * 33;
        el('circle', { cx: cx, cy: cy, r: 13, fill: 'var(--panel-2)', stroke: 'var(--accent)', 'stroke-opacity': '.55' }, g);
        parts[j].push(el('circle', { cx: cx, cy: cy, r: 13, fill: 'var(--accent-strong)', 'fill-opacity': '0' }, g));
      }
    });
    badge(g, 30, 40, 1); badge(g, 506, 40, 4);
    var bL = { x0: 62, y0: 286, x1: 240, y1: 156 }, bR = { x0: 312, y0: 286, x1: 490, y1: 156 }, vlo = 2.6, vhi = 4.4;
    plotAxes(g, bL, { yt: [3.0, 3.5, 4.0], ylo: vlo, yhi: vhi, yf: function (v) { return v.toFixed(1); }, ylab: 'V vs Li/Li⁺' });
    plotAxes(g, bR, { ylab: 'V' });
    txt(g, bL.x1, bL.y0 + 15, 'lithium content y →', '', 'end'); txt(g, bR.x1, bR.y0 + 15, 'lithium content →', '', 'end');
    var XL = function (y) { return bL.x0 + y * (bL.x1 - bL.x0); }, YL = function (v) { return bL.y0 - (v - vlo) / (vhi - vlo) * (bL.y0 - bL.y1); };
    var XR = function (y) { return bR.x0 + y * (bR.x1 - bR.x0); }, sl = function (y) { return 0.86 - 0.62 * y + 0.10 * Math.exp(-y / 0.04) - 0.12 * Math.exp(-(1 - y) / 0.04); }, YR = function (y) { return bR.y0 - Math.max(0.02, Math.min(1, sl(y))) * (bR.y0 - bR.y1); };
    var ys = []; for (var i = 0; i <= 400; i++) ys.push(0.002 + 0.996 * i / 400);
    el('line', { x1: bL.x0, x2: bL.x1, y1: YL(3.4323), y2: YL(3.4323), stroke: 'var(--accent)', 'stroke-opacity': '.45', 'stroke-dasharray': '2 3' }, g);
    el('path', { d: polyD(ys.map(XL), ys.map(function (y) { return YL(Math.max(vlo, Math.min(vhi, P.lfpOcp(y)))); })), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }, g);
    txt(g, XL(0.5), YL(3.4323) - 8, '3.43 V, flat', 'amber tag', 'middle');
    el('path', { d: polyD(ys.map(XR), ys.map(YR)), fill: 'none', stroke: 'var(--second)', 'stroke-width': 2.2 }, g);
    txt(g, XR(0.5), YR(0.5) - 12, 'keeps changing', 'cyan tag', 'start');
    badge(g, XL(0.08), YL(4.25), 2); badge(g, XL(0.84), YL(3.88), 3);
    var dL = el('circle', { r: 5, 'class': 'ion' }, g), dR = el('circle', { r: 5, 'class': 'ion' }, g);
    txt(g, 135, 324, 'P = 2: F = 2 − 2 + 2 = 2', 'amber', 'middle'); txt(g, 135, 339, 'fix T and p: none left, so flat', '', 'middle');
    txt(g, 385, 324, 'P = 1: F = 2 − 1 + 2 = 3', 'cyan', 'middle'); txt(g, 385, 339, 'fix T and p: one left, so it slopes', '', 'middle');
    var y = 0.42, A = 0.13, B = 0.87;
    function partContent(i, y) { // schematic: solid solution near the ends, particles switching one by one between
      if (y <= A) return y; if (y >= B) return y;
      var th = A + (B - A) * (order.indexOf(i) + 0.5) / 12, w = 0.025;
      return lerp(A, B, smooth((y - th + w) / (2 * w)));
    }
    function place() {
      var rich = 0;
      parts[0].forEach(function (c, i) { var u = partContent(i, y); if (u > 0.5 * (A + B)) rich++; c.setAttribute('fill-opacity', (0.05 + 0.9 * u).toFixed(3)); });
      parts[1].forEach(function (c) { c.setAttribute('fill-opacity', (0.05 + 0.9 * y).toFixed(3)); });
      var V = P.lfpOcp(y);
      dL.setAttribute('cx', XL(y)); dL.setAttribute('cy', YL(Math.max(vlo, Math.min(vhi, V)))); dR.setAttribute('cx', XR(y)); dR.setAttribute('cy', YR(y));
      var where = y < 0.15 || y > 0.85 ? 'on a sloping end, where the material takes lithium as one phase' : 'on the plateau: ' + rich + ' of 12 particles are lithium-rich, the rest lithium-poor';
      read.innerHTML = 'Lithium content y = <b>' + y.toFixed(2) + '</b>, open-circuit voltage <b>' + V.toFixed(3) + ' V</b> vs Li/Li⁺ (the fitted curve), ' + where + '.';
    }
    steps(fig, [
      { text: 'An electrode is many particles. Over most of its range LiFePO₄ is two solid phases, one lithium-poor and one lithium-rich. Each particle is drawn turning from one to the other; adding lithium changes <b>how much</b> of each phase there is, not what either phase is made of.' },
      { text: 'This is the measured open-circuit curve: a fit to the average of a charge and a discharge at C/100. It sits at <b>3.43 V</b> from about y = 0.15 to 0.85.' },
      { text: 'Near the ends the curve slopes. There the material takes or gives lithium as a single phase, a partial solid solution, so its composition, and the voltage with it, can change.' },
      { text: 'Count with the Gibbs phase rule, F = C − P + 2, for two components (lithium and FePO₄). Two phases leave F = 2, both used by fixing temperature and pressure: the voltage cannot move, a <b>plateau</b>. One phase leaves one freedom, the composition: a <b>slope</b> (right, schematic).' },
      { text: 'Even the plateau is not quite one line. A gap of about <b>20 mV</b> remains between charge and discharge even at C/1000, a true hysteresis traced to the many particles. The fit drawn here is to the average of a C/100 charge and discharge.' }
    ]);
    place();
    var loop = anim(fig, function (dt) { if (dt === 0) return; y += dt / 9; if (y > 0.995) y = 0.005; place(); }, { autoplay: true, stepDt: 0.6 });
    bind(fig, loop);
  });

  /* ===== 5.7 Many particles: the resistive-reactant LiFePO4 electrode ===== */
  register('f5-7', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), mb = fig.querySelectorAll('button[data-mode]'), rb = fig.querySelectorAll('button[data-rate]');
    var b = { x0: 58, y0: 268, x1: 326, y1: 30 }, vlo = 2.4, vhi = 4.3;
    var X = function (q) { return b.x0 + q * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - (Math.max(vlo, Math.min(vhi, v)) - vlo) / (vhi - vlo) * (b.y0 - b.y1); };
    plotAxes(g, b, { yt: [2.5, 3.0, 3.5, 4.0], ylo: vlo, yhi: vhi, yf: function (v) { return v.toFixed(1); }, ylab: 'V vs Li/Li⁺' });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (q) { txt(g, X(q), b.y0 + 15, Math.round(q * 100) + ' %', '', 'middle'); });
    var xl = txt(g, b.x1, b.y0 + 30, '', '', 'end');
    var ocp = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 4' }, g), ref = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.6, 'stroke-opacity': '.7' }, g);
    var pA = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }, g), pB = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2.2 }, g);
    var dA = el('circle', { r: 4.5, 'class': 'ion' }, g), dB = el('circle', { r: 4.5, 'class': 'ion' }, g);
    var lA = txt(g, 0, 0, '', 'amber tag', 'start'), lB = txt(g, 0, 0, '', 'cyan tag', 'start'), lR = txt(g, 0, 0, '', 'tag', 'start');
    // the particle groups
    var gb = el('g', {}, g), bars = [], by0 = 236, by1 = 66;
    var head = txt(g, 430, 22, '', 'strong', 'middle'), sub1 = txt(g, 430, 40, '', '', 'middle');
    for (var k = 0; k < 8; k++) {
      var r0 = el('rect', { y: by1, height: by0 - by1, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, gb);
      var r1 = el('rect', { rx: 3, fill: 'var(--accent-strong)' }, gb);
      var t1 = txt(gb, 0, by1 - 7, '', 'strong', 'middle'), t2 = txt(gb, 0, by0 + 16, '', '', 'middle'), t3 = txt(gb, 0, by0 + 31, '', '', 'middle');
      bars.push({ r0: r0, r1: r1, t1: t1, t2: t2, t3: t3 });
    }
    var foot = txt(g, 430, by0 + 48, '', '', 'middle'), setA = txt(g, 397, by0 + 16, 'from empty', 'cyan', 'middle'), setB = txt(g, 469, by0 + 16, 'from full', 'amber', 'middle');
    badge(g, 344, 150, 1); badge(g, X(0.5), Y(3.1), 2); badge(g, X(0.86), Y(2.75), 3);
    var cache = {}, mode = 'dis', rate = 1, data = null, k0 = 0, kk = 0;
    var M = P.lfpElectrode(), C1 = M.oneC, FR = M.frac, RC = M.Rc;
    function key() { return mode + ':' + (mode === 'path' ? 1 : rate); }
    function compute() {
      if (cache[key()]) return cache[key()];
      var d;
      if (mode === 'path') {
        var hist = function (fromEmpty) {
          var m = P.lfpElectrode({ y0: fromEmpty ? 0.995 : 0.005 });
          var a = m.run(fromEmpty ? C1 / 25 : -C1 / 25, { yStop: 0.5 }), r = m.run(0, { tmax: 7200, dtmax: 300 }), c = m.run(C1);
          var yR = r[r.length - 1].y;
          return { pre: a[a.length - 1], rest: r[r.length - 1], pts: c.map(function (p) { return { q: yR - p.y, V: p.V, groups: p.groups }; }) };
        };
        d = { A: hist(true), B: hist(false) };
      } else {
        var ch = mode === 'ch', I = rate * C1 * (ch ? 1 : -1), y0 = ch ? 0.995 : 0.005;
        var run = function (I) { var m = P.lfpElectrode({ y0: y0 }); return m.run(I).map(function (p) { return { q: Math.abs(p.y - y0), V: p.V, groups: p.groups }; }); };
        d = { A: { pts: run(I) }, slow: run(I / rate / 25) };
      }
      cache[key()] = d; return d;
    }
    function sdOf(gs) { var m = 0; gs.forEach(function (x) { m += x.y; }); m /= gs.length; var s = 0; gs.forEach(function (x) { s += (x.y - m) * (x.y - m); }); return Math.sqrt(s / gs.length); }
    function layout() {
      var path = mode === 'path';
      bars.forEach(function (bb, i) {
        var show = path || i < 4, w = path ? 15 : 26, x = path ? (i < 4 ? 360 + i * 19 : 432 + (i - 4) * 19) : 368 + i * 36;
        [bb.r0, bb.r1].forEach(function (r) { r.style.display = show ? '' : 'none'; r.setAttribute('x', x); r.setAttribute('width', w); });
        [bb.t1, bb.t2, bb.t3].forEach(function (t) { t.style.display = show ? '' : 'none'; t.setAttribute('x', x + w / 2); });
        setSvgText(bb.t1, String(i % 4 + 1));
        setSvgText(bb.t2, path ? '' : Math.round(FR[i % 4] * 100) + ' %'); setSvgText(bb.t3, path ? '' : (RC[i % 4] < 10 ? RC[i % 4].toFixed(2) : RC[i % 4].toFixed(1)));
      });
      setSvgText(head, path ? 'lithium in each group' : 'lithium in each group'); setSvgText(sub1, 'group 1 best wired, 4 worst'); setA.style.display = path ? '' : 'none'; setB.style.display = path ? '' : 'none';
      setSvgText(foot, path ? 'both rested 2 h at 50 %' : 'share of volume; R_c, Ω m²');
    }
    function draw() {
      data = compute(); layout();
      var path = mode === 'path', ch = mode === 'ch';
      var ys = []; for (var i = 0; i <= 200; i++) ys.push(0.003 + 0.994 * i / 200);
      if (!path) { ocp.setAttribute('d', polyD(ys.map(function (y) { return X(ch ? 1 - y : y); }), ys.map(function (y) { return Y(P.lfpOcp(y)); }))); ocp.style.display = ''; }
      else ocp.style.display = 'none';
      var A = data.A.pts, Bp = path ? data.B.pts : null;
      pA.setAttribute('d', polyD(A.map(function (p) { return X(p.q); }), A.map(function (p) { return Y(p.V); })));
      pA.setAttribute('stroke', path ? 'var(--second)' : ch ? 'var(--second)' : 'var(--accent)');
      pB.style.display = path ? '' : 'none'; dB.style.display = path ? '' : 'none'; lB.style.display = path ? '' : 'none';
      if (path) pB.setAttribute('d', polyD(Bp.map(function (p) { return X(p.q); }), Bp.map(function (p) { return Y(p.V); }))), pB.setAttribute('stroke', 'var(--accent)');
      ref.style.display = path ? 'none' : ''; lR.style.display = path ? 'none' : '';
      if (!path) { var s = data.slow; ref.setAttribute('d', polyD(s.map(function (p) { return X(p.q); }), s.map(function (p) { return Y(p.V); }))); }
      var eA = A[A.length - 1];
      lA.setAttribute('class', 'lbl tag ' + (path || ch ? 'cyan' : 'amber'));
      if (path) {
        var eB = Bp[Bp.length - 1];
        lA.setAttribute('x', X(eA.q) - 8); lA.setAttribute('y', Y(3.75)); lA.setAttribute('text-anchor', 'end'); setSvgText(lA, 'came from empty');
        lB.setAttribute('x', X(eB.q) + 8); lB.setAttribute('y', Y(3.95)); setSvgText(lB, 'came from full');
        setSvgText(xl, 'capacity charged at 1C, % of theoretical');
      } else {
        var mid = A[Math.floor(A.length * 0.45)];
        lA.setAttribute('text-anchor', 'middle'); lA.setAttribute('x', X(mid.q)); lA.setAttribute('y', Y(mid.V) + (ch ? -12 : 20)); setSvgText(lA, fmtRate(rate));
        var sm = data.slow[Math.floor(data.slow.length * 0.6)]; lR.setAttribute('x', X(sm.q)); lR.setAttribute('y', Y(sm.V) + (ch ? 18 : -10)); lR.setAttribute('text-anchor', 'middle'); setSvgText(lR, 'C/25');
        setSvgText(xl, (ch ? 'charged' : 'discharged') + ', % of theoretical capacity');
      }
      kk = motion ? 0 : 100000; place();
    }
    function setBars(groups, off) { for (var i = 0; i < 4; i++) { var bb = bars[i + off], y = groups[i].y, h = y * (by0 - by1); bb.r1.setAttribute('y', by0 - h); bb.r1.setAttribute('height', Math.max(0, h)); } }
    function place() {
      var A = data.A.pts, n = A.length, path = mode === 'path';
      if (path) {
        var Bp = data.B.pts, kA = Math.min(kk, A.length - 1), kB = Math.min(kk, Bp.length - 1);
        dA.setAttribute('cx', X(A[kA].q)); dA.setAttribute('cy', Y(A[kA].V)); dB.setAttribute('cx', X(Bp[kB].q)); dB.setAttribute('cy', Y(Bp[kB].V));
        setBars(A[kA].groups, 0); setBars(Bp[kB].groups, 4);
        var uA = A[A.length - 1].q, uB = Bp[Bp.length - 1].q;
        read.innerHTML = 'Both electrodes start the 1C charge at 50 %, after 2 h of rest. One got there by a slow half charge from empty, the other by a slow half discharge from full. Spread of lithium among the groups before the rest: <b>' + sdOf(data.A.pre.groups).toFixed(3) + '</b> and <b>' + sdOf(data.B.pre.groups).toFixed(3) + '</b>; after it: <b>' + sdOf(data.A.rest.groups).toFixed(3) + '</b> and <b>' + sdOf(data.B.rest.groups).toFixed(3) + '</b>, unchanged. The 1C charge then delivers <b>' + Math.round(uA * 1000) / 10 + ' %</b> and <b>' + Math.round(uB * 1000) / 10 + ' %</b> of the theoretical capacity: the same state of charge, two answers.';
      } else {
        var p = A[Math.min(kk, n - 1)], u = A[n - 1].q, us = data.slow[data.slow.length - 1].q;
        dA.setAttribute('cx', X(p.q)); dA.setAttribute('cy', Y(p.V)); setBars(p.groups, 0);
        read.innerHTML = (mode === 'ch' ? 'Charge' : 'Discharge') + ' at ' + fmtRate(rate) + ': V = <b>' + p.V.toFixed(3) + ' V</b> after ' + Math.round(p.q * 100) + ' %. Lithium content of groups 1 to 4: ' + p.groups.map(function (x) { return x.y.toFixed(2); }).join(', ') + '. This run reaches the cut-off at <b>' + Math.round(u * 100) + ' %</b> of the theoretical capacity; at C/25, ' + Math.round(us * 100) + ' %.';
      }
    }
    function press(list, attr, v) { Array.prototype.forEach.call(list, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute(attr) === String(v))); }); }
    Array.prototype.forEach.call(mb, function (bt) { on(bt, 'click', function () { mode = bt.getAttribute('data-mode'); press(mb, 'data-mode', mode); draw(); }); });
    Array.prototype.forEach.call(rb, function (bt) { on(bt, 'click', function () { rate = +bt.getAttribute('data-rate'); press(rb, 'data-rate', bt.getAttribute('data-rate')); if (mode === 'path') { mode = 'dis'; press(mb, 'data-mode', mode); } draw(); }); });
    draw();
    steps(fig, [
      { text: 'Model a LiFePO₄ electrode as <b>four groups</b> of identical particles. They differ only in how well each is wired to the conductive carbon: the <b>contact resistance</b> R<sub>c</sub>, fitted to measured cells. A quarter of the particles are well wired; one in twenty very poorly.' },
      { text: 'On a flat open-circuit curve every particle would react at the same voltage, so the current takes the easiest path: group 1 fills first and group 4 last. As the easy particles fill, the current is pushed through worse contacts, and the curve that should be flat <b>tilts</b>, more steeply the faster you go.' },
      { text: 'At higher rate the cut-off arrives while group 4 is still part empty: about half of the capacity lost at high rate is lithium that could not get into the badly connected particles (groups 3 and 4) in time.', on: function () { if (mode === 'path') { mode = 'dis'; press(mb, 'data-mode', mode); draw(); } } },
      { text: 'Now press <b>Same 50 %, two histories</b>. Bring the electrode to half charge from empty or from full, rest it for 2 hours, then charge at 1C. On the plateau nothing evens the groups out during the rest, because no voltage difference drives lithium from one particle to another; so the two electrodes remember how they got there.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; k0 += dt * 60; while (k0 >= 1) { k0 -= 1; kk++; } var n = mode === 'path' ? Math.max(data.A.pts.length, data.B.pts.length) : data.A.pts.length; if (kk >= n + 40) kk = 0; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
    if (!motion) { kk = 100000; place(); }
  });

  /* ===== Shared: a drawn packing of particles at a chosen porosity, and the shortest way through its pores ===== */
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  // Particles in a w x h box (origin 0,0). shape 'disk': hexagonal rows of circles of radius r;
  // 'plate': staggered rows of flat bars 4r long and r thick, lying flat. The gap between particles is
  // found by bisection so that the solid share of the box area (sampled on a 1 px grid) equals phi.
  function packParticles(w, h, phi, shape, r, seed) {
    function build(gap) {
      var R = rng(seed), list = [], x, y, row, j;
      if (shape === 'disk') {
        var s = 2 * r + gap, dy = s * Math.sqrt(3) / 2; j = Math.min(3, gap * 0.3);
        for (row = 0, y = -dy / 2; y < h + r; row++, y += dy)
          for (x = (row % 2 ? s / 2 : 0) - s; x < w + s; x += s)
            list.push({ k: 'c', x: x + (R() - 0.5) * 2 * j, y: y + (R() - 0.5) * 2 * j, r: r });
      } else {
        var a = 2 * r, b = r / 2, sx = 2 * a + 2 * gap, sy = 2 * b + gap; j = Math.min(4, gap * 0.4);
        for (row = 0, y = gap / 2 + b; y < h + sy; row++, y += sy)
          for (x = (row % 2 ? sx / 2 : 0) - sx; x < w + sx; x += sx)
            list.push({ k: 'p', x: x + (R() - 0.5) * 2 * j, y: y, a: a, b: b });
      }
      return list;
    }
    var lo = 0.4, hi = 60, list = null;
    for (var n = 0; n < 28; n++) { var mid = 0.5 * (lo + hi), L = build(mid), f = solidShare(L, w, h); if (f > phi) lo = mid; else hi = mid; }
    list = build(0.5 * (lo + hi));
    return { list: list, mask: solidMask(list, w, h) };
  }
  function solidMask(list, w, h) {
    var m = new Uint8Array(w * h);
    list.forEach(function (p) {
      var x0, x1, y0, y1, X, Y;
      if (p.k === 'c') { x0 = Math.max(0, Math.floor(p.x - p.r)); x1 = Math.min(w - 1, Math.ceil(p.x + p.r)); y0 = Math.max(0, Math.floor(p.y - p.r)); y1 = Math.min(h - 1, Math.ceil(p.y + p.r));
        for (Y = y0; Y <= y1; Y++) for (X = x0; X <= x1; X++) { var dx = X + 0.5 - p.x, dy = Y + 0.5 - p.y; if (dx * dx + dy * dy <= p.r * p.r) m[Y * w + X] = 1; } }
      else { x0 = Math.max(0, Math.floor(p.x - p.a)); x1 = Math.min(w - 1, Math.ceil(p.x + p.a)); y0 = Math.max(0, Math.floor(p.y - p.b)); y1 = Math.min(h - 1, Math.ceil(p.y + p.b));
        for (Y = y0; Y <= y1; Y++) for (X = x0; X <= x1; X++) { if (Math.abs(X + 0.5 - p.x) <= p.a && Math.abs(Y + 0.5 - p.y) <= p.b) m[Y * w + X] = 1; } }
    });
    return m;
  }
  function solidShare(list, w, h) { var m = solidMask(list, w, h), s = 0; for (var i = 0; i < m.length; i++) s += m[i]; return s / m.length; }
  // Dijkstra on the pore cells (8 neighbours, no corner cutting) from the top row to the bottom row.
  function shortestPore(mask, w, h) {
    var N = w * h, dist = new Float64Array(N), prev = new Int32Array(N), hd = [], hi = [];
    for (var i = 0; i < N; i++) { dist[i] = Infinity; prev[i] = -1; }
    function push(d, k) { hd.push(d); hi.push(k); var c = hd.length - 1; while (c > 0) { var p = (c - 1) >> 1; if (hd[p] <= hd[c]) break; var t = hd[p]; hd[p] = hd[c]; hd[c] = t; t = hi[p]; hi[p] = hi[c]; hi[c] = t; c = p; } }
    function pop() { var d = hd[0], k = hi[0], ld = hd.pop(), lk = hi.pop(); if (hd.length) { hd[0] = ld; hi[0] = lk; var c = 0; for (;;) { var l = 2 * c + 1, r = l + 1, m = c; if (l < hd.length && hd[l] < hd[m]) m = l; if (r < hd.length && hd[r] < hd[m]) m = r; if (m === c) break; var t = hd[m]; hd[m] = hd[c]; hd[c] = t; t = hi[m]; hi[m] = hi[c]; hi[c] = t; c = m; } } return [d, k]; }
    for (var x = 0; x < w; x++) if (!mask[x]) { dist[x] = 0.5; push(0.5, x); }
    var end = -1, S2 = Math.SQRT2;
    while (hd.length) {
      var top = pop(), d = top[0], k = top[1]; if (d > dist[k]) continue;
      var X = k % w, Y = (k - X) / w; if (Y === h - 1) { end = k; break; }
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; var nx = X + dx, ny = Y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var nk = ny * w + nx; if (mask[nk]) continue;
        if (dx && dy && (mask[Y * w + nx] || mask[ny * w + X])) continue;
        var nd = d + (dx && dy ? S2 : 1); if (nd < dist[nk]) { dist[nk] = nd; prev[nk] = k; push(nd, nk); }
      }
    }
    if (end < 0) return null;
    var path = [], c = end; while (c >= 0) { path.push([c % w + 0.5, Math.floor(c / w) + 0.5]); c = prev[c]; }
    path.reverse(); path.unshift([path[0][0], 0]); path.push([path[path.length - 1][0], h]);
    return { len: dist[end] + 0.5, path: path };
  }

  /* ===== 5.8 Porosity and tortuosity (after Landesfeind et al. 2016, R74) ===== */
  // Measured fits of the MacMullin number N_M = kappa/kappa_eff against porosity, their Figure 19
  // (generalized Bruggeman with a prefactor): graphite-1 4.7 eps^-1.1, LFP-lowC 3.1 eps^-1.6, LFP-highC 3.0 eps^-1.2.
  var NM_FITS = [
    { name: 'graphite', f: 4.7, p: 1.1, lo: 0.30, hi: 0.70, col: 'var(--second)' },
    { name: 'LiFePO₄, 5 % carbon', f: 3.1, p: 1.6, lo: 0.25, hi: 0.75, col: 'var(--heat)' },
    { name: 'LiFePO₄, 15 % carbon', f: 3.0, p: 1.2, lo: 0.25, hi: 0.75, col: 'var(--field)' }
  ];
  register('f5-8p', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.eps'), sv = fig.querySelector('.eps-val'), sb = fig.querySelectorAll('button[data-shape]');
    var B = { x: 30, y: 46, w: 180, h: 180 }, shape = 'disk', eps = 0.30;
    var defs = el('defs', {}, svg), cp = el('clipPath', { id: 'f58p-clip' }, defs); el('rect', { x: B.x, y: B.y, width: B.w, height: B.h }, cp);
    txt(g, B.x + B.w / 2, B.y - 22, 'a slice through the coating', 'strong', 'middle');
    txt(g, B.x + B.w / 2, B.y - 7, 'separator side', '', 'middle'); txt(g, B.x + B.w / 2, B.y + B.h + 15, 'current collector side', '', 'middle');
    el('rect', { x: B.x, y: B.y, width: B.w, height: B.h, fill: MV('electrolyte') }, g);
    var pg = el('g', { 'clip-path': 'url(#f58p-clip)' }, g);
    el('rect', { x: B.x, y: B.y, width: B.w, height: B.h, fill: 'none', stroke: 'var(--line-2)' }, g);
    var routeBg = el('path', { fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
    var route = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
    var xd = B.x + B.w + 14;
    el('line', { x1: xd, y1: B.y, x2: xd, y2: B.y + B.h, stroke: 'var(--muted)', 'stroke-dasharray': '4 4' }, g);
    el('line', { x1: xd - 4, y1: B.y, x2: xd + 4, y2: B.y, stroke: 'var(--muted)' }, g); el('line', { x1: xd - 4, y1: B.y + B.h, x2: xd + 4, y2: B.y + B.h, stroke: 'var(--muted)' }, g);
    txt(g, xd + 6, B.y + B.h / 2 + 4, 'd', '', 'start');
    // right: what is left of the conductivity
    var P = { x0: 312, y0: 226, x1: 506, y1: 46 }, XP = function (e) { return P.x0 + (e - 0.2) / 0.6 * (P.x1 - P.x0); }, YP = function (k) { return P.y0 - k / 0.6 * (P.y0 - P.y1); };
    el('rect', { x: XP(0.30), y: P.y1, width: XP(0.35) - XP(0.30), height: P.y0 - P.y1, fill: 'var(--muted)', 'fill-opacity': '.14' }, g);
    plotAxes(g, P, { yt: [0.2, 0.4, 0.6], ylo: 0, yhi: 0.6, yf: function (v) { return v.toFixed(1); } });
    txt(g, P.x0 - 34, P.y1 - 24, 'conductivity left in the pores, κ_eff / κ', '', 'start');
    [0.2, 0.4, 0.6, 0.8].forEach(function (e) { txt(g, XP(e), P.y0 + 15, e.toFixed(1), '', 'middle'); });
    txt(g, P.x1, P.y0 + 30, 'porosity ε →', '', 'end');
    txt(g, XP(0.325), P.y1 + 12, 'typical', '', 'middle');
    var eb = []; for (var e = 0.2; e <= 0.711; e += 0.01) eb.push(e);
    el('path', { d: polyD(eb.map(XP), eb.map(function (e) { return YP(Math.pow(e, 1.5)); })), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.8, 'stroke-dasharray': '5 4' }, g);
    txt(g, XP(0.47), YP(0.40), 'estimate, ε^{1.5}', '', 'end');
    NM_FITS.forEach(function (c) { var es = []; for (var e = c.lo; e <= c.hi + 1e-9; e += 0.01) es.push(e); el('path', { d: polyD(es.map(XP), es.map(function (e) { return YP(Math.pow(e, c.p) / c.f); })), fill: 'none', stroke: c.col, 'stroke-width': 2.2 }, g); });
    var mk = el('line', { y1: P.y0, y2: P.y1, stroke: 'var(--text)', 'stroke-opacity': '.5' }, g);
    var dots = [{ col: 'var(--muted)' }].concat(NM_FITS).map(function (c) { return el('circle', { r: 4, fill: c.col, stroke: 'var(--bg)', 'stroke-width': 1 }, g); });
    badge(g, B.x - 14, B.y + 10, 1); badge(g, xd + 6, B.y + 16, 2); badge(g, XP(0.52), P.y1 + 12, 3);
    var cache = {};
    function draw() {
      eps = +sl.value / 100; setSvgText(sv, eps.toFixed(2));
      var key = shape + eps, pk = cache[key] || (cache[key] = (function () { var q = packParticles(B.w, B.h, 1 - eps, shape, 9, shape === 'disk' ? 7 : 11); q.route = shortestPore(q.mask, B.w, B.h); return q; })());
      while (pg.firstChild) pg.removeChild(pg.firstChild);
      pk.list.forEach(function (p) {
        if (p.k === 'c') el('circle', { cx: B.x + p.x, cy: B.y + p.y, r: p.r, fill: MB('lco'), stroke: '#15181B', 'stroke-width': .6 }, pg);
        else el('rect', { x: B.x + p.x - p.a, y: B.y + p.y - p.b, width: 2 * p.a, height: 2 * p.b, rx: 2, fill: MB('lco'), stroke: '#15181B', 'stroke-width': .6 }, pg);
      });
      var sol = 0; for (var i = 0; i < pk.mask.length; i++) sol += pk.mask[i]; var drawn = 1 - sol / pk.mask.length;
      var tg = pk.route ? pk.route.len / B.h : NaN;
      if (pk.route) { var pts = pk.route.path.filter(function (q, i, a) { return i % 3 === 0 || i === a.length - 1; }); route.setAttribute('d', polyD(pts.map(function (q) { return B.x + q[0]; }), pts.map(function (q) { return B.y + q[1]; }))); routeBg.setAttribute('d', route.getAttribute('d')); }
      mk.setAttribute('x1', XP(eps)); mk.setAttribute('x2', XP(eps));
      var vals = [Math.pow(eps, 1.5)].concat(NM_FITS.map(function (c) { return eps >= c.lo - 1e-9 && eps <= c.hi + 1e-9 ? Math.pow(eps, c.p) / c.f : NaN; }));
      dots.forEach(function (d, i) { var ok = isFinite(vals[i]) && vals[i] <= 0.6; d.style.display = ok ? '' : 'none'; if (ok) { d.setAttribute('cx', XP(eps)); d.setAttribute('cy', YP(vals[i])); } });
      var fmt = function (v) { return isFinite(v) ? v.toFixed(2) : 'not measured'; };
      read.innerHTML = 'Porosity <b>ε = ' + eps.toFixed(2) + '</b> (pores drawn: ' + Math.round(drawn * 100) + ' % of the slice). In this sketch the shortest way through the pores is <b>' + tg.toFixed(2) + ' × d</b>, a geometric tortuosity of a 2-D drawing. Conductivity left in the pores, κ<sub>eff</sub>/κ: estimate ε<sup>1.5</sup> = <b>' + vals[0].toFixed(2) + '</b>; measured graphite ' + fmt(vals[1]) + ', LiFePO₄ with 5 % carbon ' + fmt(vals[2]) + ', with 15 % carbon ' + fmt(vals[3]) + '.';
    }
    on(sl, 'input', draw);
    Array.prototype.forEach.call(sb, function (b) { on(b, 'click', function () { shape = b.getAttribute('data-shape'); Array.prototype.forEach.call(sb, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); draw(); }); });
    draw();
    steps(fig, [
      { text: 'A slice through a coating: particles (dark grey) and the pores between them, filled with electrolyte (blue). The <b>porosity</b> ε is the share of the coating’s volume that is pore. Here it is drawn as the share of the slice’s area.' },
      { text: 'An ion cannot cross in a straight line, the dashed distance d. The blue line is the shortest way through the pores of this sketch. Its length divided by d is a geometric <b>tortuosity</b>. Switch to flat plates, lying as graphite flakes do, and watch the way round grow.', on: function () { } },
      { text: 'What the ions feel is the conductivity left in the pores, κ<sub>eff</sub>/κ = ε/τ. The dashed curve is the usual estimate, ε<sup>1.5</sup>. The solid curves are fits to impedance measurements on real electrodes; all lie well below it.' }
    ]);
  });

  /* ===== 5.9 Inside a porous electrode (after Doyle, Fuller and Newman 1993; schematic) ===== */
  register('f5-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cb = fig.querySelectorAll('button[data-case]');
    var xf = 40, xsep = 116, ytop = 30, ybot = 136, PXUM = 1.9; // electrode thickness drawn to scale, 1.9 px per µm
    el('rect', { x: 16, y: ytop, width: xf - 16, height: ybot - ytop, rx: 2, fill: M('lithium'), stroke: '#9AA3AD', 'stroke-width': .6 }, g);
    el('rect', { x: xf, y: ytop, width: xsep - xf, height: ybot - ytop, fill: M('separator'), stroke: '#C4C8BF' }, g);
    txt(g, 28, 20, 'Li foil', '', 'middle'); txt(g, 78, 20, 'separator', '', 'middle');
    var defs = el('defs', {}, svg), cp = el('clipPath', { id: 'f58-clip' }, defs), cpr = el('rect', { x: xsep, y: ytop, height: ybot - ytop }, cp);
    var cg = el('g', {}, g), pg = el('g', { 'clip-path': 'url(#f58-clip)' }, g), og = el('g', {}, g);
    var parts = [], NC = 8, xc = 306;
    var ions = []; for (var i = 0; i < 10; i++) ions.push({ s: i / 10, y: ytop + 10 + (i * 41 % (ybot - ytop - 20)), e: el('circle', { r: 3.2, 'class': 'ion' }, g) });
    // salt concentration strip
    var sb = { x0: xf, y0: 250, y1: 186 }, cmax = 1.7;
    var YC = function (v) { return sb.y0 - v / cmax * (sb.y0 - sb.y1); };
    el('line', { x1: sb.x0, y1: sb.y0, x2: sb.x0, y2: sb.y1, stroke: 'var(--line-2)' }, g);
    el('line', { x1: xsep, x2: xsep, y1: sb.y0, y2: sb.y1, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
    txt(g, sb.x0 + 34, sb.y1 - 8, 'salt concentration in the electrolyte', '', 'start');
    txt(g, sb.x0 - 4, YC(1) + 4, '1', '', 'end'); txt(g, sb.x0 - 4, sb.y0 + 4, '0', '', 'end');
    var cl = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2.2 }, g), cf = el('path', { fill: 'var(--second)', 'fill-opacity': '.12' }, g);
    // utilization meter
    var ub = { x0: xsep, x1: 486, y: 272, h: 14 };
    el('rect', { x: ub.x0, y: ub.y, width: ub.x1 - ub.x0, height: ub.h, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    var uf = el('rect', { x: ub.x0, y: ub.y, height: ub.h, rx: 3, fill: 'var(--accent)' }, g), um = el('line', { y1: ub.y - 4, y2: ub.y + ub.h + 4, stroke: 'var(--heat)', 'stroke-width': 2 }, g);
    txt(g, ub.x0 - 6, ub.y + 11, 'material used', '', 'end'); var ul = txt(g, 0, ub.y + ub.h + 16, '', 'heat', 'middle');
    badge(g, 28, ybot + 18, 1); badge(g, xsep - 14, YC(0.35), 3); badge(g, ub.x1 + 14, ub.y + 7, 4); var b2 = el('g', {}, g);
    // thickness L at porosity eps holds the same solid volume: L(1 - eps) = 100 µm × 0.70
    var CASES = { a: { I: 10, eps: 0.30, L: 100, uEnd: 0.84, k: 1.7, dep: 0.95, rise: 0.5 }, b: { I: 20, eps: 0.30, L: 100, uEnd: 0.30, k: 4.5, dep: 0.98, rise: 0.9 }, c: { I: 10, eps: 0.60, L: 175, uEnd: 0.97, k: 0.7, dep: 0.5, rise: 0.3 } };
    var cs = CASES.a, s = 0.55, built = null;
    function build() {
      var Lpx = Math.round(cs.L * PXUM), key = cs.eps + '/' + cs.L; xc = xsep + Lpx;
      if (built === key) return; built = key;
      cpr.setAttribute('width', Lpx);
      while (cg.firstChild) cg.removeChild(cg.firstChild); while (pg.firstChild) pg.removeChild(pg.firstChild); while (og.firstChild) og.removeChild(og.firstChild); while (b2.firstChild) b2.removeChild(b2.firstChild);
      el('rect', { x: xsep, y: ytop, width: Lpx, height: ybot - ytop, fill: MV('electrolyte') }, cg);
      el('rect', { x: xsep, y: ytop, width: Lpx, height: ybot - ytop, fill: 'none', stroke: 'var(--line-2)' }, og);
      el('rect', { x: xc, y: ytop, width: 14, height: ybot - ytop, rx: 2, fill: M('alu'), stroke: '#9CA4AD', 'stroke-width': .6 }, og);
      txt(og, xsep + Lpx / 2, 20, 'positive electrode', 'strong', 'middle'); txt(og, xc + 7, 20, 'collector', '', 'middle');
      var yd = ybot + 10; el('line', { x1: xsep, y1: yd, x2: xc, y2: yd, stroke: 'var(--muted)' }, og);
      el('line', { x1: xsep, y1: yd - 4, x2: xsep, y2: yd + 4, stroke: 'var(--muted)' }, og); el('line', { x1: xc, y1: yd - 4, x2: xc, y2: yd + 4, stroke: 'var(--muted)' }, og);
      txt(og, xsep + Lpx / 2, yd + 15, cs.L + ' µm, porosity ' + cs.eps.toFixed(2), '', 'middle');
      el('line', { x1: sb.x0, y1: sb.y0, x2: xc, y2: sb.y0, stroke: 'var(--line-2)' }, og);
      el('line', { x1: sb.x0, x2: xc, y1: YC(1), y2: YC(1), stroke: 'var(--muted)', 'stroke-dasharray': '2 5' }, og);
      txt(og, xc, YC(1) - 5, 'at the start', '', 'end');
      badge(b2, xc - 14, ytop + 12, 2);
      var pk = packParticles(Lpx, ybot - ytop, 1 - cs.eps, 'disk', 7, 5);
      parts = pk.list.map(function (p) {
        var cx = xsep + p.x, cy = ytop + p.y, c = Math.max(0, Math.min(NC - 1, Math.floor(p.x / Lpx * NC)));
        el('circle', { cx: cx, cy: cy, r: p.r, fill: 'var(--panel-2)', stroke: 'var(--accent)', 'stroke-opacity': '.6' }, pg);
        return { c: c, f: el('circle', { cx: cx, cy: cy, r: p.r, fill: 'var(--accent-strong)', 'fill-opacity': '0' }, pg), ring: el('circle', { cx: cx, cy: cy, r: p.r + 2.5, fill: 'none', stroke: 'var(--cation)', 'stroke-width': 1.6, 'stroke-opacity': '0' }, pg) };
      });
    }
    function profile(U) { // local utilization, front-weighted, mean U (schematic)
      var w = []; for (var j = 0; j < NC; j++) w.push(Math.exp(-cs.k * (j + 0.5) / NC));
      var lo = 0, hi = 50; for (var n = 0; n < 50; n++) { var lam = 0.5 * (lo + hi), m = 0; w.forEach(function (x) { m += Math.min(1, lam * x); }); if (m / NC > U) hi = lam; else lo = lam; }
      return w.map(function (x) { return Math.min(1, lo * x); });
    }
    function place() {
      build();
      var sc = Math.min(1, s), U = sc * cs.uEnd, u = profile(U), u2 = profile(Math.min(cs.uEnd, U + 0.01)), rate = u2.map(function (x, j) { return x - u[j]; }), rmax = Math.max.apply(null, rate) || 1;
      parts.forEach(function (p) { p.f.setAttribute('fill-opacity', (0.05 + 0.9 * u[p.c]).toFixed(3)); p.ring.setAttribute('stroke-opacity', (0.9 * rate[p.c] / rmax).toFixed(3)); });
      // concentration: rises at the foil, falls across the electrode, flat at the collector (no flux there)
      var D = cs.dep * (1 - Math.exp(-sc / 0.12)), xs = [], vs = [];
      for (var i = 0; i <= 120; i++) { var x = sb.x0 + i / 120 * (xc - sb.x0), v;
        if (x <= xsep) v = 1 + cs.rise * D / cs.dep * (1 - (x - sb.x0) / (xsep - sb.x0)) * 0.9;
        else { var xi = (x - xsep) / (xc - xsep); v = 1 - D * (1 - (1 - xi) * (1 - xi)); }
        xs.push(x); vs.push(YC(Math.max(0.02, v))); }
      cl.setAttribute('d', polyD(xs, vs)); cf.setAttribute('d', polyD(xs, vs) + ' L' + xc + ',' + sb.y0 + ' L' + sb.x0 + ',' + sb.y0 + ' Z');
      uf.setAttribute('width', (ub.x1 - ub.x0) * U);
      var xe = ub.x0 + (ub.x1 - ub.x0) * cs.uEnd; um.setAttribute('x1', xe); um.setAttribute('x2', xe); ul.setAttribute('x', Math.min(ub.x1 - 40, Math.max(ub.x0 + 50, xe))); setSvgText(ul, 'cut-off at ' + Math.round(cs.uEnd * 100) + ' %');
      var front = 0, tw = 0; rate.forEach(function (r, j) { front += r * j; tw += r; }); fig._front = xsep + ((tw ? front / tw : 0) + 0.5) / NC * (xc - xsep);
      read.innerHTML = 'Discharge at <b>' + cs.I + ' A/m²</b>, electrode <b>' + cs.L + ' µm</b> thick with porosity <b>' + cs.eps.toFixed(2) + '</b>: ' + Math.round(U * 100) + ' % of the positive material used so far. The rings mark where the reaction is fastest now. This case reaches the cut-off at about <b>' + Math.round(cs.uEnd * 100) + ' %</b> (the published model); the profiles are drawn, not computed.';
    }
    function flowIons(dt) { var xe = fig._front || 200; ions.forEach(function (o) { o.s += dt * 0.35; if (o.s > 1) o.s -= 1; o.e.setAttribute('cx', lerp(xf + 2, xe, o.s)); o.e.setAttribute('cy', o.y); o.e.style.opacity = s >= 1 ? 0 : 1; }); }
    Array.prototype.forEach.call(cb, function (b) { on(b, 'click', function () { cs = CASES[b.getAttribute('data-case')]; Array.prototype.forEach.call(cb, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); s = motion ? 0 : 1; place(); flowIons(0); }); });
    place(); flowIons(0);
    steps(fig, [
      { text: 'The modelled cell: a <b>lithium foil</b>, a polymer electrolyte as separator, and a <b>composite</b> positive electrode of TiS₂ particles packed in the same electrolyte, 100 µm thick with porosity 0.30. Each ion must travel into the pores to reach a particle.' },
      { text: 'Early on the reaction crowds near the separator. The particles carry electrons about 10⁵ times better than the electrolyte carries ions, so the short ionic path wins. As the front particles fill, the reaction moves deeper.' },
      { text: 'The salt piles up near the foil and is drained from the back of the electrode. There the electrolyte runs short of ions, and the particles at the back are hardly used.' },
      { text: 'So the cut-off comes early: at 20 A/m² after about <b>30 %</b> of the material is used; at 10 A/m², 84 %. The same amount of material spread more openly, porosity 0.60 and so 175 µm thick, lifts that to 97 %.' }
    ]);
    var loop = anim(fig, function (dt) { flowIons(dt); if (dt === 0) return; s += dt / 8; if (s > 1.25) s = 0; place(); }, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
    if (!motion) { s = 1; place(); flowIons(0); }
  });

  /* ===== 5.10 Reading a curve by its slopes: dV/dQ and dQ/dV (after Olson et al. 2023) ===== */
  /* A toy cell. Each electrode's lithium content is a sum of smooth steps in its potential,
     x(U) = sum w / (1 + exp((U - Uj)/xi)), one step per plateau: an illustrative choice of ours
     with the properties Olson et al. ask of such a function (smooth, strictly monotonic). The
     plateau potentials are invented, not those of a real material. */
  var TOY = {
    neg: [{ U: 0.21, w: 0.40, xi: 0.010 }, { U: 0.12, w: 0.50, xi: 0.008 }, { U: 0.55, w: 0.10, xi: 0.12 }],
    pos: [{ U: 3.70, w: 0.30, xi: 0.06 }, { U: 3.92, w: 0.30, xi: 0.012 }, { U: 4.10, w: 0.22, xi: 0.015 }, { U: 4.45, w: 0.18, xi: 0.08 }]
  };
  function toyX(st, U) { var x = 0; st.forEach(function (s) { x += s.w / (1 + Math.exp((U - s.U) / s.xi)); }); return x; }
  function toyU(st, x) { var lo = -3, hi = 7; for (var n = 0; n < 60; n++) { var m = 0.5 * (lo + hi); if (toyX(st, m) > x) lo = m; else hi = m; } return 0.5 * (lo + hi); }
  register('f5-9', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sLLI = fig.querySelector('.lli'), sLAM = fig.querySelector('.lam'), vLLI = fig.querySelector('.lli-val'), vLAM = fig.querySelector('.lam-val');
    var A = { x0: 50, y0: 132, x1: 290, y1: 28 }, A2 = { x0: 50, y0: 190, x1: 290, y1: 150 }, B = { x0: 50, y0: 352, x1: 290, y1: 226 }, Cb = { x0: 344, y0: 150, x1: 505, y1: 28 }, D = { x0: 382, y0: 352, x1: 500, y1: 226 };
    var Vlo = 3.0, Vhi = 4.2, Cn0 = 1.15, QMAX = 1.0, DVMAX = 12, DQMAX = 5;
    plotAxes(g, A, { yt: [3.0, 3.6, 4.2], ylo: 2.9, yhi: 4.3, yf: function (v) { return v.toFixed(1); }, ylab: 'cell voltage V, and U_{pos} (thin, blue)' });
    plotAxes(g, A2, { yt: [0, 0.3, 0.6], ylo: -0.02, yhi: 0.7, yf: function (v) { return v.toFixed(1); }, ylab: 'U_{neg} against Li', xlab: 'charge Q →' });
    plotAxes(g, B, { ylab: 'dV/dQ', xlab: 'charge Q →' });
    plotAxes(g, Cb, { ylab: 'dQ/dV' });
    [3.0, 3.6, 4.2].forEach(function (v) { txt(g, Cb.x0 + (v - Vlo) / (Vhi - Vlo) * (Cb.x1 - Cb.x0), Cb.y0 + 15, v.toFixed(1) + (v > 4 ? ' V' : ''), '', v > 4 ? 'end' : 'middle'); });
    el('rect', { x: D.x0, y: D.y1, width: D.x1 - D.x0, height: D.y0 - D.y1, fill: 'none', stroke: 'var(--line-2)' }, g);
    txt(g, D.x1, D.y0 + 15, 'x_neg →', '', 'end'); txt(g, D.x0 - 5, D.y1 + 8, '1 − x_pos', '', 'end');
    var bandG = el('g', {}, g);
    var XD = function (x) { return D.x0 + x * (D.x1 - D.x0); }, YD = function (y) { return D.y0 - y * (D.y0 - D.y1); };
    // plateau bands on the square plot: where each electrode sits on a plateau (|U - Uj| < 2 xi)
    TOY.neg.forEach(function (s) { if (s.xi > 0.05) return; var a = toyX(TOY.neg, s.U + 2 * s.xi), b2 = toyX(TOY.neg, s.U - 2 * s.xi); el('rect', { x: XD(a), y: D.y1, width: XD(b2) - XD(a), height: D.y0 - D.y1, fill: 'var(--second)', 'fill-opacity': '.16' }, bandG); });
    TOY.pos.forEach(function (s) { if (s.xi > 0.05) return; var a = 1 - toyX(TOY.pos, s.U - 2 * s.xi), b2 = 1 - toyX(TOY.pos, s.U + 2 * s.xi); el('rect', { x: D.x0, y: YD(b2), width: D.x1 - D.x0, height: YD(a) - YD(b2), fill: 'var(--accent)', 'fill-opacity': '.16' }, bandG); });
    var lineF = el('line', { stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, g), lineA = el('line', { stroke: 'var(--text)', 'stroke-width': 2 }, g);
    var pVf = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, g), pV = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    var pP = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.4 }, g), pN = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 1.4 }, g), pT = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    var pCf = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, g), pC = el('path', { fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
        var pUp = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.3 }, g), pUn = el('path', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 1.8 }, g), pkG = el('g', {}, g);
    var YA2 = function (v) { return A2.y0 - (v + 0.02) / 0.72 * (A2.y0 - A2.y1); };
    var dots = [0, 1, 2, 3].map(function () { return el('circle', { r: 4, 'class': 'ion' }, g); });
    badge(g, A.x0 + 18, A.y1 + 14, 1); badge(g, B.x0 + 18, B.y1 + 14, 2); badge(g, Cb.x0 + 18, Cb.y1 + 14, 3); badge(g, D.x0 - 18, D.y0 - 22, 4);
    var cur = null, fresh = null, kq = 0.5;
    function cell(LLI, LAM) {
      var Cp = 1 - LAM, nLi = 1 - LLI;
      function V(Q) { return toyU(TOY.pos, (nLi - Q) / Cp) - toyU(TOY.neg, Q / Cn0); }
      function solveV(target) { var lo = 1e-4, hi = nLi - 1e-4; for (var n = 0; n < 60; n++) { var m = 0.5 * (lo + hi); if (V(m) < target) lo = m; else hi = m; } return 0.5 * (lo + hi); }
      var q0 = solveV(Vlo), q1 = solveV(Vhi), N = 360, pts = [];
      for (var i = 0; i <= N; i++) {
        var Q = q0 + (q1 - q0) * i / N, h = (q1 - q0) / N * 0.25;
        var up = toyU(TOY.pos, (nLi - Q) / Cp), un = toyU(TOY.neg, Q / Cn0);
        var dup = (toyU(TOY.pos, (nLi - Q - h) / Cp) - toyU(TOY.pos, (nLi - Q + h) / Cp)) / (2 * h), dun = (toyU(TOY.neg, (Q - h) / Cn0) - toyU(TOY.neg, (Q + h) / Cn0)) / (2 * h);
        pts.push({ Q: Q - q0, V: up - un, up: up, un: un, dP: dup, dN: dun, dV: dup + dun, xn: Q / Cn0, yp: 1 - (nLi - Q) / Cp });
      }
      return { pts: pts, cap: q1 - q0, a: Cn0 / Cp, b: 1 - nLi / Cp, q0: q0, q1: q1, Cp: Cp, nLi: nLi };
    }
    var XA = function (q) { return A.x0 + q / QMAX * (A.x1 - A.x0); }, YA = function (v) { return A.y0 - (v - 2.9) / 1.4 * (A.y0 - A.y1); };
    var XB = function (q) { return B.x0 + q / QMAX * (B.x1 - B.x0); }, YB = function (d) { return B.y0 - Math.min(d, DVMAX) / DVMAX * (B.y0 - B.y1); };
    var XC = function (v) { return Cb.x0 + (v - Vlo) / (Vhi - Vlo) * (Cb.x1 - Cb.x0); }, YCc = function (d) { return Cb.y0 - Math.min(d, DQMAX) / DQMAX * (Cb.y0 - Cb.y1); };
    function lineOf(c, node) { var p0 = c.pts[0], p1 = c.pts[c.pts.length - 1]; node.setAttribute('x1', XD(p0.xn)); node.setAttribute('y1', YD(p0.yp)); node.setAttribute('x2', XD(p1.xn)); node.setAttribute('y2', YD(p1.yp)); }
    function draw() {
      var LLI = +sLLI.value / 100, LAM = +sLAM.value / 100; setSvgText(vLLI, Math.round(LLI * 100) + ' %'); setSvgText(vLAM, Math.round(LAM * 100) + ' %');
      if (!fresh) fresh = cell(0, 0);
      cur = cell(LLI, LAM);
      var P1 = cur.pts, F1 = fresh.pts;
      pVf.setAttribute('d', polyD(F1.map(function (p) { return XA(p.Q); }), F1.map(function (p) { return YA(p.V); })));
      pV.setAttribute('d', polyD(P1.map(function (p) { return XA(p.Q); }), P1.map(function (p) { return YA(p.V); })));
      pUp.setAttribute('d', polyD(P1.map(function (p) { return XA(p.Q); }), P1.map(function (p) { return YA(Math.min(4.3, p.up)); })));
      pUn.setAttribute('d', polyD(P1.map(function (p) { return XA(p.Q); }), P1.map(function (p) { return YA2(Math.min(0.7, p.un)); })));
      // mark each dV/dQ peak with the colour of the electrode that makes it
      clear(pkG);
      for (var i = 2; i < P1.length - 2; i++) { var d = P1[i].dV; if (d > 1.2 && d > P1[i - 1].dV && d >= P1[i + 1].dV && d > P1[i - 2].dV && d >= P1[i + 2].dV) el('circle', { cx: XB(P1[i].Q), cy: Math.max(B.y1 + 6, YB(d) - 7), r: 3.5, fill: P1[i].dP > P1[i].dN ? 'var(--accent)' : 'var(--second)', stroke: '#fff' }, pkG); }
      pP.setAttribute('d', polyD(P1.map(function (p) { return XB(p.Q); }), P1.map(function (p) { return YB(p.dP); })));
      pN.setAttribute('d', polyD(P1.map(function (p) { return XB(p.Q); }), P1.map(function (p) { return YB(p.dN); })));
      pT.setAttribute('d', polyD(P1.map(function (p) { return XB(p.Q); }), P1.map(function (p) { return YB(p.dV); })));
      pCf.setAttribute('d', polyD(F1.map(function (p) { return XC(p.V); }), F1.map(function (p) { return YCc(1 / p.dV); })));
      pC.setAttribute('d', polyD(P1.map(function (p) { return XC(p.V); }), P1.map(function (p) { return YCc(1 / p.dV); })));
      lineOf(fresh, lineF); lineOf(cur, lineA);
      place();
    }
    function place() {
      var P1 = cur.pts, p = P1[Math.max(0, Math.min(P1.length - 1, Math.round(kq * (P1.length - 1))))];
      var at = [[XA(p.Q), YA(p.V)], [XB(p.Q), YB(p.dV)], [XC(p.V), YCc(1 / p.dV)], [XD(p.xn), YD(p.yp)]];
      dots.forEach(function (d, i) { d.setAttribute('cx', at[i][0]); d.setAttribute('cy', at[i][1]); });
      var who = p.dP > 2 * p.dN ? 'the positive electrode is between two plateaus' : p.dN > 2 * p.dP ? 'the negative electrode is between two plateaus' : (p.dV < 0.6 ? 'both electrodes sit on plateaus, so the cell voltage barely moves: a dQ/dV peak' : 'both electrodes are changing');
      read.innerHTML = 'Toy cell, aged by ' + sLLI.value + ' % lithium loss and ' + sLAM.value + ' % positive-material loss: capacity between 3.0 and 4.2 V is <b>' + Math.round(cur.cap / fresh.cap * 100) + ' %</b> of the fresh cell’s. At the cursor V = <b>' + p.V.toFixed(3) + ' V</b>: ' + who + '. Charging line: slope a = ' + cur.a.toFixed(2) + ', intercept b = ' + cur.b.toFixed(2) + '.';
    }
    on(sLLI, 'input', draw); on(sLAM, 'input', draw);
    draw();
    steps(fig, [
      { text: 'A toy cell with invented plateaus. Its voltage is the positive electrode’s potential minus the negative’s, V = U<sub>pos</sub> − U<sub>neg</sub>, and each electrode has its own plateaus. The dashed lines are the fresh cell.' },
      { text: '<b>dV/dQ</b> is the slope of the curve. The cell’s is simply the sum of the two electrodes’ (blue plus green), so every peak belongs to one electrode: it marks that electrode leaving one plateau for the next.' },
      { text: '<b>dQ/dV</b> turns the curve on its side: charge stored per volt. A peak means the voltage hardly moves while charge flows, which needs <b>both</b> electrodes on a plateau at once.' },
      { text: 'The square plot shows both at once: across, the negative electrode’s lithium; up, the positive’s, inverted. A cell is a straight line. Green bands are the negative’s plateaus, blue bands the positive’s, and a dQ/dV peak sits where the line crosses both. Lose lithium and the line moves up; lose positive material and it steepens.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; kq += dt / 10; if (kq > 1) kq = 0; place(); }, { autoplay: true, stepDt: 0.4 });
    bind(fig, loop);
  });
