"""Export the CC0 Blender Studio bases for Stormfather's regional character adapter.
Run: Blender --background --python blender/export_people.py
The adapter fits clothing and binds semantic joints in Three.js. No external service.
"""
from pathlib import Path
import bpy, math
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
with bpy.data.libraries.load(str(ROOT/'blender/vendor/human-base-meshes.blend'), link=False) as (source, target):
    target.objects = ['SF_WebHuman_Male', 'SF_WebHuman_Female']
for sex, obj in zip(('male', 'female'), target.objects):
    bpy.context.collection.objects.link(obj)
    obj.name = sex
    mesh = obj.data
    low = min(v.co.z for v in mesh.vertices)
    height = max(v.co.z for v in mesh.vertices) - low
    for v in mesh.vertices:
        v.co = (v.co - Vector((0, 0, low))) * (1.78/height)
    # A continuous polygonal surface: preserve the source eyelid, nostril, ear
    # and finger loops instead of rebuilding features from intersecting spheres.
    for p in mesh.polygons: p.use_smooth = True
    mesh.materials.clear()
    mat = bpy.data.materials.new(f'{sex}_anatomical_surface')
    mat.diffuse_color = (.42,.24,.14,1)
    mesh.materials.append(mat)
    uv = mesh.uv_layers.new(name='SurfaceCoordinates')
    for loop in mesh.loops:
        p = mesh.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (.5 + math.atan2(p.x, -p.y)/(2*math.pi), p.z/1.78)
    mesh.update()
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    sub=obj.modifiers.new('AnatomicalSurfaceSubdivision','SUBSURF');sub.levels=1
    bpy.ops.object.modifier_apply(modifier=sub.name)
    mesh=obj.data
    out = ROOT/f'public/models/inhabitants/anatomy-{sex}.glb'
    bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True,
        export_yup=True, export_animations=False, export_cameras=False, export_lights=False)
    print('EXPORTED', out, len(mesh.vertices), 'vertices', out.stat().st_size, 'bytes')
