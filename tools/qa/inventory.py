#!/usr/bin/env python3
"""Text inventory of the course sources, for before/after comparison during the restructure.

Reads source HTML files (with {{include:...}} resolved), drops SVG drawings, and lists every
text block (paragraphs, list items, captions, headings, table cells, summaries) with its
citation keys kept as {{cite:...}} markers. Figure, module and chapter numbers are masked,
so renumbering does not count as a change.

  python3 tools/qa/inventory.py OUT.json src1.html [src2.html ...]
  python3 tools/qa/inventory.py --compare BEFORE.json AFTER.json
"""
import json, re, sys, pathlib, collections, html

SRC = pathlib.Path(__file__).resolve().parents[2] / 'src' / 'learn'
BLOCK = re.compile(r'<(p|li|h1|h2|h3|figcaption|summary|td|th|span class="(?:try|basis)")\b[^>]*>(.*?)</(?:p|li|h1|h2|h3|figcaption|summary|td|th|span)>', re.S)
FIGNUM = re.compile(r'\b(figures?|Figures?)\s+(?:L?\d+\.\d+|\{\{fig:[^}]+\}\})(?:(?:, | and | or | to |–)(?:L?\d+\.\d+|\{\{fig:[^}]+\}\}))*')
REFNUM = re.compile(r'\{\{[Cc]h:[^}]+\}\}|\b(?:modules?|Modules?|chapters?|Chapters?|Lab)\s+\d+(?:\s*(?:to|and|–|-)\s*\d+)?')

def resolve(path):
    text = pathlib.Path(path).read_text(encoding='utf-8')
    return re.sub(r'\{\{include:([^}]+)\}\}', lambda m: resolve(SRC / m.group(1).strip()), text)

def norm(s):
    s = re.sub(r'<svg\b.*?</svg>', ' ', s, flags=re.S)
    s = re.sub(r'\{\{cite:([^}]*)\}\}', lambda m: ' {{cite:%s}} ' % ','.join(sorted(k.strip() for k in m.group(1).split(','))), s)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = html.unescape(s)
    s = FIGNUM.sub('FIG #', s)
    s = REFNUM.sub('REF #', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'\s+([.,;:)])', r'\1', s)
    return s

def inventory(files):
    blocks = []
    for f in files:
        text = re.sub(r'<svg\b.*?</svg>', ' ', resolve(f), flags=re.S)
        # take leaf blocks first, remove them, and repeat, so a caption keeps its own text
        # after its nested "try" and "basis" spans have been listed separately
        while True:
            found = False
            def leaf(m):
                nonlocal found
                if BLOCK.search(m.group(2)):
                    return m.group(0)
                found = True
                t = norm(m.group(2))
                if t:
                    blocks.append(t)
                return ' '
            text = BLOCK.sub(leaf, text)
            if not found:
                break
    return blocks

if __name__ == '__main__':
    if sys.argv[1] == '--compare':
        a = collections.Counter(json.load(open(sys.argv[2])))
        b = collections.Counter(json.load(open(sys.argv[3])))
        lost, new = a - b, b - a
        print('blocks before %d, after %d; only before %d, only after %d' % (sum(a.values()), sum(b.values()), sum(lost.values()), sum(new.values())))
        for t in lost: print('  - ' + t[:200])
        for t in new: print('  + ' + t[:200])
        sys.exit(1 if (lost or new) else 0)
    out, files = sys.argv[1], sys.argv[2:]
    blocks = inventory(files)
    json.dump(blocks, open(out, 'w'), ensure_ascii=False, indent=0)
    print('%d text blocks from %d files' % (len(blocks), len(files)))
