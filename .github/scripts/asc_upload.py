"""Carica un file .ipa su App Store Connect con la Build Upload API (REST).

Usa la stessa chiave API dei secrets: KEY_ID, ISSUER_ID, KEY_PATH.
Uso: python3 asc_upload.py <file.ipa> <bundle_id> <versione> <build>
"""
import hashlib, json, os, sys, time, urllib.error, urllib.request

import jwt

API = "https://api.appstoreconnect.apple.com/v1"


def token():
    now = int(time.time())
    return jwt.encode({"iss": os.environ["ISSUER_ID"], "iat": now, "exp": now + 1100, "aud": "appstoreconnect-v1"},
                      open(os.environ["KEY_PATH"]).read(), algorithm="ES256",
                      headers={"kid": os.environ["KEY_ID"], "typ": "JWT"})


def call(method, path, body=None, allow_fail=False):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:2000]
        if allow_fail:
            print("%s %s -> HTTP %d: %s" % (method, path, e.code, msg))
            return None
        print("::error::%s %s -> HTTP %d: %s" % (method, path, e.code, msg))
        sys.exit(1)


def main(ipa, bundle_id, version, build):
    apps = call("GET", "/apps?filter[bundleId]=%s&fields[apps]=bundleId,name" % bundle_id)["data"]
    if not apps:
        print("::error::Nessuna app con bundle ID %s" % bundle_id); sys.exit(1)
    app_id = apps[0]["id"]
    print("App:", apps[0]["attributes"].get("name"), app_id)

    upload = call("POST", "/buildUploads", {"data": {
        "type": "buildUploads",
        "attributes": {"cfBundleShortVersionString": version, "cfBundleVersion": build, "platform": "IOS"},
        "relationships": {"app": {"data": {"type": "apps", "id": app_id}}}}})["data"]
    print("Build upload:", upload["id"])

    data = open(ipa, "rb").read()
    f = call("POST", "/buildUploadFiles", {"data": {
        "type": "buildUploadFiles",
        "attributes": {"assetType": "ASSET", "fileName": os.path.basename(ipa), "fileSize": len(data), "uti": "com.apple.ipa"},
        "relationships": {"buildUpload": {"data": {"type": "buildUploads", "id": upload["id"]}}}}})["data"]

    for op in f["attributes"].get("uploadOperations") or []:
        part = data[op["offset"]:op["offset"] + op["length"]]
        headers = {h["name"]: h["value"] for h in op.get("requestHeaders") or []}
        req = urllib.request.Request(op["url"], data=part, method=op.get("method", "PUT"), headers=headers)
        with urllib.request.urlopen(req) as r:
            print("Parte caricata", op["offset"], op["length"], "HTTP", r.status)

    call("PATCH", "/buildUploadFiles/" + f["id"], {"data": {
        "type": "buildUploadFiles", "id": f["id"],
        "attributes": {"uploaded": True,
                       "sourceFileChecksums": {"file": {"hash": hashlib.md5(data).hexdigest(), "algorithm": "MD5"}}}}})
    print("File consegnato, attendo l'elaborazione di Apple…")

    for _ in range(40):
        time.sleep(15)
        st = call("GET", "/buildUploads/" + upload["id"])["data"]["attributes"]
        state = st.get("state")
        print("Stato:", json.dumps(state))
        if isinstance(state, dict):
            if state.get("errors"):
                print("::error::Apple ha rifiutato la build: %s" % json.dumps(state["errors"])); sys.exit(1)
            if state.get("state") in ("COMPLETE", "PROCESSING_COMPLETE"):
                break
        elif state in ("COMPLETE", "FAILED"):
            if state == "FAILED":
                sys.exit(1)
            break
    print("Build %s (%s) caricata su App Store Connect" % (version, build))


if __name__ == "__main__":
    main(*sys.argv[1:5])
