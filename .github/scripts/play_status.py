"""Stampa i canali di Google Play e le loro versioni. Apre una modifica temporanea e la scarta: non cambia nulla."""
import json, os, requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

PKG = 'com.equistasi.triggerpoint'
API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG
cred = service_account.Credentials.from_service_account_info(
    json.loads(os.environ['PLAY_JSON']), scopes=['https://www.googleapis.com/auth/androidpublisher'])
cred.refresh(Request())
H = {'Authorization': 'Bearer ' + cred.token}

edit = requests.post(API + '/edits', headers=H).json()['id']
try:
    tracks = requests.get(API + '/edits/' + edit + '/tracks', headers=H).json().get('tracks', [])
    for t in tracks:
        print('== canale', t['track'])
        for r in t.get('releases', []):
            print('   versione', r.get('name'), '| stato', r.get('status'), '| codici', r.get('versionCodes'),
                  '| quota', r.get('userFraction', '-'), '| paesi', len(r.get('countryTargeting', {}).get('countries', [])) or 'tutti')
    det = requests.get(API + '/edits/' + edit + '/details', headers=H).json()
    print('== lingua predefinita', det.get('defaultLanguage'))
finally:
    requests.delete(API + '/edits/' + edit, headers=H)
