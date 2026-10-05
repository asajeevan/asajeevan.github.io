"""Navigation pieces of the course pages: the top bar, the contents drawer, the search overlay,
the "on this page" outline, reading-time estimates and the search index.

Everything here is generated from course.json and from the rendered pages, so that no
heading, figure number or chapter title is typed twice. Used by tools/build_course.py.
"""
import html, json, re

def esc(s):
    return html.escape(s, quote=True)

ICON_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>'
ICON_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'

# ---------------------------------------------------------------- labels
def short_num(p):
    """'5' for a chapter, 'L2' for a lab page."""
    return p['num'] if p['kind'] == 'chapter' else 'L' + p['num'].split()[-1]

def long_num(p):
    """'Chapter 5' or 'Lab 2'."""
    return 'Chapter ' + p['num'] if p['kind'] == 'chapter' else p['num']

def page_href(root, pid):
    return root + 'batteries/' + (pid + '/' if pid else '')

# ---------------------------------------------------------------- text helpers
def strip_tags(h):
    h = re.sub(r'<svg\b.*?</svg>', ' ', h, flags=re.S)
    h = re.sub(r'<details class="src">.*?</details>', ' ', h, flags=re.S)
    h = re.sub(r'<math\b.*?</math>', lambda m: ' ' + re.sub(r'<[^>]+>', '', m.group(0)) + ' ', h, flags=re.S)
    h = re.sub(r'<sup class="cite">.*?</sup>', '', h, flags=re.S)
    h = re.sub(r'<[^>]+>', '', h)
    return re.sub(r'\s+', ' ', html.unescape(h)).strip()

KEEP = {'<sub>': '\x01', '</sub>': '\x02', '<sup>': '\x03', '</sup>': '\x04', '<i>': '\x05', '</i>': '\x06'}
def label_html(h, cap=96):
    """First sentence of a caption as safe HTML that keeps sub- and superscripts and italics."""
    h = re.sub(r'<sup class="cite">.*?</sup>', '', h, flags=re.S)
    for k, v in KEEP.items():
        h = h.replace(k, v)
    t = first_sentence(strip_tags(h), cap)
    t = esc(t)
    if t.endswith('…'):   # a cut may leave a script open: drop the markup then
        return re.sub('[\x01-\x06]', '', t)
    for k, v in KEEP.items():
        t = t.replace(v, k)
    return t

def first_sentence(t, cap=96):
    s = re.split(r'(?<=[.!?])\s+(?=[A-Z0-9“"(])', t, maxsplit=1)[0].strip()
    s = s.rstrip('.')
    if len(s) > cap:
        s = s[:cap].rsplit(' ', 1)[0].rstrip(',;:') + '…'
    return s

def details_depth(text):
    """Return a function pos -> number of <details> elements open at pos."""
    events = sorted([(m.start(), 1) for m in re.finditer(r'<details\b', text)] + [(m.start(), -1) for m in re.finditer(r'</details>', text)])
    def depth(pos):
        d = 0
        for at, k in events:
            if at >= pos:
                break
            d += k
        return d
    return depth

# ---------------------------------------------------------------- headings
def slug(t):
    t = strip_tags(t).lower()
    t = re.sub(r'[^a-z0-9]+', '-', t).strip('-')
    return t[:48].rstrip('-') or 'section'

def add_heading_ids(content):
    """Section headings inside a chapter are h2 (the chapter title is the page's h1): turn the sources'
    <h3 class="sub"> into <h2 class="sub"> and give each a stable id built from its text."""
    content = re.sub(r'<h3 class="sub"( id="[^"]*")?>(.*?)</h3>', r'<h2 class="sub"\1>\2</h2>', content, flags=re.S)
    seen = set(re.findall(r'\bid="([^"]+)"', content))
    def one(m):
        base = 's-' + slug(m.group(2)); i, k = base, 2
        while i in seen:
            i = '%s-%d' % (base, k); k += 1
        seen.add(i)
        return '<h2 class="sub" id="%s">%s</h2>' % (i, m.group(2))
    return re.sub(r'<h2 class="sub"( )?>(.*?)</h2>', one, content, flags=re.S)

# ---------------------------------------------------------------- outline of a rendered page
def outline(page_html):
    """Figures and section headings at reading level (not inside a fold), in page order:
    [{'kind': 'fig'|'sub'|'maths'|'refs', 'id', 'n', 'label'}]."""
    m0 = page_html.find('<div id="content">'); m1 = page_html.find('</main>')
    text = page_html[m0:m1]
    depth = details_depth(text)
    items = []
    pat = re.compile(r'<figure\b[^>]*data-fig="([^"]+)" id="([^"]+)"[^>]*>\s*<span class="fnum">Figure ([^<]+)</span>(.*?)</figure>'
                     r'|<h2 class="sub" id="([^"]+)">(.*?)</h2>'
                     r'|<details class="deeper maths" id="maths">'
                     r'|<section class="section page-refs" id="references">', re.S)
    for m in pat.finditer(text):
        if m.group(0).startswith('<figure'):
            if depth(m.start()):
                continue
            cap = re.search(r'<figcaption>(.*?)</figcaption>', m.group(4), re.S)
            items.append({'kind': 'fig', 'id': m.group(2), 'n': m.group(3), 'label': label_html(cap.group(1)) if cap else ''})
        elif m.group(0).startswith('<h2'):
            if depth(m.start()):
                continue
            items.append({'kind': 'sub', 'id': m.group(5), 'n': '', 'label': label_html(m.group(6), 200)})
        elif 'maths' in m.group(0):
            items.append({'kind': 'maths', 'id': 'maths', 'n': '', 'label': 'The mathematics of this chapter'})
        else:
            items.append({'kind': 'refs', 'id': 'references', 'n': '', 'label': 'References'})
    return items

def reading_minutes(page_html):
    """Minutes at the 'Teach me' level: the main text at 150 words a minute plus a minute a figure."""
    m0 = page_html.find('<div id="content">'); m1 = page_html.find('<section class="section page-refs"')
    text = page_html[m0:m1 if m1 > 0 else page_html.find('</main>')]
    text = re.sub(r'<details\b.*?</details>', ' ', text, flags=re.S)   # folds (no nesting at reading level)
    words = len(strip_tags(text).split())
    figs = len(re.findall(r'<figure\b', text))
    m = words / 150 + 1.0 * figs
    return max(5, int(round(m / 5.0)) * 5), words

# ---------------------------------------------------------------- top bar, drawer, search
def topbar(p, prev, nxt, root):
    """p: the page dict (or a pseudo page for the hub and the reference pages)."""
    crumb = ''
    if p.get('kind') in ('chapter', 'lab'):
        crumb = '<span class="crumb"><span class="crumb-n">%s</span> <span class="crumb-t">%s</span></span>' % (esc(long_num(p)), esc(p['menu']))
    elif p.get('crumb'):
        crumb = '<span class="crumb"><span class="crumb-t">%s</span></span>' % esc(p['crumb'])
    def arrow(q, rel, sym):
        if not q:
            return '<span class="tb-btn tb-arrow off" aria-hidden="true">%s</span>' % sym
        lab = ('Previous: ' if rel == 'prev' else 'Next: ') + q['label']
        key = '←' if rel == 'prev' else '→'
        return '<a class="tb-btn tb-arrow" rel="%s" href="%s" title="%s (%s)" aria-label="%s">%s</a>' % (rel, q['href'], esc(lab), key, esc(lab), sym)
    return ('<header class="topbar course-bar" id="topbar">\n<div class="wrap">\n'
            '<button class="tb-btn tb-toc" id="tocBtn" type="button" aria-controls="toc" aria-expanded="false" title="Contents (t)">%s<span class="tb-l">Contents</span></button>\n'
            '<a class="brand" href="%s">How batteries work</a>\n%s\n<span class="tb-sp"></span>\n'
            '<button class="tb-btn" id="searchBtn" type="button" aria-controls="search" aria-expanded="false" title="Search (/)">%s<span class="tb-l">Search</span></button>\n'
            '%s\n%s\n</div>\n<div class="progress" id="progress"></div>\n</header>'
            % (ICON_MENU, page_href(root, ''), crumb, ICON_SEARCH, arrow(prev, 'prev', '&#8592;'), arrow(nxt, 'next', '&#8594;')))

REF_PAGES = [('terms', 'Index of terms'), ('figures', 'List of figures'), ('equations', 'Equations'), ('references', 'References')]

def course_outline(course, current, root):
    out = ['<a class="toc-home%s" href="%s"%s>Course home</a>' % (' cur' if current == '' else '', page_href(root, ''), ' aria-current="page"' if current == '' else '')]
    for part in course['parts']:
        ps = [p for p in course['pages'] if p['part'] == part['id']]
        head = 'Lab handbook' if part['id'] == 'LAB' else 'Part %s · %s' % (part['id'], part['menu'])
        out.append('<div class="toc-part"><p class="toc-pt">%s</p><ol>' % esc(head))
        for p in ps:
            cur = p['id'] == current
            out.append('<li data-chap="%s"%s><a href="%s"%s><span class="n">%s</span><span class="t">%s</span></a></li>'
                       % (p['id'], ' class="cur"' if cur else '', page_href(root, p['id']), ' aria-current="page"' if cur else '', esc(short_num(p)), esc(p['menu'])))
        out.append('</ol></div>')
    out.append('<div class="toc-part"><p class="toc-pt">For reference</p><ol>')
    for pid, lab in REF_PAGES:
        cur = pid == current
        out.append('<li%s><a href="%s"%s><span class="n">&#183;</span><span class="t">%s</span></a></li>' % (' class="cur"' if cur else '', page_href(root, pid), ' aria-current="page"' if cur else '', lab))
    out.append('</ol></div>')
    return '\n'.join(out)

MODES = ('<div class="modes" role="group" aria-label="Choose how to read">'
         '<button type="button" data-mode="show" aria-pressed="false">Just show me</button>'
         '<button type="button" data-mode="teach" aria-pressed="true">Teach me</button>'
         '<button type="button" data-mode="equations" aria-pressed="false">I want the equations</button></div>'
         '<p class="modes-note"></p>')

def drawer(course, current, root, items, with_modes=True):
    page = ''
    if items:
        lis = []
        for it in items:
            if it['kind'] == 'fig':
                lis.append('<li class="o-fig"><a href="#%s"><span class="n">%s</span><span class="t">%s</span></a></li>' % (it['id'], esc(it['n']), it['label']))
            elif it['kind'] == 'sub':
                lis.append('<li class="o-sub"><a href="#%s"><span class="t">%s</span></a></li>' % (it['id'], it['label']))
            else:
                lis.append('<li class="o-end"><a href="#%s"><span class="t">%s</span></a></li>' % (it['id'], esc(it['label'])))
        page = ('<nav class="toc-sec toc-page" aria-label="On this page"><p class="toc-k">On this page</p>'
                '<ol class="toc-outline">%s</ol></nav>' % ''.join(lis))
    modes = ('<div class="toc-sec toc-modes"><p class="toc-k">Reading level</p>%s</div>' % MODES) if with_modes else ''
    return ('<aside class="toc" id="toc" aria-label="Contents" tabindex="-1">\n'
            '<div class="toc-head"><span class="toc-title">Contents</span><button class="toc-x" id="tocClose" type="button" aria-label="Close the contents">&#215;</button></div>\n'
            '%s\n%s\n<nav class="toc-sec toc-course" aria-label="The course"><p class="toc-k">The course</p>\n%s\n</nav>\n'
            '<p class="toc-keys">Keys: <kbd>t</kbd> contents, <kbd>/</kbd> search, <kbd>&#8592;</kbd> <kbd>&#8594;</kbd> previous and next chapter, <kbd>Esc</kbd> close.</p>\n'
            '</aside>\n<div class="toc-scrim" id="tocScrim" hidden></div>'
            % (modes, page, course_outline(course, current, root)))

SEARCH = ('<div class="search" id="search" role="dialog" aria-modal="true" aria-label="Search the course" hidden>\n'
          '<div class="search-panel">\n<div class="search-box">%s<input id="searchInput" type="search" placeholder="Search chapters, figures and text" autocomplete="off" spellcheck="false" aria-controls="searchResults">'
          '<button class="search-x" id="searchClose" type="button" aria-label="Close the search">Esc</button></div>\n'
          '<p class="search-hint" id="searchHint">Type a word or two: a material (LiFePO4), a method (GITT), an idea (tortuosity).</p>\n'
          '<ol class="search-results" id="searchResults" role="list"></ol>\n</div>\n</div>' % ICON_SEARCH)

# ---------------------------------------------------------------- search index
def index_entries(page_html, pid):
    """Entries for one rendered page: figures (number and whole caption), section headings and
    paragraphs (anchored to the figure or heading before them)."""
    m0 = page_html.find('<div id="content">'); m1 = page_html.find('<section class="section page-refs"')
    text = page_html[m0:m1 if m1 > 0 else page_html.find('</main>')]
    out = []
    anchor, near = '', ''
    pat = re.compile(r'<figure\b[^>]*data-fig="[^"]+" id="([^"]+)"[^>]*>\s*(?:<span class="fnum">Figure ([^<]+)</span>)?(.*?)</figure>'
                     r'|<h2 class="sub" id="([^"]+)">(.*?)</h2>'
                     r'|<details class="deeper maths" id="maths">'
                     r'|<p(?: class="(?!eqline|mnote|fnum|mod-n)[^"]*")?>(.*?)</p>', re.S)
    for m in pat.finditer(text):
        g = m.group(0)
        if g.startswith('<figure'):
            anchor = m.group(1); near = 'figure ' + (m.group(2) or '')
            cap = re.search(r'<figcaption>(.*?)</figcaption>', m.group(3), re.S)
            if m.group(2):
                out.append(['f', anchor, 'Figure ' + m.group(2), strip_tags(cap.group(1)) if cap else ''])
        elif g.startswith('<h2'):
            anchor = m.group(4); near = strip_tags(m.group(5))
            out.append(['s', anchor, near, ''])
        elif g.startswith('<details'):
            anchor = 'maths'; near = 'the mathematics'
        else:
            t = strip_tags(m.group(6))
            if len(t) > 40:
                out.append(['p', anchor, near, t])
    return out

# ---------------------------------------------------------------- index of terms
def keep_inline(h):
    """Text of an HTML fragment as safe HTML that keeps sub- and superscripts, italics and bold."""
    keep = dict(KEEP); keep.update({'<b>': '\x07', '</b>': '\x08'})
    for k, v in keep.items():
        h = h.replace(k, v)
    t = esc(strip_tags(h))
    for k, v in keep.items():
        t = t.replace(v, k)
    return t

def terms_of(page_html):
    """The terms a page introduces: the bold words of its explanatory paragraphs, each with the
    sentence that introduces it (quoted from the page) and the figure or heading before it."""
    m0 = page_html.find('<div id="content">'); m1 = page_html.find('<section class="section page-refs"')
    text = page_html[m0:m1 if m1 > 0 else page_html.find('</main>')]
    text = re.sub(r'<svg\b.*?</svg>', '', text, flags=re.S)
    out, anchor = [], ''
    pat = re.compile(r'<figure\b[^>]*data-fig="[^"]+" id="([^"]+)"|<h2 class="sub" id="([^"]+)"|<p class="(?:explain|aside)"[^>]*>(.*?)</p>', re.S)
    for m in pat.finditer(text):
        if m.group(1) or m.group(2):
            anchor = m.group(1) or m.group(2); continue
        para = re.sub(r'<sup class="cite">.*?</sup>', '', m.group(3), flags=re.S)
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z“(<])', para)
        for b in re.finditer(r'<b>(.*?)</b>', para, re.S):
            term = strip_tags(b.group(1))
            if not term or term[-1] in '.?:' or term[0].isdigit() or len(term) > 40:
                continue
            sent = next((s for s in sentences if b.group(0) in s), '')
            s = keep_inline(sent)
            if len(strip_tags(s)) > 320:   # a long sentence: the part around the term
                plain = strip_tags(sent); i = plain.find(term)
                a = max(0, i - 120); z = min(len(plain), a + 300)
                s = ('…' if a else '') + esc(plain[a:z]).replace(esc(term), '<b>%s</b>' % esc(term), 1) + ('…' if z < len(plain) else '')
            out.append({'term': term, 'term_html': keep_inline(b.group(1)), 'anchor': anchor, 'sentence': s})
    return out
