"""Pubblica sull'App Store la versione approvata da Apple (rilascio manuale).

Uso: python3 asc_release.py <bundle_id> <versione>
Variabili: KEY_ID, ISSUER_ID, KEY_PATH
"""
import sys

from asc_upload import call


def main(bundle_id, version):
    app = call("GET", "/apps?filter[bundleId]=%s" % bundle_id)["data"][0]
    ver = call("GET", "/apps/%s/appStoreVersions?filter[platform]=IOS&filter[versionString]=%s" % (app["id"], version))["data"][0]
    state = ver["attributes"].get("appStoreState")
    print("Versione %s: stato %s" % (version, state))
    if state == "READY_FOR_SALE":
        print("Già pubblicata sull'App Store"); return
    if state != "PENDING_DEVELOPER_RELEASE":
        print("::error::La versione non è ancora approvata e in attesa di rilascio (stato %s)" % state); sys.exit(1)
    call("POST", "/appStoreVersionReleaseRequests", {"data": {"type": "appStoreVersionReleaseRequests",
         "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": ver["id"]}}}}})
    print("Rilascio richiesto: l'aggiornamento arriva sull'App Store entro qualche ora")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
