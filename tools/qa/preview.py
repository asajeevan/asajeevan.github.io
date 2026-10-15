"""Build a preview of the whole course as a set of static files, for a host that does not serve a
folder's index.html (a link to "polarization/" must name "polarization/index.html"):

  python3 tools/qa/preview.py OUTDIR

OUTDIR gets batteries/**/index.html (links to folders rewritten to name index.html, and
data-dir-index on <body> so that assets/js/course.js does the same for the links it builds),
the CSS, scripts and images the pages use, and files.json listing every file. The landing page
of the preview is written separately (it is not part of the course)."""
import json, os, re, shutil, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
out = pathlib.Path(sys.argv[1])
if out.exists():
    shutil.rmtree(out)
files = []

def put(rel, data=None):
    dst = out / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    if data is None:
        shutil.copyfile(ROOT / rel, dst)
    else:
        dst.write_text(data, encoding='utf-8')
    files.append(rel)

def fix_href(m):
    h = m.group(2)
    if re.match(r'([a-z]+:|#|data:)', h, re.I):
        return m.group(0)
    path, hash_, frag = h.partition('#')
    if path.endswith('/'):
        path += 'index.html'
    return m.group(1) + path + hash_ + frag + m.group(3)

for p in sorted((ROOT / 'batteries').rglob('index.html')):
    rel = p.relative_to(ROOT).as_posix()
    if '/_identity/' in '/' + rel:
        continue
    t = p.read_text(encoding='utf-8')
    t = re.sub(r'(<a\b[^>]*\bhref=")([^"]*)(")', fix_href, t)
    t = t.replace('<body ', '<body data-dir-index ', 1)
    # the animation library from its public CDN (same version as the copy in assets/js)
    t = re.sub(r'<script src="[./]*assets/js/(gsap|ScrollTrigger)\.min\.js"></script>',
               lambda m: '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/%s.min.js"></script>' % m.group(1), t)
    put(rel, t)
for rel in ['assets/css/site.css', 'assets/css/learn.css']:
    put(rel)
for rel in ['physics.js', 'site.js', 'share.js', 'course.js', 'motion.js', 'course-index.js']:
    put('assets/js/' + rel)
for p in sorted((ROOT / 'assets/js/learn').glob('*.js')):
    put(p.relative_to(ROOT).as_posix())
for p in sorted((ROOT / 'assets/img/learn').glob('*')):
    put(p.relative_to(ROOT).as_posix())
(out / 'files.json').write_text(json.dumps(files, indent=0), encoding='utf-8')
size = sum((out / f).stat().st_size for f in files)
print('preview: %d files, %d bytes in %s' % (len(files), size, out))
