  /* =================================================================
     Module 7, first half: the liquid electrolyte from the ground up.
     Composition and solvent properties after Ue et al. 2014 (R54), section
     2.1, Table 2.1 and p. 97; the salt after Henderson 2014 (R53), pp. 5 to
     13; the solvation shell, ion pairing, transport modes and the interfacial
     structure after Borodin 2014 (R57), pp. 382 to 391 (molecular dynamics,
     with the experiments it cites); the double layer and electroneutrality
     after Bard, Faulkner and White (B2) 1.6 and 2.3. Molecules are drawn as
     glyphs, not to scale, except where a figure says otherwise.
     ================================================================= */

  /* A carbonate molecule as a glyph. EC: a small ring (it is cyclic); DMC: a
     stretched capsule (it is a chain). The red dot is the carbonyl oxygen, the
     atom that binds to Li⁺ (R53 p. 9, R57 p. 389). ang points the oxygen. */
  var M7_O = '#ff8f7a', M7_DMC = '#9fe3d9';
  function m7mol(g, type, x, y, ang, sc) {
    sc = sc || 1.2; var grp = el('g', {}, g);
    if (type === 'ec') {
      el('circle', { r: 5.5, fill: 'var(--cyan)', 'fill-opacity': '.22', stroke: 'var(--cyan)', 'stroke-width': 1.3 }, grp);
      el('circle', { cx: 8, cy: 0, r: 2.3, fill: M7_O }, grp);
    } else {
      el('rect', { x: -8, y: -3.2, width: 16, height: 6.4, rx: 3.2, fill: M7_DMC, 'fill-opacity': '.14', stroke: M7_DMC, 'stroke-width': 1.2 }, grp);
      el('circle', { cx: 0, cy: 5.6, r: 2.3, fill: M7_O }, grp);
    }
    var m = { g: grp, type: type, x: x, y: y, a: ang || 0, sc: sc };
    m.set = function (nx, ny, na) { m.x = nx; m.y = ny; if (na !== undefined) m.a = na; grp.setAttribute('transform', 'translate(' + nx.toFixed(1) + ',' + ny.toFixed(1) + ') rotate(' + (m.a * 180 / Math.PI - (type === 'ec' ? 0 : 90)).toFixed(1) + ') scale(' + sc + ')'); };
    m.set(x, y, ang || 0);
    return m;
  }
  /* point the oxygen of m at (tx, ty) from a distance d: places the glyph so that its O sits d from the target */
  function m7aim(m, tx, ty, dir, d) {
    var off = (m.type === 'ec' ? 8 : 5.6) * m.sc; // centre-to-oxygen distance of the glyph
    var ox = tx + Math.cos(dir) * d, oy = ty + Math.sin(dir) * d;
    m.set(ox + Math.cos(dir) * off, oy + Math.sin(dir) * off, dir + Math.PI); m.fx = m.x; m.fy = m.y;
  }
  function m7anion(g, x, y, r) { var c = el('circle', { cx: x, cy: y, r: r || 6.5, 'class': 'ion an' }, g); return { c: c, x: x, y: y, set: function (nx, ny) { this.x = nx; this.y = ny; c.setAttribute('cx', nx.toFixed(1)); c.setAttribute('cy', ny.toFixed(1)); } }; }
  function m7li(g, x, y, r) { var c = el('circle', { cx: x, cy: y, r: r || 5, 'class': 'ion' }, g); return { c: c, x: x, y: y, set: function (nx, ny) { this.x = nx; this.y = ny; c.setAttribute('cx', nx.toFixed(1)); c.setAttribute('cy', ny.toFixed(1)); } }; }
  function m7rng(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  /* ===== 7.2 What the liquid is made of ===== */
  register('f7-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), btns = fig.querySelectorAll('button[data-solv]');
    var EC = { phi: 1, rho: 1.32, M: 88.1 }, DMC = { phi: 1, rho: 1.06, M: 90.1 };
    // panel 1: the recipe
    txt(g, 90, 22, 'the recipe', 'strong', 'middle');
    el('path', { d: 'M52,44 V196 Q52,210 66,210 H114 Q128,210 128,196 V44', fill: 'none', stroke: 'var(--line-2)', 'stroke-width': 1.6 }, g);
    var liq = el('rect', { x: 54, y: 92, width: 72, height: 116, rx: 10, fill: 'var(--cyan)', 'fill-opacity': '.14' }, g);
    var r1 = txt(g, 90, 118, '1 mol LiPF₆', 'amber', 'middle'), r2 = txt(g, 90, 136, 'per litre of', '', 'middle'), r3 = txt(g, 90, 154, 'EC : DMC', 'strong', 'middle'), r4 = txt(g, 90, 172, '3 : 7', 'strong', 'middle');
    badge(g, 140, 54, 1);
    // panel 2: count per lithium ion
    var bx = 196, bw = 130, by = 40, bh = 170;
    txt(g, bx + bw / 2 + 4, 22, 'molecules per Li⁺', 'strong', 'middle');
    el('line', { x1: bx, y1: by + bh, x2: bx + bw, y2: by + bh, stroke: 'var(--line-2)' }, g);
    var bars = [['EC', 'var(--cyan)'], ['DMC', M7_DMC], ['Li⁺', 'var(--cation)'], ['PF₆⁻', 'var(--anion)']].map(function (b, i) {
      var x = bx + 8 + i * 31;
      return { r: el('rect', { x: x, width: 22, y: by + bh, height: 0, fill: b[1], 'fill-opacity': '.75' }, g), v: txt(g, x + 11, by + bh - 4, '', 'strong', 'middle'), l: txt(g, x + 11, by + bh + 16, b[0], '', 'middle'), x: x };
    });
    badge(g, bx + bw + 4, by + 8, 2);
    // panel 3: a window a few nanometres across
    var wx = 350, wy = 40, ww = 156, wh = 170;
    txt(g, wx + ww / 2, 22, 'a few nanometres of it', 'strong', 'middle');
    el('rect', { x: wx, y: wy, width: ww, height: wh, rx: 6, fill: 'var(--cyan)', 'fill-opacity': '.05', stroke: 'var(--line-2)' }, g);
    var win = el('g', {}, g), cap = txt(g, wx + ww / 2, wy + wh + 18, '', 'amber', 'middle');
    badge(g, wx + ww - 6, wy + wh + 14, 3);
    var mols = [], state = 'mix', t = 0;
    function build() {
      while (win.firstChild) win.removeChild(win.firstChild); mols = [];
      var rnd = m7rng(state === 'ec' ? 11 : state === 'dmc' ? 23 : 37);
      if (state === 'ec') { // a solid: molecules on a lattice, the salt not shown dissolved
        for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) { var m = m7mol(win, 'ec', wx + 16 + c * 25 + (r % 2) * 6, wy + 16 + r * 27, (r + c) % 2 ? 0 : Math.PI); m.fx = m.x; m.fy = m.y; m.ph = 0; mols.push(m); }
        return;
      }
      var nLi = 3, perLi = state === 'dmc' ? { ec: 0, dmc: P.solventPerIon([DMC], 1) } : { ec: P.solventPerIon([{ phi: 0.3, rho: EC.rho, M: EC.M }], 1), dmc: P.solventPerIon([{ phi: 0.7, rho: DMC.rho, M: DMC.M }], 1) };
      var list = [];
      for (var i = 0; i < Math.round(perLi.ec * nLi); i++) list.push('ec');
      for (i = 0; i < Math.round(perLi.dmc * nLi); i++) list.push('dmc');
      var spots = []; // jittered grid, so that glyphs do not pile up
      for (var yy = 0; yy < 8; yy++) for (var xx = 0; xx < 7; xx++) spots.push({ x: wx + 14 + xx * 21.5 + rnd() * 6, y: wy + 14 + yy * 20.5 + rnd() * 6 });
      spots.sort(function () { return rnd() - 0.5; });
      var k = 0;
      for (i = 0; i < nLi; i++) {
        var s = spots[k++], li = m7li(win, s.x, s.y, 4.5); li.fx = s.x; li.fy = s.y; li.ph = rnd() * 6; li.kind = 'li'; mols.push(li);
        var sa = state === 'dmc' ? { x: s.x + 11, y: s.y + 1 } : spots[k++]; // in DMC the anion sits against the cation: paired
        var an = m7anion(win, sa.x, sa.y, 5.5); an.fx = sa.x; an.fy = sa.y; an.ph = rnd() * 6; an.kind = 'an'; an.partner = state === 'dmc' ? li : null; mols.push(an);
      }
      list.forEach(function (type) { var s = spots[k++]; if (!s) return; var m = m7mol(win, type, s.x, s.y, rnd() * 6.28); m.fx = s.x; m.fy = s.y; m.ph = rnd() * 6; m.spin = (rnd() - 0.5) * 0.8; mols.push(m); });
    }
    function render() {
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-solv') === state)); });
      var c = state === 'ec' ? { ec: P.solventPerIon([EC], 1), dmc: 0 } : state === 'dmc' ? { ec: 0, dmc: P.solventPerIon([DMC], 1) } : { ec: P.solventPerIon([{ phi: 0.3, rho: 1.32, M: 88.1 }], 1), dmc: P.solventPerIon([{ phi: 0.7, rho: 1.06, M: 90.1 }], 1) };
      var vals = [c.ec, c.dmc, 1, 1], max = 16;
      bars.forEach(function (b, i) { var h = vals[i] / max * (bh - 20); b.r.setAttribute('y', by + bh - h); b.r.setAttribute('height', h); b.v.setAttribute('y', by + bh - h - 5); setSvgText(b.v, vals[i] ? (i < 2 ? fmt(vals[i], 1) : '1') : '0'); });
      setSvgText(r3, state === 'ec' ? 'EC alone' : state === 'dmc' ? 'DMC alone' : 'EC : DMC'); setSvgText(r4, state === 'mix' ? '3 : 7' : '');
      liq.setAttribute('fill-opacity', state === 'ec' ? '.32' : '.14');
      setSvgText(cap, state === 'ec' ? 'solid below about 36 °C' : state === 'dmc' ? 'ions mostly in pairs' : 'more ions apart');
      build();
      read.innerHTML = state === 'ec'
        ? '<b>EC alone.</b> Relative permittivity 90 and viscosity 1.9 mPa s (both at 40 °C): very good at pulling a salt apart, but EC melts at about 36 °C, so at room temperature it is a solid. 1 litre holds ' + fmt(c.ec, 1) + ' mol of it.'
        : state === 'dmc'
        ? '<b>DMC alone.</b> Viscosity 0.59 mPa s against EC’s 1.9, so it flows easily; relative permittivity only 3.1, so it separates ions poorly and most of them stay in pairs. Measured with LiTFSI, the conductivity in DMC is only 11 % of what fully independent ions would give, against 62 % in PC.'
        : '<b>The mixture, 3 : 7 by volume.</b> For every Li⁺ there are about ' + fmt(c.ec, 1) + ' EC and ' + fmt(c.dmc, 1) + ' DMC molecules, ' + fmt(c.ec + c.dmc, 1) + ' in all, and one PF₆⁻. EC separates the ions, DMC thins the liquid, and the two together stay liquid far below EC’s melting point.';
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      var a = state === 'ec' ? 0.4 : 2.2;
      mols.forEach(function (m, i) {
        var x = m.fx + Math.sin(t * 1.7 + (m.ph || 0) + i) * a, y = m.fy + Math.cos(t * 1.3 + (m.ph || 0) * 1.3 + i) * a;
        if (m.partner) { x = m.partner.x + 11; y = m.partner.y + 1; }
        if (m.set.length === 2) m.set(x, y); else m.set(x, y, m.a + (m.spin || 0) * dt);
      });
    }
    Array.prototype.forEach.call(btns, function (b) { on(b, 'click', function () { state = b.getAttribute('data-solv'); render(); }); });
    steps(fig, [
      { text: 'The recipe of most commercial lithium-ion electrolytes: about <b>1 mol of LiPF₆</b> per litre of a mixture of a cyclic carbonate, here EC, and a linear one, here DMC.' },
      { text: 'Count the molecules. For every lithium ion there is one PF₆⁻ anion and about <b>13 solvent molecules</b>. Most of the liquid is solvent; the ions are the minority that carries the current.' },
      { text: 'Zoom in to a few nanometres. Everything moves; nothing is in rows. Try the three buttons: EC alone is a solid, DMC alone leaves the ions paired, the mixture gets both jobs done.' }
    ]);
    render();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    tick(0.01); bind(fig, loop);
  });

  /* ===== 7.6 How the ion moves ===== */
  register('f7-6', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), fb = fig.querySelector('.fieldbtn');
    var x0 = 18, y0 = 36, w = 316, h = 196;
    el('rect', { x: x0, y: y0, width: w, height: h, rx: 6, fill: 'var(--cyan)', 'fill-opacity': '.05', stroke: 'var(--line-2)' }, g);
    var rnd = m7rng(91), bg = el('g', { opacity: '.45' }, g), bgm = [];
    for (var i = 0; i < 26; i++) { var m = m7mol(bg, i % 3 ? 'dmc' : 'ec', x0 + 12 + rnd() * (w - 24), y0 + 12 + rnd() * (h - 24), rnd() * 6.28); m.fx = m.x; m.fy = m.y; bgm.push(m); }
    var trail = el('polyline', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.4, 'stroke-opacity': '.8' }, g);
    // the field: plates at the two ends and arrows across the liquid
    var farr = el('g', {}, g);
    el('rect', { x: x0 - 8, y: y0, width: 6, height: h, fill: 'var(--heat)', 'fill-opacity': '.8' }, farr); txt(farr, x0 - 5, y0 - 6, '+', 'heat', 'middle', { style: 'font-size:15px;font-weight:700' });
    el('rect', { x: x0 + w + 2, y: y0, width: 6, height: h, fill: 'var(--cyan-2)', 'fill-opacity': '.9' }, farr); txt(farr, x0 + w + 5, y0 - 6, '−', 'cyan', 'middle', { style: 'font-size:15px;font-weight:700' });
    [0.2, 0.5, 0.8].forEach(function (f) { arrow(farr, x0 + 40, y0 + h * f, x0 + w - 40, y0 + h * f, 'rgba(196,181,247,.35)', 1.2); });
    txt(farr, x0 + w / 2, y0 - 8, 'field: from + to −', 'field', 'middle');
    var others = [];
    [[1, 0.3], [1, 0.75], [-1, 0.2], [-1, 0.55], [-1, 0.85]].forEach(function (o, k) {
      var c = el('circle', { r: o[0] > 0 ? 4.5 : 6, 'class': o[0] > 0 ? 'ion' : 'ion an' }, g);
      others.push({ z: o[0], c: c, x: x0 + 40 + k * 55, y: y0 + h * o[1], vx: 0, vy: 0 });
    });
    var shellC = el('circle', { r: 15, fill: 'none', stroke: 'var(--cyan)', 'stroke-dasharray': '2 2' }, g);
    var ion = ourIon(g, 0, 0, 5, 'our ion', true);
    var cnt = txt(g, x0 + w - 6, y0 + h - 8, '', 'amber', 'end');
    var flab = txt(g, x0 + w / 2, y0 + h + 18, '', 'amber', 'middle');
    badge(g, x0 + 18, y0 + 18, 1); badge(g, x0 + w - 18, y0 + 18, 2);
    // right: the two ways of moving
    var rx = 350;
    txt(g, rx + 78, 30, 'two ways to move', 'strong', 'middle');
    txt(g, rx + 8, 54, 'carried with its shell', '', 'start');
    txt(g, rx + 8, 150, 'handed on, shell to shell', '', 'start');
    var veh = el('g', {}, g), vli = m7li(veh, 0, 0, 5), vsh = [0, 1, 2, 3].map(function (k) { return m7mol(veh, k % 2 ? 'dmc' : 'ec', 0, 0, 0); });
    var exg = el('g', {}, g), eA = [], eB = [], eli = m7li(exg, 0, 0, 5);
    [0, 1, 2].forEach(function (k) { eA.push(m7mol(exg, 'ec', 0, 0, 0)); eB.push(m7mol(exg, k === 1 ? 'dmc' : 'ec', 0, 0, 0)); });
    var cA = { x: rx + 46, y: 196 }, cB = { x: rx + 116, y: 196 };
    [[-2.0, 2.0, Math.PI], [-1.1, 1.1, 0]].forEach(function (set, j) { set.forEach(function (a, k) { m7aim((j ? eB : eA)[k], j ? cB.x : cA.x, j ? cB.y : cA.y, a, 16); }); });
    badge(g, rx + 156, 30, 3);
    var on1 = false, t = 0, p = { x: x0 + 70, y: y0 + h / 2, vx: 0, vy: 0, z: 1 }, pts = [], laps = 0, net = 0;
    function render() {
      fb.setAttribute('aria-pressed', String(on1)); setSvgText(fb, on1 ? 'Switch the field off' : 'Switch the field on');
      farr.style.display = on1 ? '' : 'none';
      setSvgText(flab, on1 ? 'Li⁺ drift to −, PF₆⁻ to + (drift exaggerated)' : 'no field: no net direction');
      read.innerHTML = on1
        ? '<b>Field on.</b> Every ion still wanders, but each step is nudged: the lithium ions (amber) drift towards the − plate, down the potential, and the PF₆⁻ anions (grey) towards the + plate. Watch the track of our ion head right. In a real cell the nudge is far gentler than drawn: at 1 mA/cm² the lithium ions move on average about 0.1 µm per second.'
        : '<b>No field.</b> The ion wanders at random, bumped by its neighbours; it is as likely to go left as right, so on average it goes nowhere. This is diffusion.';
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      // random walk with an optional drift; the drift is exaggerated for visibility (see label)
      walk(p, dt);
      others.forEach(function (o) { walk(o, dt); o.c.setAttribute('cx', o.x.toFixed(1)); o.c.setAttribute('cy', o.y.toFixed(1)); });
      ion.move(p.x, p.y); shellC.setAttribute('cx', p.x); shellC.setAttribute('cy', p.y);
      setSvgText(cnt, on1 ? 'our ion has crossed ' + laps + (laps === 1 ? ' time' : ' times') : '');
      pts.push(p.x.toFixed(1) + ',' + p.y.toFixed(1)); if (pts.length > 400) pts.shift(); trail.setAttribute('points', pts.join(' '));
      bgm.forEach(function (m, j) { m.set(m.fx + Math.sin(t * 1.3 + j) * 2.5, m.fy + Math.cos(t * 1.7 + j) * 2.5, m.a + 0.4 * dt); });
      // carried: the whole solvated ion slides across
      var k = (t % 6) / 6, vx = rx + 24 + 110 * k, vy = 94;
      vli.set(vx, vy); vsh.forEach(function (m, j) { m7aim(m, vx, vy, j * Math.PI / 2 + Math.PI / 4, 13); });
      // handed on: the ion leaves the shell on the left and enters the shell on the right
      var q = (t % 5) / 5, ex = q < 0.35 ? cA.x : q > 0.65 ? cB.x : lerp(cA.x, cB.x, smooth((q - 0.35) / 0.3));
      eli.set(ex, cA.y);
    }
    /* a random walk with friction, plus a steady drift when the field is on: cations towards the - plate (right), anions towards + (left).
       The drift is exaggerated relative to the wandering so that it can be seen (see the label). */
    function walk(o, dt) {
      var kick = 420 * Math.sqrt(dt), drift = on1 ? 42 * o.z : 0;
      o.vx += (Math.random() - 0.5) * kick - o.vx * 3 * dt; o.vy += (Math.random() - 0.5) * kick - o.vy * 3 * dt;
      o.x += (o.vx + drift) * dt; o.y += o.vy * dt;
      if (o.y < y0 + 14) { o.y = y0 + 14; o.vy = Math.abs(o.vy); } if (o.y > y0 + h - 26) { o.y = y0 + h - 26; o.vy = -Math.abs(o.vy); }
      if (on1) {
        if (o.x > x0 + w - 12) { o.x = x0 + 14; if (o === p) { laps++; pts = []; } }
        if (o.x < x0 + 12) { o.x = x0 + w - 14; if (o === p) pts = []; }
      } else {
        if (o.x < x0 + 14) { o.x = x0 + 14; o.vx = Math.abs(o.vx); } if (o.x > x0 + w - 14) { o.x = x0 + w - 14; o.vx = -Math.abs(o.vx); }
      }
    }
    on(fb, 'click', function () { on1 = !on1; pts = []; laps = 0; render(); if (!motion) { for (var n = 0; n < 120; n++) tick(0.05); } });
    steps(fig, [
      { text: 'Without a field the ion takes a <b>random walk</b>: it is bumped by the molecules around it, in every direction alike. The amber line is its track. On average it gets nowhere; it only spreads out.' },
      { text: 'Draw current and a small field appears across the liquid. Every step is now nudged one way, cations down the potential and anions up it. Press <b>Switch the field on</b>. The drift is exaggerated here so that you can see it.' },
      { text: 'Two ways to move, in roughly equal measure in EC : DMC with LiPF₆: the ion <b>carries its shell along</b>, or it is <b>handed on</b>, leaving some molecules behind and picking up new ones.' }
    ]);
    render();
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.3 });
    for (i = 0; i < 90; i++) tick(0.05);
    bind(fig, loop);
  });

