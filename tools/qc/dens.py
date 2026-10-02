import json, numpy as np
from pyscf import gto, dft, df
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
G = json.load(open('geoms.json'))
G['li'] = {'atoms': [['Li', 0.0, 0.0, 0.0]]}
spec = {'ec': (0, 5, 5.6), 'dmc': (0, 1, 6.2), 'pf6': (-1, None, 5.0), 'li': (1, None, 3.4)}
info = {}
for k, (ch, up, R) in spec.items():
    atoms = G[k]['atoms']; geom = '; '.join('%s %f %f %f' % tuple(a) for a in atoms)
    mol = gto.M(atom=geom, basis='def2-svp', charge=ch, verbose=0)
    mf = dft.RKS(mol); mf.xc = 'b3lyp'; mf.kernel(); dm = mf.make_rdm1()
    X = np.array([a[1:] for a in atoms])
    heavy = [i for i, a in enumerate(atoms) if a[0] != 'H']
    c = X[heavy].mean(0) if k != 'pf6' else X[0]
    if k in ('ec', 'dmc'):
        P = X[heavy] - c; u, s, vt = np.linalg.svd(P); n = vt[2]
        ey = X[up] - c; ey -= n * ey.dot(n); ey /= np.linalg.norm(ey)       # up: towards the carbonyl O
        ex = np.cross(ey, n)
    elif k == 'pf6':
        ex = (X[1] - X[0]); ex /= np.linalg.norm(ex); ey = X[3] - X[0]; ey -= ex * ey.dot(ex); ey /= np.linalg.norm(ey)
    else:
        ex = np.array([1., 0, 0]); ey = np.array([0, 1., 0])
    N = 241; s1 = np.linspace(-R, R, N)
    U, Vv = np.meshgrid(s1, s1[::-1])
    pts = c + U[..., None] * ex + Vv[..., None] * ey; pts = pts.reshape(-1, 3)
    ao = dft.numint.eval_ao(mol, pts / 0.52917721092)
    rho = dft.numint.eval_rho(mol, ao, dm).reshape(N, N)            # e / bohr^3
    vele = np.empty(len(pts))
    for a0 in range(0, len(pts), 1500):
        fake = gto.fakemol_for_charges(pts[a0:a0 + 1500] / 0.52917721092)
        vele[a0:a0 + 1500] = np.einsum('ijp,ij->p', df.incore.aux_e2(mol, fake), dm)
    vnuc = sum(mol.atom_charge(i) / np.linalg.norm(pts / 0.52917721092 - mol.atom_coord(i), axis=1) for i in range(mol.natm))
    esp = (vnuc - vele).reshape(N, N) * 27.211386                    # volts (hartree/e -> V)
    rhoA = rho / 0.52917721092**3                                     # e / A^3
    # projected atom positions for labels
    proj = [[a[0], float((X[i] - c).dot(ex)), float((X[i] - c).dot(ey)), float((X[i] - c).dot(np.cross(ex, ey)))] for i, a in enumerate(atoms)]
    np.savez('%s.npz' % k, rho=rhoA, esp=esp, R=R)
    info[k] = {'R': R, 'atoms': proj, 'rho_max': float(rhoA.max()), 'esp_min_on_surface': float(esp[(rho > 0.0008) & (rho < 0.0013)].min()), 'esp_max_on_surface': float(esp[(rho > 0.0008) & (rho < 0.0013)].max())}
    print(k, info[k]['rho_max'], info[k]['esp_min_on_surface'], info[k]['esp_max_on_surface'])
json.dump(info, open('dens_info.json', 'w'), indent=1)
