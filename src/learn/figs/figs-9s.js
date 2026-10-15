
  /* ===== 9.14 The p-DHT family in 3D, and where the cations sit in Mg(Li2)-p-DHT =====
     Geometries of the three tetra-anions computed for this page: GFN2-xTB (tblite, ASE BFGS to
     fmax 0.01 eV/A), charge -4, ALPB implicit water standing in for the cations (2026-10-04).
     Start structures from RDKit (ETKDG + MMFF). A B3LYP/def2-SVP check was started but not finished.
     Coordinates in Angstrom. The cations view is a schematic of the coordination reported for the
     solved crystal structure (Jouhara et al. 2025, CCDC 2247807); positions are not to scale. */
    M3_COL.Mg = ['#c8f5b8', '#3e9e45']; M3_R.Mg = 0.5;
  var DHT_GEOM = /*GEOM*/{"pdht": [["O", 3.405, 0.873, 1.052], ["C", 2.884, 0.203, 0.119], ["O", 3.566, -0.322, -0.802], ["C", 1.386, 0.065, 0.078], ["C", 0.66, 1.026, -0.603], ["C", -0.745, 1.019, -0.721], ["O", -1.387, 1.957, -1.382], ["C", -1.386, -0.065, -0.078], ["C", -2.884, -0.203, -0.119], ["O", -3.405, -0.873, -1.052], ["O", -3.566, 0.322, 0.802], ["C", -0.66, -1.026, 0.603], ["C", 0.745, -1.019, 0.721], ["O", 1.387, -1.957, 1.382], ["H", 1.208, 1.845, -1.084], ["H", -1.208, -1.845, 1.084]], "odht": [["O", 3.585, 0.785, -0.041], ["C", 2.808, 0.108, 0.686], ["O", 3.219, -0.564, 1.672], ["C", 1.345, 0.057, 0.333], ["C", 0.896, -0.931, -0.541], ["C", -0.436, -0.999, -0.88], ["C", -1.339, -0.08, -0.349], ["C", -2.791, -0.177, -0.737], ["O", -3.556, -0.909, -0.05], ["O", -3.189, 0.44, -1.763], ["C", -0.937, 0.934, 0.535], ["O", -1.796, 1.798, 1.031], ["C", 0.475, 1.007, 0.894], ["O", 0.907, 1.936, 1.718], ["H", 1.62, -1.641, -0.944], ["H", -0.809, -1.765, -1.562]], "pdobda": [["O", 4.197, -1.103, 0.675], ["C", 3.792, 0.007, 0.255], ["O", 4.19, 1.11, 0.702], ["C", 2.794, 0.018, -0.91], ["C", 1.342, 0.009, -0.477], ["C", 0.978, -0.009, 0.855], ["C", -0.357, -0.019, 1.305], ["O", -0.663, -0.036, 2.583], ["C", -1.342, -0.009, 0.286], ["C", -2.794, -0.019, 0.719], ["C", -3.793, -0.007, -0.446], ["O", -4.197, 1.103, -0.866], ["O", -4.19, -1.109, -0.893], ["C", -0.978, 0.009, -1.046], ["C", 0.357, 0.018, -1.496], ["O", 0.663, 0.035, -2.774], ["H", 2.965, 0.914, -1.523], ["H", 2.971, -0.861, -1.544], ["H", 1.765, -0.016, 1.614], ["H", -2.965, -0.915, 1.331], ["H", -2.971, 0.861, 1.353], ["H", -1.765, 0.016, -1.805]]}/*END*/;
  var DHT_RCOV = { H: 0.31, C: 0.76, O: 0.66 };
  function dhtTpl(k) { // atoms, bonds (single sticks: the charge is delocalized), and the phenolate oxygens
    var A = DHT_GEOM[k].map(function (a) { return { e: a[0], p: [a[1], a[2], a[3]] }; }), b = [], nb = A.map(function () { return []; });
    for (var i = 0; i < A.length; i++) for (var j = i + 1; j < A.length; j++) {
      var d = Math.hypot(A[i].p[0] - A[j].p[0], A[i].p[1] - A[j].p[1], A[i].p[2] - A[j].p[2]);
      if (d < 1.15 * (DHT_RCOV[A[i].e] + DHT_RCOV[A[j].e])) { b.push([i, j, 1]); nb[i].push(j); nb[j].push(i); }
    }
    var phen = [];
    A.forEach(function (a, i) {
      if (a.e !== 'O' || nb[i].length !== 1) return;
      var c = nb[i][0]; if (A[c].e !== 'C') return;
      var nO = nb[c].filter(function (q) { return A[q].e === 'O'; }).length, nC = nb[c].filter(function (q) { return A[q].e === 'C'; }).length;
      if (nO === 1 && nC === 2) phen.push(i); // an oxygen on a ring carbon: the phenolate
    });
    return { tpl: m3centre({ atoms: A, bonds: b, bind: 0 }), phen: phen, nb: nb };
  }
  register('f9-14', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), btns = fig.querySelectorAll('button[data-mol]');
    var pfx = 'm914'; m3defs(svg, pfx);
    var g = el('g', {}, svg), stage = el('g', {}, g), S = m3scene(stage, pfx), flat = el('g', {}, g);
    var V = { yaw: 0.5, pitch: 0.45, cx: 260, cy: 158, scale: 26 };
    var name = txt(g, 260, 22, '', 'strong', 'middle'), sub = txt(g, 260, 40, '', '', 'middle');
    var hint = txt(g, 260, 290, '', '', 'middle', { style: 'fill:var(--muted)' });
    var cur = 'pdht';
    var INFO = {
      pdht: ['§p§-DHT⁴⁻', '2,5-dioxido-1,4-benzenedicarboxylate', 'The ion of Li₄-<i>p</i>-DHT and of Mg(Li₂)-<i>p</i>-DHT. The two phenolate oxygens (ringed) sit opposite each other, <i>para</i>, each next to a carboxylate (–CO₂⁻). The phenolates are the redox centre: they give up electrons on charge, at about 2.6 V in the all-lithium salt. The carboxylates make the salts nearly insoluble in carbonate electrolytes and react only near 0.8 V.', 'Jouhara et al. 2018'],
      odht: ['§o§-DHT⁴⁻', '2,3-dioxido-1,4-benzenedicarboxylate', 'The ion of Li₄-<i>o</i>-DHT. The same atoms, but the two phenolate oxygens are now neighbours, <i>ortho</i>, each still next to a carboxylate. That change alone raises the potential by about 0.3 V; like the <i>para</i> salt, it is oxidized by air.', 'Jouhara et al. 2018'],
      pdobda: ['§p§-DOBDA⁴⁻', '2,5-dioxido-1,4-benzenediacetate', 'The ion of Li₄-<i>p</i>-DOBDA. A methylene (CH₂) spacer holds each carboxylate off the ring, so the carboxylate is no longer conjugated with it. The potential still rises, to about 3.35 V, which the authors attribute to a through-space charge modulation in the solid, with both electrons exchanged, 215 mAh/g, though with a large polarization on cycling.', 'Jouhara et al. 2025'],
      mg: ['Mg(Li₂)-§p§-DHT: where the cations sit', 'schematic of the solved crystal structure', 'Each Mg²⁺ (green) is chelated by two <i>p</i>-DHT⁴⁻ ions, each through a phenolate oxygen and the neighbouring carboxylate oxygen, closing two six-membered rings (one is drawn), and sits in an octahedron of four phenolate and two carboxylate oxygens. Each phenolate oxygen, the redox centre, is bonded to one Li⁺ and two Mg²⁺; each Li⁺ (gold) is in a tetrahedron of three carboxylate and one phenolate oxygen. So magnesium is not confined to the carboxylates: it binds the phenolate oxygen itself, and the more covalent Mg–O bond takes electron density from it and from the ring, which is why the potential rises to about 3.4 V. The rings stack 3.18 Å apart; after one lithium per formula unit is removed they are calculated to pair into dimers, 2.92 and 3.10 Å apart.', 'Jouhara et al. 2025; Jouhara et al. 2018']
    };
    var cache = {};
    function tplOf(k) { return cache[k] || (cache[k] = dhtTpl(k)); }
    function extent(t) { var m = 0; t.tpl.atoms.forEach(function (a) { m = Math.max(m, Math.hypot(a.p[0], a.p[1], a.p[2])); }); return m; }
    /* ---------- the cations view: a flat drawing of p-DHT4- with its metal neighbours ---------- */
    function drawFlat() {
      clear(flat);
      var t = tplOf('pdht'), A = t.tpl.atoms;
      // best plane of the ring: the plane through the six ring carbons (normal from two ring vectors)
      var ring = A.map(function (a, i) { return i; }).filter(function (i) { return A[i].e === 'C' && t.nb[i].filter(function (q) { return A[q].e === 'C'; }).length >= 2 && t.nb[i].filter(function (q) { return A[q].e === 'O'; }).length < 2; });
      var u = v3n([A[ring[0]].p[0], A[ring[0]].p[1], A[ring[0]].p[2]]), w0 = A[ring[1]].p, nrm = v3n(v3x(u, w0)), v = v3n(v3x(nrm, u));
      // long axis along x: the line through the two carboxylate carbons
      var cc = A.map(function (a, i) { return i; }).filter(function (i) { return A[i].e === 'C' && t.nb[i].filter(function (q) { return A[q].e === 'O'; }).length === 2; });
      var ax = v3n([A[cc[0]].p[0] - A[cc[1]].p[0], A[cc[0]].p[1] - A[cc[1]].p[1], A[cc[0]].p[2] - A[cc[1]].p[2]]);
      ax = v3n([v3d(ax, u) * u[0] + v3d(ax, v) * v[0], v3d(ax, u) * u[1] + v3d(ax, v) * v[1], v3d(ax, u) * u[2] + v3d(ax, v) * v[2]]);
      var ay = v3n(v3x(nrm, ax)), s = 24, X0 = 156, Y0 = 162;
      var P = A.map(function (a) { return [X0 + v3d(a.p, ax) * s, Y0 - v3d(a.p, ay) * s]; });
      var P2 = function (i) { return P[i]; };
      // metal positions (schematic): Mg in each chelate pocket, 2.05 A from the phenolate O and the nearer carboxylate O
      var mets = [];
      t.phen.forEach(function (io) {
        var c = t.nb[io][0], oc = null, best = 1e9;
        A.forEach(function (a, j) { if (a.e !== 'O' || j === io || t.phen.indexOf(j) >= 0) return; var d = Math.hypot(P[j][0] - P[io][0], P[j][1] - P[io][1]); if (d < best) { best = d; oc = j; } });
        var mx = (P[io][0] + P[oc][0]) / 2, my = (P[io][1] + P[oc][1]) / 2, half = best / 2, r = 2.05 * s, h = Math.sqrt(Math.max(r * r - half * half, 4));
        var nx = -(P[oc][1] - P[io][1]) / best, ny = (P[oc][0] - P[io][0]) / best;
        if ((mx + nx - X0) * (mx - X0) + (my + ny - Y0) * (my - Y0) < (mx - X0) * (mx - X0) + (my - Y0) * (my - Y0)) { nx = -nx; ny = -ny; } // point away from the ring centre
        mets.push({ e: 'Mg', x: mx + nx * h, y: my + ny * h, to: [io, oc], chel: true });
        // the phenolate's other two neighbours: one more Mg2+ and one Li+, drawn as pale stubs (each is shared with neighbouring ions)
        var ox = P[io][0] - P[c][0], oy = P[io][1] - P[c][1], L = Math.hypot(ox, oy); ox /= L; oy /= L;
        var side = (ox * (Y0 - P[io][1]) - oy * (X0 - P[io][0])) > 0 ? 1 : -1;
        mets.push({ e: 'Li', x: P[io][0] + (ox * 0.5 - oy * 0.86 * side) * 1.9 * s, y: P[io][1] + (oy * 0.5 + ox * 0.86 * side) * 1.9 * s, to: [io], stub: true });
        mets.push({ e: 'Mg', x: P[io][0] + ox * 1.6 * s + nx * 0.2 * s, y: P[io][1] + oy * 1.6 * s + ny * 0.2 * s, to: [io], stub: true, far: true });
      });
      t.tpl.bonds.forEach(function (b) { el('line', { x1: P2(b[0])[0], y1: P2(b[0])[1], x2: P2(b[1])[0], y2: P2(b[1])[1], stroke: '#7A8690', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-opacity': '.85' }, flat); });
      mets.forEach(function (m) { m.to.forEach(function (j) { el('line', { x1: m.x, y1: m.y, x2: P[j][0], y2: P[j][1], stroke: m.e === 'Mg' ? '#3e9e45' : '#d39b10', 'stroke-width': 1.6, 'stroke-dasharray': '3 3' }, flat); }); });
      A.forEach(function (a, i) {
        el('circle', { cx: P[i][0], cy: P[i][1], r: M3_R[a.e] * s, fill: 'url(#' + pfx + '-' + a.e + ')', stroke: 'rgba(0,0,0,.35)', 'stroke-width': .6 }, flat);
        if (t.phen.indexOf(i) >= 0) el('circle', { cx: P[i][0], cy: P[i][1], r: M3_R.O * s + 4, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }, flat);
      });
      mets.forEach(function (m) {
        el('circle', { cx: m.x, cy: m.y, r: (m.e === 'Mg' ? 0.5 : 0.45) * s * (m.stub ? 0.8 : 1), fill: 'url(#' + pfx + '-' + m.e + ')', stroke: 'rgba(0,0,0,.35)', 'stroke-width': .6, 'fill-opacity': m.stub ? 0.75 : 1 }, flat);
      });
      var stubs = mets.filter(function (m) { return m.stub; });
      // the counts, on the right
      var R = [['Mg²⁺: MgO₆ octahedron', 'strong'], ['4 phenolate O + 2 carboxylate O', ''], ['Li⁺: LiO₄ tetrahedron', 'strong'], ['3 carboxylate O + 1 phenolate O', ''], ['each phenolate O (ringed):', 'strong'], ['1 Li⁺ + 2 Mg²⁺', ''], ['each –CO₂⁻: 3 Li⁺ + 1 Mg²⁺', ''], ['each §p§-DHT⁴⁻: 8 Li⁺ + 4 Mg²⁺', ''], ['bright: Mg²⁺ closing a chelate', 'm'], ['pale: the other Li⁺ and Mg²⁺', 'm']];
      R.forEach(function (r, i) { txt(flat, 314, 70 + i * 20 + (i > 7 ? 8 : 0), r[0], r[1] === 'm' ? '' : r[1], 'start', r[1] === 'm' ? { style: 'fill:var(--muted)' } : undefined); });
      return stubs.length;
    }
    function build() {
      S.clear(); clear(flat);
      var is3 = cur !== 'mg';
      stage.style.display = is3 ? '' : 'none'; flat.style.display = is3 ? 'none' : '';
      if (is3) {
        var t = tplOf(cur);
        S.add(t.tpl, { hl: t.phen });
        V.scale = Math.min(34, 132 / extent(t));
        setSvgText(hint, 'drag to turn it; computed for this page');
      } else {
        drawFlat();
        setSvgText(hint, 'schematic; bonding counts from the crystal structure, positions not to scale');
      }
      setSvgText(name, INFO[cur][0]); setSvgText(sub, INFO[cur][1]);
      read.innerHTML = INFO[cur][2] + ' <span style="color:var(--muted)">Sources: ' + INFO[cur][3] + '.</span>';
      Array.prototype.forEach.call(btns, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mol') === cur)); });
      draw();
    }
    function draw() { if (cur !== 'mg') S.draw(V); }
    function tick(dt) { if (dt === 0 || cur === 'mg') return; if (!V.held) V.yaw += dt * 0.5; draw(); }
    var st = null;
    Array.prototype.forEach.call(btns, function (b) { on(b, 'click', function () { cur = b.getAttribute('data-mol'); if (st) st.go(cur === 'pdht' ? 0 : cur === 'mg' ? 1 : 2); else build(); }); });
    m3drag(svg, V, draw);
    st = steps(fig, [
      { text: 'The organic ion of Li₄-<i>p</i>-DHT and Mg(Li₂)-<i>p</i>-DHT, <i>p</i>-DHT⁴⁻. The two ringed atoms are the <b>phenolate oxygens</b>, the redox centre; each sits next to a carboxylate.', on: function () { cur = 'pdht'; build(); } },
      { text: 'In Mg(Li₂)-<i>p</i>-DHT, magnesium does not sit only at the carboxylates. Each Mg²⁺ is chelated by a phenolate oxygen and its neighbouring carboxylate oxygen (of two organic ions), and each phenolate oxygen is bonded to one Li⁺ and two Mg²⁺.', on: function () { cur = 'mg'; build(); } },
      { text: 'Changing the organic ion: the <i>ortho</i> isomer, or carboxylates held off the ring by a CH₂ spacer. Each raises the potential. Try the buttons.', on: function () { if (cur !== 'odht' && cur !== 'pdobda') cur = 'odht'; build(); } }
    ]);
    var loop = anim(fig, tick, { autoplay: true, stepDt: 0.5 });
    bind(fig, loop);
  });

  /* ===== 9.15 Four candidate charge carriers (Faruque et al. 2026, R82, Table 14 and section 7.1) ===== */
  register('f9-15', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var IONS = [
      { s: 'Li', ion: 'Li⁺', q: 3861, E: -3.04, r: 0.76, col: 'var(--cation)', t: 'Lithium: 3861 mAh/g as metal, −3.04 V vs SHE, ion radius 0.76 Å. The most charge per gram and the most negative potential of the four.' },
      { s: 'Na', ion: 'Na⁺', q: 1165, E: -2.71, r: 1.02, col: '#C46BD1', t: 'Sodium: 1165 mAh/g, −2.71 V, 1.02 Å. About 0.3 V less negative than lithium and a larger ion, but abundant; Na⁺ does not intercalate well into graphite, so hard carbon is its most promising negative electrode.' },
      { s: 'K', ion: 'K⁺', q: 685, E: -2.93, r: 1.38, col: '#B5651D', t: 'Potassium: 685 mAh/g, −2.93 V, 1.38 Å. High voltage and fast ionic diffusion, but the large ion strains the hosts.' },
      { s: 'Ca', ion: 'Ca²⁺', q: 1337, E: -2.87, r: 1.00, col: '#2E8A62', t: 'Calcium: 1337 mAh/g, −2.87 V, 1.00 Å. Two electrons per ion lift its charge per gram above sodium’s.' }
    ];
    var sel = null, groups = [];
    // panel 1: charge per gram of metal
    var bx0 = 40, by0 = 210, by1 = 50, bw = 34, gap = 14, QM = 4000, BY = function (q) { return by0 - q / QM * (by0 - by1); };
    txt(g, 16, 24, 'charge per gram of metal, mAh/g', 'strong', 'start');
    el('line', { x1: bx0 - 6, x2: bx0 + 4 * (bw + gap), y1: by0, y2: by0, stroke: 'var(--line-2)' }, g);
    // panel 2: potential ladder
    var lx = 270, lx1 = 310, ly0 = 220, ly1 = 50, EY = function (E) { return ly1 + (E - -3.10) / (-2.65 - -3.10) * (ly0 - ly1); };
    txt(g, 236, 24, 'E° vs SHE', 'strong', 'start');
    el('line', { x1: lx, x2: lx, y1: ly1 - 8, y2: ly0 + 8, stroke: 'var(--line-2)' }, g);
    [-3.0, -2.9, -2.8, -2.7].forEach(function (E) { el('line', { x1: lx - 4, x2: lx, y1: EY(E), y2: EY(E), stroke: 'var(--line-2)' }, g); txt(g, lx - 7, EY(E) + 4, E.toFixed(1).replace('-', '−') + ' V', '', 'end'); });
    txt(g, lx + 4, ly0 + 22, 'less negative ↓', '', 'start');
    // panel 3: ions to scale
    var cx0 = 380, scale = 20; // px per angstrom of radius
    txt(g, 392, 24, 'ions to scale', 'strong', 'start');
    IONS.forEach(function (o, i) {
      var grp = el('g', { tabindex: 0, role: 'button', 'aria-label': o.s + ', ' + o.q + ' milliampere hours per gram, ' + o.E + ' volts', style: 'cursor:pointer' }, g);
      var x = bx0 + i * (bw + gap);
      var bar = el('rect', { x: x, y: BY(o.q), width: bw, height: by0 - BY(o.q), rx: 3, fill: o.col, 'fill-opacity': .8 }, grp);
      txt(grp, x + bw / 2, BY(o.q) - 6, String(o.q), '', 'middle'); txt(grp, x + bw / 2, by0 + 16, o.s, 'strong', 'middle');
      el('line', { x1: lx, x2: lx1, y1: EY(o.E), y2: EY(o.E), stroke: o.col, 'stroke-width': 2.4 }, grp);
      txt(grp, lx1 + 4, EY(o.E) + 4, o.s + '  ' + o.E.toFixed(2).replace('-', '−'), 'strong', 'start');
      var cy = 60 + i * 54;
      var c = el('circle', { cx: cx0 + 40, cy: cy, r: o.r * scale, fill: o.col, stroke: '#fff', 'stroke-width': 1.2 }, grp);
      txt(grp, cx0 + 40, cy + 4, o.ion, 'strong', 'middle', { style: 'fill:#fff' });
      txt(grp, cx0 + 76, cy + 4, o.r.toFixed(2) + ' Å', '', 'start');
      groups.push({ o: o, bar: bar, c: c });
      pressable(grp, function () { sel = o; place(); });
    });
    badge(g, bx0 + bw + 22, BY(3861) + 6, 1); badge(g, lx - 30, ly1 - 4, 2); badge(g, 506, 38, 3);
    function place() {
      groups.forEach(function (gg) { var on1 = sel === gg.o; gg.bar.setAttribute('stroke', on1 ? 'var(--text)' : 'none'); gg.bar.setAttribute('stroke-width', 1.5); gg.c.setAttribute('stroke', on1 ? 'var(--text)' : '#fff'); });
      read.innerHTML = sel ? sel.t : 'Four metals compared, as a 2026 review tabulates them. Tap a bar, a rung or an ion.';
    }
    steps(fig, [
      { text: '<b>Charge per gram</b> of the metal: lithium 3861 mAh/g, far ahead; calcium gives two electrons per ion and comes second.' },
      { text: '<b>Potential</b> against the standard hydrogen electrode: lithium lowest at −3.04 V; sodium is about 0.3 V less negative, which costs cell voltage.' },
      { text: '<b>Size</b>: Na⁺ and Ca²⁺ are about a third larger than Li⁺, K⁺ nearly twice as large, which is why hosts that serve lithium may not serve them.' }
    ]);
    place();
  });
