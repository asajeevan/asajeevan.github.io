  /* =================================================================
     Module 10: why batteries age. Loss categories after Goodenough and
     Park 2013 (R6) and Tarascon and Armand 2001 (R2); SEI growth regimes
     after von Kolzenberg, Latz and Horstmann 2020 (R37) eqs. 36 and 37;
     manganese dissolution after R6; self-discharge after Winter and
     Brodd 2004 (R1) 2.6. Curves are schematic unless stated.
     ================================================================= */

  /* ===== 10.1 Capacity fade, taken apart ===== */
  register('f10-1', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), boxes = fig.querySelectorAll('input[type=checkbox]'), slow = fig.querySelector('.slow');
    var x0 = 62, x1 = 470, y0 = 236, y1 = 36, N = 1000;
    var X = function (n) { return x0 + n / N * (x1 - x0); }, Y = function (q) { return y0 - (q - 0.7) / 0.3 * (y0 - y1); };
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    [0.7, 0.8, 0.9, 1].forEach(function (q) { el('line', { x1: x0, x2: x1, y1: Y(q), y2: Y(q), stroke: q === 0.8 ? 'var(--amber)' : 'var(--line)', 'stroke-dasharray': q === 0.8 ? '5 4' : '2 5' }, g); txt(g, x0 - 6, Y(q) + 4, Math.round(q * 100) + ' %', '', 'end'); });
    txt(g, x0 + 6, Y(0.8) + 16, '80 %: end of cycle life', 'amber', 'start');
    [0, 250, 500, 750, 1000].forEach(function (n) { el('line', { x1: X(n), x2: X(n), y1: y0, y2: y0 + 5, stroke: 'var(--line-2)' }, g); txt(g, X(n), y0 + 18, n, '', 'middle'); });
    txt(g, x1, y0 + 34, 'cycle number (schematic)', '', 'end'); txt(g, x0 - 6, y1 - 14, 'capacity measured', '', 'start');
    var parts = [
      { key: 'li', name: 'lithium lost to the SEI', col: 'var(--anion)', f: function (n) { return 0.10 * Math.sqrt(n / N); } },
      { key: 'am', name: 'active material lost', col: 'var(--heat)', f: function (n) { return 0.08 * n / N; } },
      { key: 'r', name: 'hidden by resistance', col: '#C4B5F7', f: function (n) { return 0.07 * Math.pow(n / N, 1.3); } }
    ];
    var areas = parts.map(function (p) { return el('path', { fill: p.col, 'fill-opacity': '.45' }, g); }), line = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g);
    var bdg = [badge(g, 0, 0, 1), badge(g, 0, 0, 2), badge(g, 0, 0, 3)], at = [30, 60, 90];
    function render() {
      var on2 = {}; Array.prototype.forEach.call(boxes, function (b) { on2[b.value] = b.checked; });
      var lowRate = slow.getAttribute('aria-pressed') === 'true';
      var use = parts.filter(function (p) { return on2[p.key] !== false && !(lowRate && p.key === 'r'); });
      var base = []; for (var n = 0; n <= N; n += 10) base.push(1);
      parts.forEach(function (p, k) {
        var show = use.indexOf(p) >= 0, top = base.slice(), d = '';
        if (show) { for (var i = 0; i < base.length; i++) base[i] -= p.f(i * 10); }
        for (i = 0; i < top.length; i++) d += (i ? 'L' : 'M') + X(i * 10).toFixed(1) + ',' + Y(top[i]).toFixed(1);
        for (i = base.length - 1; i >= 0; i--) d += 'L' + X(i * 10).toFixed(1) + ',' + Y(base[i]).toFixed(1);
        areas[k].setAttribute('d', show ? d + 'Z' : '');
        var j = at[k]; bdg[k].setAttribute('transform', 'translate(' + X(j * 10) + ',' + Y((top[j] + base[j]) / 2) + ')'); bdg[k].style.display = show ? '' : 'none';
      });
      line.setAttribute('d', base.map(function (q, i) { return (i ? 'L' : 'M') + X(i * 10).toFixed(1) + ',' + Y(q).toFixed(1); }).join(' '));
      var end = base[base.length - 1], n80 = null; for (var i = 0; i < base.length; i++) if (base[i] < 0.8) { n80 = i * 10; break; }
      read.innerHTML = 'After 1000 schematic cycles the cell delivers <b>' + Math.round(end * 100) + ' %</b> of its first capacity' + (n80 ? ', and crossed the 80 % end-of-life line at about cycle ' + n80 : '') + '. ' + (lowRate ? 'Measured at a low rate, the part hidden by resistance comes back: that part was not lost, only out of reach.' : 'Press <b>Measure at a low rate</b> to see which part comes back.');
    }
    Array.prototype.forEach.call(boxes, function (b) { on(b, 'change', render); });
    on(slow, 'click', function () { slow.setAttribute('aria-pressed', String(slow.getAttribute('aria-pressed') !== 'true')); render(); });
    steps(fig, [
      { text: 'Grey: <b>lithium lost</b> to side reactions, above all to the SEI, which keeps growing after the first charge. Each lithium it locks up is one fewer to rock between the electrodes. Drawn following the square-root law of figure 10.2.' },
      { text: 'Red: <b>active material lost</b>: particles that crack and lose contact, as in figure 9.2, or that dissolve, as in figure 10.3. The lithium may still be there, but there is less room to store it.' },
      { text: 'Lilac: capacity <b>hidden by resistance</b>. As interfaces thicken and contacts loosen, the voltage under current hits the cut-off sooner (figure 5.3). Measure at a low rate and this part comes back; the other two do not.' }
    ]);
    render();
  });

  /* ===== 10.2 The SEI keeps growing ===== */
  register('f10-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), rb = fig.querySelectorAll('button[data-b]');
    var x0 = 220, x1 = 480, y0 = 210, y1 = 40, b = 0.5, t = 1;
    var X = function (tt) { return x0 + tt * (x1 - x0); }, Y = function (L) { return y0 - L * (y0 - y1); };
    // both laws anchored to the same loss after the first month (t = 1/12 of the axis); b = 1 reaches 0.85 at the end
    var T1 = 1 / 12, A1 = 0.85 / 12; function LL(bb, tt) { return bb === 0 ? A1 : A1 * Math.pow(Math.max(tt, 1e-6) / T1, bb); }
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    txt(g, x1, y0 + 18, 'time (or charge passed), schematic', '', 'end'); txt(g, x0 - 6, y1 - 10, 'SEI thickness, lithium lost', '', 'start');
    var refs = [0.5, 1, 0].map(function (bb) { var d = ''; for (var i = 0; i <= 100; i++) { var tt = i / 100; d += (i ? 'L' : 'M') + X(tt).toFixed(1) + ',' + Y(0.08 + LL(bb, tt)).toFixed(1); } return el('path', { d: d, fill: 'none', stroke: 'var(--muted)', 'stroke-opacity': '.35', 'stroke-dasharray': '3 4' }, g); });
    var curve = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.6 }, g), dot = el('circle', { r: 5, fill: 'var(--amber)' }, g);
    var bl = txt(g, x1 - 4, 0, '', 'amber', 'end');
    // cartoon: graphite with a thickening SEI, lithium counter and resistance bar
    var gx = 30, gy = 50;
    for (var i = 0; i < 7; i++) el('line', { x1: gx, x2: gx + 60, y1: gy + 10 + i * 20, y2: gy + 10 + i * 20, stroke: 'var(--text)', 'stroke-opacity': '.5', 'stroke-width': 2 }, g);
    txt(g, gx + 30, gy - 10, 'graphite', 'strong', 'middle');
    var sei = el('rect', { x: gx + 62, y: gy, width: 4, height: 150, fill: 'var(--anion)', 'fill-opacity': '.8' }, g);
    txt(g, gx + 100, gy - 10, 'SEI', '', 'middle');
    var rbar = el('rect', { x: gx, y: 226, width: 0, height: 10, fill: '#C4B5F7' }, g); txt(g, gx, 250, 'interfacial resistance', '', 'start');
    badge(g, x0 + 30, y1 + 6, 1); badge(g, gx + 140, gy + 70, 2);
    function L(tt) { return LL(b, tt); }
    function render() {
      Array.prototype.forEach.call(rb, function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-b') === b)); });
      var d = ''; for (var i = 0; i <= 100; i++) { var tt = i / 100 * t; d += (i ? 'L' : 'M') + X(tt).toFixed(1) + ',' + Y(0.08 + L(tt)).toFixed(1); }
      curve.setAttribute('d', d); dot.setAttribute('cx', X(t)); dot.setAttribute('cy', Y(0.08 + L(t)));
      bl.setAttribute('y', Y(0.08 + L(1)) - 8); setSvgText(bl, b === 0.5 ? 'L ∝ t^{1/2}' : b === 1 ? 'L ∝ t' : 'L constant');
      var th = 4 + 30 * (0.08 + L(t)); sei.setAttribute('width', th);
      rbar.setAttribute('width', 6 + 150 * L(t));
      read.innerHTML = (b === 0.5 ? 'Diffusion-limited growth, L ∝ t<sup>1/2</sup>: the layer slows its own growth, because what feeds it has to diffuse through it. This is the standard assumption in the literature.' : b === 1 ? 'Growth limited by the reaction itself, or by migration while charging: L ∝ t, no slowing down.' : 'Limited by migration while discharging: the layer does not grow, b = 0.') + ' Lost capacity follows the same law, ΔQ ∝ t<sup>b</sup>, and the growth is fastest at a high state of charge and a high charging rate.';
    }
    Array.prototype.forEach.call(rb, function (x) { on(x, 'click', function () { b = +x.getAttribute('data-b'); render(); }); });
    steps(fig, [
      { text: 'The SEI that formed on the first charge (module 6) does not stop growing. Its thickness follows a power law, L ∝ t<sup>b</sup>, and the exponent tells you what limits it: <b>b = 1/2</b> when diffusion through the layer is the bottleneck, <b>b = 1</b> when the reaction or migration during charging is, <b>b = 0</b> for migration during discharge.' },
      { text: 'Every bit of new SEI locks up lithium and thickens the layer the ions must cross: the capacity falls, ΔQ ∝ t<sup>b</sup>, and the interfacial resistance rises. The layer grows fastest when the cell sits at a high state of charge or is charged fast.' }
    ]);
    var loop = anim(fig, function (dt) { if (dt === 0) return; t += dt / 6; if (t > 1) t = 0.02; render(); }, { autoplay: true, stepDt: 0.5 });
    render(); bind(fig, loop);
  });

  /* ===== 10.3 Manganese on the move ===== */
  register('f10-3', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var nx = 40, px = 400, top = 50, bot = 200;
    el('rect', { x: nx, y: top, width: 70, height: bot - top, fill: 'var(--panel-2)' }, g);
    for (var i = 0; i < 7; i++) el('line', { x1: nx + 4, x2: nx + 66, y1: top + 10 + i * 20, y2: top + 10 + i * 20, stroke: 'var(--text)', 'stroke-opacity': '.5', 'stroke-width': 2 }, g);
    var sei = el('rect', { x: nx + 70, y: top, width: 8, height: bot - top, fill: 'var(--anion)', 'fill-opacity': '.8' }, g);
    el('rect', { x: nx + 78, y: top, width: px - nx - 78, height: bot - top, fill: 'var(--cyan)', 'fill-opacity': '.08' }, g);
    el('rect', { x: px, y: top, width: 80, height: bot - top, fill: 'var(--amber-2)', 'fill-opacity': '.55' }, g);
    txt(g, nx + 35, top - 12, 'graphite', 'strong', 'middle'); txt(g, nx + 74, bot + 18, 'SEI', '', 'middle'); txt(g, 255, top - 12, 'electrolyte', 'cyan', 'middle'); txt(g, px + 40, top - 12, 'LiMn₂O₄ spinel', 'strong', 'middle');
    var mns = [], n = 0, t = 0;
    var cnt = txt(g, 255, bot + 18, '', 'amber', 'middle'), q = txt(g, nx + 74, bot + 36, '', 'heat', 'middle');
    badge(g, px + 92, top + 20, 1); badge(g, 255, top + 20, 2); badge(g, nx + 74, top - 30, 3);
    function spawn() { var y = top + 20 + Math.random() * (bot - top - 40); mns.push({ x: px - 4, y: y, c: el('circle', { cx: px - 4, cy: y, r: 4.5, fill: '#b98cf0', stroke: '#fff', 'stroke-width': .8 }, g), done: false }); }
    function render() {
      setSvgText(cnt, n ? n + ' Mn ions have reached the SEI' : 'Mn²⁺ leaves the spinel');
      sei.setAttribute('fill', n > 3 ? '#8f8aa8' : 'var(--anion)'); setSvgText(q, n > 3 ? 'poisoned: works worse' : '');
      read.innerHTML = n > 3 ? 'The manganese has lodged in the SEI on the graphite, and the layer protects the electrode less well: more electrolyte is consumed, more lithium is lost. Damage at one electrode shows up at the other.' : 'Manganese, as Mn(II), dissolves from the spinel positive electrode into the electrolyte and drifts across the cell.';
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      if (t > 1.4 && mns.filter(function (m) { return !m.done; }).length < 3) { t = 0; spawn(); }
      mns.forEach(function (m) { if (m.done) return; m.x -= 50 * dt; m.y += Math.sin(m.x / 12) * 0.6; if (m.x <= nx + 76) { m.x = nx + 72 + Math.random() * 6; m.done = true; n++; } m.c.setAttribute('cx', m.x); m.c.setAttribute('cy', m.y); });
      while (mns.length > 14) { var o = mns.shift(); g.removeChild(o.c); }
      render();
    }
    steps(fig, [
      { text: 'Manganese, as <b>Mn(II)</b>, dissolves out of the LiMn₂O₄ spinel of the positive electrode: active material lost.' },
      { text: 'It crosses the electrolyte to the negative electrode.' },
      { text: 'There it lodges in the <b>SEI</b> on the graphite, which then protects less well. One electrode&#8217;s loss becomes the other&#8217;s problem.' }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    if (!motion) { for (var k = 0; k < 6; k++) { spawn(); var m = mns[mns.length - 1]; m.x = nx + 74; m.done = true; n++; m.c.setAttribute('cx', m.x); } spawn(); mns[mns.length - 1].x = 260; mns[mns.length - 1].c.setAttribute('cx', 260); }
    render(); bind(fig, loop);
  });

  /* ===== 10.4 On the shelf: self-discharge ===== */
  register('f10-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var x0 = 150, x1 = 470;
    // log time axis from 1 day to 10 years
    var t0 = Math.log10(1), t1 = Math.log10(3650), X = function (days) { return x0 + (Math.log10(days) - t0) / (t1 - t0) * (x1 - x0); };
    [[1, '1 day'], [30, '1 month'], [365, '1 year'], [2920, '8 years']].forEach(function (r) { el('line', { x1: X(r[0]), x2: X(r[0]), y1: 40, y2: 196, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, g); txt(g, X(r[0]), 214, r[1], '', 'middle'); });
    txt(g, x1, 232, 'time on the shelf (log scale)', '', 'end');
    var rows = [
      { y: 80, name: 'Li-MnO₂ primary', keep: 0.9, at: 2920, txt: '90 % kept after 8 years', col: 'var(--amber)' },
      { y: 150, name: 'Ni-MH rechargeable', keep: 0.7, at: 30, txt: 'up to 30 % lost in a month', col: 'var(--cyan)' }
    ];
    rows.forEach(function (r, i) {
      txt(g, x0 - 10, r.y + 4, r.name, 'strong', 'end');
      el('line', { x1: x0, x2: X(r.at), y1: r.y, y2: r.y, stroke: r.col, 'stroke-width': 10, 'stroke-opacity': '.35' }, g);
      el('circle', { cx: X(r.at), cy: r.y, r: 6, fill: r.col }, g);
      txt(g, X(r.at) + (i ? 10 : -10), r.y - 12, r.txt, '', i ? 'start' : 'end');
      badge(g, x0 - 10 - 136, r.y - 18, i + 1);
    });
    txt(g, x0, 30, 'what each keeps, at the point the source gives', '', 'start');
    steps(fig, [
      { text: 'A lithium-MnO₂ <b>primary</b> cell keeps 90 % of its charge after 8 years on the shelf.' },
      { text: 'A nickel-metal hydride <b>rechargeable</b> cell can lose up to 30 % in a single month. Self-discharge speeds up with temperature.' }
    ]);
    read.innerHTML = 'Two points, not two curves: the sources give one figure for each, and nothing about the shape in between.';
  });
