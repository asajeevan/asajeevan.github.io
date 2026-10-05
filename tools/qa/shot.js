/* Screenshot one figure after running some actions in the page.
   Run: NODE_PATH=/opt/node22/lib/node_modules node tools/qa/shot.js <figId> <out.png> [width] ["js to run in the page"]
   The js receives `fig` (the figure element); e.g. "fig.querySelector('[data-mode=discharge]').click()". */
const { chromium } = require('playwright');
const path = require('path');
const { useLocalFonts } = require('./fonts');
const [id, out, w = '1300', js = ''] = process.argv.slice(2);
const url = process.env.LEARN_URL || ('file://' + path.resolve(__dirname, '../../batteries/index.html'));
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: +w, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: +w < 500 ? 2 : 1.25 });
  await useLocalFonts(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.evaluate(() => { document.querySelectorAll('.reveal,[data-reveal]').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }); ['.topbar', '.totop', '.rail-cell'].forEach(s => { const e = document.querySelector(s); if (e) e.style.visibility = 'hidden'; }); });
  if (js) await page.evaluate(new Function('id', 'const fig = document.getElementById(id);' + js), id);
  await page.waitForTimeout(300);
  const el = await page.$('#' + id); await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: out });
  if (errors.length) { console.log('ERRORS', errors); process.exit(1); }
  await browser.close();
})();
