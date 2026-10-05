#!/usr/bin/env python3
"""Cut the old module sources (src/learn/mod-NN.html) into reusable pieces.

A module file is: an opening (the section tag, the module number, the h2, the hook, the
"Where we are" paragraph), then beats (one <div class="beat"> per figure, with its text),
and inside the last beat's text a closing (recap, bridge, Go deeper panels, the
mathematics panel, the source list). parse() returns those pieces exactly as they are
written, and reassemble() must give back the file byte for byte: that is the guarantee
that the restructure moves text without changing it.

  python3 tools/course_parse.py        # self-test on all modules
"""
import re, pathlib

SRC = pathlib.Path(__file__).resolve().parents[1] / 'src' / 'learn'
BEAT_SPLIT = '\n    <div class="beat'
BEAT_END = '\n      </div>\n    </div>'    # end of .text and of the beat
TAIL_START = '        <p class="recap">'

def parse(mid):
    """mid: 'm05' -> dict(id, open, beats=[{fig, html}], tail_parts=[{kind, html}], close, last_text_end)"""
    path = SRC / ('mod-%s.html' % mid[1:])
    s = path.read_text(encoding='utf-8')
    end = s.rindex(BEAT_END) + len(BEAT_END)   # the last beat ends here; the rest closes the module (and may hold an act's closing block)
    body, close = s[:end], s[end:]
    chunks = body.split(BEAT_SPLIT)
    opening, beats_raw = chunks[0], [BEAT_SPLIT + c for c in chunks[1:]]
    beats = []
    for b in beats_raw:
        figs = re.findall(r'data-fig="([^"]+)"', b)
        beats.append({'fig': figs[0], 'figs': figs, 'html': b})
    # the closing elements sit inside the last beat's text, from the recap to the end of the text
    last = beats[-1]['html']
    t0 = last.index(TAIL_START)
    assert last.endswith(BEAT_END), mid + ': last beat does not end as expected'
    tail = last[t0:len(last) - len(BEAT_END)]
    beats[-1]['html'] = last[:t0] + last[len(last) - len(BEAT_END):]
    parts = []
    # split the tail into its elements, keeping every byte (each part owns its trailing whitespace)
    pat = re.compile(r'        <p class="recap">|        <p class="bridge">|        <details class="deeper maths"|        <details class="deeper"|        \{\{sources:')
    starts = [m.start() for m in pat.finditer(tail)]
    assert starts and starts[0] == 0, mid + ': tail does not start with the recap'
    starts.append(len(tail))
    kinds = {'<p class="recap"': 'recap', '<p class="bridge"': 'bridge', '<details class="deeper maths"': 'maths',
             '<details class="deeper"': 'deeper', '{{sources:': 'sources'}
    for a, b in zip(starts, starts[1:]):
        piece = tail[a:b]
        kind = next(v for k, v in kinds.items() if piece.lstrip().startswith(k))
        parts.append({'kind': kind, 'html': piece})
    return {'id': mid, 'open': opening, 'beats': beats, 'tail_parts': parts, 'close': close, 'source': s}

def insert_tail(beat_html, tail_html):
    """Put closing elements inside a beat's text, just before the text ends."""
    assert beat_html.endswith(BEAT_END)
    return beat_html[:len(beat_html) - len(BEAT_END)] + tail_html + BEAT_END

def reassemble(p):
    beats = [b['html'] for b in p['beats']]
    beats[-1] = insert_tail(beats[-1], ''.join(x['html'] for x in p['tail_parts']))
    return p['open'] + ''.join(beats) + p['close']

def maths_lines(maths_html):
    """Split a mathematics panel into (head, [eqline...], foot) so its lines can follow their figures."""
    m = re.match(r'(.*?<div class="body">\s*)(.*?)(\s*</div></details>\s*)$', maths_html, re.S)
    head, body, foot = m.group(1), m.group(2), m.group(3)
    lines = re.findall(r'\s*<p class="(?:eqline|mnote)".*?</p>', body, re.S)
    assert ''.join(lines).strip() == body.strip(), 'maths panel holds something other than eqlines'
    return head, lines, foot

MODULES = ['m%02d' % i for i in range(13)]

if __name__ == '__main__':
    n = 0
    for mid in MODULES:
        p = parse(mid)
        assert reassemble(p) == p['source'], mid + ': reassembly differs'
        for t in p['tail_parts']:
            if t['kind'] == 'maths':
                maths_lines(t['html'])
        n += len(p['beats'])
        print(mid, len(p['beats']), 'beats;', ', '.join(t['kind'] for t in p['tail_parts']))
    print('all %d modules reassemble byte for byte; %d beats' % (len(MODULES), n))
