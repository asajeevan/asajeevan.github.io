import json, numpy as np, io, base64
from PIL import Image
import matplotlib; matplotlib.use('Agg')
from matplotlib import cm
from matplotlib.colors import LinearSegmentedColormap
info = json.load(open('dens_info.json'))
dens_cmap = LinearSegmentedColormap.from_list('d', ['#0c2730', '#1f5b6b', '#3fa7a0', '#9fe3d9', '#fff3c4', '#ffffff'])
esp_cmap = LinearSegmentedColormap.from_list('e', ['#d7301f', '#f58f6b', '#f7f4ee', '#7fb3e6', '#2563c9'])
out = {}
for k in ['ec', 'dmc', 'pf6', 'li']:
    d = np.load(k + '.npz'); rho, esp = d['rho'], d['esp']
    lr = np.clip((np.log10(np.maximum(rho, 1e-9)) + 3.0) / 4.5, 0, 1)        # 0.001 to ~30 e/A^3
    rgba = dens_cmap(lr); rgba[..., 3] = np.clip(lr * 1.6, 0, 1)            # transparent where there is almost no density
    # contour lines of rho at 0.001, 0.01, 0.1, 1, 10 e/A^3 (thin dark lines)
    L = np.log10(np.maximum(rho, 1e-9))
    for lev in (-3, -2, -1, 0, 1):
        edge = (np.abs(L - lev) < 0.025)
        rgba[edge, :3] = rgba[edge, :3] * 0.55; rgba[edge, 3] = np.maximum(rgba[edge, 3], 0.6)
    imd = Image.fromarray((rgba * 255).astype(np.uint8), 'RGBA')
    # ESP outside the molecular surface (rho < 0.001 a.u. = 0.00675 e/A^3), clipped to +-2 V; inside grey
    surf = 0.00675; inside = rho >= surf
    e = np.clip(esp / 2.0, -1, 1) * 0.5 + 0.5
    rgba2 = esp_cmap(e); far = np.clip((np.log10(np.maximum(rho, 1e-9)) + 4.6) / 1.6, 0, 1)   # fade out where the potential is felt weakly
    rgba2[..., 3] = far
    rgba2[inside] = [0.55, 0.6, 0.62, 0.95]
    edge = np.abs(np.log10(np.maximum(rho, 1e-9)) - np.log10(surf)) < 0.03
    rgba2[edge] = [1, 1, 1, 1]
    ime = Image.fromarray((rgba2 * 255).astype(np.uint8), 'RGBA')
    for name, im in (('d', imd), ('e', ime)):
        im = im.resize((300, 300), Image.LANCZOS); b = io.BytesIO(); im.save(b, 'WEBP', quality=82, method=6)
        out[k + '_' + name] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
        im.save('%s_%s.png' % (k, name))
    print(k, [len(out[k + '_' + n]) for n in 'de'])
json.dump(out, open('images.json', 'w'))
