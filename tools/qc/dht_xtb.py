"""Geometries of the p-DHT family tetra-anions for figure 9.14 (figs-9s.js, DHT_GEOM).

RDKit (ETKDG + MMFF) start structures, then GFN2-xTB (tblite) with ALPB implicit water,
charge -4, optimised with ASE BFGS to fmax 0.01 eV/A. Writes dht_geoms.json; paste its
contents between /*GEOM*/ and /*END*/ in src/learn/figs/figs-9s.js.
Needs: pip install rdkit tblite ase
"""
import json
from rdkit import Chem
from rdkit.Chem import AllChem
from ase import Atoms
from ase.optimize import BFGS
from tblite.ase import TBLite

SMILES = {
    'pdht': '[O-]C(=O)c1cc([O-])c(C(=O)[O-])cc1[O-]',     # 2,5-dioxido-1,4-benzenedicarboxylate
    'odht': '[O-]C(=O)c1ccc(C(=O)[O-])c([O-])c1[O-]',     # 2,3-dioxido-1,4-benzenedicarboxylate
    'pdobda': '[O-]C(=O)Cc1cc([O-])c(CC(=O)[O-])cc1[O-]',  # 2,5-dioxido-1,4-benzenediacetate
}
out = {}
for k, smi in SMILES.items():
    m = Chem.AddHs(Chem.MolFromSmiles(smi))
    AllChem.EmbedMolecule(m, randomSeed=7)
    AllChem.MMFFOptimizeMolecule(m)
    c = m.GetConformer()
    at = Atoms([a.GetSymbol() for a in m.GetAtoms()], positions=[list(c.GetAtomPosition(i)) for i in range(m.GetNumAtoms())])
    at.calc = TBLite(method='GFN2-xTB', charge=-4, solvation=('alpb', 'water'), verbosity=0)
    BFGS(at, logfile=None).run(fmax=0.01, steps=500)
    out[k] = [[s] + [round(float(v), 3) for v in p] for s, p in zip(at.get_chemical_symbols(), at.get_positions())]
    print(k, at.get_potential_energy())
json.dump(out, open('dht_geoms.json', 'w'), separators=(', ', ': '))
