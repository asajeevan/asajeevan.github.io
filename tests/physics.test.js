/* Run with: node --test tests/
   Every check reproduces a value printed in a verified source. */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../assets/js/physics.js');

const close = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('Faraday constant as printed in Winter and Brodd: 96485.3 C/equiv = 26.8015 Ah/equiv', () => {
  close(P.F / 3600, 26.8015, 0.0001);
});

test('graphite: 372 mAh/g on the C6 mass basis (Tarascon and Armand 2001)', () => {
  const M = 6 * P.data.molarMass.C;            // 72.07 g/mol
  close(P.specificCapacity(1, M), 372, 0.5);
});

test('LiC6 mass basis gives a different number (339 mAh/g), which the page must label', () => {
  const M = 6 * P.data.molarMass.C + P.data.molarMass.Li;
  close(P.specificCapacity(1, M), 339, 0.5);
});

test('LiFePO4: 170 mAh/g theoretical (Goodenough and Park 2013)', () => {
  const m = P.data.molarMass;
  const M = m.Li + m.Fe + m.P + 4 * m.O;         // 157.76 g/mol
  close(P.specificCapacity(1, M), 170, 0.5);
});

test('lithium metal: 3861 mAh/g from F and M = 6.94 g/mol (Tarascon and Armand 2001)', () => {
  close(P.specificCapacity(1, P.data.molarMass.Li), 3861, 1);
});

test('Daniell cell: 0.340 - (-0.7626) = 1.10 V from the Bard, Faulkner and White table', () => {
  const s = P.data.standardPotentials;
  close(s['Cu2+/Cu'] - s['Zn2+/Zn'], 1.10, 0.005);
});

test('Nernst equation: unit activities give E0; products above unity lower E (sign check)', () => {
  assert.equal(P.nernst(1.0, 1, 298.15, 1, 1), 1.0);
  assert.ok(P.nernst(1.0, 1, 298.15, 10, 1) < 1.0);
  // slope 59.16 mV per decade at 25 C for n = 1
  close(P.nernst(1, 1, 298.15, 1, 1) - P.nernst(1, 1, 298.15, 10, 1), 0.05916, 0.0001);
});

test('polarization: charge branch above discharge branch by 2 I Rb (Goodenough and Park eqs. 1.1, 1.2)', () => {
  close(P.chargeVoltage(3.6, 1, 0.05) - P.dischargeVoltage(3.6, 1, 0.05), 0.1, 1e-12);
});

test('Butler-Volmer: zero current at zero overpotential; reduction positive for negative eta', () => {
  assert.equal(P.butlerVolmer(1e-3, 0.5, 0), 0);
  assert.ok(P.butlerVolmer(1e-3, 0.5, -0.05) > 0);
  assert.ok(P.butlerVolmerAnodic(1e-3, 0.5, 0.05) > 0);
});

test('Butler-Volmer linear limit matches R_ct = RT/(F i0) (BFW eqs. 3.4.12 and 3.4.13)', () => {
  const i0 = 2e-3, eta = -1e-4;
  const i = P.butlerVolmer(i0, 0.5, eta);
  const Rct = P.chargeTransferResistance(i0, 1);
  close(-eta / i, Rct, Rct * 1e-3);
});

test('Tafel: 118 mV at 25 C is the overpotential where the back reaction is 1 % (BFW section 3.4.3)', () => {
  // exp(-f eta) = 100 when eta = -(RT/F) ln 100 = -0.1183 V
  const eta = -(P.R * P.T0 / P.F) * Math.log(100);
  close(Math.abs(eta), 0.118, 0.001);
});

test('impedance: semicircle radius R_ct/2 centred at R_u + R_ct/2, peak at omega = 1/(R_ct C_d) (BFW 11.4.9 to 11.4.11)', () => {
  const Ru = 2, Rct = 10, Cd = 1e-4;
  const peak = P.semicirclePeak(Rct, Cd);
  const z = P.kineticImpedance(Ru, Rct, Cd, peak.omega);
  close(z.re, Ru + Rct / 2, 1e-9);
  close(z.negIm, Rct / 2, 1e-9);
  // any other frequency gives a smaller -Z_im
  assert.ok(P.kineticImpedance(Ru, Rct, Cd, peak.omega * 3).negIm < z.negIm);
  close(peak.f, peak.omega / (2 * Math.PI), 1e-12);
});

test('Warburg: real and imaginary parts equal, the 45 degree line (BFW eq. 11.3.27)', () => {
  const w = P.warburg(5, 100);
  assert.equal(w.re, w.negIm);
});

test('diffusion length uses (2Dt)^1/2 as BFW eq. 4.4.3 defines it', () => {
  close(P.diffusionLength(1e-10, 1), Math.sqrt(2e-10), 1e-15);
});

test('energy integral: a flat 3 V curve over 2 Ah stores 6 Wh (Goodenough and Park eq. 5)', () => {
  const q = [0, 1, 2], V = [3, 3, 3];
  close(P.energyFromCurve(q, V), 6, 1e-12);
  close(P.coulombicEfficiency(0.99, 1), 99, 1e-12);
});

test('reaction energy: dG = -nFE (Winter and Brodd eq. 3), 1 e at 1 V is -96.5 kJ/mol', () => {
  close(P.reactionEnergy(1, 1) / 1000, -96.485, 0.001);
});

test('ladder: every rung inside or outside the carbonate window is classified as the source says', () => {
  const w = P.data.carbonateWindow;
  const r = Object.fromEntries(P.data.ladder.map(x => [x.key, x.V]));
  assert.ok(r.gr < w.low);       // graphite needs an SEI (Goodenough and Park)
  assert.ok(r.lto > w.low);      // lithium titanate does not
  assert.ok(r.lco <= w.high);    // LiCoO2 inside
  assert.ok(r.lnmo > w.high);    // LiNi0.5Mn1.5O4 needs a passivation layer
});

test('calculator materials reproduce their printed values where a source prints one', () => {
  for (const m of P.data.materials) {
    if (m.printed) close(P.specificCapacity(m.n, m.M), m.printed, 1);
  }
});

test('lithium titanate: Faraday gives about 175 mAh/g for 3 Li, consistent with "under 150" practical (Goodenough and Park)', () => {
  const m = P.data.materials.find(x => x.key === 'lto');
  const q = P.specificCapacity(m.n, m.M);
  assert.ok(q > 150 && q < 180, String(q));
});

/* ---------- Module 0 and the corrected figures (added in the Act A rework) ---------- */

test('F = N_A e to the precision of the printed Faraday constant (BFW 1.1.5: 96,485.3 C/mol)', () => {
  close(P.NA * P.e, P.F, 0.05);
});

test('Coulomb force between two elementary charges 1 nm apart is 0.231 nN, repulsive (BFW 14.3.1 footnote 6, SI form)', () => {
  const Fc = P.coulombForce(P.e, P.e, 1e-9);
  close(Fc, 2.307e-10, 2e-13);
  assert.ok(P.coulombForce(P.e, -P.e, 1e-9) < 0);           // unlike charges attract
  close(P.coulombForce(P.e, P.e, 2e-9), Fc / 4, 1e-14);    // inverse square
});

test('field is force per unit charge and potential is its integral from infinity (BFW 2.2.1)', () => {
  const q = P.e, r = 2e-9;
  close(P.fieldOfCharge(q, r) * q, P.coulombForce(q, q, r), 1e-20);
  // phi(r) = q/(4 pi eps0 r): numerical integral of -E dr from far away to r
  let phi = 0, x = 1e-6, dx = -1e-11;
  while (x > r) { phi += -P.fieldOfCharge(q, x) * dx; x += dx; }
  close(phi, P.potentialOfCharge(q, r), P.potentialOfCharge(q, r) * 2e-3);
});

test('a volt is a joule per coulomb: one electron across 1 V is 1 eV = 96.5 kJ/mol (BFW 1.1.2, 1.1.4)', () => {
  close(P.energyOfCharge(1, 1), 1, 1e-12);                              // 1 C x 1 V = 1 J
  close(P.electronVolts(P.energyOfCharge(P.e, 1)), 1, 1e-12);          // 1 eV
  close(P.kJPerMolFromEV(1), 96.5, 0.05);
  close(P.kJPerMolFromEV(1.5), 144.7, 0.1);                            // the torch cell of module 0's example
});

test('a current of 1 A is 6.24e18 electrons per second (BFW eq. 1.1.13 with e)', () => {
  close(P.electronsPerSecond(1) / 1e18, 6.2415, 0.001);
});

test('Ohm: R = rho l / A and G = kappa A / l are reciprocal (BFW eqs. 4.2.6 and 4.2.8)', () => {
  const rho = 2, l = 0.5, A = 0.1;
  close(P.resistance(rho, l, A) * P.conductance(1 / rho, A, l), 1, 1e-12);
  close(P.ohmCurrent(1.5, 3), 0.5, 1e-12);
  close(P.power(0.5, 1.5), 0.75, 1e-12);
});

test('uniform field between parallel plates is V/l (BFW eq. 4.2.3): 1.5 V across 1 mm is 1500 V/m', () => {
  close(P.uniformField(1.5, 1e-3), 1500, 1e-9);
});

test('mobility: terminal velocity where |z| e E balances Stokes drag 6 pi eta r v (BFW eq. 2.3.9)', () => {
  const z = 1, eta = 1e-3, r = 1e-10, E = 100;
  const u = P.mobility(z, eta, r), v = P.driftVelocity(u, E);
  close(P.electricForce(z, E), P.stokesDrag(eta, r, v), 1e-30);
  assert.ok(P.mobility(2, eta, r) > u);                 // doubly charged ion moves faster in the same field
});

test('conductivity kappa = F sum |z| u C reduces to F(u+ + u-) C for a 1:1 salt (BFW eqs. 2.3.10, 2.3.13)', () => {
  const C = 100; // mol/m3 = 0.1 M
  const k = P.conductivity([{ z: 1, u: 3.6e-8, C }, { z: -1, u: 7.9e-8, C }]);
  close(k, P.F * (3.6e-8 + 7.9e-8) * C, 1e-9);
});

test('capacitor q = C E (BFW eq. 1.6.4): 2 V on 10 uF stores 20 uC, the book\'s example', () => {
  close(P.capacitorCharge(10e-6, 2), 20e-6, 1e-15);
});

test('Helmholtz capacitance eps eps0 / d (BFW eq. 14.3.2) is tens of uF/cm2 for a molecular gap', () => {
  const C = P.helmholtzCapacitance(6, 0.3e-9);      // illustrative dielectric constant and spacing
  const uFcm2 = C * 1e6 / 1e4;
  assert.ok(uFcm2 > 5 && uFcm2 < 60, String(uFcm2)); // the 10 to 40 uF/cm2 range of BFW 1.6.2
});

test('mercury-drop numbers: 5e-14 C/V is about 300 000 electrons per volt; 1e-6 C is about 6e12 electrons (BFW 2.2.1, 2.2.2)', () => {
  const es = P.data.electrostatics;
  close(es.mercuryDropVacuumCperV / P.e / 1e5, 3.12, 0.02);
  close(es.mercuryDropElectrolyteC / P.e / 1e12, 6.24, 0.02);
});

test('water window on the lithium scale: 3.045 to 4.274 V at pH 0, 1.229 V wide, 59 mV per pH unit (BFW Table C.1, eqs. 2.1.66, 2.1.67)', () => {
  const w0 = P.waterWindowVsLi(0), w7 = P.waterWindowVsLi(7), w14 = P.waterWindowVsLi(14);
  close(w0.low, 3.045, 1e-9); close(w0.high, 4.274, 1e-9); close(w0.width, 1.229, 1e-9);
  close(w0.low - w7.low, 7 * 0.059, 1e-9); close(w7.width, 1.229, 1e-9);
  close(w14.high, 4.274 - 14 * 0.059, 1e-9);
  // the whole window sits far above the old, wrong placement at 0 to 1.23 V vs Li
  assert.ok(w14.low > 2.2);
});

test('Daniell worked example: n = 2, E = 1.103 V gives dG = -212.8 kJ/mol (BFW Table C.1 and eq. 2.1.25)', () => {
  const d = P.data.daniell;
  close(d.E, 1.103, 1e-3);   // 1.1026 V, printed as 1.10 V on the page
  close(P.reactionEnergy(d.n, d.E) / 1000, -212.8, 0.1);
});

test('graphite | LiCoO2 on the mass of both active materials: 158 mAh/g and about 600 Wh/kg at 3.8 V; the 1991 cell at 120 to 150 Wh/kg is 20 to 25 % (R1 rule of thumb, R2 cell)', () => {
  const m = P.data.molarMass;
  const M = (m.Li + m.Co + 2 * m.O) + 6 * m.C;   // one electron per LiCoO2, one C6 host
  const q = P.specificCapacity(1, M);
  close(q, 158, 1);
  const wh = q * 3.8;
  assert.ok(wh > 590 && wh < 610, String(wh));
  assert.ok(120 / wh > 0.19 && 150 / wh < 0.26);
});

test('lithium metal is the most negative rung: Li+/Li = -3.045 V vs NHE (BFW Table C.1; Tarascon and Armand give -3.04 V)', () => {
  const s = P.data.standardPotentials;
  close(s['Li+/Li'], -3.045, 1e-9);
  assert.ok(s['Li+/Li'] < s['Zn2+/Zn'] && s['Zn2+/Zn'] < s['Cu2+/Cu']);
});

test('Brandt 1994: 99 % lithium cycling efficiency needs a three-fold excess for 300 cycles (eq. 2); 3861/4 = 965 Ah/kg', () => {
  close(P.lithiumExcess(300, 0.99), 3, 1e-9);
  close(P.specificCapacity(1, P.data.molarMass.Li) / (3 + 1), 965, 1);
});

test('LiClO4/PC at 60 % efficiency: R = N(1 - E) is 40 for 100 cycles (Brandt 1994, eq. 2)', () => {
  close(P.lithiumExcess(100, 0.60), 40, 1e-9);
});

test('GITT (Weppner and Huggins 1977, eq. 4): scaling checks D ~ 1/tau and D ~ (dEs/dEt)^2', () => {
  const D1 = P.gittD(100, 0.01, 30, 100, 1, 0.01, 0.05);
  close(P.gittD(200, 0.01, 30, 100, 1, 0.01, 0.05), D1 / 2, 1e-15);
  close(P.gittD(100, 0.01, 30, 100, 1, 0.02, 0.05), D1 * 4, 1e-15);
  close(D1, (4 / (Math.PI * 100)) * Math.pow(0.01 * 30 / (100 * 1), 2) * Math.pow(0.2, 2), 1e-18);
});

test('SEI square-root law (von Kolzenberg et al. 2020): 2 % after 1 month gives 6.9 % after 12 and 13.9 % after 48', () => {
  close(P.powerLawScale(2, 1, 12, 0.5), 6.93, 0.01);
  close(P.powerLawScale(2, 1, 48, 0.5), 13.86, 0.01);
  close(P.powerLawScale(2, 1, 12, 1), 24, 1e-9);
});

test('Randles circuit: semicircle peak at f = 1/(2 pi Rct Cd); 20 ohm and 20 uF give 398 Hz (Bard, Faulkner and White 11.4)', () => {
  close(P.semicirclePeak(20, 20e-6).f, 397.9, 0.1);
  const z = P.kineticImpedance(5, 20, 20e-6, 1 / (20 * 20e-6));
  close(z.re, 15, 1e-9); close(z.negIm, 10, 1e-9);
});

test('Module 7 counting: 1 mol LiPF6 per litre of EC:DMC 3:7 by volume gives about 12.7 solvent molecules per Li+, 4.5 EC and 8.2 DMC (Ue et al. 2014 Table 2.1)', () => {
  const n = P.solventPerIon([{ phi: 0.3, rho: 1.32, M: 88.1 }, { phi: 0.7, rho: 1.06, M: 90.1 }], 1);
  close(n, 12.73, 0.01);
  close(P.solventPerIon([{ phi: 0.3, rho: 1.32, M: 88.1 }], 1), 4.49, 0.01);
  close(P.solventPerIon([{ phi: 0.7, rho: 1.06, M: 90.1 }], 1), 8.24, 0.01);
});

test('Module 7 spacing, field and drift: 1 M gives 1.18 nm between Li+; 1 mA/cm2 in 10 mS/cm gives 0.1 V/cm and 0.10 um/s', () => {
  close(P.meanSpacing(1) * 1e9, 1.184, 0.001);
  close(P.bulkField(10, 1), 10, 1e-12);                 // 1 mA/cm2 = 10 A/m2; 10 mS/cm = 1 S/m; 10 V/m = 0.1 V/cm
  close(P.meanIonVelocity(10, 1000) * 1e6, 0.1036, 0.0001); // um/s
  close(25e-6 / P.meanIonVelocity(10, 1000), 241, 1);     // seconds to cross 25 um
});

test('Module 5 bench: 2 A for 30 min passes 3600 C = 1 Ah; 1C for a 2.1 Ah cell is 2.1 A; C/20 of 210 mAh is 10.5 mA (Olson et al. 2023)', () => {
  close(P.chargePassed(2, 1800), 3600, 1e-9);
  close(P.chargePassed(2, 1800) / 3600, 1, 1e-12);
  close(P.cRateCurrent(2.1, 1), 2.1, 1e-12);
  close(P.cRateCurrent(0.210, 1 / 20) * 1000, 10.5, 1e-9);
});

test('LiFePO4 open-circuit fit (Safari and Delacourt 2011, eq. 10): flat at 3.432 V from y = 0.15 to 0.85, sloping ends', () => {
  [0.15, 0.3, 0.5, 0.7, 0.85].forEach(y => close(P.lfpOcp(y), 3.432, 0.002));
  assert.ok(P.lfpOcp(0.02) > 3.7 && P.lfpOcp(0.98) < 3.0);
  for (let y = 0.01; y < 0.99; y += 0.01) assert.ok(P.lfpOcp(y + 0.01) <= P.lfpOcp(y) + 1e-6);
});

test('LiFePO4 diffusion coefficient (Safari and Delacourt eq. 12): 1.184e-18 empty, 3.907e-19 m2/s full', () => {
  close(P.lfpDiffusion(0), 1.184e-18, 1e-21);
  close(P.lfpDiffusion(1), 3.907e-19, 1e-21);
});

test('EDLC step response (Moya 2025, eqs. 6, 7, 12, 16): jump RH I0, slope I0/C, reversal drop 2 RH I0', () => {
  const RH = 0.31, Ri = 0.32, C = 0.94, tau = 0.095, I0 = 0.05, t0 = 10;
  close(P.edlcCharge(0, I0, RH, Ri, C, tau), RH * I0, 1e-12);
  close(P.edlcCharge(5, I0, RH, Ri, C, tau) - P.edlcCharge(4, I0, RH, Ri, C, tau), I0 / C, 1e-9);
  const V0 = P.edlcCycle(t0 - 1e-9, t0, I0, RH, Ri, C, tau);
  close(V0, (RH + Ri) * I0 + I0 * t0 / C, 1e-6);          // eq. 15 with t0 >> tau
  close(P.edlcCycle(t0, t0, I0, RH, Ri, C, tau), V0 - 2 * RH * I0, 1e-6); // eq. 16
  close(2 * C / 7, 0.269, 0.001);                          // eq. 33, Ci = 2C/7 (Table 2 fit: 0.297 F)
});

test('Porous electrode (Doyle, Fuller and Newman 1993, eq. 26 with Table II): solid diffusion ratio about 1e-4 at 10 A/m2', () => {
  close(P.solidDiffusionRatio(1e-6, 10, 5e-13, 0.3, 29000, 100e-6), 1.02e-4, 0.01e-4);
});

test('LiFePO4 resistive-reactant model (Safari and Delacourt 2011): rate, asymmetry, sequential groups and path dependence', () => {
  const run = (y0, I, o) => P.lfpElectrode({ y0 }).run(I, o);
  const C = P.lfpElectrode().oneC;
  close(C, 18.4, 0.05);                                      // 1C on the theoretical capacity, A/m2
  const slow = run(0.005, -C / 25), fast = run(0.005, -C);
  const uSlow = slow[slow.length - 1].y, uFast = fast[fast.length - 1].y;
  assert.ok(uSlow > 0.98 && uFast < uSlow - 0.05);            // less capacity at 1C
  const chFast = run(0.995, C); assert.ok(0.995 - chFast[chFast.length - 1].y > uFast - 0.005); // charge utilization above discharge
  const g = fast[Math.floor(fast.length * 0.3)].groups;       // best-connected group fills first
  assert.ok(g[0].y > g[1].y && g[1].y > g[2].y && g[2].y > g[3].y);
  // path dependence: half charge at C/25 from empty, or half discharge from full, then 2 h rest
  const sd = gs => { const m = gs.reduce((s, x) => s + x.y, 0) / 4; return Math.sqrt(gs.reduce((s, x) => s + (x.y - m) ** 2, 0) / 4); };
  function hist(fromEmpty) {
    const m = P.lfpElectrode({ y0: fromEmpty ? 0.995 : 0.005 });
    const a = m.run(fromEmpty ? C / 25 : -C / 25, { yStop: 0.5 }), r = m.run(0, { tmax: 7200, dtmax: 300 }), b = m.run(C);
    return { sd0: sd(a[a.length - 1].groups), sd1: sd(r[r.length - 1].groups), util: r[r.length - 1].y - b[b.length - 1].y };
  }
  const A = hist(true), B = hist(false);
  close(A.sd0, 0.097, 0.01);                                  // Safari and Delacourt: 0.0973 (case 1)
  close(A.sd1, A.sd0, 0.002);                                 // no relaxation on the flat plateau
  assert.ok(A.util < B.util);                                 // coming from empty limits the 1C charge
});

/* ---------- Module 11: impedance and GITT ---------- */
const M = P.m11;
const ok = (c, msg) => assert.ok(c, msg);
test('Impedance of the passive elements (Lazanas and Prodromidis eqs 36, 41, 43): R real, C = -j/(wC), L = +j wL', () => {
  const w = 2 * Math.PI * 50;
  close(M.zC(1e-3, w).im, -1 / (w * 1e-3), 1e-12); close(M.zL(1e-3, w).im, w * 1e-3, 1e-12); close(M.zR(5).re, 5, 0);
});
test('Parallel RC: at the top of the arc w = 1/(RC) and Z = R/2 - jR/2 (Lazanas and Prodromidis eq 49 and text after it)', () => {
  const R = 1000, C = 1e-6, w = 1 / (R * C), z = M.parallel(M.zR(R), M.zC(C, w));
  close(z.re, R / 2, 1e-9); close(z.im, -R / 2, 1e-9);
});
test('Characteristic frequency 2 pi f tau = 1 (Lazanas and Prodromidis eq 2): 0.51 ms gives 310 Hz and 0.41 s gives 0.4 Hz', () => {
  close(1 / (2 * Math.PI * 0.51e-3), 312, 3); close(1 / (2 * Math.PI * 0.41), 0.388, 0.002);
});
test('Low frequencies are slow (Lazanas and Prodromidis sec. 1): one period at 10 uHz is 1e5 s = 27.8 h; at 1 mHz about 17 min', () => {
  close(1 / 1e-5 / 3600, 27.8, 0.05); close(1 / 1e-3 / 60, 16.7, 0.05);
});
test('Amplitudes (Lazanas and Prodromidis eq 4 and sec. 16.2): 10 mV peak is 20 mV peak-to-peak and 7 mV rms', () => {
  close(2 * 10, 20, 0); close(10 / Math.SQRT2, 7.07, 0.01);
});
test('CPE (Lazanas and Prodromidis eq 70, Table 2): phase is n x 90 degrees, so n = 0.9 gives 81 and n = 0.5 gives 45', () => {
  [[0.9, 81], [0.8, 72], [0.5, 45], [1, 90]].forEach(([n, ph]) => { const z = M.zQ(1e-3, n, 2 * Math.PI * 7); close(-Math.atan2(z.im, z.re) * 180 / Math.PI, ph, 1e-9); });
});
test('Finite diffusion (Lazanas and Prodromidis eqs 76, 79): both tend to the 45-degree Warburg line at high frequency; reflective becomes capacitive, transmissive resistive at low frequency', () => {
  const zt = M.zFiniteT(1e-2, 1, 2 * Math.PI * 1e4), zr = M.zFiniteR(1e-2, 1, 2 * Math.PI * 1e4);
  close(-Math.atan2(zt.im, zt.re) * 180 / Math.PI, 45, 0.01); close(-Math.atan2(zr.im, zr.re) * 180 / Math.PI, 45, 0.01);
  const lt = M.zFiniteT(1e-2, 1, 1e-5), lr = M.zFiniteR(1e-2, 1, 1e-5);
  close(lt.re, 100, 0.01); ok(-lr.im > 100 * lr.re);
});
test('Spherical diffusion impedance (Abbas et al. 2025 eqs 6, 7): DC real part Rd/15, high-frequency limit (1/3) sqrt(Rd/(j w Cd))', () => {
  close(M.zSphere(0.3, 3000, 1e-8).re, 0.3 / 15, 1e-6);
  const w = 2 * Math.PI * 100, z = M.zSphere(0.3, 3000, w), lim = 1 / 3 * Math.sqrt(0.3 / (w * 3000));
  close(z.re, lim / Math.SQRT2, lim * 0.01); close(-z.im, lim / Math.SQRT2, lim * 0.01);
});
test('Porous electrode line: 45 degrees at high frequency, sqrt(Rm Rct) coth sqrt(Rm/Rct) at low frequency (Meddings et al. sec. 3.2.2)', () => {
  const Rm = 2, Rct = 5, Cdl = 1e-3, zh = M.zPorous(Rm, Rct, Cdl, 2 * Math.PI * 1e6), zl = M.zPorous(Rm, Rct, Cdl, 1e-6);
  close(-Math.atan2(zh.im, zh.re) * 180 / Math.PI, 45, 0.1);
  close(zl.re, Math.sqrt(Rm * Rct) / Math.tanh(Math.sqrt(Rm / Rct)), 1e-3);
});
test('Two different circuits, one spectrum (Lazanas and Prodromidis Fig. 7): the ladder from voigtToLadder matches R0(R1C1)(R2C2) everywhere', () => {
  const L = M.voigtToLadder(0.01, 0.1, 0.02, 5);
  [1e-3, 0.1, 1, 10, 1e3, 1e5].forEach(f => { const w = 2 * Math.PI * f; const a = M.add(M.zR(0.02), M.parallel(M.zR(0.01), M.zC(0.1, w)), M.parallel(M.zR(0.02), M.zC(5, w))); const b = M.ladderZ(0.02, L, w); ok(M.abs(M.add(a, M.scale(b, -1))) < 1e-12 * M.abs(a)); });
});
test('Butler-Volmer under a sine (BFW eqs 3.4.11, 3.4.13): small amplitude gives R_ct = RT/(F i0); alpha = 0.5 has no second harmonic', () => {
  const h = M.bvHarmonics(1e-3, 0.5, 0.002); close(h.rApparent / h.rct, 1, 0.001); ok(h.amps[2] < 1e-15); ok(h.thd < 1e-3);
  const g = M.bvHarmonics(1e-3, 0.3, 0.05); ok(g.amps[2] / g.amps[1] > 0.1);
});
test('Linear Kramers-Kronig test (Boukamp; Meddings et al. sec. 3.3.1): a valid spectrum fits to well below 1 %', () => {
  const fs = M.freqs(1e4, 1e-2, 8), Z = fs.map(f => M.cellZ(null, 2 * Math.PI * f)), k = M.linKK(fs, Z);
  ok(Math.max.apply(null, k.res.map(r => Math.max(Math.abs(r.re), Math.abs(r.im)))) < 0.01);
});
test('DRT (Meddings et al. eq 5): two R||C elements give two peaks at their time constants carrying their resistances', () => {
  const fs = M.freqs(1e5, 1e-2, 10), Z = fs.map(f => { const w = 2 * Math.PI * f; return M.add(M.zR(0.02), M.parallel(M.zR(0.01), M.zC(1e-3, w)), M.parallel(M.zR(0.02), M.zC(1, w))); });
  const taus = []; for (let k = 0; k <= 60; k++) taus.push(Math.pow(10, -7 + 9 * k / 60));
  const d = M.drt(fs, Z, taus, 1e-8), tot = d.x.reduce((a, b) => a + b, 0);
  close(d.R0, 0.02, 2e-4); close(tot, 0.03, 3e-4);
  const near = (tau) => d.x.reduce((s, x, k) => s + (Math.abs(Math.log10(taus[k] / tau)) < 0.5 ? x : 0), 0);
  close(near(1e-5), 0.01, 5e-4); close(near(0.02), 0.02, 5e-4);
});
test('GITT slab (Kim et al. eqs 3-8; Kang and Chueh eq A.21): numerical surface change matches the exact series and the 2 sqrt(t/pi) short-time law', () => {
  const r = M.gittSlab({ tau: 0.05, tEnd: 0.5, N: 161, steps: 4000 }), at = t => r.us[r.t.findIndex(x => x >= t)];
  close(at(0.01), 2 * Math.sqrt(0.01 / Math.PI), 2e-3); close(at(0.05), M.slabSurface(0.05), 2e-3);
  const fr = r.frames[r.frames.length - 1]; close(fr.u.reduce((a, b) => a + b, 0) / fr.u.length, 0.05, 1e-3);
});
test('Sphere (Nickol et al. eqs 4-5): short-time law within 5 % for small Dt/r^2 (Nickol: below 0.0032; our series reaches 5 % at about 0.0027), long-time 3 tau + 1/5', () => {
  ok(Math.abs(M.sphereF(0.0025) / (2 * Math.sqrt(0.0025 / Math.PI)) - 1) < 0.05); const r32 = M.sphereF(0.0032) / (2 * Math.sqrt(0.0032 / Math.PI)); ok(r32 > 1.04 && r32 < 1.06); close(M.sphereF(3) - 3 * 3, 0.2, 1e-6);
});
test('Nickol et al. numbers: D = 1e-15 m2/s and r = 5 um keep the sqrt(t) law within 5 % only for t < 80 s; sqrt(D tP) > 8 r for r = 0.25 um needs tP > 4000 s; D scales as r^2 (5 vs 0.25 um: 400 times)', () => {
  close(0.0032 * (5e-6) ** 2 / 1e-15, 80, 0.01); close((8 * 0.25e-6) ** 2 / 1e-15, 4000, 1e-6);
  close(M.gittDSphere(600, 5e-6, 0.01, 0.03) / M.gittDSphere(600, 0.25e-6, 0.01, 0.03), 400, 1e-9);
});
test('Weppner-Huggins for spheres (Abbas et al. eq 3) equals the general form (Kim et al. eq 16) with mB VM/(MB S) = r/3', () => {
  const r = 2.54e-4, tau = 600, dEs = 0.01, dEt = 0.03;
  close(M.gittDSphere(tau, r, dEs, dEt), P.gittD(tau, 1, r / 3, 1, 1, dEs, dEt), 1e-25);
});
test('Kang and Chueh: tau_hat = D tau / L^2 (eq 5); their relaxation variable sqrt(t + tau) - sqrt(t) (eq 4) starts at sqrt(tau) and falls to 0', () => {
  close(M.tauHat(1e-15, 600, 2.54e-6), 0.093, 0.001); close(M.kangVariable(0, 600), Math.sqrt(600), 1e-12); ok(M.kangVariable(1e9, 600) < 0.01);
});
test('Step response of the series model: instantaneous drop R0, then the arcs, then diffusion (Meddings et al. sec. 3.1)', () => {
  const p = { R0: 0.02, R1: 0.004, C1: 0.25, R2: 0.01, C2: 2, sigma: 0.002 };
  close(M.stepResistance(p, 0), 0.02, 1e-12); ok(M.stepResistance(p, 1) > 0.034);
});

test('Warburg step response 2 sigma sqrt(2t/pi) (this page\'s working) matches a numerical inverse Laplace transform of Z_W(s)/s', () => {
  // Gaver-Stehfest inversion of F(s) = sigma sqrt(2) s^-3/2, the voltage per unit current step through Z_W = sigma sqrt(2) (j w)^-1/2
  const sigma = 0.002, N = 14, fact = n => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
  const V = []; for (let k = 1; k <= N; k++) { let s = 0; for (let j = Math.floor((k + 1) / 2); j <= Math.min(k, N / 2); j++) s += Math.pow(j, N / 2) * fact(2 * j) / (fact(N / 2 - j) * fact(j) * fact(j - 1) * fact(k - j) * fact(2 * j - k)); V.push((((k + N / 2) % 2) ? -1 : 1) * s); }
  const inv = (F, t) => { const a = Math.LN2 / t; let s = 0; for (let k = 1; k <= N; k++) s += V[k - 1] * F(k * a); return a * s; };
  const p = { R0: 0, R1: 0, C1: 1, R2: 0, C2: 1, sigma };
  for (const t of [0.5, 3, 40]) close(inv(s => sigma * Math.SQRT2 * Math.pow(s, -1.5), t), M.stepResistance(p, t), 1e-6 * M.stepResistance(p, t) + 1e-9);
});
