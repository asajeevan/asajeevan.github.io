# Issues, gaps and the sources to fill them

> **Status 2026-09-27.** Act A was reworked against this list on branch
> `claude/ecstatic-bohr-ym5qe9`: the four errors of section 2 are fixed, Module 0 exists
> with five figures, modules 1 to 4 are rewritten for a first-year reader with a
> "where we are" opener, a worked example and a recap each, and all 20 Act A figures (figure 4.4, the 25 % rule of thumb, was removed as not generally true) are
> rebuilt to the standard of section 5 (numbered callouts with a step bar, play/pause/step
> on every animation, units on every quantity, a potential strip wherever the concept is
> voltage or an interface, our ion followed by name, 12 px labels checked for overlaps at
> 360 px by `tools/qa/acta.js`, captions with basis and try-this, reduced-motion frames).
> Item 10 of the standard, the owner's initials, is open: see `figure-review.md`.
> Owner's later requests, done the same day: no inline citation marks (references at the
> end only, per-figure source in a collapsed toggle), the 25 % rule of thumb removed with
> figure 4.4, the series/parallel explanation added to module 1, "coin cell" named in
> figure 2.1's title, and figure label alignment corrected throughout.
> Still open from section 4: no introductory physics text was supplied, so Module 0 is
> cited entirely to Bard, Faulkner and White (sections 2.2.1, 1.1.2, 1.1.4, 1.1.5, 2.3.3,
> 4.2 and 14.3.1 cover Coulomb's law, field, potential, Gauss's law, conductors, the
> electron-volt, current, Ohm's law and mobility); the glossary of 4.7 is not built; the
> electron drift velocity in a metal and the surface-charge mechanism that sets up the
> field along a wire are not in any source in hand and are not stated on the page.

Written 2026-09-26 after the owner's review of modules 1 to 5. This is the work list
for the rework. Sections: 1 the owner's verdict, 2 scientific errors to fix first,
3 figure-by-figure critique, 4 content gaps for a first-year student and the sources
that cover them, 5 the figure standard every rebuilt figure must meet, 6 the revised
Act A.

## 1. The owner's verdict (paraphrased from the review)

- Every figure and animation has issues.
- There are many gaps. The audience is a first-year college student, who needs
  explanations, connections and flow in the story.
- Not explained: what potential is, what voltage is and where it originates; the
  physics and mathematics behind them; why the electrons move the way they do; what
  the electric field is here, how it forms and what it does.
- Find sources for all of that too.

## 2. Scientific errors found in my own re-check (fix first)

1. **Figure 3.1, the water window.** The optional aqueous band is drawn from 0 to 1.23 V
   versus Li/Li+. That is wrong: the water window is 1.23 V wide, but its position on
   the lithium scale is set by the hydrogen electrode, which sits at +3.04 V versus
   Li/Li+ (Tarascon and Armand 2001 give lithium at -3.04 V versus SHE). At pH 0 the
   window runs from about 3.04 V (hydrogen evolution) to about 4.27 V (oxygen
   evolution) versus Li/Li+, and it shifts with pH (59 mV per unit, Bard, Faulkner and
   White, section 2.1.9, potential-pH diagrams). Either draw it at the right place
   with the pH stated, or remove it from that figure.
2. **Figure 3.2, the electron path.** The animated electron drops from the negative
   electrode level to the positive electrode level by crossing the electrolyte column.
   Electrons do not pass through the electrolyte; that is the whole point of module 1.
   The path must go around, through the external circuit, and the figure must say so.
3. **Figure 4.1, "Wh per kilogram of this material".** Multiplying the capacity of a
   single electrode material by a cell voltage and calling it the energy of "this
   material" is misleading: energy belongs to a pair of electrodes, and the mass in the
   denominator is only one of them. Reword to "energy per kilogram of this electrode's
   active material, against the chosen counter electrode, active material only" or drop
   the Wh/kg line and move the energy calculation to figure 4.2.
4. **Figure 1.1, ion motion.** Cations and anions are drawn as particles that drift
   across the whole cell and wrap around. In the Daniell cell Zn2+ is created at the
   zinc, Cu2+ is consumed at the copper, and sulfate migrates through the separator; the
   wrap-around suggests anions are created and destroyed. The rebuilt figure must show
   the electrode reactions as events (an atom leaving the zinc as an ion, an ion
   arriving at the copper and becoming an atom) and the ion drift as migration in the
   field plus diffusion, with the separator's role visible.

## 3. Figure-by-figure critique (all 20 figures)

General, applies to all: animations loop mechanically with no narrative and no
controls (no play/pause, no step, no "watch this" highlight in sequence); nothing
tells the reader what to look at in what order; the figures do not build on each
other visually; there is no shared "one ion" character despite the story spine;
labels are set at 11 px and collide at phone width; captions repeat the text
instead of explaining the figure; the reduced-motion frames are complete but bland;
no figure shows the electric field, the potential profile, or the double layer,
which are the concepts the owner asked for.

| Figure | Problems |
|---|---|
| 1.1 Daniell cell | See error 4. Also: no voltmeter drawn although the caption quotes 1.10 V; electron speed unrelated to current; lamp does not dim or brighten; no labels naming which ions are which (Zn2+, Cu2+, SO4 2-); electrode reactions written as text only, never shown happening; no mass change of the electrodes; the 1.10 V is not connected to the ladder that comes later; nothing explains why electrons choose the wire (the field along the wire from the surface charges the cell sets up). |
| 1.2 Three cousins | Too abstract to teach anything: the fuel cell shows only two inlets and no reaction, product or membrane label; the supercapacitor oscillates with no cause; no legend for the grey and amber dots in panel 3; the panel bottoms are just captions. Either make each panel a small working schematic with a labelled mechanism, or cut the figure and keep the paragraph. |
| 1.3 Series and parallel | Correct but trivial; does not explain why voltages add in series (potential differences add along a path) or why capacities add in parallel. Needs a potential-along-the-path strip under the series case. |
| 2.1 Exploded coin cell | Flat rectangles read as a bar chart, not a cell; no sense of the circular parts; the spring is not obviously clickable; the electrolyte is invisible; no scale; the layer thicknesses are arbitrary; the part descriptions are paraphrases, not source quotations. |
| 2.2 Jelly roll | The spiral draws once and then sits there; the flat stack and the spiral are not visibly the same object (no morph, no colour match explained); current collectors are missing from both; "large area, thin electrolyte" is asserted, not shown (no dimension arrows). |
| 2.3 Composite electrode | The zoom guide lines end in odd places; the binder is not drawn although the text names it; pores are not visible, so "30 % porous, filled with electrolyte" has no picture; the electron and ion paths in panel c are decorative; carbon dots in panel b do not form a connected network. |
| 2.4 Nominal voltages | Rotated labels are cramped; the chart is a list, not an insight; primary versus rechargeable is only a colour; no link to the ladder in module 3, where these numbers should reappear as gaps between rungs. |
| 3.1 Potential ladder | Error 1. Also: the axis is never explained physically (energy per unit charge, measured against lithium); no arrow saying "electron energy increases upward"; the sulfur rung (a lithium-sulfur positive electrode) mixes conversion chemistry into an insertion ladder without saying so; the electrolyte band is for carbonates only; the flags use "SEI" before the SEI has been introduced (module 6). |
| 3.2 Electron energy picture | Error 2. Also: "LUMO/HOMO" and "window E_g" appear without definition; the vertical axis says "electron energy" but the numbers are volts; no link drawn between this picture and the ladder (same quantity, different axis direction). |
| 3.3 Oxides vs sulfides | The couple markers start at an arbitrary height and slide down for no stated reason; "band" is never defined for a first-year reader; the pinned labels overlap the band tops on phones. |
| 3.4 dG = -nFE | Correct but weak: a bar that grows with two sliders teaches little; the bar's scale (1450 kJ/mol) is arbitrary; no worked example with a real reaction; no connection to the Daniell cell's 1.10 V (which would give -212 kJ/mol for n = 2). |
| 4.1 Faraday calculator | Error 3. Also: the reference bars compare unlike bases (C6 vs LiFePO4 vs Li) without saying so on the chart; the custom entry has no validation; the "computed value, no printed check" flag is fine but appears for the default material. |
| 4.2 Energy as area | The "sloping" open-circuit curve is a straight line with a bent end; the "flat" curve has an odd initial bump; the capacity axis is unnumbered; the dashed reference curve is not in the legend; the knee is an artefact of a hand-made model, which the caption admits. |
| 4.3 Ragone | Acceptable as a schematic; no numbers by design; but the combustion engine ellipse misleads (it stores energy in fuel, not electrochemically) and the caption should say so more clearly. |
| 4.4 Theory vs practice | Fine as a predict-then-reveal; the buttons lock after one guess with no way to reset; the practical bar is drawn at exactly 25 %, which overstates the precision of a rule of thumb. |
| 5.1 Curve simulator | The charge branch is cut at the same capacity as the discharge branch (an artefact of the band code); the model's parameters are invented; the "heat band" is only correct where both branches exist; the capacity axis is unnumbered; nothing shows the three polarization parts on the plot itself, only in the readout. |
| 5.2 Relaxation clocks | Amplitudes invented; the pre-interruption level is not drawn; no explanation of what "current interruption" is in the lab. |
| 5.3 Plateau or slope | The particle animation is simplistic (a shrinking core is only one two-phase geometry); the voltage traces are tiny; no axis; the phase-rule argument is not drawn (no count of phases and degrees of freedom). |
| 5.4 Cycle life | Fine, but the retention = CE^N idealization needs one sentence on what real fade looks like, and the ghost curves need a legend. |
| 5.5 Heat | Two bars with invented sizes; no time or temperature axis; does not connect to figure 5.1's band. |

## 4. Content gaps for a first-year student, and the sources that cover them

The owner is right that the page starts at "cell" without ever building "charge,
field, potential, voltage". A first-year student needs these in order, each with an
equation, a picture and a number. Sources in hand are marked **(in hand)**; the rest
must be supplied and verified before they are cited.

### 4.1 Electrostatics: charge, force, field, potential energy, potential, voltage
- Charge and Coulomb's law; the electric field as force per unit charge; field lines;
  the field of a charged plate; potential energy of a charge in a field; potential as
  potential energy per unit charge; potential difference (voltage) as the work per unit
  charge between two points; the volt and the electron-volt; conductors in
  electrostatic equilibrium (field zero inside, charge on the surface, the whole
  conductor at one potential).
- Sources: an introductory physics text, to be supplied (Feynman Lectures II, chapters
  1 to 6; or Purcell and Morin; or Halliday, Resnick and Walker; or Griffiths). Bard,
  Faulkner and White **(in hand)** section 2.2.1 "The Physics of Phase Potentials"
  (pages 80 to 82) gives the electrochemist's version: the inner (Galvani) potential of a
  phase, the role of excess charge, and the estimate of how little charge changes a
  conductor's potential by one volt.

### 4.2 Why electrons move in the wire and how the field gets there
- A current is charge per second; in a metal the mobile charges are electrons; they drift
  slowly under a field; the field in a wire connected to a cell is set up by charges on
  the surfaces of the wire and the cell terminals; Ohm's law as the link between field,
  drift and current; resistance; power as voltage times current.
- Sources: the physics text above for drift and surface charges. Bard, Faulkner and
  White **(in hand)** section 1.1.5 "Current as an Expression of Reaction Rate" (page
  6) and section 1.5 "Cell Resistance and the Measurement of Potential" (page 34);
  Winter and Brodd **(in hand)** section 2.2 "Electrical conduction in electrolytic
  solutions follows Ohm's law" and Figure 12 "Voltage levels in the various sections
  of the unit cell".

### 4.3 What potential means for an electron in an electrode: electron energy, the Fermi level
- Raising an electrode's potential lowers the energy of its electrons; "potential as
  an expression of electron energy"; the Fermi level; why a more negative electrode is a
  stronger reducing agent.
- Sources: Bard, Faulkner and White **(in hand)** section 1.1.4 "Potential as an
  Expression of Electron Energy" (page 6), section 2.2.5 "Fermi Energy and Absolute
  Potential" (page 88), and 2.2.5(b) "Equivalence of Fermi Level and Electrochemical
  Potential of Electrons". Goodenough and Park **(in hand)** Figure 2 and the text on
  mu_A, mu_C and the electrolyte window.

### 4.4 Where the potential difference actually sits: the interface and the double layer
- A transition in electric potential occurs when crossing from one conducting phase to
  another, in a narrow zone at the interface; the cell voltage is the sum of the
  interfacial potential differences around the cell; the electrical double layer;
  the double layer as a capacitor; Helmholtz, Gouy-Chapman and Stern pictures;
  charging current.
- Sources: Bard, Faulkner and White **(in hand)** section 1.1.2 "Interfacial Potential
  Differences and Cell Potential" (page 4), section 1.6 "The Electrode/Solution
  Interface and Charging Current" (page 41; 1.6.3 "Brief Description of the Electrical
  Double Layer", page 42), section 2.2.2 "Interactions Between Conducting Phases"
  (page 82), chapter 14 "Double-Layer Structure and Adsorption" (14.3 models, pages 606
  to 617). Winter and Brodd **(in hand)** Figure 12 (the double layers differ at the two
  electrodes) and section 4.2 on the double layer in supercapacitors.

### 4.5 The electrochemical potential: how chemistry and electricity combine
- The electrochemical potential of a species as chemical potential plus charge times
  the inner potential; equilibrium across an interface as equality of electrochemical
  potentials; the Nernst equation as a consequence; why the cell voltage equals the
  difference in electron electrochemical potential divided by the charge (which is
  Goodenough's V_OC = (mu_A - mu_C)/e).
- Sources: Bard, Faulkner and White **(in hand)** section 2.2.4 "Electrochemical
  Potentials" (page 85) and 2.1.3 "Free Energy and Cell emf" (page 64); Goodenough and
  Park **(in hand)** eq. 6; Winter and Brodd **(in hand)** section 1.3.

### 4.6 How ions move in the electrolyte: migration, diffusion, convection, electroneutrality
- The three modes of mass transfer; the Nernst-Planck equation; migration as motion in
  the field, diffusion as motion down a concentration gradient; mobility and
  conductivity; electroneutrality in the bulk, so the field in the bulk electrolyte is
  small and most of the potential drop sits at the interfaces; transference numbers.
- Sources: Bard, Faulkner and White **(in hand)** section 1.3.1 "Modes of Mass
  Transfer" (page 24), section 4.1 "General Mass-Transfer Equations" and 4.2
  "Migration in Bulk Solution" (page 185 onward), section 2.3.3 "Conductance,
  Transference Numbers, and Mobility" (page 92); Boz et al. 2021 **(in hand)**
  equations 1 to 4 (Nernst-Planck flux, current density from flux, mass balance,
  Gauss's law); Winter and Brodd **(in hand)** section 2.2 on conductivities.

### 4.7 Smaller gaps noticed in the text
- The mole, the Faraday constant as one mole of electron charges, and the electron-volt
  are used before they are defined.
- "Electrochemical potential", "LUMO/HOMO", "band", "SEI", "intercalation" appear
  before they are introduced; each needs its own first sentence and a glossary entry.
- The story spine ("follow one ion") is announced in the hero and then not used: no
  figure follows a single ion, and modules 1 to 5 never say where the ion is now.
- The connection between modules is one sentence each; a first-year reader needs a
  short "where we are" recap at the start of each module and a "what this lets us do
  next" at the end.
- Module 5 uses "polarization" and "overpotential" as if known; the Butler-Volmer
  paragraph in "Go deeper" is too compressed to be readable.
- No worked numerical example anywhere except the calculator. Each module should
  have one, with units, done step by step.

## 5. Figure standard for the rework (every rebuilt figure must meet all of these)

1. It teaches one mechanism, named in its title, and the reader is told where to look
   first, second and third (numbered callouts that light up in sequence, or a step
   button "1 / 2 / 3").
2. Every moving thing has a cause that is visible in the figure (a field arrow, a
   concentration gradient, a switch, a reaction event), not just a loop.
3. Every quantity drawn has a unit and, where the source gives one, a number.
4. The potential (or electron energy) profile is drawn wherever the concept is voltage,
   field or interface: a strip under the figure showing potential against position,
   with the drops at the interfaces.
5. The same amber ion is followed by name ("our ion") wherever the figure has ions.
6. Legible at 360 px: labels at 12 px minimum in the 520-unit viewBox, no overlaps,
   checked by screenshot.
7. Controls: play/pause and step for every animation; sliders labelled with units;
   a reset for predict-then-reveal.
8. Caption: what the figure is based on (source, figure or equation number), what is
   computed and what is schematic, and one "try this" prompt that names what to notice.
9. Reduced-motion frame is the most informative single frame, with the callouts visible.
10. A review row with the owner's initials before it ships.

## 6. Revised Act A for a first-year reader (proposal, to confirm with the owner)

- **Module 0, Charge, field, potential, voltage.** Two charges and the force between
  them; the field as force per unit charge with field arrows the reader can probe;
  potential energy of a charge moved against the field; potential as energy per charge
  and voltage as a difference; conductors: charge on the surface, one potential inside;
  a wire between two terminals: surface charges set up a field along the wire and
  electrons drift; current, resistance, Ohm's law, power; the electron-volt; the mole
  and the Faraday constant. Figures: Coulomb force slider; field probe; potential hill;
  the wire with surface charges and drifting electrons; a potential-along-the-wire strip.
- **Module 1, What a battery does.** The Daniell cell rebuilt: reaction events at both
  electrodes, migration of the named ions, the separator, a voltmeter, the lamp, and a
  potential-against-position strip that shows the two interfacial drops and the flat
  bulk (Bard, Faulkner and White 1.1.2; Winter and Brodd Fig. 12). Why the electrons
  take the wire and why the ions take the liquid, with the field drawn in both.
- **Module 2, Anatomy of a cell.** As now but with a real cross-section, the electrolyte
  visible in the pores, and the potential strip reused.
- **Module 3, Where the voltage comes from.** Electron energy and the Fermi level
  (BFW 1.1.4, 2.2.5); the electrochemical potential (BFW 2.2.4); the double layer at
  each interface (BFW 1.6.3, ch. 14) and why the potential jumps there; the cell
  voltage as the sum of the jumps; then the ladder, corrected; then the electrolyte
  window; then oxides versus sulfides; then dG = -nFE with the Daniell worked example.
- **Module 4, Capacity, energy and power.** As now, with error 3 fixed and a worked
  example per figure.

Then Act B as planned, each module rebuilt to the same standard before moving on.
