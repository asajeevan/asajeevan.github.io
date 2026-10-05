/* Capture every figure of one or more built pages, for before/after comparison.
   For each [data-fig] it saves a PNG of the figure's SVG at 1300 and 360 px (reduced motion,
   so nothing moves) and records the figure's visible text outside the SVG (readout, key,
   controls), with figure and module numbers masked so that renumbering does not count as
   a change. Used by the restructure: run once on the old page (the baseline) and again on
   the new pages, then compare with tools/qa/compare.py.
   Run: QA_FONTS_DIR=... node tools/qa/capture.js OUTDIR page1.html [page2.html ...] */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { useLocalFonts } = require('./fonts');
const out = process.argv[2];
const pages = process.argv.slice(3).map(p => 'file://' + path.resolve(p));
const mask = s => (s || '').replace(/\s+/g, ' ').replace(/\b(figures?|Figures?)\s+L?\d+(\.\d+)?((\s*(,|to|and|or|–)\s*)L?\d+(\.\d+)?)*/g, 'FIG #').replace(/\b(modules?|Modules?|chapters?|Chapters?|Lab)\s+\d+((\s*(,|to|and|–)\s*)\d+)*/g, 'REF #').trim();
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const record = {};
  for (const w of [1300, 360]) {
    fs.mkdirSync(path.join(out, String(w)), { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    await useLocalFonts(ctx);
    // a seeded Math.random, reseeded from the figure id before each figure starts (learn-core calls window.__qaSeed),
    // so figures with random particles draw the same on any page.
    // The SVG hash ignores the unused magnesium and sulfur gradients that the 3D renderer adds when figure 9.14's file is on the same page.
    await ctx.addInitScript(() => { let s = 0x9e3779b9; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; window.__qaSeed = id => { let h = 0x9e3779b9; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193); s = h; }; });
    for (const url of pages) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
      page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|ERR_TUNNEL|net::/.test(m.text())) errors.push(m.text()); });
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(800);
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.evaluate(() => {
        document.querySelectorAll('details.struct').forEach(d => { d.open = true; });
        document.querySelectorAll('.reveal,[data-reveal]').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; });
        ['.topbar', '.totop', '.rail-cell', '.learn-bg'].forEach(s => document.querySelectorAll(s).forEach(e => { e.style.visibility = 'hidden'; }));
      });
      const ids = await page.$$eval('[data-fig]', els => els.map(e => e.id || e.getAttribute('data-fig')));
      for (const id of ids) {
        const fig = await page.$('#' + CSS_escape(id));
        if (!fig) continue;
        await fig.scrollIntoViewIfNeeded();
        await page.waitForTimeout(120);
        const svg = await fig.$('svg');
        if (svg) await svg.screenshot({ path: path.join(out, String(w), id + '.png') });
        if (w === 1300) {
          const t = await fig.evaluate(f => {
            const pick = sel => [...f.querySelectorAll(sel)].map(e => e.textContent).join(' | ');
            const svg = f.querySelector('svg');
            return { readout: pick('.readout'), key: pick('.key'), controls: pick('.controls'), steps: f.querySelectorAll('.stepbar button:not(.ctl)').length, svg: svg ? svg.outerHTML : '' };
          });
          record[id] = { page: url.split('/').slice(-2).join('/'), readout: mask(t.readout), key: mask(t.key), controls: mask(t.controls), steps: t.steps, svg: require('crypto').createHash('sha1').update(mask(t.svg).replace(/u[a-z0-9]{5}-/g, 'uid-').replace(/<radialGradient id="[^"]*-(Mg|S)".*?<\/radialGradient>/g, '')).digest('hex') };
        }
      }
      if (errors.length) (record.__errors = record.__errors || []).push(...errors.map(e => path.basename(url) + ': ' + e));
      await page.close();
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, 'figures.json'), JSON.stringify(record, null, 1));
  console.log('captured', Object.keys(record).filter(k => k !== '__errors').length, 'figures;', (record.__errors || []).length, 'errors');
  await browser.close();
})();
function CSS_escape(s) { return s.replace(/([^a-zA-Z0-9_-])/g, '\\$1'); }
