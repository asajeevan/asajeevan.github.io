  /* =================================================================
     Module 12: safety, use and end of life. Thermal runaway as defined
     by Winter and Brodd 2004 (R1) 1.2 and 1.3; safeguards after Brandt
     1994 (R46), R1 2.6 and Goodenough and Park 2013 (R6); temperature
     ranges after R1 2.6, SEI growth after von Kolzenberg et al. 2020
     (R37), plating after Fichtner et al. 2022 (R48); recycling routes
     after R48 and R1 2.5.
     ================================================================= */

  /* ===== 12.1 The runaway loop ===== */
  register('f12-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cs = fig.querySelector('.cool'), cv = fig.querySelector('.cool-val');
    var cx = 140, cy = 130, R = 78;
    var nodes = [{ a: -90, t: 'heat released' }, { a: 30, t: 'temperature rises' }, { a: 150, t: 'reactions speed up' }];
    var ring = el('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: 'var(--heat)', 'stroke-width': 3, 'stroke-dasharray': '6 6' }, g);
    nodes.forEach(function (n, i) {
      var x = cx + R * Math.cos(n.a * Math.PI / 180), y = cy + R * Math.sin(n.a * Math.PI / 180);
      el('rect', { x: x - 62, y: y - 13, width: 124, height: 26, rx: 13, fill: 'var(--panel-2)', stroke: 'var(--heat)' }, g);
      txt(g, x, y + 4, n.t, 'strong', 'middle');
    });
    var spin = el('circle', { r: 6, fill: 'var(--heat)' }, g);
    var coolA = arrow(g, cx + R + 6, cy - 10, cx + R + 52, cy - 10, 'var(--second)', 3), coolT = txt(g, cx + R + 30, cy + 14, 'heat', 'cyan', 'middle'); txt(g, cx + R + 30, cy + 28, 'removed', 'cyan', 'middle');
    // schematic temperature traces
    var x0 = 300, x1 = 500, y0 = 230, y1 = 64;
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    txt(g, x1, y0 + 16, 'time', '', 'end'); txt(g, x0 + 4, y1 - 8, 'cell temperature', '', 'start'); txt(g, x1, y1 - 8, 'schematic', '', 'end');
    var tr = el('path', { fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2.4 }, g), trT = txt(g, x1, 0, '', 'strong', 'end');
    badge(g, cx, cy - R - 26, 1); badge(g, cx + R + 30, cy - 32, 2); badge(g, x1 - 8, y1 + 14, 3);
    var ph = 0;
    function render() {
      var c = +cs.value / 100; setSvgText(cv, c < 0.27 ? 'weak' : c < 0.67 ? 'moderate' : 'strong');
      coolA.setAttribute('stroke-width', String(1 + 4 * c));
      // dT/dt = G exp(k T) - c T, integrated: a drawing device to show the two outcomes, not a cell model
      var T = 0, d = 'M' + x0 + ',' + y0, run = false, k;
      for (k = 1; k <= 120; k++) { T += 0.05 * (0.6 * Math.exp(0.9 * T) - (0.3 + 1.4 * c) * T * 2.2); if (T > 3.4) { run = true; T = 3.4; } d += ' L' + (x0 + k / 120 * (x1 - x0)).toFixed(1) + ',' + (y0 - T / 3.4 * (y0 - y1)).toFixed(1); if (run) break; }
      if (!run && (0.3 + 1.4 * c) * 2.2 < 0.54 * Math.E) run = true; // no steady state: it would still run away
      tr.setAttribute('d', d); trT.setAttribute('y', run ? y1 + 40 : y0 - T / 3.4 * (y0 - y1) - 8); setSvgText(trT, run ? 'runaway' : 'levels off');
      ring.setAttribute('stroke-opacity', run ? '1' : '.35');
      read.innerHTML = run ? 'Cooling too weak: the heat from the reactions raises the temperature faster than it can leave, the reactions speed up, and the loop feeds itself: <b>thermal runaway</b>.' : 'Cooling strong enough: heat leaves as fast as the reactions make it, and the temperature settles. The loop is there, but it does not close.';
    }
    on(cs, 'input', render);
    steps(fig, [
      { text: 'Let us start with the loop. Thermal runaway is what happens when the reaction of an electrode with the electrolyte becomes <b>self-sustaining</b>: the heat it releases speeds it up, which releases more heat. An autocatalytic loop.' },
      { text: 'What breaks the loop is <b>heat removal</b>. The heat is released inside the cell, at the electrode surfaces, so a cell meant for high currents must be built to shed it. Slide the cooling down and watch the loop close.' },
      { text: 'The curve on the right is only a drawing device with two outcomes: the temperature levels off, or it runs away. It carries no numbers, because we have none for a real cell.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph += dt * 1.6; spin.setAttribute('cx', cx + R * Math.cos(ph - Math.PI / 2)); spin.setAttribute('cy', cy + R * Math.sin(ph - Math.PI / 2)); }, { autoplay: true, stepDt: 0.4 });
    spin.setAttribute('cx', cx); spin.setAttribute('cy', cy - R);
    bind(fig, loop);
  });

  /* ===== 12.2 Layers of protection ===== */
  register('f12-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), ab = fig.querySelectorAll('button[data-abuse]');
    var layers = [
      { k: 'bms', t: 'electronics: watch every cell', s: 'stop at the voltage limits; limit the current' },
      { k: 'cid', t: 'pressure switch in the cap', s: 'cuts the charging current when the pressure rises' },
      { k: 'shut', t: 'shutdown separator', s: 'loses its porosity when it gets hot: no more ions' },
      { k: 'coat', t: 'ceramic-coated separator', s: 'Al₂O₃ coating that dendrites cannot cross' },
      { k: 'add', t: 'additives in the electrolyte', s: 'react above the working voltage to limit or cut the charge' },
      { k: 'chem', t: 'the chemistry itself', s: 'insertion electrode or polymer electrolyte: fewer dendrites' }
    ];
    var acts = {
      over: { bms: 'acts first', cid: 'backs it up', shut: 'if it heats', coat: '', add: 'can act', chem: '', txt: '<b>Overcharge.</b> The electronics are the first line: lithium cells cannot absorb overcharge, so charging is stopped at the voltage limit of every single cell. If it still goes on, the pressure-operated switch in the cap interrupts the charging current; some electrolyte additives give off gas when overcharged so as to trip it, others consume the current through a redox process or coat the positive electrode with an insulating polymer that raises its resistance.' },
      ext: { bms: 'limits current', cid: '', shut: 'acts', coat: '', add: '', chem: '', txt: '<b>Short circuit outside the cell.</b> The whole cell heats fairly evenly, which is the case a shutdown separator handles well: it closes its pores and stops the ions. The electronics also limit the current.' },
      int: { bms: 'cannot see it', cid: '', shut: 'less effective', coat: 'prevents it', add: '', chem: 'prevents it', txt: '<b>Short circuit inside the cell</b>, for instance a dendrite through the separator. The heating is local, so a shutdown separator helps much less; the electronics cannot interrupt a short that is inside. Prevention is what counts: a separator dendrites cannot cross, and an electrode that plates far less readily.' },
      over2: { bms: 'stops discharge', cid: '', shut: '', coat: '', add: '', chem: '', txt: '<b>Overdischarge.</b> Discharged down to zero volts, the negative electrode is dragged up to the potential of the positive one, about 4 V vs Li/Li⁺, where its copper current collector oxidizes and dissolves. Only the electronics prevent it, by stopping the discharge of each cell in time.' }
    };
    var y0 = 34, h = 36, rows = [];
    layers.forEach(function (L, i) {
      var y = y0 + i * (h + 5);
      var r = el('rect', { x: 20, y: y, width: 356, height: h, rx: 8, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
      txt(g, 32, y + 15, L.t, 'strong', 'start'); txt(g, 32, y + 30, L.s, '', 'start');
      var st = txt(g, 512, y + 23, '', 'amber', 'end');
      rows.push({ r: r, st: st, k: L.k });
    });
    txt(g, 20, 20, 'safeguards, from the outside in', 'strong', 'start');
    badge(g, 394, y0 + 18, 1); badge(g, 394, y0 + 18 + 2 * (h + 5), 2); badge(g, 394, y0 + 18 + 5 * (h + 5), 3);
    var mode = 'over';
    function render() {
      Array.prototype.forEach.call(ab, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-abuse') === mode)); });
      var a = acts[mode];
      rows.forEach(function (row) { var s = a[row.k]; setSvgText(row.st, s); row.r.setAttribute('stroke', s ? (/cannot|less/.test(s) ? 'var(--heat)' : 'var(--accent)') : 'var(--line-2)'); row.r.setAttribute('stroke-width', s ? 2 : 1); row.st.setAttribute('class', 'lbl ' + (/cannot|less/.test(s) ? 'heat' : 'amber')); });
      read.innerHTML = a.txt;
    }
    Array.prototype.forEach.call(ab, function (b) { on(b, 'click', function () { mode = b.getAttribute('data-abuse'); render(); }); });
    steps(fig, [
      { text: 'The outermost layer is <b>electronics</b>: in a battery of several cells in series, the voltage of every cell is watched and charge and discharge are stopped before any one of them goes over or under its limits.' },
      { text: 'Inside the cell, <b>mechanical and material safeguards</b>: a switch that opens when the pressure rises, a separator that shuts its pores when it gets hot, a ceramic coating that blocks dendrites, and additives in the electrolyte that react only when the cell is overcharged.' },
      { text: 'Innermost, the <b>chemistry</b>. Replacing lithium metal with an insertion electrode largely removed the plating that caused the internal shorts of the early cells. Try the four kinds of abuse.' }
    ]);
    render();
  });

  /* ===== 12.3 The comfort zone ===== */
  register('f12-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 60, x1 = 490, Tm = -60, TM = 100, X = function (T) { return x0 + (T - Tm) / (TM - Tm) * (x1 - x0); };
    el('line', { x1: x0, x2: x1, y1: 224, y2: 224, stroke: 'var(--line-2)' }, g);
    [-50, -20, 0, 40, 85].forEach(function (T) { el('line', { x1: X(T), x2: X(T), y1: 220, y2: 228, stroke: 'var(--line-2)' }, g); txt(g, X(T), 244, T + ' °C', '', 'middle'); });
    function band(a, b, y, col, lab) { el('rect', { x: X(a), y: y, width: X(b) - X(a), height: 22, rx: 4, fill: col, 'fill-opacity': '.35', stroke: col }, g); txt(g, X(a), y - 6, lab, 'strong', 'start'); }
    band(0, 40, 36, 'var(--accent)', 'consumer cells, in use');
    band(-20, 85, 86, 'var(--second)', 'consumer cells, in storage');
    band(-50, 85, 136, 'var(--metal)', 'military and automotive');
    txt(g, X(-50), 186, 'cold: charging fast risks lithium plating', 'cyan', 'start');
    txt(g, X(85), 206, 'warm: faster self-discharge', 'heat', 'end');
    badge(g, X(40) + 16, 47, 1); badge(g, X(85) + 16, 97, 2); badge(g, X(-50) - 16, 182, 3);
    steps(fig, [
      { text: 'Consumer cells are meant to be <b>used between about 0 and 40 °C</b>.' },
      { text: 'They can be <b>stored between −20 and 85 °C</b>; military and automotive cells must work from −50 to 85 °C.' },
      { text: 'Why the middle is kind: in the cold, a fast charge can push the graphite into <b>lithium plating</b>; in the heat, self-discharge speeds up. And at any temperature, a cell kept full and charged fast grows its SEI fastest ({{ch:degradation}}).' }
    ]);
    read.innerHTML = 'Temperature ranges for cells of around 2004; the two notes give directions only, without numbers.';
  });

  /* ===== 12.4 The recycling routes ===== */
  register('f12-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    function node(x, y, w, t, s, col) { el('rect', { x: x, y: y, width: w, height: 44, rx: 8, fill: 'var(--panel-2)', stroke: col || 'var(--line-2)' }, g); txt(g, x + w / 2, y + 18, t, 'strong', 'middle'); if (s) txt(g, x + w / 2, y + 34, s, '', 'middle'); return { x: x, y: y, w: w }; }
    var a = node(20, 20, 150, 'spent cells', 'hazardous goods'), b = node(185, 20, 150, 'pre-treatment', 'discharge, dismantle'), c = node(350, 20, 150, 'crush and sort', 'sieve, density, magnet');
    var p = node(20, 120, 150, 'pyrometallurgy', 'smelt, about 1000 °C', 'var(--heat)'), h = node(185, 120, 150, 'hydrometallurgy', 'leach in acid', 'var(--second)'), d = node(350, 120, 150, 'direct recycling', 'keep materials whole', 'var(--accent)');
    var o1 = txt(g, 95, 190, 'Cu, Ni, Co alloy', '', 'middle'), o1b = txt(g, 95, 206, 'Li, Mn to slag', 'heat', 'middle');
    txt(g, 260, 190, 'metal salts', '', 'middle'); txt(g, 260, 206, 'high recovery, many steps', '', 'middle');
    txt(g, 425, 190, 'electrode materials', '', 'middle'); txt(g, 425, 206, 'still immature', '', 'middle');
    arrow(g, 170, 42, 183, 42, 'var(--muted)', 1.6); arrow(g, 335, 42, 348, 42, 'var(--muted)', 1.6);
    [[260, 64, 95, 118], [425, 64, 260, 118], [425, 64, 425, 118]].forEach(function (r) { arrow(g, r[0], r[1], r[2], r[3], 'var(--muted)', 1.4); });
    txt(g, 260, 244, 'back into new cells', 'amber', 'middle');
    [95, 260, 425].forEach(function (x) { arrow(g, x, 212, 260, 230, 'var(--accent)', 1.2); });
    var dot = ourIon(g, 95, 42, 5, '', true);
    badge(g, 20, 14, 1); badge(g, 500, 76, 2); badge(g, 20, 114, 3); badge(g, 185, 114, 4); badge(g, 350, 114, 5);
    var route = [[95, 42], [260, 42], [425, 42], [425, 90], [260, 142], [260, 220], [260, 236]], t = 0;
    function place() { var n = route.length - 1, u = (t % 1) * n, i = Math.floor(u), f = u - i, A = route[i], B = route[Math.min(n, i + 1)]; dot.move(lerp(A[0], B[0], f), lerp(A[1], B[1], f)); }
    steps(fig, [
      { text: 'Spent lithium-ion batteries are <b>hazardous goods</b>: collecting and transporting them safely, protected against short circuits and leaks, is already a large part of the cost of recycling.' },
      { text: '<b>Pre-treatment</b> makes them safe and takes them apart: discharge through a load (or in salt water for low-voltage cells), sometimes heat at 500 to 600 °C to burn off the electrolyte and plastics, dismantle packs into modules and cells, then crush, sieve and separate by density and magnetism.' },
      { text: '<b>Pyrometallurgy</b> smelts everything at about 1000 °C. Copper, nickel and cobalt come out as an alloy; lithium, manganese and titanium end up in the slag; the electrolyte, binder and carbon burn and supply energy. Robust and simple, but energy-hungry, and the lithium goes to the slag instead of being recovered.' },
      { text: '<b>Hydrometallurgy</b> dissolves the electrode materials in acid and separates the metals by precipitation, ion exchange or solvent extraction: higher recovery and lower energy, at the price of complex processing and many chemicals.' },
      { text: '<b>Direct recycling</b> recovers the electrode materials whole, for direct reuse, without strong acids. It is cheaper in principle but still immature, and how well it works depends on the health of the spent cell.' }
    ]);
    read.innerHTML = 'The recycling routes in use for lithium-ion batteries as of 2022. In Europe the most common approach combines mechanical and hydrometallurgical steps.';
    var loop = anim(fig, function (dt) { if (dt === 0) return; t += dt / 9; place(); }, { autoplay: true, stepDt: 0.5 });
    place(); bind(fig, loop);
  });

  /* ===== 12.5 The chain of heat (Faruque et al. 2026, R82: Table 23, Table 4, section 9.1.3; heating test section 9.1.6) ===== */
  register('f12-5', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), vb = fig.querySelectorAll('button[data-view]');
    var x0 = 196, x1 = 500, T0 = 80, T1 = 420, X = function (T) { return x0 + (T - T0) / (T1 - T0) * (x1 - x0); };
    var gA = el('g', {}, svg), gB = el('g', {}, svg), sel = null;
    var COL = { neg: 'var(--accent)', pos: 'var(--heat)', ely: 'var(--second)', o2: 'var(--field)' };
    function axis(p, yAx) {
      el('line', { x1: x0, x2: x1, y1: yAx, y2: yAx, stroke: 'var(--line-2)' }, p);
      for (var T = 100; T <= 400; T += 50) { el('line', { x1: X(T), x2: X(T), y1: yAx, y2: yAx + 5, stroke: 'var(--line-2)' }, p); el('line', { x1: X(T), x2: X(T), y1: 30, y2: yAx, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, p); txt(p, X(T), yAx + 18, String(T), '', 'middle'); }
      txt(p, x1, yAx + 34, 'temperature, °C', '', 'end');
    }
    // ---------- reactions in the cell (Table 23) ----------
    var RX = [
      { n: 'SEI decomposition', a: 100, b: 130, h: '186–257', s: 'neg' },
      { n: 'LiC₆ + electrolyte', a: 110, b: 290, h: '1460–1714', s: 'neg' },
      { n: 'LiC₆ + PVDF binder', a: 220, b: 400, h: '1100–1500', s: 'neg' },
      { n: 'Li_{x}CoO₂ decomposition', a: 178, b: 250, h: '146', s: 'pos' },
      { n: 'Li_{x}Ni_{0.8}Co_{0.2}O₂ decomposition', a: 175, b: 340, h: '115', s: 'pos' },
      { n: 'Li_{x}CoO₂ + electrolyte', a: 167, b: 300, h: '381–625', s: 'pos' },
      { n: 'Li_{x}Ni_{0.8}Co_{0.2}O₂ + electrolyte', a: 180, b: 230, h: '600–1256', s: 'pos' },
      { n: 'electrolyte decomposition', a: 225, b: 300, h: '155–258', s: 'ely' }
    ];
    var y0 = 40, rh = 25, rowsA = [];
    txt(gA, 12, 20, 'exothermic process', 'strong', 'start'); txt(gA, x1, 20, 'J/g released', 'strong', 'end');
    RX.forEach(function (r, i) {
      var y = y0 + i * rh, row = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(r.n) + ', ' + r.a + ' to ' + r.b + ' degrees, ' + r.h + ' joules per gram', style: 'cursor:pointer' }, gA);
      var bg = el('rect', { x: 6, y: y - 11, width: 508, height: 22, rx: 5, fill: i % 2 ? 'transparent' : 'rgba(20,23,28,.03)', stroke: 'var(--accent)', 'stroke-opacity': 0, 'stroke-width': 1.5 }, row);
      txt(row, 12, y + 4, r.n, '', 'start');
      var xa = X(r.a), xb = X(r.b);
      el('rect', { x: xa, y: y - 6, width: xb - xa, height: 12, rx: 3, fill: COL[r.s], 'fill-opacity': .8 }, row);
      var inside = xb + 62 > x1 + 14;
      txt(row, inside ? xa + 5 : xb + 5, y + 4, r.h, inside ? 'strong' : '', 'start', inside ? { style: 'fill:#fff' } : null);
      rowsA.push({ r: r, bg: bg });
      pressable(row, function () { sel = r; place(); });
    });
    var yAx = y0 + RX.length * rh;
    axis(gA, yAx);
    el('line', { x1: X(130), x2: X(130), y1: 28, y2: yAx, stroke: 'var(--text)', 'stroke-dasharray': '4 3', 'stroke-width': 1.2 }, gA);
    txt(gA, X(130) + 4, 30, 'heating test, 130 °C', '', 'start', { style: 'fill:var(--text)' });
    // ---------- positive electrodes (Table 4) ----------
    var PS = [
      { n: 'LiCoO₂', heat: [180, 220], o2: [200, 250], t: 'Frequent exothermic reaction at about 180 to 220 °C; oxygen released at about 200 to 250 °C. Strongly affected by overcharge and by mechanical and thermal abuse.' },
      { n: 'NCM (layered Ni, Mn, Co)', heat: null, o2: [180, 220], t: 'Oxygen released at a high state of charge at about 180 to 220 °C; more nickel, less stability. Prone to fire at high state of charge under mechanical and thermal abuse.' },
      { n: 'LiMn₂O₄', heat: [220, 250], o2: null, t: 'Thermal decomposition at about 220 to 250 °C; oxygen released at high temperature, less severely than from LiCoO₂ or NCM.' },
      { n: 'LiFePO₄', heat: [270, 320], o2: [400, 400], t: 'The most thermally stable of the four: exothermic reaction only at about 270 to 320 °C, and oxygen released only at about 400 °C, held by the strong P–O bonds.' }
    ];
    var yb0 = 60, rhb = 40, rowsB = [];
    txt(gB, 12, 20, 'positive electrode', 'strong', 'start'); txt(gB, x1, 20, 'heat (red), oxygen (violet)', 'strong', 'end');
    PS.forEach(function (p, i) {
      var y = yb0 + i * rhb, row = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(p.n), style: 'cursor:pointer' }, gB);
      var bg = el('rect', { x: 6, y: y - 16, width: 508, height: 32, rx: 6, fill: i % 2 ? 'transparent' : 'rgba(20,23,28,.03)', stroke: 'var(--accent)', 'stroke-opacity': 0, 'stroke-width': 1.5 }, row);
      txt(row, 12, y + 4, p.n, 'strong', 'start');
      if (p.heat) el('rect', { x: X(p.heat[0]), y: y - 9, width: X(p.heat[1]) - X(p.heat[0]), height: 8, rx: 2, fill: COL.pos, 'fill-opacity': .85 }, row);
      if (p.o2) {
        if (p.o2[0] === p.o2[1]) { el('circle', { cx: X(p.o2[0]), cy: y + 5, r: 5, fill: COL.o2 }, row); txt(row, X(p.o2[0]) - 8, y + 9, 'about', '', 'end'); }
        else el('rect', { x: X(p.o2[0]), y: y + 1, width: X(p.o2[1]) - X(p.o2[0]), height: 8, rx: 2, fill: COL.o2, 'fill-opacity': .85 }, row);
      }
      rowsB.push({ p: p, bg: bg });
      pressable(row, function () { sel = p; place(); });
    });
    var ybAx = yb0 + PS.length * rhb - 10;
    axis(gB, ybAx);
    txt(gB, 12, ybAx + 62, 'heat release starts, lowest to highest:  LiCoO₂ < NCA < NCM < LiFePO₄', 'amber', 'start');
    var view = 'cell';
    var badges = [badge(gA, x0 - 14, y0, 1), badge(gA, 488, y0 + rh, 2), badge(gB, X(410) + 2, yb0 + 3 * rhb - 18, 3)];
    function place() {
      gA.style.display = view === 'cell' ? '' : 'none'; gB.style.display = view === 'pos' ? '' : 'none';
      Array.prototype.forEach.call(vb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === view)); });
      rowsA.forEach(function (o) { o.bg.setAttribute('stroke-opacity', sel === o.r ? 1 : 0); });
      rowsB.forEach(function (o) { o.bg.setAttribute('stroke-opacity', sel === o.p ? 1 : 0); });
      if (view === 'cell') {
        if (sel && sel.h) read.innerHTML = '<b>' + sel.n + '</b>: about ' + sel.a + ' to ' + sel.b + ' °C, releasing ' + sel.h + ' J/g. Ranges compiled from separate studies by Faruque et al. 2026.';
        else read.innerHTML = 'Each bar is the temperature range of one exothermic process; the number is its heat, in joules per gram. Blue: negative electrode; red: positive electrode; green: electrolyte. Tap a bar.';
      } else {
        if (sel && sel.t) read.innerHTML = '<b>' + sel.n + '</b>. ' + sel.t;
        else read.innerHTML = 'Where each positive electrode material releases heat (red) and oxygen (violet), as compared in a 2026 review. Tap a material.';
      }
    }
    Array.prototype.forEach.call(vb, function (b) { on(b, 'click', function () { view = b.getAttribute('data-view'); sel = null; place(); }); });
    steps(fig, [
      { text: 'First to go is the <b>SEI</b>, from about 100 to 130 °C. The dashed line marks the temperature of a standard heating test, 130 °C.', on: function () { view = 'cell'; place(); } },
      { text: 'The largest heat comes from <b>lithiated graphite meeting the electrolyte</b>: 1460 to 1714 J/g, between about 110 and 290 °C. The charged positive electrode joins from about 167 °C.', on: function () { view = 'cell'; place(); } },
      { text: 'Positive electrodes differ: <b>LiFePO₄</b> holds its oxygen to about 400 °C thanks to its strong P–O bonds, while LiCoO₂ gives it up from about 200 °C.', on: function () { view = 'pos'; place(); } }
    ]);
    place();
  });

  /* ===== 12.6 How cells are tested (Faruque et al. 2026, R82: sections 9.1.4 to 9.1.7, Tables 25 and 26) ===== */
  register('f12-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var FAM = [
      { k: 'echem', n: 'electrochemical', s: 'charge, current, shorts', t: 'overcharge and overdischarge, discharge at high and low temperature, external short circuit, forced discharge' },
      { k: 'mech', n: 'mechanical', s: 'force and impact', t: 'drop, heavy impact, nail penetration, shaking and squeezing, acceleration, crush' },
      { k: 'therm', n: 'thermal', s: 'heat', t: 'heating, thermal shock, spark' },
      { k: 'env', n: 'surroundings', s: 'air and water', t: 'low pressure at high altitude, soaking' }
    ];
    var tiles = [], sel = 2, tw = 140, th = 62;
    FAM.forEach(function (f, i) {
      var x = 16 + (i % 2) * (tw + 10), y = 34 + Math.floor(i / 2) * (th + 10), grp = el('g', { tabindex: 0, role: 'button', 'aria-label': f.n + ' tests', style: 'cursor:pointer' }, g);
      var r = el('rect', { x: x, y: y, width: tw, height: th, rx: 8, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, grp);
      txt(grp, x + 12, y + 26, f.n, 'strong', 'start'); txt(grp, x + 12, y + 44, f.s, '', 'start');
      tiles.push(r); pressable(grp, function () { sel = i; place(); });
    });
    txt(g, 16, 20, 'four families of abuse test', 'strong', 'start');
    // heating test programme of GB/T 31485
    var hx0 = 362, hx1 = 506, hy0 = 150, hy1 = 46, tMax = 60, Tm = 140, HX = function (t) { return hx0 + t / tMax * (hx1 - hx0); }, HY = function (T) { return hy0 - (T - 20) / (Tm - 20) * (hy0 - hy1); };
    txt(g, hx0 - 8, 20, 'heating test, GB/T 31485', 'strong', 'start');
    el('line', { x1: hx0, y1: hy0, x2: hx1, y2: hy0, stroke: 'var(--line-2)' }, g); el('line', { x1: hx0, y1: hy0, x2: hx0, y2: hy1 - 4, stroke: 'var(--line-2)' }, g);
    [25, 130].forEach(function (T) { txt(g, hx0 - 5, HY(T) + 4, T + ' °C', '', 'end'); el('line', { x1: hx0 - 3, x2: hx0, y1: HY(T), y2: HY(T), stroke: 'var(--line-2)' }, g); });
    var tRamp = (130 - 25) / 5; // minutes at 5 °C per minute
    el('path', { d: 'M' + HX(0) + ',' + HY(25) + ' L' + HX(tRamp) + ',' + HY(130) + ' L' + HX(tRamp + 30) + ',' + HY(130), fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2.4 }, g);
    el('path', { d: 'M' + HX(tRamp + 30) + ',' + HY(130) + ' L' + HX(tMax) + ',' + HY(130), fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2.4, 'stroke-dasharray': '4 3' }, g);
    txt(g, HX(tRamp / 2) + 4, HY(70), '5 °C/min', '', 'start');
    txt(g, HX(tRamp + 15), HY(130) - 8, 'hold ≥ 30 min', '', 'middle');
    txt(g, hx1, hy0 + 16, 'minutes', '', 'end'); txt(g, HX(0), hy0 + 16, '0', '', 'middle'); txt(g, HX(tRamp), hy0 + 16, Math.round(tRamp), '', 'middle'); 
    txt(g, hx0 - 8, hy0 + 34, 'pass: no fire, no leak', '', 'start');
    // standards
    el('line', { x1: 16, x2: 504, y1: 206, y2: 206, stroke: 'var(--line-2)' }, g);
    txt(g, 16, 226, 'standards that set such tests', 'strong', 'start');
    var STD = [['UN 38.3', 'transport'], ['IEC 62133', ''], ['UL 2580', ''], ['GB/T 31485', 'EV traction'], ['SAE J2464', 'EV abuse'], ['ISO 16750-2', 'road vehicles']];
    STD.forEach(function (s, i) { var x = 16 + i * 82; el('rect', { x: x, y: 236, width: 76, height: 40, rx: 6, fill: 'var(--panel)', stroke: 'var(--line-2)' }, g); txt(g, x + 38, 252, s[0], 'strong', 'middle', { style: 'font-size:10.5px' }); if (s[1]) txt(g, x + 38, 268, s[1], '', 'middle'); });
    badge(g, 300, 20, 1); badge(g, HX(tRamp + 30) + 10, HY(130) + 22, 2); badge(g, 504, 226, 3);
    function place() {
      tiles.forEach(function (r, i) { r.setAttribute('stroke', i === sel ? 'var(--accent)' : 'var(--line-2)'); r.setAttribute('stroke-width', i === sel ? 2.2 : 1); });
      read.innerHTML = '<b>' + FAM[sel].n.charAt(0).toUpperCase() + FAM[sel].n.slice(1) + ' tests</b>: ' + FAM[sel].t + '.' + (FAM[sel].k === 'therm' ? ' The heating test of GB/T 31485 is drawn on the right.' : FAM[sel].k === 'echem' ? ' In the GB/T 31485 external short circuit, a fully charged cell kept at 25 ± 2 °C for 30 minutes is shorted through 5 mΩ; it passes if it neither bursts nor catches fire.' : '');
    }
    steps(fig, [
      { text: 'Four <b>families</b> of abuse: electrochemical, mechanical, thermal and the surroundings. Tap a family for its tests.' },
      { text: 'One protocol in full: the GB/T 31485 <b>heating test</b> raises the cell to 130 ± 2 °C at 5 °C per minute and holds it there for at least 30 minutes.' },
      { text: 'The <b>standards</b>: UN 38.3 for transport, IEC 62133, UL 2580, GB/T 31485 for the traction batteries of electric vehicles, SAE J2464 and ISO 16750-2.' }
    ]);
    place();
  });
