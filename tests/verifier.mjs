// Vérification automatique de l'atelier (à lancer avant chaque envoi sur GitHub).
//   npm i --no-save playwright-core      (Chrome ou Chromium doit être installé)
//   node tests/verifier.mjs [chemin/vers/chrome]
// Contrôles, sur 7 tailles d'écran (ordinateur, projecteur, tablettes, téléphones) :
//  - aucune erreur JavaScript et aucune requête réseau (fonctionnement hors ligne) ;
//  - la page ne déborde pas (pas de défilement horizontal) et la scène garde une hauteur utile ;
//  - chacun des 32 exemples se charge et se simule 3 s sans erreur.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const chrome = process.argv[2] || process.env.CHROME || '/usr/bin/google-chrome';
const url = pathToFileURL(resolve('index.html')).href;
const ECRANS = { ordinateur: [1440, 900], projecteur: [1280, 720], tabletteP: [820, 1180], tabletteL: [1180, 820],
  telephoneP: [390, 844], telephoneL: [844, 390], petitTel: [360, 640] };
const b = await chromium.launch({ executablePath: chrome, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let echecs = 0;
const ko = msg => { echecs++; console.log('  ✗ ' + msg); };
for (const [nom, [w, h]] of Object.entries(ECRANS)) {
  const mobile = w < 1000 || h < 600;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile });
  const p = await ctx.newPage(); const errs = [], reqs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) reqs.push(r.url()); });
  await p.goto(url); await p.waitForTimeout(800);
  const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, vh: document.querySelector('#view').clientHeight }));
  console.log(`${nom} (${w}×${h}) : hauteur de scène ${m.vh} px`);
  if (m.sw > w + 1) ko(`débordement horizontal (${m.sw} px)`);
  if (m.vh < 150) ko('scène trop basse');
  const n = await p.evaluate(() => { let n = 0; setLevel(3);
    for (const [tab, L] of [['plan', SIT_PLAN], ['ressort', SIT_RES], ['proj', SIT_PROJ]]) { switchTab(tab);
      for (const s of L) { applySit(tab, s.id); for (let i = 0; i < 3000; i++) stepSim(DT); updateReadouts(); n++; } }
    switchTab('tri'); switchTab('defis'); switchTab('plan'); return n; });
  if (n !== 32) ko(`${n} exemples au lieu de 32`);
  if (errs.length) ko('erreurs : ' + errs.join(' | '));
  if (reqs.length) ko('requêtes réseau : ' + reqs.join(' | '));
  await ctx.close();
}
await b.close();
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est correct.');
process.exit(echecs ? 1 : 0);
