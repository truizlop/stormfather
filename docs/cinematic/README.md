# Storm Over Roshar cinematic

This directory contains the reproducible timing and shot design for the
three-minute Roshar city flyover. The rendered film and user-supplied
soundtrack are deliberately excluded from git.

## Delivered film

- Output: `artifacts/cinematic/roshar-cities-cinematic.mp4`
- Resolution: 1280 × 720
- Image cadence: 24.001824 fps, a 0.0076% adjustment from the authored
  24 fps timeline so all 4,317 frames end with the soundtrack
- Video: H.264 High Profile, yuv420p
- Audio: AAC stereo at 48 kHz, encoded from the complete supplied MP3
- Duration: 179.861 seconds; 0.000333 seconds from the source duration
- Final destination: Urithiru

The image cadence adjustment affects only the presentation time of the
rendered frames. The soundtrack is not time-stretched, pitch-shifted, looped,
or truncated.

## Sequence

The film establishes the full mechanical atlas and then visits Kholinar, the
Shattered Plains and Narak, Kharbranth, Thaylen City, Vedenar, Azimir,
Shinovar, the Purelake, Akinah, and Urithiru. Shot boundaries are aligned to
detected attacks near recurring sixteen-second musical phrases.

`soundtrack-analysis.json` records the estimated 114.85 BPM pulse, beat grid,
onsets, and broad energy sections. `shot-plan.json` maps those events to the
ordered Blender timeline.

## Rebuild

From the repository root:

```sh
python3 scripts/analyze_soundtrack.py \
  --input "/absolute/path/to/Storm Over the Kingdom.mp3" \
  --output docs/cinematic/soundtrack-analysis.json

/Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --python blender/build_cinematic.py

/Applications/Blender.app/Contents/MacOS/Blender \
  --background blender/roshar-cinematic.blend \
  --python blender/render_cinematic.py \
  -- --mode final

scripts/assemble_cinematic.sh \
  "/absolute/path/to/Storm Over the Kingdom.mp3"
```

The renderer skips valid existing PNGs, so interrupted renders can resume.
The assembly script rejects missing frame numbers and validates the MP4
duration after encoding.
