#!/usr/bin/env python3
"""Build the tempo-locked Storm Over Roshar cinematic scene."""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_BLEND = PROJECT_ROOT / "blender" / "roshar-landmarks.blend"
OUTPUT_BLEND = PROJECT_ROOT / "blender" / "roshar-cinematic.blend"
SHOT_PLAN_PATH = PROJECT_ROOT / "docs" / "cinematic" / "shot-plan.json"
CINEMATIC_COLLECTION = "Roshar_Cinematic"
LANDMARK_PREFIX = "Landmark_"

with SHOT_PLAN_PATH.open(encoding="utf-8") as handle:
    PLAN = json.load(handle)

SHOTS = PLAN["shots"]
FPS = int(PLAN["fps"])
BEAT_SECONDS = 60.0 / 114.85


def set_active_collection(collection: bpy.types.Collection) -> None:
    layer = bpy.context.view_layer.layer_collection

    def find(candidate: bpy.types.LayerCollection) -> bpy.types.LayerCollection | None:
        if candidate.collection == collection:
            return candidate
        for child in candidate.children:
            result = find(child)
            if result:
                return result
        return None

    found = find(layer)
    if found:
        bpy.context.view_layer.active_layer_collection = found


def reset_cinematic_collection() -> bpy.types.Collection:
    previous = bpy.data.collections.get(CINEMATIC_COLLECTION)
    if previous:
        for obj in list(previous.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(previous)
    collection = bpy.data.collections.new(CINEMATIC_COLLECTION)
    bpy.context.scene.collection.children.link(collection)
    set_active_collection(collection)
    return collection


def descendants(root: bpy.types.Object) -> list[bpy.types.Object]:
    return [root, *list(root.children_recursive)]


def landmark_world_bounds(root: bpy.types.Object) -> dict[str, Vector | float]:
    corners: list[Vector] = []
    for obj in descendants(root):
        if obj.type == "MESH":
            corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not corners:
        center = root.matrix_world.translation.copy()
        return {
            "minimum": center,
            "maximum": center,
            "center": center,
            "size": Vector((1.0, 1.0, 1.0)),
            "radius": 1.0,
        }
    minimum = Vector(tuple(min(corner[axis] for corner in corners) for axis in range(3)))
    maximum = Vector(tuple(max(corner[axis] for corner in corners) for axis in range(3)))
    size = maximum - minimum
    return {
        "minimum": minimum,
        "maximum": maximum,
        "center": (minimum + maximum) / 2.0,
        "size": size,
        "radius": max(size.x, size.y) * 0.5,
    }


def material(
    name: str,
    base_color: tuple[float, float, float, float],
    metallic: float = 0.0,
    roughness: float = 0.5,
    emission_color: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    value = bpy.data.materials.new(name)
    value.diffuse_color = base_color
    value.use_nodes = True
    principled = value.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = base_color
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    if emission_color:
        principled.inputs["Emission Color"].default_value = emission_color
        principled.inputs["Emission Strength"].default_value = emission_strength
    return value


def set_constant_interpolation(obj: bpy.types.Object, data_path: str) -> None:
    # Boolean properties are evaluated discretely even though Blender 5.2 stores
    # their keys in layered Actions whose channel bags are not exposed as fcurves.
    return


def animate_visibility(
    obj: bpy.types.Object, visible_ranges: list[tuple[int, int]]
) -> None:
    scene_end = int(PLAN["render_end_frame"])
    events: dict[int, bool] = {1: True}
    for start, end in visible_ranges:
        events[max(1, start - 1)] = True
        events[start] = False
        events[end] = False
        if end < scene_end:
            events[end + 1] = True
    for frame, hidden in sorted(events.items()):
        obj.hide_render = hidden
        obj.keyframe_insert(data_path="hide_render", frame=frame)
    set_constant_interpolation(obj, "hide_render")


def hide_authoring_modules() -> None:
    for obj in bpy.context.scene.objects:
        if obj.parent is None and (
            obj.name.startswith(("Module_", "Actor_", "Prop_"))
            or obj.name == "Cube"
        ):
            for nested in descendants(obj):
                nested.hide_render = True


def prepare_landmark_visibility() -> None:
    intro = SHOTS[0]
    intro_range = (intro["start_frame"], intro["end_frame"])
    for root in [obj for obj in bpy.context.scene.objects if obj.name.startswith(LANDMARK_PREFIX)]:
        location_shot = next((shot for shot in SHOTS if shot["root"] == root.name), None)
        ranges = [intro_range]
        if location_shot:
            ranges.append((location_shot["start_frame"], location_shot["end_frame"]))
        for obj in descendants(root):
            animate_visibility(obj, ranges)

        if location_shot:
            original_z = root.location.z
            start = location_shot["start_frame"]
            reveal_end = min(
                location_shot["end_frame"],
                start
                + round(
                    location_shot["reveal_beats"] * BEAT_SECONDS * FPS
                ),
            )
            root.location.z = original_z - 1.4
            root.keyframe_insert(data_path="location", frame=start)
            root.location.z = original_z
            root.keyframe_insert(data_path="location", frame=reveal_end)
            root.keyframe_insert(data_path="location", frame=location_shot["end_frame"])


def create_curve(
    name: str,
    points: list[Vector],
    bevel_depth: float,
    curve_material: bpy.types.Material,
    collection: bpy.types.Collection,
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
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    data.materials.append(curve_material)
    return obj


def build_atlas_route(collection: bpy.types.Collection) -> None:
    stormlight = material(
        "CINE_Stormlight_Route",
        (0.015, 0.22, 0.28, 1.0),
        metallic=0.15,
        roughness=0.24,
        emission_color=(0.02, 0.74, 1.0, 1.0),
        emission_strength=2.4,
    )
    points = []
    for shot in SHOTS[1:]:
        root = bpy.data.objects[shot["root"]]
        bounds = landmark_world_bounds(root)
        center = bounds["center"]
        points.append(Vector((center.x, center.y, 0.08)))
    route = create_curve("CINE_Stormlight_Route", points, 0.018, stormlight, collection)
    route.hide_render = False


def create_torus(
    name: str,
    center: Vector,
    radius: float,
    minor_radius: float,
    ring_material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    set_active_collection(collection)
    bpy.ops.mesh.primitive_torus_add(
        align="WORLD",
        major_radius=radius,
        minor_radius=minor_radius,
        major_segments=72,
        minor_segments=8,
        location=center,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(ring_material)
    return obj


def build_transition_rig(shot: dict[str, object]) -> bpy.types.Object | None:
    if not shot["root"]:
        return None
    collection = bpy.data.collections[CINEMATIC_COLLECTION]
    root = bpy.data.objects[str(shot["root"])]
    bounds = landmark_world_bounds(root)
    center = bounds["center"]
    radius = float(bounds["radius"]) * 1.18
    brass = bpy.data.materials.get("SF_Aged_Brass") or material(
        "CINE_Aged_Brass", (0.34, 0.16, 0.035, 1.0), 0.86, 0.25
    )
    ring = create_torus(
        f"CINE_Ring_{shot['id']}",
        Vector((center.x, center.y, 0.04)),
        radius,
        0.07,
        brass,
        collection,
    )
    start = int(shot["start_frame"])
    end = int(shot["end_frame"])
    animate_visibility(ring, [(start, end)])
    ring.rotation_euler.z = 0.0
    ring.keyframe_insert(data_path="rotation_euler", frame=start)
    ring.rotation_euler.z = math.radians(float(shot["orbit_degrees"]) * 1.8)
    ring.keyframe_insert(data_path="rotation_euler", frame=end)
    return ring


def create_label(
    name: str,
    body: str,
    location: Vector,
    scale: float,
    camera: bpy.types.Object,
    label_material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    data = bpy.data.curves.new(name, "FONT")
    data.body = body
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.extrude = 0.018
    data.bevel_depth = 0.008
    data.bevel_resolution = 2
    data.size = 1.0
    data.space_character = 1.2
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    obj.location = location
    obj.scale = (scale, scale, scale)
    data.materials.append(label_material)
    constraint = obj.constraints.new("COPY_ROTATION")
    constraint.target = camera
    return obj


def build_location_labels(shots: list[dict[str, object]]) -> None:
    collection = bpy.data.collections[CINEMATIC_COLLECTION]
    camera = bpy.data.objects["CINE_Camera"]
    gold = material(
        "CINE_Label_Gold",
        (0.38, 0.19, 0.045, 1.0),
        metallic=0.75,
        roughness=0.24,
        emission_color=(0.42, 0.17, 0.025, 1.0),
        emission_strength=1.6,
    )
    cyan = material(
        "CINE_Label_Stormlight",
        (0.01, 0.18, 0.22, 1.0),
        metallic=0.1,
        roughness=0.3,
        emission_color=(0.02, 0.62, 0.78, 1.0),
        emission_strength=3.0,
    )

    intro = shots[0]
    title = create_label(
        "CINE_Title_Roshar",
        "R O S H A R",
        Vector((8.0, 1.0, 10.0)),
        2.1,
        camera,
        gold,
        collection,
    )
    animate_visibility(title, [(intro["start_frame"] + 40, intro["end_frame"])])

    for shot in shots[1:]:
        root = bpy.data.objects[str(shot["root"])]
        bounds = landmark_world_bounds(root)
        center = bounds["center"]
        size = bounds["size"]
        scale = max(0.42, min(0.85, max(size.x, size.y) / 20.0))
        location = Vector((center.x, center.y, bounds["maximum"].z + max(1.6, size.z * 0.18)))
        label = create_label(
            f"CINE_Label_{shot['id']}",
            str(shot["label"]),
            location,
            scale,
            camera,
            gold,
            collection,
        )
        subtitle = create_label(
            f"CINE_Subtitle_{shot['id']}",
            str(shot["subtitle"]),
            location + Vector((0.0, 0.0, -0.75 * scale)),
            scale * 0.28,
            camera,
            cyan,
            collection,
        )
        reveal_frame = min(
            int(shot["end_frame"]),
            int(shot["start_frame"]) + round(float(shot["reveal_beats"]) * BEAT_SECONDS * FPS),
        )
        visible = [(reveal_frame, int(shot["end_frame"]) - 18)]
        animate_visibility(label, visible)
        animate_visibility(subtitle, visible)
        for obj in (label, subtitle):
            original_scale = obj.scale.copy()
            obj.scale = original_scale * 0.01
            obj.keyframe_insert(data_path="scale", frame=reveal_frame)
            obj.scale = original_scale
            obj.keyframe_insert(data_path="scale", frame=reveal_frame + 16)


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


def insert_smooth_key(obj: bpy.types.Object, data_path: str, frame: int) -> None:
    obj.keyframe_insert(data_path=data_path, frame=frame)


def build_camera_animation(shots: list[dict[str, object]]) -> None:
    collection = bpy.data.collections[CINEMATIC_COLLECTION]
    data = bpy.data.cameras.new("CINE_Camera")
    data.lens = 52
    data.sensor_width = 36
    data.clip_start = 0.08
    data.clip_end = 600
    camera = bpy.data.objects.new("CINE_Camera", data)
    collection.objects.link(camera)
    target = bpy.data.objects.new("CINE_Camera_Target", None)
    collection.objects.link(target)
    track = camera.constraints.new("TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    bpy.context.scene.camera = camera

    intro = shots[0]
    intro_positions = [
        (int(intro["start_frame"]), Vector((10.0, -58.0, 48.0)), Vector((10.0, 1.0, 0.0)), 58),
        (int(intro["start_frame"]) + 155, Vector((10.0, -22.0, 62.0)), Vector((10.0, 1.0, 0.0)), 52),
        (int(intro["end_frame"]), Vector((28.0, -18.0, 25.0)), Vector((19.0, -7.0, 1.0)), 48),
    ]
    for frame, position, aim, lens in intro_positions:
        camera.location = position
        data.lens = lens
        target.location = aim
        insert_smooth_key(camera, "location", frame)
        insert_smooth_key(data, "lens", frame)
        insert_smooth_key(target, "location", frame)

    base_angle = -112.0
    camera_overrides = {
        "Landmark_Kharbranth": {
            "angle_start": -108.0,
            "radius_multiplier": 1.08,
            "height_multiplier": 0.54,
        },
        "Landmark_Urithiru": {
            "angle_start": -112.0,
            "radius_multiplier": 1.28,
            "height_multiplier": 0.68,
        },
    }
    for index, shot in enumerate(shots[1:]):
        root = bpy.data.objects[str(shot["root"])]
        bounds = landmark_world_bounds(root)
        center = bounds["center"]
        size = bounds["size"]
        horizontal_radius = float(bounds["radius"])
        height = float(size.z)
        override = camera_overrides.get(str(shot["root"]), {})
        safe_radius = (
            max(7.5, horizontal_radius * 1.75 + height * 0.28)
            * float(override.get("radius_multiplier", 1.0))
        )
        target_height = bounds["minimum"].z + height * (0.44 if height > 5 else 0.32)
        aim = Vector((center.x, center.y, target_height))
        start = int(shot["start_frame"])
        end = int(shot["end_frame"])
        reveal = min(end - 40, start + round(float(shot["reveal_beats"]) * BEAT_SECONDS * FPS))
        middle = (reveal + end) // 2
        angle_start = float(
            override.get("angle_start", base_angle + index * 31.0)
        )
        sweep = float(shot["orbit_degrees"])
        low_height_multiplier = float(override.get("height_multiplier", 0.46))

        poses = [
            (
                start,
                camera_pose(aim, safe_radius * 1.28, max(8.0, safe_radius * 0.92), angle_start),
                aim + Vector((0.0, 0.0, height * 0.12)),
                46,
            ),
            (
                reveal,
                camera_pose(aim, safe_radius, max(4.8, safe_radius * low_height_multiplier), angle_start + sweep * 0.16),
                aim,
                54 if height > 5 else 50,
            ),
            (
                middle,
                camera_pose(aim, safe_radius * 0.94, max(4.5, safe_radius * (low_height_multiplier - 0.05)), angle_start + sweep * 0.58),
                aim + Vector((0.0, 0.0, height * 0.05)),
                58 if height > 5 else 52,
            ),
            (
                end,
                camera_pose(aim, safe_radius * 1.08, max(5.5, safe_radius * 0.56), angle_start + sweep),
                aim + Vector((0.0, 0.0, height * 0.1)),
                52,
            ),
        ]
        for frame, position, target_location, lens in poses:
            camera.location = position
            target.location = target_location
            data.lens = lens
            insert_smooth_key(camera, "location", frame)
            insert_smooth_key(target, "location", frame)
            insert_smooth_key(data, "lens", frame)


def build_storm_wipes(collection: bpy.types.Collection) -> None:
    stormlight = material(
        "CINE_Storm_Streak",
        (0.01, 0.18, 0.23, 1.0),
        metallic=0.0,
        roughness=0.22,
        emission_color=(0.02, 0.62, 0.9, 1.0),
        emission_strength=3.5,
    )
    for shot in SHOTS[1:]:
        root = bpy.data.objects[str(shot["root"])]
        bounds = landmark_world_bounds(root)
        center = bounds["center"]
        points = []
        for index in range(22):
            y = center.y - 8.0 + index * 0.72
            z = 0.4 + (index % 7) * 0.72
            points.extend(
                [
                    Vector((center.x + 12.0, y, z)),
                    Vector((center.x + 7.5, y - 0.35, z + 0.25)),
                ]
            )
        wall = create_curve(
            f"CINE_Storm_Wipe_{shot['id']}",
            points,
            0.018,
            stormlight,
            collection,
        )
        start = int(shot["start_frame"])
        visible_end = min(int(shot["end_frame"]), start + 28)
        animate_visibility(wall, [(start, visible_end)])
        wall.location.x = 9.0
        wall.keyframe_insert(data_path="location", frame=start)
        wall.location.x = -18.0
        wall.keyframe_insert(data_path="location", frame=visible_end)


def configure_render(scene: bpy.types.Scene) -> None:
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = int(PLAN["render_end_frame"])
    scene.render.filepath = str(PROJECT_ROOT / "artifacts" / "cinematic" / "frames" / "frame_")
    scene.render.use_file_extension = True
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 55
    scene.render.use_motion_blur = False
    scene.render.motion_blur_shutter = 0.35
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 16
    scene.render.image_settings.color_mode = "RGB"
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = scene.world or bpy.data.worlds.new("CINE_World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.002, 0.008, 0.014, 1.0)
    background.inputs["Strength"].default_value = 0.16


def add_cinematic_lights(collection: bpy.types.Collection) -> None:
    for name, light_type, energy, color, location, rotation in [
        (
            "CINE_Key",
            "AREA",
            1900,
            (1.0, 0.58, 0.25),
            (-12.0, -18.0, 34.0),
            (math.radians(18), 0.0, math.radians(-28)),
        ),
        (
            "CINE_Storm_Rim",
            "AREA",
            2400,
            (0.08, 0.55, 1.0),
            (32.0, 12.0, 26.0),
            (math.radians(30), 0.0, math.radians(138)),
        ),
    ]:
        data = bpy.data.lights.new(name, light_type)
        data.energy = energy
        data.color = color
        if light_type == "AREA":
            data.shape = "DISK"
            data.size = 22.0
        obj = bpy.data.objects.new(name, data)
        collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = rotation


def main() -> None:
    if Path(bpy.data.filepath).resolve() != SOURCE_BLEND.resolve():
        bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))
    collection = reset_cinematic_collection()
    hide_authoring_modules()
    configure_render(bpy.context.scene)
    prepare_landmark_visibility()
    build_atlas_route(collection)
    build_camera_animation(SHOTS)
    build_location_labels(SHOTS)
    for shot in SHOTS[1:]:
        build_transition_rig(shot)
    build_storm_wipes(collection)
    add_cinematic_lights(collection)
    bpy.context.scene["cinematic_title"] = PLAN["title"]
    bpy.context.scene["soundtrack_duration_seconds"] = PLAN["audio_duration_seconds"]
    bpy.context.scene["shot_plan_path"] = str(SHOT_PLAN_PATH)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    print(f"Saved cinematic scene: {OUTPUT_BLEND}")


if __name__ == "__main__":
    main()
