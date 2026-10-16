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
    viso: 'Face / jaw',
    collo: 'Neck',
    spalla: 'Shoulder',
    schiena_alta: 'Upper back',
    torace: 'Chest',
    addome: 'Abdomen / belly',
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
    trapezio_medio_inf: {
      name: 'Middle and lower trapezius',
      symptom: 'Aching or burning pain between the spine and the shoulder blade; from the lower trapezius the pain can travel up to the base of the neck, above the shoulder blade and to the shoulder.',
      causes: 'Slouched posture, arms held out in front of you for long periods (computer, driving), heavy backpacks and bags.',
      tips: 'Take breaks to open up your chest and draw your shoulder blades back and down; adjust your chair and screen.',
    },
    iliocostale_toracico: {
      name: 'Iliocostalis thoracis (thoracic paraspinals)',
      symptom: 'Pain along the back next to the spine that can travel up towards the shoulder blade, down towards the lower back or forwards to the chest and abdomen.',
      causes: 'Sitting or bending forward for long periods, lifting with a rounded back, sudden twisting movements.',
      tips: 'Change position often, bend your knees when lifting and walk a little every hour.',
    },
    dentato_post_sup: {
      name: 'Serratus posterior superior',
      symptom: 'Deep pain under the upper part of the shoulder blade, which can spread down the back of the shoulder and arm to the elbow and the little-finger side of the hand.',
      causes: 'Laboured breathing or a long-lasting cough, slouched posture with rounded shoulders, working with the arms raised.',
      tips: 'Breathe slowly into your belly and often draw your shoulders back and down. The point lies under the shoulder blade: move your arm forwards to reach it more easily.',
    },
    massetere: {
      name: 'Masseter',
      symptom: 'Pain in the jaw, cheek and teeth (molars), sometimes above the eyebrow or in the ear with ringing; difficulty opening the mouth fully.',
      causes: 'Clenching or grinding the teeth (also at night), chewing gum or hard foods for a long time, stress.',
      tips: 'During the day keep your lips closed and your teeth apart. If you grind your teeth at night, talk to your dentist.',
      warning: 'Jaw pain that comes on with exertion, together with chest pain, breathlessness or sweating, may be heart-related: call 112 / your local emergency number immediately.',
    },
    pterigoideo_laterale: {
      name: 'Lateral pterygoid',
      symptom: 'Deep pain in front of the ear, in the jaw joint (TMJ) and the cheekbone, often with clicking or grating when you open your mouth.',
      causes: 'Teeth grinding, a bite that does not fit well, always chewing on the same side, holding the jaw forward.',
      tips: 'This muscle lies deep: apply the device on the X, just in front of the ear and below the cheekbone. Prefer soft foods for a few days.',
    },
    digastrico: {
      name: 'Digastric',
      symptom: 'Pain below the angle of the jaw and behind the ear, in the throat or the lower front teeth; a feeling of a lump in the throat.',
      causes: 'Forward head posture, mouth breathing, teeth grinding, incorrect swallowing.',
      tips: 'Keep your head aligned over your shoulders and your tongue resting against the roof of your mouth.',
      warning: 'If you feel a hard lump under the jaw, have a fever or difficulty swallowing, see your doctor.',
    },
    zigomatico: {
      name: 'Zygomaticus major',
      symptom: 'Pain rising from the cheek along the side of the nose up to the middle of the forehead.',
      causes: 'Tension in the facial muscles, stress, holding expressions for a long time (for example squinting at a screen).',
      tips: 'Relax your face during the day and take regular screen breaks.',
    },
    retto_addome: {
      name: 'Rectus abdominis',
      symptom: 'Pain in the pit of the stomach with a feeling of fullness or burning, cramps around the navel; it can cause a horizontal band of pain across the middle of the back or lower down, in the lower back and sacrum.',
      causes: 'Sit-ups done incorrectly, slouched posture, a long-lasting cough, abdominal surgery.',
      tips: 'Breathe slowly into your belly; gently stretch your abdomen lying face down, propped up on your forearms.',
      warning: 'Severe or sudden abdominal pain, or pain with fever, vomiting, blood in the stools or a hard belly, must always be checked by a doctor straight away.',
    },
    obliqui_addome: {
      name: 'External abdominal oblique',
      symptom: 'Burning or pain in the pit of the stomach, similar to a stomach ache; pain in the side and, from the lowest points, in the groin.',
      causes: 'Repeated twisting of the trunk (golf, tennis, housework), coughing, slouched posture.',
      tips: 'Avoid sudden twisting of the trunk and strengthen your abdomen with gentle exercises.',
      warning: 'Heartburn that does not go away, or severe or sudden abdominal pain, must always be checked by a doctor.',
    },
    occipitofrontale: {
      name: 'Occipitofrontalis (frontalis and occipitalis)',
      symptom: 'From the frontal belly: pain in the forehead, above the eye. From the occipital belly: pain at the back of the head spreading over the top of the head to behind the eye.',
      causes: 'Frowning, stress, eye strain, unsuitable glasses, sleeping with your head on a pillow that is too hard.',
      tips: 'Relax your forehead during the day and have your eyesight checked if you strain your eyes.',
    },
    scaleni: {
      name: 'Scalenes',
      symptom: 'Pain in the chest, the front and back of the arm, the thumb and index finger side of the hand and along the inner edge of the shoulder blade; sometimes tingling in the hand.',
      causes: 'Breathing with the chest instead of the belly, coughing, carrying heavy loads, sleeping with the head low, whiplash.',
      tips: 'Breathe slowly into your belly; keep your head well supported on the pillow. The point is close to the nerves and vessels of the neck: apply gently.',
      warning: 'Persistent tingling, loss of strength or a cold, pale hand must be checked by a doctor.',
    },
    deltoide: {
      name: 'Deltoid',
      symptom: 'Pain localised to the shoulder, at the front, side or back, that gets worse when you raise your arm.',
      causes: 'Lifting with straight arms, repeated overhead movements, throwing sports, knocks to the shoulder.',
      tips: 'Avoid keeping your arms raised for a long time; take breaks during overhead work.',
    },
    sottoscapolare: {
      name: 'Subscapularis',
      symptom: 'Strong pain at the back of the shoulder that can travel down the back of the arm to a “bracelet” of pain around the wrist; difficulty raising the arm and reaching back (“frozen” shoulder).',
      causes: 'Repeated inward-rotation movements (swimming, throwing), lifting weights overhead, keeping the arm still for a long time.',
      tips: 'The muscle lies under the shoulder blade: apply the device in the armpit, on the outer edge of the shoulder blade. Move your shoulder gently every day.',
    },
    piccolo_rotondo: {
      name: 'Teres minor',
      symptom: 'Deep, well-localised pain at the back of the shoulder, in the rear part of the deltoid.',
      causes: 'Lifting objects overhead or behind you, throwing sports, driving with your hands high on the wheel for long periods.',
      tips: 'Avoid sleeping on the painful side; take breaks from overhead movements.',
    },
    grande_rotondo: {
      name: 'Teres major',
      symptom: 'Pain at the back of the shoulder and along the back of the arm, sometimes down to the forearm; pain when raising the arm high.',
      causes: 'Rowing, pulling or pushing weights, driving with straight arms, repeated overhead movements.',
      tips: 'Gently stretch your arm overhead; avoid sudden pulling efforts.',
    },
    gran_dorsale: {
      name: 'Latissimus dorsi',
      symptom: 'Dull, constant ache below the tip of the shoulder blade, which can travel down the back of the arm to the little-finger side of the hand.',
      causes: 'Pulling down or towards you (pull-ups, rowing, swimming), lifting weights away from the body, working with the arms forward and up.',
      tips: 'Stretch your side by raising your arm overhead and leaning to the opposite side.',
    },
    dentato_anteriore: {
      name: 'Serratus anterior',
      symptom: 'Pain on the side of the chest at the level of the middle ribs and below the tip of the shoulder blade; a “stitch” when running, discomfort when breathing deeply.',
      causes: 'Running, push-ups, lifting weights overhead, a strong and prolonged cough.',
      tips: 'Breathe slowly and deeply; reduce pushing efforts until the pain goes.',
      warning: 'Chest pain with breathlessness, sweating or nausea may be heart-related: call 112 / your local emergency number immediately.',
    },
    piccolo_pettorale: {
      name: 'Pectoralis minor',
      symptom: 'Pain at the front of the shoulder and in the chest, which may travel down the inside of the arm to the last three fingers; rounded shoulders.',
      causes: 'Slouched posture with rounded shoulders, a backpack with tight straps, chest breathing, using crutches.',
      tips: 'Often open your chest by drawing your shoulders back; stretch against a door frame.',
      warning: 'Chest pain, especially if it spreads to the left arm or comes with breathlessness, sweating or nausea, may be heart-related: call 112 / your local emergency number immediately.',
    },
    bicipite: {
      name: 'Biceps brachii',
      symptom: 'Superficial pain at the front of the shoulder and in the crease of the elbow; weakness when lifting objects with the palm up.',
      causes: 'Lifting weights palm up, carrying heavy bags, screwing, playing string instruments.',
      tips: 'Lift objects keeping them close to your body and alternate arms.',
    },
    tricipite: {
      name: 'Triceps brachii',
      symptom: 'Pain at the back of the shoulder and along the back of the arm, at the elbow (outer “tennis elbow” or tip of the elbow) and sometimes down to the last fingers.',
      causes: 'Push-ups and dips, tennis and golf, using crutches or a walking stick, leaning on your elbows.',
      tips: 'Avoid leaning on your elbows for long; if you use a walking stick, set the right height.',
    },
    brachiale: {
      name: 'Brachialis',
      symptom: 'Pain at the base of the thumb (on the back of the hand) and in the crease of the elbow, sometimes at the front of the shoulder.',
      causes: 'Carrying loads with the elbow bent (shopping bags, children in your arms), repeated heavy work, playing the guitar.',
      tips: 'Carry bags with your arm straight and alternate sides.',
    },
    brachioradiale: {
      name: 'Brachioradialis',
      symptom: 'Pain on the outer side of the elbow and forearm and on the back of the hand, between the thumb and index finger.',
      causes: 'Gripping hard (tools, racket, mouse), lifting with the thumb up, gardening.',
      tips: 'Grip with your palm facing up whenever possible; take breaks during manual work.',
    },
    flessori_avambraccio: {
      name: 'Wrist and finger flexors',
      symptom: 'Pain on the palm side of the wrist and in the palm, which can reach the fingers; difficulty gripping scissors or tools.',
      causes: 'Gripping tools or the steering wheel for long periods, precise manual work, grip sports (climbing, tennis, golf).',
      tips: 'Loosen your grip whenever possible and take breaks, slowly opening and closing your hand.',
      warning: 'Tingling at night in the thumb, index and middle fingers may indicate carpal tunnel syndrome: talk to your doctor.',
    },
    adduttore_pollice: {
      name: 'Adductor and opponens pollicis',
      symptom: 'Pain at the base of the thumb and on the thumb side of the wrist; difficulty writing, buttoning or pinching objects.',
      causes: 'Writing for long periods, using a smartphone with your thumb, sewing, gardening and using pliers.',
      tips: 'Alternate hands on your phone and take breaks, spreading your thumb.',
    },
    interossei_mano: {
      name: 'Interossei of the hand',
      symptom: 'Pain along the side of a finger to the tip, stiff fingers and small tender nodules at the joints.',
      causes: 'Gripping small objects for long periods, sewing, typing, playing instruments.',
      tips: 'Spread and close your fingers during breaks; use larger grips.',
    },
    dentato_post_inf: {
      name: 'Serratus posterior inferior',
      symptom: 'Dull, nagging ache over the lowest ribs, in the lower part of the mid back, that lingers even after other treatments.',
      causes: 'Lifting and twisting the trunk at the same time, a prolonged cough, laboured breathing.',
      tips: 'Avoid lifting while twisting your trunk; breathe slowly into your belly.',
    },
    grande_gluteo: {
      name: 'Gluteus maximus',
      symptom: 'Pain in the buttock and around the sacrum and tailbone; discomfort when sitting for long periods, climbing stairs or walking uphill.',
      causes: 'Sitting for long periods, climbing stairs or slopes, breaststroke, falls on the buttocks, sleeping face down with straight legs.',
      tips: 'Sit on a soft cushion and stand up often; when sleeping on your side keep a pillow between your knees.',
    },
    adduttori: {
      name: 'Thigh adductors',
      symptom: 'Pain in the groin and along the inner thigh, which may spread to the inside of the knee and shin; pain when spreading the legs.',
      causes: 'Football, skiing, horse riding, slipping, sitting cross-legged for long periods.',
      tips: 'Gently stretch your inner thigh; avoid crossing your legs for long periods.',
    },
    pettineo: {
      name: 'Pectineus',
      symptom: 'Deep pain in the groin, just below the crease, which increases when spreading the legs.',
      causes: 'Tripping or slipping, sitting cross-legged, sports with changes of direction.',
      tips: 'The point is close to the groin vessels: apply gently on the muscle only, to the inside of where you feel the artery pulse.',
    },
    sartorio: {
      name: 'Sartorius',
      symptom: 'Superficial pain, sometimes sharp or tingling, running diagonally down the thigh from the hip to the inside of the knee.',
      causes: 'Sitting cross-legged, running, falls, knock knees.',
      tips: 'Avoid sitting cross-legged for long periods.',
    },
    vasto_laterale: {
      name: 'Vastus lateralis',
      symptom: 'Pain along the outer side of the thigh and knee, sometimes with a “locked” knee or stiff kneecap; discomfort sleeping on your side.',
      causes: 'Running, going down stairs and slopes, skiing, knocks to the side of the thigh.',
      tips: 'When sleeping on your side, put a pillow between your knees; gently massage the side of the thigh.',
    },
    estensore_lungo_dita: {
      name: 'Extensor digitorum longus',
      symptom: 'Pain on the top of the foot reaching the middle toes; night cramps in the front of the leg.',
      causes: 'Walking uphill or on uneven ground for long periods, tight shoes, long drives with the foot on the pedal.',
      tips: 'Choose comfortable shoes that are not tight on the toes; move your ankles often.',
    },
    tibiale_posteriore: {
      name: 'Tibialis posterior',
      symptom: 'Pain in the Achilles tendon and under the sole of the foot, especially when walking or running on uneven ground.',
      causes: 'Flat or rolled-in feet, running on uneven ground, worn-out shoes.',
      tips: 'This muscle lies deep: apply the device on the X, in the middle of the calf. Wear shoes that support the arch of the foot well.',
    },
    flessore_lungo_dita: {
      name: 'Flexor digitorum longus',
      symptom: 'Pain under the sole, in the front of the foot and under the toes; sometimes inside the ankle and calf.',
      causes: 'Walking on sand or uneven ground, stiff or tight shoes, flat feet.',
      tips: 'Roll a small ball under the sole of your foot and choose flexible shoes.',
    },
    popliteo: {
      name: 'Popliteus',
      symptom: 'Pain behind the knee, especially when squatting, running or going down stairs and slopes.',
      causes: 'Downhill running, sports with changes of direction, knee sprains.',
      tips: 'Reduce downhill walking until the pain goes; avoid squatting for long periods.',
    },
    estensore_breve_dita: {
      name: 'Dorsal foot muscles (short extensors)',
      symptom: 'Pain on the top of the foot, in the middle, which gets worse when walking.',
      causes: 'Tight shoes or laces, walking for long periods, a stiff foot.',
      tips: 'Loosen your laces and choose comfortable shoes with a wide toe box.',
    },
    abduttore_alluce: {
      name: 'Abductor hallucis',
      symptom: 'Pain on the inside of the heel and along the inner arch of the foot, especially when walking.',
      causes: 'Tight or stiff shoes, flat or rolled-in feet, walking for long periods on hard surfaces.',
      tips: 'Choose comfortable shoes with good arch support; roll a small ball under the arch of your foot.',
    },
    flessore_breve_dita: {
      name: 'Flexor digitorum brevis',
      symptom: 'Pain under the sole at the level of the metatarsal heads (forefoot), worse after walking for a long time.',
      causes: 'Shoes with stiff or thin soles, walking barefoot on hard surfaces, high-arched feet.',
      tips: 'Wear shoes with soft, cushioned soles; massage the sole with a small ball.',
    },
    quadrato_plantare: {
      name: 'Quadratus plantae',
      symptom: 'Pain under the heel, strong with the first steps in the morning; often mistaken for plantar fasciitis or a heel spur.',
      causes: 'Standing for long periods, shoes without cushioning, being overweight, running.',
      tips: 'This muscle lies deep: apply the device on the X, in front of the heel. Before getting out of bed, move your ankles and stretch your sole.',
    },
    abduttore_mignolo_piede: {
      name: 'Abductor digiti minimi (foot)',
      symptom: 'Pain under the outer edge of the sole, near the base of the little toe.',
      causes: 'Shoes that are tight at the toes, walking on the outer edge of the foot, ankle sprains.',
      tips: 'Choose shoes with a wide toe box and check how your soles wear.',
    },
    muscoli_alluce: {
      name: 'Flexor hallucis brevis and adductor hallucis',
      symptom: 'Pain under the base of the big toe and under the forefoot, sometimes with a feeling of swelling or numbness.',
      causes: 'High heels, shoes that are tight at the toes, bunions, walking for long periods.',
      tips: 'Avoid high heels and tight shoes; move your toes often.',
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
