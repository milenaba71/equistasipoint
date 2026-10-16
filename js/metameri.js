/* Metodo alternativo di applicazione per il dolore: metamero e dermatomero.
   Per ogni zona: segmento spinale (metamero), zona di pelle (dermatomero) e vertebre da palpare.
   Le X sulla colonna sono sulle punte dei processi spinosi, ricavate dal modello 3D delle tavole
   (vista posteriore, sistema 200 × 432.6 di js/body.js). */
(function () {
  const L = (it, en) => (window.LANG === 'en' ? en : it);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Punta del processo spinoso di ogni vertebra (y nella vista posteriore, x = 100)
  const SPINE = {
    C2: 58.8, C3: 61.9, C4: 64.6, C5: 67.4, C6: 70.3, C7: 73.6,
    T1: 77.7, T2: 82.5, T3: 88.3, T4: 92.8, T5: 101, T6: 109.8, T7: 114.9, T8: 122, T9: 127.6, T10: 136.4, T11: 141, T12: 148.8,
    L1: 156.2, L2: 163.6, L3: 169.8, L4: 175.8, L5: 180.8, S1: 186, S2: 192,
  };

  const IMG_BASE = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/';
  const IMG = {
    s1: IMG_BASE + '8cf187ed-8625-4024-b946-dcdc4dd4986c.jpg',
    s2: IMG_BASE + '79f8b55a-3027-4dc2-ae36-49ef5d23f687.jpg',
    s3: IMG_BASE + 'aec780e2-6a67-4e63-aea4-f78a5f239096.jpg',
    s4: IMG_BASE + '2b9e613a-df76-4c42-8e6a-40ae9f37f74d.jpg',
  };

  const REGIONS = [
    { area: 'testa', seg: 'C1–C3', v: ['C2', 'C3'],
      it: 'Nuca e parte posteriore della testa (nervo grande occipitale).', en: 'Back of the neck and back of the head (greater occipital nerve).' },
    { area: 'collo', seg: 'C3–C5', v: ['C3', 'C4', 'C5'],
      it: 'Collo e parte alta delle spalle.', en: 'Neck and top of the shoulders.' },
    { area: 'spalla', seg: 'C5–T1', v: ['C6', 'C7', 'T1'],
      it: 'Spalla e parte esterna del braccio. Nei protocolli Equistasi si palpano C6, C7 e T1 e si applica sulla più dolente.', en: 'Shoulder and outer side of the arm. In Equistasi protocols C6, C7 and T1 are palpated and the device goes on the most tender one.' },
    { area: 'braccio_gomito', seg: 'C5–T1', v: ['C5', 'C6', 'C7', 'T1'],
      it: 'C5–C6 lato esterno di braccio e avambraccio, C8–T1 lato interno.', en: 'C5–C6 outer side of the arm and forearm, C8–T1 inner side.' },
    { area: 'polso_mano', seg: 'C6–C8', v: ['C6', 'C7', 'T1'],
      it: 'C6 pollice e indice, C7 dito medio, C8 anulare e mignolo.', en: 'C6 thumb and index finger, C7 middle finger, C8 ring and little fingers.' },
    { area: 'schiena_alta', seg: 'T1–T8', v: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'],
      it: 'Schiena tra le scapole e dorsale: palpa le vertebre all’altezza del dolore.', en: 'Back between the shoulder blades and mid back: palpate the vertebrae at the level of the pain.' },
    { area: 'torace', seg: 'T2–T6', v: ['T2', 'T3', 'T4', 'T5', 'T6'],
      it: 'Petto e costole: ogni segmento segue una costola, come una fascia dalla schiena al davanti.', en: 'Chest and ribs: each segment follows a rib, like a band from the back to the front.' },
    { area: 'addome', seg: 'T7–T12', v: ['T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
      it: 'Pancia: T7 sotto lo sterno, T10 all’altezza dell’ombelico, T12 sopra l’inguine.', en: 'Belly: T7 below the breastbone, T10 at the navel, T12 above the groin.' },
    { area: 'lombare', seg: 'L1–L5', v: ['L1', 'L2', 'L3', 'L4', 'L5'],
      it: 'Zona lombare: palpa le vertebre lombari e scegli la più dolente.', en: 'Lower back: palpate the lumbar vertebrae and choose the most tender.' },
    { area: 'anca_gluteo', seg: 'L1–L2 · S1–S3', v: ['L1', 'L2', 'S1', 'S2'],
      it: 'L1–L2 inguine e anca davanti; S1–S3 gluteo.', en: 'L1–L2 groin and front of the hip; S1–S3 buttock.' },
    { area: 'coscia', seg: 'L2–L3 · S1–S2', v: ['L2', 'L3', 'S1', 'S2'],
      it: 'L2–L3 davanti e interno coscia; S1–S2 dietro la coscia.', en: 'L2–L3 front and inner thigh; S1–S2 back of the thigh.' },
    { area: 'ginocchio', seg: 'L3–L4', v: ['L3', 'L4'],
      it: 'Ginocchio. Nei protocolli Equistasi si palpano L3 e L4 e si applica sulla più dolente.', en: 'Knee. In Equistasi protocols L3 and L4 are palpated and the device goes on the most tender one.' },
    { area: 'gamba', seg: 'L4–S1', v: ['L4', 'L5', 'S1'],
      it: 'L4 lato interno della gamba, L5 lato esterno, S1 polpaccio.', en: 'L4 inner side of the leg, L5 outer side, S1 calf.' },
    { area: 'piede', seg: 'L4–S1', v: ['L4', 'L5', 'S1'],
      it: 'L4 interno del piede e alluce, L5 dorso del piede, S1 bordo esterno, tallone e pianta.', en: 'L4 inner foot and big toe, L5 top of the foot, S1 outer edge, heel and sole.' },
  ];
  const byArea = (id) => REGIONS.find((r) => r.area === id);
  const areaName = (id) => ((window.AREAS || []).find((a) => a.id === id) || {}).name || id;
  const areaIcon = (id) => ((window.AREAS || []).find((a) => a.id === id) || {}).icon || '';

  /* Colonna vista da dietro con le X sulle vertebre da palpare. */
  function spineFigure(r) {
    const ys = r.v.map((k) => SPINE[k]);
    const y0 = Math.max(0, Math.min(...ys) - 26), y1 = Math.min(432.6, Math.max(...ys) + 26);
    const h = Math.max(y1 - y0, 70), w = h * 0.8;
    const vb = [100 - w / 2, y0, w, h].map((n) => Math.round(n * 10) / 10).join(' ');
    const s = 2.2;
    const marks = r.v.map((k) => {
      const y = SPINE[k];
      return '<g class="tp"><path d="M' + (100 - s) + ',' + (y - s) + ' L' + (100 + s) + ',' + (y + s) + ' M' + (100 + s) + ',' + (y - s) + ' L' + (100 - s) + ',' + (y + s) + '" class="halo" stroke-width="' + (s * 0.95) + '"/>' +
        '<path d="M' + (100 - s) + ',' + (y - s) + ' L' + (100 + s) + ',' + (y + s) + ' M' + (100 + s) + ',' + (y - s) + ' L' + (100 - s) + ',' + (y + s) + '" class="mark" stroke-width="' + (s * 0.45) + '"/></g>' +
        '<text x="' + (100 + s + 2.5) + '" y="' + (y + 1.6) + '" class="vlabel">' + k + '</text>';
    }).join('');
    return '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(L('Colonna vista da dietro: vertebre ', 'Spine seen from behind: vertebrae ') + r.v.join(', ')) + '">' +
      window.Body.render('back', null) + '<g class="ov">' + marks + '</g></svg>';
  }

  const STEPS = () => [
    [IMG.s1, L('Indica il punto in cui senti <b>più dolore</b>.', 'Point to where you feel the <b>most pain</b>.')],
    [IMG.s2, L('Premi con le dita le <b>vertebre del metamero</b> della tua zona (vedi sotto) e trova la <b>più dolente</b>.', 'Press the <b>vertebrae of the metamere</b> for your area (see below) and find the <b>most tender</b> one.')],
    [IMG.s3, L('Applica il <b>primo dispositivo</b> sulla vertebra più dolente.', 'Apply the <b>first device</b> on the most tender vertebra.')],
    [IMG.s4, L('Applica il <b>secondo</b> sul punto di massimo dolore e, se serve, un <b>terzo</b> sul muscolo coinvolto.', 'Apply the <b>second</b> on the point of greatest pain and, if needed, a <b>third</b> on the muscle involved.')],
  ];

  function cardHtml() {
    return '<a class="card pcard" href="#/metameri">' +
      (IMG.s2 ? '<img src="' + IMG.s2 + '" alt="" loading="lazy" />' : '') +
      '<span><span class="eyebrow">' + L('Metodo alternativo', 'Alternative method') + '</span><b>' + L('Metamero e dermatomero', 'Metamere and dermatome') + '</b>' +
      '<span class="small muted">' + L('Applica anche sulla vertebra della zona del dolore', 'Also apply on the vertebra linked to the painful area') + '</span></span>' +
      '<span class="chev" aria-hidden="true">›</span></a>';
  }

  function areaLink(id) {
    const r = byArea(id);
    if (!r) return '';
    return '<a class="card meta-link" href="#/metameri/' + id + '"><span class="meta-ico" aria-hidden="true">🦴</span><span><b>' +
      L('Metodo alternativo: metamero ', 'Alternative method: metamere ') + esc(r.seg) + '</b><span class="small muted">' +
      L('Applica anche sulla vertebra collegata a questa zona', 'Also apply on the vertebra linked to this area') + '</span></span><span class="chev" aria-hidden="true">›</span></a>';
  }

  function regionCard(r, open) {
    return '<details class="card meta-region" id="meta-' + r.area + '"' + (open ? ' open' : '') + '><summary>' +
      '<span class="ico" aria-hidden="true">' + areaIcon(r.area) + '</span><b>' + esc(areaName(r.area)) + '</b><span class="seg-badge">' + esc(r.seg) + '</span></summary>' +
      '<div class="meta-body"><div class="fig meta-fig">' + spineFigure(r) + '</div><div>' +
      '<p class="small"><b>' + L('Dermatomero', 'Dermatome') + ':</b> ' + esc(L(r.it, r.en)) + '</p>' +
      '<p class="small"><b>' + L('Vertebre da palpare', 'Vertebrae to palpate') + ':</b> ' + r.v.join(', ') + '. ' +
      L('Applica il primo dispositivo su quella <b>più dolente</b> alla pressione.', 'Apply the first device on the one that is <b>most tender</b> to pressure.') + '</p>' +
      '<p class="small">' + L('Secondo dispositivo sul punto di massimo dolore; terzo, se serve, sul muscolo:', 'Second device on the point of greatest pain; third, if needed, on the muscle:') +
      ' <a href="#/area/' + r.area + '">' + L('vedi i muscoli di questa zona', 'see the muscles for this area') + ' ›</a></p>' +
      '</div></div></details>';
  }

  function render(app, arg) {
    const steps = STEPS();
    app.innerHTML =
      '<div class="detail-head"><div class="eyebrow">' + L('Dolore · metodo alternativo', 'Pain · alternative method') + '</div><h1>' +
      L('Applicazione con metamero e dermatomero', 'Application by metamere and dermatome') + '</h1>' +
      '<p class="muted small" style="margin:4px 0 12px">' + L(
        'Ogni zona del corpo riceve i nervi da un segmento del midollo spinale, il <b>metamero</b>, che esce dalla colonna all’altezza di una vertebra. La zona di pelle servita da quel segmento è il <b>dermatomero</b>. Con questo metodo il dispositivo si applica sia dove fa male sia sulla vertebra collegata a quella zona.',
        'Each area of the body receives its nerves from a segment of the spinal cord, the <b>metamere</b>, which leaves the spine at the level of a vertebra. The area of skin supplied by that segment is the <b>dermatome</b>. With this method the device is applied both where it hurts and on the vertebra linked to that area.') + '</p></div>' +
      '<div class="card"><h3>' + L('Come si fa', 'How it works') + '</h3><div class="howsteps comic">' +
      steps.map(([img, txt], i) => '<figure>' + (img ? '<img src="' + img + '" alt="" loading="lazy" />' : '') + '<figcaption><b>' + (i + 1) + '</b> ' + txt + '</figcaption></figure>').join('') +
      '</div></div>' +
      '<div class="card meta-time"><h3>' + L('Quanto tempo tenerlo', 'How long to keep it on') + '</h3><ul class="small meta-find">' +
      '<li>' + L('Dopo ogni applicazione attendi circa <b>60 secondi</b> e rivaluta il dolore.', 'After each application wait about <b>60 seconds</b> and reassess the pain.') + '</li>' +
      '<li>' + L('Le prime volte tieni i dispositivi <b>1 ora</b>; se serve, aumenta poi fino a <b>2 ore</b>.', 'The first times keep the devices on for <b>1 hour</b>; if needed, then increase up to <b>2 hours</b>.') + '</li>' +
      '<li>' + L('Segui lo schema di <b>5 giorni</b> di utilizzo e <b>2 di riposo</b>.', 'Follow the pattern of <b>5 days</b> of use and <b>2 days off</b>.') + '</li>' +
      '</ul></div>' +
      '<div class="card warn"><b>' + L('Togli i dispositivi anche prima', 'Remove the devices earlier') + '</b> ' + L('se senti un fastidio di qualunque genere. Il fastidio passa in pochi minuti dopo averli tolti.', 'if you feel discomfort of any kind. The discomfort passes within a few minutes after removing them.') + '</div>' +
      '<div class="card"><h3>' + L('Come trovare le vertebre', 'How to find the vertebrae') + '</h3><ul class="small meta-find">' +
      '<li><b>C7</b> ' + L('la vertebra più sporgente alla base del collo quando pieghi la testa in avanti.', 'the most prominent vertebra at the base of the neck when you bend your head forward.') + '</li>' +
      '<li><b>T3</b> ' + L('all’altezza della spina delle scapole.', 'at the level of the spine of the shoulder blades.') + '</li>' +
      '<li><b>T7</b> ' + L('all’altezza della punta inferiore delle scapole, con le braccia lungo i fianchi.', 'at the level of the lower tip of the shoulder blades, with the arms by the sides.') + '</li>' +
      '<li><b>L4</b> ' + L('sulla linea che unisce i punti più alti del bacino (creste iliache).', 'on the line joining the highest points of the pelvis (iliac crests).') + '</li>' +
      '<li><b>S2</b> ' + L('all’altezza delle due “fossette” sopra i glutei.', 'at the level of the two “dimples” above the buttocks.') + '</li>' +
      '</ul><p class="small muted" style="margin:6px 0 0">' + L('Da questi punti conta le vertebre in su o in giù, una per una.', 'From these landmarks count the vertebrae up or down, one by one.') + '</p></div>' +
      '<h2 class="sec-title">' + L('Scegli la zona del dolore', 'Choose the painful area') + '</h2>' +
      REGIONS.map((r) => regionCard(r, r.area === arg)).join('') +
      '<p class="small muted" style="margin:8px 4px">' + L(
        'Il viso non segue i metameri della colonna (è servito dal nervo trigemino): per il viso usa la mappa dei trigger point.',
        'The face does not follow the spinal metameres (it is supplied by the trigeminal nerve): for the face use the trigger point map.') + '</p>' +
      '<div class="card warn"><b>' + L('Attenzione.', 'Please note.') + '</b> ' + L(
        'Le mappe dei dermatomeri sono indicative e variano da persona a persona. Questo metodo va imparato e verificato con un medico o un fisioterapista; non sostituisce il loro parere.',
        'Dermatome maps are approximate and vary from person to person. This method should be learnt and checked with a doctor or physiotherapist; it does not replace their advice.') + '</div>';
    if (arg) { const el = app.querySelector('#meta-' + arg); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }
  }

  window.EqMeta = { render, cardHtml, areaLink, REGIONS, SPINE };
})();
