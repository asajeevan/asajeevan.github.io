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
