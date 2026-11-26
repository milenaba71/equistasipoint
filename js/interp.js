/* Interpretazione biomeccanica delle misure (regole fisse, niente IA).
   Per ogni strumento: schemi riconosciuti dai numeri, con i dati che li sostengono, il significato meccanico
   e cosa verificare. Sono ipotesi per il professionista sanitario (solo dispositivi «noleggio prof»), non diagnosi.
   Le soglie sono riferimenti indicativi per l'adulto: l'interpretazione finale spetta al professionista. */
(function () {
  const T = (s, o) => (window.T ? window.T(s, o) : s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const get = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]') || []; } catch (e) { return []; } };
  const fmt = (v, d) => (window.LANG === 'en' ? v.toFixed(d) : v.toFixed(d).replace('.', ','));
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = (t) => { const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2); };
  const ok = isFinite;
  const DOT = { g: '🟢', y: '🟡', r: '🔴' };
  const condTxt = (c) => (c === 'con' ? T('con Equistasi') : T('senza Equistasi'));
  const allowed = () => !!(window.EqPro && window.EqPro.isPro && window.EqPro.isPro());
  const last = (l) => l[l.length - 1];
  const dg = (v, d) => fmt(v, d == null ? 1 : d) + '°';

  function maker() {
    const P = []; const notes = [];
    return { P, notes, add: (fl, title, ev, mean, check) => P.push({ fl, title, ev, mean, check: check || '' }), note: (t) => notes.push(t) };
  }
  function done(m, okText) {
    const rank = { r: 0, y: 1, g: 2 };
    m.P.sort((a, b) => rank[a.fl] - rank[b.fl]);
    const bad = m.P.filter((x) => x.fl !== 'g'); const red = bad.filter((x) => x.fl === 'r');
    const synth = bad.length ? T('Quadro principale: ') + (red.length ? red : bad).slice(0, 3).map((x) => x.title).join('; ') + '.' : okText;
    return { list: m.P, notes: m.notes, synth };
  }
  // confronto senza → con Equistasi: variazione oltre la soglia; lowBetter = un valore più basso è meglio
  function condItem(m, name, a, b, unit, d, thr, lowBetter, why) {
    if (!a || !b || !ok(a.v) || !ok(b.v)) return;
    const diff = b.v - a.v; if (Math.abs(diff) < thr) return;
    const better = lowBetter == null ? null : (lowBetter ? diff < 0 : diff > 0);
    m.add(better === false ? 'y' : 'g', better == null ? T('{n}: differenza tra senza e con Equistasi', { n: name }) : better ? T('{n}: migliore con Equistasi', { n: name }) : T('{n}: peggiore con Equistasi', { n: name }),
      T('Senza Equistasi {a} ({d1}), con Equistasi {b} ({d2}).', { a: fmt(a.v, d) + unit, b: fmt(b.v, d) + unit, d1: dateStr(a.t), d2: dateStr(b.t) }),
      why, T('Confermare con almeno 2–3 prove per condizione, fatte nello stesso modo.'));
  }

  /* ───────── Stabilità in piedi ───────── */
  function stability(id) {
    const all = get('tp-posture').filter((x) => x.test === 'stabilita' && x.m);
    const r = id ? all.find((x) => x.id === id) : last(all); if (!r) return null;
    const m = maker(); const closed = r.eyes === 'chiusi'; const G = closed ? 5 : 3; const Y = closed ? 12 : 8; const a = r.m.area;
    const eyes = closed ? T('occhi chiusi') : T('occhi aperti');
    const rad = (r.m.rot || 0) * Math.PI / 180; const ml = Math.hypot(r.m.rx * Math.cos(rad), r.m.ry * Math.sin(rad)); const ap = Math.hypot(r.m.rx * Math.sin(rad), r.m.ry * Math.cos(rad));
    if (a > G) {
      m.add(a > Y ? 'r' : 'y', closed ? T('Oscillazione ampia a occhi chiusi') : T('Oscillazione ampia a occhi aperti'),
        T('Area {a} cm² (soglia indicativa {g} cm²), velocità {v} mm/s, ampiezza avanti-indietro ±{ap} cm e laterale ±{ml} cm.', { a: fmt(a, 1), g: G, v: fmt(r.m.vel, 1), ap: fmt(ap, 1), ml: fmt(ml, 1) }),
        closed ? T('Senza la vista il corpo oscilla molto: l’equilibrio si regge poco sulle informazioni che arrivano dai piedi, dalle articolazioni e dal sistema vestibolare.')
          : T('Il corpo oscilla più del previsto anche con il riferimento della vista: il controllo posturale di base è ridotto. Può dipendere da sensibilità, sistema vestibolare, forza o attenzione.'),
        T('Sensibilità plantare e propriocettiva, funzione vestibolare, forza di caviglie e anche, farmaci che agiscono sull’equilibrio.'));
      if (ok(ml) && ok(ap) && ml > ap * 1.3) m.add('y', T('Oscillazione soprattutto laterale'), T('Laterale ±{ml} cm contro avanti-indietro ±{ap} cm.', { ml: fmt(ml, 1), ap: fmt(ap, 1) }),
        T('Il controllo laterale dipende dalle anche e da come il peso è distribuito sui due piedi. Un’oscillazione laterale ampia indica carico asimmetrico o controllo dell’anca ridotto; è la direzione più legata al rischio di caduta.'),
        T('Distribuzione del carico sui piedi, forza degli abduttori dell’anca, larghezza della base di appoggio.'));
      else if (ok(ml) && ok(ap) && ap > ml * 2.5) m.add('y', T('Oscillazione soprattutto avanti-indietro'), T('Avanti-indietro ±{ap} cm contro laterale ±{ml} cm.', { ml: fmt(ml, 1), ap: fmt(ap, 1) }),
        T('L’equilibrio avanti-indietro si regola soprattutto alla caviglia: un’oscillazione ampia in questa direzione indica una strategia di caviglia poco efficace, per forza o sensibilità ridotte.'),
        T('Forza e mobilità della caviglia, sensibilità plantare.'));
    }
    // Romberg: prova con gli occhi nell'altra condizione, entro un'ora
    const pair = all.filter((x) => x.id !== r.id && x.eyes !== r.eyes && x.mount === r.mount && x.cond === r.cond && Math.abs(x.t - r.t) < 3600000).pop();
    if (pair) {
      const o = closed ? pair : r; const c = closed ? r : pair; const q = o.m.area > 0 ? c.m.area / o.m.area : NaN;
      if (q > 2) m.add(q > 3 ? 'r' : 'y', T('Forte dipendenza dalla vista (indice di Romberg {q})', { q: fmt(q, 1) }), T('Area {c} cm² a occhi chiusi contro {o} cm² a occhi aperti.', { c: fmt(c.m.area, 1), o: fmt(o.m.area, 1) }),
        T('A occhi chiusi l’oscillazione più che raddoppia: la vista sta compensando un’informazione propriocettiva o vestibolare ridotta. Al buio o su terreno irregolare l’equilibrio peggiora.'),
        T('Sensibilità profonda degli arti inferiori, prove vestibolari, equilibrio su una superficie morbida.'));
      else if (ok(q)) m.note(T('Indice di Romberg {q}: a occhi chiusi l’oscillazione cambia poco, la vista non è determinante.', { q: fmt(q, 1) }));
    } else m.note(T('Manca la prova con gli occhi nell’altra condizione: senza non si può calcolare l’indice di Romberg.'));
    const oth = all.filter((x) => x.id !== r.id && x.eyes === r.eyes && x.mount === r.mount && x.cond !== r.cond).pop();
    if (oth && oth.m.area > 0 && r.m.area > 0) {
      const s = r.cond === 'con' ? oth : r; const c = r.cond === 'con' ? r : oth; const pct = Math.round((c.m.area - s.m.area) / s.m.area * 100);
      if (Math.abs(pct) >= 20) m.add(pct < 0 ? 'g' : 'y', pct < 0 ? T('Con Equistasi l’oscillazione si riduce del {p}%', { p: -pct }) : T('Con Equistasi l’oscillazione aumenta del {p}%', { p: pct }),
        T('Area {a} cm² senza ({d1}) e {b} cm² con Equistasi ({d2}), {e}.', { a: fmt(s.m.area, 1), b: fmt(c.m.area, 1), d1: dateStr(s.t), d2: dateStr(c.t), e: eyes }),
        T('La variazione supera la variabilità abituale tra due prove (circa 20%): il controllo posturale è diverso nelle due condizioni.'),
        T('Confermare con almeno 2–3 prove per condizione, fatte nello stesso modo.'));
    }
    if (r.moved || r.held < 29) m.note(T('La prova è stata interrotta prima dei 30 secondi: i valori sono meno confrontabili.'));
    m.note(T('Oscillazione stimata dall’inclinazione del tronco con il telefono addosso: non è una pedana stabilometrica e le soglie sono indicative.'));
    return { title: T('Stabilità in piedi') + ' · ' + eyes + ' · ' + condTxt(r.cond) + ' · ' + dateStr(r.t),
      p: done(m, T('Oscillazione contenuta: area {a} cm² ({e}), entro la soglia indicativa di {g} cm².', { a: fmt(a, 1), e: eyes, g: G })) };
  }

  /* ───────── Inclinazione di tronco e testa ───────── */
  const trunkFwd = (m, v, ref) => m.add(v >= ref * 2 ? 'r' : 'y', T('Tronco flesso in avanti'), T('{v} in avanti rispetto alla verticale.', { v: dg(v) }),
    T('Il baricentro si sposta in avanti e gli estensori della schiena e dell’anca lavorano di più per tenere la postura. Compatibile con atteggiamento cifotico, retrazione dei flessori dell’anca o debolezza degli estensori; una flessione marcata che si riduce da sdraiati va segnalata.'),
    T('Curva dorsale (misura T1–T12), estensione dell’anca, foto di lato.'));
  const headTilt = (m, v, side, ref) => m.add(v >= ref * 2 ? 'r' : 'y', T('Testa inclinata {s}', { s: side }), T('{v} di lato (rif. < {r}°).', { v: dg(v), r: ref }),
    T('Il capo è inclinato di lato: compatibile con tensione asimmetrica dei muscoli del collo (sternocleidomastoideo, trapezio), con un compenso visivo o vestibolare o con un’abitudine posturale.'),
    T('Mobilità cervicale in inclinazione e rotazione, tensione muscolare, allineamento degli occhi.'));
  const trunkSide = (m, v, side, ref, unitRef) => m.add(v >= ref * 2 ? 'r' : 'y', T('Tronco inclinato {s}', { s: side }), T('{v} di lato (rif. < {r}°).', { v: dg(v), r: unitRef || ref }),
    T('Il tronco non è allineato sopra il bacino: il carico è spostato su un lato. Compatibile con atteggiamento antalgico, asimmetria muscolare, curva della colonna o differenza di lunghezza degli arti; nei quadri neurologici una flessione laterale marcata va segnalata.'),
    T('Linea delle spalle e del bacino nella foto di fronte, test di Adams con lo scoliometro, lunghezza degli arti.'));
  function tilt(test) {
    const all = get('tp-posture').filter((x) => x.test === test && ok(x.ap)); const r = last(all); if (!r) return null;
    const m = maker(); const head = test === 'testa'; const side = r.ml > 0 ? T('a destra') : T('a sinistra'); const lat = Math.abs(r.ml);
    if (lat >= 3) { if (head) headTilt(m, lat, side, 3); else trunkSide(m, lat, side, 3); }
    if (head) {
      if (r.ap >= 10) m.add(r.ap >= 20 ? 'r' : 'y', T('Testa flessa in avanti'), T('{v} in avanti.', { v: dg(r.ap) }),
        T('Lo sguardo tende verso il basso o il capo è portato in avanti: aumenta il carico sugli estensori del collo.'), T('Foto di lato (angolo testa–spalla), mobilità cervicale e dorsale alta.'));
      else if (r.ap <= -10) m.add(r.ap <= -20 ? 'r' : 'y', T('Testa inclinata indietro'), T('{v} indietro.', { v: dg(-r.ap) }),
        T('Il capo è in estensione: spesso compensa una curva dorsale accentuata per tenere lo sguardo orizzontale.'), T('Curva dorsale (misura T1–T12), foto di lato.'));
    } else if (r.ap >= 8) trunkFwd(m, r.ap, 8);
    else if (r.ap <= -8) m.add(r.ap <= -16 ? 'r' : 'y', T('Tronco inclinato indietro'), T('{v} indietro rispetto alla verticale.', { v: dg(-r.ap) }),
      T('Il tronco è arretrato: spesso compensa un bacino spostato in avanti o una lordosi lombare accentuata.'), T('Foto di lato: posizione del bacino rispetto alle caviglie.'));
    const oth = all.filter((x) => x.cond !== r.cond).pop();
    if (oth) {
      const s = r.cond === 'con' ? oth : r; const c = r.cond === 'con' ? r : oth;
      condItem(m, T('Inclinazione laterale'), { v: Math.abs(s.ml), t: s.t }, { v: Math.abs(c.ml), t: c.t }, '°', 1, 3, true, T('La differenza supera l’errore della misura (circa 2–3°): l’allineamento sul piano frontale cambia tra le due condizioni.'));
      condItem(m, T('Inclinazione avanti/indietro'), { v: Math.abs(s.ap), t: s.t }, { v: Math.abs(c.ap), t: c.t }, '°', 1, 3, true, T('La differenza supera l’errore della misura (circa 2–3°): l’allineamento sul piano sagittale cambia tra le due condizioni.'));
    }
    if (r.steady === false) m.note(T('Il telefono si è mosso durante la misura: ripetere la prova.'));
    m.note(T('Il valore avanti/indietro dipende anche dalla forma dello sterno o della fronte: conta soprattutto il confronto nel tempo.'));
    return { title: (head ? T('Testa e collo') : T('Inclinazione del tronco')) + ' · ' + condTxt(r.cond) + ' · ' + dateStr(r.t),
      p: done(m, T('Allineamento nei riferimenti: {a} avanti/indietro, {b} di lato.', { a: dg(r.ap), b: dg(lat) })) };
  }

  /* ───────── Curva dorsale (T1–T12) ───────── */
  function kyph() {
    const all = get('tp-posture').filter((x) => x.test === 'schiena' && ok(x.k)); const r = last(all); if (!r) return null;
    const m = maker(); const k = r.k;
    if (k > 45) m.add(k > 55 ? 'r' : 'y', T('Curva dorsale accentuata (ipercifosi)'), T('Curva stimata {v} (rif. 20–45°).', { v: dg(k, 0) }),
      T('La curva dorsale supera i valori abituali: capo e spalle si spostano in avanti, il torace si espande meno e gli estensori lavorano di più. Può essere posturale (si riduce raddrizzandosi) o strutturale (rigida).'),
      T('Riducibilità in estensione attiva e da proni, posizione di capo e spalle, dolore dorsale; nell’anziano possibili cedimenti vertebrali.'));
    else if (k < 20) m.add('y', T('Curva dorsale ridotta (dorso piatto)'), T('Curva stimata {v} (rif. 20–45°).', { v: dg(k, 0) }),
      T('La curva dorsale è sotto i valori abituali: la colonna ammortizza meno i carichi; spesso si associa a rigidità del tratto dorsale.'), T('Mobilità dorsale in flessione, curva lombare.'));
    const oth = all.filter((x) => x.cond !== r.cond).pop();
    if (oth) { const s = r.cond === 'con' ? oth : r; const c = r.cond === 'con' ? r : oth; condItem(m, T('Curva dorsale'), { v: s.k, t: s.t }, { v: c.k, t: c.t }, '°', 0, 5, null, T('La differenza supera l’errore della misura (circa 5°): la postura del tratto dorsale cambia tra le due condizioni.')); }
    if (r.steady === false) m.note(T('Il telefono si è mosso durante la misura: ripetere la prova.'));
    m.note(T('Metodo delle due inclinazioni (T1 e T12): errore indicativo ±5°, dipende dal punto di appoggio.'));
    return { title: T('Curva della schiena') + ' · ' + condTxt(r.cond) + ' · ' + dateStr(r.t), p: done(m, T('Curva dorsale nei riferimenti: {v} (rif. 20–45°).', { v: dg(k, 0) })) };
  }

  /* ───────── Foto della postura ───────── */
  function photo() {
    const p = last(get('tp-posture-photos')); const PM = window.EqPosture && window.EqPosture._photoMetrics;
    if (!p || !p.pts || !PM) return null;
    const side = p.view === 'lato'; let ms; try { ms = PM(side ? 'lato' : 'fronte', p.pts, p.w, p.h); } catch (e) { return null; }
    const M = {}; ms.forEach((x) => { M[x.k] = x; }); const m = maker();
    if (!side) {
      const sh = M.spalle; const pv = M.bacino; const hd = M.testa; const tr = M.tronco;
      if (sh && sh.v >= 2) m.add(sh.v >= 4 ? 'r' : 'y', T('Spalle non allineate ({n})', { n: sh.note }), T('Linea delle spalle inclinata di {v} (rif. < 2°).', { v: dg(sh.v) }),
        T('Una spalla è più bassa dell’altra: compatibile con dominanza di un arto, tensione asimmetrica (trapezio, elevatore della scapola) o con una curva della colonna.'),
        T('Test di Adams con lo scoliometro, altezza delle scapole da dietro.'));
      if (pv && pv.v >= 2) m.add(pv.v >= 4 ? 'r' : 'y', T('Bacino inclinato ({n})', { n: pv.note }), T('Linea del bacino inclinata di {v} (rif. < 2°).', { v: dg(pv.v) }),
        T('Le due anche non sono alla stessa altezza: compatibile con differenza di lunghezza degli arti (vera o funzionale), carico asimmetrico o curva lombare.'),
        T('Lunghezza degli arti, appoggio dei piedi, ricontrollo con un rialzo sotto il piede del lato basso.'));
      if (sh && pv && sh.v >= 2 && pv.v >= 2) m.add('y', sh.note === pv.note ? T('Spalle e bacino inclinati dallo stesso lato') : T('Spalle e bacino inclinati in senso opposto'), T('Spalle {a} ({n1}), bacino {b} ({n2}).', { a: dg(sh.v), b: dg(pv.v), n1: sh.note, n2: pv.note }),
        sh.note === pv.note ? T('Tutto il tronco è inclinato da un lato (schema a «C»): orienta verso una causa in basso, come una differenza di lunghezza degli arti o un carico asimmetrico.')
          : T('Le spalle compensano l’inclinazione del bacino nel senso opposto (schema a «S»): è il compenso tipico degli atteggiamenti scoliotici.'),
        T('Test di Adams con lo scoliometro, lunghezza degli arti.'));
      if (hd && hd.v >= 3) headTilt(m, hd.v, hd.note, 3);
      if (tr && tr.v >= 1.5) m.add(tr.v >= 3 ? 'r' : 'y', T('Tronco spostato di lato ({n})', { n: tr.note }), T('Centro delle spalle spostato di {v} rispetto al centro degli appoggi (rif. < 1,5°).', { v: dg(tr.v) }),
        T('Il centro delle spalle non è sopra il centro dei piedi: il carico è spostato su un lato. Compatibile con atteggiamento antalgico, carico asimmetrico o curva della colonna.'),
        T('Distribuzione del carico sui piedi, dolore lombare o a un arto.'));
    } else {
      const fwd = T('in avanti'); const hd = M.testa; const al = M.allineamento; const tr = M.tronco; const kn = M.ginocchio;
      if (hd && hd.v < 50) m.add(hd.v < 42 ? 'r' : 'y', T('Testa in avanti rispetto alle spalle'), T('Angolo testa–spalla {v} (rif. indicativo ≥ 50°).', { v: dg(hd.v) }),
        T('L’orecchio è davanti alla spalla: il peso del capo ha una leva più lunga e gli estensori del collo lavorano di più. Di solito si associa a spalle in avanti e curva dorsale alta accentuata.'),
        T('Curva dorsale, mobilità cervicale, lunghezza dei pettorali.'));
      if (al && al.v >= 4) {
        if (al.note === fwd) m.add(al.v >= 7 ? 'r' : 'y', T('Corpo spostato in avanti'), T('Linea orecchio–caviglia inclinata di {v} in avanti (rif. < 4°).', { v: dg(al.v) }),
          T('Il carico va verso l’avampiede: polpaccio ed estensori lavorano di continuo per frenare la caduta in avanti e il margine di stabilità anteriore si riduce.'), T('Appoggio plantare, mobilità della caviglia, stabilità a occhi chiusi.'));
        else m.add(al.v >= 7 ? 'r' : 'y', T('Corpo spostato indietro'), T('Linea orecchio–caviglia inclinata di {v} indietro (rif. < 4°).', { v: dg(al.v) }),
          T('Il carico va verso i talloni: si riduce il margine di stabilità posteriore. Frequente quando si teme di cadere in avanti o con debolezza dei flessori dorsali della caviglia.'), T('Equilibrio, forza dei flessori dorsali della caviglia.'));
      }
      if (tr && tr.v >= 5 && tr.note === fwd) trunkFwd(m, tr.v, 5);
      if (kn && kn.v >= 5) {
        if (kn.note === T('in flessione')) m.add(kn.v >= 10 ? 'r' : 'y', T('Ginocchio flesso da fermi'), T('{v} di flessione in stazione eretta (rif. < 5°).', { v: dg(kn.v) }),
          T('Il ginocchio non è disteso da fermi e il quadricipite lavora di continuo. Compatibile con retrazione dei flessori, deficit di estensione o postura in flessione.'), T('Estensione passiva del ginocchio, estensione dell’anca.'));
        else m.add(kn.v >= 10 ? 'r' : 'y', T('Ginocchio iperesteso da fermi (recurvato)'), T('{v} oltre l’estensione in stazione eretta (rif. < 5°).', { v: dg(kn.v) }),
          T('Il ginocchio si blocca oltre l’estensione e il carico passa sulle strutture posteriori. Compatibile con lassità, deficit del quadricipite o poca flessione dorsale della caviglia.'), T('Lassità, forza del quadricipite, flessione dorsale della caviglia.'));
      }
    }
    if (p.level && !p.level.ok) m.note(T('Il telefono era inclinato durante lo scatto: gli angoli sono meno affidabili.'));
    m.note(T('Misure da una foto in 2D: dipendono da distanza, altezza e inclinazione del telefono (errore indicativo 1–2°).'));
    const VW = { davanti: T('davanti'), lato: T('di lato'), dietro: T('da dietro') };
    return { title: T('Foto della postura') + ' · ' + (VW[p.view] || p.view) + ' · ' + condTxt(p.cond) + ' · ' + dateStr(p.t), p: done(m, T('Allineamento nei riferimenti in questa vista.')) };
  }

  /* ───────── Scoliometro ───────── */
  function scolio() {
    const all = get('tp-scolio'); const r = last(all); if (!r) return null;
    const m = maker(); const REG = { toracica: T('toracica'), toracolombare: T('toraco-lombare'), lombare: T('lombare') }; const A = { v: dg(r.v), l: r.side === 'dx' ? T('destra') : T('sinistra'), z: REG[r.reg] || r.reg };
    if (r.v >= 7) m.add('r', T('Rotazione del tronco oltre la soglia di invio allo specialista'), T('{v} nel test di Adams, gibbo a {l}, zona {z} (soglia 7°).', A),
      T('Con 7° o più le linee guida indicano di solito la valutazione specialistica ed eventualmente la radiografia: la rotazione è compatibile con una scoliosi strutturata. Il valore non è l’angolo di Cobb.'),
      T('Valutazione di ortopedico o fisiatra; ripetere da seduti per escludere l’effetto di una differenza di lunghezza degli arti.'));
    else if (r.v >= 5) m.add('y', T('Rotazione del tronco da tenere sotto controllo'), T('{v} nel test di Adams, gibbo a {l}, zona {z} (rif. < 5°).', A),
      T('Tra 5° e 7° c’è un’asimmetria da seguire nel tempo: indica una componente di rotazione della colonna. Il valore non è l’angolo di Cobb.'),
      T('Ricontrollo periodico (circa ogni 6 mesi nell’età della crescita), lunghezza degli arti, ripetere da seduti.'));
    const prev = all.filter((x) => x !== r && x.reg === r.reg && x.t < r.t).pop();
    if (prev && Math.abs(r.v - prev.v) >= 2) m.add(r.v > prev.v ? 'y' : 'g', r.v > prev.v ? T('Rotazione in aumento') : T('Rotazione in riduzione'),
      T('{a} il {d1}, {b} il {d2} (zona {z}).', { a: dg(prev.v), b: dg(r.v), d1: dateStr(prev.t), d2: dateStr(r.t), z: A.z }),
      T('La variazione supera l’errore dello strumento (circa 2°).'), r.v > prev.v ? T('Ripetere la misura e, se confermata, anticipare il controllo.') : T('Ripetere la misura per conferma.'));
    m.note(T('Telefono al posto dello scoliometro: errore indicativo ±2°; conta ripetere la misura nello stesso punto.'));
    return { title: T('Scoliometro') + ' · ' + T('zona') + ' ' + A.z + ' · ' + dateStr(r.t), p: done(m, T('Rotazione del tronco {v} (gibbo a {l}): sotto la soglia di 5°, asimmetria nei limiti.', A)) };
  }

  /* ───────── Analisi del movimento (ginocchio, spalla) ───────── */
  function gonio() {
    const all = get('tp-gonio'); const r = last(all); if (!r) return null;
    const m = maker(); const knee = r.j === 'ginocchio'; const sideM = r.side === 'dx' ? T('destro') : T('sinistro'); const sideF = r.side === 'dx' ? T('destra') : T('sinistra');
    const MV = { flessione: T('flessione'), estensione: T('estensione'), abduzione: T('abduzione') }; const v = r.v;
    const name = knee ? T('Ginocchio {s}', { s: sideM }) : T('Spalla {s}', { s: sideF });
    if (knee && r.mv === 'flessione' && v < 120) {
      const fn = v < 65 ? T('Così non basta nemmeno per il cammino normale (circa 65°).') : v < 90 ? T('Basta per camminare ma non per salire le scale (circa 90°).') : v < 110 ? T('Basta per le scale ma è limitata per alzarsi da una sedia bassa (circa 105–110°).') : T('Basta per le attività di ogni giorno, è limitata per accovacciarsi.');
      m.add(v < 90 ? 'r' : 'y', T('Flessione del ginocchio {s} limitata', { s: sideM }), T('{v} (rif. ≈ 135°).', { v: dg(v, 0) }), T('La flessione è sotto i valori abituali.') + ' ' + fn,
        T('Tipo di arresto (elastico, rigido, doloroso), versamento, scorrimento della rotula, confronto con l’altro lato.'));
    } else if (knee && r.mv === 'estensione' && r.mode !== 'movimento' && v > 5) {
      m.add(v > 10 ? 'r' : 'y', T('Il ginocchio {s} non si distende del tutto', { s: sideM }), T('Mancano {v} all’estensione completa (rif. 0–5°).', { v: dg(v, 0) }),
        T('Anche pochi gradi di estensione mancante aumentano il lavoro del quadricipite in appoggio e alterano il passo.'), T('Estensione passiva, retrazione dei flessori e della capsula posteriore, versamento.'));
    } else if (!knee && v < 150) {
      m.add(v < 120 ? 'r' : 'y', r.mv === 'abduzione' ? T('Abduzione della spalla {s} limitata', { s: sideF }) : T('Flessione della spalla {s} limitata', { s: sideF }), T('{v} (rif. ≈ 180°).', { v: dg(v, 0) }),
        T('L’elevazione del braccio è sotto i valori abituali. Servono circa 120° per pettinarsi o raggiungere uno scaffale alto.') + (v < 120 ? ' ' + T('Sotto questa soglia le attività sopra la testa sono limitate.') : '') + (r.mv === 'abduzione' ? ' ' + T('Un dolore tra 60° e 120° di abduzione orienta verso un conflitto sotto l’acromion.') : ''),
        T('Movimento passivo e attivo a confronto (rigidità o debolezza), ritmo tra scapola e omero, dolore lungo l’arco.'));
    }
    const sameMv = all.filter((x) => x.j === r.j && x.mv === r.mv);
    const other = sameMv.filter((x) => x.side !== r.side).pop();
    if (other && Math.abs(other.v - v) >= 10) {
      const low = v < other.v ? r : other; const lowName = knee ? (low.side === 'dx' ? T('destro') : T('sinistro')) : (low.side === 'dx' ? T('destra') : T('sinistra'));
      m.add(Math.abs(other.v - v) >= 20 ? 'r' : 'y', T('Differenza tra i due lati'), T('Destra {a}, sinistra {b} ({mv}).', { a: dg(r.side === 'dx' ? v : other.v, 0), b: dg(r.side === 'dx' ? other.v : v, 0), mv: MV[r.mv] }),
        T('Il lato {s} ha {d}° in meno: una differenza oltre 10° supera l’errore della misura e indica una limitazione reale di quel lato.', { s: lowName, d: Math.round(Math.abs(other.v - v)) }), T('Confronto passivo dei due lati.'));
    }
    if (r.mode === 'movimento' && r.reps && r.jerk > 4) m.add('y', T('Movimento a scatti'), T('{j} picchi di velocità per ripetizione (2 = gesto fluido), velocità massima {v}°/s, {n} ripetizioni.', { j: fmt(r.jerk, 1), v: r.vel, n: r.reps }),
      T('Il gesto è spezzato in più accelerazioni: controllo motorio ridotto, dolore lungo l’arco di movimento, rigidità o tremore.'), T('Dolore durante il gesto, tono muscolare (rigidità), ripetere più lentamente.'));
    const sameSide = sameMv.filter((x) => x.side === r.side); const first = sameSide[0];
    if (first && first !== r && Math.abs(v - first.v) >= 10) { const up = (r.mv === 'estensione' && knee) ? v < first.v : v > first.v;
      m.add(up ? 'g' : 'y', up ? T('Miglioramento tra le sedute') : T('Peggioramento tra le sedute'), T('{a} il {d1}, {b} il {d2}.', { a: dg(first.v, 0), b: dg(v, 0), d1: dateStr(first.t), d2: dateStr(r.t) }),
        T('La variazione supera l’errore della misura (circa 5–10°).'), T('Confermare ripetendo la misura nello stesso modo.')); }
    const oc = sameSide.filter((x) => x.cond !== r.cond).pop();
    if (oc) { const s = r.cond === 'con' ? oc : r; const c = r.cond === 'con' ? r : oc; condItem(m, T('Ampiezza del movimento'), { v: s.v, t: s.t }, { v: c.v, t: c.t }, '°', 0, 10, !(knee && r.mv === 'estensione') ? false : true, T('La differenza supera l’errore della misura (circa 5–10°).')); }
    if (r.n != null) m.note(T('La forza è stimata dal peso del segmento e del carico: indica lo sforzo minimo richiesto dal gesto, non la forza massima.'));
    m.note(T('Telefono al posto del goniometro: errore indicativo ±5°.'));
    return { title: name + ' · ' + MV[r.mv] + ' · ' + condTxt(r.cond) + ' · ' + dateStr(r.t), p: done(m, T('{n}: {mv} {v}, nei valori abituali.', { n: name, mv: MV[r.mv], v: dg(v, 0) })) };
  }

  /* ───────── Timed Up and Go e cammino su 10 metri ───────── */
  function tug() {
    const all = get('tp-clin').filter((x) => x.test === 'tug'); const r = last(all); if (!r) return null;
    const m = maker(); const v = r.v;
    if (v >= 10) m.add(v >= 13.5 ? 'r' : 'y', v >= 13.5 ? T('Timed Up and Go oltre la soglia del rischio di caduta') : T('Timed Up and Go rallentato'), T('{v} s (rif. < 10 s; soglia del rischio di caduta 13,5 s).', { v: fmt(v, 1) }),
      (v >= 13.5 ? T('Sopra 13,5 s il test indica un rischio di caduta aumentato nell’anziano che vive a casa.') : T('Il tempo supera i 10 s tipici dell’adulto autonomo: la mobilità è rallentata in una o più fasi (alzata, cammino, giro, seduta).')) +
        (v >= 30 ? ' ' + T('Oltre 30 s di solito serve assistenza negli spostamenti.') : v >= 20 ? ' ' + T('Oltre 20 s la mobilità fuori casa è in genere limitata e può servire un ausilio.') : ''),
      T('Osservare quale fase rallenta: alzata (forza), cammino (velocità), giro (equilibrio), seduta (controllo). Forza delle gambe con il test della sedia.'));
    const oc = all.filter((x) => x.cond !== r.cond).pop();
    if (oc) { const s = r.cond === 'con' ? oc : r; const c = r.cond === 'con' ? r : oc; condItem(m, T('Timed Up and Go'), { v: s.v, t: s.t }, { v: c.v, t: c.t }, ' s', 1, 1.5, true, T('La differenza supera la variabilità abituale tra due prove (circa 1–1,5 s).')); }
    m.note(T('Soglie validate nell’anziano; nell’adulto giovane i tempi abituali sono più bassi (6–8 s).'));
    return { title: T('Timed Up and Go') + ' · ' + condTxt(r.cond) + ' · ' + dateStr(r.t), p: done(m, T('Timed Up and Go {v} s: sotto i 10 s, mobilità di base autonoma.', { v: fmt(v, 1) })) };
  }
  function walk() {
    const all = get('tp-clin').filter((x) => x.test === 'walk' && x.v > 0); const r = last(all); if (!r) return null;
    const m = maker(); const sp = 10 / r.v; const len = r.steps ? 10 / r.steps : NaN; const cad = r.steps ? r.steps / r.v * 60 : NaN;
    if (sp < 1) {
      const short = ok(len) && len < 0.55; const lowC = ok(cad) && cad < 95;
      m.add(sp < 0.8 ? 'r' : 'y', T('Velocità del cammino ridotta'), T('{v} m/s (rif. ≥ 1,0)', { v: fmt(sp, 2) }) + (ok(len) ? ', ' + T('passo medio {l} m, cadenza {c} passi/min', { l: fmt(len, 2), c: Math.round(cad) }) : '') + '.',
        T('La velocità è l’indice globale della funzione del cammino.') + ' ' + (short && lowC ? T('Qui è ridotta sia per i passi corti sia per la cadenza bassa.') : short ? T('Qui la riduzione dipende soprattutto dai passi corti: la cadenza è conservata.') : lowC ? T('Qui la riduzione dipende soprattutto dalla cadenza bassa: la lunghezza del passo è conservata.') : '') +
          (sp < 0.4 ? ' ' + T('Sotto 0,4 m/s il cammino è in genere limitato alla casa.') : sp < 0.8 ? ' ' + T('Sotto 0,8 m/s il cammino fuori casa è in genere limitato.') : ''),
        T('Forza di spinta, resistenza allo sforzo, equilibrio.'));
    }
    const oc = all.filter((x) => x.cond !== r.cond).pop();
    if (oc) { const s = r.cond === 'con' ? oc : r; const c = r.cond === 'con' ? r : oc; condItem(m, T('Velocità del cammino'), { v: 10 / s.v, t: s.t }, { v: 10 / c.v, t: c.t }, ' m/s', 2, 0.1, false, T('Una variazione di 0,1 m/s o più è considerata rilevante dal punto di vista clinico.')); }
    m.note(T('Tempo preso su 10 metri: errore indicativo di qualche decimo di secondo.'));
    return { title: T('Cammino su 10 metri') + ' · ' + condTxt(r.cond) + ' · ' + dateStr(r.t), p: done(m, T('Velocità del cammino {v} m/s: nei valori abituali (≥ 1,0 m/s).', { v: fmt(sp, 2) })) };
  }

  /* ───────── Alzarsi dalla sedia ───────── */
  function chair() {
    const all = get('tp-chair'); const r = last(all); if (!r) return null;
    const m = maker(); const five = r.mode !== 'trenta'; const CHK = T('Forza di quadricipite e glutei, equilibrio nel passaggio da seduti a in piedi, dolore a ginocchia e anche.');
    if (five) {
      if (!r.done) m.add('r', T('Prova delle 5 alzate non completata'), T('{n} alzate su 5.', { n: r.count }), T('La persona non completa 5 alzate di seguito: la forza funzionale delle gambe è nettamente ridotta e il rischio di caduta è da valutare.'), CHK);
      else if (r.time > 12) m.add(r.time > 15 ? 'r' : 'y', T('5 alzate dalla sedia lente'), T('{v} s (rif. ≤ 12 s; soglia del rischio di cadute ripetute 15 s).', { v: fmt(r.time, 1) }),
        r.time > 15 ? T('Oltre 15 s il test si associa a un rischio aumentato di cadute ripetute nell’anziano: la forza funzionale delle gambe è ridotta.') : T('Oltre 12 s la forza funzionale delle gambe è sotto i valori attesi e il rischio di caduta merita un approfondimento.'), CHK);
    } else if (r.count < 12) m.add(r.count < 8 ? 'r' : 'y', T('Poche alzate in 30 secondi'), T('{n} alzate (rif. dopo i 60 anni: circa 12–17).', { n: r.count }),
      r.count < 8 ? T('Meno di 8 alzate: la forza e la resistenza delle gambe sono nettamente ridotte.') : T('Sotto i valori abituali: forza e resistenza delle gambe ridotte.'), CHK);
    if (r.arms === 'mani') m.add('y', T('Prova fatta con l’aiuto delle mani'), T('Braccia non incrociate.'), T('Il test di riferimento si fa a braccia incrociate: se servono le mani, la forza delle gambe non basta per alzarsi da soli e il risultato non è confrontabile con i riferimenti.'), T('Ripetere a braccia incrociate, se possibile in sicurezza.'));
    const oc = all.filter((x) => x.mode === r.mode && x.arms === r.arms && x.cond !== r.cond && (five ? x.done : true)).pop();
    if (oc && (!five || r.done)) { const s = r.cond === 'con' ? oc : r; const c = r.cond === 'con' ? r : oc;
      if (five) condItem(m, T('5 alzate dalla sedia'), { v: s.time, t: s.t }, { v: c.time, t: c.t }, ' s', 1, 1.5, true, T('La differenza supera la variabilità abituale tra due prove (circa 1–1,5 s).'));
      else condItem(m, T('Alzate in 30 secondi'), { v: s.count, t: s.t }, { v: c.count, t: c.t }, '', 0, 2, false, T('Una differenza di 2 o più alzate supera la variabilità abituale tra due prove.')); }
    m.note(T('Riferimenti validati nell’anziano; contano altezza della sedia (circa 45 cm) e posizione delle braccia.'));
    return { title: (five ? T('5 alzate dalla sedia') : T('Alzate in 30 secondi')) + ' · ' + condTxt(r.cond) + ' · ' + dateStr(r.t),
      p: done(m, five ? T('5 alzate in {v} s: entro 12 s, forza funzionale delle gambe nei valori attesi.', { v: fmt(r.time || 0, 1) }) : T('{n} alzate in 30 secondi: nei valori abituali.', { n: r.count })) };
  }

  /* ───────── Test di progressi: equilibrio, salto, sprint (senza valori di riferimento) ───────── */
  const SPORT = {
    equilibrio: { name: () => T('Equilibrio su una gamba'), unit: ' m/s²', d: 2, low: true, pct: 15, why: () => T('L’oscillazione del tronco su una gamba misura il controllo di anca e caviglia in appoggio monopodalico.') },
    ortostasi: { name: () => T('Equilibrio in piedi'), unit: ' m/s²', d: 2, low: true, pct: 15, why: () => T('L’oscillazione del tronco da fermi misura il controllo posturale di base.') },
    salto: { name: () => T('Salto verticale'), unit: ' cm', d: 0, low: false, pct: 6, why: () => T('L’altezza del salto esprime la potenza delle gambe (forza per velocità).') },
    sprint: { name: () => T('Sprint'), unit: ' s', d: 2, low: true, pct: 3, why: () => T('Il tempo sullo sprint esprime accelerazione e velocità massima.') },
  };
  function sport(type) {
    const cfg = SPORT[type]; if (!cfg) return null;
    let all = get('tp-tests').filter((x) => x.type === type && ok(x.value)); if (!all.length) return null;
    if (type === 'sprint') { const dist = (x) => (String(x.note || '').match(/^\d+ m/) || [''])[0]; const d0 = dist(last(all)); all = all.filter((x) => dist(x) === d0); }
    const m = maker(); const avg = (l) => l.reduce((a, b) => a + b.value, 0) / l.length; const r = last(all);
    const S = all.filter((x) => x.cond === 'senza'); const C = all.filter((x) => x.cond === 'con');
    if (S.length && C.length) {
      const a = avg(S); const b = avg(C); const pct = a ? Math.round((b - a) / Math.abs(a) * 100) : 0; const better = cfg.low ? pct < 0 : pct > 0;
      if (Math.abs(pct) >= cfg.pct) m.add(better ? 'g' : 'y', better ? T('{n}: migliore con Equistasi ({p}%)', { n: cfg.name(), p: (pct > 0 ? '+' : '') + pct }) : T('{n}: peggiore con Equistasi ({p}%)', { n: cfg.name(), p: (pct > 0 ? '+' : '') + pct }),
        T('Media senza Equistasi {a} ({n1} prove), con Equistasi {b} ({n2} prove).', { a: fmt(a, cfg.d) + cfg.unit, b: fmt(b, cfg.d) + cfg.unit, n1: S.length, n2: C.length }),
        cfg.why() + ' ' + T('La differenza supera la variabilità abituale tra le prove (circa {p}%).', { p: cfg.pct }), T('Confermare con almeno 3 prove per condizione.'));
    } else m.note(T('Mancano prove in una delle due condizioni (senza e con Equistasi): fare entrambe per il confronto.'));
    const same = all.filter((x) => x.cond === r.cond);
    if (same.length >= 3) { const f = same[0].value; const pct = f ? Math.round((r.value - f) / Math.abs(f) * 100) : 0; const better = cfg.low ? pct < 0 : pct > 0;
      if (Math.abs(pct) >= cfg.pct) m.add(better ? 'g' : 'y', better ? T('{n}: in miglioramento nel tempo', { n: cfg.name() }) : T('{n}: in peggioramento nel tempo', { n: cfg.name() }),
        T('{a} il {d1}, {b} il {d2} ({c}).', { a: fmt(f, cfg.d) + cfg.unit, b: fmt(r.value, cfg.d) + cfg.unit, d1: dateStr(same[0].t), d2: dateStr(r.t), c: condTxt(r.cond) }), cfg.why(), T('Confrontare prove fatte nelle stesse condizioni (ora, scarpe, superficie).')); }
    m.note(T('Per questo test non ci sono valori di riferimento: contano il confronto senza/con Equistasi e l’andamento nel tempo.'));
    return { title: cfg.name() + ' · ' + dateStr(r.t), p: done(m, T('Ultima prova {v}: nessuna variazione oltre la variabilità abituale.', { v: fmt(r.value, cfg.d) + cfg.unit })) };
  }

  /* ───────── Analisi del cammino (ultima prova per vista) ───────── */
  function gait(view) {
    if (!(window.EqGait && window.EqGait._patterns)) return null;
    const e = get('tp-gait').filter((x) => (x.view || 'fronte') === view).pop(); if (!e) return null;
    let p; try { p = window.EqGait._patterns(e.r, view); } catch (er) { return null; }
    return { title: T('Analisi del cammino') + ' · ' + (view === 'lato' ? T('video di lato') : T('video di fronte')) + ' · ' + condTxt(e.cond) + ' · ' + dateStr(e.t), p };
  }

  const TOOLS = {
    stabilita: (o) => stability(o && o.id), tronco: () => tilt('tronco'), testa: () => tilt('testa'), schiena: kyph, foto: photo,
    scolio, gonio, tug, walk, sedia: chair, equilibrio: () => sport('equilibrio'), ortostasi: () => sport('ortostasi'), salto: () => sport('salto'), sprint: () => sport('sprint'),
    camminoFronte: () => gait('fronte'), camminoLato: () => gait('lato'),
  };
  const ALL = ['stabilita', 'tronco', 'testa', 'schiena', 'foto', 'scolio', 'gonio', 'tug', 'walk', 'camminoFronte', 'camminoLato', 'sedia', 'equilibrio', 'ortostasi', 'salto', 'sprint'];
  function sections(keys, opt) {
    if (!allowed()) return [];
    return (keys || ALL).map((k) => { try { return TOOLS[k] ? TOOLS[k](opt) : null; } catch (e) { return null; } }).filter(Boolean);
  }
  const INTRO = () => T('Per il professionista: schemi riconosciuti dai numeri, con il significato meccanico e cosa verificare. Sono ipotesi, non una diagnosi.');
  function bodyHtml(p) {
    return '<p class="gt-synth">' + esc(p.synth) + '</p>' +
      p.list.map((x) => '<div class="gt-pat"><h4><span aria-hidden="true">' + DOT[x.fl] + '</span> ' + esc(x.title) + '</h4><p><b>' + T('Dati') + ':</b> ' + esc(x.ev) + '</p><p><b>' + T('Significato') + ':</b> ' + esc(x.mean) + '</p>' + (x.check ? '<p><b>' + T('Da verificare') + ':</b> ' + esc(x.check) + '</p>' : '') + '</div>').join('') +
      (p.notes.length ? '<p class="small muted" style="margin:8px 0 0"><b>' + T('Affidabilità della misura') + ':</b> ' + p.notes.map(esc).join(' ') + '</p>' : '');
  }
  // scheda da mettere nella pagina di uno strumento (ultima misura)
  function cards(keys, opt) {
    const s = sections(keys, opt); if (!s.length) return '';
    return '<div class="card gt-interp-card"><h3>' + T('Interpretazione biomeccanica') + '</h3><p class="small muted" style="margin:0 0 8px">' + INTRO() + '</p>' +
      s.map((x) => '<div class="gt-isec"><div class="small muted gt-ititle">' + esc(x.title) + '</div>' + bodyHtml(x.p) + '</div>').join('') + '</div>';
  }
  window.EqInterp = { allowed, sections, cards, intro: INTRO, _tools: TOOLS };
})();
