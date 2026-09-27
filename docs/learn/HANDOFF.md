# Handoff: the battery-basics learning pages

Written 2026-09-26 at the end of the first build session and updated 2026-09-27 at the
end of the Act A rework, for whoever continues
(a new Claude Code session or a human). Read this file first, then
`issues-and-gaps.md`, then `battery-basics-plan.md` and `verification-record.md`.

## 1. Status in one paragraph

The site lives in this repository (asajeevan/asajeevan.github.io, served by GitHub
Pages from `main`). A learning page exists at `/batteries/` with a hero, Act A
(Module 0 plus modules 1 to 4, 20 figures, each with its mathematics panel) and the first module of Act B (module 5),
a cited reference list, and a "coming next" note for modules 6 to 12. The first
build (commits `acb0412` and `757ea7f` on `main`) was reviewed by the owner, who
judged every figure and the text inadequate for a first-year student; the findings
are in `issues-and-gaps.md`. **On 2026-09-27 Act A was reworked against that file on
branch `claude/ecstatic-bohr-ym5qe9`** (second session): the four scientific errors
are fixed, Module 0 (charge, field, potential, voltage) is new, modules 1 to 4 are
rewritten, every Act A figure is rebuilt to the figure standard, and the automated
gate `tools/qa/acta.js` passes. The branch is pushed but **not** fast-forwarded into
`main`, and the page is offline (section 7): the owner asked to see Act A before
anything continues and asked that the page stay unpublished until they say otherwise. Module 5 still has
its first-build figures and is next.

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
| `src/learn/mod-00.html` to `mod-05.html` | One module each: text with `{{cite:KEY}}` markers, figures as (mostly JS-drawn) inline SVG, `{{sources:...}}` line. Act A modules open with a `.where` recap and carry a `.worked` example. |
| `src/learn/learn-core.js` | Reading modes, rail, "your cell" store, the figure helpers of the standard (`steps` step bar with numbered `badge` callouts, `anim` player with play/pause/step, `phiStrip` potential-against-position strip, `ourIon`, `charge`, `arrow`, `marker`, `flow`), figure registry, boot. Contains the marker `/* {{figures}} */`. |
| `src/learn/figs/figs-0.js`, `figs-1.js`, `figs-2.js`, `figs-3.js` | Figure code for Module 0 and modules 1 to 3, one `register('fX-Y', ...)` per figure. |
| `src/learn/figs/figs-45.js` | Figure code for modules 4 and 5, with the shared illustrative cell model that feeds figures 4.2, 5.1 and 5.5. |
| `docs/learn/figure-review.md` | The review sheet of the figure standard (item 10): one row per Act A figure, owner's initials blank. |
| `tools/qa/acta.js` | The Act A gate: errors, interactions, citation links, screenshots at 1300 and 360 px, SVG label overlap and clipping check at 360 px. |
| `src/learn/references.json` | Reference registry. Fields: authors, title, journal, year, volume, pages, doi, status (`verified`, `crosschecked`, `candidate`), short. Only `verified` may be cited. |
| `tools/build_learn.py` | Build: assembles `assets/js/learn.js`, processes includes and citation markers, numbers references in order of first appearance, writes `batteries/index.html`. Fails on unknown or unverified keys. |
| `tests/physics.test.js` | 19 checks that reproduce printed values. Run `node --test tests/physics.test.js`. |
| `tools/qa/` | Playwright scripts used for screenshots and interaction checks (see its README). |
| `docs/learn/` | This handoff, the issues file, the plan, the verification record. |
| `sitemap.xml` | Has the `/batteries/` entry. |

Build and check, from the repository root:

```
python3 tools/build_learn.py
node --test tests/physics.test.js                       # 34 checks
NODE_PATH=/opt/node22/lib/node_modules node tools/qa/acta.js figs   # Act A gate, from a scratch directory
NODE_PATH=/opt/node22/lib/node_modules node tools/qa/check45.js     # module 4 and 5 interactions
```

The build fails on any citation of a reference whose status is not `verified`.
`acta.js` exits non-zero on any JS error or any label overlap or clip at 360 px.

## 4. Sources: what was in hand, what must be re-supplied

Uploaded files are session-scoped; a new session must have them uploaded again to
verify anything against them. None of their text is stored in the repository (it is
copyrighted); only my notes and equation transcriptions are, in `verification-record.md`.

Tier 1 (read in full, citable now; all re-supplied on 2026-09-26/27 except R40):
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

Not in hand: an introductory physics text on electrostatics. It turned out not to be
needed for Module 0: Bard, Faulkner and White state Coulomb's law (14.3.1 footnote 6),
define the field and the potential (2.2.1), give Gauss's law and the conductor results
(2.2.1), the volt as J/C (1.1.2), the electron-volt (1.1.4), current (1.1.5), Ohm's law
and conductivity (4.2) and ion mobility (2.3.3), and every Module 0 statement is cited
there (see `verification-record.md`, section Q). Two things are still not stated on
the page for lack of a source: the drift velocity of electrons in a metal, and the
surface-charge mechanism that sets up the field along a current-carrying wire. A
physics text would let both be added. Candidates, in order of preference: Candidates to ask the owner for, in order
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

1. The owner reviews Act A on branch `claude/ecstatic-bohr-ym5qe9` (build it locally or
   open `batteries/index.html` from the branch), initials the rows of
   `figure-review.md`, and says "continue". Only then fast-forward `main`.
2. Rework module 5 to the same standard (the module 5 critique is in
   `issues-and-gaps.md`, section 3), using the helpers in `learn-core.js`; then modules
   6 to 12 per `battery-basics-plan.md` (section 5b has the figure catalogue), then the
   theory page (section 5d), then the QA phase (sections 9 and 10).
3. If the owner supplies a physics text, add the two held-back statements to Module 0
   (electron drift in a metal; surface charges along a wire) and a glossary.
4. Keep the discipline: build fails on unverified citations; tests must pass; run
   `acta.js` (extend it to Act B) before every push; screenshot every figure at desktop
   and phone width; deploy by fast-forwarding `main` from the working branch; stop and
   report after each block.

## 7. Publication state (updated 2026-09-27, later the same day)

**Published.** The owner asked for modules 0 to 4 to go live as a self-contained piece with
the mathematics included. The page ends after Module 4 with a closing note that further
modules are being written; each module's "theory page" placeholder is replaced by an
in-page "The mathematics of this module" panel (`details.deeper.maths`, one `.eqline`
per equation, each cited through the module's `{{sources}}` line); the nav lists the five
modules; the rail shows reading progress only. `mod-05.html` and the module 5 figure code
in `figs-45.js` stay in the repository, unused by the build, for the next block. The built
files are tracked again, the home page carries the Learn link and teaser, the sitemap
entry is back and robots.txt allows the page. `main` is fast-forwarded from the working
branch after every reviewed block, as before.

### Earlier state, for the record: how the page was taken offline and what to undo

**The learning page is not public.** On 2026-09-27 the owner asked for it to be taken
offline until approved. Commit `82cec84` on `main` removed `batteries/index.html`,
`assets/js/learn.js` and `assets/css/learn.css` from the deployed site, removed the
"Learn" nav link and the About teaser from `index.html`, removed the sitemap entry and
added `Disallow: /batteries/` to `robots.txt`. On the working branch those three built
files are listed in `.gitignore`, so `python3 tools/build_learn.py` writes them locally
for review but a push cannot publish them. The home page on the branch carries no link.

To publish, after the owner's approval and in this order: delete the three lines from
`.gitignore`; run the build; `git add batteries assets/js/learn.js assets/css/learn.css`;
restore the nav link `<a href="batteries/">Learn</a>` and the About teaser in
`index.html` (see commit `82cec84` for the exact lines); restore the sitemap entry;
remove the `Disallow` line from `robots.txt`; commit; fast-forward `main`.

## 8. Git conventions used so far

First session: working branch `claude/nifty-cerf-9bok9j`, fast-forwarded into `main`.
Second session (Act A rework): branch `claude/ecstatic-bohr-ym5qe9`, pushed, awaiting the
owner's review before the fast-forward. Every block is one commit, pushed to the
branch and fast-forwarded into `main` (GitHub Pages deploys from `main`) after review. Commit
messages describe the change and end with the attribution lines the session
requires. Never rebase or force-push.

## 9. Typography of scripts and equations (added 2026-09-27)

Write chemical formulas and exponents in the sources with Unicode script characters
(Zn²⁺, ε₀, 10⁻¹²) or with TeX-like markers (μ_A, V_OC, x^{2+}). The site font has no
script glyphs, so the page never shows those characters raw:

- `tools/build_learn.py` converts them in HTML text (outside `<svg>`) into `<sup>`/`<sub>`
  at build time and wraps the inline equations listed in `EQUATIONS` in `<span class="eq">`
  (math face). Add a new inline equation to that list to give it the math face.
- `learn-core.js` converts them at run time: `txt()` and `setSvgText()` turn them into
  raised or lowered `<tspan>`s in SVG labels (always update an SVG label with
  `setSvgText(label, text)`, never with `.textContent`), and a MutationObserver on every
  figure card converts them in dynamic HTML (readouts, step boxes, part descriptions).
- CSS: `sup`, `sub`, `.eq` and `.worked .line` in `assets/css/learn.css`.

## 10. Later the same day: play buttons, hero, background

- `anim(fig, tick, opts)` accepts `opts.onPlay`, called when the reader presses Play or
  Step, so a figure can put itself into a state where something moves (1.1 closes the
  switch, 3.1 sweeps the potential, 3.2 replays the formation). Any new animated figure
  whose starting state is still must use it, or its Play button looks dead.
- Material names in `physics.js` carry Unicode subscripts (LiCoO₂); `plain()` flattens
  them for `<option>` text, `names()` typesets them for the `.your-cell-name` elements.
- The hero figure is `register('hero', ...)` in `figs-0.js`. A `<canvas id="learnBg">`
  behind the page carries slow drifting ions and electrons; it is skipped with reduced
  motion, on coarse pointers and below 760 px.
- The reading-mode note changes with the mode and, in equations mode, links to the first
  mathematics panel (`#m00-maths`).

## 11. Visitor counter and share button (assets/js/share.js)

- `assets/js/share.js` is loaded by both `index.html` and the learning page (after `learn.js`). It holds the visitor counter that used to live in `home.js` and the share button.
- Counter: one site-wide count from the owner's Cloudflare Worker (`counter/README.md`; `COUNTER_URL` at the top of `share.js`). One `/hit` per browser session, `/count` on later page views; the footer line `#visits` stays hidden if the Worker cannot be reached. The learning page footer carries the same `#visits` line as the home page.
- Share: every element with class `js-share` (the floating pill above the back-to-top arrow on both pages, "Share this site" in the home hero, "Share this page" at the end of the learning page). On browsers with the Web Share API it opens the system share sheet; otherwise a small menu with Copy link, LinkedIn, X, WhatsApp and e-mail. The link shared is the page's `<link rel="canonical">`, so the private preview artifact shares the public address, not its own.
- Styles are in `site.css` under "share button and menu". QA: `scratchpad/qa/sharetest.js` mocks the Worker and checks the counter text, the menu, the clipboard and Escape on both pages.

