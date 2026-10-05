const { chromium } = require('playwright'); const { useLocalFonts } = require('./fonts'); const path=require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: +process.argv[4] || 1300, height: 1000 }, reducedMotion: 'reduce' }); await useLocalFonts(ctx);
  const p = await ctx.newPage(); await p.goto('file://' + path.resolve(__dirname, '../../batteries/index.html')); await p.waitForTimeout(800);
  const h = await p.evaluateHandle(id => document.getElementById(id).closest('.beat'), process.argv[2]);
  await h.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  await h.screenshot({ path: process.argv[3] }); await b.close();
})();
