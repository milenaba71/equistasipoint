/* Video veloce su come usare l'app: parte dopo «Dispositivo abbinato», con didascalie e pulsante Salta.
   Uso: EqTutorial.show() → Promise risolta quando il video finisce o si tocca Salta / Inizia. */
(function () {
  // Didascalie: [secondo di inizio nel video in italiano, nel video in inglese, testo]
  const STEPS = [
    [0, 0, 'Questa è la tua Home'],
    [5.17, 4.47, 'In alto il tuo dispositivo abbinato: cambi dispositivo, aggiungi una persona o cancelli i dati'],
    [15.02, 12.37, 'Tocca «Ho applicato il dispositivo» e segna il dolore: dopo 2 ore ti ricordiamo di toglierlo'],
    [24.87, 20.67, 'Tocca sul corpo la zona dove senti dolore e scegli il disturbo'],
    [30.38, 25.77, 'La X indica dove applicare il dispositivo, la zona blu è dove si estende il dolore'],
    [36.94, 31.62, 'Metodo alternativo: tocca «metamero»'],
    [41.33, 35.47, 'In Promemoria vedi quanto manca, i giorni di fila e il dolore prima e dopo'],
    [48.2, 41.62, 'Una volta all’anno il dispositivo va calibrato: la barra ti dice quanto manca'],
    [56.69, 49.22, 'Nei Video impari ad applicarlo nel modo giusto'],
    [60.3, 52.28, 'Misura la postura con i sensori e la fotocamera, senza e con Equistasi'],
    [66.93, 58.93, 'Crea il report in PDF per il medico o il fisioterapista'],
    [72.52, 63.68, 'Se fai sport, in Progressi misuri equilibrio, salto e sprint: sempre con una persona vicino'],
    [81.4, 72.63, 'Su iPhone avvii i test dall’Apple Watch'],
    [86.28, 76.93, 'In Info trovi il tuo dispositivo e come leggere la mappa'],
  ];
  // video registrati dall'app, con la voce maschile dei tutorial Equistasi (Higgsfield), in italiano e in inglese
  const CF = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/';
  const SRC = { it: CF + '1779e668-1992-40ad-84c9-39b509cc48e0.mp4', en: CF + '2d6ca29b-cf22-4273-ae1a-bb018e77f464.mp4' };
  const POSTER = { it: CF + 'c214674c-7c1e-44bc-83fe-c4cf7acc7faa.jpg', en: CF + 'adeadd83-c728-4bf0-83b9-4eeef9c02834.jpg' };
  const DUR = { it: 93, en: 82.6 };

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
