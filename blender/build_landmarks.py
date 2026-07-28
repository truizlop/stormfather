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


def textured_material(
    name: str,
    color: tuple[float, float, float],
    texture_name: str,
    metallic: float = 0,
    roughness: float = 0.84,
    bump_strength: float = 0.16,
):
    """Create a preview material whose image is also compatible with GLB export.

    The runtime reapplies the same project texture by semantic material name, but
    keeping it in Blender makes the deterministic authored preview useful as a
    material-fidelity check.
    """

    mat = material(name, color, metallic, roughness)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    texture_path = ROOT / "public" / "textures" / texture_name
    image = bpy.data.images.load(str(texture_path), check_existing=True)
    image.colorspace_settings.name = "sRGB"
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = f"{name}_Texture"
    texture.image = image
    texture.extension = "REPEAT"
    mix = nodes.new("ShaderNodeMixRGB")
    mix.name = f"{name}_Tint"
    mix.blend_type = "MULTIPLY"
    mix.inputs[0].default_value = 1
    mix.inputs[2].default_value = (*color, 1)
    links.new(texture.outputs["Color"], mix.inputs[1])
    links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    bump = nodes.new("ShaderNodeBump")
    bump.name = f"{name}_Bump"
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.075
    links.new(texture.outputs["Color"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
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
    "wet_stone": material("SF_Wet_Plateau", (0.075, 0.105, 0.12), 0.05, 0.48),
    "wood": material("SF_Storm_Wood", (0.24, 0.13, 0.065), 0, 0.86),
    "rope": material("SF_Braided_Rope", (0.41, 0.30, 0.16), 0, 0.96),
    "cloth_blue": material("SF_Cloth_Indigo", (0.035, 0.12, 0.24), 0, 0.88),
    "cloth_red": material("SF_Cloth_Maroon", (0.31, 0.055, 0.065), 0, 0.9),
    "plaster_blue": material("SF_Painted_Plaster_Blue", (0.18, 0.42, 0.48), 0, 0.82),
    "plaster_rose": material("SF_Painted_Plaster_Rose", (0.55, 0.25, 0.22), 0, 0.86),
    "tile": material("SF_Glazed_Tile", (0.08, 0.42, 0.46), 0.12, 0.32),
    "copper": material("SF_Patinated_Copper", (0.16, 0.38, 0.34), 0.62, 0.42),
    "glass_dark": material(
        "SF_Dark_Stormglass",
        (0.025, 0.12, 0.15),
        0.32,
        0.2,
        (0.02, 0.28, 0.32),
        0.85,
    ),
}

p.update(
    {
        "kh_plaster_red": textured_material(
            "SF_Kharbranth_Plaster_Red",
            (0.48, 0.19, 0.13),
            "kharbranth-plaster-realistic.jpg",
        ),
        "kh_plaster_ochre": textured_material(
            "SF_Kharbranth_Plaster_Ochre",
            (0.56, 0.35, 0.13),
            "kharbranth-plaster-realistic.jpg",
        ),
        "kh_plaster_teal": textured_material(
            "SF_Kharbranth_Plaster_Teal",
            (0.08, 0.32, 0.34),
            "kharbranth-plaster-realistic.jpg",
        ),
        "kh_plaster_ivory": textured_material(
            "SF_Kharbranth_Plaster_Ivory",
            (0.56, 0.53, 0.45),
            "kharbranth-plaster-realistic.jpg",
        ),
        "kh_stone": textured_material(
            "SF_Kharbranth_Wet_Stone",
            (0.48, 0.5, 0.51),
            "kharbranth-stone-realistic.jpg",
            0.03,
            0.58,
            0.22,
        ),
        "kh_cliff": textured_material(
            "SF_Kharbranth_Stormcut_Cliff",
            (0.18, 0.2, 0.2),
            "kharbranth-stone-realistic.jpg",
            0.02,
            0.78,
            0.34,
        ),
    }
)


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


def join_meshes(name, objects, parent=None):
    """Join decorative primitives into one draw-call-friendly authored mesh."""

    meshes = [obj for obj in objects if obj and obj.type == "MESH"]
    if not meshes:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    result = meshes[0]
    result.name = name
    if parent:
        result.parent = parent
    return result


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
    rng = random.Random(73191)

    # Kharbranth occupies a broad crack that opens toward the harbor. The rear
    # prisms are only dark backing; dozens of overlapping storm-cut ribs form
    # the visible canyon silhouette so the walls never read as two flat slabs.
    for side in (-1, 1):
        points = [
            (side * 6.15, -5.35),
            (side * 8.0, -4.85),
            (side * 8.25, -0.8),
            (side * 7.85, 5.25),
            (side * 6.45, 6.15),
            (side * 5.95, 4.3),
            (side * 5.82, 0.4),
        ]
        prism(
            f"Kharbranth_Cliff_Wall_{'West' if side < 0 else 'East'}",
            points,
            7.8,
            p["kh_cliff"],
            r,
            3.2,
        )

        # Two staggered fields of elongated boulders create ledges, crevices
        # and a ragged inner edge. The denser inner field is what frames the
        # city when approached from the sea.
        for ridge in range(18):
            band = ridge % 9
            outer = ridge // 9
            y = -4.65 + band * 1.25 + outer * 0.28
            inner_edge = 4.2 + band * 0.035
            x = side * (
                inner_edge
                + outer * 0.78
                + rng.uniform(-0.22, 0.25)
            )
            base_z = 0.75 + band * 0.49 + outer * 0.58
            ridge_obj = sphere(
                f"Kharbranth_Cliff_Ridge_{side}_{ridge + 1:02d}",
                (x, y, base_z),
                (
                    0.7 + rng.random() * 0.38,
                    0.82 + rng.random() * 0.42,
                    1.3 + rng.random() * 0.72,
                ),
                p["kh_cliff"] if ridge % 3 else p["wet_stone"],
                r,
                14,
                8,
            )
            ridge_obj.rotation_euler[0] = rng.uniform(-0.08, 0.08)
            ridge_obj.rotation_euler[1] = side * rng.uniform(0.09, 0.24)
            ridge_obj.rotation_euler[2] = side * rng.uniform(-0.14, 0.12)

        # Horizontal strata catch the grazing harbor light and give the
        # storm-cut canyon a geological scale that small houses can sit against.
        strata = []
        for stratum in range(10):
            y = -4.25 + stratum * 1.02
            z = 1.25 + stratum * 0.5
            ledge = cube(
                f"Kharbranth_Cliff_Stratum_{side}_{stratum + 1:02d}",
                (side * (4.22 + rng.uniform(0.05, 0.42)), y, z),
                (0.52, 0.52, 0.075),
                p["wet_stone"],
                r,
                0.065,
            )
            ledge.rotation_euler[1] = side * rng.uniform(-0.18, 0.16)
            ledge.rotation_euler[2] = side * rng.uniform(-0.11, 0.11)
            strata.append(ledge)
        join_meshes(
            f"Kharbranth_Cliff_Strata_{'West' if side < 0 else 'East'}",
            strata,
            r,
        )

    colors = [
        p["kh_plaster_red"],
        p["kh_plaster_ochre"],
        p["kh_plaster_teal"],
        p["kh_plaster_ivory"],
    ]
    roof_colors = [p["copper"], p["slate"], p["terracotta"], p["tile"]]

    # The first six tiers share the exact road elevations consumed by the web
    # surface sampler. Houses rise behind those roads, leaving the switchback
    # circulation itself walkable.
    for tier in range(6):
        road_y = -2.52 + tier * 1.02
        road_z = 1.075 + tier * 0.52
        half_width = 4.65 - tier * 0.34
        cube(
            f"Kharbranth_Terrace_{tier + 1:02d}",
            (0, road_y + 0.34, road_z - 0.32),
            (half_width + 0.25, 0.54, 0.26),
            p["kh_stone"],
            r,
            0.045,
        )

        # Each horizontal flight visibly rises across the city. Alternating end
        # stairs join one flight to the next, making the Ralinsa continuous.
        treads = []
        tread_count = 24
        direction = 1 if tier % 2 == 0 else -1
        for step in range(tread_count):
            progress = step / (tread_count - 1)
            x = direction * (-half_width + 0.2 + progress * (2 * half_width - 0.4))
            tread = cube(
                f"Kharbranth_Ralinsa_Tier_{tier + 1:02d}_Tread_{step + 1:02d}",
                (x, road_y - 0.3, road_z + progress * 0.16),
                (half_width / tread_count + 0.015, 0.3, 0.035),
                p["stone_light"],
                r,
                0.012,
            )
            treads.append(tread)
        join_meshes(f"Kharbranth_Ralinsa_Run_{tier + 1:02d}", treads, r)

        if tier < 5:
            connector_x = direction * (half_width - 0.2)
            connector = []
            for step in range(13):
                progress = step / 12
                connector.append(
                    cube(
                        f"Kharbranth_Ralinsa_Connector_{tier + 1:02d}_{step + 1:02d}",
                        (
                            connector_x,
                            road_y - 0.02 + progress * 0.98,
                            road_z + 0.17 + progress * 0.5,
                        ),
                        (0.31, 0.055, 0.03),
                        p["kh_stone"],
                        r,
                        0.01,
                    )
                )
            join_meshes(
                f"Kharbranth_Ralinsa_EndStair_{tier + 1:02d}",
                connector,
                r,
            )

        windows = []
        doors = []
        parapets = []
        balconies = []
        awnings = []
        bells = []
        house_count = 13 - tier
        spacing = (half_width * 2 - 0.8) / max(1, house_count - 1)
        for row in range(2):
            for house in range(house_count):
                x = (
                    -half_width
                    + 0.42
                    + house * spacing
                    + (spacing * 0.46 if row else 0)
                )
                if x > half_width - 0.3:
                    continue
                # Preserve a wide sight line and walking corridor for the
                # Ralinsa's long harbor-to-upper-city stair.
                if 2.58 < x < 3.82:
                    continue
                width = 0.25 + rng.random() * 0.14
                depth = 0.25 + rng.random() * 0.11
                height = (
                    0.5
                    + rng.random() * 0.5
                    + tier * 0.035
                    + row * 0.16
                )
                y = (
                    road_y
                    + 0.38
                    + row * 0.55
                    + rng.uniform(-0.035, 0.045)
                )
                z = road_z + 0.18 + row * 0.19 + height
                body_mat = colors[(house * 3 + tier + row * 2) % len(colors)]
                cube(
                    f"Kharbranth_House_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                    (x, y, z),
                    (width, depth, height),
                    body_mat,
                    r,
                    0.035,
                )

                # Painted blocks use small square windows, deep lintels, doors
                # and imperfect parapets instead of generic fantasy roofs.
                floors = 2 if height > 0.72 else 1
                for floor in range(floors):
                    window_z = z - height + 0.33 + floor * 0.48
                    for offset in (-0.11, 0.11):
                        if width < 0.29 and offset > 0:
                            continue
                        windows.append(
                            cube(
                                f"Kharbranth_Window_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}_{floor}_{offset}",
                                (x + offset, y - depth - 0.018, window_z),
                                (0.055, 0.018, 0.075),
                                p["glass_dark"],
                                r,
                                0.008,
                            )
                        )
                        windows.append(
                            cube(
                                f"Kharbranth_Window_Lintel_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}_{floor}_{offset}",
                                (x + offset, y - depth - 0.037, window_z + 0.095),
                                (0.075, 0.014, 0.018),
                                p["stone_light"],
                                r,
                                0.006,
                            )
                        )
                doors.append(
                    cube(
                        f"Kharbranth_Door_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                        (x, y - depth - 0.024, z - height + 0.19),
                        (0.08, 0.022, 0.19),
                        p["wood"],
                        r,
                        0.01,
                    )
                )
                parapets.append(
                    cube(
                        f"Kharbranth_RoofTrimFront_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                        (x, y - depth + 0.025, z + height + 0.045),
                        (width, 0.025, 0.045),
                        body_mat,
                        r,
                        0.006,
                    )
                )
                for side in (-1, 1):
                    parapets.append(
                        cube(
                            f"Kharbranth_RoofTrim_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}_{side}",
                            (x + side * (width - 0.025), y, z + height + 0.045),
                            (0.025, depth + 0.025, 0.045),
                            body_mat,
                            r,
                            0.006,
                        )
                    )

                if (house + tier + row) % 4 == 0:
                    balconies.append(
                        cube(
                            f"Kharbranth_Balcony_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                            (x, y - depth - 0.15, z + 0.05),
                            (width * 0.78, 0.14, 0.03),
                            p["wood"],
                            r,
                            0.01,
                        )
                    )
                    for side in (-1, 1):
                        balconies.append(
                            cyl(
                                f"Kharbranth_BalconyRail_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}_{side}",
                                (
                                    x + side * width * 0.65,
                                    y - depth - 0.25,
                                    z + 0.16,
                                ),
                                0.012,
                                0.25,
                                p["brass"],
                                r,
                                6,
                                0,
                            )
                        )
                if row == 0 and (house * 5 + tier) % 7 == 0:
                    canopy = cube(
                        f"Kharbranth_Awning_T{tier + 1:02d}_{house + 1:02d}",
                        (x, road_y - 0.1, road_z + 0.56),
                        (0.27, 0.28, 0.025),
                        p["cloth_blue"] if house % 2 else p["cloth_red"],
                        r,
                        0.008,
                    )
                    canopy.rotation_euler[0] = math.radians(10)
                    awnings.append(canopy)

                # Bells are everyday street furniture. Small brackets on
                # roughly every third front-row house create the City of Bells.
                if row == 0 and (house + tier * 2) % 3 == 0:
                    bracket_x = x + width * 0.72
                    bells.append(
                        cube(
                            f"Kharbranth_BellBracket_T{tier + 1:02d}_{house + 1:02d}",
                            (bracket_x, y - depth - 0.16, z + 0.34),
                            (0.11, 0.018, 0.018),
                            p["brass"],
                            r,
                            0.005,
                        )
                    )
                    bells.append(
                        cone(
                            f"Kharbranth_Bell_T{tier + 1:02d}_{house + 1:02d}",
                            (bracket_x + 0.08, y - depth - 0.16, z + 0.22),
                            0.065,
                            0.028,
                            0.105,
                            p["brass"],
                            r,
                            10,
                            0.008,
                        )
                    )

        join_meshes(f"Kharbranth_Window_Batch_{tier + 1:02d}", windows, r)
        join_meshes(f"Kharbranth_Door_Batch_{tier + 1:02d}", doors, r)
        join_meshes(f"Kharbranth_RoofTrim_Batch_{tier + 1:02d}", parapets, r)
        join_meshes(f"Kharbranth_Balcony_Batch_{tier + 1:02d}", balconies, r)
        join_meshes(f"Kharbranth_Awning_Batch_{tier + 1:02d}", awnings, r)
        join_meshes(f"Kharbranth_Bell_Batch_{tier + 1:02d}", bells, r)

    # The lower ward fills the visual and physical gap between quay and first
    # Ralinsa flight. Its taller inns and warehouses make the harbor feel like
    # the working entrance to a cosmopolitan city rather than a model display.
    lower_windows = []
    lower_details = []
    for block in range(15):
        x = -4.25 + block * 0.61
        if 2.55 < x < 3.85:
            continue
        width = 0.24 + rng.random() * 0.08
        depth = 0.38 + rng.random() * 0.1
        height = 0.56 + (block % 4) * 0.12 + rng.random() * 0.18
        y = -3.28 + (block % 2) * 0.12
        z = 0.64 + height
        body_mat = colors[(block + 1) % len(colors)]
        cube(
            f"Kharbranth_LowerWard_Block_{block + 1:02d}",
            (x, y, z),
            (width, depth, height),
            body_mat,
            r,
            0.035,
        )
        for floor in range(2 if height > 0.78 else 1):
            for offset in (-0.1, 0.1):
                lower_windows.append(
                    cube(
                        f"Kharbranth_LowerWard_Window_{block + 1:02d}_{floor}_{offset}",
                        (
                            x + offset,
                            y - depth - 0.02,
                            z - height + 0.34 + floor * 0.43,
                        ),
                        (0.052, 0.018, 0.068),
                        p["glass_dark"],
                        r,
                        0.008,
                    )
                )
        lower_details.append(
            cube(
                f"Kharbranth_LowerWard_Door_{block + 1:02d}",
                (x, y - depth - 0.025, z - height + 0.19),
                (0.075, 0.022, 0.19),
                p["wood"],
                r,
                0.01,
            )
        )
        lower_details.append(
            cube(
                f"Kharbranth_LowerWard_Parapet_{block + 1:02d}",
                (x, y - 0.02, z + height + 0.05),
                (width + 0.03, depth + 0.03, 0.05),
                body_mat,
                r,
                0.01,
            )
        )
    join_meshes("Kharbranth_LowerWard_WindowBatch", lower_windows, r)
    join_meshes("Kharbranth_LowerWard_DetailBatch", lower_details, r)

    # A long processional arm of the Ralinsa climbs beside the eastern blocks.
    # The tier flights remain the navigable switchback network; this broad run
    # makes that defining urban feature readable in the sea-facing hero view.
    ralinsa_steps = []
    ralinsa_curbs = []
    ralinsa_bells = []
    for step in range(40):
        progress = step / 39
        x = 3.3 - progress * 0.28
        y = -3.38 + progress * 6.85
        z = 1.1 + progress * 3.88
        ralinsa_steps.append(
            cube(
                f"Kharbranth_Ralinsa_Processional_Tread_{step + 1:02d}",
                (x, y, z),
                (0.55, 0.105, 0.055),
                p["stone_light"],
                r,
                0.012,
            )
        )
        for side in (-1, 1):
            ralinsa_curbs.append(
                cube(
                    f"Kharbranth_Ralinsa_Processional_Curb_{step + 1:02d}_{side}",
                    (x + side * 0.53, y, z + 0.07),
                    (0.035, 0.105, 0.09),
                    p["kh_stone"],
                    r,
                    0.01,
                )
            )
        if step % 6 == 2:
            bell_side = -1 if (step // 6) % 2 else 1
            bell_x = x + bell_side * 0.66
            ralinsa_bells.append(
                cyl(
                    f"Kharbranth_Ralinsa_Bellpost_{step + 1:02d}",
                    (bell_x, y, z + 0.42),
                    0.025,
                    0.72,
                    p["brass"],
                    r,
                    8,
                    0.005,
                )
            )
            ralinsa_bells.append(
                cone(
                    f"Kharbranth_Ralinsa_Bell_{step + 1:02d}",
                    (bell_x, y - 0.03, z + 0.78),
                    0.09,
                    0.025,
                    0.14,
                    p["brass"],
                    r,
                    10,
                    0.008,
                )
            )
    join_meshes("Kharbranth_Ralinsa_Processional_Run", ralinsa_steps, r)
    join_meshes("Kharbranth_Ralinsa_Processional_CurbBatch", ralinsa_curbs, r)
    join_meshes("Kharbranth_Ralinsa_Processional_BellBatch", ralinsa_bells, r)

    # The hospitals and royal complex terminate the canyon vista. They are a
    # pale, horizontally layered civic ensemble with deep arcades rather than
    # a generic fantasy castle; the Palanaeum itself remains implied below.
    cube(
        "Kharbranth_Civic_Foundation",
        (0, 4.1, 4.82),
        (3.62, 0.72, 0.3),
        p["kh_stone"],
        r,
        0.06,
    )
    civic_parts = [
        ("WestHospital", -2.25, 3.88, 5.62, 1.25, 0.54, 0.72),
        ("Conclave", 0, 4.22, 6.08, 1.7, 0.64, 1.02),
        ("EastHospital", 2.25, 3.88, 5.62, 1.25, 0.54, 0.72),
    ]
    for institution, x, y, z, width, depth, height in civic_parts:
        cube(
            f"Kharbranth_Institution_{institution}",
            (x, y, z),
            (width, depth, height),
            p["kh_plaster_ivory"],
            r,
            0.055,
        )
        cube(
            f"Kharbranth_Institution_{institution}_Cornice",
            (x, y - depth - 0.06, z + height - 0.06),
            (width + 0.11, 0.09, 0.07),
            p["kh_stone"],
            r,
            0.018,
        )
        cube(
            f"Kharbranth_Institution_{institution}_Roof",
            (x, y, z + height + 0.16),
            (width + 0.12, depth + 0.1, 0.15),
            p["kh_stone"],
            r,
            0.03,
        )
        portal_count = 7 if institution == "Conclave" else 5
        portal_span = width * 1.48
        civic_details = []
        for portal in range(portal_count):
            portal_x = x - portal_span / 2 + portal * portal_span / (portal_count - 1)
            for side in (-1, 1):
                civic_details.append(
                    cube(
                        f"Kharbranth_Institution_{institution}_Portal_{portal + 1:02d}_{side}",
                        (portal_x + side * 0.07, y - depth - 0.038, z - 0.2),
                        (0.035, 0.035, 0.38),
                        p["stone_light"],
                        r,
                        0.012,
                    )
                )
            civic_details.append(
                cone(
                    f"Kharbranth_Institution_{institution}_PortalArch_{portal + 1:02d}",
                    (portal_x, y - depth - 0.07, z + 0.18),
                    0.12,
                    0.04,
                    0.16,
                    p["stone_light"],
                    r,
                    12,
                    0.01,
                )
            )
            if institution == "Conclave":
                civic_details.append(
                    cube(
                        f"Kharbranth_Institution_{institution}_UpperWindow_{portal + 1:02d}",
                        (portal_x, y - depth - 0.052, z + 0.58),
                        (0.055, 0.022, 0.1),
                        p["glass_dark"],
                        r,
                        0.008,
                    )
                )
        join_meshes(
            f"Kharbranth_Institution_{institution}_FacadeBatch",
            civic_details,
            r,
        )

    # A stepped archive tower and two low lantern domes reproduce the civic
    # skyline in the accepted visual target without inventing a needle-spired
    # cathedral silhouette.
    for level in range(3):
        cube(
            f"Kharbranth_Conclave_UpperLevel_{level + 1:02d}",
            (0, 4.35 + level * 0.04, 7.32 + level * 0.42),
            (1.28 - level * 0.2, 0.52 - level * 0.055, 0.24),
            p["kh_plaster_ivory"],
            r,
            0.04,
        )
    for side in (-1, 1):
        cyl(
            f"Kharbranth_Hospital_Lantern_{side}",
            (side * 2.25, 3.87, 6.63),
            0.34,
            0.34,
            p["kh_plaster_ivory"],
            r,
            16,
            0.02,
        )
        sphere(
            f"Kharbranth_Hospital_Dome_{side}",
            (side * 2.25, 3.87, 6.88),
            (0.46, 0.46, 0.25),
            p["copper"],
            r,
            18,
            9,
        )
        cone(
            f"Kharbranth_Hospital_Finial_{side}",
            (side * 2.25, 3.87, 7.18),
            0.06,
            0.015,
            0.28,
            p["brass"],
            r,
            10,
            0.01,
        )

    # A restrained harbor signal tower provides the one larger bell silhouette.
    for side in (-1, 1):
        cube(
            f"Kharbranth_SignalTower_Pillar_{side}",
            (-2.95 + side * 0.23, -3.9, 2.05),
            (0.08, 0.13, 0.72),
            p["kh_stone"],
            r,
            0.025,
        )
    cone(
        "Kharbranth_SignalTower_Bell",
        (-2.95, -4.02, 2.15),
        0.2,
        0.075,
        0.3,
        p["brass"],
        r,
        14,
        0.018,
    )
    roof = cone(
        "Kharbranth_SignalTower_Roof",
        (-2.95, -3.9, 2.86),
        0.52,
        0.08,
        0.42,
        roof_colors[0],
        r,
        8,
        0.025,
    )
    roof.rotation_euler[2] = math.pi / 8

    # Working harbor foreground: arcaded quay, four piers, boats, mast-and-sail
    # silhouettes, cargo and cranes. The sea itself remains a live shader.
    cube(
        "Kharbranth_Harbor_Quay",
        (0, -4.15, 0.42),
        (4.55, 0.52, 0.22),
        p["kh_stone"],
        r,
        0.045,
    )
    arcade = []
    for arch in range(10):
        x = -4.0 + arch * 0.88
        cone(
            f"Kharbranth_QuayArcade_Arch_{arch + 1:02d}",
            (x, -4.69, 1.13),
            0.27,
            0.14,
            0.24,
            p["kh_stone"],
            r,
            12,
            0.012,
        )
        for side in (-1, 1):
            arcade.append(
                cube(
                    f"Kharbranth_QuayArcade_Pillar_{arch + 1:02d}_{side}",
                    (x + side * 0.17, -4.66, 0.82),
                    (0.055, 0.09, 0.38),
                    p["kh_stone"],
                    r,
                    0.012,
                )
            )
    join_meshes("Kharbranth_QuayArcade_PillarBatch", arcade, r)

    harbor_details = []
    for dock in range(4):
        x = -3.45 + dock * 2.25
        dock_obj = cube(
            f"Kharbranth_Dock_{dock + 1:02d}",
            (x, -5.48, 0.25),
            (0.63, 1.15, 0.07),
            p["wood"],
            r,
            0.018,
        )
        for piling in (-1, -0.45, 0.45, 1):
            harbor_details.append(
                cyl(
                    f"Kharbranth_DockPiling_{dock + 1:02d}_{piling}",
                    (x + (0.54 if piling > 0 else -0.54), -5.48 + piling * 0.88, 0.08),
                    0.045,
                    0.82,
                    p["wood"],
                    r,
                    8,
                    0,
                )
            )
        hull = cube(
            f"Kharbranth_Harbor_Skiff_{dock + 1:02d}",
            (x + 0.72, -6.28, 0.18),
            (0.78, 0.19, 0.12),
            p["terracotta"] if dock % 2 else p["wood"],
            r,
            0.07,
        )
        hull.rotation_euler[2] = -0.12 + dock * 0.07
        mast = cyl(
            f"Kharbranth_Harbor_Mast_{dock + 1:02d}",
            (x + 0.72, -6.28, 0.95),
            0.025,
            1.55,
            p["wood"],
            r,
            8,
            0,
        )
        sail = cube(
            f"Kharbranth_Harbor_Sail_{dock + 1:02d}",
            (x + 0.95, -6.27, 1.16),
            (0.22, 0.018, 0.48),
            p["cloth_red"] if dock % 2 else p["cloth_blue"],
            r,
            0.006,
        )
        sail.rotation_euler[1] = -0.16

    for cargo in range(24):
        x = -4.05 + (cargo % 12) * 0.72
        y = -4.82 - (cargo // 12) * 0.34
        harbor_details.append(
            cube(
                f"Kharbranth_Harbor_Crate_{cargo + 1:02d}",
                (x, y, 0.66 + (cargo % 3) * 0.08),
                (0.13 + (cargo % 2) * 0.035, 0.12, 0.11),
                p["wood"],
                r,
                0.012,
            )
        )
    join_meshes("Kharbranth_Harbor_TrimCargoBatch", harbor_details, r)

    for crane_index, x in enumerate((-2.15, 2.25)):
        cyl(
            f"Kharbranth_DockCrane_Mast_{crane_index + 1:02d}",
            (x, -4.85, 1.33),
            0.055,
            1.75,
            p["wood"],
            r,
            10,
            0.01,
        )
        boom = cube(
            f"Kharbranth_DockCrane_Boom_{crane_index + 1:02d}",
            (x + 0.38, -4.85, 2.02),
            (0.48, 0.04, 0.045),
            p["wood"],
            r,
            0.012,
        )
        boom.rotation_euler[1] = -0.26
        cyl(
            f"Kharbranth_DockCrane_Rope_{crane_index + 1:02d}",
            (x + 0.78, -4.85, 1.45),
            0.012,
            1.05,
            p["rope"],
            r,
            6,
            0,
        )

    # Thin gravity drains visually connect the terraces and reinforce that the
    # city is engineered for violent runoff.
    for drain_index, x in enumerate((-3.15, -0.85, 1.55, 3.25)):
        drain = cube(
            f"Kharbranth_GravityDrain_{drain_index + 1:02d}",
            (x, 0.15, 3.1),
            (0.055, 3.15, 0.045),
            p["slate"],
            r,
            0.012,
        )
        drain.rotation_euler[0] = -0.62


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
    for path in range(4):
        angle = -0.5 + path * 0.36
        for plank in range(9):
            radius = 1.1 + plank * 0.33
            x = math.cos(angle) * radius
            y = math.sin(angle) * radius
            board = cube(
                f"Purelake_Walkway_{path + 1}_{plank + 1:02d}",
                (x, y, 0.41 + (plank % 2) * 0.012),
                (0.19, 0.34, 0.035),
                p["wood"],
                r,
                0.018,
            )
            board.rotation_euler[2] = angle
    for frame in range(5):
        angle = frame * 1.17
        x, y = math.cos(angle) * 3.9, math.sin(angle) * 2.6
        for side in (-1, 1):
            cyl(
                f"Purelake_NetFrame_{frame + 1}_{side}",
                (x + side * 0.36, y, 0.82),
                0.025,
                1.2,
                p["wood"],
                r,
                8,
                0,
            )
        for line in range(5):
            cube(
                f"Purelake_NetLine_{frame + 1}_{line + 1}",
                (x - 0.32 + line * 0.16, y, 0.82),
                (0.012, 0.02, 0.42),
                p["rope"],
                r,
                0,
            )


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
    # A working warcamp edge: wet paving, scaffolds, stores, shelters and bridge
    # components make the plateau feel occupied at close LOD.
    for row in range(5):
        for column in range(6):
            x = -4.45 + column * 0.34
            y = -1.35 + row * 0.34
            slab = cube(
                f"Warcamp_Paving_{row + 1}_{column + 1}",
                (x, y, 1.18 + ((row + column) % 3) * 0.012),
                (0.155, 0.155, 0.028),
                p["wet_stone"] if (row + column) % 4 else p["stone_light"],
                r,
                0.025,
            )
            slab.rotation_euler[2] = ((row * 7 + column * 3) % 5 - 2) * 0.025
    for bay in range(4):
        x = -3.8 + bay * 0.48
        for side in (-1, 1):
            cyl(
                f"Warcamp_Scaffold_Post_{bay + 1}_{side}",
                (x, -2.55 + side * 0.48, 1.88),
                0.035,
                1.55,
                p["wood"],
                r,
                8,
                0,
            )
        beam = cyl(
            f"Warcamp_Scaffold_Beam_{bay + 1}",
            (x, -2.55, 2.32),
            0.03,
            1.15,
            p["rope"],
            r,
            8,
            0,
        )
        beam.rotation_euler[0] = math.pi / 2
    for tent in range(4):
        x = -5.2 + tent * 0.72
        y = 1.65 + (tent % 2) * 0.55
        cone(
            f"Warcamp_StormTent_{tent + 1}",
            (x, y, 1.58),
            0.48,
            0.08,
            0.82,
            p["cloth_blue"] if tent % 2 else p["cloth_red"],
            r,
            4,
            0.025,
        ).rotation_euler[2] = math.pi / 4
        cube(
            f"Warcamp_TentWall_{tent + 1}",
            (x, y, 1.25),
            (0.42, 0.36, 0.24),
            p["cloth_blue"] if tent % 2 else p["cloth_red"],
            r,
            0.025,
        )
    for crate_index in range(14):
        x = -5.45 + (crate_index % 5) * 0.26
        y = -2.2 + (crate_index // 5) * 0.28
        cube(
            f"Warcamp_Crate_{crate_index + 1:02d}",
            (x, y, 1.32 + (crate_index % 2) * 0.13),
            (0.115, 0.115, 0.12),
            p["wood"],
            r,
            0.02,
        )


def build_detail_modules() -> None:
    awning = root("Module_Storm_Awning", (20, 20, 0))
    for side in (-1, 1):
        cyl(
            f"Module_Awning_Post_{side}",
            (side * 0.75, 0, 0.7),
            0.05,
            1.4,
            p["wood"],
            awning,
            8,
            0,
        )
    canopy = cube(
        "Module_Awning_Canopy",
        (0, 0, 1.42),
        (0.95, 0.62, 0.05),
        p["cloth_blue"],
        awning,
        0.02,
    )
    canopy.rotation_euler[0] = math.radians(8)
    cube("Module_Awning_Counter", (0, 0.16, 0.6), (0.74, 0.28, 0.12), p["stone"], awning)

    arch = root("Module_Stone_Arch", (24, 20, 0))
    for side in (-1, 1):
        cube(
            f"Module_Arch_Pier_{side}",
            (side * 0.48, 0, 0.68),
            (0.16, 0.28, 0.68),
            p["stone_light"],
            arch,
            0.07,
        )
    cube("Module_Arch_Lintel", (0, 0, 1.38), (0.72, 0.28, 0.16), p["stone_light"], arch, 0.08)
    torus(
        "Module_Arch_Brass_Bell",
        (0, -0.04, 1.03),
        0.18,
        0.035,
        p["brass"],
        arch,
        (math.pi / 2, 0, 0),
    )

    stall = root("Module_Market_Stall", (28, 20, 0))
    cube("Module_Stall_Table", (0, 0, 0.58), (0.82, 0.34, 0.1), p["wood"], stall)
    for side in (-1, 1):
        cyl(
            f"Module_Stall_Post_{side}",
            (side * 0.68, 0, 1),
            0.035,
            1.8,
            p["wood"],
            stall,
            8,
            0,
        )
    cube("Module_Stall_Canopy", (0, 0, 1.85), (0.92, 0.58, 0.055), p["cloth_red"], stall, 0.02)
    for basket in range(4):
        cyl(
            f"Module_Stall_Basket_{basket + 1}",
            (-0.48 + basket * 0.31, -0.02, 0.82),
            0.12,
            0.13,
            p["rope"],
            stall,
            10,
            0.015,
        )

    crane = root("Module_Dock_Crane", (32, 20, 0))
    cyl("Module_Crane_Mast", (0, 0, 1.35), 0.07, 2.7, p["wood"], crane, 10, 0)
    boom = cyl("Module_Crane_Boom", (0.62, 0, 2.35), 0.055, 1.5, p["wood"], crane, 10, 0)
    boom.rotation_euler[1] = math.pi / 2
    cube("Module_Crane_Rope", (1.28, 0, 1.65), (0.018, 0.018, 0.72), p["rope"], crane, 0)
    torus("Module_Crane_Hook", (1.28, 0, 0.92), 0.1, 0.025, p["brass"], crane, (math.pi / 2, 0, 0))

    bridge = root("Module_Rope_Bridge", (36, 20, 0))
    for index in range(13):
        x = -1.8 + index * 0.3
        cube(
            f"Module_RopeBridge_Slat_{index + 1:02d}",
            (x, 0, 0.1 - 0.18 * math.sin(index / 12 * math.pi)),
            (0.13, 0.46, 0.045),
            p["wood"],
            bridge,
            0.018,
        )
        for side in (-1, 1):
            cyl(
                f"Module_RopeBridge_Post_{index + 1:02d}_{side}",
                (x, side * 0.42, 0.42),
                0.025,
                0.72,
                p["rope"],
                bridge,
                8,
                0,
            )
    for side in (-1, 1):
        rail = cyl(
            f"Module_RopeBridge_Rail_{side}",
            (0, side * 0.44, 0.62),
            0.025,
            3.8,
            p["rope"],
            bridge,
            8,
            0,
        )
        rail.rotation_euler[1] = math.pi / 2

    run = root("Prop_Bridge_Run", (41, 20, 0))
    # This prop is authored in physical meters: a twelve-meter portable bridge,
    # a 2.8 m deck, and roughly 1.75 m carriers. Runtime converts it with the
    # same 1 local unit = 12 m calibration as every other close-detail actor.
    cube("BridgeRun_Deck", (0, 0, 2.05), (6, 1.35, 0.12), p["wood"], run, 0.035)
    for slat in range(24):
        cube(
            f"BridgeRun_Slat_{slat + 1:02d}",
            (-5.75 + slat * 0.5, 0, 2.2),
            (0.21, 1.43, 0.045),
            p["stone_light"] if slat % 4 == 0 else p["wood"],
            run,
            0.018,
        )
    bridge_skin = material("SF_Bridgeman_Skin", (0.32, 0.14, 0.07))
    bridge_cloth = material("SF_Bridgeman_Cloth", (0.26, 0.16, 0.09))
    # A historical Sadeas bridge crew numbered roughly 35–40. Thirty visible
    # carriers keep that mass legible at web scale while leaving space for the
    # bridge captain and reserve men represented by the surrounding crowd system.
    for runner in range(30):
        column = runner % 6
        row = runner // 6
        x = -4.6 + column * 1.84
        y = -1 + row * 0.5
        for side in (-1, 1):
            leg = cyl(
                f"BridgeRun_Runner_{runner + 1}_Leg_{side}",
                (x + side * 0.12, y, 0.48),
                0.075,
                0.78,
                p["stone_dark"],
                run,
                8,
                0.015,
            )
            leg.rotation_euler[1] = side * (0.25 if runner % 2 else -0.25)
        cone(
            f"BridgeRun_Runner_{runner + 1}_Torso",
            (x, y, 1.14),
            0.24,
            0.17,
            0.66,
            bridge_cloth,
            run,
            8,
            0.02,
        )
        for side in (-1, 1):
            cyl(
                f"BridgeRun_Runner_{runner + 1}_Arm_{side}",
                (x + side * 0.28, y, 1.55),
                0.065,
                0.58,
                bridge_cloth,
                run,
                8,
                0.012,
            )
        sphere(
            f"BridgeRun_Runner_{runner + 1}_Head",
            (x, y, 1.68),
            (0.15, 0.14, 0.17),
            bridge_skin,
            run,
            10,
            6,
        )


def build_fidelity_modules() -> None:
    """Human-scale modules used to break up procedural city repetition."""

    house = root("Module_Terraced_House", (-24, 26, 0))
    cube("TerracedHouse_Foundation", (0, 0, 0.16), (1.12, 0.82, 0.16), p["stone_dark"], house, 0.06)
    cube("TerracedHouse_Body", (0, 0, 0.94), (1.02, 0.72, 0.68), p["plaster_rose"], house, 0.09)
    cube("TerracedHouse_Cornice", (0, 0, 1.63), (1.12, 0.8, 0.09), p["ivory"], house, 0.04)
    roof = cube("TerracedHouse_Roof", (0, 0.02, 1.82), (1.16, 0.86, 0.16), p["teal"], house, 0.05)
    roof.rotation_euler[0] = math.radians(4)
    cube("TerracedHouse_Door", (0, -0.731, 0.62), (0.22, 0.025, 0.42), p["wood"], house, 0.025)
    for floor in range(2):
        for side in (-1, 1):
            x = side * 0.58
            z = 0.72 + floor * 0.58
            cube(f"TerracedHouse_Window_{floor}_{side}", (x, -0.738, z), (0.18, 0.022, 0.19), p["glass_dark"], house, 0.018)
            for shutter_side in (-1, 1):
                cube(
                    f"TerracedHouse_Shutter_{floor}_{side}_{shutter_side}",
                    (x + shutter_side * 0.235, -0.752, z),
                    (0.055, 0.025, 0.21),
                    p["slate"],
                    house,
                    0.012,
                )
    cube("TerracedHouse_Balcony", (0, -0.92, 1.2), (0.72, 0.28, 0.055), p["wood"], house, 0.025)
    for rail in range(7):
        cyl(
            f"TerracedHouse_Baluster_{rail + 1}",
            (-0.62 + rail * 0.205, -1.14, 1.46),
            0.022,
            0.5,
            p["brass"],
            house,
            8,
            0,
        )
    balcony_rail = cyl("TerracedHouse_BalconyRail", (0, -1.14, 1.7), 0.026, 1.45, p["brass"], house, 8, 0)
    balcony_rail.rotation_euler[1] = math.pi / 2
    cyl("TerracedHouse_Drain", (1.02, -0.66, 0.92), 0.03, 1.42, p["copper"], house, 8, 0)

    shelter = root("Module_Windbreak_House", (-17, 26, 0))
    cube("WindbreakHouse_Base", (0, 0.12, 0.18), (1.35, 0.98, 0.18), p["stone_dark"], shelter, 0.07)
    cube("WindbreakHouse_Core", (0, 0.25, 0.93), (1.05, 0.72, 0.64), p["stone"], shelter, 0.1)
    windwall = cube("WindbreakHouse_Wall", (0, -0.62, 1.1), (1.42, 0.16, 1.04), p["stone_light"], shelter, 0.08)
    windwall.rotation_euler[0] = math.radians(-9)
    for side in (-1, 1):
        buttress = cube(
            f"WindbreakHouse_Buttress_{side}",
            (side * 1.16, -0.48, 0.72),
            (0.18, 0.42, 0.72),
            p["stone_dark"],
            shelter,
            0.06,
        )
        buttress.rotation_euler[1] = side * math.radians(7)
    cube("WindbreakHouse_ShelteredDoor", (0, 0.98, 0.68), (0.25, 0.035, 0.46), p["wood"], shelter, 0.025)
    for side in (-1, 1):
        cube(f"WindbreakHouse_Window_{side}", (side * 0.58, 0.978, 1.12), (0.18, 0.025, 0.2), p["cyan"], shelter, 0.016)
    cube("WindbreakHouse_Roof", (0, 0.18, 1.72), (1.16, 0.82, 0.14), p["slate"], shelter, 0.05)
    for slot in range(5):
        cube(
            f"WindbreakHouse_StormSlot_{slot + 1}",
            (-0.72 + slot * 0.36, -0.79, 1.18),
            (0.075, 0.025, 0.18),
            p["glass_dark"],
            shelter,
            0.012,
        )

    arcade = root("Module_Azish_Arcade", (-10, 26, 0))
    cube("AzishArcade_Platform", (0, 0, 0.12), (1.65, 0.82, 0.12), p["ochre"], arcade, 0.06)
    for column in range(6):
        x = -1.32 + column * 0.528
        cyl(f"AzishArcade_Column_{column + 1}", (x, -0.62, 0.92), 0.09, 1.52, p["ivory"], arcade, 10, 0.022)
        cyl(f"AzishArcade_Capital_{column + 1}", (x, -0.62, 1.68), 0.16, 0.12, p["brass"], arcade, 10, 0.015)
    cube("AzishArcade_Lintel", (0, -0.62, 1.82), (1.58, 0.2, 0.15), p["ivory"], arcade, 0.05)
    cube("AzishArcade_Hall", (0, 0.22, 1.0), (1.48, 0.62, 0.78), p["stone_light"], arcade, 0.08)
    sphere("AzishArcade_Dome", (0, 0.22, 1.9), (0.94, 0.82, 0.48), p["tile"], arcade, 20, 10)
    cyl("AzishArcade_Finial", (0, 0.22, 2.42), 0.1, 0.52, p["brass"], arcade, 10, 0.02)
    for tile in range(9):
        cube(
            f"AzishArcade_Tile_{tile + 1}",
            (-1.28 + tile * 0.32, -0.835, 0.16),
            (0.13, 0.018, 0.13),
            p["tile"] if tile % 2 else p["ivory"],
            arcade,
            0.01,
        )

    farm = root("Module_Shin_Farmstead", (-3, 26, 0))
    cube("ShinFarmstead_House", (-0.45, 0.15, 0.72), (0.88, 0.68, 0.62), p["earth"], farm, 0.15)
    farm_roof = cone("ShinFarmstead_Roof", (-0.45, 0.15, 1.58), 1.18, 0.1, 0.68, p["terracotta"], farm, 4, 0.035)
    farm_roof.rotation_euler[2] = math.pi / 4
    for beam_index, x in enumerate((-0.92, -0.45, 0.02)):
        cube(f"ShinFarmstead_Timber_{beam_index + 1}", (x, -0.545, 0.78), (0.045, 0.035, 0.56), p["wood"], farm, 0.015)
    cube("ShinFarmstead_Door", (-0.45, -0.55, 0.54), (0.2, 0.035, 0.38), p["wood"], farm, 0.03)
    for row in range(5):
        cube(f"ShinFarmstead_Crop_{row + 1}", (1.02, -0.65 + row * 0.34, 0.16), (0.65, 0.08, 0.06), p["grass"], farm, 0.02)
    cyl("ShinFarmstead_TreeTrunk", (1.35, 0.82, 0.9), 0.12, 1.8, p["earth"], farm, 10, 0.02)
    sphere("ShinFarmstead_TreeCrown", (1.35, 0.82, 2.05), (0.72, 0.68, 0.84), p["leaf"], farm, 16, 9)
    for fence_index in range(7):
        cyl(
            f"ShinFarmstead_FencePost_{fence_index + 1}",
            (-1.55 + fence_index * 0.52, 1.18, 0.38),
            0.035,
            0.72,
            p["wood"],
            farm,
            8,
            0,
        )

    jetty = root("Module_Purelake_Jetty", (4, 26, 0))
    for plank in range(13):
        x = -1.65 + plank * 0.275
        cube(
            f"PurelakeJetty_Plank_{plank + 1:02d}",
            (x, 0, 0.42 + (plank % 3) * 0.012),
            (0.12, 0.42, 0.035),
            p["wood"],
            jetty,
            0.018,
        )
        if plank % 3 == 0:
            for side in (-1, 1):
                cyl(f"PurelakeJetty_Stilt_{plank + 1}_{side}", (x, side * 0.32, 0.18), 0.035, 0.72, p["wood"], jetty, 8, 0)
    cube("PurelakeJetty_HutFloor", (1.7, 0, 0.55), (0.72, 0.62, 0.1), p["stone"], jetty, 0.04)
    for side_x in (-1, 1):
        for side_y in (-1, 1):
            cyl("PurelakeJetty_HutStilt", (1.7 + side_x * 0.48, side_y * 0.4, 0.28), 0.045, 0.84, p["wood"], jetty, 8, 0)
    sphere("PurelakeJetty_RockbudHut", (1.7, 0, 1.12), (0.86, 0.76, 0.6), p["ivory"], jetty, 18, 9)
    for post in (-1, 1):
        cyl(f"PurelakeJetty_NetPost_{post}", (-0.55 + post * 0.45, -0.62, 1.0), 0.025, 1.35, p["wood"], jetty, 8, 0)
    for line in range(7):
        cube(f"PurelakeJetty_NetLine_{line + 1}", (-0.94 + line * 0.13, -0.62, 0.98), (0.008, 0.018, 0.46), p["rope"], jetty, 0)

    scaffold = root("Module_Warcamp_Scaffold", (11, 26, 0))
    cube("WarcampScaffold_Paving", (0, 0, 0.08), (1.65, 1.08, 0.08), p["wet_stone"], scaffold, 0.04)
    for x in (-1.25, -0.42, 0.42, 1.25):
        for y in (-0.78, 0.78):
            cyl("WarcampScaffold_Post", (x, y, 1.05), 0.045, 2.1, p["wood"], scaffold, 8, 0)
    for level in (0.72, 1.45, 2.08):
        for y in (-0.78, 0.78):
            beam = cyl("WarcampScaffold_LongBeam", (0, y, level), 0.038, 2.8, p["wood"], scaffold, 8, 0)
            beam.rotation_euler[1] = math.pi / 2
        cube("WarcampScaffold_Deck", (0, 0, level), (1.35, 0.82, 0.045), p["wood"], scaffold, 0.02)
    tent = cone("WarcampScaffold_StormTent", (-0.65, 0, 0.58), 0.52, 0.07, 0.92, p["cloth_blue"], scaffold, 4, 0.02)
    tent.rotation_euler[2] = math.pi / 4
    for crate_index in range(8):
        cube(
            f"WarcampScaffold_Crate_{crate_index + 1}",
            (0.62 + (crate_index % 3) * 0.28, -0.55 + (crate_index // 3) * 0.3, 0.25 + (crate_index % 2) * 0.2),
            (0.12, 0.12, 0.12),
            p["wood"],
            scaffold,
            0.018,
        )
    for bridge_part in range(7):
        cube(
            f"WarcampScaffold_BridgePart_{bridge_part + 1}",
            (-0.98 + bridge_part * 0.32, 0.5, 0.28 + bridge_part * 0.025),
            (0.14, 0.42, 0.035),
            p["wood"],
            scaffold,
            0.015,
        )

    ruin = root("Module_Aimian_Ruin", (18, 26, 0))
    cyl("AimianRuin_Platform", (0, 0, 0.14), 1.55, 0.28, p["stone_dark"], ruin, 16, 0.06)
    torus("AimianRuin_BrokenRing", (0, 0, 0.36), 1.05, 0.09, p["slate"], ruin)
    for index, angle in enumerate((0.15, 1.7, 3.0, 4.45, 5.55)):
        height = 0.75 + (index % 3) * 0.45
        x, y = math.cos(angle) * 1.08, math.sin(angle) * 1.08
        cyl(f"AimianRuin_Column_{index + 1}", (x, y, 0.3 + height / 2), 0.12, height, p["stone_light"], ruin, 8, 0.035)
        if index % 2 == 0:
            cone(f"AimianRuin_Spike_{index + 1}", (x, y, 0.55 + height), 0.18, 0.018, 0.9, p["stone_light"], ruin, 6, 0.025)
    for seam in range(6):
        angle = seam * math.pi / 3
        ray = cube(
            f"AimianRuin_StormlightSeam_{seam + 1}",
            (math.cos(angle) * 0.56, math.sin(angle) * 0.56, 0.34),
            (0.48, 0.025, 0.018),
            p["cyan"],
            ruin,
            0.008,
        )
        ray.rotation_euler[2] = angle

    gallery = root("Module_Urithiru_Gallery", (25, 26, 0))
    for tier in range(4):
        cube(
            f"UrithiruGallery_Stratum_{tier + 1}",
            (0, tier * 0.38, 0.22 + tier * 0.36),
            (1.55 - tier * 0.12, 0.64, 0.16),
            p["stone_light"] if tier % 2 else p["stone"],
            gallery,
            0.055,
        )
        cube(
            f"UrithiruGallery_ShadowBand_{tier + 1}",
            (0, -0.27 + tier * 0.38, 0.34 + tier * 0.36),
            (1.42 - tier * 0.12, 0.06, 0.035),
            p["stone_dark"],
            gallery,
            0.012,
        )
    for side in (-1, 1):
        cube(f"UrithiruGallery_Buttress_{side}", (side * 1.28, 0.42, 0.88), (0.16, 0.42, 0.88), p["stone_dark"], gallery, 0.05)
    for lamp in range(5):
        x = -1.05 + lamp * 0.525
        cyl(f"UrithiruGallery_LampStem_{lamp + 1}", (x, -0.36, 1.32), 0.025, 0.42, p["brass"], gallery, 8, 0)
        sphere(f"UrithiruGallery_Lamp_{lamp + 1}", (x, -0.36, 1.57), (0.08, 0.08, 0.11), p["cyan"], gallery, 10, 6)

    warehouse = root("Module_Thaylen_Warehouse", (32, 26, 0))
    cube("ThaylenWarehouse_Base", (0, 0, 0.16), (1.4, 0.9, 0.16), p["stone_dark"], warehouse, 0.06)
    cube("ThaylenWarehouse_Body", (0, 0, 0.94), (1.3, 0.82, 0.68), p["plaster_blue"], warehouse, 0.08)
    roof = cone("ThaylenWarehouse_Roof", (0, 0, 1.82), 1.72, 0.2, 0.66, p["slate"], warehouse, 4, 0.04)
    roof.rotation_euler[2] = math.pi / 4
    cube("ThaylenWarehouse_CargoDoor", (0, -0.835, 0.68), (0.48, 0.025, 0.5), p["wood"], warehouse, 0.025)
    for brace in (-0.85, 0, 0.85):
        cube("ThaylenWarehouse_Brace", (brace, -0.855, 1.06), (0.055, 0.025, 0.58), p["brass"], warehouse, 0.015)
    for barrel in range(5):
        cyl(f"ThaylenWarehouse_Barrel_{barrel + 1}", (-1.0 + barrel * 0.5, -1.06, 0.3), 0.16, 0.46, p["wood"], warehouse, 12, 0.02)

    caravan = root("Prop_Chull_Caravan", (39, 26, 0))
    sphere("ChullCaravan_Shell", (-0.45, 0, 0.72), (0.82, 0.55, 0.5), p["slate"], caravan, 16, 9)
    sphere("ChullCaravan_Body", (-0.62, 0, 0.46), (0.68, 0.38, 0.28), p["stone"], caravan, 14, 8)
    for leg_index in range(6):
        x = -1.05 + (leg_index % 3) * 0.48
        y = -0.34 if leg_index < 3 else 0.34
        leg = cyl(f"ChullCaravan_Leg_{leg_index + 1}", (x, y, 0.22), 0.055, 0.48, p["stone_dark"], caravan, 8, 0.015)
        leg.rotation_euler[1] = (-0.24 if leg_index % 2 else 0.24)
    cube("ChullCaravan_Wagon", (1.1, 0, 0.48), (0.95, 0.62, 0.28), p["wood"], caravan, 0.06)
    for side in (-1, 1):
        for x in (0.55, 1.65):
            torus("ChullCaravan_Wheel", (x, side * 0.66, 0.34), 0.28, 0.055, p["wood"], caravan, (math.pi / 2, 0, 0))
    cube("ChullCaravan_Canopy", (1.1, 0, 1.12), (0.92, 0.58, 0.08), p["cloth_red"], caravan, 0.03)
    for side in (-1, 1):
        cube("ChullCaravan_Harness", (0.2, side * 0.28, 0.46), (0.58, 0.025, 0.025), p["rope"], caravan, 0)


def build_actors() -> None:
    skin_dark = material("SF_Skin_Azish", (0.22, 0.09, 0.045))
    skin_brown = material("SF_Skin_Alethi", (0.38, 0.18, 0.09))
    skin_tan = material("SF_Skin_Purelaker", (0.52, 0.30, 0.16))
    skin_pale = material("SF_Skin_Shin", (0.72, 0.55, 0.43))
    singer_red = material("SF_Singer_Red", (0.48, 0.045, 0.025))
    singer_black = material("SF_Singer_Black", (0.025, 0.018, 0.017))
    aimian_skin = material("SF_Skin_Aimian_Blue", (0.20, 0.42, 0.58))
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
    actor = person_base("Actor_Veden", 20, skin_brown, p["cloth_red"], 1.04)
    cone("Actor_Veden_Hair", (0, 0.02, 1.88), 0.25, 0.09, 0.27, hair_black, actor, 12)
    cube("Actor_Veden_Longcoat", (0, 0.1, 0.84), (0.3, 0.08, 0.48), p["cloth_red"], actor, 0.035)
    cube("Actor_Veden_Sash", (0, -0.25, 1.12), (0.31, 0.025, 0.08), p["ochre"], actor, 0.015).rotation_euler[2] = -0.18
    actor = person_base("Actor_Aimian", 27, aimian_skin, grey, 1.1, 0.92)
    sphere("Actor_Aimian_Crown", (0, 0.02, 1.99), (0.21, 0.19, 0.18), hair_white, actor, 12, 7)
    for mark in (-1, 0, 1):
        stripe = cube(
            f"Actor_Aimian_SkinMark_{mark}",
            (mark * 0.075, -0.228, 1.82 + mark * 0.025),
            (0.018, 0.014, 0.15),
            p["cyan"],
            actor,
            0.008,
        )
        stripe.rotation_euler[2] = 0.22
    cone("Actor_Aimian_Mantle", (0, 0.04, 1.34), 0.42, 0.3, 0.28, p["slate"], actor, 10, 0.025)
    actor = person_base("Actor_Reshi", 34, skin_tan, p["grass"], 0.97, 1.02)
    cone("Actor_Reshi_Wrap", (0, 0.04, 0.72), 0.42, 0.29, 0.82, p["grass"], actor, 10)
    cone("Actor_Reshi_SunHat", (0, 0, 1.82), 0.5, 0.08, 0.18, p["ochre"], actor, 18, 0.02)
    for shell in range(5):
        angle = -0.7 + shell * 0.34
        sphere(
            f"Actor_Reshi_Shell_{shell + 1}",
            (math.sin(angle) * 0.31, -0.29, 1.28 + math.cos(angle) * 0.12),
            (0.055, 0.035, 0.07),
            p["brass"],
            actor,
            8,
            5,
        )


build_urithiru()
build_oathgate()
build_kharbranth()
build_kholinar()
build_azimir()
build_purelake()
build_shinovar()
build_akinah()
build_shattered_plains()
build_detail_modules()
build_fidelity_modules()
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
bpy.ops.mesh.primitive_cube_add(location=(8, 20, -0.15), scale=(36, 2.2, 0.15))
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
