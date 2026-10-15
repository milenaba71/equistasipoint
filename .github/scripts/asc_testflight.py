"""Rende disponibile su TestFlight l'ultima build: conformità crittografia + gruppi interni.

Uso: python3 asc_testflight.py <bundle_id>   (KEY_ID, ISSUER_ID, KEY_PATH nell'ambiente)
"""
import sys

from asc_upload import call


def main(bundle_id):
    app = call("GET", "/apps?filter[bundleId]=%s" % bundle_id)["data"][0]
    builds = call("GET", "/builds?filter[app]=%s&sort=-uploadedDate&limit=1&include=preReleaseVersion" % app["id"])
    b = builds["data"][0]
    ver = next((i["attributes"]["version"] for i in builds.get("included", []) if i["type"] == "preReleaseVersions"), "?")
    a = b["attributes"]
    print("Build %s (%s): stato %s, crittografia %s" % (ver, a["version"], a.get("processingState"), a.get("usesNonExemptEncryption")))
    if a.get("usesNonExemptEncryption") is None:
        call("PATCH", "/builds/" + b["id"], {"data": {"type": "builds", "id": b["id"], "attributes": {"usesNonExemptEncryption": False}}})
        print("Conformità crittografia impostata: nessuna crittografia non esente")
    groups = call("GET", "/apps/%s/betaGroups" % app["id"])["data"]
    for g in groups:
        ga = g["attributes"]
        if ga.get("isInternalGroup"):
            if ga.get("hasAccessToAllBuilds"):
                print("Il gruppo interno %s riceve già tutte le build" % ga["name"])
                continue
            if call("POST", "/betaGroups/%s/relationships/builds" % g["id"], {"data": [{"type": "builds", "id": b["id"]}]}, allow_fail=True) is not None:
                print("Build aggiunta al gruppo interno:", ga["name"])
    print("Fatto: apri TestFlight sull'iPhone")


if __name__ == "__main__":
    main(sys.argv[1])
