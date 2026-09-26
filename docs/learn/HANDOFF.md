# Handoff: the battery-basics learning pages

Written 2026-09-26 at the end of the first build session, for whoever continues
(a new Claude Code session or a human). Read this file first, then
`issues-and-gaps.md`, then `battery-basics-plan.md` and `verification-record.md`.

## 1. Status in one paragraph

The site lives in this repository (asajeevan/asajeevan.github.io, served by GitHub
Pages from `main`). A learning page exists at `/batteries/` with a hero, Act A
(modules 1 to 4) and the first module of Act B (module 5), 20 figures, a cited
reference list, and a "coming next" note for modules 6 to 12. It is deployed
(commits `acb0412` and `757ea7f` on `main`). The owner reviewed it and judged that
every figure and animation has problems, that the text has large gaps for a
first-year college student (no explanation of charge, field, potential, voltage,
why electrons move, how the field arises), and that the flow needs more
connections. Those findings, my own figure-by-figure critique, the gaps, and the
sources that can fill them are in `issues-and-gaps.md`. **Nothing should be built
further until the existing modules are reworked to that standard.**

## 2. Decisions already taken by the owner

- URL `/batteries/`; a separate theory page at `/batteries/theory/` (not built yet).
- Shared assets extracted from the home page (done, pixel-identical check passed).
- The "your cell" thread: the reader picks two electrodes in the ladder figure and
  the choice carries through the page (keep).
- Every factual statement carries a numbered citation to a source that has been
  read in full; the build fails otherwise. No exceptions.
- Tier-3 theory items without a source in hand stay hidden.
- The owner reviews after each module block and says "continue" before the next.
- The owner's reputation is on the line: accuracy first, then clarity, then polish.

## 3. Repository map

| Path | What it is |
|---|---|
| `index.html` | Home page. Nav has a "Learn" link; About has a teaser paragraph. |
| `assets/css/site.css` | Shared stylesheet (extracted from the home page). `.teaser` rule added. |
| `assets/css/learn.css` | Styles for the learning page. |
| `assets/js/gsap.min.js`, `assets/js/ScrollTrigger.min.js` | GSAP 3.12.5, extracted from the home page. |
| `assets/js/home.js` | Home-page script, extracted verbatim. |
| `assets/js/site.js` | Shared behaviour (top bar progress, nav, mobile menu, back-to-top, reveals). Defensive; every element optional. |
| `assets/js/physics.js` | The source equations and reference data, with the source of each function in a comment. Runs in browser (`window.Physics`) and Node. |
| `assets/js/learn.js` | **Generated.** Do not edit; edit `src/learn/learn-core.js` and `src/learn/figs/*.js`. |
| `batteries/index.html` | **Generated** from `src/learn/story.src.html`. Do not edit by hand. |
| `src/learn/story.src.html` | Page skeleton: head, hero, act heads, `{{include:mod-XX.html}}`, references. |
| `src/learn/mod-01.html` to `mod-05.html` | One module each: text with `{{cite:KEY}}` markers, figures as inline SVG, `{{sources:...}}` line. |
| `src/learn/learn-core.js` | Reading modes, rail, "your cell" store, particle helpers (`flow`, `drift`), figure registry, boot. Contains the marker `/* {{figures}} */`. |
| `src/learn/figs/figs-45.js` | Figure code for modules 4 and 5 (module 1 to 3 figure code is still inside `learn-core.js`; move it to `figs/figs-123.js` when reworking). |
| `src/learn/references.json` | Reference registry. Fields: authors, title, journal, year, volume, pages, doi, status (`verified`, `crosschecked`, `candidate`), short. Only `verified` may be cited. |
| `tools/build_learn.py` | Build: assembles `assets/js/learn.js`, processes includes and citation markers, numbers references in order of first appearance, writes `batteries/index.html`. Fails on unknown or unverified keys. |
| `tests/physics.test.js` | 19 checks that reproduce printed values. Run `node --test tests/physics.test.js`. |
| `tools/qa/` | Playwright scripts used for screenshots and interaction checks (see its README). |
| `docs/learn/` | This handoff, the issues file, the plan, the verification record. |
| `sitemap.xml` | Has the `/batteries/` entry. |

Build and check, from the repository root:

```
python3 tools/build_learn.py
node --test tests/physics.test.js
node tools/qa/learncheck.js      # needs NODE_PATH=/opt/node22/lib/node_modules in the cloud container
```

## 4. Sources: what was in hand, what must be re-supplied

Uploaded files are session-scoped; a new session must have them uploaded again to
verify anything against them. None of their text is stored in the repository (it is
copyrighted); only my notes and equation transcriptions are, in `verification-record.md`.

Tier 1 (read in full, citable now):
- R1 Winter and Brodd, Chem. Rev. 2004, 104, 4245 (PDF and markdown were supplied).
- R2 Tarascon and Armand, Nature 2001, 414, 359 (markdown only; PDF still wanted for Figures 5 and 8).
- R6 Goodenough and Park, JACS 2013, 135, 1167 (PDF and markdown).
- B2 Bard, Faulkner and White, Electrochemical Methods, 3rd ed., Wiley 2022 (markdown text export; the 54 MB PDF is in the owner's Drive folder "Battery references" but exceeds the connector's 10 MB limit).
- R21 Murray, Hall and Dahn, JES 2019, 166, A329 (PDF).
- R36 Boz et al., JES 2021, 168, 090501 (PDF).
- R37 von Kolzenberg, Latz and Horstmann, ChemSusChem 2020, 13, 3901 (PDF).
- R38 Weppner and Huggins, J. Solid State Chem. 1977, 22, 297 (PDF).
- R40 Jindal, Katiyar and Bhattacharya, Appl. Therm. Eng. 2022, 201, 117794 (PDF).
- R41 Pathak and Bazant, JES 2026, 173, 160518 (PDF).
- Bazant's 2012 draft of his Accounts of Chemical Research paper (content in hand; published details to confirm).

Not in hand, needed for the physics gaps (see `issues-and-gaps.md`, section 4): an
introductory physics text on electrostatics. Candidates to ask the owner for, in order
of preference: the Feynman Lectures on Physics, volume II, chapters 1 to 6 (freely
readable at feynmanlectures.caltech.edu, but this container cannot fetch it); Purcell
and Morin, Electricity and Magnetism; Halliday, Resnick and Walker, Fundamentals of
Physics, the electrostatics chapters; Griffiths, Introduction to Electrodynamics.

The container cannot reach doi.org, Crossref, ISBN services, Google Fonts or most
CDNs; it can reach raw.githubusercontent.com and PyPI. DOI resolution for every
reference beyond tier 1 is still pending and must be done by the owner or in a
networked session.

## 5. How the page is meant to work (short version of the plan)

Three acts. Act A "Why does the lamp light?" (modules 1 to 4), Act B "Follow one ion"
(modules 5 to 8), Act C "Where it goes wrong" (modules 9 to 12). Each module: a hook
question, a figure to play with, the explanation in the order the play raised it, a
key idea (`.lesson`), a "You can now explain" line (`.recap`), a bridge (`.bridge`), a
"Go deeper" panel (`details.deeper`) with a link to the theory page, and a "Sources
for this module" line. Three reading modes (show / teach / equations) via
`body[data-mode]`. Rail on the right is a cell that charges with scroll progress.
Figures: inline SVG, one `register('fX-Y', function (fig) {...})` per figure, loops
pause off-screen via IntersectionObserver, reduced motion shows a complete static frame.

## 6. What to do next, in order

1. Read `issues-and-gaps.md`. Ask the owner to upload the tier-1 sources again and a
   physics text for electrostatics.
2. Rework Act A to the first-year standard described there: add the physics
   foundation module (charge, force, field, potential energy, potential, voltage, why
   electrons move in a wire, current, power, the electron-volt), rewrite modules 1 to 4
   with the connections listed, and rebuild every figure to the figure standard in
   that file. Fix the two scientific errors listed there first (the water window
   position in figure 3.1 and the electron path in figure 3.2).
3. Only after the owner approves Act A, continue with module 5 rework, then modules
   6 to 12 per `battery-basics-plan.md` (section 5b has the figure catalogue), then
   the theory page (section 5d), then the QA phase (section 9 and 10).
4. Keep the discipline: build fails on unverified citations; tests must pass; screenshot
   every figure at desktop and phone width before deploying; deploy by fast-forwarding
   `main` from the working branch; stop and report after each block.

## 7. Git conventions used so far

Working branch `claude/nifty-cerf-9bok9j`; every block is one commit, pushed to the
branch and fast-forwarded into `main` (GitHub Pages deploys from `main`). Commit
messages describe the change and end with the attribution lines the session
requires. Never rebase or force-push.
