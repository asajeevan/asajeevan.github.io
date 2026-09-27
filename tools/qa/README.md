# QA scripts

Playwright scripts used to check the pages in a headless Chromium. In the Claude Code
cloud container Playwright is preinstalled globally: run them with
`NODE_PATH=/opt/node22/lib/node_modules node tools/qa/<script>.js`. Paths inside the
scripts point at `/home/user/asajeevan.github.io/...`; adjust if the clone lives elsewhere.

- `fullshot.js <url> <tag>`: full-page screenshots at 1300, 820 and 360 px in reduced-motion
  mode. Used for the pixel-identical check before and after the asset extraction
  (compare with Pillow/NumPy; see the session record in docs/learn/HANDOFF.md).
- `smoke.js`: loads the home page with animations on, reports GSAP presence, ion count,
  reveal state and JS errors.
- `learncheck.js`: loads `/batteries/`, exercises the figures of modules 1 to 3 (SVG
  elements need `dispatchEvent(new MouseEvent('click', {bubbles: true}))`, not `.click()`),
  checks that every citation link resolves, and screenshots the page at 1300 and 360 px.
- `figshots.js`: element screenshots of each module 1 to 3 figure into `figs/`.
- `check45.js`: the same for modules 4 and 5, plus interaction checks.
- `acta.js [outdir]`: the Act A gate. Loads `/batteries/` at 1300 and 360 px with motion on and
  off, exercises every step button and player button of every Act A figure, checks citation
  links, screenshots each figure at both widths into `outdir`, and checks every visible SVG
  label for overlaps and clipping at 360 px. Exits non-zero on any error or label problem.
- `homebits.js`: screenshots of the home-page nav and teaser.

Screenshots land in the current working directory (`figs/` subfolder for figure shots).
