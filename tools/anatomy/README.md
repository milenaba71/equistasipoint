# Tavole anatomiche 3D

Le immagini in `img/anatomy/` sono render 3D generati con Blender dal modello
**Z-Anatomy** (basato su **BodyParts3D**). Licenza delle immagini: **CC BY-SA 4.0**.

Attribuzione richiesta (presente nella pagina Informazioni dell'app):
- "Z-Anatomy – The libre 3D atlas of anatomy – CC BY-SA 4.0" — https://github.com/Z-Anatomy
- "BodyParts3D – The Database Center for Life Science – CC BY-SA 2.1 Japan"

Le immagini derivate restano sotto CC BY-SA 4.0. Il codice dell'app, i testi e il marchio Equistasi non sono coperti da questa licenza.

## Rigenerare le tavole
1. `pip install bpy` (Blender come modulo Python, testato con 5.2) e scarica `Z-Anatomy.zip` da
   https://github.com/Z-Anatomy/Models-of-human-anatomy, decomprimilo.
2. `python za_clean.py` → crea `clean.blend` con muscoli e ossa già calcolati (modello alleggerito).
3. Prepara `jobs.json` da `muscles_render.json` (per ogni muscolo: parti da evidenziare `hl` e
   muscoli da nascondere per le viste in sezione `hide`; nelle viste posteriori si usano i nomi `.l`).
4. `python za_batch.py -- jobs.json renders 860 32` → PNG 860×1860 con sfondo trasparente.
5. Converti in WebP (qualità 80) in `img/anatomy/` con il nome `<muscolo>-<vista>.webp`
   (`base-front.webp`, `base-back.webp` per il corpo intero).

Stile: muscoli `#9c3a24`, muscolo evidenziato `#e8501a`, corpo "spento" `#b8a69c`, tendini `#eee4d6`;
telecamera ortografica (scala 1.86 m, centro a 0.83 m), Cycles, AgX Medium High Contrast.
Le coordinate di X e zone in `js/data.js` sono nel sistema 200 × 432.6 di queste immagini.
