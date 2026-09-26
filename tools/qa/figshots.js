const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.goto('file:///home/user/asajeevan.github.io/batteries/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(() => { document.querySelector('#f1-1 .sw').dispatchEvent(new MouseEvent('click', { bubbles: true })); document.querySelectorAll('.reveal').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }); });
  await page.screenshot({ path: 'figs/hero.png', clip: { x: 0, y: 0, width: 1300, height: 760 } });
  for (const id of ['f1-1', 'f1-2', 'f1-3', 'f2-1', 'f2-2', 'f2-4', 'f2-3', 'f3-1', 'f3-2', 'f3-3', 'f3-4']) {
    const el = await page.$('#' + id); await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(900);
    await el.screenshot({ path: 'figs/' + id + '.png' });
  }
  const m = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2 });
  const mp = await m.newPage(); await mp.goto('file:///home/user/asajeevan.github.io/batteries/index.html', { waitUntil: 'load' }); await mp.waitForTimeout(800);
  await mp.evaluate(() => document.querySelectorAll('.reveal').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }));
  await mp.screenshot({ path: 'figs/m-hero.png' });
  const f = await mp.$('#f3-1'); await f.scrollIntoViewIfNeeded(); await mp.waitForTimeout(600); await f.screenshot({ path: 'figs/m-f3-1.png' });
  await browser.close();
})();
