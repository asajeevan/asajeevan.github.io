  /* =================================================================
     Module 3: where the voltage comes from. Electron energy after Bard,
     Faulkner and White (B2) 1.1.4 and Figure 1.1.3; the Fermi level and
     equilibrium after 2.2.5; the double layer after 1.6.2, 1.6.3 and
     14.3.1; the ladder after Goodenough and Park 2013 (R6) and Tarascon
     and Armand 2001 (R2); the water window from B2 Table C.1 and 2.1.9.
     ================================================================= */

  /* ===== 3.1 Potential as electron energy: the Fermi level ===== */
  register('f3-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), ESl = fig.querySelector('.E'), Ev = fig.querySelector('.E-val');
    var y0 = 150, sc = 62; // y of E = 0 (the couple's standard potential); px per volt
    var Y = function (E) { return y0 + E * sc; }; // more positive potential: lower on the energy axis
    // axes: energy up on the left, potential down on the right
    var ax = arrow(g, 30, 270, 30, 30, '#A3B6B1', 1.2); txt(g, 22, 150, 'electron energy', '', 'middle', { transform: 'rotate(-90 22 150)' });
    arrow(g, 490, 30, 490, 270, '#A3B6B1', 1.2); txt(g, 502, 150, 'potential E, more positive ↓', '', 'middle', { transform: 'rotate(90 502 150)' });
    [-1.5, -1, -0.5, 0, 0.5, 1, 1.5].forEach(function (v) { el('line', { x1: 484, y1: Y(v), x2: 490, y2: Y(v), stroke: 'var(--line-2)' }, g); txt(g, 478, Y(v) + 4, (v > 0 ? '+' : '') + v.toFixed(1) + ' V', '', 'end'); });
    // the metal: filled states up to the Fermi level
    var xm0 = 70, xm1 = 190;
    el('rect', { x: xm0, y: 30, width: xm1 - xm0, height: 240, fill: 'var(--metal)', 'fill-opacity': '.18', stroke: 'var(--line-2)' }, g);
    var filled = el('rect', { x: xm0, y: Y(0), width: xm1 - xm0, height: 270 - Y(0), fill: 'var(--electron)', 'fill-opacity': '.25' }, g);
    var fermi = el('line', { x1: xm0 - 6, x2: xm1 + 6, y1: Y(0), y2: Y(0), stroke: 'var(--electron)', 'stroke-width': 3 }, g);
    var fLab = txt(g, (xm0 + xm1) / 2, Y(0) - 8, 'Fermi level: transferable electrons', 'cyan', 'middle');
    txt(g, (xm0 + xm1) / 2, 22, 'electrode (metal)', 'strong', 'middle'); txt(g, (xm0 + xm1) / 2, 284, 'filled states below, empty above', '', 'middle');
    // the species in solution: a vacant orbital above, an occupied one below (B2 Figure 1.1.3)
    var xs0 = 280, xs1 = 400, vac = -0.6, occ = 0.6;
    el('rect', { x: xs0 - 20, y: 30, width: xs1 - xs0 + 40, height: 240, fill: 'var(--cyan)', 'fill-opacity': '.08', stroke: 'var(--cyan)', 'stroke-opacity': '.4' }, g);
    txt(g, (xs0 + xs1) / 2, 22, 'species A in solution', 'strong', 'middle');
    el('line', { x1: xs0, x2: xs1, y1: Y(vac), y2: Y(vac), stroke: 'var(--cyan)', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, g); txt(g, (xs0 + xs1) / 2, Y(vac) - 8, 'vacant orbital (empty)', 'cyan', 'middle');
    el('line', { x1: xs0, x2: xs1, y1: Y(occ), y2: Y(occ), stroke: 'var(--cyan)', 'stroke-width': 2 }, g); txt(g, (xs0 + xs1) / 2, Y(occ) + 18, 'occupied orbital (filled)', 'cyan', 'middle');
    el('circle', { cx: (xs0 + xs1) / 2 - 10, cy: Y(occ), r: 3, 'class': 'e-dot' }, g); el('circle', { cx: (xs0 + xs1) / 2 + 10, cy: Y(occ), r: 3, 'class': 'e-dot' }, g);
    var hop = el('circle', { r: 3.5, 'class': 'e-dot anim-only' }, g), hopLab = txt(g, 235, 0, '', 'amber', 'middle');
    var gapL = el('line', { x1: 220, x2: 220, stroke: 'var(--amber)', 'stroke-dasharray': '3 3' }, g), gapT = txt(g, 226, 0, '', 'amber');
    badge(g, 56, 40, 1); badge(g, 500, 24, 2); badge(g, 235, Y(vac) - 30, 3); badge(g, 235, Y(occ) + 34, 4);
    var E = 0, t = 0, mode = 'none';
    function render() {
      E = +ESl.value; setSvgText(Ev, (E > 0 ? '+' : '') + E.toFixed(2) + ' V');
      var y = Y(E);
      fermi.setAttribute('y1', y); fermi.setAttribute('y2', y); filled.setAttribute('y', y); filled.setAttribute('height', 270 - y); fLab.setAttribute('y', y - 8);
      mode = E < vac ? 'red' : E > occ ? 'ox' : 'none';
      gapL.setAttribute('y1', Y(0)); gapL.setAttribute('y2', y); gapT.setAttribute('y', (Y(0) + y) / 2 + 4); setSvgText(gapT, E === 0 ? '' : (E < 0 ? '+' : '−') + Math.abs(E).toFixed(2) + ' eV');
      setSvgText(hopLab, mode === 'red' ? 'reduction: e⁻ metal → A' : mode === 'ox' ? 'oxidation: e⁻ A → metal' : 'no transfer');
      hopLab.setAttribute('y', mode === 'red' ? Y(vac) - 24 : mode === 'ox' ? Y(occ) + 34 : y + 30);
      read.innerHTML = 'Electrode at <b>' + (E > 0 ? '+' : '') + E.toFixed(2) + ' V</b> relative to the couple’s standard potential: every transferable electron on the metal sits <b>' + Math.abs(E).toFixed(2) + ' eV ' + (E < 0 ? 'higher' : E > 0 ? 'lower' : 'from where it was') + '</b>. ' +
        (mode === 'red' ? 'That is above the vacant orbital of A, so electrons flow from the metal into A: a <b>reduction</b> current.' : mode === 'ox' ? 'That is below the occupied orbital of A, so electrons on A find a lower energy on the metal and flow there: an <b>oxidation</b> current.' : 'Between the two orbitals nothing can transfer: no current flows in this window.');
    }
    on(ESl, 'input', render);
    steps(fig, [
      { text: 'The pale line is the <b>Fermi level</b>: the energy of the electrons an electrode can give away or take in. Below it the metal’s states are full, above it empty.' },
      { text: 'Slide the potential. Making the electrode <b>more negative raises</b> its electrons: exactly <b>1 eV per volt</b>, the electron-volt of module 0. The right-hand axis is the same quantity measured as a potential, upside down.' },
      { text: 'Push it high enough and the electrons sit above an <b>empty</b> orbital of a species in the solution: they jump across. A flow of electrons from electrode to solution is a <b>reduction</b> current.' },
      { text: 'Pull it low enough and electrons on a <b>filled</b> orbital in the solution find a lower energy on the metal: they jump the other way, an <b>oxidation</b> current. In between, nothing moves.' }
    ]);
    render();
    var loop = anim(fig, function (dt) {
      if (dt === 0) return; t = (t + dt / 1.6) % 1; var k = smooth(t);
      if (mode === 'red') { hop.setAttribute('cx', lerp(xm1, xs0 + 30, k)); hop.setAttribute('cy', lerp(Y(E), Y(vac), k)); hop.style.display = ''; }
      else if (mode === 'ox') { hop.setAttribute('cx', lerp(xs0 + 30, xm1, k)); hop.setAttribute('cy', lerp(Y(occ), Y(E), k)); hop.style.display = ''; }
      else hop.style.display = 'none';
    }, { autoplay: true, stepDt: 0.25 });
    bind(fig, loop);
  });

  /* ===== 3.2 The interface: the electrical double layer ===== */
  register('f3-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), qSl = fig.querySelector('.q'), qv = fig.querySelector('.q-val'), formBtn = fig.querySelector('.form-btn');
    var xm = 40, xb = 200, xs = 480, yT = 40, yB = 190, qNow = null; // qNow: fractional charge during the replay
    el('rect', { x: xm, y: yT, width: xb - xm, height: yB - yT, fill: 'var(--metal)', 'fill-opacity': '.3', stroke: 'var(--line-2)' }, g);
    el('rect', { x: xb, y: yT, width: xs - xb, height: yB - yT, fill: 'var(--cyan)', 'fill-opacity': '.1', stroke: 'var(--cyan)', 'stroke-opacity': '.4' }, g);
    txt(g, (xm + xb) / 2, yT - 12, 'metal', 'strong', 'middle'); txt(g, (xb + xs) / 2, yT - 12, 'electrolyte', 'strong', 'middle');
    var surf = el('g', {}, g), compact = el('g', {}, g), diffuse = el('g', {}, g), solv = el('g', {}, g);
    // scale brackets
    el('path', { d: 'M196,' + (yB + 6) + ' v6 h8 v-6', fill: 'none', stroke: 'var(--muted)' }, g); txt(g, 198, yB + 26, '< 1 nm: the metal’s charge', '', 'end');
    el('path', { d: 'M212,' + (yT - 2) + ' v-6 h90 v6', fill: 'none', stroke: 'var(--muted)' }, g); txt(g, 257, yT - 30, 'diffuse layer: < 10 nm above 0.01 M', '', 'middle');
    txt(g, 214, yB + 26, 'compact layer', '', 'start');
    // strip: potential across the interface (B2 Figure 1.6.3b)
    var strip = phiStrip(g, { x: xm, y: 228, w: xs - xm, h: 64 }, [], { vmin: -1.1, vmax: 1.1, label: 'φ', units: '', xlabel: 'position across the interface: metal → compact layer → diffuse layer → bulk' });
    var fLab = txt(g, 472, 250, '', 'field', 'end');
    badge(g, xb - 36, yT + 16, 1); badge(g, 330, yT + 16, 2); badge(g, 100, 244, 3); badge(g, 500, 246, 4);
    function render() {
      var q = qNow === null ? +qSl.value : qNow; setSvgText(qv, q > 0 ? 'positive' : q < 0 ? 'negative' : 'zero');
      clear(surf); clear(compact); clear(diffuse); clear(solv);
      var n = Math.abs(q), s = q > 0 ? 1 : -1; if (Math.abs(q) < 0.05) { n = 0; }
      for (var i = 0; i < 7; i++) { var y = yT + 14 + i * 22; if (i < n * 3.5) charge(surf, xb - 7, y, 5, s); }
      for (i = 0; i < 6; i++) { var y2 = yT + 20 + i * 24; el('circle', { cx: xb + 9, cy: y2, r: 3, fill: 'var(--cyan)', 'fill-opacity': '.5' }, solv); if (i < n * 3) { charge(compact, xb + 22, y2, 5, -s); el('circle', { cx: xb + 22, cy: y2, r: 9, fill: 'none', stroke: 'var(--cyan)', 'stroke-opacity': '.6' }, compact); } }
      // diffuse layer on a fixed grid: denser near the surface, a few co-ions, no two on top of each other
      var grid = [[0, 0, -1], [0, 2, -1], [0, 4, -1], [1, 1, -1], [1, 3, -1], [1, 5, 1], [2, 0, -1], [2, 4, -1], [3, 2, -1], [3, 5, -1], [4, 1, 1], [4, 3, -1], [5, 0, -1], [5, 4, 1]];
      grid.forEach(function (c, i) { if (i < 4 + n * 5) charge(diffuse, xb + 44 + c[0] * 22, yT + 16 + c[1] * 26, 4, c[2] * -s * -1 === -s ? -s : s); });
      var phiM = 0.45 * q, phiS = 0;
      var pts = [{ x: 0, phi: phiM }, { x: (xb - xm) / (xs - xm), phi: phiM }]; var x2 = (xb + 22 - xm) / (xs - xm); pts.push({ x: x2, phi: phiM * 0.28 });
      for (var k = 1; k <= 12; k++) { var f = k / 12; pts.push({ x: x2 + f * ((xb + 130 - xm) / (xs - xm) - x2), phi: phiM * 0.28 * Math.exp(-4 * f) }); } pts.push({ x: 1, phi: phiS });
      strip.update(pts);
      setSvgText(fLab, q === 0 ? 'no excess charge: no jump' : 'field up to 10⁷ V/cm in the jump');
      if (qNow !== null) { read.innerHTML = 'Forming: ions cross the boundary, the separated charge grows, and the field it builds pulls back harder on each next ion. When the electrical pull balances the chemical push, the crossing stops.'; return; }
      read.innerHTML = q === 0 ? 'No excess charge on the metal, no countercharge in the liquid, no jump in potential: this is the potential of zero charge. Slide the charge to either side.'
        : 'The metal carries an excess of ' + (q > 0 ? 'positive charge (a deficiency of electrons)' : 'negative charge (extra electrons)') + ' in a layer thinner than a nanometre at its surface. The liquid answers with an equal and opposite charge: ' + (q > 0 ? 'anions' : 'solvated cations') + ' in a compact layer one solvent molecule out, and a diffuse tail beyond. The potential drops by ' + Math.abs(phiM).toFixed(1) + ' V across a few nanometres: the interfacial jump of figure 1.1, seen up close.';
    }
    on(qSl, 'input', function () { qNow = null; render(); }); render();
    var formT = 0, forming = false;
    function tick(dt) {
      if (dt === 0 || !forming) return;
      formT += dt; var target = +qSl.value || -2; var k = Math.min(1, formT / 2.2);
      qNow = target * (1 - Math.exp(-4 * k)) / (1 - Math.exp(-4));
      if (k >= 1) { forming = false; qNow = null; loop.stop(); }
      render();
    }
    steps(fig, [
      { text: 'Excess charge on a conductor sits at its <b>surface</b> (module 0). On an electrode it lies in a layer less than a nanometre thick, an excess or deficiency of electrons.' },
      { text: 'The liquid answers with an <b>equal and opposite</b> charge: ions of the other sign crowd the surface. Solvated ions stop one solvent molecule out (the compact layer); thermal motion smears the rest into a diffuse layer a few nanometres deep.' },
      { text: 'Two sheets of opposite charge a molecular distance apart: the potential <b>jumps</b> across them. That is where the steps of figure 1.1 live, and the field inside them can reach 10⁷ V/cm.' },
      { text: 'Two sheets of charge a distance apart is a <b>capacitor</b>: q = C·E, with 10 to 40 µF per cm² of electrode. Change the electrode’s potential and a charging current flows for about 10⁻⁸ s, with no chemistry at all.' },
      { text: '<b>How it forms.</b> Dip zinc into its salt: a few Zn²⁺ leave the metal and their electrons stay behind, so the metal goes negative and the liquid beside it positive. That separated charge is the field; it grows until its pull on the next ion balances the chemical push. Press Play or “Replay the formation”.', on: function () { startForming(); } }
    ]);
    var loop = anim(fig, tick, { autoplay: false, stepDt: 0.3 });
    function startForming() { if (+qSl.value === 0) qSl.value = -2; formT = 0; forming = true; qNow = 0; loop.wanted = true; if (motion) loop.start(); else { qNow = null; render(); } }
    on(formBtn, 'click', startForming);
    bind(fig, loop);
  });

  /* ===== 3.3 The potential ladder, with the water window in its right place ===== */
  register('f3-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), selN = fig.querySelector('select[data-side=neg]'), selP = fig.querySelector('select[data-side=pos]');
    var read = fig.querySelector('.readout'), flags = fig.querySelector('.flags'), aq = fig.querySelector('input[type=checkbox]'), pHSl = fig.querySelector('.pH'), pHv = fig.querySelector('.pH-val');
    var y = function (V) { return 322 - V * 58; };
    el('line', { x1: 44, y1: 26, x2: 44, y2: 326, stroke: 'var(--line-2)' }, g);
    for (var v = 0; v <= 5; v++) { el('line', { x1: 40, y1: y(v), x2: 44, y2: y(v), stroke: 'var(--line-2)' }, g); txt(g, 36, y(v) + 4, v + ' V', '', 'end'); }
    txt(g, 14, 180, 'potential vs Li/Li⁺ (energy per unit charge)', '', 'middle', { transform: 'rotate(-90 14 180)' });
    arrow(g, 228, 296, 228, 324, '#C4B5F7', 1.2); txt(g, 246, 308, 'electron energy', 'field', 'start'); txt(g, 246, 322, 'higher ↓', 'field', 'start');
    txt(g, 140, 20, 'negative electrodes', 'cyan', 'middle'); txt(g, 390, 20, 'positive electrodes', 'amber', 'middle');
    var w = P.data.carbonateWindow;
    var bands = el('g', {}, g);
    el('rect', { x: 222, y: y(w.high), width: 62, height: y(w.low) - y(w.high), fill: 'var(--cyan)', 'fill-opacity': '.16', stroke: 'var(--cyan)', 'stroke-opacity': '.5', rx: 4 }, bands);
    txt(bands, 253, y(w.high) - 6, 'carbonate', 'cyan', 'middle'); txt(bands, 253, y(w.high) + 14, 'electrolyte', 'cyan', 'middle'); txt(bands, 253, y(w.high) + 28, 'stable', 'cyan', 'middle'); txt(bands, 253, y(w.low) + 14, '1.1 to 4.3 V', 'cyan', 'middle');
    var aqG = el('g', { style: 'display:none' }, g);
    var aqBand = el('rect', { x: 304, y: 0, width: 26, height: 0, fill: 'var(--amber)', 'fill-opacity': '.18', stroke: 'var(--amber)', 'stroke-opacity': '.6', rx: 3 }, aqG);
    var aqT1 = txt(aqG, 317, 0, 'water', 'amber', 'middle'), aqT2 = txt(aqG, 317, 0, '', 'amber', 'middle'), aqT3 = txt(aqG, 317, 0, '', 'amber', 'middle');
    var rungs = el('g', {}, g), marks = {}, prevV = { neg: -9, pos: -9 }, prevT = { neg: null, pos: null };
    P.data.ladder.forEach(function (r) {
      var left = r.side === 'neg', x1 = left ? 78 : 346, x2 = left ? 214 : 476;
      var crowded = (r.V - prevV[r.side]) < 0.3;
      if (crowded && prevT[r.side]) prevT[r.side].setAttribute('y', y(prevV[r.side]) + 14);
      prevV[r.side] = r.V;
      var rg = el('g', { 'class': 'rung', 'data-key': r.key }, rungs);
      el('line', { x1: x1, y1: y(r.V), x2: x2, y2: y(r.V), stroke: left ? 'var(--cyan)' : 'var(--amber)', 'stroke-width': 2 }, rg);
      var t = txt(rg, left ? x2 - 4 : x1 + 4, y(r.V) - 5, r.name + ' ' + r.V.toFixed(r.V === 4.75 ? 2 : 1) + (r.key === 's' ? ' (Li–S, conversion)' : ''), '', left ? 'end' : 'start'); prevT[r.side] = t;
      marks[r.key] = rg;
      var o = document.createElement('option'); o.value = r.key; setSvgText(o, r.name + ' (' + r.V.toFixed(r.V === 4.75 ? 2 : 1) + ' V)'); (left ? selN : selP).appendChild(o);
    });
    var brace = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }, g);
    el('rect', { x: 227, y: 0, width: 52, height: 18, rx: 4, fill: 'var(--bg-2)', 'class': 'brace-bg' }, g);
    var braceBg = g.lastChild, braceT = txt(g, 253, 0, '', 'strong', 'middle');
    badge(g, 30, 14, 1); badge(g, 300, 14, 2); badge(g, 190, 248, 3); var b4 = badge(g, 317, 0, 4);
    function renderAq() {
      var pH = +pHSl.value, ww = P.waterWindowVsLi(pH); setSvgText(pHv, 'pH ' + pH);
      aqBand.setAttribute('y', y(ww.high)); aqBand.setAttribute('height', y(ww.low) - y(ww.high));
      aqT1.setAttribute('y', y(ww.high) - 20); aqT2.setAttribute('y', y(ww.high) - 6); setSvgText(aqT2, 'O₂ ' + ww.high.toFixed(2));
      aqT3.setAttribute('y', y(ww.low) + 16); setSvgText(aqT3, 'H₂ ' + ww.low.toFixed(2));
      b4.setAttribute('transform', 'translate(317,' + (y(ww.low) + 34) + ')');
      var s = aq.checked ? '' : 'none'; aqG.style.display = s; b4.style.display = s;
    }
    function render() {
      var n = rung(cell.neg), p = rung(cell.pos), V = p.V - n.V;
      for (var k in marks) marks[k].classList.toggle('picked', k === cell.neg || k === cell.pos);
      brace.setAttribute('d', 'M253,' + y(n.V) + ' L253,' + y(p.V));
      var ym = (y(n.V) + y(p.V)) / 2; braceBg.setAttribute('y', ym - 9); braceT.setAttribute('y', ym + 4); setSvgText(braceT, V.toFixed(2) + ' V');
      read.innerHTML = 'Your cell: <b>' + n.name + '</b> against <b>' + p.name + '</b>. Open-circuit voltage about <b>' + V.toFixed(2) + ' V</b>: the difference of the two rungs, which is the difference of the two electron energies in electron-volts.';
      var f = '';
      f += n.V < w.low ? '<span class="flag warn">negative electrode above the electrolyte’s empty level: the electrolyte is reduced unless a passivating layer forms (the SEI of module 6)</span>' : '<span class="flag ok">negative electrode inside the window: no passivating layer needed</span>';
      f += p.V > w.high ? '<span class="flag warn">positive electrode below the electrolyte’s filled level: the electrolyte is oxidized unless a layer forms</span>' : '<span class="flag ok">positive electrode inside the window</span>';
      flags.innerHTML = f; selN.value = cell.neg; selP.value = cell.pos;
    }
    on(selN, 'change', function () { setCell(selN.value, cell.pos); }); on(selP, 'change', function () { setCell(cell.neg, selP.value); });
    on(aq, 'change', renderAq); on(pHSl, 'input', renderAq);
    cellListeners.push(render); render(); renderAq();
    steps(fig, [
      { text: 'The axis is a <b>potential</b>: energy per unit charge, measured against lithium metal, which sits at 0. Up the axis the potential is more positive, so the electron energy is <b>lower</b> (the lilac arrow points the other way).' },
      { text: 'Each material is a rung. Pick a negative and a positive electrode; the cell voltage is the <b>gap</b> between the rungs, and it travels with you through the rest of the page.' },
      { text: 'The cyan band is where the carbonate electrolytes of lithium-ion cells are stable, between their filled and empty levels: about 1.1 to 4.3 V. A rung outside it needs a protective layer (module 6).' },
      { text: 'Tick the water window. Water is stable over only 1.23 V, and where that window sits depends on pH: 3.05 to 4.27 V versus lithium in acid, sliding 59 mV lower per pH unit. Every rung below about 3 V is out of reach for a water-based cell.', on: function () { aq.checked = true; renderAq(); } }
    ]);
  });

  /* ===== 3.4 The electron energy picture, with the wire ===== */
  register('f3-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var Y = function (V) { return 70 + V * 40; }; // energy axis: potential downward
    var w = P.data.carbonateWindow;
    arrow(g, 26, 262, 26, 44, '#A3B6B1', 1.2); txt(g, 16, 150, 'electron energy ↑', '', 'middle', { transform: 'rotate(-90 16 150)' });
    txt(g, 110, 40, 'negative electrode', 'strong', 'middle'); txt(g, 260, 40, 'electrolyte', 'strong', 'middle'); txt(g, 410, 40, 'positive electrode', 'strong', 'middle');
    el('rect', { x: 200, y: Y(w.low), width: 120, height: Y(w.high) - Y(w.low), fill: 'var(--cyan)', 'fill-opacity': '.12', rx: 4 }, g);
    el('line', { x1: 200, x2: 320, y1: Y(w.low), y2: Y(w.low), stroke: 'var(--cyan)', 'stroke-width': 2 }, g); txt(g, 260, Y(w.low) - 6, 'lowest empty level (LUMO)', 'cyan', 'middle');
    el('line', { x1: 200, x2: 320, y1: Y(w.high), y2: Y(w.high), stroke: 'var(--cyan)', 'stroke-width': 2 }, g); txt(g, 260, Y(w.high) + 16, 'highest filled level (HOMO)', 'cyan', 'middle');
    txt(g, 260, (Y(w.low) + Y(w.high)) / 2 + 4, 'window: 3.2 eV', 'cyan', 'middle');
    var muA = el('line', { x1: 60, x2: 160, stroke: 'var(--metal)', 'stroke-width': 3 }, g), muAt = txt(g, 68, 0, '', '');
    var muC = el('line', { x1: 360, x2: 476, stroke: 'var(--amber-2)', 'stroke-width': 3 }, g), muCt = txt(g, 360, 0, '', '');
    var warnA = txt(g, 68, 0, 'above the LUMO: layer needed', 'amber'), warnC = txt(g, 360, 0, 'below the HOMO: oxidation', 'amber');
    var gap = el('line', { x1: 340, x2: 340, stroke: 'var(--amber)', 'stroke-dasharray': '4 3' }, g), gapT = txt(g, 346, 0, '', 'strong');
    // the external circuit: a wire above the diagram; the electron goes round, never through the electrolyte
    var wire = el('path', { d: 'M60,0 L60,26 L476,26 L476,0', fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g);
    txt(g, 260, 14, 'external circuit: the electron goes round', 'cyan', 'middle');
    var eDot = el('circle', { r: 4, 'class': 'e-dot anim-only' }, g);
    var ion = ourIon(g, 170, 0, 5, 'our ion (Li⁺) goes through', true); ion.g.classList.add('anim-only');
    var x1 = txt(g, 260, 276, 'no electrons cross the electrolyte; only ions do', '', 'middle');
    var b1 = badge(g, 110, 112, 1); badge(g, 340, 56, 2); badge(g, 120, 14, 3); badge(g, 500, 150, 4);
    var n, p, t = 0;
    function render() {
      n = rung(cell.neg); p = rung(cell.pos);
      muA.setAttribute('y1', Y(n.V)); muA.setAttribute('y2', Y(n.V)); muC.setAttribute('y1', Y(p.V)); muC.setAttribute('y2', Y(p.V));
      muAt.setAttribute('y', Y(n.V) - 6); setSvgText(muAt, 'μ_A: ' + n.name); muCt.setAttribute('y', Y(p.V) + 16); setSvgText(muCt, 'μ_C: ' + p.name);
      warnA.setAttribute('y', Y(n.V) + 16); warnA.style.display = n.V < w.low ? '' : 'none'; warnC.setAttribute('y', Y(p.V) + 30); warnC.style.display = p.V > w.high ? '' : 'none';
      gap.setAttribute('y1', Y(n.V)); gap.setAttribute('y2', Y(p.V)); gapT.setAttribute('y', (Y(n.V) + Y(p.V)) / 2 + 4); setSvgText(gapT, 'e·V_OC = ' + (p.V - n.V).toFixed(2) + ' eV');
      wire.setAttribute('d', 'M60,' + Y(n.V) + ' L60,26 L476,26 L476,' + Y(p.V)); b1.setAttribute('transform', 'translate(110,' + (Y(n.V) + 34) + ')');
      read.innerHTML = 'An electron on the negative electrode sits <b>' + (p.V - n.V).toFixed(2) + ' eV</b> above one on the positive electrode. Divided by the electron charge that is the open-circuit voltage, V_OC = (μ_A − μ_C)/e. The electron gives up that energy only by going round the external circuit; inside the cell our ion crosses the electrolyte to keep the charge balanced.' + (n.V < w.low ? ' The negative electrode lies above the electrolyte’s empty level, so the electrolyte would be reduced there unless a passivating layer forms.' : '') + (p.V > w.high ? ' The positive electrode lies below the filled level, so the electrolyte would be oxidized there unless a layer forms.' : '');
    }
    cellListeners.push(render); render();
    steps(fig, [
      { text: 'μ_A and μ_C are the electron energies of the two electrodes: the Fermi levels of figure 3.1, drawn on one axis. Higher means the electron is held less tightly.' },
      { text: 'The electrolyte is stable only between its <b>lowest empty level</b> and its <b>highest filled level</b> (chemists call them LUMO and HOMO): an electrode above the first reduces it, one below the second oxidizes it.' },
      { text: 'Press Play. The electron leaves the negative electrode, travels along the wire <b>outside</b> the cell and drops onto the positive electrode; the energy it gives up on the way, e·V_OC, is the lamp of module 1. Our ion crosses the electrolyte inside.' },
      { text: 'Same numbers as the ladder of figure 3.3, axis turned upside down: a rung at x volts is an electron energy x eV below lithium’s.' }
    ]);
    var loop = anim(fig, function (dt) {
      if (dt === 0) return; t = (t + dt / 3) % 1; var k = smooth(Math.min(1, t / 0.85));
      var ya = Y(n.V), yc = Y(p.V);
      var L1 = ya - 26, L2 = 416, L3 = yc - 26, L = L1 + L2 + L3, s = k * L, x, y;
      if (s < L1) { x = 60; y = ya - s; } else if (s < L1 + L2) { x = 60 + (s - L1); y = 26; } else { x = 476; y = 26 + (s - L1 - L2); }
      eDot.setAttribute('cx', x); eDot.setAttribute('cy', y);
      ion.move(lerp(178, 342, k), (Y(w.low) + Y(w.high)) / 2 + 26);
    }, { autoplay: true, stepDt: 0.3 });
    bind(fig, loop);
  });

  /* ===== 3.5 Why oxides give 4 V and sulfides about 2.5 V ===== */
  register('f3-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg);
    var Y = function (eV) { return 44 + eV * 42; }; // eV below the lithium level, downward
    el('line', { x1: 60, x2: 470, y1: Y(0), y2: Y(0), stroke: 'var(--metal)', 'stroke-width': 2.5 }, g); txt(g, 62, Y(0) + 15, 'μ_A(Li): the lithium level, 0 eV', '');
    txt(g, 155, 26, 'layered sulfide LiMS₂', 'strong', 'middle'); txt(g, 365, 26, 'layered oxide LiMO₂', 'strong', 'middle');
    el('rect', { x: 100, y: Y(2.5), width: 110, height: Y(4.15) - Y(2.5), fill: '#c9a35c', 'fill-opacity': '.35', stroke: '#c9a35c', 'stroke-opacity': '.6' }, g); txt(g, 155, Y(3.6), 'S-3p band (filled)', '', 'middle'); txt(g, 155, Y(3.95), 'top 2.5 eV below', '', 'middle');
    el('rect', { x: 310, y: Y(4.0), width: 110, height: Y(5.1) - Y(4.0), fill: 'var(--heat)', 'fill-opacity': '.3', stroke: 'var(--heat)', 'stroke-opacity': '.6' }, g); txt(g, 365, Y(4.6), 'O-2p band (filled)', '', 'middle'); txt(g, 365, Y(4.95), 'top 4.0 eV below', '', 'middle');
    [[155, 2.5, 'about 2.5 V'], [365, 4.0, 'about 4 V']].forEach(function (c) {
      el('line', { x1: c[0] - 55, x2: c[0] + 55, y1: Y(c[1]) - 3, y2: Y(c[1]) - 3, stroke: 'var(--amber)', 'stroke-width': 3 }, g); (function () {})();
      txt(g, c[0] - 6, Y(c[1]) - 24, 'M(IV)/M(III) couple', 'amber', 'middle'); txt(g, c[0] - 6, Y(c[1]) - 10, 'pinned: ' + c[2], 'amber', 'middle');
      arrow(g, c[0] + 66, Y(c[1]) - 40, c[0] + 66, Y(c[1]) - 8, '#F0B441', 1.4); txt(g, c[0] + 72, Y(c[1]) - 36, 'cannot', 'amber', 'start'); txt(g, c[0] + 72, Y(c[1]) - 22, 'go lower', 'amber', 'start');
    });
    el('line', { x1: 60, x2: 470, y1: Y(4.3), y2: Y(4.3), stroke: 'var(--cyan)', 'stroke-dasharray': '5 3' }, g); txt(g, 62, Y(4.3) + 15, 'carbonate HOMO: 4.3 eV below', 'cyan');
    arrow(g, 30, Y(0.3), 30, Y(4.6), '#A3B6B1', 1.2); txt(g, 22, Y(2.4), 'electron energy, eV below Li', '', 'middle', { transform: 'rotate(-90 22 ' + Y(2.4) + ')' });
    badge(g, 300, Y(0) + 18, 1); badge(g, 84, Y(2.5) + 18, 2); badge(g, 262, Y(1.0), 3); badge(g, 480, Y(4.3) + 18, 4);
    steps(fig, [
      { text: 'The top line is the lithium level, the electron energy of a lithium metal electrode. Every positive-electrode energy is measured down from it, in electron-volts, which is the ladder’s volts.' },
      { text: 'Each host has a filled band of anion states, a continuum of electron levels made from the anions’ p orbitals. Its top lies about <b>2.5 eV</b> below lithium in a sulfide and about <b>4.0 eV</b> below in an oxide.' },
      { text: 'The transition-metal couple that stores the electrons cannot be pushed <b>below the top of that band</b>: it is pinned there. So a sulfide positive electrode gives about 2.5 V and an oxide about 4 V.' },
      { text: 'The carbonate electrolyte’s own filled level sits about 4.3 eV below lithium, just under the oxide band top: the oxide’s 4 V fits inside the window with little to spare, which is why oxide hosts run today’s cells.' }
    ]);
  });

  /* ===== 3.6 From reaction energy to voltage: dG = -nFE ===== */
  register('f3-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), n = fig.querySelector('input[data-p=n]'), E = fig.querySelector('input[data-p=E]'), read = fig.querySelector('.readout'), nl = fig.querySelector('.n-val'), El = fig.querySelector('.E-val'), presets = fig.querySelectorAll('button[data-preset]');
    txt(g, 40, 26, 'electrical energy available per mole of reaction, −ΔG = nFE', 'strong');
    el('rect', { x: 40, y: 40, width: 440, height: 30, rx: 4, fill: 'var(--amber)', 'fill-opacity': '.15' }, g);
    var bar = el('rect', { x: 40, y: 40, width: 0, height: 30, rx: 4, fill: 'var(--amber)' }, g);
    [0, 100, 200, 300, 400, 500].forEach(function (k) { el('line', { x1: 40 + k * 0.88, y1: 70, x2: 40 + k * 0.88, y2: 76, stroke: 'var(--line-2)' }, g); txt(g, 40 + k * 0.88, 90, k + (k === 500 ? ' kJ/mol' : ''), '', k === 0 ? 'start' : k === 500 ? 'end' : 'middle'); });
    var dan = el('line', { x1: 0, x2: 0, y1: 36, y2: 74, stroke: 'var(--cyan)', 'stroke-width': 2 }, g), danT = txt(g, 0, 110, 'Daniell cell: 213 kJ/mol', 'cyan', 'middle');
    var vt = txt(g, 0, 60, '', 'strong', 'start');
    badge(g, 20, 55, 1); badge(g, 500, 55, 2);
    function render() {
      var nn = +n.value, EE = +E.value, dG = P.reactionEnergy(nn, EE) / 1000;
      var wpx = Math.min(440, -dG * 0.88); bar.setAttribute('width', String(wpx));
      vt.setAttribute('x', wpx > 300 ? 40 + wpx - 6 : 40 + wpx + 6); vt.setAttribute('text-anchor', wpx > 300 ? 'end' : 'start'); vt.style.fill = wpx > 300 ? '#1a1405' : ''; setSvgText(vt, Math.round(-dG) + ' kJ/mol');
      var dx = 40 + 212.8 * 0.88; dan.setAttribute('x1', dx); dan.setAttribute('x2', dx); danT.setAttribute('x', dx);
      setSvgText(nl, nn); setSvgText(El, EE.toFixed(2) + ' V');
      read.innerHTML = 'ΔG = −nFE = −' + nn + ' × 96 485 C/mol × ' + EE.toFixed(2) + ' V = <b>−' + fmt(-dG, 0) + ' kJ/mol</b>. Per electron that is ' + EE.toFixed(2) + ' eV: the cell voltage is the reaction’s free energy per unit of charge, and nF, the charge per mole, is its capacity factor.';
    }
    Array.prototype.forEach.call(presets, function (b) { on(b, 'click', function () {
      var k = b.getAttribute('data-preset');
      if (k === 'daniell') { n.value = 2; E.value = P.data.daniell.E.toFixed(2); } else { var p = rung(cell.pos), q = rung(cell.neg); n.value = 1; E.value = (p.V - q.V).toFixed(2); }
      render();
    }); });
    on(n, 'input', render); on(E, 'input', render); render();
    steps(fig, [
      { text: 'The bar is the energy a mole of reaction can deliver as electricity: <b>−ΔG = nFE</b>. Doubling the electrons per formula unit, n, doubles it; so does doubling the voltage.' },
      { text: 'The cyan mark is the Daniell cell: n = 2, E = 1.10 V, −ΔG = 213 kJ per mole of zinc. Tap “Daniell cell”, then “your cell”, and compare.' }
    ]);
  });
