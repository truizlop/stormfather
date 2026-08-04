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
OUTPUT_BLEND = PROJECT_ROOT / "blender" / "roshar-map-cinematic-v3.blend"
GEOGRAPHY_PATH = PROJECT_ROOT / "docs" / "cinematic" / "map-geography.json"
SHOT_PLAN_PATH = PROJECT_ROOT / "docs" / "cinematic" / "map-shot-plan.json"
TERRAIN_PATH = (
    PROJECT_ROOT
    / "artifacts"
    / "cinematic"
    / "roshar-runtime-terrain.json"
)
COLLECTION_NAME = "Roshar_Map_Cinematic_V3"
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

# Actor meshes are authored in metres while each city uses a documented
# metres-per-authored-unit contract. These reciprocal values keep every person
# at honest architectural scale instead of enlarging them into map icons.
RESIDENT_AUTHORED_SCALES = {
    "Landmark_Kholinar": 0.088541667,
    "Landmark_Shattered_Plains": 0.114962121,
    "Landmark_Kharbranth": 0.068691406,
    "Landmark_ThaylenCity": 0.095744681,
    "Landmark_Vedenar": 0.096938776,
    "Landmark_Azimir": 0.092198582,
    "Landmark_Shinovar": 0.076362847,
    "Landmark_Purelake": 0.074531250,
    "Landmark_Akinah": 0.092391304,
    "Landmark_Urithiru": 0.116904762,
}

# Dense Azimir needs the narrower surgeon silhouette on its market route; the
# other cities rotate naturally through the dressed cast.
RESIDENT_ACTOR_OFFSETS = {"Landmark_Azimir": 1}

# Every route is tied to one visible, authored walking surface. Coordinates are
# in landmark-local space and deliberately short so residents remain on roads,
# plazas, quays, bridges, and terraces instead of crossing chasms or buildings.
RESIDENT_ROUTES = {
    "Landmark_Kholinar": [
        ("Kholinar_TheaterSquare", (-2.54, 1.74), (-2.30, 1.82)),
    ],
    "Landmark_Shattered_Plains": [
        ("ShatteredPlains_Plateau_01", (-0.16, 0.0), (0.16, 0.02)),
    ],
    "Landmark_Kharbranth": [
        ("Kharbranth_Harbor_Quay", (-0.38, -4.15), (0.32, -4.15)),
        ("Kharbranth_Terrace_01", (-0.22, -2.18), (0.22, -2.18)),
    ],
    "Landmark_ThaylenCity": [
        ("ThaylenCity_Dock_2_StoneLanding", (-1.62, -3.34), (-1.38, -3.34)),
        ("ThaylenCity_Dock_6_Plank_04", (1.42, -3.98), (1.58, -3.98)),
    ],
    "Landmark_Vedenar": [
        ("Vedenar_BurnedHarbor_Dock_03", (-0.77, -5.35), (-0.57, -5.35)),
        ("Vedenar_Valhav_Oathgate_Garden", (-0.61, -0.08), (-0.29, -0.08)),
    ],
    "Landmark_Azimir": [
        ("Azimir_GrandMarket_Piazza", (0.89, -0.74), (1.25, -0.74)),
    ],
    "Landmark_Shinovar": [
        ("Shinovar_FarmHome_01_Footpath", (-2.47, 0.48), (-2.24, 0.48)),
        ("Shinovar_Field_4", (-0.14, -2.20), (0.24, -2.20)),
    ],
    "Landmark_Purelake": [
        ("Purelake_Walkway_1_01", (0.89, -0.53), (1.04, -0.53)),
        ("Purelake_Hut_0_DoorLanding", (-2.57, -2.19), (-2.43, -2.19)),
    ],
    "Landmark_Akinah": [
        ("Akinah_HiddenOathgateCausewayBatch", (-1.22, 1.22), (-1.54, 1.54)),
        ("Akinah_HiddenOathgateCausewayBatch", (1.22, -1.22), (1.54, -1.54)),
    ],
    "Landmark_Urithiru": [
        ("Urithiru_GrandTerrace_01", (-4.38, -0.53), (-4.02, -0.53)),
        ("Urithiru_GrandTerrace_01", (4.02, -0.53), (4.38, -0.53)),
    ],
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


def build_geographic_route(
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
    route.data.bevel_factor_end = 0.0
    route.data.keyframe_insert(data_path="bevel_factor_end", frame=115)
    route.data.bevel_factor_end = 1.0
    route.data.keyframe_insert(data_path="bevel_factor_end", frame=289)
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



def assert_no_destination_rings() -> None:
    rings = [
        obj.name
        for obj in bpy.context.scene.objects
        if obj.name.startswith("CINE2_Marker_")
    ]
    if rings:
        raise RuntimeError(f"Destination rings must not render in V3: {rings}")


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


def hierarchy_local_bounds(
    root: bpy.types.Object,
) -> tuple[Vector, Vector]:
    inverse = root.matrix_world.inverted()
    corners = [
        inverse @ (obj.matrix_world @ Vector(corner))
        for obj in descendants(root)
        if obj.type == "MESH"
        for corner in obj.bound_box
    ]
    if not corners:
        return Vector((0, 0, 0)), Vector((0, 0, 0))
    return (
        Vector(tuple(min(corner[axis] for corner in corners) for axis in range(3))),
        Vector(tuple(max(corner[axis] for corner in corners) for axis in range(3))),
    )


def projected_route_samples(
    city_root: bpy.types.Object,
    surface_name: str,
    start: tuple[float, float],
    end: tuple[float, float],
    sample_count: int = 9,
    quiet: bool = False,
) -> tuple[bpy.types.Object, list[Vector]] | None:
    surface = bpy.data.objects.get(surface_name)
    if (
        surface is None
        or surface.type != "MESH"
        or surface.hide_render
        or surface not in descendants(city_root)
    ):
        if not quiet:
            print(f"RESIDENT_SKIP {city_root.name}: missing visible surface {surface_name}")
        return None
    city_inverse = city_root.matrix_world.inverted()
    surface_inverse = surface.matrix_world.inverted()
    samples: list[Vector] = []
    for index in range(sample_count):
        progress = index / (sample_count - 1)
        x = start[0] + (end[0] - start[0]) * progress
        y = start[1] + (end[1] - start[1]) * progress
        world_origin = city_root.matrix_world @ Vector((x, y, 50.0))
        world_direction = (
            city_root.matrix_world.to_3x3() @ Vector((0, 0, -1))
        ).normalized()
        object_origin = surface_inverse @ world_origin
        object_direction = (
            surface_inverse.to_3x3() @ world_direction
        ).normalized()
        hit, location, normal, _ = surface.ray_cast(
            object_origin,
            object_direction,
            distance=200.0,
        )
        if not hit:
            if not quiet:
                print(
                    f"RESIDENT_SKIP {city_root.name}: {surface_name} misses "
                    f"route sample ({x:.3f}, {y:.3f})"
                )
            return None
        world_normal = (surface.matrix_world.to_3x3() @ normal).normalized()
        # Several legacy plaza meshes have inward face winding even though the
        # ray hits their horizontal top. Slope is what matters for footing.
        if abs(world_normal.z) < 0.72:
            if not quiet:
                print(
                    f"RESIDENT_SKIP {city_root.name}: {surface_name} is too steep "
                    f"at ({x:.3f}, {y:.3f}), normal.z={world_normal.z:.3f}"
                )
            return None
        city_location = city_inverse @ (surface.matrix_world @ location)
        samples.append(Vector((x, y, city_location.z)))
    return surface, samples


def route_has_actor_clearance(
    city_root: bpy.types.Object,
    surface: bpy.types.Object,
    samples: list[Vector],
    actor_minimum: Vector,
    actor_maximum: Vector,
    actor_scale: float,
    quiet: bool = False,
) -> bool:
    city_scale = max(city_root.matrix_world.to_scale())
    body_height = (actor_maximum.z - actor_minimum.z) * actor_scale
    body_radius = (
        max(
            actor_maximum.x - actor_minimum.x,
            actor_maximum.y - actor_minimum.y,
        )
        * actor_scale
        * 0.48
        + 0.04 * actor_scale
    )
    world_radius = body_radius * city_scale
    city_inverse = city_root.matrix_world.inverted()
    obstacles: list[tuple[bpy.types.Object, Vector, Vector]] = []
    for obj in descendants(city_root):
        if obj == surface or obj.type != "MESH" or obj.hide_render:
            continue
        local_corners = [
            city_inverse @ (obj.matrix_world @ Vector(corner))
            for corner in obj.bound_box
        ]
        minimum = Vector(
            tuple(min(corner[axis] for corner in local_corners) for axis in range(3))
        )
        maximum = Vector(
            tuple(max(corner[axis] for corner in local_corners) for axis in range(3))
        )
        obstacles.append((obj, minimum, maximum))

    for sample in samples:
        for height_fraction in (0.42, 0.78):
            local_probe = Vector(
                (sample.x, sample.y, sample.z + body_height * height_fraction)
            )
            world_probe = city_root.matrix_world @ local_probe
            for obstacle, minimum, maximum in obstacles:
                if not (
                    minimum.x - body_radius <= local_probe.x <= maximum.x + body_radius
                    and minimum.y - body_radius <= local_probe.y <= maximum.y + body_radius
                    and minimum.z - body_radius <= local_probe.z <= maximum.z + body_radius
                ):
                    continue
                obstacle_inverse = obstacle.matrix_world.inverted()
                found, nearest, _, _ = obstacle.closest_point_on_mesh(
                    obstacle_inverse @ world_probe
                )
                if not found:
                    continue
                nearest_world = obstacle.matrix_world @ nearest
                if (nearest_world - world_probe).length < world_radius:
                    if not quiet:
                        print(
                            f"RESIDENT_SKIP {city_root.name}: route on {surface.name} "
                            f"collides with {obstacle.name}"
                        )
                    return False
    return True


def find_validated_resident_route(
    city_root: bpy.types.Object,
    surface_name: str,
    start: tuple[float, float],
    end: tuple[float, float],
    actor_minimum: Vector,
    actor_maximum: Vector,
    actor_scale: float,
) -> tuple[bpy.types.Object, list[Vector]] | None:
    offsets = sorted(
        (
            (x_step * 0.12, y_step * 0.12)
            for x_step in range(-6, 7)
            for y_step in range(-6, 7)
        ),
        key=lambda offset: offset[0] ** 2 + offset[1] ** 2,
    )
    for attempt, (offset_x, offset_y) in enumerate(offsets):
        projection = projected_route_samples(
            city_root,
            surface_name,
            (start[0] + offset_x, start[1] + offset_y),
            (end[0] + offset_x, end[1] + offset_y),
            quiet=attempt != 0,
        )
        if projection is None:
            continue
        surface, samples = projection
        if not route_has_actor_clearance(
            city_root,
            surface,
            samples,
            actor_minimum,
            actor_maximum,
            actor_scale,
            quiet=attempt != 0,
        ):
            continue
        if attempt:
            print(
                f"RESIDENT_REROUTE {city_root.name} {surface_name}: "
                f"offset=({offset_x:.2f}, {offset_y:.2f})"
            )
        return surface, samples
    print(
        f"RESIDENT_SKIP {city_root.name}: no grounded collision-free segment "
        f"on {surface_name}"
    )
    return None


def populate_dressed_residents(
    collection: bpy.types.Collection,
) -> None:
    city_shots = {shot["root"]: shot for shot in SHOTS if shot["kind"] == "city"}
    actor_sources = [bpy.data.objects[name] for name in HD_ACTOR_ROOTS]
    placement_count = 0
    populated_cities: set[str] = set()
    for city_index, (root_name, routes) in enumerate(RESIDENT_ROUTES.items()):
        city_root = bpy.data.objects[root_name]
        shot = city_shots[root_name]
        stable_start = shot["start_frame"] + min(132, int((shot["end_frame"] - shot["start_frame"]) * 0.42))
        for resident_index, (surface_name, start, end) in enumerate(routes):
            source = actor_sources[
                (
                    city_index
                    + resident_index
                    + RESIDENT_ACTOR_OFFSETS.get(root_name, 0)
                )
                % len(actor_sources)
            ]
            actor_minimum, actor_maximum = hierarchy_local_bounds(source)
            authored_scale = RESIDENT_AUTHORED_SCALES[root_name] * (
                0.98 + 0.02 * ((city_index + resident_index) % 3)
            )
            projection = find_validated_resident_route(
                city_root,
                surface_name,
                start,
                end,
                actor_minimum,
                actor_maximum,
                authored_scale,
            )
            if projection is None:
                continue
            surface, route_samples = projection
            resident = clone_hierarchy(
                source,
                f"CINE2_{shot['id']}_Resident_{resident_index + 1:02d}",
                collection,
            )
            resident.parent = city_root
            resident.matrix_parent_inverse = Matrix.Identity(4)
            resident.scale = (authored_scale,) * 3
            direction = Vector((end[0] - start[0], end[1] - start[1]))
            resident.rotation_euler.z = math.atan2(direction.y, direction.x)
            walk_end = max(stable_start + 2, shot["end_frame"] - 18)
            foot_clearance = -actor_minimum.z * authored_scale + 0.02 * authored_scale
            for sample_index, sample in enumerate(route_samples):
                progress = sample_index / (len(route_samples) - 1)
                frame = round(stable_start + (walk_end - stable_start) * progress)
                gait_bob = (
                    0.025 * authored_scale
                    if 0 < sample_index < len(route_samples) - 1 and sample_index % 2
                    else 0.0
                )
                resident.location = (
                    sample.x,
                    sample.y,
                    sample.z + foot_clearance + gait_bob,
                )
                resident.keyframe_insert(data_path="location", frame=frame)
                resident.keyframe_insert(data_path="rotation_euler", frame=frame)
            placement_count += 1
            populated_cities.add(root_name)
            world_height = (
                (actor_maximum.z - actor_minimum.z)
                * authored_scale
                * city_root.matrix_world.to_scale().z
            )
            print(
                f"RESIDENT_OK {city_root.name} {surface.name}: "
                f"world_height={world_height:.4f}, samples={len(route_samples)}"
            )
    missing_cities = sorted(set(RESIDENT_ROUTES) - populated_cities)
    if placement_count < 10 or missing_cities:
        raise RuntimeError(
            f"Only {placement_count} collision-free residents were placed; "
            f"cities without a validated route: {missing_cities}"
        )


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

    intro_poses = [
        (1, Vector((-1.5, 5.0, 172)), Vector((-1.5, 5.0, 0.2)), 42),
        (67, Vector((-1.5, 1.0, 154)), Vector((-1.5, 5.0, 0.4)), 40),
        (115, Vector((-5.0, -22.0, 139)), Vector((-1.5, 4.0, 0.5)), 38),
        (193, Vector((2.0, -38.0, 118)), Vector((5.0, 0.0, 1.0)), 35),
        (289, Vector((8.0, -31.0, 64)), Vector((17.0, -2.0, 1.0)), 43),
        (343, Vector((15.0, -22.0, 40)), Vector((23.0, -3.0, 1.2)), 46),
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

        if root_name == "Landmark_Urithiru":
            route_poses = [
                (3871, Vector((-10.8, -26.0, 17.5)), Vector((-5.0, 4.0, 5.5)), 51),
                (3907, Vector((-10.2, -13.5, 15.8)), Vector((-7.0, 5.5, 5.9)), 53),
                (3955, Vector((-9.8, -4.8, 13.6)), center, 55),
            ]
        else:
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
        if root_name == "Landmark_Shinovar":
            # The authored Misted Mountains rise above the generic arrival arc
            # on Shinovar's eastern approach. Keep the full orbit safely above
            # the sampled ridge so the terrain never occludes the camera.
            height = max(height, 6.2)
            radius *= 1.12
        default_angle = math.degrees(math.atan2(-delta.y, -delta.x))
        angle = camera_angle_overrides.get(root_name, default_angle)
        orbit = float(shot["orbit_degrees"])
        aim = Vector((center.x, center.y, center.z + size.z * 0.05))
        if root_name == "Landmark_Urithiru":
            city_poses = [
                (3973, Vector((-9.1, -2.0, 13.0)), center + Vector((0, 0, 0.10)), 55),
                (4003, Vector((-8.2, -0.4, 12.6)), center + Vector((0, 0, 0.25)), 57),
                (4075, Vector((-3.0, 0.3, 12.0)), center + Vector((0, 0, 0.35)), 54),
                (4111, Vector((-2.0, 1.3, 12.6)), center + Vector((0, 0, 0.55)), 52),
                (4141, Vector((-1.8, 1.6, 12.8)), center + Vector((0, 0, 0.85)), 51),
                (4165, Vector((-1.0, 0.8, 13.7)), center + Vector((0, 0, 1.15)), 49),
                (4195, Vector((-0.4, -0.2, 14.5)), center + Vector((0, 0, 1.25)), 47),
                (4225, Vector((-0.2, -1.8, 15.4)), center + Vector((0, 0, 1.10)), 46),
                (4263, Vector((-0.1, -2.4, 15.8)), center + Vector((0, 0, 1.05)), 47),
                (end, Vector((-0.1, -2.6, 16.0)), center + Vector((0, 0, 1.05)), 48),
            ]
        else:
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
                    52,
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
            visible_start = shot["start_frame"] + 110
        elif shot["kind"] == "highstorm":
            visible_start = shot["start_frame"] + 70
        else:
            duration = shot["end_frame"] - shot["start_frame"]
            visible_start = shot["start_frame"] + min(132, max(76, int(duration * 0.42))) + 10
        visible_end = shot["end_frame"] - (
            64 if shot["kind"] == "map-intro" else 16
        )
        if shot["kind"] == "map-intro":
            visible_end = min(visible_end, shot["start_frame"] + 210)
        if shot.get("root") == "Landmark_Urithiru":
            visible_end = min(visible_end, 4075)
        is_intro = shot["kind"] == "map-intro"
        if is_intro:
            text_x = -0.39
            title_y = 0.305
            subtitle_y = 0.252
            title_scale = min(
                0.072,
                0.84 / max(8.0, len(shot["label"]) * 0.62),
            )
            subtitle_scale = min(
                0.031,
                0.78 / max(14.0, len(shot["subtitle"]) * 0.62),
            )
            plaque_location = (-0.39, 0.279, -2.025)
            plaque_scale = (0.29, 0.075, 1)
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


def animate_hierarchy_visibility(
    root: bpy.types.Object,
    start: int,
    end: int,
) -> None:
    for obj in descendants(root):
        animate_visibility(obj, start, end)


def build_epic_intro(
    collection: bpy.types.Collection,
    lights: dict[str, bpy.types.Object],
) -> None:
    shot = next(shot for shot in SHOTS if shot["kind"] == "map-intro")
    start = int(shot["start_frame"])
    end = int(shot["end_frame"])
    rng = random.Random(7717)
    cloud_material = material(
        "CINE3_Intro_Storm_Cloud",
        (0.012, 0.027, 0.052, 1),
        0.0,
        0.92,
        (0.006, 0.02, 0.055, 1),
        0.42,
    )
    lightning_material = material(
        "CINE3_Intro_Lightning",
        (0.3, 0.78, 1.0, 1),
        0.0,
        0.06,
        (0.52, 0.9, 1.0, 1),
        13.0,
    )
    rig = bpy.data.objects.new("CINE3_Intro_Stormfront_Rig", None)
    collection.objects.link(rig)
    cloud_parts: list[bpy.types.Object] = []
    active_collection(collection)
    for index in range(34):
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=2,
            radius=1,
            location=(
                rng.uniform(-2.6, 2.6),
                -31 + index * 1.9 + rng.uniform(-0.8, 0.8),
                rng.uniform(7.0, 15.5),
            ),
        )
        cloud = bpy.context.object
        cloud.scale = (
            rng.uniform(4.6, 8.2),
            rng.uniform(3.5, 6.8),
            rng.uniform(1.5, 3.2),
        )
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        for polygon in cloud.data.polygons:
            polygon.use_smooth = True
        cloud.data.materials.append(cloud_material)
        cloud_parts.append(cloud)
    cloud_wall = join_objects(cloud_parts, "CINE3_Intro_Eastern_Stormfront")
    cloud_wall.parent = rig
    cloud_wall.matrix_parent_inverse = Matrix.Identity(4)
    animate_visibility(cloud_wall, start, end)
    rig.location = (62, 0, 0)
    rig.keyframe_insert(data_path="location", frame=start)
    rig.location = (49, -1.5, 0)
    rig.keyframe_insert(data_path="location", frame=end)

    for bolt_index, (flash, y) in enumerate(
        ((43, -22), (97, -7), (193, 8), (289, 23))
    ):
        points = [
            Vector(
                (
                    54 + rng.uniform(-1.8, 1.8),
                    y + rng.uniform(-1.0, 1.0),
                    17.0 - point_index * 1.65,
                )
            )
            for point_index in range(8)
        ]
        bolt = create_curve(
            f"CINE3_Intro_Lightning_{bolt_index + 1}",
            points,
            0.075,
            lightning_material,
            collection,
        )
        animate_visibility(bolt, flash, flash + 3)

    flash_data = bpy.data.lights.new("CINE3_Intro_Lightning_Flash_Data", "AREA")
    flash_data.color = (0.2, 0.68, 1.0)
    flash_data.shape = "DISK"
    flash_data.size = 44
    flash_light = bpy.data.objects.new("CINE3_Intro_Lightning_Flash", flash_data)
    collection.objects.link(flash_light)
    flash_light.location = (50, 0, 24)
    flash_light.rotation_euler = (
        Vector((12, 0, 0)) - flash_light.location
    ).to_track_quat("-Z", "Y").to_euler()
    for flash in (43, 97, 193, 289):
        for frame, energy in ((flash - 1, 0), (flash, 7200), (flash + 3, 0)):
            flash_data.energy = energy
            flash_data.keyframe_insert(data_path="energy", frame=frame)
    animate_visibility(flash_light, start, end)

    key = lights["CINE2_Key"].data
    storm_rim = lights["CINE2_Storm_Rim"].data
    sun = lights["CINE2_Sun"].data
    for frame, energy in ((start, 250), (67, 900), (115, 2100), (289, 2250), (end, 2100)):
        key.energy = energy
        key.keyframe_insert(data_path="energy", frame=frame)
    for frame, energy in ((start, 900), (193, 3000), (289, 3900), (end, 2500)):
        storm_rim.energy = energy
        storm_rim.keyframe_insert(data_path="energy", frame=frame)
    for frame, energy in ((start, 0.15), (67, 0.55), (115, 1.1), (289, 1.75), (end, 1.6)):
        sun.energy = energy
        sun.keyframe_insert(data_path="energy", frame=frame)

    river_material = bpy.data.materials.get("CINE2_Runtime_River_Water")
    if river_material and river_material.node_tree:
        principled = river_material.node_tree.nodes.get("Principled BSDF")
        if principled:
            strength = principled.inputs.get("Emission Strength")
            if strength:
                for frame, value in ((start, 0.18), (110, 0.4), (184, 2.6), (292, 1.15), (end, 0.65)):
                    strength.default_value = value
                    strength.keyframe_insert("default_value", frame=frame)

    background = bpy.context.scene.world.node_tree.nodes.get("Background")
    if background:
        world_strength = background.inputs.get("Strength")
        if world_strength:
            for frame, value in ((start, 0.025), (184, 0.07), (292, 0.14), (end, 0.12)):
                world_strength.default_value = value
                world_strength.keyframe_insert("default_value", frame=frame)


def create_flying_radiant(
    name: str,
    collection: bpy.types.Collection,
    metal: bpy.types.Material,
    stormlight: bpy.types.Material,
) -> bpy.types.Object:
    source = bpy.data.objects.get("Actor_Alethi")
    if source is None:
        raise RuntimeError("Actor_Alethi is required for the Windrunner finale")
    rig = clone_hierarchy(source, name, collection)
    rig.location = (0, 0, 0)
    rig.rotation_euler = (0, 0, 0)
    # Actor_Alethi is 2.104 source units tall. This absolute scale makes each
    # airborne knight 6.7 cm in the map miniature, roughly one-fortieth of the
    # Urithiru tower height instead of another building-sized figure.
    rig.scale = (0.032, 0.032, 0.032)
    active_collection(collection)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8,
        radius=0.04,
        depth=2.35,
        location=(0.2, 0.45, 1.05),
    )
    spear = bpy.context.object
    spear.name = f"{name}_ShardSpear"
    spear.rotation_euler.y = math.radians(90)
    spear.data.materials.append(metal)
    spear.parent = rig
    spear.matrix_parent_inverse = Matrix.Identity(4)
    active_collection(collection)
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=1,
        radius=0.18,
        location=(-0.12, 0, 1.0),
    )
    glow = bpy.context.object
    glow.name = f"{name}_StormlightCore"
    glow.data.materials.append(stormlight)
    glow.parent = rig
    glow.matrix_parent_inverse = Matrix.Identity(4)
    trail = create_curve(
        f"{name}_StormlightRibbon",
        [Vector((-0.2, 0, 1.0)), Vector((-2.4, 0, 0.9)), Vector((-5.2, 0, 0.72))],
        0.035,
        stormlight,
        collection,
    )
    trail.parent = rig
    trail.matrix_parent_inverse = Matrix.Identity(4)
    return rig


def build_urithiru_finale(
    collection: bpy.types.Collection,
    bounds: dict[str, dict[str, Vector]],
) -> None:
    shot = next(shot for shot in SHOTS if shot.get("root") == "Landmark_Urithiru")
    end = int(shot["end_frame"])
    start = 3955
    city = bounds["Landmark_Urithiru"]
    center = city["center"]
    size = city["size"]
    top = Vector((center.x, center.y, city["maximum"].z + 0.08))
    rng = random.Random(4242)
    cloud_material = material(
        "CINE3_Urithiru_CloudSea",
        (0.025, 0.05, 0.075, 1),
        0.0,
        0.94,
        (0.01, 0.04, 0.08, 1),
        0.5,
    )
    stormlight = material(
        "CINE3_Urithiru_Stormlight",
        (0.22, 0.78, 1.0, 1),
        0.0,
        0.06,
        (0.48, 0.92, 1.0, 1),
        10.0,
    )
    metal = material("CINE3_Shardspear", (0.42, 0.64, 0.72, 1), 0.72, 0.14, (0.16, 0.55, 0.72, 1), 2.2)

    cloud_parts: list[bpy.types.Object] = []
    active_collection(collection)
    cloud_radius = max(size.x, size.y) * 0.7
    for index in range(22):
        angle = index / 22 * math.tau + rng.uniform(-0.12, 0.12)
        radius = cloud_radius + rng.uniform(0.8, 4.2)
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=2,
            radius=1,
            location=(
                center.x + math.cos(angle) * radius,
                center.y + math.sin(angle) * radius,
                city["minimum"].z - 0.65 + rng.uniform(-0.18, 0.18),
            ),
        )
        cloud = bpy.context.object
        cloud.scale = (rng.uniform(2.3, 4.8), rng.uniform(1.8, 3.7), rng.uniform(0.35, 0.72))
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        for polygon in cloud.data.polygons:
            polygon.use_smooth = True
        cloud.data.materials.append(cloud_material)
        cloud_parts.append(cloud)
    cloud_sea = join_objects(cloud_parts, "CINE3_Urithiru_Cloud_Sea")
    animate_visibility(cloud_sea, start, end)
    cloud_sea.location.x = -0.45
    cloud_sea.keyframe_insert(data_path="location", frame=start)
    cloud_sea.location.x = 0.55
    cloud_sea.keyframe_insert(data_path="location", frame=end)

    beacon = create_curve(
        "CINE3_Urithiru_Radiant_Beacon",
        [top, top + Vector((0.0, 0.0, 9.0)), top + Vector((0.12, -0.08, 22.0))],
        0.055,
        stormlight,
        collection,
    )
    animate_visibility(beacon, 4111, end)
    beacon.data.bevel_factor_end = 0.0
    beacon.data.keyframe_insert(data_path="bevel_factor_end", frame=4111)
    beacon.data.bevel_factor_end = 1.0
    beacon.data.keyframe_insert(data_path="bevel_factor_end", frame=4165)
    light_data = bpy.data.lights.new("CINE3_Urithiru_Beacon_Light_Data", "POINT")
    light_data.color = (0.22, 0.72, 1.0)
    light_data.shadow_soft_size = 4.0
    light = bpy.data.objects.new("CINE3_Urithiru_Beacon_Light", light_data)
    collection.objects.link(light)
    light.location = top
    for frame, energy in ((start, 0), (4111, 0), (4141, 2800), (4165, 5200), (end, 3200)):
        light_data.energy = energy
        light_data.keyframe_insert(data_path="energy", frame=frame)

    for material_name in (
        "SF_Urithiru_Radiant_Stormlight",
        "SF_Stormlight_Glass",
    ):
        radiant_material = bpy.data.materials.get(material_name)
        if not radiant_material or not radiant_material.node_tree:
            continue
        principled = radiant_material.node_tree.nodes.get("Principled BSDF")
        strength = principled.inputs.get("Emission Strength") if principled else None
        if strength is None:
            continue
        for frame, value in (
            (3955, 1.35),
            (4003, 4.8),
            (4165, 6.0),
            (4317, 2.5),
        ):
            strength.default_value = value
            strength.keyframe_insert("default_value", frame=frame)

    clearance = max(size.x, size.y) * 0.62 + 0.75
    for index in range(6):
        flyer = create_flying_radiant(
            f"CINE3_Windrunner_{index + 1:02d}",
            collection,
            metal,
            stormlight,
        )
        if index == 0:
            flyer.scale = (0.038, 0.038, 0.038)
        animate_hierarchy_visibility(flyer, 3973, end)
        base_angle = math.radians(18 + index * 58)
        direction = -1 if index % 3 == 1 else 1
        for frame, progress in (
            (3973, 0.0),
            (4003, 0.12),
            (4075, 0.34),
            (4165, 0.66),
            (4225, 0.84),
            (4263, 0.94),
            (end, 1.0),
        ):
            angle = base_angle + direction * progress * math.radians(92 + index * 7)
            radius = clearance + (index % 3) * 0.55 + math.sin(progress * math.pi) * 0.4
            altitude = city["minimum"].z + size.z * (0.46 + (index % 4) * 0.12) + progress * 0.7
            flyer.location = (
                center.x + math.cos(angle) * radius,
                center.y + math.sin(angle) * radius,
                altitude,
            )
            flyer.rotation_euler = (
                math.radians(74 - progress * 10),
                math.radians((index % 2 * 2 - 1) * 12),
                angle + direction * math.pi / 2,
            )
            flyer.keyframe_insert(data_path="location", frame=frame)
            flyer.keyframe_insert(data_path="rotation_euler", frame=frame)

    mote_parts: list[bpy.types.Object] = []
    active_collection(collection)
    for index in range(24):
        angle = index / 24 * math.tau
        radius = 0.45 + (index % 5) * 0.18
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=1,
            radius=0.028 + (index % 3) * 0.008,
            location=(
                top.x + math.cos(angle) * radius,
                top.y + math.sin(angle) * radius,
                top.z + 0.2 + (index % 7) * 0.23,
            ),
        )
        mote = bpy.context.object
        mote.data.materials.append(stormlight)
        mote_parts.append(mote)
    motes = join_objects(mote_parts, "CINE3_Urithiru_Gloryspren_Motes")
    animate_visibility(motes, 4111, end)
    motes.rotation_euler.z = 0
    motes.keyframe_insert(data_path="rotation_euler", frame=4111)
    motes.rotation_euler.z = math.radians(150)
    motes.keyframe_insert(data_path="rotation_euler", frame=end)


def add_lights(collection: bpy.types.Collection) -> dict[str, bpy.types.Object]:
    result: dict[str, bpy.types.Object] = {}
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
        result[name] = obj

    sun_data = bpy.data.lights.new("CINE2_Sun", "SUN")
    sun_data.energy = 1.6
    sun_data.color = (0.72, 0.82, 1.0)
    sun = bpy.data.objects.new("CINE2_Sun", sun_data)
    collection.objects.link(sun)
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(24))
    result[sun.name] = sun
    return result


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
        PROJECT_ROOT / "artifacts" / "cinematic" / "map-v3-frames" / "frame_"
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
    build_geographic_route(collection, bounds)
    assert_no_destination_rings()
    populate_dressed_residents(collection)
    camera, _ = build_continuous_camera(collection, bounds)
    build_camera_labels(camera, collection)
    build_highstorm(collection)
    lights = add_lights(collection)
    build_epic_intro(collection, lights)
    build_urithiru_finale(collection, bounds)
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
