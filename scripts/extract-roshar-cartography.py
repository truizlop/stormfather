#!/usr/bin/env python3
"""Derive original runtime vectors from the project owner's Roshar map reference.

Usage:
    python3 scripts/extract-roshar-cartography.py SOURCE.png OUTPUT.ts

The source image is deliberately not copied into the repository. Pillow and NumPy
are used only by this authoring utility; they are not runtime dependencies.
"""

from __future__ import annotations

import math
import sys
from collections.abc import Iterable, Sequence
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

Point = tuple[float, float]
Segment = tuple[tuple[int, int], tuple[int, int]]

MAP_ORIGIN = (950.0, 600.0)
WORLD_UNITS_PER_PIXEL = 0.064

MARCHING_SQUARES = {
    1: (("left", "bottom"),),
    2: (("bottom", "right"),),
    3: (("left", "right"),),
    4: (("right", "top"),),
    5: (("top", "left"), ("bottom", "right")),
    6: (("top", "bottom"),),
    7: (("left", "top"),),
    8: (("top", "left"),),
    9: (("top", "bottom"),),
    10: (("top", "right"), ("bottom", "left")),
    11: (("top", "right"),),
    12: (("left", "right"),),
    13: (("bottom", "right"),),
    14: (("left", "bottom"),),
}


def make_land_mask(image: Image.Image) -> np.ndarray:
    rgb = np.asarray(image.convert("RGB")).astype(np.float32)
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    # Land in the supplied map is warm ochre/green; all water is blue/cyan. The
    # opening removes fine lettering and border strokes, while the closing bridges
    # the narrow cyan coastline halo without erasing real straits.
    warm = (
        (red > blue * 1.08)
        & (green > blue * 0.80)
        & ((red + green) > 105)
        & (red > 43)
    )
    mask = Image.fromarray((warm * 255).astype("uint8"), "L")
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5))
    mask = mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
    return np.asarray(mask) > 127


def edge_point(edge: str, x: int, y: int) -> tuple[int, int]:
    # Doubled coordinates keep all marching-square midpoints integral.
    return {
        "top": (2 * x + 1, 2 * y),
        "right": (2 * x + 2, 2 * y + 1),
        "bottom": (2 * x + 1, 2 * y + 2),
        "left": (2 * x, 2 * y + 1),
    }[edge]


def mask_contours(mask: np.ndarray) -> list[list[Point]]:
    padded = np.pad(mask, 1)
    height, width = padded.shape
    segments: list[Segment] = []

    for y in range(height - 1):
        for x in range(width - 1):
            case = (
                (8 if padded[y, x] else 0)
                | (4 if padded[y, x + 1] else 0)
                | (2 if padded[y + 1, x + 1] else 0)
                | (1 if padded[y + 1, x] else 0)
            )
            for first, second in MARCHING_SQUARES.get(case, ()):
                segments.append(
                    (edge_point(first, x, y), edge_point(second, x, y))
                )

    adjacency: dict[tuple[int, int], list[tuple[int, int]]] = {}
    for first, second in segments:
        adjacency.setdefault(first, []).append(second)
        adjacency.setdefault(second, []).append(first)

    unused = {tuple(sorted(segment)) for segment in segments}
    contours: list[list[Point]] = []
    while unused:
        first_edge = next(iter(unused))
        start, current = first_edge
        unused.remove(first_edge)
        path = [start, current]

        while current != start:
            candidates = [
                neighbor
                for neighbor in adjacency[current]
                if tuple(sorted((current, neighbor))) in unused
            ]
            if not candidates:
                raise RuntimeError("Open contour while tracing derived geography")
            following = candidates[0]
            unused.remove(tuple(sorted((current, following))))
            current = following
            path.append(current)

        contours.append(
            [((x / 2) - 1, (y / 2) - 1) for x, y in path[:-1]]
        )
    return contours


def signed_area(points: Sequence[Point]) -> float:
    return 0.5 * sum(
        points[index][0] * points[(index + 1) % len(points)][1]
        - points[(index + 1) % len(points)][0] * points[index][1]
        for index in range(len(points))
    )


def polygon_centroid(points: Sequence[Point]) -> Point:
    area = signed_area(points)
    if abs(area) < 1:
        return (
            sum(point[0] for point in points) / len(points),
            sum(point[1] for point in points) / len(points),
        )
    cross = [
        points[index][0] * points[(index + 1) % len(points)][1]
        - points[(index + 1) % len(points)][0] * points[index][1]
        for index in range(len(points))
    ]
    return (
        sum(
            (points[index][0] + points[(index + 1) % len(points)][0])
            * cross[index]
            for index in range(len(points))
        )
        / (6 * area),
        sum(
            (points[index][1] + points[(index + 1) % len(points)][1])
            * cross[index]
            for index in range(len(points))
        )
        / (6 * area),
    )


def contains_point(polygon: Sequence[Point], point: Point) -> bool:
    x, y = point
    inside = False
    for index in range(len(polygon)):
        x1, y1 = polygon[index]
        x2, y2 = polygon[(index + 1) % len(polygon)]
        if (y1 > y) != (y2 > y) and x < (
            (x2 - x1) * (y - y1) / (y2 - y1) + x1
        ):
            inside = not inside
    return inside


def coastline_score(image: np.ndarray, points: Sequence[Point]) -> float:
    samples: list[float] = []
    stride = max(1, len(points) // 150)
    for x, y in points[::stride]:
        ix, iy = round(x), round(y)
        patch = image[
            max(0, iy - 5) : min(image.shape[0], iy + 6),
            max(0, ix - 5) : min(image.shape[1], ix + 6),
        ]
        if patch.size == 0:
            continue
        red, green, blue = patch[..., 0], patch[..., 1], patch[..., 2]
        cyan = (blue > 105) & (green > 95) & (blue > red * 1.06)
        samples.append(float(np.mean(cyan)))
    return float(np.mean(samples)) if samples else 0


def distance_to_line(point: Point, start: Point, end: Point) -> float:
    if start == end:
        return math.dist(point, start)
    x, y = point
    x1, y1 = start
    x2, y2 = end
    denominator = (x2 - x1) ** 2 + (y2 - y1) ** 2
    amount = max(
        0.0,
        min(1.0, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / denominator),
    )
    projection = (x1 + amount * (x2 - x1), y1 + amount * (y2 - y1))
    return math.dist(point, projection)


def rdp(points: Sequence[Point], epsilon: float) -> list[Point]:
    if len(points) <= 2:
        return list(points)
    farthest_distance = 0.0
    farthest_index = 0
    for index in range(1, len(points) - 1):
        distance = distance_to_line(points[index], points[0], points[-1])
        if distance > farthest_distance:
            farthest_distance = distance
            farthest_index = index
    if farthest_distance <= epsilon:
        return [points[0], points[-1]]
    return rdp(points[: farthest_index + 1], epsilon)[:-1] + rdp(
        points[farthest_index:], epsilon
    )


def simplify_closed(points: Sequence[Point], epsilon: float) -> list[Point]:
    left_index = min(
        range(len(points)), key=lambda index: (points[index][0], points[index][1])
    )
    rotated = list(points[left_index:]) + list(points[:left_index])
    opposite_index = max(
        range(1, len(rotated)),
        key=lambda index: math.dist(rotated[0], rotated[index]),
    )
    first = rdp(rotated[: opposite_index + 1], epsilon)
    second = rdp(rotated[opposite_index:] + [rotated[0]], epsilon)
    simplified = first[:-1] + second[:-1]
    return simplified if len(simplified) >= 3 else rotated[:3]


def is_reference_lettering(centroid: Point) -> bool:
    x, y = centroid
    return (
        # "RESHI ISLES"
        (680 < x < 1190 and 198 < y < 252)
        # "Reshi Sea"
        or (730 < x < 1080 and 350 < y < 415)
        # isolated "Sea" just west of Herdaz
        or (900 < x < 1055 and 305 < y < 360)
    )


def island_group(centroid: Point) -> str:
    x, y = centroid
    if x < 220:
        return "aimian-archipelago"
    if y < 360:
        return "reshi-isles"
    if x < 430:
        return "western-isles"
    if x > 1600:
        return "origin-isles"
    if y > 850:
        return "southern-isles"
    return "coastal-isles"


def to_world(point: Point) -> Point:
    return (
        round((point[0] - MAP_ORIGIN[0]) * WORLD_UNITS_PER_PIXEL, 3),
        round((point[1] - MAP_ORIGIN[1]) * WORLD_UNITS_PER_PIXEL, 3),
    )


def ts_points(points: Iterable[Point], indent: str = "  ") -> str:
    return "\n".join(
        f"{indent}[{x:.3f}, {z:.3f}]," for x, z in map(to_world, points)
    )


def write_typescript(
    output: Path,
    image_size: tuple[int, int],
    mainland: Sequence[Point],
    aimia: Sequence[Point],
    islands: Sequence[tuple[str, Sequence[Point]]],
    waters: Sequence[tuple[str, Sequence[Point]]],
) -> None:
    sections = [
        "/**",
        " * Generated original vector geometry derived from the project-owner-supplied",
        " * Roshar map reference. The reference raster is not distributed at runtime.",
        " * Regenerate with scripts/extract-roshar-cartography.py.",
        " */",
        "",
        "export type GeographyPoint = readonly [number, number];",
        "",
        "export interface IslandPolygon {",
        "  id: string;",
        "  group: string;",
        "  points: readonly GeographyPoint[];",
        "}",
        "",
        "export interface InlandWaterPolygon {",
        "  id: string;",
        "  points: readonly GeographyPoint[];",
        "}",
        "",
        f"export const referenceMapSize = {{ width: {image_size[0]}, height: {image_size[1]} }} as const;",
        f"export const referenceWorldOrigin = [{MAP_ORIGIN[0]:.1f}, {MAP_ORIGIN[1]:.1f}] as const;",
        f"export const worldUnitsPerReferencePixel = {WORLD_UNITS_PER_PIXEL:.3f};",
        "",
        "export const mainlandOutline: readonly GeographyPoint[] = [",
        ts_points(mainland),
        "] as const;",
        "",
        "export const aimiaOutline: readonly GeographyPoint[] = [",
        ts_points(aimia),
        "] as const;",
        "",
        "export const islandPolygons: readonly IslandPolygon[] = [",
    ]

    for index, (group, points) in enumerate(islands):
        sections.extend(
            [
                "  {",
                f'    id: "{group}-{index + 1:02d}",',
                f'    group: "{group}",',
                "    points: [",
                ts_points(points, "      "),
                "    ],",
                "  },",
            ]
        )
    sections.extend(["] as const;", "", "export const inlandWaterPolygons: readonly InlandWaterPolygon[] = ["])
    for identifier, points in waters:
        sections.extend(
            [
                "  {",
                f'    id: "{identifier}",',
                "    points: [",
                ts_points(points, "      "),
                "    ],",
                "  },",
            ]
        )
    sections.extend(["] as const;", ""])
    output.write_text("\n".join(sections), encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(
            "usage: extract-roshar-cartography.py SOURCE.png OUTPUT.ts"
        )

    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    image = Image.open(source).convert("RGB")
    image_array = np.asarray(image)
    contours = sorted(
        mask_contours(make_land_mask(image)),
        key=lambda contour: abs(signed_area(contour)),
        reverse=True,
    )

    mainland = contours[0]
    purelake = contours[1]
    aimia = contours[2]
    selected_islands: dict[int, tuple[str, Sequence[Point]]] = {}
    inland_waters: list[tuple[str, Sequence[Point]]] = []

    for index, contour in enumerate(contours):
        area = abs(signed_area(contour))
        centroid = polygon_centroid(contour)
        score = coastline_score(image_array, contour)
        xs = [point[0] for point in contour]
        ys = [point[1] for point in contour]
        within_mainland = contains_point(mainland, centroid)

        if index not in (0, 2) and within_mainland and area > 250 and score > 0.35:
            identifier = "purelake" if index == 1 else f"inland-water-{index:02d}"
            inland_waters.append((identifier, simplify_closed(contour, 2.0)))

        geographic_bounds = (
            min(ys) > 100
            and max(ys) < 1060
            and max(xs) < 1825
            and min(xs) >= 0
        )
        shoreline_candidate = (area >= 50 and score > 0.28) or (
            area >= 25 and score > 0.50
        )
        if (
            index not in (0, 2)
            and not within_mainland
            and geographic_bounds
            and shoreline_candidate
            and not is_reference_lettering(centroid)
        ):
            selected_islands[index] = (
                island_group(centroid),
                simplify_closed(contour, 1.5),
            )

    # Purelake is required even if thresholds are adjusted later.
    if not any(identifier == "purelake" for identifier, _ in inland_waters):
        inland_waters.insert(0, ("purelake", simplify_closed(purelake, 2.0)))

    islands = sorted(
        selected_islands.values(),
        key=lambda item: (item[0], polygon_centroid(item[1])),
    )
    write_typescript(
        output,
        image.size,
        simplify_closed(mainland, 3.0),
        simplify_closed(aimia, 2.25),
        islands,
        inland_waters,
    )

    print(
        f"wrote {output}: "
        f"{len(simplify_closed(mainland, 3.0))} mainland points, "
        f"{len(simplify_closed(aimia, 2.25))} Aimia points, "
        f"{len(islands)} islands, {len(inland_waters)} inland waters"
    )


if __name__ == "__main__":
    main()
