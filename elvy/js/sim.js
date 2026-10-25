/* Elvy · simulatore di segnali dell'accelerometro.
   Genera campioni realistici (frequenza irregolare, rumore, telefono girato a caso) per:
   - i test automatici degli algoritmi (elvy/test);
   - la modalità "prova" dell'app su computer, dove il sensore di movimento non c'è. */
(function (root) {
  const G = 9.81;

  // generatore pseudo-casuale riproducibile
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function gauss(r) { const u = Math.max(1e-9, r()); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }

  // Matrice di rotazione: colonne = assi del telefono espressi nel mondo (z mondo = alto)
  function rotation(yaw, pitch, roll) {
    const cy = Math.cos(yaw); const sy = Math.sin(yaw); const cp = Math.cos(pitch); const sp = Math.sin(pitch); const cr = Math.cos(roll); const sr = Math.sin(roll);
    return [
      [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
      [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
      [-sp, cp * sr, cp * cr],
    ];
  }
  // Telefono orizzontale in cintura, schermo verso dietro: x telefono = alto, y = sinistra, z = dietro
  // (persona che guarda verso +x del mondo, sinistra = +y del mondo)
  const BELT = [[0, 0, -1], [0, 1, 0], [1, 0, 0]];

  /* Campiona una funzione accel(t) → [ax, ay, az] (m/s², mondo, senza gravità) */
  function sample(accel, dur, opts = {}) {
    const r = rng(opts.seed || 7);
    const R = opts.R || rotation(r() * 6.28, (r() - 0.5) * 1.2, (r() - 0.5) * 1.2);
    const hz = opts.hz || 60;
    const noise = opts.noise != null ? opts.noise : 0.05;
    const sign = opts.platformSign || 1;
    const out = [];
    let t = 0;
    while (t <= dur) {
      const a = accel(t);
      const f = [a[0], a[1], a[2] + G]; // forza specifica misurata
      // nel sistema del telefono: Rᵀ · f
      const dev = [0, 1, 2].map((c) => R[0][c] * f[0] + R[1][c] * f[1] + R[2][c] * f[2]);
      out.push({ t: 1000 + t * 1000, x: sign * dev[0] + noise * gauss(r), y: sign * dev[1] + noise * gauss(r), z: sign * dev[2] + noise * gauss(r) });
      t += (1 / hz) * (0.85 + 0.3 * r());
    }
    return out;
  }

  // Impulso a mezzo seno di durata d e area A (m/s · velocità cambiata)
  const halfSine = (t, t0, d, peak) => (t >= t0 && t < t0 + d ? peak * Math.sin(Math.PI * (t - t0) / d) : 0);

  /* Salti in serie: elenco di { tc (contatto prima del volo), tf (volo) } dopo "start" s fermo.
     drop: altezza del gradino (m) per il drop jump (prima caduta libera). */
  function jumpSequence(list, opts = {}) {
    const start = opts.start || 1.5;
    const events = [];
    let t = start;
    if (opts.drop) {
      const td = Math.sqrt(2 * opts.drop / G);
      events.push({ type: 'fly', t0: t, d: td }); t += td;
    } else if (opts.countermovement !== false) {
      // contromovimento: scarico, poi spinta
      events.push({ type: 'cm', t0: t, d: 0.25 }); t += 0.25;
    }
    list.forEach((j, i) => {
      const tc = j.tc != null ? j.tc : 0.35;
      const vOut = G * j.tf / 2;
      const vIn = i === 0 && !opts.drop ? 0 : events.length && events[events.length - 1].type === 'fly' ? G * events[events.length - 1].d / 2 : 0;
      events.push({ type: 'push', t0: t, d: tc, dv: vOut + vIn }); t += tc;
      events.push({ type: 'fly', t0: t, d: j.tf }); t += j.tf;
    });
    const vLast = G * events[events.length - 1].d / 2;
    events.push({ type: 'land', t0: t, d: 0.25, dv: vLast }); t += 0.25;
    const dur = t + (opts.after || 1.2);
    const accel = (tt) => {
      let az = 0;
      for (const e of events) {
        if (tt < e.t0 || tt >= e.t0 + e.d) continue;
        if (e.type === 'fly') az = -G;
        else if (e.type === 'cm') az = -4 * Math.sin(2 * Math.PI * (tt - e.t0) / e.d);
        else az = halfSine(tt, e.t0, e.d, (e.dv * Math.PI) / (2 * e.d));
      }
      return [0, 0, az];
    };
    return sample(accel, dur, opts);
  }

  /* Oscillazione in piedi: due sinusoidi per asse, ampiezze A e B in cm (spostamento) */
  function swaySignal(A, B, dur, opts = {}) {
    const fa = opts.fa || 0.45; const fb = opts.fb || 0.62;
    const accel = (t) => {
      let ax = -Math.pow(2 * Math.PI * fa, 2) * (A / 100) * Math.sin(2 * Math.PI * fa * t);
      const ay = -Math.pow(2 * Math.PI * fb, 2) * (B / 100) * Math.sin(2 * Math.PI * fb * t + 1);
      if (opts.fallAt && t > opts.fallAt && t < opts.fallAt + 0.3) ax += 12;
      return [ax, ay, 0];
    };
    return sample(accel, dur, opts);
  }

  /* Corsa: cadenza (passi/min), contatto (s), contatto destro/sinistro diversi se richiesto */
  function runSignal(cadence, tc, dur, opts = {}) {
    const T = 60 / cadence;
    const tcR = opts.tcRight || tc; const tcL = opts.tcLeft || tc;
    const accel = (t) => {
      const k = Math.floor(t / T); const ph = t - k * T;
      const right = k % 2 === 0;
      const c = right ? tcR : tcL;
      let az; let ay = 0; let ax = 0;
      if (ph < c) {
        // appoggio: impulso che restituisce la velocità persa in volo (media = g su tutto il passo)
        const peak = (G * T * Math.PI) / (2 * c);
        az = peak * Math.sin(Math.PI * ph / c) - G;
        ay = (right ? 1 : -1) * 3 * Math.sin(Math.PI * ph / c); // appoggio destro: spinta verso sinistra (+y)
        ax = 2 * Math.sin(2 * Math.PI * ph / c);
      } else az = -G;
      return [ax, ay, az];
    };
    return sample(accel, dur, Object.assign({ R: BELT }, opts));
  }

  /* Plank: fermo con piccolo tremore, poi il bacino cede di "drop" gradi a "breakAt" s */
  function plankSignal(dur, opts = {}) {
    const r = rng(opts.seed || 3);
    const base = rotation(0.3, 1.5, 0.1);
    const out = [];
    let t = 0;
    while (t <= dur) {
      const tilt = opts.breakAt && t > opts.breakAt ? Math.min(1, (t - opts.breakAt) / 0.8) * (opts.drop || 20) * Math.PI / 180 : 0;
      const R = rotation(0.3, 1.5 - tilt, 0.1);
      const shake = opts.shake || 0.15;
      const f = [shake * gauss(r), shake * gauss(r), G + shake * gauss(r)];
      const dev = [0, 1, 2].map((c) => R[0][c] * f[0] + R[1][c] * f[1] + R[2][c] * f[2]);
      out.push({ t: 1000 + t * 1000, x: dev[0], y: dev[1], z: dev[2] });
      t += (1 / 60) * (0.85 + 0.3 * r());
    }
    void base;
    return out;
  }

  /* Mobilità: il telefono ruota di "deg" gradi e resta fermo */
  function tiltSignal(deg, dur, opts = {}) {
    const r = rng(opts.seed || 5);
    const out = [];
    let t = 0;
    const ref = rotation(0, 0.05, 0);
    while (t <= dur) {
      const k = Math.min(1, Math.max(0, (t - 0.8) / 1.2));
      const a = (deg * k * Math.PI) / 180;
      const R = rotation(0, 0.05 + a, 0);
      const f = [0, 0, G];
      const dev = [0, 1, 2].map((c) => R[0][c] * f[0] + R[1][c] * f[1] + R[2][c] * f[2] + 0.03 * gauss(r));
      out.push({ t: 1000 + t * 1000, x: dev[0], y: dev[1], z: dev[2] });
      t += (1 / 60) * (0.85 + 0.3 * r());
    }
    const g0 = [0, 1, 2].map((c) => ref[2][c] * G);
    return { samples: out, ref: g0 };
  }

  /* Battito dalla fotocamera: luminosità del rosso a ~30 fotogrammi al secondo.
     hr = battiti al minuto, rmssd = variabilità desiderata (ms) */
  function ppgSignal(hr, rmssd, dur, opts = {}) {
    const r = rng(opts.seed || 9);
    const base = 60000 / hr; const beats = [0];
    // RR con alternanza battito-battito (dà l'RMSSD voluto) e un'onda lenta del respiro
    let sign = 1;
    while (beats[beats.length - 1] < dur * 1000 + 2000) {
      const k = beats.length;
      const rr = base + sign * rmssd * 0.5 + 25 * Math.sin(k * 0.6) * (opts.resp || 1) + gauss(r) * rmssd * 0.15;
      sign = -sign; beats.push(beats[beats.length - 1] + rr);
    }
    const out = []; let t = 0; let j = 0;
    while (t <= dur * 1000) {
      while (j < beats.length - 2 && beats[j + 1] <= t) j++;
      const ph = (t - beats[j]) / (beats[j + 1] - beats[j]);
      // onda del polso: salita rapida, discesa lenta, piccola onda dicrota
      const pulse = Math.exp(-((ph - 0.12) ** 2) / 0.004) + 0.35 * Math.exp(-((ph - 0.42) ** 2) / 0.006) + 0.5 * Math.exp(-ph * 3);
      const v = 180 - 2.5 * pulse + 4 * Math.sin(t / 7000) + (opts.noise != null ? opts.noise : 0.12) * gauss(r);
      out.push({ t: 1000 + t, v });
      t += (1000 / 30) * (0.9 + 0.2 * r());
    }
    return { frames: out, rr: beats.slice(1).map((b, i) => b - beats[i]) };
  }

  /* Swing: picchi di velocità di rotazione (°/s) ogni ~2 s, telefono in mano */
  function swingSignal(peaks, opts = {}) {
    const r = rng(opts.seed || 4); const out = []; let t = 0; const dur = peaks.length * 2 + 1.5;
    while (t <= dur) {
      let w = 0;
      peaks.forEach((pk, i) => { const c = 1 + i * 2; w += pk * Math.exp(-((t - c) ** 2) / (2 * 0.06 ** 2)); });
      const g = [0, 0, 9.81];
      out.push({ t: 1000 + t * 1000, x: g[0] + 0.3 * gauss(r), y: g[1] + 0.3 * gauss(r), z: g[2] + 0.3 * gauss(r), rx: w * 0.3 + 2 * gauss(r), ry: w * 0.2 + 2 * gauss(r), rz: w * 0.93 + 2 * gauss(r) });
      t += (1 / 100) * (0.9 + 0.2 * r());
    }
    return out;
  }

  /* GPS: corsa a velocità costante (m/s) su un anello di pista, con errore di qualche metro e qualche salto */
  function gpsTrack(speed, dur, opts = {}) {
    const r = rng(opts.seed || 2); const out = []; const lat0 = 45.4642; const lon0 = 9.19;
    const R = 400 / (2 * Math.PI); const mLat = 111320; const mLon = 111320 * Math.cos(lat0 * Math.PI / 180);
    for (let t = 0; t <= dur; t += 1) {
      const a = (speed * t) / R; const err = opts.err != null ? opts.err : 2.5;
      let x = R * Math.cos(a) + err * gauss(r); let y = R * Math.sin(a) + err * gauss(r);
      if (opts.jumps && r() < 0.01) { x += 80; y += 60; } // salto del GPS
      out.push({ t: 1000 + t * 1000, lat: lat0 + y / mLat, lon: lon0 + x / mLon, acc: 5 + 3 * r() });
    }
    return out;
  }

  const API = { ppgSignal, swingSignal, gpsTrack, rng, rotation, BELT, sample, jumpSequence, swaySignal, runSignal, plankSignal, tiltSignal };
  root.ElvySim = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
