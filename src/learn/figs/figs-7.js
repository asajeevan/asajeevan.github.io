  /* =================================================================
     Module 7: the electrolyte. Carriers after Winter and Brodd 2004 (R1)
     2.2 and Tarascon and Armand 2001 (R2) Fig. 3 and text; conductivity
     orderings after R2 Fig. 8; transference number and the steady-state
     salt gradient after Boz et al. 2021 (R36) eqs. 6, 7 and 12 and Bard,
     Faulkner and White (B2) 2.3.3; solid-electrolyte requirements and
     contact loss after Goodenough and Park 2013 (R6).
     ================================================================= */

  /* ===== 7.8 Three ways to carry a lithium ion ===== */
  register('f7-8', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), tb = fig.querySelector('.chains');
    var W = 150, top = 46, h = 170, xs = [20, 185, 350];
    var names = [['liquid', 'organic carbonate + LiPF₆'], ['dry polymer', 'PEO + lithium salt'], ['ceramic', 'garnet']];
    xs.forEach(function (x, i) {
      el('rect', { x: x, y: top, width: W, height: h, rx: 6, fill: i === 0 ? 'var(--cyan)' : i === 1 ? 'var(--cyan-2)' : 'var(--metal)', 'fill-opacity': i === 2 ? '.18' : '.1', stroke: 'var(--line-2)' }, g);
      txt(g, x + W / 2, top - 22, names[i][0], 'strong', 'middle'); txt(g, x + W / 2, top - 8, names[i][1], '', 'middle');
      badge(g, x + W - 2, top + h + 16, i + 1);
    });
    // liquid: solvent molecules, a solvated Li+, anions; occasional ion pair
    var sol = []; for (var i = 0; i < 16; i++) sol.push({ x: xs[0] + 10 + Math.random() * 130, y: top + 10 + Math.random() * 150, e: el('ellipse', { rx: 6, ry: 3.5, fill: 'none', stroke: 'var(--cyan)', 'stroke-opacity': '.6' }, g) });
    var an1 = []; for (i = 0; i < 4; i++) an1.push({ x: xs[0] + 20 + Math.random() * 110, y: top + 20 + Math.random() * 130, c: el('circle', { r: 4, 'class': 'ion an' }, g) });
    var shell = el('circle', { r: 11, fill: 'none', stroke: 'var(--cyan)', 'stroke-dasharray': '2 2' }, g);
    var li1 = ourIon(g, xs[0] + 75, top + 85, 5, 'our ion', true), p1 = { x: xs[0] + 75, y: top + 85, vx: 14, vy: 9 };
    var pairT = txt(g, xs[0] + W / 2, top + h + 16, '', 'amber', 'middle');
    // polymer: wavy chains with coordinating sites; Li+ hops between sites as segments move
    var chains = [];
    for (i = 0; i < 4; i++) chains.push({ y: top + 30 + i * 38, p: el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 2, 'stroke-opacity': '.8' }, g), ph: Math.random() * 6 });
    var an2 = []; for (i = 0; i < 3; i++) an2.push({ x: xs[1] + 30 + i * 45, y: top + 49 + (i % 2) * 76, c: el('circle', { cx: xs[1] + 30 + i * 45, cy: top + 49 + (i % 2) * 76, r: 4, 'class': 'ion an' }, g) });
    var li2 = el('circle', { r: 5, 'class': 'ion' }, g), p2 = { chain: 1, k: 0.3, tgt: 2, hop: 0 };
    // ceramic: rigid lattice with vacant Li sites
    var lat = [];
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) { var lx = xs[2] + 22 + c * 36, ly = top + 26 + r * 40; el('rect', { x: lx - 7, y: ly - 7, width: 14, height: 14, transform: 'rotate(45 ' + lx + ' ' + ly + ')', fill: 'var(--metal)', 'fill-opacity': '.7' }, g); lat.push({ x: lx + 18, y: ly + 20 }); }
    lat = lat.filter(function (p) { return p.x < xs[2] + W - 6 && p.y < top + h - 6; });
    lat.forEach(function (p) { el('circle', { cx: p.x, cy: p.y, r: 3, fill: 'none', stroke: 'var(--amber)', 'stroke-opacity': '.5', 'stroke-dasharray': '1.5 1.5' }, g); });
    var li3 = el('circle', { r: 5, 'class': 'ion' }, g), p3 = { i: 0, j: 1, k: 0 };
    var frozen = false, t = 0;
    function chainY(ch, x) { return ch.y + Math.sin(x / 9 + ch.ph) * (frozen ? 5 : 5 + 2 * Math.sin(t * 2 + ch.ph)); }
    function drawChains() { chains.forEach(function (ch) { var d = ''; for (var x = xs[1] + 6; x <= xs[1] + W - 6; x += 4) d += (d ? 'L' : 'M') + x + ',' + chainY(ch, x).toFixed(1); ch.p.setAttribute('d', d); }); }
    function render() {
      tb.setAttribute('aria-pressed', String(frozen)); setSvgText(tb, frozen ? 'Warm the polymer' : 'Cool the polymer');
      read.innerHTML = frozen
        ? 'Polymer cooled: the chain segments stop moving, and the lithium ion, which moved only with their help, stops too. The liquid and the ceramic do not depend on chain motion.'
        : 'Liquid: the ion travels inside its shell of solvent molecules and now and then pairs with an anion. Polymer: it hops between sites on the chains, carried by their wriggling. Ceramic: it moves through a framework that itself stays still.';
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      // liquid
      p1.x += p1.vx * dt; p1.y += p1.vy * dt; if (p1.x < xs[0] + 16 || p1.x > xs[0] + W - 16) p1.vx *= -1; if (p1.y < top + 16 || p1.y > top + h - 16) p1.vy *= -1;
      li1.move(p1.x, p1.y); shell.setAttribute('cx', p1.x); shell.setAttribute('cy', p1.y);
      sol.forEach(function (m, j) { m.x += Math.sin(t * 1.3 + j) * 6 * dt; m.y += Math.cos(t * 1.1 + j) * 6 * dt; m.e.setAttribute('cx', m.x); m.e.setAttribute('cy', m.y); });
      var near = false; an1.forEach(function (a, j) { a.x += Math.sin(t * 0.7 + j * 2) * 8 * dt; a.y += Math.cos(t * 0.9 + j) * 8 * dt; a.c.setAttribute('cx', a.x); a.c.setAttribute('cy', a.y); if (Math.hypot(a.x - p1.x, a.y - p1.y) < 18) near = true; });
      setSvgText(pairT, near ? 'ion pair' : '');
      // polymer
      drawChains();
      if (!frozen) {
        p2.k += dt * 0.06; if (p2.k > 0.95) p2.k = 0.05;
        p2.hop += dt; if (p2.hop > 2.4) { p2.hop = 0; p2.chain = (p2.chain + (Math.random() < 0.5 ? 1 : 3)) % 4; }
      }
      var ch = chains[p2.chain], x2 = xs[1] + 10 + p2.k * (W - 20); li2.setAttribute('cx', x2); li2.setAttribute('cy', chainY(ch, x2) + 6);
      // ceramic
      p3.k += dt / 1.1; if (p3.k >= 1) { p3.k = 0; p3.i = p3.j; var cand = lat.map(function (p, j) { return j; }).filter(function (j) { return j !== p3.i && Math.hypot(lat[j].x - lat[p3.i].x, lat[j].y - lat[p3.i].y) < 45; }); p3.j = cand[(Math.random() * cand.length) | 0]; }
      var a = lat[p3.i], b = lat[p3.j], kk = p3.k < 0.7 ? 0 : smooth((p3.k - 0.7) / 0.3);
      li3.setAttribute('cx', lerp(a.x, b.x, kk)); li3.setAttribute('cy', lerp(a.y, b.y, kk));
    }
    on(tb, 'click', function () { frozen = !frozen; render(); });
    steps(fig, [
      { text: 'In a <b>liquid</b> the lithium salt dissolves and the ion moves inside a shell of solvent molecules. Organic solvents dissolve salts less well than water, so ions also pair up, which lowers the conductivity.' },
      { text: 'In a <b>dry polymer</b> such as PEO there is no solvent: the ion is held by the oxygen atoms of the chain and hops from one coordinating site to the next as the chain segments move. Press <b>Cool the polymer</b>: frozen chains, frozen ion. This is why these cells run warm.' },
      { text: 'In a <b>ceramic</b> such as a garnet the framework is rigid and only the ion moves through it, drawn here as hops from site to site; the sources in hand do not describe the mechanism further.' }
    ]);
    drawChains(); render();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.4 });
    tick(0.01); bind(fig, loop);
  });

  /* ===== 7.9 Conductivity against temperature: the orderings of the sources ===== */
  register('f7-9', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), boxes = fig.querySelectorAll('input[type=checkbox]');
    var x0 = 62, x1 = 470, y0 = 236, y1 = 30;
    // x: 1000/T from 2.65 (104 C) to 3.45 (17 C); high temperature on the left, as in Arrhenius plots
    var ix0 = 2.65, ix1 = 3.45, X = function (inv) { return x0 + (inv - ix0) / (ix1 - ix0) * (x1 - x0); };
    var lmin = -9.8, lmax = -2.4, Y = function (l) { return y0 - (l - lmin) / (lmax - lmin) * (y0 - y1); };
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    [100, 80, 60, 40, 20].forEach(function (C) { var inv = 1000 / (C + 273.15); el('line', { x1: X(inv), y1: y0, x2: X(inv), y2: y0 + 5, stroke: 'var(--line-2)' }, g); txt(g, X(inv), y0 + 18, C + ' °C', '', 'middle'); });
    txt(g, x1, y0 + 34, 'temperature (axis linear in 1000/T)', '', 'end');
    txt(g, x0 + 6, y1 - 8, 'log conductivity: each grid line is ×10 (no absolute values)', '', 'start');
    for (var k = 1; k <= 7; k++) el('line', { x1: x0, x2: x1, y1: Y(lmin + k), y2: Y(lmin + k), stroke: 'var(--line)', 'stroke-dasharray': '2 6' }, g);
    // 80 C marker
    var i80 = 1000 / 353.15; el('line', { x1: X(i80), x2: X(i80), y1: y1 + 14, y2: y0, stroke: 'var(--heat)', 'stroke-dasharray': '4 4' }, g);
    txt(g, X(i80) - 4, y0 - 26, 'dry-polymer', 'heat', 'end'); txt(g, X(i80) - 4, y0 - 12, 'cells: 80 °C', 'heat', 'end');
    /* Series: polymer curves bend (chain motion freezes on cooling); only the ratios of R2 are kept:
       PEO-TFSI = 10 x PEO-triflate; plasticized = 10 x PEO-TFSI; gel = liquid / 3.5 (R2: 2 to 5 times). */
    function polymer(inv) { var T = 1000 / inv; return -2.6 - 520 / (T - 200); } // log10 of an illustrative curved form
    function liquid(inv) { var T = 1000 / inv; return -1.9 - 240 / (T - 150); }
    var S = [
      { key: 'liq', name: 'liquid (organic)', col: 'var(--cyan)', f: liquid },
      { key: 'gel', name: 'gel polymer', col: '#9fe3d9', f: function (i) { return liquid(i) - Math.log10(3.5); } },
      { key: 'pla', name: 'plasticized PEO-LiTFSI', col: '#C4B5F7', f: function (i) { return polymer(i) + 1; } },
      { key: 'tfsi', name: 'PEO-LiTFSI', col: 'var(--amber)', f: polymer },
      { key: 'trf', name: 'PEO-LiCF₃SO₃', col: 'var(--heat)', f: function (i) { return polymer(i) - 1; } }
    ];
    S.forEach(function (s) {
      var d = ''; for (var n = 0; n <= 120; n++) { var inv = ix0 + (ix1 - ix0) * n / 120; d += (n ? 'L' : 'M') + X(inv).toFixed(1) + ',' + Y(s.f(inv)).toFixed(1); }
      s.p = el('path', { d: d, fill: 'none', stroke: s.col, 'stroke-width': 2.2 }, g);
    });
    // ratio brackets at 40 C
    var i40 = 1000 / 313.15, br = el('g', {}, g);
    function bracket(fa, fb, lab, dx) { var ya = Y(fa(i40)), yb = Y(fb(i40)), x = X(i40) + dx; el('path', { d: 'M' + (x - 4) + ',' + ya + ' H' + x + ' V' + yb + ' H' + (x - 4), fill: 'none', stroke: 'var(--text)', 'stroke-opacity': '.6' }, br); txt(br, x + 4, (ya + yb) / 2 + 4, lab, 'strong', 'start'); }
    bracket(S[3].f, S[4].f, '×10 salt', 6); bracket(S[2].f, S[3].f, '×10 plasticizer', 6); bracket(S[0].f, S[1].f, '2 to 5×', 6);
    badge(g, X(i40) - 14, Y(S[4].f(i40)) + 14, 1); badge(g, X(i40) - 14, Y(S[2].f(i40)) - 4, 2); badge(g, X(i40) - 14, Y(S[1].f(i40)) + 10, 3); badge(g, X(i80) + 14, y0 - 22, 4);
    function render() {
      var on2 = {}; Array.prototype.forEach.call(boxes, function (b) { on2[b.value] = b.checked; });
      S.forEach(function (s) { var v = on2[s.key] !== false; s.p.style.display = v ? '' : 'none'; });
      read.innerHTML = 'Read the gaps, not the heights: each grid line is a factor of ten. At the same temperature PEO-LiTFSI conducts about ten times better than PEO-LiCF₃SO₃, a plasticized PEO-LiTFSI ten times better again, and a gel 2 to 5 times less than the liquid it holds.';
    }
    Array.prototype.forEach.call(boxes, function (b) { on(b, 'change', render); });
    steps(fig, [
      { text: 'The two lowest curves are dry PEO with two different salts. Changing the salt from LiCF₃SO₃ (triflate) to LiTFSI gains about <b>an order of magnitude</b>.' },
      { text: 'Adding 10 to 25 % of a plasticizer to the polymer gains <b>another order of magnitude</b>: the lilac curve.' },
      { text: 'A <b>gel</b>, 60 to 95 % liquid held in a polymer, comes within <b>2 to 5 times</b> of the liquid itself: the two top curves.' },
      { text: 'The dashed red line: dry-polymer lithium cells need warming, up to about <b>80 °C</b>, to bring the polymer to a useful conductivity.' }
    ]);
    render();
  });

  /* ===== 7.10 Transference number and the salt gradient ===== */
  register('f7-10', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), ts = fig.querySelector('.tplus'), tv = fig.querySelector('.tplus-val');
    var xL = 70, xR = 450, y0 = 60, y1 = 170;
    el('rect', { x: xL - 22, y: y0 - 6, width: 22, height: y1 - y0 + 12, fill: 'var(--metal)' }, g); el('rect', { x: xR, y: y0 - 6, width: 22, height: y1 - y0 + 12, fill: 'var(--amber-2)' }, g);
    el('rect', { x: xL, y: y0, width: xR - xL, height: y1 - y0, fill: 'var(--cyan)', 'fill-opacity': '.08' }, g);
    txt(g, xL - 11, y1 + 26, 'Li⁺ released', '', 'middle'); txt(g, xR + 11, y1 + 26, 'Li⁺ taken in', '', 'middle');
    arrow(g, 220, y0 - 16, 300, y0 - 16, '#C4B5F7', 1.4); txt(g, 260, y0 - 24, 'field in the electrolyte', 'field', 'middle');
    txt(g, 260, y1 + 26, 'electrolyte: Li⁺ and its anion', 'cyan', 'middle');
    var cats = [], ans = [];
    for (var i = 0; i < 14; i++) { cats.push({ x: xL + 10 + Math.random() * (xR - xL - 20), y: y0 + 8 + Math.random() * (y1 - y0 - 16), c: el('circle', { r: 4, 'class': 'ion' }, g) }); ans.push({ x: xL + 10 + Math.random() * (xR - xL - 20), y: y0 + 8 + Math.random() * (y1 - y0 - 16), c: el('circle', { r: 4, 'class': 'ion an' }, g) }); }
    var our = ourIon(g, 0, 0, 5, 'our ion', true); cats[0].our = true; cats[0].c.style.display = 'none';
    // share of the current
    var bx = 110, bw = 300, by = 214;
    var bLi = el('rect', { x: bx, y: by, height: 14, fill: 'var(--cation)' }, g), bAn = el('rect', { y: by, height: 14, fill: 'var(--anion)' }, g);
    var tLi = txt(g, bx, by + 30, '', 'amber', 'start'), tAn = txt(g, bx + bw, by + 30, '', '', 'end');
    txt(g, bx - 8, by + 12, 'current', '', 'end');
    // salt concentration profile, steady state, computed
    var px0 = xL, px1 = xR, py = 300, ph = 50;
    el('line', { x1: px0, x2: px1, y1: py, y2: py, stroke: 'var(--line-2)', 'stroke-dasharray': '3 4' }, g);
    txt(g, px0 - 8, py + 4, 'c₀', '', 'end');
    var prof = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), fillP = el('path', { fill: 'var(--amber)', 'fill-opacity': '.15' }, g);
    var hiT = txt(g, px0 + 4, 0, '', '', 'start'), loT = txt(g, px1 - 4, 0, '', '', 'end');
    txt(g, 260, py + ph + 22, 'salt concentration across the cell, steady state', '', 'middle');
    badge(g, bx + bw + 24, by + 7, 1); badge(g, 30, y0 + 40, 2); badge(g, 490, py - 30, 3);
    var t = 0;
    function tp() { return +ts.value / 100; }
    function render() {
      var T = tp(); setSvgText(tv, T.toFixed(2));
      bLi.setAttribute('width', bw * T); bAn.setAttribute('x', bx + bw * T); bAn.setAttribute('width', bw * (1 - T));
      setSvgText(tLi, 'Li⁺ carries ' + Math.round(T * 100) + ' %'); setSvgText(tAn, 'anion ' + Math.round((1 - T) * 100) + ' %');
      var dc = 0.8 * (1 - T); // Δc/c0 = (1 - t+) i L / (F D c0), with i L / (F D c0) = 0.8 illustrative
      var a = py - ph * dc / 0.8 * 0.9, b = py + ph * dc / 0.8 * 0.9; // high at the left (salt released), low at the right
      prof.setAttribute('d', 'M' + px0 + ',' + a.toFixed(1) + ' L' + px1 + ',' + b.toFixed(1));
      fillP.setAttribute('d', 'M' + px0 + ',' + py + ' L' + px0 + ',' + a.toFixed(1) + ' L' + px1 + ',' + b.toFixed(1) + ' L' + px1 + ',' + py + ' Z');
      hiT.setAttribute('y', a - 6); loT.setAttribute('y', b + 16);
      setSvgText(hiT, dc > 0.02 ? 'salt piles up' : ''); setSvgText(loT, dc > 0.02 ? 'salt runs short' : '');
      read.innerHTML = 'Transference number t₊ = <b>' + T.toFixed(2) + '</b>: lithium carries ' + Math.round(T * 100) + ' % of the current, the anions ' + Math.round((1 - T) * 100) + ' %. In the steady state the salt concentration differs across the cell by Δc = (1 − t₊)·i·L/(F·D), here <b>' + Math.round(100 * dc) + ' %</b> of c₀ end to end for illustrative values of current, thickness and diffusion coefficient.' + (T >= 0.99 ? ' With t₊ = 1 no gradient forms at all.' : '');
    }
    function tick(dt) {
      if (dt === 0) return; t += dt; var T = tp();
      cats.forEach(function (p, j) { p.x += (10 + 40 * T) * dt; p.y += Math.sin(t * 2 + j) * 4 * dt; if (p.x > xR - 6) p.x = xL + 6; p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); if (p.our) our.move(p.x, p.y); });
      ans.forEach(function (p, j) { p.x -= (10 + 40 * (1 - T)) * dt; p.y += Math.cos(t * 2 + j) * 4 * dt; if (p.x < xL + 6) p.x = xR - 6; p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
    }
    on(ts, 'input', render);
    steps(fig, [
      { text: 'Under the field the Li⁺ ions drift one way and the anions the other, and both carry current. The <b>transference number</b> t₊ is the share carried by lithium.' },
      { text: 'Only lithium is made or consumed at the electrodes. The anions arrive at the left electrode and cannot go in, so whatever share of the current they carry has to be <b>made up by diffusion</b>.' },
      { text: 'The result is a salt gradient across the cell, Δc = (1 − t₊)·i·L/(F·D): high where Li⁺ is released, low where it is taken in. Slide t₊ from about 0.3 to about 0.6, the values the sources give for a polymer electrolyte without and with nanofillers, and watch the gradient shrink: a smaller gradient means less <b>concentration polarization</b> (module 5).' }
    ]);
    render();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.4 });
    cats.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); if (p.our) our.move(p.x, p.y); }); ans.forEach(function (p) { p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); });
    bind(fig, loop);
  });

  /* ===== 7.11 Solid against solid: the requirements and the contact ===== */
  register('f7-11', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    // left: the four requirements of R6
    var req = ['ion conductivity above 10⁻⁴ S/cm', 'blocks dendrites, not reduced by Li', 'chemically stable in the cell', 'a robust, flexible thin membrane'];
    txt(g, 24, 30, 'what a solid electrolyte must do', 'strong', 'start');
    req.forEach(function (r, i) { var y = 58 + i * 30; el('rect', { x: 24, y: y - 13, width: 236, height: 22, rx: 5, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g); txt(g, 32, y + 2, (i + 1) + '. ' + r, '', 'start'); });
    txt(g, 24, 186, 'garnet: above 10⁻³ S/cm, stable vs Li', 'cyan', 'start');
    txt(g, 24, 202, '2013: try ceramic-polymer composites', 'amber', 'start');
    badge(g, 272, 58, 1); badge(g, 272, 190, 2);
    // right: a particle breathing against a rigid solid electrolyte
    var cx = 390, cy = 120, R0 = 46;
    el('rect', { x: 290, y: 30, width: 200, height: 180, rx: 6, fill: 'var(--metal)', 'fill-opacity': '.25', stroke: 'var(--line-2)' }, g);
    txt(g, 390, 24, 'rigid solid electrolyte', 'strong', 'middle');
    var hole = el('circle', { cx: cx, cy: cy, r: R0 + 4, fill: 'var(--bg-2)', stroke: 'var(--line-2)' }, g);
    var part = el('circle', { cx: cx, cy: cy, r: R0, fill: 'var(--amber-2)', 'fill-opacity': '.85' }, g);
    txt(g, cx, cy + 4, 'electrode particle', 'strong', 'middle');
    var gapT = txt(g, 390, 232, '', 'heat', 'middle'), stage = txt(g, 390, 250, '', '', 'middle');
    var path = el('g', {}, g);
    badge(g, 300, 222, 3);
    var t = 0, cyc = 0, holeR = R0 + 4;
    function draw() {
      var s = Math.sin(t * 1.2), r = R0 + 4 * s; // swells on one half-cycle, shrinks on the other
      if (r > holeR) holeR = r; // the rigid hole is pushed out (wears) but never closes back
      part.setAttribute('r', r); hole.setAttribute('r', holeR);
      var gap = holeR - r; clear(path);
      [0, 1, 2, 3, 4, 5].forEach(function (k) { var a = k * Math.PI / 3, x0 = cx + Math.cos(a) * (holeR + 18), y0 = cy + Math.sin(a) * (holeR + 18), x1 = cx + Math.cos(a) * (r + 1), y1 = cy + Math.sin(a) * (r + 1); el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: gap > 2.5 ? 'var(--heat)' : 'var(--cation)', 'stroke-width': 2, 'stroke-dasharray': gap > 2.5 ? '3 3' : '' }, path); });
      setSvgText(gapT, gap > 2.5 ? 'gap: the ion path is broken here' : 'in contact: ions can cross'); gapT.setAttribute('class', 'lbl ' + (gap > 2.5 ? 'heat' : 'amber'));
      setSvgText(stage, s > 0 ? 'lithiated: the particle swells' : 'delithiated: it shrinks back');
      read.innerHTML = gap > 2.5 ? 'The particle has shrunk back but the rigid electrolyte around it has not followed: the contact is lost over part of the surface, and with it the path for the ions.' : 'Particle and electrolyte touch all round, so ions can cross the boundary everywhere.';
    }
    steps(fig, [
      { text: 'Goodenough and Park list <b>four requirements</b> for a solid electrolyte: an ion conductivity above 10⁻⁴ S/cm; blocking dendrites without being reduced by lithium; chemical stability; and a robust, flexible thin membrane.' },
      { text: 'Some ceramics pass the first two: a garnet conducts above 10⁻³ S/cm and is stable against lithium. Their 2013 suggestion for meeting all four at once: <b>ceramic-polymer composites</b>.' },
      { text: 'The interface is the other problem. Electrode particles change volume as lithium goes in and out; against a <b>rigid</b> solid electrolyte, contact is lost and the ion path breaks. Press Play and watch the gap open.' }
    ]);
    draw();
    var loop = anim(fig, function (dt) { if (dt === 0) return; t += dt; draw(); }, { autoplay: true, stepDt: 0.5, onPlay: function () { } });
    if (!motion) { t = 4.0; holeR = R0 + 4.2; draw(); }
    bind(fig, loop);
  });
