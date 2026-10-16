/* Save a figure: every figure card gets a "Save figure" button that opens a small dialog with
   three downloads (PNG at 3x, SVG, and an animated GIF for figures that move), each carrying a
   small credit line, and the citation to go with the file. Styles are inlined from the page so
   the file looks the same outside it; the web fonts are embedded when they can be fetched. The
   GIF encoder (gifenc, MIT) is loaded only when a GIF is asked for. */
(function () {
  'use strict';
  var cite = document.getElementById('cite'); if (!cite) return;
  var d = cite.dataset, root = (document.querySelector('script[src$="assets/js/export.js"]') || {}).src || '';
  root = root.replace(/assets\/js\/export\.js.*$/, '');
  var SITE = 'asajeevan.github.io/batteries', AUTHOR = (d.given || 'Aswadh') + ' ' + (d.family || 'Shyma Sajeevan');
  var year = (d.date || '').slice(0, 4) || String(new Date().getFullYear());
  var FONT_CSS = (document.querySelector('link[href*="fonts.googleapis.com/css"]') || {}).href || '';
  var STYLE_PROPS = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'text-anchor', 'dominant-baseline', 'visibility', 'paint-order', 'mix-blend-mode', 'filter', 'transform', 'transform-origin', 'transform-box', 'color', 'display'];
  var INHERIT_OK = { 'fill': 1, 'stroke': 1, 'font-family': 1, 'font-size': 1, 'font-weight': 1, 'font-style': 1, 'text-anchor': 1, 'color': 1 };

  function figNumber(fig) { var n = fig.querySelector('.fnum'); return n ? n.textContent.replace(/^Figure\s*/i, '').trim() : fig.getAttribute('data-fig'); }
  function figTitle(fig) { var t = fig.querySelector('svg > title'); return t ? t.textContent.trim() : ''; }
  function captionText(fig) { var c = fig.querySelector('figcaption'); if (!c) return ''; var first = c.childNodes[0]; return (first && first.nodeType === 3 ? first.textContent : c.textContent).trim(); }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  /* ---------- a clean, self-contained copy of the SVG ---------- */
  function snapshot(fig, opts) {
    var svg = fig.querySelector('svg'), vb = (svg.getAttribute('viewBox') || '0 0 520 300').split(/[\s,]+/).map(Number);
    var W = vb[2], H = vb[3], strip = 16;
    var clone = svg.cloneNode(true), live = svg.querySelectorAll('*'), copy = clone.querySelectorAll('*');
    var used = {};
    for (var i = 0; i < live.length; i++) {
      var cs = getComputedStyle(live[i]), e = copy[i];
      if (!e || e.namespaceURI !== 'http://www.w3.org/2000/svg') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden' || (opts.clean && live[i].classList && live[i].classList.contains('callout'))) { if (e.parentNode) e.parentNode.removeChild(e); continue; }
      var pcs = live[i].parentNode && live[i].parentNode.namespaceURI === 'http://www.w3.org/2000/svg' ? getComputedStyle(live[i].parentNode) : null;
      var st = '';
      for (var k = 0; k < STYLE_PROPS.length; k++) {
        var p = STYLE_PROPS[k], v = cs.getPropertyValue(p);
        if (!v || v === 'none' && p !== 'fill' && p !== 'stroke' && p !== 'display' || v === 'normal' || v === 'auto') continue;
        if (p === 'display') continue;
        if (INHERIT_OK[p] && pcs && pcs.getPropertyValue(p) === v && e.tagName !== 'text') continue;   // let it inherit, keeps the file small
        if (p === 'transform' && (v === 'none' || e.hasAttribute('transform'))) continue;
        st += p + ':' + v + ';';
      }
      if (st) e.setAttribute('style', st);
      e.removeAttribute('class'); e.removeAttribute('tabindex'); e.removeAttribute('role');
      if (e.tagName === 'text' || e.tagName === 'tspan') used[cs.fontFamily.split(',')[0].replace(/["']/g, '').trim() + '|' + cs.fontWeight + '|' + cs.fontStyle] = 1;
    }
    Array.prototype.forEach.call(clone.querySelectorAll('button, input, foreignObject, script'), function (x) { if (x.parentNode) x.parentNode.removeChild(x); });
    var bg = getComputedStyle(fig).backgroundColor, muted = getComputedStyle(fig.querySelector('.fnum') || fig).color;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clone.setAttribute('viewBox', '0 0 ' + W + ' ' + (H + strip)); clone.setAttribute('width', W); clone.setAttribute('height', H + strip);
    clone.removeAttribute('aria-labelledby'); clone.removeAttribute('role'); clone.removeAttribute('class'); clone.removeAttribute('style');
    var ns = 'http://www.w3.org/2000/svg';
    var back = document.createElementNS(ns, 'rect'); back.setAttribute('width', W); back.setAttribute('height', H + strip); back.setAttribute('fill', opts.white ? '#ffffff' : (bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#ffffff'));
    clone.insertBefore(back, clone.firstChild);
    // the credit line, in the strip below the drawing
    var credit = document.createElementNS(ns, 'text');
    credit.setAttribute('x', W - 4); credit.setAttribute('y', H + strip - 5); credit.setAttribute('text-anchor', 'end');
    credit.setAttribute('style', 'font-family:' + getComputedStyle(svg).fontFamily + ';font-size:7.5px;fill:' + (opts.white ? '#6b7280' : muted) + ';opacity:.85;letter-spacing:.02em');
    credit.textContent = AUTHOR + ' · ' + SITE + ' · Figure ' + figNumber(fig);
    clone.appendChild(credit);
    var desc = document.createElementNS(ns, 'desc'); desc.textContent = 'From "How batteries work" by ' + AUTHOR + ', ' + d.url + ' . Figure ' + figNumber(fig) + '. Please cite the page when you reuse it.';
    clone.insertBefore(desc, clone.firstChild);
    return { svg: clone, W: W, H: H + strip, fonts: used };
  }
  function serialize(snap, fontCss) {
    if (fontCss) { var st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = fontCss; snap.svg.insertBefore(st, snap.svg.firstChild); }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(snap.svg);
  }

  /* ---------- the web fonts, embedded as data URIs so the file reads the same anywhere ---------- */
  var fontCache = null;
  function embeddedFonts(used) {
    if (!FONT_CSS || !window.fetch) return Promise.resolve('');
    if (!fontCache) {
      fontCache = fetch(FONT_CSS, { mode: 'cors', credentials: 'omit' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (css) {
        // split into @font-face blocks; keep the latin subset of each
        var blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [], faces = [];
        blocks.forEach(function (b) {
          if (!/U\+0000-00FF/.test(b)) return;
          var fam = (b.match(/font-family:\s*'([^']+)'/) || [])[1], w = (b.match(/font-weight:\s*(\d+)/) || [])[1] || '400', s = (b.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
          var url = (b.match(/url\(([^)]+\.woff2)\)/) || [])[1];
          if (fam && url) faces.push({ fam: fam, w: w, s: s, url: url, css: null });
        });
        return faces;
      }).catch(function () { return []; });
    }
    return fontCache.then(function (faces) {
      var want = faces.filter(function (f) { return used[f.fam + '|' + f.w + '|' + f.s]; });
      return Promise.all(want.map(function (f) {
        if (f.css) return f.css;
        return fetch(f.url, { mode: 'cors', credentials: 'omit' }).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (buf) {
          if (!buf) return '';
          var bin = '', bytes = new Uint8Array(buf); for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          f.css = "@font-face{font-family:'" + f.fam + "';font-weight:" + f.w + ';font-style:' + f.s + ";src:url(data:font/woff2;base64," + btoa(bin) + ") format('woff2')}";
          return f.css;
        }).catch(function () { return ''; });
      })).then(function (parts) { return parts.join('\n'); });
    });
  }

  /* ---------- rendering to pixels ---------- */
  function toImage(svgText) {
    return new Promise(function (res, rej) {
      var img = new Image(), url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
      img.onload = function () { URL.revokeObjectURL(url); res(img); }; img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('render')); };
      img.src = url;
    });
  }
  function draw(img, W, H, scale) {
    var cv = document.createElement('canvas'); cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
    var ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, cv.width, cv.height); return cv;
  }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  function fileBase(fig) { return 'how-batteries-work_fig-' + slug(figNumber(fig)); }

  function savePng(fig, opts) {
    var snap = snapshot(fig, opts);
    return embeddedFonts(snap.fonts).then(function (css) { return toImage(serialize(snap, css)); }).then(function (img) {
      var cv = draw(img, snap.W, snap.H, 3);
      return new Promise(function (res) { cv.toBlob(function (b) { download(b, fileBase(fig) + '.png'); res(); }, 'image/png'); });
    });
  }
  function saveSvg(fig, opts) {
    var snap = snapshot(fig, opts);
    return embeddedFonts(snap.fonts).then(function (css) { download(new Blob([serialize(snap, css)], { type: 'image/svg+xml' }), fileBase(fig) + '.svg'); });
  }

  /* ---------- the animated GIF: frames taken from the live figure while it runs ---------- */
  function loadGifenc() {
    if (window.gifenc) return Promise.resolve(window.gifenc);
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = root + 'assets/js/gifenc.js'; s.onload = function () { res(window.gifenc); }; s.onerror = rej; document.head.appendChild(s); });
  }
  function figureLoop(fig) { var L = window.LearnCore && window.LearnCore.loops || []; for (var i = 0; i < L.length; i++) if (L[i].fig === fig) return L[i].loop; return null; }
  function isAnimated(fig) { return !!(figureLoop(fig) || fig.querySelector('button.ctl')); }
  function saveGif(fig, opts, progress) {
    var seconds = opts.seconds || 6, fps = 12, frames = [], snapFonts = {}, W, H;
    var loop = figureLoop(fig), play = fig.querySelector('button.ctl');
    if (loop && !loop.running()) { loop.wanted = true; loop.start(); } else if (!loop && play && play.getAttribute('aria-pressed') !== 'true') play.click();
    return loadGifenc().then(function (G) {
      return new Promise(function (res) {
        var n = Math.round(seconds * fps), t0 = null, last = -1;
        function grab(ts) {
          if (t0 === null) t0 = ts;
          var k = Math.floor((ts - t0) / 1000 * fps);
          if (k > last) { last = k; var s = snapshot(fig, opts); W = s.W; H = s.H; for (var f in s.fonts) snapFonts[f] = 1; frames.push(s); progress('Recording ' + Math.min(n, frames.length) + ' / ' + n); }
          if (frames.length < n) requestAnimationFrame(grab); else res();
        }
        requestAnimationFrame(grab);
      }).then(function () { return embeddedFonts(snapFonts); }).then(function (css) {
        var scale = 1.5, enc = G.GIFEncoder(), i = 0;
        function next() {
          if (i >= frames.length) { enc.finish(); download(new Blob([enc.bytes()], { type: 'image/gif' }), fileBase(fig) + '.gif'); return Promise.resolve(); }
          progress('Encoding ' + (i + 1) + ' / ' + frames.length);
          return toImage(serialize(frames[i], css)).then(function (img) {
            var cv = draw(img, W, H, scale), data = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
            var pal = G.quantize(data, 256), idx = G.applyPalette(data, pal);
            enc.writeFrame(idx, cv.width, cv.height, { palette: pal, delay: Math.round(1000 / fps) });
            i++; return next();
          });
        }
        return next();
      });
    });
  }

  /* ---------- the dialog ---------- */
  var dlg = null, current = null;
  function citation(fig) {
    var initials = (d.given || '').split(/[\s-]+/).map(function (w) { return w.charAt(0) + '.'; }).join(' ');
    return d.family + ', ' + initials + ' (' + year + '). Figure ' + figNumber(fig) + ' in ' + d.title + '. ' + d.courseTitle + '. ' + d.url;
  }
  function build() {
    dlg = document.createElement('dialog'); dlg.className = 'exp';
    dlg.innerHTML =
      '<form method="dialog" class="exp-in">' +
      '<button type="submit" class="exp-x" aria-label="Close">×</button>' +
      '<p class="exp-h">Save <b class="exp-num"></b></p>' +
      '<p class="exp-t"></p>' +
      '<div class="exp-row" role="group" aria-label="Format">' +
      '<button type="button" class="btn exp-b" data-k="png">PNG <small>3×, for slides</small></button>' +
      '<button type="button" class="btn exp-b" data-k="svg">SVG <small>vector, editable</small></button>' +
      '<button type="button" class="btn exp-b exp-gif" data-k="gif">GIF <small>6 s of the animation</small></button>' +
      '</div>' +
      '<div class="exp-opts"><label class="exp-opt"><input type="checkbox" class="exp-clean" checked> Remove the numbered markers</label><label class="exp-opt"><input type="checkbox" class="exp-white"> White background</label></div>' +
      '<p class="exp-status" role="status"></p>' +
      '<p class="exp-note">Free to use in teaching, talks and theses. Each file carries a small credit line; please also cite it:</p>' +
      '<p class="exp-cite"></p>' +
      '<div class="exp-row"><button type="button" class="btn exp-copy">Copy citation</button><a class="btn exp-more" href="#cite">Other citation styles</a></div>' +
      '</form>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    var status = dlg.querySelector('.exp-status');
    function setStatus(s) { status.textContent = s; }
    Array.prototype.forEach.call(dlg.querySelectorAll('.exp-b'), function (b) {
      b.addEventListener('click', function () {
        if (!current) return;
        var k = b.getAttribute('data-k'), opts = { white: dlg.querySelector('.exp-white').checked, clean: dlg.querySelector('.exp-clean').checked, seconds: 6 };
        var busy = Array.prototype.slice.call(dlg.querySelectorAll('.exp-b')); busy.forEach(function (x) { x.disabled = true; });
        setStatus(k === 'gif' ? 'Recording…' : 'Preparing…');
        var job = k === 'png' ? savePng(current, opts) : k === 'svg' ? saveSvg(current, opts) : saveGif(current, opts, setStatus);
        job.then(function () { setStatus('Saved as ' + fileBase(current) + '.' + k); }, function () { setStatus('Sorry, this browser could not make the file. Try PNG, or another browser.'); })
          .then(function () { busy.forEach(function (x) { x.disabled = false; }); });
      });
    });
    dlg.querySelector('.exp-copy').addEventListener('click', function () {
      var t = dlg.querySelector('.exp-cite').textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { setStatus('Citation copied'); }, function () { setStatus('Select the citation and copy it'); });
      else setStatus('Select the citation and copy it');
    });
    dlg.querySelector('.exp-more').addEventListener('click', function () { dlg.close(); });
  }
  function open(fig) {
    if (!dlg) build();
    current = fig;
    dlg.querySelector('.exp-num').textContent = 'Figure ' + figNumber(fig);
    dlg.querySelector('.exp-t').textContent = captionText(fig) || figTitle(fig);
    dlg.querySelector('.exp-gif').hidden = !isAnimated(fig);
    dlg.querySelector('.exp-cite').textContent = citation(fig);
    dlg.querySelector('.exp-status').textContent = '';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }

  Array.prototype.forEach.call(document.querySelectorAll('figure.fig[data-fig]'), function (fig) {
    if (!fig.querySelector('svg')) return;
    var cap = fig.querySelector('figcaption'); if (!cap) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'fig-save';
    b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" width="14" height="14"><path d="M8 2v8m0 0L5 7m3 3 3-3M3 12v1.5h10V12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Save figure';
    b.setAttribute('aria-label', 'Save figure ' + figNumber(fig) + ' as an image');
    b.addEventListener('click', function () { open(fig); });
    cap.appendChild(b);
  });
})();
