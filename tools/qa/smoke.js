const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file:///home/user/asajeevan.github.io/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => ({
    gsap: typeof window.gsap, st: typeof window.ScrollTrigger, motion: document.documentElement.classList.contains('motion'),
    ions: document.querySelectorAll('#ions circle').length,
    heroOpacity: getComputedStyle(document.querySelector('.hero-fig')).opacity,
    kicker: getComputedStyle(document.querySelector('.kicker')).opacity,
    cssLoaded: getComputedStyle(document.body).backgroundColor,
  }));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  const r2 = await page.evaluate(() => ({ arcs: [...document.querySelectorAll('#map .arc')].map(a => getComputedStyle(a).strokeDashoffset), h2in: document.querySelectorAll('.h2.in').length, reveals: [...document.querySelectorAll('.reveal')].filter(e => getComputedStyle(e).opacity === '1').length + '/' + document.querySelectorAll('.reveal').length }));
  console.log(JSON.stringify({ ...r, ...r2, errors }));
  await browser.close();
})();
