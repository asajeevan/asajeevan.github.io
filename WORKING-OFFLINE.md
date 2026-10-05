# Working on the site offline

Snapshot of branch `claude/ecstatic-bohr-ym5qe9`, commit c99c07c (3 Oct 2026): all 13 learning modules,
including the rewritten Module 9 and expanded Module 11. The live site (`main`) still shows Modules 0–4.

## View it
Open `index.html` (home page) or `batteries/index.html` (learning page) directly in a browser.
Everything works offline except the visitor counter, which needs the internet.

## Edit it
- Module text: `src/learn/mod-00.html` … `mod-12.html`; page frame: `src/learn/story.src.html`
- Figures: `src/learn/figs/figs-*.js`; shared figure code: `src/learn/learn-core.js`
- Calculations: `assets/js/physics.js`; sources: `src/learn/references.json`
- Do not edit `batteries/index.html` or `assets/js/learn.js` by hand: they are rebuilt.

## Rebuild and check
    pip install latex2mathml
    python3 tools/build_learn.py          # rebuilds batteries/index.html and assets/js/learn.js
    node --test tests/physics.test.js     # 74 tests

## Notes
- `docs/learn/HANDOFF.md` explains the whole project; `docs/learn/verification-record.md` lists every
  claim with its source and page.
- When you are back online, copy your changed files into the repository (or send them to me) and they
  can be committed to the branch.
