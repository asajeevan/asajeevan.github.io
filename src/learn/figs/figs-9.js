  /* =================================================================
     Module 9: lithium metal, sodium and organic electrodes. Plating and
     dendrites after Winter and Brodd 2004 (R1) 2.5, Tarascon and Armand
     2001 (R2) Fig. 2a and Goodenough and Park 2013 (R6); volume changes
     after R6 and R2; conversion after R2; sodium after R6; the family
     map after R6 and R2.
     ================================================================= */

  /* ===== 9.1 Plating and stripping: lithium metal against graphite ===== */
  register('f9-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), sepB = fig.querySelector('.solid-sep');
    var panels = [{ x: 20, name: 'lithium metal', sub: 'lithium plates back as metal' }, { x: 270, name: 'graphite', sub: 'lithium inserts between sheets' }];
    var W = 230, top = 50, bot = 230, ex = 70; // electrode occupies x .. x + ex
    var rough = [], NP = 40;
    panels.forEach(function (p, i) {
      txt(g, p.x + W / 2, top - 22, p.name, 'strong', 'middle'); txt(g, p.x + W / 2, top - 8, p.sub, '', 'middle');
      el('rect', { x: p.x, y: top, width: W, height: bot - top, rx: 4, fill: 'var(--cyan)', 'fill-opacity': '.08', stroke: 'var(--line-2)' }, g);
      p.sep = el('rect', { x: p.x + 150, y: top, width: 10, height: bot - top, fill: 'var(--cyan)', 'fill-opacity': '.3' }, g);
      txt(g, p.x + 155, bot + 16, 'separator', 'cyan', 'middle');
      if (i === 0) { el('rect', { x: p.x, y: top, width: ex - 20, height: bot - top, fill: 'var(--metal)' }, g); p.dep = el('path', { fill: 'var(--metal)', 'fill-opacity': '.9' }, g); }
      else { el('rect', { x: p.x, y: top, width: ex, height: bot - top, fill: 'var(--panel-2)' }, g); for (var k = 0; k < 8; k++) el('line', { x1: p.x + 4, x2: p.x + ex - 4, y1: top + 10 + k * 22, y2: top + 10 + k * 22, stroke: 'var(--text)', 'stroke-opacity': '.5', 'stroke-width': 2 }, g); p.fill = el('rect', { x: p.x, y: top, width: 0, height: bot - top, fill: 'var(--amber)', 'fill-opacity': '.25' }, g); }
    });
    for (var j = 0; j <= NP; j++) rough.push(0);
    var seed = 3; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var cyc = 0, ph = 0, solid = false;
    var cT = txt(g, 135, bot + 34, '', 'amber', 'middle'), gT = txt(g, 385, bot + 34, '', 'amber', 'middle'), stopT = txt(g, 135, top + 16, '', 'heat', 'middle');
    badge(g, 40, bot + 26, 1); badge(g, 290, bot + 26, 2); badge(g, 245, top - 14, 3);
    function depPath(level) { // level 0..1 of the plating half-cycle
      var p = panels[0], x0 = p.x + ex - 20, d = 'M' + x0 + ',' + top;
      for (var j = 0; j <= NP; j++) { var y = top + (bot - top) * j / NP, w = level * (6 + rough[j]); d += ' L' + (x0 + Math.min(w, solid ? 150 - (ex - 20) - 2 : 999)).toFixed(1) + ',' + y.toFixed(1); }
      return d + ' L' + x0 + ',' + bot + ' Z';
    }
    function render() {
      var level = ph < 0.5 ? ph * 2 : 2 - ph * 2; // up while charging, down while discharging
      panels[0].dep.setAttribute('d', depPath(Math.max(0.15, level)));
      panels[1].fill.setAttribute('width', ex * level);
      panels.forEach(function (p) { p.sep.setAttribute('fill-opacity', solid ? '.75' : '.3'); p.sep.setAttribute('fill', solid ? 'var(--text)' : 'var(--cyan)'); p.sep.setAttribute('fill-opacity', solid ? '.35' : '.3'); });
      var maxR = 0; rough.forEach(function (r) { maxR = Math.max(maxR, r); });
      var touch = !solid && (6 + maxR) > 150 - (ex - 20) - 2;
      setSvgText(cT, 'cycles: ' + cyc + (touch ? ', the deposit reaches the separator' : ''));
      setSvgText(gT, 'cycles: ' + cyc + ', surface unchanged');
      setSvgText(stopT, touch ? 'short-circuit risk' : '');
      setSvgText(sepB, solid ? 'Porous separator' : 'Solid separator');
      read.innerHTML = 'Left: each time lithium is plated back it lands unevenly; the deposit roughens cycle after cycle into a mossy, dendritic layer that grows toward the separator. ' + (solid ? 'A <b>solid separator</b> that blocks the growth stops it there.' : 'In 2004 Winter and Brodd put the cycle life of lithium-metal cells at about 100 to 150 cycles, against the 300 a commercial cell needs.') + ' Right: graphite takes the lithium in between its sheets and its surface stays the same.';
    }
    function tick(dt) {
      if (dt === 0) return;
      var was = ph; ph = (ph + dt / 3) % 1;
      if (ph < was) { cyc++; for (var j = 0; j <= NP; j++) { var nb = j > 0 ? rough[j - 1] : 0; rough[j] += rnd() < 0.18 ? 6 + rnd() * 10 : rnd() * 1.5; rough[j] = Math.min(140, rough[j] * (1 + 0.04 * (nb > rough[j] ? 1 : 0))); } }
      render();
    }
    on(sepB, 'click', function () { solid = !solid; render(); });
    steps(fig, [
      { text: 'Left, a <b>lithium-metal</b> negative electrode. On charge, lithium is not inserted anywhere: it is plated back onto the metal, and it lands unevenly. Cycle after cycle the surface turns rough, mossy and dendritic.' },
      { text: 'Right, <b>graphite</b>: the same lithium slips in between the carbon sheets and the surface does not change. In normal use the rocking-chair cell of module 6 sidesteps plating.' },
      { text: 'The deposit grows toward the separator; if it gets through, the electrodes touch. Press <b>Solid separator</b>: a separator that blocks the growth is one of the routes back to lithium metal.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    if (!motion) { for (var c = 0; c < 9; c++) { tick(1.5); tick(1.5); } ph = 0.5; }
    render(); bind(fig, loop);
  });

  /* ===== 9.2 Breathing electrodes ===== */
  register('f9-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), bb = fig.querySelector('.buffer');
    var mats = [{ x: 90, name: 'graphite', vol: null, note: 'small change' }, { x: 260, name: 'an alloy', vol: 2.0, note: 'up to +200 % volume' }, { x: 430, name: 'silicon', vol: 3.0, note: 'about +300 % volume' }];
    var r0 = 28, cy = 120, buffer = false, ph = 0, cyc = 0;
    mats.forEach(function (m, i) {
      txt(g, m.x, 30, m.name, 'strong', 'middle'); txt(g, m.x, 222, m.note, 'amber', 'middle');
      m.ghost = el('circle', { cx: m.x, cy: cy, r: r0, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' }, g);
      m.box = el('circle', { cx: m.x, cy: cy, r: r0 * 1.62, fill: 'var(--cyan)', 'fill-opacity': '0', stroke: 'var(--cyan)', 'stroke-width': 3, 'stroke-opacity': '0' }, g);
      m.p = el('circle', { cx: m.x, cy: cy, r: r0, fill: 'var(--amber-2)', 'fill-opacity': '.85' }, g);
      m.cr = el('path', { fill: 'none', stroke: 'var(--bg)', 'stroke-width': 2.4 }, g);
      m.carbon = el('circle', { cx: m.x - r0 - 10, cy: cy + 40, r: 9, fill: 'var(--cyan)' }, g);
      m.link = el('line', { stroke: 'var(--cyan)', 'stroke-width': 3 }, g);
      badge(g, m.x + 54, 40, i + 1);
    });
    txt(g, 260, 244, 'dashed circle: the particle before lithiation; teal: its carbon contact', '', 'middle');
    function render() {
      var s = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI); // 0 delithiated .. 1 lithiated
      mats.forEach(function (m) {
        var scale = m.vol ? Math.pow(1 + m.vol * s, 1 / 3) : 1 + 0.03 * s, r = r0 * scale; m.p.setAttribute('r', r);
        var cracked = m.vol === 3.0 && !buffer && cyc >= 1, lost = cracked && cyc >= 2;
        m.cr.setAttribute('d', cracked ? 'M' + (m.x - r * 0.7) + ',' + (cy - r * 0.3) + ' L' + (m.x - 4) + ',' + (cy + 2) + ' L' + (m.x + r * 0.6) + ',' + (cy - r * 0.5) + ' M' + (m.x - 3) + ',' + (cy + 2) + ' L' + (m.x + 2) + ',' + (cy + r * 0.85) : '');
        m.p.setAttribute('fill-opacity', lost ? '.35' : '.85');
        m.box.setAttribute('stroke-opacity', buffer && m.vol ? '.8' : '0'); m.box.setAttribute('fill-opacity', buffer && m.vol ? '.1' : '0');
        var cx = m.x - r0 - 10, cyy = cy + 40, ang = Math.atan2(cyy - cy, cx - m.x), ex = m.x + Math.cos(ang) * r, ey = cy + Math.sin(ang) * r;
        m.link.setAttribute('x1', cx); m.link.setAttribute('y1', cyy); m.link.setAttribute('x2', lost ? cx + 4 : ex); m.link.setAttribute('y2', lost ? cyy - 3 : ey);
        m.link.setAttribute('stroke-dasharray', lost ? '2 3' : '');
      });
      setSvgText(bb, buffer ? 'Remove the buffer' : 'Add a buffer matrix');
      read.innerHTML = 'Lithiated ' + Math.round(s * 100) + ' %, cycle ' + cyc + '. Graphite barely changes size; an alloy can swell by up to 200 % in volume and silicon by about 300 %. ' + (buffer ? 'With a <b>buffer matrix</b> around the particles the electrical pathway survives the swelling.' : (cyc >= 2 ? 'The silicon particle has <b>cracked and lost contact</b> with its carbon: it now stores nothing.' : 'Swelling and shrinking like this on every cycle cracks the particle.'));
    }
    function tick(dt) { if (dt === 0) return; var was = ph; ph = (ph + dt / 4) % 1; if (ph < was) cyc++; render(); }
    on(bb, 'click', function () { buffer = !buffer; cyc = 0; render(); });
    steps(fig, [
      { text: '<b>Graphite</b> takes up lithium with a small change of size, drawn here without a number because the sources give none.' },
      { text: 'An <b>alloy</b> of lithium with a metal such as tin or antimony stores more, but can swell by up to 200 % of its volume.' },
      { text: '<b>Silicon</b> swells by about 300 %. Repeated on every cycle, that cracks the particle and breaks its contact with the carbon: capacity lost. Press <b>Add a buffer matrix</b>: a matrix that takes up the strain keeps the electrical path.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    if (!motion) { cyc = 2; ph = 0.5; }
    render(); bind(fig, loop);
  });

  /* ===== 9.3 Conversion: the particle that comes apart and reforms ===== */
  register('f9-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var cx = 150, cy = 120, R = 70, ph = 0.25;
    var big = el('circle', { cx: cx, cy: cy, r: R, fill: 'var(--copper)', 'fill-opacity': '.8' }, g);
    var mat = el('circle', { cx: cx, cy: cy, r: R, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    var nps = []; for (var i = 0; i < 26; i++) { var a = i * 2.4, rr = R * Math.sqrt((i + 0.5) / 26) * 0.9; nps.push(el('circle', { cx: cx + Math.cos(a) * rr, cy: cy + Math.sin(a) * rr, r: 5, fill: 'var(--metal)' }, g)); }
    var lbl = txt(g, cx, cy + R + 22, '', 'strong', 'middle');
    txt(g, 312, 40, 'capacity against graphite', 'strong', 'start');
    el('rect', { x: 330, y: 60, width: 60, height: 18, fill: 'var(--text)', 'fill-opacity': '.5' }, g); txt(g, 396, 74, 'graphite: 1×', '', 'start');
    el('rect', { x: 330, y: 90, width: 120, height: 18, fill: 'var(--copper)', 'fill-opacity': '.8' }, g); el('rect', { x: 450, y: 90, width: 60, height: 18, fill: 'var(--copper)', 'fill-opacity': '.35' }, g);
    txt(g, 312, 126, 'oxides: two to three times', '', 'start');
    var eq = txt(g, 312, 170, '', 'amber', 'start'), eq2 = txt(g, 312, 188, '', '', 'start');
    badge(g, cx - R - 4, cy - R + 6, 1); badge(g, 316, 99, 2);
    function render() {
      var s = 0.5 - 0.5 * Math.cos(ph * 2 * Math.PI); // 0 oxide .. 1 fully converted
      big.setAttribute('fill-opacity', String(0.8 * (1 - s))); mat.setAttribute('fill-opacity', String(s));
      nps.forEach(function (n) { n.setAttribute('fill-opacity', String(s)); });
      setSvgText(lbl, s > 0.5 ? 'metal nanoparticles in Li₂O' : 'metal oxide particle');
      setSvgText(eq, s > 0.5 ? 'lithium in: oxide + Li → M + Li₂O' : 'lithium out: M + Li₂O → oxide + Li');
      setSvgText(eq2, 'the oxide reforms as lithium leaves');
      read.innerHTML = s > 0.5 ? 'Lithiated: the oxide has been <b>converted</b> into metal nanoparticles embedded in Li₂O. No host survives; the particle is rebuilt.' : 'Delithiated: the metal and the Li₂O react back and the oxide forms again.';
    }
    steps(fig, [
      { text: 'A <b>conversion</b> electrode is not a host. As lithium goes in, the metal oxide reacts with it and falls apart into tiny metal particles embedded in Li₂O; as lithium comes out, the oxide forms again.' },
      { text: 'Working this way, such oxides store <b>two to three times</b> the capacity of carbon.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; ph = (ph + dt / 8) % 1; render(); }, { autoplay: true, stepDt: 0.5 });
    if (!motion) ph = 0.5;
    render(); bind(fig, loop);
  });

  /* ===== 9.4 The family of electrode materials ===== */
  register('f9-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var Y = function (v) { return 266 - v / 5 * 236; };
    el('line', { x1: 60, x2: 60, y1: Y(0), y2: Y(5), stroke: 'var(--line-2)' }, g);
    [0, 1, 2, 3, 4, 5].forEach(function (v) { el('line', { x1: 56, x2: 60, y1: Y(v), y2: Y(v), stroke: 'var(--line-2)' }, g); txt(g, 52, Y(v) + 4, v + ' V', '', 'end'); });
    txt(g, 60, Y(5) - 12, 'V vs Li/Li⁺', '', 'middle');
    var fam = [
      { k: 'metal', x: 110, name: 'metal', col: 'var(--metal)', items: [{ v: 0, n: 'lithium' }], txt: 'Lithium metal itself, at 0 V by definition: the highest energy of all negative electrodes, held back by plating and dendrites (figure 9.1).' },
      { k: 'ins', x: 190, name: 'insertion', col: 'var(--amber)', items: [{ v: 0.2, n: 'graphite' }, { v: 1.5, n: 'Li titanate' }, { v: 2.2, n: 'TiS₂' }, { v: 3.5, n: 'LiFePO₄' }, { v: 4.0, n: 'LiCoO₂' }, { v: 4.75, n: 'LiNi₀.₅Mn₁.₅O₄' }], txt: 'Insertion hosts on both sides of today’s cells: graphite near 0.2 V, lithium titanate at 1.5 V, TiS₂ at about 2.2 V, LiFePO₄ at 3.5 V, LiCoO₂ near 4 V and LiNi₀.₅Mn₁.₅O₄ near 4.75 V.' },
      { k: 'alloy', x: 280, name: 'alloy', col: '#C4B5F7', items: [{ v: 0.2, v2: 0.8, n: 'Si, Sn, Sb' }], txt: 'Alloys of lithium with silicon, tin or antimony, at 0.2 to 0.8 V: more capacity than graphite, paid for in swelling (figure 9.2).' },
      { k: 'conv', x: 360, name: 'conversion', col: 'var(--copper)', items: [{ v: 2.4, n: 'sulfur' }], foot: '+ metal oxides', txt: 'Conversion electrodes are rebuilt on every cycle: sulfur at 2.4 V, and the metal oxides of figure 9.3, two to three times the capacity of carbon. The sources cited here give no voltage for the oxides, so they are listed under the axis rather than placed on it.' },
      { k: 'org', x: 450, name: 'organic', col: 'var(--cyan)', items: [{ v: null, v2: 3.0, n: 'disulfides' }], txt: 'Organic disulfides, whose S–S bonds break into thiolates and reform reversibly, up to 3 V; held back by their solubility in the electrolyte and by self-discharge.' }
    ];
    fam.forEach(function (f, i) {
      txt(g, f.x, 22, f.name, 'strong', 'middle');
      f.items.forEach(function (it, j) {
        if (it.v === null && it.v2 === undefined) { el('rect', { x: f.x - 34, y: Y(3.2), width: 68, height: Y(0.9) - Y(3.2), rx: 6, fill: f.col, 'fill-opacity': '.12', stroke: f.col, 'stroke-dasharray': '4 4' }, g); txt(g, f.x, Y(2.05), it.n, '', 'middle'); txt(g, f.x, Y(2.05) + 15, 'no voltage given', '', 'middle'); return; }
        if (it.v === null) { el('line', { x1: f.x - 20, x2: f.x + 20, y1: Y(it.v2), y2: Y(it.v2), stroke: f.col, 'stroke-width': 3, 'stroke-dasharray': '4 3' }, g); txt(g, f.x, Y(it.v2) - 8, it.n, '', 'middle'); txt(g, f.x, Y(it.v2) + 16, 'up to 3 V', '', 'middle'); return; }
        if (it.v2 !== undefined) { el('rect', { x: f.x - 14, y: Y(it.v2), width: 28, height: Y(it.v) - Y(it.v2), rx: 4, fill: f.col, 'fill-opacity': '.6' }, g); txt(g, f.x + 20, Y((it.v + it.v2) / 2) + 4, it.n, '', 'start'); return; }
        el('circle', { cx: f.x, cy: Y(it.v), r: 6, fill: f.col }, g);
        txt(g, f.x + 10, Y(it.v) + 4 + (it.n === 'graphite' ? 4 : 0), it.n, '', 'start');
      });
      if (f.foot) txt(g, f.x, Y(0) + 26, f.foot, '', 'middle');
      badge(g, f.x, Y(0) + 50, i + 1);
    });
    steps(fig, fam.map(function (f) { return { text: f.txt }; }));
    read.innerHTML = 'Five families of electrode, placed where the sources put them on the lithium scale. Low on the axis makes a good negative electrode, high a good positive one; the cell voltage is the gap you choose (module 3).';
  });

  /* ===== 9.5 Sodium is bigger ===== */
  register('f9-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var scaled = !!fig.querySelector('.r42'); // ion sizes to scale only once the Shannon radii are verified
    var rLi = 7, rNa = scaled ? 7 * 102 / 76 : 10;
    function frame(x0, cols, d, R) {
      var c = [];
      for (var j = 0; j < 3; j++) for (var i = 0; i < cols; i++) { var x = x0 + R + i * d + (j % 2 ? d / 2 : 0), y = 64 + j * d * 0.866; c.push({ x: x, y: y, i: i, j: j }); el('circle', { cx: x, cy: y, r: R, fill: 'var(--anion)', 'fill-opacity': '.3', stroke: 'var(--anion)' }, g); }
      function at(i, j) { for (var k = 0; k < c.length; k++) if (c[k].i === i && c[k].j === j) return c[k]; }
      return function (i, j) { var A = at(i, j), B = at(i + 1, j), C = at(i, j + 1); return { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3, free: d / Math.sqrt(3) - R }; };
    }
    txt(g, 140, 22, 'close-packed oxide', 'strong', 'middle'); txt(g, 395, 22, 'more open framework', 'strong', 'middle');
    var L = frame(30, 4, 54, 24), Rf = frame(296, 3, 70, 22);
    var s1 = L(0, 0), s2 = L(2, 0), s3 = Rf(1, 0);
    el('circle', { cx: s1.x, cy: s1.y, r: rLi, 'class': 'ion' }, g);
    el('circle', { cx: s2.x, cy: s2.y, r: rNa, fill: '#e9a0f0', stroke: 'var(--heat)', 'stroke-width': 1.6 }, g);
    el('circle', { cx: s3.x, cy: s3.y, r: rNa, fill: '#e9a0f0', stroke: '#fff', 'stroke-width': .8 }, g);
    txt(g, 140, 226, 'Li⁺ fits; Na⁺ is squeezed (red rim)', '', 'middle'); txt(g, 395, 226, 'Na⁺ fits', 'cyan', 'middle');
    txt(g, 260, 246, scaled ? 'ions to scale: Li⁺ 76 pm, Na⁺ 102 pm (six-coordinate radii); frameworks schematic' : 'sizes not to scale', '', 'middle');
    badge(g, 18, 40, 1); badge(g, 500, 40, 2);
    steps(fig, [
      { text: 'Na⁺ is a bigger ion than Li⁺. In the close-packed oxygen frameworks that serve lithium so well, the spaces between the oxide ions can be too small for it.' },
      { text: 'A sodium host needs <b>more open</b> interstitial space, which is why sodium-ion cells cannot simply reuse the lithium-ion materials.' }
    ]);
    read.innerHTML = 'The size of the guest ion decides which frameworks can host it.' + (scaled ? ' Ionic radii from Shannon’s table.' : '');
  });
