/*
 * Traduzione inglese dei contenuti di js/data.js.
 * Si attiva solo se window.LANG === 'en' (vedi js/i18n.js) e sovrascrive SUL POSTO
 * i testi visibili: id, coordinate, video, tag e valori inviati al server restano invariati.
 * I muscoli e le altre voci si abbinano sempre per id, mai per posizione nell’array.
 * Va caricato subito dopo js/data.js e prima del codice dell’app.
 */
(function () {
  if (window.LANG !== 'en') return;

  const byId = (arr) => Object.fromEntries(arr.map((o) => [o.id, o]));
  const assign = (target, src) => {
    if (!target || !src) return;
    Object.keys(src).forEach((k) => { target[k] = src[k]; });
  };

  /* ───────────── APPLICAZIONE EQUISTASI ───────────── */
  const E = window.EQUISTASI;
  if (E) {
    E.steps = {
      start: [
        'Clean and dry the skin thoroughly at the marked point (no creams, oils or sweat).',
        'Find the point on your body that matches the X: pressing with your fingertip, you will often feel a more tender spot, sometimes a small "knot", that reproduces your pain.',
      ],
      silicone: [
        'Take the adhesive patch supplied free in the pack.',
        'Place the device in the centre of the sticky side of the patch and press firmly so that it stays in place.',
        'Apply the patch to your skin with the device touching the skin, centred exactly on the X.',
      ],
      gel: [
        'Insert the device into its disposable cover (use a new one for each application).',
        'Take the adhesive patch supplied free in the pack and place the cover with the device in the centre of the sticky side.',
        'Apply the patch to your skin with the device touching the skin, centred exactly on the X.',
      ],
      end: [
        'Wear the device for up to 2 hours, then remove it. Repeat in the afternoon (see "How long to wear it").',
      ],
    };
    const s = E.schedule;
    s.sessions[0].label = 'Morning';
    s.sessions[0].time = '2 hours';
    s.sessions[1].label = 'Afternoon';
    s.sessions[1].time = '2 hours';
    s.days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    s.summary = '2 hours in the morning and 2 hours in the afternoon, for 5 days in a row, then 2 days off.';
    s.removeEarly = 'Remove the device before the 2 hours are up if you feel any discomfort, such as increased pain, nausea or a mild headache.';
    s.reassure = 'There is nothing to worry about: it simply means your body needed a shorter session. Once you remove the device, the discomfort passes within a few minutes.';
    s.persist = 'If the discomfort does not go away after removing the device, speak to your doctor or pharmacist.';
    E.find = 'The X shows the typical location of the trigger point. Every body is different: explore an area of about 2–3 cm around the X with your fingers and choose the most tender spot.';
    E.blue = 'The blue area is where you feel the pain, but the problem often starts somewhere else: that’s why the device goes on the X, not on the blue area.';
  }

  /* ───────────── AREE ───────────── */
  const AREAS = {
    testa: 'Head / headache',
    collo: 'Neck',
    spalla: 'Shoulder',
    schiena_alta: 'Upper back',
    torace: 'Chest',
    braccio_gomito: 'Arm / elbow',
    polso_mano: 'Wrist / hand',
    lombare: 'Lower back',
    anca_gluteo: 'Hip / buttock',
    coscia: 'Thigh',
    ginocchio: 'Knee',
    gamba: 'Leg / calf',
    piede: 'Ankle / foot',
  };
  (window.AREAS || []).forEach((a) => { if (AREAS[a.id]) a.name = AREAS[a.id]; });

  /* ───────────── MUSCOLI ───────────── */
  const MUSCLES = {
    trapezio_sup: {
      name: 'Upper trapezius',
      symptom: 'Headache at the temple in a "question mark" shape, pain at the side of the neck and behind the ear.',
      causes: 'Shoulders hunched from stress, long hours on computers and smartphones, heavy shoulder bags.',
      tips: 'Drop your shoulders during the day, switch the shoulder you carry your bag on, adjust the height of your screen.',
    },
    elevatore_scapola: {
      name: 'Levator scapulae',
      symptom: 'Stiff neck ("crick in the neck"), difficulty turning your head, pain in the angle between neck and shoulder.',
      causes: 'Sleeping in an awkward position, holding the phone between ear and shoulder, exposure to cold draughts.',
      tips: 'Use a pillow that supports your neck and avoid holding the phone with your shoulder.',
    },
    scm: {
      name: 'Sternocleidomastoid',
      symptom: 'Headache across the forehead and around the eye, ear pain, sometimes dizziness and a feeling of unsteadiness.',
      causes: 'Head held forward, looking up for long periods, shallow upper-chest breathing, whiplash.',
      tips: 'Often both sides need treating. The muscle can be "pinched" between thumb and index finger: do not press on the front of the neck.',
    },
    splenio_testa: {
      name: 'Splenius capitis',
      symptom: 'Pain at the top of the head (vertex), on the same side.',
      causes: 'Head tilted forward for long periods, reading in bed, whiplash.',
      tips: 'Take frequent breaks if you work with your head bent forward.',
    },
    suboccipitali: {
      name: 'Suboccipital muscles',
      symptom: 'Band-like headache starting at the back of the head and reaching the temple and the eye.',
      causes: 'Posture with the chin poked forward, unsuitable glasses, computer work.',
      tips: 'Gently tuck your chin in (making a "double chin") several times a day.',
    },
    temporale: {
      name: 'Temporalis',
      symptom: 'Headache at the temple, pain above the eyebrow and in the upper teeth.',
      causes: 'Clenching or grinding your teeth (bruxism), stress, chewing gum for long periods.',
      tips: 'During the day, check that your teeth are not clenched: lips closed, teeth apart.',
    },
    infraspinato: {
      name: 'Infraspinatus',
      symptom: 'Deep pain at the front of the shoulder, difficulty fastening a bra or reaching behind your back; disturbs sleep when lying on your side.',
      causes: 'Repeated effort with the arm raised or reaching backwards, racket sports, swimming.',
      tips: 'Sleep with a pillow between your arm and chest. The point is on the shoulder blade, so you will often need help to apply the device.',
    },
    sovraspinato: {
      name: 'Supraspinatus',
      symptom: 'Dull ache at the side of the shoulder, especially when raising the arm out to the side; sometimes down to the elbow.',
      causes: 'Carrying weights with the arm outstretched, overhead work, heavy bags.',
      tips: 'Avoid lifting weights with your arm held away from your body.',
    },
    romboidi: {
      name: 'Rhomboids',
      symptom: 'Superficial pain between the spine and the shoulder blade that doesn’t change much with movement.',
      causes: 'Rounded shoulders, long hours at the computer or desk.',
      tips: 'Open up your chest: draw your shoulder blades back and down several times a day.',
    },
    pettorale: {
      name: 'Pectoralis major',
      symptom: 'Pain in the chest and the front of the shoulder, which may spread down the inside of the arm to the last fingers.',
      causes: 'Rounded shoulders, weightlifting, long hours driving or at the computer.',
      tips: 'Stretch your chest against a door frame.',
      warning: 'Chest pain, especially if it spreads to the left arm or jaw or comes with breathlessness, sweating or nausea, may be heart-related: call 112 / your local emergency number immediately.',
    },
    estensori_radiali: {
      name: 'Radial wrist extensors',
      symptom: 'Pain on the outside of the elbow ("tennis elbow") and on the back of the hand towards the thumb; weak grip.',
      causes: 'Repetitive wrist movements: using a mouse or tools, racket sports, gardening.',
      tips: 'Grip objects with your palm facing up whenever possible; take breaks during manual work.',
    },
    estensore_dita: {
      name: 'Finger extensors (extensor digitorum)',
      symptom: 'Pain along the back of the forearm, wrist and fingers; stiff fingers in the morning.',
      causes: 'Heavy typing, playing musical instruments, precise manual work.',
      tips: 'Slowly open and close your hand during breaks.',
    },
    quadrato_lombi: {
      name: 'Quadratus lumborum',
      symptom: 'Deep low back pain, often on one side; pain in the buttock and hip, difficulty turning over in bed or getting up from a chair.',
      causes: 'Lifting while twisting the trunk, one leg shorter than the other, standing or sitting lopsided for long periods.',
      tips: 'Bend your knees when lifting and avoid sitting on your wallet.',
    },
    paravertebrali: {
      name: 'Lumbar paraspinal muscles',
      symptom: 'Pain in the lower back next to the spine, which may spread down towards the buttock.',
      causes: 'Prolonged sitting, sudden strain, lifting incorrectly.',
      tips: 'Get up every 30–45 minutes and walk regularly.',
    },
    gluteo_medio: {
      name: 'Gluteus medius',
      symptom: 'Pain along the top of the pelvis (iliac crest), in the lower back and in the buttock; discomfort when sleeping on your side or walking for a long time.',
      causes: 'Lots of walking or running, standing on one leg, sleeping on your side.',
      tips: 'When sleeping on your side, keep a pillow between your knees.',
    },
    gluteo_minimo: {
      name: 'Gluteus minimus',
      symptom: 'Pain running from the buttock down the outer or back of the leg to the ankle: it mimics "sciatica".',
      causes: 'Limping, long walks, standing still for long periods, injections into the buttock.',
      tips: 'If you have tingling, loss of strength or loss of feeling, see your doctor to rule out true sciatica.',
    },
    piriforme: {
      name: 'Piriformis',
      symptom: 'Deep pain in the buttock and around the sacrum, worse when sitting; it may spread down the back of the thigh.',
      causes: 'Sitting for long periods (especially on hard surfaces or with a wallet in your back pocket), running, driving.',
      tips: 'Sit with your weight evenly on both buttocks; stretch by crossing one leg over the other.',
    },
    ileopsoas: {
      name: 'Iliopsoas',
      symptom: 'Back pain running vertically along the lower spine, worse when standing; pain in the groin and upper thigh.',
      causes: 'Many hours sitting, sleeping curled up in a fetal position, sit-ups with straight legs.',
      tips: 'Sensitive point close to the blood vessels and nerves of the groin: apply gently on the muscle only, to the outside of where you feel the artery pulse.',
    },
    tensore_fascia_lata: {
      name: 'Tensor fasciae latae',
      symptom: 'Pain in the hip and along the outside of the thigh, sometimes down to the knee; discomfort when sitting for long periods with the hips bent.',
      causes: 'Running, cycling, walking uphill, sleeping on your side.',
      tips: 'Avoid sitting with your knees higher than your hips.',
    },
    retto_femorale: {
      name: 'Rectus femoris (quadriceps)',
      symptom: 'Deep pain at the front of the knee and over the kneecap, often at night; difficulty going down stairs.',
      causes: 'Jumping, running, football, falls onto the knees, sitting for long periods.',
      tips: 'Stretch the front of your thigh by bringing your heel towards your buttock.',
    },
    vasto_mediale: {
      name: 'Vastus medialis (quadriceps)',
      symptom: 'Pain at the inner front of the knee; sometimes the knee suddenly "gives way".',
      causes: 'Running, skiing, kneeling for long periods, knee injuries.',
      tips: 'Avoid kneeling or squatting for long periods.',
    },
    ischiocrurali: {
      name: 'Hamstrings (back of the thigh)',
      symptom: 'Pain at the back of the thigh and behind the knee, worse when sitting or walking.',
      causes: 'Chairs that press on the back of the thigh, running, football.',
      tips: 'Use chairs of the right height: your feet should rest flat on the floor.',
    },
    gastrocnemio: {
      name: 'Gastrocnemius (calf)',
      symptom: 'Night-time calf cramps, pain in the calf and along the inner arch of the foot, sometimes behind the knee.',
      causes: 'Walking uphill, high heels, running, sitting with your legs crossed for long periods.',
      tips: 'Drink enough fluids and stretch your calf before going to sleep.',
      warning: 'A swollen, warm, red and painful calf (especially after long journeys or being immobile) may be a sign of thrombosis: see a doctor straight away and do not apply anything.',
    },
    soleo: {
      name: 'Soleus',
      symptom: 'Heel pain (often mistaken for plantar fasciitis) and Achilles tendon pain, worse when climbing stairs.',
      causes: 'Running, walking uphill or on soft ground (sand), heeled shoes.',
      tips: 'Stretch your calf with your knee bent; choose shoes with good heel support.',
    },
    tibiale_anteriore: {
      name: 'Tibialis anterior',
      symptom: 'Pain at the front of the ankle and in the big toe; the foot "trips" or slaps the ground when walking.',
      causes: 'Walking downhill, running on hard surfaces, shoes that are too tight.',
      tips: 'Lace your shoes without tightening them too much over the top of your foot.',
    },
    peronei: {
      name: 'Peroneal (fibularis) muscles',
      symptom: 'Pain on the outer ankle bone (malleolus) and along the outer edge of the foot; "weak" ankles that twist easily.',
      causes: 'Ankle sprains, flat feet, crossing your legs, high heels.',
      tips: 'Balance exercises on one leg help strengthen the ankle.',
    },
  };
  const mById = byId(window.MUSCLES || []);
  Object.keys(MUSCLES).forEach((id) => assign(mById[id], MUSCLES[id]));

  /* ───────────── SEGNALI D’ALLARME ───────────── */
  if (Array.isArray(window.RED_FLAGS)) {
    const RF = [
      'Pain after a fall or a significant injury',
      'Fever, unexplained weight loss, or pain that doesn’t ease with rest / at night',
      'Tingling, loss of strength or loss of feeling in the arms or legs',
      'Problems controlling your bladder or bowels',
      'Chest pain with breathlessness, sweating or nausea (call 112 / your local emergency number)',
      'A swollen, warm and red leg',
      'A sudden, extremely severe headache, or one with problems seeing or speaking',
    ];
    window.RED_FLAGS.splice(0, window.RED_FLAGS.length, ...RF);
  }

  /* ───────────── PROFILI E PATOLOGIE (i tag restano invariati) ───────────── */
  assign(window.PROFILES && window.PROFILES.dolore, {
    label: 'I have pain',
    title: 'Muscle or joint pain',
    desc: 'Back pain, neck pain, shoulder, knee, headache…',
  });
  assign(window.PROFILES && window.PROFILES.neuro, {
    label: 'Neurological condition',
    title: 'Neurological condition',
    desc: 'Parkinson’s, multiple sclerosis, ataxia and other conditions',
  });
  assign(window.PROFILES && window.PROFILES.sport, {
    label: 'Sport and performance',
    title: 'Sport and performance',
    desc: 'Balance, recovery and sports performance',
  });

  const PAT = {
    parkinson: 'Parkinson’s disease',
    sm: 'Multiple sclerosis',
    atassia: 'Ataxia',
    altro: 'Other neurological condition',
  };
  Object.keys(PAT).forEach((k) => {
    if (window.PATOLOGIE && window.PATOLOGIE[k]) window.PATOLOGIE[k].label = PAT[k];
  });

  /* ───────────── FASCE D’ETÀ ─────────────
   * window.ETA NON si tocca (i valori vanno al server): solo le etichette da mostrare. */
  window.ETA_EN = {
    'Meno di 30': 'Under 30',
    '30-49': '30-49',
    '50-64': '50-64',
    '65-74': '65-74',
    '75 e oltre': '75 and over',
  };

  /* ───────────── PRIVACY ───────────── */
  const P = window.PRIVACY;
  if (P) {
    P.titolare = '[Company name, registered office and VAT number of the Data Controller]';
    P.contatto = '[privacy / DPO email]';
    P.sections = [
      ['What data we process',
        'The serial number of your device, to check that it is a genuine Equistasi product. ' +
        'The usage profile you choose (pain, neurological condition, sport) and any condition you specify: these are health data. ' +
        'Your age group, if you choose to provide it. We do not ask for your name, email address or phone number. ' +
        'The pain areas and muscles you look up on the map stay on your phone and are not sent anywhere.'],
      ['Why we process it',
        'a) To verify the serial number and give you access to the app. ' +
        'b) To show you the protocols and videos suited to your profile: this choice stays saved on your phone. ' +
        'c) Only if you give your consent: to record your profile, condition and age group together with the serial number, for statistics that help us improve our products, protocols and services.'],
      ['Legal basis',
        'For a) and b): performance of the service you request (art. 6.1.b GDPR). ' +
        'For c): your explicit consent (art. 6.1.a and art. 9.2.a GDPR). Consent is optional and you can withdraw it at any time: if you do not give it, you can still use the app without any restriction.'],
      ['Where it is stored',
        'Shared data are recorded on the Data Controller’s systems through technical providers appointed as data processors: Make.com (processing), Airtable (storage) and Bunny.net (video). ' +
        'Some providers may process data outside the European Union with the safeguards required by the GDPR (e.g. standard contractual clauses).'],
      ['How long we keep it',
        '[State the retention period, e.g. 24 months from the last use of the app] or until you withdraw your consent.'],
      ['Your rights',
        'You can ask at any time for access, rectification, erasure, restriction and portability of your data, and object to processing, as well as withdraw your consent. ' +
        'You also have the right to lodge a complaint with the Italian Data Protection Authority (Garante per la protezione dei dati personali, www.garanteprivacy.it).'],
      ['Data on your phone',
        'The app saves the serial number, your chosen profile and your preferences on your phone, so it doesn’t have to ask you every time. You can delete them whenever you like from the app’s Privacy page.'],
    ];
  }

  /* ───────────── PROTOCOLLI CON TAVOLA ILLUSTRATA ───────────── */
  const PROTOCOLS = {
    propriocezione: {
      title: 'Proprioception and motor control',
      subtitle: 'C7 and both soleus muscles',
      intro: 'Application points to enhance proprioception and improve motor control. You will need 3 Equistasi devices.',
      points: [
        ['C7', 'At the base of the neck, on the most prominent vertebra you can feel in the middle when you bend your head forward.'],
        ['Right and left soleus', 'On the lower part of the calf of both legs, above the Achilles tendon, in the centre of the highlighted area.'],
      ],
    },
  };
  const pById = byId(window.APP_PROTOCOLS || []);
  Object.keys(PROTOCOLS).forEach((id) => assign(pById[id], PROTOCOLS[id]));
})();
