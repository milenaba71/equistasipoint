"""Prepara la versione App Store e ne sostituisce gli screenshot.

Uso: python3 asc_screenshots.py <bundle_id> <versione> <cartella con iphone/ e ipad/> [testo novità]
(KEY_ID, ISSUER_ID, KEY_PATH nell'ambiente). Tocca solo la versione indicata, non quella già in vendita.
"""
import glob, hashlib, os, sys, time, urllib.request

from asc_upload import call

SETS = {"iphone": ["APP_IPHONE_69", "APP_IPHONE_67"], "ipad": ["APP_IPAD_PRO_3GEN_129"]}


def upload_shot(set_id, path):
    data = open(path, "rb").read()
    s = call("POST", "/appScreenshots", {"data": {"type": "appScreenshots",
             "attributes": {"fileName": os.path.basename(path), "fileSize": len(data)},
             "relationships": {"appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": set_id}}}}})["data"]
    for op in s["attributes"]["uploadOperations"]:
        req = urllib.request.Request(op["url"], data=data[op["offset"]:op["offset"] + op["length"]], method=op["method"],
                                     headers={h["name"]: h["value"] for h in op.get("requestHeaders") or []})
        urllib.request.urlopen(req).read()
    call("PATCH", "/appScreenshots/" + s["id"], {"data": {"type": "appScreenshots", "id": s["id"],
         "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(data).hexdigest()}}})
    print("  caricato", os.path.basename(path))


def main(bundle_id, version, folder, whats_new=""):
    app = call("GET", "/apps?filter[bundleId]=%s" % bundle_id)["data"][0]
    vers = call("GET", "/apps/%s/appStoreVersions?filter[platform]=IOS&filter[versionString]=%s" % (app["id"], version))["data"]
    if vers:
        ver = vers[0]
    else:
        ver = call("POST", "/appStoreVersions", {"data": {"type": "appStoreVersions",
                   "attributes": {"platform": "IOS", "versionString": version},
                   "relationships": {"app": {"data": {"type": "apps", "id": app["id"]}}}}})["data"]
        print("Creata la versione", version)
    print("Versione %s: stato %s" % (version, ver["attributes"].get("appStoreState")))

    for loc in call("GET", "/appStoreVersions/%s/appStoreVersionLocalizations" % ver["id"])["data"]:
        print("Lingua", loc["attributes"]["locale"])
        if whats_new:
            call("PATCH", "/appStoreVersionLocalizations/" + loc["id"], {"data": {"type": "appStoreVersionLocalizations",
                 "id": loc["id"], "attributes": {"whatsNew": whats_new}}}, allow_fail=True)
        existing = call("GET", "/appStoreVersionLocalizations/%s/appScreenshotSets?include=appScreenshots" % loc["id"])
        sets = {s["attributes"]["screenshotDisplayType"]: s for s in existing["data"]}
        for device, types in SETS.items():
            files = sorted(glob.glob(os.path.join(folder, device, "*.png")))
            if not files:
                continue
            # Svuota tutti i set di questo dispositivo, poi carica nel primo tipo accettato
            prefix = "APP_IPHONE" if device == "iphone" else "APP_IPAD"
            for t, s in sets.items():
                if t.startswith(prefix):
                    for r in (s.get("relationships", {}).get("appScreenshots", {}).get("data") or []):
                        call("DELETE", "/appScreenshots/" + r["id"], allow_fail=True)
                    print("  svuotato", t)
            for t in types:
                set_id = sets[t]["id"] if t in sets else (call("POST", "/appScreenshotSets", {"data": {"type": "appScreenshotSets",
                         "attributes": {"screenshotDisplayType": t},
                         "relationships": {"appStoreVersionLocalization": {"data": {"type": "appStoreVersionLocalizations", "id": loc["id"]}}}}},
                         allow_fail=True) or {}).get("data", {}).get("id")
                if not set_id:
                    continue
                print(" ", t)
                for f in files:
                    upload_shot(set_id, f)
                break
    time.sleep(10)
    print("Screenshot aggiornati per la versione", version)


if __name__ == "__main__":
    main(*sys.argv[1:5])
