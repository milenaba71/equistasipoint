"""Protocolli Equistasi per i pazienti: genera HTML (IT/EN) da un modello unico."""
import sys

CSS = open('template.css').read()
FOOT = {
    'it': ('Queste informazioni non sostituiscono il parere del medico o del fisioterapista. Leggi sempre le istruzioni per l’uso del dispositivo.',
           'Rev. 1 – ottobre 2026 · pagina {p} di {n}'),
    'en': ('This information does not replace the advice of a doctor or physiotherapist. Always read the device instructions for use.',
           'Rev. 1 – October 2026 · page {p} of {n}'),
}
KICK = {'it': 'Guida per il paziente', 'en': 'Patient guide'}


def steps(items):
    return '<ol class="steps">' + ''.join(
        '<li><span class="b%s">%s</span><div><b class="h">%s</b>%s</div></li>' % (' b2' if len(n) > 1 else '', n, h, t) for n, h, t in items) + '</ol>'


def h2(n, t):
    return '<h2><span class="n">%s</span> %s</h2>' % (n, t)


def fig(src, cap, cls=''):
    return '<figure class="fig %s"><img src="%s" alt=""><figcaption>%s</figcaption></figure>' % (cls, src, cap)


def where(left, figure, col='48mm'):
    return '<div class="where" style="grid-template-columns:1fr %s">%s%s</div>' % (col, '<div>' + left + '</div>', figure)


def timetable(rows, week=False):
    out = '<div class="time">'
    for i, (kk, v) in enumerate(rows):
        extra = ''
        if week and i == len(rows) - 1:
            extra = '<div class="week">' + ''.join('<span%s>%s</span>' % (' class="off"' if j > 4 else '', d) for j, d in enumerate(week)) + '</div>'
        out += '<div class="row"><div class="k">%s</div><div class="v">%s%s</div></div>' % (kk, v, extra)
    return out + '</div>'


def warn(title, items):
    return '<div class="warn"><h3>⚠ %s</h3><ul>%s</ul></div>' % (title, ''.join('<li>%s</li>' % i for i in items))


def page(lang, title_short, body, p, n, first=None):
    if first:
        head = ('<header><img class="logo" src="logo.png" alt="Equistasi"><div class="kicker">%s · %s</div><h1>%s</h1><p>%s</p></header>'
                % (KICK[lang], first['kicker'], first['title'], first['intro']))
    else:
        head = '<header class="slim"><img class="logo" src="logo.png" alt="Equistasi"><span class="t">%s</span></header>' % title_short
    d, rev = FOOT[lang]
    foot = ('<footer><div><p class="disc">%s</p><b>Equistasi S.r.l.</b> · www.equistasi.com · info@equistasi.com<br>%s</div>'
            '<img src="qr.png" alt="QR app.equistasi.com"></footer>') % (d, rev.format(p=p, n=n))
    return '<div class="page">%s<main>%s</main>%s</div>' % (head, body, foot)


def doc(lang, title, pages):
    return ('<!doctype html><html lang="%s"><head><meta charset="utf-8"><title>%s</title><link rel="stylesheet" href="fonts.css"><style>%s</style></head><body>%s</body></html>'
            % (lang, title, CSS, ''.join(pages)))


WEEK = {'it': 'LMMGVSD', 'en': 'MTWTFSS'}
APPTIP = {
    'it': '<div class="tip"><b>Trova i punti con l’app.</b> Inquadra il codice QR: nell’app Equistasi Point trovi le tavole anatomiche con i punti di applicazione e i video tutorial.</div>',
    'en': '<div class="tip"><b>Find the points with the app.</b> Scan the QR code: in the Equistasi Point app you will find anatomical plates with the application points and video tutorials.</div>',
}
FIX = {
    'it': '<div class="tip"><b>Come fissarlo:</b> pulisci e asciuga bene la pelle (niente creme o oli) e fissa ogni dispositivo con il cerotto trasparente in dotazione, a contatto con la pelle.</div>',
    'en': '<div class="tip"><b>How to attach it:</b> clean and dry the skin well (no creams or oils) and fix each device with the transparent patch supplied, in contact with the skin.</div>',
}
ANY = {
    'it': 'Toglili <b>anche prima</b> se senti un <b>fastidio di qualunque genere</b>: passa in pochi minuti dopo averli tolti.',
    'en': 'Remove them <b>earlier</b> if you feel <b>discomfort of any kind</b>: it passes within a few minutes after removing them.',
}


# ─────────────── DOLORE CRONICO ───────────────
def dolore(L):
    it = L == 'it'
    T = 'Dolore cronico: <span>come usare Equistasi®</span>' if it else 'Chronic pain: <span>how to use Equistasi®</span>'
    first = dict(kicker='Dolore' if it else 'Pain', title=T, intro=(
        'Equistasi® è un dispositivo medico pensato per aiutarti a gestire il dolore cronico attraverso vibrazioni focali che stimolano la percezione del corpo, contribuendo a ridurre il dolore. Ecco come utilizzarlo in modo efficace.' if it else
        'Equistasi® is a medical device designed to help you manage chronic pain through focal vibrations that stimulate body awareness, helping to reduce pain. Here is how to use it effectively.'))
    p1 = '<section>' + h2(1, 'Dove applicare i 3 dispositivi' if it else 'Where to apply the 3 devices') + where(
        steps([('1', 'Sul punto doloroso' if it else 'On the painful spot',
                'Identifica l’area in cui senti il dolore più intenso e applica il primo dispositivo direttamente su questo punto.' if it else 'Find the area where you feel the most intense pain and apply the first device directly on this spot.'),
               ('2·3', 'Sui muscoli coinvolti' if it else 'On the muscles involved',
                'Applica gli altri due dispositivi sui muscoli che sostengono il movimento dell’area dolorante. Questo aiuta a migliorare la percezione del corpo e a ridurre la tensione muscolare. Nell’app Equistasi Point trovi i muscoli di ogni zona del corpo.' if it else
                'Apply the other two devices on the muscles that support the movement of the painful area. This helps improve body awareness and reduce muscle tension. In the Equistasi Point app you will find the muscles for every area of the body.')]) + FIX[L],
        fig('fig_knee.jpg', '<b>Esempio: dolore al ginocchio.</b> 1 sul punto doloroso, 2 e 3 sui muscoli della coscia.' if it else '<b>Example: knee pain.</b> 1 on the painful spot, 2 and 3 on the thigh muscles.'), '64mm') + '</section>'
    p1 += '<section>' + h2(2, 'Verifica se funziona' if it else 'Check that it works') + '<p style="margin:0 0 3mm">' + (
        'Dopo aver applicato i dispositivi, attendi circa <b>10 minuti</b>.' if it else 'After applying the devices, wait about <b>10 minutes</b>.') + '</p><div class="check">' + (
        '<div class="c ok"><span class="t">✓ Senti anche un leggero sollievo?</span>Significa che i punti scelti sono corretti.</div><div class="c ko"><span class="t">↻ Nessun sollievo dopo 10–20 minuti?</span>Prova a spostare i dispositivi su altri punti vicini, lungo i muscoli o sulla colonna vertebrale.</div>' if it else
        '<div class="c ok"><span class="t">✓ Do you feel even slight relief?</span>It means the chosen points are correct.</div><div class="c ko"><span class="t">↻ No relief after 10–20 minutes?</span>Try moving the devices to other nearby points, along the muscles or on the spine.</div>') + '</div></section>'
    p1 += '<section>' + h2(3, 'Per un beneficio maggiore' if it else 'For greater benefit') + '<p style="margin:0">' + (
        'Puoi regolare i punti di applicazione fino a trovare le posizioni che ti danno il massimo sollievo. Una combinazione di punti principali di dolore e punti circostanti può offrire un sollievo più duraturo.' if it else
        'You can adjust the application points until you find the positions that give you the most relief. A combination of main pain points and surrounding points can provide longer-lasting relief.') + '</p></section>'
    p2 = '<section>' + h2(4, 'Quanto tempo tenerlo' if it else 'How long to keep it on') + timetable([
        ('Prima applicazione' if it else 'First application', 'Applica i dispositivi e lasciali in posizione <b>fino al giorno successivo</b>; toglili circa <b>un’ora dopo il risveglio</b>.' if it else 'Apply the devices and leave them in place <b>until the next day</b>; remove them about <b>an hour after waking up</b>.'),
        ('Se il dolore è scomparso' if it else 'If the pain has gone', 'Non è necessario continuare l’applicazione: ripeti l’uso solo quando il dolore si ripresenta.' if it else 'There is no need to continue: use it again only when the pain comes back.'),
        ('Quando il dolore ritorna' if it else 'When the pain returns', 'Riapplica i dispositivi seguendo le stesse modalità.' if it else 'Reapply the devices in the same way.'),
        ('Pausa settimanale' if it else 'Weekly break', 'Per mantenere l’efficacia nel tempo fai una pausa di <b>almeno 2 giorni ogni settimana</b>.' if it else 'To keep it effective over time, take a break of <b>at least 2 days every week</b>.'),
    ], WEEK[L]) + '</section>'
    p2 += '<section>' + warn('Quando togliere i dispositivi' if it else 'When to remove the devices', [ANY[L],
        'Durante l’applicazione il dolore iniziale può ridursi o scomparire e poi ripresentarsi come un <b>leggero fastidio</b>: è il momento di togliere i dispositivi. Il fastidio diminuisce rapidamente dopo la rimozione.' if it else
        'During application the initial pain may decrease or disappear and then return as <b>mild discomfort</b>: this is the time to remove the devices. The discomfort quickly decreases after removal.',
        'Se avverti <b>nausea, mal di testa o capogiri</b>, togli subito i dispositivi e riprova il giorno successivo.' if it else 'If you feel <b>nausea, headache or dizziness</b>, remove the devices immediately and try again the next day.']) + '</section>'
    p2 += '<section>' + h2(5, 'In sintesi' if it else 'In short') + '<div class="apply"><img src="applicazione.jpg" alt="">' + steps([
        ('1', '', 'Un dispositivo sul <b>punto più doloroso</b>, due sui <b>muscoli</b> che sostengono la zona.' if it else 'One device on the <b>most painful spot</b>, two on the <b>muscles</b> supporting the area.'),
        ('2', '', 'Dopo <b>10 minuti</b> controlla: se non senti sollievo, sposta i dispositivi su punti vicini.' if it else 'After <b>10 minutes</b> check: if you feel no relief, move the devices to nearby points.'),
        ('3', '', 'La prima volta tienili <b>fino al mattino dopo</b>; poi riapplica solo quando il dolore ritorna, con <b>2 giorni di pausa</b> a settimana.' if it else 'The first time keep them on <b>until the next morning</b>; then reapply only when the pain returns, with <b>2 days off</b> a week.')]) + '</div></section>'
    p2 += '<section>' + APPTIP[L] + '</section>'
    short = 'Dolore cronico · Equistasi®' if it else 'Chronic pain · Equistasi®'
    return doc(L, short, [page(L, short, p1, 1, 2, first), page(L, short, p2, 2, 2)])


# ─────────────── DOLORE E DERMATOMERI ───────────────
def derm(L):
    it = L == 'it'
    first = dict(kicker='Dolore' if it else 'Pain', title=('Dolore e dermatomeri: <span>come usare Equistasi®</span>' if it else 'Pain and dermatomes: <span>how to use Equistasi®</span>'), intro=(
        'Ogni zona della pelle è collegata a una radice nervosa che esce dalla colonna vertebrale: questa zona si chiama <b>dermatomero</b>. Conoscerlo ti aiuta a personalizzare l’applicazione di Equistasi®, andando oltre i punti standard.' if it else
        'Each area of skin is connected to a nerve root that leaves the spine: this area is called a <b>dermatome</b>. Knowing it helps you personalise how you apply Equistasi®, going beyond the standard points.'))
    p1 = '<section>' + h2(1, 'Trova la zona del dolore' if it else 'Find the painful area') + '<p style="margin:0">' + (
        'Se senti dolore o alterazioni della sensibilità (formicolii, sensibilità ridotta) in una zona precisa, cerca il dermatomero corrispondente nella <b>mappa a pagina 3</b>. Nell’app Equistasi Point, nella sezione <b>Metamero e dermatomero</b>, trovi per ogni zona la radice nervosa e le vertebre collegate.' if it else
        'If you feel pain or changes in sensation (tingling, reduced feeling) in a specific area, look up the matching dermatome on the <b>map on page 3</b>. In the Equistasi Point app, in the <b>Metamere and dermatome</b> section, you will find the nerve root and the linked vertebrae for every area.') + '</p></section>'
    p1 += '<section>' + h2(2, 'Dove applicare i 3 dispositivi' if it else 'Where to apply the 3 devices') + where(steps([
        ('1', 'Sul punto principale' if it else 'On the main point', 'Applica un dispositivo sulla zona di massima sensibilità o dolore, nel dermatomero interessato.' if it else 'Apply one device on the area of greatest tenderness or pain, within the affected dermatome.'),
        ('2·3', 'Sui muscoli di sostegno' if it else 'On the supporting muscles', 'Applica gli altri due sui muscoli che sostengono la zona (per esempio quadricipite per L3-L4, polpacci per S1-S2).' if it else 'Apply the other two on the muscles that support the area (for example the quadriceps for L3-L4, the calves for S1-S2).'),
        ('+', 'Oppure sulla vertebra' if it else 'Or on the vertebra', 'Puoi applicare un dispositivo anche sulla vertebra che corrisponde al dermatomero (per esempio dolore in L5 → zona lombare bassa).' if it else 'You can also apply a device on the vertebra matching the dermatome (for example pain in L5 → lower back).')]) + FIX[L],
        fig('fig_derm.jpg', '<b>Esempio: L4-L5.</b> 1 vicino alla colonna lombare, 2 e 3 sui polpacci.' if it else '<b>Example: L4-L5.</b> 1 near the lumbar spine, 2 and 3 on the calves.', 'tall')) + '</section>'
    p2 = '<section>' + h2(3, 'Esempi pratici' if it else 'Practical examples') + '<div class="opt"><h3><span class="tag">L4-L5</span>' + ('Dolore o instabilità alle gambe' if it else 'Pain or instability in the legs') + '</h3>' + (
        'Un dispositivo vicino alla colonna lombare corrispondente e due sui polpacci (tricipite surale).' if it else 'One device near the matching lumbar spine and two on the calves (triceps surae).') + '</div>'
    p2 += '<div class="opt"><h3><span class="tag">C5-C7</span>' + ('Dolore al collo che scende al braccio' if it else 'Neck pain spreading to the arm') + '</h3>' + (
        'Un dispositivo su C7 (la vertebra più sporgente alla base del collo) e due sulle braccia, nelle zone di dolore o di rigidità muscolare.' if it else 'One device on C7 (the most prominent vertebra at the base of the neck) and two on the arms, in the areas of pain or muscle stiffness.') + '</div>'
    p2 += '<div class="opt"><h3><span class="tag">S1-S2</span>' + ('Disturbi del cammino nel Parkinson' if it else 'Walking problems in Parkinson’s') + '</h3>' + (
        'Protocollo classico: C7 e entrambi i polpacci (tricipiti surali), che corrispondono ai dermatomeri S1-S2.' if it else 'Classic protocol: C7 and both calves (triceps surae), which correspond to dermatomes S1-S2.') + '</div></section>'
    p2 += '<section>' + h2(4, 'Quanto tempo tenerlo' if it else 'How long to keep it on') + timetable([
        ('Dopo l’applicazione' if it else 'After applying', 'Attendi circa <b>60 secondi</b> e rivaluta il dolore.' if it else 'Wait about <b>60 seconds</b> and reassess the pain.'),
        ('Sulla vertebra' if it else 'On the vertebra', 'Le prime volte tieni i dispositivi <b>1 ora</b>; se serve, aumenta poi fino a <b>2 ore</b>.' if it else 'The first times keep the devices on for <b>1 hour</b>; if needed, then increase up to <b>2 hours</b>.'),
        ('Ogni settimana' if it else 'Every week', '<b>5 giorni</b> di utilizzo e <b>2 di riposo</b>.' if it else '<b>5 days</b> of use and <b>2 days off</b>.'),
    ], WEEK[L]) + '</section>'
    p2 += '<section>' + warn('Quando togliere i dispositivi' if it else 'When to remove the devices', [ANY[L],
        'Se avverti <b>nausea, mal di testa o capogiri</b>, togli subito i dispositivi e riprova il giorno successivo.' if it else 'If you feel <b>nausea, headache or dizziness</b>, remove the devices immediately and try again the next day.']) + '</section>'
    p2 += '<section>' + APPTIP[L] + '</section>'
    short = 'Dolore e dermatomeri · Equistasi®' if it else 'Pain and dermatomes · Equistasi®'
    rows = [('C5', 'Clavicole', 'Collarbones'), ('C5, C6, C7', 'Lato esterno delle braccia', 'Outer side of the arms'),
            ('C8, T1', 'Lato interno delle braccia', 'Inner side of the arms'), ('C6', 'Pollice', 'Thumb'),
            ('C6, C7, C8', 'Mano', 'Hand'), ('C8', 'Anulare e mignolo', 'Ring and little fingers'),
            ('T4', 'Altezza dei capezzoli', 'Nipple level'), ('T10', 'Altezza dell’ombelico', 'Navel level'),
            ('T12', 'Inguine', 'Groin'), ('L1, L2, L3, L4', 'Davanti e interno delle gambe', 'Front and inner side of the legs'),
            ('L4, L5, S1', 'Piedi', 'Feet'), ('L4', 'Lato interno dell’alluce', 'Inner side of the big toe'),
            ('L5, S1, S2', 'Lato esterno e retro delle gambe', 'Outer side and back of the legs'),
            ('S1', 'Bordo esterno del piede e mignolo del piede', 'Outer edge of the foot and little toe'),
            ('S2, S3, S4, S5', 'Perineo', 'Perineum')]
    third = (len(rows) + 2) // 3
    tab = lambda rr: '<table class="derm-t">' + ''.join('<tr><th>%s</th><td>%s</td></tr>' % (a, b if it else c) for a, b, c in rr) + '</table>'
    p3 = '<section>' + h2(5, 'Mappa dei dermatomeri' if it else 'Dermatome map') + (
        '<figure class="fig derm-map"><img src="fig_dermatomi.jpg" alt=""><figcaption>%s</figcaption></figure>' % (
        'Davanti e dietro. La mappa mostra i dermatomeri come zone separate: in realtà ogni dermatomero si sovrappone in parte a quelli vicini.<br><b>Fonte:</b> Frank H. Netter, <i>Atlante di anatomia umana</i>, Elsevier.' if it else
        'Front and back. The map shows the dermatomes as separate areas: in reality each dermatome partly overlaps its neighbours.<br><b>Source:</b> Frank H. Netter, <i>Atlas of Human Anatomy</i>, Elsevier.')) + '</section>'
    p3 += '<section><h3 class="derm-h">' + ('Livelli dei dermatomeri principali' if it else 'Main dermatome levels') + '</h3><div class="three">' + tab(rows[:third]) + tab(rows[third:2 * third]) + tab(rows[2 * third:]) + '</div></section>'
    return doc(L, short, [page(L, short, p1, 1, 3, first), page(L, short, p2, 2, 3), page(L, short, p3, 3, 3)])


# ─────────────── SPORT ───────────────
def sport(L):
    it = L == 'it'
    first = dict(kicker='Sport', title=('Sport e performance: <span>come usare Equistasi®</span>' if it else 'Sport and performance: <span>how to use Equistasi®</span>'), intro=(
        'Equistasi® aiuta il controllo del movimento e la propriocezione, cioè la percezione del corpo nello spazio. Ecco come usarlo prima e durante l’attività sportiva.' if it else
        'Equistasi® supports movement control and proprioception, that is the sense of your body in space. Here is how to use it before and during sport.'))
    p1 = '<section>' + h2(1, 'Dove applicare i 3 dispositivi' if it else 'Where to apply the 3 devices') + where(steps([
        ('1', 'Settima vertebra cervicale (C7)' if it else 'Seventh cervical vertebra (C7)', 'Posiziona un dispositivo alla base del collo, direttamente sopra la C7: è la vertebra più sporgente quando pieghi la testa in avanti.' if it else 'Place one device at the base of the neck, directly over C7: it is the most prominent vertebra when you bend your head forward.'),
        ('2·3', 'Polpacci' if it else 'Calves', 'Applica un dispositivo su ciascun polpaccio, preferibilmente sul muscolo soleo (parte bassa del polpaccio, sopra il tendine d’Achille).' if it else 'Apply one device on each calf, preferably on the soleus muscle (lower part of the calf, above the Achilles tendon).')]) + FIX[L],
        fig('fig_c7_soleo.jpg', '<b>Vista da dietro.</b> 1 su C7, 2 e 3 sui due polpacci.' if it else '<b>Back view.</b> 1 on C7, 2 and 3 on both calves.', 'tall')) + '</section>'
    p2 = '<section>' + h2(2, 'Quanto tempo tenerlo' if it else 'How long to keep it on') + timetable([
        ('Primo giorno' if it else 'First day', 'Indossa i dispositivi <b>prima</b> dell’inizio della pratica sportiva, per <b>1–2 ore</b>.' if it else 'Wear the devices <b>before</b> starting your sport, for <b>1–2 hours</b>.'),
        ('Giorni successivi' if it else 'Following days', 'Usali <b>durante l’allenamento</b> o durante le gare.' if it else 'Use them <b>during training</b> or during competitions.'),
        ('Più allenamenti nello stesso giorno' if it else 'Several sessions in one day', 'Puoi fare più applicazioni, senza superare le <b>4 ore totali</b> al giorno.' if it else 'You can apply them several times, without exceeding <b>4 hours in total</b> per day.'),
        ('Ogni settimana' if it else 'Every week', 'Massimo <b>5 giorni</b>, con <b>2 giorni di pausa</b> per evitare che i recettori si abituino allo stimolo.' if it else 'No more than <b>5 days</b>, with <b>2 days off</b> so that the receptors do not get used to the stimulus.'),
    ], WEEK[L]) + '</section>'
    p2 += '<section>' + h2(3, 'A cosa serve' if it else 'What it is for') + '<div class="two"><div class="opt"><h3>' + ('Stabilità posturale' if it else 'Postural stability') + '</h3>' + (
        'Migliora il controllo neuromuscolare, utile anche per ridurre il rischio di infortuni, come quelli al legamento crociato anteriore.' if it else 'It improves neuromuscular control, which also helps reduce the risk of injuries, such as those to the anterior cruciate ligament.') + '</div><div class="opt"><h3>' + (
        'Prestazione' if it else 'Performance') + '</h3>' + ('Ottimizza il controllo del movimento e la propriocezione, fondamentali negli sport dinamici come il calcio e il ciclismo.' if it else 'It optimises movement control and proprioception, essential in dynamic sports such as football and cycling.') + '</div></div></section>'
    p2 += '<section>' + h2(4, 'Con il tuo fisioterapista' if it else 'With your physiotherapist') + '<p style="margin:0">' + (
        'Ti consigliamo di farti seguire da un fisioterapista o da un preparatore atletico esperto: potrà adattare punti e tempi alle tue esigenze e allo sport che pratichi.' if it else
        'We recommend being followed by a physiotherapist or an experienced athletic trainer: they can adapt the points and times to your needs and to the sport you play.') + '</p></section>'
    p2 += '<section>' + warn('Quando togliere i dispositivi' if it else 'When to remove the devices', [ANY[L],
        'In caso di malessere (per esempio <b>nausea, vertigini o mal di testa</b>) togli subito i dispositivi e riprova il giorno successivo.' if it else 'If you feel unwell (for example <b>nausea, dizziness or headache</b>) remove the devices immediately and try again the next day.']) + '</section>'
    p2 += '<section>' + APPTIP[L] + '</section>'
    short = 'Sport e performance · Equistasi®' if it else 'Sport and performance · Equistasi®'
    return doc(L, short, [page(L, short, p1, 1, 2, first), page(L, short, p2, 2, 2)])


# ─────────────── PARKINSON ───────────────
def parkinson(L):
    it = L == 'it'
    first = dict(kicker='Parkinson', title=('Parkinson: <span>equilibrio e stabilità posturale</span>' if it else 'Parkinson’s: <span>balance and postural stability</span>'), intro=(
        'Come usare Equistasi® per migliorare l’equilibrio e la stabilità quando cammini e stai in piedi. Segui sempre le indicazioni del tuo neurologo o fisioterapista.' if it else
        'How to use Equistasi® to improve balance and stability when walking and standing. Always follow the advice of your neurologist or physiotherapist.'))
    p1 = '<section>' + h2(1, 'Dove applicare i 3 dispositivi' if it else 'Where to apply the 3 devices') + where(steps([
        ('1', 'Settima vertebra cervicale (C7)' if it else 'Seventh cervical vertebra (C7)', 'Dietro al collo: è un punto chiave per la regolazione della postura. È la vertebra più sporgente quando pieghi la testa in avanti.' if it else 'At the back of the neck: a key point for controlling posture. It is the most prominent vertebra when you bend your head forward.'),
        ('2', 'Soleo destro' if it else 'Right soleus', 'Nella parte posteriore della gamba, alla base del polpaccio.' if it else 'At the back of the leg, at the base of the calf.'),
        ('3', 'Soleo sinistro' if it else 'Left soleus', 'Nella stessa posizione sull’altra gamba. I muscoli soleo sono fondamentali per l’equilibrio e per stare in piedi.' if it else 'In the same position on the other leg. The soleus muscles are essential for balance and for standing.')]) + FIX[L],
        fig('fig_c7_soleo.jpg', '<b>Vista da dietro.</b> 1 su C7, 2 e 3 sui due soleo.' if it else '<b>Back view.</b> 1 on C7, 2 and 3 on both soleus muscles.', 'tall')) + '</section>'
    p1 += '<section>' + h2(2, 'Quanto tempo tenerlo' if it else 'How long to keep it on') + timetable([
        ('Primo giorno' if it else 'First day', '<b>1 ora</b> consecutiva, preferibilmente nelle ore in cui ti muovi di più.' if it else '<b>1 hour</b> in a row, preferably at the times of day when you move the most.'),
        ('Dal secondo giorno' if it else 'From the second day', '<b>2 ore al mattino</b> e <b>2 ore al pomeriggio</b>.' if it else '<b>2 hours in the morning</b> and <b>2 hours in the afternoon</b>.'),
        ('Ogni settimana' if it else 'Every week', '<b>5 giorni</b> di utilizzo e <b>2 giorni di pausa</b>, per evitare che i recettori si abituino allo stimolo.' if it else '<b>5 days</b> of use and <b>2 days off</b>, so that the receptors do not get used to the stimulus.'),
    ], WEEK[L]) + '</section>'
    p2 = '<section>' + h2(3, 'Cosa dicono gli studi' if it else 'What studies show') + '<ul class="plain">' + ''.join('<li>%s</li>' % x for x in ([
        'Riduzione significativa del rischio di cadute (da 3,2 a 0,65 cadute al mese negli studi multicentrici).',
        'Miglioramento della stabilità posturale e della propriocezione grazie alla stimolazione continua.',
        'Cammino migliore: passo più lungo e meno episodi di blocco (freezing).'] if it else [
        'Significant reduction in the risk of falls (from 3.2 to 0.65 falls per month in multicentre studies).',
        'Better postural stability and proprioception thanks to continuous stimulation.',
        'Better walking: longer steps and fewer freezing episodes.'])) + '</ul></section>'
    p2 += '<section>' + warn('Avvertenze' if it else 'Warnings', [ANY[L],
        'Se compaiono <b>nausea, mal di testa o capogiri</b>, togli subito i dispositivi e riduci i tempi di applicazione.' if it else 'If <b>nausea, headache or dizziness</b> appear, remove the devices immediately and reduce the application times.',
        'I dispositivi sono <b>strettamente personali</b>: si adattano alla temperatura del tuo corpo e non devono essere scambiati.' if it else 'The devices are <b>strictly personal</b>: they adapt to your body temperature and must not be shared.']) + '</section>'
    p2 += '<section>' + APPTIP[L] + '</section>'
    short = 'Parkinson · Equistasi®'
    return doc(L, short, [page(L, short, p1, 1, 2, first), page(L, short, p2, 2, 2)])


# ─────────────── SCLEROSI MULTIPLA ───────────────
def sm(L):
    it = L == 'it'
    first = dict(kicker='Sclerosi multipla' if it else 'Multiple sclerosis', title=('Sclerosi multipla: <span>come usare Equistasi®</span>' if it else 'Multiple sclerosis: <span>how to use Equistasi®</span>'), intro=(
        'Due schemi di applicazione nati dallo studio dell’Università Federico II di Napoli. Quale usare lo decide il tuo medico o fisioterapista.' if it else
        'Two application patterns based on the study by the University of Naples Federico II. Your doctor or physiotherapist decides which one to use.'))
    a = steps([('1', 'C7', 'La vertebra più sporgente alla base del collo.' if it else 'The most prominent vertebra at the base of the neck.'),
               ('2', 'L5', 'L’ultima vertebra lombare, in basso nella schiena.' if it else 'The last lumbar vertebra, low in the back.'),
               ('3', 'Polpacci' if it else 'Calves', 'Un dispositivo su ciascun polpaccio (tricipiti surali).' if it else 'One device on each calf (triceps surae).')])
    p1 = '<section>' + h2('A', 'Equilibrio e lunghezza del passo' if it else 'Balance and step length') + where(a,
        fig('fig_sm_eq.jpg', '<b>Vista da dietro.</b> 1 C7, 2 L5, 3 entrambi i polpacci (4 dispositivi).' if it else '<b>Back view.</b> 1 C7, 2 L5, 3 both calves (4 devices).', 'tall sm')) + '</section>'
    b = steps([('1', 'C7', 'Alla base del collo.' if it else 'At the base of the neck.'),
               ('2', 'Medio gluteo' if it else 'Gluteus medius', 'Parte alta del gluteo, dal lato della gamba colpita.' if it else 'On the side of the hip, in the upper buttock, on the side of the affected leg.'),
               ('3', 'Quadricipite' if it else 'Quadriceps', 'Nella parte bassa della coscia della gamba colpita, sopra il ginocchio.' if it else 'In the lower part of the thigh of the affected leg, above the knee.'),
               ('4', 'Tibiale anteriore o polpaccio' if it else 'Tibialis anterior or calf', 'Nella parte bassa della gamba colpita, davanti (tibiale anteriore) o dietro (polpaccio): lo sceglie il fisioterapista in base alla caviglia.' if it else 'In the lower part of the affected leg, at the front (tibialis anterior) or at the back (calf): your physiotherapist chooses based on ankle movement.')])
    p1 += '<section>' + h2('B', 'Spasticità di una gamba' if it else 'Spasticity in one leg') + where(b,
        fig('fig_sm_sp.jpg', '<b>Da dietro e da davanti</b> (esempio gamba destra).' if it else '<b>Back and front views</b> (example: right leg).', 'wide'), '78mm') + '</section>'
    p2 = '<section>' + h2(1, 'Quanto tempo tenerlo' if it else 'How long to keep it on') + timetable([
        ('Settimana 1' if it else 'Week 1', '<b>1,5 ore al giorno</b> per 5 giorni, poi 2 giorni di pausa.' if it else '<b>1.5 hours a day</b> for 5 days, then 2 days off.'),
        ('Settimane 2, 3 e 4' if it else 'Weeks 2, 3 and 4', '<b>2 ore al giorno</b> per 5 giorni, poi 2 giorni di pausa.' if it else '<b>2 hours a day</b> for 5 days, then 2 days off.'),
        ('Se ti gira la testa' if it else 'If you feel dizzy', 'Inizia con <b>15 minuti</b> e riprova più tardi; aumenta i tempi gradualmente nei giorni successivi.' if it else 'Start with <b>15 minutes</b> and try again later; increase the time gradually over the following days.'),
    ], WEEK[L]) + '</section>'
    p2 += '<section>' + h2(2, 'Come valutare i progressi' if it else 'How to assess progress') + '<p style="margin:0">' + (
        'Il tuo fisioterapista può misurare equilibrio e cammino con semplici test (come il Timed Up and Go e il test di Romberg), meglio se ripresi in video: prima di iniziare, dopo la prima ora di applicazione e ai controlli successivi.' if it else
        'Your physiotherapist can measure balance and walking with simple tests (such as the Timed Up and Go and the Romberg test), ideally recorded on video: before starting, after the first hour of application and at later check-ups.') + '</p></section>'
    p2 += '<section>' + h2(3, 'Se non noti miglioramenti' if it else 'If you notice no improvement') + '<ul class="plain">' + ''.join('<li>%s</li>' % x for x in ([
        'Parlane con il medico: alcuni farmaci possono ridurre l’efficacia del dispositivo.',
        'Si può fare una pausa di una o più settimane e poi ripetere il trattamento.',
        'Il fisioterapista può valutare punti di applicazione diversi.'] if it else [
        'Talk to your doctor: some medicines may reduce the effectiveness of the device.',
        'You can take a break of one or more weeks and then repeat the treatment.',
        'Your physiotherapist can consider different application points.'])) + '</ul></section>'
    p2 += '<section>' + FIX[L] + '</section>'
    p2 += '<section>' + warn('Quando togliere i dispositivi' if it else 'When to remove the devices', [ANY[L],
        'Se avverti <b>nausea, mal di testa o capogiri</b>, togli subito i dispositivi e riprova più tardi con tempi più brevi.' if it else 'If you feel <b>nausea, headache or dizziness</b>, remove the devices immediately and try again later for a shorter time.']) + '</section>'
    p2 += '<section>' + APPTIP[L] + '</section>'
    short = 'Sclerosi multipla · Equistasi®' if it else 'Multiple sclerosis · Equistasi®'
    return doc(L, short, [page(L, short, p1, 1, 2, first), page(L, short, p2, 2, 2)])


GEN = {'dolore-cronico': dolore, 'dolore-dermatomeri': derm, 'sport': sport, 'parkinson': parkinson, 'sclerosi-multipla': sm}
if __name__ == '__main__':
    for name, fn in GEN.items():
        for L in ('it', 'en'):
            open('%s-%s.html' % (name, L), 'w').write(fn(L))
            print(name, L)
