  /* =================================================================
     Figure 7.3: the ingredients of commercial electrolytes compared.
     Salts after Henderson 2014 (R53), section 1.3 and Tables 1.1 and 1.7;
     solvents after Ue et al. 2014 (R54), Table 2.1. Ratings are the page's
     summary of the source's words; every cell's wording is in SALTS below.
     ================================================================= */
  var SALT_ASPECTS = ['water', 'heat', 'Al', 'hazard', 'use'];
  var SALT_HEAD = { water: ['resists', 'water'], heat: ['stable', 'to heat'], Al: ['protects', 'Al foil'], hazard: ['safe to', 'handle'], use: ['used in', 'Li-ion'] };
  var SALTS = [ // r: 2 good, 1 partly, 0 poor, -1 not stated in the source
    { n: 'LiPF₆', k: 15.3, r: { water: 0, heat: 0, Al: 2, hazard: -1, use: 2 },
      t: { water: 'The P–F bond is labile, so the salt readily reacts with water (hydrolysis); HF in LiPF₆ electrolytes is one of the principal concerns about its use.', heat: 'Relatively low thermal stability.', Al: 'Forms a stable interface with the aluminium current collector at high potential.', hazard: 'The source raises HF as a concern for cell performance, not as a handling rating.', use: 'Used almost exclusively in commercial Li-ion batteries: the best balance of the properties a salt needs.' } },
    { n: 'LiBF₄', k: 9.5, r: { water: 1, heat: 2, Al: 2, hazard: -1, use: 1 },
      t: { water: 'The B–F bond is less labile than P–F, so it is less susceptible to hydrolysis than LiPF₆.', heat: 'More thermally stable than LiPF₆.', Al: 'Its electrolytes passivate aluminium well at high potential.', hazard: 'Not rated in the source.', use: 'Its significantly lower conductivity has been a major impediment to commercial use; it can serve as an additive to LiPF₆ electrolytes.' } },
    { n: 'LiClO₄', k: 13.5, r: { water: -1, heat: 2, Al: 1, hazard: 0, use: 0 },
      t: { water: 'Not rated in the source.', heat: 'High thermal and electrochemical stability.', Al: 'Its electrolytes do not passivate aluminium as well as those with LiPF₆.', hazard: 'Chlorine in its highest oxidation state makes the anion a strong oxidant and the salt a potential explosive.', use: 'Widely used in research in the 1970s and 1980s, but the explosion risk has largely precluded commercial use.' } },
    { n: 'LiAsF₆', k: 14.8, r: { water: -1, heat: -1, Al: -1, hazard: 0, use: 0 },
      t: { water: 'Not rated separately; it shares many properties with LiPF₆.', heat: 'Not rated separately; it shares many properties with LiPF₆.', Al: 'Not rated separately.', hazard: 'As(V) is not toxic, but the As(III) and As(0) that electrochemical reduction might form are highly toxic.', use: 'Potential hazards have largely prevented commercial use.' } },
    { n: 'LiTFSI', k: 12.6, r: { water: 2, heat: 2, Al: 0, hazard: -1, use: -1 },
      t: { water: 'Not susceptible to hydrolysis: its C–F bonds are very stable.', heat: 'High thermal stability.', Al: 'Dilute solutions in carbonate-type solvents strongly corrode aluminium at high potential (aluminium repassivation potential 3.7 V vs Li in PC:DME, against above 5 V for LiPF₆), though not in ionic liquids or at very high concentration.', hazard: 'Not rated in the source.', use: 'First of interest for polymer electrolytes, where it stays amorphous with PEO; its commercial status is not given here.' } },
    { n: 'LiSO₃CF₃', k: 6.1, r: { water: 2, heat: 2, Al: 0, hazard: -1, use: 0 },
      t: { water: 'Not susceptible to hydrolysis.', heat: 'High thermal stability.', Al: 'Corrodes the aluminium current collector at high potential.', hazard: 'Not rated in the source.', use: 'Notably less conductive; used widely in research, especially in polymer electrolytes, but not in commercial Li-ion batteries.' } }
  ];
  var SOLV = [ // Ue et al. 2014, Table 2.1; EC permittivity and viscosity at 40 °C
    { n: 'EC', cyc: true, eps: 90, eta: 1.9, mp: 36, bp: 238, fp: 143, eox: 6.2 },
    { n: 'PC', cyc: true, eps: 65, eta: 2.5, mp: -49, bp: 242, fp: 138, eox: 6.6 },
    { n: 'DMC', cyc: false, eps: 3.1, eta: 0.59, mp: 5, bp: 90, fp: 17, eox: 6.5 },
    { n: 'EMC', cyc: false, eps: 3.0, eta: 0.65, mp: -53, bp: 108, fp: 23, eox: 6.7 },
    { n: 'DEC', cyc: false, eps: 2.8, eta: 0.75, mp: -74, bp: 127, fp: 25, eox: 6.7 }
  ];
  var ASP = {
    eps: { lab: 'relative permittivity', u: '', lo: 0, hi: 100, d: 1, note: 'Pulls a salt apart into free ions: the cyclic carbonates are about 20 to 30 times higher than the linear ones. EC is measured at 40 °C, because it is solid at 25 °C.' },
    eta: { lab: 'viscosity', u: ' mPa s', lo: 0, hi: 3, d: 2, note: 'Lower is better: ions move faster through a runnier liquid. The linear carbonates flow two and a half to four times more easily. EC at 40 °C.' },
    mp: { lab: 'melting point', u: ' °C', lo: -80, hi: 50, d: 0, note: 'EC melts at 36 °C, so it is a solid at room temperature on its own; mixing it with linear carbonates keeps the liquid liquid well below 0 °C.' },
    bp: { lab: 'boiling point', u: ' °C', lo: 0, hi: 260, d: 0, note: 'The linear carbonates boil at 90 to 127 °C, the cyclic ones above 230 °C.' },
    fp: { lab: 'flash point', u: ' °C', lo: 0, hi: 160, d: 0, note: 'The temperature above which the vapour can be ignited. The runny linear carbonates flash at 17 to 25 °C, near room temperature; the cyclic ones above 130 °C.' },
    eox: { lab: 'oxidation limit', u: ' V vs Li', lo: 5, hi: 7, d: 1, note: 'The axis starts at 5 V. Measured on glassy carbon with a tetraalkylammonium salt (5 mV/s, 1 mA/cm² criterion). All are reduced at about 0 V. Henderson warns that a window measured on inert carbon is not a clear indicator of stability against real electrode materials.' }
  };
  register('f7-3', function (fig) {
    var svg = fig.querySelector('svg'), read = fig.querySelector('.readout'), vb = fig.querySelectorAll('button[data-view]'), ab = fig.querySelectorAll('button[data-asp]'), arow = fig.querySelector('.asp-row');
    var gS = el('g', {}, svg), gV = el('g', {}, svg), view = 's', asp = 'fp', sel = null;
    // ---------- the salts ----------
    var rx = 18, cK = 96, cw = 64, c0 = 228, ry0 = 74, rh = 34;
    txt(gS, rx, 30, 'salt, 1 M', 'strong', 'start');
    txt(gS, cK, 22, 'conductivity', 'strong', 'start'); txt(gS, cK, 36, 'mS/cm, PC:DME', '', 'start');
    SALT_ASPECTS.forEach(function (a, j) { var x = c0 + j * cw; txt(gS, x, 22, SALT_HEAD[a][0], 'strong', 'middle'); txt(gS, x, 36, SALT_HEAD[a][1], 'strong', 'middle'); });
    var cells = [];
    SALTS.forEach(function (s, i) {
      var y = ry0 + i * rh;
      if (i % 2 === 0) el('rect', { x: 10, y: y - rh / 2, width: 500, height: rh, rx: 6, fill: 'rgba(234,240,236,.035)' }, gS);
      txt(gS, rx, y + 5, s.n, s.n === 'LiPF₆' ? 'amber strong' : 'strong', 'start');
      el('rect', { x: cK, y: y - 6, width: 60 * s.k / 16, height: 12, rx: 3, fill: 'var(--cyan)', 'fill-opacity': '.7' }, gS);
      txt(gS, cK + 60 * s.k / 16 + 5, y + 4, s.k.toFixed(1), '', 'start');
      SALT_ASPECTS.forEach(function (a, j) {
        var x = c0 + j * cw, r = s.r[a], c = el('g', { tabindex: 0, role: 'button', 'aria-label': s.n + ', ' + SALT_HEAD[a].join(' '), style: 'cursor:pointer' }, gS);
        el('circle', { cx: x, cy: y, r: 14, fill: 'transparent' }, c);
        var ring = el('circle', { cx: x, cy: y, r: 13, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2, 'stroke-opacity': 0 }, c);
        if (r === 2) el('circle', { cx: x, cy: y, r: 8, fill: 'var(--cyan)' }, c);
        else if (r === 1) { el('circle', { cx: x, cy: y, r: 8, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.6 }, c); el('path', { d: 'M' + x + ',' + (y - 8) + ' A8,8 0 0 0 ' + x + ',' + (y + 8) + ' Z', fill: 'var(--amber)' }, c); }
        else if (r === 0) { el('circle', { cx: x, cy: y, r: 8, fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.8 }, c); el('path', { d: 'M' + (x - 4.5) + ',' + (y - 4.5) + ' L' + (x + 4.5) + ',' + (y + 4.5) + ' M' + (x + 4.5) + ',' + (y - 4.5) + ' L' + (x - 4.5) + ',' + (y + 4.5), stroke: 'var(--heat)', 'stroke-width': 1.8 }, c); }
        else el('line', { x1: x - 5, x2: x + 5, y1: y, y2: y, stroke: 'var(--muted)', 'stroke-width': 1.6 }, c);
        cells.push({ s: s, a: a, ring: ring });
        pressable(c, function () { sel = { s: s, a: a }; placeS(); });
      });
    });
    // legend
    var ly = ry0 + SALTS.length * rh + 8;
    [[2, 'good'], [1, 'partly'], [0, 'poor'], [-1, 'not rated']].forEach(function (L, j) {
      var x = 30 + j * 118, y = ly;
      if (L[0] === 2) el('circle', { cx: x, cy: y, r: 7, fill: 'var(--cyan)' }, gS);
      else if (L[0] === 1) { el('circle', { cx: x, cy: y, r: 7, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 1.6 }, gS); el('path', { d: 'M' + x + ',' + (y - 7) + ' A7,7 0 0 0 ' + x + ',' + (y + 7) + ' Z', fill: 'var(--amber)' }, gS); }
      else if (L[0] === 0) { el('circle', { cx: x, cy: y, r: 7, fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.8 }, gS); el('path', { d: 'M' + (x - 4) + ',' + (y - 4) + ' L' + (x + 4) + ',' + (y + 4) + ' M' + (x + 4) + ',' + (y - 4) + ' L' + (x - 4) + ',' + (y + 4), stroke: 'var(--heat)', 'stroke-width': 1.8 }, gS); }
      else el('line', { x1: x - 5, x2: x + 5, y1: y, y2: y, stroke: 'var(--muted)', 'stroke-width': 1.6 }, gS);
      txt(gS, x + 12, y + 4, L[1], '', 'start');
    });
    badge(gS, 196, ry0 + 5 * rh, 1); badge(gS, c0 + 2 * cw + 28, ry0 + 5 * rh - 18, 2);
    function placeS() {
      cells.forEach(function (c) { c.ring.setAttribute('stroke-opacity', sel && c.s === sel.s && c.a === sel.a ? 1 : 0); });
      if (!sel) { read.innerHTML = 'Tap any symbol to read what the source says. Conductivities are for 1 M of each salt in PC:DME (50:50 by volume) at 25 °C, Henderson’s Table 1.1; LiPF₆ is the highest of the six.'; return; }
      var r = sel.s.r[sel.a];
      read.innerHTML = '<b>' + sel.s.n + ', ' + SALT_HEAD[sel.a].join(' ') + '</b> (' + (r === 2 ? 'good' : r === 1 ? 'partly' : r === 0 ? 'poor' : 'not rated') + '): ' + sel.s.t[sel.a] + ' Conductivity, 1 M in PC:DME at 25 °C: ' + sel.s.k.toFixed(1) + ' mS/cm.';
    }
    // ---------- the solvents ----------
    var bx0 = 96, bx1 = 470, by0 = 64, bh = 30, vT = txt(gV, 260, 26, '', 'strong', 'middle'), axG = el('g', {}, gV), bars = [];
    SOLV.forEach(function (s, i) {
      var y = by0 + i * (bh + 14);
      txt(gV, 20, y + bh / 2 + 5, s.n, 'strong', 'start'); txt(gV, 58, y + bh / 2 + 5, s.cyc ? 'cyclic' : 'linear', s.cyc ? 'cyan' : 'amber', 'start');
      bars.push({ s: s, r: el('rect', { y: y, height: bh, rx: 4, fill: s.cyc ? 'var(--cyan)' : 'var(--amber)', 'fill-opacity': '.75' }, gV), t: txt(gV, 0, y + bh / 2 + 5, '', 'strong', 'start') });
    });
    badge(gV, 494, by0 + 10, 3);
    function placeV() {
      var A = ASP[asp], X = function (v) { return bx0 + (v - A.lo) / (A.hi - A.lo) * (bx1 - bx0); };
      setSvgText(vT, A.lab + (A.u ? ',' + A.u : ''));
      clear(axG);
      var z = X(Math.max(A.lo, 0)); el('line', { x1: z, x2: z, y1: by0 - 8, y2: by0 + 5 * (bh + 14) - 6, stroke: 'var(--line-2)' }, axG);
      var tk = niceStep(A.hi - A.lo, 5); for (var v = Math.ceil(A.lo / tk) * tk; v <= A.hi + 1e-9; v += tk) { txt(axG, X(v), by0 + 5 * (bh + 14) + 10, String(Math.round(v * 100) / 100).replace('-', '−'), '', 'middle'); el('line', { x1: X(v), x2: X(v), y1: by0 - 8, y2: by0 + 5 * (bh + 14) - 6, stroke: 'var(--line)', 'stroke-dasharray': '2 5' }, axG); }
      bars.forEach(function (b) {
        var v = b.s[asp], base = Math.max(A.lo, Math.min(0, A.hi)), xa = X(asp === 'mp' ? 0 : A.lo), xb = X(v);
        if (asp !== 'mp') xa = X(A.lo);
        b.r.setAttribute('x', Math.min(xa, xb)); b.r.setAttribute('width', Math.max(2, Math.abs(xb - xa)));
        var lab = (b.s.n === 'EC' && (asp === 'eps' || asp === 'eta') ? v + '*' : String(v)).replace('-', '−') + A.u;
        b.t.setAttribute('x', Math.max(xa, xb) + 6); b.t.setAttribute('text-anchor', 'start');
        if (Math.max(xa, xb) + 6 + lab.length * 6.5 > 514) { b.t.setAttribute('x', Math.max(xa, xb) - 6); b.t.setAttribute('text-anchor', 'end'); b.t.setAttribute('class', 'lbl strong tag'); } else b.t.setAttribute('class', 'lbl strong');
        setSvgText(b.t, lab);
      });
      read.innerHTML = '<b>' + A.lab.charAt(0).toUpperCase() + A.lab.slice(1) + '.</b> ' + A.note + ' Values from Ue and co-workers’ Table 2.1' + (asp === 'eps' || asp === 'eta' ? ' (* EC at 40 °C).' : '.');
      Array.prototype.forEach.call(ab, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-asp') === asp)); });
    }
    function setView(v) {
      view = v; gS.style.display = v === 's' ? '' : 'none'; gV.style.display = v === 'v' ? '' : 'none'; arow.style.display = v === 'v' ? '' : 'none';
      Array.prototype.forEach.call(vb, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
      if (v === 's') placeS(); else placeV();
    }
    var st = null;
    Array.prototype.forEach.call(vb, function (b) { on(b, 'click', function () { var v = b.getAttribute('data-view'); if (st) st.go(v === 'v' ? 2 : 0); else setView(v); }); });
    Array.prototype.forEach.call(ab, function (b) { on(b, 'click', function () { asp = b.getAttribute('data-asp'); placeV(); }); });
    setView('s');
    st = steps(fig, [
      { text: 'Six lithium salts that have been used in electrolytes, and how each scores on the requirements Henderson lists. Failing any one of them rules a salt out of practical use. The bars give the conductivity of each at 1 M: LiPF₆ leads.', on: function () { setView('s'); sel = { s: SALTS[0], a: 'water' }; placeS(); } },
      { text: 'No salt scores well everywhere. LiPF₆ leads on conductivity, protects the aluminium and forms a good SEI, and loses on water and heat. The others each fail somewhere else: LiClO₄ can explode, LiAsF₆ can turn toxic, LiTFSI and the triflate eat the aluminium foil.', on: function () { setView('s'); sel = { s: SALTS[4], a: 'Al' }; placeS(); } },
      { text: 'Now the solvents. Pick an aspect: the cyclic carbonates (cyan) dissolve salts and are hard to ignite but are thick or solid; the linear ones (gold) flow easily and, except DMC, stay liquid in the cold, but flash near room temperature. A commercial electrolyte mixes the two.', on: function () { setView('v'); } }
    ]);
  });
