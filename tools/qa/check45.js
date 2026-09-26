const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const rm of ['no-preference', 'reduce']) {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, reducedMotion: rm, deviceScaleFactor: 1.5 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|ERR_TUNNEL/.test(m.text())) errors.push(m.text()); });
    await page.goto('file:///home/user/asajeevan.github.io/batteries/index.html', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => {
      const out = {}; const fire = (el, ev) => el.dispatchEvent(new Event(ev, { bubbles: true }));
      const sel = document.querySelector('#f4-1 .mat'); sel.value = 'li'; fire(sel, 'change'); out.calc = document.querySelector('#f4-1 .readout').textContent.slice(0, 80);
      const r42 = document.querySelector('#f4-2 .rate'); r42.value = 100; fire(r42, 'input'); out.area = document.querySelector('#f4-2 .readout').textContent;
      document.querySelector('#f4-4 button[data-guess="50"]').click(); out.guess = document.querySelector('#f4-4 .readout').textContent.slice(0, 60);
      const r51 = document.querySelector('#f5-1 .rate'); r51.value = 90; fire(r51, 'input'); out.sim = document.querySelector('#f5-1 .readout').textContent;
      document.querySelector('#f5-1 button[data-shape=flat]').click(); out.simFlat = document.querySelector('#f5-1 .readout').textContent.slice(0, 50);
      const ce = document.querySelector('#f5-4 .ce'); ce.value = 100; fire(ce, 'input'); out.ce = document.querySelector('#f5-4 .readout').textContent.slice(0, 90);
      document.querySelector('#f5-5 button[data-sign=neg]').click(); out.heat = document.querySelector('#f5-5 .readout').textContent.slice(0, 80);
      out.refs = document.querySelectorAll('.refs li').length; out.broken = [...document.querySelectorAll('.cite a')].filter(a => !document.querySelector(a.getAttribute('href'))).length;
      return out;
    });
    console.log(rm, JSON.stringify(r), 'errors:', JSON.stringify(errors));
    if (rm === 'no-preference') {
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }));
      for (const id of ['f4-1', 'f4-2', 'f4-3', 'f4-4', 'f5-1', 'f5-2', 'f5-3', 'f5-4', 'f5-5']) {
        const el = await page.$('#' + id); await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(900); await el.screenshot({ path: 'figs/' + id + '.png' });
      }
    }
    await ctx.close();
  }
  await browser.close();
})();
