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

    # questionario dell'età: Apple ha aggiunto domande nuove (es. «socialMedia»). Equistasi Point non ha
    # funzioni social: si risponde «no» solo alle domande nuove ancora vuote elencate qui sotto.
    NEW_ANSWERS = {"socialMedia": False}
    age = call("GET", "/appStoreVersions/%s/ageRatingDeclaration" % ver["id"], allow_fail=True)
    if age and age.get("data"):
        attrs = age["data"]["attributes"]
        empty = sorted(k for k, v in attrs.items() if v is None)
        print("Questionario età: domande senza risposta: %s" % (", ".join(empty) or "nessuna"))
        fix = {k: v for k, v in NEW_ANSWERS.items() if k in attrs and attrs[k] is None}
        if fix:
            call("PATCH", "/ageRatingDeclarations/" + age["data"]["id"], {"data": {"type": "ageRatingDeclarations",
                 "id": age["data"]["id"], "attributes": fix}})
            print("Questionario età: risposto %s" % fix)

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
