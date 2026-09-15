# A World That Lives

A 96-second cinematic captured from the current React/Three.js world on
7 September 2026. The locations, residents, creature rigs, activities, Surge
illustrations and weather are rendered by the application itself.

Output: `artifacts/cinematic/living-world/stormfather-a-world-that-lives.mp4`

- 1920 × 1080 delivery, with a 1920 × 804 cinematic picture area.
- 24 fps; H.264 video and 48 kHz stereo AAC; web-ready fast start.
- Sixteen moving shots, followed by a four-second closing title.
- City reveals, market and trench streets, fishing waterfront, chulls,
  Shinovar, listener settlement, bridge lowering and crossing, greatshell
  hunt, highstorm, Lightweaver practice, Windrunner flight and Urithiru.
- Restrained exposure and color finishing, vignette, location captions,
  chapter fades, closing typography, synthesized wind and low impacts.
- Music: the final 96 seconds of the existing v3 cinematic's soundtrack,
  documented in `soundtrack-analysis.json` as the previously supplied
  **Storm Over the Kingdom.mp3**. This edit fades and mixes that excerpt;
  it does not claim to use the complete track.

This is footage of the existing stylized fan reconstruction, rather than
new photorealistic film assets. No generated images replace the live world.
The soundtrack and rendered media remain excluded from git.

## Rebuild

Requires Chrome, FFmpeg, Python with Pillow and NumPy, and Playwright.
Start the local application with `npm run dev -- --host 127.0.0.1`.

```sh
node scripts/capture-living-world.mjs proof
node scripts/capture-living-world.mjs render
python3 scripts/assemble-living-world.py
```

The capture script accepts an optional shot ID substring after the mode,
for example `render 07-chull`, for repairing a single shot. The shot list
and camera parameters live in `living-world-shots.json`. Proofs include
start, midpoint and end framing; final capture writes a midpoint still
for each shot. Captured shots are individually encoded before assembly.

The opt-in `?capture` query exposes the renderer to the capture script,
disables interactive camera ownership and automatic city switching, and
keeps the chosen city's living layers active. The script stops the normal
render loop and advances both rendering and simulation by 1/24 second per
frame. OrbitControls retain the lighting target but do not move the
camera. Ordinary exploration without the query keeps its existing behavior.

The current renderer expects the bundled desktop Playwright installation
and macOS Chrome/fonts. Paths can be overridden as documented in the
capture script. The assembler expects the earlier v3 MP4 locally for its
soundtrack; it deliberately fails if that source or any captured shot is
missing.
