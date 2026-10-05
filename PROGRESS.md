# Batteries page: progress log (Cowork session, 2026-10-01)

Working copy: a local clone of asajeevan/asajeevan.github.io (main, 9c3ec0a). Nothing was pushed or published.
The zip holds every changed or new file at its repository path; lay it over a checkout of `main`.
Start with `docs/learn/HANDOFF.md`, section 0.

## Done
- **Module 5** rewritten to the Act A standard: six figures, all passing the 360 px gate.
- **Modules 6 to 12** written (Act B: 5 to 8; Act C: 9 to 12). Each has figures, worked examples, a
  recap, a Go-deeper panel and a mathematics panel. The page now has thirteen modules in three acts,
  and the nav, hero and metadata are updated.
- **Module 7 (the electrolyte) rebuilt from first principles, as the owner asked.** The ten figures run:
  1. the molecules in 3D;
  2. the recipe, counted molecule by molecule;
  3. dissolving the salt (animation);
  4. the solvation shell in 3D, with ion pairs and solvent exchange;
  5. how an ion moves (random walk and drift);
  6. the layers next to an electrode (bulk, diffuse, compact, desolvation);
  7. the earlier liquid, polymer and ceramic figures (7.7 to 7.10).
- **Module 6** gains a 3D figure of graphite and LiCoO₂, with the lithium moving between them.
- **Electrolyte additives** added to modules 6, 7 and 12 (VC; overcharge protection; nonflammable
  solvents). Figure 12.2 gains an "additives" layer.
- **Sources added (all verified):**
  - R44 to R52, the uploaded papers.
  - Four chapters of Jow, Xu, Borodin and Ue (eds.) 2014: R53 Henderson, R54 Ue et al., R55 Abe, R57 Borodin.
  - Each of these chapters was read in full by a separate reading pass, and every claim was checked
    with its page. See `docs/learn/verification-record.md`, sections R to R12.
- **Tooling:**
  - `tools/qa/fonts.js` provides local fonts for the QA run.
  - `tools/qa/acta.js` runs with ACTS=ABC.
  - `tools/qa/shot.js` screenshots one figure.
  - The build supports `{{pending:KEY}}` blocks and strips indentation.
  - `figs-7m.js` holds a small 3D ball-and-stick renderer.
- **QA:** 42 of 42 physics tests pass. The label gate at 360 px is clean for all acts (no overlaps,
  no clipping). There are no JS errors with motion on or off.

## Held back or flagged
- **Needs the owner's article details:** OWN-BINDER (module 8). (OWN-THESIS removed at the owner's request, 2026-10-04.)
- **Needs reading:** R42 (Shannon radii, figure 9.5).
- **Crossref not yet confirmed:** R55 and R57. Their details were taken from the chapters, because
  Crossref rate-limited the session.
- **Module 4 discrepancy, not changed:** the 1991 Sony cell is given as 120 to 150 Wh/kg (R2), against
  about 80 Wh/kg in R47 and R46.
- **FLAG rows** in the verification record are waiting for the owner's review. The figure-review
  sheet has rows for every figure from 5.1 to 12.4, with the initials left blank.
- **Page size** is about 281 KB, above the plan's 250 KB target, because of the new Module 7 figures.

- Reader-test kit written: `docs/learn/reader-test-kit.md` (three readers, five core questions with answer notes, a question per module, record sheet). Not yet run.

## Known limit: legibility on phones
At 360 px the figure labels render at roughly 8 px. Raising them to 13 px on phones causes 55 label
collisions in 26 figures (mostly in modules 3 to 6). This needs either a figure-by-figure relayout
or a tap-to-enlarge view.

## Next
1. Owner review and initials.
2. Reader tests (plan, section 5c).
3. Phone legibility (above).
4. Optionally, the theory page.
5. Merge and publish when the owner says so.

## Owner review round (2026-10-01, later)
- **Figure 6.2:** graphite now fills by stages (No lithium, then stages 4, 3, 2 = LiC₁₂ and 1 = LiC₆), with A/B stacking letters and 0.335 nm gaps. There is a separate LiCoO₂ view with a lithium-content slider. Source: R58 (Nagendra et al. 2026). The AA stacking, the 0.370 nm filled-gap width and the LiCoO₂ cell dimensions are drawn from standard structures and FLAGGED; they need a citable source.
- **Figure 6.4:** isometric blocks showing a plane (2D), a network (3D) and channels (1D).
- **Figure 6.5:** a timeline with one event card at a time.
- **Figure 7.1:** the views are now atoms and bonds, electron density, and the charge around each molecule. All three come from this page's own B3LYP/def2-SVP calculation, which also gives the dipoles (EC 5.2 D, DMC 0.3 D).
- **Figure 7.3:** PF₆⁻ is shown as weakly and transiently solvated (sources R53, R57).
- **Figure 7.5:** the field now drives Li⁺ towards the − plate and PF₆⁻ towards the + plate, with plates, arrows and a lap counter.
- **Figure 7.6:** a to-scale close-up of graphite against the electrolyte, with a lower plot of the first 10 nm. A new "Getting in" view shows desolvation at a graphite edge.
- **Text:** shorter paragraphs (split only at citations), subheadings in long sections, and the one-line lesson first. There is more line spacing, and the figure stays in view on large screens.

## Module 5 detail round (2026-10-02)
- **Figure 5.4 check:** the old phase-rule figure had five problems. It is replaced by figure 5.6:
  - the plateau was labelled 3.5 V; the measured fit gives 3.43 V;
  - the shapes of the plateau ends were arbitrary;
  - it showed a front moving across one particle, a picture Safari and Delacourt say conflicts with experiment;
  - the phase-count labels were misleading;
  - it did not mention the ~20 mV hysteresis.
- **Equations:** every Module 5 equation is now clean MathML. The source uses `<m>`/`<md>` LaTeX tags.
- **New beats and figures (11 figures in Module 5):**
  - 5.1 the test bench (constant current, C-rate, cut-offs, CC–CV);
  - 5.5 battery against capacitor, including a real supercapacitor;
  - 5.6 the phase rule on the measured LiFePO₄ curve;
  - 5.7 a live simulation of a LiFePO₄ electrode of many particles: rate tilt, sequential filling and path dependence;
  - 5.8 inside a porous electrode;
  - 5.9 dQ/dV, dV/dQ and ageing (LLI, LAM).
- **Sources and tests:** sources R59–R62 added. 48 tests pass.
- **Page size:** about 350 KB (MathML adds about 30 KB).

## Owner review and audit (2026-10-02, later)
- **Figures redrawn:**
  - 5.3 has a large breakdown panel of the voltage loss at the chosen state of charge.
  - 7.7 (the electrode layers, formerly 7.6) has zone bands, less clutter, and labelled potential and ion plots.
- **Worked examples:** the Doyle example no longer overflows its box. The 99.9 % cycle-life example is explained step by step.
- **New figure 7.3:** commercial electrolyte salts and solvents compared on conductivity, water, heat, aluminium, safety, use, permittivity, viscosity, melting point, boiling point, flash point and oxidation limit.
- **Audit:** five parallel audits of Modules 5–12 were applied, about 90 fixes. See verification record, section T.

## Lecture rewrite of Modules 5 to 12 (2026-10-03)
- **Voice and flow:** Modules 5 to 12 now read as one lecture in the first person plural. Each module
  opens from the previous one and ends with a bridge to the next. Author-by-author narration is replaced
  by direct statements; names stay only for history and named laws.
- **Citations:** Nature style, superscript numbers in order of first citation, each linked to its entry
  in the reference list (39 references).
- **Up-to-date values:** new verified sources R71 (Frith et al. 2023), R72 (Manthiram 2020) and R73
  (Faraday Insights 18, 2023). LiCoO₂ about 135 to 140 mAh/g; NMC811 about 200 mAh/g; NMC-type cells
  300 Wh/kg and above 700 Wh/L; LFP cells 160 Wh/kg (2022), with longer cycle and calendar life; the
  80 %-in-15-minutes fast-charge goal. The 2004 300-cycle requirement is now dated as history.
- **Verification:** three independent comparison passes against the original text; their findings were
  applied. Cite keys preserved; 0 em dashes; 74 of 74 tests pass; label gate clean. See verification
  record, section W.
- **Next:** the same rewrite and value update for Act A (modules 0 to 4).

## Porosity and tortuosity (2026-10-03, later)
- **Figure 5.9 (was 5.8) redrawn:** the old drawing showed the same particle grid and thickness for porosity
  0.30 and 0.60. It now draws the particles at the right solid share and the electrode to scale: 100 µm at 0.30,
  175 µm at 0.60 for the same amount of material.
- **New figure 5.8 and text:** what porosity and tortuosity are, how porosity is calculated from mass,
  thickness and densities, how tortuosity is measured (symmetric cell, blocking salt, transmission line), the
  Bruggeman estimate against measured electrodes, and why they matter at high rates. Worked example.
  New verified source R74 (Landesfeind et al. 2016, with its erratum checked).
- Later figures renumbered 5.10 to 5.12. Verification record, section X.

## Electrode materials and lab procedures (2026-10-04)
- **Module 9 extended** (owner's choice, no renumbering): positive electrodes compared (figure 9.12: ratings, typical capacities,
  NMC111/622/811 capacity and retention against cut-off voltage), the three oxide families, the roles of Ni/Mn/Co/Al, what comes
  next; a negative-electrode table (in use and coming); organic electrodes (figure 9.13: n-type, p-type, bipolar; voltage
  ladder), the p-DHT family with the spectator-cation effect, and the nitrogen-based classes.
- **"In the lab" boxes**: porosity and tortuosity (module 5), coin cell and cycling (module 5), GITT and EIS (module 11), each
  with steps and a worked calculation.
- **Sources**: R75 Jung 2017, R76 Eshetu 2021, R77 Jouhara 2018, R78 Guo 2024, R79 Wang 2023, OWN-THESIS (chapter 1). Two
  independent checks applied. Verification record, section Y.
- **To confirm by the owner**: the "From my own work" wording in modules 9 and 12.

## Organic section corrected (2026-10-04, later)
- **Where magnesium sits:** rewritten from Jouhara et al. 2025 (R80, new): Mg²⁺ is chelated by phenolate + carboxylate oxygens
  and binds the phenolate oxygen (1 Li⁺ + 2 Mg²⁺ per phenolate O); why the potential rises; why only one electron (Peierls dimers,
  ESR, Kolbe beyond 4.0 V).
- **Nomenclature and italics:** precise names; *p*/*o* italic in text, figures and the reference list.
- **"Nitrogen-based redox centres"** replaced: "Beyond carbonyl chemistry: conjugated sulfonamides and oximates".
- **Thesis no longer cited** (owner): values now from R77 (Fig. 5b) and R80; Li₄-p-DHBDS dropped (no read source).
- **Figure 9.14** (optional drop-down): 3D models of *p*-DHT⁴⁻, *o*-DHT⁴⁻, *p*-DOBDA⁴⁻ (GFN2-xTB) and the cation coordination
  schematic. A true crystal view needs the CIF (CCDC 2247807).
- Gate clean, 74 tests pass. Verification record, section Z.


## Restructuring plan (2026-10-05)
- Plan drafted as a Claude Doc, "How batteries work: restructuring plan":
  https://claude.ai/code/artifact/01cc00f2-333e-45af-96c1-20eb393b4296
- Proposal: 24 chapters in six parts on separate subpages (the course starts at chapter 0; Part VI lab track optional), a hub
  with course map, contents panel, previous/next, search, glossary, figure gallery, equation sheet; a course manifest
  (course.json) drives pages, numbering and cross-references; per-page script bundles.
- Owner decided (5 Oct): the restructure starts from module 0, which is chapter 0 of the main line. The plan now has a
  chapter-by-chapter section (question, beats, changes, mix-up box, check-yourself, bridge) for chapters 0 to 23.
- Waiting for five phase-1 decisions (granularity, lab track, addresses, default cell, title).
  No code changed yet.
- 5 Oct, later: owner asked for precise scientific titles. The plan now has a "Titles and headings" section: naming rules,
  part titles, a full scientific title and a menu label (<= 20 characters) for every chapter, and the section headings of
  each chapter in order; the course map, chapter-by-chapter section and diagram use the new names.
- 5 Oct, later: execution strategy added to the plan; decisions settled (24 pages = 19 chapters + separate 5-page lab
  handbook; word addresses; LiCoO2 default; title kept with subtitle; local-only git checkpoints). Local branch
  claude/ecstatic-bohr-ym5qe9, checkpoint 6e49fba; push disabled locally. State and checklist:
  docs/learn/RESTRUCTURE-LOG.md. Next: phase 1 (baseline capture, manifest, beat parser, multi-page build).
