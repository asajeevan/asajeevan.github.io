/* Local copies of the site fonts for the QA scripts.
   Some build containers cannot reach Google Fonts; the page then falls back to a wider
   system font and the label-overlap check reports problems a reader would never see.
   If QA_FONTS_DIR points at a folder with the @fontsource packages installed
   (npm i @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono @fontsource/schibsted-grotesk), every request for the
   Google Fonts stylesheet is answered with @font-face rules that embed those files.
   Without QA_FONTS_DIR this does nothing. */
const fs = require('fs');
const path = require('path');

function css() {
  const dir = process.env.QA_FONTS_DIR;
  if (!dir) return null;
  const face = (family, file, weight, style, range) => {
    const p = path.join(dir, 'node_modules', '@fontsource', file.pkg, 'files', file.name);
    if (!fs.existsSync(p)) return '';
    const b64 = fs.readFileSync(p).toString('base64');
    return `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');${range ? 'unicode-range:' + range + ';' : ''}}`;
  };
  const GREEK = 'U+0370-03FF,U+1F00-1FFF', EXT = 'U+0100-024F,U+1E00-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
  let out = '';
  for (const w of [400, 500, 600, 700]) for (const st of ['normal', 'italic']) {
    out += face('IBM Plex Sans', { pkg: 'ibm-plex-sans', name: `ibm-plex-sans-latin-${w}-${st}.woff2` }, w, st);
    out += face('IBM Plex Sans', { pkg: 'ibm-plex-sans', name: `ibm-plex-sans-latin-ext-${w}-${st}.woff2` }, w, st, EXT);
    out += face('IBM Plex Sans', { pkg: 'ibm-plex-sans', name: `ibm-plex-sans-greek-${w}-${st}.woff2` }, w, st, GREEK);
  }
  for (const w of [400, 500, 600]) out += face('IBM Plex Mono', { pkg: 'ibm-plex-mono', name: `ibm-plex-mono-latin-${w}-normal.woff2` }, w, 'normal');
  for (const w of [500, 600, 700]) {
    out += face('Schibsted Grotesk', { pkg: 'schibsted-grotesk', name: `schibsted-grotesk-latin-${w}-normal.woff2` }, w, 'normal');
    out += face('Schibsted Grotesk', { pkg: 'schibsted-grotesk', name: `schibsted-grotesk-latin-ext-${w}-normal.woff2` }, w, 'normal', EXT);
  }
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
