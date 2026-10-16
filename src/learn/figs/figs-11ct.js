  /* ===================== Lab 1: cell assembly and galvanostatic testing (figures f11-28 to f11-33) ===================== */
  /* f11-28: a CR2032 half cell, part by part, and the order it is stacked in (NPL GPG 153, section 3.2) */
  register('f11-28', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sel = -1;
    // the parts, bottom to top, in the order of the stack: [name, colour fill, width, height, note]
    var PARTS = [
      ['Can', M('steel'), 300, 14, 'The <b>can</b> is the negative terminal of the finished cell; inside it is coated with aluminium. It goes in first, and the gasket sits in it with its narrower opening downwards.'],
      ['Gasket', MV('polymer'), 300, 10, 'The <b>gasket</b> is the polymer ring that insulates the can from the cap and seals the cell when it is crimped. Separate gaskets have slightly different top and bottom diameters: the smaller aperture faces down, on the can.'],
      ['Positive electrode, 14 mm', MV('lco'), 196, 10, 'The <b>positive electrode</b>: a 14 mm disc punched from the laminate, dried under vacuum for at least 12 h (120 °C for a PVDF binder), weighed, and placed with its coating upwards. Its active mass comes from the disc mass, the mean mass of bare collector discs and the formulation ({{fig:f11-29}}).'],
      ['Separator and 100 µL of electrolyte', MV('separator'), 240, 8, 'The <b>separator</b>, a polypropylene-polyethylene trilayer, never dried above 50 °C. Once it is in place, <b>100 µL</b> of electrolyte is dispensed onto it with a calibrated pipette; the electrodes are aligned through the translucent separator to limit edge effects.'],
      ['Lithium, 15 mm, 200 µm', M('lithium'), 210, 8, 'The <b>lithium disc</b>: 15 mm across and 200 µm thick, punched with its own punch on a PEEK or POM base, never on PTFE. Only shiny, smooth, grey lithium is used; black, white or reddish surfaces are rejected.'],
      ['Spacer, 16 mm, 0.3 mm', M('steel'), 224, 6, 'Two <b>spacers</b>, 16 mm across and 0.3 mm thick, fill the height of the can so that the stack is pressed. A spacer with a soldered wave washer can replace the top one.'],
      ['Spacer', M('steel'), 224, 6, 'The second spacer.'],
      ['Wave washer', M('steel'), 200, 10, 'The <b>wave washer</b> is the spring that keeps the stack under pressure after crimping.'],
      ['Cap', M('steel'), 290, 12, 'The <b>cap</b> closes the cell and becomes the positive terminal. The whole stack is then crimped at about 500 psi (3.4 MPa): undershooting is preferred to overshooting, which can short the cell.']
    ];
    var SHORT = ['Can', 'Gasket', 'Positive electrode', 'Separator, electrolyte', 'Lithium', 'Spacer', 'Spacer', 'Wave washer', 'Cap'];
    var ys = [], y = 258, shapes = [], CX = 330;
    PARTS.forEach(function (p, k) { y -= p[3] + 8; ys.push(y); });
    PARTS.forEach(function (p, k) {
      var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(p[0]), style: 'cursor:pointer' }, g);
      var x = CX - p[2] / 2;
      // a thin disc drawn in slight perspective: an ellipse top, a side face
      el('ellipse', { cx: CX, cy: ys[k] + p[3], rx: p[2] / 2, ry: 7, fill: p[1], stroke: 'rgba(20,23,28,.25)' }, grp);
      el('rect', { x: x, y: ys[k], width: p[2], height: p[3], fill: p[1], stroke: 'rgba(20,23,28,.25)' }, grp);
      el('ellipse', { cx: CX, cy: ys[k], rx: p[2] / 2, ry: 7, fill: p[1], stroke: 'rgba(20,23,28,.35)' }, grp);
      if (k === 0) el('ellipse', { cx: CX, cy: ys[k], rx: p[2] / 2 - 10, ry: 5, fill: 'none', stroke: 'rgba(20,23,28,.2)' }, grp);
      var hl = el('ellipse', { cx: CX, cy: ys[k] + p[3] / 2, rx: p[2] / 2 + 6, ry: 7 + p[3] / 2, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-opacity': 0 }, grp);
      txt(grp, 16, ys[k] + p[3] / 2 + 4, (k + 1) + '  ' + SHORT[k], '', 'start', { style: 'font-size:11px' });
      shapes.push(hl);
      pressable(grp, function () { sel = k; place(); });
    });
    txt(g, 16, 40, 'stacked in this order', 'tag', 'start', { style: 'font-size:11px' });
    arrow(g, 150, 262, 150, 52, 'var(--muted)', 1.2);
    txt(g, CX, 284, 'CR2032: 20 mm across, 3.2 mm tall', '', 'middle', { style: 'font-size:11px' });
    badge(g, 490, 100, 1); badge(g, 490, 200, 2); badge(g, 180, 30, 3);
    function place() {
      shapes.forEach(function (s, k) { s.setAttribute('stroke-opacity', k === sel ? 1 : 0); });
      read.innerHTML = sel < 0 ? 'Tap a part. Nine parts, in the order they go into the can; a half cell against lithium metal, the format most electrode studies start with.' : PARTS[sel][4];
    }
    steps(fig, [
      { text: 'A <b>half cell</b>: the electrode under study faces a disc of lithium metal, which supplies and takes lithium at a nearly fixed potential. Everything is assembled in an argon glovebox with oxygen and water below 0.1 ppm, because lithium reacts with both, and with nitrogen.', on: function () { sel = 4; place(); } },
      { text: 'The <b>order matters</b>: can, gasket, electrode, separator with the electrolyte dropped onto it, lithium, two spacers, wave washer, cap. Then the crimp, at about 500 psi. A cell is not a cell until it is crimped.', on: function () { sel = 0; place(); } },
      { text: 'Everything is <b>recorded</b>: the disc masses, the diameters, the electrolyte volume, the crimp pressure, the open-circuit voltage as assembled, the assembler and the date. The metadata is what later tells a bad batch from a bad idea.', on: function () { sel = 8; place(); } }
    ]);
    place();
  });

  /* f11-29: from a punched disc to a current: active mass, areal loading, theoretical capacity and the C-rate current */
  register('f11-29', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var sM = fig.querySelector('.dm'), sMv = fig.querySelector('.dm-val'), sF = fig.querySelector('.fa'), sFv = fig.querySelector('.fa-val'), sC = fig.querySelector('.cr'), sCv = fig.querySelector('.cr-val');
    var mb = fig.querySelectorAll('button[data-mat]'), mat = 'lfp';
    var MATS = { lfp: { n: 1, M: 157.76, name: 'LiFePO₄', q: null }, lco: { n: 1, M: 97.87, name: 'LiCoO₂', q: null }, gr: { n: 1, M: 72.07, name: 'graphite (LiC₆)', q: null } };
    Object.keys(MATS).forEach(function (k) { MATS[k].q = P.specificCapacity(MATS[k].n, MATS[k].M); });
    var D = 14, mCol = 6.2;   // a 14 mm disc; the mean mass of ten bare collector discs, in mg (15 µm aluminium foil: about 6 mg)
    // the chain of four boxes
    var BOX = [[20, 'disc mass', 'minus the collector'], [150, 'active mass', '× active fraction'], [280, 'areal loading', 'per cm² of disc'], [410, 'current at C-rate', 'from the capacity']];
    var vals = BOX.map(function (b, k) {
      el('rect', { x: b[0], y: 40, width: 100, height: 100, rx: 10, fill: 'var(--panel-2)', stroke: 'var(--line)' }, g);
      txt(g, b[0] + 50, 60, b[1], '', 'middle', { style: 'font-size:11px' });
      if (k < 3) arrow(g, b[0] + 102, 86, b[0] + 128, 86, 'var(--muted)', 1.4);
      return [txt(g, b[0] + 50, 92, '', 'strong', 'middle', { style: 'font-size:16px' }), txt(g, b[0] + 50, 112, b[2], '', 'middle', { style: 'font-size:10px' }), txt(g, b[0] + 50, 128, '', '', 'middle', { style: 'font-size:10px' })];
    });
    // the disc, with its diameter
    el('circle', { cx: 100, cy: 210, r: 42, fill: MV('lco'), stroke: '#1C1F23' }, g);
    el('line', { x1: 58, x2: 142, y1: 258, y2: 258, stroke: 'var(--text)', 'stroke-width': 1 }, g); txt(g, 100, 272, D + ' mm, ' + (Math.PI * 0.49).toFixed(2) + ' cm²', '', 'middle', { style: 'font-size:11px' });
    var tq = txt(g, 300, 180, '', '', 'start'), tq2 = txt(g, 300, 200, '', '', 'start'), tq3 = txt(g, 300, 220, '', 'strong', 'start'), tq4 = txt(g, 300, 244, '', '', 'start', { style: 'font-size:11px' }), tq5 = txt(g, 300, 260, '', '', 'start', { style: 'font-size:11px' });
    badge(g, 150, 160, 1); badge(g, 470, 160, 2); badge(g, 280, 150, 3);
    function place() {
      Array.prototype.forEach.call(mb, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-mat') === mat)); });
      var m = MATS[mat], mD = +sM.value, fA = +sF.value / 100, cr = Math.pow(10, +sC.value);
      setSvgText(sMv, mD.toFixed(1) + ' mg'); setSvgText(sFv, sF.value + ' %'); setSvgText(sCv, cr >= 1 ? cr.toFixed(cr >= 2 ? 0 : 1) + 'C' : 'C/' + (1 / cr).toFixed(0));
      var mA = P.lab.activeMass(mD / 1000, mCol / 1000, fA), load = P.lab.arealLoading(mA, D), Qth = m.q * mA, I = Qth * cr;   // mAh (mAh/g × g), mA
      setSvgText(vals[0][0], mD.toFixed(1) + ' mg'); setSvgText(vals[0][2], 'collector ' + mCol.toFixed(1) + ' mg');
      setSvgText(vals[1][0], (mA * 1000).toFixed(2) + ' mg'); setSvgText(vals[1][2], (fA * 100).toFixed(0) + ' % of the coating');
      setSvgText(vals[2][0], load.toFixed(2) + ' mg/cm²'); setSvgText(vals[2][2], (load * m.q / 1000).toFixed(2) + ' mAh/cm²');
      setSvgText(vals[3][0], (I >= 1 ? I.toFixed(2) + ' mA' : (I * 1000).toFixed(0) + ' µA')); setSvgText(vals[3][2], sCv.textContent + ', ' + (1 / cr).toFixed(1) + ' h');
      setSvgText(tq, m.name + ': n = ' + m.n + ', M = ' + m.M.toFixed(2) + ' g/mol');
      setSvgText(tq2, 'theoretical ' + m.q.toFixed(0) + ' mAh/g (nF/3.6M)');
      setSvgText(tq3, 'disc capacity ' + Qth.toFixed(3) + ' mAh');
      setSvgText(tq4, 'at ' + sCv.textContent + ' the current is ' + (I >= 1 ? I.toFixed(3) + ' mA' : (I * 1000).toFixed(0) + ' µA'));
      setSvgText(tq5, 'for ' + (1 / cr).toFixed(1) + ' h per half cycle');
      read.innerHTML = 'A ' + D + ' mm disc of ' + m.name + ' weighing ' + mD.toFixed(1) + ' mg, on a collector of ' + mCol.toFixed(1) + ' mg, with ' + (fA * 100).toFixed(0) + ' % active material: <b>' + (mA * 1000).toFixed(2) + ' mg</b> of active material, a loading of <b>' + load.toFixed(2) + ' mg/cm²</b> (' + (load * m.q / 1000).toFixed(2) + ' mAh/cm²), a theoretical capacity of <b>' + Qth.toFixed(3) + ' mAh</b>, and a current of <b>' + (I >= 1 ? I.toFixed(3) + ' mA' : (I * 1000).toFixed(0) + ' µA') + '</b> at ' + sCv.textContent + '. The practical capacity, measured in a slow first cycle, is what later C-rates are usually defined from.';
    }
    Array.prototype.forEach.call(mb, function (bt) { on(bt, 'click', function () { mat = bt.getAttribute('data-mat'); place(); }); });
    on(sM, 'input', place); on(sF, 'input', place); on(sC, 'input', place);
    steps(fig, [
      { text: 'Weigh the <b>disc</b>, subtract the mean mass of at least ten bare collector discs punched with the same punch, and multiply by the active fraction of the formulation: that is the active mass.' },
      { text: 'The <b>C-rate current</b> follows from the capacity: 1C discharges the capacity in one hour, C/10 in ten. Set the rate here and read the current to type into the cycler.' },
      { text: 'The theoretical capacity nF/M is a ceiling. Define the C-rate from the <b>practical</b> capacity of a slow first cycle, and say which one you used; it changes every number that follows.' }
    ]);
    place();
  });

  /* f11-30: before the first cycle: the open-circuit voltage as assembled, the crimp, and what goes wrong */
  register('f11-30', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sv = fig.querySelector('.ocv'), svv = fig.querySelector('.ocv-val');
    // a gauge of the OCV, with the zones of NPL GPG 153 for NMC 811 against lithium
    var b = { x0: 60, y0: 120, x1: 460, y1: 120 }, X = function (v) { return b.x0 + (v - 1) / 2.6 * (b.x1 - b.x0); };
    el('rect', { x: X(1), y: 104, width: X(2) - X(1), height: 32, fill: 'var(--heat)', 'fill-opacity': .25 }, g);
    el('rect', { x: X(2), y: 104, width: X(3.18) - X(2), height: 32, fill: 'var(--warm, #F0A35B)', 'fill-opacity': .3 }, g);
    el('rect', { x: X(3.18), y: 104, width: X(3.45) - X(3.18), height: 32, fill: 'var(--second)', 'fill-opacity': .3 }, g);
    el('rect', { x: X(3.45), y: 104, width: X(3.6) - X(3.45), height: 32, fill: 'var(--warm, #F0A35B)', 'fill-opacity': .3 }, g);
    [1, 1.5, 2, 2.5, 3, 3.18, 3.45].forEach(function (v) { el('line', { x1: X(v), x2: X(v), y1: 136, y2: 142, stroke: 'var(--line-2)' }, g); txt(g, X(v), 156, String(v), '', 'middle', { style: 'font-size:11px' }); });
    txt(g, X(1.5), 96, 'discard', 'heat', 'middle', { style: 'font-size:11px' }); txt(g, X(2.6), 96, 'cycles, but seldom reproducible', '', 'middle', { style: 'font-size:11px' }); txt(g, X(3.31), 84, 'in range', 'cyan', 'middle', { style: 'font-size:11px' });
    txt(g, b.x1, 172, 'open-circuit voltage as assembled, V vs Li⁺/Li (NMC 811)', '', 'end', { style: 'font-size:11px' });
    var needle = el('path', { d: 'M0,-14 L6,0 L-6,0 Z', fill: 'var(--text)' }, g), nt = txt(g, 0, 60, '', 'strong', 'middle');
    // the crimp gauge
    var cb = { x0: 60, x1: 460, y: 232 }, Xp = function (p) { return cb.x0 + p / 900 * (cb.x1 - cb.x0); };
    el('rect', { x: Xp(0), y: 220, width: Xp(900) - Xp(0), height: 24, rx: 4, fill: 'var(--panel-2)', stroke: 'var(--line)' }, g);
    el('rect', { x: Xp(450), y: 220, width: Xp(550) - Xp(450), height: 24, fill: 'var(--second)', 'fill-opacity': .3 }, g);
    el('rect', { x: Xp(700), y: 220, width: Xp(900) - Xp(700), height: 24, fill: 'var(--heat)', 'fill-opacity': .25 }, g);
    [0, 300, 500, 700, 900].forEach(function (p) { el('line', { x1: Xp(p), x2: Xp(p), y1: 244, y2: 250, stroke: 'var(--line-2)' }, g); txt(g, Xp(p), 264, String(p), '', 'middle', { style: 'font-size:11px' }); });
    txt(g, Xp(500), 212, 'target 500 psi', 'cyan', 'middle', { style: 'font-size:11px' }); txt(g, Xp(800), 212, 'over 700: shorts, stuck cells', 'heat', 'middle', { style: 'font-size:11px' });
    txt(g, b.x1, 282, 'crimp pressure, psi (3.4 MPa at 500)', '', 'end', { style: 'font-size:11px' });
    badge(g, 30, 120, 1); badge(g, 30, 232, 2); badge(g, 486, 60, 3);
    function place() {
      var v = +sv.value; setSvgText(svv, v.toFixed(2) + ' V');
      needle.setAttribute('transform', 'translate(' + X(v).toFixed(1) + ',102)'); nt.setAttribute('x', X(v)); setSvgText(nt, v.toFixed(2) + ' V');
      var verdict = v <= 2 ? 'at or below 2.00 V: <b>discard</b>. Something is shorting the cell, or the lithium is bad.' : v < 3.18 ? 'between 2.00 and 3.18 V: the cell may cycle, but such cells are often not reproducible, for no obvious reason. Cycle it at your own risk, and say so in the notes.' : v <= 3.45 ? '<b>in range</b> (3.18 to 3.45 V for NMC 811 with a carbonate electrolyte and a Celgard 2325 separator). Label the can with the cell number in permanent marker and bag it.' : 'above the expected range for this chemistry: check the wiring of the meter and the electrode. Every chemistry has its own range; record yours.';
      read.innerHTML = 'Open-circuit voltage as assembled, ' + v.toFixed(2) + ' V: ' + verdict;
    }
    on(sv, 'input', place);
    steps(fig, [
      { text: 'Before any cycling, measure the <b>open-circuit voltage</b> of the fresh cell with a hand-held meter and compare it with the range expected for its chemistry. A low value means a short or bad lithium; discard rather than hope.' },
      { text: 'The <b>crimp</b> seals the cell: too little pressure and it leaks or loses contact, too much and the stack shorts. Aim for the target and record the estimate when it falls short.' },
      { text: 'Then <b>clean</b> the cell in the glovebox with a wipe of DMC or acetone: salt residue on the outside turns into HF in air and corrodes the can and the holders. Check the holders before every run.' }
    ]);
    place();
  });

  /* f11-31: the cycling protocol: constant current, constant voltage, rest, constant-current discharge */
  register('f11-31', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var sc = fig.querySelector('.pc'), scv = fig.querySelector('.pc-val'), sr = fig.querySelector('.pr'), srv = fig.querySelector('.pr-val');
    var U = function (x) { return P.lfpOcp(1 - x) - P.m9.graphiteU(x); }, Q = 0.002, Vmax = 3.8, Vmin = 2.5, TAU = 0.04;
    var b = { x0: 58, y0: 140, x1: 500, y1: 30 }, bi = { x0: 58, y0: 250, x1: 500, y1: 196 }, gv = el('g', {}, g), gi = el('g', {}, g);
    var fV, fI, pv, pi, zones = [], labs = [];
    badge(g, 100, 70, 1); badge(g, 330, 70, 2); badge(g, 470, 210, 3);
    function place() {
      var cr = Math.pow(10, +sc.value), R = +sr.value;
      setSvgText(scv, cr >= 1 ? cr.toFixed(cr >= 2 ? 0 : 1) + 'C' : 'C/' + (1 / cr).toFixed(0)); setSvgText(srv, R + ' Ω');
      var o = P.lab.cccv({ U: U, Q: Q, R: R, crate: cr, Vmax: Vmax, Vmin: Vmin, cvRate: 0.05, dt: 1 / 1200, tau: TAU }), T = o.t[o.t.length - 1];
      clear(gv); clear(gi);
      var xt = [0, 0.25, 0.5, 0.75, 1].map(function (f) { return [f * T, (f * T).toFixed(T >= 4 ? 0 : 1)]; });
      fV = cvFrame(gv, b, [0, T], [2.4, 4.1], { xt: xt, yt: [[2.5, '2.5'], [3.0, '3.0'], [3.5, '3.5']], yl: 'cell voltage, V' });
      fI = cvFrame(gi, bi, [0, T], [-Q * cr * 1100, Q * cr * 1100], { xt: xt, yt: [[-Q * cr * 1000, '−' + (Q * cr * 1000).toFixed(1)], [0, '0'], [Q * cr * 1000, (Q * cr * 1000).toFixed(1)]], zero: true, xl: 'time, h', yl: 'current, mA' });
      el('line', { x1: b.x0, x2: b.x1, y1: fV.Y(Vmax), y2: fV.Y(Vmax), stroke: 'var(--line-2)', 'stroke-dasharray': '4 3' }, gv); txt(gv, b.x1 - 4, fV.Y(Vmax) + 12, 'upper cut-off ' + Vmax + ' V', '', 'end', { style: 'font-size:10px' });
      el('line', { x1: b.x0, x2: b.x1, y1: fV.Y(Vmin), y2: fV.Y(Vmin), stroke: 'var(--line-2)', 'stroke-dasharray': '4 3' }, gv); txt(gv, b.x1 - 4, fV.Y(Vmin) - 4, 'lower cut-off ' + Vmin + ' V', '', 'end', { style: 'font-size:10px' });
      // the phases, shaded
      var tcc = o.Qcc / (Q * cr), tcv = tcc, tdis0 = T, k;
      for (k = 0; k < o.t.length; k++) { if (o.I[k] > 0) tcv = o.t[k]; if (o.I[k] < 0) { tdis0 = o.t[k]; break; } }
      [[0, tcc, 'CC charge', 'var(--accent)'], [tcc, tcv, 'CV', 'var(--second)'], [tcv, tdis0, 'rest', 'var(--muted)'], [tdis0, T, 'CC discharge', 'var(--heat)']].forEach(function (z) {
        el('rect', { x: fV.X(z[0]), y: b.y1, width: Math.max(0, fV.X(z[1]) - fV.X(z[0])), height: b.y0 - b.y1, fill: z[3], 'fill-opacity': .06 }, gv);
        if (fV.X(z[1]) - fV.X(z[0]) > 24) txt(gv, (fV.X(z[0]) + fV.X(z[1])) / 2, b.y1 + 12, z[2], '', 'middle', { style: 'font-size:10px;fill:' + z[3] });
      });
      var step = Math.max(1, Math.floor(o.t.length / 600)), ts = [], vs = [], is = [];
      for (k = 0; k < o.t.length; k += step) { ts.push(o.t[k]); vs.push(o.V[k]); is.push(o.I[k] * 1000); }
      el('path', { d: cvPath(ts, vs, fV.X, fV.Y), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2 }, gv);
      el('path', { d: cvPath(ts, is, fI.X, fI.Y), fill: 'none', stroke: 'var(--heat)', 'stroke-width': 2 }, gi);
      var cvShare = 100 * o.Qcv / o.Qch;
      read.innerHTML = 'At ' + scv.textContent + ' behind ' + R + ' Ω, the constant-current charge reaches ' + Vmax + ' V after ' + (o.Qcc * 1000).toFixed(2) + ' mAh; the constant-voltage hold adds <b>' + (o.Qcv * 1000).toFixed(2) + ' mAh (' + cvShare.toFixed(0) + ' %)</b> before the current falls to C/20. After a rest the discharge returns ' + (o.Qdis * 1000).toFixed(2) + ' mAh. Illustrative: a 2 mAh LiFePO₄ | graphite cell as one resistance in series with its open-circuit curve, the surface of the particles leading the average in proportion to the current; the model has no side reactions; what the discharge does not return is lithium left behind by the cut-off, which the next cycle would recover, not a loss.';
    }
    on(sc, 'input', place); on(sr, 'input', place);
    steps(fig, [
      { text: 'A cycle has four parts. <b>Constant current</b> until the upper cut-off; the voltage rises with the state of charge plus the i R drop.', on: function () { sc.value = 0; sr.value = 60; place(); } },
      { text: 'At the cut-off the cycler <b>holds the voltage</b> and the current decays; what flows in now is charge the i R drop had hidden. The hold ends at a current limit, C/20 here. The faster the rate or the larger the resistance, the larger its share.', on: function () { sc.value = 0; sr.value = 150; place(); } },
      { text: 'A <b>rest</b>, then a constant-current <b>discharge</b> to the lower cut-off. Capacity is the current times the time; Coulombic efficiency is the discharge capacity over the charge capacity. Report the window, the rates, the rest and the temperature with every number.', on: function () { sc.value = -1; sr.value = 60; place(); } }
    ]);
    place();
  });

  /* f11-32: Coulombic efficiency compounds: what a cell keeps after n cycles if it loses the same fraction each cycle */
  register('f11-32', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sce = fig.querySelector('.ce'), scev = fig.querySelector('.ce-val');
    var b = { x0: 58, y0: 236, x1: 330, y1: 34 }, fr = cvFrame(g, b, [0, 1000], [0.5, 1.02], { xt: [[0, '0'], [250, '250'], [500, '500'], [750, '750'], [1000, '1000']], yt: [[0.5, '50'], [0.6, '60'], [0.7, '70'], [0.8, '80'], [0.9, '90'], [1, '100']], xl: 'cycles', yl: 'capacity kept, % of the first' });
    el('line', { x1: b.x0, x2: b.x1, y1: fr.Y(0.8), y2: fr.Y(0.8), stroke: 'var(--heat)', 'stroke-dasharray': '4 3' }, g); txt(g, b.x1 - 2, fr.Y(0.8) - 4, '80 %: a common end of life', 'heat', 'end', { style: 'font-size:10px' });
    var REF = [[0.99, '99 %'], [0.995, '99.5 %'], [0.999, '99.9 %'], [0.9995, '99.95 %'], [0.9999, '99.99 %']];
    function curve(ce) { var d = '', on = false; for (var n = 0; n <= 1000; n += 5) { var v = P.lab.retention(ce, n); if (v < 0.5) break; d += (on ? 'L' : 'M') + fr.X(n).toFixed(1) + ',' + fr.Y(v).toFixed(1); on = true; } return d; }
    REF.forEach(function (r, k) { el('path', { d: curve(r[0]), fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 1.2 }, g); var lv = [0.62, 0.72, 0.56, 0, 0][k], nl = lv ? P.lab.cyclesTo(r[0], lv) : 1000, yv = lv || P.lab.retention(r[0], 1000); txt(g, fr.X(nl) + (lv ? 5 : -3), fr.Y(yv) + (lv ? 4 : (k === 4 ? -5 : 12)), r[1], '', lv ? 'start' : 'end', { style: 'font-size:10px' }); });
    var cur = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }, g), dot = el('circle', { r: 5, fill: 'var(--accent)', stroke: '#fff' }, g);
    // the right panel: the loss per cycle as a bar you can barely see
    var pb = { x0: 380, y0: 236, x1: 500, y1: 34 }, pf = cvFrame(g, pb, [0, 1], [0, 1], { yt: [[0, '0'], [0.5, '50'], [1, '100']], yl: 'one cycle, %' });
    el('rect', { x: pf.X(0.2), y: pf.Y(1), width: pf.X(0.8) - pf.X(0.2), height: pf.Y(0) - pf.Y(1), fill: 'var(--accent)', 'fill-opacity': .18 }, g);
    var lost = el('rect', { x: pf.X(0.2), width: pf.X(0.8) - pf.X(0.2), fill: 'var(--heat)' }, g), lt = txt(g, pf.X(0.5), pf.Y(1) + 20, '', 'heat', 'middle', { style: 'font-size:10px' });
    txt(g, pf.X(0.5), pf.Y(0) + 16, 'charged', '', 'middle', { style: 'font-size:11px' });
    badge(g, fr.X(120), fr.Y(0.93), 1); badge(g, pf.X(0.5), pf.Y(0.45), 2); badge(g, fr.X(560), fr.Y(0.58), 3);
    function place() {
      var ce = +sce.value / 100; setSvgText(scev, (+sce.value).toFixed(2) + ' %');
      cur.setAttribute('d', curve(ce));
      var n80 = P.lab.cyclesTo(ce, 0.8), nd = Math.min(1000, n80); dot.setAttribute('cx', fr.X(nd)); dot.setAttribute('cy', fr.Y(Math.max(0.5, P.lab.retention(ce, nd)))); dot.style.display = n80 > 1000 ? 'none' : '';
      var h = Math.max(1.5, (1 - ce) * (pf.Y(0) - pf.Y(1))); lost.setAttribute('y', pf.Y(1)); lost.setAttribute('height', h); setSvgText(lt, 'lost: ' + ((1 - ce) * 100).toFixed(2) + ' %');
      read.innerHTML = 'If every cycle returns <b>' + (+sce.value).toFixed(2) + ' %</b> of what went in and loses the rest for good, the capacity after n cycles is CE<sup>n</sup>: <b>' + (P.lab.retention(ce, 100) * 100).toFixed(1) + ' % after 100 cycles</b>, ' + (P.lab.retention(ce, 500) * 100).toFixed(1) + ' % after 500, and 80 % is reached after about <b>' + (n80 > 20000 ? 'more than 20 000' : n80.toFixed(0)) + ' cycles</b>. Telling 99.90 from 99.95 % needs the charge measured to better than 0.05 %; a cycler that is 0.1 % accurate cannot, and ten cycles of it cannot rank two materials by cycle life. This is a simple sum, not a model of any mechanism.';
    }
    on(sce, 'input', place);
    steps(fig, [
      { text: 'Coulombic efficiency is the <b>discharge capacity over the charge capacity</b> of a cycle. Below 100 %, some of the charge went into side reactions, such as the growth of the SEI, rather than into lithium that comes back.' },
      { text: 'A loss of 0.1 % per cycle is invisible in one cycle; the bar on the right barely shows it. It <b>compounds</b>: the curves on the left are CE<sup>n</sup> for five values of CE.' },
      { text: 'So the first cycles do not predict the thousandth unless CE is measured with high precision, under controlled temperature, at a fixed rate and window. A fresh cell also loses extra charge in its <b>first cycle</b>, when the SEI forms; report the first-cycle efficiency separately.' }
    ]);
    place();
  });

  /* f11-33: rate and temperature: a rate test as a staircase of capacities, with the resistance set by temperature */
  register('f11-33', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), st = fig.querySelector('.rt'), stv = fig.querySelector('.rt-val');
    var U = function (x) { return P.lfpOcp(1 - x) - P.m9.graphiteU(x); }, Q = 0.002, Vmax = 3.8, Vmin = 2.5;
    var RATES = [0.1, 0.2, 0.5, 1, 2, 5, 0.1], R25 = 60, TAU25 = 0.04, Ea = 40e3;   // resistance and lag both follow an Arrhenius law: illustrative
    var b = { x0: 58, y0: 236, x1: 300, y1: 34 }, fr = cvFrame(g, b, [0, 35], [0, 2.2], { xt: [[0, '0'], [10, '10'], [20, '20'], [30, '30']], yt: [[0, '0'], [0.5, '0.5'], [1, '1.0'], [1.5, '1.5'], [2, '2.0']], xl: 'cycle', yl: 'discharge capacity, mAh' });
    RATES.forEach(function (r, k) { txt(g, fr.X(k * 5 + 2.5), b.y1 + 12, r >= 1 ? r + 'C' : 'C/' + (1 / r), '', 'middle', { style: 'font-size:10px' }); if (k) el('line', { x1: fr.X(k * 5), x2: fr.X(k * 5), y1: b.y1, y2: b.y0, stroke: 'var(--line)', 'stroke-dasharray': '2 4' }, g); });
    var gp = el('g', {}, g);
    var pb = { x0: 360, y0: 236, x1: 500, y1: 34 }, pf = cvFrame(g, pb, [2.4, 3.8], [0, 2.1], { xt: [[2.5, '2.5'], [3, '3.0'], [3.5, '3.5']], yt: [[0, '0'], [1, '1'], [2, '2']], xl: 'V', yl: 'discharge curves' });
    var gc = el('g', {}, g);
    badge(g, fr.X(27), fr.Y(1.5), 1); badge(g, fr.X(33), fr.Y(0.5), 2); badge(g, pf.X(2.7), pf.Y(1.8), 3);
    function place() {
      var T = +st.value; setSvgText(stv, T + ' °C');
      var ar = Math.exp(Ea / 8.314 * (1 / (T + 273.15) - 1 / 298.15)), R = R25 * ar, tau = TAU25 * ar;
      clear(gp); clear(gc);
      var caps = [], COL = ['#9DB4F0', '#7C9BEB', '#5A80E3', '#3A66D8', '#1F48D6', '#15348F', '#9DB4F0'];
      RATES.forEach(function (r, k) {
        var o = P.lab.cccv({ U: U, Q: Q, R: R, crate: r, Vmax: Vmax, Vmin: Vmin, cvRate: 0.05, dt: 1 / 600, tau: tau }), q = o.Qdis * 1000; caps.push(q);
        for (var c = 0; c < 5; c++) el('circle', { cx: fr.X(k * 5 + c + 0.5), cy: fr.Y(q), r: 3.5, fill: COL[k], stroke: '#fff' }, gp);
        // the discharge curve: capacity against voltage
        var d = '', acc = 0, first = true;
        for (var m = 0; m < o.t.length; m++) if (o.I[m] < 0) { acc += -o.I[m] * (o.t[m] - o.t[m - 1]) * 1000; if (m % 4 === 0) { d += (first ? 'M' : 'L') + pf.X(o.V[m]).toFixed(1) + ',' + pf.Y(acc).toFixed(1); first = false; } }
        if (k < 6) el('path', { d: d, fill: 'none', stroke: COL[k], 'stroke-width': 1.6 }, gc);
      });
      read.innerHTML = 'At ' + T + ' °C the cell&#8217;s resistance is ' + R.toFixed(0) + ' Ω in this model, and its surface lag ' + (tau * 60).toFixed(1) + ' min at 1C. The discharge capacity falls from ' + caps[0].toFixed(2) + ' mAh at C/10 to <b>' + caps[5].toFixed(2) + ' mAh at 5C</b>, because the i R drop reaches the lower cut-off earlier; back at C/10 the cell returns <b>' + caps[6].toFixed(2) + ' mAh</b>, so nothing was lost, only hidden by polarization. Illustrative: the resistance and the lag of the particle surface behind its average both follow an Arrhenius law with 40 kJ/mol, a choice of ours; the cell is that of {{fig:f11-31}}.';
    }
    on(st, 'input', place);
    steps(fig, [
      { text: 'A <b>rate test</b> runs five cycles at each rate, from slow to fast. The capacity falls with rate because the i R drop, and the concentration polarization behind it, bring the voltage to the cut-off before the electrode is empty.' },
      { text: 'The last step <b>returns to the slow rate</b>. If the capacity comes back, the fast cycles cost nothing lasting; if it does not, they did damage, such as plating on graphite.' },
      { text: 'Lower the <b>temperature</b>: the resistance rises, every curve sags, and the fast rates lose most. That is why a test without a temperature chamber cannot be compared with another laboratory&#8217;s.' }
    ]);
    place();
  });
