const { chromium } = require('playwright'); const path=require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  await p.goto('file://' + path.resolve(__dirname, '../../batteries/index.html')); await p.waitForTimeout(800);
  const el = await p.$('#f7-6'); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  const pos = () => p.evaluate(() => { const c = document.querySelector('#f7-6 .our-ion'); return [+c.getAttribute('cx'), +c.getAttribute('cy')]; });
  async function sample(n) { const xs=[]; for (let i=0;i<n;i++){ xs.push((await pos())[0]); await p.waitForTimeout(250);} return xs; }
  console.log('off', (await sample(12)).map(v=>v.toFixed(0)).join(' '));
  await p.click('#f7-6 .fieldbtn'); await p.waitForTimeout(200);
  console.log('btn', await p.evaluate(()=>document.querySelector('#f7-6 .fieldbtn').textContent));
  console.log('on ', (await sample(24)).map(v=>v.toFixed(0)).join(' '));
  await b.close();
})();
