"""Salva una copia della versione pubblicata su App Store (testi, parole chiave, screenshot originali, build).

Uso: python3 asc_backup.py <bundle_id> <cartella_uscita>
Variabili: KEY_ID, ISSUER_ID, KEY_PATH
Non salva i contatti per la revisione (il repository è pubblico).
"""
import json, os, sys, urllib.request

from asc_upload import call


def get_all(path):
    out, nxt = [], path
    while nxt:
        r = call("GET", nxt)
        out += r.get("data", [])
        nxt = (r.get("links") or {}).get("next")
        if nxt:
            nxt = nxt.split("/v1", 1)[1]
    return out


def save(path, obj):
    with open(path, "w") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def main(bundle_id, out):
    app = call("GET", "/apps?filter[bundleId]=%s" % bundle_id)["data"][0]
    app_id = app["id"]
    versions = get_all("/apps/%s/appStoreVersions?filter[platform]=IOS&limit=50" % app_id)
    live = [v for v in versions if v["attributes"].get("appStoreState") == "READY_FOR_SALE"]
    if not live:
        print("::error::Nessuna versione in vendita"); sys.exit(1)
    ver = live[0]
    vs = ver["attributes"]["versionString"]
    d = os.path.join(out, vs)
    os.makedirs(os.path.join(d, "screenshot"), exist_ok=True)
    print("Versione in vendita:", vs)

    summary = {"app": {"id": app_id, **app["attributes"]},
               "versione": {"id": ver["id"], **ver["attributes"]},
               "tutte_le_versioni": [{"versione": v["attributes"]["versionString"], "stato": v["attributes"].get("appStoreState"),
                                      "creata": v["attributes"].get("createdDate")} for v in versions]}

    b = call("GET", "/appStoreVersions/%s/build" % ver["id"], allow_fail=True)
    if b and b.get("data"):
        summary["build"] = {"id": b["data"]["id"], **b["data"]["attributes"]}
        print("Build:", b["data"]["attributes"].get("version"), b["data"]["attributes"].get("uploadedDate"))

    summary["localizzazioni"] = []
    for loc in get_all("/appStoreVersions/%s/appStoreVersionLocalizations" % ver["id"]):
        la = loc["attributes"]
        summary["localizzazioni"].append(la)
        for ss in get_all("/appStoreVersionLocalizations/%s/appScreenshotSets" % loc["id"]):
            kind = ss["attributes"]["screenshotDisplayType"]
            for i, sc in enumerate(get_all("/appScreenshotSets/%s/appScreenshots" % ss["id"]), 1):
                a = sc["attributes"].get("imageAsset") or {}
                if not a.get("templateUrl"):
                    continue
                url = a["templateUrl"].replace("{w}", str(a["width"])).replace("{h}", str(a["height"])).replace("{f}", "png")
                name = "%s_%s_%02d.png" % (la["locale"], kind, i)
                urllib.request.urlretrieve(url, os.path.join(d, "screenshot", name))
                print("Screenshot:", name)

    infos = get_all("/apps/%s/appInfos" % app_id)
    summary["info_app"] = []
    for inf in infos:
        entry = {"id": inf["id"], **inf["attributes"], "localizzazioni": [l["attributes"] for l in get_all("/appInfos/%s/appInfoLocalizations" % inf["id"])]}
        age = call("GET", "/appInfos/%s/ageRatingDeclaration" % inf["id"], allow_fail=True)
        if age and age.get("data"):
            entry["classificazione_eta"] = age["data"]["attributes"]
        summary["info_app"].append(entry)

    rd = call("GET", "/appStoreVersions/%s/appStoreReviewDetail" % ver["id"], allow_fail=True)
    if rd and rd.get("data"):
        summary["note_revisione"] = rd["data"]["attributes"].get("notes")

    builds = get_all("/builds?filter[app]=%s&limit=200&include=preReleaseVersion" % app_id)
    summary["build_caricate"] = [{"build": x["attributes"].get("version"), "caricata": x["attributes"].get("uploadedDate"),
                                  "stato": x["attributes"].get("processingState"), "scaduta": x["attributes"].get("expired"),
                                  "ios_minimo": x["attributes"].get("minOsVersion")} for x in builds]

    save(os.path.join(d, "app-store-connect.json"), summary)
    with open(os.path.join(d, "LEGGIMI.md"), "w") as f:
        f.write("# Equistasi Point %s – copia della scheda App Store\n\n" % vs)
        f.write("Salvata automaticamente da App Store Connect (azione \"App Store: copia versione pubblicata\").\n\n")
        if "build" in summary:
            f.write("- Build: **%s**, caricata il %s, iOS minimo %s\n" % (summary["build"].get("version"), summary["build"].get("uploadedDate"), summary["build"].get("minOsVersion")))
        for la in summary["localizzazioni"]:
            f.write("\n## %s\n\n" % la["locale"])
            for k in ("description", "keywords", "promotionalText", "whatsNew", "supportUrl", "marketingUrl"):
                if la.get(k):
                    f.write("**%s**\n\n%s\n\n" % (k, la[k]))
    print("Salvato in", d)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
