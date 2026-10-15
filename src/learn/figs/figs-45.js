  /* =================================================================
     Modules 4 and 5. A shared, clearly illustrative cell model feeds
     figure 4.2 and the module 5 figures in figs-5.js. Its open-circuit shapes and parameters are
     not measurements; the equations it combines are the cited ones.
     ================================================================= */
  var RTF = P.R * P.T0 / P.F; // thermal voltage, 25.7 mV at 25 C
  function rateFromSlider(v) { return 0.1 * Math.pow(50, v / 100); } // 0.1C .. 5C, log scale
  function fmtRate(c) { if (c < 0.67) return 'C/' + Math.round(1 / c); var r = Math.round(c * 10) / 10; return (Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : r.toFixed(1)) + 'C'; }
  /* The illustrative cell. x is the fraction of the low-rate capacity delivered
     (0 = full, 1 = empty); the state of charge is 1 - x. Open-circuit shapes are
     smooth illustrative functions: a flat two-phase plateau (LiFePO4-like, R6) and a
     sloping single-phase curve (LiCoO2-like, R6), each with the steep ends every cell
     shows when one electrode runs out. Polarization combines the cited forms:
       ohmic          eta = I R_b                         (R6 eq. 1; R1 eq. 15)
       activation     eta = (2RT/F) asinh(i / 2 i0)       (B2 eq. 3.4.11 with alpha = 0.5)
       concentration  eta = (RT/F) ln(C0 / C), C/C0 = 1 - i/i_lim (R1 eq. 16, F restored)
     where the limiting current falls as the electrode that is being emptied runs short
     of lithium (the end of discharge) or of room for it (the end of charge). R_b, i0 and
     i_lim are illustrative, chosen so that the picture is legible; nothing is measured. */
  var model = {
    Rb: 0.05, i0: 0.3, lim: 8,
    voc: function (shape, x) {
      if (shape === 'flat') return 3.40 - 0.04 * x + 0.30 * Math.exp(-x / 0.02) - 0.70 * Math.exp(-(1 - x) / 0.025);
      return 4.02 - 0.47 * x + 0.06 * Math.exp(-x / 0.03) - 0.55 * Math.exp(-(1 - x) / 0.04);
    },
    cut: function (shape) { return shape === 'flat' ? { lo: 2.5, hi: 3.9 } : { lo: 3.0, hi: 4.2 }; },
    eta: function (c, x, charge) { // c in C-rate
      var ohm = this.Rb * c;
      var act = 2 * RTF * Math.asinh(c / (2 * this.i0));
      var end = charge ? (1 - x) : x;                         // how close the cell is to the end it is heading for
      var f = (c / this.lim) * (1 + 5 * Math.pow(end, 4));     // i / i_lim
      var conc = f >= 0.999 ? RTF * Math.log(1000) + 2 : RTF * Math.log(1 / (1 - f));
      return { ohm: ohm, act: act, conc: conc, total: ohm + act + conc };
    },
    /* discharge from full (x = 0) down to the lower cut-off, or charge from empty (x = 1)
       up to the upper cut-off. Points carry x, V, the open-circuit V and eta. */
    curve: function (shape, c, charge, xStart) {
      var cut = this.cut(shape), pts = [], N = 240, dx = 1 / N;
      var x = charge ? (xStart === undefined ? 1 : xStart) : (xStart || 0);
      for (var i = 0; i <= N + 1; i++) {
        var e = this.eta(c, x, charge), o = this.voc(shape, x), V = charge ? o + e.total : o - e.total;
        if (i > 0 && (charge ? V > cut.hi : V < cut.lo)) break;
        pts.push({ x: x, V: V, voc: o, eta: e });
        x += charge ? -dx : dx;
        if (x < -1e-9 || x > 1 + 1e-9) break;
      }
      if (pts.length < 2) pts.push({ x: pts[0].x + (charge ? -0.002 : 0.002), V: pts[0].V, voc: pts[0].voc, eta: pts[0].eta });
      return pts;
    },
    /* both half-cycles at rate c, each started from rest at its own end: discharge from a
       full cell, charge from an empty one, as a test protocol does after a slow step.
       Energies per unit of the low-rate capacity (V x fraction); heat as the area between
       each branch and the open-circuit curve, which is the integral of eta dq. */
    cycle: function (shape, c) {
      var d = this.curve(shape, c, false, 0), u = this.curve(shape, c, true, 1);
      function integ(p, key) { var s = 0; for (var i = 1; i < p.length; i++) s += 0.5 * (p[i][key] + p[i - 1][key]) * Math.abs(p[i].x - p[i - 1].x); return s; }
      var Ed = integ(d, 'V'), Ec = integ(u, 'V');
      d.forEach(function (p) { p.h = p.voc - p.V; }); u.forEach(function (p) { p.h = p.V - p.voc; });
      return { dis: d, ch: u, Qdis: d[d.length - 1].x - d[0].x, Qch: u[0].x - u[u.length - 1].x, Edis: Ed, Ech: Ec, heatDis: integ(d, 'h'), heatCh: integ(u, 'h') };
    }
  };
  function shapeOfCell() { return cell.pos === 'lfp' ? 'flat' : 'slope'; }
  function axes(g, x0, y0, x1, y1, vmin, vmax, xlab, ylab) {
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g);
    el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    for (var v = Math.ceil(vmin * 2) / 2; v <= vmax; v += 0.5) {
      var yy = y0 - (v - vmin) / (vmax - vmin) * (y0 - y1);
      el('line', { x1: x0, y1: yy, x2: x1, y2: yy, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g);
      var t = el('text', { x: x0 - 6, y: yy + 4, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(t, v.toFixed(1));
    }
    var tx = el('text', { x: x1, y: y0 + 18, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(tx, xlab);
    var ty = el('text', { x: x0 - 34, y: y1 - 8, 'class': 'lbl' }, g); setSvgText(ty, ylab);
  }
  function pathOf(pts, x0, y0, x1, y1, vmin, vmax) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + (x0 + p.x * (x1 - x0)).toFixed(1) + ',' + (y0 - (p.V - vmin) / (vmax - vmin) * (y0 - y1)).toFixed(1); }).join(' ');
  }

  /* ===== 4.1 Faraday calculator ===== */
  register('f4-1', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.calc-bars'), sel = fig.querySelector('.mat'), M = fig.querySelector('.M'), n = fig.querySelector('.n'), V = fig.querySelector('.V'), Vv = fig.querySelector('.V-val'), read = fig.querySelector('.readout'), note = fig.querySelector('.note');
    P.data.materials.forEach(function (m) { var o = document.createElement('option'); o.value = m.key; o.textContent = plain(m.name); sel.appendChild(o); });
    var o = document.createElement('option'); o.value = 'custom'; setSvgText(o, 'Custom (type M and n)'); sel.appendChild(o);
    var refs = [{ name: 'graphite', basis: 'per g of C₆', q: P.specificCapacity(1, 6 * 12.011) }, { name: 'LiFePO₄', basis: 'per g of LiFePO₄', q: P.specificCapacity(1, 6.94 + 55.845 + 30.974 + 4 * 15.999) }, { name: 'lithium metal', basis: 'per g of Li', q: P.specificCapacity(1, 6.94) }];
    var scale = 300 / 4000;
    badge(svg, 20, 42, 1); badge(svg, 20, 82, 2); badge(svg, 500, 190, 3);
    function valid() { var mm = +M.value, nn = +n.value; return isFinite(mm) && mm >= 1 && mm <= 1000 && isFinite(nn) && nn >= 0.1 && nn <= 10; }
    function render() {
      var mat = null; P.data.materials.forEach(function (m) { if (m.key === sel.value) mat = m; });
      if (mat) { M.value = mat.M.toFixed(2); n.value = mat.n; }
      setSvgText(Vv, (+V.value).toFixed(1) + ' V');
      clear(g);
      if (!valid()) { read.innerHTML = '<span class="invalid">Enter a molar mass between 1 and 1000 g/mol and an electron count between 0.1 and 10.</span>'; note.innerHTML = ''; return; }
      var q = P.specificCapacity(+n.value, +M.value), E = q * (+V.value); // mAh/g x V = mWh/g = Wh/kg
      var rows = [{ name: mat ? mat.name.split(' (')[0] : 'your material', basis: mat ? 'per g of ' + mat.basis.split(' (')[0] : 'per g of it', q: q, me: true }].concat(refs.filter(function (r) { return Math.abs(r.q - q) > 0.5; }));
      rows.forEach(function (r, i) {
        var y = 30 + i * 40, w = Math.min(300, r.q * scale);
        el('rect', { x: 180, y: y, width: w, height: 22, rx: 4, fill: r.me ? 'var(--accent)' : 'var(--second)', 'fill-opacity': r.me ? '.95' : '.45' }, g);
        txt(g, 174, y + 7, r.name, r.me ? 'strong' : '', 'end'); txt(g, 174, y + 24, r.basis, '', 'end');
        var inside = w > 200;
        txt(g, inside ? 176 + w : 186 + w, y + 15, Math.round(r.q) + ' mAh/g', 'strong', inside ? 'end' : 'start', inside ? { fill: '#fff' } : null);
      });
      txt(g, 480, 194, 'theoretical specific capacity, 0 to 4000 mAh/g, each on its own mass basis', '', 'end');
      read.innerHTML = 'Q = nF/(3.6 M) = ' + (+n.value) + ' × 96 485.3 / (3.6 × ' + (+M.value).toFixed(2) + ') = <b>' + Math.round(q) + ' mAh/g</b>' + (mat ? ' on the ' + mat.basis + ' basis' : '') + '. Against a counter electrode that puts the cell at ' + (+V.value).toFixed(1) + ' V, that is <b>' + Math.round(E) + ' Wh per kilogram of this electrode’s active material</b>, this electrode alone: the other electrode, the electrolyte and the packaging all add mass and none adds energy (see the note under figure {{fig:f4-3}}).';
      note.innerHTML = mat ? (mat.printed ? '<span class="flag ok">reproduces the printed value, ' + mat.printed + ' mAh/g</span> ' : '<span class="flag">computed from Faraday’s law; the sources print no theoretical value for this one</span> ') + '<span class="flag">' + mat.practical + '</span>' : '<span class="flag">custom entry: computed, no printed check</span>';
    }
    on(sel, 'change', render);
    [M, n].forEach(function (i) { on(i, 'input', function () { sel.value = 'custom'; render(); }); });
    on(V, 'input', render);
    function fromCell() { var p = rung(cell.pos), nn = rung(cell.neg); V.value = Math.max(0.5, Math.min(5, p.V - nn.V)).toFixed(1); if (cell.pos === 'lfp' || cell.pos === 'lco' || cell.pos === 's') sel.value = cell.pos; render(); }
    steps(fig, [
      { text: 'The blue bar is the material you chose: its <b>theoretical capacity</b> from Faraday’s law, Q = nF/(3.6 M), in milliampere-hours per gram.' },
      { text: 'The green bars are three references. Read the small print: each is <b>per gram of a different thing</b> (the carbon host, the lithiated phosphate, the bare metal), so compare with care.' },
      { text: 'Multiply by the cell voltage and you get watt-hours per kilogram <b>of this electrode’s active material only</b>. Energy belongs to a pair of electrodes; a whole cell delivers far less per kilogram (the note under figure {{fig:f4-3}} says why).' }
    ]);
    cellListeners.push(fromCell); fromCell();
  });

  /* ===== 4.2 Energy is the area under the curve ===== */
  register('f4-2', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), read = fig.querySelector('.readout');
    var x0 = 60, y0 = 250, x1 = 490, y1 = 30, vmin = 2.0, vmax = 4.5;
    var ax = el('g', {}, g); axes(ax, x0, y0, x1, y1, vmin, vmax, '', 'V');
    [0, 25, 50, 75, 100].forEach(function (pc) { var xx = x0 + pc / 100 * (x1 - x0); el('line', { x1: xx, y1: y0, x2: xx, y2: y0 + 5, stroke: 'var(--line-2)' }, ax); txt(ax, xx, y0 + 18, pc + ' %', '', 'middle'); });
    txt(ax, x1, y0 + 34, 'capacity delivered, % of the C/10 value', '', 'end');
    var area = el('path', { fill: 'var(--accent)', 'fill-opacity': '.22' }, g), line = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, g);
    var ref = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-opacity': '.45', 'stroke-dasharray': '3 4' }, g);
    // legend
    el('line', { x1: x0 + 14, x2: x0 + 40, y1: y1 + 14, y2: y1 + 14, stroke: 'var(--accent)', 'stroke-width': 2 }, g); txt(g, x0 + 46, y1 + 18, 'this rate', '');
    el('line', { x1: x0 + 120, x2: x0 + 146, y1: y1 + 14, y2: y1 + 14, stroke: 'var(--accent)', 'stroke-opacity': '.45', 'stroke-dasharray': '3 4' }, g); txt(g, x0 + 152, y1 + 18, 'C/10 reference', '');
    el('rect', { x: x0 + 250, y: y1 + 7, width: 26, height: 14, fill: 'var(--accent)', 'fill-opacity': '.22' }, g); txt(g, x0 + 282, y1 + 18, 'energy = area', '');
    badge(svg, x0 + 200, y0 - 60, 1); badge(svg, x1 - 30, y0 - 30, 2); badge(svg, 30, y1 + 14, 3);
    var E0 = null;
    function render() {
      var shape = shapeOfCell(), c = rateFromSlider(+rate.value); setSvgText(rv, fmtRate(c));
      var pts = model.curve(shape, c, false), slow = model.curve(shape, 0.1, false);
      var d = pathOf(pts, x0, y0, x1, y1, vmin, vmax); line.setAttribute('d', d);
      area.setAttribute('d', d + ' L' + (x0 + pts[pts.length - 1].x * (x1 - x0)).toFixed(1) + ',' + y0 + ' L' + x0 + ',' + y0 + ' Z');
      ref.setAttribute('d', pathOf(slow, x0, y0, x1, y1, vmin, vmax));
      var E = P.energyFromCurve(pts.map(function (p) { return p.x; }), pts.map(function (p) { return p.V; }));
      E0 = P.energyFromCurve(slow.map(function (p) { return p.x; }), slow.map(function (p) { return p.V; }));
      var q = pts[pts.length - 1].x, vavg = E / q;
      read.innerHTML = 'At ' + fmtRate(c) + ': capacity reached <b>' + Math.round(q * 100) + ' %</b> of the C/10 value, average voltage <b>' + vavg.toFixed(2) + ' V</b>, energy (the shaded area) <b>' + Math.round(100 * E / E0) + ' %</b> of the energy at C/10 (dashed). Energy = average voltage × capacity.';
    }
    on(rate, 'input', render); cellListeners.push(render); render();
    steps(fig, [
      { text: 'The curve is the cell voltage as charge is drawn out, for <b>your cell</b>: flat for LiFePO₄, sloping for the oxides (a later module explains the shapes). The shaded <b>area</b> under it is the energy delivered.' },
      { text: 'Slide the rate up. The curve drops (voltage lost to resistance and kinetics) and it ends earlier (capacity lost to slow transport): the area shrinks from both sides.' },
      { text: 'The dashed line is the gentle C/10 discharge that sets 100 %. Whatever the rate, energy is the integral of V over the charge, which is the same as the average voltage times the capacity.' }
    ]);
  });

  /* ===== 4.3 The Ragone map (static) ===== */
  register('f4-3', function (fig) {
    var svg = fig.querySelector('svg');
    badge(svg, 190, 60, 1); badge(svg, 440, 200, 2); badge(svg, 372, 112, 3);
    steps(fig, [
      { text: '<b>Supercapacitors</b> deliver energy fast but hold little; <b>fuel cells</b> hold much but deliver it slowly. Both axes are logarithmic and carry no numbers because the source figure is itself simplified.' },
      { text: '<b>Batteries</b> sit between the two and overlap both; a thin-film battery can reach the power of a supercapacitor.' },
      { text: 'The <b>combustion engine</b> is not an electrochemical device: it beats all three on both axes because its energy is stored in a fuel tank, not in an electrode. No single electrochemical system matches it, which is why the sources suggest combining them.' }
    ]);
  });


  /* ===== 4.4 Three efficiencies, drawn as areas (definitions after Arote 2022, B3) ===== */
  register('f4-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var sCE = fig.querySelector('.ce'), sVc = fig.querySelector('.vc'), sVd = fig.querySelector('.vd');
    var vCE = fig.querySelector('.ce-val'), vVc = fig.querySelector('.vc-val'), vVd = fig.querySelector('.vd-val');
    var x0 = 70, x1 = 430, y0 = 228, y1 = 30, Vmax = 5;
    var X = function (q) { return x0 + q / 1.0 * (x1 - x0); }, Y = function (v) { return y0 - v / Vmax * (y0 - y1); };
    el('line', { x1: x0, y1: y0, x2: x1 + 14, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1 - 6, stroke: 'var(--line-2)' }, g);
    [0, 1, 2, 3, 4].forEach(function (v) { el('line', { x1: x0 - 4, x2: x0, y1: Y(v), y2: Y(v), stroke: 'var(--line-2)' }, g); txt(g, x0 - 8, Y(v) + 4, v + ' V', '', 'end'); });
    txt(g, x0, y0 + 18, '0', '', 'middle'); txt(g, X(1), y0 + 18, '100 %', '', 'middle'); txt(g, x1 + 14, y0 + 34, 'charge, % of the charge put in →', '', 'end');
    txt(g, x0 - 8, y1 - 14, 'average voltage', '', 'start');
    var lostTop = el('rect', { fill: 'var(--heat)', 'fill-opacity': .45 }, g), lostSide = el('rect', { fill: 'var(--heat)', 'fill-opacity': .45 }, g);
    var outR = el('rect', { fill: 'var(--accent)', 'fill-opacity': .85 }, g);
    var inR = el('rect', { fill: 'none', stroke: 'var(--second)', 'stroke-width': 2 }, g);
    var tIn = txt(g, 0, 0, '', 'cyan', 'start'), tOut = txt(g, 0, 0, '', 'strong', 'middle', { style: 'fill:#fff' }), tLost = txt(g, 0, 0, '', 'heat', 'start');
    var panel = el('g', {}, g), px = 448;
    var r1 = txt(panel, px, 66, '', 'strong', 'start'), r2 = txt(panel, px, 108, '', 'strong', 'start'), r3 = txt(panel, px, 150, '', 'strong big', 'start'), r4 = txt(panel, px, 206, '', '', 'start');
    txt(panel, px, 50, 'coulombic', '', 'start'); txt(panel, px, 92, 'voltage', '', 'start'); txt(panel, px, 134, 'energy', '', 'start'); txt(panel, px, 176, 'charge', '', 'start'); txt(panel, px, 190, 'factor', '', 'start');
    badge(g, X(1) - 4, Y(4.6), 1); badge(g, X(0.5), y0 - 20, 2); badge(g, px + 58, 140, 3);
    function vals() {
      var ce = 95 + 5 * (+sCE.value) / 100, vc = 3.5 + (+sVc.value) / 100, vd = 3.2 + (+sVd.value) / 100;
      if (vd > vc) vd = vc;
      return { ce: ce / 100, vc: vc, vd: vd };
    }
    function render() {
      var v = vals(), qd = v.ce, ve = v.vd / v.vc, ee = v.ce * ve;
      setSvgText(vCE, (v.ce * 100).toFixed(1) + ' %'); setSvgText(vVc, v.vc.toFixed(2) + ' V'); setSvgText(vVd, v.vd.toFixed(2) + ' V');
      inR.setAttribute('x', X(0)); inR.setAttribute('y', Y(v.vc)); inR.setAttribute('width', X(1) - X(0)); inR.setAttribute('height', y0 - Y(v.vc));
      outR.setAttribute('x', X(0)); outR.setAttribute('y', Y(v.vd)); outR.setAttribute('width', X(qd) - X(0)); outR.setAttribute('height', y0 - Y(v.vd));
      lostTop.setAttribute('x', X(0)); lostTop.setAttribute('y', Y(v.vc)); lostTop.setAttribute('width', X(qd) - X(0)); lostTop.setAttribute('height', Math.max(0, Y(v.vd) - Y(v.vc)));
      lostSide.setAttribute('x', X(qd)); lostSide.setAttribute('y', Y(v.vc)); lostSide.setAttribute('width', Math.max(0, X(1) - X(qd))); lostSide.setAttribute('height', y0 - Y(v.vc));
      tIn.setAttribute('x', X(0) + 6); tIn.setAttribute('y', Y(v.vc) - 7); setSvgText(tIn, 'in: charge × ' + v.vc.toFixed(2) + ' V');
      tOut.setAttribute('x', (X(0) + X(qd)) / 2); tOut.setAttribute('y', (Y(v.vd) + y0) / 2 + 4); setSvgText(tOut, 'out: ' + (qd * 100).toFixed(1) + ' % of the charge × ' + v.vd.toFixed(2) + ' V');
      tLost.setAttribute('x', X(0) + 6); tLost.setAttribute('y', Y(v.vc) - 22); setSvgText(tLost, ee < 0.995 ? 'lost: ' + ((1 - ee) * 100).toFixed(1) + ' % of the energy' : '');
      setSvgText(r1, (v.ce * 100).toFixed(1) + ' %'); setSvgText(r2, (ve * 100).toFixed(1) + ' %'); setSvgText(r3, (ee * 100).toFixed(1) + ' %'); setSvgText(r4, (1 / v.ce).toFixed(3));
      read.innerHTML = 'Coulombic efficiency <b>' + (v.ce * 100).toFixed(1) + ' %</b> × voltage efficiency <b>' + (ve * 100).toFixed(1) + ' %</b> = energy efficiency <b>' + (ee * 100).toFixed(1) + ' %</b>. ' + ((1 - v.ce) < (1 - ve) ? 'Most of the loss is voltage: overpotential and hysteresis, turned into heat.' : 'Most of the loss is charge: side reactions that the cell does not give back.') + ' Illustrative values, not a measured cell.';
    }
    [sCE, sVc, sVd].forEach(function (s) { on(s, 'input', render); });
    steps(fig, [
      { text: 'The outlined rectangle is the energy put in: as wide as the charge, as high as the average charge voltage. The <b>coulombic efficiency</b> is the share of that charge that comes back out; its reciprocal is the <b>charge factor</b>.' },
      { text: 'The filled rectangle is the energy taken out, at the lower average discharge voltage. Their ratio of heights is the <b>voltage efficiency</b>.' },
      { text: 'The <b>energy efficiency</b> is the ratio of the two areas, so it is the product of the other two. The shaded strips are the energy lost as heat or to side reactions.' }
    ]);
    render();
  });

  /* f4-5: power against current, P = IV - I²R: what the internal resistance costs */
  register('f4-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var sR = fig.querySelector('.rint'), sI = fig.querySelector('.cur'), vR = fig.querySelector('.rint-val'), vI = fig.querySelector('.cur-val');
    var V = 3.6, Imax = 100, Pmax = 400, x0 = 62, x1 = 392, y0 = 238, y1 = 28;
    var X = function (i) { return x0 + i / Imax * (x1 - x0); }, Y = function (p) { return y0 - p / Pmax * (y0 - y1); };
    el('line', { x1: x0, y1: y0, x2: x1 + 10, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1 - 6, stroke: 'var(--line-2)' }, g);
    [0, 100, 200, 300, 400].forEach(function (p) { el('line', { x1: x0 - 4, x2: x0, y1: Y(p), y2: Y(p), stroke: 'var(--line-2)' }, g); txt(g, x0 - 8, Y(p) + 4, String(p), '', 'end'); });
    [0, 25, 50, 75, 100].forEach(function (i) { el('line', { x1: X(i), x2: X(i), y1: y0, y2: y0 + 4, stroke: 'var(--line-2)' }, g); txt(g, X(i), y0 + 18, String(i), '', 'middle'); });
    txt(g, x1 + 10, y0 + 34, 'current, A', '', 'end'); txt(g, x0 - 8, y1 - 12, 'power, W', '', 'start');
    var heat = el('path', { fill: 'var(--heat)', 'fill-opacity': .35 }, g), use = el('path', { fill: 'var(--accent)', 'fill-opacity': .8 }, g);
    var lineIV = el('line', { x1: X(0), y1: Y(0), x2: X(Imax), y2: Y(V * Imax), stroke: 'var(--text)', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }, g);
    txt(g, X(Imax) - 4, Y(V * Imax) - 8, 'I × V', 'strong', 'end');
    var curve = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g);
    var peak = el('g', {}, g), op = el('g', {}, g);
    var panel = el('g', {}, g), px = 410;
    var lab = ['terminal voltage', 'delivered', 'heat in the cell', 'efficiency'], rv = [];
    lab.forEach(function (l, i) { txt(panel, px, 44 + i * 46, l, '', 'start'); rv.push(txt(panel, px, 62 + i * 46, '', i === 1 ? 'strong big' : (i === 2 ? 'heat' : 'strong'), 'start')); });
    badge(g, X(12), Y(V * 12) - 30, 1); badge(g, 0, 0, 2); badge(g, 0, 0, 3);
    var bs = svg.querySelectorAll('.callout');
    function vals() { return { R: (+sR.value) / 1000, I: +sI.value }; }
    function render() {
      var v = vals(), R = v.R, I = v.I, Ip = V / (2 * R), Pp = V * V / (4 * R), Isc = V / R;
      setSvgText(vR, Math.round(R * 1000) + ' mΩ'); setSvgText(vI, I + ' A');
      var dU = 'M' + X(0) + ',' + Y(0), dH = '', top = [];
      for (var k = 0; k <= 200; k++) {
        var i = Imax * k / 200, p = Math.max(0, V * i - i * i * R);
        dU += ' L' + X(i).toFixed(1) + ',' + Y(p).toFixed(1); top.push([X(i), Y(p)]);
      }
      curve.setAttribute('d', dU.replace('M' + X(0) + ',' + Y(0) + ' L', 'M'));
      use.setAttribute('d', dU + ' L' + X(Imax) + ',' + Y(0) + ' Z');
      dH = 'M' + X(0) + ',' + Y(0) + ' L' + X(Imax) + ',' + Y(V * Imax);
      for (var m = top.length - 1; m >= 0; m--) dH += ' L' + top[m][0].toFixed(1) + ',' + top[m][1].toFixed(1);
      heat.setAttribute('d', dH + ' Z');
      clear(peak);
      if (Ip <= Imax) {
        el('line', { x1: X(Ip), x2: X(Ip), y1: Y(Pp), y2: y0, stroke: 'var(--accent)', 'stroke-dasharray': '3 3' }, peak);
        el('circle', { cx: X(Ip), cy: Y(Pp), r: 4.5, fill: 'var(--panel)', stroke: 'var(--accent)', 'stroke-width': 2 }, peak);
        txt(peak, X(Ip) + (Ip > 70 ? -8 : 8), Y(Pp) - 10, 'peak ' + Math.round(Pp) + ' W', 'amber tag', Ip > 70 ? 'end' : 'start');
        bs[2].setAttribute('transform', 'translate(' + (X(Ip) + (Ip > 70 ? 16 : -16)) + ',' + Math.max(y1 + 6, Y(Pp) - 4) + ')');
      } else {
        txt(peak, x1 - 4, Y(V * Imax * 0.62), 'peak at ' + Math.round(Ip) + ' A, off the axis', 'amber tag', 'end');
        bs[2].setAttribute('transform', 'translate(' + (x1 - 16) + ',' + (Y(V * Imax * 0.62) + 22) + ')');
      }
      var pd = V * I - I * I * R, ph = I * I * R, vt = V - I * R;
      clear(op);
      el('line', { x1: X(I), x2: X(I), y1: Y(V * I), y2: y0, stroke: 'var(--text)', 'stroke-width': 1.2 }, op);
      el('circle', { cx: X(I), cy: Y(Math.max(0, pd)), r: 4, fill: 'var(--accent)', stroke: '#fff', 'stroke-width': 1.2 }, op);
      bs[1].setAttribute('transform', 'translate(' + (X(I) + (I > 80 ? -14 : 14)) + ',' + (y0 - 18) + ')');
      setSvgText(rv[0], vt > 0 ? vt.toFixed(2) + ' V' : '0 V');
      setSvgText(rv[1], Math.max(0, pd).toFixed(0) + ' W'); setSvgText(rv[2], ph.toFixed(0) + ' W');
      setSvgText(rv[3], vt > 0 ? Math.round(100 * vt / V) + ' %' : '0 %');
      read.innerHTML = 'At <b>' + I + ' A</b> through <b>' + Math.round(R * 1000) + ' mΩ</b>, the cell releases I × V = ' + (V * I).toFixed(0) + ' W, of which I²R = <b>' + ph.toFixed(0) + ' W</b> heats the cell and <b>' + Math.max(0, pd).toFixed(0) + ' W</b> reaches the load. ' +
        (Ip <= Imax ? 'The most it can deliver is <b>' + Pp.toFixed(0) + ' W</b>, at ' + Ip.toFixed(0) + ' A, where half the power is heat.' : 'Its peak, ' + Pp.toFixed(0) + ' W at ' + Ip.toFixed(0) + ' A, lies beyond this axis.') + ' A ' + V.toFixed(1) + ' V cell; illustrative values.';
    }
    [sR, sI].forEach(function (s) { on(s, 'input', render); });
    steps(fig, [
      { text: 'The dashed line is <b>I × V</b>: the power the cell&#8217;s reaction releases grows in step with the current.' },
      { text: 'The cell&#8217;s own resistance takes <b>I²R</b> of it as heat (the red wedge), so the power that reaches the load, <b>P = IV − I²R</b>, bends over.' },
      { text: 'The curve peaks at <b>I = V/2R</b>, where it delivers V²/4R and wastes as much as heat. Lower the resistance and the peak moves up and out.' }
    ]);
    render();
  });

  /* f4-6: the words on a datasheet: state of charge, depth of discharge, cut-off voltages and the C-rate */
  register('f4-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var sS = fig.querySelector('.soc'), vS = fig.querySelector('.soc-val'), cb = fig.querySelectorAll('button[data-c]');
    var Q = 2.0, c = 0.2, x0 = 150, x1 = 430, y0 = 236, y1 = 36, vlo = 2.6, vhi = 4.5, Vup = 4.2, Vlow = 3.0;
    var X = function (q) { return x0 + q * (x1 - x0); }, Y = function (v) { return y0 - (v - vlo) / (vhi - vlo) * (y0 - y1); };
    function Vq(q) { return 4.18 - 0.62 * q - 0.10 * (1 - Math.exp(-10 * q)) - 0.55 * Math.exp(14 * (q - 1)); }
    // abuse zones above and below the cut-offs
    el('rect', { x: x0, y: Y(vhi), width: x1 - x0, height: Y(Vup) - Y(vhi), fill: 'var(--heat)', 'fill-opacity': .12 }, g);
    el('rect', { x: x0, y: Y(Vlow), width: x1 - x0, height: Y(vlo) - Y(Vlow), fill: 'var(--heat)', 'fill-opacity': .12 }, g);
    txt(g, x0 + 6, Y(vhi) + 15, 'overcharge', 'heat', 'start'); txt(g, x1 - 6, Y(vlo) - 6, 'over-discharge', 'heat', 'end');
    [[Vup, 'upper cut-off'], [Vlow, 'lower cut-off']].forEach(function (d) { el('line', { x1: x0, x2: x1, y1: Y(d[0]), y2: Y(d[0]), stroke: 'var(--heat)', 'stroke-width': 1.4 }, g); txt(g, x1 + 6, Y(d[0]) + 4, d[1], 'heat', 'start'); });
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    [3, 3.5, 4].forEach(function (v) { el('line', { x1: x0 - 4, x2: x0, y1: Y(v), y2: Y(v), stroke: 'var(--line-2)' }, g); txt(g, x0 - 8, Y(v) + 4, v.toFixed(1) + ' V', '', 'end'); });
    [0, 20, 40, 60, 80, 100].forEach(function (p) { el('line', { x1: X(p / 100), x2: X(p / 100), y1: y0, y2: y0 + 4, stroke: 'var(--line-2)' }, g); txt(g, X(p / 100), y0 + 17, String(p), '', 'middle'); });
    txt(g, x1, y0 + 33, 'depth of discharge, % →', '', 'end');
    // deep discharge
    el('line', { x1: X(0.8), x2: X(0.8), y1: Y(Vup), y2: y0, stroke: 'var(--muted)', 'stroke-dasharray': '3 4' }, g);
    txt(g, X(0.8) - 5, Y(3.22), '80 %: a deep', '', 'end'); txt(g, X(0.8) - 5, Y(3.22) + 14, 'discharge', '', 'end');
    var d = '', sum = 0, N = 200;
    for (var k = 0; k <= N; k++) { var q = k / N, v = Vq(q); if (v < Vlow) break; d += (k ? ' L' : 'M') + X(q).toFixed(1) + ',' + Y(v).toFixed(1); sum += v; }
    var qEnd = (k - 1) / N, vNom = sum / k;
    el('line', { x1: x0, x2: X(qEnd), y1: Y(vNom), y2: Y(vNom), stroke: 'var(--second)', 'stroke-dasharray': '6 4', 'stroke-width': 1.4 }, g);
    txt(g, x0 + 6, Y(vNom) + 16, 'nominal voltage ' + vNom.toFixed(2) + ' V', 'cyan', 'start');
    el('path', { d: d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g);
    var mk = el('circle', { r: 5.5, fill: 'var(--accent)', stroke: '#fff', 'stroke-width': 1.5 }, g);
    // the cell gauge
    var gx = 34, gw = 62, gy = 46, gh = 186;
    el('rect', { x: gx + gw * 0.32, y: gy - 8, width: gw * 0.36, height: 9, rx: 2, fill: M('steel'), stroke: '#8B95A0', 'stroke-width': .8 }, g);
    el('rect', { x: gx, y: gy, width: gw, height: gh, rx: 8, fill: 'var(--panel-2)', stroke: '#8B95A0', 'stroke-width': 1.4 }, g);
    var fill = el('rect', { x: gx + 5, width: gw - 10, rx: 4, fill: 'var(--accent)', 'fill-opacity': .85 }, g);
    var empty = el('rect', { x: gx + 5, y: gy + 5, width: gw - 10, rx: 4, fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }, g);
    var tS = txt(g, gx + gw / 2, 0, '', 'strong', 'middle', { style: 'fill:#fff' }), tD = txt(g, gx + gw / 2, 0, '', 'strong', 'middle');
    txt(g, gx + gw / 2, gy + gh + 22, 'SOC', 'amber', 'middle'); txt(g, gx + gw / 2, gy + gh + 38, 'and DOD', '', 'middle');
    badge(g, gx + gw + 14, gy + 10, 1); badge(g, x1 - 14, Y(Vup) - 18, 2); badge(g, 0, 0, 3);
    var b3 = svg.querySelectorAll('.callout')[2];
    function hm(h) { var hh = Math.floor(h + 1e-9), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } return (hh ? hh + ' h ' : '') + mm + ' min'; }
    function render() {
      var soc = +sS.value / 100, dod = 1 - soc, used = dod * Q, left = soc * Q, I = c * Q, t = soc / c;
      setSvgText(vS, Math.round(soc * 100) + ' %');
      Array.prototype.forEach.call(cb, function (b) { b.setAttribute('aria-pressed', String(Math.abs(+b.getAttribute('data-c') - c) < 1e-9)); });
      var fh = (gh - 10) * soc; fill.setAttribute('y', gy + 5 + (gh - 10) - fh); fill.setAttribute('height', Math.max(0, fh));
      empty.setAttribute('height', Math.max(0, (gh - 10) - fh));
      tS.setAttribute('y', gy + 5 + (gh - 10) - fh / 2 + 5); setSvgText(tS, fh > 24 ? Math.round(soc * 100) + ' %' : '');
      tD.setAttribute('y', gy + 5 + ((gh - 10) - fh) / 2 + 5); setSvgText(tD, (gh - 10) - fh > 24 ? Math.round(dod * 100) + ' %' : '');
      var qm = Math.min(dod, qEnd); mk.setAttribute('cx', X(qm)); mk.setAttribute('cy', Y(Vq(qm)));
      b3.setAttribute('transform', 'translate(' + (X(qm) + (qm > 0.7 ? -18 : 18)) + ',' + (Y(Vq(qm)) - 20) + ')');
      read.innerHTML = 'State of charge <b>' + Math.round(soc * 100) + ' %</b>, so depth of discharge <b>' + Math.round(dod * 100) + ' %</b>. Of a ' + Q.toFixed(1) + ' Ah cell, ' + used.toFixed(2) + ' Ah (' + Math.round(used * 3600) + ' C) has been used and ' + left.toFixed(2) + ' Ah remains. At <b>' + fmtRate(c) + '</b>, ' + I.toFixed(2) + ' A, a full discharge takes ' + hm(1 / c) + (soc > 0 ? ' and what remains lasts <b>' + hm(t) + '</b>' : '') + ', ignoring the capacity a fast discharge leaves behind (figure {{fig:f4-2}}). Schematic curve; illustrative cut-offs.';
    }
    on(sS, 'input', render);
    Array.prototype.forEach.call(cb, function (b) { on(b, 'click', function () { c = +b.getAttribute('data-c'); render(); }); });
    steps(fig, [
      { text: 'The <b>state of charge</b> is how much of the capacity is left; the <b>depth of discharge</b> is how much has been used. The two always add up to 100 %.' },
      { text: 'Between the <b>cut-off voltages</b> the cell is safe to use. Above the upper one it is overcharged and the electrolyte decomposes into gas; below the lower one it is over-discharged.' },
      { text: 'The <b>C-rate</b> sets the clock: 1C empties the cell in an hour, 2C in 30 minutes, C/5 in 5 hours, C/20 in 20 hours.' }
    ]);
    render();
  });

  /* f4-7: why lithium-ion won: the mass of a kilowatt-hour, and the list of pros and cons */
  register('f4-7', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), eb = fig.querySelectorAll('button[data-e]');
    var CH = [
      { n: 'lithium-ion', wh: 150, mat: 'lco', x: 60 },
      { n: 'nickel-metal hydride', wh: 100, mat: 'steel', x: 190 },
      { n: 'lead-acid', wh: 25, mat: 'lead', x: 320 }
    ];
    var base = 214, bl = el('g', {}, g), E = 1000;
    var CHIPS = [
      { k: 'pro', l: '3.6 V a cell', t: 'A lithium-ion cell works at about <b>3.6 V</b>, almost two to three times the voltage of a nickel-cadmium, nickel-metal hydride or lead-acid cell, and keeps a steady voltage under load until it is nearly discharged.' },
      { k: 'pro', l: 'no memory effect', t: 'There is <b>no memory effect</b>: a lithium-ion cell need not be fully discharged before it is recharged.' },
      { k: 'pro', l: 'self-discharge', t: 'Its <b>self-discharge</b> is low: about 5 % in the first four hours after charging, then 1 to 2 % a month, half that of nickel-cadmium (figure {{fig:f10-4}}).' },
      { k: 'pro', l: 'cycle life', t: 'Its <b>cycle life</b> is ten times that of lead-acid: over 2000 cycles it keeps about 80 % of its rated capacity, and it needs none of the regular maintenance of a lead-acid battery.' },
      { k: 'pro', l: '95 % round trip', t: 'About <b>95 %</b> of the energy put in comes back out, higher than in other batteries (figure {{fig:f4-4}}).' },
      { k: 'con', l: 'protection circuit', t: 'Every lithium-ion cell needs a <b>protection circuit</b>, and a cover to prevent short circuits ({{ch:safety}}).' },
      { k: 'con', l: 'BMS cost', t: 'High-power uses need advanced <b>battery management systems</b>, which raise the overall cost.' },
      { k: 'con', l: 'heat-sensitive', t: 'It is <b>sensitive to temperature</b> and can explode when overheated ({{ch:safety}}).' },
      { k: 'con', l: 'ages on the shelf', t: 'It <b>ages</b> markedly, and its performance declines even when it is not used for a long time ({{ch:degradation}}).' }
    ];
    var chips = [];
    CHIPS.forEach(function (c, i) {
      var row = c.k === 'pro' ? 0 : 1, w = 114, x = 400, y = 38 + i * 27 + row * 30;
      var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': c.l, style: 'cursor:pointer' }, g);
      c.box = el('rect', { x: x, y: y, width: w, height: 22, rx: 11, fill: 'var(--panel)', stroke: c.k === 'pro' ? 'var(--second)' : 'var(--heat)', 'stroke-width': 1.4 }, grp);
      txt(grp, x + w / 2, y + 15, c.l, '', 'middle', { style: 'font-size:11.5px' });
      pressable(grp, function () { sel = c; place(); });
      chips.push(c);
    });
    txt(g, 400, 28, 'for', 'cyan', 'start'); txt(g, 400, 200, 'against', 'heat', 'start'); el('line', { x1: 388, x2: 388, y1: 16, y2: 300, stroke: 'var(--line-2)' }, g);
    var sel = null;
    function blocks() {
      clear(bl);
      var unit = E >= 1000 ? 1 : 0.25, s = 14, gap = 2, per = 6;
      CH.forEach(function (c) {
        var kg = E / c.wh, nb = kg / unit, full = Math.floor(nb + 1e-9), frac = nb - full, xs = c.x - (per * (s + gap) - gap) / 2;
        for (var b = 0; b < Math.ceil(nb - 1e-9); b++) {
          var col = b % per, row = Math.floor(b / per), f = b < full ? 1 : frac;
          el('rect', { x: xs + col * (s + gap), y: base - (row + 1) * (s + gap) + gap, width: s * f, height: s, rx: 2, fill: M(c.mat), stroke: 'rgba(16,24,40,.35)', 'stroke-width': .6 }, bl);
        }
        txt(bl, c.x, base + 20, c.n, 'strong', 'middle');
        txt(bl, c.x, base + 36, c.wh + ' Wh/kg: ' + (kg < 10 ? kg.toFixed(1) : kg.toFixed(0)) + ' kg', '', 'middle');
      });
      txt(bl, 196, 28, E >= 1000 ? 'the mass that stores 1 kWh; one block = 1 kg' : 'the mass that stores 150 Wh; one block = 0.25 kg', 'strong', 'middle');
    }
    function place() {
      Array.prototype.forEach.call(eb, function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-e') === E)); });
      blocks();
      chips.forEach(function (c) { c.box.setAttribute('stroke-width', c === sel ? 3 : 1.4); c.box.setAttribute('fill', c === sel ? 'var(--accent-soft)' : 'var(--panel)'); });
      read.innerHTML = sel ? sel.t : (E >= 1000 ? 'To store one kilowatt-hour takes about <b>6.7 kg</b> of lithium-ion battery, 10 kg of nickel-metal hydride and <b>40 kg</b> of lead-acid, on one textbook&#8217;s round numbers of 150, 100 and 25 Wh/kg.' : 'The energy of <b>1 kg</b> of lithium-ion battery, 150 Wh, takes 1.5 kg of nickel-metal hydride and <b>6 kg</b> of lead-acid.');
    }
    Array.prototype.forEach.call(eb, function (b) { on(b, 'click', function () { E = +b.getAttribute('data-e'); sel = null; place(); }); });
    badge(g, 60, 156, 1); badge(g, 440, 23, 2); badge(g, 470, 195, 3);
    steps(fig, [
      { text: 'The same energy in three chemistries, drawn as mass: lithium-ion stores the most per kilogram.', on: function () { sel = null; place(); } },
      { text: 'What else lithium-ion offers: the five green chips. Tap one.', on: function () { sel = chips[0]; place(); } },
      { text: 'What it costs: the four red chips. Three of them call for electronics and covers around the cells.', on: function () { sel = chips[5]; place(); } }
    ]);
  });
