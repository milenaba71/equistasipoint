/* Analisi del cammino da video (strumento per il Noleggio prof). Prima parte: video DI FRONTE (piano frontale).
   - Il paziente cammina verso il telefono, fermo all'altezza del bacino. Il video resta sul telefono: niente viene inviato.
   - Riconoscimento del corpo fotogramma per fotogramma (MediaPipe Pose, già usato per la postura, modalità VIDEO).
   - Eventi del passo per ogni piede: contatto iniziale e stacco, dall'abbassarsi/sollevarsi della caviglia rispetto al bacino.
   - Ciclo del passo, appoggio/oscillazione, doppio appoggio, 8 fasi (Perry), cadenza, simmetria.
   - Piano frontale: caduta del bacino controlaterale (Trendelenburg), inclinazione laterale del tronco,
     ginocchio in valgo/varo nell'appoggio, larghezza del passo.
   Tutto è una stima indicativa: non è un'analisi medica e non sostituisce un laboratorio del movimento. */
(function () {
  const T = (s, o) => (window.T ? window.T(s, o) : s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage non disponibile */ } },
  };
  const KEY = 'tp-gait';
  const fmt = (v, d) => (window.LANG === 'en' ? v.toFixed(d) : v.toFixed(d).replace('.', ','));
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = (t) => { const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2); };
  const ESTIMATE = () => T('Stima indicativa, non è un’analisi medica');
  const SIDES = { L: () => T('sinistro'), R: () => T('destro') };
  const PHASES = () => [T('Contatto iniziale'), T('Risposta al carico'), T('Appoggio medio'), T('Appoggio terminale'), T('Pre-oscillazione'), T('Oscillazione iniziale'), T('Oscillazione media'), T('Oscillazione terminale')];
  const PH_COL = ['#c8372d', '#e0662c', '#f0a12b', '#d9c22a', '#8fbf3f', '#3aa0d8', '#2f6fd1', '#5a49c9'];
  // punti MediaPipe Pose (sinistra/destra della persona)
  const IDX = { nose: 0, shL: 11, shR: 12, hipL: 23, hipR: 24, kneeL: 25, kneeR: 26, ankL: 27, ankR: 28, heelL: 29, heelR: 30, toeL: 31, toeR: 32 };
  const FPS = 30; const MAX_S = 15;

  const prefs = store.get('tp-gait-prefs', { cond: 'senza', h: '' });
  const savePrefs = () => store.set('tp-gait-prefs', prefs);

  /* ───────── riconoscimento del corpo (video) ───────── */
  let poseP = null;
  function loadPose() {
    if (!poseP) {
      poseP = (async () => {
        const base = new URL('js/vendor/mediapipe/', location.href).href;
        const vision = await import(base + 'vision_bundle.mjs');
        const files = await vision.FilesetResolver.forVisionTasks(base + 'wasm');
        return vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: base + 'pose_landmarker_lite.task', delegate: 'CPU' }, runningMode: 'VIDEO', numPoses: 1,
        });
      })();
      poseP.catch(() => { poseP = null; });
    }
    return poseP;
  }

  const seek = (v, t) => new Promise((res) => { const on = () => { v.removeEventListener('seeked', on); res(); }; v.addEventListener('seeked', on); v.currentTime = t; });

  // estrae i punti del corpo da ogni fotogramma (30 al secondo)
  async function track(file, onProgress, cancelled) {
    const pose = await loadPose();
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(file);
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('video')); });
    if (!isFinite(v.duration) || v.duration <= 0) { v.currentTime = 1e9; await new Promise((r) => { v.ondurationchange = r; setTimeout(r, 1500); }); }
    const W = v.videoWidth; const H = v.videoHeight; const dur = Math.min(v.duration || 0, MAX_S);
    if (!W || !H || !dur) throw new Error('video');
    const k = Math.min(1, 480 / Math.max(W, H));
    const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext('2d', { willReadFrequently: true });
    const frames = []; const n = Math.floor(dur * FPS);
    for (let i = 0; i < n; i++) {
      if (cancelled()) break;
      const t = i / FPS;
      await seek(v, t);
      g.drawImage(v, 0, 0, c.width, c.height);
      const r = pose.detectForVideo(c, Math.round(t * 1000) + 1);
      const lm = r && r.landmarks && r.landmarks[0];
      const f = { t };
      if (lm) Object.keys(IDX).forEach((name) => { const p = lm[IDX[name]]; f[name] = [p.x * W, p.y * H, p.visibility == null ? 1 : p.visibility]; });
      frames.push(f);
      if (i % 5 === 0) onProgress(i / n);
    }
    URL.revokeObjectURL(v.src);
    return { frames, W, H, dur };
  }

  /* ───────── calcoli ───────── */
  const smooth = (a, w) => a.map((_, i) => { let s = 0; let n = 0; for (let j = Math.max(0, i - w); j <= Math.min(a.length - 1, i + w); j++) if (a[j] != null) { s += a[j]; n++; } return n ? s / n : null; });
  const deg = (r) => r * 180 / Math.PI;
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
  const ok = (f, ...names) => names.every((n) => f[n] && f[n][2] > 0.4);
  const fill = (a) => { const out = a.slice(); let last = null; for (let i = 0; i < out.length; i++) { if (out[i] == null) out[i] = last; else last = out[i]; } last = null; for (let i = out.length - 1; i >= 0; i--) { if (out[i] == null) out[i] = last; else last = out[i]; } return out; };


  // cicli del passo e fasi (Perry) dagli eventi dei due piedi: { L:{IC,TO}, R:{IC,TO} }
  function buildCycles(ev) {
    const cycles = { L: [], R: [] };
    ['L', 'R'].forEach((s) => {
      const { IC, TO } = ev[s];
      for (let k = 0; k + 1 < IC.length; k++) {
        const a = IC[k]; const b = IC[k + 1]; const to = TO.find((x) => x > a && x < b);
        const dur = (b - a) / FPS;
        if (to != null && dur > 0.6 && dur < 2.5) cycles[s].push({ a, b, to, dur, stance: (to - a) / (b - a) });
      }
    });
    if (!cycles.L.length || !cycles.R.length) return null;
    const other = (s) => (s === 'L' ? 'R' : 'L');
    cycles.L.concat(cycles.R).forEach((c) => {
      c.side = cycles.L.includes(c) ? 'L' : 'R';
      const o = ev[other(c.side)];
      const oTO = o.TO.find((x) => x > c.a && x < c.to); const oIC = o.IC.find((x) => x > c.a && x < c.to);
      const lrEnd = oTO != null ? oTO : c.a + Math.round((c.to - c.a) * 0.17);
      const psStart = oIC != null && oIC > lrEnd ? oIC : c.a + Math.round((c.to - c.a) * 0.8);
      const mid = Math.round((lrEnd + psStart) / 2);
      const sw = c.b - c.to;
      c.bounds = [c.a, Math.min(c.a + 1, lrEnd), lrEnd, mid, psStart, c.to, c.to + Math.round(sw / 3), c.to + Math.round(sw * 2 / 3), c.b];
      c.ds = ((lrEnd - c.a) + (c.to - psStart)) / (c.b - c.a);
    });
    const contacts = ev.L.IC.concat(ev.R.IC).sort((a, b) => a - b);
    const stepT = []; for (let i = 1; i < contacts.length; i++) { const d = (contacts[i] - contacts[i - 1]) / FPS; if (d > 0.3 && d < 1.3) stepT.push(d); }
    // passo destro = dal contatto sinistro al destro (e viceversa)
    const stepSide = { L: [], R: [] }; const sideOf = (i) => (ev.L.IC.includes(i) ? 'L' : 'R');
    for (let i = 1; i < contacts.length; i++) {
      const cur = sideOf(contacts[i]); const prev = sideOf(contacts[i - 1]);
      const d = (contacts[i] - contacts[i - 1]) / FPS; if (cur !== prev && d > 0.3 && d < 1.3) stepSide[cur].push(d);
    }
    return { cycles, allC: cycles.L.concat(cycles.R), contacts, stepT, stepSide, sideOf };
  }
  const sym = (a, b) => Math.max(0, 100 - Math.abs(a - b) / ((a + b) / 2) * 100);
  // curva media sul ciclo (0-100%, 51 punti)
  const cycleCurve = (cycles, sig, sign) => { const out = Array(51).fill(0); const cnt = Array(51).fill(0); cycles.forEach((c) => { for (let k = 0; k <= 50; k++) { const i = Math.round(c.a + (c.b - c.a) * k / 50); const v = sig[i]; if (v != null) { out[k] += v * sign; cnt[k]++; } } }); return out.map((v, k) => (cnt[k] ? v / cnt[k] : null)); };
  // picchi di un segnale (massimi) distanti almeno minGap, con una certa ampiezza
  function peaks(h, minGap, minAmp) {
    const n = h.length; const out = [];
    for (let i = 2; i < n - 2; i++) {
      if (h[i] == null) continue;
      if (h[i] > h[i - 1] && h[i] >= h[i + 1] && h[i] > h[i - 2] && h[i] >= h[i + 2]) {
        const win = h.slice(Math.max(0, i - minGap), Math.min(n, i + minGap + 1)).filter((x) => x != null);
        if (h[i] - Math.min(...win) < minAmp) continue;
        if (out.length && i - out[out.length - 1] < minGap) { if (h[i] > h[out[out.length - 1]]) out[out.length - 1] = i; } else out.push(i);
      }
    }
    return out;
  }

  function analyse(rec) {
    const F = rec.frames; const n = F.length;
    const good = F.filter((f) => ok(f, 'hipL', 'hipR', 'ankL', 'ankR', 'kneeL', 'kneeR')).length;
    if (n < FPS * 2 || good < n * 0.6) return { error: 'body' };
    const legLen = fill(F.map((f) => (ok(f, 'hipL', 'hipR', 'ankL', 'ankR') ? (Math.hypot(f.hipL[0] - f.ankL[0], f.hipL[1] - f.ankL[1]) + Math.hypot(f.hipR[0] - f.ankR[0], f.hipR[1] - f.ankR[1])) / 2 : null)));
    const S = smooth(legLen, 7);
    // altezza relativa della caviglia sotto il bacino: alta in appoggio, si riduce quando il piede si stacca
    const hipY = F.map((f) => (ok(f, 'hipL', 'hipR') ? (f.hipL[1] + f.hipR[1]) / 2 : null));
    const level = (side) => smooth(fill(F.map((f, i) => (ok(f, 'ank' + side) && hipY[i] != null ? (f['ank' + side][1] - hipY[i]) / S[i] : null))), 2);
    const lv = { L: level('L'), R: level('R') };
    const minGap = Math.round(FPS * 0.55);
    function events(h) {
      const mins = [];
      for (let i = 2; i < n - 2; i++) {
        if (h[i] < h[i - 1] && h[i] <= h[i + 1] && h[i] < h[i - 2] && h[i] <= h[i + 2]) {
          const lo = Math.max(0, i - minGap); const hi = Math.min(n - 1, i + minGap);
          const win = h.slice(lo, hi + 1); const amp = Math.max(...win) - h[i];
          if (amp > 0.03 && (!mins.length || i - mins[mins.length - 1] >= minGap)) mins.push(i);
          else if (mins.length && i - mins[mins.length - 1] < minGap && h[i] < h[mins[mins.length - 1]]) mins[mins.length - 1] = i;
        }
      }
      const IC = []; const TO = [];
      for (let k = 0; k < mins.length; k++) {
        const m = mins[k]; const nextM = mins[k + 1] != null ? mins[k + 1] : n - 1; const prevM = k ? mins[k - 1] : 0;
        const hiA = Math.max(...h.slice(m, nextM + 1)); const thrA = h[m] + 0.8 * (hiA - h[m]);
        for (let i = m; i <= nextM; i++) if (h[i] >= thrA) { IC.push(i); break; }
        const hiB = Math.max(...h.slice(prevM, m + 1)); const thrB = h[m] + 0.8 * (hiB - h[m]);
        for (let i = m; i >= prevM; i--) if (h[i] >= thrB) { TO.push(i); break; }
      }
      return { IC: [...new Set(IC)].sort((a, b) => a - b), TO: [...new Set(TO)].sort((a, b) => a - b), mins };
    }
    const ev = { L: events(lv.L), R: events(lv.R) };
    const B = buildCycles(ev);
    if (!B) return { error: 'steps' };
    const { cycles, allC, contacts, stepT, stepSide } = B;
    // piano frontale, fotogramma per fotogramma
    const pelvis = F.map((f) => (ok(f, 'hipL', 'hipR') ? deg(Math.atan2(f.hipR[1] - f.hipL[1], Math.abs(f.hipL[0] - f.hipR[0]))) : null)); // + = anca destra più bassa
    const trunk = F.map((f) => {
      if (!ok(f, 'shL', 'shR', 'hipL', 'hipR')) return null;
      const sx = (f.shL[0] + f.shR[0]) / 2; const sy = (f.shL[1] + f.shR[1]) / 2; const hx = (f.hipL[0] + f.hipR[0]) / 2; const hy = (f.hipL[1] + f.hipR[1]) / 2;
      const toL = Math.sign(f.hipL[0] - f.hipR[0]); // verso la sinistra della persona nell'immagine
      return deg(Math.atan2((sx - hx) * toL, hy - sy)); // + = tronco inclinato verso sinistra
    });
    const knee = (s) => F.map((f) => {
      if (!ok(f, 'hip' + s, 'knee' + s, 'ank' + s, 'hipL', 'hipR')) return null;
      const H = f['hip' + s]; const K = f['knee' + s]; const A = f['ank' + s];
      const tx = K[0] - H[0]; const ty = K[1] - H[1]; const sx = A[0] - K[0]; const sy = A[1] - K[1];
      const ang = deg(Math.atan2(tx * sy - ty * sx, tx * sx + ty * sy));
      const medial = Math.sign((s === 'L' ? f.hipR[0] - f.hipL[0] : f.hipL[0] - f.hipR[0]));
      // valgo (+): il ginocchio va verso l'interno rispetto alla linea anca-caviglia
      const lineX = H[0] + (A[0] - H[0]) * ((K[1] - H[1]) / ((A[1] - H[1]) || 1));
      return Math.abs(ang) * (Math.sign(K[0] - lineX) === medial ? 1 : -1);
    });
    const kn = { L: smooth(knee('L'), 2), R: smooth(knee('R'), 2) };
    const pel = smooth(pelvis, 2); const tr = smooth(trunk, 2);
    const per = (s) => {
      const cs = cycles[s];
      const st = mean(cs.map((c) => c.stance)) * 100; const ds = mean(cs.map((c) => c.ds)) * 100;
      // caduta del bacino dal lato opposto durante il singolo appoggio
      const drop = mean(cs.map((c) => { let m = -99; for (let i = c.bounds[2]; i <= c.bounds[4]; i++) { const p = pel[i]; if (p == null) continue; const v = s === 'L' ? p : -p; if (v > m) m = v; } return m; }).filter((x) => x > -99));
      const lean = mean(cs.map((c) => { let m = -99; for (let i = c.bounds[2]; i <= c.bounds[4]; i++) { const p = tr[i]; if (p == null) continue; const v = s === 'L' ? p : -p; if (v > m) m = v; } return m; }).filter((x) => x > -99));
      const kv = mean(cs.map((c) => { let m = null; for (let i = c.a; i <= c.bounds[3]; i++) { const p = kn[s][i]; if (p == null) continue; if (m == null || Math.abs(p) > Math.abs(m)) m = p; } return m; }).filter((x) => x != null));
      return { cycles: cs.length, cycle: mean(cs.map((c) => c.dur)), stance: st, swing: 100 - st, ds, drop, lean, knee: kv, step: mean(stepSide[s]) };
    };
    // larghezza del passo: distanza orizzontale tra le caviglie ai contatti, rispetto alla distanza tra le anche
    const widths = contacts.map((i) => { const f = F[i]; return ok(f, 'ankL', 'ankR', 'hipL', 'hipR') ? Math.abs(f.ankL[0] - f.ankR[0]) / Math.abs(f.hipL[0] - f.hipR[0]) : null; }).filter((x) => x != null && x < 3);
    const res = { L: per('L'), R: per('R'), cadence: 60 / mean(stepT), width: mean(widths) * 100, nSteps: contacts.length };
    res.symStance = sym(res.L.stance, res.R.stance); res.symStep = sym(res.L.step, res.R.step);
    res.ds = (res.L.ds + res.R.ds) / 2;
    if (prefs.h && +prefs.h > 100) res.widthCm = res.width / 100 * (+prefs.h * 0.105);
    // curve medie sul ciclo (0-100%) per i grafici
    const curve = (sig, s, sign) => cycleCurve(cycles[s], sig, sign);
    res.curves = { pelL: curve(pel, 'L', 1), pelR: curve(pel, 'R', -1), knL: curve(kn.L, 'L', 1), knR: curve(kn.R, 'R', 1), stL: res.L.stance, stR: res.R.stance };
    return { res, cycles: allC, ev, kn, pel, tr };
  }

  /* ───────── video DI LATO: piano sagittale e parametri spazio-temporali ─────────
     Contatto iniziale = tallone alla massima distanza davanti al bacino; stacco = punta alla massima distanza dietro
     (metodo di Zeni). Angoli: anca (coscia rispetto al tronco), ginocchio (coscia-gamba), caviglia (gamba-piede).
     Scala in metri dall'altezza del paziente: anca-caviglia ≈ 0,491 × altezza (Winter). */
  function analyseSide(rec) {
    const F = rec.frames; const n = F.length;
    const good = F.filter((f) => ok(f, 'hipL', 'hipR', 'ankL', 'ankR', 'kneeL', 'kneeR')).length;
    if (n < FPS * 2 || good < n * 0.6) return { error: 'body' };
    const pelX = fill(F.map((f) => (ok(f, 'hipL', 'hipR') ? (f.hipL[0] + f.hipR[0]) / 2 : null)));
    const first = pelX.find((x) => x != null); const last = [...pelX].reverse().find((x) => x != null);
    if (first == null || Math.abs(last - first) < rec.W * 0.15) return { error: 'across' };
    const d = Math.sign(last - first); // verso di marcia nell'immagine
    const legPx = fill(F.map((f) => (ok(f, 'hipL', 'hipR', 'ankL', 'ankR') ? Math.max(Math.hypot(f.hipL[0] - f.ankL[0], f.hipL[1] - f.ankL[1]), Math.hypot(f.hipR[0] - f.ankR[0], f.hipR[1] - f.ankR[1])) : null)));
    const legRef = legPx.map((_, i) => Math.max(...legPx.slice(Math.max(0, i - FPS), i + FPS + 1).filter((x) => x != null))); // gamba distesa vicino a quel momento
    const rel = (name) => smooth(fill(F.map((f, i) => (ok(f, name) && pelX[i] != null ? (f[name][0] - pelX[i]) * d / legRef[i] : null))), 1);
    const minGap = Math.round(FPS * 0.55);
    const ev = {};
    ['L', 'R'].forEach((sd) => {
      const heel = rel('heel' + sd); const toe = rel('toe' + sd);
      ev[sd] = { IC: peaks(heel, minGap, 0.25), TO: peaks(toe.map((x) => (x == null ? null : -x)), minGap, 0.25) };
    });
    const B = buildCycles(ev);
    if (!B) return { error: 'steps' };
    const { cycles, allC, contacts, stepT, stepSide, sideOf } = B;
    // angoli sagittali (gradi): avanti = verso di marcia, y dell'immagine verso il basso
    const ang = (v) => deg(Math.atan2(v[0] * d, v[1])); // da verticale verso il basso, + in avanti
    const vec = (f, a, b) => [f[b][0] - f[a][0], f[b][1] - f[a][1]];
    const joints = (sd) => {
      const hip = []; const knee = []; const ankle = [];
      F.forEach((f) => {
        if (!ok(f, 'hip' + sd, 'knee' + sd, 'ank' + sd)) { hip.push(null); knee.push(null); ankle.push(null); return; }
        const th = ang(vec(f, 'hip' + sd, 'knee' + sd)); const sh = ang(vec(f, 'knee' + sd, 'ank' + sd));
        const tr = ok(f, 'sh' + sd) ? ang(vec(f, 'sh' + sd, 'hip' + sd)) : 0; // tronco come riferimento dell'anca
        hip.push(th - tr); knee.push(th - sh);
        if (ok(f, 'heel' + sd, 'toe' + sd)) { const fv = vec(f, 'heel' + sd, 'toe' + sd); ankle.push(sh + deg(Math.atan2(-fv[1], fv[0] * d))); } else ankle.push(null);
      });
      return { hip: smooth(hip, 1), knee: smooth(knee, 1), ankle: smooth(ankle, 1) };
    };
    const J = { L: joints('L'), R: joints('R') };
    // scala: metri per pixel dall'altezza (se inserita)
    const hCm = prefs.h && +prefs.h > 100 && +prefs.h < 230 ? +prefs.h : 0;
    const mpp = (i) => (hCm ? (0.491 * hCm / 100) / legRef[i] : null);
    const heelX = (sd, i) => (ok(F[i], 'heel' + sd) ? F[i]['heel' + sd][0] : null);
    const stepLen = { L: [], R: [] };
    for (let k = 1; k < contacts.length; k++) {
      const i = contacts[k]; const sd = sideOf(i); const o = sd === 'L' ? 'R' : 'L';
      if (sideOf(contacts[k - 1]) === sd) continue;
      const a = heelX(sd, i); const b = heelX(o, i); if (a == null || b == null) continue;
      const px = Math.abs(a - b); stepLen[sd].push(hCm ? px * mpp(i) : px / legRef[i]);
    }
    const strideLen = { L: [], R: [] };
    allC.forEach((c) => { const a = heelX(c.side, c.a); const b = heelX(c.side, c.b); if (a != null && b != null) { const px = Math.abs(b - a); strideLen[c.side].push(hCm ? px * mpp(c.a) : px / legRef[c.a]); } });
    const i0 = contacts[0]; const i1 = contacts[contacts.length - 1];
    const speed = (Math.abs(pelX[i1] - pelX[i0]) / ((i1 - i0) / FPS)) * (hCm ? mpp(Math.round((i0 + i1) / 2)) : 1 / legRef[Math.round((i0 + i1) / 2)]);
    const range = (sig, cs) => { const mx = []; const mn = []; cs.forEach((c) => { const v = sig.slice(c.a, c.b + 1).filter((x) => x != null); if (v.length) { mx.push(Math.max(...v)); mn.push(Math.min(...v)); } }); return { max: mean(mx), min: mean(mn) }; };
    const per = (sd) => {
      const cs = cycles[sd];
      const st = mean(cs.map((c) => c.stance)) * 100;
      return { cycles: cs.length, cycle: mean(cs.map((c) => c.dur)), stance: st, swing: 100 - st, ds: mean(cs.map((c) => c.ds)) * 100, step: mean(stepSide[sd]),
        stepLen: mean(stepLen[sd]), strideLen: mean(strideLen[sd]), hip: range(J[sd].hip, cs), knee: range(J[sd].knee, cs), ankle: range(J[sd].ankle, cs) };
    };
    const res = { view: 'lato', L: per('L'), R: per('R'), cadence: 60 / mean(stepT), nSteps: contacts.length, speed, metric: !!hCm };
    res.symStance = sym(res.L.stance, res.R.stance); res.symStep = sym(res.L.step, res.R.step); res.symLen = sym(res.L.stepLen, res.R.stepLen);
    res.ds = (res.L.ds + res.R.ds) / 2;
    res.curves = { hipL: cycleCurve(cycles.L, J.L.hip, 1), hipR: cycleCurve(cycles.R, J.R.hip, 1), knL: cycleCurve(cycles.L, J.L.knee, 1), knR: cycleCurve(cycles.R, J.R.knee, 1),
      anL: cycleCurve(cycles.L, J.L.ankle, 1), anR: cycleCurve(cycles.R, J.R.ankle, 1), stL: res.L.stance, stR: res.R.stance };
    return { res, cycles: allC, ev, J };
  }

  /* ───────── disegni ───────── */
  const LINES = [['shL', 'shR'], ['hipL', 'hipR'], ['shL', 'hipL'], ['shR', 'hipR'], ['hipL', 'kneeL'], ['kneeL', 'ankL'], ['hipR', 'kneeR'], ['kneeR', 'ankR'], ['ankL', 'heelL'], ['heelL', 'toeL'], ['ankL', 'toeL'], ['ankR', 'heelR'], ['heelR', 'toeR'], ['ankR', 'toeR']];
  function phaseAt(cycles, side, i) { const c = cycles.find((x) => x.side === side && i >= x.a && i < x.b); if (!c) return -1; for (let p = 0; p < 8; p++) if (i < c.bounds[p + 1]) return p; return 7; }
  function drawFrame(g, f, k, cycles, i, J) {
    g.lineCap = 'round'; g.lineWidth = Math.max(2, 4 * k);
    const col = (a, b) => (/L$/.test(a) && /L$/.test(b) ? '#2fbf71' : /R$/.test(a) && /R$/.test(b) ? '#3a8ee6' : '#fadc00');
    LINES.forEach(([a, b]) => { if (!ok(f, a, b)) return; g.strokeStyle = col(a, b); g.beginPath(); g.moveTo(f[a][0] * k, f[a][1] * k); g.lineTo(f[b][0] * k, f[b][1] * k); g.stroke(); });
    Object.keys(IDX).forEach((p) => { if (!ok(f, p) || p === 'nose') return; g.fillStyle = '#fff'; g.beginPath(); g.arc(f[p][0] * k, f[p][1] * k, Math.max(2, 4 * k), 0, 7); g.fill(); });
    // linea orizzontale del bacino per vedere la caduta
    if (ok(f, 'hipL', 'hipR')) { g.setLineDash([6, 6]); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; const y = (f.hipL[1] + f.hipR[1]) / 2 * k; g.beginPath(); g.moveTo(Math.min(f.hipL[0], f.hipR[0]) * k - 40, y); g.lineTo(Math.max(f.hipL[0], f.hipR[0]) * k + 40, y); g.stroke(); g.setLineDash([]); }
    const ph = PHASES();
    [['L', '#2fbf71'], ['R', '#3a8ee6']].forEach(([s, c], j) => {
      const p = phaseAt(cycles, s, i); if (p < 0) return;
      g.font = 'bold ' + Math.round(13 * Math.max(1, k * 1.2)) + 'px system-ui'; const txt = (s === 'L' ? T('Sx') : T('Dx')) + ' · ' + ph[p];
      const w = g.measureText(txt).width + 14; const y = 10 + j * 28;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(8, y, w, 24); g.fillStyle = c; g.fillRect(8, y, 5, 24); g.fillStyle = '#fff'; g.fillText(txt, 18, y + 17);
    });
    if (J) {
      const r = (v) => (v == null ? '–' : Math.round(v) + '°');
      [['L', '#2fbf71'], ['R', '#3a8ee6']].forEach(([s, c], j) => {
        const txt = (s === 'L' ? T('Sx') : T('Dx')) + ' · ' + T('anca') + ' ' + r(J[s].hip[i]) + ' · ' + T('ginocchio') + ' ' + r(J[s].knee[i]) + ' · ' + T('caviglia') + ' ' + r(J[s].ankle[i]);
        g.font = 'bold ' + Math.round(13 * Math.max(1, k * 1.2)) + 'px system-ui'; const w = g.measureText(txt).width + 14; const y = g.canvas.height - 62 + j * 28;
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(8, y, w, 24); g.fillStyle = c; g.fillRect(8, y, 5, 24); g.fillStyle = '#fff'; g.fillText(txt, 18, y + 17);
      });
    }
  }
  function phaseBar(cycles, side) {
    const c = cycles.find((x) => x.side === side); if (!c) return '';
    const tot = c.b - c.a; const ph = PHASES();
    return '<div class="gt-bar" role="img" aria-label="' + esc(T('Fasi del ciclo del passo') + ' ' + SIDES[side]()) + '">' + ph.map((name, p) => {
      const w = Math.max(0.5, (c.bounds[p + 1] - c.bounds[p]) / tot * 100);
      return '<span style="width:' + w.toFixed(1) + '%;background:' + PH_COL[p] + '" title="' + esc(name) + '"></span>';
    }).join('') + '<i style="left:' + ((c.to - c.a) / tot * 100).toFixed(1) + '%"></i></div>';
  }
  function chart(a, b, label, unit, stL, stR) {
    const vals = a.concat(b).filter((x) => x != null); if (!vals.length) return '';
    const lim = Math.max(4, Math.ceil(Math.max(...vals.map(Math.abs)) + 1));
    const W = 300; const H = 120; const y = (v) => H / 2 - v / lim * (H / 2 - 8); const x = (k) => 6 + k / 50 * (W - 12);
    const path = (arr) => { let d = ''; let pen = false; arr.forEach((v, k) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(k).toFixed(1) + ' ' + y(v).toFixed(1) + ' '; pen = true; }); return d.trim(); };
    return '<figure class="gt-chart"><figcaption><b>' + label + '</b> <span class="small muted">(' + unit + ')</span></figcaption><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%">' +
      '<line x1="6" x2="' + (W - 6) + '" y1="' + H / 2 + '" y2="' + H / 2 + '" stroke="#ccd" />' +
      '<line x1="' + x(stL / 2) + '" x2="' + x(stL / 2) + '" y1="4" y2="' + (H - 4) + '" stroke="#2fbf71" stroke-dasharray="3 3" />' +
      '<line x1="' + x(stR / 2) + '" x2="' + x(stR / 2) + '" y1="4" y2="' + (H - 4) + '" stroke="#3a8ee6" stroke-dasharray="3 3" />' +
      '<path d="' + path(a) + '" fill="none" stroke="#2fbf71" stroke-width="2.5" /><path d="' + path(b) + '" fill="none" stroke="#3a8ee6" stroke-width="2.5" />' +
      '<text x="8" y="14" font-size="10" fill="#889">+' + lim + '°</text><text x="8" y="' + (H - 4) + '" font-size="10" fill="#889">−' + lim + '°</text></svg>' +
      '<div class="small muted">' + T('0–100% del ciclo · verde sinistro, blu destro · tratteggio: fine dell’appoggio') + '</div></figure>';
  }

  /* ───────── lettura dei risultati: riferimenti, colori e riassunto (regole fisse, niente IA) ─────────
     Riferimenti indicativi per un cammino adulto tipico. g = nella norma, y = da osservare, r = lontano dal riferimento. */
  const band = (v, g, y) => (!isFinite(v) ? '' : (v >= g[0] && v <= g[1]) ? 'g' : (v >= y[0] && v <= y[1]) ? 'y' : 'r');
  const DOT = { g: '🟢', y: '🟡', r: '🔴', '': '⚪' };
  function evaluate(r, view) {
    const rows = []; const add = (key, label, L, R, ref, fl, fmtv, both) => rows.push({ key, label, L, R, ref, fl, fmtv, both: !!both });
    const p0 = (v) => (isFinite(v) ? fmt(v, 0) + '%' : '–'); const d1 = (v) => (isFinite(v) ? fmt(v, 1) + '°' : '–');
    const st = (v) => band(v, [57, 65], [53, 69]);
    add('stance', T('Fase di appoggio'), r.L.stance, r.R.stance, '≈ 60%', [st(r.L.stance), st(r.R.stance)], p0);
    add('ds', T('Doppio appoggio'), r.ds, null, '≈ 20%', [band(r.ds, [16, 26], [12, 32])], p0, true);
    add('cad', T('Cadenza'), r.cadence, null, '95–125 ' + T('passi/min'), [band(r.cadence, [95, 125], [80, 135])], (v) => (isFinite(v) ? Math.round(v) + ' ' + T('passi/min') : '–'), true);
    add('symSt', T('Simmetria dell’appoggio'), r.symStance, null, '≥ 95%', [band(r.symStance, [95, 100], [90, 100])], p0, true);
    add('symStep', T('Simmetria del tempo del passo'), r.symStep, null, '≥ 95%', [band(r.symStep, [95, 100], [90, 100])], p0, true);
    if (view === 'lato') {
      if (r.metric) add('speed', T('Velocità del cammino'), r.speed, null, '≥ 1,0 m/s', [band(r.speed, [1.0, 2.2], [0.8, 2.5])], (v) => (isFinite(v) ? fmt(v, 2) + ' m/s' : '–'), true);
      if (r.metric) add('len', T('Lunghezza del passo'), r.L.stepLen, r.R.stepLen, '0,55–0,80 m', [band(r.L.stepLen, [0.55, 0.85], [0.45, 0.95]), band(r.R.stepLen, [0.55, 0.85], [0.45, 0.95])], (v) => (isFinite(v) ? fmt(v, 2) + ' m' : '–'));
      add('symLen', T('Simmetria della lunghezza del passo'), r.symLen, null, '≥ 95%', [band(r.symLen, [95, 100], [90, 100])], p0, true);
      const j = (o, k) => (o && isFinite(o[k]) ? o[k] : NaN);
      add('hipMax', T('Anca: flessione massima'), j(r.L.hip, 'max'), j(r.R.hip, 'max'), '25–40°', [band(j(r.L.hip, 'max'), [25, 40], [18, 48]), band(j(r.R.hip, 'max'), [25, 40], [18, 48])], d1);
      add('hipMin', T('Anca: estensione'), j(r.L.hip, 'min'), j(r.R.hip, 'min'), '≤ −5°', [band(j(r.L.hip, 'min'), [-40, -5], [-40, 0]), band(j(r.R.hip, 'min'), [-40, -5], [-40, 0])], d1);
      add('kneeMax', T('Ginocchio: flessione in oscillazione'), j(r.L.knee, 'max'), j(r.R.knee, 'max'), '55–70°', [band(j(r.L.knee, 'max'), [55, 72], [45, 78]), band(j(r.R.knee, 'max'), [55, 72], [45, 78])], d1);
      add('kneeMin', T('Ginocchio: estensione in appoggio'), j(r.L.knee, 'min'), j(r.R.knee, 'min'), '0–8°', [band(j(r.L.knee, 'min'), [-5, 8], [-10, 15]), band(j(r.R.knee, 'min'), [-5, 8], [-10, 15])], d1);
      add('ankMax', T('Caviglia: flessione dorsale'), j(r.L.ankle, 'max'), j(r.R.ankle, 'max'), '5–20°', [band(j(r.L.ankle, 'max'), [5, 25], [0, 30]), band(j(r.R.ankle, 'max'), [5, 25], [0, 30])], d1);
      add('ankMin', T('Caviglia: flessione plantare'), j(r.L.ankle, 'min'), j(r.R.ankle, 'min'), '≤ −10°', [band(j(r.L.ankle, 'min'), [-40, -10], [-40, -5]), band(j(r.R.ankle, 'min'), [-40, -10], [-40, -5])], d1);
    } else {
      add('drop', T('Caduta del bacino dal lato opposto'), r.L.drop, r.R.drop, '< 5°', [band(r.L.drop, [-20, 5], [-20, 8]), band(r.R.drop, [-20, 5], [-20, 8])], d1);
      add('lean', T('Inclinazione del tronco'), r.L.lean, r.R.lean, '< 5°', [band(r.L.lean, [-20, 5], [-20, 8]), band(r.R.lean, [-20, 5], [-20, 8])], d1);
      const kv = (v) => (isFinite(v) ? Math.abs(v) : NaN);
      add('knee', T('Ginocchio sul piano frontale'), r.L.knee, r.R.knee, '< 8°', [band(kv(r.L.knee), [0, 8], [0, 12]), band(kv(r.R.knee), [0, 8], [0, 12])], (v) => (isFinite(v) ? fmt(Math.abs(v), 1) + '° ' + (Math.abs(v) < 2 ? '' : v > 0 ? T('valgo') : T('varo')) : '–'));
    }
    return rows;
  }
  function summary(r, view, rows) {
    const out = []; let fem = false; const sd = (s) => (s === 'L' ? (fem ? T('sinistra') : T('sinistro')) : (fem ? T('destra') : T('destro')));
    const worse = (fl) => (fl.includes('r') ? 'r' : fl.includes('y') ? 'y' : 'g');
    // asimmetria dell'appoggio
    if (isFinite(r.L.stance) && isFinite(r.R.stance) && Math.abs(r.L.stance - r.R.stance) >= 4) {
      const longer = r.L.stance > r.R.stance ? 'L' : 'R';
      out.push({ fl: Math.abs(r.L.stance - r.R.stance) >= 8 ? 'r' : 'y', t: T('L’appoggio sul piede {s} dura più dell’altro ({a}% contro {b}%): il carico tende a restare più a lungo su quel lato.', { s: sd(longer), a: Math.round(longer === 'L' ? r.L.stance : r.R.stance), b: Math.round(longer === 'L' ? r.R.stance : r.L.stance) }) });
    }
    rows.forEach((x) => {
      const f = worse(x.fl.filter(Boolean)); if (f === 'g' || x.key === 'stance' || x.key === 'symSt') return;
      if (x.both) {
        const v = x.fmtv(x.L);
        const msg = {
          ds: x.L > 26 ? T('Il doppio appoggio è lungo ({v}): il passo è più prudente del solito.', { v }) : T('Il doppio appoggio è breve ({v}).', { v }),
          cad: x.L < 95 ? T('La cadenza è bassa ({v}): passi lenti.', { v }) : T('La cadenza è alta ({v}): passi brevi e veloci.', { v }),
          symStep: T('I tempi dei passi destro e sinistro sono diversi (simmetria {v}).', { v }),
          speed: T('La velocità del cammino è ridotta ({v}).', { v }),
          symLen: T('I passi destro e sinistro hanno lunghezze diverse (simmetria {v}).', { v }),
        }[x.key];
        if (msg) out.push({ fl: f, t: msg });
        return;
      }
      fem = /^(hip|ank)/.test(x.key);
      ['L', 'R'].forEach((s, i) => {
        const fl = x.fl[i]; if (fl !== 'y' && fl !== 'r') return; const v = x.fmtv(s === 'L' ? x.L : x.R); const val = s === 'L' ? x.L : x.R;
        const msg = {
          len: T('Il passo {s} è corto ({v}).', { s: sd(s), v }),
          hipMax: val < 25 ? T('Anca {s}: flessione ridotta ({v}).', { s: sd(s), v }) : T('Anca {s}: flessione ampia ({v}).', { s: sd(s), v }),
          hipMin: T('Anca {s}: poca estensione a fine appoggio ({v}).', { s: sd(s), v }),
          kneeMax: val < 55 ? T('Ginocchio {s}: si piega poco in oscillazione ({v}): il piede può strisciare o il passo accorciarsi.', { s: sd(s), v }) : T('Ginocchio {s}: si piega molto in oscillazione ({v}).', { s: sd(s), v }),
          kneeMin: T('Ginocchio {s}: non si distende del tutto in appoggio ({v}).', { s: sd(s), v }),
          ankMax: T('Caviglia {s}: poca flessione dorsale ({v}).', { s: sd(s), v }),
          ankMin: T('Caviglia {s}: poca spinta in flessione plantare a fine appoggio ({v}).', { s: sd(s), v }),
          drop: T('Nel singolo appoggio {s} il bacino scende dal lato opposto di {v}.', { s: sd(s), v }),
          lean: T('Nel singolo appoggio {s} il tronco si inclina di {v} verso quel lato.', { s: sd(s), v }),
          knee: T('Ginocchio {s}: deviazione sul piano frontale all’inizio dell’appoggio ({v}).', { s: sd(s), v }),
        }[x.key];
        if (msg) out.push({ fl, t: msg });
      });
    });
    if (!out.length) out.push({ fl: 'g', t: T('I parametri misurati sono vicini ai valori di riferimento di un cammino tipico.') });
    return out.map((x) => ({ fl: x.fl, t: x.t.charAt(0).toUpperCase() + x.t.slice(1) }));
  }
  // confronto con la prova nell'altra condizione (senza/con Equistasi) e con la prima prova della stessa condizione
  function comparisons(entry) {
    const l = store.get(KEY, []).filter((x) => (x.view || 'fronte') === entry.view && x.t !== entry.t);
    const out = [];
    const keys = entry.view === 'lato'
      ? [['symStance', T('simmetria dell’appoggio'), '%', 0], ['ds', T('doppio appoggio'), '%', 0], ['cadence', T('cadenza'), ' ' + T('passi/min'), 0], ['speed', T('velocità'), ' m/s', 2], ['symLen', T('simmetria della lunghezza del passo'), '%', 0]]
      : [['symStance', T('simmetria dell’appoggio'), '%', 0], ['ds', T('doppio appoggio'), '%', 0], ['cadence', T('cadenza'), ' ' + T('passi/min'), 0], ['dropMax', T('caduta massima del bacino'), '°', 1]];
    const val = (r, k) => (k === 'dropMax' ? Math.max(r.L.drop, r.R.drop) : k === 'speed' && !r.metric ? NaN : r[k]);
    const line = (a, b, label) => keys.map(([k, name, u, d]) => { const x = val(a.r, k); const y = val(b.r, k); return isFinite(x) && isFinite(y) && Math.abs(x - y) >= (d ? 0.05 : 1) ? name + ' ' + fmt(x, d) + u + ' → ' + fmt(y, d) + u : ''; }).filter(Boolean);
    const other = [...l].reverse().find((x) => x.cond !== entry.cond && Math.abs(x.t - entry.t) < 30 * 864e5);
    if (other) {
      const [a, b] = entry.cond === 'con' ? [other, entry] : [entry, other];
      const ch = line(a, b);
      out.push(T('Senza → con Equistasi ({d1} → {d2}): ', { d1: dateStr(a.t), d2: dateStr(b.t) }) + (ch.length ? ch.join(' · ') : T('valori simili')));
    }
    const first = l.find((x) => x.cond === entry.cond && x.t < entry.t);
    if (first) { const ch = line(first, entry); out.push(T('Rispetto alla prima prova del {d} ({c}): ', { d: dateStr(first.t), c: entry.cond === 'con' ? T('con Equistasi') : T('senza Equistasi') }) + (ch.length ? ch.join(' · ') : T('valori simili'))); }
    return out;
  }
  /* ───────── interpretazione biomeccanica: schemi riconosciuti dai numeri (regole fisse) ─────────
     Per ogni schema: i dati che lo sostengono, il significato meccanico e cosa verificare. Sono ipotesi per il professionista, non diagnosi. */
  function patterns(r, view) {
    const P = []; const add = (fl, title, ev, mean, check) => P.push({ fl, title, ev, mean, check });
    const M = { L: T('sinistro'), R: T('destro') }; const F = { L: T('sinistra'), R: T('destra') }; const O = { L: 'R', R: 'L' };
    const ok = isFinite; const d1 = (v) => fmt(v, 1) + '°'; const p0 = (v) => Math.round(v) + '%';
    let stAsym = false;
    if (ok(r.L.stance) && ok(r.R.stance) && Math.abs(r.L.stance - r.R.stance) >= 4) {
      stAsym = true; const s = r.L.stance < r.R.stance ? 'L' : 'R'; const o = O[s];
      add(Math.abs(r.L.stance - r.R.stance) >= 8 ? 'r' : 'y', T('Asimmetria del carico: appoggio più breve a {sf}', { sf: F[s] }),
        T('Appoggio {a} a {sf} contro {b} a {of}; simmetria dell’appoggio {y}.', { a: p0(r[s].stance), b: p0(r[o].stance), sf: F[s], of: F[o], y: p0(r.symStance) }),
        T('L’arto {s} resta in carico meno tempo e l’arto {o} compensa con un appoggio più lungo: schema di evitamento del carico (tipo antalgico). È il quadro tipico di dolore, instabilità o debolezza dell’arto {s}.', { s: M[s], o: M[o] }),
        T('Dolore in carico, forza e stabilità dell’arto {s}; eventuale differenza di lunghezza degli arti.', { s: M[s] }));
    }
    const slow = (ok(r.cadence) && r.cadence < 95) || (r.metric && ok(r.speed) && r.speed < 1);
    if (ok(r.ds) && r.ds > 26) {
      add(slow || r.ds > 32 ? 'r' : 'y', T('Cammino prudente (strategia di stabilizzazione)'),
        T('Doppio appoggio {d} (rif. ≈ 20%), cadenza {c} passi/min', { d: p0(r.ds), c: ok(r.cadence) ? Math.round(r.cadence) : '–' }) + (r.metric && ok(r.speed) ? ', ' + T('velocità') + ' ' + fmt(r.speed, 2) + ' m/s.' : '.'),
        T('Aumenta il tempo con entrambi i piedi a terra: il cammino privilegia la stabilità rispetto alla progressione. Quadro tipico di ridotto controllo dell’equilibrio, paura di cadere o deficit sensoriale e propriocettivo.'),
        T('Equilibrio statico e dinamico, storia di cadute, sensibilità plantare e vista.'));
    }
    if (!stAsym && ok(r.symStep) && r.symStep < 90) {
      add('y', T('Ritmo del passo asimmetrico'), T('Tempo del passo {a} s a sinistra e {b} s a destra (simmetria {y}).', { a: fmt(r.L.step, 2), b: fmt(r.R.step, 2), y: p0(r.symStep) }),
        T('I due passi non hanno la stessa durata anche se le percentuali di appoggio sono simili: un passo è più esitante dell’altro, oppure il cammino è variabile da un ciclo all’altro.'),
        T('Ripetere la prova: con pochi passi il dato è sensibile al singolo passo.'));
    }
    if (view !== 'lato') {
      ['L', 'R'].forEach((s) => {
        const dr = r[s].drop; const ln = r[s].lean; const hasD = ok(dr) && dr > 5; const hasL = ok(ln) && ln > 5;
        if (hasD || hasL) {
          const ev = [hasD || ok(dr) ? T('caduta del bacino {v} (rif. < 5°)', { v: d1(dr) }) : '', ok(ln) ? T('inclinazione del tronco {v} (rif. < 5°)', { v: d1(ln) }) : ''].filter(Boolean).join(', ');
          add((hasD && dr > 8) || (hasL && ln > 8) ? 'r' : 'y',
            hasD && hasL ? T('Bacino che cade e tronco che compensa nell’appoggio {s}', { s: M[s] }) : hasD ? T('Caduta del bacino nell’appoggio {s} (tipo Trendelenburg)', { s: M[s] }) : T('Tronco inclinato verso l’arto {s} in appoggio (tipo Duchenne)', { s: M[s] }),
            T('Nel singolo appoggio {s}: ', { s: M[s] }) + ev + '.',
            hasD && hasL ? T('Il bacino scende dal lato in oscillazione e il tronco si sposta sopra l’arto in carico: schema tipo Trendelenburg con compenso del tronco (Duchenne). Gli abduttori dell’anca {sf} (medio gluteo) non stabilizzano a sufficienza il bacino sul piano frontale.', { sf: F[s] })
              : hasD ? T('Il bacino scende dal lato in oscillazione: gli abduttori dell’anca {sf} (medio gluteo) non tengono il bacino orizzontale. Schema tipo Trendelenburg non compensato dal tronco.', { sf: F[s] })
                : T('Il tronco si sposta sopra l’anca in carico: così si accorcia il braccio di leva del peso e cala il lavoro richiesto agli abduttori. Compenso tipico di debolezza degli abduttori o di dolore all’anca {sf}.', { sf: F[s] }),
            T('Forza degli abduttori dell’anca {sf} (test di Trendelenburg), dolore e mobilità dell’anca.', { sf: F[s] }));
        }
        const kn = r[s].knee;
        if (ok(kn) && Math.abs(kn) > 8) {
          if (kn > 0) add(kn > 12 ? 'r' : 'y', T('Valgo dinamico del ginocchio {s}', { s: M[s] }), T('Deviazione di {v} verso l’interno nella risposta al carico (rif. < 8°).', { v: d1(kn) }),
            T('All’inizio dell’appoggio il ginocchio si sposta all’interno della linea anca-caviglia: controllo insufficiente dell’anca (abduttori e rotatori esterni) e/o cedimento del piede in pronazione. Aumenta il carico sul compartimento laterale e sulla femoro-rotulea. Misura in 2D: una rotazione dell’arto può accentuarla.'),
            T('Controllo dell’anca in appoggio su una gamba (squat monopodalico), appoggio del piede.'));
          else add(kn < -12 ? 'r' : 'y', T('Varo del ginocchio {s} in appoggio', { s: M[s] }), T('Deviazione di {v} verso l’esterno nella risposta al carico (rif. < 8°).', { v: d1(-kn) }),
            T('Il ginocchio resta all’esterno della linea anca-caviglia: il carico si concentra sul compartimento mediale. Se compare bruscamente all’inizio dell’appoggio si parla di spinta in varo (varus thrust). Misura in 2D: una rotazione dell’arto può accentuarla.'),
            T('Allineamento statico dell’arto, lassità laterale, dolore mediale del ginocchio.'));
        }
      });
      if (r.widthCm && r.widthCm > 18) add('y', T('Base di appoggio allargata'), T('Larghezza del passo ≈ {v} cm (rif. 5–13 cm).', { v: Math.round(r.widthCm) }),
        T('Allargare la base aumenta la stabilità sul piano frontale: è una strategia di compenso per un equilibrio laterale incerto.'), T('Equilibrio e coordinazione.'));
    } else {
      const lenU = r.metric ? ' m' : ' ' + T('gambe');
      if (r.metric && ok(r.speed) && r.speed < 1) {
        const avg = (r.L.stepLen + r.R.stepLen) / 2; const short = ok(avg) && avg < 0.55; const lowC = ok(r.cadence) && r.cadence < 95;
        add(r.speed < 0.8 ? 'r' : 'y', T('Velocità del cammino ridotta'),
          T('Velocità {v} m/s (rif. ≥ 1,0), passo medio {l} m, cadenza {c} passi/min.', { v: fmt(r.speed, 2), l: ok(avg) ? fmt(avg, 2) : '–', c: ok(r.cadence) ? Math.round(r.cadence) : '–' }),
          T('La velocità è l’indice globale della funzione del cammino.') + ' ' + (short && lowC ? T('Qui è ridotta sia per i passi corti sia per la cadenza bassa.') : short ? T('Qui la riduzione dipende soprattutto dai passi corti: la cadenza è conservata.') : lowC ? T('Qui la riduzione dipende soprattutto dalla cadenza bassa: la lunghezza del passo è conservata.') : '') + (r.speed < 0.8 ? ' ' + T('Sotto 0,8 m/s il cammino fuori casa è in genere limitato.') : ''),
          T('Forza di spinta, resistenza allo sforzo, equilibrio.'));
      }
      if (ok(r.symLen) && r.symLen < 90 && ok(r.L.stepLen) && ok(r.R.stepLen)) {
        const s = r.L.stepLen < r.R.stepLen ? 'L' : 'R'; const o = O[s];
        add(r.symLen < 80 ? 'r' : 'y', T('Passo {s} più corto', { s: M[s] }), T('Passo {a} a {sf} e {b} a {of} (simmetria {y}).', { a: fmt(r[s].stepLen, 2) + lenU, b: fmt(r[o].stepLen, 2) + lenU, sf: F[s], of: F[o], y: p0(r.symLen) }),
          T('La lunghezza del passo {s} dipende da quanto l’arto {o}, che è in appoggio, lascia avanzare il corpo. Un passo {s} corto indica in genere poca estensione dell’anca o poca spinta dell’arto {o}, oppure un appoggio breve su quell’arto.', { s: M[s], o: M[o] }),
          T('Estensione dell’anca e spinta della caviglia dell’arto {o}.', { o: M[o] }));
      }
      ['L', 'R'].forEach((s) => {
        const j = (o, k) => (o && ok(o[k]) ? o[k] : NaN); const A = { s: M[s], sf: F[s] };
        const kMax = j(r[s].knee, 'max'); const kMin = j(r[s].knee, 'min'); const hMax = j(r[s].hip, 'max'); const hMin = j(r[s].hip, 'min'); const aMax = j(r[s].ankle, 'max'); const aMin = j(r[s].ankle, 'min');
        if (kMax < 50) add(kMax < 45 ? 'r' : 'y', T('Ginocchio {s} rigido in oscillazione (stiff-knee)', A), T('Flessione massima {v} (rif. ≈ 60°).', { v: d1(kMax) }),
          T('Il ginocchio si piega poco in oscillazione e il piede passa più vicino al suolo. Compensi frequenti: circonduzione dell’anca, sollevamento del bacino, spinta sulla punta dell’altro piede. Cause tipiche: attività eccessiva del retto femorale, spinta ridotta della caviglia in pre-oscillazione, velocità bassa.'),
          T('Tensione o spasticità del retto femorale, spinta della caviglia, compensi visibili nel video di fronte.'));
        if (kMin > 12) add(kMin > 18 ? 'r' : 'y', T('Ginocchio {s} flesso in appoggio', A), T('Estensione massima in appoggio {v} (rif. 0–5°).', { v: d1(kMin) }),
          T('Il ginocchio non raggiunge l’estensione in carico: il quadricipite lavora per tutto l’appoggio e il passo opposto si accorcia. Compatibile con retrazione dei flessori, deficit di estensione o, se bilaterale, atteggiamento in flessione (crouch).'),
          T('Estensione passiva del ginocchio, lunghezza degli ischiocrurali, estensione dell’anca.'));
        if (kMin < -6) add(kMin < -10 ? 'r' : 'y', T('Iperestensione del ginocchio {s} in appoggio (recurvato)', A), T('Angolo minimo {v} (rif. 0–5°).', { v: d1(kMin) }),
          T('Il ginocchio va oltre l’estensione in carico e si blocca passivamente. Compatibile con deficit del quadricipite, poca flessione dorsale della caviglia o ipertono dei flessori plantari che frena l’avanzamento della tibia.'),
          T('Forza del quadricipite, flessione dorsale passiva, tono del tricipite surale.'));
        if (hMin > -3) add(hMin > 2 ? 'r' : 'y', T('Estensione dell’anca {sf} ridotta a fine appoggio', A), T('Estensione massima {v} (rif. ≈ −10°).', { v: d1(hMin) }),
          T('L’anca non va in estensione nell’appoggio terminale: il corpo avanza meno sull’arto in carico e il passo opposto si accorcia. Compatibile con retrazione dei flessori dell’anca, tronco flesso in avanti o spinta ridotta.'),
          T('Test di Thomas, postura del tronco e del bacino.'));
        if (hMax < 20) add(hMax < 15 ? 'r' : 'y', T('Flessione dell’anca {sf} ridotta in oscillazione', A), T('Flessione massima {v} (rif. ≈ 30°).', { v: d1(hMax) }),
          T('L’arto avanza poco in oscillazione e il passo si accorcia. Compatibile con debolezza dei flessori dell’anca, rigidità o cammino molto lento.'), T('Forza dei flessori dell’anca, mobilità dell’anca.'));
        if (aMin > -8) add(aMin > -4 ? 'r' : 'y', T('Spinta della caviglia {sf} ridotta (push-off)', A), T('Flessione plantare massima {v} (rif. ≈ −20°).', { v: d1(aMin) }),
          T('In pre-oscillazione la caviglia genera la spinta che fa avanzare l’arto. Con poca flessione plantare la propulsione cala: diminuiscono la velocità e la lunghezza del passo opposto, e il ginocchio si piega meno in oscillazione.'),
          T('Forza del tricipite surale (sollevamento sulla punta di un piede), dolore all’avampiede o al tendine d’Achille.'));
        if (aMax < 4) add(aMax < 0 ? 'r' : 'y', T('Flessione dorsale della caviglia {sf} ridotta', A), T('Flessione dorsale massima {v} (rif. ≈ 10°).', { v: d1(aMax) }),
          T('In appoggio la tibia avanza poco sopra il piede e il tallone tende a staccarsi presto; in oscillazione la punta resta bassa e aumenta il rischio di inciampo.'),
          T('Flessione dorsale passiva (retrazione del tricipite), forza dei flessori dorsali (tibiale anteriore).'));
      });
    }
    const notes = [];
    if (r.nSteps < 8) notes.push(T('Pochi contatti del piede ({n}): le medie sono sensibili al singolo passo.', { n: r.nSteps }));
    notes.push(view === 'lato' ? T('La gamba più lontana dal telefono è in parte nascosta: i suoi angoli sono meno precisi.') : T('Gli angoli sul piano frontale sono misurati in 2D: una rotazione dell’arto li può alterare.'));
    notes.push(T('Angoli da video senza marcatori: precisione indicativa di circa ±5°.'));
    P.sort((a, b) => (a.fl === b.fl ? 0 : a.fl === 'r' ? -1 : 1));
    const main = P.filter((x) => x.fl === 'r'); const lead = (main.length ? main : P).slice(0, 3).map((x) => x.title);
    const synth = P.length ? T('Quadro principale: ') + lead.join('; ') + '.' : T('Nessuno schema di alterazione riconosciuto: tempi, simmetria e angoli misurati rientrano nei riferimenti.');
    return { list: P, notes, synth };
  }
  function patternsHtml(entry) {
    const p = patterns(entry.r, entry.view);
    return '<div class="gt-read gt-interp"><h3>' + T('Interpretazione biomeccanica') + '</h3><p class="small muted" style="margin:0 0 8px">' + T('Per il professionista: schemi riconosciuti dai numeri, con il significato meccanico e cosa verificare. Sono ipotesi, non una diagnosi.') + '</p>' +
      '<p class="gt-synth">' + esc(p.synth) + '</p>' +
      p.list.map((x) => '<div class="gt-pat"><h4><span aria-hidden="true">' + DOT[x.fl] + '</span> ' + esc(x.title) + '</h4><p><b>' + T('Dati') + ':</b> ' + esc(x.ev) + '</p><p><b>' + T('Significato') + ':</b> ' + esc(x.mean) + '</p><p><b>' + T('Da verificare') + ':</b> ' + esc(x.check) + '</p></div>').join('') +
      '<p class="small muted" style="margin:8px 0 0"><b>' + T('Affidabilità della misura') + ':</b> ' + p.notes.map(esc).join(' ') + '</p></div>';
  }

  function readingHtml(entry) {
    const rows = evaluate(entry.r, entry.view); const sum = summary(entry.r, entry.view, rows); const cmp = comparisons(entry);
    return '<div class="card gt-read"><h3>' + T('Lettura dei risultati') + '</h3><ul class="gt-sum">' + sum.map((x) => '<li><span aria-hidden="true">' + DOT[x.fl] + '</span> ' + esc(x.t) + '</li>').join('') + '</ul>' +
      (cmp.length ? '<h4>' + T('Confronti') + '</h4><ul class="gt-sum">' + cmp.map((x) => '<li>📈 ' + esc(x) + '</li>').join('') + '</ul>' : '') +
      '<div class="pz-table-wrap"><table class="pz-table gt-table"><thead><tr><th></th><th>' + T('Sinistro') + '</th><th>' + T('Destro') + '</th></tr></thead><tbody>' +
      rows.map((x) => '<tr><th>' + esc(x.label) + '<br><small class="muted">' + T('rif.') + ' ' + esc(x.ref) + '</small></th>' + (x.both ? '<td colspan="2">' + DOT[x.fl[0]] + ' ' + x.fmtv(x.L) + '</td>' : '<td>' + DOT[x.fl[0]] + ' ' + x.fmtv(x.L) + '</td><td>' + DOT[x.fl[1]] + ' ' + x.fmtv(x.R) + '</td>') + '</tr>').join('') +
      '</tbody></table></div><p class="small muted" style="margin:6px 0 0">' + T('🟢 vicino al riferimento · 🟡 da osservare · 🔴 lontano dal riferimento. Riferimenti indicativi per un adulto: l’interpretazione spetta al professionista.') + '</p></div>';
  }

  /* ───────── report PDF dell'analisi del cammino ───────── */
  async function makePdf(entry, snaps) {
    const { jsPDF } = await window.EqReportPdf.load();
    const logo = await fetch('img/logo.png').then((x) => x.blob()).then((b) => new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(b); })).catch(() => null);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 14, CW = W - 2 * M;
    const rgb = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const font = (size, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); };
    const ink = (c) => doc.setTextColor(...rgb(c));
    const plain = (x) => String(x).replace(/<[^>]+>/g, '').replace(/[–—−]/g, '-').replace(/[«»]/g, '"').replace(/’/g, "'").replace(/≈/g, '~').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/→/g, '->').replace(/[🟢🟡🔴⚪📈]/gu, '');
    const FL = { g: '#2FA36B', y: '#E0A419', r: '#C8372D', '': '#B8BCC8' };
    const r = entry.r; const side = entry.view === 'lato';
    let y = 0;
    const head = () => { if (logo) doc.addImage(logo, 'PNG', M, 9, 34, 34 * 107 / 471); font(9, false); ink('#5D6480'); doc.text(plain(T('Analisi del cammino')) + ' · ' + dateStr(entry.t), W - M, 14, { align: 'right' }); y = 22; };
    const need = (h) => { if (y + h > H - 22) { doc.addPage(); head(); } };
    head();
    doc.setFillColor(...rgb('#29235C')); doc.roundedRect(M, y, CW, 24, 4, 4, 'F');
    font(16, true); ink('#FFFFFF'); doc.text(plain(T('Report dell’analisi del cammino')), M + 6, y + 10);
    font(10, false); ink('#D9D7EE');
    doc.text(plain((side ? T('Video di lato') : T('Video di fronte')) + ' · ' + (entry.cond === 'con' ? T('con Equistasi') : T('senza Equistasi')) + ' · ' + dateStr(entry.t) + ' · ' + T('{n} contatti del piede', { n: r.nSteps })), M + 6, y + 17.5);
    y += 30;
    // riassunto
    const rows = evaluate(r, entry.view); const sum = summary(r, entry.view, rows); const cmp = comparisons(entry);
    font(12, true); ink('#29235C'); doc.text(plain(T('Lettura dei risultati')), M, y + 4); y += 8;
    sum.forEach((x) => { font(10, false); const t = doc.splitTextToSize(plain(x.t), CW - 8); need(t.length * 4.6 + 2); doc.setFillColor(...rgb(FL[x.fl])); doc.circle(M + 2, y + 1.6, 1.6, 'F'); ink('#161A33'); doc.text(t, M + 6, y + 3); y += t.length * 4.6 + 1.5; });
    if (cmp.length) { y += 2; font(11, true); ink('#29235C'); need(10); doc.text(plain(T('Confronti')), M, y + 4); y += 8; cmp.forEach((c) => { font(10, false); ink('#161A33'); const t = doc.splitTextToSize(plain(c), CW - 4); need(t.length * 4.6); doc.text(t, M + 2, y + 3); y += t.length * 4.6 + 1; }); }
    // interpretazione biomeccanica
    const pat = patterns(r, entry.view);
    y += 3; need(22); font(12, true); ink('#29235C'); doc.text(plain(T('Interpretazione biomeccanica')), M, y + 4); y += 7;
    font(8.5, false); ink('#5D6480'); { const t = doc.splitTextToSize(plain(T('Per il professionista: schemi riconosciuti dai numeri, con il significato meccanico e cosa verificare. Sono ipotesi, non una diagnosi.')), CW); doc.text(t, M, y + 3); y += t.length * 4 + 2; }
    font(10, true); ink('#161A33'); { const t = doc.splitTextToSize(plain(pat.synth), CW); need(t.length * 4.6 + 2); doc.text(t, M, y + 3); y += t.length * 4.6 + 2; }
    pat.list.forEach((x) => {
      font(10, true); const tt = doc.splitTextToSize(plain(x.title), CW - 8); need(tt.length * 4.6 + 14);
      doc.setFillColor(...rgb(FL[x.fl])); doc.circle(M + 2, y + 2.6, 1.6, 'F'); ink('#29235C'); doc.text(tt, M + 6, y + 4); y += tt.length * 4.6 + 1.5;
      [[T('Dati'), x.ev], [T('Significato'), x.mean], [T('Da verificare'), x.check]].forEach(([k, v]) => {
        font(9.5, false); const t = doc.splitTextToSize(plain(k + ': ' + v), CW - 8); need(t.length * 4.3 + 1); ink('#161A33'); doc.text(t, M + 6, y + 3);
        ink('#29235C'); doc.text(plain(k) + ':', M + 6, y + 3); y += t.length * 4.3 + 0.8;
      });
      y += 2.5;
    });
    font(8.5, false); ink('#5D6480'); { const t = doc.splitTextToSize(plain(T('Affidabilità della misura') + ': ' + pat.notes.join(' ')), CW); need(t.length * 4 + 2); doc.text(t, M, y + 3); y += t.length * 4 + 1; }
    // tabella
    y += 4; need(14); font(12, true); ink('#29235C'); doc.text(plain(T('Valori misurati')), M, y + 4); y += 7;
    const cx = [M, M + 76, M + 112, M + 148];
    doc.setFillColor(...rgb('#EEF1FB')); doc.rect(M, y, CW, 7, 'F'); font(9, true); ink('#5D6480');
    [T('Parametro'), T('Sinistro'), T('Destro'), T('Riferimento')].forEach((h, i) => doc.text(plain(h), cx[i] + 2, y + 4.8)); y += 7;
    rows.forEach((x, k) => {
      need(7); if (k % 2) { doc.setFillColor(...rgb('#F7F8FC')); doc.rect(M, y, CW, 7, 'F'); }
      font(9.5, false); ink('#161A33'); doc.text(plain(x.label), cx[0] + 2, y + 4.8);
      const cell = (v, fl, col) => { doc.setFillColor(...rgb(FL[fl || ''])); doc.circle(cx[col] + 3.5, y + 3.4, 1.5, 'F'); ink('#161A33'); doc.text(plain(x.fmtv(v)), cx[col] + 7, y + 4.8); };
      if (x.both) cell(x.L, x.fl[0], 1); else { cell(x.L, x.fl[0], 1); cell(x.R, x.fl[1], 2); }
      font(8.5, false); ink('#5D6480'); doc.text(plain(x.ref), cx[3] + 2, y + 4.8); y += 7;
    });
    // tempi
    need(16); y += 4; font(9, false); ink('#5D6480');
    doc.text(plain(T('Ciclo del passo sx/dx: {a} / {b} s · Oscillazione sx/dx: {c}% / {d}% · Tempo del passo sx/dx: {e} / {f} s', { a: fmt(r.L.cycle, 2), b: fmt(r.R.cycle, 2), c: Math.round(r.L.swing), d: Math.round(r.R.swing), e: fmt(r.L.step, 2), f: fmt(r.R.step, 2) })), M, y + 3); y += 6;
    // fasi
    if (entry.phases) {
      need(30); y += 2; font(11, true); ink('#29235C'); doc.text(plain(T('Fasi del ciclo del passo')), M, y + 4); y += 7;
      ['L', 'R'].forEach((s) => { const fr = entry.phases[s]; if (!fr) return; font(9, false); ink('#161A33'); doc.text(plain(s === 'L' ? T('Sinistro') : T('Destro')), M, y + 4); let x = M + 20; fr.forEach((f, p) => { const w = (CW - 20) * f; doc.setFillColor(...rgb(PH_COL[p])); doc.rect(x, y, Math.max(0.3, w), 5.5, 'F'); x += w; }); y += 8; });
      font(7.5, false); ink('#5D6480'); const leg = PHASES().map((n, p) => (p + 1) + ' ' + n).join(' · '); doc.text(doc.splitTextToSize(plain(leg), CW), M, y + 2); y += 8;
    }
    // grafici
    const charts = side ? [['hipL', 'hipR', T('Anca (piano sagittale)')], ['knL', 'knR', T('Ginocchio (piano sagittale)')], ['anL', 'anR', T('Caviglia (piano sagittale)')]]
      : [['pelL', 'pelR', T('Caduta del bacino dal lato opposto')], ['knL', 'knR', T('Ginocchio sul piano frontale')]];
    const C = entry.r.curves || entry.curves;
    if (C) {
      const cw = (CW - 6 * (charts.length - 1)) / charts.length; const ch = 34; need(ch + 14); y += 2;
      charts.forEach(([a, b, label], i) => {
        const x0 = M + i * (cw + 6); const A = C[a] || []; const B = C[b] || []; const vals = A.concat(B).filter((v) => v != null);
        font(9, true); ink('#29235C'); doc.text(plain(label), x0, y + 3);
        doc.setDrawColor(...rgb('#E1E5EF')); doc.setLineWidth(0.3); doc.rect(x0, y + 5, cw, ch);
        if (!vals.length) return;
        const lo = Math.min(0, ...vals) - 2; const hi = Math.max(0, ...vals) + 2; const yy = (v) => y + 5 + ch - (v - lo) / (hi - lo) * ch; const xx = (k) => x0 + k / 50 * cw;
        doc.setDrawColor(...rgb('#B8BCC8')); doc.line(x0, yy(0), x0 + cw, yy(0));
        [[A, '#2FBF71'], [B, '#3A8EE6']].forEach(([arr, col]) => { doc.setDrawColor(...rgb(col)); doc.setLineWidth(0.6); let prev = null; arr.forEach((v, k) => { if (v == null) { prev = null; return; } if (prev) doc.line(xx(prev[0]), yy(prev[1]), xx(k), yy(v)); prev = [k, v]; }); });
        font(7, false); ink('#5D6480'); doc.text(fmt(hi, 0) + '°', x0 + 1, y + 8); doc.text(fmt(lo, 0) + '°', x0 + 1, y + 4 + ch);
      });
      y += ch + 8; font(7.5, false); ink('#5D6480'); doc.text(plain(T('0-100% del ciclo · verde sinistro, blu destro')), M, y); y += 4;
    }
    // immagini dal video
    if (snaps && snaps.length) {
      const iw = Math.min(56, (CW - 8) / snaps.length); need(10);
      font(11, true); ink('#29235C'); doc.text(plain(T('Immagini dal video')), M, y + 5); y += 8;
      let maxh = 0; snaps.forEach((sn, i) => { const ip = doc.getImageProperties(sn.img); const ih = iw * ip.height / ip.width; maxh = Math.max(maxh, ih); });
      need(maxh + 8);
      snaps.forEach((sn, i) => { const ip = doc.getImageProperties(sn.img); const ih = iw * ip.height / ip.width; doc.addImage(sn.img, 'JPEG', M + i * (iw + 4), y, iw, ih); font(8, false); ink('#5D6480'); doc.text(plain(sn.label), M + i * (iw + 4), y + ih + 4); });
      y += maxh + 8;
    }
    const tot = doc.getNumberOfPages();
    for (let n = 1; n <= tot; n++) {
      doc.setPage(n); font(7.5, false); ink('#5D6480');
      doc.text(doc.splitTextToSize(plain(ESTIMATE() + '. ' + T('Misure da un solo video, approssimate: non sostituiscono un laboratorio di analisi del movimento né la valutazione clinica. Riferimenti indicativi per un adulto.')), CW - 20), M, H - 12);
      doc.text(n + ' / ' + tot, W - M, H - 12, { align: 'right' });
    }
    return doc.output('blob');
  }
  async function deliverPdf(entry, snaps, dl, msgEl) {
    msgEl.className = 'small muted'; msgEl.textContent = T('Preparo il PDF…');
    try {
      const blob = await makePdf(entry, snaps);
      const how = await window.EqReportPdf.deliver(blob, 'Equistasi-cammino-' + new Date(entry.t).toISOString().slice(0, 10) + '.pdf', dl, T('Analisi del cammino'));
      msgEl.className = 'small ts-done'; msgEl.textContent = how === 'download' ? T('PDF scaricato: lo trovi nella cartella dei download.') : how === 'share' ? T('PDF pronto.') : '';
    } catch (e) { msgEl.className = 'small err'; msgEl.textContent = T('Non è stato possibile creare il PDF. Riprova.'); }
  }

  /* ───────── pagine ───────── */
  const head = (title, sub) => '<div class="detail-head"><div class="eyebrow">' + T('Professionista') + ' · <span class="beta-tag">' + T('in prova') + '</span></div><h1>' + title + '</h1>' + (sub ? '<p class="small muted" style="margin:6px 0 0">' + sub + '</p>' : '') + '</div>';
  const NOTE = () => '<p class="small muted" style="margin-top:14px">' + ESTIMATE() + '. ' + T('Le misure da un solo video sono approssimate: non sostituiscono un laboratorio di analisi del movimento.') + '</p>';
  let stop = false; let rafId = 0;
  function cleanup() { stop = true; cancelAnimationFrame(rafId); }

  const VIEWS = () => ({ fronte: T('Video di fronte'), lato: T('Video di lato') });
  function howTo(view) {
    const li = (x) => '<li>' + x + '</li>';
    if (view === 'lato') {
      return [T('Appoggia il telefono <b>fermo, in orizzontale</b>, all’altezza del bacino (circa 1 metro), a <b>3–4 metri</b> dal percorso.'),
        T('Il paziente cammina <b>di lato al telefono</b>, da una parte all’altra, a passo normale: inizia a camminare prima di entrare nell’inquadratura.'),
        T('Deve vedersi <b>tutto il corpo, piedi compresi</b>, per almeno 3–4 passi. Meglio abiti aderenti e buona luce.'),
        T('Per velocità e lunghezza del passo in metri inserisci l’<b>altezza del paziente</b>.')].map(li).join('');
    }
    return [T('Appoggia il telefono <b>fermo, in verticale</b>, all’altezza del bacino (circa 1 metro), su un treppiede o una sedia.'),
      T('Il paziente parte a <b>6–7 metri</b> e cammina <b>verso il telefono</b> a passo normale, per almeno 4–5 passi.'),
      T('Deve vedersi <b>tutto il corpo, piedi compresi</b>, per tutto il video. Meglio abiti aderenti e buona luce.'),
      T('Registra 6–10 secondi, poi fermati prima che il paziente arrivi troppo vicino.')].map(li).join('');
  }

  function render(app) {
    cleanup(); stop = false;
    if (!prefs.view) prefs.view = 'fronte';
    const seg = (k, opts) => '<div class="seg" role="group">' + opts.map(([v, l]) => '<button type="button" data-gp="' + k + '" data-val="' + v + '" aria-pressed="' + (prefs[k] === v) + '">' + l + '</button>').join('') + '</div>';
    app.innerHTML = head(T('Analisi del cammino'), T('Fasi del passo, piano frontale (video di fronte) e piano sagittale con velocità e lunghezza del passo (video di lato).')) +
      '<div class="home-grid"><div>' +
      '<div class="card">' + seg('view', [['fronte', '🧍 ' + VIEWS().fronte], ['lato', '🚶 ' + VIEWS().lato]]) +
      '<h3 style="margin-top:14px">' + T('Come fare il video') + '</h3><ol class="steps" id="gt-how">' + howTo(prefs.view) + '</ol>' +
      '<p class="small muted" style="margin:0">' + T('Il video resta sul telefono: non viene inviato a nessuno.') + '</p></div>' +
      '<div class="card"><label class="small" style="display:block;margin-bottom:6px"><b>' + T('Condizione') + '</b></label>' + seg('cond', [['senza', T('Senza Equistasi')], ['con', T('Con Equistasi')]]) +
      '<label class="small" style="display:block;margin:12px 0 6px" for="gt-h"><b>' + T('Altezza del paziente (cm, facoltativa)') + '</b></label><input id="gt-h" type="number" inputmode="numeric" min="100" max="220" value="' + esc(prefs.h) + '" style="max-width:140px" />' +
      '<div class="actions" style="margin-top:14px"><label class="btn primary" for="gt-file">🎥 ' + T('Registra o scegli il video') + '</label><input id="gt-file" type="file" accept="video/*" capture="environment" hidden /></div>' +
      '<div id="gt-prog" hidden><p class="small" id="gt-prog-t"></p><div class="gt-progress"><i id="gt-prog-b"></i></div><button type="button" class="btn" id="gt-cancel">' + T('Annulla') + '</button></div>' +
      '<p class="small err" id="gt-err"></p></div>' +
      '</div><div>' + historyHtml() + '</div></div><div id="gt-out"></div>' + NOTE();
    app.querySelectorAll('[data-gp]').forEach((b) => b.addEventListener('click', () => {
      prefs[b.dataset.gp] = b.dataset.val; savePrefs();
      app.querySelectorAll('[data-gp="' + b.dataset.gp + '"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (b.dataset.gp === 'view') { app.querySelector('#gt-how').innerHTML = howTo(prefs.view); app.querySelector('#gt-out').innerHTML = ''; }
    }));
    app.querySelector('#gt-h').addEventListener('change', (e) => { prefs.h = e.target.value; savePrefs(); });
    app.querySelector('#gt-file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) run(app, f); e.target.value = ''; });
    app.querySelectorAll('[data-gt-pdf]').forEach((b) => b.addEventListener('click', () => {
      const t = +b.dataset.gtPdf; const e = store.get(KEY, []).find((x) => x.t === t); const m = app.querySelector('[data-gt-msg="' + t + '"]');
      if (e && m) deliverPdf(Object.assign({ view: 'fronte' }, e), [], false, m);
    }));
  }

  async function run(app, file) {
    let cancel = false; stop = false;
    const view = prefs.view === 'lato' ? 'lato' : 'fronte';
    const prog = app.querySelector('#gt-prog'); const bar = app.querySelector('#gt-prog-b'); const txt = app.querySelector('#gt-prog-t'); const err = app.querySelector('#gt-err');
    err.textContent = ''; prog.hidden = false; txt.textContent = T('Preparo il riconoscimento del corpo…'); bar.style.width = '2%';
    app.querySelector('#gt-cancel').onclick = () => { cancel = true; };
    try {
      const rec = await track(file, (p) => { txt.textContent = T('Analizzo il video… {p}%', { p: Math.round(p * 100) }); bar.style.width = Math.round(p * 100) + '%'; }, () => cancel || stop);
      if (cancel || stop) { prog.hidden = true; return; }
      txt.textContent = T('Calcolo le fasi del passo…');
      const out = view === 'lato' ? analyseSide(rec) : analyse(rec);
      prog.hidden = true;
      if (out.error) {
        err.textContent = out.error === 'body' ? T('Non vedo bene tutto il corpo nel video: rifallo con la persona intera, piedi compresi, e più luce.')
          : out.error === 'across' ? T('Nel video di lato il paziente deve attraversare l’inquadratura da una parte all’altra. Se cammina verso il telefono, scegli «Video di fronte».')
            : T('Non ho trovato abbastanza passi: servono almeno 4–5 passi interi. Rifai il video partendo più lontano.');
        return;
      }
      const rd = (v) => (v == null || !isFinite(v) ? null : Math.round(v * 10) / 10);
      const curves = {}; Object.keys(out.res.curves || {}).forEach((k) => { const c = out.res.curves[k]; curves[k] = Array.isArray(c) ? c.map(rd) : c; });
      const phases = {}; ['L', 'R'].forEach((sd) => {
        const cs = out.cycles.filter((c) => c.side === sd && c.bounds); if (!cs.length) return;
        phases[sd] = PH_COL.map((_, ph) => Math.round(cs.reduce((a, c) => a + (c.bounds[ph + 1] - c.bounds[ph]) / (c.b - c.a), 0) / cs.length * 1000) / 1000);
      });
      const saved = { t: Date.now(), view, cond: prefs.cond, r: Object.assign({}, out.res, { curves: undefined }), curves, phases };
      const all = store.get(KEY, []); all.push(saved); store.set(KEY, all.slice(-40));
      showResult(app, file, rec, out, view, saved);
    } catch (e) {
      prog.hidden = true;
      err.textContent = e && e.message === 'video' ? T('Non riesco a leggere questo video. Prova a registrarlo di nuovo.') : T('Il riconoscimento del corpo non è disponibile su questo telefono o senza connessione. Riprova più tardi.');
    }
  }

  const pct = (v) => (isFinite(v) ? fmt(v, 0) + '%' : '–'); const dgr = (v) => (isFinite(v) ? fmt(v, 1) + '°' : '–'); const sec = (v) => (isFinite(v) ? fmt(v, 2) + ' s' : '–');
  const trow = (label, l, rr, note) => '<tr><th>' + label + (note ? '<br><small class="muted">' + note + '</small>' : '') + '</th><td>' + l + '</td><td>' + rr + '</td></tr>';
  const thead = () => '<div class="pz-table-wrap"><table class="pz-table gt-table"><thead><tr><th></th><th>' + T('Sinistro') + '</th><th>' + T('Destro') + '</th></tr></thead><tbody>';
  const timeRows = (r) => trow(T('Durata del ciclo del passo'), sec(r.L.cycle), sec(r.R.cycle), T('da un contatto al successivo dello stesso piede')) +
    trow(T('Fase di appoggio'), pct(r.L.stance), pct(r.R.stance), T('riferimento circa 60%')) +
    trow(T('Fase di oscillazione'), pct(r.L.swing), pct(r.R.swing), T('riferimento circa 40%')) +
    trow(T('Tempo del passo'), sec(r.L.step), sec(r.R.step));
  const kpi = (v, label) => '<div><b>' + v + '</b><span>' + label + '</span></div>';

  function metricsHtml(r) {
    const kv = (v) => (isFinite(v) ? fmt(Math.abs(v), 1) + '° ' + (Math.abs(v) < 2 ? T('allineato') : v > 0 ? T('valgo') : T('varo')) : '–');
    return thead() + timeRows(r) +
      trow(T('Caduta del bacino dal lato opposto'), dgr(r.L.drop), dgr(r.R.drop), T('nel singolo appoggio di questo arto')) +
      trow(T('Inclinazione del tronco verso l’arto in appoggio'), dgr(r.L.lean), dgr(r.R.lean)) +
      trow(T('Ginocchio nella prima parte dell’appoggio'), kv(r.L.knee), kv(r.R.knee), T('valgo: verso l’interno · varo: verso l’esterno')) +
      '</tbody></table></div><div class="gt-kpis">' +
      kpi(isFinite(r.cadence) ? Math.round(r.cadence) : '–', T('passi/min (cadenza)')) + kpi(pct(r.ds), T('doppio appoggio (rif. circa 20%)')) +
      kpi(pct(r.symStance), T('simmetria dell’appoggio dx/sx')) + kpi(pct(r.symStep), T('simmetria del tempo del passo')) +
      kpi(r.widthCm ? '≈ ' + fmt(r.widthCm, 0) + ' cm' : pct(r.width), r.widthCm ? T('larghezza del passo') : T('larghezza del passo rispetto alla distanza tra le anche')) + '</div>';
  }
  function metricsSideHtml(r) {
    const len = (v) => (isFinite(v) ? (r.metric ? fmt(v, 2) + ' m' : fmt(v, 2) + ' ' + T('gambe')) : '–');
    const rng = (o) => (isFinite(o.max) ? dgr(o.max) + ' / ' + dgr(o.min) : '–');
    return thead() + timeRows(r) +
      trow(T('Lunghezza del passo'), len(r.L.stepLen), len(r.R.stepLen), T('tallone davanti – tallone dietro, al contatto')) +
      trow(T('Lunghezza del ciclo (falcata)'), len(r.L.strideLen), len(r.R.strideLen)) +
      trow(T('Anca: flessione max / estensione'), rng(r.L.hip), rng(r.R.hip), T('riferimento circa +30° / −10°')) +
      trow(T('Ginocchio: flessione max / min'), rng(r.L.knee), rng(r.R.knee), T('riferimento circa 60° in oscillazione, 0–5° in appoggio')) +
      trow(T('Caviglia: flessione dorsale max / plantare'), rng(r.L.ankle), rng(r.R.ankle), T('riferimento circa +10° / −20°')) +
      '</tbody></table></div><div class="gt-kpis">' +
      kpi(isFinite(r.speed) ? (r.metric ? fmt(r.speed, 2) + ' m/s' : fmt(r.speed, 2)) : '–', r.metric ? T('velocità del cammino') : T('velocità (lunghezze di gamba al secondo): inserisci l’altezza per i metri')) +
      kpi(isFinite(r.cadence) ? Math.round(r.cadence) : '–', T('passi/min (cadenza)')) + kpi(pct(r.ds), T('doppio appoggio (rif. circa 20%)')) +
      kpi(pct(r.symStance), T('simmetria dell’appoggio dx/sx')) + kpi(pct(r.symLen), T('simmetria della lunghezza del passo')) + '</div>';
  }

  function showResult(app, file, rec, out, view, entry) {
    const r = out.res; const ph = PHASES(); const side = view === 'lato';
    const box = app.querySelector('#gt-out');
    const charts = side
      ? chart(r.curves.hipL, r.curves.hipR, T('Anca (piano sagittale)'), T('+ flessione · − estensione'), r.curves.stL, r.curves.stR) +
        chart(r.curves.knL, r.curves.knR, T('Ginocchio (piano sagittale)'), T('+ flessione'), r.curves.stL, r.curves.stR) +
        chart(r.curves.anL, r.curves.anR, T('Caviglia (piano sagittale)'), T('+ flessione dorsale · − plantare'), r.curves.stL, r.curves.stR)
      : chart(r.curves.pelL, r.curves.pelR, T('Caduta del bacino dal lato opposto'), T('gradi, sul ciclo dell’arto'), r.curves.stL, r.curves.stR) +
        chart(r.curves.knL, r.curves.knR, T('Ginocchio sul piano frontale'), T('+ valgo · − varo'), r.curves.stL, r.curves.stR);
    box.innerHTML = '<div class="card gt-result"><h3>' + (side ? T('Risultato · video di lato') : T('Risultato · video di fronte')) + ' <span class="small muted">· ' + (prefs.cond === 'con' ? T('con Equistasi') : T('senza Equistasi')) + ' · ' + T('{n} contatti del piede', { n: r.nSteps }) + '</span></h3>' +
      '<div class="gt-video' + (side ? ' wide' : '') + '"><video id="gt-v" playsinline muted></video><canvas id="gt-c"></canvas></div>' +
      '<div class="gt-ctrl"><button type="button" class="btn" id="gt-play">▶︎ ' + T('Riproduci') + '</button>' +
      '<div class="seg" role="group" aria-label="' + T('Velocità') + '">' + [[0.25, '¼×'], [0.5, '½×'], [1, '1×']].map(([v, l]) => '<button type="button" data-rate="' + v + '" aria-pressed="' + (v === 0.25) + '">' + l + '</button>').join('') + '</div>' +
      '<input type="range" id="gt-seek" min="0" max="' + (rec.frames.length - 1) + '" value="0" aria-label="' + T('Fotogramma') + '" /></div>' +
      '<h4>' + T('Fasi del ciclo del passo') + '</h4>' +
      ['L', 'R'].map((s) => '<div class="gt-barrow"><span>' + (s === 'L' ? T('Sinistro') : T('Destro')) + '</span>' + phaseBar(out.cycles, s) + '</div>').join('') +
      '<div class="gt-legend">' + ph.map((n, p) => '<button type="button" data-ph="' + p + '"><i style="background:' + PH_COL[p] + '"></i>' + (p + 1) + '. ' + n + '</button>').join('') + '</div>' +
      '<p class="small muted">' + T('Tocca una fase per fermare il video in quel momento (piede sinistro, primo ciclo).') + '</p>' +
      (side ? metricsSideHtml(r) : metricsHtml(r)) +
      '<div class="gt-charts">' + charts + '</div>' + (entry ? readingHtml(entry).replace('<div class="card gt-read">', '<div class="gt-read">') + patternsHtml(entry) : '') +
      '<p class="small muted">' + T('Linee verdi: lato sinistro · blu: lato destro · gialle: bacino e spalle. La riga tratteggiata è l’orizzontale del bacino.') + '</p>' +
      '<div class="gt-pdf"><button type="button" class="btn primary" id="gt-pdf">📄 ' + T('Report PDF') + '</button><span id="gt-pdf-msg" class="small muted"></span></div>' +
      '<p class="small muted">' + ESTIMATE() + '. ' + (side ? T('Visto di lato, la gamba più lontana dal telefono è in parte nascosta: i suoi valori sono meno precisi.') : T('Velocità, lunghezza del passo e angoli di anca, ginocchio e caviglia si misurano con il video di lato.')) + '</p></div>';
    const v = box.querySelector('#gt-v'); const c = box.querySelector('#gt-c'); const g = c.getContext('2d');
    v.src = URL.createObjectURL(file); v.playbackRate = 0.25;
    v.addEventListener('loadedmetadata', () => { const k = Math.min(1, 720 / Math.max(rec.W, rec.H)); c.width = Math.round(rec.W * k); c.height = Math.round(rec.H * k); c.dataset.k = k; paint(); });
    const frameIdx = () => Math.max(0, Math.min(rec.frames.length - 1, Math.round(v.currentTime * FPS)));
    function paint() {
      const k = +c.dataset.k || 1; g.clearRect(0, 0, c.width, c.height);
      g.drawImage(v, 0, 0, c.width, c.height);
      const i = frameIdx(); drawFrame(g, rec.frames[i], k, out.cycles, i, out.J);
      box.querySelector('#gt-seek').value = i;
    }
    const loop = () => { paint(); if (!v.paused && !stop) rafId = requestAnimationFrame(loop); };
    v.addEventListener('play', () => { rafId = requestAnimationFrame(loop); box.querySelector('#gt-play').textContent = '❚❚ ' + T('Pausa'); });
    v.addEventListener('pause', () => { box.querySelector('#gt-play').textContent = '▶︎ ' + T('Riproduci'); });
    v.addEventListener('seeked', paint);
    v.addEventListener('ended', () => { v.currentTime = 0; });
    box.querySelector('#gt-play').onclick = () => { if (v.paused) v.play(); else v.pause(); };
    box.querySelectorAll('[data-rate]').forEach((b) => b.addEventListener('click', () => { v.playbackRate = +b.dataset.rate; box.querySelectorAll('[data-rate]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
    box.querySelector('#gt-seek').addEventListener('input', (e) => { v.pause(); v.currentTime = (+e.target.value) / FPS; });
    box.querySelectorAll('[data-ph]').forEach((b) => b.addEventListener('click', () => {
      const cyc = out.cycles.find((x) => x.side === 'L') || out.cycles[0]; const p = +b.dataset.ph;
      v.pause(); v.currentTime = Math.round((cyc.bounds[p] + cyc.bounds[p + 1]) / 2) / FPS;
    }));
    // immagini dal video per il PDF: contatto iniziale, appoggio medio e oscillazione media del piede sinistro
    async function snaps() {
      const cyc = out.cycles.find((x) => x.side === 'L') || out.cycles[0]; if (!cyc || !cyc.bounds) return [];
      const k = Math.min(1, 480 / Math.max(rec.W, rec.H)); const cv = document.createElement('canvas'); cv.width = Math.round(rec.W * k); cv.height = Math.round(rec.H * k); const gg = cv.getContext('2d');
      const sideName = cyc.side === 'L' ? T('sinistro') : T('destro');
      const picks = [[cyc.bounds[0], T('Contatto iniziale')], [Math.round((cyc.bounds[2] + cyc.bounds[3]) / 2), T('Appoggio medio')], [Math.round((cyc.bounds[6] + cyc.bounds[7]) / 2), T('Oscillazione media')]];
      const res = []; v.pause();
      for (const [i0, label] of picks) {
        const i = Math.max(0, Math.min(rec.frames.length - 1, Math.round(i0)));
        await new Promise((ok) => { const done = () => { v.removeEventListener('seeked', done); ok(); }; v.addEventListener('seeked', done); setTimeout(done, 2000); v.currentTime = i / FPS; });
        try { gg.drawImage(v, 0, 0, cv.width, cv.height); drawFrame(gg, rec.frames[i], k, out.cycles, i, out.J); res.push({ img: cv.toDataURL('image/jpeg', 0.82), label: label + ' (' + sideName + ')' }); } catch (e) { /* video non disegnabile */ }
      }
      return res;
    }
    if (entry) box.querySelector('#gt-pdf').onclick = async () => { const m = box.querySelector('#gt-pdf-msg'); m.textContent = T('Preparo il PDF…'); deliverPdf(entry, await snaps(), false, m); };
    else box.querySelector('#gt-pdf').hidden = true;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function historyHtml() {
    const l = store.get(KEY, []);
    if (!l.length) return '<div class="card"><h3>' + T('Analisi salvate') + '</h3><p class="small muted" style="margin:0">' + T('Nessuna analisi salvata.') + '</p></div>';
    return '<div class="card"><h3>' + T('Analisi salvate') + '</h3><div class="pz-table-wrap"><table class="pz-table"><tbody>' + l.slice(-8).reverse().map((x) => {
      const r = x.r; const side = x.view === 'lato';
      return '<tr><th>' + dateStr(x.t) + ' · ' + (side ? '🚶 ' + T('di lato') : '🧍 ' + T('di fronte')) + '<br><small class="muted">' + (x.cond === 'con' ? T('con Equistasi') : T('senza Equistasi')) + '</small></th><td><small>' + T('Appoggio sx/dx {a}% / {b}%', { a: Math.round(r.L.stance), b: Math.round(r.R.stance) }) +
        '<br>' + T('Cadenza {c} passi/min · simmetria {s}%', { c: Math.round(r.cadence), s: Math.round(r.symStance) }) +
        (side && r.metric && isFinite(r.speed) ? '<br>' + T('Velocità {v} m/s', { v: fmt(r.speed, 2) }) : '') + '</small><br><button type="button" class="btn gt-hpdf" data-gt-pdf="' + x.t + '">📄 ' + T('Report PDF') + '</button> <span class="small muted" data-gt-msg="' + x.t + '"></span></td></tr>';
    }).join('') + '</tbody></table></div></div>';
  }

  // righe per il report (web e PDF)
  function reportGroups() {
    const l = store.get(KEY, []); if (!l.length) return [];
    const groups = [];
    const d = (v) => (isFinite(v) ? fmt(v, 1) + '°' : '–');
    ['fronte', 'lato'].forEach((view) => {
      const rows = [];
      ['senza', 'con'].forEach((cond) => {
        const x = l.filter((a) => (a.view || 'fronte') === view && a.cond === cond); if (!x.length) return;
        const a = x[x.length - 1]; const r = a.r; const when = (cond === 'con' ? T('con Equistasi') : T('senza Equistasi')) + ' · ' + dateStr(a.t);
        rows.push({ label: T('Fase di appoggio sx / dx') + ' · ' + when, val: Math.round(r.L.stance) + '% / ' + Math.round(r.R.stance) + '%' });
        rows.push({ label: T('Doppio appoggio · cadenza') + ' · ' + when, val: Math.round(r.ds) + '% · ' + Math.round(r.cadence) + ' ' + T('passi/min') });
        rows.push({ label: T('Simmetria appoggio · tempo del passo') + ' · ' + when, val: Math.round(r.symStance) + '% · ' + Math.round(r.symStep) + '%' });
        if (view === 'fronte') {
          rows.push({ label: T('Caduta del bacino (appoggio sx / dx)') + ' · ' + when, val: d(r.L.drop) + ' / ' + d(r.R.drop) });
          rows.push({ label: T('Inclinazione del tronco (appoggio sx / dx)') + ' · ' + when, val: d(r.L.lean) + ' / ' + d(r.R.lean) });
          rows.push({ label: T('Ginocchio sul piano frontale sx / dx (+ valgo)') + ' · ' + when, val: d(r.L.knee) + ' / ' + d(r.R.knee) });
        } else {
          const len = (v) => (isFinite(v) ? fmt(v, 2) + (r.metric ? ' m' : '') : '–');
          if (r.metric) rows.push({ label: T('Velocità del cammino') + ' · ' + when, val: fmt(r.speed, 2) + ' m/s' });
          rows.push({ label: T('Lunghezza del passo sx / dx') + (r.metric ? '' : ' (' + T('in lunghezze di gamba') + ')') + ' · ' + when, val: len(r.L.stepLen) + ' / ' + len(r.R.stepLen) });
          rows.push({ label: T('Anca flessione max sx / dx') + ' · ' + when, val: d(r.L.hip.max) + ' / ' + d(r.R.hip.max) });
          rows.push({ label: T('Ginocchio flessione max sx / dx') + ' · ' + when, val: d(r.L.knee.max) + ' / ' + d(r.R.knee.max) });
          rows.push({ label: T('Caviglia flessione dorsale max sx / dx') + ' · ' + when, val: d(r.L.ankle.max) + ' / ' + d(r.R.ankle.max) });
        }
      });
      if (rows.length) groups.push({ title: (view === 'lato' ? T('Analisi del cammino · video di lato') : T('Analisi del cammino · video di fronte')) + ' · ' + ESTIMATE(), rows });
    });
    return groups;
  }

  window.addEventListener('hashchange', cleanup);
  window.EqGait = { render, reportGroups, _makePdf: makePdf, _evaluate: evaluate, _patterns: patterns, _analyse: analyse, _analyseSide: analyseSide, _show: showResult };
})();
