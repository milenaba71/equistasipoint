"""Protocollo operativo Equistasi per fisioterapisti e professionisti sanitari (dolore muscoloscheletrico cronico).
Genera pro-dolore-it.html; il PDF si crea con pro_pdf.js (impaginazione continua, intestazione e piè di pagina su ogni pagina)."""

CSS = """
@page { size: A4; }
:root { --ind: #29235C; --yel: #FADC00; --blue: #1D71B8; --grey: #F4F6F8; --txt: #1f2033; --line: #d9d8ea; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Open Sans', 'DejaVu Sans', sans-serif; color: var(--txt); font-size: 10.2pt; line-height: 1.45; padding: 0 15mm;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cover { background: var(--ind); color: #fff; border-radius: 5mm; padding: 8mm 9mm 9mm; margin: 2mm 0 7mm; position: relative; overflow: hidden; }
.cover::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3mm; background: var(--yel); }
.cover .k { color: var(--yel); font-weight: 800; letter-spacing: .08em; text-transform: uppercase; font-size: 8.6pt; }
.cover h1 { margin: 2mm 0 2mm; font-size: 20pt; line-height: 1.15; font-weight: 800; }
.cover h1 span { color: var(--yel); }
.cover .sub { margin: 0 0 5mm; color: #e3e2f3; font-size: 10.6pt; }
.meta { display: grid; grid-template-columns: 1fr; gap: 2.4mm; }
.meta div { background: rgba(255,255,255,.08); border-radius: 2.5mm; padding: 2.4mm 3.5mm; font-size: 9.6pt; color: #ecebf7; }
.meta b { color: var(--yel); }
h2 { font-size: 13.5pt; color: var(--ind); margin: 6mm 0 3mm; display: flex; align-items: center; gap: 3mm; break-after: avoid; }
h2 .n { flex: none; width: 8.5mm; height: 8.5mm; border-radius: 50%; background: var(--yel); color: var(--ind); display: grid; place-items: center; font-size: 11pt; font-weight: 800; }
h3 { font-size: 11.2pt; color: var(--ind); margin: 4.5mm 0 1.6mm; break-after: avoid; }
h4 { font-size: 10.2pt; color: var(--ind); margin: 3mm 0 1mm; break-after: avoid; }
p { margin: 0 0 2.4mm; }
ul { margin: 0 0 3mm; padding-left: 5mm; }
li { margin-bottom: .8mm; }
ul.cols { columns: 2; column-gap: 8mm; }
ul.cols li { break-inside: avoid; }
.lead { font-weight: 700; color: var(--ind); }
.note { background: var(--grey); border-left: 1.4mm solid var(--blue); border-radius: 2.5mm; padding: 3mm 4.5mm; margin: 3mm 0; font-size: 9.6pt; break-inside: avoid; }
.key { background: #fff7cc; border: .5mm solid #e6c800; border-radius: 3mm; padding: 3mm 4.5mm; margin: 3mm 0; break-inside: avoid; }
.key b { color: var(--ind); }
.cats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin: 3mm 0; }
.cat { border: .5mm solid var(--line); border-radius: 3mm; padding: 3mm 3.5mm; break-inside: avoid; }
.cat .b { display: inline-grid; place-items: center; width: 7mm; height: 7mm; border-radius: 50%; background: var(--yel); border: .5mm solid var(--ind); color: var(--ind); font-weight: 800; font-size: 9.5pt; margin-bottom: 1.5mm; }
.cat b { display: block; color: var(--ind); }
.steps { list-style: none; margin: 0 0 3mm; padding: 0; counter-reset: s; }
.steps li { display: grid; grid-template-columns: 7mm 1fr; gap: 2.5mm; margin-bottom: 1.6mm; counter-increment: s; break-inside: avoid; }
.steps li::before { content: counter(s); width: 6.5mm; height: 6.5mm; border-radius: 50%; background: var(--ind); color: var(--yel); font-weight: 800; font-size: 8.6pt; display: grid; place-items: center; }
.phase { border: .5mm solid var(--line); border-radius: 3.5mm; margin: 0 0 3.5mm; overflow: hidden; break-inside: avoid; }
.phase .ph { background: var(--ind); color: #fff; padding: 2.2mm 4mm; font-weight: 800; font-size: 10pt; display: flex; gap: 3mm; align-items: center; }
.phase .ph span { background: var(--yel); color: var(--ind); border-radius: 99px; padding: .3mm 2.6mm; font-size: 8.4pt; }
.phase .pb { padding: 3mm 4.5mm .5mm; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; margin: 2mm 0 3mm; }
.ok, .ko { border-radius: 2.5mm; padding: 2.6mm 3.6mm; font-size: 9.6pt; break-inside: avoid; }
.ok { background: #e7f6ec; border-left: 1.4mm solid #2e9e5b; }
.ko { background: #eaf2fb; border-left: 1.4mm solid var(--blue); }
.ok b, .ko b { display: block; color: var(--ind); margin-bottom: .8mm; }
table { width: 100%; border-collapse: separate; border-spacing: 0; border: .5mm solid var(--ind); border-radius: 3mm; overflow: hidden; margin: 2mm 0 2.5mm; font-size: 9.6pt; break-inside: avoid; }
th { background: var(--ind); color: #fff; text-align: left; padding: 2.2mm 3mm; font-size: 9.2pt; }
td { padding: 2mm 3mm; border-top: .3mm solid var(--line); vertical-align: top; }
tr:nth-child(even) td { background: #f8f8fc; }
td:first-child { font-weight: 700; color: var(--ind); }
.fig { margin: 3mm 0; background: #1e1a46; border-radius: 3.5mm; overflow: hidden; break-inside: avoid; }
.fig img { width: 100%; height: 62mm; object-fit: contain; display: block; }
.fig figcaption { color: #fff; font-size: 8.4pt; padding: 2mm 3.5mm 2.4mm; background: var(--ind); }
.warn { background: #fff7cc; border: .6mm solid #e6c800; border-radius: 3.5mm; padding: 3.5mm 5mm; break-inside: avoid; margin: 2mm 0 3mm; }
.warn h3 { margin: 0 0 2mm; }
.params { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 2mm 0 3mm; }
.params div { border: .5mm solid var(--line); border-radius: 2.5mm; padding: 2.4mm 3.5mm; font-size: 9.6pt; break-inside: avoid; }
.params b { display: block; color: var(--ind); }
.sheet { break-before: page; }
.form { border: .5mm solid var(--ind); border-radius: 3.5mm; padding: 3mm 5mm 1mm; margin-bottom: 3.5mm; break-inside: avoid; }
.form h4 { margin: 0 0 1.5mm; }
.f { display: grid; grid-template-columns: auto 1fr; gap: 2mm; align-items: end; margin-bottom: 2.6mm; font-size: 9.6pt; }
.f span:last-child { border-bottom: .3mm solid #9a99b5; height: 5mm; }
.f.nrs span:last-child { max-width: 30mm; }
.f.nrs::after { content: '/10'; }
.f.nrs { grid-template-columns: auto 30mm auto; }
.fgrid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 6mm; }
.princ { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 2mm 0 3mm; }
.pr { border: .5mm solid var(--line); border-radius: 3mm; padding: 2.2mm 3.5mm; break-inside: avoid; font-size: 9.6pt; }
.pr b { display: flex; gap: 2mm; align-items: center; color: var(--ind); font-size: 9.8pt; margin-bottom: 1mm; }
.pr b i { font-style: normal; flex: none; width: 6.5mm; height: 6.5mm; border-radius: 50%; background: var(--yel); display: grid; place-items: center; font-size: 8.6pt; }
.motto { background: var(--ind); color: var(--yel); font-weight: 800; text-align: center; letter-spacing: .06em; border-radius: 3mm; padding: 3mm 3mm; margin: 2mm 0 3mm; font-size: 11pt; break-inside: avoid; }
.final { border-top: .4mm solid var(--line); margin-top: 3mm; padding-top: 2.5mm; font-size: 8.2pt; line-height: 1.38; color: #555772; break-inside: avoid; }
.final b { color: var(--ind); }
"""


def ul(items, cls=''):
    return '<ul%s>%s</ul>' % (' class="%s"' % cls if cls else '', ''.join('<li>%s</li>' % i for i in items))


def ol(items):
    return '<ol class="steps">%s</ol>' % ''.join('<li><span>%s</span></li>' % i for i in items)


def h2(n, t):
    return '<h2><span class="n">%s</span>%s</h2>' % (n, t)


def phase(n, t, body):
    return '<div class="phase"><div class="ph"><span>FASE %s</span>%s</div><div class="pb">%s</div></div>' % (n, t, body)


def field(label, nrs=False):
    if nrs:
        return '<div class="f nrs"><span>%s</span><span></span></div>' % label
    return '<div class="f"><span>%s</span><span></span></div>' % label


def build():
    h = []
    h.append('<div class="cover"><div class="k">Guida tecnica per fisioterapisti e professionisti sanitari</div>'
             '<h1>Protocollo operativo di applicazione nel <span>dolore muscoloscheletrico cronico</span></h1>'
             '<p class="sub">Equistasi® · valutazione, selezione dei punti e verifica progressiva della risposta individuale</p>'
             '<div class="meta">'
             '<div><b>Destinatari:</b> fisioterapisti e professionisti sanitari qualificati.</div>'
             '<div><b>Ambito di applicazione:</b> valutazione e trattamento riabilitativo del dolore muscoloscheletrico cronico mediante l’utilizzo del dispositivo medico Equistasi®.</div>'
             '<div><b>Obiettivo:</b> individuare i punti di applicazione più appropriati attraverso una valutazione anatomica, neurologica, metamerica, muscolare e funzionale, verificando progressivamente la risposta individuale del paziente.</div>'
             '</div></div>')

    # 1
    h.append(h2(1, 'Razionale neurofisiologico'))
    h.append('<p>Equistasi® è un dispositivo medico non invasivo, basato su una tecnologia termosensibile che genera stimolazioni meccaniche focali senza alimentazione elettrica esterna.</p>'
             '<p>Il razionale neurofisiologico del dispositivo si basa sull’interazione dello stimolo meccanico con il sistema somatosensoriale, con particolare interesse per i processi di elaborazione delle informazioni propriocettive e di regolazione del controllo motorio.</p>'
             '<p>Nel dolore muscoloscheletrico cronico possono coesistere alterazioni di diversi sistemi funzionali:</p>')
    h.append(ul(['Sensibilità somatica.', 'Percezione del dolore.', 'Controllo motorio.', 'Reclutamento muscolare.',
                 'Coordinazione neuromuscolare.', 'Propriocezione.', 'Organizzazione posturale.', 'Qualità del movimento.'], 'cols'))
    h.append('<p>Il dolore percepito in una determinata regione anatomica non coincide necessariamente con la sede della struttura responsabile della sintomatologia. '
             'La valutazione del fisioterapista deve pertanto considerare sia la regione dolorosa sia le possibili correlazioni neurologiche, muscolari e biomeccaniche.</p>'
             '<p>L’applicazione di Equistasi® può essere orientata verso tre categorie di punti:</p>')
    h.append('<div class="cats">'
             '<div class="cat"><span class="b">1</span><b>Punto metamerico o paravertebrale correlato</b></div>'
             '<div class="cat"><span class="b">2</span><b>Punto doloroso principale</b></div>'
             '<div class="cat"><span class="b">3</span><b>Punto muscolare o trigger point</b></div></div>')
    h.append('<figure class="fig"><img src="fig_knee_meta.jpg" alt=""><figcaption><b>Esempio orientativo: dolore al ginocchio.</b> '
             'Punto doloroso (1), punti muscolari del quadricipite (2, 3) e punto paravertebrale nella regione L3-L4 (4, vista posteriore). '
             'I numeri della figura non indicano l’ordine di applicazione.</figcaption></figure>')
    h.append('<div class="note">Questi criteri costituiscono un modello di ragionamento clinico per la selezione dei siti di applicazione. '
             'Non rappresentano una dimostrazione che uno specifico punto sia responsabile del dolore o che la sua stimolazione produca necessariamente un beneficio.</div>')
    h.append('<div class="key"><b>Principio del protocollo:</b> individuare il punto clinicamente più significativo, applicare un dispositivo alla volta e verificare la risposta prima di procedere con ulteriori applicazioni.</div>')

    # 2
    h.append(h2(2, 'Valutazione clinica preliminare'))
    h.append('<p>Prima di applicare Equistasi®, il fisioterapista effettua un esame clinico e funzionale del paziente.</p>')
    h.append('<h3>2.1 Anamnesi</h3><p>Raccogliere le seguenti informazioni:</p>')
    h.append(ul(['Localizzazione del dolore.', 'Durata e andamento della sintomatologia.', 'Intensità del dolore mediante scala NRS da 0 a 10.',
                 'Eventuale irradiazione o distribuzione del dolore.', 'Presenza di parestesie o alterazioni della sensibilità.',
                 'Movimenti che provocano o aumentano il dolore.', 'Posture che aggravano o alleviano i sintomi.', 'Limitazioni nelle attività quotidiane.',
                 'Diagnosi cliniche e precedenti trattamenti.', 'Eventuali condizioni neurologiche o muscoloscheletriche associate.'], 'cols'))
    h.append('<p>Verificare le controindicazioni e le precauzioni riportate nelle istruzioni d’uso ufficiali di Equistasi®.</p>')
    h.append('<div class="warn"><h3>⚠ Segnali di allarme</h3>In presenza di sintomi neurologici progressivi, dolore non spiegato, sospetta infezione, trauma significativo o altri segnali di allarme, '
             'richiedere un’appropriata valutazione medica prima di procedere.</div>')
    h.append('<h3>2.2 Valutazione funzionale</h3><p>Eseguire un esame del distretto interessato, considerando:</p>')
    h.append(ul(['Mobilità articolare attiva e passiva.', 'Dolore durante il movimento.', 'Forza muscolare.', 'Controllo motorio.',
                 'Eventuali compensi posturali.', 'Qualità e fluidità del movimento.', 'Limitazioni funzionali.'], 'cols'))
    h.append('<p>Selezionare uno o più test riproducibili da utilizzare prima e dopo l’applicazione. '
             'È preferibile scegliere un movimento che provochi un sintomo misurabile, senza esporre il paziente a un peggioramento significativo.</p>')

    # 3
    h.append(h2(3, 'Individuazione dei punti di applicazione'))
    h.append('<p>La selezione dei punti deve derivare dall’integrazione di tre livelli di valutazione.</p>')
    h.append('<h3>3.1 Primo livello – Valutazione metamerica e vertebrale</h3>'
             '<p>Il fisioterapista identifica i segmenti spinali potenzialmente correlati alla regione dolorosa. '
             'La valutazione si basa sulla conoscenza dei dermatomeri, dei miotomi, dell’innervazione periferica e dei rapporti tra strutture nervose e muscolari.</p>'
             '<h4>Procedura operativa</h4>')
    h.append(ol(['Individuare la regione in cui il paziente riferisce dolore.', 'Analizzare l’eventuale distribuzione del sintomo.',
                 'Identificare i nervi periferici e le radici spinali potenzialmente coinvolti.', 'Individuare la corrispondente regione vertebrale.',
                 'Eseguire una palpazione delicata dei tessuti paravertebrali.',
                 'Valutare la presenza di dolorabilità, ipersensibilità o alterazioni della consistenza muscolare.']))
    h.append('<p>Se viene individuato un punto paravertebrale sensibile e clinicamente coerente con il quadro del paziente, questo può essere selezionato come primo sito di applicazione.</p>'
             '<div class="note">La dolorabilità alla palpazione non costituisce, da sola, prova di una disfunzione vertebrale o radicolare.</div>')
    h.append('<h3>3.2 Secondo livello – Valutazione del punto doloroso</h3>'
             '<p>Il fisioterapista identifica il punto in cui il paziente avverte maggiormente il dolore. Attraverso la palpazione e i test funzionali, valuta:</p>')
    h.append(ul(['Intensità della dolorabilità.', 'Localizzazione precisa.', 'Eventuale irradiazione.', 'Relazione con il movimento.',
                 'Presenza di strutture tendinee, muscolari o articolari potenzialmente coinvolte.'], 'cols'))
    h.append('<p>Il punto doloroso può essere considerato come sito alternativo o aggiuntivo di applicazione, nel rispetto delle istruzioni d’uso.</p>')
    h.append('<h3>3.3 Terzo livello – Valutazione muscolare e trigger point</h3>'
             '<p>Il fisioterapista individua i muscoli potenzialmente coinvolti nella sintomatologia. Per ciascun muscolo considera:</p>')
    h.append(ul(['Origine anatomica.', 'Inserzione tendinea.', 'Innervazione periferica.', 'Radici spinali di riferimento.',
                 'Funzione biomeccanica.', 'Eventuali compensi.', 'Aree di ipersensibilità.', 'Possibili pattern di dolore riferito.'], 'cols'))
    h.append('<p>La palpazione può evidenziare aree muscolari particolarmente sensibili o compatibili con trigger point miofasciali. '
             'Questi reperti possono orientare la selezione di ulteriori punti di applicazione, ma devono essere interpretati insieme all’esame funzionale.</p>'
             '<div class="note">Nell’app <b>Equistasi Point</b> (app.equistasi.com) sono disponibili tavole anatomiche orientative dei trigger point e dei metameri per ogni regione.</div>')

    # 4
    h.append(h2(4, 'Procedura di applicazione progressiva'))
    h.append(phase(1, 'Valutazione iniziale', '<p>Prima di applicare il dispositivo, registrare:</p>' + ul([
        'Dolore NRS da 0 a 10.', 'Movimento che riproduce il dolore.', 'Eventuale limitazione articolare.', 'Qualità del movimento.',
        'Eventuali compensi.', 'Test funzionale selezionato.'], 'cols')))
    h.append(phase(2, 'Applicazione del primo dispositivo',
                   '<p>Individuare il punto ritenuto clinicamente più significativo. Quando la valutazione metamerica identifica un punto paravertebrale plausibilmente correlato alla sintomatologia e sensibile alla palpazione, è possibile iniziare da questo punto.</p>'
                   '<p><b>Applicare un solo dispositivo Equistasi®.</b> La cute deve essere pulita, asciutta e integra. Il fissaggio deve rispettare le istruzioni d’uso del modello utilizzato.</p>'))
    h.append(phase(3, 'Prima rivalutazione',
                   '<p>Dopo circa <b>10 minuti</b> dall’applicazione, ripetere il test funzionale iniziale. Verificare:</p>' + ul([
                       'Eventuale riduzione del dolore.', 'Miglioramento dell’ampiezza del movimento.', 'Maggiore fluidità motoria.',
                       'Riduzione dei compensi.', 'Eventuale miglioramento della funzione.'], 'cols') +
                   '<div class="two"><div class="ok"><b>Se il paziente percepisce un miglioramento</b>Se il beneficio è clinicamente significativo e il dispositivo è ben tollerato, non è necessario aggiungere automaticamente altri dispositivi. '
                   'Registrare la risposta e mantenere il posizionamento secondo il programma individuale.</div>'
                   '<div class="ko"><b>Se il miglioramento è assente o insufficiente</b>Rivalutare il punto selezionato e considerare un secondo sito di applicazione. '
                   'L’assenza di una risposta immediata non dimostra necessariamente l’inefficacia del dispositivo.</div></div>'
                   '<div class="note" style="margin-top:0">La rivalutazione dopo 10 minuti rappresenta un controllo clinico osservativo e non un test validato per certificare la correttezza del punto.</div>'))
    h.append(phase(4, 'Eventuale secondo dispositivo',
                   '<p>Selezionare un punto doloroso o muscolare coerente con la valutazione clinica. Applicare il secondo dispositivo, se previsto dalle istruzioni d’uso. '
                   'Ripetere il test funzionale e registrare le variazioni.</p>'))
    h.append(phase(5, 'Eventuale terzo dispositivo',
                   '<p>Se la risposta rimane insufficiente e sussiste una giustificazione clinica, valutare un ulteriore punto muscolare o funzionale. Applicare il terzo dispositivo e ripetere la valutazione.</p>'
                   '<p><b>Non è obbligatorio utilizzare tutti e tre i dispositivi.</b> Il numero e la posizione devono essere personalizzati in base al quadro clinico, alla risposta osservata e alla tollerabilità.</p>'))

    # 5
    h.append(h2(5, 'Tabella anatomica di orientamento'))
    rows = [('Cervicale', 'C2–C8', 'Trapezio, elevatore della scapola, suboccipitali'),
            ('Spalla', 'C5–C8', 'Deltoide, sovraspinato, infraspinato'),
            ('Gomito', 'C5–T1', 'Bicipite, tricipite, flessori ed estensori del polso'),
            ('Lombare', 'T12–L5, rami dorsali', 'Multifidi, erettori spinali, quadrato dei lombi'),
            ('Inguine e pubalgia', 'T12–L4', 'Adduttori, ileopsoas, retto addominale'),
            ('Anca', 'L2–S2', 'Glutei, ileopsoas, rotatori profondi'),
            ('Ginocchio', 'L2–S2', 'Quadricipite, ischiocrurali, gastrocnemio'),
            ('Caviglia e piede', 'L4–S2', 'Tibiale anteriore, fibulari, gastrocnemio, soleo')]
    h.append('<table><tr><th>Regione dolorosa</th><th>Riferimenti neurologici orientativi</th><th>Muscoli da valutare</th></tr>' +
             ''.join('<tr><td>%s</td><td>%s</td><td>%s</td></tr>' % r for r in rows) + '</table>')
    h.append('<div class="note">I riferimenti indicati rappresentano intervalli anatomici orientativi, non una corrispondenza diretta e obbligatoria tra regione dolorosa e punto vertebrale da trattare.</div>')

    # 6
    h.append(h2(6, 'Durata e modalità di utilizzo'))
    h.append('<p class="lead">Protocollo giornaliero Equistasi® – Dolore muscoloscheletrico cronico</p>'
             '<p>Il programma applicativo proposto prevede due sessioni giornaliere separate da un intervallo senza dispositivi.</p>')
    h.append('<table style="max-width:120mm"><tr><th>Sessione</th><th>Durata</th></tr>'
             '<tr><td>Mattina</td><td>2 ore</td></tr><tr><td>Pomeriggio</td><td>2 ore</td></tr><tr><td>Totale giornaliero</td><td>4 ore</td></tr>'
             '<tr><td>Frequenza</td><td>5 giorni alla settimana</td></tr><tr><td>Pausa</td><td>2 giorni alla settimana</td></tr></table>')
    h.append('<h3>6.1 Prima applicazione</h3><p>Durante la prima seduta il fisioterapista:</p>')
    h.append(ol(['Effettua la valutazione clinica.', 'Individua i punti di applicazione.', 'Applica progressivamente i dispositivi.',
                 'Rivaluta la risposta.', 'Registra i risultati.', 'Istruisce il paziente sulla corretta applicazione e rimozione.']))
    h.append('<div class="two"><div class="pr"><b>6.2 Sessione mattutina</b>Applicare Equistasi® sui punti individuati dal fisioterapista. Mantenere i dispositivi per un massimo di 2 ore consecutive, salvo necessità di rimozione anticipata. '
             'Al termine della sessione, rimuovere tutti i dispositivi.</div>'
             '<div class="pr"><b>6.3 Sessione pomeridiana</b>Ripetere l’applicazione sugli stessi punti, salvo diversa indicazione del fisioterapista. Mantenere i dispositivi per un massimo di 2 ore consecutive. '
             'Al termine della sessione, rimuovere tutti i dispositivi.</div></div>')
    h.append('<h3>6.4 Pausa settimanale</h3><p>Prevedere due giorni di sospensione dell’utilizzo ogni settimana. Durante il periodo di pausa osservare l’andamento del dolore, della mobilità e della funzionalità.</p>')
    h.append('<h3>6.5 Monitoraggio</h3><p>Il fisioterapista verifica periodicamente:</p>')
    h.append(ul(['Intensità e frequenza del dolore.', 'Durata dell’eventuale beneficio.', 'Miglioramento funzionale.', 'Tollerabilità.',
                 'Necessità di modificare i punti di applicazione.'], 'cols'))
    h.append('<div class="note">Il programma di 2 ore al mattino e 2 ore al pomeriggio, per 5 giorni settimanali, costituisce lo schema operativo qui proposto e deve essere verificato rispetto alle istruzioni d’uso ufficiali e alla destinazione d’uso del dispositivo.</div>')

    # 7
    h.append(h2(7, 'Criteri di interruzione'))
    h.append('<p>Durante ogni sessione il paziente deve monitorare l’andamento dei sintomi.</p>')
    h.append('<div class="warn"><h3>⚠ Rimuovere immediatamente tutti i dispositivi in caso di:</h3>' + ul([
        'Aumento del dolore.', 'Ricomparsa del dolore durante l’applicazione, soprattutto se progressiva o intensa.', 'Nausea.', 'Mal di testa.', 'Capogiri.',
        'Irritazione cutanea.', 'Comparsa di nuovi disturbi.', 'Sensazione generale di malessere.'], 'cols') + '</div>')
    h.append('<p>Non attendere il completamento delle due ore se compaiono sintomi che richiedono l’interruzione. '
             'La comparsa di dolore crescente o di altri disturbi non deve essere interpretata come una normale fase di adattamento.</p>'
             '<p>Se i sintomi persistono o peggiorano, sospendere l’utilizzo e richiedere una valutazione sanitaria appropriata.</p>')

    # 8
    h.append(h2(8, 'Rivalutazione clinica'))
    h.append('<p>Il fisioterapista rivaluta periodicamente il paziente utilizzando gli stessi parametri raccolti durante la valutazione iniziale.</p>')
    h.append('<div class="params">' + ''.join('<div><b>%s</b>%s</div>' % p for p in [
        ('Dolore', 'Scala NRS 0–10.'), ('Mobilità', 'Valutazione dell’ampiezza articolare e della libertà di movimento.'),
        ('Funzione', 'Esecuzione del movimento inizialmente doloroso o limitato.'), ('Controllo motorio', 'Valutazione della qualità del movimento e degli eventuali compensi.'),
        ('Durata del beneficio', 'Tempo durante il quale il paziente riferisce un miglioramento della sintomatologia o della funzione.'),
        ('Tollerabilità', 'Eventuale presenza di fastidi o effetti indesiderati.')]) + '</div>')
    h.append('<p>La valutazione non deve basarsi esclusivamente sulla percezione soggettiva immediata, ma considerare anche l’evoluzione funzionale nel tempo.</p>')

    # 9 scheda
    h.append('<div class="sheet">' + h2(9, 'Scheda di registrazione del trattamento'))
    h.append('<div class="form"><div class="fgrid">' + field('Paziente:') + field('Data:') + '</div>' + field('Diagnosi o quadro clinico:') +
             '<div class="fgrid">' + field('Regione dolorosa:') + field('Durata della sintomatologia:') + '</div>' +
             '<div class="fgrid">' + field('Dolore iniziale NRS:', True) + field('Test funzionale iniziale:') + '</div></div>')
    for t, r in (('Primo dispositivo', 'Risposta dopo 10 minuti:'), ('Secondo dispositivo, se necessario', 'Risposta osservata:'), ('Terzo dispositivo, se necessario', 'Risposta osservata:')):
        h.append('<div class="form"><h4>%s</h4>' % t + field('Punto anatomico:') + '<div class="fgrid">' + field(r) + field('Dolore NRS:', True) + '</div></div>')
    h.append('<div class="form"><h4>Valutazione finale</h4><div class="fgrid">' + field('Dolore NRS:', True) + field('Mobilità:') +
             field('Qualità del movimento:') + field('Miglioramento funzionale:') + field('Numero di dispositivi utilizzati:') + field('Durata dell’applicazione:') + '</div>' +
             field('Eventuali effetti indesiderati:') + field('Indicazioni per il controllo successivo:') + '</div></div>')

    # 10
    h.append('<div style="break-before: page"></div>' + h2(10, 'Principi operativi fondamentali'))
    pr = [('Valutare prima di applicare', 'La scelta dei punti deve derivare da un esame clinico, neurologico e funzionale.'),
          ('Considerare la correlazione metamerica', 'Il segmento vertebrale potenzialmente correlato alla sintomatologia rappresenta uno dei possibili punti di partenza della valutazione.'),
          ('Applicare un dispositivo alla volta', 'L’applicazione progressiva permette di osservare la risposta clinica prima di aggiungere ulteriori punti.'),
          ('Verificare il beneficio', 'Ripetere gli stessi test prima e dopo ogni applicazione.'),
          ('Non utilizzare necessariamente tre dispositivi', 'Il numero di dispositivi deve essere determinato dalla valutazione individuale e dalla risposta osservata.'),
          ('Rispettare i tempi di utilizzo', 'Il protocollo proposto prevede 2 ore al mattino e 2 ore al pomeriggio, con 2 giorni di pausa settimanale.'),
          ('Interrompere in caso di fastidio', 'Qualsiasi peggioramento clinicamente rilevante richiede la rimozione dei dispositivi e una rivalutazione.'),
          ('Documentare la risposta', 'Registrare le variazioni del dolore, della mobilità e della funzione per valutare l’evoluzione del paziente.')]
    h.append('<div class="princ">' + ''.join('<div class="pr"><b><i>%d</i>%s</b>%s</div>' % (i + 1, t, d) for i, (t, d) in enumerate(pr)) + '</div>')

    # 11
    h.append(h2(11, 'Conclusioni'))
    h.append('<p>Il protocollo di applicazione di Equistasi® nel dolore muscoloscheletrico cronico propone un approccio riabilitativo basato sulla valutazione individuale, sull’analisi delle correlazioni neuromuscolari e sulla verifica progressiva della risposta clinica.</p>'
             '<p>Il fisioterapista non deve limitarsi a individuare la sede del dolore, ma considerare anche i segmenti spinali potenzialmente correlati, l’innervazione periferica, le strutture muscolari e le alterazioni funzionali.</p>'
             '<p>L’applicazione progressiva consente di osservare la risposta a ciascun posizionamento e di evitare l’utilizzo automatico di ulteriori dispositivi quando non risultano necessari.</p>'
             '<p>Il principio fondamentale del metodo applicativo Equistasi® è:</p>'
             '<div class="motto">VALUTARE – INDIVIDUARE – APPLICARE – VERIFICARE – PERSONALIZZARE</div>'
             '<p>Il trattamento deve essere adattato alla risposta individuale del paziente, mantenendo come riferimenti la sicurezza, la tollerabilità e il miglioramento della funzione.</p>')
    h.append('<div class="final"><b>Equistasi® · Protocollo operativo per fisioterapisti – Dolore muscoloscheletrico cronico.</b><br>'
             'Documento tecnico proposto per uso formativo professionale. Prima della diffusione come protocollo ufficiale, verificare la coerenza con le istruzioni d’uso, '
             'la destinazione d’uso autorizzata e le evidenze cliniche disponibili. La sequenza metamerica, la selezione dei trigger point e lo schema temporale descritto '
             'non devono essere presentati come universalmente validati in assenza di specifiche evidenze. '
             '<b>Equistasi S.r.l.</b> · www.equistasi.com · info@equistasi.com</div>')

    return ('<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Equistasi® – Protocollo operativo per professionisti sanitari</title>'
            '<link rel="stylesheet" href="fonts.css"><style>%s</style></head><body>%s</body></html>') % (CSS, ''.join(h))


if __name__ == '__main__':
    open('pro-dolore-it.html', 'w').write(build())
    print('pro-dolore-it.html')
