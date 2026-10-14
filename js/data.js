/*
 * Mappa dei trigger point miofasciali e del dolore riferito.
 *
 * Fonte principale: Travell, Simons & Simons, "Myofascial Pain and Dysfunction:
 * The Trigger Point Manual", 2ª ed. (1999) e Donnelly et al., "Travell, Simons &
 * Simons' Myofascial Pain and Dysfunction", 3ª ed. (2019).
 *
 * Coordinate nello stesso sistema di js/body.js (viewBox 0 0 200 432.6, tavole 3D),
 * sempre sulla metà SINISTRA del disegno:
 *   - vista frontale: metà sinistra del disegno = lato DESTRO della persona
 *   - vista posteriore: metà sinistra del disegno = lato SINISTRO della persona
 * L’app specchia automaticamente in base al lato scelto dall’utente.
 *
 * x:     trigger point = punto in cui applicare il dispositivo Equistasi [x, y]
 * videos: nomi (campo "Description" della tabella Airtable "Videos") dei video
 *        tutorial da mostrare nella scheda; la numerazione finale ("Trapezius 2",
 *        "Erector Spinae (1)") e il prefisso "Musculus" vengono ignorati. In alternativa
 *        si può scrivere l’id del muscolo (es. gluteo_medio) nel campo "Muscles".
 * zones: dolore riferito. e = ellisse [cx, cy, rx, ry, rotazione°]
 *        p = 1 → zona principale (blu pieno), p = 0 → zona secondaria (blu puntinato)
 */

window.EQUISTASI = {
  // Testi di applicazione: da allineare sempre al foglietto illustrativo ufficiale.
  // Passi comuni + passi specifici per tipo di dispositivo (silicone / gel).
  types: { silicone: 'Silicone', gel: 'Gel' },
  steps: {
    start: [
      'Pulisci e asciuga bene la pelle nel punto indicato (niente creme, oli o sudore).',
      'Trova sul tuo corpo il punto corrispondente alla X: premendo con il polpastrello senti spesso un punto più dolente, a volte un piccolo "nodulo", che riproduce il tuo dolore.',
    ],
    silicone: [
      'Prendi l’applicatore adesivo (il cerotto) che trovi in omaggio nella confezione.',
      'Appoggia il dispositivo al centro della parte adesiva del cerotto e premi bene, in modo che resti attaccato.',
      'Applica il cerotto sulla pelle con il dispositivo a contatto con la pelle, centrato esattamente sulla X.',
    ],
    gel: [
      'Inserisci il dispositivo nell’apposita custodia usa e getta (usane una nuova a ogni applicazione).',
      'Prendi l’applicatore adesivo (il cerotto) che trovi in omaggio nella confezione e appoggia la custodia con il dispositivo al centro della parte adesiva.',
      'Applica il cerotto sulla pelle con il dispositivo a contatto con la pelle, centrato esattamente sulla X.',
    ],
    end: [
      'Tieni il dispositivo per un massimo di 2 ore, poi toglilo. Ripeti al pomeriggio (vedi "Quanto tempo tenerlo").',
    ],
  },
  schedule: {
    sessions: [
      { label: 'Mattina', time: '2 ore' },
      { label: 'Pomeriggio', time: '2 ore' },
    ],
    days: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
    onDays: 5, // 5 giorni di utilizzo, poi 2 di riposo
    summary: '2 ore al mattino e 2 ore al pomeriggio, per 5 giorni di seguito, poi 2 giorni di riposo.',
    removeEarly: 'Togli il dispositivo anche prima delle 2 ore se avverti qualsiasi fastidio: per esempio un aumento del dolore, nausea o un leggero mal di testa.',
    reassure: 'Non è niente di preoccupante: significa solo che per il tuo corpo l’utilizzo è stato più lungo del necessario. Dopo aver tolto il dispositivo il fastidio passa in pochi minuti.',
    persist: 'Se il fastidio non passa dopo aver tolto il dispositivo, rivolgiti al tuo medico o farmacista.',
  },
  find: 'La X indica la posizione tipica del trigger point. Ogni corpo è diverso: esplora con le dita un’area di circa 2–3 cm attorno alla X e scegli il punto più sensibile.',
  blue: 'La zona blu è dove senti il dolore, ma spesso il problema nasce altrove: per questo il dispositivo va sulla X, non sulla zona blu.',
};

window.AREAS = [
  { id: 'testa', name: 'Testa / cefalea', icon: '🧠' },
  { id: 'collo', name: 'Collo / cervicale', icon: '🦒' },
  { id: 'spalla', name: 'Spalla', icon: '💪' },
  { id: 'schiena_alta', name: 'Schiena alta / dorsale', icon: '🔙' },
  { id: 'torace', name: 'Petto / torace', icon: '🫁' },
  { id: 'braccio_gomito', name: 'Braccio / gomito', icon: '🦾' },
  { id: 'polso_mano', name: 'Polso / mano', icon: '✋' },
  { id: 'lombare', name: 'Zona lombare', icon: '⬇️' },
  { id: 'anca_gluteo', name: 'Anca / gluteo', icon: '🍑' },
  { id: 'coscia', name: 'Coscia', icon: '🦵' },
  { id: 'ginocchio', name: 'Ginocchio', icon: '🦿' },
  { id: 'gamba', name: 'Gamba / polpaccio', icon: '🏃' },
  { id: 'piede', name: 'Caviglia / piede', icon: '🦶' },
];

/* Zone toccabili sulla mappa iniziale (metà sinistra del disegno). */
window.AREA_HITS = {
  front: [
    { a: 'torace', p: 'M64.9,83.2 L98.7,78.2 L97.9,121.2 L54.7,119.4 Z' },
    { a: 'collo', p: 'M88.0,59.0 L100.0,59.0 L100.0,76.5 L84.8,76.5 Z' },
    { a: 'testa', e: [99.9, 35.5, 18.8, 24.4, 0] },
    { a: 'spalla', e: [56, 89.6, 13, 9.6, 0] },
    { a: 'braccio_gomito', e: [48.9, 134.1, 11.9, 23.7, 12] },
    { a: 'polso_mano', e: [44.1, 219.4, 2.7, 24.6, 8] },
    { a: 'anca_gluteo', e: [75.4, 198.9, 13.5, 9.4, 0] },
    { a: 'coscia', e: [81.9, 246.5, 17, 33.6, 0] },
    { a: 'ginocchio', e: [82.3, 301, 13.6, 11.3, 0] },
    { a: 'gamba', e: [79.8, 343.5, 10.7, 28.3, 0] },
    { a: 'piede', e: [81.1, 394.2, 8.9, 10.2, 0] },
  ],
  back: [
    { a: 'schiena_alta', p: 'M65.8,84.8 L98.9,74.8 L98.7,158.0 L70.8,154.3 Z' },
    { a: 'lombare', p: 'M70.8,156.2 L98.7,158.0 L98.7,198.9 L67.6,191.1 Z' },
    { a: 'collo', p: 'M84.2,54.1 L99.9,54.1 L100.0,74.8 L85.2,74.8 Z' },
    { a: 'testa', e: [99.9, 33, 19.5, 22.1, 0] },
    { a: 'spalla', e: [56, 89.6, 13, 9.6, 0] },
    { a: 'braccio_gomito', e: [48.9, 134.1, 11.9, 23.7, 12] },
    { a: 'polso_mano', e: [44.1, 219.4, 2.7, 24.6, 8] },
    { a: 'anca_gluteo', e: [82.1, 213, 16.6, 20.1, 0] },
    { a: 'coscia', e: [81.8, 265.4, 18.2, 25.2, 0] },
    { a: 'ginocchio', e: [83.4, 303, 12, 9.2, 0] },
    { a: 'gamba', e: [80.7, 343.5, 10.7, 28.3, 0] },
    { a: 'piede', e: [81.1, 394.2, 8.1, 10.2, 0] },
  ],
};

window.MUSCLES = [
  /* ───────────── TESTA E COLLO ───────────── */
  {
    id: 'trapezio_sup',
    videos: ['Trapezius'],
    name: 'Trapezio superiore',
    latin: 'M. trapezius, pars descendens',
    hl: ['trapezio'],
    areas: { testa: 1, collo: 1, spalla: 0 },
    symptom: 'Cefalea alla tempia "a punto interrogativo", dolore laterale al collo e dietro l’orecchio.',
    causes: 'Spalle alzate per stress, uso prolungato di computer e smartphone, borse pesanti a tracolla.',
    tips: 'Abbassa le spalle durante la giornata, alterna il lato della borsa, regola l’altezza dello schermo.',
    views: {
      back: {
        x: [[87.5, 65.5]],
        zones: [
          { e: [92.1, 62.5, 3.6, 11.9, -8], p: 1 },
          { e: [88.5, 44.2, 4.2, 6.1, 0], p: 1 },
        ],
      },
      front: {
        x: [[79, 74]],
        zones: [
          { e: [87, 26, 3.5, 8, -10], p: 1 },
          { e: [88.5, 51.5, 3, 3.5, 0], p: 0 },
        ],
      },
    },
  },
  {
    id: 'elevatore_scapola',
    name: 'Elevatore della scapola',
    latin: 'M. levator scapulae',
    hl: ['elevatore_scapola'],
    areas: { collo: 1, spalla: 0, schiena_alta: 0 },
    symptom: 'Collo rigido ("torcicollo"), difficoltà a girare la testa, dolore all’angolo tra collo e spalla.',
    causes: 'Dormire in posizione scorretta, telefono tra orecchio e spalla, colpi di freddo.',
    tips: 'Usa un cuscino che sostenga il collo, evita di tenere il telefono con la spalla.',
    views: {
      back: {
        x: [[84.9, 71.2], [83, 85.6]],
        zones: [
          { e: [87.3, 74.8, 5.3, 6.9, -15], p: 1 },
          { e: [87.1, 102.4, 2.9, 12.2, 0], p: 0 },
          { e: [64.2, 88, 5.4, 4, 0], p: 0 },
        ],
      },
    },
  },
  {
    id: 'scm',
    videos: ['Sternocleidomastoideus'],
    name: 'Sternocleidomastoideo',
    latin: 'M. sternocleidomastoideus',
    hl: ['scm'],
    areas: { testa: 1, collo: 0 },
    symptom: 'Cefalea frontale e attorno all’occhio, dolore all’orecchio, talvolta capogiri e senso di instabilità.',
    causes: 'Testa protesa in avanti, guardare in alto a lungo, respirazione alta, colpo di frusta.',
    tips: 'Trattare spesso entrambi i lati. Il muscolo si "pizzica" tra pollice e indice: non comprimere la parte anteriore del collo.',
    views: {
      front: {
        x: [[89.3, 61], [91.5, 68]],
        zones: [
          { e: [92.5, 36.5, 5, 4, 0], p: 1 },
          { e: [90.5, 44.5, 3.5, 4.5, 0], p: 1 },
          { e: [99.9, 20.7, 12.4, 3.8, 0], p: 0 },
          { e: [84, 37, 2.2, 5, 0], p: 0 },
          { e: [97.8, 76, 2.5, 3, 0], p: 0 },
        ],
      },
      back: {
        zones: [
          { e: [93.5, 41.7, 5.4, 4.9, 0], p: 0 },
          { e: [94.3, 15.7, 7, 3.7, 0], p: 0 },
        ],
      },
    },
  },
  {
    id: 'splenio_testa',
    videos: ['Splenius Capitis'],
    name: 'Splenio della testa',
    latin: 'M. splenius capitis',
    hl: ['splenio'],
    areas: { testa: 1, collo: 0 },
    symptom: 'Dolore localizzato in cima alla testa (vertice), dallo stesso lato.',
    causes: 'Testa inclinata in avanti a lungo, lettura a letto, colpo di frusta.',
    tips: 'Fai pause frequenti se lavori a testa china.',
    views: {
      back: {
        x: [[90.2, 54]],
        zones: [
          { e: [93, 18.2, 8.2, 5.6, 0], p: 1 },
          { e: [90.5, 51, 2.3, 6, 0], p: 0 },
        ],
      },
      front: {
        zones: [
          { e: [93, 15.1, 6.9, 3.7, 0], p: 1 },
        ],
      },
    },
  },
  {
    id: 'suboccipitali',
    name: 'Muscoli suboccipitali',
    latin: 'Mm. suboccipitales',
    hl: ['suboccipitali'],
    areas: { testa: 1, collo: 0 },
    symptom: 'Cefalea "a fascia" che parte dalla nuca e arriva fino alla tempia e all’occhio.',
    causes: 'Postura con il mento in avanti, occhiali non adatti, lavoro al computer.',
    tips: 'Rientra leggermente il mento (doppio mento) più volte al giorno.',
    views: {
      back: {
        x: [[94.6, 49.1]],
        zones: [
          { e: [88.4, 36.7, 6.4, 11.1, 10], p: 1 },
        ],
      },
      front: {
        zones: [
          { e: [89.5, 34.5, 6.5, 3, -12], p: 1 },
        ],
      },
    },
  },
  {
    id: 'temporale',
    videos: ['Temporalis'],
    name: 'Temporale',
    latin: 'M. temporalis',
    hl: ['temporale'],
    areas: { testa: 1 },
    symptom: 'Cefalea alla tempia, dolore sopra il sopracciglio e ai denti superiori.',
    causes: 'Serrare o digrignare i denti (bruxismo), stress, masticare chewing-gum a lungo.',
    tips: 'Durante il giorno controlla che i denti non siano serrati: labbra chiuse, denti separati.',
    views: {
      front: {
        x: [[87, 30]],
        zones: [
          { e: [87, 24, 3.5, 7, -8], p: 1 },
          { e: [92.5, 32.5, 4, 1.8, 0], p: 0 },
          { e: [95, 49.5, 3.5, 1.6, 0], p: 0 },
        ],
      },
    },
  },

  /* ───────────── SPALLA E SCHIENA ALTA ───────────── */
  {
    id: 'infraspinato',
    name: 'Infraspinato',
    latin: 'M. infraspinatus',
    hl: ['infraspinato'],
    areas: { spalla: 1, braccio_gomito: 0, polso_mano: 0, schiena_alta: 0 },
    symptom: 'Dolore profondo nella parte anteriore della spalla, difficoltà ad allacciare il reggiseno o a portare la mano dietro la schiena; disturba il sonno sul fianco.',
    causes: 'Sforzi ripetuti con il braccio in alto o all’indietro, sport con racchetta, nuoto.',
    tips: 'Dormi con un cuscino tra braccio e torace. Il punto si trova sulla scapola, spesso serve aiuto per l’applicazione.',
    views: {
      back: {
        x: [[76.3, 100], [82.8, 107.2]],
        zones: [
          { e: [88.3, 102.4, 2.3, 4.8, 0], p: 0 },
        ],
      },
      front: {
        zones: [
          { e: [57.2, 89.6, 7.1, 5.6, 0], p: 1 },
          { e: [49.7, 122.2, 4.7, 15.1, 12], p: 0 },
          { e: [40.5, 177.5, 4.6, 10.7, 10], p: 0 },
          { e: [34.5, 227.2, 3.7, 6.7, 0], p: 0 },
        ],
      },
    },
  },
  {
    id: 'sovraspinato',
    name: 'Sovraspinato',
    latin: 'M. supraspinatus',
    hl: ['sovraspinato'],
    areas: { spalla: 1, braccio_gomito: 0 },
    symptom: 'Dolore sordo nella parte laterale della spalla, soprattutto alzando il braccio di lato; a volte fino al gomito.',
    causes: 'Portare pesi con il braccio teso, lavori sopra la testa, borse pesanti.',
    tips: 'Evita di sollevare pesi con il braccio lontano dal corpo.',
    views: {
      back: {
        x: [[68, 80.5]],
        zones: [
          { e: [50.4, 97.6, 5.3, 7.2, 0], p: 1 },
        ],
      },
      front: {
        zones: [
          { e: [48.9, 96.8, 4.8, 6.4, 0], p: 1 },
          { e: [40.6, 150.8, 4.4, 3.1, 0], p: 0 },
          { e: [37.8, 171.4, 4.9, 8.4, 10], p: 0 },
        ],
      },
    },
  },
  {
    id: 'romboidi',
    name: 'Romboidi',
    latin: 'Mm. rhomboidei',
    hl: ['romboidi'],
    areas: { schiena_alta: 1 },
    symptom: 'Dolore superficiale tra colonna e scapola, che non cambia molto con il movimento.',
    causes: 'Spalle chiuse in avanti, lavoro prolungato al computer o alla scrivania.',
    tips: 'Apri il torace: porta le scapole indietro e in basso più volte al giorno.',
    views: {
      back: {
        x: [[92.8, 96], [92.5, 108.8]],
        zones: [
          { e: [88.9, 103.2, 4.1, 12.2, 0], p: 1 },
          { e: [78.5, 88, 7.1, 2, -10], p: 0 },
        ],
      },
    },
  },
  {
    id: 'pettorale',
    videos: ['Pectoralis Major'],
    name: 'Grande pettorale',
    latin: 'M. pectoralis major',
    hl: ['pettorale'],
    areas: { torace: 1, spalla: 0, braccio_gomito: 0, polso_mano: 0 },
    symptom: 'Dolore al petto e alla parte anteriore della spalla, che può scendere lungo il lato interno del braccio fino alle ultime dita.',
    causes: 'Spalle chiuse in avanti, sollevamento pesi, lunghe ore alla guida o al computer.',
    tips: 'Stretching del petto contro lo stipite di una porta.',
    warning: 'Un dolore al petto, soprattutto se irradiato al braccio sinistro, alla mandibola o accompagnato da affanno, sudorazione o nausea, può essere di origine cardiaca: chiama subito il 112.',
    views: {
      front: {
        x: [[75.2, 98.4], [73.3, 109.6]],
        zones: [
          { e: [80.1, 100.8, 11.1, 9.6, 0], p: 1 },
          { e: [59.7, 92.8, 5.9, 5.6, 0], p: 1 },
          { e: [59.2, 130.1, 4.1, 14.3, 10], p: 0 },
          { e: [57.1, 152.3, 4.5, 3.1, 0], p: 0 },
          { e: [45.8, 192, 3.3, 10.7, 8], p: 0 },
          { e: [46.2, 231.7, 0.4, 7.8, 0], p: 0 },
        ],
      },
    },
  },

  /* ───────────── BRACCIO, GOMITO, MANO ───────────── */
  {
    id: 'estensori_radiali',
    videos: ['Extensor Carpi Radialis Longus'],
    name: 'Estensori radiali del carpo',
    latin: 'M. extensor carpi radialis longus et brevis',
    hl: ['estensori_radiali'],
    areas: { braccio_gomito: 1, polso_mano: 1 },
    symptom: 'Dolore alla parte esterna del gomito ("gomito del tennista") e sul dorso della mano verso il pollice; debolezza nella presa.',
    causes: 'Movimenti ripetuti del polso: mouse, attrezzi, sport con racchetta, giardinaggio.',
    tips: 'Afferra gli oggetti con il palmo verso l’alto quando possibile; fai pause nel lavoro manuale.',
    views: {
      back: {
        x: [[40.5, 159.9]],
        zones: [
          { e: [38.2, 151.5, 6, 3.9, 0], p: 1 },
          { e: [33.2, 221.7, 5.4, 7.8, 0], p: 1 },
          { e: [38.9, 177.5, 3.8, 7.6, 10], p: 0 },
        ],
      },
    },
  },
  {
    id: 'estensore_dita',
    videos: ['Extensores Digitorum'],
    name: 'Estensore comune delle dita',
    latin: 'M. extensor digitorum',
    hl: ['estensore_dita'],
    areas: { braccio_gomito: 0, polso_mano: 1 },
    symptom: 'Dolore lungo il dorso dell’avambraccio, del polso e delle dita; rigidità delle dita al mattino.',
    causes: 'Digitazione intensa, suonare strumenti, lavori manuali di precisione.',
    tips: 'Apri e chiudi la mano lentamente durante le pause.',
    views: {
      back: {
        x: [[48, 166]],
        zones: [
          { e: [44.5, 185.9, 3.3, 9.9, 10], p: 0 },
          { e: [45.2, 229.4, 0.9, 11.1, 0], p: 1 },
        ],
      },
    },
  },

  /* ───────────── ZONA LOMBARE E ANCA ───────────── */
  {
    id: 'quadrato_lombi',
    videos: ['Quadratus Lumborum'],
    name: 'Quadrato dei lombi',
    latin: 'M. quadratus lumborum',
    hl: ['quadrato_lombi'],
    areas: { lombare: 1, anca_gluteo: 1 },
    symptom: 'Mal di schiena basso, profondo, spesso da un lato; dolore al gluteo e al fianco, difficoltà a girarsi nel letto o ad alzarsi dalla sedia.',
    causes: 'Sollevare pesi ruotando il busto, gamba più corta, stare a lungo in piedi o seduti storti.',
    tips: 'Piega le ginocchia quando sollevi pesi, evita di sederti sul portafoglio.',
    views: {
      back: {
        x: [[85, 169], [83.5, 176]],
        zones: [
          { e: [94.5, 201.3, 4.2, 3.9, 0], p: 1 },
          { e: [84.7, 229.8, 8, 5.8, 0], p: 1 },
          { e: [68.4, 213, 4.1, 5.5, 0], p: 1 },
          { e: [78.8, 191.9, 9.9, 2, -5], p: 0 },
        ],
      },
      front: {
        zones: [
          { e: [75.1, 196.6, 6.2, 2.8, -20], p: 0 },
        ],
      },
    },
  },
  {
    id: 'paravertebrali',
    videos: ['Erector Spinae', 'Iliocostalis'],
    name: 'Muscoli paravertebrali lombari',
    latin: 'M. iliocostalis lumborum, M. longissimus',
    hl: ['erettori'],
    areas: { lombare: 1, anca_gluteo: 0 },
    symptom: 'Dolore alla parte bassa della schiena accanto alla colonna, che può scendere verso il gluteo.',
    causes: 'Postura seduta prolungata, sforzi improvvisi, sollevamento scorretto di pesi.',
    tips: 'Alzati ogni 30–45 minuti, cammina regolarmente.',
    views: {
      back: {
        x: [[91.8, 172.3], [92.4, 183.3]],
        zones: [
          { e: [93, 187.2, 5.7, 7.8, 0], p: 1 },
          { e: [88, 213, 8.4, 9.2, 0], p: 0 },
        ],
      },
    },
  },
  {
    id: 'gluteo_medio',
    name: 'Gluteo medio',
    latin: 'M. gluteus medius',
    hl: ['gluteo_medio'],
    areas: { lombare: 1, anca_gluteo: 1, coscia: 0 },
    symptom: 'Dolore lungo la cresta iliaca, nella parte bassa della schiena e al gluteo; fastidio a dormire sul fianco o a camminare a lungo.',
    causes: 'Camminare o correre molto, stare in piedi su una gamba, dormire sul fianco.',
    tips: 'Dormendo sul fianco tieni un cuscino tra le ginocchia.',
    views: {
      back: {
        x: [[73, 186], [79, 183], [68, 191]],
        zones: [
          { e: [82.5, 191.1, 12.4, 2.2, -3], p: 1 },
          { e: [95, 200.5, 4.3, 4.7, 0], p: 1 },
          { e: [80.6, 209.9, 10.9, 5.8, 0], p: 0 },
          { e: [73.3, 229.8, 4, 9.4, 0], p: 0 },
        ],
      },
    },
  },
  {
    id: 'gluteo_minimo',
    name: 'Gluteo minimo',
    latin: 'M. gluteus minimus',
    hl: ['gluteo_minimo'],
    areas: { anca_gluteo: 1, coscia: 1, gamba: 1 },
    symptom: 'Dolore che scende dal gluteo lungo il lato esterno o posteriore della gamba fino alla caviglia: imita la "sciatica".',
    causes: 'Zoppia, lunghe camminate, stare a lungo in piedi immobili, iniezioni intramuscolari nel gluteo.',
    tips: 'Se ci sono formicolii, perdita di forza o di sensibilità consulta il medico per escludere una vera sciatica.',
    views: {
      back: {
        x: [[75.4, 198.9]],
        zones: [
          { e: [74.3, 215.1, 6.8, 7.6, 0], p: 1 },
          { e: [76.2, 256, 4.8, 23, 2], p: 0 },
          { e: [77.3, 332.4, 3.4, 20.2, 2], p: 0 },
        ],
      },
      front: {
        zones: [
          { e: [65.3, 242.3, 3.8, 27.3, 2], p: 1 },
          { e: [71.3, 337.4, 2.5, 22.3, -4], p: 0 },
        ],
      },
    },
  },
  {
    id: 'piriforme',
    name: 'Piriforme',
    latin: 'M. piriformis',
    hl: ['piriforme'],
    areas: { anca_gluteo: 1, coscia: 0, lombare: 0 },
    symptom: 'Dolore profondo al gluteo e nella zona sacrale, peggiora da seduti, può scendere dietro la coscia.',
    causes: 'Stare seduti a lungo (soprattutto su superfici dure o con il portafoglio in tasca), corsa, guida.',
    tips: 'Siediti con il peso distribuito su entrambi i glutei; stretching incrociando la gamba.',
    views: {
      back: {
        x: [[84.5, 198.5], [77, 204.5]],
        zones: [
          { e: [95.1, 201.3, 4.2, 3.9, 0], p: 1 },
          { e: [81.8, 216.1, 11.1, 6.3, -8], p: 1 },
          { e: [79.2, 249.7, 4.8, 17.8, 0], p: 0 },
        ],
      },
    },
  },
  {
    id: 'ileopsoas',
    videos: ['Iliopsoas'],
    name: 'Ileopsoas',
    latin: 'M. iliopsoas',
    hl: ['ileopsoas'],
    areas: { lombare: 1, anca_gluteo: 1, coscia: 0 },
    symptom: 'Mal di schiena verticale lungo la colonna lombare, che peggiora stando in piedi; dolore all’inguine e alla parte alta della coscia.',
    causes: 'Molte ore seduti, dormire in posizione fetale, addominali eseguiti a gambe tese.',
    tips: 'Punto delicato vicino a vasi e nervi dell’inguine: applica con delicatezza solo sul muscolo, lateralmente al battito dell’arteria.',
    views: {
      front: {
        x: [[81.8, 206.7]],
        zones: [
          { e: [81.6, 225.6, 5.5, 12.6, 0], p: 1 },
        ],
      },
      back: {
        zones: [
          { e: [95.5, 180.2, 3.5, 14.4, 0], p: 1 },
          { e: [90.1, 198.1, 6.1, 2.8, 0], p: 0 },
        ],
      },
    },
  },

  /* ───────────── COSCIA E GINOCCHIO ───────────── */
  {
    id: 'tensore_fascia_lata',
    name: 'Tensore della fascia lata',
    latin: 'M. tensor fasciae latae',
    hl: ['tensore_fascia_lata'],
    areas: { anca_gluteo: 1, coscia: 1 },
    symptom: 'Dolore all’anca e lungo il lato esterno della coscia, a volte fino al ginocchio; fastidio a stare a lungo seduti con le anche flesse.',
    causes: 'Corsa, ciclismo, camminate in salita, dormire sul fianco.',
    tips: 'Evita di stare seduti con le ginocchia più alte delle anche.',
    views: {
      front: {
        x: [[69.9, 200.5]],
        zones: [
          { e: [68, 199.7, 4.3, 3.9, 0], p: 1 },
          { e: [65.3, 242.3, 3.8, 33, 2], p: 1 },
        ],
      },
    },
  },
  {
    id: 'retto_femorale',
    videos: ['Rectus Femoris'],
    name: 'Retto femorale (quadricipite)',
    latin: 'M. rectus femoris',
    hl: ['retto_femorale'],
    areas: { ginocchio: 1, coscia: 0 },
    symptom: 'Dolore profondo davanti al ginocchio e sulla rotula, spesso di notte; difficoltà a scendere le scale.',
    causes: 'Salti, corsa, calcio, cadute sulle ginocchia, stare a lungo seduti.',
    tips: 'Allunga la parte anteriore della coscia portando il tallone verso il gluteo.',
    views: {
      front: {
        x: [[80.5, 214]],
        zones: [
          { e: [83, 300, 6, 7, 0], p: 1 },
          { e: [81.5, 280.1, 4, 8.4, 0], p: 0 },
        ],
      },
    },
  },
  {
    id: 'vasto_mediale',
    name: 'Vasto mediale (quadricipite)',
    latin: 'M. vastus medialis',
    hl: ['vasto_mediale'],
    areas: { ginocchio: 1, coscia: 0 },
    symptom: 'Dolore nella parte interna e anteriore del ginocchio; a volte il ginocchio "cede" all’improvviso.',
    causes: 'Corsa, sci, inginocchiarsi a lungo, traumi al ginocchio.',
    tips: 'Evita di stare a lungo in ginocchio o accovacciato.',
    views: {
      front: {
        x: [[89.5, 265.4], [91.9, 283.2]],
        zones: [
          { e: [90.1, 296.9, 6, 7.3, 0], p: 1 },
          { e: [89.4, 271.7, 4.2, 10.5, 0], p: 0 },
        ],
      },
    },
  },
  {
    id: 'ischiocrurali',
    videos: ['Biceps Femoris'],
    name: 'Ischiocrurali (muscoli posteriori della coscia)',
    latin: 'M. biceps femoris, semitendinosus, semimembranosus',
    hl: ['ischiocrurali'],
    areas: { coscia: 1, ginocchio: 1, anca_gluteo: 0 },
    symptom: 'Dolore dietro la coscia e dietro il ginocchio, peggiora stando seduti o camminando.',
    causes: 'Sedie che comprimono la parte posteriore della coscia, corsa, calcio.',
    tips: 'Usa sedie della giusta altezza: i piedi devono appoggiare bene a terra.',
    views: {
      back: {
        x: [[77.6, 265.4], [90, 268.6]],
        zones: [
          { e: [84.6, 303, 7.1, 6.1, 0], p: 1 },
          { e: [83, 278, 8.1, 12.6, 0], p: 0 },
          { e: [88, 238.2, 7.4, 3.2, 0], p: 0 },
          { e: [80.7, 319.2, 3.4, 5.1, 0], p: 0 },
        ],
      },
    },
  },

  /* ───────────── GAMBA E PIEDE ───────────── */
  {
    id: 'gastrocnemio',
    videos: ['Gastrocnemius'],
    name: 'Gastrocnemio (polpaccio)',
    latin: 'M. gastrocnemius',
    hl: ['gastrocnemio'],
    areas: { gamba: 1, ginocchio: 0, piede: 1 },
    symptom: 'Crampi notturni al polpaccio, dolore al polpaccio e sull’arco interno del piede, a volte dietro il ginocchio.',
    causes: 'Camminate in salita, tacchi alti, corsa, stare a lungo con le gambe accavallate.',
    tips: 'Bevi a sufficienza e allunga il polpaccio prima di dormire.',
    warning: 'Polpaccio gonfio, caldo, arrossato e dolente (soprattutto dopo viaggi lunghi o immobilità) può indicare una trombosi: rivolgiti subito al medico e non applicare nulla.',
    views: {
      back: {
        x: [[85.7, 323.3], [76.7, 325.3]],
        zones: [
          { e: [84.4, 306.1, 5.8, 4.1, 0], p: 0 },
          { e: [81.9, 339.4, 5.8, 13.2, 0], p: 1 },
          { e: [81.1, 397.8, 3.5, 3.7, 0], p: 0 },
        ],
      },
      front: {
        zones: [
          { e: [86.2, 396.6, 2.4, 3.1, 0], p: 1 },
        ],
      },
    },
  },
  {
    id: 'soleo',
    name: 'Soleo',
    latin: 'M. soleus',
    hl: ['soleo'],
    areas: { piede: 1, gamba: 0 },
    symptom: 'Dolore al tallone (spesso confuso con la fascite plantare) e al tendine d’Achille, peggiora salendo le scale.',
    causes: 'Corsa, camminate in salita o su terreni morbidi (sabbia), scarpe con tacco.',
    tips: 'Allunga il polpaccio a ginocchio piegato; scegli scarpe con un buon supporto del tallone.',
    views: {
      back: {
        x: [[77, 358], [73, 348]],
        zones: [
          { e: [80.5, 399.1, 4, 3.7, 0], p: 1 },
          { e: [80.7, 386, 2.5, 5.3, 0], p: 0 },
        ],
      },
    },
  },
  {
    id: 'tibiale_anteriore',
    videos: ['Tibialis Anterior'],
    name: 'Tibiale anteriore',
    latin: 'M. tibialis anterior',
    hl: ['tibiale_anteriore'],
    areas: { gamba: 0, piede: 1 },
    symptom: 'Dolore davanti alla caviglia e sull’alluce; il piede "inciampa" o batte a terra camminando.',
    causes: 'Camminate in discesa, corsa su superfici dure, scarpe troppo strette.',
    tips: 'Allaccia le scarpe senza stringere troppo sul collo del piede.',
    views: {
      front: {
        x: [[77.5, 330.3]],
        zones: [
          { e: [82.1, 389.2, 4.1, 2.8, 0], p: 1 },
          { e: [85.2, 401.5, 2.4, 1.8, 0], p: 1 },
          { e: [77.7, 353.6, 1.9, 14.2, -3], p: 0 },
        ],
      },
    },
  },
  {
    id: 'peronei',
    videos: ['Peroneus Longus'],
    name: 'Peronei',
    latin: 'M. fibularis longus et brevis',
    hl: ['peronei'],
    areas: { piede: 1, gamba: 0 },
    symptom: 'Dolore alla caviglia esterna (malleolo) e al lato esterno del piede; caviglie "deboli" che si storcono facilmente.',
    causes: 'Distorsioni della caviglia, piedi piatti, gambe accavallate, tacchi alti.',
    tips: 'Esercizi di equilibrio su una gamba aiutano a rinforzare la caviglia.',
    views: {
      front: {
        x: [[72.4, 329.3]],
        zones: [
          { e: [73.7, 391.1, 3.2, 3.1, 0], p: 1 },
          { e: [74.6, 399.1, 2.6, 2.2, 0], p: 0 },
          { e: [72.8, 359.7, 1.6, 14.2, -6], p: 0 },
        ],
      },
    },
  },
];

window.RED_FLAGS = [
  'Dolore dopo una caduta o un trauma importante',
  'Febbre, perdita di peso non spiegata o dolore che non passa a riposo / di notte',
  'Formicolii, perdita di forza o di sensibilità a braccia o gambe',
  'Disturbi nel controllo di vescica o intestino',
  'Dolore al petto con affanno, sudorazione o nausea (chiama il 112)',
  'Gamba gonfia, calda e arrossata',
  'Cefalea improvvisa e violentissima, o con disturbi della vista o della parola',
];

/* ───────────── PROFILI UTENTE ─────────────
 * tags: valori del campo "Profili app" (Airtable, tabelle Videos e PDF_files)
 * che il profilo può vedere. */
window.PROFILES = {
  dolore: {
    label: 'Ho dolore',
    title: 'Dolore muscolare o articolare',
    desc: 'Mal di schiena, cervicale, spalla, ginocchio, cefalea…',
    icon: '🎯',
    tags: ['Tutti', 'Dolore'],
  },
  neuro: {
    label: 'Patologia neurologica',
    title: 'Patologia neurologica',
    desc: 'Parkinson, sclerosi multipla, atassia e altre patologie',
    icon: '🧠',
    tags: ['Tutti', 'Neurologico (tutti)'],
  },
  sport: {
    label: 'Sport e performance',
    title: 'Sport e performance',
    desc: 'Equilibrio, recupero e prestazione sportiva',
    icon: '🏃',
    tags: ['Tutti', 'Sport'],
  },
};
window.PATOLOGIE = {
  parkinson: { label: 'Parkinson', tag: 'Parkinson' },
  sm: { label: 'Sclerosi multipla', tag: 'Sclerosi multipla' },
  atassia: { label: 'Atassia', tag: 'Atassia' },
  altro: { label: 'Altra patologia neurologica', tag: null },
};
window.ETA = ['Meno di 30', '30-49', '50-64', '65-74', '75 e oltre'];

/* ───────────── PRIVACY ─────────────
 * Testo sintetico da far verificare al consulente privacy / DPO.
 * Le parti tra [parentesi quadre] vanno completate.
 * Il link all’informativa completa si imposta in js/config.js → privacyUrl. */
window.PRIVACY = {
  version: '2026-10',
  titolare: '[Ragione sociale, sede legale e P. IVA del Titolare del trattamento]',
  contatto: '[email per la privacy / DPO]',
  sections: [
    ['Quali dati trattiamo',
      'Il numero di serie del dispositivo, per verificare che sia un prodotto Equistasi originale. ' +
      'Il profilo d’uso che scegli (dolore, patologia neurologica, sport) e l’eventuale patologia indicata: sono dati relativi alla salute. ' +
      'La fascia d’età, se decidi di indicarla. Non ti chiediamo nome, email o numero di telefono. ' +
      'Le zone di dolore e i muscoli che consulti nella mappa restano sul tuo telefono e non vengono inviati.'],
    ['Perché li trattiamo',
      'a) Verificare il numero di serie e darti accesso all’app. ' +
      'b) Mostrarti i protocolli e i video adatti al tuo profilo: questa scelta resta salvata sul tuo telefono. ' +
      'c) Solo se ci dai il consenso: registrare il tuo profilo, la patologia e la fascia d’età insieme al numero di serie, per statistiche che ci aiutano a migliorare prodotti, protocolli e servizi.'],
    ['Su quale base',
      'Per a) e b): l’esecuzione del servizio che ci chiedi (art. 6.1.b GDPR). ' +
      'Per c): il tuo consenso esplicito (art. 6.1.a e art. 9.2.a GDPR). Il consenso è facoltativo e puoi revocarlo in qualsiasi momento: se non lo dai, puoi usare l’app senza alcuna limitazione.'],
    ['Dove sono conservati',
      'I dati condivisi sono registrati sui sistemi del Titolare tramite fornitori tecnici nominati responsabili del trattamento: Make.com (elaborazione), Airtable (archiviazione) e Bunny.net (video). ' +
      'Alcuni fornitori possono trattare dati fuori dall’Unione Europea con le garanzie previste dal GDPR (es. clausole contrattuali standard).'],
    ['Per quanto tempo',
      '[Indicare il periodo di conservazione, es. 24 mesi dall’ultimo utilizzo dell’app] oppure fino alla revoca del consenso.'],
    ['I tuoi diritti',
      'Puoi chiedere in ogni momento accesso, rettifica, cancellazione, limitazione, portabilità dei dati e opporti al trattamento, oltre a revocare il consenso. ' +
      'Hai anche il diritto di proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).'],
    ['Dati sul tuo telefono',
      'L’app salva sul telefono il numero di serie, il profilo scelto e le tue preferenze, per non chiederteli ogni volta. Puoi cancellarli quando vuoi dalla pagina Privacy dell’app.'],
  ],
};
