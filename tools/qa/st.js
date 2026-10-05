const { chromium } = require('playwright'); const { useLocalFonts } = require('./fonts'); const path=require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' }); await useLocalFonts(ctx);
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../../batteries/index.html')); await p.waitForTimeout(800);
  const id = process.argv[2], clicks = (process.argv[3]||'').split('|').filter(Boolean);
  const el = await p.$('#' + id); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  for (const c of clicks) { await p.click('#' + id + ' ' + c); await p.waitForTimeout(400); }
  await el.screenshot({ path: process.argv[4] }); console.log(errs); await b.close();
})();
