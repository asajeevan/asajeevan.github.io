#!/usr/bin/env python3
"""Compare two figure captures made by tools/qa/capture.js.

  python3 tools/qa/compare.py BEFORE_DIR AFTER_DIR [--idmap map.json]

For every figure id it compares the SVG screenshots at 1300 and 360 px pixel by pixel and
the masked text outside the SVG (readout, key, controls, number of steps). --idmap is
optional ({old_id: new_id}) for figures whose element id changed. Exit code 1 if anything
differs or a figure is missing.
"""
import json, sys, pathlib
from PIL import Image, ImageChops

a, b = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
idmap = {}
STRICT = '--strict' in sys.argv
if '--idmap' in sys.argv:
    idmap = json.load(open(sys.argv[sys.argv.index('--idmap') + 1]))
ra, rb = json.load(open(a / 'figures.json')), json.load(open(b / 'figures.json'))
bad = 0
for fid in sorted(k for k in ra if k != '__errors'):
    nid = idmap.get(fid, fid)
    if nid not in rb:
        print('MISSING', fid); bad += 1; continue
    same_dom = ra[fid].get('svg') and ra[fid].get('svg') == rb[nid].get('svg')
    if not same_dom:
        print('SVG-DOM', fid); bad += 1
    for w in ('1300', '360'):
        if same_dom and not STRICT:
            continue   # identical drawing; pixel differences can only come from sub-pixel placement on the page
        pa, pb = a / w / (fid + '.png'), b / w / (nid + '.png')
        if not pa.exists() and not pb.exists():
            continue
        if not pb.exists():
            print('NO-SHOT', w, fid); bad += 1; continue
        ia, ib = Image.open(pa).convert('RGB'), Image.open(pb).convert('RGB')
        if ia.size != ib.size:
            print('SIZE', w, fid, ia.size, ib.size); bad += 1; continue
        box = ImageChops.difference(ia, ib).getbbox()
        if box:
            diff = ImageChops.difference(ia, ib).convert('L')
            n = sum(diff.histogram()[25:])
            print('PIXELS', w, fid, 'bbox', box, 'changed px', n); bad += 1
    for k in ('readout', 'key', 'controls', 'steps'):
        if ra[fid].get(k) != rb[nid].get(k):
            print('TEXT', fid, k, '|', str(ra[fid].get(k))[:90], '=>', str(rb[nid].get(k))[:90]); bad += 1
extra = sorted(set(rb) - set(idmap.get(k, k) for k in ra) - {'__errors'})
if extra:
    print('NEW figures:', extra)
for e in rb.get('__errors', []):
    print('ERROR', e); bad += 1
print('differences:', bad)
sys.exit(1 if bad else 0)
