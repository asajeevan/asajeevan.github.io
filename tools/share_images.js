/* Share images: one 1200x630 PNG per page, used as og:image and twitter:image (the picture that
   appears when a link is posted on LinkedIn, X, WhatsApp or Slack, and that search engines may show).
   Drawn from the course manifest with the site's own fonts and colours, so it never goes stale by hand.

   Run from the repository root after changing a title, question or the page list:
     NODE_PATH=/opt/node22/lib/node_modules node tools/share_images.js
   Needs Playwright with Chromium (the cloud container has it at /opt/pw-browsers/chromium; elsewhere,
   `npm i playwright` and `npx playwright install chromium`, or set CHROMIUM to an installed Chrome).
   Writes assets/img/share/<key>.png, where key is 'home', 'hub', or the page id with '/' as '-'.
   tools/build_course.py points each page's og:image at the file of the same key. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'img', 'share');
const course = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'learn', 'course.json'), 'utf8'));
const parts = Object.fromEntries(course.parts.map(p => [p.id, p]));
const nCh = course.pages.filter(p => p.kind === 'chapter').length, nLab = course.pages.filter(p => p.kind === 'lab').length;

const cards = [
  { key: 'home', kicker: 'Battery electrochemist and materials researcher', title: 'Aswadh Shyma Sajeevan',
    sub: 'Solid polymer electrolytes, organic electrode materials, lithium-metal cells and electrochemical diagnosis.', foot: 'asajeevan.github.io', big: true },
  { key: 'hub', kicker: 'A free interactive course', title: course.title,
    sub: course.subtitle + '. ' + nCh + ' chapters and a ' + nLab + '-page lab handbook, every statement cited.', foot: 'asajeevan.github.io/batteries', big: true },
  ...course.pages.map(p => ({
    key: p.id.replace(/\//g, '-'),
    kicker: (p.kind === 'chapter' ? 'Chapter ' + p.num : p.num) + ' · ' + (parts[p.part] ? parts[p.part].menu : ''),
    title: p.title, sub: p.question, foot: 'asajeevan.github.io/batteries' })),
  { key: 'references', kicker: 'Reference pages', title: 'References', sub: 'Every textbook and peer-reviewed article the course rests on, with the chapters that cite each one.', foot: 'asajeevan.github.io/batteries' },
  { key: 'terms', kicker: 'Reference pages', title: 'Index of terms', sub: 'Every term the course introduces, with the sentence that defines it.', foot: 'asajeevan.github.io/batteries' },
  { key: 'figures', kicker: 'Reference pages', title: 'List of figures', sub: 'Every interactive figure of the course, computed from its source.', foot: 'asajeevan.github.io/batteries' },
  { key: 'equations', kicker: 'Reference pages', title: 'Equations', sub: 'The mathematics of every chapter on one page.', foot: 'asajeevan.github.io/batteries' },
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fontsCss = 'file://' + path.join(ROOT, 'assets', 'css', 'fonts.css');
const icon = fs.readFileSync(path.join(ROOT, 'favicon.svg'), 'utf8').replace('<svg ', '<svg width="56" height="56" ');

function page(c) {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${fontsCss}"><style>
  *{box-sizing:border-box;margin:0}
  html,body{width:1200px;height:630px;background:#fff;color:#14171C;overflow:hidden}
  body{position:relative;padding:64px 76px 0;font-family:'IBM Plex Sans',sans-serif}
  .bar{position:absolute;left:0;top:0;width:1200px;height:12px;background:#1F48D6}
  .brand{display:flex;align-items:center;gap:18px;font:600 28px 'Schibsted Grotesk',sans-serif;letter-spacing:-.01em}
  .kicker{margin-top:40px;font:500 23px 'IBM Plex Mono',monospace;color:#1F48D6;letter-spacing:.02em}
  .title{margin-top:18px;font-family:'Schibsted Grotesk',sans-serif;font-weight:700;letter-spacing:-.02em;line-height:1.08;max-height:${c.big ? 160 : 230}px;overflow:hidden}
  .sub{margin-top:24px;font-size:29px;line-height:1.35;color:#596170;max-width:1000px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .foot{position:absolute;left:76px;right:76px;bottom:46px;display:flex;justify-content:space-between;align-items:baseline;border-top:2px solid #E4E7EC;padding-top:22px;font-size:25px}
  .foot b{font-weight:600}.foot span{font:500 23px 'IBM Plex Mono',monospace;color:#596170}
  </style></head><body><div class="bar"></div>
  <div class="brand">${icon}<span>${c.key === 'home' ? 'Battery electrochemistry' : esc(course.title)}</span></div>
  <p class="kicker">${esc(c.kicker)}</p>
  <h1 class="title" id="t">${esc(c.title)}</h1>
  <p class="sub">${esc(c.sub)}</p>
  <div class="foot"><b>${c.key === 'home' ? 'Research, publications and teaching' : 'Aswadh Shyma Sajeevan'}</b><span>${esc(c.foot)}</span></div>
</body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
  const p = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const tmp = path.join(require('os').tmpdir(), 'share-card.html');
  for (const c of cards) {
    fs.writeFileSync(tmp, page(c));
    await p.goto('file://' + tmp);
    // after the web fonts load: the largest title size that fits its box (3 lines for a chapter, 2 for the big cards)
    const clipped = await p.evaluate(async (start) => {
      await document.fonts.ready;
      var t = document.getElementById('t'), s = start;
      t.style.fontSize = s + 'px';
      var max = parseFloat(getComputedStyle(t).maxHeight) + 4;
      while (t.scrollHeight > max && s > 34) { s -= 2; t.style.fontSize = s + 'px'; }
      return t.scrollHeight > max;
    }, c.big ? 92 : 66);
    if (clipped) throw new Error('title does not fit: ' + c.key);
    await p.screenshot({ path: path.join(OUT, c.key + '.png') });
  }
  await browser.close();
  fs.unlinkSync(tmp);
  // flat text on white: a 64-colour palette keeps every edge and cuts the files to about a third
  try {
    require('child_process').execFileSync('python3', ['-I', '-c',
      'import sys,glob\nfrom PIL import Image\nfor f in glob.glob(sys.argv[1]+"/*.png"):\n Image.open(f).convert("RGB").quantize(64,dither=Image.Dither.NONE).save(f,optimize=True)', OUT]);
  } catch (e) { console.warn('palette step skipped (needs python3 with Pillow): ' + e.message); }
  console.log(cards.length + ' share images in ' + path.relative(ROOT, OUT));
})().catch(e => { console.error(e); process.exit(1); });
