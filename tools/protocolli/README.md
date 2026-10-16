# Protocolli per i pazienti (PDF)

I PDF in `protocolli/` sono generati da `gen.py` (testi IT/EN) con il foglio di stile `template.css`.

1. Copia accanto a `gen.py`: `fonts.css` + `fonts/` (Open Sans), `logo.png`, `applicazione.jpg`, `qr.png`
   (QR di https://app.equistasi.com) e le figure `fig_*.jpg` (tavole 3D di `img/anatomy` con i punti numerati).
2. `python3 gen.py` crea `<protocollo>-<lingua>.html`.
3. Converti in PDF A4 con Chromium (Playwright `page.pdf({format:'A4', printBackground:true, margin:0})`).
4. Controlla che ogni pagina contenga il piè di pagina ("Rev. …"): se manca, il contenuto è troppo lungo.

I contenuti seguono i protocolli originali Equistasi (tempi di applicazione inclusi); la nota
"rivolta ai professionisti sanitari" è sostituita dall'avviso per il paziente.

La mappa dei dermatomeri (`fig_dermatomi.jpg`) è disegnata da `dermmap.py` sulle tavole 3D dell'app (nessuna immagine di terzi).
