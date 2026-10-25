// Test degli algoritmi di Elvy su segnali simulati. Avvio: node --test elvy/test
const test = require('node:test');
const assert = require('node:assert');
const A = require('../js/analysis.js');
const S = require('../js/sim.js');

const near = (v, target, tol, msg) => assert.ok(Math.abs(v - target) <= tol, `${msg || ''} atteso ${target} ± ${tol}, ottenuto ${v}`);
const heightCm = (tf) => (A.G * tf * tf / 8) * 100;

test('salto verticale: altezza dal tempo di volo, telefono girato a caso', () => {
  for (const seed of [1, 2, 3]) {
    const s = S.jumpSequence([{ tf: 0.5 }], { seed });
    const r = A.jumps(s, { mass: 70 });
    assert.ok(r.ok);
    near(r.tf, 0.5, 0.025, 'volo');
    near(r.best, heightCm(0.5), 2.5, 'altezza');
    assert.ok(r.power > 2000 && r.power < 5000);
  }
});

test('salto verticale: segno degli assi invertito (iPhone) dà lo stesso risultato', () => {
  const a = A.jumps(S.jumpSequence([{ tf: 0.45 }], { seed: 4 }));
  const b = A.jumps(S.jumpSequence([{ tf: 0.45 }], { seed: 4, platformSign: -1 }));
  near(a.best, b.best, 0.2);
});

test('salto: nessun salto se il telefono resta fermo', () => {
  const s = S.sample(() => [0, 0, 0], 5);
  assert.strictEqual(A.jumps(s).ok, false);
});

test('drop jump: contatto, volo e RSI', () => {
  const s = S.jumpSequence([{ tc: 0.22, tf: 0.45 }], { drop: 0.3, seed: 9 });
  const r = A.dropJumps(s);
  assert.ok(r.ok, JSON.stringify(r));
  near(r.bestJump.tc, 0.22, 0.03, 'contatto');
  near(r.bestJump.tf, 0.45, 0.03, 'volo');
  near(r.best, (heightCm(0.45) / 100) / 0.22, 0.2, 'RSI');
});

test('salti ripetuti: numero, contatto, potenza di Bosco e fatica', () => {
  const list = Array.from({ length: 12 }, (_, i) => ({ tc: 0.25, tf: 0.5 - i * 0.012 }));
  const r = A.repeatedJumps(S.jumpSequence(list, { seed: 11 }));
  assert.ok(r.ok);
  assert.strictEqual(r.n, 12);
  near(r.avgContact, 0.25, 0.03, 'contatto medio');
  const hs = list.map((j) => heightCm(j.tf));
  const expected = 100 * (1 - (hs.slice(-3).reduce((a, b) => a + b) / hs.slice(0, 3).reduce((a, b) => a + b)));
  near(r.fatigue, expected, 4, 'fatica %');
  assert.ok(r.power > 15 && r.power < 40, 'potenza ' + r.power);
});

test('equilibrio: area di oscillazione vicina a quella vera', () => {
  const A1 = 1.2; const B1 = 0.8; // cm
  const truth = Math.PI * 5.991 * (A1 * B1) / 2;
  const r = A.sway(S.swaySignal(A1, B1, 30, { seed: 5 }));
  assert.ok(r.ok);
  near(r.area, truth, truth * 0.2, 'area cm²');
  assert.strictEqual(r.fell, false);
  near(r.held, 30, 0.2);
});

test('equilibrio: più oscillazione → area più grande', () => {
  const a = A.sway(S.swaySignal(0.6, 0.5, 20, { seed: 1 })).area;
  const b = A.sway(S.swaySignal(1.5, 1.2, 20, { seed: 1 })).area;
  assert.ok(b > a * 3);
});

test('equilibrio: il piede appoggiato ferma la tenuta', () => {
  const r = A.sway(S.swaySignal(1, 1, 30, { fallAt: 18, seed: 2 }));
  assert.ok(r.fell);
  near(r.held, 17.9, 0.6, 'tenuta');
});

test('corsa: cadenza, contatto e regolarità', () => {
  const r = A.running(S.runSignal(170, 0.24, 60, { seed: 3 }));
  assert.ok(r.ok, JSON.stringify(r));
  near(r.cadence, 170, 2, 'cadenza');
  near(r.contact, 0.24, 0.04, 'contatto');
  assert.ok(r.regularity > 0.8, 'regolarità ' + r.regularity);
  assert.ok(r.oscillation > 3 && r.oscillation < 15, 'oscillazione ' + r.oscillation);
  assert.ok(r.series.length >= 5);
});

test('corsa: destra e sinistra separate', () => {
  const r = A.running(S.runSignal(165, 0.24, 60, { tcRight: 0.22, tcLeft: 0.27, seed: 8 }));
  assert.ok(r.ok);
  assert.ok(r.contactLeft > r.contactRight, `sx ${r.contactLeft} dx ${r.contactRight}`);
  assert.ok(r.symmetry < 95);
});

test('corsa: destra e sinistra corrette anche con gli assi invertiti (iPhone)', () => {
  const r = A.running(S.runSignal(165, 0.24, 60, { tcRight: 0.22, tcLeft: 0.27, seed: 8, platformSign: -1 }), { platformSign: -1 });
  assert.ok(r.contactLeft > r.contactRight, `sx ${r.contactLeft} dx ${r.contactRight}`);
});

test('plank: tenuta fino a quando il bacino cede', () => {
  const ok = A.plank(S.plankSignal(30, { seed: 1 }));
  assert.ok(ok.ok && !ok.broke);
  const br = A.plank(S.plankSignal(40, { breakAt: 22, seed: 1 }));
  assert.ok(br.broke);
  near(br.held, 22, 1.5, 'tenuta');
});

test('mobilità: angolo raggiunto e mantenuto', () => {
  for (const deg of [20, 45, 120]) {
    const { samples, ref } = S.tiltSignal(deg, 4, { seed: deg });
    const r = A.mobility(samples, ref);
    assert.ok(r.ok);
    near(r.angle, deg, 2, 'angolo');
  }
});

test('reazione: inizio del movimento dopo lo stimolo', () => {
  const s = S.sample((t) => [t > 2.25 && t < 2.5 ? 8 : 0, 0, 0], 3, { seed: 2 });
  const t = A.motionOnset(s, 3000);
  near(t - 3000, 250, 25, 'ms');
  assert.strictEqual(A.movedBefore(s, 2000, 3000), false);
});

test('battito dalla fotocamera: frequenza e RMSSD', () => {
  for (const [hr, rmssd] of [[58, 60], [72, 35], [95, 15]]) {
    const { frames, rr } = S.ppgSignal(hr, rmssd, 60, { seed: hr });
    const r = A.ppg(frames);
    assert.ok(r.ok, JSON.stringify(r).slice(0, 200));
    const truth = A.hrvFromRR(rr.slice(3, -3));
    near(r.hr, truth.hr, 2, 'battiti/min');
    near(r.rmssd, truth.rmssd, Math.max(6, truth.rmssd * 0.25), 'RMSSD');
    assert.ok(r.quality > 0.85, 'qualità ' + r.quality);
  }
});

test('battito: nessun dito sulla fotocamera = nessun risultato', () => {
  const r = S.rng(3); const frames = [];
  for (let t = 0; t < 30000; t += 33) frames.push({ t, v: 120 + 6 * (r() - 0.5) });
  assert.strictEqual(A.ppg(frames).ok, false);
});

test('recupero dall\'HRV rispetto alla media', () => {
  const hist = [4.0, 4.1, 3.9, 4.05, 4.0];
  assert.ok(A.readinessHRV(4.3, hist).score > 85);
  assert.ok(A.readinessHRV(3.6, hist).score < 50);
  assert.strictEqual(A.readinessHRV(4, [4]), null);
});

test('swing: velocità di rotazione di picco e velocità della punta', () => {
  const r = A.swings(S.swingSignal([900, 1200, 1050]), { lever: 1 });
  assert.ok(r.ok);
  assert.strictEqual(r.swings.length, 3);
  near(r.best, 1200 * Math.hypot(0.3, 0.2, 0.93), 40, '°/s');
  near(r.bestKmh, (r.best * Math.PI / 180) * 3.6, 0.5, 'km/h');
});

test('giroscopio: senza dati restituisce null', () => {
  assert.strictEqual(A.gyroRms([{ t: 0, x: 0, y: 0, z: 9.8 }]), null);
});

test('GPS: distanza, passo e salti scartati', () => {
  const r = A.track(S.gpsTrack(3.5, 600, { seed: 4, jumps: true }));
  assert.ok(r.ok);
  near(r.distance, 3.5 * 600, 3.5 * 600 * 0.05, 'metri');
  near(r.speed, 3.5, 0.2, 'm/s');
  assert.ok(r.splits.length === 2, 'parziali ' + r.splits.length);
  near(A.cooperVO2(2800), 51.3, 0.2, 'VO2max');
});
