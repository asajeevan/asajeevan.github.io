#!/usr/bin/env python3
"""Build the learning pages from their sources.

Source files live in src/learn/ and use these markers:

  {{cite:R1}}            one citation, rendered as a numbered superscript
  {{cite:R1,R6}}         several citations in one superscript
  {{sources:R1,R6}}      the "Sources for this module" line
  {{references}}         the numbered reference list for the whole page
  {{include:file.html}}  inline another source file (figures live in their own files)

Numbers are assigned in order of first appearance on the page and are stable
as long as the order of first appearance does not change. The build fails if a
cited key is missing from src/learn/references.json or has a status other than
"verified", which is the citation policy enforced mechanically.
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / 'src' / 'learn'
REFS = json.loads((SRC / 'references.json').read_text(encoding='utf-8'))

PAGES = {
    'story.src.html': ROOT / 'batteries' / 'index.html',
}

def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def fmt_ref(key, n):
    r = REFS[key]
    parts = [esc(r['authors']) + ',', '"' + esc(r['title']) + '",', '<i>' + esc(r['journal']) + '</i>']
    tail = ''
    if r.get('volume'):
        tail += ' <b>' + esc(str(r['volume'])) + '</b>'
    tail += ', ' + str(r['year'])
    if r.get('pages'):
        tail += ', ' + esc(r['pages'])
    doi = ''
    if r.get('doi'):
        doi = ' <a href="https://doi.org/%s" target="_blank" rel="noopener">doi:%s</a>' % (esc(r['doi']), esc(r['doi']))
    return ('<li id="ref-%d" itemscope itemtype="https://schema.org/%s">'
            '<span class="ref-n">%d</span> <span class="ref-body">%s%s.%s</span></li>'
            % (n, 'Book' if key.startswith('B') else 'ScholarlyArticle', n, ' '.join(parts), tail, doi))

def build(src_name, out_path):
    text = (SRC / src_name).read_text(encoding='utf-8')

    # includes
    def inc(m):
        return (SRC / m.group(1).strip()).read_text(encoding='utf-8')
    text = re.sub(r'\{\{include:([^}]+)\}\}', inc, text)

    order = []
    errors = []

    def number(key):
        if key not in REFS:
            errors.append('unknown reference key %r' % key)
            return 0
        if REFS[key]['status'] != 'verified':
            errors.append('reference %s is %s, not verified; it may not be cited' % (key, REFS[key]['status']))
        if key not in order:
            order.append(key)
        return order.index(key) + 1

    def cite(m):
        keys = [k.strip() for k in m.group(1).split(',') if k.strip()]
        nums = [number(k) for k in keys]
        links = ','.join('<a href="#ref-%d">%d</a>' % (n, n) for n in nums)
        return '<sup class="cite">%s</sup>' % links
    text = re.sub(r'\{\{cite:([^}]+)\}\}', cite, text)

    def sources(m):
        keys = [k.strip() for k in m.group(1).split(',') if k.strip()]
        items = []
        for k in keys:
            n = number(k)
            items.append('<a href="#ref-%d">[%d] %s</a>' % (n, n, esc(REFS[k]['short'])))
        return '<p class="sources"><span>Sources for this module:</span> ' + ' · '.join(items) + '</p>'
    text = re.sub(r'\{\{sources:([^}]+)\}\}', sources, text)

    refs_html = '<ol class="refs">' + ''.join(fmt_ref(k, i + 1) for i, k in enumerate(order)) + '</ol>'
    text = text.replace('{{references}}', refs_html)

    leftover = re.findall(r'\{\{[^}]*\}\}', text)
    if leftover:
        errors.append('unresolved markers: %s' % leftover[:5])
    if errors:
        for e in errors:
            print('ERROR:', e, file=sys.stderr)
        sys.exit(1)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text, encoding='utf-8')
    print('built %s (%d bytes, %d references)' % (out_path.relative_to(ROOT), len(text.encode('utf-8')), len(order)))

def build_js():
    core = (SRC / 'learn-core.js').read_text(encoding='utf-8')
    parts = sorted((SRC / 'figs').glob('*.js'))
    figs = '\n'.join(p.read_text(encoding='utf-8') for p in parts)
    out = core.replace('  /* {{figures}} */', figs)
    (ROOT / 'assets' / 'js' / 'learn.js').write_text(out, encoding='utf-8')
    print('built assets/js/learn.js from core + %d figure files' % len(parts))

if __name__ == '__main__':
    build_js()
    for s, o in PAGES.items():
        build(s, o)
