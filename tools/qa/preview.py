"""Build a self-contained preview of the learning page: CSS and JS inlined, computed images
embedded as data URIs (window.M7_IMG). Usage: python3 tools/qa/preview.py out.html"""
import re, sys, os, base64, json
root = os.path.join(os.path.dirname(__file__), '..', '..')
s = open(os.path.join(root, 'batteries/index.html'), encoding='utf-8').read()
def css(m):
    return '<style>' + open(os.path.join(root, 'batteries', m.group(1)), encoding='utf-8').read() + '</style>'
s = re.sub(r'<link rel="stylesheet" href="(\.\./assets/css/[^"]+)">', css, s)
def js(m):
    p = os.path.join(root, 'batteries', m.group(1))
    return '<script>' + open(p, encoding='utf-8').read().replace('</script', '<\\/script') + '</script>' if os.path.exists(p) else ''
imgs = {}
d = os.path.join(root, 'assets/img/learn')
for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
    if f.startswith('m7-') and f.endswith('.webp'):
        imgs[f] = 'data:image/webp;base64,' + base64.b64encode(open(os.path.join(d, f), 'rb').read()).decode()
s = s.replace('<script src="../assets/js/gsap.min.js">', '<script>window.M7_IMG=' + json.dumps(imgs) + ';</script><script src="../assets/js/gsap.min.js">', 1)
s = re.sub(r'<script src="(\.\./assets/js/[^"]+)"></script>', js, s)
open(sys.argv[1], 'w', encoding='utf-8').write(s)
print('preview', sys.argv[1], len(s), 'bytes,', len(imgs), 'images')
