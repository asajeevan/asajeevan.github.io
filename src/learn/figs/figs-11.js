  /* =================================================================
     Module 11: testing and diagnosis. Impedance computed from the
     Randles circuit of Bard, Faulkner and White (B2) 11.3 and 11.4 with
     the assignments of Winter and Brodd 2004 (R1) 1.5; GITT from
     Weppner and Huggins 1977 (R38) eq. 4; cell formats after Murray,
     Hall and Dahn 2019 (R21) and Goodenough and Park 2013 (R6); the
     techniques after R1 1.5, Tarascon and Armand 2001 (R2) and Fichtner
     et al. 2022 (R48).
     ================================================================= */

  /* ===== 11.2 Impedance, frequency by frequency ===== */
  register('f11-2', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout'), rs = fig.querySelector('.rct'), rv = fig.querySelector('.rct-val');
    var Ru = 5, Cd = 20e-6, sigma = 6, Rct = 20;
    var x0 = 60, y0 = 230, sc = 4.2; // px per ohm, same on both axes so the semicircle is round
    var X = function (re) { return x0 + re * sc; }, Y = function (im) { return y0 - im * sc; };
    el('line', { x1: x0, y1: y0, x2: 500, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: 40, stroke: 'var(--line-2)' }, g);
    [0, 20, 40, 60, 80, 100].forEach(function (r) { el('line', { x1: X(r), x2: X(r), y1: y0, y2: y0 + 5, stroke: 'var(--line-2)' }, g); txt(g, X(r), y0 + 18, r, '', 'middle'); });
    [20, 40].forEach(function (r) { el('line', { x1: x0 - 5, x2: x0, y1: Y(r), y2: Y(r), stroke: 'var(--line-2)' }, g); txt(g, x0 - 8, Y(r) + 4, r, '', 'end'); });
    txt(g, 500, y0 + 34, 'real part Z′, Ω', '', 'end'); txt(g, x0 + 6, 40, '−Z″, Ω', '', 'start');
    var path = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), dot = el('circle', { r: 6, fill: 'var(--text)', stroke: 'var(--bg)', 'stroke-width': 1.5 }, g);
    var peak = el('circle', { r: 4, fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.6 }, g), peakT = txt(g, 0, 0, '', 'cyan', 'middle');
    var fT = txt(g, 498, 58, '', 'strong', 'end');
    // the equivalent circuit, top right
    var cx = 318, cy = 176, cg = el('g', {}, g);
    function box(x, w, lab) { var r = el('rect', { x: x, y: cy - 10, width: w, height: 20, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, cg); var t = txt(cg, x + w / 2, cy + 4, lab, 'strong', 'middle'); return r; }
    el('line', { x1: cx - 20, x2: cx + 196, y1: cy, y2: cy, stroke: 'var(--muted)' }, cg);
    var eRu = box(cx - 10, 36, 'R_u'), eRct = box(cx + 50, 40, 'R_ct'), eW = box(cx + 136, 36, 'W');
    el('path', { d: 'M' + (cx + 40) + ',' + cy + ' V' + (cy + 26) + ' H' + (cx + 100) + ' V' + cy, fill: 'none', stroke: 'var(--muted)' }, cg);
    var eCd = el('rect', { x: cx + 58, y: cy + 16, width: 24, height: 20, rx: 3, fill: 'var(--panel-2)', stroke: 'var(--line-2)' }, cg); txt(cg, cx + 70, cy + 30, 'C_d', 'strong', 'middle');
    badge(g, X(Ru) - 2, y0 - 22, 1); var b2 = badge(g, 0, 0, 2), b3 = badge(g, 0, 0, 3);
    var w = 7; // log10 of angular frequency; sweeps from high to low
    function Z(om) { var k = P.kineticImpedance(Ru, Rct, Cd, om), wb = P.warburg(sigma, om); return { re: k.re + wb.re, im: k.negIm + wb.negIm }; }
    function render() {
      Rct = +rs.value; setSvgText(rv, Rct + ' Ω');
      var d = ''; for (var k = 0; k <= 240; k++) { var lw = 6 - 7.5 * k / 240, z = Z(Math.pow(10, lw)); if (z.re > 112 || z.im > 46) break; d += (k ? 'L' : 'M') + X(z.re).toFixed(1) + ',' + Y(z.im).toFixed(1); }
      path.setAttribute('d', d);
      var pk = P.semicirclePeak(Rct, Cd), zp = Z(pk.omega);
      peak.setAttribute('cx', X(zp.re)); peak.setAttribute('cy', Y(zp.im)); peakT.setAttribute('x', X(zp.re)); peakT.setAttribute('y', Y(zp.im) - 12); setSvgText(peakT, 'top: f = ' + Math.round(pk.f) + ' Hz');
      b2.setAttribute('transform', 'translate(' + X(Ru + Rct / 2) + ',' + (y0 - 14) + ')');
      var zw = Z(Math.pow(10, 0)); b3.setAttribute('transform', 'translate(' + (Math.min(480, X(zw.re)) + 18) + ',' + (Y(zw.im) + 6) + ')');
      place();
    }
    function place() {
      var om = Math.pow(10, w), z = Z(om); dot.setAttribute('cx', Math.min(X(z.re), 500)); dot.setAttribute('cy', Math.max(Y(z.im), 30));
      var f = om / (2 * Math.PI); setSvgText(fT, 'f = ' + (f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 0 : 1) + ' kHz' : f >= 1 ? f.toFixed(f >= 10 ? 0 : 1) + ' Hz' : f.toFixed(2) + ' Hz'));
      var region = om > 20 / (Rct * Cd) ? 'u' : om > 0.4 * sigma * sigma / (Rct * Rct) ? 'ct' : 'w';
      [eRu, eRct, eCd, eW].forEach(function (e) { e.setAttribute('stroke', 'var(--line-2)'); e.setAttribute('stroke-width', 1); });
      (region === 'u' ? [eRu] : region === 'ct' ? [eRct, eCd] : [eW]).forEach(function (e) { e.setAttribute('stroke', 'var(--amber)'); e.setAttribute('stroke-width', 2.2); });
      read.innerHTML = region === 'u' ? 'High frequency: the double-layer capacitance passes the alternating current almost freely, short-circuiting R_ct, so the cell looks like a plain resistance, <b>R_u = ' + Ru + ' Ω</b>: the electrolyte and contacts.'
        : region === 'ct' ? 'Middle frequencies: the double-layer capacitance and the <b>charge-transfer resistance</b> share the current; together they draw a semicircle of diameter R_ct = ' + Rct + ' Ω, whose top sits at ω = 1/(R_ct C_d).'
          : 'Low frequency: diffusion can no longer keep up, and the <b>Warburg</b> element draws a straight line at 45°.';
    }
    on(rs, 'input', render);
    steps(fig, [
      { text: 'Apply a small alternating voltage and measure the current, frequency by frequency. At <b>high frequency</b> (the dot starts on the left) the plot meets the real axis at the ohmic resistance: electrolyte and contacts. It does not depend on frequency.' },
      { text: 'Lower the frequency and the <b>charge transfer</b> at the interface, in parallel with the double-layer capacitance, draws a <b>semicircle</b>. Its diameter is R_ct; its top lies at ω = 1/(R_ct C_d), that is f = 1/(2π R_ct C_d). Slide R_ct up, as an ageing interface would, and watch it grow.' },
      { text: 'At the lowest frequencies <b>diffusion</b> takes over and the plot becomes a straight line at 45°, the Warburg impedance.' }
    ]);
    render();
    var loop = anim(fig, function (dt) { if (dt === 0) return; w -= dt * 1.1; if (w < -1.5) w = 6; place(); }, { autoplay: true, stepDt: 0.4 });
    if (!motion) { w = Math.log10(1 / (Rct * Cd)); place(); }
    bind(fig, loop);
  });

  /* ===== 11.1 One cell, four measurements ===== */
  register('f11-1', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var P4 = [
      { x: 20, y: 20, t: 'cycling at constant current', q: 'How much charge, at what voltage, for how many cycles?' },
      { x: 270, y: 20, t: 'current interruption', q: 'How big is each kind of polarization?' },
      { x: 20, y: 170, t: 'impedance spectroscopy', q: 'Which resistance: electrolyte, interface or diffusion?' },
      { x: 270, y: 170, t: 'GITT', q: 'How fast does lithium diffuse in the solid?' }
    ];
    var W = 230, H = 130;
    P4.forEach(function (p, i) {
      el('rect', { x: p.x, y: p.y, width: W, height: H, rx: 6, fill: 'var(--panel-2)', 'fill-opacity': '.5', stroke: 'var(--line-2)' }, g);
      txt(g, p.x + 10, p.y + 18, p.t, 'strong', 'start');
      var px = p.x + 16, py = p.y + 100, d = '';
      if (i === 0) { for (var cyc = 0; cyc < 2; cyc++) { var ox = px + cyc * 96; for (var k = 0; k <= 24; k++) { var u = k / 24; d += (cyc + k ? 'L' : 'M') + (ox + u * 48).toFixed(1) + ',' + (py - 62 + 22 * u + 22 * Math.pow(u, 8) + cyc * 3).toFixed(1); } for (k = 0; k <= 24; k++) { u = k / 24; d += 'L' + (ox + 48 + u * 48).toFixed(1) + ',' + (py - 18 - 22 * u - 22 * (1 - Math.pow(1 - u, 8)) + cyc * 3 + 3).toFixed(1); } } }
      if (i === 1) { d = 'M' + px + ',' + (py - 20) + ' H' + (px + 60) + ' V' + (py - 44); for (k = 0; k <= 40; k++) { var lt = k / 40; d += ' L' + (px + 60 + lt * 130) + ',' + (py - 44 - 22 * (1 - Math.exp(-lt * 5)) - 8 * lt); } }
      if (i === 2) { for (k = 0; k <= 50; k++) { var a = Math.PI * k / 50; d += (k ? 'L' : 'M') + (px + 70 - 50 * Math.cos(a)) + ',' + (py - 50 * Math.sin(a) * 0.9); } d += ' L' + (px + 170) + ',' + (py - 60); }
      if (i === 3) { d = 'M' + px + ',' + (py - 30); for (k = 0; k < 3; k++) { var x = px + k * 60; d += ' L' + (x + 8) + ',' + (py - 30 - k * 14) + ' L' + (x + 8) + ',' + (py - 50 - k * 14) + ' L' + (x + 28) + ',' + (py - 56 - k * 14) + ' L' + (x + 28) + ',' + (py - 40 - k * 14) + ' L' + (x + 60) + ',' + (py - 44 - k * 14); } }
      el('path', { d: d, fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2 }, g);
      txt(g, p.x + 10, p.y + H - 6, i === 0 ? 'voltage against time, cycle after cycle' : i === 1 ? 'three clocks (figure 5.4)' : i === 2 ? 'Nyquist plot (figure 11.2)' : 'pulse, rest, repeat (figure 11.3)', '', 'start');
      badge(g, p.x + W - 14, p.y + 14, i + 1);
      p.qText = p.q;
    });
    steps(fig, P4.map(function (p) { return { text: '<b>' + p.t.charAt(0).toUpperCase() + p.t.slice(1) + '</b>. ' + p.q, on: function () { read.innerHTML = 'The question this measurement answers: <b>' + p.q + '</b>'; } }; }));
  });

  /* ===== 11.3 GITT: pulse, rest, repeat ===== */
  register('f11-3', function (fig) {
    var svg = fig.querySelector('svg'), g = svg.querySelector('.plot'), read = fig.querySelector('.readout'), ts = fig.querySelector('.tau'), tv = fig.querySelector('.tau-val');
    var x0 = 62, x1 = 470, y0 = 220, y1 = 40;
    el('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: 'var(--line-2)' }, g); el('line', { x1: x0, y1: y0, x2: x0, y2: y1, stroke: 'var(--line-2)' }, g);
    txt(g, x1, y0 + 18, 'time (schematic)', '', 'end'); txt(g, x0 - 6, y1 - 12, 'cell voltage', '', 'start');
    var curve = el('path', { fill: 'none', stroke: 'var(--amber)', 'stroke-width': 2.4 }, g), cur = el('path', { fill: 'none', stroke: 'var(--cyan)', 'stroke-width': 1.6 }, g);
    var mEt = el('path', { fill: 'none', stroke: 'var(--heat)', 'stroke-width': 1.6 }, g), mEs = el('path', { fill: 'none', stroke: '#C4B5F7', 'stroke-width': 1.6 }, g), mIR = el('path', { fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.4, 'stroke-dasharray': '2 2' }, g);
    var tEt = txt(g, 0, 0, 'ΔE_t', 'heat', 'start'), tEs = txt(g, 0, 0, 'ΔE_s', '', 'start'), tIR = txt(g, 0, 0, 'IR', '', 'end'); tEs.style.fill = '#C4B5F7';
    txt(g, x0 + 4, y0 - 6, 'current pulses', 'cyan', 'start');
    badge(g, 0, 0, 1).setAttribute('transform', 'translate(' + (x0 + 120) + ',' + (y0 - 32) + ')'); var b2 = badge(g, 0, 0, 2), b3 = badge(g, 0, 0, 3);
    function render() {
      var tau = +ts.value; setSvgText(tv, tau + ' s');
      // three pulse-rest steps; during a pulse the voltage rises as sqrt(t) (the regime of eq. 4); at rest it relaxes to a new plateau
      var seg = (x1 - x0) / 3, pw = seg * (tau / 1200) * 0.9 + 18, IR = 10, dEt = 20 * Math.sqrt(tau / 600), dEs = 12 * tau / 600, base = y0 - 40;
      var d = '', c = '';
      for (var k = 0; k < 3; k++) {
        var xs = x0 + k * seg, v0 = base - k * dEs;
        d += (k ? 'L' : 'M') + xs + ',' + v0 + ' L' + xs + ',' + (v0 - IR);
        for (var j = 1; j <= 20; j++) d += ' L' + (xs + pw * j / 20).toFixed(1) + ',' + (v0 - IR - dEt * Math.sqrt(j / 20)).toFixed(1);
        d += ' L' + (xs + pw) + ',' + (v0 - dEt);
        for (j = 1; j <= 20; j++) { var r = j / 20; d += ' L' + (xs + pw + (seg - pw) * r).toFixed(1) + ',' + (v0 - dEs - (dEt - dEs) * Math.exp(-r * 6)).toFixed(1); }
        c += 'M' + xs + ',' + (y0 - 14) + ' V' + (y0 - 24) + ' H' + (xs + pw) + ' V' + (y0 - 14) + ' H' + (xs + seg);
        if (k === 1) {
          mEt.setAttribute('d', 'M' + (xs + pw + 4) + ',' + (v0 - IR) + ' V' + (v0 - IR - dEt));
          mIR.setAttribute('d', 'M' + (xs - 4) + ',' + v0 + ' V' + (v0 - IR));
          mEs.setAttribute('d', 'M' + (xs + seg - 6) + ',' + v0 + ' V' + (v0 - dEs));
          tEt.setAttribute('x', xs + pw + 8); tEt.setAttribute('y', v0 - IR - dEt / 2 + 4); tIR.setAttribute('x', xs - 8); tIR.setAttribute('y', v0 - IR / 2 + 4); tEs.setAttribute('x', xs + seg - 2); tEs.setAttribute('y', v0 + 14);
          b2.setAttribute('transform', 'translate(' + (xs + pw + 44) + ',' + (v0 - IR - dEt / 2) + ')'); b3.setAttribute('transform', 'translate(' + (xs + seg - 30) + ',' + (v0 - dEs - 22) + ')');
        }
      }
      curve.setAttribute('d', d); cur.setAttribute('d', c);
      // D from eq. 4 with illustrative material numbers: mB = 10 mg, VM = 30 cm3/mol, MB = 100 g/mol, S = 1 cm2; dEs = 10 mV, dEt scales as sqrt(tau)
      var dEsV = 0.010 * tau / 600, dEtV = 0.035 * Math.sqrt(tau / 600), D = P.gittD(tau, 0.010, 30, 100, 1, dEsV, dEtV);
      read.innerHTML = 'A current pulse of length τ = <b>' + tau + ' s</b>, then rest. During the pulse the voltage jumps by the IR drop and then rises by ΔE<sub>t</sub>; after the rest it settles ΔE<sub>s</sub> above where it started. Weppner and Huggins: D = (4/πτ)(m<sub>B</sub>V<sub>M</sub>/M<sub>B</sub>S)²(ΔE<sub>s</sub>/ΔE<sub>t</sub>)², here ' + sci(D, 1) + ' cm²/s for illustrative numbers. Because ΔE<sub>s</sub> grows in proportion to τ (the charge passed) and ΔE<sub>t</sub> as √τ, the answer does not depend on the pulse length, as long as τ stays short compared with L²/D.';
    }
    on(ts, 'input', render);
    steps(fig, [
      { text: 'GITT, the galvanostatic intermittent titration technique: a short pulse of constant current, then a rest long enough for the voltage to settle, again and again across the whole state of charge.' },
      { text: 'During the pulse, after the instant IR drop (which is left out), the voltage changes by <b>ΔE<sub>t</sub></b>: the lithium content at the particle surface runs ahead of the interior, because diffusion cannot keep up.' },
      { text: 'At rest it relaxes to a new equilibrium, <b>ΔE<sub>s</sub></b> from the last one: the step in the open-circuit curve. The ratio of the two, with the pulse length and the electrode’s mass, molar volume and area, gives the diffusion coefficient.' }
    ]);
    render();
  });

  /* ===== 11.4 What each technique sees ===== */
  register('f11-4', function (fig) {
    var svg = fig.querySelector('svg'), g = el('g', {}, svg), read = fig.querySelector('.readout');
    var cols = [
      { x: 20, t: 'from outside, cell intact', items: ['charge-discharge curves', 'impedance', 'voltage against temperature', 'pressure and strain'], col: 'var(--cyan)', why: 'Nondestructive: the cell keeps working. Charge-discharge and impedance give capacity, rate behaviour, resistances and state of health; voltage against temperature gives the entropy of the reaction; external pressure sensors can follow the SEI growing.' },
      { x: 187, t: 'inside, while it works', items: ['XANES (X-ray absorption)', 'NMR', 'Mössbauer', 'SEM, in situ'], col: 'var(--amber)', why: 'In situ: plastic lithium-ion cells made it possible to watch the electrodes with X-ray absorption, NMR, Mössbauer spectroscopy and the electron microscope while the cell runs.' },
      { x: 354, t: 'after it is opened', items: ['Raman', 'AFM', 'NMR', 'TEM', 'X-ray absorption'], col: 'var(--heat)', why: 'Post-mortem: tear the cell down and look at its parts with Raman, AFM, NMR, TEM and X-ray absorption. The cell is gone, but you see the damage directly.' }
    ];
    cols.forEach(function (c, i) {
      el('rect', { x: c.x, y: 30, width: 150, height: 190, rx: 6, fill: c.col, 'fill-opacity': '.08', stroke: c.col, 'stroke-opacity': '.6' }, g);
      txt(g, c.x + 75, 20, c.t, 'strong', 'middle');
      c.items.forEach(function (it, j) { txt(g, c.x + 12, 58 + j * 26, '• ' + it, '', 'start'); });
      badge(g, c.x + 136, 206, i + 1);
    });
    txt(g, 260, 244, 'accelerating-rate calorimetry finds where thermal runaway starts (module 12)', '', 'middle');
    steps(fig, cols.map(function (c) { return { text: c.why, on: function () { read.innerHTML = '<b>' + c.t + '</b>: ' + c.items.join(', ') + '.'; } }; }));
  });
