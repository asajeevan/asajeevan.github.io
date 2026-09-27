# Figure review sheet, Act A (figure standard item 10)

One row per figure. A figure ships only when the owner has initialled its row. Columns:
basis (source figure or equation), what is computed and what is schematic, the
direction-and-sign checks that were made, the standard items (1 mechanism and numbered
callouts, 2 visible cause for motion, 3 units and numbers, 4 potential profile where the
concept is voltage or an interface, 5 our ion, 6 legible at 360 px, 7 controls, 8 caption,
9 reduced-motion frame), and the owner's initials and date.

Automated checks on 2026-09-27 (`tools/qa/acta.js`): no JS errors at 1300 or 360 px with
motion on or off; every citation link resolves; every step button and player button on
every Act A figure exercised; no SVG label overlaps or clips at 360 px.

| Figure | Title | Basis | Computed / schematic | Direction and sign checks | Standard items | Owner initials, date |
|---|---|---|---|---|---|---|
| 0.1 | Two charges and the force between them | B2 14.3.1 fn 6 (Coulomb, SI), 2.2.1 fn 16 (eps0) | Force computed; arrow length is sqrt-scaled (stated) | Like charges repel, unlike attract; F(2r) = F(r)/4 (test) | 1 2 3 6 7 8 9 (no ions, no strip: 4 and 5 not applicable) | |
| 0.2 | Field probe and the potential around a charge | B2 2.2.1 eqs. 2.2.1, 2.2.2 | Field and potential computed; phi = q/(4 pi eps0 r) by integrating eq. 2.2.1 (numerical test) | Field outward from +, probe force reverses with its sign, slope of phi = -E | 1 2 3 6 7 8 9 | |
| 0.3 | Voltage: the potential hill between two plates | B2 2.2.1 (conductor), 4.2.3 (linear field), 1.1.4 fn 9 (eV), 1.1.2 (J/C) | E = V/l computed; strip to scale in volts | + charge downhill, - charge uphill; plates flat | 1 2 3 4 6 7 8 9 | |
| 0.4 | A wire carrying current | B2 1.1.1, 1.1.5, 2.2.1 fn 15, 1.5.1 fn 39; R1 2.2 (Ohm); R6 (P = IV) | I, P, electrons per second computed; 3 % drop per wire illustrative (stated) | Electrons - to + through the wire; field + to -; open switch: flat wires, whole V across the gap | 1 2 3 4 6 7 8 9 | |
| 0.5 | An ion in a liquid: force, drag, terminal velocity | B2 2.3.3, Fig. 2.3.4, 1.5.1, eq. 2.3.10 | Relative units only (no eta or r in the sources) | Cation to -, anion to +; drag grows with speed; cations down the slope, anions up | 1 2 3 4 5 6 7 8 9 | |
| 1.1 | The Daniell cell | R1 Fig. 1; B2 Table C.1, Fig. 1.1.2, Fig. 1.5.2, 2.2.3 | 1.10 V computed; strip schematic (split of jumps not measurable, stated); drop under load illustrative | Zn oxidised, Cu2+ reduced; electrons Zn to Cu outside; sulfate to Zn, cations to Cu inside; Zn thins, Cu thickens; open circuit: flat bulk | 1 2 3 4 5 6 7 8 9 | |
| 1.2 | Two roads: electrons in the metal, ions in the liquid | B2 1.1.1 and fn 1, 2.2.1, 1.5.1 | Schematic | Electrons against the field, cations along it; charge crosses only via a reaction event | 1 2 3 5 6 7 8 9 | |
| 1.3 | Cell versus battery | R1 fn 1; R6; B2 eq. 2.2.2 | Strip schematic (1.5 V per cell illustrative, stated) | Series adds V only; parallel adds Q only | 1 2 3 4 6 7 8 9 | |
| 2.1 | A coin cell in cross-section | R21 Fig. 1 and text; R1 1.2, 2.2; R6 Fig. 1; B2 Fig. 1.1.2 | Schematic, not to scale (stated); 20 mm from the CR2032 name | Stack order as R21; can +, cap -; strip: can V above cap | 1 3 4 6 7 8 9 | |
| 2.2 | The jelly roll | R6 Fig. 1 and text; R1 Fig. 20 | Schematic morph, constant arc length | Layer order preserved when wound | 1 2 3 6 7 8 9 | |
| 2.3 | Inside a composite electrode | R1 1.6 and Fig. 9 | Schematic; 30 % porosity stated | Electrons via carbon from the foil; Li+ via pores from the separator side; both meet at one particle | 1 2 3 5 6 7 8 9 | |
| 2.4 | Nominal voltages | R1 Table 2 | Data as printed | Aqueous all <= 2.0 V; > 2 V all lithium, nonaqueous | 1 3 6 7 8 9 | |
| 3.1 | Potential as electron energy: the Fermi level | B2 1.1.4, Fig. 1.1.3, 2.2.5 | 1 eV per volt exact; orbital positions illustrative (stated) | More negative = higher energy; reduction above the vacant orbital, oxidation below the occupied one | 1 2 3 6 7 8 9 | |
| 3.2 | The electrical double layer | B2 1.6.2, 1.6.3, Fig. 1.6.3b, 2.2.2, 2.2.3, 14.3.1; R1 4.2 | Scales as printed; profile shape schematic | Countercharge opposite to the metal's; zero charge = no jump | 1 2 3 4 6 7 8 9 | |
| 3.3 | The potential ladder | R6, R2 (rungs); R6 (carbonate window); B2 Table C.1 and 2.1.9 (water window) | Water window computed (test); rungs as printed | Water 3.045 to 4.274 V vs Li at pH 0, 59 mV/pH; flags exactly at the R6 conditions | 1 3 6 7 8 9 | |
| 3.4 | Electron energy picture with the wire | R6 Fig. 2a, 2c, eq. 6 | Levels as printed | Electron round the external circuit, never through the electrolyte; ion through | 1 2 3 5 6 7 8 9 | |
| 3.5 | Oxides versus sulfides | R6 (band tops, HOMO 4.3 eV); B2 20.1.1 (band) | Schematic; band widths not to scale (stated) | Couple pinned at the band top; oxide top just above the HOMO line | 1 3 6 8 9 | |
| 3.6 | dG = -nFE | B2 eq. 2.1.25; R1 eq. 3; Table C.1 | Computed; Daniell mark 212.8 kJ/mol | Spontaneous reaction: positive E, negative dG | 1 3 6 7 8 9 | |
| 4.1 | Faraday calculator | R1 eq. 7; B2 eq. 1.1.12; R2, R6 check values | Computed; reproduces 372 and 170 mAh/g (tests) | Basis labelled per bar; Wh/kg of one electrode's active material only | 1 3 6 7 8 9 | |
| 4.2 | Energy as area | R6 eq. 5; R1 1.4 (polarization) | Illustrative model (stated); integral computed | Higher rate: lower and shorter curve, smaller area | 1 2 3 6 7 8 9 | |
| 4.3 | Ragone map | R1 Fig. 3 and 1.1 | Schematic, unnumbered | Ordering as R1; engine stores energy in fuel (stated) | 1 6 8 9 | |
| 4.4 | Theory against practice | R1 1.1 and Fig. 19 | Rule of thumb; blurred edge for "about" | Rechargeable about 25 %, primary over 50 %; three reasons unsized | 1 3 6 7 8 9 | |
