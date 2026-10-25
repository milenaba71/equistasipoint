"""Copia da Airtable (base EQUITUTTO) a Supabase i dispositivi che possono usare l'app.

- Seriali validi: quelli collegati a un kit (Abbinamento Kit → «Abbinamento seriali (testo)»), come la verifica Make.
- Tipologia (SILICON, GEL, SLIM, EQUIX, noleggio prof…): tabella «dispositivi disponibili».
  Slim ed Equix entrano comunque nell'elenco, così l'app può dire che non usano Equistasi Point.
- Prossima calibrazione: tabella calibrazioni, il seriale è scritto nelle NOTE (vale la calibrazione più recente).
Variabili: AIRTABLE_TOKEN (sola lettura), SUPABASE_URL, SUPABASE_SECRET_KEY. Stampa solo conteggi, mai i dati.
"""
import json, os, re, sys, time, urllib.parse, urllib.request, urllib.error

BASE = "appI8mMIC0khEkLqK"
T_KIT, T_DEV, T_TIPO, T_CAL = "tbldfuiVOiGFIq9vv", "tblmeCftgU0TrG0ck", "tbl9Am32xXmH6gubq", "tblI6t11kS44O6UD7"
NO_ACCESS = {"EQUIX", "SLIM", "SLIM MEDINAT"}
KEEP = {"DEMO2026"}  # seriale di prova dei revisori, non viene da Airtable

AT = os.environ["AIRTABLE_TOKEN"].strip()
SB_URL = os.environ["SUPABASE_URL"].rstrip("/")
SB_KEY = os.environ["SUPABASE_SECRET_KEY"].strip()


def norm(s):
    return re.sub(r"[^A-Z0-9-]", "", str(s or "").upper())


def airtable(table, fields):
    out, offset = [], None
    while True:
        q = [("pageSize", "100")] + [("fields[]", f) for f in fields] + ([("offset", offset)] if offset else [])
        req = urllib.request.Request("https://api.airtable.com/v0/%s/%s?%s" % (BASE, table, urllib.parse.urlencode(q)),
                                     headers={"Authorization": "Bearer " + AT})
        for attempt in range(5):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    d = json.load(r)
                break
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 4:
                    time.sleep(30); continue
                print("::error::Airtable %s: HTTP %d" % (table, e.code)); sys.exit(1)
        out += d.get("records", [])
        offset = d.get("offset")
        if not offset:
            return out
        time.sleep(0.25)  # massimo 5 richieste al secondo


def supabase(method, path, body=None, prefer=None):
    h = {"apikey": SB_KEY, "Content-Type": "application/json"}
    if not SB_KEY.startswith("sb_"):
        h["Authorization"] = "Bearer " + SB_KEY  # chiave legacy service_role
    if prefer:
        h["Prefer"] = prefer
    req = urllib.request.Request(SB_URL + "/rest/v1/" + path, method=method, headers=h,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else None
    except urllib.error.HTTPError as e:
        print("::error::Supabase %s %s: HTTP %d %s" % (method, path.split("?")[0], e.code, e.read().decode()[:300])); sys.exit(1)


# 1) seriali collegati ai kit
valid = set()
for r in airtable(T_KIT, ["Abbinamento seriali (testo)"]):
    v = r.get("fields", {}).get("Abbinamento seriali (testo)")
    for part in (v if isinstance(v, list) else [v or ""]):
        for s in str(part).split(","):
            s = norm(s)
            if len(s) >= 5:
                valid.add(s)
print("Seriali collegati ai kit:", len(valid))

# 2) tipologia di ogni seriale
names = {r["id"]: str(r.get("fields", {}).get("Name", "")).strip() for r in airtable(T_TIPO, ["Name"])}
tipi = {}
for r in airtable(T_DEV, ["verifica id", "tipologia"]):
    f = r.get("fields", {})
    s = norm(f.get("verifica id"))
    if len(s) < 5:
        continue
    tipi[s] = [names.get(x, "") for x in f.get("tipologia", []) if names.get(x, "")]
print("Dispositivi con tipologia:", len(tipi))


def tipo_of(lst):
    up = [t.upper() for t in lst]
    for t, u in zip(lst, up):
        if u in NO_ACCESS:
            return t
    for t, u in zip(lst, up):
        if "NOLEGGIO" not in u:
            return t
    return lst[0] if lst else ""


# 3) prossima calibrazione (dalla calibrazione più recente che cita il seriale nelle note)
cal = {}
for r in sorted(airtable(T_CAL, ["NOTE", "data calibrazione", "data prossima calibrazione"]),
                key=lambda r: str(r.get("fields", {}).get("data calibrazione", ""))):
    f = r.get("fields", {})
    nxt = str(f.get("data prossima calibrazione", ""))[:10]
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", nxt):
        continue
    for tok in re.split(r"[^A-Za-z0-9-]+", str(f.get("NOTE", "")).upper()):
        if len(tok) >= 8:
            cal[tok] = nxt  # ordinate per data: resta la più recente
print("Seriali con calibrazione:", len(cal))

# 4) elenco per Supabase
rows = {}
for s in valid | {s for s, l in tipi.items() if tipo_of(l).upper() in NO_ACCESS}:
    l = tipi.get(s, [])
    rows[s] = {"serial": s, "tipo": tipo_of(l), "pro": any("NOLEGGIO PROF" in t.upper() for t in l),
               "cal_next": cal.get(s), "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
print("Dispositivi da copiare:", len(rows), "· senza accesso:", sum(1 for r in rows.values() if r["tipo"].upper() in NO_ACCESS),
      "· noleggio prof:", sum(1 for r in rows.values() if r["pro"]))
if len(rows) < 50:
    print("::error::Troppo pochi dispositivi da Airtable: copia annullata per sicurezza"); sys.exit(1)

lst = list(rows.values())
for i in range(0, len(lst), 500):
    supabase("POST", "devices?on_conflict=serial", lst[i:i + 500], "resolution=merge-duplicates,return=minimal")
print("Copiati su Supabase")

# 5) togli i seriali che non sono più su Airtable (mai più di un quinto in una volta)
have = {r["serial"] for r in supabase("GET", "devices?select=serial", None)}
gone = sorted(have - set(rows) - KEEP)
if gone and len(gone) <= max(20, len(have) // 5):
    for i in range(0, len(gone), 100):
        supabase("DELETE", "devices?serial=in.(%s)" % ",".join('"%s"' % s for s in gone[i:i + 100]), None, "return=minimal")
    print("Tolti", len(gone), "seriali non più presenti su Airtable")
elif gone:
    print("::warning::%d seriali non più su Airtable: troppi per toglierli in automatico, controlla" % len(gone))
