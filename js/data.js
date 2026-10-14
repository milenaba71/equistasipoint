/*
 * Mappa dei trigger point miofasciali e del dolore riferito.
 *
 * Fonte principale: Travell, Simons & Simons, "Myofascial Pain and Dysfunction:
 * The Trigger Point Manual", 2ª ed. (1999) e Donnelly et al., "Travell, Simons &
 * Simons' Myofascial Pain and Dysfunction", 3ª ed. (2019).
 *
 * Coordinate nello stesso sistema di js/body.js (viewBox 0 0 200 440),
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
    { a: 'torace', p: 'M72,76 L99,70 L99,122 L76,120 Z' },
    { a: 'collo', p: 'M88,48 L100,48 L100,68 L86,68 Z' },
    { a: 'testa', e: [100, 29, 16, 20, 0] },
    { a: 'spalla', e: [63, 84, 11, 12, 0] },
    { a: 'braccio_gomito', e: [55, 140, 9, 30, 12] },
    { a: 'polso_mano', e: [41, 245, 9, 25, 8] },
    { a: 'anca_gluteo', e: [80, 212, 11, 12, 0] },
    { a: 'coscia', e: [86, 262, 13, 32, 0] },
    { a: 'ginocchio', e: [86, 314, 11, 11, 0] },
    { a: 'gamba', e: [86, 356, 11, 28, 0] },
    { a: 'piede', e: [87, 410, 11, 15, 0] },
  ],
  back: [
    { a: 'schiena_alta', p: 'M72,78 L99,66 L99,162 L76,158 Z' },
    { a: 'lombare', p: 'M76,160 L99,162 L99,212 L74,202 Z' },
    { a: 'collo', p: 'M88,44 L100,44 L100,66 L86,66 Z' },
    { a: 'testa', e: [100, 27, 16, 18, 0] },
    { a: 'spalla', e: [63, 84, 11, 12, 0] },
    { a: 'braccio_gomito', e: [55, 140, 9, 30, 12] },
    { a: 'polso_mano', e: [41, 245, 9, 25, 8] },
    { a: 'anca_gluteo', e: [85, 230, 14, 22, 0] },
    { a: 'coscia', e: [86, 280, 13, 24, 0] },
    { a: 'ginocchio', e: [87, 316, 10, 9, 0] },
    { a: 'gamba', e: [87, 356, 11, 28, 0] },
    { a: 'piede', e: [87, 410, 10, 15, 0] },
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
        x: [[82, 64]],
        zones: [
          { e: [93.5, 52, 3, 12, -8], p: 1 },
          { e: [89, 36, 4, 5, 0], p: 1 },
        ],
      },
      front: {
        x: [[81, 64]],
        zones: [
          { e: [86.5, 23, 3.5, 8, -12], p: 1 },
          { e: [88, 43, 3, 3.5, 0], p: 0 },
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
        x: [[88, 62], [86, 79]],
        zones: [
          { e: [88, 66, 5, 8, -15], p: 1 },
          { e: [89, 100, 2.5, 15, 0], p: 0 },
          { e: [70, 82, 4.5, 5, 0], p: 0 },
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
        x: [[92.5, 53], [89, 44]],
        zones: [
          { e: [93, 26, 5, 4, 0], p: 1 },
          { e: [90.5, 35, 3.5, 4.5, 0], p: 1 },
          { e: [100, 17, 9, 3, 0], p: 0 },
          { e: [84.5, 31, 2.5, 5, 0], p: 0 },
          { e: [98.5, 64, 2.5, 3.5, 0], p: 0 },
        ],
      },
      back: {
        zones: [
          { e: [94, 34, 5, 4, 0], p: 0 },
          { e: [96, 13, 5, 3, 0], p: 0 },
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
        x: [[94, 52]],
        zones: [
          { e: [95, 15, 6, 4.5, 0], p: 1 },
          { e: [94.5, 47, 2.5, 6, 0], p: 0 },
        ],
      },
      front: {
        zones: [{ e: [95, 12.5, 5, 3, 0], p: 1 }],
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
        x: [[95, 40]],
        zones: [{ e: [90, 30, 5.5, 9, 10], p: 1 }],
      },
      front: {
        zones: [{ e: [89.5, 25, 6.5, 3, -15], p: 1 }],
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
        x: [[87, 21]],
        zones: [
          { e: [87, 22, 3.5, 7, -8], p: 1 },
          { e: [93, 23, 4, 1.8, 0], p: 0 },
          { e: [95, 39.5, 3.5, 1.6, 0], p: 0 },
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
        x: [[80, 97], [85, 106]],
        zones: [{ e: [90, 100, 2, 6, 0], p: 0 }],
      },
      front: {
        zones: [
          { e: [64, 84, 6, 7, 0], p: 1 },
          { e: [57, 125, 3.5, 19, 12], p: 0 },
          { e: [45, 196, 3, 14, 10], p: 0 },
          { e: [38, 252, 3, 6, 0], p: 0 },
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
        x: [[79, 79]],
        zones: [{ e: [58, 94, 4.5, 9, 0], p: 1 }],
      },
      front: {
        zones: [
          { e: [57, 93, 4, 8, 0], p: 1 },
          { e: [48, 161, 3, 4, 0], p: 0 },
          { e: [44, 188, 3, 11, 10], p: 0 },
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
        x: [[94, 92], [93.5, 108]],
        zones: [
          { e: [90.5, 101, 3.5, 15, 0], p: 1 },
          { e: [82, 82, 6, 2.5, -10], p: 0 },
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
        x: [[79, 95], [85, 109]],
        zones: [
          { e: [83, 98, 9.5, 12, 0], p: 1 },
          { e: [66, 88, 5, 7, 0], p: 1 },
          { e: [63, 135, 3, 18, 10], p: 0 },
          { e: [59, 163, 3, 4, 0], p: 0 },
          { e: [48, 215, 3, 14, 8], p: 0 },
          { e: [47, 256, 2.5, 7, 0], p: 0 },
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
        x: [[47.5, 173]],
        zones: [
          { e: [46.5, 162, 4, 5, 0], p: 1 },
          { e: [39.5, 247, 3.5, 7, 0], p: 1 },
          { e: [44, 196, 2.5, 10, 10], p: 0 },
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
        x: [[51, 181]],
        zones: [
          { e: [47, 207, 2.5, 13, 10], p: 0 },
          { e: [42.5, 254, 4.5, 10, 0], p: 1 },
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
        x: [[88, 182], [85, 195]],
        zones: [
          { e: [95.5, 215, 3.5, 5, 0], p: 1 },
          { e: [88, 246, 7, 5.5, 0], p: 1 },
          { e: [73.5, 230, 3.5, 6, 0], p: 1 },
          { e: [83, 203, 8, 2.5, -5], p: 0 },
        ],
      },
      front: {
        zones: [{ e: [80, 209, 5, 3.5, -20], p: 0 }],
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
        x: [[93.5, 178], [94, 192]],
        zones: [
          { e: [94.5, 197, 4.5, 10, 0], p: 1 },
          { e: [90, 230, 7, 10, 0], p: 0 },
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
        x: [[82, 208], [89, 206], [77, 213]],
        zones: [
          { e: [86, 202, 10, 2.8, -3], p: 1 },
          { e: [96, 214, 3.5, 6, 0], p: 1 },
          { e: [84, 226, 9, 7, 0], p: 0 },
          { e: [78, 246, 3.5, 9, 0], p: 0 },
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
        x: [[80, 212]],
        zones: [
          { e: [78, 232, 5.5, 8, 0], p: 1 },
          { e: [82, 271, 3.5, 22, 2], p: 0 },
          { e: [83, 345, 3.5, 20, 2], p: 0 },
        ],
      },
      front: {
        zones: [
          { e: [73, 258, 3, 26, 2], p: 1 },
          { e: [77, 350, 2.5, 22, -4], p: 0 },
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
        x: [[89, 223], [79, 228]],
        zones: [
          { e: [96, 215, 3.5, 5, 0], p: 1 },
          { e: [84, 233, 9, 6.5, -8], p: 1 },
          { e: [84, 265, 3.5, 17, 0], p: 0 },
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
        x: [[85, 222]],
        zones: [{ e: [85, 242, 5, 12, 0], p: 1 }],
      },
      back: {
        zones: [
          { e: [96.5, 188, 2.8, 18, 0], p: 1 },
          { e: [92, 211, 5, 3.5, 0], p: 0 },
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
        x: [[75.5, 214]],
        zones: [
          { e: [74, 213, 3.5, 5, 0], p: 1 },
          { e: [73, 258, 3, 32, 2], p: 1 },
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
        x: [[85.5, 224]],
        zones: [
          { e: [86, 312, 6, 7.5, 0], p: 1 },
          { e: [86, 294, 3, 8, 0], p: 0 },
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
        x: [[91.5, 280], [93.5, 297]],
        zones: [
          { e: [92, 310, 5, 7, 0], p: 1 },
          { e: [91.5, 286, 3, 10, 0], p: 0 },
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
        x: [[83, 280], [92, 283]],
        zones: [
          { e: [88, 316, 6, 6, 0], p: 1 },
          { e: [87, 292, 6, 12, 0], p: 0 },
          { e: [91, 254, 6, 3, 0], p: 0 },
          { e: [86, 332, 4, 5, 0], p: 0 },
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
        x: [[92, 336], [82, 338]],
        zones: [
          { e: [88, 319, 5, 4, 0], p: 0 },
          { e: [88, 352, 6, 13, 0], p: 1 },
          { e: [88, 416, 4.5, 6, 0], p: 0 },
        ],
      },
      front: {
        zones: [{ e: [94, 414, 3, 5, 0], p: 1 }],
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
        x: [[90, 378], [84, 372]],
        zones: [
          { e: [88, 418, 5.5, 6, 0], p: 1 },
          { e: [87.5, 398, 2.5, 6, 0], p: 0 },
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
        x: [[83, 343]],
        zones: [
          { e: [88, 402, 4, 4, 0], p: 1 },
          { e: [95, 422, 3, 3, 0], p: 1 },
          { e: [84.5, 366, 2.2, 14, -3], p: 0 },
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
        x: [[77.5, 342]],
        zones: [
          { e: [79.5, 405, 3.5, 5, 0], p: 1 },
          { e: [80, 418, 3.5, 3.5, 0], p: 0 },
          { e: [79, 372, 2, 14, -6], p: 0 },
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
