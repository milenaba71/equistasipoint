// Copia la web app Elvy (cartella elvy/) in mobile-elvy/www, la cartella che Capacitor
// impacchetta nell'app per iPhone e Android. I file condivisi con Equistasi Point
// (config, lettura del seriale, abbinamento e librerie in js/vendor) finiscono in www/js.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const elvy = join(root, 'elvy');
const www = join(root, 'mobile-elvy', 'www');
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest', 'css', 'js', 'img']) {
  cpSync(join(elvy, f), join(www, f), { recursive: true });
}
for (const f of ['config.js', 'scan.js', 'pair.js', 'vendor']) {
  cpSync(join(root, 'js', f), join(www, 'js', f), { recursive: true });
}
// nella web app i file condivisi sono in ../js/; nell'app sono accanto agli altri
const index = join(www, 'index.html');
writeFileSync(index, readFileSync(index, 'utf8').replaceAll('src="../js/', 'src="js/'));
// il link a Equistasi Point punta al sito, non alla cartella superiore
const app = join(www, 'js', 'app.js');
writeFileSync(app, readFileSync(app, 'utf8').replaceAll('href="../"', 'href="https://app.equistasi.com/"'));
console.log('Web app Elvy copiata in', www);
