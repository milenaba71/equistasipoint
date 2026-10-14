"""Converte X, zone e aree toccabili dal vecchio disegno alle nuove tavole. Output: converted.json"""
import json, re, subprocess
import remap

S = remap.S
data = json.loads(subprocess.check_output(['node', '-e', '''
global.window={}; require("/home/user/equistasipoint/js/data.js");
console.log(JSON.stringify({m: window.MUSCLES.map(m=>({id:m.id, views:m.views})), hits: window.AREA_HITS}));
''']))
maps = {v: remap.make_mapper(v)[0] for v in ('front', 'back')}


def ell(mp, e):
    cx, cy, rx, ry, rot = (list(e) + [0])[:5]
    nx, ny = mp(cx, cy)
    # scala locale: differenze finite
    x1, _ = mp(cx + rx, cy); x0, _ = mp(cx - rx, cy)
    _, y1 = mp(cx, cy + ry); _, y0 = mp(cx, cy - ry)
    sx = abs(x1 - x0) / (2 * rx) if rx else 1
    sy = abs(y1 - y0) / (2 * ry) if ry else 1
    return [nx, ny, round(rx * sx, 1), round(ry * sy, 1), rot]


out = {'muscles': {}, 'hits': {}}
for m in data['m']:
    out['muscles'][m['id']] = {}
    for v, d in m['views'].items():
        mp = maps[v]
        nv = {}
        if d.get('x'):
            nv['x'] = [list(mp(*p)) for p in d['x']]
        nv['zones'] = [{'e': ell(mp, z['e']), 'p': z['p']} for z in d.get('zones', [])]
        out['muscles'][m['id']][v] = nv
for v, hs in data['hits'].items():
    mp = maps[v]; res = []
    for h in hs:
        if 'e' in h:
            res.append({'a': h['a'], 'e': ell(mp, h['e'])})
        else:
            pts = [tuple(map(float, p.split(','))) for p in re.findall(r'-?[\d.]+,-?[\d.]+', h['p'])]
            npts = [mp(*p) for p in pts]
            res.append({'a': h['a'], 'p': 'M' + ' L'.join(f'{x},{y}' for x, y in npts) + ' Z'})
    out['hits'][v] = res
json.dump(out, open(S + '/converted.json', 'w'), indent=1)
print('ok', len(out['muscles']))
