  /* ===================== Lab: cyclic voltammetry (figures f11-19 to f11-27) ===================== */
  /* shared: a plot frame with ticks, returning the two scale functions */
  function cvFrame(g, b, xr, yr, o) {
    o = o || {};
    var X = function (x) { return b.x0 + (x - xr[0]) / (xr[1] - xr[0]) * (b.x1 - b.x0); };
    var Y = function (y) { return b.y0 - (y - yr[0]) / (yr[1] - yr[0]) * (b.y0 - b.y1); };
    el('line', { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0, stroke: 'var(--line-2)' }, g);
    el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, stroke: 'var(--line-2)' }, g);
    (o.xt || []).forEach(function (t) { var x = X(t[0]); el('line', { x1: x, x2: x, y1: b.y0, y2: b.y0 + 4, stroke: 'var(--line-2)' }, g); if (o.grid) el('line', { x1: x, x2: x, y1: b.y0, y2: b.y1, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); txt(g, x, b.y0 + 16, t[1], '', 'middle'); });
    (o.yt || []).forEach(function (t) { var y = Y(t[0]); el('line', { x1: b.x0 - 4, x2: b.x0, y1: y, y2: y, stroke: 'var(--line-2)' }, g); if (o.grid) el('line', { x1: b.x0, x2: b.x1, y1: y, y2: y, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); txt(g, b.x0 - 7, y + 4, t[1], '', 'end'); });
    if (o.zero) el('line', { x1: b.x0, x2: b.x1, y1: Y(0), y2: Y(0), stroke: 'var(--line-2)', 'stroke-dasharray': '4 3' }, g);
    if (o.xl) txt(g, b.x1, b.y0 + 32, o.xl, '', 'end');
    if (o.yl) txt(g, b.x0 - 6, b.y1 - 10, o.yl, '', 'start');
    return { X: X, Y: Y };
  }
  function cvPath(xs, ys, X, Y, from, to) {
    var d = '', a = from || 0, z = to === undefined ? xs.length : to;
    for (var k = a; k < z; k++) d += (k === a ? 'M' : 'L') + X(xs[k]).toFixed(1) + ',' + Y(ys[k]).toFixed(1);
    return d;
  }
  var CV_A = 0.0707, CV_D = 1e-5, CV_C = 1e-6; // a 3 mm disc, 1e-5 cm2/s, 1 mM
  function cvRun(o) { return P.cv.simulate(Object.assign({ Ei: -0.3, Es: 0.3, E0: 0, D: CV_D, C: CV_C, A: CV_A, steps: 600 }, o)); }
  function uA(i) { return i * 1e6; }

  /* f11-19: the experiment: a three-electrode cell, the triangular sweep, and the voltammogram it draws */
  register('f11-19', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sv = fig.querySelector('.cvv'), vv = fig.querySelector('.cvv-val');
    var sel = 'we', sense = false, phase = 0.3, sim = null, imax = 1;
    var XW = 92, XR = 132, XC = 178, LIQ = 150;
    // ---- the potentiostat: a live display and three sockets ----
    el('rect', { x: 18, y: 8, width: 214, height: 60, rx: 7, fill: M('steel'), stroke: '#8B95A0', filter: 'url(#fx-lift)' }, g);
    el('rect', { x: 27, y: 15, width: 112, height: 40, rx: 4, fill: '#1B2430', stroke: '#0E141B' }, g);
    var MONO = 'fill:#7CF0C4;font-size:10px;font-family:var(--mono)';
    var lcdE = txt(g, 33, 28, '', '', 'start', { style: MONO }), lcdI = txt(g, 33, 40, '', '', 'start', { style: MONO }), lcdT = txt(g, 33, 52, '', '', 'start', { style: MONO + ';opacity:.75' });
    txt(g, 186, 25, 'potentiostat', '', 'middle', { style: 'font-size:11px' });
    var lcdV = txt(g, 186, 40, '', 'strong', 'middle', { style: 'font-size:11px' });
    [[64, 'var(--accent)', 'WE'], [126, 'var(--second)', 'RE'], [188, 'var(--heat)', 'CE']].forEach(function (s) {
      el('circle', { cx: s[0], cy: 61, r: 4.2, fill: '#2A3038', stroke: s[1], 'stroke-width': 2 }, g);
    });
    // ---- the cell: glass, electrolyte, a PTFE lid ----
    el('rect', { x: 47, y: LIQ, width: 184, height: 149, rx: 10, fill: MV('electrolyte') }, g);
    el('line', { x1: 48, x2: 230, y1: LIQ, y2: LIQ, stroke: '#9FB3C2', 'stroke-width': 1 }, g);
    el('rect', { x: 46, y: 122, width: 186, height: 178, rx: 10, fill: 'none', stroke: '#9FB3C2', 'stroke-width': 1.6 }, g);
    el('rect', { x: 52, y: 134, width: 3, height: 150, rx: 1.5, fill: '#fff', opacity: 0.6 }, g);
    el('rect', { x: 40, y: 112, width: 198, height: 14, rx: 3, fill: MV('polymer'), stroke: '#C9C3B4' }, g);
    // supporting electrolyte: many ions, far more than the analyte
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var q = 0; q < 70; q++) {
      var ix = 56 + rnd() * 168, iy = LIQ + 10 + rnd() * 128, cat = q % 2 === 0;
      if (Math.abs(ix - XW) < 14 || Math.abs(ix - XR) < 13 || Math.abs(ix - XC) < 16 || (iy > 274 && ix > 70 && ix < 200) || (Math.abs(ix - 66) < 14 && Math.abs(iy - 200) < 14) || (Math.abs(ix - 155) < 14 && Math.abs(iy - 160) < 14)) continue;
      el('circle', { cx: ix.toFixed(1), cy: iy.toFixed(1), r: cat ? 2 : 2.6, fill: cat ? 'var(--cation)' : 'var(--anion)', opacity: 0.45 }, g);
    }
    // ---- leads from the sockets ----
    function lead(d, col) { return el('path', { d: d, fill: 'none', stroke: col, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g); }
    var dWE = 'M64,65 C64,78 ' + XW + ',72 ' + XW + ',88', dCE = 'M188,65 C188,78 ' + XC + ',72 ' + XC + ',86';
    lead(dWE, 'var(--accent)'); lead('M126,65 C126,76 ' + XR + ',72 ' + XR + ',86', 'var(--second)'); lead(dCE, 'var(--heat)');
    // ---- working electrode: a glassy carbon disc set in a PTFE shroud ----
    var parts = {};
    var we = el('g', { tabindex: 0, role: 'button', 'aria-label': 'working electrode', style: 'cursor:pointer' }, g);
    el('rect', { x: XW - 5, y: 86, width: 10, height: 10, rx: 1.5, fill: M('steel') }, we);
    el('rect', { x: XW - 8, y: 96, width: 16, height: 170, rx: 3, fill: M('polymer'), stroke: '#B9B3A3' }, we);
    el('rect', { x: XW - 5.5, y: 261, width: 11, height: 5, rx: 1, fill: MV('carbon') }, we);
    parts.we = el('rect', { x: XW - 12, y: 82, width: 24, height: 190, rx: 5, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-opacity': 0 }, we);
    // ---- reference electrode: a silver wire in its own solution, behind a porous frit ----
    var re = el('g', { tabindex: 0, role: 'button', 'aria-label': 'reference electrode', style: 'cursor:pointer' }, g);
    el('rect', { x: XR - 8, y: 88, width: 16, height: 8, rx: 2, fill: MV('polymer'), stroke: '#C9C3B4' }, re);
    el('rect', { x: XR - 7, y: 96, width: 14, height: 156, rx: 7, fill: 'rgba(225,238,246,.6)', stroke: '#9FB3C2' }, re);
    el('rect', { x: XR - 5.5, y: 136, width: 11, height: 108, rx: 4, fill: MV('electrolyte'), opacity: 0.9 }, re);
    el('rect', { x: XR - 6, y: 243, width: 12, height: 8, rx: 2, fill: MV('ceramic'), stroke: '#B8B0A0', 'stroke-width': 0.6 }, re);
    el('line', { x1: XR, y1: 86, x2: XR, y2: 232, stroke: MC('silver'), 'stroke-width': 2 }, re);
    parts.re = el('rect', { x: XR - 11, y: 82, width: 22, height: 176, rx: 8, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-opacity': 0 }, re);
    // ---- counter electrode: a platinum wire wound into a coil ----
    var ce = el('g', { tabindex: 0, role: 'button', 'aria-label': 'counter electrode', style: 'cursor:pointer' }, g);
    el('line', { x1: XC, y1: 86, x2: XC, y2: 172, stroke: MC('silver'), 'stroke-width': 2 }, ce);
    for (var c = 0; c < 8; c++) {
      var cy = 172 + c * 11;
      el('path', { d: 'M' + (XC + 9) + ',' + cy + ' Q' + XC + ',' + (cy - 4) + ' ' + (XC - 9) + ',' + (cy + 1), fill: 'none', stroke: '#9DA3AA', 'stroke-width': 1.8 }, ce);
      el('path', { d: 'M' + (XC - 9) + ',' + (cy + 1) + ' Q' + XC + ',' + (cy + 9) + ' ' + (XC + 9) + ',' + (cy + 11), fill: 'none', stroke: MC('silver'), 'stroke-width': 2.2 }, ce);
    }
    parts.ce = el('rect', { x: XC - 14, y: 82, width: 28, height: 186, rx: 6, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-opacity': 0 }, ce);
    // ---- argon: sparged through the liquid first, then kept as a blanket above it during the scan ----
    el('path', { d: 'M252,84 H220 Q214,84 214,90 V142', fill: 'none', stroke: '#9FB3C2', 'stroke-width': 3.2 }, g);
    txt(g, 252, 78, 'Ar', 'strong', 'end', { style: 'font-size:11px' });
    arrow(g, 210, 144, 196, 146, '#9FB3C2', 1.2); arrow(g, 218, 144, 228, 140, '#9FB3C2', 1.2);
    // ---- the current: electrons in the leads, ions in the solution ----
    var fl = [el('path', { d: dWE, fill: 'none', stroke: 'var(--electron)', 'stroke-width': 2.6, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round' }, g),
              el('path', { d: dCE, fill: 'none', stroke: 'var(--electron)', 'stroke-width': 2.6, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round' }, g),
              el('path', { d: 'M' + (XW + 7) + ',266 C118,280 162,280 ' + (XC - 8) + ',256', fill: 'none', stroke: 'var(--field)', 'stroke-width': 2, 'stroke-dasharray': '5 6' }, g)];
    var sl = el('g', {}, g);
    el('path', { d: 'M' + (XR - 3) + ',252 L' + (XW + 7) + ',262', fill: 'none', stroke: 'var(--second)', 'stroke-width': 1.6, 'stroke-dasharray': '2 3' }, sl);
    txt(sl, 112, 252, 'E', 'cyan', 'middle', { style: 'font-size:11px;font-weight:600' });
    txt(g, XW, 294, 'WE', 'amber', 'middle'); txt(g, XR, 294, 'RE', 'cyan', 'middle'); txt(g, XC, 294, 'CE', 'heat', 'middle');
    [['we', we], ['re', re], ['ce', ce]].forEach(function (p) { pressable(p[1], function () { sel = p[0]; place(); }); });
    // ---- the close-up lens ----
    var uid = 'cvl' + Math.random().toString(36).slice(2, 7), defs = svg.querySelector('defs') || el('defs', {}, svg);
    el('circle', { cx: 52, cy: 352, r: 38 }, el('clipPath', { id: uid }, defs));
    var leader = el('line', { stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, g);
    el('circle', { cx: 52, cy: 352, r: 38, fill: '#fff' }, g);
    var lens = el('g', { 'clip-path': 'url(#' + uid + ')' }, g);
    el('circle', { cx: 52, cy: 352, r: 38, fill: 'none', stroke: '#9FB3C2', 'stroke-width': 2 }, g);
    var lt1 = txt(g, 100, 336, '', 'strong', 'start', { style: 'font-size:11px' }), lt2 = txt(g, 100, 352, '', '', 'start', { style: 'font-size:10px' }), lt3 = txt(g, 100, 366, '', '', 'start', { style: 'font-size:10px' });
    function drawLens() {
      clear(lens);
      if (sel === 'we') {
        el('rect', { x: 14, y: 314, width: 76, height: 76, fill: MV('polymer') }, lens);
        el('circle', { cx: 52, cy: 352, r: 17, fill: MB('carbon') }, lens);
        el('ellipse', { cx: 46, cy: 345, rx: 7, ry: 3.5, fill: '#fff', opacity: 0.35, transform: 'rotate(-30 46 345)' }, lens);
        el('line', { x1: 35, x2: 69, y1: 376, y2: 376, stroke: 'var(--text)', 'stroke-width': 1 }, lens);
        txt(lens, 52, 386, '3 mm', '', 'middle', { style: 'font-size:9px' });
        setSvgText(lt1, 'Working electrode, end-on'); setSvgText(lt2, 'glassy carbon disc, PTFE body,'); setSvgText(lt3, 'polished before each run');
      } else if (sel === 're') {
        el('rect', { x: 14, y: 314, width: 76, height: 76, fill: MV('electrolyte') }, lens);
        el('rect', { x: 36, y: 300, width: 32, height: 82, rx: 14, fill: 'rgba(225,238,246,.8)', stroke: '#9FB3C2', 'stroke-width': 1.6 }, lens);
        el('rect', { x: 37, y: 366, width: 30, height: 14, rx: 3, fill: MV('ceramic'), stroke: '#B8B0A0' }, lens);
        for (var k = 0; k < 6; k++) el('circle', { cx: 41 + k * 4.4, cy: 371 + (k % 2) * 4, r: 1.1, fill: '#B8B0A0' }, lens);
        el('line', { x1: 52, y1: 300, x2: 52, y2: 356, stroke: MC('silver'), 'stroke-width': 3 }, lens);
        setSvgText(lt1, 'Reference electrode'); setSvgText(lt2, 'silver wire in its own solution'); setSvgText(lt3, 'behind a porous frit; no current');
      } else {
        el('rect', { x: 14, y: 314, width: 76, height: 76, fill: MV('electrolyte') }, lens);
        for (var j = 0; j < 4; j++) {
          var y = 322 + j * 18;
          el('path', { d: 'M74,' + y + ' Q52,' + (y - 8) + ' 30,' + (y + 2), fill: 'none', stroke: '#9DA3AA', 'stroke-width': 3.4 }, lens);
          el('path', { d: 'M30,' + (y + 2) + ' Q52,' + (y + 16) + ' 74,' + (y + 18), fill: 'none', stroke: MC('silver'), 'stroke-width': 4 }, lens);
        }
        setSvgText(lt1, 'Counter electrode'); setSvgText(lt2, 'platinum wire coil, larger'); setSvgText(lt3, 'than the working electrode');
      }
      var tip = { we: [XW - 6, 266], re: [XR - 6, 250], ce: [XC - 10, 262] }[sel];
      leader.setAttribute('x1', 80); leader.setAttribute('y1', 326); leader.setAttribute('x2', tip[0]); leader.setAttribute('y2', tip[1]);
    }
    // ---- right: the waveform E(t), and the current plotted against E ----
    var Ei = -0.3, Es = 0.3, bt = { x0: 300, y0: 150, x1: 506, y1: 34 };
    var ft = cvFrame(g, bt, [0, 2], [-0.4, 0.4], { yt: [[-0.3, '−0.3'], [0, '0'], [0.3, '+0.3']], zero: true, yl: 'E − E°′, V' });
    var tlab = [0, 1, 2].map(function (k) { return txt(g, ft.X(k), bt.y0 + 16, '', '', 'middle'); });
    txt(g, bt.x1, bt.y0 + 30, 'time, s →', '', 'end');
    el('path', { d: 'M' + ft.X(0) + ',' + ft.Y(Ei) + ' L' + ft.X(1) + ',' + ft.Y(Es) + ' L' + ft.X(2) + ',' + ft.Y(Ei), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g);
    [[0, Ei, 'initial', 'start', 6, 14], [1, Es, 'switching', 'middle', 0, -9], [2, Ei, 'final', 'end', -6, 14]].forEach(function (p) { el('circle', { cx: ft.X(p[0]), cy: ft.Y(p[1]), r: 3.5, fill: 'var(--accent)' }, g); txt(g, ft.X(p[0]) + p[4], ft.Y(p[1]) + p[5], p[2], '', p[3], { style: 'font-size:11px' }); });
    txt(g, ft.X(1), ft.Y(-0.12), 'slope = scan rate', 'amber', 'middle', { style: 'font-size:11px' });
    var tline = el('line', { y1: bt.y1, y2: bt.y0, stroke: 'var(--muted)', 'stroke-dasharray': '2 3' }, g), tdot = el('circle', { r: 5.5, fill: 'var(--electron)', stroke: 'var(--electron-edge)', 'stroke-width': 1.2 }, g);
    txt(g, 403, 200, 'the same current, plotted against E', '', 'middle', { style: 'font-size:11px' });
    arrow(g, 403, 204, 403, 218, 'var(--muted)', 1.4);
    var gi = el('g', {}, g), bi = { x0: 300, y0: 362, x1: 506, y1: 234 }, fi, ghost, trace, idot;
    function frameI() {
      clear(gi);
      var top = uA(imax), st = top > 40 ? 20 : top > 16 ? 10 : 5, yt = [];
      for (var t = -Math.floor(top * 0.8 / st) * st; t <= top; t += st) yt.push([t, (t < 0 ? '−' : '') + Math.abs(t)]);
      fi = cvFrame(gi, bi, [-0.3, 0.3], [-top * 0.85, top * 1.2], { xt: [[-0.3, '−0.3'], [0, '0'], [0.3, '+0.3']], yt: yt, zero: true, xl: 'E − E°′, V', yl: 'i, µA (oxidation +)' });
      ghost = el('path', { fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 1.6, d: cvPath(sim.E, sim.i.map(uA), fi.X, fi.Y) }, gi);
      trace = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, gi);
      idot = el('circle', { r: 5.5, fill: 'var(--electron)', stroke: 'var(--electron-edge)', 'stroke-width': 1.2 }, gi);
      txt(gi, fi.X(0.24), fi.Y(uA(imax) * 0.62), 'forward', '', 'middle', { style: 'font-size:10px' });
      txt(gi, fi.X(-0.2), fi.Y(-uA(imax) * 0.5), 'return', '', 'middle', { style: 'font-size:10px' });
    }
    badge(g, 66, 200, 1); badge(g, 155, 160, 2); badge(g, 494, 50, 3); badge(g, 494, 250, 4);
    var INFO = {
      we: '<b>Working electrode</b>: where the reaction we study happens. It must be inert over the potential range and have a clean, well-defined surface: a glassy carbon, platinum or gold disc, polished before every experiment. For a battery material, the working electrode is the composite electrode itself.',
      re: '<b>Reference electrode</b>: a fixed point against which the working electrode&#8217;s potential is measured; no current should pass through it. In nonaqueous solvents a Ag⁺/Ag reference drifts, so potentials are best quoted against ferrocene added from the start; in a lithium half-cell the reference is lithium metal.',
      ce: '<b>Counter electrode</b>: completes the circuit by running the opposite reaction. It should be inert and larger than the working electrode; a platinum wire or coil is typical.'
    };
    function scanRate() { return Math.pow(10, +sv.value); }
    function rebuild() {
      var v = scanRate(); sim = cvRun({ v: v, steps: 400 }); imax = P.cv.peaks(sim).ipa;
      var tSw = (Es - Ei) / v;
      tlab.forEach(function (t, k) { var s = k * tSw; setSvgText(t, s >= 10 ? s.toFixed(0) : s.toFixed(1)); });
      setSvgText(vv, (v * 1000).toFixed(0) + ' mV/s'); setSvgText(lcdV, (v * 1000).toFixed(0) + ' mV/s');
      frameI();
    }
    function show() {
      var n = sim.E.length, k = Math.min(n - 1, Math.round(phase * (n - 1))), E = sim.E[k], i = sim.i[k];
      var x = ft.X(2 * phase); tline.setAttribute('x1', x); tline.setAttribute('x2', x); tdot.setAttribute('cx', x); tdot.setAttribute('cy', ft.Y(E));
      trace.setAttribute('d', cvPath(sim.E, sim.i.map(uA), fi.X, fi.Y, 0, k + 1)); idot.setAttribute('cx', fi.X(E)); idot.setAttribute('cy', fi.Y(uA(i)));
      setSvgText(lcdE, 'E  ' + (E >= 0 ? '+' : '−') + Math.abs(E).toFixed(3) + ' V');
      setSvgText(lcdI, 'i  ' + (i >= 0 ? '+' : '−') + Math.abs(uA(i)).toFixed(1) + ' µA');
      setSvgText(lcdT, 't  ' + sim.t[k].toFixed(1) + ' s');
      var a = Math.min(1, Math.abs(i) / imax);
      fl.forEach(function (p) { p.setAttribute('stroke-opacity', (0.15 + 0.85 * a).toFixed(2)); });
    }
    var flow = 0;
    function place() {
      Object.keys(parts).forEach(function (k) { parts[k].setAttribute('stroke-opacity', k === sel ? 1 : 0); });
      sl.style.opacity = sense ? 1 : 0.0;
      drawLens();
      var v = scanRate(), tSw = (Es - Ei) / v;
      read.innerHTML = INFO[sel] + ' At ' + (v * 1000).toFixed(0) + ' mV/s the 0.6 V sweep there and back takes ' + (2 * tSw >= 60 ? (2 * tSw / 60).toFixed(1) + ' min' : (2 * tSw).toFixed(1) + ' s') + '; the animation runs at one pace for every scan rate, and the display shows real time.';
    }
    on(sv, 'input', function () { rebuild(); show(); place(); });
    steps(fig, [
      { text: 'The <b>working electrode</b> is where the reaction happens; the potentiostat sets its potential and measures the current through it. Around it, a large excess of supporting electrolyte (the small dots) carries the current through the solution.', on: function () { sel = 'we'; sense = false; place(); } },
      { text: 'Two more electrodes make it work. The current runs between the working and <b>counter</b> electrodes: electrons in the leads, ions in the solution. The potential is sensed between the working and <b>reference</b> electrodes, through which no current passes. Argon bubbled through first removes oxygen; during the scan the gas line is lifted to keep a blanket above the liquid.', on: function () { sel = 're'; sense = true; place(); } },
      { text: 'The <b>sweep</b>: the potential runs linearly in time from the initial value to the switching potential and back. Its slope is the scan rate; everything that follows depends on it.', on: function () { sel = 'we'; sense = false; place(); } },
      { text: 'The <b>voltammogram</b> is the same record, with the current plotted against the potential instead of time. The forward sweep gives the oxidation peak, the return sweep the reduction peak. Watch the leads: the current surges at each peak and reverses direction on the way back.', on: function () { sel = 'we'; sense = false; place(); } }
    ]);
    rebuild();
    var loop = anim(fig, function (dt) {
      phase = (phase + dt / 9) % 1.08; var ph = Math.min(1, phase);
      if (sim) {
        var n = sim.E.length, i = sim.i[Math.min(n - 1, Math.round(ph * (n - 1)))];
        flow += dt * 30 * Math.min(1, Math.abs(i) / imax) * (i >= 0 ? 1 : -1);
        fl[0].setAttribute('stroke-dashoffset', (flow).toFixed(1)); fl[1].setAttribute('stroke-dashoffset', (-flow).toFixed(1)); fl[2].setAttribute('stroke-dashoffset', (-flow).toFixed(1));
        var keep = phase; phase = ph; show(); phase = keep;
      }
    }, { autoplay: true, stepDt: 0.35 });
    bind(fig, loop);
    show(); place();
  });

  /* f11-20: the duck, step by step: the voltammogram and the concentration profiles behind it */
  register('f11-20', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), st = fig.querySelector('.cvt'), stv = fig.querySelector('.cvt-val');
    var o = cvRun({ v: 0.1, steps: 600, profEvery: 6 }), pk = P.cv.peaks(o), n = o.E.length;
    var b = { x0: 58, y0: 236, x1: 292, y1: 34 }, imax = uA(pk.ipa) * 1.15;
    var fr = cvFrame(g, b, [-0.3, 0.3], [-imax * 0.85, imax], { xt: [[-0.3, '−0.3'], [-0.15, '−0.15'], [0, '0'], [0.15, '+0.15'], [0.3, '+0.3']], yt: [[-10, '−10'], [0, '0'], [10, '10'], [20, '20']], zero: true, xl: 'E − E°′, V', yl: 'i, µA (oxidation +)' });
    el('path', { d: cvPath(o.E, o.i.map(uA), fr.X, fr.Y), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }, g);
    // the lettered points
    function idxOf(test) { for (var k = 0; k < n; k++) if (test(k)) return k; return 0; }
    var half = n / 2, iA = 0, iB = idxOf(function (k) { return k < half && o.E[k] >= 0; }), iC = o.i.indexOf(pk.ipa), iD = half - 1, iE = idxOf(function (k) { return k >= half && o.E[k] <= 0; }), iF = o.i.indexOf(pk.ipc), iG = n - 1;
    var PTS = [['A', iA, 8, -8], ['B', iB, -10, -6], ['C', iC, 0, -10], ['D', iD, 8, 4], ['E', iE, 10, 12], ['F', iF, 0, 18], ['G', iG, -8, 14]];
    PTS.forEach(function (p) { var x = fr.X(o.E[p[1]]), y = fr.Y(uA(o.i[p[1]])); el('circle', { cx: x, cy: y, r: 3, fill: 'var(--text)' }, g); txt(g, x + p[2], y + p[3], p[0], 'strong', 'middle'); });
    var mk = el('circle', { r: 6, fill: 'var(--electron)', stroke: 'var(--electron-edge)', 'stroke-width': 1.2 }, g);
    // the concentration profiles beside the electrode
    var pb = { x0: 340, y0: 236, x1: 506, y1: 34 }, xmax = 6 * Math.sqrt(CV_D * o.t[n - 1]) * 0.35;
    var pf = cvFrame(g, pb, [0, xmax * 1e4], [0, 1], { xt: [[0, '0'], [Math.round(xmax * 1e4 / 2), String(Math.round(xmax * 1e4 / 2))], [Math.round(xmax * 1e4), String(Math.round(xmax * 1e4))]], yt: [[0, '0'], [0.5, '0.5'], [1, '1']], xl: 'distance from electrode, µm', yl: 'fraction of the couple' });
    el('rect', { x: pb.x0 - 4, y: pb.y1, width: 4, height: pb.y0 - pb.y1, fill: MV('carbon') }, g);
    var red = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g), ox = el('path', { fill: 'none', stroke: 'var(--field)', 'stroke-width': 2.4 }, g);
    txt(g, pb.x1 - 4, pb.y1 + 14, 'Red', 'amber', 'end'); txt(g, pb.x1 - 4, pb.y1 + 30, 'Ox', 'field', 'end');
    var dl = el('line', { y1: pb.y1 + 40, y2: pb.y0, stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, g), dlt = txt(g, 0, pb.y1 + 52, 'diffusion layer', '', 'start', { style: 'font-size:11px' });
    badge(g, fr.X(o.E[iC]) + 22, fr.Y(uA(pk.ipa)) + 4, 1); badge(g, fr.X(0.25), fr.Y(uA(o.i[Math.round(half * 0.92)])) - 22, 2); badge(g, fr.X(o.E[iF]) - 20, fr.Y(uA(pk.ipc)) + 4, 3);
    function place() {
      var u = +st.value / 1000, j = Math.min(o.prof.length - 1, Math.round(u * (o.prof.length - 1))), pr = o.prof[j], k = Math.min(n - 1, (j + 1) * 6 - 1);
      mk.setAttribute('cx', fr.X(o.E[k])); mk.setAttribute('cy', fr.Y(uA(o.i[k])));
      var dR = '', dO = '', thick = 0;
      pr.p.forEach(function (q, m) { if (q[0] > xmax) return; var x = pf.X(q[0] * 1e4); dR += (m ? 'L' : 'M') + x.toFixed(1) + ',' + pf.Y(q[1]).toFixed(1); dO += (m ? 'L' : 'M') + x.toFixed(1) + ',' + pf.Y(1 - q[1]).toFixed(1); });
      for (var m = 0; m < pr.p.length; m++) if (Math.abs(pr.p[m][1] - pr.p[pr.p.length - 1][1]) < 0.05 && Math.abs(pr.p[m][1] - 1) < 0.05) { thick = pr.p[m][0]; break; }
      red.setAttribute('d', dR); ox.setAttribute('d', dO);
      var xt = pf.X(Math.min(xmax, thick) * 1e4); dl.setAttribute('x1', xt); dl.setAttribute('x2', xt); dlt.setAttribute('x', Math.min(xt + 4, pb.x1 - 70));
      setSvgText(stv, (o.t[k]).toFixed(1) + ' s');
      var E = o.E[k], surf = pr.p[0][1];
      read.innerHTML = 'At t = ' + o.t[k].toFixed(1) + ' s the electrode is at <b>' + (E * 1000).toFixed(0) + ' mV</b> from E°′ on the ' + (k < half ? 'forward (positive)' : 'reverse (negative)') + ' sweep; at its surface Ox/Red = ' + ((1 - surf) / Math.max(1e-6, surf)).toPrecision(2) + ', as the Nernst equation demands. Current <b>' + uA(o.i[k]).toFixed(1) + ' µA</b>; the depleted layer reaches about ' + (thick * 1e4).toFixed(0) + ' µm. Simulated: 1 mM, D = 10⁻⁵ cm²/s, 3 mm disc, 100 mV/s.';
    }
    on(st, 'input', place);
    steps(fig, [
      { text: '<b>A to C.</b> The potential rises past E°′ (at B the two forms are equal at the surface) and Red is oxidized as fast as it arrives. The current peaks at C, about 29 mV past E°′.', on: function () { st.value = Math.round(1000 * iC / n); place(); } },
      { text: '<b>C to D.</b> The surface is now emptied of Red; the current is set by diffusion from ever farther away, and as the depleted layer grows the current falls.', on: function () { st.value = Math.round(1000 * (iD - 10) / n); place(); } },
      { text: '<b>D to G.</b> The sweep turns back; the Ox made on the way out is reduced again, giving the negative peak F. For a reversible couple the peaks are 57 mV apart at 25 °C, and their midpoint, E½, estimates E°′.', on: function () { st.value = Math.round(1000 * iF / n); place(); } }
    ]);
    place();
  });

  /* f11-21: scan rate, the Randles-Sevcik equation, and the capacitive background */
  register('f11-21', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sc = fig.querySelector('.cdl'), scv = fig.querySelector('.cdl-val');
    var VS = [0.02, 0.05, 0.1, 0.2, 0.5], COL = ['#9DB4F0', '#7C9BEB', '#5A80E3', '#3A66D8', '#1F48D6'];
    var b = { x0: 58, y0: 236, x1: 300, y1: 34 }, fr = cvFrame(g, b, [-0.3, 0.3], [-30, 45], { xt: [[-0.3, '−0.3'], [0, '0'], [0.3, '+0.3']], yt: [[-20, '−20'], [0, '0'], [20, '20'], [40, '40']], zero: true, xl: 'E − E°′, V', yl: 'i, µA' });
    var paths = VS.map(function (v, k) { return el('path', { fill: 'none', stroke: COL[k], 'stroke-width': 1.9 }, g); });
    VS.forEach(function (v, k) { txt(g, b.x0 + 8, b.y1 + 12 + k * 14, (v * 1000) + ' mV/s', '', 'start', { style: 'font-size:11px;fill:' + COL[k] }); });
    var pb = { x0: 360, y0: 236, x1: 506, y1: 34 }, pf = cvFrame(g, pb, [0, 0.75], [0, 45], { xt: [[0, '0'], [0.25, '0.25'], [0.5, '0.5'], [0.75, '0.75']], yt: [[0, '0'], [20, '20'], [40, '40']], xl: 'v^{1/2}, (V/s)^{1/2}', yl: 'peak current, µA' });
    var fit = el('line', { stroke: 'var(--muted)', 'stroke-dasharray': '4 3' }, g), dots = VS.map(function (v, k) { return el('circle', { r: 4.5, fill: COL[k], stroke: '#fff' }, g); });
    txt(g, pb.x1, pb.y0 - 38, 'D from the slope', '', 'end', { style: 'font-size:11px' }); var dread = txt(g, pb.x1, pb.y0 - 22, '', 'strong', 'end', { style: 'font-size:11px' });
    badge(g, fr.X(0.06), fr.Y(42), 1); badge(g, pf.X(0.2), pf.Y(36), 2); badge(g, fr.X(0.27), fr.Y(-12), 3);
    function place() {
      var Cdl = +sc.value * 1e-6, ips = [];
      setSvgText(scv, sc.value + ' µF/cm²');
      VS.forEach(function (v, k) { var o = cvRun({ v: v, Cdl: Cdl, steps: 500 }), p = P.cv.peaks(o); ips.push(p.ipa); paths[k].setAttribute('d', cvPath(o.E, o.i.map(uA), fr.X, fr.Y)); dots[k].setAttribute('cx', pf.X(Math.sqrt(v))); dots[k].setAttribute('cy', pf.Y(uA(p.ipa))); });
      var sx = 0, sxy = 0; VS.forEach(function (v, k) { var x = Math.sqrt(v); sx += x * x; sxy += x * ips[k]; });
      var slope = sxy / sx, Dfit = P.cv.dFromRSSlope(slope, 1, CV_A, CV_C);
      fit.setAttribute('x1', pf.X(0)); fit.setAttribute('y1', pf.Y(0)); fit.setAttribute('x2', pf.X(0.75)); fit.setAttribute('y2', pf.Y(uA(slope * 0.75)));
      setSvgText(dread, (Dfit * 1e5).toFixed(2) + ' × 10⁻⁵ cm²/s');
      read.innerHTML = 'Five sweeps of the same 1 mM solution. The peak current follows v<sup>1/2</sup>: from the slope, the Randles-Sevcik equation returns D = <b>' + (Dfit * 1e5).toFixed(2) + ' × 10⁻⁵ cm²/s</b>, against the 1.00 × 10⁻⁵ put into the simulation' + (Cdl > 0 ? '. With ' + sc.value + ' µF/cm² of double layer, the capacitive current, which grows with v itself, has been read as part of each peak and inflates D by ' + ((Dfit / CV_D - 1) * 100).toFixed(0) + ' %: measure peaks from the baseline, not from zero.' : '.');
    }
    on(sc, 'input', place);
    steps(fig, [
      { text: 'A <b>faster sweep</b> leaves less time for the depleted layer to grow; it stays thinner, the gradient steeper, the current larger.' },
      { text: 'For a freely diffusing couple the peak current is <b>proportional to v<sup>1/2</sup></b> (Randles-Sevcik). The slope gives the diffusion coefficient once n, A and C are known.' },
      { text: 'The <b>capacitive current</b>, C<sub>dl</sub>A v, grows with v itself, faster than the faradaic peak. Raise C<sub>dl</sub>: the box widens and, read from zero, it biases every peak.' }
    ]);
    place();
  });

  /* f11-22: how fast is the electron? reversible, quasi-reversible and irreversible */
  register('f11-22', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var sk = fig.querySelector('.k0'), skv = fig.querySelector('.k0-val'), sv = fig.querySelector('.kv'), svv = fig.querySelector('.kv-val');
    var b = { x0: 58, y0: 236, x1: 300, y1: 34 }, fr = cvFrame(g, b, [-0.6, 0.6], [-1.15, 1.2], { xt: [[-0.6, '−0.6'], [-0.3, '−0.3'], [0, '0'], [0.3, '+0.3'], [0.6, '+0.6']], yt: [[-1, '−1'], [0, '0'], [1, '1']], zero: true, xl: 'E − E°′, V', yl: 'i / i_{p, reversible}' });
    var ref = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }, g), cur = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g);
    txt(g, b.x0 + 8, b.y1 + 12, 'dashed: reversible', '', 'start', { style: 'font-size:11px' });
    var pb = { x0: 360, y0: 236, x1: 506, y1: 34 }, LV = [-2, -1.5, -1, -0.5, 0, 0.5, 1];
    var pf = cvFrame(g, pb, [-2, 1], [0, 600], { xt: [[-2, '0.01'], [-1, '0.1'], [0, '1'], [1, '10']], yt: [[57, '57'], [200, '200'], [400, '400'], [600, '600']], xl: 'scan rate, V/s (log)', yl: 'ΔE_{p}, mV' });
    el('line', { x1: pb.x0, x2: pb.x1, y1: pf.Y(57), y2: pf.Y(57), stroke: 'var(--second)', 'stroke-dasharray': '4 3' }, g);
    var line = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, g), dot = el('circle', { r: 5, fill: 'var(--accent)', stroke: '#fff' }, g);
    var zone = txt(g, pb.x0 + 6, pb.y1 + 12, '', 'strong', 'start', { style: 'font-size:11px' });
    badge(g, pf.X(-1.8), pf.Y(57) - 18, 1); badge(g, pf.X(0.6), pf.Y(450), 2); badge(g, fr.X(0.45), fr.Y(0.9), 3);
    function sim(k0, v) { var w = 0.6; return P.cv.simulate({ Ei: -w, Es: w, E0: 0, D: CV_D, C: CV_C, A: CV_A, v: v, k0: k0, steps: 600 }); }
    function place() {
      var k0 = Math.pow(10, +sk.value), v = Math.pow(10, +sv.value);
      setSvgText(skv, k0 >= 0.01 ? k0.toFixed(k0 >= 0.1 ? 1 : 2) + ' cm/s' : k0.toExponential(0).replace('e-', ' × 10⁻') + ' cm/s');
      setSvgText(svv, v >= 1 ? v.toFixed(v >= 10 ? 0 : 1) + ' V/s' : (v * 1000).toFixed(0) + ' mV/s');
      var rs = P.cv.randlesSevcik(1, CV_A, CV_C, CV_D, v), o = sim(k0, v), r = sim(Infinity, v), p = P.cv.peaks(o);
      cur.setAttribute('d', cvPath(o.E, o.i.map(function (i) { return i / rs; }), fr.X, fr.Y));
      ref.setAttribute('d', cvPath(r.E, r.i.map(function (i) { return i / rs; }), fr.X, fr.Y));
      var d = '', pts = LV.map(function (lv) { return [lv, P.cv.peaks(sim(k0, Math.pow(10, lv))).dEp * 1000]; });
      pts.forEach(function (q, m) { d += (m ? 'L' : 'M') + pf.X(q[0]).toFixed(1) + ',' + pf.Y(Math.min(600, q[1])).toFixed(1); }); line.setAttribute('d', d);
      dot.setAttribute('cx', pf.X(+sv.value)); dot.setAttribute('cy', pf.Y(Math.min(600, p.dEp * 1000)));
      var dE = p.dEp * 1000, z = dE < 63 ? 'reversible' : dE < 200 ? 'quasi-reversible' : 'irreversible';
      setSvgText(zone, 'at this rate: ' + z);
      read.innerHTML = 'k⁰ = ' + skv.textContent + ' at ' + svv.textContent + ': ΔE<sub>p</sub> = <b>' + dE.toFixed(0) + ' mV</b>, the forward peak ' + (p.ipa / rs).toFixed(2) + ' × the reversible one. ' + (z === 'reversible' ? 'Electron transfer keeps pace with diffusion: the Nernst equation holds at the surface and the separation stays near 57 mV whatever the rate.' : z === 'quasi-reversible' ? 'The electron transfer can no longer keep up: extra overpotential is needed, and the separation grows with scan rate. Lithium insertion electrodes usually behave like this.' : 'Electron transfer is sluggish: the peaks are pushed far apart and flatten.') + ' Simulated; α = 0.5, D = 10⁻⁵ cm²/s.';
    }
    on(sk, 'input', place); on(sv, 'input', place);
    steps(fig, [
      { text: '<b>Reversible</b>: fast electron transfer. The surface stays at Nernstian equilibrium, and the peak separation stays near 57 mV at every scan rate.', on: function () { sk.value = 0; sv.value = -1; place(); } },
      { text: '<b>Quasi-reversible</b>: the right-hand plot is the test. The separation now grows with scan rate, because the faster we sweep, the less time the slow electron transfer has.', on: function () { sk.value = -2; sv.value = 0; place(); } },
      { text: '<b>Irreversible</b>: very slow electron transfer. The peaks drift hundreds of millivolts apart. Electrochemically irreversible does not mean the product is destroyed; that is chemical irreversibility, a different question.', on: function () { sk.value = -4; sv.value = -1; place(); } }
    ]);
    place();
  });

  /* f11-23: uncompensated resistance mimics slow kinetics */
  register('f11-23', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sr = fig.querySelector('.ru'), srv = fig.querySelector('.ru-val');
    var b = { x0: 58, y0: 236, x1: 420, y1: 34 }, fr = cvFrame(g, b, [-0.4, 0.4], [-300, 360], { xt: [[-0.4, '−0.4'], [-0.2, '−0.2'], [0, '0'], [0.2, '+0.2'], [0.4, '+0.4']], yt: [[-200, '−200'], [-100, '−100'], [0, '0'], [100, '100'], [200, '200'], [300, '300']], zero: true, xl: 'E applied − E°′, V', yl: 'i, µA (1 V/s, 3 mm disc, 5 mM)' });
    var ref = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }, g), cur = el('path', { fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2.4 }, g);
    var pa = txt(g, 430, 70, '', 'strong', 'start'), pb2 = txt(g, 430, 90, '', '', 'start'), pc = txt(g, 430, 126, '', 'strong', 'start'), pd = txt(g, 430, 146, '', '', 'start');
    txt(g, 430, 52, 'ΔE_{p}, mV', '', 'start'); txt(g, 430, 108, 'i R drop at peak', '', 'start');
    badge(g, fr.X(-0.25), fr.Y(200), 1); badge(g, 470, 180, 2);
    var o0 = P.cv.simulate({ Ei: -0.4, Es: 0.4, E0: 0, D: CV_D, C: 5 * CV_C, A: CV_A, v: 1, steps: 600 });
    ref.setAttribute('d', cvPath(o0.E, o0.i.map(uA), fr.X, fr.Y));
    function place() {
      var Ru = +sr.value; setSvgText(srv, Ru + ' Ω');
      var o = P.cv.simulate({ Ei: -0.4, Es: 0.4, E0: 0, D: CV_D, C: 5 * CV_C, A: CV_A, v: 1, Ru: Ru, steps: 600 }), p = P.cv.peaks(o);
      cur.setAttribute('d', cvPath(o.E, o.i.map(uA), fr.X, fr.Y));
      setSvgText(pa, (p.dEp * 1000).toFixed(0)); setSvgText(pb2, 'without: ' + (P.cv.peaks(o0).dEp * 1000).toFixed(0));
      setSvgText(pc, (p.ipa * Ru * 1000).toFixed(0) + ' mV'); setSvgText(pd, uA(p.ipa).toFixed(0) + ' µA × ' + Ru + ' Ω');
      read.innerHTML = 'With R<sub>u</sub> = ' + Ru + ' Ω between the working electrode and the reference, the electrode feels the applied potential minus i R<sub>u</sub>: ' + (p.ipa * Ru * 1000).toFixed(0) + ' mV at the peak. The peaks move apart, to ΔE<sub>p</sub> = <b>' + (p.dEp * 1000).toFixed(0) + ' mV</b>, and look like slow kinetics. The tell-tale test is a couple known to be reversible, such as ferrocene, measured in the same cell.';
    }
    on(sr, 'input', place);
    steps(fig, [
      { text: 'The dashed curve is the true voltammogram; the red one is what the instrument records when the solution between the working and reference electrodes has a resistance. The peaks spread apart and sink, just as if electron transfer were slow.' },
      { text: 'Three remedies: pass less current (a smaller electrode, a slower sweep), raise the electrolyte concentration, and bring the reference closer to the working electrode. Many potentiostats can also measure R<sub>u</sub> and compensate for it.' }
    ]);
    place();
  });

  /* f11-24: diffusion or surface? the b-value and the k1 v + k2 v^(1/2) split */
  register('f11-24', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var sv = fig.querySelector('.bv'), svv = fig.querySelector('.bv-val'), ss = fig.querySelector('.bs'), ssv = fig.querySelector('.bs-val');
    // shapes: the diffusive part is the reversible voltammogram, normalized to its peak; the capacitive part a smoothed box
    var base = cvRun({ v: 0.1, steps: 400 }), pk = P.cv.peaks(base), gD = base.i.map(function (i) { return i / pk.ipa; }), Es = base.E, n = Es.length;
    var gC = Es.map(function (E, k) { var s = k < n / 2 ? 1 : -1, edge = 1 - Math.exp(-((k < n / 2 ? E + 0.3 : 0.3 - E) / 0.03)); return s * edge * (0.75 + 0.25 * Math.exp(-E * E / 0.02)); });
    var b = { x0: 58, y0: 236, x1: 300, y1: 34 }, fr = cvFrame(g, b, [-0.3, 0.3], [-1.2, 1.4], { xt: [[-0.3, '−0.3'], [0, '0'], [0.3, '+0.3']], yt: [[-1, '−1'], [0, '0'], [1, '1']], zero: true, xl: 'E − E_{peak}, V', yl: 'i / v, normalized' });
    var capA = el('path', { fill: 'var(--second)', 'fill-opacity': .28, stroke: 'none' }, g), tot = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }, g);
    txt(g, b.x0 + 8, b.y1 + 12, 'shaded: capacitive part, k₁v', 'cyan', 'start', { style: 'font-size:11px' });
    var pb = { x0: 360, y0: 236, x1: 506, y1: 34 }, pf = cvFrame(g, pb, [-1, 2], [-1, 2.5], { xt: [[-1, '0.1'], [0, '1'], [1, '10'], [2, '100']], yt: [[-1, '0.1'], [0, '1'], [1, '10'], [2, '100']], xl: 'v, mV/s (log)', yl: 'i_{p}, mA (log)' });
    [[0.5, 'b = 0.5'], [1, 'b = 1']].forEach(function (q) { el('line', { x1: pf.X(-1), y1: pf.Y(-0.6 + q[0] * 0), x2: pf.X(2), y2: pf.Y(-0.6 + q[0] * 3), stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' }, g); txt(g, pf.X(2) - 2, pf.Y(-0.6 + q[0] * 3) + (q[0] > 0.6 ? 12 : 14), q[1], '', 'end', { style: 'font-size:11px' }); });
    var lp = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, g), dt = el('circle', { r: 5, fill: 'var(--accent)', stroke: '#fff' }, g), bl = txt(g, pb.x0 + 6, pb.y1 + 12, '', 'strong', 'start', { style: 'font-size:11px' });
    badge(g, pf.X(-0.4), pf.Y(1.6), 1); badge(g, fr.X(0.22), fr.Y(1.25), 2); badge(g, fr.X(0.25), fr.Y(-0.95), 3);
    function place() {
      var v = Math.pow(10, +sv.value), share = +ss.value / 100;      // capacitive share of the peak current at 1 mV/s
      var k1 = share, k2 = 1 - share;                                  // so that ip(1 mV/s) = 1 mA
      setSvgText(svv, v >= 10 ? v.toFixed(0) + ' mV/s' : v.toFixed(v >= 1 ? 1 : 2) + ' mV/s'); setSvgText(ssv, ss.value + ' %');
      var ip = function (vv) { return k1 * vv + k2 * Math.sqrt(vv); };
      var scale = ip(v), dT = '', dC = '';
      for (var k = 0; k < n; k++) { var c = k1 * v * gC[k], t = c + k2 * Math.sqrt(v) * gD[k]; dT += (k ? 'L' : 'M') + fr.X(Es[k]).toFixed(1) + ',' + fr.Y(t / scale * 1.0).toFixed(1); }
      for (k = 0; k < n; k++) dC += (k ? 'L' : 'M') + fr.X(Es[k]).toFixed(1) + ',' + fr.Y(k1 * v * gC[k] / scale).toFixed(1);
      dC += 'Z'; tot.setAttribute('d', dT); capA.setAttribute('d', dC);
      var d = ''; for (var m = 0; m <= 30; m++) { var lv = -1 + m * 0.1; d += (m ? 'L' : 'M') + pf.X(lv).toFixed(1) + ',' + pf.Y(Math.log10(ip(Math.pow(10, lv)))).toFixed(1); } lp.setAttribute('d', d);
      dt.setAttribute('cx', pf.X(+sv.value)); dt.setAttribute('cy', pf.Y(Math.log10(scale)));
      var bb = P.cv.bValue(ip(v / 1.2), v / 1.2, ip(v * 1.2), v * 1.2), capShare = k1 * v / scale;
      setSvgText(bl, 'local b = ' + bb.toFixed(2));
      read.innerHTML = 'At ' + svv.textContent + ' the peak current is ' + scale.toFixed(2) + ' mA and the local slope of log i<sub>p</sub> against log v is <b>b = ' + bb.toFixed(2) + '</b>. The k₁v + k₂v<sup>1/2</sup> split puts <b>' + (capShare * 100).toFixed(0) + ' %</b> of it in the capacitive (surface-controlled) term. An illustrative electrode in which both terms are exact; real data add ohmic shifts that this split ignores.';
    }
    on(sv, 'input', place); on(ss, 'input', place);
    steps(fig, [
      { text: 'Plot the peak current against scan rate on log axes. The slope is <b>b</b> in i = a v<sup>b</sup>: 0.5 for semi-infinite diffusion (Randles-Sevcik), 1 for a surface-controlled process such as double-layer charging. In between: mixed control, or finite diffusion.' },
      { text: 'At each potential, i = k₁v + k₂v<sup>1/2</sup>: fit i/v<sup>1/2</sup> against v<sup>1/2</sup> and the slope is k₁, the intercept k₂. The shaded part is the capacitive share; it grows with scan rate, because k₁v outruns k₂v<sup>1/2</sup>.' },
      { text: 'Use with care. The split ignores the shift of the peaks with ohmic losses, already large above about 10 mV/s; b = 1 cannot tell double-layer charging from fast surface redox; and in Nb₂O₅, b falls from about 1 to 0.7 above 20 mV/s, attributed to ohmic and diffusion limits.' }
    ]);
    place();
  });

  /* f11-25: a battery electrode under a slow sweep: graphite and LiFePO4, against v dQ/dV of the open-circuit curve */
  register('f11-25', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), mb = fig.querySelectorAll('button[data-mat]');
    var sv = fig.querySelector('.ev'), svv = fig.querySelector('.ev-val'), sr = fig.querySelector('.er'), srv = fig.querySelector('.er-val');
    var Q = 3.6, mat = 'gr';                                           // a 1 mAh electrode
    var MAT = {
      gr: { U: P.m9.graphiteU, Ei: 0.6, Es: 0.005, xr: [0, 0.6], yr: [-1.2, 1.2], xt: [[0, '0'], [0.1, '0.1'], [0.2, '0.2'], [0.3, '0.3'], [0.4, '0.4'], [0.5, '0.5']], name: 'graphite', lith: 'reduction: lithium in' },
      lfp: { U: P.lfpOcp, Ei: 3.0, Es: 4.0, xr: [3.0, 4.0], yr: [-1.2, 1.2], xt: [[3, '3.0'], [3.2, '3.2'], [3.4, '3.4'], [3.6, '3.6'], [3.8, '3.8'], [4, '4.0']], name: 'LiFePO₄', lith: 'oxidation: lithium out' }
    };
    var gp = el('g', {}, g), b = { x0: 62, y0: 236, x1: 500, y1: 34 }, fr, eq, cur, labs;
    function x0For(m) { var lo = 0.001, hi = 0.999, U = m.U; for (var k = 0; k < 60; k++) { var mid = (lo + hi) / 2; if ((U(mid) - m.Ei) * (U(lo) - m.Ei) > 0) lo = mid; else hi = mid; } return (lo + hi) / 2; }
    function niceStep(top) { var c = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]; for (var k = 0; k < c.length; k++) if (top / c[k] <= 3.2) return c[k]; return 200; }
    function fmt(t) { return (t < 0 ? '−' : '') + String(+Math.abs(t).toFixed(2)); }
    function setup(top) {
      clear(gp); var m = MAT[mat], st = niceStep(top), yt = [];
      for (var t = -Math.floor(top / st) * st; t <= top + 1e-9; t += st) yt.push([+t.toFixed(3), fmt(+t.toFixed(3))]);
      fr = cvFrame(gp, b, m.xr, [-top, top], { xt: m.xt, yt: yt, zero: true, xl: 'E vs Li⁺/Li, V', yl: 'i, mA (1 mAh electrode)' });
      eq = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.3, 'stroke-dasharray': '4 3' }, gp); cur = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.3 }, gp);
      labs = [txt(gp, 0, 0, '', 'strong', 'middle'), txt(gp, 0, 0, '', 'strong', 'middle')];
      txt(gp, b.x1 - 4, b.y0 - 8, 'dashed: v · dQ/dV of the open-circuit curve', '', 'end', { style: 'font-size:11px' });
    }
    badge(g, 30, 60, 1); badge(g, 506, 140, 2); badge(g, 30, 220, 3);
    function place() {
      Array.prototype.forEach.call(mb, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-mat') === mat)); });
      var m = MAT[mat], v = Math.pow(10, +sv.value) / 1000, Rr = +sr.value;
      setSvgText(svv, (v * 1000).toFixed(v * 1000 >= 0.1 ? 2 : 3) + ' mV/s'); setSvgText(srv, Rr + ' Ω');
      var o = P.cv.electrode({ U: m.U, Q: Q, R: Rr, v: v, Ei: m.Ei, Es: m.Es, x0: x0For(m), steps: 1200, sub: 12 });
      var ia = -1, Ea = 0, ic = 1, Ec = 0; o.i.forEach(function (i, j) { if (i > ia) { ia = i; Ea = o.E[j]; } if (i < ic) { ic = i; Ec = o.E[j]; } });
      var top = 1.25 * Math.max(ia, -ic) * 1000; setup(top);
      var Y = function (i) { return fr.Y(Math.max(-top, Math.min(top, i * 1000))); };
      cur.setAttribute('d', cvPath(o.E, o.i, fr.X, Y));
      // equilibrium curve: i = v dQ/dE from the open-circuit curve, both branches
      var pts = []; for (var k = 1; k < 600; k++) { var x = k / 600, dU = (m.U(x + 1e-4) - m.U(x - 1e-4)) / 2e-4; pts.push([m.U(x), Q * v / Math.max(1e-6, Math.abs(dU))]); }
      pts.sort(function (a2, b2) { return a2[0] - b2[0]; });
      var dq = ''; pts.forEach(function (p) { if (p[0] < m.xr[0] || p[0] > m.xr[1]) return; dq += (dq ? 'L' : 'M') + fr.X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); });
      var dq2 = ''; pts.forEach(function (p) { if (p[0] < m.xr[0] || p[0] > m.xr[1]) return; dq2 += (dq2 ? 'L' : 'M') + fr.X(p[0]).toFixed(1) + ',' + Y(-p[1]).toFixed(1); });
      eq.setAttribute('d', dq + dq2);
      labs[0].setAttribute('x', fr.X(Ea)); labs[0].setAttribute('y', Y(ia) - 8); setSvgText(labs[0], Ea.toFixed(3) + ' V');
      labs[1].setAttribute('x', fr.X(Ec)); labs[1].setAttribute('y', Y(ic) + 18); setSvgText(labs[1], Ec.toFixed(3) + ' V');
      var atEnd = Math.abs(Ec - m.Es) < 0.003 || Math.abs(Ea - m.Es) < 0.003;
      read.innerHTML = '<b>' + m.name + '</b> at ' + svv.textContent + ' behind ' + Rr + ' Ω: largest oxidation peak at ' + Ea.toFixed(3) + ' V, largest reduction peak at ' + Ec.toFixed(3) + ' V, <b>' + ((Ea - Ec) * 1000).toFixed(0) + ' mV</b> apart; peak current ' + (ia * 1000).toFixed(2) + ' mA. ' + (atEnd ? 'The sweep turns before the electrode has finished reacting, so one peak sits at the switching potential; slow down. ' : '') + (mat === 'gr' ? 'The pairs are the staging steps of figure {{fig:f6-2}}; at low rates they sit close to the dashed equilibrium curve.' : 'A two-phase plateau gives one sharp pair; its separation is all polarization and grows with scan rate.') + ' Illustrative model: the open-circuit curve of ' + (mat === 'gr' ? 'the illustrative graphite of {{ch:negative-electrodes}}' : 'Safari and Delacourt&#8217;s LiFePO₄') + ' behind one resistance; not measured data.';
    }
    Array.prototype.forEach.call(mb, function (bt) { on(bt, 'click', function () { mat = bt.getAttribute('data-mat'); place(); }); });
    on(sv, 'input', place); on(sr, 'input', place);
    steps(fig, [
      { text: 'A battery electrode is a solid, not a dissolved couple, but the same rule holds: the current is the scan rate times the charge stored per volt, <b>i = v dQ/dV</b>. At slow enough rates a CV is the differential capacity of the open-circuit curve, turned on its side.', on: function () { mat = 'gr'; sv.value = -1.7; sr.value = 5; place(); } },
      { text: 'Faster, or with more resistance, the peaks lag behind: oxidation peaks move up, reduction peaks down. For a two-phase material such as LiFePO₄ the whole separation is this polarization.', on: function () { mat = 'lfp'; sv.value = -0.7; sr.value = 20; place(); } },
      { text: 'That rate information is what a CV adds to a dQ/dV plot, and also why the two must not be confused: the CV forces the potential, the galvanostatic test the current.', on: function () { mat = 'lfp'; sv.value = -1.7; sr.value = 5; place(); } }
    ]);
  });

  /* f11-26: diffusion coefficients from CV, and from the other methods (Kim et al. 2020, Table 1) */
  register('f11-26', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var ROWS = [
      { n: 'WO₃', cv: [3.79e-11, 3.79e-11], o: [3.38e-11, 3.38e-11], t: 'WO₃: 3.79 × 10⁻¹¹ cm²/s by CV against 3.38 × 10⁻¹¹ by GITT, close at low scan rates; the gap grows above 2 mV/s, where the Randles-Sevcik method overestimates D because the sweep sets up large potential gradients in the active material.' },
      { n: 'Si', cv: [5.1e-12, 5.1e-12], o: [5.0e-12, 1.0e-11], t: 'Nano-silicon: 5.1 × 10⁻¹² cm²/s by CV, and 5 to 10 × 10⁻¹² by GITT or EIS in the table; the text adds that EIS gave about 10⁻¹², five times lower than GITT. The methods agree on the trend, not on the number; EIS runs closer to equilibrium, with more time to relax.' },
      { n: 'LiCoO₂', cv: [2e-13, 2e-13], o: [1e-12, 1e-12], t: 'LiCoO₂: 2 × 10⁻¹³ cm²/s by CV against about 10⁻¹² by GITT or EIS, a factor of five.' },
      { n: 'LiMn₂O₄', cv: [1e-12, 1e-11], o: [1e-12, 1e-10], t: 'LiMn₂O₄ goes through two phase transitions on charge, so each CV peak gives its own value: 4.63 × 10⁻¹² and 1.04 × 10⁻¹¹ cm²/s on charge, 2.88 × 10⁻¹² and 1.68 × 10⁻¹² on discharge, against 1.9 × 10⁻¹² to 8 × 10⁻¹¹ by PITT.' },
      { n: 'Li₃V₂(PO₄)₃', cv: [1e-11, 1e-10], o: [1e-13, 1e-8], t: 'Li₃V₂(PO₄)₃: 10⁻¹¹ to 10⁻¹⁰ cm²/s by CV, and five orders of magnitude, 10⁻¹³ to 10⁻⁸, by GITT or EIS.' }
    ];
    var b = { x0: 130, y0: 236, x1: 500, y1: 40 }, X = function (d) { return b.x0 + (Math.log10(d) + 14) / 7 * (b.x1 - b.x0); };
    [-14, -13, -12, -11, -10, -9, -8, -7].forEach(function (e) { var x = X(Math.pow(10, e)); el('line', { x1: x, x2: x, y1: b.y1, y2: b.y0, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); txt(g, x, b.y0 + 16, '10' + sup(e), '', 'middle'); });
    txt(g, b.x1, b.y0 + 32, 'D, cm²/s (log)', '', 'end');
    var rows = [], sel = null, rh = 38;
    ROWS.forEach(function (r, k) {
      var y = b.y1 + 18 + k * rh, grp = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(r.n), style: 'cursor:pointer' }, g);
      var bg = el('rect', { x: 8, y: y - 16, width: 500, height: rh - 4, rx: 6, fill: k % 2 ? 'transparent' : 'rgba(20,23,28,.03)', stroke: 'var(--accent)', 'stroke-opacity': 0, 'stroke-width': 1.5 }, grp);
      txt(grp, 16, y + 4, r.n, 'strong', 'start');
      [[r.cv, 'var(--accent)', -5], [r.o, 'var(--second)', 6]].forEach(function (q) {
        var x1 = X(q[0][0]), x2 = X(q[0][1]);
        if (x2 - x1 > 1) el('line', { x1: x1, x2: x2, y1: y + q[2], y2: y + q[2], stroke: q[1], 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-opacity': .75 }, grp);
        else el('circle', { cx: x1, cy: y + q[2], r: 4.5, fill: q[1] }, grp);
      });
      rows.push({ r: r, bg: bg }); pressable(grp, function () { sel = r; place(); });
    });
    badge(g, 116, b.y1 + 18 + 2 * rh, 1); badge(g, 116, b.y1 + 18 + 4 * rh, 2);
    function place() {
      rows.forEach(function (q) { q.bg.setAttribute('stroke-opacity', q.r === sel ? 1 : 0); });
      read.innerHTML = sel ? sel.t + ' <span style="color:var(--muted)">Kim et al. 2020, section 4.2 and Table 1.</span>' : 'Blue: the apparent diffusion coefficient from the CV (Randles-Sevcik); green: GITT or EIS on the same material. Tap a row.';
    }
    steps(fig, [
      { text: 'Five materials, two kinds of method. Where CV and GITT or EIS agree, as for WO₃ and silicon, it is to within a factor of a few; for LiCoO₂ the gap is five times.', on: function () { sel = ROWS[2]; place(); } },
      { text: 'For a material that changes phase, such as LiMn₂O₄, the Randles-Sevcik analysis does not strictly apply; it assumes single-phase diffusion. And when the cell&#8217;s own resistance limits the current, log i<sub>p</sub> against log v no longer has slope 0.5, and the diffusion coefficient means little.', on: function () { sel = ROWS[3]; place(); } }
    ]);
  });

  /* f11-27: the stability window of an electrolyte: where the cut-off is drawn decides the answer */
  register('f11-27', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cb = fig.querySelectorAll('button[data-cut]');
    var sv = fig.querySelector('.lsv'), svv = fig.querySelector('.lsv-val'), cut = 1;
    var b = { x0: 62, y0: 236, x1: 500, y1: 40 }, X = function (E) { return b.x0 + (E - 4) / 3 * (b.x1 - b.x0); }, Y = function (j) { return b.y0 - (Math.log10(Math.max(1e-4, j)) + 4) / 5 * (b.y0 - b.y1); };
    [4, 4.5, 5, 5.5, 6, 6.5, 7].forEach(function (E) { el('line', { x1: X(E), x2: X(E), y1: b.y0, y2: b.y0 + 4, stroke: 'var(--line-2)' }, g); txt(g, X(E), b.y0 + 16, E.toFixed(1), '', 'middle'); });
    [[1e-3, '0.001'], [1e-2, '0.01'], [0.1, '0.1'], [1, '1'], [10, '10']].forEach(function (t) { el('line', { x1: b.x0 - 4, x2: b.x0, y1: Y(t[0]), y2: Y(t[0]), stroke: 'var(--line-2)' }, g); txt(g, b.x0 - 7, Y(t[0]) + 4, t[1], '', 'end'); });
    el('line', { x1: b.x0, y1: b.y0, x2: b.x1, y2: b.y0, stroke: 'var(--line-2)' }, g); el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, stroke: 'var(--line-2)' }, g);
    txt(g, b.x1, b.y0 + 32, 'E vs Li⁺/Li, V (positive sweep on an inert electrode)', '', 'end'); txt(g, b.x0 - 6, b.y1 - 10, 'current density, mA/cm² (log)', '', 'start');
    // the carbonates of Ue et al., measured with a 1 mA/cm2 cut-off at 5 mV/s on glassy carbon
    [['EC', 6.2, 0, 'middle'], ['DMC', 6.5, 1, 'end'], ['PC', 6.6, 0, 'middle'], ['EMC, DEC', 6.7, 1, 'start']].forEach(function (s) { var x = X(s[1]); el('line', { x1: x, x2: x, y1: b.y1 - 4, y2: b.y1 + 8, stroke: 'var(--muted)', 'stroke-width': 1.4 }, g); txt(g, x + (s[3] === 'end' ? 2 : s[3] === 'start' ? -2 : 0), b.y1 - 20 + s[2] * 12, s[0], '', s[3], { style: 'font-size:11px' }); });
    var cl = el('line', { x1: b.x0, x2: b.x1, stroke: 'var(--heat)', 'stroke-dasharray': '5 4' }, g), clt = txt(g, b.x0 + 6, 0, '', 'heat', 'start');
    var curve = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g), mk = el('circle', { r: 5.5, fill: 'var(--heat)', stroke: '#fff' }, g), mkt = txt(g, 0, 0, '', 'strong', 'start');
    badge(g, X(6.0), b.y1 + 8, 1); badge(g, X(4.3), Y(0.3), 2); badge(g, X(5.0), Y(0.006), 3);
    function j(E, v) { return 0.02 * v / 5 + 1e-3 * Math.exp((E - 5.6) / 0.12); }   // illustrative: capacitive floor plus an exponential onset
    function place() {
      var v = Math.pow(10, +sv.value);
      Array.prototype.forEach.call(cb, function (bt) { bt.setAttribute('aria-pressed', String(+bt.getAttribute('data-cut') === cut)); });
      setSvgText(svv, v.toFixed(v < 1 ? 1 : 0) + ' mV/s');
      var d = ''; for (var k = 0; k <= 3000; k++) { var E = 4 + k / 1000, jj = j(E, v); if (jj > 10) { var Et = 5.6 + 0.12 * Math.log((10 - 0.02 * v / 5) / 1e-3); d += 'L' + X(Et).toFixed(1) + ',' + Y(10).toFixed(1); break; } d += (k ? 'L' : 'M') + X(E).toFixed(1) + ',' + Y(jj).toFixed(1); } curve.setAttribute('d', d);
      cl.setAttribute('y1', Y(cut)); cl.setAttribute('y2', Y(cut)); clt.setAttribute('y', Y(cut) - 6); setSvgText(clt, 'cut-off ' + cut + ' mA/cm²');
      var Ex = 4; for (var k2 = 0; k2 <= 3000; k2++) { Ex = 4 + k2 / 1000; if (j(Ex, v) >= cut) break; }
      mk.setAttribute('cx', X(Ex)); mk.setAttribute('cy', Y(cut)); mkt.setAttribute('x', X(Ex) + 8); mkt.setAttribute('y', Y(cut) + 20); setSvgText(mkt, Ex.toFixed(2) + ' V');
      read.innerHTML = 'Same electrolyte, same curve shape: with a cut-off of ' + cut + ' mA/cm² at ' + svv.textContent + ' the reported oxidation limit is <b>' + Ex.toFixed(2) + ' V</b>. A ten times smaller cut-off moves it down by about ' + (0.12 * Math.log(10) * 1000).toFixed(0) + ' mV; a faster sweep raises the capacitive floor and can hide the onset. Illustrative curve; the ticks at the top are measured values of single carbonate solvents (1 mA/cm², 5 mV/s, glassy carbon).';
    }
    Array.prototype.forEach.call(cb, function (bt) { on(bt, 'click', function () { cut = +bt.getAttribute('data-cut'); place(); }); });
    on(sv, 'input', place);
    steps(fig, [
      { text: 'Single carbonate solvents, swept positive on glassy carbon, reach a cut-off of 1 mA/cm² only between 6.2 and 6.7 V vs Li. Far above where real positive electrodes work, and that is the first warning.' },
      { text: 'The <b>stability limit</b> is the potential at which the current crosses a chosen cut-off. Change the cut-off, or the sweep rate, and the same curve gives another number.' },
      { text: 'An inert, non-porous electrode measures the intrinsic stability of the liquid. A porous transition-metal oxide can catalyse its decomposition; to know what the cell will see, the test must use the electrode the cell will use.' }
    ]);
    place();
  });
