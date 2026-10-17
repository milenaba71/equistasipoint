# zxing-wasm (lettore di codici a barre)

Usato da `js/scan.js` per leggere con la fotocamera il codice a barre stampato sul retro del dispositivo
(contiene il numero di serie, es. `EQX25001801`, formato Code 128). Tutto avviene sul telefono: le immagini non vengono inviate.

- `zxing-reader.js`: pacchetto npm `zxing-wasm` 3.1.4, file `dist/iife/reader/index.js` (espone `window.ZXingWASM`).
- `zxing_reader.wasm`: stesso pacchetto, file `dist/reader/zxing_reader.wasm`.

Licenza MIT (vedi `LICENSE`). Basato su zxing-cpp (Apache 2.0).
