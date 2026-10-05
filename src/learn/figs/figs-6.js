  /* =================================================================
     Module 6: inside a lithium-ion cell. The rocking chair after
     Tarascon and Armand 2001 (R2) Fig. 2b and Goodenough and Park 2013
     (R6) Fig. 1; insertion after Winter and Brodd 2004 (R1) 2.4; the
     SEI after R6, R1 2.4 and R2; host paths after R6; the timeline
     after R6 and R2.
     ================================================================= */

  /* ===== 6.1 The rocking chair ===== */
  register('f6-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), mb = fig.querySelectorAll('button[data-mode]');
    var gx0 = 62, gx1 = 168, px0 = 352, px1 = 458, y0 = 96, y1 = 246, xsep = 260, nL = 6;
    var gap = (y1 - y0) / nL;
    // current collectors
    el('rect', { x: gx0 - 12, y: y0 - 6, width: 10, height: y1 - y0 + 12, fill: 'var(--copper)' }, g); txt(g, gx0 - 7, y1 + 20, 'Cu', 'strong', 'middle');
    el('rect', { x: px1 + 2, y: y0 - 6, width: 10, height: y1 - y0 + 12, fill: 'var(--metal)' }, g); txt(g, px1 + 7, y1 + 20, 'Al', 'strong', 'middle');
    // electrolyte
    el('rect', { x: gx1, y: y0 - 6, width: px0 - gx1, height: y1 - y0 + 12, fill: 'var(--cyan)', 'fill-opacity': '.1' }, g);
    el('line', { x1: xsep, y1: y0, x2: xsep, y2: y1, stroke: 'var(--cyan)', 'stroke-dasharray': '3 5' }, g);
    // graphite: graphene sheets; LiCoO2: CoO2 slabs drawn as rows of octahedra (squares)
    for (var i = 0; i <= nL; i++) {
      var y = y0 + i * gap;
      el('line', { x1: gx0, x2: gx1, y1: y, y2: y, stroke: 'var(--text)', 'stroke-opacity': '.55', 'stroke-width': 2 }, g);
      for (var k = 0; k < 7; k++) el('rect', { x: px0 + 4 + k * 15, y: y - 4, width: 8, height: 8, transform: 'rotate(45 ' + (px0 + 8 + k * 15) + ' ' + y + ')', fill: 'var(--amber-2)', 'fill-opacity': '.65' }, g);
    }
    txt(g, (gx0 + gx1) / 2, y0 - 16, 'graphite', 'strong', 'middle'); txt(g, (px0 + px1) / 2, y0 - 16, 'LiCoO₂', 'strong', 'middle');
    txt(g, (gx0 + gx1) / 2, y1 + 20, 'sheets of carbon', '', 'middle'); txt(g, (px0 + px1) / 2, y1 + 20, 'CoO₂ layers', '', 'middle');
    txt(g, xsep, y1 + 20, 'electrolyte', 'cyan', 'middle');
    // external circuit
    var wy = 36, xL = gx0 - 7, xR = px1 + 7;
    var ePath = el('path', { d: 'M' + xL + ',' + (y0 - 6) + ' V' + wy + ' H' + xR + ' V' + (y0 - 6), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2 }, g);
    var eflow = flow(svg, ePath, { n: 10, cls: 'e-dot', r: 3, speed: 50, parent: g });
    var box = el('rect', { x: xsep - 58, y: wy - 15, width: 116, height: 30, rx: 6, fill: 'var(--panel)', stroke: 'var(--amber)' }, g);
    var boxT = txt(g, xsep, wy + 4, 'lamp', 'strong', 'middle'), eT = txt(g, xsep, wy - 22, '', 'cyan', 'middle');
    // sites: 6 interlayer rows x 3 sites on each side
    var sites = { neg: [], pos: [] };
    for (i = 0; i < nL; i++) for (k = 0; k < 3; k++) { sites.neg.push({ x: gx0 + 22 + k * 32, y: y0 + gap * (i + 0.5) }); sites.pos.push({ x: px0 + 20 + k * 34, y: y0 + gap * (i + 0.5) }); }
    var N = 12, ions = [];
    for (i = 0; i < N; i++) ions.push({ side: 'neg', slot: i, c: el('circle', { r: 4.2, 'class': 'ion' }, g) });
    var our = ourIon(g, 0, 0, 5.5, 'our ion', true); ions[3].our = true; ions[3].c.style.display = 'none';
    var cnt = txt(g, 260, 300, '', 'phi', 'middle'), cnt2 = txt(g, 260, 318, '', 'amber', 'middle');
    // inventory bars
    var bx = 112, bw = 296, by = 330;
    el('rect', { x: bx, y: by, width: bw, height: 12, rx: 3, fill: 'none', stroke: 'var(--line-2)' }, g);
    var barN = el('rect', { x: bx, y: by, height: 12, rx: 3, fill: 'var(--text)', 'fill-opacity': '.55' }, g), barP = el('rect', { y: by, height: 12, rx: 3, fill: 'var(--amber)' }, g);
    txt(g, bx - 6, by + 10, 'in graphite', '', 'end'); txt(g, bx + bw + 6, by + 10, 'in LiCoO₂', '', 'start');
    txt(g, 260, by + 30, 'the same lithium, only its address changes', 'phi', 'middle');
    badge(g, 30, 170, 1); badge(g, xsep, y0 + 14, 2); badge(g, 490, 170, 3); badge(g, xsep + 70, wy, 4); badge(g, 494, by + 6, 5);
    var mode = 'discharge', moving = null, t = 0;
    function freeSlot(side) { var used = {}; ions.forEach(function (p) { if (p.side === side) used[p.slot] = 1; }); var opts = []; for (var s = 0; s < sites[side].length; s++) if (!used[s]) opts.push(s); return opts.length ? opts[(opts.length * 0.37) | 0] : null; }
    function place(p) { var s = sites[p.side][p.slot]; p.c.setAttribute('cx', s.x); p.c.setAttribute('cy', s.y); if (p.our) our.move(s.x, s.y); }
    function count(side) { return ions.filter(function (p) { return p.side === side && p !== moving; }).length; }
    function render() {
      Array.prototype.forEach.call(mb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
      var n = count('neg'), p = count('pos'), tot = N;
      setSvgText(boxT, mode === 'discharge' ? 'lamp' : 'charger, above V_OC'); box.setAttribute('stroke', mode === 'discharge' ? 'var(--amber)' : 'var(--cyan)');
      setSvgText(eT, mode === 'discharge' ? 'electrons → through the lamp' : '← electrons pushed back');
      eflow.setSpeed(mode === 'discharge' ? 50 : -50);
      barN.setAttribute('width', bw * n / tot); barP.setAttribute('x', bx + bw * (tot - p) / tot); barP.setAttribute('width', bw * p / tot);
      setSvgText(cnt, 'graphite holds ' + n + ' of ' + tot + ' movable ions, LiCoO₂ ' + p + (moving ? ', one crossing' : ''));
      setSvgText(cnt2, mode === 'discharge' ? (n === 0 && !moving ? 'graphite empty: the cell is discharged' : 'discharging: Li⁺ leaves the graphite') : (p === 0 && !moving ? 'LiCoO₂ emptied as far as this sketch goes' : 'charging: Li⁺ returns to the graphite'));
      read.innerHTML = mode === 'discharge'
        ? 'Discharge: a lithium ion leaves the space between two carbon sheets, crosses the electrolyte and slips in between two CoO₂ layers; at the same moment an electron leaves the graphite through the copper, runs through the lamp and enters the LiCoO₂ through the aluminium. Neither host is used up.'
        : 'Charge: the charger, set above the open-circuit voltage, pulls electrons out of the LiCoO₂ and pushes them into the graphite; lithium ions follow inside, back between the carbon sheets. The hosts are the same ones; only the lithium has moved.';
    }
    function launch() {
      var from = mode === 'discharge' ? 'neg' : 'pos', to = from === 'neg' ? 'pos' : 'neg';
      var cand = ions.filter(function (p) { return p.side === from; }); if (!cand.length) return;
      var pick = cand.filter(function (p) { return p.our; })[0] && Math.random() < 0.4 ? cand.filter(function (p) { return p.our; })[0] : cand[(cand.length * 0.61) | 0];
      var slot = freeSlot(to); if (slot === null) return;
      var a = sites[from][pick.slot], b = sites[to][slot];
      moving = pick; pick.k = 0; pick.a = a; pick.b = b; pick.to = to; pick.toSlot = slot;
    }
    function tick(dt) {
      if (dt === 0) return; t += dt; eflow.advance(dt);
      if (!moving) { launch(); render(); return; }
      var p = moving; p.k += dt / 2.2; var k = smooth(Math.min(1, p.k));
      var x = lerp(p.a.x, p.b.x, k), y = lerp(p.a.y, p.b.y, k) + Math.sin(k * Math.PI * 3) * 6;
      p.c.setAttribute('cx', x); p.c.setAttribute('cy', y); if (p.our) our.move(x, y);
      if (p.k >= 1) { p.side = p.to; p.slot = p.toSlot; moving = null; place(p); render(); }
    }
    ions.forEach(function (p, i) { p.slot = i; place(p); });
    Array.prototype.forEach.call(mb, function (b) { on(b, 'click', function () { mode = b.getAttribute('data-mode'); render(); }); });
    steps(fig, [
      { text: 'The <b>negative electrode</b> is graphite on copper foil: sheets of carbon atoms with room between them. In a charged cell the lithium sits there, up to one lithium for every six carbons (LiC₆).' },
      { text: 'On discharge a lithium ion leaves its gap, crosses the <b>electrolyte</b> as Li⁺ and goes into the other electrode. The electrolyte carries ions, not electrons.' },
      { text: 'The <b>positive electrode</b> is LiCoO₂: layers of cobalt and oxygen with lithium between them, on aluminium foil. The ion slides in between two layers. Neither host is dissolved or rebuilt: this is <b>insertion</b>, and for layered hosts like these two, <b>intercalation</b>.' },
      { text: 'Every ion that crosses inside is matched by an electron that goes round outside, through the lamp. Switch to <b>Charge</b>: the charger, set above V<sub>OC</sub>, drives both back.' },
      { text: 'The bar counts the movable lithium. It only ever moves from one end to the other: nothing is consumed in an ideal lithium-ion cell. This back and forth is why it was called the <b>rocking-chair</b> cell.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    render(); bind(fig, loop);
  });

  /* ===== 6.3 The first charge and the SEI ===== */
  register('f6-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), cyc = fig.querySelectorAll('button[data-cycle]');
    // left: close-up of the graphite surface; right: the potential of the graphite on the lithium scale
    var gx0 = 40, gx1 = 120, ex1 = 300, y0 = 50, y1 = 250;
    for (var i = 0; i < 9; i++) el('line', { x1: gx0, x2: gx1, y1: y0 + 10 + i * 22, y2: y0 + 10 + i * 22, stroke: 'var(--text)', 'stroke-opacity': '.5', 'stroke-width': 2 }, g);
    txt(g, (gx0 + gx1) / 2, y0 - 14, 'graphite', 'strong', 'middle');
    el('rect', { x: gx1, y: y0, width: ex1 - gx1, height: y1 - y0, fill: 'var(--cyan)', 'fill-opacity': '.08' }, g);
    txt(g, (gx1 + ex1) / 2 + 20, y0 - 14, 'electrolyte', 'cyan', 'middle');
    var sei = el('rect', { x: gx1, y: y0, width: 0, height: y1 - y0, fill: 'var(--anion)', 'fill-opacity': '.7' }, g);
    var seiT = txt(g, gx1 + 4, y1 + 18, '', 'strong', 'start');
    var mols = []; for (i = 0; i < 9; i++) mols.push({ x: gx1 + 40 + Math.random() * 130, y: y0 + 14 + Math.random() * (y1 - y0 - 28), e: el('ellipse', { rx: 7, ry: 4, fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.4 }, g), state: 'free' });
    var our = ourIon(g, ex1 - 20, 150, 5, 'our ion', true);
    var eHit = el('circle', { r: 3, 'class': 'e-dot' }, g); eHit.style.display = 'none';
    // right: potential scale
    var ax = 380, Y = function (v) { return 260 - v / 4.5 * 220; };
    el('line', { x1: ax, y1: Y(0), x2: ax, y2: Y(4.5), stroke: 'var(--line-2)' }, g);
    el('rect', { x: ax - 30, y: Y(4.3), width: 60, height: Y(1.1) - Y(4.3), fill: 'var(--cyan)', 'fill-opacity': '.12', stroke: 'var(--cyan)', 'stroke-opacity': '.4' }, g);
    txt(g, ax + 20, Y(2.7), 'electrolyte stable', 'cyan', 'middle', { transform: 'rotate(-90 ' + (ax + 20) + ' ' + Y(2.7) + ')' });
    [[0, '0'], [0.2, '0.2'], [1.1, '1.1'], [4.3, '4.3']].forEach(function (r) { el('line', { x1: ax - 4, x2: ax, y1: Y(r[0]), y2: Y(r[0]) }, g); txt(g, ax - 36, Y(r[0]) + (r[0] === 0 ? 8 : r[0] === 0.2 ? -2 : 4), r[1] + ' V', '', 'end'); });
    txt(g, ax + 36, Y(1.1) + 4, 'lower edge', 'cyan', 'start');
    txt(g, ax, Y(0) + 18, 'V vs Li/Li⁺', '', 'middle');
    var mark = el('line', { x1: ax - 30, x2: ax + 30, stroke: 'var(--text)', 'stroke-width': 3 }, g), markT = txt(g, ax + 36, 0, 'graphite now', 'strong', 'start');
    // lithium inventory
    var bx = 40, bw = 260, by = 290;
    el('rect', { x: bx, y: by, width: bw, height: 12, rx: 3, fill: 'none', stroke: 'var(--line-2)' }, g);
    var bG = el('rect', { x: bx, y: by, height: 12, fill: 'var(--amber)' }, g), bS = el('rect', { y: by, height: 12, fill: 'var(--anion)' }, g), bP = el('rect', { y: by, height: 12, fill: 'var(--amber-2)', 'fill-opacity': '.5' }, g);
    txt(g, bx, by + 28, 'lithium from the positive electrode, left to right:', '', 'start'); txt(g, bx, by + 43, 'in the graphite (amber), locked in the SEI (grey), not yet moved', '', 'start');
    txt(g, bx + bw + 6, by + 10, 'sizes schematic', '', 'start');
    badge(g, ax + 60, Y(3.4), 1); badge(g, ax - 84, Y(1.1), 2); badge(g, gx1 + 10, y0 - 18, 3); badge(g, 150, by - 12, 4);
    var cycle = 1, k = 0, seiW = 0, locked = 0; // k: progress of this charge (0..1)
    /* Schematic first charge, k = share of the movable lithium sent from the positive electrode.
       Cycle 1: the potential drops quickly to the 1.1 V edge, then slopes down while the SEI forms
       (k up to 0.12, the charge locked in it), then the graphite fills near 0.2 V. Cycle 2: no SEI step. */
    var KS = 0.12;
    function V(kk) {
      if (cycle === 1) return kk < 0.01 ? 3.0 - 1.9 * kk / 0.01 : kk < KS ? 1.1 - 0.8 * (kk - 0.01) / (KS - 0.01) : 0.2 + 0.1 * Math.exp(-(kk - KS) / 0.08);
      return kk < 0.04 ? 3.0 - 2.7 * kk / 0.04 : 0.2 + 0.1 * Math.exp(-(kk - 0.04) / 0.08);
    }
    function render() {
      Array.prototype.forEach.call(cyc, function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-cycle') === cycle)); });
      var v = V(k); mark.setAttribute('y1', Y(v)); mark.setAttribute('y2', Y(v)); markT.setAttribute('y', Y(v) + 4);
      sei.setAttribute('width', seiW); setSvgText(seiT, seiW > 4 ? 'SEI' : '');
      var stored = cycle === 1 ? Math.max(0, k - KS) : k * (1 - locked), w = bw;
      bG.setAttribute('width', w * stored); bS.setAttribute('x', bx + w * stored); bS.setAttribute('width', w * locked); bP.setAttribute('x', bx + w * (stored + locked)); bP.setAttribute('width', Math.max(0, w * (1 - stored - locked)));
      var below = v < 1.1;
      read.innerHTML = (cycle === 1 ? 'First charge. ' : 'Second charge. ') + 'The graphite is at about <b>' + v.toFixed(1) + ' V</b> vs Li/Li⁺. ' +
        (!below ? 'Still inside the window where the electrolyte is stable: nothing reacts at the surface.' :
          cycle === 1 ? (locked < KS - 1e-6 ? 'Below the lower edge of the window the electrolyte is reduced at the graphite surface; its products build a layer, and the lithium they lock up came from the positive electrode and will not come back.' : 'The layer is complete: it blocks electrons, so the electrolyte behind it is protected, but it lets Li⁺ through, and the graphite fills.') :
            'The layer formed on the first charge is already there: Li⁺ passes, electrons do not, and the large first-charge loss is not repeated.');
    }
    function tick(dt) {
      if (dt === 0) return;
      k += dt / 12; if (k > 1) { k = 1; }
      var v = V(k);
      if (cycle === 1 && v < 1.1 && locked < KS) {
        locked = Math.min(KS, Math.max(0, k - 0.01) * KS / (KS - 0.01)); seiW = 14 * locked / KS;
        var m = mols[(Math.random() * mols.length) | 0];
        if (m.state === 'free' && Math.random() < dt * 2) { m.state = 'hit'; m.t = 0; }
      }
      mols.forEach(function (m, j) {
        if (m.state === 'hit') { m.t += dt; m.x = lerp(m.x, gx1 + seiW + 8, 0.08); if (m.t > 1.2) { m.state = 'gone'; m.e.style.display = 'none'; eHit.style.display = 'none'; } else { eHit.style.display = ''; eHit.setAttribute('cx', gx1 + seiW + 2); eHit.setAttribute('cy', m.y); } }
        else if (m.state === 'free') { m.x += Math.sin((k * 40) + j) * 0.3; }
        m.e.setAttribute('cx', m.x); m.e.setAttribute('cy', m.y);
      });
      var ok = v < 1.1 ? 1 : 0, ph = (k * 9) % 1; // our ion keeps crossing into the graphite
      our.move(lerp(ex1 - 20, gx1 - 14, smooth(ph)), 150 + Math.sin(ph * 6) * 4);
      render();
    }
    Array.prototype.forEach.call(cyc, function (b) { on(b, 'click', function () { cycle = +b.getAttribute('data-cycle'); k = 0; if (cycle === 1) { seiW = 0; locked = 0; mols.forEach(function (m) { m.state = 'free'; m.e.style.display = ''; }); } else { seiW = 14; locked = 0.12; mols.forEach(function (m, j) { if (j % 2) { m.state = 'gone'; m.e.style.display = 'none'; } }); } render(); }); });
    steps(fig, [
      { text: 'A lithium-ion cell is <b>built discharged</b>: all the movable lithium starts in the positive electrode and the graphite starts empty. Press Play to charge it for the first time; the white bar on the right is the graphite’s potential.' },
      { text: 'As lithium arrives, the graphite’s potential falls toward 0.2 V vs Li/Li⁺, <b>below the lower edge</b> of the window in which the carbonate electrolyte is stable (about 1.1 V).' },
      { text: 'Below that edge, the electrolyte is reduced at the graphite surface, and the products build a thin layer: the <b>solid-electrolyte interphase</b>, or SEI. Once it is thick enough it is <b>electronically insulating but passes Li⁺</b>, so it stops further reduction while the graphite keeps filling.' },
      { text: 'The bar shows the price: the lithium locked in the SEI came from the positive electrode and does not come back. Press <b>Second charge</b>: the layer is already there, so the big first-charge loss is not repeated. The layer keeps evolving slowly as the cell cycles (module 10).' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.6, onPlay: function () { if (k >= 1) { k = 0; if (cycle === 1) { seiW = 0; locked = 0; mols.forEach(function (m) { m.state = 'free'; m.e.style.display = ''; }); } } } });
    if (!motion) { k = 1; seiW = 14; locked = 0.12; mols.forEach(function (m, j) { if (j % 3 === 0) { m.state = 'gone'; m.e.style.display = 'none'; } }); }
    render(); bind(fig, loop);
  });

  /* ===== 6.4 Three hosts, three kinds of path ===== */
  register('f6-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    /* isometric drawing of a unit box per host; x and z run along the floor, y up */
    var S = 118, c30 = Math.cos(Math.PI / 6), s30 = 0.5;
    function P(o, x, y, z) { return { x: o.x + (x - z) * c30 * S * 0.62, y: o.y - y * S * 0.78 + (x + z) * s30 * S * 0.62 }; }
    function poly(gp, o, pts, a) { el('path', Object.assign({ d: pts.map(function (p, k) { var q = P(o, p[0], p[1], p[2]); return (k ? 'L' : 'M') + q.x.toFixed(1) + ',' + q.y.toFixed(1); }).join(' ') + ' Z' }, a), gp); }
    function seg(gp, o, A, B, a) { var p = P(o, A[0], A[1], A[2]), q = P(o, B[0], B[1], B[2]); return el('line', Object.assign({ x1: p.x, y1: p.y, x2: q.x, y2: q.y }, a), gp); }
    function plane(gp, o, y, a) { poly(gp, o, [[0, y, 0], [1, y, 0], [1, y, 1], [0, y, 1]], a); }
    function cross(gp, x, y) { el('path', { d: 'M' + (x - 6) + ',' + (y - 6) + ' L' + (x + 6) + ',' + (y + 6) + ' M' + (x + 6) + ',' + (y - 6) + ' L' + (x - 6) + ',' + (y + 6), stroke: 'var(--heat)', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, gp); }
    var cols = [88, 260, 432], oy = 142;
    var heads = [['layered', 'LiCoO₂', '2D: within planes'], ['spinel', 'LiMn₂O₄', '3D: a network'], ['olivine', 'LiFePO₄', '1D: channels']];
    heads.forEach(function (h, i) { txt(g, cols[i], 20, h[0], 'strong', 'middle'); txt(g, cols[i], 36, h[1], '', 'middle'); txt(g, cols[i], 262, h[2], 'amber', 'middle'); badge(g, cols[i] + 70, 26, i + 1); });
    var O = cols.map(function (cx) { return { x: cx, y: oy }; });
    var frame = { fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '3 3' };
    // 1. layered: oxide slabs (solid) and lithium planes (dashed amber) between them
    var gA = el('g', {}, g), oA = O[0];
    [0, 0.5, 1].forEach(function (y) { plane(gA, oA, y, { fill: 'var(--amber-2)', 'fill-opacity': '.28', stroke: 'var(--amber-2)' }); });
    [0.25, 0.75].forEach(function (y) { plane(gA, oA, y, { fill: 'var(--cation)', 'fill-opacity': '.08', stroke: 'var(--cation)', 'stroke-dasharray': '4 3' }); });
    var a1 = P(oA, 0.15, 0.25, 0.5), a2 = P(oA, 0.85, 0.25, 0.5), a3 = P(oA, 0.5, 0.25, 0.15), a4 = P(oA, 0.5, 0.25, 0.85);
    arrow(gA, a1.x, a1.y, a2.x, a2.y, 'var(--cation)', 1.6); arrow(gA, a2.x, a2.y, a1.x, a1.y, 'var(--cation)', 1.6);
    arrow(gA, a3.x, a3.y, a4.x, a4.y, 'var(--cation)', 1.6); arrow(gA, a4.x, a4.y, a3.x, a3.y, 'var(--cation)', 1.6);
    var v1 = P(oA, 0.9, 0.27, 0.9), v2 = P(oA, 0.9, 0.73, 0.9); el('line', { x1: v1.x, y1: v1.y, x2: v2.x, y2: v2.y, stroke: 'var(--heat)', 'stroke-dasharray': '3 3' }, gA); cross(gA, (v1.x + v2.x) / 2, (v1.y + v2.y) / 2);
    // 2. spinel: a three-dimensional network of paths
    var gB = el('g', {}, g), oB = O[1];
    [0, 0.5, 1].forEach(function (u) { [0, 0.5, 1].forEach(function (v) {
      seg(gB, oB, [0, u, v], [1, u, v], { stroke: 'var(--cation)', 'stroke-opacity': '.55', 'stroke-width': 1.6 });
      seg(gB, oB, [u, 0, v], [u, 1, v], { stroke: 'var(--cation)', 'stroke-opacity': '.55', 'stroke-width': 1.6 });
      seg(gB, oB, [u, v, 0], [u, v, 1], { stroke: 'var(--cation)', 'stroke-opacity': '.55', 'stroke-width': 1.6 });
    }); });
    [0, 0.5, 1].forEach(function (u) { [0, 0.5, 1].forEach(function (v) { [0, 0.5, 1].forEach(function (w) { var q = P(oB, u, v, w); el('circle', { cx: q.x, cy: q.y, r: 3.2, fill: 'var(--amber-2)', 'fill-opacity': '.8' }, gB); }); }); });
    // 3. olivine: parallel channels along x only
    var gC = el('g', {}, g), oC = O[2];
    [0.2, 0.5, 0.8].forEach(function (y) { [0.2, 0.5, 0.8].forEach(function (z) { var p = P(oC, 0, y, z), q = P(oC, 1, y, z); el('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: 'var(--amber-2)', 'stroke-opacity': '.35', 'stroke-width': 11, 'stroke-linecap': 'round' }, gC); el('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: 'var(--cation)', 'stroke-opacity': '.6', 'stroke-width': 1.4, 'stroke-dasharray': '4 3' }, gC); }); });
    var w1 = P(oC, 0.62, 0.5, 0.5), w2 = P(oC, 0.62, 0.8, 0.5); el('line', { x1: w1.x, y1: w1.y, x2: w2.x, y2: w2.y, stroke: 'var(--heat)', 'stroke-dasharray': '3 3' }, gC); cross(gC, (w1.x + w2.x) / 2, (w1.y + w2.y) / 2);
    [oA, oB, oC].forEach(function (o, i) { [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]].forEach(function (b) { seg([gA, gB, gC][i], o, b, [b[0], 1, b[2]], frame); }); });
    // the moving ions
    var ionA = el('circle', { r: 5.5, 'class': 'ion' }, g), ionB = ourIon(g, 0, 0, 5.5, 'our ion', true), ionC = el('circle', { r: 5.5, 'class': 'ion' }, g);
    var pa = { x: 0.5, z: 0.5, tx: 0.8, tz: 0.3 }, pb = { p: [0.5, 0.5, 0.5], q: [1, 0.5, 0.5], k: 0 }, t = 0;
    function place() {
      var a = P(oA, pa.x, 0.25, pa.z); ionA.setAttribute('cx', a.x); ionA.setAttribute('cy', a.y);
      var pp = [lerp(pb.p[0], pb.q[0], pb.k), lerp(pb.p[1], pb.q[1], pb.k), lerp(pb.p[2], pb.q[2], pb.k)], b = P(oB, pp[0], pp[1], pp[2]); ionB.move(b.x, b.y);
      var c = P(oC, 0.5 + 0.42 * Math.sin(t * 0.9), 0.5, 0.5); ionC.setAttribute('cx', c.x); ionC.setAttribute('cy', c.y);
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      // layered: wander anywhere within the plane
      var dx = pa.tx - pa.x, dz = pa.tz - pa.z, d = Math.hypot(dx, dz);
      if (d < 0.02) { pa.tx = 0.12 + Math.random() * 0.76; pa.tz = 0.12 + Math.random() * 0.76; } else { pa.x += dx / d * dt * 0.35; pa.z += dz / d * dt * 0.35; }
      // spinel: along the network, turning at the nodes in any of the three directions
      pb.k += dt * 1.1;
      if (pb.k >= 1) { pb.p = pb.q; pb.k = 0; var opts = []; for (var ax = 0; ax < 3; ax++) [-0.5, 0.5].forEach(function (st) { var n = pb.p.slice(); n[ax] += st; if (n[ax] >= -0.01 && n[ax] <= 1.01) opts.push(n); }); pb.q = opts[(Math.random() * opts.length) | 0]; }
      place();
    }
    steps(fig, [
      { text: '<b>Layered</b> oxides such as LiCoO₂: the lithium moves in <b>two dimensions</b>, anywhere within its plane between two oxide layers, but not across an oxide layer (red cross).' },
      { text: '<b>Spinel</b> LiMn₂O₄: the framework leaves a <b>three-dimensional</b> network of paths, so the ion can turn up, down and sideways at every junction.' },
      { text: '<b>Olivine</b> LiFePO₄: <b>one-dimensional</b> channels, all parallel; the ion can only go back and forth along its channel, not across to the next. A blocked channel is a dead end, which is one reason why small particles matter (module 8).' }
    ]);
    read.innerHTML = 'Three hosts, three kinds of path: a plane (2D), a network (3D) and a channel (1D). Each block is a schematic piece of the structure; the real frameworks are polyhedra.';
    place();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.3 });
    bind(fig, loop);
  });

  /* ===== 6.5 Timeline, 1972 to 1996 ===== */
  register('f6-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 34, x1 = 486, yA = 54, X = function (yr) { return x0 + (yr - 1971) / (1997 - 1971) * (x1 - x0); };
    var ev = [
      { yr: 1972, y: 36, an: 'start', note: 'Layered TiS₂ singled out as a positive electrode; the recipe for an intercalation electrode set out.', a: 'Belgirate, 1972', b: 'Steele; Armand', txt: '1972, a NATO conference at Belgirate: Steele singles out the layered dichalcogenides such as TiS₂ as positive electrodes (Rüdorff, Rouxel and co-workers had shown alkali metals entering them fast), and Armand sets out what an intercalation electrode needs and proposes putting cations into graphite.' },
      { yr: 1976, y: 222, an: 'middle', note: 'Lithium goes in and out of TiS₂ at about 2.2 V; Exxon’s lithium-metal cell later fails on dendrites.', a: 'Li vs TiS₂, 2.2 V', b: 'Whittingham; Steele', txt: '1976: Whittingham at Exxon, and Steele and co-workers, show lithium going rapidly and reversibly into TiS₂ against a lithium-metal electrode, at about 2.2 V. Exxon showed a 45 Wh cell in 1977, but dendrites grew across to the positive electrode, the shorts ignited the electrolyte, and the programme was abandoned.' },
      { yr: 1978.5, y: 268, an: 'middle', note: 'Two insertion electrodes, no lithium metal: the first rocking-chair cell, LiₓWO₂ against TiS₂.', a: 'the rocking chair', b: 'Armand; Lazzari, Scrosati', txt: 'Late 1970s: Armand proposes the rocking-chair cell, two insertion electrodes at different potentials, to get rid of lithium-metal dendrites. Lazzari and Scrosati build one almost at once, LiₓWO₂ against TiS₂: about 2 V and 70 good cycles. In 1978 Armand also proposes polymer electrolytes (module 7) and, in a patent, graphite as the negative host.' },
      { yr: 1980, y: 128, an: 'end', note: 'Over half the lithium comes out of LiCoO₂ reversibly, at about 4 V: cells can be built discharged.', a: 'LiCoO₂, 4 V', b: 'Goodenough', txt: '1979 to 1980: Goodenough’s group finds that over half of the lithium can be taken reversibly out of layered LiCoO₂, at about 4 V vs Li/Li⁺, twice TiS₂. A cell can now be built discharged, with all its lithium in the positive electrode.' },
      { yr: 1983, y: 82, an: 'middle', note: 'Petroleum coke cycles in a carbonate electrolyte; carbon against LiCoO₂ is proposed.', a: 'carbon negative', b: 'Yoshino; Yazami', txt: '1983: Yoshino cycles petroleum coke in a propylene-carbonate electrolyte and proposes soft carbon against LiCoO₂, the building blocks of today’s cell; Yazami and Touzain insert lithium into graphite electrochemically. LiMn₂O₄ follows the same year.' },
      { yr: 1990, y: 36, an: 'end', note: 'Ethylene carbonate forms a protective film on graphite, mostly on the first charge.', a: 'EC protects graphite', b: 'Fong, von Sacken, Dahn', txt: '1990: with ethylene carbonate in the electrolyte, a protective, Li⁺-conducting film forms on graphite during the first insertion only; after that, intercalation is fully reversible. The SEI of figure 6.3.' },
      { yr: 1991, y: 222, an: 'end', note: 'Carbon against LiCoO₂ goes on sale: about 80 Wh/kg, ahead of every other rechargeable.', a: 'Sony, June 1991', b: '80 Wh/kg, 200 Wh/L', txt: 'June 1991: Sony puts the carbon | LiCoO₂ cell on the market, after Yoshino’s 1986 safety tests showed it more tolerant of abuse than lithium-metal cells: about 80 Wh/kg and 200 Wh/L, ahead of every rechargeable of the day.' },
      { yr: 1993, y: 128, an: 'start', note: 'LiPF₆ in EC/DMC becomes the standard electrolyte.', a: 'LiPF₆ in EC/DMC', b: 'Guyomard, Tarascon', txt: '1993: Guyomard and Tarascon propose LiPF₆ in ethylene carbonate and dimethyl carbonate, which became the standard electrolyte. With it, LiCoO₂ cells have reached about 250 Wh/kg and 600 Wh/L (2020), three times Sony’s first.' },
      { yr: 1996, y: 268, an: 'end', note: 'LiFePO₄ is proposed; a carbon coating makes it work.', a: 'LiFePO₄', b: 'Goodenough; Armand', txt: '1996: Goodenough’s group proposes LiFePO₄; Armand and co-workers make it work by coating the particles with carbon (module 8). By 2020 it was produced in thousands of tonnes a year.' }
    ];
    el('line', { x1: x0, x2: x1, y1: yA, y2: yA, stroke: 'var(--line-2)', 'stroke-width': 2 }, g);
    var dots = ev.map(function (e, i) {
      var x = X(e.yr), d = el('circle', { cx: x, cy: yA, r: 6, fill: 'var(--panel-2)', stroke: 'var(--amber)', 'stroke-width': 2 }, g);
      txt(g, x, i % 2 ? yA + 24 : yA - 14, e.yr === 1978.5 ? 'late 1970s' : String(e.yr), '', 'middle');
      return d;
    });
    badge(g, x1 + 10, yA - 30, 1);
    // the event card
    el('rect', { x: 24, y: 96, width: 472, height: 150, rx: 12, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    var pointer = el('path', { fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
    var cYear = txt(g, 48, 140, '', 'amber', 'start', { style: 'font-size:30px;font-weight:700' });
    var cTitle = txt(g, 150, 128, '', 'strong', 'start', { style: 'font-size:17px' });
    var cWho = txt(g, 150, 150, '', 'cyan', 'start', { style: 'font-size:13px' });
    var cNote = [txt(g, 48, 186, '', '', 'start', { style: 'font-size:13px' }), txt(g, 48, 206, '', '', 'start', { style: 'font-size:13px' }), txt(g, 48, 226, '', '', 'start', { style: 'font-size:13px' })];
    var cur = 0;
    function wrap(str, n) { var w = str.split(' '), lines = [''], k = 0; w.forEach(function (x) { if ((lines[k] + ' ' + x).trim().length > n) { k++; lines[k] = ''; } lines[k] = (lines[k] + ' ' + x).trim(); }); return lines; }
    function show(i) {
      cur = i; var e = ev[i], x = X(e.yr);
      dots.forEach(function (d, k) { d.setAttribute('fill', k === i ? 'var(--amber)' : k < i ? 'var(--amber-2)' : 'var(--panel-2)'); d.setAttribute('r', k === i ? 8 : 6); });
      pointer.setAttribute('d', 'M' + (x - 8) + ',96.5 L' + x + ',' + (yA + 10) + ' L' + (x + 8) + ',96.5 Z');
      setSvgText(cYear, e.yr === 1978.5 ? '1970s' : String(e.yr)); setSvgText(cTitle, e.a); setSvgText(cWho, e.b);
      var lines = wrap(e.note, 62); cNote.forEach(function (t2, k) { setSvgText(t2, lines[k] || ''); });
      read.innerHTML = e.txt;
    }
    var st = steps(fig, ev.map(function (e, i) { return { text: '<b>' + (e.yr === 1978.5 ? 'Late 1970s' : e.yr) + '.</b> ' + e.a + '.', on: function () { show(i); } }; }));
    var acc = 0, loop = anim(fig, function (dt) { if (dt === 0) return; acc += dt; if (acc > 5) { acc = 0; st.go((cur + 1) % ev.length); } }, { autoplay: true, stepDt: 5 });
    bind(fig, loop);
  });

