# Quantum-chemistry inputs for Figure 7.1 (and the geometries used in 7.4 and 7.6)

`pip install pyscf pyberny matplotlib pillow`, then run in order:
`python3 opt.py` (B3LYP/def2-SVP optimisation of EC, DMC, PF6-; writes geoms.json),
`python3 dens.py` (density and electrostatic potential on a plane through each molecule; writes *.npz, dens_info.json),
`python3 render.py` (WebP maps; the page uses assets/img/learn/m7-*.webp).
The numbers quoted on the page (dipole moments, potential ranges) come from geoms.json and dens_info.json.
