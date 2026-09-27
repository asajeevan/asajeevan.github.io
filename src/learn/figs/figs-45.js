  /* =================================================================
     Modules 4 and 5. A shared, clearly illustrative cell model feeds
     figures 4.2, 5.1 and 5.5. Its open-circuit shapes and parameters are
     not measurements; the equations it combines are the cited ones.
     ================================================================= */
  var RTF = P.R * P.T0 / P.F; // thermal voltage, 25.7 mV at 25 C
  function rateFromSlider(v) { return 0.1 * Math.pow(50, v / 100); } // 0.1C .. 5C, log scale
  function fmtRate(c) { return c < 1 ? 'C/' + Math.round(1 / c) : c.toFixed(c < 3 ? 1 : 0) + 'C'; }
  var model = {
    voc: function (shape, x) { // x = fraction of capacity delivered (0..1)
      if (shape === 'flat') return 3.42 - 0.02 * x - 0.9 * Math.pow(Math.max(0, x - 0.93) / 0.07, 2);
      return 4.15 - 0.5 * x - 0.25 * Math.pow(x, 4) - 0.2 * Math.pow(x, 12);
    },
    cut: function (shape) { return shape === 'flat' ? { lo: 2.5, hi: 3.9 } : { lo: 3.0, hi: 4.25 }; },
    eta: function (c, x) { // c in C-rate; ohmic + activation + concentration, illustrative parameters
      var ohm = 0.05 * c;                                   // R_b such that 1C costs 50 mV
      var act = 2 * RTF * Math.asinh(c / (2 * 0.3));        // exchange current of 0.3C
      var lim = 8;                                          // limiting current 8C
      var g = 1 + 5 * Math.pow(x, 4);                       // depletion near the end of discharge
      var f = (c / lim) * g;
      var conc = f >= 0.999 ? 10 : -4 * RTF * Math.log(1 - f); // rounded knee; the factor is illustrative
      return { ohm: ohm, act: act, conc: conc, total: ohm + act + conc };
    },
    curve: function (shape, c, charge) {
      var cut = this.cut(shape), pts = [], N = 200;
      for (var i = 0; i <= N; i++) {
        var x = i / N, e = this.eta(c, x).total, V = charge ? this.voc(shape, x) + e : this.voc(shape, x) - e;
        if (i > 0 && (charge ? V > cut.hi : V < cut.lo)) break;
        pts.push({ x: x, V: V });
      }
      if (pts.length < 2) pts.push({ x: 0.002, V: pts[0].V });
      return pts;
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
    P.data.materials.forEach(function (m) { var o = document.createElement('option'); o.value = m.key; setSvgText(o, m.name); sel.appendChild(o); });
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
        el('rect', { x: 180, y: y, width: w, height: 22, rx: 4, fill: r.me ? 'var(--amber)' : 'var(--cyan)', 'fill-opacity': r.me ? '.95' : '.45' }, g);
        txt(g, 174, y + 7, r.name, r.me ? 'strong' : '', 'end'); txt(g, 174, y + 24, r.basis, '', 'end');
        var inside = w > 200;
        txt(g, inside ? 176 + w : 186 + w, y + 15, Math.round(r.q) + ' mAh/g', 'strong', inside ? 'end' : 'start', inside ? { fill: '#1a1405' } : null);
      });
      txt(g, 480, 194, 'theoretical specific capacity, 0 to 4000 mAh/g, each on its own mass basis', '', 'end');
      read.innerHTML = 'Q = nF/(3.6 M) = ' + (+n.value) + ' × 96 485.3 / (3.6 × ' + (+M.value).toFixed(2) + ') = <b>' + Math.round(q) + ' mAh/g</b>' + (mat ? ' on the ' + mat.basis + ' basis' : '') + '. Against a counter electrode that puts the cell at ' + (+V.value).toFixed(1) + ' V, that is <b>' + Math.round(E) + ' Wh per kilogram of this electrode’s active material</b>, this electrode alone: the other electrode, the electrolyte and the packaging all add mass and none adds energy (see the note under figure 4.3).';
      note.innerHTML = mat ? (mat.printed ? '<span class="flag ok">reproduces the printed value, ' + mat.printed + ' mAh/g</span> ' : '<span class="flag">computed from Faraday’s law; the sources print no theoretical value for this one</span> ') + '<span class="flag">' + mat.practical + '</span>' : '<span class="flag">custom entry: computed, no printed check</span>';
    }
    on(sel, 'change', render);
    [M, n].forEach(function (i) { on(i, 'input', function () { sel.value = 'custom'; render(); }); });
    on(V, 'input', render);
    function fromCell() { var p = rung(cell.pos), nn = rung(cell.neg); V.value = Math.max(0.5, Math.min(5, p.V - nn.V)).toFixed(1); if (cell.pos === 'lfp' || cell.pos === 'lco' || cell.pos === 's') sel.value = cell.pos; render(); }
    steps(fig, [
      { text: 'The amber bar is the material you chose: its <b>theoretical capacity</b> from Faraday’s law, Q = nF/(3.6 M), in milliampere-hours per gram.' },
      { text: 'The cyan bars are three references. Read the small print: each is <b>per gram of a different thing</b> (the carbon host, the lithiated phosphate, the bare metal), so compare with care.' },
      { text: 'Multiply by the cell voltage and you get watt-hours per kilogram <b>of this electrode’s active material only</b>. Energy belongs to a pair of electrodes; a whole cell delivers far less per kilogram (the note under figure 4.3 says why).' }
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
    var area = el('path', { fill: 'var(--amber)', 'fill-opacity': '.22' }, g), line = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, g);
    var ref = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-opacity': '.45', 'stroke-dasharray': '3 4' }, g);
    // legend
    el('line', { x1: x0 + 14, x2: x0 + 40, y1: y1 + 14, y2: y1 + 14, stroke: 'var(--amber)', 'stroke-width': 2 }, g); txt(g, x0 + 46, y1 + 18, 'this rate', '');
    el('line', { x1: x0 + 120, x2: x0 + 146, y1: y1 + 14, y2: y1 + 14, stroke: 'var(--amber)', 'stroke-opacity': '.45', 'stroke-dasharray': '3 4' }, g); txt(g, x0 + 152, y1 + 18, 'C/10 reference', '');
    el('rect', { x: x0 + 250, y: y1 + 7, width: 26, height: 14, fill: 'var(--amber)', 'fill-opacity': '.22' }, g); txt(g, x0 + 282, y1 + 18, 'energy = area', '');
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
    badge(svg, 190, 60, 1); badge(svg, 440, 200, 2); badge(svg, 380, 60, 3);
    steps(fig, [
      { text: '<b>Supercapacitors</b> deliver energy fast but hold little; <b>fuel cells</b> hold much but deliver it slowly. Both axes are logarithmic and carry no numbers because the source figure is itself simplified.' },
      { text: '<b>Batteries</b> sit between the two and overlap both; a thin-film battery can reach the power of a supercapacitor.' },
      { text: 'The <b>combustion engine</b> is not an electrochemical device: it beats all three on both axes because its energy is stored in a fuel tank, not in an electrode. No single electrochemical system matches it, which is why the sources suggest combining them.' }
    ]);
  });

  /* ===== 5.1 Galvanostatic curve simulator ===== */
  register('f5-1', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), read = fig.querySelector('.readout'), sbtn = fig.querySelectorAll('button[data-shape]');
    var x0 = 60, y0 = 250, x1 = 490, y1 = 30, vmin = 2.0, vmax = 4.5, shape = shapeOfCell(), userShape = false;
    axes(el('g', {}, g), x0, y0, x1, y1, vmin, vmax, 'capacity, fraction of the low-rate value', 'V');
    var heat = el('path', { fill: 'var(--heat)', 'fill-opacity': '.18' }, g);
    var voc = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '3 4' }, g);
    var dis = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.2 }, g), ch = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2.2 }, g);
    var cutLo = el('line', { stroke: 'var(--line-2)', 'stroke-dasharray': '4 3' }, g), cutHi = el('line', { stroke: 'var(--line-2)', 'stroke-dasharray': '4 3' }, g);
    var lab = el('text', { x: x0 + 8, y: y1 + 14, 'class': 'lbl' }, g);
    function render() {
      var c = rateFromSlider(+rate.value); setSvgText(rv, fmtRate(c));
      Array.prototype.forEach.call(sbtn, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-shape') === shape)); });
      var d = model.curve(shape, c, false), u = model.curve(shape, c, true), o = [];
      for (var i = 0; i <= 200; i++) o.push({ x: i / 200, V: model.voc(shape, i / 200) });
      dis.setAttribute('d', pathOf(d, x0, y0, x1, y1, vmin, vmax)); ch.setAttribute('d', pathOf(u, x0, y0, x1, y1, vmin, vmax)); voc.setAttribute('d', pathOf(o, x0, y0, x1, y1, vmin, vmax));
      var n = Math.min(d.length, u.length);
      heat.setAttribute('d', n > 1 ? pathOf(u.slice(0, n), x0, y0, x1, y1, vmin, vmax) + ' ' + pathOf(d.slice(0, n).reverse(), x0, y0, x1, y1, vmin, vmax).replace('M', 'L') + ' Z' : '');
      var cut = model.cut(shape), yl = y0 - (cut.lo - vmin) / (vmax - vmin) * (y0 - y1), yh = y0 - (cut.hi - vmin) / (vmax - vmin) * (y0 - y1);
      cutLo.setAttribute('x1', x0); cutLo.setAttribute('x2', x1); cutLo.setAttribute('y1', yl); cutLo.setAttribute('y2', yl);
      cutHi.setAttribute('x1', x0); cutHi.setAttribute('x2', x1); cutHi.setAttribute('y1', yh); cutHi.setAttribute('y2', yh);
      setSvgText(lab, 'dashed grey: open-circuit curve; dashed lines: cut-off voltages');
      var e = model.eta(c, 0.5), q = d[d.length - 1].x;
      read.innerHTML = 'At ' + fmtRate(c) + ' the gap at mid-capacity is 2η = <b>' + Math.round(2 * e.total * 1000) + ' mV</b> (ohmic ' + Math.round(e.ohm * 1000) + ', activation ' + Math.round(e.act * 1000) + ', concentration ' + Math.round(e.conc * 1000) + ' mV); the discharge reaches <b>' + Math.round(q * 100) + ' %</b> of the low-rate capacity before the cut-off. The shaded band between the branches is energy that leaves as heat.';
    }
    rate.addEventListener('input', render);
    Array.prototype.forEach.call(sbtn, function (b) { b.addEventListener('click', function () { shape = b.getAttribute('data-shape'); userShape = true; render(); }); });
    cellListeners.push(function () { if (!userShape) { shape = shapeOfCell(); render(); } }); render();
  });

  /* ===== 5.2 The three polarizations in time ===== */
  register('f5-2', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot');
    var x0 = 60, y0 = 210, x1 = 490, y1 = 30, tmin = -7, tmax = 2, vmin = -0.12, vmax = 0.01;
    var X = function (logt) { return x0 + (logt - tmin) / (tmax - tmin) * (x1 - x0); }, Y = function (v) { return y0 - (v - vmin) / (vmax - vmin) * (y0 - y1); };
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    for (var k = tmin; k <= tmax; k++) { el('line', { x1: X(k), y1: y0, x2: X(k), y2: y0 + 5, stroke: 'var(--line-2)' }, g); var t = el('text', { x: X(k), y: y0 + 18, 'text-anchor': 'middle', 'class': 'lbl' }, g); setSvgText(t, '10' + (k < 0 ? '⁻' : '') + String(Math.abs(k)).replace(/\d/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]; })); }
    var xl = el('text', { x: x1, y: y0 + 34, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(xl, 'time after the current is switched off, seconds');
    var yl = el('text', { x: x0 - 8, y: Y(0) + 4, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(yl, 'V_oc');
    var yl2 = el('text', { x: x0 - 8, y: Y(-0.1) + 4, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(yl2, '−100 mV');
    var ohm = 0.03, act = 0.04, conc = 0.03, ta = 1e-3, tc = 2;
    var d = 'M' + X(tmin) + ',' + Y(-(act + conc)); // ohmic step already gone at 1e-7 s
    for (var i = 0; i <= 300; i++) { var lt = tmin + (tmax - tmin) * i / 300, tt = Math.pow(10, lt); d += ' L' + X(lt).toFixed(1) + ',' + Y(-(act * Math.exp(-tt / ta) + conc * Math.exp(-tt / tc))).toFixed(1); }
    el('path', { d: 'M' + (x0 - 6) + ',' + Y(-(ohm + act + conc)) + ' L' + x0 + ',' + Y(-(ohm + act + conc)) + ' L' + x0 + ',' + Y(-(act + conc)), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, g);
    var path = el('path', { d: d, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2, 'class': 'draw-in' }, g);
    var labs = [[X(-6.8), Y(-0.055), 'ohmic step: instant, under 10⁻⁶ s', 'start'], [X(-3), Y(-0.02), 'activation: 10⁻⁴ to 10⁻² s', 'middle'], [X(0.6), Y(-0.045), 'concentration: 10⁻² s and longer', 'middle']];
    labs.forEach(function (l) { var t = el('text', { x: l[0], y: l[1], 'class': 'lbl amber', 'text-anchor': l[3] }, g); setSvgText(t, l[2]); });
    el('rect', { x: X(-4), y: y1, width: X(-2) - X(-4), height: y0 - y1, fill: 'var(--cyan)', 'fill-opacity': '.06' }, g);
    el('rect', { x: X(-2), y: y1, width: x1 - X(-2), height: y0 - y1, fill: 'var(--amber)', 'fill-opacity': '.05' }, g);
    var L = path.getTotalLength(); path.style.strokeDasharray = L; path.style.strokeDashoffset = motion ? L : 0;
    var started = false;
    bind(fig, { start: function () { if (started || !motion) return; started = true; path.style.transition = 'stroke-dashoffset 2.6s cubic-bezier(.2,.7,.2,1)'; path.style.strokeDashoffset = 0; }, stop: function () {} });
  });

  /* ===== 5.3 Plateau or slope ===== */
  register('f5-3', function (fig) {
    var svg = fig.querySelector('svg'), core = svg.querySelector('.core'), soln = svg.querySelector('.soln'), tr = svg.querySelector('.trace');
    var y0 = 240, h = 30;
    function trace(cx, flat) { var d = ''; for (var i = 0; i <= 40; i++) { var x = i / 40, v = flat ? 0.5 : 0.85 - 0.7 * x; d += (i ? 'L' : 'M') + (cx - 56 + x * 112).toFixed(1) + ',' + (y0 - v * h).toFixed(1); } return d; }
    el('path', { d: trace(130, true), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, tr); el('path', { d: trace(390, false), fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, tr);
    var m1 = el('circle', { r: 4, 'class': 'ion' }, tr), m2 = el('circle', { r: 4, 'class': 'ion' }, tr);
    var t1 = el('text', { x: 130, y: y0 + 8, 'class': 'lbl', 'text-anchor': 'middle' }, tr); setSvgText(t1, 'voltage stays flat as lithium enters');
    var t2 = el('text', { x: 390, y: y0 + 8, 'class': 'lbl', 'text-anchor': 'middle' }, tr); setSvgText(t2, 'voltage slopes as lithium enters');
    var t = 0.35, running = false, raf = 0, t0 = null;
    function place(x) {
      core.setAttribute('r', String(56 * Math.sqrt(1 - x))); // unlithiated core shrinks, front sweeps in
      soln.setAttribute('fill-opacity', String(0.35 + 0.65 * x));
      m1.setAttribute('cx', 130 - 56 + x * 112); m1.setAttribute('cy', y0 - 0.5 * h);
      m2.setAttribute('cx', 390 - 56 + x * 112); m2.setAttribute('cy', y0 - (0.85 - 0.7 * x) * h);
    }
    function step(ts) { if (!running) return; var dt = t0 === null ? 0 : (ts - t0) / 1000; t0 = ts; t = (t + dt / 6) % 1; place(t); raf = requestAnimationFrame(step); }
    place(0.45);
    bind(fig, { start: function () { if (!motion || running) return; running = true; t0 = null; raf = requestAnimationFrame(step); }, stop: function () { running = false; cancelAnimationFrame(raf); } });
  });

  /* ===== 5.4 Cycle life and Coulombic efficiency ===== */
  register('f5-4', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), ce = fig.querySelector('.ce'), cv = fig.querySelector('.ce-val'), read = fig.querySelector('.readout');
    var x0 = 60, y0 = 220, x1 = 490, y1 = 30, N = 1000;
    var X = function (n) { return x0 + n / N * (x1 - x0); }, Y = function (r) { return y0 - r * (y0 - y1); };
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    [0, 250, 500, 750, 1000].forEach(function (n) { var t = el('text', { x: X(n), y: y0 + 16, 'text-anchor': 'middle', 'class': 'lbl' }, g); setSvgText(t, n); });
    [0.5, 0.8, 1].forEach(function (r) { var t = el('text', { x: x0 - 6, y: Y(r) + 4, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(t, Math.round(r * 100) + ' %'); });
    var xl = el('text', { x: x1, y: y0 + 32, 'text-anchor': 'end', 'class': 'lbl' }, g); setSvgText(xl, 'cycle number');
    el('line', { x1: x0, y1: Y(0.8), x2: x1, y2: Y(0.8), stroke: 'var(--amber)', 'stroke-dasharray': '4 3' }, g);
    var t80 = el('text', { x: x1, y: Y(0.8) - 5, 'text-anchor': 'end', 'class': 'lbl amber' }, g); setSvgText(t80, '80 %: end of life (Goodenough and Park)');
    el('line', { x1: X(300), y1: y0, x2: X(300), y2: y1, stroke: 'var(--cyan)', 'stroke-dasharray': '4 3' }, g);
    var t300 = el('text', { x: X(300) + 6, y: Y(0.45), 'class': 'lbl cyan' }, g); setSvgText(t300, '300 cycles: commercial minimum (Winter and Brodd)');
    var ghosts = [0.995, 0.999]; ghosts.forEach(function (c) { var d = ''; for (var n = 0; n <= N; n += 10) d += (n ? 'L' : 'M') + X(n).toFixed(1) + ',' + Y(Math.pow(c, n)).toFixed(1); el('path', { d: d, fill: 'none', stroke: 'var(--muted)', 'stroke-opacity': '.4' }, g); var t = el('text', { x: X(N) + 2, y: Y(Math.pow(c, N)) + 4, 'class': 'lbl' }, g); setSvgText(t, (c * 100).toFixed(1) + ' %'); });
    var line = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.2 }, g);
    function render() {
      var c = 0.99 + 0.0099 * (+ce.value / 100); c = Math.min(0.9999, c); setSvgText(cv, (c * 100).toFixed(2) + ' %');
      var d = ''; for (var n = 0; n <= N; n += 5) d += (n ? 'L' : 'M') + X(n).toFixed(1) + ',' + Y(Math.pow(c, n)).toFixed(1); line.setAttribute('d', d);
      var n80 = Math.log(0.8) / Math.log(c);
      read.innerHTML = 'If ' + (100 - c * 100).toFixed(2) + ' % of the charge is lost for good every cycle, the cell reaches 80 % after <b>' + Math.round(n80) + ' cycles</b>' + (n80 >= 300 ? ', which meets' : ', which fails') + ' the 300-cycle requirement. Real cells also lose capacity reversibly and unevenly, so treat this as an upper bound.';
    }
    ce.addEventListener('input', render); render();
  });

  /* ===== 5.5 Where the heat comes from ===== */
  register('f5-5', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), rate = fig.querySelector('.rate'), rv = fig.querySelector('.rate-val'), read = fig.querySelector('.readout'), sb = fig.querySelectorAll('button[data-sign]');
    var sign = 1, y0 = 120, sc = 600; // px per (V * C-rate) illustrative
    var zero = el('line', { x1: 60, y1: y0, x2: 490, y2: y0, stroke: 'var(--line-2)' }, g);
    var rev = el('rect', { x: 100, width: 110, rx: 4, fill: 'var(--cyan)', 'fill-opacity': '.7' }, g), irr = el('rect', { x: 300, width: 110, rx: 4, fill: 'var(--heat)', 'fill-opacity': '.8' }, g);
    var t1 = el('text', { x: 155, y: y0 + 40, 'text-anchor': 'middle', 'class': 'lbl strong' }, g); setSvgText(t1, 'reversible (entropic) heat');
    var t1b = el('text', { x: 155, y: y0 + 56, 'text-anchor': 'middle', 'class': 'lbl' }, g); setSvgText(t1b, 'sign set by dE/dT, size independent of rate');
    var t2 = el('text', { x: 355, y: y0 + 40, 'text-anchor': 'middle', 'class': 'lbl strong' }, g); setSvgText(t2, 'irreversible (Joule) heat, I·η');
    var t2b = el('text', { x: 355, y: y0 + 56, 'text-anchor': 'middle', 'class': 'lbl' }, g); setSvgText(t2b, 'grows faster than the current');
    var up = el('text', { x: 62, y: 40, 'class': 'lbl' }, g); setSvgText(up, 'heat released on discharge ↑');
    var dn = el('text', { x: 62, y: 206, 'class': 'lbl' }, g); setSvgText(dn, 'heat absorbed on discharge ↓');
    function render() {
      var c = rateFromSlider(+rate.value); setSvgText(rv, fmtRate(c));
      var e = model.eta(c, 0.5).total, q = c * e * sc, r = 0.012 * c * sc * sign; // entropic term proportional to current, sign by dE/dT
      irr.setAttribute('y', y0 - Math.min(q, 90)); irr.setAttribute('height', Math.min(q, 90));
      rev.setAttribute('y', r > 0 ? y0 - Math.min(r, 90) : y0); rev.setAttribute('height', Math.min(Math.abs(r), 90));
      Array.prototype.forEach.call(sb, function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-sign') === 'pos') === (sign < 0))); });
      read.innerHTML = 'On discharge at ' + fmtRate(c) + ': Joule heat I·η with η ≈ ' + Math.round(e * 1000) + ' mV. The entropic term is ' + (sign < 0 ? 'absorbed (positive dE/dT: the cell cools on discharge and heats on charge, as Ni-Cd does)' : 'released (negative dE/dT: the cell heats on discharge and cools on charge, as lead-acid does)') + '. In operation the irreversible part dominates.';
    }
    Array.prototype.forEach.call(sb, function (b) { b.addEventListener('click', function () { sign = b.getAttribute('data-sign') === 'pos' ? -1 : 1; render(); }); });
    sign = -1; rate.addEventListener('input', render); render();
  });

