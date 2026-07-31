#!/usr/bin/env python3
"""Render restartable frames for the map-based Roshar cinematic."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PLAN = json.loads(
    (PROJECT_ROOT / "docs" / "cinematic" / "map-shot-plan.json").read_text(
        encoding="utf-8"
    )
)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("proof", "final"), default="final")
    offset = sys.argv.index("--") + 1 if "--" in sys.argv else len(sys.argv)
    return parser.parse_args(sys.argv[offset:])


def valid_png(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size < 1000:
        return False
    with path.open("rb") as handle:
        return handle.read(8) == b"\x89PNG\r\n\x1a\n"


def ranges(frames: list[int]) -> list[tuple[int, int]]:
    if not frames:
        return []
    result = []
    start = previous = frames[0]
    for frame in frames[1:]:
        if frame != previous + 1:
            result.append((start, previous))
            start = frame
        previous = frame
    result.append((start, previous))
    return result


def render_final() -> None:
    directory = PROJECT_ROOT / "artifacts" / "cinematic" / "map-v2-frames"
    directory.mkdir(parents=True, exist_ok=True)
    missing = [
        frame
        for frame in range(1, int(PLAN["render_end_frame"]) + 1)
        if not valid_png(directory / f"frame_{frame:04d}.png")
    ]
    if not missing:
        print("All map cinematic frames already exist.")
        return
    scene = bpy.context.scene
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(directory / "frame_")
    for start, end in ranges(missing):
        scene.frame_start = start
        scene.frame_end = end
        print(f"Rendering map cinematic frames {start}-{end}")
        bpy.ops.render.render(animation=True)


def render_proof() -> None:
    directory = PROJECT_ROOT / "artifacts" / "cinematic" / "map-v2-proof"
    directory.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.resolution_percentage = 50
    frames = {1, int(PLAN["render_end_frame"])}
    for shot in PLAN["shots"]:
        start = int(shot["start_frame"])
        end = int(shot["end_frame"])
        frames.update(
            {
                start,
                start + (end - start) // 4,
                start + (end - start) // 2,
                start + (end - start) * 3 // 4,
                end,
            }
        )
    for frame in sorted(frames):
        output = directory / f"proof_{frame:04d}.png"
        if valid_png(output):
            continue
        scene.frame_set(frame)
        scene.render.filepath = str(output)
        print(f"Rendering map proof frame {frame}")
        bpy.ops.render.render(write_still=True)


def main() -> None:
    if parse_arguments().mode == "proof":
        render_proof()
    else:
        render_final()


if __name__ == "__main__":
    main()
