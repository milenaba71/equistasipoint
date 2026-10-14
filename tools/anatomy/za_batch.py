"""Render in serie delle tavole anatomiche per l'app (un solo caricamento del modello).
Uso: python -I za_batch.py -- jobs.json outdir
jobs.json: [{"name": "trapezio_sup-back", "view": "back", "style": "dim", "hl": [...], "hide": [...]}, ...]
"""
import bpy, sys, json, math, mathutils, time, os
S = "/tmp/claude-0/-home-user/f2f60c89-5ac7-5a44-8cf0-0388e8396d74/scratchpad"
a = sys.argv[sys.argv.index('--') + 1:]
jobs = json.load(open(a[0])); outdir = a[1]
W = int(a[2]) if len(a) > 2 else 860
H = int(W * 930 / 430)
SAMPLES = int(a[3]) if len(a) > 3 else 32
os.makedirs(outdir, exist_ok=True)
CLEAN = os.environ.get('ZA_CLEAN', 'clean2')
bpy.ops.wm.open_mainfile(filepath=S + "/" + CLEAN + ".blend")
info = json.load(open(S + '/' + CLEAN.replace('clean', 'clean_info') + '.json'))
scene = bpy.context.scene


def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


def mat(name, color, rough=0.45, sss=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*srgb(color), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Subsurface Weight'].default_value = sss
    b.inputs['Subsurface Radius'].default_value = (0.012, 0.004, 0.003)
    b.inputs['Coat Weight'].default_value = coat
    return m


M = {
    'mus': mat('mus', '#9c3a24', 0.4, 0.1, 0.15),
    'dim': mat('dim', '#b8a69c', 0.55, 0.05),
    'hl': mat('hl', '#e8501a', 0.36, 0.1, 0.2),
    'ten': mat('ten', '#eee4d6', 0.32, 0.04, 0.25),
    'tend': mat('tend', '#e6ded4', 0.4),
    'bone': mat('bone', '#e6d8bf', 0.5),
    'eye': mat('eye', '#f2eee8', 0.15, 0.05, 0.6),
    'iris': mat('iris', '#5a4434', 0.3, 0.0, 0.8),
}
DEFAULT_EXTRAS = os.environ.get('ZA_EXTRAS', 'eye,iris,nose,skin').split(',')
HIDE_MATS = {'Bursa', 'Fascia', 'Articular capsule', 'Cartilage', 'Teeth', 'Teeth-roots', 'Ligament'}
HIDE_NAMES = ('bursa', 'sheath', 'synovial')
ALWAYS = {'Linea alba'}

objs = [o for o in bpy.data.objects if o.type == 'MESH']
kind = {}
for o in objs:
    name = o.name[:-1]; meta = info.get(name, {}); m0 = meta.get('mat', ''); low = name.lower()
    base_hidden = (m0 in HIDE_MATS or any(k in low for k in HIDE_NAMES)) and name not in ALWAYS
    ex = meta.get('extra')
    if ex:
        base_hidden = ex not in DEFAULT_EXTRAS or ex == 'cornea'
        k = {'eye': 'eye', 'iris': 'iris', 'nose': 'mus', 'skin': 'mus'}.get(ex, 'mus')
    elif meta.get('skel'):
        k = 'bone'
    elif m0.startswith('Tendon') or name in ALWAYS or any(k in low for k in ('tendon', 'aponeuros', 'retinacul', 'tract')):
        k = 'ten'
    else:
        k = 'mus'
    kind[o.name] = (name, k, base_hidden)
    o.data.materials.clear(); o.data.materials.append(M[k])

camd = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', camd)
scene.collection.objects.link(cam); scene.camera = cam
camd.type = 'ORTHO'; camd.ortho_scale = 1.86; camd.clip_start = 0.1; camd.clip_end = 20
scene.render.resolution_x = W; scene.render.resolution_y = H
scene.render.film_transparent = True
scene.render.engine = 'CYCLES'; scene.cycles.device = 'CPU'
scene.cycles.samples = SAMPLES; scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
bg = w.node_tree.nodes.get('Background'); bg.inputs[0].default_value = (1, 1, 1, 1); bg.inputs[1].default_value = 0.12

lights = {}
for nm, e, sz in (('key', 520, 2), ('fill', 140, 4), ('rim1', 380, 3), ('rim2', 380, 3)):
    ld = bpy.data.lights.new(nm, 'AREA'); ld.energy = e; ld.size = sz
    lo = bpy.data.objects.new(nm, ld); scene.collection.objects.link(lo); lights[nm] = lo


def place(view):
    sg = -1 if view == 'front' else 1
    pos = {'key': (1.8, sg * 2.8, 2.9), 'fill': (-2.6, sg * 2.4, 1.0), 'rim1': (1.6, -sg * 2.5, 2.2), 'rim2': (-1.6, -sg * 2.5, 2.2)}
    if view == 'back':  # stessa luce "da destra dell'immagine" anche dietro
        pos['key'] = (-1.8, 2.8, 2.9); pos['fill'] = (2.6, 2.4, 1.0)
    for nm, lo in lights.items():
        lo.location = pos[nm]
        d = mathutils.Vector((0, 0, 0.9)) - mathutils.Vector(pos[nm])
        lo.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if view == 'front':
        cam.location = (0, -4, 0.83); cam.rotation_euler = (math.radians(90), 0, 0)
    else:
        cam.location = (0, 4, 0.83); cam.rotation_euler = (math.radians(90), 0, math.radians(180))


for j in jobs:
    out = os.path.join(outdir, j['name'] + '.png')
    if os.path.exists(out) and not j.get('force'):
        continue
    hl = set(j.get('hl', [])); hide = set(j.get('hide', [])); style = j.get('style', 'dim')
    for o in objs:
        name, k, base_hidden = kind[o.name]
        show = name in hl or not (base_hidden or name in hide)
        o.hide_render = not show
        if not show:
            continue
        if name in hl:
            mk = 'hl'
        elif style == 'dim':
            mk = {'mus': 'dim', 'ten': 'tend', 'bone': 'bone', 'eye': 'eye', 'iris': 'dim'}[k]
        else:
            mk = k
        o.material_slots[0].material = M[mk]
    place(j['view'])
    if j.get('cam'):
        camd.ortho_scale, cz = j['cam'][0], j['cam'][1]
        cam.location.z = cz
        scene.render.resolution_x, scene.render.resolution_y = j['cam'][2], j['cam'][3]
    else:
        camd.ortho_scale = 1.86; cam.location.z = 0.83
        scene.render.resolution_x = W; scene.render.resolution_y = H
    scene.render.filepath = out
    t = time.time(); bpy.ops.render.render(write_still=True)
    print('DONE', j['name'], round(time.time() - t), 's', flush=True)
