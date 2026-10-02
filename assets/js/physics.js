/* physics.js: the source equations behind the learning pages.
   Every function states the source it implements. The same file runs in the
   browser (window.Physics) and in Node for the tests in tests/physics.test.js.
   Units: SI unless stated. Potentials in volts, temperature in kelvin. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Physics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Constants. F as printed in Winter and Brodd 2004, section 1.2:
     96 485.3 C per equivalent = 26.8015 Ah per equivalent. R and k_B from CODATA. */
  var F = 96485.3;          // C/mol
  var R = 8.314462618;      // J/(mol K)
  var T0 = 298.15;          // K, 25 C
  /* Elementary charge and Avogadro constant from CODATA 2018 (exact since the 2019 SI);
     F = N_A e to within the rounding of the printed F. Vacuum permittivity as printed in
     Bard, Faulkner and White, section 2.2.1 footnote 16 and section 14.3.1 footnote 6. */
  var e = 1.602176634e-19;  // C
  var NA = 6.02214076e23;   // 1/mol
  var eps0 = 8.85419e-12;   // C^2 N^-1 m^-2

  /* ---------- Module 0: charge, field, potential, voltage (Bard, Faulkner and White) ---------- */

  /* Coulomb's law in SI form, Bard, Faulkner and White section 14.3.1 footnote 6:
     F = q q' / (4 pi eps eps0 r^2), newtons, with eps the dielectric constant of the medium
     (1 in vacuum). Positive means repulsion (like charges). */
  function coulombForce(q1, q2, r, epsr) { return q1 * q2 / (4 * Math.PI * (epsr || 1) * eps0 * r * r); }

  /* The electric field is the force exerted on a unit charge (BFW 2.2.1). For a point
     charge q it follows from Coulomb's law: E = q / (4 pi eps0 r^2), V/m, directed away
     from a positive q. */
  function fieldOfCharge(q, r, epsr) { return q / (4 * Math.PI * (epsr || 1) * eps0 * r * r); }

  /* The potential is the work to bring a unit positive charge from infinity,
     phi = -integral of E dot dl (BFW eq. 2.2.1). Integrating the point-charge field from
     infinity to r gives phi = q / (4 pi eps0 r), volts. */
  function potentialOfCharge(q, r, epsr) { return q / (4 * Math.PI * (epsr || 1) * eps0 * r); }

  /* Uniform field between two parallel plates: d(phi)/dx = Delta E / l (BFW eq. 4.2.3).
     Field strength V/m from a potential difference V across a gap l (m). */
  function uniformField(V, l) { return V / l; }

  /* Energy change of a charge q moved across a potential difference dphi: Delta E = q dphi
     (BFW 1.1.4 footnote 9). In joules; divide by e for electron-volts. */
  function energyOfCharge(q, dphi) { return q * dphi; }
  function electronVolts(joules) { return joules / e; }

  /* One electron-volt per electron is 96.5 kJ per mole of electrons (BFW 1.1.4):
     F x 1 V in J/mol. */
  function kJPerMolFromEV(eV) { return F * eV / 1000; }

  /* Faraday's law as BFW eq. 1.1.12: Q = n F N; and current as the rate of charge
     collection, i = dQ/dt = nF dN/dt (eq. 1.1.13). Electrons per second at a current i. */
  function chargeFromMoles(n, N) { return n * F * N; }
  function electronsPerSecond(i) { return i / e; }

  /* Ohm's law in the forms of BFW section 4.2: G = 1/R = kappa A / l (eq. 4.2.6),
     R = rho l / A (eq. 4.2.8); i = E / R. Winter and Brodd 2.2: E = I R in electrolytes. */
  function resistance(rho, l, A) { return rho * l / A; }
  function conductance(kappa, A, l) { return kappa * A / l; }
  function ohmCurrent(V, Rres) { return V / Rres; }
  /* Power P = I V, Goodenough and Park 2013 (introduction). */
  function power(I, V) { return I * V; }

  /* Mobility, BFW eq. 2.3.9: at the terminal velocity the electric force |z| e E equals
     the Stokes drag 6 pi eta r v, so u = |z| e / (6 pi eta r) and v = u E. */
  function mobility(z, eta, r) { return Math.abs(z) * e / (6 * Math.PI * eta * r); }
  function driftVelocity(u, E) { return u * E; }
  function electricForce(z, E) { return Math.abs(z) * e * E; }
  function stokesDrag(eta, r, v) { return 6 * Math.PI * eta * r * v; }
  /* Conductivity from mobilities, BFW eqs. 2.3.10 and 4.2.7: kappa = F sum |z_j| u_j C_j.
     ions: array of {z, u, C} with C in mol per cubic metre and u in m^2/(V s) gives S/m. */
  function conductivity(ions) { var k = 0; for (var i = 0; i < ions.length; i++) k += Math.abs(ions[i].z) * ions[i].u * ions[i].C; return F * k; }

  /* A capacitor, BFW eq. 1.6.4: q = C E. The Helmholtz double layer as a parallel-plate
     capacitor, eq. 14.3.2: C_H = eps eps0 / d per unit area. */
  function capacitorCharge(C, E) { return C * E; }
  function helmholtzCapacitance(epsr, d) { return epsr * eps0 / d; }

  /* The water window on the lithium scale. Standard potentials vs NHE from BFW Table C.1
     (Li+/Li = -3.045 V) and section 2.1.9: hydrogen line E = 0.0 - 0.059 pH, oxygen line
     E = 1.229 - 0.059 pH (eqs. 2.1.66 and 2.1.67). Both lines shift by the same amount, so
     the window keeps its 1.229 V width and slides down 59 mV per pH unit. On the lithium
     scale add 3.045 V. */
  function waterWindowVsLi(pH) {
    var li = -3.045, h = 0.0 - 0.059 * pH, o = 1.229 - 0.059 * pH;
    return { low: h - li, high: o - li, width: o - h, pH: pH };
  }

  /* Faraday's law, Winter and Brodd eq. 7: mass transformed = I t M / (n F). */
  function massTransformed(I, t, M, n) { return I * t * M / (n * F); }

  /* Theoretical specific capacity in mAh/g from Faraday's law: n F / (3.6 M).
     M is the molar mass of the host on the stated mass basis (g/mol). */
  function specificCapacity(n, M) { return n * F / (3.6 * M); }

  /* Electrical energy of a reaction, Winter and Brodd eq. 3: dG = -nFE (J/mol). */
  function reactionEnergy(n, E) { return -n * F * E; }

  /* Nernst equation. Derived from Winter and Brodd eqs. 3 to 5 (their printed
     eq. 6 carries a sign error) and matching Bard, Faulkner and White eq. 2.1.40:
     E = E0 - (RT/nF) ln(A_products / A_reactants). */
  function nernst(E0, n, T, aProducts, aReactants) {
    return E0 - (R * T / (n * F)) * Math.log(aProducts / aReactants);
  }

  /* Cell polarization, Goodenough and Park eqs. 1.1 and 1.2 with eta = I Rb. */
  function dischargeVoltage(Voc, I, Rb) { return Voc - I * Rb; }
  function chargeVoltage(Voc, I, Rb) { return Voc + I * Rb; }

  /* Butler-Volmer, Bard, Faulkner and White eq. 3.4.11 (reduction current positive,
     alpha the cathodic transfer coefficient, eta = E - E_eq, f = F/RT). */
  function butlerVolmer(i0, alpha, eta, T) {
    var f = F / (R * (T || T0));
    return i0 * (Math.exp(-alpha * f * eta) - Math.exp((1 - alpha) * f * eta));
  }
  /* The same equation with oxidation current positive, as battery papers write it. */
  function butlerVolmerAnodic(i0, alpha, eta, T) { return -butlerVolmer(i0, alpha, eta, T); }

  /* Charge-transfer resistance, Bard, Faulkner and White eq. 3.4.13 (one electron)
     and eq. 3.7.25 (n electrons): R_ct = RT / (n F i0). Per unit area if i0 is a density. */
  function chargeTransferResistance(i0, n, T) { return R * (T || T0) / ((n || 1) * F * i0); }

  /* Tafel limit of Butler-Volmer, Bard, Faulkner and White eq. 3.4.15 (cathodic branch):
     eta = (RT/alpha F) ln i0 - (RT/alpha F) ln i, i.e. |eta| = (RT/alpha F) ln(i/i0). */
  function tafelOverpotential(i, i0, alpha, T) { return (R * (T || T0) / (alpha * F)) * Math.log(i / i0); }

  /* Concentration polarization, Winter and Brodd eq. 16 with the Faraday constant
     restored (the printed form omits it): eta_c = (RT/nF) ln(C/C0). */
  function concentrationPolarization(n, T, C, C0) { return (R * (T || T0) / (n * F)) * Math.log(C / C0); }

  /* Energy stored, Goodenough and Park eq. 5: the integral of V over charge.
     Trapezoidal rule over sampled (q, V) arrays. */
  function energyFromCurve(q, V) {
    var e = 0;
    for (var i = 1; i < q.length; i++) e += 0.5 * (V[i] + V[i - 1]) * (q[i] - q[i - 1]);
    return e;
  }

  /* Coulombic efficiency and storage efficiency, Goodenough and Park eqs. 4 and 2 (in %). */
  function coulombicEfficiency(Qdis, Qch) { return 100 * Qdis / Qch; }
  function storageEfficiency(qDis, vDis, qCh, vCh) { return 100 * energyFromCurve(qDis, vDis) / energyFromCurve(qCh, vCh); }

  /* R_u in series with (R_ct parallel C_d): Bard, Faulkner and White eqs. 11.4.9 and 11.4.10.
     Returns the real part and minus the imaginary part. */
  function kineticImpedance(Ru, Rct, Cd, omega) {
    var d = 1 + omega * omega * Cd * Cd * Rct * Rct;
    return { re: Ru + Rct / d, negIm: omega * Cd * Rct * Rct / d };
  }
  /* Peak of the semicircle at omega = 1/(R_ct C_d); f = omega / 2 pi. */
  function semicirclePeak(Rct, Cd) { var w = 1 / (Rct * Cd); return { omega: w, f: w / (2 * Math.PI) }; }

  /* Warburg impedance, Bard, Faulkner and White eq. 11.3.27: sigma w^-1/2 - j sigma w^-1/2. */
  function warburg(sigma, omega) { var s = sigma / Math.sqrt(omega); return { re: s, negIm: s }; }

  /* Diffusion length as Bard, Faulkner and White define it, eq. 4.4.3: (2 D t)^1/2. */
  function diffusionLength(D, t) { return Math.sqrt(2 * D * t); }

  /* GITT, Weppner and Huggins 1977, printed eq. 4 (valid for tau << L^2/D):
     D = (4 / (pi tau)) (mB VM / (MB S))^2 (dEs / dEt)^2, with mB and MB the mass and molar
     mass of the electrode material, VM its molar volume, S the contact area, dEs the change
     of the steady-state voltage and dEt the transient change during the pulse, IR drop
     excluded. Any consistent units (cm, s, g, mol give cm^2/s). */
  function gittD(tau, mB, VM, MB, S, dEs, dEt) { var a = mB * VM / (MB * S); return 4 / (Math.PI * tau) * a * a * (dEs / dEt) * (dEs / dEt); }
  /* Lithium cycling efficiency and the excess needed, Brandt 1994, eqs. 1 and 2:
     E = (Qs - Qex/n) / Qs and R = Qex/Qs = N (1 - E). */
  function lithiumExcess(N, E) { return N * (1 - E); }
  /* SEI growth law, von Kolzenberg, Latz and Horstmann 2020: L ~ t^b; scaling a known value. */
  function powerLawScale(L1, t1, t2, b) { return L1 * Math.pow(t2 / t1, b); }
  /* Module 7, counting the crowd. solventPerIon: moles of solvent per mole of salt when
     c mol of salt are dissolved per litre of a solvent mixture made of volume fractions
     phi_k of liquids with density rho_k (g/cm3) and molar mass M_k (g/mol); the salt's own
     volume is neglected. Densities and molar masses from Ue et al. 2014, Table 2.1. */
  function solventPerIon(parts, c) { var n = 0; parts.forEach(function (p) { n += p.phi * 1000 * p.rho / p.M; }); return n / c; }
  /* mean spacing of the ions of one kind at concentration c (mol/L): the edge of the cube each one has to itself, in m */
  function meanSpacing(c) { return Math.cbrt(1 / (c * 1000 * NA)); }
  /* the field in the bulk electrolyte at current density i (A/m2) and conductivity kappa (S/m): Ohm's law, E = i/kappa, V/m */
  function bulkField(i, kappa) { return i / kappa; }
  /* the mean velocity of the lithium ions once the steady state is reached, when every bit of
     current is carried by lithium (the anions are blocked at both electrodes): flux i/F over
     concentration c (mol/m3), m/s */
  function meanIonVelocity(i, c) { return i / (F * c); }

  /* Series and parallel arithmetic, Goodenough and Park: series adds voltage,
     parallel adds capacity. */

  /* ---- Module 5, charge and discharge in detail ---- */
  /* Charge passed at constant current, Q = I t (A, s -> C); the C-rate current for a
     capacity Q (Ah): 1C passes the full nominal charge in one hour (Olson et al. 2023, section 4.1). */
  function chargePassed(I, t) { return I * t; }
  function cRateCurrent(Qah, c) { return Qah * c; }
  /* Open-circuit potential of LiyFePO4 vs Li, the fit of Safari and Delacourt 2011, eq. 10, to the
     average of the C/100 charge and discharge curves; y is the lithium content at the surface. */
  function lfpOcp(y) {
    var s = 1 - y;
    return 3.4323 - 0.8428 * Math.exp(-80.2493 * Math.pow(s, 1.3198)) - 3.247e-6 * Math.exp(20.2645 * Math.pow(s, 3.8003)) + 3.2482e-6 * Math.exp(20.2646 * Math.pow(s, 3.7995));
  }
  /* Concentration-dependent solid diffusion coefficient of Safari and Delacourt eq. 12 (m2/s). */
  function lfpDiffusion(ybar) { return 1.184e-18 / Math.pow(1 + ybar, 1.6); }

  /* The resistive-reactant model of a LiFePO4 electrode against lithium, after Safari and
     Delacourt 2011 (eqs. 2 to 12 and Table I, case 1). Four groups of identical particles
     (radius 36.5 nm) differ only in the contact resistance Rc between particle and conductive
     matrix. Inside each group: the three-parameter polynomial approximation for diffusion
     (eqs. 2 to 4) with D = D0/(1 + ybar)^1.6 (eq. 12); at the surface Butler-Volmer kinetics with
     beta = 0.5 (eq. 5) and the rate constant of eq. 11; the particle sees the matrix potential less
     Rc i (eq. 7); the groups share the total current (eq. 8); the lithium counter electrode follows
     Butler-Volmer with i0 = 1.90 mA/cm2 (eq. 9). Current I > 0 is charge (delithiation), A per m2
     of separator. Returns a stepper used by figure 5.7 and the tests. */
  function lfpElectrode(opts) {
    opts = opts || {};
    var Rp = 36.5e-9, cmax = 22806, L = 70e-6, epsT = 0.43, c = 1000, D0 = 1.184e-18, p = 1.6, i0a = 19.0, Tk = 298.15;
    var f = F / (R * Tk), frac = opts.frac || [0.25, 0.62, 0.08, 0.05], Rc = opts.Rc || [0.08, 2.88, 7.81, 36.99];
    var aL = frac.map(function (fr) { return 3 * epsT * fr / Rp * L; });
    var oneC = epsT * L * cmax * F / 3600; // A/m2 for one hour on the theoretical capacity
    var y0 = opts.y0 === undefined ? 0.005 : opts.y0;
    var g = frac.map(function () { return { y: y0, q: 0, i: 0, ys: y0 }; });
    function kc(I) { var a = Math.min(Math.abs(I), 20); return Math.max(1e-15, -4.3e-16 * a * a + 2e-14 * a + 1.1e-14); }
    function ysOf(k, i) { var d = i * Rp / (F * D0 * cmax), w = Math.pow(1 + g[k].y, p); var y = g[k].y + (8 * g[k].q - d * w) / 35; return Math.min(1 - 1e-7, Math.max(1e-7, y)); }
    function bvRes(k, i, phi, kk) { // residual i - BV(eta(i))
      var ys = ysOf(k, i), eta = phi - Rc[k] * i - lfpOcp(ys);
      return i - F * kk * Math.sqrt(c) * cmax * Math.sqrt((1 - ys) * ys) * (Math.exp(0.5 * f * eta) - Math.exp(-0.5 * f * eta));
    }
    function groupCurrent(k, phi, kk, ib, guess) { // the residual rises with i: bracket, then safeguarded secant
      var lo = -ib, hi = ib, x = Math.max(lo, Math.min(hi, guess || 0)), fx = bvRes(k, x, phi, kk);
      if (fx > 0) hi = x; else lo = x;
      var h = Math.max(1e-6, Math.abs(x) * 1e-3), x1 = x + (fx > 0 ? -h : h), f1 = bvRes(k, x1, phi, kk);
      for (var n = 0; n < 60; n++) {
        if (f1 > 0) hi = Math.min(hi, x1); else lo = Math.max(lo, x1);
        var xn = (f1 !== fx) ? x1 - f1 * (x1 - x) / (f1 - fx) : 0.5 * (lo + hi);
        if (!(xn > lo && xn < hi)) xn = 0.5 * (lo + hi);
        x = x1; fx = f1; x1 = xn; f1 = bvRes(k, x1, phi, kk);
        if (Math.abs(x1 - x) < 1e-10 + 1e-9 * Math.abs(x1)) break;
      }
      return x1;
    }
    var phiLast = null;
    function solve(I) { // matrix potential phi such that sum(aL i) = I: bracketed secant on phi
      var kk = kc(I), ib = 240 * (Math.abs(I) + oneC) / aL.reduce(function (s, v) { return s + v; }, 0), cur = [];
      function tot(phi) { var t = 0; for (var k = 0; k < g.length; k++) { cur[k] = groupCurrent(k, phi, kk, ib, g[k].i); t += aL[k] * cur[k]; } return t - I; }
      var lo = 2.0, hi = 5.0, x = phiLast === null ? 3.43 : phiLast, fx = tot(x);
      if (fx > 0) hi = x; else lo = x;
      var x1 = x + (fx > 0 ? -0.002 : 0.002), f1 = tot(x1);
      for (var n = 0; n < 60; n++) {
        if (f1 > 0) hi = Math.min(hi, x1); else lo = Math.max(lo, x1);
        var xn = (f1 !== fx) ? x1 - f1 * (x1 - x) / (f1 - fx) : 0.5 * (lo + hi);
        if (!(xn > lo && xn < hi)) xn = 0.5 * (lo + hi);
        x = x1; fx = f1; x1 = xn; f1 = tot(x1);
        if (Math.abs(x1 - x) < 1e-9) break;
      }
      phiLast = x1;
      return { phi: x1, cur: cur.slice() };
    }
    function state(I) {
      var s = solve(I);
      for (var k = 0; k < g.length; k++) { g[k].i = s.cur[k]; g[k].ys = ysOf(k, s.cur[k]); }
      var V = s.phi + (2 / f) * Math.asinh(I / (2 * i0a)); // Li counter electrode: plating on charge
      var yb = 0; for (k = 0; k < g.length; k++) yb += frac[k] * g[k].y;
      return { V: V, phi: s.phi, y: yb, groups: g.map(function (x) { return { y: x.y, ys: x.ys, i: x.i }; }) };
    }
    function advance(I, dt) {
      for (var k = 0; k < g.length; k++) {
        var d = g[k].i * Rp / (F * D0 * cmax), w = Math.pow(1 + g[k].y, p), dtau = D0 * dt / (Rp * Rp);
        g[k].q = (g[k].q - 22.5 * d * dtau) / (1 + 30 * dtau / w);
        g[k].y = Math.min(1, Math.max(0, g[k].y - 3 * d * dtau));
      }
    }
    /* run(I, until): step at current I (A/m2) until V crosses the cut-off (2.5 V on discharge,
       4.2 V on charge), the time limit tmax (s) is reached, or the mean content reaches yStop. */
    function run(I, o) {
      o = o || {}; var out = [], t = 0, s = state(I), tmax = o.tmax || 1e7;
      out.push({ t: 0, V: s.V, y: s.y, groups: s.groups });
      for (var n = 0; n < 4000; n++) {
        var rate = 0; for (var k = 0; k < g.length; k++) rate = Math.max(rate, Math.abs(3 * g[k].i / (F * cmax * Rp)));
        var dt = Math.min(o.dtmax || 600, (o.dy || 0.004) / Math.max(rate, 1e-9), tmax - t);
        if (dt <= 0) break;
        advance(I, dt); t += dt; s = state(I);
        out.push({ t: t, V: s.V, y: s.y, groups: s.groups });
        if (I > 0 && s.V >= 4.2) break; if (I < 0 && s.V <= 2.5) break;
        if (o.yStop !== undefined && (I > 0 ? s.y <= o.yStop : s.y >= o.yStop)) break;
        if (t >= tmax - 1e-6) break;
      }
      return out;
    }
    return { oneC: oneC, run: run, state: state, groups: g, frac: frac, Rc: Rc };
  }

  /* Electric double-layer capacitor under a current step I0 (Moya 2025, eq. 6):
     v(t) = RH I0 + Ri I0 (1 - exp(-t/tau)) + I0 t / C; and the full cycle, charge for t0 then
     discharge at -I0 (eq. 12): vD(t) = vC(t) - 2 u(t - t0) vC(t - t0). */
  function edlcCharge(t, I0, RH, Ri, C, tau) { return t < 0 ? 0 : RH * I0 + Ri * I0 * (1 - Math.exp(-t / tau)) + I0 * t / C; }
  function edlcCycle(t, t0, I0, RH, Ri, C, tau) { return edlcCharge(t, I0, RH, Ri, C, tau) - (t >= t0 ? 2 * edlcCharge(t - t0, I0, RH, Ri, C, tau) : 0); }
  /* Doyle, Fuller and Newman 1993, eq. 26: the ratio of the time for diffusion in the solid
     particles to the time of discharge, Sc = Rs^2 I / (Ds F (1 - eps) cT deltaC). */
  function solidDiffusionRatio(Rs, I, Ds, eps, cT, dc) { return Rs * Rs * I / (Ds * F * (1 - eps) * cT * dc); }

  function seriesVoltage(V, n) { return V * n; }
  function parallelCapacity(Q, n) { return Q * n; }

  /* Reference data used by the figures. Every number carries its source. */
  var data = {
    /* Standard potentials vs NHE from the table in Bard, Faulkner and White. */
    standardPotentials: { 'Cu2+/Cu': 0.340, 'Zn2+/Zn': -0.7626, 'Li+/Li': -3.045, 'O2/H2O': 1.229, 'H+/H2': 0.0 },
    /* The Daniell cell: E = 0.340 - (-0.7626) = 1.103 V (Table C.1), two electrons per
       zinc atom (BFW 1.1.5). */
    daniell: { E: 0.340 - (-0.7626), n: 2 },
    /* Numbers from BFW used on the Module 0 and 3 figures, each with its section. */
    electrostatics: {
      mercuryDropVacuumCperV: 5e-14,      // C per volt for a 0.5 mm mercury drop in vacuum (2.2.1)
      mercuryDropElectrolyteC: 1e-6,       // C for a 1 V change with 0.1 M electrolyte, A = 0.03 cm2 (2.2.2)
      interfacialFieldVperCm: 1e7,         // field strength the interface can reach (2.2.3)
      metalChargeLayerNm: 1,               // electrode charge sits in a layer under 1 nm (1.6.2)
      diffuseLayerNmAbove10mM: 10,         // diffuse layer under about 10 nm above 0.01 M (1.6.3)
      doubleLayerCapacitance: [10, 40],    // uF/cm2 (1.6.2; Winter and Brodd 4.2)
      doubleLayerTimeConstantS: 1e-8,      // Winter and Brodd 4.2
      workFunctionEV: [2, 6],              // typical metals (2.2.5 footnote 24)
      nheAbsoluteV: 4.4                    // absolute potential of the NHE, about 4.4 V (2.2.5)
    },
    /* Potential ladder vs Li/Li+ (volts). Sources: Goodenough and Park 2013 (R6)
       unless marked; sulfur and thiolate from Tarascon and Armand 2001 (R2). */
    ladder: [
      { key: 'li',   name: 'Lithium metal',            side: 'neg', V: 0.0,  note: 'the reference itself',                       src: 'R6' },
      { key: 'gr',   name: 'Graphite (LiC₆)',           side: 'neg', V: 0.2,  note: 'about 0.2 V vs Li',                           src: 'R6' },
      { key: 'alloy',name: 'Li alloys (Si, Sn, Sb)',    side: 'neg', V: 0.5,  note: '0.2 to 0.8 V vs Li; 0.5 shown',              src: 'R6' },
      { key: 'lto',  name: 'Lithium titanate',          side: 'neg', V: 1.5,  note: '1.5 V vs Li, no SEI needed',                  src: 'R6' },
      { key: 'tis2', name: 'TiS₂ (1976)',               side: 'pos', V: 2.2,  note: 'about 2.2 V, the first rechargeable cell',    src: 'R6' },
      { key: 's',    name: 'Sulfur',                    side: 'pos', V: 2.4,  note: '2.4 V',                                       src: 'R2' },
      { key: 'lfp',  name: 'LiFePO₄',                   side: 'pos', V: 3.5,  note: '3.5 V, flat two-phase plateau',              src: 'R6' },
      { key: 'lco',  name: 'LiCoO₂',                    side: 'pos', V: 4.0,  note: 'about 4.0 V',                                 src: 'R6' },
      { key: 'lnmo', name: 'LiNi₀.₅Mn₁.₅O₄',            side: 'pos', V: 4.75, note: 'about 4.75 V, above the electrolyte limit',   src: 'R6' }
    ],
    /* Electrolyte window of the carbonate electrolytes, Goodenough and Park:
       LUMO about 1.1 eV below the lithium level, practical HOMO about 4.3 eV below. */
    carbonateWindow: { low: 1.1, high: 4.3 },
    /* Aqueous window: 1.23 V thermodynamic, about 2 V kinetic (Winter and Brodd 2.2). */
    aqueousWindow: { thermodynamic: 1.23, kinetic: 2.0 },
    /* Nominal voltages of common systems, Winter and Brodd 2004, Table 2. */
    nominal: [
      { name: 'Leclanché (carbon-zinc)', V: 1.5, kind: 'primary',      anode: 'zinc foil',   cathode: 'MnO2 (natural)',     electrolyte: 'aq. ZnCl2-NH4Cl' },
      { name: 'Alkaline',                V: 1.5, kind: 'primary',      anode: 'zinc powder', cathode: 'electrolytic MnO2',  electrolyte: 'aq. KOH' },
      { name: 'Zinc-air',                V: 1.2, kind: 'primary',      anode: 'zinc powder', cathode: 'carbon (air)',       electrolyte: 'aq. KOH' },
      { name: 'Silver-zinc',             V: 1.6, kind: 'primary',      anode: 'zinc powder', cathode: 'Ag2O',               electrolyte: 'aq. KOH' },
      { name: 'Lithium-MnO2',            V: 3.0, kind: 'primary',      anode: 'lithium foil',cathode: 'treated MnO2',       electrolyte: 'LiCF3SO3 or LiClO4 in nonaqueous solvents' },
      { name: 'Lead-acid',               V: 2.0, kind: 'rechargeable', anode: 'lead',        cathode: 'PbO2',               electrolyte: 'aq. H2SO4' },
      { name: 'Nickel-cadmium',          V: 1.2, kind: 'rechargeable', anode: 'cadmium',     cathode: 'NiOOH',              electrolyte: 'aq. KOH' },
      { name: 'Nickel-metal hydride',    V: 1.2, kind: 'rechargeable', anode: 'MH',          cathode: 'NiOOH',              electrolyte: 'aq. KOH' },
      { name: 'Lithium-ion',             V: 4.0, kind: 'rechargeable', anode: 'Li(C)',       cathode: 'LiCoO2',             electrolyte: 'LiPF6 in nonaqueous solvents' }
    ],
    /* Molar masses (g/mol) for the capacity calculator, IUPAC 2013 conventional values rounded. */
    molarMass: { Li: 6.94, C: 12.011, O: 15.999, Fe: 55.845, P: 30.974, Co: 58.933, Mn: 54.938, Ni: 58.693, S: 32.06, Ti: 47.867 },
    /* Materials for the capacity calculator. 'basis' is the mass the capacity refers to;
       'printed' is the value a verified source prints, 'src' its key; the rest are computed. */
    materials: [
      { key: 'gr',  name: 'Graphite (LiC₆, per gram of carbon)', n: 1, M: 6 * 12.011,                          basis: 'C₆ (delithiated host)', printed: 372, src: 'R2', practical: 'about 350 mAh/g in practice (Tarascon and Armand 2001)' },
      { key: 'lfp', name: 'LiFePO₄',                              n: 1, M: 6.94 + 55.845 + 30.974 + 4 * 15.999, basis: 'LiFePO₄ (lithiated, as assembled)', printed: 170, src: 'R6', practical: 'used at about 90 % of the theoretical value (Tarascon and Armand 2001)' },
      { key: 'lco', name: 'LiCoO₂ (all lithium)',                 n: 1, M: 6.94 + 58.933 + 2 * 15.999,          basis: 'LiCoO₂ (lithiated)', printed: null, src: null, practical: 'only about half the lithium is used for safety, about 140 mAh/g in practice (Tarascon and Armand 2001)' },
      { key: 'li',  name: 'Lithium metal',                        n: 1, M: 6.94,                                basis: 'Li', printed: null, src: null, practical: 'the highest of all negative electrodes; module 9 explains why it is hard to use' },
      { key: 'lto', name: 'Li₄Ti₅O₁₂ (3 Li per formula unit)',    n: 3, M: 4 * 6.94 + 5 * 47.867 + 12 * 15.999, basis: 'Li₄Ti₅O₁₂', printed: null, src: null, practical: 'Goodenough and Park 2013 give under 150 mAh/g' },
      { key: 's',   name: 'Sulfur (to Li₂S, 2 electrons)',        n: 2, M: 32.06,                               basis: 'S', printed: null, src: null, practical: 'a multi-electron reactant; see module 9' }
    ]
  };

  return {
    F: F, R: R, T0: T0, e: e, NA: NA, eps0: eps0,
    coulombForce: coulombForce, fieldOfCharge: fieldOfCharge, potentialOfCharge: potentialOfCharge, uniformField: uniformField,
    energyOfCharge: energyOfCharge, electronVolts: electronVolts, kJPerMolFromEV: kJPerMolFromEV,
    chargeFromMoles: chargeFromMoles, electronsPerSecond: electronsPerSecond,
    resistance: resistance, conductance: conductance, ohmCurrent: ohmCurrent, power: power,
    mobility: mobility, driftVelocity: driftVelocity, electricForce: electricForce, stokesDrag: stokesDrag, conductivity: conductivity,
    capacitorCharge: capacitorCharge, helmholtzCapacitance: helmholtzCapacitance, waterWindowVsLi: waterWindowVsLi,
    massTransformed: massTransformed, specificCapacity: specificCapacity, reactionEnergy: reactionEnergy,
    nernst: nernst, dischargeVoltage: dischargeVoltage, chargeVoltage: chargeVoltage,
    butlerVolmer: butlerVolmer, butlerVolmerAnodic: butlerVolmerAnodic, chargeTransferResistance: chargeTransferResistance,
    tafelOverpotential: tafelOverpotential, concentrationPolarization: concentrationPolarization,
    energyFromCurve: energyFromCurve, coulombicEfficiency: coulombicEfficiency, storageEfficiency: storageEfficiency,
    kineticImpedance: kineticImpedance, semicirclePeak: semicirclePeak, warburg: warburg, diffusionLength: diffusionLength,
    seriesVoltage: seriesVoltage, parallelCapacity: parallelCapacity,
    gittD: gittD, lithiumExcess: lithiumExcess, powerLawScale: powerLawScale,
    solventPerIon: solventPerIon, meanSpacing: meanSpacing, bulkField: bulkField, meanIonVelocity: meanIonVelocity,
    chargePassed: chargePassed, cRateCurrent: cRateCurrent, lfpOcp: lfpOcp, lfpDiffusion: lfpDiffusion, lfpElectrode: lfpElectrode,
    edlcCharge: edlcCharge, edlcCycle: edlcCycle, solidDiffusionRatio: solidDiffusionRatio,
    data: data
  };
});
