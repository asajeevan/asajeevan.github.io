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
