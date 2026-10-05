/* Local copies of the site fonts for the QA scripts.
   Some build containers cannot reach Google Fonts; the page then falls back to a wider
   system font and the label-overlap check reports problems a reader would never see.
   If QA_FONTS_DIR points at a folder with the @fontsource packages installed
   (npm i @fontsource/manrope @fontsource/dm-serif-display), every request for the
   Google Fonts stylesheet is answered with @font-face rules that embed those files.
   Without QA_FONTS_DIR this does nothing. */
const fs = require('fs');
const path = require('path');

function css() {
  const dir = process.env.QA_FONTS_DIR;
  if (!dir) return null;
  const face = (family, file, weight, style) => {
    const p = path.join(dir, 'node_modules', '@fontsource', file.pkg, 'files', file.name);
    if (!fs.existsSync(p)) return '';
    const b64 = fs.readFileSync(p).toString('base64');
    return `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  };
  let out = '';
  for (const w of [400, 500, 600, 700]) out += face('Manrope', { pkg: 'manrope', name: `manrope-latin-${w}-normal.woff2` }, w, 'normal');
  out += face('DM Serif Display', { pkg: 'dm-serif-display', name: 'dm-serif-display-latin-400-normal.woff2' }, 400, 'normal');
  out += face('DM Serif Display', { pkg: 'dm-serif-display', name: 'dm-serif-display-latin-400-italic.woff2' }, 400, 'italic');
  return out;
}

async function useLocalFonts(ctx) {
  const body = css();
  if (!body) return false;
  await ctx.route(/fonts\.googleapis\.com\/css2/, r => r.fulfill({ status: 200, contentType: 'text/css', body }));
  await ctx.route(/fonts\.gstatic\.com/, r => r.fulfill({ status: 204, body: '' }));
  return true;
}

module.exports = { useLocalFonts };
