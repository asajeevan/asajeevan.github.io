import json, numpy as np
from pyscf import gto, dft
from pyscf.geomopt.berny_solver import optimize
mols = {
 'ec': ("""C 0.000 1.180 0.0; O 1.122 0.365 0.0; O -1.122 0.365 0.0; C -0.694 -0.955 0.15; C 0.694 -0.955 -0.15; O 0.000 2.380 0.0;
 H -1.05 -1.45 0.95; H -1.05 -1.45 -0.75; H 1.05 -1.45 0.75; H 1.05 -1.45 -0.95""", 0),
 'dmc': ("""C 0 0 0; O 0 1.2 0; O 1.15 -0.66 0; O -1.15 -0.66 0; C 2.40 0.05 0; C -2.40 0.05 0;
 H 3.30 -0.55 0; H 2.45 0.68 0.89; H 2.45 0.68 -0.89; H -3.30 -0.55 0; H -2.45 0.68 0.89; H -2.45 0.68 -0.89""", 0),
 'pf6': ("""P 0 0 0; F 1.6 0 0; F -1.6 0 0; F 0 1.6 0; F 0 -1.6 0; F 0 0 1.6; F 0 0 -1.6""", -1),
}
out = {}
for k, (geom, ch) in mols.items():
    m = gto.M(atom=geom, basis='def2-svp', charge=ch, verbose=0)
    mf = dft.RKS(m); mf.xc = 'b3lyp'
    mol_eq = optimize(mf, maxsteps=60)
    mf2 = dft.RKS(mol_eq); mf2.xc = 'b3lyp'; e = mf2.kernel()
    out[k] = {'atoms': [[mol_eq.atom_symbol(i)] + list(mol_eq.atom_coord(i, unit='Angstrom')) for i in range(mol_eq.natm)], 'energy': e, 'dipole': list(mf2.dip_moment(verbose=0))}
    print(k, e, out[k]['dipole'])
json.dump(out, open('geoms.json', 'w'), indent=1)
