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
    // cicli: da un contatto al successivo dello stesso piede, con lo stacco in mezzo
    const cycles = { L: [], R: [] };
    ['L', 'R'].forEach((s) => {
      const { IC, TO } = ev[s];
      for (let k = 0; k + 1 < IC.length; k++) {
        const a = IC[k]; const b = IC[k + 1]; const to = TO.find((x) => x > a && x < b);
        const dur = (b - a) / FPS;
        if (to != null && dur > 0.6 && dur < 2.5) cycles[s].push({ a, b, to, dur, stance: (to - a) / (b - a) });
      }
    });
    if (cycles.L.length + cycles.R.length < 2 || !cycles.L.length || !cycles.R.length) return { error: 'steps' };
    const other = (s) => (s === 'L' ? 'R' : 'L');
    // fasi di ogni ciclo dagli eventi dei due piedi (Perry)
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
    const allC = cycles.L.concat(cycles.R);
    const contacts = ev.L.IC.concat(ev.R.IC).sort((a, b) => a - b);
    const stepT = []; for (let i = 1; i < contacts.length; i++) { const d = (contacts[i] - contacts[i - 1]) / FPS; if (d > 0.3 && d < 1.3) stepT.push(d); }
    // passo destro = dal contatto sinistro al destro (e viceversa)
    const stepSide = { L: [], R: [] };
    for (let i = 1; i < contacts.length; i++) {
      const cur = ev.L.IC.includes(contacts[i]) ? 'L' : 'R'; const prev = ev.L.IC.includes(contacts[i - 1]) ? 'L' : 'R';
      const d = (contacts[i] - contacts[i - 1]) / FPS; if (cur !== prev && d > 0.3 && d < 1.3) stepSide[cur].push(d);
    }
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
    const sym = (a, b) => Math.max(0, 100 - Math.abs(a - b) / ((a + b) / 2) * 100);
    res.symStance = sym(res.L.stance, res.R.stance); res.symStep = sym(res.L.step, res.R.step);
    res.ds = (res.L.ds + res.R.ds) / 2;
    if (prefs.h && +prefs.h > 100) res.widthCm = res.width / 100 * (+prefs.h * 0.105);
    // curve medie sul ciclo (0-100%) per i grafici
    const curve = (sig, s, sign) => { const out = Array(51).fill(0); const cnt = Array(51).fill(0); cycles[s].forEach((c) => { for (let k = 0; k <= 50; k++) { const i = Math.round(c.a + (c.b - c.a) * k / 50); const v = sig[i]; if (v != null) { out[k] += v * sign; cnt[k]++; } } }); return out.map((v, k) => (cnt[k] ? v / cnt[k] : null)); };
    res.curves = { pelL: curve(pel, 'L', 1), pelR: curve(pel, 'R', -1), knL: curve(kn.L, 'L', 1), knR: curve(kn.R, 'R', 1), stL: res.L.stance, stR: res.R.stance };
    return { res, cycles: allC, ev, kn, pel, tr };
  }

  /* ───────── disegni ───────── */
  const LINES = [['shL', 'shR'], ['hipL', 'hipR'], ['shL', 'hipL'], ['shR', 'hipR'], ['hipL', 'kneeL'], ['kneeL', 'ankL'], ['hipR', 'kneeR'], ['kneeR', 'ankR'], ['ankL', 'heelL'], ['heelL', 'toeL'], ['ankL', 'toeL'], ['ankR', 'heelR'], ['heelR', 'toeR'], ['ankR', 'toeR']];
  function phaseAt(cycles, side, i) { const c = cycles.find((x) => x.side === side && i >= x.a && i < x.b); if (!c) return -1; for (let p = 0; p < 8; p++) if (i < c.bounds[p + 1]) return p; return 7; }
  function drawFrame(g, f, k, cycles, i) {
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

  /* ───────── pagine ───────── */
  const head = (title, sub) => '<div class="detail-head"><div class="eyebrow">' + T('Professionista') + ' · <span class="beta-tag">' + T('in prova') + '</span></div><h1>' + title + '</h1>' + (sub ? '<p class="small muted" style="margin:6px 0 0">' + sub + '</p>' : '') + '</div>';
  const NOTE = () => '<p class="small muted" style="margin-top:14px">' + ESTIMATE() + '. ' + T('Le misure da un solo video sono approssimate: non sostituiscono un laboratorio di analisi del movimento.') + '</p>';
  let stop = false; let rafId = 0;
  function cleanup() { stop = true; cancelAnimationFrame(rafId); }

  function render(app) {
    cleanup(); stop = false;
    const seg = (k, opts) => '<div class="seg" role="group">' + opts.map(([v, l]) => '<button type="button" data-gp="' + k + '" data-val="' + v + '" aria-pressed="' + (prefs[k] === v) + '">' + l + '</button>').join('') + '</div>';
    app.innerHTML = head(T('Analisi del cammino'), T('Video di fronte: fasi del passo, bacino, tronco e ginocchia sul piano frontale.')) +
      '<div class="home-grid"><div>' +
      '<div class="card"><h3>' + T('Come fare il video') + '</h3><ol class="steps">' +
      '<li>' + T('Appoggia il telefono <b>fermo, in verticale</b>, all’altezza del bacino (circa 1 metro), su un treppiede o una sedia.') + '</li>' +
      '<li>' + T('Il paziente parte a <b>6–7 metri</b> e cammina <b>verso il telefono</b> a passo normale, per almeno 4–5 passi.') + '</li>' +
      '<li>' + T('Deve vedersi <b>tutto il corpo, piedi compresi</b>, per tutto il video. Meglio abiti aderenti e buona luce.') + '</li>' +
      '<li>' + T('Registra 6–10 secondi, poi fermati prima che il paziente arrivi troppo vicino.') + '</li></ol>' +
      '<p class="small muted" style="margin:0">' + T('Il video resta sul telefono: non viene inviato a nessuno.') + '</p></div>' +
      '<div class="card"><label class="small" style="display:block;margin-bottom:6px"><b>' + T('Condizione') + '</b></label>' + seg('cond', [['senza', T('Senza Equistasi')], ['con', T('Con Equistasi')]]) +
      '<label class="small" style="display:block;margin:12px 0 6px" for="gt-h"><b>' + T('Altezza del paziente (cm, facoltativa)') + '</b></label><input id="gt-h" type="number" inputmode="numeric" min="100" max="220" value="' + esc(prefs.h) + '" style="max-width:140px" />' +
      '<div class="actions" style="margin-top:14px"><label class="btn primary" for="gt-file">🎥 ' + T('Registra o scegli il video') + '</label><input id="gt-file" type="file" accept="video/*" capture="environment" hidden /></div>' +
      '<div id="gt-prog" hidden><p class="small" id="gt-prog-t"></p><div class="gt-progress"><i id="gt-prog-b"></i></div><button type="button" class="btn" id="gt-cancel">' + T('Annulla') + '</button></div>' +
      '<p class="small err" id="gt-err"></p></div>' +
      '</div><div>' + historyHtml() + '</div></div><div id="gt-out"></div>' + NOTE();
    app.querySelectorAll('[data-gp]').forEach((b) => b.addEventListener('click', () => { prefs[b.dataset.gp] = b.dataset.val; savePrefs(); app.querySelectorAll('[data-gp="' + b.dataset.gp + '"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
    app.querySelector('#gt-h').addEventListener('change', (e) => { prefs.h = e.target.value; savePrefs(); });
    app.querySelector('#gt-file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) run(app, f); e.target.value = ''; });
  }

  async function run(app, file) {
    let cancel = false; stop = false;
    const prog = app.querySelector('#gt-prog'); const bar = app.querySelector('#gt-prog-b'); const txt = app.querySelector('#gt-prog-t'); const err = app.querySelector('#gt-err');
    err.textContent = ''; prog.hidden = false; txt.textContent = T('Preparo il riconoscimento del corpo…'); bar.style.width = '2%';
    app.querySelector('#gt-cancel').onclick = () => { cancel = true; };
    try {
      const rec = await track(file, (p) => { txt.textContent = T('Analizzo il video… {p}%', { p: Math.round(p * 100) }); bar.style.width = Math.round(p * 100) + '%'; }, () => cancel || stop);
      if (cancel || stop) { prog.hidden = true; return; }
      txt.textContent = T('Calcolo le fasi del passo…');
      const out = analyse(rec);
      prog.hidden = true;
      if (out.error) { err.textContent = out.error === 'body' ? T('Non vedo bene tutto il corpo nel video: rifallo con la persona intera, piedi compresi, e più luce.') : T('Non ho trovato abbastanza passi: servono almeno 4–5 passi interi. Rifai il video partendo più lontano.'); return; }
      const saved = { t: Date.now(), view: 'fronte', cond: prefs.cond, r: Object.assign({}, out.res, { curves: undefined }) };
      const all = store.get(KEY, []); all.push(saved); store.set(KEY, all.slice(-60));
      showResult(app, file, rec, out);
    } catch (e) {
      prog.hidden = true;
      err.textContent = e && e.message === 'video' ? T('Non riesco a leggere questo video. Prova a registrarlo di nuovo.') : T('Il riconoscimento del corpo non è disponibile su questo telefono o senza connessione. Riprova più tardi.');
    }
  }

  function metricsHtml(r) {
    const row = (label, l, rr, note) => '<tr><th>' + label + (note ? '<br><small class="muted">' + note + '</small>' : '') + '</th><td>' + l + '</td><td>' + rr + '</td></tr>';
    const pct = (v) => (isFinite(v) ? fmt(v, 0) + '%' : '–'); const dg = (v) => (isFinite(v) ? fmt(v, 1) + '°' : '–'); const s = (v) => (isFinite(v) ? fmt(v, 2) + ' s' : '–');
    const kv = (v) => (isFinite(v) ? fmt(Math.abs(v), 1) + '° ' + (Math.abs(v) < 2 ? T('allineato') : v > 0 ? T('valgo') : T('varo')) : '–');
    return '<div class="pz-table-wrap"><table class="pz-table gt-table"><thead><tr><th></th><th>' + T('Sinistro') + '</th><th>' + T('Destro') + '</th></tr></thead><tbody>' +
      row(T('Durata del ciclo del passo'), s(r.L.cycle), s(r.R.cycle), T('da un contatto al successivo dello stesso piede')) +
      row(T('Fase di appoggio'), pct(r.L.stance), pct(r.R.stance), T('riferimento circa 60%')) +
      row(T('Fase di oscillazione'), pct(r.L.swing), pct(r.R.swing), T('riferimento circa 40%')) +
      row(T('Tempo del passo'), s(r.L.step), s(r.R.step)) +
      row(T('Caduta del bacino dal lato opposto'), dg(r.L.drop), dg(r.R.drop), T('nel singolo appoggio di questo arto')) +
      row(T('Inclinazione del tronco verso l’arto in appoggio'), dg(r.L.lean), dg(r.R.lean)) +
      row(T('Ginocchio nella prima parte dell’appoggio'), kv(r.L.knee), kv(r.R.knee), T('valgo: verso l’interno · varo: verso l’esterno')) +
      '</tbody></table></div>' +
      '<div class="gt-kpis">' +
      '<div><b>' + (isFinite(r.cadence) ? Math.round(r.cadence) : '–') + '</b><span>' + T('passi/min (cadenza)') + '</span></div>' +
      '<div><b>' + pct(r.ds) + '</b><span>' + T('doppio appoggio (rif. circa 20%)') + '</span></div>' +
      '<div><b>' + pct(r.symStance) + '</b><span>' + T('simmetria dell’appoggio dx/sx') + '</span></div>' +
      '<div><b>' + pct(r.symStep) + '</b><span>' + T('simmetria del tempo del passo') + '</span></div>' +
      '<div><b>' + (r.widthCm ? '≈ ' + fmt(r.widthCm, 0) + ' cm' : pct(r.width)) + '</b><span>' + (r.widthCm ? T('larghezza del passo') : T('larghezza del passo rispetto alla distanza tra le anche')) + '</span></div>' +
      '</div>';
  }

  function showResult(app, file, rec, out) {
    const r = out.res; const ph = PHASES();
    const box = app.querySelector('#gt-out');
    box.innerHTML = '<div class="card gt-result"><h3>' + T('Risultato · video di fronte') + ' <span class="small muted">· ' + (prefs.cond === 'con' ? T('con Equistasi') : T('senza Equistasi')) + ' · ' + T('{n} contatti del piede', { n: r.nSteps }) + '</span></h3>' +
      '<div class="gt-video"><video id="gt-v" playsinline muted></video><canvas id="gt-c"></canvas></div>' +
      '<div class="gt-ctrl"><button type="button" class="btn" id="gt-play">▶︎ ' + T('Riproduci') + '</button>' +
      '<div class="seg" role="group" aria-label="' + T('Velocità') + '">' + [[0.25, '¼×'], [0.5, '½×'], [1, '1×']].map(([v, l]) => '<button type="button" data-rate="' + v + '" aria-pressed="' + (v === 0.25) + '">' + l + '</button>').join('') + '</div>' +
      '<input type="range" id="gt-seek" min="0" max="' + (rec.frames.length - 1) + '" value="0" aria-label="' + T('Fotogramma') + '" /></div>' +
      '<h4>' + T('Fasi del ciclo del passo') + '</h4>' +
      ['L', 'R'].map((s) => '<div class="gt-barrow"><span>' + (s === 'L' ? T('Sinistro') : T('Destro')) + '</span>' + phaseBar(out.cycles, s) + '</div>').join('') +
      '<div class="gt-legend">' + ph.map((n, p) => '<button type="button" data-ph="' + p + '"><i style="background:' + PH_COL[p] + '"></i>' + (p + 1) + '. ' + n + '</button>').join('') + '</div>' +
      '<p class="small muted">' + T('Tocca una fase per fermare il video in quel momento (piede sinistro, primo ciclo).') + '</p>' +
      metricsHtml(r) +
      '<div class="gt-charts">' + chart(r.curves.pelL, r.curves.pelR, T('Caduta del bacino dal lato opposto'), T('gradi, sul ciclo dell’arto'), r.curves.stL, r.curves.stR) +
      chart(r.curves.knL, r.curves.knR, T('Ginocchio sul piano frontale'), T('+ valgo · − varo'), r.curves.stL, r.curves.stR) + '</div>' +
      '<p class="small muted">' + T('Linee verdi: lato sinistro · blu: lato destro · gialle: bacino e spalle. La riga tratteggiata è l’orizzontale del bacino.') + '</p>' +
      '<p class="small muted">' + ESTIMATE() + '. ' + T('Velocità, lunghezza del passo e angoli visti di lato si misurano con il video laterale (in arrivo).') + '</p></div>';
    const v = box.querySelector('#gt-v'); const c = box.querySelector('#gt-c'); const g = c.getContext('2d');
    v.src = URL.createObjectURL(file); v.playbackRate = 0.25;
    v.addEventListener('loadedmetadata', () => { const k = Math.min(1, 720 / Math.max(rec.W, rec.H)); c.width = Math.round(rec.W * k); c.height = Math.round(rec.H * k); c.dataset.k = k; paint(); });
    const frameIdx = () => Math.max(0, Math.min(rec.frames.length - 1, Math.round(v.currentTime * FPS)));
    function paint() {
      const k = +c.dataset.k || 1; g.clearRect(0, 0, c.width, c.height);
      g.drawImage(v, 0, 0, c.width, c.height);
      const i = frameIdx(); drawFrame(g, rec.frames[i], k, out.cycles, i);
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
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function historyHtml() {
    const l = store.get(KEY, []);
    if (!l.length) return '<div class="card"><h3>' + T('Analisi salvate') + '</h3><p class="small muted" style="margin:0">' + T('Nessuna analisi salvata.') + '</p></div>';
    return '<div class="card"><h3>' + T('Analisi salvate') + '</h3><div class="pz-table-wrap"><table class="pz-table"><tbody>' + l.slice(-8).reverse().map((x) => {
      const r = x.r;
      return '<tr><th>' + dateStr(x.t) + ' · ' + (x.cond === 'con' ? T('con Equistasi') : T('senza Equistasi')) + '</th><td><small>' + T('Appoggio sx/dx {a}% / {b}%', { a: Math.round(r.L.stance), b: Math.round(r.R.stance) }) +
        '<br>' + T('Cadenza {c} passi/min · simmetria {s}%', { c: Math.round(r.cadence), s: Math.round(r.symStance) }) + '</small></td></tr>';
    }).join('') + '</tbody></table></div></div>';
  }

  // righe per il report (web e PDF)
  function reportGroups() {
    const l = store.get(KEY, []); if (!l.length) return [];
    const rows = [];
    ['senza', 'con'].forEach((cond) => {
      const x = l.filter((a) => a.cond === cond); if (!x.length) return;
      const a = x[x.length - 1]; const r = a.r; const when = (cond === 'con' ? T('con Equistasi') : T('senza Equistasi')) + ' · ' + dateStr(a.t);
      const d = (v) => (isFinite(v) ? fmt(v, 1) + '°' : '–');
      rows.push({ label: T('Fase di appoggio sx / dx') + ' · ' + when, val: Math.round(r.L.stance) + '% / ' + Math.round(r.R.stance) + '%' });
      rows.push({ label: T('Doppio appoggio · cadenza') + ' · ' + when, val: Math.round(r.ds) + '% · ' + Math.round(r.cadence) + ' ' + T('passi/min') });
      rows.push({ label: T('Simmetria appoggio · tempo del passo') + ' · ' + when, val: Math.round(r.symStance) + '% · ' + Math.round(r.symStep) + '%' });
      rows.push({ label: T('Caduta del bacino (appoggio sx / dx)') + ' · ' + when, val: d(r.L.drop) + ' / ' + d(r.R.drop) });
      rows.push({ label: T('Inclinazione del tronco (appoggio sx / dx)') + ' · ' + when, val: d(r.L.lean) + ' / ' + d(r.R.lean) });
      rows.push({ label: T('Ginocchio sul piano frontale sx / dx (+ valgo)') + ' · ' + when, val: d(r.L.knee) + ' / ' + d(r.R.knee) });
    });
    return [{ title: T('Analisi del cammino · video di fronte') + ' · ' + ESTIMATE(), rows }];
  }

  window.addEventListener('hashchange', cleanup);
  window.EqGait = { render, reportGroups, _analyse: analyse, _show: showResult };
})();
