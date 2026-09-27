#!/usr/bin/env python3
"""Build the learning pages from their sources.

Source files live in src/learn/ and use these markers:

  {{cite:R1}}            a citation. Not rendered on the page (the owner asked for a
                         clean text with the references at the end only), but still
                         validated, and it decides which modules each reference is
                         listed under.
  {{cite:R1,R6}}         several citations at once
  {{sources:R1,R6}}      the module's source list: validated, not rendered
  {{references}}         the reference list for the whole page, with the modules
                         each reference supports
  {{include:file.html}}  inline another source file (figures live in their own files)

The build fails if a cited key is missing from src/learn/references.json or has
a status other than "verified", which is the citation policy enforced
mechanically. Figure captions' <span class="basis"> notes are wrapped into a
collapsed <details class="src"> so the source stays one tap away.
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

SUP = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '−', 'ⁿ': 'n', '′': '′'}
SUB = {'₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', '₊': '+', '₋': '−'}
SUPC = ''.join(k for k in SUP if k != '′')
SUBC = ''.join(SUB)

EQUATIONS = [  # inline equations that get the math face (longest first so that prefixes do not steal a match)
    'F = qq′/(4πε₀r²)', 'φ = −∫E·dl', 'φ = q/(4πε₀r)', 'q = ε₀∮E·dS', 'μ̄ = μ + zFφ', 'u = |z|e/(6πηr)', 'κ = FΣ|z|uC',
    'Q = nF/(3.6 M)', 'Q = nF/(3.6 M)', 'mass = I·t·M/(nF)', 'R = ρl/A', 'i = dQ/dt', 'ΔG = −nFE', 'E = IR', 'V = IR', 'P = IV', 'q = C·E', 'Q = nFN',
    'V<sub>OC</sub> = (μ<sub>A</sub> − μ<sub>C</sub>)/e', 'φ<sup>Zn</sup> − φ<sup>Cu</sup> = (μ°<sub>e</sub><sup>Zn</sup> − μ°<sub>e</sub><sup>Cu</sup>)/F',
    'μ̄<sub>e</sub> = μ°<sub>e</sub> − Fφ', '−nFE = n(μ̄<sub>e</sub><sup>Cu′</sup> − μ̄<sub>e</sub><sup>Cu</sup>)', '1 V = 1 J/C',
]

def scripts_to_html(seg):
    """Unicode super/subscript runs in a text segment become <sup>/<sub> elements."""
    out, i, n = [], 0, len(seg)
    while i < n:
        c = seg[i]
        if c in SUPC:
            j = i
            while j < n and seg[j] in SUPC: j += 1
            out.append('<sup>' + ''.join(SUP[x] for x in seg[i:j]) + '</sup>'); i = j
        elif c in SUBC:
            j = i
            while j < n and seg[j] in SUBC: j += 1
            out.append('<sub>' + ''.join(SUB[x] for x in seg[i:j]) + '</sub>'); i = j
        else:
            out.append(c); i += 1
    return ''.join(out)

def typeset(text):
    """Apply scripts_to_html to text nodes outside <svg> (SVG text is typeset by learn.js),
    then wrap the known inline equations in the math face."""
    import html as _html
    parts = re.split(r'(<svg\b.*?</svg>)', text, flags=re.S)
    for k, part in enumerate(parts):
        if part.startswith('<svg'):
            continue
        toks = re.split(r'(<[^>]+>)', part)
        for t, tok in enumerate(toks):
            if tok.startswith('<') or not tok:
                continue
            dec = _html.unescape(tok)
            conv = scripts_to_html(dec)
            if conv != dec:
                toks[t] = conv.replace('&', '&amp;').replace('<sup>', '\x00sup\x00').replace('</sup>', '\x00/sup\x00').replace('<sub>', '\x00sub\x00').replace('</sub>', '\x00/sub\x00').replace('<', '&lt;').replace('>', '&gt;').replace('\x00sup\x00', '<sup>').replace('\x00/sup\x00', '</sup>').replace('\x00sub\x00', '<sub>').replace('\x00/sub\x00', '</sub>')
                # keep the original entity form for everything except the converted scripts: re-escape only & < >
                # (the decoded text may contain characters like – and ’ which are fine as UTF-8)
        parts[k] = ''.join(toks)
    text = ''.join(parts)
    for eq in sorted(EQUATIONS, key=len, reverse=True):
        eq_html = scripts_to_html(eq)
        text = text.replace(eq_html, '<span class="eq">' + eq_html + '</span>')
    return text

def build(src_name, out_path):
    text = (SRC / src_name).read_text(encoding='utf-8')

    # includes
    def inc(m):
        return (SRC / m.group(1).strip()).read_text(encoding='utf-8')
    text = re.sub(r'\{\{include:([^}]+)\}\}', inc, text)

    order = []
    errors = []
    used_in = {}   # key -> ordered list of module labels

    def module_at(pos):
        # the module section that contains character position pos
        best = None
        for m in re.finditer(r'<section class="module" id="m(\d+)"', text):
            if m.start() <= pos:
                best = m.group(1)
        return None if best is None else str(int(best))

    def number(key, pos=None):
        if key not in REFS:
            errors.append('unknown reference key %r' % key)
            return 0
        if REFS[key]['status'] != 'verified':
            errors.append('reference %s is %s, not verified; it may not be cited' % (key, REFS[key]['status']))
        if key not in order:
            order.append(key)
        if pos is not None:
            mod = module_at(pos)
            if mod is not None and mod not in used_in.setdefault(key, []):
                used_in[key].append(mod)
        return order.index(key) + 1

    def cite(m):
        for k in [k.strip() for k in m.group(1).split(',') if k.strip()]:
            number(k, m.start())
        return ''
    text = re.sub(r'\{\{cite:([^}]+)\}\}', cite, text)

    def sources(m):
        for k in [k.strip() for k in m.group(1).split(',') if k.strip()]:
            number(k, m.start())
        return ''
    text = re.sub(r'\s*\{\{sources:([^}]+)\}\}', sources, text)

    # figure captions: the basis note becomes a collapsed "Source" toggle
    text = re.sub(r'<span class="basis">(.*?)</span>',
                  r'<details class="src"><summary>Source</summary><span class="basis">\1</span></details>',
                  text, flags=re.S)

    def ref_with_modules(k, n):
        html = fmt_ref(k, n)
        mods = used_in.get(k, [])
        if mods:
            mods = sorted(mods, key=int)
            label = 'Module ' + mods[0] if len(mods) == 1 else 'Modules ' + ', '.join(mods)
            html = html.replace('</li>', '<span class="ref-mods">%s</span></li>' % label)
        return html
    refs_html = '<ol class="refs">' + ''.join(ref_with_modules(k, i + 1) for i, k in enumerate(order)) + '</ol>'
    text = text.replace('{{references}}', refs_html)

    text = typeset(text)

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
