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
- **Needs the owner's article details:** OWN-BINDER (module 8) and OWN-THESIS (modules 9 and 12).
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
