# Restructure log: "How batteries work" as a multi-page course

Plan (Claude Doc, owner's copy): https://claude.ai/code/artifact/01cc00f2-333e-45af-96c1-20eb393b4296
Read the plan first; this file records state, decisions and the checklist so work survives across sessions.

## Decisions (settled 2026-10-05)
- 24 short pages: 19 chapters (0 to 18) in five parts, and a separate 5-page lab handbook (Lab 1 to Lab 5).
- Chapter 0 (electrostatics) opens the main line.
- Addresses are words (/batteries/cell-voltage/); the handbook lives at /batteries/lab/.
- Default "your cell": graphite against LiCoO2.
- Title: "How batteries work"; subtitle "The electrochemistry of lithium-ion cells, from first principles to the laboratory".
- Scientific chapter titles, menu labels (<= 20 characters) and section headings: see the plan, "Titles and headings".
- Checkpoints: local-only git commits on branch claude/ecstatic-bohr-ym5qe9. The push URL of origin is set to
  DISABLED-local-only in .git/config, so nothing can be pushed by accident. figs/ (QA screenshots, 70 MB) is excluded
  locally via .git/info/exclude.
- Not cited: the owner's thesis (owner's instruction, 2026-10-04).

## Execution principles
1. Scripts move content; nothing verified is retyped.
2. Baseline capture first (94 figures at 1300 and 360 px, sentence list with citations, page sizes); compare after
   phases 1 and 2: figures identical except numbers, sentences identical except references.
3. Identity build (13 modules as 13 pages) before switching the manifest to the 24-page order.
4. Build code has one owner (main session); figure script split by a dependency scan (helpers shared across files).
5. Writing and checking fan out to helper agents; a checker never checks its own text.
6. Targeted gates while working; full gate in the background at each phase gate (2 CPUs here).
7. Each phase ends with: local commit, preview, zip, project files, status line in the plan.

## Checklist
- [x] Plan written and decisions settled (2026-10-05)
- [x] Checkpoint commit 6e49fba (state before the restructure)
- [x] Phase 1: baseline capture (/home/claude/baseline in the session; tools/qa/capture.js, compare.py, inventory.py)
- [x] Phase 1: course.json manifest
- [x] Phase 1: beat parser (tools/course_parse.py: 13 modules reassemble byte for byte, 93 beats)
- [x] Phase 1: build extended (tools/build_course.py: page template, previous/next, cross-reference markers,
      per-page citations, per-page script bundles cut at statement level)
- [x] Phase 1: identity build matches baseline (commit 10d7bdf)
- [x] Phase 2: manifest switched to 24 pages; references converted (377); figures renumbered; comparison clean;
      full gate (commit 88f7beb)
- [x] Phase 3: hub, contents panel, search, index of terms, read ticks, keyboard, redirects; link check;
      accessibility (commit 5e29990). Tooltips for terms left out: the index of terms links each term to the
      sentence that introduces it instead.
- [ ] Phase 4: openers, bridges, mix-ups, check-yourself; lecture rewrite of chapters 0 to 4; merges (SEI, ageing,
      solid electrolytes); independent checks per part
- [ ] Phase 5: new content with sources (uses of batteries, cell formats, crystal families, battery care)
- [ ] Phase 6: reader test with three first-year students; owner initials in figure-review
- [ ] Phase 7: pull request on the branch, when the owner says so

## Phase 3 record (2026-10-05)
- New files: src/learn/hub.src.html (course home), tools/course_nav.py (top bar, drawer, outline, search index,
  reading times, index of terms), assets/js/course.js (drawer, scrollspy, search, keys, back chip, read ticks,
  continue, old-anchor forwarding), tools/qa/linkcheck.py. assets/js/learn.js (old single-page bundle) removed;
  `python3 tools/build_learn.py` now builds the course (`--single-page` for the old page).
- Generated: batteries/index.html (hub), batteries/{terms,figures,equations,references}/, assets/js/course-index.js
  (search index, about 210 kB, loaded only when the search opens), sitemap.xml.
- Reading times: main text at 150 words a minute plus a minute a figure, rounded to 5 minutes.
- Headings: chapter title h1, section headings h2 (the sources keep h3 class="sub"; the build promotes them).
- Figure changes: 12.4 (x axis label "lithium content, %", tick "100") and L3.3 (note and plot top moved) for
  label clearance at 360 px; drawings with keyboard parts get role="group" (learn-core boot).
- Checks: figures identical to phase 2 except those; text inventory identical (840 blocks); gate exit 0 on 28 pages
  (labels clean, 0 broken citations); axe (wcag2a, wcag2aa, best-practice) clean on 29 pages with the drawer
  closed and open; 0 broken internal links; 74 tests pass.
- Prose still says "module" in places (for example "everything else in this module"): to be rewritten in phase 4.

## Motion layer (2026-10-15, owner's request: "cool animations and transitions", course only, rich but purposeful)
- assets/js/motion.js (runs only without reduced motion and with GSAP present; nothing is hidden otherwise), CSS at the
  end of assets/css/learn.css, a small head script in src/learn/page.src.html for page arrivals.
- Between pages: cross-document view transitions (Chrome/Edge 126+, Safari 18.2+; others load normally). The top bar
  stays; the page slides forward or back by course order; a course-home card's title grows into the chapter title.
- Course home: hero assembles (title words rise, cell figure tilts in and lights), a wire through the parts charges
  with an ion as the map scrolls, cards stagger in, follow the pointer (light and tilt), the start button leans.
- Chapters: opening rises in, outlined chapter numeral behind the title, figures slide in from their side and light up,
  text staggers, section rules draw, lessons fill, folds open and close smoothly, a linked place flashes, the reading
  level switch cross-fades, background ions speed up while scrolling, a cell in the top bar charges as you read.
- Checks: figures identical (reduced-motion capture, 0 differences), gate exit 0 on 29 pages with motion on, axe clean
  with motion on, 0 broken links, 74 tests.

## Redesign on white (2026-10-15, owner's request: move away from the dark teal and amber look; whole site)
- Palette (assets/css/site.css :root): white paper, ink #14171C, muted #596170, cobalt accent #1F48D6, emerald second
  #0B7A5E, hairlines #E4E7EC / #C9CED6. Token names changed with it: --amber -> --accent, --amber-2 -> --accent-strong,
  --cyan -> --second, --cyan-2 -> --second-strong, --serif -> --display (all sources renamed by script).
- Figure palette (learn.css): cation and our ion cobalt, electrons signal yellow with a dark edge, anions slate, field
  violet, heat red, potential ink. Hard-coded figure colours mapped to tokens; labels drawn on filled shapes get a white
  halo; hero graphite drawn light. Background floating ions switched off (they read as dust on white).
- Fonts: Schibsted Grotesk (headings), IBM Plex Sans (text, figure labels; has Greek), IBM Plex Mono (structural labels,
  figure numbers, years). tools/qa/fonts.js serves local copies (QA_FONTS_DIR with the three @fontsource packages).
- Colour words in captions, keys and step texts updated (amber -> blue, cyan -> green, lilac -> violet, white route ->
  black route, pale electrons -> yellow, and so on; about 70 places).
- Home page (index.html, home.js) recoloured with the same tokens; favicon and theme colour new.
- Fixes found on the way: figure 3.4 ion and electron start on their paths (labels no longer collide), column header
  clear of the wire; figure keys at full opacity for contrast.
- Checks: all 94 figures reviewed on contact sheets; gate exit 0 on 29 pages with the new fonts; axe (incl. colour
  contrast) clean on 29 course pages and the home page; 0 broken links; 74 tests.

## Realistic colours in the figures (2026-10-15, owner's request: realistic colours for all figures, better graphics)
- Rule: every physical part is drawn in the colour it has in a real cell; ions, electrons, fields, curves, plots and
  state overlays (lithium content, reacting zone, selected part) keep the teaching colours, since they have no colour
  of their own.
- Material library in learn-core.js: MAT holds 25 materials (copper, aluminium, steel, lithium, zinc, graphite,
  silicon, LiCoO2-type oxide powder, LiFePO4, Li4Ti5O12, TiS2, sulfur, carbon black, binder, separator, electrolyte,
  CuSO4 solution, SEI, ceramic, polymer, framework oxide, Fe2O3, iron, Li2O, graphene oxide). One hidden SVG holds the
  shared gradients: M (sheet lit from the left), MV (lit from the top), MB (shaded sphere), MC (plain colour), and a
  soft contact shadow (#fx-lift). Helpers: rungMat (electrode of a ladder rung), cellCan (cylindrical cell: steel can,
  wrap, + nub), tank (glass vessel with a highlight).
- Applied in figures 0.3 to 0.5 and the hero, 1.1 to 1.3, 2.1 to 2.3, 3.1, 3.2, 5.1, 5.2, 5.8p, 5.8, 6.1, 6.3, 6.4,
  7.2, 7.6, 7.8, 7.10, 7.11, 8.1 to 8.4, 9.2, 9.3, 9.5 to 9.7, 9.9, 9.10, 10.2, 10.3, L2.2 (film), L3.6 (cell and
  analyzer). Molecules keep CPK colours; crystal frameworks are neutral grey.
- Figure keys use material swatches (.key i.m-<material>, radial gradients generated from MAT); colour words in steps,
  captions and titles updated (green dots -> pale blue dots, gold rim -> brown rim, dark particle -> pale dashed
  particle, and so on).
- Fixes found on the way: cycler box of 5.1 drawn above its wire; exponent in 5.8p typeset (ε^1.5); carbon label of
  8.3 clear of the particle; badges of 7.11 and 10.4 no longer overlap or clip; analyzer label of L3.6 fits its box.
- Checks: all figures reviewed on contact sheets; gate exit 0 on 29 pages; axe clean (reduced motion) on 29 course
  pages and the home page; 0 broken links; 74 tests.

## Realistic colours on the home page (2026-10-15, owner's request)
- index.html gets one hidden SVG with the shared material gradients (same palette as the course: copper, aluminium,
  lithium, steel, polymer electrolyte, composite electrode, organic particle, carbon black) and the contact shadow.
- Hero cell: copper and aluminium collectors, silver lithium, off-white polymer electrolyte with its chains, a black
  composite electrode (carbon black) with pale organic particles; key updated. Binder figure: polymer electrolyte
  beside a black composite. In situ figure: pale particles with black carbon black, Ketjenblack drawn as black beaded
  chains. Clamp: steel plates, lithium, polymer electrolyte, electrode, relabelled. Recovery: a dark electrode
  fragment, stream labels moved inside their boxes. Map: blue sea, sand land, haloed labels.
- Plots and the development chain keep the site colours. The organic particles use a neutral pale tone, not a
  measured colour of the material.
- Checks: axe clean on the home page; 0 broken links.

## Home page figures repaired (2026-10-15, owner's request: "all the figures in the home page have many problems")
- Checked every figure with motion on and off, at 1300 px and 390 px.
- Hero cell: redrawn on a narrower canvas so labels stay readable on phones; layer names on two lines, Cu and Al
  labels above their foils, key moved below the cell, the discharge arrow the key refers to is now drawn, polymer
  chains clipped to their layers (they spilled out of the cell).
- Voltage trace: axis label no longer sits on the axis; the curves start above the axis (the cell never reaches 0 V);
  narrower canvas for phones.
- Binder figure: panel titles and region labels that fit on phones (labels were cut off), the ion routes drawn, a
  red cross where the path stops, ions no longer at the top-left corner with reduced motion, route clear of particles.
- In situ figure: every particle sits on the Ketjenblack chains; carbon black drawn as small aggregates; capacity
  values above their bars with reduced motion (they were inside them).
- Conductivity and impedance: shorter titles that no longer run together on phones; axis labels off the axes; proper
  −Z″ and Z′; "poor contact" off the arcs; clamp stack with leader-line labels (they overlapped), plate no longer
  pushed into the lithium, aluminium foil under the electrode, more room above the stack.
- Recovery: particles no longer land on the stream labels; labels inside their boxes; textured electrode fragment.
- Map: the Nantes to Thiruvananthapuram arc no longer runs through the Ulm label or the Thiruvananthapuram label.
- Development chain: a step lights only when the line reaches it; size capped.
- Checks: axe clean on the home page; 0 broken links.

## Cite this page (2026-10-15, owner's request: a citation option, course pages only)
- Every course page (hub, chapters, lab pages, reference pages) ends with a "Cite this page" block (the hub: "Cite this
  course"). Without scripts it shows an APA reference. assets/js/cite.js adds: this page or the whole course; APA 7,
  Nature, Harvard (Cite Them Right), BibTeX and RIS; copy (with italics where the paste target keeps them); .bib and
  .ris download; today's date as the access date. The chosen format is remembered in the browser.
- Author as cited: Shyma Sajeevan, Aswadh (family name, given name). Date: the last commit that changed the course
  sources (tools/build_course.py, course_date()); the year in the references comes from it.
- Head metadata for reference managers and indexers: Highwire citation_* tags and Dublin Core (DC.*); the JSON-LD gains
  the author's given and family names and dateModified. The footer links to the block ("cite this page").
- Checks: block tested in a browser (all formats, scope switch, copy, download) at 1300 and 390 px; gate exit 0 on 29
  pages (f7-6 once reported an overlap from its randomly moving ion; two reruns clean); axe clean; 0 broken links;
  74 tests.

## Three new sources (2026-10-15, owner's request: use all valuable information from three articles)
- Sources added to references.json: R81 Villevieille, Novák and Girault, "Your battery may not be a battery", Nature
  Nanotechnology (2026), doi 10.1038/s41565-026-02296-w; R82 Faruque et al., "A comprehensive review of past and present
  developments of Li-ion batteries", Discover Sustainability 7, 881 (2026), doi 10.1007/s43621-026-02920-8; B3 Arote,
  "Fundamentals and perspectives of lithium-ion batteries", in Lithium-ion and Lithium-Sulfur Batteries (IOP, 2022),
  doi 10.1088/978-0-7503-4881-2ch1. All three read in full.
- New figures: 1.4 "What makes a battery a battery?" (the Comment's five criteria applied to its eighteen systems; the
  graphite "volumic capacitor" view presented as the authors' proposal, not settled usage); 1.5 "From Volta's pile to
  the lithium-ion cell" (eight dated events); 2.3 "Four formats" (coin, cylindrical, prismatic, pouch; CR2025 and
  504050 decoded); 4.4 "Three efficiencies" (coulombic, voltage and energy efficiency as areas, charge factor, worked
  example); 15.2 "Four candidate charge carriers" (Li, Na, K, Ca); 17.2 "The chain of heat" (reactions in the cell and
  positive electrodes); 17.4 "How cells are tested" (four abuse families, standards, GB/T 31485 heating test, BMS,
  insulation resistance). Numbers as built; later figures in those chapters move up by one.
- New text: mechanical abuse; Li-ion self-discharge; ionic liquids; polymer versus liquid conductivity; whole-cell
  costs and cycle life; nanoscale LiCoO2 as pseudocapacitive; the 15 to 35 °C operating band; lithium sourcing and waste.
- Left out on purpose (errors or unsupported claims in the sources): the Parthian "battery"; "85 to 94.85 %" lithium
  recovery by pyrometallurgy; a typo in lithium's volumetric capacity; a garbled overcharge test; the "water with
  ethylene" coolant; odd vibration-test numbers; Arote's swapped 18650 dimensions (so cylindrical codes are named but
  not decoded) and his second, conflicting coulombic-efficiency definition (only the charge ratio is used).
- Layout: on screens up to 820 px the beat grid is minmax(0, 1fr), so a wide table now scrolls inside its frame
  instead of widening the page (sodium-organic did this before); select menus may wrap on phones; range sliders shrink
  to 80 px. Figure 4.4 sliders step in 0.01 V and 0.05 %, so the defaults match the worked example exactly.
- Checks: alternate views reviewed at 1300 and 360 px; gate exit 0 on 24 pages; axe clean; 29 pages, 0 broken links;
  74 tests.

## More from Arote 2022, chapter 1 (2026-10-15, owner's request: more content and figures from that chapter)
- Five new figures (numbers as built): 1.6 "A family tree of batteries" (primary and secondary cells with their
  electrode materials in real colours and nominal voltages from Winter and Brodd's table; lithium-ion sorted by
  electrolyte and by shape); 2.5 "What each layer can be made of" (exploded cell, tap a layer for its menu of materials
  and one next-generation option); 4.3 "State of charge, depth of discharge and the C-rate" (gauge, cut-offs, overcharge
  and over-discharge, deep discharge, time to empty at C/20 to 2C); 4.4 "Power, and what the internal resistance
  costs" (P = IV - I²R, peak at V/2R); 4.7 "Why lithium-ion won, and what it costs" (mass per kWh, pros and cons).
  Later figures in chapters 2 and 4 move up.
- New text: primary and secondary batteries; the materials menu and next-generation directions; datasheet vocabulary
  (capacity, 3600 C per Ah, C-rate, SOC, DOD, cut-offs, cycle life tied to DOD, shelf life) with an EV worked example;
  power density and internal resistance with a worked example; why lithium-ion displaced older chemistries and its
  drawbacks; ΔG = ΔH - TΔS and first-principles voltages (cell-voltage); three causes of practical shortfall
  (polarization); Co3+/Co4+ and constant electrolyte lithium content (rocking chair); production details (slot die,
  two-step calendering, slitting, drying, tab welding, sealing, formation); coin and cylindrical names and uses;
  protection as a consequence of lithium-ion's drawbacks (safety).
- Corrected or left out from the chapter: ΔH = ΔU + PΔV (the chapter prints a minus) and the sign of the computed
  voltage; "100 Ah at 1C is 10 A" (it is 100 A, consistent with the chapter's own 500 A at 5C); lithium-ion called a
  dry cell with a paste electrolyte; lithium "mixing with carbon to generate lithium carbonate"; lithium deposited on
  the negative electrode during charge; the garbled memory-effect, power-efficiency, constant-current and
  constant-voltage definitions; "cannot be used in transportable devices"; pouch cells' "low cycle life"; all
  electrodes "layered"; the duplicate LiMn2O4 entry; the conflicting 1000-1500 cycle figure.
- Layout: equation split so that it fits a phone; {{cite}} markers are not used inside figure scripts (they do not
  render there); figure bases name the sources instead.
- Checks: new figures reviewed at 1300 and 360 px; gate exit 0 on 29 pages; axe clean on the eight touched pages;
  29 pages, 3270 links, 0 broken; 74 tests.

## Figure 1.2 reaction marker (2026-10-15, owner's report: the circle appears in the wrong place)
- The reaction ring at the metal-electrolyte boundary used to appear at a random height, unrelated to any ion, while
  cations that reached the boundary jumped back to the far side without reacting. Now each cation that reaches the
  boundary triggers the reaction at its own height: the ring is drawn there, a metal atom appears inside it on the
  metal side and fades into the electrode, and the label "cation + e⁻ → atom" sits in a pill between two rows of
  ion cores, with a short leader when needed; a new cation then enters at the far side.
- Also fixed: the last column of ion cores touched the boundary (lattice now centred, clear of it); electrons and ions
  drifted out of their phases over time (they now move in fixed lanes with a bounded wiggle, electrons between the
  rows of cores); electrons bunched in threes; random start positions replaced by fixed ones, so the figure looks the
  same on every load. With reduced motion the figure shows one reaction in place.
- Checks: motion on and off at 1300 and 360 px; gate exit 0; axe clean; 74 tests.

## Figure 15.2 ions (2026-10-16, owner's request: make the ions more realistic)
- The ions are now shaded space-filling spheres in the CPK (Jmol) colours that molecular models use for Li, Na, K
  and Ca, with a highlight, a darker rim, a soft halo and a contact shadow, all on one baseline in a full-width strip,
  drawn to scale at 30 px per ångström (was 20) with a 1 Å scale bar. A dashed ring inside Na⁺, K⁺ and Ca²⁺ shows the
  size of Li⁺. Bars and potential rungs use a deeper tone of the same colours. The basis line says that the shading
  and halo are drawing style only. viewBox 520 × 386 (was 268).
- Checks: 1300 and 360 px; gate exit 0; axe clean; 0 broken links.

## Figure 15.3 organic electrodes (2026-10-16, owner's request: improve the figure)
- "How they work": the R boxes are replaced by an aromatic ring for the redox-active molecule with a charge badge,
  shaded counter-ions (Li⁺ as the course's cation, A⁻ as its anion), an electron on each arrow, and labelled rows
  (oxidized, neutral, reduced) on a potential axis.
- New view "One molecule": Li₂-PDCA drawn as skeletal formulas through its two charging steps, dianion with two Li⁺,
  radical anion, neutral quinonediimine, with the solid-state step potentials 3.15 and 3.32 V (Guo et al. 2024,
  redox-mechanism section, Fig. 3A, Table 1). A new step 4 goes with it; the ladder steps are now 5 and 6.
- Voltage ladder: Ca(Li₂)-p-DHT label moved below its dot (it sat on the 2.91 V line); labels have a halo.
- Key, title and basis updated. viewBox 520 × 300.
- Checks: all three views at 1300 and 360 px; gate exit 0; axe clean; 0 broken links.

## Figure 13.1 positive electrodes (2026-10-16, owner's request: improve it visually and add missing data from the latest articles)
- Chemistries view: each material carries a glyph for its structural family (layered, spinel, olivine; Manthiram
  2020) and its bar is drawn in that family's colour; a tick (or bracket, for a range) marks the theoretical capacity
  where Faruque et al. 2026 give one (LiCoO₂ 274, nickel-cobalt layered oxides 270-285, LiMn₂O₄ 148, LiFePO₄ 170
  mAh/g); values in a fixed column; second legend row for families and the tick; readouts updated.
- New view "Four in numbers" from Faruque et al. 2026, Tables 4 and 5: LiCoO₂, the nickel-cobalt layered oxides,
  LiMn₂O₄ and LiFePO₄ compared in practical against theoretical capacity, voltage, energy per kilogram of material,
  tap density, specific surface area and cycle life; tap a column for safety, environment and use. The basis notes
  that the review's Table 5 gives somewhat different practical capacities and potentials. New step 3; NMC steps now
  4 and 5; NMC badge moved off the 4.6 V bar.
- New text "Four families in numbers": the numbers above, LiMn₂O₄ above 55 °C and its remedies, LiNiO₂ at about
  200 mAh/g and Panasonic's 3.1 Ah, 248 Wh/kg, 660 Wh/L cell, LiFePO₄'s lower environmental impact, and the review's
  overall ranking.
- Course-wide fix found on the way: 19 plain-text references such as "figure 10.1" still carried the old module
  numbers (the degradation figure is now 16.1). They are now {{fig:}} links that carry the current number. In the
  mathematics panels, where plain numbers decide which page a line goes to, the build keeps placing by the old number
  and then writes the reference as a link (tools/build_course.py); the placement of every line is unchanged.
- Checks: three views at 1300 and 360 px; gate exit 0 on 29 pages; axe clean; 29 pages, 3291 links, 0 broken;
  74 tests.

## Search engines (2026-10-16, owner's request: more visitors through search, not social media)
- Every course page has a search title and description written around what people type (course.json seo_title,
  seo_desc; e.g. "GITT explained: diffusion coefficients from current pulses", "Positive electrodes (cathodes): NMC,
  LFP, LCO, NCA and LMO"). The visible headings are unchanged. Titles end in " | How batteries work" only when the
  whole fits in 62 characters. Formulas are written plainly (LiFePO4) because the typesetting pass would otherwise put
  <sub> tags into the head. "Anode" and "cathode" appear in two titles in brackets because that is what people search
  for; the prose keeps negative and positive electrode.
- Hub: title "How batteries work: an interactive lithium-ion battery course"; description shortened to 150 characters;
  Course JSON-LD gains isAccessibleForFree, educationalLevel, offers (free), hasCourseInstance (online, workload from
  the reading times) and syllabusSections listing every chapter.
- Every page: JSON-LD is now Article plus LearningResource with a description, and a BreadcrumbList (site, course,
  page). Its dateModified is the page's own last change.
- Sitemap: each URL has a lastmod, the date its main content last changed (hash of <main> without the citation
  block, stored in tools/lastmod.json; a new entry starts from the file's last commit date). Rebuilding without
  changes keeps the dates.
- Home page description shortened to 145 characters.
- Checks: every JSON-LD block parses; no markup in any <head>; sitemap is valid XML; gate exit 0 on the hub and two
  chapters; axe clean; 0 broken links; 74 tests.

## Figure 12.1 negative-electrode map (2026-10-16, owner's request: improve the figure)
- The map now runs the full width (it shared the width with the energy bars, and the labels collided: TiNb₂O₇ on the
  axis title, the badge on Li₄Ti₅O₁₂, "low and right" on the conversion bars, Li metal far from its dot). Labels are
  placed by hand, each next to its marker, with a halo. The families differ by shape as well as colour: circles for
  intercalation, diamonds for alloys, squares for conversion, a metallic disc for lithium metal.
- New strip at the top, on the same capacity axis: theoretical capacities by class from Faruque et al. 2026, Table 6
  (nanostructured carbons up to 1750; metal oxides, nitrides, sulfides, phosphides as ranges) and alloying elements
  (Sn 960, In 1012, Ge 1384, P 2596, Si 4200 mAh/g). The basis and the readout note where these differ from the
  map's values for Si, Ge and Sn.
- The energy of the pair is now a pair of horizontal bars at the bottom, with the ratio to graphite; in graphite mode
  the second bar is empty instead of repeating graphite.
- New paragraph with the review's class capacities, Li₄Ti₅O₁₂'s lack of expansion and its high potential, and carbon
  nanotube composites above 1000 mAh/g.
- viewBox 520 × 458. Checks: 1300 and 360 px, all modes; gate exit 0; axe clean; 0 broken links; 74 tests.

## Lab 2: cyclic voltammetry (2026-10-16, owner's request: a CV section with basics, theory and figures)

- New page lab/cyclic-voltammetry after Cell testing; GITT, EIS measurement, EIS analysis and post-mortem renumbered
  Lab 3 to Lab 6. Nine figures (f11-19 to f11-27, Figures L2.1 to L2.9) in src/learn/figs/figs-11cv.js, text in mod-11.
- Sources read in full for the claims used: Elgrishi et al. 2018 (R83), Kim et al. 2020 (R84), Fleischmann et al. 2020,
  kinetic-analysis sections (R85), Scheers and Johansson 2014, section 9.2.2 (R86); Ue et al. 2014, Table 2.1 (R54) and
  Guo et al. 2024 (R78) for the measured examples.
- physics.js gains cv: a finite-difference CV simulator (Nernst or Butler-Volmer surface, uncompensated resistance,
  double-layer capacitance), Randles-Sevcik, D from the slope, b-value, Dunn split, peak finder, and a one-resistance
  battery-electrode model (linearized backward Euler, current from the charge actually moved, so a full or empty
  electrode passes none). Tests: Randles-Sevcik peak to 0.1 %, ΔEp 58 mV, growth of ΔEp with Ru and with smaller k0.
- Figures: the three-electrode cell and waveform; the duck with concentration profiles (points A to G); scan rate and
  ip against v^1/2 with the capacitive bias; reversible, quasi-reversible, irreversible with ΔEp against log v; ohmic
  drop; b-value and k1/k2 split; graphite and LiFePO4 under slow sweeps against v dQ/dV (auto-scaled current axis);
  Kim Table 1 diffusion coefficients by method; the stability window and its cut-off.
- Hub description mentions cyclic voltammetry. Static APA citation: removed a doubled full stop after the initial.
- Checks: 1300 and 360 px contact sheets; gate exit 0 on all six lab pages; axe clean; 0 broken links; 80 tests.

## Figure L2.1 cell and sweep (2026-10-16, owner's request: improve the figure)

- Redrawn cell: PTFE lid, glassy carbon disc in a PTFE body, silver-wire reference behind a porous frit, platinum
  coil, supporting-electrolyte ions, argon kept as a blanket above the liquid during the scan (Elgrishi et al. 2018).
- Potentiostat with WE, RE and CE sockets and a live display of E, i and real time.
- Animated: electrons in the leads and ionic current in the solution, with speed and direction following the simulated
  current; the potential-sense path WE to RE shown in step 2; a close-up lens of the selected electrode.
- The E(t) triangle has a moving cursor, and a new lower panel traces the same current against E as the sweep runs,
  linking the waveform to the voltammogram (fourth step). viewBox 520 × 400.
- Checks: 1300 and 360 px; gate exit 0; axe clean; 0 broken links; 80 tests.

## Home page v4 (2026-10-16, owner's request: a visually stronger home page, latest techniques)

- New stylesheet assets/css/home.css for index.html only; the course keeps site.css and its white look.
- Light and dark from one token set with light-dark() and color-scheme: light dark; follows the system, with a
  three-state switch (auto, light, dark) in the top bar remembered in localStorage and applied before first paint.
- Hero: aurora background (blurred radial fields of the site colours plus a turning conic layer on a registered
  @property angle), masked graph grid, paper grain (SVG feTurbulence), gradient-clipped name, glass cell card with a
  gradient hairline (mask-composite) and a pointer-driven 3D tilt and spotlight; glass bento tiles for the figures.
- Elsewhere: floating glass pill navigation, scroll-driven progress bar (animation-timeline: scroll()), CSS-counter
  section numbers, container-query tiles, spotlight hover on cards (pointer position as custom properties),
  animated details panels (::details-content with interpolate-size), @starting-style fade for the lightbox,
  tinted bands behind research, publications and tools, a glow behind the contact card, color-mix() tints throughout.
- SVG colours that were fixed (map sea and land, key dots) now use tokens. Print stays light.
- Checks: light, dark and phone screenshots; theme switch and persistence tested; axe clean; 0 broken links.

## Course home v2 (2026-10-16, owner's request: a visually stronger course home with advanced animation)

- Hero: aurora background (blurred colour fields plus a turning conic layer on a registered @property angle) and a
  masked graph grid that drifts away on a CSS scroll timeline; the title's last word gradient-filled with a slow
  shimmer; the hero figure as a glass card with a gradient hairline; a pulsing halo on the start button; a pill kicker.
- "The course in numbers": chapters, lab pages, live figures, sources and hours, computed at build time
  ({{course_numbers}} in hub.src.html), revealed and counted up by motion.js, with pointer spotlight.
- Reading progress: the home page shows "N of 25 pages read, M opened" with a bar, from the browser's own record
  (course.js, course.visited), hidden until something has been opened.
- Chapter map: a colour per part (dot, label, the card's top rule, the hover light, the circuit wire's gradient),
  an outlined watermark number on every card (data-n), read cards tinted with a tick. How-to cards numbered with lift.
- Checks: 1300 and 390 px with and without motion; no script errors; axe clean; 0 broken links.

## Lab 1 Cell testing (2026-10-16, owner's request: improve the lab handbook pages, Lab 1 first)

- Six new beats, f11-28 to f11-33 (Figures L1.2 to L1.7), in src/learn/figs/figs-11ct.js, between the overview and the
  dQ/dV figure: the CR2032 half cell part by part in its stacking order; from a punched disc to the C-rate current
  (active mass, areal loading, nF/M, the practical-capacity convention); the open-circuit voltage as assembled and the
  crimp gauge; one CC-CV-rest-discharge cycle on a one-resistance LiFePO4 | graphite cell with a current-proportional
  surface lag (physics.js lab.cccv); Coulombic efficiency compounding (CE^n, cycles to 80 %); a rate-test staircase with
  temperature through an Arrhenius resistance and lag.
- Sources read in full for the parts used: López et al. 2024, NPL GPG 153 (R87); Bogomolov, Yitzhack and Ein-Eli 2026,
  ChemTexts (R88); Chen et al. 2020, JES (R89); Dai and Cai 2022, Commun. Mater. (R90). The Dahn coin-cell guide (R21)
  and the Argonne standardization paper could not be read (publisher blocks fetching) and are not cited for new claims.
- Page now about 30 min, 9 references. Checks: contact sheets 1300 and 360; gate exit 0; axe clean; 0 broken links; 80 tests.
