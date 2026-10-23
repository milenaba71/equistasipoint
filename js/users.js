/* Più persone sullo stesso telefono (famiglia): ognuna ha profilo, nome, dispositivo, test, postura e promemoria.
   La persona attiva usa le chiavi normali di localStorage (così il resto dell'app non cambia);
   le altre persone sono messe da parte con il prefisso «tp-u.<id>.». Cambiare persona sposta le chiavi e ricarica l'app.
   Lingua, avviso iniziale, beta e contenuti scaricati restano comuni a tutti. */
(function () {
  const KEYS = ['tp-profile', 'tp-name', 'tp-serial', 'tp-side', 'tp-devtype', 'tp-posture', 'tp-posture-photos', 'tp-posture-prefs',
    'tp-tests', 'tp-test-prefs', 'tp-chair', 'tp-chair-prefs', 'tp-session', 'tp-log', 'tp-daily',
    'tp-pro', 'tp-pro-at', 'tp-pro-prefs', 'tp-gonio', 'tp-scolio', 'tp-pain', 'tp-use', 'tp-clin'];
  const LIST = 'tp-users';
  const ACTIVE = 'tp-user';
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage non disponibile */ } },
  };
  const box = (id, k) => 'tp-u.' + id + '.' + k;

  function ids() { try { const a = JSON.parse(ls.get(LIST) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveIds(a) { ls.set(LIST, JSON.stringify(a)); }
  function active() {
    const a = ids(); let cur = ls.get(ACTIVE);
    if (!cur || !a.includes(cur)) { cur = a[0] || 'u1'; ls.set(ACTIVE, cur); }
    if (!a.includes(cur)) { a.unshift(cur); saveIds(a); }
    return cur;
  }

  // Sposta una chiave (prima toglie, poi scrive: non serve spazio in più, utile per le foto)
  function move(from, to) {
    const v = ls.get(from); if (v === null) { ls.del(to); return; }
    ls.del(from); if (!ls.set(to, v)) ls.set(from, v);
  }
  function park(id) { KEYS.forEach((k) => move(k, box(id, k))); }
  function unpark(id) { KEYS.forEach((k) => move(box(id, k), k)); }

  function info(id) {
    const cur = active();
    const read = (k) => (id === cur ? ls.get(k) : ls.get(box(id, k)));
    let profile = null; try { profile = JSON.parse(read('tp-profile') || 'null'); } catch (e) { profile = null; }
    return { id, name: (read('tp-name') || '').trim(), serial: read('tp-serial') || '', profile, active: id === cur };
  }
  function list() { active(); return ids().map(info); }
  function label(u, i) { return u.name || T('Persona {n}', { n: i + 1 }); }

  function switchTo(id) {
    const cur = active();
    if (id === cur || !ids().includes(id)) return;
    park(cur); unpark(id); ls.set(ACTIVE, id);
    location.hash = '#/'; location.reload();
  }

  // Nuova persona: stesso dispositivo della persona attuale (si può cambiare), poi sceglie il profilo
  function add(name) {
    const cur = active(); const a = ids();
    let n = a.length + 1; while (a.includes('u' + n)) n++;
    const id = 'u' + n; const serial = ls.get('tp-serial') || '';
    park(cur); a.push(id); saveIds(a); ls.set(ACTIVE, id);
    if (name) ls.set('tp-name', name.slice(0, 40));
    if (serial) ls.set('tp-serial', serial);
    location.hash = '#/'; location.reload();
  }

  // Cancella una persona e i suoi dati da questo telefono
  function remove(id) {
    const cur = active(); const a = ids();
    if (a.length < 2 || !a.includes(id)) return false;
    if (id === cur) {
      KEYS.forEach((k) => ls.del(k));
      const next = a.find((x) => x !== id); saveIds(a.filter((x) => x !== id)); unpark(next); ls.set(ACTIVE, next);
      location.hash = '#/'; location.reload();
    } else {
      KEYS.forEach((k) => ls.del(box(id, k))); saveIds(a.filter((x) => x !== id));
    }
    return true;
  }

  // Cancella solo i risultati della persona attiva: profilo e dispositivo restano
  const RESULTS = ['tp-posture', 'tp-posture-photos', 'tp-tests', 'tp-chair', 'tp-session', 'tp-log', 'tp-daily', 'tp-gonio', 'tp-scolio', 'tp-pain', 'tp-use', 'tp-clin'];
  function clearResults() { RESULTS.forEach((k) => ls.del(k)); }
  // Cancella tutto su questo telefono (tutte le persone) e si riparte dall'inizio; resta solo la lingua
  function wipeAll() {
    const lang = ls.get('tp-lang');
    try { localStorage.clear(); } catch (e) { /* storage non disponibile */ }
    if (lang) ls.set('tp-lang', lang);
  }

  window.EqUsers = { clearResults, wipeAll, list, active, label, switchTo, add, remove, count: () => (active(), ids().length) };
})();
