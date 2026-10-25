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

  /* ───────── Schermo acceso ───────── */
  let lock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
      if (!on && lock) { await lock.release(); lock = null; }
    } catch (e) { /* non supportato */ }
  }

  window.ElvySensors = {
    isIOS, permission, recorder, probe, beep, say, stopVoice, keepAwake, unlockAudio,
    voiceOn: () => voiceOn,
    setVoice(v) { voiceOn = !!v; },
    // segno degli assi: su iPhone l'accelerazione con gravità ha il verso opposto alle specifiche
    platformSign: isIOS ? -1 : 1,
  };
})();
