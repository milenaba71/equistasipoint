/* Elvy · sensori, voce, bip e schermo sempre acceso durante i test */
(function () {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  /* ───────── Permesso e registrazione dell'accelerometro ───────── */
  async function permission() {
    if (typeof DeviceMotionEvent === 'undefined') return false;
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try { return (await DeviceMotionEvent.requestPermission()) === 'granted'; } catch (e) { return false; }
    }
    return true;
  }

  // Registratore: raccoglie { t, x, y, z } (accelerazione con gravità) finché non viene fermato
  function recorder() {
    const samples = [];
    let on = false;
    const listeners = [];
    const h = (e) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      const s = { t: performance.now(), x: a.x, y: a.y, z: a.z };
      // giroscopio (°/s): rotationRate alpha = asse z, beta = asse x, gamma = asse y
      const r = e.rotationRate;
      if (r && r.alpha != null) { s.rx = r.beta; s.ry = r.gamma; s.rz = r.alpha; }
      samples.push(s);
      listeners.forEach((f) => f(s));
    };
    return {
      samples,
      start() { if (!on) { on = true; window.addEventListener('devicemotion', h); } },
      stop() { on = false; window.removeEventListener('devicemotion', h); return samples; },
      onSample(f) { listeners.push(f); },
      clear() { samples.length = 0; },
    };
  }

  // Controlla che arrivino davvero dati (sul computer l'evento non arriva o arriva vuoto)
  function probe(ms = 1200) {
    return new Promise((resolve) => {
      const r = recorder(); r.start();
      setTimeout(() => { const s = r.stop(); resolve({ ok: s.length > 5, hz: Math.round(window.ElvyAnalysis.sampleRate(s)) }); }, ms);
    });
  }

  /* ───────── Suoni e voce ───────── */
  let actx = null;
  function unlockAudio() {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { /* niente audio */ }
  }
  function beep(freq = 880, ms = 160, vol = 0.3) {
    try {
      unlockAudio();
      const o = actx.createOscillator(); const g = actx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(vol, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + ms / 1000);
      o.start(); o.stop(actx.currentTime + ms / 1000 + 0.02);
    } catch (e) { /* niente audio */ }
    if (navigator.vibrate) navigator.vibrate(Math.min(ms, 300));
  }
  let voiceOn = true;
  let itVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    itVoice = vs.find((v) => /^it/i.test(v.lang) && /female|alice|federica|elsa/i.test(v.name)) || vs.find((v) => /^it/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  // Il telefono è in cintura: la voce dice cosa fare. Anche la mascotte parla con questa voce.
  // o.onend: chiamata a fine frase (anche se la voce è spenta o non disponibile: subito)
  function say(text, o = {}) {
    const done = () => { if (o.onend) { const f = o.onend; o.onend = null; f(); } };
    if (!voiceOn || !('speechSynthesis' in window) || !text) { done(); return false; }
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/<[^>]+>/g, ''));
      u.lang = 'it-IT'; if (itVoice) u.voice = itVoice;
      u.rate = o.rate || 1.05; u.pitch = o.pitch || 1;
      u.onend = done; u.onerror = done;
      speechSynthesis.speak(u);
      return true;
    } catch (e) { done(); return false; }
  }
  const stopVoice = () => { try { speechSynthesis.cancel(); } catch (e) { /* niente voce */ } };

  /* ───────── Battito con la fotocamera: dito sull'obiettivo, flash acceso ───────── */
  // Restituisce { video, frames, finger(), torch, stop() }: frames = { t, v } con la luminosità media del rosso.
  async function ppgCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } });
    const track = stream.getVideoTracks()[0];
    let torch = false;
    try {
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      if (caps.torch) { await track.applyConstraints({ advanced: [{ torch: true }] }); torch = true; }
    } catch (e) { /* luce non disponibile (es. iPhone dal browser) */ }
    const video = document.createElement('video'); video.playsInline = true; video.muted = true; video.srcObject = stream;
    await video.play().catch(() => {});
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const frames = []; let rgb = [0, 0, 0]; let on = true;
    const grab = () => {
      if (!on) return;
      if (video.videoWidth) {
        // zona centrale dell'immagine, ridotta a 32×32 punti
        const w = video.videoWidth; const h = video.videoHeight; const c = Math.min(w, h) * 0.5;
        ctx.drawImage(video, (w - c) / 2, (h - c) / 2, c, c, 0, 0, 32, 32);
        const d = ctx.getImageData(0, 0, 32, 32).data; let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4; rgb = [r / n, g / n, b / n];
        frames.push({ t: performance.now(), v: rgb[0] });
      }
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(grab); else requestAnimationFrame(grab);
    };
    grab();
    return {
      video, frames, torch,
      // dito sull'obiettivo: immagine rossa e luminosa, quasi senza verde e blu
      finger: () => rgb[0] > 60 && rgb[0] > rgb[1] * 1.8 && rgb[0] > rgb[2] * 1.8,
      level: () => rgb,
      stop() { on = false; try { if (torch) track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {}); } catch (e) { /* */ } stream.getTracks().forEach((t) => t.stop()); },
    };
  }

  /* ───────── GPS del telefono ───────── */
  function gps() {
    const points = []; let id = null; let last = null; const subs = [];
    return {
      points,
      start() {
        if (!('geolocation' in navigator)) return false;
        id = navigator.geolocation.watchPosition((p) => {
          last = { t: performance.now(), lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, speed: p.coords.speed };
          points.push(last); subs.forEach((f) => f(last));
        }, () => {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
        return true;
      },
      stop() { if (id != null) navigator.geolocation.clearWatch(id); id = null; return points; },
      last: () => last,
      on(f) { subs.push(f); },
    };
  }

  /* ───────── Fascia cardio o orologio via Bluetooth (servizio standard Heart Rate) ───────── */
  // Funziona in Chrome/Edge su Android e computer, nel browser Bluefy su iPhone e nell'app Elvy (Bluetooth nativo).
  const heart = {
    device: null, bpm: null, at: 0, subs: [],
    supported: () => !!((window.ElvyNative && window.ElvyNative.ble) || (navigator.bluetooth && navigator.bluetooth.requestDevice)),
    name() { return this.device ? this.device.name || 'Sensore cardio' : null; },
    connected() { return !!(this.device && (this.device.native ? this.device.on : this.device.gatt && this.device.gatt.connected)); },
    async connect() {
      // nell'app per iPhone e Android: Bluetooth nativo (js/native.js)
      const N = window.ElvyNative && window.ElvyNative.ble;
      if (N) {
        const d = await N.connect((v) => this.parse(v), () => { if (this.device) this.device.on = false; this.bpm = null; this.emit(null); });
        this.device = { native: true, on: true, id: d.id, name: d.name };
        return d.name;
      }
      if (navigator.bluetooth.getAvailability && !(await navigator.bluetooth.getAvailability().catch(() => true))) {
        const e = new Error('Bluetooth spento o non disponibile su questo dispositivo'); e.name = 'NetworkError'; throw e;
      }
      const dev = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
      this.device = dev;
      dev.addEventListener('gattserverdisconnected', () => { this.bpm = null; this.emit(null); });
      const server = await dev.gatt.connect();
      const svc = await server.getPrimaryService('heart_rate');
      const ch = await svc.getCharacteristic('heart_rate_measurement');
      ch.addEventListener('characteristicvaluechanged', (ev) => this.parse(ev.target.value));
      await ch.startNotifications();
      return dev.name;
    },
    disconnect() {
      if (this.device && this.device.native) window.ElvyNative.ble.disconnect(this.device.id);
      else if (this.connected()) this.device.gatt.disconnect();
      this.device = null; this.bpm = null;
    },
    // formato standard: flag, battito (8 o 16 bit), energia (facoltativa), intervalli RR in 1/1024 s
    parse(dv) {
      const flags = dv.getUint8(0); let i = 1;
      const bpm = flags & 1 ? dv.getUint16(i, true) : dv.getUint8(i); i += flags & 1 ? 2 : 1;
      if (flags & 8) i += 2;
      const rr = [];
      if (flags & 16) for (; i + 1 < dv.byteLength; i += 2) rr.push((dv.getUint16(i, true) / 1024) * 1000);
      this.bpm = bpm; this.at = performance.now();
      this.emit({ t: this.at, bpm, rr });
    },
    emit(x) { this.subs.forEach((f) => f(x)); },
    on(f) { this.subs.push(f); return () => { this.subs = this.subs.filter((g) => g !== f); }; },
  };

  /* ───────── Schermo acceso ───────── */
  let lock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
      if (!on && lock) { await lock.release(); lock = null; }
    } catch (e) { /* non supportato */ }
  }

  window.ElvySensors = {
    isIOS, permission, recorder, probe, beep, say, stopVoice, keepAwake, unlockAudio, ppgCamera, gps, heart,
    voiceOn: () => voiceOn,
    setVoice(v) { voiceOn = !!v; },
    // segno degli assi: su iPhone l'accelerazione con gravità ha il verso opposto alle specifiche
    platformSign: isIOS ? -1 : 1,
  };
})();
