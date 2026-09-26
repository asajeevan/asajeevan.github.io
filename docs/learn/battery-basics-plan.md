# Plan: "Battery basics" learning section for asajeevan.github.io

## 1. Goal and audience

Add a self-contained, illustrated explainer that takes a reader from "what is a battery" to
the concepts behind your own research (solid polymer electrolytes, organic electrodes,
lithium metal, diagnosis). It should:

- work for a curious non-scientist in the first half and a first-year science student
  in the second half;
- back every factual statement with a citation to a well-known textbook or a
  reputable peer-reviewed article (see section 8), so the page can be trusted and
  used for teaching;
- reuse the site's existing visual language (dark teal, amber ions, cyan electrolyte,
  schematic SVG figures animated with GSAP, "Schematic, not experimental data" honesty);
- act as a bridge into the research section, so recruiters and students understand
  why your work matters;
- stay fast and accessible (no external libraries beyond what the site already ships,
  reduced-motion and print fallbacks like the rest of the site).

## 2. Where it lives: a separate page, not more sections on the home page

Recommendation: a new page at `/batteries/` (file `batteries/index.html`), reachable
from the top navigation as "Learn".

Why not add sections to `index.html`:

- The home page is already 249 KB with 9 inline SVG figures, 12 sections and the GSAP
  library inlined twice. Your latest commit was specifically about reducing its size.
- Twelve more teaching modules would double the scroll length and bury Publications
  and Contact, which are what most visitors to a portfolio want.
- A separate URL is shareable on its own (LinkedIn, teaching, outreach) and can carry
  its own title, description and structured data for search engines.

What the home page gets instead: a "Learn" link in the nav, a short teaser card near
the About or Research section ("New to batteries? Start here"), and links from the
research scenes back to the relevant module ("what is a polymer electrolyte?").

## 3. Enabling step: share styles and scripts between pages (Phase 0)

Today everything (CSS, GSAP, ScrollTrigger, page script) is inline in `index.html`.
A second page needs the same look, so first extract:

| Move out of index.html | To | Notes |
|---|---|---|
| The `<style>` block | `assets/css/site.css` | Page-specific rules (hero cell, map) can stay inline or move too. |
| GSAP and ScrollTrigger minified sources | `assets/js/gsap.min.js`, `assets/js/scrolltrigger.min.js` | Same versions as now, no CDN, keeps the site self-hosted. |
| Shared behaviour (topbar, progress bar, mobile menu, reveals, reduced-motion fallback) | `assets/js/site.js` | Home-page-only animations stay in an inline script on the home page. |

Verification: render the home page before and after with the existing Playwright
screenshot routine at desktop and phone widths, in normal and reduced-motion modes,
and compare. No visual change is the acceptance criterion.

Fallback if you would rather not touch the home page: the new page ships its own copy
of the CSS subset it needs. It works, but the two pages will drift apart over time.

## 3b. Supplied primary sources: the backbone of the text

You supplied the full text of three articles. They are now the first-choice source for
every module, and their bibliographic details are confirmed from the supplied copies:

| Key | Article | What it gives the page |
|---|---|---|
| R1 | M. Winter, R. J. Brodd, "What Are Batteries, Fuel Cells, and Supercapacitors?", Chem. Rev. 2004, 104, 4245-4269, DOI 10.1021/cr020730k | Formal definitions (battery, primary, secondary, anode, cathode, active mass, electrolyte, separator, open- and closed-circuit voltage, Faraday constant, thermal runaway); thermodynamics (Gibbs energy, Nernst, Faraday's law, entropic and Joule heat); kinetics (activation, ohmic and concentration polarization, Butler-Volmer, Tafel); the typical discharge curve; impedance signatures; porous composite electrodes; common commercial systems with nominal voltages; electrode reaction mechanisms; selection criteria for commercial cells. |
| R6 | J. B. Goodenough, K.-S. Park, "The Li-Ion Rechargeable Battery: A Perspective", J. Am. Chem. Soc. 2013, 135, 1167-1176, DOI 10.1021/ja3091438 | Cell figures of merit (polarization, storage efficiency, rate-dependent capacity, Coulombic efficiency, cycle life to 80 %, energy as the integral of voltage over charge); open-circuit voltage as the difference of electrode electrochemical potentials; the electrolyte window (HOMO/LUMO) and why the SEI forms; the history and materials of Li-ion (TiS2, LiCoO2, graphite, spinel, olivine LiFePO4, lithium titanate); requirements for solid electrolytes; lithium metal, sodium, sulfur and air strategies. |
| R2 | J.-M. Tarascon, M. Armand, "Issues and challenges facing rechargeable lithium batteries", Nature 2001, 414, 359-367, DOI 10.1038/35104644 | Why lithium (most electropositive, lightest metal); the rocking-chair concept and its history; dendrites; the voltage-versus-capacity map of electrode materials; capacities of graphite, LiCoO2 and LiFePO4; alloy and conversion negative electrodes; liquid, dry polymer, plasticized and gel polymer electrolytes with their conductivities and the LiTFSI story; the electrode-electrolyte interface as the seat of lifetime loss; in situ characterization. |

Rules for using them:

- Wherever one of these three articles supports a statement, cite it first; add another
  source only for material they do not cover (organic electrodes, ageing diagnostics,
  recycling, modern solid-state work).
- Quote numbers exactly as printed, with the condition attached in the source (rate,
  temperature, cut-off, "theoretical" or "practical"), and with the article's date when
  the number is a snapshot (market shares, "state of the art" values from 2001, 2004
  or 2013). Never silently update a figure from memory; a newer number needs a newer
  verified source.
- The fuel-cell and supercapacitor sections of R1 are used only for the one-paragraph
  comparison in module 1.
- The reference lists of the three articles give full bibliographic details for the
  landmark papers named in the text. Those details are cross-checked in section 8 and
  still go through DOI resolution before publication.

## 4. Curriculum: twelve modules, from zero to your research

Each module is one screen-height "scene" using the existing `scene-grid` layout: text on
one side, a figure on the other, a highlighted key idea (the existing `.lesson` style), and
an optional "Go deeper" expandable panel (the existing `details.tile` pattern) for the
student-level material. Target 200 to 350 words of main text per module.

### Part A: The very basics (no prior knowledge)

**1. What a battery does**
Stored chemical energy is turned into electrical energy on demand, and back again when
charging. Two materials that "want" to react are kept apart; the reaction can only
proceed if electrons travel through the outside wire, which is what powers the device.
- Figure: the simplest cell (two electrodes in an electrolyte with a bulb). Animation:
  electrons move along the wire, ions move through the liquid, the bulb lights.
- Key idea: a battery is a controlled chemical reaction that is only allowed to happen
  through a wire.
- Go deeper: cell versus battery (a battery is several cells), primary versus
  rechargeable.
- Sources: Linden's Handbook of Batteries, ch. 1 [B1]; Winter and Brodd, Chem. Rev. 2004 [R1].
- From the supplied articles: a battery is "one or more electrically connected
  electrochemical cells having terminals to supply electrical energy"; strictly, a single
  unit is a cell and a connection of cells is a battery [R1, section 1.2 and footnote 1].
  A primary battery is assembled charged and used once; a secondary battery is restored
  by a current in the opposite direction and is usually assembled discharged, so it must
  be charged before first use [R1, 1.2]. The electrolyte "conducts the ionic component of
  the chemical reaction between the anode and the cathode, but it forces the electronic
  component to traverse an external circuit where it does work" [R6, Electrochemical
  Cells]. Batteries are closed systems with the active masses inside; fuel cells are open
  systems fed from outside; supercapacitors store charge in electrical double layers
  [R1, 1.1]. Batteries and fuel cells are not subject to the Carnot limit [R1, 1.1].
  Figure basis: the Daniell cell of R1, Figure 1.

**2. Anatomy of a cell**
Negative electrode, positive electrode, electrolyte, separator, current collectors,
casing. Why the electrolyte must conduct ions but not electrons. The anode/cathode
naming confusion, explained once: the names swap with direction, so this site says
"negative electrode" and "positive electrode".
- Figure: exploded coin cell and a pouch cell side by side, parts labelled on hover/tap.
- Key idea: every part has one job, and the electrolyte's job is to let ions through
  and block electrons.
- Sources: Linden's Handbook, ch. 1 and 3 [B1]; Winter and Brodd [R1]; Murray, Hall and Dahn on coin cells [R21].
- From the supplied articles: the anode is "the negative electrode of a cell associated
  with oxidative chemical reactions that release electrons into the external circuit"; the
  cathode is the positive electrode associated with reduction [R1, 1.2]. The negative
  electrode is a good reducing agent (lithium, zinc, lead) and the positive one an electron
  acceptor (lithium cobalt oxide, manganese dioxide, lead oxide) [R1, 2.2]. The
  separator is a physical barrier permeable to ions and inert in the cell; if the electrodes
  touch, the full stored energy is released as heat inside the cell [R1, 1.2 and 2.2].
  Because ionic mobility in the electrolyte is much smaller than electronic conductivity
  in a metal, cells use large-area electrodes separated by a thin electrolyte, with metallic
  current collectors [R6]. Practical electrodes are composites of active particles,
  conductive diluent and polymer binder on a current collector, typically about 30 %
  porous [R1, 1.6]. Cell formats: cylindrical, coin, prismatic and thin flat cells; the
  plastic Li-ion format contains no free electrolyte [R2, Fig. 4; R1, Fig. 20]. Nominal
  voltages of common systems for the anatomy table: alkaline 1.5 V, zinc-air 1.2 V,
  lead-acid 2.0 V, Ni-Cd and Ni-MH 1.2 V, Li-ion 4.0 V [R1, Table 2].

**3. Where the voltage comes from**
Different materials hold electrons at different energies. The voltage of a cell is the
difference between its two electrodes. Lithium sits at the bottom of the ladder, which is
why lithium batteries reach 3 to 4 volts while older chemistries reach 1.2 to 2 volts.
- Figure: a "potential ladder" (vertical axis in volts versus Li/Li+) with lithium metal,
  graphite, lithium titanate, LFP, NMC, and your organic materials placed on it. The
  cell voltage is drawn as the gap between two chosen rungs; the reader can pick pairs.
- Key idea: voltage is a property of the pair of materials, not of the size of the cell.
- Go deeper: standard electrode potentials, why Li/Li+ is used as the reference in
  battery papers, what "vs Li/Li+" means on your plots.
- Sources: Bard and Faulkner, ch. 1 and 2 [B2]; Atkins' Physical Chemistry, electrochemistry chapters [B4]; Goodenough and Kim, Chem. Mater. 2010 [R3]; Whittingham, Chem. Rev. 2004 for the material potentials [R4].
- From the supplied articles: the open-circuit voltage is the difference between the
  electrochemical potentials of the anode and the cathode, V_OC = (μ_A - μ_C)/e [R6 eq. 6]; in thermodynamic
  terms, the available electrical energy is -nFE, so the voltage is set by the reaction
  free energy [R1, 1.3, with the Nernst equation]. Lithium is, in R2's words, the most electropositive
  metal, that is, the metal with the most negative standard electrode potential (-3.04 V
  versus the standard hydrogen electrode) and the lightest (6.94 g/mol,
  density 0.53 g/cm3) [R2]. The voltage is capped by the electrolyte window, the gap
  between the electrolyte's LUMO and HOMO: an aqueous electrolyte is thermodynamically
  stable over 1.23 V and kinetically to about 2 V [R1, 2.2], giving a practical maximum of
  about 1.5 V for a long shelf life [R6]; the carbonate electrolytes of Li-ion cells have a
  practical HOMO about 4.3 eV below the lithium potential [R6] and are limited to about
  4.6 V [R1, 2.2]. Rungs for the potential ladder, all versus Li/Li+: graphite about
  0.2 V, lithium alloys 0.2 to 0.8 V, lithium titanate 1.5 V, TiS2 about 2.2 V, LiFePO4
  3.5 V, LiCoO2 about 4.0 V, LiNi0.5Mn1.5O4 about 4.75 V [R6]; sulfur 2.4 V and thiolate
  couples up to 3 V [R2]. Why oxides beat sulfides: the top of the S-3p band lies about
  2.5 eV below the lithium potential, the O-2p band about 4.0 eV, so oxide cathodes reach
  about 4 V [R6]. Polyanions (phosphate, sulfate) raise redox potentials through the
  inductive effect [R6; R2]. Figure basis: R2, Figure 5 (voltage versus capacity map).

**4. Capacity, energy and power**
Capacity (how many electrons, in mAh) comes from how much active material there is and
how many electrons each formula unit can exchange. Energy (Wh) is capacity times voltage.
Power is how fast that energy can be delivered. Specific (per kg) versus volumetric
(per litre).
- Interactive: a small calculator. Pick a material (or type a molar mass and number of
  electrons) and see the theoretical specific capacity from Faraday's law
  (Q = n F / 3.6 M), then multiply by a chosen voltage to get Wh/kg. Preloaded examples:
  graphite, LFP, lithium metal, a lithiated organic. This links naturally to your
  electrochem-toolkit.
- Key idea: light elements and many electrons per formula unit give high capacity;
  high voltage turns capacity into energy.
- Go deeper: Ragone diagram (energy versus power) as a schematic, why phones and
  drills need different cells.
- Sources: Faraday's law and definitions from Bard and Faulkner [B2] and Linden's Handbook, ch. 1 [B1]; Ragone concept from Winter and Brodd [R1]; material values from Nitta et al., Materials Today 2015 [R5].
- From the supplied articles: the Faraday constant is 96 485.3 C per equivalent, or
  26.8015 Ah per equivalent, and Faraday's law (mass transformed = I t M / nF) has "no
  known exceptions" [R1, 1.2 and 1.3]. nF is the capacity factor and E the intensity
  factor of a cell reaction [R1, 1.3]. Specific energy is Wh/kg, energy density Wh/L,
  specific power W/kg and power density W/L; the Ragone plot compares them, with
  supercapacitors as high-power and batteries as intermediate systems [R1, 1.1]. Stored
  energy is the integral of voltage over charge, and the capacity Q(I) falls at high
  current because ion transfer becomes diffusion-limited [R6, eq. 5]. As a rule of
  thumb the practical energy of a rechargeable battery is about 25 % of its theoretical
  value (over 50 % for primary cells), because of inert parts, internal resistance and
  incomplete utilization [R1, 1.1]; a 30 Wh/kg lead-acid battery powers a 60 W lamp for
  half an hour per kilogram [R1, footnote 3]. Calculator check values: graphite 372 mAh/g
  theoretical for LiC6, referred to the mass of carbon (C6, 72.07 g/mol), about 350
  practical [R2]; LiCoO2 about 140 mAh/g practical at a 4.2 V cut-off;
  LiFePO4 170 mAh/g theoretical [R6]; R2 states that LiFePO4 "can presently be used at
  90 % of its theoretical capacity" and quotes 165 mAh/g in the same sentence, so the page
  cites the theoretical value from R6 and the 90 % utilization from R2 without presenting
  165 as a measured practical value; the 1991
  Sony cell gave over 3.6 V and 120 to 150 Wh/kg [R2]. Current or run time scales with
  electrode area or parallel cells; voltage with cells in series [R6].

### Part B: How a rechargeable battery behaves

**5. Charging and discharging: reading a voltage curve**
What a galvanostatic charge/discharge curve is, what a plateau versus a slope means,
cut-off voltages, C-rate, why the charge curve sits above the discharge curve
(overpotential), Coulombic efficiency, cycle life.
- Interactive: the hero's charge/discharge loop, now with a C-rate slider. Faster rate
  widens the gap between the branches and shortens the accessible capacity. A second
  toggle shows a flat-plateau material against a sloping one.
- Key idea: the gap between charge and discharge is energy lost as heat; the shrinking
  width over cycles is ageing.
- Go deeper: how to read the "specific capacity versus cycle number" plots in papers.
- Sources: Huggins, Advanced Batteries [B3] for the thermodynamics of plateaus and slopes; Newman and Balsara, Electrochemical Systems [B5] for overpotential and rate; Linden's Handbook, ch. 3 [B1] for C-rate and cut-off conventions.
- From the supplied articles: with an internal resistance Rb, the discharge voltage is
  Voc - I Rb and the charge voltage Voc + I Rb, so the gap between the branches is the
  polarization [R6, eqs. 1 and 2]. Polarization has three parts: activation (charge
  transfer at the interfaces, builds up in 1e-4 to 1e-2 s), ohmic (instantaneous, Ohm's
  law) and concentration (mass transport, 1e-2 s or slower) [R1, 1.4]; electrode
  reactions with exchange current densities around 1e-2 A/cm2 are favoured [R1, 1.4].
  Figure basis: the typical discharge curve with the three polarization contributions
  [R1, Figure 6]. Plateaus and slopes follow the Gibbs phase rule: a two-phase reaction
  gives a constant voltage, a single-phase reaction a sloping one [R1, 2.4 and Figure
  16]; LiFePO4 is two-phase and flat, LiMn2O4 shows steps at 4 V and a drop to 3 V
  [R6, Figures 5 and 6]. Capacity at high rate is a reversible loss; volume change,
  electrode-electrolyte reactions and decomposition give irreversible loss; Coulombic
  efficiency and cycle life (cycles until 80 % of initial capacity) are defined from these
  [R6]. A commercial rechargeable cell must survive at least 300 full cycles with less than
  20 % loss; most cells need 3 to 8 h to charge, and fast charging shortens cycle life
  [R1, 2.6]. Flat curves suit electronics, sloping ones make state of charge easy to read
  [R1, 2.6]. Heat: an entropic term from dE/dT plus irreversible Joule heat [R1, 1.3].

**6. Inside a lithium-ion cell: the rocking chair**
Lithium ions shuttle between two host structures (graphite and a layered oxide) without
either host changing much. Intercalation. The SEI layer that forms on graphite during the
first cycles and why "formation" exists.
- Figure: animated cross-section in the hero style, ions rocking between layered hosts;
  a second state shows the same cell charging.
- Key idea: nothing is consumed in an ideal Li-ion cell; ions only change address.
- Sources: Tarascon and Armand, Nature 2001 [R2]; Goodenough and Park, JACS 2013 [R6]; Peled, JES 1979 [R7] and Peled and Menkin, JES 2017 [R8] for the SEI; Nobel Prize 2019 scientific background [R9].
- From the supplied articles: electrochemical insertion is a solid-state redox reaction
  in which guest ions enter a host that conducts both ions and electrons; insertion
  electrodes are highly reversible because structure and shape are preserved, and the
  word intercalation is used for layered hosts [R1, 2.4 and footnote 4]. The Li-ion or
  rocking-chair cell replaced lithium metal by a second insertion material; the concept
  was demonstrated by Murphy and by Scrosati and commercialized by Sony in June 1991 as
  C/LiCoO2 [R2]. Timeline for the figure: intercalation chemistry (Rouxel, Schollhorn,
  1970), Whittingham's TiS2/Li cell at 2.2 V (1976), Goodenough's LiCoO2 at about 4 V
  (1980), Yazami's graphite anode, Yoshino's first LiCoO2/C cell [R6; R2]. The cell is
  built discharged; on the first charge the graphite potential (about 0.2 V versus Li)
  lies above the electrolyte LUMO, so a passivating, Li+-permeable SEI forms and consumes
  lithium from the cathode irreversibly, adds interfacial impedance and evolves with
  cycling [R6]. Only ethylene carbonate forms this protective layer on graphite, so it
  is in almost all commercial electrolytes [R2]; the SEI is electronically insulating
  and selectively conducts Li+ [R1, 2.4]. LiCoO2 is cycled to about 4.2 V and 0.5 Li
  for safety; beyond x = 0.55 it evolves oxygen [R2; R6]. Lithium titanate at 1.5 V
  forms no SEI and lasted 30 000 cycles at 5C [R6].

**7. The electrolyte: liquid, polymer or ceramic**
What the electrolyte has to do (conduct Li+, block electrons, survive the voltage window,
wet the electrodes). Liquid electrolytes today. Why solid electrolytes are pursued
(safety, lithium metal). Polymer electrolytes: Li+ is carried by moving polymer segments,
which is why they work better warm. Ceramic electrolytes: high conductivity, brittle
interfaces. Transference number in one sentence.
- Figure: three-panel comparison (liquid, polymer, ceramic) with the same ion moving
  differently in each; polymer panel reuses the chain animation from the hero.
- Key idea: an electrolyte is judged on conductivity and on the interfaces it makes,
  and the second is usually the harder problem.
- Go deeper: ionic conductivity numbers, Arrhenius versus VFT temperature behaviour,
  the "soft solid" idea behind your thesis.
- Sources: Xu, Chem. Rev. 2004 and 2014 [R10, R11] for liquid electrolytes and interphases; Fenton, Parker and Wright, Polymer 1973 [R12] and Armand, Solid State Ionics 1983 [R13] for the origin of polymer electrolytes; Hallinan and Balsara, Annu. Rev. Mater. Res. 2013 [R14] and Mindemark et al., Prog. Polym. Sci. 2018 [R15] for polymer electrolytes beyond PEO; Janek and Zeier, Nature Energy 2016 [R16] and Manthiram et al., Nat. Rev. Mater. 2017 [R17] for solid-state.
- From the supplied articles: an electrolyte "provides pure ionic conductivity between
  the positive and negative electrodes" [R1, 1.2]. Aqueous electrolytes conduct about
  1 S/cm; organic ones 1e-2 to 1e-3 S/cm, with lower solvating power and ion pairing
  [R1, 2.2]. Li-ion cells use LiPF6 in ethylene carbonate with linear carbonates
  [R1, Table 2]. The nonaqueous window is thermodynamically about 3.5 V but kinetically
  usable to 5.5 V [R2]. LiTFSI conducts well and is safe but corrodes aluminium above
  4 V unless a passivating salt is added [R2]. Polymer electrolytes: in dry PEO the ions
  move assisted by the motion of the chains; the Li solid polymer electrolyte battery
  needs up to 80 C; lightly plasticized (10 to 25 % additive) gains an order of
  magnitude in conductivity and still suits lithium metal, gels (60 to 95 % liquid) are
  only 2 to 5 times less conductive than the liquid but need a Li-ion configuration;
  switching from LiCF3SO3 to LiTFSI in PEO gains an order of magnitude; 10 % nanofillers
  raise conductivity at 60 to 80 C, lift the lithium transport number from about 0.3 to
  about 0.6 and give a stable interface with lithium [R2, Figure 8 and text]. Solid
  electrolyte requirements: conductivity above 1e-4 S/cm, blocking dendrites without
  being reduced, chemical stability, and a robust flexible thin membrane, which points to
  ceramic-polymer composites; garnet Li7-xLa3Zr2-xTaxO12 exceeds 1e-3 S/cm and is stable
  against lithium; inorganic solid electrolytes with solid electrodes lose contact as
  the electrodes change volume [R6]. Figure basis: R2, Figure 3 (dry, gel and porous
  membranes) and Figure 8 (conductivity versus temperature).

**8. Electrodes are composites**
An electrode is not a block of active material: it is particles of active material,
conductive carbon and a binder, coated on a current collector. Why the carbon network,
why porosity, why the binder matters, why processing (solvent, drying, calendering)
changes performance. Where your "same polymer as binder and electrolyte" idea fits.
- Figure: zoom from a pouch cell to a coating to a single particle, showing electron
  path (carbon) and ion path (pore or polymer) both needing to reach the particle.
- Key idea: a particle that the electrons or the ions cannot reach contributes nothing.
- Sources: Kraytsberg and Ein-Eli, Adv. Energy Mater. 2016 [R18] on slurry and electrode preparation; Hawley and Li, J. Energy Storage 2019 [R19] on electrode manufacturing; Newman and Balsara [B5] on porous-electrode theory (Go deeper only); your ACS Applied Polymer Materials 2024 article for the shared-binder concept.
- From the supplied articles: most electrodes are porous composites of active particles,
  a conductive diluent (carbon or metal powder) and a polymer binder on a current
  collector, about 30 % porous, so the reacting surface is far larger than the geometric
  area [R1, 1.6]. Reaction sites extend into the electrode; what decides where the
  current flows are the conductivities of the matrix and the electrolyte, the exchange
  current, diffusion, thickness, porosity, pore size and tortuosity; a nonuniform
  current distribution wastes active material [R1, 1.6]. A poorly conducting active
  material such as MnO2 works only where it touches the carbon additive, and utilization
  spreads from that contact [R1, 2.4]. LiFePO4 needed carbon coating and nanosizing to
  overcome poor electronic conductivity; coated nanoparticles lower tap density and
  therefore volumetric energy density, and uniform coverage gets harder as particles
  shrink [R6]; aerogel electrodes pay the same penalty at about 0.2 g/cm3 [R2]. Alloy
  electrodes crack and lose contact unless a buffer matrix preserves the electrical
  pathway [R2].

### Part C: Beyond today's lithium-ion, and why batteries fail

**9. Lithium metal, sodium and organic electrodes**
Why lithium metal is the ultimate negative electrode and why it is hard (dendrites,
plating and stripping efficiency). Sodium-ion as the abundant cousin. Organic electrode
materials: made from carbon, hydrogen, oxygen and nitrogen, tunable, recyclable, lighter,
with their own challenges (dissolution, conductivity, voltage). This is where your
research is introduced with links to the Research section.
- Figure: material family tree (inorganic intercalation, conversion, metal, organic)
  with your materials highlighted.
- Key idea: the next battery is a materials problem before it is an engineering problem.
- Sources: Xu et al., Energy Environ. Sci. 2014 [R20] and Cheng et al., Chem. Rev. 2017 [R22] for lithium metal; Yabuuchi et al., Chem. Rev. 2014 [R23] for sodium-ion; Poizot et al., Chem. Rev. 2020 [R24], Lu and Chen, Nat. Rev. Chem. 2020 [R25] and Esser et al., J. Power Sources 2021 [R26] for organic electrodes; Armand and Tarascon, Nature 2008 [R27] for the sustainability argument.
- From the supplied articles: lithium metal cells would have the highest energy of all
  systems, but mossy and dendritic redeposition limits cycle life to about 100 to 150
  cycles against the 300 required commercially and raises safety risk [R1, 2.5];
  dendrites were imaged in situ by SEM [R2, Figure 2a]. The SEI that forms with ethylene
  carbonate passes Li+ but prevents uniform plating [R6]. Lithium is still used in
  half-cells to evaluate cathodes [R6]. Routes around dendrites: dioxolane/LiAsF6
  electrolytes, sputtered glassy electrolytes with 50 000 cycles, lithium-free thin-film
  cells, protective coatings [R2]; a solid separator that blocks dendrites [R6]. Silicon
  expands about 300 % and alloys up to 200 % on lithiation [R6; R2]; conversion oxides
  (Poizot et al., 2000) store two to three times the capacity of carbon by forming metal
  nanoparticles and Li2O [R2]. Sodium: Na+ needs a larger interstitial volume than a
  close-packed oxide offers, which is why Na-ion is harder; the sodium-sulfur battery runs at
  300 to 350 C, and the ZEBRA cell is its NaCl/Fe variant [R6]. Organics in the supplied texts: reversible S-S bond cleavage to
  thiolates up to 3 V, held back by low density and dissolution [R2]; Goodenough's
  closing call for "organic multiple-electron redox centers" [R6]. The organic-electrode
  module proper rests on R24 to R26 and your own papers, which the supplied articles do
  not cover.

**10. Why batteries age**
Loss of lithium inventory (SEI growth, plating), loss of active material (cracking,
dissolution), resistance rise (contact loss, thick interfaces). Calendar versus cycle
ageing. Temperature. What "80 % of initial capacity" as end of life means.
- Figure: a schematic capacity-fade curve with the three loss mechanisms as stacked
  shaded contributions the reader can toggle on and off.
- Key idea: a battery rarely dies of one cause; diagnosis is separating them.
- Sources: Vetter et al., J. Power Sources 2005 [R28]; Birkl et al., J. Power Sources 2017 [R29] for the three degradation modes; Edge et al., PCCP 2021 [R30] as the plain-language overview.
- From the supplied articles: reversible loss is diffusion-limited capacity at high
  rate; irreversible loss comes from electrode volume change, electrode-electrolyte
  reactions and electrode decomposition; the first-charge SEI loss is distinguished from
  fade on cycling; cycle life is defined at 80 % of initial capacity [R6]. "Poor cell
  lifetimes are rooted mainly in side reactions occurring at the electrode-electrolyte
  interface" [R2]. Examples: Mn(II) dissolving from spinel and poisoning the anode SEI
  [R6]; alloy particles disintegrating and losing electrical contact [R2]. Self-discharge
  rises with temperature; Ni-MH can lose up to 30 % per month, while Li-MnO2 primaries
  keep 90 % after 8 years [R1, 2.6]. Overcharge or overdischarge drives irreversible
  reactions and new compounds that reduce capacity [R1, 2.6].

**11. How batteries are tested and diagnosed**
Cell formats used in research (coin, Swagelok, pouch) and why results differ between
them. The main techniques in one line each: galvanostatic cycling, cyclic voltammetry,
impedance spectroscopy, GITT, post-mortem analysis. What a Nyquist plot roughly tells you.
Links to your Techniques section.
- Figure: "one cell, four measurements" panel with a schematic result for each.
- Key idea: every technique answers one question; choosing the question comes first.
- Sources: Murray, Hall and Dahn, JES 2019 [R21] for cell building; Elgrishi et al., J. Chem. Educ. 2018 [R31] for cyclic voltammetry; Weppner and Huggins, JES 1977 [R32] for GITT; Orazem and Tribollet [B6] or Lasia [B7] for impedance; Bard and Faulkner [B2] throughout.
- From the supplied articles: the discharge curve gives capacity, the effect of rate and
  temperature, and state of health [R1, 1.5]. Impedance: activation shows as a
  semicircle, diffusion as a 45 degree Warburg line, ohmic parts are frequency-independent;
  the semicircle's peak frequency gives the relaxation time RC; practical cells show
  farads and milliohms [R1, 1.5 and Figure 7]. Current interruption separates the
  polarizations by their time scales [R1, 1.4]. Measuring voltage against temperature
  yields the thermodynamic quantities of the electrode reaction [R1, 1.3]. Charge-
  discharge and impedance are nondestructive; tear-down analysis uses Raman, AFM, NMR,
  TEM and XAS; accelerated rate calorimetry finds thermal-runaway conditions [R1, 1.5].
  Post-mortem versus in situ: plastic Li-ion cells opened the way to in situ XANES, NMR,
  Mossbauer and SEM [R2]. Lithium half-cells are the standard way to evaluate a cathode
  [R6].

**12. Safety, use and end of life**
Thermal runaway in plain terms, what a battery management system does, everyday
habits that extend battery life (partial charging, avoiding heat), and recycling and
material recovery, linking to your recovery work.
- Figure: state-of-charge and temperature "comfort zone" chart.
- Key idea: most battery lifetime is decided by temperature and state of charge, not by
  the number of cycles alone.
- Sources: Feng et al., Energy Storage Materials 2018 [R33] for thermal runaway; Wang et al., J. Power Sources 2012 [R34]; Harper et al., Nature 2019 [R35] for recycling; Edge et al. [R30] and Vetter et al. [R28] for the effect of temperature and state of charge on lifetime.
- From the supplied articles: thermal runaway is "an event that occurs when the battery
  electrode's reaction with the electrolyte becomes self-sustaining and the reactions enter
  an autocatalytic mode" [R1, 1.2]; heat is released inside the cell at the electrode
  surfaces, so high-rate batteries must dissipate it [R1, 1.3]; a short circuit releases
  the full stored energy as heat [R1, 2.2]. Consumer cells operate at about 0 to 40 C and
  are stored between -20 and 85 C; a safe cell must not leak, vent or explode under mild
  abuse; LiCoO2 cells are protected against over- and under-voltage electronically [R1,
  2.6]. Al2O3-coated separators block dendrite penetration [R6]. Fast charging stresses
  the electrodes and shortens cycle life [R1, 2.6]. Lead-acid is one of the "greenest"
  systems because about 98 % of US lead-acid batteries are recycled (Battery Council
  International, cited in R1, 2.5). Everyday-habit advice beyond these points needs a
  separate verified source (open decision).

### Closing elements

- **Glossary**: 30 to 40 terms with one-sentence definitions, linked from the first use
  of each term in the modules (small dotted underline, tooltip on hover, anchor on tap).
- **Check yourself**: 8 to 10 multiple-choice questions, answered inline with a short
  explanation, no scoring server, no storage.
- **Further reading**: a short list of open textbooks and review articles you trust,
  plus a pointer to your publications. You supply and approve this list.

## 5. Page structure and design

```
batteries/index.html            (the story page)
batteries/theory/index.html     (the theory track, section 5d)
  header  (same topbar as home; "Learn" is the active item)
  hero    title "How batteries work", one-sentence promise, the switch of figure 1.1 as
          the first thing to touch, three reading modes (see 5c), and a link for readers
          who want to jump to the research
  chapter rail (sticky, drawn as a cell that charges as you read): Acts A, B, C, glossary
  12 modules, each <section class="section module" id="m01-what-a-battery-does">,
          each with hook, play figure, explanation, key idea, "you can now explain", bridge
  glossary, check-yourself, further reading
  footer (same as home)
```

Design rules to keep the two pages consistent:

- Same colour tokens and typography; ions are always amber, electrolyte always cyan,
  electrons a distinct third colour (suggest the existing light cyan-white used for
  the trace) so that a reader learns the code once.
- Every illustrative plot carries "Schematic, not experimental data".
- Every figure has a written caption that states the point of the figure, so the page
  still teaches with animations off, in print, or through a screen reader.
- Interactives are plain HTML controls (`input type="range"`, buttons) driving inline
  SVG with vanilla JavaScript; GSAP is used only for scroll-in and looping motion.
- Reduced motion: static final states, as the home page already does.
- Print stylesheet: figures static, interactives shown at their default state.

## 5b. Figure and animation catalogue

Principle: every module is taught by its figures first and its text second. Each figure
below is derived from a named source figure or equation (R1, R2, R6 or a verified
reference), is animated where motion explains the mechanism, and degrades to an accurate
static frame with a written caption when motion is off. About 45 figures in total, three to
five per module. Types: **S** static schematic, **A** looping or scroll-driven animation,
**I** interactive (reader controls it), **C** computed (the curve is calculated live from
the source equation, not hand-drawn).

The visual code is fixed across the whole page and matches the home page: Li+ amber dot
with light outline, electrons a distinct pale cyan-white dot, electrolyte cyan, active
material dark amber, conductive carbon teal dots, polymer chains cyan wavy lines, heat
red-orange, anions grey. A reader learns it once in module 1 and never has to re-read a
legend.

### Module 1: What a battery does

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 1.1 | A, I | The Daniell cell with a lamp | R1 Fig. 1 | Switch closes: zinc atoms leave the zinc electrode as Zn2+, electrons travel through the wire to the copper electrode where Cu2+ ions deposit, cations and anions migrate through the separator, the lamp lights. Switch opens: everything stops, the voltage stays. | Electrons flow from the negative to the positive electrode outside the cell; cations move toward the positive electrode inside, anions the other way; the zinc electrode visibly loses mass and the copper one gains. Cell voltage shown as 1.10 V: B2's table of standard potentials gives Cu2+/Cu +0.340 V and Zn2+/Zn -0.7626 V versus NHE, difference 1.103 V (verified). |
| 1.2 | A | Three cousins: battery, fuel cell, supercapacitor | R1 Figs. 1 and 2 | Side by side: the battery's active masses sit inside; the fuel cell's reactants stream in from tanks; the supercapacitor's ions line up at the electrode surfaces and relax back. | Only the fuel cell shows external reactant flow; the supercapacitor shows no redox reaction; all three show electron and ion paths separated, as R1 Fig. 1 requires. |
| 1.3 | S | Cell versus battery | R1 footnote 1; R6 | One cell, then cells in series (voltage adds) and in parallel (current and run time add). | Series adds voltage only, parallel adds capacity only; values labelled "n cells". |

### Module 2: Anatomy of a cell

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 2.1 | A, I | Exploded coin cell | R2 Fig. 4b; R1 sec. 1.2 definitions; R21 Fig. 1 for the stack order | Scroll pulls the stack apart: can, spring, spacer, lithium or graphite negative electrode, separator soaked in electrolyte, positive composite electrode on aluminium, can. Tap or hover on a part shows its one-line job quoted from R1. | Stack order correct for a coin cell; the separator is drawn porous and filled, not as a solid sheet; current collectors: copper for graphite and aluminium for the positive electrode, as drawn in R6 Figure 1 (the first Li-ion cell, graphite on Cu, LiCoO2 on Al) and consistent with R6's remark that aluminium can be used on the negative side only where lithium-aluminium alloying is avoided. The stack order follows Murray, Hall and Dahn's Figure 1 [R21, verified]: stainless-steel cap and gasket, spring, spacer, graphite negative electrode, separator, positive electrode, aluminium-coated can. |
| 2.2 | A | Unwinding the jelly roll | R1 Fig. 20; R6 | A cylindrical cell's electrode stack unwinds to reveal two thin coated foils and a thin separator: the reason is stated on screen, "ions move far more slowly than electrons, so cells use large-area electrodes and a thin electrolyte" [R6]. | Relative thicknesses labelled "not to scale" unless B1 supplies verified values. |
| 2.3 | S | Nominal voltages of common cells | R1 Table 2 | Bar chart of nominal voltage per system: alkaline, zinc-air, lead-acid, Ni-Cd, Ni-MH, Li-ion; hover shows the anode, cathode and electrolyte from the table. | Values exactly as in R1 Table 2 with its footnote on electrolytes. |
| 2.4 | A | Inside a composite electrode | R1 sec. 1.6 | Zoom into the coating: active particles, carbon network, binder, pores filled with electrolyte; about 30 % of the volume is pore, shown by shading. | Porosity fraction as R1 states; particles irregular; carbon forms a connected network, not isolated dots. |

### Module 3: Where the voltage comes from

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 3.1 | I, C | The potential ladder | R2 Fig. 5; R6 text values | Vertical axis in V versus Li/Li+. Rungs: graphite about 0.2, alloys 0.2 to 0.8, lithium titanate 1.5, TiS2 about 2.2, sulfur 2.4, LiFePO4 3.5, LiCoO2 about 4.0, LiNi0.5Mn1.5O4 about 4.75. The reader picks a negative and a positive rung; the cell voltage is drawn as the gap and computed as the difference. A band marks the carbonate electrolyte window from about 1.1 V to about 4.3 V versus Li [R6]; choosing a rung outside it raises an "SEI needed" or "electrolyte oxidation" flag. Aqueous toggle shows the 1.23 V thermodynamic and about 2 V kinetic window [R1]. | Every rung value cited; no rung without a source; the flags appear exactly when the R6 conditions are met (anode above the LUMO, cathode below the HOMO). |
| 3.2 | A | Electron energy picture | R6 Fig. 2a and 2c; R1 Fig. 12 | Energy levels of the anode and cathode and the electrolyte's LUMO and HOMO; an electron drops from the anode level to the cathode level, the drop labelled as the cell voltage times e. | Levels in the order and spacing R6 gives for the carbonate case; the aqueous case uses R1's numbers. |
| 3.3 | S | Why oxides give 4 V and sulfides 2.5 V | R6 text | Band picture: top of the S-3p band about 2.5 eV below the lithium level, top of the O-2p band about 4.0 eV below; the accessible cathode potential is pinned there. | Numbers as R6 states; caption explains the pinning in one sentence. |
| 3.4 | C | From reaction energy to voltage | R1 sec. 1.3 | The equation ΔG = -nFE is shown with a slider on n and on E; the bar for available energy scales accordingly. | Equation as in R1; units shown. |

### Module 4: Capacity, energy and power

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 4.1 | I, C | Faraday calculator | R1 secs. 1.2 and 1.3 | Choose a material (graphite as C6, LiCoO2, LiFePO4, lithium metal, a lithiated organic from your papers) or type a molar mass and electron count; an animated electron counter fills as the capacity Q = nF / (3.6 M) in mAh/g is computed; multiply by a chosen voltage for Wh/kg. The card states the mass basis: negative-electrode hosts are referred to the delithiated mass (C6), positive-electrode materials to the lithiated mass as assembled (LiFePO4, LiCoO2). | F = 96 485.3 C/mol as R1 gives; the computed values must reproduce R2 and R6 (372 mAh/g for graphite on the C6 basis, 170 mAh/g for LiFePO4) before the figure ships. A calculation on the LiC6 mass basis gives 339 mAh/g and must be labelled as such if shown. |
| 4.2 | A, C | Energy is the area under the curve | R6 eq. 5 | The discharge curve fills from left to right; the shaded area is the energy. A rate control lowers the curve and shortens it, and the area shrinks. | Curve from the module 5 simulator, same parameters; shading exactly the integral of V over Q. |
| 4.3 | S | Ragone map | R1 Fig. 3 | Regions for capacitors, batteries, fuel cells and the combustion engine on specific-power versus specific-energy axes. | Drawn as regions with the ordering R1 describes; axes labelled but unnumbered unless the values are verified; caption "schematic after R1". |
| 4.4 | A | Theoretical versus practical energy | R1 Fig. 19 and sec. 1.1 | A full bar of theoretical energy is eaten in three animated bites: inert parts, internal resistance, incomplete utilization; about 25 % remains for a rechargeable cell. | Fractions labelled as a rule of thumb from R1, not as measured values. |
| 4.5 | A | Series and parallel | R6 | Cells snap together in series (voltage bar grows) or in parallel (capacity bar grows). | Nothing else changes when cells are combined. |

### Module 5: Charging and discharging

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 5.1 | I, C | Galvanostatic curve simulator | R6 eqs. 1 to 2; R1 Fig. 6, secs. 1.4 and 2.4 | The reader sets the C-rate and picks a flat (two-phase) or sloping (single-phase) open-circuit curve. The charge branch is drawn as Voc + η, the discharge branch as Voc - η, with η = I·Rb plus a concentration term that grows toward the end of discharge. The gap widens and the reached capacity shrinks with rate; a heat indicator shows I·η. | The charge branch is always above the discharge branch; η increases monotonically with current; capacity never increases with rate; cut-off voltages drawn and respected; caption lists the illustrative parameters and says "schematic". |
| 5.2 | A, C | The three polarizations in time | R1 sec. 1.4 | Current is switched off: the voltage jumps instantly (ohmic), then recovers over milliseconds (activation), then drifts over seconds or longer (concentration), on a log time axis. | Time scales as R1 gives: ohmic under 1 microsecond, activation 1e-4 to 1e-2 s, concentration 1e-2 s and slower. |
| 5.3 | A | Plateau or slope: the phase rule | R1 sec. 2.4 and Fig. 16; R6 Fig. 6 | Two particles side by side under the same current: in one a phase front sweeps through and the voltage stays flat; in the other the lithium content changes uniformly and the voltage slopes. | Two-phase gives constant voltage, single-phase gives a slope, exactly as the Gibbs phase rule argument in R1; LiFePO4 named as the flat example [R6]. |
| 5.4 | A, C | Cycle life and Coulombic efficiency | R6 definitions; R1 sec. 2.6 | Capacity retention versus cycle number draws in; the 80 % line marks end of life; an inset shows Coulombic efficiency per cycle. | Definitions quoted from R6; the 300-cycle commercial criterion from R1; curve labelled schematic. |
| 5.5 | S | Where the heat comes from | R1 sec. 1.3 | Two bars: reversible entropic heat (sign depends on dE/dT) and irreversible Joule heat, the second growing with current. | Signs and dependence as R1 states; lead-acid and Ni-Cd given as the two sign examples. |

### Module 6: Inside a lithium-ion cell

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 6.1 | A, I | The rocking chair | R2 Fig. 2b; R6 Fig. 1 | Graphite layers on the left, LiCoO2 layers on the right, electrolyte between. Discharge: Li+ leaves the graphite, crosses the electrolyte and enters LiCoO2 while electrons go round the outside through the load. Charge: the charger pushes electrons the other way and Li+ returns to the graphite. Toggle between the two. | Ion and electron directions correct in both modes; on charge the charger's voltage is drawn larger than the cell voltage [R1 Fig. 11]; the host layers stay intact (insertion, not consumption); materials named. |
| 6.2 | A | The first charge and the SEI | R6; R1 sec. 2.4; R2 | As the graphite potential falls below the electrolyte's stability limit, electrolyte molecules react at its surface and build a thin layer; a lithium counter shows the irreversible loss from the cathode; then the layer passivates and only Li+ passes through it. | In this cell the SEI forms on the graphite; it consumes lithium that came from the positive electrode; a positive electrode above the electrolyte's oxidation limit (about 4.3 V versus Li, for example LiNi0.5Mn1.5O4) needs its own passivation layer, which R6 also calls an SEI, so the caption does not say "only"; it is electronically insulating and Li+-permeable [R1]; ethylene carbonate named as the layer-forming solvent [R2]. |
| 6.3 | A | Lithium metal versus lithium ion | R2 Fig. 2a and 2b | Left: lithium plates unevenly on recharge and a rough, mossy deposit grows toward the separator. Right: lithium inserts into graphite and the surface stays flat. | Dendrite morphology shown only as "rough, mossy, dendritic" [R1] without invented detail; the left cell's cycle counter stops around 100 to 150 [R1]. |
| 6.4 | A | Timeline 1970 to 1991 | R6; R2 | Scroll-driven timeline: Rouxel and Schollhorn (intercalation, 1970 to 1971), Steele (1973), Whittingham's TiS2/Li cell at 2.2 V (1976), Goodenough's LiCoO2 (1980), Yazami's graphite (1983), Yoshino's cell, Sony's C/LiCoO2 (June 1991). | Names, years and voltages exactly as the two reviews state; each entry cites the landmark paper once it passes verification (L1, L2, L4, L17, L19). |
| 6.5 | A | Three host structures, three lithium paths | R6 Figs. 4 and 7 and text | Layered oxide (Li moves in 2D planes), spinel (3D channels), olivine LiFePO4 (1D channels); a Li+ travels along each path. | Dimensionality of the paths as R6 states; structures drawn as simplified polyhedra, labelled schematic. |

### Module 7: The electrolyte

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 7.1 | A | Three ways to carry a lithium ion | R2 Fig. 3a; R1 sec. 2.2; R6 garnet text | Liquid: a solvated Li+ diffuses among solvent molecules and occasionally pairs with an anion. Dry polymer: Li+ hops between coordinating sites as the chain segments wriggle; when the chains freeze the ion stops. Ceramic: Li+ hops between lattice sites in a rigid framework. | Polymer transport shown as coupled to chain motion [R2]; ion pairing shown only in the organic liquid [R1]; ceramic framework rigid. |
| 7.2 | I | Conductivity versus temperature | R2 Fig. 8 | Curves for PEO-LiCF3SO3, PEO-LiTFSI, plasticized PEO, gel and liquid electrolytes on a log conductivity versus 1000/T axis; the reader toggles series. | Only the orderings and the ratios R2 states are encoded (an order of magnitude from triflate to TFSI, an order of magnitude from 10 to 25 % plasticizer, gels 2 to 5 times below the liquid); the figure says "shape after R2 Fig. 8, schematic". |
| 7.3 | A, C | Transference number | R2 | Under a field, Li+ and anions both move; a counter shows the share of current carried by Li+ (about 0.3 typical, about 0.6 with nanofillers); the anions pile up at one side and a concentration gradient appears. | Values as R2 gives; the gradient links to concentration polarization in module 5. |
| 7.4 | A | Why solid electrolytes are hard | R6 | Four requirements light up as a membrane is tested: conductivity above 1e-4 S/cm, blocking a growing dendrite without being reduced, chemical stability in the liquids, and bending without cracking; a ceramic passes some and cracks, a polymer bends but conducts poorly, a composite is proposed. | Requirements quoted from R6; the garnet conductivity above 1e-3 S/cm cited. |
| 7.5 | A | Contact loss at a solid-solid interface | R6 | An electrode particle swells and shrinks with cycling against a rigid solid electrolyte; gaps open and the ion path breaks; against a polymer the contact follows. | The volume-change cause as R6 describes; no numbers unless sourced. |

### Module 8: Electrodes are composites

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 8.1 | A | From pouch to particle | R1 sec. 1.6 and Fig. 9 | Three-step zoom: cell, coating, one particle. Electrons arrive through the carbon network, Li+ through the electrolyte in the pores (or the polymer binder in your cells); the particle reacts only where both arrive. | Both paths drawn; a particle without one of them is shown inactive. |
| 8.2 | I, C | Where does the current go? | R1 Fig. 9B | The reaction front inside a porous electrode; sliders for matrix conductivity and electrolyte conductivity shift where the reaction concentrates (near the separator or near the collector). | Qualitative behaviour as R1 describes: the reaction concentrates where the sum of the two resistances is lowest; no numeric depths claimed. |
| 8.3 | A | A poor conductor needs carbon | R1 Fig. 15E; R6 | An MnO2 or LiFePO4 particle lights up from the point of carbon contact outward; without carbon it stays dark. | Utilization starts at the carbon contact and spreads, as R1 states. |
| 8.4 | A | The nanoparticle trade-off | R6; R2 | The same mass of active material as large particles and as coated nanoparticles: the nano version fills more volume (lower tap density) and shows harder-to-coat surfaces. | Trade-off as R6 describes; aerogel tap density about 0.2 g/cm3 cited from R2. |
| 8.5 | A | One polymer as binder and electrolyte | Your ACS Applied Polymer Materials 2024 article; home-page scene 1 | The existing home-page figure reused: the ion path stops at a binder boundary in one electrode and continues in the other. | As already published on the home page. |

### Module 9: Lithium metal, sodium and organic electrodes

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 9.1 | A | Plating and stripping | R1 sec. 2.5; R2 Fig. 2a; R6 | Lithium strips on discharge and replates on charge; the deposit grows rough and reaches toward the separator; a counter climbs to about 100 to 150 cycles. A second panel shows a solid separator that blocks the growth. | Morphology limited to what the sources say; the SEI is shown as Li+-permeable but unable to enforce uniform plating [R6]. |
| 9.2 | A | Breathing electrodes | R6; R2 | A silicon particle swells about 300 % on lithiation and cracks; an alloy up to 200 %; a buffer matrix version keeps the electrical pathway. | Percentages as R6 and R2 state; graphite drawn with a small change but no percentage unless sourced. |
| 9.3 | A | Conversion reactions | R2 (Poizot et al., 2000, L12) | A metal-oxide particle turns into metal nanoparticles embedded in Li2O on discharge and reforms on charge. | Mechanism as R2 describes; the "two to three times the capacity of carbon" figure cited. |
| 9.4 | S | The materials family tree | R6; R2; R24 to R26 | Insertion, alloy, conversion, metal and organic electrodes with your materials highlighted. | Organic branch cites R24 to R26 only after verification. |
| 9.5 | A | How an organic electrode stores lithium | R24 and your publications | A redox-active group takes an electron and a lithium ion and gives them back; the polymer backbone keeps the molecule from dissolving. | Drawn only from verified organic-electrode sources; not from the three supplied articles. |
| 9.6 | S | Sodium is bigger | R6; Shannon radii (R42) | Na+ and Li+ drawn to scale (six-coordinate ionic radii 102 pm and 76 pm) against a close-packed oxide framework and an open framework; the message is that Na+ needs a larger interstitial space. | Statement as R6 makes it; the radii you supplied match Shannon's six-coordinate values and are shown once the Shannon citation resolves. |

### Module 10: Why batteries age

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 10.1 | I, C | Capacity fade, taken apart | R6; R2; R29 (candidate) | A fade curve with three toggleable shaded contributions: lithium lost to the SEI, active material lost to cracking or dissolution, and resistance rise that hides capacity at rate. | Categories from R6 and R2; the loss-of-inventory and loss-of-active-material vocabulary cited to R29 only after verification; curve schematic. |
| 10.2 | A, C | The SEI keeps growing | R6; R37 | Over many cycles the layer thickens and the lithium counter keeps falling; the interfacial resistance bar rises. A toggle shows the diffusion-limited √t law against linear growth, and the thickness curve is computed from L ∝ t^b with the reader's choice of regime. | Both effects as R6 states; exponents and regimes exactly as R37 gives them (b = 0.5 diffusion, 1 reaction or migration on charge, 0 migration on discharge); caption notes that growth is fastest at high state of charge and charging rate [R37]. |
| 10.3 | A | Manganese on the move | R6 | Mn(II) leaves a spinel particle, crosses the electrolyte and lodges in the anode SEI, which then works worse. | Sequence exactly as R6 describes. |
| 10.4 | A | Cracking and contact loss | R2 | An alloy particle cracks on cycling; fragments lose contact with the carbon network and go dark. | As R2 describes. |
| 10.5 | S | Self-discharge and temperature | R1 sec. 2.6 | Capacity kept on the shelf versus time for a Li-MnO2 primary (90 % after 8 years) and Ni-MH (up to 30 % lost in a month); a temperature note. | Values exactly as R1 states. |

### Module 11: How batteries are tested and diagnosed

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 11.1 | A, C | Impedance, frequency by frequency | R1 Fig. 7; B2 section 11.4 | A dot sweeps from high to low frequency along a Nyquist plot while the matching element of the equivalent circuit lights up: the high-frequency intercept (ohmic), the semicircle (charge transfer with its double-layer capacitance) and the 45 degree tail (Warburg diffusion). | Shapes and assignments as R1 gives; the semicircle's peak is at angular frequency ω = 1/(R_ct C), that is f = 1/(2π R_ct C); R1 writes the shorthand τ = 1/f_m = RC, and the page states the exact relation; plot computed from the circuit, not drawn. |
| 11.2 | A | One cell, four measurements | R1 secs. 1.5; R31, R32 (candidates) | Galvanostatic cycling, cyclic voltammetry, impedance and GITT drawn from the same cell, each with a one-line "question it answers". | CV and GITT panels cite R31 and R32 only after verification; the cycling and impedance panels rest on R1. |
| 11.3 | A | Current interruption | R1 sec. 1.4 | Same as 5.2, reused with the measurement framing. | As 5.2. |
| 11.4 | S | Research cell formats | R6; R21 (candidate) | Coin, Swagelok and pouch cells; half-cell against lithium versus full cell. | The half-cell statement from R6; coin-cell practice from R21 after verification. |
| 11.5 | S | Post-mortem versus in situ | R1 sec. 1.5; R2 | Two columns of techniques with what each sees. | Technique lists exactly as the sources give. |

### Module 12: Safety, use and end of life

| # | Type | Figure | Source basis | What moves, what the reader does | Accuracy constraints |
|---|---|---|---|---|---|
| 12.1 | A | The runaway loop | R1 secs. 1.2 and 1.3; R33 (candidate) | Heat raises the reaction rate, which makes more heat; a cooling branch can break the loop if it removes heat fast enough. | The autocatalytic definition from R1; no reaction sequence beyond what R33 verifies. |
| 12.2 | A | Short circuit | R1 sec. 2.2; R6 | Electrodes touch through a pinhole: all stored energy appears as heat inside; a coated separator in the second panel blocks the contact. | As the sources state. |
| 12.3 | S | Temperature comfort zone | R1 sec. 2.6 | Operating and storage ranges for consumer cells drawn on a thermometer; military and automotive ranges beside. | Ranges exactly as R1 gives; everyday-habit advice added only with a verified source. |
| 12.4 | A | The recycling loop | R1 sec. 2.5; R35 (candidate) | Lead-acid loop with the 98 % figure; a Li-ion loop drawn after R35 is verified. | Figures cited. |

### Figure accuracy rules (apply to every item above)

1. **Named basis.** Every figure cites the source figure or equation it is drawn from, in
   its caption and in its alt text: "after R1 Fig. 6", "computed from R6 eq. 1".
2. **Computed, not sketched.** Any curve that a source gives as an equation (polarization,
   Butler-Volmer, Tafel, Nernst, Faraday, the energy integral, the RC impedance) is
   calculated in the page's JavaScript from that equation with illustrative parameters
   listed in the caption. Only curves that sources give as shapes (Ragone, Arrhenius
   ordering) are drawn as shapes, and they say "schematic" on the figure.
3. **Directions and signs are checked against a table.** Discharge: electrons leave the
   negative electrode through the external circuit; Li+ moves from negative to positive
   electrode inside; anions drift the other way. Charge: all three reverse and the charger
   voltage exceeds the cell voltage. The charge branch lies above the discharge branch.
   Polarization grows with current, capacity never grows with rate. Each figure's review
   row ticks these.
4. **Sourced values only.** Every number drawn on a figure (a rung on the ladder, a
   percentage, a cycle count, a conductivity) has a citation; a value without one is
   removed from the figure, not approximated.
5. **Named materials.** When a specific material is depicted it is named (graphite,
   LiCoO2, LiFePO4, PEO-LiTFSI), never "cathode material".
6. **Proportions.** Where the sources give no dimensions, the figure states "not to
   scale". Where they do, the figure keeps the ratio.
7. **No invented mechanism.** An animation may only show steps the source describes.
   Dendrites are "rough, mossy, dendritic" [R1] with no morphology detail; the SEI is a
   layer with the properties R1 and R6 state; ion transport in polymers is "assisted by
   the motion of polymer chains" [R2].
8. **Consistent visual code**, as defined at the top of this section, with one legend
   shown in module 1 and repeated in the sticky chapter rail.
9. **Static and reduced-motion frames are complete.** The final frame of every animation
   is a correct, labelled figure on its own, and its caption describes the motion in
   words, so the page teaches identically with motion off, in print and to a screen
   reader.
10. **Review row.** A figure ships only after a row in the review sheet is filled: figure
    number, source basis, what is computed and what is drawn, the direction-and-sign
    checks, and your initials and date.

### Implementation notes for the figures

- All figures are inline SVG. Looping and scroll-driven motion uses the GSAP and
  ScrollTrigger build the site already ships; computed curves use a small vanilla
  JavaScript module per figure that writes SVG path data from arrays. No new
  libraries.
- Each figure is a self-contained `<figure data-fig="5.1">` with its controls inside it;
  a registry maps figure ids to their init functions, and ScrollTrigger pauses any figure
  that scrolls off screen, as the home page already does for the hero.
- Interactive controls are native `<input type="range">`, `<select>` and buttons, so they
  work with a keyboard and a screen reader; every control has a visible label with units.
- Budget: the page stays under 250 KB of HTML with all figures inline; heavy computed
  figures cap their resolution at 200 points per curve.
- A shared `physics.js` holds the source equations (Faraday, Nernst, polarization,
  Butler-Volmer, RC impedance) with unit tests that reproduce the printed check values
  (372 mAh/g for LiC6, 170 mAh/g for LiFePO4, the ohmic and activation time scales), run
  before each deployment.

## 5c. Narrative flow and engagement

### The story spine: follow one lithium ion, and build your own cell

The page is one story told in three acts, not twelve articles in a row.

- **Act A, "Why does the lamp light?"** (modules 1 to 4). Opens with a switch the reader
  closes. The question of the act is where the push comes from and how much of it there
  is: energy, voltage, capacity. It ends with the reader having chosen two electrodes on
  the potential ladder and computed the theoretical energy of *their* cell.
- **Act B, "Follow one ion"** (modules 5 to 8). The same amber Li+ dot that travels the
  home-page hero now becomes the reader's guide. The act follows it through one full
  cycle: out of the negative electrode, across the electrolyte, into a particle of the
  positive electrode, and back on charge. Every module is a place the ion passes through:
  the voltage curve it produces, the host it enters, the electrolyte it crosses, the
  composite it has to find its way into.
- **Act C, "Where it goes wrong, and what we are doing about it"** (modules 9 to 12).
  The ion's journey fails in the ways real cells fail: it plates as metal, it gets trapped
  in the SEI, its host cracks, its electrolyte freezes. The act ends at the frontier,
  which is your research, and at the end of the cell's life, which is your recycling
  work. The last screen hands the reader back to the home page's research section.

**"Your cell" thread.** In module 3 the reader picks a negative and a positive electrode
from the ladder. That choice persists through the act (stored in the page, no server):
module 4's calculator opens on their pair, module 5's simulator draws their curve shape
(flat for LiFePO4, sloping for LiCoO2, both cited), module 6 shows their hosts, module
7 asks whether their pair fits inside the electrolyte window, and module 10 shows how
their pair ages. A reader who skips the choice gets the default C/LiCoO2 cell of 1991
[R2]. Only pairs the sources describe are offered, and the simulator caption states that
its parameters are illustrative.

**The rail charges as you read.** The sticky chapter rail is drawn as a cell that fills
with amber as the reader progresses, echoing the home page's state-of-charge rail. Act
boundaries are marked as plateaus on it. It is the progress indicator and the running
legend at once.

### Module openers, payoffs and bridges

Each module follows the same rhythm so the reader always knows where they are:
**a question the reader cannot yet answer, a figure to play with for twenty seconds,
the explanation in the order the play raised it, a key idea, a "you can now explain"
line, and a one-sentence bridge into the next question.**

| Module | Opening question (hook) | Payoff the reader gets | Bridge to the next module |
|---|---|---|---|
| 1 | Why does the lamp light when you close the switch, and why not when it is open? | The push exists before the switch closes; the wire only lets it act. | "So what is inside the box that makes the push?" |
| 2 | If you cut a cell open, what would you find, and what does each part do? | The four jobs: give electrons, take electrons, carry ions, keep the two apart. | "Two of those parts decide how hard the push is." |
| 3 | Why does a lithium-ion cell give over 3.6 V and a torch battery 1.5 V? | Voltage is the gap between two rungs, and the electrolyte sets how far apart they may be. Reader picks their pair. | "You have chosen a voltage. How much charge can your cell hold?" |
| 4 | How long would your cell run a lamp? | Capacity from Faraday's law, energy from capacity times voltage, and why practice gives a quarter of theory. | "Now let us watch your cell do it." |
| 5 | Why does the voltage sag when you draw current, and where does the lost energy go? | The gap between charge and discharge is resistance and kinetics, paid as heat. | "To see why the curve has that shape, follow the ion inside." |
| 6 | Where does a lithium ion actually sit, and what happens on the very first charge? | The rocking chair; the SEI that costs lithium once and then protects. | "The ion had to cross something to get there." |
| 7 | How does an ion travel through a solid? | Three carriers; polymer chains that have to move; why the solid version is hard. | "On the far side, the ion has to find a particle." |
| 8 | Why is an electrode not just a block of the good stuff? | Electrons and ions both need a road; where the roads end, the material is dead weight. | "The round trip works. Now let us see how it fails." |
| 9 | If lithium metal is the best negative electrode, why is it not in your phone? | Plating, dendrites, and the routes around them; the family of alternatives including organics. | "Even a well-behaved cell wears out. Why?" |
| 10 | Where did the capacity go? | Three thieves: lithium lost to the SEI, active material lost to cracking and dissolution, resistance that hides what is left. | "To catch a thief you need a witness." |
| 11 | How would you find out which thief it was? | One cell, four measurements, each answering one question; impedance as a fingerprint. | "And when the cell is truly finished?" |
| 12 | What happens at the end, and how do you keep a cell safe until then? | Heat loops, comfort zones, and the recycling loop that closes the story. | "This is where my own work starts." (link to Research) |

### Pacing rules

- Never more than 120 words between two figures, interactions or quotes. If a passage
  runs longer, it is split or one of its sentences becomes a figure caption.
- Each module reads in under three minutes at the main level; "Go deeper" panels are
  collapsed by default and never required to follow the story.
- One new term per paragraph, defined in the same sentence; the glossary tooltip is a
  backup, not the first definition.
- One analogy per module at most, and the sentence after it says where it breaks. The
  analogies are chosen once: reservoirs at different heights for voltage (module 3), a
  crowded corridor for ionic conductivity (module 7), roads to a house for the composite
  electrode (module 8). None elsewhere.
- Rhythm alternates: a question, a play, an explanation, a recap. Two explanation
  paragraphs never sit next to each other without a figure between them.

### Engagement devices (each one accuracy-safe)

- **Predict, then reveal.** Before the ladder computes the voltage, the reader is asked to
  guess which pair gives the most; before the fade figure, which thief takes most in the
  first ten cycles. The reveal cites the source; a wrong guess is never marked wrong,
  just answered.
- **The ion as guide.** The amber dot appears at the top of every module in Act B and C
  at the place it has reached, and the reader can click it to replay its path so far.
- **Moments from the history.** Short, sourced episodes give the page a pulse: Exxon's
  TiS2 cell and the dendrite fires that stopped it [R2; R6]; Sony's launch in June 1991
  [R2]; Tarascon and Armand's admission that nobody knows why ethylene carbonate protects
  graphite and propylene carbonate does not, "reminding us that chemistry has its
  secrets" [R2]; the lithium-titanate and LiFePO4 electrodes that survived 30 000 cycles at 5C,
  reported by Zaghib and co-workers and cited by Goodenough [R6; L16]. Each is a
  two-sentence aside in a distinct pull-quote style, never in the main explanation.
- **Numbers with a feel.** Every big number gets one concrete comparison from the
  source, such as R1's "30 Wh/kg means one kilogram of lead-acid battery runs a 60 W
  lamp for half an hour". No comparison is invented; if the source has none, the number
  stands alone.
- **Try-this prompts.** Every interactive figure carries one prompt in the caption:
  "Slide the rate to 5C and watch the capacity you can reach" or "Turn the charger on and
  watch which way the electrons go". The prompt names the thing to notice, so nobody
  fiddles without a purpose.
- **You can now explain.** Each module ends with one line the reader could say to a
  friend. Twelve of them read together make the summary of the page.
- **Two closing checks.** The check-yourself quiz uses the same figures the reader played
  with, so answering is recognition, not recall. The glossary is ordered by module, not
  alphabetically, so it doubles as a recap.
- **Callbacks.** Later modules point back to earlier figures by number and reuse them
  in a new light: the discharge curve of module 5 returns as the area of module 4 and
  the fade of module 10; the ladder of module 3 returns as the electrolyte window of
  module 7. The reader sees the same object gain meaning, which is what understanding
  feels like.
- **A place to stop.** Each act ends with a full-width figure and a one-paragraph
  summary so a reader who leaves has a clean ending, and the rail shows where to resume.

### Three ways to read

The hero offers three entry points, and the page adapts:

- **"Just show me" (about 8 minutes):** the twelve hooks, the twelve main figures and the
  twelve "you can now explain" lines, with the explanations collapsed. A skim that still
  tells the whole story.
- **"Teach me" (about 35 minutes):** everything at the main level, the default.
- **"I want the equations" (about 60 minutes and more):** all "Go deeper" panels open,
  and every module ends with its link into the theory page (section 5d), where the
  derivations, graphs and worked examples live.

The choice is remembered in the browser and can be changed from the rail at any time.

### Voice

- Second person, present tense, plain words: "you close the switch", "the ion crosses".
- Confident where the sources are confident, explicit where they are not: "nobody yet
  knows why" is written when R2 says so.
- No exclamation marks, no "amazing", no jokes at the expense of precision. Warmth
  comes from the reader doing things and from the history, not from adjectives.
- The author's voice appears in exactly two places: the opening ("I have spent five years
  building the cells on this page") and the ending that hands over to the research
  section. Everywhere else the page speaks for the sources.

### Reader testing before launch

- Three test readers: one with no science background, one undergraduate, one battery
  colleague. Each reads at their level and answers five questions drawn from the
  "you can now explain" lines, then names the module where they got lost or bored.
- Acceptance: all three finish; the non-scientist answers at least three of five; nobody
  names the same module as boring twice. A module that fails is re-paced, not cut.

## 5d. The theory track: all the mathematics, kept separate

### Where it lives and how it is reached

A second page, `/batteries/theory/`, holds every equation, derivation and model behind
the story page. The story page carries no equations beyond the three one-liners a
general reader meets anyway (E = ΔG/(-nF) in module 3, Q = nF/(3.6 M) in module 4, and
V = Voc ± I·Rb in module 5). Each module of the story page has one quiet link at the end
of its "Go deeper" panel, "The mathematics of this module", which jumps to the matching
chapter of the theory page; each theory chapter opens with a link back to the story
module and to the figure it explains. The "I want the equations" reading mode from
section 5c now means the story page plus these links, not equations inline.

The theory page uses the same design, the same visual code and the same citation rules.
Its readers are students and colleagues, so the tone is a clear lecture note: every
symbol defined the first time, every equation numbered, every derivation stepwise.

### The equation card: the unit of the theory page

Every equation is presented as one card with the same seven parts, so the reader always
knows where to look:

1. **Statement**: the equation, numbered, with the source it comes from.
2. **Symbols and units**: a table of every symbol in that equation, drawn from the
   page-wide symbol table (one meaning per symbol across the whole page).
3. **Where it comes from**: the derivation, step by step, each step one line with the
   rule used ("substitute eq. 2.3", "divide by nF"), collapsed by default.
4. **The graph**: a computed plot of the equation over a physically sensible range,
   with sliders for the parameters that matter, so the reader sees what the equation
   does before reading what it says. Computed live from the equation, never drawn.
5. **The scheme**: a small schematic of the physical situation the equation describes
   (which interface, which direction, which quantity is being counted), in the site's
   visual code.
6. **Worked example**: numbers from the sources put through the equation, with the
   result compared to the printed value (for instance graphite through Faraday's law giving
   372 mAh/g on the C6 mass basis, as in R2).
7. **Checks**: which automated tests cover the card (symbolic derivation check,
   numeric check, dimensional check), and the review-sheet row.

### Chapters and content

Chapters mirror the story modules. Sources: R1 sections 1.3 to 1.6 and R6 give most of
the core; textbook material (B2 Bard and Faulkner, B5 Newman and Balsara, B3 Huggins)
covers what the three articles state without deriving. Items marked (tier 3) rest on a
source that must pass verification before that card is published; the card is built
last and stays hidden until then.

**T1. Cells, charge and Faraday's law** (story modules 1, 2, 4)
- Half-reactions and cell reaction; cell notation; electron and ion balance for the
  Daniell cell and for C/LiCoO2 [R1 Fig. 1; R6 cell reactions].
- Faraday's law: mass transformed m = I t M / (n F) [R1 eq. 7]; charge Q = n F N.
- Theoretical specific capacity: Q_spec = n F / (3.6 M) in mAh/g, derived from Faraday's
  law with the unit conversion shown explicitly. Worked examples: graphite, 372 mAh/g on the
  C6 basis (72.07 g/mol, n = 1), and LiFePO4, 170 mAh/g on the LiFePO4 basis
  (157.76 g/mol, n = 1), reproducing R2 and R6; lithium metal, 3861 mAh/g from F and
  M = 6.94 g/mol [R2], a computed value labelled as such. The mass-basis convention
  (delithiated host for negative electrodes, lithiated compound for positive electrodes)
  is stated on the card, because the same material gives a different number on the
  other basis (339 mAh/g for LiC6).
- Series and parallel arithmetic for voltage, capacity and energy [R6].
- Graphs: capacity versus molar mass for n = 1, 2, 3 with the example materials marked.

**T2. Thermodynamics: where the voltage comes from** (story module 3)
- ΔG = ΔH - TΔS and ΔG = -nFE [R1 eqs. 1 to 4]; the van't Hoff isotherm [R1 eq. 5]
  and the Nernst equation E = E° - (RT/nF) ln(A_P/A_R), derived on the card from eqs.
  3 to 5 because R1's printed eq. 6 carries a plus sign (see the transcription check);
  cross-checked against B2 eq. 2.1.40, which for a half-reaction νO O + ne ⇌ νR R gives
  E = E° - (RT/nF) ln(a_R^νR / a_O^νO), the same statement.
- The temperature coefficient: dE/dT = ΔS/(nF), reversible heat T ΔS = nFT (dE/dT)
  [R1 eqs. 8 and 9]; sign examples lead-acid (negative) and Ni-Cd (positive) [R1].
- The electron-energy view: Voc = (μA - μC)/e [R6 eq. 6, confirmed from the printed page], the electrolyte window as the
  LUMO-HOMO gap, and the SEI conditions [R6 Fig. 2].
- The Gibbs phase rule F = C - P + 2 and why a two-phase reaction gives a constant
  voltage and a single-phase reaction a slope [R1 sec. 2.4].
- A regular-solution (lattice-gas) model for the open-circuit voltage of a solid-solution
  insertion electrode, from Bazant's eqs. 47 and 48 [R39]: the lithium chemical potential
  in the host is μ_Li = kT ln(x/(1-x)) + Ω(1-2x) (configurational entropy plus enthalpy
  of mixing, zero at half filling), and the electrode potential is Δφ(x) = Δφ° - μ_Li(x)/e
  (+ (kT/e) ln a_e, taken as zero for a metallic host). Per mole: E(x) = E° - (RT/F)
  ln(x/(1-x)) - (Ω_m/F)(1-2x). The card shows how Ω = 0 gives a smooth slope and a
  large positive Ω gives phase separation and a plateau, which links to the phase-rule
  argument of R1 and to LiFePO4 [R6].
- Graphs: Nernst voltage versus log activity ratio at several temperatures; E versus T
  with both signs of dE/dT; the phase-rule plateau versus slope; the energy-level
  diagram with a movable electrode level that trips the SEI condition.

**T3. Kinetics: why the voltage sags** (story module 5)
- Polarization η = E_OCV - E_T [R1 eq. 12].
- Butler-Volmer for one electrode, as B2 writes it (eq. 3.4.11, cathodic current positive,
  f = F/RT, η = E - E_eq, α the cathodic transfer coefficient, usually 0.3 to 0.7):
  i = i₀ [exp(-α f η) - exp((1 - α) f η)]. The card also gives the battery-literature form
  with anodic current positive, i = i₀ [exp(α_a f η) - exp(-α_c f η)], and states the mapping
  α_c = α, α_a = 1 - α, so the two conventions are never mixed. Valid when the current is
  below about 10 % of the smaller limiting current [B2, 3.4.11]. Bazant's eq. 1 writes the
  same equation with α_c = α and α_a = 1 - α, reduction current positive [R39], which the
  card cites as a second source for the convention. R1's printed eq. 13 omits
  the bracket and the sign of the second exponent (transcription check).
  Convention note on the card: R1 defines the cell polarization η = E_OCV - E_T, which is
  positive on discharge and sums the two electrodes and the ohmic drop; the per-electrode
  overpotential in Butler-Volmer is a different quantity with its own sign, and the page
  never mixes the two symbols (the symbol table gives them different names). The exchange
  current density and its meaning; the Tafel limit at large overpotential, |η| = (RT/αF) ln(i/i₀), which B2 gives as
  η = (RT/αF) ln i₀ - (RT/αF) ln i for the cathodic branch with a = (2.303RT/αF) log i₀ and
  b = -2.303RT/αF, valid when the back reaction is below 1 % of the current, that is
  |η| > 118 mV at 25 C [B2 eqs. 3.4.14 to 3.4.16]; R1's empirical form η = a - b log(I/I₀)
  quoted [R1 eq. 14];
  the low-overpotential limit i = -i₀ f η and the charge-transfer resistance
  R_ct = RT/(F i₀) for a one-electron step [B2 eqs. 3.4.12 and 3.4.13], generalized to
  RT/(nF i₀) for a multistep quasireversible mechanism [B2 eq. 3.7.25].
- Ohmic polarization η = IR [R1 eq. 15]; concentration polarization
  η_c = (RT/nF) ln(C/C₀) [R1 eq. 16, which is printed without the F; the card uses the
  dimensionally correct form].
- The discharge and charge curves: V_dis = Voc(q) - I Rb and V_ch = Voc(q) + I Rb
  [R6 eqs. 1 and 2] and their extension with the three polarization terms.
- The three time scales after current interruption [R1 sec. 1.4].
- Graphs: Butler-Volmer current versus overpotential with sliders on i0 and α; the Tafel
  plot; the polarization budget as stacked contributions along a discharge curve
  (computed version of R1 Fig. 6); voltage relaxation on a log time axis.

**T4. Energy, power and efficiency** (story modules 4, 5)
- Stored energy as the integral of voltage over charge, E = ∫ V(q) dq, and the average
  voltage [R6 eq. 5]; power P = V I; gravimetric and volumetric normalization [R1 1.1].
- Coulombic efficiency 100 × Q_dis/Q_ch [R6 eq. 4] and storage efficiency
  100 × ∫₀^Q_dis V_dis(q) dq / ∫₀^Q_ch V_ch(q) dq [R6 eq. 2], both confirmed from the
  printed page.
- Cycle life as cycles to 80 % [R6]; the practical-to-theoretical ratio [R1].
- Graphs: energy as shaded area under the curve at several rates; efficiency versus
  rate from the T3 model; the Ragone construction from energy and power.

**T5. Ion transport in electrolytes** (story module 7)
- Conductivity in B2's notation, κ = F Σ_j |z_j| u_j C_j (mobility u_j, concentration C_j)
  [B2 eq. 2.3.10 and 4.2.7], its relation to resistance through geometry, and Ohm's law in
  the electrolyte [R1 2.2].
- Temperature dependence: Arrhenius σ = σ0 exp(-Ea/RT) for liquids and ceramics;
  (tier 3) the Vogel-Fulcher-Tammann form σ = A T^-1/2 exp(-B/(T - T0)) for polymers
  above their glass transition, tying to R2's statement that ion motion is assisted by
  chain motion [R14 or B3]. Your home page already carries a VFT figure; the two must
  agree.
- Transference number t_j = |z_j| u_j C_j / Σ_k |z_k| u_k C_k, the fraction of current
  carried by species j [B2 eq. 2.3.11], so for the lithium salt t+ = i+/(i+ + i-), which
  Boz et al. write in the dilute limit as t_Li+ = D_Li+/(D_Li+ + D-) [R36 eq. 7];
  R2 uses the term "transport number" for the same quantity, with typical values about 0.3
  and about 0.6 with nanofillers [R2]; the steady-state concentration gradient in a binary electrolyte, derived on the card
  from the salt balance of porous-electrode theory as given in Boz et al. eq. 12 [R36,
  after Newman]: at steady state with no reaction in the separator, D_eff dc/dx =
  -(1 - t+) i/F, so the concentration difference across a separator of thickness L is
  Δc = (1 - t+) i L / (F D_eff), and it vanishes for t+ = 1; this is why the transference
  number sets the concentration polarization [R36, Figure 1 after Newman].
- The electrolyte window from T2 restated with the numbers for water and carbonates
  [R1; R6].
- Graphs: log σ versus 1000/T for Arrhenius and VFT with sliders; the concentration
  profile across a membrane under current; the ordering diagram after R2 Fig. 8.

**T6. Insertion electrodes and solid-state diffusion** (story modules 6, 8)
- Fick's first law J = -D ∂C/∂x [B2 eq. 4.4.9] and second law; the diffusion length as
  B2 defines it, the root-mean-square displacement Δ = (2Dt)^1/2 [B2 eq. 4.4.3], so the
  time for lithium to cross a distance L inside a particle is of order L²/(2D) (an
  order-of-magnitude estimate, stated as such); what the C-rate means for that time
  [R6 for why smaller particles help].
- The GITT relation for the chemical diffusion coefficient, D̃ = (4/(π τ)) (m_X V_M /
  (M_X S))² (ΔE_s/ΔE_t)², valid for τ ≪ L²/D̃, with ΔE_s the change of the steady-state
  voltage and ΔE_t the total voltage change during the current pulse without the IR
  drop, read from the printed eq. 4 of Weppner and Huggins, J. Solid State Chem. 1977
  [R38]; the companion J. Electrochem. Soc. paper [R32] is cited alongside once verified.
- Insertion versus displacement versus conversion reactions written as reactions
  [R1 Fig. 15; R6; R2].
- Graphs: concentration profile in a sphere versus time; accessible capacity versus
  rate for two particle sizes; the GITT step with its two voltage differences marked.

**T7. Impedance spectroscopy** (story module 11)
- Z = R + jX with X = ωL - 1/(ωC) [R1 eq. 17, printed as R + jωX, a double ω; see the
  transcription check]; the Randles circuit; the R‖C semicircle
  Z = R_s + R_ct/(1 + jωR_ct C) with its peak at angular frequency ω = 1/(R_ct C), so
  f_max = 1/(2π R_ct C); R1's shorthand τ = 1/f_m = RC omits the 2π and the page says so
  [R1 sec. 1.5];
  the Warburg element Z_W = σ ω^-1/2 - j σ ω^-1/2 and the 45 degree line [B2 eq. 11.3.27];
  the Randles circuit (solution resistance in series with the double-layer capacitance in
  parallel with the faradaic impedance) [B2 section 11.3.1]; the kinetic semicircle of
  radius R_ct/2 centred at R_u + R_ct/2 with its maximum at ω = 1/(R_ct C_d) [B2 eqs.
  11.4.9 to 11.4.11].
- Graphs: Nyquist and Bode plots computed from the circuit with sliders for R_s, R_ct, C
  and σ_w; the equivalent circuit lit element by element (the T-track version of figure
  11.1).

**T8. Porous electrodes** (story module 8)
- Why porous electrodes exist: area, current density and polarization [R1 1.6].
- The macrohomogeneous picture: effective transport properties κ_eff = κ ε^α and
  D_eff = D ε/τ with tortuosity τ = ε^(1-α), the Bruggeman relation with α = 1.5 for a
  continuous conductive phase (1.53 measured for a LiFePO4 electrode) [R36 eqs. 10 and
  11, citing Thorat et al.]; the one-dimensional reaction distribution across a reaction-limited porous electrode,
  which follows hyperbolic cosh and sinh profiles whose characteristic depth is set by a
  dimensionless group combining the reaction rate with the electronic and ionic
  resistances of the electrode (Pathak and Bazant's Λ, with 1/Λ the characteristic depth;
  the overpotential becomes uniform as Λ → 0) [R41]; the classical linear-kinetics form
  with the ratio of matrix to electrolyte conductivity is cited to B5 once verified; the qualitative picture of a reaction peak
  moving from the current collector to the separator during discharge is in R36
  (Wang et al., 2012, Figure 11).
- Graphs: reaction rate versus depth for several conductivity ratios (the computed
  version of figure 8.2); penetration depth versus exchange current.

**T9. Degradation** (story module 10)
- Reversible versus irreversible capacity loss defined [R6]; Coulombic efficiency
  compounded over cycles: if every unit of charge lost per cycle is lithium lost for good,
  retention after N cycles is CE^N, which is why 99.9 % per cycle still matters. The card
  states this as an upper-bound idealization (real fade also includes reversible and
  rate-dependent parts, per R6) [arithmetic from the R6 definition].
- SEI growth regimes from von Kolzenberg, Latz and Horstmann [R37]: the SEI thickness
  scales as t^b with b = 0.5 for diffusion-limited growth (the literature standard, the
  √t law), b = 1 for reaction-limited growth or migration-limited growth during
  charging, and b = 0 for migration limitation during discharging, and capacity fade
  follows ΔQ ∝ t^b, 0 < b < 1, as the mechanisms hand over; SEI grows fastest at high
  state of charge and high charging rate [R37, eqs. 36 and 37 and Figure 7].
- Graphs: retention versus cycle number for several Coulombic efficiencies; the √t law
  against a linear law.

**T10. Heat and thermal runaway** (story module 12)
- Total heat: the reversible entropic term and the irreversible term I (E_OCV - E_T)
  [R1 eqs. 10 and 11, with the sign-convention caveat from the transcription check];
  the card writes the heat generated on discharge as Q̇ = I (U - V) - I T ∂U/∂T with U
  the open-circuit voltage, V the terminal voltage and ∂U/∂T the entropic coefficient, the
  first term irreversible (Joule heating and electrode overpotentials) and the second
  reversible entropic heat, so that a positive ∂U/∂T cools the cell on discharge, as R1's
  text states; this is the Bernardi equation as written in Jindal, Katiyar and
  Bhattacharya [R40, eq. 1], who cite Bernardi's 1985 energy balance [R43] and show that
  the equation is accurate for continuous discharge but overestimates heat generation
  under high-rate pulse discharge by up to 26 % (LiFePO4) and 49 % (NMC811), a caveat
  the card states.
- (tier 3) The Semenov picture of thermal runaway: heat generation rising exponentially
  with temperature against heat removal rising linearly; the crossing that has no
  return [R33 or a verified reaction-engineering text].
- Graphs: heat versus current split into the two terms; the Semenov diagram with a
  slider on cooling.

### Transcription check against the PDFs (done 2026-09-26)

You supplied the PDFs of R1 and R6, and every displayed equation was read from the
printed page and compared with the forms used in this plan.

**R6 (Goodenough and Park), all six equations confirmed as printed:**
(1.1) V_dis = V_oc - η(q, I_dis) and (1.2) V_ch = V_oc + η(q, I_ch), with η = I R_b;
(2) storage efficiency = 100 × ∫₀^Q_dis V_dis(q) dq / ∫₀^Q_ch V_ch(q) dq;
(3) Q = ∫₀^Δt I dt = ∫₀^Q dq; (4) Coulombic efficiency = 100 × Q_dis/Q_ch;
(5) energy = ∫₀^Δt I V(t) dt = ∫₀^Q V(q) dq; (6) V_OC = (μ_A - μ_C)/e; and
P(q) = V(q) I_dis in the text. The plan's forms match. R6 Figure 1 also shows the first
Li-ion cell with graphite on copper and LiCoO2 on aluminium, which now sources the
current-collector statement in module 2.

**R1 (Winter and Brodd), equations 1 to 17 read as printed.** Equations 1 to 5, 7 to 9,
11, 12 and 15 match the plan. Five printed equations carry typographical errors or
loose notation, and the page must not copy them verbatim:

| R1 eq. | As printed | Problem | What the page uses |
|---|---|---|---|
| 6 | E = E° + (RT/nF) ln(A_P/A_R) | Sign. Substituting eq. 3 and eq. 4 into eq. 5 gives -nFE = -nFE° + RT ln(A_P/A_R), so the term must be subtracted. | E = E° - (RT/nF) ln(A_P/A_R), derived on the card from R1's own eqs. 3 to 5, with a footnote that R1's eq. 6 is printed with a plus sign; standard form also cited to B2. |
| 10 | q = TΔS + I(E_OCV - E_T), "q = heat given off by the system" (eq. 11) | The sign of the entropic term depends on the convention for ΔS relative to the direction of current. Taken literally with ΔS of the discharge reaction, a positive ΔS would increase the heat given off on discharge, which contradicts R1's own text ("if dE/dT is positive, the cells ... cool on discharge"). | The card anchors on the physical statement in R1's text and on eq. 9 (ΔS = nF dE/dT), and writes the heat with an explicit convention: heat generated on discharge at current I is I(E_OCV - E_T) - I T (dE_OCV/dT), the Bernardi form, so that a positive dE/dT cools the cell on discharge. R1's printed eq. 10 is quoted with its convention caveat. |
| 13 | i = i_o exp(αFη/RT) - exp((1 - α)Fη/RT) | Missing bracket and missing minus sign in the second exponent; as printed the second term is not the cathodic branch. | i = i₀ [exp(αFη/RT) - exp(-(1 - α)Fη/RT)], the standard Butler-Volmer form with α_a = α and α_c = 1 - α, cited to B2, with a footnote on R1's printed form. |
| 14 | η = a - b log(I/I_o) | Consistent only for a particular sign of b; R1 says "a and b are constants". | The Tafel limit derived from Butler-Volmer at large η, η = (RT/αF) ln(i/i₀), with R1's form quoted as the empirical statement. |
| 16 | η = (RT/n) ln(C/C_o) | Missing F; RT/n has units of J/mol, not volts. | η = (RT/nF) ln(C/C₀), which passes the dimensional check; footnote on the printed form. |
| 17 | Z = R + jωX, with X = ωL - 1/(ωC) | ω counted twice; with X defined as printed, the impedance is R + jX. | Z = R + jX, X = ωL - 1/(ωC). |
| text | "τ = 1/f_m = RC" | Shorthand; the peak of the R‖C semicircle is at ω_max = 1/(RC), so f_m = 1/(2πRC). | Exact relation on the card; R1's shorthand noted. |

Consequence for the page: R1 is cited for the physics and the definitions, but every
equation on the theory page is either derived on the card from consistent premises or
cross-cited to B2 (Bard and Faulkner), and the six discrepancies above are documented
in the page's own footnotes so that a reader comparing with the review is not confused.
The verification record lists them.

### How "without any mistakes" is enforced

1. **One symbol table.** Every symbol has one meaning, one unit and one definition
   across both pages, kept in a single file that generates the symbol tables on every
   card.
2. **Symbolic checks.** A build-time SymPy script re-derives every derivation step by
   step and fails the build if any step does not follow from the previous one.
3. **Numeric checks.** The same script evaluates every worked example and compares it
   with the printed source value; the page's `physics.js` must reproduce the SymPy
   results to four significant figures, and both are tested before each deployment.
4. **Dimensional checks.** Every equation is checked with a units library so that both
   sides carry the same dimensions.
5. **Graph checks.** Each computed graph is generated twice, once by the page's
   JavaScript and once by the Python script, and the two are compared numerically.
6. **Transcription check** against the PDFs, as above.
7. **Rendering.** Equations are written in LaTeX in the source and converted at build
   time to MathML, which every current browser renders natively with no script or font
   download, and which screen readers can read. The converted output is checked into
   the repository so the published page is static.
8. **Your review.** Each card has a review-sheet row with your initials. A card with any
   failing check or an unverified source stays hidden on the live page.

## 6. Home-page changes

1. Add "Learn" to the top navigation, between Research and Experience, linking to
   `/batteries/`.
2. Add a teaser card at the end of the About section: two sentences and a button.
3. Add "Background: what is a polymer electrolyte?"-style links from research scenes 1
   to 4 to modules 7, 8, 9 and 11.
4. Update `sitemap.xml` with the new URL; add a canonical link, meta description,
   Open Graph tags and JSON-LD (`Article` with `educationalLevel`) to the new page.

## 7. Content and writing rules

- Plain language first, jargon second: each term is defined in the sentence where it
  first appears and again in the glossary.
- Say "negative electrode" and "positive electrode"; introduce anode and cathode once
  in module 2 and never rely on them afterwards.
- SI units, "V vs Li/Li+" written the same way as on the home page.
- One analogy per module at most, and each analogy states where it breaks.
- No experimental data on the page; schematic curves only, as on the home page.
- Every factual sentence cites a source from section 8; a sentence without a
  verified source is cut, not kept.
- All scientific text is reviewed by you before it goes live. I draft, you correct.

## 7b. Scientific precision rules

- Conventions are stated once and kept: "anode" is the negative electrode and "cathode"
  the positive one in the discharge sense, as R1 defines them; the page uses "negative
  electrode" and "positive electrode" thereafter. Potentials are given "versus Li/Li+"
  or "versus the standard hydrogen electrode", never bare.
- Every number carries its qualifier: theoretical or practical, gravimetric or
  volumetric, the rate, the temperature, the cut-off, and the date of the source when the
  value is a snapshot (for example "120 to 150 Wh/kg for the 1991 Sony cell [R2]").
- Definitions are quoted or closely paraphrased from R1 section 1.2 and R6 rather than
  reworded from memory.
- Equations from R6 are written as printed. Equations from R1 are written in the form
  that follows from R1's own premises and from Bard and Faulkner, because five of R1's
  printed equations contain typographical errors (documented in section 5d); each card
  states its source and any discrepancy with the printed review.
- Where the sources disagree or are dated, the page says so or omits the point: for
  example, R6 (2013) states that polymer electrolytes with conductivity above 1e-4 S/cm
  and good contact "have yet to be demonstrated"; the page presents this as the 2013
  assessment and cites R15 for later work.
- Historical claims name the people and years as given in R6 and R2 and are cited to
  the review, with the landmark paper cited alongside when its details pass verification.
- No mechanism, number or material is added that none of the verified sources contains,
  including in figure captions and alt text.

## 8. Citations: every statement traceable to a source

### Policy

- Every factual sentence on the page (a number, a mechanism, a definition, a historical
  claim) carries a numbered citation to a well-known textbook or a reputable
  peer-reviewed article. Analogies and your own opinions are marked as such and are the
  only uncited sentences.
- Acceptable sources, in order of preference: standard textbooks and handbooks; review
  articles in Chemical Reviews, Nature and its family, Journal of the Electrochemical
  Society, Chemistry of Materials, Energy and Environmental Science, Journal of Power
  Sources and similar; the original landmark paper when a discovery is named; official
  documents such as the Nobel Prize scientific background. No blogs, vendor pages,
  Wikipedia or lecture slides.
- Each citation is a superscript number in the text that links to the reference entry;
  each reference entry links to its DOI (articles) or gives publisher, edition, year and
  ISBN (books). A "Sources for this module" line at the end of each module lists the two
  to four references it rests on, so a reader can pick one book and continue.
- Reference format: authors, title, journal or publisher, year, volume, pages, DOI.
  Machine-readable too: each reference entry gets `itemtype="ScholarlyArticle"` or
  `Book` microdata so it counts as a proper citation for search engines.
- Your own publications are cited where they are the primary source (module 8 on the
  shared binder, module 9 on organic electrodes) and are never the only source for a
  general statement.

### Three tiers of source status

1. **Verified, full text in hand**: R1, R2, R6 and B2 (supplied by you). Their content and
   bibliographic details can go live now.
2. **Cross-checked**: landmark papers whose full details appear in the reference lists of
   R1, R2 or R6 (table below). Authors, journal, year, volume and page are corroborated;
   DOIs still need resolving.
3. **Candidate**: the rest of the list, from my knowledge of the field. Every detail must
   pass the verification gate.

### Verification gate (no exceptions)

Every DOI and ISBN is resolved and checked against the real record (authors, title,
year, pages) before the page is published. This environment cannot reach doi.org,
Crossref or ISBN services, so the check happens either in a session with network access
or by you. Until a reference passes, it is marked `[unverified]` in the draft and the
sentence it supports stays out of the live page. No citation is published from memory.

### Candidate source list

Books and articles beyond the three supplied ones are drawn from my knowledge of the
field and must pass the verification gate.
Books:

| Key | Reference |
|---|---|
| B1 | T. B. Reddy (ed.), Linden's Handbook of Batteries, 4th ed., McGraw-Hill, 2011. |
| B2 | A. J. Bard, L. R. Faulkner, H. S. White, Electrochemical Methods: Fundamentals and Applications, 3rd ed., Wiley, 2022. **Verified: full text supplied (tier 1).** Every item citing B2 was checked against it on 2026-09-26; equation numbers are given on the cards. |
| B3 | R. A. Huggins, Advanced Batteries: Materials Science Aspects, Springer, 2009. |
| B4 | P. Atkins, J. de Paula, J. Keeler, Atkins' Physical Chemistry, Oxford University Press, 11th or 12th ed. |
| B5 | J. Newman, N. P. Balsara, Electrochemical Systems, 4th ed., Wiley, 2021 (3rd ed. with K. E. Thomas-Alyea, 2004). |
| B6 | M. E. Orazem, B. Tribollet, Electrochemical Impedance Spectroscopy, 2nd ed., Wiley, 2017. |
| B7 | A. Lasia, Electrochemical Impedance Spectroscopy and its Applications, Springer, 2014. |

Articles:

| Key | Reference | DOI (to verify) |
|---|---|---|
| R1 | M. Winter, R. J. Brodd, "What Are Batteries, Fuel Cells, and Supercapacitors?", Chem. Rev. 2004, 104, 4245-4269. **Verified: full text supplied.** | 10.1021/cr020730k |
| R2 | J.-M. Tarascon, M. Armand, "Issues and challenges facing rechargeable lithium batteries", Nature 2001, 414, 359-367. **Verified: full text supplied.** | 10.1038/35104644 |
| R3 | J. B. Goodenough, Y. Kim, "Challenges for Rechargeable Li Batteries", Chem. Mater. 2010, 22, 587. | 10.1021/cm901452z |
| R4 | M. S. Whittingham, "Lithium Batteries and Cathode Materials", Chem. Rev. 2004, 104, 4271. | 10.1021/cr020731c |
| R5 | N. Nitta, F. Wu, J. T. Lee, G. Yushin, "Li-ion battery materials: present and future", Materials Today 2015, 18, 252. | 10.1016/j.mattod.2014.10.040 |
| R6 | J. B. Goodenough, K.-S. Park, "The Li-Ion Rechargeable Battery: A Perspective", J. Am. Chem. Soc. 2013, 135, 1167-1176. **Verified: full text supplied.** | 10.1021/ja3091438 |
| R7 | E. Peled, "The Electrochemical Behavior of Alkali and Alkaline Earth Metals in Nonaqueous Battery Systems: The Solid Electrolyte Interphase Model", J. Electrochem. Soc. 1979, 126, 2047. | 10.1149/1.2128859 |
| R8 | E. Peled, S. Menkin, "Review: SEI: Past, Present and Future", J. Electrochem. Soc. 2017, 164, A1703. | 10.1149/2.1441707jes |
| R9 | Royal Swedish Academy of Sciences, "Scientific Background on the Nobel Prize in Chemistry 2019: Lithium-ion batteries", 2019. | nobelprize.org document |
| R10 | K. Xu, "Nonaqueous Liquid Electrolytes for Lithium-Based Rechargeable Batteries", Chem. Rev. 2004, 104, 4303. | 10.1021/cr030203g |
| R11 | K. Xu, "Electrolytes and Interphases in Li-Ion Batteries and Beyond", Chem. Rev. 2014, 114, 11503. | 10.1021/cr500003w |
| R12 | D. E. Fenton, J. M. Parker, P. V. Wright, "Complexes of alkali metal ions with poly(ethylene oxide)", Polymer 1973, 14, 589. | 10.1016/0032-3861(73)90146-8 |
| R13 | M. Armand, "Polymer solid electrolytes: an overview", Solid State Ionics 1983, 9-10, 745. | 10.1016/0167-2738(83)90083-8 |
| R14 | D. T. Hallinan, N. P. Balsara, "Polymer Electrolytes", Annu. Rev. Mater. Res. 2013, 43, 503. | 10.1146/annurev-matsci-071312-121705 |
| R15 | J. Mindemark, M. J. Lacey, T. Bowden, D. Brandell, "Beyond PEO: Alternative host materials for Li+-conducting solid polymer electrolytes", Prog. Polym. Sci. 2018, 81, 114. | 10.1016/j.progpolymsci.2017.12.004 |
| R16 | J. Janek, W. G. Zeier, "A solid future for battery development", Nature Energy 2016, 1, 16141. | 10.1038/nenergy.2016.141 |
| R17 | A. Manthiram, X. Yu, S. Wang, "Lithium battery chemistries enabled by solid-state electrolytes", Nat. Rev. Mater. 2017, 2, 16103. | 10.1038/natrevmats.2016.103 |
| R18 | A. Kraytsberg, Y. Ein-Eli, "Conveying Advanced Li-ion Battery Materials into Practice: The Impact of Electrode Slurry Preparation Skills", Adv. Energy Mater. 2016, 6, 1600655. | 10.1002/aenm.201600655 |
| R19 | W. B. Hawley, J. Li, "Electrode manufacturing for lithium-ion batteries: Analysis of current and next generation processing", J. Energy Storage 2019, 25, 100862. | 10.1016/j.est.2019.100862 |
| R20 | W. Xu et al., "Lithium metal anodes for rechargeable batteries", Energy Environ. Sci. 2014, 7, 513. | 10.1039/C3EE40795K |
| R21 | V. Murray, D. S. Hall, J. R. Dahn, "A Guide to Full Coin Cell Making for Academic Researchers", J. Electrochem. Soc. 2019, 166, A329-A333 (open access). **Verified: full text supplied.** | 10.1149/2.1171902jes (printed in the article) |
| R22 | X.-B. Cheng, R. Zhang, C.-Z. Zhao, Q. Zhang, "Toward Safe Lithium Metal Anode in Rechargeable Batteries: A Review", Chem. Rev. 2017, 117, 10403. | 10.1021/acs.chemrev.7b00115 |
| R23 | N. Yabuuchi, K. Kubota, M. Dahbi, S. Komaba, "Research Development on Sodium-Ion Batteries", Chem. Rev. 2014, 114, 11636. | 10.1021/cr500192f |
| R24 | P. Poizot, J. Gaubicher, S. Renault, L. Dubois, Y. Liang, Y. Yao, "Opportunities and Challenges for Organic Electrodes in Electrochemical Energy Storage", Chem. Rev. 2020, 120, 6490. | 10.1021/acs.chemrev.9b00482 |
| R25 | Y. Lu, J. Chen, "Prospects of organic electrode materials for practical lithium batteries", Nat. Rev. Chem. 2020, 4, 127. | 10.1038/s41570-020-0160-9 |
| R26 | B. Esser et al., "A perspective on organic electrode materials and technologies for next generation batteries", J. Power Sources 2021, 482, 228814. | 10.1016/j.jpowsour.2020.228814 |
| R27 | M. Armand, J.-M. Tarascon, "Building better batteries", Nature 2008, 451, 652. | 10.1038/451652a |
| R28 | J. Vetter et al., "Ageing mechanisms in lithium-ion batteries", J. Power Sources 2005, 147, 269. | 10.1016/j.jpowsour.2005.01.006 |
| R29 | C. R. Birkl, M. R. Roberts, E. McTurk, P. G. Bruce, D. A. Howey, "Degradation diagnostics for lithium ion cells", J. Power Sources 2017, 341, 373. | 10.1016/j.jpowsour.2016.12.011 |
| R30 | J. S. Edge et al., "Lithium ion battery degradation: what you need to know", Phys. Chem. Chem. Phys. 2021, 23, 8200. | 10.1039/D1CP00359C |
| R31 | N. Elgrishi et al., "A Practical Beginner's Guide to Cyclic Voltammetry", J. Chem. Educ. 2018, 95, 197. | 10.1021/acs.jchemed.7b00361 |
| R32 | W. Weppner, R. A. Huggins, "Determination of the Kinetic Parameters of Mixed-Conducting Electrodes and Application to the System Li3Sb", J. Electrochem. Soc. 1977, 124, 1569. | 10.1149/1.2133112 |
| R33 | X. Feng et al., "Thermal runaway mechanism of lithium ion battery for electric vehicles: A review", Energy Storage Materials 2018, 10, 246. | 10.1016/j.ensm.2017.05.013 |
| R34 | Q. Wang et al., "Thermal runaway caused fire and explosion of lithium ion battery", J. Power Sources 2012, 208, 210. | 10.1016/j.jpowsour.2012.02.038 |
| R35 | G. Harper et al., "Recycling lithium-ion batteries from electric vehicles", Nature 2019, 575, 75. | 10.1038/s41586-019-1682-5 |
| R36 | B. Boz, T. Dev, A. Salvadori, J. L. Schaefer, "Review: Electrolyte and Electrode Designs for Enhanced Ion Transport Properties to Enable High Performance Lithium Batteries", J. Electrochem. Soc. 2021, 168, 090501 (open access, CC BY). **Verified: full text supplied.** | 10.1149/1945-7111/ac1cc3 (printed in the article) |
| R37 | L. von Kolzenberg, A. Latz, B. Horstmann, "Solid-Electrolyte Interphase During Battery Cycling: Theory of Growth Regimes", ChemSusChem 2020, 13, 3901-3910. **Verified: full text supplied.** | 10.1002/cssc.202000867 (printed in the article) |
| R38 | W. Weppner, R. A. Huggins, "Electrochemical Investigation of the Chemical Diffusion, Partial Ionic Conductivities, and Other Kinetic Parameters in Li3Sb and Li3Bi", J. Solid State Chem. 1977, 22, 297-308. **Verified: full text supplied.** | 10.1016/0022-4596(77)90006-8 (from the article's PII; resolve to confirm) |
| R40 | P. Jindal, R. Katiyar, J. Bhattacharya, "Evaluation of accuracy for Bernardi equation in estimating heat generation rate for continuous and pulse-discharge protocols in LFP and NMC based Li-ion batteries", Applied Thermal Engineering 2022, 201, 117794. **Verified: full text supplied.** | 10.1016/j.applthermaleng.2021.117794 (printed in the article) |
| R41 | S. Pathak, M. Z. Bazant, "Scaling and Analytical Approximation of Porous Electrode Theory for Reaction-limited Batteries", J. Electrochem. Soc. 2026, 173, 160518. **Verified: full text supplied.** | 10.1149/1945-7111/ae9229 (printed in the article) |
| R42 | R. D. Shannon, "Revised effective ionic radii and systematic studies of interatomic distances in halides and chalcogenides", Acta Crystallogr. A 1976, 32, 751. Values supplied by you: Li+ 76 pm, Na+ 102 pm (six-coordinate). | 10.1107/S0567739476001551 (to verify) |
| R43 | D. Bernardi, E. Pawlikowski, J. Newman, "A General Energy Balance for Battery Systems", J. Electrochem. Soc. 1985, 132, 5. Cross-checked from the reference list of R40. | 10.1149/1.2113792 (printed in R40's reference list; to resolve) |
| R39 | M. Z. Bazant, "Theory of Chemical Kinetics and Charge Transfer based on Nonequilibrium Thermodynamics", Acc. Chem. Res. 2013, 46, 1144-1160. **Content verified from the author's May 2012 draft (titled "Theory of Electrochemical Kinetics based on Nonequilibrium Thermodynamics"); the published bibliographic details and equation numbers must be confirmed against the journal version before citing.** | 10.1021/ar300145c (to verify) |

### Cross-checked landmark references (details from the supplied articles' reference lists)

| Key | Reference | Corroborated by | Use |
|---|---|---|---|
| L1 | M. S. Whittingham, "Electrochemical energy storage and intercalation chemistry", Science 1976, 192, 1126. | R6 ref 12 (p. 1126); R2 ref 7 prints 1226, a misprint to resolve at DOI check | Module 6 history |
| L2 | K. Mizushima, P. C. Jones, P. J. Wiseman, J. B. Goodenough, "LixCoO2 (0<x<=1): a new cathode material for batteries of high energy density", Mater. Res. Bull. 1980, 15, 783. | R6 ref 4; R2 ref 13 | Modules 3, 6 |
| L3 | E. Peled, J. Electrochem. Soc. 1979, 126, 2047 (SEI model). | R6 ref 13; matches candidate R7 | Module 6 |
| L4 | R. Yazami, Ph. Touzain, J. Power Sources 1983, 9, 365 (lithium in graphite). | R6 ref 16 | Module 6 |
| L5 | D. E. Fenton, J. M. Parker, P. V. Wright, Polymer 1973, 14, 589 (PEO-alkali salt complexes). | R2 ref 57; matches candidate R12 | Module 7 |
| L6 | M. Armand, "The history of polymer electrolytes", Solid State Ionics 1994, 69, 309. | R2 ref 56 | Module 7 (replaces candidate R13 if R13 fails) |
| L7 | A. K. Padhi, K. S. Nanjundaswamy, J. B. Goodenough, J. Electrochem. Soc. 1997, 144, 1188 (LiFePO4). | R6 ref 39 | Modules 3, 8 |
| L8 | M. M. Thackeray, W. I. F. David, P. G. Bruce, J. B. Goodenough, Mater. Res. Bull. 1983, 18, 461 (lithium in manganese spinels). | R6 ref 26; R2 ref 14 | Module 6 |
| L9 | M. Lazzari, B. Scrosati, J. Electrochem. Soc. 1980, 127, 773 (cell with two intercalation electrodes). | R2 ref 17 | Module 6 |
| L10 | D. W. Murphy, P. A. Christian, Science 1979, 205, 651. | R2 ref 12 | Module 6 |
| L11 | R. Fong, U. von Sacken, J. R. Dahn, J. Electrochem. Soc. 1990, 137, 2009 (graphite in carbonate electrolytes). | R6 ref 9 | Module 6 |
| L12 | P. Poizot, S. Laruelle, S. Grugeon, L. Dupont, J.-M. Tarascon, Nature 2000, 407, 496 (conversion oxides). | R2 ref 52 | Module 9 |
| L13 | F. Croce, G. B. Appetecchi, L. Persi, B. Scrosati, Nature 1998, 394, 456 (nanocomposite polymer electrolytes). | R2 ref 65 | Module 7 |
| L14 | D. Aurbach, J. Power Sources 2000, 89, 206 (electrode-solution interactions). | R2 ref 67 | Modules 9, 10 |
| L15 | J. B. Bates, N. J. Dudney, B. Neudecker, A. Ueda, C. D. Evans, Solid State Ionics 2000, 135, 33 (thin-film batteries). | R2 ref 68 | Module 9 |
| L16 | K. Zaghib et al., J. Power Sources 2011, 196, 3949 (30 000 cycles, LTO and LiFePO4). | R6 ref 2 | Modules 5, 6 |
| L17 | J. Rouxel, M. Danot, M. Bichon, Bull. Soc. Chim. 1971, 11, 3930 (intercalation in NaxTiS2). | R2 ref 5 | Module 6; a Nantes connection worth a sentence |
| L18 | M. Armand, J. M. Chabagno, M. J. Duclot, in Fast Ion Transport in Solids, North-Holland, 1979, 131. | R2 ref 24 | Module 7 (origin of the PEO battery proposal) |
| L19 | T. Nagaura, K. Tozawa, Prog. Batteries Solar Cells 1990, 9, 209 (Sony Li-ion). | R2 ref 23 | Module 6 |
| L20 | D. Guerard, A. Herold, C. R. Acad. Sci. C 1972, 275, 571 (lithium insertion in graphite). | R2 ref 20 | Module 6 |

Gaps to fill with your help: a source you trust for everyday charging habits (module 12)
and for the potential ladder values of your organic materials (module 3), which should
come from your own publications or Poizot et al. [R24].

### How citations appear on the page

- In text: `...the electrolyte must conduct ions but not electrons.<sup><a href="#ref-B1">1</a></sup>`
  Numbers run through the whole page; the same source keeps the same number.
- End of each module: "Sources for this module: [1] [3] [7]" with short titles.
- End of page: full reference list, grouped as Books and Articles, each with DOI link.
- Every schematic figure whose shape is based on a source cites it in the caption
  ("Shape after Vetter et al. [28], schematic").

## 9. Delivery phases

| Phase | Scope | Output | Effort |
|---|---|---|---|
| 0 | Extract shared CSS and scripts; verify home page unchanged; verify every candidate DOI and ISBN in a networked session or by you | `assets/css/site.css`, `assets/js/*.js`, before/after screenshots | half a day |
| 1 | Page skeleton, nav, hero, chapter rail, shared `physics.js` with tests, modules 1 to 3 with their 11 figures, drafted from R1, R2 and R6 with citations in place | `/batteries/` live behind a nav link | 3 to 4 days |
| 2 | Modules 4 to 8 with their 25 figures, including the Faraday calculator, the galvanostatic simulator, the rocking chair and the impedance sweep | | 6 to 7 days |
| 3 | Modules 9 to 12 with their 20 figures, glossary, check-yourself, further reading | | 4 to 5 days |
| 3b | Theory page: symbol table, equation cards for T1 to T10 with computed graphs, the SymPy, numeric, dimensional and graph checks, LaTeX-to-MathML build step; tier-3 cards built last and hidden until their sources verify | `/batteries/theory/` live | 5 to 6 days |
| 4 | Your scientific review including the figure review sheet (one row per figure), citation audit, three test readers (section 5c), mobile and print QA, Lighthouse, sitemap and SEO | | 2 days plus review and reader time |

Each phase is one branch and one deployment, so the page can go live after phase 1
with a "more coming" note if you prefer. Figures are the bulk of the effort: about 56
in total, of which roughly 20 are interactive or computed.

## 10. Quality checks before each deployment

- Renders correctly at 360 px, 820 px and 1300 px widths (Playwright screenshots).
- Reduced-motion and print modes show static, complete figures.
- Keyboard: every interactive control reachable and usable; visible focus.
- Lighthouse accessibility and performance both above 90.
- Page under 200 KB of HTML with figures inline; no external requests besides fonts.
- Every internal link resolves; no reference to experimental values.
- Every factual sentence carries a citation; every DOI link resolves to the cited record; no `[unverified]` marker remains.
- Pacing rules hold: no stretch over 120 words without a figure, one analogy per module, every module under three minutes at the main level; the twelve "you can now explain" lines read as a coherent summary on their own.
- Theory page: symbolic, numeric, dimensional and graph checks all pass; every equation card that is visible has a verified source and a transcription check against the PDF; no tier-3 card is visible before its source verifies.
- Every figure has a completed review-sheet row; `physics.js` tests pass; each animation's final frame is checked against the direction-and-sign table.

## 11. Decisions for you

1. URL: `/batteries/` (recommended) or `/learn/`?
2. Phase 0 extraction of shared assets: yes (recommended) or self-contained page?
3. Depth of Part B and C: keep "Go deeper" panels, or fold them into the main text?
4. Include the check-yourself quiz and glossary tooltips, or keep the page text-only?
5. Any modules to add or drop? Candidates to add: "a short history of batteries",
   "how a battery is manufactured", "sodium-ion in more detail".
6. Language: English only, or a French version later?
7. Citation style: numbered superscripts (recommended, compact) or author-year in
   brackets?
8. Who runs the DOI and ISBN verification: you, or a later session of mine with
   network access?

9. Figure density: the catalogue has three to five figures per module. Keep all, or
   trim to the interactive ones plus one schematic per module to ship sooner?
10. The "your cell" thread: keep it (recommended, it is what makes the page personal)
    or simplify to a fixed example cell throughout?
11. Theory depth: chapters T1 to T10 as listed, or drop the tier-3 items (regular-
    solution model, VFT, Newman concentration gradient, GITT, Warburg, porous-electrode
    model, SEI growth law, Bernardi heat, Semenov) to keep the theory page entirely
    within R1, R6 and Bard and Faulkner?
12. (Resolved: the PDFs of R1 and R6 were supplied and the transcription check is
    done; see section 5d.) Can you also supply the PDF of R2 so its Figure 5 values and
    Figure 8 curve ordering can be checked against the printed figure rather than the
    extracted text?
13. (Resolved in two rounds: Bard, Faulkner and White verified every item citing it;
    then Boz 2021, Bazant 2012/2013, Weppner and Huggins 1977 and von Kolzenberg 2020
    verified the regular-solution model, the concentration gradient and transference
    number, the Bruggeman relation, GITT and the SEI growth law.) A third round (Murray, Hall
    and Dahn 2019; Jindal et al. 2022; Pathak and Bazant 2026; your Shannon radii)
    verified the coin-cell stack, the Bernardi equation and the cosh reaction profile.
    Still tier 3, with no source in hand: the VFT conductivity law and the Semenov
    runaway picture. To resolve by DOI only: Shannon 1976, Bernardi 1985 and the
    published version of Bazant's Account.
14. Do you have further articles or a textbook in hand (Linden's Handbook, Bard and
   Faulkner) that you can supply as full text, as you did for these three? Anything
   supplied moves to tier 1 and can be used immediately.

Assumed until you say otherwise: `/batteries/`, extraction in phase 0, all twelve modules,
glossary and quiz included, English only, and the three supplied articles as the primary
sources wherever they apply.
