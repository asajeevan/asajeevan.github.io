  /* =================================================================
     Module 2: anatomy of a cell. Coin-cell stack after Murray, Hall and
     Dahn 2019 Figure 1; layer jobs from Winter and Brodd 2004 section
     1.2; collectors after Goodenough and Park 2013 Figure 1; the
     composite coating after Winter and Brodd section 1.6.
     ================================================================= */

  /* ===== 2.1 A coin cell in cross-section ===== */
  register('f2-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), info = fig.querySelector('.part-info'), range = fig.querySelector('input[type=range]');
    var cx = 250, W = 270, x0 = cx - W / 2, x1 = cx + W / 2;
    // top view: a small disc to say "round"
    el('circle', { cx: 56, cy: 60, r: 30, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g); el('circle', { cx: 56, cy: 60, r: 24, fill: 'none', stroke: 'var(--line)' }, g);
    txt(g, 56, 64, '−', 'strong big', 'middle'); txt(g, 56, 106, 'top view: cap (−)', '', 'middle'); txt(g, 56, 120, '20 mm across', '', 'middle');
    txt(g, cx + 30, 24, 'cross-section, pulled apart (not to scale)', 'strong', 'middle');
    // layers, from the bottom up; y = resting position, h = thickness, k = explode order
    var layers = [
      { key: 'can', name: 'Can, aluminium-coated (+ terminal)', y: 216, h: 14, w: W, fill: '#5f7076', desc: 'Stainless-steel can with an aluminium coating on the inside: the container and the positive terminal. The positive electrode sits directly on it (Murray, Hall and Dahn 2019, Figure 1).' },
      { key: 'pos', name: 'Positive electrode', y: 202, h: 14, w: 200, fill: 'var(--amber-2)', desc: 'A coating of the positive active material (LiCoO₂ in the first commercial cell, NMC622 in Murray, Hall and Dahn’s cells) on an aluminium surface. On discharge it takes the electrons: the electron acceptor (Winter and Brodd 2004, section 2.2).' },
      { key: 'sep', name: 'Separator, soaked with electrolyte', y: 194, h: 8, w: 230, fill: 'var(--cyan)', desc: 'A porous film (Celgard, two layers, in Figure 1a of Murray, Hall and Dahn) full of electrolyte: permeable to ions, inert, and a physical barrier that prevents electrical shorting (Winter and Brodd 2004, section 1.2). If the electrodes touched, the full stored energy would be released as heat inside the cell (their section 2.2).' },
      { key: 'neg', name: 'Negative electrode', y: 180, h: 14, w: 200, fill: '#2b3538', desc: 'Graphite coated on copper foil, as in the first commercial lithium-ion cell (Goodenough and Park 2013, Figure 1). On discharge it gives up electrons: the reducing agent (Winter and Brodd 2004, section 2.2).' },
      { key: 'spacer', name: 'Spacer, stainless steel', y: 168, h: 12, w: 220, fill: '#7d8f94', desc: 'A steel disc that fills the height so that the stack is pressed evenly (Murray, Hall and Dahn 2019, Figure 1).' },
      { key: 'spring', name: 'Spring, stainless steel', y: 150, h: 18, w: 140, fill: 'none', desc: 'A wave spring that presses the stack together so every layer stays in contact. Murray, Hall and Dahn found that dropping the spring and spacer from an angle misaligned the electrodes and cost up to 20 % of the capacity in 100 cycles; placing them from directly above with a vacuum pen fixed it.' },
      { key: 'cap', name: 'Cap and gasket (− terminal)', y: 136, h: 14, w: W, fill: '#5f7076', desc: 'Stainless-steel cap, the negative terminal, crimped onto the can with a polymer gasket between them: the gasket seals the cell and keeps the two terminals from touching (Murray, Hall and Dahn 2019, Figure 1).' }
    ];
    var groups = {};
    layers.forEach(function (L, i) {
      var grp = el('g', { 'class': 'layer', 'data-part': L.key, tabindex: '0', role: 'button', 'aria-label': L.name }, g);
      var lx = cx - L.w / 2;
      if (L.key === 'can') { el('path', { 'class': 'shape', d: 'M' + x0 + ',' + (L.y - 60) + ' V' + (L.y + L.h - 6) + ' q0,6 6,6 H' + (x1 - 6) + ' q6,0 6,-6 V' + (L.y - 60) + ' h-8 V' + (L.y - 2) + ' H' + (x0 + 8) + ' V' + (L.y - 60) + ' Z', fill: L.fill, stroke: 'var(--line-2)' }, grp); el('rect', { x: x0 + 8, y: L.y - 2, width: W - 16, height: 3, fill: '#cfd6d8' }, grp); }
      else if (L.key === 'cap') { el('path', { 'class': 'shape', d: 'M' + (x0 + 14) + ',' + (L.y + 46) + ' V' + (L.y + 6) + ' q0,-6 6,-6 H' + (x1 - 20) + ' q6,0 6,6 V' + (L.y + 46) + ' h-8 V' + (L.y + 10) + ' H' + (x0 + 22) + ' V' + (L.y + 46) + ' Z', fill: L.fill, stroke: 'var(--line-2)' }, grp); el('rect', { x: x0 + 8, y: L.y + 12, width: 8, height: 40, rx: 2, fill: 'var(--amber)', 'fill-opacity': '.8' }, grp); el('rect', { x: x1 - 16, y: L.y + 12, width: 8, height: 40, rx: 2, fill: 'var(--amber)', 'fill-opacity': '.8' }, grp); }
      else if (L.key === 'spring') { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, fill: 'transparent', stroke: 'transparent' }, grp); el('path', { d: 'M' + lx + ',' + (L.y + L.h - 2) + ' l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14', fill: 'none', stroke: '#9fb1b6', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, grp); }
      else if (L.key === 'sep') { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, rx: 2, fill: L.fill, 'fill-opacity': '.35', stroke: 'var(--cyan)', 'stroke-opacity': '.7' }, grp); for (var k = 0; k < 26; k++) el('circle', { cx: lx + 6 + k * 8.8, cy: L.y + 4, r: 1.6, fill: 'var(--bg-2)' }, grp); }
      else { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, rx: 2, fill: L.fill, stroke: 'var(--line-2)' }, grp);
        if (L.key === 'neg') { el('rect', { x: lx, y: L.y, width: L.w, height: 3, fill: 'var(--copper)' }, grp); for (var q = 0; q < 12; q++) el('circle', { cx: lx + 10 + q * 17, cy: L.y + 9, r: 1.8, fill: 'var(--cyan)', 'fill-opacity': '.8' }, grp); }
        if (L.key === 'pos') { for (var q2 = 0; q2 < 12; q2++) el('circle', { cx: lx + 10 + q2 * 17, cy: L.y + 6, r: 1.8, fill: 'var(--cyan)', 'fill-opacity': '.8' }, grp); }
      }
      var shortName = { can: 'can (+)', pos: 'positive electrode', sep: 'separator', neg: 'negative electrode', spacer: 'spacer', spring: 'spring', cap: 'cap (−)' }[L.key];
      var lab = txt(grp, x1 + 10, L.y + (L.key === 'cap' ? 30 : L.key === 'can' ? 8 : L.h / 2 + 4), shortName, '');
      groups[L.key] = grp; L.g = grp; L.i = i;
    });
    // the potential strip: cap (−) → negative → separator → positive → can (+)
    var strip = phiStrip(g, { x: 70, y: 286, w: 380, h: 40 }, [{ x: 0, phi: 0 }, { x: 0.18, phi: 0 }, { x: 0.181, phi: 0.6 }, { x: 0.8, phi: 0.6 }, { x: 0.801, phi: 1 }, { x: 1, phi: 1 }], { vmin: -0.1, vmax: 1.15, label: 'φ', units: '', xlabel: '' });
    txt(g, 100, 340, 'cap and graphite (−)', 'phi', 'middle'); txt(g, 260, 340, 'electrolyte in the separator', 'phi', 'middle'); txt(g, 420, 340, 'LiCoO₂ and can (+)', 'phi', 'middle');
    txt(g, 470, 300, 'V', 'phi strong', 'middle');
    badge(g, 108, 187, 1); badge(g, 108, 216, 2); badge(g, 108, 140, 3); badge(g, 415, 84, 4); badge(g, 40, 286, 5);
    function explode(k) { layers.forEach(function (L) { L.g.setAttribute('transform', 'translate(0,' + ((3 - L.i) * 30 * k) + ')'); }); Array.prototype.forEach.call(svg.querySelectorAll('.callout'), function (c) { var st = +c.getAttribute('data-step'); if (st === 4) c.setAttribute('transform', 'translate(415,' + (138 - 90 * k) + ')'); }); }
    function pick(L) { layers.forEach(function (x) { x.g.classList.toggle('picked', x === L); }); info.innerHTML = '<b>' + L.name + '.</b> ' + L.desc; }
    layers.forEach(function (L) { on(L.g, 'click', function () { pick(L); }); on(L.g, 'mouseenter', function () { pick(L); }); on(L.g, 'focus', function () { pick(L); }); on(L.g, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(L); } }); });
    on(range, 'input', function () { explode(+range.value / 100); });
    steps(fig, [
      { text: 'The electrochemical stack: <b>negative electrode</b> (graphite on copper), <b>separator</b>, <b>positive electrode</b> (a lithium host on aluminium). Everything else is packaging and pressure. Tap a layer to read its job.', on: function () { pick(layers[3]); } },
      { text: 'The <b>electrolyte</b> is a liquid: drops of 1 M LiPF₆ in a carbonate solvent, about 38 mg in a research coin cell, soak the separator and fill the pores of both electrodes (cyan dots). It is the ion road of module 1.', on: function () { pick(layers[2]); } },
      { text: 'The <b>spacer</b> and <b>spring</b> press the stack so every layer touches the next; a stack placed slightly askew loses capacity to lithium plating at the uncovered edge.', on: function () { pick(layers[5]); } },
      { text: 'The <b>can</b> is the + terminal and the <b>cap</b> the − terminal; the gasket between them seals the cell and keeps them apart. The whole cell voltage appears between these two pieces of steel.', on: function () { pick(layers[6]); } },
      { text: 'The strip from module 1, now in the coin cell: the potential jumps at the two electrode|electrolyte boundaries and is flat through the soaked separator at open circuit. The can sits V above the cap.' }
    ]);
    explode(+range.value / 100); pick(layers[3]);
  });

  /* ===== 2.2 The jelly roll: a flat stack wound into a cylinder ===== */
  register('f2-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), wind = fig.querySelector('.wind'), read = fig.querySelector('.readout');
    var cols = ['var(--copper)', '#2b3538', 'var(--cyan)', 'var(--amber-2)', '#cfd6d8'], widths = [3, 8, 4, 8, 3], names = ['copper foil (collector)', 'graphite', 'separator + electrolyte', 'LiCoO₂', 'aluminium foil (collector)'];
    var N = 200, turns = 2.2, xL = 40, xR = 330, yMid = 150, L = xR - xL, pitch = 2.2;
    var offs = [-13, -7, 0, 7, 13];
    var body = el('g', {}, g);
    var paths = cols.map(function (c, i) { return el('path', { fill: 'none', stroke: c, 'stroke-width': widths[i], 'stroke-linecap': 'round', 'class': 'spiral' }, body); });
    var labG = el('g', {}, g);
    var labY = [70, 100, 200, 230, 260];
    var labs = names.map(function (n, i) { var y = labY[i]; el('line', { x1: 120 + i * 40, y1: yMid + offs[i], x2: 120 + i * 40, y2: y + (y < yMid ? 4 : -12), stroke: 'var(--line-2)' }, labG); return txt(labG, 120 + i * 40, y, n, '', 'middle'); });
    var dimA = el('g', {}, g); arrow(dimA, xL, 40, xR, 40, '#A3B6B1', 1.2); arrow(dimA, xR, 40, xL, 40, '#A3B6B1', 1.2); txt(dimA, (xL + xR) / 2, 30, 'large area: the whole strip faces the other electrode', '', 'middle');
    var dimT = el('g', {}, g); el('path', { d: 'M' + (xR + 10) + ',' + (yMid - 3) + ' h6 v6 h-6', fill: 'none', stroke: 'var(--cyan)' }, dimT); txt(dimT, xR + 22, yMid + 4, 'thin electrolyte', 'cyan');
    var wl = txt(g, 420, 262, 'wound: a cylindrical cell', 'amber', 'middle'); wl.style.opacity = '0';
    badge(g, 20, 110, 1); badge(g, 20, 40, 2); badge(g, 500, 60, 3);
    function render() {
      var k = smooth(+wind.value / 100), kk = Math.max(0.02, k);
      var thMax = kk * turns * 2 * Math.PI, b = pitch, a = (L - b * thMax * thMax / 2) / thMax; // arc length stays about L
      var cx = xL + k * (400 - xL), cy = yMid + a; // the roll slides right as it winds
      paths.forEach(function (p, layer) {
        var d = '', off = offs[layer];
        for (var i = 0; i <= N; i++) {
          var f = i / N, th = f * thMax, r = a + b * th - off * (0.15 + 0.85 * k);
          var x = cx + r * Math.cos(th - Math.PI / 2), y = cy + r * Math.sin(th - Math.PI / 2) + off * (1 - k);
          if (k < 0.01) { x = xL + f * L; y = yMid + off; }
          d += (i ? ' L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
        }
        p.setAttribute('d', d);
      });
      labG.style.opacity = dimA.style.opacity = dimT.style.opacity = String(Math.max(0, 1 - 2.5 * k)); wl.style.opacity = String(k);
      read.innerHTML = k < 0.5 ? 'Flat: five thin layers, two of them metal foils (the current collectors), with the electrolyte held in the separator between the two coatings.' : 'Wound: the same five layers, rolled up so that a long, wide strip fits in a can. Every part of the strip still faces its partner electrode across the thin separator.';
    }
    on(wind, 'input', render); render();
    steps(fig, [
      { text: 'Five layers: <b>copper foil</b>, <b>graphite</b>, the <b>separator</b> soaked with electrolyte, <b>LiCoO₂</b>, <b>aluminium foil</b>. The two foils are the current collectors: metal roads for the electrons between the coating and the terminals.', on: function () { wind.value = 0; render(); } },
      { text: 'Why so thin and so wide: ions move through the electrolyte far more slowly than electrons move through a metal, so a cell wants a <b>large area</b> of electrode facing a <b>thin</b> layer of electrolyte.', on: function () { wind.value = 0; render(); } },
      { text: 'Slide “wind”, or press Play, to roll the strip up. A cylindrical cell is exactly this stack, wound; coin, prismatic and flat cells hold the same layers in other shapes.' }
    ]);
    var dir = 1;
    var loop = anim(fig, function (dt) { if (dt === 0) return; var v = +wind.value + dir * dt * 28; if (v >= 100) { v = 100; dir = -1; } if (v <= 0) { v = 0; dir = 1; } wind.value = String(v); render(); }, { autoplay: false, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 2.3 Inside a composite electrode ===== */
  register('f2-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 60, x1 = 460, yTop = 40, yCol = 232;
    el('rect', { x: x0, y: yTop, width: x1 - x0, height: yCol - yTop, fill: 'var(--cyan)', 'fill-opacity': '.16' }, g); // pores: electrolyte
    el('rect', { x: x0, y: yCol, width: x1 - x0, height: 12, fill: '#cfd6d8' }, g); txt(g, 260, yCol + 26, 'current collector (aluminium foil)', '', 'middle');
    txt(g, 260, yTop - 24, 'separator side: Li⁺ arrive from here', 'cyan', 'middle');
    // particles: irregular polygons
    var parts = [[110, 90], [190, 70], [280, 84], [370, 72], [430, 120], [120, 170], [210, 150], [300, 160], [390, 168], [160, 214], [250, 212], [340, 218], [420, 212]];
    var pg = el('g', { fill: 'var(--amber-2)', stroke: 'var(--amber)', 'stroke-opacity': '.55' }, g);
    parts.forEach(function (c, i) { var d = '', n = 7, R = 24 + (i % 3) * 4; for (var k = 0; k < n; k++) { var a = k / n * 2 * Math.PI + i, r = R * (0.8 + 0.25 * Math.sin(3 * a + i)); d += (k ? ' L' : 'M') + (c[0] + r * Math.cos(a)).toFixed(1) + ',' + (c[1] + r * Math.sin(a)).toFixed(1); } el('path', { d: d + ' Z' }, pg); });
    // binder: short polymer strands at contacts
    var bg = el('g', { fill: 'none', stroke: 'var(--cyan-2)', 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
    [[150, 96], [236, 80], [326, 78], [398, 96], [166, 190], [256, 186], [346, 190], [126, 130], [210, 112], [296, 122], [380, 120], [206, 232], [296, 232], [384, 232]].forEach(function (p) { el('path', { d: 'M' + (p[0] - 8) + ',' + p[1] + ' q4,-6 8,0 t8,0' }, bg); });
    // carbon network: dots along a connected path down to the collector
    var carbon = 'M96,232 C96,200 110,196 120,150 C126,126 150,118 190,100 C220,86 250,96 280,110 C300,120 310,150 300,186 C296,206 320,224 340,232 M190,100 C200,130 190,160 210,180 C224,196 240,210 250,232 M280,110 C320,96 350,96 370,100 C400,106 420,140 430,150 C440,170 424,200 420,232';
    var cpath = el('path', { d: carbon, fill: 'none', stroke: 'var(--cyan)', 'stroke-opacity': '.85', 'stroke-width': 1.4, 'stroke-dasharray': '1.5 3.5', 'stroke-linecap': 'round' }, g);
    // roads to one particle (the one at 300,160): electrons up the carbon from the collector, Li+ down through the pores
    var ePath = el('path', { d: 'M340,232 C320,224 296,206 300,186 L300,170', fill: 'none', stroke: 'none' }, g);
    var ionPath = el('path', { d: 'M330,44 C336,66 350,100 330,120 C318,132 310,140 304,150', fill: 'none', stroke: 'var(--cyan)', 'stroke-opacity': '.4', 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    var ef = flow(svg, ePath, { n: 4, cls: 'e-dot', r: 2.6, speed: 40, parent: g });
    var ionf = flow(svg, ionPath, { n: 1, cls: 'ion our-ion', r: 4, speed: 34, parent: g });
    var ourT = txt(g, 0, 0, 'our ion', 'amber', 'start');
    txt(g, 300, 164, 'reacts here', 'strong', 'middle');
    badge(g, 40, 90, 1); badge(g, 40, 232, 2); badge(g, 480, 50, 3); badge(g, 480, 190, 4);
    var t = 0;
    function tick(dt) { if (dt === 0) return; t += dt; ef.advance(dt); ionf.advance(dt); var c = ionf.group.querySelector('circle'); ourT.setAttribute('x', +c.getAttribute('cx') + 8); ourT.setAttribute('y', +c.getAttribute('cy') + 4); }
    ef.show(true); ionf.show(true); ef.group.classList.remove('anim-only'); ionf.group.classList.remove('anim-only');
    read.innerHTML = 'A coating, not a block: active particles (amber), a network of conductive carbon (teal dots) that reaches every particle from the foil, a polymer binder (short teal strands) holding it all together, and pores, about 30 % of the volume, filled with electrolyte (cyan).';
    steps(fig, [
      { text: 'The <b>active particles</b> (amber) are the material that stores the lithium. They are irregular grains, not a solid slab.' },
      { text: 'The <b>carbon network</b> (teal dots) links every particle to the collector: the electron road. Electrons arrive along it from the foil.' },
      { text: 'The <b>pores</b> (cyan, about 30 % of the volume) are filled with electrolyte: the ion road. Our ion comes in from the separator side and reaches the same particle.' },
      { text: 'The <b>binder</b> (short teal strands) holds the mixture together and bonds it to the foil. A particle can react only where both roads reach it; module 8 returns to what happens where one of them does not.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.3 });
    bind(fig, loop);
  });

  /* ===== 2.4 Nominal voltages of common systems ===== */
  register('f2-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), info = fig.querySelector('.part-info'), data = P.data.nominal;
    var xN = 168, xB = 178, sc = 62, rowH = 22, y = 40;
    txt(g, 20, 22, 'nominal cell voltage, V (Winter and Brodd 2004, Table 2)', 'strong');
    [1, 2, 3, 4].forEach(function (v) { var x = xB + v * sc; el('line', { x1: x, y1: 30, x2: x, y2: 284, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); txt(g, x, 298, v + ' V', '', 'middle'); });
    var groups = [['primary (single use)', 'primary'], ['rechargeable', 'rechargeable']];
    var rows = [];
    groups.forEach(function (grp) {
      txt(g, 20, y + 12, grp[0], grp[1] === 'primary' ? 'cyan' : 'amber'); y += rowH;
      data.filter(function (d) { return d.kind === grp[1]; }).forEach(function (d) {
        var r = el('g', { 'class': 'bar', tabindex: '0', role: 'button', 'aria-label': d.name + ', ' + d.V + ' volts' }, g);
        el('rect', { x: xB, y: y + 3, width: d.V * sc, height: rowH - 8, rx: 3, fill: d.kind === 'primary' ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': d.kind === 'primary' ? '.6' : '.85' }, r);
        txt(r, xN, y + 14, d.name, '', 'end'); txt(r, xB + d.V * sc + 6, y + 14, d.V.toFixed(1), 'strong');
        var aq = /^aq/.test(d.electrolyte);
        el('circle', { cx: xB + d.V * sc + 34, cy: y + 10, r: 4, fill: aq ? 'var(--cyan)' : 'var(--cation)', 'fill-opacity': aq ? '.5' : '.9' }, r);
        rows.push({ d: d, g: r, y: y });
        function show() { info.innerHTML = '<b>' + d.name + ', ' + d.V.toFixed(1) + ' V nominal.</b> Negative electrode: ' + d.anode + '. Positive electrode: ' + d.cathode + '. Electrolyte: ' + d.electrolyte + '.' + (d.name === 'Lithium-ion' ? ' On the ladder of module 3 this is graphite at about 0.2 V and LiCoO₂ at about 4.0 V versus lithium; the gap between the rungs is this bar.' : ''); }
        on(r, 'mouseenter', show); on(r, 'focus', show); on(r, 'click', show);
        y += rowH;
      });
      y += 6;
    });
    txt(g, 20, 318, '● cyan dot: water-based electrolyte   ● amber dot: nonaqueous, lithium-based', '');
    badge(g, 500, 74, 1); badge(g, 500, 212, 2); badge(g, 500, 140, 3);
    info.innerHTML = 'Hover or tap a bar to see what is inside.';
    steps(fig, [
      { text: 'The <b>primary</b> systems: zinc with manganese dioxide in the 1.5 V cells of a torch, zinc-air at 1.2 V, and the lithium cells of cameras at 3.0 V.' },
      { text: 'The <b>rechargeable</b> systems: lead-acid at 2.0 V, the nickel cells at 1.2 V, and lithium-ion at 4.0 V. Different chemistry, different voltage; the size of the cell changes nothing here.' },
      { text: 'Look at the dots. Every system with a <b>water-based</b> electrolyte sits at or below 2 V; every system above 2 V uses lithium and a nonaqueous electrolyte. Module 3 explains both facts.' }
    ]);
  });
