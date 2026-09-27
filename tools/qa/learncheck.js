/* Smoke check of /batteries/: loads the page at 1300 and 360 px with motion on and off,
   reports JS errors and unresolved citation links, and writes full-page screenshots.
   Figure-level interaction checks live in acta.js (Act A) and check45.js (modules 4 and 5). */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const url = 'file:///home/user/asajeevan.github.io/batteries/index.html';
  for (const [w, rm] of [[1300, 'no-preference'], [360, 'no-preference'], [1300, 'reduce']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: rm, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|ERR_TUNNEL|net::/.test(m.text())) errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => ({
      figures: document.querySelectorAll('figure[data-fig]').length,
      stepbars: document.querySelectorAll('.stepbar').length,
      refs: document.querySelectorAll('.refs li').length, cites: document.querySelectorAll('.cite a').length,
      brokenCites: [...document.querySelectorAll('.cite a')].filter(a => !document.querySelector(a.getAttribute('href'))).length,
      motion: document.documentElement.classList.contains('motion')
    }));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    await page.screenshot({ path: `learn-${w}-${rm}.png`, fullPage: true });
    console.log(w, rm, JSON.stringify(r), 'errors:', JSON.stringify(errors));
    await ctx.close();
  }
  await browser.close();
})();
