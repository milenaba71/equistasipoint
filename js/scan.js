/* Lettura del numero di serie con la fotocamera: si inquadra il retro del dispositivo e si legge il codice
   a barre (Code 128) con zxing-wasm, sul telefono. Nessuna immagine viene inviata o salvata.
   Uso: EqScan.open({ container, torch, accept }) → Promise con il testo letto, o null se annullato.
   - container: elemento in cui mostrare la fotocamera (es. la finestra del dispositivo disegnato);
     senza container la fotocamera si apre a tutto schermo.
   - torch: pulsante (facoltativo) per accendere la luce, mostrato solo se il telefono la supporta.
   EqScan.stop() chiude la fotocamera. */
(function () {
  const BASE = 'js/vendor/zxing/';
  const FORMATS = ['Code128', 'Code39', 'Code93', 'DataMatrix', 'QRCode'];
  let lib = null;
  let current = null;

  function loadLib() {
    if (lib) return lib;
    lib = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = BASE + 'zxing-reader.js';
      s.onload = () => {
        const Z = window.ZXingWASM;
        if (!Z) { reject(new Error('lib')); return; }
        Z.prepareZXingModule({
          overrides: { locateFile: (p, prefix) => (p.endsWith('.wasm') ? new URL(BASE + p, location.href).href : prefix + p) },
          fireImmediately: true,
        });
        resolve(Z);
      };
      s.onerror = () => reject(new Error('lib'));
      document.head.appendChild(s);
    });
    lib.catch(() => { lib = null; });
    return lib;
  }

  function open(opts) {
    opts = opts || {};
    const accept = opts.accept || (() => true);
    if (current) current(null);
    return new Promise((resolve, reject) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { reject(new Error('unsupported')); return; }

      const inline = !!opts.container;
      const el = document.createElement('div');
      let torchBtn = opts.torch || null;
      if (inline) {
        el.className = 'scan-inline';
        el.innerHTML = '<video playsinline muted autoplay></video><span class="scan-line" aria-hidden="true"></span>';
        opts.container.appendChild(el);
      } else {
        el.className = 'scan';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-label', T('Inquadra il numero di serie'));
        el.innerHTML =
          '<video class="scan-video" playsinline muted autoplay></video>' +
          '<div class="scan-frame" aria-hidden="true"><span></span></div>' +
          '<p class="scan-hint">' + T('Inquadra il <b>codice a barre</b> sul retro del dispositivo, da vicino e ben illuminato.') + '</p>' +
          '<div class="scan-bar"><button type="button" class="btn scan-torch" hidden>' + T('Luce') + '</button>' +
          '<button type="button" class="btn scan-cancel">' + T('Annulla') + '</button></div>';
        document.body.appendChild(el);
        torchBtn = el.querySelector('.scan-torch');
        el.querySelector('.scan-cancel').addEventListener('click', () => close(null));
      }
      const video = el.querySelector('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let stream = null; let timer = null; let busy = false; let done = false; let torch = false;
      const onTorch = () => {
        const track = stream && stream.getVideoTracks()[0];
        if (!track) return;
        torch = !torch;
        track.applyConstraints({ advanced: [{ torch }] }).catch(() => {});
        torchBtn.classList.toggle('on', torch);
      };

      function close(result, err) {
        if (done) return;
        done = true;
        current = null;
        clearTimeout(timer);
        if (stream) stream.getTracks().forEach((t) => t.stop());
        if (torchBtn) { torchBtn.removeEventListener('click', onTorch); torchBtn.classList.remove('on'); if (inline) torchBtn.hidden = true; }
        el.remove();
        document.removeEventListener('visibilitychange', onHide);
        if (err) reject(err); else resolve(result);
      }
      current = close;
      const onHide = () => { if (document.hidden) close(null); };
      document.addEventListener('visibilitychange', onHide);

      async function tick(Z) {
        if (done) return;
        if (!busy && video.readyState >= 2 && video.videoWidth) {
          busy = true;
          try {
            // zona centrale dell'immagine, ridotta a max 1280 px di larghezza
            const vw = video.videoWidth; const vh = video.videoHeight;
            const cw = Math.round(vw * 0.9); const ch = Math.round(vh * 0.7);
            const k = Math.min(1, 1280 / cw);
            canvas.width = Math.round(cw * k); canvas.height = Math.round(ch * k);
            ctx.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const res = await Z.readBarcodes(img, { formats: FORMATS, tryHarder: true, tryRotate: true, maxNumberOfSymbols: 1 });
            const hit = res.find((r) => r.isValid && r.text && accept(r.text));
            if (hit) {
              if (navigator.vibrate) navigator.vibrate(60);
              close(hit.text);
              return;
            }
          } catch (e) { /* fotogramma non leggibile: si riprova */ }
          busy = false;
        }
        timer = setTimeout(() => tick(Z), 180);
      }

      const libReady = loadLib();
      libReady.catch(() => {});
      navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } }).then((s) => {
        stream = s;
        if (done) { s.getTracks().forEach((t) => t.stop()); return null; }
        video.srcObject = s;
        const track = s.getVideoTracks()[0];
        const caps = track && track.getCapabilities ? track.getCapabilities() : {};
        if (caps.focusMode && caps.focusMode.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
        if (caps.torch && torchBtn) { torchBtn.hidden = false; torchBtn.addEventListener('click', onTorch); }
        video.play().catch(() => {});
        return libReady;
      }).then((Z) => { if (Z) tick(Z); }).catch((e) => {
        const name = e && e.name;
        close(null, new Error(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : (e && e.message === 'lib' ? 'lib' : 'camera')));
      });
    });
  }

  window.EqScan = { open, stop: () => { if (current) current(null); }, _loadLib: loadLib };
})();
