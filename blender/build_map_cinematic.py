#!/usr/bin/env python3
"""Build the continuous map-based Storm Over Roshar cinematic."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_BLEND = PROJECT_ROOT / "blender" / "roshar-landmarks.blend"
OUTPUT_BLEND = PROJECT_ROOT / "blender" / "roshar-map-cinematic-v2.blend"
GEOGRAPHY_PATH = PROJECT_ROOT / "docs" / "cinematic" / "map-geography.json"
SHOT_PLAN_PATH = PROJECT_ROOT / "docs" / "cinematic" / "map-shot-plan.json"
TERRAIN_PATH = (
    PROJECT_ROOT
    / "artifacts"
    / "cinematic"
    / "roshar-runtime-terrain.json"
)
COLLECTION_NAME = "Roshar_Map_Cinematic"
FPS = 24
OCEAN_HEIGHT = -0.16

GEOGRAPHY = json.loads(GEOGRAPHY_PATH.read_text(encoding="utf-8"))
PLAN = json.loads(SHOT_PLAN_PATH.read_text(encoding="utf-8"))
SHOTS = PLAN["shots"]
if not TERRAIN_PATH.is_file():
    raise FileNotFoundError(
        f"Missing runtime terrain export: {TERRAIN_PATH}. "
        "Run node scripts/export-cinematic-terrain.mjs first."
    )
TERRAIN = json.loads(TERRAIN_PATH.read_text(encoding="utf-8"))

LANDMARK_SCALES = {
    "Landmark_Kholinar": 0.22,
    "Landmark_Shattered_Plains": 0.25,
    "Landmark_Kharbranth": 0.19,
    "Landmark_ThaylenCity": 0.22,
    "Landmark_Vedenar": 0.20,
    "Landmark_Azimir": 0.21,
    "Landmark_Shinovar": 0.22,
    "Landmark_Purelake": 0.25,
    "Landmark_Akinah": 0.22,
    "Landmark_Urithiru": 0.24,
}

LANDMARK_ROTATIONS = {
    "Landmark_Kholinar": math.radians(-12),
    "Landmark_Shattered_Plains": math.radians(8),
    "Landmark_Kharbranth": math.radians(-4),
    "Landmark_ThaylenCity": math.radians(9),
    "Landmark_Vedenar": math.radians(-18),
    "Landmark_Azimir": math.radians(5),
    "Landmark_Shinovar": math.radians(-8),
    "Landmark_Purelake": math.radians(4),
    "Landmark_Akinah": math.radians(-10),
    "Landmark_Urithiru": math.radians(3),
}

HD_ACTOR_ROOTS = (
    "Actor_Kharbranth_Porter_HD",
    "Actor_Kharbranth_Surgeon_HD",
    "Actor_Kharbranth_Scholar_HD",
    "Actor_Kharbranth_Dockworker_HD",
    "Actor_Kharbranth_Thaylen_Sailor_HD",
)

RESIDENT_LAYOUTS = {
    "Landmark_Kholinar": [(-4.0, -3.8), (-2.7, -4.2), (-1.4, -4.0)],
    "Landmark_Shattered_Plains": [(-4.2, -3.7), (-2.9, -4.1)],
    "Landmark_Kharbranth": [(-2.1, -5.1), (-0.7, -5.0), (0.7, -4.8), (2.0, -4.4)],
    "Landmark_ThaylenCity": [(-1.8, -4.4), (0.0, -4.7), (1.8, -4.3)],
    "Landmark_Vedenar": [(-1.7, 4.2), (0.0, 4.6), (1.7, 4.2)],
    "Landmark_Azimir": [(4.0, -1.1), (4.2, 0.5)],
    "Landmark_Shinovar": [(3.4, 3.0), (2.2, 4.0)],
    "Landmark_Purelake": [(-4.0, -1.0), (-4.2, 0.7)],
    "Landmark_Akinah": [(4.0, -0.5)],
    "Landmark_Urithiru": [(-1.5, -4.9), (0.0, -5.2), (1.5, -4.8)],
}


def active_collection(collection: bpy.types.Collection) -> None:
    def find(
        layer: bpy.types.LayerCollection,
    ) -> bpy.types.LayerCollection | None:
        if layer.collection == collection:
            return layer
        for child in layer.children:
            if result := find(child):
                return result
        return None

    if result := find(bpy.context.view_layer.layer_collection):
        bpy.context.view_layer.active_layer_collection = result


def reset_collection() -> bpy.types.Collection:
    previous = bpy.data.collections.get(COLLECTION_NAME)
    if previous:
        for obj in list(previous.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(previous)
    collection = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(collection)
    active_collection(collection)
    return collection


def descendants(root: bpy.types.Object) -> list[bpy.types.Object]:
    return [root, *list(root.children_recursive)]


def landmark_world_bounds(root: bpy.types.Object) -> dict[str, Vector]:
    corners: list[Vector] = []
    for obj in descendants(root):
        if obj.type == "MESH" and not obj.hide_render:
            corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not corners:
        center = root.matrix_world.translation.copy()
        return {
            "minimum": center,
            "maximum": center,
            "center": center,
            "size": Vector((1, 1, 1)),
        }
    minimum = Vector(tuple(min(corner[axis] for corner in corners) for axis in range(3)))
    maximum = Vector(tuple(max(corner[axis] for corner in corners) for axis in range(3)))
    return {
        "minimum": minimum,
        "maximum": maximum,
        "center": (minimum + maximum) / 2,
        "size": maximum - minimum,
    }


def local_minimum_z(root: bpy.types.Object) -> float:
    inverse = root.matrix_world.inverted()
    corners: list[Vector] = []
    for obj in descendants(root):
        if obj.type == "MESH" and not obj.hide_render:
            corners.extend(
                inverse @ (obj.matrix_world @ Vector(corner))
                for corner in obj.bound_box
            )
    return min((corner.z for corner in corners), default=0.0)


def material(
    name: str,
    color: tuple[float, float, float, float],
    metallic: float = 0.0,
    roughness: float = 0.5,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    result = bpy.data.materials.new(name)
    result.diffuse_color = color
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    if emission:
        principled.inputs["Emission Color"].default_value = emission
        principled.inputs["Emission Strength"].default_value = emission_strength
    return result


def terrain_height_at(x: float, y: float) -> float:
    """Bilinearly sample the exported Three.js terrain grid."""
    bounds = TERRAIN["bounds"]
    segments_x = int(TERRAIN["segmentsX"])
    segments_y = int(TERRAIN["segmentsZ"])
    amount_x = max(
        0.0,
        min(segments_x, (x - bounds["minX"]) / (bounds["maxX"] - bounds["minX"]) * segments_x),
    )
    amount_y = max(
        0.0,
        min(segments_y, (y - bounds["minZ"]) / (bounds["maxZ"] - bounds["minZ"]) * segments_y),
    )
    x0 = min(segments_x - 1, int(math.floor(amount_x)))
    y0 = min(segments_y - 1, int(math.floor(amount_y)))
    x1 = x0 + 1
    y1 = y0 + 1
    tx = amount_x - x0
    ty = amount_y - y0
    columns = segments_x + 1
    heights = TERRAIN["heights"]
    north_west = heights[y0 * columns + x0]
    north_east = heights[y0 * columns + x1]
    south_west = heights[y1 * columns + x0]
    south_east = heights[y1 * columns + x1]
    north = north_west + (north_east - north_west) * tx
    south = south_west + (south_east - south_west) * tx
    return float(north + (south - north) * ty)


def indexed_three_mesh(
    name: str,
    data: dict,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    values = data["positions"]
    vertices = [
        (float(values[index]), float(values[index + 2]), float(values[index + 1]))
        for index in range(0, len(values), 3)
    ]
    indices = data["indices"]
    faces = [
        (int(indices[index]), int(indices[index + 1]), int(indices[index + 2]))
        for index in range(0, len(indices), 3)
    ]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj


def terrain_material() -> bpy.types.Material:
    result = bpy.data.materials.new("CINE2_Runtime_Terrain")
    result.use_nodes = True
    nodes = result.node_tree.nodes
    links = result.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    principled = nodes.new("ShaderNodeBsdfPrincipled")
    vertex_color = nodes.new("ShaderNodeVertexColor")
    vertex_color.layer_name = "terrain_color"
    noise = nodes.new("ShaderNodeTexNoise")
    noise.noise_dimensions = "3D"
    noise.inputs["Scale"].default_value = 3.8
    noise.inputs["Detail"].default_value = 7.0
    noise.inputs["Roughness"].default_value = 0.72
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.24
    bump.inputs["Distance"].default_value = 0.14
    principled.inputs["Roughness"].default_value = 0.78
    links.new(vertex_color.outputs["Color"], principled.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], principled.inputs["Normal"])
    links.new(principled.outputs["BSDF"], output.inputs["Surface"])
    return result


def ocean_material() -> bpy.types.Material:
    result = bpy.data.materials.new("CINE2_Runtime_Ocean")
    result.use_nodes = True
    nodes = result.node_tree.nodes
    links = result.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    principled = nodes.new("ShaderNodeBsdfPrincipled")
    texture = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    noise = nodes.new("ShaderNodeTexNoise")
    noise.noise_dimensions = "3D"
    noise.inputs["Scale"].default_value = 4.2
    noise.inputs["Detail"].default_value = 8.0
    noise.inputs["Roughness"].default_value = 0.68
    noise.inputs["Distortion"].default_value = 0.42
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.42
    bump.inputs["Distance"].default_value = 0.18
    principled.inputs["Base Color"].default_value = (0.004, 0.09, 0.14, 1)
    principled.inputs["Metallic"].default_value = 0.38
    principled.inputs["Roughness"].default_value = 0.2
    principled.inputs["Coat Weight"].default_value = 0.34
    links.new(texture.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], principled.inputs["Normal"])
    links.new(principled.outputs["BSDF"], output.inputs["Surface"])
    mapping.inputs["Location"].default_value = (0, 0, 0)
    mapping.inputs["Location"].keyframe_insert("default_value", frame=1)
    mapping.inputs["Location"].default_value = (3.2, -1.8, 0)
    mapping.inputs["Location"].keyframe_insert(
        "default_value", frame=int(PLAN["render_end_frame"])
    )
    return result


def build_map_relief(collection: bpy.types.Collection) -> None:
    terrain = indexed_three_mesh(
        "CINE2_Runtime_Roshar_Terrain",
        TERRAIN["surface"],
        collection,
    )
    mesh = terrain.data
    colors = mesh.color_attributes.new(
        name="terrain_color",
        type="FLOAT_COLOR",
        domain="POINT",
    )
    source_colors = TERRAIN["surface"]["colors"]
    for index, color in enumerate(colors.data):
        offset = index * 3
        color.color = (
            float(source_colors[offset]),
            float(source_colors[offset + 1]),
            float(source_colors[offset + 2]),
            1.0,
        )
    mesh.materials.append(terrain_material())

    coast = indexed_three_mesh(
        "CINE2_Runtime_Coast_Skirts",
        TERRAIN["coast"],
        collection,
    )
    coast.data.materials.append(
        material("CINE2_Coast_Rock", (0.12, 0.105, 0.085, 1), 0.02, 0.91)
    )

    banks = indexed_three_mesh(
        "CINE2_Runtime_River_Banks",
        TERRAIN["riverBanks"],
        collection,
    )
    banks.data.materials.append(
        material("CINE2_River_Bank", (0.16, 0.20, 0.15, 1), 0.0, 0.9)
    )
    rivers = indexed_three_mesh(
        "CINE2_Runtime_Rivers",
        TERRAIN["rivers"],
        collection,
    )
    rivers.data.materials.append(
        material(
            "CINE2_Runtime_River_Water",
            (0.015, 0.22, 0.27, 1),
            0.28,
            0.18,
            (0.01, 0.16, 0.22, 1),
            0.65,
        )
    )

    active_collection(collection)
    bpy.ops.mesh.primitive_grid_add(
        x_subdivisions=161,
        y_subdivisions=101,
        size=2,
        location=(-0.35, -0.5, OCEAN_HEIGHT),
    )
    ocean = bpy.context.object
    ocean.name = "CINE2_Runtime_Ocean"
    ocean.scale = (78, 48, 1)
    ocean.data.materials.append(ocean_material())


def hide_authoring_layout() -> None:
    for obj in bpy.context.scene.objects:
        if obj.name.startswith("CINE2_"):
            continue
        if obj.parent is None and (
            obj.name.startswith(("Module_", "Actor_", "Prop_"))
            or obj.name.startswith("Torus.")
            or obj.name
            in {
                "Preview_Basalt_Table",
                "Preview_Camera",
                "Cube",
                "Landmark_Oathgate",
            }
        ):
            for nested in descendants(obj):
                nested.hide_render = True
                nested.hide_viewport = True
    for obj in bpy.context.scene.objects:
        if obj.type in {"LIGHT", "CAMERA"} and not obj.name.startswith("CINE2_"):
            obj.hide_render = True


def hide_landmark_presentation_supports() -> None:
    hidden_exact = {
        "ShatteredPlains_Chasm_Floor",
        "Purelake_Water_Shelf",
        "ThaylenCity_CoastalFoundation",
        "Vedenar_NorthernAgriculturalShelf",
    }
    hidden_prefixes = (
        "Azimir_TerrainCradle_",
        "Akinah_TerrainCradle_Island_",
        "Kholinar_TerrainCradle_",
        "Shinovar_TerrainCradle_Valley_",
        "Vedenar_TerrainCradle_Cliff_",
    )
    for obj in bpy.context.scene.objects:
        is_vedenar_shelf = (
            obj.name.startswith("Vedenar_Terrace_")
            and obj.name.rsplit("_", 1)[-1]
            in {"Harbor", "Lower", "Civic", "Temple", "Palace"}
        )
        if (
            obj.name in hidden_exact
            or obj.name.startswith(hidden_prefixes)
            or is_vedenar_shelf
        ):
            obj.hide_render = True
            obj.hide_viewport = True


def place_landmarks_on_map() -> dict[str, dict[str, Vector]]:
    result: dict[str, dict[str, Vector]] = {}
    for location in GEOGRAPHY["locations"].values():
        root_name = location["root"]
        root = bpy.data.objects[root_name]
        scale = LANDMARK_SCALES[root_name]
        minimum_z = local_minimum_z(root)
        coordinate = location["coordinate"]
        ground_height = terrain_height_at(
            float(coordinate[0]),
            float(coordinate[1]),
        )
        root.location = (
            float(coordinate[0]),
            float(coordinate[1]),
            ground_height - minimum_z * scale + 0.018,
        )
        root.rotation_euler.z = LANDMARK_ROTATIONS[root_name]
        root.scale = (scale, scale, scale)
        root.hide_render = False
        root.hide_viewport = False
    bpy.context.view_layer.update()
    for location in GEOGRAPHY["locations"].values():
        root = bpy.data.objects[location["root"]]
        result[root.name] = landmark_world_bounds(root)
    return result


def create_curve(
    name: str,
    points: list[Vector],
    bevel_depth: float,
    curve_material: bpy.types.Material,
    collection: bpy.types.Collection,
    cyclic: bool = False,
) -> bpy.types.Object:
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 3
    data.bevel_depth = bevel_depth
    data.bevel_resolution = 2
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for control, point in zip(spline.bezier_points, points):
        control.co = point
        control.handle_left_type = "AUTO"
        control.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    data.materials.append(curve_material)
    return obj


def build_routes_and_markers(
    collection: bpy.types.Collection,
    bounds: dict[str, dict[str, Vector]],
) -> None:
    stormlight = material(
        "CINE2_Route_Stormlight",
        (0.01, 0.18, 0.22, 1),
        0.15,
        0.2,
        (0.02, 0.65, 0.9, 1),
        1.7,
    )
    brass = bpy.data.materials.get("SF_Aged_Brass") or material(
        "CINE2_Brass", (0.35, 0.16, 0.035, 1), 0.85, 0.23
    )
    points = [
        Vector(
            (
                bounds[shot["root"]]["center"].x,
                bounds[shot["root"]]["center"].y,
                terrain_height_at(
                    bounds[shot["root"]]["center"].x,
                    bounds[shot["root"]]["center"].y,
                )
                + 0.48,
            )
        )
        for shot in SHOTS
        if shot["kind"] == "city"
    ]
    route = create_curve(
        "CINE2_Geographic_Route",
        points,
        0.014,
        stormlight,
        collection,
    )
    route_events = {1: False}
    for shot in SHOTS:
        start = int(shot["start_frame"])
        end = int(shot["end_frame"])
        if shot["kind"] == "city":
            duration = end - start
            arrival = start + min(132, max(76, int(duration * 0.42)))
            route_events[start] = False
            route_events[arrival] = True
        elif shot["kind"] == "highstorm":
            route_events[start] = True
    for frame, hidden in sorted(route_events.items()):
        route.hide_render = hidden
        route.keyframe_insert(data_path="hide_render", frame=frame)

    for shot in SHOTS:
        if shot["kind"] != "city":
            continue
        center = bounds[shot["root"]]["center"]
        active_collection(collection)
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.72,
            minor_radius=0.045,
            major_segments=48,
            minor_segments=8,
            location=(
                center.x,
                center.y,
                terrain_height_at(center.x, center.y) + 0.18,
            ),
        )
        ring = bpy.context.object
        ring.name = f"CINE2_Marker_{shot['id']}"
        ring.data.materials.append(brass)
        ring.rotation_euler.z = 0
        ring.keyframe_insert(data_path="rotation_euler", frame=shot["start_frame"])
        ring.rotation_euler.z = math.radians(220)
        ring.keyframe_insert(data_path="rotation_euler", frame=shot["end_frame"])


def clone_hierarchy(
    source: bpy.types.Object,
    name_prefix: str,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    originals = [source, *list(source.children_recursive)]
    copies: dict[bpy.types.Object, bpy.types.Object] = {}
    for original in originals:
        duplicate = original.copy()
        duplicate.data = original.data
        duplicate.animation_data_clear()
        duplicate.name = f"{name_prefix}_{original.name}"
        collection.objects.link(duplicate)
        duplicate.hide_render = False
        duplicate.hide_viewport = False
        copies[original] = duplicate
    for original, duplicate in copies.items():
        if original is source:
            duplicate.parent = None
            duplicate.matrix_parent_inverse = Matrix.Identity(4)
        else:
            duplicate.parent = copies.get(original.parent)
            duplicate.matrix_parent_inverse = original.matrix_parent_inverse.copy()
            duplicate.matrix_local = original.matrix_local.copy()
    return copies[source]


def populate_dressed_residents(
    collection: bpy.types.Collection,
) -> None:
    city_shots = {shot["root"]: shot for shot in SHOTS if shot["kind"] == "city"}
    actor_sources = [bpy.data.objects[name] for name in HD_ACTOR_ROOTS]
    for city_index, (root_name, positions) in enumerate(RESIDENT_LAYOUTS.items()):
        city_root = bpy.data.objects[root_name]
        shot = city_shots[root_name]
        stable_start = shot["start_frame"] + min(132, int((shot["end_frame"] - shot["start_frame"]) * 0.42))
        for resident_index, (x, y) in enumerate(positions):
            source = actor_sources[(city_index + resident_index) % len(actor_sources)]
            resident = clone_hierarchy(
                source,
                f"CINE2_{shot['id']}_Resident_{resident_index + 1:02d}",
                collection,
            )
            resident.parent = city_root
            resident.matrix_parent_inverse = Matrix.Identity(4)
            resident.location = (x, y, 0.18)
            resident.rotation_euler.z = math.radians(20 + resident_index * 67)
            resident.scale = (1.08, 1.08, 1.08)
            resident.keyframe_insert(data_path="location", frame=stable_start)
            resident.keyframe_insert(data_path="rotation_euler", frame=stable_start)
            walk_end = max(stable_start + 2, shot["end_frame"] - 18)
            resident.location.x += 0.55 * math.cos(resident.rotation_euler.z)
            resident.location.y += 0.55 * math.sin(resident.rotation_euler.z)
            resident.keyframe_insert(data_path="location", frame=walk_end)
            resident.rotation_euler.z += math.radians(18)
            resident.keyframe_insert(data_path="rotation_euler", frame=walk_end)
            for step in range(1, 5):
                frame = stable_start + (walk_end - stable_start) * step // 5
                resident.location.z = 0.18 + (0.055 if step % 2 else 0.0)
                resident.keyframe_insert(data_path="location", frame=frame)


def insert_key(obj: bpy.types.ID, path: str, frame: int) -> None:
    obj.keyframe_insert(data_path=path, frame=frame)


def camera_pose(
    center: Vector,
    radius: float,
    height: float,
    angle_degrees: float,
) -> Vector:
    angle = math.radians(angle_degrees)
    return Vector(
        (
            center.x + math.cos(angle) * radius,
            center.y + math.sin(angle) * radius,
            center.z + height,
        )
    )


def build_continuous_camera(
    collection: bpy.types.Collection,
    bounds: dict[str, dict[str, Vector]],
) -> tuple[bpy.types.Object, bpy.types.Object]:
    camera_data = bpy.data.cameras.new("CINE2_Camera")
    camera_data.lens = 50
    camera_data.sensor_width = 36
    camera_data.clip_start = 0.04
    camera_data.clip_end = 500
    camera = bpy.data.objects.new("CINE2_Camera", camera_data)
    target = bpy.data.objects.new("CINE2_Camera_Target", None)
    collection.objects.link(camera)
    collection.objects.link(target)
    tracking = camera.constraints.new("TRACK_TO")
    tracking.target = target
    tracking.track_axis = "TRACK_NEGATIVE_Z"
    tracking.up_axis = "UP_Y"
    bpy.context.scene.camera = camera

    intro = SHOTS[0]
    intro_poses = [
        (1, Vector((-12, -58, 58)), Vector((0, 0, 0)), 55),
        (170, Vector((0, -28, 68)), Vector((0, 0, 0)), 50),
        (383, Vector((18, -18, 31)), Vector((25, -3, 0)), 48),
    ]
    for frame, position, aim, lens in intro_poses:
        camera.location = position
        target.location = aim
        camera_data.lens = lens
        insert_key(camera, "location", frame)
        insert_key(target, "location", frame)
        insert_key(camera_data, "lens", frame)

    previous_position = intro_poses[-1][1]
    previous_target = intro_poses[-1][2]
    previous_map = Vector((20, -8, 0))
    camera_angle_overrides = {
        "Landmark_Kharbranth": -98.0,
        "Landmark_Urithiru": -104.0,
    }

    for shot in SHOTS[1:]:
        start = int(shot["start_frame"])
        end = int(shot["end_frame"])
        duration = end - start
        camera.location = previous_position
        target.location = previous_target
        insert_key(camera, "location", start)
        insert_key(target, "location", start)

        if shot["kind"] == "highstorm":
            poses = [
                (
                    start + 38,
                    Vector((46, -46, 29)),
                    Vector((46, 0, 5)),
                    48,
                ),
                (
                    start + 72,
                    Vector((25, -45, 21)),
                    Vector((33, 0, 7)),
                    52,
                ),
                (
                    start + 132,
                    Vector((7, -44, 20)),
                    Vector((15, 0, 7)),
                    54,
                ),
                (
                    end,
                    Vector((-11, -42, 19)),
                    Vector((-2, 2, 5)),
                    52,
                ),
            ]
            for frame, position, aim, lens in poses:
                camera.location = position
                target.location = aim
                camera_data.lens = lens
                insert_key(camera, "location", frame)
                insert_key(target, "location", frame)
                insert_key(camera_data, "lens", frame)
            previous_position = poses[-1][1]
            previous_target = poses[-1][2]
            previous_map = Vector((-2, 2, 0))
            continue

        root_name = shot["root"]
        city_bounds = bounds[root_name]
        center = city_bounds["center"]
        size = city_bounds["size"]
        ground_center = Vector(
            (
                center.x,
                center.y,
                terrain_height_at(center.x, center.y),
            )
        )
        travel = min(132, max(76, int(duration * 0.42)))
        first_route = start + round(travel * 0.3)
        second_route = start + round(travel * 0.64)
        arrival = start + travel
        delta = ground_center - previous_map
        route_one = previous_map + delta * 0.34
        route_two = previous_map + delta * 0.72

        route_poses = [
            (
                first_route,
                route_one + Vector((-5.5, -8.0, 18.5)),
                route_one + Vector((0, 0, 0.4)),
                48,
            ),
            (
                second_route,
                route_two + Vector((-4.0, -6.5, 15.5)),
                route_two + Vector((0, 0, 0.5)),
                50,
            ),
        ]
        for frame, position, aim, lens in route_poses:
            camera.location = position
            target.location = aim
            camera_data.lens = lens
            insert_key(camera, "location", frame)
            insert_key(target, "location", frame)
            insert_key(camera_data, "lens", frame)

        radius = max(size.x, size.y) * 0.72 + 2.0
        height = max(2.8, size.z * 0.62 + 1.2)
        default_angle = math.degrees(math.atan2(-delta.y, -delta.x))
        angle = camera_angle_overrides.get(root_name, default_angle)
        orbit = float(shot["orbit_degrees"])
        aim = Vector((center.x, center.y, center.z + size.z * 0.05))
        city_poses = [
            (
                arrival,
                camera_pose(aim, radius * 1.25, height * 1.25, angle),
                aim,
                50,
            ),
            (
                arrival + max(28, (end - arrival) // 2),
                camera_pose(aim, radius, height, angle + orbit * 0.52),
                aim + Vector((0, 0, size.z * 0.04)),
                55 if root_name == "Landmark_Urithiru" else 52,
            ),
            (
                end,
                camera_pose(aim, radius * 1.08, height * 1.08, angle + orbit),
                aim + Vector((0, 0, size.z * 0.08)),
                52,
            ),
        ]
        for frame, position, aim_position, lens in city_poses:
            camera.location = position
            target.location = aim_position
            camera_data.lens = lens
            insert_key(camera, "location", frame)
            insert_key(target, "location", frame)
            insert_key(camera_data, "lens", frame)
        previous_position = city_poses[-1][1]
        previous_target = city_poses[-1][2]
        previous_map = ground_center

    return camera, target


def animate_visibility(
    obj: bpy.types.Object,
    start: int,
    end: int,
) -> None:
    scene_end = int(PLAN["render_end_frame"])
    events = {
        1: True,
        max(1, start - 1): True,
        start: False,
        end: False,
    }
    if end < scene_end:
        events[end + 1] = True
    for frame, hidden in sorted(events.items()):
        obj.hide_render = hidden
        obj.keyframe_insert(data_path="hide_render", frame=frame)


def camera_text(
    name: str,
    body: str,
    camera: bpy.types.Object,
    collection: bpy.types.Collection,
    text_material: bpy.types.Material,
    x: float,
    y: float,
    scale: float,
) -> bpy.types.Object:
    data = bpy.data.curves.new(name, "FONT")
    data.body = body
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.size = 1.0
    data.extrude = 0.008
    data.bevel_depth = 0.003
    data.bevel_resolution = 2
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.parent = camera
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.location = (x, y, -2.0)
    obj.rotation_euler = (0, 0, 0)
    obj.scale = (scale, scale, scale)
    data.materials.append(text_material)
    return obj


def build_camera_labels(
    camera: bpy.types.Object,
    collection: bpy.types.Collection,
) -> None:
    gold = material(
        "CINE2_Label_Gold",
        (0.34, 0.14, 0.025, 1),
        0.65,
        0.22,
        (0.98, 0.45, 0.08, 1),
        3.6,
    )
    cyan = material(
        "CINE2_Label_Cyan",
        (0.01, 0.16, 0.19, 1),
        0.1,
        0.25,
        (0.03, 0.7, 0.9, 1),
        3.2,
    )
    plaque_material = material(
        "CINE2_Label_Plaque",
        (0.002, 0.008, 0.014, 1),
        0.22,
        0.48,
        (0.001, 0.006, 0.012, 1),
        0.25,
    )
    for shot in SHOTS:
        if shot["kind"] == "map-intro":
            visible_start = shot["start_frame"] + 48
        elif shot["kind"] == "highstorm":
            visible_start = shot["start_frame"] + 70
        else:
            duration = shot["end_frame"] - shot["start_frame"]
            visible_start = shot["start_frame"] + min(132, max(76, int(duration * 0.42))) + 10
        visible_end = shot["end_frame"] - 16
        is_intro = shot["kind"] == "map-intro"
        if is_intro:
            text_x = 0.0
            title_y = -0.19
            subtitle_y = -0.265
            title_scale = min(
                0.092,
                1.08 / max(8.0, len(shot["label"]) * 0.62),
            )
            subtitle_scale = min(
                0.038,
                1.0 / max(14.0, len(shot["subtitle"]) * 0.62),
            )
            plaque_location = (0, -0.23, -2.025)
            plaque_scale = (0.55, 0.11, 1)
        else:
            text_x = -0.40
            title_y = -0.285
            subtitle_y = -0.342
            title_scale = min(
                0.058,
                0.68 / max(8.0, len(shot["label"]) * 0.62),
            )
            subtitle_scale = min(
                0.029,
                0.72 / max(14.0, len(shot["subtitle"]) * 0.62),
            )
            plaque_location = (-0.40, -0.315, -2.025)
            plaque_scale = (0.27, 0.065, 1)
        title = camera_text(
            f"CINE2_Title_{shot['id']}",
            shot["label"],
            camera,
            collection,
            gold,
            text_x,
            title_y,
            title_scale,
        )
        subtitle = camera_text(
            f"CINE2_Subtitle_{shot['id']}",
            shot["subtitle"],
            camera,
            collection,
            cyan,
            text_x,
            subtitle_y,
            subtitle_scale,
        )
        active_collection(collection)
        bpy.ops.mesh.primitive_plane_add(size=2)
        plaque = bpy.context.object
        plaque.name = f"CINE2_Label_Plaque_{shot['id']}"
        plaque.parent = camera
        plaque.matrix_parent_inverse = Matrix.Identity(4)
        plaque.location = plaque_location
        plaque.rotation_euler = (0, 0, 0)
        plaque.scale = plaque_scale
        plaque.data.materials.append(plaque_material)
        animate_visibility(title, visible_start, visible_end)
        animate_visibility(subtitle, visible_start, visible_end)
        animate_visibility(plaque, visible_start, visible_end)


def join_objects(
    objects: list[bpy.types.Object],
    name: str,
) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    result = bpy.context.object
    result.name = name
    return result


def build_highstorm(collection: bpy.types.Collection) -> bpy.types.Object:
    shot = next(shot for shot in SHOTS if shot["kind"] == "highstorm")
    start = int(shot["start_frame"])
    end = int(shot["end_frame"])
    rng = random.Random(1173)
    cloud_material = material(
        "CINE2_Highstorm_Cloud",
        (0.018, 0.035, 0.065, 1),
        0.0,
        0.86,
        (0.008, 0.025, 0.06, 1),
        0.55,
    )
    rain_material = material(
        "CINE2_Highstorm_Rain",
        (0.015, 0.22, 0.28, 1),
        0.0,
        0.18,
        (0.02, 0.55, 0.8, 1),
        4.5,
    )
    lightning_material = material(
        "CINE2_Highstorm_Lightning",
        (0.35, 0.8, 1.0, 1),
        0.0,
        0.05,
        (0.55, 0.9, 1.0, 1),
        15.0,
    )
    parent = bpy.data.objects.new("CINE2_Highstorm_Rig", None)
    collection.objects.link(parent)

    active_collection(collection)
    cloud_parts = []
    for index in range(42):
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=3,
            radius=1,
            location=(
                rng.uniform(-2.8, 2.8),
                -31 + index * 1.5 + rng.uniform(-0.8, 0.8),
                rng.uniform(5.0, 11.5),
            ),
        )
        cloud = bpy.context.object
        cloud.scale = (
            rng.uniform(3.8, 6.5),
            rng.uniform(3.0, 5.0),
            rng.uniform(1.8, 3.4),
        )
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        for polygon in cloud.data.polygons:
            polygon.use_smooth = True
        cloud.data.materials.append(cloud_material)
        cloud_parts.append(cloud)
    cloud_wall = join_objects(cloud_parts, "CINE2_Highstorm_Cloud_Wall")
    cloud_wall.parent = parent
    cloud_wall.matrix_parent_inverse = Matrix.Identity(4)

    rain_data = bpy.data.curves.new("CINE2_Highstorm_Rain_Data", "CURVE")
    rain_data.dimensions = "3D"
    rain_data.bevel_depth = 0.032
    rain_data.bevel_resolution = 1
    for _ in range(180):
        x = rng.uniform(-3.4, 3.4)
        y = rng.uniform(-31, 31)
        z = rng.uniform(1.0, 9.5)
        spline = rain_data.splines.new("POLY")
        spline.points.add(1)
        spline.points[0].co = (x + 1.4, y, z + 1.3, 1)
        spline.points[1].co = (x - 0.5, y - 0.3, z - 0.2, 1)
    rain = bpy.data.objects.new("CINE2_Highstorm_Driven_Rain", rain_data)
    collection.objects.link(rain)
    rain.parent = parent
    rain.matrix_parent_inverse = Matrix.Identity(4)
    rain.location.x = -4.5
    rain_data.materials.append(rain_material)

    lightning_objects = []
    for bolt_index, y in enumerate((-18.0, 2.0, 20.0)):
        points = []
        for point_index in range(8):
            points.append(
                Vector(
                    (
                        rng.uniform(-1.6, 1.6),
                        y + rng.uniform(-1.2, 1.2),
                        13.0 - point_index * 1.45,
                    )
                )
            )
        bolt = create_curve(
            f"CINE2_Highstorm_Lightning_{bolt_index + 1}",
            points,
            0.065,
            lightning_material,
            collection,
        )
        bolt.parent = parent
        bolt.matrix_parent_inverse = Matrix.Identity(4)
        flash = start + 84 + bolt_index * 38
        animate_visibility(bolt, flash, min(end, flash + 3))
        lightning_objects.append(bolt)

    light_data = bpy.data.lights.new("CINE2_Highstorm_Flash_Data", "AREA")
    light_data.color = (0.16, 0.65, 1.0)
    light_data.shape = "DISK"
    light_data.size = 28
    light = bpy.data.objects.new("CINE2_Highstorm_Flash", light_data)
    collection.objects.link(light)
    light.parent = parent
    light.location = (-4, 0, 13)
    for frame, energy in (
        (start, 0),
        (start + 83, 0),
        (start + 85, 4200),
        (start + 89, 0),
        (start + 159, 0),
        (start + 161, 5200),
        (start + 165, 0),
        (end, 0),
    ):
        light_data.energy = energy
        light_data.keyframe_insert(data_path="energy", frame=frame)

    for obj in (cloud_wall, rain, light):
        animate_visibility(obj, start, end)
    parent.location = (54, 0, 0)
    parent.keyframe_insert(data_path="location", frame=start)
    parent.location = (-2, 2, 0)
    parent.keyframe_insert(data_path="location", frame=end)
    return parent


def add_lights(collection: bpy.types.Collection) -> None:
    lights = [
        (
            "CINE2_Key",
            "AREA",
            2100,
            (1.0, 0.62, 0.30),
            (-18, -24, 42),
            36,
        ),
        (
            "CINE2_Storm_Rim",
            "AREA",
            2500,
            (0.08, 0.55, 1.0),
            (38, -2, 31),
            32,
        ),
    ]
    for name, kind, energy, color, location, size in lights:
        data = bpy.data.lights.new(name, kind)
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        collection.objects.link(obj)
        obj.location = location
        rotation = (Vector((0, 0, 0)) - obj.location).to_track_quat("-Z", "Y")
        obj.rotation_euler = rotation.to_euler()

    sun_data = bpy.data.lights.new("CINE2_Sun", "SUN")
    sun_data.energy = 1.6
    sun_data.color = (0.72, 0.82, 1.0)
    sun = bpy.data.objects.new("CINE2_Sun", sun_data)
    collection.objects.link(sun)
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(24))


def configure_render(scene: bpy.types.Scene) -> None:
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 16
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 55
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = int(PLAN["render_end_frame"])
    scene.render.filepath = str(
        PROJECT_ROOT / "artifacts" / "cinematic" / "map-v2-frames" / "frame_"
    )
    scene.render.use_file_extension = True
    scene.render.use_motion_blur = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = scene.world or bpy.data.worlds.new("CINE2_World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.0015, 0.004, 0.008, 1)
    background.inputs["Strength"].default_value = 0.12


def main() -> None:
    if Path(bpy.data.filepath).resolve() != SOURCE_BLEND.resolve():
        bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))
    collection = reset_collection()
    hide_authoring_layout()
    hide_landmark_presentation_supports()
    configure_render(bpy.context.scene)
    build_map_relief(collection)
    bounds = place_landmarks_on_map()
    build_routes_and_markers(collection, bounds)
    populate_dressed_residents(collection)
    camera, _ = build_continuous_camera(collection, bounds)
    build_camera_labels(camera, collection)
    build_highstorm(collection)
    add_lights(collection)
    bpy.context.scene["cinematic_title"] = PLAN["title"]
    bpy.context.scene["soundtrack_duration_seconds"] = PLAN[
        "audio_duration_seconds"
    ]
    bpy.context.scene["geography_path"] = str(GEOGRAPHY_PATH)
    bpy.context.scene["shot_plan_path"] = str(SHOT_PLAN_PATH)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    print(f"Saved map cinematic scene: {OUTPUT_BLEND}")


if __name__ == "__main__":
    main()
