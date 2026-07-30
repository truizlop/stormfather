#!/usr/bin/env python3
"""Render restartable final frames or a sparse cinematic proof."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PLAN_PATH = PROJECT_ROOT / "docs" / "cinematic" / "shot-plan.json"


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("proof", "final"), default="final")
    separator = sys.argv.index("--") + 1 if "--" in sys.argv else len(sys.argv)
    return parser.parse_args(sys.argv[separator:])


def is_valid_png(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size < 1000:
        return False
    with path.open("rb") as handle:
        return handle.read(8) == b"\x89PNG\r\n\x1a\n"


def contiguous_ranges(frames: list[int]) -> list[tuple[int, int]]:
    if not frames:
        return []
    ranges: list[tuple[int, int]] = []
    start = previous = frames[0]
    for frame in frames[1:]:
        if frame != previous + 1:
            ranges.append((start, previous))
            start = frame
        previous = frame
    ranges.append((start, previous))
    return ranges


def render_final(plan: dict[str, object]) -> None:
    scene = bpy.context.scene
    directory = PROJECT_ROOT / "artifacts" / "cinematic" / "frames"
    directory.mkdir(parents=True, exist_ok=True)
    missing = [
        frame
        for frame in range(1, int(plan["render_end_frame"]) + 1)
        if not is_valid_png(directory / f"frame_{frame:04d}.png")
    ]
    if not missing:
        print("All final frames already exist.")
        return
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(directory / "frame_")
    for start, end in contiguous_ranges(missing):
        scene.frame_start = start
        scene.frame_end = end
        print(f"Rendering final frames {start}-{end}")
        bpy.ops.render.render(animation=True)


def render_proof(plan: dict[str, object]) -> None:
    scene = bpy.context.scene
    directory = PROJECT_ROOT / "artifacts" / "cinematic" / "proof"
    directory.mkdir(parents=True, exist_ok=True)
    scene.render.resolution_percentage = 50
    proof_frames = [1]
    for shot in plan["shots"]:
        start = int(shot["start_frame"])
        end = int(shot["end_frame"])
        proof_frames.extend(
            [
                start,
                start + (end - start) // 3,
                start + (end - start) * 2 // 3,
                end,
            ]
        )
    for frame in sorted(set(proof_frames)):
        output = directory / f"proof_{frame:04d}.png"
        if is_valid_png(output):
            continue
        scene.frame_set(frame)
        scene.render.filepath = str(output)
        print(f"Rendering proof frame {frame}")
        bpy.ops.render.render(write_still=True)


def main() -> None:
    plan = json.loads(PLAN_PATH.read_text(encoding="utf-8"))
    options = arguments()
    if options.mode == "proof":
        render_proof(plan)
    else:
        render_final(plan)


if __name__ == "__main__":
    main()
