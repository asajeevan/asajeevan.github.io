  /* ===================== Lab 6: post-mortem (figures f11-34 to f11-39) ===================== */
  /* f11-34: the post-mortem workflow, outside first, as a ladder of steps */
  register('f11-34', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sel = 0;
    var STEPS = [
      ['Outside first', 'capacity, dV/dQ, EIS', 'Everything that can be learnt without opening is learnt first: the capacity and its history, the differential curves that flag lost lithium, lost material and plating, the impedance spectrum. A cell that is opened cannot be measured again, and a fresh cell treated the same way is the baseline.'],
      ['Discharge', 'to the cut-off, slowly', 'The cell is discharged to its lower cut-off, at C/2 with a constant-voltage hold to C/50 in one study, so that the positive electrode is as full of lithium as it can be and the negative as empty: the safest state, and the one in which what is missing shows.'],
      ['Open in argon', 'O₂ and H₂O ≤ 1 ppm', 'The pouch is cut along its long side with ceramic scissors and a scalpel, without touching the stack or shorting it, inside an argon glovebox with oxygen and water below 1 ppm, so that nothing on the electrodes reacts with air before it is seen.'],
      ['Map the samples', 'stack, edge and centre', 'A large cell ages unevenly. Samples are cut from the beginning, middle and end of the stack, and from the edge and centre of each sheet, and each is labelled by its position; one measurement per cell would hide the pattern.'],
      ['Wash, or not', 'a DMC dip, or none', 'Electrolyte residue is removed with a dip in dimethyl carbonate and vacuum drying at room temperature; but surface spectroscopy is done on unwashed samples, and bulky deposits are left unwashed because washing would carry them away.'],
      ['Measure', 'one question, one technique', 'Then the techniques, each for one question: peel tests for adhesion, microscopy for morphology, diffraction for the lithium left in the lattice, spectroscopy for the surface layers, and the electrode rebuilt in a coin cell for the capacity it can still deliver.']
    ];
    var boxes = [];
    STEPS.forEach(function (s, k) {
      var x = 20 + (k % 3) * 166, y = 36 + Math.floor(k / 3) * 118;
      var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(s[0]), style: 'cursor:pointer' }, g);
      var r = el('rect', { x: x, y: y, width: 150, height: 90, rx: 12, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, grp);
      el('circle', { cx: x + 20, cy: y + 20, r: 11, fill: 'var(--accent)' }, grp); txt(grp, x + 20, y + 24, String(k + 1), 'strong', 'middle', { style: 'fill:#fff;font-size:11px' });
      txt(grp, x + 38, y + 24, s[0], 'strong', 'start', { style: 'font-size:12px' });
      txt(grp, x + 12, y + 48, s[1], '', 'start', { style: 'font-size:10.5px' });
      if (k < 5) arrow(g, k % 3 === 2 ? x + 75 : x + 152, k % 3 === 2 ? y + 92 : y + 45, k % 3 === 2 ? x + 75 : x + 164, k % 3 === 2 ? y + 116 : y + 45, 'var(--muted)', 1.4);
      boxes.push(r); pressable(grp, function () { sel = k; place(); });
    });
    // the one-way sign
    txt(g, 260, 272, 'one way: a cell that has been opened cannot be measured again', 'heat', 'middle', { style: 'font-size:11px' });
    badge(g, 505, 40, 1); badge(g, 505, 250, 2); badge(g, 20, 262, 3);
    function place() { boxes.forEach(function (r, k) { r.setAttribute('stroke', k === sel ? 'var(--accent)' : 'var(--line-2)'); r.setAttribute('stroke-width', k === sel ? 2 : 1); }); read.innerHTML = '<b>' + (sel + 1) + '. ' + STEPS[sel][0] + '.</b> ' + STEPS[sel][2]; }
    steps(fig, [
      { text: 'The order is the method. Nothing is opened before the <b>non-destructive</b> record is complete, because opening ends the experiment.', on: function () { sel = 0; place(); } },
      { text: 'Opening is done <b>discharged and in argon</b>, and the samples are <b>mapped</b>: in a stacked cell the middle and the edge age differently, and a single sample would tell the wrong story.', on: function () { sel = 3; place(); } },
      { text: 'Each later technique answers one question and disturbs the sample in its own way; <b>washing</b> is already a choice that removes some of the evidence.', on: function () { sel = 4; place(); } }
    ]);
    place();
  });

  /* f11-35: where in a stacked cell the capacity went: residual capacity of harvested positive electrodes by position (Moretti et al. 2019, Table 4) */
  register('f11-35', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cb = fig.querySelectorAll('button[data-cell]'), cell = 'A';
    // residual capacity, % of the pristine 2.53 mAh: [beginning edge, beginning centre, middle edge, middle centre]
    var DATA = { A: { v: [70.7, 62.8, 65.6, 88.9], soh: 72, rate: '0.3C', cyc: 533 }, B: { v: [79, 68.4, 66.4, 68.4], soh: 79.7, rate: '2C', cyc: 660 } };
    // the stack, drawn edge-on, with the sampled sheets marked
    var sx = 96, sy = 50, N = 38;
    for (var k = 0; k < N; k++) { var y = sy + k * 4.6; el('rect', { x: sx, y: y, width: 90, height: 3, fill: k % 2 ? MV('lco') : MV('graphite') }, g); }
    el('rect', { x: sx - 6, y: sy - 6, width: 102, height: N * 4.6 + 8, rx: 4, fill: 'none', stroke: '#9FB3C2' }, g);
    txt(g, sx + 45, sy - 14, '38 negative, 37 positive sheets', '', 'middle', { style: 'font-size:10px' });
    [['B', 2, 'beginning'], ['M', 18, 'middle'], ['E', 35, 'end']].forEach(function (p) { el('line', { x1: sx - 14, x2: sx - 6, y1: sy + p[1] * 4.6 + 1.5, y2: sy + p[1] * 4.6 + 1.5, stroke: 'var(--accent)', 'stroke-width': 2 }, g); txt(g, sx - 18, sy + p[1] * 4.6 + 5, p[2], '', 'end', { style: 'font-size:10px' }); });
    // one sheet, face on: edge and centre samples
    var fx = 230, fy = 60, fw = 150, fh = 170, cells = [], labs = [];
    [[0, 'edge', 'B'], [1, 'centre', 'B'], [2, 'edge', 'M'], [3, 'centre', 'M']].forEach(function (q, i) {});
    el('rect', { x: fx, y: fy, width: fw, height: fh, rx: 4, fill: MV('lco'), stroke: '#1C1F23' }, g);
    txt(g, fx + fw / 2, fy - 10, 'one positive sheet, face on', '', 'middle', { style: 'font-size:10px' });
    // four sample squares: beginning (left half) and middle (right half) sheets would be different sheets; here the sheet shows edge/centre, and two columns stand for the two stack positions
    var POS = [[fx + 12, fy + 12, 'B, edge'], [fx + 42, fy + 62, 'B, centre'], [fx + 96, fy + 12, 'M, edge'], [fx + 96, fy + 100, 'M, centre']];
    POS.forEach(function (p, i) { var r = el('rect', { x: p[0], y: p[1], width: 42, height: 42, rx: 4, fill: '#fff', stroke: '#fff', 'stroke-width': 1.5 }, g); cells.push(r); labs.push(txt(g, p[0] + 21, p[1] + 26, '', 'strong', 'middle', { style: 'font-size:11px' })); txt(g, p[0] + 21, p[1] + 54, p[2], '', 'middle', { style: 'font-size:9px;fill:#E6E8EB' }); });
    txt(g, fx + fw / 2, fy + fh + 16, 'residual capacity, % of pristine', '', 'middle', { style: 'font-size:10px' });
    // scale
    var scx = 410, scy = 70; for (var s = 0; s < 8; s++) { var v = 60 + s * 5; el('rect', { x: scx, y: scy + (7 - s) * 18, width: 16, height: 18, fill: col(v) }, g); if (s % 2 === 0) txt(g, scx + 22, scy + (7 - s) * 18 + 13, v + ' %', '', 'start', { style: 'font-size:10px' }); }
    txt(g, scx, scy - 10, 'colour', '', 'start', { style: 'font-size:10px' });
    function col(v) { var t = Math.max(0, Math.min(1, (v - 60) / 35)); return 'rgb(' + Math.round(230 - 180 * t) + ',' + Math.round(80 + 100 * t) + ',' + Math.round(60 + 100 * t) + ')'; }
    badge(g, 190, 110, 1); badge(g, 216, 222, 2); badge(g, 470, 240, 3);
    function place() {
      Array.prototype.forEach.call(cb, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-cell') === cell)); });
      var d = DATA[cell];
      d.v.forEach(function (v, i) { cells[i].setAttribute('fill', col(v)); setSvgText(labs[i], v.toFixed(1)); });
      var mx = Math.max.apply(null, d.v), mn = Math.min.apply(null, d.v);
      read.innerHTML = 'Cell ' + cell + ', charged at ' + d.rate + ' at 5 °C, ' + d.cyc + ' equivalent cycles, state of health ' + d.soh + ' %: positive electrode discs cut from four places and cycled again in coin cells deliver from <b>' + mn + ' to ' + mx + ' %</b> of the pristine capacity. ' + (cell === 'A' ? 'The centre of the middle sheet kept 89 %; the edge of the first sheet 71 %, its centre 63 %: the same electrode, aged by a factor of three differently, depending on where it sat.' : 'The spread is smaller at the faster charge; the authors suggest the higher current warmed the cell above 5 °C.') + ' After their first discharge all discs cycled alike in a rate test, so the material was intact: the loss was lithium, not active material.';
    }
    Array.prototype.forEach.call(cb, function (bt) { on(bt, 'click', function () { cell = bt.getAttribute('data-cell'); place(); }); });
    steps(fig, [
      { text: 'A 16 Ah pouch cell is a <b>stack</b> of 38 negative and 37 positive sheets; samples were cut from the first, middle and last sheets, at the edge and at the centre.' },
      { text: 'Rebuilt in coin cells, the discs show <b>where the capacity went</b>: the first sheet and the edges lost most, the centre of the stack least. The authors attribute the pattern mainly to pressure, highest in the middle of the stack and the centre of each sheet.' },
      { text: 'The colour scale runs from 60 to 95 %. One sample per cell, taken anywhere, could have reported any of these numbers.' }
    ]);
    place();
  });

  /* f11-36: the peel test: adhesion of the coating to its collector, pristine, formed and aged (Moretti et al. 2019, Table 3) */
  register('f11-36', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sel = -1;
    var ROWS = [['pristine', 5.4, 504], ['fresh, formed', 2.2, 372], ['cell A, beginning', 5, 336], ['cell A, middle', 3.3, 358], ['cell A, end', 3.2, 534], ['cell B, beginning', 4.7, 579], ['cell B, middle', 8, 560], ['cell B, end', 3.5, 342]];
    // the peel test sketch
    el('rect', { x: 20, y: 60, width: 120, height: 10, fill: M('copper') }, g);
    el('path', { d: 'M20,60 H90 Q98,60 98,52 V20', fill: 'none', stroke: MV('graphite'), 'stroke-width': 8 }, g);
    arrow(g, 98, 30, 98, 8, 'var(--accent)', 1.6); txt(g, 110, 16, '90°, 20 mm/min', '', 'start', { style: 'font-size:10px' });
    txt(g, 20, 90, 'strip 20 × 90 mm', '', 'start', { style: 'font-size:10px' }); txt(g, 20, 103, 'force per width, N/m', '', 'start', { style: 'font-size:10px' });
    // the two bar charts, log scale
    var b = { x0: 190, y0: 250, x1: 500, y1: 110 }, L = function (v) { return Math.log10(v); };
    var fr = cvFrame(g, b, [-0.5, 7.5], [0, 3], { yt: [[0, '1'], [1, '10'], [2, '100'], [3, '1000']], yl: 'adhesion, N/m (log)' });
    var bars = [];
    ROWS.forEach(function (r, k) {
      var x = fr.X(k), w = 11;
      var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(r[0]), style: 'cursor:pointer' }, g);
      var a = el('rect', { x: x - w - 1, y: fr.Y(L(r[1])), width: w, height: fr.Y(0) - fr.Y(L(r[1])), fill: MV('graphite') }, grp);
      var c = el('rect', { x: x + 1, y: fr.Y(L(r[2])), width: w, height: fr.Y(0) - fr.Y(L(r[2])), fill: 'var(--accent)' }, grp);
      el('rect', { x: x - w - 3, y: b.y1, width: 2 * w + 6, height: b.y0 - b.y1, fill: 'transparent' }, grp);
      txt(g, x, b.y0 + 14, ['prist.', 'fresh', 'A·B', 'A·M', 'A·E', 'B·B', 'B·M', 'B·E'][k], '', 'middle', { style: 'font-size:10px' });
      bars.push([a, c]); pressable(grp, function () { sel = k; place(); });
    });
    el('rect', { x: 200, y: 36, width: 10, height: 10, fill: MV('graphite') }, g); txt(g, 214, 45, 'negative (graphite on copper)', '', 'start', { style: 'font-size:10px' });
    el('rect', { x: 200, y: 54, width: 10, height: 10, fill: 'var(--accent)' }, g); txt(g, 214, 63, 'positive (LiFePO₄ on aluminium)', '', 'start', { style: 'font-size:10px' });
    badge(g, fr.X(1), fr.Y(1.6), 1); badge(g, fr.X(4.5), fr.Y(2.95), 2); badge(g, 60, 40, 3);
    function place() {
      bars.forEach(function (p, k) { p[0].setAttribute('stroke', k === sel ? 'var(--text)' : 'none'); p[1].setAttribute('stroke', k === sel ? 'var(--text)' : 'none'); });
      if (sel < 0) { read.innerHTML = 'Tap a pair of bars. Note the logarithmic scale: the positive coating holds a hundred times harder than the negative.'; return; }
      var r = ROWS[sel];
      read.innerHTML = '<b>' + r[0] + '</b>: negative electrode ' + r[1] + ' N/m, positive electrode ' + (sel === 6 ? 'above 550' : r[2]) + ' N/m. ' + (sel === 0 ? 'Before formation the graphite coating still holds with 5.4 N/m.' : sel === 1 ? 'After formation alone, the graphite adhesion has more than halved: the SEI and the first swelling loosen the coating before any ageing.' : 'The positive coating stays above 330 N/m in every aged sample; the negative is so loose that half cells could not be built from some of the aged discs.');
    }
    steps(fig, [
      { text: 'A <b>peel test</b> pulls a strip of coating off its collector at 90° and reports the force per width. It is the first thing to measure, because it decides which samples can be handled at all.' },
      { text: 'The positive coating holds at several hundred N/m, aged or not; the graphite coating at a few, and its adhesion drops by more than half in formation. Delamination is a negative-electrode problem here.' },
      { text: 'A coating that peels on its own is not only a mechanical finding: it is active material that no longer counts, and a sample that cannot be rebuilt into a coin cell.' }
    ]);
    place();
  });

  /* f11-37: the harvested electrode back in a coin cell: what a half cell can and cannot see (Wheeler et al. 2024; Moretti et al. 2019) */
  register('f11-37', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), mb = fig.querySelectorAll('button[data-view]'), view = 'map';
    var gp = el('g', {}, g);
    badge(g, 30, 60, 1); badge(g, 490, 60, 2); badge(g, 260, 262, 3);
    function draw() {
      clear(gp);
      if (view === 'map') {
        // the aged graphite sheet of an 18650 cell, unrolled: deposits on 11 % of its area, mostly at the ends of the roll
        var x0 = 40, y0 = 60, w = 440, h = 150;
        el('rect', { x: x0, y: y0, width: w, height: h, rx: 3, fill: MV('graphite') }, gp);
        var seed = 3; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
        for (var k = 0; k < 60; k++) { var end = rnd() < 0.8, cx = end ? (rnd() < 0.5 ? x0 + rnd() * 70 : x0 + w - rnd() * 70) : x0 + rnd() * w, cy = y0 + 8 + rnd() * (h - 16); el('ellipse', { cx: cx, cy: cy, rx: 4 + rnd() * 10, ry: 3 + rnd() * 6, fill: rnd() < 0.5 ? '#C9A14A' : '#D8DCE2', opacity: .85 }, gp); }
        for (k = 0; k < 6; k++) { var lx = x0 + 20 + rnd() * (w - 40); el('path', { d: 'M' + lx + ',' + (y0 + 10) + ' l' + (rnd() * 6 - 3) + ',' + (h - 20), fill: 'none', stroke: '#0E0F11', 'stroke-width': .8 }, gp); }
        txt(gp, x0 + w / 2, y0 - 10, 'aged graphite sheet, unrolled: deposits (gold, grey) and cracks', '', 'middle', { style: 'font-size:10px' });
        txt(gp, x0, y0 + h + 16, 'end of the roll', '', 'start', { style: 'font-size:10px' }); txt(gp, x0 + w, y0 + h + 16, 'end of the roll', '', 'end', { style: 'font-size:10px' });
        txt(gp, x0 + w / 2, y0 + h + 34, 'deposits on 11 % of the area (8.4 % one side, 13.2 % the other); the LiFePO₄ sheet showed none', '', 'middle', { style: 'font-size:10px' });
      } else {
        // the bars: what the coin cell measured against what the whole cell lost
        var b = { x0: 120, y0: 230, x1: 440, y1: 60 }, fr = cvFrame(gp, b, [-0.5, 1.5], [0, 35], { yt: [[0, '0'], [10, '10'], [20, '20'], [30, '30']], yl: 'negative-electrode capacity lost, %' });
        [[0, 9, 'harvested disc\nin a coin cell', 'var(--accent)'], [1, 30, 'whole cell,\nestimated from outside', 'var(--heat)']].forEach(function (q) {
          el('rect', { x: fr.X(q[0]) - 40, y: fr.Y(q[1]), width: 80, height: fr.Y(0) - fr.Y(q[1]), fill: q[3], 'fill-opacity': .8 }, gp);
          txt(gp, fr.X(q[0]), fr.Y(q[1]) - 6, 'about ' + q[1] + ' %', 'strong', 'middle', { style: 'font-size:12px' });
          q[2].split('\n').forEach(function (l, i) { txt(gp, fr.X(q[0]), b.y0 + 16 + i * 13, l, '', 'middle', { style: 'font-size:10px' }); });
        });
        txt(gp, 280, 270, 'the difference is the material under the deposits, which peeled off and could not be tested', 'heat', 'middle', { style: 'font-size:10px' });
      }
    }
    function place() { Array.prototype.forEach.call(mb, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-view') === view)); }); draw(); read.innerHTML = view === 'map' ? 'An 18650 LiFePO₄ | graphite cell cycled at 50 °C to 30 to 40 % state of health, opened in argon and <b>not washed</b>, so as not to disturb the bulky deposits. The positive sheet showed no deposits, cracks or exfoliation; the negative showed all three, concentrated at the ends of the roll, where the deposits were mainly oxygen in the electron probe and the light grey areas about 60 % fluorine, read as LiF.' : 'Discs of the aged graphite rebuilt into coin cells against lithium lost on average <b>9 %</b> of their capacity; the whole cell&#8217;s negative electrode, estimated from outside in a companion study, had lost about <b>30 %</b>. The discs that could be tested were the good ones: the material under the bulky deposits peeled off the copper and never reached a coin cell.'; }
    Array.prototype.forEach.call(mb, function (bt) { on(bt, 'click', function () { view = bt.getAttribute('data-view'); place(); }); });
    steps(fig, [
      { text: 'Inspection first, with the naked eye and a camera: colour, deposits, cracks, exfoliation, and <b>where</b> they are. In a wound cell the ends of the roll age first.', on: function () { view = 'map'; place(); } },
      { text: 'The harvested electrode <b>back in a coin cell</b> against lithium measures what the material can still do; the positive disc here delivered its full capacity, the negative lost 9 %.', on: function () { view = 'bars'; place(); } },
      { text: 'But a coin cell can only test what survives punching and handling. The disc result and the whole-cell estimate disagree by a factor of three, and the difference is the part that fell off. A post-mortem number always carries its sampling.', on: function () { view = 'bars'; place(); } }
    ]);
    place();
  });

  /* f11-38: where the lithium went: the FePO4 fraction left in discharged positive electrodes, by position (Moretti et al. 2019, Table 5) */
  register('f11-38', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sel = -1;
    // LiFePO4 / FePO4 % after discharge: [label, FePO4 %]
    var ROWS = [['fresh', 9], ['A, beginning, centre', 30], ['A, beginning, edge', 20], ['A, middle, centre', 25], ['A, middle, edge', 15], ['A, end, centre', 26], ['A, end, edge', 18], ['B, beginning, centre', 25], ['B, middle, centre', 26], ['B, end, centre', 3]];
    // a diffraction sketch: two peaks whose heights follow the fractions
    var b = { x0: 40, y0: 150, x1: 190, y1: 40 }, fr = cvFrame(g, b, [16, 24], [0, 1.1], { xt: [[17, '17'], [20, '20'], [23, '23']], xl: '2θ, schematic', yl: 'intensity' });
    var pk = el('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2 }, g);
    txt(g, fr.X(17.0), b.y1 + 12, 'LiFePO₄', 'amber', 'end', { style: 'font-size:10px' }); txt(g, fr.X(18.7), b.y1 + 12, 'FePO₄', 'heat', 'start', { style: 'font-size:10px' });
    // the bars
    var bb = { x0: 300, y0: 236, x1: 500, y1: 40 }, fb = cvFrame(g, bb, [0, 35], [-0.5, 9.5], { xt: [[0, '0'], [10, '10'], [20, '20'], [30, '30']], xl: 'FePO₄ left after discharge, %' });
    var bars = [];
    ROWS.forEach(function (r, k) {
      var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': plain(r[0]), style: 'cursor:pointer' }, g);
      var y = fb.Y(9 - k);
      var rect = el('rect', { x: bb.x0, y: y - 8, width: fb.X(r[1]) - bb.x0, height: 16, fill: k === 0 ? 'var(--muted)' : r[0][0] === 'A' ? 'var(--accent)' : 'var(--second)', 'fill-opacity': .8 }, grp);
      el('rect', { x: bb.x0 - 100, y: y - 9, width: bb.x1 - bb.x0 + 100, height: 18, fill: 'transparent' }, grp);
      txt(grp, bb.x0 - 4, y + 4, r[0].replace('beginning', 'begin.'), '', 'end', { style: 'font-size:9.5px' });
      txt(grp, fb.X(r[1]) + 4, y + 4, r[1] + ' %', '', 'start', { style: 'font-size:10px' });
      bars.push(rect); pressable(grp, function () { sel = k; place(); });
    });
    badge(g, fr.X(22.5), fr.Y(0.85), 1); badge(g, bb.x1 - 10, fb.Y(5), 2); badge(g, bb.x1 - 10, fb.Y(0), 3);
    function peak(x0, hgt, wdt) { var d = ''; for (var k = 0; k <= 200; k++) { var x = 16 + k * 0.04, y = hgt * Math.exp(-((x - x0) * (x - x0)) / (2 * wdt * wdt)); d += (k ? 'L' : 'M') + fr.X(x).toFixed(1) + ',' + fr.Y(y).toFixed(1); } return d; }
    function place() {
      bars.forEach(function (r, k) { r.setAttribute('stroke', k === sel ? 'var(--text)' : 'none'); });
      var f = sel < 0 ? 9 : ROWS[sel][1];
      var d = '', pts = [];
      for (var k = 0; k <= 200; k++) { var x = 16 + k * 0.04, y = (1 - f / 100) * Math.exp(-((x - 17.2) * (x - 17.2)) / (2 * 0.12 * 0.12)) + (f / 100) * Math.exp(-((x - 18.4) * (x - 18.4)) / (2 * 0.12 * 0.12)) + 0.02; d += (k ? 'L' : 'M') + fr.X(x).toFixed(1) + ',' + fr.Y(y).toFixed(1); }
      pk.setAttribute('d', d);
      read.innerHTML = (sel < 0 ? 'Tap a bar. ' : '<b>' + ROWS[sel][0] + '</b>: ' + ROWS[sel][1] + ' % of the iron phosphate is still FePO₄ after a full discharge. ') + 'A discharged LiFePO₄ electrode should be all LiFePO₄; the FePO₄ that remains is lattice that no lithium came back to fill, because that lithium was lost on the negative side. The fresh cell leaves 9 %; cell A up to 30 % at the centre of the first sheet, and less at the edges; cell B&#8217;s last sheet only 3 %. The two phases are counted by Rietveld refinement of a pattern taken on the electrode itself.';
    }
    steps(fig, [
      { text: 'X-ray diffraction on the electrode itself counts the two phases of a two-phase material: after discharge, every FePO<sub>4</sub> peak left standing is <b>lithium that did not return</b>.' },
      { text: 'Cell A: the centre of each sheet holds more FePO<sub>4</sub> than its edge, and the first sheet the most. The lithium inventory was lost unevenly, following the same pattern as the residual capacity of {{fig:f11-35}}.' },
      { text: 'Cell B&#8217;s last sheet is almost fully lithiated again; its loss sat elsewhere. One diffraction pattern per cell would have reported whichever sheet was chosen.' }
    ]);
    place();
  });

  /* f11-39: finding plated lithium: three techniques, what each sees (Abbas et al. 2025) */
  register('f11-39', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), tb = fig.querySelectorAll('button[data-tech]'), tech = 'nmr', gp = el('g', {}, g);
    badge(g, 30, 40, 1); badge(g, 490, 40, 2); badge(g, 30, 266, 3);
    function draw() {
      clear(gp);
      if (tech === 'nmr') {
        var b = { x0: 60, y0: 230, x1: 480, y1: 50 }, fr = cvFrame(gp, b, [320, -40], [0, 1.15], { xt: [[300, '300'], [250, '250'], [200, '200'], [100, '100'], [0, '0']], xl: '⁷Li shift, ppm (metallic lithium at 245 to 270 ppm, ions near 0)', yl: 'signal' });
        [['fresh', 0, 'var(--muted)', 0], ['real-aged, 93 %', 0, 'var(--second)', 0.03], ['artificially aged, 85 %', 0.45, 'var(--heat)', 0.06]].forEach(function (s, i) {
          var d = ''; for (var k = 0; k <= 360; k++) { var x = 320 - k; var y = Math.exp(-(x * x) / (2 * 8 * 8)) * (0.9 - i * 0.2) + s[1] * Math.exp(-((x - 258) * (x - 258)) / (2 * 10 * 10)) + s[3]; d += (k ? 'L' : 'M') + fr.X(x).toFixed(1) + ',' + fr.Y(y).toFixed(1); }
          el('path', { d: d, fill: 'none', stroke: s[2], 'stroke-width': 1.8 }, gp); txt(gp, fr.X(90), fr.Y(0.95 - i * 0.2) - 2, s[0], '', 'start', { style: 'font-size:10px;fill:' + s[2] });
        });
        txt(gp, fr.X(258), fr.Y(0.55), 'Knight shift: metal', 'heat', 'middle', { style: 'font-size:10px' });
      } else if (tech === 'icp') {
        var b2 = { x0: 80, y0: 230, x1: 480, y1: 50 }, fb = cvFrame(gp, b2, [-0.5, 3.5], [0, 1.2], { yl: 'water-soluble Li⁺ per mass of coating (relative)' });
        [['fresh', 0.4, 'var(--muted)'], ['real-aged', 0.7, 'var(--second)'], ['aged, opened', 0.72, 'var(--heat)'], ['aged, 11 weeks', 1.0, 'var(--heat)']].forEach(function (s, k) {
          el('rect', { x: fb.X(k) - 30, y: fb.Y(s[1]), width: 60, height: fb.Y(0) - fb.Y(s[1]), fill: s[2], 'fill-opacity': .8 }, gp);
          txt(gp, fb.X(k), b2.y0 + 14, s[0], '', 'middle', { style: 'font-size:9.5px' });
        });
        txt(gp, 280, 262, 'schematic order of the measured values, not their magnitudes; errors 1 to 3 %', '', 'middle', { style: 'font-size:10px' });
      } else {
        el('rect', { x: 60, y: 50, width: 400, height: 180, fill: MV('graphite') }, gp);
        var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
        for (var k = 0; k < 40; k++) el('circle', { cx: 70 + rnd() * 380, cy: 60 + rnd() * 160, r: 6 + rnd() * 10, fill: '#5A5F66', stroke: '#2C2F33' }, gp);
        for (k = 0; k < 120; k++) { var cx = 300 + rnd() * 140, cy = 70 + rnd() * 140; el('circle', { cx: cx, cy: cy, r: 1.5 + rnd() * 2.5, fill: '#C9CDD2', opacity: .9 }, gp); }
        el('ellipse', { cx: 370, cy: 140, rx: 80, ry: 70, fill: 'none', stroke: 'var(--heat)', 'stroke-dasharray': '4 3' }, gp);
        txt(gp, 260, 246, 'mossy layer: oxygen and fluorine hot spots in the electron probe,', 'heat', 'middle', { style: 'font-size:10px' }); txt(gp, 260, 259, 'the carbon signal weaker beneath', 'heat', 'middle', { style: 'font-size:10px' });
        txt(gp, 160, 42, 'bare graphite', '', 'middle', { style: 'font-size:10px' });
      }
    }
    function place() {
      Array.prototype.forEach.call(tb, function (bt) { bt.setAttribute('aria-pressed', String(bt.getAttribute('data-tech') === tech)); }); draw();
      read.innerHTML = tech === 'nmr' ? '<b>⁷Li magic-angle-spinning NMR</b> on active material scraped from the copper and sealed in a rotor inside the glovebox. Metallic lithium has a Knight shift of 245 to 270 ppm, far from the ions near 0 ppm: a direct signature, found in both artificially aged cells and in neither the fresh nor the car-aged cell, and still there after 11 weeks of storage. Direct, but only qualitative.' : tech === 'icp' ? '<b>ICP-OES</b> of the lithium that dissolves when a weighed piece of electrode is stirred in water: plated metal reacts with water and is counted, with the soluble salts. Quantitative, with errors of 1 to 3 %, but indirect: lithium that has already turned into LiF is insoluble and is missed. The aged cells held more soluble lithium than the fresh one.' : '<b>Scanning electron microscopy</b> with elemental mapping sees a mossy layer on the aged graphite, absent from fresh and car-aged samples, with oxygen and fluorine hot spots where the metal has reacted with air during preparation. Lithium itself cannot be mapped; the finding is indirect and local, a square centimetre at most.';
    }
    Array.prototype.forEach.call(tb, function (bt) { on(bt, 'click', function () { tech = bt.getAttribute('data-tech'); place(); }); });
    steps(fig, [
      { text: 'Plated lithium is the finding that matters most for safety, and three techniques look for it in three ways: by its <b>nuclear signature</b>, by what <b>dissolves</b>, and by what the microscope <b>sees</b>.', on: function () { tech = 'nmr'; place(); } },
      { text: 'Each has a reach: NMR and ICP average over a large piece, the microscope over a very small one; NMR is direct but not quantitative, ICP quantitative but indirect, the microscope neither.', on: function () { tech = 'icp'; place(); } },
      { text: 'Agreement between them, on samples whose position in the cell is known, is the evidence. One of them alone is a hint.', on: function () { tech = 'sem'; place(); } }
    ]);
    place();
  });
