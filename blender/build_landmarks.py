"""Build the original Stormfather landmark and inhabitant kit.

Run with:
    /Applications/Blender.app/Contents/MacOS/Blender \
      --background --python blender/build_landmarks.py

The script owns the empty background scene created by that command. It writes
the editable .blend, the web GLB, and a presentation render.
"""

from __future__ import annotations

import json
import math
import os
import random
from pathlib import Path

import bmesh
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
    "radiant_soft": material(
        "SF_Urithiru_Radiant_Stormlight",
        (0.16, 0.46, 0.54),
        0.12,
        0.32,
        (0.12, 0.58, 0.72),
        1.35,
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

city_surface = {
    "kholinar": textured_material(
        "SF_City_Kholinar_Stormstone_Timber",
        (0.78, 0.72, 0.64),
        "cities/alethi-kholinar-stormstone-timber-atlas.jpg",
        0.01,
        0.9,
        0.12,
    ),
    "azimir": textured_material(
        "SF_City_Azimir_Ochre_Inlay",
        (0.94, 0.83, 0.65),
        "cities/azimir-ochre-inlay-atlas.jpg",
        0.01,
        0.86,
        0.1,
    ),
    "urithiru": textured_material(
        "SF_City_Urithiru_Striated_Stone",
        (0.88, 0.87, 0.82),
        "cities/urithiru-striated-stone-atlas.jpg",
        0.01,
        0.88,
        0.09,
    ),
    "shinovar": textured_material(
        "SF_City_Shinovar_Earthen_Thatch",
        (0.9, 0.82, 0.68),
        "cities/shinovar-earthen-thatch-atlas.jpg",
        0,
        0.92,
        0.1,
    ),
    "purelake": textured_material(
        "SF_City_Purelake_Stone_Reed_Wood",
        (0.92, 0.85, 0.67),
        "cities/purelake-stone-reed-stiltwood-atlas.jpg",
        0,
        0.9,
        0.11,
    ),
    "akinah": textured_material(
        "SF_City_Akinah_Salt_Ruin_Stone",
        (0.76, 0.8, 0.82),
        "cities/akinah-salt-ruin-stone-atlas.jpg",
        0.01,
        0.93,
        0.14,
    ),
    "thaylen": textured_material(
        "SF_City_Thaylen_Coastal_Masonry",
        (0.86, 0.84, 0.78),
        "cities/thaylen-coastal-masonry-tile-dockwood-atlas.jpg",
        0.01,
        0.88,
        0.11,
    ),
    "shattered": textured_material(
        "SF_City_Shattered_Plains_Crem_Fracture",
        (0.7, 0.66, 0.57),
        "cities/shattered-plains-crem-fracture-atlas.jpg",
        0.01,
        0.94,
        0.15,
    ),
    "vedenar": textured_material(
        "SF_City_Vedenar_Stormstone_Restoration",
        (0.58, 0.59, 0.54),
        "cities/vedenar-stormstone-restoration-atlas.jpg",
        0.02,
        0.9,
        0.13,
    ),
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


def rock(name, location, scale, mat, parent=None, subdivisions=2):
    """Create a faceted storm-cut rock instead of a smooth decorative sphere."""

    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=1,
        location=location,
    )
    obj = link_asset(bpy.context.object)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if parent:
        obj.parent = parent
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return finish(obj, mat, 0.025, False)


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


def natural_terrain_cradle(
    name: str,
    outline: list[tuple[float, float]],
    top_z: float,
    shoulder_drop: float,
    toe_drop: float,
    cap_mat: bpy.types.Material,
    shoulder_mat: bpy.types.Material,
    toe_mat: bpy.types.Material,
    parent: bpy.types.Object,
    outer_scale: float = 1.18,
    shoulder_scale: float = 1.08,
    edge_subdivisions: int = 1,
    phase: float = 0,
) -> list[tuple[float, float, float]]:
    """Create a terrain-seated cap and an irregular, buried transition skirt.

    Landmark roots are placed against a sampled terrain datum in the runtime.
    A thin cylinder or rectangular slab exposes that single datum immediately:
    its edge either floats or clips as soon as the surrounding terrain slopes.
    These nested rings keep the authored walkable cap exact, then descend below
    the root origin through asymmetric shoulders and a ragged toe that can
    overlap the continental mesh without presenting a hard display-base edge.
    """

    if len(outline) < 3:
        raise ValueError(f"{name} terrain cradle needs at least three points")
    if edge_subdivisions < 1:
        raise ValueError(f"{name} edge subdivisions must be positive")

    dense_outline: list[tuple[float, float]] = []
    for index, start in enumerate(outline):
        end = outline[(index + 1) % len(outline)]
        for subdivision in range(edge_subdivisions):
            progress = subdivision / edge_subdivisions
            dense_outline.append(
                (
                    start[0] + (end[0] - start[0]) * progress,
                    start[1] + (end[1] - start[1]) * progress,
                )
            )

    signed_area = sum(
        dense_outline[index][0]
        * dense_outline[(index + 1) % len(dense_outline)][1]
        - dense_outline[(index + 1) % len(dense_outline)][0]
        * dense_outline[index][1]
        for index in range(len(dense_outline))
    )
    ordered = (
        dense_outline
        if signed_area > 0
        else list(reversed(dense_outline))
    )
    center_x = sum(point[0] for point in ordered) / len(ordered)
    center_y = sum(point[1] for point in ordered) / len(ordered)

    surface_vertices = [(center_x, center_y, top_z)] + [
        (x, y, top_z) for x, y in ordered
    ]
    surface_faces = [
        (0, index + 1, (index + 1) % len(ordered) + 1)
        for index in range(len(ordered))
    ]
    surface_mesh = bpy.data.meshes.new(f"{name}_Surface_Mesh")
    surface_mesh.from_pydata(surface_vertices, [], surface_faces)
    surface_mesh.update()
    surface = bpy.data.objects.new(f"{name}_Surface", surface_mesh)
    assets.objects.link(surface)
    surface.parent = parent
    surface["walkable_surface"] = True
    finish(surface, cap_mat)

    inner_ring = [(x, y, top_z) for x, y in ordered]
    shoulder_ring: list[tuple[float, float, float]] = []
    toe_ring: list[tuple[float, float, float]] = []
    for index, (x, y) in enumerate(ordered):
        dx = x - center_x
        dy = y - center_y
        shoulder_variation = (
            math.sin(index * 2.173 + phase) * 0.038
            + math.cos(index * 0.773 - phase) * 0.017
        )
        point_shoulder_scale = shoulder_scale + shoulder_variation
        shoulder_ring.append(
            (
                center_x + dx * point_shoulder_scale,
                center_y + dy * point_shoulder_scale,
                top_z
                - shoulder_drop
                * (0.82 + 0.16 * math.sin(index * 1.371 + phase)),
            )
        )

        toe_variation = (
            math.sin(index * 1.917 + phase * 1.3) * 0.075
            + math.cos(index * 0.613 - phase) * 0.032
        )
        point_scale = outer_scale + toe_variation
        toe_ring.append(
            (
                center_x + dx * point_scale,
                center_y + dy * point_scale,
                top_z
                - toe_drop
                * (0.9 + 0.13 * math.cos(index * 1.217 + phase)),
            )
        )

    ring_count = len(ordered)
    transition_vertices = inner_ring + shoulder_ring + toe_ring
    transition_faces: list[tuple[int, ...]] = []
    for index in range(ring_count):
        following = (index + 1) % ring_count
        transition_faces.append(
            (
                index,
                ring_count + index,
                ring_count + following,
                following,
            )
        )
    for index in range(ring_count):
        following = (index + 1) % ring_count
        transition_faces.append(
            (
                ring_count + index,
                2 * ring_count + index,
                2 * ring_count + following,
                ring_count + following,
            )
        )

    transition_mesh = bpy.data.meshes.new(f"{name}_Transition_Mesh")
    transition_mesh.from_pydata(
        transition_vertices,
        [],
        transition_faces,
    )
    transition_mesh.materials.append(shoulder_mat)
    transition_mesh.materials.append(toe_mat)
    for polygon_index, polygon in enumerate(transition_mesh.polygons):
        polygon.material_index = 0 if polygon_index < ring_count else 1
        polygon.use_smooth = False
    transition_mesh.update()
    transition = bpy.data.objects.new(
        f"{name}_Transition",
        transition_mesh,
    )
    assets.objects.link(transition)
    transition.parent = parent
    transition["terrain_support"] = True
    return toe_ring


def terrain_cradle_outcrops(
    name: str,
    toe_ring: list[tuple[float, float, float]],
    mat: bpy.types.Material,
    parent: bpy.types.Object,
    stride: int,
    size: float,
) -> bpy.types.Object | None:
    """Break the cradle toe into readable natural strata, not a smooth disk."""

    outcrops: list[bpy.types.Object] = []
    for outcrop_index, point_index in enumerate(
        range(0, len(toe_ring), stride)
    ):
        x, y, z = toe_ring[point_index]
        variation = 0.82 + 0.24 * math.sin(point_index * 1.73 + size)
        outcrops.append(
            rock(
                f"{name}_Outcrop_{outcrop_index + 1:02d}",
                (x, y, z + size * 0.16),
                (
                    size * variation,
                    size * (0.62 + 0.17 * math.cos(point_index * 1.11)),
                    size * (0.38 + 0.13 * math.sin(point_index * 0.91)),
                ),
                mat,
                parent,
                1,
            )
        )
    return join_meshes(f"{name}_OutcropBatch", outcrops, parent)


def join_meshes(name, objects, parent=None):
    """Join decorative primitives into one draw-call-friendly authored mesh."""

    meshes = [obj for obj in objects if obj and obj.type == "MESH"]
    if not meshes:
        return None
    if len(meshes) == 1:
        result = meshes[0]
        result.name = name
        if parent:
            result.parent = parent
        return result
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


def authored_city_block(
    name: str,
    location: tuple[float, float, float],
    half_extents: tuple[float, float, float],
    body_mat: bpy.types.Material,
    roof_mat: bpy.types.Material,
    parent: bpy.types.Object,
    runtime_scale: float,
    rotation: float = 0,
    roof_style: str = "flat",
    window_mat: bpy.types.Material | None = None,
    door_mat: bpy.types.Material | None = None,
    foundation_mat: bpy.types.Material | None = None,
    facade_columns: int = 2,
) -> bpy.types.Object:
    """Author a compact city building against the shared real-world scale.

    The block remains individually named for collision extraction while its
    door, windows, frames, roof and cornices are joined into one decoration
    mesh. This gives every culture true façade depth without multiplying web
    draw calls by every sill and shutter.
    """

    x, y, base_z = location
    width, depth, height = half_extents
    window_mat = window_mat or p["glass_dark"]
    door_mat = door_mat or p["wood"]
    foundation_mat = foundation_mat or p["stone_dark"]
    node = bpy.data.objects.new(f"{name}_Assembly", None)
    assets.objects.link(node)
    node.parent = parent
    node.location = (x, y, base_z)
    node.rotation_euler[2] = rotation

    foundation_height = max(0.1, 0.85 / (12 * runtime_scale))
    cube(
        f"{name}_TerrainFoundation",
        (0, 0.025, -foundation_height / 2 + 0.02),
        (width * 1.05, depth * 1.05, foundation_height / 2),
        foundation_mat,
        node,
        0.025,
    )
    cube(
        f"{name}_Building",
        (0, 0, height),
        (width, depth, height),
        body_mat,
        node,
        0.045,
    )

    details: list[bpy.types.Object] = []
    meters_per_authored_unit = 12 * runtime_scale
    door_half_width = 0.92 / (2 * meters_per_authored_unit)
    door_half_height = 2.08 / (2 * meters_per_authored_unit)
    window_half_width = 0.82 / (2 * meters_per_authored_unit)
    window_half_height = 1.14 / (2 * meters_per_authored_unit)
    full_height_meters = height * 2 * meters_per_authored_unit
    floors = max(1, min(6, round(full_height_meters / 3.1)))
    front_y = -depth - 0.018

    details.append(
        cube(
            f"{name}_Door",
            (0, front_y, door_half_height),
            (door_half_width, 0.025, door_half_height),
            door_mat,
            node,
            0.012,
        )
    )
    details.append(
        cube(
            f"{name}_DoorLintel",
            (0, front_y - 0.008, door_half_height * 2 + 0.025),
            (door_half_width * 1.35, 0.026, 0.025),
            roof_mat,
            node,
            0.008,
        )
    )

    usable_width = width * 1.42
    column_count = max(1, facade_columns)
    for floor in range(floors):
        window_z = (floor + 0.64) * (height * 2 / floors)
        for column in range(column_count):
            if column_count == 1:
                window_x = 0
            else:
                window_x = (
                    -usable_width / 2
                    + usable_width * column / (column_count - 1)
                )
            if floor == 0 and abs(window_x) < door_half_width * 2.2:
                continue
            details.append(
                cube(
                    f"{name}_Window_{floor + 1}_{column + 1}",
                    (window_x, front_y - 0.006, window_z),
                    (window_half_width, 0.018, window_half_height),
                    window_mat,
                    node,
                    0.008,
                )
            )
            for side in (-1, 1):
                details.append(
                    cube(
                        f"{name}_WindowFrame_{floor + 1}_{column + 1}_{side}",
                        (
                            window_x + side * (window_half_width + 0.016),
                            front_y - 0.012,
                            window_z,
                        ),
                        (0.012, 0.022, window_half_height * 1.16),
                        roof_mat,
                        node,
                        0.006,
                    )
                )
            details.append(
                cube(
                    f"{name}_WindowSill_{floor + 1}_{column + 1}",
                    (
                        window_x,
                        front_y - 0.014,
                        window_z - window_half_height - 0.018,
                    ),
                    (window_half_width * 1.3, 0.026, 0.016),
                    roof_mat,
                    node,
                    0.006,
                )
            )

    details.append(
        cube(
            f"{name}_Cornice",
            (0, 0, height * 2 + 0.045),
            (width * 1.07, depth * 1.07, 0.045),
            roof_mat,
            node,
            0.018,
        )
    )
    if roof_style == "dome":
        details.append(
            sphere(
                f"{name}_RoofDome",
                (0, 0, height * 2 + depth * 0.46),
                (width * 1.03, depth * 1.03, depth * 0.48),
                roof_mat,
                node,
                18,
                9,
            )
        )
    elif roof_style == "pitched":
        roof = cone(
            f"{name}_PitchedRoof",
            (0, 0, height * 2 + depth * 0.56),
            max(width, depth) * 1.28,
            max(width, depth) * 0.16,
            depth * 0.94,
            roof_mat,
            node,
            4,
            0.025,
        )
        roof.rotation_euler[2] = math.pi / 4
        details.append(roof)
    elif roof_style == "carapace":
        details.append(
            rock(
                f"{name}_CarapaceRoof",
                (0, 0.04, height * 2 + depth * 0.35),
                (width * 1.08, depth * 1.05, depth * 0.38),
                roof_mat,
                node,
                2,
            )
        )
    else:
        details.append(
            cube(
                f"{name}_FlatRoof",
                (0, 0, height * 2 + 0.11),
                (width * 1.04, depth * 1.04, 0.07),
                roof_mat,
                node,
                0.02,
            )
        )

    join_meshes(f"{name}_FacadeRoofBatch", details, node)
    return node


def build_urithiru() -> None:
    r = root("Landmark_Urithiru", (-22, -7, 0))
    runtime_scale = (4.2 * 2) / 11.784
    window_half_width = 0.86 / (2 * 12 * runtime_scale)
    window_half_height = 1.18 / (2 * 12 * runtime_scale)
    door_half_width = 1.15 / (2 * 12 * runtime_scale)
    door_half_height = 2.35 / (2 * 12 * runtime_scale)

    # The east elevation is local -Y, matching the reference sheet: the tower
    # presents its monumental, rounded face to the Oathgate approaches while
    # the west (+Y) elevation disappears into the mountain.
    mountain_outline = [
        (-5.88, -3.55),
        (-4.82, -4.74),
        (-1.58, -5.72),
        (2.72, -5.08),
        (5.34, -3.12),
        (5.78, 1.72),
        (3.58, 4.58),
        (0, 5.52),
        (-3.76, 4.68),
        (-5.72, 2.26),
    ]
    prism(
        "Urithiru_Mountain_Base",
        mountain_outline,
        1.4,
        p["stone_dark"],
        r,
        0.65,
    )
    rock(
        "Urithiru_Western_MountainMass",
        (-0.85, 3.18, 2.12),
        (4.82, 2.08, 2.48),
        p["stone_dark"],
        r,
        2,
    )
    rock(
        "Urithiru_Western_MountainRidge_North",
        (-3.82, 3.18, 2.28),
        (1.55, 1.82, 2.96),
        p["stone_dark"],
        r,
        2,
    )
    rock(
        "Urithiru_Western_MountainRidge_South",
        (3.48, 3.35, 1.92),
        (1.66, 1.62, 2.46),
        p["stone_dark"],
        r,
        2,
    )
    # The tower is not placed in front of a mountain: its rear strata vanish
    # into a high saddle, with storm-cut shoulders visibly embracing both
    # flanks. These overlapping masses preserve that relationship from oblique
    # city cameras while keeping the east elevation readable.
    rock(
        "Urithiru_Mountain_Embedded_Backbone",
        (0.08, 4.02, 5.05),
        (2.82, 1.36, 5.18),
        p["stone_dark"],
        r,
        3,
    )
    rock(
        "Urithiru_Mountain_Embrace_North",
        (-4.52, 2.76, 4.02),
        (1.62, 1.72, 4.28),
        p["stone_dark"],
        r,
        2,
    )
    rock(
        "Urithiru_Mountain_Embrace_South",
        (4.36, 2.84, 3.72),
        (1.74, 1.66, 3.92),
        p["stone_dark"],
        r,
        2,
    )
    rock(
        "Urithiru_Mountain_Cleft_North",
        (-2.78, 3.18, 3.12),
        (1.44, 1.18, 3.18),
        p["stone"],
        r,
        2,
    )
    rock(
        "Urithiru_Mountain_Cleft_South",
        (2.72, 3.26, 2.92),
        (1.5, 1.14, 2.92),
        p["stone"],
        r,
        2,
    )

    def semicircular_plan(
        half_width: float,
        front_depth: float,
        back_depth: float,
        segments: int = 14,
    ) -> list[tuple[float, float]]:
        """Return Urithiru's flat-backed, east-facing semicircular plan."""

        outline = [(-half_width, back_depth), (half_width, back_depth)]
        outline.extend(
            (
                half_width * math.cos(math.pi * segment / segments),
                -front_depth * math.sin(math.pi * segment / segments),
            )
            for segment in range(segments + 1)
        )
        return outline

    tier_specs = (
        (5.20, 3.45, 2.46, 0.78),
        (4.88, 3.23, 2.34, 0.76),
        (4.53, 3.02, 2.21, 0.74),
        (4.17, 2.80, 2.07, 0.72),
        (3.80, 2.57, 1.92, 0.70),
        (3.42, 2.34, 1.76, 0.67),
        (3.03, 2.10, 1.59, 0.64),
        (2.63, 1.85, 1.41, 0.61),
        (2.21, 1.59, 1.21, 0.58),
        (1.78, 1.30, 0.98, 0.55),
    )
    first_tier_plan = semicircular_plan(*tier_specs[0][:3])
    prism(
        "Urithiru_Terrain_Seated_Foundation",
        first_tier_plan,
        1.18,
        p["stone_dark"],
        r,
        0.43,
    )
    prism(
        "Urithiru_MountainCut_CeremonialApron",
        [
            (-5.2, -3.18),
            (5.2, -3.18),
            (4.42, -4.12),
            (2.42, -5.18),
            (-2.42, -5.18),
            (-4.42, -4.12),
        ],
        0.58,
        p["stone_dark"],
        r,
        0.83,
    )
    for retaining_index, (retaining_x, retaining_y, retaining_angle) in enumerate(
        (
            (-4.62, -3.55, -0.42),
            (-3.62, -4.34, -0.28),
            (3.62, -4.34, 0.28),
            (4.62, -3.55, 0.42),
        )
    ):
        retaining_wall = cube(
            f"Urithiru_MountainCut_RetainingWing_{retaining_index + 1:02d}",
            (retaining_x, retaining_y, 1.13),
            (0.98, 0.18, 0.42),
            city_surface["urithiru"],
            r,
            0.045,
        )
        retaining_wall.rotation_euler[2] = retaining_angle
    lower_buttresses = []
    for buttress_index in range(7):
        angle = -0.92 + buttress_index * (1.84 / 6)
        tangent = math.atan2(
            tier_specs[0][1] * math.sin(angle),
            tier_specs[0][0] * math.cos(angle),
        )
        buttress = cube(
            f"Urithiru_LowerRetainingButtress_{buttress_index + 1:02d}",
            (
                tier_specs[0][0] * math.sin(angle) * 0.99,
                -tier_specs[0][1] * math.cos(angle) - 0.12,
                1.35,
            ),
            (0.115, 0.28, 0.34),
            p["stone_dark"],
            r,
            0.025,
        )
        buttress.rotation_euler[2] = tangent
        lower_buttresses.append(buttress)
    join_meshes(
        "Urithiru_LowerRetainingButtressBatch",
        lower_buttresses,
        r,
    )

    tier_bottom = 1.02
    tier_tops: list[float] = []
    for tier_index, (width, front_depth, back_depth, tier_height) in enumerate(
        tier_specs
    ):
        tier_number = tier_index + 1
        tier_center = tier_bottom + tier_height / 2
        tier_top = tier_bottom + tier_height
        tier_tops.append(tier_top)
        tier_plan = semicircular_plan(width, front_depth, back_depth)
        prism(
            f"Urithiru_Stratum_{tier_number:02d}",
            tier_plan,
            tier_height,
            city_surface["urithiru"],
            r,
            tier_center,
        )
        prism(
            f"Urithiru_Shadow_Band_{tier_number:02d}",
            semicircular_plan(
                width + 0.07,
                front_depth + 0.07,
                back_depth + 0.07,
            ),
            0.09,
            p["stone_dark"],
            r,
            tier_top - 0.045,
        )
        prism(
            f"Urithiru_GrandTerrace_{tier_number:02d}",
            semicircular_plan(
                width + 0.16,
                front_depth + 0.17,
                back_depth + 0.10,
            ),
            0.075,
            p["stone_light"],
            r,
            tier_top + 0.018,
        )

        # Repeated vertical recesses and arch heads give the east face the
        # strongly ribbed, monumental cadence seen in both elevation studies.
        window_count = max(6, 15 - tier_index)
        facade_span = 2.12
        facade_details: list[bpy.types.Object] = []
        for window_index in range(window_count):
            facade_angle = (
                -facade_span / 2
                + facade_span * window_index / max(1, window_count - 1)
            )
            outward_x = math.sin(facade_angle)
            outward_y = -math.cos(facade_angle)
            window_x = width * math.sin(facade_angle) + outward_x * 0.055
            window_y = (
                -front_depth * math.cos(facade_angle) + outward_y * 0.055
            )
            tangent = math.atan2(
                front_depth * math.sin(facade_angle),
                width * math.cos(facade_angle),
            )
            bay_half_width = max(window_half_width * 1.72, 0.105)
            bay_half_height = max(window_half_height * 1.82, tier_height * 0.31)

            bay = cube(
                f"Urithiru_East_BayRecess_{tier_number:02d}_{window_index + 1:02d}",
                (window_x, window_y, tier_center - 0.015),
                (bay_half_width, 0.033, bay_half_height),
                p["slate"],
                r,
                0.012,
            )
            bay.rotation_euler[2] = tangent
            facade_details.append(bay)
            arch = cyl(
                f"Urithiru_East_BayArch_{tier_number:02d}_{window_index + 1:02d}",
                (
                    window_x,
                    window_y,
                    tier_center + bay_half_height - bay_half_width * 0.18,
                ),
                bay_half_width,
                0.07,
                p["slate"],
                r,
                16,
                0.008,
            )
            arch.rotation_euler[0] = math.pi / 2
            arch.rotation_euler[2] = tangent
            facade_details.append(arch)

            window = cube(
                f"Urithiru_East_Window_{tier_number:02d}_{window_index + 1:02d}",
                (
                    window_x + outward_x * 0.014,
                    window_y + outward_y * 0.014,
                    tier_center - 0.012,
                ),
                (window_half_width, 0.025, window_half_height),
                (
                    p["cyan"]
                    if (tier_index + window_index) % 5 == 0
                    else p["glass_dark"]
                ),
                r,
                0.01,
            )
            window.rotation_euler[2] = tangent
            sill = cube(
                f"Urithiru_East_WindowSill_{tier_number:02d}_{window_index + 1:02d}",
                (
                    window_x + outward_x * 0.018,
                    window_y + outward_y * 0.018,
                    tier_center - window_half_height - 0.022,
                ),
                (window_half_width * 1.34, 0.031, 0.018),
                p["stone_light"],
                r,
                0.006,
            )
            sill.rotation_euler[2] = tangent
            facade_details.append(sill)

        for rib_index in range(window_count + 1):
            rib_angle = (
                -facade_span / 2
                + facade_span * (rib_index - 0.5) / max(1, window_count - 1)
            )
            rib_angle = max(-0.94, min(0.94, rib_angle))
            outward_x = math.sin(rib_angle)
            outward_y = -math.cos(rib_angle)
            rib_x = width * math.sin(rib_angle) + outward_x * 0.105
            rib_y = -front_depth * math.cos(rib_angle) + outward_y * 0.105
            tangent = math.atan2(
                front_depth * math.sin(rib_angle),
                width * math.cos(rib_angle),
            )
            rib = cube(
                f"Urithiru_East_VerticalRib_{tier_number:02d}_{rib_index + 1:02d}",
                (rib_x, rib_y, tier_center),
                (0.034, 0.046, tier_height * 0.42),
                p["stone_light"],
                r,
                0.01,
            )
            rib.rotation_euler[2] = tangent
            facade_details.append(rib)

        join_meshes(
            f"Urithiru_East_FacadeDetailBatch_{tier_number:02d}",
            facade_details,
            r,
        )

        # A quiet vertical lightwell unifies all ten strata. It is deliberately
        # narrow and low-emission: a sign of a living Radiant city, not a neon
        # stripe painted over the ancient stone.
        cube(
            f"Urithiru_RadiantLightwell_{tier_number:02d}",
            (0, -front_depth - 0.094, tier_center),
            (0.045, 0.024, tier_height * 0.30),
            p["radiant_soft"],
            r,
            0.008,
        )

        terrace_details: list[bpy.types.Object] = []
        parapet_count = max(6, 13 - tier_index)
        for parapet_index in range(parapet_count):
            parapet_angle = (
                -1.02
                + 2.04 * parapet_index / max(1, parapet_count - 1)
            )
            tangent = math.atan2(
                front_depth * math.sin(parapet_angle),
                width * math.cos(parapet_angle),
            )
            parapet = cube(
                f"Urithiru_TerraceParapet_{tier_number:02d}_{parapet_index + 1:02d}",
                (
                    (width + 0.13) * math.sin(parapet_angle),
                    -(front_depth + 0.15) * math.cos(parapet_angle),
                    tier_top + 0.12,
                ),
                (0.035, 0.045, 0.095),
                p["stone_light"],
                r,
                0.008,
            )
            parapet.rotation_euler[2] = tangent
            terrace_details.append(parapet)
        join_meshes(
            f"Urithiru_TerraceParapetBatch_{tier_number:02d}",
            terrace_details,
            r,
        )

        stratum_buttresses: list[bpy.types.Object] = []
        for buttress_index, buttress_angle in enumerate(
            (-1.08, -0.56, 0.56, 1.08)
        ):
            tangent = math.atan2(
                front_depth * math.sin(buttress_angle),
                width * math.cos(buttress_angle),
            )
            outward_x = math.sin(buttress_angle)
            outward_y = -math.cos(buttress_angle)
            buttress = cube(
                f"Urithiru_StratumButtress_{tier_number:02d}_{buttress_index + 1:02d}",
                (
                    width * outward_x + outward_x * 0.14,
                    front_depth * outward_y + outward_y * 0.14,
                    tier_center,
                ),
                (0.06, 0.105, tier_height * 0.47),
                city_surface["urithiru"],
                r,
                0.018,
            )
            buttress.rotation_euler[2] = tangent
            stratum_buttresses.append(buttress)
        join_meshes(
            f"Urithiru_StratumButtressBatch_{tier_number:02d}",
            stratum_buttresses,
            r,
        )

        cube(
            f"Urithiru_East_GalleryLedge_{tier_number:02d}",
            (0, -front_depth - 0.12, tier_bottom + 0.075),
            (width * 0.76, 0.12, 0.035),
            p["stone_dark"],
            r,
            0.008,
        )
        tier_bottom = tier_top + (0.11 if tier_index < 4 else 0.10)

    # Two lower bastions frame the entrance like occupied districts rather
    # than decorative turrets. Their stacked, door-scale galleries make the
    # immense central tower legible at human scale.
    for side in (-1, 1):
        side_label = "North" if side < 0 else "South"
        cube(
            f"Urithiru_{side_label}_LowerBastion_Base",
            (side * 3.72, -2.42, 1.56),
            (0.66, 0.58, 0.54),
            city_surface["urithiru"],
            r,
            0.07,
        )
        cube(
            f"Urithiru_{side_label}_LowerBastion_Gallery",
            (side * 3.72, -2.42, 2.36),
            (0.52, 0.49, 0.30),
            city_surface["urithiru"],
            r,
            0.055,
        )
        cyl(
            f"Urithiru_{side_label}_LowerBastion_Crown",
            (side * 3.72, -2.42, 2.73),
            0.56,
            0.16,
            p["stone_dark"],
            r,
            20,
            0.025,
        )
        for bastion_bay in range(5):
            bay_angle = -0.72 + bastion_bay * 0.36
            bay = cube(
                f"Urithiru_{side_label}_BastionBay_{bastion_bay + 1:02d}",
                (
                    side * 3.72 + math.sin(bay_angle) * 0.54,
                    -2.42 - math.cos(bay_angle) * 0.50,
                    2.32,
                ),
                (0.05, 0.025, 0.14),
                p["glass_dark"] if bastion_bay != 2 else p["radiant_soft"],
                r,
                0.008,
            )
            bay.rotation_euler[2] = bay_angle

    # The broad east entrance is architectural in scale, with three
    # human-scale doors set into it so the city never reads as a miniature.
    entrance_front = -tier_specs[0][1] - 0.13
    cube(
        "Urithiru_Monumental_East_Portal",
        (0, entrance_front, 1.86),
        (0.67, 0.075, 0.71),
        p["slate"],
        r,
        0.025,
    )
    entrance_arch = cyl(
        "Urithiru_Monumental_East_Arch",
        (0, entrance_front, 2.52),
        0.67,
        0.16,
        p["slate"],
        r,
        24,
        0.025,
    )
    entrance_arch.rotation_euler[0] = math.pi / 2
    for side in (-1, 1):
        cube(
            f"Urithiru_Monumental_East_Pylon_{side}",
            (side * 0.82, entrance_front + 0.015, 1.89),
            (0.16, 0.19, 0.92),
            city_surface["urithiru"],
            r,
            0.035,
        )
        cube(
            f"Urithiru_Monumental_East_PylonCap_{side}",
            (side * 0.82, entrance_front - 0.015, 2.82),
            (0.23, 0.23, 0.08),
            p["stone_light"],
            r,
            0.025,
        )

    for entrance_index, entrance_x in enumerate((-0.24, 0, 0.24)):
        cube(
            f"Urithiru_LowerEntrance_{entrance_index + 1}",
            (
                entrance_x,
                entrance_front - 0.09,
                1.17 + door_half_height,
            ),
            (door_half_width, 0.035, door_half_height),
            p["glass_dark"],
            r,
            0.014,
        )
        for side in (-1, 1):
            cube(
                f"Urithiru_LowerEntranceJamb_{entrance_index + 1}_{side}",
                (
                    entrance_x + side * (door_half_width + 0.025),
                    entrance_front - 0.11,
                    1.17 + door_half_height,
                ),
                (0.018, 0.04, door_half_height * 1.18),
                p["stone_light"],
                r,
                0.006,
            )
        cube(
            f"Urithiru_LowerEntranceLintel_{entrance_index + 1}",
            (
                entrance_x,
                entrance_front - 0.11,
                1.17 + door_half_height * 2 + 0.022,
            ),
            (door_half_width * 1.35, 0.04, 0.018),
            p["stone_light"],
            r,
            0.006,
        )

    for step_index in range(7):
        cube(
            f"Urithiru_East_EntranceStep_{step_index + 1:02d}",
            (
                0,
                -3.70 - step_index * 0.15,
                1.205 - step_index * 0.029,
            ),
            (0.94 + step_index * 0.105, 0.12, 0.038),
            p["stone_light"],
            r,
            0.018,
        )
    approach_ramp = cube(
        "Urithiru_Oathgate_ApproachRamp",
        (0, -4.13, 1.015),
        (1.50, 0.79, 0.06),
        p["stone_light"],
        r,
        0.018,
    )
    approach_ramp.rotation_euler[0] = -0.058
    cube(
        "Urithiru_Oathgate_Forecourt_BridgeFoundation",
        (0, -4.13, 0.79),
        (1.58, 0.82, 0.16),
        p["stone_dark"],
        r,
        0.04,
    )
    for bridge_side in (-1, 1):
        cube(
            f"Urithiru_Oathgate_Forecourt_Balustrade_{bridge_side}",
            (bridge_side * 1.46, -4.13, 1.22),
            (0.065, 0.78, 0.24),
            city_surface["urithiru"],
            r,
            0.024,
        )
    ceremonial_lamps: list[bpy.types.Object] = []
    ceremonial_glows: list[bpy.types.Object] = []
    for lamp_index in range(5):
        lamp_y = -3.72 - lamp_index * 0.22
        for lamp_side in (-1, 1):
            ceremonial_lamps.append(
                cyl(
                    f"Urithiru_CeremonialLampStem_{lamp_index + 1:02d}_{lamp_side}",
                    (lamp_side * 1.29, lamp_y, 1.35),
                    0.018,
                    0.40,
                    p["brass"],
                    r,
                    8,
                    0.004,
                )
            )
            ceremonial_glows.append(
                sphere(
                    f"Urithiru_CeremonialLampGlow_{lamp_index + 1:02d}_{lamp_side}",
                    (lamp_side * 1.29, lamp_y, 1.57),
                    (0.055, 0.055, 0.075),
                    p["radiant_soft"],
                    r,
                    10,
                    6,
                )
            )
    join_meshes("Urithiru_CeremonialLampStemBatch", ceremonial_lamps, r)
    join_meshes("Urithiru_CeremonialLampGlowBatch", ceremonial_glows, r)

    # The crown resolves into three occupied drums rather than one small cap.
    # Repeated human-scale bays keep the mass legible as a city, while the
    # diminishing rings produce the mountain-tower silhouette in the supplied
    # elevation studies.
    crown_base_z = tier_tops[-1] + 0.16
    cyl(
        "Urithiru_Crown_TransitionPlinth",
        (0, -0.02, crown_base_z + 0.14),
        1.48,
        0.28,
        p["stone_dark"],
        r,
        32,
        0.045,
    )
    cyl(
        "Urithiru_Crown_Rotunda",
        (0, -0.04, crown_base_z + 0.49),
        1.27,
        0.62,
        city_surface["urithiru"],
        r,
        32,
        0.045,
    )
    crown_fins: list[bpy.types.Object] = []
    for crown_index in range(16):
        crown_angle = 2 * math.pi * crown_index / 16
        crown_x = math.sin(crown_angle) * 1.235
        crown_y = -0.04 - math.cos(crown_angle) * 1.235
        crown_bay = cube(
            f"Urithiru_Crown_VerticalBay_{crown_index + 1:02d}",
            (crown_x, crown_y, crown_base_z + 0.49),
            (0.058, 0.03, 0.235),
            p["glass_dark"] if crown_index % 4 else p["radiant_soft"],
            r,
            0.012,
        )
        crown_bay.rotation_euler[2] = crown_angle
        crown_fin = cube(
            f"Urithiru_Crown_Fin_{crown_index + 1:02d}",
            (
                math.sin(crown_angle) * 1.32,
                -0.04 - math.cos(crown_angle) * 1.32,
                crown_base_z + 0.49,
            ),
            (0.035, 0.095, 0.29),
            p["stone_light"],
            r,
            0.012,
        )
        crown_fin.rotation_euler[2] = crown_angle
        crown_fins.append(crown_fin)
    join_meshes("Urithiru_Crown_RadialFinBatch", crown_fins, r)
    cyl(
        "Urithiru_Crown_Cornice",
        (0, -0.04, crown_base_z + 0.83),
        1.37,
        0.12,
        p["stone_dark"],
        r,
        32,
        0.025,
    )
    cyl(
        "Urithiru_Crown_UpperRotunda",
        (0, -0.04, crown_base_z + 1.10),
        0.98,
        0.46,
        city_surface["urithiru"],
        r,
        28,
        0.03,
    )
    for upper_index in range(12):
        upper_angle = 2 * math.pi * upper_index / 12
        upper_bay = cube(
            f"Urithiru_Crown_UpperBay_{upper_index + 1:02d}",
            (
                math.sin(upper_angle) * 0.955,
                -0.04 - math.cos(upper_angle) * 0.955,
                crown_base_z + 1.10,
            ),
            (0.052, 0.026, 0.17),
            p["glass_dark"] if upper_index % 3 else p["radiant_soft"],
            r,
            0.01,
        )
        upper_bay.rotation_euler[2] = upper_angle
    cyl(
        "Urithiru_Crown_UpperCornice",
        (0, -0.04, crown_base_z + 1.36),
        1.06,
        0.11,
        p["stone_dark"],
        r,
        28,
        0.02,
    )
    cyl(
        "Urithiru_Crown_RadiantLantern",
        (0, -0.04, crown_base_z + 1.62),
        0.67,
        0.41,
        city_surface["urithiru"],
        r,
        24,
        0.028,
    )
    for lantern_index in range(8):
        lantern_angle = 2 * math.pi * lantern_index / 8
        lantern_bay = cube(
            f"Urithiru_Crown_LanternBay_{lantern_index + 1:02d}",
            (
                math.sin(lantern_angle) * 0.655,
                -0.04 - math.cos(lantern_angle) * 0.655,
                crown_base_z + 1.62,
            ),
            (0.06, 0.025, 0.15),
            p["radiant_soft"],
            r,
            0.01,
        )
        lantern_bay.rotation_euler[2] = lantern_angle
    cyl(
        "Urithiru_Crown_LanternCornice",
        (0, -0.04, crown_base_z + 1.86),
        0.76,
        0.11,
        p["stone_dark"],
        r,
        24,
        0.02,
    )
    cone(
        "Urithiru_Roof_Beacon",
        (0, -0.04, crown_base_z + 2.23),
        0.28,
        0.08,
        0.64,
        p["radiant_soft"],
        r,
        16,
        0.018,
    )
    sphere(
        "Urithiru_Roof_BeaconCap",
        (0, -0.04, crown_base_z + 2.59),
        (0.12, 0.12, 0.12),
        p["radiant_soft"],
        r,
        12,
        8,
    )
    cube(
        "Urithiru_RadiantAssembly_Balcony",
        (0, -1.42, crown_base_z + 0.88),
        (0.74, 0.18, 0.065),
        p["stone_light"],
        r,
        0.025,
    )
    torus(
        "Urithiru_RadiantAssembly_BalconyInlay",
        (0, -1.43, crown_base_z + 0.95),
        0.34,
        0.018,
        p["radiant_soft"],
        r,
        (math.pi / 2, 0, 0),
    )

    forecourt_y = -4.54
    cyl(
        "Urithiru_Oathgate_Forecourt_TerrainSkirt",
        (0, forecourt_y, 0.66),
        1.30,
        0.72,
        p["stone_dark"],
        r,
        10,
        0.07,
    )
    cyl(
        "Urithiru_Oathgate_Forecourt",
        (0, forecourt_y, 1.06),
        1.23,
        0.18,
        p["stone_light"],
        r,
        10,
        0.06,
    )
    torus(
        "Urithiru_Oathgate_Forecourt_Inlay",
        (0, forecourt_y, 1.16),
        0.88,
        0.026,
        p["brass"],
        r,
    )
    torus(
        "Urithiru_Oathgate_Forecourt_InnerInlay",
        (0, forecourt_y, 1.165),
        0.49,
        0.018,
        p["radiant_soft"],
        r,
    )
    cyl(
        "Urithiru_Oathgate_ControlDais",
        (0, forecourt_y, 1.17),
        0.31,
        0.20,
        p["stone_dark"],
        r,
        10,
        0.025,
    )
    cyl(
        "Urithiru_Oathgate_ControlLight",
        (0, forecourt_y, 1.35),
        0.075,
        0.18,
        p["radiant_soft"],
        r,
        10,
        0.012,
    )
    oathgate_destinations = (
        ("Panatham", "Panatham"),
        ("Rall_Elorim", "Rall Elorim"),
        ("Shinovar", "Shinovar"),
        ("Akinah", "Akinah"),
        ("Azimir", "Azimir"),
        ("Thaylen_City", "Thaylen City"),
        ("Narak", "Narak"),
        ("Kholinar", "Kholinar"),
        ("Vedenar", "Vedenar"),
        ("Kurth", "Kurth"),
    )
    for gate_index, (gate_slug, gate_label) in enumerate(oathgate_destinations):
        gate_angle = math.pi + 2 * math.pi * gate_index / len(
            oathgate_destinations
        )
        direction_x = math.cos(gate_angle)
        direction_y = math.sin(gate_angle)
        platform_x = direction_x * 0.92
        platform_y = forecourt_y + direction_y * 0.92
        platform = cyl(
            f"Urithiru_Oathgate_Approach_{gate_slug}",
            (platform_x, platform_y, 1.16),
            0.205,
            0.14,
            city_surface["urithiru"],
            r,
            10,
            0.025,
        )
        platform["oathgate_destination"] = gate_label
        platform["structure_type"] = "local_oathgate_portal"
        platform["contains_destination_geometry"] = False
        spoke = cube(
            f"Urithiru_Oathgate_Spoke_{gate_slug}",
            (
                direction_x * 0.61,
                forecourt_y + direction_y * 0.61,
                1.17,
            ),
            (0.27, 0.052, 0.026),
            p["brass"],
            r,
            0.008,
        )
        spoke.rotation_euler[2] = gate_angle
        torus(
            f"Urithiru_Oathgate_PortalRing_{gate_slug}",
            (platform_x, platform_y, 1.245),
            0.125,
            0.018,
            p["radiant_soft"],
            r,
        )
        threshold = cube(
            f"Urithiru_Oathgate_Threshold_{gate_slug}",
            (
                platform_x - direction_x * 0.16,
                platform_y - direction_y * 0.16,
                1.215,
            ),
            (0.15, 0.032, 0.018),
            p["brass"],
            r,
            0.006,
        )
        threshold.rotation_euler[2] = gate_angle
        cyl(
            f"Urithiru_Oathgate_Marker_{gate_slug}",
            (
                platform_x + direction_x * 0.05,
                platform_y + direction_y * 0.05,
                1.36,
            ),
            0.045,
            0.22,
            p["radiant_soft"],
            r,
            8,
            0.012,
        )


def build_oathgate() -> None:
    r = root("Landmark_Oathgate", (-9, -7, 0))
    cyl(
        "Oathgate_TerrainSkirt",
        (0, 0, 0.13),
        3.68,
        0.42,
        p["stone_dark"],
        r,
        10,
        0.08,
    )
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
    for ramp_index, angle in enumerate(
        (0, math.pi / 2, math.pi, math.pi * 1.5)
    ):
        ramp = cube(
            f"Oathgate_CardinalRamp_{ramp_index + 1}",
            (math.cos(angle) * 3.28, math.sin(angle) * 3.28, 0.31),
            (0.58, 0.24, 0.055),
            p["stone_light"],
            r,
            0.018,
        )
        ramp.rotation_euler[2] = angle
    cyl("Oathgate_Control_Room", (0, 0, 1.05), 0.85, 1.4, p["stone_dark"], r, 10, 0.08)
    cone("Oathgate_Control_Roof", (0, 0, 1.95), 1.1, 0.32, 0.55, p["brass"], r, 10, 0.04)


def build_kharbranth() -> None:
    r = root("Landmark_Kharbranth", (5, -7, 0))
    rng = random.Random(73191)
    print("  Kharbranth scale contract", flush=True)
    # Kharbranth's runtime district is 12.8 local units wide and uses the
    # application's 12-meters-per-local-unit contract. Converting human-scale
    # features here prevents the common miniature-city failure where a door is
    # four meters tall and a pedestrian reads as a toy.
    runtime_scale = (6.4 * 2) / 10.551
    meters_per_authored_unit = 12.0 * runtime_scale

    def half_extent_for_meters(meters: float) -> float:
        return meters / (2 * meters_per_authored_unit)

    door_half_width = half_extent_for_meters(0.92)
    door_half_height = half_extent_for_meters(2.08)
    window_half_width = half_extent_for_meters(0.82)
    window_half_height = half_extent_for_meters(1.18)
    stair_rise = 0.18 / meters_per_authored_unit

    assert 0.89 < door_half_width * 2 * meters_per_authored_unit < 0.95
    assert 2.04 < door_half_height * 2 * meters_per_authored_unit < 2.12
    kh_window = material(
        "SF_Kharbranth_Warm_Stormglass",
        (0.12, 0.07, 0.028),
        0.18,
        0.32,
        (0.95, 0.42, 0.12),
        1.35,
    )

    # Kharbranth occupies a broad crack that opens toward the harbor. The rear
    # prisms are only dark backing; dozens of overlapping storm-cut ribs form
    # the visible canyon silhouette so the walls never read as two flat slabs.
    for side in (-1, 1):
        print(f"  Kharbranth cliff side {side}", flush=True)
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
            ridge_obj = rock(
                f"Kharbranth_Cliff_Ridge_{side}_{ridge + 1:02d}",
                (x, y, base_z),
                (
                    0.7 + rng.random() * 0.38,
                    0.82 + rng.random() * 0.42,
                    1.3 + rng.random() * 0.72,
                ),
                p["kh_cliff"] if ridge % 3 else p["wet_stone"],
                r,
                2,
            )
            ridge_obj.rotation_euler[0] = rng.uniform(-0.08, 0.08)
            ridge_obj.rotation_euler[1] = side * rng.uniform(0.09, 0.24)
            ridge_obj.rotation_euler[2] = side * rng.uniform(-0.14, 0.12)
        print(f"  Kharbranth cliff ridges {side}", flush=True)

        cliff_fins = []
        for fin in range(14):
            y = -4.75 + fin * 0.76 + rng.uniform(-0.16, 0.16)
            inner_x = side * (4.1 + rng.uniform(-0.12, 0.18))
            outward = side * (0.62 + rng.random() * 0.5)
            fin_height = 2.4 + rng.random() * 3.4
            fin_center_z = 1.1 + fin_height / 2 + (fin % 4) * 0.42
            fin_obj = rock(
                    f"Kharbranth_Cliff_Fin_{side}_{fin + 1:02d}",
                    (
                        inner_x + outward * 0.42,
                        y,
                        fin_center_z,
                    ),
                    (
                        abs(outward) * 0.72,
                        0.56 + rng.random() * 0.28,
                        fin_height * 0.46,
                    ),
                    p["kh_cliff"] if fin % 3 else p["wet_stone"],
                    r,
                    1,
                )
            fin_obj.rotation_euler[0] = rng.uniform(-0.13, 0.13)
            fin_obj.rotation_euler[1] = side * rng.uniform(-0.2, 0.22)
            fin_obj.rotation_euler[2] = rng.uniform(-0.16, 0.16)
            cliff_fins.append(fin_obj)
        join_meshes(
            f"Kharbranth_Cliff_FinBatch_{'West' if side < 0 else 'East'}",
            cliff_fins,
            r,
        )
        print(f"  Kharbranth cliff fins {side}", flush=True)

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
        print(f"  Kharbranth cliff complete {side}", flush=True)

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
        print(f"  Kharbranth terrace {tier + 1}", flush=True)
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
        facades = []
        parapets = []
        balconies = []
        awnings = []
        bells = []
        roofscape = []
        masonry_details = []
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
                    0.32
                    + rng.random() * 0.34
                    + tier * 0.022
                    + row * 0.07
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

                building_bottom = z - height
                building_top = z + height
                facade_depth = 0.012
                facades.append(
                    cube(
                        f"Kharbranth_FacadeAtlas_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                        (x, y - depth - facade_depth, z),
                        (width * 0.88, facade_depth, height * 0.9),
                        body_mat,
                        r,
                        0.004,
                    )
                )

                # A floor is approximately three meters. The previous model
                # showed only one or two giant window rows on 12–20 m blocks,
                # which made people look toy-sized. These rows, doors, sills
                # and lintels now follow the same meter contract as residents.
                floors = max(
                    2,
                    min(
                        6,
                        round(
                            (height * 2 * meters_per_authored_unit) / 3.05
                        ),
                    ),
                )
                floor_spacing = (height * 2 - 0.11) / floors
                for floor in range(floors):
                    window_z = (
                        building_bottom
                        + 0.17
                        + floor * floor_spacing
                    )
                    column_offsets = (
                        (0,)
                        if width < 0.29
                        else (-width * 0.38, width * 0.38)
                    )
                    for column, offset in enumerate(column_offsets):
                        if floor == 0 and column == 0:
                            continue
                        windows.append(
                            cube(
                                f"Kharbranth_Window_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}_F{floor + 1:02d}_C{column + 1:02d}",
                                (x + offset, y - depth - 0.018, window_z),
                                (
                                    window_half_width,
                                    0.018,
                                    window_half_height,
                                ),
                                kh_window,
                                r,
                                0.008,
                            )
                        )
                        windows.append(
                            cube(
                                f"Kharbranth_Window_Lintel_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}_F{floor + 1:02d}_C{column + 1:02d}",
                                (
                                    x + offset,
                                    y - depth - 0.037,
                                    window_z + window_half_height + 0.018,
                                ),
                                (
                                    window_half_width + 0.018,
                                    0.014,
                                    0.014,
                                ),
                                p["stone_light"],
                                r,
                                0.006,
                            )
                        )
                        windows.append(
                            cube(
                                f"Kharbranth_WindowSill_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}_F{floor + 1:02d}_C{column + 1:02d}",
                                (
                                    x + offset,
                                    y - depth - 0.041,
                                    window_z - window_half_height - 0.014,
                                ),
                                (
                                    window_half_width + 0.022,
                                    0.02,
                                    0.012,
                                ),
                                p["kh_stone"],
                                r,
                                0.005,
                            )
                        )
                        if (house + floor + column + tier) % 5 == 0:
                            shutter_x = (
                                x
                                + offset
                                + (
                                    window_half_width * 1.65
                                    if column % 2 == 0
                                    else -window_half_width * 1.65
                                )
                            )
                            masonry_details.append(
                                cube(
                                    f"Kharbranth_StormShutter_T{tier + 1:02d}_{house + 1:02d}_{floor}_{column}",
                                    (
                                        shutter_x,
                                        y - depth - 0.044,
                                        window_z,
                                    ),
                                    (
                                        window_half_width * 0.72,
                                        0.012,
                                        window_half_height * 1.05,
                                    ),
                                    p["wood"],
                                    r,
                                    0.004,
                                )
                            )
                doors.append(
                    cube(
                        f"Kharbranth_Door_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                        (
                            x - width * 0.34,
                            y - depth - 0.024,
                            building_bottom + door_half_height,
                        ),
                        (
                            door_half_width,
                            0.022,
                            door_half_height,
                        ),
                        p["wood"],
                        r,
                        0.01,
                    )
                )
                parapets.append(
                    cube(
                        f"Kharbranth_RoofTrimFront_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                        (x, y - depth + 0.025, building_top + 0.045),
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
                            (x + side * (width - 0.025), y, building_top + 0.045),
                            (0.025, depth + 0.025, 0.045),
                            body_mat,
                            r,
                            0.006,
                        )
                    )

                if (house + tier * 2 + row) % 3 == 0:
                    roofscape.append(
                        cube(
                            f"Kharbranth_RoofRoom_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                            (
                                x - width * 0.18,
                                y + depth * 0.08,
                                building_top + 0.105,
                            ),
                            (
                                width * 0.42,
                                depth * 0.42,
                                0.09,
                            ),
                            body_mat,
                            r,
                            0.018,
                        )
                    )
                if (house * 5 + tier + row * 3) % 11 == 2:
                    roof = cone(
                        f"Kharbranth_LowHippedRoof_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                        (x, y, building_top + 0.09),
                        min(width, depth) * 0.92,
                        min(width, depth) * 0.48,
                        0.16,
                        roof_colors[(house + tier + row) % len(roof_colors)],
                        r,
                        4,
                        0.008,
                    )
                    roof.rotation_euler[2] = math.pi / 4
                    roofscape.append(roof)
                if (house + tier + row) % 7 == 0:
                    roofscape.append(
                        cyl(
                            f"Kharbranth_RoofCistern_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                            (
                                x + width * 0.32,
                                y,
                                building_top + 0.09,
                            ),
                            0.065,
                            0.14,
                            p["copper"],
                            r,
                            12,
                            0.008,
                        )
                    )
                if (house * 3 + tier + row) % 8 == 0:
                    roofscape.append(
                        cube(
                            f"Kharbranth_Chimney_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                            (
                                x + width * 0.42,
                                y + depth * 0.25,
                                building_top + 0.18,
                            ),
                            (0.035, 0.035, 0.18),
                            p["kh_stone"],
                            r,
                            0.008,
                        )
                    )

                if (house + tier + row) % 4 == 0:
                    balcony_z = min(
                        building_top - 0.1,
                        building_bottom + floor_spacing * 2,
                    )
                    balconies.append(
                        cube(
                            f"Kharbranth_Balcony_T{tier + 1:02d}_R{row + 1:02d}_{house + 1:02d}",
                            (x, y - depth - 0.15, balcony_z),
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
                                    balcony_z + 0.11,
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
        join_meshes(f"Kharbranth_FacadeAtlas_Batch_{tier + 1:02d}", facades, r)
        join_meshes(f"Kharbranth_RoofTrim_Batch_{tier + 1:02d}", parapets, r)
        join_meshes(f"Kharbranth_Balcony_Batch_{tier + 1:02d}", balconies, r)
        join_meshes(f"Kharbranth_Awning_Batch_{tier + 1:02d}", awnings, r)
        join_meshes(f"Kharbranth_Bell_Batch_{tier + 1:02d}", bells, r)
        join_meshes(f"Kharbranth_Roofscape_Batch_{tier + 1:02d}", roofscape, r)
        join_meshes(
            f"Kharbranth_MasonryDetail_Batch_{tier + 1:02d}",
            masonry_details,
            r,
        )
        print(f"  Kharbranth terrace {tier + 1} complete", flush=True)

    # Carved retaining fronts give every switchback a readable thickness.
    # Recesses, pillars and lintels replace the former featureless terrace
    # slabs and make the city continue below street level like the reference.
    retaining_recesses = []
    retaining_frames = []
    retaining_drains = []
    for tier in range(6):
        road_y = -2.52 + tier * 1.02
        road_z = 1.075 + tier * 0.52
        half_width = 4.65 - tier * 0.34
        opening_count = 10 - tier
        span = (half_width * 2 - 0.8) / max(1, opening_count - 1)
        for opening in range(opening_count):
            x = -half_width + 0.4 + opening * span
            if 2.55 < x < 3.82:
                continue
            retaining_recesses.append(
                cube(
                    f"Kharbranth_Retaining_Recess_T{tier + 1:02d}_{opening + 1:02d}",
                    (x, road_y - 0.212, road_z - 0.28),
                    (0.12, 0.014, 0.13),
                    p["glass_dark"],
                    r,
                    0.006,
                )
            )
            for side in (-1, 1):
                retaining_frames.append(
                    cube(
                        f"Kharbranth_Retaining_Pillar_T{tier + 1:02d}_{opening + 1:02d}_{side}",
                        (
                            x + side * 0.145,
                            road_y - 0.226,
                            road_z - 0.25,
                        ),
                        (0.024, 0.025, 0.19),
                        p["stone_light"],
                        r,
                        0.006,
                    )
                )
            retaining_frames.append(
                cube(
                    f"Kharbranth_Retaining_Lintel_T{tier + 1:02d}_{opening + 1:02d}",
                    (x, road_y - 0.228, road_z - 0.105),
                    (0.17, 0.025, 0.035),
                    p["stone_light"],
                    r,
                    0.009,
                )
            )
        for drain in range(3):
            x = -half_width * 0.65 + drain * half_width * 0.65
            retaining_drains.append(
                cube(
                    f"Kharbranth_Retaining_Drain_T{tier + 1:02d}_{drain + 1:02d}",
                    (x, road_y - 0.245, road_z - 0.4),
                    (0.035, 0.018, 0.055),
                    p["slate"],
                    r,
                    0.004,
                )
            )
    join_meshes("Kharbranth_Retaining_RecessBatch", retaining_recesses, r)
    join_meshes("Kharbranth_Retaining_FrameBatch", retaining_frames, r)
    join_meshes("Kharbranth_Retaining_DrainBatch", retaining_drains, r)
    print("  Kharbranth retaining walls complete", flush=True)

    # Smaller upper wards are physically stepped into both cliff shoulders.
    # They supply true side-wall parallax when the camera orbits and extend the
    # dense city silhouette beyond the six main street terraces.
    cliff_ward_facades = []
    cliff_ward_windows = []
    cliff_ward_roofs = []
    cliff_ward_galleries = []
    for side in (-1, 1):
        for band in range(4):
            gallery_y = -1.5 + band * 1.35
            gallery_z = 2.45 + band * 0.92
            gallery = cube(
                f"Kharbranth_CliffWard_Gallery_{side}_{band + 1:02d}",
                (
                    side * (3.55 + band * 0.08),
                    gallery_y + 1.45,
                    gallery_z - 0.18,
                ),
                (0.72, 1.68, 0.1),
                p["kh_stone"],
                r,
                0.025,
            )
            gallery.rotation_euler[2] = side * 0.025
            cliff_ward_galleries.append(gallery)
            for slot in range(8):
                y = gallery_y + slot * 0.39 + rng.uniform(-0.025, 0.025)
                x = side * (
                    3.25
                    + band * 0.14
                    + (slot % 2) * 0.18
                    + rng.uniform(-0.06, 0.06)
                )
                width = 0.17 + rng.random() * 0.08
                depth = 0.15 + rng.random() * 0.08
                height = 0.24 + rng.random() * 0.16
                z = gallery_z + height + (slot % 3) * 0.045
                body_mat = colors[(slot + band * 2 + (side > 0)) % len(colors)]
                cube(
                    f"Kharbranth_CliffWard_House_{side}_{band + 1:02d}_{slot + 1:02d}",
                    (x, y, z),
                    (width, depth, height),
                    body_mat,
                    r,
                    0.024,
                )
                cliff_ward_facades.append(
                    cube(
                        f"Kharbranth_CliffWard_FacadeAtlas_{side}_{band + 1:02d}_{slot + 1:02d}",
                        (x, y - depth - 0.011, z),
                        (width * 0.88, 0.011, height * 0.88),
                        body_mat,
                        r,
                        0.004,
                    )
                )
                ward_bottom = z - height
                ward_floors = max(
                    2,
                    min(
                        4,
                        round(
                            height
                            * 2
                            * meters_per_authored_unit
                            / 3.0
                        ),
                    ),
                )
                for floor in range(ward_floors):
                    cliff_ward_windows.append(
                        cube(
                            f"Kharbranth_CliffWard_Window_{side}_{band + 1:02d}_{slot + 1:02d}_{floor + 1:02d}",
                            (
                                x + side * width * 0.22,
                                y - depth - 0.024,
                                ward_bottom
                                + 0.15
                                + floor
                                * ((height * 2 - 0.1) / ward_floors),
                            ),
                            (
                                window_half_width * 0.86,
                                0.014,
                                window_half_height * 0.86,
                            ),
                            kh_window,
                            r,
                            0.005,
                        )
                    )
                cliff_ward_roofs.append(
                    cube(
                        f"Kharbranth_CliffWard_Parapet_{side}_{band + 1:02d}_{slot + 1:02d}",
                        (x, y, z + height + 0.035),
                        (width + 0.018, depth + 0.018, 0.035),
                        body_mat,
                        r,
                        0.006,
                    )
                )
    join_meshes("Kharbranth_CliffWard_GalleryBatch", cliff_ward_galleries, r)
    join_meshes("Kharbranth_CliffWard_FacadeAtlasBatch", cliff_ward_facades, r)
    join_meshes("Kharbranth_CliffWard_WindowBatch", cliff_ward_windows, r)
    join_meshes("Kharbranth_CliffWard_RoofBatch", cliff_ward_roofs, r)
    print("  Kharbranth cliff wards complete", flush=True)

    # The lower ward fills the visual and physical gap between quay and first
    # Ralinsa flight. Its taller inns and warehouses make the harbor feel like
    # the working entrance to a cosmopolitan city rather than a model display.
    lower_windows = []
    lower_details = []
    lower_facades = []
    lower_roofs = []
    for block in range(15):
        x = -4.25 + block * 0.61
        if 2.55 < x < 3.85:
            continue
        width = 0.24 + rng.random() * 0.08
        depth = 0.38 + rng.random() * 0.1
        height = 0.38 + (block % 4) * 0.075 + rng.random() * 0.13
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
        lower_facades.append(
            cube(
                f"Kharbranth_LowerWard_FacadeAtlas_{block + 1:02d}",
                (x, y - depth - 0.012, z),
                (width * 0.88, 0.012, height * 0.9),
                body_mat,
                r,
                0.004,
            )
        )
        lower_bottom = z - height
        lower_floors = max(
            2,
            min(
                6,
                round((height * 2 * meters_per_authored_unit) / 3.15),
            ),
        )
        lower_floor_spacing = (height * 2 - 0.1) / lower_floors
        for floor in range(lower_floors):
            for column, offset in enumerate((-width * 0.36, width * 0.36)):
                if floor == 0 and offset < 0:
                    continue
                lower_windows.append(
                    cube(
                        f"Kharbranth_LowerWard_Window_{block + 1:02d}_F{floor + 1:02d}_C{column + 1:02d}",
                        (
                            x + offset,
                            y - depth - 0.02,
                            lower_bottom
                            + 0.16
                            + floor * lower_floor_spacing,
                        ),
                        (
                            window_half_width,
                            0.018,
                            window_half_height,
                        ),
                        kh_window,
                        r,
                        0.008,
                    )
                )
        lower_details.append(
            cube(
                f"Kharbranth_LowerWard_Door_{block + 1:02d}",
                (
                    x - width * 0.34,
                    y - depth - 0.025,
                    lower_bottom + door_half_height,
                ),
                (door_half_width, 0.022, door_half_height),
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
        if block % 3 == 0:
            lower_roofs.append(
                cube(
                    f"Kharbranth_LowerWard_RoofRoom_{block + 1:02d}",
                    (x, y, z + height + 0.1),
                    (width * 0.44, depth * 0.4, 0.08),
                    body_mat,
                    r,
                    0.014,
                )
            )
    join_meshes("Kharbranth_LowerWard_WindowBatch", lower_windows, r)
    join_meshes("Kharbranth_LowerWard_DetailBatch", lower_details, r)
    join_meshes("Kharbranth_LowerWard_FacadeAtlasBatch", lower_facades, r)
    join_meshes("Kharbranth_LowerWard_RoofscapeBatch", lower_roofs, r)
    print("  Kharbranth lower ward complete", flush=True)

    # A long processional arm of the Ralinsa climbs beside the eastern blocks.
    # The tier flights remain the navigable switchback network; this broad run
    # makes that defining urban feature readable in the sea-facing hero view.
    ralinsa_steps = []
    ralinsa_curbs = []
    ralinsa_bells = []
    ralinsa_vertical_rise = 3.88
    ralinsa_plan_run = 6.85
    ralinsa_step_count = round(ralinsa_vertical_rise / stair_rise) + 1
    ralinsa_tread_depth = ralinsa_plan_run / (ralinsa_step_count - 1)
    bell_stride = max(1, ralinsa_step_count // 12)
    for step in range(ralinsa_step_count):
        progress = step / (ralinsa_step_count - 1)
        x = 3.3 - progress * 0.28
        y = -3.38 + progress * ralinsa_plan_run
        z = 1.1 + progress * ralinsa_vertical_rise
        ralinsa_steps.append(
            cube(
                f"Kharbranth_Ralinsa_Processional_Tread_{step + 1:02d}",
                (x, y, z),
                (
                    0.43,
                    ralinsa_tread_depth * 0.54,
                    stair_rise * 0.54,
                ),
                p["stone_light"],
                r,
                0.003,
            )
        )
        if step % bell_stride == bell_stride // 2:
            bell_side = -1 if (step // bell_stride) % 2 else 1
            bell_x = x + bell_side * 0.66
            ralinsa_bells.append(
                cyl(
                    f"Kharbranth_Ralinsa_Bellpost_{step + 1:02d}",
                    (bell_x, y, z + 0.14),
                    0.014,
                    0.28,
                    p["brass"],
                    r,
                    8,
                    0.005,
                )
            )
            ralinsa_bells.append(
                cone(
                    f"Kharbranth_Ralinsa_Bell_{step + 1:02d}",
                    (bell_x, y - 0.03, z + 0.31),
                    0.05,
                    0.018,
                    0.075,
                    p["brass"],
                    r,
                    10,
                    0.008,
                )
            )
    curb_angle = math.atan2(ralinsa_vertical_rise, ralinsa_plan_run)
    curb_length = math.hypot(ralinsa_plan_run, ralinsa_vertical_rise)
    for side in (-1, 1):
        curb = cube(
            f"Kharbranth_Ralinsa_Processional_Curb_{side}",
            (
                3.16 + side * 0.5,
                -3.38 + ralinsa_plan_run / 2,
                1.1 + ralinsa_vertical_rise / 2 + 0.06,
            ),
            (0.028, curb_length / 2, 0.055),
            p["kh_stone"],
            r,
            0.008,
        )
        curb.rotation_euler[0] = curb_angle
        ralinsa_curbs.append(curb)
    join_meshes("Kharbranth_Ralinsa_Processional_Run", ralinsa_steps, r)
    join_meshes("Kharbranth_Ralinsa_Processional_CurbBatch", ralinsa_curbs, r)
    join_meshes("Kharbranth_Ralinsa_Processional_BellBatch", ralinsa_bells, r)
    print("  Kharbranth Ralinsa complete", flush=True)

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
        civic_details.append(
            cube(
                f"Kharbranth_Institution_{institution}_FacadeAtlasPanel",
                (x, y - depth - 0.012, z),
                (width * 0.92, 0.012, height * 0.9),
                p["kh_plaster_ivory"],
                r,
                0.004,
            )
        )
        institution_bottom = z - height
        portal_half_height = half_extent_for_meters(4.6)
        portal_half_width = half_extent_for_meters(1.15)
        for portal in range(portal_count):
            portal_x = x - portal_span / 2 + portal * portal_span / (portal_count - 1)
            civic_details.append(
                cube(
                    f"Kharbranth_Institution_{institution}_PortalRecess_{portal + 1:02d}",
                    (
                        portal_x,
                        y - depth - 0.034,
                        institution_bottom + portal_half_height,
                    ),
                    (
                        portal_half_width,
                        0.022,
                        portal_half_height,
                    ),
                    p["glass_dark"],
                    r,
                    0.006,
                )
            )
            for side in (-1, 1):
                civic_details.append(
                    cube(
                        f"Kharbranth_Institution_{institution}_Portal_{portal + 1:02d}_{side}",
                        (
                            portal_x
                            + side * (portal_half_width + 0.032),
                            y - depth - 0.048,
                            institution_bottom + portal_half_height,
                        ),
                        (0.025, 0.03, portal_half_height),
                        p["stone_light"],
                        r,
                        0.012,
                    )
                )
            civic_details.append(
                cone(
                    f"Kharbranth_Institution_{institution}_PortalArch_{portal + 1:02d}",
                    (
                        portal_x,
                        y - depth - 0.06,
                        institution_bottom
                        + portal_half_height * 2
                        + 0.045,
                    ),
                    portal_half_width + 0.055,
                    portal_half_width * 0.42,
                    0.09,
                    p["stone_light"],
                    r,
                    12,
                    0.01,
                )
            )
            upper_rows = max(
                3,
                min(
                    7,
                    round(
                        height
                        * 2
                        * meters_per_authored_unit
                        / 3.25
                    )
                    - 2,
                ),
            )
            for upper_row in range(upper_rows):
                civic_details.append(
                    cube(
                        f"Kharbranth_Institution_{institution}_UpperWindow_{portal + 1:02d}_{upper_row + 1:02d}",
                        (
                            portal_x,
                            y - depth - 0.052,
                        institution_bottom
                        + portal_half_height * 2
                        + 0.24
                        + upper_row * 0.205,
                        ),
                        (
                            window_half_width * 0.9,
                            0.022,
                            window_half_height * 0.95,
                        ),
                        kh_window,
                        r,
                        0.008,
                    )
                )
        for buttress in range(portal_count + 1):
            buttress_x = (
                x
                - portal_span / 2
                - 0.12
                + buttress * (portal_span + 0.24) / portal_count
            )
            civic_details.append(
                cube(
                    f"Kharbranth_Institution_{institution}_Buttress_{buttress + 1:02d}",
                    (buttress_x, y - depth - 0.065, z),
                    (0.028, 0.042, height * 0.92),
                    p["stone_light"],
                    r,
                    0.008,
                )
            )
        for band in range(1, max(2, upper_rows // 2 + 1)):
            civic_details.append(
                cube(
                    f"Kharbranth_Institution_{institution}_FloorBand_{band + 1:02d}",
                    (
                        x,
                        y - depth - 0.072,
                        institution_bottom
                        + portal_half_height * 2
                        + band * 0.41,
                    ),
                    (width * 0.94, 0.026, 0.022),
                    p["kh_stone"],
                    r,
                    0.006,
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
    crown_details = []
    for level in range(3):
        level_z = 7.32 + level * 0.42
        level_width = 1.28 - level * 0.2
        level_depth = 0.52 - level * 0.055
        cube(
            f"Kharbranth_Conclave_UpperLevel_{level + 1:02d}",
            (0, 4.35 + level * 0.04, level_z),
            (level_width, level_depth, 0.24),
            p["kh_plaster_ivory"],
            r,
            0.04,
        )
        crown_details.append(
            cube(
                f"Kharbranth_Conclave_UpperLevel_{level + 1:02d}_FacadeAtlas",
                (
                    0,
                    4.35 + level * 0.04 - level_depth - 0.014,
                    level_z,
                ),
                (level_width * 0.9, 0.014, 0.2),
                p["kh_plaster_ivory"],
                r,
                0.004,
            )
        )
        window_count = 7 - level * 2
        for window in range(window_count):
            window_x = (
                -level_width * 0.72
                + window
                * (level_width * 1.44)
                / max(1, window_count - 1)
            )
            crown_details.append(
                cube(
                    f"Kharbranth_Conclave_UpperWindow_{level + 1:02d}_{window + 1:02d}",
                    (
                        window_x,
                        4.35
                        + level * 0.04
                        - level_depth
                        - 0.03,
                        level_z,
                    ),
                    (
                        window_half_width * 0.85,
                        0.018,
                        window_half_height,
                    ),
                    kh_window,
                    r,
                    0.005,
                )
            )
        crown_details.append(
            cube(
                f"Kharbranth_Conclave_UpperCornice_{level + 1:02d}",
                (
                    0,
                    4.35 + level * 0.04 - 0.02,
                    level_z + 0.285,
                ),
                (level_width + 0.06, level_depth + 0.04, 0.04),
                p["kh_stone"],
                r,
                0.008,
            )
        )
    join_meshes("Kharbranth_Conclave_CrownDetailBatch", crown_details, r)

    # The Palanaeum entrance and hospital loggia form a legible civic focus at
    # the head of the Ralinsa. The dark recesses are real cavities in front of
    # the stone foundation, not painted suggestions in a panorama.
    civic_loggia = []
    loggia_y = 3.36
    for bay in range(11):
        bay_x = -3.1 + bay * 0.62
        civic_loggia.append(
            cube(
                f"Kharbranth_Civic_LoggiaRecess_{bay + 1:02d}",
                (bay_x, loggia_y - 0.02, 4.84),
                (0.19, 0.025, 0.22),
                p["glass_dark"],
                r,
                0.006,
            )
        )
        for side in (-1, 1):
            civic_loggia.append(
                cube(
                    f"Kharbranth_Civic_LoggiaPillar_{bay + 1:02d}_{side}",
                    (
                        bay_x + side * 0.225,
                        loggia_y - 0.045,
                        4.84,
                    ),
                    (0.03, 0.035, 0.3),
                    p["stone_light"],
                    r,
                    0.008,
                )
            )
        civic_loggia.append(
            cube(
                f"Kharbranth_Civic_LoggiaLintel_{bay + 1:02d}",
                (bay_x, loggia_y - 0.05, 5.08),
                (0.25, 0.04, 0.035),
                p["stone_light"],
                r,
                0.008,
            )
        )
    civic_loggia.append(
        cube(
            "Kharbranth_Palanaeum_DeepPortal",
            (0, 3.28, 4.58),
            (
                half_extent_for_meters(3.4),
                0.08,
                half_extent_for_meters(6.2),
            ),
            p["glass_dark"],
            r,
            0.025,
        )
    )
    join_meshes("Kharbranth_Civic_LoggiaBatch", civic_loggia, r)
    print("  Kharbranth civic crown complete", flush=True)
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

    # Working harbor foreground: a human-scaled arcaded quay, six timber piers,
    # deck planks, boats, mast-and-sail silhouettes, cargo, markets and cranes.
    # The sea itself remains the live Three.js water shader.
    cube(
        "Kharbranth_Harbor_Quay",
        (0, -4.15, 0.42),
        (4.55, 0.52, 0.22),
        p["kh_stone"],
        r,
        0.045,
    )
    cube(
        "Kharbranth_Harbor_QuayFoundationSkirt",
        (0, -4.14, 0.17),
        (4.42, 0.46, 0.18),
        p["kh_cliff"],
        r,
        0.035,
    )
    quay_buttresses = []
    for buttress_index in range(9):
        quay_buttresses.append(
            cube(
                f"Kharbranth_QuayButtress_{buttress_index + 1:02d}",
                (-3.72 + buttress_index * 0.93, -4.6, 0.4),
                (0.07, 0.15, 0.31),
                p["kh_stone"],
                r,
                0.018,
            )
        )
    join_meshes("Kharbranth_QuayButtressBatch", quay_buttresses, r)
    arcade = []
    for arch in range(14):
        x = -4.03 + arch * 0.62
        arcade.append(
            cube(
                f"Kharbranth_QuayArcade_Recess_{arch + 1:02d}",
                (x, -4.675, 0.82),
                (0.17, 0.024, 0.17),
                p["glass_dark"],
                r,
                0.006,
            )
        )
        for side in (-1, 1):
            arcade.append(
                cube(
                    f"Kharbranth_QuayArcade_Pillar_{arch + 1:02d}_{side}",
                    (x + side * 0.205, -4.69, 0.82),
                    (0.028, 0.045, 0.2),
                    p["kh_stone"],
                    r,
                    0.012,
                )
            )
        arcade.append(
            cube(
                f"Kharbranth_QuayArcade_Lintel_{arch + 1:02d}",
                (x, -4.7, 1.0),
                (0.235, 0.045, 0.035),
                p["stone_light"],
                r,
                0.008,
            )
        )
    join_meshes("Kharbranth_QuayArcade_PillarBatch", arcade, r)

    harbor_details = []
    harbor_ropework = []
    dock_count = 6
    for dock in range(dock_count):
        x = -3.8 + dock * 1.52
        cube(
            f"Kharbranth_Dock_{dock + 1:02d}",
            (x, -5.62, 0.22),
            (0.2, 1.32, 0.045),
            p["wood"],
            r,
            0.018,
        )
        for plank in range(20):
            plank_y = -4.39 - plank * 0.13
            harbor_details.append(
                cube(
                    f"Kharbranth_DockPlank_{dock + 1:02d}_{plank + 1:02d}",
                    (x, plank_y, 0.28 + (plank % 3) * 0.002),
                    (0.215, 0.058, 0.012),
                    p["wood"],
                    r,
                    0.003,
                )
            )
        for piling_index, piling_y in enumerate((-4.55, -5.2, -5.85, -6.5)):
            for side in (-1, 1):
                harbor_details.append(
                    cyl(
                        f"Kharbranth_DockPiling_{dock + 1:02d}_{piling_index + 1:02d}_{side}",
                        (x + side * 0.19, piling_y, 0.02),
                        0.032,
                        0.72,
                        p["wood"],
                        r,
                        8,
                        0,
                    )
                )
        boat_side = -1 if dock % 2 == 0 else 1
        boat_x = x + boat_side * 0.47
        boat_y = -6.25 + (dock % 3) * 0.12
        hull = cube(
            f"Kharbranth_Harbor_Skiff_{dock + 1:02d}",
            (boat_x, boat_y, 0.16),
            (0.48, 0.16, 0.1),
            p["terracotta"] if dock % 2 else p["wood"],
            r,
            0.07,
        )
        hull.rotation_euler[2] = -0.12 + dock * 0.045
        cyl(
            f"Kharbranth_Harbor_Mast_{dock + 1:02d}",
            (boat_x, boat_y, 0.65),
            0.018,
            0.92,
            p["wood"],
            r,
            8,
            0,
        )
        sail = cube(
            f"Kharbranth_Harbor_Sail_{dock + 1:02d}",
            (boat_x + boat_side * 0.16, boat_y, 0.72),
            (0.15, 0.012, 0.28),
            p["cloth_red"] if dock % 2 else p["cloth_blue"],
            r,
            0.006,
        )
        sail.rotation_euler[1] = -boat_side * 0.18
        harbor_ropework.append(
            torus(
                f"Kharbranth_MooringCoil_{dock + 1:02d}",
                (x + 0.09, -4.48, 0.33),
                half_extent_for_meters(0.5),
                half_extent_for_meters(0.09),
                p["rope"],
                r,
                rotation=(math.pi / 2, 0, 0),
            )
        )

    crate_half = half_extent_for_meters(0.78)
    for cargo in range(60):
        x = -4.05 + (cargo % 15) * 0.56
        y = -4.82 - (cargo // 15) * 0.21
        harbor_details.append(
            cube(
                f"Kharbranth_Harbor_Crate_{cargo + 1:02d}",
                (
                    x,
                    y,
                    0.65 + crate_half + (cargo % 3) * crate_half * 1.6,
                ),
                (
                    crate_half * (1.15 if cargo % 4 == 0 else 1),
                    crate_half,
                    crate_half,
                ),
                p["wood"],
                r,
                0.012,
            )
        )
    for market in range(10):
        x = -3.85 + market * 0.84
        canopy = cube(
            f"Kharbranth_Harbor_MarketCanopy_{market + 1:02d}",
            (x, -3.86, 0.94),
            (0.28, 0.2, 0.018),
            p["cloth_blue"] if market % 2 else p["cloth_red"],
            r,
            0.005,
        )
        canopy.rotation_euler[0] = math.radians(8)
        harbor_details.append(canopy)
    join_meshes("Kharbranth_Harbor_TrimCargoBatch", harbor_details, r)
    join_meshes("Kharbranth_Harbor_RopeworkBatch", harbor_ropework, r)
    print("  Kharbranth harbor detail complete", flush=True)

    for crane_index, x in enumerate((-2.75, 0.15, 2.9)):
        cyl(
            f"Kharbranth_DockCrane_Mast_{crane_index + 1:02d}",
            (x, -4.78, 1.08),
            0.04,
            0.9,
            p["wood"],
            r,
            10,
            0.01,
        )
        boom = cube(
            f"Kharbranth_DockCrane_Boom_{crane_index + 1:02d}",
            (x + 0.27, -4.78, 1.42),
            (0.34, 0.03, 0.032),
            p["wood"],
            r,
            0.012,
        )
        boom.rotation_euler[1] = -0.26
        cyl(
            f"Kharbranth_DockCrane_Rope_{crane_index + 1:02d}",
            (x + 0.55, -4.78, 1.08),
            0.008,
            0.58,
            p["rope"],
            r,
            6,
            0,
        )
    print("  Kharbranth complete", flush=True)

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
    runtime_scale = (4.8 * 2) / 10.2

    # Register readable anchors from the supplied 858 × 1320 plan into the
    # authored city footprint. The main plan (rather than the palace inset)
    # spans approximately x=49…809 and y=190…966. It is explicitly south-up:
    # plan-left/east is local -X and plan-top/south is local +Y.
    def kholinar_plan_point(
        pixel: tuple[float, float],
    ) -> tuple[float, float]:
        return ((pixel[0] - 429) / 80, (575 - pixel[1]) / 82)

    # The supplied city blueprint is south-up. Keep that authored orientation:
    # positive local Y is south, negative local Y is north, east is local -X.
    outline = [
        (-4.7, 2.45),
        (-3.15, 4.15),
        (-0.7, 4.75),
        (1.9, 4.42),
        (4.35, 3.05),
        (4.72, 0.55),
        (4.2, -1.75),
        (2.45, -3.9),
        (0, -4.85),
        (-2.45, -4.0),
        (-4.18, -2.0),
        (-4.78, 0.35),
    ]
    kholinar_toe = natural_terrain_cradle(
        "Kholinar_TerrainCradle",
        outline,
        0.67,
        0.34,
        1.12,
        p["stone"],
        p["stone_dark"],
        p["stone_dark"],
        r,
        1.34,
        1.09,
        3,
        0.8,
    )
    terrain_cradle_outcrops(
        "Kholinar_TerrainCradle",
        kholinar_toe,
        p["stone"],
        r,
        3,
        0.68,
    )

    district_plateaus = (
        (
            "Eastern",
            [(-4.35, 2.35), (-3.0, 3.82), (-0.72, 4.35), (-0.58, 0.72), (-3.45, -0.32)],
        ),
        (
            "Western",
            [(0.72, 4.25), (3.95, 2.75), (4.15, 0.22), (3.2, -0.6), (0.48, 0.72)],
        ),
        (
            "Northern",
            [(-3.45, -0.82), (-0.1, -0.25), (3.25, -0.75), (2.15, -3.55), (0, -4.45), (-2.25, -3.58)],
        ),
    )
    for name, points in district_plateaus:
        prism(
            f"Kholinar_{name}_DistrictPlateau",
            points,
            0.22,
            city_surface["kholinar"],
            r,
            0.76,
        )

    def wall_between(
        name: str,
        start: tuple[float, float],
        end: tuple[float, float],
        gated: bool,
    ) -> None:
        sx, sy = start
        ex, ey = end
        dx, dy = ex - sx, ey - sy
        length = math.hypot(dx, dy)
        angle = math.atan2(dy, dx)
        midpoint = ((sx + ex) / 2, (sy + ey) / 2)
        gap = min(0.58, length * 0.28) if gated else 0

        def wall_segment(
            segment_name: str,
            center: tuple[float, float],
            segment_length: float,
        ) -> None:
            wall = cube(
                segment_name,
                (center[0], center[1], 1.18),
                (segment_length / 2, 0.18, 0.5),
                city_surface["kholinar"],
                r,
                0.055,
            )
            wall.rotation_euler[2] = angle

        if gated:
            direction = (dx / length, dy / length)
            segment_length = (length - gap) / 2
            offset = (gap + segment_length) / 2
            wall_segment(
                f"{name}_LeftWall",
                (
                    midpoint[0] - direction[0] * offset,
                    midpoint[1] - direction[1] * offset,
                ),
                segment_length,
            )
            wall_segment(
                f"{name}_RightWall",
                (
                    midpoint[0] + direction[0] * offset,
                    midpoint[1] + direction[1] * offset,
                ),
                segment_length,
            )
            normal = (-direction[1], direction[0])
            for side in (-1, 1):
                tower_x = midpoint[0] + direction[0] * gap * 0.58 * side
                tower_y = midpoint[1] + direction[1] * gap * 0.58 * side
                cyl(
                    f"{name}_GateTower_{side}",
                    (tower_x, tower_y, 1.48),
                    0.24,
                    1.42,
                    city_surface["kholinar"],
                    r,
                    10,
                    0.035,
                )
            lintel = cube(
                f"{name}_GateLintel",
                (midpoint[0], midpoint[1], 1.72),
                (gap * 0.62, 0.23, 0.14),
                p["brass"],
                r,
                0.025,
            )
            lintel.rotation_euler[2] = angle
            gate_mark = cube(
                f"{name}_GateStormwardMark",
                (
                    midpoint[0] + normal[0] * 0.205,
                    midpoint[1] + normal[1] * 0.205,
                    1.44,
                ),
                (0.07, 0.018, 0.2),
                p["cyan"],
                r,
                0.01,
            )
            gate_mark.rotation_euler[2] = angle
        else:
            wall_segment(name, midpoint, length)

    gate_edges = {0, 2, 4, 6, 7, 9, 11}
    for index, start in enumerate(outline):
        end = outline[(index + 1) % len(outline)]
        wall_between(
            f"Kholinar_CityGate_{index + 1:02d}"
            if index in gate_edges
            else f"Kholinar_PerimeterWall_{index + 1:02d}",
            start,
            end,
            index in gate_edges,
        )

    for index, point in enumerate(outline[::2]):
        cyl(
            f"Kholinar_PerimeterWatchtower_{index + 1:02d}",
            (point[0], point[1], 1.62),
            0.31,
            1.7,
            city_surface["kholinar"],
            r,
            12,
            0.04,
        )
        cone(
            f"Kholinar_PerimeterWatchtowerRoof_{index + 1:02d}",
            (point[0], point[1], 2.58),
            0.42,
            0.05,
            0.32,
            p["brass"],
            r,
            12,
            0.025,
        )

    # Three dense lobes follow the street fields shown between the city's
    # wind-carved ravines, rather than the rejected generic concentric rings.
    districts = (
        ("Eastern", (-2.45, 1.85), 2.05, 1.72, 24, -0.18),
        ("Western", (2.35, 1.82), 2.0, 1.7, 24, 0.18),
        ("Northern", (0, -2.35), 2.55, 1.62, 28, 0),
    )
    for district_index, (
        district_name,
        center,
        radius_x,
        radius_y,
        count,
        angle_bias,
    ) in enumerate(districts):
        for index in range(count):
            angle = index * 2.399963 + district_index * 0.41
            band = 0.32 + 0.6 * math.sqrt(((index * 37 + 11) % 101) / 100)
            x = center[0] + math.cos(angle) * radius_x * band
            y = center[1] + math.sin(angle) * radius_y * band
            half_height = 0.26 + ((index + district_index) % 5) * 0.045
            authored_city_block(
                f"Kholinar_{district_name}Ward_{index + 1:02d}",
                (x, y, 0.88),
                (
                    0.21 + (index % 3) * 0.028,
                    0.19 + ((index + 1) % 3) * 0.026,
                    half_height,
                ),
                city_surface["kholinar"],
                city_surface["kholinar"],
                r,
                runtime_scale,
                angle + angle_bias,
                "flat",
                p["glass_dark"],
                p["wood"],
                p["stone_dark"],
                2,
            )

        for road_index in range(4):
            road_angle = road_index * math.pi / 4 + angle_bias
            road = cube(
                f"Kholinar_{district_name}WardRoad_{road_index + 1}",
                (
                    center[0] + math.cos(road_angle) * radius_x * 0.45,
                    center[1] + math.sin(road_angle) * radius_y * 0.45,
                    0.91,
                ),
                (radius_x * 0.48, 0.055, 0.022),
                p["stone_light"],
                r,
                0.01,
            )
            road.rotation_euler[2] = road_angle

    ravines = (
        ("EasternRavine", (-1.08, 1.55), (0.16, 1.92), -0.34),
        ("WesternRavine", (1.05, 1.48), (0.16, 1.9), 0.33),
        ("NorthernRavine", (0, -0.72), (1.62, 0.16), 0),
    )
    ravine_retaining = []
    for name, center, scale, angle in ravines:
        ravine = cube(
            f"Kholinar_{name}_Floor",
            (center[0], center[1], 0.72),
            (scale[0], scale[1], 0.055),
            p["stone_dark"],
            r,
            0.025,
        )
        ravine.rotation_euler[2] = angle
        if scale[1] > scale[0]:
            for side in (-1, 1):
                wall = cube(
                    f"Kholinar_{name}_RetainingWall_{side}",
                    (
                        center[0]
                        + math.cos(angle) * (scale[0] + 0.075) * side,
                        center[1]
                        + math.sin(angle) * (scale[0] + 0.075) * side,
                        0.79,
                    ),
                    (0.055, scale[1], 0.18),
                    p["stone_dark"],
                    r,
                    0.018,
                )
                wall.rotation_euler[2] = angle
                ravine_retaining.append(wall)
        else:
            for side in (-1, 1):
                wall = cube(
                    f"Kholinar_{name}_RetainingWall_{side}",
                    (
                        center[0]
                        - math.sin(angle) * (scale[1] + 0.075) * side,
                        center[1]
                        + math.cos(angle) * (scale[1] + 0.075) * side,
                        0.79,
                    ),
                    (scale[0], 0.055, 0.18),
                    p["stone_dark"],
                    r,
                    0.018,
                )
                wall.rotation_euler[2] = angle
                ravine_retaining.append(wall)
    join_meshes("Kholinar_RavineRetainingWallBatch", ravine_retaining, r)

    windblades = (
        (-1.2, 2.95, -0.34, 0.92),
        (-0.78, 1.82, -0.27, 0.82),
        (-0.72, 0.65, -0.18, 0.72),
        (1.2, 2.9, 0.34, 0.95),
        (0.78, 1.75, 0.27, 0.84),
        (0.72, 0.52, 0.18, 0.76),
        (-2.7, -0.65, -0.76, 0.72),
        (2.62, -0.55, 0.76, 0.74),
    )
    for index, (x, y, angle, scale) in enumerate(windblades):
        blade = rock(
            f"Kholinar_Windblade_{index + 1:02d}",
            (x, y, 1.55),
            (0.18 * scale, 0.68 * scale, 0.82 * scale),
            city_surface["kholinar"],
            r,
            2,
        )
        blade.rotation_euler[2] = angle

    bridge_abutments = []
    for index, (x, y, length, angle) in enumerate(
        (
            (-1.0, 1.1, 0.7, -0.28),
            (1.0, 1.05, 0.7, 0.28),
            (-1.3, -0.6, 0.62, 0.06),
            (1.3, -0.55, 0.62, -0.06),
            (0, 0.48, 0.6, 0),
            (0, -1.2, 0.7, 0),
        )
    ):
        bridge = cube(
            f"Kholinar_RavineBridge_{index + 1:02d}",
            (x, y, 1.04),
            (length, 0.085, 0.06),
            p["stone_light"],
            r,
            0.018,
        )
        bridge.rotation_euler[2] = angle
        for side in (-1, 1):
            abutment = cube(
                f"Kholinar_RavineBridgeAbutment_{index + 1:02d}_{side}",
                (
                    x + math.cos(angle) * length * 0.88 * side,
                    y + math.sin(angle) * length * 0.88 * side,
                    0.96,
                ),
                (0.13, 0.16, 0.16),
                p["stone_dark"],
                r,
                0.02,
            )
            abutment.rotation_euler[2] = angle
            bridge_abutments.append(abutment)
    join_meshes("Kholinar_RavineBridgeAbutmentBatch", bridge_abutments, r)

    # Named civic anchors and ten temples from the blueprint.
    temple_positions = tuple(
        kholinar_plan_point(pixel)
        for pixel in (
            (382, 357),
            (718, 486),
            (428, 374),
            (579, 607),
            (396, 406),
            (258, 447),
            (500, 647),
            (382, 488),
            (637, 635),
            (523, 760),
        )
    )
    temple_names = (
        "Jezerezeh",
        "Nalan",
        "Chanaranach",
        "Vedeledev",
        "Pailiah",
        "Shalash",
        "Battah",
        "Kelek",
        "Talenelat",
        "Ishi",
    )
    for index, ((x, y), temple_name) in enumerate(
        zip(temple_positions, temple_names)
    ):
        cyl(
            f"Kholinar_Temple_{index + 1:02d}_{temple_name}_Dais",
            (x, y, 1.02),
            0.24,
            0.2,
            p["stone_light"],
            r,
            10,
            0.025,
        )
        cone(
            f"Kholinar_Temple_{index + 1:02d}_{temple_name}_Spire",
            (x, y, 1.42),
            0.18,
            0.025,
            0.62,
            p["brass"] if index % 2 else city_surface["kholinar"],
            r,
            8,
            0.02,
        )

    # Palace main level: a long fortified gallery, ballrooms and garrison
    # entry aligned east-west, connected to the Monastery Dais by the Sunwalk.
    palace_x, palace_y = kholinar_plan_point((433, 776))
    cube(
        "Kholinar_Palace_MainGallery",
        (palace_x, palace_y, 1.35),
        (1.62, 0.42, 0.46),
        city_surface["kholinar"],
        r,
        0.055,
    )
    for side in (-1, 1):
        cube(
            f"Kholinar_Palace_Ballroom_{side}",
            (palace_x + side * 0.72, palace_y + 0.04, 1.56),
            (0.48, 0.54, 0.56),
            city_surface["kholinar"],
            r,
            0.05,
        )
        cube(
            f"Kholinar_Palace_GuestWing_{side}",
            (palace_x + side * 1.42, palace_y + 0.06, 1.36),
            (0.42, 0.36, 0.42),
            city_surface["kholinar"],
            r,
            0.045,
        )
    cyl(
        "Kholinar_Palace_GrandGarrisonEntry",
        (palace_x, palace_y + 0.12, 2.05),
        0.3,
        0.68,
        p["brass"],
        r,
        10,
        0.035,
    )
    cone(
        "Kholinar_Palace_StormlightCrown",
        (palace_x, palace_y + 0.12, 2.58),
        0.28,
        0.025,
        0.55,
        p["cyan"],
        r,
        10,
        0.02,
    )

    monastery_x, monastery_y = kholinar_plan_point((353, 756))
    sunwalk_dx = palace_x - monastery_x
    sunwalk_dy = palace_y - monastery_y
    sunwalk_length = math.hypot(sunwalk_dx, sunwalk_dy)
    sunwalk = cube(
        "Kholinar_Sunwalk",
        (
            (monastery_x + palace_x) / 2,
            (monastery_y + palace_y) / 2,
            1.3,
        ),
        (sunwalk_length / 2, 0.11, 0.09),
        city_surface["kholinar"],
        r,
        0.025,
    )
    sunwalk.rotation_euler[2] = math.atan2(sunwalk_dy, sunwalk_dx)
    cyl(
        "Kholinar_Monastery_Dais",
        (monastery_x, monastery_y, 1.08),
        0.72,
        0.34,
        p["stone_light"],
        r,
        16,
        0.045,
    )
    for index in range(7):
        angle = 2 * math.pi * index / 7
        cyl(
            f"Kholinar_MonasteryDais_Cell_{index + 1}",
            (
                monastery_x + math.cos(angle) * 0.45,
                monastery_y + math.sin(angle) * 0.45,
                1.32,
            ),
            0.12,
            0.38,
            city_surface["kholinar"],
            r,
            8,
            0.02,
        )
    cube(
        "Kholinar_KingsChapel",
        (
            monastery_x + (palace_x - monastery_x) * 0.44,
            monastery_y - 0.42,
            1.22,
        ),
        (0.32, 0.24, 0.32),
        city_surface["kholinar"],
        r,
        0.04,
    )

    market_x, market_y = kholinar_plan_point((429, 606))
    for shop in range(8):
        x = market_x - 1.65 + shop * 0.47
        cube(
            f"Kholinar_MarketRow_Shop_{shop + 1:02d}",
            (x, market_y, 1.14 + (shop % 2) * 0.05),
            (0.2, 0.3, 0.28 + (shop % 2) * 0.05),
            city_surface["kholinar"],
            r,
            0.035,
        )
    dueling_x, dueling_y = kholinar_plan_point((430, 508))
    torus(
        "Kholinar_DuelingArena",
        (dueling_x, dueling_y, 1.04),
        0.48,
        0.12,
        p["stone_light"],
        r,
    )
    theater_x, theater_y = kholinar_plan_point((236, 430))
    cyl(
        "Kholinar_TheaterSquare",
        (theater_x, theater_y, 1.0),
        0.5,
        0.16,
        p["stone_light"],
        r,
        18,
        0.025,
    )
    park_x, park_y = kholinar_plan_point((511, 791))
    cyl(
        "Kholinar_SunmakerPark",
        (park_x, park_y, 0.98),
        0.48,
        0.12,
        p["leaf"],
        r,
        16,
        0.02,
    )
    monument_x, monument_y = kholinar_plan_point((682, 443))
    cone(
        "Kholinar_LanacinMonument",
        (monument_x, monument_y, 1.55),
        0.2,
        0.025,
        1.18,
        p["brass"],
        r,
        10,
        0.025,
    )
    insight_x, insight_y = kholinar_plan_point((447, 526))
    authored_city_block(
        "Kholinar_DevotaryOfInsight",
        (insight_x, insight_y, 0.88),
        (0.46, 0.34, 0.44),
        city_surface["kholinar"],
        p["brass"],
        r,
        runtime_scale,
        0.45,
        "dome",
        p["cyan"],
        p["wood"],
        p["stone_dark"],
        3,
    )
    talenelat_x, talenelat_y = kholinar_plan_point((628, 648))
    authored_city_block(
        "Kholinar_OrderOfTalenelat",
        (talenelat_x, talenelat_y, 0.88),
        (0.42, 0.3, 0.38),
        city_surface["kholinar"],
        p["brass"],
        r,
        runtime_scale,
        -0.35,
        "flat",
        p["glass_dark"],
        p["wood"],
        p["stone_dark"],
        3,
    )

    falls_x, falls_y = kholinar_plan_point((708, 392))
    for ledge in range(5):
        cube(
            f"Kholinar_ImpossibleFalls_Ledge_{ledge + 1}",
            (
                falls_x - ledge * 0.08,
                falls_y - ledge * 0.2,
                1.2 + ledge * 0.24,
            ),
            (0.34, 0.18, 0.055),
            p["stone_dark"],
            r,
            0.025,
        )
    impossible_falls = cube(
        "Kholinar_ImpossibleFalls_Water",
        (falls_x + 0.12, falls_y - 0.37, 1.65),
        (0.22, 0.025, 0.72),
        p["water"],
        r,
        0.01,
    )
    impossible_falls.rotation_euler[1] = -0.12


def build_azimir() -> None:
    r = root("Landmark_Azimir", (-21, 8, 0))
    runtime_scale = (4.7 * 2) / 10.4

    # The supplied 600 × 894 Azimir sheet has a 512 × 666 plan field inside
    # its border. This transform registers the readable civic anchors to the
    # rectangular authored model while keeping the clerk grid at true scale.
    def azimir_plan_point(
        pixel: tuple[float, float],
    ) -> tuple[float, float]:
        return ((pixel[0] - 300) / 50, (420 - pixel[1]) * 0.014)

    azimir_civic_outline = [
        (-4.76, -4.68),
        (4.76, -4.68),
        (5.18, -4.28),
        (5.18, 4.28),
        (4.76, 4.68),
        (-4.76, 4.68),
        (-5.18, 4.28),
        (-5.18, -4.28),
    ]
    azimir_toe = natural_terrain_cradle(
        "Azimir_TerrainCradle",
        azimir_civic_outline,
        0.6,
        0.3,
        1.02,
        city_surface["azimir"],
        p["ochre"],
        p["earth"],
        r,
        1.43,
        1.18,
        4,
        1.9,
    )
    terrain_cradle_outcrops(
        "Azimir_TerrainCradle",
        azimir_toe,
        p["earth"],
        r,
        4,
        0.52,
    )

    for side, (x, y, width, depth) in enumerate(
        (
            (0, 4.62, 5.08, 0.13),
            (0, -4.62, 5.08, 0.13),
            (-5.12, 0, 0.13, 4.48),
            (5.12, 0, 0.13, 4.48),
        )
    ):
        cube(
            f"Azimir_PerimeterWall_{side + 1}",
            (x, y, 0.96),
            (width, depth, 0.48),
            city_surface["azimir"],
            r,
            0.04,
        )

    # The blueprint is defined by a rectilinear block field cut by ceremonial
    # diagonal/radial avenues. Lay roads first, then exclude their footprint
    # from the dense clerk and residential quarters.
    avenue_specs = (
        ("ImperialAxis", (0, 0), (0.2, 4.45), 0),
        ("NorthwestSoutheast", (0, 0), (5.75, 0.16), math.radians(38)),
        ("NortheastSouthwest", (0, 0), (5.75, 0.16), math.radians(-38)),
        ("PalaceMarket", (0.55, 0.12), (3.5, 0.13), math.radians(-13)),
        ("WatchpostCrossing", (-0.7, -1.35), (4.1, 0.13), math.radians(18)),
        ("NorthernFanWest", (-1.55, 2.65), (3.05, 0.12), math.radians(67)),
        ("NorthernFanEast", (1.55, 2.65), (3.05, 0.12), math.radians(-67)),
        ("SouthernFanWest", (-1.6, -2.75), (3.0, 0.12), math.radians(-66)),
        ("SouthernFanEast", (1.6, -2.75), (3.0, 0.12), math.radians(66)),
    )
    avenue_curbs = []
    for name, center, scale, rotation in avenue_specs:
        avenue = cube(
            f"Azimir_Avenue_{name}",
            (center[0], center[1], 0.64),
            (scale[0], scale[1], 0.025),
            p["stone_light"],
            r,
            0.01,
        )
        avenue.rotation_euler[2] = rotation
        normal_x = -math.sin(rotation)
        normal_y = math.cos(rotation)
        for side in (-1, 1):
            curb = cube(
                f"Azimir_Avenue_{name}_Curb_{side}",
                (
                    center[0] + normal_x * (scale[1] + 0.035) * side,
                    center[1] + normal_y * (scale[1] + 0.035) * side,
                    0.68,
                ),
                (scale[0], 0.025, 0.035),
                p["brass"],
                r,
                0.008,
            )
            curb.rotation_euler[2] = rotation
            avenue_curbs.append(curb)
    join_meshes("Azimir_AvenueCurbBatch", avenue_curbs, r)

    bronze_palace = azimir_plan_point((306, 384))
    grand_market = azimir_plan_point((354, 473))
    hospital = azimir_plan_point((386, 489))
    watchpost = azimir_plan_point((311, 519))
    thunderclast_path_center = azimir_plan_point((151, 544))
    civic_reservations = (
        (*bronze_palace, 0.9),
        (*grand_market, 0.62),
        (*hospital, 0.55),
        (*watchpost, 0.5),
        (*thunderclast_path_center, 0.62),
    )

    def inside_avenue_footprint(
        x: float,
        y: float,
        center: tuple[float, float],
        half_extents: tuple[float, float],
        rotation: float,
    ) -> bool:
        dx = x - center[0]
        dy = y - center[1]
        local_x = dx * math.cos(rotation) + dy * math.sin(rotation)
        local_y = -dx * math.sin(rotation) + dy * math.cos(rotation)
        road_clearance = 0.1
        return (
            abs(local_x) <= half_extents[0] + road_clearance
            and abs(local_y) <= half_extents[1] + road_clearance
        )

    clerk_index = 0
    for row in range(11):
        y = -4.05 + row * 0.79
        for column in range(12):
            x = -4.55 + column * 0.83
            if any(
                math.hypot(x - cx, y - cy) < radius
                for cx, cy, radius in civic_reservations
            ):
                continue
            if any(
                inside_avenue_footprint(
                    x,
                    y,
                    center,
                    half_extents,
                    rotation,
                )
                for _name, center, half_extents, rotation in avenue_specs
            ):
                continue
            clerk_index += 1
            rotation = ((row * 5 + column * 3) % 7 - 3) * 0.035
            authored_city_block(
                f"Azimir_ClerkQuarter_{clerk_index:02d}",
                (x, y, 0.64),
                (
                    0.29 + (column % 3) * 0.025,
                    0.25 + (row % 3) * 0.022,
                    0.29 + ((row + column) % 5) * 0.042,
                ),
                city_surface["azimir"],
                city_surface["azimir"],
                r,
                runtime_scale,
                rotation,
                "dome" if (row + column) % 11 == 0 else "flat",
                p["glass_dark"],
                p["wood"],
                p["stone_dark"],
                2,
            )
    if clerk_index < 70:
        raise RuntimeError(
            f"Azimir clerk grid is unexpectedly sparse: {clerk_index} blocks"
        )
    print(f"  Azimir clerk grid: {clerk_index} blocks", flush=True)

    # Bronze Palace, Grand Market, Hospital and Watchpost Tower follow the
    # relative placement in the supplied plan.
    cyl(
        "Azimir_BronzePalace_Foundation",
        (*bronze_palace, 0.92),
        0.76,
        0.32,
        p["brass"],
        r,
        16,
        0.04,
    )
    authored_city_block(
        "Azimir_BronzePalace",
        (*bronze_palace, 0.82),
        (0.62, 0.52, 0.64),
        city_surface["azimir"],
        p["brass"],
        r,
        runtime_scale,
        0,
        "dome",
        p["cyan"],
        p["wood"],
        p["stone_dark"],
        4,
    )
    for ministry_index, angle in enumerate(
        (0, math.pi / 2, math.pi, math.pi * 1.5)
    ):
        x = bronze_palace[0] + math.cos(angle) * 0.54
        y = bronze_palace[1] + math.sin(angle) * 0.45
        cyl(
            f"Azimir_Palace_Ministry_{ministry_index + 1}",
            (x, y, 1.78),
            0.12,
            0.42,
            p["teal"],
            r,
            10,
            0.018,
        )

    cyl(
        "Azimir_GrandMarket_Piazza",
        (*grand_market, 0.7),
        0.55,
        0.08,
        p["stone_light"],
        r,
        20,
        0.015,
    )
    for stall_index in range(10):
        angle = 2 * math.pi * stall_index / 10
        authored_city_block(
            f"Azimir_GrandMarket_Arcade_{stall_index + 1:02d}",
            (
                grand_market[0] + math.cos(angle) * 0.43,
                grand_market[1] + math.sin(angle) * 0.43,
                0.72,
            ),
            (0.12, 0.1, 0.15),
            city_surface["azimir"],
            p["teal"],
            r,
            runtime_scale,
            angle - math.pi / 2,
            "flat",
            p["glass_dark"],
            p["wood"],
            p["stone_dark"],
            1,
        )

    authored_city_block(
        "Azimir_Hospital",
        (*hospital, 0.72),
        (0.48, 0.34, 0.42),
        p["ivory"],
        city_surface["azimir"],
        r,
        runtime_scale,
        0.12,
        "dome",
        p["glass_dark"],
        p["wood"],
        p["stone_dark"],
        4,
    )
    cyl(
        "Azimir_WatchpostTower",
        (*watchpost, 1.45),
        0.32,
        1.65,
        city_surface["azimir"],
        r,
        12,
        0.045,
    )
    cone(
        "Azimir_WatchpostTower_Roof",
        (*watchpost, 2.42),
        0.42,
        0.04,
        0.34,
        p["brass"],
        r,
        12,
        0.025,
    )

    thunderclast_path = cube(
        "Azimir_PathOfTheThunderclast",
        (*thunderclast_path_center, 0.7),
        (1.25, 0.17, 0.035),
        p["stone_light"],
        r,
        0.012,
    )
    thunderclast_path.rotation_euler[2] = 0.08
    for footprint_index in range(7):
        x = thunderclast_path_center[0] - 1.05 + footprint_index * 0.34
        for side in (-1, 1):
            print_mark = sphere(
                f"Azimir_ThunderclastFootprint_{footprint_index + 1}_{side}",
                (x, thunderclast_path_center[1] + side * 0.09, 0.75),
                (0.1, 0.18, 0.025),
                p["stone_dark"],
                r,
                10,
                5,
            )
            print_mark.rotation_euler[2] = 0.08
    rock(
        "Azimir_DawnThunderclastStatue",
        (
            thunderclast_path_center[0] - 0.8,
            thunderclast_path_center[1] - 0.2,
            1.34,
        ),
        (0.42, 0.32, 0.82),
        p["brass"],
        r,
        2,
    )


def build_purelake() -> None:
    r = root("Landmark_Purelake", (-8, 8, 0))
    runtime_scale = (4.8 * 2) / 8.586
    door_half_width = 0.92 / (2 * 12 * runtime_scale)
    door_half_height = 2.08 / (2 * 12 * runtime_scale)
    window_half = 0.78 / (2 * 12 * runtime_scale)
    cyl("Purelake_Water_Shelf", (0, 0, 0.08), 5.2, 0.16, p["water"], r, 48, 0)
    hut_supports = []
    for i, (x, y, scale) in enumerate(
        [
            (-2.5, -1.4, 1),
            (0.1, -1.8, 0.8),
            (2.35, -0.9, 1.15),
            (-1.2, 1.55, 0.9),
            (1.55, 1.65, 0.72),
            (-3.45, 0.45, 0.78),
            (3.25, 1.25, 0.82),
            (-0.25, 3.05, 0.7),
            (0.45, 0.15, 0.68),
        ]
    ):
        for sx in (-1, 1):
            for sy in (-1, 1):
                stilt_x = x + sx * 0.4 * scale
                stilt_y = y + sy * 0.34 * scale
                cyl(
                    f"Purelake_Hut_{i}_Stilt_{sx}_{sy}",
                    (stilt_x, stilt_y, 0.32),
                    0.06 * scale,
                    0.65,
                    city_surface["purelake"],
                    r,
                    8,
                    0,
                )
                footing = cyl(
                    f"Purelake_Hut_{i}_Footing_{sx}_{sy}",
                    (stilt_x, stilt_y, 0.13),
                    0.095 * scale,
                    0.18,
                    p["stone_dark"],
                    r,
                    8,
                    0.01,
                )
                hut_supports.append(footing)
        for sy in (-1, 1):
            hut_supports.append(
                cube(
                    f"Purelake_Hut_{i}_CrossBrace_X_{sy}",
                    (x, y + sy * 0.34 * scale, 0.37),
                    (0.4 * scale, 0.025, 0.025),
                    p["wood"],
                    r,
                    0.008,
                )
            )
        for sx in (-1, 1):
            hut_supports.append(
                cube(
                    f"Purelake_Hut_{i}_CrossBrace_Y_{sx}",
                    (x + sx * 0.4 * scale, y, 0.37),
                    (0.025, 0.34 * scale, 0.025),
                    p["wood"],
                    r,
                    0.008,
                )
            )
        cube(f"Purelake_Hut_{i}_Floor", (x, y, 0.55), (0.65 * scale, 0.58 * scale, 0.12), city_surface["purelake"], r)
        sphere(f"Purelake_Hut_{i}_Rockbud", (x, y, 0.98), (0.78 * scale, 0.7 * scale, 0.55 * scale), city_surface["purelake"], r)
        cube(
            f"Purelake_Hut_{i}_Door",
            (x, y - 0.69 * scale, 0.67 + door_half_height),
            (
                door_half_width,
                0.022,
                door_half_height,
            ),
            p["wood"],
            r,
            0.01,
        )
        for side in (-1, 1):
            cube(
                f"Purelake_Hut_{i}_Window_{side}",
                (
                    x + side * 0.3 * scale,
                    y - 0.685 * scale,
                    0.98,
                ),
                (window_half, 0.018, window_half),
                p["glass_dark"],
                r,
                0.008,
            )
        for rib in (-1, 0, 1):
            shell_rib = torus(
                f"Purelake_Hut_{i}_ShellRib_{rib + 2}",
                (x, y, 0.99 + rib * 0.13 * scale),
                0.56 * scale,
                0.018,
                city_surface["purelake"],
                r,
            )
            shell_rib.scale.y = 0.84
        cube(
            f"Purelake_Hut_{i}_DoorLanding",
            (x, y - 0.79 * scale, 0.48),
            (0.23 * scale, 0.22 * scale, 0.035),
            p["wood"],
            r,
            0.012,
        )
    join_meshes("Purelake_HutSupportBatch", hut_supports, r)
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
    runtime_scale = (4.8 * 2) / 8.797
    shinovar_valley_outline = [
        (
            math.cos(2 * math.pi * index / 24)
            * (5.18 + 0.17 * math.sin(index * 1.73)),
            math.sin(2 * math.pi * index / 24)
            * (4.44 + 0.14 * math.cos(index * 1.27)),
        )
        for index in range(24)
    ]
    shinovar_toe = natural_terrain_cradle(
        "Shinovar_TerrainCradle_Valley",
        shinovar_valley_outline,
        0.36,
        0.22,
        0.78,
        p["grass"],
        p["grass"],
        p["grass"],
        r,
        1.5,
        1.24,
        1,
        2.6,
    )
    terrain_cradle_outcrops(
        "Shinovar_TerrainCradle_Valley",
        shinovar_toe,
        p["earth"],
        r,
        3,
        0.4,
    )
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
    homes = (
        (-2.4, 1.1, 1, 0.08),
        (-0.2, 1.7, 0.85, -0.16),
        (2, 0.9, 1.15, 0.12),
        (2.6, -1.1, 0.75, -0.08),
        (-2.7, -0.65, 0.82, 0.18),
        (-1.15, 0.15, 0.72, -0.1),
        (0.65, -0.45, 0.88, 0.05),
        (1.55, 2.65, 0.7, -0.22),
    )
    for i, (x, y, scale, rotation) in enumerate(homes):
        authored_city_block(
            f"Shinovar_FarmHome_{i + 1:02d}",
            (x, y, 0.2),
            (
                0.58 * scale,
                0.46 * scale,
                0.38 * scale,
            ),
            city_surface["shinovar"],
            city_surface["shinovar"],
            r,
            runtime_scale,
            rotation,
            "pitched",
            p["glass_dark"],
            p["wood"],
            p["earth"],
            2,
        )
        path_distance = 0.62 * scale
        path = cube(
            f"Shinovar_FarmHome_{i + 1:02d}_Footpath",
            (
                x + math.sin(rotation) * path_distance,
                y - math.cos(rotation) * path_distance,
                0.39,
            ),
            (0.13 * scale, 0.34 * scale, 0.022),
            p["earth"],
            r,
            0.012,
        )
        path.rotation_euler[2] = rotation
    cube(
        "Shinovar_IrrigationChannel",
        (0, -3.58, 0.405),
        (3.25, 0.1, 0.025),
        p["water"],
        r,
        0.012,
    )
    irrigation_bridges = []
    for bridge_index, x in enumerate((-2.4, -0.8, 0.8, 2.4)):
        irrigation_bridges.append(
            cube(
                f"Shinovar_IrrigationFootbridge_{bridge_index + 1}",
                (x, -3.58, 0.46),
                (0.12, 0.2, 0.035),
                p["wood"],
                r,
                0.012,
            )
        )
    join_meshes(
        "Shinovar_IrrigationFootbridgeBatch",
        irrigation_bridges,
        r,
    )
    for fence in range(5):
        y = -3.15 + fence * 0.27
        for post in range(14):
            x = -3.1 + post * 0.48
            cyl(
                f"Shinovar_FieldFence_{fence + 1}_{post + 1}",
                (x, y, 0.53),
                0.025,
                0.62,
                p["wood"],
                r,
                7,
                0,
            )
        rail = cyl(
            f"Shinovar_FieldFenceRail_{fence + 1}",
            (0, y, 0.57),
            0.022,
            6.45,
            p["wood"],
            r,
            7,
            0,
        )
        rail.rotation_euler[1] = math.pi / 2
    # Ordinary valley trees must remain subordinate to farmhouses and vastly
    # subordinate to the Misted Mountains. The previous five trees exported at
    # roughly 33–47.5 m. These orchard rows and shelterbelts are 5.2–10.8 m,
    # with explicit metadata so the web asset audit can enforce the ceiling.
    tree_positions = []
    for side in (-1, 1):
        for row in range(8):
            tree_positions.append(
                (
                    side * (3.62 + 0.11 * math.sin(row * 1.73)),
                    -2.9 + row * 0.82,
                )
            )
    for row in range(3):
        for column in range(4):
            tree_positions.append(
                (
                    -1.75 + column * 1.05 + (row % 2) * 0.18,
                    2.34 + row * 0.55,
                )
            )
    for lane_index in range(8):
        tree_positions.append(
            (
                -2.85 + lane_index * 0.82,
                -2.72 + 0.15 * math.sin(lane_index * 1.27),
            )
        )

    for tree_index, (x, y) in enumerate(tree_positions):
        height_meters = 5.2 + ((tree_index * 7) % 17) / 16 * 5.6
        authored_height = height_meters / (12 * runtime_scale)
        trunk_height = authored_height * 0.54
        crown_radius_z = authored_height * 0.46
        crown_radius_x = authored_height * (
            0.27 + (tree_index % 4) * 0.018
        )
        crown_radius_y = authored_height * (
            0.24 + ((tree_index + 2) % 4) * 0.016
        )
        tree = bpy.data.objects.new(
            f"Shinovar_Tree_{tree_index + 1:02d}",
            None,
        )
        assets.objects.link(tree)
        tree.parent = r
        tree.location = (x, y, 0)
        tree["height_meters"] = round(height_meters, 3)
        tree["vegetation_role"] = (
            "orchard"
            if 16 <= tree_index < 28
            else "shelterbelt"
        )
        cyl(
            f"Shinovar_Tree_{tree_index + 1:02d}_Trunk",
            (0, 0, 0.36 + trunk_height / 2),
            max(0.028, authored_height * 0.055),
            trunk_height,
            p["earth"],
            tree,
            9,
            0.008,
        )
        sphere(
            f"Shinovar_Tree_{tree_index + 1:02d}_CrownMain",
            (0, 0, 0.36 + trunk_height),
            (
                crown_radius_x,
                crown_radius_y,
                crown_radius_z,
            ),
            p["leaf"],
            tree,
            12,
            7,
        )
        for lobe_index, side in enumerate((-1, 1)):
            sphere(
                f"Shinovar_Tree_{tree_index + 1:02d}_CrownLobe_{lobe_index + 1}",
                (
                    side * crown_radius_x * 0.48,
                    (1 if tree_index % 2 else -1)
                    * crown_radius_y
                    * 0.22,
                    0.36
                    + trunk_height
                    - crown_radius_z * 0.18,
                ),
                (
                    crown_radius_x * 0.62,
                    crown_radius_y * 0.58,
                    crown_radius_z * 0.68,
                ),
                p["leaf"],
                tree,
                10,
                6,
            )


def build_akinah() -> None:
    r = root("Landmark_Akinah", (19, 8, 0))
    runtime_scale = (4.6 * 2) / 10.2
    akinah_island_outline = [
        (
            math.cos(2 * math.pi * index / 28)
            * (5.14 + 0.13 * math.sin(index * 1.67 + 0.4)),
            math.sin(2 * math.pi * index / 28)
            * (5.02 + 0.16 * math.cos(index * 1.31 - 0.2)),
        )
        for index in range(28)
    ]
    akinah_toe = natural_terrain_cradle(
        "Akinah_TerrainCradle_Island",
        akinah_island_outline,
        0.56,
        0.38,
        1.18,
        city_surface["akinah"],
        p["stone_dark"],
        p["stone_dark"],
        r,
        1.37,
        1.1,
        1,
        3.1,
    )
    terrain_cradle_outcrops(
        "Akinah_TerrainCradle_Island",
        akinah_toe,
        city_surface["akinah"],
        r,
        2,
        0.72,
    )
    defense_plinths = []
    for i in range(22):
        angle = 2 * math.pi * i / 22
        radius = 4.45 + 0.18 * math.sin(i * 2.1)
        height = 1.7 + 0.65 * ((i * 7) % 5) / 4
        spike_x = math.cos(angle) * radius
        spike_y = math.sin(angle) * radius
        defense_plinths.append(
            cyl(
                f"Akinah_Defense_Plinth_{i + 1:02d}",
                (spike_x, spike_y, 0.58),
                0.39,
                0.24,
                p["stone_dark"],
                r,
                8,
                0.025,
            )
        )
        spike = cone(
            f"Akinah_Defense_Spike_{i + 1:02d}",
            (spike_x, spike_y, height / 2 + 0.42),
            0.34,
            0.025,
            height,
            city_surface["akinah"],
            r,
            6,
        )
        spike.rotation_euler[2] = angle
    join_meshes("Akinah_DefensePlinthBatch", defense_plinths, r)
    for ring in range(3):
        radius = 0.9 + ring * 1.05
        count = 7 + ring * 3
        for i in range(count):
            if (i + ring) % 4 == 0:
                continue
            angle = 2 * math.pi * i / count + ring * 0.2
            height = 0.5 + 0.18 * ((i + 2 * ring) % 3)
            authored_city_block(
                f"Akinah_RuinQuarter_{ring + 1}_{i + 1:02d}",
                (
                    math.cos(angle) * radius,
                    math.sin(angle) * radius,
                    0.57,
                ),
                (0.32, 0.24, height),
                city_surface["akinah"],
                city_surface["akinah"],
                r,
                runtime_scale,
                angle - math.pi / 2,
                "flat",
                p["glass_dark"],
                p["stone_dark"],
                p["stone_dark"],
                2,
            )
    cyl("Akinah_Hidden_Oathgate", (0, 0, 0.78), 1.2, 0.26, p["slate"], r, 10)
    torus("Akinah_Hidden_Ring", (0, 0, 0.93), 0.74, 0.06, p["cyan"], r)
    oathgate_causeways = []
    for causeway_index in range(8):
        angle = 2 * math.pi * causeway_index / 8
        causeway = cube(
            f"Akinah_HiddenOathgate_Causeway_{causeway_index + 1}",
            (math.cos(angle) * 1.68, math.sin(angle) * 1.68, 0.72),
            (0.65, 0.075, 0.035),
            p["stone_light"],
            r,
            0.012,
        )
        causeway.rotation_euler[2] = angle
        oathgate_causeways.append(causeway)
    join_meshes(
        "Akinah_HiddenOathgateCausewayBatch",
        oathgate_causeways,
        r,
    )
    for rubble_index in range(42):
        angle = rubble_index * 2.399963 + 0.4
        radius = 0.8 + ((rubble_index * 17) % 39) / 10
        rock(
            f"Akinah_SaltRubble_{rubble_index + 1:02d}",
            (
                math.cos(angle) * radius,
                math.sin(angle) * radius,
                0.6 + (rubble_index % 3) * 0.035,
            ),
            (
                0.09 + (rubble_index % 5) * 0.025,
                0.07 + ((rubble_index + 2) % 4) * 0.022,
                0.06 + ((rubble_index + 1) % 3) * 0.025,
            ),
            city_surface["akinah"],
            r,
            1,
        )


def build_thaylen_city() -> None:
    r = root("Landmark_ThaylenCity", (47, 8, 0))
    runtime_scale = (4.7 * 2) / 10.8
    cyl(
        "ThaylenCity_CoastalFoundation",
        (0, 0.55, 0.26),
        5.25,
        0.52,
        city_surface["thaylen"],
        r,
        40,
        0.1,
    )
    cyl(
        "ThaylenCity_HarborBasin",
        (0, -3.55, 0.49),
        2.45,
        0.08,
        p["water"],
        r,
        32,
        0,
    )

    seawall_buttresses = []
    for wall_index in range(13):
        angle = -1.37 + wall_index * (2.74 / 12)
        x = math.sin(angle) * 4.78
        y = -0.35 + math.cos(angle) * 4.35
        wall = cube(
            f"ThaylenCity_Seawall_{wall_index + 1:02d}",
            (x, y, 0.92),
            (0.5, 0.19, 0.56),
            city_surface["thaylen"],
            r,
            0.055,
        )
        wall.rotation_euler[2] = -angle
        buttress = cube(
            f"ThaylenCity_SeawallButtress_{wall_index + 1:02d}",
            (
                x - math.sin(angle) * 0.24,
                y - math.cos(angle) * 0.24,
                0.72,
            ),
            (0.12, 0.34, 0.38),
            p["stone_dark"],
            r,
            0.028,
        )
        buttress.rotation_euler[2] = -angle
        seawall_buttresses.append(buttress)
        if wall_index % 3 == 0:
            cyl(
                f"ThaylenCity_SeawallTower_{wall_index + 1:02d}",
                (x, y, 1.4),
                0.31,
                1.45,
                p["stone"],
                r,
                12,
                0.035,
            )
    join_meshes(
        "ThaylenCity_SeawallButtressBatch",
        seawall_buttresses,
        r,
    )

    for ring, (radius, count) in enumerate(((2.0, 12), (3.1, 17), (4.05, 20))):
        for index in range(count):
            angle = 2 * math.pi * index / count + ring * 0.19
            if math.sin(angle) < -0.62 and radius > 2.5:
                continue
            half_height = 0.27 + ((index + ring) % 5) * 0.045
            authored_city_block(
                f"ThaylenCity_MerchantQuarter_{ring + 1}_{index + 1:02d}",
                (
                    math.cos(angle) * radius,
                    math.sin(angle) * radius + 0.48,
                    0.53,
                ),
                (
                    0.24 + (index % 3) * 0.035,
                    0.22 + ((index + 1) % 3) * 0.03,
                    half_height,
                ),
                city_surface["thaylen"],
                city_surface["thaylen"],
                r,
                runtime_scale,
                angle - math.pi / 2,
                "pitched",
                p["glass_dark"],
                p["wood"],
                p["stone_dark"],
                2,
            )

    cyl(
        "ThaylenCity_ExchangeHall",
        (0, 0.78, 1.45),
        0.92,
        1.95,
        city_surface["thaylen"],
        r,
        16,
        0.055,
    )
    sphere(
        "ThaylenCity_ExchangeDome",
        (0, 0.78, 2.55),
        (1.02, 1.02, 0.54),
        p["copper"],
        r,
        20,
        10,
    )
    for entrance in range(5):
        x = -0.52 + entrance * 0.26
        cube(
            f"ThaylenCity_ExchangeDoor_{entrance + 1}",
            (x, -0.155, 0.86),
            (0.075, 0.035, 0.19),
            p["wood"],
            r,
            0.012,
        )

    for dock_index in range(7):
        x = -2.25 + dock_index * 0.75
        dock_length = 1.25 + (dock_index % 3) * 0.26
        cube(
            f"ThaylenCity_Dock_{dock_index + 1}_StoneLanding",
            (x, -3.34, 0.53),
            (0.34, 0.23, 0.09),
            p["stone_dark"],
            r,
            0.022,
        )
        for plank in range(10):
            cube(
                f"ThaylenCity_Dock_{dock_index + 1}_Plank_{plank + 1:02d}",
                (
                    x,
                    -3.45 - plank * dock_length / 10,
                    0.58 + (plank % 3) * 0.004,
                ),
                (0.31, dock_length / 22, 0.025),
                city_surface["thaylen"],
                r,
                0.008,
            )
        for piling in range(4):
            cyl(
                f"ThaylenCity_Dock_{dock_index + 1}_Piling_{piling + 1}",
                (
                    x + (-0.26 if piling % 2 == 0 else 0.26),
                    -3.65 - (piling // 2) * dock_length * 0.62,
                    0.28,
                ),
                0.035,
                0.72,
                p["wood"],
                r,
                8,
                0,
            )
        if dock_index % 2 == 0:
            cyl(
                f"ThaylenCity_DockCraneMast_{dock_index + 1}",
                (x + 0.38, -3.32, 1.15),
                0.045,
                1.65,
                p["wood"],
                r,
                9,
                0,
            )
            boom = cyl(
                f"ThaylenCity_DockCraneBoom_{dock_index + 1}",
                (x + 0.72, -3.32, 1.78),
                0.035,
                0.82,
                p["wood"],
                r,
                9,
                0,
            )
            boom.rotation_euler[1] = math.pi / 2

    for boat_index in range(6):
        x = -1.9 + boat_index * 0.74
        y = -4.65 - (boat_index % 2) * 0.42
        hull = cone(
            f"ThaylenCity_MerchantShip_{boat_index + 1}_Hull",
            (x, y, 0.54),
            0.25,
            0.08,
            1.12,
            p["wood"],
            r,
            8,
            0.02,
        )
        hull.rotation_euler[0] = math.pi / 2
        cyl(
            f"ThaylenCity_MerchantShip_{boat_index + 1}_Mast",
            (x, y, 1.08),
            0.025,
            1.2,
            p["wood"],
            r,
            8,
            0,
        )
        cube(
            f"ThaylenCity_MerchantShip_{boat_index + 1}_Sail",
            (x + 0.13, y, 1.25),
            (0.18, 0.015, 0.34),
            p["cloth_red"] if boat_index % 2 else p["cloth_blue"],
            r,
            0.01,
        )


def build_vedenar() -> None:
    """Author Vedenar as a rebuilt cliff capital, not a semantic marker.

    Local +Y climbs inland from the Tarat Sea. Five inhabited ledges follow the
    plate-like geology described for the city; every ward is founded into one
    of those ledges. The Valhav Oathgate, ruined palace, library/temple
    precinct, storm shelters, burned docks, and restoration works remain
    individually named for runtime collision and QA.
    """

    random.seed(7723)
    r = root("Landmark_Vedenar", (33, -7, 0))
    runtime_scale = (4.9 * 2) / 11.4
    outline = [
        (-5.35, -4.2),
        (-3.75, -5.05),
        (-1.1, -5.42),
        (1.65, -5.28),
        (4.15, -4.62),
        (5.52, -2.95),
        (5.6, 0.15),
        (5.05, 3.4),
        (3.42, 4.85),
        (0.65, 5.35),
        (-2.1, 5.05),
        (-4.45, 3.92),
        (-5.62, 1.4),
    ]
    vedenar_toe = natural_terrain_cradle(
        "Vedenar_TerrainCradle_Cliff",
        outline,
        0.58,
        0.5,
        1.38,
        city_surface["vedenar"],
        p["stone_dark"],
        p["stone_dark"],
        r,
        1.31,
        1.1,
        3,
        2.4,
    )
    terrain_cradle_outcrops(
        "Vedenar_TerrainCradle_Cliff",
        vedenar_toe,
        p["stone_dark"],
        r,
        4,
        0.72,
    )

    terrace_specs = (
        ("Harbor", -3.72, 4.72, 1.08, 0.66),
        ("Lower", -2.02, 4.98, 1.15, 0.84),
        ("Civic", -0.18, 5.08, 1.18, 1.02),
        ("Temple", 1.72, 4.7, 1.08, 1.2),
        ("Palace", 3.55, 3.82, 0.92, 1.4),
    )
    for terrace_index, (name, y, half_width, half_depth, cap_z) in enumerate(
        terrace_specs
    ):
        points = [
            (-half_width, y - half_depth),
            (half_width * 0.93, y - half_depth * 1.03),
            (half_width, y + half_depth * 0.82),
            (half_width * 0.72, y + half_depth),
            (-half_width * 0.8, y + half_depth * 1.05),
            (-half_width, y + half_depth * 0.72),
        ]
        prism(
            f"Vedenar_Terrace_{terrace_index + 1:02d}_{name}",
            points,
            0.24 + terrace_index * 0.07,
            city_surface["vedenar"],
            r,
            cap_z - (0.12 + terrace_index * 0.035),
        )
        retaining = cube(
            f"Vedenar_Terrace_{terrace_index + 1:02d}_{name}_RetainingWall",
            (0, y - half_depth + 0.04, cap_z + 0.31),
            (half_width * 0.94, 0.12, 0.31),
            city_surface["vedenar"],
            r,
            0.035,
        )
        retaining.rotation_euler[2] = -0.018 + terrace_index * 0.01

    # The north approach remains agricultural and legible from the far LOD.
    # Its buried shelf extends the palace ledge into the foothills so the
    # fields meet stone rather than hovering above the terrain cradle.
    prism(
        "Vedenar_NorthernAgriculturalShelf",
        [
            (-4.95, 4.22),
            (4.46, 4.1),
            (4.88, 4.82),
            (4.22, 5.38),
            (1.2, 5.5),
            (-3.7, 5.6),
            (-5.2, 5.55),
            (-5.18, 4.92),
        ],
        1.008,
        city_surface["vedenar"],
        r,
        0.99,
    )
    for field_index in range(12):
        column = field_index % 4
        row = field_index // 4
        x = -3.75 + column * 2.35
        y = 4.55 + row * 0.31
        field = cube(
            f"Vedenar_NorthernField_{field_index + 1:02d}",
            (x, y, 1.49 + row * 0.012),
            (0.92, 0.11, 0.02),
            p["grass"] if field_index % 3 else p["earth"],
            r,
            0.008,
        )
        field.rotation_euler[2] = (column - 1.5) * 0.025

    # A narrow river reaches the city from the peaks and drops beside the
    # western terraces rather than cutting through the modeled wards.
    river_segments = []
    for segment_index in range(11):
        progress = segment_index / 10
        x = -4.55 + math.sin(progress * math.pi * 1.3) * 0.32
        y = 5.02 - progress * 9.45
        river = cube(
            f"Vedenar_RiverWest_Segment_{segment_index + 1:02d}",
            (x, y, 1.49 - progress * 0.82),
            (0.18 + progress * 0.045, 0.53, 0.022),
            p["water"],
            r,
            0.006,
        )
        river.rotation_euler[2] = -0.03 + math.sin(progress * 4.2) * 0.055
        river_segments.append(river)
    join_meshes("Vedenar_RiverWest_ChannelBatch", river_segments, r)

    # Dense wards follow the five ledges. Reserved gaps preserve stairs,
    # Oathgate sightlines, palace ruins, and a readable harbor.
    ward_index = 0
    for terrace_index, (_name, y, half_width, half_depth, cap_z) in enumerate(
        terrace_specs
    ):
        columns = 10 if terrace_index < 4 else 7
        rows = 2
        for row in range(rows):
            for column in range(columns):
                x = (
                    -half_width * 0.82
                    + (column + 0.5) * (half_width * 1.64 / columns)
                )
                local_y = y - half_depth * 0.42 + row * half_depth * 0.82
                if terrace_index == 2 and math.hypot(x + 0.45, local_y + 0.1) < 1.25:
                    continue
                if terrace_index == 4 and abs(x - 0.75) < 1.55:
                    continue
                if terrace_index == 0 and abs(x) < 1.25:
                    continue
                ward_index += 1
                height = (
                    0.27
                    + terrace_index * 0.045
                    + ((ward_index * 7) % 5) * 0.045
                )
                rotation = (
                    (column - columns / 2) * 0.018
                    + (row - 0.5) * 0.035
                )
                authored_city_block(
                    f"Vedenar_Ward_{ward_index:03d}",
                    (x, local_y, cap_z + 0.03),
                    (
                        0.24 + (column % 3) * 0.026,
                        0.22 + ((column + row) % 3) * 0.022,
                        height,
                    ),
                    city_surface["vedenar"],
                    p["slate"] if ward_index % 5 else p["cloth_red"],
                    r,
                    runtime_scale,
                    rotation,
                    "pitched" if ward_index % 4 == 0 else "flat",
                    p["glass_dark"],
                    p["wood"],
                    p["stone_dark"],
                    2,
                )

    # Switchback stairs and broad ledge roads physically connect the terraces.
    for terrace_index in range(len(terrace_specs) - 1):
        lower = terrace_specs[terrace_index]
        upper = terrace_specs[terrace_index + 1]
        side = -1 if terrace_index % 2 == 0 else 1
        stair_x = side * (3.42 - terrace_index * 0.22)
        lower_y = lower[1] + lower[3] * 0.72
        upper_y = upper[1] - upper[3] * 0.72
        lower_z = lower[4]
        upper_z = upper[4]
        for step_index in range(12):
            progress = step_index / 11
            cube(
                f"Vedenar_TerraceStair_{terrace_index + 1}_{step_index + 1:02d}",
                (
                    stair_x + side * math.sin(progress * math.pi) * 0.12,
                    lower_y + (upper_y - lower_y) * progress,
                    lower_z + (upper_z - lower_z) * progress,
                ),
                (0.31, 0.09, 0.045),
                p["stone_light"],
                r,
                0.01,
            )
        for landing_side in (-1, 1):
            cube(
                f"Vedenar_TerraceStair_{terrace_index + 1}_Landing_{landing_side}",
                (
                    stair_x,
                    lower_y if landing_side < 0 else upper_y,
                    lower_z if landing_side < 0 else upper_z,
                ),
                (0.46, 0.24, 0.045),
                city_surface["vedenar"],
                r,
                0.012,
            )

    # Valhav's Oathgate is a civic garden and raised approach, not a second
    # copy of Vedenar on Urithiru's terrace.
    oathgate_center = (-0.45, -0.08)
    cyl(
        "Vedenar_Valhav_Oathgate_Garden",
        (*oathgate_center, 1.09),
        1.12,
        0.12,
        p["grass"],
        r,
        32,
        0.015,
    )
    cyl(
        "Vedenar_Valhav_Oathgate_Dais",
        (*oathgate_center, 1.19),
        0.72,
        0.16,
        city_surface["vedenar"],
        r,
        20,
        0.025,
    )
    torus(
        "Vedenar_Valhav_Oathgate_Ring",
        (*oathgate_center, 1.31),
        0.44,
        0.055,
        p["cyan"],
        r,
    )
    oathgate_ramp = cube(
        "Vedenar_Valhav_Oathgate_Ramp",
        (-0.45, -1.35, 1.02),
        (0.5, 1.05, 0.075),
        city_surface["vedenar"],
        r,
        0.018,
    )
    oathgate_ramp.rotation_euler[0] = -0.085
    for garden_index in range(12):
        angle = 2 * math.pi * garden_index / 12
        rock(
            f"Vedenar_Valhav_Oathgate_GardenStone_{garden_index + 1:02d}",
            (
                oathgate_center[0] + math.cos(angle) * 0.92,
                oathgate_center[1] + math.sin(angle) * 0.92,
                1.24,
            ),
            (0.1, 0.075, 0.11),
            p["stone_light"],
            r,
            1,
        )

    # Isharest's library and temple compound survive on the eastern temple
    # ledge and provide a strong civic silhouette beside the damaged palace.
    authored_city_block(
        "Vedenar_Pailiah_LibraryTemple",
        (2.55, 1.72, 1.25),
        (0.72, 0.55, 0.72),
        city_surface["vedenar"],
        p["slate"],
        r,
        runtime_scale,
        0.04,
        "dome",
        p["cyan"],
        p["wood"],
        p["stone_dark"],
        4,
    )
    for shelter_index, x in enumerate((-3.3, -1.8, 1.45, 3.25)):
        cube(
            f"Vedenar_StormShelter_{shelter_index + 1:02d}",
            (x, 1.48 + (shelter_index % 2) * 0.42, 1.38),
            (0.46, 0.35, 0.25),
            p["stone_dark"],
            r,
            0.055,
        )

    # The upper palace is visibly ruined but remains part of the same terrace.
    palace_center = (0.72, 3.55)
    prism(
        "Vedenar_RuinedPalace_Foundation",
        [
            (-0.7, 2.78),
            (2.18, 2.88),
            (2.35, 4.12),
            (0.1, 4.48),
            (-0.88, 3.8),
        ],
        0.22,
        city_surface["vedenar"],
        r,
        1.48,
    )
    for ruin_index in range(9):
        angle = ruin_index * 2.399963
        radius = 0.36 + (ruin_index % 4) * 0.24
        x = palace_center[0] + math.cos(angle) * radius
        y = palace_center[1] + math.sin(angle) * radius * 0.72
        height = 0.32 + (ruin_index % 4) * 0.14
        tower = cube(
            f"Vedenar_RuinedPalace_Tower_{ruin_index + 1:02d}",
            (x, y, 1.52 + height),
            (0.25, 0.22, height),
            city_surface["vedenar"],
            r,
            0.045,
        )
        tower.rotation_euler[2] = angle * 0.13
        if ruin_index % 2 == 0:
            rock(
                f"Vedenar_RuinedPalace_Collapse_{ruin_index + 1:02d}",
                (x + 0.18, y - 0.12, 1.58),
                (0.22, 0.18, 0.13),
                p["stone_dark"],
                r,
                1,
            )

    # A natural ridge shelters the burned harbor. Quays are seated at the
    # lowest terrace while blackened frames and active scaffolds show repair.
    ridge_rocks = []
    for ridge_index in range(16):
        x = -5.1 + ridge_index * 0.68
        y = -5.18 - 0.34 * math.sin(ridge_index * 0.47)
        ridge_rocks.append(
            rock(
                f"Vedenar_HarborShelterRidge_{ridge_index + 1:02d}",
                (x, y, 0.62 + (ridge_index % 3) * 0.11),
                (0.52, 0.32, 0.45 + (ridge_index % 4) * 0.1),
                p["stone_dark"],
                r,
                1,
            )
        )
    join_meshes("Vedenar_HarborShelterRidgeBatch", ridge_rocks, r)
    for dock_index in range(6):
        x = -2.9 + dock_index * 1.12
        dock = cube(
            f"Vedenar_BurnedHarbor_Dock_{dock_index + 1:02d}",
            (x, -5.35, 0.67),
            (0.39, 0.84, 0.055),
            p["wood"],
            r,
            0.018,
        )
        dock.rotation_euler[2] = (dock_index - 2.5) * 0.018
        for post_side in (-1, 1):
            cyl(
                f"Vedenar_BurnedHarbor_Dock_{dock_index + 1:02d}_Post_{post_side}",
                (x + post_side * 0.28, -5.72, 0.81),
                0.04,
                0.62,
                p["wood"],
                r,
                8,
                0,
            )

    for repair_index in range(10):
        x = -3.72 + (repair_index % 5) * 1.64
        y = -3.92 + (repair_index // 5) * 0.54
        for side in (-1, 1):
            cyl(
                f"Vedenar_Restoration_Scaffold_{repair_index + 1:02d}_Post_{side}",
                (x + side * 0.24, y, 1.18),
                0.025,
                1.04,
                p["wood"],
                r,
                8,
                0,
            )
        beam = cyl(
            f"Vedenar_Restoration_Scaffold_{repair_index + 1:02d}_Beam",
            (x, y, 1.58),
            0.025,
            0.62,
            p["rope"],
            r,
            8,
            0,
        )
        beam.rotation_euler[1] = math.pi / 2

    for rubble_index in range(36):
        angle = rubble_index * 2.399963 + 0.2
        radius = 0.3 + ((rubble_index * 13) % 31) / 10
        zone_x = palace_center[0] if rubble_index < 22 else 0
        zone_y = palace_center[1] if rubble_index < 22 else -4.08
        rock(
            f"Vedenar_Restoration_Rubble_{rubble_index + 1:02d}",
            (
                zone_x + math.cos(angle) * radius,
                zone_y + math.sin(angle) * radius * 0.45,
                1.54 if rubble_index < 22 else 0.82,
            ),
            (
                0.07 + (rubble_index % 4) * 0.025,
                0.055 + ((rubble_index + 1) % 3) * 0.022,
                0.045 + ((rubble_index + 2) % 3) * 0.02,
            ),
            p["stone_dark"],
            r,
            1,
        )

    r["authored_ward_count"] = ward_index
    r["contains_destination_geometry"] = True
    r["oathgate_is_local_portal"] = True


def build_shattered_plains() -> None:
    random.seed(9981)
    r = root("Landmark_Shattered_Plains", (33, 8, 0))
    runtime_scale = (4.4 * 2) / 12.14
    topology_path = (
        ROOT
        / "src"
        / "world"
        / "terrain"
        / "shatteredPlainsTopology.json"
    )
    topology = json.loads(topology_path.read_text())
    if len(topology["plateaus"]) != 37 or len(topology["bridges"]) != 9:
        raise RuntimeError(
            "Shattered Plains topology must define 37 plateaus and 9 bridges"
        )
    source_chasm_floor_y = topology["patch"]["chasmFloorY"]
    vertical_compression = topology["patch"]["verticalCompression"]
    source_mean_cap_y = sum(
        plateau["capY"] for plateau in topology["plateaus"]
    ) / len(topology["plateaus"])

    def display_y(source_y):
        return (
            source_y - source_mean_cap_y
        ) * vertical_compression

    for plateau in topology["plateaus"]:
        plateau["capY"] = display_y(plateau["capY"])
    for bridge_spec in topology["bridges"]:
        bridge_spec["startY"] = display_y(bridge_spec["startY"])
        bridge_spec["endY"] = display_y(bridge_spec["endY"])
    foundation = topology["districts"]["westernWarcamp"]["foundation"]
    foundation["baseY"] = display_y(foundation["baseY"])
    foundation["surfaceY"] = display_y(foundation["surfaceY"])
    chasm_floor_y = display_y(source_chasm_floor_y)
    # This authored floor remains a named QA datum but is hidden at runtime;
    # the selected-detail patch supplies the continuous floor and outer blend.
    cyl(
        "ShatteredPlains_Chasm_Floor",
        (0, 0, (chasm_floor_y - 0.05) / runtime_scale),
        topology["patch"]["outerRadiusX"] / runtime_scale,
        0.1 / runtime_scale,
        city_surface["shattered"],
        r,
        64,
        0,
    )
    for index, plateau in enumerate(topology["plateaus"]):
        points = [
            (
                point[0] / runtime_scale,
                -point[1] / runtime_scale,
            )
            for point in plateau["polygon"]
        ]
        cap_y = plateau["capY"]
        plateau_height = (cap_y - chasm_floor_y) / runtime_scale
        plateau_center_y = (
            (cap_y + chasm_floor_y) / 2 / runtime_scale
        )
        prism(
            f"ShatteredPlains_Plateau_{index + 1:02d}",
            points,
            plateau_height,
            city_surface["shattered"],
            r,
            plateau_center_y,
        )
    bridge_abutments = []
    for index, bridge_spec in enumerate(topology["bridges"]):
        start_x, start_z = bridge_spec["start"]
        end_x, end_z = bridge_spec["end"]
        delta_x = end_x - start_x
        delta_blender_y = -(end_z - start_z)
        distance = math.hypot(delta_x, delta_blender_y)
        vertical_delta = bridge_spec["endY"] - bridge_spec["startY"]
        sloped_distance = math.hypot(distance, vertical_delta)
        bridge_half_height = 0.045
        bridge_angle = math.atan2(delta_blender_y, delta_x)
        bridge_slope = math.atan2(vertical_delta, distance)
        bridge = cube(
            f"ShatteredPlains_Bridge_{index + 1:02d}_{bridge_spec['id']}",
            (
                (start_x + end_x) / 2 / runtime_scale,
                -(start_z + end_z) / 2 / runtime_scale,
                (
                    (bridge_spec["startY"] + bridge_spec["endY"])
                    / 2
                    - bridge_half_height
                )
                / runtime_scale,
            ),
            (
                sloped_distance / 2 / runtime_scale,
                bridge_spec["width"] / 2 / runtime_scale,
                bridge_half_height / runtime_scale,
            ),
            p["wood"],
            r,
            0.02,
        )
        bridge.rotation_euler[1] = -bridge_slope
        bridge.rotation_euler[2] = bridge_angle
        bridge["bridge_id"] = bridge_spec["id"]
        bridge["source_plateau_id"] = bridge_spec["sourcePlateauId"]
        bridge["destination_plateau_id"] = bridge_spec[
            "destinationPlateauId"
        ]
        for side_index, (endpoint, endpoint_y) in enumerate(
            (
                (bridge_spec["start"], bridge_spec["startY"]),
                (bridge_spec["end"], bridge_spec["endY"]),
            )
        ):
            abutment = cube(
                f"ShatteredPlains_Bridge_{index + 1:02d}_Abutment_{side_index + 1}",
                (
                    endpoint[0] / runtime_scale,
                    -endpoint[1] / runtime_scale,
                    (endpoint_y - 0.12) / runtime_scale,
                ),
                (
                    0.14 / runtime_scale,
                    (bridge_spec["width"] * 0.68) / runtime_scale,
                    0.14 / runtime_scale,
                ),
                p["stone_dark"],
                r,
                0.022,
            )
            abutment.rotation_euler[2] = bridge_angle
            bridge_abutments.append(abutment)
    join_meshes(
        "ShatteredPlains_BridgeAbutmentBatch",
        bridge_abutments,
        r,
    )
    plateau_by_id = {
        plateau["id"]: plateau for plateau in topology["plateaus"]
    }

    def authored_plateau_center(plateau_id):
        plateau = plateau_by_id[plateau_id]
        count = len(plateau["polygon"])
        return (
            sum(point[0] for point in plateau["polygon"])
            / count
            / runtime_scale,
            -sum(point[1] for point in plateau["polygon"])
            / count
            / runtime_scale,
            plateau["capY"] / runtime_scale,
        )

    narak = bpy.data.objects.new("Narak_Stormseat_Precinct", None)
    assets.objects.link(narak)
    narak.parent = r
    narak["district"] = "Narak / Stormseat"
    narak["topology_plateau_ids"] = ",".join(
        topology["districts"]["narak"]["plateauIds"]
    )
    central_x, central_y, central_cap = authored_plateau_center(
        "plateau-01"
    )
    cyl(
        "Stormseat_Central_Dais",
        (central_x, central_y, central_cap + 0.08),
        0.42,
        0.16,
        p["slate"],
        r,
        12,
        0.018,
    )
    torus(
        "Stormseat_Oathgate_Ring",
        (central_x, central_y, central_cap + 0.19),
        0.27,
        0.035,
        p["cyan"],
        r,
    )
    for ruin_index, plateau_id in enumerate(
        topology["districts"]["narak"]["plateauIds"]
    ):
        x, y, cap = authored_plateau_center(plateau_id)
        rotation = ruin_index * 2.399963 + 0.18
        authored_city_block(
            f"Stormseat_RuinBuilding_{ruin_index + 1:02d}",
            (x, y, cap + 0.012),
            (
                0.12 + (ruin_index % 3) * 0.018,
                0.1 + ((ruin_index + 1) % 3) * 0.015,
                0.16 + (ruin_index % 4) * 0.035,
            ),
            city_surface["shattered"],
            city_surface["shattered"],
            r,
            runtime_scale,
            rotation,
            "flat",
            p["glass_dark"],
            p["stone_dark"],
            p["stone_dark"],
            2,
        )
        # Listener homes, crem partitions, and rockbud plots make Narak a
        # living precinct layered onto the older city rather than one dais.
        if ruin_index > 0:
            home = rock(
                f"Narak_CarapaceHome_{ruin_index:02d}",
                (
                    x + math.cos(rotation) * 0.16,
                    y + math.sin(rotation) * 0.14,
                    cap + 0.15,
                ),
                (0.14, 0.11, 0.13),
                p["slate"] if ruin_index % 2 else p["stone_dark"],
                r,
                2,
            )
            home["district"] = "Narak listener quarter"
            partition = cube(
                f"Narak_CremPartition_{ruin_index:02d}",
                (
                    x - math.sin(rotation) * 0.17,
                    y + math.cos(rotation) * 0.17,
                    cap + 0.055,
                ),
                (0.16, 0.025, 0.055),
                p["stone_light"],
                r,
                0.008,
            )
            partition.rotation_euler[2] = rotation
            for bud_index in range(3):
                rock(
                    f"Narak_RockbudPlot_{ruin_index:02d}_{bud_index + 1}",
                    (
                        x
                        + math.cos(
                            rotation + bud_index * math.pi * 2 / 3
                        )
                        * 0.22,
                        y
                        + math.sin(
                            rotation + bud_index * math.pi * 2 / 3
                        )
                        * 0.2,
                        cap + 0.035,
                    ),
                    (0.035, 0.03, 0.028),
                    p["red_leaf"],
                    r,
                    1,
                )
    watch_x, watch_y, watch_cap = authored_plateau_center("plateau-02")
    cyl(
        "Narak_Stormseat_Watchtower",
        (watch_x, watch_y, watch_cap + 0.48),
        0.12,
        0.96,
        city_surface["shattered"],
        r,
        10,
        0.025,
    )
    cone(
        "Narak_Stormseat_Watchtower_Carapace",
        (watch_x, watch_y, watch_cap + 1.02),
        0.19,
        0.04,
        0.2,
        p["slate"],
        r,
        8,
        0.018,
    )

    warcamp_spec = topology["districts"]["westernWarcamp"]
    warcamp_x = warcamp_spec["anchor"][0] / runtime_scale
    warcamp_y = -warcamp_spec["anchor"][1] / runtime_scale
    warcamp_base = warcamp_spec["foundation"]["baseY"] / runtime_scale
    warcamp_surface = (
        warcamp_spec["foundation"]["surfaceY"] / runtime_scale
    )
    warcamp_depth = warcamp_surface - warcamp_base
    cyl(
        "Warcamp_TerrainSkirt",
        (
            warcamp_x,
            warcamp_y,
            warcamp_base + warcamp_depth / 2,
        ),
        warcamp_spec["foundation"]["radius"] / runtime_scale,
        warcamp_depth,
        p["stone_dark"],
        r,
        24,
        0.045,
    )
    torus(
        "Warcamp_Crater_Rim",
        (warcamp_x, warcamp_y, warcamp_surface + 0.04),
        warcamp_spec["foundation"]["walkableRadius"] / runtime_scale,
        0.075,
        p["stone_dark"],
        r,
    )
    warcamp_ramp = cube(
        "Warcamp_ApproachRamp",
        (warcamp_x + 0.55, warcamp_y - 0.25, warcamp_surface + 0.035),
        (0.42, 0.14, 0.035),
        p["stone_light"],
        r,
        0.018,
    )
    warcamp_ramp.rotation_euler[2] = -0.25
    for i in range(7):
        angle = 2 * math.pi * i / 7
        cube(
            f"Warcamp_Barrack_{i + 1}",
            (
                warcamp_x + math.cos(angle) * 0.57,
                warcamp_y + math.sin(angle) * 0.57,
                warcamp_surface + 0.18,
            ),
            (0.11, 0.22, 0.18),
            p["ochre"],
            r,
            0.035,
        ).rotation_euler[2] = angle
    temple_x, temple_y, temple_cap = authored_plateau_center(
        "plateau-36"
    )
    for i in range(6):
        cyl(
            f"Chasm_Temple_Column_{i + 1}",
            (
                temple_x + ((i % 3) - 1) * 0.13,
                temple_y + ((i // 3) - 0.5) * 0.25,
                temple_cap + 0.34,
            ),
            0.055,
            0.68,
            p["stone_light"],
            r,
            8,
            0.02,
        )
    # A working warcamp edge: wet paving, scaffolds, stores, shelters and bridge
    # components make the plateau feel occupied at close LOD.
    for row in range(5):
        for column in range(6):
            x = warcamp_x - 0.5 + column * 0.2
            y = warcamp_y - 0.42 + row * 0.21
            slab = cube(
                f"Warcamp_Paving_{row + 1}_{column + 1}",
                (
                    x,
                    y,
                    warcamp_surface
                    + 0.02
                    + ((row + column) % 3) * 0.008,
                ),
                (0.09, 0.09, 0.018),
                p["wet_stone"] if (row + column) % 4 else p["stone_light"],
                r,
                0.025,
            )
            slab.rotation_euler[2] = ((row * 7 + column * 3) % 5 - 2) * 0.025
    for bay in range(4):
        x = warcamp_x - 0.45 + bay * 0.3
        for side in (-1, 1):
            cyl(
                f"Warcamp_Scaffold_Post_{bay + 1}_{side}",
                (
                    x,
                    warcamp_y - 0.2 + side * 0.22,
                    warcamp_surface + 0.48,
                ),
                0.025,
                0.96,
                p["wood"],
                r,
                8,
                0,
            )
        beam = cyl(
            f"Warcamp_Scaffold_Beam_{bay + 1}",
            (x, warcamp_y - 0.2, warcamp_surface + 0.84),
            0.022,
            0.56,
            p["rope"],
            r,
            8,
            0,
        )
        beam.rotation_euler[0] = math.pi / 2
    for tent in range(4):
        x = warcamp_x - 0.48 + tent * 0.31
        y = warcamp_y + 0.48 + (tent % 2) * 0.12
        cone(
            f"Warcamp_StormTent_{tent + 1}",
            (x, y, warcamp_surface + 0.34),
            0.22,
            0.05,
            0.42,
            p["cloth_blue"] if tent % 2 else p["cloth_red"],
            r,
            4,
            0.025,
        ).rotation_euler[2] = math.pi / 4
        cube(
            f"Warcamp_TentWall_{tent + 1}",
            (x, y, warcamp_surface + 0.13),
            (0.2, 0.16, 0.13),
            p["cloth_blue"] if tent % 2 else p["cloth_red"],
            r,
            0.025,
        )
    for crate_index in range(14):
        x = warcamp_x - 0.58 + (crate_index % 5) * 0.19
        y = warcamp_y - 0.62 + (crate_index // 5) * 0.18
        cube(
            f"Warcamp_Crate_{crate_index + 1:02d}",
            (
                x,
                y,
                warcamp_surface + 0.08 + (crate_index % 2) * 0.1,
            ),
            (0.08, 0.08, 0.08),
            p["wood"],
            r,
            0.02,
        )
    r["topology_source"] = "src/world/terrain/shatteredPlainsTopology.json"
    r["plateau_count"] = len(topology["plateaus"])
    r["bridge_count"] = len(topology["bridges"])
    r["vertical_compression"] = vertical_compression


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
    # Skin and hair stay softly rough while generated textile grain is reused
    # across role-specific dyes. This keeps the close actors material-rich
    # without adding a separate large bitmap for every garment.
    skin_dark = material("SF_Skin_Azish", (0.24, 0.085, 0.035), 0, 0.72)
    skin_brown = material("SF_Skin_Alethi", (0.36, 0.16, 0.07), 0, 0.7)
    skin_tan = material("SF_Skin_Purelaker", (0.44, 0.24, 0.12), 0, 0.7)
    skin_pale = material("SF_Skin_Shin", (0.72, 0.54, 0.41), 0, 0.72)
    singer_red = material("SF_Singer_Red", (0.5, 0.055, 0.028), 0, 0.72)
    singer_black = material("SF_Singer_Black", (0.023, 0.016, 0.015), 0.05, 0.55)
    aimian_skin = material("SF_Skin_Aimian_Blue", (0.20, 0.42, 0.58), 0, 0.66)
    hair_black = material("SF_Hair_Black", (0.01, 0.008, 0.007), 0, 0.48)
    hair_brown = material("SF_Hair_Brown", (0.09, 0.035, 0.018), 0, 0.52)
    hair_white = material("SF_Hair_White", (0.72, 0.72, 0.68), 0, 0.58)
    eye_white = material("SF_Eye_White", (0.78, 0.74, 0.65), 0, 0.4)
    eye_dark = material("SF_Eye_Dark", (0.012, 0.015, 0.014), 0, 0.3)
    mouth = material("SF_Mouth", (0.22, 0.045, 0.035), 0, 0.68)
    leather = material("SF_Actor_Leather", (0.09, 0.045, 0.021), 0, 0.76)

    def enrich_skin(
        skin: bpy.types.Material,
        base_color: tuple[float, float, float],
    ) -> None:
        """Give close-detail skin fine tonal breakup and soft subsurface depth."""
        skin.use_nodes = True
        nodes = skin.node_tree.nodes
        links = skin.node_tree.links
        bsdf = nodes.get("Principled BSDF")
        if not bsdf:
            return
        coordinates = nodes.new("ShaderNodeTexCoord")
        coordinates.name = f"{skin.name}_Coordinates"
        tonal_noise = nodes.new("ShaderNodeTexNoise")
        tonal_noise.name = f"{skin.name}_TonalVariation"
        tonal_noise.inputs["Scale"].default_value = 8.5
        tonal_noise.inputs["Detail"].default_value = 4
        tonal_noise.inputs["Roughness"].default_value = 0.68
        tonal_ramp = nodes.new("ShaderNodeValToRGB")
        tonal_ramp.name = f"{skin.name}_Complexion"
        tonal_ramp.color_ramp.elements[0].position = 0.22
        tonal_ramp.color_ramp.elements[0].color = (
            base_color[0] * 0.66,
            base_color[1] * 0.64,
            base_color[2] * 0.62,
            1,
        )
        tonal_ramp.color_ramp.elements[1].position = 0.78
        tonal_ramp.color_ramp.elements[1].color = (
            min(base_color[0] * 1.22, 1),
            min(base_color[1] * 1.18, 1),
            min(base_color[2] * 1.13, 1),
            1,
        )
        pore_noise = nodes.new("ShaderNodeTexNoise")
        pore_noise.name = f"{skin.name}_Pores"
        pore_noise.inputs["Scale"].default_value = 92
        pore_noise.inputs["Detail"].default_value = 2.5
        pore_noise.inputs["Roughness"].default_value = 0.72
        pore_bump = nodes.new("ShaderNodeBump")
        pore_bump.name = f"{skin.name}_PoreBump"
        pore_bump.inputs["Strength"].default_value = 0.11
        pore_bump.inputs["Distance"].default_value = 0.012
        links.new(coordinates.outputs["Generated"], tonal_noise.inputs["Vector"])
        links.new(tonal_noise.outputs["Fac"], tonal_ramp.inputs["Fac"])
        links.new(tonal_ramp.outputs["Color"], bsdf.inputs["Base Color"])
        links.new(coordinates.outputs["Generated"], pore_noise.inputs["Vector"])
        links.new(pore_noise.outputs["Fac"], pore_bump.inputs["Height"])
        links.new(pore_bump.outputs["Normal"], bsdf.inputs["Normal"])
        bsdf.inputs["Roughness"].default_value = 0.58
        bsdf.inputs["Subsurface Weight"].default_value = 0.08
        bsdf.inputs["Subsurface Scale"].default_value = 0.12
        bsdf.inputs["Specular IOR Level"].default_value = 0.28

    for skin, base_color in (
        (skin_dark, (0.24, 0.085, 0.035)),
        (skin_brown, (0.36, 0.16, 0.07)),
        (skin_tan, (0.44, 0.24, 0.12)),
        (skin_pale, (0.72, 0.54, 0.41)),
    ):
        enrich_skin(skin, base_color)

    def actor_cloth(name: str, color: tuple[float, float, float]):
        cloth = textured_material(
            name,
            color,
            "rosharan-cloth-realistic.jpg",
            0,
            0.78,
            0.1,
        )
        nodes = cloth.node_tree.nodes
        links = cloth.node_tree.links
        texture = nodes.get(f"{name}_Texture")
        bsdf = nodes.get("Principled BSDF")
        if bsdf:
            for base_color_link in list(bsdf.inputs["Base Color"].links):
                links.remove(base_color_link)
            bsdf.inputs["Base Color"].default_value = (*color, 1)
        if texture and not texture.inputs["Vector"].is_linked:
            coordinates = nodes.new("ShaderNodeTexCoord")
            coordinates.name = f"{name}_Generated_Coordinates"
            links.new(coordinates.outputs["Generated"], texture.inputs["Vector"])
        return cloth

    blue = actor_cloth("SF_Alethi_Tailored_Blue", (0.035, 0.12, 0.29))
    plum = actor_cloth("SF_Azish_Plum", (0.24, 0.055, 0.18))
    cream = actor_cloth("SF_Cloth_Cream", (0.64, 0.56, 0.42))
    red = actor_cloth("SF_Listener_Redcloth", (0.38, 0.025, 0.018))
    grey = actor_cloth("SF_Thaylen_Grey", (0.18, 0.22, 0.23))
    teal = actor_cloth("SF_Purelaker_Teal", (0.045, 0.29, 0.3))
    veden_red = actor_cloth("SF_Veden_Russet", (0.36, 0.055, 0.05))
    reshi_green = actor_cloth("SF_Reshi_Wrap", (0.2, 0.32, 0.11))
    porter_ochre = actor_cloth("SF_Kharbranth_Porter_Ochre", (0.36, 0.19, 0.065))
    surgeon_ivory = actor_cloth("SF_Kharbranth_Surgeon_Ivory", (0.66, 0.61, 0.5))
    scholar_teal = actor_cloth("SF_Kharbranth_Scholar_Teal", (0.055, 0.24, 0.27))
    dock_rust = actor_cloth("SF_Kharbranth_Dock_Rust", (0.38, 0.11, 0.055))

    def person_base(
        name,
        x,
        skin,
        cloth,
        height,
        broad=1,
        feminine=False,
        hair=hair_black,
        sleeveless=False,
        eye_scale=1,
    ):
        """Build a proportioned, facially readable, limb-addressable resident.

        All coordinates are normalized against a two-unit body. Distinct limb
        names let the Three.js close-detail pass add gait on top of route motion.
        """

        actor = root(name, (x, 20, 0))
        s = height / 2
        shoulder = (0.32 if feminine else 0.35) * broad
        hip = (0.24 if feminine else 0.26) * broad
        arm_mat = skin if sleeveless else cloth

        for side in (-1, 1):
            label = "L" if side < 0 else "R"
            leg_x = side * 0.115 * broad * s
            cube(
                f"{name}_Boot_{label}",
                (leg_x, -0.055 * s, 0.075 * s),
                (0.105 * broad * s, 0.17 * s, 0.075 * s),
                leather,
                actor,
                0.028 * s,
            )
            cyl(
                f"{name}_LowerLeg_{label}",
                (leg_x, 0, 0.31 * s),
                0.08 * broad * s,
                0.46 * s,
                leather,
                actor,
                12,
                0.018 * s,
            )
            sphere(
                f"{name}_Knee_{label}",
                (leg_x, -0.01 * s, 0.55 * s),
                (0.092 * broad * s, 0.085 * s, 0.09 * s),
                cloth,
                actor,
                12,
                7,
            )
            cyl(
                f"{name}_UpperLeg_{label}",
                (leg_x, 0, 0.76 * s),
                0.095 * broad * s,
                0.43 * s,
                cloth,
                actor,
                12,
                0.02 * s,
            )

        cone(
            f"{name}_Pelvis",
            (0, 0.005 * s, 0.96 * s),
            hip * s,
            (hip + 0.025) * s,
            0.29 * s,
            cloth,
            actor,
            16,
            0.025 * s,
        )
        cone(
            f"{name}_Torso",
            (0, 0, 1.27 * s),
            (0.23 if feminine else 0.26) * broad * s,
            shoulder * s,
            0.57 * s,
            cloth,
            actor,
            18,
            0.035 * s,
        )
        cube(
            f"{name}_Collar",
            (0, -0.19 * s, 1.48 * s),
            (0.17 * broad * s, 0.025 * s, 0.07 * s),
            p["brass"],
            actor,
            0.012 * s,
        )

        for side in (-1, 1):
            label = "L" if side < 0 else "R"
            arm_x = side * shoulder * 1.05 * s
            sphere(
                f"{name}_Shoulder_{label}",
                (arm_x, 0, 1.44 * s),
                (0.11 * broad * s, 0.105 * s, 0.115 * s),
                arm_mat,
                actor,
                14,
                8,
            )
            upper_arm = cyl(
                f"{name}_UpperArm_{label}",
                (arm_x + side * 0.02 * s, 0, 1.28 * s),
                0.075 * broad * s,
                0.34 * s,
                arm_mat,
                actor,
                12,
                0.018 * s,
            )
            upper_arm.rotation_euler[1] = side * 0.055
            sphere(
                f"{name}_Elbow_{label}",
                (arm_x + side * 0.03 * s, 0, 1.09 * s),
                (0.078 * broad * s, 0.074 * s, 0.078 * s),
                arm_mat,
                actor,
                12,
                7,
            )
            lower_arm = cyl(
                f"{name}_LowerArm_{label}",
                (arm_x + side * 0.035 * s, -0.01 * s, 0.94 * s),
                0.064 * broad * s,
                0.31 * s,
                arm_mat,
                actor,
                12,
                0.016 * s,
            )
            lower_arm.rotation_euler[1] = side * 0.04
            sphere(
                f"{name}_Hand_{label}",
                (arm_x + side * 0.04 * s, -0.015 * s, 0.765 * s),
                (0.072 * broad * s, 0.055 * s, 0.095 * s),
                skin,
                actor,
                14,
                8,
            )

        cyl(
            f"{name}_Neck",
            (0, 0, 1.56 * s),
            0.105 * broad * s,
            0.18 * s,
            skin,
            actor,
            14,
            0.012 * s,
        )
        sphere(
            f"{name}_Head",
            (0, 0, 1.76 * s),
            (0.19 * broad * s, 0.17 * s, 0.235 * s),
            skin,
            actor,
            20,
            12,
        )
        for side in (-1, 1):
            label = "L" if side < 0 else "R"
            sphere(
                f"{name}_Ear_{label}",
                (side * 0.19 * broad * s, 0, 1.75 * s),
                (0.036 * s, 0.025 * s, 0.065 * s),
                skin,
                actor,
                10,
                6,
            )
            sphere(
                f"{name}_EyeWhite_{label}",
                (side * 0.072 * broad * s, -0.164 * s, 1.79 * s),
                (
                    0.038 * eye_scale * s,
                    0.018 * s,
                    0.028 * eye_scale * s,
                ),
                eye_white,
                actor,
                12,
                7,
            )
            sphere(
                f"{name}_Iris_{label}",
                (side * 0.072 * broad * s, -0.181 * s, 1.79 * s),
                (0.014 * eye_scale * s, 0.009 * s, 0.015 * eye_scale * s),
                eye_dark,
                actor,
                10,
                6,
            )
            brow = cube(
                f"{name}_Brow_{label}",
                (side * 0.074 * broad * s, -0.179 * s, 1.85 * s),
                (0.052 * eye_scale * s, 0.009 * s, 0.012 * s),
                hair,
                actor,
                0.006 * s,
            )
            brow.rotation_euler[2] = side * -0.09
        sphere(
            f"{name}_Nose",
            (0, -0.188 * s, 1.715 * s),
            (0.038 * s, 0.052 * s, 0.064 * s),
            skin,
            actor,
            12,
            7,
        )
        cube(
            f"{name}_Mouth",
            (0, -0.172 * s, 1.63 * s),
            (0.062 * s, 0.01 * s, 0.009 * s),
            mouth,
            actor,
            0.006 * s,
        )
        sphere(
            f"{name}_HairCap",
            (0, 0.018 * s, 1.89 * s),
            (0.195 * broad * s, 0.178 * s, 0.15 * s),
            hair,
            actor,
            18,
            10,
        )
        return actor

    human_base_path = ROOT / "blender" / "vendor" / "human-base-meshes.blend"
    requested_bases = ["SF_WebHuman_Male", "SF_WebHuman_Female"]
    with bpy.data.libraries.load(str(human_base_path), link=False) as (
        source_data,
        target_data,
    ):
        target_data.objects = [
            base_name
            for base_name in requested_bases
            if base_name in source_data.objects
        ]
    human_bases = dict(zip(requested_bases, target_data.objects))

    def make_body_subset(
        source_mesh: bpy.types.Mesh,
        name: str,
        minimum_z: float,
        maximum_z: float,
        expansion: float,
        x_limit: float | None = None,
        front_opening: float = 0,
        hair_shell: bool = False,
    ) -> bpy.types.Mesh:
        """Copy a region of a CC0 anatomical mesh for fitted real-time clothing."""

        mesh = source_mesh.copy()
        mesh.name = f"{name}_Mesh"
        editable = bmesh.new()
        editable.from_mesh(mesh)
        editable.faces.ensure_lookup_table()
        to_delete = []
        for face in editable.faces:
            center = face.calc_center_median()
            keep = minimum_z <= center.z <= maximum_z
            if x_limit is not None:
                keep = keep and abs(center.x) <= x_limit
            if front_opening and center.y < -0.015 and abs(center.x) < front_opening:
                keep = False
            if hair_shell:
                keep = keep and (
                    center.y > -0.035
                    or center.z > minimum_z + (maximum_z - minimum_z) * 0.72
                )
            if not keep:
                to_delete.append(face)
        bmesh.ops.delete(editable, geom=to_delete, context="FACES")
        editable.normal_update()
        if expansion:
            for vertex in editable.verts:
                vertex.co += vertex.normal * expansion
        editable.to_mesh(mesh)
        editable.free()
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        mesh.update()
        return mesh

    def anatomical_resident(
        name: str,
        x: float,
        skin: bpy.types.Material,
        sex: str = "male",
        broad: float = 1,
    ):
        base_name = "SF_WebHuman_Female" if sex == "female" else "SF_WebHuman_Male"
        source = human_bases[base_name]
        minimum_z = min(vertex.co.z for vertex in source.data.vertices)
        maximum_z = max(vertex.co.z for vertex in source.data.vertices)
        source_height = maximum_z - minimum_z
        scale = 2.063 / source_height
        actor = root(name, (x, 20, 0))
        actor["source_height"] = 2.063
        body = bpy.data.objects.new(f"{name}_Anatomy", source.data.copy())
        assets.objects.link(body)
        body.parent = actor
        body.location = (0, 0, -minimum_z * scale)
        body.scale = (scale * broad, scale, scale)
        body.data.materials.append(skin)
        body.data.name = f"{name}_AnatomyMesh"
        for polygon in body.data.polygons:
            polygon.use_smooth = True
        return {
            "actor": actor,
            "body": body,
            "source": source,
            "minimum_z": minimum_z,
            "maximum_z": maximum_z,
            "scale": scale,
            "broad": broad,
        }

    def fitted_layer(
        resident,
        suffix: str,
        lower_fraction: float,
        upper_fraction: float,
        layer_material: bpy.types.Material,
        expansion: float = 0.012,
        x_limit: float | None = None,
        front_opening: float = 0,
        hair_shell: bool = False,
    ):
        source = resident["source"]
        minimum_z = resident["minimum_z"]
        height = resident["maximum_z"] - minimum_z
        lower = minimum_z + height * lower_fraction
        upper = minimum_z + height * upper_fraction
        mesh = make_body_subset(
            source.data,
            f"{resident['actor'].name}_{suffix}",
            lower,
            upper,
            expansion,
            x_limit,
            front_opening,
            hair_shell,
        )
        layer = bpy.data.objects.new(
            f"{resident['actor'].name}_{suffix}",
            mesh,
        )
        assets.objects.link(layer)
        layer.parent = resident["actor"]
        layer.location = resident["body"].location
        scale = resident["scale"]
        layer.scale = (scale * resident["broad"], scale, scale)
        layer.data.materials.append(layer_material)
        return layer

    def high_detail_eyes(
        actor: bpy.types.Object,
        iris_material: bpy.types.Material = eye_dark,
    ) -> None:
        # The Blender Studio bases already carry realistic eyelids and sockets.
        # Keep the added wet eye surface inside those lids instead of turning it
        # into the oversized stylised eye used by the distant crowd kit.
        for side in (-1, 1):
            label = "L" if side < 0 else "R"
            sphere(
                f"{actor.name}_EyeWhite_{label}",
                (side * 0.036, -0.153, 1.862),
                (0.015, 0.007, 0.009),
                eye_white,
                actor,
                14,
                8,
            )
            sphere(
                f"{actor.name}_Iris_{label}",
                (side * 0.036, -0.159, 1.862),
                (0.0055, 0.003, 0.0058),
                iris_material,
                actor,
                12,
                7,
            )

    # Culture kit. Heights remain exactly aligned with humanScale.ts source
    # bounds, preserving physically calibrated residents after cloning.
    actor = person_base("Actor_Alethi", -22, skin_brown, blue, 2.063, 1.06)
    for side in (-1, 1):
        cube(
            f"Actor_Alethi_CoatTail_{side}",
            (side * 0.14, 0.1, 0.79),
            (0.145, 0.085, 0.39),
            blue,
            actor,
            0.025,
        )
        cube(
            f"Actor_Alethi_ShoulderEmbroidery_{side}",
            (side * 0.34, -0.09, 1.42),
            (0.06, 0.025, 0.11),
            p["brass"],
            actor,
            0.01,
        )

    actor = person_base("Actor_Azish", -15, skin_dark, plum, 1.91, 0.98)
    cone("Actor_Azish_Robe", (0, 0.03, 0.67), 0.41, 0.27, 1.0, plum, actor, 18, 0.035)
    cyl("Actor_Azish_Cap", (0, 0, 1.93), 0.22, 0.14, p["ochre"], actor, 16, 0.02)
    cube("Actor_Azish_GoldSash", (0, -0.27, 1.0), (0.3, 0.03, 0.07), p["brass"], actor, 0.012)

    actor = person_base("Actor_Shin", -8, skin_pale, cream, 1.811, 0.91, eye_scale=1.34)
    cone("Actor_Shin_TunicSkirt", (0, 0.02, 0.72), 0.34, 0.24, 0.72, cream, actor, 16, 0.028)
    cube("Actor_Shin_FieldSash", (0, -0.24, 0.98), (0.27, 0.03, 0.055), p["grass"], actor, 0.01)

    actor = person_base("Actor_Singer", -1, singer_red, red, 2.139, 1.14)
    for side in (-1, 1):
        label = "L" if side < 0 else "R"
        plate = cube(
            f"Actor_Singer_CarapaceArm_{label}",
            (side * 0.44, 0.01, 1.24),
            (0.115, 0.14, 0.29),
            singer_black,
            actor,
            0.04,
        )
        plate.rotation_euler[1] = side * 0.08
        cone(
            f"Actor_Singer_TemplePlate_{label}",
            (side * 0.24, 0, 1.9),
            0.13,
            0.025,
            0.34,
            singer_black,
            actor,
            7,
            0.02,
        )
    for stripe in (-1, 0, 1):
        marble = cube(
            f"Actor_Singer_Marble_{stripe}",
            (stripe * 0.085, -0.19, 1.72 + stripe * 0.025),
            (0.018, 0.014, 0.17),
            singer_black,
            actor,
            0.008,
        )
        marble.rotation_euler[2] = 0.24

    actor = person_base("Actor_Thaylen", 6, skin_tan, grey, 1.91, hair=hair_white)
    for side in (-1, 1):
        label = "L" if side < 0 else "R"
        brow = cube(
            f"Actor_Thaylen_LongBrow_{label}",
            (side * 0.17, -0.19, 1.77),
            (0.15, 0.012, 0.018),
            hair_white,
            actor,
            0.008,
        )
        brow.rotation_euler[2] = side * 0.44
    cube("Actor_Thaylen_SailorSash", (0, -0.28, 1.04), (0.3, 0.03, 0.07), p["teal"], actor, 0.012)

    actor = person_base("Actor_Purelaker", 13, skin_tan, teal, 1.87, 1.0)
    cone("Actor_Purelaker_ShoulderYoke", (0, -0.01, 1.3), 0.34, 0.26, 0.25, skin_tan, actor, 14, 0.02)
    cone("Actor_Purelaker_Wrap", (0, 0, 0.69), 0.4, 0.27, 0.84, teal, actor, 16, 0.028)
    pole = cyl("Actor_Purelaker_FishingPole", (0.5, 0, 1.08), 0.022, 2.25, p["earth"], actor, 10, 0)
    pole.rotation_euler[1] = -0.13

    actor = person_base("Actor_Veden", 20, skin_brown, veden_red, 1.994, 1.03, hair=hair_brown)
    for side in (-1, 1):
        cube(
            f"Actor_Veden_Longcoat_{side}",
            (side * 0.14, 0.1, 0.78),
            (0.15, 0.085, 0.42),
            veden_red,
            actor,
            0.028,
        )
    sash = cube("Actor_Veden_Sash", (0, -0.27, 1.11), (0.31, 0.025, 0.07), p["ochre"], actor, 0.015)
    sash.rotation_euler[2] = -0.18

    actor = person_base("Actor_Aimian", 27, aimian_skin, grey, 2.148, 0.92, hair=hair_white)
    for mark in (-1, 0, 1):
        stripe = cube(
            f"Actor_Aimian_SkinMark_{mark}",
            (mark * 0.075, -0.205, 1.8 + mark * 0.025),
            (0.016, 0.012, 0.14),
            p["cyan"],
            actor,
            0.008,
        )
        stripe.rotation_euler[2] = 0.22
    cone("Actor_Aimian_Mantle", (0, 0.04, 1.35), 0.42, 0.3, 0.28, p["slate"], actor, 14, 0.025)

    actor = person_base("Actor_Reshi", 34, skin_tan, reshi_green, 1.891, 1.02, hair=hair_brown)
    cone("Actor_Reshi_Wrap", (0, 0.04, 0.69), 0.42, 0.29, 0.86, reshi_green, actor, 16, 0.03)
    cone("Actor_Reshi_SunHat", (0, 0, 1.94), 0.48, 0.08, 0.17, p["ochre"], actor, 20, 0.02)
    for shell in range(5):
        angle = -0.7 + shell * 0.34
        sphere(
            f"Actor_Reshi_Shell_{shell + 1}",
            (math.sin(angle) * 0.31, -0.29, 1.28 + math.cos(angle) * 0.12),
            (0.055, 0.035, 0.07),
            p["brass"],
            actor,
            10,
            6,
        )

    # Kharbranth's close-detail cast mirrors the five accepted residents. Every
    # body uses the Alethi source height (2.063) so role swapping does not alter
    # physical scale; runtime variation is applied in meters after cloning.
    actor = person_base(
        "Actor_Kharbranth_Porter",
        41,
        skin_dark,
        porter_ochre,
        2.063,
        1.12,
        sleeveless=True,
        hair=hair_brown,
    )
    cube(
        "Actor_Kharbranth_Porter_Vest",
        (0, -0.19, 1.24),
        (0.29, 0.055, 0.34),
        porter_ochre,
        actor,
        0.025,
    )
    cube(
        "Actor_Kharbranth_Porter_Cargo",
        (0, 0.31, 1.04),
        (0.34, 0.23, 0.37),
        p["wood"],
        actor,
        0.045,
    )
    for side in (-1, 1):
        cube(
            f"Actor_Kharbranth_Porter_CargoStrap_{side}",
            (side * 0.19, -0.02, 1.12),
            (0.035, 0.22, 0.48),
            leather,
            actor,
            0.012,
        )

    actor = person_base(
        "Actor_Kharbranth_Surgeon",
        48,
        skin_brown,
        surgeon_ivory,
        2.063,
        0.94,
        feminine=True,
        hair=hair_black,
    )
    cone(
        "Actor_Kharbranth_Surgeon_Gown",
        (0, 0.02, 0.7),
        0.41,
        0.24,
        0.9,
        surgeon_ivory,
        actor,
        18,
        0.032,
    )
    cone(
        "Actor_Kharbranth_Surgeon_SafehandSleeve",
        (-0.325, -0.01, 0.93),
        0.095,
        0.065,
        0.42,
        surgeon_ivory,
        actor,
        14,
        0.018,
    )
    sphere(
        "Actor_Kharbranth_Surgeon_HairKnot",
        (0, 0.15, 1.96),
        (0.11, 0.105, 0.12),
        hair_black,
        actor,
        16,
        9,
    )
    cube(
        "Actor_Kharbranth_Surgeon_Satchel",
        (0.36, 0.04, 0.93),
        (0.18, 0.08, 0.22),
        leather,
        actor,
        0.025,
    )

    actor = person_base(
        "Actor_Kharbranth_Scholar",
        55,
        skin_tan,
        scholar_teal,
        2.063,
        0.98,
        hair=hair_black,
    )
    cone(
        "Actor_Kharbranth_Scholar_Overrobe",
        (0, 0.04, 0.72),
        0.38,
        0.25,
        0.84,
        scholar_teal,
        actor,
        18,
        0.03,
    )
    cube(
        "Actor_Kharbranth_Scholar_Ledger",
        (0.35, -0.16, 0.98),
        (0.16, 0.045, 0.22),
        p["wood"],
        actor,
        0.018,
    )
    for scroll in range(3):
        cyl(
            f"Actor_Kharbranth_Scholar_Scroll_{scroll + 1}",
            (-0.3 + scroll * 0.08, 0.16, 0.91),
            0.03,
            0.42,
            cream,
            actor,
            10,
            0.008,
        )

    actor = person_base(
        "Actor_Kharbranth_Dockworker",
        62,
        skin_brown,
        dock_rust,
        2.063,
        1.05,
        hair=hair_brown,
    )
    cyl(
        "Actor_Kharbranth_Dockworker_Cap",
        (0, 0, 2.01),
        0.21,
        0.1,
        dock_rust,
        actor,
        16,
        0.018,
    )
    torus(
        "Actor_Kharbranth_Dockworker_RopeCoil",
        (0.34, 0.12, 0.94),
        0.19,
        0.035,
        p["rope"],
        actor,
        (math.pi / 2, 0, 0),
    )
    cube(
        "Actor_Kharbranth_Dockworker_Crate",
        (-0.43, -0.02, 0.77),
        (0.22, 0.2, 0.22),
        p["wood"],
        actor,
        0.035,
    )

    actor = person_base(
        "Actor_Kharbranth_Thaylen_Sailor",
        69,
        skin_tan,
        grey,
        2.063,
        1.0,
        hair=hair_white,
    )
    for side in (-1, 1):
        label = "L" if side < 0 else "R"
        brow = cube(
            f"Actor_Kharbranth_Thaylen_Sailor_LongBrow_{label}",
            (side * 0.18, -0.2, 1.83),
            (0.17, 0.012, 0.018),
            hair_white,
            actor,
            0.008,
        )
        brow.rotation_euler[2] = side * 0.48
    cube(
        "Actor_Kharbranth_Thaylen_Sailor_Sash",
        (0, -0.27, 1.04),
        (0.3, 0.03, 0.075),
        p["teal"],
        actor,
        0.012,
    )
    cyl(
        "Actor_Kharbranth_Thaylen_Sailor_BelayingPin",
        (0.42, 0, 0.94),
        0.025,
        0.52,
        p["wood"],
        actor,
        10,
        0.008,
    )

    # High-detail Kharbranth cast. These bodies start from Blender Studio's
    # CC0 realistic human bases, then receive web-trimmed fitted clothing,
    # generated textile materials, hair, and the exact role props established
    # by the accepted resident concept sheet.
    porter_hd = anatomical_resident(
        "Actor_Kharbranth_Porter_HD",
        76,
        skin_dark,
        "male",
        1.07,
    )
    porter_hd["actor"]["role"] = "porter"
    fitted_layer(porter_hd, "Trousers", 0.04, 0.56, grey, 0.015)
    fitted_layer(porter_hd, "Sandals", 0.0, 0.2, leather, 0.018)
    fitted_layer(
        porter_hd,
        "SleevelessVest",
        0.47,
        0.84,
        porter_ochre,
        0.018,
        0.27,
    )
    fitted_layer(
        porter_hd,
        "Hair",
        0.84,
        1.0,
        hair_black,
        0.008,
        hair_shell=True,
    )
    porter_vest = cone(
        "Actor_Kharbranth_Porter_HD_TailoredVest",
        (0, 0.005, 1.34),
        0.22,
        0.275,
        0.57,
        porter_ochre,
        porter_hd["actor"],
        20,
        0.025,
    )
    porter_vest.scale.y = 0.52
    high_detail_eyes(porter_hd["actor"])
    sphere(
        "Actor_Kharbranth_Porter_HD_Beard",
        (0, -0.148, 1.75),
        (0.095, 0.035, 0.075),
        hair_black,
        porter_hd["actor"],
        20,
        11,
    )
    torus(
        "Actor_Kharbranth_Porter_HD_RopeCoil",
        (-0.39, 0, 1.38),
        0.28,
        0.045,
        p["rope"],
        porter_hd["actor"],
        (math.pi / 2, 0, 0),
    )
    torus(
        "Actor_Kharbranth_Porter_HD_RopeBelt",
        (0, 0, 0.99),
        0.31,
        0.035,
        p["rope"],
        porter_hd["actor"],
    )

    surgeon_hd = anatomical_resident(
        "Actor_Kharbranth_Surgeon_HD",
        83,
        skin_brown,
        "female",
        1.0,
    )
    surgeon_hd["actor"]["role"] = "surgeon"
    fitted_layer(
        surgeon_hd,
        "Undergown",
        0.04,
        0.86,
        surgeon_ivory,
        0.016,
    )
    fitted_layer(
        surgeon_hd,
        "Hair",
        0.84,
        1.0,
        hair_black,
        0.008,
        hair_shell=True,
    )
    surgeon_bodice = cone(
        "Actor_Kharbranth_Surgeon_HD_CoatBodice",
        (0, 0.005, 1.34),
        0.22,
        0.275,
        0.58,
        surgeon_ivory,
        surgeon_hd["actor"],
        20,
        0.025,
    )
    surgeon_bodice.scale.y = 0.5
    cube(
        "Actor_Kharbranth_Surgeon_HD_InnerCollar",
        (0, -0.22, 1.54),
        (0.12, 0.025, 0.12),
        scholar_teal,
        surgeon_hd["actor"],
        0.012,
    )
    high_detail_eyes(surgeon_hd["actor"])
    surgeon_gown = cone(
        "Actor_Kharbranth_Surgeon_HD_OuterGown",
        (0, 0.035, 0.58),
        0.36,
        0.2,
        0.84,
        surgeon_ivory,
        surgeon_hd["actor"],
        22,
        0.025,
    )
    surgeon_gown.scale.y = 0.62
    safehand = cone(
        "Actor_Kharbranth_Surgeon_HD_SafehandSleeve",
        (-0.47, -0.005, 1.16),
        0.13,
        0.08,
        0.58,
        surgeon_ivory,
        surgeon_hd["actor"],
        18,
        0.018,
    )
    safehand.rotation_euler[1] = -0.26
    sphere(
        "Actor_Kharbranth_Surgeon_HD_HairKnot",
        (0, 0.12, 1.99),
        (0.12, 0.11, 0.13),
        hair_black,
        surgeon_hd["actor"],
        18,
        10,
    )
    cube(
        "Actor_Kharbranth_Surgeon_HD_MedicalSatchel",
        (0.38, 0.04, 0.94),
        (0.17, 0.075, 0.23),
        leather,
        surgeon_hd["actor"],
        0.025,
    )
    for vial in range(4):
        cyl(
            f"Actor_Kharbranth_Surgeon_HD_Vial_{vial + 1}",
            (0.31 + vial * 0.055, -0.055, 1.02),
            0.017,
            0.15,
            p["cyan"] if vial % 2 else p["brass"],
            surgeon_hd["actor"],
            10,
            0.004,
        )

    scholar_hd = anatomical_resident(
        "Actor_Kharbranth_Scholar_HD",
        90,
        skin_tan,
        "male",
        0.98,
    )
    scholar_hd["actor"]["role"] = "scholar"
    fitted_layer(scholar_hd, "Trousers", 0.03, 0.55, grey, 0.014)
    fitted_layer(
        scholar_hd,
        "LongRobe",
        0.16,
        0.86,
        scholar_teal,
        0.018,
    )
    fitted_layer(
        scholar_hd,
        "OpenOvercoat",
        0.42,
        0.85,
        cream,
        0.028,
        front_opening=0.075,
    )
    fitted_layer(
        scholar_hd,
        "Hair",
        0.84,
        1.0,
        hair_black,
        0.01,
        hair_shell=True,
    )
    scholar_bodice = cone(
        "Actor_Kharbranth_Scholar_HD_RobeBodice",
        (0, 0.005, 1.34),
        0.22,
        0.285,
        0.58,
        scholar_teal,
        scholar_hd["actor"],
        20,
        0.025,
    )
    scholar_bodice.scale.y = 0.52
    for side in (-1, 1):
        cube(
            f"Actor_Kharbranth_Scholar_HD_CoatPanel_{side}",
            (side * 0.105, -0.17, 0.94),
            (0.085, 0.025, 0.46),
            scholar_teal,
            scholar_hd["actor"],
            0.022,
        )
    high_detail_eyes(scholar_hd["actor"])
    cube(
        "Actor_Kharbranth_Scholar_HD_Ledger",
        (0.41, -0.08, 1.12),
        (0.19, 0.045, 0.28),
        p["wood"],
        scholar_hd["actor"],
        0.025,
    )
    cube(
        "Actor_Kharbranth_Scholar_HD_Satchel",
        (-0.38, 0.07, 0.88),
        (0.2, 0.08, 0.25),
        leather,
        scholar_hd["actor"],
        0.025,
    )
    sash = cube(
        "Actor_Kharbranth_Scholar_HD_Sash",
        (0, -0.205, 1.02),
        (0.34, 0.035, 0.065),
        p["brass"],
        scholar_hd["actor"],
        0.012,
    )
    sash.rotation_euler[2] = -0.12

    dockworker_hd = anatomical_resident(
        "Actor_Kharbranth_Dockworker_HD",
        97,
        skin_brown,
        "male",
        1.02,
    )
    dockworker_hd["actor"]["role"] = "dockworker"
    fitted_layer(dockworker_hd, "Trousers", 0.02, 0.56, grey, 0.015)
    fitted_layer(dockworker_hd, "Shirt", 0.44, 0.84, cream, 0.015)
    fitted_layer(
        dockworker_hd,
        "Vest",
        0.49,
        0.82,
        dock_rust,
        0.026,
        0.3,
    )
    fitted_layer(
        dockworker_hd,
        "Hair",
        0.84,
        1.0,
        hair_brown,
        0.009,
        hair_shell=True,
    )
    dockworker_shirt = cone(
        "Actor_Kharbranth_Dockworker_HD_ShirtBodice",
        (0, 0.005, 1.34),
        0.22,
        0.29,
        0.58,
        cream,
        dockworker_hd["actor"],
        20,
        0.025,
    )
    dockworker_shirt.scale.y = 0.52
    for side in (-1, 1):
        cube(
            f"Actor_Kharbranth_Dockworker_HD_VestPanel_{side}",
            (side * 0.105, -0.17, 1.34),
            (0.08, 0.025, 0.27),
            dock_rust,
            dockworker_hd["actor"],
            0.022,
        )
    high_detail_eyes(dockworker_hd["actor"])
    cyl(
        "Actor_Kharbranth_Dockworker_HD_Cap",
        (0, 0, 1.98),
        0.19,
        0.075,
        dock_rust,
        dockworker_hd["actor"],
        20,
        0.018,
    )
    cube(
        "Actor_Kharbranth_Dockworker_HD_Cargo",
        (0, 0.28, 1.25),
        (0.38, 0.22, 0.38),
        p["wood"],
        dockworker_hd["actor"],
        0.045,
    )
    for side in (-1, 1):
        cube(
            f"Actor_Kharbranth_Dockworker_HD_CargoStrap_{side}",
            (side * 0.2, -0.01, 1.29),
            (0.035, 0.22, 0.47),
            leather,
            dockworker_hd["actor"],
            0.012,
        )

    sailor_hd = anatomical_resident(
        "Actor_Kharbranth_Thaylen_Sailor_HD",
        104,
        skin_tan,
        "male",
        0.99,
    )
    sailor_hd["actor"]["role"] = "thaylen-sailor"
    fitted_layer(sailor_hd, "Trousers", 0.03, 0.55, grey, 0.014)
    fitted_layer(sailor_hd, "Shirt", 0.44, 0.84, cream, 0.015)
    fitted_layer(
        sailor_hd,
        "Longcoat",
        0.17,
        0.88,
        blue,
        0.03,
        front_opening=0.07,
    )
    fitted_layer(
        sailor_hd,
        "Hair",
        0.83,
        1.0,
        hair_white,
        0.009,
        hair_shell=True,
    )
    sailor_bodice = cone(
        "Actor_Kharbranth_Thaylen_Sailor_HD_CoatBodice",
        (0, 0.005, 1.34),
        0.22,
        0.29,
        0.58,
        blue,
        sailor_hd["actor"],
        20,
        0.025,
    )
    sailor_bodice.scale.y = 0.52
    for side in (-1, 1):
        cube(
            f"Actor_Kharbranth_Thaylen_Sailor_HD_CoatPanel_{side}",
            (side * 0.11, -0.17, 0.92),
            (0.095, 0.03, 0.46),
            blue,
            sailor_hd["actor"],
            0.022,
        )
    high_detail_eyes(sailor_hd["actor"])
    cube(
        "Actor_Kharbranth_Thaylen_Sailor_HD_Sash",
        (0, -0.22, 1.0),
        (0.34, 0.04, 0.08),
        veden_red,
        sailor_hd["actor"],
        0.014,
    )
    for side in (-1, 1):
        label = "L" if side < 0 else "R"
        brow = cube(
            f"Actor_Kharbranth_Thaylen_Sailor_HD_LongBrow_{label}",
            (side * 0.12, -0.18, 1.84),
            (0.14, 0.012, 0.018),
            hair_white,
            sailor_hd["actor"],
            0.008,
        )
        brow.rotation_euler[2] = side * 0.44
    cyl(
        "Actor_Kharbranth_Thaylen_Sailor_HD_BelayingPin",
        (0.39, 0.02, 0.92),
        0.025,
        0.56,
        p["wood"],
        sailor_hd["actor"],
        12,
        0.008,
    )


for label, builder in (
    ("Urithiru", build_urithiru),
    ("Oathgate", build_oathgate),
    ("Kharbranth", build_kharbranth),
    ("Kholinar", build_kholinar),
    ("Azimir", build_azimir),
    ("Purelake", build_purelake),
    ("Shinovar", build_shinovar),
    ("Akinah", build_akinah),
    ("Thaylen City", build_thaylen_city),
    ("Vedenar", build_vedenar),
    ("Shattered Plains", build_shattered_plains),
    ("detail modules", build_detail_modules),
    ("fidelity modules", build_fidelity_modules),
    ("actors", build_actors),
):
    print(f"Building {label}...", flush=True)
    builder()


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
    for x in (-22, -9, 5, 19, 33, 47):
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
    export_extras=True,
    export_meshopt_compression_enable=True,
)

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), compress=True)

print(f"Built {len(assets.all_objects)} authored objects")
print(f"GLB: {GLB_PATH}")
print(f"Blend: {BLEND_PATH}")
print(f"Preview: {PREVIEW_PATH}")
