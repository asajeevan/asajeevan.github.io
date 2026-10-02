  /* =================================================================
     Module 8: electrodes are composites. Composite and porosity after
     Winter and Brodd 2004 (R1) 1.6; current distribution after R1 1.6
     and Fig. 9B, computed from Ohm's law in each phase with linearized
     kinetics (Bard, Faulkner and White, R_ct) and the cosh profile of
     Pathak and Bazant 2026 (R41); the poor conductor after R1 2.4 and
     Fig. 15E; carbon coating and nanosizing after Goodenough and Park
     2013 (R6) and Tarascon and Armand 2001 (R2).
     ================================================================= */

  /* ===== 8.1 Two roads to every particle (connectivity computed) ===== */
  register('f8-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), bC = fig.querySelector('.cut-carbon'), bP = fig.querySelector('.block-pores'), bR = fig.querySelector('.reset');
    var xc = 40, xs = 470, top = 40, bot = 250, cols = 5, rows = 4;
    el('rect', { x: xc - 14, y: top - 6, width: 14, height: bot - top + 12, fill: 'var(--metal)' }, g); txt(g, xc - 7, bot + 24, 'Al foil', 'strong', 'middle');
    el('rect', { x: xs, y: top - 6, width: 26, height: bot - top + 12, fill: 'var(--cyan)', 'fill-opacity': '.25', stroke: 'var(--cyan)', 'stroke-opacity': '.5' }, g); txt(g, xs + 13, bot + 24, 'separator', 'cyan', 'middle');
    var pore = el('rect', { x: xc, y: top - 6, width: xs - xc, height: bot - top + 12, fill: 'var(--cyan)', 'fill-opacity': '.12' }, g);
    txt(g, (xc + xs) / 2, top - 16, 'one coating, about 30 % of it pores filled with electrolyte', '', 'middle');
    var P = [], dx = (xs - xc - 40) / (cols - 1), dy = (bot - top - 40) / (rows - 1);
    for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) P.push({ c: c, r: r, x: xc + 22 + c * dx + (r % 2 ? 10 : -6), y: top + 20 + r * dy + (c % 2 ? 6 : -4), R: 15 + ((c * 7 + r * 3) % 5) });
    // carbon links: each particle to its neighbours and the first column to the foil
    var links = [];
    P.forEach(function (a, i) { P.forEach(function (b, j) { if (j > i && Math.abs(a.c - b.c) + Math.abs(a.r - b.r) === 1) links.push({ a: i, b: j }); }); if (a.c === 0) links.push({ a: i, b: -1 }); });
    var lg = el('g', {}, g);
    links.forEach(function (L) { var a = P[L.a], bx = L.b < 0 ? xc : P[L.b].x, by = L.b < 0 ? a.y : P[L.b].y; L.e = el('line', { x1: a.x, y1: a.y, x2: bx, y2: by, stroke: 'var(--cyan)', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-opacity': '.9' }, lg); L.on = true; });
    // ion access: each particle has a pore route to the separator unless blocked
    P.forEach(function (p) { p.wet = true; p.e = el('circle', { cx: p.x, cy: p.y, r: p.R, 'class': 'ptc' }, g); p.mk = el('text', { x: p.x, y: p.y + 4, 'text-anchor': 'middle', 'class': 'lbl strong' }, g); });
    var info = txt(g, (xc + xs) / 2, bot + 24, '', 'amber', 'middle');
    badge(g, xc - 7, top - 18, 1); badge(g, xs + 13, top - 18, 2); badge(g, (xc + xs) / 2 + 150, bot + 18, 3);
    function solve() {
      // electrons: breadth-first from the foil along intact carbon links
      var reach = P.map(function () { return false; }), q = [];
      links.forEach(function (L) { if (L.on && L.b < 0) { reach[L.a] = true; q.push(L.a); } });
      while (q.length) { var i = q.shift(); links.forEach(function (L) { if (!L.on || L.b < 0) return; var j = L.a === i ? L.b : L.b === i ? L.a : -1; if (j >= 0 && !reach[j]) { reach[j] = true; q.push(j); } }); }
      var n = 0;
      P.forEach(function (p, i) { p.ok = reach[i] && p.wet; if (p.ok) n++; p.e.setAttribute('class', 'ptc ' + (p.ok ? 'on' : 'dead')); setSvgText(p.mk, p.ok ? '' : (!reach[i] && !p.wet ? 'e⁻, Li⁺' : !reach[i] ? 'no e⁻' : 'no Li⁺')); });
      return n;
    }
    function render() {
      var n = solve();
      setSvgText(info, n + ' of ' + P.length + ' particles can work');
      read.innerHTML = 'A particle works only if <b>electrons</b> can reach it through the carbon network from the foil and <b>ions</b> can reach it through electrolyte-filled pores from the separator. Here <b>' + n + ' of ' + P.length + '</b> can; the rest are dead weight, mass and volume that store nothing.';
    }
    var rng = 7;
    function rand() { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; }
    on(bC, 'click', function () { var live = links.filter(function (L) { return L.on; }); for (var k = 0; k < 4 && live.length; k++) { var L = live.splice((rand() * live.length) | 0, 1)[0]; L.on = false; L.e.setAttribute('stroke-opacity', '.12'); L.e.setAttribute('stroke-dasharray', '2 4'); } render(); });
    on(bP, 'click', function () { var wet = P.filter(function (p) { return p.wet; }); for (var k = 0; k < 2 && wet.length; k++) { var p = wet.splice((rand() * wet.length) | 0, 1)[0]; p.wet = false; } render(); });
    on(bR, 'click', function () { links.forEach(function (L) { L.on = true; L.e.setAttribute('stroke-opacity', '.9'); L.e.removeAttribute('stroke-dasharray'); }); P.forEach(function (p) { p.wet = true; }); render(); });
    steps(fig, [
      { text: 'The <b>electron road</b>: a network of conductive carbon (teal) touching every particle and running back to the aluminium foil. Press <b>Break carbon contacts</b> a few times.' },
      { text: 'The <b>ion road</b>: the pores between particles are filled with electrolyte that connects to the separator. Press <b>Seal some pores</b>: a particle walled off by binder gets no ions.' },
      { text: 'A particle stores lithium only where <b>both roads arrive</b>. Every dark particle is mass and volume that the cell carries for nothing. The count is computed from the network you have left.' }
    ]);
    render();
  });

  /* ===== 8.2 Where does the current go? ===== */
  register('f8-2', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), rs = fig.querySelector('.ratio'), rv = fig.querySelector('.ratio-val'), ns = fig.querySelector('.nu'), nv = fig.querySelector('.nu-val');
    var x0 = 70, x1 = 460, y0 = 270, y1 = 130;
    // the electrode strip, shaded by the local reaction rate
    var cells = [], N = 40, sy = 46, sh = 50;
    el('rect', { x: x0 - 16, y: sy - 4, width: 14, height: sh + 8, fill: 'var(--metal)' }, g); txt(g, x0 - 9, sy - 10, 'collector', '', 'middle');
    el('rect', { x: x1 + 2, y: sy - 4, width: 14, height: sh + 8, fill: 'var(--cyan)', 'fill-opacity': '.3' }, g); txt(g, x1 + 9, sy - 10, 'separator', 'cyan', 'middle');
    for (var i = 0; i < N; i++) cells.push(el('rect', { x: x0 + i * (x1 - x0) / N, y: sy, width: (x1 - x0) / N + 0.5, height: sh, fill: 'var(--amber)' }, g));
    txt(g, (x0 + x1) / 2, sy + sh + 16, 'brighter = more of the reaction happens there', '', 'middle');
    // the profile plot
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    txt(g, x0, y0 + 16, 'collector', '', 'middle'); txt(g, x1, y0 + 16, 'separator', '', 'middle'); txt(g, (x0 + x1) / 2, y0 + 16, 'position across the electrode', '', 'middle');
    txt(g, x0 - 6, y1 + 4, 'local', '', 'end'); txt(g, x0 - 6, y1 + 20, 'rate', '', 'end');
    var avg = el('line', { x1: x0, x2: x1, stroke: 'var(--muted)', 'stroke-dasharray': '4 4' }, g), avgT = txt(g, x1 - 4, 0, 'uniform', '', 'end');
    var prof = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    badge(g, 30, sy + sh / 2, 1); badge(g, 490, y1 + 10, 2);
    function render() {
      var lr = +rs.value / 50 - 2, ratio = Math.pow(10, lr), nu = +ns.value / 10; // ratio = sigma/kappa (matrix over electrolyte)
      setSvgText(rv, ratio >= 1 ? '×' + (ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)) : '÷' + (1 / ratio < 10 ? (1 / ratio).toFixed(1) : Math.round(1 / ratio))); setSvgText(nv, nu.toFixed(1));
      // local rate j ~ (1/kappa) cosh(nu xi) + (1/sigma) cosh(nu (1 - xi)), xi measured from the collector;
      // multiplied by kappa: cosh(nu xi) + (kappa/sigma) cosh(nu (1 - xi)). nu = thickness / reaction depth.
      var f = function (xi) { return Math.cosh(nu * xi) + (1 / ratio) * Math.cosh(nu * (1 - xi)); };
      var pts = [], mean = 0; for (var k = 0; k <= 100; k++) { var v = f(k / 100); pts.push(v); mean += v / 101; }
      var mx = 0; pts = pts.map(function (v) { v /= mean; mx = Math.max(mx, v); return v; });
      var top = Math.max(2, Math.ceil(mx)), Y = function (v) { return y0 - v / top * (y0 - y1); };
      prof.setAttribute('d', pts.map(function (v, k) { return (k ? 'L' : 'M') + (x0 + k / 100 * (x1 - x0)).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' '));
      avg.setAttribute('y1', Y(1)); avg.setAttribute('y2', Y(1)); avgT.setAttribute('y', Y(1) - 5);
      cells.forEach(function (cEl, i) { var v = f((i + 0.5) / N) / mean; cEl.setAttribute('fill-opacity', String(Math.min(1, 0.08 + 0.6 * v / Math.max(1.4, mx)))); });
      var where = ratio > 1.2 ? 'next to the separator, where the ions arrive' : ratio < 0.83 ? 'next to the collector, where the electrons arrive' : 'at both faces, less in the middle';
      read.innerHTML = 'Matrix conductivity ' + (ratio >= 1 ? ratio.toFixed(ratio < 10 ? 1 : 0) + ' times higher than' : (1 / ratio).toFixed(1 / ratio < 10 ? 1 : 0) + ' times lower than') + ' the effective electrolyte conductivity; electrode ' + nu.toFixed(1) + ' reaction depths thick. The reaction crowds <b>' + (nu < 0.6 ? 'nowhere: it is almost uniform' : where) + '</b>; the busiest slice works ' + mx.toFixed(1) + ' times harder than the average.';
    }
    on(rs, 'input', render); on(ns, 'input', render);
    steps(fig, [
      { text: 'The strip is one electrode, from the current collector on the left to the separator on the right. Electrons come in from the left through the solid, ions from the right through the electrolyte in the pores. Where does the reaction happen?' },
      { text: 'Wherever the path is cheapest. If the solid conducts far better than the electrolyte, the reaction crowds next to the <b>separator</b>; if the electrolyte is the better conductor, next to the <b>collector</b>. Make the electrode thick compared with its reaction depth and the crowding gets worse: the far side of the coating does little.' }
    ]);
    render();
  });

  /* ===== 8.3 A poor conductor needs carbon ===== */
  register('f8-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), mb = fig.querySelectorAll('button[data-carbon]');
    var parts = [{ x: 130, label: 'one carbon contact' }, { x: 390, label: '' }];
    var R = 70, cy = 120, mode = 'dot', k = 0;
    var defs = svg.querySelector('defs') || el('defs', {}, svg);
    parts.forEach(function (p, i) {
      var id = 'f83c' + i + Math.random().toString(36).slice(2, 6), cp = el('clipPath', { id: id }, defs); el('circle', { cx: p.x, cy: cy, r: R }, cp);
      el('circle', { cx: p.x, cy: cy, r: R, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
      p.lit = el('circle', { cx: i === 0 ? p.x - R : p.x, cy: cy, r: 0, fill: 'var(--amber)', 'fill-opacity': '.85', 'clip-path': 'url(#' + id + ')' }, g);
    });
    // left: one carbon particle touching at the left edge
    el('circle', { cx: 130 - R - 12, cy: cy, r: 14, fill: 'var(--cyan)' }, g); txt(g, 130 - R - 12, cy + 34, 'carbon', 'cyan', 'middle');
    // right: a carbon coating or nothing
    var coat = el('circle', { cx: 390, cy: cy, r: R + 4, fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 6 }, g);
    var tR = txt(g, 390, cy + R + 28, '', 'cyan', 'middle'), tL = txt(g, 130, cy + R + 28, 'carbon at one point', 'cyan', 'middle');
    var pct = [txt(g, 130, cy + 4, '', 'strong', 'middle'), txt(g, 390, cy + 4, '', 'strong', 'middle')];
    badge(g, 130 - R - 12, cy - 26, 1); badge(g, 390 + R + 18, cy - R + 4, 2);
    function render() {
      Array.prototype.forEach.call(mb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-carbon') === mode)); });
      coat.style.display = mode === 'coat' ? '' : 'none'; setSvgText(tR, mode === 'coat' ? 'carbon coating all round' : 'no carbon at all');
      var rL = 2 * R * k, rR = mode === 'coat' ? R * k : 0;
      parts[0].lit.setAttribute('r', rL); parts[1].lit.setAttribute('r', mode === 'coat' ? R : 0);
      if (mode === 'coat') { parts[1].lit.setAttribute('r', R); parts[1].lit.setAttribute('fill-opacity', String(0.15 + 0.7 * Math.min(1, 2 * k))); }
      setSvgText(pct[0], k > 0.02 ? 'reacting' : ''); setSvgText(pct[1], mode === 'coat' ? (k > 0.02 ? 'reacting everywhere' : '') : 'dark');
      read.innerHTML = 'Left: the active material conducts electrons poorly, so it reacts first where it touches the carbon and the reacted zone spreads inward from there. Right: ' + (mode === 'coat' ? 'with a carbon coating every point of the surface is a contact, so the whole particle reacts at once.' : 'with no carbon contact at all, nothing happens: no electrons, no reaction.');
    }
    Array.prototype.forEach.call(mb, function (b) { on(b, 'click', function () { mode = b.getAttribute('data-carbon'); k = 0; render(); }); });
    steps(fig, [
      { text: 'A poorly conducting active material, such as the MnO₂ of an alkaline cell, can only take electrons where it touches the <b>carbon</b>. The reaction starts at that point and spreads from it.' },
      { text: 'LiFePO₄ is also a poor electronic conductor; making it work took a <b>carbon coating</b> and small particles. Switch between the two right-hand particles: no carbon, or carbon all round.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; k += dt / 6; if (k > 1.15) k = 0; render(); }, { autoplay: true, stepDt: 0.6 });
    if (!motion) k = 0.5;
    render(); bind(fig, loop);
  });

  /* ===== 8.4 The nanoparticle trade-off ===== */
  register('f8-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), ss = fig.querySelector('.size'), sv = fig.querySelector('.size-val');
    var bx = 40, by = 40, bw = 200, bh = 170, gx = 280;
    el('rect', { x: bx, y: by, width: bw, height: bh, rx: 6, fill: 'none', stroke: 'var(--line-2)' }, g);
    var box2 = el('rect', { x: gx, y: by, width: bw, height: bh, rx: 6, fill: 'none', stroke: 'var(--line-2)' }, g);
    txt(g, bx + bw / 2, by - 12, 'large particles', 'strong', 'middle'); var t2 = txt(g, gx + bw / 2, by - 12, '', 'strong', 'middle');
    var gL = el('g', {}, g), gS = el('g', {}, g);
    // large: 4 particles of radius 32 packed in the left box
    [[90, 95], [180, 95], [90, 170], [180, 170]].forEach(function (p) { el('circle', { cx: p[0], cy: p[1], r: 34, fill: 'var(--amber-2)', 'fill-opacity': '.85' }, gL); });
    // bars: volume needed (tap density) and time to empty a particle (L^2/2D)
    var barY = 250, bt = [txt(g, 40, barY - 6, 'time for an ion to cross a particle, t ∝ L²', '', 'start'), txt(g, 40, barY + 42, 'volume the same mass of powder takes up', '', 'start')];
    var b1 = el('rect', { x: 40, y: barY, width: 0, height: 12, fill: 'var(--cyan)' }, g), b2 = el('rect', { x: 40, y: barY + 48, width: 0, height: 12, fill: 'var(--amber)' }, g);
    var r1 = el('rect', { x: 40, y: barY, width: 300, height: 12, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '2 3' }, g);
    el('rect', { x: 40, y: barY + 48, width: 150, height: 12, fill: 'none', stroke: 'var(--line-2)', 'stroke-dasharray': '2 3' }, g);
    var v1 = txt(g, 350, barY + 11, '', 'cyan', 'start'), v2 = txt(g, 350, barY + 59, '', 'amber', 'start');
    badge(g, 500, barY + 6, 1); badge(g, 500, barY + 54, 2);
    function render() {
      var f = +ss.value / 100; // size relative to the large particles, 0.1 .. 1
      var kf = 1 / f, ks = Math.abs(kf - Math.round(kf)) < 0.05 ? String(Math.round(kf)) : kf.toFixed(1), kt = kf * kf, kts = kt.toFixed(kt < 10 ? 1 : 0);
      setSvgText(sv, f >= 0.999 ? 'same' : '1/' + ks); setSvgText(t2, f >= 0.999 ? 'same size, coated' : 'particles ' + ks + ' times smaller, coated');
      clear(gS);
      var r = 34 * f;
      // the same mass in more, smaller, coated particles: drawn as a packed region that grows with the coating share (schematic)
      var boxH = bh * (0.55 + 0.45 * Math.min(1, (1 - f) * 1.2));
      el('rect', { x: gx + 6, y: by + bh - boxH + 6, width: bw - 12, height: boxH - 12, rx: 4, fill: 'var(--panel-2)' }, gS);
      var rr = Math.max(3, r), step = 2 * rr + 3 + 2 * Math.max(1, 3 * f), top0 = by + bh - boxH + 6 + rr + 2;
      for (var yy = by + bh - 8 - rr; yy >= top0 - 0.1; yy -= step) for (var xx = gx + 10 + rr; xx <= gx + bw - 10 - rr; xx += step) el('circle', { cx: xx, cy: yy, r: rr, fill: 'var(--amber-2)', 'fill-opacity': '.85', stroke: 'var(--cyan)', 'stroke-width': Math.max(1, 3 * f) }, gS);
      var tRel = f * f, vRel = (boxH / bh) / 0.55;
      b1.setAttribute('width', 300 * tRel); b2.setAttribute('width', Math.min(300, 300 * vRel / 2));
      setSvgText(v1, f >= 0.999 ? '1 (reference)' : '÷' + kts); setSvgText(v2, 'more: lower tap density');
      read.innerHTML = (f >= 0.999 ? 'Particles of the same size, coated, empty in the same time' : 'Particles ' + ks + ' times smaller empty about <b>' + kts + ' times faster</b>') + ' (t ≈ L²/2D), and a coating gives every one an electron contact. The price: the coated powder packs less densely, so the same mass of active material takes more room, and the energy per litre falls. How much more room is not a number the sources give; the lower bar is schematic.';
    }
    on(ss, 'input', render);
    steps(fig, [
      { text: 'Smaller particles: the ion has less far to go. The time to cross a particle scales with the <b>square</b> of its size, so a tenth of the size is about a hundredth of the time.' },
      { text: 'The cost: small, coated particles pack poorly, so the powder has a lower <b>tap density</b> and the electrode stores less energy per litre. Coating every particle evenly also gets harder as they shrink.' }
    ]);
    render();
  });

  /* ===== 8.5 How an electrode, and a cell, is made (after Fichtner et al. 2022, section 5.3) ===== */
  register('f8-5', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var st = [
      { t: 'mix', s: 'slurry', d: 'Active material (about 90 % of the dry mass), conductive carbon and a polymer binder are dispersed in a liquid to make a slurry: water for graphite, the organic solvent NMP for most positive electrodes. NMP is toxic to reproduction, and because it is costly and polluting it is recovered during drying; water-based and solvent-free routes are being developed.' },
      { t: 'coat', s: 'on foil', d: 'The slurry is spread in a thin, even layer on a metal foil, the current collector, in a roll-to-roll process.' },
      { t: 'dry', s: 'pores', d: 'As the solvent evaporates, a porous solid layer is left; drying under vacuum can take 12 to 24 hours at 120 °C, and the evaporated NMP is captured.' },
      { t: 'press', s: 'calender', d: 'The dried electrode is pressed between rollers (calendering) to make its thickness uniform, improve its electronic conductivity and raise its energy density, at the cost of some porosity.' },
      { t: 'cut', s: 'stack, wind', d: 'The rolls are slit and cut; strips are wound with a porous separator into a jelly roll for cylindrical and pouch cells; in pouch cells the electrodes can instead be Z-folded from a continuous sheet or cut into sheets and stacked, and the uncoated tabs are welded together.' },
      { t: 'fill', s: 'liquid in', d: 'The stack goes into its can or pouch, and the electrolyte is injected; a pouch keeps a spare gas bag.' },
      { t: 'form', s: '1st cycles', d: 'Formation: the cell is cycled under precisely defined conditions, for up to a day, to build the SEI (module 6); the gas it gives off is let out or cut off with the gas bag.' },
      { t: 'test', s: 'and wait', d: 'Capacity and resistance are measured, and the cell is stored for several days at open circuit to catch any that self-discharge too fast.' }
    ];
    var n = st.length, w = 56, gap = (520 - 24 - n * w) / (n - 1), y = 70;
    var boxes = st.map(function (s, i) {
      var x = 12 + i * (w + gap);
      var r = el('rect', { x: x, y: y, width: w, height: 56, rx: 8, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, g);
      txt(g, x + w / 2, y + 25, s.t, 'strong', 'middle'); txt(g, x + w / 2, y + 41, s.s, '', 'middle');
      if (i < n - 1) arrow(g, x + w + 1, y + 28, x + w + gap - 2, y + 28, '#A3B6B1', 1.2);
      badge(g, x + w / 2, y - 18, i + 1);
      return r;
    });
    txt(g, 12, 34, 'electrode making', 'amber', 'start'); txt(g, 12 + 4 * (w + gap), 34, 'cell assembly', 'cyan', 'start'); txt(g, 12 + 6 * (w + gap), 34, 'cell finishing', 'heat', 'start');
    var token = el('circle', { r: 6, fill: 'var(--amber)' }, g), t = 0;
    var lab = txt(g, 260, 170, '', 'strong', 'middle');
    function show(k) { boxes.forEach(function (b, i) { b.setAttribute('stroke', i === k ? 'var(--amber)' : 'var(--line-2)'); b.setAttribute('stroke-width', i === k ? 2.2 : 1); }); setSvgText(lab, 'step ' + (k + 1) + ' of ' + n + ': ' + st[k].t + ' (' + st[k].s + ')'); }
    var S = steps(fig, st.map(function (s, i) { return { text: s.d, on: function () { show(i); } }; }));
    var loop = anim(fig, function (dt) { if (dt === 0) return; t = (t + dt / 16) % 1; var u = t * (n - 1), i = Math.floor(u), f = u - i; token.setAttribute('cx', 12 + w / 2 + (i + f) * (w + gap)); token.setAttribute('cy', y + 72); var k = Math.min(n - 1, Math.round(u)); if (S.k !== k) S.go(k); }, { autoplay: false, stepDt: 0.5 });
    token.setAttribute('cx', 12 + w / 2); token.setAttribute('cy', y + 72);
    read.innerHTML = 'The process chain of a lithium-ion cell, in three stages: making the electrodes, assembling the cell, and finishing it. The same chain applies, with variations, to most battery chemistries.';
    bind(fig, loop);
  });
