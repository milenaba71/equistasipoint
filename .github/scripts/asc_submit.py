"""Invia ad App Review la versione già preparata con asc_prepare.py.

Uso: python3 asc_submit.py <bundle_id> <versione>
Variabili: KEY_ID, ISSUER_ID, KEY_PATH
"""
import sys

from asc_upload import call


def main(bundle_id, version):
    app = call("GET", "/apps?filter[bundleId]=%s" % bundle_id)["data"][0]
    ver = call("GET", "/apps/%s/appStoreVersions?filter[platform]=IOS&filter[versionString]=%s" % (app["id"], version))["data"][0]
    state = ver["attributes"].get("appStoreState")
    print("Versione %s: stato %s" % (version, state))
    if state not in ("PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED"):
        print("Niente da inviare in questo stato"); return
    b = call("GET", "/appStoreVersions/%s/build" % ver["id"])["data"]
    if not b:
        print("::error::Nessuna build collegata: avvia prima «App Store: prepara revisione»"); sys.exit(1)
    print("Build collegata: %s (crittografia non esente: %s)" % (b["attributes"]["version"], b["attributes"].get("usesNonExemptEncryption")))

    # riusa un invio ancora aperto, altrimenti ne crea uno
    open_subs = call("GET", "/reviewSubmissions?filter[app]=%s&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW" % app["id"])["data"]
    sub = open_subs[0] if open_subs else call("POST", "/reviewSubmissions", {"data": {"type": "reviewSubmissions",
          "attributes": {"platform": "IOS"}, "relationships": {"app": {"data": {"type": "apps", "id": app["id"]}}}}})["data"]
    items = call("GET", "/reviewSubmissions/%s/items" % sub["id"], allow_fail=True) or {"data": []}
    if not items["data"]:
        call("POST", "/reviewSubmissionItems", {"data": {"type": "reviewSubmissionItems",
             "relationships": {"reviewSubmission": {"data": {"type": "reviewSubmissions", "id": sub["id"]}},
                               "appStoreVersion": {"data": {"type": "appStoreVersions", "id": ver["id"]}}}}})
    print("Versione aggiunta per la revisione")
    call("PATCH", "/reviewSubmissions/" + sub["id"], {"data": {"type": "reviewSubmissions", "id": sub["id"],
         "attributes": {"submitted": True}}})
    print("Inviata ad App Review: Apple risponde di solito entro 24-48 ore")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
