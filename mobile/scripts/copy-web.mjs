// Copia i file della web app (cartella principale del repository) in mobile/www,
// la cartella che Capacitor impacchetta nell'app per iPhone e Android.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const www = join(root, 'mobile', 'www');
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest', 'css', 'js', 'img', 'media']) {
  cpSync(join(root, f), join(www, f), { recursive: true });
}
console.log('Web app copiata in', www);
