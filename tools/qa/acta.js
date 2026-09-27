/* Act A checks: loads /batteries/, reports JS errors, exercises every Act A figure's
   step buttons and player, checks citation links, screenshots each figure at 1300 and
   360 px, and checks every visible SVG label for overlaps and clipping at 360 px.
   Run: NODE_PATH=/opt/node22/lib/node_modules node tools/qa/acta.js [outdir] */
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || 'figs';
const url = 'file:///home/user/asajeevan.github.io/batteries/index.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let bad = 0;
  for (const [w, rm] of [[1300, 'no-preference'], [360, 'no-preference'], [1300, 'reduce']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: rm, deviceScaleFactor: w === 360 ? 2 : 1.25 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|ERR_TUNNEL|net::/.test(m.text())) errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.evaluate(() => { document.querySelectorAll('.reveal').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }); ['.topbar', '.totop', '.rail-cell'].forEach(s => { const e = document.querySelector(s); if (e) e.style.visibility = 'hidden'; }); });
    const ids = await page.$$eval('.module[data-act="A"] figure[data-fig]', els => els.map(e => e.id));
    // exercise every step button and the player, then leave each figure on step 1
    const ex = await page.evaluate(async (ids) => {
      const out = {};
      for (const id of ids) {
        const fig = document.getElementById(id);
        const btns = [...fig.querySelectorAll('.stepbar button:not(.ctl)')];
        for (const b of btns) b.click();
        const ctl = [...fig.querySelectorAll('.stepbar button.ctl')];
        for (const b of ctl) { b.click(); }
        for (const b of ctl) { if (/Pause/.test(b.textContent)) b.click(); }
        if (btns[0]) btns[0].click();
        out[id] = { steps: btns.length, ctl: ctl.length, readout: (fig.querySelector('.readout') || {}).textContent ? fig.querySelector('.readout').textContent.slice(0, 60) : '' };
      }
      out.brokenCites = [...document.querySelectorAll('.cite a')].filter(a => !document.querySelector(a.getAttribute('href'))).length;
      out.refs = document.querySelectorAll('.refs li').length;
      return out;
    }, ids);
    console.log(w, rm, JSON.stringify(ex));
    if (errors.length) { bad++; console.log('ERRORS', errors); }
    if (w === 360 || (w === 1300 && rm === 'no-preference')) {
      for (const id of ids) {
        const el = await page.$('#' + id); await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
        await el.screenshot({ path: path.join(out, (w === 360 ? 'm-' : '') + id + '.png') });
      }
    }
    if (w === 360) {
      // label overlap and clipping check, in screen pixels
      const rep = await page.evaluate((ids) => {
        const probs = [];
        for (const id of ids) {
          const svg = document.querySelector('#' + id + ' svg'); if (!svg) continue;
          const sb = svg.getBoundingClientRect();
          const vis = t => { let e = t; while (e && e !== svg) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; e = e.parentNode; } return true; };
          const texts = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim() && vis(t)).map(t => ({ t: t.textContent.trim().slice(0, 30), r: t.getBoundingClientRect(), cls: t.getAttribute('class') || '' }));
          for (const a of texts) {
            if (a.r.left < sb.left - 1 || a.r.right > sb.right + 1 || a.r.top < sb.top - 1 || a.r.bottom > sb.bottom + 1) probs.push(id + ' CLIP "' + a.t + '"');
          }
          for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
            const a = texts[i].r, b = texts[j].r;
            const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (ox > 1.5 && oy > 1.5) probs.push(id + ' OVERLAP "' + texts[i].t + '" / "' + texts[j].t + '"');
          }
        }
        return probs;
      }, ids);
      if (rep.length) { bad++; console.log('LABEL PROBLEMS at 360 px:\n  ' + rep.join('\n  ')); } else console.log('labels at 360 px: no overlaps, no clipping');
    }
    await ctx.close();
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
