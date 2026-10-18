"""Prepara la versione App Store per la revisione (senza inviarla).

Uso: python3 asc_prepare.py <bundle_id> <versione> <build>
Variabili: KEY_ID, ISSUER_ID, KEY_PATH, REVIEW_NOTES, CONTACT_FIRST, CONTACT_LAST, CONTACT_PHONE, CONTACT_EMAIL
"""
import os, sys

from asc_upload import call


def main(bundle_id, version, build):
    app = call("GET", "/apps?filter[bundleId]=%s" % bundle_id)["data"][0]
    found = call("GET", "/apps/%s/appStoreVersions?filter[platform]=IOS&filter[versionString]=%s" % (app["id"], version))["data"]
    if found:
        ver = found[0]
    else:
        # la nuova versione non esiste ancora su App Store Connect: la crea
        ver = call("POST", "/appStoreVersions", {"data": {"type": "appStoreVersions",
             "attributes": {"platform": "IOS", "versionString": version, "releaseType": "MANUAL"},
             "relationships": {"app": {"data": {"type": "apps", "id": app["id"]}}}}})["data"]
        print("Versione %s creata" % version)
    print("Versione %s: stato %s" % (version, ver["attributes"].get("appStoreState")))

    b = call("GET", "/builds?filter[app]=%s&filter[version]=%s&filter[preReleaseVersion.version]=%s" % (app["id"], build, version))["data"]
    if not b:
        print("::error::Build %s (%s) non trovata" % (version, build)); sys.exit(1)
    b = b[0]
    print("Build %s: stato %s" % (build, b["attributes"].get("processingState")))
    call("PATCH", "/appStoreVersions/%s/relationships/build" % ver["id"], {"data": {"type": "builds", "id": b["id"]}})
    print("Build collegata alla versione")

    call("PATCH", "/appStoreVersions/" + ver["id"], {"data": {"type": "appStoreVersions", "id": ver["id"],
         "attributes": {"releaseType": "MANUAL"}}})
    print("Rilascio: manuale (dopo l'approvazione si pubblica a mano)")

    attrs = {"contactFirstName": os.environ["CONTACT_FIRST"], "contactLastName": os.environ["CONTACT_LAST"],
             "contactPhone": os.environ["CONTACT_PHONE"], "contactEmail": os.environ["CONTACT_EMAIL"],
             "demoAccountRequired": False, "notes": os.environ["REVIEW_NOTES"]}
    rd = call("GET", "/appStoreVersions/%s/appStoreReviewDetail" % ver["id"], allow_fail=True)
    if rd and rd.get("data"):
        call("PATCH", "/appStoreReviewDetails/" + rd["data"]["id"], {"data": {"type": "appStoreReviewDetails",
             "id": rd["data"]["id"], "attributes": attrs}})
    else:
        call("POST", "/appStoreReviewDetails", {"data": {"type": "appStoreReviewDetails", "attributes": attrs,
             "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": ver["id"]}}}}})
    print("Informazioni per la revisione salvate")

    # «Novità di questa versione»: italiano per it, inglese per tutte le altre lingue
    for loc in call("GET", "/appStoreVersions/%s/appStoreVersionLocalizations" % ver["id"])["data"]:
        text = os.environ.get("WHATS_NEW_IT" if loc["attributes"]["locale"].startswith("it") else "WHATS_NEW_EN", "")
        if text:
            call("PATCH", "/appStoreVersionLocalizations/" + loc["id"], {"data": {"type": "appStoreVersionLocalizations",
                 "id": loc["id"], "attributes": {"whatsNew": text}}}, allow_fail=True)
        print("Lingua %s – novità: %s" % (loc["attributes"]["locale"], (text or loc["attributes"].get("whatsNew") or "(vuoto)")[:80]))
    print("Pronta: in App Store Connect tocca «Aggiungi per la revisione» e poi «Invia ad App Review»")


if __name__ == "__main__":
    main(*sys.argv[1:4])
