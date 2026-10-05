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
