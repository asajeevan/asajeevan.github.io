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
    el('circle', { cx: 56, cy: 60, r: 30, fill: MB('steel'), stroke: '#8B95A0', filter: 'url(#fx-lift)' }, g); el('circle', { cx: 56, cy: 60, r: 24, fill: 'none', stroke: '#9AA3AD' }, g);
    txt(g, 56, 64, '−', 'strong big', 'middle'); txt(g, 56, 106, 'top view: cap (−)', '', 'middle'); txt(g, 56, 120, '20 mm across', '', 'middle');
    txt(g, cx + 30, 24, 'a coin cell in cross-section, pulled apart (not to scale)', 'strong', 'middle');
    // layers, from the bottom up; y = resting position, h = thickness, k = explode order
    var layers = [
      { key: 'can', name: 'Can, aluminium-coated (+ terminal)', y: 216, h: 14, w: W, fill: MV('steel'), desc: 'Stainless-steel can with an aluminium coating on the inside: the container and the positive terminal. The positive electrode sits directly on it.' },
      { key: 'pos', name: 'Positive electrode', y: 202, h: 14, w: 200, fill: M('lco'), desc: 'A coating of the positive active material (LiCoO₂ in the first commercial cell, a nickel-rich oxide in today’s research cells) on an aluminium surface. On discharge it takes the electrons: the electron acceptor.' },
      { key: 'sep', name: 'Separator, soaked with electrolyte', y: 194, h: 8, w: 230, fill: M('separator'), desc: 'A porous polymer film, two layers of it in this design, full of electrolyte: permeable to ions, inert, and a physical barrier that prevents electrical shorting. If the electrodes touched, the full stored energy would be released as heat inside the cell (their section 2.2).' },
      { key: 'neg', name: 'Negative electrode', y: 180, h: 14, w: 200, fill: M('graphite'), desc: 'Graphite coated on copper foil, as in the first commercial lithium-ion cell. On discharge it gives up electrons: the reducing agent.' },
      { key: 'spacer', name: 'Spacer, stainless steel', y: 168, h: 12, w: 220, fill: MV('steel'), desc: 'A steel disc that fills the height so that the stack is pressed evenly.' },
      { key: 'spring', name: 'Spring, stainless steel', y: 152, h: 18, w: 140, fill: 'none', desc: 'A wave spring that presses the stack together so every layer stays in contact. Dropping the spring and spacer in from an angle misaligns the electrodes and can cost a fifth of the capacity in 100 cycles; placing them from directly above with a vacuum pen fixes it.' },
      { key: 'cap', name: 'Cap and gasket (− terminal)', y: 136, h: 14, w: W, fill: MV('steel'), desc: 'Stainless-steel cap, the negative terminal, crimped onto the can with a polymer gasket between them: the gasket seals the cell and keeps the two terminals from touching.' }
    ];
    var groups = {};
    layers.forEach(function (L, i) {
      var grp = el('g', { 'class': 'layer', 'data-part': L.key, tabindex: '0', role: 'button', 'aria-label': L.name }, g);
      var lx = cx - L.w / 2;
      if (L.key === 'can') { el('path', { 'class': 'shape', d: 'M' + x0 + ',' + (L.y - 60) + ' V' + (L.y + L.h - 6) + ' q0,6 6,6 H' + (x1 - 6) + ' q6,0 6,-6 V' + (L.y - 60) + ' h-8 V' + (L.y - 2) + ' H' + (x0 + 8) + ' V' + (L.y - 60) + ' Z', fill: L.fill, stroke: 'var(--line-2)' }, grp); el('rect', { x: x0 + 8, y: L.y - 2, width: W - 16, height: 3, fill: '#B4BDC6' }, grp); }
      else if (L.key === 'cap') { el('path', { 'class': 'shape', d: 'M' + (x0 + 14) + ',' + (L.y + 46) + ' V' + (L.y + 6) + ' q0,-6 6,-6 H' + (x1 - 20) + ' q6,0 6,6 V' + (L.y + 46) + ' h-8 V' + (L.y + 10) + ' H' + (x0 + 22) + ' V' + (L.y + 46) + ' Z', fill: L.fill, stroke: 'var(--line-2)' }, grp); el('rect', { x: x0 + 8, y: L.y + 12, width: 8, height: 40, rx: 2, fill: '#2B2E33' }, grp); el('rect', { x: x1 - 16, y: L.y + 12, width: 8, height: 40, rx: 2, fill: '#2B2E33' }, grp); }
      else if (L.key === 'spring') { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, fill: 'transparent', stroke: 'transparent' }, grp); el('path', { d: 'M' + lx + ',' + (L.y + L.h - 2) + ' l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14 l14,-14 l14,14', fill: 'none', stroke: '#9fb1b6', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, grp); }
      else if (L.key === 'sep') { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, rx: 2, fill: L.fill, stroke: '#C4C8BF' }, grp); for (var k = 0; k < 26; k++) el('circle', { cx: lx + 6 + k * 8.8, cy: L.y + 4, r: 1.6, fill: '#A9CBE0' }, grp); }
      else { el('rect', { 'class': 'shape', x: lx, y: L.y, width: L.w, height: L.h, rx: 2, fill: L.fill, stroke: 'var(--line-2)' }, grp);
        if (L.key === 'neg') { el('rect', { x: lx, y: L.y, width: L.w, height: 3, fill: MV('copper') }, grp); for (var q = 0; q < 12; q++) el('circle', { cx: lx + 10 + q * 17, cy: L.y + 9, r: 1.8, fill: '#A9CBE0' }, grp); }
        if (L.key === 'pos') { el('rect', { x: lx, y: L.y + L.h - 3, width: L.w, height: 3, fill: MV('alu') }, grp); for (var q2 = 0; q2 < 12; q2++) el('circle', { cx: lx + 10 + q2 * 17, cy: L.y + 6, r: 1.8, fill: '#A9CBE0' }, grp); }
      }
      var shortName = { can: 'can (+)', pos: 'positive electrode', sep: 'separator', neg: 'negative electrode', spacer: 'spacer', spring: 'spring', cap: 'cap (−)' }[L.key];
      var lab = txt(grp, x1 + 10, L.y + (L.key === 'cap' ? 26 : L.key === 'can' ? 8 : L.key === 'spring' ? L.h / 2 + 10 : L.h / 2 + 4), shortName, '');
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
      { text: 'The <b>electrolyte</b> is a liquid: drops of 1 M LiPF₆ in a carbonate solvent, about 38 mg in a research coin cell, soak the separator and fill the pores of both electrodes (pale blue dots). It is the ion road of {{ch:galvanic-cells}}.', on: function () { pick(layers[2]); } },
      { text: 'The <b>spacer</b> and <b>spring</b> press the stack so every layer touches the next; a stack placed slightly askew loses capacity to lithium plating at the uncovered edge.', on: function () { pick(layers[5]); } },
      { text: 'The <b>can</b> is the + terminal and the <b>cap</b> the − terminal; the gasket between them seals the cell and keeps them apart. The whole cell voltage appears between these two pieces of steel.', on: function () { pick(layers[6]); } },
      { text: 'The strip from {{ch:galvanic-cells}}, now in the coin cell: the potential jumps at the two electrode|electrolyte boundaries and is flat through the soaked separator at open circuit. The can sits V above the cap.' }
    ]);
    explode(+range.value / 100); pick(layers[3]);
  });

  /* ===== 2.2 The jelly roll: a flat stack wound into a cylinder ===== */
  register('f2-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), wind = fig.querySelector('.wind'), read = fig.querySelector('.readout');
    var cols = [MC('copper'), '#4A4F57', '#D5D9D0', '#23272D', MC('alu')], widths = [3, 8, 4, 8, 3], names = ['copper foil (collector)', 'graphite', 'separator + electrolyte', 'LiCoO₂', 'aluminium foil (collector)'];
    var N = 200, turns = 2.2, xL = 40, xR = 330, yMid = 150, L = xR - xL, pitch = 2.2;
    var offs = [-13, -7, 0, 7, 13];
    var body = el('g', {}, g);
    var paths = cols.map(function (c, i) { return el('path', { fill: 'none', stroke: c, 'stroke-width': widths[i], 'stroke-linecap': 'round', 'class': 'spiral' }, body); });
    var labG = el('g', {}, g);
    var labY = [70, 100, 200, 230, 260];
    var labs = names.map(function (n, i) { var y = labY[i]; el('line', { x1: 120 + i * 40, y1: yMid + offs[i], x2: 120 + i * 40, y2: y + (y < yMid ? 4 : -12), stroke: 'var(--line-2)' }, labG); return txt(labG, 120 + i * 40, y, n, '', 'middle'); });
    var dimA = el('g', {}, g); arrow(dimA, xL, 40, xR, 40, 'var(--muted)', 1.2); arrow(dimA, xR, 40, xL, 40, 'var(--muted)', 1.2); txt(dimA, (xL + xR) / 2, 30, 'large area: the whole strip faces the other electrode', '', 'middle');
    var dimT = el('g', {}, g); el('path', { d: 'M' + (xR + 10) + ',' + (yMid - 3) + ' h6 v6 h-6', fill: 'none', stroke: 'var(--second)' }, dimT); txt(dimT, xR + 22, yMid + 4, 'thin electrolyte', 'cyan');
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
    var dir = 1, pos = 0;
    on(wind, 'input', function () { pos = +wind.value; });
    var loop = anim(fig, function (dt) { if (dt === 0) return; pos += dir * dt * 28; if (pos >= 100) { pos = 100; dir = -1; } if (pos <= 0) { pos = 0; dir = 1; } wind.value = String(Math.round(pos)); render(); }, { autoplay: false, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 2.3 Inside a composite electrode ===== */
  register('f2-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 60, x1 = 460, yTop = 40, yCol = 232;
    el('rect', { x: x0, y: yTop, width: x1 - x0, height: yCol - yTop, fill: MV('electrolyte'), stroke: '#B7CCDA' }, g); // pores: electrolyte
    el('rect', { x: x0, y: yCol, width: x1 - x0, height: 12, fill: MV('alu'), stroke: '#9CA4AD', 'stroke-width': .6 }, g); txt(g, 260, yCol + 26, 'current collector (aluminium foil)', '', 'middle');
    txt(g, 260, yTop - 24, 'separator side: Li⁺ arrive from here', 'cyan', 'middle');
    // particles: irregular polygons
    var parts = [[110, 90], [190, 70], [280, 84], [370, 72], [430, 120], [120, 170], [210, 150], [300, 160], [390, 168], [160, 214], [250, 212], [340, 218], [420, 212]];
    var pg = el('g', { fill: MB('lco'), stroke: '#15181B', 'stroke-opacity': '.6', filter: 'url(#fx-lift)' }, g);
    parts.forEach(function (c, i) { var d = '', n = 7, R = 24 + (i % 3) * 4; for (var k = 0; k < n; k++) { var a = k / n * 2 * Math.PI + i, r = R * (0.8 + 0.25 * Math.sin(3 * a + i)); d += (k ? ' L' : 'M') + (c[0] + r * Math.cos(a)).toFixed(1) + ',' + (c[1] + r * Math.sin(a)).toFixed(1); } el('path', { d: d + ' Z' }, pg); });
    // binder: short polymer strands at contacts
    var bg = el('g', { fill: 'none', stroke: '#A9A497', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g);
    [[150, 96], [236, 80], [326, 78], [398, 96], [166, 190], [256, 186], [346, 190], [126, 130], [210, 112], [296, 122], [380, 120], [206, 232], [296, 232], [384, 232]].forEach(function (p) { el('path', { d: 'M' + (p[0] - 8) + ',' + p[1] + ' q4,-6 8,0 t8,0' }, bg); });
    // carbon network: dots along a connected path down to the collector
    var carbon = 'M96,232 C96,200 110,196 120,150 C126,126 150,118 190,100 C220,86 250,96 280,110 C300,120 310,150 300,186 C296,206 320,224 340,232 M190,100 C200,130 190,160 210,180 C224,196 240,210 250,232 M280,110 C320,96 350,96 370,100 C400,106 420,140 430,150 C440,170 424,200 420,232';
    var cpath = el('path', { d: carbon, fill: 'none', stroke: MC('carbon'), 'stroke-width': 3.6, 'stroke-dasharray': '0.1 4.6', 'stroke-linecap': 'round' }, g);
    // roads to one particle (the one at 300,160): electrons up the carbon from the collector, Li+ down through the pores
    var ePath = el('path', { d: 'M340,232 C320,224 296,206 300,186 L300,170', fill: 'none', stroke: 'none' }, g);
    var ionPath = el('path', { d: 'M330,44 C336,66 350,100 330,120 C318,132 310,140 304,150', fill: 'none', stroke: 'var(--second)', 'stroke-opacity': '.4', 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
    var ef = flow(svg, ePath, { n: 4, cls: 'e-dot', r: 2.6, speed: 40, parent: g });
    var ionf = flow(svg, ionPath, { n: 1, cls: 'ion our-ion', r: 4, speed: 34, parent: g });
    var ourT = txt(g, 0, 0, 'our ion', 'amber', 'start');
    txt(g, 300, 164, 'reacts here', 'strong tag', 'middle');
    badge(g, 40, 90, 1); badge(g, 40, 232, 2); badge(g, 480, 50, 3); badge(g, 480, 190, 4);
    var t = 0;
    function tick(dt) { if (dt === 0) return; t += dt; ef.advance(dt); ionf.advance(dt); var c = ionf.group.querySelector('circle'); ourT.setAttribute('x', +c.getAttribute('cx') + 8); ourT.setAttribute('y', +c.getAttribute('cy') + 4); }
    ef.show(true); ionf.show(true); ef.group.classList.remove('anim-only'); ionf.group.classList.remove('anim-only');
    read.innerHTML = 'A coating, not a block: active particles (dark grey), a network of conductive carbon (black dots) that reaches every particle from the foil, a polymer binder (short pale strands) holding it all together, and pores, about 30 % of the volume, filled with electrolyte (pale blue).';
    steps(fig, [
      { text: 'The <b>active particles</b> (dark grey) are the material that stores the lithium. They are irregular grains, not a solid slab.' },
      { text: 'The <b>carbon network</b> (black dots) links every particle to the collector: the electron road. Electrons arrive along it from the foil.' },
      { text: 'The <b>pores</b> (pale blue, about 30 % of the volume) are filled with electrolyte: the ion road. Our ion comes in from the separator side and reaches the same particle.' },
      { text: 'The <b>binder</b> (short pale strands) holds the mixture together and bonds it to the foil. A particle can react only where both roads reach it; a later module returns to what happens where one of them does not.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.3 });
    bind(fig, loop);
  });

  /* ===== 2.4 Nominal voltages of common systems ===== */
  register('f2-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), info = fig.querySelector('.part-info'), data = P.data.nominal;
    var xN = 168, xB = 178, sc = 62, rowH = 22, y = 40;
    txt(g, 20, 22, 'nominal cell voltage, V', 'strong');
    [1, 2, 3, 4].forEach(function (v) { var x = xB + v * sc; el('line', { x1: x, y1: 30, x2: x, y2: 284, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); txt(g, x, 298, v + ' V', '', 'middle'); });
    var groups = [['primary (single use)', 'primary'], ['rechargeable', 'rechargeable']];
    var rows = [];
    groups.forEach(function (grp) {
      txt(g, 20, y + 12, grp[0], grp[1] === 'primary' ? 'cyan' : 'amber'); y += rowH;
      data.filter(function (d) { return d.kind === grp[1]; }).forEach(function (d) {
        var r = el('g', { 'class': 'bar', tabindex: '0', role: 'button', 'aria-label': d.name + ', ' + d.V + ' volts' }, g);
        el('rect', { x: xB, y: y + 3, width: d.V * sc, height: rowH - 8, rx: 3, fill: d.kind === 'primary' ? 'var(--second)' : 'var(--accent)', 'fill-opacity': d.kind === 'primary' ? '.6' : '.85' }, r);
        txt(r, xN, y + 14, d.name, '', 'end'); txt(r, xB + d.V * sc + 6, y + 14, d.V.toFixed(1), 'strong');
        var aq = /^aq/.test(d.electrolyte);
        el('circle', { cx: xB + d.V * sc + 34, cy: y + 10, r: 4, fill: aq ? 'var(--second)' : 'var(--cation)', 'fill-opacity': aq ? '.5' : '.9' }, r);
        rows.push({ d: d, g: r, y: y });
        function show() { info.innerHTML = '<b>' + d.name + ', ' + d.V.toFixed(1) + ' V nominal.</b> Negative electrode: ' + d.anode + '. Positive electrode: ' + d.cathode + '. Electrolyte: ' + d.electrolyte + '.' + (d.name === 'Lithium-ion' ? ' On the ladder of {{ch:cell-voltage}} this is graphite at about 0.2 V and LiCoO₂ at about 4.0 V versus lithium; the gap between the rungs is this bar.' : ''); }
        on(r, 'mouseenter', show); on(r, 'focus', show); on(r, 'click', show);
        y += rowH;
      });
      y += 6;
    });
    txt(g, 20, 318, '● green dot: water-based electrolyte   ● blue dot: nonaqueous, lithium-based', '');
    badge(g, 500, 74, 1); badge(g, 500, 212, 2); badge(g, 500, 140, 3);
    info.innerHTML = 'Hover or tap a bar to see what is inside.';
    steps(fig, [
      { text: 'The <b>primary</b> systems: zinc with manganese dioxide in the 1.5 V cells of a torch, zinc-air at 1.2 V, and the lithium cells of cameras at 3.0 V.' },
      { text: 'The <b>rechargeable</b> systems: lead-acid at 2.0 V, the nickel cells at 1.2 V, and lithium-ion at 4.0 V. Different chemistry, different voltage; the size of the cell changes nothing here.' },
      { text: 'Look at the dots. Every system with a <b>water-based</b> electrolyte sits at or below 2 V; every system above 2 V uses lithium and a nonaqueous electrolyte. {{Ch:cell-voltage}} explains both facts.' }
    ]);
  });

  /* ===== 2.5 Four formats and their names (Arote 2022, B3, section 1.7; vibration after Faruque et al. 2026, R82) ===== */
  register('f2-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), fb = fig.querySelectorAll('button[data-fmt]');
    var cells = el('g', {}, g), dec = el('g', {}, g), rings = {};
    var X = { coin: 70, cyl: 190, prism: 320, pouch: 448 }, base = 146;
    function ring(k, x, w, h) { rings[k] = el('rect', { x: x - w / 2 - 8, y: base - h - 14, width: w + 16, height: h + 22, rx: 8, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-opacity': 0 }, cells); }
    // coin: top view and a thin side view
    (function () {
      var x = X.coin, r = 34, cy = base - 58;
      ring('coin', x, 76, 104);
      el('circle', { cx: x, cy: cy, r: r, fill: MB('steel'), stroke: '#8B95A0', filter: 'url(#fx-lift)' }, cells);
      el('circle', { cx: x, cy: cy, r: r - 6, fill: 'none', stroke: '#8B95A0', 'stroke-width': .8 }, cells);
      txt(cells, x, cy + 5, '+', 'strong', 'middle');
      el('rect', { x: x - r, y: base - 12, width: 2 * r, height: 6, rx: 2, fill: MV('steel'), stroke: '#8B95A0', 'stroke-width': .6 }, cells);
      el('rect', { x: x - r + 3, y: base - 15, width: 2 * r - 6, height: 3, rx: 1, fill: '#2B2E33' }, cells);
    })();
    // cylindrical: steel can with printed wrap
    ring('cyl', X.cyl, 40, 112); cellCan(cells, X.cyl - 20, base - 104, 40, 104);
    // prismatic: aluminium case, two terminals and a vent
    (function () {
      var x = X.prism, w = 74, h = 96, y = base - h;
      ring('prism', x, w, h + 8);
      el('rect', { x: x - w / 2, y: y, width: w, height: h, rx: 4, fill: M('alu'), stroke: '#A6AEB7', filter: 'url(#fx-lift)' }, cells);
      el('rect', { x: x - w / 2 + 6, y: y + 4, width: 6, height: h - 8, rx: 3, fill: '#fff', opacity: .35 }, cells);
      el('rect', { x: x - 26, y: y - 7, width: 12, height: 7, rx: 1.5, fill: M('alu'), stroke: '#A6AEB7' }, cells);
      el('rect', { x: x + 14, y: y - 7, width: 12, height: 7, rx: 1.5, fill: M('copper'), stroke: '#8F4F26' }, cells);
      el('ellipse', { cx: x, cy: y + 10, rx: 7, ry: 4, fill: '#C7CDD3', stroke: '#8B95A0', 'stroke-width': .8 }, cells);
    })();
    // pouch: silvery laminate, sealed rim, two tabs
    (function () {
      var x = X.pouch, w = 76, h = 92, y = base - h;
      ring('pouch', x, w, h + 12);
      el('rect', { x: x - w / 2, y: y, width: w, height: h, rx: 3, fill: MV('alu'), stroke: '#A6AEB7', filter: 'url(#fx-lift)' }, cells);
      el('rect', { x: x - w / 2 + 6, y: y + 6, width: w - 12, height: h - 12, rx: 3, fill: M('alu'), stroke: '#B9C0C7', 'stroke-width': .8 }, cells);
      el('rect', { x: x - 24, y: y - 12, width: 12, height: 14, fill: M('alu'), stroke: '#A6AEB7', 'stroke-width': .6 }, cells);
      el('rect', { x: x + 12, y: y - 12, width: 12, height: 14, fill: M('copper'), stroke: '#8F4F26', 'stroke-width': .6 }, cells);
    })();
    [['coin', 'coin'], ['cyl', 'cylindrical'], ['prism', 'prismatic'], ['pouch', 'pouch']].forEach(function (k) { txt(cells, X[k[0]], base + 18, k[1], 'strong', 'middle'); });
    el('line', { x1: 16, x2: 504, y1: base + 30, y2: base + 30, stroke: 'var(--line-2)' }, g);
    var INFO = {
      coin: { code: [['C', 'a lithium', 'chemistry'], ['R', 'round', ''], ['20', '20 mm', 'across'], ['25', '2.5 mm', 'high']], t: '<b>Coin cell.</b> A flat stainless-steel case, wider than it is high, with a gasket, a cap, a spacer plate and a spring; in the laboratory its negative electrode is often lithium foil. Its name is standardized by the IEC: CR2025 is the most common design at laboratory scale.' },
      cyl: { note: ['18650, 21700, 26650 …', 'five digits that give the size'], t: '<b>Cylindrical cell.</b> Electrodes and separator wound in a spiral inside a cylindrical case: good cycling stability, but round cells pack less densely. A 2026 review reports cylindrical 18650 cells as particularly susceptible to damage by vibration.' },
      prism: { code: [['50', '5.0 mm', 'thick'], ['40', '40 mm', 'wide'], ['50', '50 mm', 'long']], t: '<b>Prismatic cell.</b> Large stacked sheets in a rectangular case of aluminium, steel or semi-hard plastic, usually with a vent; suits uses where swelling matters. Its six digits give the thickness in tenths of a millimetre, then the width and the length in millimetres.' },
      pouch: { note: ['stacked layers in a sealed, flexible foil', 'light and cheap to make'], t: '<b>Pouch cell.</b> Electrodes and separator stacked, not wound, in a sealed, soft, flat case; tabs welded to the current collectors, aluminium on the positive side and copper on the negative, carry the current out. Pouch and prismatic cells are reported as more tolerant of vibration when tightly packed.' }
    };
    var mode = 'coin';
    function render() {
      Array.prototype.forEach.call(fb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-fmt') === mode)); });
      Object.keys(rings).forEach(function (k) { rings[k].setAttribute('stroke-opacity', k === mode ? 1 : 0); });
      clear(dec); var I = INFO[mode], y = base + 58;
      if (I.code) {
        var bw = 58, gap = 34, n = I.code.length, tot = n * bw + (n - 1) * gap, xs = 260 - tot / 2;
        txt(dec, 260, y - 14, mode === 'coin' ? 'reading the name CR2025' : 'reading the name 504050', 'strong', 'middle');
        I.code.forEach(function (c, j) {
          var x = xs + j * (bw + gap);
          el('rect', { x: x, y: y, width: bw, height: 30, rx: 6, fill: 'var(--panel-2)', stroke: 'var(--accent)' }, dec);
          txt(dec, x + bw / 2, y + 20, c[0], 'strong big', 'middle');
          txt(dec, x + bw / 2, y + 48, c[1], 'amber', 'middle'); if (c[2]) txt(dec, x + bw / 2, y + 63, c[2], '', 'middle');
        });
      } else {
        txt(dec, 260, y + 14, I.note[0], 'strong', 'middle'); txt(dec, 260, y + 34, I.note[1], '', 'middle');
      }
      read.innerHTML = I.t;
    }
    Array.prototype.forEach.call(fb, function (b) { on(b, 'click', function () { mode = b.getAttribute('data-fmt'); render(); }); });
    badge(g, 18, 120, 1); badge(g, X.prism + 50, 24, 2); badge(g, 500, base + 46, 3);
    steps(fig, [
      { text: 'The same layers in four shapes. A <b>coin cell</b> is the laboratory’s format: CR2025, the most common, is read as C (a lithium chemistry), R (round), 20 mm across, 2.5 mm high.' },
      { text: '<b>Wound or stacked.</b> Cylindrical cells wind the layers into a spiral; prismatic and pouch cells stack them, in a rigid case or a flexible foil.' },
      { text: 'Some names are <b>sizes</b>: six digits for a prismatic cell (504050: 5.0 by 40 by 50 mm), five for a cylindrical one. Choose a format to read it.' }
    ]);
    render();
  });

  /* f2-7: the layers of a lithium-ion cell, pulled apart, and what each can be made of */
  register('f2-7', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var y0 = 52, h = 196, sel = 'pos', parts = {};
    var CC = { items: ['foil, mesh or foam,', '+etched or coated'], next: 'next: MXene (titanium carbide)' };
    var D = {
      al: { name: 'positive current collector', x: 26, w: 8, mat: 'alu', lab: 'Al foil', row: 0,
        items: ['aluminium'].concat(CC.items), next: CC.next,
        t: '<b>Current collectors</b> carry the electrons between the coating and the terminals: aluminium on the positive side, copper on the negative, as foil, mesh or foam, etched or coated. Titanium carbide (MXene) collectors, lighter, cheaper and flexible, are one hope for the next generation.' },
      pos: { name: 'positive electrode', x: 46, w: 50, mat: 'lco', lab: 'positive', row: 1,
        items: ['LiCoO₂, lithium cobalt oxide (LCO)', 'LiMn₂O₄, spinel (LMO)', 'LiFePO₄, lithium iron phosphate (LFP)', 'LiNiMnCoO₂ (NMC)', 'LiNi₀.₈Co₀.₁₅Al₀.₀₅O₂ (NCA)', 'layered dichalcogenides'], next: 'next: layered lithium-rich oxides',
        t: 'The <b>positive electrode</b> is a lithium metal oxide or phosphate coated on aluminium foil; it must have sites that take lithium in and give it back reversibly. The common choices are listed; {{ch:positive-electrodes}} compares them. Layered lithium-rich oxides are one route to more capacity.' },
      sep: { name: 'separator', x: 108, w: 16, mat: 'separator', lab: 'separator', row: 0,
        items: ['microporous polypropylene', '+or polyethylene', 'non-woven fabric mats', 'ceramic-based materials', 'PVDF-HFP, PVDF-CTFE, PVDF-TFE'],
        t: 'The <b>separator</b> keeps the electrodes apart and lets only the working ion through. It is a microporous polypropylene or polyethylene membrane, a non-woven mat or a ceramic-based material; copolymers of vinylidene fluoride, PVDF-HFP, PVDF-CTFE and PVDF-TFE, are also used.' },
      neg: { name: 'negative electrode', x: 136, w: 50, mat: 'graphite', lab: 'negative', row: 1,
        items: ['graphitic and non-graphitic carbon', 'silicon-based alloys', 'tin alloys: Cu₆Sn₅, Ni₃Sn₂,', '+Co₃Sn₂ and Sn-Ag', 'titanium oxides: Li₄Ti₅O₁₂, TiO₂'], next: 'next: silicon-based electrodes',
        t: 'The <b>negative electrode</b> is usually carbon or graphite coated on copper foil. Alloys of silicon and tin and the titanium oxides are the alternatives; {{ch:negative-electrodes}} weighs them. Silicon-based electrodes are one of the hopes for the next generation.' },
      cu: { name: 'negative current collector', x: 198, w: 8, mat: 'copper', lab: 'Cu foil', row: 0,
        items: ['copper'].concat(CC.items), next: CC.next,
        t: '<b>Current collectors</b> carry the electrons between the coating and the terminals: copper on the negative side, aluminium on the positive, as foil, mesh or foam, etched or coated. Titanium carbide (MXene) collectors, lighter, cheaper and flexible, are one hope for the next generation.' },
      ely: { name: 'electrolyte', lab: 'electrolyte', row: -1,
        items: ['salt: LiPF₆, LiBF₄, LiClO₄ or LiAsF₆', 'solvents: PC, EC, DMC, DEC, EMC', 'gel: PEO, PAN, PVDF or PMMA'], next: 'next: more stable, more conductive',
        t: 'The <b>electrolyte</b> fills the pores and the separator: a lithium salt, LiPF₆, LiBF₄, LiClO₄ or LiAsF₆, in a mixture of carbonate solvents, PC, EC, DMC, DEC and EMC. A lithium polymer cell uses a gel instead, with PEO, PAN, PVDF or PMMA. It carries ions and blocks electrons ({{ch:liquid-electrolytes}}).' }
    };
    // electrolyte: the liquid that fills the pores, drawn behind the three middle layers
    var eg = el('g', { tabindex: 0, role: 'button', 'aria-label': 'electrolyte', style: 'cursor:pointer' }, g);
    parts.ely = el('rect', { x: 40, y: y0 - 14, width: 152, height: h + 28, rx: 8, fill: MV('electrolyte'), stroke: '#9FB3C2', 'stroke-width': 1.4 }, eg);
    txt(eg, 116, y0 - 22, 'electrolyte', 'strong', 'middle');
    pressable(eg, function () { sel = 'ely'; place(); });
    ['al', 'pos', 'sep', 'neg', 'cu'].forEach(function (k) {
      var d = D[k], grp = el('g', { tabindex: 0, role: 'button', 'aria-label': d.name, style: 'cursor:pointer' }, g);
      el('rect', { x: d.x, y: y0, width: d.w, height: h, rx: 2, fill: M(d.mat), stroke: 'rgba(16,24,40,.3)', 'stroke-width': .7, filter: 'url(#fx-lift)' }, grp);
      if (k === 'pos' || k === 'neg') { // a hint of particles in the coating
        for (var i = 0; i < 9; i++) el('circle', { cx: d.x + 10 + (i % 3) * 15, cy: y0 + 24 + Math.floor(i / 3) * 64 + (i % 2) * 14, r: 5.5, fill: MB(d.mat), opacity: .9 }, grp);
      }
      if (k === 'sep') for (var j = 0; j < 14; j++) el('circle', { cx: d.x + 5 + (j % 2) * 6, cy: y0 + 10 + j * 13.5, r: 1.6, fill: MC('electrolyte'), stroke: '#9FB3C2', 'stroke-width': .4 }, grp);
      parts[k] = el('rect', { x: d.x - 3, y: y0 - 3, width: d.w + 6, height: h + 6, rx: 4, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2, 'stroke-opacity': 0 }, grp);
      txt(grp, d.x + d.w / 2, y0 + h + (d.row ? 44 : 28), d.lab, '', 'middle');
      pressable(grp, function () { sel = k; place(); });
    });
    txt(g, 30, y0 + h + 62, '+', 'strong big', 'middle'); txt(g, 202, y0 + h + 62, '−', 'strong big', 'middle');
    el('line', { x1: 238, x2: 238, y1: 26, y2: 314, stroke: 'var(--line-2)' }, g);
    var panel = el('g', {}, g);
    function place() {
      Object.keys(parts).forEach(function (k) {
        if (k === 'ely') { parts.ely.setAttribute('stroke', sel === 'ely' ? 'var(--accent)' : '#9FB3C2'); parts.ely.setAttribute('stroke-width', sel === 'ely' ? 2.6 : 1.4); }
        else parts[k].setAttribute('stroke-opacity', k === sel ? 1 : 0);
      });
      var d = D[sel], y = 44; clear(panel);
      txt(panel, 252, y, d.name, 'strong big', 'start'); y += 26;
      d.items.forEach(function (it) { var c = it.charAt(0) === '+'; if (c) { it = it.slice(1); y -= 5; } else el('circle', { cx: 256, cy: y - 4, r: 2.4, fill: 'var(--accent)' }, panel); txt(panel, 264, y, it, '', 'start'); y += 22; });
      if (d.next) { y += 6; txt(panel, 252, y, d.next, 'cyan', 'start'); }
      read.innerHTML = d.t;
    }
    badge(g, 22, y0 - 26, 1); badge(g, 222, y0 - 26, 2); badge(g, 224, y0 + h / 2 + 40, 3);
    steps(fig, [
      { text: 'The two <b>electrodes</b>: a lithium metal oxide or phosphate on aluminium, carbon on copper. Tap either to see the materials in use.', on: function () { sel = 'pos'; place(); } },
      { text: 'Between them, the <b>electrolyte</b> and the <b>separator</b>: a salt in carbonate solvents, held in a porous polymer membrane.', on: function () { sel = 'ely'; place(); } },
      { text: 'The <b>current collectors</b> carry the electrons out. Each list ends with one of the textbook&#8217;s hopes for the next generation.', on: function () { sel = 'cu'; place(); } }
    ]);
  });
