  /* =================================================================
     Module 0: charge, field, potential, voltage. Every number drawn is
     computed in physics.js from the equations of Bard, Faulkner and
     White (B2): Coulomb's law (14.3.1 footnote 6), the field and the
     potential (2.2.1), the electron-volt (1.1.4), current (1.1.5),
     Ohm's law (4.2), mobility (2.3.3).
     ================================================================= */
  var VNM = P.e / (4 * Math.PI * P.eps0 * 1e-9); // potential 1 nm from one elementary charge: 1.44 V

  /* ===== 0.1 Two charges and the force between them ===== */
  register('f0-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var rSl = fig.querySelector('.r'), rv = fig.querySelector('.r-val'), sgn = fig.querySelectorAll('button[data-q]');
    var q1 = 1, q2 = 1, y = 118, xa = 150;
    txt(g, 260, 22, 'two charges in vacuum, r apart', 'strong', 'middle');
    var line = el('line', { y1: y, y2: y, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
    var rlab = txt(g, 0, y + 30, '', '', 'middle');
    var rbar = el('path', { fill: 'none', stroke: 'var(--muted)' }, g);
    var fa = el('line', { 'class': 'force-arrow', y1: y, y2: y }, g), fb = el('line', { 'class': 'force-arrow', y1: y, y2: y }, g);
    fa.setAttribute('marker-end', marker(svg, '#F0B441')); fb.setAttribute('marker-end', marker(svg, '#F0B441'));
    var ca = null, cb = null, fLab = txt(g, 0, y - 64, '', 'amber', 'middle'), fLab2 = txt(g, 0, y - 50, '', 'amber', 'middle');
    var fieldLab = txt(g, 0, y + 58, '', 'field', 'middle');
    var fieldArr = el('line', { 'class': 'field-arrow', y1: y + 44, y2: y + 44 }, g); fieldArr.setAttribute('marker-end', marker(svg, '#C4B5F7'));
    badge(g, xa - 34, y - 30, 1); var b2 = badge(g, 0, 0, 2); var b3 = badge(g, 0, 0, 3);
    txt(g, 260, 218, 'F = q q′ / (4π ε₀ r²)      ε₀ = 8.85 × 10⁻¹² C² N⁻¹ m⁻²', '', 'middle');
    function render() {
      var r = +rSl.value; rv.textContent = r.toFixed(1) + ' nm';
      var d = 40 + r * 62, xb = xa + d;
      line.setAttribute('x1', xa); line.setAttribute('x2', xb);
      rbar.setAttribute('d', 'M' + xa + ',' + (y + 18) + ' v6 M' + xb + ',' + (y + 18) + ' v6 M' + xa + ',' + (y + 21) + ' H' + xb);
      rlab.setAttribute('x', (xa + xb) / 2); rlab.textContent = 'r = ' + r.toFixed(1) + ' nm';
      if (ca) g.removeChild(ca); if (cb) g.removeChild(cb);
      ca = charge(g, xa, y, 11, q1); cb = charge(g, xb, y, 11, q2);
      var F = P.coulombForce(q1 * P.e, q2 * P.e, r * 1e-9), F2 = P.coulombForce(P.e, P.e, 2e-9);
      var L = Math.min(110, 30 * Math.sqrt(Math.abs(F) / F2)), rep = F > 0;
      // force on a: away from b if repulsive
      fa.setAttribute('x1', xa + (rep ? -14 : 14)); fa.setAttribute('x2', xa + (rep ? -14 - L : 14 + L));
      fb.setAttribute('x1', xb + (rep ? 14 : -14)); fb.setAttribute('x2', xb + (rep ? 14 + L : -14 - L));
      fa.style.display = fb.style.display = L < 18 && Math.abs(F) < F2 ? '' : '';
      fLab.setAttribute('x', (xa + xb) / 2); fLab.textContent = (rep ? 'repel' : 'attract') + ': F = ' + fmt(Math.abs(F) * 1e12, Math.abs(F) * 1e12 < 10 ? 2 : 0) + ' pN on each';
      fLab2.setAttribute('x', (xa + xb) / 2); fLab2.textContent = 'same size on both, opposite directions';
      b2.setAttribute('transform', 'translate(' + ((xa + xb) / 2) + ',' + (y + 18 + 24) + ')');
      b3.setAttribute('transform', 'translate(' + (xb + 34) + ',' + (y - 30) + ')');
      // the field of a at b's place: force per unit charge, direction away from a if a is +
      var E = P.fieldOfCharge(q1 * P.e, r * 1e-9);
      fieldArr.setAttribute('x1', xb); fieldArr.setAttribute('x2', xb + (q1 > 0 ? 1 : -1) * Math.min(90, 26 * Math.sqrt(Math.abs(E) / P.fieldOfCharge(P.e, 2e-9))));
      fieldLab.setAttribute('x', xb); fieldLab.textContent = 'field of q at q′: ' + fmt(Math.abs(E) * 1e-9, 2) + ' V/nm';
      read.innerHTML = 'F = (' + (q1 > 0 ? '+' : '−') + 'e)(' + (q2 > 0 ? '+' : '−') + 'e) / (4π ε₀ r²) with r = ' + r.toFixed(1) + ' nm: <b>' + fmt(Math.abs(F) * 1e12, Math.abs(F) * 1e12 < 10 ? 2 : 1) + ' pN</b>, ' + (rep ? 'pushing the charges apart' : 'pulling them together') + '. Halve r and the force is four times larger.';
    }
    Array.prototype.forEach.call(sgn, function (b) { on(b, 'click', function () {
      var which = b.getAttribute('data-q'); if (which === 'a') q1 = -q1; else q2 = -q2;
      Array.prototype.forEach.call(sgn, function (x) { x.textContent = (x.getAttribute('data-q') === 'a' ? 'q: ' : 'q′: ') + ((x.getAttribute('data-q') === 'a' ? q1 : q2) > 0 ? '+e (tap to flip)' : '−e (tap to flip)'); });
      render();
    }); });
    on(rSl, 'input', render); render();
    steps(fig, [
      { text: 'Two charges push on each other. The force on each has the <b>same size</b>; like signs push apart, unlike signs pull together. Tap a charge button to flip its sign.' },
      { text: 'Drag the distance slider. Doubling <b>r</b> cuts the force to a quarter: the force falls with the <b>square</b> of the distance (Coulomb’s law).' },
      { text: 'Take q′ away in your mind. The push it would feel is still there at that spot: the <b>field</b> of q, the force per unit charge (lilac arrow). Figure 0.2 maps it.' }
    ]);
  });

  /* ===== 0.2 Field probe and the potential around a charge ===== */
  register('f0-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var rSl = fig.querySelector('.r'), rv = fig.querySelector('.r-val'), sgnBtn = fig.querySelector('button[data-probe]');
    var cx = 140, cy = 150, qp = 1, sc = 24; // px per nm
    // field arrows on rings (computed lengths, 1/r^2)
    var arrows = el('g', {}, g);
    [1.2, 2.2, 3.4].forEach(function (rn) {
      for (var k = 0; k < 8; k++) {
        var a = k * Math.PI / 4, E = P.fieldOfCharge(P.e, rn * 1e-9), L = 46 * Math.sqrt(E / P.fieldOfCharge(P.e, 1e-9));
        var x1 = cx + rn * sc * Math.cos(a), y1 = cy + rn * sc * Math.sin(a);
        arrow(arrows, x1, y1, x1 + L * Math.cos(a), y1 + L * Math.sin(a), '#C4B5F7', 1.4, 'field-arrow');
      }
    });
    charge(g, cx, cy, 12, 1);
    txt(g, cx, 24, 'the field around one positive charge', 'strong', 'middle');
    txt(g, cx, 286, 'arrow length: field strength (1/r²)', 'field', 'middle');
    // inset: potential against distance
    var px0 = 318, px1 = 500, py0 = 250, py1 = 60;
    el('line', { x1: px0, y1: py0, x2: px1, y2: py0, stroke: 'var(--line-2)' }, g); el('line', { x1: px0, y1: py0, x2: px0, y2: py1, stroke: 'var(--line-2)' }, g);
    txt(g, px1, py0 + 32, 'distance r, nm', '', 'end'); txt(g, px0 - 4, py1 - 8, 'φ, V', 'phi', 'end');
    [1, 2, 3, 4, 5].forEach(function (n) { var x = px0 + (n / 5.5) * (px1 - px0); el('line', { x1: x, y1: py0, x2: x, y2: py0 + 4, stroke: 'var(--line-2)' }, g); txt(g, x, py0 + 16, n, '', 'middle'); });
    [0.5, 1.0, 1.5].forEach(function (v) { var yy = py0 - (v / 1.6) * (py0 - py1); el('line', { x1: px0 - 4, y1: yy, x2: px0, y2: yy, stroke: 'var(--line-2)' }, g); txt(g, px0 - 7, yy + 4, v.toFixed(1), 'phi', 'end'); });
    var d = ''; for (var i = 0; i <= 60; i++) { var rr = 0.9 + i * (5.5 - 0.9) / 60, phi = P.potentialOfCharge(P.e, rr * 1e-9); d += (i ? ' L' : 'M') + (px0 + rr / 5.5 * (px1 - px0)).toFixed(1) + ',' + (py0 - phi / 1.6 * (py0 - py1)).toFixed(1); }
    el('path', { d: d, 'class': 'phi-line' }, g);
    txt(g, px0 + 62, py1 + 6, 'φ = q / (4π ε₀ r)', 'phi');
    var mark = el('circle', { r: 5, fill: 'var(--amber)' }, g), drop = el('line', { stroke: 'var(--amber)', 'stroke-dasharray': '3 3' }, g);
    var slope = el('line', { stroke: 'var(--field)', 'stroke-width': 1.6 }, g);
    var probe = null, pf = el('line', { 'class': 'force-arrow' }, g); pf.setAttribute('marker-end', marker(svg, '#F0B441'));
    var plab = txt(g, 0, 0, '', 'amber', 'middle');
    badge(g, cx + 56, cy - 56, 1); badge(g, cx + 96, cy + 70, 2); var b3 = badge(g, 0, 0, 3); var b4 = badge(g, 0, 0, 4);
    function render() {
      var r = +rSl.value; rv.textContent = r.toFixed(1) + ' nm';
      var px = cx + r * sc, py = cy;
      if (probe) g.removeChild(probe); probe = charge(g, px, py, 8, qp);
      var E = P.fieldOfCharge(P.e, r * 1e-9), phi = P.potentialOfCharge(P.e, r * 1e-9), F = qp * P.e * E;
      var L = 30 * Math.sqrt(E / P.fieldOfCharge(P.e, 1e-9)) + 6;
      pf.setAttribute('x1', px + (qp > 0 ? 10 : -10)); pf.setAttribute('x2', px + (qp > 0 ? 10 + L : -10 - L)); pf.setAttribute('y1', py); pf.setAttribute('y2', py);
      plab.setAttribute('x', px); plab.setAttribute('y', py - 16); plab.textContent = 'probe ' + (qp > 0 ? '+e' : '−e');
      var mx = px0 + r / 5.5 * (px1 - px0), my = py0 - phi / 1.6 * (py0 - py1);
      mark.setAttribute('cx', mx); mark.setAttribute('cy', my); drop.setAttribute('x1', mx); drop.setAttribute('x2', mx); drop.setAttribute('y1', my); drop.setAttribute('y2', py0);
      var s = -E * 1e-9 / 1.6 * (py0 - py1) / ((px1 - px0) / 5.5); // slope in px/px
      slope.setAttribute('x1', mx - 22); slope.setAttribute('x2', mx + 22); slope.setAttribute('y1', my + 22 * s); slope.setAttribute('y2', my - 22 * s);
      b3.setAttribute('transform', 'translate(' + (mx + 14) + ',' + (my - 18) + ')'); b4.setAttribute('transform', 'translate(' + (px0 + 30) + ',' + (py0 - 30) + ')');
      read.innerHTML = 'At r = ' + r.toFixed(1) + ' nm from one elementary charge: field <b>' + fmt(E * 1e-9, 2) + ' V/nm</b> (' + sci(E, 1) + ' V/m), potential <b>' + fmt(phi, 2) + ' V</b>. The probe (' + (qp > 0 ? '+e' : '−e') + ') feels ' + fmt(Math.abs(F) * 1e12, 2) + ' pN ' + (qp > 0 ? 'outward' : 'inward') + ' and has energy qφ = <b>' + fmt(qp * phi, 2) + ' eV</b> here.';
    }
    on(rSl, 'input', render);
    on(sgnBtn, 'click', function () { qp = -qp; sgnBtn.textContent = 'probe: ' + (qp > 0 ? '+e' : '−e') + ' (tap to flip)'; render(); });
    render();
    steps(fig, [
      { text: 'The lilac arrows map the <b>field</b>: at each point, the force a unit positive charge would feel. Around a positive charge they point outward.' },
      { text: 'Farther out the arrows shrink: the field falls as <b>1/r²</b>, like the force in figure 0.1. Slide the probe out and watch its force arrow shorten.' },
      { text: 'The graph is the <b>potential</b>: the work per unit charge to bring the probe in from far away, against the field. Only differences of φ can be measured; here “far away” is taken as zero.' },
      { text: 'The field is the <b>slope</b> of the potential (lilac tangent): where φ falls steeply, the push is strong. This is the picture to keep: potential is height, field is slope.' }
    ]);
  });

  /* ===== 0.3 Voltage: the potential hill between two plates ===== */
  register('f0-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var VSl = fig.querySelector('.V'), Vv = fig.querySelector('.V-val'), lSl = fig.querySelector('.l'), lv = fig.querySelector('.l-val'), xSl = fig.querySelector('.x'), sgnBtn = fig.querySelector('button[data-probe]');
    var xL = 130, xR = 390, yT = 44, yB = 178, qp = 1, xf = 0.3, V = 1.5, l = 2;
    // plates: conductors, each at one potential
    el('rect', { x: xL - 12, y: yT, width: 12, height: yB - yT, rx: 2, fill: 'var(--amber-2)' }, g);
    el('rect', { x: xR, y: yT, width: 12, height: yB - yT, rx: 2, fill: '#4b6a72' }, g);
    var pL = txt(g, xL - 6, yT - 10, '', 'amber', 'middle'), pR = txt(g, xR + 6, yT - 10, '0 V', 'cyan', 'middle');
    txt(g, xL - 6, yB + 16, 'plate at φ = V', 'amber', 'middle'); txt(g, xR + 6, yB + 16, 'plate at φ = 0', 'cyan', 'middle');
    txt(g, 60, 110, 'metal:', 'strong', 'middle'); txt(g, 60, 124, 'one', '', 'middle'); txt(g, 60, 138, 'potential', '', 'middle');
    var fa = el('g', {}, g);
    for (var k = 0; k < 4; k++) { var yy = yT + 20 + k * 32; arrow(fa, xL + 30, yy, xL + 70, yy, '#C4B5F7', 1.4, 'field-arrow'); arrow(fa, xR - 70, yy, xR - 30, yy, '#C4B5F7', 1.4, 'field-arrow'); }
    var eLab = txt(g, (xL + xR) / 2, yT + 10, '', 'field', 'middle');
    // strip
    var strip = phiStrip(g, { x: xL - 12, y: 210, w: xR + 12 - (xL - 12), h: 70 }, [], { vmin: 0, vmax: 5, label: 'φ', units: '0', xlabel: 'position across the gap' });
    txt(g, xL - 20, 246, '', 'phi', 'end');
    var probe = null, pf = el('line', { 'class': 'force-arrow' }, g); pf.setAttribute('marker-end', marker(svg, '#F0B441'));
    var pm = el('circle', { r: 5, fill: 'var(--amber)' }, g), plab = txt(g, 0, 0, '', 'amber', 'middle');
    badge(g, xL - 6, yT - 28, 1); badge(g, (xL + xR) / 2, yB + 40, 2); var b3 = badge(g, 0, 0, 3); badge(g, xR + 30, yB + 40, 4);
    var loop;
    function render() {
      V = +VSl.value; l = +lSl.value; Vv.textContent = V.toFixed(1) + ' V'; lv.textContent = l.toFixed(0) + ' mm';
      pL.textContent = V.toFixed(1) + ' V';
      var E = P.uniformField(V, l * 1e-3);
      eLab.textContent = 'field E = V / l = ' + fmt(E, 0) + ' V/m, uniform, from + to −';
      var px = xL + xf * (xR - xL), py = 110;
      if (probe) g.removeChild(probe); probe = charge(g, px, py, 8, qp);
      var L = 20 + 8 * V;
      pf.setAttribute('x1', px + (qp > 0 ? 10 : -10)); pf.setAttribute('x2', px + (qp > 0 ? 10 + L : -10 - L)); pf.setAttribute('y1', py); pf.setAttribute('y2', py);
      plab.setAttribute('x', px); plab.setAttribute('y', py - 16); plab.textContent = 'test charge ' + (qp > 0 ? '+e' : '−e');
      strip.update([{ x: 0, phi: V }, { x: 12 / (xR - xL + 24), phi: V }, { x: 1 - 12 / (xR - xL + 24), phi: 0 }, { x: 1, phi: 0 }]);
      var phi = V * (1 - xf), sx = strip.X((12 + xf * (xR - xL)) / (xR - xL + 24)), sy = strip.Y(phi);
      pm.setAttribute('cx', sx); pm.setAttribute('cy', sy);
      b3.setAttribute('transform', 'translate(' + (px) + ',' + (py + 26) + ')');
      var eV = qp * phi;
      read.innerHTML = 'V = ' + V.toFixed(1) + ' V across l = ' + l + ' mm gives a field of <b>' + fmt(E, 0) + ' V/m</b>. The test charge sits where φ = ' + fmt(phi, 2) + ' V, so its energy is qφ = <b>' + fmt(eV, 2) + ' eV</b>; crossing the whole gap changes it by ' + fmt(V, 1) + ' eV, which is ' + fmt(P.kJPerMolFromEV(V), 0) + ' kJ per mole of charges.';
    }
    on(VSl, 'input', render); on(lSl, 'input', render); on(xSl, 'input', function () { xf = +xSl.value / 100; render(); });
    on(sgnBtn, 'click', function () { qp = -qp; sgnBtn.textContent = 'test charge: ' + (qp > 0 ? '+e' : '−e') + ' (tap to flip)'; render(); });
    steps(fig, [
      { text: 'Each plate is a metal, a conductor. At rest a conductor has <b>no field inside</b> and sits at <b>one potential</b>: the strip is flat across each plate. Any excess charge sits on its surface.' },
      { text: 'Between the plates the potential falls in a straight line from V to 0. Its slope is the <b>field</b>, E = V / l: raise V or narrow the gap and the arrows strengthen.' },
      { text: 'The force on the test charge: a positive charge is pushed <b>downhill</b> (toward the lower potential), a negative one <b>uphill</b>. Flip the sign and watch the arrow turn round. Press Play to let it go.' },
      { text: 'Energy: moving a charge q across a potential difference Δφ changes its energy by <b>q Δφ</b>. One electron across 1 V is one <b>electron-volt</b>, 96.5 kJ per mole of electrons. That unit runs through the whole page.' }
    ]);
    render();
    loop = anim(fig, function (dt) {
      if (dt === 0) return;
      xf += (qp > 0 ? 1 : -1) * dt * 0.28; if (xf > 1.02) xf = -0.02; if (xf < -0.02) xf = 1.02;
      xSl.value = Math.round(Math.max(0, Math.min(1, xf)) * 100); render();
    }, { autoplay: false, stepDt: 0.35 });
    bind(fig, loop);
  });

  /* ===== 0.4 A wire carrying current: potential along the path ===== */
  register('f0-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var VSl = fig.querySelector('.V'), Vv = fig.querySelector('.V-val'), RSl = fig.querySelector('.R'), Rv = fig.querySelector('.R-val'), swBtn = fig.querySelector('.sw-btn');
    var closed = true, V = 1.5, R = 3;
    // the loop: cell at left, wire along the top through a switch, resistor (lamp) at right, wire back along the bottom
    var cx = 70, ct = 70, cb = 150; // cell box
    el('rect', { x: cx - 24, y: ct, width: 48, height: cb - ct, rx: 6, fill: 'var(--panel)', stroke: 'var(--line-2)' }, g);
    el('rect', { x: cx - 16, y: ct + 10, width: 32, height: 26, rx: 2, fill: 'var(--amber-2)', 'fill-opacity': '.8' }, g);
    el('rect', { x: cx - 16, y: cb - 36, width: 32, height: 26, rx: 2, fill: 'var(--metal)' }, g);
    txt(g, cx, ct - 8, '+', 'strong big', 'middle'); txt(g, cx, cb + 16, '−', 'strong big', 'middle');
    txt(g, cx, 112, 'cell', '', 'middle');
    var pathD = 'M' + cx + ',' + ct + ' V40 H200 M240,40 H410 V80 M410,140 V180 H' + cx + ' V' + cb;
    el('path', { d: pathD, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2.5 }, g);
    // switch
    var sw = el('g', { 'class': 'sw', role: 'button', tabindex: '0', 'aria-pressed': 'true', 'aria-label': 'Open or close the switch' }, g);
    el('rect', { x: 190, y: 8, width: 60, height: 50, fill: 'transparent' }, sw);
    el('circle', { cx: 200, cy: 40, r: 4, fill: 'var(--text)' }, sw); el('circle', { cx: 240, cy: 40, r: 4, fill: 'var(--text)' }, sw);
    var blade = el('line', { x1: 200, y1: 40, x2: 240, y2: 40, stroke: 'var(--text)', 'stroke-width': 3, 'stroke-linecap': 'round' }, sw);
    txt(sw, 220, 26, 'switch', 'amber', 'middle');
    // resistor as a zigzag (the lamp filament)
    el('path', { d: 'M410,80 l-10,8 l20,8 l-20,8 l20,8 l-20,8 l20,8 l-20,8 l10,4', fill: 'none', stroke: 'var(--text)', 'stroke-width': 2.2 }, g);
    var lamp = el('circle', { cx: 410, cy: 110, r: 24, fill: 'none', stroke: 'var(--line-2)' }, g);
    var glow = el('circle', { cx: 410, cy: 110, r: 24, 'class': 'lamp lamp-on' }, g); glow.setAttribute('fill-opacity', '.22');
    txt(g, 446, 106, 'lamp,', ''); var Rlab = txt(g, 446, 120, 'R', '');
    // electrons along the full wire path (one continuous path for the flow)
    var ePath = el('path', { d: 'M' + cx + ',' + cb + ' V180 H410 V40 H' + cx + ' V' + ct, fill: 'none', stroke: 'none' }, g);
    var ef = flow(svg, ePath, { n: 14, cls: 'e-dot', r: 3, speed: 40, parent: g });
    txt(g, 300, 196, 'electrons: from − to +, through the wire', 'cyan', 'middle');
    var fieldW = arrow(g, 330, 62, 290, 62, '#C4B5F7', 1.4, 'field-arrow'); txt(g, 310, 76, 'field along the wire', 'field', 'middle');
    // strip: the path unrolled from the − terminal, through the cell, the top wire, the switch, the lamp and the bottom wire
    var strip = phiStrip(g, { x: 56, y: 224, w: 440, h: 70 }, [], { vmin: 0, vmax: 5, label: 'φ', units: '0', xlabel: 'path: − terminal → cell → wire → switch → lamp → wire → −' });
    var segLabs = [['inside the cell', 0.1], ['wire', 0.3], ['switch', 0.44], ['lamp', 0.62], ['wire', 0.85]].map(function (s) { return txt(g, strip.X(s[1]), 212, s[0], '', 'middle'); });
    badge(g, cx + 40, ct - 8, 1); badge(g, 372, 150, 2); badge(g, 235, 166, 3); badge(g, 462, 150, 4);
    function render() {
      V = +VSl.value; R = +RSl.value; Vv.textContent = V.toFixed(1) + ' V'; Rv.textContent = R + ' Ω'; Rlab.textContent = 'R = ' + R + ' Ω';
      var I = closed ? P.ohmCurrent(V, R) : 0, Pw = P.power(I, V);
      blade.setAttribute('x2', closed ? 240 : 232); blade.setAttribute('y2', closed ? 40 : 16); sw.setAttribute('aria-pressed', String(closed));
      glow.setAttribute('class', 'lamp ' + (closed ? 'lamp-on glow' : 'lamp-off')); glow.setAttribute('fill-opacity', closed ? String(0.25 + 0.5 * Math.min(1, Pw / 2)) : '.15');
      ef.show(closed); ef.setSpeed(18 + 60 * Math.min(1, I / 1.5)); if (closed) ef.start(); else ef.stop();
      fieldW.style.display = closed ? '' : 'none';
      var wireDrop = closed ? 0.03 * V : 0, lampDrop = closed ? V - 2 * wireDrop : 0, swDrop = closed ? 0 : V;
      // unrolled path fractions: 0..0.12 cell, 0.12..0.40 top wire, 0.40..0.48 switch, 0.48..0.76 lamp, 0.76..1 bottom wire
      strip.update([{ x: 0, phi: 0 }, { x: 0.02, phi: 0 }, { x: 0.12, phi: V }, { x: 0.40, phi: V - wireDrop }, { x: 0.48, phi: V - wireDrop - swDrop },
        { x: 0.76, phi: V - wireDrop - swDrop - lampDrop }, { x: 1, phi: 0 }]);
      swBtn.textContent = closed ? 'Open the switch' : 'Close the switch';
      read.innerHTML = closed
        ? 'I = V / R = ' + V.toFixed(1) + ' V / ' + R + ' Ω = <b>' + fmt(I, 2) + ' A</b>: ' + fmt(I, 2) + ' coulombs per second, or ' + sci(P.electronsPerSecond(I), 1) + ' electrons per second past any point of the wire. Power P = I V = <b>' + fmt(Pw, 2) + ' W</b>. Almost all of the ' + V.toFixed(1) + ' V is dropped across the lamp; the copper wire takes a small share because metals conduct so well.'
        : 'Switch open: no current, so no drop along any conductor. Each side of the wire sits at one potential, the whole ' + V.toFixed(1) + ' V appears across the open switch, and the lamp is dark. The push is there; nothing can move.';
    }
    pressable(sw, function () { closed = !closed; render(); }); on(swBtn, 'click', function () { closed = !closed; render(); });
    on(VSl, 'input', render); on(RSl, 'input', render);
    steps(fig, [
      { text: 'The cell holds its two terminals a fixed <b>potential difference</b> V apart (module 1 shows how). On the strip, φ rises by V inside the cell. 1 V means 1 joule for every coulomb moved between the terminals.' },
      { text: 'Along the wire and through the lamp the potential <b>falls</b>. A current can only flow through a resistance if there is a potential difference to drive it: <b>V = I R</b>, Ohm’s law. Turn R up and the current drops.' },
      { text: 'Electrons (pale dots) leave the <b>−</b> terminal and travel through the wire to the <b>+</b> terminal: the force on a negative charge points against the field, up the potential hill. The lamp brightens with the power, P = I V.' },
      { text: 'Current is <b>charge per second</b>: 1 A is 1 C/s, about 6 × 10¹⁸ electrons a second. Open the switch and the slope vanishes: no current, one potential along each wire, the whole V across the gap.' }
    ]);
    render();
    bind(fig, { start: function () { if (closed) ef.start(); }, stop: ef.stop });
  });

  /* ===== 0.5 An ion in a liquid: force, drag, terminal velocity ===== */
  register('f0-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var ESl = fig.querySelector('.E'), Ev = fig.querySelector('.E-val'), rSl = fig.querySelector('.rad'), rv = fig.querySelector('.rad-val');
    var xL = 90, xR = 430, yT = 40, yB = 170;
    el('rect', { x: xL, y: yT, width: xR - xL, height: yB - yT, rx: 6, fill: 'var(--cyan)', 'fill-opacity': '.1', stroke: 'var(--cyan)', 'stroke-opacity': '.5' }, g);
    el('rect', { x: xL - 12, y: yT, width: 12, height: yB - yT, rx: 2, fill: 'var(--amber-2)', 'fill-opacity': '.8' }, g);
    el('rect', { x: xR, y: yT, width: 12, height: yB - yT, rx: 2, fill: '#4b6a72' }, g);
    txt(g, xL - 6, yT - 10, '+', 'strong big', 'middle'); txt(g, xR + 6, yT - 10, '−', 'strong big', 'middle');
    txt(g, 260, 24, 'liquid electrolyte between two electrodes', 'strong', 'middle');
    var farr = el('g', {}, g);
    for (var k = 0; k < 3; k++) { var yy = yT + 24 + k * 44; arrow(farr, xL + 20, yy, xL + 56, yy, '#C4B5F7', 1.2, 'field-arrow'); arrow(farr, xR - 56, yy, xR - 20, yy, '#C4B5F7', 1.2, 'field-arrow'); }
    var Elab = txt(g, 260, yB - 8, '', 'field', 'middle');
    // our ion (cation) and an anion, with force and drag arrows
    var ion = ourIon(g, 200, 90, 7, 'our ion, +', true), an = el('circle', { cx: 320, cy: 130, r: 6, 'class': 'ion an' }, g); txt(g, 320, 150, 'anion, −', '', 'middle');
    var fE = el('line', { 'class': 'force-arrow' }, g), fD = el('line', { stroke: 'var(--anion)', 'stroke-width': 2.2 }, g), fA = el('line', { 'class': 'force-arrow' }, g);
    fE.setAttribute('marker-end', marker(svg, '#F0B441')); fD.setAttribute('marker-end', marker(svg, '#9AA9A5')); fA.setAttribute('marker-end', marker(svg, '#F0B441'));
    var lE = txt(g, 0, 0, 'electric force |z|eE', 'amber', 'middle'), lD = txt(g, 0, 0, 'drag 6πηrv', '', 'middle');
    var strip = phiStrip(g, { x: xL - 12, y: 210, w: xR + 24 - xL, h: 60 }, [{ x: 0, phi: 1 }, { x: 0.03, phi: 1 }, { x: 0.97, phi: 0 }, { x: 1, phi: 0 }], { vmin: 0, vmax: 1.2, label: 'φ', units: '', xlabel: 'cations are driven down the slope, anions up' });
    badge(g, 150, 60, 1); var b2 = badge(g, 0, 0, 2); badge(g, 380, 60, 3); badge(g, 260, 292, 4);
    var x = 200, v = 0, xa = 320, va = 0, E = 1, rad = 1;
    function render() {
      Ev.textContent = ESl.value + ' (relative)'; rv.textContent = rSl.value + ' (relative)';
      E = +ESl.value; rad = +rSl.value; Elab.textContent = 'field E = slope of φ; here ' + E + ' unit' + (E > 1 ? 's' : '');
      var u = 1 / rad, vt = u * E;
      ion.move(x, 90); an.setAttribute('cx', xa);
      var L = 14 + 18 * E, Ld = 14 + 18 * (rad * Math.abs(v)); // drag = 6 pi eta r v, in the same units
      fE.setAttribute('x1', x + 10); fE.setAttribute('x2', x + 10 + L); fE.setAttribute('y1', 90); fE.setAttribute('y2', 90);
      fD.setAttribute('x1', x - 10); fD.setAttribute('x2', x - 10 - Ld); fD.setAttribute('y1', 90); fD.setAttribute('y2', 90); fD.style.display = Ld > 14.5 ? '' : 'none';
      fA.setAttribute('x1', xa - 9); fA.setAttribute('x2', xa - 9 - (14 + 18 * E)); fA.setAttribute('y1', 130); fA.setAttribute('y2', 130);
      lE.setAttribute('x', x + 10 + L / 2); lE.setAttribute('y', 78); lD.setAttribute('x', x - 10 - Ld / 2); lD.setAttribute('y', 126); lD.style.display = fD.style.display;
      b2.setAttribute('transform', 'translate(' + (x - 10 - Ld - 16) + ',' + 90 + ')');
      read.innerHTML = 'Mobility u = |z| e / (6π η r): a bigger ion (larger r) or a thicker liquid (larger η) moves more slowly for the same push. Terminal speed v = u E = <b>' + fmt(vt, 2) + '</b> relative units here (field ' + E + ', radius ' + rad + '). Both ions carry current: cations one way, anions the other.';
    }
    on(ESl, 'input', function () { v = 0; va = 0; render(); }); on(rSl, 'input', function () { v = 0; render(); });
    steps(fig, [
      { text: 'The field between the electrodes pushes <b>our ion</b> (a cation) toward the − side with force |z| e E, and the anion the other way with the same size of force.' },
      { text: 'As the ion speeds up, the liquid drags on it, 6π η r v, harder the faster it goes. When drag equals the push the ion stops accelerating: it drifts at a <b>terminal velocity</b> v = u E, and u is its <b>mobility</b>. Press Play.' },
      { text: 'Both ions carry current. Conductivity adds up every ion’s charge, mobility and concentration: κ = F Σ |z| u C. Salty, thin liquids with small fast ions conduct best.' },
      { text: 'In a liquid carrying current the potential slopes (the strip): cations run <b>down</b> the slope, anions <b>up</b>. The slope is the field. Every region stays neutral: any pile-up of charge would make a huge field that erases it at once.' }
    ]);
    render();
    var loop = anim(fig, function (dt) {
      if (dt === 0) return;
      var u = 1 / rad, vt = u * E, tau = 0.35 * rad; // v relaxes to vt with the drag time scale
      v += (vt - v) * Math.min(1, dt / tau); va += (vt - va) * Math.min(1, dt / tau);
      x += v * 60 * dt; xa -= va * 60 * dt;
      if (x > xR - 30) { x = xL + 30; v = 0; } if (xa < xL + 30) { xa = xR - 30; va = 0; }
      render();
    }, { autoplay: true, stepDt: 0.2 });
    bind(fig, loop);
  });
