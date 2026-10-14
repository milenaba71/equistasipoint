"""Converte le coordinate del vecchio disegno (viewBox 200x440) nel nuovo render (200 x 432.56).
Abbina le sagome riga per riga: punti di riferimento verticali + intervalli orizzontali (braccio / busto / gamba)."""
import json, sys
import numpy as np
from PIL import Image

S = "/tmp/claude-0/-home-user/f2f60c89-5ac7-5a44-8cf0-0388e8396d74/scratchpad"
NEW_H = 200 * 930 / 430


def load_old():
    a = np.array(Image.open(S + '/oldmask.png').convert('L')) < 128   # 4 px per unità
    return a, 4.0


def load_new(view):
    im = Image.open(f"{S}/renders/base-{view}.png")
    a = np.array(im)[:, :, 3] > 40
    return a, im.width / 200.0


def landmarks(mask, sc):
    rows = np.where(mask.any(axis=1))[0]
    top, bot = rows[0], rows[-1]
    h = bot - top
    cx = mask.shape[1] // 2
    # collo: riga più stretta nel primo 20%
    seg = range(int(top + 0.07 * h), int(top + 0.2 * h))
    neck = min(seg, key=lambda r: mask[r].sum())
    # spalle: prima riga sotto il collo con larghezza > 2.2 volte il collo
    nw = mask[neck].sum()
    sh = next(r for r in range(neck, bot) if mask[r].sum() > 2.6 * nw)
    # inforcatura: prima riga sotto metà altezza in cui il centro è vuoto
    crotch = next(r for r in range(int(top + 0.4 * h), bot) if not mask[r, cx - 2:cx + 3].any())
    return [v / sc for v in (top, neck, sh, crotch, bot)]


def intervals(mask, sc, y):
    r = int(round(y * sc))
    r = min(max(r, 0), mask.shape[0] - 1)
    row = mask[r, : mask.shape[1] // 2 + 1]
    iv, inside, start = [], False, 0
    for i, v in enumerate(row):
        if v and not inside:
            inside, start = True, i
        if not v and inside:
            inside = False; iv.append((start / sc, i / sc))
    if inside:
        iv.append((start / sc, len(row) / sc))
    iv.sort(key=lambda t: -t[1])  # dal centro verso l'esterno
    return iv


def make_mapper(view):
    om, osc = load_old(); nm, nsc = load_new(view)
    lo = [10, 48, 72, 112, 175, 230, 313, 400, 426]
    ln = [12, 59, 80, 112, 170, 213, 300, 388, 404]
    alo = [72, 160, 232, 268]   # braccio: spalla, gomito, polso, punta delle dita
    aln = [80, 150, 205, 245]

    def my(y, arm=False):
        if arm:
            return float(np.interp(y, alo, aln))
        return float(np.interp(y, lo, ln, left=ln[0] + (y - lo[0]), right=ln[-1] + (y - lo[-1])))

    def mp(x, y):
        io = intervals(om, osc, y)
        k0 = min(range(len(io)), key=lambda i: 0 if io[i][0] <= x <= io[i][1] else min(abs(x - io[i][0]), abs(x - io[i][1]))) if io else 0
        arm = 80 < y < 270 and len(io) > 1 and k0 >= 1 or (y >= 230 and x < 60)
        yn = my(y, arm)
        inn = intervals(nm, nsc, yn)
        if not io or not inn:
            return round(x, 1), round(yn, 1)
        # intervallo vecchio che contiene x (o il più vicino)
        k = min(range(len(io)), key=lambda i: 0 if io[i][0] <= x <= io[i][1] else min(abs(x - io[i][0]), abs(x - io[i][1])))
        a, b = io[k]
        t = (x - a) / max(b - a, 1e-6)
        a2, b2 = inn[min(k, len(inn) - 1)]
        return round(a2 + t * (b2 - a2), 1), round(yn, 1)

    return mp, lo, ln


if __name__ == '__main__':
    view = sys.argv[1]
    mp, lo, ln = make_mapper(view)
    print('landmarks old', [round(v, 1) for v in lo], 'new', [round(v, 1) for v in ln])
    for p in [(82, 64), (80, 97), (85, 222), (92, 336), (47.5, 173), (86, 314)]:
        print(p, '->', mp(*p))
