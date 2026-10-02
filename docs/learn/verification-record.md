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
| | | Effect of transference number on concentration profiles (Newman's Figure 1) | Figure 1 | Sources figure 7.7 qualitatively |
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

### Q6. The in-page mathematics panels (2026-09-27)

Each module now ends with "The mathematics of this module". Every equation there is one
already checked in this record: Module 0 from B2 2.2.1 (eqs. 2.2.1 to 2.2.3), 4.2.3, 1.1.4,
1.1.5 (eqs. 1.1.12, 1.1.13), 4.2.6 to 4.2.8, 2.3.9 to 2.3.11, 4.1.13 (Nernst-Planck) and
4.1.11 (Nernst-Einstein); Module 1 from Table C.1, 1.1.2, 2.1.25 and R6 (series/parallel);
Module 2 from B2 4.2.6 and R36 eqs. 10 and 11 (Bruggeman, alpha = 1.5 and 1.53) with R1
2.2 conductivities; Module 3 from B2 2.2.4 (eqs. 2.2.6, 2.2.9, properties 2 and 4, 2.2.20,
2.2.24, 2.2.28), 2.2.5 (eq. 2.2.34), 2.1.9 (eq. 2.1.63), 2.1.3 (eqs. 2.1.25, 2.1.27,
2.1.28), 1.6.4 and 14.3.2, and R6 eq. 6; Module 4 from B2 1.1.12, R1 eq. 7 and R6 eqs. 2,
4 and 5. Arithmetic: 0.3^1.5 = 0.164; RT/F at 298.15 K = 25.69 mV; 2.303 RT/F = 59.2 mV.

### Q7. Anode and cathode on charge (2026-09-27, owner's request)

R1 section 1.2 defines the anode as "the negative electrode of a cell associated with
oxidative chemical reactions that release electrons into the external circuit" and the
cathode as "the positive electrode ... associated with reductive chemical reactions that
gain electrons from the external circuit"; its "charge" definition and Figure 11 caption
say that on recharge the flow of electrons is reversed. The page now states: on discharge
the negative electrode is oxidized (anode) and the positive reduced (cathode); on charge the
current is reversed, the negative electrode is reduced and the positive oxidized, so by the
reaction definition the names swap while the electrodes keep their signs. Derived from R1's
definitions; consistent with B2 1.1.2 (the applied voltage drives current in either
direction).

## R. Act B and C build (2026-10-01, Cowork session)

Sources in hand this session: none of the PDFs. The journal sites block the sandbox, and the
WebFetch tool can only return passages chosen by a small model, which is not reading in full.
Rule kept: every sentence on the page maps to a row already in this record (checked against
the full text in an earlier session) or is a derivation from such a row. Anything else is
written inside a `{{pending:KEY}} ... {{/pending}}` block, which the build drops until KEY is
`verified` in `references.json`. Items marked **FLAG** are close readings of a source already in
the record that the owner should confirm against the text.

Bibliographic details resolved through the Crossref API (title, authors, journal, volume,
issue, pages, year), 2026-10-01: R21 (also confirms CC BY 4.0), R39 Bazant, Acc. Chem. Res.
2013, 46(5), 1144-1160 (title as in the registry; equation numbers still to be read in the
journal version, so R39 stays `crosschecked`), L1 Whittingham, Science 1976, 192(4244),
1126-1127 (page 1126 confirmed; R2's "1226" is the misprint), L2 Mizushima et al., Mater. Res.
Bull. 1980, 15(6), 783-789, L3 Peled, J. Electrochem. Soc. 1979, 126(12), 2047-2051.

### R1. Module 5, charging and discharging (rewritten)

| Statement on the page | Basis in this record | Verdict |
|---|---|---|
| With current the potential slopes through the electrolyte (ohmic drop), cations run down the slope, anions up; each interface carries an overpotential in addition | Q2 (B2 1.5.1), Q5 (B2 1.5.1, Fig. 1.5.2) | OK |
| V_dis = V_OC - eta, V_ch = V_OC + eta | E, L (R6 eqs. 1.1, 1.2) | OK |
| Polarization eta = E_OCV - E_T, three parts (activation, ohmic, concentration) with their causes | E (R1 1.4, eq. 12) | OK |
| Polarization (whole cell, R1) versus overpotential eta = E - E_eq (one electrode, B2) | A8, E | OK |
| Discharge curve with the three polarizations marked; it gives capacity, rate and temperature effects, state of health | E (R1 Fig. 6), J/plan module 11 (R1 1.5) | OK |
| Cut-offs: overcharge or overdischarge drive irreversible reactions forming new compounds that reduce capacity | plan module 10 (R1 2.6), audited | OK |
| LiCoO2 charged to about 4.2 V, about half its lithium, for safety | F (R2; R6) | OK |
| Capacity missing at high rate is reversible, diffusion-limited ion transfer | E (R6); same sentence already published in module 4 | OK |
| Time scales: ohmic within about 1e-6 s, activation 1e-4 to 1e-2 s, concentration 1e-2 s or longer; current interruption separates them | E, L (R1 1.4); plan module 11 (R1 1.4) | OK |
| Exchange current densities around 1e-2 A/cm2 favoured | E (R1 1.4) | OK |
| A reaction with a large exchange current "runs fast in both directions at equilibrium" and needs a small overpotential | B2 3.4 (definition of i0; R_ct = RT/(F i0), eq. 3.4.13) | **FLAG**: the definition of the exchange current is standard B2 3.4.2 text but is not itself a row of this record |
| Gibbs phase rule F = C - P + 2; two-phase constant voltage, single-phase slope | C (R1 2.4) | OK |
| "Two components (lithium and the host)" in figure 5.4's step 3 | application of R1 2.4 | **FLAG**: confirm that R1 2.4 counts the components this way |
| LiFePO4 flat at 3.5 V; LiMn2O4 steps near 4 V and a drop to 3 V | C, E (R6 Figs. 5, 6) | OK |
| Electronics prefer flat curves; sloping curves ease reading the state of charge | E (R1 2.6) | OK |
| Coulombic efficiency, cycle life to 80 %; reversible versus irreversible loss and its three causes; first-charge loss distinct | D, E (R6); plan module 10 (R6) | OK |
| 300 full cycles with under 20 % loss; 3 to 8 h to charge, 15 min desired; fast charging shortens cycle life | E (R1 2.6) | OK |
| Retention = CE^N as an upper-bound idealization; 0.8^(1/300) = 0.99926; ln 0.8 / ln 0.999 = 223 | A9; arithmetic recomputed | OK |
| Entropic and Joule heat; dE/dT sign: positive heats on charge, cools on discharge (Ni-Cd), negative the reverse (lead-acid); heat released at the electrode surfaces, high-rate cells must shed it | C, E, J (R1 1.3) | OK |
| Bernardi Q = I(U - V) - I T dU/dT; U from 0.1C, dU/dT from temperature steps; overestimate under pulse discharge up to 26 % (LFP), 49 % (NMC) | P (R40 eq. 1, 2.2.1, abstract) | OK |
| Butler-Volmer (B2 3.4.11), alpha 0.3 to 0.7, valid below about 10 % of the limiting current; R_ct; Tafel above 118 mV; R1 writes it anodic-positive with a printed error | E, L, N | OK |
| Worked example: 2 A x 0.050 ohm = 0.10 V; 3.7 x 2 / (3.9 x 2) = 94.9 %; at 4 A: 3.6/4.0 = 90 % | arithmetic | OK |

Figures 5.1 to 5.6 are computed from the illustrative cell model in `figs-45.js` (ohmic
I R_b, activation from Butler-Volmer with alpha = 0.5 inverted to (2RT/F) asinh(i/2 i0),
concentration (RT/F) ln(C0/C) with C/C0 = 1 - i/i_lim). R_b, i0, i_lim, the open-circuit
shapes, the cut-offs, the relaxation time constants of figure 5.3 and dE/dT = 0.2 mV/K in
figure 5.6 are illustrative and labelled so. The C-rate notation (1C delivers the low-rate
capacity in one hour) is defined in the captions as the figures' unit, as module 4 already
does; no source in hand states it, so the text never presents it as a convention of the field.
The model change also redraws figure 4.2's curve (smooth plateau ends, no initial bump),
which answers the module 4.2 critique in issues-and-gaps.md section 3.

### R2. Module 6, inside a lithium-ion cell (new)

| Statement on the page | Basis in this record | Verdict |
|---|---|---|
| Insertion: solid-state redox, guest ions into a host conducting ions and electrons; highly reversible because structure and shape survive; "intercalation" for layered hosts | F (R1 2.4, footnote 4) | OK |
| Rocking-chair cell replaced Li metal by a second insertion host; Murphy and Scrosati; Sony June 1991, carbon against LiCoO2 | F (R2) | OK |
| LixC with x up to 1/6 (LiC6) | F (R6) | OK |
| LiCoO2 cycled to about 4.2 V and 0.5 Li; oxygen evolution beyond x = 0.55 | F (R2; R6) | OK |
| Graphite on copper, LiCoO2 on aluminium | B, L (R6 Fig. 1) | OK |
| Charger drawn above the open-circuit voltage | plan figure 6.1 constraint (R1 Fig. 11); Q7 | OK |
| Built discharged; graphite at about 0.2 V outside the carbonate window (lower edge about 1.1 V); SEI forms on the first charge, consumes lithium from the positive irreversibly, adds interfacial impedance, evolves with cycling | C, F (R6) | OK |
| SEI electronically insulating and Li+-selective | F (R1 2.4) | OK |
| Only EC forms the protective layer on graphite; PC does not; reason unknown (2001) | F (R2) | OK |
| Lithium titanate at 1.5 V forms no SEI; 30 000 cycles at 5C reported by Zaghib and co-workers for lithium titanate and LiFePO4 electrodes | A5, F (R6 citing L16) | OK |
| High-voltage positive (LiNi0.5Mn1.5O4, about 4.75 V) passivated by a layer R6 also calls an SEI; upper edge about 4.3 V | A4, C (R6) | OK |
| LUMO about 1.1 eV below the lithium level, practical HOMO limit about 4.3 eV below; mu_A above the LUMO reduces the electrolyte, mu_C below the HOMO oxidizes it unless passivated | C (R6, Fig. 2 logic) | OK |
| Paths: layered 2D, spinel 3D, olivine 1D | F (R6) | OK |
| Fick's first law; diffusion length (2Dt)^1/2; time of order L^2/2D, halving L quarters it | F, N (B2 eqs. 4.4.9, 4.4.3); arithmetic | OK |
| Timeline: intercalation chemistry around 1970 (Rouxel, Schollhorn); Whittingham TiS2/Li 2.2 V 1976; Goodenough LiCoO2 about 4 V 1980; Yazami graphite 1983; Yoshino first LiCoO2/C cell (no year given); Sony 1991, over 3.6 V, 120 to 150 Wh/kg | F (R6; R2), D (R2) | OK. Murphy 1979 and Lazzari-Scrosati 1980 are the years of the papers in R2's reference list (L10, L9); first names and affiliations deliberately not given |
| Worked example: 3 Ah = 10 800 C; / 1.602e-19 C = 6.7e22 ions; / 96 485 = 0.112 mol; x 6.94 g/mol = 0.78 g | arithmetic (B2 constants; Li molar mass from R2) | OK |

Figure 6.2's starting potential of the empty graphite and the size of the lithium loss are
schematic and unnumbered; the sources give neither. Figure 6.1 shows the 1991 pair, graphite
against LiCoO2, whatever cell the reader chose. Plan figure 6.3 (lithium metal against lithium
ion) moved to module 9, where plating is the subject.

### R3. Module 7, the electrolyte (new)

| Statement on the page | Basis in this record | Verdict |
|---|---|---|
| Electrolyte provides pure ionic conductivity between the electrodes | B (R1 1.2) | OK |
| Aqueous about 1 S/cm; organic 1e-2 to 1e-3 S/cm, lower solvating power, ion pairing | G (R1 2.2) | OK |
| Lithium cells need nonaqueous electrolytes because water would be split at their voltages | C (aqueous window, R1 2.2, R6); Q3 (R1 Table 2) | OK, as a link between two rows |
| LiPF6 in EC with linear carbonates | G (R1 Table 2 footnote) | OK |
| Dry PEO: ion motion assisted by chain motion; Li-SPE cell up to 80 C | G (R2) | OK |
| Triflate to TFSI: one order of magnitude; 10 to 25 % plasticizer: one more; lightly plasticized suits Li metal; gels 60 to 95 % liquid, 2 to 5 times below the liquid, need Li-ion | G (R2 and Fig. 8) | OK |
| LiTFSI conductive and safe; corrodes Al above 4 V unless a passivating salt is added | G (R2) | OK |
| Nonaqueous window about 3.5 V thermodynamic, used to 5.5 V kinetically | C (R2) | OK |
| Transference number: fraction of conductivity carried by Li+; t+ = z+u+/(z+u+ + z-u-); dilute limit D_Li/(D_Li + D-); "transport number" synonym | O (R36 eqs. 6, 7), N (B2 eq. 2.3.11), A13 | OK |
| Steady-state salt difference grows with (1 - t+): Delta c = (1 - t+) i L/(F D) | G (derived from R36 eq. 12) | OK |
| t+ about 0.3, about 0.6 with 10 % nanofillers; nanofillers raise conductivity severalfold at 60 to 80 C and give a stable interface with Li | G (R2) | OK |
| Solid electrolyte requirements: above 1e-4 S/cm, blocks dendrites without being reduced, chemically stable, robust flexible thin membrane; ceramic-polymer composites; garnet above 1e-3 S/cm stable against Li; polymer above 1e-4 with contact yet to be demonstrated (2013); contact loss with volume change | G (R6) | OK |
| A solid separator that blocks dendrites enables lithium metal | plan module 9 (R6), audited | OK |
| kappa = F sum |z| u C; R = l/(kappa A); u = |z| e/(6 pi eta r) | N, Q2 (B2) | OK |
| Nernst-Planck flux in the form already published in module 0; i = F sum z J | Q6 (B2 4.1); O (R36 eq. 2) | OK |
| Worked example: 0.0025/(1e-2 x 1) = 0.25 ohm; 0.0025/(1e-4) = 25 ohm; x 1 mA = 0.25 mV and 25 mV | arithmetic; the 25 um thickness is illustrative and labelled so | OK |
| Ceramic transport drawn as hops between sites | none | **FLAG**: drawing device only, stated as such in the caption and step text |
| Fenton, Parker and Wright 1973, first PEO-alkali salt complexes | L5 (crosschecked only) | held in a pending block until L5 is read |

Figure 7.6 encodes only the ratios of R2's text; the curve shapes are illustrative curved forms,
the absolute heights and the position of the liquid-and-gel pair relative to the polymers are not
from any source, and the caption says so. The analogy (a crowd in a corridor) is module 7's one
analogy, as the plan assigns it, with the sentence on where it breaks.

### R4. Module 8, electrodes are composites (new)

| Statement on the page | Basis in this record | Verdict |
|---|---|---|
| Porous composites of active particles, conductive diluent (carbon or metal powder) and polymer binder on a current collector; about 30 % porous; reacting surface far larger than the geometric area | B, H (R1 1.6) | OK |
| Porous electrodes extend the surface and lower the current density | Q3 (R1 1.4, end) | OK |
| Current distribution depends on matrix and electrolyte conductivities, exchange current, diffusion, thickness, porosity, pore size, tortuosity; nonuniform current wastes active material | H (R1 1.6) | OK |
| The reaction concentrates where the two resistances together are lowest | plan figure 8.2 constraint (R1 Fig. 9B, qualitative) | OK |
| cosh profile with a characteristic depth; reaction-limited picture most realistic for thin (order 10 um) electrodes, corrections beyond about 100 um; uniform overpotential when the depth is much larger than the electrode | H, P (R41) | OK |
| Profile j(xi) ~ cosh(nu xi)/kappa + cosh(nu(1 - xi))/sigma, nu^2 = a L^2 (1/sigma + 1/kappa)/R_ct | derived here from Ohm's law in each phase (B2 4.2), charge conservation di2/dx = a j and R_ct (B2 eq. 3.4.13) | **FLAG**: a derivation, checked by differentiation (boundary conditions i2 = 0 at the collector, i1 = 0 at the separator); not printed in a source in hand |
| Bruggeman kappa_eff = kappa eps^alpha, alpha 1.5 (1.53 LiFePO4); D_eff = D eps/tau; tau = eps^(1 - alpha) | H, O (R36 eqs. 10, 11) | OK |
| Ionic transport far slower than electronic, hence thin electrodes of large area | B (R6) | OK |
| A poor conductor (MnO2) works from the carbon contact outward | H (R1 2.4, Fig. 15E) | OK |
| LiFePO4: carbon coating and nanosizing; coated nanoparticles lower the tap density and volumetric energy; uniform coverage harder as particles shrink | H (R6) | OK |
| Aerogel tap density about 0.2 g/cm3 | H (R2) | OK |
| Crossing time t ~ L^2/2D, one tenth of the size about one hundredth of the time | F, N (B2 eq. 4.4.3); arithmetic | OK |
| Worked example: 0.30^1.5 = 0.164; 1e-2 S/cm x 0.164 = 1.6e-3 S/cm | arithmetic (Q6 already gives 0.164) | OK |
| The owner's shared binder and electrolyte | none in the registry | held in a pending block keyed OWN-BINDER; add the owner's article to references.json to show it |

Figure 8.1 computes which particles can work from the drawn network (breadth-first search from the
foil along intact carbon links, and an open pore); the network itself is schematic. Figure 8.4's
volume bar is schematic, as its caption says. The analogy (roads to a house) is module 8's one
analogy, as the plan assigns it.

### R5. Module 9, lithium metal, sodium and organic electrodes (new)

| Statement on the page | Basis in this record | Verdict |
|---|---|---|
| Li metal: highest energy; mossy, dendritic redeposition; about 100 to 150 cycles against 300 required (2004); safety risk | I (R1 2.5); plan module 9 (R1 2.5) | OK |
| Dendrites imaged in situ by SEM | plan module 9 (R2 Fig. 2a), audited | OK |
| SEI passes Li+ but does not give uniform plating | I (R6) | OK (the page says "does not make the lithium plate back evenly") |
| Dioxolane/LiAsF6 electrolytes, protective coatings, glassy thin-film electrolytes with 50 000 cycles, lithium-free thin-film cells | I, G (R2) | OK |
| Solid separator that blocks dendrites | plan module 9 (R6) | OK |
| Li half-cells the standard way to test a positive electrode | I (R6); plan module 11 | OK |
| Alloys 0.2 to 0.8 V, up to 200 % volume; Si about 300 %; cracking, contact loss, buffer matrix keeps the electrical pathway | C, I (R6; R2); plan module 8 (R2) | OK |
| Conversion oxides: metal nanoparticles in Li2O, reforming on charge; two to three times the capacity of carbon (Poizot et al. 2000, as described by R2) | I (R2) | OK |
| Sulfur 2.4 V, a conversion electrode | C (R2); module 3 already calls it a conversion electrode | OK |
| Disulfides: reversible S-S cleavage to thiolates, up to 3 V; solubility and self-discharge | C, I (R2) | OK |
| Goodenough's closing call for organic multiple-electron redox centres | plan module 9 (R6) | OK |
| Na+ needs a larger interstitial space than a close-packed oxide; Na-S at 300 to 350 C; ZEBRA its NaCl/Fe variant | A3, I (R6) | OK |
| Family positions: graphite 0.2, alloys 0.2 to 0.8, LTO 1.5, TiS2 2.2, LiFePO4 3.5, LiCoO2 about 4.0, LNMO about 4.75 V | C (R6) | OK |
| Worked example: 4^(1/3) = 1.587; 3^(1/3) = 1.442 | arithmetic | OK |
| General conversion reaction MOx + 2x Li+ + 2x e- = M + x Li2O | derived by charge balance from R2's description | **FLAG**: a general form written for the panel, not printed in a source in hand |
| General properties of organic electrode materials | R24 (candidate) | held in a pending block |
| The owner's thesis materials | none in the registry | held in a pending block keyed OWN-THESIS |
| Li+ 76 pm and Na+ 102 pm | R42 (candidate) | figure 9.5 draws the ions to scale and prints the radii only when R42 is verified (a pending marker inside the figure); until then the sizes are only ordered |

Plan figure 6.3 (lithium metal against graphite) is merged into figure 9.1. Its roughness grows by a
random rule and is labelled as carrying no morphology from a source.

### R6. Sources supplied during this session (2026-10-01)

| Key | Source | How it was read | Bibliographic check |
|---|---|---|---|
| R44 | Shanmukaraj et al., J. Electrochem. Soc. 2020, 167, 070530 (open access, CC BY) | Full text read in this session (pdftotext) | From the article header; DOI printed |
| R45 | Goodenough, Nature Electronics 2018, 1, 204 | Full text (one page) read | From the article; DOI printed |
| R46 | Brandt, Solid State Ionics 1994, 69, 173-183 | Full text read, tables included | Crossref (issue 3-4) |
| R47 | Zhang et al., Angew. Chem. Int. Ed. 2020, 59, 534-538 | Full text read | From the article; DOI printed |
| R48 | Fichtner et al., Adv. Energy Mater. 2022, 12, 2102904 (online 2021, open access) | Full text read; sections 2.1, 2.3 and 2.4 (materials acceleration, AI) only skimmed and not cited | Crossref (vol. 12, issue 17) |
| R49 | Horstmann, Single and Latz, Curr. Opin. Electrochem. 2019, 13, 61-69 | Full text read by a sub-agent; every sentence cited was matched word for word against the extracted text | From the article; DOI printed |
| R50 | Manmi et al., J. Electrochem. Soc. 2024, 171, 100530 (open access) | As R49 | From the article; DOI printed |
| R51 | Borodin et al., Acc. Chem. Res. 2017, 50, 2886-2894 | As R49 (the file is the ASAP version) | Crossref (vol. 50, issue 12) |
| R52 | Wang et al., npj Comput. Mater. 2018, 4, 15 (open access) | As R49 | From the article; DOI printed |

**Discrepancy to resolve (owner):** the 1991 Sony cell. R2 (as recorded in D) gives "120 to 150
Wh/kg"; R47 gives 80 Wh/kg and 200 Wh/L for the cell of 1991, and R46's Table 7 lists carbon |
LiCoO2 cells of 1990 to 1993 at 64 to 100 Wh/kg. The new modules use R47's figures. The published
module 4 worked example and its test still use 120 to 150 Wh/kg for "the 1991 cell"; left
unchanged pending the owner's decision. Suggested fix: keep R2's range but describe it as
Tarascon and Armand's 2001 figure for C/LiCoO2 cells, or switch the example to R47's 80 Wh/kg.

### R7. Statements added to modules 6 to 10 from R44 to R52

| Module | Statement | Source and location |
|---|---|---|
| 6 | Belgirate 1972: Steele singles out dichalcogenides; Rudorff and Rouxel chemical intercalation fast between S-Ti-S slabs; Armand's intercalation-electrode requirements and cation intercalation into graphite; first SSB (Na+ into C8CrO3, beta-alumina) | R47 (Solid-solution electrodes section); R44 (Intercalation electrodes) |
| 6 | 1976 Li/TiS2 by Whittingham and by Steele; Exxon 45 Wh cell at the 1977 Chicago EV show; dendrites shorted and ignited the electrolyte, programme abandoned | R47; R45 |
| 6 | Late 1970s rocking chair proposed by Armand; Lazzari and Scrosati LixWO2/LiClO4-PC/TiS2, about 2 V, 70 cycles; Armand's 1978 polymer electrolyte and graphite patent (about 4 years before Yazami and Touzain) | R47; R44 |
| 6 | Goodenough: over half of the lithium extracted reversibly from LiCoO2 or LiNiO2; a cell can be built discharged; LiCoO2 at 4 V, twice TiS2, 1979 to 1980 | R45; R47 |
| 6 | 1983 Yoshino: coke cycled in PC, soft carbon against LiCoO2; LiMn2O4 1983; Yoshino's 1986 safety tests; Sony 1991 at 80 Wh/kg and 200 Wh/L | R47 |
| 6 | 1990: EC forms a protective, Li+-conducting film on graphite during the first insertion only, then intercalation is completely reversible | R46 section 3.1 |
| 6 | EC suppresses PC decomposition by forming a favourable SEI that prevents PC co-intercalation; PC solvates Li+ more strongly, co-intercalates and exfoliates graphite | R47; R52 |
| 6 | 1993 LiPF6 in EC/DMC (Guyomard and Tarascon) became standard; about 250 Wh/kg and 600 Wh/L (2020) | R47 |
| 6 | 1996 LiFePO4; carbon coating by Armand and co-workers; thousands of tonnes a year | R47 |
| 6 | Energy density x3 to 4 and price /18 since launch | R48 section 1.2 |
| 6 | Carbon made discharged because LixC6 is very reactive; LiCoO2 the sole lithium source; LiCoO2 + C6 = Li1-xCoO2 + LixC6 | R46 eq. 5 and text |
| 6 | EC reduction from about 0.8 V vs Li/Li+; 2 EC + 2 Li+ + 2 e- -> Li2EDC + C2H4 | R52 (text and Table 1) |
| 6 | Inner inorganic (Li2CO3, LiF, Li2O) and porous organic outer layer | R52; R50 |
| 6 | 2 nm LiF or 3 nm Li2CO3 blocks tunnelling; about 50 nm after cycling; SEI soon exceeds 10 nm | R52; R49 |
| 6 | Four requirements of a good SEI; Peled's 1979 concept | R52 |
| 6 | Formation: cycling under defined conditions up to 24 h, gas removed; 32 % of manufacturing cost, mostly warm conditioning; first-cycle CE about 82.5 % and second about 97.5 % in one coin cell (NMC/graphite-SiOx) | R48 section 5.3; R50 |
| 6 | Isolated-molecule estimates off by up to 1.8 V; reduction from about 1.7 V with LiPF6 and 0.8 V with LiBF4 (EC/EMC); most components thermodynamically unstable at graphite potentials, kinetically stable behind the interphase | R51; R52 |
| 7 | Wright: first ionic conduction in PEO complexes (Na, K salts); Armand 1978 first PEO/Li+ SPE, about 1e-4 S/cm at 40 to 60 C | R44 |
| 7 | Li+ coordinated to donor groups, hopping between coordinating sites, helped by segmental motion, in the amorphous regions | R44 (Polymer electrolytes, Fig. 6a) |
| 7 | LiTFSI introduced by Armand, acts as a plasticizer (bulky anion) | R44 |
| 7 | Single-ion conductors: t+ approaching 1 avoids the concentration gradient; PSTFSILi-PEO-PSTFSILi t+ > 0.85, 1.3e-5 S/cm at 60 C; 1e-4 S/cm at room temperature still the challenge | R44 |
| 7 | Organic electrolytes of 1994: Li+ transport numbers typically below 0.5 | R46 section 2.3 |
| 7 | Isolated EC about 6.9 V; with PF6- and H-transfer 5 to 5.2 V; EC dissolves salt and forms SEI, DMC a diluent for viscosity and low-temperature conductivity; water-in-salt LiF-rich interphase, >4 V window | R51 |
| 8 | Electrode about 90 % active material by mass; slurry (water for graphite, NMP for positive, NMP toxic and recovered); drying 12 to 24 h at 120 C; calendering; cutting, winding, stacking, tabs; electrolyte filling; formation; QC including days of open-circuit storage | R48 section 5.3 |
| 8 | Carbon coating from a decomposed polymer precursor; LiFePO4 in thousands of tonnes a year | R44; R47 |
| 9 | Lithium cycling efficiency E and excess R = N(1 - E); LiClO4/PC about 60 %; Moli >99 % in the late 1980s, about 300 cycles with R = 3; 3861/4 = 965 Ah/kg | R46 eqs. 1, 2, Table 2; test added |
| 9 | Fresh high-surface lithium deposits form new SEI and lose lithium | R48 section 2.2 |
| 9 | Conversion: TMO + 2Li+ + 2e- = TM + Li2O; only partly reversible; first-cycle irreversibility about 30 %; charge and discharge almost a volt apart; fluorides 500 to 1500 mAh/g | R44 |
| 9 | Organic electrodes: n-, p- and bipolar types; not limited by ion size; softer, less swelling, abundant and bio-sourced; low voltage, dissolution, low volumetric capacity, poor conductivity; Li terephthalate 0.8 V, 300 mAh/g | R44 (Organic electrodes) |
| 9 | Kummer and Weber, Ford, 1967: fast Na+ in a ceramic above 300 C, Na-S battery | R45 |
| 9 | Sodium-ion first beyond-lithium chemistry to commercial viability, mainly stationary | R48 section 1.4 |
| 10 | Storage fade mainly from SEI growth; >50 % of capacity loss in a well-engineered LIB from SEI growth | R49; R52 |
| 10 | SEI grows during lithiation, not delithiation; grows at rest in a charged cell (in the standard models, not when fully discharged); on silicon linear growth from repeated cracking | R49; R50 |
| 10 | Square-root law and its candidate mechanisms; neutral Li interstitial diffusion favoured by SoC-dependent storage data; few t^1/2 fits statistically justified; standard models miss the first-cycle loss; fade shape cannot prove a mechanism | R49; R50 |

### R8. Modules 11 and 12 (new)

| Statement on the page | Basis | Verdict |
|---|---|---|
| Discharge curve gives capacity, rate and temperature effects, state of health; current interruption separates polarizations; voltage against temperature gives thermodynamic quantities | E, J (R1 1.3, 1.4, 1.5) | OK |
| Ohmic frequency-independent, semicircle for activation, 45 degree Warburg; cells show farads and milliohms; top at omega = 1/(R_ct C_d); Randles circuit; Z = R + jX | J, N (R1 1.5, B2 11.3, 11.4) | OK; test added (398 Hz) |
| EIS tracks resistance and state of health; SoC from EIS, resistance, pulses, coulomb counting, OCV; reference electrodes needed and hard; pressure sensing of SEI growth | R48 section 4 | OK |
| GITT relation, tau << L^2/D, IR drop excluded | F, O (R38 eq. 4) | OK; "Delta E_t grows as sqrt(tau)" is the regime behind eq. 4, **FLAG** as a derivation |
| Nondestructive and tear-down techniques; ARC; in situ XANES, NMR, Mossbauer, SEM | J (R1 1.5; R2) | OK |
| Half-cells the standard test; half-cells can fail to predict full cells; misalignment effects | I (R6); Q3 (R21) | OK |
| Thermal runaway definition; heat at electrode surfaces; short circuit releases all energy as heat | B, J (R1 1.2, 1.3, 2.2) | OK |
| Exxon fires and abandonment | R45 | OK |
| 1989 Moli Li/MoS2 recall, vent with flame; porous Li deposit reacts highly exothermically; cycling reduces abuse resistance; no shuttle as in NiCd; cell imbalance in series; voltage monitoring; shutdown separator effective for uniform heating, less for internal short; pressure diaphragm interrupter; Sony circuit limits current and prevents over- and overdischarge; overdischarge oxidizes the copper collector | R46 sections 2.4, 3.3 | OK |
| SEI decomposition promotes thermal runaway | R49 | OK |
| Al2O3-coated separator | J (R6) | OK |
| Bollore lithium-metal polymer cells since 2011, >3000 cycles without dendrites | R47 | OK |
| Temperature ranges | J (R1 2.6) | OK |
| Plating at high current density and low temperature | R48 section 2.2 | OK |
| "What that means in your pocket" aside | derived from R1, R37, R48 | **FLAG**: the page's reading of the sources, labelled as such; the plan required a separate verified source for everyday advice |
| Recycling: recover Co, Li, Ni (and Al, Cu); collection as hazardous goods; pre-treatment steps; pyrometallurgy about 1000 C, Cu-Ni-Co(-Fe) alloy, Li, Mn, Ti in slag, organics burn; hydrometallurgy acid leaching and separation, higher efficiency, complex; direct recycling immature; mechanical plus hydrometallurgical dominant in Europe; EU proposal 45 to 65 % (2025) to 70 % (2030), all EV batteries collected | R48 section 6 | OK |
| Cobalt scarce, costly, toxic; NMC with less cobalt | R47; R44 | OK |
| Lead-acid about 98 % recycled in the US (reported 2004) | J (R1 2.5) | OK |
| Worked example: 3 Ah x 3.7 V = 11.1 Wh = 40.0 kJ | arithmetic | OK |
| Figure 12.1 temperature trace | toy rule, labelled as a drawing device | no claim |
| Which safeguard answers which abuse (figure 12.2) | the page's reading of R46 | **FLAG** for the owner's review |

### R9. Module 10 core statements (new)

| Statement | Basis | Verdict |
|---|---|---|
| Reversible (rate) loss versus irreversible loss from volume change, electrode-electrolyte reactions and decomposition; cycle life to 80 % | E, I (R6) | OK |
| "Poor cell lifetimes are rooted mainly in side reactions occurring at the electrode-electrolyte interface" (paraphrased on the page) | plan module 10 (R2), audited | OK |
| SEI adds interfacial impedance and evolves | F (R6) | OK |
| L ~ t^b with b = 1/2, 1, 0 and the regimes; Delta Q ~ t^b; fastest at high SoC and charging rate | I, O (R37) | OK |
| Excessive SEI thickness: irreversible capacity loss and increased impedance | R44 (conversion-electrode section) | OK |
| Mn(II) from the spinel poisons the anode SEI; alloy particles crack and lose contact | I (R6; R2) | OK |
| Ni-MH up to 30 % a month; Li-MnO2 90 % after 8 years; self-discharge rises with temperature; overcharge and overdischarge form new compounds | I (R1 2.6); plan module 10 | OK |
| Sacrificial salts: oxidizable anion in the positive electrode supplies lithium on the first charge, leaves porosity, chosen by oxidation potential, extends to Na and K; conversion first-cycle loss about 30 % | R44 | OK |
| Worked example: 2 % x sqrt(4) = 4 %; x sqrt(12) = 6.93 %; x sqrt(48) = 13.86 %; b = 1: 24 % | arithmetic; test added | OK (the 2 % start is illustrative and labelled) |

Figure 10.1's band sizes and cycle axis are schematic; its lithium band follows the square-root law.
Figures 10.2 to 10.4 are schematic except for the R1 values in 10.4.

### R10. Module 7 rebuilt from the ground up (owner request), with Jow et al. (eds.) 2014

New sources, each chapter read in full by a separate reading pass and every claim below checked
against the verbatim passage (reports kept in the session):
R53 Henderson, ch. 1, pp. 1-92 (DOI and pages confirmed on Crossref);
R54 Ue, Sasaki, Tanaka, Morita, ch. 2, pp. 93-165 (DOI and pages confirmed on Crossref);
R57 Borodin, ch. 8, pp. 371-401 (Crossref rate-limited during this session: DOI pattern and pages
taken from the chapter itself; **FLAG**: confirm on Crossref).
Table 2.1 of R54 is scrambled by text extraction; its rows were assigned by formula weight and
melting point and cross-checked against R54 Table 2.4 (p. 102), which repeats the same values.

| Statement on the page | Source and page | Verdict |
|---|---|---|
| Commercial electrolyte: roughly 1 mol/dm3 LiPF6 in cyclic (EC, PC) plus linear (DMC, EMC, DEC) carbonates | R54 p. 94 | OK (the source says "e.g."; the page says "such as") |
| A good solvent needs a high dielectric constant to dissociate the salt and high fluidity for conductivity | R54 p. 122 | OK (the source lists two more: low flammability, low toxicity) |
| EC: relative permittivity 90, 1.9 mPa s (both 40 C), 1.32 g/cm3 (40 C), mp about 36 C, 88.1 g/mol; DMC 3.1, 0.59 mPa s, 1.06 g/cm3, 90.1 g/mol | R54 Table 2.1, p. 95 | OK (the chapter also gives 37 C for EC on p. 105; the page says "about 36") |
| Carbonate mixtures have a eutectic; EC-DMC -8.6 C, EC-DMC-EMC -64.7 C; compositions near it preferred for low temperature | R54 p. 97 (Ding's phase diagrams, solvents without salt) | OK; the page says "the solvents alone, without salt" |
| EC usually below 50 vol%, preferably 30 %, because more precipitates at low temperature | R54 p. 97 | OK |
| LiPF6 used almost exclusively; best balance; among the most conductive; stable interface with Al at high potential; stable SEI on graphite with carbonates | R53 pp. 7-8 | OK |
| P-F bond labile; hydrolyses readily; relatively low thermal stability; HF one of the principal concerns | R53 p. 8 | OK (HF can also come from anion-solvent reactions, p. 57; the page does not say water is the only route) |
| LiPF6 became the standard salt only when carbon replaced Li metal and solvents were optimized for Sony's 1991 Li-ion cells | R53 p. 1 | OK |
| Dissolution by solvation of Li+ through lone pairs of solvent donor atoms; anions in general unsolvated in aprotic solvents (no acidic protons); solvent and anion compete for the shell | R53 p. 9 | OK |
| The donor atom of a carbonate is its carbonyl oxygen | R53 p. 9 (donor atoms) with R57 p. 382 (carbonyl oxygen NMR shift linked to the Li+-EC interaction; Li-O(PC) distance) and pp. 389-390 (carbonyl orientation) | **FLAG**: not stated in one sentence by either source; a close reading |
| About four solvent molecules in a tetrahedron; 4.2-4.4 partners in EC:DMC and EC:PC/LiPF6 (MD); 4.5 PC at 2.04 A (neutron diffraction) | R57 p. 382 | OK ("qualitatively consistent" in the source; the page says "about four") |
| EC and DMC about equally likely in the shell in the liquid; gas phase prefers EC | R57 p. 382 | OK |
| EC residence about 0.5 ns; anion 2-3 ns (298 K) | R57 p. 382 | OK (quoted there as a caution about short simulations) |
| SSIP, contact ion pair, aggregate | R57 p. 382 (SSIP, aggregates); R53 p. 12 (contact ion pairs), Fig. 1.6 | OK |
| Monodentate PF6- binding most stable in the condensed phase (figure 7.4, contact pair) | R57 p. 382 | OK |
| Association order LiAsF6, LiPF6 < LiTFSI <= LiClO4 < LiBF4 < LiSO3CF3 | R53 p. 13 | OK (mostly acetonitrile data) |
| Free-ion fraction rises nearly linearly with EC fraction (MD, EC:DMC/LiPF6); ionicity 0.62 PC/LiTFSI, 0.11 DMC/LiTFSI (pgse-NMR plus conductivity, solvent:Li = 20, 298 K); charged clusters contribute | R57 pp. 383-384, eqs. 8.6 and 8.7 | OK; the page explains ionicity as measured conductivity over the independent-ion value |
| Conductivity frequently peaks near 1 M; enough salt needed for carriers | R53 p. 15, p. 5 | OK |
| Vehicular and exchange transport roughly equal in EC:DMC/LiPF6; oligoethers: three to four solvent molecules before the shell is renewed | R57 p. 384 | OK (exchange "for Li solvated by EC" in the source) |
| Bulk electroneutral; screening by ions and oriented solvent; diffuse layer under about 10 nm above 0.01 M; compact layer; field up to 10^7 V/cm | B2 2.3.3, 2.2.2, 1.6.2-1.6.3, 2.2.3 (already verified for module 3) | OK |
| EC replaces DMC at charged surfaces, both signs; SFG confirmation on LiCoO2; carbonyls repelled at negative, enriched at positive; PF6- accumulates at positive; Li+ adsorbed and EC-solvated at the most negative potentials; correlation with EC reduction dominating the SEI | R57 pp. 389-391 (MD on graphite basal plane) | OK; the figure caption says these are simulations |
| Li+ free-energy minimum about 5 A from graphite; steep rise closer than 4 A; consistent with DMC shed first, EC last; 16.4-17 kcal/mol measured | R57 p. 389, Fig. 8.11 (298 K, no SEI, no voltage, preliminary) | OK; "preliminary" and "no SEI" stated on the page; 16.4-17 kcal/mol = 68.6-71.1 kJ/mol |
| Interfacial resistance: SEI and desolvation the two usually discussed contributions; can exceed the bulk at low temperature | R57 p. 388 | OK |
| Worked example: 300 x 1.32 / 88.1 = 4.49 mol EC; 700 x 1.06 / 90.1 = 8.24 mol DMC; 12.7 per Li+; spacing (1 L / NA)^1/3 = 1.18 nm | arithmetic from R54 Table 2.1; tests added | OK (salt volume neglected, stated) |
| Worked example: E = i/kappa = 0.1 V/cm at 1 mA/cm2 and 10 mS/cm; v = i/(Fc) = 0.104 um/s; 241 s across 25 um; 6.0e20 ions per cm3 | Ohm's law (B2), R1 conductivity range; steady state with blocked anions (R36 salt balance) | OK; **FLAG**: v = i/(Fc) is a derivation for the steady state, labelled as such |
| Molecular structures drawn in figures 7.1, 7.3 and 7.4 | from the chemical names (R54 Table 2.1) and R53 Fig. 1.3; typical bond lengths | drawing device; only the Li-O distance is from a source, stated in the caption |
| Dissolving animation (figure 7.3) | R53 p. 9 | schematic; the caption says the solid is not the real crystal structure |

New tests: solventPerIon (12.73 per Li+ for EC:DMC 3:7), meanSpacing (1.184 nm), bulkField and
meanIonVelocity (0.1 V/cm, 0.1036 um/s, 241 s). 42 of 42 pass.

### R11. Module 6: the two hosts in three dimensions (new figure 6.2; old 6.2 to 6.4 are now 6.3 to 6.5)

| Statement or element | Source | Verdict |
|---|---|---|
| Graphite: lithium between the carbon sheets, up to LiC6 | R6 (as in figure 6.1) | OK |
| LiCoO2: layered; lithium between two octahedral cobalt oxide (CoO2) sheets; the sodium precedent of Hagenmuller and co-workers (1970s); Goodenough's group 1979-80, twice the voltage of TiS2 | R47 | OK |
| About half the lithium of LiCoO2 taken out on charge | R2, R6 (as in figure 6.1) | OK |
| Insertion electrodes keep structure and shape, hence highly reversible | R1 2.4 (as in figure 6.1) | OK |
| Hexagonal carbon rings; lithium on every third ring centre (one per six carbons at LiC6); close-packed layers with octahedral cobalt and lithium | standard crystal structures, not from a source in hand | drawing device, stated in the caption; **FLAG** if the owner wants a structural source cited |
| Layer spacing, order in which sites fill | none | schematic, stated in the caption |

Figures 7.1, 7.3, 7.4 and 6.2 use a small three-dimensional ball-and-stick renderer (figs-7m.js) with
typical bond lengths; only the Li-O distance of figure 7.4 is a sourced number.

### R12. Electrolyte additives (modules 6, 7, 12) from R55 (Abe 2014, ch. 3, pp. 167-207)

R55 was read in full by a separate reading pass (DOI pattern and page range from the chapter itself;
Crossref was rate-limited, **FLAG**: confirm). Wording was adjusted to its hedges.

| Statement on the page | R55 page | Verdict |
|---|---|---|
| Minute amounts of additives with assigned jobs (anode, cathode, overcharge); no single additive satisfies all requirements; the search for combinations central to electrolyte work | pp. 167-169 | OK |
| Additives that decompose first leave a controlled thin layer; VC the best-known additive, reducible at the graphite above 1 V vs Li to form a passivation layer; suppresses PC decomposition | pp. 170-172 | OK (passivation wording quoted from a patent in the chapter) |
| Overcharge: excess lithium extracted, oxygen released, crystal unstable; lithium deposits on the negative; electrodes decompose solvents; sudden exothermic reaction | p. 186 | OK |
| Redox shuttles consume current and suppress the voltage rise; aromatic additives such as biphenyl believed to polymerize above the maximum operating voltage into an insulating polymer on the positive electrode; cyclohexylbenzene gives hydrogen, and with a current interrupt device cuts the charge current | pp. 187-190 | OK ("three main ways"; the chapter lists more) |
| Additives always have side effects; biphenyl worsens cycle life at 40 C to 4.3 V progressively | pp. 189, 200 | OK |
| Phosphate esters (triethyl phosphate) with very high flash points; trimethyl phosphate poor stability against graphite, judged impractical by some | pp. 181, 194 | OK |
| Figure 12.2 additives row and overcharge text | pp. 187-190 | OK after rewording; which layer answers which abuse remains the page's reading (**FLAG**, as before) |

### R13. Owner review of 2026-10-01: figures 6.2, 6.4, 6.5, 7.1, 7.3, 7.5, 7.6, and text layout

**New source R58**, Nagendra et al. 2026, Batteries 12, 154 (uploaded by the owner). It was read in full by a separate reading pass. The owner also uploaded pages 6 to 8 of its figures, and I viewed those.

| Statement or element | R58 location | Verdict |
|---|---|---|
| Graphene sheets of hexagonal rings, sp2 | p. 6 | OK |
| Sheets held by van der Waals forces and π–π interactions | p. 6 | OK; "only" removed |
| ABAB stacking predominant in natural graphite | p. 6 | OK ("mostly" on the page) |
| 0.335 nm between sheets | p. 6 | OK |
| C–C 0.14 nm | Fig. 2a label, read from the figure image | OK |
| Edges are favourable sites for intercalation, with faster Li+ diffusion; basal planes less reactive | pp. 6–7 | OK; the zig-zag-edge caveat (p. 8) is not on the page |
| Stage = number of graphene layers between lithium planes; stage 4 to stage 1; fully intercalated LiC6 at 372 mAh/g | p. 8 | OK |
| "Fills some gaps, leaves others empty" | follows from the stage definition | close reading |
| Stage 2 = LiC12 | title of R58's ref. 54 only | **FLAG**: close reading; a primary source would be better |
| Stages 2 and 3 are stable phases that affect the equilibrium potential and diffusion | p. 8 | OK |
| Stage transitions thermodynamically favoured but kinetically hindered, especially LiC12 to LiC6 | p. 8 | OK (now worded for all transitions) |
| Rüdorff–Hofmann: full layers | p. 8 and Fig. 4 | OK |
| Daumas–Hérold: islands within the layers | p. 8 and Fig. 4 | OK |
| About 10 % volume expansion, mostly along c | p. 15 | OK; R58 cites a modelling paper for the 10 % (noted) |
| Yamamoto 0.355 nm and the 14 % c-axis figure | none | not used: the 0.355 nm is for twisted multilayer graphene, not LiC6 |
| **AA stacking across a filled gap; filled-gap spacing 0.370 nm; Li over every third ring; LiCoO2 cell a = 0.282 nm and 0.468 nm sheet spacing** | not in any source in hand (R58 states none of them) | **FLAG**: drawn from the standard crystal structures for accuracy, said so in the caption; owner to supply a source (for example a crystallographic study of LixC6 and of LiCoO2) |

**Figure 6.4.** Redrawn as isometric blocks: planes (2D), a network (3D) and channels (1D). Basis unchanged (R6).

**Figure 6.5.** The same nine events and texts, now as a timeline with one card at a time. The one-line notes summarise each event's sourced text.

**Figure 7.1 computation.** Done for this page with PySCF 2.14:
- Method: B3LYP/def2-SVP; geometries optimised with pyberny; isolated molecules in vacuum.
- Bond lengths:
  - EC: C=O 1.188 Å, C–O 1.359 Å, O–CH2 1.425 Å, C–C 1.535 Å.
  - DMC: C=O 1.206 Å.
  - PF6−: P–F 1.639 Å.
- Dipole moments: EC 5.23 D; DMC 0.33 D (cis-cis conformer).
- Electrostatic potential on the 0.001 a.u. density contour, in plane:
  - EC: −1.77 to +1.68 V.
  - DMC: −1.54 to +0.83 V.
  - PF6−: −5.43 to −4.73 V.
  - Li+: +14.5 to +15.2 V.
- Scripts are in `tools/qc/`. All of these are labelled as the page's own calculation. **FLAG**: def2-SVP has no diffuse functions, which is adequate for the qualitative maps of PF6− shown.

**Figure 7.3, anion solvation.**
- R53 p. 9: anions in general unsolvated in aprotic solvents, which have no acidic protons; in water anions are solvated by hydrogen bonds. OK.
- R57 p. 376: EC–PF6− complexes studied as clusters. OK.
- The faint neighbours, CH end towards the anion, are a drawing device oriented by the computed potential of figure 7.1, and the caption says so.

**Figure 7.5.** The field switch now drives Li+ towards the − plate and PF6− towards the + plate. A test confirmed a net drift of our ion of about 40 px/s with the field on and none with it off. Under reduced motion a track is precomputed. The drift is labelled as exaggerated.

**Figure 7.6.**
- Rebuilt as a to-scale molecular close-up with the computed geometries:
  - basal-face views for negative, uncharged and positive electrodes (R57 pp. 389–391);
  - an end-on, hydrogen-terminated view for desolvation (R57 p. 389, Fig. 8.11);
  - a free-energy curve through Borodin's three numbers, its shape schematic.
- Lower plot: double-layer profiles after B2, shapes schematic.
- Individual positions are illustrative, as the caption says. **FLAG**: the adsorbed Li+ at about 5 Å in the negative-electrode view uses the distance from the edge-model desolvation study.

**Text layout.**
- Paragraphs over about 85 words were split only at citation boundaries, so every part keeps its citation.
- Subheadings were added to long beats.
- Each beat now opens with its one-line lesson.
- No wording changed in Act A.

## S. Module 5 detail round (2026-10-02, Cowork session): four papers on charge and discharge

Sources read in full and added as `verified` (details taken from the documents themselves):
R59 Safari and Delacourt 2011, J. Electrochem. Soc. 158, A63–A73, doi 10.1149/1.3515902;
R60 Olson, López and Dickinson 2023, Chem. Mater. 35, 1487–1513, doi 10.1021/acs.chemmater.2c01976 (CC BY 4.0);
R61 Moya 2025, J. Power Sources 656, 238050, doi 10.1016/j.jpowsour.2025.238050;
R62 Doyle, Fuller and Newman 1993, J. Electrochem. Soc. 140, 1526–1533, doi 10.1149/1.2221597 (eqs. 26 and 27 read from the page images; the text layer is garbled).

**Old figure 5.4 (phase rule), checked and replaced by the new figure 5.6.**

| Item in the old figure | Finding | Action |
|---|---|---|
| Plateau labelled 3.5 V | R6 rounds the rung to 3.5 V; R59's fit of the C/100 average (eq. 10) is flat at 3.4323 V from y ≈ 0.15 to 0.85 (our evaluation) | Curve is now R59 eq. 10, labelled 3.43 V |
| Shape of the plateau ends | Arbitrary exponentials | Replaced by R59 eq. 10 (partial solid solution at both ends) |
| A front moving across one particle | R59 p. A63: core-shell models conflict with experiments showing Li moving tangential to the boundary | Drawn as many particles, each changing over as a whole; arrangement inside a particle not drawn and said so |
| "P = 2 → F = 0" labels | Count was after fixing T and p, but read as F itself | Now F = 2 − 2 + 2 = 2, then "fix T and p: none left" |
| No hysteresis | R59 cites Dreyer et al.: ~20 mV gap at C/1000, thermodynamic | Added (step 5, text, caption) |

**Claims, new beats 5.1, 5.5, 5.6 (additions), 5.7, 5.8, 5.9.** Checked by a separate full-text reading pass; its 14 findings were all applied.

| Claim | Status | Source |
|---|---|---|
| Galvanostatic cycling; 1C passes the nominal charge in 1 h; 210 mAh cell at C/20 = 10.5 mA; CCCV with hold at 4.2 V to C/20; 1 Hz sampling, 144:1 downsampling before differentiation | OK | R60 §4.1 |
| CCCV at C/5 with CV to C/25 on charge and discharge, 2.5–4.2 V vs Li | OK | R59 Experimental |
| Ideal battery material (delta-function dq/dU, energy ∝ charge), ideal capacitor material (constant C_sp), "ideal" is a mathematical limit, capacitor material covers double layer, surface redox and single-phase insertion, capacity needs a voltage window | OK | R60 §2.1 |
| Moya circuit and eqs. 1, 2, 4, 6, 7, 8, 12, 15, 16; Table 2 values for C10; Ci ≈ 2C/7 (eq. 33) | OK; values recomputed in tests | R61 |
| Charge/discharge bend ratio 2:1 (0.34 and 0.69 mV for the 1 F capacitor at 10 mA) | OK as a ratio. **FLAG**: the measured magnitudes are about a tenth of Ri·I0 from R61's own Table 2 (3.2 mV); the page compares only the ratio and says so | R61 §4 |
| Staging-material example Li0.75M; dQ/dV peaks ↔ plateaus; no sharp peaks for solid solutions | OK | R60 §2.3.1 |
| Quote on dQ/dV and dV/dQ peaks | OK; it is Olson's quotation of Safari and Delacourt's ageing paper (J. Electrochem. Soc. 158, A1123), not R59, and the page now says so | R60 p. 1494 |
| V = Upos − Uneg; electrode dV/dQ terms add; square plot, gradient and intercept; LAM and LLI definitions; eqs. 48, 49; LLI leaves graphite peaks and moves LCO peaks to lower Q | OK | R60 §3 |
| LFP 10⁻⁹ S/cm; carbon coating and small particles; resistive-reactant model; four groups (25/62/8/5 %, Rc 0.08/2.88/7.81/36.99 Ω m²); first charge simulation; slope steepens with rate; extra current collectors raise pressure, up to 44 % lower Rc for group 4; asymmetry 8 % at 3C, 11.5 % at 5C; path dependence 3.96 % (case 1, charge); about one fifth at 5 % SOC; no relaxation on the flat OCP | OK | R59 |
| Doyle: Li / PEO-LiCF3SO3 / TiS2 at 100 °C; superimposed continua; ~30 % at 20 A/m²; cut-off ~1.7 V; salt rises at the foil and falls at the back; conductivity ratio O(10⁵) puts the reaction at the front, then it moves inwards; Sc ≈ 10⁻⁴ (recomputed, test); Se = 0.15 at 10 A/m²; porosity 0.60 (optimum, thicker at fixed capacity) gives 97 % against 84 % at 0.30; thinner electrodes better when electrolyte limits; higher initial salt concentration suggested | OK | R62 |

**Computations.**
- `P.lfpElectrode` implements R59 eqs. 2–12 with Table I case 1 (εt = 0.43, the middle of 0.428–0.435). It is our own explicit integration with a backward-Euler step for the flux variable. Tests check:
  - the 1C current is 18.4 A/m²;
  - utilization falls with rate, and is higher on charge than on discharge;
  - groups fill in order of contact resistance;
  - after C/25 to 50 % the spread among groups is 0.092 (R59: 0.0973 and 0.0892) and is unchanged by a 2 h rest;
  - the from-empty history limits the 1C charge (R59 Fig. 10).
  Our simulated path-dependence difference (about 2.4 %) is smaller than R59's measured 3.96 %; the readout gives our number.
- Figure 5.8 is schematic. Only the final utilizations, the cut-off and the trends are from R62.
- Figure 5.9 is a toy cell. **FLAG**: the logistic-sum form of x(U) and all plateau potentials are the page's own invention, and the caption says so.
- Figure 5.1 adds a steeper end of charge to the illustrative cell of figure 5.3 so that the CV step can end. **FLAG**: illustrative, and the caption says so.

**Equations.** Every equation in Module 5 (text, worked examples, captions, the Go-deeper and mathematics panels) is now LaTeX in `<m>`/`<md>`, converted to MathML at build time (`latex2mathml`). A few sentences were split around the new display equations; their wording and citations are unchanged.

## T. Owner review and full audit (2026-10-02, later)

**Changes the owner asked for.**
- **Figure 5.3:** redrawn with a breakdown panel that enlarges the polarization at the probe (ohmic, activation, concentration, in mV). The heat areas are lighter.
- **Figure 7.7** (the old 7.6, layers at the electrode):
  - zone bands for the first layer, the diffuse layer and the bulk;
  - fewer molecules;
  - a steadier view;
  - two lower panels (potential, ions) with labelled curves.
- **Worked examples:**
  - the Doyle S_c example is split into steps, so nothing overflows;
  - the Coulombic-efficiency example explains CE^N step by step.
- **New figure 7.3**, the commercial electrolyte ingredients compared. Figures 7.3–7.10 became 7.4–7.11.

| Claim in figure 7.3 and its text | Status | Source |
|---|---|---|
| Conductivity at 1 M in PC:DME (50:50 v:v), 25 °C: AsF₆ 14.8, PF₆ 15.3, ClO₄ 13.5, TFSI 12.6, BF₄ 9.5, SO₃CF₃ 6.1 mS/cm | OK, from the page image | R53 Table 1.1 (p. 19) |
| Al repassivation potential in PC:DME: LiPF₆ >5 V, LiTFSI 3.7 V | OK | R53 Table 1.7 (p. 53) |
| The salt requirements (conductivity, stability, SEI, Al passivation above 3.6 V, hydrolysis, low cost and toxicity), and that failing one rules a salt out | OK | R53 pp. 6–7 |
| Salt ratings for LiClO₄, LiAsF₆, LiPF₆, LiBF₄, LiSO₃CF₃, LiTFSI | OK; each cell's readout paraphrases the source sentence, and cells with no verdict are marked "not rated" | R53 pp. 7–9 |
| Solvent properties of EC, PC, DMC, EMC and DEC: εr, η, mp, bp, fp, Eox (EC εr and η at 40 °C; Eox on glassy carbon with Et₄NBF₄ or Bu₄NBF₄) | OK, from the page image | R54 Table 2.1 (p. 95) |
| The glassy-carbon window is not a clear indicator of stability with active electrodes | OK | R53 p. 6 |

**Full audit of Modules 5 to 12.** Five separate reading passes recomputed every worked example and readout and checked the claims against the full texts. Their findings were applied. The main corrections:
- **Physics and arithmetic:**
  - **Figure 5.4:** evaluated at half charge, so high rates no longer saturate.
  - **Maths panel:** the sign of the Butler-Volmer inverse is fixed.
  - **Retention:** written as CE^N (idealized), not as a bound.
  - **Rates:** `fmtRate` no longer prints "C/1".
  - **Figure 5.1:** the constant-voltage charge is counted on its own.
  - **Figure 6.3:** the SEI now forms first and the graphite fills near 0.2 V.
  - **Figure 8.4:** the size and time factors are consistent (square law).
  - **Figure 10.2:** both growth laws are anchored to the same first month.
  - **Figure 11.3:** ΔE_s now grows in proportion to τ, so the computed D is truly independent of τ.
  - **Figure 12.1:** the "levels off" label is fixed for cooling without a steady state.
  - **Module 7:** the diffuse layer is noted as stretched (under 1 nm at 1 M).
- **Directions:** conversion electrodes are described by lithium in and out, not by charge and discharge. The GITT surface wording is direction-neutral.
- **Sources:**
  - Sony's 1991 cell used a coke-type carbon (R46, R47).
  - Brandt's C/LiCoO₂ range is 64 to 100 Wh/kg.
  - The 5–5.2 V for EC requires hydrogen transfer to another EC (R51).
  - The 0.5 nm Li⁺ distance belongs to the edge desolvation run only (R57).
  - The EC explanation goes back to Dahn and co-workers, 1990 (R47).
  - "Almost every" became "most" (R51).
  - NMP is recovered for cost and pollution reasons (R48).
  - Pyrometallurgy sends lithium to the slag (R48).
- **Style:**
  - "anode" removed from our text in figures 9 and 12;
  - "optimised" and "recognise" changed to the -ize forms;
  - carbon is drawn in one colour across Modules 8 and 9;
  - the SVG title ids of figures 11.1 and 11.2 were swapped back.

**Records still using old Module 7 numbers.** Sections R10–R12 above refer to figures by their numbers at the time: old 7.3→7.4, 7.4→7.5, 7.5→7.6, 7.6→7.7, 7.7→7.8, 7.8→7.9, 7.9→7.10, 7.10→7.11.
