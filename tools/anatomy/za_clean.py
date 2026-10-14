"""Esporta muscoli e ossa (geometria già valutata) in un file .blend pulito."""
import bpy, mathutils, json
S = "/tmp/claude-0/-home-user/f2f60c89-5ac7-5a44-8cf0-0388e8396d74/scratchpad"
bpy.ops.wm.open_mainfile(filepath=S + "/zmodel/Z-Anatomy/Startup.blend")
scene = bpy.context.scene
keep = {'1: Skeletal system', '4: Muscular system'}
for lc in scene.view_layers[0].layer_collection.children:
    lc.exclude = lc.name not in keep
dg = bpy.context.evaluated_depsgraph_get()

# parti del viso per un aspetto naturale (occhi, cartilagini del naso, pelle di naso/bocca/orecchio)
EXTRA = {'Sclera': 'eye', 'Iris': 'iris', 'Cornea': 'cornea',
         'Lateral process of nasal septal cartilage': 'nose', 'Major alar cartilage': 'nose',
         'Minor alar cartilages': 'nose', 'Nasal septal cartilage': 'nose',
         'Nasal region': 'skin', 'Oral region': 'skin', 'Auricular region': 'ear', 'Lobule of auricle': 'ear'}
def base(n):
    return n[:-2] if n.endswith(('.r', '.l')) else n

info = {}
new = []
for o in list(bpy.data.objects):
    if o.type != 'MESH':
        continue
    cols = {c.name for c in o.users_collection}
    extra = EXTRA.get(base(o.name))
    if not extra and (not (cols & keep) or o.name.endswith(('.g', '.j', '.t'))):
        continue
    c = o.matrix_world @ (sum((mathutils.Vector(v) for v in o.bound_box), mathutils.Vector()) / 8)
    if abs(c.x) > 0.5:
        continue
    if extra:  # collezioni escluse: copia diretta della geometria salvata
        me = o.data.copy()
    else:
        e = o.evaluated_get(dg)
        me = bpy.data.meshes.new_from_object(e, preserve_all_data_layers=False, depsgraph=dg)
    me.transform(o.matrix_world)
    mats = [s.material.name for s in o.material_slots if s.material]
    me.materials.clear()
    new.append((o.name, me))
    info[o.name] = {'mat': mats[0] if mats else '', 'skel': '1: Skeletal system' in cols and not extra, 'extra': extra}

# scena nuova e vuota
sc = bpy.data.scenes.new('Clean')
col = bpy.data.collections.new('Body')
sc.collection.children.link(col)
for name, me in new:
    ob = bpy.data.objects.new(name + '#', me)
    col.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
bpy.context.window.scene = sc
# rimuovi la scena originale e tutto ciò che non serve
for s in list(bpy.data.scenes):
    if s != sc:
        bpy.data.scenes.remove(s)
bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
json.dump(info, open(S + '/clean_info2.json', 'w'))
bpy.ops.wm.save_as_mainfile(filepath=S + '/clean2.blend', compress=True)
print('saved objects', len(new))
