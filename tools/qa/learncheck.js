const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const url = 'file:///home/user/asajeevan.github.io/batteries/index.html';
  for (const [w, rm] of [[1300, 'no-preference'], [360, 'no-preference'], [1300, 'reduce']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: rm, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|ERR_TUNNEL/.test(m.text())) errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    // interactions
    const r = await page.evaluate(async () => {
      const out = {};
      const sw = document.querySelector('#f1-1 .sw'); sw.dispatchEvent(new MouseEvent('click', { bubbles: true })); out.lampOn = document.querySelector('#f1-1 .lamp').classList.contains('lamp-on');
      out.edots = document.querySelectorAll('#f1-1 .e-dot').length;
      document.querySelector('#f1-3 button[data-arr=series]').click(); out.seriesV = document.querySelector('#f1-3 .vlab').textContent;
      document.querySelector('#f1-3 button[data-arr=parallel]').click(); out.parQ = document.querySelector('#f1-3 .qlab').textContent;
      document.querySelector('#f2-1 .layer[data-part=sep]').dispatchEvent(new MouseEvent('click', { bubbles: true })); out.sepInfo = document.querySelector('#f2-1 .part-info').textContent.slice(0, 40);
      out.bars = document.querySelectorAll('#f2-3 .bar').length;
      const selP = document.querySelector('#f3-1 select[data-side=pos]'); selP.value = 'lnmo'; selP.dispatchEvent(new Event('change'));
      out.ladder = document.querySelector('#f3-1 .readout').textContent; out.flags = document.querySelector('#f3-1 .flags').textContent;
      out.energy = document.querySelector('#f3-2 .readout').textContent.slice(0, 90);
      out.hero = document.querySelector('.your-cell-name').textContent;
      const E = document.querySelector('#f3-4 input[data-p=E]'); E.value = 4.0; E.dispatchEvent(new Event('input')); out.dG = document.querySelector('#f3-4 .readout').textContent;
      out.spirals = document.querySelectorAll('#f2-2 .spiral').length;
      out.refs = document.querySelectorAll('.refs li').length; out.cites = document.querySelectorAll('.cite a').length;
      out.brokenCites = [...document.querySelectorAll('.cite a')].filter(a => !document.querySelector(a.getAttribute('href'))).length;
      out.motion = document.documentElement.classList.contains('motion');
      return out;
    });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    await page.screenshot({ path: `learn-${w}-${rm}.png`, fullPage: true });
    console.log(w, rm, JSON.stringify(r), 'errors:', JSON.stringify(errors));
    await ctx.close();
  }
  await browser.close();
})();
