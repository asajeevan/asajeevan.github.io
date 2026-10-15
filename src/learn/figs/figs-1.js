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
    // a glass beaker: colourless zinc sulfate on the left, blue copper sulfate on the right, a porous wall between
    tank(g, bx0, by0, bx1 - bx0, by1 - by0, 'electrolyte');
    el('rect', { x: sep, y: by0 + 1, width: bx1 - sep - 1, height: by1 - by0 - 2, rx: 7, fill: MV('cuso4'), opacity: .75 }, g);
    el('rect', { x: sep - 3, y: by0 + 6, width: 6, height: by1 - by0 - 12, fill: M('ceramic'), stroke: '#C8C1B1', 'stroke-width': .6 }, g);
    txt(g, 193, by0 + 16, 'ZnSO₄ solution', 'cyan', 'middle'); txt(g, 327, by0 + 16, 'CuSO₄ solution', 'cyan', 'middle');
    txt(g, sep, by1 + 16, 'porous separator: ions pass, the liquids do not mix', '', 'middle');
    // electrodes (the zinc thins, the copper thickens, as the cell runs)
    var zn = el('rect', { x: 100, y: 70, width: 26, height: 200, rx: 2, fill: M('zinc'), stroke: '#7E8A96', 'stroke-width': .8 }, g);
    var cu = el('rect', { x: 394, y: 70, width: 26, height: 200, rx: 2, fill: M('copper'), stroke: '#7A421E', 'stroke-width': .8 }, g);
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
    var fieldW = arrow(g, 380, 40, 340, 40, 'var(--field)', 1.3, 'field-arrow'); var fieldWl = txt(g, 360, 12 + 40, '', 'field', 'middle');
    // ions: sulfate (grey) migrating left across the separator; Zn2+ born at the zinc; Cu2+ consumed at the copper
    var ions = el('g', {}, g);
    var sulf = []; for (var i = 0; i < 7; i++) sulf.push({ x: 150 + Math.random() * 260, y: 130 + Math.random() * 140, c: el('circle', { r: 3.4, 'class': 'ion an' }, ions) });
    var cu2 = []; for (i = 0; i < 6; i++) cu2.push({ x: 300 + Math.random() * 80, y: 130 + Math.random() * 140, c: el('circle', { r: 3.4, 'class': 'ion' }, ions) });
    var zn2 = [];
    var lab = { s: txt(g, 193, 190, 'SO₄²⁻', '', 'middle'), c: txt(g, 327, 150, 'Cu²⁺', 'amber', 'middle'), z: txt(g, 193, 150, 'Zn²⁺', 'amber', 'middle') };
    var our = ourIon(g, 140, 200, 5, 'our ion'); our.g.style.display = 'none';
    var fieldS = arrow(g, 190, 280, 240, 280, 'var(--field)', 1.3, 'field-arrow'); var fieldSl = txt(g, 215, 296 - 20, '', 'field', 'middle');
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
      clear(evZ); var f = el('circle', { cx: 126, cy: y, r: 9, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5 }, evZ); txt(evZ, 96, y + 4, '2e⁻ ↑', 'cyan', 'end');
      ranZn++; if (ranZn === 2) { our.g.style.display = ''; zn2[zn2.length - 1].our = true; }
    }
    function consumeCu() { // a Cu2+ near the copper takes two electrons and joins the metal
      var best = null; cu2.forEach(function (p) { if (!best || p.x > best.x) best = p; }); if (!best) return;
      clear(evC); el('circle', { cx: 392, cy: best.y, r: 9, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5 }, evC); txt(evC, 424, best.y + 4, '← 2e⁻', 'cyan');
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
      { text: 'At the zinc, an atom gives up two electrons and leaves the metal as a <b>Zn²⁺</b> ion (blue ring flashes as it happens). The zinc slowly gets thinner. Close the switch to start.', on: function () { } },
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
    el('rect', { x: xm0, y: yT, width: xb - xm0, height: yB - yT, rx: 4, fill: MV('zinc'), opacity: .55, stroke: '#7E8A96' }, g);
    el('rect', { x: xb, y: yT, width: xs1 - xb, height: yB - yT, rx: 4, fill: MV('electrolyte'), stroke: '#9FB3C2' }, g);
    txt(g, (xm0 + xb) / 2, yT - 17, 'metal electrode', 'strong', 'middle'); txt(g, (xb + xs1) / 2, yT - 17, 'liquid electrolyte', 'strong', 'middle');
    txt(g, (xm0 + xb) / 2, yT - 2, 'ions fixed in a lattice, electrons free', '', 'middle'); txt(g, (xb + xs1) / 2, yT - 2, 'ions free, no free electrons', '', 'middle');
    // lattice of fixed ion cores
    var lat = el('g', {}, g);
    for (var r = 0; r < 4; r++) for (var c = 0; c < 7; c++) { var x = xm0 + 22 + c * 32, y = yT + 24 + r * 32; el('circle', { cx: x, cy: y, r: 6, fill: MB('steel'), stroke: '#7E8A96' }, lat); txt(lat, x, y + 4, '+', 'strong', 'middle'); }
    // mobile electrons in the metal, mobile ions in the liquid
    var es = []; for (var i = 0; i < 10; i++) es.push({ x: xm0 + 10 + Math.random() * (xb - xm0 - 20), y: yT + 10 + Math.random() * (yB - yT - 20), c: el('circle', { r: 3, 'class': 'e-dot' }, g) });
    var cats = []; for (i = 0; i < 6; i++) cats.push({ x: xb + 20 + Math.random() * 190, y: yT + 14 + Math.random() * (yB - yT - 28), c: el('circle', { r: 4, 'class': 'ion' }, g) });
    var ans = []; for (i = 0; i < 5; i++) ans.push({ x: xb + 20 + Math.random() * 190, y: yT + 14 + Math.random() * (yB - yT - 28), c: el('circle', { r: 3.4, 'class': 'ion an' }, g) });
    var our = ourIon(g, 0, 0, 4, 'our ion'); cats[0].our = true;
    // field arrows, same direction in both phases (from + to −); here + is on the right
    var fa = el('g', {}, g);
    arrow(fa, 150, yB + 22, 90, yB + 22, 'var(--field)', 1.4, 'field-arrow'); txt(g, 120, yB + 40, 'field: force on a + charge', 'field', 'middle');
    arrow(fa, 400, yB + 22, 340, yB + 22, 'var(--field)', 1.4, 'field-arrow'); txt(g, 370, yB + 40, 'same field, same direction', 'field', 'middle');
    txt(g, 120, yB + 56, 'electrons pushed the other way →', 'cyan', 'middle'); txt(g, 370, yB + 56, '← cations along it, anions against it', 'amber', 'middle');
    // the boundary: reaction event
    el('line', { x1: xb, y1: yT, x2: xb, y2: yB, stroke: 'var(--accent)', 'stroke-width': 2 }, g);
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
      if (evT > 2.2) { evT = 0; clear(ev); var y = yT + 30 + Math.random() * (yB - yT - 60); el('circle', { cx: xb, cy: y, r: 10, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.6 }, ev); txt(ev, xb + 16, y + 4, 'cation + e⁻ → atom', 'amber'); ev.style.opacity = '1'; }
      if (evT > 1.2) ev.style.opacity = '0';
      place();
    }
    read.innerHTML = 'Two kinds of conductor, one field. In the metal the charge carriers are electrons; in the liquid they are ions. Charge can cross the boundary between them only through an electrode reaction that consumes electrons on one side and ions on the other.';
    steps(fig, [
      { text: 'In the <b>metal</b> the ion cores are locked in a lattice; only the electrons move. Pushed by the field (opposite to the arrow, because they are negative) they drift toward the + end.' },
      { text: 'In the <b>liquid</b> there are no free electrons: any that appear are gone in an instant. The carriers are ions, cations drifting one way and anions the other, both carrying current.' },
      { text: 'At the <b>boundary</b> the two roads meet. Charge can cross only if a reaction links them: an ion arrives, takes an electron from the metal and becomes an atom, or the reverse. No reaction, no current.' },
      { text: 'One field, two pushes: the field points from + to −; a positive ion is pushed along it, an electron against it. That is why, in figure {{fig:f1-1}}, the electrons went one way round the circuit and the cations the other.' }
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
      cellCan(s, 2, 2, 36, 54);
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
    el('rect', { x: 300, y: 38, width: 150, height: 16, rx: 3, fill: 'var(--second)', 'fill-opacity': '.25' }, g);
    var vbar = el('rect', { x: 300, y: 38, width: 50, height: 16, rx: 3, fill: 'var(--second)' }, g); var vlab = txt(g, 456, 51, '', 'strong');
    txt(g, 300, 86, 'charge stored (capacity)', 'strong');
    el('rect', { x: 300, y: 94, width: 150, height: 16, rx: 3, fill: 'var(--accent)', 'fill-opacity': '.25' }, g);
    var qbar = el('rect', { x: 300, y: 94, width: 50, height: 16, rx: 3, fill: 'var(--accent)' }, g); var qlab = txt(g, 456, 107, '', 'strong');
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

  /* ===== 1.4 Is it a battery? Five criteria (Villevieille, Novak and Girault 2026, R81, Tables 1 and 2) ===== */
  register('f1-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    // marks: 2 meets, 1 partly, 0 does not; verdict b battery, h hybrid, n not a battery
    var Y = 2, P = 1, N = 0;
    var SYS = [
      { n: 'Li-ion, no graphite', m: [Y, Y, Y, Y, Y], v: 'b', t: 'All five tests met. The Comment’s worked example is Li₄Ti₅O₁₂‖LiCoO₂. On charge, at the negative electrode Li₄Ti₅O₁₂ + 3Li⁺ + 3e⁻ → Li₇Ti₅O₁₂; at the positive one LiCoO₂ → CoO₂ + Li⁺ + e⁻.' },
      { n: 'Li-ion, graphite negative', m: [Y, P, Y, Y, Y], v: 'b', t: 'Only partly C2: citing a recent analysis, the Comment argues that graphite stores lithium as a volumic capacitor, without a redox reaction tied to the storage. It still counts these cells as batteries. A proposal, not settled usage.' },
      { n: 'metal and metal-ion', m: [Y, Y, Y, Y, Y], v: 'b', t: '“Metal” when the negative electrode is the metal itself (Li, Na, K, Mg, Ca, Zn, Al and others); “metal-ion” when it stores the ions by insertion (Li₄Ti₅O₁₂), alloying (Si) or conversion (Fe₃O₄). The electrolyte may be liquid, solid or an ionic liquid.' },
      { n: 'halide-ion (F⁻, Cl⁻, Br⁻, I⁻)', m: [Y, Y, Y, Y, Y], v: 'b', t: 'Anion shuttles: halide ions, not cations, cross the electrolyte between the electrodes while electrons go round the circuit. All five tests met.' },
      { n: 'lead-acid', m: [Y, Y, Y, Y, Y], v: 'b', t: 'Solid electrodes and an aqueous electrolyte; all five tests met.' },
      { n: 'redox flow', m: [Y, Y, Y, Y, Y], v: 'b', t: 'The reactants are dissolved in the negolyte and the posolyte, kept in tanks and pumped through a cell with an ion-conducting membrane. Outside the cell but inside the system: still closed, so C1 holds.' },
      { n: 'capacitor', m: [Y, N, Y, Y, N], v: 'n', t: 'Two conducting surfaces with a dielectric between them: charge is stored by polarization, not by faradaic reactions.' },
      { n: 'supercapacitor', m: [Y, N, Y, Y, N], v: 'n', t: 'Electrodes of very large surface area, such as porous carbons, with an electrolyte; ions gather at the interfaces. No faradaic reactions, so not a battery.' },
      { n: 'pseudocapacitor', m: [Y, P, Y, Y, P], v: 'n', t: 'Fast faradaic reactions confined to the surface, with the behaviour of a capacitor. The share stored by redox depends on particle size: nanoscale LiCoO₂ behaves pseudocapacitively, micrometre particles like a battery material.' },
      { n: 'metal-ion capacitor', m: [Y, N, Y, Y, N], v: 'n', t: 'A supercapacitor-like positive electrode with a graphite negative one, which the Comment counts as a volumic capacitor: neither electrode works faradaically.' },
      { n: 'fuel cell', m: [N, Y, Y, Y, Y], v: 'n', t: 'Fuel and usually oxidant come from outside and the product leaves: an open system, so C1 fails.' },
      { n: '“metal-air battery”', m: [N, Y, Y, Y, Y], v: 'h', t: 'The gas that reacts at the positive electrode (O₂, CO₂ or N₂) is exchanged with the surroundings, so that electrode works like a fuel cell and C1 fails: a hybrid.' },
      { n: '“thermal battery” (molten salt)', m: [Y, Y, Y, Y, Y], v: 'b', t: 'A primary cell whose salt electrolyte is solid at room temperature and is melted with pyrotechnic material to start it. Redox at both electrodes, closed: a battery.' },
      { n: 'thermal energy storage', m: [N, N, N, N, N], v: 'n', t: 'Stores heat; electricity only through a turbine and generator, in a thermodynamic cycle. No test met.' },
      { n: '“structural battery”', m: [Y, Y, Y, Y, Y], v: 'b', t: 'Electrodes and separator built into a load-bearing composite, often with carbon fibres and solid or polymer electrolytes. It is a battery that is also part of the structure.' },
      { n: '“nuclear battery”', m: [N, N, N, N, N], v: 'n', t: 'Converts the energy of radioactive decay with semiconductor converters, not chemical reactions.' },
      { n: '“quantum battery”', m: [N, N, N, N, N], v: 'n', t: 'Stores and releases energy within quantum systems; no electrochemistry.' },
      { n: '“mechanical battery”', m: [N, N, N, N, N], v: 'n', t: 'Potential or kinetic energy, such as a flywheel’s, turned into electricity by a machine.' }
    ];
    var CRIT = ['closed system', 'faradaic redox', 'redox at two electrodes', 'ions inside, electrons outside', 'electrical output'];
    var cx0 = 236, cw = 34, vx = 410, y0 = 50, rh = 18;
    txt(g, 14, 22, 'system', 'strong', 'start');
    CRIT.forEach(function (c, j) { txt(g, cx0 + j * cw, 22, 'C' + (j + 1), 'strong', 'middle'); });
    txt(g, vx, 22, 'verdict', 'strong', 'start');
    el('line', { x1: 8, x2: 512, y1: 32, y2: 32, stroke: 'var(--line-2)' }, g);
    function mark(p, x, y, r) {
      var rad = 5.5;
      if (r === 2) { el('circle', { cx: x, cy: y, r: rad, fill: 'var(--second)' }, p); el('path', { d: 'M' + (x - 2.6) + ',' + y + ' l1.9,2 l3.6,-4', fill: 'none', stroke: '#fff', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, p); }
      else if (r === 1) { el('circle', { cx: x, cy: y, r: rad, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5 }, p); el('path', { d: 'M' + x + ',' + (y - rad) + ' A' + rad + ',' + rad + ' 0 0 0 ' + x + ',' + (y + rad) + ' Z', fill: 'var(--accent)' }, p); }
      else { var d = rad * 0.55; el('circle', { cx: x, cy: y, r: rad, fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.6 }, p); el('path', { d: 'M' + (x - d) + ',' + (y - d) + ' L' + (x + d) + ',' + (y + d) + ' M' + (x + d) + ',' + (y - d) + ' L' + (x - d) + ',' + (y + d), stroke: 'var(--heat)', 'stroke-width': 1.6 }, p); }
    }
    var VERD = { b: ['battery', 'cyan'], h: ['hybrid', 'amber'], n: ['not a battery', ''] }, rows = [], sel = null;
    SYS.forEach(function (s, i) {
      var y = y0 + i * rh, row = el('g', { tabindex: 0, role: 'button', 'aria-label': s.n + ': ' + VERD[s.v][0], style: 'cursor:pointer' }, g);
      var bg = el('rect', { x: 8, y: y - rh / 2 + 1, width: 504, height: rh - 2, rx: 5, fill: i % 2 ? 'transparent' : 'rgba(20,23,28,.03)', stroke: 'var(--accent)', 'stroke-opacity': 0, 'stroke-width': 1.5 }, row);
      txt(row, 14, y + 4, s.n, '', 'start');
      s.m.forEach(function (r, j) { mark(row, cx0 + j * cw, y, r); });
      txt(row, vx, y + 4, VERD[s.v][0], 'strong ' + VERD[s.v][1], 'start');
      rows.push({ s: s, bg: bg });
      pressable(row, function () { sel = s; place(); });
    });
    // separators between the groups: batteries, capacitors, open systems, other uses of the word
    [6, 10, 12].forEach(function (k) { var y = y0 + k * rh - rh / 2; el('line', { x1: 8, x2: 512, y1: y, y2: y, stroke: 'var(--line-2)', 'stroke-dasharray': '2 3' }, g); });
    badge(g, 205, 18, 1); badge(g, 205, y0 + 7 * rh, 2); badge(g, 205, y0 + 10 * rh, 3);
    function place() {
      rows.forEach(function (r) { r.bg.setAttribute('stroke-opacity', sel === r.s ? 1 : 0); });
      if (!sel) { read.innerHTML = 'C1 closed system · C2 faradaic redox · C3 oxidation and reduction at two separate electrodes · C4 ions through the electrolyte, electrons round the circuit · C5 electrical energy out. Tap a row for the reasoning.'; return; }
      var fails = sel.m.map(function (r, j) { return r === 2 ? null : 'C' + (j + 1) + (r === 1 ? ' (partly)' : ''); }).filter(Boolean);
      read.innerHTML = '<b>' + sel.n + '</b>: ' + VERD[sel.v][0] + (fails.length ? '; not fully met: ' + fails.join(', ') : '; all five met') + '. ' + sel.t;
    }
    steps(fig, [
      { text: 'The five operational criteria of a 2026 Comment. C1: a <b>closed</b> system; C2: energy stored by reversible <b>faradaic</b> reactions; C3: oxidation and reduction at <b>two separate electrodes</b>; C4: ions through the electrolyte while electrons go round the outside circuit; C5: <b>electrical energy</b> delivered. A system is a battery only if it meets all five.' },
      { text: 'Capacitors and supercapacitors fail C2: they store charge by polarization at surfaces, not by redox reactions. A pseudocapacitor meets it only in part.' },
      { text: 'Fuel cells fail C1, because their fuel and oxidant are fed from outside; metal-air cells, half battery and half fuel cell, are hybrids. Tap any row for the reasoning; the marks are the Comment’s.' }
    ]);
    place();
  });

  /* ===== 1.5 From Volta's pile to the lithium-ion cell (after Arote 2022, B3; 1886 dry cell after Faruque et al. 2026, R82) ===== */
  register('f1-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var EV = [
      { y: '1800', s: 'Volta', kind: 'pile', h: 'Volta’s pile', l: ['zinc and silver sheets, with cloth', 'soaked in salt water between them'], neg: 'zinc', pos: 'silver', r: '', t: 'Around 1800 Alessandro Volta built the first real battery: a pile of zinc and silver sheets separated by cloth soaked in salt water. Zinc is the negative electrode, silver the positive.' },
      { y: '1836', s: 'Daniell', kind: 'daniell', h: 'Daniell’s cell', l: ['zinc in zinc sulfate, copper in', 'copper(II) sulfate, a porous wall between'], neg: 'zinc', pos: 'copper', r: 'Zn + Cu²⁺ → Zn²⁺ + Cu', t: 'In 1836 John Frederic Daniell separated two half-cells by a porous partition: zinc in zinc sulfate (or dilute sulfuric acid) and copper in copper(II) sulfate. Neither half works alone. This is the cell of figure 1.1.' },
      { y: '1859', s: 'Planté', kind: 'tank', h: 'Planté’s lead-acid cell', l: ['lead and lead dioxide', 'in dilute sulfuric acid'], neg: 'lead', pos: 'pbo2', el: 'electrolyte', r: 'PbO₂ + 2H₂SO₄ + Pb ⇌ 2PbSO₄ + 2H₂O', t: 'In 1859 Gaston Planté invented the lead-acid battery, the first rechargeable battery to be produced commercially. Lead sulfate forms at both electrodes on discharge; an external current reverses the reaction.' },
      { y: '1866', s: 'Leclanché', kind: 'tank', h: 'Leclanché’s zinc-carbon cell', l: ['zinc; manganese dioxide with carbon;', 'ammonium chloride solution'], neg: 'zinc', pos: 'carbon', el: 'electrolyte', r: '', t: 'In 1866 Georges Leclanché paired zinc with manganese dioxide and carbon, wrapped in a porous material, in ammonium chloride solution: the zinc-carbon cell, the first widely used battery. For commercial use the liquid was replaced by a paste.' },
      { y: '1886', s: 'dry cell', kind: 'tank', h: 'The first dry cell', l: ['a variant of the Leclanché cell,', 'its electrolyte a paste'], neg: 'zinc', pos: 'carbon', el: 'polymer', r: '', t: 'The first dry cell, of 1886, was a variant of the Leclanché zinc-carbon cell. A dry cell need not be dry: its electrolyte is a paste.' },
      { y: '1901', s: 'Ni-Cd, Ni-Fe', kind: 'tank', h: 'Nickel-cadmium and nickel-iron', l: ['cadmium; nickel oxyhydroxide;', 'potassium hydroxide solution'], neg: 'zinc', pos: 'carbon', el: 'electrolyte', r: 'Cd + 2NiOOH + 2H₂O ⇌ Cd(OH)₂ + 2Ni(OH)₂', t: 'In 1901 Waldemar Jungner and Thomas Edison introduced the nickel-cadmium and nickel-iron batteries. For many years nickel-cadmium was the rechargeable cell of choice, until the toxicity of cadmium sent the search for other materials.' },
      { y: '1991', s: 'Li-ion', kind: 'liion', h: 'The lithium-ion cell', l: ['carbon and LiCoO₂ in a lithium salt', 'dissolved in organic solvents'], neg: 'graphite', pos: 'lco', el: 'electrolyte', r: 'LiCoO₂ + xC₆ ⇌ Li_{1−x}CoO₂ + xLiC₆', t: 'In 1991 Sony brought out the first commercial lithium-ion battery, with LiCoO₂ as the positive electrode and carbon as the negative. Lithium is light and has a very negative electrode potential.' },
      { y: '2019', s: 'Nobel', kind: 'liion', h: 'The Nobel Prize in Chemistry', l: ['John Goodenough, Stanley Whittingham', 'and Akira Yoshino'], neg: 'graphite', pos: 'lco', el: 'electrolyte', r: '', t: 'In 2019 John Goodenough, Stanley Whittingham and Akira Yoshino received the Nobel Prize in Chemistry for the development of lithium-ion batteries.' }
    ];
    // nickel-cadmium: the silvery cadmium is drawn with the zinc gradient, the black NiOOH with the carbon one
    var x0 = 54, x1 = 490, ty = 46, dx = (x1 - x0) / (EV.length - 1), dots = [], sel = 1;
    el('line', { x1: x0 - 12, x2: x1 + 12, y1: ty, y2: ty, stroke: 'var(--line-2)', 'stroke-width': 2 }, g);
    EV.forEach(function (e, i) {
      var x = x0 + i * dx, grp = el('g', { tabindex: 0, role: 'button', 'aria-label': e.y + ', ' + e.h, style: 'cursor:pointer' }, g);
      el('rect', { x: x - dx / 2 + 2, y: ty - 34, width: dx - 4, height: 76, fill: 'transparent' }, grp);
      txt(grp, x, ty - 14, e.y, 'strong', 'middle');
      var d = el('circle', { cx: x, cy: ty, r: 6, fill: 'var(--panel)', stroke: 'var(--accent)', 'stroke-width': 2 }, grp);
      txt(grp, x, ty + 22 + (i % 2) * 14, e.s, '', 'middle');
      dots.push(d);
      pressable(grp, function () { sel = i; place(); });
    });
    var card = el('g', {}, g);
    badge(g, 13, ty, 1); badge(g, x0 + 2.5 * dx, ty - 20, 2); badge(g, x0 + 5.5 * dx, ty - 20, 3);
    function bar(p, x, y, w, h, mat) { el('rect', { x: x, y: y, width: w, height: h, rx: 2, fill: M(mat), stroke: 'rgba(16,24,40,.25)', 'stroke-width': .6, filter: 'url(#fx-lift)' }, p); }
    function place() {
      dots.forEach(function (d, i) { d.setAttribute('fill', i === sel ? 'var(--accent)' : 'var(--panel)'); d.setAttribute('r', i === sel ? 7.5 : 6); });
      clear(card); var e = EV[sel], ox = 30, oy = 112;
      if (e.kind === 'pile') {
        for (var k = 0; k < 5; k++) {
          var y = oy + 128 - k * 28;
          el('rect', { x: ox + 20, y: y, width: 90, height: 9, rx: 2, fill: MV('zinc'), stroke: 'rgba(16,24,40,.25)', 'stroke-width': .6 }, card);
          el('rect', { x: ox + 23, y: y - 8, width: 84, height: 8, rx: 2, fill: MV('polymer'), stroke: '#C9C3B4', 'stroke-width': .6 }, card);
          el('rect', { x: ox + 20, y: y - 17, width: 90, height: 9, rx: 2, fill: MV('silver'), stroke: 'rgba(16,24,40,.25)', 'stroke-width': .6 }, card);
        }
        txt(card, ox + 118, oy + 136, 'zinc', '', 'start'); txt(card, ox + 118, oy + 124, 'cloth in brine', '', 'start'); txt(card, ox + 118, oy + 112, 'silver', '', 'start');
      } else {
        var bx = ox + 6, bw = 186, bh = 116, by = oy + 18;
        var liq = e.kind === 'daniell' ? null : (e.el || 'electrolyte');
        if (e.kind === 'daniell') {
          el('rect', { x: bx, y: by + 22, width: bw / 2, height: bh - 22, fill: MV('electrolyte') }, card);
          el('rect', { x: bx + bw / 2, y: by + 22, width: bw / 2, height: bh - 22, fill: MV('cuso4'), 'fill-opacity': .8 }, card);
          el('rect', { x: bx + bw / 2 - 3, y: by + 16, width: 6, height: bh - 16, fill: M('ceramic'), stroke: '#C9C3B4', 'stroke-width': .6 }, card);
        } else {
          el('rect', { x: bx, y: by + 22, width: bw, height: bh - 22, fill: MV(liq) }, card);
        }
        el('rect', { x: bx, y: by, width: bw, height: bh, rx: 6, fill: 'none', stroke: '#9FB3C2', 'stroke-width': 1.4 }, card);
        el('rect', { x: bx + 6, y: by + 8, width: 3, height: bh - 16, rx: 1.5, fill: '#fff', opacity: .55 }, card);
        bar(card, bx + 26, by - 10, 22, bh - 10, e.neg); bar(card, bx + bw - 48, by - 10, 22, bh - 10, e.pos);
        txt(card, bx + 37, by + bh + 16, '−', 'strong', 'middle'); txt(card, bx + bw - 37, by + bh + 16, '+', 'strong', 'middle');
      }
      var tx = 262;
      txt(card, tx, oy + 4, e.y + ': ' + e.h, 'strong', 'start');
      e.l.forEach(function (line, j) { txt(card, tx, oy + 26 + j * 17, line, '', 'start'); });
      if (e.r) { txt(card, tx, oy + 76, 'cell reaction:', '', 'start'); txt(card, tx, oy + 94, e.r, 'amber', 'start'); }
      txt(card, tx, oy + 168, 'drawn in real colours, not to scale', '', 'start', { style: 'fill:var(--muted)' });
      read.innerHTML = e.t;
    }
    steps(fig, [
      { text: '<b>Volta’s pile</b>, around 1800: zinc and silver with brine-soaked cloth between them, the first real battery.' },
      { text: '<b>Daniell</b> (1836) separated the two half-cells; <b>Planté</b> (1859) made the first rechargeable battery to be produced commercially, lead-acid; <b>Leclanché</b> (1866) the zinc-carbon cell that, as a paste, became the dry cell (1886).' },
      { text: '<b>Nickel-cadmium</b> and nickel-iron (1901) were the rechargeable cells of the twentieth century; the <b>lithium-ion</b> cell arrived in 1991. Tap any milestone.' }
    ]);
    place();
  });

  /* f1-6: a family tree of batteries, primary and secondary, and the lithium-ion cell sorted by electrolyte and by shape */
  register('f1-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var NOM = {}; ((P && P.data && P.data.nominal) || []).forEach(function (d) { NOM[d.name] = d; });
    function volts(name) { return NOM[name] ? NOM[name].V.toFixed(1) + ' V' : ''; }
    var nodes = [], sel = null;
    function node(o) {
      var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(o.label), style: 'cursor:pointer' }, g);
      o.box = el('rect', { x: o.x, y: o.y, width: o.w, height: o.h || 26, rx: o.round ? 13 : 6, fill: 'var(--panel)', stroke: o.col, 'stroke-width': 1.4 }, grp);
      if (o.mats) {
        el('rect', { x: o.x + 8, y: o.y + 5, width: 6, height: 16, rx: 1.5, fill: MV(o.mats[0]), stroke: 'rgba(16,24,40,.3)', 'stroke-width': .5 }, grp);
        el('rect', { x: o.x + 16, y: o.y + 5, width: 6, height: 16, rx: 1.5, fill: MV(o.mats[1]), stroke: 'rgba(16,24,40,.3)', 'stroke-width': .5 }, grp);
      }
      txt(grp, o.mats ? o.x + 30 : o.x + o.w / 2, o.y + 17, o.label, o.cls || '', o.mats ? 'start' : 'middle');
      if (o.v) txt(grp, o.x + o.w - 8, o.y + 17, o.v, 'strong', 'end');
      pressable(grp, function () { sel = o; place(); });
      nodes.push(o); return o;
    }
    function line(pts) { el('polyline', { points: pts.map(function (p) { return p.join(','); }).join(' '), fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 1.4 }, g); }
    var PRI = 'var(--muted)', SEC = 'var(--accent)', LI = 'var(--second)';
    // trunk and the two families
    line([[260, 37], [260, 50], [130, 50], [130, 58]]); line([[260, 50], [392, 50], [392, 58]]);
    var root = node({ x: 200, y: 10, w: 120, label: 'batteries', cls: 'strong', col: 'var(--text)', round: true,
      t: 'A battery is built from electrochemical cells, and by what their cells can do, batteries fall into two broad families: <b>primary</b> and <b>secondary</b>. Tap a family or a cell.' });
    var pri = node({ x: 30, y: 58, w: 200, label: 'primary: single use', cls: 'strong', col: PRI, round: true,
      t: '<b>Primary batteries</b> are single-use: they store and give energy but cannot be recharged, so they are discarded after use. They power things that need little energy, such as radios, watches, remote controls and toys, and are made to international standards: affordable, safe and low in maintenance.' });
    var sec = node({ x: 292, y: 58, w: 200, label: 'secondary: rechargeable', cls: 'strong', col: SEC, round: true,
      t: '<b>Secondary batteries</b> are rechargeable: an external current reverses the reaction that makes the electricity, so they store and supply energy over many cycles. Both wet cells, with a liquid electrolyte, and dry cells, with a paste, can be secondary.' });
    var P1 = [
      { label: 'zinc-carbon', n: 'Leclanché (carbon-zinc)', mats: ['zinc', 'mno2'],
        t: '<b>Zinc-carbon</b>, the Leclanché cell of figure {{fig:f1-5}}, is the most common dry cell. A dry cell need not be dry: its electrolyte is a paste, and leakage of that electrolyte is a significant barrier to long storage.' },
      { label: 'alkaline', n: 'Alkaline', mats: ['zinc', 'mno2'],
        t: '<b>Alkaline</b> cells use potassium hydroxide as the electrolyte. They store more energy and leak less than zinc-carbon cells; they cost more but perform better in extreme weather.' },
      { label: 'silver oxide', n: 'Silver-zinc', mats: ['zinc', 'ag2o'],
        t: '<b>Silver oxide</b> cells pair zinc powder with Ag₂O in aqueous potassium hydroxide.' },
      { label: 'lithium-MnO₂', n: 'Lithium-MnO2', mats: ['lithium', 'mno2'],
        t: '<b>Lithium-MnO₂</b> cells pair lithium foil with treated MnO₂ in a nonaqueous electrolyte, which is why they reach twice the voltage of the zinc cells above.' }
    ];
    var S1 = [
      { label: 'lead-acid', n: 'Lead-acid', mats: ['lead', 'pbo2'],
        t: '<b>Lead-acid</b> is the most common wet cell: electrodes of lead alloy and lead oxide in dilute sulfuric acid.' },
      { label: 'nickel-cadmium', n: 'Nickel-cadmium', mats: ['zinc', 'carbon'],
        t: '<b>Nickel-cadmium</b> pairs cadmium with nickel oxyhydroxide, NiOOH, in aqueous potassium hydroxide. Cadmium is toxic, which sent the search elsewhere. (Silvery cadmium is drawn with the zinc colour, black NiOOH with the carbon one.)' },
      { label: 'nickel-metal hydride', n: 'Nickel-metal hydride', mats: ['steel', 'carbon'],
        t: '<b>Nickel-metal hydride</b> replaces the cadmium with a metal hydride, against the same NiOOH in potassium hydroxide.' },
      { label: 'nickel-zinc', n: '', mats: ['zinc', 'carbon'],
        t: '<b>Nickel-zinc</b> is another of the secondary batteries in common use.' },
      { label: 'lithium-ion', n: 'Lithium-ion', mats: ['graphite', 'lco'], li: true,
        t: '<b>Lithium-ion</b>: lithium ions move from the negative electrode through the electrolyte to the positive one on discharge, and back on charge. Its cells are sorted two ways, by electrolyte and by shape, below.' }
    ];
    line([[38, 84], [38, 100 + 3 * 34 + 13]]); line([[302, 84], [302, 100 + 4 * 34 + 13]]);
    P1.forEach(function (d, i) { var y = 100 + i * 34; line([[38, y + 13], [48, y + 13]]); d.node = node({ x: 48, y: y, w: 192, label: d.label, mats: d.mats, v: volts(d.n), col: PRI, t: d.t }); });
    var liNode;
    S1.forEach(function (d, i) { var y = 100 + i * 34; line([[302, y + 13], [312, y + 13]]); var o = node({ x: 312, y: y, w: 192, label: d.label, mats: d.mats, v: volts(d.n), col: d.li ? LI : SEC, cls: d.li ? 'strong' : '', t: d.t }); if (d.li) liNode = o; });
    // the lithium-ion cell, sorted two ways
    var yL = 100 + 4 * 34 + 26, yG = 284;
    line([[408, yL], [408, yG - 12], [135, yG - 12], [135, yG]]); line([[408, yG - 12], [385, yG - 12], [385, yG]]);
    el('rect', { x: 20, y: yG, width: 230, height: 86, rx: 10, fill: 'var(--panel-2)', stroke: LI, 'stroke-dasharray': '4 3' }, g);
    el('rect', { x: 270, y: yG, width: 230, height: 86, rx: 10, fill: 'var(--panel-2)', stroke: LI, 'stroke-dasharray': '4 3' }, g);
    txt(g, 135, yG + 18, 'lithium-ion, by electrolyte', 'cyan', 'middle'); txt(g, 385, yG + 18, 'lithium-ion, by shape', 'cyan', 'middle');
    var E = [
      { label: 'liquid', t: '<b>Conventional</b> lithium-ion cells use an organic liquid electrolyte, a lithium salt in organic solvents ({{ch:liquid-electrolytes}}).' },
      { label: 'gel polymer', t: '<b>Polymer</b> lithium-ion cells use a gel polymer electrolyte.' },
      { label: 'solid', t: '<b>Solid</b> lithium-ion cells use a solid electrolyte ({{ch:solid-state}}).' }
    ];
    var SH = [
      { label: 'coin', t: '<b>Coin</b> cells, also called button cells: the laboratory&#8217;s format (figure {{fig:f2-1}}).' },
      { label: 'cylindrical', t: '<b>Cylindrical</b> cells: the layers wound in a spiral in a can (figure {{fig:f2-2}}).' },
      { label: 'prismatic', t: '<b>Prismatic</b> cells: stacked sheets in a rigid rectangular case.' },
      { label: 'pouch', t: '<b>Pouch</b> cells: stacked sheets in a sealed, flexible foil. Figure {{fig:f2-5}} compares the four shapes.' }
    ];
    E.forEach(function (d, i) { node({ x: i < 2 ? 32 + i * 106 : 85, y: i < 2 ? yG + 28 : yG + 56, w: 100, h: 24, label: d.label, col: LI, round: true, t: d.t }); });
    SH.forEach(function (d, i) { node({ x: 282 + (i % 2) * 106, y: yG + 28 + Math.floor(i / 2) * 28, w: 100, h: 24, label: d.label, col: LI, round: true, t: d.t }); });
    function place() {
      nodes.forEach(function (o) { var on = o === sel; o.box.setAttribute('stroke-width', on ? 3 : 1.4); o.box.setAttribute('fill', on ? 'var(--accent-soft)' : 'var(--panel)'); });
      read.innerHTML = sel.t;
    }
    badge(g, 16, 71, 1); badge(g, 506, 71, 2); badge(g, 506, yG - 12, 3);
    steps(fig, [
      { text: '<b>Primary</b> cells are used once and then discarded; the 1.5 V zinc cells of a torch are primary.', on: function () { sel = pri; place(); } },
      { text: '<b>Secondary</b> cells are recharged. The voltage beside each cell is its nominal voltage; only the lithium cells pass 2 V.', on: function () { sel = sec; place(); } },
      { text: 'The <b>lithium-ion</b> cell comes in three electrolytes and four shapes. Tap any box.', on: function () { sel = liNode; place(); } }
    ]);
  });
