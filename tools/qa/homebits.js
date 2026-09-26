const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.goto('file:///home/user/asajeevan.github.io/index.html', { waitUntil: 'load' }); await page.waitForTimeout(600);
  await page.screenshot({ path: 'figs/home-nav.png', clip: { x: 0, y: 0, width: 1300, height: 70 } });
  const t = await page.$('.teaser'); await t.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  await t.screenshot({ path: 'figs/home-teaser.png' });
  const href = await page.evaluate(() => document.querySelector('.nav a[href="batteries/"]').textContent);
  console.log('nav link:', href);
  await browser.close();
})();
