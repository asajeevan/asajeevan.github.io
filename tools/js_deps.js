/* Dependency scan of the figure scripts (src/learn/figs/*.js), for per-page script bundles.
   Every figure file is a fragment of one function scope (learn-core.js wraps them all), so a
   file can use a helper defined in another. For each file this prints the names it defines at
   the top level of that scope and the identifiers it uses. tools/build_course.py follows
   these links so that a page's bundle holds every file its figures need.
   Needs acorn: npm i acorn, or NODE_PATH pointing at a node_modules that has it.
   Run: node tools/js_deps.js > deps.json */
const fs = require('fs');
const path = require('path');
let acorn;
for (const p of ['acorn', '/opt/npm-tools/node_modules/acorn', '/opt/node-tools/node_modules/acorn']) {
  try { acorn = require(p); break; } catch (e) { /* try the next place */ }
}
if (!acorn) { console.error('acorn not found'); process.exit(2); }
const dir = path.resolve(__dirname, '../src/learn/figs');
const out = {};
function walk(node, fn, parentKey, parent) {
  if (!node || typeof node.type !== 'string') return;
  fn(node, parentKey, parent);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(c => walk(c, fn, k, node));
    else if (v && typeof v.type === 'string') walk(v, fn, k, node);
  }
}
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const ast = acorn.parse('(function(){\n' + src + '\n})', { ecmaVersion: 2022 });
  const body = ast.body[0].expression.body.body;
  const defines = new Set(), uses = new Set(), registers = [];
  for (const st of body) {
    if (st.type === 'FunctionDeclaration') defines.add(st.id.name);
    if (st.type === 'VariableDeclaration') st.declarations.forEach(d => { if (d.id.type === 'Identifier') defines.add(d.id.name); });
  }
  walk(ast.body[0].expression.body, (n, key, parent) => {
    if (n.type !== 'Identifier') return;
    if (parent && parent.type === 'MemberExpression' && key === 'property' && !parent.computed) return;
    if (parent && parent.type === 'Property' && key === 'key' && !parent.computed) return;
    uses.add(n.name);
  });
  walk(ast, n => {
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 'register' && n.arguments[0] && n.arguments[0].type === 'Literal') registers.push(n.arguments[0].value);
  });
  out[f] = { defines: [...defines].sort(), uses: [...uses].sort(), registers };
}
process.stdout.write(JSON.stringify(out, null, 1));
