"""Scrive in js/data.js le coordinate di converted.json (blocchi views e AREA_HITS)."""
import json, re, sys
S = "/tmp/claude-0/-home-user/f2f60c89-5ac7-5a44-8cf0-0388e8396d74/scratchpad"
P = "/home/user/equistasipoint/js/data.js"
conv = json.load(open(sys.argv[1] if len(sys.argv) > 1 else S + '/converted.json'))
src = open(P).read()


def block_end(s, i):
    """indice subito dopo la graffa che chiude quella aperta in s[i]"""
    depth = 0
    for k in range(i, len(s)):
        if s[k] == '{': depth += 1
        elif s[k] == '}':
            depth -= 1
            if depth == 0: return k + 1
    raise ValueError


def n(v):
    return ('%g' % round(v, 1))


def views_js(views, ind='    '):
    out = '{\n'
    for v in ('back', 'front'):
        if v not in views: continue
        d = views[v]
        out += ind + '  ' + v + ': {\n'
        if d.get('x'):
            out += ind + '    x: [' + ', '.join('[' + n(x) + ', ' + n(y) + ']' for x, y in d['x']) + '],\n'
        out += ind + '    zones: [\n'
        for z in d['zones']:
            e = z['e']
            out += ind + '      { e: [' + ', '.join(n(c) for c in e) + '], p: ' + str(z['p']) + ' },\n'
        out += ind + '    ],\n' + ind + '  },\n'
    return out + ind + '}'


for mid, views in conv['muscles'].items():
    i = src.index("id: '%s'," % mid)
    j = src.index('views: {', i) + len('views: ')
    k = block_end(src, j)
    # mantieni l'ordine originale delle viste
    orig = src[j:k]
    order = sorted(views.keys(), key=lambda v: orig.find(v + ':'))
    src = src[:j] + views_js({v: views[v] for v in order}).replace('{\n', '{\n', 1) + src[k:]
    # views_js usa l'ordine back/front: correggo rispettando l'originale
    if order and order[0] == 'front' and 'back' in views:
        k2 = block_end(src, j)
        blk = src[j:k2]
        fb = blk.index('      front: {'); bb = blk.index('      back: {')
        back_part = blk[bb:fb]; front_part = blk[fb:blk.rindex('    }')]
        src = src[:j] + '{\n' + front_part + back_part + '    }' + src[k2:]

# AREA_HITS
i = src.index('window.AREA_HITS = {') + len('window.AREA_HITS = ')
k = block_end(src, i)
hits = '{\n'
for v in ('front', 'back'):
    hits += '  ' + v + ': [\n'
    for h in conv['hits'][v]:
        if 'e' in h:
            hits += "    { a: '%s', e: [%s] },\n" % (h['a'], ', '.join(n(c) for c in h['e']))
        else:
            hits += "    { a: '%s', p: '%s' },\n" % (h['a'], h['p'])
    hits += '  ],\n'
hits += '}'
src = src[:i] + hits + src[k:]
src = src.replace(' * Coordinate nello stesso sistema di js/body.js (viewBox 0 0 200 440),',
                  ' * Coordinate nello stesso sistema di js/body.js (viewBox 0 0 200 432.6, tavole 3D),')
open(P, 'w').write(src)
print('ok')
