# Working on the site offline

Snapshot of branch `claude/ecstatic-bohr-ym5qe9`, commit c99c07c (3 Oct 2026): all 13 learning modules,
including the rewritten Module 9 and expanded Module 11. The live site (`main`) still shows Modules 0–4.

## View it
Open `index.html` (home page) or `batteries/index.html` (learning page) directly in a browser.
Everything works offline except the visitor counter, which needs the internet.

## Edit it
- Course structure (chapters, parts, order of the figures, titles, questions): `src/learn/course.json`
- Text: `src/learn/mod-00.html` … `mod-12.html` (the build cuts them into beats and places each beat on its
  chapter); course home: `src/learn/hub.src.html`; page frame: `src/learn/page.src.html`
- Cross-references are markers, never typed numbers: `{{fig:f5-3}}` for a figure, `{{ch:polarization}}` or
  `{{Ch:polarization}}` for a chapter. The build numbers and links them.
- Figures: `src/learn/figs/figs-*.js`; shared figure code: `src/learn/learn-core.js`
- Navigation (contents drawer, search, keys, back button, read ticks): `assets/js/course.js`, built parts in
  `tools/course_nav.py`
- Calculations: `assets/js/physics.js`; sources: `src/learn/references.json`
- Do not edit anything in `batteries/` or `assets/js/learn/` or `assets/js/course-index.js` by hand: they are rebuilt.

## Rebuild and check
    pip install latex2mathml
    python3 tools/build_course.py         # the course home, 24 pages, 3 reference pages, scripts, search index
    node --test tests/physics.test.js     # 74 tests

## Notes
- `docs/learn/HANDOFF.md` explains the whole project; `docs/learn/verification-record.md` lists every
  claim with its source and page.
- When you are back online, copy your changed files into the repository (or send them to me) and they
  can be committed to the branch.
