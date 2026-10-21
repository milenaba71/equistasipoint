/* Lettura del numero di serie con la fotocamera: si inquadra il retro del dispositivo e si legge il codice
   a barre (Code 128) con zxing-wasm, sul telefono. Nessuna immagine viene inviata o salvata.
   Uso: EqScan.open({ container, torch, accept }) → Promise con il testo letto, o null se annullato.
   - container: elemento in cui mostrare la fotocamera (es. la finestra del dispositivo disegnato);
     senza container la fotocamera si apre a tutto schermo.
   - torch: pulsante (facoltativo) per accendere la luce, mostrato solo se il telefono la supporta.
   - guide: elemento cornice (facoltativo) in cui mettere il codice a barre: quella zona viene letta a piena risoluzione.
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
  // Trova le barre in un'immagine: zona dove la luminosità cambia molto in orizzontale e poco in verticale.
  // Serve perché il lettore sbaglia se ai lati delle barre ci sono il bordo dell'etichetta o la plastica:
  // ritagliando stretto attorno alle barre il bordo dell'immagine fa da margine bianco.
  // Restituisce { x, y, w, h } nelle coordinate dell'immagine, o null.
  function locate(img) {
    const W = img.width, H = img.height, d = img.data;
    const k = Math.min(1, 320 / W); const w = Math.max(8, Math.round(W * k)); const h = Math.max(8, Math.round(H * k));
    const g = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const sy = Math.min(H - 1, Math.floor(y / k));
      for (let x = 0; x < w; x++) { const i = (sy * W + Math.min(W - 1, Math.floor(x / k))) * 4; g[y * w + x] = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; }
    }
    // gx − gy, poi media su una finestra (immagine integrale)
    const I = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        const v = g[y * w + x];
        const gx = Math.abs((x + 1 < w ? g[y * w + x + 1] : v) - v); const gy = Math.abs((y + 1 < h ? g[(y + 1) * w + x] : v) - v);
        row += gx - gy; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row;
      }
    }
    const rx = Math.max(3, Math.round(w * 0.02)); const ry = Math.max(3, Math.round(h * 0.02));
    const sc = new Float32Array(w * h); let max = 0;
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - ry), y1 = Math.min(h, y + ry + 1);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - rx), x1 = Math.min(w, x + rx + 1);
        const v = (I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / ((y1 - y0) * (x1 - x0));
        sc[y * w + x] = v; if (v > max) max = v;
      }
    }
    const th = Math.max(max * 0.45, 6);
    if (max <= 6) return null;
    // zona più grande sopra la soglia
    const lab = new Int32Array(w * h); const q = new Int32Array(w * h); let best = null;
    for (let i = 0, n = 0; i < w * h; i++) {
      if (sc[i] < th || lab[i]) continue;
      n++; let qh = 0, qt = 0; q[qt++] = i; lab[i] = n;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, cnt = 0;
      while (qh < qt) {
        const j = q[qh++]; const x = j % w, y = (j / w) | 0; cnt++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        const nb = [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1];
        for (const m of nb) if (m >= 0 && !lab[m] && sc[m] >= th) { lab[m] = n; q[qt++] = m; }
      }
      if (!best || cnt > best.cnt) best = { cnt, x0, y0, x1, y1 };
    }
    if (!best || best.x1 - best.x0 < 6) return null;
    const bw = (best.x1 - best.x0 + 1) / k; const bh = (best.y1 - best.y0 + 1) / k;
    const x = Math.max(0, best.x0 / k - bw * 0.04); const y = Math.max(0, best.y0 / k);
    return { x: Math.round(x), y: Math.round(y), w: Math.round(Math.min(W - x, bw * 1.08)), h: Math.round(Math.min(H - y, bh)) };
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
        el.innerHTML = '<video playsinline muted autoplay></video>' + (opts.fx === false ? '' : calm() ? '<span class="scan-line" aria-hidden="true"></span>' : '<canvas class="scan-fx" aria-hidden="true"></canvas>');
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
        // freeze: lascia nel contenitore l'ultimo fotogramma (per le animazioni che seguono la lettura)
        if (result && opts.freeze && inline && video.videoWidth) {
          try { const fc = document.createElement('canvas'); fc.className = 'scan-freeze'; fc.width = video.videoWidth; fc.height = video.videoHeight; fc.getContext('2d').drawImage(video, 0, 0); opts.container.appendChild(fc); } catch (e) { /* niente fotogramma */ }
        }
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

      // Zona dell'elemento "node" (cornice o finestra visibile) nelle coordinate del video, con margine "pad".
      function regionOf(node, pad) {
        const vw = video.videoWidth, vh = video.videoHeight;
        if (!node || !vw) return null;
        const vr = video.getBoundingClientRect(); const g = node.getBoundingClientRect();
        if (!vr.width || !g.width) return null;
        const s = Math.max(vr.width / vw, vr.height / vh); // object-fit: cover
        const ox = vr.left + (vr.width - vw * s) / 2; const oy = vr.top + (vr.height - vh * s) / 2;
        let w = g.width / s * (1 + 2 * pad); let h = g.height / s * (1 + 2 * pad);
        let x = (g.left - ox) / s - g.width / s * pad; let y = (g.top - oy) / s - g.height / s * pad;
        x = Math.max(0, x); y = Math.max(0, y); w = Math.min(vw - x, w); h = Math.min(vh - y, h);
        return w > 24 && h > 24 ? { x, y, w, h } : null;
      }
      function grab(r, maxW, up) {
        const k = Math.min(maxW / r.w, up || 1);
        canvas.width = Math.max(1, Math.round(r.w * k)); canvas.height = Math.max(1, Math.round(r.h * k));
        ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
      // A turno: barre trovate nella cornice (ritaglio stretto), stesse barre ingrandite, cornice intera, zona centrale
      const guide = opts.guide || (inline ? opts.container : el.querySelector('.scan-frame'));
      let turn = 0;
      function candidate() {
        const vw = video.videoWidth; const vh = video.videoHeight;
        const step = turn++ % 4;
        const r = regionOf(guide, 0.12);
        if (r && step < 2) {
          const img = grab(r, 1600);
          const b = locate(img);
          if (!b) return img;
          const up = step === 1 || b.w < 360 ? 2 : 1;
          if (up === 1) return ctx.getImageData(b.x, b.y, b.w, b.h);
          const sx = r.w / img.width;
          return grab({ x: r.x + b.x * sx, y: r.y + b.y * sx, w: b.w * sx, h: b.h * sx }, 1600, up);
        }
        if (r && step === 2) return grab(r, 1280);
        // zona centrale dell'immagine, ridotta a max 1280 px di larghezza (come prima)
        const cw = Math.round(vw * 0.9); const ch = Math.round(vh * 0.7);
        return grab({ x: (vw - cw) / 2, y: (vh - ch) / 2, w: cw, h: ch }, 1280);
      }

      async function tick(Z) {
        if (done) return;
        if (!busy && video.readyState >= 2 && video.videoWidth) {
          busy = true;
          try {
            const img = candidate();
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
        timer = setTimeout(() => tick(Z), 120);
      }

      const libReady = loadLib();
      libReady.catch(() => {});
      navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1440 } } }).then((s) => {
        stream = s;
        if (done) { s.getTracks().forEach((t) => t.stop()); return null; }
        video.srcObject = s;
        const track = s.getVideoTracks()[0];
        const caps = track && track.getCapabilities ? track.getCapabilities() : {};
        if (caps.focusMode && caps.focusMode.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
        // un po' di zoom: il telefono si tiene più lontano, dove mette a fuoco, e il codice resta grande
        if (caps.zoom && caps.zoom.max >= 1.8) track.applyConstraints({ advanced: [{ zoom: Math.min(2, caps.zoom.max) }] }).catch(() => {});
        if (caps.torch && torchBtn) { torchBtn.hidden = false; torchBtn.addEventListener('click', onTorch); }
        video.play().catch(() => {});
        return libReady;
      }).then((Z) => { if (Z) tick(Z); }).catch((e) => {
        const name = e && e.name;
        close(null, new Error(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : (e && e.message === 'lib' ? 'lib' : 'camera')));
      });
    });
  }

  window.EqScan = { open, stop: () => { if (current) current(null); }, _loadLib: loadLib, _locate: locate };
})();
