  /* =================================================================
     Module 1: what a battery does. The Daniell cell after Winter and
     Brodd 2004 Figure 1, with the potential profile after Bard, Faulkner
     and White Figures 1.1.2 (open circuit) and 1.5.2 (current flowing).
     ================================================================= */

  /* ===== 1.1 The Daniell cell, with reaction events and the potential strip ===== */
  register('f1-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), swBtn = fig.querySelector('.sw-btn');
    var E0 = P.data.daniell.E; // 1.103 V
    var bx0 = 60, bx1 = 460, by0 = 104, by1 = 292, sep = 260;
    // beaker with two half-cells
    el('rect', { x: bx0, y: by0, width: bx1 - bx0, height: by1 - by0, rx: 8, fill: 'var(--cyan)', 'fill-opacity': '.1', stroke: 'var(--cyan)', 'stroke-opacity': '.5' }, g);
    el('line', { x1: sep, y1: by0 + 6, x2: sep, y2: by1 - 6, stroke: 'var(--cyan)', 'stroke-dasharray': '3 5' }, g);
    txt(g, 193, by0 + 16, 'ZnSO₄ solution', 'cyan', 'middle'); txt(g, 327, by0 + 16, 'CuSO₄ solution', 'cyan', 'middle');
    txt(g, sep, by1 + 16, 'porous separator: ions pass, the liquids do not mix', '', 'middle');
    // electrodes (the zinc thins, the copper thickens, as the cell runs)
    var zn = el('rect', { x: 100, y: 70, width: 26, height: 200, rx: 2, fill: 'var(--metal)' }, g);
    var cu = el('rect', { x: 394, y: 70, width: 26, height: 200, rx: 2, fill: 'var(--copper)' }, g);
    txt(g, 113, 262, 'Zn', 'strong', 'middle'); txt(g, 407, 262, 'Cu', 'strong', 'middle');
    txt(g, 88, 66, '−', 'strong big', 'end'); txt(g, 432, 66, '+', 'strong big');
    txt(g, 113, 326, 'Zn → Zn²⁺ + 2e⁻', '', 'middle'); txt(g, 407, 326, 'Cu²⁺ + 2e⁻ → Cu', '', 'middle');
    txt(g, 113, 340, 'the zinc dissolves', '', 'middle'); txt(g, 407, 340, 'copper plates out', '', 'middle');
    // wire with switch and lamp; voltmeter across the terminals
    var wireD = 'M113,70 V26 H176 M216,26 H407 V70';
    el('path', { d: wireD, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2.2 }, g);
    var sw = el('g', { 'class': 'sw', role: 'button', tabindex: '0', 'aria-pressed': 'false', 'aria-label': 'Open or close the switch' }, g);
    el('rect', { x: 166, y: 0, width: 60, height: 44, fill: 'transparent' }, sw);
    el('circle', { cx: 176, cy: 26, r: 4, fill: 'var(--text)' }, sw); el('circle', { cx: 216, cy: 26, r: 4, fill: 'var(--text)' }, sw);
    var blade = el('line', { x1: 176, y1: 26, x2: 208, y2: 6, stroke: 'var(--text)', 'stroke-width': 3, 'stroke-linecap': 'round' }, sw);
    txt(sw, 196, 44, 'switch', 'amber', 'middle');
    var lamp = el('circle', { cx: 310, cy: 26, r: 13, 'class': 'lamp lamp-off' }, g); txt(g, 310, 50, 'lamp', '', 'middle');
    el('path', { d: 'M113,58 H232 M288,58 H407', fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 1.2 }, g);
    el('circle', { cx: 260, cy: 58, r: 20, fill: 'var(--panel)', stroke: 'var(--line-2)' }, g);
    var vm = txt(g, 260, 62, '1.10 V', 'strong', 'middle'); txt(g, 260, 92, 'voltmeter', '', 'middle');
    var eLab = txt(g, 340, 16, 'e⁻ through the wire →', 'cyan', 'middle');
    var fieldW = arrow(g, 380, 40, 340, 40, '#C4B5F7', 1.3, 'field-arrow'); var fieldWl = txt(g, 360, 12 + 40, '', 'field', 'middle');
    // ions: sulfate (grey) migrating left across the separator; Zn2+ born at the zinc; Cu2+ consumed at the copper
    var ions = el('g', {}, g);
    var sulf = []; for (var i = 0; i < 7; i++) sulf.push({ x: 150 + Math.random() * 260, y: 130 + Math.random() * 140, c: el('circle', { r: 3.4, 'class': 'ion an' }, ions) });
    var cu2 = []; for (i = 0; i < 6; i++) cu2.push({ x: 300 + Math.random() * 80, y: 130 + Math.random() * 140, c: el('circle', { r: 3.4, 'class': 'ion' }, ions) });
    var zn2 = [];
    var lab = { s: txt(g, 193, 190, 'SO₄²⁻', '', 'middle'), c: txt(g, 327, 150, 'Cu²⁺', 'amber', 'middle'), z: txt(g, 193, 150, 'Zn²⁺', 'amber', 'middle') };
    var our = ourIon(g, 140, 200, 5, 'our ion'); our.g.style.display = 'none';
    var fieldS = arrow(g, 190, 280, 240, 280, '#C4B5F7', 1.3, 'field-arrow'); var fieldSl = txt(g, 215, 296 - 20, '', 'field', 'middle');
    // events at the electrodes
    var evZ = el('g', { 'class': 'event' }, g), evC = el('g', { 'class': 'event' }, g);
    var eflow = flow(svg, el('path', { d: 'M113,70 V26 H407 V70', fill: 'none', stroke: 'none' }, g), { n: 12, cls: 'e-dot', r: 3, speed: 60, parent: g });
    // the potential strip: Zn metal | solution (Zn side) | separator | solution (Cu side) | Cu metal
    var strip = phiStrip(g, { x: 100, y: 350, w: 320, h: 56 }, [], { vmin: -0.1, vmax: 1.3, label: 'φ', units: '', xlabel: '' });
    txt(g, 113, 418, 'Zn', 'phi', 'middle'); txt(g, 407, 418, 'Cu', 'phi', 'middle'); txt(g, 260, 418, 'solution', 'phi', 'middle');
    var jumpL = txt(g, 150, 364, 'jump', 'phi', 'middle'), jumpR = txt(g, 372, 364, 'jump', 'phi', 'middle'), sumT = txt(g, 470, 374, '', 'phi strong', 'middle');
    badge(g, 74, 210, 1); badge(g, 446, 210, 2); badge(g, 260, 244, 3); badge(g, 470, 404, 4); badge(g, 148, 26, 5);
    var closed = false, t = 0, evT = 0, ranZn = 0, ranCu = 0;
    function render() {
      blade.setAttribute('x2', closed ? 216 : 208); blade.setAttribute('y2', closed ? 26 : 6); sw.setAttribute('aria-pressed', String(closed));
      lamp.setAttribute('class', 'lamp ' + (closed ? 'lamp-on glow' : 'lamp-off'));
      eflow.show(closed); if (closed) eflow.start(); else eflow.stop();
      fieldW.style.display = fieldS.style.display = closed ? '' : 'none';
      setSvgText(fieldWl, closed ? 'field' : ''); setSvgText(fieldSl, closed ? 'field in the liquid' : '');
      eLab.style.display = closed ? '' : 'none';
      setSvgText(vm, closed ? 'below 1.10 V' : '1.10 V');
      setSvgText(swBtn, closed ? 'Open the switch' : 'Close the switch');
      var drop = closed ? 0.12 : 0, jL = 0.45, jR = E0 - jL; // the split between the two jumps is schematic (not measurable separately)
      strip.update([{ x: 0, phi: 0 }, { x: 0.08, phi: 0 }, { x: 0.081, phi: jL }, { x: 0.92, phi: jL - drop }, { x: 0.921, phi: jL - drop + jR }, { x: 1, phi: E0 - drop }]);
      setSvgText(sumT, closed ? '< 1.10 V' : '1.10 V');
      zn.setAttribute('width', String(26 - 3 * Math.min(1, ranZn / 12))); zn.setAttribute('x', String(100 + 3 * Math.min(1, ranZn / 12)));
      cu.setAttribute('width', String(26 + 3 * Math.min(1, ranCu / 12)));
      read.innerHTML = closed
        ? 'Switch closed: zinc atoms leave the left electrode as Zn²⁺ and their electrons run through the wire and the lamp to the copper, where Cu²⁺ ions take them and plate out. Inside the liquid, sulfate migrates toward the zinc and the cations toward the copper, so no charge piles up anywhere. The voltmeter now reads a little less than 1.10 V (a later module says how much less).'
        : 'Switch open: nothing moves, but the push is there. The voltmeter draws almost no current and reads the open-circuit voltage, <b>1.10 V</b>: the difference of the two standard potentials, 0.340 V − (−0.763 V).';
    }
    function spawnZn() { // a zinc atom leaves as Zn2+; two electrons go up the wire
      var y = 130 + Math.random() * 130; var c = el('circle', { r: 3.4, 'class': 'ion' }, ions); zn2.push({ x: 128, y: y, c: c, age: 0 });
      clear(evZ); var f = el('circle', { cx: 126, cy: y, r: 9, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.5 }, evZ); txt(evZ, 96, y + 4, '2e⁻ ↑', 'cyan', 'end');
      ranZn++; if (ranZn === 2) { our.g.style.display = ''; zn2[zn2.length - 1].our = true; }
    }
    function consumeCu() { // a Cu2+ near the copper takes two electrons and joins the metal
      var best = null; cu2.forEach(function (p) { if (!best || p.x > best.x) best = p; }); if (!best) return;
      clear(evC); el('circle', { cx: 392, cy: best.y, r: 9, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.5 }, evC); txt(evC, 424, best.y + 4, '← 2e⁻', 'cyan');
      best.x = 300 + Math.random() * 40; best.y = 130 + Math.random() * 140; ranCu++;
    }
    function tick(dt) {
      if (!closed || dt === 0) { return; }
      t += dt; evT += dt;
      if (evT > 1.6) { evT = 0; spawnZn(); consumeCu(); }
      if (t > 0.8) { evZ.style.opacity = '0'; evC.style.opacity = '0'; } else { evZ.style.opacity = '1'; evC.style.opacity = '1'; }
      if (evT < 0.05) t = 0;
      sulf.forEach(function (p) { p.x -= 22 * dt; p.y += Math.sin(t * 3 + p.x) * 6 * dt; if (p.x < 150) p.x = 440; p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
      cu2.forEach(function (p) { p.x += 14 * dt; if (p.x > 386) p.x = 386; p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
      zn2.forEach(function (p) { p.x += 14 * dt; p.age += dt; if (p.x > 250) p.x = 250; p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); if (p.our) our.move(p.x, p.y); });
      while (zn2.length > 8) { var old = zn2.shift(); ions.removeChild(old.c); if (old.our) our.g.style.display = 'none'; }
      render();
    }
    sulf.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); }); cu2.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
    pressable(sw, function () { closed = !closed; render(); }); on(swBtn, 'click', function () { closed = !closed; render(); });
    steps(fig, [
      { text: 'At the zinc, an atom gives up two electrons and leaves the metal as a <b>Zn²⁺</b> ion (amber ring flashes as it happens). The zinc slowly gets thinner. Close the switch to start.', on: function () { } },
      { text: 'At the copper, a <b>Cu²⁺</b> ion from the solution takes two electrons and becomes a copper atom on the surface. The copper slowly gets thicker.' },
      { text: 'Inside the liquid the current is carried by ions: <b>sulfate</b> drifts toward the zinc and the cations toward the copper, through the porous separator. The field in the liquid is the gentle slope on the strip. Our ion is a Zn²⁺ born at the zinc.' },
      { text: 'The strip: the potential <b>jumps</b> at each metal|liquid boundary and is flat through the liquid at open circuit. The voltmeter reads the sum of the jumps, <b>1.10 V</b>. Only the sum can be measured; the split drawn between the two jumps is schematic.' },
      { text: 'The electrons cannot cross the liquid (it has no free electrons) so they take the wire, from the more negative electrode to the more positive, and light the lamp on the way. The wire’s field points the other way; the force on a negative charge is against it.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.4, onPlay: function () { if (!closed) { closed = true; render(); } } });
    render();
    bind(fig, { start: function () { loop.start(); if (closed) eflow.start(); }, stop: function () { loop.stop(); eflow.stop(); } });
  });

  /* ===== 1.2 Two roads: electrons in the metal, ions in the liquid, linked at the boundary ===== */
  register('f1-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var yT = 60, yB = 200, xm0 = 40, xb = 260, xs1 = 480;
    el('rect', { x: xm0, y: yT, width: xb - xm0, height: yB - yT, rx: 4, fill: 'var(--metal)', 'fill-opacity': '.35', stroke: 'var(--metal)' }, g);
    el('rect', { x: xb, y: yT, width: xs1 - xb, height: yB - yT, rx: 4, fill: 'var(--cyan)', 'fill-opacity': '.12', stroke: 'var(--cyan)', 'stroke-opacity': '.5' }, g);
    txt(g, (xm0 + xb) / 2, yT - 17, 'metal electrode', 'strong', 'middle'); txt(g, (xb + xs1) / 2, yT - 17, 'liquid electrolyte', 'strong', 'middle');
    txt(g, (xm0 + xb) / 2, yT - 2, 'ions fixed in a lattice, electrons free', '', 'middle'); txt(g, (xb + xs1) / 2, yT - 2, 'ions free, no free electrons', '', 'middle');
    // lattice of fixed ion cores
    var lat = el('g', {}, g);
    for (var r = 0; r < 4; r++) for (var c = 0; c < 7; c++) { var x = xm0 + 22 + c * 32, y = yT + 24 + r * 32; el('circle', { cx: x, cy: y, r: 6, fill: 'var(--panel-2)', stroke: 'var(--muted)' }, lat); txt(lat, x, y + 4, '+', 'strong', 'middle'); }
    // mobile electrons in the metal, mobile ions in the liquid
    var es = []; for (var i = 0; i < 10; i++) es.push({ x: xm0 + 10 + Math.random() * (xb - xm0 - 20), y: yT + 10 + Math.random() * (yB - yT - 20), c: el('circle', { r: 3, 'class': 'e-dot' }, g) });
    var cats = []; for (i = 0; i < 6; i++) cats.push({ x: xb + 20 + Math.random() * 190, y: yT + 14 + Math.random() * (yB - yT - 28), c: el('circle', { r: 4, 'class': 'ion' }, g) });
    var ans = []; for (i = 0; i < 5; i++) ans.push({ x: xb + 20 + Math.random() * 190, y: yT + 14 + Math.random() * (yB - yT - 28), c: el('circle', { r: 3.4, 'class': 'ion an' }, g) });
    var our = ourIon(g, 0, 0, 4, 'our ion'); cats[0].our = true;
    // field arrows, same direction in both phases (from + to −); here + is on the right
    var fa = el('g', {}, g);
    arrow(fa, 150, yB + 22, 90, yB + 22, '#C4B5F7', 1.4, 'field-arrow'); txt(g, 120, yB + 40, 'field: force on a + charge', 'field', 'middle');
    arrow(fa, 400, yB + 22, 340, yB + 22, '#C4B5F7', 1.4, 'field-arrow'); txt(g, 370, yB + 40, 'same field, same direction', 'field', 'middle');
    txt(g, 120, yB + 56, 'electrons pushed the other way →', 'cyan', 'middle'); txt(g, 370, yB + 56, '← cations along it, anions against it', 'amber', 'middle');
    // the boundary: reaction event
    el('line', { x1: xb, y1: yT, x2: xb, y2: yB, stroke: 'var(--amber)', 'stroke-width': 2 }, g);
    var ev = el('g', { 'class': 'event' }, g);
    txt(g, xb, 24, 'boundary: a reaction hands the charge over', 'amber', 'middle');
    badge(g, 26, yB - 10, 1); badge(g, 494, yB - 10, 2); badge(g, xb, yB + 22, 3); badge(g, 30, yB + 22, 4);
    var t = 0, evT = 0;
    function place() {
      es.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
      cats.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); if (p.our) our.move(p.x, p.y); });
      ans.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
    }
    function tick(dt) {
      if (dt === 0) { place(); return; }
      t += dt; evT += dt;
      es.forEach(function (p) { p.x += 28 * dt; p.y += Math.sin(t * 4 + p.x) * 8 * dt; if (p.x > xb - 8) { p.x = xm0 + 8; } });
      cats.forEach(function (p) { p.x -= 16 * dt; p.y += Math.sin(t * 2 + p.x) * 6 * dt; if (p.x < xb + 10) { p.x = xs1 - 12; } });
      ans.forEach(function (p) { p.x += 12 * dt; if (p.x > xs1 - 10) p.x = xb + 12; });
      if (evT > 2.2) { evT = 0; clear(ev); var y = yT + 30 + Math.random() * (yB - yT - 60); el('circle', { cx: xb, cy: y, r: 10, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.6 }, ev); txt(ev, xb + 16, y + 4, 'cation + e⁻ → atom', 'amber'); ev.style.opacity = '1'; }
      if (evT > 1.2) ev.style.opacity = '0';
      place();
    }
    read.innerHTML = 'Two kinds of conductor, one field. In the metal the charge carriers are electrons; in the liquid they are ions. Charge can cross the boundary between them only through an electrode reaction that consumes electrons on one side and ions on the other.';
    steps(fig, [
      { text: 'In the <b>metal</b> the ion cores are locked in a lattice; only the electrons move. Pushed by the field (opposite to the arrow, because they are negative) they drift toward the + end.' },
      { text: 'In the <b>liquid</b> there are no free electrons: any that appear are gone in an instant. The carriers are ions, cations drifting one way and anions the other, both carrying current.' },
      { text: 'At the <b>boundary</b> the two roads meet. Charge can cross only if a reaction links them: an ion arrives, takes an electron from the metal and becomes an atom, or the reverse. No reaction, no current.' },
      { text: 'One field, two pushes: the field points from + to −; a positive ion is pushed along it, an electron against it. That is why, in figure 1.1, the electrons went one way round the circuit and the cations the other.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.3 });
    bind(fig, loop);
  });

  /* ===== 1.3 Cell versus battery: potentials add along a path, charge adds side by side ===== */
  register('f1-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), btns = fig.querySelectorAll('button[data-arr]'), read = fig.querySelector('.readout');
    var V = 1.5; // one cell, illustrative
    function cellSym(px, py, label) {
      var s = el('g', { transform: 'translate(' + px + ',' + py + ')' }, g);
      el('rect', { x: 0, y: 0, width: 40, height: 58, rx: 6, fill: 'var(--panel)', stroke: 'var(--line-2)' }, s);
      el('rect', { x: 7, y: 8, width: 26, height: 16, rx: 2, fill: 'var(--amber-2)', 'fill-opacity': '.8' }, s); el('rect', { x: 7, y: 34, width: 26, height: 16, rx: 2, fill: 'var(--metal)' }, s);
      txt(s, 20, -4, '+', 'strong', 'middle'); txt(s, 20, 72, '−', 'strong', 'middle');
      return s;
    }
    var arr = { single: el('g', {}, g), series: el('g', {}, g), parallel: el('g', {}, g) };
    cellSym.call(null, 120, 60); arr.single.appendChild(g.lastChild); txt(arr.single, 140, 150, 'one cell', '', 'middle');
    [50, 120, 190].forEach(function (x) { cellSym(x, 60); arr.series.appendChild(g.lastChild); });
    el('path', { d: 'M90,118 h12 v-62 h18 M160,118 h12 v-62 h18', fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.5 }, arr.series);
    txt(arr.series, 140, 150, 'in a chain: + to −', '', 'middle');
    [50, 120, 190].forEach(function (x) { cellSym(x, 60); arr.parallel.appendChild(g.lastChild); });
    el('path', { d: 'M70,56 v-12 h140 v12 M140,56 v-12 M70,118 v12 h140 v-12 M140,118 v12', fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.5 }, arr.parallel);
    txt(arr.parallel, 140, 150, 'side by side: + with +, − with −', '', 'middle');
    // bars
    txt(g, 300, 30, 'voltage between the ends', 'strong');
    el('rect', { x: 300, y: 38, width: 150, height: 16, rx: 3, fill: 'var(--cyan)', 'fill-opacity': '.25' }, g);
    var vbar = el('rect', { x: 300, y: 38, width: 50, height: 16, rx: 3, fill: 'var(--cyan)' }, g); var vlab = txt(g, 456, 51, '', 'strong');
    txt(g, 300, 86, 'charge stored (capacity)', 'strong');
    el('rect', { x: 300, y: 94, width: 150, height: 16, rx: 3, fill: 'var(--amber)', 'fill-opacity': '.25' }, g);
    var qbar = el('rect', { x: 300, y: 94, width: 50, height: 16, rx: 3, fill: 'var(--amber)' }, g); var qlab = txt(g, 456, 107, '', 'strong');
    // the potential along the path from the − end to the + end
    var strip = phiStrip(g, { x: 300, y: 138, w: 190, h: 60 }, [], { vmin: 0, vmax: 5, label: 'φ', units: '0', xlabel: 'along the path, − end → + end' });
    badge(g, 30, 40, 1); badge(g, 502, 46, 2); badge(g, 502, 102, 3);
    function show(a) {
      for (var k in arr) arr[k].style.display = k === a ? '' : 'none';
      var n = a === 'single' ? 1 : 3, Vn = a === 'parallel' ? 1 : n, Qn = a === 'series' ? 1 : n;
      vbar.setAttribute('width', String(50 * Vn)); qbar.setAttribute('width', String(50 * Qn));
      setSvgText(vlab, Vn + ' V'); setSvgText(qlab, Qn + ' Q');
      var pts = [{ x: 0, phi: 0 }];
      for (var i = 0; i < Vn; i++) { var f0 = 0.1 + i * 0.8 / Vn, f1 = f0 + 0.8 / Vn * 0.4; pts.push({ x: f0, phi: i * V }); pts.push({ x: f1, phi: (i + 1) * V }); }
      pts.push({ x: 1, phi: Vn * V }); strip.update(pts);
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-arr') === a)); });
      read.innerHTML = a === 'single' ? 'One cell: the potential rises by <b>V</b> once along the path; it holds a charge <b>Q</b>.'
        : a === 'series' ? 'Three in series: walking from the − end to the + end you climb three steps of V, and potential differences along a path add, so the voltage is <b>3V</b>. But the same current runs through all three in turn: every coulomb that leaves the first cell must pass through the second and the third, so all three empty together after <b>Q</b> coulombs. The capacity does not add.'
        : 'Three in parallel: all three + terminals are joined and all three − terminals are joined, so there is only one potential difference between the ends, <b>V</b>. The current splits three ways, each cell supplies a third of it, and together they can deliver <b>3Q</b> coulombs before all three are empty: the capacity adds, the voltage does not.';
    }
    Array.prototype.forEach.call(btns, function (b) { on(b, 'click', function () { show(b.getAttribute('data-arr')); }); });
    steps(fig, [
      { text: 'A cell is one unit: a rise of <b>V</b> in potential along the path from its − end to its + end, and a store of charge <b>Q</b>.' },
      { text: 'Series: the cells form one path, so potential differences along it <b>add</b> (three steps on the strip: 3V). The same current threads every cell, so each coulomb passes all three and they empty together: the capacity stays <b>Q</b>.' },
      { text: 'Parallel: all + ends are joined and all − ends are joined, so there is one rise, <b>V</b>. The current splits between the three cells, each gives a third, and together they hold <b>3Q</b>: the capacity adds, the voltage does not.' }
    ]);
    show('single');
  });
