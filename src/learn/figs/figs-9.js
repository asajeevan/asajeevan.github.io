  /* =================================================================
     Module 9: negative electrodes, from graphite to lithium metal, and
     beyond lithium. Built on Rahman et al. 2025 (R70): the map of anode
     classes (Fig. 1, Tables 1 and 2), the three storage mechanisms
     (Fig. 2), the SEI and ageing of graphite (sec. 3, Table 3, Figs. 4
     and 5), fast charging (sec. 5), silicon and conversion anodes (secs.
     2 and 4), lithium metal and anode-free cells (sec. 7, Table 4,
     Figs. 10 and 11) and solid-state interfaces (sec. 6, Figs. 8 and 9).
     Earlier sources kept where they still say something R70 does not:
     Winter and Brodd (R1), Tarascon and Armand (R2), Goodenough and Park
     (R6), Brandt (R46), Shanmukaraj et al. (R44). Calculations in
     Physics.m9. Plot helpers (e11axes, e11d, e11log, e11modes) are shared
     with figs-11.js.
     ================================================================= */
  var M9 = P.m9;
  var K9 = { intercalation: 'var(--amber)', alloy: '#C4B5F7', conversion: 'var(--copper)', metal: 'var(--metal)' };

  /* ===== 9.1 The map of negative electrodes, and what capacity buys ===== */
  register('f9-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var A = M9.ANODES, POS = { q: 200, v: 3.8 };
    var b = { x0: 60, y0: 262, x1: 330, y1: 40 }, X = function (q) { return e11log(q, 2, Math.log10(5000), b.x0, b.x1); }, Y = function (v) { return b.y0 - v / 2 * (b.y0 - b.y1); };
    el('rect', { x: b.x0, y: Y(0.8), width: b.x1 - b.x0, height: Y(0) - Y(0.8), fill: 'var(--cyan)', 'fill-opacity': '.05' }, g);
    e11axes(g, b, { X: X, Y: Y, xt: [[100, '100'], [300, '300'], [1000, '1000'], [3000, '3000']], yt: [[0, ''], [0.5, '0.5'], [1, '1.0'], [1.5, '1.5'], [2, '2.0']], grid: true, xlab: 'capacity, mAh/g (log)', ylab: 'V vs Li/Li⁺' });
    txt(g, b.x1 - 4, Y(0.8) - 6, 'low and right: best', 'cyan', 'end');
    var names = { graphite: 'graphite', lto: 'Li₄Ti₅O₁₂', tnb: 'TiNb₂O₇', si: 'Si', sn: 'Sn', ge: 'Ge', sb: 'Sb', tio2: 'TiO₂', fe2o3: 'Fe₂O₃', mno2: 'MnO₂', mos2: 'MoS₂', fep: 'FeP', li: 'Li metal' };
    var lab = { graphite: [8, 4, 'start'], lto: [0, -10, 'middle'], tnb: [0, -62, 'middle'], tio2: [-8, 18, 'end'], si: [-8, -16, 'end'], sn: [0, 46, 'middle'], ge: [8, 30, 'start'], sb: [-8, 0, 'end'], fe2o3: [-8, 4, 'end'], mno2: [8, -8, 'start'], mos2: [0, -45, 'middle'], fep: [8, 4, 'start'], li: [-8, -8, 'end'] };
    var dots = {};
    Object.keys(A).forEach(function (k) {
      var a = A[k], x = X(a.q), col = K9[a.kind];
      if (a.hi > a.lo) el('line', { x1: x, x2: x, y1: Y(a.lo), y2: Y(a.hi), stroke: col, 'stroke-width': 7, 'stroke-opacity': '.45', 'stroke-linecap': 'round' }, g);
      dots[k] = el('circle', { cx: x, cy: Y(a.v), r: 4.5, fill: col, stroke: 'var(--bg)', 'stroke-width': 1 }, g);
      var L = lab[k]; txt(g, x + L[0], Y(a.v) + L[1], names[k], '', L[2]);
    });
    var e = { x0: 380, y0: 262, x1: 505, y1: 40 }, YE = function (w) { return e.y0 - w / 800 * (e.y0 - e.y1); };
    e11axes(g, e, { X: function (x) { return x; }, Y: YE, yt: [[0, '0'], [200, '200'], [400, '400'], [600, '600'], [800, '800']], grid: true, ylab: 'Wh/kg of the pair' });
    var bars = [0, 1].map(function (i) { var x = e.x0 + 14 + i * 56; return { r: el('rect', { x: x, width: 40, fill: i ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': '.85' }, g), v: txt(g, x + 20, 0, '', 'strong', 'middle'), n: txt(g, x + 20, e.y0 + 16, '', '', 'middle') }; });
    var ring = el('circle', { r: 9, fill: 'none', stroke: 'var(--text)', 'stroke-width': 2 }, g);
    badge(g, b.x0 + 24, b.y1 + 14, 1); badge(g, X(1600), Y(1.95), 2); badge(g, e.x1 - 8, e.y1 + 8, 3);
    var cur = e11modes(fig, function (m) { cur = m; render(); });
    function render() {
      var a = A[cur], g0 = M9.pairEnergy(POS.q, POS.v, A.graphite.q, A.graphite.v), p = M9.pairEnergy(POS.q, POS.v, a.q, a.v);
      ring.setAttribute('cx', dots[cur].getAttribute('cx')); ring.setAttribute('cy', dots[cur].getAttribute('cy'));
      [g0, p].forEach(function (q, i) { var y = YE(q.E); bars[i].r.setAttribute('y', y); bars[i].r.setAttribute('height', e.y0 - y); bars[i].v.setAttribute('y', y - 6); setSvgText(bars[i].v, Math.round(q.E) + ''); setSvgText(bars[i].n, i ? names[cur] : 'graphite'); });
      bars[1].r.setAttribute('fill', K9[a.kind]);
      read.innerHTML = '<b>' + names[cur] + '</b> (' + a.kind + '): ' + a.q + ' mAh/g at ' + (a.hi > a.lo ? a.lo + ' to ' + a.hi : a.v) + ' V. Paired with a positive electrode of 200 mAh/g at 3.8 V, the two active materials store <b>' + Math.round(p.E) + ' Wh/kg</b>, ' + (p.E / g0.E).toFixed(2) + ' × graphite’s ' + Math.round(g0.E) + '. That is ' + (a.q / A.graphite.q).toFixed(1) + ' × the capacity of graphite, but each gram of the pair still passes only ' + Math.round(p.Q) + ' mAh, at a cell voltage of ' + p.V.toFixed(2) + ' V.';
    }
    steps(fig, [
      { text: 'Every negative electrode sits somewhere on this map: across, how much charge a gram stores; up, its potential against lithium metal. A good negative electrode is <b>low</b>, so that the cell voltage stays large, and <b>to the right</b>, so that it stores a lot.' },
      { text: 'Four families: <b>intercalation</b> hosts (graphite, titanium and niobium oxides), <b>alloys</b> (silicon, tin, germanium, antimony), <b>conversion</b> materials (oxides, sulfides, phosphides) and <b>lithium metal</b> itself. Bars show where a range of working voltage is quoted.' },
      { text: 'More capacity is not more energy one for one: the same charge passes through both electrodes, so the positive electrode sets a ceiling. Choose lithium metal, ten times graphite’s capacity: the pair gains about half again. Choose Li₄Ti₅O₁₂: 1.4 V of cell voltage is given away.' }
    ]);
    render();
  });

  /* ===== 9.2 Three ways to store lithium ===== */
  register('f9-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var gs = el('g', {}, g), gc = el('g', {}, g), eq = txt(g, 135, 250, '', 'amber', 'middle'), eq2 = txt(g, 135, 268, '', '', 'middle');
    var b = { x0: 316, y0: 230, x1: 505, y1: 40 };
    var MODES = {
      intercalation: { name: 'intercalation: graphite', qmax: 450, vmax: 1.0, irr: 0.1, react: 'Li⁺ + e⁻ + xC ⇌ LiCₓ', sub: 'the host keeps its structure', how: 'Li⁺ goes between the graphene layers',
        lith: function (u) { return 0.08 + 0.12 * Math.exp(-u * 8) + 0.6 * Math.exp(-u * 60); }, deli: function (u) { return 0.1 + 0.1 * Math.pow(u, 3) + 0.7 * Math.pow(u, 30); } },
      alloy: { name: 'alloying: silicon', qmax: 2600, vmax: 0.7, irr: 0.25, react: 'xLi⁺ + xe⁻ + Si ⇌ LiₓSi', sub: 'the particle swells and can break', how: 'lithium and silicon form an alloy, LiₓSi',
        lith: function (u) { return 0.08 + 0.12 * Math.exp(-u * 5) + 0.4 * Math.exp(-u * 40); }, deli: function (u) { return 0.25 + 0.25 * u + 0.12 * Math.pow(u, 8); } },
      conversion: { name: 'conversion: Fe₂O₃', qmax: 2100, vmax: 3.5, irr: 0.25, react: 'MₓO_y + 2yLi⁺ + 2ye⁻ ⇌ yLi₂O + xM', sub: 'the particle is rebuilt each cycle', how: 'the oxide becomes metal grains in Li₂O, and back',
        lith: function (u) { return 0.85 + 1.4 * Math.exp(-u * 10) - 0.75 * Math.pow(u, 4); }, deli: function (u) { return 1.0 + 1.6 * u + 0.4 * Math.pow(u, 6); } }
    };
    var mode = e11modes(fig, function (m) { mode = m; build(); });
    var ph = 0.15, dot = null, X = null, Yv = null;
    function geom() { var M = MODES[mode], qr = M.qmax / (1 + M.irr) * 0.92; return { M: M, qr: qr, qi: qr * M.irr }; }
    function build() {
      var G = geom(), M = G.M; clear(gs); clear(gc);
      txt(gs, 135, 22, M.name, 'strong', 'middle'); txt(gs, 135, 38, M.sub, '', 'middle');
      X = function (q) { return b.x0 + q / M.qmax * (b.x1 - b.x0); }; Yv = function (v) { return b.y0 - v / M.vmax * (b.y0 - b.y1); };
      e11axes(gc, b, { X: X, Y: Yv, xt: [[0, '0'], [M.qmax / 2, Math.round(M.qmax / 2) + ''], [M.qmax, M.qmax + '']], yt: [[0, '0'], [M.vmax / 2, (M.vmax / 2).toFixed(2)], [M.vmax, M.vmax.toFixed(1)]], grid: true, xlab: 'capacity, mAh/g', ylab: 'V vs Li/Li⁺' });
      el('rect', { x: X(0), y: b.y1, width: X(G.qi) - X(0), height: b.y0 - b.y1, fill: 'var(--heat)', 'fill-opacity': '.1' }, gc);
      txt(gc, X(G.qi) + 4, b.y1 + 14, 'lost on the first charge', 'heat', 'start');
      var p1 = [], p3 = [], k, u;
      for (k = 0; k <= 60; k++) { u = k / 60; p1.push([X(u * (G.qr + G.qi)), Yv(M.lith(u))]); p3.push([X(G.qi + G.qr * u), Yv(Math.min(M.vmax, M.deli(u)))]); }
      el('path', { d: e11d(p1), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, gc);
      el('path', { d: e11d(p3), fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.4 }, gc);
      txt(gc, X(G.qi + G.qr * 0.55), Yv(M.lith(0.55)) + 16, 'lithium in', 'amber', 'middle');
      txt(gc, X(G.qi + G.qr * 0.4), Yv(Math.min(M.vmax, M.deli(0.4))) - 8, 'lithium out', 'cyan', 'middle');
      dot = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, gc);
      badge(gc, 24, 24, 1); badge(gc, b.x1 - 10, b.y1 + 10, 2);
      setSvgText(eq, M.react); setSvgText(eq2, M.how);
      place();
    }
    function scene(s) { // s: 0 empty .. 1 fully lithiated
      var old = gs.querySelector('.scn'); if (old) gs.removeChild(old);
      var sc = el('g', { 'class': 'scn' }, gs), cx = 135, cy = 140;
      if (mode === 'intercalation') {
        for (var j = 0; j < 6; j++) { var y = 82 + j * 22; el('line', { x1: 60, x2: 210, y1: y, y2: y, stroke: 'var(--text)', 'stroke-opacity': '.55', 'stroke-width': 3 }, sc); }
        var n = Math.round(s * 20); for (var i = 0; i < n; i++) { var jj = i % 5, ii = Math.floor(i / 5); el('circle', { cx: 78 + ii * 34 + (jj % 2) * 12, cy: 93 + jj * 22, r: 4.5, 'class': 'ion' }, sc); }
        txt(sc, 135, 222, 'the layers stay; volume up about 10 %', '', 'middle');
      } else if (mode === 'alloy') {
        var r = 34 * Math.pow(1 + 2.8 * s, 1 / 3); el('circle', { cx: cx, cy: cy, r: 34, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' }, sc);
        el('circle', { cx: cx, cy: cy, r: r, fill: '#C4B5F7', 'fill-opacity': '.55', stroke: '#C4B5F7' }, sc);
        if (s > 0.85) el('path', { d: 'M' + (cx - r * 0.7) + ',' + (cy - r * 0.2) + ' L' + cx + ',' + (cy + 4) + ' L' + (cx + r * 0.6) + ',' + (cy - r * 0.5) + ' M' + cx + ',' + (cy + 4) + ' L' + (cx + 6) + ',' + (cy + r * 0.85), fill: 'none', stroke: 'var(--bg)', 'stroke-width': 2.4 }, sc);
        txt(sc, 135, 222, 'volume × ' + (1 + 2.8 * s).toFixed(1) + ' (dashed: before)', '', 'middle');
      } else {
        el('circle', { cx: cx, cy: cy, r: 50, fill: 'var(--copper)', 'fill-opacity': String(0.8 * (1 - s)) }, sc);
        el('circle', { cx: cx, cy: cy, r: 50, fill: 'var(--panel-2)', 'fill-opacity': String(s), stroke: 'var(--line-2)' }, sc);
        for (var q = 0; q < 22; q++) { var a = q * 2.4, rr = 50 * Math.sqrt((q + 0.5) / 22) * 0.88; el('circle', { cx: cx + Math.cos(a) * rr, cy: cy + Math.sin(a) * rr, r: 4.5, fill: 'var(--metal)', 'fill-opacity': String(s) }, sc); }
        txt(sc, 135, 222, s > 0.5 ? 'Fe grains in Li₂O' : 'Fe₂O₃ particle', '', 'middle');
      }
    }
    function place() {
      var G = geom(), M = G.M, u, x, y, s;
      if (ph < 0.5) { u = ph * 2; x = X(u * (G.qr + G.qi)); y = Yv(M.lith(u)); s = u; } else { u = (ph - 0.5) * 2; x = X(G.qi + G.qr * (1 - u)); y = Yv(Math.min(M.vmax, M.deli(1 - u))); s = 1 - u; }
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); scene(s);
      var notes = { intercalation: 'Graphite keeps its layers; lithium slips in between them. About 10 % of the first charge goes into the SEI, and the voltage hysteresis is only 10 to 50 mV.', alloy: 'Silicon stores close to ten times as much as graphite, but the particle swells by close to 300 % and can break; 20 to 40 % of the first charge can be lost.', conversion: 'The oxide is taken apart into metal grains in Li₂O and rebuilt on the way back. High capacity, but a large first-cycle loss and almost a volt between lithium in and lithium out.' };
      read.innerHTML = (ph < 0.5 ? '<b>Lithium in</b>' : '<b>Lithium out</b>') + ' (' + Math.round(s * 100) + ' % lithiated). ' + notes[mode];
    }
    steps(fig, [
      { text: 'Three ways a negative electrode can take up lithium. Choose one with the buttons and press Play. Left, what happens to the material; below it, the reaction.' },
      { text: 'Right, the voltage on the first charge (amber, lithium in) and on the way back (cyan). The shaded part of the first charge never comes back: it builds the SEI. The gap between the two curves is the <b>hysteresis</b>, energy lost on every cycle.' }
    ]);
    build();
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph = (ph + dt / 8) % 1; place(); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) { ph = 0.45; place(); }
    bind(fig, loop);
  });

  /* ===== 9.3 Graphite's skin: the SEI, and how a graphite anode ages ===== */
  register('f9-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.temp'), sv = fig.querySelector('.temp-val');
    var gx0 = 30, gx1 = 170, top = 50, bot = 240;
    for (var j = 0; j < 8; j++) el('line', { x1: gx0, x2: gx1, y1: top + 12 + j * 24, y2: top + 12 + j * 24, stroke: 'var(--text)', 'stroke-opacity': '.5', 'stroke-width': 3 }, g);
    txt(g, (gx0 + gx1) / 2, top - 10, 'graphite', 'strong', 'middle'); txt(g, 420, top - 10, 'electrolyte', 'strong', 'middle');
    var sei = el('g', {}, g), extra = el('g', {}, g), ann = el('g', {}, g);
    badge(g, gx0 + 14, bot + 18, 1); badge(g, 300, bot + 18, 2); badge(g, 470, bot + 18, 3);
    var stage = 0;
    function render() {
      var T = +sl.value, Ts = (T < 0 ? '−' : '') + Math.abs(T) + ' °C'; setSvgText(sv, Ts);
      var hot = T > 45, cold = T < 5, w = hot ? 64 : 34;
      clear(sei); clear(extra); clear(ann);
      var xi = gx1, xo = gx1 + w * 0.45, xe = gx1 + w;
      for (var k = 0; k < 9; k++) { var y = top + k * 21; el('rect', { x: xi, y: y, width: xo - xi, height: 20, fill: ['#9fb7c3', '#b8c9b3', '#c7b9d8'][k % 3], 'fill-opacity': '.75', stroke: 'var(--bg)' }, sei); el('rect', { x: xo, y: y + (k % 2) * 6, width: xe - xo - (hot ? 0 : (k % 3) * 4), height: 20, fill: '#d9c48f', 'fill-opacity': hot ? '.8' : '.45', stroke: 'var(--bg)' }, sei); }
      if (!hot) for (var p = 0; p < 6; p++) el('circle', { cx: xo + 6 + (p % 2) * 8, cy: top + 20 + p * 30, r: 3, fill: 'var(--bg)' }, sei);
      txt(ann, xe + 10, top + 16, 'inner: Li₂CO₃, Li₂O, LiF', '', 'start'); txt(ann, xe + 10, top + 34, 'outer: semi-carbonates, polyolefins', '', 'start');
      txt(ann, xe + 10, top + 58, hot ? 'hot: thick and dense' : cold ? 'cold: lithium plates' : 'about 25 °C: even and porous', hot || cold ? 'heat' : 'cyan', 'start');
      if (cold) { var d = 'M' + xe + ',' + (top + 90); for (var q = 0; q <= 10; q++) d += ' L' + (xe + 8 + (q % 2 ? 18 : 4)) + ',' + (top + 90 + q * 9); d += ' L' + xe + ',' + (top + 180) + ' Z'; el('path', { d: d, fill: 'var(--metal)' }, extra); txt(ann, xe + 34, top + 176, 'plated lithium', 'heat', 'start'); }
      if (stage === 1) { el('path', { d: 'M' + (gx1 - 30) + ',' + (top + 60) + ' l12,-10 l14,0', fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2.4 }, extra); txt(ann, gx1 - 34, top + 84, 'solvent pushed in', 'heat', 'end'); txt(ann, gx1 - 34, top + 100, 'layers split', 'heat', 'end'); }
      if (stage === 2) { for (var m = 0; m < 4; m++) el('circle', { cx: xe + 70 + m * 30, cy: top + 84 + (m % 2) * 18, r: 5, fill: 'var(--copper)' }, extra); arrow(extra, xe + 66, top + 90, xe + 6, top + 90, '#c9773b', 1.6); txt(ann, xe + 70, top + 132, 'metal ions from the positive side', '', 'start'); }
      var dom = hot ? 'SEI growth: lithium and electrolyte are consumed and the resistance rises' : cold ? 'lithium plating: lithium is deposited as metal instead of going into the graphite' : 'a stable SEI: decomposition has slowed down';
      read.innerHTML = 'At <b>' + Ts + '</b> the main ageing route drawn here is ' + dom + '.';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'Graphite works below the potential at which the electrolyte is stable, so on the first charge the electrolyte is reduced on its surface and leaves a film, the <b>SEI</b>. In the mosaic model the film is a patchwork: inorganic Li₂CO₃, Li₂O and LiF next to the graphite, organic semi-carbonates and polyolefins further out. Once formed, it slows further decomposition.', on: function () { stage = 0; render(); } },
      { text: 'Some electrolytes, such as ethers, let solvent molecules and solvated ions through the SEI and in between the graphene layers. The graphite <b>exfoliates</b>: its layers split, and the fresh surface keeps eating electrolyte.', on: function () { stage = 1; render(); } },
      { text: 'Metal ions dissolved from the positive electrode cross the cell and deposit in the SEI, where they speed up decomposition: <b>cross-talk</b>. Now move the temperature: above about 45 °C the SEI grows thick and dense; in the cold, lithium cannot get into the graphite fast enough and <b>plates</b> on it.', on: function () { stage = 2; render(); } }
    ]);
    render();
  });

  /* ===== 9.4 Fast charging: how close to 0 V? ===== */
  register('f9-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sc = fig.querySelector('.crate'), scv = fig.querySelector('.crate-val'), st = fig.querySelector('.ftemp'), stv = fig.querySelector('.ftemp-val');
    var b = { x0: 60, y0: 236, x1: 350, y1: 40 }, X = function (x) { return b.x0 + x * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - (v + 0.2) / 0.5 * (b.y0 - b.y1); };
    el('rect', { x: b.x0, y: Y(0), width: b.x1 - b.x0, height: b.y0 - Y(0), fill: 'var(--heat)', 'fill-opacity': '.1' }, g);
    e11axes(g, b, { X: X, Y: Y, xt: [[0, '0'], [0.5, '50'], [1, '100 %']], yt: [[-0.2, '−0.2'], [0, '0'], [0.1, '0.1'], [0.2, '0.2'], [0.3, '0.3']], grid: true, xlab: 'state of charge of the graphite', ylab: 'graphite surface, V vs Li/Li⁺' });
    el('line', { x1: b.x0, x2: b.x1, y1: Y(0), y2: Y(0), stroke: 'var(--heat)', 'stroke-width': 1.4 }, g);
    txt(g, b.x1 - 4, Y(0) + 16, 'below 0 V: lithium plates', 'heat', 'end');
    var u = []; for (var k = 0; k <= 100; k++) u.push([X(k / 100), Math.max(b.y1, Y(M9.graphiteU(k / 100)))]);
    el('path', { d: e11d(u), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }, g);
    txt(g, X(0.5), Y(M9.graphiteU(0.5)) - 8, 'at rest', '', 'middle');
    var pc = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.6 }, g), mk = el('circle', { r: 5, fill: 'var(--heat)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var m = { x0: 400, y0: 236, x1: 505, y1: 40 }, YM = function (v) { return m.y0 - v / 1.8 * (m.y0 - m.y1); };
    e11axes(g, m, { X: function (x) { return x; }, Y: YM, yt: [[0, '0'], [0.5, '0.5'], [1, '1.0'], [1.5, '1.5']], grid: true, ylab: 'margin to 0 V, V' });
    var MB = [{ n: 'graphite', v: M9.graphiteU(0.98), col: 'var(--amber)' }, { n: 'Nb oxide', v: 1.0, col: '#C4B5F7' }, { n: 'LTO', v: 1.55, col: 'var(--cyan)' }];
    MB.forEach(function (q, i) { var x = m.x0 + 8 + i * 32, y = YM(q.v); el('rect', { x: x, y: y, width: 24, height: m.y0 - y, fill: q.col, 'fill-opacity': '.85' }, g); txt(g, x + 12, m.y0 + (i % 2 ? 30 : 16), q.n, '', 'middle'); });
    var cutl = el('line', { x1: m.x0, x2: m.x1, stroke: 'var(--heat)', 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }, g);
    badge(g, b.x0 + 24, b.y1 + 14, 1); badge(g, X(0.85), Y(-0.15), 2); badge(g, m.x1 - 8, m.y1 + 8, 3);
    function render() {
      var c = +sc.value, T = +st.value, eta = M9.polarization(c, T + 273.15), onset = M9.platingOnset(c, T + 273.15);
      var Ts = (T < 0 ? '−' : '') + Math.abs(T) + ' °C'; setSvgText(scv, (c % 1 ? c.toFixed(1) : c.toFixed(0)) + 'C'); setSvgText(stv, Ts);
      var p = []; for (var k = 0; k <= 100; k++) p.push([X(k / 100), Math.max(b.y1, Math.min(b.y0, Y(M9.graphiteU(k / 100) - eta)))]); pc.setAttribute('d', e11d(p));
      mk.style.display = onset < 1 ? '' : 'none'; mk.setAttribute('cx', X(onset)); mk.setAttribute('cy', Y(0));
      var yc = YM(Math.min(1.75, eta)); cutl.setAttribute('y1', yc); cutl.setAttribute('y2', yc);
      read.innerHTML = 'Charging at <b>' + scv.textContent + '</b> and <b>' + Ts + '</b> pulls the graphite surface about <b>' + Math.round(eta * 1000) + ' mV</b> below its resting potential (illustrative model). ' + (onset < 0.03 ? 'It is below 0 V almost from the start: lithium plates instead of going in.' : onset < 1 ? 'It reaches 0 V at about <b>' + Math.round(onset * 100) + ' %</b> state of charge: from there on, lithium plates instead of going in.' : 'It never reaches 0 V: no plating.') + ' The dashed red line on the right is the same pull; titanate and niobium oxides start a volt or more above it.';
    }
    on(sc, 'input', render); on(st, 'input', render);
    steps(fig, [
      { text: 'Graphite takes up lithium only a little above the potential of lithium metal (dashed, an illustrative curve). Charging pulls its surface lower, the more so the higher the current: the lithium arrives faster than it can get into the graphite.' },
      { text: 'Once the surface reaches <b>0 V</b>, lithium plates on it as metal. Slide the current up, or the temperature down: in the cold the same current pulls further, because every step slows. Plated lithium costs capacity and can grow into a short circuit.' },
      { text: 'Titanate (Li₄Ti₅O₁₂, about 1.55 V) and niobium oxides (about 1 to 2 V) leave a margin of a volt or more, so they do not plate and avoid most SEI formation. They pay with a smaller cell voltage and less capacity, which is why they serve power, not range.' }
    ]);
    render();
  });

  /* ===== 9.5 Silicon breathes ===== */
  register('f9-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), bb = fig.querySelector('.buffer'), sw = fig.querySelector('.siw'), swv = fig.querySelector('.siw-val');
    var mats = [{ x: 80, name: 'Li₄Ti₅O₁₂', dv: 0.002, note: 'about 0.2 %' }, { x: 220, name: 'graphite', dv: 0.10, note: 'about 10 %' }, { x: 400, name: 'silicon', dv: 2.8, note: 'about 280 %', si: true }];
    var r0 = 26, cy = 116, buffer = false, ph = 0, cyc = 0;
    mats.forEach(function (m, i) {
      txt(g, m.x, 24, m.name, 'strong', 'middle'); txt(g, m.x, 214, m.note + ' in volume', 'amber', 'middle');
      el('circle', { cx: m.x, cy: cy, r: r0, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' }, g);
      m.sei = el('circle', { cx: m.x, cy: cy, r: r0 + 3, fill: 'none', stroke: '#d9c48f', 'stroke-width': 3 }, g);
      m.p = el('circle', { cx: m.x, cy: cy, r: r0, fill: m.si ? '#C4B5F7' : 'var(--amber-2)', 'fill-opacity': '.85' }, g);
      m.cr = el('path', { fill: 'none', stroke: 'var(--bg)', 'stroke-width': 2.4 }, g);
      badge(g, m.x + 50, 34, i + 1);
    });
    var shell = el('circle', { cx: 400, cy: cy, r: r0 * 1.56 + 10, fill: 'var(--cyan)', 'fill-opacity': '0', stroke: 'var(--cyan)', 'stroke-width': 3, 'stroke-opacity': '0' }, g);
    txt(g, 260, 236, 'dashed: the particle before lithium goes in; gold rim: its SEI', '', 'middle');
    var blend = el('g', {}, g);
    function render() {
      var s = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI), w = +sw.value / 100; setSvgText(swv, Math.round(w * 100) + ' wt%');
      mats.forEach(function (m) {
        var r = r0 * Math.pow(1 + m.dv * s, 1 / 3); m.p.setAttribute('r', r);
        var broken = m.si && !buffer && s > 0.6, thick = m.si && !buffer ? Math.min(12, 3 + cyc * 2) : 3;
        m.sei.setAttribute('r', r + thick / 2 + 1); m.sei.setAttribute('stroke-width', thick); m.sei.setAttribute('stroke-dasharray', broken ? '6 5' : '');
        m.cr.setAttribute('d', m.si && !buffer && cyc >= 1 ? 'M' + (m.x - r * 0.7) + ',' + (cy - r * 0.3) + ' L' + (m.x - 4) + ',' + (cy + 2) + ' L' + (m.x + r * 0.6) + ',' + (cy - r * 0.5) + ' M' + (m.x - 3) + ',' + (cy + 2) + ' L' + (m.x + 2) + ',' + (cy + r * 0.85) : '');
      });
      shell.setAttribute('stroke-opacity', buffer ? '.8' : '0'); shell.setAttribute('fill-opacity', buffer ? '.08' : '0');
      setSvgText(bb, buffer ? 'Take the room away' : 'Give it room to swell');
      clear(blend); var q = M9.blendCapacity(w), x0 = 40, xw = 440, scale = xw / 1500;
      el('rect', { x: x0, y: 252, width: xw, height: 12, rx: 3, fill: 'var(--panel-2)' }, blend);
      el('rect', { x: x0, y: 252, width: Math.min(xw, q * scale), height: 12, rx: 3, fill: 'var(--amber)', 'fill-opacity': '.8' }, blend);
      el('line', { x1: x0 + 372 * scale, x2: x0 + 372 * scale, y1: 248, y2: 268, stroke: 'var(--text)' }, blend);
      txt(blend, x0 + 372 * scale, 282, 'graphite: 372', '', 'middle'); txt(blend, x0 + xw, 282, Math.round(q) + ' mAh/g with ' + Math.round(w * 100) + ' wt% Si', 'strong', 'end');
      read.innerHTML = 'Lithiated ' + Math.round(s * 100) + ' %, cycle ' + cyc + '. ' + (buffer ? 'Given room to swell (small, porous or hollow particles in a carbon framework), the silicon keeps its contact and its SEI stays thin.' : cyc >= 1 ? 'Each swelling <b>cracks the SEI</b> on the silicon; fresh surface is exposed and new SEI forms, thicker every cycle, using up lithium and electrolyte. The particle itself has started to crack.' : 'Silicon swells to nearly four times its volume.') + ' A blend of ' + Math.round(w * 100) + ' wt% silicon in graphite stores ' + Math.round(q) + ' mAh/g (a simple mixture of the two).';
    }
    function tick(dt) { if (dt === 0) return; var was = ph; ph = (ph + dt / 4) % 1; if (ph < was) cyc++; render(); }
    on(bb, 'click', function () { buffer = !buffer; cyc = 0; render(); }); on(sw, 'input', render);
    steps(fig, [
      { text: '<b>Li₄Ti₅O₁₂</b> barely changes size (about 0.2 %: “zero strain”), and <b>graphite</b> by about 10 %. Both keep their particles whole.' },
      { text: '<b>Silicon</b> stores close to ten times as much as graphite but swells by about 280 % in volume. Its SEI cracks on every swelling and grows again on the new surface; the particle cracks and loses contact, and the electrode can come away from its current collector.' },
      { text: 'The fixes: smaller particles, porous, hollow or yolk–shell shapes, carbon frameworks, binders that keep the contact, and blending. Cells on sale today use graphite with <b>5 to 10 wt%</b> silicon; more than 20 % is the next step, traded against cycle life. Slide the silicon fraction.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    if (!motion) { cyc = 2; ph = 0.5; }
    render(); bind(fig, loop);
  });

  /* ===== 9.6 Conversion: high capacity, a volt of hysteresis ===== */
  register('f9-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.hyst'), sv = fig.querySelector('.hyst-val');
    var cx = 100, cy = 120, R = 62, ph = 0.25;
    var big = el('circle', { cx: cx, cy: cy, r: R, fill: 'var(--copper)', 'fill-opacity': '.8' }, g);
    var mat = el('circle', { cx: cx, cy: cy, r: R, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    var nps = []; for (var i = 0; i < 24; i++) { var a = i * 2.4, rr = R * Math.sqrt((i + 0.5) / 24) * 0.88; nps.push(el('circle', { cx: cx + Math.cos(a) * rr, cy: cy + Math.sin(a) * rr, r: 4.5, fill: 'var(--metal)' }, g)); }
    var lbl = txt(g, cx, cy + R + 22, '', 'strong', 'middle');
    var b = { x0: 250, y0: 226, x1: 505, y1: 40 }, X = function (u) { return b.x0 + u * (b.x1 - b.x0); }, Y = function (v) { return b.y0 - v / 3 * (b.y0 - b.y1); };
    e11axes(g, b, { X: X, Y: Y, xt: [[0, '0'], [0.5, '50'], [1, '100 %']], yt: [[0, '0'], [1, '1'], [2, '2'], [3, '3']], grid: true, xlab: 'lithium content', ylab: 'V vs Li/Li⁺' });
    var fill = el('path', { fill: 'var(--heat)', 'fill-opacity': '.12' }, g), lin = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), lout = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.4 }, g);
    el('path', { d: e11d([[X(0.05), Y(0.15)], [X(0.95), Y(0.15)]]), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }, g);
    txt(g, X(0.98), Y(0.15) - 6, 'graphite, for scale', '', 'end');
    var dot = el('circle', { r: 5, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    badge(g, cx - R + 4, cy - R + 6, 1); badge(g, b.x0 + 24, b.y1 + 14, 2); badge(g, b.x1 - 12, b.y1 + 14, 3);
    var Va = 1.25, h = 1.0;
    function vin(u) { return Va - h / 2 + 0.5 * Math.exp(-u * 12) - 0.25 * (u - 0.5); }
    function vout(u) { return Va + h / 2 - 0.25 * (u - 0.5) + 0.15 * Math.pow(1 - u, 3); }
    function render() {
      h = +sl.value; setSvgText(sv, h.toFixed(2) + ' V');
      var pi = [], po = []; for (var k = 0; k <= 60; k++) { var u = k / 60; pi.push([X(u), Y(vin(u))]); po.push([X(u), Y(vout(u))]); }
      lin.setAttribute('d', e11d(pi)); lout.setAttribute('d', e11d(po)); fill.setAttribute('d', e11d(pi) + ' L' + po.slice().reverse().map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L') + ' Z');
      place();
    }
    function place() {
      var s = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI), going = ph < 0.5;
      big.setAttribute('fill-opacity', String(0.8 * (1 - s))); mat.setAttribute('fill-opacity', String(s)); nps.forEach(function (n) { n.setAttribute('fill-opacity', String(s)); });
      setSvgText(lbl, s > 0.5 ? 'metal grains in Li₂O' : 'metal oxide particle');
      dot.setAttribute('cx', X(s)); dot.setAttribute('cy', Y(going ? vin(s) : vout(s)));
      var eff = M9.hysteresisEfficiency(3.8, Va, h), effG = M9.hysteresisEfficiency(3.8, 0.15, 0.03);
      read.innerHTML = (going ? '<b>Lithium in</b>: the oxide is converted into metal grains in Li₂O. ' : '<b>Lithium out</b>: metal and Li₂O react back to the oxide. ') + 'With ' + h.toFixed(2) + ' V of hysteresis, a cell with a 3.8 V positive electrode gives back about <b>' + Math.round(eff * 100) + ' %</b> of the energy put in, against ' + Math.round(effG * 100) + ' % with graphite (this page’s estimate, electrodes only).';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'A <b>conversion</b> material is not a host. Lithium takes the oxide apart, MₓO_y + 2y Li⁺ + 2y e⁻ ⇌ y Li₂O + x M, into metal grains a few nanometres across embedded in Li₂O. On the way back the oxide forms again. Fe₂O₃ stores about 1000 mAh/g, MnO₂ about 1230.' },
      { text: 'Lithium goes in at a lower voltage than it comes out (amber against cyan): almost <b>1 V of hysteresis</b>. Several solid phases form and dissolve, and oxygen and metal atoms have to move, not just lithium.' },
      { text: 'The shaded area is energy turned into heat on every cycle; slide the hysteresis. Add the first-cycle loss, the swelling and the insulating Li₂O, and conversion anodes stay in the laboratory, despite their capacity.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph = (ph + dt / 8) % 1; place(); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) { ph = 0.3; place(); }
    bind(fig, loop);
  });

  /* ===== 9.7 Lithium metal: dendrites and dead lithium ===== */
  register('f9-7', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.cd'), sv = fig.querySelector('.cd-val'), sepB = fig.querySelector('.solid-sep');
    var x0 = 70, top = 40, bot = 240, sepX = 320, NP = 46, rough = [], dead = [];
    el('rect', { x: 20, y: top, width: x0 - 20, height: bot - top, fill: 'var(--metal)' }, g);
    txt(g, 45, top - 10, 'lithium', 'strong', 'middle'); txt(g, (x0 + sepX) / 2, top - 10, 'electrolyte', 'strong', 'middle');
    var sep = el('rect', { x: sepX, y: top, width: 14, height: bot - top, fill: 'var(--cyan)', 'fill-opacity': '.3' }, g);
    var gb = el('g', {}, g), sepT = txt(g, sepX + 7, bot + 16, 'separator', 'cyan', 'middle');
    el('rect', { x: sepX + 14, y: top, width: 160, height: bot - top, fill: 'var(--panel-2)', 'fill-opacity': '.6' }, g); txt(g, sepX + 94, top - 10, 'positive electrode', 'strong', 'middle');
    var dep = el('path', { fill: 'var(--metal)', 'fill-opacity': '.9' }, g), deadG = el('g', {}, g), seiP = el('path', { fill: 'none', stroke: '#d9c48f', 'stroke-width': 2 }, g);
    var cT = txt(g, x0 + 4, bot + 34, '', 'amber', 'start'), stopT = txt(g, sepX - 10, top + 16, '', 'heat', 'end');
    badge(g, x0 + 14, top + 14, 1); badge(g, x0 + 14, bot - 14, 2); badge(g, sepX - 12, bot - 14, 3);
    for (var j = 0; j <= NP; j++) rough.push(2);
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var cyc = 0, ph = 0, solid = false, cd = 1;
    function lim(j) { var free = sepX - x0 - 2; if (!solid) return free; return (j % 15 === 7) ? free + 8 : free; } // grain boundaries of a ceramic let filaments through
    function render() {
      cd = +sl.value; setSvgText(sv, cd.toFixed(1) + ' mA/cm²');
      var level = ph < 0.5 ? ph * 2 : 2 - ph * 2, d = 'M' + x0 + ',' + top, s = '';
      for (var j = 0; j <= NP; j++) { var y = top + (bot - top) * j / NP, w = Math.min(lim(j), (4 + rough[j]) * Math.max(0.25, level)); d += ' L' + (x0 + w).toFixed(1) + ',' + y.toFixed(1); s += (j ? ' L' : 'M') + (x0 + w + 2).toFixed(1) + ',' + y.toFixed(1); }
      dep.setAttribute('d', d + ' L' + x0 + ',' + bot + ' Z'); seiP.setAttribute('d', s);
      clear(deadG); dead.forEach(function (q) { el('circle', { cx: q.x, cy: q.y, r: q.r, fill: 'var(--metal)', 'fill-opacity': '.45', stroke: 'var(--line-2)' }, deadG); });
      clear(gb); if (solid) for (var k = 7; k <= NP; k += 15) { var yy = top + (bot - top) * k / NP; el('line', { x1: sepX, x2: sepX + 14, y1: yy, y2: yy + 4, stroke: 'var(--bg)', 'stroke-width': 2 }, gb); }
      sep.setAttribute('fill', solid ? 'var(--text)' : 'var(--cyan)'); sep.setAttribute('fill-opacity', solid ? '.35' : '.3'); setSvgText(sepT, solid ? 'ceramic' : 'separator');
      var maxR = 0, through = false; rough.forEach(function (r, j) { maxR = Math.max(maxR, r + 4); if (4 + r > sepX - x0 - 1 && lim(j) > sepX - x0) through = true; });
      var touch = !solid ? maxR > sepX - x0 - 2 : through;
      setSvgText(cT, 'cycles: ' + cyc + '; dead lithium pieces: ' + dead.length);
      setSvgText(stopT, touch ? (solid ? 'through a grain boundary' : 'short-circuit risk') : '');
      setSvgText(sepB, solid ? 'Porous separator' : 'Ceramic separator');
      read.innerHTML = 'At <b>' + cd.toFixed(1) + ' mA/cm²</b>' + (cd > 2 ? ', high for this picture: lithium is plated faster than the ions arrive, and the deposit grows as whiskers from its tips.' : ', the deposit grows rougher every cycle.') + ' Pieces that break off when lithium is stripped are cut off from the metal: <b>dead lithium</b>, ' + dead.length + ' pieces so far.' + (solid ? ' A ceramic separator stops most of the deposit, but filaments can still find a way along its grain boundaries.' : '');
    }
    function tick(dt) {
      if (dt === 0) return;
      var was = ph; ph = (ph + dt / 3) % 1;
      if (ph < was) {
        cyc++;
        var pTip = 0.06 + 0.05 * cd;
        for (var j = 0; j <= NP; j++) { var nb = Math.max(j > 0 ? rough[j - 1] : 0, j < NP ? rough[j + 1] : 0); var tip = rough[j] >= nb; rough[j] += (tip && rnd() < pTip ? 4 + rnd() * 6 * cd : rnd() * 1.2); rough[j] = Math.min(sepX - x0 + 10, rough[j]); }
        for (var q = 0; q < Math.round(1 + cd); q++) { var jj = Math.floor(rnd() * NP); if (rough[jj] > 10) { dead.push({ x: x0 + 6 + rnd() * Math.min(rough[jj], 60), y: top + (bot - top) * jj / NP, r: 2 + rnd() * 2.5 }); rough[jj] *= 0.85; } }
        if (dead.length > 60) dead.splice(0, dead.length - 60);
      }
      render();
    }
    on(sl, 'input', render); on(sepB, 'click', function () { solid = !solid; render(); });
    steps(fig, [
      { text: 'A lithium-metal electrode stores 3860 mAh/g at 0 V, the best place on the map of figure 9.1. But on charge the lithium is not put anywhere: it is <b>plated</b> back onto the metal, and it does not land evenly. Tips and defects see a stronger field and grow faster; where plating outruns the supply of ions, the deposit turns into whiskers.' },
      { text: 'When lithium is stripped again, pieces break off and lose contact: <b>dead lithium</b>. With the SEI that forms on every fresh surface, this lowers the Coulombic efficiency; in one study the dead layer grew from about 2 µm to about 100 µm within a few dozen cycles. Slide the current density.' },
      { text: 'Whiskers that reach through the separator short the cell, with a risk of fire. A hard <b>ceramic</b> separator was expected to stop them, since lithium is soft (Young’s modulus about 4.9 GPa); yet lithium still gets through, along the ceramic’s grain boundaries. Press the button.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    for (var c = 0; c < (motion ? 4 : 8); c++) { tick(1.5); tick(1.5); } ph = 0.5;
    render(); bind(fig, loop);
  });

  /* ===== 9.8 How many cycles? Coulombic efficiency and excess lithium ===== */
  register('f9-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.ce'), sv = fig.querySelector('.ce-val');
    var N = 500, b = { x0: 60, y0: 236, x1: 500, y1: 40 }, X = function (n) { return b.x0 + n / N * (b.x1 - b.x0); }, Y = function (c) { return b.y0 - c * (b.y0 - b.y1); };
    e11axes(g, b, { X: X, Y: Y, xt: [[0, '0'], [100, '100'], [200, '200'], [300, '300'], [400, '400'], [500, '500']], yt: [[0, '0'], [0.5, '50'], [0.8, '80'], [1, '100']], grid: true, xlab: 'cycles', ylab: 'capacity, % of the first cycle' });
    el('line', { x1: b.x0, x2: b.x1, y1: Y(0.8), y2: Y(0.8), stroke: 'var(--heat)', 'stroke-dasharray': '4 3' }, g); txt(g, b.x1 - 4, Y(0.8) - 6, '80 %: end of life', 'heat', 'end');
    var CASES = [{ ex: 0, n: 'anode-free', col: 'var(--heat)' }, { ex: 1, n: '1× excess', col: 'var(--amber)' }, { ex: 3, n: '3× excess', col: 'var(--cyan)' }];
    var paths = CASES.map(function (c) { var t = txt(g, 0, 0, c.n, 'strong', 'start'); t.style.fill = c.col; return { c: c, p: el('path', { fill: 'none', stroke: c.col, 'stroke-width': 2.4 }, g), t: t }; });
    badge(g, b.x0 + 24, b.y0 - 24, 1); badge(g, X(250), Y(1) - 14, 2);
    function life(arr) { for (var k = 0; k < arr.length; k++) if (arr[k] < 0.8) return k + 1; return null; }
    function render() {
      var ce = +sl.value / 100; setSvgText(sv, (ce * 100).toFixed(2) + ' %');
      var lives = [];
      paths.forEach(function (p, i) {
        var a = M9.inventory(ce, p.c.ex, N), pts = [[X(0), Y(1)]]; a.forEach(function (c, k) { pts.push([X(k + 1), Y(c)]); });
        p.p.setAttribute('d', e11d(pts)); lives.push(life(a));
        var n = [40, 150, 420][i], v = a[n], y = v > 0.97 ? Y(1) + 16 : Y(v) - 8;
        p.t.setAttribute('x', X(n)); p.t.setAttribute('y', Math.max(b.y1 + 12, Math.min(b.y0 - 6, y)));
      });
      read.innerHTML = 'Coulombic efficiency <b>' + (ce * 100).toFixed(2) + ' %</b>: each cycle ' + ((1 - ce) * 100).toFixed(2) + ' % of the cycled lithium is lost. Down to 80 %: anode-free after <b>' + (lives[0] || 'more than ' + N) + '</b> cycles, with 1× excess after ' + (lives[1] || 'more than ' + N) + ', with 3× excess after ' + (lives[2] || 'more than ' + N) + '. An excess lasts excess ÷ (1 − CE) cycles before the capacity starts to fall (this page’s model).';
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'Every cycle a lithium-metal electrode loses a little lithium to SEI and dead lithium; the fraction it keeps is the <b>Coulombic efficiency</b>, CE. In an <b>anode-free</b> cell all the lithium comes from the positive electrode and is plated onto bare copper: nothing in reserve, so the capacity falls as CEⁿ from the first cycle.' },
      { text: 'A reservoir of <b>excess lithium</b> hides the losses until it is used up, at a price in weight and cost. Slide the efficiency: at 99 % an anode-free cell is down to 80 % after about 22 cycles; even 99.9 % gives only about 220.' }
    ]);
    render();
  });

  /* ===== 9.9 Making anode-free cells work ===== */
  register('f9-9', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var top = 50, bot = 220, cu0 = 40, cu1 = 62, sep0 = 300, sep1 = 312;
    el('rect', { x: cu0, y: top, width: cu1 - cu0, height: bot - top, fill: 'var(--copper)' }, g); txt(g, (cu0 + cu1) / 2, top - 10, 'Cu', 'strong', 'middle');
    el('rect', { x: sep0, y: top, width: sep1 - sep0, height: bot - top, fill: 'var(--cyan)', 'fill-opacity': '.3' }, g);
    el('rect', { x: sep1, y: top, width: 170, height: bot - top, fill: 'var(--panel-2)', 'fill-opacity': '.7' }, g); txt(g, sep1 + 85, top - 10, 'positive electrode', 'strong', 'middle'); txt(g, 180, top - 10, 'electrolyte', 'strong', 'middle');
    for (var i = 0; i < 10; i++) el('circle', { cx: sep1 + 20 + (i % 5) * 32, cy: top + 40 + Math.floor(i / 5) * 70, r: 5, 'class': 'ion' }, g);
    var layer = el('g', {}, g), plated = el('path', { fill: 'var(--metal)' }, g);
    badge(g, cu1 + 18, bot + 18, 1); badge(g, 120, bot + 18, 2); badge(g, 200, bot + 18, 3); badge(g, 280, bot + 18, 4);
    var stage = 0, ph = 0;
    var S = [
      { t: 'No anode at all: copper only. On the first charge, lithium from the positive electrode is plated onto the copper; on discharge it goes back. Simple, light and cheap to make, but with no lithium to spare (figure 9.8).', r: 'Advantages: high energy density, lower cost, lower weight and volume, a simple design that is easy to make. Challenges: dendrites, a thick or unstable SEI, low Coulombic efficiency, irreversible plating and stripping, dead lithium.' },
      { t: 'An <b>artificial SEI</b> on the copper: a spin-coated graphene-oxide film made the lithium deposit evenly, without dendrites.', r: 'Graphene oxide on Cu: average CE 98 % and 44 % of the capacity kept after 50 cycles, against 89 % and 26.9 % after only 20 cycles on bare copper.' },
      { t: '<b>Electrolyte</b> design: additives that build a better SEI, such as KNO₃, and new salt and solvent mixtures: a dual-salt LiDFOB/LiBF₄ electrolyte, localized high-concentration electrolytes, fluorinated solvents.', r: 'KNO₃: average CE of Cu|Li cells over 60 cycles 96.20 %, against 85.74 % without it. LiDFOB/LiBF₄: anode-free pouch cells kept 80 % after 90 cycles, the lithium growing as large mosaic grains about 50 µm across.' },
      { t: 'A <b>3D current collector</b>: porous copper made by dissolving the zinc out of a Cu–Zn alloy. Its large area spreads the current and gives the lithium room.', r: 'Porous Cu: CE above 97 % over 250 cycles; with LiFePO₄, 89.7 % of the capacity kept after 300 cycles, against 58.2 % on flat copper.' }
    ];
    function render() {
      clear(layer);
      var lv = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI), d = 'M' + cu1 + ',' + top;
      for (var j = 0; j <= 30; j++) { var y = top + (bot - top) * j / 30, w = lv * (stage >= 1 ? 14 : 8 + ((j * 7) % 11) * 1.6); d += ' L' + (cu1 + (stage === 3 ? 10 : 0) + w).toFixed(1) + ',' + y.toFixed(1); }
      plated.setAttribute('d', d + ' L' + cu1 + ',' + bot + ' Z');
      if (stage === 1) el('rect', { x: cu1, y: top, width: 4, height: bot - top, fill: '#d9c48f' }, layer);
      if (stage === 2) for (var k = 0; k < 8; k++) el('circle', { cx: 110 + (k % 4) * 45, cy: top + 30 + Math.floor(k / 4) * 90, r: 4, fill: '#C4B5F7' }, layer);
      if (stage === 3) for (var m = 0; m < 9; m++) el('rect', { x: cu1, y: top + 6 + m * 19, width: 10, height: 8, fill: 'var(--copper)' }, layer);
      txt(layer, 180, bot + 40, ['bare copper', 'graphene-oxide film on the copper', 'an additive in the electrolyte', 'porous copper'][stage], 'amber', 'middle');
      read.innerHTML = S[stage].r;
    }
    steps(fig, S.map(function (s, i) { return { text: s.t, on: function () { stage = i; render(); } }; }));
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph = (ph + dt / 5) % 1; render(); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) ph = 0.5;
    render(); bind(fig, loop);
  });

  /* ===== 9.10 Solid-state cells: the lithium/ceramic interface ===== */
  register('f9-10', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sl = fig.querySelector('.icd'), sv = fig.querySelector('.icd-val');
    var mode = e11modes(fig, function (m) { mode = m; render(); });
    var top = 50, bot = 200, xi = 120;
    el('rect', { x: 30, y: top, width: xi - 30, height: bot - top, fill: 'var(--metal)' }, g); txt(g, 75, top - 10, 'lithium', 'strong', 'middle');
    el('rect', { x: xi + 6, y: top, width: 90, height: bot - top, fill: 'var(--text)', 'fill-opacity': '.25' }, g); txt(g, xi + 51, top - 10, 'ceramic', 'strong', 'middle');
    var gap = el('g', {}, g), inter = el('rect', { x: xi, y: top, width: 6, height: bot - top, fill: 'var(--cyan)' }, g), capT = txt(g, 123, bot + 20, '', '', 'middle');
    var b = { x0: 290, y0: 200, x1: 505, y1: 40 }, Y = function (r) { return e11log(Math.max(r, 0.5), -0.3, 3.9, b.y0, b.y1); };
    e11axes(g, b, { X: function (x) { return x; }, Y: Y, yt: [[1, '1'], [10, '10'], [100, '100'], [1000, '1000']], grid: true, ylab: 'interface resistance, Ω cm² (log)' });
    var PAIRS = [{ n: 'Li–C', a: 381, c: 11 }, { n: 'Al layer', a: 950, c: 75 }, { n: 'ALD Al₂O₃', a: 1710, c: 1 }];
    var rects = PAIRS.map(function (p, i) { var x = b.x0 + 16 + i * 68; txt(g, x + 22, b.y0 + 16, p.n, '', 'middle'); return { p: p, ra: el('rect', { x: x, width: 20, fill: 'var(--heat)' }, g), rc: el('rect', { x: x + 24, width: 20, fill: 'var(--cyan)' }, g), ta: txt(g, x + 10, 0, '', '', 'middle'), tc: txt(g, x + 34, 0, '', '', 'middle') }; });
    badge(g, 30, bot + 16, 1); badge(g, b.x1 - 10, b.y1 + 8, 2);
    function render() {
      var i = +sl.value, with_ = mode === 'with'; setSvgText(sv, i.toFixed(1) + ' mA/cm²');
      clear(gap); if (!with_) for (var k = 0; k < 6; k++) el('ellipse', { cx: xi + 2, cy: top + 14 + k * 26, rx: 5, ry: 7, fill: 'var(--bg)' }, gap);
      inter.style.display = with_ ? '' : 'none';
      setSvgText(capT, with_ ? 'interlayer: the lithium wets the ceramic' : 'bare: contact only at points');
      rects.forEach(function (o) { var ya = Y(o.p.a), yc = Y(o.p.c); o.ra.setAttribute('y', ya); o.ra.setAttribute('height', b.y0 - ya); o.rc.setAttribute('y', yc); o.rc.setAttribute('height', b.y0 - yc); o.ta.setAttribute('y', ya - 5); setSvgText(o.ta, o.p.a + ''); o.tc.setAttribute('y', yc - 5); setSvgText(o.tc, o.p.c + ''); o.rc.setAttribute('fill-opacity', with_ ? '.9' : '.25'); o.ra.setAttribute('fill-opacity', with_ ? '.3' : '.8'); });
      read.innerHTML = 'At <b>' + i.toFixed(1) + ' mA/cm²</b> the interface alone costs ' + PAIRS.map(function (p) { var v = (with_ ? p.c : p.a) * i; return p.n + ' ' + (v >= 1000 ? (v / 1000).toFixed(2) + ' V' : (v >= 10 ? Math.round(v) : v.toFixed(1)) + ' mV'); }).join(', ') + (with_ ? ', with the interlayer.' : ', with bare lithium (V = R × i).');
    }
    on(sl, 'input', render);
    steps(fig, [
      { text: 'A solid electrolyte would let a cell use lithium metal. The trouble is the contact: a ceramic such as garnet is poorly wetted by lithium, so the two touch only at points, the current crowds through them, and the interface resistance is high. The interface can also react, and lithium can still grow through the ceramic’s grain boundaries.' },
      { text: 'Thin interlayers fix the contact. Red, bare; teal, with the interlayer, as measured: a lithium–graphite composite (381 → 11 Ω cm²), a thin aluminium layer that alloys with lithium (950 → 75), and an Al₂O₃ film made by atomic layer deposition (1710 → 1). Slide the current: at 1 mA/cm² the worst bare interface alone would cost 1.7 V.' }
    ]);
    render();
  });

  /* ===== 9.11 Sodium is bigger ===== */
  register('f9-11', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var scaled = !!fig.querySelector('.r42'); // ion sizes to scale only once the Shannon radii are verified
    var rLi = 7, rNa = scaled ? 7 * 102 / 76 : 10;
    function frame(x0, cols, d, R) {
      var c = [];
      for (var j = 0; j < 3; j++) for (var i = 0; i < cols; i++) { var x = x0 + R + i * d + (j % 2 ? d / 2 : 0), y = 64 + j * d * 0.866; c.push({ x: x, y: y, i: i, j: j }); el('circle', { cx: x, cy: y, r: R, fill: 'var(--anion)', 'fill-opacity': '.3', stroke: 'var(--anion)' }, g); }
      function at(i, j) { for (var k = 0; k < c.length; k++) if (c[k].i === i && c[k].j === j) return c[k]; }
      return function (i, j) { var A = at(i, j), B = at(i + 1, j), C = at(i, j + 1); return { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3, free: d / Math.sqrt(3) - R }; };
    }
    txt(g, 140, 22, 'close-packed oxide', 'strong', 'middle'); txt(g, 395, 22, 'more open framework', 'strong', 'middle');
    var L = frame(30, 4, 54, 24), Rf = frame(296, 3, 70, 22);
    var s1 = L(0, 0), s2 = L(2, 0), s3 = Rf(1, 0);
    el('circle', { cx: s1.x, cy: s1.y, r: rLi, 'class': 'ion' }, g);
    el('circle', { cx: s2.x, cy: s2.y, r: rNa, fill: '#e9a0f0', stroke: 'var(--heat)', 'stroke-width': 1.6 }, g);
    el('circle', { cx: s3.x, cy: s3.y, r: rNa, fill: '#e9a0f0', stroke: '#fff', 'stroke-width': .8 }, g);
    txt(g, 140, 226, 'Li⁺ fits; Na⁺ is squeezed (red rim)', '', 'middle'); txt(g, 395, 226, 'Na⁺ fits', 'cyan', 'middle');
    txt(g, 260, 246, scaled ? 'ions to scale: Li⁺ 76 pm, Na⁺ 102 pm (six-coordinate radii); frameworks schematic' : 'sizes not to scale', '', 'middle');
    badge(g, 18, 40, 1); badge(g, 500, 40, 2);
    steps(fig, [
      { text: 'Na⁺ is a bigger ion than Li⁺. In the close-packed oxygen frameworks that serve lithium so well, the spaces between the oxide ions can be too small for it.' },
      { text: 'A sodium host needs <b>more open</b> interstitial space, which is why sodium-ion cells cannot simply reuse the lithium-ion materials.' }
    ]);
    read.innerHTML = 'The size of the guest ion decides which frameworks can host it.' + (scaled ? ' Ionic radii from Shannon’s table.' : '');
  });
