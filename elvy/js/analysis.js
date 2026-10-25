/* Elvy · analisi dei segnali dell'accelerometro.
   Funzioni pure (nessun accesso al DOM): si usano nell'app e nei test di Node (elvy/test).
   Ingresso: campioni { t (ms), x, y, z } di accelerationIncludingGravity in m/s².
   Le misure non dipendono da come è girato il telefono: la verticale si ricava dalla gravità. */
(function (root) {
  const G = 9.81;
  const FS = 100; // frequenza di ricampionamento (Hz)

  /* ───────── Utilità ───────── */
  const sum = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
  const mean = (a) => (a.length ? sum(a) / a.length : 0);
  const median = (a) => {
    if (!a.length) return null;
    const s = a.slice().sort((p, q) => p - q); const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) * (v - m)))); };
  const quantile = (a, q) => { const s = a.slice().sort((p, r) => p - r); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => Math.hypot(a[0], a[1], a[2]);
  const unit = (a) => { const n = norm(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // Simmetria in %: 100 = uguali
  const symmetry = (a, b) => (a > 0 && b > 0 ? 100 * Math.min(a, b) / Math.max(a, b) : null);

  /* ───────── Ricampionamento a passo fisso ───────── */
  function resample(samples, fs = FS) {
    const s = samples.filter((p) => isFinite(p.t) && isFinite(p.x) && isFinite(p.y) && isFinite(p.z));
    if (s.length < 2) return { fs, t0: s.length ? s[0].t : 0, n: 0, x: [], y: [], z: [] };
    const t0 = s[0].t; const dur = s[s.length - 1].t - t0;
    const n = Math.floor(dur / 1000 * fs) + 1;
    const x = new Array(n); const y = new Array(n); const z = new Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 1000 / fs;
      while (j < s.length - 2 && s[j + 1].t < t) j++;
      const a = s[j]; const b = s[j + 1];
      const k = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
      x[i] = a.x + (b.x - a.x) * k; y[i] = a.y + (b.y - a.y) * k; z[i] = a.z + (b.z - a.z) * k;
    }
    return { fs, t0, n, x, y, z };
  }
  const magnitude = (sig) => sig.x.map((v, i) => Math.hypot(v, sig.y[i], sig.z[i]));
  const sampleRate = (samples) => {
    if (samples.length < 3) return 0;
    const d = []; for (let i = 1; i < samples.length; i++) d.push(samples[i].t - samples[i - 1].t);
    const m = median(d); return m > 0 ? 1000 / m : 0;
  };

  /* ───────── Filtri (Butterworth 2° ordine, avanti e indietro: nessun ritardo) ───────── */
  function biquad(type, fc, fs) {
    const w = 2 * Math.PI * fc / fs; const c = Math.cos(w); const al = Math.sin(w) / (2 * Math.SQRT1_2);
    let b0; let b1; let b2;
    if (type === 'low') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    const a0 = 1 + al;
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: -2 * c / a0, a2: (1 - al) / a0 };
  }
  function runBiquad(f, x) {
    const y = new Array(x.length);
    let x1 = x[0]; let x2 = x[0]; let y1 = x[0]; let y2 = x[0];
    if (f.b1 < 0) { y1 = 0; y2 = 0; } // passa-alto: parte da zero
    for (let i = 0; i < x.length; i++) {
      const v = f.b0 * x[i] + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  }
  function filtfilt(type, x, fc, fs = FS) {
    if (x.length < 4 || fc <= 0 || fc >= fs / 2) return x.slice();
    const f = biquad(type, fc, fs);
    // estensione per riflessione ai bordi
    const p = Math.min(x.length - 1, Math.round(fs / fc));
    const ext = [];
    for (let i = p; i > 0; i--) ext.push(2 * x[0] - x[i]);
    for (let i = 0; i < x.length; i++) ext.push(x[i]);
    for (let i = x.length - 2; i >= x.length - 1 - p; i--) ext.push(2 * x[x.length - 1] - x[i]);
    let y = runBiquad(f, ext).reverse();
    y = runBiquad(f, y).reverse();
    return y.slice(p, p + x.length);
  }
  const lowpass = (x, fc, fs) => filtfilt('low', x, fc, fs);
  const highpass = (x, fc, fs) => filtfilt('high', x, fc, fs);

  /* ───────── FFT e doppia integrazione nel dominio della frequenza ───────── */
  function fft(re, im, inverse) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = 2 * Math.PI / len * (inverse ? 1 : -1);
      const wr = Math.cos(ang); const wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1; let ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ar = re[i + k]; const ai = im[i + k];
          const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ar + br; im[i + k] = ai + bi;
          re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
  // Spostamento (m) da accelerazione (m/s²), tenendo solo le frequenze tra fLow e fHigh:
  // la doppia integrazione nel tempo andrebbe alla deriva, in frequenza basta dividere per -(2πf)².
  function displacement(acc, fs, fLow, fHigh) {
    const n0 = acc.length; if (n0 < 8) return acc.map(() => 0);
    const m = mean(acc);
    let n = 1; while (n < n0 * 2) n <<= 1;
    const re = new Array(n).fill(0); const im = new Array(n).fill(0);
    const taper = Math.max(1, Math.round(n0 * 0.05));
    for (let i = 0; i < n0; i++) {
      let w = 1;
      if (i < taper) w = 0.5 - 0.5 * Math.cos(Math.PI * i / taper);
      else if (i > n0 - 1 - taper) w = 0.5 - 0.5 * Math.cos(Math.PI * (n0 - 1 - i) / taper);
      re[i] = (acc[i] - m) * w;
    }
    fft(re, im, false);
    for (let k = 0; k < n; k++) {
      const f = (k <= n / 2 ? k : n - k) * fs / n;
      let gain = 0;
      if (f > 0) {
        // fianchi morbidi per evitare oscillazioni
        const lo = f < fLow ? Math.pow(f / fLow, 4) : 1;
        const hi = f > fHigh ? Math.pow(fHigh / f, 4) : 1;
        gain = -lo * hi / Math.pow(2 * Math.PI * f, 2);
      }
      re[k] *= gain; im[k] *= gain;
    }
    fft(re, im, true);
    return re.slice(0, n0);
  }

  /* ───────── Orientamento: verticale e piano orizzontale ───────── */
  // Vettore gravità medio (direzione "verso l'alto" nel sistema del telefono) in un tratto
  function gravity(sig, from = 0, to = sig.n) {
    const a = Math.max(0, from); const b = Math.min(sig.n, Math.max(a + 1, to));
    let gx = 0; let gy = 0; let gz = 0;
    for (let i = a; i < b; i++) { gx += sig.x[i]; gy += sig.y[i]; gz += sig.z[i]; }
    const k = b - a; return [gx / k, gy / k, gz / k];
  }
  // Componente verticale (m/s², senza gravità) e due componenti orizzontali
  function project(sig, g) {
    const u = unit(g);
    const ref = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = unit(cross(u, ref)); const e2 = cross(u, e1);
    const gm = norm(g);
    const v = new Array(sig.n); const h1 = new Array(sig.n); const h2 = new Array(sig.n);
    for (let i = 0; i < sig.n; i++) {
      const a = [sig.x[i], sig.y[i], sig.z[i]];
      v[i] = dot(a, u) - gm; h1[i] = dot(a, e1); h2[i] = dot(a, e2);
    }
    return { v, h1, h2, u, e1, e2 };
  }
  // Gravità che segue lentamente l'orientamento (per movimenti in cui il telefono ruota)
  function slowGravity(sig, fc = 0.3) {
    return { x: lowpass(sig.x, fc, sig.fs), y: lowpass(sig.y, fc, sig.fs), z: lowpass(sig.z, fc, sig.fs) };
  }

  /* ───────── Voli: il telefono è quasi in caduta libera ───────── */
  // Restituisce i tratti di volo { start, end, dur } in secondi dall'inizio del segnale
  function flights(sig, opts = {}) {
    const thr = (opts.threshold || 0.35) * G;
    const minDur = opts.minDur || 0.08;
    const fs = sig.fs;
    const m = lowpass(magnitude(sig), 25, fs);
    const out = [];
    let s = -1;
    for (let i = 0; i < m.length; i++) {
      const low = m[i] < thr;
      if (low && s < 0) s = i;
      if ((!low || i === m.length - 1) && s >= 0) {
        // istanti interpolati dove il segnale attraversa la soglia
        const a = s > 0 ? s - 1 + (m[s - 1] - thr) / ((m[s - 1] - m[s]) || 1) : s;
        const b = !low ? i - 1 + (m[i - 1] - thr) / ((m[i - 1] - m[i]) || 1) : i;
        out.push({ start: a / fs, end: b / fs, dur: (b - a) / fs });
        s = -1;
      }
    }
    // unisce interruzioni brevissime (rumore) dentro lo stesso volo
    const merged = [];
    out.forEach((f) => {
      const last = merged[merged.length - 1];
      if (last && f.start - last.end < 0.03) { last.end = f.end; last.dur = last.end - last.start; } else merged.push(Object.assign({}, f));
    });
    return merged.filter((f) => f.dur >= minDur);
  }
  const heightFromFlight = (tf) => G * tf * tf / 8; // m

  /* ───────── Salto verticale (CMJ) e salto su una gamba ───────── */
  function jumps(samples, opts = {}) {
    const sig = resample(samples);
    if (sig.n < FS) return { ok: false, reason: 'nodata' };
    const list = flights(sig).filter((f) => f.dur >= 0.15 && f.dur <= 1.0).map((f) => ({ tf: f.dur, h: heightFromFlight(f.dur) * 100, at: f.start }));
    if (!list.length) return { ok: false, reason: 'nojump' };
    const best = list.reduce((p, q) => (q.h > p.h ? q : p));
    const res = { ok: true, jumps: list, best: best.h, tf: best.tf, avg: mean(list.map((j) => j.h)) };
    // Potenza di picco stimata (formula di Sayers) se conosciamo il peso
    if (opts.mass > 0) res.power = Math.max(0, 60.7 * best.h + 45.3 * opts.mass - 2055);
    return res;
  }

  /* ───────── Drop jump: caduta dal gradino, contatto, salto ───────── */
  function dropJumps(samples) {
    const sig = resample(samples);
    if (sig.n < FS) return { ok: false, reason: 'nodata' };
    const fl = flights(sig);
    const list = [];
    for (let i = 0; i < fl.length - 1; i++) {
      const a = fl[i]; const b = fl[i + 1];
      const tc = b.start - a.end;
      if (a.dur >= 0.12 && tc >= 0.08 && tc <= 0.6 && b.dur >= 0.15 && b.dur <= 1.0) {
        const h = heightFromFlight(b.dur);
        list.push({ drop: a.dur, tc, tf: b.dur, h: h * 100, rsi: h / tc, at: a.start });
        i++;
      }
    }
    if (!list.length) return { ok: false, reason: 'nojump' };
    const best = list.reduce((p, q) => (q.rsi > p.rsi ? q : p));
    return { ok: true, jumps: list, best: best.rsi, bestJump: best, avg: mean(list.map((j) => j.rsi)) };
  }

  /* ───────── Salti ripetuti (Bosco): potenza, forza reattiva, calo per fatica ───────── */
  function repeatedJumps(samples) {
    const sig = resample(samples);
    if (sig.n < FS) return { ok: false, reason: 'nodata' };
    const fl = flights(sig).filter((f) => f.dur >= 0.12 && f.dur <= 1.0);
    if (fl.length < 3) return { ok: false, reason: 'nojump' };
    const list = fl.map((f, i) => {
      const tc = i > 0 ? f.start - fl[i - 1].end : null;
      const h = heightFromFlight(f.dur) * 100;
      return { tf: f.dur, tc: tc != null && tc <= 1.0 ? tc : null, h, rsi: tc != null && tc <= 1.0 ? h / 100 / tc : null, at: f.start };
    });
    const ttot = fl[fl.length - 1].end - fl[0].start;
    const sumTf = sum(fl.map((f) => f.dur));
    const n = fl.length;
    // Bosco: P (W/kg) = g² · Tf · Ttot / (4 · n · (Ttot − Tf))
    const power = ttot > sumTf ? G * G * sumTf * ttot / (4 * n * (ttot - sumTf)) : null;
    const hs = list.map((j) => j.h);
    const k = Math.min(3, Math.floor(n / 2));
    const first = mean(hs.slice(0, k)); const last = mean(hs.slice(-k));
    const tcs = list.map((j) => j.tc).filter((v) => v != null);
    return {
      ok: true, jumps: list, n, duration: ttot, power, avgHeight: mean(hs), best: Math.max(...hs),
      avgContact: tcs.length ? mean(tcs) : null, avgRsi: mean(list.map((j) => j.rsi).filter((v) => v != null)),
      fatigue: first > 0 ? Math.max(0, 100 * (1 - last / first)) : 0,
    };
  }

  /* ───────── Equilibrio: area di oscillazione stimata ───────── */
  // Telefono in cintura (o al petto): l'accelerazione orizzontale, integrata due volte
  // tra 0,15 e 3 Hz, dà lo spostamento del tronco. Area dell'ellisse al 95% in cm².
  function sway(samples, opts = {}) {
    const sig = resample(samples);
    if (sig.n < 3 * FS) return { ok: false, reason: 'nodata' };
    const skip = Math.round((opts.skip != null ? opts.skip : 1) * FS); // primo secondo: assestamento
    const g = gravity(sig, skip, sig.n);
    const p = project(sig, g);
    // caduta / piede appoggiato: picco di accelerazione dopo l'assestamento
    const lin = p.v.map((v, i) => Math.hypot(v, p.h1[i] - mean(p.h1), p.h2[i] - mean(p.h2)));
    const linS = lowpass(lin, 5, FS);
    let end = sig.n;
    for (let i = skip; i < sig.n; i++) if (linS[i] > (opts.fallThreshold || 3.5)) { end = Math.max(skip + FS, i - Math.round(0.3 * FS)); break; }
    const held = end / FS;
    const h1 = p.h1.slice(skip, end); const h2 = p.h2.slice(skip, end);
    if (h1.length < 2 * FS) return { ok: false, reason: 'short', held };
    const d1 = displacement(h1, FS, 0.15, 3).map((v) => v * 100);
    const d2 = displacement(h2, FS, 0.15, 3).map((v) => v * 100);
    // ellisse di confidenza al 95%: area = π · 5,991 · √det(Σ)
    const m1 = mean(d1); const m2 = mean(d2);
    let s11 = 0; let s22 = 0; let s12 = 0;
    for (let i = 0; i < d1.length; i++) { const a = d1[i] - m1; const b = d2[i] - m2; s11 += a * a; s22 += b * b; s12 += a * b; }
    s11 /= d1.length; s22 /= d1.length; s12 /= d1.length;
    const det = Math.max(0, s11 * s22 - s12 * s12);
    const area = Math.PI * 5.991 * Math.sqrt(det);
    // assi dell'ellisse (per il disegno)
    const tr = (s11 + s22) / 2; const dd = Math.sqrt(Math.max(0, tr * tr - det));
    const l1 = tr + dd; const l2 = Math.max(0, tr - dd);
    const ang = Math.atan2(l1 - s11, s12 || 1e-9);
    const step = Math.max(1, Math.floor(d1.length / 160));
    const path = []; for (let i = 0; i < d1.length; i += step) path.push([+(d1[i] - m1).toFixed(3), +(d2[i] - m2).toFixed(3)]);
    // velocità media dello spostamento (cm/s)
    let pathLen = 0; for (let i = 1; i < d1.length; i++) pathLen += Math.hypot(d1[i] - d1[i - 1], d2[i] - d2[i - 1]);
    const ah = h1.map((v, i) => Math.hypot(v - mean(h1), h2[i] - mean(h2)));
    return {
      ok: true, area, held, fell: end < sig.n, velocity: pathLen / (d1.length / FS),
      rmsAcc: Math.sqrt(mean(ah.map((v) => v * v))) * 1000, // mm/s²
      angVel: gyroRms(samples, samples[0].t + skip * 1000 / FS, samples[0].t + end * 1000 / FS), // °/s, se c'è il giroscopio
      ellipse: { rx: Math.sqrt(5.991 * l1), ry: Math.sqrt(5.991 * l2), angle: ang }, path,
    };
  }

  /* ───────── Corsa (telefono in cintura) ───────── */
  // opts.flipSides: inverte destra/sinistra se il telefono è girato al contrario
  function running(samples, opts = {}) {
    // su iPhone i valori hanno il verso opposto: li riporto alla convenzione standard
    const sg = opts.platformSign || 1;
    const sig = resample(sg === 1 ? samples : samples.map((q) => ({ t: q.t, x: -q.x, y: -q.y, z: -q.z })));
    if (sig.n < 5 * FS) return { ok: false, reason: 'nodata' };
    const g = gravity(sig);
    const p = project(sig, g);
    const v = lowpass(p.v, 6, FS);
    // passi = picchi dell'accelerazione verticale (impatto e spinta)
    const thr = Math.max(2, 0.5 * quantile(v, 0.98));
    const minGap = Math.round(0.22 * FS);
    const peaks = [];
    for (let i = 1; i < v.length - 1; i++) {
      if (v[i] > thr && v[i] >= v[i - 1] && v[i] > v[i + 1]) {
        const last = peaks[peaks.length - 1];
        if (last != null && i - last < minGap) { if (v[i] > v[last]) peaks[peaks.length - 1] = i; } else peaks.push(i);
      }
    }
    if (peaks.length < 8) return { ok: false, reason: 'nosteps' };
    const intervals = []; for (let i = 1; i < peaks.length; i++) intervals.push((peaks[i] - peaks[i - 1]) / FS);
    const stepT = median(intervals);
    // tratti di corsa veri: escludo pause (intervallo > 2 volte il tipico)
    const good = intervals.filter((d) => d < stepT * 1.8);
    const cadence = 60 / mean(good);
    // cadenza ogni 10 secondi (per il grafico)
    const series = [];
    for (let w = 0; w < sig.n / FS; w += 10) {
      const inW = []; for (let i = 1; i < peaks.length; i++) { const t = peaks[i] / FS; const d = (peaks[i] - peaks[i - 1]) / FS; if (t >= w && t < w + 10 && d < stepT * 1.8) inW.push(d); }
      if (inW.length >= 4) series.push(Math.round(60 / mean(inW)));
    }
    // contatto a terra: tratto attorno a ogni picco con forza verticale sopra 0,4 g (fuori = volo)
    const fv = lowpass(p.v, 12, FS).map((a) => a + G);
    const contacts = peaks.map((pk) => {
      let a = pk; let b = pk;
      const lim = Math.round(0.45 * FS);
      while (a > 0 && pk - a < lim && fv[a] > 0.4 * G) a--;
      while (b < fv.length - 1 && b - pk < lim && fv[b] > 0.4 * G) b++;
      const tc = (b - a) / FS;
      return tc < stepT * 0.95 ? tc : null; // nessuna fase di volo: camminata
    });
    const tcs = contacts.filter((c) => c != null);
    // oscillazione verticale: spostamento picco-picco tra un passo e il successivo
    const stepF = 1 / stepT;
    const dz = displacement(p.v, FS, Math.max(0.5, stepF * 0.5), Math.min(10, stepF * 4));
    const osc = [];
    for (let i = 1; i < peaks.length; i++) {
      if ((peaks[i] - peaks[i - 1]) / FS > stepT * 1.8) continue;
      let lo = Infinity; let hi = -Infinity;
      for (let k = peaks[i - 1]; k <= peaks[i]; k++) { lo = Math.min(lo, dz[k]); hi = Math.max(hi, dz[k]); }
      osc.push((hi - lo) * 100);
    }
    // regolarità: autocorrelazione alla durata di un passo e di un ciclo (due passi)
    const ac = (lag) => {
      const n = v.length - lag; if (n < FS) return 0;
      const m = mean(v); let s = 0; let s0 = 0; let s1 = 0;
      for (let i = 0; i < n; i++) { const a = v[i] - m; const b = v[i + lag] - m; s += a * b; s0 += a * a; s1 += b * b; }
      return s / Math.sqrt(s0 * s1 || 1);
    };
    const bestAc = (lag) => { let b = -1; for (let l = Math.round(lag * 0.85); l <= Math.round(lag * 1.15); l++) b = Math.max(b, ac(l)); return b; };
    const stepReg = bestAc(stepT * FS); const strideReg = bestAc(2 * stepT * FS);
    // lato del passo: durante l'appoggio destro il tronco è spinto verso sinistra
    const sides = sideOfSteps(p, peaks, contacts, opts);
    const by = { sx: [], dx: [] };
    contacts.forEach((c, i) => { if (c != null && sides[i]) by[sides[i]].push(c); });
    const left = by.sx.length ? mean(by.sx) : null; const right = by.dx.length ? mean(by.dx) : null;
    return {
      ok: true, steps: peaks.length, duration: (peaks[peaks.length - 1] - peaks[0]) / FS, cadence, series,
      contact: tcs.length >= 4 ? median(tcs) : null,
      oscillation: osc.length ? median(osc) : null,
      regularity: Math.max(0, Math.min(1, strideReg)), stepRegularity: Math.max(0, Math.min(1, stepReg)),
      symmetry: left && right ? symmetry(left, right) : (stepReg > 0 && strideReg > 0 ? 100 * Math.min(1, stepReg / strideReg) : null),
      contactLeft: left, contactRight: right,
    };
  }
  // Destra/sinistra: direzione laterale = quella in cui i passi alterni si separano di più;
  // il verso si stima dall'orientamento del telefono in cintura (schermo verso l'esterno).
  function sideOfSteps(p, peaks, contacts, opts) {
    const win = Math.round(0.08 * FS);
    const vec = peaks.map((pk) => {
      let a = 0; let b = 0; let k = 0;
      for (let i = Math.max(0, pk - win); i < Math.min(p.h1.length, pk + win); i++) { a += p.h1[i]; b += p.h2[i]; k++; }
      return [a / k, b / k];
    });
    const m1 = mean(vec.map((q) => q[0])); const m2 = mean(vec.map((q) => q[1]));
    let d1 = 0; let d2 = 0;
    vec.forEach((q, i) => { const s = i % 2 ? -1 : 1; d1 += s * (q[0] - m1); d2 += s * (q[1] - m2); });
    const dn = Math.hypot(d1, d2) || 1; const lat = [d1 / dn, d2 / dn];
    // asse "sinistra" nel sistema del telefono: alto × avanti, con avanti = −z (schermo verso dietro)
    const leftDev = cross(p.u, [0, 0, -1]);
    const leftH = [dot(leftDev, p.e1), dot(leftDev, p.e2)];
    let dir = Math.sign(lat[0] * leftH[0] + lat[1] * leftH[1]) || 1;
    if (opts.flipSides) dir = -dir;
    return vec.map((q) => {
      const s = ((q[0] - m1) * lat[0] + (q[1] - m2) * lat[1]) * dir;
      // spinta verso sinistra → appoggio sul piede destro
      return s > 0 ? 'dx' : 'sx';
    });
  }

  /* ───────── Plank: stabilità del tronco e tenuta ───────── */
  function plank(samples, opts = {}) {
    const sig = resample(samples);
    if (sig.n < 3 * FS) return { ok: false, reason: 'nodata' };
    const skip = FS;
    const g0 = unit(gravity(sig, skip, skip + FS));
    const slow = slowGravity(sig, 0.5);
    const maxTilt = opts.maxTilt || 12;
    let end = sig.n; let over = 0;
    const tilt = [];
    for (let i = skip; i < sig.n; i++) {
      const a = Math.acos(Math.max(-1, Math.min(1, dot(g0, unit([slow.x[i], slow.y[i], slow.z[i]]))))) * 180 / Math.PI;
      tilt.push(a);
      over = a > maxTilt ? over + 1 : 0;
      if (over > FS) { end = i - FS; break; }
    }
    const seg = { fs: FS, n: end - skip, x: sig.x.slice(skip, end), y: sig.y.slice(skip, end), z: sig.z.slice(skip, end) };
    if (seg.n < FS) return { ok: false, reason: 'short' };
    const hp = ['x', 'y', 'z'].map((k) => lowpass(highpass(seg[k], 0.5, FS), 10, FS));
    const rms = Math.sqrt(mean(hp[0].map((v, i) => v * v + hp[1][i] * hp[1][i] + hp[2][i] * hp[2][i])));
    return { ok: true, held: end / FS, broke: end < sig.n, shake: rms * 1000, maxTilt: Math.max(...tilt.slice(0, end - skip)) };
  }

  /* ───────── Mobilità (inclinometro) ───────── */
  // Angolo (gradi) tra la posizione di partenza e quella misurata, dalla direzione della gravità
  function angleBetween(a, b) {
    return Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b))))) * 180 / Math.PI;
  }
  // Angolo massimo mantenuto fermo per almeno "hold" secondi
  function mobility(samples, ref, opts = {}) {
    const sig = resample(samples);
    if (sig.n < FS) return { ok: false, reason: 'nodata' };
    const lp = { x: lowpass(sig.x, 3, FS), y: lowpass(sig.y, 3, FS), z: lowpass(sig.z, 3, FS) };
    const ang = lp.x.map((v, i) => angleBetween(ref, [v, lp.y[i], lp.z[i]]));
    const mag = magnitude(sig);
    const w = Math.round((opts.hold || 0.6) * FS);
    let best = null;
    for (let i = w; i < ang.length; i++) {
      const win = ang.slice(i - w, i); const mw = mag.slice(i - w, i);
      if (Math.max(...win) - Math.min(...win) < 2.5 && std(mw) < 0.6) {
        const a = mean(win);
        if (best == null || a > best) best = a;
      }
    }
    if (best == null) return { ok: false, reason: 'moving' };
    return { ok: true, angle: best };
  }

  /* ───────── Tempo di reazione con il movimento ───────── */
  // Primo istante (ms, stesso orologio dei campioni) dopo tStim in cui il telefono si muove davvero
  function motionOnset(samples, tStim, opts = {}) {
    const before = samples.filter((s) => s.t < tStim && s.t > tStim - 600);
    const base = before.length ? before : samples.slice(0, 10);
    const g = [mean(base.map((s) => s.x)), mean(base.map((s) => s.y)), mean(base.map((s) => s.z))];
    const thr = opts.threshold || 2.5;
    for (const s of samples) {
      if (s.t < tStim) continue;
      if (Math.hypot(s.x - g[0], s.y - g[1], s.z - g[2]) > thr) return s.t;
    }
    return null;
  }
  // Movimento prima dello stimolo = partenza anticipata
  function movedBefore(samples, tFrom, tStim, threshold = 2.5) {
    const s = samples.filter((p) => p.t >= tFrom && p.t < tStim);
    if (s.length < 3) return false;
    const g = [mean(s.map((p) => p.x)), mean(s.map((p) => p.y)), mean(s.map((p) => p.z))];
    return s.some((p) => Math.hypot(p.x - g[0], p.y - g[1], p.z - g[2]) > threshold);
  }

  /* ───────── Giroscopio ───────── */
  // Velocità di rotazione media (valore efficace, °/s) tra t0 e t1; null se il telefono non ha il giroscopio
  function gyroRms(samples, t0 = -Infinity, t1 = Infinity) {
    const inWin = samples.filter((q) => q.t >= t0 && q.t <= t1);
    const g = inWin.filter((q) => isFinite(q.rx) && isFinite(q.ry) && isFinite(q.rz));
    if (g.length < 10 || g.length < inWin.length * 0.5) return null;
    const m = [mean(g.map((q) => q.rx)), mean(g.map((q) => q.ry)), mean(g.map((q) => q.rz))];
    return Math.sqrt(mean(g.map((q) => (q.rx - m[0]) ** 2 + (q.ry - m[1]) ** 2 + (q.rz - m[2]) ** 2)));
  }
  // Swing (racchetta, mazza, braccio): picchi della velocità di rotazione. lever = distanza in metri
  // dal polso alla punta (braccio 0,7 · racchetta 1,0 · mazza da golf 1,6) per stimare la velocità della punta.
  function swings(samples, opts = {}) {
    const g = samples.filter((q) => isFinite(q.rx));
    if (g.length < 20) return { ok: false, reason: 'nogyro' };
    const sig = { fs: FS, ...resampleKeys(g, ['rx', 'ry', 'rz']) };
    const w = sig.rx.map((v, i) => Math.hypot(v, sig.ry[i], sig.rz[i]));
    const thr = opts.threshold || 300; const gap = Math.round(0.7 * FS);
    const peaks = [];
    for (let i = 1; i < w.length - 1; i++) {
      if (w[i] > thr && w[i] >= w[i - 1] && w[i] > w[i + 1]) {
        const last = peaks[peaks.length - 1];
        if (last != null && i - last < gap) { if (w[i] > w[last]) peaks[peaks.length - 1] = i; } else peaks.push(i);
      }
    }
    if (!peaks.length) return { ok: false, reason: 'noswing' };
    const lever = opts.lever || 1;
    const list = peaks.map((i) => ({ dps: w[i], kmh: (w[i] * Math.PI / 180) * lever * 3.6, at: i / FS }));
    const best = list.reduce((a, b) => (b.dps > a.dps ? b : a));
    // i sensori dei telefoni arrivano di solito a ~2000 °/s: oltre la misura è tagliata
    return { ok: true, swings: list, best: best.dps, bestKmh: best.kmh, avg: mean(list.map((x) => x.dps)), saturated: best.dps > 1950 };
  }
  // ricampiona a 100 Hz le chiavi indicate
  function resampleKeys(s, keys) {
    const t0 = s[0].t; const n = Math.floor((s[s.length - 1].t - t0) / 1000 * FS) + 1;
    const out = { n, t0 }; keys.forEach((k) => { out[k] = new Array(n); });
    let j = 0;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 1000 / FS;
      while (j < s.length - 2 && s[j + 1].t < t) j++;
      const a = s[j]; const b = s[Math.min(j + 1, s.length - 1)];
      const k = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
      keys.forEach((key) => { out[key][i] = a[key] + (b[key] - a[key]) * k; });
    }
    return out;
  }

  /* ───────── Battito e HRV dalla fotocamera (fotopletismografia) ───────── */
  // Ingresso: { t (ms), v } = luminosità media del rosso di ogni fotogramma, dito sull'obiettivo con il flash.
  // Il sangue che arriva a ogni battito assorbe luce: la luminosità scende. Battiti = minimi del segnale.
  function ppg(frames, opts = {}) {
    const f = frames.filter((q) => isFinite(q.v));
    if (f.length < 100) return { ok: false, reason: 'nodata' };
    const fs = 50;
    const s = resampleKeys(f, ['v']);
    // i campioni sono a 100 Hz: ne tengo uno su due (50 Hz bastano)
    const raw = s.v.filter((_, i) => i % 2 === 0);
    const skip = Math.round((opts.skip != null ? opts.skip : 4) * fs); // primi secondi: il dito si assesta
    if (raw.length - skip < 15 * fs) return { ok: false, reason: 'short' };
    const x = lowpass(highpass(raw, 0.6, fs), 4, fs).slice(skip).map((v) => -v);
    // picchi: massimo locale in ±0,25 s e sopra metà dell'ampiezza tipica dei dintorni
    const win = Math.round(0.25 * fs); const peaks = [];
    for (let i = win; i < x.length - win; i++) {
      let isMax = true;
      for (let k = i - win; k <= i + win; k++) if (x[k] > x[i]) { isMax = false; break; }
      if (!isMax) continue;
      const a = Math.max(0, i - 2 * fs); const b = Math.min(x.length, i + 2 * fs);
      const loc = x.slice(a, b); const amp = Math.max(...loc) - Math.min(...loc);
      if (x[i] - Math.min(...loc) > amp * 0.5) {
        // posizione del picco più precisa con una parabola sui tre punti
        const y0 = x[i - 1], y1 = x[i], y2 = x[i + 1]; const den = y0 - 2 * y1 + y2;
        peaks.push(i + (den ? 0.5 * (y0 - y2) / den : 0));
      }
    }
    const rrAll = []; for (let i = 1; i < peaks.length; i++) rrAll.push((peaks[i] - peaks[i - 1]) / fs * 1000);
    const valid = rrAll.filter((r) => r > 330 && r < 1500);
    if (valid.length < 10) return { ok: false, reason: 'nobeats' };
    const med = median(valid);
    // battiti buoni: vicini alla mediana (scarta i battiti persi o doppi)
    const clean = rrAll.map((r) => (r > 330 && r < 1500 && Math.abs(r - med) < 0.2 * med ? r : null));
    const rr = clean.filter((r) => r != null);
    let sq = 0; let nd = 0;
    for (let i = 1; i < clean.length; i++) if (clean[i] != null && clean[i - 1] != null) { sq += (clean[i] - clean[i - 1]) ** 2; nd++; }
    if (nd < 8) return { ok: false, reason: 'noisy' };
    const rmssd = Math.sqrt(sq / nd);
    const quality = rr.length / rrAll.length;
    // un battito vero si ripete: il segnale deve somigliare a sé stesso spostato di un battito
    const lag = Math.round((med / 1000) * fs); const mx = mean(x);
    let c = 0; let c0 = 0; let c1 = 0;
    for (let i = 0; i + lag < x.length; i++) { const a = x[i] - mx; const b = x[i + lag] - mx; c += a * b; c0 += a * a; c1 += b * b; }
    const periodic = c / Math.sqrt(c0 * c1 || 1);
    if (periodic < 0.35 || quality < 0.6) return { ok: false, reason: 'noisy', periodic, quality };
    return { ok: true, periodic, hr: 60000 / mean(rr), rmssd, sdnn: std(rr), lnrmssd: Math.log(rmssd), quality, beats: rr.length, rr: rr.map((r) => Math.round(r)), wave: x.filter((_, i) => i % 2 === 0).slice(0, 300).map((v) => +v.toFixed(3)) };
  }
  // Stessi indici da intervalli RR già pronti (fascia cardio o orologio Bluetooth), in ms
  function hrvFromRR(rrIn) {
    const v = rrIn.filter((r) => r > 300 && r < 2000);
    if (v.length < 10) return { ok: false, reason: 'nodata' };
    const med = median(v); const rr = v.filter((r) => Math.abs(r - med) < 0.2 * med);
    let sq = 0; for (let i = 1; i < rr.length; i++) sq += (rr[i] - rr[i - 1]) ** 2;
    const rmssd = Math.sqrt(sq / (rr.length - 1));
    return { ok: true, hr: 60000 / mean(rr), rmssd, sdnn: std(rr), lnrmssd: Math.log(rmssd), quality: rr.length / v.length, beats: rr.length, rr };
  }
  // Recupero (0-100) dall'HRV di oggi rispetto alla tua media: come fanno gli orologi sportivi, su ln(RMSSD)
  function readinessHRV(today, history) {
    const base = history.filter((x) => isFinite(x));
    if (base.length < 3) return null;
    const m = mean(base); const sd = Math.max(0.08, std(base));
    const z = (today - m) / sd;
    return { score: Math.max(0, Math.min(100, Math.round(75 + z * 15))), z };
  }

  /* ───────── GPS ───────── */
  const R_EARTH = 6371000;
  function haversine(a, b) {
    const r = Math.PI / 180; const dLat = (b.lat - a.lat) * r; const dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  // Percorso: distanza, tempo, passo, velocità massima, parziali al km. Scarta i punti imprecisi e i salti impossibili.
  function track(points, opts = {}) {
    const maxAcc = opts.maxAcc || 30; const vmax = opts.vmax || 12.5;
    const p = points.filter((q) => isFinite(q.lat) && isFinite(q.lon) && (!q.acc || q.acc <= maxAcc));
    if (p.length < 3) return { ok: false, reason: 'nogps' };
    // via i salti impossibili
    const ok = [p[0]];
    for (let i = 1; i < p.length; i++) {
      const prev = ok[ok.length - 1]; const dt = (p[i].t - prev.t) / 1000;
      if (dt > 0 && haversine(prev, p[i]) / dt <= vmax) ok.push(p[i]);
    }
    // media mobile su 5 punti: toglie lo zig-zag dell'errore del GPS, che allungherebbe la distanza
    const sm = ok.map((q, i) => {
      const a = Math.max(0, i - 2); const b = Math.min(ok.length, i + 3); const w = ok.slice(a, b);
      return { t: q.t, lat: mean(w.map((z) => z.lat)), lon: mean(w.map((z) => z.lon)), acc: q.acc };
    });
    const kept = [sm[0]]; let dist = 0; const cum = [0];
    for (let i = 1; i < sm.length; i++) {
      const prev = kept[kept.length - 1]; const d = haversine(prev, sm[i]); const dt = (sm[i].t - prev.t) / 1000;
      if (dt <= 0) continue;
      if (d < 1.5 && dt < 5) continue; // fermo
      dist += d; kept.push(sm[i]); cum.push(dist);
    }
    const dur = (kept[kept.length - 1].t - kept[0].t) / 1000;
    if (dur < 10 || kept.length < 3) return { ok: false, reason: 'short' };
    // velocità massima su finestre di almeno 5 secondi
    let best = 0; let j = 0;
    for (let i = 1; i < kept.length; i++) {
      while (j < i && (kept[i].t - kept[j + 1].t) / 1000 >= 5) j++;
      const dt = (kept[i].t - kept[j].t) / 1000;
      if (dt >= 5) best = Math.max(best, (cum[i] - cum[j]) / dt);
    }
    const splits = []; let next = 1000; let lastT = kept[0].t;
    for (let i = 1; i < kept.length; i++) if (cum[i] >= next) { splits.push((kept[i].t - lastT) / 1000); lastT = kept[i].t; next += 1000; }
    const speed = dist / dur;
    return { ok: true, distance: dist, duration: dur, speed, pace: speed > 0 ? 1000 / speed : null, maxSpeed: best || speed, splits, points: kept.length,
      path: kept.filter((_, i) => i % Math.max(1, Math.floor(kept.length / 200)) === 0).map((q) => [+q.lat.toFixed(6), +q.lon.toFixed(6)]) };
  }
  // Test di Cooper: VO2max stimato dalla distanza percorsa in 12 minuti (ml/kg/min)
  const cooperVO2 = (meters) => Math.max(0, (meters - 504.9) / 44.73);

  const API = {
    G, FS, mean, median, std, symmetry, resample, sampleRate, magnitude, lowpass, highpass, displacement,
    gravity, project, flights, heightFromFlight, jumps, dropJumps, repeatedJumps, sway, running, plank,
    angleBetween, mobility, motionOnset, movedBefore,
    gyroRms, swings, ppg, hrvFromRR, readinessHRV, haversine, track, cooperVO2,
  };
  root.ElvyAnalysis = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
