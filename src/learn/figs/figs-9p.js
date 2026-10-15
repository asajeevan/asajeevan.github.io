  /* =================================================================
     Module 9, the positive electrodes and the organic electrodes.
     9.12 Positive electrodes compared: ratings after Marie and Gifford 2023
     (Faraday Insights 18, R73, Box 1); capacities and notes after R71, R72,
     R73, R75, R76 as stated in each note; the NMC view is Jung et al. 2017
     (R75), Table I. 9.13 Organic electrodes: types after Guo et al. 2024 (R78)
     and Jouhara et al. 2018 (R77); potentials from R77 (Fig. 5b, read off the plot), Jouhara et al.
     2025 (R80), Guo et al. 2024 (R78) and Wang et al. 2023 (R79).
     ================================================================= */
  var POS = [ // r: 2 good, 1 moderate, 0 poor, -1 not rated (cost: Low = good)
    { n: 'LCO', f: 'LiCoO₂', q: 140, ql: '135–140', qk: 'p', r: { cost: 0, en: 1, th: 0, cy: 2 },
      t: 'The original lithium-ion positive electrode, still in phones and laptops. In practice it gives up only about half its lithium, about 135 to 140 mAh/g; structural degradation at high states of charge limits it to half its theoretical capacity. Ratings: high cost, moderate energy density, poor thermal stability, good cycle life.' , s: 'Frith et al. 2023; Manthiram 2020; Marie and Gifford 2023' },
    { n: 'LMO', f: 'LiMn₂O₄', q: 130, ql: '< 130', qk: 'p', r: { cost: 2, en: 1, th: 2, cy: 0 },
      t: 'A spinel at about 4 V with three-dimensional lithium channels, so it delivers power well; cheap because manganese is cheap. Its practical capacity is below 130 mAh/g, and manganese dissolution poisons the graphite and fades the capacity, worst when hot. Ratings: low cost, moderate energy density, good thermal stability, poor cycle life.', s: 'Manthiram 2020; Marie and Gifford 2023' },
    { n: 'LFP', f: 'LiFePO₄', q: 170, ql: '170*', qk: 't', r: { cost: 2, en: 0, th: 2, cy: 2 },
      t: 'An olivine of iron and phosphate, flat at 3.43 V vs Li. Lower voltage and lower specific capacity than NMC (the bar is the theoretical 170 mAh/g of {{ch:capacity-energy}}), but a considerably longer cycle and calendar life than most NMC cells; state-of-the-art cells rose from 90 Wh/kg in 2010 to 160 Wh/kg in 2022. Used for grid storage and shorter-range electric cars. Ratings: low cost, low energy density, good thermal stability, good cycle life.', s: 'Safari and Delacourt 2011; Marie and Gifford 2023' },
    { n: 'LMFP', f: 'LiMnₓFe₁₋ₓPO₄', q: 0, ql: '–', qk: 'n', r: { cost: -1, en: -1, th: -1, cy: -1 },
      t: 'LFP with manganese added. Cells reach around 210 to 240 Wh/kg, roughly 40 % more than LFP. Not rated in the source table; capacity not given there.', s: 'Marie and Gifford 2023' },
    { n: 'NMC622', f: 'LiNi₀.₆Mn₀.₂Co₀.₂O₂', q: 178, ql: '178', qk: 'p', r: { cost: 0, en: 2, th: 1, cy: 2 },
      t: 'Widely used in electric cars today. In one study, full cells against graphite gave 178 mAh/g of NMC when charged to 4.4 V and kept 94 % after 300 cycles at 1C, the highest stable specific energy of the three NMCs tested. Ratings: high cost, high energy density, moderate thermal stability, good cycle life.', s: 'Marie and Gifford 2023; Jung et al. 2017' },
    { n: 'NMC811', f: 'LiNi₀.₈Mn₀.₁Co₀.₁O₂', q: 200, ql: '~200', qk: 'p', r: { cost: 0, en: 2, th: 0, cy: 1 },
      t: 'More nickel, less cobalt: about 200 mAh/g. But it releases oxygen and fades sooner: in one study it cycled stably only to 4.0 V against graphite. Ratings: high cost, high energy density, poor thermal stability, moderate cycle life.', s: 'Marie and Gifford 2023; Jung et al. 2017' },
    { n: 'NCA', f: 'LiNi₀.₈Co₀.₁₅Al₀.₀₅O₂', q: 205, ql: '200–210', qk: 'r', r: { cost: 0, en: 2, th: 0, cy: 1 },
      t: 'Aluminium in place of manganese; first deployed in electric cars by Tesla. With NMC, 200 to 210 mAh/g in the 3.0 to 4.3 V window vs Li; its cycling tends to be better than NMC811’s but it holds more cobalt, about 10 wt%. Ratings: high cost, high energy density, poor thermal stability, moderate cycle life.', s: 'Marie and Gifford 2023; Eshetu et al. 2021' },
    { n: 'LNMO', f: 'LiNi₀.₅Mn₁.₅O₄', q: 135, ql: '~135', qk: 'p', r: { cost: -1, en: -1, th: -1, cy: -1 },
      t: 'The high-voltage spinel: about 4.7 V and about 135 mAh/g, cobalt-free. It releases no oxygen up to 5 V, but few electrolytes survive at that voltage. Not rated in the source table.', s: 'Manthiram 2020; Jung et al. 2017' },
    { n: 'LMR-NMC', f: 'Li₁.₂Mn₀.₄₈Ni₀.₁₆Co₀.₁₆O₂', q: 280, ql: '~280', qk: 'p', r: { cost: 1, en: 2, th: 1, cy: 0 },
      t: 'Lithium- and manganese-rich layered oxide, a candidate for the next generation: about 280 mAh/g against about 200 for NMC811, with oxide ions taking part in the redox. Its voltage decays on cycling as manganese migrates. Ratings: moderate cost, high energy density, moderate thermal stability, poor cycle life.', s: 'Manthiram 2020; Marie and Gifford 2023' }
  ];
  var POS_ASP = ['cost', 'en', 'th', 'cy'];
  var POS_HEAD = { cost: ['low', 'cost'], en: ['energy', 'density'], th: ['thermal', 'stability'], cy: ['cycle', 'life'] };
  var NMC_DATA = [ // Jung et al. 2017, Table I: full cells vs graphite, 1C, 25 °C; capacity of 5th and 300th cycle, mAh/g NMC
    { m: 'NMC111', v: 4.2, a: 140.2, b: 130.0, ret: 93 }, { m: 'NMC111', v: 4.4, a: 162.8, b: 153.2, ret: 94 }, { m: 'NMC111', v: 4.6, a: 183.4, b: 77.1, ret: 42 },
    { m: 'NMC622', v: 4.2, a: 155.4, b: 147.3, ret: 95 }, { m: 'NMC622', v: 4.4, a: 177.8, b: 166.8, ret: 94 }, { m: 'NMC622', v: 4.6, a: 203.1, b: 79.9, ret: 39 },
    { m: 'NMC811', v: 4.0, a: 131.9, b: 118.1, ret: 90 }, { m: 'NMC811', v: 4.1, a: 149.3, b: 114.4, ret: 77 }, { m: 'NMC811', v: 4.2, a: 172.5, b: 114.7, ret: 66 }
  ];
  var NMC_COL = { NMC111: 'var(--second)', NMC622: 'var(--accent)', NMC811: 'var(--heat)' };
  function ratingSymbol(g, x, y, r, rad) {
    rad = rad || 8;
    if (r === 2) el('circle', { cx: x, cy: y, r: rad, fill: 'var(--second)' }, g);
    else if (r === 1) { el('circle', { cx: x, cy: y, r: rad, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.6 }, g); el('path', { d: 'M' + x + ',' + (y - rad) + ' A' + rad + ',' + rad + ' 0 0 0 ' + x + ',' + (y + rad) + ' Z', fill: 'var(--accent)' }, g); }
    else if (r === 0) { var d = rad * 0.56; el('circle', { cx: x, cy: y, r: rad, fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.8 }, g); el('path', { d: 'M' + (x - d) + ',' + (y - d) + ' L' + (x + d) + ',' + (y + d) + ' M' + (x + d) + ',' + (y - d) + ' L' + (x - d) + ',' + (y + d), stroke: 'var(--heat)', 'stroke-width': 1.8 }, g); }
    else el('line', { x1: x - 5, x2: x + 5, y1: y, y2: y, stroke: 'var(--muted)', 'stroke-width': 1.6 }, g);
  }

  /* ===== 9.12 Positive electrodes compared ===== */
  register('f9-12', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), vb = fig.querySelectorAll('button[data-view]');
    var gC = el('g', {}, svg), gN = el('g', {}, svg), sel = null, nsel = null;
    // ---------- the chemistries ----------
    var rx = 16, cQ = 104, qw = 92, c0 = 300, cw = 58, ry0 = 52, rh = 24;
    txt(gC, rx, 34, 'material', 'strong', 'start');
    txt(gC, cQ, 18, 'typical capacity', 'strong', 'start'); txt(gC, cQ, 35, 'mAh/g', '', 'start');
    POS_ASP.forEach(function (a, j) { var x = c0 + j * cw; txt(gC, x, 18, POS_HEAD[a][0], 'strong', 'middle'); txt(gC, x, 35, POS_HEAD[a][1], 'strong', 'middle'); });
    var rows = [];
    POS.forEach(function (p, i) {
      var y = ry0 + i * rh, row = el('g', { tabindex: 0, role: 'button', 'aria-label': p.n + ', ' + p.f, style: 'cursor:pointer' }, gC);
      var bg = el('rect', { x: 8, y: y - rh / 2 + 1, width: 504, height: rh - 2, rx: 6, fill: i % 2 ? 'transparent' : 'rgba(20,23,28,.03)', stroke: 'var(--accent)', 'stroke-opacity': 0, 'stroke-width': 1.5 }, row);
      txt(row, rx, y + 4, p.n, 'strong', 'start');
      if (p.q) {
        var w = qw * p.q / 300;
        if (p.qk === 't') el('rect', { x: cQ, y: y - 6, width: w, height: 12, rx: 3, fill: 'none', stroke: 'var(--second)', 'stroke-dasharray': '3 2' }, row);
        else el('rect', { x: cQ, y: y - 6, width: w, height: 12, rx: 3, fill: 'var(--second)', 'fill-opacity': '.7' }, row);
        txt(row, cQ + w + 5, y + 4, p.ql, '', 'start');
      } else txt(row, cQ, y + 4, 'not given', '', 'start', { style: 'fill:var(--muted)' });
      POS_ASP.forEach(function (a, j) { ratingSymbol(row, c0 + j * cw, y, p.r[a], 7); });
      rows.push({ p: p, bg: bg });
      pressable(row, function () { sel = p; placeC(); });
    });
    var ly = ry0 + POS.length * rh + 6;
    [[2, 'good'], [1, 'moderate'], [0, 'poor'], [-1, 'not rated']].forEach(function (L, j) { var x = 26 + j * 116; ratingSymbol(gC, x, ly, L[0], 6); txt(gC, x + 11, ly + 4, L[1], '', 'start'); });
    badge(gC, cQ + qw + 64, ry0 + 2 * rh, 1); badge(gC, c0 + 3 * cw + 30, ry0 + 4 * rh, 2);
    function placeC() {
      rows.forEach(function (r) { r.bg.setAttribute('stroke-opacity', sel === r.p ? 1 : 0); });
      if (!sel) { read.innerHTML = 'Tap a row to read what lies behind it. Ratings are the Faraday Institution’s 2023 summary; the capacities come from several sources under different conditions, so read them as typical values, not a contest.'; return; }
      read.innerHTML = '<b>' + sel.n + '</b> (' + sel.f + '). ' + sel.t + ' <span style="color:var(--muted)">Sources: ' + sel.s + '.</span>';
    }
    // ---------- the NMCs ----------
    var B = { x0: 64, y0: 236, x1: 500, y1: 44 }, VS = [4.0, 4.1, 4.2, 4.4, 4.6], gw = (B.x1 - B.x0) / VS.length;
    var YQ = function (q) { return B.y0 - q / 220 * (B.y0 - B.y1); };
    plotAxes(gN, B, { yt: [50, 100, 150, 200], ylo: 0, yhi: 220, yf: function (v) { return String(v); } });
    txt(gN, B.x0 - 40, B.y1 - 18, 'capacity, mAh/g of NMC (cycle 5, then cycle 300)', '', 'start');
    VS.forEach(function (v, k) { txt(gN, B.x0 + gw * (k + 0.5), B.y0 + 15, v.toFixed(1) + ' V', '', 'middle'); });
    txt(gN, B.x1, B.y0 + 30, 'upper cut-off of the full cell →', '', 'end');
    var bars = [];
    VS.forEach(function (v, k) {
      var here = NMC_DATA.filter(function (d) { return d.v === v; }), bw = 22, gap = 6, tot = here.length * bw + (here.length - 1) * gap, xs = B.x0 + gw * (k + 0.5) - tot / 2;
      here.forEach(function (d, j) {
        var x = xs + j * (bw + gap), g = el('g', { tabindex: 0, role: 'button', 'aria-label': d.m + ' to ' + d.v + ' V', style: 'cursor:pointer' }, gN);
        el('rect', { x: x, y: YQ(d.a), width: bw, height: B.y0 - YQ(d.a), rx: 2, fill: NMC_COL[d.m], 'fill-opacity': '.22', stroke: NMC_COL[d.m] }, g);
        el('rect', { x: x, y: YQ(d.b), width: bw, height: B.y0 - YQ(d.b), rx: 2, fill: NMC_COL[d.m], 'fill-opacity': '.85' }, g);
        var ring = el('rect', { x: x - 3, y: YQ(d.a) - 3, width: bw + 6, height: B.y0 - YQ(d.a) + 3, rx: 3, fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.5, 'stroke-opacity': 0 }, g);
        txt(g, x + bw / 2, YQ(d.a) - 5, d.ret + '%', d.ret < 80 ? 'heat' : '', 'middle');
        bars.push({ d: d, ring: ring });
        pressable(g, function () { nsel = d; placeN(); });
      });
    });
    badge(gN, B.x0 + gw * 2.5, YQ(205), 3); badge(gN, B.x0 + gw * 4.5 + 34, YQ(120), 4);
    function placeN() {
      bars.forEach(function (b) { b.ring.setAttribute('stroke-opacity', nsel === b.d ? 0.9 : 0); });
      if (!nsel) { read.innerHTML = 'Pale bar: capacity at cycle 5; solid bar: at cycle 300; the number is the capacity kept. Full cells against graphite, 1C, 25 °C, one study. Tap a bar.'; return; }
      var d = nsel;
      read.innerHTML = '<b>' + d.m + ' charged to ' + d.v.toFixed(1) + ' V</b> against graphite: ' + d.a.toFixed(1) + ' mAh/g at cycle 5, ' + d.b.toFixed(1) + ' at cycle 300, <b>' + d.ret + ' % kept</b>. ' + (d.ret >= 90 ? 'Stable.' : 'The positive electrode’s impedance grew. The study links this to oxygen released from the surface of the NMC, which begins at about 4.3 V vs Li for NMC811 and about 4.7 V for NMC111 and NMC622; these cut-offs are full-cell voltages, roughly 0.1 V below the potential of the positive electrode.');
    }
    function setView(v) {
      gC.style.display = v === 'c' ? '' : 'none'; gN.style.display = v === 'n' ? '' : 'none';
      Array.prototype.forEach.call(vb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
      if (v === 'c') placeC(); else placeN();
    }
    var st = null;
    Array.prototype.forEach.call(vb, function (b) { on(b, 'click', function () { var v = b.getAttribute('data-view'); if (st) st.go(v === 'n' ? 2 : 0); else setView(v); }); });
    setView('c');
    st = steps(fig, [
      { text: 'Nine positive electrode materials and how they score. No row is good everywhere: the layered oxides rich in nickel win on energy and mostly lose on heat and cost; LFP and LMO are cheap and thermally stable but store less.', on: function () { sel = null; setView('c'); } },
      { text: 'Look down the columns. The nickel-rich layered oxides score high on energy, poor on cost and mostly poor on heat; LFP rates good on cost, heat and cycle life. The next generation, LMR-NMC, promises the most capacity but does not yet last.', on: function () { sel = POS[8]; setView('c'); } },
      { text: 'Now the NMCs side by side. Charging to a higher voltage takes out more lithium: more capacity. NMC111 and NMC622 stay stable to 4.4 V; NMC811 only to 4.0 V.', on: function () { nsel = NMC_DATA[4]; setView('n'); } },
      { text: 'Push past the limit and the capacity collapses: 42 % and 39 % kept at 4.6 V, 66 % for NMC811 at 4.2 V. More nickel buys capacity at a lower voltage, but leaves less margin.', on: function () { nsel = NMC_DATA[8]; setView('n'); } }
    ]);
  });

  /* ===== 9.13 Organic electrodes: how they work, and where their voltages sit ===== */
  var ORG = [ // potentials vs Li+/Li; col: 0 M(Li2)-p-DHT spectator-cation series, 1 other relatives of p-DHT, 2 Wurster-type and oximate
    // names use §p§ for the italic locant (see setSvgText); readouts convert it with itl()
    { n: 'Li₄-§p§-DHT', col: 0, v: 2.55, dy: -1, t: 'Dilithium (2,5-dilithium-oxy)-terephthalate, where lithium is also the spectator cation. The phenolates are the redox centre, about 2.6 V; in bulk it exchanges one electron per formula unit, half of its theoretical capacity (241 mAh/g for two electrons, computed from its formula). Exfoliated nanosheets reach both electrons. It is oxidized by air.', s: 'Jouhara et al. 2018 and 2025' },
    { n: 'Ba(Li₂)-§p§-DHT', col: 0, v: 2.45, dy: 11, t: 'Barium as the spectator cation: the lowest ionic potential (charge over radius) of the series, and no gain, about 2.45 V against about 2.55 V for the all-lithium salt.', s: 'Jouhara et al. 2018, Fig. 5b' },
    { n: 'Ca(Li₂)-§p§-DHT', col: 0, v: 2.85, dy: 15, t: 'Calcium as the spectator cation: an intermediate ionic potential and an intermediate gain, about 2.85 V.', s: 'Jouhara et al. 2018, Fig. 5b' },
    { n: 'Mg(Li₂)-§p§-DHT', col: 0, v: 3.40, dy: 15, t: 'Magnesium, the spectator cation with the highest ionic potential. In the crystal each Mg²⁺ is chelated by two organic ions, each through a phenolate oxygen and the neighbouring carboxylate oxygen, and each phenolate oxygen is bonded to one Li⁺ and two Mg²⁺. The more covalent Mg–O bond draws electron density from the phenolate and the ring, and lifts the potential by about 0.8 V, to about 3.4 V (3.45 V calculated), in the range of LiFePO₄. About 100 mAh/g (one electron of two), stable cycling, stable in air once dehydrated.', s: 'Jouhara et al. 2018 and 2025' },
    { n: 'Li₄-§o§-DHT', col: 1, v: 2.85, t: 'Dilithium (2,3-dilithium-oxy)-terephthalate, the §ortho§ isomer: moving the two –OLi groups next to each other raises the potential by about 0.3 V, but bulk material still gives one electron of two, and it is oxidized by air.', s: 'Jouhara et al. 2018' },
    { n: 'Li₄-§p§-DOBDA', col: 1, v: 3.35, dy: 4, t: 'Tetralithium 2,5-dioxido-1,4-benzenediacetate: carboxylates held off the ring by a methylene (CH₂) spacer are no longer conjugated with it; the authors attribute the rise to a through-space charge modulation in the solid. 3.35 V with both electrons, 215 mAh/g, but a large polarization on cycling.', s: 'Jouhara et al. 2025' },
    { n: 'Li₂-BQDO', col: 2, v: 3.0, t: 'A conjugated oximate, with its charge on C=N–O⁻ groups: about 350 mAh/g at about 3.0 V, close to 1 kWh/kg at the material level; it polymerizes reversibly as it charges, which slows dissolution.', s: 'Wang et al. 2023' },
    { n: 'Li₂-PDCA', col: 2, v: 3.15, t: 'A conjugated cyanamide: a §p§-phenylenediamine core with –C≡N on each nitrogen (Wurster-type redox). 3.15 and 3.32 V in the solid, 320 mAh/g in theory for two electrons. The charged form dissolves, so cycling one electron (160 mAh/g) kept about 80 % after 100 cycles.', s: 'Guo et al. 2024' },
    { n: 'Li₂-PDFSA', col: 2, v: 3.55, t: 'A conjugated triflimide: the same core with –SO₂CF₃ on each nitrogen, the more strongly electron-withdrawing relative of the conjugated sulfonamides. About 3.55 V in the solid, 140 mAh/g in theory; stable in moist ambient air.', s: 'Guo et al. 2024' },
    { n: 'Li₂-DF-PDFSA', col: 2, v: 3.70, t: 'Two fluorine atoms on the ring raise it further: about 3.7 V on its first plateau in the solid; in solution its two steps sit at 3.68 and 3.91 V, the second the highest n-type organic potential reported in that work.', s: 'Guo et al. 2024' }
  ];
  function itl(str) { return String(str).replace(/§([^§]*)§/g, '<i>$1</i>'); } // §p§ -> <i>p</i> for HTML readouts
  register('f9-13', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), vb = fig.querySelectorAll('button[data-view]');
    var gM = el('g', {}, svg), gX = el('g', {}, svg), gL = el('g', {}, svg), osel = null;
    var defs = el('defs', {}, svg); [['f913-arc', 'var(--second)'], ['f913-arh', 'var(--heat)'], ['f913-ark', 'var(--text)']].forEach(function (m) { var mk = el('marker', { id: m[0], viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', fill: m[1] }, mk); });
    var HALO = { style: 'paint-order:stroke;stroke:var(--panel);stroke-width:4px;stroke-linejoin:round' };
    // a six-membered carbon ring, drawn as a skeletal formula; dbl lists the ring bonds drawn double (bond i joins vertex i and i + 1, vertex 0 on the right)
    function ring(g, cx, cy, R, dbl, w) {
      var v = []; for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; v.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
      for (i = 0; i < 6; i++) {
        var p = v[i], q = v[(i + 1) % 6];
        el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: 'var(--text)', 'stroke-width': w || 1.5, 'stroke-linecap': 'round' }, g);
        if (dbl.indexOf(i) >= 0) { // the second line of a double bond, inside the ring and a little shorter
          var k = 0.72, f = 0.16, mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ix = cx + (mx - cx) * k, iy = cy + (my - cy) * k, dx = (q[0] - p[0]) * (0.5 - f), dy = (q[1] - p[1]) * (0.5 - f);
          el('line', { x1: ix - dx, y1: iy - dy, x2: ix + dx, y2: iy + dy, stroke: 'var(--text)', 'stroke-width': (w || 1.5) * 0.9, 'stroke-linecap': 'round' }, g);
        }
      }
      return v;
    }
    function bond(g, x1, y1, x2, y2, n, cut1, cut2) { // n parallel lines, shortened at the ends that carry an atom label
      var L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, a = cut1 || 0, b = cut2 || 0;
      for (var i = 0; i < n; i++) { var o = (i - (n - 1) / 2) * 3.2; el('line', { x1: x1 + ux * a - uy * o, y1: y1 + uy * a + ux * o, x2: x2 - ux * b - uy * o, y2: y2 - uy * b + ux * o, stroke: 'var(--text)', 'stroke-width': 1.4, 'stroke-linecap': 'round' }, g); }
    }
    function liIon(g, x, y, side) { el('circle', { cx: x, cy: y, r: 6, 'class': 'ion' }, g); txt(g, x + side * 9, y + 4, 'Li⁺', 'amber', side > 0 ? 'start' : 'end'); }

    // ---------- view 1: how they work, oxidized states above, reduced below ----------
    var P = [{ x: 132, k: 'n', h: 'n-type', s1: 'reduced: takes e⁻,', s2: 'a cation (Li⁺) balances it' }, { x: 290, k: 'p', h: 'p-type', s1: 'oxidized: gives e⁻,', s2: 'an anion (A⁻) balances it' }, { x: 448, k: 'b', h: 'bipolar', s1: 'both, in different', s2: 'windows of potential' }];
    var RY = { ox: 72, ne: 142, re: 212 }, parts = {};
    [['oxidized', RY.ox], ['neutral', RY.ne], ['reduced', RY.re]].forEach(function (r) { txt(gM, 20, r[1] + 4, r[0], '', 'start', { style: 'fill:var(--muted)' }); });
    el('line', { x1: 10, x2: 10, y1: RY.re + 26, y2: RY.ox - 28, stroke: 'var(--muted)', 'stroke-width': 1.2, 'marker-end': 'url(#f913-ark)' }, gM);
    txt(gM, 16, RY.ox - 32, 'higher potential', '', 'start', { style: 'fill:var(--muted)' });
    function state(g, x, y, q, col) { // the redox-active molecule R, drawn as an aromatic ring, with its charge
      ring(g, x - 10, y, 14, [0, 2, 4], 1.4);
      txt(g, x - 10, y + 4, 'R', 'strong', 'middle', HALO);
      if (q) { el('circle', { cx: x + 7, cy: y - 13, r: 6.5, fill: col, stroke: '#fff', 'stroke-width': 1 }, g); txt(g, x + 7, y - 9.5, q > 0 ? '+' : '−', 'strong', 'middle', { style: 'fill:#fff;font-size:11px' }); }
    }
    P.forEach(function (p) {
      var g = el('g', {}, gM); parts[p.k] = g;
      txt(g, p.x, 24, p.h, 'strong', 'middle');
      state(g, p.x, RY.ne, 0);
      if (p.k !== 'p') {
        state(g, p.x, RY.re, -1, 'var(--second)'); liIon(g, p.x + 16, RY.re + 2, 1);
        el('line', { x1: p.x - 10, y1: RY.ne + 18, x2: p.x - 10, y2: RY.re - 20, stroke: 'var(--second)', 'stroke-width': 1.6, 'marker-end': 'url(#f913-arc)' }, g);
        el('circle', { cx: p.x - 28, cy: (RY.ne + RY.re) / 2, r: 3.4, 'class': 'e-dot' }, g);
        txt(g, p.x - 4, (RY.ne + RY.re) / 2 + 4, '+e⁻, +Li⁺', 'cyan', 'start');
      }
      if (p.k !== 'n') {
        state(g, p.x, RY.ox, 1, 'var(--heat)');
        el('circle', { cx: p.x + 24, cy: RY.ox + 3, r: 9, 'class': 'ion an' }, g); txt(g, p.x + 36, RY.ox + 7, 'A⁻', 'strong', 'start');
        el('line', { x1: p.x - 10, y1: RY.ne - 18, x2: p.x - 10, y2: RY.ox + 20, stroke: 'var(--heat)', 'stroke-width': 1.6, 'marker-end': 'url(#f913-arh)' }, g);
        el('circle', { cx: p.x - 28, cy: (RY.ne + RY.ox) / 2, r: 3.4, 'class': 'e-dot' }, g);
        txt(g, p.x - 4, (RY.ne + RY.ox) / 2 + 4, '−e⁻, +A⁻', 'heat', 'start');
      }
      txt(g, p.x, 256, p.s1, '', 'middle'); txt(g, p.x, 272, p.s2, '', 'middle');
    });
    txt(gM, 270, 294, 'R: the redox-active molecule or polymer; A⁻: an anion from the electrolyte', '', 'middle', { style: 'fill:var(--muted)' });
    badge(gM, 132 - 50, RY.re, 1); badge(gM, 290 - 50, RY.ox, 2); badge(gM, 448 - 50, RY.ne, 3);

    // ---------- view 2: one molecule, step by step (Li2-PDCA, Wurster-type redox) ----------
    // state 2: the dianion with two Li+, as made; 1: the radical anion; 0: the neutral quinonediimine
    function pdca(g, cx, cy, s) {
      var R = 21, v = ring(g, cx, cy, R, s === 0 ? [1, 4] : [0, 2, 4]);
      [1, -1].forEach(function (side) {
        var c = side > 0 ? v[0] : v[3], nx = cx + side * (R + 21), ny = cy;
        bond(g, c[0], c[1], nx, ny, s === 0 ? 2 : 1, 0, 6);                       // ring carbon to nitrogen (double in the quinoid form)
        var cx2 = nx + side * 17, cy2 = ny - 10, nx2 = nx + side * 33, ny2 = ny - 19;
        bond(g, nx, ny, cx2, cy2, 1, 6, 0); bond(g, cx2, cy2, nx2, ny2, 3, 0, 6);   // N-C, then the C≡N triple bond
        txt(g, nx, ny + 4.5, 'N', 'strong', 'middle', HALO); txt(g, nx2, ny2 + 4.5, 'N', 'strong', 'middle', HALO);
        var charged = s === 2 || (s === 1 && side < 0), radical = s === 1 && side > 0;
        if (charged) { txt(g, nx + side * 8, ny - 5, '−', 'strong', 'middle'); liIon(g, nx, ny + 21, side); }
        if (radical) txt(g, nx + 1, ny - 8, '•', 'strong big', 'middle');
      });
    }
    var XR = [62, 152, 242], XC = 150;
    txt(gX, 16, 20, 'Li₂-PDCA: a §p§-phenylenediamine core with –C≡N on each nitrogen', 'strong', 'start');
    var xs = [{ s: 2, n: 'Li₂-PDCA', d: 'the lithiated form, as made' }, { s: 1, n: 'Li-PDCA', d: 'a radical anion' }, { s: 0, n: 'PDCA', d: 'the quinonediimine' }];
    var xg = [];
    xs.forEach(function (o, i) {
      var g = el('g', {}, gX); xg.push(g);
      pdca(g, XC, XR[i] + 6, o.s);
      txt(g, 316, XR[i] + 2, o.n, 'strong', 'start'); txt(g, 316, XR[i] + 18, o.d, '', 'start');
    });
    [[3.15, 'first step'], [3.32, 'second step']].forEach(function (st, i) {
      var y1 = XR[i] + 28, y2 = XR[i + 1] - 22, ym = (y1 + y2) / 2;
      el('line', { x1: 290, y1: y1, x2: 290, y2: y2, stroke: 'var(--text)', 'stroke-width': 1.4, 'marker-start': 'url(#f913-ark)', 'marker-end': 'url(#f913-ark)' }, gX);
      el('circle', { cx: 330, cy: ym - 4, r: 3.4, 'class': 'e-dot' }, gX); el('circle', { cx: 344, cy: ym - 4, r: 5, 'class': 'ion' }, gX);
      txt(gX, 354, ym, 'charge: −e⁻, −Li⁺', 'strong', 'start');
      txt(gX, 316, ym + 16, st[1] + ', about ' + st[0].toFixed(2) + ' V', 'cyan', 'start');
    });
    txt(gX, 300, 294, 'discharge runs both steps back', '', 'start', { style: 'fill:var(--muted)' });
    badge(gX, 34, XR[1] + 6, 4);

    // ---------- view 3: the voltage ladder ----------
    var L = { x0: 60, y0: 250, y1: 40, lo: 2.4, hi: 3.8 }, YV = function (v) { return L.y0 - (v - L.lo) / (L.hi - L.lo) * (L.y0 - L.y1); };
    var CX = [150, 290, 430], CH = ['M(Li₂)-§p§-DHT salts', 'other §p§-DHT relatives', 'Wurster-type, oximate'];
    el('line', { x1: L.x0, y1: L.y0, x2: L.x0, y2: L.y1, stroke: 'var(--line-2)' }, gL);
    [2.4, 3.2, 3.6].forEach(function (v) { el('line', { x1: L.x0, x2: 505, y1: YV(v), y2: YV(v), stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, gL); txt(gL, L.x0 - 6, YV(v) + 4, v.toFixed(1), '', 'end'); });
    txt(gL, L.x0 - 40, L.y1 - 18, 'average potential, V vs Li⁺/Li', '', 'start');
    CH.forEach(function (h, i) { txt(gL, CX[i], L.y0 + 28, h, 'strong', 'middle'); });
    el('line', { x1: L.x0, x2: 505, y1: YV(2.91), y2: YV(2.91), stroke: 'var(--heat)', 'stroke-dasharray': '6 4' }, gL);
    txt(gL, L.x0 - 6, YV(2.91) + 4, '2.91', 'heat', 'end');
    el('line', { x1: L.x0, x2: 505, y1: YV(3.43), y2: YV(3.43), stroke: 'var(--muted)', 'stroke-width': 1.4 }, gL);
    txt(gL, 505, YV(3.43) + 14, 'LiFePO₄, 3.43 V', '', 'end', { style: 'fill:var(--muted)' });
    var dots = [];
    ORG.forEach(function (o) {
      var x = CX[o.col], y = YV(o.v), g = el('g', { tabindex: 0, role: 'button', 'aria-label': o.n.replace(/§/g, '') + ', ' + o.v.toFixed(2) + ' volts', style: 'cursor:pointer' }, gL);
      el('circle', { cx: x, cy: y, r: 9, fill: 'transparent' }, g);
      el('circle', { cx: x, cy: y, r: 5, fill: o.v >= 2.91 ? 'var(--second)' : 'var(--accent)', stroke: 'var(--bg)', 'stroke-width': 1 }, g);
      var ring2 = el('circle', { cx: x, cy: y, r: 9, fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.5, 'stroke-opacity': 0 }, g);
      txt(g, x + 10, y + (o.dy || 4), o.n, '', 'start', HALO);
      dots.push({ o: o, ring: ring2 });
      pressable(g, function () { osel = o; placeL(); });
    });
    badge(gL, CX[0] - 26, YV(3.62), 5); badge(gL, CX[2] - 26, YV(3.70), 6);
    function placeL() {
      dots.forEach(function (d) { d.ring.setAttribute('stroke-opacity', osel === d.o ? 0.9 : 0); });
      if (!osel) { read.innerHTML = 'Each dot is the average (or first-plateau) potential of a lithiated organic positive electrode, measured against lithium. Below the dashed line a lithiated material is thermodynamically prone to oxidation by air. Tap a dot.'; return; }
      read.innerHTML = '<b>' + itl(osel.n) + '</b>, about ' + osel.v.toFixed(2) + ' V vs Li. ' + itl(osel.t) + ' <span style="color:var(--muted)">Sources: ' + osel.s + '.</span>';
    }
    function placeM(k) {
      ['n', 'p', 'b'].forEach(function (q) { parts[q].style.opacity = !k || k === q ? 1 : 0.3; });
      var T = { n: 'n-type: the molecule is reduced and a cation, here Li⁺, balances the extra negative charge. n-type materials suit lithium-ion cells, because they work with the cation that already rocks between the electrodes. <span style="color:var(--muted)">Source: Guo et al. 2024.</span>', p: 'p-type: the molecule is oxidized and an anion from the electrolyte balances the positive charge. These work at relatively high potential, but they store the anion, which suits dual-ion or lithium-free cells rather than the rocking chair. <span style="color:var(--muted)">Sources: Guo et al. 2024; Wang et al. 2023.</span>', b: 'Bipolar: one material can do both, taking a cation in one window of potential and an anion in another. <span style="color:var(--muted)">Source: Guo et al. 2024.</span>' };
      read.innerHTML = k ? T[k] : 'Organic electrodes are sorted by the charge their molecule takes on, and by which ion balances it. Use the steps.';
    }
    function placeX() {
      read.innerHTML = 'Li₂-PDCA, dilithium 1,4-phenylene dicyanamide, gives up its two lithium ions one at a time. The first step leaves a radical anion; the second, the neutral quinonediimine. The redox centre is the <i>p</i>-phenylenediamine core (Wurster-type redox); the electron-withdrawing –C≡N groups raise the potential. In the solid the two steps sit at about 3.15 and 3.32 V; the fully charged form dissolves, so cycling was limited to one electron. <span style="color:var(--muted)">Source: Guo et al. 2024, Fig. 3A and Table 1.</span>';
    }
    var VIEWS = { m: gM, x: gX, l: gL };
    function setView(v) {
      Object.keys(VIEWS).forEach(function (k) { VIEWS[k].style.display = k === v ? '' : 'none'; });
      Array.prototype.forEach.call(vb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
      if (v === 'l') placeL(); else if (v === 'x') placeX(); else placeM(null);
    }
    var st = null, FIRST = { m: 0, x: 3, l: 4 };
    Array.prototype.forEach.call(vb, function (b) { on(b, 'click', function () { var v = b.getAttribute('data-view'); if (st) st.go(FIRST[v]); else setView(v); }); });
    setView('m');
    st = steps(fig, [
      { text: 'n-type: reduction, balanced by a cation such as Li⁺. A lithiated n-type material is made in its reduced form and gives up its lithium on the first charge, like LiCoO₂.', on: function () { setView('m'); placeM('n'); } },
      { text: 'p-type: oxidation, balanced by an anion from the electrolyte. High potentials, but the anion, not lithium, is what the electrode takes up.', on: function () { setView('m'); placeM('p'); } },
      { text: 'Bipolar: both, a cation in one window of potential and an anion in another.', on: function () { setView('m'); placeM('b'); } },
      { text: 'One real n-type molecule, step by step. Li₂-PDCA gives up one electron and one Li⁺ at about 3.15 V, becoming a radical anion, then a second pair at about 3.32 V, becoming the neutral quinonediimine. Discharge runs both steps back.', on: function () { setView('x'); } },
      { text: 'Now the voltages of lithiated n-type positive electrodes. In the M(Li₂)-<i>p</i>-DHT salts the organic ion is the same and the spectator cation sets the potential: barium and lithium near 2.5 V, calcium about 2.85 V, magnesium 3.4 V.', on: function () { osel = ORG[3]; setView('l'); } },
      { text: 'A <i>p</i>-phenylenediamine core with electron-withdrawing groups on its nitrogens (Wurster-type redox) goes higher still: the conjugated triflimides reach about 3.7 V; the simplest cyanamide stores more but dissolves when fully charged.', on: function () { osel = ORG[ORG.length - 1]; setView('l'); } }
    ]);
  });
