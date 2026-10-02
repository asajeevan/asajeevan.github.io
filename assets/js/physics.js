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

  /* ---------- Module 11: testing and diagnosis (impedance, GITT, analysis) ----------
     Complex numbers are {re, im} with im the imaginary part Z'' (so a capacitor has im < 0;
     Nyquist plots draw -im upward, Bard, Faulkner and White 11.2 footnote 3). */
  var m11 = (function () {
    function cx(re, im) { return { re: re, im: im || 0 }; }
    function add() { var r = 0, i = 0; for (var k = 0; k < arguments.length; k++) { r += arguments[k].re; i += arguments[k].im; } return cx(r, i); }
    function mul(a, b) { return cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
    function div(a, b) { var d = b.re * b.re + b.im * b.im; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); }
    function inv(a) { return div(cx(1, 0), a); }
    function scale(a, s) { return cx(a.re * s, a.im * s); }
    function abs(a) { return Math.sqrt(a.re * a.re + a.im * a.im); }
    function arg(a) { return Math.atan2(a.im, a.re); }
    function csqrt(a) { var r = abs(a), t = arg(a) / 2, s = Math.sqrt(r); return cx(s * Math.cos(t), s * Math.sin(t)); }
    function cpow(a, p) { var r = abs(a), t = arg(a); if (r === 0) return cx(0, 0); var m = Math.pow(r, p); return cx(m * Math.cos(p * t), m * Math.sin(p * t)); }
    /* tanh of a complex argument: tanh(a + ib) = (sinh 2a + i sin 2b) / (cosh 2a + cos 2b) */
    function ctanh(z) {
      if (z.re > 20) return cx(1, 0); if (z.re < -20) return cx(-1, 0);
      var d = Math.cosh(2 * z.re) + Math.cos(2 * z.im); return cx(Math.sinh(2 * z.re) / d, Math.sin(2 * z.im) / d);
    }
    function ccoth(z) { return inv(ctanh(z)); }
    /* Series impedances add; for parallel ones the reciprocals add (Bard, Faulkner and White
       section 11.2; Lazanas and Prodromidis 2023 eqs 29 and 31). */
    function series() { return add.apply(null, arguments); }
    function parallel() { var y = cx(0, 0); for (var k = 0; k < arguments.length; k++) y = add(y, inv(arguments[k])); return inv(y); }

    /* The three passive elements (Lazanas and Prodromidis eqs 36, 41, 43; BFW 11.2):
       Z_R = R, Z_C = 1/(j w C) = -j/(w C), Z_L = j w L. */
    function zR(R) { return cx(R, 0); }
    function zC(C, w) { return cx(0, -1 / (w * C)); }
    function zL(L, w) { return cx(0, w * L); }
    /* Constant phase element, Lazanas and Prodromidis eq 70: Z = 1/(Y0 (j w)^n); n = 1 is a
       capacitor, n = 0 a resistor, n = 0.5 a Warburg element (their Table 2). */
    function zQ(Y0, n, w) { return inv(scale(cpow(cx(0, w), n), Y0)); }
    /* Semi-infinite Warburg, BFW eq 11.3.27 and Lazanas and Prodromidis eq 58:
       Z_W = sigma w^-1/2 (1 - j). */
    function zW(sigma, w) { var s = sigma / Math.sqrt(w); return cx(s, -s); }
    /* Finite-length diffusion, Lazanas and Prodromidis eqs 76 and 79:
       transmissive boundary Z = tanh(B sqrt(j w)) / (Y0 sqrt(j w)),
       reflective (blocking) boundary Z = coth(B sqrt(j w)) / (Y0 sqrt(j w)). */
    function zFiniteT(Y0, B, w) { var s = csqrt(cx(0, w)); return div(ctanh(scale(s, B)), scale(s, Y0)); }
    function zFiniteR(Y0, B, w) { var s = csqrt(cx(0, w)); return div(ccoth(scale(s, B)), scale(s, Y0)); }
    /* Spherical solid diffusion, Abbas et al. 2025 eq 6:
       Z = (1/3) Rd tanh(x) / (x - tanh x), x = sqrt(j w Rd Cd); D = r^2/(Rd Cd) (their eq 4);
       low-frequency limit Rd/15 in series with Cd (their text after eq 10). */
    function zSphere(Rd, Cd, w) {
      var x = csqrt(cx(0, w * Rd * Cd));
      if (abs(x) < 0.3) { // series of tanh x/(x - tanh x) in x^2, avoids cancellation at low frequency
        var x2 = mul(x, x), x4 = mul(x2, x2), x6 = mul(x4, x2);
        var num = add(cx(1, 0), scale(x2, -1 / 3), scale(x4, 2 / 15), scale(x6, -17 / 315));
        var den = add(scale(x2, 1 / 3), scale(x4, -2 / 15), scale(x6, 17 / 315), scale(mul(x6, x2), -62 / 2835));
        return scale(div(num, den), Rd / 3);
      }
      var t = ctanh(x); return scale(div(t, add(x, scale(t, -1))), Rd / 3);
    }
    /* Parallel R and CPE, the depressed "ZARC" arc (Meddings et al. 2020 sec. 3.2.2; Abbas et
       al. eq 13): Z = R / (1 + R Q (j w)^n). */
    function zRQ(R, Q, n, w) { return div(cx(R, 0), add(cx(1, 0), scale(cpow(cx(0, w), n), R * Q))); }
    /* Porous electrode as a finite transmission line with pore resistance Rm and an interface
       z = Rct || Cdl per unit length (de Levie; Bisquert): Z = sqrt(Rm z) coth(sqrt(Rm / z)).
       It reduces to the two limits Meddings et al. print in sec. 3.2.2: Z -> (j w)^-1/2
       sqrt(Rm/Cdl) at high frequency (a 45-degree line) and sqrt(Rm Rct) coth(sqrt(Rm/Rct))
       at low frequency; with Rm -> 0 it becomes Rct || Cdl. This page's own working. */
    function zPorous(Rm, Rct, Cdl, w) {
      var z = parallel(zR(Rct), zC(Cdl, w));
      return mul(csqrt(scale(z, Rm)), ccoth(csqrt(scale(inv(z), Rm))));
    }

    /* Frequency grid, n points per decade, from fHi down to fLo (the order an instrument
       sweeps, high to low; Meddings et al. Fig. 1). */
    function freqs(fHi, fLo, perDecade) {
      var out = [], a = Math.log10(fHi), b = Math.log10(fLo), n = Math.round((a - b) * perDecade);
      for (var k = 0; k <= n; k++) out.push(Math.pow(10, a - k / perDecade));
      return out;
    }

    /* The illustrative commercial cell used across Module 11 (milliohms and farads, the
       ranges Meddings et al. and Winter and Brodd give; the values themselves are this
       page's): wire and winding inductance L, ohmic R0, an SEI arc (R||CPE), and charge
       transfer in parallel with the double layer, followed by spherical solid diffusion
       (Randles arrangement, preferred physically by Meddings et al. sec. 3.2.2). */
    var CELL = { L: 0.15e-6, R0: 0.020, Rsei: 0.004, Qsei: 0.25, nsei: 0.9, Rct: 0.010, Cdl: 2.0, Rd: 0.3, Cd: 3000 };
    function cellZ(p, w) {
      p = p || CELL;
      var front = add(zL(p.L, w), zR(p.R0), zRQ(p.Rsei, p.Qsei, p.nsei, w));
      var far = parallel(zC(p.Cdl, w), add(zR(p.Rct), zSphere(p.Rd, p.Cd, w)));
      return add(front, far);
    }

    /* Current step on a series-Voigt cell R0 + (R1||C1) + (R2||C2) + Warburg, all closed form:
       v(t)/I = R0 + R1 (1 - e^-t/tau1) + R2 (1 - e^-t/tau2) + 2 sigma sqrt(2 t / pi).
       The Warburg term follows from Z_W = sigma sqrt(2) (j w)^-1/2 and the Laplace transform of
       s^-3/2 (this page's working). Meddings et al. sec. 3.1: the instantaneous drop gives the
       ohmic resistance, later drop charge transfer, then diffusion; values read at a time t
       roughly match impedance measured on the same timescale. */
    function stepResistance(p, t) {
      return p.R0 + p.R1 * (1 - Math.exp(-t / (p.R1 * p.C1))) + p.R2 * (1 - Math.exp(-t / (p.R2 * p.C2))) + 2 * p.sigma * Math.sqrt(2 * t / Math.PI);
    }
    function voigtWZ(p, w) { return add(zR(p.R0), parallel(zR(p.R1), zC(p.C1, w)), parallel(zR(p.R2), zC(p.C2, w)), zW(p.sigma, w)); }

    /* Two series R||C arcs (a "Voigt" circuit R0(R1C1)(R2C2)) and the nested ladder
       R0(Ca[Ra(RbCb)]) that gives exactly the same impedance at every frequency
       (Lazanas and Prodromidis sec. 8, Fig. 7: "some circuits are mathematically identical").
       Conversion by matching the admittance Y = 1/(Z - R0) as a continued fraction
       (this page's working; tested numerically). */
    function voigtToLadder(R1, C1, R2, C2) {
      var t1 = R1 * C1, t2 = R2 * C2;
      // Z' = Z - R0 = [ (R1 + R2) + s (R1 t2 + R2 t1) ] / [ (1 + s t1)(1 + s t2) ]
      var n0 = R1 + R2, n1 = R1 * t2 + R2 * t1, d0 = 1, d1 = t1 + t2, d2 = t1 * t2;
      // Y = D/N = s Ca + 1/(Ra + 1/(s Cb + 1/Rb))
      var Ca = d2 / n1;                         // leading s term
      var r0 = d0, r1 = d1 - Ca * n0;           // remainder D - s Ca N = r0 + s r1 (the s^2 terms cancel)
      // remainder admittance r(s)/N(s) = 1/(Ra + 1/(s Cb + 1/Rb)); invert: N/r = Ra + 1/(sCb + 1/Rb)
      var Ra = n1 / r1;                          // high-frequency limit of N/r
      var q0 = n0 - Ra * r0;                     // N - Ra r = q0 (the s terms cancel)
      // r/q0 = (r0 + s r1)/q0 = 1/Rb + s Cb
      var Rb = q0 / r0, Cb = r1 / q0;
      return { Ca: Ca, Ra: Ra, Rb: Rb, Cb: Cb };
    }
    function ladderZ(R0, L, w) { return add(zR(R0), parallel(zC(L.Ca, w), add(zR(L.Ra), parallel(zC(L.Cb, w), zR(L.Rb))))); }

    /* Butler-Volmer interface driven by a sine of amplitude A (V) at overpotential eta(t) =
       A sin(theta): current over one period and its harmonics by discrete Fourier transform.
       BFW eq 3.4.11; the linear limit gives R_ct = RT/(F i0), eq 3.4.13. Nonlinearity makes
       harmonics at 2w, 3w (BFW 11.6); total harmonic distortion is the rms of the harmonics
       over the fundamental (Meddings et al. sec. 3.1, defined in words). */
    function bvHarmonics(i0, alpha, A, T, N) {
      N = N || 256; T = T || T0; var f = F / (R * T), wave = [], amps = [];
      for (var k = 0; k < N; k++) { var th = 2 * Math.PI * k / N, eta = A * Math.sin(th); wave.push({ eta: eta, i: i0 * (Math.exp((1 - alpha) * f * eta) - Math.exp(-alpha * f * eta)) }); }
      for (var h = 0; h <= 5; h++) {
        var re = 0, im = 0; for (k = 0; k < N; k++) { var t = 2 * Math.PI * h * k / N; re += wave[k].i * Math.cos(t); im += wave[k].i * Math.sin(t); }
        amps.push((h === 0 ? 1 : 2) * Math.sqrt(re * re + im * im) / N);
      }
      var thd = Math.sqrt(amps[2] * amps[2] + amps[3] * amps[3] + amps[4] * amps[4] + amps[5] * amps[5]) / amps[1];
      return { wave: wave, amps: amps, thd: thd, rApparent: A / amps[1], rct: R * T / (F * i0) };
    }

    /* Small dense linear least squares by normal equations with a tiny ridge for safety. */
    function lstsq(A, b, ridge) {
      var m = A[0].length, M = [], v = [];
      for (var i = 0; i < m; i++) { M.push(new Array(m).fill(0)); v.push(0); }
      for (var r = 0; r < A.length; r++) for (i = 0; i < m; i++) { v[i] += A[r][i] * b[r]; for (var j = 0; j < m; j++) M[i][j] += A[r][i] * A[r][j]; }
      for (i = 0; i < m; i++) M[i][i] += (ridge || 0) * (M[i][i] || 1);
      return solve(M, v);
    }
    function solve(M, v) {
      var n = v.length, a = M.map(function (row, i) { return row.slice().concat([v[i]]); });
      for (var c = 0; c < n; c++) {
        var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
        var tmp = a[c]; a[c] = a[p]; a[p] = tmp; if (Math.abs(a[c][c]) < 1e-300) continue;
        for (r = 0; r < n; r++) if (r !== c) { var k = a[r][c] / a[c][c]; for (var j = c; j <= n; j++) a[r][j] -= k * a[c][j]; }
      }
      return a.map(function (row, i) { return row[n] / (row[i] || 1); });
    }

    /* Linear Kramers-Kronig test after Boukamp: fit the spectrum with a Voigt circuit of fixed,
       log-spaced time constants (only the resistances are fitted), plus a series R, L and C
       (Boukamp's inductive and capacitive extension; Meddings et al. sec. 3.3.1; Lazanas and
       Prodromidis sec. 7.4 and 16.5). If such a circuit fits, the data are taken to be KK
       compliant. Residuals are relative to |Z| (the "pseudo chi-squared" of Lazanas and
       Prodromidis is the sum of their squares). Each part is weighted by 1/|Z|. */
    function linKK(fs, Z, M) {
      var ws = fs.map(function (f) { return 2 * Math.PI * f; }), wmin = Math.min.apply(null, ws), wmax = Math.max.apply(null, ws);
      M = M || Math.max(3, Math.round(Math.log10(wmax / wmin) * 7));
      var taus = []; for (var k = 0; k < M; k++) taus.push(Math.pow(10, Math.log10(1 / wmax) + k * (Math.log10(1 / wmin) - Math.log10(1 / wmax)) / (M - 1)));
      var A = [], b = [];
      ws.forEach(function (w, i) {
        var m = abs(Z[i]), rowR = [1 / m, 0, 0], rowI = [0, w / m, -1 / (w * m)];
        taus.forEach(function (t) { var d = 1 + w * w * t * t; rowR.push(1 / d / m); rowI.push(-w * t / d / m); });
        A.push(rowR); b.push(Z[i].re / m); A.push(rowI); b.push(Z[i].im / m);
      });
      var x = lstsq(A, b, 1e-12), fit = [], res = [], chi = 0;
      ws.forEach(function (w, i) {
        var z = cx(x[0], w * x[1] - x[2] / w);
        taus.forEach(function (t, k) { var d = 1 + w * w * t * t; z.re += x[3 + k] / d; z.im -= x[3 + k] * w * t / d; });
        var m = abs(Z[i]), dr = (Z[i].re - z.re) / m, di = (Z[i].im - z.im) / m; fit.push(z); res.push({ re: dr, im: di }); chi += dr * dr + di * di;
      });
      return { fit: fit, res: res, chi2: chi, M: M };
    }

    /* Non-negative least squares (Lawson-Hanson active set). */
    function nnls(A, b, maxIter) {
      var m = A.length, n = A[0].length, x = new Array(n).fill(0), P = new Array(n).fill(false);
      function grad() { var w = new Array(n).fill(0); for (var r = 0; r < m; r++) { var e = b[r]; for (var j = 0; j < n; j++) e -= A[r][j] * x[j]; for (j = 0; j < n; j++) w[j] += A[r][j] * e; } return w; }
      function lsP() { var idx = []; for (var j = 0; j < n; j++) if (P[j]) idx.push(j); var sub = A.map(function (row) { return idx.map(function (j) { return row[j]; }); }); var z = lstsq(sub, b, 1e-14), out = new Array(n).fill(0); idx.forEach(function (j, k) { out[j] = z[k]; }); return out; }
      for (var it = 0; it < (maxIter || 3 * n); it++) {
        var w = grad(), best = -1, bw = 1e-12; for (var j = 0; j < n; j++) if (!P[j] && w[j] > bw) { bw = w[j]; best = j; }
        if (best < 0) break; P[best] = true;
        for (var inner = 0; inner < 3 * n; inner++) {
          var z = lsP(), ok = true; for (j = 0; j < n; j++) if (P[j] && z[j] <= 0) ok = false;
          if (ok) { x = z; break; }
          var alpha = 1; for (j = 0; j < n; j++) if (P[j] && z[j] <= 0) alpha = Math.min(alpha, x[j] / (x[j] - z[j]));
          for (j = 0; j < n; j++) { x[j] += alpha * (z[j] - x[j]); if (P[j] && Math.abs(x[j]) < 1e-15) { P[j] = false; x[j] = 0; } }
        }
      }
      return x;
    }

    /* Distribution of relaxation times, Meddings et al. eq 5 and Bakenhaster and Dewald eq 10:
       Z(w) = R0 + Rpol integral g(tau) / (1 + j w tau) dtau, discretised on a log grid of tau:
       Z = R0 + sum_k x_k / (1 + j w tau_k), x_k >= 0, solved by non-negative least squares with
       a Tikhonov (ridge) penalty lambda |x|^2 (this page's method; Meddings et al.: the number
       of peaks "highly depends on the magnitude of the regularisation parameters"). */
    function drt(fs, Z, taus, lambda) {
      var A = [], b = [], n = taus.length;
      fs.forEach(function (f, i) {
        var w = 2 * Math.PI * f, m = abs(Z[i]), rowR = [1 / m], rowI = [0];
        taus.forEach(function (t) { var d = 1 + w * w * t * t; rowR.push(1 / d / m); rowI.push(-w * t / d / m); });
        A.push(rowR); b.push(Z[i].re / m); A.push(rowI); b.push(Z[i].im / m);
      });
      var s = Math.sqrt(lambda);
      for (var k = 0; k < n; k++) { var row = new Array(n + 1).fill(0); row[k + 1] = s / 0.01; A.push(row); b.push(0); }
      var x = nnls(A, b, 4 * n), fit = fs.map(function (f) { var w = 2 * Math.PI * f, z = cx(x[0], 0); taus.forEach(function (t, k) { var d = 1 + w * w * t * t; z.re += x[k + 1] / d; z.im -= x[k + 1] * w * t / d; }); return z; });
      return { R0: x[0], x: x.slice(1), fit: fit };
    }

    /* ---------- GITT ---------- */
    /* Planar film of thickness L with a constant flux into it at x = 0 during the pulse and
       no flux at x = L (Kim et al. 2022 eqs 3-6), then a rest. Solved numerically
       (Crank-Nicolson, this page's method) in dimensionless form: x in units of L, time in
       L^2/D, concentration change u in units of jS L/D. Then the mean change after a pulse is
       tau (charge passed) and the surface change follows Kang and Chueh eq A.21.
       opts: tau, tEnd (both in L^2/D), N nodes, steps. Returns {t: [], us: [], frames: [{t, u}]}. */
    function gittSlab(opts) {
      var N = opts.N || 81, tau = opts.tau, tEnd = opts.tEnd, nt = opts.steps || 1600, keep = opts.frames || 80;
      var dx = 1 / (N - 1), dt = tEnd / nt, r = dt / (dx * dx), u = new Array(N).fill(0);
      var lo = new Array(N), di = new Array(N), up = new Array(N), rhs = new Array(N), out = { t: [], us: [], frames: [] };
      for (var s = 0; s <= nt; s++) {
        var t = s * dt; out.t.push(t); out.us.push(u[0]);
        if (s % Math.max(1, Math.round(nt / keep)) === 0) out.frames.push({ t: t, u: u.slice() });
        if (s === nt) break;
        var on = (t < tau - 1e-12 ? 1 : 0) + (t + dt < tau + 1e-12 ? 1 : 0); // flux at the two time levels
        for (var i = 0; i < N; i++) { lo[i] = -r / 2; di[i] = 1 + r; up[i] = -r / 2; }
        up[0] = -r; lo[N - 1] = -r;
        rhs[0] = (1 - r) * u[0] + r * u[1] + r * dx * on;
        for (i = 1; i < N - 1; i++) rhs[i] = r / 2 * u[i - 1] + (1 - r) * u[i] + r / 2 * u[i + 1];
        rhs[N - 1] = (1 - r) * u[N - 1] + r * u[N - 2];
        for (i = 1; i < N; i++) { var m = lo[i] / di[i - 1]; di[i] -= m * up[i - 1]; rhs[i] -= m * rhs[i - 1]; }
        u[N - 1] = rhs[N - 1] / di[N - 1]; for (i = N - 2; i >= 0; i--) u[i] = (rhs[i] - up[i] * u[i + 1]) / di[i];
      }
      return out;
    }
    /* Exact surface solution for the same slab during the pulse (Kang and Chueh 2021 eq A.21,
       in the units above): u_s = D t / L^2 + 1/3 - 2 sum exp(-n^2 pi^2 Dt/L^2)/(n^2 pi^2), and the
       short-time limit 2 sqrt(Dt/(pi L^2)) (their eq 7; Kim et al. eq 8). */
    function slabSurface(that) {
      var s = that + 1 / 3; for (var n = 1; n < 200; n++) s -= 2 * Math.exp(-n * n * Math.PI * Math.PI * that) / (n * n * Math.PI * Math.PI); return s;
    }
    /* Sphere: Nickol et al. 2020 eqs 3-5, f(tau) = 3 tau + 1/5 - 2 sum exp(-a_n^2 tau)/a_n^2 with
       a_n the positive roots of a = tan a; short-time limit 2 sqrt(tau/pi), within 5 % for
       tau < 0.0032 (their text after eq 5). Same as Kang and Chueh eq A.23. */
    var ROOTS = (function () { var r = []; for (var n = 1; n <= 60; n++) { var lo = n * Math.PI + 1e-9, hi = n * Math.PI + Math.PI / 2 - 1e-9; for (var k = 0; k < 80; k++) { var mid = (lo + hi) / 2; if (Math.tan(mid) - mid > 0) hi = mid; else lo = mid; } r.push((lo + hi) / 2); } return r; })();
    function sphereF(tau) {
      if (tau <= 0) return 0;
      if (tau < 1e-4) return 2 * Math.sqrt(tau / Math.PI);
      var s = 3 * tau + 0.2; for (var n = 0; n < ROOTS.length; n++) s -= 2 * Math.exp(-ROOTS[n] * ROOTS[n] * tau) / (ROOTS[n] * ROOTS[n]); return s;
    }
    /* Surface change after a pulse of dimensionless length tp, at dimensionless time t (pulse
       then rest), by superposing a switched-off flux (linearity of the diffusion equation). */
    function sphereSurface(t, tp) { return t <= tp ? sphereF(t) : sphereF(t) - sphereF(t - tp); }

    /* Weppner-Huggins / Kim et al. eq 16: D = (4/(pi tau)) (mB VM/(MB S))^2 (dEs/dEt)^2;
       for spheres of radius r (Abbas et al. eq 3; Nickol et al. eq 11): (mB VM/(MB S)) -> r/3. */
    function gittDSphere(tau, r, dEs, dEt) { var a = r / 3; return 4 / (Math.PI * tau) * a * a * (dEs / dEt) * (dEs / dEt); }
    /* Nickol et al. eq 10 (from a fitted slope dE/dsqrt(t)): D = (4/(9 pi)) (rP/tP (E4-E0)/slope)^2 */
    function gittDSlope(rP, tP, dE40, slope) { var q = rP / tP * dE40 / slope; return 4 / (9 * Math.PI) * q * q; }
    /* Kang and Chueh eq 5: dimensionless pulse length tau_hat = D tau / L^2. They recommend
       tau_hat < 0.25 for a planar sample and one order of magnitude smaller for spheres. */
    function tauHat(D, t, L) { return D * t / (L * L); }
    /* Kang and Chueh eq 4: relaxation after a pulse, in the planar semi-infinite limit, is linear
       in sqrt(t_relax + tau) - sqrt(t_relax) with slope proportional to 1/sqrt(D). */
    function kangVariable(trelax, tau) { return Math.sqrt(trelax + tau) - Math.sqrt(trelax); }

    return {
      cx: cx, add: add, mul: mul, div: div, inv: inv, scale: scale, abs: abs, arg: arg, csqrt: csqrt, cpow: cpow, ctanh: ctanh, ccoth: ccoth,
      series: series, parallel: parallel, zR: zR, zC: zC, zL: zL, zQ: zQ, zW: zW, zFiniteT: zFiniteT, zFiniteR: zFiniteR, zSphere: zSphere,
      zRQ: zRQ, zPorous: zPorous, freqs: freqs, CELL: CELL, cellZ: cellZ, stepResistance: stepResistance, voigtWZ: voigtWZ,
      voigtToLadder: voigtToLadder, ladderZ: ladderZ, bvHarmonics: bvHarmonics, lstsq: lstsq, linKK: linKK, nnls: nnls, drt: drt,
      gittSlab: gittSlab, slabSurface: slabSurface, sphereF: sphereF, sphereSurface: sphereSurface, ROOTS: ROOTS,
      gittDSphere: gittDSphere, gittDSlope: gittDSlope, tauHat: tauHat, kangVariable: kangVariable
    };
  })();

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
    m11: m11,
    data: data
  };
});
