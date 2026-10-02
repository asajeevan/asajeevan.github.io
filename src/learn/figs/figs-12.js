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
    var coolA = arrow(g, cx + R + 6, cy - 10, cx + R + 52, cy - 10, '#83DBD0', 3), coolT = txt(g, cx + R + 30, cy + 14, 'heat', 'cyan', 'middle'); txt(g, cx + R + 30, cy + 28, 'removed', 'cyan', 'middle');
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
      { text: 'Thermal runaway is what happens when the reaction of an electrode with the electrolyte becomes <b>self-sustaining</b>: the heat it releases speeds it up, which releases more heat. An autocatalytic loop.' },
      { text: 'What breaks the loop is <b>heat removal</b>. The heat is released inside the cell, at the electrode surfaces, so a cell meant for high currents must be built to shed it. Slide the cooling down and watch the loop close.' },
      { text: 'The curve on the right is only a drawing device with two outcomes: the temperature levels off, or it runs away. No numbers, because no source in hand gives them for a real cell.' }
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
      rows.forEach(function (row) { var s = a[row.k]; setSvgText(row.st, s); row.r.setAttribute('stroke', s ? (/cannot|less/.test(s) ? 'var(--heat)' : 'var(--amber)') : 'var(--line-2)'); row.r.setAttribute('stroke-width', s ? 2 : 1); row.st.setAttribute('class', 'lbl ' + (/cannot|less/.test(s) ? 'heat' : 'amber')); });
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
    band(0, 40, 36, 'var(--amber)', 'consumer cells, in use');
    band(-20, 85, 86, 'var(--cyan)', 'consumer cells, in storage');
    band(-50, 85, 136, 'var(--metal)', 'military and automotive');
    txt(g, X(-50), 186, 'cold: charging fast risks lithium plating', 'cyan', 'start');
    txt(g, X(85), 206, 'warm: faster self-discharge', 'heat', 'end');
    badge(g, X(40) + 16, 47, 1); badge(g, X(85) + 16, 97, 2); badge(g, X(-50) - 16, 182, 3);
    steps(fig, [
      { text: 'Consumer cells are meant to be <b>used between about 0 and 40 °C</b>.' },
      { text: 'They can be <b>stored between −20 and 85 °C</b>; military and automotive cells must work from −50 to 85 °C.' },
      { text: 'Why the middle is kind: in the cold, a fast charge can push the graphite into <b>lithium plating</b>; in the heat, self-discharge speeds up. And at any temperature, a cell kept full and charged fast grows its SEI fastest (module 10).' }
    ]);
    read.innerHTML = 'Temperature ranges as Winter and Brodd give them for 2004-era cells; the two notes are the directions the sources give, without numbers.';
  });

  /* ===== 12.4 The recycling routes ===== */
  register('f12-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    function node(x, y, w, t, s, col) { el('rect', { x: x, y: y, width: w, height: 44, rx: 8, fill: 'var(--panel-2)', stroke: col || 'var(--line-2)' }, g); txt(g, x + w / 2, y + 18, t, 'strong', 'middle'); if (s) txt(g, x + w / 2, y + 34, s, '', 'middle'); return { x: x, y: y, w: w }; }
    var a = node(20, 20, 150, 'spent cells', 'hazardous goods'), b = node(185, 20, 150, 'pre-treatment', 'discharge, dismantle'), c = node(350, 20, 150, 'crush and sort', 'sieve, density, magnet');
    var p = node(20, 120, 150, 'pyrometallurgy', 'smelt, about 1000 °C', 'var(--heat)'), h = node(185, 120, 150, 'hydrometallurgy', 'leach in acid', 'var(--cyan)'), d = node(350, 120, 150, 'direct recycling', 'keep materials whole', 'var(--amber)');
    var o1 = txt(g, 95, 190, 'Cu, Ni, Co alloy', '', 'middle'), o1b = txt(g, 95, 206, 'Li, Mn to slag', 'heat', 'middle');
    txt(g, 260, 190, 'metal salts', '', 'middle'); txt(g, 260, 206, 'high recovery, many steps', '', 'middle');
    txt(g, 425, 190, 'electrode materials', '', 'middle'); txt(g, 425, 206, 'still immature', '', 'middle');
    arrow(g, 170, 42, 183, 42, '#A3B6B1', 1.6); arrow(g, 335, 42, 348, 42, '#A3B6B1', 1.6);
    [[260, 64, 95, 118], [425, 64, 260, 118], [425, 64, 425, 118]].forEach(function (r) { arrow(g, r[0], r[1], r[2], r[3], '#A3B6B1', 1.4); });
    txt(g, 260, 244, 'back into new cells', 'amber', 'middle');
    [95, 260, 425].forEach(function (x) { arrow(g, x, 212, 260, 230, '#F0B441', 1.2); });
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
    read.innerHTML = 'The recycling routes in use for lithium-ion batteries, after the 2022 BATTERY 2030+ review. In Europe the most common approach combines mechanical and hydrometallurgical steps.';
    var loop = anim(fig, function (dt) { if (dt === 0) return; t += dt / 9; place(); }, { autoplay: true, stepDt: 0.5 });
    place(); bind(fig, loop);
  });
