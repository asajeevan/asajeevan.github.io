  /* =================================================================
     Module 6: the two hosts in three dimensions, with the ball-and-stick
     renderer of figs-7m.js.
     Graphite after Nagendra et al. 2026 (R58): hexagonal graphene layers held by
     van der Waals forces, ABAB stacking, 0.335 nm between layers, C-C 0.14 nm
     (their Fig. 2a), staging from stage 4 to stage 1 with the stage the number of
     graphene layers between lithium planes, LiC12 (stage 2) and LiC6 (stage 1), the
     Rudorff-Hofmann picture of full lithium layers (their Fig. 4), lithium entering
     at the edge planes, about 10 % volume expansion mostly along the stacking axis.
     LiC6: one lithium per six carbons (Goodenough and Park 2013, R6). Drawn from the
     standard crystal structure, not yet from a source in hand (FLAG in the
     verification record): lithium over every third ring centre, AA stacking across a
     gap that holds lithium, and that gap 0.370 nm wide.
     LiCoO2: lithium between two octahedral CoO2 sheets (Zhang et al. 2020, R47),
     about half of it used (R2, R6). Cell dimensions from the standard structure
     (a = 0.282 nm, sheets 0.468 nm apart), also flagged.
     Drawn to scale within each view (the LiCoO₂ view is magnified 1.3 times).
     ================================================================= */
  var M6_A = 2.46, M6_S3 = Math.sqrt(3), M6_D0 = 3.35, M6_DLI = 3.70, M6_X = 10.5, M6_Z = 2.6;
  /* graphite: nS sheets; filled[g] true when gap g (between sheet g-1 and g) holds lithium.
     Stacking: the next sheet shifts by one C-C bond across an empty gap (ABAB) and keeps its
     position across a filled gap (AA). Returns atoms, bonds, lithium sites and layer heights. */
  function m6graphiteStage(nS, filled) {
    var atoms = [], bonds = [], sites = [], ys = [0], shift = [0], letters = ['A'];
    for (var g = 1; g < nS; g++) { ys.push(ys[g - 1] + (filled[g] ? M6_DLI : M6_D0)); shift.push(filled[g] ? shift[g - 1] : 1 - shift[g - 1]); letters.push(shift[g] ? 'B' : 'A'); }
    var mid = ys[nS - 1] / 2; ys = ys.map(function (y) { return y - mid; });
    var dx = M6_A / 2, dz = M6_A / (2 * M6_S3);
    ys.forEach(function (y, k) {
      var start = atoms.length, ox = shift[k] * dx, oz = shift[k] * dz;
      for (var i = -9; i <= 9; i++) for (var j = -4; j <= 4; j++) {
        var x0 = i * M6_A + j * M6_A / 2 + ox, z0 = j * M6_A * M6_S3 / 2 + oz;
        [[x0, z0], [x0 + dx, z0 + dz]].forEach(function (p) { if (Math.abs(p[0]) <= M6_X && Math.abs(p[1]) <= M6_Z) atoms.push({ e: 'C', p: [p[0], y, p[1]] }); });
      }
      for (var m = start; m < atoms.length; m++) for (var n = m + 1; n < atoms.length; n++) { var A = atoms[m].p, B = atoms[n].p; if (Math.hypot(A[0] - B[0], A[2] - B[2]) < 1.5) bonds.push([m, n, 1]); }
    });
    for (g = 1; g < nS; g++) {
      if (!filled[g]) continue;
      var yl = (ys[g - 1] + ys[g]) / 2, ox2 = shift[g] * dx, oz2 = shift[g] * dz;
      for (var i2 = -9; i2 <= 9; i2++) for (var j2 = -4; j2 <= 4; j2++) {
        if (((i2 - j2) % 3 + 3) % 3 !== 0) continue; // every third ring centre: one Li per six C in a full layer
        var x = i2 * M6_A + j2 * M6_A / 2 + ox2, z = j2 * M6_A * M6_S3 / 2 + M6_A / M6_S3 + oz2;
        if (Math.abs(x) <= M6_X - 0.6 && Math.abs(z) <= M6_Z) sites.push([x, yl, z]);
      }
    }
    return { atoms: atoms, bonds: bonds, sites: sites, ys: ys, letters: letters };
  }
  /* LiCoO2: three CoO2 sheets 4.68 A apart, Co-O 1.92 A, lithium octahedral between sheets */
  function m6lcoSheets() {
    var a = 2.82, atoms = [], bonds = [], sites = [], ys = [-4.68, 0, 4.68], h = 1.02;
    var P3 = [[0, 0], [a / 2, a / (2 * M6_S3)], [a, a / M6_S3]];
    function lay(e, y, off) { var idx = []; for (var i = -8; i <= 8; i++) for (var j = -3; j <= 3; j++) { var x = i * a + j * a / 2 + off[0], z = j * a * M6_S3 / 2 + off[1]; if (Math.abs(x) <= 8.4 && Math.abs(z) <= 1.7) { atoms.push({ e: e, p: [x, y, z] }); idx.push(atoms.length - 1); } } return idx; }
    var slabs = [[2, 0, 1], [0, 1, 2], [1, 2, 0]];
    ys.forEach(function (y, k) {
      var sl = slabs[k], co = lay('Co', y, P3[sl[1]]), ob = lay('O', y - h, P3[sl[0]]), ot = lay('O', y + h, P3[sl[2]]);
      co.forEach(function (c) { ob.concat(ot).forEach(function (o) { var A = atoms[c].p, B = atoms[o].p; if (Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) < 2.05) bonds.push([c, o, 1]); }); });
    });
    [0, 1].forEach(function (k) {
      var below = slabs[k][2], above = slabs[k + 1][0], pos = [0, 1, 2].filter(function (q) { return q !== below && q !== above; })[0], y = (ys[k] + ys[k + 1]) / 2;
      for (var i = -8; i <= 8; i++) for (var j = -3; j <= 3; j++) { var x = i * a + j * a / 2 + P3[pos][0], z = j * a * M6_S3 / 2 + P3[pos][1]; if (Math.abs(x) <= 8.0 && Math.abs(z) <= 1.7) sites.push([x, y, z]); }
    });
    return { atoms: atoms, bonds: bonds, sites: sites, ys: ys };
  }

  /* ===== 6.2 The two hosts, atom by atom: graphite stages, and LiCoO2 ===== */
  register('f6-2', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout');
    var hostB = fig.querySelectorAll('button[data-host]'), stB = fig.querySelectorAll('button[data-stage]'), rowG = fig.querySelector('.row-g'), rowL = fig.querySelector('.row-l');
    var sl = fig.querySelector('.lco'), sv = fig.querySelector('.lco-val');
    var pfx = 'm62'; m3defs(svg, pfx);
    var g = el('g', {}, svg), stage = el('g', {}, g), S = m3scene(stage, pfx), ann = el('g', {}, g);
    var V = { yaw: 0.22, pitch: 0.16, cx: 214, cy: 150, scale: 8.6 };
    var title = txt(g, 214, 20, '', 'strong', 'middle'), sub = txt(g, 214, 37, '', '', 'middle');
    var host = 'g', st = 0, x = 1, t = 0, lis = [], frame = null;
    var STAGES = { 0: [], 4: [4], 3: [3, 6], 2: [2, 4, 6], 1: [1, 2, 3, 4, 5, 6] };
    var NAMES = { 0: 'graphite, no lithium', 4: 'stage 4', 3: 'stage 3', 2: 'stage 2: LiC₁₂', 1: 'stage 1: LiC₆' };
    function yScr(y) { return V.cy - y * V.scale * Math.cos(V.pitch); }
    function build() {
      S.clear(); while (ann.firstChild) ann.removeChild(ann.firstChild); lis = [];
      V.scale = host === 'g' ? 8.6 : 11.5;
      var xr = V.cx + (host === 'g' ? M6_X : 8.4) * V.scale + 18; // annotation column to the right of the drawing
      if (host === 'g') {
        var filled = {}; STAGES[st].forEach(function (k) { filled[k] = true; });
        frame = m6graphiteStage(7, filled);
        S.add({ atoms: frame.atoms, bonds: frame.bonds });
        frame.sites.forEach(function (p) { var m = S.add({ atoms: [{ e: 'Li', p: p }], bonds: [] }); m.home = p; m.k = 0; m.delay = (M6_X - p[0]) / (2 * M6_X) * 0.8; lis.push(m); });
        // stacking letters on the left, gap labels on the right
        frame.ys.forEach(function (y, k) { txt(ann, V.cx - M6_X * V.scale - 22, yScr(y) + 4, frame.letters[k], 'strong', 'middle'); });
        var firstEmpty = true;
        for (var k2 = 1; k2 < frame.ys.length; k2++) {
          var y1 = yScr(frame.ys[k2 - 1]), y2 = yScr(frame.ys[k2]), ym = (y1 + y2) / 2, f = filled[k2];
          el('path', { d: 'M' + (xr - 4) + ',' + (y1 - 2) + ' H' + xr + ' V' + (y2 + 2) + ' H' + (xr - 4), fill: 'none', stroke: f ? 'var(--amber)' : 'var(--line-2)' }, ann);
          txt(ann, xr + 6, ym + 4, f ? 'lithium layer' : (firstEmpty ? 'empty gap, 0.335 nm' : 'empty gap'), f ? 'amber' : '', 'start');
          if (!f) firstEmpty = false;
        }
        setSvgText(title, NAMES[st]); setSvgText(sub, st === 0 ? 'graphene sheets, stacked A B A B' : 'lithium in every ' + (st === 1 ? '' : (st === 2 ? 'second' : st === 3 ? 'third' : 'fourth') + ' ') + 'gap');
        lis.forEach(function (m) { if (motion) { m.off = [M6_X + 3 - m.home[0], 0, 0]; m.fade = 0; m.k = -m.delay; } else { m.off = [0, 0, 0]; m.fade = 1; m.k = 1; } });
        read.innerHTML = st === 0
          ? '<b>Graphite.</b> Flat sheets of carbon (graphene), each a honeycomb of hexagonal rings with carbon atoms 0.14 nm apart, stacked 0.335 nm apart and held together by weak van der Waals forces. In natural graphite the sheets mostly alternate A, B, A, B: each is shifted by one bond from the next.'
          : st === 1
          ? '<b>Stage 1, LiC₆.</b> Every gap holds a lithium layer: one lithium for every six carbons, the full charge, 372 mAh per gram of carbon. Each change of stage is thermodynamically favoured but kinetically hindered, this last one most of all. Across each filled gap the sheets sit directly above one another (A, A) and the gap is wider; overall the graphite swells by about 10 %, mostly along the stacking direction.'
          : st === 2
          ? '<b>Stage 2, LiC₁₂.</b> Lithium in every second gap: two graphene sheets between lithium layers, half the lithium of LiC₆. Stages 2 and 3 are stable phases, and they affect the equilibrium potential.'
          : '<b>Stage ' + st + '.</b> The stage is the number of graphene sheets between two lithium layers: here ' + st + '. Lithium does not spread evenly over all the gaps at first; it fills some gaps and leaves others empty, and as charging goes on the structure passes from stage 4 to stage 1.';
      } else {
        frame = m6lcoSheets();
        S.add({ atoms: frame.atoms, bonds: frame.bonds });
        var rnd = m7rng(41);
        frame.sites.forEach(function (p) { var m = S.add({ atoms: [{ e: 'Li', p: p }], bonds: [] }); m.home = p; m.order = rnd(); m.fade = 1; lis.push(m); });
        lis.sort(function (p, q) { return p.order - q.order; });
        frame.ys.forEach(function (y) { txt(ann, xr + 6, yScr(y) + 4, 'CoO₂ sheet', '', 'start'); });
        [0, 1].forEach(function (k) { txt(ann, xr + 6, yScr((frame.ys[k] + frame.ys[k + 1]) / 2) + 4, 'lithium layer', 'amber', 'start'); });
        setSvgText(title, 'Li_{' + fmt(x, 2) + '}CoO₂'); setSvgText(sub, 'cobalt (blue) in octahedra of oxygen (red)');
        applyX();
      }
      Array.prototype.forEach.call(hostB, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-host') === host)); });
      Array.prototype.forEach.call(stB, function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-stage') === st)); });
      rowG.style.display = host === 'g' ? '' : 'none'; rowL.style.display = host === 'l' ? '' : 'none';
      S.draw(V);
    }
    function applyX() {
      var n = Math.round(x * lis.length); lis.forEach(function (m, i) { m.target = i < n ? 1 : 0; if (!motion) m.fade = m.target; }); S.draw(V);
      setSvgText(title, 'Li_{' + fmt(x, 2) + '}CoO₂'); sl.value = Math.round(x * 100); sv.textContent = 'x = ' + fmt(x, 2);
      read.innerHTML = '<b>LiCoO₂.</b> Layers of cobalt, each cobalt in an octahedron of six oxygens, form CoO₂ sheets; lithium sits in the plane between two sheets. Charging takes lithium out of those planes, x falls from 1; only about half is used (x down to about 0.5), because removing more than about 0.55 of it makes the oxide give off oxygen. Now x = ' + fmt(x, 2) + '.';
    }
    function tick(dt) {
      if (dt === 0) return; t += dt;
      if (!V.held) V.yaw = 0.22 + 0.22 * Math.sin(t * 0.35);
      if (host === 'g') lis.forEach(function (m) { m.k += dt; var k = Math.max(0, Math.min(1, m.k / 0.9)); m.off = [(M6_X + 3 - m.home[0]) * (1 - smooth(k)), 0, 0]; m.fade = Math.min(1, k * 3); });
      else lis.forEach(function (m) { m.fade += ((m.target || 0) - m.fade) * Math.min(1, dt * 4); });
      S.draw(V);
    }
    Array.prototype.forEach.call(hostB, function (b) { on(b, 'click', function () { host = b.getAttribute('data-host'); build(); }); });
    Array.prototype.forEach.call(stB, function (b) { on(b, 'click', function () { st = +b.getAttribute('data-stage'); build(); }); });
    on(sl, 'input', function () { x = sl.value / 100; applyX(); });
    m3drag(svg, V, function () { S.draw(V); });
    badge(g, 30, 60, 1); badge(g, 30, 150, 2); badge(g, 30, 240, 3); badge(g, 494, 24, 4);
    steps(fig, [
      { text: '<b>Graphite</b>: sheets of carbon rings (graphene) stacked A, B, A, B, 0.335 nm apart. The letters on the left mark how each sheet sits relative to the one below.', on: function () { host = 'g'; st = 0; build(); } },
      { text: '<b>Lithium goes in by stages.</b> It goes in at the edges of the sheets, the favourable sites, and fills <b>some gaps completely while others stay empty</b>. The stage is the number of graphene sheets between two lithium layers: stage 4, then 3, then 2.', on: function () { host = 'g'; st = 4; build(); } },
      { text: 'Stage 2 is <b>LiC₁₂</b>, stage 1 is <b>LiC₆</b>: every gap full, one lithium per six carbons. Filled gaps are wider and their sheets line up A, A. Try the stage buttons in order.', on: function () { host = 'g'; st = 1; build(); } },
      { text: '<b>LiCoO₂</b>, the other host: CoO₂ sheets with lithium between them. Drag the slider: only about half of the lithium is taken out in normal use.', on: function () { host = 'l'; x = 1; build(); } }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    lis.forEach(function (m) { m.k = 1; }); tick(0.01);
    bind(fig, loop);
  });

