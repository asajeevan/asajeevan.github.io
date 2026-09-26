const { chromium } = require('playwright');
const [,, url, tag] = process.argv;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const w of [1300, 820, 360]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    // open all details so collapsed content is compared too
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${tag}-${w}.png`, fullPage: true });
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(tag, w, 'height', h, 'errors', JSON.stringify(errors));
    await ctx.close();
  }
  await browser.close();
})();
