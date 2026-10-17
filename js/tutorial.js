/* Video veloce su come usare l'app: parte dopo «Dispositivo abbinato», con didascalie e pulsante Salta.
   Uso: EqTutorial.show() → Promise risolta quando il video finisce o si tocca Salta / Inizia. */
(function () {
  // Didascalie: [secondo di inizio nel video muto, secondo nel video doppiato, testo]
  const STEPS = [
    [0, 0, 'Questa è la tua Home'],
    [3, 4.22, 'Quando applichi il dispositivo tocca «Ho applicato il dispositivo»: dopo 2 ore ti ricordiamo di toglierlo'],
    [7.4, 12.08, 'Tocca sul corpo la zona dove senti dolore'],
    [11.8, 16.42, 'Scegli il disturbo che riconosci'],
    [15.7, 20.36, 'La X indica dove applicare il dispositivo'],
    [18.7, 24.05, 'In Promemoria vedi quanto manca e i giorni di fila'],
    [21.7, 28.48, 'Nei Video impari ad applicarlo nel modo giusto'],
    [24.6, 32.12, 'In Info trovi il tuo dispositivo abbinato e come leggere la mappa'],
  ];
  // versione con la voce maschile in italiano dei tutorial Equistasi (Higgsfield); in inglese, o senza H.264, il video muto del sito
  const DUB = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/289c44c4-8e5e-42ac-81c1-6b93f2361c65.mp4';

  function show() {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'tut'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', T('Come usare l’app'));
      el.innerHTML =
        '<div class="tut-bars">' + STEPS.map(() => '<span><i></i></span>').join('') + '</div>' +
        '<div class="tut-top"><b>' + T('Come usare l’app') + '</b><button type="button" class="tut-skip">' + T('Salta') + ' ›</button></div>' +
        '<div class="tut-phone"><video poster="media/tutorial.jpg" playsinline autoplay preload="auto"></video>' +
        '<button type="button" class="tut-sound" hidden>🔇 ' + T('Tocca per l’audio') + '</button></div>' +
        '<p class="tut-cap" aria-live="polite"></p>' +
        '<div class="tut-end"><div class="tut-ok">✓</div><h2>' + T('Tutto pronto!') + '</h2><p>' + T('Puoi rivedere questo video quando vuoi in Video tutorial.') + '</p>' +
        '<button type="button" class="btn primary tut-go">' + T('Inizia') + '</button>' +
        '<button type="button" class="tut-again">↺ ' + T('Rivedi') + '</button></div>';
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('on'));
      const v = el.querySelector('video');
      const mp4 = !!v.canPlayType('video/mp4; codecs="avc1.4d401f"');
      let dub = mp4 && window.LANG !== 'en'; let col = dub ? 1 : 0;
      v.src = dub ? DUB : 'media/tutorial.' + (mp4 ? 'mp4' : 'webm');
      v.muted = !dub;
      const snd = el.querySelector('.tut-sound'); const cap = el.querySelector('.tut-cap'); const bars = el.querySelectorAll('.tut-bars i');
      let cur = -1; let raf = 0; let done = false;

      function tick() {
        const t = v.currentTime; const d = v.duration || (dub ? 39.4 : 26);
        let i = 0; while (i + 1 < STEPS.length && t >= STEPS[i + 1][col]) i++;
        if (i !== cur) { cur = i; cap.classList.remove('in'); void cap.offsetWidth; cap.textContent = T(STEPS[i][2]); cap.classList.add('in'); }
        bars.forEach((b, k) => {
          const a = STEPS[k][col], z = k + 1 < STEPS.length ? STEPS[k + 1][col] : d;
          b.style.transform = 'scaleX(' + Math.min(1, Math.max(0, (t - a) / (z - a))) + ')';
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
      // se la versione doppiata non si carica si usa quella muta del sito; se manca anche quella si passa all'app
      v.addEventListener('error', () => {
        if (!dub) { close(); return; }
        dub = false; col = 0; snd.hidden = true; v.muted = true; v.src = 'media/tutorial.mp4'; v.play().catch(() => {});
      });
      el.querySelector('.tut-skip').addEventListener('click', close);
      el.querySelector('.tut-go').addEventListener('click', close);
      el.querySelector('.tut-again').addEventListener('click', () => { el.classList.remove('fin'); v.currentTime = 0; v.play().catch(() => {}); });
      // tocco sul video: pausa / riprendi
      v.addEventListener('click', () => { if (v.paused) v.play().catch(() => {}); else v.pause(); });
      // senza un tocco recente il telefono può bloccare l'audio: parte muto con il pulsante per attivarlo
      v.play().catch(() => { if (!dub) return; v.muted = true; snd.hidden = false; v.play().catch(() => {}); });
      snd.addEventListener('click', () => { v.muted = false; snd.hidden = true; v.play().catch(() => {}); });
      raf = requestAnimationFrame(tick);
    });
  }
  window.EqTutorial = { show };
})();
