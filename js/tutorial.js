/* Video veloce su come usare l'app: parte dopo «Dispositivo abbinato», con didascalie e pulsante Salta.
   Uso: EqTutorial.show() → Promise risolta quando il video finisce o si tocca Salta / Inizia. */
(function () {
  // Didascalie: [secondo di inizio nel video in italiano, nel video in inglese, testo]
  const STEPS = [
    [0, 0, 'Questa è la tua Home'],
    [5.3, 3.47, 'In alto il tuo dispositivo abbinato: cambi dispositivo, aggiungi una persona o cancelli i dati'],
    [15.56, 11.17, 'Tocca «Ho applicato il dispositivo» e segna il dolore: dopo 2 ore ti ricordiamo di toglierlo'],
    [25.74, 19.34, 'Tocca sul corpo la zona dove senti dolore e scegli il disturbo'],
    [31.04, 24.56, 'La X indica dove applicare il dispositivo, la zona blu è dove si estende il dolore'],
    [37.85, 29.78, 'Metodo alternativo: tocca «dermatomero e metamero»'],
    [43.88, 35.08, 'In Promemoria vedi quanto manca, i giorni di fila e il dolore prima e dopo'],
    [51.66, 41.5, 'Una volta all’anno il dispositivo va calibrato: la barra ti dice quanto manca'],
    [60.72, 49.2, 'Nei Video impari ad applicarlo nel modo giusto'],
    [64.35, 52.49, 'In Misura trovi tutti i test: equilibrio, salto e sprint, sempre con una persona vicino'],
    [73.8, 61.47, 'Misura la postura con i sensori e la fotocamera, senza e con Equistasi'],
    [80.69, 68.04, 'Crea il report in PDF per il medico o il fisioterapista'],
    [86.3, 72.79, 'Su iPhone avvii i test dall’Apple Watch'],
    [91.44, 77.36, 'In Info trovi il tuo dispositivo e come leggere la mappa'],
  ];
  // video registrati dall'app, con la voce maschile dei tutorial Equistasi (Higgsfield), in italiano e in inglese
  const CF = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/';
  const SRC = { it: CF + '5d4f47b0-1abd-4f9b-b4d1-1f362a14abfc.mp4', en: CF + 'd1022c30-22b1-4242-9ce1-8913074b88fd.mp4' };
  const POSTER = { it: CF + '231d7601-f9b5-4bc5-9eae-334d3283e6d8.jpg', en: CF + '389f340f-c0a0-4065-952b-8a08b81b6240.jpg' };
  const DUR = { it: 97.9, en: 82.4 };

  function show() {
    return new Promise((resolve) => {
      const lang = window.LANG === 'en' ? 'en' : 'it'; const col = lang === 'en' ? 1 : 0;
      const el = document.createElement('div');
      el.className = 'tut'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', T('Come usare l’app'));
      el.innerHTML =
        '<div class="tut-bars">' + STEPS.map(() => '<span><i></i></span>').join('') + '</div>' +
        '<div class="tut-top"><b>' + T('Come usare l’app') + '</b><button type="button" class="tut-skip">' + T('Salta') + ' ›</button></div>' +
        '<div class="tut-phone"><video poster="' + POSTER[lang] + '" playsinline autoplay preload="auto"></video>' +
        '<button type="button" class="tut-sound" hidden>🔇 ' + T('Tocca per l’audio') + '</button></div>' +
        '<p class="tut-cap" aria-live="polite"></p>' +
        '<div class="tut-end"><div class="tut-ok">✓</div><h2>' + T('Tutto pronto!') + '</h2><p>' + T('Puoi rivedere questo video quando vuoi in Video tutorial.') + '</p>' +
        '<button type="button" class="btn primary tut-go">' + T('Inizia') + '</button>' +
        '<button type="button" class="tut-again">↺ ' + T('Rivedi') + '</button></div>';
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('on'));
      const v = el.querySelector('video');
      v.src = SRC[lang];
      const snd = el.querySelector('.tut-sound'); const cap = el.querySelector('.tut-cap'); const bars = el.querySelectorAll('.tut-bars i');
      let cur = -1; let raf = 0; let done = false;

      function tick() {
        const t = v.currentTime; const d = v.duration || DUR[lang];
        let i = 0; while (i + 1 < STEPS.length && t >= STEPS[i + 1][col]) i++;
        if (i !== cur) { cur = i; cap.classList.remove('in'); void cap.offsetWidth; cap.textContent = T(STEPS[i][2]); cap.classList.add('in'); }
        bars.forEach((b, k) => {
          const a = STEPS[k][col], z = k + 1 < STEPS.length ? STEPS[k + 1][col] : d;
          if (z > a) b.style.transform = 'scaleX(' + Math.min(1, Math.max(0, (t - a) / (z - a))) + ')';
        });
        raf = requestAnimationFrame(tick);
      }
      function close() {
        if (done) return; done = true;
        cancelAnimationFrame(raf); v.pause();
        el.classList.remove('on');
        setTimeout(() => { el.remove(); resolve(); }, 300);
      }
      v.addEventListener('ended', () => el.classList.add('fin'));
      // senza connessione il video non si carica: si passa direttamente all'app (si può rivedere da Video tutorial)
      v.addEventListener('error', close);
      el.querySelector('.tut-skip').addEventListener('click', close);
      el.querySelector('.tut-go').addEventListener('click', close);
      el.querySelector('.tut-again').addEventListener('click', () => { el.classList.remove('fin'); v.currentTime = 0; v.play().catch(() => {}); });
      // tocco sul video: pausa / riprendi
      v.addEventListener('click', () => { if (v.paused) v.play().catch(() => {}); else v.pause(); });
      // senza un tocco recente il telefono può bloccare l'audio: parte muto con il pulsante per attivarlo
      v.play().catch(() => { v.muted = true; snd.hidden = false; v.play().catch(() => {}); });
      snd.addEventListener('click', () => { v.muted = false; snd.hidden = true; v.play().catch(() => {}); });
      raf = requestAnimationFrame(tick);
    });
  }
  window.EqTutorial = { show };
})();
