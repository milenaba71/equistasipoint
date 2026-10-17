/* Lettura del numero di serie con la fotocamera: si inquadra il retro del dispositivo e si legge il codice
   a barre (Code 128) con zxing-wasm, sul telefono. Nessuna immagine viene inviata o salvata.
   Uso: EqScan.open({ container, torch, accept }) → Promise con il testo letto, o null se annullato.
   - container: elemento in cui mostrare la fotocamera (es. la finestra del dispositivo disegnato);
     senza container la fotocamera si apre a tutto schermo.
   - torch: pulsante (facoltativo) per accendere la luce, mostrato solo se il telefono la supporta.
   EqScan.stop() chiude la fotocamera. */
(function () {
  const BASE = 'js/vendor/zxing/';
  // seriali con lettere e numeri (es. EQX25001801) o solo numeri: Code 128/39/93, ITF, Codabar, EAN/UPC, DataMatrix, QR
  const FORMATS = ['Code128', 'Code39', 'Code93', 'ITF', 'Codabar', 'EAN13', 'EAN8', 'UPCA', 'UPCE', 'DataMatrix', 'QRCode'];
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

  // Nuvola di particelle nella finestra mentre si legge (stile abbinamento Apple Watch):
  // gira finché la lettura è in corso, poi converge al centro con un lampo.
  const COLS = [[127, 182, 232], [72, 140, 197], [250, 220, 0], [255, 255, 255]];
  function particles(cv) {
    const ctx = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 200; const h = cv.clientHeight || 90;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.scale(dpr, dpr);
    let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const N = 520; const P = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2; const r = Math.sqrt(1 - y * y); const th = i * 2.399963; const j = 0.85 + rnd() * 0.3;
      P.push({ x: Math.cos(th) * r * j, y: y * j, z: Math.sin(th) * r * j, c: rnd(), s: 0.6 + rnd() * 1.2, ph: rnd() * 6.28 });
    }
    const t0 = performance.now(); let raf = 0; let col = null; // col: {start, ms, done}
    function frame(now) {
      const t = (now - t0) / 1000; let k = 1; let flash = 0;
      if (col) {
        const q = Math.min(1, (now - col.start) / col.ms);
        k = 1 - q * q * (3 - 2 * q); flash = q > 0.75 ? (q - 0.75) / 0.25 : 0;
        if (q >= 1 && col.done) { const d = col.done; col.done = null; d(); }
      }
      const R = Math.min(w, h) * 0.46 * Math.min(1, t * 2.5); const cx = w / 2, cy = h / 2;
      const a = t * 1.1 * (1 + (1 - k) * 4), b = 0.35 + Math.sin(t * 0.6) * 0.25;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N; i++) {
        const p = P[i]; const wv = 1 + 0.1 * Math.sin(p.y * 6 + t * 4 + p.ph);
        const x = p.x * wv, y = p.y * wv, z = p.z * wv;
        const x1 = x * ca + z * sa, z1 = -x * sa + z * ca; const y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
        const pz = 2.6 + z2; const px = cx + x1 * R * k * 2.2 / pz * 1.6, py = cy + y2 * R * k * 2.2 / pz;
        const dep = Math.min(1, Math.max(0, (1.6 - z2) / 2.4)); const c = COLS[p.c < .55 ? 0 : p.c < .8 ? 1 : p.c < .95 ? 2 : 3];
        const al = (0.3 + 0.7 * dep) * (0.6 + 0.4 * Math.sin(t * 6 + p.ph)); const sz = p.s * (0.45 + dep * 0.75);
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (al * 0.25).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(px, py, sz * 1.5, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.min(1, al * 1.2).toFixed(3) + ')';
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
      if (flash > 0) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
        g.addColorStop(0, 'rgba(255,255,255,' + flash + ')'); g.addColorStop(1, 'rgba(160,200,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return {
      collapse: (ms) => new Promise((res) => { col = { start: performance.now(), ms, done: res }; }),
      stop: () => cancelAnimationFrame(raf),
    };
  }
  const calm = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        el.innerHTML = '<video playsinline muted autoplay></video>' + (calm() ? '<span class="scan-line" aria-hidden="true"></span>' : '<canvas class="scan-fx" aria-hidden="true"></canvas>');
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
      const fxc = el.querySelector('.scan-fx'); const fx = fxc ? particles(fxc) : null;
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
        if (fx) fx.stop();
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
              if (fx) fx.collapse(700).then(() => close(hit.text)); else close(hit.text);
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
