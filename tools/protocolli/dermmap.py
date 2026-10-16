"""Mappa dei dermatomeri disegnata sulle tavole 3D di Equistasi Point (davanti e dietro).
Schema classico semplificato: fasce orizzontali sul tronco, strisce longitudinali su braccia e gambe."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

K = 4.3
W, H = 860, 1860
SRC = '/home/user/equistasipoint/img/anatomy/base-%s.webp'
COL = {'C': ['#8FC43A', '#B2D86A'], 'T': ['#5F9FD9', '#8DBDE6'], 'L': ['#A895D6', '#C6B9E6'], 'S': ['#E46F40', '#F19A72']}
ORDER = ['C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'] + ['T%d' % i for i in range(1, 13)] + ['L%d' % i for i in range(1, 6)] + ['S1', 'S2', 'S3', 'S4', 'S5']
IDX = {n: i + 1 for i, n in enumerate(ORDER)}


def color(n):
    g = n[0]; i = int(n[1:])
    return COL[g][i % 2]


def runs(row):
    out = []; s = None
    for x, v in enumerate(row):
        if v and s is None: s = x
        if not v and s is not None: out.append((s, x - 1)); s = None
    if s is not None: out.append((s, len(row) - 1))
    return out


def build(view):
    im = Image.open(SRC % view).convert('RGBA')
    mask = np.array(im)[..., 3] > 40
    lab = np.zeros((H, W), np.int16)
    half = W // 2
    for py in range(H):
        y = py / K
        row = mask[py, :half]
        rr = runs(row)
        if not rr: continue
        for (a, b) in rr:
            xa, xb = a / K, b / K
            for px in range(a, b + 1):
                x = px / K
                n = classify(view, x, y, xa, xb)
                if n: lab[py, px] = IDX[n]
    # specchio: i dermatomeri sono simmetrici
    lab[:, half:] = lab[:, :half][:, ::-1][:, :W - half]
    return im, mask, lab


def arm_t(x, xa, xb, y):
    # 0 = lato esterno, 1 = lato interno del braccio
    inner = min(xb, 62.5) if y < 128 else xb
    return max(0.0, min(1.0, (x - xa) / max(1e-3, inner - xa)))


def classify(view, x, y, xa, xb):
    is_arm = (y >= 82 and x < 62.5 and (y >= 95 or x < 66 - (y - 82) * 0.27)) or (y > 120 and xb < 64)
    is_hand = is_arm and y >= 205
    is_leg = y >= 214 or (y >= 196 and x < 66 + (y - 196) * 1.6 and x > 60 and not is_arm)
    if view == 'front':
        if y < 58: return None                      # viso: nervo trigemino
        if is_hand:
            u = (x - xa) / max(1e-3, xb - xa)
            return 'C6' if x < 31 else ('C7' if x < 38.5 else 'C8')
        if is_arm:
            t = arm_t(x, xa, xb, y)
            if y < 150: return 'C5' if t < 0.5 else 'T1'
            return 'C6' if t < 0.5 else 'C8'
        if is_leg:
            u = (x - xa) / max(1e-3, xb - xa)       # 0 laterale, 1 mediale
            if y < 308:
                if y < 206 + 22 * u: return 'L1'
                if y < 232 + 48 * u: return 'L2'
                return 'L3'
            if y > 392:
                return 'S1' if u < 0.22 else ('L5' if u < 0.62 else 'L4')
            if u < 0.18 and y > 352: return 'S1'
            return 'L5' if u < 0.5 else 'L4'
        if y < 62: return 'C2'
        if y < 70: return 'C3'
        if y < 80 or (y < 86 and x < 82): return 'C4'
        if y < 88: return 'C5'
        i = int((y - 88) / 8.9) + 1
        return 'T%d' % min(12, max(1, i))
    # ─── vista posteriore ───
    if is_hand:
        u = (x - xa) / max(1e-3, xb - xa)
        return 'C6' if x < 31 else ('C7' if x < 38.5 else 'C8')
    if is_arm:
        t = arm_t(x, xa, xb, y)
        if y < 150: return 'C5' if t < 0.5 else 'T2'
        return 'C6' if t < 0.33 else ('C7' if t < 0.66 else 'C8')
    if is_leg and y > 222:
        u = (x - xa) / max(1e-3, xb - xa)
        if y < 305:
            if u < 0.16: return 'L2' if y < 255 else 'L3'
            return 'S1' if u < 0.55 else 'S2'
        if y > 388:
            return 'S1' if u < 0.3 else ('L5' if u < 0.7 else 'L4')
        if u < 0.2: return 'L5'
        if u < 0.5: return 'S1'
        if u < 0.8: return 'S2'
        return 'L4'
    if y < 58: return 'C2'
    if y < 63: return 'C3'
    if y < 68: return 'C4'
    if y < 72: return 'C5'
    if y < 75 or (y < 82 and x < 80): return 'C6' if y < 74 else ('C7' if x > 74 else 'C8')
    if y < 160:
        i = int((y - 77) / 6.9) + 1
        return 'T%d' % min(12, max(1, i))
    r = ((x - 100) ** 2 + ((y - 207) * 1.15) ** 2) ** 0.5
    if r < 4: return 'S5'
    if r < 8: return 'S4'
    if r < 13: return 'S3'
    if y > 183 and r < 24: return 'S2'
    if y > 186 and r < 36: return 'S1'
    i = int((y - 160) / 6.2) + 1
    return 'L%d' % min(5, max(1, i))


def render(view, labels_at):
    im, mask, lab = build(view)
    base = im.convert('L').convert('RGBA')
    base = Image.eval(base, lambda v: int(140 + v * 0.45))
    ov = np.zeros((H, W, 4), np.uint8)
    for n, i in IDX.items():
        c = color(n); r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
        m = lab == i
        ov[m] = (r, g, b, 200)
    over = Image.fromarray(ov)
    out = Image.new('RGBA', (W, H), (255, 255, 255, 255))
    body = base.copy(); body.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))
    out.alpha_composite(body); out.alpha_composite(over)
    # linee di confine
    e = np.zeros((H, W), bool)
    e[:, 1:] |= (lab[:, 1:] != lab[:, :-1]) & (lab[:, 1:] > 0) & (lab[:, :-1] > 0)
    e[1:, :] |= (lab[1:, :] != lab[:-1, :]) & (lab[1:, :] > 0) & (lab[:-1, :] > 0)
    ed = Image.fromarray((e * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
    line = Image.new('RGBA', (W, H), (40, 40, 70, 255)); line.putalpha(ed.point(lambda v: int(v * 0.75)))
    out.alpha_composite(line)
    d = ImageDraw.Draw(out)
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
    fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
    for n, v in labels_at.items():
        x, y = v[0], v[1]; small = len(v) > 2
        d.text((x * K, y * K), n.strip(), font=fs if small else f, fill=(25, 25, 50, 255), anchor='mm', stroke_width=3 if small else 4, stroke_fill=(255, 255, 255, 255))
    return out.convert('RGB')


FRONT_LABELS = {'C2': (93, 60), 'C3': (93, 66), 'C4': (93, 75), 'C5': (90, 84), 'T1': (88, 92), 'T2': (88, 101), 'T3': (88, 110),
                'T4': (88, 119), 'T5': (88, 128), 'T6': (88, 137), 'T7': (88, 146), 'T8': (88, 155), 'T9': (88, 164), 'T10': (88, 173),
                'T11': (88, 182), 'T12': (84, 190), 'L1': (86, 210), 'L2': (82, 236), 'L3': (84, 275), 'L4': (84, 345), 'L5': (74, 345),
                'S1': (73, 398, 1), 'C6': (40, 175), 'C8': (52, 178)}
FRONT_LABELS2 = {'C5 ': (52, 112), 'T1 ': (58, 140, 1), 'C6 ': (28, 226, 1), 'C7 ': (35, 236, 1), 'C8 ': (43, 230, 1)}
BACK_LABELS = {'C2': (93, 35), 'C3': (93, 60), 'C4': (93, 65), 'C5': (93, 70), 'C6': (93, 73.5), 'T1': (90, 80), 'T3': (90, 94),
               'T5': (90, 107), 'T7': (90, 121), 'T9': (90, 135), 'T11': (90, 149), 'L1': (88, 163), 'L3': (86, 176), 'L5': (80, 188),
               'S1': (76, 205), 'S2': (89, 200), 'S3': (100, 196), 'C7': (40, 175), 'C8': (52, 178), 'T2': (55, 128),
               'L2': (68, 240, 1), 'S1 ': (77, 270), 'S2 ': (88, 270), 'L5 ': (71.5, 330, 1), 'S1  ': (77, 342, 1), 'S2  ': (83, 354, 1), 'L4': (88.5, 366, 1),
               'C6 ': (28, 226, 1), 'C7 ': (35, 236, 1), 'C8 ': (43, 230, 1)}

if __name__ == '__main__':
    fr = render('front', {**FRONT_LABELS, **FRONT_LABELS2})
    bk = render('back', BACK_LABELS)
    box = (int(18 * K), int(10 * K), int(182 * K), int(412 * K))
    a, b = fr.crop(box), bk.crop(box)
    out = Image.new('RGB', (a.width * 2 + 40, a.height), 'white'); out.paste(a, (0, 0)); out.paste(b, (a.width + 40, 0))
    out.save('fig_dermatomi.jpg', quality=88)
    out.resize((out.width // 3, out.height // 3)).save('dm_prev.jpg', quality=80)
    print(out.size)
