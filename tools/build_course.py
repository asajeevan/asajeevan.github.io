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

# ---------------------------------------------------------------- citation
AUTHOR = {'family': 'Shyma Sajeevan', 'given': 'Aswadh'}
COURSE_DATE_SKIP = ROOT / 'tools' / 'course_date_skip.txt'
def course_date():
    """The date of the course as cited: the last commit that changed its sources (falls back to today).
    Commits listed in tools/course_date_skip.txt changed this script without changing the course (the sitemap of
    the site's other pages, for instance) and do not count."""
    import datetime
    skip = set()
    if COURSE_DATE_SKIP.exists():
        skip = {l.split()[0] for l in COURSE_DATE_SKIP.read_text(encoding='utf-8').splitlines() if l.strip() and not l.startswith('#')}
    try:
        log = subprocess.check_output(['git', 'log', '--format=%H %cs', '--', 'src/learn', 'tools/build_course.py'], cwd=str(ROOT), text=True)
        for line in log.splitlines():
            h, d = line.split()
            if h not in skip and re.fullmatch(r'\d{4}-\d{2}-\d{2}', d):
                return d
    except Exception:
        pass
    return datetime.date.today().isoformat()
CITE_DATE = course_date()

def cite_meta(title, url):
    """Tags that reference managers (Zotero and others) and indexers read: Highwire citation_*, Dublin Core."""
    y, m, d = CITE_DATE.split('-')
    tags = [('citation_title', title), ('citation_author', '%s, %s' % (AUTHOR['family'], AUTHOR['given'])),
            ('citation_date', '%s/%s/%s' % (y, m, d)), ('citation_publication_date', '%s/%s/%s' % (y, m, d)),
            ('citation_language', 'en'), ('citation_public_url', url),
            ('DC.title', title), ('DC.creator', '%s, %s' % (AUTHOR['family'], AUTHOR['given'])), ('DC.date', CITE_DATE),
            ('DC.type', 'Text'), ('DC.format', 'text/html'), ('DC.language', 'en'), ('DC.identifier', url),
            ('DC.relation.ispartof', COURSE['title'])]
    return '\n'.join('<meta name="%s" content="%s">' % (k, esc(v)) for k, v in tags)

def cite_section(title, url, is_course):
    """The 'Cite this page' block: a plain APA reference (works without scripts); assets/js/cite.js adds the
    formats (APA, Nature, Harvard, BibTeX, RIS), the page or course choice, copy and download."""
    year = CITE_DATE[:4]
    course_full = '%s: %s' % (COURSE['title'], COURSE['subtitle'])
    if is_course:
        apa = '%s, %s (%s). <i>%s</i>. %s' % (AUTHOR['family'], AUTHOR['given'][0] + '.', year, esc(course_full), esc(url))
    else:
        apa = '%s, %s (%s). <i>%s</i>. %s. %s' % (AUTHOR['family'], AUTHOR['given'][0] + '.', year, esc(title), esc(COURSE['title']), esc(url))
    return ('<section class="section cite-sec" id="cite" aria-labelledby="citeH" data-title="%s" data-url="%s" data-date="%s" data-course-title="%s" '
            'data-course-subtitle="%s" data-course-url="%s" data-family="%s" data-given="%s"%s>\n  <div class="wrap">\n'
            '    <h2 class="h2" id="citeH">%s</h2>\n'
            '    <p class="cite-lede">Using this %s in teaching, a thesis or an article? Cite it as follows; the date is the last update of the course.</p>\n'
            '    <div class="cite-ui"><p class="cite-out cite-static">%s</p></div>\n  </div>\n</section>\n') % (
        esc(title), esc(url), CITE_DATE, esc(COURSE['title']), esc(COURSE['subtitle']), esc(COURSE['base']), esc(AUTHOR['family']), esc(AUTHOR['given']),
        ' data-course-only' if is_course else '', 'Cite this course' if is_course else 'Cite this page', 'course' if is_course else 'page', apa)

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
        out = js_plain(out)
        (outdir / name).write_text(out, encoding='utf-8')
        result[pid] = 'assets/js/learn/' + name
        sizes[pid] = len(out.encode('utf-8'))
    return result, sizes


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
                # plain old figure numbers place the line; they are then written as links that carry the new numbers
                ls.append(re.sub(r'(figures? )(\d+\.\d+)(?!\.\d|\d)', lambda m: m.group(1) + ('{{fig:%s}}' % OLD_NUM[m.group(2)] if m.group(2) in OLD_NUM else m.group(2)), ln))
    built = {}
    for p in pages:
        beats = []
        for fid in p['beats']:
            m, i = BEAT_OF[fid]
            beats.append(MODS[m]['beats'][i]['html'])
        # the "Where we are" paragraph of the first module that starts on this page, if any
        starts = [BEAT_OF[f][0] for f in p['beats'] if BEAT_OF[f][1] == 0]
        where = module_where(starts[0]) if starts else ''
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
        opening = ('<section class="module" id="ch" data-act="%s" data-num="%s" data-nav>\n  <div class="wrap">\n'
                   '    <p class="mod-n">%s</p>\n    <h1 class="h2">%s</h1>\n    <p class="hook">%s</p>\n%s'
                   % (p['part'], esc(fig_prefix(p)), esc(page_number_label(p)), esc(p['title']), esc(p['question']), where.lstrip('\n')))
        content = opening + ''.join(beats) + '\n\n  </div>\n</section>\n'
        # figure numbers from the manifest
        def fnum(m):
            return '%s<span class="fnum">Figure %s</span>' % (m.group(1), number_of[m.group(2)])
        content = re.sub(r'(data-fig="([^"]+)" id="[^"]+">\s*)<span class="fnum">Figure [^<]*</span>', lambda m: '%s<span class="fnum">Figure %s</span>' % (m.group(1), number_of[m.group(2)]), content)
        built[p['id']] = content
    return built, page_of_fig, number_of, maths

OLD_NUM = {}   # old figure number -> figure id, from the module sources
for mid in MODULES:
    for m in re.finditer(r'data-fig="([^"]+)" id="[^"]+">\s*<span class="fnum">Figure ([\d.]+)</span>', MODS[mid]['source']):
        OLD_NUM[m.group(2)] = m.group(1)

# ---------------------------------------------------------------- cross-references
XREF = {'page_of_fig': {}, 'number_of': {}}
def ch_label(slug, cap=False):
    p = next(q for q in COURSE['pages'] if q['id'] == slug)
    if p['kind'] == 'lab':
        return p['num']
    return ('Chapter ' if cap else 'chapter ') + p['num']

def resolve_xrefs(content, pid, root):
    """{{fig:ID}} -> figure number, {{ch:slug}} / {{Ch:slug}} -> "chapter N" / "Chapter N"; linked in
    the text, plain inside drawings."""
    def href(target_page, anchor=''):
        if target_page == pid:
            return '#' + anchor if anchor else '#top'
        return root + 'batteries/' + target_page + '/' + ('#' + anchor if anchor else '')
    def plain(t):
        t = re.sub(r'\{\{fig:([^}]+)\}\}', lambda m: XREF['number_of'][m.group(1)], t)
        return re.sub(r'\{\{(ch|Ch):([^}]+)\}\}', lambda m: ch_label(m.group(2), m.group(1) == 'Ch'), t)
    def linked(t):
        t = re.sub(r'\{\{fig:([^}]+)\}\}', lambda m: '<a class="xref" href="%s">%s</a>' % (href(XREF['page_of_fig'][m.group(1)], m.group(1)), XREF['number_of'][m.group(1)]), t)
        return re.sub(r'\{\{(ch|Ch):([^}]+)\}\}', lambda m: '<a class="xref" href="%s">%s</a>' % (href(m.group(2)), ch_label(m.group(2), m.group(1) == 'Ch')), t)
    parts = re.split(r'(<svg\b.*?</svg>)', content, flags=re.S)
    return ''.join(plain(x) if x.startswith('<svg') else linked(x) for x in parts)

def js_plain(t):
    t = re.sub(r'\{\{fig:([^}]+)\}\}', lambda m: XREF['number_of'][m.group(1)], t)
    return re.sub(r'\{\{(ch|Ch):([^}]+)\}\}', lambda m: ch_label(m.group(2), m.group(1) == 'Ch'), t)

# ---------------------------------------------------------------- rendering
import course_nav as NAV

def page_refs(order, used_in):
    return '<ol class="refs">' + ''.join(BL.fmt_ref(k, i + 1) for i, k in enumerate(order)) + '</ol>'

REFSECTION = ('<section class="section page-refs" id="references">\n  <div class="wrap">\n    <h2 class="h2">References for this %s</h2>\n'
              '    <p class="policy">Numbers in the text refer to this list. <a href="%sbatteries/references/">All references of the course</a>, with the chapters that use each one.</p>\n'
              '    {{references}}\n  </div>\n</section>')

def root_of(pid):
    return '../' * (pid.count('/') + 2) if pid else '../'

def render_page(pid, content, meta, nav, bundle, out_path, current=None, outline=True, post=None):
    """Fill the template, render the markers, then add the parts built from the rendered page
    (the drawer's outline). post: {placeholder comment: html} inserted after rendering."""
    root = root_of(pid)
    text = TEMPLATE
    rep = {
        '{{page_title}}': esc(meta['page_title']), '{{og_title}}': esc(meta['og_title']), '{{description}}': esc(meta['description']),
        '{{url}}': COURSE['base'] + (pid + '/' if pid else ''), '{{og_image}}': share_image(pid), '{{ldjson}}': json.dumps(meta['ld'], ensure_ascii=False),
        '{{page_id}}': pid or 'hub', '{{body_class}}': meta.get('body_class', ''),
        '{{topbar}}': nav['topbar'], '{{drawer}}': '<!--@drawer-->', '{{search}}': NAV.SEARCH, '{{pagenav}}': nav['bottom'],
        '{{refsection}}': (REFSECTION % (meta['kind_word'], root)) if meta.get('refs', True) else '',
        '{{bundle}}': bundle,
    }
    for k, v in rep.items():
        text = text.replace(k, v)
    text = text.replace('{{content}}', resolve_xrefs(NAV.add_heading_ids(content), pid, root))
    text = text.replace('{{root}}', root)
    text, order = BL.render(text, refs_fn=page_refs, quiet=True)
    url = COURSE['base'] + (pid + '/' if pid else '')
    ctitle = meta.get('cite_title', meta['og_title'])
    text = text.replace('<!--@citemeta-->', cite_meta(ctitle, url)).replace('<!--@cite-->', cite_section(ctitle, url, not pid) if meta.get('cite', True) else '')
    if not order:   # nothing cited on this page: no reference section
        text = re.sub(r'<section class="section page-refs" id="references">.*?</section>\n?', '', text, flags=re.S)
    items = NAV.outline(text) if outline else []
    text = text.replace('<!--@drawer-->', NAV.drawer(COURSE, pid if current is None else current, root, items))
    for k, v in (post or {}).items():
        text = text.replace(k, v)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text, encoding='utf-8')
    return text, order

def seq_entry(q, root):
    """A page in the reading order, as the top bar and the page foot show it."""
    if q is None:
        return None
    if q['id'] == '':
        return {'href': NAV.page_href(root, ''), 'label': 'Course home', 'k': 'Course home', 't': COURSE['title'], 'q': COURSE['subtitle']}
    return {'href': NAV.page_href(root, q['id']), 'label': '%s %s' % (NAV.long_num(q), q['menu']),
            'k': NAV.long_num(q), 't': q['menu'], 'q': q['question']}

def nav_for(seq, i, root, page=None):
    """seq: the reading order (hub, chapters, lab pages); i: this page's place in it (None for a reference page)."""
    p = page if page is not None else seq[i]
    prev = seq_entry(seq[i - 1], root) if i is not None and i > 0 else None
    nxt = seq_entry(seq[i + 1], root) if i is not None and i + 1 < len(seq) else None
    top = NAV.topbar(p, prev, nxt, root)
    bottom = ''
    if i is not None:
        b = ['<nav class="pagenav wrap" aria-label="Previous and next">']
        for q, cls, k in ((prev, 'prev', '&#8592; Previous'), (nxt, 'next', 'Next &#8594;')):
            if q:
                b.append('  <a class="pn %s" href="%s" rel="%s"><span class="pn-k">%s</span><span class="pn-t">%s</span><span class="pn-q">%s</span></a>'
                         % (cls, q['href'], cls, k, esc(q['label'] if q['label'] != 'Course home' else 'Course home: ' + q['t']), esc(q['q'])))
        b.append('</nav>')
        bottom = '\n'.join(b)
    return {'topbar': top, 'bottom': bottom}

def figs_in(content):
    return re.findall(r'data-fig="([^"]+)"', content)

# ---------------------------------------------------------------- modes
def build_identity():
    pages = [{'id': '_identity/' + m, 'kind': 'chapter', 'num': str(int(m[1:])), 'menu': m, 'question': ''} for m in MODULES]
    contents = {p['id']: MODS[p['id'].split('/')[1]]['source'] for p in pages}
    for num, fid in OLD_NUM.items():   # the old numbering, for a like-for-like comparison
        XREF['number_of'][fid] = num
        XREF['page_of_fig'][fid] = '_identity/' + next(m for m in MODULES if fid in sum([b['figs'] for b in MODS[m]['beats']], []))
    bundles, sizes = js_bundles({pid: figs_in(c) for pid, c in contents.items()})
    for i, p in enumerate(pages):
        meta = {'page_title': p['id'], 'og_title': p['id'], 'description': p['id'], 'ld': {}, 'kind_word': 'module'}
        root = root_of(p['id'])
        text, order = render_page(p['id'], contents[p['id']], meta, nav_for(pages, i, root), bundles[p['id']], OUT / p['id'] / 'index.html', outline=False)
        print('%-16s %7d bytes html, %7d bytes js, %2d refs' % (p['id'], len(text.encode()), sizes[p['id']], len(order)))

PERSON_ID = 'https://asajeevan.github.io/#person'   # the Person entity on the home page; every page's author points at it
SHARE_DIR = ROOT / 'assets' / 'img' / 'share'
def share_image(pid):
    """The page's 1200x630 share card (og:image, twitter:image, JSON-LD image), drawn by tools/share_images.js."""
    key = pid.replace('/', '-') if pid else 'hub'
    if not (SHARE_DIR / (key + '.png')).exists():
        print('note: no share image for %s; run tools/share_images.js' % (pid or 'hub'))
        key = 'hub'
    return 'https://asajeevan.github.io/assets/img/share/%s.png' % key

def first_published(pid):
    """The date the page first appeared in the repository (its first commit); today for a page not yet committed."""
    path = 'batteries/' + (pid + '/' if pid else '') + 'index.html'
    try:
        d = subprocess.check_output(['git', 'log', '--diff-filter=A', '--follow', '--format=%cs', '--', path], cwd=str(ROOT), text=True).split()
        if d and re.fullmatch(r'\d{4}-\d{2}-\d{2}', d[-1]):
            return d[-1]
    except Exception:
        pass
    return CITE_DATE

def article_ld(headline, url, desc=None, crumb=None):
    """JSON-LD for a page of the course: the page as an article and learning resource, and its breadcrumb trail."""
    art = {'@context': 'https://schema.org', '@type': ['Article', 'LearningResource'], 'headline': headline, 'isPartOf': {'@type': 'Course', 'name': COURSE['title'], 'url': COURSE['base']},
           'author': {'@type': 'Person', '@id': PERSON_ID, 'name': 'Aswadh Shyma Sajeevan', 'givenName': AUTHOR['given'], 'familyName': AUTHOR['family'], 'url': 'https://asajeevan.github.io/'},
           'url': url, 'inLanguage': 'en', 'isAccessibleForFree': True, 'learningResourceType': 'interactive lesson',
           'image': share_image(url[len(COURSE['base']):].rstrip('/')), 'datePublished': first_published(url[len(COURSE['base']):].rstrip('/')), 'dateModified': CITE_DATE}
    if desc:
        art['description'] = desc
    trail = [('Aswadh Shyma Sajeevan', 'https://asajeevan.github.io/'), (COURSE['title'], COURSE['base']), (crumb or headline, url)]
    bc = {'@context': 'https://schema.org', '@type': 'BreadcrumbList',
          'itemListElement': [{'@type': 'ListItem', 'position': k + 1, 'name': n, 'item': u} for k, (n, u) in enumerate(trail)]}
    return [art, bc]

SUFFIX = ' | How batteries work'
def seo_title(p):
    t = p.get('seo_title') or ('%s %s' % (NAV.long_num(p), p['menu']))
    return t + SUFFIX if len(t + SUFFIX) <= 62 else t

# ---------------------------------------------------------------- last modified, per page, for the sitemap
LASTMOD_FILE = ROOT / 'tools' / 'lastmod.json'
# pages written by hand outside the course, listed in the sitemap after the home page: (path, change frequency, priority)
STANDALONE_PAGES = [('cyclara/', 'monthly', '0.8')]
def page_lastmod(store, key, path):
    """The date a page's content last changed: a hash of its <main>, without the citation block (whose date
    follows the course), compared with the stored one. A new page starts from the date of its last commit."""
    import hashlib, datetime
    text = path.read_text(encoding='utf-8')
    i, j = text.find('<main'), text.find('</main>')
    main = re.sub(r'<section class="section cite-sec".*?</section>', '', text[i:j] if i >= 0 and j > i else text, flags=re.S)
    h = hashlib.sha1(main.encode('utf-8')).hexdigest()[:16]
    old = store.get(key)
    if old and old[0] == h:
        return old[1]
    if old:
        date = datetime.date.today().isoformat()
    else:
        try:
            date = subprocess.check_output(['git', 'log', '-1', '--format=%cs', '--', str(path)], cwd=str(ROOT), text=True).strip()
        except Exception:
            date = ''
        date = date or datetime.date.today().isoformat()
    store[key] = [h, date]
    return date

def old_anchors(page_of_fig):
    """Where the anchors of the old single page now live: {old id: path below batteries/}."""
    first = {m: COURSE_PAGE_OF_BEAT[MODS[m]['beats'][0]['fig']] for m in MODULES}
    out = {}
    for m in MODULES:
        out[m] = first[m] + '/'
        out[m + '-maths'] = COURSE['tails'][m] + '/#maths'
    out.update({'actA': first['m00'] + '/', 'actB': first['m05'] + '/', 'actC': first['m09'] + '/', 'references': 'references/'})
    for f, pid in page_of_fig.items():
        out[f] = pid + '/#' + f
    return out

COURSE_PAGE_OF_BEAT = {f: p['id'] for p in COURSE['pages'] for f in p['beats']}

def course_map(stats, root):
    out = ['    <div class="hub-parts">\n      <div class="circuit" aria-hidden="true"><span class="circuit-fill"></span><span class="circuit-ion"></span></div>']
    for part in COURSE['parts']:
        ps = [p for p in COURSE['pages'] if p['part'] == part['id']]
        k = 'Lab handbook' if part['id'] == 'LAB' else 'Part ' + part['id']
        t = part['title'].split(': ', 1)[1] if part['id'] == 'LAB' else part['title']
        out.append('    <div class="hub-part" id="part-%s">\n      <p class="part-k">%s</p>\n      <h3 class="part-t">%s</h3>\n      <ol class="cards">' % (part['id'].lower(), esc(k), esc(t)))
        for p in ps:
            mins, nfig = stats[p['id']]
            out.append('        <li class="card" data-chap="%s"><a href="%s" data-n="%s"><span class="c-n">%s</span><span class="c-t">%s</span>'
                       '<span class="c-full">%s</span><span class="c-q">%s</span><span class="c-m">%d figure%s &#183; about %d min</span></a></li>'
                       % (p['id'], NAV.page_href(root, p['id']), esc(p['num'].replace('Lab ', 'L')), esc(NAV.long_num(p)), esc(p['menu']), esc(p['title']), esc(p['question']), nfig, '' if nfig == 1 else 's', mins))
        out.append('      </ol>\n    </div>')
    out.append('    </div>')
    return '\n'.join(out)

POLICY = ('<p class="policy"><b>How this course uses its sources.</b> Every factual sentence in the course was checked against one of the textbooks and '
          'peer-reviewed articles below, all of which I have read in full; each entry says which chapters rest on it, and each figure&#8217;s '
          '&#8220;Source&#8221; toggle names the figure or equation it is drawn from. Where a source&#8217;s printed equation contains a typographical '
          'error, the course uses the form that follows from the source&#8217;s own premises. Analogies and my own opinions are marked as such. Numbers '
          'are quoted with the conditions and the date given in the source. The numbers below are this list&#8217;s own; each chapter numbers its '
          'citations from 1 in its own reference list.</p>')

def ref_page_content(used_by, root):
    order = []
    for p in COURSE['pages']:
        for k in used_by.get(p['id'], []):
            if k not in order:
                order.append(k)
    lis = []
    for n, k in enumerate(order, 1):
        where = [p for p in COURSE['pages'] if k in used_by.get(p['id'], [])]
        links = ', '.join('<a href="%s">%s</a>' % (NAV.page_href(root, p['id']), esc(NAV.long_num(p) if p['kind'] == 'lab' else p['num'])) for p in where)
        chs = [p for p in where if p['kind'] == 'chapter']
        label = ('Chapter ' if len(where) == 1 and chs else 'Chapters ' if chs else '') if where else ''
        lis.append(BL.fmt_ref(k, n).replace('</li>', '<span class="ref-mods">%s%s</span></li>' % (label, links)))
    return ('<section class="section ref-page" id="all-references">\n<div class="wrap">\n<p class="mod-n">For reference</p>\n<h1 class="h2">References of the course</h1>\n'
            + POLICY + '\n<ol class="refs">' + ''.join(lis) + '</ol>\n</div>\n</section>\n'), len(order)

def figures_page_content(rendered, root):
    out = ['<section class="section ref-page" id="all-figures">\n<div class="wrap">\n<p class="mod-n">For reference</p>\n<h1 class="h2">List of figures</h1>\n'
           '<p class="sub">Every figure of the course, with the first sentence of its caption. Figures inside folded panels are listed under the figure before them.</p>']
    for p in COURSE['pages']:
        items = [it for it in NAV.outline(rendered[p['id']]) if it['kind'] == 'fig']
        out.append('<h2 class="ref-h" id="lf-%s"><a href="%s">%s &#183; %s</a></h2>\n<ol class="fig-list">' % (p['id'].replace('/', '-'), NAV.page_href(root, p['id']), esc(NAV.long_num(p)), esc(p['menu'])))
        for it in items:
            out.append('<li><a href="%s#%s"><span class="n">%s</span><span class="t">%s</span></a></li>' % (NAV.page_href(root, p['id']), it['id'], esc(it['n']), it['label']))
        out.append('</ol>')
    out.append('</div>\n</section>\n')
    return '\n'.join(out)

def terms_page_content(rendered, root):
    """Every term the course introduces in bold, alphabetically, with the sentence that introduces it
    (quoted from the chapter, so the index states nothing the chapters do not) and a link to it."""
    seen = {}
    for p in COURSE['pages']:
        for t in NAV.terms_of(rendered[p['id']]):
            key = t['term'].lower()
            if key not in seen:
                seen[key] = dict(t, page=p, also=[])
            elif p['id'] not in [q['id'] for q in seen[key]['also']] and p['id'] != seen[key]['page']['id']:
                seen[key]['also'].append(p)
    def sort_key(k):
        return re.sub(r'[^a-z0-9 ]', '', k.lower().replace('“', '').replace('”', ''))
    out = ['<section class="section ref-page" id="all-terms">\n<div class="wrap">\n<p class="mod-n">For reference</p>\n<h1 class="h2">Index of terms</h1>\n'
           '<p class="sub">Each term the course introduces, with the sentence that introduces it and a link to that place. The sentences are quoted from the chapters.</p>']
    letters = sorted(set(sort_key(k)[0].upper() for k in seen))
    out.append('<nav class="az" aria-label="Letters">' + ''.join('<a href="#t-%s">%s</a>' % (L, L) for L in letters) + '</nav>')
    cur = None
    for k in sorted(seen, key=sort_key):
        t = seen[k]; L = sort_key(k)[0].upper()
        if L != cur:
            if cur is not None:
                out.append('</dl>')
            out.append('<h2 class="ref-h" id="t-%s">%s</h2>\n<dl class="terms">' % (L, L)); cur = L
        p = t['page']
        where = '<a href="%s#%s">%s</a>' % (NAV.page_href(root, p['id']), t['anchor'], esc(NAV.long_num(p) + ' · ' + p['menu']))
        also = ''.join(', <a href="%s">%s</a>' % (NAV.page_href(root, q['id']), esc(NAV.long_num(q))) for q in t['also'])
        out.append('<dt id="term-%s">%s</dt><dd><span class="t-s">%s</span> <span class="t-w">%s%s</span></dd>' % (NAV.slug(k), t['term_html'], t['sentence'], where, also))
    out.append('</dl>\n</div>\n</section>\n')
    return '\n'.join(out), len(seen)

def equations_page_content(maths, root):
    out = ['<section class="section ref-page" id="all-equations">\n<div class="wrap">\n<p class="mod-n">For reference</p>\n<h1 class="h2">The equations of the course</h1>\n'
           '<p class="sub">The mathematics panels of every chapter on one page, in course order. Each line names the figure it belongs to and links to it.</p>']
    for p in COURSE['pages']:
        if p['id'] not in maths:
            continue
        head, lines = maths[p['id']]
        out.append('<h2 class="ref-h" id="eq-%s"><a href="%s#maths">%s &#183; %s</a></h2>\n<div class="eq-block">%s\n</div>'
                   % (p['id'].replace('/', '-'), NAV.page_href(root, p['id']), esc(NAV.long_num(p)), esc(p['menu']), ''.join(lines)))
    out.append('</div>\n</section>\n')
    return '\n'.join(out)

def write_404(pages):
    """404.html, which GitHub Pages serves for any missing address: a way back to the home page, the course
    and every chapter, so a broken or outdated link still lands the reader somewhere useful. Absolute
    paths, because the page is served at whatever address was asked for. Not indexed."""
    groups = []
    for part in COURSE['parts']:
        items = ''.join('<li><a href="/batteries/%s/">%s: %s</a></li>' % (p['id'], esc(NAV.long_num(p)), esc(p['menu'])) for p in pages if p['part'] == part['id'])
        if items:
            groups.append('<h2 class="nf-h">%s</h2><ul class="nf-list">%s</ul>' % (esc(part['menu']), items))
    page = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found | Aswadh Shyma Sajeevan</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/fonts.css">
<link rel="stylesheet" href="/assets/css/site.css">
<style>
body{background:var(--bg,#fff);color:var(--text,#14171C)}
.nf{padding:clamp(48px,10vw,110px) 0 72px}
.nf h1{font-family:var(--display);font-size:clamp(2rem,5vw,3rem);line-height:1.1;margin:14px 0 12px}
.nf .row{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0 40px}
.nf-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px 36px}
.nf-h{font-family:var(--display);font-size:1.05rem;margin:18px 0 6px}
.nf-list{list-style:none;padding:0;margin:0}.nf-list li{margin:4px 0}
.nf-list a{color:var(--accent,#1F48D6);text-decoration:none}.nf-list a:hover{text-decoration:underline}
</style>
</head>
<body>
<main class="nf"><div class="wrap">
<p class="kicker">Error 404</p>
<h1>This page does not exist</h1>
<p class="lede">The address may be mistyped, or the page may have moved when the course was reorganised. Everything is still here:</p>
<div class="row"><a class="btn primary" href="/batteries/">How batteries work: the course</a><a class="btn" href="/">Home: research and publications</a></div>
<div class="nf-cols">%s</div>
</div></main>
</body>
</html>
""" % '\n'.join('<div>%s</div>' % g for g in groups)
    (ROOT / '404.html').write_text(page, encoding='utf-8')


def build_course():
    contents, page_of_fig, number_of, maths = assemble_course()
    XREF['page_of_fig'], XREF['number_of'] = page_of_fig, number_of
    pages = COURSE['pages']
    import os
    if os.environ.get('COURSE_DUMP'):
        d = pathlib.Path(os.environ['COURSE_DUMP']); d.mkdir(parents=True, exist_ok=True)
        for pid, c in contents.items():
            (d / (pid.replace('/', '-') + '.html')).write_text(c, encoding='utf-8')
    figsets = {pid: figs_in(c) for pid, c in contents.items()}
    figsets.update({'hub': ['hero'], 'references': [], 'figures': [], 'equations': [], 'terms': []})
    bundles, sizes = js_bundles(figsets)
    seq = [{'id': ''}] + pages
    total, rendered, used_by, stats = 0, {}, {}, {}
    for i, p in enumerate(pages):
        root = root_of(p['id'])
        meta = {'page_title': seo_title(p),
                'og_title': p['title'], 'cite_title': p['title'], 'description': p.get('seo_desc') or (p['question'] + ' ' + p['title'] + '.'),
                'ld': article_ld(p['title'], COURSE['base'] + p['id'] + '/', p.get('seo_desc'), '%s: %s' % (NAV.long_num(p), p['menu'])),
                'kind_word': 'chapter' if p['kind'] == 'chapter' else 'page', 'body_class': 'kind-' + p['kind']}
        text, order = render_page(p['id'], contents[p['id']], meta, nav_for(seq, i + 1, root), bundles[p['id']], OUT / p['id'] / 'index.html')
        rendered[p['id']], used_by[p['id']] = text, order
        mins, words = NAV.reading_minutes(text)
        stats[p['id']] = (mins, len(figs_in(contents[p['id']])))
        total += len(text.encode())
        print('%-26s %7d bytes html, %7d bytes js, %2d refs, %5d words, about %d min' % (p['id'], len(text.encode()), sizes[p['id']], len(order), words, mins))
    # the hub
    hub = (SRC / 'hub.src.html').read_text(encoding='utf-8')
    hours = max(1, round(sum(v[0] for v in stats.values()) / 60))
    nrefs_all = len({k for ks in used_by.values() for k in ks})
    numbers = [(len([p for p in pages if p['kind'] == 'chapter']), 'chapters', 'from the electron to the recycled cell'),
               (len([p for p in pages if p['kind'] == 'lab']), 'lab pages', 'the methods behind every number'),
               (sum(v[1] for v in stats.values()), 'live figures', 'every one computed from its source'),
               (nrefs_all, 'sources', 'textbooks and peer-reviewed articles'),
               (hours, 'hours', 'to read at the Teach me level')]
    strip = '<ul class="hub-numbers" aria-label="The course in numbers">' + ''.join(
        '<li><b data-count="%d">%d</b><span class="hn-k">%s</span><span class="hn-s">%s</span></li>' % (n, n, esc(k), esc(t)) for n, k, t in numbers) + '</ul>'
    hub = hub.replace('{{course_map}}', course_map(stats, '../')).replace('{{modes}}', NAV.MODES).replace('{{course_numbers}}', strip)
    meta = {'page_title': 'How batteries work: an interactive lithium-ion battery course', 'og_title': COURSE['title'], 'cite_title': '%s: %s' % (COURSE['title'], COURSE['subtitle']),
            'description': 'Free interactive course on how lithium-ion batteries work: 19 chapters and a lab handbook, from cell voltage to the SEI, degradation, cyclic voltammetry, GITT and EIS.',
            'ld': {'@context': 'https://schema.org', '@type': 'Course', 'name': COURSE['title'], 'description': COURSE['subtitle'], 'url': COURSE['base'], 'inLanguage': 'en',
                   'provider': {'@type': 'Person', '@id': PERSON_ID, 'name': 'Aswadh Shyma Sajeevan', 'url': 'https://asajeevan.github.io/'},
                   'image': share_image(''), 'datePublished': first_published(''),
                   'author': {'@type': 'Person', '@id': PERSON_ID, 'name': 'Aswadh Shyma Sajeevan', 'givenName': AUTHOR['given'], 'familyName': AUTHOR['family'], 'url': 'https://asajeevan.github.io/'},
                   'isAccessibleForFree': True, 'educationalLevel': 'university', 'learningResourceType': 'interactive course',
                   'offers': [{'@type': 'Offer', 'category': 'Free', 'price': 0, 'priceCurrency': 'EUR'}],
                   'hasCourseInstance': [{'@type': 'CourseInstance', 'courseMode': 'Online', 'courseWorkload': 'PT%dH' % hours}],
                   'syllabusSections': [{'@type': 'Syllabus', 'name': '%s: %s' % (NAV.long_num(p), p['menu']), 'description': p.get('seo_desc', p['title']), 'url': COURSE['base'] + p['id'] + '/'} for p in pages],
                   'dateModified': CITE_DATE},
            'kind_word': 'page', 'refs': False, 'body_class': 'kind-hub'}
    anchors = '<script type="application/json" id="oldAnchors">%s</script>' % json.dumps(old_anchors(page_of_fig), separators=(',', ':'))
    text, _ = render_page('', hub + '<!--@anchors-->\n', meta, nav_for(seq, 0, '../', {'id': '', 'kind': 'hub'}), bundles['hub'], OUT / 'index.html',
                          outline=False, post={'<!--@anchors-->': anchors})
    total += len(text.encode())
    print('%-26s %7d bytes html, %7d bytes js' % ('(hub)', len(text.encode()), sizes['hub']))
    # the reference pages
    root = '../../'
    refs_html, nrefs = ref_page_content(used_by, root)
    terms_html, nterms = terms_page_content(rendered, root)
    figs_html = figures_page_content(rendered, root)
    nfigs = figs_html.count('<li><a ')
    specs = [('references', 'References', refs_html, 'All the references of How batteries work: the textbooks and peer-reviewed articles on lithium-ion batteries and electrochemistry, with the chapters that rest on each one.'),
             ('terms', 'Index of terms', terms_html, 'Index of terms for How batteries work: every battery and electrochemistry term the course introduces, from overpotential to tortuosity, with the sentence that introduces it.'),
             ('figures', 'List of figures', figs_html, 'All %d interactive figures of How batteries work, a free lithium-ion battery course, numbered by chapter, each linked to its place in the chapter.' % nfigs),
             ('equations', 'Equations', equations_page_content(maths, root), "The mathematics of How batteries work on one page: from Coulomb's law and the Nernst equation to Butler-Volmer kinetics, Fick's law and the Warburg impedance.")]
    for pid, title, content, desc in specs:
        meta = {'page_title': '%s | How batteries work' % title, 'og_title': '%s: How batteries work' % title, 'cite_title': title, 'description': desc,
                'ld': article_ld(title, COURSE['base'] + pid + '/', desc), 'kind_word': 'page', 'refs': pid == 'equations', 'body_class': 'kind-ref'}
        text, order = render_page(pid, content, meta, nav_for(seq, None, root, {'id': pid, 'kind': 'ref', 'crumb': title}), bundles[pid], OUT / pid / 'index.html', outline=False)
        total += len(text.encode())
        print('%-26s %7d bytes html%s' % (pid, len(text.encode()), (', %d references' % nrefs) if pid == 'references' else (', %d terms' % nterms) if pid == 'terms' else ''))
    # the search index
    idx = {'p': [], 'e': []}
    for k, p in enumerate(pages):
        idx['p'].append([p['id'] + '/', NAV.long_num(p), p['menu'], p['title'], p['question']])
        for e in NAV.index_entries(rendered[p['id']], p['id']):
            idx['e'].append([k] + e)
    js = '/* generated by tools/build_course.py: the course search index */\nwindow.COURSE_INDEX=' + json.dumps(idx, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (ROOT / 'assets' / 'js' / 'course-index.js').write_text(js, encoding='utf-8')
    print('search index: %d entries, %d bytes' % (len(idx['e']), len(js.encode())))
    print('course: %d pages + hub + 4 reference pages, %d bytes of html' % (len(pages), total))
    write_404(pages)
    # the sitemap: the site home, then every page of the course
    # with the date each page last changed; a page's JSON-LD dateModified follows the same date
    store = json.loads(LASTMOD_FILE.read_text(encoding='utf-8')) if LASTMOD_FILE.exists() else {}
    keys = [''] + [p['id'] for p in pages] + [pid for pid, _t, _c, _d in specs]
    urls = [COURSE['base'] + (k + '/' if k else '') for k in keys]
    home = page_lastmod(store, '/', ROOT / 'index.html')
    import home_seo   # the home page's JSON-LD (profile, person, publications), regenerated from the page
    print('home page JSON-LD: %d publications, %d videos' % home_seo.update(ROOT / 'index.html', home))
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          '  <url>\n    <loc>https://asajeevan.github.io/</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>' % home]
    for rel, freq, prio in STANDALONE_PAGES:
        date = page_lastmod(store, '/' + rel, ROOT / rel / 'index.html')
        sm.append('  <url>\n    <loc>https://asajeevan.github.io/%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>' % (rel, date, freq, prio))
    for k, (key, u) in enumerate(zip(keys, urls)):
        path = OUT / key / 'index.html' if key else OUT / 'index.html'
        date = page_lastmod(store, key or 'hub', path)
        if key:
            t = path.read_text(encoding='utf-8')
            t2 = t.replace('"dateModified": "%s"' % CITE_DATE, '"dateModified": "%s"' % date, 1)
            if t2 != t:
                path.write_text(t2, encoding='utf-8')
        sm.append('  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>' % (u, date, 'weekly' if k == 0 else 'monthly', '0.8' if k == 0 else '0.6'))
    LASTMOD_FILE.write_text(json.dumps(store, indent=1, sort_keys=True) + '\n', encoding='utf-8')
    sm.append('</urlset>\n')
    (ROOT / 'sitemap.xml').write_text('\n'.join(sm), encoding='utf-8')

if __name__ == '__main__':
    if '--identity' in sys.argv:
        build_identity()
    else:
        build_course()
