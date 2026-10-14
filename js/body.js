/*
 * Corpo umano stilizzato con muscoli (SVG).
 * Sistema di coordinate: viewBox 0 0 200 440, asse di simmetria x = 100.
 * Ogni vista definisce solo la metà sinistra del disegno (x < 100):
 * la metà destra viene ottenuta per specchiatura.
 *
 * Muscoli "deep" (profondi) sono disegnati come contorno tratteggiato
 * e si colorano solo quando sono il muscolo selezionato.
 */
(function () {
  const OUTLINE =
    'M100,50 L91,50 C91,56 90,60 89,62 C84,66 74,69 68,72 C60,75 55,82 54,92 ' +
    'C53,102 54,112 55,120 C53,135 49,148 47,160 C44,178 40,205 37,230 ' +
    'C35,238 33,248 34,258 C35,264 37,268 40,269 C43,270 46,268 47,262 ' +
    'C48,255 49,245 48,235 C51,215 55,190 58,170 C60,158 63,140 67,122 L70,108 ' +
    'C72,120 73,135 74,150 C75,162 77,172 77,180 C76,190 72,198 71,208 ' +
    'C69,225 70,250 72,270 C73,285 75,298 76,310 C76,322 74,332 74,345 ' +
    'C74,362 79,380 82,398 C81,405 78,412 77,420 C77,424 80,426 86,426 L96,426 ' +
    'C98,425 98,420 97,414 C96,408 95,403 95,398 C96,380 99,360 98,345 ' +
    'C97,333 96,325 96,315 C96,300 97,280 98,262 C99,250 99,238 99,232 L100,232 Z';

  const FRONT = [
    { id: 'vasto_laterale', d: 'M72,226 C70,250 72,280 77,305 L83,300 C80,275 79,245 80,224 Z', a: 82 },
    { id: 'retto_femorale', d: 'M84,214 C80,240 80,270 84,298 L89,298 C92,270 91,240 87,212 Z', a: 90 },
    { id: 'vasto_mediale', d: 'M89,262 C88,280 89,296 92,308 L97,312 C98,298 97,280 94,268 Z', a: 62 },
    { id: 'adduttori', d: 'M88,222 C92,230 97,232 99,233 C98,250 96,265 94,270 C91,255 88,240 86,226 Z', a: 72 },
    { id: 'tensore_fascia_lata', d: 'M75,202 C72,210 71,220 72,232 L77,238 C78,226 79,214 79,206 Z', a: 82 },
    { id: 'sartorio', d: 'M79,206 C84,235 89,268 94,306 L97,304 C93,268 88,234 82,206 Z', a: 80 },
    { id: 'ileopsoas', d: 'M85,207 C87,213 89,219 91,225 L87,226 C85,220 83,214 82,209 Z', a: 62 },
    { id: 'peronei', d: 'M75,330 C74,350 77,375 81,395 L84,395 C81,372 79,350 80,330 Z', a: 84 },
    { id: 'tibiale_anteriore', d: 'M80,326 C80,345 83,370 85,396 L89,396 C88,370 86,345 86,326 Z', a: 86 },
    { id: 'gastrocnemio', d: 'M91,326 C95,335 98,350 97,370 L94,372 C92,356 89,340 88,326 Z', a: 78 },
    { id: 'obliquo', d: 'M76,120 C80,123 86,124 90,122 C88,145 88,170 89,192 C86,198 80,202 74,204 C73,196 76,188 77,180 C77,165 75,140 74,128 Z', a: 42 },
    { id: 'retto_addome', d: 'M99,122 L90,122 C88,140 88,170 89,190 C90,200 93,212 99,222 Z', a: 90 },
    { id: 'serrato', d: 'M70,108 C72,118 73,128 74,140 L79,136 L75,130 L78,125 L74,120 L77,115 Z', a: 150 },
    { id: 'pettorale', d: 'M95,69 C88,70 79,72 72,76 C68,82 66,90 66,96 C69,104 72,112 76,118 C82,122 90,123 99,121 L99,70 Z', a: 170 },
    { id: 'bicipite', d: 'M66,100 C62,110 59,125 58,140 C57,150 57,156 58,162 C61,150 64,135 66,122 C67,112 67,106 66,100 Z', a: 96 },
    { id: 'deltoide', d: 'M69,73 C61,75 55,82 54,94 C54,104 55,113 58,120 C61,112 64,104 66,96 C67,88 68,80 72,76 Z', a: 78 },
    { id: 'trapezio', d: 'M91,53 C88,60 80,66 68,72 C76,72 84,70 90,66 Z', a: 150 },
    { id: 'scm', d: 'M87,38 C90,46 94,56 98,67 L95,68 C91,58 87,49 85,41 Z', a: 66 },
    { id: 'brachioradiale', d: 'M48,160 C45,176 41,202 38,229 L43,232 C46,206 49,182 53,166 Z', a: 82 },
    { id: 'flessori_avambraccio', d: 'M53,166 C50,186 46,210 43,232 L48,234 C51,212 55,188 58,168 Z', a: 80 },
    { id: 'temporale', d: 'M90,13 C86,15 84,20 85,27 L89,29 C88,23 89,18 93,14 Z', a: 95 },
    { id: 'massetere', d: 'M86,34 L91,33 L92,43 L88,45 Z', a: 82 },
  ];
  const FRONT_DETAIL =
    // sterno, linea alba e intersezioni tendinee del retto dell'addome
    '<path d="M98.6,70 L100,70 L100,121 L98.8,121 Z" class="tendon"/>' +
    '<path d="M99,122 L100,122 L100,222 L99.4,222 Z" class="tendon"/>' +
    '<path d="M90,140 L99,140 M89,158 L99,158 M89,176 L99,176" class="tendon-line"/>' +
    // legamento inguinale, tendine rotuleo, tendini di polso e caviglia
    '<path d="M78,204 C84,212 91,220 97,226" class="tendon-line thin"/>' +
    '<path d="M84.6,319 L87.6,319 L87.1,328 L85.1,328 Z" class="tendon"/>' +
    '<path d="M40,223 L39.2,232.5 M42.6,224 L42.2,233 M45.2,225 L45.2,233.6" class="tendon-line thin"/>' +
    '<path d="M83.5,392 L89.5,392 L90.2,402 L84.2,402 Z" class="tendon"/>' +
    // fibre pettorale
    '<path d="M95,80 C86,84 76,88 69,92 M97,95 C88,97 78,98 69,97 M98,110 C90,108 80,104 71,101" class="line"/>' +
    // clavicola
    '<path d="M97,68 C88,68 78,70 70,73" class="bone-line"/>' +
    // rotula
    '<ellipse cx="86" cy="313" rx="5" ry="6.5" class="bone"/>' +
    // linea dei quadricipiti
    '<path d="M85,300 C86,304 86,306 86,307" class="line"/>';

  const BACK = [
    { id: 'gran_dorsale', d: 'M89,120 C86,122 78,121 70,110 C72,125 74,145 76,170 C77,180 76,190 76,198 C84,198 92,198 99,200 L99,150 C96,140 92,130 89,120 Z', a: 112 },
    { id: 'erettori', d: 'M99,118 L93,118 C91,140 90,170 90,200 C93,206 96,210 99,212 Z', a: 90 },
    { id: 'trapezio_medio', d: 'M100,70 C86,72 76,73 68,72 C72,77 80,80 88,86 C90,100 94,130 100,165 Z', a: 165 },
    { id: 'trapezio', d: 'M99,40 C96,46 93,52 91,56 C86,62 78,68 68,72 C76,73 86,72 100,70 L100,40 Z', a: 140 },
    { id: 'infraspinato', d: 'M88,89 C82,87 75,83 70,80 C68,90 70,102 74,110 C80,114 86,116 89,118 C89,108 89,98 88,89 Z', a: 160 },
    { id: 'rotondo', d: 'M74,110 C72,112 70,110 67,106 L66,110 C70,116 78,121 86,122 L89,118 C84,116 78,113 74,110 Z', a: 150 },
    { id: 'deltoide', d: 'M68,72 C60,75 55,82 54,94 C54,104 55,113 58,120 C61,110 64,100 68,92 C70,86 72,80 74,77 Z', a: 82 },
    { id: 'tricipite', d: 'M57,112 C53,128 50,145 48,158 L57,165 C59,148 62,132 66,118 Z', a: 95 },
    { id: 'estensori_radiali', d: 'M48,160 C45,176 41,202 38,229 L43,232 C46,206 49,182 53,166 Z', a: 82 },
    { id: 'estensore_dita', d: 'M53,166 C50,186 46,210 43,232 L48,234 C51,212 55,188 58,168 Z', a: 80 },
    { id: 'gluteo_medio', d: 'M74,202 C82,198 92,198 98,202 C95,208 90,214 84,216 C80,218 76,220 73,222 C72,215 72,208 74,202 Z', a: 105 },
    { id: 'gluteo_massimo', d: 'M98,206 C99,220 99,240 99,252 C92,256 84,256 78,252 C75,245 73,236 73,226 C80,220 90,212 98,206 Z', a: 128 },
    { id: 'vasto_laterale', d: 'M72,232 C70,252 72,282 77,305 L80,304 C77,280 76,262 78,254 Z', a: 85 },
    { id: 'ischiocrurali', d: 'M78,256 C76,272 78,290 82,306 L87,304 C86,288 86,272 87,256 Z M88,256 C88,272 89,290 92,306 L96,304 C97,288 98,272 98,254 Z', a: 90 },
    { id: 'soleo', d: 'M78,350 C78,368 81,382 85,392 L90,392 C93,382 96,368 97,350 C94,366 91,372 87,372 C83,372 80,366 78,350 Z', a: 90 },
    { id: 'gastrocnemio', d: 'M79,322 C76,334 77,350 82,368 L87,366 C87,350 87,336 86,322 Z M88,322 C88,336 88,352 89,370 C93,366 97,352 97,338 C97,330 95,324 93,322 Z', a: 90 },
    // profondi
    { id: 'romboidi', d: 'M99,74 L89,87 L89,120 L99,108 Z', a: 112, deep: true },
    { id: 'elevatore_scapola', d: 'M93,44 C91,55 87,70 84,84 L88,85 C90,70 93,56 96,46 Z', a: 76, deep: true },
    { id: 'sovraspinato', d: 'M88,79 C82,77 76,76 71,75 L71,79 C77,80 83,81 88,83 Z', a: 176, deep: true },
    { id: 'splenio', d: 'M98,41 C95,47 93,53 92,59 L95,59 C96,53 98,48 99.5,44 Z', a: 62, deep: true },
    { id: 'suboccipitali', d: 'M99.5,39 L91,37 L91,41 L99.5,43 Z', a: 15, deep: true },
    { id: 'quadrato_lombi', d: 'M90,172 C86,178 83,188 82,198 L88,200 C89,190 90,180 92,174 Z', a: 92, deep: true },
    { id: 'gluteo_minimo', d: 'M76,205 C82,203 88,204 93,206 L87,214 L76,219 Z', a: 120, deep: true },
    { id: 'piriforme', d: 'M97,219 C90,221 82,225 74,229 L75,233 C83,230 90,227 97,225 Z', a: 162, deep: true },
  ];
  const BACK_DETAIL =
    // aponeurosi del trapezio (C7) e fascia toraco-lombare
    '<path d="M100,55 L96.5,62 L100,73 Z" class="tendon"/>' +
    '<path d="M100,168 L92,178 L90.5,199 L99,211 L100,211 Z" class="tendon fascia"/>' +
    '<path d="M86,323 C87,340 87,352 87,366" class="line"/>' +
    '<path d="M86,390 L89,390 L89,405 L86,405 Z" class="tendon"/>' +
    '<path d="M70,76 C76,80 82,83 88,87" class="bone-line"/>';

  const CENTER_FRONT =
    '<ellipse cx="100" cy="29" rx="15" ry="19" class="head"/>' +
    '<ellipse cx="84.5" cy="31" rx="2.2" ry="5" class="skin"/>' +
    '<ellipse cx="115.5" cy="31" rx="2.2" ry="5" class="skin"/>' +
    '<path d="M92.5,24.5 q2.5,-1.6 5,0 M102.5,24.5 q2.5,-1.6 5,0" class="brow"/>' +
    '<ellipse cx="95" cy="28" rx="1.9" ry="1" class="eye"/><ellipse cx="105" cy="28" rx="1.9" ry="1" class="eye"/>' +
    '<path d="M100,29 L99,35.5 Q100,36.6 101.2,35.6" class="face"/>' +
    '<path d="M96.6,40.4 q3.4,1.6 6.8,0" class="face"/>';
  const POST_FRONT = '<path d="M100,70 L100,222" class="line"/>';
  const CENTER_BACK =
    '<ellipse cx="100" cy="29" rx="15" ry="19" class="head"/>' +
    '<ellipse cx="84.5" cy="31" rx="2.2" ry="5" class="skin"/>' +
    '<ellipse cx="115.5" cy="31" rx="2.2" ry="5" class="skin"/>' +
    '<path d="M85.2,27 C84.5,14 92,10 100,10 C108,10 115.5,14 114.8,27 C113,20 108,15.5 100,15.5 C92,15.5 87,20 85.2,27 Z" class="hair"/>';
  const POST_BACK =
    '<path d="M100,46 L100,212" class="spine"/>' +
    '<circle cx="100" cy="62" r="1.6" class="bone"/>' +
    '<path d="M95,206 L105,206 L101,226 L99,226 Z" class="bone"/>';

  const MIRROR = 'matrix(-1 0 0 1 200 0)';

  /* Fibre muscolari: linee parallele nella direzione "a" (gradi), ritagliate sulla forma. */
  function bounds(d) {
    const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i + 1 < n.length; i += 2) {
      x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]);
      y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]);
    }
    return [x0, y0, x1, y1];
  }
  const fibreCache = {};
  function fibres(m) {
    if (fibreCache[m.d]) return fibreCache[m.d];
    const [x0, y0, x1, y1] = bounds(m.d);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const L = Math.hypot(x1 - x0, y1 - y0) / 2 + 1;
    const r = (m.a * Math.PI) / 180;
    const dx = Math.cos(r), dy = Math.sin(r), nx = -dy, ny = dx;
    const step = 1.15;
    let out = '';
    for (let k = -L; k <= L; k += step) {
      const px = cx + k * nx, py = cy + k * ny;
      out += 'M' + (px - L * dx).toFixed(1) + ',' + (py - L * dy).toFixed(1) + 'L' + (px + L * dx).toFixed(1) + ',' + (py + L * dy).toFixed(1);
    }
    return (fibreCache[m.d] = out);
  }

  let uid = 0;
  function half(list, detail, hl, extraClass) {
    let s = '<path d="' + OUTLINE + '" class="skin"/>';
    let defs = '';
    for (const m of list) {
      const on = hl && hl.includes(m.id);
      const cls = 'mu' + (m.deep ? ' deep' : '') + (on ? ' hl' : '');
      s += '<path d="' + m.d + '" class="' + cls + '" data-m="' + m.id + '"/>';
      if (m.a !== undefined && (!m.deep || on)) {
        const id = 'f' + (uid++);
        defs += '<clipPath id="' + id + '"><path d="' + m.d + '"/></clipPath>';
        s += '<path d="' + fibres(m) + '" class="fib' + (on ? ' on' : '') + '" clip-path="url(#' + id + ')"/>';
      }
      if (!m.deep) s += '<path d="' + m.d + '" class="edge' + (on ? ' on' : '') + '"/>';
    }
    s += detail;
    const hlc = (hl || []).map((h) => ' hl-' + h).join('');
    return '<defs>' + defs + '</defs><g class="' + (extraClass || '') + hlc + '">' + s + '</g>';
  }

  /**
   * Restituisce il markup SVG (senza tag <svg>) del corpo.
   * @param {'front'|'back'} view
   * @param {string[]} hl  id dei muscoli da evidenziare
   * @param {boolean} mirrorActive  se true il lato evidenziato è quello specchiato
   */
  function render(view, hl, mirrorActive) {
    const list = view === 'front' ? FRONT : BACK;
    const detail = view === 'front' ? FRONT_DETAIL : BACK_DETAIL;
    const center = view === 'front' ? CENTER_FRONT : CENTER_BACK;
    const post = view === 'front' ? POST_FRONT : POST_BACK;
    const a = half(list, detail, mirrorActive ? null : hl);
    const b = half(list, detail, mirrorActive ? hl : null);
    return '<g class="body' + (hl && hl.length ? ' has-hl' : '') + '">' + center + a + '<g transform="' + MIRROR + '">' + b + '</g>' + post + '</g>';
  }

  /* Sfumature condivise da tutte le figure. */
  const DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<radialGradient id="mg" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#ec9a8b"/><stop offset=".55" stop-color="#cf6457"/><stop offset="1" stop-color="#a8443b"/></radialGradient>' +
    '<radialGradient id="mgh" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#ff6f5e"/><stop offset=".55" stop-color="#dc2f24"/><stop offset="1" stop-color="#9c160f"/></radialGradient>' +
    '<linearGradient id="skin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e9c2aa"/><stop offset=".6" stop-color="#f6dccb"/><stop offset="1" stop-color="#f2d3bf"/></linearGradient>' +
    '<radialGradient id="mgm" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#f6cfc5"/><stop offset=".6" stop-color="#e6aca1"/><stop offset="1" stop-color="#cf8b80"/></radialGradient>' +
    '<radialGradient id="tendon" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#fffaf2"/><stop offset="1" stop-color="#e6d6c0"/></radialGradient>' +
    '<radialGradient id="head" cx=".42" cy=".35" r=".75"><stop offset="0" stop-color="#f8e1d2"/><stop offset="1" stop-color="#e7bfa6"/></radialGradient>' +
    '</defs></svg>';
  if (document.body) document.body.insertAdjacentHTML('afterbegin', DEFS);
  else document.addEventListener('DOMContentLoaded', () => document.body.insertAdjacentHTML('afterbegin', DEFS));

  window.Body = { render, MIRROR };
})();
