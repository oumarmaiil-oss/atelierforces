// Intègre dans index.html un sous-ensemble minifié de Three.js (seules les classes utilisées).
// Usage (depuis la racine du dépôt) :
//   npm i --no-save three@0.187.0 esbuild
//   node outils/integrer-three.mjs
// La liste des classes est relevée automatiquement dans index.html (motif « THREE.Nom »).
import { readFileSync, writeFileSync } from 'node:fs';
import { buildSync } from 'esbuild';

const FICHIER = 'index.html';
let html = readFileSync(FICHIER, 'utf8');
const debut = '<script id="three-js">', fin = '</script><!-- /three-js -->';
const i = html.indexOf(debut), j = html.indexOf(fin);
if (i < 0 || j < 0) throw new Error('Marqueurs <script id="three-js"> introuvables dans index.html');

const code = html.slice(0, i) + html.slice(j);   // le code de l'atelier, sans la bibliothèque
const noms = [...new Set([...code.matchAll(/THREE\.([A-Z][A-Za-z0-9_]*)/g)].map(m => m[1]))].sort();
const entree = `export { ${noms.concat('REVISION').join(', ')} } from 'three';`;
const res = buildSync({ stdin: { contents: entree, resolveDir: process.cwd() }, bundle: true, minify: true,
  format: 'iife', globalName: 'THREE', legalComments: 'none', write: false });
let lib = res.outputFiles[0].text.trim();
if (lib.includes('</script')) lib = lib.replaceAll('</script', '<\\/script');
const version = JSON.parse(readFileSync('node_modules/three/package.json', 'utf8')).version;
const entete = `/* three.js ${version} — sous-ensemble (${noms.length} classes) — licence MIT, © 2010-2026 three.js authors — https://threejs.org */\n`;
html = html.slice(0, i) + debut + entete + lib + '\n' + html.slice(j);
writeFileSync(FICHIER, html);
console.log(`three.js ${version} intégré : ${noms.length} classes, ${(lib.length / 1024).toFixed(0)} Ko`);
