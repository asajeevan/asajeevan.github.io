#!/usr/bin/env python3
"""One-off conversion for the restructure (phase 2): hand-written cross-references become
markers that the build resolves, so that they follow the content when it moves.

  figure 5.8           -> figure {{fig:f5-8p}}       (rendered "figure 11.5", linked)
  module 3 / Module 3  -> {{ch:cell-voltage}} / {{Ch:cell-voltage}}   ("chapter 3" / "Chapter 3")

Figure references are converted wherever the word "figure" (or "figures") is spelled out and
followed by an old two-level figure number; "Fig." is left alone because the page uses it only
for figures in the cited sources. Module references are converted from the table below, written
by hand from the context of each one (a module that was split is mapped to the chapter that now
holds the topic the sentence points to). Code comments are left alone. Every change is printed.

  python3 tools/convert_refs.py [--write]
"""
import re, sys, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / 'src' / 'learn'
WRITE = '--write' in sys.argv

OLD_NUM = {}
for f in sorted(SRC.glob('mod-*.html')):
    for m in re.finditer(r'data-fig="([^"]+)" id="[^"]+">\s*<span class="fnum">Figure ([\d.]+)</span>', f.read_text(encoding='utf-8')):
        OLD_NUM[m.group(2)] = m.group(1)

# (file, exact text, replacement): module references, mapped by topic
MOD = [
 ('mod-00.html', 'Module 3 is about how a cell builds its own hill', '{{Ch:cell-voltage}} is about how a cell builds its own hill'),
 ('mod-00.html', 'difference; module 1 shows how', 'difference; {{ch:galvanic-cells}} shows how'),
 ('mod-00.html', 'it returns in module 4 to count', 'it returns in {{ch:capacity-energy}} to count'),
 ('mod-00.html', 'Module 3 uses this to build the double layer', '{{Ch:cell-voltage}} uses this to build the double layer'),
 ('mod-01.html', 'Module 0 gave you the volt', '{{Ch:electrostatics}} gave you the volt'),
 ('mod-01.html', 'Module 3 shows how each jump is built', '{{Ch:cell-voltage}} shows how each jump is built'),
 ('mod-01.html', 'Module 3 shows that this 213 kJ', '{{Ch:cell-voltage}} shows that this 213 kJ'),
 ('mod-01.html', 'and module 4 turns', 'and {{ch:capacity-energy}} turns'),
 ('mod-01.html', '(module 3 derives it)', '({{ch:cell-voltage}} derives it)'),
 ('mod-02.html', 'Module 1 showed the four jobs', '{{Ch:galvanic-cells}} showed the four jobs'),
 ('mod-02.html', '(module 0 showed why', '({{ch:electrostatics}} showed why'),
 ('mod-02.html', 'R = &#961;l/A (module 0)', 'R = &#961;l/A ({{ch:electrostatics}})'),
 ('mod-03.html', 'Module 1 measured 1.10 V', '{{Ch:galvanic-cells}} measured 1.10 V'),
 ('mod-03.html', 'Module 2 named the parts', '{{Ch:cell-anatomy}} named the parts'),
 ('mod-03.html', 'In module 0 a potential', 'In {{ch:electrostatics}} a potential'),
 ('mod-03.html', 'on its surface (module 0)', 'on its surface ({{ch:electrostatics}})'),
 ('mod-03.html', 'for the reason module 0 gave', 'for the reason {{ch:electrostatics}} gave'),
 ('mod-03.html', 'no free electrons (module 1)', 'no free electrons ({{ch:galvanic-cells}})'),
 ('mod-03.html', 'The Daniell cell of module 1', 'The Daniell cell of {{ch:galvanic-cells}}'),
 ('mod-03.html', 'zinc; module 4 turns', 'zinc; {{ch:capacity-energy}} turns'),
 ('mod-04.html', 'Module 3 gave your cell a voltage', '{{Ch:cell-voltage}} gave your cell a voltage'),
 ('mod-04.html', 'P = IV, module 0)', 'P = IV, {{ch:electrostatics}})'),
 ('mod-04.html', 'Module 2 showed the inert parts; module 0 showed why', '{{Ch:cell-anatomy}} showed the inert parts; {{ch:electrostatics}} showed why'),
 ('mod-05.html', 'In module 4 we counted', 'In {{ch:capacity-energy}} we counted'),
 ('mod-05.html', 'through the wire (module 6)', 'through the wire ({{ch:cell-anatomy}})'),
 ('mod-05.html', 'from the ladder of module 3', 'from the ladder of {{ch:cell-voltage}}'),
 ('mod-05.html', 'electrolyte boundaries (module 3)', 'electrolyte boundaries ({{ch:cell-voltage}})'),
 ('mod-05.html', 'again in module 11, read with an alternating current', 'again in {{ch:lab/eis-measurement}}, read with an alternating current'),
 ('mod-05.html', 'that we meet again in module 11', 'that we meet again in {{ch:lab/eis-measurement}}'),
 ('mod-05.html', 'a loss paid once (module 6)', 'a loss paid once ({{ch:sei}})'),
 ('mod-06.html', 'In module 5 we watched', 'In {{ch:polarization}} we watched'),
 ('mod-06.html', 'electrolyte is stable (module 3)', 'electrolyte is stable ({{ch:cell-voltage}})'),
 ('mod-06.html', 'In module 10 we shall see', 'In {{ch:degradation}} we shall see'),
 ('mod-06.html', 'We return to this in module 8', 'We return to this in {{ch:composite-electrodes}}'),
 ('mod-06.html', 'voltage scale of module 3', 'voltage scale of {{ch:cell-voltage}}'),
 ('mod-07.html', 'Module 6 put our ion', '{{Ch:insertion-hosts}} put our ion'),
 ('mod-07.html', 'voltage of a lithium cell (module 3)', 'voltage of a lithium cell ({{ch:cell-voltage}})'),
 ('mod-07.html', 'SEI on the graphite (module 6)', 'SEI on the graphite ({{ch:sei}})'),
 ('mod-07.html', 'stop overcharge (module 12)', 'stop overcharge ({{ch:safety}})'),
 ('mod-07.html', 'stable SEI on graphite (module 6)', 'stable SEI on graphite ({{ch:sei}})'),
 ('mod-07.html', 'attraction of opposite charges, module 0', 'attraction of opposite charges, {{ch:electrostatics}}'),
 ('mod-07.html', 'charges are opposite (module 0)', 'charges are opposite ({{ch:electrostatics}})'),
 ('mod-07.html', 'chapter 4 (module 0)', 'chapter 4 ({{ch:electrostatics}})'),
 ('mod-07.html', 'electrode particles in module 6', 'electrode particles in {{ch:insertion-hosts}}'),
 ('mod-07.html', 'adds the two together (module 0)', 'adds the two together ({{ch:electrostatics}})'),
 ('mod-07.html', 'double layer of module 3', 'double layer of {{ch:cell-voltage}}'),
 ('mod-07.html', 'from module 0', 'from {{ch:electrostatics}}'),
 ('mod-07.html', 'concentration polarization of module 5', 'concentration polarization of {{ch:polarization}}'),
 ('mod-07.html', 'electrode possible (module 9)', 'electrode possible ({{ch:negative-electrodes}})'),
 ('mod-07.html', 'Module 0 gave the mobility', '{{Ch:electrostatics}} gave the mobility'),
 ('mod-07.html', '1.23 V (module 3)', '1.23 V ({{ch:cell-voltage}})'),
 ('mod-07.html', 'Nernst-Planck, as in module 0', 'Nernst-Planck, as in {{ch:electrostatics}}'),
 ('mod-08.html', 'In module 7 we carried our ion', 'In {{ch:ion-transport}} we carried our ion'),
 ('mod-08.html', 'two hosts of module 6', 'two hosts of {{ch:insertion-hosts}}'),
 ('mod-08.html', 'In module 2 we saw', 'In {{ch:cell-anatomy}} we saw'),
 ('mod-08.html', 'linearized kinetics of module 5 (', 'linearized kinetics of {{ch:polarization}} ('),
 ('mod-08.html', 'square of its size (module 6)', 'square of its size ({{ch:insertion-hosts}})'),
 ('mod-08.html', 'linearized kinetics of module 5, j', 'linearized kinetics of {{ch:polarization}}, j'),
 ('mod-09.html', 'In module 8 we built', 'In {{ch:composite-electrodes}} we built'),
 ('mod-09.html', 'the one we met in module 6', 'the one we met in {{ch:insertion-hosts}}'),
 ('mod-09.html', 'leaves the <b>SEI</b> (module 6)', 'leaves the <b>SEI</b> ({{ch:sei}})'),
 ('mod-09.html', 'SEI over time in module 10', 'SEI over time in {{ch:degradation}}'),
 ('mod-09.html', 'which we met in module 7', 'which we met in {{ch:solid-state}}'),
 ('mod-09.html', 'on the principle of module 6', 'on the principle of {{ch:insertion-hosts}}'),
 ('mod-09.html', '170 mAh/g (module 4)', '170 mAh/g ({{ch:capacity-energy}})'),
 ('mod-09.html', 'That is the question of module 10.', 'That is the question of {{ch:degradation}}.'),
 ('mod-09.html', 'as on the ladder of module 3', 'as on the ladder of {{ch:cell-voltage}}'),
 ('mod-10.html', 'In module 9 we pushed both electrodes', 'In {{ch:sodium-organic}} we pushed both electrodes'),
 ('mod-10.html', 'The SEI of module 6 does not stop', 'The SEI of {{ch:sei}} does not stop'),
 ('mod-11.html', 'In module 10 we named the thieves', 'In {{ch:degradation}} we named the thieves'),
 ('mod-11.html', 'name the thief of module 10', 'name the thief of {{ch:degradation}}'),
 ('mod-11.html', 'test bench of module 5', 'test bench of {{ch:polarization}}'),
 ('mod-11.html', 'three tools from module 5', 'three tools from {{ch:polarization}}'),
 ('mod-11.html', 'what module 10 asked of us', 'what {{ch:degradation}} asked of us'),
 ('mod-11.html', 'pick one thief from module 10', 'pick one thief from {{ch:degradation}}'),
 ('mod-12.html', 'In module 11 we learned to measure a cell', 'In {{ch:lab/cell-testing}} we learned to measure a cell'),
 ('mod-12.html', 'The SEI we met in module 6', 'The SEI we met in {{ch:sei}}'),
 ('mod-12.html', 'average voltage (module 4)', 'average voltage ({{ch:capacity-energy}})'),
 ('mod-12.html', '(module 5, figure 5.12)', '({{ch:polarization}}, figure 5.12)'),
 ('mod-12.html', 'ageing law of module 10', 'ageing law of {{ch:degradation}}'),
 ('figs/figs-0.js', 'apart (module 1 shows how)', 'apart ({{ch:galvanic-cells}} shows how)'),
 ('figs/figs-10.js', 'first charge (module 6) does not stop', 'first charge ({{ch:sei}}) does not stop'),
 ('figs/figs-11.js', "where: 'module 5'", "where: '{{ch:polarization}}'"),
 ('figs/figs-11.js', 'runaway starts (module 12)', 'runaway starts ({{ch:safety}})'),
 ('figs/figs-12.js', 'SEI fastest (module 10)', 'SEI fastest ({{ch:degradation}})'),
 ('figs/figs-2.js', 'the ion road of module 1', 'the ion road of {{ch:galvanic-cells}}'),
 ('figs/figs-2.js', 'The strip from module 1', 'The strip from {{ch:galvanic-cells}}'),
 ('figs/figs-2.js', 'On the ladder of module 3', 'On the ladder of {{ch:cell-voltage}}'),
 ('figs/figs-2.js', 'Module 3 explains both facts', '{{Ch:cell-voltage}} explains both facts'),
 ('figs/figs-3.js', 'electron-volt of module 0', 'electron-volt of {{ch:electrostatics}}'),
 ('figs/figs-3.js', 'at its <b>surface</b> (module 0)', 'at its <b>surface</b> ({{ch:electrostatics}})'),
 ('figs/figs-3.js', 'lamp of module 1', 'lamp of {{ch:galvanic-cells}}'),
 ('figs/figs-5.js', 'as in module 1', 'as in {{ch:galvanic-cells}}'),
 ('figs/figs-6.js', 'as the cell cycles (module 10)', 'as the cell cycles ({{ch:degradation}})'),
 ('figs/figs-6.js', 'small particles matter (module 8)', 'small particles matter ({{ch:composite-electrodes}})'),
 ('figs/figs-6.js', 'polymer electrolytes (module 7)', 'polymer electrolytes ({{ch:solid-state}})'),
 ('figs/figs-6.js', 'with carbon (module 8)', 'with carbon ({{ch:composite-electrodes}})'),
 ('figs/figs-7.js', '<b>concentration polarization</b> (module 5)', '<b>concentration polarization</b> ({{ch:polarization}})'),
 ('figs/figs-11.js', "where: 'figures 11.3 to 11.7'", "where: '{{ch:lab/gitt}}'"),
 ('figs/figs-11.js', "where: 'figures 11.8 to 11.17'", "where: '{{ch:lab/eis-measurement}} and {{ch:lab/eis-analysis}}'"),
 ('figs/figs-7m.js', 'from the bulk (module 3)', 'from the bulk ({{ch:cell-voltage}})'),
 ('figs/figs-8.js', 'build the SEI (module 6)', 'build the SEI ({{ch:sei}})'),
 ('figs/figs-9p.js', '170 mAh/g of module 4', '170 mAh/g of {{ch:capacity-energy}}'),
]

FIG = re.compile(r'\b([Ff]igures?)(\s+)(\d+\.\d+(?![.\d])(?:(?:, | and | or | to |–)\d+\.\d+(?![.\d]))*)')

def convert_figs(text, fname, report):
    def sub(m):
        nums = m.group(3)
        if ' to ' in nums or '–' in nums:
            report.append('RANGE (left for hand editing) %s: %s' % (fname, m.group(0)))
            return m.group(0)
        out = re.sub(r'\d+\.\d+', lambda n: '{{fig:%s}}' % OLD_NUM[n.group(0)] if n.group(0) in OLD_NUM else n.group(0), nums)
        missing = [n for n in re.findall(r'\d+\.\d+', nums) if n not in OLD_NUM]
        if missing:
            report.append('UNKNOWN figure number %s in %s: %s' % (missing, fname, m.group(0)))
        return m.group(1) + m.group(2) + out
    # never inside the figure-number spans themselves, and never in code comments
    parts = re.split(r'(<span class="fnum">Figure [\d.]+</span>|//[^\n]*|/\*.*?\*/)', text, flags=re.S)
    for i in range(0, len(parts), 2):
        parts[i] = FIG.sub(sub, parts[i])
    return ''.join(parts)

if __name__ == '__main__':
    report, changed = [], {}
    for fname, old, new in MOD:
        p = SRC / fname
        text = changed.get(fname) or p.read_text(encoding='utf-8')
        n = text.count(old)
        if n != 1:
            report.append('MODULE REF %s occurs %d times in %s' % (old, n, fname))
            continue
        changed[fname] = text.replace(old, new)
    files = sorted(SRC.glob('mod-*.html')) + sorted((SRC / 'figs').glob('*.js'))
    nfig = 0
    for p in files:
        fname = str(p.relative_to(SRC))
        text = changed.get(fname) or p.read_text(encoding='utf-8')
        new = convert_figs(text, fname, report)
        nfig += new.count('{{fig:') - text.count('{{fig:')
        changed[fname] = new
    left = []
    for fname, text in changed.items():
        for line in text.split('\n'):
            code = re.sub(r'//.*$|/\*.*?\*/', '', line)
            if re.search(r'\b[Mm]odules? \d+', code) and 'class="mod-n"' not in code:
                left.append('%s: %s' % (fname, code.strip()[:160]))
    print('figure references converted: %d; module references converted: %d' % (nfig, len(MOD) - sum(1 for r in report if r.startswith('MODULE'))))
    for r in report: print(r)
    print('module references left (act-end blocks and other closing text that the course drops, or to edit by hand):')
    for l in left: print('  ' + l)
    if WRITE:
        for fname, text in changed.items():
            (SRC / fname).write_text(text, encoding='utf-8')
        print('written')
