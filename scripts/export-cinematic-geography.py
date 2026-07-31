#!/usr/bin/env python3
"""Export the web atlas coastline and canonical anchors for Blender."""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT_ROOT / "src" / "world" / "cartography" / "geography.generated.ts"
OUTPUT = PROJECT_ROOT / "docs" / "cinematic" / "map-geography.json"

REFERENCE_ORIGIN = (950.0, 600.0)
WORLD_UNITS_PER_PIXEL = 0.064


def matching_bracket(source: str, start: int) -> int:
    if source[start] != "[":
        raise ValueError(f"expected '[' at offset {start}")
    depth = 0
    in_string = False
    escaped = False
    for index in range(start, len(source)):
        character = source[index]
        if in_string:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
            continue
        if character == '"':
            in_string = True
        elif character == "[":
            depth += 1
        elif character == "]":
            depth -= 1
            if depth == 0:
                return index
    raise ValueError(f"unterminated array beginning at offset {start}")


def declaration_array(source: str, name: str) -> str:
    match = re.search(rf"export const {re.escape(name)}[^=]*=", source)
    if not match:
        raise ValueError(f"missing declaration: {name}")
    start = source.find("[", match.end())
    end = matching_bracket(source, start)
    return source[start : end + 1]


def parse_literal_array(source: str, name: str) -> list[object]:
    value = declaration_array(source, name)
    value = re.sub(r"//[^\n]*", "", value)
    parsed = ast.literal_eval(value)
    if not isinstance(parsed, list):
        raise ValueError(f"{name} did not produce a list")
    return parsed


def parse_islands(source: str) -> list[dict[str, object]]:
    value = declaration_array(source, "islandPolygons")
    islands: list[dict[str, object]] = []
    cursor = 0
    pattern = re.compile(
        r'id:\s*"(?P<id>[^"]+)"\s*,\s*'
        r'group:\s*"(?P<group>[^"]+)"\s*,\s*'
        r"points:\s*",
        re.DOTALL,
    )
    while match := pattern.search(value, cursor):
        start = value.find("[", match.end())
        end = matching_bracket(value, start)
        points = ast.literal_eval(value[start : end + 1])
        islands.append(
            {
                "id": match.group("id"),
                "group": match.group("group"),
                "points": points,
            }
        )
        cursor = end + 1
    if not islands:
        raise ValueError("islandPolygons contained no readable islands")
    return islands


def reference_pixel_to_world(pixel: tuple[float, float]) -> list[float]:
    return [
        round((pixel[0] - REFERENCE_ORIGIN[0]) * WORLD_UNITS_PER_PIXEL, 6),
        round((pixel[1] - REFERENCE_ORIGIN[1]) * WORLD_UNITS_PER_PIXEL, 6),
    ]


def location_anchors() -> dict[str, dict[str, object]]:
    authored = {
        "kholinar": ("Landmark_Kholinar", (1405.0, 540.0)),
        "shattered-plains": ("Landmark_Shattered_Plains", (1575.0, 815.0)),
        "kharbranth": ("Landmark_Kharbranth", (1105.0, 885.0)),
        "thaylen-city": ("Landmark_ThaylenCity", (1090.0, 970.0)),
        "azimir": (
            "Landmark_Azimir",
            (651.9543741951085, 738.3991578246096),
        ),
        "shinovar": ("Landmark_Shinovar", (335.0, 560.0)),
        "purelake": ("Landmark_Purelake", (800.0, 540.0)),
        "akinah": ("Landmark_Akinah", (115.0, 700.0)),
        "urithiru": ("Landmark_Urithiru", (830.0, 700.0)),
    }
    locations = {
        key: {
            "root": root,
            "coordinate": reference_pixel_to_world(pixel),
        }
        for key, (root, pixel) in authored.items()
    }
    locations["vedenar"] = {
        "root": "Landmark_Vedenar",
        "coordinate": [13.257111, 9.719221],
    }
    return locations


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    result = {
        "source": str(SOURCE.relative_to(PROJECT_ROOT)),
        "map_bounds": {
            "min_x": -62,
            "max_x": 59,
            "min_y": -32,
            "max_y": 31,
        },
        "mainland_outline": parse_literal_array(source, "mainlandOutline"),
        "aimia_outline": parse_literal_array(source, "aimiaOutline"),
        "island_polygons": parse_islands(source),
        "locations": location_anchors(),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        f"exported {len(result['mainland_outline'])} mainland points, "
        f"{len(result['island_polygons'])} islands, "
        f"{len(result['locations'])} cinematic anchors"
    )


if __name__ == "__main__":
    main()
