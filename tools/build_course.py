#!/usr/bin/env python3
"""Build the multi-page course from src/learn/course.json and the module sources.

  python3 tools/build_course.py              # the course: hub, chapters, lab handbook, references
  python3 tools/build_course.py --identity   # the 13 old modules as 13 pages (machinery check)

Each page is assembled from beats cut out of the old modules by tools/course_parse.py (moved
whole, never retyped), wrapped in src/learn/page.src.html, rendered with the same marker rules
as before (tools/build_learn.py: citations, pending blocks, mathematics, typesetting), given
its own reference list, and served with its own script bundle: learn-core plus only the figure
files its figures need (tools/js_deps.js follows the helpers shared between files).
"""
import json, re, sys, html, pathlib, subprocess
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build_learn as BL
from course_parse import parse, insert_tail, maths_lines, MODULES

ROOT = BL.ROOT
SRC = BL.SRC
OUT = ROOT / 'batteries'
COURSE = json.loads((SRC / 'course.json').read_text(encoding='utf-8'))
TEMPLATE = (SRC / 'page.src.html').read_text(encoding='utf-8')
MODS = {m: parse(m) for m in MODULES}
BEAT_OF = {b['fig']: (m, i) for m, p in MODS.items() for i, b in enumerate(p['beats'])}

def esc(s):
    return html.escape(s, quote=True)

# ---------------------------------------------------------------- scripts
def js_bundles(pages_figs):
    """pages_figs: {page_id: [fig ids]} -> ({page_id: bundle path relative to ROOT}, {page_id: bytes}).
    Bundles are cut at the level of top-level statements: the register() call of each figure on
    the page, every declaration those statements use (followed across files), and in the files
    so reached any plain expression statements (such as extra colours added to a shared table)."""
    deps = json.loads(subprocess.check_output(['node', str(ROOT / 'tools' / 'js_deps.js')]))
    text = {f: (SRC / 'figs' / f).read_text(encoding='utf-8') for f in deps}
    units, defined, roots = {}, {}, {}
    for f, v in deps.items():
        for i, st in enumerate(v['statements']):
            units[(f, i)] = st
            for n in st['defines']:
                defined[n] = (f, i)
            for r in st['registers']:
                roots[r] = (f, i)
    core = (SRC / 'learn-core.js').read_text(encoding='utf-8')
    outdir = ROOT / 'assets' / 'js' / 'learn'
    outdir.mkdir(parents=True, exist_ok=True)
    for old in outdir.glob('*.js'):
        old.unlink()
    result, sizes = {}, {}
    for pid, figs in pages_figs.items():
        chosen, stack = set(), [roots[f] for f in figs if f in roots]
        while stack:
            u = stack.pop()
            if u in chosen:
                continue
            chosen.add(u)
            stack.extend(defined[n] for n in units[u]['uses'] if n in defined)
        files = {f for f, i in chosen}
        for (f, i), st in units.items():
            if f in files and st['kind'] == 'ExpressionStatement' and not st['registers']:
                chosen.add((f, i))
        parts = []
        for f in sorted(files):
            idx = sorted(i for g, i in chosen if g == f)
            parts.append('  /* ' + f + ' */\n' + '\n'.join('  ' + text[f][units[(f, i)]['start']:units[(f, i)]['end']] for i in idx))
        name = pid.replace('/', '-') + '.js'
        out = core.replace('  /* {{figures}} */', '\n'.join(parts))
        out = FIGREF_JS(out) if FIGREF_JS else out
        (outdir / name).write_text(out, encoding='utf-8')
        result[pid] = 'assets/js/learn/' + name
        sizes[pid] = len(out.encode('utf-8'))
    return result, sizes

FIGREF_JS = None   # set in course mode: rewrites {{fig:ID}} markers inside figure scripts

# ---------------------------------------------------------------- page parts
def module_where(mid):
    m = re.search(r'\n    <p class="where">.*?</p>\n', MODS[mid]['open'], re.S)
    return m.group(0) if m else ''

def page_number_label(page):
    return 'Chapter %s' % page['num'] if page['kind'] == 'chapter' else 'Lab handbook · %s' % page['num']

def fig_prefix(page):
    return page['num'] if page['kind'] == 'chapter' else 'L' + page['num'].split()[-1]

def tail_targets():
    """For every module tail part, the page it goes to: {(mid, kind, index): page_id}; maths lines are placed separately."""
    out = {}
    for mid in MODULES:
        default = COURSE['tails'][mid]
        counts = {}
        for part in MODS[mid]['tail_parts']:
            k = part['kind']; i = counts.get(k, 0); counts[k] = i + 1
            out[(mid, k, i)] = COURSE['tail_overrides'].get('%s.%s.%d' % (mid, k, i), default)
    return out

# ---------------------------------------------------------------- assembling
def assemble_course():
    pages = COURSE['pages']
    page_of_fig, number_of = {}, {}
    for p in pages:
        k = 0
        for fid in p['beats']:
            m, i = BEAT_OF[fid]
            for f in MODS[m]['beats'][i]['figs']:
                k += 1
                page_of_fig[f] = p['id']
                number_of[f] = '%s.%d' % (fig_prefix(p), k)
    targets = tail_targets()
    # mathematics lines follow the figure they cite; otherwise the module's default page
    maths = {}   # page -> (head, [lines])
    for mid in MODULES:
        for part in MODS[mid]['tail_parts']:
            if part['kind'] != 'maths':
                continue
            head, lines, foot = maths_lines(part['html'])
            for ln in lines:
                refs = re.findall(r'figures? (\d+\.\d+)', ln)
                dest = COURSE['tails'][mid]
                for r in refs:
                    fid = OLD_NUM.get(r)
                    if fid in page_of_fig:
                        dest = page_of_fig[fid]; break
                h, ls = maths.setdefault(dest, (head, []))
                ls.append(ln)
    built = {}
    for p in pages:
        beats = []
        for fid in p['beats']:
            m, i = BEAT_OF[fid]
            beats.append(MODS[m]['beats'][i]['html'])
        first_mod, first_idx = BEAT_OF[p['beats'][0]]
        where = module_where(first_mod) if first_idx == 0 else ''
        # the closing elements assigned to this page, grouped by kind
        tail = {'recap': [], 'bridge': [], 'deeper': [], 'sources': []}
        for mid in MODULES:
            counts = {}
            for part in MODS[mid]['tail_parts']:
                k = part['kind']; i = counts.get(k, 0); counts[k] = i + 1
                if k == 'maths' or targets[(mid, k, i)] != p['id']:
                    continue
                tail[k].append(part['html'])
        tail_html = ''.join(tail['recap'] + tail['bridge'] + tail['deeper'])
        if p['id'] in maths:
            head, lines = maths[p['id']]
            head = re.sub(r' id="m\d+-maths"', '', head).replace('The mathematics of this module', 'The mathematics of this chapter')
            head = head.replace('<details class="deeper maths"', '<details class="deeper maths" id="maths"', 1)
            tail_html += head + ''.join(lines) + '\n        </div></details>\n'
        tail_html += ''.join(tail['sources'])
        if tail_html:
            beats[-1] = insert_tail(beats[-1], tail_html)
        opening = ('<section class="module" id="ch" data-act="%s" data-nav>\n  <div class="wrap">\n'
                   '    <p class="mod-n">%s</p>\n    <h2 class="h2">%s</h2>\n    <p class="hook">%s</p>\n%s'
                   % (p['part'], esc(page_number_label(p)), esc(p['title']), esc(p['question']), where.lstrip('\n')))
        content = opening + ''.join(beats) + '\n\n  </div>\n</section>\n'
        # figure numbers from the manifest
        def fnum(m):
            return '%s<span class="fnum">Figure %s</span>' % (m.group(1), number_of[m.group(2)])
        content = re.sub(r'(data-fig="([^"]+)" id="[^"]+">\s*)<span class="fnum">Figure [^<]*</span>', lambda m: '%s<span class="fnum">Figure %s</span>' % (m.group(1), number_of[m.group(2)]), content)
        built[p['id']] = content
    return built, page_of_fig, number_of

OLD_NUM = {}   # old figure number -> figure id, from the module sources
for mid in MODULES:
    for m in re.finditer(r'data-fig="([^"]+)" id="[^"]+">\s*<span class="fnum">Figure ([\d.]+)</span>', MODS[mid]['source']):
        OLD_NUM[m.group(2)] = m.group(1)

# ---------------------------------------------------------------- rendering
def page_refs(order, used_in):
    return '<ol class="refs">' + ''.join(BL.fmt_ref(k, i + 1) for i, k in enumerate(order)) + '</ol>'

REFSECTION = ('<section class="section page-refs" id="references">\n  <div class="wrap">\n    <h2 class="h2">References for this %s</h2>\n'
              '    <p class="policy">Numbers in the text refer to this list. <a href="%sbatteries/references/">All references of the course</a>, with the chapters that use each one.</p>\n'
              '    {{references}}\n  </div>\n</section>')

def render_page(pid, content, meta, nav, bundle, out_path):
    depth = pid.count('/') + 1 if pid else 0
    root = '../' * (depth + 1)
    text = TEMPLATE
    rep = {
        '{{page_title}}': esc(meta['page_title']), '{{og_title}}': esc(meta['og_title']), '{{description}}': esc(meta['description']),
        '{{url}}': COURSE['base'] + (pid + '/' if pid else ''), '{{ldjson}}': json.dumps(meta['ld'], ensure_ascii=False),
        '{{page_id}}': pid or 'hub', '{{hub}}': root + 'batteries/', '{{topnav}}': nav['top'], '{{pagenav}}': nav['bottom'],
        '{{refsection}}': (REFSECTION % (meta['kind_word'], root)) if meta.get('refs', True) else '',
        '{{bundle}}': bundle,
    }
    for k, v in rep.items():
        text = text.replace(k, v)
    text = text.replace('{{content}}', content)
    text = text.replace('{{root}}', root)
    text, order = BL.render(text, refs_fn=page_refs, quiet=True)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text, encoding='utf-8')
    return text, order

def nav_for(pages, i, root):
    p = pages[i]
    prev = pages[i - 1] if i > 0 else None
    nxt = pages[i + 1] if i + 1 < len(pages) else None
    link = lambda q: root + 'batteries/' + q['id'] + '/'
    label = lambda q: '%s %s' % ('Ch.' if q['kind'] == 'chapter' else '', q['num'] if q['kind'] == 'chapter' else q['num'])
    top = ['      <a href="%sbatteries/">Contents</a>' % root]
    if prev: top.append('      <a href="%s" rel="prev">&#8592; %s</a>' % (link(prev), esc(label(prev).strip())))
    if nxt: top.append('      <a href="%s" rel="next">%s &#8594;</a>' % (link(nxt), esc(label(nxt).strip())))
    top.append('      <a href="#references">References</a>')
    bottom = ['<nav class="pagenav wrap" aria-label="Previous and next">']
    if prev:
        bottom.append('  <a class="pn prev" href="%s" rel="prev"><span class="pn-k">&#8592; Previous</span><span class="pn-t">%s %s</span><span class="pn-q">%s</span></a>'
                      % (link(prev), esc(prev['num'] if prev['kind'] == 'lab' else 'Chapter ' + prev['num']), esc(prev['menu']), esc(prev['question'])))
    if nxt:
        bottom.append('  <a class="pn next" href="%s" rel="next"><span class="pn-k">Next &#8594;</span><span class="pn-t">%s %s</span><span class="pn-q">%s</span></a>'
                      % (link(nxt), esc(nxt['num'] if nxt['kind'] == 'lab' else 'Chapter ' + nxt['num']), esc(nxt['menu']), esc(nxt['question'])))
    bottom.append('</nav>')
    return {'top': '\n'.join(top), 'bottom': '\n'.join(bottom)}

def figs_in(content):
    return re.findall(r'data-fig="([^"]+)"', content)

# ---------------------------------------------------------------- modes
def build_identity():
    out = OUT / '_identity'
    pages = [{'id': '_identity/' + m, 'kind': 'chapter', 'num': str(int(m[1:])), 'menu': m, 'question': ''} for m in MODULES]
    contents = {p['id']: MODS[p['id'].split('/')[1]]['source'] for p in pages}
    bundles, sizes = js_bundles({pid: figs_in(c) for pid, c in contents.items()})
    for i, p in enumerate(pages):
        meta = {'page_title': p['id'], 'og_title': p['id'], 'description': p['id'], 'ld': {}, 'kind_word': 'module'}
        root = '../' * (p['id'].count('/') + 2)
        text, order = render_page(p['id'], contents[p['id']], meta, nav_for(pages, i, root), bundles[p['id']], OUT / p['id'] / 'index.html')
        print('%-16s %7d bytes html, %7d bytes js, %2d refs' % (p['id'], len(text.encode()), sizes[p['id']], len(order)))

def build_course():
    global FIGREF_JS
    contents, page_of_fig, number_of = assemble_course()
    pages = COURSE['pages']
    bundles, sizes = js_bundles({pid: figs_in(c) for pid, c in contents.items()})
    total = 0
    for i, p in enumerate(pages):
        root = '../' * (p['id'].count('/') + 2)
        meta = {'page_title': '%s %s | How batteries work' % (('Chapter ' + p['num']) if p['kind'] == 'chapter' else p['num'], p['menu']),
                'og_title': p['title'], 'description': p['question'] + ' ' + p['title'] + '.',
                'ld': {'@context': 'https://schema.org', '@type': 'Article', 'headline': p['title'], 'isPartOf': {'@type': 'Course', 'name': COURSE['title'], 'url': COURSE['base']},
                       'author': {'@type': 'Person', 'name': 'Aswadh Shyma Sajeevan', 'url': 'https://asajeevan.github.io/'}, 'url': COURSE['base'] + p['id'] + '/', 'inLanguage': 'en'},
                'kind_word': 'chapter' if p['kind'] == 'chapter' else 'page'}
        text, order = render_page(p['id'], contents[p['id']], meta, nav_for(pages, i, root), bundles[p['id']], OUT / p['id'] / 'index.html')
        total += len(text.encode())
        print('%-26s %7d bytes html, %7d bytes js, %2d refs' % (p['id'], len(text.encode()), sizes[p['id']], len(order)))
    print('course: %d pages, %d bytes of html' % (len(pages), total))

if __name__ == '__main__':
    if '--identity' in sys.argv:
        build_identity()
    else:
        build_course()
