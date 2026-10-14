"""Atlante di controllo: per ogni muscolo/vista sovrappone X e zone alla tavola, con griglia."""
import json, subprocess, sys, math, os
from PIL import Image, ImageDraw, ImageFont

S = "/tmp/claude-0/-home-user/f2f60c89-5ac7-5a44-8cf0-0388e8396d74/scratchpad"
data = json.loads(subprocess.check_output(['node', '-e', '''
global.window={}; require("/home/user/equistasipoint/js/data.js");
console.log(JSON.stringify(window.MUSCLES.map(m=>({id:m.id, name:m.name, views:m.views}))));
''']))
only = set(sys.argv[1].split(',')) if len(sys.argv) > 1 and sys.argv[1] else None
out = sys.argv[2] if len(sys.argv) > 2 else S + '/atlas'
os.makedirs(out, exist_ok=True)
SC = 860 / 200


def draw(m, view):
    p = f"{S}/renders/{m['id']}-{view}.png"
    if not os.path.exists(p):
        return None
    im = Image.open(p).convert('RGBA')
    bg = Image.new('RGBA', im.size, (24, 26, 36, 255)); bg.alpha_composite(im)
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    v = m['views'][view]
    pts = []
    for z in v.get('zones', []):
        cx, cy, rx, ry, rot = (z['e'] + [0])[:5]
        # ellisse ruotata come poligono
        poly = []
        for t in range(36):
            a = 2 * math.pi * t / 36
            x, y = rx * math.cos(a), ry * math.sin(a)
            r = math.radians(rot)
            poly.append(((cx + x * math.cos(r) - y * math.sin(r)) * SC, (cy + x * math.sin(r) + y * math.cos(r)) * SC))
        pts += poly
        d.polygon(poly, fill=(40, 110, 255, 150 if z['p'] else 70), outline=(120, 170, 255, 255))
    for x, y in v.get('x', []):
        s = 2.6 * SC
        X, Y = x * SC, y * SC
        pts += [(X - s, Y - s), (X + s, Y + s)]
        for c, w in (((255, 255, 255, 255), 9), ((0, 0, 0, 255), 4)):
            d.line([(X - s, Y - s), (X + s, Y + s)], fill=c, width=w)
            d.line([(X + s, Y - s), (X - s, Y + s)], fill=c, width=w)
    bg.alpha_composite(ov)
    g = ImageDraw.Draw(bg)
    xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
    x0, x1 = max(0, min(xs) - 120), min(im.width, max(xs) + 120)
    y0, y1 = max(0, min(ys) - 120), min(im.height, max(ys) + 120)
    # griglia ogni 5 unità nella zona ritagliata
    F = ImageFont.load_default(size=26)
    for u in range(0, 201, 5):
        X = u * SC
        if x0 <= X <= x1:
            col = (255, 60, 60, 255) if u == 100 else (255, 255, 0, 70 if u % 10 else 150)
            g.line([(X, y0), (X, y1)], fill=col, width=2 if u == 100 else 1)
            if u % 10 == 0:
                for yy in (y0 + 26, (y0 + y1) / 2, y1 - 30):
                    g.text((X + 3, yy), str(u), fill=(0, 255, 255, 255), font=F, stroke_width=2, stroke_fill=(0, 0, 0))
    for u in range(0, 433, 5):
        Y = u * SC
        if y0 <= Y <= y1:
            g.line([(x0, Y), (x1, Y)], fill=(255, 255, 0, 70 if u % 10 else 150), width=1)
            if u % 10 == 0:
                for xx in (x0 + 4, (x0 + x1) / 2):
                    g.text((xx, Y + 2), str(u), fill=(255, 255, 0, 255), font=F, stroke_width=2, stroke_fill=(0, 0, 0))
    crop = bg.crop((int(x0), int(y0), int(x1), int(y1)))
    g2 = ImageDraw.Draw(crop); g2.rectangle([0, 0, crop.width, 22], fill=(0, 0, 0, 200))
    g2.text((6, 5), f"{m['name']} - {view}", fill=(255, 255, 255, 255))
    return crop.convert('RGB')


done = []
for m in data:
    if only and m['id'] not in only:
        continue
    for view in m['views']:
        c = draw(m, view)
        if c:
            f = f"{out}/{m['id']}-{view}.jpg"; c.save(f, quality=85); done.append(f)
print('\n'.join(done))
