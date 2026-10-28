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

# Cosa vede il pubblico sul Play Store: le app trovate cercando «equistasi» e la scheda di Equistasi Point
import re
UA = {'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36', 'Accept-Language': 'it-IT'}
s = requests.get('https://play.google.com/store/search?q=equistasi&c=apps&hl=it&gl=IT', headers=UA).text
print('== app sul Play Store per «equistasi»:', sorted(set(re.findall(r'details\?id=([A-Za-z0-9_.]+)', s))))
for pkg in sorted(set(re.findall(r'details\?id=([A-Za-z0-9_.]+)', s))) + [PKG]:
    r = requests.get('https://play.google.com/store/apps/details?id=' + pkg + '&hl=it&gl=IT', headers=UA)
    t = re.search(r'<title[^>]*>([^<]*)', r.text)
    dev = re.search(r'/store/apps/dev(?:eloper)?\?id=([^"&]+)', r.text)
    print('  ', pkg, '| http', r.status_code, '|', t.group(1) if t else '-', '| sviluppatore', dev.group(1) if dev else '-')
