#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 /absolute/path/to/soundtrack.mp3" >&2
  exit 64
fi

soundtrack=$1
project_root=$(cd "$(dirname "$0")/.." && pwd)
frames_directory="$project_root/artifacts/cinematic/frames"
output_directory="$project_root/artifacts/cinematic"
output="$output_directory/roshar-cities-cinematic.mp4"
expected_frames=4317

if [[ ! -f "$soundtrack" ]]; then
  echo "soundtrack not found: $soundtrack" >&2
  exit 66
fi

python3 - "$frames_directory" "$expected_frames" <<'PY'
import sys
from pathlib import Path

directory = Path(sys.argv[1])
expected = int(sys.argv[2])
missing = [
    frame
    for frame in range(1, expected + 1)
    if not (directory / f"frame_{frame:04d}.png").is_file()
]
if missing:
    sample = ", ".join(str(frame) for frame in missing[:12])
    raise SystemExit(f"missing {len(missing)} rendered frames; first gaps: {sample}")
print(f"validated {expected} contiguous PNG frames")
PY

mkdir -p "$output_directory"
duration=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$soundtrack")
output_framerate=$(python3 - "$expected_frames" "$duration" <<'PY'
import sys
from fractions import Fraction

frames = int(sys.argv[1])
duration_microseconds = round(float(sys.argv[2]) * 1_000_000)
rate = Fraction(frames * 1_000_000, duration_microseconds).limit_denominator(1_000_000)
print(f"{rate.numerator}/{rate.denominator}")
PY
)

ffmpeg \
  -hide_banner \
  -loglevel warning \
  -y \
  -framerate "$output_framerate" \
  -start_number 1 \
  -i "$frames_directory/frame_%04d.png" \
  -i "$soundtrack" \
  -map 0:v:0 \
  -map 1:a:0 \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -profile:v high \
  -pix_fmt yuv420p \
  -c:a aac \
  -b:a 320k \
  -movflags +faststart \
  -metadata title="Storm Over Roshar" \
  -metadata comment="Unofficial fan-made Roshar cinematic" \
  -t "$duration" \
  "$output"

python3 - "$output" "$duration" <<'PY'
import json
import subprocess
import sys

output = sys.argv[1]
expected = float(sys.argv[2])
probe = subprocess.run(
    [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_name,width,height,r_frame_rate",
        "-of",
        "json",
        output,
    ],
    check=True,
    capture_output=True,
    text=True,
)
metadata = json.loads(probe.stdout)
actual = float(metadata["format"]["duration"])
delta = abs(actual - expected)
if delta > 0.025:
    raise SystemExit(
        f"duration mismatch: expected {expected:.6f}s, got {actual:.6f}s"
    )
print(json.dumps(metadata, indent=2))
print(f"duration delta: {delta:.6f}s")
PY

echo "$output"
