"""Build the original Stormfather landmark and inhabitant kit.

Run with:
    /Applications/Blender.app/Contents/MacOS/Blender \
      --background --python blender/build_landmarks.py

The script owns the empty background scene created by that command. It writes
the editable .blend, the web GLB, and a presentation render.
"""

from __future__ import annotations

import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
BLEND_PATH = ROOT / "blender" / "roshar-landmarks.blend"
GLB_PATH = ROOT / "public" / "models" / "roshar-landmarks.glb"
PREVIEW_PATH = ROOT / "docs" / "blender-landmarks-preview.png"

for path in (BLEND_PATH.parent, GLB_PATH.parent, PREVIEW_PATH.parent):
    path.mkdir(parents=True, exist_ok=True)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)


reset_scene()
scene = bpy.context.scene
scene.name = "Stormfather_Landmarks"
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.world.color = (0.005, 0.012, 0.018)

assets = bpy.data.collections.new("Roshar_Landmark_Kit")
preview = bpy.data.collections.new("Preview_Rig")
scene.collection.children.link(assets)
scene.collection.children.link(preview)

# The default collection is not used by the generated scene.
default_collection = bpy.data.collections.get("Collection")
if default_collection and default_collection.name in scene.collection.children:
    scene.collection.children.unlink(default_collection)


def material(
    name: str,
    color: tuple[float, float, float],
    metallic: float = 0,
    roughness: float = 0.8,
    emission: tuple[float, float, float] | None = None,
    emission_strength: float = 0,
):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        emission_input = (
            bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        )
        if emission_input:
            emission_input.default_value = (*emission, 1)
        strength = bsdf.inputs.get("Emission Strength")
        if strength:
            strength.default_value = emission_strength
    return mat


p = {
    "stone_dark": material("SF_Stormworn_Basalt", (0.075, 0.105, 0.115), 0.02, 0.92),
    "stone": material("SF_Crem_Stone", (0.29, 0.27, 0.22), 0.01, 0.9),
    "stone_light": material("SF_Windward_Stone", (0.48, 0.45, 0.37), 0.01, 0.86),
    "slate": material("SF_Blue_Slate", (0.11, 0.21, 0.23), 0.08, 0.72),
    "brass": material("SF_Aged_Brass", (0.51, 0.34, 0.12), 0.68, 0.4),
    "cyan": material(
        "SF_Stormlight_Glass",
        (0.03, 0.52, 0.61),
        0.18,
        0.22,
        (0.05, 0.86, 1),
        3.2,
    ),
    "water": material(
        "SF_Purelake_Water",
        (0.02, 0.29, 0.36),
        0.25,
        0.18,
        (0, 0.12, 0.17),
        0.35,
    ),
    "terracotta": material("SF_Terracotta", (0.45, 0.17, 0.09), 0, 0.92),
    "ochre": material("SF_Crem_Ochre", (0.58, 0.38, 0.12), 0, 0.9),
    "teal": material("SF_Kharbranth_Teal", (0.06, 0.32, 0.35), 0, 0.84),
    "ivory": material("SF_Surgeon_Ivory", (0.72, 0.68, 0.56), 0, 0.88),
    "grass": material("SF_Shin_Grass", (0.18, 0.34, 0.12), 0, 0.98),
    "earth": material("SF_Shin_Earth", (0.34, 0.20, 0.10), 0, 1),
    "leaf": material("SF_Leaf", (0.12, 0.27, 0.08), 0, 0.92),
    "red_leaf": material("SF_Red_Leaf", (0.43, 0.05, 0.025), 0, 0.9),
}


def link_asset(obj: bpy.types.Object) -> bpy.types.Object:
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    assets.objects.link(obj)
    return obj


def finish(
    obj: bpy.types.Object,
    mat: bpy.types.Material | None = None,
    bevel: float = 0,
    smooth: bool = False,
) -> bpy.types.Object:
    if mat and obj.type == "MESH":
        obj.data.materials.append(mat)
    if bevel and obj.type == "MESH":
        modifier = obj.modifiers.new("Stormworn edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    if smooth and obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return obj


def root(name: str, location: tuple[float, float, float]) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    assets.objects.link(obj)
    obj.location = location
    obj["landmark"] = name.replace("Landmark_", "").replace("Actor_", "")
    return obj


def cube(
    name,
    location,
    scale,
    mat,
    parent=None,
    bevel=0.08,
):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = link_asset(bpy.context.object)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if parent:
        obj.parent = parent
    return finish(obj, mat, bevel)


def cyl(
    name,
    location,
    radius,
    depth,
    mat,
    parent=None,
    vertices=16,
    bevel=0.06,
):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location
    )
    obj = link_asset(bpy.context.object)
    obj.name = name
    if parent:
        obj.parent = parent
    return finish(obj, mat, bevel, True)


def cone(
    name,
    location,
    radius1,
    radius2,
    depth,
    mat,
    parent=None,
    vertices=16,
    bevel=0.04,
):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
    )
    obj = link_asset(bpy.context.object)
    obj.name = name
    if parent:
        obj.parent = parent
    return finish(obj, mat, bevel, True)


def sphere(name, location, scale, mat, parent=None, segments=16, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, location=location
    )
    obj = link_asset(bpy.context.object)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if parent:
        obj.parent = parent
    return finish(obj, mat, 0, True)


def torus(name, location, major, minor, mat, parent=None, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=32,
        minor_segments=8,
        location=location,
        rotation=rotation,
    )
    obj = link_asset(bpy.context.object)
    obj.name = name
    if parent:
        obj.parent = parent
    return finish(obj, mat, 0, True)


def prism(name, points, height, mat, parent=None, z=0):
    count = len(points)
    vertices = [(x, y, z - height / 2) for x, y in points]
    vertices += [(x, y, z + height / 2) for x, y in points]
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, 2 * count))]
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, count + j, count + i))
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    assets.objects.link(obj)
    if parent:
        obj.parent = parent
    return finish(obj, mat, 0.12)


def build_urithiru() -> None:
    r = root("Landmark_Urithiru", (-22, -7, 0))
    points = [
        (-6, -3.8),
        (-4.8, -5),
        (-1.5, -5.8),
        (2.8, -5.1),
        (5.4, -3.2),
        (5.8, 1.6),
        (3.6, 4.4),
        (0, 5.4),
        (-3.8, 4.5),
        (-5.7, 2.2),
    ]
    prism("Urithiru_Mountain_Base", points, 1.4, p["stone_dark"], r, 0.65)
    for i in range(12):
        z = 1.15 + i * 0.55
        width = 4.8 - i * 0.21
        depth = 3.6 - i * 0.13
        cube(
            f"Urithiru_Stratum_{i + 1:02d}",
            (0, -0.25 + i * 0.025, z),
            (width, depth, 0.24),
            p["stone_light"] if i % 3 == 1 else p["stone"],
            r,
            0.09,
        )
        cube(
            f"Urithiru_Shadow_Band_{i + 1:02d}",
            (0, -depth - 0.09, z + 0.16),
            (width * 0.92, 0.07, 0.045),
            p["stone_dark"],
            r,
            0.02,
        )
        if i < 11:
            cube(
                f"Urithiru_East_Window_{i + 1:02d}",
                (0, -depth - 0.17, z),
                (0.065, 0.035, 0.13),
                p["cyan"],
                r,
                0.015,
            )
    cube("Urithiru_Central_Spine", (0, 0.15, 4.3), (0.42, 0.58, 3.25), p["slate"], r, 0.12)
    for side in (-1, 1):
        buttress = cube(
            f"Urithiru_Buttress_{side}",
            (side * 3.9, 0.8, 2.25),
            (0.3, 2.5, 1.7),
            p["stone_dark"],
            r,
            0.08,
        )
        buttress.rotation_euler[1] = side * 0.14
    for i, angle in enumerate((0, math.pi / 2, math.pi, math.pi * 1.5)):
        cone(
            f"Urithiru_Crown_{i + 1}",
            (math.cos(angle) * 1.05, math.sin(angle) * 0.8, 7.7),
            0.28,
            0.04,
            1.2,
            p["brass"],
            r,
            8,
        )
    cyl("Urithiru_Roof_Beacon", (0, 0, 8), 0.38, 0.5, p["cyan"], r, 12, 0.03)
    cyl(
        "Urithiru_Oathgate_Forecourt",
        (0, -4.25, 1),
        1.3,
        0.28,
        p["stone_light"],
        r,
        10,
        0.08,
    )
    for i in range(10):
        angle = 2 * math.pi * i / 10
        cyl(
            f"Urithiru_Gate_Dais_{i + 1}",
            (math.cos(angle) * 0.85, -4.25 + math.sin(angle) * 0.85, 1.25),
            0.12,
            0.36,
            p["brass"],
            r,
            8,
            0.025,
        )


def build_oathgate() -> None:
    r = root("Landmark_Oathgate", (-9, -7, 0))
    cyl("Oathgate_Decagonal_Dais", (0, 0, 0.35), 3.9, 0.7, p["stone_light"], r, 10, 0.12)
    cyl("Oathgate_Inlay", (0, 0, 0.72), 3.2, 0.08, p["slate"], r, 10, 0.02)
    torus("Oathgate_Brass_Ring", (0, 0, 0.79), 2.35, 0.075, p["brass"], r)
    for i in range(10):
        angle = 2 * math.pi * i / 10
        cyl(
            f"Oathgate_Radial_Marker_{i + 1:02d}",
            (math.cos(angle) * 2.35, math.sin(angle) * 2.35, 0.84),
            0.12,
            0.11,
            p["cyan"],
            r,
            8,
            0.015,
        )
        ray = cube(
            f"Oathgate_Ray_{i + 1:02d}",
            (math.cos(angle) * 1.25, math.sin(angle) * 1.25, 0.82),
            (1, 0.035, 0.025),
            p["brass"],
            r,
            0.01,
        )
        ray.rotation_euler[2] = angle
    cyl("Oathgate_Control_Room", (0, 0, 1.05), 0.85, 1.4, p["stone_dark"], r, 10, 0.08)
    cone("Oathgate_Control_Roof", (0, 0, 1.95), 1.1, 0.32, 0.55, p["brass"], r, 10, 0.04)


def build_kharbranth() -> None:
    r = root("Landmark_Kharbranth", (5, -7, 0))
    for side in (-1, 1):
        points = [
            (side * 1.2, -4.8),
            (side * 5.8, -4.2),
            (side * 6.4, 3.8),
            (side * 2.2, 5.1),
            (side * 0.9, 2.4),
        ]
        prism(f"Kharbranth_Mountain_{side}", points, 2, p["stone_dark"], r, 1)
    colors = [p["terracotta"], p["ochre"], p["teal"], p["ivory"]]
    for tier in range(7):
        y = -3 + tier * 1.02
        z = 0.45 + tier * 0.52
        width = 5 - tier * 0.42
        cube(f"Kharbranth_Terrace_{tier + 1}", (0, y, z), (width, 0.48, 0.22), p["stone"], r)
        count = max(3, 8 - tier)
        for j in range(count):
            x = -width + 0.6 + (j + 0.25 * (tier % 2)) * (2 * width - 1.2) / max(1, count - 1)
            height = 0.38 + 0.13 * ((j + tier) % 3)
            cube(
                f"Kharbranth_House_{tier + 1}_{j + 1}",
                (x, y, z + 0.28 + height),
                (0.38, 0.34, height),
                colors[(j + tier) % len(colors)],
                r,
                0.055,
            )
            cube(
                f"Kharbranth_Window_{tier + 1}_{j + 1}",
                (x, y - 0.35, z + 0.34 + height),
                (0.09, 0.025, 0.1),
                p["cyan"],
                r,
                0.015,
            )
    for tier in range(6):
        y = -2.52 + tier * 1.02
        road = cube(
            f"Kharbranth_Ralinsa_{tier + 1}",
            (0, y, 1.02 + tier * 0.52),
            (2.8 - tier * 0.28, 0.09, 0.055),
            p["stone_light"],
            r,
            0.03,
        )
        road.rotation_euler[2] = -0.11 if tier % 2 == 0 else 0.11
    for index, (x, y, z, scale) in enumerate(
        [(-2.2, 2.4, 4.3, 1), (2.4, 1.5, 3.8, 0.82), (0, 3.5, 5.1, 1.2)]
    ):
        for side in (-1, 1):
            cube(
                f"Kharbranth_BellTower_{index}_Pillar_{side}",
                (x + side * 0.32 * scale, y, z),
                (0.1 * scale, 0.18 * scale, 0.75 * scale),
                p["stone_light"],
                r,
                0.04,
            )
        cone(
            f"Kharbranth_Bell_{index}",
            (x, y - 0.03, z + 0.12 * scale),
            0.25 * scale,
            0.1 * scale,
            0.34 * scale,
            p["brass"],
            r,
            12,
            0.025,
        )
        cone(
            f"Kharbranth_BellRoof_{index}",
            (x, y, z + 0.95 * scale),
            0.58 * scale,
            0.06,
            0.48 * scale,
            p["brass"],
            r,
            8,
            0.035,
        )
    cube("Kharbranth_Harbor_Quay", (0, -4.15, 0.4), (4.2, 0.42, 0.18), p["stone_light"], r)
    cyl("Kharbranth_Harbor_Light", (-3.4, -4, 1.25), 0.34, 1.8, p["teal"], r, 12, 0.04)
    cone("Kharbranth_Harbor_Light_Roof", (-3.4, -4, 2.3), 0.48, 0.05, 0.4, p["brass"], r, 12)


def build_kholinar() -> None:
    r = root("Landmark_Kholinar", (19, -7, 0))
    cyl("Kholinar_City_Rock", (0, 0, 0.35), 5.2, 0.7, p["stone_dark"], r, 32, 0.14)
    for i in range(9):
        angle = -1.1 + i * (2.2 / 8)
        x, y = math.cos(angle) * 4.1, math.sin(angle) * 4.1
        wall = cube(
            f"Kholinar_Windwall_{i + 1}",
            (x, y, 1.15),
            (0.28, 0.95, 0.8),
            p["stone_light"],
            r,
            0.09,
        )
        wall.rotation_euler[2] = angle
        if i % 2 == 0:
            cyl(
                f"Kholinar_Watchtower_{i + 1}",
                (math.cos(angle) * 4.2, math.sin(angle) * 4.2, 1.7),
                0.58,
                2.4,
                p["stone"],
                r,
                12,
            )
            cone(
                f"Kholinar_Watchtower_Roof_{i + 1}",
                (math.cos(angle) * 4.2, math.sin(angle) * 4.2, 3.05),
                0.76,
                0.08,
                0.48,
                p["brass"],
                r,
                12,
            )
    for ring in range(3):
        radius = 3 - ring * 0.75
        for j in range(8 - ring):
            angle = 2 * math.pi * j / (8 - ring) + ring * 0.31
            height = 0.45 + 0.16 * ((j + ring) % 3)
            cube(
                f"Kholinar_Block_{ring}_{j}",
                (math.cos(angle) * radius, math.sin(angle) * radius, 0.75 + height),
                (0.45, 0.42, height),
                p["terracotta"] if j % 3 == 0 else p["stone"],
                r,
                0.06,
            )
    cyl("Kholinar_Palace_Core", (0, 0, 2), 1.18, 3.3, p["slate"], r, 10, 0.08)
    for i in range(6):
        angle = 2 * math.pi * i / 6
        cone(
            f"Kholinar_Palace_Spire_{i + 1}",
            (math.cos(angle) * 0.72, math.sin(angle) * 0.72, 4),
            0.25,
            0.03,
            1.8,
            p["brass"],
            r,
            8,
        )
    cyl("Kholinar_Palace_Light", (0, 0, 4.5), 0.24, 0.48, p["cyan"], r, 12)
    cube("Kholinar_Sunwalk", (-2.7, 0.2, 1.25), (2.2, 0.22, 0.16), p["stone_light"], r)
    cyl("Kholinar_Monastery_Dais", (-4.6, -0.14, 0.85), 1.05, 0.52, p["stone_light"], r, 10)


def build_azimir() -> None:
    r = root("Landmark_Azimir", (-21, 8, 0))
    cyl("Azimir_Civic_Platform", (0, 0, 0.3), 5.2, 0.6, p["ochre"], r, 24, 0.12)
    for i, (x, y, rotation) in enumerate(
        ((0, 2.9, 0), (0, -2.9, 0), (2.9, 0, math.pi / 2), (-2.9, 0, math.pi / 2))
    ):
        hall = cube(f"Azimir_Ministry_{i + 1}", (x, y, 1), (1.55, 0.62, 0.72), p["ivory"], r)
        hall.rotation_euler[2] = rotation
        roof = cube(f"Azimir_Ministry_Roof_{i + 1}", (x, y, 1.8), (1.72, 0.75, 0.14), p["slate"], r)
        roof.rotation_euler[2] = rotation
        for j in range(5):
            offset = -1.05 + j * 0.52
            cyl(
                f"Azimir_Column_{i + 1}_{j + 1}",
                (x + (offset if rotation == 0 else 0), y + (0 if rotation == 0 else offset), 0.95),
                0.09,
                1.25,
                p["brass"],
                r,
                8,
                0.02,
            )
    cyl("Azimir_Grand_Hall", (0, 0, 1.25), 1.45, 2, p["stone_light"], r, 24)
    sphere("Azimir_Grand_Dome", (0, 0, 2.32), (1.5, 1.5, 0.8), p["teal"], r, 24, 12)
    cyl("Azimir_Grand_Lantern", (0, 0, 3), 0.28, 0.55, p["brass"], r, 12)
    cone("Azimir_Grand_Finial", (0, 0, 3.55), 0.32, 0.02, 0.7, p["cyan"], r, 8)
    for i, x in enumerate((-1.65, 1.65)):
        cyl(f"Azimir_Archive_{i + 1}", (x, 1.25, 1.45), 0.55, 2.5, p["terracotta"], r, 12)
        cone(f"Azimir_Archive_Roof_{i + 1}", (x, 1.25, 2.9), 0.75, 0.08, 0.5, p["brass"], r, 12)


def build_purelake() -> None:
    r = root("Landmark_Purelake", (-8, 8, 0))
    cyl("Purelake_Water_Shelf", (0, 0, 0.08), 5.2, 0.16, p["water"], r, 48, 0)
    for i, (x, y, scale) in enumerate(
        [(-2.5, -1.4, 1), (0.1, -1.8, 0.8), (2.35, -0.9, 1.15), (-1.2, 1.55, 0.9), (1.55, 1.65, 0.72)]
    ):
        for sx in (-1, 1):
            for sy in (-1, 1):
                cyl(
                    f"Purelake_Hut_{i}_Stilt_{sx}_{sy}",
                    (x + sx * 0.4 * scale, y + sy * 0.34 * scale, 0.32),
                    0.06 * scale,
                    0.65,
                    p["earth"],
                    r,
                    8,
                    0,
                )
        cube(f"Purelake_Hut_{i}_Floor", (x, y, 0.55), (0.65 * scale, 0.58 * scale, 0.12), p["stone"], r)
        sphere(f"Purelake_Hut_{i}_Rockbud", (x, y, 0.98), (0.78 * scale, 0.7 * scale, 0.55 * scale), p["stone_light"], r)
    for i, (x, y, angle) in enumerate(((-3.4, 1.2, 0.2), (2.9, 1.1, -0.25), (0.1, 3.2, 0.08))):
        raft = cube(f"Purelake_Raft_{i}", (x, y, 0.28), (0.85, 0.34, 0.07), p["earth"], r, 0.025)
        raft.rotation_euler[2] = angle
        cyl(f"Purelake_RaftPole_{i}", (x, y, 0.9), 0.035, 1.35, p["brass"], r, 8, 0)


def build_shinovar() -> None:
    r = root("Landmark_Shinovar", (5, 8, 0))
    cyl("Shinovar_Grass_Valley", (0, 0, 0.18), 5.4, 0.36, p["grass"], r, 40)
    for i in range(7):
        field = cube(
            f"Shinovar_Field_{i + 1}",
            (-1.8 + i * 0.62, -2.2, 0.4),
            (0.22, 1.4, 0.035),
            p["ochre"] if i % 2 else p["earth"],
            r,
            0.015,
        )
        field.rotation_euler[2] = 0.08
    for i, (x, y, scale) in enumerate(((-2.4, 1.1, 1), (-0.2, 1.7, 0.85), (2, 0.9, 1.15), (2.6, -1.1, 0.75))):
        cube(f"Shinovar_Home_{i}", (x, y, 0.8), (0.78 * scale, 0.62 * scale, 0.62 * scale), p["earth"], r, 0.18)
        roof = cone(f"Shinovar_Roof_{i}", (x, y, 1.62 * scale), 1.05 * scale, 0.12, 0.66 * scale, p["terracotta"], r, 4)
        roof.rotation_euler[2] = math.pi / 4
    for i, (x, y, scale) in enumerate(((-3.6, -0.9, 1), (-3.2, 2.9, 0.8), (0.8, 3.1, 1.1), (3.7, 2.3, 0.92), (3.8, -2.7, 0.76))):
        cyl(f"Shinovar_Tree_{i}_Trunk", (x, y, scale), 0.14 * scale, 2 * scale, p["earth"], r, 10)
        sphere(f"Shinovar_Tree_{i}_Crown", (x, y, 2.35 * scale), (0.8 * scale, 0.75 * scale, 0.95 * scale), p["leaf"], r, 14, 8)


def build_akinah() -> None:
    r = root("Landmark_Akinah", (19, 8, 0))
    cyl("Akinah_Island", (0, 0, 0.28), 5.1, 0.56, p["stone_dark"], r, 32, 0.16)
    for i in range(22):
        angle = 2 * math.pi * i / 22
        radius = 4.45 + 0.18 * math.sin(i * 2.1)
        height = 1.7 + 0.65 * ((i * 7) % 5) / 4
        spike = cone(
            f"Akinah_Defense_Spike_{i + 1:02d}",
            (math.cos(angle) * radius, math.sin(angle) * radius, height / 2 + 0.42),
            0.34,
            0.025,
            height,
            p["stone_light"],
            r,
            6,
        )
        spike.rotation_euler[2] = angle
    for ring in range(3):
        radius = 0.9 + ring * 1.05
        count = 7 + ring * 3
        for i in range(count):
            if (i + ring) % 4 == 0:
                continue
            angle = 2 * math.pi * i / count + ring * 0.2
            height = 0.5 + 0.18 * ((i + 2 * ring) % 3)
            block = cube(
                f"Akinah_Ruin_{ring}_{i}",
                (math.cos(angle) * radius, math.sin(angle) * radius, 0.48 + height),
                (0.32, 0.24, height),
                p["stone"],
                r,
                0.06,
            )
            block.rotation_euler[2] = angle
    cyl("Akinah_Hidden_Oathgate", (0, 0, 0.78), 1.2, 0.26, p["slate"], r, 10)
    torus("Akinah_Hidden_Ring", (0, 0, 0.93), 0.74, 0.06, p["cyan"], r)


def build_shattered_plains() -> None:
    random.seed(9981)
    r = root("Landmark_Shattered_Plains", (33, 8, 0))
    cyl("ShatteredPlains_Chasm_Floor", (0, 0, 0.05), 6, 0.1, p["stone_dark"], r, 48, 0)
    centers = [(0, 0, 1, 0.95, 0)]
    for ring, radius, count in ((1, 1.65, 8), (2, 3.35, 12), (3, 5, 16)):
        for i in range(count):
            angle = 2 * math.pi * i / count + (0.1 if ring % 2 else 0)
            x, y = math.cos(angle) * radius, math.sin(angle) * radius
            erosion = max(0, x / 5)
            scale = (0.74 if ring == 1 else 0.82) * (1 - 0.28 * erosion)
            scale *= 0.88 + 0.18 * math.sin(i * 3.7)
            centers.append((x, y, 0.68 + 0.16 * math.sin(i * 1.9), scale, angle))
    for index, (x, y, z, scale, _angle) in enumerate(centers):
        sides = 7 if index % 3 else 8
        points = []
        for j in range(sides):
            angle = 2 * math.pi * j / sides
            radius = scale * (0.78 + 0.22 * math.sin(j * 2.7 + index))
            points.append((x + math.cos(angle) * radius, y + math.sin(angle) * radius))
        prism(
            f"ShatteredPlains_Plateau_{index + 1:02d}",
            points,
            1.35 + 0.25 * (index % 3),
            p["stone_light"] if index % 5 == 0 else p["stone"],
            r,
            z,
        )
    for index, (x, y, _z, _scale, _angle) in enumerate(centers[1:18]):
        if x > 2.2 or index % 3 == 1:
            continue
        distance = math.hypot(x, y)
        bridge = cube(
            f"ShatteredPlains_Bridge_{index + 1}",
            (x * 0.57, y * 0.57, 1.52),
            (distance * 0.31, 0.075, 0.055),
            p["brass"],
            r,
            0.02,
        )
        bridge.rotation_euler[2] = math.atan2(y, x)
    cyl("Stormseat_Central_Dais", (0, 0, 1.78), 0.62, 0.25, p["slate"], r, 10)
    torus("Stormseat_Oathgate_Ring", (0, 0, 1.94), 0.38, 0.045, p["cyan"], r)
    torus("Warcamp_Crater_Rim", (-4.8, 0, 0.85), 1.12, 0.22, p["stone_dark"], r)
    for i in range(7):
        angle = 2 * math.pi * i / 7
        cube(
            f"Warcamp_Barrack_{i + 1}",
            (-4.8 + math.cos(angle) * 0.65, math.sin(angle) * 0.65, 0.82),
            (0.12, 0.34, 0.2),
            p["ochre"],
            r,
            0.035,
        ).rotation_euler[2] = angle
    for i in range(6):
        cyl(
            f"Chasm_Temple_Column_{i + 1}",
            (2.55 + (i % 3) * 0.22, -3.15 + (i // 3) * 0.45, 0.62),
            0.055,
            0.75,
            p["stone_light"],
            r,
            8,
            0.02,
        )


def build_actors() -> None:
    skin_dark = material("SF_Skin_Azish", (0.22, 0.09, 0.045))
    skin_brown = material("SF_Skin_Alethi", (0.38, 0.18, 0.09))
    skin_tan = material("SF_Skin_Purelaker", (0.52, 0.30, 0.16))
    skin_pale = material("SF_Skin_Shin", (0.72, 0.55, 0.43))
    singer_red = material("SF_Singer_Red", (0.48, 0.045, 0.025))
    singer_black = material("SF_Singer_Black", (0.025, 0.018, 0.017))
    hair_black = material("SF_Hair_Black", (0.012, 0.009, 0.008))
    hair_white = material("SF_Hair_White", (0.72, 0.72, 0.68))
    blue = material("SF_Alethi_Blue", (0.035, 0.12, 0.29))
    plum = material("SF_Azish_Plum", (0.24, 0.055, 0.18))
    cream = material("SF_Cloth_Cream", (0.62, 0.54, 0.39))
    red = material("SF_Listener_Redcloth", (0.38, 0.025, 0.018))
    grey = material("SF_Thaylen_Grey", (0.18, 0.22, 0.23))

    def person_base(name, x, skin, cloth, height=1, broad=1):
        actor = root(name, (x, 20, 0))
        for side in (-1, 1):
            cyl(f"{name}_Leg_{side}", (side * 0.14 * broad, 0, 0.46 * height), 0.105 * broad, 0.72 * height, p["stone_dark"], actor, 8, 0.025)
            cube(f"{name}_Boot_{side}", (side * 0.14 * broad, -0.055, 0.12 * height), (0.13 * broad, 0.18, 0.1 * height), p["stone_dark"], actor, 0.035)
        cone(f"{name}_Torso", (0, 0, 1.06 * height), 0.34 * broad, 0.26 * broad, 0.72 * height, cloth, actor, 10)
        for side in (-1, 1):
            arm = cyl(f"{name}_Arm_{side}", (side * 0.37 * broad, 0, 1.08 * height), 0.085 * broad, 0.68 * height, cloth, actor, 8, 0.022)
            arm.rotation_euler[1] = side * 0.12
            sphere(f"{name}_Hand_{side}", (side * 0.41 * broad, 0, 0.78 * height), (0.1, 0.09, 0.11), skin, actor, 10, 6)
        sphere(f"{name}_Head", (0, 0, 1.66 * height), (0.24 * broad, 0.22 * broad, 0.27 * height), skin, actor, 14, 8)
        return actor

    actor = person_base("Actor_Alethi", -22, skin_brown, blue, 1.08)
    cone("Actor_Alethi_Hair", (0, 0.02, 1.92), 0.25, 0.1, 0.28, hair_black, actor, 12)
    cube("Actor_Alethi_CoatTail", (0, 0.12, 0.82), (0.27, 0.07, 0.42), blue, actor)
    actor = person_base("Actor_Azish", -15, skin_dark, plum)
    cone("Actor_Azish_Robe", (0, 0, 0.65), 0.42, 0.28, 0.92, plum, actor, 12)
    cyl("Actor_Azish_Cap", (0, 0, 1.84), 0.25, 0.16, p["ochre"], actor, 12)
    actor = person_base("Actor_Shin", -8, skin_pale, cream, 0.94, 0.92)
    cone("Actor_Shin_Hair", (0, 0.03, 1.73), 0.24, 0.14, 0.2, hair_black, actor, 12)
    for side in (-1, 1):
        sphere(f"Actor_Shin_Eye_{side}", (side * 0.085, -0.205, 1.6), (0.04, 0.025, 0.045), hair_black, actor, 8, 6)
    actor = person_base("Actor_Singer", -1, singer_red, red, 1.12, 1.13)
    for side in (-1, 1):
        plate = cube(f"Actor_Singer_CarapaceArm_{side}", (side * 0.47, 0, 1.13), (0.12, 0.15, 0.35), singer_black, actor)
        plate.rotation_euler[1] = side * 0.12
        cone(f"Actor_Singer_TemplePlate_{side}", (side * 0.25, 0, 1.88), 0.14, 0.025, 0.35, singer_black, actor, 6)
    for stripe in (-1, 0, 1):
        cube(f"Actor_Singer_Marble_{stripe}", (stripe * 0.09, -0.225, 1.66 + stripe * 0.035), (0.025, 0.018, 0.18), singer_black, actor, 0.012).rotation_euler[2] = 0.28
    actor = person_base("Actor_Thaylen", 6, skin_tan, grey)
    cone("Actor_Thaylen_Hair", (0, 0.03, 1.82), 0.23, 0.1, 0.22, hair_white, actor, 12)
    for side in (-1, 1):
        brow = cube(f"Actor_Thaylen_Brow_{side}", (side * 0.18, -0.235, 1.7), (0.16, 0.018, 0.022), hair_white, actor, 0.008)
        brow.rotation_euler[2] = side * 0.42
    actor = person_base("Actor_Purelaker", 13, skin_tan, p["teal"], 0.98)
    cone("Actor_Purelaker_ShoulderYoke", (0, -0.01, 1.3), 0.32, 0.25, 0.24, skin_tan, actor, 10)
    cone("Actor_Purelaker_Wrap", (0, 0, 0.72), 0.4, 0.28, 0.82, p["teal"], actor, 10)
    pole = cyl("Actor_Purelaker_FishingPole", (0.53, 0, 1.15), 0.025, 2.35, p["earth"], actor, 8, 0)
    pole.rotation_euler[1] = -0.13


build_urithiru()
build_oathgate()
build_kharbranth()
build_kholinar()
build_azimir()
build_purelake()
build_shinovar()
build_akinah()
build_shattered_plains()
build_actors()


def link_preview(obj: bpy.types.Object) -> bpy.types.Object:
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    preview.objects.link(obj)
    return obj


def point_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.mesh.primitive_plane_add(size=2, location=(5, 6.5, -0.32))
ground = link_preview(bpy.context.object)
ground.name = "Preview_Basalt_Table"
ground.scale = (34, 22, 1)
ground.data.materials.append(p["stone_dark"])
for y in (-7, 8):
    for x in (-22, -9, 5, 19, 33):
        if not any(
            abs(obj.location.x - x) < 0.1
            and abs(obj.location.y - y) < 0.1
            and obj.name.startswith("Landmark_")
            for obj in assets.objects
        ):
            continue
        bpy.ops.mesh.primitive_torus_add(
            major_radius=6.15,
            minor_radius=0.035,
            major_segments=64,
            minor_segments=6,
            location=(x, y, -0.08),
        )
        ring = link_preview(bpy.context.object)
        ring.data.materials.append(p["brass"])
bpy.ops.mesh.primitive_cube_add(location=(-4.5, 20, -0.15), scale=(22, 2.2, 0.15))
actor_strip = link_preview(bpy.context.object)
actor_strip.data.materials.append(p["slate"])

bpy.ops.object.camera_add(location=(8, -65, 54))
camera = link_preview(bpy.context.object)
camera.name = "Preview_Camera"
camera.data.lens = 41
point_at(camera, (4, 5.5, 1.8))
scene.camera = camera

for light_type, location, energy, size, color in (
    ("AREA", (-14, -14, 30), 2200, 18, (1, 0.73, 0.43)),
    ("AREA", (27, -2, 22), 1700, 15, (0.22, 0.62, 1)),
    ("AREA", (-12, 25, 15), 1900, 12, (0.1, 0.82, 0.95)),
):
    bpy.ops.object.light_add(type=light_type, location=location)
    light = link_preview(bpy.context.object)
    light.data.energy = energy
    light.data.size = size
    light.data.color = color
    point_at(light, (3, 4, 1))
bpy.ops.object.light_add(type="SUN", location=(0, 0, 18))
sun = link_preview(bpy.context.object)
sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-38))
sun.data.energy = 1.7
sun.data.color = (0.52, 0.68, 0.82)

try:
    scene.view_settings.look = "Medium High Contrast"
except TypeError:
    pass

scene.render.filepath = str(PREVIEW_PATH)
bpy.ops.render.render(write_still=True)

# Export only the web assets; the presentation rig stays in the editable blend.
bpy.ops.object.select_all(action="DESELECT")
for obj in assets.all_objects:
    obj.select_set(True)
if assets.all_objects:
    bpy.context.view_layer.objects.active = assets.all_objects[0]
bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
)

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), compress=True)

print(f"Built {len(assets.all_objects)} authored objects")
print(f"GLB: {GLB_PATH}")
print(f"Blend: {BLEND_PATH}")
print(f"Preview: {PREVIEW_PATH}")
