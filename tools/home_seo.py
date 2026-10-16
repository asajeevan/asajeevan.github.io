"""Structured data (JSON-LD) for the home page, regenerated from the page itself.

Search engines read this block to connect the name with the profiles, the publications and the course:
a WebSite (the site name Google shows), a ProfilePage whose main entity is the Person, and one
ScholarlyArticle per published entry of the Publications list (title, authors, year, journal, DOI exactly
as printed on the page; manuscripts without a journal are left out). Every course page names the same
Person by its @id as author, so the pages and the profile read as one person's work.

tools/build_course.py calls update() on every build; to run it alone:  python3 tools/home_seo.py
"""
import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://asajeevan.github.io/'
PERSON_ID = SITE + '#person'
OWNER = 'A. Shyma Sajeevan'          # how the owner's name is printed in the author lists

# Topics named in the About and Techniques sections of the page.
KNOWS_ABOUT = ['Battery electrochemistry', 'Solid polymer electrolytes', 'Lithium-metal batteries',
               'Organic electrode materials', 'Composite electrodes', 'Electrochemical impedance spectroscopy',
               'Cyclic voltammetry', 'Galvanostatic cycling', 'Post-mortem characterisation of battery cells',
               'Sodium-ion electrode materials', 'Battery-material recovery']


def text(fragment):
    return html.unescape(re.sub(r'<[^>]+>', '', fragment)).strip()


def publications(page):
    out = []
    for li in re.findall(r'<li class="pub">(.*?)</li>', page, re.S):
        fields = {c: re.search(r'<p class="%s">(.*?)</p>' % c, li, re.S) for c in ('pub-yr', 'pub-t', 'pub-a', 'pub-j')}
        if not all(fields.values()):
            continue                                   # e.g. a manuscript in preparation
        year, title, authors = (text(fields[c].group(1)) for c in ('pub-yr', 'pub-t', 'pub-a'))
        j = fields['pub-j'].group(1)
        journal = re.search(r'<i>(.*?)</i>', j)
        dois = re.findall(r'href="https://doi\.org/([^"]+)"', j)
        if not (journal and dois and re.fullmatch(r'\d{4}', year)):
            continue
        people = []
        for name in (a.strip() for a in authors.split(',')):
            people.append({'@id': PERSON_ID} if name == OWNER else {'@type': 'Person', 'name': name})
        art = {'@type': 'ScholarlyArticle', 'headline': title if len(title) <= 110 else title[:107].rsplit(' ', 1)[0] + '...',
               'name': title, 'author': people, 'datePublished': year,
               'isPartOf': {'@type': 'Periodical', 'name': text(journal.group(1))},
               'identifier': {'@type': 'PropertyValue', 'propertyID': 'DOI', 'value': dois[0]},
               'url': 'https://doi.org/' + dois[0]}
        if len(dois) > 1:
            art['sameAs'] = ['https://doi.org/' + d for d in dois[1:]]
        out.append(art)
    return out


def build(page, modified=None):
    meta = lambda n: html.unescape(re.search(r'<meta name="%s" content="([^"]*)"' % n, page).group(1))
    old = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', page, re.S).group(1))
    person = old if old.get('@type') == 'Person' else next(x for x in old.get('@graph', []) if x.get('@type') == 'Person')
    person = {'@type': 'Person', '@id': PERSON_ID, 'name': person['name'], 'givenName': 'Aswadh', 'familyName': 'Shyma Sajeevan',
              'url': SITE, 'jobTitle': person['jobTitle'], 'description': meta('description'),
              'knowsAbout': KNOWS_ABOUT, 'alumniOf': person['alumniOf'], 'sameAs': person['sameAs']}
    title = text(re.search(r'<title>(.*?)</title>', page, re.S).group(1))
    profile = {'@type': 'ProfilePage', '@id': SITE + '#profile', 'url': SITE, 'name': title, 'inLanguage': 'en',
               'isPartOf': {'@id': SITE + '#website'}, 'mainEntity': {'@id': PERSON_ID},
               'primaryImageOfPage': {'@type': 'ImageObject', 'url': SITE + 'assets/img/share/home.png', 'width': 1200, 'height': 630},
               'hasPart': {'@type': 'Course', 'name': 'How batteries work', 'url': SITE + 'batteries/'}}
    if modified:
        profile['dateModified'] = modified
    website = {'@type': 'WebSite', '@id': SITE + '#website', 'url': SITE, 'name': 'Aswadh Shyma Sajeevan',
               'inLanguage': 'en', 'publisher': {'@id': PERSON_ID}}
    return {'@context': 'https://schema.org', '@graph': [website, profile, person] + publications(page)}


def update(path=ROOT / 'index.html', modified=None):
    page = path.read_text(encoding='utf-8')
    ld = json.dumps(build(page, modified), ensure_ascii=False, separators=(',', ':'))
    new, n = re.subn(r'(<script type="application/ld\+json">).*?(</script>)', lambda m: m.group(1) + ld + m.group(2), page, count=1, flags=re.S)
    assert n == 1, 'no JSON-LD block on the home page'
    if new != page:
        path.write_text(new, encoding='utf-8')
    return len(build(page)['@graph']) - 3


if __name__ == '__main__':
    print('home page JSON-LD: %d publications' % update(modified=sys.argv[1] if len(sys.argv) > 1 else None))
