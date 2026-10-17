/* Video veloce su come usare l'app: parte dopo «Dispositivo abbinato», con didascalie e pulsante Salta.
   Uso: EqTutorial.show() → Promise risolta quando il video finisce o si tocca Salta / Inizia. */
(function () {
  // [secondo di inizio, didascalia] — i tempi seguono media/tutorial.mp4 (e la copia .webm per i telefoni senza H.264)
  const STEPS = [
    [0, 'Questa è la tua Home'],
    [3, 'Quando applichi il dispositivo tocca «Ho applicato il dispositivo»: dopo 2 ore ti ricordiamo di toglierlo'],
    [7.4, 'Tocca sul corpo la zona dove senti dolore'],
    [11.8, 'Scegli il disturbo che riconosci'],
    [15.7, 'La X indica dove applicare il dispositivo'],
    [18.7, 'In Promemoria vedi quanto manca e i giorni di fila'],
    [21.7, 'Nei Video impari ad applicarlo nel modo giusto'],
    [24.6, 'In Info trovi il tuo dispositivo abbinato e come leggere la mappa'],
  ];

  function show() {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'tut'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', T('Come usare l’app'));
      el.innerHTML =
        '<div class="tut-bars">' + STEPS.map(() => '<span><i></i></span>').join('') + '</div>' +
        '<div class="tut-top"><b>' + T('Come usare l’app') + '</b><button type="button" class="tut-skip">' + T('Salta') + ' ›</button></div>' +
        '<div class="tut-phone"><video src="media/tutorial.' + (document.createElement('video').canPlayType('video/mp4; codecs="avc1.4d401f"') ? 'mp4' : 'webm') + '" poster="media/tutorial.jpg" playsinline muted autoplay preload="auto"></video></div>' +
        '<p class="tut-cap" aria-live="polite"></p>' +
        '<div class="tut-end"><div class="tut-ok">✓</div><h2>' + T('Tutto pronto!') + '</h2><p>' + T('Puoi rivedere questo video quando vuoi in Video tutorial.') + '</p>' +
        '<button type="button" class="btn primary tut-go">' + T('Inizia') + '</button>' +
        '<button type="button" class="tut-again">↺ ' + T('Rivedi') + '</button></div>';
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('on'));
      const v = el.querySelector('video'); const cap = el.querySelector('.tut-cap'); const bars = el.querySelectorAll('.tut-bars i');
      let cur = -1; let raf = 0; let done = false;

      function tick() {
        const t = v.currentTime; const d = v.duration || 27.5;
        let i = 0; while (i + 1 < STEPS.length && t >= STEPS[i + 1][0]) i++;
        if (i !== cur) { cur = i; cap.classList.remove('in'); void cap.offsetWidth; cap.textContent = T(STEPS[i][1]); cap.classList.add('in'); }
        bars.forEach((b, k) => {
          const a = STEPS[k][0], z = k + 1 < STEPS.length ? STEPS[k + 1][0] : d;
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
      // se il video non si carica (es. offline) si passa direttamente all'app
      v.addEventListener('error', close);
      el.querySelector('.tut-skip').addEventListener('click', close);
      el.querySelector('.tut-go').addEventListener('click', close);
      el.querySelector('.tut-again').addEventListener('click', () => { el.classList.remove('fin'); v.currentTime = 0; v.play().catch(() => {}); });
      // tocco sul video: pausa / riprendi
      v.addEventListener('click', () => { if (v.paused) v.play().catch(() => {}); else v.pause(); });
      v.play().catch(() => {});
      raf = requestAnimationFrame(tick);
    });
  }
  window.EqTutorial = { show };
})();
