# Verification record for the battery-basics plan

Date: 2026-09-26. Scope: every definition, number, mechanism and equation that appears
in `battery-basics-plan.md`. Method: each item was compared line by line with the full
text of the three supplied articles (R1 Winter and Brodd 2004, R2 Tarascon and Armand
2001, R6 Goodenough and Park 2013) and, where they do not derive it, with standard
electrochemistry (Bard and Faulkner, Newman). Arithmetic was recomputed.

Status codes:
- **OK (source)**: matches the supplied article's text exactly or by close paraphrase.
- **OK (standard)**: standard textbook result, consistent with the articles, not derived
  in them; the textbook citation remains tier 3 until its ISBN/DOI is verified.
- **CORRECTED**: the plan was wrong or ambiguous; the entry says what was changed.
- **PENDING**: cannot be verified from this environment; says what is needed.

## A. Corrections made in this audit (read these first)

| # | What the plan said | Problem | Correction |
|---|---|---|---|
| 1 | "LiC6 through Faraday's law gives 372 mAh/g" | 372 mAh/g is the capacity of graphite referred to the mass of carbon (C6, 72.07 g/mol). On the LiC6 mass basis (79.0 g/mol) Faraday's law gives 339 mAh/g. Recomputed: F/(3.6 x 72.066) = 371.9; F/(3.6 x 79.007) = 339.2. | Mass-basis convention stated on the calculator and the T1 card: delithiated host for negative electrodes, lithiated compound for positive electrodes. Check values now "372 mAh/g for graphite on the C6 basis, 170 mAh/g for LiFePO4 (157.76 g/mol: 169.9)". |
| 2 | "LiFePO4 165 mAh/g at 90 % utilization [R2]" | R2's sentence is "used at 90 % of its theoretical capacity (165 mA h g-1)". It is ambiguous whether 165 is the theoretical value or the delivered one. | The page cites 170 mAh/g theoretical from R6 and "about 90 % of it" from R2, and does not present 165 as a measured practical value. |
| 3 | "Na-S and ZEBRA cells run at 300 to 350 C [R6]" | R6 gives that temperature for the sodium-sulfur battery; it does not state the ZEBRA operating temperature. | Attributed to Na-S only; ZEBRA described as its NaCl/Fe variant. |
| 4 | Figure 6.2 constraint "the SEI forms on the negative electrode only" | R6 describes a passivation layer (which it also calls an SEI) on high-voltage positive electrodes such as LiNi0.5Mn1.5O4 at about 4.75 V. | "Only" removed; the caption notes the positive-electrode case above about 4.3 V versus Li. |
| 5 | "Goodenough's cell that survived 30 000 cycles [R6]" | The 30 000-cycle result is Zaghib et al. (J. Power Sources 2011), cited by R6, for lithium titanate and LiFePO4 electrodes at 5C. | Attributed to Zaghib and co-workers, cited via R6 and L16. |
| 6 | Hook: "Why is a lithium cell 3.7 V and a torch battery 1.5 V?" | 3.7 V is not a number in the sources; R2 says "exceeding 3.6 V", R1 Table 2 says 4.0 V nominal. | Hook now says "over 3.6 V" [R2]. |
| 7 | Figure 11.1 "semicircle peak frequency labelled as 1/(RC)" | The peak is at angular frequency omega = 1/(R_ct C); the frequency is f = 1/(2 pi R_ct C). R1 itself writes the shorthand "tau = 1/f_m = RC", which omits the 2 pi. | Exact relation stated; R1's shorthand noted as such. Same fix on the T7 card. |
| 8 | Butler-Volmer written with eta without a convention | R1 defines the cell polarization eta = E_OCV - E_T (positive on discharge, whole cell); Butler-Volmer uses a per-electrode overpotential E - E_eq with its own sign. Mixing them is a classic error. | The T3 card states both conventions and the symbol table gives them different names. |
| 9 | "retention after N cycles = CE^N" | True only if every unit of charge lost per cycle is lithium lost for good; real fade also has reversible, rate-dependent parts (R6). | Stated as an upper-bound idealization. |
| 10 | Energy efficiency and Coulombic efficiency cited as "R6 eqs. 3 and 4" | Those equations were images in the supplied file; the plan's forms are the standard ones, not transcriptions. | Card published only after the printed forms are confirmed from the PDF. Same for "Voc = (muA - muC)/e", now cited as "the equation following eq. 5" pending transcription. |
| 11 | "Copper collector for graphite, aluminium for the positive electrode" stated without source; coin-cell stack order (spring, spacer) stated without source | Not in the three articles as direct statements; R6 supports the collector choice indirectly. | Cited to B1 and R21 once verified; the exploded coin cell shows only the electrochemical stack until then. |
| 12 | "Lithium is the most electropositive metal" | R2's wording; strictly it means the most negative standard electrode potential. | Both wordings given. |
| 13 | "Transference number" with R2 values | R2 uses "transport number" for the same quantity. | Synonymy noted on the card. |

## B. Definitions (module 1, 2 and glossary)

| Item | Status | Basis |
|---|---|---|
| Copper collector for graphite, aluminium for LiCoO2 | OK (source): drawn in R6 Figure 1 | R6 Fig. 1 |
| Battery: one or more electrically connected cells with terminals; a single unit is a cell | OK (source) | R1 sec. 1.2 and footnote 1 |
| Primary: assembled charged, used once; secondary: restored by reverse current, usually assembled discharged, charged before first use | OK (source) | R1 sec. 1.2 |
| Anode = negative electrode, oxidation, releases electrons to the external circuit; cathode = positive electrode, reduction | OK (source) | R1 sec. 1.2; consistent with R6 ("reductant (anode) and oxidant (cathode)") |
| Active mass, electrolyte ("pure ionic conductivity"), separator (ion-permeable, inert) | OK (source) | R1 sec. 1.2 |
| Open-circuit and closed-circuit voltage, discharge, charge, internal resistance | OK (source) | R1 sec. 1.2 |
| Faraday constant 96 485.3 C per equivalent = 26.8015 Ah per equivalent | OK (source); arithmetic checked: 96 485.3 / 3600 = 26.8015 | R1 sec. 1.2 |
| Thermal runaway: self-sustaining, autocatalytic electrode-electrolyte reaction | OK (source) | R1 sec. 1.2 |
| Electrolyte carries the ionic part of the reaction and forces electrons through the external circuit | OK (source) | R6, Electrochemical Cells |
| Batteries closed systems, fuel cells open, supercapacitors double-layer storage; not Carnot-limited | OK (source) | R1 sec. 1.1 |
| Negative electrode a reducing agent (Li, Zn, Pb), positive an electron acceptor (LiCoO2, MnO2, PbO2) | OK (source) | R1 sec. 2.2 |
| Composite electrode: active particles, conductive diluent, binder, about 30 % porosity | OK (source) | R1 sec. 1.6 |
| Large-area electrodes and thin electrolyte because ionic mobility is far below electronic conductivity | OK (source) | R6 |
| Nominal voltages: alkaline 1.5, zinc-air 1.2, lead-acid 2.0, Ni-Cd 1.2, Ni-MH 1.2, Li-ion 4.0 | OK (source), dated 2004 | R1 Table 2 |
| Cell formats and "plastic Li-ion contains no free electrolyte" | OK (source) | R2 Fig. 4; R1 Fig. 20 |

## C. Voltage and thermodynamics (module 3, chapter T2)

| Item | Status | Basis |
|---|---|---|
| Voc = (muA - muC)/e | OK (source, confirmed from the printed page) | R6 eq. 6 |
| Delta G = Delta H - T Delta S; Delta G = -nFE; van't Hoff isotherm | OK (source, confirmed from the printed page) | R1 eqs. 1 to 5 |
| Nernst E = E0 - (RT/nF) ln(A_P/A_R) | CORRECTED SOURCE: R1 prints eq. 6 with a plus sign, inconsistent with its eqs. 3 to 5; the plan's minus form follows from them and matches B2 eq. 2.1.40, E = E0 - (RT/nF) ln(a_R^nuR / a_O^nuO) | R1 eqs. 3 to 5; B2 eq. 2.1.40 |
| dE/dT = Delta S/(nF); positive dE/dT: heats on charge, cools on discharge; lead-acid negative, Ni-Cd positive | OK (source); sign logic checked: reversible heat on discharge = T Delta S = nFT dE/dT, absorbed when positive | R1 sec. 1.3 |
| Lithium: -3.04 V vs SHE, 6.94 g/mol, 0.53 g/cm3 | OK (source) | R2 |
| Aqueous window 1.23 V thermodynamic, about 2 V kinetic; about 1.5 V practical maximum | OK (source) | R1 sec. 2.2; R6 |
| Carbonate electrolyte: HOMO about 4.3 eV below muA(Li); muA(Li) about 1.1 eV above the LUMO; window about 3 eV; practical limit about 4.6 V | OK (source); consistency: 4.3 - 1.1 = 3.2, matching "about 3 eV" | R6; R1 sec. 2.2 |
| Window band on the ladder from about 1.1 V to about 4.3 V vs Li; SEI flag below 1.1 V, oxidation flag above 4.3 V | OK (derived from R6's energy statements: a level x eV below muA(Li) is x V vs Li/Li+) | R6 Fig. 2 logic |
| Nonaqueous thermodynamic window 3.5 V, kinetically used to 5.5 V | OK (source) | R2 |
| Ladder rungs vs Li/Li+: graphite about 0.2, alloys 0.2 to 0.8, lithium titanate 1.5, TiS2 about 2.2, LiFePO4 3.5, LiCoO2 about 4.0, LiNi0.5Mn1.5O4 about 4.75 | OK (source) | R6 |
| Sulfur 2.4 V, thiolates up to 3 V | OK (source) | R2 |
| Top of S-3p band about 2.5 eV and O-2p band about 4.0 eV below muA(Li); oxides therefore about 4 V | OK (source) | R6 |
| Polyanion inductive effect raises redox potentials | OK (source) | R6; R2 |
| Gibbs phase rule F = C - P + 2; two-phase reaction gives constant voltage, single-phase a slope | OK (source) | R1 sec. 2.4 |
| Daniell cell 1.10 V | OK (B2): standard potentials Cu2+/Cu +0.340 V, Zn2+/Zn -0.7626 V vs NHE, difference 1.103 V | B2 appendix table of standard potentials |
| Regular-solution OCV model | OK (R39, Bazant eqs. 47 and 48): mu_Li = kT ln(x/(1-x)) + Omega(1-2x); Delta phi(x) = Delta phi0 - mu_Li/e + (kT/e) ln a_e | Bazant draft in hand; journal version to confirm |

## D. Capacity, energy, power (module 4, chapters T1 and T4)

| Item | Status | Basis |
|---|---|---|
| Faraday's law m = I t M/(nF), "no known exceptions" | OK (source; standard form) | R1 sec. 1.3 |
| Q_spec = nF/(3.6 M) mAh/g | OK (standard); derivation: C/g to mAh/g divides by 3.6 | arithmetic |
| Graphite 372 mAh/g (C6 basis), about 350 practical | CORRECTED (A1); OK after correction | R2 |
| LiFePO4 170 mAh/g theoretical | OK (source); recomputed 169.9 | R6 |
| LiCoO2 about 140 mAh/g practical at about 4.2 V cut-off, 0.5 Li | OK (source) | R2 |
| Lithium metal 3861 mAh/g | OK (computed from R2's molar mass and R1's F; labelled computed) | arithmetic |
| Specific energy Wh/kg, energy density Wh/L, specific power W/kg, power density W/L; Ragone ordering | OK (source) | R1 sec. 1.1 |
| Energy = integral of V over q; Q = integral of I dt; average voltage times capacity; Q depends on I | OK (source, confirmed from the printed page) | R6 eqs. 3 and 5 and text |
| Practical about 25 % of theoretical (rechargeable), over 50 % (primary); three reasons | OK (source), rule of thumb | R1 sec. 1.1 |
| 30 Wh/kg runs a 60 W lamp for 0.5 h per kg | OK (source); arithmetic: 30 Wh / 60 W = 0.5 h | R1 footnote 3 |
| 1991 Sony cell over 3.6 V, 120 to 150 Wh/kg | OK (source) | R2 |
| Series adds voltage, parallel adds current/time | OK (source) | R6 |
| Coulombic efficiency 100 x Q_dis/Q_ch; storage efficiency 100 x integral V_dis dq / integral V_ch dq | OK (source, confirmed from the printed page) | R6 eqs. 4 and 2 |

## E. Kinetics and the voltage curve (module 5, chapter T3)

| Item | Status | Basis |
|---|---|---|
| V_dis = Voc - eta(q, I_dis); V_ch = Voc + eta(q, I_ch); eta = I Rb | OK (source, confirmed from the printed page) | R6 eqs. 1.1 and 1.2 |
| eta = E_OCV - E_T; activation, ohmic, concentration polarization | OK (source) | R1 sec. 1.4 |
| Time scales: ohmic under 1e-6 s, activation 1e-4 to 1e-2 s, concentration 1e-2 s and slower | OK (source) | R1 sec. 1.4 |
| Exchange current density about 1e-2 A/cm2 favoured | OK (source) | R1 sec. 1.4 |
| Butler-Volmer | OK (B2 eq. 3.4.11): i = i0[exp(-alpha f eta) - exp((1 - alpha) f eta)], cathodic current positive, f = F/RT, eta = E - E_eq, alpha the cathodic transfer coefficient (0.3 to 0.7 in most cases); valid below about 10 % of the smaller limiting current. The card states this and the anodic-positive form with the mapping alpha_c = alpha, alpha_a = 1 - alpha. R1's printed eq. 13 remains erroneous (missing bracket and sign) | B2 eq. 3.4.11; convention note (A8) |
| Tafel | OK (B2 eqs. 3.4.14 to 3.4.16): eta = (RT/alpha F) ln i0 - (RT/alpha F) ln i for the cathodic branch, a = (2.303RT/alpha F) log i0, b = -2.303RT/alpha F, valid for abs(eta) > 118 mV at 25 C; R1's eta = a - b log(I/I0) is consistent with this | B2; R1 eq. 14 |
| Ohmic eta = IR | OK (source, confirmed) | R1 eq. 15 |
| Concentration polarization | CORRECTED SOURCE: R1's printed eq. 16 reads (RT/n) ln(C/C0), missing F and dimensionally wrong; page uses (RT/nF) ln(C/C0) | R1 eq. 16; dimensional check |
| Faraday's law g = I t (MW)/(nF) | OK (source, confirmed) | R1 eq. 7 |
| Delta S = nF dE/dT from eqs. 8 and 9 | OK (source, confirmed) | R1 eqs. 8 and 9 |
| Heat q = T Delta S + I(E_OCV - E_T), q = heat given off | CAVEAT: sign of the entropic term depends on the convention for Delta S; taken literally it contradicts R1's own text for positive dE/dT; page uses the Bernardi form anchored on R1's text | R1 eqs. 10 and 11 |
| R_ct = RT/(F i0) for one electron, RT/(nF i0) multistep | OK (B2): eqs. 3.4.12, 3.4.13 and 3.7.25 | B2 |
| Discharge curve with the three polarizations | OK (source) | R1 Fig. 6 |
| LiFePO4 flat two-phase; LiMn2O4 steps near 4 V and drop to 3 V at x = 0.5 | OK (source) | R6 Figs. 5 and 6 |
| Reversible (rate) versus irreversible loss; Coulombic efficiency; cycle life to 80 % | OK (source) | R6 |
| At least 300 full cycles with under 20 % loss; 3 to 8 h charge; 15 min desired; flat versus sloping preference | OK (source) | R1 sec. 2.6 |
| Entropic plus Joule heat | OK (source) | R1 sec. 1.3 |

## F. Lithium-ion cell (module 6, chapter T6)

| Item | Status | Basis |
|---|---|---|
| Insertion definition; reversibility from structure and shape stability; "intercalation" for layered hosts | OK (source) | R1 sec. 2.4, footnote 4 |
| Rocking chair: second insertion material replaces Li metal; Murphy, Scrosati; Sony June 1991 C/LiCoO2 | OK (source) | R2 |
| Timeline: intercalation 1970 to 1972; Whittingham TiS2/Li 2.2 V 1976; LiCoO2 1980; Yazami graphite 1983; Yoshino; Sony 1991 | OK (source); years cross-checked with the reference lists (L1, L2, L4, L19) | R6; R2 |
| Built discharged; first-charge SEI on graphite (about 0.2 V vs Li, above the LUMO); consumes cathode lithium; adds impedance; evolves | OK (source) | R6 |
| Only ethylene carbonate forms the protective layer on graphite; propylene carbonate does not, reason unknown | OK (source) | R2 |
| SEI electronically insulating, Li+-selective | OK (source) | R1 sec. 2.4 |
| LiCoO2 to about 4.2 V and 0.5 Li; oxygen evolution beyond x = 0.55 | OK (source) | R2; R6 |
| Lithium titanate 1.5 V, no SEI, 30 000 cycles at 5C | OK (source), attribution corrected (A5) | R6 citing Zaghib et al. |
| Li paths: layered 2D, spinel 3D, olivine 1D | OK (source) | R6 |
| Graphite LixC with x up to 1/6 | OK (source), consistent with LiC6 | R6 |
| Fick's first law J = -D dC/dx; diffusion length | OK (B2 eqs. 4.4.9 and 4.4.3), with one ADJUSTMENT: B2 defines the diffusion length as the rms displacement (2Dt)^1/2, so the plan now uses (2Dt)^1/2 and the time scale L2/(2D), stated as an order-of-magnitude estimate | B2 |
| GITT relation D = (4/(pi tau)) (m_X V_M/(M_X S))^2 (Delta E_s/Delta E_t)^2, tau << L^2/D | OK (R38, printed eq. 4 read from the page) | Weppner and Huggins, J. Solid State Chem. 1977 |

## G. Electrolytes (module 7, chapter T5)

| Item | Status | Basis |
|---|---|---|
| Aqueous about 1 S/cm; organic 1e-2 to 1e-3 S/cm; ion pairing | OK (source) | R1 sec. 2.2 |
| LiPF6 in EC with linear carbonates | OK (source) | R1 Table 2 footnote |
| LiTFSI: high conductivity, safe, corrodes Al above 4 V unless a passivating salt is added | OK (source) | R2 |
| Dry PEO: ions move assisted by chain motion; Li-SPE needs up to 80 C | OK (source) | R2 |
| Triflate to TFSI: one order of magnitude; 10 to 25 % plasticizer: one order of magnitude; gels 60 to 95 % liquid, 2 to 5 times below liquid; lightly plasticized suits Li metal, gels need Li-ion | OK (source) | R2 and Fig. 8 |
| 10 % nanofillers: severalfold conductivity at 60 to 80 C, transport number about 0.3 to about 0.6, stable interface with Li | OK (source), terminology noted (A13) | R2 |
| Solid electrolyte requirements (4 items); garnet above 1e-3 S/cm; polymer above 1e-4 S/cm with contact "yet to be demonstrated" (2013); contact loss with volume change | OK (source), dated | R6 |
| Conductivity kappa = F sum abs(z_j) u_j C_j; transference number t_j = abs(z_j) u_j C_j / sum abs(z_k) u_k C_k | OK (B2 eqs. 2.3.10, 4.2.7, 2.3.11); plan notation changed to B2's | B2 |
| Arrhenius; VFT form | OK (standard), VFT tier 3 | Hallinan and Balsara or Huggins |
| Steady-state gradient Delta c = (1 - t+) i L/(F D_eff) | OK: derived on the card from the salt balance in Boz et al. eq. 12 (Newman porous-electrode theory) | R36 |
| Bates thin-film glassy electrolyte 50 000 cycles; Li-free thin film | OK (source) | R2 |

## H. Composite electrodes (module 8, chapter T8)

| Item | Status | Basis |
|---|---|---|
| Porous electrode: parameters governing reaction distribution; nonuniform current wastes material | OK (source) | R1 sec. 1.6 |
| Poor conductor works from the carbon contact outward | OK (source) | R1 sec. 2.4, Fig. 15E |
| LiFePO4: carbon coating and nanosizing; tap-density penalty; coverage harder as particles shrink | OK (source) | R6 |
| Aerogel tap density about 0.2 g/cm3 | OK (source) | R2 |
| Bruggeman kappa_eff = kappa eps^alpha, alpha = 1.5 (1.53 for LiFePO4), D_eff = D eps/tau, tau = eps^(1-alpha) | OK (R36 eqs. 10 and 11, citing Thorat et al.) | R36 |
| cosh/sinh reaction profile with a characteristic depth 1/Lambda | OK (R41, Pathak and Bazant 2026, reaction-limited porous-electrode theory) | R41 |

## I. Beyond Li-ion and ageing (modules 9 and 10, chapters T9)

| Item | Status | Basis |
|---|---|---|
| Li metal: mossy, dendritic deposits; 100 to 150 cycles versus 300 needed | OK (source) | R1 sec. 2.5 |
| SEI passes Li+ but prevents uniform plating; Li in half-cells | OK (source) | R6 |
| Dioxolane/LiAsF6 (Aurbach); coatings (Visco) | OK (source) | R2 |
| Si about 300 %; alloys up to 200 %; buffer matrix | OK (source) | R6; R2 |
| Conversion oxides: metal nanoparticles and Li2O; two to three times carbon's capacity | OK (source) | R2 (Poizot et al. 2000) |
| Na+ needs larger interstitial space; Na-S 300 to 350 C | OK (source), corrected attribution (A3) | R6 |
| Thiolate -SS- redox; solubility and self-discharge | OK (source) | R2 |
| Loss mechanisms: SEI growth, cracking, dissolution, Mn(II) poisoning the anode SEI, contact loss | OK (source) | R6; R2 |
| Self-discharge rises with temperature; Ni-MH up to 30 %/month; Li-MnO2 90 % after 8 years | OK (source) | R1 sec. 2.6 |
| CE^N retention | CORRECTED (A9), now an idealization | arithmetic |
| SEI growth law | OK (R37 eqs. 36 and 37): L_SEI ~ t^b, b = 0.5 diffusion-limited (the sqrt(t) law), b = 1 reaction- or migration-limited on charge, b = 0 migration-limited on discharge; fade Delta Q ~ t^b; fastest at high SOC and charging rate | von Kolzenberg, Latz, Horstmann, ChemSusChem 2020 |

## J. Testing and safety (modules 11 and 12, chapters T7 and T10)

| Item | Status | Basis |
|---|---|---|
| Z = R + jX, X = omega L - 1/(omega C) | CORRECTED SOURCE: R1 prints eq. 17 as Z = R + j omega X, counting omega twice; page uses R + jX | R1 eq. 17 |
| Semicircle, 45 degree Warburg, frequency-independent ohmic; cells show farads and milliohms | OK (source) | R1 sec. 1.5 |
| Peak at omega = 1/(RC), f = 1/(2 pi RC) | CORRECTED (A7); confirmed by B2 (maximum of -Z_Im at omega = 1/(R_ct C_d)) | B2 section 11.4; R1 shorthand noted |
| Warburg Z_W = sigma omega^-1/2 - j sigma omega^-1/2; Randles circuit; kinetic semicircle radius R_ct/2 centred at R_u + R_ct/2, maximum at omega = 1/(R_ct C_d) | OK (B2 eq. 11.3.27, section 11.3.1, eqs. 11.4.9 to 11.4.11) | B2 |
| Nondestructive versus tear-down; Raman, AFM, NMR, TEM, XAS; accelerated rate calorimetry | OK (source) | R1 sec. 1.5 |
| In situ XANES, NMR, Mossbauer, SEM | OK (source) | R2 |
| Heat released at electrode surfaces; short circuit releases all energy as heat | OK (source) | R1 secs. 1.3, 2.2 |
| Consumer 0 to 40 C operating, -20 to 85 C storage; military and automotive -50 to 85 C | OK (source) | R1 sec. 2.6 |
| LiCoO2 protected electronically; no leak, vent, explode | OK (source) | R1 sec. 2.6 |
| Al2O3-coated separator | OK (source) | R6 |
| About 98 % of US lead-acid batteries recycled (Battery Council International) | OK (source, secondary) | R1 sec. 2.5 |
| Bernardi heat equation Q = I(U - V) - I T dU/dT | OK (R40 eq. 1; Bernardi 1985 cross-checked from R40's reference list); caveat: overestimates heat under high-rate pulse discharge by up to 26 % (LFP) and 49 % (NMC) [R40] | R40; R43 |
| Semenov diagram | OK (standard), tier 3 | reaction engineering texts |

## K. What cannot be verified from here

1. **DOIs and ISBNs** of every reference except R1, R2 and R6: the environment cannot
   reach doi.org, Crossref or ISBN services. Twenty landmark references are corroborated
   from the articles' own reference lists but still need DOI resolution. One known
   discrepancy: Whittingham 1976 is printed as page 1126 in R6 and 1226 in R2.
2. (Done.) The printed equations of R1 and R6 were read from the supplied PDFs on
   2026-09-26. All R6 equations match. Five R1 equations (6, 13, 16, 17 and the
   convention of 10) contain typographical errors or loose notation, listed in section L;
   the page uses the consistent forms and footnotes the discrepancies. Still open: the
   PDF of R2, to check its Figure 5 values and Figure 8 ordering against the print.
3. **Tier-3 items still without a source in hand**: the VFT law and the Semenov runaway
   picture. To resolve by DOI only: Shannon 1976 (radii you supplied), Bernardi 1985
   (cross-checked from R40's reference list) and the published version of Bazant's
   Account. Everything else is verified (sections N, O and P).

Nothing in tiers 2 or 3 goes on the live page until these checks pass, and every card
and figure still needs your initials on its review row.

## L. Transcription check of the printed equations (added after the PDFs arrived)

Read from the PDF pages: R6 pages 1168 and 1169; R1 pages 4248 to 4251.

| Source | Printed form | Verdict |
|---|---|---|
| R6 eq. 1.1, 1.2 | V_dis = V_oc - eta(q, I_dis); V_ch = V_oc + eta(q, I_ch); eta = I R_b | Matches plan |
| R6 eq. 2 | 100 x integral_0^Q_dis V_dis(q) dq / integral_0^Q_ch V_ch(q) dq | Matches plan (storage efficiency) |
| R6 eq. 3 | Q = integral_0^Delta t I dt = integral_0^Q dq | Matches |
| R6 eq. 4 | 100 x Q_dis/Q_ch | Matches (Coulombic efficiency) |
| R6 eq. 5 | energy = integral_0^Delta t I V(t) dt = integral_0^Q V(q) dq | Matches |
| R6 eq. 6 | V_OC = (mu_A - mu_C)/e | Matches |
| R6 Fig. 1 | Graphite anode on Cu, LiCoO2 cathode on Al, separator, Li+ and e- paths | Sources the collector statement |
| R1 eqs. 1 to 5 | Delta G = Delta H - T Delta S; standard-state form; Delta G = -nFE; standard-state form; Delta G = Delta G0 + RT ln(A_P/A_R) | Match |
| R1 eq. 6 | E = E0 + (RT/nF) ln(A_P/A_R) | **Printed sign error.** From eqs. 3 to 5: E = E0 - (RT/nF) ln(A_P/A_R). Page uses the minus form and footnotes the print. |
| R1 eq. 7 | g = I t (MW)/(nF) | Matches |
| R1 eqs. 8, 9 | Delta G = -nFE = Delta H - T Delta S = Delta H - nFT (dE/dT) | Match; gives Delta S = nF dE/dT |
| R1 eqs. 10, 11 | q = T Delta S + I(E_OCV - E_T); q = heat given off by the system | **Convention caveat.** With Delta S of the discharge reaction, a positive Delta S (positive dE/dT) would add to the heat given off on discharge, contradicting R1's text that such cells cool on discharge. Page uses q_gen = I(E_OCV - E_T) - I T dE_OCV/dT with the convention stated. |
| R1 eq. 12 | eta = E_OCV - E_T | Matches |
| R1 eq. 13 | i = i_o exp(alpha F eta/RT) - exp((1 - alpha) F eta/RT) | **Printed error**: no bracket around the two exponentials and no minus sign in the second exponent. Page uses i = i0 [exp(alpha F eta/RT) - exp(-(1 - alpha) F eta/RT)] after Bard and Faulkner. |
| R1 eq. 14 | eta = a - b log(I/I_o) | Acceptable as an empirical statement with constants a, b; page derives the Tafel limit from Butler-Volmer and quotes R1's form. |
| R1 eq. 15 | eta = IR | Matches |
| R1 eq. 16 | eta = (RT/n) ln(C/C_o) | **Printed error**: F missing; RT/n is not a voltage. Page uses (RT/nF) ln(C/C0). |
| R1 eq. 17 | Z = R + j omega X, X = omega L - 1/(omega C) | **Printed error**: omega appears twice. Page uses Z = R + jX. |
| R1 text, sec. 1.5 | tau = 1/f_m = RC | Shorthand; exact: omega_max = 1/(RC), f_m = 1/(2 pi RC). Page states the exact relation. |
| R1 text, sec. 1.4 | i0 about 1e-2 A/cm2 favoured; activation 1e-2 to 1e-4 s; ohmic 1e-6 s or less; diffusion 1e-2 s or more | Match |
| R1 text, sec. 1.2 | Faraday constant 96 485.3 C/g-equiv, 26.8015 Ah/g-equiv; all definitions | Match, word for word |

Lesson recorded for the build: a reputable review can still carry typographical errors in
its displayed equations. Every equation on the theory page is therefore derived on its
card from consistent premises or cross-cited to a textbook, never copied from a single
printed source without the symbolic and dimensional checks.

## M. Bard, Faulkner and White: access (2026-09-26)

The Drive copy (54 MB) could not be read through the connector (10 MB cap, empty text
extraction). You then supplied a markdown text export of the same edition, which was
sufficient for every check below; no page scans were needed.

## N. Checks against Bard, Faulkner and White, 3rd ed. (B2)

| Item in the plan | B2 location | Verdict |
|---|---|---|
| Nernst equation, minus sign with products over reactants | eq. 2.1.40 | Matches |
| Standard potentials Cu2+/Cu +0.340 V, Zn2+/Zn -0.7626 V; Daniell 1.10 V | appendix table of standard potentials | Matches; 0.340 - (-0.7626) = 1.103 V |
| Butler-Volmer i = i0[exp(-alpha f eta) - exp((1 - alpha) f eta)] | eq. 3.4.11 (current-overpotential eq. 3.4.10 with surface = bulk concentrations) | Matches; convention (cathodic positive, alpha cathodic) now stated on the card |
| Linearized i = -i0 f eta; R_ct = RT/(F i0); multistep RT/(nF i0) | eqs. 3.4.12, 3.4.13, 3.7.25 | Matches |
| Tafel: eta = (RT/alpha F) ln i0 - (RT/alpha F) ln i; a and b; validity abs(eta) > 118 mV at 25 C | eqs. 3.4.14 to 3.4.16 and text | Matches |
| Fick's first law J = -D dC/dx | eq. 4.4.9 | Matches |
| Diffusion length | eq. 4.4.3: Delta = (2Dt)^1/2 | ADJUSTED: plan now uses (2Dt)^1/2, not (Dt)^1/2 |
| Conductivity kappa = F sum abs(z_j) u_j C_j | eqs. 2.3.10, 4.2.7 | Matches; plan notation aligned |
| Transference number t_j = abs(z_j) u_j C_j / sum(...) | eq. 2.3.11 | Matches |
| Warburg impedance sigma omega^-1/2 - j sigma omega^-1/2 | eq. 11.3.27 | Matches |
| Randles circuit | section 11.3.1 | Matches |
| Kinetic semicircle: radius R_ct/2, centre R_u + R_ct/2, maximum at omega = 1/(R_ct C_d) | eqs. 11.4.9 to 11.4.11 and text | Matches; confirms correction A7 |

## O. Checks against the four papers supplied on 2026-09-26 (Boz, Bazant, Weppner and Huggins, von Kolzenberg)

| Paper | Bibliographic status | Item | Location | Verdict |
|---|---|---|---|---|
| Boz, Dev, Salvadori, Schaefer, J. Electrochem. Soc. 2021, 168, 090501 (open access) | Confirmed from the article header, DOI printed | Nernst-Planck flux; current density i = F sum z_k N_k | eqs. 1 and 2 | Matches the transport background of T5 |
| | | Transference number t+ = z+ u+/(z+ u+ + z- u-) and t_Li = D_Li/(D_Li + D-) in the dilute limit; "fraction of total ionic conductivity carried by Li+" | eqs. 6 and 7 | Matches B2 and the plan |
| | | Effect of transference number on concentration profiles (Newman's Figure 1) | Figure 1 | Sources figure 7.3 qualitatively |
| | | Bruggeman: kappa_eff = kappa eps^alpha, alpha = 1.5, 1.53 for LiFePO4; D_eff = D eps/tau; tau = eps^(1-alpha) | eqs. 10 and 11 | Sources the T8 card; exponent 1.5 confirmed |
| | | Porous-electrode salt balance with the (1 - t+) i/F term | eq. 12 | The steady-state gradient on the T5 card follows from it |
| | | VFT law | not present | Still tier 3 |
| Bazant, draft of May 2012 (published as Acc. Chem. Res. 2013, 46, 1144, to confirm) | Content in hand; journal details to confirm | Butler-Volmer I = I0[exp(-alpha_c n e eta/kT) - exp(alpha_a n e eta/kT)], reduction positive, alpha_a = 1 - alpha, alpha_c = alpha | eq. 1 | Same convention as B2; corroborates the T3 convention note |
| | | Nernst equation Delta phi_eq = (kT/(n e)) ln(a_O a_e^n / a_R) | eq. 24 | Consistent with B2 |
| | | Regular-solution chemical potential and Nernst potential | eqs. 47 and 48 | Sources the T2 regular-solution card; plan's vague "interaction term" replaced by -(Omega/e)(1-2x) |
| Weppner and Huggins, J. Solid State Chem. 1977, 22, 297-308 | Confirmed from the printed header; DOI from the PII, to resolve | GITT: D = (4/(pi tau)) (m_X V_M/(M_X S))^2 (Delta E_s/Delta E_t)^2 for tau << L^2/D; definitions of Delta E_s and Delta E_t (IR drop excluded) | printed eq. 4, page 299 | Matches the plan exactly |
| von Kolzenberg, Latz, Horstmann, ChemSusChem 2020, 13, 3901-3910 | Confirmed from the article header, DOI printed | L_SEI ~ t^b; b = 1 reaction limitation or migration limitation during charging; b = 0.5 diffusion limitation; b = 0 migration limitation during discharging; Delta Q ~ t^b, 0 < b < 1; "literature standard b = 0.5"; SEI grows fastest at high state of charge and high charging rate | eqs. 36 and 37, Figure 7, text | Sources the T9 card and figure 10.2; the plan's earlier "parabolic growth" is now stated as one regime among three |

## P. Checks against the three papers and the radii supplied on 2026-09-26 (third round)

| Source | Bibliographic status | Item | Location | Verdict |
|---|---|---|---|---|
| Murray, Hall, Dahn, J. Electrochem. Soc. 2019, 166, A329-A333 (open access) | Confirmed from the article header; DOI 10.1149/2.1171902jes printed | Full coin-cell stack: stainless-steel cap and gasket, spring, spacer, graphite negative electrode, Celgard separator(s), positive electrode, aluminium-coated can; half cells use lithium foil as the negative | Figure 1 and abstract | Sources figure 2.1's stack order and figure 11.4's half-cell versus full-cell statement |
| Jindal, Katiyar, Bhattacharya, Applied Thermal Engineering 2022, 201, 117794 | Confirmed from the article header; DOI 10.1016/j.applthermaleng.2021.117794 printed | Bernardi equation Q = I(U - V) - I T dU/dT; first term irreversible (Joule and overpotential), second reversible entropic; U measured at 0.1C, dU/dT from temperature steps | eq. 1 and section 2.2.1 | Matches the T10 card; sign convention consistent with R1's text (positive dU/dT cools on discharge) |
| | | Accuracy: reasonable for continuous discharge; overestimates under pulse discharge by up to 26 % (LFP) and 49 % (NMC) | abstract | Added as a caveat on the card |
| | | Bernardi, "A General Energy Balance for Battery Systems", J. Electrochem. Soc. 1985, 132, 5, DOI 10.1149/1.2113792 | reference [15] | Bibliographic details cross-checked; DOI to resolve |
| Pathak, Bazant, J. Electrochem. Soc. 2026, 173, 160518 | Confirmed from the article header; DOI 10.1149/1945-7111/ae9229 printed | Reaction-limited porous-electrode theory scaled on the thermal voltage; reaction distribution follows hyperbolic cosh/sinh profiles with 1/Lambda as the characteristic depth; overpotential uniform as Lambda -> 0; approximation most realistic for thin (order 10 um) electrodes, corrections needed above order 100 um | text around eqs. 13 to 22 and the discussion of Lambda | Sources the T8 cosh-profile card and figure 8.2 (qualitative depth dependence) |
| Ionic radii supplied by you: Li+ 76 pm, Na+ 102 pm | Match Shannon's six-coordinate effective ionic radii (Acta Crystallogr. A 1976, 32, 751); DOI to resolve | Used in figure 9.6 to draw the two ions to scale | | Accepted pending the Shannon DOI check |

## Q. Act A rework (2026-09-27): Module 0 physics, the four corrected errors, and the rebuilt figures

Sources in hand for this round: B2 (markdown export), R1 (markdown), R2 (PDF and markdown),
R6 (PDF and markdown), R21 (PDF), R36 (PDF), R37 (PDF), R38 (PDF), R41 (PDF), Bazant's
2012 draft (PDF). Not supplied: an introductory physics text for electrostatics, and the
Jindal 2022 PDF (R40, not needed for Act A). Every Module 0 statement is therefore cited
to B2, which turned out to contain the whole electrostatics foundation the page needs.

### Q1. The four errors of issues-and-gaps.md section 2

| # | Error | Fix | Basis |
|---|---|---|---|
| 1 | Water window drawn at 0 to 1.23 V vs Li | Computed: Li+/Li = -3.045 V vs NHE (B2 Table C.1, both columns), H+/H2 line E = 0.0 - 0.059 pH and O2/H2O line E = 1.229 - 0.059 pH (B2 eqs. 2.1.64 to 2.1.67). Window 3.045 to 4.274 V vs Li at pH 0, 1.229 V wide, sliding 59 mV per pH unit; pH slider on figure 3.3; test in physics.test.js | B2 Table C.1, section 2.1.9(a) |
| 2 | Electron crossing the electrolyte column in the energy picture | Figure 3.4 now draws the external circuit as a wire above the diagram; the electron travels up the negative electrode, along the wire, and down onto the positive electrode; our ion crosses the electrolyte inside. Caption says so | R6 (Electrochemical Cells); B2 1.1.1 footnote 1 |
| 3 | "Wh per kilogram of this material" | Readout now reads "Wh per kilogram of this electrode's active material, this electrode alone: the other electrode, the electrolyte and the packaging all add mass and none adds energy (figure 4.4)"; bars carry their mass basis; caption states the basis | R1 1.1 (inert parts), R2/R6 (mass conventions) |
| 4 | Ions drifting across the whole cell and wrapping round | Figure 1.1 rebuilt: Zn2+ created at the zinc (event ring, "2e- up"), Cu2+ consumed at the copper (event ring, "2e- in"), sulfate migrating toward the zinc across the separator, cations toward the copper; zinc thins, copper thickens; voltmeter reads 1.10 V open and "below 1.10 V" closed; potential strip with two jumps and a flat (open) or sloping (closed) bulk | R1 Fig. 1; B2 1.1.1, 1.1.2, Fig. 1.1.2, 1.5.1 and Fig. 1.5.2, 2.2.3 (split not measurable) |

### Q2. Module 0 statements, each checked against B2

| Statement on the page | B2 location | Verdict |
|---|---|---|
| Franklin's convention: minus is an excess of electronic charge, plus a deficiency | 2.1.3, text after eq. 2.1.21 | Matches |
| Coulomb's law F = qq'/(4 pi eps eps0 r^2), newtons; eps0 = 8.85419e-12 C^2 N^-1 m^-2 | 14.3.1 footnote 6; 2.2.1 footnote 16 | Matches; test: two elementary charges 1 nm apart, 0.231 nN (recomputed) |
| Field = force exerted on a unit charge; potential = work to bring a unit positive charge from infinity, path independent, phi = -integral E.dl (eq. 2.2.1); difference eq. 2.2.2 | 2.2.1 | Matches; phi(r) = q/(4 pi eps0 r) derived by integrating eq. 2.2.1 with Coulomb's law (numerical check in the test) |
| Only differences of potential are measurable | 2.2.1 footnote 14; 2.2.3 | Matches |
| Conductor at equilibrium: field zero inside, equipotential, excess charge on the surface (Gauss's law, eq. 2.2.3); space charge region in electrolytes and semiconductors, negligible in metals | 2.2.1 and footnote 17 | Matches |
| 0.5 mm mercury drop: 5e-14 C/V, about 300 000 electrons per volt in vacuum; about 1e-6 C (6e12 electrons) for 1 V in 0.1 M electrolyte, over 1e7 times more | 2.2.1; 2.2.2 | Matches; arithmetic checked (5e-14/e = 3.1e5; 1e-6/e = 6.2e12) |
| 1 V = 1 J/C; the cell potential is the energy available to drive charge externally | 1.1.2 | Matches |
| eV = work to move charge e across 1 V; Delta E = q Delta phi; 1 eV per electron = 96.5 kJ/mol; comparable to bond and reaction energies | 1.1.4 and footnote 9 | Matches; F x 1 V = 96.485 kJ/mol |
| Q = nFN (eq. 1.1.12), F = 96,485.3 C/mol; i = dQ/dt (eq. 1.1.13) | 1.1.5 | Matches |
| Electrons move through the wire from the more negative electrode to the more positive | 1.1.1 | Matches |
| Free electrons in solution short-lived, negligible conductivity; charge carried by ions; interface links the two modes through an electrode reaction | 1.1.1 and footnote 1 | Matches |
| A potential difference is needed between two interior points to drive current through the resistance between them | 2.2.1 footnote 15 | Matches |
| Metals have resistance too but their drop is invisible on the cell's scale | 1.5.1 footnote 39 | Matches |
| Ohm's law E = IR in electrolytes | R1 section 2.2 | Matches |
| G = 1/R = kappa A/l (eq. 4.2.6); kappa = F sum abs(z) u C (eqs. 2.3.10, 4.2.7); R = rho l/A (eq. 4.2.8); linear field between parallel plates d phi/dx = Delta E/l (eq. 4.2.3) | 4.2; 2.3.3 | Match |
| P = IV | R6 introduction | Matches |
| Mobility: force abs(z) e E, Stokes drag 6 pi eta r v, terminal velocity, u = abs(z) e/(6 pi eta r) (eq. 2.3.9), Fig. 2.3.4 | 2.3.3 | Matches |
| Cations driven down the sloping potential, anions up, when current flows | 1.5.1 | Matches |
| Electroneutrality: a charge imbalance cannot occur because a very large field would erase it | 2.3.3 | Matches |
| Potential as electron energy; more negative raises electron energy; reduction when electrons reach a vacant orbital, oxidation when a filled orbital finds a lower energy on the electrode | 1.1.4, Fig. 1.1.3 | Matches (figure 3.1) |
| Fermi energy = electrochemical potential of electrons per electron (eq. 2.2.34); equal Fermi energies at equilibrium (eq. 2.2.35); electrons flow from higher to lower Fermi energy; charge transferred is tiny | 2.2.5(b), (d) | Matches |
| Metal band picture: continuum of states, filled and vacant levels near the Fermi energy, tiny activation to move, hence conduction; a band as a continuum of levels | 20.1.1, 20.1.2 | Matches (used for "band" definition in figure 3.5 text) |
| Electrochemical potential mu-bar = mu + zF phi (eq. 2.2.6); equilibrium between phases: equal mu-bar (property 5); electrons in a metal mu-bar_e = mu0_e - F phi (property 4); contact potential eq. 2.2.20; cell potential eq. 2.2.24 | 2.2.4 | Matches |
| Double layer: electrode charge in a layer < 1 nm; solution charge equal and opposite (eq. 1.6.5, 2.2.4); compact layer, OHP, diffuse layer < 10 nm above 0.01 M; C_d 10 to 40 uF/cm2; q = C E (eq. 1.6.4) | 1.6.2, 1.6.3, 2.2.2 | Matches |
| Interfacial field up to 1e7 V/cm, distorts reactants | 2.2.3 | Matches |
| Helmholtz: two sheets of charge, parallel-plate capacitor, C_H = eps eps0/d (eq. 14.3.2) | 14.3.1 | Matches |
| Double-layer time constant about 1e-8 s; capacitance 10 to 40 uF/cm2 | R1 section 4.2 | Matches |
| Cell potential is the sum of the interfacial potential differences along the path; stairstep profile; sharp transition implies a high field | 1.1.2, Fig. 1.1.2 | Matches |
| Delta G = -nF E_rxn (eq. 2.1.25); positive emf for a spontaneous reaction | 2.1.3 | Matches; Daniell: 2 x 96485.3 x 1.1026 = 212.8 kJ/mol |
| Standard potentials Cu2+/Cu 0.340, Zn2+/Zn -0.7626 (old NHE column; -0.7628 new), Li+/Li -3.045, O2/H2O 1.229 | Table C.1 | Match; the page keeps the old-NHE column used before |

### Q3. New source statements used in Modules 1 to 4

| Statement | Location | Verdict |
|---|---|---|
| Half-reactions cannot happen alone; each must be coupled in a cell | B2 1.1.1 | Matches |
| A high-impedance voltmeter reads the open-circuit potential without drawing appreciable current | B2 1.1.2 | Matches |
| Charging: a power supply across the cell shifts the interfacial potential differences, current can be driven either way | B2 1.1.2 | Matches |
| Coin-cell stack: stainless cap and gasket, spring, spacer, graphite negative, two Celgard (or one BMF) separator, positive, aluminium-coated can; NMC622 positive; electrolyte 1 mol/L LiPF6 in 1:1 EC:DEC, about 38 mg (19 drops); BMF 0.25 mm, 90 % porous; misalignment from dropping spring and spacer from an angle, plating on the uncovered positive, 95/90/80 % retention after 100 cycles, vacuum pen fix; half cells can fail to predict full cells | R21 Fig. 1, Experimental, Results | Match |
| Porous electrodes extend the surface area and lower the current density | R1 section 1.4 (end) | Matches |
| Thin-film batteries reach the power of supercapacitors; hybrids; combination suggested | R1 section 1.1 | Matches |
| Aqueous systems in Table 2 all at or below 2.0 V; systems above 2 V all lithium with nonaqueous electrolytes | R1 Table 2 (read row by row) | Matches (Li-FeS2 at 1.6 V is nonaqueous but below 2 V, so the statement is one-directional as written) |

### Q4. Cross-check of the 25 % rule of thumb (2026-09-27, owner's question)

R1 section 1.1, verbatim: "As a rule of thumb, the practical energy content of a
rechargeable battery is 25% of its theoretical value, whereas a primary battery system can
yield >50% of its theoretical value in delivered energy", and the difference "is related to
several factors, including (1) inert parts ... (2) internal resistances ... (3) limited
utilization of the active masses". The theoretical value is that of R1 Figure 4, reckoned on
all reacting materials. CORRECTED on the page: figure 4.4 had labelled its full bar as "the
number the calculator of figure 4.1 gives", which is one electrode's active material only
(wrong base); the label, callout and caption now say "all the reacting materials", the
text says "among the causes" (R1 says "including") and dates the rule to 2004. Practical
check added as a worked example: graphite|LiCoO2 with all the lithium, 158 mAh/g on 169.9 g
per mole of electrons, about 600 Wh/kg at 3.8 V; the 1991 Sony cell's 120 to 150 Wh/kg (R2)
is 20 to 25 % of it. Test added.

Update, same day: the owner asked whether the rule holds for modern batteries. It does not
as a single number (modern lithium-ion cells deliver a larger share; no source in hand
gives a figure), so figure 4.4 and every quotation of "25 %" and "over 50 %" were REMOVED
from the page. What remains is what R1 states without a number: practical values are
significantly lower than theoretical, for the three listed reasons, plus the 1991-cell
worked example ("a fifth to a quarter" of about 600 Wh/kg, from R2's 120 to 150 Wh/kg).

### Q5. How the interfacial field forms (2026-09-27, owner's request for more detail)

| Statement on the page (module 3, double-layer beat) | B2 location | Verdict |
|---|---|---|
| A species crosses a boundary in the direction that lowers its electrochemical potential until it is equal on both sides; Zn2+ in the metal and in solution as the example | 2.2.4 (intro and property 5) | Matches |
| Chemical mechanisms for charging a phase: transfer of electrons (or ions) between metal and solution until the equilibrium potential is reached; "only a tiny charge is needed"; "net chemical effects on the solution are unnoticeable"; "the metal adapts to the solution" | 2.2.2 (last paragraphs) | Matches |
| Electrons flow from the phase with the higher Fermi energy to the lower until equal; the charge transferred is small | 2.2.5(d) | Matches |
| Field zero inside a conductor at rest; excess charge on the surface | 2.2.1 | Matches |
| The coulombic field of the surface charge is "counterbalanced to a very large degree by polarization of the adjacent electrolyte" | 2.2.2 | Matches |
| Interfacial potential differences can develop without excess charge, from preferentially oriented water dipoles at the metal | 2.2.2 (last paragraph) | Matches |
| Field at the interface up to 1e7 V/cm | 2.2.3 | Matches |
| With current: potential slopes through the electrolyte (ohmic drop), interfaces carry an overpotential in addition | 1.5.1 and Fig. 1.5.2 | Matches |
| "Zinc dissolving makes the metal negative" as the direction for Zn/Zn2+; copper the reverse | Consistent with the sign of the standard potentials in Table C.1 and with the cell of Fig. 1.1.2 (zinc negative); B2 does not narrate the initial ion transfer per electrode explicitly, so the page states it as the direction that lowers the electrochemical potential (2.2.4) | Acceptable; flagged for the owner's review |

Typography (same day): Unicode super- and subscript characters are converted at build time into <sup>/<sub> in HTML text and at run time into raised or lowered <tspan>s in SVG labels and into <sup>/<sub> in dynamic figure text, so that every script renders in the site font at one size and offset; known inline equations get a math face (.eq).
