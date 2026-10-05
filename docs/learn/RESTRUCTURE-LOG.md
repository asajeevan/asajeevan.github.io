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
- [ ] Phase 1: baseline capture
- [ ] Phase 1: course.json manifest
- [ ] Phase 1: beat parser (50 beat blocks hold 94 figures; report anything it cannot place)
- [ ] Phase 1: build extended (page template, top bar, previous/next, cross-reference markers, per-page citations,
      per-page script bundles)
- [ ] Phase 1: identity build matches baseline
- [ ] Phase 2: manifest switched to 24 pages; references converted (377); figures renumbered; comparison clean; full gate
- [ ] Phase 3: hub, contents panel, search, glossary, progress, keyboard, redirects; link check; accessibility
- [ ] Phase 4: openers, bridges, mix-ups, check-yourself; lecture rewrite of chapters 0 to 4; merges (SEI, ageing,
      solid electrolytes); independent checks per part
- [ ] Phase 5: new content with sources (uses of batteries, cell formats, crystal families, battery care)
- [ ] Phase 6: reader test with three first-year students; owner initials in figure-review
- [ ] Phase 7: pull request on the branch, when the owner says so
