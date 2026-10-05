#!/usr/bin/env python3
"""Check every internal link of the course: the file exists and the #anchor is an id on it.
  python3 tools/qa/linkcheck.py"""
import re, pathlib, sys, urllib.parse
ROOT = pathlib.Path(__file__).resolve().parents[2]
pages = sorted((ROOT / 'batteries').rglob('index.html'))
pages = [p for p in pages if '_identity' not in p.parts]
ids = {}
def ids_of(p):
    if p not in ids:
        ids[p] = set(re.findall(r'\bid="([^"]+)"', p.read_text(encoding='utf-8')))
    return ids[p]
bad, n = [], 0
for p in pages:
    t = p.read_text(encoding='utf-8')
    for href in re.findall(r'<a\b[^>]*\bhref="([^"]+)"', t):
        if re.match(r'(https?:|mailto:|data:|javascript:)', href):
            continue
        n += 1
        path, _, frag = href.partition('#')
        target = p if not path else (p.parent / urllib.parse.unquote(path)).resolve()
        if target.is_dir():
            target = target / 'index.html'
        if not target.exists():
            bad.append('%s: %s (no file)' % (p.relative_to(ROOT), href)); continue
        if frag and frag != 'top' and target.suffix == '.html' and frag not in ids_of(target):
            if not (target.name == 'index.html' and target.parent == ROOT / 'batteries' and frag == ''):
                bad.append('%s: %s (no anchor)' % (p.relative_to(ROOT), href))
    for src in re.findall(r'<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"', t):
        if re.match(r'(https?:|data:)', src):
            continue
        n += 1
        if not (p.parent / src).resolve().exists():
            bad.append('%s: %s (no asset)' % (p.relative_to(ROOT), src))
print('%d pages, %d internal links and assets checked, %d broken' % (len(pages), n, len(bad)))
for b in bad[:60]:
    print('  ' + b)
sys.exit(1 if bad else 0)
